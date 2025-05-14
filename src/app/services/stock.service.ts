import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, interval, of } from 'rxjs';
import { map, catchError, switchMap, tap, shareReplay } from 'rxjs/operators';
import { StockData, StockDataResponse } from '../models/stock-data.model';

@Injectable({
  providedIn: 'root',
})
export class StockService {
  private apiKey = 'WTMTQ0JIU7OF85FY'; // Replace with your Alpha Vantage API key
  private baseUrl = 'https://www.alphavantage.co/query';
  private symbol = 'TSLA';

  private currentStockPrice = new BehaviorSubject<number>(0);
  currentStockPrice$ = this.currentStockPrice.asObservable();

  private historicalData = new BehaviorSubject<StockData[]>([]);
  historicalData$ = this.historicalData.asObservable();

  private intradayData = new BehaviorSubject<StockData[]>([]);
  intradayData$ = this.intradayData.asObservable();

  constructor(private http: HttpClient) {
    // Initial data load
    this.getStockData();
    this.getIntradayData();

    // Update intraday data every 5 minutes
    interval(5 * 60 * 1000).subscribe(() => {
      this.getIntradayData();
    });
  }

  getStockData() {
    const params = {
      function: 'TIME_SERIES_DAILY',
      symbol: this.symbol,
      outputsize: 'full',
      apikey: this.apiKey,
    };

    this.http
      .get<StockDataResponse>(this.baseUrl, { params })
      .pipe(
        map((response) => {
          const stockData: StockData[] = [];
          const timeSeries = response['Time Series (Daily)'];

          // Get the last two years of data
          const twoYearsAgo = new Date();
          twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

          for (const dateStr in timeSeries) {
            const date = new Date(dateStr);
            if (date >= twoYearsAgo) {
              stockData.push({
                date: date,
                price: parseFloat(timeSeries[dateStr]['4. close']),
              });
            }
          }

          // Sort by date ascending
          stockData.sort((a, b) => a.date.getTime() - b.date.getTime());
          return stockData;
        }),
        catchError((error) => {
          console.error('Error fetching stock data:', error);
          return of([]);
        })
      )
      .subscribe((data) => {
        this.historicalData.next(data);

        // Update current stock price with the latest value
        if (data.length > 0) {
          this.currentStockPrice.next(data[data.length - 1].price);
        }
      });
  }

  getIntradayData() {
    const params = {
      function: 'TIME_SERIES_INTRADAY',
      symbol: this.symbol,
      interval: '5min',
      apikey: this.apiKey,
    };

    this.http
      .get<any>(this.baseUrl, { params })
      .pipe(
        map((response) => {
          const stockData: StockData[] = [];
          const timeSeries = response['Time Series (5min)'];

          // Get today's data only
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          for (const dateTimeStr in timeSeries) {
            const dateTime = new Date(dateTimeStr);
            if (dateTime >= today) {
              stockData.push({
                date: dateTime,
                price: parseFloat(timeSeries[dateTimeStr]['4. close']),
              });
            }
          }

          // Sort by date ascending
          stockData.sort((a, b) => a.date.getTime() - b.date.getTime());
          return stockData;
        }),
        catchError((error) => {
          console.error('Error fetching intraday stock data:', error);
          return of([]);
        })
      )
      .subscribe((data) => {
        this.intradayData.next(data);

        // Update current stock price with the latest value
        if (data.length > 0) {
          this.currentStockPrice.next(data[data.length - 1].price);
        }
      });
  }
}
