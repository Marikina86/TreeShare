import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk, useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useLang, type Lang } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useGetMyProfile } from "@workspace/api-client-react";
import { useGps, getPlatformInstructions } from "@/hooks/useGps";
import DonationCampaignManager from "@/components/DonationCampaignManager";

type MyAdoption = {
  id: number;
  treeId: number;
  treeName: string;
  startDate: string;
  endDate: string;
  adoptionCode: string | null;
  status: string;
  amountCents: number;
  durationDays: number;
};

export default function SettingsPage() {
  const { lang, setLang, t } = useLang();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myProfile } = useGetMyProfile();
  const isAdmin = (myProfile as any)?.isAdmin === true;
  const isOrg = (myProfile as any)?.accountType === "organization";

  const [pendingPhotoCount, setPendingPhotoCount] = useState(0);
  const [pendingProblemCount, setPendingProblemCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    getToken().then((token) => {
      if (!token) return;
      const h = { Authorization: `Bearer ${token}` };
      Promise.all([
        fetch("/api/admin/trees/pending", { headers: h }).then((r) => r.ok ? r.json() : []),
        fetch("/api/admin/problem-reports", { headers: h }).then((r) => r.ok ? r.json() : []),
      ]).then(([photos, problems]: [unknown[], {status: string}[]]) => {
        setPendingPhotoCount(photos.length);
        setPendingProblemCount(problems.filter((p) => p.status === "new").length);
      }).catch(() => {});
    });
  }, [isAdmin]);

  useEffect(() => {
    setAdoptionsLoading(true);
    getToken().then((token) => {
      const h: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      fetch("/api/adopt/my-adoptions", { headers: h })
        .then((r) => r.ok ? r.json() : [])
        .then((data: MyAdoption[]) => setMyAdoptions(data))
        .catch(() => setMyAdoptions([]))
        .finally(() => setAdoptionsLoading(false));
    });
  }, []);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Cambia password ────────────────────────────────────────────────────────
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  const [myAdoptions, setMyAdoptions] = useState<MyAdoption[]>([]);
  const [adoptionsLoading, setAdoptionsLoading] = useState(true);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);

    const L = (it: string, en: string) => lang === "it" ? it : en;

    if (pwNew.length < 8) {
      setPwError(L("La nuova password deve avere almeno 8 caratteri.", "New password must be at least 8 characters."));
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError(L("Le password non corrispondono.", "Passwords do not match."));
      return;
    }

    setPwLoading(true);
    try {
      await user?.updatePassword({ currentPassword: pwCurrent, newPassword: pwNew });
      toast({ title: L("✅ Password aggiornata con successo!", "✅ Password updated successfully!") });
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      setShowPasswordForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("incorrect") || msg.includes("wrong")) {
        setPwError(L("Password attuale non corretta.", "Current password is incorrect."));
      } else {
        setPwError(msg || L("Errore durante il cambio password.", "Error changing password."));
      }
    } finally {
      setPwLoading(false);
    }
  }

  const { permission, position, loading: gpsLoading, requestPosition, clearPosition } = useGps();
  const [gpsTestResult, setGpsTestResult] = useState<string | null>(null);
  const [showGpsInstructions, setShowGpsInstructions] = useState(false);
  const [gpsEnabling, setGpsEnabling] = useState(false);

  const isPwa = typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true);

  function getBrowserSettingsUrl(): string | null {
    const ua = navigator.userAgent.toLowerCase();
    if (/firefox/.test(ua)) return "about:preferences#privacy";
    if (/edg\//.test(ua)) return "edge://settings/content/location";
    if (/chrome/.test(ua) && !/android/.test(ua)) return "chrome://settings/content/location";
    return null;
  }

  async function handleEnableGps() {
    setGpsEnabling(true);
    setGpsTestResult(null);
    try {
      const pos = await requestPosition();
      setGpsTestResult(`✅ ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} (±${Math.round(pos.accuracy)}m)`);
    } catch {
    } finally {
      setGpsEnabling(false);
    }
  }

  async function handleTestGps() {
    setGpsTestResult(null);
    try {
      const pos = await requestPosition();
      setGpsTestResult(
        `✅ GPS funzionante — ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} (±${Math.round(pos.accuracy)}m)`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("negato")) {
        setShowGpsInstructions(true);
        setGpsTestResult(null);
      } else {
        setGpsTestResult(`❌ ${msg || "Errore GPS"}`);
      }
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
      setShowLogoutModal(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/users/me/delete", {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok && res.status !== 204) throw new Error("Failed");
      queryClient.clear();
      await signOut();
      setLocation("/");
      toast({ title: t.profile.deleteModal.title });
    } catch {
      toast({
        title: t.common.error,
        description: ({ it: "Impossibile eliminare l'account.", en: "Could not delete account.", fr: "Impossible de supprimer le compte.", pt: "Não foi possível excluir a conta.", es: "No se pudo eliminar la cuenta.", ja: "アカウントを削除できませんでした。" } as Record<string, string>)[lang],
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  const languages: { value: Lang; label: string; flag: string }[] = [
    { value: "it", label: "Italiano", flag: "🇮🇹" },
    { value: "en", label: "English", flag: "🇬🇧" },
    { value: "fr", label: "Français", flag: "🇫🇷" },
    { value: "pt", label: "Português", flag: "🇧🇷" },
    { value: "es", label: "Español", flag: "🇪🇸" },
    { value: "ja", label: "日本語", flag: "🇯🇵" },
  ];

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 py-6">
        <button
          onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/profile")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t.common.back}
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-8">{t.settings.title}</h1>

        {/* Language section */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t.settings.language}
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <p className="text-sm text-muted-foreground px-5 pt-4 pb-3">{t.settings.languageDesc}</p>
            <div className="grid grid-cols-2 gap-0 border-t border-border">
              {languages.map((lng) => (
                <button
                  key={lng.value}
                  onClick={() => setLang(lng.value)}
                  className={`flex items-center justify-center gap-2.5 py-4 text-sm font-semibold transition-colors ${
                    lang === lng.value
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  } ${lng.value === "it" ? "border-r border-border" : ""}`}
                >
                  <span className="text-lg">{lng.flag}</span>
                  {lng.label}
                  {lang === lng.value && (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* GPS section */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {({ it: "GPS e Posizione", en: "GPS & Location", fr: "GPS et Position", pt: "GPS e Localização", es: "GPS y Ubicación", ja: "GPSと位置情報" } as Record<string,string>)[lang]}
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">

            {/* Permission status row */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  permission === "granted" ? "bg-green-100" :
                  permission === "denied"  ? "bg-red-100" :
                  permission === "unsupported" ? "bg-gray-100" : "bg-yellow-100"
                }`}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={
                    permission === "granted" ? "text-green-600" :
                    permission === "denied"  ? "text-red-500" :
                    permission === "unsupported" ? "text-gray-400" : "text-yellow-500"
                  }>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {({ it: "Permesso GPS", en: "GPS Permission", fr: "Permission GPS", pt: "Permissão GPS", es: "Permiso GPS", ja: "GPS許可" } as Record<string,string>)[lang]}
                  </p>
                  <p className={`text-xs font-semibold mt-0.5 ${
                    permission === "granted" ? "text-green-600" :
                    permission === "denied"  ? "text-red-500" :
                    permission === "unsupported" ? "text-muted-foreground" : "text-yellow-600"
                  }`}>
                    {permission === "granted"     ? ({ it: "✅ Autorizzato", en: "✅ Authorized", fr: "✅ Autorisé", pt: "✅ Autorizado", es: "✅ Autorizado", ja: "✅ 許可済み" } as Record<string,string>)[lang] :
                     permission === "denied"      ? ({ it: "❌ Negato", en: "❌ Denied", fr: "❌ Refusé", pt: "❌ Negado", es: "❌ Denegado", ja: "❌ 拒否" } as Record<string,string>)[lang] :
                     permission === "unsupported" ? ({ it: "⚠️ Non supportato", en: "⚠️ Not supported", fr: "⚠️ Non supporté", pt: "⚠️ Não suportado", es: "⚠️ No soportado", ja: "⚠️ 非対応" } as Record<string,string>)[lang] :
                     permission === "checking"    ? ({ it: "Verifica...", en: "Checking...", fr: "Vérification...", pt: "Verificando...", es: "Verificando...", ja: "確認中..." } as Record<string,string>)[lang] :
                                                    ({ it: "⚪ Da richiedere", en: "⚪ Not requested", fr: "⚪ À demander", pt: "⚪ A pedir", es: "⚪ Por solicitar", ja: "⚪ 未リクエスト" } as Record<string,string>)[lang]}
                  </p>
                </div>
              </div>
            </div>

            {/* Last known position */}
            {position && (
              <div className="px-5 py-3 bg-green-50/50">
                <p className="text-xs text-muted-foreground font-medium mb-1">
                  {({ it: "Ultima posizione rilevata", en: "Last detected position", fr: "Dernière position détectée", pt: "Última posição detetada", es: "Última posición detectada", ja: "最後に検出した位置" } as Record<string,string>)[lang]}
                </p>
                <p className="text-sm font-mono text-foreground">{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">±{Math.round(position.accuracy)}m · {new Date(position.timestamp).toLocaleString()}</p>
                <button onClick={clearPosition} className="text-xs text-red-500 hover:underline mt-1">
                  {({ it: "Cancella dati posizione", en: "Clear position data", fr: "Effacer les données de position", pt: "Limpar dados de posição", es: "Borrar datos de posición", ja: "位置データを削除" } as Record<string,string>)[lang]}
                </button>
              </div>
            )}

            {/* Enable GPS button — shown when not yet requested */}
            {(permission === "prompt" || permission === "checking") && (
              <div className="px-5 py-4">
                <p className="text-xs text-muted-foreground mb-3">
                  {({ it: "Il GPS non è ancora stato attivato per questa app. Premi il pulsante per abilitarlo direttamente dal browser.", en: "GPS has not been enabled for this app yet. Press the button to enable it directly from the browser.", fr: "Le GPS n'a pas encore été activé pour cette application. Appuyez sur le bouton pour l'activer depuis le navigateur.", pt: "O GPS ainda não foi ativado para esta app. Prima o botão para o ativar diretamente no browser.", es: "El GPS aún no ha sido habilitado para esta app. Pulsa el botón para activarlo directamente desde el navegador.", ja: "このアプリではまだGPSが有効になっていません。ボタンを押してブラウザから直接有効にしてください。" } as Record<string,string>)[lang]}
                </p>
                <button
                  onClick={handleEnableGps}
                  disabled={gpsEnabling}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {gpsEnabling ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                    </svg>
                  )}
                  {({ it: "Abilita GPS ora", en: "Enable GPS now", fr: "Activer le GPS maintenant", pt: "Ativar GPS agora", es: "Activar GPS ahora", ja: "今すぐGPSを有効化" } as Record<string,string>)[lang]}
                </button>
                {gpsTestResult && (
                  <p className="text-xs text-green-600 font-medium mt-2 text-center">{gpsTestResult}</p>
                )}
              </div>
            )}

            {/* Test GPS button — shown only when granted */}
            {permission === "granted" && (
              <button
                onClick={handleTestGps}
                disabled={gpsLoading}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors text-left disabled:opacity-60"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {({ it: "Testa GPS ora", en: "Test GPS now", fr: "Tester le GPS maintenant", pt: "Testar GPS agora", es: "Probar GPS ahora", ja: "今すぐGPSをテスト" } as Record<string,string>)[lang]}
                  </p>
                  {gpsTestResult ? (
                    <p className="text-xs mt-0.5 text-muted-foreground">{gpsTestResult}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {({ it: "Verifica che il GPS funzioni correttamente", en: "Check that GPS works correctly", fr: "Vérifiez que le GPS fonctionne correctement", pt: "Verifique se o GPS funciona corretamente", es: "Comprueba que el GPS funciona correctamente", ja: "GPSが正常に動作するか確認" } as Record<string,string>)[lang]}
                    </p>
                  )}
                </div>
                {gpsLoading ? (
                  <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full flex-shrink-0" />
                ) : (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-muted-foreground flex-shrink-0">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )}

            {/* If denied — instructions + browser settings link */}
            {permission === "denied" && (
              <div className="px-5 py-4 space-y-3">
                {/* Open in browser to change permission from address bar */}
                <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-orange-500 flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01" strokeLinecap="round"/>
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-orange-700 mb-0.5">
                      {({ it: "GPS bloccato dal browser", en: "GPS blocked by browser", fr: "GPS bloqué par le navigateur", pt: "GPS bloqueado pelo browser", es: "GPS bloqueado por el navegador", ja: "ブラウザによってGPSがブロックされています" } as Record<string,string>)[lang]}
                    </p>
                    <p className="text-xs text-orange-600 leading-snug">
                      {({ it: "Per sbloccare, clicca l'icona 🔒 nella barra degli indirizzi → Posizione → Consenti.", en: "To unblock, click the 🔒 icon in the address bar → Location → Allow.", fr: "Pour débloquer, cliquez sur l'icône 🔒 dans la barre d'adresse → Position → Autoriser.", pt: "Para desbloquear, clique no ícone 🔒 na barra de endereços → Localização → Permitir.", es: "Para desbloquear, haz clic en el icono 🔒 en la barra de direcciones → Ubicación → Permitir.", ja: "ブロックを解除するには、アドレスバーの🔒アイコン → 位置情報 → 許可 をクリックしてください。" } as Record<string,string>)[lang]}
                    </p>
                    {getBrowserSettingsUrl() && (
                      <a
                        href={getBrowserSettingsUrl()!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 hover:underline mt-1.5"
                      >
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {({ it: "Apri impostazioni posizione browser", en: "Open browser location settings", fr: "Ouvrir les paramètres de localisation", pt: "Abrir definições de localização do browser", es: "Abrir ajustes de ubicación del navegador", ja: "ブラウザの位置情報設定を開く" } as Record<string,string>)[lang]}
                      </a>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setShowGpsInstructions((v) => !v)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {({ it: "Istruzioni passo per passo", en: "Step-by-step instructions", fr: "Instructions étape par étape", pt: "Instruções passo a passo", es: "Instrucciones paso a paso", ja: "ステップごとの手順" } as Record<string,string>)[lang]}
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showGpsInstructions ? "rotate-90" : ""}`}>
                    <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {showGpsInstructions && (
                  <ol className="space-y-2">
                    {getPlatformInstructions(lang).map((step, i) => (
                      <li key={i} className="flex gap-2 text-sm text-foreground">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs font-semibold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-snug">{step.replace(/^\d+\.\s*/, "")}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Profile section */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t.settings.profile}
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <Link
              href="/onboarding"
              className="flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{t.settings.editProfile}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.settings.editProfileDesc}</p>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link
              href="/profile"
              className="flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{({ it: "Visualizza profilo", en: "View profile", fr: "Voir le profil", pt: "Ver perfil", es: "Ver perfil", ja: "プロフィールを見る" } as Record<string,string>)[lang]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">@{user?.username || user?.firstName}</p>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>

            {/* Cambia password — toggle row */}
            <button
              type="button"
              onClick={() => { setShowPasswordForm((v) => !v); setPwError(null); }}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {({ it: "Cambia password", en: "Change password", fr: "Changer le mot de passe", pt: "Alterar palavra-passe", es: "Cambiar contraseña", ja: "パスワードを変更" } as Record<string,string>)[lang]}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {({ it: "Aggiorna la tua password di accesso", en: "Update your login password", fr: "Mettez à jour votre mot de passe", pt: "Atualize a sua palavra-passe de acesso", es: "Actualiza tu contraseña de acceso", ja: "ログインパスワードを更新する" } as Record<string,string>)[lang]}
                </p>
              </div>
              <svg
                width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                className={`text-muted-foreground flex-shrink-0 transition-transform ${showPasswordForm ? "rotate-90" : ""}`}
              >
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Form espanso */}
            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="px-5 pb-5 pt-1 space-y-3 border-t border-border bg-muted/30">
                {/* Password attuale */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {({ it: "Password attuale", en: "Current password", fr: "Mot de passe actuel", pt: "Palavra-passe atual", es: "Contraseña actual", ja: "現在のパスワード" } as Record<string,string>)[lang]}
                  </label>
                  <div className="relative">
                    <input
                      type={showPwCurrent ? "text" : "password"}
                      value={pwCurrent}
                      onChange={(e) => setPwCurrent(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="w-full px-3 py-2.5 pr-10 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwCurrent((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPwCurrent
                        ? <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/></svg>
                        : <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                {/* Nuova password */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {({ it: "Nuova password", en: "New password", fr: "Nouveau mot de passe", pt: "Nova palavra-passe", es: "Nueva contraseña", ja: "新しいパスワード" } as Record<string,string>)[lang]}
                    <span className="text-muted-foreground/60 font-normal ml-1">(min. 8)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPwNew ? "text" : "password"}
                      value={pwNew}
                      onChange={(e) => setPwNew(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full px-3 py-2.5 pr-10 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwNew((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPwNew
                        ? <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/></svg>
                        : <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                  {/* Indicatore forza password */}
                  {pwNew.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {[1,2,3,4].map((lvl) => {
                        const strength = pwNew.length >= 12 && /[A-Z]/.test(pwNew) && /[0-9]/.test(pwNew) && /[^A-Za-z0-9]/.test(pwNew) ? 4
                          : pwNew.length >= 10 && (/[A-Z]/.test(pwNew) || /[0-9]/.test(pwNew)) ? 3
                          : pwNew.length >= 8 ? 2
                          : 1;
                        return (
                          <div key={lvl} className={`h-1 flex-1 rounded-full transition-colors ${lvl <= strength
                            ? strength === 1 ? "bg-red-400"
                            : strength === 2 ? "bg-yellow-400"
                            : strength === 3 ? "bg-blue-400"
                            : "bg-green-500"
                            : "bg-border"}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Conferma nuova password */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {({ it: "Conferma nuova password", en: "Confirm new password", fr: "Confirmer le nouveau mot de passe", pt: "Confirmar nova palavra-passe", es: "Confirmar nueva contraseña", ja: "新しいパスワードを確認" } as Record<string,string>)[lang]}
                  </label>
                  <div className="relative">
                    <input
                      type={showPwConfirm ? "text" : "password"}
                      value={pwConfirm}
                      onChange={(e) => setPwConfirm(e.target.value)}
                      required
                      autoComplete="new-password"
                      className={`w-full px-3 py-2.5 pr-10 text-sm bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        pwConfirm.length > 0 && pwConfirm !== pwNew ? "border-destructive" : "border-border"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPwConfirm
                        ? <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/></svg>
                        : <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                  {pwConfirm.length > 0 && pwConfirm !== pwNew && (
                    <p className="text-xs text-destructive">
                      {({ it: "Le password non corrispondono", en: "Passwords do not match", fr: "Les mots de passe ne correspondent pas", pt: "As palavras-passe não coincidem", es: "Las contraseñas no coinciden", ja: "パスワードが一致しません" } as Record<string,string>)[lang]}
                    </p>
                  )}
                </div>

                {/* Messaggio di errore */}
                {pwError && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-destructive flex-shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
                    </svg>
                    <p className="text-xs text-destructive leading-snug">{pwError}</p>
                  </div>
                )}

                {/* Pulsanti azione */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowPasswordForm(false); setPwError(null); setPwCurrent(""); setPwNew(""); setPwConfirm(""); }}
                    disabled={pwLoading}
                    className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {({ it: "Annulla", en: "Cancel", fr: "Annuler", pt: "Cancelar", es: "Cancelar", ja: "キャンセル" } as Record<string,string>)[lang]}
                  </button>
                  <button
                    type="submit"
                    disabled={pwLoading || !pwCurrent || !pwNew || !pwConfirm || pwNew !== pwConfirm}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {pwLoading
                      ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{({ it: "Salvataggio...", en: "Saving...", fr: "Sauvegarde...", pt: "A guardar...", es: "Guardando...", ja: "保存中..." } as Record<string,string>)[lang]}</>
                      : ({ it: "Aggiorna password", en: "Update password", fr: "Mettre à jour", pt: "Atualizar", es: "Actualizar", ja: "更新" } as Record<string,string>)[lang]
                    }
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* Admin panel — only visible to admins */}
        {isAdmin && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {({ it: "Amministrazione", en: "Administration", fr: "Administration", pt: "Administração", es: "Administración", ja: "管理" } as Record<string,string>)[lang]}
            </h2>
            <div className="bg-card border border-primary/30 rounded-2xl overflow-hidden">
              <Link
                href="/admin"
                className="flex items-center justify-between px-5 py-4 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-primary">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-primary">
                        {({ it: "Pannello di controllo", en: "Admin Panel", fr: "Panneau d'administration", pt: "Painel de controlo", es: "Panel de control", ja: "管理パネル" } as Record<string,string>)[lang]}
                      </p>
                      {(pendingPhotoCount + pendingProblemCount) > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                          {(pendingPhotoCount + pendingProblemCount) > 99 ? "99+" : (pendingPhotoCount + pendingProblemCount)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pendingPhotoCount > 0 && pendingProblemCount > 0
                        ? (lang === "it" ? `${pendingPhotoCount} foto · ${pendingProblemCount} segnalazioni in attesa` : `${pendingPhotoCount} photo${pendingPhotoCount > 1 ? "s" : ""} · ${pendingProblemCount} report${pendingProblemCount > 1 ? "s" : ""} pending`)
                        : pendingPhotoCount > 0
                          ? (lang === "it" ? `${pendingPhotoCount} foto in attesa di revisione` : `${pendingPhotoCount} photo${pendingPhotoCount > 1 ? "s" : ""} pending review`)
                          : pendingProblemCount > 0
                            ? (lang === "it" ? `${pendingProblemCount} segnalazioni problema in attesa` : `${pendingProblemCount} problem report${pendingProblemCount > 1 ? "s" : ""} pending`)
                            : (({ it: "Gestisci utenti, blocchi e contenuti", en: "Manage users, blocks and content", fr: "Gérer les utilisateurs, blocages et contenus", pt: "Gerir utilizadores, bloqueios e conteúdos", es: "Gestionar usuarios, bloqueos y contenidos", ja: "ユーザー、ブロック、コンテンツを管理" } as Record<string,string>)[lang])}
                    </p>
                  </div>
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-primary flex-shrink-0">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </section>
        )}

        <DonationCampaignManager
          accountType={(myProfile as any)?.accountType ?? "user"}
        />

        {/* Le tue adozioni / Adozioni attive */}
        {isOrg ? (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {lang === "it" ? "Adozioni attive" : "Active adoptions"}
            </h2>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <Link
                href="/adopt/manage"
                className="flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-green-700 dark:text-green-400">
                      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {lang === "it" ? "Gestisci le adozioni ricevute" : "Manage received adoptions"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lang === "it" ? "Visualizza e aggiorna le adozioni attive dei tuoi alberi" : "View and update active adoptions of your trees"}
                    </p>
                  </div>
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-muted-foreground flex-shrink-0">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </section>
        ) : (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {lang === "it" ? "Le tue adozioni" : "Your adoptions"}
            </h2>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {adoptionsLoading ? (
                <div className="px-5 py-6 flex items-center justify-center">
                  <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : myAdoptions.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {lang === "it" ? "Non hai ancora adottato nessun albero." : "You haven't adopted any trees yet."}
                  </p>
                  <Link
                    href="/adopt"
                    className="inline-block mt-3 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    {lang === "it" ? "Esplora alberi adottabili" : "Explore adoptable trees"}
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {myAdoptions.map((a) => {
                    const isActive = a.status === "active" && new Date(a.endDate) > new Date();
                    return (
                      <li key={a.id}>
                        <Link
                          href={`/adopt/${a.treeId}`}
                          className="flex items-start gap-3 px-5 py-4 hover:bg-muted transition-colors"
                        >
                          <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${isActive ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{a.treeName}</p>
                            {a.adoptionCode && (
                              <p className="text-xs font-mono text-muted-foreground mt-0.5">{a.adoptionCode}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {lang === "it" ? "Scade" : "Expires"}: {new Date(a.endDate).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
                            isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {isActive
                              ? (lang === "it" ? "Attiva" : "Active")
                              : (lang === "it" ? "Scaduta" : "Expired")}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* Account section */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t.settings.account}
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{t.settings.signOut}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.settings.signOutDesc}</p>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round"/>
                <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-destructive/5 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-destructive">{t.settings.deleteAccount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.settings.deleteAccountDesc}</p>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-destructive">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </section>

        {/* Open in browser */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {({ it: "Browser", en: "Browser", fr: "Navigateur", pt: "Navegador", es: "Navegador", ja: "ブラウザ" } as Record<string,string>)[lang]}
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <a
              href={typeof window !== "undefined" ? window.location.href : "/"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {({ it: "Apri nel browser", en: "Open in browser", fr: "Ouvrir dans le navigateur", pt: "Abrir no navegador", es: "Abrir en el navegador", ja: "ブラウザで開く" } as Record<string,string>)[lang]}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {({ it: "Utile per gestire i permessi GPS dalla barra degli indirizzi 🔒", en: "Useful for managing GPS permissions from the address bar 🔒", fr: "Utile pour gérer les autorisations GPS depuis la barre d'adresse 🔒", pt: "Útil para gerir permissões GPS a partir da barra de endereços 🔒", es: "Útil para gestionar permisos GPS desde la barra de direcciones 🔒", ja: "アドレスバー🔒からGPS権限を管理するのに便利" } as Record<string,string>)[lang]}
                  </p>
                </div>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-muted-foreground flex-shrink-0">
                <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            {isPwa && (
              <div className="px-5 py-3 border-t border-border bg-blue-50/50">
                <p className="text-xs text-blue-700 flex items-center gap-1.5">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01" strokeLinecap="round"/>
                  </svg>
                  {({ it: "Stai usando TreeShare come app installata. Aprila nel browser per modificare i permessi di posizione.", en: "You're using TreeShare as an installed app. Open it in the browser to change location permissions.", fr: "Vous utilisez TreeShare comme application installée. Ouvrez-la dans le navigateur pour modifier les autorisations.", pt: "Está a usar o TreeShare como app instalada. Abra-o no browser para alterar as permissões de localização.", es: "Estás usando TreeShare como app instalada. Ábrela en el navegador para cambiar los permisos de ubicación.", ja: "インストール済みアプリとしてTreeShareを使用しています。ブラウザで開いて位置情報の権限を変更してください。" } as Record<string,string>)[lang]}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Legal links */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {({ it: "Legale", en: "Legal", fr: "Légal", pt: "Legal", es: "Legal", ja: "法的情報" } as Record<string,string>)[lang]}
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <Link
              href="/privacy"
              className="flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Privacy Policy</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {({ it: "Come trattiamo i tuoi dati", en: "How we handle your data", fr: "Comment nous traitons vos données", pt: "Como tratamos os seus dados", es: "Cómo tratamos tus datos", ja: "データの取り扱いについて" } as Record<string,string>)[lang]}
                  </p>
                </div>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link
              href="/terms"
              className="flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round"/>
                    <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {({ it: "Termini e condizioni d'uso", en: "Terms and Conditions", fr: "Conditions d'utilisation", pt: "Termos e Condições", es: "Términos y Condiciones", ja: "利用規約" } as Record<string,string>)[lang]}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {({ it: "Regole di utilizzo del servizio", en: "Rules for using the service", fr: "Règles d'utilisation du service", pt: "Regras de utilização do serviço", es: "Reglas de uso del servicio", ja: "サービスの利用規則" } as Record<string,string>)[lang]}
                  </p>
                </div>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link
              href="/cookies"
              className="flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                    <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="8" cy="9" r="1" fill="currentColor" stroke="none"/>
                    <circle cx="14" cy="7" r="1" fill="currentColor" stroke="none"/>
                    <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none"/>
                    <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Cookie Policy</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {({ it: "Gestione dei cookie e tecnologie simili", en: "Cookie and tracking technologies", fr: "Gestion des cookies et technologies similaires", pt: "Gestão de cookies e tecnologias similares", es: "Gestión de cookies y tecnologías similares", ja: "クッキーとトラッキング技術の管理" } as Record<string,string>)[lang]}
                  </p>
                </div>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </section>

        {/* App info */}
        <p className="text-center text-xs text-muted-foreground">
          TreeShare · {({ it: "Versione", en: "Version", fr: "Version", pt: "Versão", es: "Versión", ja: "バージョン" } as Record<string,string>)[lang]} 1.0
        </p>

        <div className="flex flex-col items-center gap-1 mt-1">
          <a
            href="http://treeshareapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            treeshareapp.com
          </a>
          <a
            href="mailto:treeshare@treeshareapp.com"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            treeshare@treeshareapp.com
          </a>
        </div>
      </div>

      {/* Logout modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
              <button onClick={() => setShowLogoutModal(false)} disabled={signingOut}
                className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
                {t.common.cancel}
              </button>
              <button onClick={handleSignOut} disabled={signingOut}
                className="flex-1 py-2.5 bg-foreground text-background rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50">
                {signingOut ? t.logout.confirming : t.logout.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-destructive">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-lg">{t.profile.deleteModal.title}</h2>
                <p className="text-muted-foreground text-sm mt-1">{t.profile.deleteModal.desc}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting}
                className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
                {t.common.cancel}
              </button>
              <button onClick={handleDeleteAccount} disabled={deleting}
                className="flex-1 py-2.5 bg-destructive text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {deleting ? t.profile.deleteModal.deleting : t.profile.deleteModal.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
