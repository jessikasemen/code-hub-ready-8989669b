// Ein-/Ausschalter fuer den Bewerber-Live-Chat (Portal / Fast-Track).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdminStaff(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_admin_staff", { _user_id: ctx.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Nicht autorisiert");
}

export const getApplicantChatEnabled = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminStaff(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("system_settings")
      .select("applicant_chat_enabled")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { enabled: (data as any)?.applicant_chat_enabled !== false };
  });

export const setApplicantChatEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled: boolean }) => ({ enabled: !!input?.enabled }))
  .handler(async ({ data, context }) => {
    await requireAdminStaff(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { error } = await admin
      .from("system_settings")
      .update({ applicant_chat_enabled: data.enabled })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { enabled: data.enabled };
  });
