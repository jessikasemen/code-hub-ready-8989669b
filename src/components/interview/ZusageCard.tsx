// Zusage-Screen: wird direkt im Portal angezeigt, sobald die KI eine Zusage
// erteilt hat — optisch angelehnt an die „Willkommen im Team"-E-Mail.
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export function ZusageCard({
  company,
  primary,
  recruiter,
  firstName,
  registrationLink,
  loginHref,
  className,
  mailFailed,
  supportEmail,
  linkPending,
}: {
  company: string;
  primary: string;
  recruiter: string;
  firstName?: string | null;
  /** Persönlicher Registrierungslink (mit Token) aus der Zusage-Mail. */
  registrationLink?: string | null;
  loginHref?: string;
  className?: string;
  /** true = die Zusage-Mail konnte nicht zugestellt werden → Link hier direkt nutzen. */
  mailFailed?: boolean;
  /** Support-/Kontaktadresse des Mandanten als Rückfallkontakt. */
  supportEmail?: string | null;
  /** true = der persönliche Link wird noch nachgeladen. */
  linkPending?: boolean;
}) {
  const login = loginHref || "/login";

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border-2 p-6 sm:p-8 space-y-5 text-center shadow-lg ${className ?? ""}`}
      style={{ borderColor: primary }}
    >
      <div className="text-5xl leading-none">🎉</div>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold leading-tight">Herzlichen Glückwunsch!</h2>
        <p className="text-sm text-muted-foreground">
          Vielen Dank für das nette Gespräch — wir würden uns freuen, Sie im Team zu begrüßen.
        </p>
      </div>

      <p className="text-[15px] text-foreground leading-relaxed">
        {firstName ? `${firstName}, Ihr` : "Ihr"} Profil hat uns überzeugt – legen Sie jetzt Ihr
        Konto im Mitarbeiterportal an, das dauert nur 3–5 Minuten.
      </p>

      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border p-4 text-left">
        <p className="text-sm font-semibold mb-3">Wie geht es weiter?</p>
        <ol className="space-y-2.5">
          {[
            `Registrieren Sie sich im Mitarbeiterportal von ${company}`,
            "Erledigen Sie anschließend die nächsten Schritte in Ruhe im Portal",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-foreground">
              <span
                className="h-6 w-6 shrink-0 rounded-full text-white text-xs font-semibold flex items-center justify-center"
                style={{ background: primary }}
              >
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {registrationLink ? (
        <>
          <Button
            asChild
            size="lg"
            className="w-full font-semibold text-base h-12 shadow-md hover:shadow-lg transition-shadow"
            style={{ background: primary }}
          >
            <a href={registrationLink}>
              <UserPlus className="h-5 w-5 mr-2" />
              Jetzt registrieren
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">
            Schritt 1 von 5 · Dieser Link ist persönlich und nur für Sie gültig. In diesem Browser
            bleiben Ihre Eingaben erhalten, falls Sie kurz pausieren.
          </p>
          {mailFailed && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              ✉️ Die Bestätigungs-E-Mail ist noch unterwegs. Nutzen Sie zur Sicherheit direkt den
              Button oben — der Link funktioniert auch ohne E-Mail.
            </div>
          )}
        </>
      ) : linkPending ? (
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-border px-3 py-2 text-xs text-muted-foreground">
          ⏳ Ihr persönlicher Registrierungslink wird erstellt – einen Moment bitte.
        </div>
      ) : (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 space-y-1">
          <p>
            📬 Ihr persönlicher Registrierungslink kommt per E-Mail (bitte auch den Spam-Ordner
            prüfen).
          </p>
          <p>
            Sollte in 15 Minuten keine E-Mail da sein, schreiben Sie uns kurz
            {supportEmail ? (
              <>
                {" "}
                an{" "}
                <a href={`mailto:${supportEmail}`} className="underline font-medium">
                  {supportEmail}
                </a>
              </>
            ) : (
              <> – Ihre Ansprechpartner:in bei {company} hilft sofort weiter</>
            )}
            . Wir schicken den Link dann direkt erneut.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        ⏱️ Registrierung dauert ca. 3–5 Minuten · 📄 Vertrag digital unterschreiben · 🚀 Sofort
        startklar
      </p>

      <div className="pt-3 border-t border-border text-xs text-muted-foreground space-y-1">
        <p>Ich wünsche Ihnen einen erfolgreichen Start!</p>
        <p>
          Mit freundlichen Grüßen
          <br />
          <strong className="text-foreground">{recruiter}</strong>
          <br />
          HR Management · {company}
        </p>
        <p>
          Bereits registriert?{" "}
          <a href={login} className="underline hover:text-foreground">
            Zum Login
          </a>
        </p>
        {supportEmail && (
          <p>
            Fragen?{" "}
            <a href={`mailto:${supportEmail}`} className="underline hover:text-foreground">
              {supportEmail}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
