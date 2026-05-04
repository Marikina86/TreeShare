import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";

const LEGAL_CONTENT_CSS = `
.consent-content section { margin-bottom: 1.5rem; }
.consent-content h2 { font-size: 0.95rem; font-weight: 600; margin-bottom: 0.5rem; color: hsl(var(--foreground)); }
.consent-content h3 { font-size: 0.85rem; font-weight: 600; margin-top: 0.65rem; margin-bottom: 0.35rem; color: hsl(var(--foreground)); }
.consent-content p { color: hsl(var(--muted-foreground)); margin-bottom: 0.5rem; line-height: 1.6; font-size: 0.8rem; }
.consent-content ul { list-style-type: disc; margin-left: 1.1rem; margin-bottom: 0.6rem; }
.consent-content li { color: hsl(var(--muted-foreground)); font-size: 0.8rem; line-height: 1.6; margin-bottom: 0.25rem; }
.consent-content a { color: hsl(var(--primary)); text-decoration: underline; }
.consent-content strong { color: hsl(var(--foreground)); font-weight: 600; }
.consent-content table { width: 100%; font-size: 0.7rem; border-collapse: collapse; margin-bottom: 0.6rem; }
.consent-content thead tr { border-bottom: 1px solid hsl(var(--border)); }
.consent-content th { text-align: left; padding: 0.3rem 0.5rem 0.3rem 0; font-weight: 600; color: hsl(var(--foreground)); }
.consent-content td { padding: 0.3rem 0.5rem 0.3rem 0; color: hsl(var(--muted-foreground)); border-bottom: 1px solid hsl(var(--border)); }
.consent-content code { font-family: monospace; font-size: 0.75em; }
`;

const POLICY_LABELS: Record<string, { it: string; link: string; defaultCheckboxLabel: string }> = {
  terms: { it: "Termini e Condizioni", link: "/terms", defaultCheckboxLabel: "Ho letto e accetto i Termini e Condizioni" },
  privacy: { it: "Privacy Policy", link: "/privacy", defaultCheckboxLabel: "Dichiaro di aver letto e compreso la Privacy Policy" },
  cookie: { it: "Cookie Policy", link: "/cookies", defaultCheckboxLabel: "Ho letto e accetto la Cookie Policy" },
  location: {
    it: "Consenso Posizione",
    link: "/privacy#location",
    defaultCheckboxLabel: "Acconsento all'utilizzo della mia posizione per localizzare gli alberi e migliorare i servizi offerti.",
  },
  marketing: {
    it: "Comunicazioni Commerciali",
    link: "/privacy#marketing",
    defaultCheckboxLabel: "Acconsento a ricevere notifiche promozionali e comunicazioni commerciali e all'analisi delle mie preferenze e attività per ricevere suggerimenti personalizzati.",
  },
};

const DEFAULT_CONSENT_NOTES: Record<string, string> = {
  location: "Puoi revocare il consenso in qualsiasi momento dalle impostazioni.",
  marketing: "Puoi disattivarle in qualsiasi momento dalle impostazioni.",
};

type MissingPolicy = {
  policyId: string;
  type: string;
  version: string;
  requiresAcceptance: boolean;
  checkboxLabel: string | null;
  consentNote: string | null;
  lastModifiedAt: string | null;
};

type PolicyContent = {
  id: string;
  type: string;
  version: string;
  content: string;
  checkboxLabel: string | null;
  consentNote: string | null;
  requiresAcceptance: boolean;
};

type Props = {
  missing: MissingPolicy[];
  onAccepted: () => void;
};

