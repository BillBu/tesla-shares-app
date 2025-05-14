import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StockInputComponent } from './components/stock-input/stock-input.component';
import { CurrentValuesComponent } from './components/current-values/current-values.component';
import { DailyChartComponent } from './components/daily-chart/daily-chart.component';
import { HistoricalChartComponent } from './components/historical-chart/historical-chart.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    StockInputComponent,
    CurrentValuesComponent,
    DailyChartComponent,
    HistoricalChartComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Tesla Shares App';
}
