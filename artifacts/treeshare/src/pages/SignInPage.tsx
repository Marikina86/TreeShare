import { useState } from "react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Leaf, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useLang } from "@/lib/i18n";

export default function SignInPage() {
  const { lang } = useLang();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const L = (it: string, en: string) => (lang === "it" ? it : en);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
        } else {
          setError(authError.message);
        }
        return;
      }
      setLocation("/feed");
    } catch {
      setError(L("Errore durante l'accesso. Riprova.", "Login error. Try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/feed` },
    });
    if (authError) setError(authError.message);
  }

  const inputCls =
    "w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow";

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
            <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
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

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {L("oppure", "or")}
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {L("Continua con Google", "Continue with Google")}
        </button>

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
