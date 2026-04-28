import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import AdminDiscountSection from "@/components/AdminDiscountSection";

interface AdminUser {
  id: number;
  clerkUserId: string;
  username: string;
  photoUrl: string | null;
  country: string | null;
  city: string | null;
  treesPlanted: number;
  isBlocked: boolean;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  totalTrees: number;
  blockedUsers: number;
}

interface Report {
  id: number;
  reporterUserId: string;
  reportedUserId: string;
  reportedUsername: string | null;
  treeId: number | null;
  eventId: number | null;
  eventTitle: string | null;
  reason: string;
  notes: string | null;
  status: "pending" | "reviewed" | "dismissed";
  createdAt: string;
}

interface ProblemReport {
  id: number;
  userId: string;
  username: string | null;
  category: string;
  description: string;
  status: "new" | "in_progress" | "resolved" | "dismissed";
  adminNote: string | null;
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

interface AdminTree {
  id: number;
  userId: string;
  username: string | null;
  userPhotoUrl: string | null;
  photoUrl: string;
  plantName: string | null;
  species: string | null;
  locationName: string | null;
  country: string | null;
  verificationBypassed: boolean;
  photoStatus?: string;
  createdAt: string;
}

interface PendingTree {
  id: number;
  userId: string;
  username: string | null;
  userPhotoUrl: string | null;
  photoUrl: string;
  plantName: string | null;
  caption: string | null;
  species: string | null;
  locationName: string | null;
  country: string | null;
  photoStatus: string;
  createdAt: string;
}

interface PendingTreeUpdate {
  id: number;
  treeId: number;
  photoUrl: string;
  note: string | null;
  photoStatus: string;
  createdAt: string;
  username: string | null;
  plantName: string | null;
  species: string | null;
}

interface PendingEvent {
  id: number;
  userId: string;
  username: string | null;
  userPhotoUrl: string | null;
  title: string;
  description: string | null;
  location: string;
  address: string | null;
  city: string | null;
  province: string | null;
  eventDate: string;
  eventTime: string;
  endDate: string | null;
  endTime: string | null;
  moderationStatus: string;
  createdAt: string;
}

interface AdminAlertItem {
  id: number;
  title: string;
  message: string;
  priority: "low" | "normal" | "high" | "critical";
  targetGroup: "all" | "organization" | "user";
  createdAt: string;
  updatedAt: string;
}

type Tab = "users" | "reports" | "trees" | "problems" | "pending_events" | "pending_photos" | "pending_updates" | "pending_adopt_trees" | "alerts" | "tips" | "finance" | "discounts" | "ledger" | "settings";
type UserFilter = "all" | "active" | "blocked";
type ReportFilter = "all" | "pending" | "reviewed" | "dismissed";

const REASON_LABELS: Record<string, { it: string; en: string }> = {
  foto_non_vegetale:            { it: "Foto non è una pianta",       en: "Photo is not a plant" },
  contenuto_falso:              { it: "Contenuto falso",             en: "False content" },
  spam:                         { it: "Spam",                        en: "Spam" },
  comportamento_inappropriato:  { it: "Comportamento inappropriato", en: "Inappropriate behaviour" },
  violazione_privacy:           { it: "Violazione privacy",          en: "Privacy violation" },
  evento_inappropriato:         { it: "Evento inappropriato",        en: "Inappropriate event" },
  evento_falso:                 { it: "Evento falso o fuorviante",   en: "False or misleading event" },
  altro:                        { it: "Altro",                       en: "Other" },
};

function UserAvatar({ user }: { user: AdminUser }) {
  if (user.photoUrl) {
    return (
      <img
        src={user.photoUrl.startsWith("/objects/") ? `/api/storage${user.photoUrl}` : user.photoUrl}
        alt={user.username}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">
      {user.username[0]?.toUpperCase()}
    </div>
  );
}

function BillingRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 bg-card">
      <span className="text-xs text-muted-foreground w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-foreground break-all">{value ?? "—"}</span>
    </div>
  );
}

