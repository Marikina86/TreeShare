import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGetMyProfile } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { useLang } from "@/lib/i18n";
import { resolveImg } from "@/lib/imageUtils";

interface AdoptableTree {
  id: number;
  ownerId: string;
  ownerEmail: string;
  title: string;
  description: string;
  speciesName: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  productDescription: string | null;
  priceCents: number;
  durationDays: number;
  maxAdoptions: number;
  currentAdoptions: number;
  status: string;
  createdAt: string;
}

const T = {
  it: {
    title: "Adotta un albero",
    subtitle: "Sostieni un albero reale e ricevi i suoi frutti direttamente a casa.",
    empty: "Nessun albero disponibile per l'adozione al momento.",
    available: "disponibili",
    full: "Esaurito",
    adopt: "Adotta",
    duration: "Durata",
    days: "giorni",
    year: "anno",
    species: "Specie",
    perYear: "/ adozione",
    slotsLeft: "posti rimasti",
    manageBtn: "Gestisci i tuoi alberi",
    createBtn: "Aggiungi albero",
  },
  en: {
    title: "Adopt a Tree",
    subtitle: "Support a real tree and receive its fruits directly at home.",
    empty: "No trees available for adoption at the moment.",
    available: "available",
    full: "Full",
    adopt: "Adopt",
    duration: "Duration",
    days: "days",
    year: "year",
    species: "Species",
    perYear: "/ adoption",
    slotsLeft: "slots left",
    manageBtn: "Manage your trees",
    createBtn: "Add tree",
  },
};

function TreeCard({ tree, lang }: { tree: AdoptableTree; lang: "it" | "en" }) {
  const t = T[lang] ?? T.it;
  const isFull = tree.status === "full" || tree.currentAdoptions >= tree.maxAdoptions;

  return (
    <Link href={`/adopt/${tree.id}`}>
      <div className={`group bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer ${isFull ? "opacity-60" : ""}`}>
        <div className="relative aspect-square bg-muted">
          {resolveImg(tree.thumbnailUrl ?? tree.imageUrl) ? (
            <img
              src={resolveImg(tree.thumbnailUrl ?? tree.imageUrl)}
              alt={tree.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🌳</div>
          )}
          {isFull && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full">{t.full}</span>
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-foreground text-sm truncate">{tree.title}</h3>
          {tree.speciesName && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{tree.speciesName}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-primary font-bold text-sm">
              €{(tree.priceCents / 100).toFixed(2)}
              <span className="text-muted-foreground text-xs font-normal"> {t.perYear}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {tree.durationDays} {t.days}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function AdoptableTreesPage() {
  const { lang } = useLang();
  const t = T[lang as "it" | "en"] ?? T.it;
  const profile = useGetMyProfile();
  const isOrg = (profile.data as any)?.accountType === "organization";

  const treesQuery = useQuery<AdoptableTree[]>({
    queryKey: ["adoptable-trees"],
    queryFn: async () => {
      const res = await fetch("/api/adopt/trees");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 60_000,
  });

  const trees = treesQuery.data ?? [];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              🌳 {t.title}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{t.subtitle}</p>
          </div>
          {isOrg && (
            <Link href="/adopt/create">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 4v16M4 12h16" strokeLinecap="round"/>
                </svg>
                {t.createBtn}
              </button>
            </Link>
          )}
        </div>

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

        {!treesQuery.isLoading && trees.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {trees.map((tree) => (
              <TreeCard key={tree.id} tree={tree} lang={lang as "it" | "en"} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
