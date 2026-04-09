import { useEffect, useRef } from "react";

type AlertPayload = {
  id: number;
  title: string;
  message: string;
  priority: string;
  createdAt: string;
};

type Options = {
  /** Chiamata quando arriva un nuovo avviso via SSE */
  onNewAlert?: (alert: AlertPayload) => void;
};

/**
 * Hook che apre una connessione SSE a /api/alerts/sse
 * e invoca onNewAlert ogni volta che l'admin pubblica un avviso.
 * Gestisce automaticamente la riconnessione in caso di errore.
 */
export function useAlertSSE({ onNewAlert }: Options = {}) {
  const cbRef = useRef(onNewAlert);
  cbRef.current = onNewAlert;

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 2000;
    let destroyed = false;

    function connect() {
      if (destroyed) return;

      es = new EventSource("/api/alerts/sse");

      es.addEventListener("new_alert", (e) => {
        try {
          const data = JSON.parse(e.data) as AlertPayload;
          cbRef.current?.(data);

          // Mostra una notifica browser se l'utente ha concesso il permesso
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(`🔔 ${data.title}`, {
              body: data.message.slice(0, 100),
              icon: "/icon-192.png",
              tag: `alert-${data.id}`,
            });
          }
        } catch {
          // ignora JSON malformato
        }
      });

      es.addEventListener("open", () => {
        retryDelay = 2000; // reset backoff on success
      });

      es.addEventListener("error", () => {
        es?.close();
        es = null;
        if (!destroyed) {
          retryTimeout = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 30_000);
            connect();
          }, retryDelay);
        }
      });
    }

    // Richiedi il permesso per le notifiche browser (se non ancora fatto)
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    connect();

    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      es?.close();
    };
  }, []);
}
