import { useState, useRef } from "react";
import { useAuth } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: number;
  title: string;
  description: string;
  goalAmount: number | null;
  isActive: boolean;
  totalRaised: number;
  donationCount: number;
  photos: string[];
}

const MIN_PAYOUT_BALANCE_CENTS = 600;
const MAX_CAMPAIGN_PHOTOS = 3;

const t = {
  it: {
    title: "Campagne donazioni",
    create: "Crea campagna",
    campaignTitle: "Titolo campagna",
    campaignDesc: "Descrizione",
    goalOptional: "Obiettivo € (opzionale)",
    save: "Salva",
    cancel: "Annulla",
    active: "Attiva",
    inactive: "Non attiva",
    raised: "Raccolti",
    donations: "donazioni",
    noGoal: "Nessun obiettivo",
    activate: "Attiva",
    deactivate: "Disattiva",
    created: "Campagna creata",
    updated: "Campagna aggiornata",
    connectStripe: "Collega Stripe",
    connectStripeDesc: "Per ricevere i pagamenti, collega il tuo account Stripe.",
    stripeConnected: "Stripe collegato",
    balance: "Saldo disponibile",
    totalReceived: "Totale ricevuto",
    totalPaidOut: "Totale erogato",
    requestPayout: "Richiedi pagamento",
    payoutRequested: "Pagamento richiesto",
    payoutFee: "Costo payout: €5,00",
    minPayout: "Saldo minimo per payout: €6,00",
    noData: "Nessuna campagna creata",
    addPhotos: "Aggiungi foto",
    removePhoto: "Rimuovi",
    photoUploading: "Caricamento...",
    maxPhotos: "Max 3 foto per campagna",
  },
  en: {
    title: "Donation campaigns",
    create: "Create campaign",
    campaignTitle: "Campaign title",
    campaignDesc: "Description",
    goalOptional: "Goal € (optional)",
    save: "Save",
    cancel: "Cancel",
    active: "Active",
    inactive: "Inactive",
    raised: "Raised",
    donations: "donations",
    noGoal: "No goal",
    activate: "Activate",
    deactivate: "Deactivate",
    created: "Campaign created",
    updated: "Campaign updated",
    connectStripe: "Connect Stripe",
    connectStripeDesc: "To receive payments, connect your Stripe account.",
    stripeConnected: "Stripe connected",
    balance: "Available balance",
    totalReceived: "Total received",
    totalPaidOut: "Total paid out",
    requestPayout: "Request payout",
    payoutRequested: "Payout requested",
    payoutFee: "Payout fee: €5.00",
    minPayout: "Minimum payout balance: €6.00",
    noData: "No campaigns created",
    addPhotos: "Add photos",
    removePhoto: "Remove",
    photoUploading: "Uploading...",
    maxPhotos: "Max 3 photos per campaign",
  },
};

type Lang = keyof typeof t;

function photoSrc(url: string) {
  if (url.startsWith("http")) return url;
  return `/api/storage${url.startsWith("/") ? "" : "/"}${url}`;
}

