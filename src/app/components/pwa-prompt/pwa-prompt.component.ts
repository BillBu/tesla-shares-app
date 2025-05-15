import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaService } from '../../services/pwa.service';

@Component({
  selector: 'app-pwa-prompt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pwa-prompt.component.html',
  styleUrl: './pwa-prompt.component.scss',
})
export class PwaPromptComponent implements OnInit {
  canInstall = false;

  constructor(private pwaService: PwaService) {}

  ngOnInit(): void {
    this.pwaService.canInstall$.subscribe((canInstall) => {
      this.canInstall = canInstall;
    });
  }

  installPwa(): void {
    this.pwaService
      .promptInstall()
      .then((installed) => {
        if (installed) {
          this.canInstall = false;
        }
      })
      .catch((err) => console.error('Error installing PWA:', err));
  }
}
