import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Link } from "wouter";

interface Co2Ranking {
  id: number;
  month: string;
  rank: number;
  comune: string;
  provincia: string | null;
  treeCount: number;
  co2Kg: number;
  badge: string;
  distinctPlanters: number | null;
}

interface Co2Data {
  months: string[];
  rankings: Record<string, Co2Ranking[]>;
}

function formatQuarter(quarter: string): string {
  const QUARTER_LABELS: Record<string, string> = {
    "Q1": "Q1 (Gen - Mar)",
    "Q2": "Q2 (Apr - Giu)",
    "Q3": "Q3 (Lug - Set)",
    "Q4": "Q4 (Ott - Dic)",
  };
  const [year, q] = quarter.split("-");
  return `${QUARTER_LABELS[q] ?? q} ${year}`;
}

function formatCo2(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(1)} kg`;
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17 8C8 10 5.9 16.17 3.82 19.34L5.71 21l1-1C9 18 11 17 13 17c4 0 7-3 7-7 0-1.5-.4-2.9-1.1-4.1C18.3 6.8 17.7 7.4 17 8z" opacity="0.8"/>
      <path d="M3.82 19.34C3.28 20.21 3 21.1 3 22h1c0-.66.2-1.34.53-2L3.82 19.34z" opacity="0.6"/>
    </svg>
  );
}

const BADGE_CONFIG = {
  gold: {
    rank: "1°",
    label: "Super Green",
    bg: "from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40",
    border: "border-emerald-400 dark:border-emerald-600",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-400/50",
    rankBg: "bg-emerald-600 dark:bg-emerald-500",
    co2Bg: "bg-emerald-100 dark:bg-emerald-900/40",
    co2Text: "text-emerald-800 dark:text-emerald-300",
    leafColor: "text-emerald-600 dark:text-emerald-400",
    shadow: "shadow-emerald-100 dark:shadow-emerald-900/20",
  },
  silver: {
    rank: "2°",
    label: "Green",
    bg: "from-green-50 to-teal-50 dark:from-green-950/30 dark:to-teal-950/30",
    border: "border-green-300 dark:border-green-700",
    text: "text-green-700 dark:text-green-400",
    ring: "ring-green-300/50",
    rankBg: "bg-green-600 dark:bg-green-500",
    co2Bg: "bg-green-100 dark:bg-green-900/40",
    co2Text: "text-green-800 dark:text-green-300",
    leafColor: "text-green-500 dark:text-green-400",
    shadow: "shadow-green-100 dark:shadow-green-900/20",
  },
  bronze: {
    rank: "3°",
    label: "Eco",
    bg: "from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30",
    border: "border-teal-300 dark:border-teal-700",
    text: "text-teal-700 dark:text-teal-400",
    ring: "ring-teal-300/50",
    rankBg: "bg-teal-600 dark:bg-teal-500",
    co2Bg: "bg-teal-100 dark:bg-teal-900/40",
    co2Text: "text-teal-800 dark:text-teal-300",
    leafColor: "text-teal-500 dark:text-teal-400",
    shadow: "shadow-teal-100 dark:shadow-teal-900/20",
  },
} as const;

function RankingCard({ r }: { r: Co2Ranking }) {
  const cfg = BADGE_CONFIG[r.badge as keyof typeof BADGE_CONFIG] ?? BADGE_CONFIG.bronze;
  return (
    <div className={`relative bg-gradient-to-br ${cfg.bg} border ${cfg.border} rounded-2xl p-5 flex gap-4 items-start shadow-sm ring-1 ${cfg.ring} ${cfg.shadow}`}>
      <div className={`w-10 h-10 rounded-xl ${cfg.rankBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <span className="text-white font-bold text-sm leading-none">{cfg.rank}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${cfg.co2Bg} ${cfg.text}`}>
            <LeafIcon className={cfg.leafColor} />
            {cfg.label}
          </span>
          {r.provincia && (
            <span className="text-xs bg-background/70 border border-border rounded-full px-2 py-0.5 text-muted-foreground font-mono">
              {r.provincia}
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-foreground mt-1.5 leading-tight truncate">
          {r.comune}
          {r.provincia ? ` (${r.provincia})` : ""}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          {r.treeCount} {r.treeCount === 1 ? "nuova pianta" : "nuove piante"} nel trimestre
        </p>
        {r.distinctPlanters != null && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {r.distinctPlanters} {r.distinctPlanters === 1 ? "piantatore" : "piantatori"} attivi
            {" · "}media{" "}
            <strong className="text-foreground">
              {(r.treeCount / r.distinctPlanters).toFixed(1)}
            </strong>{" "}
            piante/piantatore
          </p>
        )}
        <div className={`inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-xl ${cfg.co2Bg}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cfg.co2Text}>
            <path d="M12 22V14"/>
            <path d="M12 14C12 14 7 13 5 9C3 5 6 2 9 3C10.5 3.5 11.5 5 12 7C12.5 5 13.5 3.5 15 3C18 2 21 5 19 9C17 13 12 14 12 14Z"/>
          </svg>
          <span className={`text-sm font-bold ${cfg.co2Text}`}>{formatCo2(r.co2Kg)} CO₂ assorbita nel trimestre</span>
        </div>
      </div>
    </div>
  );
}

