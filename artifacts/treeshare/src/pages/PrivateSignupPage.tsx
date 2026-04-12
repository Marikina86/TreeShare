import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, User, Eye, EyeOff, Leaf, AlertCircle, CheckCircle2 } from "lucide-react";
import { useLang } from "@/lib/i18n";
import CityAutocomplete from "@/components/CityAutocomplete";

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
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const [fields, setFields] = useState({
    nome: "",
    cognome: "",
    citta: "",
    provincia: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
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
    if (!acceptPrivacy) e.acceptPrivacy = lang === "en" ? "You must accept the privacy policy" : "Devi accettare l'informativa sulla privacy";
    if (!acceptTerms) e.acceptTerms = lang === "en" ? "You must accept the terms and conditions" : "Devi accettare i termini e condizioni";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: fields.email.trim(),
        password: fields.password,
        options: {
          emailRedirectTo: `${window.location.origin}/feed`,
          data: {
            first_name: fields.nome.trim(),
            last_name: fields.cognome.trim(),
            username: `${fields.nome.trim()}_${fields.cognome.trim()}`
              .toLowerCase()
              .replace(/\s+/g, "_")
              .replace(/[^a-z0-9_.-]/g, "")
              .slice(0, 30) || "user",
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered") || error.message.includes("already been registered")) {
          setServerError(lang === "en"
            ? "This email is already registered. Sign in or reset your password."
            : "Questa email è già registrata. Accedi con le tue credenziali o recupera la password.");
        } else if (error.message.includes("password")) {
          setServerError(lang === "en"
            ? "Password does not meet security requirements. Choose a stronger one."
            : "La password non soddisfa i requisiti di sicurezza. Scegli una password più forte.");
        } else {
          setServerError(error.message);
        }
        return;
      }

      if (data.session) {
        const saved = await saveCity();
        setProfileSaved(saved);
        setStep("done");
      } else if (data.user && !data.session) {
        setStep("verify");
      } else if (data.user?.identities?.length === 0) {
        setServerError(lang === "en"
          ? "This email is already registered. Sign in or reset your password."
          : "Questa email è già registrata. Accedi con le tue credenziali o recupera la password.");
      }
    } catch {
      setServerError("Errore durante la registrazione. Riprova.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(ev: React.FormEvent) {
    ev.preventDefault();
    setSubmitting(true);
    setOtpError(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: fields.email.trim(),
        token: otp.trim(),
        type: "signup",
      });

      if (error) {
        setOtpError(error.message || "Codice non valido. Riprova.");
        return;
      }

      if (data.session) {
        const saved = await saveCity();
        setProfileSaved(saved);
        setStep("done");
      } else {
        setOtpError("Verifica non completata. Riprova.");
      }
    } catch {
      setOtpError("Codice non valido. Riprova.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendCode() {
    setResending(true);
    setResendMsg(null);
    setOtpError(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: fields.email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/feed`,
        },
      });
      if (error) {
        if (error.message.includes("rate") || error.message.includes("limit")) {
          setOtpError(lang === "en"
            ? "Too many requests. Wait a few minutes before trying again."
            : "Troppe richieste. Attendi qualche minuto prima di riprovare.");
        } else {
          setOtpError(error.message);
        }
      } else {
        setResendMsg(lang === "en"
          ? "Verification code resent! Check your inbox (and spam folder)."
          : "Codice di verifica rinviato! Controlla la tua casella di posta (anche lo spam).");
      }
    } catch {
      setOtpError(lang === "en"
        ? "Error resending code. Try again."
        : "Errore nell'invio del codice. Riprova.");
    } finally {
      setResending(false);
    }
  }

  async function handleGoogleSignUp() {
    setServerError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/feed` },
    });
    if (error) setServerError(error.message);
  }

  async function saveCity(): Promise<boolean> {
    let token: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      token = await getToken();
      if (token) break;
      if (attempt < 4) await new Promise((r) => setTimeout(r, 500));
    }
    if (!token) return false;

    const cityDisplay = fields.provincia
      ? `${fields.citta.trim()} (${fields.provincia.trim()})`
      : fields.citta.trim();

    const username = `${fields.nome.trim()}_${fields.cognome.trim()}`
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_.-]/g, "")
      .slice(0, 30) || "user";

    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, city: cityDisplay || null, country: "Italia", photoUrl: null }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  const inputCls =
    "w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow";
  const errorCls = "border-destructive";

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
            {resendMsg && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                {resendMsg}
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
            <p className="text-xs text-muted-foreground text-center">
              {lang === "en"
                ? "Check your inbox and spam folder for the verification email."
                : "Controlla la tua casella di posta e la cartella spam per l'email di verifica."}
            </p>
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
              onClick={handleResendCode}
              disabled={resending}
              className="w-full py-2 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {resending && (
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              {lang === "en" ? "Resend verification code" : "Rinvia codice di verifica"}
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

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {serverError && (
            <div ref={errorRef} className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {serverError}
            </div>
          )}

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

          <div className="space-y-3 pt-1">
            <label className={`flex items-start gap-3 cursor-pointer group ${errors.acceptPrivacy ? "text-destructive" : ""}`}>
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(e) => {
                  setAcceptPrivacy(e.target.checked);
                  setErrors((prev) => ({ ...prev, acceptPrivacy: "" }));
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary cursor-pointer"
              />
              <span className="text-sm leading-snug text-foreground">
                {lang === "en"
                  ? <>I have read and accept the <Link href="/privacy" className="underline text-primary font-medium">privacy policy</Link> <span className="text-destructive">*</span></>
                  : <>Ho letto e accetto l'<Link href="/privacy" className="underline text-primary font-medium">informativa sulla privacy</Link> <span className="text-destructive">*</span></>}
              </span>
            </label>
            <FieldError message={errors.acceptPrivacy} />

            <label className={`flex items-start gap-3 cursor-pointer group ${errors.acceptTerms ? "text-destructive" : ""}`}>
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => {
                  setAcceptTerms(e.target.checked);
                  setErrors((prev) => ({ ...prev, acceptTerms: "" }));
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary cursor-pointer"
              />
              <span className="text-sm leading-snug text-foreground">
                {lang === "en"
                  ? <>I have read and accept the <Link href="/terms" className="underline text-primary font-medium">terms and conditions</Link> <span className="text-destructive">*</span></>
                  : <>Ho letto e accetto i <Link href="/terms" className="underline text-primary font-medium">termini e condizioni</Link> <span className="text-destructive">*</span></>}
              </span>
            </label>
            <FieldError message={errors.acceptTerms} />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity mt-2"
          >
            {submitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {lang === "en" ? "Create account" : "Crea account"}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gradient-to-b from-green-50 to-background px-2 text-muted-foreground">
                {lang === "en" ? "or" : "oppure"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="w-full flex items-center justify-center gap-3 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {lang === "en" ? "Sign up with Google" : "Registrati con Google"}
          </button>

          <p className="text-sm text-center text-muted-foreground mt-4">
            {lang === "en" ? "Already have an account?" : "Hai già un account?"}{" "}
            <Link href="/sign-in" className="font-semibold text-primary hover:underline">
              {lang === "en" ? "Sign in" : "Accedi"}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
