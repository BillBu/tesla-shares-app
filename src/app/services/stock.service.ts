import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { StockData } from '../models/stock-data.model';

@Injectable({
  providedIn: 'root',
})
export class StockService {
  // Using Finnhub API - free tier with generous limits
  // You need to sign up at https://finnhub.io/ and get your own API key
  // For browser-based requests, the API key must be sent as a query parameter named 'token'
  // For server-to-server requests, you would use the 'X-Finnhub-Secret' header instead
  private apiKey = 'd0idlppr01qrfsafggl0d0idlppr01qrfsafgglg'; // Replace with your actual Finnhub API key
  private baseUrl = 'https://finnhub.io/api/v1';
  private symbol = 'TSLA';

  // Storage keys
  private readonly STORAGE_KEY_HISTORICAL = 'tesla-app-historical-data';
  private readonly STORAGE_KEY_INTRADAY = 'tesla-app-intraday-data';
  private readonly STORAGE_KEY_LAST_HISTORICAL_UPDATE =
    'tesla-app-last-historical-update';
  private readonly STORAGE_KEY_LAST_INTRADAY_UPDATE =
    'tesla-app-last-intraday-update';
  private readonly STORAGE_KEY_CURRENT_PRICE = 'tesla-app-current-price';

  private currentStockPrice = new BehaviorSubject<number>(0);
  currentStockPrice$ = this.currentStockPrice.asObservable();

  private historicalData = new BehaviorSubject<StockData[]>([]);
  historicalData$ = this.historicalData.asObservable();

  private intradayData = new BehaviorSubject<StockData[]>([]);
  intradayData$ = this.intradayData.asObservable();

  constructor(private http: HttpClient) {
    // Load cached data first
    this.loadCachedData();

    // Initial data load
    this.getQuote();
    this.getStockData();
    this.getIntradayData();

    // Update data every 5 minutes
    interval(5 * 60 * 1000).subscribe(() => {
      this.getQuote();
      this.getIntradayData();
    });

    // Update historical data once per day
    interval(24 * 60 * 60 * 1000).subscribe(() => {
      this.getStockData(true);
    });
  }

