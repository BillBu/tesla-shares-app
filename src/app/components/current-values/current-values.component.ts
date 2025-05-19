import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockService } from '../../services/stock.service';
import { ExchangeRateService } from '../../services/exchange-rate.service';
import { ShareValueService } from '../../services/share-value.service';
import { WhatIfContainerComponent } from '../what-if-container/what-if-container.component';
import {
  Observable,
  Subscription,
  combineLatest,
  interval,
  map,
  shareReplay,
  startWith,
  timer,
} from 'rxjs';

@Component({
  selector: 'app-current-values',
  standalone: true,
  imports: [CommonModule, WhatIfContainerComponent],
  templateUrl: './current-values.component.html',
  styleUrl: './current-values.component.scss',
})
export class CurrentValuesComponent implements OnInit, OnDestroy {
  currentStockPrice$: Observable<number>;
  currentExchangeRate$: Observable<number>;
  currentUsdValue$: Observable<number>;
  currentGbpValue$: Observable<number>;
  isOnline$: Observable<boolean>;

  // Combined last updated observable - latest time from either service
  lastUpdated$: Observable<Date | null>;

  // Computed observable for formatted last updated time
  formattedLastUpdated$!: Observable<string>;

  // Refreshing state
  isRefreshing = false;

  // Store subscription to clean up on destroy
  private timerSubscription: Subscription | null = null;
  private refreshSubscription: Subscription | null = null;

  constructor(
    private stockService: StockService,
    private exchangeRateService: ExchangeRateService,
    private shareValueService: ShareValueService
  ) {
    this.currentStockPrice$ = this.stockService.currentStockPrice$;
    this.currentExchangeRate$ = this.exchangeRateService.currentExchangeRate$;
    this.currentUsdValue$ = this.shareValueService.currentUsdValue$;
    this.currentGbpValue$ = this.shareValueService.currentGbpValue$;
    this.isOnline$ = this.stockService.isOnline$;

    // Use the most recent update time from either service
    this.lastUpdated$ = combineLatest([
      this.stockService.getLastUpdated(),
      this.exchangeRateService.getLastUpdated(),
    ]).pipe(
      map(([stockTime, rateTime]) => {
        // If either time is null, return the other one
        if (!stockTime) return rateTime;
        if (!rateTime) return stockTime;

        // Return the more recent timestamp
        return stockTime.getTime() > rateTime.getTime() ? stockTime : rateTime;
      })
    );
  }

  ngOnInit() {
    // Create a timer that emits every minute (60000ms)
    const timer$ = interval(60000).pipe(
      // Also emit immediately when component initializes
      startWith(0)
    );

    // Format the last updated time as a readable string, updating every minute
    this.formattedLastUpdated$ = combineLatest([
      timer$,
      this.lastUpdated$,
    ]).pipe(
      map(([_, lastUpdated]) => {
        // Get the most recent update time (from either stock or exchange rate)
        const date = lastUpdated;

        if (!date) return 'Never';

        const now = new Date();
        const diffInMinutes = Math.floor(
          (now.getTime() - date.getTime()) / (1000 * 60)
        );

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes === 1) return '1 minute ago';
        if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours === 1) return '1 hour ago';
        if (diffInHours < 24) return `${diffInHours} hours ago`;

        return date.toLocaleString();
      }),
      // Share the result to all subscribers
      shareReplay(1)
    );

    // Subscribe to ensure the observable is active
    this.timerSubscription = this.formattedLastUpdated$.subscribe();
  }

  /**
   * Manually refresh both stock and exchange rate data
   */
  refreshData(): void {
    if (!navigator.onLine) return;

    this.isRefreshing = true;

    const refresh$ = combineLatest([
      this.stockService.refreshData(),
      this.exchangeRateService.refreshData(),
    ]);

    this.refreshSubscription = refresh$.subscribe({
      next: () => {
        this.isRefreshing = false;
      },
      error: (err) => {
        console.error('Error refreshing data:', err);
        this.isRefreshing = false;
      },
      complete: () => {
        this.isRefreshing = false;
      },
    });
  }

  ngOnDestroy() {
    // Clean up subscriptions when the component is destroyed
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }
}
