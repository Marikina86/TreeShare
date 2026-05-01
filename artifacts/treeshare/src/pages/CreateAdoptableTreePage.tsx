import { useState, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useUser } from "@/lib/auth";
import { useGetMyProfile } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { useLang } from "@/lib/i18n";
import { resizeToBlob, resizeToThumbnailBlob } from "@/lib/imageUtils";
import CityAutocomplete from "@/components/CityAutocomplete";
import { ITALIAN_PROVINCES } from "@/lib/italianProvinces";

const T = {
  it: {
    pageTitle: "Crea albero in adozione",
    back: "Torna agli alberi",
    orgOnly: "Accesso riservato agli enti e organizzazioni.",
    loading: "Caricamento...",
    sectionBase: "Dati base",
    sectionPrice: "Prezzo e adozione",
    sectionProduct: "Prodotto ricevuto",
    sectionLocation: "Posizione",
    sectionImage: "Immagine",
    fieldTitle: "Nome albero",
    fieldTitlePlaceholder: "es. Arancio di Sicilia",
    fieldSpecies: "Specie botanica",
    fieldSpeciesPlaceholder: "es. Citrus sinensis",
    fieldDesc: "Descrizione",
    fieldDescPlaceholder: "Descrivi l'albero, la sua storia, il contesto...",
    fieldProductDesc: "Cosa riceve l'adottante",
    fieldProductDescPlaceholder: "es. 5 kg di arance a fine stagione, aggiornamenti fotografici mensili",
    fieldPrice: "Prezzo per adozione (€)",
    fieldDuration: "Durata adozione",
    durationOptions: ["30 giorni", "90 giorni", "6 mesi", "1 anno", "Personalizzata"],
    durationDays: [30, 90, 180, 365, 0],
    fieldCustomDays: "Giorni personalizzati",
    fieldMaxAdoptions: "Max adozioni simultanee",
    fieldLocation: "Luogo",
    fieldLocationPlaceholder: "es. Sicilia, Catania",
    fieldLatitude: "Latitudine",
    fieldLongitude: "Longitudine",
    fieldLatPlaceholder: "es. 37.5024",
    fieldLonPlaceholder: "es. 15.0873",
    locationHelp: "Inserisci le coordinate GPS dell'albero. Puoi trovarle su Google Maps.",
    imageLabel: "Foto dell'albero",
    imageHelp: "JPG, PNG o WebP — max 10 MB",
    imageChange: "Cambia foto",
    imageSelect: "Seleziona foto",
    required: "Obbligatorio",
    submit: "Crea albero",
    submitting: "Creazione in corso...",
    success: "🌳 Albero inviato per approvazione!",
    successDetail: "Il tuo albero è stato inviato e sarà visibile al pubblico dopo la revisione dell'amministratore. Riceverai una notifica quando sarà approvato.",
    successManage: "Gestisci i tuoi alberi",
    errorGeneric: "Errore durante la creazione. Riprova.",
    validationTitle: "Il nome è obbligatorio",
    validationDesc: "La descrizione è obbligatoria",
    validationSpecies: "La specie è obbligatoria",
    validationLocation: "Il luogo è obbligatorio",
    validationProduct: "Descrivi cosa riceve l'adottante",
    validationPrice: "Il prezzo deve essere maggiore di 0",
    validationMaxAdoptions: "Le adozioni massime devono essere almeno 1",
    validationLat: "Latitudine non valida (tra -90 e 90)",
    validationLon: "Longitudine non valida (tra -180 e 180)",
    validationImage: "La foto è obbligatoria",
    validationImageFormat: "Formato non supportato. Usa JPG, PNG o WebP.",
    validationImageSize: "L'immagine supera il limite di 10 MB",
    uploadingImage: "Caricamento immagine...",
    profileRequired: "Compila tutti i campi obbligatori: nome, descrizione, specie, luogo e prodotti offerti.",
    adoptionsDisabledTitle: "Adozioni temporaneamente disabilitate",
    adoptionsDisabledDesc: "L'amministratore ha sospeso la creazione di nuovi alberi in adozione. Riprova più tardi.",
  },
  en: {
    pageTitle: "Create adoptable tree",
    back: "Back to trees",
    orgOnly: "Access restricted to organizations only.",
    loading: "Loading...",
    sectionBase: "Basic info",
    sectionPrice: "Price & adoption",
    sectionProduct: "Product received",
    sectionLocation: "Location",
    sectionImage: "Image",
    fieldTitle: "Tree name",
    fieldTitlePlaceholder: "e.g. Sicilian Orange Tree",
    fieldSpecies: "Botanical species",
    fieldSpeciesPlaceholder: "e.g. Citrus sinensis",
    fieldDesc: "Description",
    fieldDescPlaceholder: "Describe the tree, its history, the context...",
    fieldProductDesc: "What the adopter receives",
    fieldProductDescPlaceholder: "e.g. 5 kg of oranges at end of season, monthly photo updates",
    fieldPrice: "Price per adoption (€)",
    fieldDuration: "Adoption duration",
    durationOptions: ["30 days", "90 days", "6 months", "1 year", "Custom"],
    durationDays: [30, 90, 180, 365, 0],
    fieldCustomDays: "Custom days",
    fieldMaxAdoptions: "Max simultaneous adoptions",
    fieldLocation: "Location",
    fieldLocationPlaceholder: "e.g. Sicily, Catania",
    fieldLatitude: "Latitude",
    fieldLongitude: "Longitude",
    fieldLatPlaceholder: "e.g. 37.5024",
    fieldLonPlaceholder: "e.g. 15.0873",
    locationHelp: "Enter the GPS coordinates of the tree. You can find them on Google Maps.",
    imageLabel: "Tree photo",
    imageHelp: "JPG, PNG or WebP — max 10 MB",
    imageChange: "Change photo",
    imageSelect: "Select photo",
    required: "Required",
    submit: "Create tree",
    submitting: "Creating...",
    success: "🌳 Tree submitted for approval!",
    successDetail: "Your tree has been submitted and will be visible to the public after admin review. You will receive a notification once it is approved.",
    successManage: "Manage your trees",
    errorGeneric: "Error creating tree. Please try again.",
    validationTitle: "Name is required",
    validationDesc: "Description is required",
    validationSpecies: "Species is required",
    validationLocation: "Location is required",
    validationProduct: "Please describe what the adopter receives",
    validationPrice: "Price must be greater than 0",
    validationMaxAdoptions: "Max adoptions must be at least 1",
    validationLat: "Invalid latitude (between -90 and 90)",
    validationLon: "Invalid longitude (between -180 and 180)",
    validationImage: "Photo is required",
    validationImageFormat: "Unsupported format. Use JPG, PNG or WebP.",
    validationImageSize: "Image exceeds the 10 MB limit",
    uploadingImage: "Uploading image...",
    profileRequired: "Please fill in all required fields: name, description, species, location and offered products.",
    adoptionsDisabledTitle: "Adoptions temporarily disabled",
    adoptionsDisabledDesc: "The administrator has paused new adoptable tree creation. Please try again later.",
  },
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

async function uploadBlob(blob: Blob, name: string, token: string): Promise<string> {
  const mime = blob.type || "image/jpeg";
  const ext = mime === "image/webp" ? "webp" : "jpg";
  const baseName = name.replace(/\.[^.]+$/, "");
  const finalName = `${baseName}.${ext}`;
  const res = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: finalName, size: blob.size, contentType: mime }),
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  const { uploadURL } = await res.json();
  const uploadRes = await fetch(uploadURL, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": mime },
  });
  if (!uploadRes.ok) throw new Error("Failed to upload image");
  const data = await uploadRes.json();
  return data.finalObjectPath as string;
}

