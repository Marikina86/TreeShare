import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";

interface Donation {
  id: number;
  amountTotal: number;
  amountOrg: number;
  amountPlatform: number;
  status: string;
  createdAt: string;
  campaignTitle: string | null;
  recipientUsername: string | null;
}

const labels = {
  it: {
    title: "Le mie donazioni",
    total: "Totale donato",
    to: "a",
    completed: "Completata",
    pending: "In attesa",
    failed: "Fallita",
    empty: "Non hai ancora effettuato donazioni.",
    orgShare: "Organizzazione",
    platformFee: "Commissione piattaforma",
  },
  en: {
    title: "My donations",
    total: "Total donated",
    to: "to",
    completed: "Completed",
    pending: "Pending",
    failed: "Failed",
    empty: "You haven't made any donations yet.",
    orgShare: "Organization",
    platformFee: "Platform fee",
  },
  fr: {
    title: "Mes dons",
    total: "Total donné",
    to: "à",
    completed: "Complété",
    pending: "En attente",
    failed: "Échoué",
    empty: "Vous n'avez pas encore fait de dons.",
    orgShare: "Organisation",
    platformFee: "Commission plateforme",
  },
  pt: {
    title: "Minhas doações",
    total: "Total doado",
    to: "para",
    completed: "Completa",
    pending: "Pendente",
    failed: "Falhada",
    empty: "Ainda não fez nenhuma doação.",
    orgShare: "Organização",
    platformFee: "Taxa da plataforma",
  },
  es: {
    title: "Mis donaciones",
    total: "Total donado",
    to: "a",
    completed: "Completada",
    pending: "Pendiente",
    failed: "Fallida",
    empty: "Aún no has hecho donaciones.",
    orgShare: "Organización",
    platformFee: "Comisión plataforma",
  },
  ja: {
    title: "私の寄付",
    total: "寄付総額",
    to: "→",
    completed: "完了",
    pending: "保留中",
    failed: "失敗",
    empty: "まだ寄付していません。",
    orgShare: "団体",
    platformFee: "プラットフォーム手数料",
  },
};

type Lang = keyof typeof labels;

export default function MyDonationsSection() {
  const { getToken } = useAuth();
  const { lang } = useLang();
  const l = labels[lang as Lang] || labels.en;

  const { data } = useQuery<{ donations: Donation[]; totalDonated: number }>({
    queryKey: ["my-donations"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/donations/my-donations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) return res.json();
      return { donations: [], totalDonated: 0 };
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  const donations = data?.donations ?? [];
  const totalDonated = data?.totalDonated ?? 0;

  function statusLabel(status: string) {
    if (status === "completed") return l.completed;
    if (status === "pending") return l.pending;
    return l.failed;
  }

  function statusColor(status: string) {
    if (status === "completed") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
    if (status === "pending") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  }

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {l.title}
      </h2>

      {totalDonated > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              €{(totalDonated / 100).toFixed(2)}
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">{l.total}</div>
          </div>
        </div>
      )}

      {donations.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">{l.empty}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {donations.map((d) => (
            <div key={d.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    €{(d.amountTotal / 100).toFixed(2)}
                    {d.recipientUsername && (
                      <span className="text-muted-foreground font-normal"> {l.to} {d.recipientUsername}</span>
                    )}
                  </p>
                  {d.campaignTitle && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{d.campaignTitle}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span>{l.orgShare}: €{(d.amountOrg / 100).toFixed(2)} (80%)</span>
                    <span>{l.platformFee}: €{(d.amountPlatform / 100).toFixed(2)} (20%)</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor(d.status)}`}>
                    {statusLabel(d.status)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(d.createdAt).toLocaleDateString(lang === "it" ? "it-IT" : lang === "fr" ? "fr-FR" : lang === "pt" ? "pt-PT" : lang === "es" ? "es-ES" : lang === "ja" ? "ja-JP" : "en-US", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