  /**
   * Load any cached data from localStorage on startup
   */
  private loadCachedData() {
    try {
      // Load cached current price
      const cachedPrice = localStorage.getItem(this.STORAGE_KEY_CURRENT_PRICE);
      if (cachedPrice) {
        this.currentStockPrice.next(parseFloat(cachedPrice));
      }

      // Load cached historical data
      const cachedHistorical = localStorage.getItem(
        this.STORAGE_KEY_HISTORICAL
      );
      if (cachedHistorical) {
        const parsedData = JSON.parse(cachedHistorical);
        const stockData: StockData[] = parsedData.map((item: any) => ({
          date: new Date(item.date),
          price: item.price,
        }));
        this.historicalData.next(stockData);
      }

      // Load cached intraday data
      const cachedIntraday = localStorage.getItem(this.STORAGE_KEY_INTRADAY);
      if (cachedIntraday) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const parsedData = JSON.parse(cachedIntraday);
        // Only use today's cached intraday data
        const stockData: StockData[] = parsedData
          .map((item: any) => ({
            date: new Date(item.date),
            price: item.price,
          }))
          .filter((item: StockData) => item.date >= todayStart);

        if (stockData.length > 0) {
          this.intradayData.next(stockData);
        }
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  }

  /**
   * Save historical data to local storage
   */
  private saveHistoricalData(data: StockData[]) {
    try {
      localStorage.setItem(this.STORAGE_KEY_HISTORICAL, JSON.stringify(data));
      localStorage.setItem(
        this.STORAGE_KEY_LAST_HISTORICAL_UPDATE,
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Error saving historical data to storage:', error);
    }
  }

  /**
   * Save intraday data to local storage
   */
  private saveIntradayData(data: StockData[]) {
    try {
      localStorage.setItem(this.STORAGE_KEY_INTRADAY, JSON.stringify(data));
      localStorage.setItem(
        this.STORAGE_KEY_LAST_INTRADAY_UPDATE,
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Error saving intraday data to storage:', error);
    }
  }

  /**
   * Save current price to local storage
   */
  private saveCurrentPrice(price: number) {
    try {
      localStorage.setItem(this.STORAGE_KEY_CURRENT_PRICE, price.toString());
    } catch (error) {
      console.error('Error saving current price to storage:', error);
    }
  }

  /**
   * Get the current quote for the stock
   */
  getQuote() {
    const params = {
      symbol: this.symbol,
      token: this.apiKey, // API key as query parameter for browser-based requests
    };

    this.http
      .get<any>(`${this.baseUrl}/quote`, { params })
      .pipe(
        map((response) => {
          // Finnhub returns the current price in the 'c' field
          console.log('Current price:', response?.c);
          return response?.c || 0;
        }),
        catchError((error) => {
          console.error('Error fetching current quote:', error);

          // Use most recent cached price if available
          const cachedPrice = localStorage.getItem(
            this.STORAGE_KEY_CURRENT_PRICE
          );
          if (cachedPrice) {
            return of(parseFloat(cachedPrice));
          }

          // If no cached price is available, use a default but log as error
          console.error('No cached price available, using default');
          return of(0); // Return 0 to indicate no data, better than fake data
        })
      )
      .subscribe((price) => {
        this.currentStockPrice.next(price);
        this.saveCurrentPrice(price);
      });
  }

  /**
   * Get historical stock data (for the past 2 years)
   * @param forceUpdate Force an update even if we have recent data
   * @returns Returns cached data if available, or empty array if the API fails and no cached data exists
   */
  getStockData(forceUpdate: boolean = false) {
    // Check if we have data and if it was updated recently (within last 24 hours)
    const lastUpdate = localStorage.getItem(
      this.STORAGE_KEY_LAST_HISTORICAL_UPDATE
    );
    const existingData = this.historicalData.getValue();

    if (!forceUpdate && lastUpdate && existingData.length > 0) {
      const lastUpdateDate = new Date(lastUpdate);
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      // If we updated less than 24 hours ago, don't query API again
      if (lastUpdateDate > oneDayAgo) {
        console.log(
          'Using cached historical data, last updated:',
          lastUpdateDate
        );
        return;
      }
    }

    // Calculate which data we need to fetch
    let fromDate: Date;
    let fromTimestamp: number;

    if (existingData.length > 0 && !forceUpdate) {
      // If we have existing data, only get new data since the last point
      const sortedData = [...existingData].sort(
        (a, b) => b.date.getTime() - a.date.getTime()
      );
      const lastDate = sortedData[0].date;

      // Set fromDate to the day after our last data point
      fromDate = new Date(lastDate);
      fromDate.setDate(fromDate.getDate() + 1);
      fromTimestamp = Math.floor(fromDate.getTime() / 1000);
    } else {
      // Otherwise get full 2 years of data
      fromDate = new Date();
      fromDate.setFullYear(fromDate.getFullYear() - 2);
      fromTimestamp = Math.floor(fromDate.getTime() / 1000);
    }

    const now = new Date();
    const toTimestamp = Math.floor(now.getTime() / 1000);

    // Don't make API call if we're trying to fetch future data
    if (fromTimestamp >= toTimestamp) {
      console.log('No new historical data needed');
      return;
    }

    const params = {
      symbol: this.symbol,
      resolution: 'D', // Daily resolution
      from: fromTimestamp.toString(),
      to: toTimestamp.toString(),
      token: this.apiKey, // API key as query parameter for browser-based requests
    };

    this.http
      .get<any>(`${this.baseUrl}/stock/candle`, { params })
      .pipe(
        map((response) => {
          const newStockData: StockData[] = [];

          // Finnhub returns separate arrays for timestamps (t), close prices (c), etc.
          if (response?.s === 'ok' && response.t && response.c) {
            for (let i = 0; i < response.t.length; i++) {
              newStockData.push({
                date: new Date(response.t[i] * 1000), // Convert UNIX timestamp to Date
                price: response.c[i], // Close price
              });
            }
          }

          // Combine with existing data if not forcing update
          let combinedData: StockData[];

          if (existingData.length > 0 && !forceUpdate) {
            // Create a map of dates to make it easy to find duplicates
            const dateMap = new Map<string, number>();
            existingData.forEach((item, index) => {
              const dateStr = item.date.toDateString();
              dateMap.set(dateStr, index);
            });

            // Create a new combined array, replacing any existing entries with new data
            combinedData = [...existingData];

            newStockData.forEach((newItem) => {
              const dateStr = newItem.date.toDateString();
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
            combinedData = newStockData;
          }

          // Sort by date ascending
          combinedData.sort((a, b) => a.date.getTime() - b.date.getTime());
          return combinedData;
        }),
        catchError((error) => {
          console.error('Error fetching historical stock data:', error);

          // If we have existing data, use that instead
          if (existingData.length > 0) {
            return of(existingData);
          }

          // Return empty array if no data can be loaded
          return of([]);
        })
      )
      .subscribe((data) => {
        this.historicalData.next(data);
        this.saveHistoricalData(data);
      });
  }

  /**
   * Get intraday stock data for today
   * @returns Returns cached data if available, or empty array if the API fails and no cached data exists
   */
  getIntradayData() {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if we need new intraday data
    const existingData = this.intradayData.getValue();
    const lastUpdate = localStorage.getItem(
      this.STORAGE_KEY_LAST_INTRADAY_UPDATE
    );

    if (lastUpdate && existingData.length > 0) {
      const lastUpdateTime = new Date(lastUpdate);
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      // If we updated less than 5 minutes ago, don't query API again
      if (lastUpdateTime > fiveMinutesAgo) {
        console.log(
          'Using cached intraday data, last updated:',
          lastUpdateTime
        );
        return;
      }

      // If we have recent data, only request data since the last point
      if (existingData.length > 0) {
        const sortedData = [...existingData].sort(
          (a, b) => b.date.getTime() - a.date.getTime()
        );
        const lastDate = sortedData[0].date;

        // If our most recent data point is from less than 5 minutes ago, don't query yet
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
        if (lastDate > fiveMinutesAgo) {
          console.log('Already have recent intraday data, skipping update');
          return;
        }

        // Only get data since our last data point (plus a small overlap)
        today.setTime(lastDate.getTime() - 15 * 60 * 1000); // 15 minutes before last point for overlap
      }
    }

    const toTimestamp = Math.floor(now.getTime() / 1000);
    const fromTimestamp = Math.floor(today.getTime() / 1000);

    const params = {
      symbol: this.symbol,
      resolution: '5', // 5-minute intervals
      from: fromTimestamp.toString(),
      to: toTimestamp.toString(),
      token: this.apiKey, // API key as query parameter for browser-based requests
    };

    this.http
      .get<any>(`${this.baseUrl}/stock/candle`, { params })
      .pipe(
        map((response) => {
          const newStockData: StockData[] = [];

          // Process the candle data from Finnhub
          if (response?.s === 'ok' && response.t && response.c) {
            for (let i = 0; i < response.t.length; i++) {
              newStockData.push({
                date: new Date(response.t[i] * 1000), // Convert UNIX timestamp to Date
                price: response.c[i], // Close price
              });
            }
          }

          // Combine with existing data from today
          let combinedData: StockData[];

          if (existingData.length > 0) {
            // Filter existing data to only include today
            const todayData = existingData.filter((item) => item.date >= today);

            // Create a map of timestamps to make it easy to find duplicates
            const timeMap = new Map<number, number>();
            todayData.forEach((item, index) => {
              timeMap.set(Math.floor(item.date.getTime() / 1000), index);
            });

            // Create a new combined array, replacing any existing entries with new data
            combinedData = [...todayData];

            newStockData.forEach((newItem) => {
              const timestamp = Math.floor(newItem.date.getTime() / 1000);
              const existingIndex = timeMap.get(timestamp);

              if (existingIndex !== undefined) {
                // Replace existing data point
                combinedData[existingIndex] = newItem;
              } else {
                // Add new data point
                combinedData.push(newItem);
              }
            });
          } else {
            combinedData = newStockData;
          }

          // Sort by date ascending
          combinedData.sort((a, b) => a.date.getTime() - b.date.getTime());
          return combinedData;
        }),
        catchError((error) => {
          console.error('Error fetching intraday stock data:', error);

          // If we have existing data, use that instead
          if (existingData.length > 0) {
            return of(existingData);
          }

          // Return empty array if no data can be loaded
          return of([]);
        })
      )
      .subscribe((data) => {
        this.intradayData.next(data);
        this.saveIntradayData(data);
      });
  }

  // Method removed - we don't generate mock data anymore

  // Method removed - we don't generate mock data anymore
}
