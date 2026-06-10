import { Link } from "wouter";
import { Leaf, ArrowLeft } from "lucide-react";
import { useLang, type Lang } from "@/lib/i18n";

const content: Record<Lang, {
  back: string;
  title: string;
  p1: string;
  p2: string;
  p3: string;
  p4: string;
  closing: string;
  join: string;
  learn: string;
}> = {
  it: {
    back: "Torna alla home",
    title: "La nostra missione",
    p1: "TreeShare nasce da una convinzione semplice: ogni albero piantato può diventare un gesto capace di generare consapevolezza, ispirare altre persone e contribuire a un futuro più sostenibile.",
    p2: "La nostra missione è promuovere la sensibilità ambientale attraverso l'azione concreta. Crediamo che documentare e condividere la crescita di alberi e piante aiuti a creare un legame più profondo con la natura e renda visibile l'impatto positivo che ognuno di noi può avere sul territorio.",
    p3: "Per questo abbiamo creato una piattaforma che permette a persone, famiglie, scuole, associazioni e aziende di registrare le proprie piantumazioni, monitorarle nel tempo e contribuire a una mappa collettiva del verde. Ogni foto, ogni aggiornamento e ogni posizione condivisa raccontano una storia di cura, responsabilità e impegno verso l'ambiente.",
    p4: "TreeShare non è solo uno strumento di monitoraggio: è una community che vuole trasformare piccoli gesti individuali in un movimento globale per la sostenibilità, la biodiversità e la tutela del pianeta.",
    closing: "Un albero alla volta, una storia alla volta, un futuro più verde per tutti.",
    join: "Unisciti a TreeShare",
    learn: "Scopri di più",
  },
  en: {
    back: "Back to home",
    title: "Our Mission",
    p1: "TreeShare was born from a simple belief: every tree planted can become a gesture capable of raising awareness, inspiring others and contributing to a more sustainable future.",
    p2: "Our mission is to promote environmental awareness through concrete action. We believe that documenting and sharing the growth of trees and plants helps create a deeper connection with nature and makes visible the positive impact each of us can have on our surroundings.",
    p3: "That is why we built a platform that allows individuals, families, schools, associations and businesses to record their plantings, monitor them over time and contribute to a collective map of greenery. Every photo, every update and every shared location tells a story of care, responsibility and commitment to the environment.",
    p4: "TreeShare is more than a monitoring tool: it is a community that wants to transform small individual actions into a global movement for sustainability, biodiversity and the protection of our planet.",
    closing: "One tree at a time, one story at a time, a greener future for everyone.",
    join: "Join TreeShare",
    learn: "Learn more",
  },
  fr: {
    back: "Retour à l'accueil",
    title: "Notre mission",
    p1: "TreeShare est né d'une conviction simple : chaque arbre planté peut devenir un geste capable de sensibiliser, d'inspirer d'autres personnes et de contribuer à un avenir plus durable.",
    p2: "Notre mission est de promouvoir la sensibilité environnementale par l'action concrète. Nous croyons que documenter et partager la croissance des arbres et des plantes aide à créer un lien plus profond avec la nature et rend visible l'impact positif que chacun de nous peut avoir sur son territoire.",
    p3: "C'est pourquoi nous avons créé une plateforme qui permet aux particuliers, aux familles, aux écoles, aux associations et aux entreprises d'enregistrer leurs plantations, de les suivre dans le temps et de contribuer à une carte collective du vert. Chaque photo, chaque mise à jour et chaque position partagée raconte une histoire de soin, de responsabilité et d'engagement envers l'environnement.",
    p4: "TreeShare n'est pas seulement un outil de suivi : c'est une communauté qui veut transformer de petits gestes individuels en un mouvement mondial pour la durabilité, la biodiversité et la protection de la planète.",
    closing: "Un arbre à la fois, une histoire à la fois, un avenir plus vert pour tous.",
    join: "Rejoindre TreeShare",
    learn: "En savoir plus",
  },
  pt: {
    back: "Voltar ao início",
    title: "Nossa missão",
    p1: "O TreeShare nasceu de uma convicção simples: cada árvore plantada pode se tornar um gesto capaz de gerar consciência, inspirar outras pessoas e contribuir para um futuro mais sustentável.",
    p2: "Nossa missão é promover a sensibilidade ambiental por meio de ações concretas. Acreditamos que documentar e compartilhar o crescimento de árvores e plantas ajuda a criar uma ligação mais profunda com a natureza e torna visível o impacto positivo que cada um de nós pode ter no território.",
    p3: "Por isso criamos uma plataforma que permite a pessoas, famílias, escolas, associações e empresas registrar suas plantações, acompanhá-las ao longo do tempo e contribuir para um mapa coletivo do verde. Cada foto, cada atualização e cada posição compartilhada contam uma história de cuidado, responsabilidade e compromisso com o meio ambiente.",
    p4: "O TreeShare não é apenas uma ferramenta de monitoramento: é uma comunidade que quer transformar pequenos gestos individuais em um movimento global pela sustentabilidade, biodiversidade e proteção do planeta.",
    closing: "Uma árvore de cada vez, uma história de cada vez, um futuro mais verde para todos.",
    join: "Junte-se ao TreeShare",
    learn: "Saiba mais",
  },
  es: {
    back: "Volver al inicio",
    title: "Nuestra misión",
    p1: "TreeShare nació de una convicción simple: cada árbol plantado puede convertirse en un gesto capaz de generar conciencia, inspirar a otras personas y contribuir a un futuro más sostenible.",
    p2: "Nuestra misión es promover la sensibilidad ambiental a través de la acción concreta. Creemos que documentar y compartir el crecimiento de árboles y plantas ayuda a crear un vínculo más profundo con la naturaleza y hace visible el impacto positivo que cada uno de nosotros puede tener en el territorio.",
    p3: "Por eso hemos creado una plataforma que permite a personas, familias, escuelas, asociaciones y empresas registrar sus plantaciones, monitorearlas a lo largo del tiempo y contribuir a un mapa colectivo del verde. Cada foto, cada actualización y cada posición compartida cuentan una historia de cuidado, responsabilidad y compromiso con el medio ambiente.",
    p4: "TreeShare no es solo una herramienta de seguimiento: es una comunidad que quiere transformar pequeños gestos individuales en un movimiento global por la sostenibilidad, la biodiversidad y la protección del planeta.",
    closing: "Un árbol a la vez, una historia a la vez, un futuro más verde para todos.",
    join: "Únete a TreeShare",
    learn: "Descubrir más",
  },
  ja: {
    back: "ホームに戻る",
    title: "私たちのミッション",
    p1: "TreeShareはシンプルな信念から生まれました。植えられた一本一本の木が、意識を高め、人々を鼓舞し、より持続可能な未来に貢献できる行動になりうるということです。",
    p2: "私たちのミッションは、具体的な行動を通じて環境への感受性を育てることです。木や植物の成長を記録し共有することで、自然とのより深いつながりが生まれ、私たち一人ひとりが地域に与えられるポジティブな影響が可視化されると信じています。",
    p3: "そのために、個人・家族・学校・団体・企業が自分たちの植樹を記録し、経過を追跡し、緑の集合マップに貢献できるプラットフォームを作りました。すべての写真、すべての更新情報、すべての共有位置情報が、環境への配慮・責任・取り組みの物語を語ります。",
    p4: "TreeShareは単なる監視ツールではありません。個人の小さな行動を、持続可能性・生物多様性・地球保護のためのグローバルムーブメントへと変えたいコミュニティです。",
    closing: "一本の木から、一つのストーリーから、みんなのためのより緑豊かな未来へ。",
    join: "TreeShareに参加する",
    learn: "もっと見る",
  },
};

export default function MissionPage() {
  const { lang } = useLang();
  const c = content[lang] ?? content.it;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <ArrowLeft className="h-4 w-4" />
          {c.back}
        </Link>

        <div className="flex flex-col items-center text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg mb-6">
            <Leaf className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">{c.title}</h1>
        </div>

        <div className="space-y-6">
          <p className="text-base leading-relaxed text-muted-foreground">{c.p1}</p>
          <p className="text-base leading-relaxed text-muted-foreground">{c.p2}</p>
          <p className="text-base leading-relaxed text-muted-foreground">{c.p3}</p>
          <p className="text-base leading-relaxed text-muted-foreground">{c.p4}</p>
          <p className="text-base leading-relaxed font-medium text-foreground">{c.closing}</p>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold text-base hover:opacity-90 transition-opacity shadow-md text-center"
          >
            {c.join}
          </Link>
          <Link
            href="/"
            className="border border-border text-foreground px-8 py-3 rounded-xl font-semibold text-base hover:bg-muted transition-colors text-center"
          >
            {c.learn}
          </Link>
        </div>
      </div>
    </div>
  );
}
