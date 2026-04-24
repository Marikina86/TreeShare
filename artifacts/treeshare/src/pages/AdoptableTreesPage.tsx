import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGetMyProfile } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { useLang } from "@/lib/i18n";
import { resolveImg } from "@/lib/imageUtils";
import { useAuth } from "@/lib/auth";
import { useState, useMemo } from "react";

interface AdoptableTree {
  id: number;
  ownerId: string;
  ownerEmail: string;
  ownerUsername: string | null;
  ownerPhotoUrl: string | null;
  title: string;
  description: string;
  speciesName: string | null;
  locationName: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  productDescription: string | null;
  priceCents: number;
  durationDays: number;
  maxAdoptions: number;
  currentAdoptions: number;
  status: string;
  paused: boolean;
  createdAt: string;
}

const T = {
  it: {
    title: "Adotta un albero",
    subtitle: "Sostieni un albero reale e ricevi i suoi frutti direttamente a casa.",
    empty: "Nessun albero disponibile per l'adozione al momento.",
    emptyFiltered: "Nessun risultato con questi filtri.",
    available: "disponibili",
    full: "Non disponibile",
    paused: "In pausa",
    adopt: "Adotta",
    duration: "Durata",
    days: "giorni",
    year: "anno",
    species: "Specie",
    perYear: "/ adozione",
    slotsLeft: "posti rimasti",
    manageBtn: "Gestisci i tuoi alberi",
    createBtn: "Aggiungi albero",
    filterSpeciesAll: "Tutte le specie",
    filterLocationAll: "Tutti i luoghi",
    filterLabel: "Filtra",
    adoptionsDisabled: "Le adozioni sono temporaneamente disabilitate dall'amministratore.",
    adoptionsDisabledShort: "Adozioni disabilitate",
  },
  en: {
    title: "Adopt a Tree",
    subtitle: "Support a real tree and receive its fruits directly at home.",
    empty: "No trees available for adoption at the moment.",
    emptyFiltered: "No results with these filters.",
    available: "available",
    full: "Unavailable",
    paused: "Paused",
    adopt: "Adopt",
    duration: "Duration",
    days: "days",
    year: "year",
    species: "Species",
    perYear: "/ adoption",
    slotsLeft: "slots left",
    manageBtn: "Manage your trees",
    createBtn: "Add tree",
    filterSpeciesAll: "All species",
    filterLocationAll: "All locations",
    filterLabel: "Filter",
    adoptionsDisabled: "Adoptions are temporarily disabled by the administrator.",
    adoptionsDisabledShort: "Adoptions disabled",
  },
};

