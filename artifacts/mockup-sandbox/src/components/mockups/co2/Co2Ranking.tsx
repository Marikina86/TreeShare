export function Co2Ranking() {
  const rankings = [
    { rank: 1, badge: "gold",   comune: "Cuneo",   provincia: "CN", treeCount: 312, co2Kg: 1716 },
    { rank: 2, badge: "silver", comune: "Torino",  provincia: "TO", treeCount: 198, co2Kg: 1089 },
    { rank: 3, badge: "bronze", comune: "Saluzzo", provincia: "CN", treeCount: 87,  co2Kg: 478.5 },
  ];

  const BADGE_CONFIG = {
    gold: {
      rank: "1°",
      label: "Super Green",
      bg: "from-emerald-50 to-green-50",
      border: "border-emerald-400",
      text: "text-emerald-700",
      ring: "ring-emerald-400/50",
      rankBg: "bg-emerald-600",
      co2Bg: "bg-emerald-100",
      co2Text: "text-emerald-800",
      leafColor: "text-emerald-600",
    },
    silver: {
      rank: "2°",
      label: "Green",
      bg: "from-green-50 to-teal-50",
      border: "border-green-300",
      text: "text-green-700",
      ring: "ring-green-300/50",
      rankBg: "bg-green-600",
      co2Bg: "bg-green-100",
      co2Text: "text-green-800",
      leafColor: "text-green-500",
    },
    bronze: {
      rank: "3°",
      label: "Eco",
      bg: "from-teal-50 to-cyan-50",
      border: "border-teal-300",
      text: "text-teal-700",
      ring: "ring-teal-300/50",
      rankBg: "bg-teal-600",
      co2Bg: "bg-teal-100",
      co2Text: "text-teal-800",
      leafColor: "text-teal-500",
    },
  } as const;

  function formatCo2(kg: number) {
    if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
    return `${kg.toFixed(1)} kg`;
  }

  function LeafIcon({ className }: { className?: string }) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17 8C8 10 5.9 16.17 3.82 19.34L5.71 21l1-1C9 18 11 17 13 17c4 0 7-3 7-7 0-1.5-.4-2.9-1.1-4.1C18.3 6.8 17.7 7.4 17 8z" opacity="0.9"/>
        <path d="M3.82 19.34C3.28 20.21 3 21.1 3 22h1c0-.66.2-1.34.53-2L3.82 19.34z" opacity="0.6"/>
      </svg>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf8] p-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
            <path d="M2 22C2 22 7 15 12 15C17 15 22 22 22 22"/>
            <path d="M12 15V10"/>
            <path d="M12 10C12 10 9 7 6 8C3 9 2 13 5 14C8 15 12 10 12 10Z"/>
            <path d="M12 10C12 10 15 7 18 8C21 9 22 13 19 14C16 15 12 10 12 10Z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Classifica CO₂</h1>
          <p className="text-xs text-gray-500">I comuni che assorbono più CO₂ ogni trimestre</p>
        </div>
      </div>

      {/* Quarter label */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-800">Q2 (Apr - Giu) 2025</h2>
        <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
          Trimestre corrente
        </span>
      </div>

      {/* Legend badges */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
          <LeafIcon className="text-emerald-600" /> Super Green
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
          <LeafIcon className="text-green-500" /> Green
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold">
          <LeafIcon className="text-teal-500" /> Eco
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {rankings.map((r) => {
          const cfg = BADGE_CONFIG[r.badge as keyof typeof BADGE_CONFIG];
          return (
            <div
              key={r.rank}
              className={`bg-gradient-to-br ${cfg.bg} border ${cfg.border} rounded-2xl p-4 flex gap-3 items-start shadow-sm ring-1 ${cfg.ring}`}
            >
              {/* Rank pill */}
              <div className={`w-9 h-9 rounded-xl ${cfg.rankBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <span className="text-white font-bold text-sm leading-none">{cfg.rank}</span>
              </div>

              <div className="flex-1 min-w-0">
                {/* Label + province */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.co2Bg} ${cfg.text}`}>
                    <LeafIcon className={cfg.leafColor} />
                    {cfg.label}
                  </span>
                  <span className="text-xs bg-white/70 border border-gray-200 rounded-full px-2 py-0.5 text-gray-500 font-mono">
                    {r.provincia}
                  </span>
                </div>

                {/* City name */}
                <h3 className="text-base font-bold text-gray-900 mt-1 leading-tight">
                  {r.comune} ({r.provincia})
                </h3>

                {/* Tree count */}
                <p className="text-xs text-gray-500 mt-0.5">
                  {r.treeCount} piante piantate
                </p>

                {/* CO₂ chip */}
                <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-xl ${cfg.co2Bg}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cfg.co2Text}>
                    <path d="M12 22V14"/>
                    <path d="M12 14C12 14 7 13 5 9C3 5 6 2 9 3C10.5 3.5 11.5 5 12 7C12.5 5 13.5 3.5 15 3C18 2 21 5 19 9C17 13 12 14 12 14Z"/>
                  </svg>
                  <span className={`text-xs font-bold ${cfg.co2Text}`}>
                    {formatCo2(r.co2Kg)} CO₂/trim. assorbita
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA footer */}
      <div className="mt-5 bg-white/60 border border-green-100 rounded-2xl p-4 text-center">
        <p className="text-xs text-gray-500 mb-2">
          Contribuisci alla classifica del tuo comune — pianta una nuova pianta!
        </p>
        <button className="inline-flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold">
          🌱 Aggiungi una pianta
        </button>
      </div>
    </div>
  );
}
