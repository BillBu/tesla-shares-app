import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StockInputComponent } from './components/stock-input/stock-input.component';
import { CurrentValuesComponent } from './components/current-values/current-values.component';
import { PwaPromptComponent } from './components/pwa-prompt/pwa-prompt.component';
import { InstallButtonComponent } from './components/install-button/install-button.component';
import { StockService } from './services/stock.service';
import { ExchangeRateService } from './services/exchange-rate.service';
import { VisibilityService } from './services/visibility.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    StockInputComponent,
    CurrentValuesComponent,
    PwaPromptComponent,
    InstallButtonComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Tesla Shares App';

  constructor(
    // Inject services to ensure they are instantiated
    private stockService: StockService,
    private exchangeRateService: ExchangeRateService,
    private visibilityService: VisibilityService
  ) {
    // Services will initialize and set up their own event listeners
  }
}