export default function DonationCampaignManager({ accountType, stripeAccountId, onRefreshProfile }: {
  accountType: string;
  stripeAccountId: string | null;
  onRefreshProfile: () => void;
}) {
  const { getToken } = useAuth();
  const { lang } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const l = t[lang as Lang] || t.en;

  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formGoal, setFormGoal] = useState("");
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [payingOut, setPayingOut] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingForCampaign, setUploadingForCampaign] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function authFetch(url: string, opts?: RequestInit) {
    const token = await getToken();
    return fetch(url, { ...opts, headers: { ...opts?.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  }

  const isOrg = accountType === "organization";

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["my-campaigns"],
    queryFn: async () => {
      const res = await authFetch("/api/donations/my-campaigns");
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

  const { data: balance } = useQuery<any>({
    queryKey: ["org-balance"],
    queryFn: async () => {
      const res = await authFetch("/api/donations/balance");
      if (res.ok) return res.json();
      return null;
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
        const path = await uploadFile(file);
        paths.push(path);
      }
      setFormPhotos((prev) => [...prev, ...paths].slice(0, MAX_CAMPAIGN_PHOTOS));
    } catch {
      toast({ title: "Upload error", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleExistingCampaignPhotoUpload(campaignId: number, currentPhotos: string[], e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const remaining = MAX_CAMPAIGN_PHOTOS - currentPhotos.length;
    if (remaining <= 0) return;

    setUploadingForCampaign(campaignId);
    try {
      const toUpload = Array.from(files).slice(0, remaining);
      const paths: string[] = [];
      for (const file of toUpload) {
        const path = await uploadFile(file);
        paths.push(path);
      }
      const newPhotos = [...currentPhotos, ...paths].slice(0, MAX_CAMPAIGN_PHOTOS);
      await authFetch(`/api/donations/campaigns/${campaignId}`, {
        method: "PATCH",
        body: JSON.stringify({ photos: newPhotos }),
      });
      toast({ title: l.updated });
      queryClient.invalidateQueries({ queryKey: ["my-campaigns"] });
    } catch {
      toast({ title: "Upload error", variant: "destructive" });
    } finally {
      setUploadingForCampaign(null);
      const input = document.getElementById(`campaign-photo-${campaignId}`) as HTMLInputElement;
      if (input) input.value = "";
    }
  }

  async function handleRemovePhoto(campaignId: number, currentPhotos: string[], photoIndex: number) {
    const newPhotos = currentPhotos.filter((_, i) => i !== photoIndex);
    await authFetch(`/api/donations/campaigns/${campaignId}`, {
      method: "PATCH",
      body: JSON.stringify({ photos: newPhotos }),
    });
    toast({ title: l.updated });
    queryClient.invalidateQueries({ queryKey: ["my-campaigns"] });
  }

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch("/api/donations/campaigns", {
        method: "POST",
        body: JSON.stringify({
          title: formTitle,
          description: formDesc,
          goalAmount: formGoal ? Number(formGoal) : null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        if (formPhotos.length > 0) {
          await authFetch(`/api/donations/campaigns/${created.id}`, {
            method: "PATCH",
            body: JSON.stringify({ photos: formPhotos }),
          });
        }
        toast({ title: l.created });
        setShowForm(false);
        setFormTitle("");
        setFormDesc("");
        setFormGoal("");
        setFormPhotos([]);
        queryClient.invalidateQueries({ queryKey: ["my-campaigns"] });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleCampaign(id: number, isActive: boolean) {
    await authFetch(`/api/donations/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !isActive }),
    });
    toast({ title: l.updated });
    queryClient.invalidateQueries({ queryKey: ["my-campaigns"] });
  }

  async function handleConnectStripe() {
    setConnectingStripe(true);
    try {
      const res = await authFetch("/api/donations/connect-stripe", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else if (data.alreadyConnected) {
        toast({ title: l.stripeConnected });
        onRefreshProfile();
      }
    } finally {
      setConnectingStripe(false);
    }
  }

  async function handleRequestPayout() {
    setPayingOut(true);
    try {
      const res = await authFetch("/api/donations/request-payout", { method: "POST" });
      if (res.ok) {
        toast({ title: l.payoutRequested });
        queryClient.invalidateQueries({ queryKey: ["org-balance"] });
      } else {
        const data = await res.json();
        toast({ title: data.error, variant: "destructive" });
      }
    } finally {
      setPayingOut(false);
    }
  }

  if (!isOrg) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {l.title}
      </h2>

      {!stripeAccountId && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">{l.connectStripeDesc}</p>
          <button
            onClick={handleConnectStripe}
            disabled={connectingStripe}
            className="px-4 py-2 bg-[#635bff] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {connectingStripe ? "..." : l.connectStripe}
          </button>
        </div>
      )}

      {balance && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <div className="grid grid-cols-3 gap-4 text-center mb-3">
            <div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">€{(balance.organizationBalance.availableBalance / 100).toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground">{l.balance}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">€{(balance.organizationBalance.totalOrgReceived / 100).toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground">{l.totalReceived}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">€{(balance.organizationBalance.totalPaidOut / 100).toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground">{l.totalPaidOut}</div>
            </div>
          </div>
          {stripeAccountId && balance.organizationBalance.availableBalance >= MIN_PAYOUT_BALANCE_CENTS && (
            <div className="border-t border-border pt-3">
              <p className="text-[10px] text-muted-foreground mb-2">{l.payoutFee}</p>
              <button
                onClick={handleRequestPayout}
                disabled={payingOut}
                className="w-full py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {payingOut ? "..." : l.requestPayout}
              </button>
            </div>
          )}
          {stripeAccountId && balance.organizationBalance.availableBalance < MIN_PAYOUT_BALANCE_CENTS && balance.organizationBalance.availableBalance > 0 && (
            <p className="text-[10px] text-muted-foreground border-t border-border pt-2 mt-2">{l.minPayout}</p>
          )}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
        {campaigns.map((c) => {
          const photos = Array.isArray(c.photos) ? c.photos : [];
          return (
            <div key={c.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {c.isActive ? l.active : l.inactive}
                    </span>
                    <span>€{(c.totalRaised / 100).toFixed(2)} {l.raised}</span>
                    <span>{c.donationCount} {l.donations}</span>
                    {c.goalAmount && <span>/ €{(c.goalAmount / 100).toFixed(2)}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleCampaign(c.id, c.isActive)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${c.isActive ? "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400" : "border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"}`}
                >
                  {c.isActive ? l.deactivate : l.activate}
                </button>
              </div>

              {photos.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative flex-shrink-0">
                      <img
                        src={photoSrc(photo)}
                        alt=""
                        className="w-20 h-20 rounded-xl object-cover border border-border"
                      />
                      <button
                        onClick={() => handleRemovePhoto(c.id, photos, i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photos.length < MAX_CAMPAIGN_PHOTOS && (
                <div className="mt-2">
                  <input
                    id={`campaign-photo-${c.id}`}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleExistingCampaignPhotoUpload(c.id, photos, e)}
                  />
                  <button
                    onClick={() => document.getElementById(`campaign-photo-${c.id}`)?.click()}
                    disabled={uploadingForCampaign === c.id}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    {uploadingForCampaign === c.id ? l.photoUploading : `+ ${l.addPhotos} (${photos.length}/${MAX_CAMPAIGN_PHOTOS})`}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {campaigns.length === 0 && !showForm && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">{l.noData}</div>
        )}

        {showForm ? (
          <form onSubmit={handleCreateCampaign} className="px-5 py-4 space-y-3">
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder={l.campaignTitle}
              required
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background"
            />
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder={l.campaignDesc}
              required
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background resize-none"
            />
            <input
              value={formGoal}
              onChange={(e) => setFormGoal(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder={l.goalOptional}
              type="text"
              inputMode="decimal"
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background"
            />

            <div>
              <p className="text-xs text-muted-foreground mb-1">{l.maxPhotos}</p>
              {formPhotos.length > 0 && (
                <div className="flex gap-2 mb-2 overflow-x-auto">
                  {formPhotos.map((photo, i) => (
                    <div key={i} className="relative flex-shrink-0">
                      <img src={photoSrc(photo)} alt="" className="w-16 h-16 rounded-xl object-cover border border-border" />
                      <button
                        type="button"
                        onClick={() => setFormPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold hover:bg-red-600"
                      >
                        ×
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
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    {uploadingPhoto ? l.photoUploading : `+ ${l.addPhotos}`}
                  </button>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormPhotos([]); }}
                className="flex-1 py-2 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted"
              >
                {l.cancel}
              </button>
              <button
                type="submit"
                disabled={saving || !formTitle || !formDesc}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "..." : l.save}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full px-5 py-4 text-sm font-medium text-primary hover:bg-muted transition-colors text-left"
          >
            + {l.create}
          </button>
        )}
      </div>
    </section>
  );
}