function TreeCard({ tree, lang, currentUserId }: { tree: AdoptableTree; lang: "it" | "en"; currentUserId?: string | null }) {
  const t = T[lang] ?? T.it;
  const [, navigate] = useLocation();
  const isPaused = tree.paused;
  const isOwner = !!currentUserId && currentUserId === tree.ownerId;
  const blockedByPause = isPaused && !isOwner;
  const isFull = !isPaused && (tree.status === "full" || tree.currentAdoptions >= tree.maxAdoptions);
  const imgSrc = resolveImg(tree.thumbnailUrl ?? tree.imageUrl);

  const inner = (
    <div
      className={`bg-card border border-border rounded-2xl overflow-hidden shadow-sm transition-all
        ${blockedByPause ? "opacity-50 cursor-default select-none" : "group cursor-pointer hover:shadow-md"}
        ${isFull ? "opacity-60" : ""}
      `}
    >
      <div className="relative aspect-square bg-muted">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={tree.title}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-300
              ${blockedByPause ? "grayscale brightness-75 saturate-0" : "group-hover:scale-105"}
            `}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center text-4xl ${blockedByPause ? "opacity-40" : ""}`}>🌳</div>
        )}

        {isPaused && (
          <div className="absolute inset-0 bg-blue-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2">
            <span className="text-4xl">☁️</span>
            <span className="bg-slate-800/90 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide">
              {t.paused}
            </span>
          </div>
        )}

        {isFull && !isPaused && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full">{t.full}</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className={`font-semibold text-sm truncate ${blockedByPause ? "text-muted-foreground" : "text-foreground"}`}>
          {tree.title}
        </h3>
        {tree.speciesName && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{tree.speciesName}</p>
        )}
        {tree.locationName && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">📍 {tree.locationName}</p>
        )}
        {tree.ownerUsername && (
          <span
            className="block text-[11px] text-muted-foreground hover:text-primary mt-0.5 truncate transition-colors cursor-pointer"
            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${tree.ownerId}`); }}
          >
            @{tree.ownerUsername}
          </span>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className={`font-bold text-sm ${blockedByPause ? "text-muted-foreground" : "text-primary"}`}>
            €{(tree.priceCents / 100).toFixed(2)}
            <span className="text-muted-foreground text-xs font-normal"> {t.perYear}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            {tree.durationDays} {t.days}
          </span>
        </div>
      </div>
    </div>
  );

  if (blockedByPause) return <div>{inner}</div>;
  return <Link href={`/adopt/${tree.id}`}>{inner}</Link>;
}

export default function AdoptableTreesPage() {
  const { lang } = useLang();
  const t = T[lang as "it" | "en"] ?? T.it;
  const profile = useGetMyProfile();
  const isOrg = (profile.data as any)?.accountType === "organization";
  const { userId } = useAuth() as any;

  const [speciesFilter, setSpeciesFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const treesQuery = useQuery<AdoptableTree[]>({
    queryKey: ["adoptable-trees"],
    queryFn: async () => {
      const res = await fetch("/api/adopt/trees");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 60_000,
  });

  const settingsQuery = useQuery<{ adoptionsEnabled: boolean }>({
    queryKey: ["app-settings-public"],
    queryFn: async () => {
      const res = await fetch("/api/app-settings/public");
      if (!res.ok) return { adoptionsEnabled: true };
      return res.json();
    },
    staleTime: 30_000,
  });
  const adoptionsEnabled = settingsQuery.data?.adoptionsEnabled ?? true;

  const trees = treesQuery.data ?? [];

  const speciesOptions = useMemo(() => {
    const set = new Set<string>();
    trees.forEach((tree) => { if (tree.speciesName) set.add(tree.speciesName); });
    return Array.from(set).sort();
  }, [trees]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    trees.forEach((tree) => { if (tree.locationName) set.add(tree.locationName); });
    return Array.from(set).sort();
  }, [trees]);

  const filteredTrees = useMemo(() => {
    return trees.filter((tree) => {
      const matchSpecies = !speciesFilter || tree.speciesName === speciesFilter;
      const matchLocation = !locationFilter || tree.locationName === locationFilter;
      return matchSpecies && matchLocation;
    });
  }, [trees, speciesFilter, locationFilter]);

  const hasFilters = !!speciesFilter || !!locationFilter;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              🌳 {t.title}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{t.subtitle}</p>
          </div>
          {isOrg && (
            adoptionsEnabled ? (
              <Link href="/adopt/create">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 4v16M4 12h16" strokeLinecap="round"/>
                  </svg>
                  {t.createBtn}
                </button>
              </Link>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title={t.adoptionsDisabled}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium opacity-40 blur-[1px] cursor-not-allowed pointer-events-none select-none"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 4v16M4 12h16" strokeLinecap="round"/>
                  </svg>
                  {t.createBtn}
                </button>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg>
                  {t.adoptionsDisabledShort}
                </span>
              </div>
            )
          )}
        </div>

        {/* ── Filters ─────────────────────────────────────────────── */}
        {!treesQuery.isLoading && trees.length > 0 && (speciesOptions.length > 0 || locationOptions.length > 0) && (
          <div className="flex flex-col sm:flex-row gap-2 mb-5">
            {speciesOptions.length > 0 && (
              <select
                value={speciesFilter}
                onChange={(e) => setSpeciesFilter(e.target.value)}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">{t.filterSpeciesAll}</option>
                {speciesOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            {locationOptions.length > 0 && (
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">{t.filterLocationAll}</option>
                {locationOptions.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            )}
            {hasFilters && (
              <button
                type="button"
                onClick={() => { setSpeciesFilter(""); setLocationFilter(""); }}
                className="px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {treesQuery.isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!treesQuery.isLoading && trees.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-5xl mb-4">🌱</div>
            <p>{t.empty}</p>
          </div>
        )}

        {!treesQuery.isLoading && trees.length > 0 && filteredTrees.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-4xl mb-3">🔍</div>
            <p>{t.emptyFiltered}</p>
          </div>
        )}

        {!treesQuery.isLoading && filteredTrees.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredTrees.map((tree) => (
              <TreeCard key={tree.id} tree={tree} lang={lang as "it" | "en"} currentUserId={userId} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
