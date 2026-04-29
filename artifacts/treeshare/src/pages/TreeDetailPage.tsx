import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetTree,
  useGetTreeUpdates,
  useAddTreeUpdate,
  useDeleteTree,
  getGetTreeUpdatesQueryKey,
  getListTreesQueryKey,
  getGetTreeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser, useAuth } from "@/lib/auth";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import LocationSearch, { type LocationResult } from "@/components/LocationSearch";
import ReportModal from "@/components/ReportModal";
import SunButton from "@/components/SunButton";
import { resizeToBlob } from "@/lib/imageUtils";

function photoSrc(url: string) {
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}

function googleEarthUrl(lat: number, lng: number) {
  return `https://earth.google.com/web/@${lat},${lng},0a,500d,35y,0h,45t,0r`;
}

export default function TreeDetailPage() {
  const params = useParams<{ treeId: string }>();
  const treeId = parseInt(params.treeId ?? "0");
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tree = useGetTree(treeId, { query: { enabled: !!treeId } });
  const updates = useGetTreeUpdates(treeId, { query: { enabled: !!treeId, queryKey: getGetTreeUpdatesQueryKey(treeId) } });
  const addUpdate = useAddTreeUpdate();
  const deleteTree = useDeleteTree();

  const [updatePhotoFile, setUpdatePhotoFile] = useState<File | null>(null);
  const [updatePhotoPreview, setUpdatePhotoPreview] = useState<string | null>(null);
  const [updateNote, setUpdateNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [verifyState, setVerifyState] = useState<"idle" | "verifying" | "ok" | "pending" | "rejected">("idle");
  const [verifyReason, setVerifyReason] = useState<string | null>(null);
  const [photoStatusForUpload, setPhotoStatusForUpload] = useState<"approved" | "pending">("approved");
  const [deletingUpdateId, setDeletingUpdateId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const [reportUpdateId, setReportUpdateId] = useState<number | null>(null);
  const [showReportUpdate, setShowReportUpdate] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editPlantName, setEditPlantName] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editSpecies, setEditSpecies] = useState("");
  const [editPlantedAt, setEditPlantedAt] = useState("");
  const [editLocationName, setEditLocationName] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editLatitude, setEditLatitude] = useState("");
  const [editLongitude, setEditLongitude] = useState("");

  const { isSignedIn, getToken } = useAuth();
  const isOwner = tree.data?.userId === user?.id;
  const canReport = isSignedIn && !isOwner && !!tree.data;
  const [showReport, setShowReport] = useState(false);

  function openEditModal() {
    const t = tree.data!;
    setEditPlantName((t as typeof t & { plantName?: string | null }).plantName ?? "");
    setEditCaption(t.caption ?? "");
    setEditSpecies(t.species ?? "");
    const pa = (t as typeof t & { plantedAt?: string | null }).plantedAt;
    setEditPlantedAt(pa ? pa.slice(0, 10) : "");
    setEditLocationName(t.locationName ?? "");
    setEditCountry(t.country ?? "");
    setEditLatitude(String(t.latitude));
    setEditLongitude(String(t.longitude));
    setShowEditModal(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    const lat = parseFloat(editLatitude);
    const lng = parseFloat(editLongitude);
    if ((editLatitude && isNaN(lat)) || (editLongitude && isNaN(lng))) {
      toast({ title: "Coordinate non valide", variant: "destructive" });
      return;
    }
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {
        plantName: editPlantName || null,
        caption: editCaption || null,
        species: editSpecies || null,
        plantedAt: editPlantedAt || null,
        locationName: editLocationName || null,
        country: editCountry || null,
      };
      if (editLatitude) body.latitude = lat;
      if (editLongitude) body.longitude = lng;

      const token = await getToken();
      const res = await fetch(`/api/trees/${treeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Errore nel salvataggio");
      await queryClient.invalidateQueries({ queryKey: getGetTreeQueryKey(treeId) });
      await queryClient.invalidateQueries({ queryKey: getListTreesQueryKey() });
      setShowEditModal(false);
      toast({ title: "Modifiche salvate!" });
    } catch {
      toast({ title: "Errore", description: "Impossibile salvare le modifiche.", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  }

  async function uploadPhoto(file: File): Promise<string> {
    const resized = await resizeToBlob(file, 1200);
    const mime = resized.type || "image/jpeg";
    const ext = mime === "image/webp" ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const finalName = `${baseName}.${ext}`;
    const res = await fetch("/api/storage/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: finalName, size: resized.size, contentType: mime }),
    });
    if (!res.ok) throw new Error("Failed to get upload URL");
    const { uploadURL } = await res.json();
    const uploadRes = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": mime },
      body: resized,
    });
    if (!uploadRes.ok) throw new Error("Upload failed");
    const uploadData = await uploadRes.json();
    return uploadData.finalObjectPath as string;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpdatePhotoFile(file);
    setVerifyState("idle");
    setVerifyReason(null);
    setPhotoStatusForUpload("approved");

    // Genera anteprima e avvia verifica AI in parallelo
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setUpdatePhotoPreview(dataUrl);

      // Verifica AI
      setVerifyState("verifying");
      try {
        const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;

        // 1️⃣ Check: è una pianta?
        const verRes = await fetch("/api/plants/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        if (!verRes.ok) throw new Error("verify failed");
        const verData = await verRes.json() as { isPlant?: boolean | null; aiUnavailable?: boolean; reason?: string };

        if (verData.isPlant === false) {
          // Non è una pianta → rifiuta subito
          setVerifyState("rejected");
          setVerifyReason(verData.reason ?? "L'immagine non sembra contenere una pianta.");
          setUpdatePhotoFile(null);
          setUpdatePhotoPreview(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        // 2️⃣ Check: stessa specie dell'originale? (solo se l'AI è disponibile e abbiamo la foto originale)
        const referencePhotoUrl = tree.data?.photoUrl;
        if (!verData.aiUnavailable && referencePhotoUrl) {
          const speciesRes = await fetch("/api/plants/verify-update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              newImageBase64: base64,
              referencePhotoUrl,
              species: tree.data?.species ?? null,
            }),
          });
          if (speciesRes.ok) {
            const speciesData = await speciesRes.json() as { sameSpecies?: boolean | null; aiUnavailable?: boolean; reason?: string };
            if (!speciesData.aiUnavailable && speciesData.sameSpecies === false) {
              // Specie diversa → rifiuta
              setVerifyState("rejected");
              setVerifyReason(speciesData.reason ?? "La specie della pianta non corrisponde a quella originale.");
              setUpdatePhotoFile(null);
              setUpdatePhotoPreview(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
              return;
            }
            if (speciesData.aiUnavailable) {
              // AI non ha potuto verificare la specie → revisione manuale
              setVerifyState("pending");
              setPhotoStatusForUpload("pending");
              return;
            }
          } else {
            // Errore di rete sul check specie → revisione manuale
            setVerifyState("pending");
            setPhotoStatusForUpload("pending");
            return;
          }
        }

        // Tutto ok
        if (verData.aiUnavailable) {
          setVerifyState("pending");
          setPhotoStatusForUpload("pending");
        } else {
          setVerifyState("ok");
          setPhotoStatusForUpload("approved");
        }
      } catch {
        // Errore di rete: procedi in pending
        setVerifyState("pending");
        setPhotoStatusForUpload("pending");
      }
    };
    reader.readAsDataURL(file);
  }

  function resetUpdateForm() {
    setUpdatePhotoFile(null);
    setUpdatePhotoPreview(null);
    setUpdateNote("");
    setShowUpdateForm(false);
    setVerifyState("idle");
    setVerifyReason(null);
    setPhotoStatusForUpload("approved");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeleteUpdate(updateId: number) {
    setDeletingUpdateId(updateId);
    try {
      const token = await getToken();
      const res = await fetch(`/api/trees/${treeId}/updates/${updateId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      queryClient.invalidateQueries({ queryKey: getGetTreeUpdatesQueryKey(treeId) });
      toast({ title: "Aggiornamento eliminato." });
    } catch {
      toast({ title: "Errore", description: "Impossibile eliminare l'aggiornamento.", variant: "destructive" });
    } finally {
      setDeletingUpdateId(null);
    }
  }

  async function handleAddUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!updatePhotoFile) {
      toast({ title: "Foto obbligatoria", description: "Seleziona una foto.", variant: "destructive" });
      return;
    }
    if (verifyState === "verifying") {
      toast({ title: "Attendi la verifica AI", description: "L'immagine è ancora in fase di verifica.", variant: "destructive" });
      return;
    }
    if (verifyState === "rejected") {
      toast({ title: "Foto non valida", description: "Scegli un'altra immagine.", variant: "destructive" });
      return;
    }
    try {
      setUploading(true);
      const objectPath = await uploadPhoto(updatePhotoFile);
      await addUpdate.mutateAsync({ treeId, data: { photoUrl: objectPath, note: updateNote || null, photoStatus: photoStatusForUpload } });
      queryClient.invalidateQueries({ queryKey: getGetTreeUpdatesQueryKey(treeId) });
      resetUpdateForm();
      if (photoStatusForUpload === "pending") {
        toast({ title: "Aggiornamento inviato", description: "La foto sarà revisionata dall'amministratore prima di essere pubblicata." });
      } else {
        toast({ title: "Aggiornamento aggiunto!" });
      }
    } catch {
      toast({ title: "Errore", description: "Impossibile aggiungere l'aggiornamento.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteTree.mutateAsync({ treeId });
      queryClient.invalidateQueries({ queryKey: getListTreesQueryKey() });
      toast({ title: "Pianta eliminata" });
      setLocation("/feed");
    } catch {
      toast({ title: "Errore", description: "Impossibile eliminare.", variant: "destructive" });
    } finally {
      setShowDeleteModal(false);
    }
  }

  if (tree.isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-6 animate-pulse space-y-4">
          <div className="aspect-video bg-muted rounded-xl" />
          <div className="h-6 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </Layout>
    );
  }

  if (tree.isError || !tree.data) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">Pianta non trovata.</div>
      </Layout>
    );
  }

  const t = tree.data;
  const mapsUrl = (t as typeof t & { mapsUrl?: string | null }).mapsUrl ?? `https://www.google.com/maps?q=${t.latitude},${t.longitude}&z=17`;
  const earthUrl = googleEarthUrl(t.latitude, t.longitude);

  const allPhotos = [
    { id: 0, photoUrl: t.photoUrl, note: t.caption ?? null, createdAt: t.createdAt, isMain: true },
    ...(updates.data ?? []).map((u) => ({ ...u, isMain: false, note: u.note ?? null })),
  ];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/feed")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5 group"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Torna indietro
        </button>

        {/* Header */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {((t as typeof t & { plantName?: string | null }).plantName) && (
                <h1 className="text-xl font-bold text-foreground mb-1">
                  🌱 {(t as typeof t & { plantName?: string | null }).plantName}
                </h1>
              )}
              <div className="flex flex-wrap gap-1.5 mb-1">
                {t.species && (
                  <div className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                    {t.species}
                  </div>
                )}
                {(t as typeof t & { plantedAt?: string | null }).plantedAt && (
                  <div className="inline-flex items-center gap-1.5 bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Piantata il {new Date((t as typeof t & { plantedAt?: string | null }).plantedAt!).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                  </div>
                )}
              </div>
              {!(t as typeof t & { plantName?: string | null }).plantName && (
                <h1 className="text-xl font-bold text-foreground">{t.species ?? "Pianta"}</h1>
              )}
              {(t.locationName || t.country) && (
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  </svg>
                  {t.locationName ?? t.country}
                </div>
              )}
            </div>
            {canReport && (
              <button
                onClick={() => setShowReport(true)}
                title="Segnala"
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground rounded-lg text-sm font-medium hover:text-destructive hover:border-destructive hover:bg-destructive/5 transition-colors"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="4" y1="22" x2="4" y2="15" strokeLinecap="round"/>
                </svg>
                Segnala
              </button>
            )}
          </div>
          {isOwner && (
            <div className="flex gap-2 flex-wrap mt-3">
              <button
                onClick={openEditModal}
                className="px-3 py-1.5 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Modifica
              </button>
              {(() => {
                const updateCount = updates.data?.length ?? 0;
                const atLimit = updateCount >= 9;
                return (
                  <button
                    onClick={() => !atLimit && setShowUpdateForm(!showUpdateForm)}
                    disabled={atLimit}
                    title={atLimit ? "Limite di 10 foto totali raggiunto" : "Aggiungi aggiornamento fotografico"}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity flex items-center gap-1.5 ${atLimit ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:opacity-90"}`}
                  >
                    + Aggiorna
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${atLimit ? "bg-destructive/20 text-destructive" : "bg-white/20"}`}>
                      {updateCount}/9
                    </span>
                  </button>
                );
              })()}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-1.5 border border-destructive text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors"
              >
                Elimina
              </button>
            </div>
          )}
        </div>

        {/* Sun rating */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
          <SunButton
            treeId={treeId}
            initialCount={(t as typeof t & { sunCount?: number }).sunCount ?? 0}
            initialSunned={(t as typeof t & { userHasSunned?: boolean }).userHasSunned ?? false}
            size="md"
          />
          {((t as typeof t & { sunCount?: number }).sunCount ?? 0) > 0 && (
            <span className="text-sm text-muted-foreground">
              {(t as typeof t & { sunCount?: number }).sunCount === 1
                ? "a 1 persona piace questa pianta"
                : `a ${(t as typeof t & { sunCount?: number }).sunCount} persone piace questa pianta`}
            </span>
          )}
        </div>

        {/* Add update form */}
        {showUpdateForm && isOwner && (
          <form onSubmit={handleAddUpdate} className="mb-6 p-4 bg-card border border-border rounded-xl space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Aggiungi aggiornamento fotografico</h3>

            {/* Selezione file */}
            <div>
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors overflow-hidden relative">
                {updatePhotoPreview ? (
                  <>
                    <img
                      src={updatePhotoPreview}
                      alt="Anteprima"
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay verifica AI */}
                    {verifyState === "verifying" && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-white text-xs font-medium">Verifica AI...</span>
                      </div>
                    )}
                    {verifyState === "ok" && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Verificata
                      </div>
                    )}
                    {verifyState === "pending" && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/></svg>
                        In revisione
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground py-4">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-medium">Scatta una foto</span>
                    <span className="text-xs text-muted-foreground/70">La foto deve essere scattata in tempo reale</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {/* Messaggio rifiuto AI */}
              {verifyState === "rejected" && verifyReason && (
                <div className="mt-2 p-2.5 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-destructive flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/>
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-destructive">Foto rifiutata dall'AI</p>
                    <p className="text-xs text-destructive/80 mt-0.5">{verifyReason}</p>
                  </div>
                </div>
              )}
              {verifyState === "pending" && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  L'AI non ha potuto verificare la foto. Sarà revisionata manualmente dall'amministratore.
                </p>
              )}
              {updatePhotoFile && verifyState !== "rejected" && (
                <p className="text-xs text-muted-foreground mt-1 truncate">{updatePhotoFile.name}</p>
              )}
            </div>

            <textarea
              value={updateNote}
              onChange={(e) => setUpdateNote(e.target.value)}
              placeholder="Note su questo aggiornamento..."
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={uploading || !updatePhotoFile || verifyState === "verifying" || verifyState === "rejected"}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {uploading ? "Caricamento..." : verifyState === "verifying" ? "Verifica in corso..." : "Aggiungi"}
              </button>
              <button
                type="button"
                onClick={resetUpdateForm}
                disabled={uploading}
                className="px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Annulla
              </button>
            </div>
          </form>
        )}

        {/* Timeline */}
        <div className="space-y-4">
          <h2 className="font-semibold text-foreground">
            Evoluzione nel tempo ({allPhotos.length} foto)
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {allPhotos.map((photo, index) => (
              <div key={photo.id} className="flex gap-4 items-start">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${photo.isMain ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {allPhotos.length - index}
                  </div>
                  {index < allPhotos.length - 1 && <div className="w-0.5 flex-1 bg-border mt-2 min-h-[24px]" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      {new Date(photo.createdAt).toLocaleDateString("it-IT", { year: "numeric", month: "long", day: "numeric" })}
                      {photo.isMain && <span className="text-primary font-medium">Piantagione iniziale</span>}
                      {/* Badge stato foto aggiornamento */}
                      {!photo.isMain && photo.photoStatus === "pending" && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/></svg>
                          In revisione
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Segnala aggiornamento (altri utenti, non owner, non foto principale) */}
                      {canReport && !photo.isMain && photo.photoStatus !== "pending" && (
                        <button
                          onClick={() => { setReportUpdateId(photo.id); setShowReportUpdate(true); }}
                          title="Segnala aggiornamento"
                          className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="4" y1="22" x2="4" y2="15" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )}
                      {/* Pulsante elimina aggiornamento (solo owner, non sulla foto principale) */}
                      {isOwner && !photo.isMain && (
                        <button
                          onClick={() => handleDeleteUpdate(photo.id)}
                          disabled={deletingUpdateId === photo.id}
                          title="Elimina aggiornamento"
                          className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        >
                          {deletingUpdateId === photo.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={`rounded-xl overflow-hidden border ${!photo.isMain && photo.photoStatus === "pending" ? "border-amber-300 dark:border-amber-700" : "border-border"}`}>
                    {!photo.isMain && photo.photoStatus === "pending" ? (
                      <div className="relative">
                        <img src={photoSrc(photo.photoUrl)} alt={`Foto ${index + 1}`} className="w-full aspect-video object-cover bg-black/5 dark:bg-white/5 opacity-60 blur-sm" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="bg-amber-500/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full">In attesa di revisione</span>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={photoSrc(photo.photoUrl)}
                        alt={`Foto ${index + 1}`}
                        className="w-full aspect-video object-cover bg-black/5 dark:bg-white/5 cursor-zoom-in"
                        onClick={() => setLightboxUrl(photoSrc(photo.photoUrl))}
                      />
                    )}
                  </div>
                  {photo.note && <p className="mt-2 text-sm text-foreground">{photo.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Location card */}
        <div className="mt-6 p-5 bg-card border border-border rounded-2xl">
          <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-primary">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            Posizione esatta
          </h3>
          <p className="font-mono text-sm text-muted-foreground mb-4">
            {t.latitude.toFixed(6)}, {t.longitude.toFixed(6)}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              Apri in Google Maps
            </a>
            <a
              href={earthUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="white" strokeWidth="1.5" fill="none"/>
              </svg>
              Apri in Google Earth
            </a>
          </div>
        </div>
      </div>

      {/* Edit tree modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 pb-20 sm:pb-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[calc(92dvh-5rem)] sm:max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <h2 className="font-semibold text-foreground text-lg">Modifica pianta</h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <form id="edit-tree-form" onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Nome pianta</label>
                <input
                  type="text"
                  value={editPlantName}
                  onChange={(e) => setEditPlantName(e.target.value)}
                  maxLength={100}
                  placeholder="es. Il mio tiglio"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Specie / tipo</label>
                <input
                  type="text"
                  value={editSpecies}
                  onChange={(e) => setEditSpecies(e.target.value)}
                  maxLength={100}
                  placeholder="es. Quercus robur"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Descrizione</label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Racconta la storia di questa pianta..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Data di piantagione</label>
                <input
                  type="date"
                  value={editPlantedAt}
                  onChange={(e) => setEditPlantedAt(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Posizione</p>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Cerca luogo</label>
                  <LocationSearch
                    value={editLocationName}
                    onChange={setEditLocationName}
                    onSelect={(r: LocationResult) => {
                      setEditLocationName(r.city || r.displayName);
                      setEditCountry(r.country);
                      setEditLatitude(String(r.lat));
                      setEditLongitude(String(r.lng));
                    }}
                    placeholder="es. Parco Sempione, Milano..."
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Seleziona un suggerimento per aggiornare le coordinate automaticamente.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Paese</label>
                  <input
                    type="text"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    maxLength={100}
                    placeholder="es. Italia"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Latitudine</label>
                    <input
                      type="number"
                      step="any"
                      value={editLatitude}
                      onChange={(e) => setEditLatitude(e.target.value)}
                      placeholder="es. 45.4654"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Longitudine</label>
                    <input
                      type="number"
                      step="any"
                      value={editLongitude}
                      onChange={(e) => setEditLongitude(e.target.value)}
                      placeholder="es. 9.1859"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    />
                  </div>
                </div>

                {editLatitude && editLongitude && !isNaN(parseFloat(editLatitude)) && !isNaN(parseFloat(editLongitude)) && (
                  <a
                    href={`https://www.google.com/maps?q=${editLatitude},${editLongitude}&z=15`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-2"
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    </svg>
                    Anteprima posizione su Google Maps
                  </a>
                )}
              </div>
            </form>

            {/* Modal footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                form="edit-tree-form"
                disabled={editSaving}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {editSaving ? "Salvataggio..." : "Salva modifiche"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete tree modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-destructive">
                  <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-lg">Elimina pianta</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Questa azione è <strong className="text-foreground">irreversibile</strong>. Verranno eliminati la foto, tutti gli aggiornamenti e il record dal database.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteTree.isPending}
                className="flex-1 py-2.5 bg-destructive text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {deleteTree.isPending ? "Eliminazione..." : "Elimina definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReport && tree.data && (
        <ReportModal
          targetType="tree"
          reportedUserId={tree.data.userId}
          treeId={treeId}
          onClose={() => setShowReport(false)}
        />
      )}

      {showReportUpdate && reportUpdateId != null && tree.data && (
        <ReportModal
          targetType="tree_update"
          reportedUserId={tree.data.userId}
          reportedUsername={(tree.data as typeof tree.data & { username?: string }).username}
          treeUpdateId={reportUpdateId}
          onClose={() => { setShowReportUpdate(false); setReportUpdateId(null); }}
        />
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-black/30 hover:bg-black/60 transition-colors"
            onClick={() => setLightboxUrl(null)}
            aria-label="Chiudi"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <img
            src={lightboxUrl}
            alt="Foto ingrandita"
            className="max-w-[95vw] max-h-[92vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Layout>
  );
}
