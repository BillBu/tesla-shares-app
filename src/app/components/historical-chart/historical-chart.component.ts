import {
  Component,
  OnInit,
  ViewChild,
  OnDestroy,
  AfterViewInit,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShareValueService } from '../../services/share-value.service';
import { ShareValue } from '../../models/share-value.model';
import { Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-historical-chart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historical-chart.component.html',
  styleUrl: './historical-chart.component.scss',
})
export class HistoricalChartComponent implements OnInit, OnDestroy {
  historicalChart: Chart | undefined;
  private subscription: Subscription = new Subscription();
  historicalValues: ShareValue[] = [];
  timeRange: string = '2y';

  @ViewChild('historicalCanvas') historicalCanvas!: ElementRef;

  constructor(private shareValueService: ShareValueService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.shareValueService.historicalValues$.subscribe((values) => {
        this.historicalValues = values;
        this.updateChart();
      })
    );
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    if (this.historicalChart) {
      this.historicalChart.destroy();
    }
  }

  updateChart(): void {
    if (this.historicalChart) {
      this.historicalChart.destroy();
    }

    setTimeout(() => {
      if (this.historicalCanvas && this.historicalValues.length > 0) {
        const ctx = this.historicalCanvas.nativeElement.getContext('2d');

        // Filter data based on selected time range
        const filteredData = this.filterDataByTimeRange();

        const labels = filteredData.map((value) => {
          const date = new Date(value.date);
          return date.toLocaleDateString();
        });

        const usdData = filteredData.map((value) => value.usdValue);
        const gbpData = filteredData.map((value) => value.gbpValue);

        this.historicalChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Value in USD',
                data: usdData,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderWidth: 2,
                tension: 0.1,
              },
              {
                label: 'Value in GBP',
                data: gbpData,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderWidth: 2,
                tension: 0.1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: this.getChartTitle(),
              },
              tooltip: {
                mode: 'index',
                intersect: false,
              },
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Date',
                },
              },
              y: {
                title: {
                  display: true,
                  text: 'Value',
                },
              },
            },
          },
        });
      }
    }, 0);
  }

  onTimeRangeChange(range: string): void {
    this.timeRange = range;
    this.updateChart();
  }

  filterDataByTimeRange(): ShareValue[] {
    const cutoffDate = new Date();

    switch (this.timeRange) {
      case '1w':
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case '1m':
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        break;
      case '6m':
        cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        break;
      case '1y':
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        break;
      case '2y':
      default:
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);
        break;
    }

    return this.historicalValues.filter((value) => value.date >= cutoffDate);
  }

  getChartTitle(): string {
    switch (this.timeRange) {
      case '1w':
        return 'Last Week Values';
      case '1m':
        return 'Last Month Values';
      case '6m':
        return 'Last 6 Months Values';
      case '1y':
        return 'Last Year Values';
      case '2y':
      default:
        return 'Last 2 Years Values';
    }
  }
}
