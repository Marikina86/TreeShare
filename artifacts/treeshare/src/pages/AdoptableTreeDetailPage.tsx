import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useAuth } from "@/lib/auth";
import { useUser } from "@/lib/auth";
import Layout from "@/components/Layout";
import { useLang } from "@/lib/i18n";

interface AdoptableTree {
  id: number;
  ownerId: string;
  ownerEmail: string;
  title: string;
  description: string;
  speciesName: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  productDescription: string | null;
  priceCents: number;
  durationDays: number;
  maxAdoptions: number;
  currentAdoptions: number;
  status: string;
  createdAt: string;
}

interface MyAdoption {
  id: number;
  treeId: number;
  status: string;
  endDate: string;
  treeName: string;
}

const T = {
  it: {
    loading: "Caricamento...",
    notFound: "Albero non trovato",
    back: "Torna agli alberi",
    full: "Adozioni esaurite",
    adopt: "Adotta questo albero",
    alreadyAdopted: "Hai già un'adozione attiva",
    activeUntil: "Attiva fino al",
    price: "Prezzo adozione",
    duration: "Durata",
    days: "giorni",
    slots: "Posti disponibili",
    species: "Specie",
    desc: "Descrizione",
    pay: "Paga e adotta",
    cancel: "Annulla",
    paying: "Elaborazione...",
    successTitle: "Adozione avvenuta!",
    successMsg: "Hai adottato questo albero con successo.",
    expiresOn: "Scade il",
    ownerContact: "Contatta l'ente",
    orgSection: "Gestione (admin ente)",
    editTitle: "Modifica titolo",
    editDesc: "Modifica descrizione",
    save: "Salva",
    saving: "Salvataggio...",
    deleteTree: "Elimina albero",
    confirmDelete: "Sei sicuro di voler eliminare questo albero?",
    deleted: "Albero eliminato.",
    loginToAdopt: "Accedi per adottare",
    of: "di",
    available: "disponibili",
    fee: "di cui alla piattaforma (20%)",
    perAdoption: "/ adozione",
    orgOnly: "Solo le organizzazioni possono gestire gli alberi.",
    error: "Errore",
    productDesc: "Cosa ricevi",
  },
  en: {
    loading: "Loading...",
    notFound: "Tree not found",
    back: "Back to trees",
    full: "Adoptions full",
    adopt: "Adopt this tree",
    alreadyAdopted: "You already have an active adoption",
    activeUntil: "Active until",
    price: "Adoption price",
    duration: "Duration",
    days: "days",
    slots: "Available slots",
    species: "Species",
    desc: "Description",
    pay: "Pay and adopt",
    cancel: "Cancel",
    paying: "Processing...",
    successTitle: "Adoption complete!",
    successMsg: "You have successfully adopted this tree.",
    expiresOn: "Expires on",
    ownerContact: "Contact the organization",
    orgSection: "Management (org admin)",
    editTitle: "Edit title",
    editDesc: "Edit description",
    save: "Save",
    saving: "Saving...",
    deleteTree: "Delete tree",
    confirmDelete: "Are you sure you want to delete this tree?",
    deleted: "Tree deleted.",
    loginToAdopt: "Sign in to adopt",
    of: "of",
    available: "available",
    fee: "of which platform fee (20%)",
    perAdoption: "/ adoption",
    orgOnly: "Only organizations can manage trees.",
    error: "Error",
    productDesc: "What you receive",
  },
};

let stripePromise: ReturnType<typeof loadStripe> | null = null;

