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
        <p className="text-sm text-muted-foreground mb-10">
          Conforme al Regolamento UE 2016/679 (GDPR)
        </p>

        <div className="space-y-10 text-sm text-foreground leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">1. Titolare del trattamento</h2>
            <div className="text-muted-foreground space-y-1">
              <p>Il Titolare del trattamento dei dati è:</p>
              <p className="font-medium text-foreground">Marica Arzu</p>
              <p>
                Email di contatto:{" "}
                <a href="mailto:treeshare@outlook.com" className="text-primary hover:underline">
                  treeshare@outlook.com
                </a>
              </p>
            </div>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">2. Tipologia di dati raccolti</h2>
            <p className="text-muted-foreground mb-3">La presente applicazione raccoglie i seguenti dati personali:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Dati identificativi (es. username, email)</li>
              <li>Dati di localizzazione (coordinate geografiche inserite dall'utente)</li>
              <li>Contenuti caricati dall'utente (foto, descrizioni degli alberi)</li>
              <li>Dati di utilizzo dell'app (log, interazioni, accessi)</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">3. Finalità del trattamento</h2>
            <p className="text-muted-foreground mb-3">I dati personali sono raccolti per le seguenti finalità:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Creazione e gestione del profilo utente</li>
              <li>Pubblicazione delle attività di piantagione alberi</li>
              <li>Visualizzazione su mappa delle coordinate inserite</li>
              <li>Interazione tra utenti (community, eventi, badge)</li>
              <li>Miglioramento del servizio e analisi statistiche</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">4. Base giuridica del trattamento</h2>
            <p className="text-muted-foreground mb-3">Il trattamento dei dati si basa su:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Consenso esplicito dell'utente</li>
              <li>Esecuzione di un servizio richiesto dall'utente</li>
              <li>Legittimo interesse del titolare per migliorare il servizio</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">5. Geolocalizzazione e coordinate</h2>
            <p className="text-muted-foreground mb-3">Le coordinate geografiche inserite dagli utenti:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Vengono pubblicate solo previo consenso esplicito</li>
              <li>Possono essere visibili ad altri utenti dell'app</li>
              <li>Possono essere utilizzate per visualizzazione tramite servizi esterni (es. mappe)</li>
            </ul>
            <p className="text-muted-foreground mt-3">L'utente può scegliere di non condividere la posizione precisa.</p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">6. Modalità di trattamento</h2>
            <p className="text-muted-foreground">
              I dati sono trattati in modo lecito, corretto e trasparente, mediante strumenti digitali e protetti da adeguate misure di sicurezza.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">7. Conservazione dei dati</h2>
            <p className="text-muted-foreground mb-3">I dati personali sono conservati:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Per il tempo necessario a fornire il servizio</li>
              <li>Fino alla cancellazione dell'account da parte dell'utente</li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">8. Condivisione dei dati</h2>
            <p className="text-muted-foreground mb-3">I dati possono essere condivisi con:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Altri utenti della piattaforma (in base alle impostazioni di privacy)</li>
              <li>Fornitori tecnici (hosting, servizi cloud)</li>
            </ul>
            <div className="mt-4 bg-primary/5 border border-primary/20 rounded-xl px-5 py-4">
              <p className="font-semibold text-primary">I dati personali NON vengono venduti a terze parti.</p>
            </div>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">9. Diritti dell'utente (GDPR)</h2>
            <p className="text-muted-foreground mb-3">L'utente ha diritto di:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {[
                "Accedere ai propri dati",
                "Richiederne la modifica o cancellazione",
                "Limitare o opporsi al trattamento",
                "Richiedere la portabilità dei dati",
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
              Le richieste possono essere inviate a:{" "}
              <a href="mailto:treeshare@outlook.com" className="text-primary hover:underline">
                treeshare@outlook.com
              </a>
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">10. Sicurezza</h2>
            <p className="text-muted-foreground">
              Il Titolare adotta misure tecniche e organizzative adeguate per proteggere i dati da accessi non autorizzati, perdita o divulgazione.
            </p>
          </section>

          {/* 11 — AI */}
          <section id="ai" className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground">11. Intelligenza Artificiale (AI)</h2>
            </div>
            <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-4">
              Informativa sull'utilizzo di sistemi di Intelligenza Artificiale
            </p>

            <div className="space-y-5 text-sm text-muted-foreground">

              <div>
                <h3 className="font-semibold text-foreground mb-1">11.1 Utilizzo di servizi di AI</h3>
                <p>L'app utilizza tecnologie di intelligenza artificiale fornite da <strong className="text-foreground">OpenAI</strong> per elaborare richieste e fornire risposte automatiche agli utenti, tra cui la verifica delle immagini caricate.</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1">11.2 Tipologia di dati trattati</h3>
                <p className="mb-2">I dati trattati dai sistemi AI possono includere:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>Contenuti inseriti volontariamente dall'utente (es. messaggi, richieste)</li>
                  <li>Immagini caricate dall'utente ai fini di verifica automatica</li>
                  <li>Dati tecnici necessari al funzionamento del servizio</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1">11.3 Finalità del trattamento AI</h3>
                <p className="mb-2">I dati sono utilizzati per:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>Verificare automaticamente che le foto caricate contengano piante o vegetali</li>
                  <li>Generare risposte tramite AI</li>
                  <li>Migliorare la qualità del servizio</li>
                  <li>Fornire assistenza automatizzata</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1">11.4 Modalità di trattamento</h3>
                <p>Le informazioni inserite e le immagini analizzate possono essere trasmesse a server esterni gestiti da OpenAI e trattate mediante sistemi automatizzati.</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1">11.5 Conservazione dei dati AI</h3>
                <p>I dati possono essere temporaneamente conservati per finalità tecniche e di sicurezza, salvo diverse indicazioni da parte di OpenAI secondo la propria policy.</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1">11.6 Trasferimento dei dati extra UE</h3>
                <p>I dati potrebbero essere trasferiti verso paesi al di fuori dello Spazio Economico Europeo (es. Stati Uniti), nel rispetto delle normative vigenti e con adeguate garanzie ai sensi del GDPR.</p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3">
                <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1 text-xs uppercase tracking-wide">⚠ Limitazioni del servizio AI</h3>
                <p className="text-amber-700 dark:text-amber-400">Le risposte generate dall'intelligenza artificiale potrebbero non essere sempre accurate o complete. L'utente è invitato a verificare le informazioni fornite.</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1">11.7 Diritti dell'utente relativi all'AI</h3>
                <p>
                  L'utente può esercitare i diritti previsti dal GDPR (accesso, cancellazione, opposizione al trattamento automatizzato) contattando:{" "}
                  <a href="mailto:treeshare@outlook.com" className="text-primary hover:underline">treeshare@outlook.com</a>
                </p>
              </div>

              <div className="bg-primary/10 rounded-xl px-4 py-3">
                <h3 className="font-semibold text-foreground mb-1">11.8 Consenso</h3>
                <p>Utilizzando l'app e caricando immagini sulla piattaforma, l'utente acconsente al trattamento dei dati secondo le modalità descritte nella presente sezione.</p>
              </div>

            </div>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">12. Modifiche alla Privacy Policy</h2>
            <p className="text-muted-foreground">
              La presente informativa può essere aggiornata. Gli utenti saranno informati in caso di modifiche rilevanti.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">13. Contatti</h2>
            <p className="text-muted-foreground">
              Per qualsiasi domanda relativa alla privacy:{" "}
              <a href="mailto:treeshare@outlook.com" className="text-primary hover:underline">
                treeshare@outlook.com
              </a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm">
          <Link href="/terms" className="text-primary hover:underline">Condizioni d'uso</Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">← Torna alla home</Link>
        </div>
      </main>

      <footer className="px-6 py-6 text-center border-t border-border text-xs text-muted-foreground">
        © {new Date().getFullYear()} TreeShare — Tutti i diritti riservati
      </footer>
    </div>
  );
}
