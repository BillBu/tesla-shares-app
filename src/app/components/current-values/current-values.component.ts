import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockService } from '../../services/stock.service';
import { ExchangeRateService } from '../../services/exchange-rate.service';
import { ShareValueService } from '../../services/share-value.service';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-current-values',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './current-values.component.html',
  styleUrl: './current-values.component.scss',
})
export class CurrentValuesComponent {
  currentStockPrice$: Observable<number>;
  currentExchangeRate$: Observable<number>;
  currentUsdValue$: Observable<number>;
  currentGbpValue$: Observable<number>;
  isOnline$: Observable<boolean>;
  lastUpdated$: Observable<Date | null>;

  // Computed observable for formatted last updated time
  formattedLastUpdated$: Observable<string>;

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

    // Format the last updated time as a readable string
    this.formattedLastUpdated$ = this.lastUpdated$.pipe(
      map((date) => {
        if (!date) return 'Never';

        const now = new Date();
        const diffInMinutes = Math.floor(
          (now.getTime() - date.getTime()) / (1000 * 60)
        );

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} hours ago`;

        return date.toLocaleString();
      })
    );
  }
}