async function loadStripeInstance() {
  if (!stripePromise) {
    const res = await fetch("/api/adopt/stripe-config");
    if (!res.ok) throw new Error("Stripe config unavailable");
    const { publishableKey } = await res.json();
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

function PaymentForm({
  clientSecret,
  onSuccess,
  onCancel,
  t,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
  t: typeof T.it;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);
    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (result.error) {
        setError(result.error.message ?? t.error);
        setPaying(false);
      } else {
        onSuccess();
      }
    } catch {
      setError(t.error);
      setPaying(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={paying || !stripe}
          className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {paying ? t.paying : t.pay}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={paying}
          className="px-4 py-2.5 rounded-lg bg-muted text-foreground text-sm hover:bg-muted/80 transition-colors"
        >
          {t.cancel}
        </button>
      </div>
    </form>
  );
}

function OrgManageSection({ tree, t }: { tree: AdoptableTree; t: typeof T.it }) {
  const { getToken } = useAuth() as any;
  const [, navigate] = useLocation();
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState(tree.title);
  const [description, setDescription] = useState(tree.description);
  const [productDescription, setProductDescription] = useState(tree.productDescription ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/adopt/trees/${tree.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, description, productDescription }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? t.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["adoptable-tree", tree.id] });
      await queryClient.invalidateQueries({ queryKey: ["adoptable-trees"] });
      await queryClient.invalidateQueries({ queryKey: ["adopt-my-trees"] });
      setEditMode(false);
    } catch {
      setError(t.error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t.confirmDelete)) return;
    setDeleting(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/adopt/trees/${tree.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? t.error);
        setDeleting(false);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["adoptable-trees"] });
      await queryClient.invalidateQueries({ queryKey: ["adopt-my-trees"] });
      navigate("/adopt");
    } catch {
      setError(t.error);
      setDeleting(false);
    }
  }

  return (
    <div className="mt-6 p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 rounded-xl">
      <h3 className="font-semibold text-amber-700 dark:text-amber-300 text-sm mb-3">{t.orgSection}</h3>
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      {!editMode ? (
        <div className="flex gap-2">
          <button
            onClick={() => setEditMode(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors"
          >
            {t.save} / {t.editTitle.split(" ")[0]}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {deleting ? "..." : t.deleteTree}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t.editTitle}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t.editDesc}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t.productDesc}</label>
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              rows={2}
              className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? t.saving : t.save}
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdoptableTreeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const treeId = Number(id);
  const { lang } = useLang();
  const { getToken, userId } = useAuth() as any;
  const { user } = useUser();
  const t = T[lang as "it" | "en"] ?? T.it;
  const queryClient = useQueryClient();

  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [initiating, setInitiating] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [adopted, setAdopted] = useState(false);
  const [adoptedEndDate, setAdoptedEndDate] = useState<string | null>(null);
  const [stripePromiseLoaded, setStripePromiseLoaded] = useState<ReturnType<typeof loadStripe> | null>(null);

  const treeQuery = useQuery<AdoptableTree>({
    queryKey: ["adoptable-tree", treeId],
    queryFn: async () => {
      const res = await fetch(`/api/adopt/trees/${treeId}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    staleTime: 30_000,
    enabled: !isNaN(treeId),
  });

  const myAdoptionsQuery = useQuery<MyAdoption[]>({
    queryKey: ["adopt-my-adoptions"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/adopt/my-adoptions", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const activeAdoption = myAdoptionsQuery.data?.find(
    (a) => a.treeId === treeId && a.status === "active",
  );

  const tree = treeQuery.data;
  const isOwner = !!userId && tree?.ownerId === userId;
  const isFull = tree?.status === "full" || (tree?.currentAdoptions ?? 0) >= (tree?.maxAdoptions ?? 0);

  async function handleAdoptClick() {
    if (!userId) return;
    setInitiating(true);
    setInitError(null);
    try {
      const sp = await loadStripeInstance();
      setStripePromiseLoaded(sp);
      const token = await getToken();
      const res = await fetch("/api/adopt/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ treeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInitError(data.error ?? t.error);
        return;
      }
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setShowPayment(true);
    } catch {
      setInitError(t.error);
    } finally {
      setInitiating(false);
    }
  }

  async function handlePaymentSuccess() {
    if (!paymentIntentId) return;
    try {
      const token = await getToken();
      const res = await fetch("/api/adopt/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentIntentId }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdopted(true);
        setAdoptedEndDate(data.endDate ?? null);
        setShowPayment(false);
        await queryClient.invalidateQueries({ queryKey: ["adoptable-tree", treeId] });
        await queryClient.invalidateQueries({ queryKey: ["adoptable-trees"] });
        await queryClient.invalidateQueries({ queryKey: ["adopt-my-adoptions"] });
      } else {
        setInitError(data.error ?? t.error);
        setShowPayment(false);
      }
    } catch {
      setInitError(t.error);
      setShowPayment(false);
    }
  }

  if (treeQuery.isLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-6 animate-pulse space-y-4">
          <div className="h-64 bg-muted rounded-2xl" />
          <div className="h-6 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-full" />
        </div>
      </Layout>
    );
  }

  if (treeQuery.isError || !tree) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">{t.notFound}</p>
          <Link href="/adopt" className="mt-4 inline-block text-primary text-sm hover:underline">← {t.back}</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link href="/adopt" className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground mb-4 transition-colors">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t.back}
        </Link>

        {tree.imageUrl && (
          <div className="rounded-2xl overflow-hidden mb-4 bg-muted max-h-72">
            <img src={tree.imageUrl} alt={tree.title} className="w-full h-72 object-cover" />
          </div>
        )}
        {!tree.imageUrl && (
          <div className="rounded-2xl overflow-hidden mb-4 bg-muted h-40 flex items-center justify-center">
            <span className="text-7xl">🌳</span>
          </div>
        )}

        <div className="space-y-1 mb-4">
          <h1 className="text-2xl font-bold text-foreground">{tree.title}</h1>
          {tree.speciesName && (
            <p className="text-muted-foreground text-sm italic">{tree.speciesName}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-muted rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t.price}</p>
            <p className="font-bold text-foreground text-sm">€{(tree.priceCents / 100).toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">{t.perAdoption}</p>
          </div>
          <div className="bg-muted rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t.duration}</p>
            <p className="font-bold text-foreground text-sm">{tree.durationDays}</p>
            <p className="text-[10px] text-muted-foreground">{t.days}</p>
          </div>
          <div className="bg-muted rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t.slots}</p>
            <p className={`font-bold text-sm ${isFull ? "text-red-500" : "text-green-600"}`}>
              {isFull ? t.full : tree.maxAdoptions - tree.currentAdoptions}
            </p>
            <p className="text-[10px] text-muted-foreground">{t.of} {tree.maxAdoptions}</p>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="font-semibold text-foreground mb-1.5">{t.desc}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">{tree.description}</p>
        </div>

        {tree.productDescription && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl">
            <h2 className="font-semibold text-green-700 dark:text-green-300 text-sm mb-1">{t.productDesc}</h2>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{tree.productDescription}</p>
          </div>
        )}

        <div className="mb-2 text-xs text-muted-foreground">
          📍 {tree.latitude.toFixed(4)}, {tree.longitude.toFixed(4)}
        </div>

        <a
          href={`mailto:${tree.ownerEmail}`}
          className="inline-flex items-center gap-1 text-primary text-sm hover:underline mb-5"
        >
          ✉️ {t.ownerContact}
        </a>

        {adopted && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-300 dark:border-green-700 rounded-xl">
            <h3 className="font-bold text-green-700 dark:text-green-300">{t.successTitle}</h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">{t.successMsg}</p>
            {adoptedEndDate && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {t.expiresOn}: {new Date(adoptedEndDate).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {activeAdoption && !adopted && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="font-semibold text-blue-700 dark:text-blue-300 text-sm">{t.alreadyAdopted}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {t.activeUntil}: {new Date(activeAdoption.endDate).toLocaleDateString()}
            </p>
          </div>
        )}

        {initError && (
          <p className="text-red-500 text-sm mb-3">{initError}</p>
        )}

        {!isOwner && !adopted && !activeAdoption && (
          <>
            {!user && (
              <Link href="/sign-in">
                <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
                  {t.loginToAdopt}
                </button>
              </Link>
            )}
            {user && !showPayment && (
              <button
                onClick={handleAdoptClick}
                disabled={isFull || initiating}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {initiating ? t.paying : isFull ? t.full : t.adopt}
              </button>
            )}
            {user && showPayment && clientSecret && stripePromiseLoaded && (
              <div className="border border-border rounded-xl p-4 bg-card mt-2">
                <p className="text-sm font-medium text-foreground mb-3">
                  €{(tree.priceCents / 100).toFixed(2)} · {tree.title}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {Math.round(tree.priceCents * 0.2 / 100 * 100) / 100}€ {t.fee}
                </p>
                <Elements stripe={stripePromiseLoaded} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                  <PaymentForm
                    clientSecret={clientSecret}
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => setShowPayment(false)}
                    t={t}
                  />
                </Elements>
              </div>
            )}
          </>
        )}

        {isOwner && <OrgManageSection tree={tree} t={t} />}
      </div>
    </Layout>
  );
}
