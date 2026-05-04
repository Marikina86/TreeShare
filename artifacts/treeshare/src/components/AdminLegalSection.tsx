import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Trash2, Eye, EyeOff, Plus, DatabaseZap } from "lucide-react";

const LEGAL_PREVIEW_CSS = `
.legal-preview section { margin-bottom: 1.5rem; }
.legal-preview h2 { font-size: 0.95rem; font-weight: 600; margin-bottom: 0.5rem; color: hsl(var(--foreground)); }
.legal-preview h3 { font-size: 0.85rem; font-weight: 600; margin-top: 0.65rem; margin-bottom: 0.35rem; color: hsl(var(--foreground)); }
.legal-preview p { color: hsl(var(--muted-foreground)); margin-bottom: 0.5rem; line-height: 1.6; font-size: 0.8rem; }
.legal-preview ul { list-style-type: disc; margin-left: 1.1rem; margin-bottom: 0.6rem; }
.legal-preview li { color: hsl(var(--muted-foreground)); font-size: 0.8rem; line-height: 1.6; margin-bottom: 0.25rem; }
.legal-preview a { color: hsl(var(--primary)); text-decoration: underline; }
.legal-preview strong { color: hsl(var(--foreground)); font-weight: 600; }
.legal-preview table { width: 100%; font-size: 0.7rem; border-collapse: collapse; margin-bottom: 0.6rem; }
.legal-preview thead tr { border-bottom: 1px solid hsl(var(--border)); }
.legal-preview th { text-align: left; padding: 0.3rem 0.5rem 0.3rem 0; font-weight: 600; color: hsl(var(--foreground)); }
.legal-preview td { padding: 0.3rem 0.5rem 0.3rem 0; color: hsl(var(--muted-foreground)); border-bottom: 1px solid hsl(var(--border)); }
.legal-preview code { font-family: monospace; font-size: 0.75em; }
`;

type Policy = {
  id: string;
  type: string;
  version: string;
  content: string;
  checkboxLabel: string | null;
  consentNote: string | null;
  requiresAcceptance: boolean;
  isActive: boolean;
  createdAt: string;
};

