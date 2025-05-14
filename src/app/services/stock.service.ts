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
  private apiKey = 'd0ibs69r01qrfsaf63dgd0ibs69r01qrfsaf63e0'; // Replace with a real Finnhub API key after signing up
  private baseUrl = 'https://finnhub.io/api/v1';
  private symbol = 'TSLA';

  private currentStockPrice = new BehaviorSubject<number>(0);
  currentStockPrice$ = this.currentStockPrice.asObservable();

  private historicalData = new BehaviorSubject<StockData[]>([]);
  historicalData$ = this.historicalData.asObservable();

  private intradayData = new BehaviorSubject<StockData[]>([]);
  intradayData$ = this.intradayData.asObservable();

  constructor(private http: HttpClient) {
    // Initial data load
    this.getQuote();
    this.getStockData();
    this.getIntradayData();

    // Update data every 5 minutes
    interval(5 * 60 * 1000).subscribe(() => {
      this.getQuote();
      this.getIntradayData();
    });
  }

  /**
   * Get the current quote for the stock
   */
  getQuote() {
    const params = {
      symbol: this.symbol,
      token: this.apiKey,
    };

    this.http
      .get<any>(`${this.baseUrl}/quote`, { params })
      .pipe(
        map((response) => {
          // Finnhub returns the current price in the 'c' field
          return response?.c || 0;
        }),
        catchError((error) => {
          console.error('Error fetching current quote:', error);
          // On error, we'll use a mock/fallback price so the app doesn't break
          return of(750.25); // Fallback price for TSLA
        })
      )
      .subscribe((price) => {
        this.currentStockPrice.next(price);
      });
  }

  /**
   * Get historical stock data (for the past 2 years)
   */
  getStockData() {
    // Calculate timestamps for the API request (from 2 years ago to now)
    const now = new Date();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(now.getFullYear() - 2);

    const toTimestamp = Math.floor(now.getTime() / 1000);
    const fromTimestamp = Math.floor(twoYearsAgo.getTime() / 1000);

    const params = {
      symbol: this.symbol,
      resolution: 'D', // Daily resolution
      from: fromTimestamp.toString(),
      to: toTimestamp.toString(),
      token: this.apiKey,
    };

    this.http
      .get<any>(`${this.baseUrl}/stock/candle`, { params })
      .pipe(
        map((response) => {
          const stockData: StockData[] = [];

          // Finnhub returns separate arrays for timestamps (t), close prices (c), etc.
          if (response?.s === 'ok' && response.t && response.c) {
            for (let i = 0; i < response.t.length; i++) {
              stockData.push({
                date: new Date(response.t[i] * 1000), // Convert UNIX timestamp to Date
                price: response.c[i], // Close price
              });
            }
          }

          // Sort by date ascending
          stockData.sort((a, b) => a.date.getTime() - b.date.getTime());
          return stockData;
        }),
        catchError((error) => {
          console.error('Error fetching historical stock data:', error);
          return of(this.generateMockHistoricalData());
        })
      )
      .subscribe((data) => {
        this.historicalData.next(data);
      });
  }

  /**
   * Get intraday stock data for today
   */
  getIntradayData() {
    // Calculate timestamps for today
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toTimestamp = Math.floor(now.getTime() / 1000);
    const fromTimestamp = Math.floor(today.getTime() / 1000);

    const params = {
      symbol: this.symbol,
      resolution: '5', // 5-minute intervals
      from: fromTimestamp.toString(),
      to: toTimestamp.toString(),
      token: this.apiKey,
    };

    this.http
      .get<any>(`${this.baseUrl}/stock/candle`, { params })
      .pipe(
        map((response) => {
          const stockData: StockData[] = [];

          // Process the candle data from Finnhub
          if (response?.s === 'ok' && response.t && response.c) {
            for (let i = 0; i < response.t.length; i++) {
              stockData.push({
                date: new Date(response.t[i] * 1000), // Convert UNIX timestamp to Date
                price: response.c[i], // Close price
              });
            }
          }

          // Sort by date ascending
          stockData.sort((a, b) => a.date.getTime() - b.date.getTime());
          return stockData;
        }),
        catchError((error) => {
          console.error('Error fetching intraday stock data:', error);
          return of(this.generateMockIntradayData());
        })
      )
      .subscribe((data) => {
        this.intradayData.next(data);
      });
  }

  /**
   * Generate mock historical data in case the API fails
   */
  private generateMockHistoricalData(): StockData[] {
    const mockData: StockData[] = [];
    const now = new Date();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(now.getFullYear() - 2);

    // Start with a base price
    let currentPrice = 700;

    // Create a data point for every 3 days over the past 2 years
    for (let d = twoYearsAgo; d <= now; d.setDate(d.getDate() + 3)) {
      // Some random price movement (between -5% and +5%)
      const change = currentPrice * (Math.random() * 0.1 - 0.05);
      currentPrice += change;

      mockData.push({
        date: new Date(d),
        price: Math.max(100, currentPrice), // Ensure price doesn't go too low
      });
    }

    return mockData;
  }

  /**
   * Generate mock intraday data in case the API fails
   */
  private generateMockIntradayData(): StockData[] {
    const mockData: StockData[] = [];
    const now = new Date();
    const today = new Date();
    today.setHours(9, 30, 0, 0); // Market open

    // Use current price as base, or a default if we don't have one
    let currentPrice = this.currentStockPrice.getValue() || 750;

    // Create a data point for every 5 minutes
    while (today < now) {
      // Random price movement (between -1% and +1%)
      const change = currentPrice * (Math.random() * 0.02 - 0.01);
      currentPrice += change;

      mockData.push({
        date: new Date(today),
        price: currentPrice,
      });

      // Add 5 minutes
      today.setMinutes(today.getMinutes() + 5);
    }

    return mockData;
  }
}
