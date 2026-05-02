import { useEffect, useRef, useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { SupabaseAuthProvider, useAuth, useUser, useClerk, Show } from "@/lib/auth";
import { useGetMyProfile, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { LanguageProvider, useLang } from "@/lib/i18n";
import LandingPage from "@/pages/LandingPage";
import FeedPage from "@/pages/FeedPage";
import MapPage from "@/pages/MapPage";
import PostPage from "@/pages/PostPage";
import TreeDetailPage from "@/pages/TreeDetailPage";
import ProfilePage from "@/pages/ProfilePage";
import OnboardingPage from "@/pages/OnboardingPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import CookiePage from "@/pages/CookiePage";
import EventsPage from "@/pages/EventsPage";
import AlertsPage from "@/pages/AlertsPage";
import TipsPage from "@/pages/TipsPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminPage from "@/pages/AdminPage";
import OrganizationSignupPage from "@/pages/OrganizationSignupPage";
import RegisterChoicePage from "@/pages/RegisterChoicePage";
import PrivateSignupPage from "@/pages/PrivateSignupPage";
import SignInPage from "@/pages/SignInPage";
import CampaignsPage from "@/pages/CampaignsPage";
import Co2Page from "@/pages/Co2Page";
import AdoptableTreesPage from "@/pages/AdoptableTreesPage";
import AdoptableTreeDetailPage from "@/pages/AdoptableTreeDetailPage";
import CreateAdoptableTreePage from "@/pages/CreateAdoptableTreePage";
import OrgAdoptionsPage from "@/pages/OrgAdoptionsPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import RegisterEnteActivatePage from "@/pages/RegisterEnteActivatePage";
import RegisterPrivatoActivatePage from "@/pages/RegisterPrivatoActivatePage";
import NotFound from "@/pages/not-found";
import InstallPrompt from "@/components/InstallPrompt";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

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
        <TooltipProvider>
          <MobileBackButton />
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
