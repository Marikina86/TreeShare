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
}

interface Co2Data {
  months: string[];
  rankings: Record<string, Co2Ranking[]>;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const months = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
  ];
  return `${months[parseInt(m, 10) - 1]} ${year}`;
}

function formatCo2(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(1)} kg`;
}

const BADGE_CONFIG = {
  gold: {
    emoji: "🥇",
    label: "Oro",
    bg: "from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30",
    border: "border-yellow-300 dark:border-yellow-700",
    text: "text-yellow-700 dark:text-yellow-400",
    ring: "ring-yellow-400/60",
    co2Bg: "bg-yellow-100 dark:bg-yellow-900/40",
    co2Text: "text-yellow-800 dark:text-yellow-300",
  },
  silver: {
    emoji: "🥈",
    label: "Argento",
    bg: "from-slate-50 to-zinc-50 dark:from-slate-900/40 dark:to-zinc-900/40",
    border: "border-slate-300 dark:border-slate-600",
    text: "text-slate-600 dark:text-slate-400",
    ring: "ring-slate-400/60",
    co2Bg: "bg-slate-100 dark:bg-slate-800/50",
    co2Text: "text-slate-700 dark:text-slate-300",
  },
  bronze: {
    emoji: "🥉",
    label: "Bronzo",
    bg: "from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30",
    border: "border-orange-300 dark:border-orange-700",
    text: "text-orange-700 dark:text-orange-400",
    ring: "ring-orange-400/60",
    co2Bg: "bg-orange-100 dark:bg-orange-900/40",
    co2Text: "text-orange-800 dark:text-orange-300",
  },
} as const;

function RankingCard({ r }: { r: Co2Ranking }) {
  const cfg = BADGE_CONFIG[r.badge as keyof typeof BADGE_CONFIG] ?? BADGE_CONFIG.bronze;
  return (
    <div className={`relative bg-gradient-to-br ${cfg.bg} border ${cfg.border} rounded-2xl p-5 flex gap-4 items-start shadow-sm ring-1 ${cfg.ring}`}>
      <div className="text-4xl select-none leading-none mt-0.5">{cfg.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
          {r.provincia && (
            <span className="text-xs bg-background/70 border border-border rounded-full px-2 py-0.5 text-muted-foreground font-mono">
              {r.provincia}
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-foreground mt-0.5 leading-tight truncate">
          {r.comune}
          {r.provincia ? ` (${r.provincia})` : ""}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {r.treeCount} {r.treeCount === 1 ? "pianta piantata" : "piante piantate"}
        </p>
        <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-xl ${cfg.co2Bg}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cfg.co2Text}>
            <path d="M12 22V14"/>
            <path d="M12 14C12 14 7 13 5 9C3 5 6 2 9 3C10.5 3.5 11.5 5 12 7C12.5 5 13.5 3.5 15 3C18 2 21 5 19 9C17 13 12 14 12 14Z"/>
          </svg>
          <span className={`text-sm font-bold ${cfg.co2Text}`}>{formatCo2(r.co2Kg)} CO₂/mese assorbita</span>
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
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
                <path d="M2 22C2 22 7 15 12 15C17 15 22 22 22 22"/>
                <path d="M12 15V10"/>
                <path d="M12 10C12 10 9 7 6 8C3 9 2 13 5 14C8 15 12 10 12 10Z"/>
                <path d="M12 10C12 10 15 7 18 8C21 9 22 13 19 14C16 15 12 10 12 10Z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground leading-tight">Classifica CO₂</h1>
              <p className="text-sm text-muted-foreground">I comuni che assorbono più CO₂ ogni mese</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 mb-6 flex gap-3 items-start">
          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4l3 3"/>
            </svg>
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed">
            Ogni mese calcoliamo quanta <strong className="text-foreground">CO₂ viene assorbita</strong> dalle piante piantate nel mese precedente, per ogni comune.
            Il calcolo si basa su <strong className="text-foreground">22 kg di CO₂ per pianta all'anno ÷ 12 = 1,83 kg/mese per pianta</strong>.
            La classifica viene aggiornata il <strong className="text-foreground">1° di ogni mese alle 00:01</strong> ora di Roma.{" "}
            <span className="italic">I valori sono stime indicative.</span>
          </div>
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
              La prima classifica sarà disponibile il 1° del mese prossimo, dopo che le prime piante saranno state registrate.
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
                    {formatMonth(m)}
                  </button>
                ))}
              </div>
            )}

            {selectedMonth && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-foreground">
                    {formatMonth(selectedMonth)}
                  </h2>
                  {selectedMonth === data.months[0] && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full font-medium">
                      Mese corrente
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
