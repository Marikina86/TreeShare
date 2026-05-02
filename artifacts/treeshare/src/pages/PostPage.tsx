import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { getListTreesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useGps, getPlatformInstructions } from "@/hooks/useGps";
import CityAutocomplete from "@/components/CityAutocomplete";
import { ITALIAN_PROVINCES } from "@/lib/italianProvinces";
import { resizeToBlob, resizeToThumbnailBlob, resizeToBase64 } from "@/lib/imageUtils";

type UploadState = "idle" | "uploading" | "done" | "error";
type VerifyState = "idle" | "verifying" | "ok" | "pending" | "rejected";

export default function PostPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const [isPublishing, setIsPublishing] = useState(false);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [uploadedThumbnailPath, setUploadedThumbnailPath] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [photoStatusForUpload, setPhotoStatusForUpload] = useState<"approved" | "pending">("approved");
  const [plantName, setPlantName] = useState("");
  const [caption, setCaption] = useState("");
  const [species, setSpecies] = useState("");
  const [plantedAt, setPlantedAt] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationName, setLocationName] = useState("");
  const [country, setCountry] = useState("");
  const [province, setProvince] = useState("");
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false);
  const [showGpsDeniedModal, setShowGpsDeniedModal] = useState(false);
  const { permission: gpsPermission, requestPosition } = useGps();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const gpsAutoRef = useRef(false);
  const reverseGeoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=it`,
        { headers: { "Accept-Language": "it" } },
      );
      if (!r.ok) return;
      const data = await r.json();
      if (!data.address) return;
      const a = data.address;
      const comune = a.city || a.town || a.village || a.municipality || a.hamlet || "";
      const countryName = a.country || "";
      if (comune) setLocationName(comune);
      if (countryName) setCountry(countryName);
      const rawProv = a.county || a.state_district || a.state || "";
      const cleanedProv = rawProv
        .replace(/^Provincia di /i, "")
        .replace(/^Città metropolitana di /i, "")
        .replace(/^Province of /i, "")
        .trim();
      const matched = ITALIAN_PROVINCES.find(
        (p) => p.name.toLowerCase() === cleanedProv.toLowerCase(),
      );
      if (matched) setProvince(matched.code);
    } catch { /* ignora */ }
  }, []);

  function handleLatChange(val: string) {
    setLatitude(val);
    const latN = parseFloat(val);
    const lngN = parseFloat(longitude);
    if (reverseGeoTimeout.current) clearTimeout(reverseGeoTimeout.current);
    if (!isNaN(latN) && !isNaN(lngN))
      reverseGeoTimeout.current = setTimeout(() => reverseGeocode(latN, lngN), 800);
  }

  function handleLonChange(val: string) {
    setLongitude(val);
    const latN = parseFloat(latitude);
    const lngN = parseFloat(val);
    if (reverseGeoTimeout.current) clearTimeout(reverseGeoTimeout.current);
    if (!isNaN(latN) && !isNaN(lngN))
      reverseGeoTimeout.current = setTimeout(() => reverseGeocode(latN, lngN), 800);
  }

  // Auto-rileva GPS all'apertura della pagina se non ancora fornito
  useEffect(() => {
    if (gpsAutoRef.current || latitude || longitude) return;
    // Non auto-richiedere se esplicitamente negato
    if (gpsPermission === "denied" || gpsPermission === "unsupported") return;
    // Aspetta che il permesso sia determinato (non "checking")
    if (gpsPermission === "checking") return;
    gpsAutoRef.current = true;
    detectLocation();
  }, [gpsPermission]);

  async function uploadBlob(blob: Blob, name: string): Promise<string> {
    const mime = blob.type || "image/jpeg";
    const ext = mime === "image/webp" ? "webp" : "jpg";
    const baseName = name.replace(/\.[^.]+$/, "");
    const finalName = `${baseName}.${ext}`;
    const res = await fetch("/api/storage/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: finalName, size: blob.size, contentType: mime }),
    });
    if (!res.ok) throw new Error("Failed to get upload URL");
    const { uploadURL } = await res.json();
    const uploadRes = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": mime },
      body: blob,
    });
    if (!uploadRes.ok) throw new Error("Failed to upload photo");
    const uploadData = await uploadRes.json();
    return uploadData.finalObjectPath as string;
  }

  async function uploadPhoto(file: File): Promise<{ path: string; thumbnailPath: string | null }> {
    const [full, thumb] = await Promise.all([
      resizeToBlob(file),
      resizeToThumbnailBlob(file).catch(() => null),
    ]);
    const path = await uploadBlob(full, file.name);
    const thumbnailPath = thumb ? await uploadBlob(thumb, `thumb_${file.name}`).catch(() => null) : null;
    return { path, thumbnailPath };
  }

  async function handlePhotoTaken(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setPhotoFile(file);
    setVerifyState("verifying");
    setUploadState("idle");
    setUploadedPath(null);
    setUploadedThumbnailPath(null);
    setPhotoStatusForUpload("approved");

    // STEP 1: verifica AI — se AI non disponibile, modalità pending
    let canUpload = false;
    try {
      const base64 = await resizeToBase64(file, 768);
      const token = await getToken();
      const verifyRes = await fetch("/api/plants/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (!verifyRes.ok) {
        throw new Error(`HTTP ${verifyRes.status}`);
      }

      const verifyData = (await verifyRes.json()) as {
        isPlant?: boolean | null;
        aiUnavailable?: boolean;
        label?: string;
        reason?: string;
      };

      if (verifyData.aiUnavailable === true) {
        // AI non disponibile: upload consentito ma in stato pending
        canUpload = true;
        setPhotoStatusForUpload("pending");
        setVerifyState("pending");
        toast({
          title: "⏳ Verifica manuale richiesta",
          description: "L'analisi AI non è disponibile. La tua foto sarà pubblicata dopo la revisione da parte degli amministratori.",
          duration: 6000,
        });
      } else if (verifyData.isPlant === true) {
        canUpload = true;
        setPhotoStatusForUpload("approved");
        setVerifyState("ok");
        toast({
          title: "✅ Foto accettata",
          description: verifyData.reason || "L'immagine mostra chiaramente una pianta o un albero.",
          duration: 3000,
        });
      } else {
        setVerifyState("rejected");
        setPhotoPreview(null);
        setPhotoFile(null);
        toast({
          title: "❌ Foto non accettata",
          description: verifyData.reason
            ? `Motivo: ${verifyData.reason}\n\nSono accettate solo foto di piante, alberi o piante in vaso.`
            : "L'immagine non raffigura una pianta o un albero. Riprova con una foto di vegetazione.",
          variant: "destructive",
          duration: 6000,
        });
        return;
      }
    } catch {
      canUpload = true;
      setPhotoStatusForUpload("pending");
      setVerifyState("pending");
      toast({
        title: "⏳ Verifica manuale richiesta",
        description: "Impossibile verificare l'immagine automaticamente. La tua foto sarà pubblicata dopo la revisione da parte degli amministratori.",
        duration: 6000,
      });
    }

    // STEP 2: upload avviene SOLO se canUpload === true
    if (!canUpload) return;

    setUploadState("uploading");
    try {
      const { path, thumbnailPath } = await uploadPhoto(file);
      setUploadedPath(path);
      setUploadedThumbnailPath(thumbnailPath);
      setUploadState("done");
    } catch {
      setUploadState("error");
      toast({ title: "Errore upload", description: "Impossibile caricare la foto. Riprova.", variant: "destructive" });
    }
  }

  async function detectLocation() {
    if (!("geolocation" in navigator)) {
      toast({ title: "GPS non disponibile", description: "Il tuo dispositivo non supporta il GPS.", variant: "destructive" });
      return;
    }
    setGpsState("loading");
    try {
      const gps = await requestPosition();
      const lat = gps.lat;
      const lng = gps.lng;
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
      await reverseGeocode(lat, lng);
      setGpsState("done");
    } catch (err: unknown) {
      setGpsState("error");
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("negato") || msg === "Permesso GPS negato.") {
        setShowGpsDeniedModal(true);
      } else {
        toast({ title: "Errore GPS", description: msg || "Impossibile rilevare la posizione.", variant: "destructive" });
      }
    }
  }

  function handlePublishClick() {
    if (!photoPreview) {
      toast({ title: "Foto obbligatoria", description: "Scatta una foto prima di pubblicare.", variant: "destructive" });
      return;
    }
    if (verifyState === "verifying") {
      toast({ title: "Attendere", description: "Analisi dell'immagine in corso...", variant: "destructive" });
      return;
    }
    if (verifyState === "rejected") {
      toast({ title: "Foto non valida", description: "Seleziona una foto di una pianta o albero.", variant: "destructive" });
      return;
    }
    if (uploadState === "uploading") {
      toast({ title: "Attendere", description: "La foto è ancora in caricamento, attendi un momento.", variant: "destructive" });
      return;
    }
    if (uploadState === "error") {
      toast({ title: "Errore", description: "La foto non è stata caricata correttamente. Riprova.", variant: "destructive" });
      return;
    }
    if (!locationName.trim()) {
      toast({ title: "Comune obbligatorio", description: "Indica il comune dove si trova la pianta.", variant: "destructive" });
      return;
    }
    if (!province) {
      toast({ title: "Provincia obbligatoria", description: "Seleziona la provincia della pianta.", variant: "destructive" });
      return;
    }
    // verifyState può essere "ok" o "pending" — entrambi consentono la pubblicazione
    setShowPrivacyPopup(true);
  }

  async function handleConfirmPublish() {
    setShowPrivacyPopup(false);

    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    if ((latitude && isNaN(lat!)) || (longitude && isNaN(lng!))) {
      toast({ title: "Coordinate non valide", description: "Inserisci valori corretti per latitudine e longitudine.", variant: "destructive" });
      return;
    }

    setIsPublishing(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/trees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          photoUrl: uploadedPath!,
          photoThumbnailUrl: uploadedThumbnailPath ?? null,
          plantName: plantName || null,
          caption: caption || null,
          species: species || null,
          plantedAt: plantedAt ? new Date(plantedAt).toISOString() : null,
          latitude: lat ?? 0,
          province: province || null,
          longitude: lng ?? 0,
          locationName: locationName || null,
          country: country || null,
          photoStatus: photoStatusForUpload,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        if (res.status === 401) {
          toast({ title: "Sessione scaduta", description: "Effettua di nuovo l'accesso e riprova.", variant: "destructive" });
        } else {
          toast({ title: "Errore", description: (errBody as { error?: string }).error ?? "Pubblicazione fallita. Riprova.", variant: "destructive" });
        }
        return;
      }

      queryClient.invalidateQueries({ queryKey: getListTreesQueryKey() });
      if (photoStatusForUpload === "pending") {
        toast({ title: "⏳ Foto inviata!", description: "La tua foto è in attesa di revisione da parte degli amministratori. Sarà visibile dopo l'approvazione." });
      } else {
        toast({ title: "🌱 Pianta pubblicata!", description: "La tua pianta è stata aggiunta alla mappa." });
      }
      setLocation("/feed");
    } catch {
      toast({ title: "Errore", description: "Pubblicazione fallita. Riprova.", variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  }

  const hasCoords = latitude.trim() !== "" || longitude.trim() !== "";

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/feed")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5 group"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Torna indietro
        </button>
        <h1 className="text-2xl font-bold text-foreground mb-6">Pubblica una pianta</h1>

        <div className="space-y-6">
          {/* Camera only */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Foto *</label>
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden aspect-video bg-black/5 dark:bg-white/5">
                <img src={photoPreview} alt="Anteprima" className="w-full h-full object-contain" />
                {uploadState === "uploading" && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-white text-sm font-medium">Caricamento in corso...</span>
                  </div>
                )}
                {uploadState === "done" && verifyState === "ok" && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Caricata
                  </div>
                )}
                {uploadState === "done" && verifyState === "pending" && (
                  <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/>
                    </svg>
                    In revisione
                  </div>
                )}
                {uploadState === "error" && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    Errore
                  </div>
                )}
                {verifyState === "verifying" && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-white text-sm font-medium">Analisi in corso...</span>
                    <span className="text-white/70 text-xs">Verifica che sia una pianta</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setPhotoPreview(null); setPhotoFile(null); setUploadedPath(null); setUploadedThumbnailPath(null); setUploadState("idle"); setVerifyState("idle"); }}
                  className="absolute top-2 left-2 bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center gap-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => cameraInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Scatta una foto</p>
                  <p className="text-xs text-muted-foreground mt-1">La foto verrà caricata automaticamente</p>
                </div>
                <button
                  type="button"
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  📷 Scatta foto
                </button>
              </div>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handlePhotoTaken(e.target.files[0])}
            />
          </div>

          {/* Plant name */}
          <div>
            <label htmlFor="plant-name" className="block text-sm font-medium text-foreground mb-1">
              Dai un nome alla tua pianta <span className="text-muted-foreground font-normal">(facoltativo)</span>
            </label>
            <input
              id="plant-name"
              type="text"
              value={plantName}
              onChange={(e) => setPlantName(e.target.value)}
              placeholder="es. La mia quercia, Olivo del nonno..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
          </div>

          {/* Species */}
          <div>
            <label htmlFor="species" className="block text-sm font-medium text-foreground mb-1">
              Specie <span className="text-muted-foreground font-normal">(facoltativo)</span>
            </label>
            <input
              id="species"
              type="text"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              placeholder="es. Quercia, Pino, Ulivo..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
          </div>

          {/* Planted at */}
          <div>
            <label htmlFor="planted-at" className="block text-sm font-medium text-foreground mb-1">
              Data di messa a dimora <span className="text-muted-foreground font-normal">(facoltativo)</span>
            </label>
            <input
              id="planted-at"
              type="date"
              value={plantedAt}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setPlantedAt(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">Indica quando hai piantato questa pianta</p>
          </div>

          {/* Caption */}
          <div>
            <label htmlFor="caption" className="block text-sm font-medium text-foreground mb-1">
              Descrizione <span className="text-muted-foreground font-normal">(facoltativo)</span>
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Racconta qualcosa su questa pianta..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none"
            />
          </div>

          {/* Location — obbligatorio */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-foreground">
                Posizione <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={detectLocation}
                disabled={gpsState === "loading"}
                className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline disabled:opacity-50 transition"
              >
                {gpsState === "loading" ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Rilevamento GPS...
                  </>
                ) : gpsState === "done" ? (
                  <>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    GPS rilevato
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                    </svg>
                    Usa GPS
                  </>
                )}
              </button>
            </div>

            {/* GPS status banner */}
            {gpsState === "loading" && (
              <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
                Rilevamento posizione in corso... Potrebbe richiedere qualche secondo.
              </div>
            )}
            {gpsState === "done" && (
              <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Posizione GPS rilevata con successo.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label htmlFor="latitude" className="block text-xs text-muted-foreground mb-1">Latitudine</label>
                <input
                  id="latitude"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => handleLatChange(e.target.value)}
                  placeholder="es. 41.9028"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>
              <div>
                <label htmlFor="longitude" className="block text-xs text-muted-foreground mb-1">Longitudine</label>
                <input
                  id="longitude"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => handleLonChange(e.target.value)}
                  placeholder="es. 12.4964"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Comune <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <CityAutocomplete
                    value={locationName}
                    onChange={(city, prov) => {
                      setLocationName(city);
                      if (prov) setProvince(prov);
                    }}
                    placeholder="es. Roma, Milano, Napoli..."
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  />
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-28 border border-border rounded-lg px-2 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Prov. *</option>
                    {ITALIAN_PROVINCES.map((p) => (
                      <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Digita il comune — la provincia si suggerisce automaticamente. Puoi correggerla dal menu.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePublishClick}
            disabled={isPublishing || uploadState === "uploading"}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPublishing ? "Pubblicazione..." : "Pubblica"}
          </button>
        </div>
      </div>

      {/* Privacy popup */}
      {showPrivacyPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" className="text-primary">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-lg leading-tight">Conferma pubblicazione</h2>
                <p className="text-muted-foreground text-sm mt-1">Prima di pubblicare, leggi l'informativa</p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl px-4 py-3 text-sm text-foreground leading-relaxed border border-border">
              Cliccando su <strong>Pubblica</strong> dichiaro di aver preso visione e accetto l'{" "}
              <Link href="/privacy" className="text-primary underline hover:opacity-80" onClick={() => setShowPrivacyPopup(false)}>
                informativa sulla privacy
              </Link>
              {", "}le{" "}
              <Link href="/terms" className="text-primary underline hover:opacity-80" onClick={() => setShowPrivacyPopup(false)}>
                condizioni d'uso
              </Link>
              {" "}e l'{" "}
              <Link href="/privacy#ai" className="text-primary underline hover:opacity-80" onClick={() => setShowPrivacyPopup(false)}>
                informativa AI
              </Link>
              {" "}e la{" "}
              <Link href="/cookies" className="text-primary underline hover:opacity-80" onClick={() => setShowPrivacyPopup(false)}>
                cookie policy
              </Link>.
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPrivacyPopup(false)}
                className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Pubblica
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GPS denied modal */}
      {showGpsDeniedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-orange-500">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-lg leading-tight">GPS non autorizzato</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Il permesso di accesso alla posizione è stato negato. Segui questi passaggi per abilitarlo:
                </p>
              </div>
            </div>

            <ol className="space-y-2">
              {getPlatformInstructions("it").map((step, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-snug">{step.replace(/^\d+\.\s*/, "")}</span>
                </li>
              ))}
            </ol>

            <div className="bg-muted/60 rounded-xl p-3 text-xs text-muted-foreground">
              Puoi anche andare in <strong>Impostazioni → GPS</strong> dall'app TreeShare per gestire i permessi.
            </div>

            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setShowGpsDeniedModal(false)}
                className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                Chiudi
              </button>
              <button
                onClick={() => { setShowGpsDeniedModal(false); detectLocation(); }}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Riprova GPS
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
