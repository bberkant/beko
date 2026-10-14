import { useEffect, useRef } from 'react';

interface AutoRefreshOptions {
  /**
   * Minimum duration (ms) the user must have been away (tab hidden)
   * before returning to the tab triggers a reload. Default: 60 seconds (1 minute).
   */
  minAwayTimeMs?: number;
  /**
   * Maximum idle time (ms) without any mouse/keyboard/scroll activity before
   * an in-place reload is triggered. Default: 5 minutes.
   */
  maxIdleTimeMs?: number;
  /**
   * Minimum cooldown (ms) between any two automatic reloads. Default: 60 seconds.
   */
  cooldownMs?: number;
  /**
   * Whether auto-refresh is enabled. Default: true.
   */
  enabled?: boolean;
}

export function useAutoRefresh(options?: AutoRefreshOptions) {
  const {
    minAwayTimeMs = 60 * 1000,        // 1 minute away
    maxIdleTimeMs = 5 * 60 * 1000,    // 5 minutes idle
    cooldownMs = 60 * 1000,           // 1 minute cooldown
    enabled = true
  } = options || {};

  const hiddenAtRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const lastInputTimeRef = useRef<number>(0);
  const lastReloadRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    /**
     * Checks if the user is currently working on an unsaved input, form, or modal.
     */
    const isUserActivelyWorking = (): boolean => {
      // 1. Check if offline
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return true;
      }

      // 2. Check if any modal is open
      const openModal = document.querySelector(
        '[role="dialog"], .modal, [class*="fixed inset-0 z-50"], [class*="fixed inset-0"][class*="z-50"]'
      );
      if (openModal) {
        return true;
      }

      // 3. Check if activeElement is an input, textarea, or select AND user typed recently (< 45s)
      const activeEl = document.activeElement;
      if (activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)) {
        const timeSinceLastInput = Date.now() - lastInputTimeRef.current;
        if (timeSinceLastInput < 45000) {
          return true;
        }
      }

      // 4. Check if current URL path indicates an explicit creation/edit form
      const p = window.location.pathname.toLowerCase();
      if (p.includes('/yeni') || p.includes('/duzenle') || p.includes('/ekle') || p.includes('/form')) {
        return true;
      }

      return false;
    };

    const performSafeReload = (reason: string) => {
      const now = Date.now();
      if (now - lastReloadRef.current < cooldownMs) {
        return;
      }
      if (isUserActivelyWorking()) {
        console.log(`[AutoRefresh] Skipped reload (${reason}): user is actively typing or modal is open.`);
        return;
      }

      console.log(`[AutoRefresh] Executing background auto-reload (${reason}) to fetch fresh data.`);
      lastReloadRef.current = now;
      try {
        localStorage.setItem('dars_last_auto_reload', JSON.stringify({
          time: new Date().toISOString(),
          reason
        }));
      } catch {}

      // Reload with fresh server request
      window.location.reload();
    };

    // Track user general activity
    const recordActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Track active typing / input interaction
    const recordInputActivity = () => {
      lastActivityRef.current = Date.now();
      lastInputTimeRef.current = Date.now();
    };

    const activityEvents = ['mousemove', 'mousedown', 'touchstart', 'scroll'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, recordActivity, { passive: true });
    });

    const inputEvents = ['keydown', 'input', 'change'];
    inputEvents.forEach(evt => {
      window.addEventListener(evt, recordInputActivity, { passive: true });
    });

    // Visibility change handler (tab switch back)
    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = now;
      } else if (document.visibilityState === 'visible') {
        if (hiddenAtRef.current) {
          const awayDuration = now - hiddenAtRef.current;
          hiddenAtRef.current = null;
          if (awayDuration >= minAwayTimeMs) {
            performSafeReload(`tab returned after ${Math.round(awayDuration / 1000)} seconds away`);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic idle check (runs every 30 seconds)
    const interval = setInterval(() => {
      const now = Date.now();
      const idleTime = now - lastActivityRef.current;
      if (idleTime >= maxIdleTimeMs) {
        performSafeReload(`idle for ${Math.round(idleTime / 60000)} minutes`);
      }
    }, 30000);

    return () => {
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, recordActivity);
      });
      inputEvents.forEach(evt => {
        window.removeEventListener(evt, recordInputActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [enabled, minAwayTimeMs, maxIdleTimeMs, cooldownMs]);
}
