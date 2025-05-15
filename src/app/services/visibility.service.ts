import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent, merge, Observable } from 'rxjs';
import { map, distinctUntilChanged, share } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class VisibilityService {
  private readonly FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Tracks document visibility state (visible or hidden)
   */
  private documentVisibility = new BehaviorSubject<boolean>(!document.hidden);
  documentVisibility$ = this.documentVisibility
    .asObservable()
    .pipe(distinctUntilChanged(), share());

  /**
   * Tracks window focus state (focused or blurred)
   */
  private windowFocus = new BehaviorSubject<boolean>(document.hasFocus());
  windowFocus$ = this.windowFocus
    .asObservable()
    .pipe(distinctUntilChanged(), share());

  /**
   * Combined observable that emits true when app becomes visible or focused
   */
  appResumed$: Observable<boolean>;

  constructor() {
    // Set up event listeners for visibility and focus changes
    this.setupVisibilityTracking();
    this.setupFocusTracking();

    // Combine visibility and focus events
    this.appResumed$ = merge(
      this.documentVisibility$.pipe(map((isVisible) => isVisible === true)),
      this.windowFocus$.pipe(map((isFocused) => isFocused === true))
    ).pipe(
      distinctUntilChanged(), // Only emit when the combined state changes
      share()
    );
  }

  /**
   * Set up visibility change tracking
   */
  private setupVisibilityTracking() {
    // Listen for visibility change events
    fromEvent(document, 'visibilitychange').subscribe(() => {
      this.documentVisibility.next(!document.hidden);
      console.log('Visibility state:', document.hidden ? 'hidden' : 'visible');
    });
  }

  /**
   * Set up focus tracking
   */
  private setupFocusTracking() {
    // Listen for focus events
    fromEvent(window, 'focus').subscribe(() => {
      this.windowFocus.next(true);
      console.log('Window focused');
    });

    // Listen for blur events
    fromEvent(window, 'blur').subscribe(() => {
      this.windowFocus.next(false);
      console.log('Window blurred');
    });
  }

  /**
   * Check if an update is needed based on the last update time
   * @param lastUpdated The timestamp of the last update
   * @returns true if the data should be updated (older than 5 minutes)
   */
  shouldUpdate(lastUpdated: Date | null): boolean {
    if (!lastUpdated) {
      return true; // No previous update, so definitely update
    }

    const now = new Date();
    const timeSinceUpdate = now.getTime() - lastUpdated.getTime();

    return timeSinceUpdate > this.FIVE_MINUTES;
  }
}
