import { supabase } from "@/integrations/supabase/client";

export type ResendResult =
  | { ok: true; to: string }
  | { ok: false; message: string; code?: string };

/**
 * Generischer Resend: sendet das im email_send_log gespeicherte
 * rendered_html/rendered_subject erneut über das Tenant-SMTP.
 * Funktioniert für alle Mail-Typen (Edge Function `email-resend`).
 */
export async function resendEmailLog(
  logId: string,
  opts: { to?: string; isTest?: boolean; force?: boolean; timeoutMs?: number } = {},
): Promise<ResendResult> {
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { data, error } = await supabase.functions.invoke("email-resend", {
      body: { log_id: logId, to: opts.to, is_test: opts.isTest, force: opts.force },
      // @ts-expect-error signal wird von supabase-js durchgereicht
      signal: controller.signal,
    });
    if (error) {
      // Bei 4xx/5xx steckt die eigentliche Begründung im Response-Body —
      // ohne dieses Auslesen sieht der Admin nur "non-2xx status code".
      const body = await readErrorBody(error);
      if (body?.error) return { ok: false, message: String(body.error), code: body?.code };
      return { ok: false, message: error.message || "Versand fehlgeschlagen" };
    }
    if (data?.error) return { ok: false, message: String(data.error), code: data?.code };
    return { ok: true, to: String(data?.to ?? "") };
  } catch (e: any) {
    if (e?.name === "AbortError") {
      return {
        ok: false,
        message: "Zeitüberschreitung beim Nachversand — der Mailserver hat nicht geantwortet.",
        code: "timeout",
      };
    }
    return { ok: false, message: String(e?.message ?? e) };
  } finally {
    clearTimeout(timer);
  }
}

/** Liest den JSON-Body einer fehlgeschlagenen Function-Antwort, falls vorhanden. */
async function readErrorBody(error: any): Promise<{ error?: string; code?: string } | null> {
  try {
    const res: Response | undefined = error?.context instanceof Response ? error.context : error?.context?.response;
    if (!res) return null;
    const text = await res.clone().text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Templates mit ablaufenden Links — Resend schickt den ALTEN Link. */
export const TOKEN_TEMPLATES = new Set([
  "signup_confirmation",
  "signup_confirmation_resend",
  "password_reset",
  "reminder_confirm_email",
]);

export function isTokenTemplate(templateName?: string | null): boolean {
  return !!templateName && TOKEN_TEMPLATES.has(templateName);
}
