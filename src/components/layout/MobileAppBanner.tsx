import { useEffect, useState } from 'react';
import { X, ExternalLink, Smartphone, Star } from 'lucide-react';

const APP_STORE_URL = 'https://apps.apple.com/tr/app/eta%C5%9F-et/id6813872326';
const APP_ICON_URL =
  'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/d1/99/e3/d199e3bd-5b0b-2e67-02b7-ac8522153550/AppIcon-0-0-1x_U007ephone-0-1-85-220.png/100x100bb.jpg';

const BANNER_DISMISSED_KEY = 'dars_mobile_app_banner_dismissed_v1';
const JUST_LOGGED_IN_KEY = 'dars_just_logged_in_mobile';

function isMobileBrowserEnvironment(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  // Never show inside our native iOS WKWebView app or standalone PWA mode
  const isNativeWebView = Boolean((window as any).webkit?.messageHandlers?.darsNotification);
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    (window.navigator as any).standalone === true;
  if (isNativeWebView || isStandalone) return false;

  const ua = navigator.userAgent || '';
  const isMobileUA = /iPhone|iPad|iPod|Android|Mobile|CriOS|FxiOS/i.test(ua);
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isSmallTouchScreen = window.innerWidth <= 820 && navigator.maxTouchPoints > 0;

  return isMobileUA || isIPadOS || isSmallTouchScreen;
}

export function MobileAppBanner() {
  const [visible, setVisible] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [iconError, setIconError] = useState(false);

  useEffect(() => {
    const checkVisibility = () => {
      if (!isMobileBrowserEnvironment()) {
        setVisible(false);
        setShowLoginPopup(false);
        return;
      }

      try {
        const justLoggedIn = sessionStorage.getItem(JUST_LOGGED_IN_KEY) === '1';
        const dismissed = sessionStorage.getItem(BANNER_DISMISSED_KEY) === '1';

        if (justLoggedIn) {
          sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
          sessionStorage.removeItem(BANNER_DISMISSED_KEY);
          setVisible(true);
          setShowLoginPopup(true);
        } else if (!dismissed) {
          setVisible(true);
        }
      } catch {
        setVisible(true);
      }
    };

    checkVisibility();
    window.addEventListener('resize', checkVisibility);
    return () => window.removeEventListener('resize', checkVisibility);
  }, []);

  const handleDismissAll = () => {
    setVisible(false);
    setShowLoginPopup(false);
    try {
      sessionStorage.setItem(BANNER_DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const handleDismissPopupOnly = () => {
    setShowLoginPopup(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Top Smart App Banner (Trendyol / Hepsiburada style sticky top bar) */}
      <div className="sticky top-0 z-[80] w-full bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white shadow-md border-b border-white/10 px-2.5 py-2 lg:hidden">
        <div className="mx-auto flex max-w-screen-md items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={handleDismissAll}
              aria-label="Uygulama bildirimini kapat"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-[#003b73] shadow-sm flex items-center justify-center">
              {!iconError ? (
                <img
                  src={APP_ICON_URL}
                  alt="Etaş Et Mobil Uygulaması"
                  className="h-full w-full object-cover"
                  onError={() => setIconError(true)}
                />
              ) : (
                <Smartphone className="h-5 w-5 text-white" />
              )}
            </div>

            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-bold tracking-tight text-white">
                  Etaş Et - DARS Mobil
                </span>
                <span className="inline-flex items-center rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-400/30">
                  YENİ
                </span>
              </div>
              <p className="truncate text-[11px] text-slate-300 mt-0.5">
                App Store&apos;da yayında! Uygulamadan daha hızlı kullanın.
              </p>
              <div className="flex items-center gap-0.5 mt-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-1 text-[10px] text-slate-400">App Store • Ücretsiz</span>
              </div>
            </div>
          </div>

          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-[#0066cc] hover:bg-[#0055b3] active:scale-95 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all"
          >
            <span>Uygulamada Aç</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Prominent Slide-Down Alert Card right after Mobile Login */}
      {showLoginPopup && (
        <div className="fixed inset-x-0 top-16 z-[90] px-3 pt-2 lg:hidden animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5">
            <div className="relative bg-gradient-to-r from-[#003b73] to-[#0059a8] px-4 py-3 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-sky-200" />
                <span className="text-xs font-bold uppercase tracking-wider text-sky-100">
                  Mobil Uygulamamız Yayında
                </span>
              </div>
              <button
                type="button"
                onClick={handleDismissPopupOnly}
                aria-label="Kapat"
                className="rounded-full p-1 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-3.5">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-[#003b73] shadow-md flex items-center justify-center">
                  {!iconError ? (
                    <img
                      src={APP_ICON_URL}
                      alt="Etaş Et"
                      className="h-full w-full object-cover"
                      onError={() => setIconError(true)}
                    />
                  ) : (
                    <Smartphone className="h-7 w-7 text-white" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-900">
                    Etaş Et (DARS) App Store&apos;da!
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                    Tarayıcı yerine <strong>Etaş Et</strong> mobil uygulamamızı indirerek anlık bildirimler, Face ID ve çok daha hızlı erişimle sistemi kullanabilirsiniz.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDismissPopupOnly}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Tarayıcıda Devam Et
                </button>
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleDismissPopupOnly}
                  className="flex-[1.4] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0066cc] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#0055b3] active:scale-[0.99] transition-all"
                >
                  <span>App Store&apos;da Aç</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