export default function ConsentModal({ missing, onAccepted }: Props) {
  const { getToken } = useAuth();

  const [contents, setContents] = useState<Record<string, PolicyContent>>({});
  const [loadingContents, setLoadingContents] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  // null = not yet chosen (for choice policies), true/false = decision
  const [checked, setChecked] = useState<Record<string, boolean | null>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, boolean | null> = {};
    missing.forEach((p) => {
      initial[p.policyId] = p.requiresAcceptance ? false : null;
    });
    setChecked(initial);

    async function fetchContents() {
      const fetched: Record<string, PolicyContent> = {};
      await Promise.all(
        missing.map(async (p) => {
          try {
            const r = await fetch(`/api/policies/${p.type}`);
            if (r.ok) {
              const data = await r.json() as PolicyContent;
              fetched[p.policyId] = data;
            }
          } catch {
            // ignore, will show fallback
          }
        })
      );
      setContents(fetched);
      setLoadingContents(false);
    }

    fetchContents();
  }, [missing]);

  const allResolved = missing.every((p) => {
    const val = checked[p.policyId];
    if (p.requiresAcceptance) return val === true;
    return val !== null && val !== undefined;
  });

  const handleAccept = useCallback(async () => {
    if (!allResolved) return;
    setSaving(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          consents: missing.map((p) => ({
            policyId: p.policyId,
            accepted: checked[p.policyId] === true,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error ?? "Errore nel salvataggio");
      }

      onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio dei consensi");
    } finally {
      setSaving(false);
    }
  }, [allResolved, missing, checked, getToken, onAccepted]);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <style>{LEGAL_CONTENT_CSS}</style>

      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Aggiornamento documenti legali</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Abbiamo aggiornato {missing.length === 1 ? "un documento" : `${missing.length} documenti`}. Per continuare è necessario completare tutti i punti.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
          {missing.map((p) => {
            const meta = POLICY_LABELS[p.type] ?? { it: p.type, link: "#", defaultCheckboxLabel: `Ho letto e accetto ${p.type}` };
            const content = contents[p.policyId];
            const isExpanded = expanded === p.policyId;
            const checkboxLabel = p.checkboxLabel || content?.checkboxLabel || meta.defaultCheckboxLabel;
            const consentNote = p.consentNote || content?.consentNote || DEFAULT_CONSENT_NOTES[p.type] || null;
            const isChoice = !p.requiresAcceptance;
            const currentVal = checked[p.policyId];

            return (
              <div key={p.policyId} className="border border-border rounded-xl overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{meta.it}</p>
                      <p className="text-xs text-muted-foreground">
                        Versione {p.version}
                        {p.lastModifiedAt && (
                          <> · Aggiornato il {new Date(p.lastModifiedAt).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}</>
                        )}
                      </p>
                    </div>
                    {content && (
                      <button
                        className="text-xs text-primary underline hover:no-underline ml-4 flex-shrink-0"
                        onClick={() => setExpanded(isExpanded ? null : p.policyId)}
                      >
                        {isExpanded ? "Chiudi" : "Leggi"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable content */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {loadingContents ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : content ? (
                      <ScrollArea className="h-56">
                        <div
                          className="consent-content px-4 py-3"
                          dangerouslySetInnerHTML={{ __html: content.content }}
                        />
                      </ScrollArea>
                    ) : (
                      <p className="text-xs text-muted-foreground px-4 py-3">
                        Documento non disponibile.{" "}
                        <a href={meta.link} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                          Apri in nuova scheda
                        </a>
                      </p>
                    )}
                  </div>
                )}

                {/* Consent area */}
                <div className="px-4 py-3 border-t border-border">
                  {isChoice ? (
                    /* Scelta obbligatoria (location, marketing): YES o NO */
                    <div className="space-y-2.5">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name={`choice-${p.policyId}`}
                          checked={currentVal === true}
                          onChange={() => setChecked((prev) => ({ ...prev, [p.policyId]: true }))}
                          className="mt-0.5 flex-shrink-0 accent-primary w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-xs text-foreground leading-relaxed group-hover:text-foreground transition-colors">
                          {checkboxLabel}
                        </span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name={`choice-${p.policyId}`}
                          checked={currentVal === false}
                          onChange={() => setChecked((prev) => ({ ...prev, [p.policyId]: false }))}
                          className="mt-0.5 flex-shrink-0 accent-primary w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                          Non acconsento
                        </span>
                      </label>
                      {currentVal === null && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                          Seleziona un'opzione per continuare.
                        </p>
                      )}
                      {consentNote && (
                        <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border pt-2 mt-1">
                          {consentNote}
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Accettazione obbligatoria (terms, privacy, cookie): checkbox */
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`consent-${p.policyId}`}
                        checked={!!currentVal}
                        onCheckedChange={(val) =>
                          setChecked((prev) => ({ ...prev, [p.policyId]: !!val }))
                        }
                        className="mt-0.5 flex-shrink-0"
                      />
                      <label
                        htmlFor={`consent-${p.policyId}`}
                        className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                      >
                        {checkboxLabel}{" "}
                        <span className="text-muted-foreground/70">(v{p.version})</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-border flex-shrink-0 space-y-3">
          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}
          <Button
            className="w-full"
            disabled={!allResolved || saving}
            onClick={handleAccept}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvataggio…</>
            ) : (
              "Conferma e continua"
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Non puoi continuare a utilizzare TreeShare senza completare tutte le scelte richieste.
          </p>
        </div>
      </div>
    </div>
  );
}
