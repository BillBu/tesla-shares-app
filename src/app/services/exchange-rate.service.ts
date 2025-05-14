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
  private apiKey = ''; // You'll need to sign up for an API key at https://exchangeratesapi.io/
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
    // For demo purposes, using a mock response since real API requires a paid plan
    // In a real app, you would use this.http.get<ExchangeRateResponse>(`${this.baseUrl}/latest?access_key=${this.apiKey}&base=${this.fromCurrency}&symbols=${this.toCurrency}`)
    const mockExchangeRate = 0.78; // Current USD to GBP rate as of May 2024 (for demo purposes)
    const mockDate = new Date();

    this.currentExchangeRate.next(mockExchangeRate);

    // Add to intraday data
    const intradayData = this.intradayRates.getValue();
    intradayData.push({
      date: mockDate,
      rate: mockExchangeRate,
    });
    this.intradayRates.next(intradayData);

    // In a real implementation, you would use the API like this:
    /*
    this.http.get<ExchangeRateResponse>(`${this.baseUrl}/latest?access_key=${this.apiKey}&base=${this.fromCurrency}&symbols=${this.toCurrency}`).pipe(
      map(response => {
        const rate = response.rates[this.toCurrency];
        return rate;
      }),
      catchError(error => {
        console.error('Error fetching exchange rate data:', error);
        return of(0);
      })
    ).subscribe(rate => {
      this.currentExchangeRate.next(rate);
    });
    */
  }

  getHistoricalRates() {
    // For demo purposes, generating mock historical data
    // In a real app, you would fetch historical data from the API
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

    this.historicalRates.next(historicalData);

    // In a real implementation with a premium API subscription, you would use:
    /*
    // Get start and end dates
    const end = new Date().toISOString().split('T')[0];
    const start = new Date();
    start.setFullYear(start.getFullYear() - 2);
    const startStr = start.toISOString().split('T')[0];
    
    this.http.get<any>(`${this.baseUrl}/timeseries?access_key=${this.apiKey}&start_date=${startStr}&end_date=${end}&base=${this.fromCurrency}&symbols=${this.toCurrency}`).pipe(
      map(response => {
        const rateData: ExchangeRateData[] = [];
        for (const dateStr in response.rates) {
          rateData.push({
            date: new Date(dateStr),
            rate: response.rates[dateStr][this.toCurrency]
          });
        }
        return rateData.sort((a, b) => a.date.getTime() - b.date.getTime());
      }),
      catchError(error => {
        console.error('Error fetching historical exchange rate data:', error);
        return of([]);
      })
    ).subscribe(data => {
      this.historicalRates.next(data);
    });
    */
  }
}
