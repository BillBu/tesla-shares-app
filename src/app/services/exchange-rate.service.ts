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
  private readonly STORAGE_KEY_LAST_HISTORICAL_UPDATE =
    'tesla-app-last-rates-update';
  private readonly STORAGE_KEY_CURRENT_RATE = 'tesla-app-current-rate';

  private currentExchangeRate = new BehaviorSubject<number>(0);
  currentExchangeRate$ = this.currentExchangeRate.asObservable();

  constructor(private http: HttpClient) {
    // Load cached data first
    this.loadCachedData();

    // Initial data load
    this.getCurrentRate();

    // Update exchange rate every 5 minutes
    interval(5 * 60 * 1000).subscribe(() => {
      this.getCurrentRate();
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
   * Get the current exchange rate
   * @returns Returns the latest exchange rate, or cached rate if API fails
   */
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
            // If API request failed
            console.error('API request failed');

            // Use most recent cached rate if available
            const cachedRate = localStorage.getItem(
              this.STORAGE_KEY_CURRENT_RATE
            );
            if (cachedRate) {
              return parseFloat(cachedRate);
            }

            // If no cached rate, use a default value, but log this as an error
            console.error('No cached exchange rate available, using default');
            return 0.78;
          }
        }),
        catchError((error) => {
          console.error('Error fetching exchange rate data:', error);

          // Use most recent cached rate if available
          const cachedRate = localStorage.getItem(
            this.STORAGE_KEY_CURRENT_RATE
          );
          if (cachedRate) {
            return of(parseFloat(cachedRate));
          }

          // If no cached rate, use a default value, but log this as an error
          console.error('No cached exchange rate available, using default');
          return of(0.78);
        })
      )
      .subscribe((rate) => {
        this.currentExchangeRate.next(rate);
        this.saveCurrentRate(rate);
      });
  }
}
