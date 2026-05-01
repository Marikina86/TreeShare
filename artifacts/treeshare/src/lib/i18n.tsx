import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Lang = "it" | "en" | "fr" | "pt" | "es" | "ja";

const VALID_LANGS: Lang[] = ["it", "en", "fr", "pt", "es", "ja"];

export const translations = {
  it: {
    nav: { feed: "Feed", map: "Mappa", plant: "Pianta", events: "Eventi", profile: "Profilo", alerts: "Avvisi", tips: "Consigli", adopt: "Adotta", co2: "CO₂" },
    auth: { signIn: "Accedi", signOut: "Esci", signUp: "Iscriviti", joinTreeShare: "Unisciti" },
    common: { cancel: "Annulla", delete: "Elimina", confirm: "Conferma", save: "Salva", loading: "Caricamento...", error: "Errore", back: "Torna indietro", create: "Crea", edit: "Modifica", close: "Chiudi" },
    landing: {
      tagline: "Pianta un albero. Condividi col mondo.",
      headline1: "Ogni albero piantato",
      headline2: "racconta una storia.",
      description: "TreeShare è una community dove le persone documentano ogni albero e pianta che mettono nel terreno — con posizione GPS, foto nel tempo e una mappa mondiale del nostro impatto collettivo.",
      startPlanting: "Inizia a piantare",
      signIn: "Accedi",
    },
    feed: { title: "Feed", empty: "Nessuna pianta ancora. Sii il primo a piantare!" },
    map: { title: "Mappa mondiale" },
    post: { title: "Pubblica una pianta", back: "Torna indietro" },
    profile: {
      treesPlanted: "Piante piantate",
      editProfile: "Modifica profilo",
      deleteAccount: "Elimina account",
      noTrees: "Nessuna pianta pubblicata.",
      plantFirst: "Pianta il tuo primo albero",
      dangerZone: "Zona pericolosa",
      dangerDesc: "L'eliminazione del profilo è permanente e irreversibile. Verranno cancellati il tuo account, tutte le piante, le foto e ogni dato associato.",
      deleteModal: { title: "Elimina account", desc: "Questa operazione cancellerà definitivamente il tuo profilo, tutte le piante pubblicate, le foto e ogni dato associato. Non è possibile annullare.", confirm: "Elimina tutto", deleting: "Eliminazione..." },
    },
    events: {
      title: "Eventi", subtitle: "Raduni di piantagione e incontri della community",
      create: "Crea evento", new: "Nuovo evento", upcoming: "Prossimi eventi", past: "eventi passati",
      empty: "Nessun evento in programma", emptyDesc: "Sii il primo a organizzare un raduno di piantagione!",
      join: "Parteciperò", joined: "Parteciperò", cancelJoin: "Annulla", organizer: "Sei l'organizzatore",
      participants: "partecipante", participantsPlural: "partecipanti",
      form: { title: "Titolo *", titlePlaceholder: "Es. Piantagione nel parco cittadino", description: "Descrizione", descriptionPlaceholder: "Racconta di cosa si tratta, cosa portare, ecc.", location: "Luogo *", locationPlaceholder: "Es. Parco Sempione, Milano", date: "Data *", time: "Orario *" },
    },
    settings: {
      title: "Impostazioni", language: "Lingua", languageDesc: "Scegli la lingua dell'applicazione",
      italian: "Italiano", english: "English",
      profile: "Profilo", editProfile: "Modifica profilo", editProfileDesc: "Cambia username, foto e posizione",
      account: "Account", deleteAccount: "Elimina account", deleteAccountDesc: "Elimina permanentemente il tuo account e tutti i dati",
      signOut: "Esci dall'account", signOutDesc: "Disconnettiti da TreeShare", appearance: "Aspetto",
    },
    logout: { title: "Uscire dall'account?", desc: "Verrai disconnesso da TreeShare. Potrai accedere di nuovo in qualsiasi momento.", confirm: "Esci", confirming: "Uscita..." },
  },

  en: {
    nav: { feed: "Feed", map: "Map", plant: "Plant", events: "Events", profile: "Profile", alerts: "Alerts", tips: "Tips", adopt: "Adopt", co2: "CO₂" },
    auth: { signIn: "Sign in", signOut: "Sign out", signUp: "Sign up", joinTreeShare: "Join TreeShare" },
    common: { cancel: "Cancel", delete: "Delete", confirm: "Confirm", save: "Save", loading: "Loading...", error: "Error", back: "Go back", create: "Create", edit: "Edit", close: "Close" },
    landing: {
      tagline: "Plant a tree. Share with the world.",
      headline1: "Every tree planted",
      headline2: "tells a story.",
      description: "TreeShare is a community where people document every tree and plant they put in the ground — with GPS-precise location, photos over time, and a world map showing our collective impact.",
      startPlanting: "Start planting",
      signIn: "Sign in",
    },
    feed: { title: "Feed", empty: "No plants yet. Be the first to plant!" },
    map: { title: "World Map" },
    post: { title: "Publish a plant", back: "Go back" },
    profile: {
      treesPlanted: "Plants planted",
      editProfile: "Edit profile",
      deleteAccount: "Delete account",
      noTrees: "No plants published.",
      plantFirst: "Plant your first tree",
      dangerZone: "Danger zone",
      dangerDesc: "Deleting your profile is permanent and irreversible. Your account, all plants, photos and associated data will be deleted.",
      deleteModal: { title: "Delete account", desc: "This will permanently delete your profile, all published plants, photos and every associated piece of data. This cannot be undone.", confirm: "Delete everything", deleting: "Deleting..." },
    },
    events: {
      title: "Events", subtitle: "Planting gatherings and community meetups",
      create: "Create event", new: "New event", upcoming: "Upcoming events", past: "past events",
      empty: "No events scheduled", emptyDesc: "Be the first to organise a planting meetup!",
      join: "I'll attend", joined: "I'll attend", cancelJoin: "Cancel", organizer: "You are the organiser",
      participants: "participant", participantsPlural: "participants",
      form: { title: "Title *", titlePlaceholder: "E.g. City park planting day", description: "Description", descriptionPlaceholder: "Tell us what it's about, what to bring, etc.", location: "Location *", locationPlaceholder: "E.g. Central Park, New York", date: "Date *", time: "Time *" },
    },
    settings: {
      title: "Settings", language: "Language", languageDesc: "Choose the app language",
      italian: "Italiano", english: "English",
      profile: "Profile", editProfile: "Edit profile", editProfileDesc: "Change username, photo and location",
      account: "Account", deleteAccount: "Delete account", deleteAccountDesc: "Permanently delete your account and all data",
      signOut: "Sign out", signOutDesc: "Disconnect from TreeShare", appearance: "Appearance",
    },
    logout: { title: "Sign out?", desc: "You will be disconnected from TreeShare. You can sign back in at any time.", confirm: "Sign out", confirming: "Signing out..." },
  },

  fr: {
    nav: { feed: "Fil", map: "Carte", plant: "Planter", events: "Événements", profile: "Profil", alerts: "Alertes", tips: "Conseils", adopt: "Adopter", co2: "CO₂" },
    auth: { signIn: "Se connecter", signOut: "Se déconnecter", signUp: "S'inscrire", joinTreeShare: "Rejoindre" },
    common: { cancel: "Annuler", delete: "Supprimer", confirm: "Confirmer", save: "Enregistrer", loading: "Chargement...", error: "Erreur", back: "Retour", create: "Créer", edit: "Modifier", close: "Fermer" },
    landing: {
      tagline: "Plantez un arbre. Partagez avec le monde.",
      headline1: "Chaque arbre planté",
      headline2: "raconte une histoire.",
      description: "TreeShare est une communauté où les gens documentent chaque arbre et plante qu'ils mettent en terre — avec position GPS, photos dans le temps et une carte mondiale de notre impact collectif.",
      startPlanting: "Commencer à planter",
      signIn: "Se connecter",
    },
    feed: { title: "Fil", empty: "Aucune plante encore. Soyez le premier à planter !" },
    map: { title: "Carte mondiale" },
    post: { title: "Publier une plante", back: "Retour" },
    profile: {
      treesPlanted: "Plantes plantées",
      editProfile: "Modifier le profil",
      deleteAccount: "Supprimer le compte",
      noTrees: "Aucune plante publiée.",
      plantFirst: "Plantez votre premier arbre",
      dangerZone: "Zone dangereuse",
      dangerDesc: "La suppression du profil est permanente et irréversible. Votre compte, toutes vos plantes, photos et données associées seront supprimés.",
      deleteModal: { title: "Supprimer le compte", desc: "Cette opération supprimera définitivement votre profil, toutes les plantes publiées, les photos et toutes les données associées. Impossible d'annuler.", confirm: "Tout supprimer", deleting: "Suppression..." },
    },
    events: {
      title: "Événements", subtitle: "Rassemblements de plantation et rencontres",
      create: "Créer un événement", new: "Nouvel événement", upcoming: "Prochains événements", past: "événements passés",
      empty: "Aucun événement prévu", emptyDesc: "Soyez le premier à organiser un rassemblement de plantation !",
      join: "Je participerai", joined: "Je participerai", cancelJoin: "Annuler", organizer: "Vous êtes l'organisateur",
      participants: "participant", participantsPlural: "participants",
      form: { title: "Titre *", titlePlaceholder: "Ex. Journée de plantation au parc", description: "Description", descriptionPlaceholder: "Décrivez l'événement, ce qu'il faut apporter, etc.", location: "Lieu *", locationPlaceholder: "Ex. Parc de la Villette, Paris", date: "Date *", time: "Heure *" },
    },
    settings: {
      title: "Paramètres", language: "Langue", languageDesc: "Choisissez la langue de l'application",
      italian: "Italiano", english: "English",
      profile: "Profil", editProfile: "Modifier le profil", editProfileDesc: "Changer le nom d'utilisateur, la photo et la localisation",
      account: "Compte", deleteAccount: "Supprimer le compte", deleteAccountDesc: "Supprimer définitivement votre compte et toutes les données",
      signOut: "Se déconnecter", signOutDesc: "Se déconnecter de TreeShare", appearance: "Apparence",
    },
    logout: { title: "Se déconnecter ?", desc: "Vous serez déconnecté de TreeShare. Vous pourrez vous reconnecter à tout moment.", confirm: "Se déconnecter", confirming: "Déconnexion..." },
  },

  pt: {
    nav: { feed: "Feed", map: "Mapa", plant: "Plantar", events: "Eventos", profile: "Perfil", alerts: "Avisos", tips: "Dicas", adopt: "Adotar", co2: "CO₂" },
    auth: { signIn: "Entrar", signOut: "Sair", signUp: "Registrar", joinTreeShare: "Participar" },
    common: { cancel: "Cancelar", delete: "Excluir", confirm: "Confirmar", save: "Salvar", loading: "Carregando...", error: "Erro", back: "Voltar", create: "Criar", edit: "Editar", close: "Fechar" },
    landing: {
      tagline: "Plante uma árvore. Compartilhe com o mundo.",
      headline1: "Cada árvore plantada",
      headline2: "conta uma história.",
      description: "TreeShare é uma comunidade onde as pessoas documentam cada árvore e planta que colocam no solo — com localização GPS, fotos ao longo do tempo e um mapa mundial do nosso impacto coletivo.",
      startPlanting: "Começar a plantar",
      signIn: "Entrar",
    },
    feed: { title: "Feed", empty: "Nenhuma planta ainda. Seja o primeiro a plantar!" },
    map: { title: "Mapa mundial" },
    post: { title: "Publicar uma planta", back: "Voltar" },
    profile: {
      treesPlanted: "Plantas plantadas",
      editProfile: "Editar perfil",
      deleteAccount: "Excluir conta",
      noTrees: "Nenhuma planta publicada.",
      plantFirst: "Plante sua primeira árvore",
      dangerZone: "Zona de perigo",
      dangerDesc: "A exclusão do perfil é permanente e irreversível. Sua conta, todas as plantas, fotos e dados associados serão excluídos.",
      deleteModal: { title: "Excluir conta", desc: "Esta operação excluirá definitivamente seu perfil, todas as plantas publicadas, fotos e todos os dados associados. Não é possível desfazer.", confirm: "Excluir tudo", deleting: "Excluindo..." },
    },
    events: {
      title: "Eventos", subtitle: "Encontros de plantio e reuniões da comunidade",
      create: "Criar evento", new: "Novo evento", upcoming: "Próximos eventos", past: "eventos passados",
      empty: "Nenhum evento programado", emptyDesc: "Seja o primeiro a organizar um encontro de plantio!",
      join: "Participarei", joined: "Participarei", cancelJoin: "Cancelar", organizer: "Você é o organizador",
      participants: "participante", participantsPlural: "participantes",
      form: { title: "Título *", titlePlaceholder: "Ex. Plantio no parque da cidade", description: "Descrição", descriptionPlaceholder: "Conte sobre o evento, o que trazer, etc.", location: "Local *", locationPlaceholder: "Ex. Parque Ibirapuera, São Paulo", date: "Data *", time: "Horário *" },
    },
    settings: {
      title: "Configurações", language: "Idioma", languageDesc: "Escolha o idioma do aplicativo",
      italian: "Italiano", english: "English",
      profile: "Perfil", editProfile: "Editar perfil", editProfileDesc: "Alterar nome de usuário, foto e localização",
      account: "Conta", deleteAccount: "Excluir conta", deleteAccountDesc: "Excluir permanentemente sua conta e todos os dados",
      signOut: "Sair da conta", signOutDesc: "Desconectar do TreeShare", appearance: "Aparência",
    },
    logout: { title: "Sair da conta?", desc: "Você será desconectado do TreeShare. Pode entrar novamente a qualquer momento.", confirm: "Sair", confirming: "Saindo..." },
  },

  es: {
    nav: { feed: "Feed", map: "Mapa", plant: "Plantar", events: "Eventos", profile: "Perfil", alerts: "Avisos", tips: "Consejos", adopt: "Adoptar", co2: "CO₂" },
    auth: { signIn: "Iniciar sesión", signOut: "Cerrar sesión", signUp: "Registrarse", joinTreeShare: "Unirse" },
    common: { cancel: "Cancelar", delete: "Eliminar", confirm: "Confirmar", save: "Guardar", loading: "Cargando...", error: "Error", back: "Volver", create: "Crear", edit: "Editar", close: "Cerrar" },
    landing: {
      tagline: "Planta un árbol. Comparte con el mundo.",
      headline1: "Cada árbol plantado",
      headline2: "cuenta una historia.",
      description: "TreeShare es una comunidad donde las personas documentan cada árbol y planta que ponen en el suelo — con ubicación GPS, fotos a lo largo del tiempo y un mapa mundial de nuestro impacto colectivo.",
      startPlanting: "Empezar a plantar",
      signIn: "Iniciar sesión",
    },
    feed: { title: "Feed", empty: "Aún no hay plantas. ¡Sé el primero en plantar!" },
    map: { title: "Mapa mundial" },
    post: { title: "Publicar una planta", back: "Volver" },
    profile: {
      treesPlanted: "Plantas plantadas",
      editProfile: "Editar perfil",
      deleteAccount: "Eliminar cuenta",
      noTrees: "Ninguna planta publicada.",
      plantFirst: "Planta tu primer árbol",
      dangerZone: "Zona de peligro",
      dangerDesc: "La eliminación del perfil es permanente e irreversible. Se eliminarán tu cuenta, todas las plantas, fotos y datos asociados.",
      deleteModal: { title: "Eliminar cuenta", desc: "Esta operación eliminará definitivamente tu perfil, todas las plantas publicadas, fotos y todos los datos asociados. No se puede deshacer.", confirm: "Eliminar todo", deleting: "Eliminando..." },
    },
    events: {
      title: "Eventos", subtitle: "Encuentros de plantación y reuniones de la comunidad",
      create: "Crear evento", new: "Nuevo evento", upcoming: "Próximos eventos", past: "eventos pasados",
      empty: "Ningún evento programado", emptyDesc: "¡Sé el primero en organizar un encuentro de plantación!",
      join: "Asistiré", joined: "Asistiré", cancelJoin: "Cancelar", organizer: "Eres el organizador",
      participants: "participante", participantsPlural: "participantes",
      form: { title: "Título *", titlePlaceholder: "Ej. Plantación en el parque de la ciudad", description: "Descripción", descriptionPlaceholder: "Cuéntanos de qué se trata, qué traer, etc.", location: "Lugar *", locationPlaceholder: "Ej. Parque del Retiro, Madrid", date: "Fecha *", time: "Hora *" },
    },
    settings: {
      title: "Configuración", language: "Idioma", languageDesc: "Elige el idioma de la aplicación",
      italian: "Italiano", english: "English",
      profile: "Perfil", editProfile: "Editar perfil", editProfileDesc: "Cambiar nombre de usuario, foto y ubicación",
      account: "Cuenta", deleteAccount: "Eliminar cuenta", deleteAccountDesc: "Eliminar permanentemente tu cuenta y todos los datos",
      signOut: "Cerrar sesión", signOutDesc: "Desconectarse de TreeShare", appearance: "Apariencia",
    },
    logout: { title: "¿Cerrar sesión?", desc: "Serás desconectado de TreeShare. Puedes volver a iniciar sesión en cualquier momento.", confirm: "Cerrar sesión", confirming: "Cerrando sesión..." },
  },

  ja: {
    nav: { feed: "フィード", map: "マップ", plant: "植える", events: "イベント", profile: "プロフィール", alerts: "お知らせ", tips: "ヒント", adopt: "養子", co2: "CO₂" },
    auth: { signIn: "ログイン", signOut: "ログアウト", signUp: "登録", joinTreeShare: "参加する" },
    common: { cancel: "キャンセル", delete: "削除", confirm: "確認", save: "保存", loading: "読み込み中...", error: "エラー", back: "戻る", create: "作成", edit: "編集", close: "閉じる" },
    landing: {
      tagline: "木を植えよう。世界とシェアしよう。",
      headline1: "植えられた木ひとつひとつが",
      headline2: "物語を語る。",
      description: "TreeShareは、地面に植えた木や植物を記録するコミュニティです — GPS位置情報、経年写真、そして私たちの集合的な影響を示す世界地図とともに。",
      startPlanting: "植え始める",
      signIn: "ログイン",
    },
    feed: { title: "フィード", empty: "まだ植物がありません。最初に植えてみましょう！" },
    map: { title: "ワールドマップ" },
    post: { title: "植物を投稿", back: "戻る" },
    profile: {
      treesPlanted: "植えた植物",
      editProfile: "プロフィール編集",
      deleteAccount: "アカウント削除",
      noTrees: "投稿された植物はありません。",
      plantFirst: "最初の木を植えよう",
      dangerZone: "危険ゾーン",
      dangerDesc: "プロフィールの削除は永久的かつ不可逆的です。アカウント、すべての植物、写真および関連データが削除されます。",
      deleteModal: { title: "アカウント削除", desc: "この操作によりプロフィール、投稿した植物、写真およびすべての関連データが完全に削除されます。元に戻すことはできません。", confirm: "すべて削除", deleting: "削除中..." },
    },
    events: {
      title: "イベント", subtitle: "植樹集会とコミュニティミーティング",
      create: "イベント作成", new: "新しいイベント", upcoming: "今後のイベント", past: "過去のイベント",
      empty: "イベントなし", emptyDesc: "最初の植樹イベントを企画しましょう！",
      join: "参加します", joined: "参加します", cancelJoin: "キャンセル", organizer: "あなたは主催者です",
      participants: "参加者", participantsPlural: "参加者",
      form: { title: "タイトル *", titlePlaceholder: "例：公園での植樹活動", description: "説明", descriptionPlaceholder: "内容、持ち物などを教えてください。", location: "場所 *", locationPlaceholder: "例：代々木公園、東京", date: "日付 *", time: "時間 *" },
    },
    settings: {
      title: "設定", language: "言語", languageDesc: "アプリの言語を選択してください",
      italian: "Italiano", english: "English",
      profile: "プロフィール", editProfile: "プロフィール編集", editProfileDesc: "ユーザー名、写真、位置情報を変更",
      account: "アカウント", deleteAccount: "アカウント削除", deleteAccountDesc: "アカウントとすべてのデータを完全に削除",
      signOut: "ログアウト", signOutDesc: "TreeShareからログアウト", appearance: "外観",
    },
    logout: { title: "ログアウトしますか？", desc: "TreeShareからログアウトします。いつでも再ログインできます。", confirm: "ログアウト", confirming: "ログアウト中..." },
  },
} as const;

export type Translations = typeof translations.it;

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "it",
  setLang: () => {},
  t: translations.it,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("treeshare_lang");
    if (stored && VALID_LANGS.includes(stored as Lang)) return stored as Lang;
    const browser = navigator.language.slice(0, 2).toLowerCase();
    if (browser === "fr") return "fr";
    if (browser === "pt") return "pt";
    if (browser === "es") return "es";
    if (browser === "ja") return "ja";
    if (browser === "en") return "en";
    return "it";
  });

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("treeshare_lang", l);
  }

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