export default function Co2Page() {
  const [data, setData] = useState<Co2Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/co2/rankings")
      .then((r) => r.json())
      .then((d: Co2Data) => {
        setData(d);
        if (d.months.length > 0) setSelectedMonth(d.months[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentRankings = selectedMonth && data?.rankings[selectedMonth]
    ? data.rankings[selectedMonth]
    : [];

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground leading-tight">Classifica CO₂</h1>
          <p className="text-sm text-muted-foreground mt-0.5">I comuni che assorbono più CO₂ ogni trimestre</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 mb-6 flex gap-3 items-start">
          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4l3 3"/>
            </svg>
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed">
            Ogni trimestre premiamo i comuni dove i piantatori sono stati <strong className="text-foreground">più attivi in media</strong>.
            Il punteggio è la <strong className="text-foreground">media di nuove piante per piantatore</strong> nel trimestre — così i grandi comuni non vincono solo per dimensione.
            {" "}Servono almeno <strong className="text-foreground">3 piantatori distinti</strong> per qualificarsi.
            {" "}La classifica si aggiorna il <strong className="text-foreground">1° di aprile, luglio, ottobre e gennaio</strong>.{" "}
            <span className="italic">I valori CO₂ sono stime indicative (22 kg/anno per pianta).</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold">
            <LeafIcon className="text-emerald-600" /> Super Green
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold">
            <LeafIcon className="text-green-500" /> Green
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-semibold">
            <LeafIcon className="text-teal-500" /> Eco
          </span>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-3 border-muted border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Caricamento classifica...</p>
          </div>
        )}

        {!loading && (!data || data.months.length === 0) && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                <path d="M12 22V14"/>
                <path d="M12 14C12 14 7 13 5 9C3 5 6 2 9 3C10.5 3.5 11.5 5 12 7C12.5 5 13.5 3.5 15 3C18 2 21 5 19 9C17 13 12 14 12 14Z"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Nessun dato ancora</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              La classifica viene calcolata ogni trimestre. Il prossimo aggiornamento sarà disponibile il 1° del prossimo mese di calcolo (aprile, luglio, ottobre o gennaio).
            </p>
            <Link
              href="/post"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              🌱 Pianta subito
            </Link>
          </div>
        )}

        {!loading && data && data.months.length > 0 && (
          <>
            {data.months.length > 1 && (
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {data.months.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                      selectedMonth === m
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {formatQuarter(m)}
                  </button>
                ))}
              </div>
            )}

            {selectedMonth && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-foreground">
                    {formatQuarter(selectedMonth)}
                  </h2>
                  {selectedMonth === data.months[0] && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full font-medium">
                      Più recente
                    </span>
                  )}
                </div>

                {currentRankings.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    Nessun dato per questo mese.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentRankings.map((r) => (
                      <RankingCard key={r.id} r={r} />
                    ))}
                  </div>
                )}

                <div className="mt-6 bg-muted/40 rounded-2xl p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Contribuisci alla classifica del tuo comune — pianta una nuova pianta!
                  </p>
                  <Link
                    href="/post"
                    className="inline-flex items-center gap-2 mt-3 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    🌱 Aggiungi una pianta
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
