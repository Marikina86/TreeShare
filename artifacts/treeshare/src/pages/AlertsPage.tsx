import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/i18n";
import { Link } from "wouter";

// ─── Chiave localStorage per il timestamp dell'ultima lettura ────────────────
const ALERTS_LAST_READ_KEY = "alerts_last_read_at";
const NOTIFS_LAST_READ_KEY = "notifs_last_read_at";

export function getAlertsLastReadAt(): number {
  const v = localStorage.getItem(ALERTS_LAST_READ_KEY);
  return v ? parseInt(v, 10) : 0;
}

export function markAlertsRead() {
  localStorage.setItem(ALERTS_LAST_READ_KEY, String(Date.now()));
}

export function getNotifsLastReadAt(): number {
  const v = localStorage.getItem(NOTIFS_LAST_READ_KEY);
  return v ? parseInt(v, 10) : 0;
}

export function markNotifsRead() {
  localStorage.setItem(NOTIFS_LAST_READ_KEY, String(Date.now()));
}

// ─── Tipi ────────────────────────────────────────────────────────────────────
interface Alert {
  id: number;
  title: string;
  message: string;
  priority: "low" | "normal" | "high" | "critical";
  createdAt: string;
  updatedAt: string;
}

interface UserNotification {
  id: number;
  userId: string;
  title: string;
  message: string;
  type: string;
  relatedId: number | null;
  isRead: boolean;
  createdAt: string;
}

