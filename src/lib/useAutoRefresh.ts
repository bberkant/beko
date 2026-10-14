import { useEffect, useRef } from 'react';

interface AutoRefreshOptions {
  /**
   * Minimum duration (ms) the user must have been away (tab hidden)
   * before returning to the tab triggers a reload. Default: 4 minutes.
   */
  minAwayTimeMs?: number;
  /**
   * Maximum idle time (ms) without any mouse/keyboard/scroll activity before
   * an in-place reload is triggered. Default: 15 minutes.
   */
  maxIdleTimeMs?: number;
  /**
   * Minimum cooldown (ms) between any two automatic reloads. Default: 3 minutes.
   */
  cooldownMs?: number;
  /**
   * Whether auto-refresh is enabled. Default: true.
   */
  enabled?: boolean;
}

/**
 * Checks if the user is currently working on an unsaved input, form, or modal.
 */
function isUserActivelyWorking(): boolean {
  if (typeof document === 'undefined') return false;

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

  // 3. Check if activeElement is an input, textarea, or select
  const activeEl = document.activeElement;
  if (activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)) {
    return true;
  }

  // 4. Check if current URL path indicates a creation/edit form
  if (typeof window !== 'undefined') {
    const p = window.location.pathname.toLowerCase();
    if (p.includes('/yeni') || p.includes('/duzenle') || p.includes('/ekle') || p.includes('/form')) {
      return true;
    }
  }

  return false;
}

export function useAutoRefresh(options?: AutoRefreshOptions) {
  const {
    minAwayTimeMs = 4 * 60 * 1000,    // 4 minutes away
    maxIdleTimeMs = 15 * 60 * 1000,   // 15 minutes idle
    cooldownMs = 3 * 60 * 1000,       // 3 minutes cooldown
    enabled = true
  } = options || {};

  const hiddenAtRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const lastReloadRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const performSafeReload = (reason: string) => {
      const now = Date.now();
      if (now - lastReloadRef.current < cooldownMs) {
        return;
      }
      if (isUserActivelyWorking()) {
        console.log(`[AutoRefresh] Skipped reload (${reason}): user is actively working or modal is open.`);
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

    // Track user activity
    const recordActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, recordActivity, { passive: true });
    });

    // Visibility change handler
    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = now;
      } else if (document.visibilityState === 'visible') {
        if (hiddenAtRef.current) {
          const awayDuration = now - hiddenAtRef.current;
          hiddenAtRef.current = null;
          if (awayDuration >= minAwayTimeMs) {
            performSafeReload(`tab returned after ${Math.round(awayDuration / 60000)} minutes away`);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic idle check (runs every 60 seconds)
    const interval = setInterval(() => {
      const now = Date.now();
      const idleTime = now - lastActivityRef.current;
      if (idleTime >= maxIdleTimeMs) {
        performSafeReload(`idle for ${Math.round(idleTime / 60000)} minutes`);
      }
    }, 60000);

    return () => {
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, recordActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [enabled, minAwayTimeMs, maxIdleTimeMs, cooldownMs]);
}
