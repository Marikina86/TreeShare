import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "bug",                    label: "Bug / Errore tecnico" },
  { value: "problema_tecnico",       label: "Problema di caricamento" },
  { value: "contenuto_inappropriato",label: "Contenuto inappropriato" },
  { value: "suggerimento",           label: "Suggerimento / Feedback" },
  { value: "altro",                  label: "Altro" },
];

export default function ReportProblemButton() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ category?: string; description?: string }>({});

  function handleOpen() {
    setCategory("");
    setDescription("");
    setErrors({});
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const newErrors: { category?: string; description?: string } = {};
    if (!category) newErrors.category = "Seleziona una categoria";
    if (description.trim().length < 10) newErrors.description = "Descrizione troppo breve (minimo 10 caratteri)";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/problem-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ category, description: description.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({
          title: "Errore",
          description: (err as { error?: string }).error ?? "Impossibile inviare la segnalazione.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "✅ Segnalazione inviata",
        description: "Grazie! Il tuo messaggio è stato inviato all'amministratore.",
      });
      setOpen(false);
    } catch {
      toast({ title: "Errore di rete", description: "Controlla la connessione e riprova.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-left hover:bg-muted/60 transition-colors rounded-xl text-muted-foreground hover:text-foreground"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="shrink-0 text-destructive">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/>
          <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/>
        </svg>
        Segnala un problema
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-destructive">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/>
                    <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-base leading-none">Segnala un problema</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Il tuo feedback arriva direttamente all'admin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Categoria <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setCategory(cat.value);
                        setErrors((prev) => ({ ...prev, category: undefined }));
                      }}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium text-left transition-all ${
                        category === cat.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-muted/30 text-foreground hover:border-primary/40"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        category === cat.value ? "border-primary" : "border-muted-foreground/40"
                      }`}>
                        {category === cat.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      {cat.label}
                    </button>
                  ))}
                </div>
                {errors.category && (
                  <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/>
                    </svg>
                    {errors.category}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Descrivi il problema <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (e.target.value.trim().length >= 10) {
                      setErrors((prev) => ({ ...prev, description: undefined }));
                    }
                  }}
                  placeholder="Descrivi cosa è successo, dove e quando si è verificato il problema..."
                  rows={4}
                  maxLength={1000}
                  className={`w-full px-4 py-3 text-sm bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-muted-foreground ${
                    errors.description ? "border-destructive" : "border-border"
                  }`}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.description ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/>
                      </svg>
                      {errors.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {description.trim().length < 10
                        ? `Ancora ${10 - description.trim().length} caratteri`
                        : "✓"}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{description.length}/1000</p>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Invio...
                    </span>
                  ) : "Invia segnalazione"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