export default function CreateAdoptableTreePage() {
  const { lang } = useLang();
  const t = T[lang as "it" | "en"] ?? T.it;
  const { getToken } = useAuth();
  const { user } = useUser();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profile = useGetMyProfile();
  const accountType = (profile.data as any)?.accountType;
  const isOrg = accountType === "organization";
  const isLoadingProfile = profile.isLoading;

  const settingsQuery = useQuery<{ adoptionsEnabled: boolean }>({
    queryKey: ["app-settings-public"],
    queryFn: async () => {
      const res = await fetch("/api/app-settings/public");
      if (!res.ok) return { adoptionsEnabled: true };
      return res.json();
    },
    staleTime: 30_000,
  });
  const adoptionsEnabled = settingsQuery.data?.adoptionsEnabled ?? true;

  const [title, setTitle] = useState("");
  const [speciesName, setSpeciesName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [provincia, setProvincia] = useState("");
  const [description, setDescription] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [priceEur, setPriceEur] = useState("");
  const [durationIndex, setDurationIndex] = useState(3);
  const [customDays, setCustomDays] = useState("");
  const [maxAdoptions, setMaxAdoptions] = useState("10");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const reverseGeoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reverseGeocode = useCallback(async (lat: string, lon: string) => {
    if (!lat || !lon) return;
    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    if (isNaN(latN) || isNaN(lonN)) return;
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=it`,
        { headers: { "Accept-Language": "it" } },
      );
      if (!r.ok) return;
      const data = await r.json();
      const a = data.address ?? {};
      const comune = a.city || a.town || a.village || a.municipality || a.hamlet || "";
      const prov = a.county || a.state_district || a.state || "";
      if (comune) setLocationName(comune);
      if (prov) setProvincia(prov);
    } catch { /* ignora */ }
  }, []);

  function handleLatChange(val: string) {
    setLatitude(val);
    if (reverseGeoTimeout.current) clearTimeout(reverseGeoTimeout.current);
    reverseGeoTimeout.current = setTimeout(() => reverseGeocode(val, longitude), 800);
  }

  function handleLonChange(val: string) {
    setLongitude(val);
    if (reverseGeoTimeout.current) clearTimeout(reverseGeoTimeout.current);
    reverseGeoTimeout.current = setTimeout(() => reverseGeocode(latitude, val), 800);
  }

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const durationDays = t.durationDays[durationIndex] === 0
    ? parseInt(customDays, 10) || 0
    : t.durationDays[durationIndex];

  function handleFileSelect(file: File) {
    setImageError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError(t.validationImageFormat);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setImageError(t.validationImageSize);
      return;
    }
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  }

  function validate(): string | null {
    if (!title.trim()) return t.validationTitle;
    if (!description.trim()) return t.validationDesc;
    if (!speciesName.trim()) return t.validationSpecies;
    if (!locationName.trim()) return t.validationLocation;
    if (!productDescription.trim()) return t.validationProduct;
    const price = parseFloat(priceEur);
    if (isNaN(price) || price <= 0) return t.validationPrice;
    const maxA = parseInt(maxAdoptions, 10);
    if (isNaN(maxA) || maxA < 1) return t.validationMaxAdoptions;
    const lat = parseFloat(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) return t.validationLat;
    const lon = parseFloat(longitude);
    if (isNaN(lon) || lon < -180 || lon > 180) return t.validationLon;
    if (!imageFile) return t.validationImage;
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!adoptionsEnabled) {
      setError(t.adoptionsDisabledDesc);
      return;
    }
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      setUploadingImage(true);
      const [fullBlob, thumbBlob] = await Promise.all([
        resizeToBlob(imageFile!),
        resizeToThumbnailBlob(imageFile!).catch(() => null),
      ]);
      const imageUrl = await uploadBlob(fullBlob, imageFile!.name, token);
      const thumbnailUrl = thumbBlob
        ? await uploadBlob(thumbBlob, `thumb_${imageFile!.name}`, token).catch(() => null)
        : null;
      setUploadingImage(false);

      const ownerEmail = user?.emailAddresses?.[0]?.emailAddress ?? "";
      const priceCents = Math.round(parseFloat(priceEur) * 100);
      const maxA = parseInt(maxAdoptions, 10);

      const res = await fetch("/api/adopt/trees", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          speciesName: speciesName.trim(),
          locationName: (locationName.trim() ? locationName.trim() + (provincia ? ` (${provincia})` : "") : null),
          productDescription: productDescription.trim() || null,
          priceCents,
          durationDays,
          maxAdoptions: maxA,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          imageUrl,
          thumbnailUrl,
          ownerEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.errorGeneric);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["adoptable-trees"] });
      await queryClient.invalidateQueries({ queryKey: ["adopt-my-trees"] });
      setSuccess(true);
    } catch {
      setError(t.errorGeneric);
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  }

  if (isLoadingProfile) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-10 text-center text-muted-foreground">
          {t.loading}
        </div>
      </Layout>
    );
  }

  if (!isOrg) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-muted-foreground text-sm">{t.orgOnly}</p>
          <Link href="/adopt" className="mt-4 inline-block text-primary text-sm hover:underline">
            ← {t.back}
          </Link>
        </div>
      </Layout>
    );
  }

  if (!adoptionsEnabled) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-4">⏸️</div>
          <h2 className="text-xl font-bold text-foreground mb-2">{t.adoptionsDisabledTitle}</h2>
          <p className="text-muted-foreground text-sm">{t.adoptionsDisabledDesc}</p>
          <Link href="/adopt" className="mt-4 inline-block text-primary text-sm hover:underline">
            ← {t.back}
          </Link>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-4">🌳</div>
          <p className="text-foreground font-bold text-xl mb-3">{t.success}</p>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 text-left mb-6">
            <div className="flex items-start gap-3">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <p className="text-sm text-amber-800 dark:text-amber-200">{t.successDetail}</p>
            </div>
          </div>
          <Link href="/adopt/manage" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
            {t.successManage}
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link href="/adopt" className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground mb-5 transition-colors">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t.back}
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-6">🌱 {t.pageTitle}</h1>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Dati base ─────────────────────────────────────────────── */}
          <section className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide text-muted-foreground">{t.sectionBase}</h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t.fieldTitle} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.fieldTitlePlaceholder}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t.fieldSpecies} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={speciesName}
                onChange={(e) => setSpeciesName(e.target.value)}
                placeholder={t.fieldSpeciesPlaceholder}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t.fieldDesc} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.fieldDescPlaceholder}
                rows={4}
                required
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </section>

          {/* ── Prezzo e adozione ─────────────────────────────────────── */}
          <section className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t.sectionPrice}</h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t.fieldPrice} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                <input
                  type="number"
                  min="0.50"
                  step="0.50"
                  value={priceEur}
                  onChange={(e) => setPriceEur(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-border rounded-lg pl-7 pr-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t.fieldDuration}</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {t.durationOptions.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDurationIndex(i)}
                    className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors ${
                      durationIndex === i
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {durationIndex === t.durationOptions.length - 1 && (
                <div className="mt-3">
                  <label className="block text-xs text-muted-foreground mb-1">{t.fieldCustomDays}</label>
                  <input
                    type="number"
                    min="1"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder="180"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t.fieldMaxAdoptions}</label>
              <input
                type="number"
                min="1"
                max="100"
                value={maxAdoptions}
                onChange={(e) => setMaxAdoptions(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </section>

          {/* ── Prodotto ──────────────────────────────────────────────── */}
          <section className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t.sectionProduct}</h2>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t.fieldProductDesc} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder={t.fieldProductDescPlaceholder}
                rows={3}
                required
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </section>

          {/* ── Posizione ─────────────────────────────────────────────── */}
          <section className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t.sectionLocation}</h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Comune <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <CityAutocomplete
                  value={locationName}
                  onChange={(city, prov) => {
                    setLocationName(city);
                    if (prov) setProvincia(prov);
                  }}
                  placeholder="es. Catania"
                  className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <select
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  className="w-28 border border-border rounded-lg px-2 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Prov.</option>
                  {ITALIAN_PROVINCES.map((p) => (
                    <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Seleziona il comune dove si trova la pianta. La provincia si compila automaticamente.
              </p>
            </div>

            <p className="text-xs text-muted-foreground">{t.locationHelp}</p>

            <button
              type="button"
              disabled={gpsLoading}
              onClick={() => {
                setGpsError(null);
                if (!navigator.geolocation) {
                  setGpsError("GPS non disponibile su questo dispositivo.");
                  return;
                }
                setGpsLoading(true);
                navigator.geolocation.getCurrentPosition(
                  async (pos) => {
                    const lat = pos.coords.latitude.toFixed(6);
                    const lng = pos.coords.longitude.toFixed(6);
                    setLatitude(lat);
                    setLongitude(lng);
                    await reverseGeocode(lat, lng);
                    setGpsLoading(false);
                  },
                  () => {
                    setGpsError("Impossibile rilevare la posizione. Verifica i permessi GPS.");
                    setGpsLoading(false);
                  },
                  { timeout: 10000, enableHighAccuracy: true },
                );
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {gpsLoading ? (
                <svg className="animate-spin" width="15" height="15" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                </svg>
              )}
              {gpsLoading ? "Rilevamento..." : "📍 Rileva posizione GPS"}
            </button>
            {gpsError && <p className="text-red-500 text-xs">{gpsError}</p>}
            {latitude && longitude && (
              <p className="text-xs text-muted-foreground">
                Posizione rilevata: {latitude}, {longitude}
                {" · "}
                <a
                  href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=15`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Verifica su mappa
                </a>
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t.fieldLatitude} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => handleLatChange(e.target.value)}
                  placeholder={t.fieldLatPlaceholder}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t.fieldLongitude} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => handleLonChange(e.target.value)}
                  placeholder={t.fieldLonPlaceholder}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>
            </div>
          </section>

          {/* ── Immagine ──────────────────────────────────────────────── */}
          <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t.sectionImage}</h2>
            <p className="text-xs text-muted-foreground">{t.imageHelp}</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden bg-muted aspect-video">
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-black/80 transition-colors"
                >
                  {t.imageChange}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm font-medium">{t.imageSelect}</span>
              </button>
            )}

            {imageError && <p className="text-red-500 text-xs">{imageError}</p>}
          </section>

          {/* ── Errors & submit ───────────────────────────────────────── */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                {uploadingImage ? t.uploadingImage : t.submitting}
              </>
            ) : t.submit}
          </button>
        </form>
      </div>
    </Layout>
  );
}
