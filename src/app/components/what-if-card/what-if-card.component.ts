import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { Observable, Subscription, combineLatest, Subject } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatIfCardComponent implements OnInit, OnDestroy {
  @Input() card!: WhatIfCard;
  @Output() delete = new EventEmitter<string>();

  cardForm: FormGroup;
  cardValue$!: Observable<WhatIfCardValue>;

  currentStockPrice$: Observable<number>;
  currentExchangeRate$: Observable<number>;

  // Form value change subjects for debouncing
  stockPriceChange$ = new Subject<string>();
  exchangeRateChange$ = new Subject<string>();
  nameChange$ = new Subject<string>();

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
    // Reset form and initialize with card values to avoid any stale state
    this.cardForm.reset(
      {
        name: this.card.name,
        useCurrentStockPrice: this.card.useCurrentStockPrice,
        useCurrentExchangeRate: this.card.useCurrentExchangeRate,
        customStockPrice: this.card.customStockPrice,
        customExchangeRate: this.card.customExchangeRate,
      },
      { emitEvent: false }
    ); // Prevent initial value change events

    // Calculate values based on card settings
    this.cardValue$ = this.getCardValue$();

    // Set up debounced handling for text inputs with a longer debounce time
    // to ensure focus is maintained during typing
    this.subscriptions.push(
      this.stockPriceChange$
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe((value) => {
          this.updateStockPrice(value);
        })
    );

    this.subscriptions.push(
      this.exchangeRateChange$
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe((value) => {
          this.updateExchangeRate(value);
        })
    );

    this.subscriptions.push(
      this.nameChange$
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe((value) => {
          this.updateName(value);
        })
    );

    // Subscribe to radio button changes (no debounce needed)
    this.subscriptions.push(
      this.cardForm
        .get('useCurrentStockPrice')!
        .valueChanges.subscribe((value) => {
          this.updateCard();
        })
    );

    this.subscriptions.push(
      this.cardForm
        .get('useCurrentExchangeRate')!
        .valueChanges.subscribe((value) => {
          this.updateCard();
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  onDelete(): void {
    this.delete.emit(this.card.id);
  }

  // Select all text in the input field when it gets focus for better UX
  selectInput(event: FocusEvent): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      // Use setTimeout to ensure this happens after browser's focus event
      setTimeout(() => {
        input.select();
      }, 0);
    }
  }

  // The input handlers have been removed as we're now using ngModelChange directly
  // which passes the new value directly to our subjects

  updateStockPrice(value: string): void {
    if (value === String(this.cardForm.value.customStockPrice)) return;

    const numValue = value !== '' ? parseFloat(value) : null;
    this.cardForm.patchValue(
      { customStockPrice: numValue },
      { emitEvent: false }
    );
    this.updateCard();
  }

  updateExchangeRate(value: string): void {
    if (value === String(this.cardForm.value.customExchangeRate)) return;

    const numValue = value !== '' ? parseFloat(value) : null;
    this.cardForm.patchValue(
      { customExchangeRate: numValue },
      { emitEvent: false }
    );
    this.updateCard();
  }

  updateName(value: string): void {
    if (value === this.cardForm.value.name) return;

    this.cardForm.patchValue({ name: value }, { emitEvent: false });
    this.updateCard();
  }

  updateCard(): void {
    const formValue = this.cardForm.value;
    const updatedCard: WhatIfCard = {
      ...this.card,
      name: formValue.name,
      useCurrentStockPrice: formValue.useCurrentStockPrice,
      useCurrentExchangeRate: formValue.useCurrentExchangeRate,
      customStockPrice:
        formValue.customStockPrice !== null && formValue.customStockPrice !== ''
          ? parseFloat(String(formValue.customStockPrice)) || null
          : null,
      customExchangeRate:
        formValue.customExchangeRate !== null &&
        formValue.customExchangeRate !== ''
          ? parseFloat(String(formValue.customExchangeRate)) || null
          : null,
    };

    // Only update the service if the values have actually changed
    if (JSON.stringify(this.card) !== JSON.stringify(updatedCard)) {
      this.card = updatedCard; // Update local card reference
      this.whatIfCardService.updateWhatIfCard(updatedCard);
    }

    // Recalculate values
    this.cardValue$ = this.getCardValue$();
  }

  private getCardValue$(): Observable<WhatIfCardValue> {
    const formValue = this.cardForm.value;

    return combineLatest([
      formValue.useCurrentStockPrice
        ? this.currentStockPrice$
        : new Observable<number>((observer) => {
            const value = Number(formValue.customStockPrice) || 0;
            observer.next(value);
            // Complete the observable to prevent memory leaks
            observer.complete();
          }),
      formValue.useCurrentExchangeRate
        ? this.currentExchangeRate$
        : new Observable<number>((observer) => {
            const value = Number(formValue.customExchangeRate) || 0;
            observer.next(value);
            // Complete the observable to prevent memory leaks
            observer.complete();
          }),
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
