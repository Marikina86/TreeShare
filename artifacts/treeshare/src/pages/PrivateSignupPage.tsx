import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useAuth } from "@clerk/react";
import { ArrowLeft, User, Eye, EyeOff, Leaf, AlertCircle, CheckCircle2 } from "lucide-react";
import { useLang } from "@/lib/i18n";
import CityAutocomplete from "@/components/CityAutocomplete";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-destructive mt-1">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {message}
    </p>
  );
}

function getPasswordStrength(pw: string) {
  if (!pw) return { score: 0, label: "", color: "bg-muted" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: 20, label: "Debole", color: "bg-red-500" };
  if (s === 2) return { score: 40, label: "Bassa", color: "bg-orange-400" };
  if (s === 3) return { score: 60, label: "Media", color: "bg-yellow-400" };
  if (s === 4) return { score: 80, label: "Forte", color: "bg-lime-500" };
  return { score: 100, label: "Ottima", color: "bg-green-500" };
}

export default function PrivateSignupPage() {
  const clerk = useClerk();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const { lang } = useLang();

  const [step, setStep] = useState<"form" | "verify" | "done">("form");
  const [profileSaved, setProfileSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const [fields, setFields] = useState({
    nome: "",
    cognome: "",
    citta: "",
    provincia: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (serverError && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [serverError]);

  const strength = getPasswordStrength(fields.password);

  function set(k: keyof typeof fields, v: string) {
    setFields((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!fields.nome.trim()) e.nome = "Nome obbligatorio";
    if (!fields.cognome.trim()) e.cognome = "Cognome obbligatorio";
    if (!fields.citta.trim()) e.citta = "Città obbligatoria";
    if (!fields.email.trim() || !/^\S+@\S+\.\S+$/.test(fields.email))
      e.email = "Email non valida";
    if (fields.password.length < 8) e.password = "Password minimo 8 caratteri";
    if (!fields.confirmPassword) e.confirmPassword = "Ripeti la password";
    else if (fields.confirmPassword !== fields.password) e.confirmPassword = "Le password non coincidono";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // Access the classic Clerk SignUpResource via clerk.client.signUp
  // This is compatible with Clerk React v6 which changed useSignUp() to return SignUpFutureResource
  function getSignUp() {
    return (clerk as any).client?.signUp ?? null;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    const signUp = getSignUp();
    if (!signUp) {
      setServerError("Servizio di autenticazione non disponibile. Ricarica la pagina.");
      return;
    }

    setSubmitting(true);
    setServerError(null);
    console.log("[PrivateSignup] handleSubmit — email:", fields.email.trim());

    try {
      const result = await signUp.create({
        emailAddress: fields.email.trim(),
        password: fields.password,
      });
      console.log("[PrivateSignup] signUp.create status:", result.status);

      if (result.status === "complete") {
        await clerk.setActive!({ session: result.createdSessionId! });
        const saved = await saveCity();
        setProfileSaved(saved);
        setStep("done");
      } else {
        const unverified = result.unverifiedFields ?? [];
        if (unverified.includes("email_address") || result.status === "missing_requirements") {
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setStep("verify");
        } else if (result.missingFields?.length) {
          setServerError("Campi mancanti: " + result.missingFields.join(", "));
        } else {
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setStep("verify");
        }
      }
    } catch (err: any) {
      console.error("[PrivateSignup] handleSubmit error:", err);
      const code = err?.errors?.[0]?.code ?? "";
      let msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Errore durante la registrazione. Riprova.";
      if (code === "form_identifier_exists") {
        msg = "Questa email è già registrata. Accedi con le tue credenziali o recupera la password.";
      } else if (code === "form_password_pwned") {
        msg = "La password è stata compromessa in un data breach. Scegli una password diversa.";
      } else if (code === "form_password_length_too_short") {
        msg = "La password è troppo corta. Usa almeno 8 caratteri.";
      } else if (code === "too_many_requests") {
        msg = "Troppi tentativi. Attendi qualche minuto e riprova.";
      }
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(ev: React.FormEvent) {
    ev.preventDefault();
    const signUp = getSignUp();
    if (!signUp) return;

    setSubmitting(true);
    setOtpError(null);
    console.log("[PrivateSignup] handleVerify — code:", otp.trim());

    try {
      const result = await signUp.attemptEmailAddressVerification({ code: otp.trim() });
      console.log("[PrivateSignup] attemptEmailAddressVerification status:", result.status);
      if (result.status === "complete") {
        await clerk.setActive!({ session: result.createdSessionId! });
        const saved = await saveCity();
        setProfileSaved(saved);
        setStep("done");
      } else {
        setOtpError("Verifica non completata (status: " + result.status + "). Riprova.");
      }
    } catch (err: any) {
      console.error("[PrivateSignup] handleVerify error:", err);
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        "Codice non valido. Riprova.";
      setOtpError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    const signUp = getSignUp();
    if (!signUp) return;
    setServerError(null);
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}${basePath}/sso-callback`,
        redirectUrlComplete: `${window.location.origin}${basePath}/feed`,
      });
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        "Errore durante l'accesso con Google.";
      setServerError(msg);
    }
  }

  async function acquireToken(): Promise<string | null> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const clerkSession = (clerk as any)?.session ?? (window as any).Clerk?.session;
        if (clerkSession) {
          const t = await clerkSession.getToken();
          if (t) return t;
        }
      } catch {}
      try {
        const t = await getToken();
        if (t) return t;
      } catch {}
      if (attempt < 4) await new Promise((r) => setTimeout(r, 500));
    }
    return null;
  }

  async function saveCity(): Promise<boolean> {
    const token = await acquireToken();
    if (!token) {
      console.error("[saveCity] No auth token after retries");
      return false;
    }

    const cityDisplay = fields.provincia
      ? `${fields.citta.trim()} (${fields.provincia.trim()})`
      : fields.citta.trim();

    const username = `${fields.nome.trim()}_${fields.cognome.trim()}`
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_.-]/g, "")
      .slice(0, 30) || "user";

    const payload = {
      username,
      city: cityDisplay || null,
      country: "Italia",
      photoUrl: null,
    };
    console.log("[saveCity] PUT /api/users/me:", payload);

    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error("[saveCity] API error", res.status, await res.text().catch(() => ""));
        return false;
      }
      console.log("[saveCity] Profile saved.");
      return true;
    } catch (err) {
      console.error("[saveCity] fetch error:", err);
      return false;
    }
  }

  const inputCls =
    "w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow";
  const errorCls = "border-destructive";

  // Check if Clerk is loaded
  const isReady = clerk.loaded;

  useEffect(() => {
    if (step !== "done") return;
    const timer = setTimeout(() => {
      setLocation(profileSaved ? "/feed" : "/onboarding");
    }, 2500);
    return () => clearTimeout(timer);
  }, [step, profileSaved, setLocation]);

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-4 p-8 border border-border rounded-2xl bg-card shadow-sm">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold">
            {lang === "en" ? "Welcome to TreeShare!" : "Benvenuto su TreeShare!"}
          </h2>
          <p className="text-muted-foreground">
            {lang === "en"
              ? "Your account has been created. Start planting!"
              : "Il tuo account è stato creato. Inizia a piantare!"}
          </p>
          <p className="text-sm text-muted-foreground animate-pulse">
            {lang === "en" ? "Redirecting…" : "Reindirizzamento in corso…"}
          </p>
          <button
            onClick={() => setLocation(profileSaved ? "/feed" : "/onboarding")}
            className="w-full mt-2 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            {lang === "en" ? "Start planting →" : "Inizia a piantare →"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                <Leaf className="h-7 w-7" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-1">
              {lang === "en" ? "Verify your email" : "Verifica la tua email"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lang === "en"
                ? `We sent a 6-digit code to ${fields.email}`
                : `Abbiamo inviato un codice a 6 cifre a ${fields.email}`}
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            {otpError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {otpError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {lang === "en" ? "Verification code" : "Codice di verifica"}
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className={`${inputCls} text-center text-2xl tracking-widest font-mono`}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || otp.length < 6}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {lang === "en" ? "Verify" : "Verifica"}
            </button>
            <button
              type="button"
              onClick={() => setStep("form")}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {lang === "en" ? "← Back" : "← Indietro"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background pb-12">
      <div className="max-w-md mx-auto px-4">
        <div className="py-6 flex items-center gap-3">
          <Link href="/register" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {lang === "en" ? "Back" : "Indietro"}
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 shadow">
              <User className="h-7 w-7" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">
            {lang === "en" ? "Individual registration" : "Registrazione Privato"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {lang === "en"
              ? "Create your personal TreeShare account."
              : "Crea il tuo account personale su TreeShare."}
          </p>
        </div>

        {!isReady && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {isReady && (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Nome + Cognome */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {lang === "en" ? "First name" : "Nome"} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={fields.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  placeholder="Mario"
                  autoComplete="given-name"
                  className={`${inputCls} ${errors.nome ? errorCls : ""}`}
                />
                <FieldError message={errors.nome} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {lang === "en" ? "Last name" : "Cognome"} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={fields.cognome}
                  onChange={(e) => set("cognome", e.target.value)}
                  placeholder="Rossi"
                  autoComplete="family-name"
                  className={`${inputCls} ${errors.cognome ? errorCls : ""}`}
                />
                <FieldError message={errors.cognome} />
              </div>
            </div>

            {/* Città + Provincia */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {lang === "en" ? "City" : "Città"} <span className="text-destructive">*</span>
                </label>
                <CityAutocomplete
                  value={fields.citta}
                  placeholder={lang === "en" ? "Rome" : "Roma"}
                  className={inputCls}
                  hasError={!!errors.citta}
                  onChange={(city, province) => {
                    setFields((f) => ({ ...f, citta: city, provincia: province || f.provincia }));
                    setErrors((e) => ({ ...e, citta: "" }));
                  }}
                />
                <FieldError message={errors.citta} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {lang === "en" ? "Province" : "Provincia"}
                </label>
                <input
                  type="text"
                  value={fields.provincia}
                  onChange={(e) => set("provincia", e.target.value)}
                  placeholder="RM"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                value={fields.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="mario.rossi@email.it"
                autoComplete="email"
                className={`${inputCls} ${errors.email ? errorCls : ""}`}
              />
              <FieldError message={errors.email} />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={fields.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Minimo 8 caratteri"
                  autoComplete="new-password"
                  className={`${inputCls} pr-10 ${errors.password ? errorCls : ""}`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError message={errors.password} />
              {fields.password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{strength.label}</p>
                </div>
              )}
            </div>

            {/* Ripeti password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {lang === "en" ? "Confirm password" : "Ripeti password"} <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={fields.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  placeholder={lang === "en" ? "Repeat password" : "Ripeti la password"}
                  autoComplete="new-password"
                  className={`${inputCls} pr-10 ${errors.confirmPassword ? errorCls : ""}`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError message={errors.confirmPassword} />
            </div>

            {serverError && (
              <div ref={errorRef} className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity mt-2"
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {lang === "en" ? "Create account" : "Crea account"}
            </button>

            <p className="text-center text-xs text-muted-foreground leading-relaxed px-2">
              {lang === "en"
                ? <>By clicking "Create account" I accept the <Link href="/privacy" className="underline text-primary">privacy policy</Link> and <Link href="/terms" className="underline text-primary">terms and conditions</Link>.</>
                : <>Cliccando su &ldquo;Crea account&rdquo; accetto l&rsquo;<Link href="/privacy" className="underline text-primary">informativa sulla privacy</Link> e i <Link href="/terms" className="underline text-primary">termini e condizioni</Link>.</>
              }
            </p>

            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {lang === "en" ? "or" : "oppure"}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignUp}
              className="w-full py-2.5 border border-border rounded-xl font-medium text-sm hover:bg-muted/50 flex items-center justify-center gap-2.5 transition-colors bg-background"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {lang === "en" ? "Continue with Google" : "Continua con Google"}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              {lang === "en" ? "Already registered?" : "Hai già un account?"}{" "}
              <Link href="/sign-in" className="text-primary font-medium hover:underline">
                {lang === "en" ? "Sign in" : "Accedi"}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
