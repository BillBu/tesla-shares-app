import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockService } from '../../services/stock.service';
import { ExchangeRateService } from '../../services/exchange-rate.service';
import { ShareValueService } from '../../services/share-value.service';
import {
  Observable,
  Subscription,
  interval,
  map,
  shareReplay,
  startWith,
} from 'rxjs';

@Component({
  selector: 'app-current-values',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './current-values.component.html',
  styleUrl: './current-values.component.scss',
})
export class CurrentValuesComponent implements OnInit, OnDestroy {
  currentStockPrice$: Observable<number>;
  currentExchangeRate$: Observable<number>;
  currentUsdValue$: Observable<number>;
  currentGbpValue$: Observable<number>;
  isOnline$: Observable<boolean>;
  lastUpdated$: Observable<Date | null>;

  // Computed observable for formatted last updated time
  formattedLastUpdated$!: Observable<string>;

  // Store subscription to clean up on destroy
  private timerSubscription: Subscription | null = null;

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
    this.lastUpdated$ = this.stockService.getLastUpdated();
  }

  ngOnInit() {
    // Create a timer that emits every minute (60000ms)
    const timer$ = interval(60000).pipe(
      // Also emit immediately when component initializes
      startWith(0)
    );

    // Format the last updated time as a readable string, updating every minute
    this.formattedLastUpdated$ = timer$.pipe(
      map(() => {
        // Get the current last updated value
        const date = this.stockService.getLastUpdatedValue();

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

  ngOnDestroy() {
    // Clean up subscriptions when the component is destroyed
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }
}
