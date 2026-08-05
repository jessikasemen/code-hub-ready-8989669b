// Schwebender Live-Chat für Bewerber (Registrierung, Terminseite).
// Eine Unterhaltung je Bewerbung, es antwortet immer ein Mensch aus dem Team.
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Msg { id: string; sender: "applicant" | "staff"; message: string; created_at: string }

const POLL_MS = 8000;

export default function ApplicantLiveChat({ token, title = "Fragen? Wir helfen dir" }: { token: string | null; title?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unseenStaff, setUnseenStaff] = useState(0);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const seenRef = useRef(0);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/public/applicant-chat?token=${encodeURIComponent(token)}`);
      const data = await res.json().catch(() => ({}));
      if (!data?.ok) return;
      setEnabled(data.enabled !== false);
      if (data.enabled === false) { setOpen(false); return; }
      const list = (data.messages ?? []) as Msg[];
      setMessages(list);
      const staffCount = list.filter((m) => m.sender === "staff").length;
      if (!open) setUnseenStaff(Math.max(0, staffCount - seenRef.current));
      else seenRef.current = staffCount;
    } catch { /* stiller Wiederholversuch beim nächsten Takt */ }
  }, [token, open]);

  useEffect(() => {
    if (!token) return;
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [token, load]);

  useEffect(() => {
    if (open) {
      seenRef.current = messages.filter((m) => m.sender === "staff").length;
      setUnseenStaff(0);
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || !token || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/public/applicant-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, message: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data?.ok) {
        setError(data?.error === "rate_limited"
          ? "Bitte warte einen Moment – zu viele Nachrichten."
          : "Nachricht konnte nicht gesendet werden. Bitte später erneut versuchen.");
        return;
      }
      setInput("");
      await load();
    } catch {
      setError("Keine Verbindung. Bitte später erneut versuchen.");
    } finally {
      setSending(false);
    }
  };

  if (!token || enabled !== true) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Live-Chat öffnen"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-transform hover:scale-105"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-semibold">Hilfe & Chat</span>
          {unseenStaff > 0 && (
            <span className="ml-1 rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">
              {unseenStaff}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[28rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">Dein Team antwortet persönlich</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Chat schließen" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Schreib uns, wenn du in der Registrierung nicht weiterkommst – wir melden uns hier.
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.sender === "applicant" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                    m.sender === "applicant"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {m.message}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {error && <p className="px-4 pb-1 text-xs text-destructive">{error}</p>}

          <div className="flex items-end gap-2 border-t border-border px-3 py-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
              }}
              rows={2}
              placeholder="Deine Frage…"
              className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => void send()}
              disabled={sending || !input.trim()}
              aria-label="Nachricht senden"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
