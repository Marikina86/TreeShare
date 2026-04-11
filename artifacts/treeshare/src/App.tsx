import { useEffect, useRef, useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth, useUser } from "@clerk/react";
import { useGetMyProfile, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { itIT, enUS, frFR, ptBR, esES, jaJP } from "@clerk/localizations";
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
import EventsPage from "@/pages/EventsPage";
import AlertsPage from "@/pages/AlertsPage";
import TipsPage from "@/pages/TipsPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminPage from "@/pages/AdminPage";
import OrganizationSignupPage from "@/pages/OrganizationSignupPage";
import RegisterChoicePage from "@/pages/RegisterChoicePage";
import PrivateSignupPage from "@/pages/PrivateSignupPage";
import SSOCallbackPage from "@/pages/SSOCallbackPage";
import CampaignsPage from "@/pages/CampaignsPage";
import NotFound from "@/pages/not-found";
import InstallPrompt from "@/components/InstallPrompt";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
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
          const name = [user!.firstName, user!.lastName].filter(Boolean).join("_");
          const email = user!.emailAddresses?.[0]?.emailAddress ?? "";
          const raw = user!.username || name || email.split("@")[0] || "user";
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

function SignInPage() {
  const { lang } = useLang();
  const forgotPasswordUrl = `${basePath}/sign-in/forgot-password`;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 gap-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
      <p className="text-sm text-muted-foreground text-center">
        {({ it: "Password dimenticata?", en: "Forgot your password?", fr: "Mot de passe oublié\u00a0?", pt: "Esqueceu a palavra-passe?", es: "¿Olvidaste tu contraseña?", ja: "パスワードを忘れましたか？" } as Record<string,string>)[lang]}{" "}
        <a
          href={forgotPasswordUrl}
          className="font-semibold text-primary hover:underline"
        >
          {({ it: "Recupera password", en: "Reset password", fr: "Réinitialiser", pt: "Recuperar", es: "Recuperar contraseña", ja: "リセットする" } as Record<string,string>)[lang]}
        </a>
      </p>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
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
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
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

function ClerkQueryClientCacheInvalidator() {
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

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const { lang } = useLang();
  const localizationMap = { it: itIT, en: enUS, fr: frFR, pt: ptBR, es: esES, ja: jaJP };
  const localization = localizationMap[lang] ?? enUS;

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      localization={localization}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AuthTokenSync />
        <ProfileAutoSync />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
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
            <Route path="/admin" component={() => <AdminRoute component={AdminPage} />} />
            <Route path="/privacy" component={PrivacyPage} />
            <Route path="/terms" component={TermsPage} />
            <Route path="/register" component={RegisterChoicePage} />
            <Route path="/register-privato" component={PrivateSignupPage} />
            <Route path="/register-ente" component={OrganizationSignupPage} />
            <Route path="/sso-callback" component={SSOCallbackPage} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
          <InstallPrompt />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <LanguageProvider>
        <ClerkProviderWithRoutes />
      </LanguageProvider>
    </WouterRouter>
  );
}

export default App;
