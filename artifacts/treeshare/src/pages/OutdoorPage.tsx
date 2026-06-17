import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "@/components/Layout";
import { useAuth, useUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

// ── Tipi ─────────────────────────────────────────────────────────────────────

type ReportType = "fallen_tree" | "landslide" | "path_interrupted" | "bridge_damaged" | "garbage";

interface TrailReport {
  id: number;
  userId: string;
  type: ReportType;
  description: string | null;
  photoUrl: string | null;
  latitude: number;
  longitude: number;
  locationName: string | null;
  createdAt: string;
  stillPresentCount: number;
  notPresentCount: number;
  userConfirmation?: "still_present" | "not_present" | null;
}

function resolvePhotoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("/objects/") ? `/api/storage${url}` : url;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ReportType, { label: string; emoji: string; color: string; bg: string }> = {
  fallen_tree:       { label: "Albero caduto",        emoji: "🌲", color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  landslide:         { label: "Frana",                emoji: "⛰️", color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  path_interrupted:  { label: "Sentiero interrotto",  emoji: "🚧", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  bridge_damaged:    { label: "Ponte danneggiato",    emoji: "🌉", color: "text-red-700",    bg: "bg-red-50 border-red-200" },
  garbage:           { label: "Rifiuti / Discarica",  emoji: "☢️", color: "text-red-800",    bg: "bg-red-50 border-red-200" },
};

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  return `${days} giorn${days === 1 ? "o" : "i"} fa`;
}

function daysLeft(isoString: string): number {
  const created = new Date(isoString).getTime();
  const expiry = created + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expiry - Date.now()) / (24 * 60 * 60 * 1000)));
}

// ── Componenti ────────────────────────────────────────────────────────────────

function ReportCard({
  report,
  currentUserId,
  onConfirm,
  onDelete,
}: {
  report: TrailReport;
  currentUserId: string | null;
  onConfirm: (id: number, type: "still_present" | "not_present") => void;
  onDelete: (id: number) => void;
}) {
  const cfg = TYPE_CONFIG[report.type];
  const isOwner = currentUserId === report.userId;
  const confirmed = report.userConfirmation;
  const left = daysLeft(report.createdAt);

  return (
    <div className={`border rounded-xl p-4 ${cfg.bg} flex flex-col gap-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl leading-none flex-shrink-0">{cfg.emoji}</span>
          <div className="min-w-0">
            <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
            {report.locationName && (
              <p className="text-xs text-muted-foreground truncate">{report.locationName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(report.createdAt)}</span>
          {isOwner && (
            <button
              onClick={() => onDelete(report.id)}
              className="ml-1 p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"
              title="Elimina segnalazione"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {report.photoUrl && (
        <img
          src={resolvePhotoUrl(report.photoUrl)!}
          alt="Foto segnalazione"
          className="w-full h-40 object-cover rounded-lg"
        />
      )}

      {report.description && (
        <p className="text-sm text-foreground">{report.description}</p>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 mt-1">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>⚠️ Scade tra {left} g</span>
          <span className="text-amber-600">✋ {report.stillPresentCount} ancora presente</span>
          <span className="text-emerald-600">✅ {report.notPresentCount}/3 risolto</span>
        </div>
      </div>

      {currentUserId && (
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => onConfirm(report.id, "still_present")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              confirmed === "still_present"
                ? "bg-amber-500 text-white border-amber-500"
                : "border-amber-300 text-amber-700 hover:bg-amber-100"
            }`}
          >
            ✋ Ancora presente
          </button>
          <button
            onClick={() => onConfirm(report.id, "not_present")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              confirmed === "not_present"
                ? "bg-emerald-500 text-white border-emerald-500"
                : "border-emerald-300 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            ✅ Non più presente
          </button>
        </div>
      )}
    </div>
  );
}

// ── Modal inserimento ─────────────────────────────────────────────────────────

