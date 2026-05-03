import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Stripe.js (test mode + Link) injects <marquee id="test-mode-banner"> into document.body.
// Remove it the instant it appears, regardless of CSS caching.
(function removeStripeTestBanner() {
  const remove = () => { document.getElementById("test-mode-banner")?.remove(); };
  const observer = new MutationObserver(remove);
  observer.observe(document.body, { childList: true });
  remove(); // handle if already injected before observer starts
})();

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });
        })
        .catch(() => {});

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    });
  } else {
    // In sviluppo: disinstalla qualsiasi SW attivo per evitare conflitti
    // tra i file in cache e quelli serviti da Vite
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
