import { Link } from "wouter";
import { Leaf, ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/i18n";

export default function MissionPage() {
  const { lang } = useLang();
  const isIt = lang === "it";

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <ArrowLeft className="h-4 w-4" />
          {isIt ? "Torna alla home" : "Back to home"}
        </Link>

        <div className="flex flex-col items-center text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg mb-6">
            <Leaf className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            {isIt ? "La nostra missione" : "Our Mission"}
          </h1>
        </div>

        <div className="prose prose-neutral max-w-none space-y-6 text-foreground">
          <h2 className="text-2xl font-bold text-primary">Mission</h2>

          <p className="text-base leading-relaxed text-muted-foreground">
            TreeShare nasce da una convinzione semplice: ogni albero piantato può diventare un gesto
            capace di generare consapevolezza, ispirare altre persone e contribuire a un futuro più
            sostenibile.
          </p>

          <p className="text-base leading-relaxed text-muted-foreground">
            La nostra missione è promuovere la sensibilità ambientale attraverso l'azione concreta.
            Crediamo che documentare e condividere la crescita di alberi e piante aiuti a creare un
            legame più profondo con la natura e renda visibile l'impatto positivo che ognuno di noi
            può avere sul territorio.
          </p>

          <p className="text-base leading-relaxed text-muted-foreground">
            Per questo abbiamo creato una piattaforma che permette a persone, famiglie, scuole,
            associazioni e aziende di registrare le proprie piantumazioni, monitorarle nel tempo e
            contribuire a una mappa collettiva del verde. Ogni foto, ogni aggiornamento e ogni
            posizione condivisa raccontano una storia di cura, responsabilità e impegno verso
            l'ambiente.
          </p>

          <p className="text-base leading-relaxed text-muted-foreground">
            TreeShare non è solo uno strumento di monitoraggio: è una community che vuole
            trasformare piccoli gesti individuali in un movimento globale per la sostenibilità, la
            biodiversità e la tutela del pianeta.
          </p>

          <p className="text-base leading-relaxed font-medium text-foreground">
            Un albero alla volta, una storia alla volta, un futuro più verde per tutti.
          </p>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold text-base hover:opacity-90 transition-opacity shadow-md text-center"
          >
            {isIt ? "Unisciti a TreeShare" : "Join TreeShare"}
          </Link>
          <Link
            href="/"
            className="border border-border text-foreground px-8 py-3 rounded-xl font-semibold text-base hover:bg-muted transition-colors text-center"
          >
            {isIt ? "Scopri di più" : "Learn more"}
          </Link>
        </div>
      </div>
    </div>
  );
}
