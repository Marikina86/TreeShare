import { Link } from "wouter";
import { User, Building2, ArrowLeft, Leaf } from "lucide-react";
import { useLang } from "@/lib/i18n";

export default function RegisterChoicePage() {
  const { lang } = useLang();

  const T = {
    it: {
      back: "Torna alla home",
      title: "Crea il tuo account",
      subtitle: "Scegli come vuoi registrarti su TreeShare",
      privateTitle: "Privato",
      privateDesc: "Sei un cittadino o un singolo appassionato di natura. Registra i tuoi alberi, condividi le piantumazioni e contribuisci alla mappa verde globale.",
      privateBtn: "Registrati come Privato",
      orgoTitle: "Ente / Organizzazione / Società",
      orgoDesc: "Sei un'azienda, un comune, un'associazione o un ente pubblico. Gestisci le tue piantumazioni istituzionali con dati fiscali verificati.",
      orgoBtn: "Registrati come Ente",
      haveAccount: "Hai già un account?",
      signIn: "Accedi",
    },
    en: {
      back: "Back to home",
      title: "Create your account",
      subtitle: "Choose how you want to register on TreeShare",
      privateTitle: "Private individual",
      privateDesc: "You are a citizen or nature enthusiast. Register your trees, share your plantings and contribute to the global green map.",
      privateBtn: "Sign up as Individual",
      orgoTitle: "Organization / Company",
      orgoDesc: "You are a company, municipality, association or public entity. Manage your institutional plantings with verified tax data.",
      orgoBtn: "Sign up as Organization",
      haveAccount: "Already have an account?",
      signIn: "Sign in",
    },
    fr: {
      back: "Retour à l'accueil",
      title: "Créer votre compte",
      subtitle: "Choisissez comment vous inscrire sur TreeShare",
      privateTitle: "Particulier",
      privateDesc: "Vous êtes un citoyen ou un passionné de nature. Enregistrez vos arbres et contribuez à la carte verte mondiale.",
      privateBtn: "S'inscrire en tant que particulier",
      orgoTitle: "Organisation / Société",
      orgoDesc: "Vous êtes une entreprise, une municipalité ou une association. Gérez vos plantations institutionnelles.",
      orgoBtn: "S'inscrire en tant qu'organisation",
      haveAccount: "Vous avez déjà un compte ?",
      signIn: "Se connecter",
    },
    pt: {
      back: "Voltar para a página inicial",
      title: "Criar a sua conta",
      subtitle: "Escolha como se registar no TreeShare",
      privateTitle: "Particular",
      privateDesc: "É um cidadão ou entusiasta da natureza. Registe as suas árvores e contribua para o mapa verde global.",
      privateBtn: "Registar como particular",
      orgoTitle: "Organização / Empresa",
      orgoDesc: "É uma empresa, município, associação ou entidade pública. Gerencie as suas plantações institucionais.",
      orgoBtn: "Registar como organização",
      haveAccount: "Já tem uma conta?",
      signIn: "Entrar",
    },
    es: {
      back: "Volver al inicio",
      title: "Crear tu cuenta",
      subtitle: "Elige cómo registrarte en TreeShare",
      privateTitle: "Particular",
      privateDesc: "Eres un ciudadano o entusiasta de la naturaleza. Registra tus árboles y contribuye al mapa verde global.",
      privateBtn: "Registrarse como particular",
      orgoTitle: "Organización / Empresa",
      orgoDesc: "Eres una empresa, municipio, asociación o entidad pública. Gestiona tus plantaciones institucionales.",
      orgoBtn: "Registrarse como organización",
      haveAccount: "¿Ya tienes una cuenta?",
      signIn: "Iniciar sesión",
    },
    ja: {
      back: "ホームに戻る",
      title: "アカウントを作成",
      subtitle: "TreeShareへの登録方法を選択してください",
      privateTitle: "個人",
      privateDesc: "自然愛好家または市民として登録。木を記録し、グローバルグリーンマップに貢献しましょう。",
      privateBtn: "個人として登録",
      orgoTitle: "組織・法人",
      orgoDesc: "企業、自治体、協会として登録。認証済み税務データで施設の植栽を管理します。",
      orgoBtn: "組織として登録",
      haveAccount: "すでにアカウントをお持ちですか？",
      signIn: "ログイン",
    },
  } as const;

  const t = T[lang as keyof typeof T] ?? T.it;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background flex flex-col">
      <div className="max-w-2xl mx-auto w-full px-4 py-8 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Link>
        </div>

        {/* Logo + Title */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <Leaf className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        {/* Choice cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {/* Privato */}
          <Link href="/register-privato" className="group block">
            <div className="h-full border-2 border-border hover:border-primary rounded-2xl p-6 transition-all duration-200 bg-background hover:shadow-lg hover:-translate-y-0.5 cursor-pointer">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-600 mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <User className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">{t.privateTitle}</h2>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{t.privateDesc}</p>
              <span className="inline-flex items-center gap-2 w-full justify-center bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl group-hover:opacity-90 transition-opacity">
                {t.privateBtn}
              </span>
            </div>
          </Link>

          {/* Ente */}
          <Link href="/register-ente" className="group block">
            <div className="h-full border-2 border-border hover:border-primary rounded-2xl p-6 transition-all duration-200 bg-background hover:shadow-lg hover:-translate-y-0.5 cursor-pointer">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-100 text-green-700 mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Building2 className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">{t.orgoTitle}</h2>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{t.orgoDesc}</p>
              <span className="inline-flex items-center gap-2 w-full justify-center border-2 border-primary text-primary text-sm font-semibold px-4 py-2.5 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                {t.orgoBtn}
              </span>
            </div>
          </Link>
        </div>

        {/* Sign in link */}
        <p className="text-center text-sm text-muted-foreground mt-auto">
          {t.haveAccount}{" "}
          <Link href="/sign-in" className="text-primary font-medium hover:underline">
            {t.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
