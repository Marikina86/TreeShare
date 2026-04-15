import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user ?? "noreply@treeshare.app";

  if (!host || !user || !pass) {
    return null;
  }

  return {
    from,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
  };
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ sent: boolean; error?: string }> {
  const cfg = getTransporter();
  if (!cfg) {
    console.warn("[email] SMTP not configured — skipping email to", to);
    return { sent: false, error: "SMTP not configured" };
  }
  try {
    await cfg.transporter.sendMail({ from: cfg.from, to, subject, html });
    return { sent: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] Failed to send to", to, msg);
    return { sent: false, error: msg };
  }
}

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
