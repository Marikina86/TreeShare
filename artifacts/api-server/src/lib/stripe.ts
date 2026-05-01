import Stripe from "stripe";

async function getCredentials(): Promise<{ publishableKey: string; secretKey: string }> {
  // Fallback 1: env vars dirette
  const envSecret = process.env.STRIPE_SECRET_KEY;
  const envPublishable = process.env.STRIPE_PUBLISHABLE_KEY;
  if (envSecret && envPublishable) {
    return { publishableKey: envPublishable, secretKey: envSecret };
  }

  // Fallback 2: Replit connector
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (hostname && xReplitToken) {
    const connectorName = "stripe";
    const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
    const targetEnvironment = isProduction ? "production" : "development";

    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set("include_secrets", "true");
    url.searchParams.set("connector_names", connectorName);
    url.searchParams.set("environment", targetEnvironment);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "X-Replit-Token": xReplitToken,
        },
      });

      const data = await response.json();
      const connectionSettings = data.items?.[0];

      if (
        connectionSettings?.settings?.publishable &&
        connectionSettings?.settings?.secret
      ) {
        return {
          publishableKey: connectionSettings.settings.publishable,
          secretKey: connectionSettings.settings.secret,
        };
      }
    } catch {
      // continua al fallback
    }
  }

  throw new Error(
    "Stripe non configurato. Imposta STRIPE_SECRET_KEY e STRIPE_PUBLISHABLE_KEY nelle variabili d'ambiente, oppure connetti l'integrazione Stripe."
  );
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey);
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}
