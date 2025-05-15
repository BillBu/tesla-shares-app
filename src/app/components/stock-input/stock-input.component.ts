import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ShareValueService } from '../../services/share-value.service';

@Component({
  selector: 'app-stock-input',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './stock-input.component.html',
  styleUrl: './stock-input.component.scss',
})
export class StockInputComponent {
  shares: number = 0;

  constructor(private shareValueService: ShareValueService) {
    // Initialize shares from the service which loads from localStorage
    this.shareValueService.numberOfShares$.subscribe((shares) => {
      this.shares = shares;
    });
  }

  onSharesChanged() {
    if (this.shares !== null && !isNaN(this.shares)) {
      this.shareValueService.updateNumberOfShares(this.shares);
    }
  }
}
