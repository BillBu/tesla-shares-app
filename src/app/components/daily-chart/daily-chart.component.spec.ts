import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyChartComponent } from './daily-chart.component';

describe('DailyChartComponent', () => {
  let component: DailyChartComponent;
  let fixture: ComponentFixture<DailyChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
