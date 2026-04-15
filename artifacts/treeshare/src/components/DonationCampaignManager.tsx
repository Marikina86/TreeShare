import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { ManagerPhotoThumbnails, type CampaignPhoto } from "@/components/PhotoLightbox";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface Campaign {
  id: number;
  title: string;
  description: string;
  isActive: boolean;
  photos: CampaignPhoto[];
  durationDays: number | null;
  expiresAt: string | null;
  archivedAt?: string | null;
  storageTier?: "hot" | "cold";
  paymentStatus: string;
  pricePaidCents: number | null;
  treesPlanted?: number;
  co2Kg?: number;
  createdAt: string;
}

interface PricingOption {
  id: number;
  durationDays: number;
  priceCents: number;
  label: string;
}

const MAX_CAMPAIGN_PHOTOS = 10;

const t = {
  it: {
    title: "Le mie campagne",
    create: "Crea campagna",
    campaignTitle: "Titolo campagna",
    campaignDesc: "Descrizione",
    cancel: "Annulla",
    active: "Attiva",
    expired: "Scaduta",
    archived: "Archiviata",
    updated: "Campagna aggiornata",
    deleted: "Campagna eliminata",
    noData: "Nessuna campagna creata",
    addPhotos: "Aggiungi foto",
    photoUploading: "Caricamento...",
    maxPhotos: "Max 10 foto",
    edit: "Modifica",
    save: "Salva",
    delete: "Elimina",
    confirmDelete: "Sei sicuro di voler eliminare questa campagna?",
    confirmDeleteBtn: "Elimina",
    cancelDelete: "Annulla",
    selectDuration: "Seleziona durata",
    days: "giorni",
    expiresOn: "Scade il",
    payNow: "Paga e pubblica",
    processing: "Elaborazione...",
    paymentSuccess: "Pagamento completato! La campagna è ora attiva.",
    paymentError: "Errore nel pagamento",
    noPricing: "Nessun piano tariffario disponibile.",
    fillFields: "Compila titolo e descrizione",
    selectPlan: "Seleziona un piano",
    proceedPayment: "Procedi al pagamento",
    back: "Indietro",
    step1: "Dettagli campagna",
    step2: "Seleziona piano",
    step3: "Pagamento",
    next: "Avanti",
    renew: "Rinnova",
    renewSuccess: "Rinnovo completato! La campagna è stata estesa.",
    renewError: "Errore nel rinnovo",
    environmentalImpact: "Impatto ambientale",
    treesPlanted: "Alberi piantati",
    co2Offset: "CO₂ compensata",
    renewCampaign: "Rinnova campagna",
  },
  en: {
    title: "My campaigns",
    create: "Create campaign",
    campaignTitle: "Campaign title",
    campaignDesc: "Description",
    cancel: "Cancel",
    active: "Active",
    expired: "Expired",
    archived: "Archived",
    updated: "Campaign updated",
    deleted: "Campaign deleted",
    noData: "No campaigns created",
    addPhotos: "Add photos",
    photoUploading: "Uploading...",
    maxPhotos: "Max 10 photos",
    edit: "Edit",
    save: "Save",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this campaign?",
    confirmDeleteBtn: "Delete",
    cancelDelete: "Cancel",
    selectDuration: "Select duration",
    days: "days",
    expiresOn: "Expires on",
    payNow: "Pay and publish",
    processing: "Processing...",
    paymentSuccess: "Payment completed! Campaign is now active.",
    paymentError: "Payment error",
    noPricing: "No pricing plans available.",
    fillFields: "Fill in title and description",
    selectPlan: "Select a plan",
    proceedPayment: "Proceed to payment",
    back: "Back",
    step1: "Campaign details",
    step2: "Select plan",
    step3: "Payment",
    next: "Next",
    renew: "Renew",
    renewSuccess: "Renewal completed! Campaign has been extended.",
    renewError: "Renewal error",
    environmentalImpact: "Environmental impact",
    treesPlanted: "Trees planted",
    co2Offset: "CO₂ offset",
    renewCampaign: "Renew campaign",
  },
};

type Lang = keyof typeof t;

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function PaymentForm({ clientSecret, onSuccess, onCancel, l }: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
  l: typeof t.en;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message || l.paymentError);
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 py-3 border border-border rounded-xl text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {l.cancel}
        </button>
        <button
          type="submit"
          disabled={processing || !stripe}
          className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl text-base font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-600/25"
        >
          {processing ? l.processing : l.payNow}
        </button>
      </div>
    </form>
  );
}