function AdminSettingsSection({
  lang,
  authFetch,
  toast,
}: {
  lang: "it" | "en";
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const T = lang === "it"
    ? {
        title: "Impostazioni piattaforma",
        subtitle: "Abilita o disabilita funzionalità per tutti gli utenti.",
        adoptionsTitle: "Adozioni alberi",
        adoptionsDesc: "Quando disabilitate, le organizzazioni non possono creare nuovi alberi in adozione e il pulsante \"Aggiungi albero\" appare sfocato.",
        enabled: "Abilitate",
        disabled: "Disabilitate",
        loading: "Caricamento...",
        loadError: "Errore caricamento impostazioni",
        savedEnabled: "Adozioni abilitate",
        savedDisabled: "Adozioni disabilitate",
        saveError: "Errore aggiornamento impostazione",
      }
    : {
        title: "Platform settings",
        subtitle: "Enable or disable features for all users.",
        adoptionsTitle: "Tree adoptions",
        adoptionsDesc: "When disabled, organizations cannot create new adoptable trees and the \"Add tree\" button is blurred.",
        enabled: "Enabled",
        disabled: "Disabled",
        loading: "Loading...",
        loadError: "Failed to load settings",
        savedEnabled: "Adoptions enabled",
        savedDisabled: "Adoptions disabled",
        saveError: "Failed to update setting",
      };

  const settingsQuery = useQuery<{ adoptionsEnabled: boolean }>({
    queryKey: ["admin-app-settings"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/app-settings");
      if (!res.ok) throw new Error("load failed");
      return res.json();
    },
  });

  const adoptionsEnabled = settingsQuery.data?.adoptionsEnabled ?? true;

  async function toggleAdoptions(next: boolean) {
    setSaving(true);
    try {
      const res = await authFetch("/api/admin/app-settings/adoptions", {
        method: "PUT",
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error("save failed");
      await queryClient.invalidateQueries({ queryKey: ["admin-app-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["app-settings-public"] });
      toast({ title: next ? T.savedEnabled : T.savedDisabled });
    } catch {
      toast({ title: T.saveError, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{T.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{T.subtitle}</p>
      </div>

      {settingsQuery.isLoading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">{T.loading}</div>
      ) : settingsQuery.isError ? (
        <div className="text-center py-10 text-destructive text-sm">{T.loadError}</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-5 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌳</span>
              <h3 className="font-semibold text-foreground">{T.adoptionsTitle}</h3>
              <span
                className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  adoptionsEnabled
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                }`}
              >
                {adoptionsEnabled ? T.enabled : T.disabled}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{T.adoptionsDesc}</p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={adoptionsEnabled}
            disabled={saving}
            onClick={() => toggleAdoptions(!adoptionsEnabled)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
              adoptionsEnabled ? "bg-emerald-500" : "bg-muted"
            }`}
            title={adoptionsEnabled ? T.enabled : T.disabled}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                adoptionsEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const { lang } = useLang();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<AdminUser | null>(null);
  const [showDeleteTreeModal, setShowDeleteTreeModal] = useState<AdminTree | null>(null);
  const [userFilter, setUserFilter] = useState<UserFilter>("all");
  const [reportFilter, setReportFilter] = useState<ReportFilter>("pending");
  const [adminTrees, setAdminTrees] = useState<AdminTree[]>([]);
  const [treesLoading, setTreesLoading] = useState(false);
  const [treeSearch, setTreeSearch] = useState("");
  const [treePage, setTreePage] = useState(1);
  const [treePages, setTreePages] = useState(1);
  const [problemReports, setProblemReports] = useState<ProblemReport[]>([]);
  const [problemsLoading, setProblemsLoading] = useState(false);
  const [problemStatusFilter, setProblemStatusFilter] = useState<"all" | "new" | "in_progress" | "resolved" | "dismissed">("new");
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [pendingTrees, setPendingTrees] = useState<PendingTree[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingTreesHasMore, setPendingTreesHasMore] = useState(false);
  const [pendingTreesPage, setPendingTreesPage] = useState(1);
  const [pendingUpdates, setPendingUpdates] = useState<PendingTreeUpdate[]>([]);
  const [pendingUpdatesLoading, setPendingUpdatesLoading] = useState(false);
  const [pendingUpdatesHasMore, setPendingUpdatesHasMore] = useState(false);
  const [pendingUpdatesPage, setPendingUpdatesPage] = useState(1);
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
  const [pendingEventsLoading, setPendingEventsLoading] = useState(false);
  const [pendingEventsHasMore, setPendingEventsHasMore] = useState(false);
  const [pendingEventsPage, setPendingEventsPage] = useState(1);
  const [eventReviewMessages, setEventReviewMessages] = useState<Record<number, string>>({});
  const [pendingCounts, setPendingCounts] = useState<{ pendingTrees: number; pendingUpdates: number; pendingEvents: number; pendingAdoptTrees: number }>({ pendingTrees: 0, pendingUpdates: 0, pendingEvents: 0, pendingAdoptTrees: 0 });
  const [pendingAdoptTrees, setPendingAdoptTrees] = useState<Array<{ id: number; ownerId: string; ownerEmail: string; title: string; description: string; speciesName: string | null; locationName: string | null; imageUrl: string | null; thumbnailUrl: string | null; productDescription: string | null; priceCents: number; durationDays: number; moderationStatus: string; moderationMessage: string | null; createdAt: string; ownerUsername: string | null; ownerPhotoUrl: string | null }>>([]);
  const [pendingAdoptLoading, setPendingAdoptLoading] = useState(false);
  const [pendingAdoptHasMore, setPendingAdoptHasMore] = useState(false);
  const [pendingAdoptPage, setPendingAdoptPage] = useState(1);
  const [adoptRejectMessages, setAdoptRejectMessages] = useState<Record<number, string>>({});
  const pendingTreesSentinel = useRef<HTMLDivElement>(null);
  const pendingUpdatesSentinel = useRef<HTMLDivElement>(null);
  const pendingEventsSentinel = useRef<HTMLDivElement>(null);

  // ── Stato consigli admin ──────────────────────────────────────────────────
  interface AdminTipItem { id: number; title: string; description: string; category: string; imageUrl?: string | null; createdAt: string; updatedAt: string; }
  const [adminTips, setAdminTips] = useState<AdminTipItem[]>([]);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [editingTip, setEditingTip] = useState<AdminTipItem | null>(null);
  const [tipSubmitting, setTipSubmitting] = useState(false);
  const [tipImageUploading, setTipImageUploading] = useState(false);
  const tipImageInputRef = useRef<HTMLInputElement>(null);
  const TIP_CATEGORIES = ["general", "piante", "coltivazione", "irrigazione", "potatura", "fertilizzazione", "parassiti", "stagioni"];
  const [tipForm, setTipForm] = useState({ title: "", description: "", category: "general", imageUrl: "" });

  // ── Stato avvisi admin ────────────────────────────────────────────────────
  const [adminAlerts, setAdminAlerts] = useState<AdminAlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AdminAlertItem | null>(null);
  const [alertSubmitting, setAlertSubmitting] = useState(false);
  const [alertForm, setAlertForm] = useState({ title: "", message: "", priority: "normal", targetGroup: "all" });
  const [personalNotifForm, setPersonalNotifForm] = useState({ userId: "", username: "", title: "", message: "" });
  const [personalNotifSubmitting, setPersonalNotifSubmitting] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<{ clerkUserId: string; username: string; photoUrl: string | null }[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  interface PricingTier { id: number; durationDays: number; priceCents: number; label: string; isActive: boolean; createdAt: string }
  interface CampaignFiscal {
    id: number; title: string; userId: string; paymentStatus: string;
    pricePaidCents: number | null; durationDays: number | null;
    expiresAt: string | null; createdAt: string; orgUsername: string | null;
    fiscalDenominazione: string | null; fiscalIndirizzo: string | null;
    fiscalPartitaIva: string | null; fiscalCodiceFiscale: string | null;
    fiscalCodiceUnivoco: string | null; fiscalEmail: string | null;
    fiscalTelefono: string | null; fiscalReferente: string | null;
  }
  interface FinanceData {
    platformRevenue: { totalCommissions: number; transactionCount: number };
    recentPaidCampaigns: CampaignFiscal[];
    pricingTiers: PricingTier[];
  }
  const [pricingForm, setPricingForm] = useState({ label: "", durationDays: "", priceCents: "" });
  const [editingPricing, setEditingPricing] = useState<PricingTier | null>(null);
  const [pricingSubmitting, setPricingSubmitting] = useState(false);
  const [campaignFiscalModal, setCampaignFiscalModal] = useState<CampaignFiscal | null>(null);
  const queryClient = useQueryClient();
  const { data: financeData, isLoading: financeLoading } = useQuery<FinanceData>({
    queryKey: ["admin-finance"],
    queryFn: async () => {
      const res = await authFetch("/api/donations/admin/finance");
      if (res.ok) return res.json();
      throw new Error("Failed to load finance data");
    },
    enabled: activeTab === "finance",
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  interface LedgerEntry {
    id: number; type: string; amountCents: number; currency: string;
    paymentMethod: string; stripePaymentIntentId: string | null; paypalOrderId: string | null;
    userId: string; entityUserId: string | null; entityUserName: string | null;
    entityDenominazione: string | null; entityIndirizzo: string | null;
    entityPartitaIva: string | null; entityCodiceFiscale: string | null;
    entityCodiceUnivoco: string | null; entityEmail: string | null;
    entityTelefono: string | null; entityReferente: string | null;
    refundIntestatario: string | null; refundDate: string | null;
    linkedLedgerId: number | null;
    campaignId: number | null; adoptionId: number | null;
    description: string; deletedAt: string | null; deletedBy: string | null; createdAt: string;
  }
  interface LedgerData {
    entries: LedgerEntry[];
    summary: { totalCents: number; commissionCents: number; campaignCents: number; adoptionCents: number; refundCents: number; count: number };
  }
  interface BillingData {
    type: "organization" | "user";
    username: string;
    accountType: string;
    country: string | null;
    city: string | null;
    ragioneSociale?: string;
    partitaIva?: string;
    codiceFiscale?: string;
    codiceUnivoco?: string;
    formaGiuridica?: string;
    numeroRegistroImprese?: string | null;
    indirizzoVia?: string;
    indirizzoCitta?: string;
    indirizzoCap?: string;
    indirizzoStato?: string;
    emailUfficiale?: string;
    telefono?: string;
    referenteNome?: string;
    referenteCognome?: string;
  }

  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>("all");
  const [deletingLedgerId, setDeletingLedgerId] = useState<number | null>(null);
  const [confirmDeleteLedgerId, setConfirmDeleteLedgerId] = useState<number | null>(null);
  const [billingModal, setBillingModal] = useState<LedgerEntry | null>(null);
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [refundModal, setRefundModal] = useState<LedgerEntry | null>(null);
  const [refundForm, setRefundForm] = useState({ amountCents: "", description: "", paymentMethod: "manual", refundIntestatario: "", refundDate: new Date().toISOString().slice(0, 10) });
  const [refundLoading, setRefundLoading] = useState(false);

  const T = {
    it: {
      title: "Pannello di controllo", subtitle: "Gestione utenti e contenuti",
      tabs: { users: "Utenti", reports: "Segnalazioni", trees: "Contenuti", problems: "Problemi", alerts: "Avvisi", tips: "Consigli", finance: "Finanza", discounts: "Sconti", ledger: "Ledger", settings: "Impostazioni" },
      stats: { users: "Utenti totali", trees: "Alberi piantati", blocked: "Utenti bloccati" },
      search: "Cerca utente...", searchTrees: "Cerca contenuto...",
      filters: { all: "Tutti", active: "Attivi", blocked: "Bloccati", pending: "In attesa", reviewed: "Esaminati", dismissed: "Archiviati" },
      block: "Blocca", unblock: "Sblocca", delete: "Elimina",
      blocked: "Bloccato", active: "Attivo", trees: "piante",
      joined: "Iscritto", noUsers: "Nessun utente trovato",
      backToApp: "Torna all'app",
      reportedUser: "Utente segnalato", reporter: "Segnalato da",
      reason: "Motivo", notes: "Note", date: "Data",
      markReviewed: "Esamina", dismiss: "Archivia", pending: "In attesa",
      reviewed: "Esaminato", dismissed: "Archiviato", noReports: "Nessuna segnalazione",
      blockUser: "Blocca utente", deleteTree: "Elimina foto",
      reportType: { user: "Utente", tree: "Foto" },
      noTrees: "Nessun contenuto trovato",
      treeDeleteModal: { title: "Elimina contenuto", desc: "Questa operazione eliminerà definitivamente questa foto e il relativo albero.", confirm: "Elimina definitivamente", cancel: "Annulla" },
      deleteModal: {
        title: "Elimina utente", desc: "Questa operazione eliminerà definitivamente l'utente e tutti i suoi contenuti.", confirm: "Elimina definitivamente", cancel: "Annulla",
      },
      errors: { forbidden: "Accesso negato.", load: "Errore caricamento", block: "Errore blocco", unblock: "Errore sblocco", delete: "Errore eliminazione", report: "Errore segnalazione", deleteTree: "Errore eliminazione contenuto" },
    },
    en: {
      title: "Admin Panel", subtitle: "User and content management",
      tabs: { users: "Users", reports: "Reports", trees: "Content", problems: "Problems", alerts: "Alerts", tips: "Tips", finance: "Finance", discounts: "Discounts", ledger: "Ledger", settings: "Settings" },
      stats: { users: "Total users", trees: "Trees planted", blocked: "Blocked users" },
      search: "Search user...", searchTrees: "Search content...",
      filters: { all: "All", active: "Active", blocked: "Blocked", pending: "Pending", reviewed: "Reviewed", dismissed: "Dismissed" },
      block: "Block", unblock: "Unblock", delete: "Delete",
      blocked: "Blocked", active: "Active", trees: "plants",
      joined: "Joined", noUsers: "No users found",
      backToApp: "Back to app",
      reportedUser: "Reported user", reporter: "Reported by",
      reason: "Reason", notes: "Notes", date: "Date",
      markReviewed: "Review", dismiss: "Dismiss", pending: "Pending",
      reviewed: "Reviewed", dismissed: "Dismissed", noReports: "No reports",
      blockUser: "Block user", deleteTree: "Delete photo",
      reportType: { user: "User", tree: "Photo" },
      noTrees: "No content found",
      treeDeleteModal: { title: "Delete content", desc: "This will permanently delete this photo and the associated tree.", confirm: "Delete permanently", cancel: "Cancel" },
      deleteModal: {
        title: "Delete user", desc: "This will permanently delete the user and all their content.", confirm: "Delete permanently", cancel: "Cancel",
      },
      errors: { forbidden: "Access denied.", load: "Load error", block: "Block error", unblock: "Unblock error", delete: "Delete error", report: "Report error", deleteTree: "Delete content error" },
    },
  }[lang];

  async function authFetch(url: string, options?: RequestInit) {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
    });
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        authFetch("/api/admin/stats"),
        authFetch(`/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`),
      ]);
      if (statsRes.status === 403) { toast({ title: T.errors.forbidden, variant: "destructive" }); setLocation("/feed"); return; }
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch { toast({ title: T.errors.load, variant: "destructive" }); }
    finally { setLoading(false); }
  }

  async function loadReports() {
    setReportsLoading(true);
    try {
      const res = await authFetch("/api/admin/reports");
      if (res.ok) setReports(await res.json());
    } catch { toast({ title: T.errors.load, variant: "destructive" }); }
    finally { setReportsLoading(false); }
  }

  async function loadTrees(page = 1, search = "") {
    setTreesLoading(true);
    try {
      const url = `/api/admin/trees?page=${page}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        setAdminTrees(data.trees);
        setTreePages(data.pages);
        setTreePage(data.page);
      }
    } catch { toast({ title: T.errors.load, variant: "destructive" }); }
    finally { setTreesLoading(false); }
  }

  async function handleDeleteTree(tree: AdminTree) {
    setActionLoading(`tree:${tree.id}:delete`);
    try {
      const res = await authFetch(`/api/admin/trees/${tree.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error();
      setAdminTrees((p) => p.filter((t) => t.id !== tree.id));
      setStats((s) => s ? { ...s, totalTrees: Math.max(0, s.totalTrees - 1) } : s);
      toast({ title: lang === "it" ? "Contenuto eliminato" : "Content deleted" });
    } catch { toast({ title: T.errors.deleteTree, variant: "destructive" }); }
    finally { setActionLoading(null); setShowDeleteTreeModal(null); }
  }

  async function handleApproveAdminTree(tree: AdminTree) {
    setActionLoading(`tree:${tree.id}:approve`);
    try {
      const res = await authFetch(`/api/admin/trees/${tree.id}/approve`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      setAdminTrees((p) => p.filter((t) => t.id !== tree.id));
      toast({ title: lang === "it" ? "✅ Contenuto approvato" : "✅ Content approved" });
    } catch { toast({ title: lang === "it" ? "Errore approvazione" : "Approval error", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleDeleteTreeFromReport(report: Report) {
    if (!report.treeId) return;
    setActionLoading(`report:${report.id}:delete-tree`);
    try {
      const res = await authFetch(`/api/admin/reports/${report.id}/delete-tree`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error();
      setReports((p) => p.map((r) => r.id === report.id ? { ...r, status: "reviewed" } : r));
      setStats((s) => s ? { ...s, totalTrees: Math.max(0, s.totalTrees - 1) } : s);
      toast({ title: lang === "it" ? "Foto eliminata e segnalazione esaminata" : "Photo deleted and report reviewed" });
    } catch { toast({ title: T.errors.deleteTree, variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleDeleteEventFromReport(report: Report) {
    if (!report.eventId) return;
    setActionLoading(`report:${report.id}:delete-event`);
    try {
      const res = await authFetch(`/api/admin/events/${report.eventId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error();
      setReports((p) => p.map((r) =>
        r.eventId === report.eventId ? { ...r, status: "reviewed" } : r
      ));
      toast({ title: lang === "it" ? "🗑️ Evento eliminato e segnalazioni esaminate" : "🗑️ Event deleted and reports reviewed" });
    } catch { toast({ title: lang === "it" ? "Errore eliminazione evento" : "Delete event error", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function loadPendingCounts() {
    try {
      const res = await authFetch("/api/admin/pending-counts");
      if (res.ok) setPendingCounts(await res.json());
    } catch {}
  }

  async function loadPendingTrees(page = 1) {
    if (pendingLoading) return;
    setPendingLoading(true);
    try {
      const res = await authFetch(`/api/admin/trees/pending?page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        if (page === 1) {
          setPendingTrees(data.items);
        } else {
          setPendingTrees((prev) => [...prev, ...data.items]);
        }
        setPendingTreesHasMore(data.hasMore);
        setPendingTreesPage(page);
        setPendingCounts((c) => ({ ...c, pendingTrees: data.total }));
      }
    } catch { toast({ title: T.errors.load, variant: "destructive" }); }
    finally { setPendingLoading(false); }
  }

  async function handleApprovePendingTree(tree: PendingTree) {
    setActionLoading(`pending:${tree.id}:approve`);
    try {
      const res = await authFetch(`/api/admin/trees/${tree.id}/approve`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      setPendingTrees((p) => p.filter((t) => t.id !== tree.id));
      setPendingCounts((c) => ({ ...c, pendingTrees: Math.max(0, c.pendingTrees - 1) }));
      toast({ title: lang === "it" ? "✅ Foto approvata" : "✅ Photo approved" });
    } catch { toast({ title: lang === "it" ? "Errore approvazione" : "Approval error", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleRejectPendingTree(tree: PendingTree) {
    setActionLoading(`pending:${tree.id}:reject`);
    try {
      const res = await authFetch(`/api/admin/trees/${tree.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPendingTrees((p) => p.filter((t) => t.id !== tree.id));
      setPendingCounts((c) => ({ ...c, pendingTrees: Math.max(0, c.pendingTrees - 1) }));
      toast({ title: lang === "it" ? "🗑️ Contenuto eliminato" : "🗑️ Content deleted" });
    } catch { toast({ title: lang === "it" ? "Errore eliminazione" : "Delete error", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function loadPendingAdoptTrees(page = 1) {
    if (pendingAdoptLoading) return;
    setPendingAdoptLoading(true);
    try {
      const res = await authFetch(`/api/admin/adopt/trees/pending?page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        if (page === 1) {
          setPendingAdoptTrees(data.items);
        } else {
          setPendingAdoptTrees((prev) => [...prev, ...data.items]);
        }
        setPendingAdoptHasMore(data.hasMore);
        setPendingAdoptPage(page);
        setPendingCounts((c) => ({ ...c, pendingAdoptTrees: data.total }));
      }
    } catch { toast({ title: lang === "it" ? "Errore caricamento" : "Load error", variant: "destructive" }); }
    finally { setPendingAdoptLoading(false); }
  }

  async function handleApproveAdoptTree(id: number, title: string) {
    setActionLoading(`adopt:${id}:approve`);
    try {
      const res = await authFetch(`/api/admin/adopt/trees/${id}/approve`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      setPendingAdoptTrees((p) => p.filter((t) => t.id !== id));
      setPendingCounts((c) => ({ ...c, pendingAdoptTrees: Math.max(0, c.pendingAdoptTrees - 1) }));
      toast({ title: lang === "it" ? `✅ "${title}" approvato e pubblicato` : `✅ "${title}" approved and published` });
    } catch { toast({ title: lang === "it" ? "Errore approvazione" : "Approval error", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleRejectAdoptTree(id: number, title: string) {
    const message = adoptRejectMessages[id] ?? "";
    setActionLoading(`adopt:${id}:reject`);
    try {
      const res = await authFetch(`/api/admin/adopt/trees/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error();
      setPendingAdoptTrees((p) => p.filter((t) => t.id !== id));
      setPendingCounts((c) => ({ ...c, pendingAdoptTrees: Math.max(0, c.pendingAdoptTrees - 1) }));
      toast({ title: lang === "it" ? `❌ "${title}" rifiutato` : `❌ "${title}" rejected` });
    } catch { toast({ title: lang === "it" ? "Errore rifiuto" : "Reject error", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function loadPendingUpdates(page = 1) {
    if (pendingUpdatesLoading) return;
    setPendingUpdatesLoading(true);
    try {
      const res = await authFetch(`/api/admin/tree-updates/pending?page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        if (page === 1) {
          setPendingUpdates(data.items);
        } else {
          setPendingUpdates((prev) => [...prev, ...data.items]);
        }
        setPendingUpdatesHasMore(data.hasMore);
        setPendingUpdatesPage(page);
        setPendingCounts((c) => ({ ...c, pendingUpdates: data.total }));
      }
    } catch { toast({ title: T.errors.load, variant: "destructive" }); }
    finally { setPendingUpdatesLoading(false); }
  }

  async function handleApprovePendingUpdate(update: PendingTreeUpdate) {
    setActionLoading(`update:${update.id}:approve`);
    try {
      const res = await authFetch(`/api/admin/tree-updates/${update.id}/approve`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      setPendingUpdates((p) => p.filter((u) => u.id !== update.id));
      setPendingCounts((c) => ({ ...c, pendingUpdates: Math.max(0, c.pendingUpdates - 1) }));
      toast({ title: lang === "it" ? "✅ Aggiornamento approvato" : "✅ Update approved" });
    } catch { toast({ title: lang === "it" ? "Errore approvazione" : "Approval error", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleRejectPendingUpdate(update: PendingTreeUpdate) {
    setActionLoading(`update:${update.id}:reject`);
    try {
      const res = await authFetch(`/api/admin/tree-updates/${update.id}/reject`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      setPendingUpdates((p) => p.filter((u) => u.id !== update.id));
      setPendingCounts((c) => ({ ...c, pendingUpdates: Math.max(0, c.pendingUpdates - 1) }));
      toast({ title: lang === "it" ? "🗑️ Aggiornamento eliminato" : "🗑️ Update deleted" });
    } catch { toast({ title: lang === "it" ? "Errore eliminazione" : "Delete error", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function loadPendingEvents(page = 1) {
    if (pendingEventsLoading) return;
    setPendingEventsLoading(true);
    try {
      const res = await authFetch(`/api/admin/events/pending?page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        if (page === 1) {
          setPendingEvents(data.items);
        } else {
          setPendingEvents((prev) => [...prev, ...data.items]);
        }
        setPendingEventsHasMore(data.hasMore);
        setPendingEventsPage(page);
        setPendingCounts((c) => ({ ...c, pendingEvents: data.total }));
      }
    } catch { toast({ title: T.errors.load, variant: "destructive" }); }
    finally { setPendingEventsLoading(false); }
  }

  async function handleReviewPendingEvent(event: PendingEvent, action: "approve" | "reject") {
    setActionLoading(`event:${event.id}:${action}`);
    try {
      const message = eventReviewMessages[event.id]?.trim() ?? "";
      const res = await authFetch(`/api/admin/events/${event.id}/${action}`, {
        method: "PATCH",
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error();
      setPendingEvents((p) => p.filter((e) => e.id !== event.id));
      setEventReviewMessages((prev) => {
        const next = { ...prev };
        delete next[event.id];
        return next;
      });
      setPendingCounts((c) => ({ ...c, pendingEvents: Math.max(0, c.pendingEvents - 1) }));
      toast({
        title: action === "approve"
          ? (lang === "it" ? "✅ Evento approvato" : "✅ Event approved")
          : (lang === "it" ? "Evento rifiutato" : "Event rejected"),
        description: lang === "it" ? "Il creatore ha ricevuto un avviso personale." : "The creator received a personal notification.",
      });
    } catch {
      toast({ title: lang === "it" ? "Errore revisione evento" : "Event review error", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  async function loadProblemReports() {
    setProblemsLoading(true);
    try {
      const res = await authFetch("/api/admin/problem-reports");
      if (res.ok) setProblemReports(await res.json());
    } catch { toast({ title: T.errors.load, variant: "destructive" }); }
    finally { setProblemsLoading(false); }
  }

  async function handleProblemStatusChange(report: ProblemReport, status: ProblemReport["status"]) {
    setActionLoading(`problem:${report.id}:${status}`);
    try {
      const res = await authFetch(`/api/admin/problem-reports/${report.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json() as ProblemReport;
      setProblemReports((p) => p.map((r) => r.id === report.id ? updated : r));
    } catch { toast({ title: T.errors.report, variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleSendReply(report: ProblemReport) {
    if (!replyText.trim()) return;
    setActionLoading(`problem:${report.id}:reply`);
    try {
      const res = await authFetch(`/api/admin/problem-reports/${report.id}/reply`, {
        method: "PATCH",
        body: JSON.stringify({ replyText: replyText.trim() }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json() as ProblemReport;
      setProblemReports((p) => p.map((r) => r.id === report.id ? updated : r));
      setReplyingToId(null);
      setReplyText("");
      toast({
        title: lang === "it" ? "🔔 Risposta inviata" : "🔔 Reply sent",
        description: lang === "it"
          ? `La risposta è stata consegnata come notifica personale a @${report.username ?? "utente"} nella sezione Avvisi.`
          : `The reply was delivered as a personal notification to @${report.username ?? "user"} in the Alerts section.`,
      });
    } catch {
      toast({ title: lang === "it" ? "Errore invio risposta" : "Error sending reply", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  // ── Funzioni CRUD avvisi ──────────────────────────────────────────────────
  async function loadAdminAlerts() {
    setAlertsLoading(true);
    try {
      const res = await authFetch("/api/alerts");
      if (res.ok) setAdminAlerts(await res.json());
    } catch { toast({ title: T.errors.load, variant: "destructive" }); }
    finally { setAlertsLoading(false); }
  }

  async function handleSaveAlert(e: React.FormEvent) {
    e.preventDefault();
    if (!alertForm.title.trim() || !alertForm.message.trim()) return;
    setAlertSubmitting(true);
    try {
      const method = editingAlert ? "PATCH" : "POST";
      const url = editingAlert ? `/api/admin/alerts/${editingAlert.id}` : "/api/admin/alerts";
      const res = await authFetch(url, { method, body: JSON.stringify(alertForm) });
      if (!res.ok) throw new Error();
      const saved: AdminAlertItem = await res.json();
      if (editingAlert) {
        setAdminAlerts((p) => p.map((a) => a.id === saved.id ? saved : a));
      } else {
        setAdminAlerts((p) => [saved, ...p]);
      }
      setAlertForm({ title: "", message: "", priority: "normal", targetGroup: "all" });
      setEditingAlert(null);
      toast({ title: lang === "it" ? (editingAlert ? "Avviso aggiornato" : "✅ Avviso pubblicato e notifica inviata") : (editingAlert ? "Alert updated" : "✅ Alert published and notification sent") });
    } catch { toast({ title: lang === "it" ? "Errore salvataggio avviso" : "Error saving alert", variant: "destructive" }); }
    finally { setAlertSubmitting(false); }
  }

  async function handleDeleteAlert(alert: AdminAlertItem) {
    setActionLoading(`alert:${alert.id}:delete`);
    try {
      const res = await authFetch(`/api/admin/alerts/${alert.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setAdminAlerts((p) => p.filter((a) => a.id !== alert.id));
      toast({ title: lang === "it" ? "🗑️ Avviso eliminato" : "🗑️ Alert deleted" });
    } catch { toast({ title: lang === "it" ? "Errore eliminazione avviso" : "Error deleting alert", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleUserSearch(q: string) {
    setUserSearchQuery(q);
    if (!q.trim() || q.trim().length < 2) { setUserSearchResults([]); return; }
    setUserSearchLoading(true);
    try {
      const res = await authFetch(`/api/admin/users?search=${encodeURIComponent(q.trim())}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUserSearchResults(
        (data as any[]).slice(0, 8).map((u: any) => ({
          clerkUserId: u.clerkUserId,
          username: u.username ?? u.clerkUserId,
          photoUrl: u.photoUrl ?? null,
        }))
      );
    } catch { setUserSearchResults([]); }
    finally { setUserSearchLoading(false); }
  }

  async function handleSendPersonalNotif(e: React.FormEvent) {
    e.preventDefault();
    if (!personalNotifForm.userId || !personalNotifForm.title.trim() || !personalNotifForm.message.trim()) return;
    setPersonalNotifSubmitting(true);
    try {
      const res = await authFetch("/api/admin/notifications/user", {
        method: "POST",
        body: JSON.stringify({
          userId: personalNotifForm.userId,
          title: personalNotifForm.title.trim(),
          message: personalNotifForm.message.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      setPersonalNotifForm({ userId: "", username: "", title: "", message: "" });
      setUserSearchQuery("");
      setUserSearchResults([]);
      toast({ title: lang === "it" ? `✅ Notifica inviata a @${personalNotifForm.username}` : `✅ Notification sent to @${personalNotifForm.username}` });
    } catch {
      toast({ title: lang === "it" ? "Errore invio notifica" : "Error sending notification", variant: "destructive" });
    } finally { setPersonalNotifSubmitting(false); }
  }

  // ── Funzioni CRUD consigli ────────────────────────────────────────────────

  async function loadAdminTips() {
    setTipsLoading(true);
    try {
      const res = await authFetch("/api/tips");
      if (res.ok) setAdminTips(await res.json());
    } catch { toast({ title: T.errors.load, variant: "destructive" }); }
    finally { setTipsLoading(false); }
  }

  async function handleAdminTipImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTipImageUploading(true);
    try {
      const mime = file.type || "image/jpeg";
      const ext = mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : "jpg";
      const res = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `tip.${ext}`, size: file.size, contentType: mime }),
      });
      if (!res.ok) throw new Error();
      const { uploadURL } = await res.json();
      const uploadRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": mime }, body: file });
      if (!uploadRes.ok) throw new Error();
      const { finalObjectPath } = await uploadRes.json();
      setTipForm((f) => ({ ...f, imageUrl: finalObjectPath }));
    } catch {
      toast({ title: lang === "it" ? "Errore caricamento foto" : "Photo upload error", variant: "destructive" });
    } finally {
      setTipImageUploading(false);
      if (tipImageInputRef.current) tipImageInputRef.current.value = "";
    }
  }

  async function handleSaveTip(e: React.FormEvent) {
    e.preventDefault();
    if (!tipForm.title.trim() || !tipForm.description.trim()) return;
    setTipSubmitting(true);
    try {
      const method = editingTip ? "PATCH" : "POST";
      const url = editingTip ? `/api/admin/tips/${editingTip.id}` : "/api/admin/tips";
      const res = await authFetch(url, {
        method,
        body: JSON.stringify({
          title: tipForm.title,
          description: tipForm.description,
          category: tipForm.category,
          imageUrl: tipForm.imageUrl || null,
        }),
      });
      if (!res.ok) throw new Error();
      const saved: AdminTipItem = await res.json();
      if (editingTip) {
        setAdminTips((p) => p.map((t) => t.id === saved.id ? saved : t));
      } else {
        setAdminTips((p) => [saved, ...p]);
      }
      setTipForm({ title: "", description: "", category: "general", imageUrl: "" });
      setEditingTip(null);
      toast({ title: lang === "it" ? (editingTip ? "Consiglio aggiornato" : "✅ Consiglio pubblicato") : (editingTip ? "Tip updated" : "✅ Tip published") });
    } catch { toast({ title: lang === "it" ? "Errore salvataggio consiglio" : "Error saving tip", variant: "destructive" }); }
    finally { setTipSubmitting(false); }
  }

  async function handleDeleteTip(tip: AdminTipItem) {
    setActionLoading(`tip:${tip.id}:delete`);
    try {
      const res = await authFetch(`/api/admin/tips/${tip.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setAdminTips((p) => p.filter((t) => t.id !== tip.id));
      toast({ title: lang === "it" ? "🗑️ Consiglio eliminato" : "🗑️ Tip deleted" });
    } catch { toast({ title: lang === "it" ? "Errore eliminazione consiglio" : "Error deleting tip", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function loadLedger() {
    setLedgerLoading(true);
    try {
      const res = await authFetch("/api/admin/payment-ledger");
      if (res.ok) setLedgerData(await res.json());
    } catch { toast({ title: T.errors.load, variant: "destructive" }); }
    finally { setLedgerLoading(false); }
  }

  async function handleDeleteLedgerEntry(id: number) {
    setDeletingLedgerId(id);
    try {
      const res = await authFetch(`/api/admin/payment-ledger/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLedgerData((prev) => prev ? {
        ...prev,
        entries: prev.entries.filter((e) => e.id !== id),
        summary: {
          ...prev.summary,
          count: prev.summary.count - 1,
        },
      } : null);
      setConfirmDeleteLedgerId(null);
      toast({ title: lang === "it" ? "Voce eliminata dal ledger" : "Ledger entry deleted" });
    } catch { toast({ title: lang === "it" ? "Errore eliminazione voce" : "Error deleting entry", variant: "destructive" }); }
    finally { setDeletingLedgerId(null); }
  }

  async function openBillingModal(entry: LedgerEntry) {
    setBillingModal(entry);
    setBillingData(null);
    // If fiscal data is embedded in the entry, no API call needed
    if (entry.entityDenominazione || entry.entityPartitaIva) {
      setBillingLoading(false);
      return;
    }
    // Fallback: fetch current data from API (for older entries without snapshot)
    if (!entry.entityUserId) return;
    setBillingLoading(true);
    try {
      const res = await authFetch(`/api/admin/ledger/billing/${encodeURIComponent(entry.entityUserId)}`);
      if (res.ok) setBillingData(await res.json());
    } catch { /* non-critical */ }
    finally { setBillingLoading(false); }
  }

  async function handleCreateRefund() {
    if (!refundModal) return;
    const amountCents = Math.round(parseFloat(refundForm.amountCents) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast({ title: lang === "it" ? "Importo non valido" : "Invalid amount", variant: "destructive" });
      return;
    }
    setRefundLoading(true);
    try {
      const res = await authFetch("/api/admin/payment-ledger/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          paymentMethod: refundForm.paymentMethod,
          description: refundForm.description.trim() || (lang === "it" ? "Rimborso" : "Refund"),
          linkedLedgerId: refundModal.id,
          refundIntestatario: refundForm.refundIntestatario.trim() || null,
          refundDate: refundForm.refundDate || new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) throw new Error();
      const { entry } = await res.json();
      setLedgerData((prev) => prev ? {
        ...prev,
        entries: [entry, ...prev.entries],
        summary: { ...prev.summary, count: prev.summary.count + 1, refundCents: (prev.summary.refundCents ?? 0) + amountCents },
      } : null);
      setRefundModal(null);
      setRefundForm({ amountCents: "", description: "", paymentMethod: "manual", refundIntestatario: "", refundDate: new Date().toISOString().slice(0, 10) });
      toast({ title: lang === "it" ? "Rimborso registrato" : "Refund recorded" });
    } catch {
      toast({ title: lang === "it" ? "Errore registrazione rimborso" : "Error recording refund", variant: "destructive" });
    } finally { setRefundLoading(false); }
  }

  useEffect(() => { loadUsers(); }, [search]);
  useEffect(() => { if (activeTab === "reports") loadReports(); }, [activeTab]);
  useEffect(() => { if (activeTab === "trees") loadTrees(1, treeSearch); }, [activeTab]);
  useEffect(() => { if (activeTab === "trees") loadTrees(treePage, treeSearch); }, [treePage]);
  useEffect(() => { if (activeTab === "problems") loadProblemReports(); }, [activeTab]);
  useEffect(() => { if (activeTab === "pending_events") loadPendingEvents(1); }, [activeTab]);
  useEffect(() => { if (activeTab === "pending_photos") loadPendingTrees(1); }, [activeTab]);
  useEffect(() => { if (activeTab === "pending_updates") loadPendingUpdates(1); }, [activeTab]);
  useEffect(() => { if (activeTab === "pending_adopt_trees") loadPendingAdoptTrees(1); }, [activeTab]);
  useEffect(() => { if (activeTab === "alerts") loadAdminAlerts(); }, [activeTab]);
  useEffect(() => { if (activeTab === "tips") loadAdminTips(); }, [activeTab]);
  useEffect(() => { if (activeTab === "ledger") loadLedger(); }, [activeTab]);
  useEffect(() => { loadProblemReports(); }, []);
  useEffect(() => { loadPendingCounts(); }, []);

  useEffect(() => {
    if (activeTab !== "pending_photos" || !pendingTreesHasMore || pendingLoading) return;
    const el = pendingTreesSentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && pendingTreesHasMore && !pendingLoading) {
        loadPendingTrees(pendingTreesPage + 1);
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeTab, pendingTreesHasMore, pendingLoading, pendingTreesPage]);

  useEffect(() => {
    if (activeTab !== "pending_updates" || !pendingUpdatesHasMore || pendingUpdatesLoading) return;
    const el = pendingUpdatesSentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && pendingUpdatesHasMore && !pendingUpdatesLoading) {
        loadPendingUpdates(pendingUpdatesPage + 1);
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeTab, pendingUpdatesHasMore, pendingUpdatesLoading, pendingUpdatesPage]);

  useEffect(() => {
    if (activeTab !== "pending_events" || !pendingEventsHasMore || pendingEventsLoading) return;
    const el = pendingEventsSentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && pendingEventsHasMore && !pendingEventsLoading) {
        loadPendingEvents(pendingEventsPage + 1);
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeTab, pendingEventsHasMore, pendingEventsLoading, pendingEventsPage]);

  async function handleBlock(user: AdminUser) {
    setActionLoading(user.clerkUserId + ":block");
    try {
      const res = await authFetch(`/api/admin/users/${user.clerkUserId}/block`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      setUsers((p) => p.map((u) => u.clerkUserId === user.clerkUserId ? { ...u, isBlocked: true } : u));
      setStats((s) => s ? { ...s, blockedUsers: s.blockedUsers + 1 } : s);
      toast({ title: `@${user.username} ${lang === "it" ? "bloccato" : "blocked"}` });
    } catch { toast({ title: T.errors.block, variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleUnblock(user: AdminUser) {
    setActionLoading(user.clerkUserId + ":unblock");
    try {
      const res = await authFetch(`/api/admin/users/${user.clerkUserId}/unblock`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      setUsers((p) => p.map((u) => u.clerkUserId === user.clerkUserId ? { ...u, isBlocked: false } : u));
      setStats((s) => s ? { ...s, blockedUsers: Math.max(0, s.blockedUsers - 1) } : s);
      toast({ title: `@${user.username} ${lang === "it" ? "sbloccato" : "unblocked"}` });
    } catch { toast({ title: T.errors.unblock, variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleDelete(user: AdminUser) {
    setActionLoading(user.clerkUserId + ":delete");
    try {
      const res = await authFetch(`/api/admin/users/${user.clerkUserId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error();
      setUsers((p) => p.filter((u) => u.clerkUserId !== user.clerkUserId));
      setStats((s) => s ? { ...s, totalUsers: s.totalUsers - 1, blockedUsers: user.isBlocked ? s.blockedUsers - 1 : s.blockedUsers } : s);
      toast({ title: `@${user.username} ${lang === "it" ? "eliminato" : "deleted"}` });
    } catch { toast({ title: T.errors.delete, variant: "destructive" }); }
    finally { setActionLoading(null); setShowDeleteModal(null); }
  }

  async function handleReportAction(report: Report, action: "reviewed" | "dismissed") {
    setActionLoading(`report:${report.id}:${action}`);
    try {
      const res = await authFetch(`/api/admin/reports/${report.id}/${action}`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      setReports((p) => p.map((r) => r.id === report.id ? { ...r, status: action } : r));
      toast({ title: action === "reviewed" ? (lang === "it" ? "Segnalazione esaminata" : "Report reviewed") : (lang === "it" ? "Segnalazione archiviata" : "Report dismissed") });
    } catch { toast({ title: T.errors.report, variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleBlockFromReport(report: Report) {
    setActionLoading(`report:${report.id}:block`);
    try {
      const res = await authFetch(`/api/admin/users/${report.reportedUserId}/block`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      await authFetch(`/api/admin/reports/${report.id}/reviewed`, { method: "PATCH" });
      setReports((p) => p.map((r) => r.id === report.id ? { ...r, status: "reviewed" } : r));
      toast({ title: `@${report.reportedUsername} ${lang === "it" ? "bloccato" : "blocked"}` });
    } catch { toast({ title: T.errors.block, variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  const filteredUsers = users.filter((u) => {
    if (userFilter === "active") return !u.isBlocked;
    if (userFilter === "blocked") return u.isBlocked;
    return true;
  });

  const filteredReports = reports.filter((r) =>
    reportFilter === "all" ? true : r.status === reportFilter
  );

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  const statusColors: Record<string, string> = {
    pending:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    reviewed:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    dismissed: "bg-muted text-muted-foreground",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-foreground text-base leading-none">{T.title}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{T.subtitle}</p>
            </div>
          </div>
          <button onClick={() => setLocation("/feed")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {T.backToApp}
          </button>
        </div>

        {/* Tab bar */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 pb-2">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "users" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            {T.tabs.users}
            {stats && <span className="text-xs opacity-70">({stats.totalUsers})</span>}
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "reports" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeLinecap="round" strokeLinejoin="round"/><line x1="4" y1="22" x2="4" y2="15" strokeLinecap="round"/></svg>
            {T.tabs.reports}
            {pendingCount > 0 && (
              <span className="bg-destructive text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("trees")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "trees" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 2L9 9H3l5 4-2 7 6-4 6 4-2-7 5-4h-6z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {T.tabs.trees}
            {stats && <span className="text-xs opacity-70">({stats.totalTrees})</span>}
          </button>
          <button
            onClick={() => setActiveTab("problems")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "problems" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/></svg>
            {T.tabs.problems}
            {problemReports.filter(r => r.status === "new").length > 0 && (
              <span className="bg-destructive text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {problemReports.filter(r => r.status === "new").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("pending_photos")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "pending_photos" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-muted"}`}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="13" r="4"/></svg>
            {lang === "it" ? "Da approvare" : "Pending Review"}
            {pendingCounts.pendingTrees > 0 && (
              <span className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none animate-pulse">
                {pendingCounts.pendingTrees}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("pending_events")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "pending_events" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-muted"}`}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            {lang === "it" ? "Eventi in attesa" : "Pending Events"}
            {pendingCounts.pendingEvents > 0 && (
              <span className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none animate-pulse">
                {pendingCounts.pendingEvents}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("pending_updates")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "pending_updates" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-muted"}`}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
            {lang === "it" ? "Aggiorn. in attesa" : "Pending Updates"}
            {pendingCounts.pendingUpdates > 0 && (
              <span className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none animate-pulse">
                {pendingCounts.pendingUpdates}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("pending_adopt_trees")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "pending_adopt_trees" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-muted"}`}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 8C8 10 5.9 16.17 3.82 19.41 4.2 20.86 4.7 21 5 21c2 0 6.5-6 11-9.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7.5 14C9 12 10.5 10.5 14 10" strokeLinecap="round" strokeLinejoin="round"/><circle cx="17" cy="5" r="3"/></svg>
            {lang === "it" ? "Adozioni in attesa" : "Pending Adopt Trees"}
            {pendingCounts.pendingAdoptTrees > 0 && (
              <span className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none animate-pulse">
                {pendingCounts.pendingAdoptTrees}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "alerts" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {T.tabs.alerts}
            {adminAlerts.length > 0 && <span className="text-xs opacity-70">({adminAlerts.length})</span>}
          </button>
          <button
            onClick={() => setActiveTab("tips")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "tips" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {T.tabs.tips}
            {adminTips.length > 0 && <span className="text-xs opacity-70">({adminTips.length})</span>}
          </button>
          <button
            onClick={() => setActiveTab("finance")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "finance" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-muted"}`}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {T.tabs.finance}
          </button>
          <button
            onClick={() => setActiveTab("discounts")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "discounts" ? "bg-violet-600 text-white" : "text-muted-foreground hover:bg-muted"}`}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {T.tabs.discounts}
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "ledger" ? "bg-cyan-600 text-white" : "text-muted-foreground hover:bg-muted"}`}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12h6M9 16h4" strokeLinecap="round"/></svg>
            {T.tabs.ledger}
            {ledgerData && <span className="text-xs opacity-75">({ledgerData.summary.count})</span>}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "settings" ? "bg-slate-700 text-white" : "text-muted-foreground hover:bg-muted"}`}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {T.tabs.settings}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── USERS TAB ── */}
        {activeTab === "users" && (
          <>
            {stats && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-2xl p-5 text-center">
                  <div className="text-3xl font-bold text-primary">{stats.totalUsers.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">{T.stats.users}</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5 text-center">
                  <div className="text-3xl font-bold text-primary">{stats.totalTrees.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">{T.stats.trees}</div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5 text-center">
                  <div className={`text-3xl font-bold ${stats.blockedUsers > 0 ? "text-destructive" : "text-muted-foreground"}`}>{stats.blockedUsers}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">{T.stats.blocked}</div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={T.search}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="flex rounded-xl border border-border overflow-hidden bg-card">
                {(["all", "active", "blocked"] as UserFilter[]).map((f) => (
                  <button key={f} onClick={() => setUserFilter(f)}
                    className={`px-4 py-2 text-xs font-semibold transition-colors ${userFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                    {T.filters[f]}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {loading ? (
                <div className="py-16 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{lang === "it" ? "Caricamento..." : "Loading..."}</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-16 text-center">
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground mx-auto mb-3"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  <p className="text-sm text-muted-foreground">{T.noUsers}</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-5 py-3 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span className="w-9" /><span>{lang === "it" ? "Utente" : "User"}</span>
                    <span className="text-center">{T.stats.trees}</span><span className="text-center">{lang === "it" ? "Stato" : "Status"}</span>
                    <span className="text-center">{lang === "it" ? "Azioni" : "Actions"}</span>
                  </div>
                  {filteredUsers.map((user) => {
                    const isActing = actionLoading?.startsWith(user.clerkUserId);
                    return (
                      <div key={user.clerkUserId} className={`flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto] gap-3 sm:gap-4 items-start sm:items-center px-5 py-4 ${user.isBlocked ? "bg-destructive/5" : ""}`}>
                        <UserAvatar user={user} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">@{user.username}</span>
                            {user.isBlocked && <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-destructive/15 text-destructive rounded-full">{T.blocked}</span>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{[user.city, user.country].filter(Boolean).join(", ") || "—"} · {T.joined} {new Date(user.createdAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB")}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-[220px]">{user.clerkUserId}</div>
                        </div>
                        <div className="sm:text-center"><span className="text-sm font-semibold text-foreground">{user.treesPlanted}</span><span className="text-xs text-muted-foreground ml-1 sm:hidden">{T.trees}</span></div>
                        <div className="hidden sm:flex justify-center">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${user.isBlocked ? "bg-destructive/15 text-destructive" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.isBlocked ? "bg-destructive" : "bg-green-500"}`} />
                            {user.isBlocked ? T.blocked : T.active}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 sm:justify-center">
                          {user.isBlocked ? (
                            <button onClick={() => handleUnblock(user)} disabled={!!isActing}
                              className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50">
                              {isActing ? "..." : T.unblock}
                            </button>
                          ) : (
                            <button onClick={() => handleBlock(user)} disabled={!!isActing}
                              className="px-3 py-1.5 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50">
                              {isActing ? "..." : T.block}
                            </button>
                          )}
                          <button onClick={() => setShowDeleteModal(user)} disabled={!!isActing}
                            className="px-3 py-1.5 text-xs font-semibold bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50">
                            {T.delete}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground pb-4">{filteredUsers.length} {lang === "it" ? "utenti mostrati" : "users shown"}</p>
          </>
        )}

        {/* ── REPORTS TAB ── */}
        {activeTab === "reports" && (
          <>
            <div className="flex rounded-xl border border-border overflow-hidden bg-card self-start">
              {(["pending", "all", "reviewed", "dismissed"] as ReportFilter[]).map((f) => (
                <button key={f} onClick={() => setReportFilter(f)}
                  className={`px-4 py-2 text-xs font-semibold transition-colors ${reportFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                  {T.filters[f]}
                  {f === "pending" && pendingCount > 0 && <span className="ml-1.5 bg-destructive text-white text-[10px] font-bold px-1 py-0.5 rounded-full">{pendingCount}</span>}
                </button>
              ))}
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {reportsLoading ? (
                <div className="py-16 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="py-16 text-center">
                  <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground mx-auto mb-3">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeLinecap="round" strokeLinejoin="round"/><line x1="4" y1="22" x2="4" y2="15" strokeLinecap="round"/>
                  </svg>
                  <p className="text-sm text-muted-foreground">{T.noReports}</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredReports.map((report) => {
                    const isActing = actionLoading?.startsWith(`report:${report.id}`);
                    const reasonLabel = REASON_LABELS[report.reason];
                    const isTreeReport = report.treeId != null;
                    const isEventReport = report.eventId != null;
                    const badgeClass = isEventReport
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : isTreeReport
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
                    const typeLabel = isEventReport
                      ? (lang === "it" ? "Evento" : "Event")
                      : isTreeReport ? T.reportType.tree : T.reportType.user;
                    return (
                      <div key={report.id} className="px-5 py-4 space-y-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
                                {typeLabel}
                              </span>
                              {isEventReport ? (
                                <span className="font-semibold text-sm text-foreground truncate max-w-[180px]">
                                  {report.eventTitle ?? `Evento #${report.eventId}`}
                                </span>
                              ) : (
                                <span className="font-semibold text-sm text-foreground">@{report.reportedUsername ?? report.reportedUserId}</span>
                              )}
                              {isEventReport && (
                                <span className="text-xs text-muted-foreground">organizzato da @{report.reportedUsername ?? report.reportedUserId}</span>
                              )}
                              {isTreeReport && (
                                <a href={`/tree/${report.treeId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                                  #{report.treeId}
                                </a>
                              )}
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[report.status]}`}>
                                {report.status === "pending" ? T.pending : report.status === "reviewed" ? T.reviewed : T.dismissed}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">{T.reason}:</span>{" "}
                              {reasonLabel ? (lang === "it" ? reasonLabel.it : reasonLabel.en) : report.reason}
                            </div>
                            {report.notes && (
                              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border border-border mt-1">
                                <span className="font-medium">{T.notes}:</span> {report.notes}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {new Date(report.createdAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                          {report.status === "pending" && (
                            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                              {isEventReport ? (
                                <button onClick={() => handleDeleteEventFromReport(report)} disabled={!!isActing}
                                  className="px-3 py-1.5 text-xs font-semibold bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50">
                                  {isActing ? "..." : (lang === "it" ? "Elimina evento" : "Delete event")}
                                </button>
                              ) : isTreeReport ? (
                                <button onClick={() => handleDeleteTreeFromReport(report)} disabled={!!isActing}
                                  className="px-3 py-1.5 text-xs font-semibold bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50">
                                  {isActing ? "..." : T.deleteTree}
                                </button>
                              ) : (
                                <button onClick={() => handleBlockFromReport(report)} disabled={!!isActing}
                                  className="px-3 py-1.5 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50">
                                  {isActing ? "..." : T.blockUser}
                                </button>
                              )}
                              <button onClick={() => handleReportAction(report, "reviewed")} disabled={!!isActing}
                                className="px-3 py-1.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50">
                                {isActing ? "..." : T.markReviewed}
                              </button>
                              <button onClick={() => handleReportAction(report, "dismissed")} disabled={!!isActing}
                                className="px-3 py-1.5 text-xs font-semibold bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50">
                                {isActing ? "..." : T.dismiss}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground pb-4">{filteredReports.length} {lang === "it" ? "segnalazioni mostrate" : "reports shown"}</p>
          </>
        )}

        {/* ── TREES TAB ── */}
        {activeTab === "trees" && (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>
                <input
                  type="text"
                  value={treeSearch}
                  onChange={(e) => setTreeSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") loadTrees(1, treeSearch); }}
                  placeholder={T.searchTrees}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button
                onClick={() => loadTrees(1, treeSearch)}
                className="px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
              >
                {lang === "it" ? "Cerca" : "Search"}
              </button>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {treesLoading ? (
                <div className="py-16 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{lang === "it" ? "Caricamento..." : "Loading..."}</p>
                </div>
              ) : adminTrees.length === 0 ? (
                <div className="py-16 text-center">
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground mx-auto mb-3">
                    <path d="M12 22V12M12 12C12 12 7 9 7 5a5 5 0 0110 0c0 4-5 7-5 7z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-sm text-muted-foreground">{T.noTrees}</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {adminTrees.map((tree) => {
                    const isActing = actionLoading?.startsWith(`tree:${tree.id}:`);
                    const photoSrc = tree.photoUrl.startsWith("/objects/") ? `/api/storage${tree.photoUrl}` : tree.photoUrl;
                    return (
                      <div key={tree.id} className="flex items-center gap-4 px-5 py-4">
                        <a href={`/tree/${tree.id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                          <img
                            src={photoSrc}
                            alt={tree.plantName ?? "Tree"}
                            className="w-16 h-16 rounded-xl object-cover border border-border hover:opacity-80 transition-opacity"
                          />
                        </a>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {tree.plantName ?? tree.species ?? (lang === "it" ? "Senza nome" : "No name")}
                            </span>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">#{tree.id}</span>
                            {tree.verificationBypassed && (
                              <span className="text-xs font-semibold bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border border-yellow-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                {lang === "it" ? "Da verificare" : "Needs review"}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            @{tree.username ?? "?"} · {[tree.locationName, tree.country].filter(Boolean).join(", ") || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {new Date(tree.createdAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => handleApproveAdminTree(tree)}
                            disabled={!!isActing}
                            className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {actionLoading === `tree:${tree.id}:approve` ? (
                              <span className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            )}
                            {lang === "it" ? "Accetta" : "Approve"}
                          </button>
                          <button
                            onClick={() => setShowDeleteTreeModal(tree)}
                            disabled={!!isActing}
                            className="px-3 py-1.5 text-xs font-semibold bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === `tree:${tree.id}:delete` ? "..." : T.delete}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {treePages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setTreePage((p) => Math.max(1, p - 1))}
                  disabled={treePage === 1 || treesLoading}
                  className="px-4 py-2 text-sm font-semibold border border-border rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {lang === "it" ? "Precedente" : "Previous"}
                </button>
                <span className="text-sm text-muted-foreground">{treePage} / {treePages}</span>
                <button
                  onClick={() => setTreePage((p) => Math.min(treePages, p + 1))}
                  disabled={treePage === treePages || treesLoading}
                  className="px-4 py-2 text-sm font-semibold border border-border rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {lang === "it" ? "Successiva" : "Next"}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── PENDING PHOTOS TAB ── */}
        {activeTab === "pending_photos" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-foreground text-lg">
                  {lang === "it" ? "Foto da approvare" : "Photos Pending Review"}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({pendingCounts.pendingTrees})</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lang === "it"
                    ? "L'AI non ha potuto verificare queste immagini. Revisiona e approva o rifiuta manualmente."
                    : "AI could not verify these images. Manually review and approve or reject."}
                </p>
              </div>
              <button onClick={() => loadPendingTrees(1)} className="text-xs text-primary hover:underline">
                {lang === "it" ? "Aggiorna" : "Refresh"}
              </button>
            </div>

            {pendingLoading && pendingTrees.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pendingTrees.length === 0 ? (
              <div className="py-20 text-center bg-card border border-border rounded-2xl">
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-green-600">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="font-semibold text-foreground">{lang === "it" ? "Nessuna foto in attesa" : "No photos pending"}</p>
                <p className="text-sm text-muted-foreground mt-1">{lang === "it" ? "Tutte le immagini sono state revisionate" : "All images have been reviewed"}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingTrees.map((tree) => {
                    const isActing = actionLoading?.startsWith(`pending:${tree.id}:`);
                    const photoSrc = tree.photoUrl.startsWith("/objects/") ? `/api/storage${tree.photoUrl}` : tree.photoUrl;
                    return (
                      <div key={tree.id} className="bg-card border border-amber-200 dark:border-amber-800/50 rounded-2xl overflow-hidden shadow-sm">
                        <div className="relative aspect-video bg-black/5">
                          <img
                            src={photoSrc}
                            alt={tree.plantName ?? "Foto in attesa"}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/></svg>
                            {lang === "it" ? "In attesa" : "Pending"}
                          </div>
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {tree.plantName ?? tree.species ?? (lang === "it" ? "Senza nome" : "No name")}
                            </span>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">#{tree.id}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @{tree.username ?? "?"} · {[tree.locationName, tree.country].filter(Boolean).join(", ") || "—"}
                          </div>
                          {tree.caption && (
                            <p className="text-xs text-muted-foreground line-clamp-2 italic">"{tree.caption}"</p>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {new Date(tree.createdAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleApprovePendingTree(tree)}
                              disabled={!!isActing}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-xl hover:bg-green-200 transition-colors disabled:opacity-50"
                            >
                              {isActing && actionLoading === `pending:${tree.id}:approve` ? (
                                <span className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              )}
                              {lang === "it" ? "Approva" : "Approve"}
                            </button>
                            <button
                              onClick={() => handleRejectPendingTree(tree)}
                              disabled={!!isActing}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors disabled:opacity-50"
                            >
                              {isActing && actionLoading === `pending:${tree.id}:reject` ? (
                                <span className="w-3 h-3 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/></svg>
                              )}
                              {lang === "it" ? "Elimina" : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {pendingTreesHasMore && (
                  <div ref={pendingTreesSentinel} className="flex items-center justify-center py-6">
                    {pendingLoading && (
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── PENDING UPDATES TAB ── */}
        {activeTab === "pending_updates" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-foreground text-lg">
                  {lang === "it" ? "Aggiornamenti in attesa" : "Pending Updates"}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({pendingCounts.pendingUpdates})</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lang === "it"
                    ? "L'AI non ha potuto verificare queste foto di aggiornamento. Revisiona e approva o elimina manualmente."
                    : "AI could not verify these update photos. Manually review and approve or delete."}
                </p>
              </div>
              <button onClick={() => loadPendingUpdates(1)} className="text-xs text-primary hover:underline">
                {lang === "it" ? "Aggiorna" : "Refresh"}
              </button>
            </div>

            {pendingUpdatesLoading && pendingUpdates.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pendingUpdates.length === 0 ? (
              <div className="py-20 text-center bg-card border border-border rounded-2xl">
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-green-600">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="font-semibold text-foreground">{lang === "it" ? "Nessun aggiornamento in attesa" : "No updates pending"}</p>
                <p className="text-sm text-muted-foreground mt-1">{lang === "it" ? "Tutti gli aggiornamenti sono stati revisionati" : "All updates have been reviewed"}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingUpdates.map((update) => {
                    const isActing = actionLoading?.startsWith(`update:${update.id}:`);
                    const src = update.photoUrl.startsWith("/objects/") ? `/api/storage${update.photoUrl}` : update.photoUrl;
                    return (
                      <div key={update.id} className="bg-card border border-amber-200 dark:border-amber-800/50 rounded-2xl overflow-hidden shadow-sm">
                        <div className="relative aspect-video bg-black/5">
                          <img
                            src={src}
                            alt="Aggiornamento in attesa"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/></svg>
                            {lang === "it" ? "Aggiornamento" : "Update"}
                          </div>
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {update.plantName ?? update.species ?? (lang === "it" ? "Senza nome" : "No name")}
                            </span>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                              {lang === "it" ? "Albero" : "Tree"} #{update.treeId}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @{update.username ?? "?"} · {new Date(update.createdAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                          {update.note && (
                            <p className="text-xs text-muted-foreground line-clamp-2 italic">"{update.note}"</p>
                          )}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleApprovePendingUpdate(update)}
                              disabled={!!isActing}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-xl hover:bg-green-200 transition-colors disabled:opacity-50"
                            >
                              {isActing && actionLoading === `update:${update.id}:approve` ? (
                                <span className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              )}
                              {lang === "it" ? "Approva" : "Approve"}
                            </button>
                            <button
                              onClick={() => handleRejectPendingUpdate(update)}
                              disabled={!!isActing}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors disabled:opacity-50"
                            >
                              {isActing && actionLoading === `update:${update.id}:reject` ? (
                                <span className="w-3 h-3 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/></svg>
                              )}
                              {lang === "it" ? "Elimina" : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {pendingUpdatesHasMore && (
                  <div ref={pendingUpdatesSentinel} className="flex items-center justify-center py-6">
                    {pendingUpdatesLoading && (
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── PENDING EVENTS TAB ── */}
        {activeTab === "pending_events" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-foreground text-lg">
                  {lang === "it" ? "Eventi in attesa di approvazione" : "Events Pending Approval"}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({pendingCounts.pendingEvents})</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lang === "it"
                    ? "Approva o rifiuta gli eventi prima della pubblicazione. Il messaggio verrà inviato al creatore nella sezione Avvisi."
                    : "Approve or reject events before publication. The message will be sent to the creator in Alerts."}
                </p>
              </div>
              <button onClick={() => loadPendingEvents(1)} className="text-xs text-primary hover:underline">
                {lang === "it" ? "Aggiorna" : "Refresh"}
              </button>
            </div>

            {pendingEventsLoading && pendingEvents.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pendingEvents.length === 0 ? (
              <div className="py-20 text-center bg-card border border-border rounded-2xl">
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-green-600">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="font-semibold text-foreground">{lang === "it" ? "Nessun evento in attesa" : "No events pending"}</p>
                <p className="text-sm text-muted-foreground mt-1">{lang === "it" ? "Tutti gli eventi sono stati revisionati" : "All events have been reviewed"}</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {pendingEvents.map((event) => {
                    const isActing = actionLoading?.startsWith(`event:${event.id}:`);
                    const message = eventReviewMessages[event.id] ?? "";
                    return (
                      <div key={event.id} className="bg-card border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {lang === "it" ? "In attesa" : "Pending"}
                              </span>
                              <h3 className="font-semibold text-foreground">{event.title}</h3>
                              <span className="text-xs text-muted-foreground">#{event.id}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              @{event.username ?? "?"} · {event.eventDate} {event.eventTime?.slice(0, 5)} · {[event.city, event.province, event.location].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(event.createdAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                        )}
                        {event.address && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">{lang === "it" ? "Indirizzo:" : "Address:"}</span> {event.address}
                          </p>
                        )}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground">
                            {lang === "it" ? "Messaggio per il creatore" : "Message for creator"}
                          </label>
                          <textarea
                            value={message}
                            onChange={(e) => setEventReviewMessages((prev) => ({ ...prev, [event.id]: e.target.value }))}
                            rows={3}
                            maxLength={2000}
                            placeholder={lang === "it" ? "Scrivi un messaggio facoltativo: motivazione, modifiche richieste o conferma..." : "Optional message: reason, requested edits, or confirmation..."}
                            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/40 resize-none"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-foreground">{message.length}/2000</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReviewPendingEvent(event, "reject")}
                                disabled={!!isActing}
                                className="px-3 py-2 text-xs font-semibold bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {isActing && actionLoading === `event:${event.id}:reject` ? (
                                  <span className="w-3 h-3 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/></svg>
                                )}
                                {lang === "it" ? "Rifiuta" : "Reject"}
                              </button>
                              <button
                                onClick={() => handleReviewPendingEvent(event, "approve")}
                                disabled={!!isActing}
                                className="px-3 py-2 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-xl hover:bg-green-200 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {isActing && actionLoading === `event:${event.id}:approve` ? (
                                  <span className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                )}
                                {lang === "it" ? "Approva" : "Approve"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {pendingEventsHasMore && (
                  <div ref={pendingEventsSentinel} className="flex items-center justify-center py-6">
                    {pendingEventsLoading && (
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── PROBLEMS TAB ── */}
        {activeTab === "problems" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground text-lg">
                {lang === "it" ? "Segnalazioni problema" : "Problem Reports"}
                <span className="ml-2 text-sm font-normal text-muted-foreground">({problemReports.length})</span>
              </h2>
              <button onClick={loadProblemReports} className="text-xs text-primary hover:underline">
                {lang === "it" ? "Aggiorna" : "Refresh"}
              </button>
            </div>

            {/* Status filter */}
            <div className="flex rounded-xl border border-border overflow-hidden bg-card w-fit">
              {(["new", "in_progress", "resolved", "dismissed", "all"] as const).map((s) => {
                const labels: Record<string, string> = { new: lang === "it" ? "Nuovi" : "New", in_progress: lang === "it" ? "In corso" : "In progress", resolved: lang === "it" ? "Risolti" : "Resolved", dismissed: lang === "it" ? "Archiviati" : "Dismissed", all: lang === "it" ? "Tutti" : "All" };
                const count = s === "all" ? problemReports.length : problemReports.filter(r => r.status === s).length;
                return (
                  <button key={s} onClick={() => setProblemStatusFilter(s)}
                    className={`px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-1 ${problemStatusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                    {labels[s]}
                    <span className="opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            {problemsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {problemReports
                  .filter(r => problemStatusFilter === "all" ? true : r.status === problemStatusFilter)
                  .length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-30"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/></svg>
                    <p className="text-sm">{lang === "it" ? "Nessuna segnalazione" : "No reports"}</p>
                  </div>
                ) : problemReports
                  .filter(r => problemStatusFilter === "all" ? true : r.status === problemStatusFilter)
                  .map((report) => {
                    const isActing = !!actionLoading?.startsWith(`problem:${report.id}:`);
                    const CATEGORY_LABELS: Record<string, string> = {
                      bug: "Bug / Errore tecnico",
                      problema_tecnico: "Problema di caricamento",
                      contenuto_inappropriato: "Contenuto inappropriato",
                      suggerimento: "Suggerimento / Feedback",
                      altro: "Altro",
                    };
                    const STATUS_COLORS: Record<string, string> = {
                      new: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                      in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                      resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                      dismissed: "bg-muted text-muted-foreground",
                    };
                    const STATUS_LABELS: Record<string, string> = {
                      new: lang === "it" ? "Nuovo" : "New",
                      in_progress: lang === "it" ? "In corso" : "In progress",
                      resolved: lang === "it" ? "Risolto" : "Resolved",
                      dismissed: lang === "it" ? "Archiviato" : "Dismissed",
                    };
                    return (
                      <div key={report.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[report.status] ?? ""}`}>
                                {STATUS_LABELS[report.status] ?? report.status}
                              </span>
                              <span className="text-xs font-medium px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                                {CATEGORY_LABELS[report.category] ?? report.category}
                              </span>
                              {report.username && (
                                <span className="text-xs text-muted-foreground">@{report.username}</span>
                              )}
                              {report.repliedAt && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
                                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  {lang === "it" ? "Risposto" : "Replied"}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{report.description}</p>
                            {report.adminNote && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                {lang === "it" ? "Nota admin:" : "Admin note:"} {report.adminNote}
                              </p>
                            )}
                            {report.adminReply && (
                              <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  {lang === "it" ? "Tua risposta" : "Your reply"}
                                  {report.repliedAt && (
                                    <span className="font-normal opacity-70 ml-1">
                                      · {new Date(report.repliedAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB")}
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-foreground whitespace-pre-wrap">{report.adminReply}</p>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {new Date(report.createdAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB")}
                          </span>
                        </div>

                        {/* Form risposta inline */}
                        {replyingToId === report.id && (
                          <div className="border border-blue-200 dark:border-blue-800 rounded-xl p-3 bg-blue-50/50 dark:bg-blue-900/10 space-y-2">
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                              {lang === "it" ? "Scrivi una risposta — verrà inviata all'email dell'utente" : "Write a reply — it will be sent to the user's email"}
                            </p>
                            <textarea
                              autoFocus
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              rows={4}
                              maxLength={2000}
                              placeholder={lang === "it" ? "Scrivi qui la tua risposta..." : "Write your reply here..."}
                              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-400/40 resize-none"
                            />
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] text-muted-foreground">{replyText.length}/2000</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setReplyingToId(null); setReplyText(""); }}
                                  className="px-3 py-1.5 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                                >
                                  {lang === "it" ? "Annulla" : "Cancel"}
                                </button>
                                <button
                                  onClick={() => handleSendReply(report)}
                                  disabled={isActing || replyText.trim().length < 5}
                                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                >
                                  {isActing ? (
                                    <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  )}
                                  {lang === "it" ? "Invia notifica" : "Send notification"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          {/* Bottone risposta — sempre visibile */}
                          <button
                            onClick={() => {
                              if (replyingToId === report.id) { setReplyingToId(null); setReplyText(""); }
                              else { setReplyingToId(report.id); setReplyText(report.adminReply ?? ""); }
                            }}
                            disabled={isActing}
                            className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            {replyingToId === report.id
                              ? (lang === "it" ? "Chiudi" : "Close")
                              : report.adminReply
                                ? (lang === "it" ? "Modifica risposta" : "Edit reply")
                                : (lang === "it" ? "Rispondi via email" : "Reply via email")}
                          </button>

                          {report.status !== "resolved" && report.status !== "dismissed" && (
                            <>
                              {report.status === "new" && (
                                <button onClick={() => handleProblemStatusChange(report, "in_progress")} disabled={isActing}
                                  className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50">
                                  {isActing ? "..." : (lang === "it" ? "Prendi in carico" : "Take over")}
                                </button>
                              )}
                              <button onClick={() => handleProblemStatusChange(report, "resolved")} disabled={isActing}
                                className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50">
                                {isActing ? "..." : (lang === "it" ? "Risolto" : "Resolved")}
                              </button>
                              <button onClick={() => handleProblemStatusChange(report, "dismissed")} disabled={isActing}
                                className="px-3 py-1.5 text-xs font-semibold bg-muted text-muted-foreground border border-border rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50">
                                {isActing ? "..." : (lang === "it" ? "Archivia" : "Dismiss")}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}

        {/* ── ALBERI IN ADOZIONE IN ATTESA TAB ── */}
        {activeTab === "pending_adopt_trees" && (
          <>
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-bold text-lg mb-1 flex items-center gap-2">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 8C8 10 5.9 16.17 3.82 19.41 4.2 20.86 4.7 21 5 21c2 0 6.5-6 11-9.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7.5 14C9 12 10.5 10.5 14 10" strokeLinecap="round" strokeLinejoin="round"/><circle cx="17" cy="5" r="3"/></svg>
                {lang === "it" ? "Alberi in adozione in attesa di approvazione" : "Adoptable Trees Pending Approval"}
                <span className="ml-2 text-sm font-normal text-muted-foreground">({pendingCounts.pendingAdoptTrees})</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                {lang === "it"
                  ? "Revisiona gli alberi inviati dagli enti. Approva per renderli pubblici o rifiuta con un messaggio."
                  : "Review trees submitted by organizations. Approve to make them public, or reject with a message."}
              </p>
            </div>
            {pendingAdoptLoading && pendingAdoptTrees.length === 0 ? (
              <div className="flex justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              </div>
            ) : pendingAdoptTrees.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-40"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <p className="font-medium">{lang === "it" ? "Nessun albero in attesa" : "No trees pending review"}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingAdoptTrees.map((tree) => {
                  const isApproving = actionLoading === `adopt:${tree.id}:approve`;
                  const isRejecting = actionLoading === `adopt:${tree.id}:reject`;
                  const isActing = isApproving || isRejecting;
                  const euros = (tree.priceCents / 100).toFixed(2).replace(".", ",");
                  const durationLabel = tree.durationDays >= 365
                    ? `${Math.round(tree.durationDays / 365)} ${lang === "it" ? "anno/i" : "year(s)"}`
                    : `${tree.durationDays} ${lang === "it" ? "giorni" : "days"}`;
                  return (
                    <div key={tree.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                      <div className="flex gap-4 p-4">
                        {tree.thumbnailUrl || tree.imageUrl ? (
                          <img
                            src={`/api/storage${tree.thumbnailUrl ?? tree.imageUrl}`}
                            alt={tree.title}
                            className="w-24 h-24 object-cover rounded-xl flex-shrink-0"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground opacity-50"><path d="M17 8C8 10 5.9 16.17 3.82 19.41 4.2 20.86 4.7 21 5 21c2 0 6.5-6 11-9.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-bold text-foreground text-lg leading-tight">{tree.title}</h3>
                            <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                              {lang === "it" ? "In attesa" : "Pending"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{tree.description}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {tree.speciesName && <span>🌿 {tree.speciesName}</span>}
                            {tree.locationName && <span>📍 {tree.locationName}</span>}
                            <span>💶 {euros} €</span>
                            <span>⏱ {durationLabel}</span>
                          </div>
                          {tree.productDescription && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">{lang === "it" ? "Prodotti: " : "Products: "}</span>
                              {tree.productDescription}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {lang === "it" ? "Ente: " : "Org: "}
                            <span className="font-medium">{tree.ownerUsername ?? tree.ownerEmail}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tree.createdAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div className="border-t border-border px-4 py-3 space-y-2">
                        <textarea
                          value={adoptRejectMessages[tree.id] ?? ""}
                          onChange={(e) => setAdoptRejectMessages((m) => ({ ...m, [tree.id]: e.target.value }))}
                          placeholder={lang === "it" ? "Motivo del rifiuto (opzionale)..." : "Rejection reason (optional)..."}
                          rows={2}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveAdoptTree(tree.id, tree.title)}
                            disabled={isActing}
                            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-xl text-sm transition-colors disabled:opacity-60"
                          >
                            {isApproving ? (
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                            ) : (
                              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            )}
                            {lang === "it" ? "Approva e pubblica" : "Approve & Publish"}
                          </button>
                          <button
                            onClick={() => handleRejectAdoptTree(tree.id, tree.title)}
                            disabled={isActing}
                            className="flex-1 flex items-center justify-center gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold py-2 rounded-xl text-sm transition-colors disabled:opacity-60"
                          >
                            {isRejecting ? (
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                            ) : (
                              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            )}
                            {lang === "it" ? "Rifiuta" : "Reject"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {pendingAdoptHasMore && (
                  <button
                    onClick={() => loadPendingAdoptTrees(pendingAdoptPage + 1)}
                    disabled={pendingAdoptLoading}
                    className="w-full py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60"
                  >
                    {pendingAdoptLoading ? (lang === "it" ? "Caricamento..." : "Loading...") : (lang === "it" ? "Carica altri" : "Load more")}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ── AVVISI TAB ── */}
        {activeTab === "alerts" && (
          <>
            {/* Form crea / modifica avviso */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {editingAlert
                  ? (lang === "it" ? "Modifica avviso" : "Edit alert")
                  : (lang === "it" ? "Nuovo avviso" : "New alert")}
              </h2>
              <form onSubmit={handleSaveAlert} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={alertForm.title}
                  onChange={(e) => setAlertForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={lang === "it" ? "Titolo *" : "Title *"}
                  required
                  maxLength={200}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <textarea
                  value={alertForm.message}
                  onChange={(e) => setAlertForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder={lang === "it" ? "Messaggio *" : "Message *"}
                  required
                  maxLength={2000}
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      {lang === "it" ? "Priorità" : "Priority"}
                    </label>
                    <select
                      value={alertForm.priority}
                      onChange={(e) => setAlertForm((f) => ({ ...f, priority: e.target.value }))}
                      className="px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="low">{lang === "it" ? "Bassa" : "Low"}</option>
                      <option value="normal">{lang === "it" ? "Normale" : "Normal"}</option>
                      <option value="high">{lang === "it" ? "Alta" : "High"}</option>
                      <option value="critical">{lang === "it" ? "Critica" : "Critical"}</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      {lang === "it" ? "Destinatari" : "Recipients"}
                    </label>
                    <select
                      value={alertForm.targetGroup}
                      onChange={(e) => setAlertForm((f) => ({ ...f, targetGroup: e.target.value }))}
                      className="px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="all">{lang === "it" ? "Tutti gli utenti" : "All users"}</option>
                      <option value="organization">{lang === "it" ? "Solo organizzazioni" : "Organizations only"}</option>
                      <option value="user">{lang === "it" ? "Solo privati" : "Private users only"}</option>
                    </select>
                  </div>
                  <div className="flex gap-2 ml-auto mt-auto">
                    {editingAlert && (
                      <button
                        type="button"
                        onClick={() => { setEditingAlert(null); setAlertForm({ title: "", message: "", priority: "normal", targetGroup: "all" }); }}
                        disabled={alertSubmitting}
                        className="px-4 py-2 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {lang === "it" ? "Annulla" : "Cancel"}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={alertSubmitting || !alertForm.title.trim() || !alertForm.message.trim()}
                      className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {alertSubmitting ? (lang === "it" ? "Salvataggio..." : "Saving...") : editingAlert ? (lang === "it" ? "Aggiorna" : "Update") : (lang === "it" ? "Pubblica avviso" : "Publish alert")}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Lista avvisi esistenti */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {alertsLoading ? (
                <div className="py-16 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                </div>
              ) : adminAlerts.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-muted-foreground">
                    {lang === "it" ? "Nessun avviso pubblicato" : "No alerts published yet"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {adminAlerts.map((alert) => {
                    const isDeletingAlert = actionLoading === `alert:${alert.id}:delete`;
                    const priorityColors: Record<string, string> = {
                      low:      "bg-muted text-muted-foreground",
                      normal:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                      high:     "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                      critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    };
                    const priorityLabels: Record<string, string> = {
                      low: lang === "it" ? "Bassa" : "Low",
                      normal: lang === "it" ? "Normale" : "Normal",
                      high: lang === "it" ? "Alta" : "High",
                      critical: lang === "it" ? "Critica" : "Critical",
                    };
                    const groupLabels: Record<string, string> = {
                      all: lang === "it" ? "Tutti" : "All",
                      organization: lang === "it" ? "Organizzazioni" : "Orgs",
                      user: lang === "it" ? "Privati" : "Private",
                    };
                    const groupColors: Record<string, string> = {
                      all: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                      organization: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                      user: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
                    };
                    return (
                      <div key={alert.id} className="px-5 py-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityColors[alert.priority] ?? priorityColors.normal}`}>
                              {priorityLabels[alert.priority]}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${groupColors[alert.targetGroup ?? "all"] ?? groupColors.all}`}>
                              {groupLabels[alert.targetGroup ?? "all"]}
                            </span>
                            <span className="font-semibold text-sm text-foreground truncate">{alert.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.createdAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", {
                              day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => { setEditingAlert(alert); setAlertForm({ title: alert.title, message: alert.message, priority: alert.priority, targetGroup: alert.targetGroup ?? "all" }); }}
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted"
                            title={lang === "it" ? "Modifica" : "Edit"}
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteAlert(alert)}
                            disabled={isDeletingAlert}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10 disabled:opacity-50"
                            title={lang === "it" ? "Elimina" : "Delete"}
                          >
                            {isDeletingAlert ? (
                              <div className="w-3.5 h-3.5 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground pb-4">
              {adminAlerts.length} {lang === "it" ? "avvisi totali" : "total alerts"}
            </p>

            {/* ── Notifica personale a utente specifico ── */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round"/><circle cx="12" cy="7" r="4"/></svg>
                {lang === "it" ? "Notifica personale" : "Personal notification"}
              </h2>
              <form onSubmit={handleSendPersonalNotif} className="flex flex-col gap-3">
                {/* User search */}
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={personalNotifForm.userId ? `@${personalNotifForm.username}` : userSearchQuery}
                        onChange={(e) => {
                          if (personalNotifForm.userId) {
                            setPersonalNotifForm((f) => ({ ...f, userId: "", username: "" }));
                          }
                          handleUserSearch(e.target.value);
                        }}
                        placeholder={lang === "it" ? "Cerca utente per username..." : "Search user by username..."}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      {userSearchLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      )}
                    </div>
                    {personalNotifForm.userId && (
                      <button
                        type="button"
                        onClick={() => { setPersonalNotifForm((f) => ({ ...f, userId: "", username: "" })); setUserSearchQuery(""); setUserSearchResults([]); }}
                        className="px-3 py-2 text-xs text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors"
                      >
                        {lang === "it" ? "Cambia" : "Change"}
                      </button>
                    )}
                  </div>
                  {userSearchResults.length > 0 && !personalNotifForm.userId && (
                    <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                      {userSearchResults.map((u) => (
                        <button
                          key={u.clerkUserId}
                          type="button"
                          onClick={() => {
                            setPersonalNotifForm((f) => ({ ...f, userId: u.clerkUserId, username: u.username }));
                            setUserSearchQuery("");
                            setUserSearchResults([]);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors text-left text-sm"
                        >
                          {u.photoUrl ? (
                            <img src={u.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                              {u.username?.[0]?.toUpperCase() ?? "?"}
                            </div>
                          )}
                          <span className="font-medium text-foreground">@{u.username}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {personalNotifForm.userId && (
                  <>
                    <input
                      type="text"
                      value={personalNotifForm.title}
                      onChange={(e) => setPersonalNotifForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder={lang === "it" ? "Titolo messaggio *" : "Message title *"}
                      required
                      maxLength={200}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <textarea
                      value={personalNotifForm.message}
                      onChange={(e) => setPersonalNotifForm((f) => ({ ...f, message: e.target.value }))}
                      placeholder={lang === "it" ? "Testo del messaggio *" : "Message text *"}
                      required
                      maxLength={2000}
                      rows={3}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={personalNotifSubmitting || !personalNotifForm.title.trim() || !personalNotifForm.message.trim()}
                        className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {personalNotifSubmitting
                          ? (lang === "it" ? "Invio..." : "Sending...")
                          : (lang === "it" ? `Invia a @${personalNotifForm.username}` : `Send to @${personalNotifForm.username}`)}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </>
        )}

        {/* ── TIPS TAB ── */}
        {activeTab === "tips" && (
          <>
            {/* Form crea / modifica consiglio */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {editingTip
                  ? (lang === "it" ? "Modifica consiglio" : "Edit tip")
                  : (lang === "it" ? "Nuovo consiglio" : "New tip")}
              </h2>
              <form onSubmit={handleSaveTip} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={tipForm.title}
                  onChange={(e) => setTipForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={lang === "it" ? "Titolo *" : "Title *"}
                  required
                  maxLength={200}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <textarea
                  value={tipForm.description}
                  onChange={(e) => setTipForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={lang === "it" ? "Descrizione *" : "Description *"}
                  required
                  maxLength={3000}
                  rows={5}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                />

                {/* Upload foto opzionale */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {lang === "it" ? "Foto (opzionale)" : "Photo (optional)"}
                  </label>
                  {tipForm.imageUrl ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={`/api/storage/objects/${tipForm.imageUrl}`}
                        className="w-16 h-16 rounded-xl object-cover border border-border"
                        alt=""
                      />
                      <button
                        type="button"
                        onClick={() => setTipForm((f) => ({ ...f, imageUrl: "" }))}
                        className="text-xs text-destructive hover:underline"
                      >
                        {lang === "it" ? "Rimuovi" : "Remove"}
                      </button>
                    </div>
                  ) : (
                    <>
                      <input ref={tipImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleAdminTipImageUpload} />
                      <button
                        type="button"
                        onClick={() => tipImageInputRef.current?.click()}
                        disabled={tipImageUploading}
                        className="flex items-center gap-1.5 w-fit px-3 py-1.5 border border-dashed border-border rounded-xl text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                      >
                        {tipImageUploading
                          ? <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        }
                        {tipImageUploading ? (lang === "it" ? "Caricamento..." : "Uploading...") : (lang === "it" ? "Aggiungi foto" : "Add photo")}
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      {lang === "it" ? "Categoria" : "Category"}
                    </label>
                    <select
                      value={tipForm.category}
                      onChange={(e) => setTipForm((f) => ({ ...f, category: e.target.value }))}
                      className="px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {TIP_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 ml-auto mt-auto">
                    {editingTip && (
                      <button
                        type="button"
                        onClick={() => { setEditingTip(null); setTipForm({ title: "", description: "", category: "general", imageUrl: "" }); }}
                        disabled={tipSubmitting}
                        className="px-4 py-2 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {lang === "it" ? "Annulla" : "Cancel"}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={tipSubmitting || tipImageUploading || !tipForm.title.trim() || !tipForm.description.trim()}
                      className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {tipSubmitting ? (lang === "it" ? "Salvataggio..." : "Saving...") : editingTip ? (lang === "it" ? "Aggiorna" : "Update") : (lang === "it" ? "Pubblica consiglio" : "Publish tip")}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Lista consigli esistenti */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {tipsLoading ? (
                <div className="py-16 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                </div>
              ) : adminTips.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-muted-foreground">
                    {lang === "it" ? "Nessun consiglio pubblicato" : "No tips published yet"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {adminTips.map((tip) => {
                    const isDeletingTip = actionLoading === `tip:${tip.id}:delete`;
                    return (
                      <div key={tip.id} className="px-5 py-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 flex items-start gap-3">
                          {tip.imageUrl && (
                            <img
                              src={`/api/storage/objects/${tip.imageUrl}`}
                              className="w-12 h-12 rounded-lg object-cover border border-border flex-shrink-0"
                              alt=""
                            />
                          )}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                {tip.category}
                              </span>
                              <span className="font-semibold text-sm text-foreground truncate">{tip.title}</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{tip.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tip.createdAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", {
                                day: "2-digit", month: "short", year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => { setEditingTip(tip); setTipForm({ title: tip.title, description: tip.description, category: tip.category, imageUrl: tip.imageUrl ?? "" }); }}
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted"
                            title={lang === "it" ? "Modifica" : "Edit"}
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTip(tip)}
                            disabled={isDeletingTip}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10 disabled:opacity-50"
                            title={lang === "it" ? "Elimina" : "Delete"}
                          >
                            {isDeletingTip ? (
                              <div className="w-3.5 h-3.5 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground pb-4">
              {adminTips.length} {lang === "it" ? "consigli totali" : "total tips"}
            </p>
          </>
        )}

        {/* ── FINANCE TAB ── */}
        {activeTab === "finance" && (
          <>
            {financeLoading ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              </div>
            ) : !financeData ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                {lang === "it" ? "Nessun dato finanziario" : "No finance data"}
              </div>
            ) : (
              <>
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {lang === "it" ? "Ricavi piattaforma" : "Platform revenue"}
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">€{(financeData.platformRevenue.totalCommissions / 100).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground mt-1">{lang === "it" ? "Totale ricavi" : "Total revenue"}</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{financeData.platformRevenue.transactionCount}</div>
                      <div className="text-xs text-muted-foreground mt-1">{lang === "it" ? "Campagne pagate" : "Paid campaigns"}</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 bg-muted/50 rounded-lg p-3">
                    {lang === "it"
                      ? "Le organizzazioni pagano per pubblicare le campagne per una durata selezionabile. Il pagamento va interamente alla piattaforma."
                      : "Organizations pay to publish campaigns for a selectable duration. Payment goes entirely to the platform."}
                  </p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {lang === "it" ? "Piani tariffari campagne" : "Campaign pricing tiers"}
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    {lang === "it"
                      ? "Gestisci durata e prezzo dei piani. Le campagne scadute vengono eliminate automaticamente."
                      : "Manage duration and pricing of plans. Expired campaigns are automatically deleted."}
                  </p>

                  {(financeData.pricingTiers || []).length > 0 && (
                    <div className="space-y-2 mb-4">
                      {financeData.pricingTiers.map((tier) => (
                        <div key={tier.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${tier.isActive ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-border bg-muted/30 opacity-60"}`}>
                          {editingPricing?.id === tier.id ? (
                            <div className="flex-1 flex flex-col sm:flex-row gap-2">
                              <input
                                value={pricingForm.label}
                                onChange={(e) => setPricingForm(f => ({ ...f, label: e.target.value }))}
                                placeholder={lang === "it" ? "Etichetta" : "Label"}
                                className="flex-1 px-2 py-1.5 border border-border rounded-lg text-sm bg-background"
                              />
                              <input
                                type="number"
                                value={pricingForm.durationDays}
                                onChange={(e) => setPricingForm(f => ({ ...f, durationDays: e.target.value }))}
                                placeholder={lang === "it" ? "Giorni" : "Days"}
                                className="w-20 px-2 py-1.5 border border-border rounded-lg text-sm bg-background"
                              />
                              <input
                                type="number"
                                value={pricingForm.priceCents}
                                onChange={(e) => setPricingForm(f => ({ ...f, priceCents: e.target.value }))}
                                placeholder="€ (cents)"
                                className="w-24 px-2 py-1.5 border border-border rounded-lg text-sm bg-background"
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={async () => {
                                    setPricingSubmitting(true);
                                    try {
                                      const res = await authFetch(`/api/donations/admin/campaign-pricing/${tier.id}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          label: pricingForm.label,
                                          durationDays: Number(pricingForm.durationDays),
                                          priceCents: Number(pricingForm.priceCents),
                                        }),
                                      });
                                      if (res.ok) {
                                        toast({ title: lang === "it" ? "Piano aggiornato" : "Plan updated" });
                                        setEditingPricing(null);
                                        queryClient.invalidateQueries({ queryKey: ["admin-finance"] });
                                      }
                                    } finally { setPricingSubmitting(false); }
                                  }}
                                  disabled={pricingSubmitting || !pricingForm.label || !pricingForm.durationDays || !pricingForm.priceCents}
                                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-50"
                                >
                                  {pricingSubmitting ? "..." : (lang === "it" ? "Salva" : "Save")}
                                </button>
                                <button
                                  onClick={() => setEditingPricing(null)}
                                  className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
                                >
                                  {lang === "it" ? "Annulla" : "Cancel"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-foreground">{tier.label}</span>
                                <span className="text-muted-foreground">{tier.durationDays} {lang === "it" ? "gg" : "d"}</span>
                                <span className="font-bold text-emerald-600">€{(tier.priceCents / 100).toFixed(2)}</span>
                                {!tier.isActive && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                    {lang === "it" ? "Disattivato" : "Disabled"}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingPricing(tier);
                                    setPricingForm({ label: tier.label, durationDays: String(tier.durationDays), priceCents: String(tier.priceCents) });
                                  }}
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                  title={lang === "it" ? "Modifica" : "Edit"}
                                >
                                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button
                                  onClick={async () => {
                                    setPricingSubmitting(true);
                                    try {
                                      const res = await authFetch(`/api/donations/admin/campaign-pricing/${tier.id}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ isActive: !tier.isActive }),
                                      });
                                      if (res.ok) {
                                        toast({ title: tier.isActive ? (lang === "it" ? "Disattivato" : "Disabled") : (lang === "it" ? "Attivato" : "Enabled") });
                                        queryClient.invalidateQueries({ queryKey: ["admin-finance"] });
                                      }
                                    } finally { setPricingSubmitting(false); }
                                  }}
                                  className={`p-1.5 rounded-lg ${tier.isActive ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30" : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"}`}
                                  title={tier.isActive ? (lang === "it" ? "Disattiva" : "Disable") : (lang === "it" ? "Attiva" : "Enable")}
                                >
                                  {tier.isActive ? (
                                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64A9 9 0 015.64 18.36M19.78 10.22A9 9 0 0012 3m0 18a9 9 0 01-7.78-4.22" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  ) : (
                                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  )}
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm(lang === "it" ? "Eliminare questo piano?" : "Delete this plan?")) return;
                                    setPricingSubmitting(true);
                                    try {
                                      const res = await authFetch(`/api/donations/admin/campaign-pricing/${tier.id}`, { method: "DELETE" });
                                      if (res.ok) {
                                        toast({ title: lang === "it" ? "Piano eliminato" : "Plan deleted" });
                                        queryClient.invalidateQueries({ queryKey: ["admin-finance"] });
                                      }
                                    } finally { setPricingSubmitting(false); }
                                  }}
                                  className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                  title={lang === "it" ? "Elimina" : "Delete"}
                                >
                                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-border pt-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                      {lang === "it" ? "Aggiungi piano" : "Add plan"}
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        value={editingPricing ? "" : pricingForm.label}
                        onChange={(e) => !editingPricing && setPricingForm(f => ({ ...f, label: e.target.value }))}
                        placeholder={lang === "it" ? "Etichetta (es. Base, Pro)" : "Label (e.g. Basic, Pro)"}
                        disabled={!!editingPricing}
                        className="flex-1 px-3 py-2 border border-border rounded-xl text-sm bg-background disabled:opacity-50"
                      />
                      <input
                        type="number"
                        value={editingPricing ? "" : pricingForm.durationDays}
                        onChange={(e) => !editingPricing && setPricingForm(f => ({ ...f, durationDays: e.target.value }))}
                        placeholder={lang === "it" ? "Giorni" : "Days"}
                        disabled={!!editingPricing}
                        className="w-24 px-3 py-2 border border-border rounded-xl text-sm bg-background disabled:opacity-50"
                      />
                      <input
                        type="number"
                        value={editingPricing ? "" : pricingForm.priceCents}
                        onChange={(e) => !editingPricing && setPricingForm(f => ({ ...f, priceCents: e.target.value }))}
                        placeholder={lang === "it" ? "Prezzo (centesimi)" : "Price (cents)"}
                        disabled={!!editingPricing}
                        className="w-32 px-3 py-2 border border-border rounded-xl text-sm bg-background disabled:opacity-50"
                      />
                      <button
                        onClick={async () => {
                          if (editingPricing || !pricingForm.label || !pricingForm.durationDays || !pricingForm.priceCents) return;
                          setPricingSubmitting(true);
                          try {
                            const res = await authFetch("/api/donations/admin/campaign-pricing", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                label: pricingForm.label,
                                durationDays: Number(pricingForm.durationDays),
                                priceCents: Number(pricingForm.priceCents),
                              }),
                            });
                            if (res.ok) {
                              toast({ title: lang === "it" ? "Piano creato" : "Plan created" });
                              setPricingForm({ label: "", durationDays: "", priceCents: "" });
                              queryClient.invalidateQueries({ queryKey: ["admin-finance"] });
                            }
                          } finally { setPricingSubmitting(false); }
                        }}
                        disabled={pricingSubmitting || !!editingPricing || !pricingForm.label || !pricingForm.durationDays || !pricingForm.priceCents}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {pricingSubmitting ? "..." : "+"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {lang === "it" ? "Campagne pagate recenti" : "Recent paid campaigns"}
                  </h2>
                  {financeData.recentPaidCampaigns.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">{lang === "it" ? "Nessuna campagna pagata" : "No paid campaigns yet"}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Campagna" : "Campaign"}</th>
                            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Organizzazione" : "Organization"}</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Prezzo" : "Price"}</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Durata" : "Duration"}</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Scadenza" : "Expires"}</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Data" : "Date"}</th>
                            <th className="py-2 px-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {financeData.recentPaidCampaigns.map((c) => (
                            <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="py-2 px-2 max-w-[150px] truncate font-medium">{c.title}</td>
                              <td className="py-2 px-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">@{c.orgUsername || "?"}</span>
                                  {c.fiscalDenominazione && (
                                    <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium truncate max-w-[100px]">{c.fiscalDenominazione}</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-2 text-right font-semibold text-emerald-600">€{((c.pricePaidCents || 0) / 100).toFixed(2)}</td>
                              <td className="py-2 px-2 text-right">{c.durationDays || "-"} {lang === "it" ? "gg" : "d"}</td>
                              <td className="py-2 px-2 text-right text-xs text-muted-foreground">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "2-digit", month: "short" }) : "-"}</td>
                              <td className="py-2 px-2 text-right text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "2-digit", month: "short" })}</td>
                              <td className="py-2 px-2 text-center">
                                <button
                                  onClick={() => setCampaignFiscalModal(c)}
                                  className="p-1 rounded-lg text-muted-foreground hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                                  title={lang === "it" ? "Dati fiscali al momento dell'attivazione" : "Fiscal data at activation time"}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ── DISCOUNTS TAB ── */}
        {activeTab === "discounts" && <AdminDiscountSection />}

        {/* ── LEDGER TAB ── */}
        {activeTab === "ledger" && (
          <>
            {ledgerLoading ? (
              <div className="text-center py-12 text-muted-foreground">{lang === "it" ? "Caricamento ledger..." : "Loading ledger..."}</div>
            ) : ledgerData ? (
              <>
                {/* Riepilogo */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: lang === "it" ? "Totale" : "Total", value: (ledgerData.summary.totalCents / 100).toFixed(2) + " €", color: "text-foreground" },
                    { label: lang === "it" ? "Campagne" : "Campaigns", value: (ledgerData.summary.campaignCents / 100).toFixed(2) + " €", color: "text-emerald-600" },
                    { label: lang === "it" ? "Adozioni" : "Adoptions", value: (ledgerData.summary.adoptionCents / 100).toFixed(2) + " €", color: "text-blue-600" },
                    { label: lang === "it" ? "Commissioni" : "Commissions", value: (ledgerData.summary.commissionCents / 100).toFixed(2) + " €", color: "text-amber-600" },
                    { label: lang === "it" ? "Rimborsi" : "Refunds", value: ((ledgerData.summary.refundCents ?? 0) / 100).toFixed(2) + " €", color: "text-rose-600" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-card border border-border rounded-2xl p-4 text-center">
                      <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Filtro tipo */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: lang === "it" ? "Tutti" : "All" },
                    { key: "campaign_activation", label: lang === "it" ? "Attivazione campagna" : "Campaign activation" },
                    { key: "campaign_renewal", label: lang === "it" ? "Rinnovo campagna" : "Campaign renewal" },
                    { key: "adoption_payment", label: lang === "it" ? "Pagamento adozione" : "Adoption payment" },
                    { key: "platform_commission", label: lang === "it" ? "Commissione piattaforma" : "Platform commission" },
                    { key: "refund", label: lang === "it" ? "Rimborsi" : "Refunds" },
                  ].map((f) => (
                    <button key={f.key} onClick={() => setLedgerTypeFilter(f.key)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${ledgerTypeFilter === f.key ? "bg-cyan-600 text-white border-cyan-600" : "border-border text-muted-foreground hover:bg-muted"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Tabella voci */}
                {(() => {
                  const filtered = ledgerTypeFilter === "all"
                    ? ledgerData.entries
                    : ledgerData.entries.filter((e) => e.type === ledgerTypeFilter);

                  const TYPE_LABELS: Record<string, string> = {
                    campaign_activation: lang === "it" ? "Attivazione" : "Activation",
                    campaign_renewal: lang === "it" ? "Rinnovo" : "Renewal",
                    adoption_payment: lang === "it" ? "Adozione" : "Adoption",
                    platform_commission: lang === "it" ? "Commissione" : "Commission",
                    refund: lang === "it" ? "Rimborso" : "Refund",
                  };
                  const TYPE_COLORS: Record<string, string> = {
                    campaign_activation: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                    campaign_renewal: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
                    adoption_payment: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                    platform_commission: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                    refund: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
                  };

                  if (filtered.length === 0) {
                    return <div className="text-center py-10 text-muted-foreground">{lang === "it" ? "Nessuna voce trovata" : "No entries found"}</div>;
                  }

                  return (
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">ID</th>
                              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{lang === "it" ? "Tipo" : "Type"}</th>
                              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{lang === "it" ? "Descrizione" : "Description"}</th>
                              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{lang === "it" ? "Riferimento" : "Reference"}</th>
                              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">{lang === "it" ? "Importo" : "Amount"}</th>
                              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{lang === "it" ? "Metodo" : "Method"}</th>
                              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{lang === "it" ? "Data" : "Date"}</th>
                              <th className="px-4 py-3"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((entry) => (
                              <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{entry.id}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[entry.type] ?? "bg-muted text-muted-foreground"}`}>
                                    {TYPE_LABELS[entry.type] ?? entry.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 max-w-[220px]">
                                  <div className="truncate text-foreground">{entry.description}</div>
                                  {entry.refundIntestatario && (
                                    <div className="text-xs text-amber-600 dark:text-amber-400 truncate">{entry.refundIntestatario}</div>
                                  )}
                                  {entry.refundDate && (
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(entry.refundDate).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                                    </div>
                                  )}
                                  {entry.adoptionId && <div className="text-xs text-muted-foreground">Adoz. #{entry.adoptionId}</div>}
                                  {entry.campaignId && <div className="text-xs text-muted-foreground">Camp. #{entry.campaignId}</div>}
                                  {entry.linkedLedgerId && <div className="text-xs text-muted-foreground">↩ #{entry.linkedLedgerId}</div>}
                                </td>
                                <td className="px-4 py-3 max-w-[180px]">
                                  {(entry.entityUserId || entry.entityDenominazione) ? (
                                    <button
                                      onClick={() => openBillingModal(entry)}
                                      className="flex items-center gap-1.5 group text-left"
                                      title={lang === "it" ? "Visualizza dati fatturazione" : "View billing details"}
                                    >
                                      <span className="font-medium text-cyan-600 dark:text-cyan-400 truncate group-hover:underline">
                                        {entry.entityDenominazione ?? entry.entityUserName ?? entry.entityUserId}
                                      </span>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0 opacity-60 group-hover:opacity-100">
                                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                      </svg>
                                    </button>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                                  {(entry.amountCents / 100).toFixed(2)} €
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${entry.paymentMethod === "stripe" ? "text-violet-600" : "text-blue-600"}`}>
                                    {entry.paymentMethod === "stripe" ? "Stripe" : "PayPal"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(entry.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                </td>
                                <td className="px-4 py-3">
                                  {confirmDeleteLedgerId === entry.id ? (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => handleDeleteLedgerEntry(entry.id)}
                                        disabled={deletingLedgerId === entry.id}
                                        className="px-2 py-1 bg-destructive text-white text-xs rounded-lg font-semibold disabled:opacity-50"
                                      >
                                        {deletingLedgerId === entry.id ? "..." : lang === "it" ? "Conferma" : "Confirm"}
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteLedgerId(null)}
                                        className="px-2 py-1 border border-border text-xs rounded-lg text-muted-foreground hover:bg-muted"
                                      >
                                        {lang === "it" ? "Annulla" : "Cancel"}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      {entry.type !== "refund" && (
                                        <button
                                          onClick={() => { setRefundModal(entry); setRefundForm({ amountCents: (entry.amountCents / 100).toFixed(2), description: lang === "it" ? `Rimborso: ${entry.description}` : `Refund: ${entry.description}`, paymentMethod: entry.paymentMethod === "manual" ? "manual" : entry.paymentMethod, refundIntestatario: entry.entityDenominazione ?? entry.entityUserName ?? "", refundDate: new Date().toISOString().slice(0, 10) }); }}
                                          className="p-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                          title={lang === "it" ? "Registra rimborso" : "Record refund"}
                                        >
                                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                                        </button>
                                      )}
                                      <button
                                        onClick={() => setConfirmDeleteLedgerId(entry.id)}
                                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                        title={lang === "it" ? "Elimina voce" : "Delete entry"}
                                      >
                                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="text-center py-10 text-muted-foreground">{lang === "it" ? "Nessun dato disponibile" : "No data available"}</div>
            )}
          </>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === "settings" && (
          <AdminSettingsSection lang={lang as "it" | "en"} authFetch={authFetch} toast={toast} />
        )}

      </div>

      {/* Billing details modal */}
      {billingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setBillingModal(null)}>
          <div className="bg-background rounded-2xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-600 dark:text-cyan-400">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <h2 className="font-semibold text-foreground text-base">
                  {lang === "it" ? "Dati fatturazione" : "Billing details"}
                </h2>
              </div>
              <button onClick={() => setBillingModal(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <p className="text-xs text-muted-foreground font-mono truncate">
              {lang === "it" ? "Voce ledger" : "Ledger entry"} #{billingModal.id} — {billingModal.description}
            </p>
            {billingModal.type === "refund" && (billingModal.refundIntestatario || billingModal.refundDate) && (
              <div className="flex flex-col gap-0 divide-y divide-border rounded-xl border border-border overflow-hidden text-sm">
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-xs font-medium">
                  {lang === "it" ? "Dati rimborso" : "Refund details"}
                </div>
                {billingModal.refundIntestatario && <BillingRow label={lang === "it" ? "Intestatario" : "Recipient"} value={billingModal.refundIntestatario} />}
                {billingModal.refundDate && <BillingRow label={lang === "it" ? "Data rimborso" : "Refund date"} value={new Date(billingModal.refundDate).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })} />}
                <BillingRow label={lang === "it" ? "Somma rimborsata" : "Amount refunded"} value={`${(billingModal.amountCents / 100).toFixed(2)} €`} />
                {billingModal.linkedLedgerId && <BillingRow label={lang === "it" ? "Voce originale" : "Original entry"} value={`#${billingModal.linkedLedgerId}`} />}
              </div>
            )}
            {(billingModal.entityDenominazione || billingModal.entityPartitaIva) ? (
              <div className="flex flex-col gap-0 divide-y divide-border rounded-xl border border-border overflow-hidden text-sm">
                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {lang === "it" ? "Dati fiscali congelati al momento del pagamento" : "Fiscal data frozen at payment time"}
                </div>
                {billingModal.entityDenominazione && <BillingRow label={lang === "it" ? "Ragione sociale" : "Company name"} value={billingModal.entityDenominazione} />}
                {billingModal.entityPartitaIva && <BillingRow label="Partita IVA" value={billingModal.entityPartitaIva} />}
                {billingModal.entityCodiceFiscale && <BillingRow label={lang === "it" ? "Codice fiscale" : "Fiscal code"} value={billingModal.entityCodiceFiscale} />}
                {billingModal.entityCodiceUnivoco && <BillingRow label={lang === "it" ? "Codice univoco (SDI)" : "SDI code"} value={billingModal.entityCodiceUnivoco} />}
                {billingModal.entityIndirizzo && <BillingRow label={lang === "it" ? "Indirizzo" : "Address"} value={billingModal.entityIndirizzo} />}
                {billingModal.entityEmail && <BillingRow label="Email" value={billingModal.entityEmail} />}
                {billingModal.entityTelefono && <BillingRow label={lang === "it" ? "Telefono" : "Phone"} value={billingModal.entityTelefono} />}
                {billingModal.entityReferente && <BillingRow label={lang === "it" ? "Referente" : "Contact"} value={billingModal.entityReferente} />}
                {billingModal.entityUserName && <BillingRow label="Username" value={`@${billingModal.entityUserName}`} />}
              </div>
            ) : billingLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                {lang === "it" ? "Caricamento..." : "Loading..."}
              </div>
            ) : billingData ? (
              <div className="flex flex-col gap-0 divide-y divide-border rounded-xl border border-border overflow-hidden text-sm">
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-xs font-medium">
                  {lang === "it" ? "Dati attuali (voce precedente allo snapshot)" : "Current data (entry predates snapshot)"}
                </div>
                {billingData.type === "organization" ? (
                  <>
                    <BillingRow label={lang === "it" ? "Ragione sociale" : "Company name"} value={billingData.ragioneSociale} />
                    <BillingRow label={lang === "it" ? "Forma giuridica" : "Legal form"} value={billingData.formaGiuridica} />
                    <BillingRow label="Partita IVA" value={billingData.partitaIva} />
                    <BillingRow label={lang === "it" ? "Codice fiscale" : "Fiscal code"} value={billingData.codiceFiscale} />
                    <BillingRow label={lang === "it" ? "Codice univoco (SDI)" : "SDI code"} value={billingData.codiceUnivoco} />
                    {billingData.numeroRegistroImprese && (
                      <BillingRow label={lang === "it" ? "N. registro imprese" : "Business registry n."} value={billingData.numeroRegistroImprese} />
                    )}
                    <BillingRow label={lang === "it" ? "Indirizzo" : "Address"} value={`${billingData.indirizzoVia}, ${billingData.indirizzoCap} ${billingData.indirizzoCitta} (${billingData.indirizzoStato})`} />
                    <BillingRow label="Email" value={billingData.emailUfficiale} />
                    <BillingRow label={lang === "it" ? "Telefono" : "Phone"} value={billingData.telefono} />
                    <BillingRow label={lang === "it" ? "Referente" : "Contact"} value={`${billingData.referenteNome} ${billingData.referenteCognome}`} />
                    <BillingRow label="Username" value={`@${billingData.username}`} />
                  </>
                ) : (
                  <>
                    <BillingRow label="Username" value={`@${billingData.username}`} />
                    <BillingRow label={lang === "it" ? "Tipo account" : "Account type"} value={billingData.accountType} />
                    {billingData.city && <BillingRow label={lang === "it" ? "Città" : "City"} value={billingData.city} />}
                    {billingData.country && <BillingRow label={lang === "it" ? "Paese" : "Country"} value={billingData.country} />}
                    <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-xs">
                      {lang === "it"
                        ? "Utente non-organizzazione: nessun dato fiscale disponibile."
                        : "Non-organization user: no fiscal data available."}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                {lang === "it" ? "Dati non disponibili" : "Data not available"}
              </div>
            )}

            <button
              onClick={() => setBillingModal(null)}
              className="mt-1 w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              {lang === "it" ? "Chiudi" : "Close"}
            </button>
          </div>
        </div>
      )}

      {/* Campaign fiscal modal */}
      {campaignFiscalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setCampaignFiscalModal(null)}>
          <div className="bg-background rounded-2xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-600 dark:text-cyan-400">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <h2 className="font-semibold text-foreground text-base">
                  {lang === "it" ? "Dati fiscali campagna" : "Campaign fiscal data"}
                </h2>
              </div>
              <button onClick={() => setCampaignFiscalModal(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{campaignFiscalModal.title}</span>
              {" — "}
              {lang === "it" ? "attivata il" : "activated on"}{" "}
              {new Date(campaignFiscalModal.createdAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "2-digit", month: "long", year: "numeric" })}
            </p>

            {(campaignFiscalModal.fiscalDenominazione || campaignFiscalModal.fiscalPartitaIva) ? (
              <div className="flex flex-col gap-0 divide-y divide-border rounded-xl border border-border overflow-hidden text-sm">
                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {lang === "it" ? "Snapshot fiscale al momento dell'attivazione" : "Fiscal snapshot at activation time"}
                </div>
                {campaignFiscalModal.fiscalDenominazione && <BillingRow label={lang === "it" ? "Ragione sociale" : "Company name"} value={campaignFiscalModal.fiscalDenominazione} />}
                {campaignFiscalModal.fiscalPartitaIva && <BillingRow label="Partita IVA" value={campaignFiscalModal.fiscalPartitaIva} />}
                {campaignFiscalModal.fiscalCodiceFiscale && <BillingRow label={lang === "it" ? "Codice fiscale" : "Fiscal code"} value={campaignFiscalModal.fiscalCodiceFiscale} />}
                {campaignFiscalModal.fiscalCodiceUnivoco && <BillingRow label={lang === "it" ? "Codice univoco (SDI)" : "SDI code"} value={campaignFiscalModal.fiscalCodiceUnivoco} />}
                {campaignFiscalModal.fiscalIndirizzo && <BillingRow label={lang === "it" ? "Indirizzo" : "Address"} value={campaignFiscalModal.fiscalIndirizzo} />}
                {campaignFiscalModal.fiscalEmail && <BillingRow label="Email" value={campaignFiscalModal.fiscalEmail} />}
                {campaignFiscalModal.fiscalTelefono && <BillingRow label={lang === "it" ? "Telefono" : "Phone"} value={campaignFiscalModal.fiscalTelefono} />}
                {campaignFiscalModal.fiscalReferente && <BillingRow label={lang === "it" ? "Referente" : "Contact"} value={campaignFiscalModal.fiscalReferente} />}
                {campaignFiscalModal.orgUsername && <BillingRow label="Username" value={`@${campaignFiscalModal.orgUsername}`} />}
              </div>
            ) : (
              <div className="flex flex-col gap-0 divide-y divide-border rounded-xl border border-border overflow-hidden text-sm">
                <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-xs">
                  {lang === "it"
                    ? "Nessun dato fiscale disponibile per questa campagna. Lo snapshot viene registrato solo per i nuovi pagamenti."
                    : "No fiscal data available for this campaign. Snapshots are recorded only for new payments."}
                </div>
                {campaignFiscalModal.orgUsername && <BillingRow label="Username" value={`@${campaignFiscalModal.orgUsername}`} />}
              </div>
            )}

            <button
              onClick={() => setCampaignFiscalModal(null)}
              className="mt-1 w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              {lang === "it" ? "Chiudi" : "Close"}
            </button>
          </div>
        </div>
      )}

      {/* Refund modal */}
      {refundModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setRefundModal(null)}>
          <div className="bg-background rounded-2xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 dark:text-amber-400">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                  </svg>
                </div>
                <h2 className="font-semibold text-foreground text-base">
                  {lang === "it" ? "Registra rimborso" : "Record refund"}
                </h2>
              </div>
              <button onClick={() => setRefundModal(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-4 py-3 bg-muted rounded-xl text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{lang === "it" ? "Collegato a voce" : "Linked to entry"} #{refundModal.id}:</span>{" "}
              {refundModal.description} — {(refundModal.amountCents / 100).toFixed(2)} €
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  {lang === "it" ? "Intestatario rimborso" : "Refund recipient"}
                  <span className="text-xs text-muted-foreground font-normal ml-1">({lang === "it" ? "nome / ragione sociale" : "name / company name"})</span>
                </label>
                <input
                  type="text"
                  value={refundForm.refundIntestatario}
                  onChange={(e) => setRefundForm((f) => ({ ...f, refundIntestatario: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder={lang === "it" ? "Es. Mario Rossi / Associazione XYZ" : "E.g. John Doe / Association XYZ"}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-foreground">
                    {lang === "it" ? "Data rimborso" : "Refund date"}
                  </label>
                  <input
                    type="date"
                    value={refundForm.refundDate}
                    onChange={(e) => setRefundForm((f) => ({ ...f, refundDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-foreground">
                    {lang === "it" ? "Somma rimborsata (€)" : "Refund amount (€)"}
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={refundForm.amountCents}
                    onChange={(e) => setRefundForm((f) => ({ ...f, amountCents: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  {lang === "it" ? "Metodo rimborso" : "Refund method"}
                </label>
                <select
                  value={refundForm.paymentMethod}
                  onChange={(e) => setRefundForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="manual">{lang === "it" ? "Manuale" : "Manual"}</option>
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                  <option value="bank_transfer">{lang === "it" ? "Bonifico" : "Bank transfer"}</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  {lang === "it" ? "Descrizione / causale" : "Description / reason"}
                </label>
                <input
                  type="text"
                  value={refundForm.description}
                  onChange={(e) => setRefundForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder={lang === "it" ? "Causale rimborso..." : "Refund reason..."}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setRefundModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                {lang === "it" ? "Annulla" : "Cancel"}
              </button>
              <button
                onClick={handleCreateRefund}
                disabled={refundLoading || !refundForm.amountCents}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {refundLoading ? "..." : lang === "it" ? "Registra rimborso" : "Record refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete user modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-destructive"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-base">{T.deleteModal.title}</h2>
                <p className="text-muted-foreground text-sm mt-1"><span className="font-semibold text-foreground">@{showDeleteModal.username}</span> — {T.deleteModal.desc}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(null)} disabled={!!actionLoading}
                className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">{T.deleteModal.cancel}</button>
              <button onClick={() => handleDelete(showDeleteModal)} disabled={!!actionLoading}
                className="flex-1 py-2.5 bg-destructive text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {actionLoading ? "..." : T.deleteModal.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete tree modal */}
      {showDeleteTreeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-destructive"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-foreground text-base">{T.treeDeleteModal.title}</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  <span className="font-semibold text-foreground">{showDeleteTreeModal.plantName ?? `#${showDeleteTreeModal.id}`}</span>
                  {showDeleteTreeModal.username && <> · @{showDeleteTreeModal.username}</>}
                  {" — "}{T.treeDeleteModal.desc}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteTreeModal(null)} disabled={!!actionLoading}
                className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">{T.treeDeleteModal.cancel}</button>
              <button onClick={() => handleDeleteTree(showDeleteTreeModal)} disabled={!!actionLoading}
                className="flex-1 py-2.5 bg-destructive text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {actionLoading ? "..." : T.treeDeleteModal.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
