import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/** Lightweight Markdown → HTML converter for legacy policy content.
 *  New HTML-format content is passed through as-is. */
function renderContent(raw: string): string {
  const trimmed = raw.trim();
  // If content already looks like HTML, return as-is
  if (trimmed.startsWith("<")) return trimmed;
  // Basic Markdown → HTML for legacy content
  const blocks = trimmed.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const b = block.trim();
      if (!b) return "";
      // Headings
      const h3 = b.match(/^###\s+(.+)/);
      if (h3) return `<h3>${h3[1]}</h3>`;
      const h2 = b.match(/^##\s+(.+)/);
      if (h2) return `<h2>${h2[1]}</h2>`;
      const h1 = b.match(/^#\s+(.+)/);
      if (h1) return `<h2>${h1[1]}</h2>`;
      // List
      if (b.split("\n").every((l) => l.startsWith("- ") || !l.trim())) {
        const items = b
          .split("\n")
          .filter((l) => l.startsWith("- "))
          .map((l) =>
            `<li>${l.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')}</li>`
          );
        return `<ul>${items.join("")}</ul>`;
      }
      // Default paragraph
      const inline = b
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
        .replace(/\n/g, " ");
      return `<p>${inline}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

const LEGAL_CONTENT_CSS = `
.legal-content section { margin-bottom: 2rem; }
.legal-content h2 { font-size: 1rem; font-weight: 600; margin-bottom: 0.6rem; color: hsl(var(--foreground)); }
.legal-content h3 { font-size: 0.875rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.4rem; color: hsl(var(--foreground)); }
.legal-content p { color: hsl(var(--muted-foreground)); margin-bottom: 0.6rem; line-height: 1.65; font-size: 0.875rem; }
.legal-content ul { list-style-type: disc; margin-left: 1.25rem; margin-bottom: 0.75rem; }
.legal-content li { color: hsl(var(--muted-foreground)); font-size: 0.875rem; line-height: 1.65; margin-bottom: 0.35rem; }
.legal-content a { color: hsl(var(--primary)); text-decoration: underline; }
.legal-content strong { color: hsl(var(--foreground)); font-weight: 600; }
.legal-content table { width: 100%; font-size: 0.75rem; border-collapse: collapse; margin-bottom: 0.75rem; }
.legal-content thead tr { border-bottom: 1px solid hsl(var(--border)); }
.legal-content th { text-align: left; padding: 0.4rem 0.75rem 0.4rem 0; font-weight: 600; color: hsl(var(--foreground)); }
.legal-content td { padding: 0.4rem 0.75rem 0.4rem 0; color: hsl(var(--muted-foreground)); border-bottom: 1px solid hsl(var(--border)); }
.legal-content code { font-family: monospace; font-size: 0.8em; }
`;

type Policy = {
  id: string;
  type: string;
  version: string;
  content: string;
  isActive: boolean;
  createdAt: string;
};

type Props = {
  type: "terms" | "privacy" | "cookie";
  title: string;
  description: string;
};

export default function LegalPage({ type, title, description }: Props) {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);

    fetch(`/api/policies/${type}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<Policy>;
      })
      .then((data) => {
        setPolicy(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [type]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("it-IT", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <style>{LEGAL_CONTENT_CSS}</style>

      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 pb-20 pt-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
          {policy && (
            <p className="text-xs text-muted-foreground mt-2">
              Versione {policy.version} · Aggiornata il {formatDate(policy.createdAt)}
            </p>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full rounded" />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="py-10 text-center text-muted-foreground text-sm">
            <p>Documento non disponibile al momento.</p>
            <p className="mt-1 text-xs">Riprova più tardi o contatta{" "}
              <a href="mailto:treeshare@treeshareapp.com" className="text-primary underline">
                treeshare@treeshareapp.com
              </a>
            </p>
          </div>
        )}

        {!loading && !error && policy && (
          <div
            className="legal-content"
            dangerouslySetInnerHTML={{ __html: renderContent(policy.content) }}
          />
        )}

        <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Termini e Condizioni
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/cookies" className="hover:text-foreground transition-colors">
            Cookie Policy
          </Link>
          <Link href="/" className="hover:text-foreground transition-colors ml-auto">
            Torna alla home
          </Link>
        </div>
      </main>
    </div>
  );
}
