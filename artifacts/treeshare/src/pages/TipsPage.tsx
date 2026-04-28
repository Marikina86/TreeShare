import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/i18n";
import { useGetMyProfile } from "@workspace/api-client-react";

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
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Categorie con icona e colore ────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { icon: string; cls: string }> = {
  general:         { icon: "🌿", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  piante:          { icon: "🌱", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  coltivazione:    { icon: "🧑‍🌾", cls: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400" },
  irrigazione:     { icon: "💧", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  potatura:        { icon: "✂️", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  fertilizzazione: { icon: "🪴", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  parassiti:       { icon: "🐛", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  stagioni:        { icon: "🍂", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

const TIP_CATEGORIES = Object.keys(CATEGORY_CONFIG);

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] ?? { icon: "🌿", cls: "bg-muted text-muted-foreground" };
}

// ─── Componente principale ────────────────────────────────────────────────────
export default function TipsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { lang } = useLang();

  const { data: myProfile } = useGetMyProfile();
  const isAdmin = (myProfile as any)?.isAdmin === true;

  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Stato pannello admin ─────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "general", imageUrl: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ─── authFetch ────────────────────────────────────────────────────────────
  const authFetch = useCallback(async (url: string, options?: RequestInit) => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
    });
  }, [getToken]);

  // ─── Carica consigli ──────────────────────────────────────────────────────
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

  useEffect(() => {
    fetchTips();
    markTipsRead();
    window.dispatchEvent(new Event("storage"));
  }, [fetchTips]);

  // ─── Upload immagine consiglio ────────────────────────────────────────────
  async function handleTipImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const mime = file.type || "image/jpeg";
      const ext = mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : "jpg";
      const res = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `tip.${ext}`, size: file.size, contentType: mime }),
      });
      if (!res.ok) throw new Error();
      const { uploadURL } = await res.json();
      const uploadRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": mime }, body: file });
      if (!uploadRes.ok) throw new Error();
      const { finalObjectPath } = await uploadRes.json();
      setForm((f) => ({ ...f, imageUrl: finalObjectPath }));
    } catch {
      toast({ title: lang === "it" ? "Errore caricamento foto" : "Photo upload error", variant: "destructive" });
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  // ─── Crea consiglio ───────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSubmitting(true);
    try {
      const res = await authFetch("/api/admin/tips", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          imageUrl: form.imageUrl || null,
        }),
      });
      if (!res.ok) throw new Error();
      const saved: Tip = await res.json();
      setTips((prev) => [saved, ...prev]);
      setForm({ title: "", description: "", category: "general", imageUrl: "" });
      setShowForm(false);
      toast({ title: lang === "it" ? "Consiglio pubblicato" : "Tip published" });
    } catch {
      toast({
        title: lang === "it" ? "Errore pubblicazione consiglio" : "Error publishing tip",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Elimina consiglio ────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const res = await authFetch(`/api/admin/tips/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTips((prev) => prev.filter((t) => t.id !== id));
      toast({ title: lang === "it" ? "Consiglio eliminato" : "Tip deleted" });
    } catch {
      toast({
        title: lang === "it" ? "Errore eliminazione consiglio" : "Error deleting tip",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

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
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
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

          {/* Pulsante nuovo consiglio (solo admin) */}
          {isAdmin && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {showForm ? (
                <>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/></svg>
                  {L({ it: "Annulla", en: "Cancel" })}
                </>
              ) : (
                <>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
                  {L({ it: "Nuovo consiglio", en: "New tip" })}
                </>
              )}
            </button>
          )}
        </div>

        {/* ── Formulario creazione (solo admin) ─────────────────────────────── */}
        {isAdmin && showForm && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-foreground mb-4 text-sm">
              {L({ it: "Pubblica un nuovo consiglio", en: "Publish a new tip" })}
            </h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={L({ it: "Titolo *", en: "Title *" })}
                required
                maxLength={200}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={L({ it: "Descrizione *", en: "Description *" })}
                required
                maxLength={3000}
                rows={5}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              />

              {/* Upload foto opzionale */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {L({ it: "Foto (opzionale)", en: "Photo (optional)" })}
                </label>
                {form.imageUrl ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={`/api/storage/objects/${form.imageUrl}`}
                      className="w-16 h-16 rounded-xl object-cover border border-border"
                      alt=""
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                      className="text-xs text-destructive hover:underline"
                    >
                      {L({ it: "Rimuovi", en: "Remove" })}
                    </button>
                  </div>
                ) : (
                  <>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleTipImageUpload} />
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={imageUploading}
                      className="flex items-center gap-1.5 w-fit px-3 py-1.5 border border-dashed border-border rounded-xl text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {imageUploading
                        ? <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      }
                      {imageUploading ? L({ it: "Caricamento...", en: "Uploading..." }) : L({ it: "Aggiungi foto", en: "Add photo" })}
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-end gap-3 flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {L({ it: "Categoria", en: "Category" })}
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {TIP_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{CATEGORY_CONFIG[c].icon} {c}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={submitting || imageUploading || !form.title.trim() || !form.description.trim()}
                  className="ml-auto px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting
                    ? L({ it: "Pubblicazione...", en: "Publishing..." })
                    : L({ it: "Pubblica", en: "Publish" })}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">
              {L({ it: "Caricamento...", en: "Loading...", fr: "Chargement...", pt: "Carregando...", es: "Cargando...", ja: "読み込み中..." })}
            </p>
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
              {isAdmin
                ? L({ it: "Usa il pulsante «Nuovo consiglio» per pubblicare il primo.", en: "Use the «New tip» button to publish the first one." })
                : L({ it: "Gli amministratori pubblicheranno presto consigli su piante e coltivazione.", en: "Admins will soon post tips about plants and growing.", fr: "Les administrateurs publieront bientôt des conseils sur les plantes.", pt: "Os administradores publicarão dicas em breve.", es: "Los administradores publicarán consejos próximamente.", ja: "管理者がもまもなく植物のヒントを投稿します。" })}
            </p>
          </div>
        )}

        {/* Lista consigli */}
        {!loading && tips.map((tip) => {
          const cat = getCategoryConfig(tip.category);
          const isDeleting = deletingId === tip.id;
          const isConfirming = confirmDeleteId === tip.id;

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
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cat.cls}`}>
                    {cat.icon} {tip.category}
                  </span>

                  {/* Pulsante elimina (solo admin) */}
                  {isAdmin && (
                    isConfirming ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(tip.id)}
                          disabled={isDeleting}
                          className="px-2 py-1 bg-destructive text-destructive-foreground rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                        >
                          {isDeleting
                            ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : L({ it: "Elimina", en: "Delete" })}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={isDeleting}
                          className="px-2 py-1 border border-border text-foreground rounded-lg text-xs font-medium hover:bg-muted"
                        >
                          {L({ it: "No", en: "No" })}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(tip.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title={L({ it: "Elimina consiglio", en: "Delete tip" })}
                      >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Immagine opzionale */}
              {tip.imageUrl && (
                <img
                  src={`/api/storage/objects/${tip.imageUrl}`}
                  alt={tip.title}
                  className="w-full h-40 object-cover rounded-xl mb-3"
                  loading="lazy"
                />
              )}

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
