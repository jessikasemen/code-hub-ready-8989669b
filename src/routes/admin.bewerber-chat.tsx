import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/bewerber-chat")({
  component: ApplicantChatAdminPage,
  head: () => ({
    meta: [
      { title: "Bewerber-Chat | Mitarbeiter-Portal" },
      { name: "description", content: "Live-Chat mit Bewerbern, die in der Registrierung Fragen haben." },
      { property: "og:title", content: "Bewerber-Chat" },
      { property: "og:description", content: "Fragen von Bewerbern direkt im Portal beantworten." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, MessageCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Row {
  id: string;
  application_id: string;
  tenant_id: string | null;
  sender: "applicant" | "staff";
  message: string;
  read_by_staff: boolean;
  created_at: string;
}

interface Applicant {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
}

function displayName(a?: Applicant) {
  if (!a) return "Unbekannter Bewerber";
  return a.full_name || `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || a.email || "Bewerber";
}

function ApplicantChatAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [applicants, setApplicants] = useState<Record<string, Applicant>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("applicant_chat_messages" as any)
      .select("id, application_id, tenant_id, sender, message, read_by_staff, created_at")
      .order("created_at", { ascending: true })
      .limit(2000);
    if (error) return;
    const list = ((data as any[]) ?? []) as Row[];
    setRows(list);

    const ids = Array.from(new Set(list.map((r) => r.application_id)));
    if (ids.length) {
      const { data: apps } = await supabase
        .from("applications")
        .select("id, first_name, last_name, full_name, email")
        .in("id", ids);
      const map: Record<string, Applicant> = {};
      for (const a of ((apps as any[]) ?? [])) map[a.id] = a as Applicant;
      setApplicants(map);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(id);
  }, [load]);

  const conversations = useMemo(() => {
    const byApp = new Map<string, Row[]>();
    for (const r of rows) {
      const arr = byApp.get(r.application_id) ?? [];
      arr.push(r);
      byApp.set(r.application_id, arr);
    }
    return Array.from(byApp.entries())
      .map(([applicationId, msgs]) => ({
        applicationId,
        msgs,
        last: msgs[msgs.length - 1]!,
        unread: msgs.filter((m) => m.sender === "applicant" && !m.read_by_staff).length,
      }))
      .filter((c) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const a = applicants[c.applicationId];
        return displayName(a).toLowerCase().includes(q) || (a?.email ?? "").toLowerCase().includes(q);
      })
      .sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
  }, [rows, applicants, search]);

  const active = conversations.find((c) => c.applicationId === selected) ?? null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.msgs.length, selected]);

  // Öffnen quittiert die Bewerber-Nachrichten.
  useEffect(() => {
    if (!selected) return;
    void supabase
      .from("applicant_chat_messages" as any)
      .update({ read_by_staff: true })
      .eq("application_id", selected)
      .eq("sender", "applicant")
      .eq("read_by_staff", false);
  }, [selected]);

  const send = async () => {
    const text = reply.trim();
    if (!text || !selected || sending) return;
    setSending(true);
    const tenantId = active?.last.tenant_id ?? null;
    const { error } = await supabase.from("applicant_chat_messages" as any).insert({
      application_id: selected,
      tenant_id: tenantId,
      sender: "staff",
      staff_id: user?.id ?? null,
      message: text,
      read_by_staff: true,
    } as any);
    setSending(false);
    if (error) {
      toast({ title: "Antwort nicht gesendet", description: error.message, variant: "destructive" });
      return;
    }
    setReply("");
    await load();
  };

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-bold text-foreground">Bewerber-Chat</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Fragen von Bewerbern aus der Registrierung – hier antwortet ein Mensch, keine KI.
      </p>

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bewerber suchen…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="max-h-[32rem] overflow-y-auto">
            {conversations.length === 0 && (
              <p className="px-3 py-6 text-sm text-muted-foreground">Noch keine Chat-Anfragen.</p>
            )}
            {conversations.map((c) => (
              <button
                key={c.applicationId}
                onClick={() => setSelected(c.applicationId)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2 text-left hover:bg-muted/50",
                  selected === c.applicationId && "bg-muted",
                )}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {displayName(applicants[c.applicationId])}
                  </span>
                  {c.unread > 0 && (
                    <span className="rounded-full bg-destructive px-2 text-xs font-bold text-destructive-foreground">
                      {c.unread}
                    </span>
                  )}
                </span>
                <span className="line-clamp-1 text-xs text-muted-foreground">{c.last.message}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-[32rem] flex-col rounded-xl border border-border bg-card">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <MessageCircle className="h-8 w-8" />
              <p className="text-sm">Unterhaltung auswählen</p>
            </div>
          ) : (
            <>
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{displayName(applicants[active.applicationId])}</p>
                <p className="text-xs text-muted-foreground">{applicants[active.applicationId]?.email ?? ""}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {active.msgs.map((m) => (
                  <div key={m.id} className={cn("flex", m.sender === "staff" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[70%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                        m.sender === "staff" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                      )}
                    >
                      {m.message}
                      <span className="mt-1 block text-[10px] opacity-70">
                        {new Date(m.created_at).toLocaleString("de-DE")}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="flex items-end gap-2 border-t border-border px-3 py-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
                  }}
                  rows={2}
                  placeholder="Antwort an den Bewerber…"
                  className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() => void send()}
                  disabled={sending || !reply.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                  aria-label="Antwort senden"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