export default function DonationCampaignManager({ accountType }: {
  accountType: string;
}) {
  const { getToken } = useAuth();
  const { lang } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const l = t[lang as Lang] || t.en;

  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [selectedPricing, setSelectedPricing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingForCampaign, setUploadingForCampaign] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [stripeReady, setStripeReady] = useState(!!stripePromise);
  const [renewingId, setRenewingId] = useState<number | null>(null);
  const [renewStep, setRenewStep] = useState<1 | 2>(1);
  const [renewSelectedPricing, setRenewSelectedPricing] = useState<number | null>(null);
  const [renewClientSecret, setRenewClientSecret] = useState<string | null>(null);
  const [renewPaymentIntentId, setRenewPaymentIntentId] = useState<string | null>(null);
  const [renewSaving, setRenewSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function authFetch(url: string, opts?: RequestInit) {
    const token = await getToken();
    return fetch(url, { ...opts, headers: { ...opts?.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  }

  const isOrg = accountType === "organization";

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["my-campaigns"],
    queryFn: async () => {
      const res = await authFetch("/api/donations/campaigns/my-campaigns");
      if (res.ok) return res.json();
      return [];
    },
    enabled: isOrg,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  const { data: pricing = [] } = useQuery<PricingOption[]>({
    queryKey: ["campaign-pricing"],
    queryFn: async () => {
      const res = await fetch("/api/donations/campaigns/pricing");
      if (res.ok) return res.json();
      return [];
    },
    enabled: isOrg,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  async function uploadFile(file: File): Promise<string> {
    const urlRes = await fetch("/api/storage/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "image/jpeg" }),
    });
    if (!urlRes.ok) throw new Error("Failed to get upload URL");
    const { uploadURL } = await urlRes.json();
    const uploadRes = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": file.type || "image/jpeg" },
      body: file,
    });
    if (!uploadRes.ok) throw new Error("Upload failed");
    const data = await uploadRes.json();
    return data.finalObjectPath as string;
  }

  async function handleFormPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const remaining = MAX_CAMPAIGN_PHOTOS - formPhotos.length;
    if (remaining <= 0) return;
    setUploadingPhoto(true);
    try {
      const toUpload = Array.from(files).slice(0, remaining);
      const paths: string[] = [];
      for (const file of toUpload) {
        paths.push(await uploadFile(file));
      }
      setFormPhotos((prev) => [...prev, ...paths].slice(0, MAX_CAMPAIGN_PHOTOS));
    } catch {
      toast({ title: "Upload error", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleCampaignPhotoUpload(campaignId: number, currentPhotos: CampaignPhoto[], e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const remaining = MAX_CAMPAIGN_PHOTOS - currentPhotos.length;
    if (remaining <= 0) return;
    setUploadingForCampaign(campaignId);
    try {
      const toUpload = Array.from(files).slice(0, remaining);
      const paths: string[] = [];
      for (const file of toUpload) {
        paths.push(await uploadFile(file));
      }
      const newPhotos = [...currentPhotos, ...paths].slice(0, MAX_CAMPAIGN_PHOTOS);
      const res = await authFetch(`/api/donations/campaigns/${campaignId}`, {
        method: "PATCH",
        body: JSON.stringify({ photos: newPhotos }),
      });
      if (res.ok) {
        toast({ title: l.updated });
        queryClient.invalidateQueries({ queryKey: ["my-campaigns"] });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.error || "Error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload error", variant: "destructive" });
    } finally {
      setUploadingForCampaign(null);
      const input = document.getElementById(`campaign-photo-${campaignId}`) as HTMLInputElement;
      if (input) input.value = "";
    }
  }

  async function handleRemovePhoto(campaignId: number, currentPhotos: CampaignPhoto[], photoIndex: number) {
    const newPhotos = currentPhotos.filter((_, i) => i !== photoIndex);
    const res = await authFetch(`/api/donations/campaigns/${campaignId}`, {
      method: "PATCH",
      body: JSON.stringify({ photos: newPhotos }),
    });
    if (res.ok) {
      toast({ title: l.updated });
      queryClient.invalidateQueries({ queryKey: ["my-campaigns"] });
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: data.error || "Error", variant: "destructive" });
    }
  }

  async function handleInitiateRenewal(campaignId: number, pricingId: number) {
    setRenewSaving(true);
    try {
      if (!stripePromise) {
        const configRes = await fetch("/api/donations/campaigns/stripe-config");
        if (configRes.ok) {
          const { publishableKey } = await configRes.json();
          stripePromise = loadStripe(publishableKey);
          setStripeReady(true);
        } else {
          toast({ title: l.renewError, variant: "destructive" });
          return;
        }
      }
      const res = await authFetch(`/api/donations/campaigns/${campaignId}/initiate-renewal`, {
        method: "POST",
        body: JSON.stringify({ pricingId }),
      });
      if (res.ok) {
        const data = await res.json();
        setRenewClientSecret(data.clientSecret);
        setRenewPaymentIntentId(data.paymentIntentId);
        setRenewStep(2);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: err.error || l.renewError, variant: "destructive" });
      }
    } finally {
      setRenewSaving(false);
    }
  }

  const handleRenewalSuccess = useCallback(async () => {
    if (!renewPaymentIntentId || !renewingId) return;
    try {
      const res = await authFetch(`/api/donations/campaigns/${renewingId}/confirm-renewal`, {
        method: "POST",
        body: JSON.stringify({ paymentIntentId: renewPaymentIntentId }),
      });
      if (res.ok) {
        toast({ title: l.renewSuccess });
        resetRenew();
        queryClient.invalidateQueries({ queryKey: ["my-campaigns"] });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.error || l.renewError, variant: "destructive" });
      }
    } catch {
      toast({ title: l.renewError, variant: "destructive" });
    }
  }, [renewPaymentIntentId, renewingId, queryClient, toast, l.renewSuccess, l.renewError]);

  function resetRenew() {
    setRenewingId(null);
    setRenewStep(1);
    setRenewSelectedPricing(null);
    setRenewClientSecret(null);
    setRenewPaymentIntentId(null);
  }

  function startEdit(c: Campaign) {
    setEditingId(c.id);
    setEditTitle(c.title);
    setEditDesc(c.description);
  }

  async function handleSaveEdit(campaignId: number) {
    setSaving(true);
    try {
      const res = await authFetch(`/api/donations/campaigns/${campaignId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
        }),
      });
      if (res.ok) {
        toast({ title: l.updated });
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: ["my-campaigns"] });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCampaign(campaignId: number) {
    try {
      const res = await authFetch(`/api/donations/campaigns/${campaignId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast({ title: l.deleted });
        setDeletingId(null);
        queryClient.invalidateQueries({ queryKey: ["my-campaigns"] });
      } else {
        const data = await res.json();
        toast({ title: data.error || "Error", variant: "destructive" });
        setDeletingId(null);
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
      setDeletingId(null);
    }
  }

  async function handleGoToPayment() {
    if (!selectedPricing || !formTitle.trim() || !formDesc.trim()) return;
    setSaving(true);
    try {
      if (!stripePromise) {
        const configRes = await fetch("/api/donations/campaigns/stripe-config");
        if (configRes.ok) {
          const { publishableKey } = await configRes.json();
          stripePromise = loadStripe(publishableKey);
          setStripeReady(true);
        } else {
          toast({ title: l.paymentError, variant: "destructive" });
          return;
        }
      }

      const res = await authFetch("/api/donations/campaigns/initiate-payment", {
        method: "POST",
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDesc.trim(),
          photos: formPhotos,
          pricingId: selectedPricing,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        setFormStep(3);
      } else {
        const err = await res.json();
        toast({ title: err.error || l.paymentError, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  }

  const handlePaymentSuccess = useCallback(async () => {
    if (!paymentIntentId) return;

    try {
      const res = await authFetch("/api/donations/campaigns/confirm-payment", {
        method: "POST",
        body: JSON.stringify({ paymentIntentId }),
      });

      if (res.ok) {
        toast({ title: l.paymentSuccess });
        resetForm();
        queryClient.invalidateQueries({ queryKey: ["my-campaigns"] });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.error || l.paymentError, variant: "destructive" });
      }
    } catch {
      toast({ title: l.paymentError, variant: "destructive" });
    }
  }, [paymentIntentId, queryClient, toast, l.paymentSuccess, l.paymentError]);

  function resetForm() {
    setShowForm(false);
    setFormStep(1);
    setFormTitle("");
    setFormDesc("");
    setFormPhotos([]);
    setSelectedPricing(null);
    setClientSecret(null);
    setPaymentIntentId(null);
  }

  function statusBadge(c: Campaign) {
    const now = new Date();
    if (c.paymentStatus === "paid" && c.isActive && c.expiresAt && new Date(c.expiresAt) > now) {
      return { label: l.active, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400", isActive: true };
    }
    if (c.archivedAt) {
      return { label: l.archived, cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400", isActive: false };
    }
    return { label: l.expired, cls: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400", isActive: false };
  }

  if (!isOrg) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {l.title}
      </h2>

      <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
        {campaigns.map((c) => {
          const photos = Array.isArray(c.photos) ? c.photos : [];
          const isEditing = editingId === c.id;
          const isDeleting = deletingId === c.id;
          const badge = statusBadge(c);

          return (
            <div key={c.id} className="px-5 py-4">
              {isDeleting ? (
                <div className="py-2">
                  <p className="text-sm text-foreground mb-3">{l.confirmDelete}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeletingId(null)}
                      className="flex-1 py-2 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted"
                    >
                      {l.cancelDelete}
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(c.id)}
                      className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700"
                    >
                      {l.confirmDeleteBtn}
                    </button>
                  </div>
                </div>
              ) : isEditing ? (
                <div className="space-y-3">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={l.campaignTitle}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background"
                  />
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder={l.campaignDesc}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="flex-1 py-2 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted"
                    >
                      {l.cancel}
                    </button>
                    <button
                      onClick={() => handleSaveEdit(c.id)}
                      disabled={saving || !editTitle || !editDesc}
                      className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? "..." : l.save}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {renewingId === c.id ? (
                    <div className="space-y-3 pt-1">
                      <p className="text-sm font-semibold text-foreground">{l.renewCampaign}: {c.title}</p>
                      {renewStep === 1 ? (
                        <>
                          <h3 className="text-xs font-medium text-muted-foreground">{l.selectDuration}</h3>
                          <div className="space-y-2">
                            {pricing.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => setRenewSelectedPricing(p.id)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-colors ${
                                  renewSelectedPricing === p.id
                                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                                    : "border-border hover:bg-muted text-foreground"
                                }`}
                              >
                                <span className="font-medium">{p.label} ({p.durationDays} {l.days})</span>
                                <span className="font-bold">€{(p.priceCents / 100).toFixed(2)}</span>
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button type="button" onClick={resetRenew} className="flex-1 py-2 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted">
                              {l.cancel}
                            </button>
                            <button
                              type="button"
                              onClick={() => renewSelectedPricing && handleInitiateRenewal(c.id, renewSelectedPricing)}
                              disabled={!renewSelectedPricing || renewSaving}
                              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {renewSaving ? l.processing : l.proceedPayment}
                            </button>
                          </div>
                        </>
                      ) : (renewClientSecret && stripeReady && stripePromise && (
                        <div className="space-y-4">
                          <Elements stripe={stripePromise} options={{ clientSecret: renewClientSecret, appearance: { theme: "stripe" } }}>
                            <PaymentForm
                              clientSecret={renewClientSecret}
                              onSuccess={handleRenewalSuccess}
                              onCancel={resetRenew}
                              l={l}
                            />
                          </Elements>
                        </div>
                      ))}
                    </div>
                  ) : (
                  <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {c.pricePaidCents != null && (
                          <span>€{(c.pricePaidCents / 100).toFixed(2)}</span>
                        )}
                        {c.durationDays && <span>{c.durationDays} {l.days}</span>}
                        {c.expiresAt && (
                          <span>{l.expiresOn}: {new Date(c.expiresAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-US", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        )}
                      </div>
                      {((c.treesPlanted ?? 0) > 0 || (c.co2Kg ?? 0) > 0) && (
                        <div className="flex items-center gap-3 mt-2 text-xs text-emerald-700 dark:text-emerald-400 flex-wrap">
                          <span className="font-medium">{l.environmentalImpact}:</span>
                          {(c.treesPlanted ?? 0) > 0 && (
                            <span>🌳 {c.treesPlanted} {l.treesPlanted}</span>
                          )}
                          {(c.co2Kg ?? 0) > 0 && (
                            <span>🌿 {c.co2Kg} kg {l.co2Offset}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <ManagerPhotoThumbnails
                    photos={photos}
                    onRemove={(i) => handleRemovePhoto(c.id, photos, i)}
                    campaignId={c.id}
                  />

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50 flex-wrap">
                    {photos.length < MAX_CAMPAIGN_PHOTOS && (
                      <>
                        <input
                          id={`campaign-photo-${c.id}`}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleCampaignPhotoUpload(c.id, photos, e)}
                        />
                        <button
                          onClick={() => document.getElementById(`campaign-photo-${c.id}`)?.click()}
                          disabled={uploadingForCampaign === c.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30 disabled:opacity-50"
                        >
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                          </svg>
                          {uploadingForCampaign === c.id ? l.photoUploading : `${l.addPhotos} (${photos.length}/${MAX_CAMPAIGN_PHOTOS})`}
                        </button>
                      </>
                    )}

                    {!badge.isActive && (
                      <button
                        onClick={() => { setRenewingId(c.id); setRenewStep(1); setRenewSelectedPricing(null); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                      >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/>
                        </svg>
                        {l.renew}
                      </button>
                    )}

                    <button
                      onClick={() => startEdit(c)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30"
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      {l.edit}
                    </button>

                    <button
                      onClick={() => setDeletingId(c.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {l.delete}
                    </button>
                  </div>
                  </>
                  )}
                </>
              )}
            </div>
          );
        })}

        {campaigns.length === 0 && !showForm && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">{l.noData}</div>
        )}

        {showForm ? (
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    formStep === step
                      ? "bg-emerald-600 text-white"
                      : formStep > step
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {formStep > step ? (
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : step}
                  </div>
                  <span className={`text-xs font-medium hidden sm:inline ${formStep === step ? "text-foreground" : "text-muted-foreground"}`}>
                    {step === 1 ? l.step1 : step === 2 ? l.step2 : l.step3}
                  </span>
                  {step < 3 && <div className="w-6 h-px bg-border mx-1" />}
                </div>
              ))}
            </div>

            {formStep === 1 && (
              <div className="space-y-3">
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={l.campaignTitle}
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background"
                />
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder={l.campaignDesc}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background resize-none"
                />

                {formPhotos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {formPhotos.map((p, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                        <img src={p.startsWith("http") ? p : `/api/storage${p.startsWith("/") ? "" : "/"}${p}`} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormPhotos((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {formPhotos.length < MAX_CAMPAIGN_PHOTOS && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFormPhotoUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="px-3 py-1.5 text-xs font-medium border border-dashed border-border rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                      {uploadingPhoto ? l.photoUploading : `${l.addPhotos} (${formPhotos.length}/${MAX_CAMPAIGN_PHOTOS})`}
                    </button>
                  </>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-2 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted"
                  >
                    {l.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStep(2)}
                    disabled={!formTitle.trim() || !formDesc.trim()}
                    className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {l.next}
                  </button>
                </div>
              </div>
            )}

            {formStep === 2 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">{l.selectDuration}</h3>
                <div className="space-y-2">
                  {pricing.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPricing(p.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-colors ${
                        selectedPricing === p.id
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                          : "border-border hover:bg-muted text-foreground"
                      }`}
                    >
                      <span className="font-medium">{p.label} ({p.durationDays} {l.days})</span>
                      <span className="font-bold">€{(p.priceCents / 100).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
                {pricing.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">{l.noPricing}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setFormStep(1)}
                    className="flex-1 py-2 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted"
                  >
                    {l.back}
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToPayment}
                    disabled={!selectedPricing || saving}
                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? l.processing : l.proceedPayment}
                  </button>
                </div>
              </div>
            )}

            {formStep === 3 && clientSecret && stripeReady && stripePromise && (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3 text-sm">
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">{formTitle}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{formDesc}</p>
                </div>
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                  <PaymentForm
                    clientSecret={clientSecret}
                    onSuccess={handlePaymentSuccess}
                    onCancel={resetForm}
                    l={l}
                  />
                </Elements>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 text-sm font-medium text-primary hover:bg-muted/50 transition-colors"
          >
            + {l.create}
          </button>
        )}
      </div>
    </section>
  );
}
