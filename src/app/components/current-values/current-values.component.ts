import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockService } from '../../services/stock.service';
import { ExchangeRateService } from '../../services/exchange-rate.service';
import { ShareValueService } from '../../services/share-value.service';
import { Observable } from 'rxjs';

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

  constructor(
    private stockService: StockService,
    private exchangeRateService: ExchangeRateService,
    private shareValueService: ShareValueService
  ) {
    this.currentStockPrice$ = this.stockService.currentStockPrice$;
    this.currentExchangeRate$ = this.exchangeRateService.currentExchangeRate$;
    this.currentUsdValue$ = this.shareValueService.currentUsdValue$;
    this.currentGbpValue$ = this.shareValueService.currentGbpValue$;
  }
}
