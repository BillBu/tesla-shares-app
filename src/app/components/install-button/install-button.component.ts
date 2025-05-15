import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaService } from '../../services/pwa.service';

@Component({
  selector: 'app-install-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      *ngIf="canInstall"
      (click)="installPwa()"
      class="btn btn-sm"
      [class.btn-outline-light]="isHeader"
      [class.btn-outline-primary]="!isHeader"
    >
      <i class="bi bi-download me-1"></i> Install App
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
    `,
  ],
})
export class InstallButtonComponent implements OnInit {
  canInstall = false;
  @Input() isHeader = false;

  constructor(private pwaService: PwaService) {}

  ngOnInit(): void {
    this.pwaService.canInstall$.subscribe((canInstall) => {
      this.canInstall = canInstall;
    });
  }

  installPwa(): void {
    this.pwaService
      .promptInstall()
      .catch((err) => console.error('Error installing PWA:', err));
  }
}
