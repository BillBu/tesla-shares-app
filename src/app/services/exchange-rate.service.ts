import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import {
  ExchangeRateData,
  ExchangeRateResponse,
} from '../models/exchange-rate.model';

@Injectable({
  providedIn: 'root',
})
export class ExchangeRateService {
  // Using Frankfurter API which is completely free with no API key needed
  private baseUrl = 'https://api.frankfurter.app';
  private fromCurrency = 'USD';
  private toCurrency = 'GBP';
  
  // Storage keys
  private readonly STORAGE_KEY_HISTORICAL = 'tesla-app-historical-rates';
  private readonly STORAGE_KEY_INTRADAY = 'tesla-app-intraday-rates'; 
  private readonly STORAGE_KEY_LAST_HISTORICAL_UPDATE = 'tesla-app-last-rates-update';
  private readonly STORAGE_KEY_CURRENT_RATE = 'tesla-app-current-rate';

  private currentExchangeRate = new BehaviorSubject<number>(0);
  currentExchangeRate$ = this.currentExchangeRate.asObservable();

  private historicalRates = new BehaviorSubject<ExchangeRateData[]>([]);
  historicalRates$ = this.historicalRates.asObservable();

  private intradayRates = new BehaviorSubject<ExchangeRateData[]>([]);
  intradayRates$ = this.intradayRates.asObservable();

  constructor(private http: HttpClient) {
    // Load cached data first
    this.loadCachedData();
    
    // Initial data load
    this.getCurrentRate();
    this.getHistoricalRates();

    // Update exchange rate every 5 minutes
    interval(5 * 60 * 1000).subscribe(() => {
      this.getCurrentRate();
    });
    
    // Update historical rates once per day
    interval(24 * 60 * 60 * 1000).subscribe(() => {
      this.getHistoricalRates(true);
    });
  }
  
