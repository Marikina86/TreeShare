import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/i18n";

// ─── Chiave localStorage per il timestamp dell'ultima lettura ────────────────
const TIPS_LAST_READ_KEY = "tips_last_read_at";

export function getTipsLastReadAt(): number {
  const v = localStorage.getItem(TIPS_LAST_READ_KEY);
  return v ? parseInt(v, 10) : 0;
}

export function markTipsRead() {
  localStorage.setItem(TIPS_LAST_READ_KEY, String(Date.now()));
}

// ─── Tipi ────────────────────────────────────────────────────────────────────
interface Tip {
  id: number;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Categorie con icona e colore ────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { icon: string; cls: string }> = {
  general:        { icon: "🌿", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  piante:         { icon: "🌱", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  coltivazione:   { icon: "🧑‍🌾", cls: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400" },
  irrigazione:    { icon: "💧", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  potatura:       { icon: "✂️", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  fertilizzazione:{ icon: "🪴", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  parassiti:      { icon: "🐛", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  stagioni:       { icon: "🍂", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] ?? { icon: "🌿", cls: "bg-muted text-muted-foreground" };
}

// ─── Componente principale ────────────────────────────────────────────────────
export default function TipsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { lang } = useLang();

  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTips = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/tips", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      setTips(await res.json());
    } catch {
      toast({
        title: lang === "it" ? "Errore caricamento consigli" : "Error loading tips",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [getToken, toast, lang]);

  // Carica consigli e segna come letti al montaggio
  useEffect(() => {
    fetchTips();
    markTipsRead();
    window.dispatchEvent(new Event("storage"));
  }, [fetchTips]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  const L = (map: Record<string, string>) => map[lang] ?? map["en"];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-4">
        {/* Intestazione */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-primary">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {L({ it: "Consigli", en: "Tips", fr: "Conseils", pt: "Dicas", es: "Consejos", ja: "ヒント" })}
              </h1>
              <p className="text-xs text-muted-foreground">
                {L({ it: "Suggerimenti e guide per la coltivazione", en: "Growing tips and guides", fr: "Conseils et guides de jardinage", pt: "Dicas e guias de cultivo", es: "Consejos y guías de cultivo", ja: "栽培のヒントとガイド" })}
              </p>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">{L({ it: "Caricamento...", en: "Loading...", fr: "Chargement...", pt: "Carregando...", es: "Cargando...", ja: "読み込み中..." })}</p>
          </div>
        )}

        {/* Stato vuoto */}
        {!loading && tips.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center">
              <span className="text-3xl">🌱</span>
            </div>
            <p className="font-semibold text-foreground">
              {L({ it: "Nessun consiglio ancora", en: "No tips yet", fr: "Aucun conseil encore", pt: "Nenhuma dica ainda", es: "Aún no hay consejos", ja: "まだヒントはありません" })}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {L({ it: "Gli amministratori pubblicheranno presto consigli su piante e coltivazione.", en: "Admins will soon post tips about plants and growing.", fr: "Les administrateurs publieront bientôt des conseils sur les plantes.", pt: "Os administradores publicarão dicas em breve.", es: "Los administradores publicarán consejos próximamente.", ja: "管理者がもまもなく植物のヒントを投稿します。" })}
            </p>
          </div>
        )}

        {/* Lista consigli */}
        {!loading && tips.map((tip) => {
          const cat = getCategoryConfig(tip.category);
          return (
            <article
              key={tip.id}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="font-bold text-foreground text-base leading-snug flex-1">
                  {tip.title}
                </h2>
                <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cat.cls}`}>
                  {cat.icon} {tip.category}
                </span>
              </div>

              {/* Descrizione */}
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mb-3">
                {tip.description}
              </p>

              {/* Footer */}
              <p className="text-xs text-muted-foreground/60">
                {formatDate(tip.createdAt)}
              </p>
            </article>
          );
        })}
      </div>
    </Layout>
  );
}