const TYPE_LABELS: Record<string, { it: string; color: string; requiresAcceptanceDefault: boolean }> = {
  terms:     { it: "Termini e Condizioni",       color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",       requiresAcceptanceDefault: true },
  privacy:   { it: "Privacy Policy",             color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300", requiresAcceptanceDefault: true },
  cookie:    { it: "Cookie Policy",              color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",    requiresAcceptanceDefault: true },
  location:  { it: "Consenso Posizione",         color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",   requiresAcceptanceDefault: false },
  marketing: { it: "Comunicazioni Commerciali",  color: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",       requiresAcceptanceDefault: false },
};

const POLICY_TYPES = ["terms", "privacy", "cookie", "location", "marketing"] as const;
type PolicyType = typeof POLICY_TYPES[number];

const DEFAULT_CHECKBOX_LABELS: Record<string, string> = {
  terms:     "Ho letto e accetto i Termini e Condizioni",
  privacy:   "Dichiaro di aver letto e compreso la Privacy Policy",
  cookie:    "Ho letto e accetto la Cookie Policy",
  location:  "Acconsento all'utilizzo della mia posizione per localizzare gli alberi e migliorare i servizi offerti.",
  marketing: "Acconsento a ricevere notifiche promozionali e comunicazioni commerciali e all'analisi delle mie preferenze e attività per ricevere suggerimenti personalizzati.",
};

const DEFAULT_CONSENT_NOTES: Record<string, string> = {
  location:  "Puoi revocare il consenso in qualsiasi momento dalle impostazioni.",
  marketing: "Puoi disattivarle in qualsiasi momento dalle impostazioni.",
};

type Props = {
  lang: "it" | "en";
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  toast: ReturnType<typeof useToast>["toast"];
};

export default function AdminLegalSection({ lang, authFetch, toast }: Props) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<PolicyType>("terms");
  const [formVersion, setFormVersion] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCheckboxLabel, setFormCheckboxLabel] = useState("");
  const [formConsentNote, setFormConsentNote] = useState("");
  const [formRequiresAcceptance, setFormRequiresAcceptance] = useState(true);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/policies");
      if (res.ok) setPolicies(await res.json());
    } catch {
      toast({ title: "Errore caricamento documenti", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [authFetch, toast]);

  useEffect(() => { loadPolicies(); }, [loadPolicies]);

  // When formType changes, pre-fill defaults for new choice types
  useEffect(() => {
    const meta = TYPE_LABELS[formType];
    if (meta) {
      setFormRequiresAcceptance(meta.requiresAcceptanceDefault);
      setFormCheckboxLabel(DEFAULT_CHECKBOX_LABELS[formType] ?? "");
      setFormConsentNote(DEFAULT_CONSENT_NOTES[formType] ?? "");
    }
  }, [formType]);

  async function handleActivate(id: string) {
    setActionLoading(id);
    try {
      const res = await authFetch(`/api/policies/${id}/activate`, { method: "PUT" });
      if (res.ok) {
        toast({ title: "Versione attivata con successo" });
        await loadPolicies();
      } else {
        const d = await res.json();
        toast({ title: d.error ?? "Errore attivazione", variant: "destructive" });
      }
    } catch {
      toast({ title: "Errore attivazione", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa versione? L'operazione non è reversibile.")) return;
    setActionLoading(id);
    try {
      const res = await authFetch(`/api/policies/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Versione eliminata" });
        setPolicies((p) => p.filter((x) => x.id !== id));
      } else {
        const d = await res.json();
        toast({ title: d.error ?? "Errore eliminazione", variant: "destructive" });
      }
    } catch {
      toast({ title: "Errore eliminazione", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSeed() {
    if (!confirm("Caricare il contenuto predefinito? Verranno create le versioni iniziali dei 3 documenti (solo se non già presenti) e attivate automaticamente.")) return;
    setSeedLoading(true);
    try {
      const res = await authFetch("/api/admin/policies/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Seed completato", description: data.results?.join("\n") });
        await loadPolicies();
      } else {
        toast({ title: data.error ?? "Errore seed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Errore seed", variant: "destructive" });
    } finally {
      setSeedLoading(false);
    }
  }

  async function handleCreateVersion() {
    if (!formVersion.trim() || !formContent.trim()) {
      toast({ title: "Versione e contenuto sono obbligatori", variant: "destructive" });
      return;
    }
    setFormSaving(true);
    try {
      const res = await authFetch("/api/policies", {
        method: "POST",
        body: JSON.stringify({
          type: formType,
          version: formVersion.trim(),
          content: formContent.trim(),
          checkboxLabel: formCheckboxLabel.trim() || undefined,
          consentNote: formConsentNote.trim() || undefined,
          requiresAcceptance: formRequiresAcceptance,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: `Versione "${formVersion}" creata`, description: "Attivala per renderla visibile agli utenti." });
        setFormVersion("");
        setFormContent("");
        setFormCheckboxLabel("");
        setFormConsentNote("");
        setFormRequiresAcceptance(true);
        setShowForm(false);
        await loadPolicies();
      } else {
        toast({ title: data.error ?? "Errore creazione", variant: "destructive" });
      }
    } catch {
      toast({ title: "Errore creazione", variant: "destructive" });
    } finally {
      setFormSaving(false);
    }
  }

  const [formSaving, setFormSaving] = useState(false);

  const grouped = POLICY_TYPES.map((type) => ({
    type,
    label: TYPE_LABELS[type],
    versions: policies.filter((p) => p.type === type).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  }));

  const hasAny = policies.length > 0;

  return (
    <div className="space-y-6 pb-10">
      <style>{LEGAL_PREVIEW_CSS}</style>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {lang === "it" ? "Documenti Legali e Consensi" : "Legal Documents & Consents"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lang === "it"
              ? "Gestisci Termini, Privacy, Cookie, Consenso Posizione e Comunicazioni Commerciali. Gli utenti vedono sempre la versione attiva."
              : "Manage Terms, Privacy, Cookies, Location Consent and Marketing. Users always see the active version."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!hasAny && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={seedLoading}
              className="gap-2"
            >
              {seedLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DatabaseZap className="w-3.5 h-3.5" />}
              {lang === "it" ? "Carica contenuto iniziale" : "Load initial content"}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            {lang === "it" ? "Nuova versione" : "New version"}
          </Button>
        </div>
      </div>

      {/* New version form */}
      {showForm && (
        <div className="border border-border rounded-2xl p-5 space-y-4 bg-muted/20">
          <h3 className="text-sm font-semibold text-foreground">
            {lang === "it" ? "Crea nuova versione" : "Create new version"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                {lang === "it" ? "Tipo documento" : "Document type"}
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as PolicyType)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="terms">{lang === "it" ? "Termini e Condizioni" : "Terms & Conditions"}</option>
                <option value="privacy">Privacy Policy</option>
                <option value="cookie">Cookie Policy</option>
                <option value="location">{lang === "it" ? "Consenso Posizione" : "Location Consent"}</option>
                <option value="marketing">{lang === "it" ? "Comunicazioni Commerciali" : "Marketing Communications"}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                {lang === "it" ? "Versione" : "Version"} <span className="text-muted-foreground font-normal">(es. 2026-06-01)</span>
              </label>
              <input
                type="text"
                value={formVersion}
                onChange={(e) => setFormVersion(e.target.value)}
                placeholder="2026-06-01"
                className="px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Requires acceptance toggle */}
          <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background">
            <input
              type="checkbox"
              id="form-requires-acceptance"
              checked={formRequiresAcceptance}
              onChange={(e) => setFormRequiresAcceptance(e.target.checked)}
              className="mt-0.5 accent-primary w-3.5 h-3.5 flex-shrink-0 cursor-pointer"
            />
            <div>
              <label htmlFor="form-requires-acceptance" className="text-xs font-medium text-foreground cursor-pointer">
                {lang === "it" ? "Accettazione obbligatoria" : "Requires acceptance"}
              </label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {lang === "it"
                  ? "Se attivo: l'utente deve spuntare per proseguire. Se disattivo: l'utente può scegliere sì o no (ma deve scegliere)."
                  : "If on: user must accept to proceed. If off: user must choose yes or no (choice required, but can decline)."}
              </p>
            </div>
          </div>

          {/* Checkbox label */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">
              {lang === "it" ? "Testo checkbox" : "Checkbox label"}
            </label>
            <textarea
              value={formCheckboxLabel}
              onChange={(e) => setFormCheckboxLabel(e.target.value)}
              rows={2}
              placeholder={DEFAULT_CHECKBOX_LABELS[formType]}
              className="px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            />
            <p className="text-[10px] text-muted-foreground">
              {lang === "it" ? "Testo mostrato accanto alla spunta nel modal di consenso. Se vuoto usa il testo predefinito." : "Text shown next to the checkbox in the consent modal. Defaults to the type's standard label if empty."}
            </p>
          </div>

          {/* Consent note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">
              {lang === "it" ? "Nota sotto il checkbox" : "Note below checkbox"} <span className="text-muted-foreground font-normal">(facoltativa)</span>
            </label>
            <input
              type="text"
              value={formConsentNote}
              onChange={(e) => setFormConsentNote(e.target.value)}
              placeholder={DEFAULT_CONSENT_NOTES[formType] ?? lang === "it" ? "es. Puoi revocare in qualsiasi momento..." : "e.g. You can revoke at any time..."}
              className="px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[10px] text-muted-foreground">
              {lang === "it" ? "Breve testo informativo mostrato sotto la scelta (es. istruzioni per revocare)." : "Short informational text shown below the choice (e.g. instructions to revoke)."}
            </p>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                {lang === "it" ? "Contenuto HTML" : "HTML content"}
              </label>
              <span className="text-xs text-muted-foreground">{formContent.length} caratteri</span>
            </div>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={14}
              placeholder="<p>Testo del documento in HTML...</p>&#10;<section>&#10;<h2>1. Titolo sezione</h2>&#10;<p>Contenuto...</p>&#10;</section>"
              className="px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            />
            <p className="text-xs text-muted-foreground">
              {lang === "it"
                ? "Usa HTML semantico: <section>, <h2>, <h3>, <p>, <ul>, <li>, <a>, <strong>, <table>. La versione creata non sarà attiva — attivala esplicitamente dopo la revisione."
                : "Use semantic HTML: <section>, <h2>, <h3>, <p>, <ul>, <li>, <a>, <strong>, <table>. The version won't be active until you explicitly activate it."}
            </p>
          </div>

          {/* Live preview */}
          {formContent.trim().length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b border-border">
                {lang === "it" ? "Anteprima rendering" : "Render preview"}
              </div>
              <div className="p-4 max-h-64 overflow-y-auto">
                <div className="legal-preview" dangerouslySetInnerHTML={{ __html: formContent }} />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowForm(false); setFormVersion(""); setFormContent(""); setFormCheckboxLabel(""); setFormConsentNote(""); }}
              className="flex-1"
            >
              {lang === "it" ? "Annulla" : "Cancel"}
            </Button>
            <Button
              size="sm"
              onClick={handleCreateVersion}
              disabled={formSaving || !formVersion.trim() || !formContent.trim()}
              className="flex-1 gap-2"
            >
              {formSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {lang === "it" ? "Crea versione" : "Create version"}
            </Button>
          </div>
        </div>
      )}

      {/* Policy groups */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ type, label, versions }) => (
            <div key={type} className="border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${label.color}`}>
                    {label.it}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${label.requiresAcceptanceDefault ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" : "bg-muted text-muted-foreground"}`}>
                    {label.requiresAcceptanceDefault ? "obbligatorio" : "scelta"}
                  </span>
                  {versions.some((v) => v.isActive) ? (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {lang === "it" ? "attiva" : "active"}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      {lang === "it" ? "nessuna versione attiva" : "no active version"}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {versions.length} {lang === "it" ? "versioni" : "versions"}
                </span>
              </div>

              {versions.length === 0 ? (
                <div className="px-5 py-6 text-sm text-muted-foreground text-center">
                  {lang === "it" ? "Nessuna versione — usa il seed o crea una nuova versione." : "No versions — use seed or create a new version."}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {versions.map((v) => (
                    <div key={v.id} className="px-5 py-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {v.isActive ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Attiva" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium text-foreground">
                            v{v.version}
                          </span>
                          {v.isActive && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              ATTIVA
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground ml-1">
                            {formatDate(v.createdAt)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            · {v.content.length} chars
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => setPreviewId(previewId === v.id ? null : v.id)}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                            title={lang === "it" ? "Anteprima" : "Preview"}
                          >
                            {previewId === v.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>

                          {!v.isActive && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => handleActivate(v.id)}
                                disabled={actionLoading === v.id}
                              >
                                {actionLoading === v.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                                {lang === "it" ? "Attiva" : "Activate"}
                              </Button>
                              <button
                                onClick={() => handleDelete(v.id)}
                                disabled={actionLoading === v.id}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                                title={lang === "it" ? "Elimina" : "Delete"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Checkbox label + note preview */}
                      {(v.checkboxLabel || v.consentNote || !v.requiresAcceptance) && (
                        <div className="mt-2 space-y-1">
                          {v.checkboxLabel && (
                            <p className="text-[10px] text-muted-foreground bg-muted/40 rounded px-2 py-1">
                              <span className="font-medium text-foreground">Label:</span> {v.checkboxLabel}
                            </p>
                          )}
                          {v.consentNote && (
                            <p className="text-[10px] text-muted-foreground bg-muted/40 rounded px-2 py-1">
                              <span className="font-medium text-foreground">Nota:</span> {v.consentNote}
                            </p>
                          )}
                          {!v.requiresAcceptance && (
                            <span className="inline-flex text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              scelta libera (sì/no)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Preview panel */}
                      {previewId === v.id && (
                        <div className="mt-3 border border-border rounded-xl overflow-hidden">
                          <div className="px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b border-border">
                            {lang === "it" ? "Anteprima contenuto" : "Content preview"}
                          </div>
                          <div className="p-4 max-h-72 overflow-y-auto">
                            <div className="legal-preview" dangerouslySetInnerHTML={{ __html: v.content }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Seed button (also shown when there are policies, as secondary action) */}
      {hasAny && (
        <div className="border border-dashed border-border rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-foreground">
              {lang === "it" ? "Contenuto predefinito" : "Default content"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === "it"
                ? "Ricarica il testo iniziale per i tipi mancanti di versioni."
                : "Re-load initial text for types without any version."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seedLoading}
            className="gap-2 flex-shrink-0"
          >
            {seedLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DatabaseZap className="w-3.5 h-3.5" />}
            {lang === "it" ? "Seed" : "Seed"}
          </Button>
        </div>
      )}
    </div>
  );
}