  /**
   * Load cached data from localStorage
   */
  private loadCachedData() {
    try {
      // Load cached current rate
      const cachedRate = localStorage.getItem(this.STORAGE_KEY_CURRENT_RATE);
      if (cachedRate) {
        this.currentExchangeRate.next(parseFloat(cachedRate));
      }
      
      // Load cached historical rates
      const cachedHistorical = localStorage.getItem(this.STORAGE_KEY_HISTORICAL);
      if (cachedHistorical) {
        const parsedData = JSON.parse(cachedHistorical);
        const rateData: ExchangeRateData[] = parsedData.map((item: any) => ({
          date: new Date(item.date),
          rate: item.rate
        }));
        this.historicalRates.next(rateData);
      }
      
      // Load cached intraday rates
      const cachedIntraday = localStorage.getItem(this.STORAGE_KEY_INTRADAY);
      if (cachedIntraday) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const parsedData = JSON.parse(cachedIntraday);
        // Only use today's cached intraday data
        const rateData: ExchangeRateData[] = parsedData
          .map((item: any) => ({
            date: new Date(item.date),
            rate: item.rate
          }))
          .filter((item: ExchangeRateData) => item.date >= todayStart);
          
        if (rateData.length > 0) {
          this.intradayRates.next(rateData);
        }
      }
    } catch (error) {
      console.error('Error loading cached exchange rate data:', error);
    }
  }
  
  /**
   * Save current rate to localStorage
   */
  private saveCurrentRate(rate: number) {
    try {
      localStorage.setItem(this.STORAGE_KEY_CURRENT_RATE, rate.toString());
    } catch (error) {
      console.error('Error saving current exchange rate to storage:', error);
    }
  }
  
  /**
   * Save historical rates to localStorage
   */
  private saveHistoricalRates(data: ExchangeRateData[]) {
    try {
      localStorage.setItem(this.STORAGE_KEY_HISTORICAL, JSON.stringify(data));
      localStorage.setItem(this.STORAGE_KEY_LAST_HISTORICAL_UPDATE, new Date().toISOString());
    } catch (error) {
      console.error('Error saving historical rates to storage:', error);
    }
  }
  
  /**
   * Save intraday rates to localStorage
   */
  private saveIntradayRates(data: ExchangeRateData[]) {
    try {
      localStorage.setItem(this.STORAGE_KEY_INTRADAY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving intraday rates to storage:', error);
    }
  }

  getCurrentRate() {
    // Use Frankfurter API which is free without API key limits
    this.http
      .get<any>(
        `${this.baseUrl}/latest?from=${this.fromCurrency}&to=${this.toCurrency}`
      )
      .pipe(
        map((response) => {
          if (response && response.rates) {
            const rate = response.rates[this.toCurrency];
            console.log('Live exchange rate fetched:', rate);
            return rate;
          } else {
            // If API request failed, fallback to a sensible default
            console.error('API request failed, using fallback value');
            return 0.78;
          }
        }),
        catchError((error) => {
          console.error('Error fetching exchange rate data:', error);
          // Fallback to a sensible default value on error
          return of(0.78);
        })
      )
      .subscribe((rate) => {
        this.currentExchangeRate.next(rate);
        this.saveCurrentRate(rate);

        // Add to intraday data
        const intradayData = this.intradayRates.getValue();
        const newDataPoint = {
          date: new Date(),
          rate: rate,
        };
        intradayData.push(newDataPoint);
        this.intradayRates.next(intradayData);
        this.saveIntradayRates(intradayData);
      });
  }

  getHistoricalRates(forceUpdate: boolean = false) {
    // Check if we have data and if it was updated recently (within last week)
    const lastUpdate = localStorage.getItem(this.STORAGE_KEY_LAST_HISTORICAL_UPDATE);
    const existingData = this.historicalRates.getValue();
    
    if (!forceUpdate && lastUpdate && existingData.length > 0) {
      const lastUpdateDate = new Date(lastUpdate);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      // If we updated less than a week ago, don't query API again
      if (lastUpdateDate > oneWeekAgo) {
        console.log('Using cached historical exchange rates, last updated:', lastUpdateDate);
        return;
      }
    }
    
    // Calculate dates for API request
    const end = new Date();
    let start: Date;
    
    if (existingData.length > 0 && !forceUpdate) {
      // If we have existing data, only get new data since the last point
      const sortedData = [...existingData].sort((a, b) => b.date.getTime() - a.date.getTime());
      const lastDate = sortedData[0].date;
      
      // Set start to the day after our last data point
      start = new Date(lastDate);
      start.setDate(start.getDate() + 1);
    } else {
      // Otherwise get full 2 years of data
      start = new Date();
      start.setFullYear(start.getFullYear() - 2);
    }
    
    // Format dates for API
    const endStr = end.toISOString().split('T')[0];
    const startStr = start.toISOString().split('T')[0];

    // Don't make API call if start date is in the future or today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start >= today) {
      console.log('No new historical exchange rate data needed');
      return;
    }

    // Use Frankfurter's time-series endpoint which is free
    this.http
      .get<any>(
        `${this.baseUrl}/${startStr}..${endStr}?from=${this.fromCurrency}&to=${this.toCurrency}`
      )
      .pipe(
        map((response) => {
          if (response && response.rates) {
            console.log('Historical exchange rates fetched successfully');
            const newRateData: ExchangeRateData[] = [];

            // Process Frankfurter API response which has a different structure
            for (const dateStr in response.rates) {
              newRateData.push({
                date: new Date(dateStr),
                rate: response.rates[dateStr][this.toCurrency],
              });
            }
            
            // Combine with existing data if not forcing update
            let combinedData: ExchangeRateData[];
            
            if (existingData.length > 0 && !forceUpdate) {
              // Create a map of dates to make it easy to find duplicates
              const dateMap = new Map<string, number>();
              existingData.forEach((item, index) => {
                const dateStr = item.date.toISOString().split('T')[0];
                dateMap.set(dateStr, index);
              });
              
              // Create a new combined array, replacing any existing entries with new data
              combinedData = [...existingData];
              
              newRateData.forEach(newItem => {
                const dateStr = newItem.date.toISOString().split('T')[0];
                const existingIndex = dateMap.get(dateStr);
                
                if (existingIndex !== undefined) {
                  // Replace existing data point
                  combinedData[existingIndex] = newItem;
                } else {
                  // Add new data point
                  combinedData.push(newItem);
                }
              });
            } else {
              combinedData = newRateData;
            }
            
            // Sort by date
            return combinedData.sort((a, b) => a.date.getTime() - b.date.getTime());
          } else {
            console.error('API request failed, using generated data');
            
            // If we have existing data, use that instead of mock data
            if (existingData.length > 0) {
              return existingData;
            }
            
            // Fallback to generating data
            return this.generateMockHistoricalData();
          }
        }),
        catchError((error) => {
          console.error('Error fetching historical exchange rate data:', error);
          
          // If we have existing data, use that instead of mock data
          if (existingData.length > 0) {
            return of(existingData);
          }
          
          // Fallback to generating data
          return of(this.generateMockHistoricalData());
        })
      )
      .subscribe((data) => {
        this.historicalRates.next(data);
        this.saveHistoricalRates(data);
      });
  }

  // Helper method to generate mock data if the API call fails or doesn't have timeseries access
  private generateMockHistoricalData(): ExchangeRateData[] {
    console.log('Generating mock historical data');
    const historicalData: ExchangeRateData[] = [];
    const today = new Date();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    // Generate a rate for each day in the last 2 years
    for (
      let d = new Date(twoYearsAgo);
      d <= today;
      d.setDate(d.getDate() + 1)
    ) {
      // Generate a somewhat realistic exchange rate (0.75-0.82 range)
      const randomVariation = Math.sin(d.getTime() / 10000000000) * 0.035;
      const rate = 0.785 + randomVariation;

      historicalData.push({
        date: new Date(d),
        rate: rate,
      });
    }

    return historicalData;
  }
}
