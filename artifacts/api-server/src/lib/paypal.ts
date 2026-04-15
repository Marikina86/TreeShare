const PAYPAL_BASE = process.env.PAYPAL_ENV === "production"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

export function isPayPalConfigured(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

export async function getPayPalClientId(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  if (!id) throw new Error("PAYPAL_CLIENT_ID not configured");
  return id;
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("PayPal credentials not configured");

  const resp = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`PayPal token error: ${err}`);
  }
  const data = await resp.json() as { access_token: string };
  return data.access_token;
}

export interface PayPalOrderResult {
  orderId: string;
  approveUrl: string;
}

export async function createPayPalOrder(
  amountCents: number,
  currency: string,
  customId: string,
  description: string,
): Promise<PayPalOrderResult> {
  const token = await getAccessToken();
  const amount = (amountCents / 100).toFixed(2);

  const resp = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": customId,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: customId,
          description: description.slice(0, 127),
          amount: {
            currency_code: currency.toUpperCase(),
            value: amount,
          },
        },
      ],
      application_context: {
        brand_name: "TreeShare",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
      },
    }),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(`PayPal create order failed: ${JSON.stringify(err)}`);
  }

  const data = await resp.json() as { id: string; links: { rel: string; href: string }[] };
  const approveUrl = data.links?.find((l) => l.rel === "approve")?.href ?? "";
  return { orderId: data.id, approveUrl };
}

export async function capturePayPalOrder(orderId: string): Promise<{ captured: boolean; status: string }> {
  const token = await getAccessToken();

  const resp = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({}));
    const errCode = (errBody as any)?.details?.[0]?.issue ?? (errBody as any)?.name ?? "UNKNOWN";
    if (errCode === "ORDER_ALREADY_CAPTURED") {
      return { captured: true, status: "COMPLETED" };
    }
    throw new Error(`PayPal capture failed: ${JSON.stringify(errBody)}`);
  }

  const data = await resp.json() as { status: string };
  return { captured: data.status === "COMPLETED", status: data.status };
}

export async function verifyPayPalWebhookSignature(params: {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookId: string;
  webhookEvent: unknown;
}): Promise<boolean> {
  if (!isPayPalConfigured()) return false;
  const token = await getAccessToken();

  const resp = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: params.authAlgo,
      cert_url: params.certUrl,
      transmission_id: params.transmissionId,
      transmission_sig: params.transmissionSig,
      transmission_time: params.transmissionTime,
      webhook_id: params.webhookId,
      webhook_event: params.webhookEvent,
    }),
  });

  if (!resp.ok) return false;
  const data = await resp.json() as { verification_status: string };
  return data.verification_status === "SUCCESS";
}
