import { lazy, Suspense, useEffect, useRef, useState, Component, type ReactNode, type ErrorInfo } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { SupabaseAuthProvider, useAuth, useUser, useClerk, Show } from "@/lib/auth";
import { useGetMyProfile, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { LanguageProvider } from "@/lib/i18n";
import InstallPrompt from "@/components/InstallPrompt";
import ConsentModal from "@/components/ConsentModal";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const FeedPage = lazy(() => import("@/pages/FeedPage"));
const MapPage = lazy(() => import("@/pages/MapPage"));
const PostPage = lazy(() => import("@/pages/PostPage"));
const TreeDetailPage = lazy(() => import("@/pages/TreeDetailPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const CookiePage = lazy(() => import("@/pages/CookiePage"));
const EventsPage = lazy(() => import("@/pages/EventsPage"));
const AlertsPage = lazy(() => import("@/pages/AlertsPage"));
const TipsPage = lazy(() => import("@/pages/TipsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const OrganizationSignupPage = lazy(() => import("@/pages/OrganizationSignupPage"));
const RegisterChoicePage = lazy(() => import("@/pages/RegisterChoicePage"));
const PrivateSignupPage = lazy(() => import("@/pages/PrivateSignupPage"));
const SignInPage = lazy(() => import("@/pages/SignInPage"));
const CampaignsPage = lazy(() => import("@/pages/CampaignsPage"));
const Co2Page = lazy(() => import("@/pages/Co2Page"));
const AdoptableTreesPage = lazy(() => import("@/pages/AdoptableTreesPage"));
const AdoptableTreeDetailPage = lazy(() => import("@/pages/AdoptableTreeDetailPage"));
const CreateAdoptableTreePage = lazy(() => import("@/pages/CreateAdoptableTreePage"));
const OrgAdoptionsPage = lazy(() => import("@/pages/OrgAdoptionsPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const RegisterEnteActivatePage = lazy(() => import("@/pages/RegisterEnteActivatePage"));
const RegisterPrivatoActivatePage = lazy(() => import("@/pages/RegisterPrivatoActivatePage"));
const NotFound = lazy(() => import("@/pages/not-found"));

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, info.componentStack?.slice(0, 200));
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-6 text-center gap-4">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="text-foreground font-medium">Qualcosa è andato storto</p>
          <p className="text-muted-foreground text-sm max-w-xs">
            Si è verificato un errore imprevisto. Prova a tornare alla home.
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = basePath + "/"; }}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Torna alla home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AuthTokenSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);
  return null;
}

function ProfileAutoSync() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const triedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    if (triedRef.current) return;

    async function sync() {
      triedRef.current = true;
      try {
        const token = await getToken();
        if (!token) { triedRef.current = false; return; }

        const check = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (check.status === 404) {
          const email = user!.emailAddresses?.[0]?.emailAddress ?? "";
          const raw = user!.username || user!.firstName || email.split("@")[0] || "user";
          const username = raw.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 30) || "user";

          await fetch("/api/users/me", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ username, photoUrl: user!.imageUrl || null, city: null, country: null }),
          });

          qc.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        }
      } catch {
        triedRef.current = false;
      }
    }

    sync();
  }, [isLoaded, isSignedIn, user, getToken, qc]);

  return null;
}

function MobileBackButton() {
  const [location, setLocation] = useLocation();
  const locationRef = useRef(location);
  const lastBackAtRef = useRef(0);
  const [showExitHint, setShowExitHint] = useState(false);
  const exitHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    // Ensure there is always one extra history entry so popstate fires on back press
    history.pushState({ appGuard: true }, "");

    const handlePopState = (e: PopStateEvent) => {
      const currentLoc = locationRef.current;

      if (currentLoc !== "/feed") {
        // Block wouter from handling this pop; navigate to feed instead
        e.stopPropagation();
        history.pushState({ appGuard: true }, "");
        setLocation("/feed");
        return;
      }

      // Already at /feed — implement double-press to exit
      const now = Date.now();
      if (now - lastBackAtRef.current < 2000) {
        // Second press within 2s → let the app close naturally
        if (exitHintTimer.current) clearTimeout(exitHintTimer.current);
        setShowExitHint(false);
        return; // don't re-push state, browser will exit PWA
      }

      // First press at /feed → stay, show hint
      e.stopPropagation();
      history.pushState({ appGuard: true }, "");
      lastBackAtRef.current = now;
      setShowExitHint(true);
      if (exitHintTimer.current) clearTimeout(exitHintTimer.current);
      exitHintTimer.current = setTimeout(() => setShowExitHint(false), 2000);
    };

    window.addEventListener("popstate", handlePopState, true);
    return () => {
      window.removeEventListener("popstate", handlePopState, true);
      if (exitHintTimer.current) clearTimeout(exitHintTimer.current);
    };
  }, [setLocation]);

  if (!showExitHint) return null;
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 bg-foreground text-background text-sm rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
      Premi ancora per uscire
    </div>
  );
}

