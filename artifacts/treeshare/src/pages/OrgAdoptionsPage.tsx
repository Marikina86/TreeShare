import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGetMyProfile } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { useLang } from "@/lib/i18n";

interface ShippingData {
  fullName: string;
  phone: string | null;
  address: string;
  city: string;
  postalCode: string | null;
  country: string;
  notes: string | null;
  submittedAt: string;
}

interface OrgAdoption {
  id: number;
  adoptionCode: string | null;
  userId: string;
  treeId: number;
  treeTitle: string;
  treeName: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  amountCents: number;
  platformFeeCents: number;
  netToEntityCents: number;
  status: string;
  orgStatus: string | null;
  shippingData: ShippingData | null;
  userName: string | null;
  userPhone: string | null;
  createdAt: string;
}

const ORG_STATUS_LABELS: Record<string, { it: string; en: string; color: string }> = {
  pending_shipping: { it: "In attesa dati", en: "Awaiting shipping data", color: "amber" },
  shipping_received: { it: "Dati ricevuti", en: "Data received", color: "blue" },
  shipped: { it: "Spedito", en: "Shipped", color: "green" },
};

const T = {
  it: {
    title: "Adozioni ricevute",
    loading: "Caricamento...",
    orgOnly: "Accesso riservato agli enti.",
    back: "Torna agli alberi",
    noAdoptions: "Nessuna adozione ricevuta ancora.",
    filterAll: "Tutte",
    filterPending: "In attesa dati",
    filterReceived: "Dati ricevuti",
    filterShipped: "Spedito",
    filterExpired: "Scadute",
    adoptionCode: "Codice",
    tree: "Albero",
    duration: "Durata",
    days: "gg",
    amount: "Importo",
    netAmount: "Netto ente",
    status: "Stato adozione",
    orgStatus: "Stato spedizione",
    adoptedOn: "Adottato il",
    expiresOn: "Scade il",
    shippingTitle: "Dati spedizione",
    noShipping: "Dati di spedizione non ancora inviati dall'adottante.",
    markReceived: "Segna: Dati ricevuti",
    markShipped: "Segna: Spedito",
    updating: "Aggiornamento...",
    active: "Attiva",
    expired: "Scaduta",
    orgStatusLabel: "Spedizione",
    none: "Nessuno",
  },
  en: {
    title: "Received adoptions",
    loading: "Loading...",
    orgOnly: "Access restricted to organizations.",
    back: "Back to trees",
    noAdoptions: "No adoptions received yet.",
    filterAll: "All",
    filterPending: "Awaiting data",
    filterReceived: "Data received",
    filterShipped: "Shipped",
    filterExpired: "Expired",
    adoptionCode: "Code",
    tree: "Tree",
    duration: "Duration",
    days: "d",
    amount: "Amount",
    netAmount: "Net org",
    status: "Adoption status",
    orgStatus: "Shipping status",
    adoptedOn: "Adopted on",
    expiresOn: "Expires on",
    shippingTitle: "Shipping details",
    noShipping: "Shipping data not yet submitted by adopter.",
    markReceived: "Mark: Data received",
    markShipped: "Mark: Shipped",
    updating: "Updating...",
    active: "Active",
    expired: "Expired",
    orgStatusLabel: "Shipping",
    none: "None",
  },
};

type FilterKey = "all" | "pending_shipping" | "shipping_received" | "shipped" | "expired";

