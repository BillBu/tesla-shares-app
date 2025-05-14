import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockInputComponent } from './stock-input.component';

describe('StockInputComponent', () => {
  let component: StockInputComponent;
  let fixture: ComponentFixture<StockInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
