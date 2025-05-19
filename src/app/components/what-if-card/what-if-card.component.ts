import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { WhatIfCard, WhatIfCardValue } from '../../models/what-if-card.model';
import { WhatIfCardService } from '../../services/what-if-card.service';
import { StockService } from '../../services/stock.service';
import { ExchangeRateService } from '../../services/exchange-rate.service';

@Component({
  selector: 'app-what-if-card',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './what-if-card.component.html',
  styleUrl: './what-if-card.component.scss',
})
export class WhatIfCardComponent implements OnInit, OnDestroy {
  @Input() card!: WhatIfCard;
  @Output() delete = new EventEmitter<string>();

  cardForm: FormGroup;
  cardValue$!: Observable<WhatIfCardValue>;

  currentStockPrice$: Observable<number>;
  currentExchangeRate$: Observable<number>;

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private whatIfCardService: WhatIfCardService,
    private stockService: StockService,
    private exchangeRateService: ExchangeRateService
  ) {
    this.currentStockPrice$ = this.stockService.currentStockPrice$;
    this.currentExchangeRate$ = this.exchangeRateService.currentExchangeRate$;

    this.cardForm = this.fb.group({
      name: [''],
      useCurrentStockPrice: [true],
      useCurrentExchangeRate: [true],
      customStockPrice: [null],
      customExchangeRate: [null],
    });
  }

  ngOnInit(): void {
    // Initialize form with card values
    this.cardForm.patchValue({
      name: this.card.name,
      useCurrentStockPrice: this.card.useCurrentStockPrice,
      useCurrentExchangeRate: this.card.useCurrentExchangeRate,
      customStockPrice: this.card.customStockPrice,
      customExchangeRate: this.card.customExchangeRate,
    });

    // Calculate values based on card settings
    this.cardValue$ = this.getCardValue$();

    // Subscribe to form changes to update card
    this.subscriptions.push(
      this.cardForm.valueChanges.subscribe(() => {
        const formValue = this.cardForm.value;
        const updatedCard: WhatIfCard = {
          ...this.card,
          name: formValue.name,
          useCurrentStockPrice: formValue.useCurrentStockPrice,
          useCurrentExchangeRate: formValue.useCurrentExchangeRate,
          customStockPrice:
            formValue.customStockPrice !== null
              ? Number(formValue.customStockPrice)
              : null,
          customExchangeRate:
            formValue.customExchangeRate !== null
              ? Number(formValue.customExchangeRate)
              : null,
        };

        this.card = updatedCard; // Update local card reference
        this.whatIfCardService.updateWhatIfCard(updatedCard);

        // Recalculate values
        this.cardValue$ = this.getCardValue$();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  onDelete(): void {
    this.delete.emit(this.card.id);
  }

  private getCardValue$(): Observable<WhatIfCardValue> {
    const formValue = this.cardForm.value;

    return combineLatest([
      formValue.useCurrentStockPrice
        ? this.currentStockPrice$
        : new Observable<number>((observer) =>
            observer.next(Number(formValue.customStockPrice) || 0)
          ),
      formValue.useCurrentExchangeRate
        ? this.currentExchangeRate$
        : new Observable<number>((observer) =>
            observer.next(Number(formValue.customExchangeRate) || 0)
          ),
      this.whatIfCardService['shareValueService'].numberOfShares$,
    ]).pipe(
      map(([stockPrice, exchangeRate, shares]) => {
        const usdValue = stockPrice * shares;
        const gbpValue = usdValue * exchangeRate;
        return { usdValue, gbpValue };
      })
    );
  }
}
