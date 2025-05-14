import {
  Component,
  OnInit,
  ViewChild,
  OnDestroy,
  AfterViewInit,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShareValueService } from '../../services/share-value.service';
import { ShareValue } from '../../models/share-value.model';
import { Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-daily-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-chart.component.html',
  styleUrl: './daily-chart.component.scss',
})
export class DailyChartComponent implements OnInit, OnDestroy {
  dailyChart: Chart | undefined;
  private subscription: Subscription = new Subscription();
  dailyValues: ShareValue[] = [];

  @ViewChild('dailyCanvas') dailyCanvas: any;

  constructor(private shareValueService: ShareValueService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.shareValueService.dailyValues$.subscribe((values) => {
        this.dailyValues = values;
        this.updateChart();
      })
    );
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    if (this.dailyChart) {
      this.dailyChart.destroy();
    }
  }

  updateChart(): void {
    if (this.dailyChart) {
      this.dailyChart.destroy();
    }

    setTimeout(() => {
      if (this.dailyCanvas && this.dailyValues.length > 0) {
        const ctx = this.dailyCanvas.nativeElement.getContext('2d');

        const labels = this.dailyValues.map((value) => {
          const date = new Date(value.date);
          return date.toLocaleTimeString();
        });

        const usdData = this.dailyValues.map((value) => value.usdValue);
        const gbpData = this.dailyValues.map((value) => value.gbpValue);

        this.dailyChart = new Chart(ctx, {
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
                text: "Today's Values (5 Minute Intervals)",
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
                  text: 'Time',
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
      } else if (this.dailyCanvas) {
        // Handle empty data case
        const ctx = this.dailyCanvas.nativeElement.getContext('2d');

        this.dailyChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: [],
            datasets: [
              {
                label: 'Value in USD',
                data: [],
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderWidth: 2,
              },
              {
                label: 'Value in GBP',
                data: [],
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: 'No data available - Waiting for updates',
              },
              tooltip: {
                mode: 'index',
                intersect: false,
              },
            },
          },
        });
      }
    }, 0);
  }
}
