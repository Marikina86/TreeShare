import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useUser, useClerk, useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { useGetMyProfile } from "@workspace/api-client-react";
import { getEventsLastSeenAt } from "@/pages/EventsPage";
import { getAlertsLastReadAt, getNotifsLastReadAt } from "@/pages/AlertsPage";
import { getTipsLastReadAt } from "@/pages/TipsPage";
import { useGps, getPlatformInstructions } from "@/hooks/useGps";

let _inboxFetchedOnce = false;

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const { t, lang } = useLang();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileQuery = useGetMyProfile();
  const isAdmin = (profileQuery.data as any)?.isAdmin === true;

  // ── Badge contatori (tutti da inbox, fetch singolo all'avvio o pull-to-refresh) ──
  const [newEventsCount, setNewEventsCount] = useState(0);
  const [newAlertsCount, setNewAlertsCount] = useState(0);
  const [newNotifsCount, setNewNotifsCount] = useState(0);
  const [latestAlertTime, setLatestAlertTime] = useState<number>(0);
  const prevLatestAlertTimeRef = useRef<number>(0);

  const [newTipsCount, setNewTipsCount] = useState(0);
  const [latestTipTime, setLatestTipTime] = useState<number>(0);
  const prevLatestTipTimeRef = useRef<number>(0);

  const [latestEventTime, setLatestEventTime] = useState<number>(0);

  const fetchInbox = useRef(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/inbox", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const inbox: {
        alerts: Array<{ id: number; title: string; message: string; createdAt: string }>;
        notifications: Array<{ isRead: boolean; createdAt: string }>;
        tips: Array<{ id: number; title: string; createdAt: string }>;
        events: Array<{ id: number; createdAt: string }>;
      } = await res.json();

      const alertsLastRead = getAlertsLastReadAt();
      const unreadAlerts = inbox.alerts.filter(
        (a) => new Date(a.createdAt).getTime() > alertsLastRead
      ).length;
      setNewAlertsCount(unreadAlerts);
      const latestAlert = inbox.alerts.length > 0
        ? new Date(inbox.alerts[0].createdAt).getTime() : 0;
      setLatestAlertTime(latestAlert);
      prevLatestAlertTimeRef.current = latestAlert;

      const notifsLastRead = getNotifsLastReadAt();
      setNewNotifsCount(
        inbox.notifications.filter(
          (n) => !n.isRead || new Date(n.createdAt).getTime() > notifsLastRead
        ).length
      );

      const tipsLastRead = getTipsLastReadAt();
      setNewTipsCount(
        inbox.tips.filter((t) => new Date(t.createdAt).getTime() > tipsLastRead).length
      );
      const latestTip = inbox.tips.length > 0
        ? new Date(inbox.tips[0].createdAt).getTime() : 0;
      setLatestTipTime(latestTip);
      prevLatestTipTimeRef.current = latestTip;

      const eventsLastSeen = getEventsLastSeenAt();
      const newEvents = (inbox.events ?? []).filter(
        (e) => new Date(e.createdAt).getTime() > eventsLastSeen
      ).length;
      setNewEventsCount(newEvents);
      const latestEvent = inbox.events?.length > 0
        ? new Date(inbox.events[0].createdAt).getTime() : 0;
      setLatestEventTime(latestEvent);
    } catch { /* silenzioso */ }
  }).current;

  useEffect(() => {
    if (!_inboxFetchedOnce) {
      _inboxFetchedOnce = true;
      fetchInbox();
    }
    const handler = () => fetchInbox();
    window.addEventListener("treeshare:refresh-inbox", handler);
    return () => window.removeEventListener("treeshare:refresh-inbox", handler);
  }, []);

  // Azzeramento badge da localStorage (visita pagine)
  useEffect(() => {
    const onStorage = () => {
      const t = getAlertsLastReadAt();
      setNewAlertsCount((prev) => (t >= latestAlertTime ? 0 : prev));
      const nt = getNotifsLastReadAt();
      if (nt > 0) setNewNotifsCount(0);
      const tipsLastRead = getTipsLastReadAt();
      setNewTipsCount((prev) => (tipsLastRead >= latestTipTime ? 0 : prev));
      const eventsLastSeen = getEventsLastSeenAt();
      setNewEventsCount((prev) => (eventsLastSeen >= latestEventTime ? 0 : prev));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [latestAlertTime, latestTipTime, latestEventTime]);


  // ── Prompt autorizzazione GPS ─────────────────────────────────────────────
  const GPS_ASKED_KEY = "treeshare_gps_asked";
  const GPS_POS_KEY = "treeshare_last_gps";
  const { permission: gpsPermission, requestPosition: gpsRequest } = useGps();
  const [gpsPromptDismissed, setGpsPromptDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(GPS_ASKED_KEY) === "1"; } catch { return false; }
  });
  const [gpsRequesting, setGpsRequesting] = useState(false);
  const [gpsDeniedPrompt, setGpsDeniedPrompt] = useState(false);
  const gpsAutoRequestedRef = useRef(false);

  // Mostra il prompt se: loggato, GPS non granted/unsupported, non ancora chiesto, non su pagine auth
  const hasStoredGps = (() => { try { return !!localStorage.getItem(GPS_POS_KEY); } catch { return false; } })();
  const showGpsPrompt =
    !!user &&
    !gpsPromptDismissed &&
    !hasStoredGps &&
    gpsPermission !== "granted" &&
    gpsPermission !== "unsupported" &&
    gpsPermission !== "checking" &&
    !location.startsWith("/onboarding") &&
    !location.startsWith("/sign-in") &&
    !location.startsWith("/sign-up");

  // Auto-request GPS quando il permesso è ancora da decidere ("prompt")
  useEffect(() => {
    if (
      !gpsAutoRequestedRef.current &&
      !!user &&
      !gpsPromptDismissed &&
      !hasStoredGps &&
      gpsPermission === "prompt" &&
      !location.startsWith("/onboarding") &&
      !location.startsWith("/sign-in") &&
      !location.startsWith("/sign-up")
    ) {
      gpsAutoRequestedRef.current = true;
      gpsRequest().then(() => {
        dismissGpsPrompt();
      }).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("negato") || msg.toLowerCase().includes("denied")) {
          setGpsDeniedPrompt(true);
        }
        dismissGpsPrompt();
      });
    }
  }, [gpsPermission, user, gpsPromptDismissed, hasStoredGps, location]);

  function dismissGpsPrompt() {
    try { localStorage.setItem(GPS_ASKED_KEY, "1"); } catch {}
    setGpsPromptDismissed(true);
  }

  async function handleGpsPromptRequest() {
    setGpsRequesting(true);
    try {
      await gpsRequest();
      dismissGpsPrompt();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("negato") || msg.toLowerCase().includes("denied")) {
        setGpsDeniedPrompt(true);
      }
      dismissGpsPrompt();
    } finally {
      setGpsRequesting(false);
    }
  }

  // ── Voci di navigazione ───────────────────────────────────────────────────
  const navItems = [
    {
      path: "/feed",
      label: t.nav.feed,
      icon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      path: "/map",
      label: t.nav.map,
      icon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      ),
    },
    {
      path: "/post",
      label: t.nav.plant,
      icon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      ),
    },
    {
      path: "/events",
      label: t.nav.events,
      badge: newEventsCount > 0 && !location.startsWith("/events") ? newEventsCount : 0,
      icon: (
        <div className="relative">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round"/>
          </svg>
          {newEventsCount > 0 && !location.startsWith("/events") && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
              {newEventsCount > 9 ? "9+" : newEventsCount}
            </span>
          )}
        </div>
      ),
    },
    {
      path: "/alerts",
      label: t.nav.alerts,
      badge: (newAlertsCount + newNotifsCount) > 0 && !location.startsWith("/alerts") ? (newAlertsCount + newNotifsCount) : 0,
      icon: (
        <div className="relative">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {(newAlertsCount + newNotifsCount) > 0 && !location.startsWith("/alerts") && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
              {(newAlertsCount + newNotifsCount) > 9 ? "9+" : (newAlertsCount + newNotifsCount)}
            </span>
          )}
        </div>
      ),
    },
    {
      path: "/tips",
      label: t.nav.tips,
      badge: newTipsCount > 0 && !location.startsWith("/tips") ? newTipsCount : 0,
      icon: (
        <div className="relative">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {newTipsCount > 0 && !location.startsWith("/tips") && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
              {newTipsCount > 9 ? "9+" : newTipsCount}
            </span>
          )}
        </div>
      ),
    },
    {
      path: "/profile",
      label: t.nav.profile,
      icon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      ),
    },
  ];

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      setLocation("/sign-in");
    } finally {
      setSigningOut(false);
      setShowLogoutModal(false);
    }
  }

  const SettingsIcon = () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Desktop top nav */}
      <header className="hidden md:flex items-center justify-between px-6 py-3 border-b border-border bg-card shadow-sm sticky top-0 z-50">
        <Link href="/feed" className="flex items-center gap-2 font-bold text-primary text-xl">
          <img src="/icon-192.png" alt="TreeShare" width="28" height="28" style={{ borderRadius: "6px", objectFit: "cover" }} />
          TreeShare
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.filter((item) => user || (item.path !== "/alerts" && item.path !== "/profile")).map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.startsWith(item.path)
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {item.label}
              {"badge" in item && (item.badge ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {(item.badge ?? 0) > 9 ? "9+" : item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user && (
            <span className="text-sm text-muted-foreground truncate max-w-[120px]">
              {user?.username || user?.firstName}
            </span>
          )}
          <Link
            href="/adopt"
            title={t.nav.adopt}
            className={`p-2 rounded-lg text-lg leading-none transition-colors ${
              location.startsWith("/adopt") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            🌍
          </Link>
          <Link
            href="/campaigns"
            className={`p-2 rounded-lg transition-colors ${
              location === "/campaigns" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="9" r="6" fill="currentColor" opacity="0.15"/>
              <circle cx="12" cy="9" r="6"/>
              <path d="M12 15V20"/>
              <path d="M9 20h6"/>
            </svg>
          </Link>
          <Link
            href="/co2"
            title={t.nav.co2}
            className={`px-2 py-1 rounded-lg transition-colors text-xs font-bold tracking-tight ${
              location === "/co2" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            CO₂
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              title="Admin"
              className={`p-2 rounded-lg transition-colors ${
                location === "/admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </Link>
          )}
          {user && (
            <>
              <Link
                href="/settings"
                title={t.settings.title}
                className={`p-2 rounded-lg transition-colors ${
                  location === "/settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <SettingsIcon />
              </Link>
              <button
                onClick={() => setShowLogoutModal(true)}
                data-testid="button-signout"
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-lg hover:bg-destructive/10"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round"/>
                  <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round"/>
                </svg>
                {t.auth.signOut}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-50">
        <Link href="/feed" className="flex items-center gap-2 font-bold text-primary text-lg">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <path d="M14 2C14 2 7 8 7 16C7 20.418 10.134 24 14 24C17.866 24 21 20.418 21 16C21 8 14 2 14 2Z" fill="currentColor" opacity="0.2"/>
            <path d="M14 24V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M14 16C14 16 11 13 8 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M14 20C14 20 17 17 20 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          TreeShare
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/adopt"
            title={t.nav.adopt}
            className={`p-2 rounded-lg text-lg leading-none transition-colors ${
              location.startsWith("/adopt") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            🌍
          </Link>
          <Link
            href="/campaigns"
            className={`p-2 rounded-lg transition-colors ${
              location === "/campaigns" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="9" r="6" fill="currentColor" opacity="0.15"/>
              <circle cx="12" cy="9" r="6"/>
              <path d="M12 15V20"/>
              <path d="M9 20h6"/>
            </svg>
          </Link>
          <Link
            href="/co2"
            title={t.nav.co2}
            className={`px-2 py-1 rounded-lg transition-colors text-xs font-bold tracking-tight ${
              location === "/co2" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            CO₂
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              title="Admin"
              className={`p-2 rounded-lg transition-colors ${
                location === "/admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </Link>
          )}
          {user && (
            <>
              <Link
                href="/alerts"
                className={`relative p-2 rounded-lg transition-colors ${
                  location.startsWith("/alerts") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
                title={t.nav.alerts}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {(newAlertsCount + newNotifsCount) > 0 && !location.startsWith("/alerts") && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {(newAlertsCount + newNotifsCount) > 9 ? "9+" : (newAlertsCount + newNotifsCount)}
                  </span>
                )}
              </Link>
              <Link
                href="/settings"
                className={`p-2 rounded-lg transition-colors ${
                  location === "/settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
                title={t.settings.title}
              >
                <SettingsIcon />
              </Link>
              <button
                onClick={() => setShowLogoutModal(true)}
                data-testid="button-signout-mobile"
                title={t.auth.signOut}
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors hover:bg-destructive/10"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round"/>
                  <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav — 6 voci (Avvisi è nella top bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className={user ? "grid grid-cols-6" : "grid grid-cols-5"}>
          {navItems.filter((item) => item.path !== "/alerts" && (user || item.path !== "/profile")).map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center py-2 gap-0.5 text-[9px] font-medium transition-colors ${
                location.startsWith(item.path)
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* GPS permission bottom-sheet */}
      {showGpsPrompt && (
        <div className="fixed inset-x-0 bottom-16 z-[90] md:inset-x-auto md:bottom-auto md:right-4 md:top-auto md:bottom-4 animate-in slide-in-from-bottom duration-300">
          <div className="bg-background border border-border rounded-2xl shadow-2xl p-5 flex flex-col gap-4 mx-3 md:w-80 md:mx-0">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-green-600 dark:text-green-400">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground leading-tight">
                  {lang === "en" ? "Allow location access" : lang === "fr" ? "Autoriser la localisation" : lang === "pt" ? "Permitir localização" : lang === "es" ? "Permitir ubicación" : lang === "ja" ? "位置情報を許可" : "Consenti la posizione"}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                  {lang === "en" ? "TreeShare uses GPS to tag your plants on the world map." : lang === "fr" ? "TreeShare utilise le GPS pour localiser vos plantes sur la carte." : lang === "pt" ? "TreeShare usa GPS para marcar suas plantas no mapa." : lang === "es" ? "TreeShare usa GPS para ubicar tus plantas en el mapa." : lang === "ja" ? "TreeShareはGPSを使って植物を地図にピン留めします。" : "TreeShare usa il GPS per segnare le tue piante sulla mappa mondiale."}
                </p>
              </div>
              <button
                onClick={dismissGpsPrompt}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 -mt-0.5"
                aria-label="Chiudi"
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={dismissGpsPrompt}
                className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                {lang === "en" ? "Not now" : lang === "fr" ? "Pas maintenant" : lang === "pt" ? "Agora não" : lang === "es" ? "Ahora no" : lang === "ja" ? "後で" : "Non ora"}
              </button>
              <button
                onClick={handleGpsPromptRequest}
                disabled={gpsRequesting}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {gpsRequesting ? (
                  <span className="inline-block w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" strokeLinecap="round"/>
                    <circle cx="12" cy="9" r="2.5"/>
                  </svg>
                )}
                {lang === "en" ? "Allow GPS" : lang === "fr" ? "Autoriser GPS" : lang === "pt" ? "Permitir GPS" : lang === "es" ? "Permitir GPS" : lang === "ja" ? "GPS許可" : "Consenti GPS"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GPS denied instructions */}
      {gpsDeniedPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-orange-500">
                  <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-lg leading-tight">
                  {lang === "en" ? "GPS blocked" : "GPS bloccato"}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {lang === "en" ? "Follow these steps to enable location access:" : "Segui questi passaggi per abilitare la posizione:"}
                </p>
              </div>
            </div>
            <ol className="space-y-2">
              {getPlatformInstructions(lang ?? "it").map((step, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-snug">{step.replace(/^\d+\.\s*/, "")}</span>
                </li>
              ))}
            </ol>
            <button
              onClick={() => setGpsDeniedPrompt(false)}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {lang === "en" ? "Got it" : lang === "ja" ? "わかりました" : "Capito"}
            </button>
          </div>
        </div>
      )}

      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-foreground">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round"/>
                  <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-lg">{t.logout.title}</h2>
                <p className="text-muted-foreground text-sm mt-1">{t.logout.desc}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={signingOut}
                className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex-1 py-2.5 bg-foreground text-background rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {signingOut ? t.logout.confirming : t.logout.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
