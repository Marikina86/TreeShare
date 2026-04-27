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
          La presente Privacy Policy descrive come raccogliamo, utilizziamo, proteggiamo e trattiamo i tuoi dati personali in conformità al
          Regolamento (UE) 2016/679 ("GDPR").
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
                  <li>Posizione associata ai contenuti pubblicati (previo consenso)</li>
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
                  <li>Informazioni necessarie per le transazioni (gestite da provider esterni come Stripe e PayPal)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">3. Finalità del trattamento e base giuridica</h2>
            <p className="text-muted-foreground mb-4">I dati personali sono trattati per le seguenti finalità:</p>
            <div className="space-y-2">
              {[
                { purpose: "Creazione e gestione dell'account", basis: "esecuzione del contratto" },
                { purpose: "Condivisione contenuti e funzionalità social", basis: "esecuzione del contratto" },
                { purpose: "Geolocalizzazione degli alberi", basis: "consenso dell'utente" },
                { purpose: "Gestione delle adozioni e dei servizi a pagamento", basis: "esecuzione del contratto" },
                { purpose: "Invio notifiche (accesso, sicurezza, suggerimenti)", basis: "legittimo interesse / consenso" },
                { purpose: "Miglioramento della piattaforma e sicurezza", basis: "legittimo interesse" },
                { purpose: "Verifica immagini tramite AI", basis: "legittimo interesse" },
                { purpose: "Adempimenti legali e fiscali", basis: "obbligo legale" },
              ].map(({ purpose, basis }) => (
                <div key={purpose} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                  <div className="flex-1 text-muted-foreground">{purpose}</div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">{basis}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">4. Natura del conferimento dei dati</h2>
            <p className="text-muted-foreground mb-3">Il conferimento dei dati è:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-3">
              <li><strong className="text-foreground">Obbligatorio</strong> per la creazione dell'account e l'utilizzo della piattaforma</li>
              <li><strong className="text-foreground">Facoltativo</strong> per funzionalità aggiuntive (es. geolocalizzazione)</li>
            </ul>
            <p className="text-muted-foreground">Il mancato conferimento dei dati obbligatori impedisce l'utilizzo del servizio.</p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">5. Servizi di terze parti e ruoli</h2>
            <p className="text-muted-foreground mb-4">La piattaforma utilizza servizi di terze parti:</p>
            <div className="space-y-2">
              {[
                { name: "Stripe e PayPal", role: "pagamenti", type: "titolari autonomi" },
                { name: "Supabase", role: "database e autenticazione", type: "responsabile del trattamento" },
                { name: "Cloudinary", role: "gestione immagini", type: "responsabile del trattamento" },
                { name: "Google Maps / Google Earth / Street View", role: "servizi di mappa", type: "titolari autonomi" },
              ].map(({ name, role, type }) => (
                <div key={name} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">{role}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{type}</span>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground mt-4 text-xs">
              Tali soggetti trattano i dati secondo le proprie privacy policy.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">6. Trasferimento dei dati extra UE</h2>
            <p className="text-muted-foreground mb-3">
              Alcuni fornitori (es. Google, Stripe, PayPal) possono trasferire dati al di fuori dello Spazio Economico Europeo.
            </p>
            <p className="text-muted-foreground mb-3">Tali trasferimenti avvengono nel rispetto del GDPR tramite:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Clausole contrattuali standard (SCC)</li>
              <li>Decisioni di adeguatezza della Commissione Europea</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">7. Geolocalizzazione</h2>
            <p className="text-muted-foreground mb-2">
              La geolocalizzazione è attivata solo previo consenso dell'utente.
            </p>
            <p className="text-muted-foreground">
              L'utente può disattivarla in qualsiasi momento.
            </p>
          </section>

          {/* 8 — AI */}
          <section id="ai" className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground">8. Utilizzo dell'intelligenza artificiale (AI)</h2>
            </div>
            <p className="text-muted-foreground mb-3">
              La piattaforma utilizza sistemi di intelligenza artificiale per:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-3">
              <li>Verificare l'autenticità delle immagini</li>
              <li>Migliorare la sicurezza e la qualità dei contenuti</li>
            </ul>
            <p className="text-muted-foreground text-xs italic">
              Non vengono adottate decisioni automatizzate con effetti legali o significativi sull'utente.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">9. Conservazione dei dati</h2>
            <p className="text-muted-foreground mb-4">I dati personali sono conservati:</p>
            <div className="space-y-2">
              {[
                { label: "Dati account", period: "Per tutta la durata dell'account attivo" },
                { label: "Dati tecnici e log", period: "Fino a 12 mesi" },
                { label: "Dati relativi a obblighi fiscali/contabili", period: "Fino a 10 anni" },
              ].map(({ label, period }) => (
                <div key={label} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                  <div className="flex-1 text-muted-foreground font-medium text-foreground">{label}</div>
                  <div className="flex-shrink-0 text-xs text-muted-foreground text-right">{period}</div>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground mt-4 text-xs">
              Al termine, i dati saranno cancellati o anonimizzati.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">10. Condivisione dei dati</h2>
            <p className="text-muted-foreground mb-3">I dati possono essere condivisi con:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-4">
              <li>Fornitori di servizi tecnologici (vedi sezione 5)</li>
              <li>Autorità competenti (obblighi di legge)</li>
            </ul>
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4">
              <p className="font-semibold text-primary">I dati personali NON vengono venduti a terzi.</p>
            </div>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">11. Diritti dell'utente</h2>
            <p className="text-muted-foreground mb-4">L'utente può esercitare i seguenti diritti:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {[
                "Accesso ai dati",
                "Rettifica o cancellazione",
                "Limitazione o opposizione al trattamento",
                "Portabilità dei dati",
                "Revoca del consenso",
              ].map((right) => (
                <div key={right} className="bg-muted/40 rounded-xl px-4 py-3 border border-border flex items-start gap-2">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="text-primary mt-0.5 flex-shrink-0">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-muted-foreground text-xs">{right}</span>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground mb-3">
              Inoltre, l'utente ha diritto di proporre reclamo al{" "}
              <strong className="text-foreground">Garante per la Protezione dei Dati Personali</strong>.
            </p>
            <p className="text-muted-foreground">
              Per esercitare i diritti:{" "}
              <a href="mailto:treeshare@treeshareapp.com" className="text-primary hover:underline">
                treeshare@treeshareapp.com
              </a>
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">12. Sicurezza dei dati</h2>
            <p className="text-muted-foreground">
              Adottiamo misure tecniche e organizzative adeguate per proteggere i dati personali.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">13. Cookie e tecnologie simili</h2>
            <p className="text-muted-foreground mb-2">La piattaforma utilizza cookie e strumenti simili.</p>
            <p className="text-muted-foreground">Per maggiori informazioni è disponibile una Cookie Policy dedicata.</p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">14. Modifiche alla Privacy Policy</h2>
            <p className="text-muted-foreground">
              La presente Privacy Policy può essere aggiornata. Le modifiche saranno comunicate tramite la piattaforma.
            </p>
          </section>

          {/* 15 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">15. Contatti</h2>
            <p className="text-muted-foreground">
              Per informazioni:{" "}
              <a href="mailto:treeshare@treeshareapp.com" className="text-primary hover:underline">
                treeshare@treeshareapp.com
              </a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground italic mb-6">
            Utilizzando la piattaforma, l'utente dichiara di aver letto e compreso la presente Privacy Policy.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/terms" className="text-primary hover:underline">Termini e Condizioni</Link>
            <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>
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
