import { Link } from "wouter";

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Ultimo aggiornamento: 20/04/2026</p>

        <p className="text-sm text-muted-foreground leading-relaxed mb-10">
          Benvenuto/a su TreeShare, una piattaforma social dedicata alla condivisione di alberi piantati e iniziative ambientali.
          La presente Privacy Policy descrive come raccogliamo, utilizziamo, proteggiamo e trattiamo i tuoi dati personali.
        </p>

        <div className="space-y-10 text-sm text-foreground leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">1. Titolare del trattamento</h2>
            <div className="text-muted-foreground space-y-1">
              <p>Il titolare del trattamento dei dati è:</p>
              <p className="font-medium text-foreground">Marica Arzu</p>
              <p>
                Email:{" "}
                <a href="mailto:treeshare@treeshareapp.com" className="text-primary hover:underline">
                  treeshare@treeshareapp.com
                </a>
              </p>
            </div>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">2. Tipologie di dati raccolti</h2>
            <p className="text-muted-foreground mb-4">Raccogliamo le seguenti categorie di dati:</p>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">2.1 Dati forniti dall'utente</h3>
                <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
                  <li>Nome e cognome</li>
                  <li>Email e credenziali di accesso</li>
                  <li>Contenuti caricati (foto degli alberi, descrizioni, campagne, eventi)</li>
                  <li>Informazioni relative all'adozione di alberi</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">2.2 Dati di geolocalizzazione</h3>
                <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
                  <li>Coordinate geografiche degli alberi condivisi</li>
                  <li>Posizione associata ai contenuti pubblicati (quando autorizzato)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">2.3 Dati tecnici</h3>
                <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
                  <li>Indirizzo IP</li>
                  <li>Informazioni sul dispositivo</li>
                  <li>Log di accesso e utilizzo</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">2.4 Dati relativi ai pagamenti</h3>
                <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
                  <li>Informazioni necessarie per transazioni (gestite tramite provider esterni come Stripe e PayPal)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">3. Finalità del trattamento</h2>
            <p className="text-muted-foreground mb-3">I dati vengono trattati per:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Creazione e gestione dell'account</li>
              <li>Condivisione di contenuti (foto, eventi, campagne)</li>
              <li>Visualizzazione della mappa degli alberi geolocalizzati</li>
              <li>Gestione dell'adozione degli alberi</li>
              <li>Invio di notifiche (accesso, consigli, attività della piattaforma)</li>
              <li>Miglioramento dei servizi e dell'esperienza utente</li>
              <li>Verifica delle immagini tramite sistemi di intelligenza artificiale</li>
              <li>Adempimento di obblighi legali</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">4. Base giuridica del trattamento</h2>
            <p className="text-muted-foreground mb-3">Il trattamento dei dati si basa su:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Consenso dell'utente</li>
              <li>Esecuzione di un contratto (utilizzo della piattaforma)</li>
              <li>Obblighi legali</li>
              <li>Legittimo interesse del titolare (sicurezza e miglioramento del servizio)</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">5. Servizi di terze parti utilizzati</h2>
            <p className="text-muted-foreground mb-3">
              Per il funzionamento della piattaforma utilizziamo i seguenti servizi:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-3">
              <li><strong className="text-foreground">Stripe</strong> – gestione dei pagamenti</li>
              <li><strong className="text-foreground">PayPal</strong> – gestione dei pagamenti</li>
              <li><strong className="text-foreground">Supabase</strong> – gestione database e autenticazione</li>
              <li><strong className="text-foreground">Cloudinary</strong> – gestione e archiviazione immagini</li>
              <li><strong className="text-foreground">Leaflet / Google Maps / Google Earth / Street View</strong> – servizi di geolocalizzazione e mappe</li>
            </ul>
            <p className="text-muted-foreground">
              Questi fornitori possono trattare dati personali secondo le proprie privacy policy.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">6. Geolocalizzazione</h2>
            <p className="text-muted-foreground mb-3">
              La piattaforma utilizza servizi di geolocalizzazione per mostrare la posizione degli alberi.
              L'utente può scegliere se condividere o meno la posizione. Tuttavia, alcune funzionalità potrebbero risultare limitate senza tale autorizzazione.
            </p>
          </section>

          {/* 7 — AI */}
          <section id="ai" className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground">7. Verifica delle immagini tramite AI</h2>
            </div>
            <p className="text-muted-foreground mb-3">
              Le immagini caricate possono essere analizzate tramite sistemi di intelligenza artificiale al fine di:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Verificare l'autenticità dei contenuti</li>
              <li>Migliorare la qualità e la sicurezza della piattaforma</li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">8. Conservazione dei dati</h2>
            <p className="text-muted-foreground mb-3">I dati personali vengono conservati per il tempo necessario a:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Fornire i servizi richiesti</li>
              <li>Adempiere obblighi legali</li>
              <li>Gestire eventuali controversie</li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">9. Condivisione dei dati</h2>
            <p className="text-muted-foreground mb-3">I dati possono essere condivisi con:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-4">
              <li>Fornitori di servizi tecnologici (vedi sezione 5)</li>
              <li>Autorità competenti (se richiesto dalla legge)</li>
            </ul>
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4">
              <p className="font-semibold text-primary">I dati personali NON vengono venduti a terzi.</p>
            </div>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">10. Diritti dell'utente</h2>
            <p className="text-muted-foreground mb-3">L'utente ha il diritto di:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {[
                "Accedere ai propri dati",
                "Richiedere la rettifica o cancellazione",
                "Limitare o opporsi al trattamento",
                "Richiedere la portabilità dei dati",
                "Revocare il consenso in qualsiasi momento",
              ].map((right) => (
                <div key={right} className="bg-muted/40 rounded-xl px-4 py-3 border border-border flex items-start gap-2">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="text-primary mt-0.5 flex-shrink-0">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-muted-foreground text-xs">{right}</span>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground">
              Per esercitare i diritti:{" "}
              <a href="mailto:treeshare@treeshareapp.com" className="text-primary hover:underline">
                treeshare@treeshareapp.com
              </a>
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">11. Sicurezza dei dati</h2>
            <p className="text-muted-foreground">
              Adottiamo misure tecniche e organizzative adeguate per proteggere i dati personali da accessi non autorizzati, perdita o distruzione.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">12. Cookie e tecnologie simili</h2>
            <p className="text-muted-foreground mb-3">La piattaforma può utilizzare cookie e strumenti simili per:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Migliorare la navigazione</li>
              <li>Analizzare l'utilizzo</li>
              <li>Personalizzare i contenuti</li>
            </ul>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">13. Modifiche alla Privacy Policy</h2>
            <p className="text-muted-foreground">
              Ci riserviamo il diritto di modificare la presente Privacy Policy. Le modifiche saranno comunicate tramite la piattaforma.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">14. Contatti</h2>
            <p className="text-muted-foreground">
              Per qualsiasi domanda relativa alla privacy:{" "}
              <a href="mailto:treeshare@treeshareapp.com" className="text-primary hover:underline">
                treeshare@treeshareapp.com
              </a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground italic mb-6">
            Nota: Utilizzando la piattaforma, l'utente dichiara di aver letto e accettato la presente Privacy Policy.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/terms" className="text-primary hover:underline">Termini e Condizioni</Link>
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">← Torna alla home</Link>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center border-t border-border text-xs text-muted-foreground">
        © {new Date().getFullYear()} TreeShare — Tutti i diritti riservati
      </footer>
    </div>
  );
}
