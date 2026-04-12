import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useLang } from "@/lib/i18n";
import { CampaignPhotoGridCompact } from "@/components/PhotoLightbox";

interface Campaign {
  id: number;
  title: string;
  description: string;
  goalAmount: number | null;
  totalRaised: number;
  donationCount: number;
  photos: string[];
  userId: string;
  orgUsername: string;
  orgPhotoUrl: string | null;
}

const t = {
  it: { title: "Campagne attive", raised: "Raccolti", donations: "donazioni", goal: "Obiettivo", viewAll: "Vedi tutte", noGoal: "Nessun obiettivo", empty: "Nessuna campagna attiva", donate: "Dona", by: "di" },
  en: { title: "Active campaigns", raised: "Raised", donations: "donations", goal: "Goal", viewAll: "View all", noGoal: "No goal", empty: "No active campaigns", donate: "Donate", by: "by" },
  fr: { title: "Campagnes actives", raised: "Collectés", donations: "dons", goal: "Objectif", viewAll: "Voir tout", noGoal: "Aucun objectif", empty: "Aucune campagne active", donate: "Donner", by: "de" },
  pt: { title: "Campanhas ativas", raised: "Arrecadado", donations: "doações", goal: "Meta", viewAll: "Ver todas", noGoal: "Sem meta", empty: "Nenhuma campanha ativa", donate: "Doar", by: "de" },
  es: { title: "Campañas activas", raised: "Recaudado", donations: "donaciones", goal: "Objetivo", viewAll: "Ver todas", noGoal: "Sin objetivo", empty: "No hay campañas activas", donate: "Donar", by: "de" },
  ja: { title: "アクティブキャンペーン", raised: "集まった", donations: "寄付", goal: "目標", viewAll: "すべて見る", noGoal: "目標なし", empty: "アクティブなキャンペーンはありません", donate: "寄付", by: "by" },
};

type Lang = keyof typeof t;

export default function CampaignDropdown({ isActive, iconSize = 18 }: { isActive: boolean; iconSize?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { lang } = useLang();
  const l = t[lang as Lang] || t.en;

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["active-campaigns-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/donations/campaigns/active?sort=recent");
      if (res.ok) return res.json();
      return [];
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(target) && !target.closest("[data-lightbox]")) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !document.querySelector("[data-lightbox]")) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`p-2 rounded-lg transition-colors ${
          isActive || open ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22V14"/>
          <path d="M12 14C12 14 7 13 5 9C3 5 6 2 9 3C10.5 3.5 11.5 5 12 7C12.5 5 13.5 3.5 15 3C18 2 21 5 19 9C17 13 12 14 12 14Z" fill="currentColor" opacity="0.15"/>
          <path d="M12 14C12 14 7 13 5 9C3 5 6 2 9 3C10.5 3.5 11.5 5 12 7C12.5 5 13.5 3.5 15 3C18 2 21 5 19 9C17 13 12 14 12 14Z"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-[100]">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{l.title}</h3>
            <Link
              href="/campaigns"
              onClick={() => setOpen(false)}
              className="text-xs text-primary hover:underline font-medium"
            >
              {l.viewAll}
            </Link>
          </div>

          <div className="overflow-y-auto max-h-[calc(70vh-52px)] divide-y divide-border">
            {campaigns.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">{l.empty}</div>
            ) : (
              campaigns.slice(0, 5).map((c) => {
                const photos = Array.isArray(c.photos) ? c.photos : [];
                const progress = c.goalAmount ? Math.min(100, (c.totalRaised / c.goalAmount) * 100) : null;

                return (
                  <div key={c.id} className="px-4 py-3">
                    <div className="flex items-start gap-2.5 mb-2">
                      <Link href={`/profile/${c.userId}`} onClick={() => setOpen(false)}>
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {c.orgPhotoUrl ? (
                            <img src={c.orgPhotoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                              {(c.orgUsername || "?")[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground leading-tight truncate">{c.title}</p>
                        <Link href={`/profile/${c.userId}`} onClick={() => setOpen(false)}>
                          <p className="text-[11px] text-primary hover:underline cursor-pointer">{l.by} {c.orgUsername}</p>
                        </Link>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{c.description}</p>

                    <CampaignPhotoGridCompact photos={photos} className="mb-2" />

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-1.5">
                      <span className="font-medium text-foreground">€{(c.totalRaised / 100).toFixed(2)} {l.raised}</span>
                      <span>{c.donationCount} {l.donations}</span>
                      {c.goalAmount ? (
                        <span>{l.goal}: €{(c.goalAmount / 100).toFixed(2)}</span>
                      ) : (
                        <span className="italic">{l.noGoal}</span>
                      )}
                    </div>

                    {progress !== null && (
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}

                    <Link href={`/profile/${c.userId}`} onClick={() => setOpen(false)}>
                      <button className="w-full py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">
                        {l.donate}
                      </button>
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
