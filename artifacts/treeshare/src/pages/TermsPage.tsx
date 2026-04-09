import { Link } from "wouter";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border bg-card">
        <Link href="/" className="flex items-center gap-2 text-primary font-bold text-xl">
          <img src="/icon-192.png" alt="TreeShare" width="28" height="28" style={{ borderRadius: "6px", objectFit: "cover" }} />
          TreeShare
        </Link>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Torna alla home
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">Termini e Condizioni d'Uso</h1>
        <p className="text-sm text-muted-foreground mb-10">
          L'utilizzo della Piattaforma implica l'accettazione dei presenti Termini.
        </p>

        <div className="space-y-10 text-sm text-foreground leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">1. Oggetto della piattaforma</h2>
            <p className="text-muted-foreground mb-3">La presente piattaforma Treeshare consente agli utenti di:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Creare un profilo personale</li>
              <li>Caricare contenuti relativi alla piantagione di alberi (foto, descrizioni, coordinate)</li>
              <li>Visualizzare attività di altri utenti</li>
              <li>Partecipare a eventi, sfide e iniziative ambientali</li>
            </ul>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">2. Registrazione e account</h2>
            <p className="text-muted-foreground mb-3">Per utilizzare la Piattaforma è necessario creare un account.</p>
            <p className="text-muted-foreground mb-3">L'utente si impegna a:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Fornire informazioni veritiere e aggiornate</li>
              <li>Non impersonare altre persone</li>
              <li>Mantenere riservate le credenziali di accesso</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Il Titolare non è responsabile per accessi non autorizzati derivanti da negligenza dell'utente.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">3. Contenuti degli utenti</h2>
            <p className="text-muted-foreground mb-3">Gli utenti possono caricare contenuti (foto, coordinate, descrizioni).</p>
            <p className="text-muted-foreground mb-3">L'utente garantisce che:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>I contenuti sono propri o utilizzati con autorizzazione</li>
              <li>Non violano diritti di terzi</li>
              <li>Non contengono materiale illecito, offensivo o fuorviante</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Il Titolare si riserva il diritto di rimuovere contenuti non conformi.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">4. Geolocalizzazione</h2>
            <p className="text-muted-foreground mb-3">La Piattaforma consente la pubblicazione di coordinate geografiche.</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>La condivisione della posizione avviene solo previo consenso dell'utente</li>
              <li>L'utente è responsabile della scelta di rendere pubbliche le coordinate</li>
              <li>Il Titolare non è responsabile per eventuali conseguenze derivanti dalla pubblicazione della posizione</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">5. Uso corretto della Piattaforma</h2>
            <p className="text-muted-foreground mb-3">È vietato:</p>
            <div className="space-y-2">
              {[
                "Utilizzare la Piattaforma per scopi illegali o fraudolenti",
                "Caricare contenuti falsi (es. piantagioni non reali)",
                "Manipolare il sistema (badge, classifiche, eventi)",
                "Danneggiare o interferire con il funzionamento della Piattaforma",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-3">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="text-red-500 flex-shrink-0 mt-0.5">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/>
                  </svg>
                  <p className="text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">6. Proprietà intellettuale</h2>
            <p className="text-muted-foreground mb-3">
              Tutti i contenuti della Piattaforma (logo, design, software) sono di proprietà del Titolare o concessi in licenza.
            </p>
            <p className="text-muted-foreground mb-3">
              Gli utenti mantengono i diritti sui contenuti caricati, ma concedono al Titolare una licenza non esclusiva per:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Utilizzare, visualizzare e condividere tali contenuti all'interno della Piattaforma</li>
              <li>Promuovere la Piattaforma e le attività degli utenti</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">7. Limitazione di responsabilità</h2>
            <div className="bg-muted/40 border border-border rounded-xl px-5 py-4 mb-4">
              <p className="text-muted-foreground">
                La Piattaforma è fornita <strong className="text-foreground">"così com'è"</strong>.
              </p>
            </div>
            <p className="text-muted-foreground mb-2">Il Titolare non garantisce:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-4">
              <li>L'accuratezza dei contenuti pubblicati dagli utenti</li>
              <li>La disponibilità continua del servizio</li>
              <li>L'assenza di errori o interruzioni</li>
            </ul>
            <p className="text-muted-foreground mb-2">Il Titolare non è responsabile per:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Danni derivanti dall'uso della Piattaforma</li>
              <li>Comportamenti degli utenti</li>
              <li>Informazioni errate o non verificate</li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">8. Sospensione e chiusura account</h2>
            <p className="text-muted-foreground mb-3">Il Titolare può sospendere o chiudere account che:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Violano i presenti Termini</li>
              <li>Presentano comportamenti fraudolenti o abusivi</li>
            </ul>
            <p className="text-muted-foreground mt-3">L'utente può cancellare il proprio account in qualsiasi momento.</p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">9. Servizi di terze parti</h2>
            <p className="text-muted-foreground">
              La Piattaforma può integrare servizi esterni (es. mappe). L'utilizzo di tali servizi è soggetto anche ai relativi termini e condizioni.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">10. Modifiche ai Termini</h2>
            <p className="text-muted-foreground">
              Il Titolare si riserva il diritto di modificare i presenti Termini. Gli utenti saranno informati in caso di modifiche rilevanti.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">11. Legge applicabile</h2>
            <p className="text-muted-foreground">
              I presenti Termini sono regolati dalla legge italiana. Per eventuali controversie è competente il foro del luogo di residenza del Titolare, salvo diversa disposizione di legge.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">12. Contatti</h2>
            <p className="text-muted-foreground">
              Per informazioni o richieste:{" "}
              <a href="mailto:treeshare@outlook.com" className="text-primary hover:underline">
                treeshare@outlook.com
              </a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm">
          <Link href="/privacy" className="text-primary hover:underline">Informativa sulla Privacy</Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">← Torna alla home</Link>
        </div>
      </main>

      <footer className="px-6 py-6 text-center border-t border-border text-xs text-muted-foreground">
        © {new Date().getFullYear()} TreeShare — Tutti i diritti riservati
      </footer>
    </div>
  );
}
