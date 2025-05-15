import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StockService } from './stock.service';
import { ExchangeRateService } from './exchange-rate.service';
import { ShareValue } from '../models/share-value.model';

@Injectable({
  providedIn: 'root',
})
export class ShareValueService {
  private readonly SHARES_STORAGE_KEY = 'tesla-app-shares';
  private numberOfShares = new BehaviorSubject<number>(
    this.getInitialShareCount()
  );
  numberOfShares$ = this.numberOfShares.asObservable();

  // Observables
  currentUsdValue$: Observable<number>;
  currentGbpValue$: Observable<number>;
  constructor(
    private stockService: StockService,
    private exchangeRateService: ExchangeRateService
  ) {
    // Current values
    this.currentUsdValue$ = combineLatest([
      this.stockService.currentStockPrice$,
      this.numberOfShares$,
    ]).pipe(map(([price, shares]) => price * shares));

    this.currentGbpValue$ = combineLatest([
      this.currentUsdValue$,
      this.exchangeRateService.currentExchangeRate$,
    ]).pipe(map(([usdValue, rate]) => usdValue * rate));
  }

  updateNumberOfShares(shares: number) {
    this.numberOfShares.next(shares);
    this.saveShareCountToLocalStorage(shares);
  }

  private getInitialShareCount(): number {
    try {
      const storedValue = localStorage.getItem(this.SHARES_STORAGE_KEY);
      if (storedValue) {
        const parsedValue = parseInt(storedValue, 10);
        return !isNaN(parsedValue) ? parsedValue : 0;
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
    return 0;
  }

  private saveShareCountToLocalStorage(shares: number): void {
    try {
      localStorage.setItem(this.SHARES_STORAGE_KEY, shares.toString());
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
}
