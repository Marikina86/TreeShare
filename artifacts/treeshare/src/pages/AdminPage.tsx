import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

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

interface AdminAlertItem {
  id: number;
  title: string;
  message: string;
  priority: "low" | "normal" | "high" | "critical";
  createdAt: string;
  updatedAt: string;
}

type Tab = "users" | "reports" | "trees" | "problems" | "pending_photos" | "pending_updates" | "alerts" | "tips" | "finance";
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
  const [pendingCounts, setPendingCounts] = useState<{ pendingTrees: number; pendingUpdates: number }>({ pendingTrees: 0, pendingUpdates: 0 });
  const pendingTreesSentinel = useRef<HTMLDivElement>(null);
  const pendingUpdatesSentinel = useRef<HTMLDivElement>(null);

  // ── Stato consigli admin ──────────────────────────────────────────────────
  interface AdminTipItem { id: number; title: string; description: string; category: string; createdAt: string; updatedAt: string; }
  const [adminTips, setAdminTips] = useState<AdminTipItem[]>([]);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [editingTip, setEditingTip] = useState<AdminTipItem | null>(null);
  const [tipSubmitting, setTipSubmitting] = useState(false);
  const TIP_CATEGORIES = ["general", "piante", "coltivazione", "irrigazione", "potatura", "fertilizzazione", "parassiti", "stagioni"];
  const [tipForm, setTipForm] = useState({ title: "", description: "", category: "general" });

  // ── Stato avvisi admin ────────────────────────────────────────────────────
  const [adminAlerts, setAdminAlerts] = useState<AdminAlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AdminAlertItem | null>(null);
  const [alertSubmitting, setAlertSubmitting] = useState(false);
  const [alertForm, setAlertForm] = useState({ title: "", message: "", priority: "normal" });

  interface FinanceData {
    platformRevenue: { totalCommissions: number; totalPayoutFees: number; totalRevenue: number; transactionCount: number };
    recentLedger: { id: number; entryType: string; amountCents: number; orgUserId: string | null; description: string | null; createdAt: string }[];
    orgBalances: { username: string; totalOrgReceived: number; availableBalance: number; totalPaidOut: number }[];
    recentDonations: { id: number; donorUsername: string; recipientUsername: string; amountTotal: number; amountOrg: number; amountPlatform: number; status: string; createdAt: string }[];
    recentPayouts: { id: number; username: string; amountGross: number; payoutFee: number; amountNet: number; status: string; executedAt: string | null }[];
  }
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);

  const T = {
    it: {
      title: "Pannello di controllo", subtitle: "Gestione utenti e contenuti",
      tabs: { users: "Utenti", reports: "Segnalazioni", trees: "Contenuti", problems: "Problemi", alerts: "Avvisi", tips: "Consigli", finance: "Finanza" },
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
      tabs: { users: "Users", reports: "Reports", trees: "Content", problems: "Problems", alerts: "Alerts", tips: "Tips", finance: "Finance" },
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
      setAlertForm({ title: "", message: "", priority: "normal" });
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

  // ── Funzioni CRUD consigli ────────────────────────────────────────────────
  async function loadFinance() {
    setFinanceLoading(true);
    try {
      const res = await authFetch("/api/donations/admin-finance");
      if (res.ok) setFinanceData(await res.json());
    } catch { toast({ title: T.errors.load, variant: "destructive" }); }
    finally { setFinanceLoading(false); }
  }

  async function loadAdminTips() {
    setTipsLoading(true);
    try {
      const res = await authFetch("/api/tips");
      if (res.ok) setAdminTips(await res.json());
    } catch { toast({ title: T.errors.load, variant: "destructive" }); }
    finally { setTipsLoading(false); }
  }

  async function handleSaveTip(e: React.FormEvent) {
    e.preventDefault();
    if (!tipForm.title.trim() || !tipForm.description.trim()) return;
    setTipSubmitting(true);
    try {
      const method = editingTip ? "PATCH" : "POST";
      const url = editingTip ? `/api/admin/tips/${editingTip.id}` : "/api/admin/tips";
      const res = await authFetch(url, { method, body: JSON.stringify(tipForm) });
      if (!res.ok) throw new Error();
      const saved: AdminTipItem = await res.json();
      if (editingTip) {
        setAdminTips((p) => p.map((t) => t.id === saved.id ? saved : t));
      } else {
        setAdminTips((p) => [saved, ...p]);
      }
      setTipForm({ title: "", description: "", category: "general" });
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

  useEffect(() => { loadUsers(); }, [search]);
  useEffect(() => { if (activeTab === "reports") loadReports(); }, [activeTab]);
  useEffect(() => { if (activeTab === "trees") loadTrees(1, treeSearch); }, [activeTab]);
  useEffect(() => { if (activeTab === "trees") loadTrees(treePage, treeSearch); }, [treePage]);
  useEffect(() => { if (activeTab === "problems") loadProblemReports(); }, [activeTab]);
  useEffect(() => { if (activeTab === "pending_photos") loadPendingTrees(1); }, [activeTab]);
  useEffect(() => { if (activeTab === "pending_updates") loadPendingUpdates(1); }, [activeTab]);
  useEffect(() => { if (activeTab === "alerts") loadAdminAlerts(); }, [activeTab]);
  useEffect(() => { if (activeTab === "tips") loadAdminTips(); }, [activeTab]);
  useEffect(() => { if (activeTab === "finance") loadFinance(); }, [activeTab]);
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
                  <div className="flex gap-2 ml-auto mt-auto">
                    {editingAlert && (
                      <button
                        type="button"
                        onClick={() => { setEditingAlert(null); setAlertForm({ title: "", message: "", priority: "normal" }); }}
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
                    return (
                      <div key={alert.id} className="px-5 py-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityColors[alert.priority] ?? priorityColors.normal}`}>
                              {priorityLabels[alert.priority]}
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
                            onClick={() => { setEditingAlert(alert); setAlertForm({ title: alert.title, message: alert.message, priority: alert.priority }); }}
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
                        onClick={() => { setEditingTip(null); setTipForm({ title: "", description: "", category: "general" }); }}
                        disabled={tipSubmitting}
                        className="px-4 py-2 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {lang === "it" ? "Annulla" : "Cancel"}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={tipSubmitting || !tipForm.title.trim() || !tipForm.description.trim()}
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
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => { setEditingTip(tip); setTipForm({ title: tip.title, description: tip.description, category: tip.category }); }}
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
                {/* Riepilogo ricavi piattaforma */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {lang === "it" ? "Ricavi piattaforma (20% commissioni)" : "Platform revenue (20% commissions)"}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">€{(financeData.platformRevenue.totalCommissions / 100).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground mt-1">{lang === "it" ? "Commissioni (20%)" : "Commissions (20%)"}</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">€{(financeData.platformRevenue.totalPayoutFees / 100).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground mt-1">{lang === "it" ? "Fee prelievi (€5.00)" : "Payout fees (€5.00)"}</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">€{(financeData.platformRevenue.totalRevenue / 100).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground mt-1">{lang === "it" ? "Totale ricavi" : "Total revenue"}</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{financeData.platformRevenue.transactionCount}</div>
                      <div className="text-xs text-muted-foreground mt-1">{lang === "it" ? "Transazioni" : "Transactions"}</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 bg-muted/50 rounded-lg p-3">
                    {lang === "it"
                      ? "I fondi della piattaforma (20%) restano sul tuo account Stripe principale. Quando un'org richiede un prelievo, il sistema trasferisce solo l'80% (quota org) al loro conto Stripe Connect, trattenendo anche €5.00 di fee."
                      : "Platform funds (20%) stay on your main Stripe account. When an org requests a payout, the system transfers only 80% (org share) to their Stripe Connect account, also retaining a €5.00 fee."}
                  </p>
                </div>

                {/* Bilanci organizzazioni */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {lang === "it" ? "Bilanci organizzazioni (80% quota org)" : "Organization balances (80% org share)"}
                  </h2>
                  {financeData.orgBalances.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">{lang === "it" ? "Nessun saldo org presente" : "No org balances yet"}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Organizzazione" : "Organization"}</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Ricevuto (80%)" : "Received (80%)"}</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Disponibile" : "Available"}</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Prelevato" : "Paid out"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financeData.orgBalances.map((ob, i) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="py-2 px-2 font-medium">@{ob.username}</td>
                              <td className="py-2 px-2 text-right text-emerald-600">€{(ob.totalOrgReceived / 100).toFixed(2)}</td>
                              <td className="py-2 px-2 text-right font-semibold">€{(ob.availableBalance / 100).toFixed(2)}</td>
                              <td className="py-2 px-2 text-right text-muted-foreground">€{(ob.totalPaidOut / 100).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Donazioni recenti */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {lang === "it" ? "Donazioni recenti" : "Recent donations"}
                  </h2>
                  {financeData.recentDonations.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">{lang === "it" ? "Nessuna donazione" : "No donations yet"}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Donatore" : "Donor"}</th>
                            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Destinatario" : "Recipient"}</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Totale" : "Total"}</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Org (80%)" : "Org (80%)"}</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Piattaf. (20%)" : "Platform (20%)"}</th>
                            <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Status</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Data" : "Date"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financeData.recentDonations.map((d) => (
                            <tr key={d.id} className="border-b border-border/50">
                              <td className="py-2 px-2">@{d.donorUsername}</td>
                              <td className="py-2 px-2">@{d.recipientUsername}</td>
                              <td className="py-2 px-2 text-right font-semibold">€{(d.amountTotal / 100).toFixed(2)}</td>
                              <td className="py-2 px-2 text-right text-emerald-600">€{(d.amountOrg / 100).toFixed(2)}</td>
                              <td className="py-2 px-2 text-right text-purple-600">€{(d.amountPlatform / 100).toFixed(2)}</td>
                              <td className="py-2 px-2 text-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  d.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                  d.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                }`}>{d.status}</span>
                              </td>
                              <td className="py-2 px-2 text-right text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "2-digit", month: "short" })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Prelievi recenti */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M2 12h20M12 2l10 10-10 10" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {lang === "it" ? "Prelievi recenti" : "Recent payouts"}
                  </h2>
                  {financeData.recentPayouts.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">{lang === "it" ? "Nessun prelievo" : "No payouts yet"}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Organizzazione" : "Organization"}</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Lordo" : "Gross"}</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Fee</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Netto" : "Net"}</th>
                            <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Status</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Data" : "Date"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financeData.recentPayouts.map((p) => (
                            <tr key={p.id} className="border-b border-border/50">
                              <td className="py-2 px-2 font-medium">@{p.username}</td>
                              <td className="py-2 px-2 text-right">€{(p.amountGross / 100).toFixed(2)}</td>
                              <td className="py-2 px-2 text-right text-muted-foreground">€{(p.payoutFee / 100).toFixed(2)}</td>
                              <td className="py-2 px-2 text-right font-semibold text-emerald-600">€{(p.amountNet / 100).toFixed(2)}</td>
                              <td className="py-2 px-2 text-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  p.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                }`}>{p.status}</span>
                              </td>
                              <td className="py-2 px-2 text-right text-xs text-muted-foreground">{p.executedAt ? new Date(p.executedAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "2-digit", month: "short" }) : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Registro contabile (ledger) */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {lang === "it" ? "Registro contabile (ledger)" : "Accounting ledger"}
                  </h2>
                  {financeData.recentLedger.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">{lang === "it" ? "Nessun movimento" : "No entries yet"}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Tipo" : "Type"}</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Importo" : "Amount"}</th>
                            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Descrizione" : "Description"}</th>
                            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">{lang === "it" ? "Data" : "Date"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financeData.recentLedger.map((entry) => {
                            const isCredit = entry.amountCents > 0;
                            const typeLabels: Record<string, { it: string; en: string }> = {
                              donation_org_credit: { it: "Credito org", en: "Org credit" },
                              donation_platform_fee: { it: "Comm. piattaforma", en: "Platform fee" },
                              payout_org: { it: "Prelievo org", en: "Org payout" },
                              payout_fee_platform: { it: "Fee prelievo", en: "Payout fee" },
                            };
                            const label = typeLabels[entry.entryType]?.[lang === "it" ? "it" : "en"] || entry.entryType;
                            return (
                              <tr key={entry.id} className="border-b border-border/50">
                                <td className="py-2 px-2">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    entry.entryType.includes("platform") ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                                    entry.entryType.includes("payout") ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  }`}>{label}</span>
                                </td>
                                <td className={`py-2 px-2 text-right font-medium ${isCredit ? "text-emerald-600" : "text-red-500"}`}>
                                  {isCredit ? "+" : ""}€{(entry.amountCents / 100).toFixed(2)}
                                </td>
                                <td className="py-2 px-2 text-xs text-muted-foreground max-w-[200px] truncate">{entry.description || "-"}</td>
                                <td className="py-2 px-2 text-right text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Schema flusso fondi */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-semibold text-foreground mb-4">{lang === "it" ? "Come funziona il flusso fondi" : "How fund flow works"}</h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-700">1</div>
                      <p className="text-muted-foreground">{lang === "it"
                        ? "L'utente dona → Stripe incassa il 100% sul tuo account principale"
                        : "User donates → Stripe collects 100% on your main account"}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-700">2</div>
                      <p className="text-muted-foreground">{lang === "it"
                        ? "Il sistema registra: 80% credito all'org + 20% commissione piattaforma"
                        : "System records: 80% org credit + 20% platform commission"}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-700">3</div>
                      <p className="text-muted-foreground">{lang === "it"
                        ? "I fondi della piattaforma (20%) restano sul tuo account Stripe — sono già tuoi"
                        : "Platform funds (20%) stay on your Stripe account — they're already yours"}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-700">4</div>
                      <p className="text-muted-foreground">{lang === "it"
                        ? "Quando l'org richiede prelievo → l'80% viene trasferito al suo Stripe Connect, meno €5.00 di fee (che resta alla piattaforma)"
                        : "When org requests payout → 80% is transferred to their Stripe Connect, minus €5.00 fee (kept by platform)"}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

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
