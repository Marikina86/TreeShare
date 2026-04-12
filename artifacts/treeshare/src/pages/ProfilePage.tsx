import { useState, useRef, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useUser, useAuth } from "@clerk/react";
import {
  useGetMyProfile,
  useGetUserProfile,
  useListTrees,
  getListTreesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import TreeCard from "@/components/TreeCard";
import { useToast } from "@/hooks/use-toast";
import { useLang, type Lang } from "@/lib/i18n";
import ReportProblemButton from "@/components/ReportProblemButton";
import DonateSection from "@/components/DonateSection";
import ProfileCampaignSection from "@/components/ProfileCampaignSection";

const BADGES = [
  { min: 100, label: "Spirito delle foreste", emoji: "🌳", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { min: 50,  label: "Custode della natura",  emoji: "🌲", color: "bg-green-50 text-green-800 border-green-200" },
  { min: 25,  label: "Voce della foresta",    emoji: "🌿", color: "bg-teal-50 text-teal-800 border-teal-200" },
  { min: 10,  label: "Figlio della terra",    emoji: "🌱", color: "bg-lime-50 text-lime-800 border-lime-200" },
  { min: 1,   label: "Germoglio",             emoji: "🌾", color: "bg-yellow-50 text-yellow-800 border-yellow-200" },
];

function getBadge(treesPlanted: number) {
  return BADGES.find((b) => treesPlanted >= b.min) ?? null;
}

function photoSrc(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}

const REPORT_REASONS: { value: string; it: string; en: string; fr: string; pt: string; es: string; ja: string }[] = [
  { value: "contenuto_falso",             it: "Contenuto falso o non reale",       en: "False or fake content",           fr: "Contenu faux ou non réel",           pt: "Conteúdo falso ou irreal",        es: "Contenido falso o irreal",           ja: "虚偽または偽のコンテンツ" },
  { value: "spam",                        it: "Spam o comportamento ripetitivo",   en: "Spam or repetitive behaviour",    fr: "Spam ou comportement répétitif",     pt: "Spam ou comportamento repetitivo", es: "Spam o comportamiento repetitivo",   ja: "スパムまたは繰り返し行為" },
  { value: "comportamento_inappropriato", it: "Comportamento inappropriato",       en: "Inappropriate behaviour",         fr: "Comportement inapproprié",           pt: "Comportamento inadequado",         es: "Comportamiento inapropiado",          ja: "不適切な行動" },
  { value: "violazione_privacy",          it: "Violazione della privacy",          en: "Privacy violation",               fr: "Violation de la vie privée",         pt: "Violação de privacidade",          es: "Violación de privacidad",             ja: "プライバシー侵害" },
  { value: "altro",                       it: "Altro",                             en: "Other",                           fr: "Autre",                              pt: "Outro",                            es: "Otro",                               ja: "その他" },
];

export default function ProfilePage() {
  const params = useParams<{ userId: string }>();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { lang, setLang, t } = useLang();
  const queryClient = useQueryClient();

  const isOwnProfile = !params.userId || params.userId === user?.id;

  const myProfile = useGetMyProfile({ query: { enabled: isOwnProfile } });
  const otherProfile = useGetUserProfile(params.userId ?? "", {
    query: { enabled: !!params.userId && !isOwnProfile },
  });

  const profile = isOwnProfile ? myProfile.data : otherProfile.data;
  const isLoading = isOwnProfile ? myProfile.isLoading : otherProfile.isLoading;

  const userId = params.userId ?? user?.id ?? "";
  const trees = useListTrees(
    { userId, limit: 20 },
    { query: { enabled: !!userId, queryKey: getListTreesQueryKey({ userId, limit: 20 }) } }
  );

  // Usa il conteggio reale dalla lista alberi — più affidabile del contatore nel profilo DB
  const actualTreeCount = trees.data?.total ?? profile?.treesPlanted ?? 0;

  // Inline profile edit
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [saving, setSaving] = useState(false);

  // Photo upload state
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview);
    };
  }, [newPhotoPreview]);

  function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview);
    setNewPhotoFile(file);
    setNewPhotoPreview(URL.createObjectURL(file));
  }

  function openEditProfile() {
    setEditUsername(profile?.username ?? "");
    setEditCity((profile as any)?.city ?? "");
    setEditCountry((profile as any)?.country ?? "");
    setNewPhotoFile(null);
    setNewPhotoPreview(null);
    setShowEditProfile(true);
  }

  async function uploadProfilePhoto(file: File, token: string | null): Promise<string> {
    // 1. Request an upload URL (requires name, size, contentType)
    const urlRes = await fetch("/api/storage/uploads/request-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
    });
    if (!urlRes.ok) throw new Error("upload_url_failed");
    const { uploadURL } = await urlRes.json() as { uploadURL: string; objectPath: string };

    // 2. PUT the raw file bytes to the returned URL
    const uploadRes = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!uploadRes.ok) throw new Error("upload_failed");
    const { finalObjectPath } = await uploadRes.json() as { finalObjectPath: string };
    return finalObjectPath;
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!editUsername.trim()) return;
    setSaving(true);
    try {
      const token = await getToken();

      // Upload new photo if selected
      let resolvedPhotoUrl = profile?.photoUrl ?? null;
      if (newPhotoFile) {
        resolvedPhotoUrl = await uploadProfilePhoto(newPhotoFile, token);
      }

      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          username: editUsername.trim(),
          city: editCity.trim() || null,
          country: editCountry.trim() || null,
          photoUrl: resolvedPhotoUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "error");
      }
      await myProfile.refetch();
      queryClient.invalidateQueries();
      setShowEditProfile(false);
      setNewPhotoFile(null);
      setNewPhotoPreview(null);
      const saved: Record<string, string> = { it: "Profilo salvato", en: "Profile saved", fr: "Profil enregistré", pt: "Perfil guardado", es: "Perfil guardado", ja: "プロフィールを保存しました" };
      toast({ title: saved[lang] ?? "Profilo salvato" });
    } catch (err: any) {
      const errMsg: Record<string, string> = { it: "Errore durante il salvataggio", en: "Error while saving", fr: "Erreur lors de la sauvegarde", pt: "Erro ao guardar", es: "Error al guardar", ja: "保存エラー" };
      toast({ title: errMsg[lang] ?? t.common.error, description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  // Share / invite state
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [inviteState, setInviteState] = useState<"idle" | "copied">("idle");

  const appUrl = window.location.origin + (import.meta.env.BASE_URL ?? "/");

  const SHARE_TEXTS: Record<Lang, { shareTitle: string; shareText: string; inviteText: string; copied: string }> = {
    it: { shareTitle: "TreeShare", shareText: "Scopri TreeShare, la community per chi pianta alberi e piante 🌱", inviteText: "Ti invito su TreeShare! Documenta ogni pianta che metti nel terreno e condividila con il mondo 🌳", copied: "Link copiato!" },
    en: { shareTitle: "TreeShare", shareText: "Discover TreeShare, the community for tree and plant growers 🌱", inviteText: "I'm inviting you to TreeShare! Document every plant you put in the ground and share it with the world 🌳", copied: "Link copied!" },
    fr: { shareTitle: "TreeShare", shareText: "Découvrez TreeShare, la communauté pour les planteurs d'arbres 🌱", inviteText: "Je t'invite sur TreeShare ! Documente chaque plante que tu mets en terre et partage-la avec le monde 🌳", copied: "Lien copié !" },
    pt: { shareTitle: "TreeShare", shareText: "Descubra o TreeShare, a comunidade para quem planta árvores 🌱", inviteText: "Estou te convidando para o TreeShare! Documenta cada planta que colocas no solo e partilha com o mundo 🌳", copied: "Link copiado!" },
    es: { shareTitle: "TreeShare", shareText: "Descubre TreeShare, la comunidad para quienes plantan árboles 🌱", inviteText: "¡Te invito a TreeShare! Documenta cada planta que pones en el suelo y compártela con el mundo 🌳", copied: "¡Enlace copiado!" },
    ja: { shareTitle: "TreeShare", shareText: "TreeShareをご紹介！木や植物を植える人のためのコミュニティ 🌱", inviteText: "TreeShareに招待します！植えた植物を記録して世界と共有しましょう 🌳", copied: "リンクをコピーしました！" },
  };

  async function handleShare() {
    const ST = SHARE_TEXTS[lang];
    const data = { title: ST.shareTitle, text: ST.shareText, url: appUrl };
    if (navigator.share) {
      try { await navigator.share(data); } catch {}
    } else {
      await navigator.clipboard.writeText(appUrl);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2500);
    }
  }

  async function handleInvite() {
    const ST = SHARE_TEXTS[lang];
    const text = `${ST.inviteText}\n${appUrl}`;
    const data = { title: ST.shareTitle, text: ST.inviteText, url: appUrl };
    if (navigator.share) {
      try { await navigator.share(data); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      setInviteState("copied");
      setTimeout(() => setInviteState("idle"), 2500);
    }
  }

  // Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  async function handleReport() {
    if (!reportReason || !params.userId) return;
    setReporting(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ reportedUserId: params.userId, reason: reportReason, notes: reportNotes }),
      });
      if (res.status === 409) {
        const alreadyTitle: Record<Lang, string> = { it: "Già segnalato", en: "Already reported", fr: "Déjà signalé", pt: "Já denunciado", es: "Ya reportado", ja: "報告済み" };
        const alreadyDesc: Record<Lang, string> = { it: "Hai già segnalato questo account.", en: "You already reported this account.", fr: "Vous avez déjà signalé ce compte.", pt: "Você já denunciou esta conta.", es: "Ya has reportado esta cuenta.", ja: "このアカウントはすでに報告済みです。" };
        toast({ title: alreadyTitle[lang], description: alreadyDesc[lang] });
        setShowReportModal(false);
        return;
      }
      if (!res.ok) throw new Error();
      setReportDone(true);
    } catch {
      const errDesc: Record<Lang, string> = { it: "Impossibile inviare la segnalazione.", en: "Could not submit the report.", fr: "Impossible d'envoyer le signalement.", pt: "Não foi possível enviar a denúncia.", es: "No se pudo enviar el reporte.", ja: "報告を送信できませんでした。" };
      toast({ title: t.common.error, description: errDesc[lang], variant: "destructive" });
    } finally {
      setReporting(false);
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-6 animate-pulse">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-5 bg-muted rounded w-32" />
              <div className="h-4 bg-muted rounded w-24" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile && !isLoading) {
    return (
      <Layout>
        {isOwnProfile ? (
          <div className="text-center py-20">
            <h2 className="text-lg font-semibold text-foreground mb-2">{({ it: "Completa il tuo profilo", en: "Complete your profile", fr: "Complétez votre profil", pt: "Complete o seu perfil", es: "Completa tu perfil", ja: "プロフィールを完成させよう" } as Record<string,string>)[lang]}</h2>
            <p className="text-muted-foreground text-sm mb-4">{({ it: "Imposta username e dati del profilo.", en: "Set your username and profile details.", fr: "Définissez votre nom d'utilisateur et vos données de profil.", pt: "Defina o nome de utilizador e dados do perfil.", es: "Configura tu nombre de usuario y datos del perfil.", ja: "ユーザー名とプロフィール情報を設定してください。" } as Record<string,string>)[lang]}</p>
            <Link href="/onboarding" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity">
              {({ it: "Configura profilo", en: "Set up profile", fr: "Configurer le profil", pt: "Configurar perfil", es: "Configurar perfil", ja: "プロフィール設定" } as Record<string,string>)[lang]}
            </Link>
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">{({ it: "Utente non trovato.", en: "User not found.", fr: "Utilisateur introuvable.", pt: "Utilizador não encontrado.", es: "Usuario no encontrado.", ja: "ユーザーが見つかりません。" } as Record<string,string>)[lang]}</div>
        )}
      </Layout>
    );
  }

  const avatarSrc = photoSrc(profile?.photoUrl);

  const co2Data = (() => {
    const treeList = (trees.data as any)?.trees ?? [];
    if (!treeList.length) return { treeCount: 0, co2Kg: 0 };
    const now = Date.now();
    const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
    let totalCo2 = 0;
    for (const tree of treeList) {
      const planted = new Date(tree.plantedAt || tree.createdAt).getTime();
      const years = Math.max(0, (now - planted) / MS_PER_YEAR);
      totalCo2 += years * 22;
    }
    return { treeCount: treeList.length, co2Kg: Math.round(totalCo2 * 10) / 10 };
  })();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back button + report — only for other users' profiles */}
        {!isOwnProfile && (
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/feed")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-0.5 transition-transform">
                <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t.common.back}
            </button>
            <button
              onClick={() => { setShowReportModal(true); setReportDone(false); setReportReason(""); setReportNotes(""); }}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-lg hover:bg-destructive/10 border border-border hover:border-destructive/30"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l18 18M4 4v16l4-4h12V4H4z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {({ it: "Segnala account", en: "Report account", fr: "Signaler le compte", pt: "Denunciar conta", es: "Reportar cuenta", ja: "アカウントを報告" } as Record<string,string>)[lang]}
            </button>
          </div>
        )}

        {/* Profile header */}
        <div className="flex items-start gap-5 mb-8 p-6 bg-card border border-border rounded-2xl">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {avatarSrc ? (
              <img src={avatarSrc} alt={profile?.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary font-bold text-3xl">
                {profile?.username?.charAt(0).toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">{profile?.username}</h1>
            {(profile?.city || profile?.country) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                </svg>
                <span>{[profile?.city, profile?.country].filter(Boolean).join(", ")}</span>
              </div>
            )}
            <div className="flex items-center gap-4 mt-3">
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">{actualTreeCount}</div>
                <div className="text-xs text-muted-foreground">{t.profile.treesPlanted}</div>
              </div>
            </div>
            {(() => {
              const badge = getBadge(actualTreeCount);
              return badge ? (
                <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${badge.color}`}>
                  <span>{badge.emoji}</span>
                  <span>{badge.label}</span>
                </div>
              ) : null;
            })()}
            {isOwnProfile && (
              <div className="mt-4 space-y-3">
                {/* Email display */}
                {user?.primaryEmailAddress?.emailAddress && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span className="truncate">{user.primaryEmailAddress.emailAddress}</span>
                  </div>
                )}

                {/* Inline edit form */}
                {showEditProfile ? (
                  <form onSubmit={handleSaveProfile} className="space-y-3 bg-muted/40 border border-border rounded-xl p-4">
                    {/* Photo upload */}
                    <div className="flex flex-col items-center gap-2 pb-1">
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoFileChange}
                        disabled={saving}
                      />
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={saving}
                        className="relative group focus:outline-none"
                        title={({ it: "Cambia foto profilo", en: "Change profile photo", fr: "Changer la photo de profil", pt: "Alterar foto de perfil", es: "Cambiar foto de perfil", ja: "プロフィール写真を変更" } as Record<string,string>)[lang]}
                      >
                        <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary/30 group-hover:ring-primary transition-all bg-primary/10 flex items-center justify-center">
                          {(newPhotoPreview ?? photoSrc(profile?.photoUrl)) ? (
                            <img src={newPhotoPreview ?? photoSrc(profile?.photoUrl)!} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-primary font-bold text-2xl">
                              {editUsername.charAt(0).toUpperCase() || profile?.username?.charAt(0).toUpperCase() || "?"}
                            </span>
                          )}
                        </div>
                        <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {newPhotoFile
                          ? `✓ ${newPhotoFile.name}`
                          : (({ it: "Tocca per cambiare foto", en: "Tap to change photo", fr: "Touchez pour changer", pt: "Toque para alterar", es: "Toca para cambiar", ja: "タップして変更" } as Record<string,string>)[lang])}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        {({ it: "Username *", en: "Username *", fr: "Nom d'utilisateur *", pt: "Nome de utilizador *", es: "Nombre de usuario *", ja: "ユーザー名 *" } as Record<string,string>)[lang]}
                      </label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        required
                        maxLength={40}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          {({ it: "Città", en: "City", fr: "Ville", pt: "Cidade", es: "Ciudad", ja: "市区町村" } as Record<string,string>)[lang]}
                        </label>
                        <input
                          type="text"
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          maxLength={80}
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          {({ it: "Paese", en: "Country", fr: "Pays", pt: "País", es: "País", ja: "国" } as Record<string,string>)[lang]}
                        </label>
                        <input
                          type="text"
                          value={editCountry}
                          onChange={(e) => setEditCountry(e.target.value)}
                          maxLength={80}
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowEditProfile(false)}
                        disabled={saving}
                        className="flex-1 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {({ it: "Annulla", en: "Cancel", fr: "Annuler", pt: "Cancelar", es: "Cancelar", ja: "キャンセル" } as Record<string,string>)[lang]}
                      </button>
                      <button
                        type="submit"
                        disabled={saving || !editUsername.trim()}
                        className="flex-1 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {saving ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {({ it: "Salva", en: "Save", fr: "Enregistrer", pt: "Guardar", es: "Guardar", ja: "保存" } as Record<string,string>)[lang]}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-4 flex-wrap">
                    <button
                      type="button"
                      onClick={openEditProfile}
                      className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
                    >
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {t.profile.editProfile}
                    </button>
                  </div>
                )}

                {/* Language selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground font-medium">{t.settings.language}:</span>
                  <div className="flex items-center rounded-lg border border-border overflow-hidden">
                    {([ { value: "it" as Lang, flag: "🇮🇹", short: "IT" }, { value: "en" as Lang, flag: "🇬🇧", short: "EN" }, { value: "fr" as Lang, flag: "🇫🇷", short: "FR" }, { value: "pt" as Lang, flag: "🇧🇷", short: "PT" }, { value: "es" as Lang, flag: "🇪🇸", short: "ES" }, { value: "ja" as Lang, flag: "🇯🇵", short: "JA" } ]).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setLang(opt.value)}
                        className={`px-2 py-1 text-xs font-semibold transition-colors flex items-center gap-0.5 ${lang === opt.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                      >
                        <span>{opt.flag}</span>
                        <span className="hidden sm:inline">{opt.short}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Share & Invite buttons */}
                <div className="flex gap-2 pt-1">
                  {/* Share platform */}
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted transition-colors text-xs font-semibold text-foreground"
                  >
                    {shareState === "copied" ? (
                      <>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="text-primary">
                          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-primary">{SHARE_TEXTS[lang].copied}</span>
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" strokeLinecap="round"/>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" strokeLinecap="round"/>
                        </svg>
                        <span>{({ it: "Condividi", en: "Share", fr: "Partager", pt: "Partilhar", es: "Compartir", ja: "共有" } as Record<string,string>)[lang]}</span>
                      </>
                    )}
                  </button>

                  {/* Invite a friend */}
                  <button
                    type="button"
                    onClick={handleInvite}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors text-xs font-semibold text-primary"
                  >
                    {inviteState === "copied" ? (
                      <>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{SHARE_TEXTS[lang].copied}</span>
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14" strokeLinecap="round"/>
                          <line x1="22" y1="11" x2="16" y2="11" strokeLinecap="round"/>
                        </svg>
                        <span>{({ it: "Invita un amico", en: "Invite a friend", fr: "Inviter un ami", pt: "Convidar amigo", es: "Invitar amigo", ja: "友達を招待" } as Record<string,string>)[lang]}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Report a problem */}
                <div className="pt-1 border-t border-border">
                  <ReportProblemButton />
                </div>
              </div>
            )}
          </div>
        </div>

        {(profile as any)?.accountType === "organization" && (
          isOwnProfile ? (
            <ProfileCampaignSection
              profileUserId={profile!.clerkUserId}
              isOwnProfile={true}
            />
          ) : (
            <DonateSection
              profileUserId={profile!.clerkUserId}
              profileUsername={profile!.username}
            />
          )
        )}

        {co2Data.treeCount > 0 && (
          <div className="mb-6 p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-emerald-600 dark:text-emerald-400">
                  <path d="M12 22V8M12 8C12 8 8 4 4 6C4 6 3 10 8 12C8 12 6 6 12 2C18 6 16 12 16 12C21 10 20 6 20 6C16 4 12 8 12 8Z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                {({
                  it: "Ogni albero adulto assorbe circa 22 kg di CO\u2082 all'anno. Inizia oggi a fare la differenza.",
                  en: "Every mature tree absorbs about 22 kg of CO\u2082 per year. Start making a difference today.",
                  fr: "Chaque arbre adulte absorbe environ 22 kg de CO\u2082 par an. Commencez \u00e0 faire la diff\u00e9rence.",
                  pt: "Cada \u00e1rvore adulta absorve cerca de 22 kg de CO\u2082 por ano. Comece hoje a fazer a diferen\u00e7a.",
                  es: "Cada \u00e1rbol adulto absorbe unos 22 kg de CO\u2082 al a\u00f1o. Empieza hoy a marcar la diferencia.",
                  ja: "\u6210\u6728\u306f\u5e74\u9593\u7d0422kg\u306eCO\u2082\u3092\u5438\u53ce\u3057\u307e\u3059\u3002\u4eca\u65e5\u304b\u3089\u9055\u3044\u3092\u751f\u307f\u51fa\u3057\u307e\u3057\u3087\u3046\u3002",
                } as Record<string, string>)[lang] ?? "Ogni albero adulto assorbe circa 22 kg di CO\u2082 all'anno. Inizia oggi a fare la differenza."}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{co2Data.co2Kg} kg</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                  {({
                    it: "CO\u2082 assorbita totale",
                    en: "Total CO\u2082 absorbed",
                    fr: "CO\u2082 absorb\u00e9 total",
                    pt: "CO\u2082 absorvido total",
                    es: "CO\u2082 absorbido total",
                    ja: "\u5438\u53ce\u3057\u305fCO\u2082\u7dcf\u91cf",
                  } as Record<string, string>)[lang] ?? "CO\u2082 assorbita totale"}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{co2Data.treeCount}</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                  {({
                    it: "alberi piantati",
                    en: "trees planted",
                    fr: "arbres plant\u00e9s",
                    pt: "\u00e1rvores plantadas",
                    es: "\u00e1rboles plantados",
                    ja: "\u690d\u3048\u305f\u6728",
                  } as Record<string, string>)[lang] ?? "alberi piantati"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trees grid */}
        <div className="mb-10">
          <h2 className="font-bold text-foreground mb-4">
            {({ it: "Piante e Alberi", en: "Plants & Trees", fr: "Plantes et Arbres", pt: "Plantas e Árvores", es: "Plantas y Árboles", ja: "植物と木" } as Record<string,string>)[lang]}
            {trees.data && <span className="ml-2 text-sm font-normal text-muted-foreground">({trees.data.total})</span>}
          </h2>
          {trees.isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          )}
          {trees.data && trees.data.trees.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {isOwnProfile
                ? ({ it: "Non hai ancora piantato nessun albero.", en: "You haven't planted any trees yet.", fr: "Vous n'avez encore planté aucun arbre.", pt: "Ainda não plantou nenhuma árvore.", es: "Aún no has plantado ningún árbol.", ja: "まだ木を植えていません。" } as Record<string,string>)[lang]
                : t.profile.noTrees}
              {isOwnProfile && (
                <div className="mt-3">
                  <Link href="/post" className="text-primary font-medium hover:underline">
                    {t.profile.plantFirst}
                  </Link>
                </div>
              )}
            </div>
          )}
          {trees.data && trees.data.trees.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trees.data.trees.map((tree) => (
                <TreeCard key={tree.id} tree={tree} />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Report account modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-5">
            {reportDone ? (
              <>
                <div className="text-center py-2">
                  <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="text-green-600 dark:text-green-400">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h2 className="font-bold text-foreground text-lg mb-1">
                    {({ it: "Segnalazione inviata", en: "Report submitted", fr: "Signalement envoyé", pt: "Denúncia enviada", es: "Reporte enviado", ja: "報告を送信しました" } as Record<string,string>)[lang]}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {({ it: "Grazie per la segnalazione. Il team di moderazione la esaminerà al più presto.", en: "Thank you for your report. The moderation team will review it shortly.", fr: "Merci pour votre signalement. L'équipe de modération l'examinera bientôt.", pt: "Obrigado pela denúncia. A equipa de moderação irá analisá-la brevemente.", es: "Gracias por tu reporte. El equipo de moderación lo revisará pronto.", ja: "ご報告ありがとうございます。モデレーションチームが確認します。" } as Record<string,string>)[lang]}
                  </p>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  {t.common.close}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-amber-600 dark:text-amber-400">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="4" y1="22" x2="4" y2="15" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-base">
                      {({ it: "Segnala account", en: "Report account", fr: "Signaler le compte", pt: "Denunciar conta", es: "Reportar cuenta", ja: "アカウントを報告" } as Record<string,string>)[lang]}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      @{profile?.username}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {({ it: "Motivo della segnalazione", en: "Reason for report", fr: "Motif du signalement", pt: "Motivo da denúncia", es: "Motivo del reporte", ja: "報告の理由" } as Record<string,string>)[lang]}
                  </p>
                  <div className="space-y-2">
                    {REPORT_REASONS.map((r) => (
                      <label
                        key={r.value}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                          reportReason === r.value
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border text-muted-foreground hover:border-border/80 hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="report-reason"
                          value={r.value}
                          checked={reportReason === r.value}
                          onChange={() => setReportReason(r.value)}
                          className="accent-primary"
                        />
                        <span className="text-sm">{(r as Record<string, string>)[lang] ?? r.en}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {({ it: "Note aggiuntive (opzionale)", en: "Additional notes (optional)", fr: "Notes supplémentaires (facultatif)", pt: "Notas adicionais (opcional)", es: "Notas adicionales (opcional)", ja: "追加メモ（任意）" } as Record<string,string>)[lang]}
                  </label>
                  <textarea
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    placeholder={({ it: "Descrivi il problema...", en: "Describe the issue...", fr: "Décrivez le problème...", pt: "Descreva o problema...", es: "Describe el problema...", ja: "問題を説明してください..." } as Record<string,string>)[lang]}
                    maxLength={500}
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowReportModal(false)}
                    disabled={reporting}
                    className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={!reportReason || reporting}
                    className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-40"
                  >
                    {reporting
                      ? ({ it: "Invio...", en: "Sending...", fr: "Envoi...", pt: "Enviando...", es: "Enviando...", ja: "送信中..." } as Record<string,string>)[lang]
                      : ({ it: "Invia segnalazione", en: "Send report", fr: "Envoyer le signalement", pt: "Enviar denúncia", es: "Enviar reporte", ja: "報告を送信" } as Record<string,string>)[lang]}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </Layout>
  );
}
