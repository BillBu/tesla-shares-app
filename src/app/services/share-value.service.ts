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
  dailyValues$: Observable<ShareValue[]>;
  historicalValues$: Observable<ShareValue[]>;

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

    // Daily chart values
    this.dailyValues$ = combineLatest([
      this.stockService.intradayData$,
      this.exchangeRateService.intradayRates$,
      this.numberOfShares$,
    ]).pipe(
      map(([stockData, rateData, shares]) => {
        const values: ShareValue[] = [];

        // Match up stock prices with exchange rates based on closest timestamps
        stockData.forEach((stockPoint) => {
          const stockTime = stockPoint.date.getTime();

          // Find the closest exchange rate timestamp
          let closestRatePoint = rateData[0];
          let smallestDiff = Number.MAX_VALUE;

          rateData.forEach((ratePoint) => {
            const diff = Math.abs(ratePoint.date.getTime() - stockTime);
            if (diff < smallestDiff) {
              smallestDiff = diff;
              closestRatePoint = ratePoint;
            }
          });

          if (closestRatePoint) {
            const usdValue = stockPoint.price * shares;
            const gbpValue = usdValue * closestRatePoint.rate;

            values.push({
              date: new Date(stockPoint.date),
              usdValue,
              gbpValue,
            });
          }
        });

        return values;
      })
    );

    // Historical chart values
    this.historicalValues$ = combineLatest([
      this.stockService.historicalData$,
      this.exchangeRateService.historicalRates$,
      this.numberOfShares$,
    ]).pipe(
      map(([stockData, rateData, shares]) => {
        const values: ShareValue[] = [];

        // Match up stock prices with exchange rates based on closest dates
        stockData.forEach((stockPoint) => {
          const stockDate = new Date(stockPoint.date);
          stockDate.setHours(0, 0, 0, 0);
          const stockTime = stockDate.getTime();

          // Find the closest exchange rate date
          let closestRatePoint = rateData[0];
          let smallestDiff = Number.MAX_VALUE;

          rateData.forEach((ratePoint) => {
            const rateDate = new Date(ratePoint.date);
            rateDate.setHours(0, 0, 0, 0);
            const diff = Math.abs(rateDate.getTime() - stockTime);

            if (diff < smallestDiff) {
              smallestDiff = diff;
              closestRatePoint = ratePoint;
            }
          });

          if (closestRatePoint) {
            const usdValue = stockPoint.price * shares;
            const gbpValue = usdValue * closestRatePoint.rate;

            values.push({
              date: new Date(stockPoint.date),
              usdValue,
              gbpValue,
            });
          }
        });

        return values;
      })
    );
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
