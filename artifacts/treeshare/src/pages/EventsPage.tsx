import { useState, useEffect, useCallback, useRef } from "react";
import { useUser, useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import LocationSearch, { type LocationResult } from "@/components/LocationSearch";

const LAST_SEEN_KEY = "events_last_seen_at";

export function getEventsLastSeenAt(): number {
  const v = localStorage.getItem(LAST_SEEN_KEY);
  return v ? parseInt(v, 10) : 0;
}

export function markEventsSeen() {
  localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(timeStr: string) {
  return timeStr.slice(0, 5);
}

type EventItem = {
  id: number;
  userId: string;
  username: string;
  userPhotoUrl?: string | null;
  title: string;
  description?: string | null;
  location: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  eventDate: string;
  eventTime: string;
  endDate?: string | null;
  endTime?: string | null;
  participantCount: number;
  isParticipating: boolean;
  createdAt: string;
};

interface EventFormState {
  title: string;
  description: string;
  location: string;
  address: string;
  city: string;
  province: string;
  eventDate: string;
  eventTime: string;
  endDate: string;
  endTime: string;
}

function emptyForm(): EventFormState {
  return { title: "", description: "", location: "", address: "", city: "", province: "", eventDate: "", eventTime: "", endDate: "", endTime: "" };
}

const EVENTS_QK = ["events"] as const;

async function apiFetch(path: string, options: RequestInit & { token?: string | null } = {}) {
  const { token, ...rest } = options;
  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (rest.body && typeof rest.body === "string") headers["Content-Type"] = "application/json";
  const res = await fetch(path, { ...rest, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function reverseGeocodeProvince(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=it`,
      { headers: { "User-Agent": "TreeShare/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json() as { address?: { county?: string; state?: string; city?: string; town?: string; village?: string } };
    const addr = data.address ?? {};
    return addr.county ?? addr.state ?? null;
  } catch {
    return null;
  }
}

export default function EventsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EventFormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  const [filterCity, setFilterCity] = useState("");
  const [filterProvince, setFilterProvince] = useState("");
  const [myProvince, setMyProvince] = useState<string | null>(null);
  const [showingMyArea, setShowingMyArea] = useState(false);
  const geoAsked = useRef(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    markEventsSeen();
  }, []);

  useEffect(() => {
    if (geoAsked.current) return;
    geoAsked.current = true;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const province = await reverseGeocodeProvince(pos.coords.latitude, pos.coords.longitude);
      if (province) {
        setMyProvince(province);
        setFilterProvince(province);
        setShowingMyArea(true);
      }
    }, () => {}, { timeout: 8000 });
  }, []);

  const { data: allEvents = [], isLoading, refetch } = useQuery({
    queryKey: EVENTS_QK,
    queryFn: async () => {
      const token = await getToken();
      return apiFetch("/api/events", { token }) as Promise<EventItem[]>;
    },
    retry: 1,
  });

  const provinces = Array.from(
    new Set(allEvents.map((e) => e.province).filter(Boolean) as string[])
  ).sort();

  const filteredEvents = allEvents.filter((e) => {
    if (filterProvince && e.province?.toLowerCase() !== filterProvince.toLowerCase()) return false;
    if (filterCity && !e.city?.toLowerCase().includes(filterCity.toLowerCase()) &&
        !e.location?.toLowerCase().includes(filterCity.toLowerCase())) return false;
    return true;
  });

  function setField(field: keyof EventFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.location.trim() || !form.eventDate || !form.eventTime) {
      toast({ title: "Compila tutti i campi obbligatori", variant: "destructive" });
      return;
    }
    if (form.endDate && form.endDate < form.eventDate) {
      toast({ title: "La data di fine non può essere prima della data di inizio", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      await apiFetch("/api/events", {
        method: "POST",
        token,
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          location: form.location.trim(),
          address: form.address.trim() || null,
          city: form.city || null,
          province: form.province || null,
          eventDate: form.eventDate,
          eventTime: form.eventTime,
          endDate: form.endDate || null,
          endTime: form.endTime || null,
        }),
      });
      queryClient.invalidateQueries({ queryKey: EVENTS_QK });
      setShowForm(false);
      setForm(emptyForm());
      toast({ title: "Evento creato!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossibile creare l'evento.";
      toast({ title: "Errore", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const handleJoin = useCallback(async (eventId: number) => {
    try {
      const token = await getToken();
      await apiFetch(`/api/events/${eventId}/join`, { method: "POST", token });
      queryClient.invalidateQueries({ queryKey: EVENTS_QK });
    } catch {
      toast({ title: "Errore", description: "Impossibile iscriversi.", variant: "destructive" });
    }
  }, [getToken, queryClient, toast]);

  const handleLeave = useCallback(async (eventId: number) => {
    try {
      const token = await getToken();
      await apiFetch(`/api/events/${eventId}/leave`, { method: "POST", token });
      queryClient.invalidateQueries({ queryKey: EVENTS_QK });
    } catch {
      toast({ title: "Errore", description: "Impossibile annullare.", variant: "destructive" });
    }
  }, [getToken, queryClient, toast]);

  const handleDelete = useCallback(async (eventId: number) => {
    try {
      const token = await getToken();
      await apiFetch(`/api/events/${eventId}`, { method: "DELETE", token });
      queryClient.invalidateQueries({ queryKey: EVENTS_QK });
      toast({ title: "Evento eliminato" });
    } catch {
      toast({ title: "Errore", description: "Impossibile eliminare.", variant: "destructive" });
    }
  }, [getToken, queryClient, toast]);

  const handleEdit = useCallback(async (eventId: number, data: Partial<EventFormState>) => {
    const token = await getToken();
    await apiFetch(`/api/events/${eventId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({
        title: data.title?.trim(),
        description: data.description?.trim() || null,
        location: data.location?.trim(),
        address: data.address?.trim() || null,
        city: data.city || null,
        province: data.province || null,
        eventDate: data.eventDate,
        eventTime: data.eventTime,
        endDate: data.endDate || null,
        endTime: data.endTime || null,
      }),
    });
    queryClient.invalidateQueries({ queryKey: EVENTS_QK });
    toast({ title: "Evento aggiornato!" });
  }, [getToken, queryClient, toast]);

  function toggleMyArea() {
    if (showingMyArea) {
      setFilterProvince("");
      setShowingMyArea(false);
    } else if (myProvince) {
      setFilterProvince(myProvince);
      setShowingMyArea(true);
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Eventi</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Raduni di piantagione e incontri della community</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setForm(emptyForm()); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
            </svg>
            Crea evento
          </button>
        </div>

        {showForm && (
          <EventForm
            form={form}
            setField={setField}
            onSubmit={handleCreate}
            onCancel={() => { setShowForm(false); setForm(emptyForm()); }}
            submitting={submitting}
            today={today}
            title="Nuovo evento"
            submitLabel="Crea evento"
            submittingLabel="Creazione..."
          />
        )}

        {!showForm && (
          <div className="flex flex-wrap gap-3 mb-6">
            {myProvince && (
              <button
                onClick={toggleMyArea}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  showingMyArea
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground hover:bg-muted"
                }`}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                </svg>
                {showingMyArea ? `Zona: ${myProvince}` : "Nella mia zona"}
              </button>
            )}

            {allEvents.length > 0 && provinces.length > 1 && (
              <div className="flex-1 min-w-[140px]">
                <select
                  value={filterProvince}
                  onChange={(e) => { setFilterProvince(e.target.value); setShowingMyArea(e.target.value === myProvince); }}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Tutte le province</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-1 min-w-[140px]">
              <input
                type="text"
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                placeholder="Filtra per città..."
                className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {(filterCity || filterProvince) && (
              <button
                onClick={() => { setFilterCity(""); setFilterProvince(""); setShowingMyArea(false); }}
                className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-muted transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && allEvents.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
            </div>
            <p className="text-foreground font-semibold">Nessun evento in programma</p>
            <p className="text-muted-foreground text-sm mt-1">Sii il primo a organizzare un raduno di piantagione!</p>
          </div>
        )}

        {!isLoading && allEvents.length > 0 && filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-foreground font-semibold">Nessun evento trovato in questa zona</p>
            <p className="text-muted-foreground text-sm mt-1">Prova a cambiare i filtri o sii il primo a creare un evento qui!</p>
            <button
              onClick={() => { setFilterCity(""); setFilterProvince(""); setShowingMyArea(false); }}
              className="mt-4 text-sm text-primary underline"
            >
              Mostra tutti gli eventi
            </button>
          </div>
        )}

        {filteredEvents.length > 0 && (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                currentUserId={user?.id ?? ""}
                onJoin={handleJoin}
                onLeave={handleLeave}
                onDelete={handleDelete}
                onEdit={handleEdit}
                today={today}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

interface EventFormProps {
  form: EventFormState;
  setField: (field: keyof EventFormState, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitting: boolean;
  today: string;
  title: string;
  submitLabel: string;
  submittingLabel: string;
}

function EventForm({ form, setField, onSubmit, onCancel, submitting, today, title, submitLabel, submittingLabel }: EventFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 p-5 bg-card border border-border rounded-2xl shadow-sm space-y-4"
    >
      <h2 className="font-semibold text-foreground">{title}</h2>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Titolo *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          placeholder="Es. Piantagione nel parco cittadino"
          maxLength={100}
          required
          className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Descrizione</label>
        <textarea
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="Racconta di cosa si tratta, cosa portare, ecc."
          rows={3}
          className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Luogo * — città e provincia</label>
        <LocationSearch
          value={form.location}
          onChange={(v) => setField("location", v)}
          onSelect={(r: LocationResult) => {
            setField("location", r.displayName);
            setField("city", r.city || "");
            setField("province", r.province || "");
          }}
          placeholder="Es. Parco Sempione, Milano..."
          className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Digita e seleziona dal menu per rilevare città e provincia automaticamente.
        </p>
        {form.province && (
          <p className="text-xs text-primary mt-1 flex items-center gap-1">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Provincia rilevata: <strong>{form.province}</strong>
            {form.city && <> · Città: <strong>{form.city}</strong></>}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Indirizzo preciso <span className="font-normal">(facoltativo)</span>
        </label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => setField("address", e.target.value)}
          placeholder="Es. Via Roma 1, Milano"
          maxLength={200}
          className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
        {form.address.trim() && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.address.trim())}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
          >
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            Apri su Google Maps
          </a>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">Data e ora inizio *</label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={form.eventDate}
            min={today}
            onChange={(e) => setField("eventDate", e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
          <input
            type="time"
            value={form.eventTime}
            onChange={(e) => setField("eventTime", e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">
          Data e ora fine <span className="font-normal">(facoltative)</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={form.endDate}
            min={form.eventDate || today}
            onChange={(e) => setField("endDate", e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => setField("endTime", e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

interface EventCardProps {
  event: EventItem;
  currentUserId: string;
  onJoin: (id: number) => void;
  onLeave: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
  onEdit: (id: number, data: Partial<EventFormState>) => Promise<void>;
  today: string;
}

const EVENT_REPORT_REASONS = [
  { value: "evento_falso",         it: "Evento falso o fuorviante",   en: "False or misleading event" },
  { value: "evento_inappropriato", it: "Evento inappropriato",        en: "Inappropriate event" },
  { value: "spam",                 it: "Spam",                        en: "Spam" },
  { value: "contenuto_falso",      it: "Contenuto falso",             en: "False content" },
  { value: "altro",                it: "Altro",                       en: "Other" },
];

function EventCard({ event, currentUserId, onJoin, onLeave, onDelete, onEdit, today }: EventCardProps) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const isOwner = event.userId === currentUserId;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reportReason) return;
    setReportSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ eventId: event.id, reason: reportReason, notes: reportNotes.trim() || undefined }),
      });
      if (res.status === 409) {
        toast({ title: "Hai già segnalato questo evento", variant: "destructive" });
        setReportOpen(false);
        return;
      }
      if (!res.ok) throw new Error();
      setReportDone(true);
    } catch {
      toast({ title: "Errore durante la segnalazione", variant: "destructive" });
    } finally {
      setReportSubmitting(false);
    }
  }

  function closeReportModal() {
    setReportOpen(false);
    setReportReason("");
    setReportNotes("");
    setReportDone(false);
  }
  const [editForm, setEditForm] = useState<EventFormState>({
    title: event.title,
    description: event.description ?? "",
    location: event.location,
    address: event.address ?? "",
    city: event.city ?? "",
    province: event.province ?? "",
    eventDate: event.eventDate,
    eventTime: event.eventTime,
    endDate: event.endDate ?? "",
    endTime: event.endTime ?? "",
  });

  function setEditField(field: keyof EventFormState, value: string) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.location.trim() || !editForm.eventDate || !editForm.eventTime) return;
    setEditSubmitting(true);
    try {
      await onEdit(event.id, editForm);
      setEditMode(false);
    } catch {
      toast({ title: "Errore", description: "Impossibile aggiornare l'evento.", variant: "destructive" });
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    setDeleteSubmitting(true);
    try {
      await onDelete(event.id);
      setConfirmDelete(false);
    } finally {
      setDeleteSubmitting(false);
    }
  }

  if (editMode) {
    return (
      <div className="p-1 bg-card border border-primary/30 rounded-2xl shadow-sm">
        <EventForm
          form={editForm}
          setField={setEditField}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditMode(false)}
          submitting={editSubmitting}
          today={today}
          title="Modifica evento"
          submitLabel="Salva modifiche"
          submittingLabel="Salvataggio..."
        />
      </div>
    );
  }

  return (
    <div className="p-5 bg-card border border-border rounded-2xl shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-base leading-snug">{event.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">organizzato da @{event.username}</p>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setEditMode(true)}
              className="text-muted-foreground hover:text-primary transition-colors p-1"
              title="Modifica evento"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
              title="Elimina evento"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {event.description && (
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{event.description}</p>
      )}

      <div className="flex flex-col gap-1.5 mb-4">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-primary flex-shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <span className="capitalize">
            {formatDate(event.eventDate)} — {formatTime(event.eventTime)}
            {event.endDate && (
              <span className="text-muted-foreground">
                {" "}→ {event.endDate !== event.eventDate ? formatDate(event.endDate) + " " : ""}
                {event.endTime ? formatTime(event.endTime) : ""}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-start gap-2 text-sm text-foreground">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-primary flex-shrink-0 mt-0.5">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
          <div className="flex flex-col gap-0.5">
            <span>
              {event.location}
              {event.province && (
                <span className="ml-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {event.province}
                </span>
              )}
            </span>
            {event.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                {event.address}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          <span>{event.participantCount} partecipanti</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          {event.isParticipating ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-primary font-medium">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="text-primary">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Parteciperò
              </div>
              {!isOwner && (
                <button
                  onClick={() => onLeave(event.id)}
                  className="text-xs text-muted-foreground hover:text-destructive underline transition-colors"
                >
                  Annulla
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => onJoin(event.id)}
              disabled={isOwner}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-default"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isOwner ? "Sei l'organizzatore" : "Parteciperò"}
            </button>
          )}
        </div>
        {!isOwner && (
          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            title="Segnala evento"
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="4" y1="22" x2="4" y2="15" strokeLinecap="round"/>
            </svg>
            Segnala
          </button>
        )}
      </div>

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-5">
            {reportDone ? (
              <>
                <div className="flex flex-col items-center gap-3 py-4">
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  <h2 className="font-semibold text-foreground text-center">Segnalazione inviata</h2>
                  <p className="text-sm text-muted-foreground text-center">Grazie. Il team esaminerà questo evento.</p>
                </div>
                <button
                  onClick={closeReportModal}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Chiudi
                </button>
              </>
            ) : (
              <>
                <h2 className="font-semibold text-foreground">Segnala evento</h2>
                <form onSubmit={handleSubmitReport} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-foreground">Motivo *</label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Seleziona un motivo</option>
                      {EVENT_REPORT_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.it}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-foreground">Note aggiuntive (opzionale)</label>
                    <textarea
                      value={reportNotes}
                      onChange={(e) => setReportNotes(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="Aggiungi dettagli..."
                      className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeReportModal}
                      disabled={reportSubmitting}
                      className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={!reportReason || reportSubmitting}
                      className="flex-1 py-2.5 bg-destructive text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {reportSubmitting ? "Invio..." : "Segnala"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-5">
            <h2 className="font-semibold text-foreground">Eliminare questo evento?</h2>
            <p className="text-sm text-muted-foreground">Tutti i partecipanti verranno rimossi. L'azione è irreversibile.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleteSubmitting}
                className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
                className="flex-1 py-2.5 bg-destructive text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {deleteSubmitting ? "Eliminazione..." : "Elimina"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
