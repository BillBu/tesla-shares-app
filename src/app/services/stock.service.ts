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
  private readonly STORAGE_KEY_CURRENT_PRICE = 'tesla-app-current-price';

  private currentStockPrice = new BehaviorSubject<number>(0);
  currentStockPrice$ = this.currentStockPrice.asObservable();

  constructor(private http: HttpClient) {
    // Load cached data first
    this.loadCachedData();

    // Initial data load
    this.getQuote();

    // Update data every 5 minutes
    interval(5 * 60 * 1000).subscribe(() => {
      this.getQuote();
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
    } catch (error) {
      console.error('Error loading cached data:', error);
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
}