function CreateReportModal({
  onClose,
  onCreated,
  getToken,
}: {
  onClose: () => void;
  onCreated: () => void;
  getToken: () => Promise<string | null>;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<"type" | "location" | "details">("type");
  const [type, setType] = useState<ReportType | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locationName, setLocationName] = useState("");
  const [description, setDescription] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleGps = () => {
    if (!navigator.geolocation) { toast({ title: "GPS non disponibile" }); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => { toast({ title: "Impossibile rilevare la posizione" }); setLocating(false); },
      { timeout: 10000 },
    );
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploading(true);
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name || "photo.jpg", size: file.size, contentType: file.type || "image/jpeg" }),
      });
      if (!urlRes.ok) throw new Error();
      const { uploadURL } = await urlRes.json() as { uploadURL: string };

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "image/jpeg" },
      });
      if (!uploadRes.ok) throw new Error();
      const { finalObjectPath } = await uploadRes.json() as { finalObjectPath: string };
      setUploadedPhotoUrl(finalObjectPath);
    } catch {
      toast({ title: "Errore caricamento foto", description: "Riprova", variant: "destructive" });
      setPhotoPreview(null);
      setUploadedPhotoUrl(null);
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!type) return;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) { toast({ title: "Inserisci coordinate valide" }); return; }
    if (photoUploading) { toast({ title: "Attendi il caricamento della foto" }); return; }

    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/outdoor/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          type,
          latitude: latNum,
          longitude: lngNum,
          locationName: locationName || undefined,
          description: description || undefined,
          photoUrl: uploadedPhotoUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error("Errore nella segnalazione");
      toast({ title: "Segnalazione inviata", description: "Grazie per il contributo!" });
      onCreated();
    } catch {
      toast({ title: "Errore", description: "Non è stato possibile inviare la segnalazione", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl w-full max-w-md overflow-y-auto shadow-xl"
        style={{ maxHeight: "min(90vh, 680px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-foreground">Nuova segnalazione</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-4 flex gap-2 mb-1">
          {(["type", "location", "details"] as const).map((s, i) => (
            <div key={s} className={`flex-1 h-1 rounded-full ${step === s || (i < ["type","location","details"].indexOf(step)) ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === "type" && (
          <div className="p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Tipo di problema</p>
            <div className="grid grid-cols-1 gap-2">
              {(Object.entries(TYPE_CONFIG) as [ReportType, typeof TYPE_CONFIG[ReportType]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => { setType(key); setStep("location"); }}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                    type === key ? `${cfg.bg} border-current ${cfg.color}` : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="text-2xl">{cfg.emoji}</span>
                  <span className={`font-medium text-sm ${type === key ? cfg.color : "text-foreground"}`}>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "location" && (
          <div className="p-4 space-y-4">
            <p className="text-sm font-medium text-foreground">Posizione del problema</p>

            <button
              onClick={handleGps}
              disabled={locating}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {locating ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Rilevamento GPS…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
                  </svg>
                  Usa la mia posizione GPS
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />oppure inserisci manualmente<div className="flex-1 h-px bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Latitudine</label>
                <input
                  type="number" step="0.000001" placeholder="es. 45.465420"
                  value={lat} onChange={(e) => setLat(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Longitudine</label>
                <input
                  type="number" step="0.000001" placeholder="es. 9.186240"
                  value={lng} onChange={(e) => setLng(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {lat && lng && (
              <p className="text-xs text-emerald-600 font-medium">📍 Posizione impostata: {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}</p>
            )}

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Nome area / sentiero (opzionale)</label>
              <input
                type="text" placeholder="es. Sentiero del Monte Baldo"
                value={locationName} onChange={(e) => setLocationName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep("type")} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                Indietro
              </button>
              <button
                onClick={() => { if (lat && lng) setStep("details"); else toast({ title: "Inserisci la posizione" }); }}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
              >
                Avanti
              </button>
            </div>
          </div>
        )}

        {step === "details" && (
          <div className="p-4 space-y-4">
            {/* Camera capture */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Foto del problema (opzionale)</p>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCameraCapture}
              />
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={photoPreview} alt="Anteprima" className="w-full h-48 object-cover" />
                  {photoUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-sm font-medium flex items-center gap-2">
                        <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" />
                        </svg>
                        Caricamento…
                      </div>
                    </div>
                  )}
                  {!photoUploading && (
                    <button
                      onClick={() => { setPhotoPreview(null); setUploadedPhotoUrl(null); }}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                  {!photoUploading && uploadedPhotoUrl && (
                    <div className="absolute bottom-2 left-2 bg-emerald-500/90 text-white text-xs font-medium px-2 py-1 rounded-full">
                      ✓ Caricata
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span className="text-sm font-medium">Scatta foto</span>
                  <span className="text-xs">Apre la fotocamera</span>
                </button>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Descrizione (opzionale)</p>
              <textarea
                placeholder="Descrivi il problema: dimensioni, pericolosità, accesso alternativo…"
                value={description} onChange={(e) => setDescription(e.target.value)}
                rows={3} maxLength={500}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground text-right mt-1">{description.length}/500</p>
            </div>

            <div className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground space-y-1">
              <p><strong>Tipo:</strong> {type ? TYPE_CONFIG[type].label : ""}</p>
              <p><strong>Posizione:</strong> {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}</p>
              {locationName && <p><strong>Area:</strong> {locationName}</p>}
              <p className="text-amber-600">⏱ La segnalazione si archivia automaticamente dopo 30 giorni o 3 segnalazioni di risolto.</p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep("location")} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                Indietro
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
              >
                {submitting ? "Invio…" : "Invia segnalazione"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pagina principale ─────────────────────────────────────────────────────────

export default function OutdoorPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<TrailReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterType, setFilterType] = useState<ReportType | "all">("all");
  const userConfirmations = useRef<Map<number, "still_present" | "not_present">>(new Map());

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/outdoor/reports");
      if (res.ok) {
        const data: TrailReport[] = await res.json();
        setReports(data.map((r) => ({
          ...r,
          userConfirmation: userConfirmations.current.get(r.id) ?? null,
        })));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleConfirm = async (id: number, type: "still_present" | "not_present") => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/outdoor/reports/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error();

      userConfirmations.current.set(id, type);
      setReports((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const prev_conf = r.userConfirmation;
          const wasStill = prev_conf === "still_present";
          const wasNot   = prev_conf === "not_present";
          return {
            ...r,
            userConfirmation: type,
            stillPresentCount: r.stillPresentCount + (type === "still_present" ? 1 : 0) - (wasStill ? 1 : 0),
            notPresentCount:   r.notPresentCount   + (type === "not_present"   ? 1 : 0) - (wasNot   ? 1 : 0),
          };
        }).filter((r) => {
          if (type === "not_present" && r.id === id) {
            const updated = userConfirmations.current.get(id);
            if (updated === "not_present" && r.notPresentCount >= 3) return false;
          }
          return true;
        }),
      );

      const msg = type === "still_present" ? "Confermato: ancora presente" : "Grazie! Segnalato come risolto";
      toast({ title: msg });
    } catch {
      toast({ title: "Errore", description: "Riprova tra poco", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/outdoor/reports/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Segnalazione eliminata" });
    } catch {
      toast({ title: "Errore durante l'eliminazione", variant: "destructive" });
    }
  };

  const filtered = filterType === "all" ? reports : reports.filter((r) => r.type === filterType);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 pb-24 md:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <OutdoorIcon size={24} />
              Outdoor
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Segnalazioni sentieri e aree naturali</p>
          </div>
          {user && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Segnala
            </button>
          )}
        </div>

        {/* Info banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800">
          <p className="font-semibold mb-0.5">Come funziona</p>
          <p>Le segnalazioni vengono archiviate automaticamente dopo <strong>30 giorni</strong> o quando <strong>3 utenti</strong> confermano che il problema è risolto. Usa i pulsanti su ogni card per aggiornare lo stato.</p>
        </div>

        {/* Filtri tipo */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <button
            onClick={() => setFilterType("all")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterType === "all" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            Tutti ({reports.length})
          </button>
          {(Object.entries(TYPE_CONFIG) as [ReportType, typeof TYPE_CONFIG[ReportType]][]).map(([key, cfg]) => {
            const count = reports.filter((r) => r.type === key).length;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filterType === key
                    ? `${cfg.bg} ${cfg.color} border-current`
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {cfg.emoji} {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Lista segnalazioni */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🏔️</div>
            <p className="font-semibold text-foreground">Nessuna segnalazione attiva</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filterType === "all"
                ? "Sii il primo a segnalare un problema su un sentiero"
                : `Nessuna segnalazione di "${TYPE_CONFIG[filterType].label}"`}
            </p>
            {user && filterType !== "all" && (
              <button onClick={() => setFilterType("all")} className="mt-3 text-sm text-primary underline">
                Mostra tutti
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                currentUserId={user?.id ?? null}
                onConfirm={handleConfirm}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {!user && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <a href="/auth" className="text-primary font-medium underline">Accedi</a> per segnalare un problema o confermare lo stato.
          </div>
        )}
      </div>

      {showCreate && (
        <CreateReportModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchReports(); }}
          getToken={getToken}
        />
      )}
    </Layout>
  );
}

// ── Icona bicicletta/montagna (SVG inline) ────────────────────────────────────

export function OutdoorIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* ruote */}
      <circle cx="5" cy="17" r="3.5" />
      <circle cx="19" cy="17" r="3.5" />
      {/* telaio a diamante */}
      <polyline points="5,17 12,14 9,10 5,17" />
      <line x1="9" y1="10" x2="16" y2="10" />
      <line x1="12" y1="14" x2="16" y2="10" />
      <line x1="16" y1="10" x2="19" y2="17" />
      {/* sellino */}
      <line x1="7.5" y1="9.5" x2="10.5" y2="9.5" />
      {/* manubrio */}
      <path d="M16,10 L16.5,8 L18,8" />
      {/* omino: testa */}
      <circle cx="10" cy="5.5" r="1.8" />
      {/* omino: busto */}
      <line x1="10" y1="7.3" x2="9.2" y2="9.8" />
      {/* omino: braccio al manubrio */}
      <line x1="10" y1="8.3" x2="16.5" y2="8" />
    </svg>
  );
}
