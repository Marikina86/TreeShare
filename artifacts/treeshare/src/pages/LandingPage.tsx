import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useGetGlobalStats, useGetRecentTrees } from "@workspace/api-client-react";
import { useLang, type Lang } from "@/lib/i18n";

const LANG_OPTIONS: { value: Lang; flag: string; short: string }[] = [
  { value: "it", flag: "🇮🇹", short: "IT" },
  { value: "en", flag: "🇬🇧", short: "EN" },
  { value: "fr", flag: "🇫🇷", short: "FR" },
  { value: "pt", flag: "🇧🇷", short: "PT" },
  { value: "es", flag: "🇪🇸", short: "ES" },
  { value: "ja", flag: "🇯🇵", short: "JA" },
  { value: "zh", flag: "🇨🇳", short: "ZH" },
];

interface Planter {
  userId: string;
  username: string | null;
  photoUrl: string | null;
  city: string | null;
  country: string | null;
  treeCount: number;
}

function avatarSrc(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}

function PlantersModal({ onClose, lang }: { onClose: () => void; lang: string }) {
  const [planters, setPlanters] = useState<Planter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/top-planters?limit=30")
      .then((r) => r.json())
      .then((data) => { setPlanters(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const title = ({ it: "Chi pianta di più", en: "Top Planters", fr: "Meilleurs planteurs", pt: "Melhores plantadores", es: "Mejores plantadores", ja: "トッププランター", zh: "最佳种树人" } as Record<string,string>)[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <h2 className="font-bold text-foreground text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-3 py-2">
          {loading && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {({ it: "Caricamento...", en: "Loading...", fr: "Chargement...", pt: "Carregando...", es: "Cargando...", ja: "読み込み中..." } as Record<string,string>)[lang]}
            </div>
          )}
          {!loading && planters.filter((p) => p.treeCount > 0).map((planter, i) => {
            const src = avatarSrc(planter.photoUrl);
            const loc = [planter.city, planter.country].filter(Boolean).join(", ");
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
            return (
              <Link key={planter.userId} href={`/profile/${planter.userId}`}>
                <div className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                      {src ? (
                        <img src={src} alt={planter.username ?? ""} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary font-bold text-sm">{(planter.username ?? "?").charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    {medal && (
                      <span className="absolute -top-1 -right-1 text-xs">{medal}</span>
                    )}
                    {!medal && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-muted border border-border rounded-full flex items-center justify-center text-[9px] font-bold text-muted-foreground">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">@{planter.username ?? "—"}</div>
                    {loc && <div className="text-xs text-muted-foreground truncate">{loc}</div>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-primary">{planter.treeCount}</div>
                    <div className="text-[10px] text-muted-foreground">🌱</div>
                  </div>
                </div>
              </Link>
            );
          })}
          {!loading && planters.filter((p) => p.treeCount > 0).length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {({ it: "Nessun piantatore ancora.", en: "No planters yet.", fr: "Pas encore de planteurs.", pt: "Sem plantadores ainda.", es: "Sin plantadores aún.", ja: "まだプランターがいません。" } as Record<string,string>)[lang]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const stats = useGetGlobalStats();
  const recentTrees = useGetRecentTrees({ limit: 6 });
  const { lang, setLang, t } = useLang();
  const [showPlanters, setShowPlanters] = useState(false);

  const statsLabels = ({
    it: { trees: "Alberi piantati", planters: "Piantatori", countries: "Paesi", active: "Attivi questo mese" },
    en: { trees: "Trees planted", planters: "Planters", countries: "Countries", active: "Active this month" },
    fr: { trees: "Arbres plantés", planters: "Planteurs", countries: "Pays", active: "Actifs ce mois" },
    pt: { trees: "Árvores plantadas", planters: "Plantadores", countries: "Países", active: "Ativos este mês" },
    es: { trees: "Árboles plantados", planters: "Plantadores", countries: "Países", active: "Activos este mes" },
    ja: { trees: "植えた木", planters: "プランター", countries: "国", active: "今月のアクティブ" },
    zh: { trees: "已种树木", planters: "种树人", countries: "国家", active: "本月活跃" },
  } as Record<string, { trees: string; planters: string; countries: string; active: string }>)[lang];

  const featuresContent = ({
    it: [
      { title: "Documenta ogni pianta", desc: "Condividi foto degli alberi che pianti con specie, posizione e note. Guarda come crescono nel tempo." },
      { title: "Mappa mondiale", desc: "Vedi ogni albero su una mappa interattiva mondiale con coordinate GPS verificate nel tempo." },
      { title: "Community", desc: "Connettiti con piantatori da tutto il mondo. Segui la crescita, condividi scoperte, costruisci un pianeta più verde. Contribuisci concretamente alla riduzione del CO2." },
    ],
    en: [
      { title: "Document every tree", desc: "Share photos of trees you plant with species, location, and notes. Watch them grow over time." },
      { title: "World map", desc: "See every tree on an interactive world map with GPS-precise coordinates verified over time." },
      { title: "Community", desc: "Connect with planters around the world. Follow growth, share discoveries, build a greener planet. Contribute concretely to reducing CO2." },
    ],
    fr: [
      { title: "Documentez chaque plante", desc: "Partagez des photos des arbres que vous plantez avec espèce, position et notes. Regardez-les pousser dans le temps." },
      { title: "Carte mondiale", desc: "Voyez chaque arbre sur une carte interactive mondiale avec des coordonnées GPS vérifiées dans le temps." },
      { title: "Communauté", desc: "Connectez-vous avec des planteurs du monde entier. Suivez la croissance, partagez des découvertes, construisez une planète plus verte." },
    ],
    pt: [
      { title: "Documente cada planta", desc: "Compartilhe fotos das árvores que você planta com espécie, localização e notas. Veja como crescem ao longo do tempo." },
      { title: "Mapa mundial", desc: "Veja cada árvore em um mapa interativo mundial com coordenadas GPS verificadas ao longo do tempo." },
      { title: "Comunidade", desc: "Conecte-se com plantadores de todo o mundo. Acompanhe o crescimento, compartilhe descobertas, construa um planeta mais verde." },
    ],
    es: [
      { title: "Documenta cada planta", desc: "Comparte fotos de los árboles que plantas con especie, ubicación y notas. Mira cómo crecen con el tiempo." },
      { title: "Mapa mundial", desc: "Ve cada árbol en un mapa interativo mundial con coordenadas GPS verificadas a lo largo del tiempo." },
      { title: "Comunidad", desc: "Conéctate con plantadores de todo el mundo. Sigue el crecimiento, comparte descubrimientos, construye un planeta más verde." },
    ],
    ja: [
      { title: "すべての植物を記録", desc: "植えた木の写真を種類、位置、メモとともに共有しましょう。成長の様子を時系列で見られます。" },
      { title: "ワールドマップ", desc: "時系列で検証されたGPS座標とともに、インタラクティブな世界地図ですべての木を見ることができます。" },
      { title: "コミュニティ", desc: "世界中のプランターとつながりましょう。成長を追い、発見を共有し、より緑豊かな地球を築きましょう。" },
    ],
    zh: [
      { title: "记录每棵植物", desc: "分享您种下的树木照片，附上树种、位置和备注。见证它们随时间生长。" },
      { title: "世界地图", desc: "在互动世界地图上查看每一棵树，附有经时间验证的精准GPS坐标。" },
      { title: "社区", desc: "与全球种树人相连。跟踪生长、分享发现、共建更绿色的地球。为减少CO2做出实际贡献。" },
    ],
  } as Record<string, { title: string; desc: string }[]>)[lang];

  return (
    <div className="min-h-screen bg-background">
      {showPlanters && <PlantersModal onClose={() => setShowPlanters(false)} lang={lang} />}

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="px-6 py-4 flex items-center justify-between">
          <Link href="/mission" className="flex items-center gap-2 text-primary font-bold text-xl flex-shrink-0 hover:opacity-80 transition-opacity">
            <img src="/icon-192.png" alt="TreeShare" width="28" height="28" style={{ borderRadius: "6px", objectFit: "cover" }} />
            TreeShare
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center rounded-lg border border-border overflow-hidden">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLang(opt.value)}
                  className={`px-2.5 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1 ${
                    lang === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span>{opt.flag}</span>
                  <span>{opt.short}</span>
                </button>
              ))}
            </div>
            <Link href="/sign-in" data-testid="link-signin" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              {t.auth.signIn}
            </Link>
            <Link
              href="/register"
              data-testid="link-signup"
              className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              {t.auth.joinTreeShare}
            </Link>
          </div>
        </div>
        <div className="md:hidden px-6 pb-3 flex justify-center">
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLang(opt.value)}
                className={`px-2.5 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1 ${
                  lang === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span>{opt.flag}</span>
                <span>{opt.short}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-16 md:py-24 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <span>{t.landing.tagline}</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          {t.landing.headline1}
          <br />
          <span className="text-primary">{t.landing.headline2}</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          {t.landing.description}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            data-testid="link-hero-signup"
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold text-base hover:opacity-90 transition-opacity shadow-md"
          >
            {t.landing.startPlanting}
          </Link>
          <Link
            href="/sign-in"
            data-testid="link-hero-signin"
            className="border border-border text-foreground px-8 py-3 rounded-xl font-semibold text-base hover:bg-muted transition-colors"
          >
            {t.landing.signIn}
          </Link>
        </div>
      </section>

      {/* Stats */}
      {stats.data && stats.data.totalTrees !== undefined && statsLabels && (
        <section className="px-6 py-10 bg-card border-y border-border">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <button
              type="button"
              data-testid="stat-total-trees"
              onClick={() => setShowPlanters(true)}
              className="group cursor-pointer focus:outline-none"
            >
              <div className="text-3xl font-bold text-primary group-hover:scale-110 transition-transform">{(stats.data.totalTrees ?? 0).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground mt-1 group-hover:text-primary transition-colors">{statsLabels.trees}</div>
            </button>
            <button
              type="button"
              data-testid="stat-total-users"
              onClick={() => setShowPlanters(true)}
              className="group cursor-pointer focus:outline-none"
            >
              <div className="text-3xl font-bold text-primary group-hover:scale-110 transition-transform">{(stats.data.totalUsers ?? 0).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground mt-1 group-hover:text-primary transition-colors">{statsLabels.planters}</div>
            </button>
            <div data-testid="stat-total-countries">
              <div className="text-3xl font-bold text-primary">{stats.data.totalCountries ?? 0}</div>
              <div className="text-sm text-muted-foreground mt-1">{statsLabels.countries}</div>
            </div>
            <button
              type="button"
              data-testid="stat-recent-planters"
              onClick={() => setShowPlanters(true)}
              className="group cursor-pointer focus:outline-none"
            >
              <div className="text-3xl font-bold text-primary group-hover:scale-110 transition-transform">{stats.data.recentPlanters ?? 0}</div>
              <div className="text-sm text-muted-foreground mt-1 group-hover:text-primary transition-colors">{statsLabels.active}</div>
            </button>
          </div>
        </section>
      )}

      {/* Recent plantings */}
      {recentTrees.data && Array.isArray(recentTrees.data) && recentTrees.data.length > 0 && (
        <section className="px-6 py-12 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            {({ it: "Piantate di recente", en: "Recently planted", fr: "Récemment plantées", pt: "Plantadas recentemente", es: "Plantadas recientemente", ja: "最近植えた植物", zh: "最近种植" } as Record<string,string>)[lang]}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {recentTrees.data.slice(0, 6).map((tree) => (
              <Link key={tree.id} href={`/tree/${tree.id}`}>
                <div
                  data-testid={`card-recent-tree-${tree.id}`}
                  className="rounded-xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <img
                    src={tree.photoUrl.startsWith("/objects/") ? `/api/storage${tree.photoUrl}` : tree.photoUrl}
                    alt={tree.species ?? "Tree"}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="p-3">
                    <div className="font-medium text-sm text-foreground truncate">{tree.username}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {tree.locationName ?? tree.country ?? (({ it: "Posizione sconosciuta", en: "Unknown location", fr: "Lieu inconnu", pt: "Localização desconhecida", es: "Ubicación desconocida", ja: "不明な場所", zh: "位置未知" } as Record<string,string>)[lang])}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="px-6 py-12 bg-muted/40">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 text-center">
          {featuresContent.map((feat, i) => (
            <div key={i} className="p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                {i === 0 && (
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-primary">
                    <path d="M12 2C12 2 5 8 5 14C5 18.418 8.134 22 12 22C15.866 22 19 18.418 19 14C19 8 12 2 12 2Z"/>
                    <path d="M12 22V14" strokeLinecap="round"/>
                  </svg>
                )}
                {i === 1 && (
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-primary">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    <circle cx="12" cy="9" r="2.5"/>
                  </svg>
                )}
                {i === 2 && (
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-primary">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                )}
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feat.title}</h3>
              <p className="text-sm text-muted-foreground">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 py-8 text-center border-t border-border text-sm text-muted-foreground space-y-2">
        <p>TreeShare — {({ it: "Cresciamo insieme, un albero alla volta.", en: "Growing together, one tree at a time.", fr: "Grandissons ensemble, un arbre à la fois.", pt: "Crescendo juntos, uma árvore de cada vez.", es: "Crecemos juntos, un árbol a la vez.", ja: "一本の木から、一緒に育てよう。", zh: "共同成长，一棵树一棵树地前行。" } as Record<string, string>)[lang]}</p>
        <div className="flex items-center justify-center gap-4 text-xs">
          <Link href="/privacy" className="hover:text-primary transition-colors">
            {({ it: "Informativa sulla Privacy", en: "Privacy Policy", fr: "Politique de confidentialité", pt: "Política de Privacidade", es: "Política de Privacidad", ja: "プライバシーポリシー", zh: "隐私政策" } as Record<string, string>)[lang]}
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-primary transition-colors">
            {({ it: "Condizioni d'uso", en: "Terms of Use", fr: "Conditions d'utilisation", pt: "Termos de Uso", es: "Términos de Uso", ja: "利用規約", zh: "使用条款" } as Record<string, string>)[lang]}
          </Link>
          <span>·</span>
          <Link href="/cookies" className="hover:text-primary transition-colors">
            {({ it: "Cookie Policy", en: "Cookie Policy", fr: "Politique de cookies", pt: "Política de Cookies", es: "Política de Cookies", ja: "クッキーポリシー", zh: "Cookie政策" } as Record<string, string>)[lang]}
          </Link>
        </div>
        <p className="text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} TreeShareapp — Tutti i diritti riservati.{" "}
          È vietata la riproduzione, distribuzione o modifica senza autorizzazione.
        </p>
        <p className="text-xs">
          <a
            href="mailto:treeshare@treeshareapp.com"
            className="hover:text-primary transition-colors"
          >
            treeshare@treeshareapp.com
          </a>
        </p>
      </footer>
    </div>
  );
}
