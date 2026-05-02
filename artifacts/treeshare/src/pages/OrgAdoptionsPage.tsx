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
    checkDatiRicevuti: "Dati ricevuti",
    checkSpedizione: "Spedizione effettuata",
    updating: "Aggiornamento...",
    active: "Attiva",
    expired: "Scaduta",
    orgStatusLabel: "Spedizione",
    none: "Nessuno",
    certTitle: "Certificato di adozione",
    certDesc: "Scarica il certificato ufficiale da compilare e consegnare all'adottante come attestazione dell'adozione.",
    certBtn: "Scarica certificato PDF",
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
    checkDatiRicevuti: "Data received",
    checkSpedizione: "Shipment completed",
    updating: "Updating...",
    active: "Active",
    expired: "Expired",
    orgStatusLabel: "Shipping",
    none: "None",
    certTitle: "Adoption certificate",
    certDesc: "Download the official certificate to fill in and deliver to the adopter as proof of adoption.",
    certBtn: "Download certificate PDF",
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
  const { lang } = useLang();
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

  const isDatiRicevuti = adoption.orgStatus === "shipping_received" || adoption.orgStatus === "shipped";
  const isSpedito = adoption.orgStatus === "shipped";

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

          <div className="border-t border-border pt-3 space-y-2.5">
            <label className={`flex items-center gap-3 cursor-pointer select-none ${updating ? "opacity-50 pointer-events-none" : ""}`}>
              <span className={`w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                isDatiRicevuti
                  ? "bg-blue-500 border-blue-500"
                  : "border-border bg-background"
              }`}
                onClick={() => updateOrgStatus(isDatiRicevuti ? "pending_shipping" : "shipping_received")}
              >
                {isDatiRicevuti && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span
                className="text-sm text-foreground"
                onClick={() => updateOrgStatus(isDatiRicevuti ? "pending_shipping" : "shipping_received")}
              >
                {t.checkDatiRicevuti}
              </span>
            </label>

            <label className={`flex items-center gap-3 cursor-pointer select-none ${updating ? "opacity-50 pointer-events-none" : ""}`}>
              <span className={`w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                isSpedito
                  ? "bg-green-500 border-green-500"
                  : "border-border bg-background"
              }`}
                onClick={() => updateOrgStatus(isSpedito ? "shipping_received" : "shipped")}
              >
                {isSpedito && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span
                className="text-sm text-foreground"
                onClick={() => updateOrgStatus(isSpedito ? "shipping_received" : "shipped")}
              >
                {t.checkSpedizione}
              </span>
            </label>
          </div>
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
    staleTime: Infinity,
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

        {/* Certificate download banner */}
        <div className="mb-5 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" className="text-emerald-700 dark:text-emerald-300">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{t.certTitle}</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">{t.certDesc}</p>
            </div>
          </div>
          <a
            href="/certificato-adozione-treeshare.pdf"
            download="Certificato_Adozione_TreeShare.pdf"
            className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t.certBtn}
          </a>
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
