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
  private apiKey = '0e6db16498af3aa3df932488fdc85748'; // You'll need to sign up for an API key at https://exchangeratesapi.io/
  private baseUrl = 'https://api.exchangeratesapi.io/v1';
  private fromCurrency = 'USD';
  private toCurrency = 'GBP';

  private currentExchangeRate = new BehaviorSubject<number>(0);
  currentExchangeRate$ = this.currentExchangeRate.asObservable();

  private historicalRates = new BehaviorSubject<ExchangeRateData[]>([]);
  historicalRates$ = this.historicalRates.asObservable();

  private intradayRates = new BehaviorSubject<ExchangeRateData[]>([]);
  intradayRates$ = this.intradayRates.asObservable();

  constructor(private http: HttpClient) {
    // Initial data load
    this.getCurrentRate();
    this.getHistoricalRates();

    // Update exchange rate every 5 minutes
    interval(5 * 60 * 1000).subscribe(() => {
      this.getCurrentRate();
    });
  }

  getCurrentRate() {
    // Use the real API since we now have an API key
    this.http
      .get<ExchangeRateResponse>(
        `${this.baseUrl}/latest?access_key=${this.apiKey}&symbols=${this.toCurrency}`
      )
      .pipe(
        map((response) => {
          // Check if the API request was successful
          if (response.success) {
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

        // Add to intraday data
        const intradayData = this.intradayRates.getValue();
        intradayData.push({
          date: new Date(),
          rate: rate,
        });
        this.intradayRates.next(intradayData);
      });
  }

  getHistoricalRates() {
    // Get start and end dates
    const end = new Date().toISOString().split('T')[0];
    const start = new Date();
    start.setFullYear(start.getFullYear() - 2);
    const startStr = start.toISOString().split('T')[0];

    // Note: The timeseries endpoint is typically only available with a paid subscription
    // Check if we can access the timeseries endpoint
    this.http
      .get<any>(
        `${this.baseUrl}/timeseries?access_key=${this.apiKey}&start_date=${startStr}&end_date=${end}&symbols=${this.toCurrency}`
      )
      .pipe(
        map((response) => {
          if (response.success) {
            console.log('Historical exchange rates fetched successfully');
            const rateData: ExchangeRateData[] = [];

            for (const dateStr in response.rates) {
              rateData.push({
                date: new Date(dateStr),
                rate: response.rates[dateStr][this.toCurrency],
              });
            }

            return rateData.sort((a, b) => a.date.getTime() - b.date.getTime());
          } else {
            console.error('API request failed, using generated data');
            // Fallback to generating data
            return this.generateMockHistoricalData();
          }
        }),
        catchError((error) => {
          console.error('Error fetching historical exchange rate data:', error);
          // Fallback to generating data
          return of(this.generateMockHistoricalData());
        })
      )
      .subscribe((data) => {
        this.historicalRates.next(data);
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
