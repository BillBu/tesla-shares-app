import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { WhatIfCardService } from '../../services/what-if-card.service';
import { WhatIfCard } from '../../models/what-if-card.model';
import { WhatIfCardComponent } from '../what-if-card/what-if-card.component';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-what-if-container',
  standalone: true,
  imports: [CommonModule, DragDropModule, WhatIfCardComponent],
  templateUrl: './what-if-container.component.html',
  styleUrl: './what-if-container.component.scss',
})
export class WhatIfContainerComponent implements OnInit {
  whatIfCards$: Observable<WhatIfCard[]>;

  constructor(private whatIfCardService: WhatIfCardService) {
    // Ensure we never emit null, always empty array
    this.whatIfCards$ = this.whatIfCardService.whatIfCards$.pipe(
      map((cards) => cards || [])
    );
  }

  ngOnInit(): void {}

  addWhatIfCard(): void {
    this.whatIfCardService.addWhatIfCard();
  }

  deleteWhatIfCard(id: string): void {
    this.whatIfCardService.deleteWhatIfCard(id);
  }

  onDrop(event: CdkDragDrop<WhatIfCard[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    // Get current cards
    const cards = [...event.container.data];

    // Reorder locally
    moveItemInArray(cards, event.previousIndex, event.currentIndex);

    // Update service with new order
    const newOrder = cards.map((card) => card.id);
    this.whatIfCardService.reorderWhatIfCards(newOrder);
  }

  // Track cards by ID to prevent unnecessary re-rendering
  trackByCardId(index: number, card: WhatIfCard): string {
    return card.id;
  }
}
