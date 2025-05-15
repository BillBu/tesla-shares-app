import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  Observable,
  BehaviorSubject,
  interval,
  of,
  fromEvent,
  merge,
} from 'rxjs';
import { map, catchError, debounceTime } from 'rxjs/operators';
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
  private readonly STORAGE_KEY_LAST_UPDATED = 'tesla-app-last-updated';

  private currentStockPrice = new BehaviorSubject<number>(0);
  currentStockPrice$ = this.currentStockPrice.asObservable();

  private isOnline = new BehaviorSubject<boolean>(navigator.onLine);
  isOnline$ = this.isOnline.asObservable();

  private lastUpdated = new BehaviorSubject<Date | null>(null);

  constructor(private http: HttpClient) {
    // Load cached data first
    this.loadCachedData();

    // Initial data load
    this.getQuote();

    // Monitor online status
    this.setupOnlineOfflineHandling();

    // Update data every 5 minutes if online
    interval(5 * 60 * 1000).subscribe(() => {
      if (navigator.onLine) {
        this.getQuote();
      }
    });
  }

  /**
   * Sets up online/offline event handlers
   */
  private setupOnlineOfflineHandling() {
    // Create observables for the online and offline events
    const online$ = fromEvent(window, 'online');
    const offline$ = fromEvent(window, 'offline');

    // Update the isOnline BehaviorSubject when online/offline events fire
    online$.subscribe(() => {
      console.log('App is online');
      this.isOnline.next(true);
      // Refresh data when we come back online
      this.getQuote();
    });

    offline$.subscribe(() => {
      console.log('App is offline');
      this.isOnline.next(false);
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

      // Load last updated timestamp
      const lastUpdatedStr = localStorage.getItem(
        this.STORAGE_KEY_LAST_UPDATED
      );
      if (lastUpdatedStr) {
        const lastUpdatedDate = new Date(lastUpdatedStr);
        this.lastUpdated.next(lastUpdatedDate);
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

      // Also save the timestamp
      const now = new Date();
      localStorage.setItem(this.STORAGE_KEY_LAST_UPDATED, now.toISOString());
      this.lastUpdated.next(now);
    } catch (error) {
      console.error('Error saving current price to storage:', error);
    }
  }

  /**
   * Get the last updated timestamp as an Observable
   */
  getLastUpdated(): Observable<Date | null> {
    return this.lastUpdated.asObservable();
  }

  /**
   * Get the current value of the lastUpdated BehaviorSubject
   */
  getLastUpdatedValue(): Date | null {
    return this.lastUpdated.getValue();
  }

  /**
   * Get the current quote for the stock
   */
  getQuote() {
    // If offline, use cached data
    if (!navigator.onLine) {
      console.log('App is offline, using cached data');
      return;
    }

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