function AdoptionCard({ adoption, t, getToken, onStatusUpdated }: {
  adoption: OrgAdoption;
  t: typeof T.it;
  getToken: () => Promise<string | null>;
  onStatusUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const orgStatusInfo = adoption.orgStatus ? ORG_STATUS_LABELS[adoption.orgStatus] : null;

  async function updateOrgStatus(newStatus: string) {
    setUpdating(true);
    try {
      const token = await getToken();
      await fetch(`/api/adopt/org/adoptions/${adoption.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgStatus: newStatus }),
      });
      onStatusUpdated();
    } finally {
      setUpdating(false);
    }
  }

  const colorMap = { amber: "amber", blue: "blue", green: "green" } as const;
  const badgeColor = orgStatusInfo?.color as keyof typeof colorMap | undefined;

  const badgeClass = badgeColor === "green"
    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
    : badgeColor === "blue"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      : badgeColor === "amber"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        : "bg-muted text-muted-foreground";

  const lang = "it";

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {adoption.adoptionCode && (
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {adoption.adoptionCode}
              </span>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              adoption.status === "active"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-muted text-muted-foreground"
            }`}>
              {adoption.status === "active" ? t.active : t.expired}
            </span>
            {orgStatusInfo && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
                {lang === "it" ? orgStatusInfo.it : orgStatusInfo.en}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground mt-1 truncate">{adoption.treeTitle}</p>
          <p className="text-xs text-muted-foreground">
            {adoption.userName || adoption.userId.substring(0, 8)} · €{(adoption.amountCents / 100).toFixed(2)} · {adoption.durationDays}{t.days}
          </p>
        </div>
        <svg
          width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
          className={`flex-shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/10">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">{t.adoptedOn}</p>
              <p className="font-medium">{new Date(adoption.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t.expiresOn}</p>
              <p className="font-medium">{new Date(adoption.endDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t.amount}</p>
              <p className="font-medium">€{(adoption.amountCents / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t.netAmount}</p>
              <p className="font-medium text-green-600">€{(adoption.netToEntityCents / 100).toFixed(2)}</p>
            </div>
          </div>

          <div className="border-t border-border pt-2">
            <p className="text-xs font-semibold text-foreground mb-1">📦 {t.shippingTitle}</p>
            {adoption.shippingData ? (
              <div className="text-xs text-foreground space-y-0.5">
                <p className="font-medium">{adoption.shippingData.fullName}</p>
                {adoption.shippingData.phone && <p>📞 {adoption.shippingData.phone}</p>}
                <p>📍 {adoption.shippingData.address}, {adoption.shippingData.city} {adoption.shippingData.postalCode}</p>
                <p>{adoption.shippingData.country}</p>
                {adoption.shippingData.notes && (
                  <p className="italic text-muted-foreground mt-1">"{adoption.shippingData.notes}"</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  Inviato: {new Date(adoption.shippingData.submittedAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">{t.noShipping}</p>
            )}
          </div>

          {adoption.shippingData && adoption.orgStatus !== "shipped" && (
            <div className="flex gap-2 pt-1">
              {adoption.orgStatus !== "shipping_received" && (
                <button
                  onClick={() => updateOrgStatus("shipping_received")}
                  disabled={updating}
                  className="flex-1 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {updating ? t.updating : t.markReceived}
                </button>
              )}
              <button
                onClick={() => updateOrgStatus("shipped")}
                disabled={updating}
                className="flex-1 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {updating ? t.updating : t.markShipped}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrgAdoptionsPage() {
  const { lang } = useLang();
  const t = T[lang as "it" | "en"] ?? T.it;
  const { getToken } = useAuth();
  const profile = useGetMyProfile();
  const accountType = (profile.data as any)?.accountType;
  const isOrg = accountType === "organization";
  const [filter, setFilter] = useState<FilterKey>("all");
  const queryClient = useQueryClient();

  const adoptionsQuery = useQuery<OrgAdoption[]>({
    queryKey: ["org-adoptions"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/adopt/org/adoptions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOrg,
    staleTime: 30_000,
  });

  if (profile.isLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-10 text-center text-muted-foreground">{t.loading}</div>
      </Layout>
    );
  }

  if (!isOrg) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-muted-foreground text-sm">{t.orgOnly}</p>
          <Link href="/adopt" className="mt-4 inline-block text-primary text-sm hover:underline">← {t.back}</Link>
        </div>
      </Layout>
    );
  }

  const allAdoptions = adoptionsQuery.data ?? [];

  const filtered = allAdoptions.filter((a) => {
    if (filter === "all") return true;
    if (filter === "expired") return a.status === "expired";
    return a.orgStatus === filter;
  });

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: t.filterAll },
    { key: "pending_shipping", label: t.filterPending },
    { key: "shipping_received", label: t.filterReceived },
    { key: "shipped", label: t.filterShipped },
    { key: "expired", label: t.filterExpired },
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/adopt" className="text-muted-foreground hover:text-foreground transition-colors">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-foreground">📋 {t.title}</h1>
          <span className="ml-auto text-xs text-muted-foreground">{allAdoptions.length} totali</span>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
          {filters.map((f) => {
            const count = f.key === "all"
              ? allAdoptions.length
              : f.key === "expired"
                ? allAdoptions.filter((a) => a.status === "expired").length
                : allAdoptions.filter((a) => a.orgStatus === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {f.label} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>

        {adoptionsQuery.isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!adoptionsQuery.isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <div className="text-4xl mb-3">🌿</div>
            <p>{t.noAdoptions}</p>
          </div>
        )}

        {!adoptionsQuery.isLoading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((a) => (
              <AdoptionCard
                key={a.id}
                adoption={a}
                t={t}
                getToken={getToken}
                onStatusUpdated={() => queryClient.invalidateQueries({ queryKey: ["org-adoptions"] })}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
