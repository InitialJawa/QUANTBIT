export interface EmailPayload {
  subject: string;
  body: string;
}

/** Kirim email notifikasi. Bekerja di dev (server.ts via nodemailer) maupun
 *  production (Cloudflare Pages Function via Resend API). */
export async function sendNotificationEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data: any = await res.json();
    if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
