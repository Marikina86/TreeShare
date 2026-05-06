import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import Layout from "@/components/Layout";
import { useLang } from "@/lib/i18n";
import { useShare } from "@/hooks/useShare";
import { CampaignPhotoGrid, type CampaignPhoto } from "@/components/PhotoLightbox";
import CityAutocomplete from "@/components/CityAutocomplete";
import { ITALIAN_PROVINCES } from "@/lib/italianProvinces";

interface Campaign {
  id: number;
  userId: string;
  title: string;
  description: string;
  photos: CampaignPhoto[];
  durationDays: number | null;
  expiresAt: string | null;
  treesPlanted?: number;
  co2Kg?: number;
  createdAt: string;
  orgUsername: string;
  orgPhotoUrl: string | null;
  comune?: string | null;
  provincia?: string | null;
}

const t = {
  it: {
    title: "Campagne attive",
    empty: "Nessuna campagna attiva al momento.",
    sortRecent: "Recenti",
    by: "di",
    share: "Condividi",
    expiresOn: "Scade il",
    days: "giorni",
    filterComune: "Cerca per comune",
    filterProvincia: "Prov.",
    clearFilters: "Rimuovi filtri",
  },
  en: {
    title: "Active campaigns",
    empty: "No active campaigns at the moment.",
    sortRecent: "Recent",
    by: "by",
    share: "Share",
    expiresOn: "Expires on",
    days: "days",
    filterComune: "Search by comune",
    filterProvincia: "Prov.",
    clearFilters: "Clear filters",
  },
  fr: {
    title: "Campagnes actives",
    empty: "Aucune campagne active pour le moment.",
    sortRecent: "Récentes",
    by: "par",
    share: "Partager",
    expiresOn: "Expire le",
    days: "jours",
    filterComune: "Rechercher par commune",
    filterProvincia: "Prov.",
    clearFilters: "Effacer les filtres",
  },
  pt: {
    title: "Campanhas ativas",
    empty: "Nenhuma campanha ativa no momento.",
    sortRecent: "Recentes",
    by: "por",
    share: "Compartilhar",
    expiresOn: "Expira em",
    days: "dias",
    filterComune: "Pesquisar por comune",
    filterProvincia: "Prov.",
    clearFilters: "Limpar filtros",
  },
  es: {
    title: "Campañas activas",
    empty: "No hay campañas activas en este momento.",
    sortRecent: "Recientes",
    by: "por",
    share: "Compartir",
    expiresOn: "Expira el",
    days: "días",
    filterComune: "Buscar por comune",
    filterProvincia: "Prov.",
    clearFilters: "Quitar filtros",
  },
  ja: {
    title: "アクティブなキャンペーン",
    empty: "現在アクティブなキャンペーンはありません。",
    sortRecent: "最新",
    by: "",
    share: "共有",
    expiresOn: "有効期限",
    days: "日",
    filterComune: "コムーネで検索",
    filterProvincia: "県",
    clearFilters: "フィルタを解除",
  },
};

type Lang = keyof typeof t;

export default function CampaignsPage() {
  const { getToken } = useAuth();
  const { lang } = useLang();
  const l = t[lang as Lang] || t.en;
  const { share } = useShare();
  const [filterComune, setFilterComune] = useState("");
  const [filterProvincia, setFilterProvincia] = useState("");
  const [appliedComune, setAppliedComune] = useState("");
  const [appliedProvincia, setAppliedProvincia] = useState("");

  function applyFilters() {
    setAppliedComune(filterComune.trim());
    setAppliedProvincia(filterProvincia.trim());
  }

  function clearFilters() {
    setFilterComune("");
    setFilterProvincia("");
    setAppliedComune("");
    setAppliedProvincia("");
  }

  const hasActiveFilter = appliedComune || appliedProvincia;

  const { data: appSettings } = useQuery<{ adoptionsEnabled: boolean; campaignsEnabled: boolean }>({
    queryKey: ["app-settings-public"],
    queryFn: async () => {
      const res = await fetch("/api/app-settings/public");
      if (!res.ok) return { adoptionsEnabled: true, campaignsEnabled: true };
      return res.json();
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });
  const campaignsEnabled = appSettings?.campaignsEnabled ?? true;

  const { data: campaigns = [], isLoading: loading } = useQuery<Campaign[]>({
    queryKey: ["campaigns-active", appliedComune, appliedProvincia],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams();
      if (appliedComune) params.set("comune", appliedComune);
      if (appliedProvincia) params.set("provincia", appliedProvincia);
      const qs = params.toString();
      const res = await fetch(`/api/donations/campaigns/active${qs ? `?${qs}` : ""}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: Infinity,
  });

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">{l.title}</h1>
        </div>

        {!campaignsEnabled && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-amber-600 dark:text-amber-400 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {lang === "it" || !lang
                ? "Le campagne sono temporaneamente disabilitate dall'amministratore."
                : "Campaigns are temporarily disabled by the administrator."}
            </p>
          </div>
        )}

        <div className="space-y-2 mb-5">
          <div className="flex gap-2">
            <div className="flex-1">
              <CityAutocomplete
                value={filterComune}
                onChange={(city, province) => {
                  setFilterComune(city);
                  if (province) setFilterProvincia(province);
                }}
                placeholder={l.filterComune}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background"
              />
            </div>
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 flex items-center"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
            {hasActiveFilter && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={filterProvincia}
            onChange={(e) => {
              setFilterProvincia(e.target.value);
              setAppliedProvincia(e.target.value);
            }}
            className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background"
          >
            <option value="">{l.filterProvincia} — tutte le province</option>
            {ITALIAN_PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
            ))}
          </select>
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
            {campaigns.map((c) => (
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

                  <CampaignPhotoGrid photos={Array.isArray(c.photos) ? c.photos : []} className="mb-4" />

                  {(c.comune || c.provincia) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      <span>{[c.comune, c.provincia].filter(Boolean).join(" — ")}</span>
                    </div>
                  )}

                  {c.expiresAt && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      {c.durationDays && <span>{c.durationDays} {l.days}</span>}
                      <span>{l.expiresOn}: {new Date(c.expiresAt).toLocaleDateString(lang === "it" ? "it-IT" : lang === "fr" ? "fr-FR" : lang === "pt" ? "pt-PT" : lang === "es" ? "es-ES" : lang === "ja" ? "ja-JP" : "en-US", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link href={`/profile/${c.userId}`} className="flex-1">
                      <div className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors text-center">
                        {lang === "it" ? "Vedi profilo" : "View profile"}
                      </div>
                    </Link>
                    <button
                      onClick={() => share({
                        title: c.title,
                        text: c.description,
                        path: `/profile/${c.userId}`,
                      })}
                      className="flex items-center justify-center w-11 h-11 border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title={l.share}
                    >
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3"/>
                        <circle cx="6" cy="12" r="3"/>
                        <circle cx="18" cy="19" r="3"/>
                        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
