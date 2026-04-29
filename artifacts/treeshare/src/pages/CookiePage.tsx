import { Link } from "wouter";

export default function CookiePage() {
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Cookie Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Ultimo aggiornamento: 20/04/2026</p>

        <p className="text-sm text-muted-foreground leading-relaxed mb-10">
          La presente Cookie Policy descrive come TreeShare utilizza i cookie e tecnologie di tracciamento simili quando
          accedi alla piattaforma. Ti invitiamo a leggere attentamente questo documento per comprendere quali cookie
          vengono utilizzati, perché e come puoi gestirli.
        </p>

        <div className="space-y-10 text-sm text-foreground leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">1. Cosa sono i cookie</h2>
            <p className="text-muted-foreground mb-3">
              I cookie sono piccoli file di testo che un sito web invia al tuo browser e che vengono memorizzati sul tuo
              dispositivo (computer, smartphone, tablet). Alla successiva visita, il browser li reinvia al sito che li
              ha impostati, consentendo al sito di riconoscere il tuo dispositivo e le tue preferenze.
            </p>
            <p className="text-muted-foreground">
              Oltre ai cookie tradizionali, utilizziamo tecnologie simili come il localStorage e il sessionStorage del
              browser per conservare informazioni di sessione necessarie al corretto funzionamento dell'applicazione.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">2. Tipologie di cookie utilizzati</h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-2">2.1 Cookie tecnici / strettamente necessari</h3>
                <p className="text-muted-foreground mb-2">
                  Questi cookie sono indispensabili per il funzionamento della piattaforma e non possono essere
                  disabilitati senza compromettere il servizio. Non richiedono il tuo consenso preventivo ai sensi
                  dell'art. 122 del Codice Privacy e del Considerando 25 della Direttiva ePrivacy.
                </p>
                <p className="text-muted-foreground">
                  Includono, a titolo esemplificativo: cookie di sessione per mantenere attiva l'autenticazione,
                  token di sicurezza per proteggere le richieste (CSRF), preferenze di lingua e tema impostate
                  dall'utente.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">2.2 Cookie funzionali</h3>
                <p className="text-muted-foreground">
                  Questi cookie migliorano l'esperienza d'uso memorizzando le tue scelte (es. lingua preferita, tema
                  chiaro/scuro). Possono essere disabilitati, ma ciò potrebbe comportare la perdita di alcune
                  funzionalità personalizzate.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">2.3 Cookie di terze parti</h3>
                <p className="text-muted-foreground">
                  Alcuni servizi di terze parti integrati nella piattaforma possono impostare i propri cookie o
                  utilizzare tecnologie di tracciamento equivalenti. TreeShare non ha controllo diretto su questi
                  cookie. Per ulteriori informazioni, ti invitiamo a consultare le rispettive privacy/cookie policy.
                </p>
              </div>
            </div>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">3. Cookie e tecnologie specifiche utilizzate</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-muted-foreground border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Nome / Tecnologia</th>
                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Fornitore</th>
                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Finalità</th>
                    <th className="text-left py-2 font-semibold text-foreground">Durata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-2 pr-4 font-mono">sb-*-auth-token</td>
                    <td className="py-2 pr-4">Supabase</td>
                    <td className="py-2 pr-4">Gestione sessione di autenticazione dell'utente</td>
                    <td className="py-2">Sessione / 1 settimana</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono">localStorage (theme)</td>
                    <td className="py-2 pr-4">TreeShare</td>
                    <td className="py-2 pr-4">Memorizzazione preferenza tema (chiaro/scuro)</td>
                    <td className="py-2">Persistente</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono">localStorage (lang)</td>
                    <td className="py-2 pr-4">TreeShare</td>
                    <td className="py-2 pr-4">Memorizzazione lingua preferita</td>
                    <td className="py-2">Persistente</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono">__stripe_mid / __stripe_sid</td>
                    <td className="py-2 pr-4">Stripe</td>
                    <td className="py-2 pr-4">Prevenzione frodi e sicurezza nei pagamenti</td>
                    <td className="py-2">1 anno / Sessione</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono">sessionStorage (draft)</td>
                    <td className="py-2 pr-4">TreeShare</td>
                    <td className="py-2 pr-4">Salvataggio temporaneo bozze post durante la sessione</td>
                    <td className="py-2">Sessione</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-muted-foreground mt-4">
              L'elenco sopra è indicativo e potrebbe non essere esaustivo. Le tecnologie di terze parti possono
              aggiornare i propri cookie indipendentemente da TreeShare.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">4. Cookie di Supabase (autenticazione)</h2>
            <p className="text-muted-foreground mb-3">
              TreeShare utilizza Supabase come sistema di autenticazione. Supabase imposta cookie e voci di
              localStorage per gestire la sessione autenticata dell'utente. Questi dati sono necessari per
              mantenerti connesso/a tra una visita e l'altra e per proteggere il tuo account.
            </p>
            <p className="text-muted-foreground">
              Per maggiori informazioni, consulta la{" "}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Privacy Policy di Supabase
              </a>.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">5. Cookie di Stripe (pagamenti)</h2>
            <p className="text-muted-foreground mb-3">
              Quando utilizzi le funzionalità di pagamento (es. adozione di alberi, donazioni, sottoscrizione di
              campagne), Stripe — il nostro fornitore di servizi di pagamento — può impostare cookie propri a
              finalità antifrode e di sicurezza delle transazioni. Questi cookie non vengono usati per profilazione
              commerciale.
            </p>
            <p className="text-muted-foreground">
              Per maggiori informazioni, consulta la{" "}
              <a
                href="https://stripe.com/en-it/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Cookie Policy di Stripe
              </a>.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">6. Assenza di cookie di profilazione e marketing</h2>
            <p className="text-muted-foreground">
              TreeShare <strong className="text-foreground">non utilizza</strong> cookie di profilazione, cookie
              pubblicitari o strumenti di tracciamento a fini di marketing (es. Google Analytics, Facebook Pixel,
              o simili). Non viene effettuata alcuna attività di remarketing o pubblicità comportamentale nei
              confronti degli utenti.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">7. Come gestire i cookie</h2>
            <p className="text-muted-foreground mb-4">
              Puoi controllare e gestire i cookie direttamente dalle impostazioni del tuo browser. Di seguito
              trovi i link alle guide dei browser più comuni:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Google Chrome
                </a>
              </li>
              <li>
                <a href="https://support.mozilla.org/it/kb/Attivare%20e%20disattivare%20i%20cookie" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a href="https://support.apple.com/it-it/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Apple Safari
                </a>
              </li>
              <li>
                <a href="https://support.microsoft.com/it-it/topic/eliminare-e-gestire-i-cookie-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Microsoft Edge
                </a>
              </li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Tieni presente che la disabilitazione dei cookie tecnici potrebbe compromettere il funzionamento
              della piattaforma, inclusa la tua possibilità di accedere all'account.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">8. Durata dei cookie</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">Cookie di sessione:</strong> vengono eliminati automaticamente
                alla chiusura del browser.
              </p>
              <p>
                <strong className="text-foreground">Cookie persistenti:</strong> rimangono memorizzati sul tuo
                dispositivo per un periodo definito (indicato nella tabella al punto 3) o fino alla loro
                eliminazione manuale.
              </p>
            </div>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">9. Base giuridica del trattamento</h2>
            <p className="text-muted-foreground mb-3">
              Il trattamento dei dati tramite cookie tecnici è fondato sul legittimo interesse del titolare al
              corretto funzionamento del servizio (art. 6, par. 1, lett. f del GDPR) e, ai sensi dell'art. 122
              del D.lgs. 196/2003, non richiede il consenso preventivo dell'utente.
            </p>
            <p className="text-muted-foreground">
              Non utilizziamo cookie che richiedono consenso preventivo (es. cookie di profilazione o marketing).
              Qualora in futuro venissero introdotti tali cookie, sarà implementato un sistema di consenso conforme
              alla normativa vigente.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">10. Aggiornamenti della Cookie Policy</h2>
            <p className="text-muted-foreground">
              Questa Cookie Policy può essere aggiornata periodicamente per riflettere modifiche tecniche,
              normative o organizzative. La data dell'ultimo aggiornamento è indicata in cima al documento.
              Ti invitiamo a consultare questa pagina periodicamente.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">11. Contatti</h2>
            <div className="text-muted-foreground space-y-1">
              <p>Per qualsiasi domanda relativa alla presente Cookie Policy, puoi contattarci:</p>
              <p className="font-medium text-foreground">Marica Arzu — TreeShare</p>
              <p>
                Email:{" "}
                <a href="mailto:treeshare@treeshareapp.com" className="text-primary hover:underline">
                  treeshare@treeshareapp.com
                </a>
              </p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground italic mb-6">
            Continuando a utilizzare TreeShare, l'utente prende atto della presente Cookie Policy.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/privacy" className="text-primary hover:underline">Informativa sulla Privacy</Link>
            <Link href="/terms" className="text-primary hover:underline">Termini e Condizioni</Link>
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
