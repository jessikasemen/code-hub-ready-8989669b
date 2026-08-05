// Live-Chat für Bewerber (z. B. während der Registrierung).
// Eine Unterhaltung je Bewerbung, Antwort ausschließlich von echten Menschen
// (Team/Admin) — keine KI. Zugang über das Token, das der Bewerber ohnehin hat
// (magic_token oder Einladungs-Token), weil zu diesem Zeitpunkt noch kein
// Konto existiert.
//
//   GET  /api/public/applicant-chat?token=…      → { ok, messages: [...] }
//   POST /api/public/applicant-chat  { token, message }
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const Token = z.string().trim().min(8).max(128);
const SendSchema = z.object({ token: Token, message: z.string().trim().min(1).max(4000) });

// Globaler Schalter: der Admin kann den Bewerber-Chat im Portal aus- und
// einblenden, ohne Deploy. Ist er aus, liefert der Endpunkt keine Nachrichten
// und nimmt keine an.
async function chatEnabled(admin: any): Promise<boolean> {
  try {
    const { data } = await admin
      .from("system_settings")
      .select("applicant_chat_enabled")
      .eq("id", 1)
      .maybeSingle();
    return (data as any)?.applicant_chat_enabled !== false;
  } catch {
    return true;
  }
}

export const Route = createFileRoute("/api/public/applicant-chat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = Token.safeParse(url.searchParams.get("token"));
        if (!parsed.success) return json({ ok: false, error: "invalid_token" }, 400);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (!(await chatEnabled(supabaseAdmin))) return json({ ok: true, enabled: false, messages: [] });
        const { data, error } = await (supabaseAdmin.rpc as any)("applicant_chat_messages_for_token", {
          _token: parsed.data,
        });
        if (error) {
          const invalid = /invalid_token/.test(error.message);
          return json({ ok: false, error: invalid ? "invalid_token" : error.message }, invalid ? 404 : 500);
        }
        return json({ ok: true, enabled: true, messages: (data as any[]) ?? [] });
      },

      POST: async ({ request }) => {
        let payload: unknown;
        try { payload = await request.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
        const parsed = SendSchema.safeParse(payload);
        if (!parsed.success) return json({ ok: false, error: "invalid_body" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (!(await chatEnabled(supabaseAdmin))) return json({ ok: false, error: "chat_disabled" }, 403);
        const { data, error } = await (supabaseAdmin.rpc as any)("applicant_chat_send", {
          _token: parsed.data.token,
          _message: parsed.data.message,
        });
        if (error) {
          if (/invalid_token/.test(error.message)) return json({ ok: false, error: "invalid_token" }, 404);
          if (/rate_limited/.test(error.message)) return json({ ok: false, error: "rate_limited" }, 429);
          return json({ ok: false, error: error.message }, 500);
        }
        return json({ ok: true, id: data });
      },
    },
  },
});
