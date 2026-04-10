/**
 * Seeder GDPR — crea Privacy Policy v1.0 e Termini e Condizioni v1.0
 * Esegui con: node scripts/seed-gdpr.mjs
 */

import pg from "pg";
import { config } from "dotenv";

config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const privacyContent = `
# Privacy Policy — TreeShare v1.0

**Ultimo aggiornamento:** ${new Date().toLocaleDateString("it-IT")}

## 1. Titolare del trattamento
TreeShare è il titolare del trattamento dei dati personali degli utenti.

## 2. Dati raccolti
Raccogliamo i seguenti dati personali:
- Nome utente e foto profilo
- Indirizzo email (tramite provider di autenticazione Clerk)
- Posizione geografica delle piante/alberi pubblicati (latitudine, longitudine)
- Foto caricate dagli utenti
- Indirizzo IP e User Agent al momento del consenso

## 3. Finalità del trattamento
I dati vengono trattati per:
- Erogare il servizio TreeShare (registrazione, login, pubblicazione contenuti)
- Visualizzare la posizione degli alberi sulla mappa pubblica
- Inviare notifiche relative all'attività dell'account
- Adempiere obblighi di legge

## 4. Base giuridica
Il trattamento è basato sul consenso dell'utente (art. 6, comma 1, lett. a) GDPR) e sull'esecuzione del contratto di servizio.

## 5. Conservazione dei dati
I dati vengono conservati per tutta la durata dell'account. In caso di cancellazione, i dati vengono eliminati entro 30 giorni.

## 6. Diritti dell'utente
L'utente ha diritto a: accesso, rettifica, cancellazione, limitazione, portabilità e opposizione al trattamento. Per esercitare tali diritti: privacy@treeshare.app

## 7. Cookie
TreeShare utilizza solo cookie tecnici necessari al funzionamento del servizio. Cookie analitici e di marketing vengono attivati solo previo esplicito consenso.

## 8. Trasferimenti internazionali
I dati possono essere trasferiti a paesi terzi (es. USA) tramite fornitori certificati Privacy Shield/SCCs.
`.trim();

const termsContent = `
# Termini e Condizioni — TreeShare v1.0

**Ultimo aggiornamento:** ${new Date().toLocaleDateString("it-IT")}

## 1. Accettazione
Utilizzando TreeShare accetti integralmente i presenti Termini e Condizioni. Se non accetti, non puoi utilizzare il servizio.

## 2. Descrizione del servizio
TreeShare è una piattaforma sociale per documentare e condividere la piantumazione di alberi e piante, con geolocalizzazione GPS e mappa mondiale.

## 3. Account utente
- L'utente deve avere almeno 16 anni per registrarsi
- L'utente è responsabile della sicurezza delle proprie credenziali
- È vietato creare account falsi o multipli

## 4. Contenuti pubblicati
- L'utente mantiene la proprietà dei contenuti caricati
- Caricando contenuti, concede a TreeShare una licenza non esclusiva per visualizzarli
- È vietato caricare contenuti: illegali, offensivi, che violino diritti di terzi
- TreeShare si riserva il diritto di rimuovere contenuti inappropriati

## 5. Geolocalizzazione
- Le coordinate GPS degli alberi sono visibili pubblicamente
- L'utente acconsente alla pubblicazione della posizione geografica dei propri alberi
- NON raccogliamo la posizione in tempo reale dell'utente

## 6. Comportamento vietato
Sono vietati: spam, harassment, accesso non autorizzato, violazione di copyright, manipolazione delle votazioni.

## 7. Sospensione e chiusura account
TreeShare può sospendere o chiudere account che violano i presenti termini, senza preavviso.

## 8. Limitazione di responsabilità
TreeShare non è responsabile per danni derivanti dall'uso del servizio, nei limiti consentiti dalla legge.

## 9. Legge applicabile
I presenti termini sono regolati dalla legge italiana. Foro competente: Milano.

## 10. Modifiche
Ci riserviamo il diritto di modificare questi termini. Gli utenti saranno notificati e dovranno ri-accettare.
`.trim();

async function seed() {
  const client = await pool.connect();

  try {
    console.log("🌱 Avvio seeder GDPR...\n");

    // Controlla se esistono già policy v1.0
    const existing = await client.query(
      "SELECT id, type, version FROM policies WHERE version = 'v1.0'"
    );

    if (existing.rows.length > 0) {
      console.log("⚠️  Le policy v1.0 esistono già:");
      for (const row of existing.rows) {
        console.log(`   - ${row.type} v1.0 (id: ${row.id})`);
      }
      console.log("\nNessuna modifica effettuata. Per creare una nuova versione usa la API POST /policies");
      return;
    }

    // Inserisce Privacy Policy v1.0
    const privacyResult = await client.query(
      `INSERT INTO policies (type, version, content, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, type, version, is_active`,
      ["privacy", "v1.0", privacyContent, true]
    );
    console.log("✅ Privacy Policy v1.0 creata e attivata");
    console.log(`   ID: ${privacyResult.rows[0].id}\n`);

    // Inserisce Termini e Condizioni v1.0
    const termsResult = await client.query(
      `INSERT INTO policies (type, version, content, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, type, version, is_active`,
      ["terms", "v1.0", termsContent, true]
    );
    console.log("✅ Termini e Condizioni v1.0 creati e attivati");
    console.log(`   ID: ${termsResult.rows[0].id}\n`);

    console.log("🎉 Seeder GDPR completato con successo!\n");
    console.log("─────────────────────────────────────────");
    console.log("Endpoints disponibili:");
    console.log("  GET  /api/policies/privacy    → recupera privacy attiva");
    console.log("  GET  /api/policies/terms      → recupera termini attivi");
    console.log("  POST /api/policies            → crea nuova versione (admin)");
    console.log("  PUT  /api/policies/:id/activate → attiva versione (admin)");
    console.log("  POST /api/consent             → salva consensi utente");
    console.log("  GET  /api/users/:id/consents  → storico consensi");
    console.log("  GET  /api/consent/status      → stato consensi correnti");
    console.log("  DELETE /api/consent/:policyId → revoca consenso");
    console.log("  POST /api/cookie-consent      → salva preferenze cookie");
    console.log("  GET  /api/cookie-consent/:sessionId → recupera preferenze");
    console.log("  PATCH /api/cookie-consent/:sessionId → aggiorna preferenze");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("❌ Errore nel seeder:", err);
  process.exit(1);
});