function ConsentChecker() {
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [missing, setMissing] = useState<Array<{
    policyId: string;
    type: string;
    version: string;
    requiresAcceptance: boolean;
    checkboxLabel: string | null;
    consentNote: string | null;
    lastModifiedAt: string | null;
  }>>([]);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (checkedRef.current) return;
    if (sessionStorage.getItem("consent-ok") === "1") return;
    checkedRef.current = true;

    async function checkConsent() {
      try {
        const token = await getToken();
        const res = await fetch("/api/consent/status", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json() as {
          upToDate: boolean;
          missing: Array<{
            policyId: string;
            type: string;
            version: string;
            requiresAcceptance: boolean;
            checkboxLabel: string | null;
            consentNote: string | null;
            lastModifiedAt: string | null;
          }>;
        };
        if (!data.upToDate && data.missing?.length > 0) {
          setMissing(data.missing);
        } else {
          sessionStorage.setItem("consent-ok", "1");
        }
      } catch {
        // Silently fail — non blocchiamo l'utente per un errore di rete
      }
    }

    checkConsent();
  }, [isLoaded, isSignedIn, getToken]);

  if (missing.length === 0) return null;
  return (
    <ConsentModal
      missing={missing}
      onAccepted={() => {
        setMissing([]);
        sessionStorage.setItem("consent-ok", "1");
      }}
    />
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/feed" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [location] = useLocation();
  const next = encodeURIComponent(location);
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to={`/sign-in?next=${next}`} />
      </Show>
    </>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const profile = useGetMyProfile();
  const isAdmin = (profile.data as any)?.isAdmin === true;
  const isLoading = profile.isLoading;
  return (
    <>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
      <Show when="signed-in">
        {isLoading ? null : isAdmin ? <Component /> : <Redirect to="/feed" />}
      </Show>
    </>
  );
}

function QueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function AuthProviderWithRoutes() {
  return (
    <SupabaseAuthProvider>
      <QueryClientProvider client={queryClient}>
        <QueryClientCacheInvalidator />
        <AuthTokenSync />
        <ProfileAutoSync />
        <ConsentChecker />
        <TooltipProvider>
          <MobileBackButton />
          <ErrorBoundary>
          <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-background"><div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" /></div>}>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={() => <Redirect to="/register" />} />
              <Route path="/reset-password" component={ResetPasswordPage} />
              <Route path="/onboarding" component={() => <ProtectedRoute component={OnboardingPage} />} />
              <Route path="/feed" component={() => <ProtectedRoute component={FeedPage} />} />
              <Route path="/map" component={() => <ProtectedRoute component={MapPage} />} />
              <Route path="/post" component={() => <ProtectedRoute component={PostPage} />} />
              <Route path="/tree/:treeId" component={() => <ProtectedRoute component={TreeDetailPage} />} />
              <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
              <Route path="/profile/:userId" component={() => <ProtectedRoute component={ProfilePage} />} />
              <Route path="/events" component={() => <ProtectedRoute component={EventsPage} />} />
              <Route path="/alerts" component={() => <ProtectedRoute component={AlertsPage} />} />
              <Route path="/tips" component={() => <ProtectedRoute component={TipsPage} />} />
              <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
              <Route path="/campaigns" component={CampaignsPage} />
              <Route path="/co2" component={Co2Page} />
              <Route path="/adopt" component={AdoptableTreesPage} />
              <Route path="/adopt/create" component={() => <ProtectedRoute component={CreateAdoptableTreePage} />} />
              <Route path="/adopt/manage" component={() => <ProtectedRoute component={OrgAdoptionsPage} />} />
              <Route path="/adopt/:id" component={AdoptableTreeDetailPage} />
              <Route path="/admin" component={() => <AdminRoute component={AdminPage} />} />
              <Route path="/privacy" component={PrivacyPage} />
              <Route path="/terms" component={TermsPage} />
              <Route path="/cookies" component={CookiePage} />
              <Route path="/register" component={RegisterChoicePage} />
              <Route path="/register-privato" component={PrivateSignupPage} />
              <Route path="/register-privato/activate" component={RegisterPrivatoActivatePage} />
              <Route path="/register-ente" component={OrganizationSignupPage} />
              <Route path="/register-ente/activate" component={RegisterEnteActivatePage} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
          </ErrorBoundary>
          <Toaster />
          <InstallPrompt />
        </TooltipProvider>
      </QueryClientProvider>
    </SupabaseAuthProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <LanguageProvider>
        <AuthProviderWithRoutes />
      </LanguageProvider>
    </WouterRouter>
  );
}

export default App;