// ─── Badge priorità ──────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  low:      { label: { it: "Bassa",     en: "Low" },      cls: "bg-muted text-muted-foreground" },
  normal:   { label: { it: "Normale",   en: "Normal" },   cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  high:     { label: { it: "Alta",      en: "High" },     cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  critical: { label: { it: "Critica",   en: "Critical" }, cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const PRIORITY_BORDER = {
  low:      "border-border",
  normal:   "border-blue-200 dark:border-blue-800",
  high:     "border-orange-300 dark:border-orange-700",
  critical: "border-red-400 dark:border-red-600",
};

// ─── Cache modulo (persiste tra navigazioni, si azzera solo al ricaricamento) ──
let _alertsCache: Alert[] = [];
let _notifsCache: UserNotification[] = [];
let _cacheLoaded = false;

// ─── Componente principale ────────────────────────────────────────────────────
export default function AlertsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { lang } = useLang();

  const [alerts, setAlerts] = useState<Alert[]>(_alertsCache);
  const [notifications, setNotifications] = useState<UserNotification[]>(_notifsCache);
  const [loading, setLoading] = useState(!_cacheLoaded);

  // ── Pull-to-refresh state ──────────────────────────────────────────────────
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [pullState, setPullState] = useState<"idle" | "pulling" | "refreshing" | "done">("idle");
  const pullThreshold = 80;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const [alertsRes, notifsRes] = await Promise.all([
        fetch("/api/alerts", { headers }),
        fetch("/api/notifications", { headers }),
      ]);

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        _alertsCache = data;
        setAlerts(data);
      }
      if (notifsRes.ok) {
        const data = await notifsRes.json();
        _notifsCache = data;
        setNotifications(data);
      }
      _cacheLoaded = true;
    } catch {
      toast({
        title: lang === "it" ? "Errore caricamento" : "Error loading",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [getToken, toast, lang]);

  const fetchAllRef = useRef(fetchAll);
  fetchAllRef.current = fetchAll;

  // Fetch solo al primo caricamento (apertura app) — nessun polling
  useEffect(() => {
    if (!_cacheLoaded) {
      fetchAllRef.current();
    }
  }, []);

  // Segna come letti ad ogni visita (senza refetch)
  useEffect(() => {
    markAlertsRead();
    markNotifsRead();
    window.dispatchEvent(new Event("storage"));

    (async () => {
      try {
        const token = await getToken();
        if (token) {
          fetch("/api/notifications/read-all", {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch { /* silenzioso */ }
    })();
  }, [getToken]);

  // ── Touch handlers per pull-to-refresh ────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY > 0 || loading) return;
    touchStartY.current = e.touches[0].clientY;
    setPullState("pulling");
  }, [loading]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (pullState !== "pulling") return;
    const diff = Math.max(0, e.touches[0].clientY - touchStartY.current);
    setPullDistance(Math.min(diff * 0.5, 140));
  }, [pullState]);

  const handleTouchEnd = useCallback(async () => {
    if (pullState !== "pulling") return;
    if (pullDistance >= pullThreshold) {
      setPullState("refreshing");
      setPullDistance(pullThreshold);
      _cacheLoaded = false;
      await fetchAllRef.current();
      // aggiorna anche il badge nel Layout
      window.dispatchEvent(new Event("treeshare:refresh-inbox"));
      setPullState("done");
      setTimeout(() => { setPullDistance(0); setPullState("idle"); }, 600);
    } else {
      setPullDistance(0);
      setPullState("idle");
    }
  }, [pullState, pullDistance]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const unreadNotifs = notifications.filter((n) => !n.isRead);

  return (
    <Layout>
      <div
        className="max-w-2xl mx-auto px-4 py-8 space-y-8"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        {(pullState !== "idle" || pullDistance > 0) && (
          <div
            className="flex items-center justify-center gap-2 transition-all duration-200 overflow-hidden -mt-4"
            style={{ height: pullDistance, marginBottom: pullDistance > 0 ? 8 : 0 }}
          >
            {pullState === "refreshing" ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : pullState === "done" ? (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-green-500">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg
                width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                className={`text-muted-foreground transition-transform ${pullDistance >= pullThreshold ? "rotate-180" : ""}`}
              >
                <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {pullState === "refreshing"
                ? (lang === "it" ? "Aggiornamento..." : "Refreshing...")
                : pullState === "done"
                ? (lang === "it" ? "Aggiornato!" : "Updated!")
                : pullDistance >= pullThreshold
                ? (lang === "it" ? "Rilascia per aggiornare" : "Release to refresh")
                : (lang === "it" ? "Scorri per aggiornare" : "Pull to refresh")}
            </span>
          </div>
        )}

        {/* ── Messaggi personali ── */}
        {(notifications.length > 0 || loading) && (
          <section className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                {lang === "it" ? "I tuoi messaggi" : "Your messages"}
                {unreadNotifs.length > 0 && (
                  <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                    {unreadNotifs.length}
                  </span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {lang === "it"
                  ? "Risposte personali dal team TreeShare"
                  : "Personal replies from the TreeShare team"}
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => {
                  const isWinner = n.type === "weekly_winner" && n.relatedId;
                  const icon = isWinner ? "🌞" : "🔔";
                  const cardClass = `p-5 bg-card rounded-2xl shadow-sm border-2 transition-colors ${
                    !n.isRead
                      ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                      : "border-border"
                  }`;
                  const inner = (
                    <>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{icon}</span>
                          <h2 className="font-semibold text-foreground leading-snug">{n.title}</h2>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                          {formatDate(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pl-7">{n.message}</p>
                      <div className="flex items-center justify-between mt-3 pl-7">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          {lang === "it" ? "Team TreeShare" : "TreeShare Team"}
                        </p>
                        {isWinner && (
                          <span className="text-xs text-primary font-medium flex items-center gap-1">
                            {lang === "it" ? "Vedi la pianta" : "View plant"}
                            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </span>
                        )}
                      </div>
                    </>
                  );
                  return isWinner ? (
                    <Link key={n.id} href={`/tree/${n.relatedId}`}>
                      <div className={`${cardClass} cursor-pointer hover:shadow-md hover:border-primary/60 active:scale-[0.99] transition-all`}>
                        {inner}
                      </div>
                    </Link>
                  ) : (
                    <div key={n.id} className={cardClass}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Avvisi globali ── */}
        <section className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {lang === "it" ? "Avvisi" : "Announcements"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "it"
                ? "Comunicazioni ufficiali dal team TreeShare"
                : "Official communications from the TreeShare team"}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-muted-foreground text-sm">
                {lang === "it" ? "Nessun avviso al momento" : "No announcements yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const pCfg = PRIORITY_CONFIG[alert.priority] ?? PRIORITY_CONFIG.normal;
                const pBorder = PRIORITY_BORDER[alert.priority] ?? PRIORITY_BORDER.normal;
                return (
                  <div key={alert.id} className={`p-5 bg-card border rounded-2xl shadow-sm ${pBorder}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h2 className="font-semibold text-foreground leading-snug flex-1">{alert.title}</h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${pCfg.cls}`}>
                        {pCfg.label[lang === "it" ? "it" : "en"]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-3">{formatDate(alert.createdAt)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </Layout>
  );
}
