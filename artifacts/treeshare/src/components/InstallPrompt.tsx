import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";

type Platform = "android" | "ios" | "desktop" | null;

function detectPlatform(): Platform {
  if (typeof window === "undefined") return null;
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isMac = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  const isAndroid = /android/i.test(ua);
  if (isIOS || isMac) return "ios";
  if (isAndroid) return "android";
  return "desktop";
}

function isInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

const SNOOZED_KEY = "treeshare_install_snoozed_until";
const SNOOZE_DAYS = 3;

function isSnoozed() {
  const val = localStorage.getItem(SNOOZED_KEY);
  if (!val) return false;
  return Date.now() < Number(val);
}

function snooze() {
  const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(SNOOZED_KEY, String(until));
}

function clearSnooze() {
  localStorage.removeItem(SNOOZED_KEY);
}

export default function InstallPrompt() {
  const { lang } = useLang();
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (isSnoozed()) return;

    const p = detectPlatform();
    setPlatform(p);

    if (p === "android" || p === "desktop") {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShow(true);
      };
      window.addEventListener("beforeinstallprompt", handler as any);
      return () => window.removeEventListener("beforeinstallprompt", handler as any);
    }

    if (p === "ios") {
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  // When uninstalled, the appinstalled event won't re-fire.
  // Reset snooze when the browser fires beforeinstallprompt again
  // (this happens after uninstall in a new session).
  useEffect(() => {
    const handler = () => clearSnooze();
    window.addEventListener("beforeinstallprompt", handler as any);
    return () => window.removeEventListener("beforeinstallprompt", handler as any);
  }, []);

  function dismiss() {
    snooze();
    setShow(false);
    setShowIOSGuide(false);
  }

  async function handleInstall() {
    if (platform === "ios") {
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShow(false);
    if (outcome === "accepted") {
      clearSnooze(); // reset so it can show again if uninstalled
    }
  }

  const T = {
    it: {
      title: "Installa TreeShare",
      desc: "Aggiungila alla schermata Home per averla sempre a portata di mano.",
      install: "Installa",
      later: "Dopo",
      iosTitle: "Come installare su iPhone/iPad",
      iosStep1: "Tocca il tasto",
      iosStep1b: "\"Condividi\"",
      iosStep2: "Scorri e tocca",
      iosStep2b: "\"Aggiungi a schermata Home\"",
      iosStep3: "Tocca",
      iosStep3b: "\"Aggiungi\"",
      close: "Ho capito",
    },
    en: {
      title: "Install TreeShare",
      desc: "Add it to your Home Screen to always have it at hand.",
      install: "Install",
      later: "Later",
      iosTitle: "How to install on iPhone/iPad",
      iosStep1: "Tap the",
      iosStep1b: "\"Share\" button",
      iosStep2: "Scroll and tap",
      iosStep2b: "\"Add to Home Screen\"",
      iosStep3: "Tap",
      iosStep3b: "\"Add\"",
      close: "Got it",
    },
  }[lang === "it" ? "it" : "en"];

  if (!show) return null;

  return (
    <>
      {/* iOS guide modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5 mb-2">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground text-base">{T.iosTitle}</h2>
              <button
                onClick={dismiss}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                <p className="text-sm text-foreground leading-relaxed">
                  {T.iosStep1}{" "}
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="16 6 12 2 8 6" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round"/>
                    </svg>
                    {T.iosStep1b}
                  </span>{" "}
                  {lang === "it" ? "nella barra di Safari" : "in Safari's toolbar"}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                <p className="text-sm text-foreground leading-relaxed">
                  {T.iosStep2}{" "}
                  <span className="font-semibold">{T.iosStep2b}</span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                <p className="text-sm text-foreground leading-relaxed">
                  {T.iosStep3}{" "}
                  <span className="font-semibold">{T.iosStep3b}</span>{" "}
                  {lang === "it" ? "in alto a destra" : "in the top-right corner"}
                </p>
              </div>
            </div>

            <div className="flex justify-center pt-1">
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="animate-bounce">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-xs">{lang === "it" ? "barra in basso" : "bottom toolbar"}</span>
              </div>
            </div>

            <button
              onClick={dismiss}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {T.close}
            </button>
          </div>
        </div>
      )}

      {/* Install banner */}
      {!showIOSGuide && (
        <div className="fixed bottom-20 left-0 right-0 z-[150] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-sm bg-card border border-border shadow-2xl rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
            <img src="/icon-192.png" alt="TreeShare" className="w-12 h-12 rounded-xl flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">{T.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{T.desc}</p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={handleInstall}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                {T.install}
              </button>
              <button
                onClick={dismiss}
                className="px-4 py-1.5 border border-border text-muted-foreground rounded-lg text-xs font-medium hover:bg-muted transition-colors whitespace-nowrap"
              >
                {T.later}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
