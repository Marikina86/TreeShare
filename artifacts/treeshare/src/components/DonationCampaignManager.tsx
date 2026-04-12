import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { ManagerPhotoThumbnails } from "@/components/PhotoLightbox";

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
    deleted: "Campagna eliminata",
    connectStripe: "Collega Stripe",
    connectStripeDesc: "Per ricevere i pagamenti, collega il tuo account Stripe. I fondi arrivano direttamente sul tuo conto (80%), la piattaforma trattiene il 20%.",
    stripeConnected: "Stripe collegato",
    totalReceived: "Totale ricevuto (80%)",
    noData: "Nessuna campagna creata",
    addPhotos: "Aggiungi foto",
    photoUploading: "Caricamento...",
    maxPhotos: "Max 3 foto",
    edit: "Modifica",
    delete: "Elimina",
    confirmDelete: "Sei sicuro di voler eliminare questa campagna?",
    confirmDeleteBtn: "Elimina",
    cancelDelete: "Annulla",
    cannotDelete: "Non puoi eliminare una campagna con donazioni. Puoi solo disattivarla.",
    goal: "Obiettivo",
    fundsInfo: "I fondi arrivano direttamente sul tuo account Stripe Connect.",
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
    deleted: "Campaign deleted",
    connectStripe: "Connect Stripe",
    connectStripeDesc: "To receive payments, connect your Stripe account. Funds go directly to your account (80%), platform retains 20%.",
    stripeConnected: "Stripe connected",
    totalReceived: "Total received (80%)",
    noData: "No campaigns created",
    addPhotos: "Add photos",
    photoUploading: "Uploading...",
    maxPhotos: "Max 3 photos",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this campaign?",
    confirmDeleteBtn: "Delete",
    cancelDelete: "Cancel",
    cannotDelete: "Cannot delete a campaign with donations. You can deactivate it instead.",
    goal: "Goal",
    fundsInfo: "Funds go directly to your Stripe Connect account.",
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
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingForCampaign, setUploadingForCampaign] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
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

  async function handleCampaignPhotoUpload(campaignId: number, currentPhotos: string[], e: React.ChangeEvent<HTMLInputElement>) {
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

  async function handleRemovePhoto(campaignId: number, currentPhotos: string[], photoIndex: number) {
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

  function startEdit(c: Campaign) {
    setEditingId(c.id);
    setEditTitle(c.title);
    setEditDesc(c.description);
    setEditGoal(c.goalAmount ? String(c.goalAmount / 100) : "");
  }

  async function handleSaveEdit(campaignId: number) {
    setSaving(true);
    try {
      const res = await authFetch(`/api/donations/campaigns/${campaignId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
          goalAmount: editGoal ? Number(editGoal) : null,
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

  async function handleToggleCampaign(id: number, isActive: boolean) {
    const res = await authFetch(`/api/donations/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      toast({ title: l.updated });
      queryClient.invalidateQueries({ queryKey: ["my-campaigns"] });
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: data.error || "Error", variant: "destructive" });
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
        toast({ title: data.error || l.cannotDelete, variant: "destructive" });
        setDeletingId(null);
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
      setDeletingId(null);
    }
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

  if (!isOrg) return null;

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

      {stripeAccountId && balance && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{l.totalReceived}</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">€{(balance.organizationBalance.totalOrgReceived / 100).toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400">{l.fundsInfo}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
        {campaigns.map((c) => {
          const photos = Array.isArray(c.photos) ? c.photos : [];
          const isEditing = editingId === c.id;
          const isDeleting = deletingId === c.id;

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
                  <input
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder={l.goalOptional}
                    type="text"
                    inputMode="decimal"
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background"
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
                  </div>

                  <ManagerPhotoThumbnails
                    photos={photos}
                    onRemove={(i) => handleRemovePhoto(c.id, photos, i)}
                    campaignId={c.id}
                  />

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
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
                      onClick={() => handleToggleCampaign(c.id, c.isActive)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${c.isActive ? "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400" : "border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"}`}
                    >
                      {c.isActive ? l.deactivate : l.activate}
                    </button>

                    <button
                      onClick={() => {
                        if (c.donationCount > 0) {
                          toast({ title: l.cannotDelete, variant: "destructive" });
                        } else {
                          setDeletingId(c.id);
                        }
                      }}
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
              <p className="text-xs text-muted-foreground mb-2">{l.maxPhotos}</p>
              {formPhotos.length > 0 && (
                <div className="flex gap-2 mb-2 overflow-x-auto">
                  {formPhotos.map((photo, i) => (
                    <div key={i} className="relative flex-shrink-0 group">
                      <img src={photoSrc(photo)} alt="" className="w-16 h-16 rounded-xl object-cover border border-border" />
                      <button
                        type="button"
                        onClick={() => setFormPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30 disabled:opacity-50"
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                    </svg>
                    {uploadingPhoto ? l.photoUploading : l.addPhotos}
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
