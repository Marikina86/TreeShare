import { useState, useEffect } from "react";
import { useParams, useLocation, useSearch, Link } from "wouter";
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
  ownerStripeReady: boolean;
  latitude: number;
  longitude: number;
  createdAt: string;
}

interface MyAdoption {
  id: number;
  treeId: number;
  status: string;
  orgStatus: string | null;
  adoptionCode: string | null;
  endDate: string;
  treeName: string;
  shippingData: unknown | null;
}

interface ConnectStatus {
  connected: boolean;
  chargesEnabled: boolean;
  onboardingUrl?: string;
  detailsSubmitted?: boolean;
  accountId?: string;
}

const DURATION_OPTIONS = [
  { labelIt: "1 mese", labelEn: "1 month", days: 30 },
  { labelIt: "3 mesi", labelEn: "3 months", days: 90 },
  { labelIt: "6 mesi", labelEn: "6 months", days: 180 },
  { labelIt: "1 anno", labelEn: "1 year", days: 365 },
];

const T = {
  it: {
    loading: "Caricamento...",
    notFound: "Albero non trovato",
    back: "Torna agli alberi",
    full: "Adozioni esaurite",
    adopt: "Adotta questo albero",
    alreadyAdopted: "Hai già un'adozione attiva",
    activeUntil: "Attiva fino al",
    price: "Prezzo",
    duration: "Durata",
    days: "giorni",
    species: "Specie",
    desc: "Descrizione",
    pay: "Paga e adotta",
    cancel: "Annulla",
    paying: "Elaborazione...",
    successTitle: "Adozione avvenuta!",
    successMsg: "Hai adottato questo albero con successo.",
    expiresOn: "Scade il",
    adoptionCode: "Codice adozione",
    orgSection: "Gestione albero",
    editTitle: "Modifica titolo",
    editDesc: "Modifica descrizione",
    save: "Salva",
    saving: "Salvataggio...",
    deleteTree: "Elimina albero",
    confirmDelete: "Sei sicuro di voler eliminare questo albero?",
    loginToAdopt: "Accedi per adottare",
    of: "di",
    fee: "di cui 20% fee piattaforma → direttamente a Stripe",
    perAdoption: "/ adozione",
    error: "Errore",
    productDesc: "Cosa ricevi",
    stripeSection: "Pagamenti Stripe Connect",
    stripeConnected: "Stripe collegato ✓",
    stripeNotConnected: "Stripe non collegato",
    stripeIncomplete: "Onboarding incompleto",
    stripeConnectBtn: "Collega Stripe",
    stripeResumeBtn: "Completa onboarding",
    stripeRefreshBtn: "Aggiorna stato",
    stripeRefreshing: "Controllo in corso...",
    stripeConnecting: "Apertura Stripe...",
    stripeConnectSuccess: "Account Stripe collegato con successo!",
    stripeConnectRefresh: "Sessione Stripe scaduta — riprova il collegamento.",
    stripeNotReadyAdopt: "L'ente non ha ancora attivato i pagamenti. Contatta l'organizzazione.",
    stripeDesc: "Collega il tuo account bancario per ricevere direttamente gli importi delle adozioni (l'80% ti viene accreditato automaticamente da Stripe).",
    selectDuration: "Seleziona durata",
    selectedPrice: "Prezzo calcolato",
    shippingBtn: "📦 Invia i tuoi dati per la spedizione",
    shippingReceived: "✓ Dati ricevuti dall'ente",
    orgManageAdoptions: "Gestisci adozioni →",
  },
  en: {
    loading: "Loading...",
    notFound: "Tree not found",
    back: "Back to trees",
    full: "Adoptions full",
    adopt: "Adopt this tree",
    alreadyAdopted: "You already have an active adoption",
    activeUntil: "Active until",
    price: "Price",
    duration: "Duration",
    days: "days",
    species: "Species",
    desc: "Description",
    pay: "Pay and adopt",
    cancel: "Cancel",
    paying: "Processing...",
    successTitle: "Adoption complete!",
    successMsg: "You have successfully adopted this tree.",
    expiresOn: "Expires on",
    adoptionCode: "Adoption code",
    orgSection: "Tree management",
    editTitle: "Edit title",
    editDesc: "Edit description",
    save: "Save",
    saving: "Saving...",
    deleteTree: "Delete tree",
    confirmDelete: "Are you sure you want to delete this tree?",
    loginToAdopt: "Sign in to adopt",
    of: "of",
    fee: "of which 20% platform fee → direct to Stripe",
    perAdoption: "/ adoption",
    error: "Error",
    productDesc: "What you receive",
    stripeSection: "Stripe Connect Payments",
    stripeConnected: "Stripe connected ✓",
    stripeNotConnected: "Stripe not connected",
    stripeIncomplete: "Onboarding incomplete",
    stripeConnectBtn: "Connect Stripe",
    stripeResumeBtn: "Complete onboarding",
    stripeRefreshBtn: "Refresh status",
    stripeRefreshing: "Checking...",
    stripeConnecting: "Opening Stripe...",
    stripeConnectSuccess: "Stripe account connected successfully!",
    stripeConnectRefresh: "Stripe session expired — please try connecting again.",
    stripeNotReadyAdopt: "This organization has not yet activated payments. Contact the organization.",
    stripeDesc: "Connect your bank account to receive adoption payments directly (80% is automatically credited to you by Stripe).",
    selectDuration: "Select duration",
    selectedPrice: "Calculated price",
    shippingBtn: "📦 Send your shipping details",
    shippingReceived: "✓ Details received by the organization",
    orgManageAdoptions: "Manage adoptions →",
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
      const result = await stripe.confirmPayment({ elements, redirect: "if_required" });
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

function StripeConnectPanel({ treeId, t }: { treeId: number; t: typeof T.it }) {
  const { getToken } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusQuery = useQuery<ConnectStatus>({
    queryKey: ["adopt-connect-status", treeId],
    queryFn: async () => {
      const token = await getToken();
      const returnPath = encodeURIComponent(`/adopt/${treeId}`);
      const res = await fetch(`/api/adopt/connect/status?returnPath=${returnPath}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    staleTime: 30_000,
  });

  const queryClient = useQueryClient();

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["adopt-connect-status"] });
    await queryClient.invalidateQueries({ queryKey: ["adoptable-tree", treeId] });
    setRefreshing(false);
  }

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      if (status?.onboardingUrl) {
        window.location.href = status.onboardingUrl;
        return;
      }
      const token = await getToken();
      const res = await fetch("/api/adopt/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ returnPath: `/adopt/${treeId}` }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.error);
        setConnecting(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(t.error);
      setConnecting(false);
    }
  }

  const status = statusQuery.data;

  return (
    <div className="mt-2 p-3 bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-violet-700 dark:text-violet-300">{t.stripeSection}</h4>
        <button
          onClick={handleRefresh}
          disabled={refreshing || statusQuery.isLoading}
          className="text-[10px] text-violet-600 hover:underline disabled:opacity-50"
        >
          {refreshing ? t.stripeRefreshing : t.stripeRefreshBtn}
        </button>
      </div>

      {statusQuery.isLoading && (
        <div className="h-4 bg-violet-100 dark:bg-violet-900/30 rounded animate-pulse" />
      )}

      {!statusQuery.isLoading && status && (
        <>
          <div className="flex items-center gap-2 mb-2">
            {status.chargesEnabled ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full">
                ✓ {t.stripeConnected}
              </span>
            ) : status.connected ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full">
                ⚠ {t.stripeIncomplete}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded-full">
                ✗ {t.stripeNotConnected}
              </span>
            )}
          </div>

          {!status.chargesEnabled && (
            <>
              <p className="text-[11px] text-muted-foreground mb-2">{t.stripeDesc}</p>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {connecting
                  ? t.stripeConnecting
                  : status.connected
                    ? t.stripeResumeBtn
                    : t.stripeConnectBtn}
              </button>
            </>
          )}
        </>
      )}

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
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
    <div className="mt-6 p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-amber-700 dark:text-amber-300 text-sm">{t.orgSection}</h3>
        <Link href="/adopt/manage" className="text-xs text-amber-600 dark:text-amber-400 hover:underline">
          {t.orgManageAdoptions}
        </Link>
      </div>

      <StripeConnectPanel treeId={tree.id} t={t} />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {!editMode ? (
        <div className="flex gap-2">
          <button
            onClick={() => setEditMode(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors"
          >
            ✏️ {t.editTitle.split(" ")[0]}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {deleting ? "..." : `🗑 ${t.deleteTree}`}
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
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const stripeConnectResult = searchParams.get("stripe_connect");

  const [selectedDurationDays, setSelectedDurationDays] = useState<number | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [initiating, setInitiating] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [adopted, setAdopted] = useState(false);
  const [adoptedEndDate, setAdoptedEndDate] = useState<string | null>(null);
  const [adoptedCode, setAdoptedCode] = useState<string | null>(null);
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

  useEffect(() => {
    if (tree && selectedDurationDays === null) {
      setSelectedDurationDays(tree.durationDays);
    }
  }, [tree, selectedDurationDays]);

  const safeDuration = selectedDurationDays ?? (tree?.durationDays ?? 365);
  const calculatedPriceCents = tree
    ? Math.max(50, Math.round((tree.priceCents / tree.durationDays) * safeDuration))
    : 0;

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
        body: JSON.stringify({ treeId, selectedDurationDays: safeDuration }),
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
        setAdoptedCode(data.adoptionCode ?? null);
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

        {stripeConnectResult === "success" && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-300 dark:border-green-700 rounded-xl text-sm text-green-700 dark:text-green-300 font-medium">
            ✓ {t.stripeConnectSuccess}
          </div>
        )}
        {stripeConnectResult === "refresh" && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-300">
            ⚠ {t.stripeConnectRefresh}
          </div>
        )}

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

        {/* Stats: 2 columns (removed "Posti disponibili") */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-muted rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t.price}</p>
            <p className="font-bold text-foreground text-sm">€{(calculatedPriceCents / 100).toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">{t.perAdoption}</p>
          </div>
          <div className="bg-muted rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t.duration}</p>
            <p className="font-bold text-foreground text-sm">{safeDuration}</p>
            <p className="text-[10px] text-muted-foreground">{t.days}</p>
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

        <div className="mb-5 text-xs text-muted-foreground">
          📍 {tree.latitude.toFixed(4)}, {tree.longitude.toFixed(4)}
          {" · "}
          <a
            href={`https://www.openstreetmap.org/?mlat=${tree.latitude}&mlon=${tree.longitude}&zoom=15`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Vedi mappa
          </a>
        </div>

        {/* Success banner (just adopted) */}
        {adopted && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-300 dark:border-green-700 rounded-xl space-y-2">
            <h3 className="font-bold text-green-700 dark:text-green-300">{t.successTitle}</h3>
            <p className="text-sm text-green-700 dark:text-green-300">{t.successMsg}</p>
            {adoptedEndDate && (
              <p className="text-xs text-green-600 dark:text-green-400">
                {t.expiresOn}: {new Date(adoptedEndDate).toLocaleDateString()}
              </p>
            )}
            {adoptedCode && (
              <div className="mt-2 bg-white dark:bg-green-900/20 rounded-lg px-3 py-2 border border-green-200 dark:border-green-700">
                <p className="text-[10px] text-green-600 dark:text-green-400 font-medium uppercase tracking-wide">{t.adoptionCode}</p>
                <p className="font-mono font-bold text-green-800 dark:text-green-200 text-sm tracking-wider">{adoptedCode}</p>
              </div>
            )}

            {adoptedCode && (
              <a
                href={`mailto:${tree.ownerEmail}?subject=${encodeURIComponent(`ID adozione: ${adoptedCode}`)}`}
                className="mt-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center"
              >
                {t.shippingBtn}
              </a>
            )}
          </div>
        )}

        {/* Already-adopted banner */}
        {activeAdoption && !adopted && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
            <p className="font-semibold text-blue-700 dark:text-blue-300 text-sm">{t.alreadyAdopted}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {t.activeUntil}: {new Date(activeAdoption.endDate).toLocaleDateString()}
            </p>
            {activeAdoption.adoptionCode && (
              <div className="bg-white dark:bg-blue-900/20 rounded-lg px-3 py-2 border border-blue-200 dark:border-blue-700">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">{t.adoptionCode}</p>
                <p className="font-mono font-bold text-blue-800 dark:text-blue-200 text-sm tracking-wider">{activeAdoption.adoptionCode}</p>
              </div>
            )}
            {activeAdoption.orgStatus ? (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t.shippingReceived}</p>
            ) : (
              <a
                href={`mailto:${tree.ownerEmail}?subject=${encodeURIComponent(`ID adozione: ${activeAdoption.adoptionCode ?? activeAdoption.id}`)}`}
                className="mt-1 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center"
              >
                {t.shippingBtn}
              </a>
            )}
          </div>
        )}

        {initError && (
          <p className="text-red-500 text-sm mb-3">{initError}</p>
        )}

        {/* Duration selector — visible to all visitors on non-full, non-owned trees */}
        {!isOwner && !adopted && !activeAdoption && !isFull && !showPayment && (
          <div className="mb-4">
            <p className="text-sm font-medium text-foreground mb-2">{t.selectDuration}</p>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((opt) => {
                const price = Math.max(50, Math.round((tree.priceCents / tree.durationDays) * opt.days));
                const isSelected = safeDuration === opt.days;
                return (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setSelectedDurationDays(opt.days)}
                    className={`py-2 px-1 rounded-xl border text-center transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="text-xs font-semibold">{lang === "it" ? opt.labelIt : opt.labelEn}</p>
                    <p className={`text-[11px] mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      €{(price / 100).toFixed(2)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
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
              <>
                {!tree.ownerStripeReady && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mb-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    ⚠ {t.stripeNotReadyAdopt}
                  </p>
                )}
                <button
                  onClick={handleAdoptClick}
                  disabled={isFull || initiating || !tree.ownerStripeReady}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {initiating ? t.paying : isFull ? t.full : `${t.adopt} · €${(calculatedPriceCents / 100).toFixed(2)}`}
                </button>
              </>
            )}
            {user && showPayment && clientSecret && stripePromiseLoaded && (
              <div className="border border-border rounded-xl p-4 bg-card mt-2">
                <p className="text-sm font-medium text-foreground mb-1">
                  €{(calculatedPriceCents / 100).toFixed(2)} · {tree.title} · {safeDuration} {t.days}
                </p>
                <p className="text-xs text-muted-foreground mb-4">{t.fee}</p>
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
