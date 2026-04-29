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
        <h1 className="text-3xl font-bold text-foreground mb-2">Termini e Condizioni di Utilizzo</h1>
        <p className="text-sm text-muted-foreground mb-10">Ultimo aggiornamento: 28/04/2026</p>

        <p className="text-sm text-muted-foreground leading-relaxed mb-10">
          Benvenuto/a su TreeShare, una piattaforma social dedicata alla condivisione di alberi piantati, iniziative ambientali e attività legate alla sostenibilità.{" "}
          L'utilizzo della piattaforma è soggetto ai presenti Termini e Condizioni ("Termini"). Utilizzando il servizio, accetti integralmente quanto segue.
        </p>

        <div className="space-y-10 text-sm text-foreground leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">1. Oggetto del servizio</h2>
            <p className="text-muted-foreground mb-3">La piattaforma consente agli utenti di:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Creare un account personale</li>
              <li>Condividere foto e informazioni relative agli alberi piantati</li>
              <li>Visualizzare alberi su mappa geolocalizzata</li>
              <li>Partecipare e condividere eventi ambientali</li>
              <li>Accedere a un marketplace per servizi, prodotti e iniziative ambientali</li>
              <li>Promuovere e aderire a campagne (secondo le condizioni di cui all'art. 10)</li>
              <li>Adottare alberi (secondo le condizioni di cui all'art. 11)</li>
              <li>Ricevere notifiche (accessi, consigli, aggiornamenti)</li>
            </ul>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">2. Requisiti di età</h2>
            <p className="text-muted-foreground mb-2">
              L'utilizzo della piattaforma è consentito solo a utenti che abbiano compiuto almeno <strong className="text-foreground">18 anni</strong>.
            </p>
            <p className="text-muted-foreground">
              Registrandosi, l'utente dichiara di possedere tale requisito.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">3. Registrazione e account</h2>
            <p className="text-muted-foreground mb-3">Per utilizzare alcune funzionalità è necessario registrarsi.</p>
            <p className="text-muted-foreground mb-3">L'utente si impegna a:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-3">
              <li>Fornire dati veritieri e aggiornati</li>
              <li>Mantenere riservate le credenziali</li>
              <li>Non condividere l'account con terzi</li>
            </ul>
            <p className="text-muted-foreground">
              L'utente è responsabile di tutte le attività effettuate tramite il proprio account.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">4. Utilizzo della piattaforma</h2>
            <p className="text-muted-foreground mb-3">L'utente si impegna a utilizzare la piattaforma in modo lecito e rispettoso.</p>
            <p className="text-muted-foreground mb-3">È vietato:</p>
            <div className="space-y-2">
              {[
                "Pubblicare contenuti falsi, ingannevoli o non autentici",
                "Caricare contenuti offensivi, illegali o dannosi",
                "Violare diritti di terzi (copyright, privacy, ecc.)",
                "Utilizzare la piattaforma per scopi fraudolenti",
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

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">5. Contenuti degli utenti</h2>
            <p className="text-muted-foreground mb-3">
              L'utente mantiene la titolarità dei contenuti pubblicati sulla piattaforma.
            </p>
            <p className="text-muted-foreground mb-3">
              Con il caricamento, concede a TreeShare una <strong className="text-foreground">licenza non esclusiva</strong>, gratuita e globale per visualizzare i contenuti sulla piattaforma e per consentirne la condivisione tramite le funzionalità disponibili.
            </p>
            <p className="text-muted-foreground mb-3">
              L'utente accetta che i propri contenuti e alcune informazioni associate (es. nome, posizione dell'albero) possano essere <strong className="text-foreground">visibili ad altri utenti della piattaforma</strong> secondo le impostazioni di visibilità scelte. I contenuti pubblicati in modalità pubblica sono accessibili a tutti gli utenti registrati.
            </p>
            <p className="text-muted-foreground">
              TreeShare può rimuovere contenuti, anche senza preavviso, qualora ritenuti non conformi ai presenti Termini.
            </p>
          </section>

          {/* 6 — NEW */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">6. Condivisione su servizi esterni e responsabilità</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-foreground mb-1">Condivisione su piattaforme di terze parti</h3>
                <p className="text-muted-foreground">
                  La piattaforma consente la condivisione di contenuti su servizi di terze parti, tra cui a titolo esemplificativo Facebook e altri social network. Tale condivisione è effettuata <strong className="text-foreground">esclusivamente su iniziativa e richiesta dell'utente</strong>.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-1">Responsabilità dell'utente nella condivisione</h3>
                <p className="text-muted-foreground">
                  L'utente è il <strong className="text-foreground">solo responsabile</strong> dei contenuti condivisi, inclusa la loro pubblicazione su piattaforme esterne. L'utente garantisce di disporre di tutti i diritti necessari per tale utilizzo, ivi inclusi i diritti d'autore e i diritti sull'immagine delle persone eventualmente ritratte.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-1">Servizi di terze parti</h3>
                <p className="text-muted-foreground">
                  L'utilizzo di piattaforme esterne è regolato esclusivamente dai termini di servizio e dalle politiche dei rispettivi fornitori, inclusa Meta Platforms Inc. TreeShare non è responsabile per il funzionamento, i contenuti o le politiche di tali servizi.
                </p>
              </div>

              <div className="bg-muted/40 border border-border rounded-xl px-5 py-4">
                <h3 className="font-medium text-foreground mb-1">Limitazione di responsabilità</h3>
                <p className="text-muted-foreground">
                  TreeShare non è responsabile per eventuali utilizzi impropri dei contenuti da parte degli utenti o di terze parti, né per violazioni di diritti di proprietà intellettuale, diritti d'immagine o qualsiasi altro diritto derivanti dalla condivisione dei contenuti su piattaforme esterne.
                </p>
              </div>
            </div>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">7. Verifica dei contenuti (AI)</h2>
            <p className="text-muted-foreground">
              La piattaforma può utilizzare sistemi di intelligenza artificiale per verificare autenticità e conformità dei contenuti.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">8. Geolocalizzazione</h2>
            <p className="text-muted-foreground">
              Alcune funzionalità utilizzano dati di geolocalizzazione. L'utente è responsabile della correttezza dei dati inseriti.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">9. Pagamenti e servizi di terze parti</h2>
            <p className="text-muted-foreground mb-3">
              I pagamenti sono gestiti da provider esterni (es. Stripe, PayPal). La piattaforma può avvalersi di servizi forniti da terze parti per il corretto funzionamento del servizio, inclusi strumenti di pagamento, logistica e marketing.
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>TreeShare non conserva dati completi di pagamento</li>
              <li>I pagamenti e i servizi di terze parti sono soggetti ai termini dei rispettivi provider</li>
              <li>TreeShare seleziona partner affidabili nel rispetto della normativa applicabile</li>
            </ul>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">10. Campagne (utenti con Partita IVA)</h2>
            <p className="text-muted-foreground mb-3">
              La creazione di campagne è riservata a utenti con Partita IVA.
            </p>
            <p className="text-muted-foreground mb-3">L'utente è responsabile di:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-3">
              <li>Contenuti</li>
              <li>Gestione economica</li>
              <li>Conformità normativa</li>
            </ul>
            <p className="text-muted-foreground">TreeShare non è parte delle transazioni.</p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">11. Adozione alberi (utenti con Partita IVA)</h2>
            <p className="text-muted-foreground mb-3">
              Solo utenti con Partita IVA possono proporre alberi in adozione.
            </p>
            <p className="text-muted-foreground mb-3">Il proponente è responsabile di:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-3">
              <li>Esistenza degli alberi</li>
              <li>Informazioni fornite</li>
              <li>Gestione dell'adozione</li>
            </ul>
            <p className="text-muted-foreground">TreeShare è solo intermediario tecnologico.</p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">12. Limitazione responsabilità su prodotti</h2>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>TreeShare non è responsabile per spedizione o qualità dei prodotti</li>
              <li>I beni alimentari non sono rimborsabili salvo difetti (rotti/scaduti)</li>
              <li>Non sono previsti cambi o rimborsi salvo obblighi di legge</li>
            </ul>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">13. Limitazione responsabilità su eventi e campagne</h2>
            <p className="text-muted-foreground mb-2">
              TreeShare non organizza né controlla eventi o campagne.
            </p>
            <p className="text-muted-foreground mb-2">
              La partecipazione avviene sotto responsabilità dell'utente.
            </p>
            <p className="text-muted-foreground">
              TreeShare non è responsabile per danni, incidenti o controversie.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">14. Diritto di recesso</h2>
            <p className="text-muted-foreground mb-3">Ai sensi della normativa UE:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Il diritto di recesso può non applicarsi a contenuti digitali già fruiti</li>
              <li>Non si applica a beni alimentari deperibili</li>
            </ul>
          </section>

          {/* 15 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">15. Servizio fornito "così com'è"</h2>
            <div className="bg-muted/40 border border-border rounded-xl px-5 py-4">
              <p className="text-muted-foreground">
                La piattaforma è fornita <strong className="text-foreground">"così com'è"</strong> senza garanzie di continuità, affidabilità o assenza di errori.
              </p>
            </div>
          </section>

          {/* 16 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">16. Sospensione e interruzione del servizio</h2>
            <p className="text-muted-foreground mb-3">TreeShare può:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-3">
              <li>Sospendere account senza preavviso</li>
              <li>Interrompere il servizio in qualsiasi momento</li>
            </ul>
            <p className="text-muted-foreground">Senza obbligo di indennizzo.</p>
          </section>

          {/* 17 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">17. Manleva</h2>
            <p className="text-muted-foreground mb-3">
              L'utente si impegna a manlevare TreeShare da qualsiasi responsabilità derivante da:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Uso improprio della piattaforma</li>
              <li>Violazioni di legge</li>
              <li>Contenuti pubblicati o condivisi su piattaforme esterne</li>
            </ul>
          </section>

          {/* 18 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">18. Dati e responsabilità utenti business</h2>
            <p className="text-muted-foreground">
              Gli utenti con Partita IVA agiscono come titolari autonomi dei dati trattati nell'ambito delle loro attività.
            </p>
          </section>

          {/* 19 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">19. Trasferimento dati</h2>
            <p className="text-muted-foreground">
              Alcuni servizi possono comportare trasferimento di dati fuori dall'Unione Europea.
            </p>
          </section>

          {/* 20 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">20. Proprietà intellettuale</h2>
            <p className="text-muted-foreground">
              Tutti i diritti sulla piattaforma appartengono a TreeShareapp.
            </p>
          </section>

          {/* 21 — NEW */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">21. Modello di business</h2>
            <p className="text-muted-foreground mb-3">
              La piattaforma può generare ricavi attraverso:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-3">
              <li>Servizi a pagamento offerti agli utenti</li>
              <li>Commissioni sulle transazioni effettuate tramite il marketplace</li>
              <li>Attività promozionali e partnership con soggetti terzi selezionati</li>
            </ul>
            <p className="text-muted-foreground text-xs">
              Tali attività sono svolte nel rispetto della normativa applicabile e non incidono sulla tutela dei dati personali degli utenti.
            </p>
          </section>

          {/* 22 — NEW */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">22. Limitazione sull'uso dei dati</h2>
            <div className="bg-muted/40 border border-border rounded-xl px-5 py-4">
              <p className="text-muted-foreground">
                I dati personali degli utenti sono trattati in conformità al <strong className="text-foreground">GDPR</strong> e alle disposizioni della Privacy Policy di TreeShare. I dati non vengono ceduti a terzi in modo incompatibile con le finalità ivi indicate. Per maggiori informazioni sul trattamento dei dati consulta la{" "}
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
              </p>
            </div>
          </section>

          {/* 23 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">23. Modifiche ai Termini</h2>
            <p className="text-muted-foreground">
              I Termini possono essere modificati in qualsiasi momento.
            </p>
          </section>

          {/* 24 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">24. Legge applicabile</h2>
            <p className="text-muted-foreground">
              Legge italiana – Foro competente: Cuneo.
            </p>
          </section>

          {/* 25 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">25. Contatti</h2>
            <p className="text-muted-foreground">
              Email:{" "}
              <a href="mailto:treeshare@treeshareapp.com" className="text-primary hover:underline">
                treeshare@treeshareapp.com
              </a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground italic mb-6">
            Utilizzando la piattaforma, l'utente dichiara di aver letto e accettato i presenti Termini e Condizioni.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/privacy" className="text-primary hover:underline">Informativa sulla Privacy</Link>
            <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">← Torna alla home</Link>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center border-t border-border text-xs text-muted-foreground space-y-1">
        <p>© {new Date().getFullYear()} TreeShareapp — Tutti i diritti riservati.</p>
        <p>È vietata la riproduzione, distribuzione o modifica senza autorizzazione.</p>
      </footer>
    </div>
  );
}
