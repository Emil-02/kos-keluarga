import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/format";

export const PLACEHOLDER_EMAIL_DOMAIN = "@kos.local";

type SendResult = { status: "terkirim" | "gagal" | "dilewati"; error?: string };

type NotifyInput = {
  kind: string;
  invoiceId?: string | null;
  email?: string | null;
  phone?: string | null;
  subject: string;
  /** Teks polos; dipakai untuk WhatsApp dan versi teks email. */
  text: string;
};

async function sendEmail(to: string, subject: string, text: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { status: "dilewati", error: "RESEND_API_KEY/EMAIL_FROM belum diatur" };

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937">${escapeHtml(text)
    .replace(/\n/g, "<br>")}</div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
    });
    if (!res.ok) return { status: "gagal", error: `Resend ${res.status}: ${await res.text()}` };
    return { status: "terkirim" };
  } catch (err) {
    return { status: "gagal", error: err instanceof Error ? err.message : String(err) };
  }
}

async function sendWhatsApp(phone: string, text: string): Promise<SendResult> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) return { status: "dilewati", error: "FONNTE_TOKEN belum diatur" };

  try {
    const body = new FormData();
    body.set("target", normalizePhone(phone));
    body.set("message", text);
    body.set("countryCode", "62");
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token },
      body,
    });
    const json = (await res.json().catch(() => null)) as { status?: boolean; reason?: string } | null;
    if (!res.ok || json?.status === false) {
      return { status: "gagal", error: json?.reason ?? `Fonnte ${res.status}` };
    }
    return { status: "terkirim" };
  } catch (err) {
    return { status: "gagal", error: err instanceof Error ? err.message : String(err) };
  }
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Kirim notifikasi via email dan/atau WhatsApp lalu catat ke notifications_log.
 * Tidak pernah melempar error agar alur utama tidak gagal karena notifikasi.
 */
export async function notify(input: NotifyInput) {
  const supabase = createAdminClient();
  const jobs: Promise<void>[] = [];

  const log = async (channel: "email" | "whatsapp", recipient: string, result: SendResult) => {
    if (result.status !== "terkirim") {
      console.info(`[notifikasi:${channel}:${result.status}] ${recipient} - ${input.subject}`, result.error ?? "");
    }
    await supabase.from("notifications_log").insert({
      channel,
      recipient,
      kind: input.kind,
      subject: input.subject,
      body: input.text,
      status: result.status,
      error: result.error ?? null,
      invoice_id: input.invoiceId ?? null,
    });
  };

  // email placeholder (penghuni tanpa email) tidak dikirimi email
  if (input.email && !input.email.endsWith(PLACEHOLDER_EMAIL_DOMAIN)) {
    const email = input.email;
    jobs.push(sendEmail(email, input.subject, input.text).then((r) => log("email", email, r)));
  }
  if (input.phone) {
    const phone = input.phone;
    jobs.push(sendWhatsApp(phone, input.text).then((r) => log("whatsapp", phone, r)));
  }

  try {
    await Promise.all(jobs);
  } catch (err) {
    console.error("Gagal mencatat notifikasi", err);
  }
}
