import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import Layout from "@/components/Layout";
import { useLang } from "@/lib/i18n";

interface Campaign {
  id: number;
  userId: string;
  title: string;
  description: string;
  goalAmount: number | null;
  totalRaised: number;
  donationCount: number;
  photos: string[];
  createdAt: string;
  orgUsername: string;
  orgPhotoUrl: string | null;
}

function photoSrc(url: string) {
  if (url.startsWith("http")) return url;
  return `/api/storage${url.startsWith("/") ? "" : "/"}${url}`;
}

const t = {
  it: {
    title: "Campagne attive",
    empty: "Nessuna campagna attiva al momento.",
    raised: "Raccolti",
    donations: "donazioni",
    goal: "Obiettivo",
    noGoal: "Senza obiettivo",
    donate: "Dona",
    sortRecent: "Recenti",
    sortPopular: "Popolari",
    sortFunded: "Più finanziate",
    by: "di",
    viewProfile: "Vedi profilo",
  },
  en: {
    title: "Active campaigns",
    empty: "No active campaigns at the moment.",
    raised: "Raised",
    donations: "donations",
    goal: "Goal",
    noGoal: "No goal",
    donate: "Donate",
    sortRecent: "Recent",
    sortPopular: "Popular",
    sortFunded: "Most funded",
    by: "by",
    viewProfile: "View profile",
  },
  fr: {
    title: "Campagnes actives",
    empty: "Aucune campagne active pour le moment.",
    raised: "Collectés",
    donations: "dons",
    goal: "Objectif",
    noGoal: "Sans objectif",
    donate: "Donner",
    sortRecent: "Récentes",
    sortPopular: "Populaires",
    sortFunded: "Plus financées",
    by: "par",
    viewProfile: "Voir profil",
  },
  pt: {
    title: "Campanhas ativas",
    empty: "Nenhuma campanha ativa no momento.",
    raised: "Arrecadado",
    donations: "doações",
    goal: "Meta",
    noGoal: "Sem meta",
    donate: "Doar",
    sortRecent: "Recentes",
    sortPopular: "Populares",
    sortFunded: "Mais financiadas",
    by: "por",
    viewProfile: "Ver perfil",
  },
  es: {
    title: "Campañas activas",
    empty: "No hay campañas activas en este momento.",
    raised: "Recaudado",
    donations: "donaciones",
    goal: "Objetivo",
    noGoal: "Sin objetivo",
    donate: "Donar",
    sortRecent: "Recientes",
    sortPopular: "Populares",
    sortFunded: "Más financiadas",
    by: "por",
    viewProfile: "Ver perfil",
  },
  ja: {
    title: "アクティブなキャンペーン",
    empty: "現在アクティブなキャンペーンはありません。",
    raised: "募金額",
    donations: "寄付",
    goal: "目標",
    noGoal: "目標なし",
    donate: "寄付する",
    sortRecent: "最新",
    sortPopular: "人気",
    sortFunded: "最も資金調達済み",
    by: "",
    viewProfile: "プロフィール",
  },
};

type Lang = keyof typeof t;

export default function CampaignsPage() {
  const { getToken } = useAuth();
  const { lang } = useLang();
  const l = t[lang as Lang] || t.en;

  const [sort, setSort] = useState<"recent" | "popular" | "funded">("recent");

  const { data: campaigns = [], isLoading: loading } = useQuery<Campaign[]>({
    queryKey: ["campaigns-active", sort],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/donations/campaigns/active?sort=${sort}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  function progressPercent(c: Campaign): number | null {
    if (!c.goalAmount || c.goalAmount <= 0) return null;
    return Math.min(100, Math.round((c.totalRaised / c.goalAmount) * 100));
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-foreground">{l.title}</h1>
        </div>

        <div className="flex gap-2 mb-5">
          {(["recent", "popular", "funded"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sort === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s === "recent" ? l.sortRecent : s === "popular" ? l.sortPopular : l.sortFunded}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-emerald-500">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">{l.empty}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((c) => {
              const progress = progressPercent(c);
              return (
                <div key={c.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <Link href={`/profile/${c.userId}`}>
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
                          {c.orgPhotoUrl ? (
                            <img src={c.orgPhotoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                              {(c.orgUsername || "?")[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                      </Link>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-foreground leading-tight">{c.title}</h3>
                        <Link href={`/profile/${c.userId}`}>
                          <p className="text-xs text-primary hover:underline cursor-pointer mt-0.5">
                            {l.by} {c.orgUsername}
                          </p>
                        </Link>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{c.description}</p>

                    {(() => {
                      const photos = Array.isArray(c.photos) ? c.photos : [];
                      if (photos.length === 0) return null;
                      return (
                        <div className={`mb-4 ${photos.length === 1 ? "" : "grid gap-2"}`}
                          style={photos.length > 1 ? { gridTemplateColumns: `repeat(${Math.min(photos.length, 3)}, 1fr)` } : undefined}
                        >
                          {photos.map((photo, i) => (
                            <img key={i} src={photoSrc(photo)} alt="" className={`rounded-xl object-cover border border-border w-full ${photos.length === 1 ? "max-h-52" : "h-28"}`} />
                          ))}
                        </div>
                      );
                    })()}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span className="font-medium text-foreground">€{(c.totalRaised / 100).toFixed(2)} {l.raised}</span>
                      <span>{c.donationCount} {l.donations}</span>
                      {c.goalAmount ? (
                        <span>{l.goal}: €{(c.goalAmount / 100).toFixed(2)}</span>
                      ) : (
                        <span className="italic">{l.noGoal}</span>
                      )}
                    </div>

                    {progress !== null && (
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-4">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}

                    <Link href={`/profile/${c.userId}`}>
                      <button className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
                        {l.donate}
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
