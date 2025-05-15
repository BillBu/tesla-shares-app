import { Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { BehaviorSubject, filter, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PwaService {
  private _installPromptEvent: any;
  private _installPromptSubject = new BehaviorSubject<boolean>(false);

  canInstall$ = this._installPromptSubject.asObservable();

  constructor(private swUpdate: SwUpdate) {
    // Listen for available updates
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        map((evt) => ({
          currentVersion: evt.currentVersion,
          latestVersion: evt.latestVersion,
        }))
      )
      .subscribe(({ currentVersion, latestVersion }) => {
        console.log(`Current version: ${currentVersion.hash}`);
        console.log(`Latest version: ${latestVersion.hash}`);

        if (confirm('A new version of this app is available. Load it?')) {
          window.location.reload();
        }
      });

    // Listen for installation events
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67+ from automatically showing the prompt
      e.preventDefault();
      // Store the event for later use
      this._installPromptEvent = e;
      this._installPromptSubject.next(true);
    });
  }

  /**
   * Prompt the user to install the PWA
   */
  promptInstall(): Promise<boolean> {
    if (!this._installPromptEvent) {
      return Promise.reject(new Error('Install prompt not available'));
    }

    // Show the install prompt
    this._installPromptEvent.prompt();

    // Wait for the user to respond to the prompt
    return this._installPromptEvent.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        this._installPromptSubject.next(false);
        return true;
      } else {
        console.log('User dismissed the install prompt');
        return false;
      }
    });
  }

  /**
   * Check if the app is running in standalone mode (installed as PWA)
   */
  isRunningStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  }
}
