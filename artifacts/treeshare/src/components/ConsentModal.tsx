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

const POLICY_LABELS: Record<string, { it: string; link: string }> = {
  terms: { it: "Termini e Condizioni", link: "/terms" },
  privacy: { it: "Privacy Policy", link: "/privacy" },
  cookie: { it: "Cookie Policy", link: "/cookies" },
};

type MissingPolicy = {
  policyId: string;
  type: string;
  version: string;
};

type PolicyContent = {
  id: string;
  type: string;
  version: string;
  content: string;
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
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    missing.forEach((p) => { initial[p.policyId] = false; });
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

  const allChecked = missing.every((p) => checked[p.policyId]);

  const handleAccept = useCallback(async () => {
    if (!allChecked) return;
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
          consents: missing.map((p) => ({ policyId: p.policyId, accepted: true })),
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
  }, [allChecked, missing, getToken, onAccepted]);

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
                Abbiamo aggiornato {missing.length === 1 ? "un documento" : `${missing.length} documenti`}. Per continuare è necessario accettare.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
          {missing.map((p) => {
            const label = POLICY_LABELS[p.type] ?? { it: p.type, link: "#" };
            const content = contents[p.policyId];
            const isExpanded = expanded === p.policyId;

            return (
              <div key={p.policyId} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{label.it}</p>
                      <p className="text-xs text-muted-foreground">Versione {p.version}</p>
                    </div>
                    <button
                      className="text-xs text-primary underline hover:no-underline ml-4 flex-shrink-0"
                      onClick={() => setExpanded(isExpanded ? null : p.policyId)}
                    >
                      {isExpanded ? "Chiudi" : "Leggi"}
                    </button>
                  </div>
                </div>

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
                        <a href={label.link} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                          Apri in nuova scheda
                        </a>
                      </p>
                    )}
                  </div>
                )}

                <div className="px-4 py-3 border-t border-border flex items-start gap-3">
                  <Checkbox
                    id={`consent-${p.policyId}`}
                    checked={!!checked[p.policyId]}
                    onCheckedChange={(val) =>
                      setChecked((prev) => ({ ...prev, [p.policyId]: !!val }))
                    }
                    className="mt-0.5 flex-shrink-0"
                  />
                  <label
                    htmlFor={`consent-${p.policyId}`}
                    className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                  >
                    Ho letto e accetto {label.it} (v{p.version})
                  </label>
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
            disabled={!allChecked || saving}
            onClick={handleAccept}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvataggio…</>
            ) : (
              "Accetto e continuo"
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Non puoi continuare a utilizzare TreeShare senza accettare i documenti legali aggiornati.
          </p>
        </div>
      </div>
    </div>
  );
}
