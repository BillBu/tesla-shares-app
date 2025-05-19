import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { WhatIfCard, WhatIfCardValue } from '../models/what-if-card.model';
import { StockService } from './stock.service';
import { ExchangeRateService } from './exchange-rate.service';
import { ShareValueService } from './share-value.service';

@Injectable({
  providedIn: 'root',
})
export class WhatIfCardService {
  private readonly WHAT_IF_CARDS_STORAGE_KEY = 'tesla-app-what-if-cards';
  private whatIfCards = new BehaviorSubject<WhatIfCard[]>(
    this.getInitialWhatIfCards()
  );
  whatIfCards$ = this.whatIfCards.asObservable();

  constructor(
    private stockService: StockService,
    private exchangeRateService: ExchangeRateService,
    private shareValueService: ShareValueService
  ) {}

  // CRUD operations for WhatIf cards
  addWhatIfCard(): WhatIfCard {
    const currentCards = this.whatIfCards.value;
    const newCard: WhatIfCard = {
      id: this.generateId(),
      name: `What If Scenario ${currentCards.length + 1}`,
      order: currentCards.length,
      useCurrentStockPrice: true,
      useCurrentExchangeRate: true,
      customStockPrice: null,
      customExchangeRate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.whatIfCards.next([...currentCards, newCard]);
    this.saveToLocalStorage();
    return newCard;
  }

  deleteWhatIfCard(id: string): void {
    const currentCards = this.whatIfCards.value;
    const updatedCards = currentCards
      .filter((card) => card.id !== id)
      .map((card, index) => ({ ...card, order: index }));

    this.whatIfCards.next(updatedCards);
    this.saveToLocalStorage();
  }

  updateWhatIfCard(updatedCard: WhatIfCard): void {
    const currentCards = this.whatIfCards.value;
    const updatedCards = currentCards.map((card) =>
      card.id === updatedCard.id
        ? { ...updatedCard, updatedAt: new Date() }
        : card
    );

    this.whatIfCards.next(updatedCards);
    this.saveToLocalStorage();
  }

  reorderWhatIfCards(newOrder: string[]): void {
    const currentCards = this.whatIfCards.value;
    const orderedCards = newOrder.map((id, index) => {
      const card = currentCards.find((c) => c.id === id);
      if (card) {
        return { ...card, order: index };
      }
      throw new Error(`Card with id ${id} not found`);
    });

    this.whatIfCards.next(orderedCards);
    this.saveToLocalStorage();
  }

  getWhatIfCardValue$(card: WhatIfCard): Observable<WhatIfCardValue> {
    return combineLatest([
      card.useCurrentStockPrice
        ? this.stockService.currentStockPrice$
        : new BehaviorSubject(card.customStockPrice || 0),
      card.useCurrentExchangeRate
        ? this.exchangeRateService.currentExchangeRate$
        : new BehaviorSubject(card.customExchangeRate || 0),
      this.shareValueService.numberOfShares$,
    ]).pipe(
      map(([stockPrice, exchangeRate, shares]) => {
        const usdValue = stockPrice * shares;
        const gbpValue = usdValue * exchangeRate;
        return { usdValue, gbpValue };
      }),
      shareReplay(1)
    );
  }

  // Helper methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getInitialWhatIfCards(): WhatIfCard[] {
    try {
      const storedCards = localStorage.getItem(this.WHAT_IF_CARDS_STORAGE_KEY);
      if (storedCards) {
        const cards: WhatIfCard[] = JSON.parse(storedCards);
        // Convert stored date strings back to Date objects
        return cards.map((card) => ({
          ...card,
          createdAt: new Date(card.createdAt),
          updatedAt: new Date(card.updatedAt),
        }));
      }
    } catch (error) {
      console.error('Error loading what-if cards from localStorage', error);
    }
    return [];
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem(
        this.WHAT_IF_CARDS_STORAGE_KEY,
        JSON.stringify(this.whatIfCards.value)
      );
    } catch (error) {
      console.error('Error saving what-if cards to localStorage', error);
    }
  }
}
