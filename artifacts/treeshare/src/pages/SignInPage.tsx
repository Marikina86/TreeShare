import { useState } from "react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Leaf, Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useLang } from "@/lib/i18n";

export default function SignInPage() {
  const { lang } = useLang();
  const [, setLocation] = useLocation();
  const rawNext = new URLSearchParams(window.location.search).get("next") ?? "";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("/sign-in") ? rawNext : "/feed";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationResent, setVerificationResent] = useState(false);
  const [verificationResendError, setVerificationResendError] = useState<string | null>(null);

  const L = (it: string, en: string) => (lang === "it" ? it : en);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailNotConfirmed(false);
    setVerificationResent(false);
    setVerificationResendError(null);
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        if (authError.message.includes("Invalid login")) {
          setError(L("Email o password non corretti.", "Invalid email or password."));
        } else if (authError.message.includes("Email not confirmed")) {
          setError(L("Email non ancora verificata. Controlla la tua casella di posta.", "Email not yet verified. Check your inbox."));
          setEmailNotConfirmed(true);
        } else {
          setError(authError.message);
        }
        return;
      }
      setLocation(nextPath);
    } catch {
      setError(L("Errore durante l'accesso. Riprova.", "Login error. Try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    setResendingVerification(true);
    setVerificationResendError(null);
    setVerificationResent(false);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/feed` },
      });
      if (error) {
        const res = await fetch("/api/register-ente/resend-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setVerificationResendError(
            (json as { error?: string }).error ||
            L("Errore nell'invio dell'email.", "Error sending verification email.")
          );
          return;
        }
      }
      setVerificationResent(true);
    } catch {
      setVerificationResendError(L("Errore nell'invio dell'email. Riprova.", "Error sending email. Try again."));
    } finally {
      setResendingVerification(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    setResetLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: redirectUrl,
      });
      if (resetErr) {
        setResetError(resetErr.message);
        return;
      }
      setResetSent(true);
    } catch {
      setResetError(L("Errore nell'invio. Riprova.", "Error sending reset email. Try again."));
    } finally {
      setResetLoading(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow";

  if (showReset) {
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
              {L("Recupera password", "Reset password")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {L("Inserisci la tua email per ricevere un link di recupero", "Enter your email to receive a reset link")}
            </p>
          </div>

          {resetSent ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-4 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-emerald-600">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                  {L("Email inviata!", "Email sent!")}
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  {L(
                    "Controlla la tua casella di posta (anche lo spam) e clicca sul link per reimpostare la password.",
                    "Check your inbox (and spam folder) and click the link to reset your password."
                  )}
                </p>
              </div>
              <button
                onClick={() => { setShowReset(false); setResetSent(false); setResetEmail(""); setResetError(null); }}
                className="w-full py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {L("Torna al login", "Back to login")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {resetError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {resetError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="mario.rossi@email.it"
                  autoComplete="email"
                  className={inputCls}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={resetLoading || !resetEmail.trim()}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
              >
                {resetLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {L("Invia link di recupero", "Send reset link")}
              </button>

              <button
                type="button"
                onClick={() => { setShowReset(false); setResetError(null); setResetEmail(""); }}
                className="w-full py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {L("Torna al login", "Back to login")}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

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
            {L("Accedi a TreeShare", "Sign in to TreeShare")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {L("Inserisci le tue credenziali per continuare", "Enter your credentials to continue")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {emailNotConfirmed && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 space-y-2">
              {verificationResent && (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  {L("Email di verifica rinviata! Controlla la tua casella (anche lo spam).", "Verification email resent! Check your inbox (and spam folder).")}
                </div>
              )}
              {verificationResendError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {verificationResendError}
                </div>
              )}
              {!verificationResent && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  className="w-full py-2 text-sm font-medium text-amber-800 dark:text-amber-200 hover:text-amber-900 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {resendingVerification && (
                    <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  )}
                  {L("Rinvia email di verifica", "Resend verification email")}
                </button>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mario.rossi@email.it"
              autoComplete="email"
              className={inputCls}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-foreground">Password</label>
              <button
                type="button"
                onClick={() => { setShowReset(true); setResetEmail(email); }}
                className="text-xs text-primary hover:underline font-medium"
              >
                {L("Password dimenticata?", "Forgot password?")}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`${inputCls} pr-10`}
                required
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {L("Accedi", "Sign in")}
          </button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-6">
          {L("Non hai un account?", "Don't have an account?")}{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            {L("Registrati", "Sign up")}
          </Link>
        </p>
      </div>
    </div>
  );
}
