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
        <p className="text-sm text-muted-foreground mb-10">Ultimo aggiornamento: 20/04/2026</p>

        <p className="text-sm text-muted-foreground leading-relaxed mb-10">
          Benvenuto/a su TreeShare, una piattaforma social dedicata alla condivisione di alberi piantati, iniziative ambientali e attività legate alla sostenibilità.
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
              <li>Promuovere e aderire a campagne (secondo le condizioni di cui all'art. 8)</li>
              <li>Adottare alberi (secondo le condizioni di cui all'art. 9)</li>
              <li>Ricevere notifiche (accessi, consigli, aggiornamenti)</li>
            </ul>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">2. Registrazione e account</h2>
            <p className="text-muted-foreground mb-3">Per utilizzare alcune funzionalità è necessario registrarsi.</p>
            <p className="text-muted-foreground mb-3">L'utente si impegna a:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Fornire dati veritieri e aggiornati</li>
              <li>Mantenere riservate le credenziali</li>
              <li>Non condividere l'account con terzi</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              L'utente è responsabile di tutte le attività effettuate tramite il proprio account.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">3. Utilizzo della piattaforma</h2>
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

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">4. Contenuti degli utenti</h2>
            <p className="text-muted-foreground mb-3">
              L'utente mantiene la proprietà dei contenuti pubblicati (foto, testi, eventi).
            </p>
            <p className="text-muted-foreground mb-3">
              Tuttavia, concedendo l'upload, l'utente garantisce a TreeShare una licenza:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-3">
              <li>Non esclusiva</li>
              <li>Gratuita</li>
              <li>Globale</li>
            </ul>
            <p className="text-muted-foreground">
              Per utilizzare, mostrare e distribuire tali contenuti sulla piattaforma.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">5. Verifica dei contenuti</h2>
            <p className="text-muted-foreground mb-3">La piattaforma può utilizzare sistemi di intelligenza artificiale per:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-3">
              <li>Verificare autenticità delle immagini</li>
              <li>Identificare contenuti non conformi</li>
            </ul>
            <p className="text-muted-foreground">
              Ci riserviamo il diritto di rimuovere contenuti non conformi ai presenti Termini.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">6. Geolocalizzazione</h2>
            <p className="text-muted-foreground mb-3">
              Alcune funzionalità utilizzano dati di geolocalizzazione per mostrare gli alberi su mappa.
            </p>
            <p className="text-muted-foreground mb-3">L'utente:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Può scegliere se condividere la posizione</li>
              <li>È responsabile della correttezza dei dati inseriti</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">7. Pagamenti</h2>
            <p className="text-muted-foreground mb-3">
              La piattaforma utilizza provider esterni (es. Stripe, PayPal) per la gestione dei pagamenti.
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>I pagamenti sono soggetti ai termini del provider</li>
              <li>La piattaforma non memorizza dati completi di pagamento</li>
              <li>Eventuali rimborsi seguono le condizioni specifiche del servizio acquistato</li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">8. Campagne a pagamento per utenti con Partita IVA</h2>
            <p className="text-muted-foreground mb-3">
              La creazione e pubblicazione di campagne è riservata esclusivamente a utenti che:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-5">
              <li>Sono titolari di Partita IVA valida</li>
              <li>Agiscono nell'ambito della propria attività professionale o imprenditoriale</li>
            </ul>

            <h3 className="font-semibold mb-2 text-foreground">8.1 Accesso al servizio campagne</h3>
            <p className="text-muted-foreground mb-3">Per pubblicare una campagna è richiesto:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-5">
              <li>Il pagamento di un corrispettivo (abbonamento o fee)</li>
              <li>L'accettazione delle condizioni economiche applicabili</li>
            </ul>

            <h3 className="font-semibold mb-2 text-foreground">8.2 Responsabilità del promotore</h3>
            <p className="text-muted-foreground mb-3">L'utente è l'unico responsabile di:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-3">
              <li>Veridicità delle informazioni</li>
              <li>Gestione economica e operativa</li>
              <li>Conformità alle normative vigenti</li>
            </ul>
            <p className="text-muted-foreground">La piattaforma non è parte delle transazioni.</p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">9. Messa in adozione degli alberi (riservata a titolari di Partita IVA)</h2>
            <p className="text-muted-foreground mb-3">
              La possibilità di rendere disponibili alberi per l'adozione è riservata esclusivamente a utenti che:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-5">
              <li>Sono titolari di Partita IVA valida</li>
              <li>Operano come soggetti professionali (es. aziende agricole, enti, organizzazioni, vivaisti, associazioni)</li>
            </ul>

            <h3 className="font-semibold mb-2 text-foreground">9.1 Accesso al servizio</h3>
            <p className="text-muted-foreground mb-3">Per pubblicare alberi adottabili può essere richiesto:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-5">
              <li>Il pagamento di una tariffa o commissione</li>
              <li>La verifica dell'identità e della Partita IVA</li>
              <li>L'accettazione di eventuali condizioni specifiche</li>
            </ul>

            <h3 className="font-semibold mb-2 text-foreground">9.2 Obblighi del soggetto proponente</h3>
            <p className="text-muted-foreground mb-3">Il soggetto che propone alberi in adozione è responsabile di:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-5">
              <li>Esistenza reale degli alberi</li>
              <li>Corretta geolocalizzazione</li>
              <li>Veridicità delle informazioni fornite</li>
              <li>Gestione dell'adozione (inclusi eventuali aggiornamenti e comunicazioni)</li>
              <li>Rispetto degli obblighi fiscali e normativi</li>
            </ul>

            <h3 className="font-semibold mb-2 text-foreground">9.3 Ruolo della piattaforma</h3>
            <p className="text-muted-foreground mb-3">La piattaforma:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-3">
              <li>Fornisce esclusivamente un servizio tecnologico di intermediazione</li>
              <li>Non garantisce la qualità, stato o sopravvivenza degli alberi</li>
              <li>Non è responsabile per eventuali controversie tra utenti</li>
            </ul>
            <p className="text-muted-foreground">Ci riserviamo il diritto di sospendere contenuti non conformi.</p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">10. Eventi</h2>
            <p className="text-muted-foreground mb-3">Gli utenti possono creare e condividere eventi.</p>
            <p className="text-muted-foreground mb-3">Il creatore è responsabile di:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Accuratezza delle informazioni</li>
              <li>Organizzazione</li>
              <li>Conformità alle normative</li>
            </ul>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">11. Notifiche</h2>
            <p className="text-muted-foreground mb-3">La piattaforma può inviare notifiche relative a:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-3">
              <li>Accessi e sicurezza</li>
              <li>Attività dell'account</li>
              <li>Suggerimenti e contenuti</li>
            </ul>
            <p className="text-muted-foreground">Le preferenze sono modificabili dall'utente.</p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">12. Limitazione di responsabilità</h2>
            <div className="bg-muted/40 border border-border rounded-xl px-5 py-4 mb-4">
              <p className="text-muted-foreground">
                La piattaforma è fornita <strong className="text-foreground">"così com'è"</strong>.
              </p>
            </div>
            <p className="text-muted-foreground mb-2">La piattaforma:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Non garantisce continuità o assenza di errori</li>
              <li>Non è responsabile per contenuti pubblicati dagli utenti</li>
              <li>Non è responsabile per danni derivanti dall'uso del servizio</li>
            </ul>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">13. Sospensione e cancellazione account</h2>
            <p className="text-muted-foreground mb-3">Ci riserviamo il diritto di:</p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground mb-3">
              <li>Sospendere account in caso di violazioni</li>
              <li>Revocare accesso ai servizi a pagamento</li>
              <li>Rimuovere contenuti non conformi</li>
            </ul>
            <p className="text-muted-foreground">L'utente può cancellare il proprio account in qualsiasi momento.</p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">14. Proprietà intellettuale</h2>
            <p className="text-muted-foreground mb-3">
              Tutti i diritti relativi alla piattaforma appartengono a TreeShare.
            </p>
            <p className="text-muted-foreground">È vietato l'uso non autorizzato.</p>
          </section>

          {/* 15 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">15. Modifiche ai Termini</h2>
            <p className="text-muted-foreground">
              I presenti Termini possono essere aggiornati in qualsiasi momento. L'uso continuato implica accettazione delle modifiche.
            </p>
          </section>

          {/* 16 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">16. Legge applicabile e foro competente</h2>
            <p className="text-muted-foreground">
              I presenti Termini sono regolati dalla legge italiana. Foro competente: Cuneo.
            </p>
          </section>

          {/* 17 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">17. Contatti</h2>
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
