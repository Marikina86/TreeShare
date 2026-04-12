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
