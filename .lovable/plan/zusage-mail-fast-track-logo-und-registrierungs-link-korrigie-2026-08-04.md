# Zusage-Mail: Fast-Track-Logo und Registrierungs-Link korrigieren

Beide Fehler haben dieselbe Ursache: die Zusage-Mail wird korrekt über den **Fast-Track**-Mandanten (MuS Marketing) verschickt — Logo und Registrierungs-Link werden aber aus der **Vermittlungs**-Seite (W3) abgeleitet.

## Was im Code steht (geprüft)

**Absender ist bereits richtig.** `send-invitation-email` leitet die Vorlage `invitation`/`welcome`/`registration` per zentralem Resolver zwangsweise auf `applications.fasttrack_tenant_id` um (deshalb steht MuS Marketing in der Signatur).

**Der Link nutzt diese Auflösung nicht.** `resolvePortalBase` in `src/lib/interview-engine.server.ts` baut die Portal-Basis aus
1. `target_landing_id` → deren `domain`, sonst
2. `applications.tenant_id` → `primary_domain`/`domain`, sonst
3. Request-Origin.

`applications.tenant_id` ist bei Vermittlungs-Bewerbungen der Vermittlungs-Mandant. Fehlt oder zeigt `target_landing_id` auf die Vermittlungs-Landing, entsteht genau `https://portal.w3-personal.de/register?token=…` — der Token gehört aber zum MuS-Mandanten, die Registrierung läuft dort ins Leere. Die Fast-Track-Seite (`linked_fasttrack_landing_id`) und `fasttrack_tenant_id` werden hier gar nicht berücksichtigt.

**Das Logo fällt auf die Vermittlungs-Landing zurück.** Für Nicht-Broker-Mails ist die Kandidatenreihenfolge `tenant.logo_url` → Fast-Track-Landing → Ziel-Landing → **Quell-Landing**. Ist das Tenant-Logo leer bzw. nicht absolut `https://` und keine Fast-Track-Landing verknüpft, greift die Quell-/Ziel-Landing der Vermittlung — das W3-Logo im Screenshot.

## Was ich ändern möchte

### 1. Portal-Basis strikt aus dem Fast-Track-Kontext
Neue gemeinsame Auflösung für Registrierungs-Links, in dieser Reihenfolge:
1. verknüpfte Fast-Track-Landing (`linked_fasttrack_landing_id` der Quell-Landing, bzw. `target_landing_id`, sofern `flow_type != 'broker'`) → `domain`
2. `applications.fasttrack_tenant_id` → `primary_domain`/`domain`
3. `applications.tenant_id` **nur**, wenn dieser Mandant nicht der Vermittlungs-Mandant ist (`broker_tenant_id`)

Lässt sich keine Fast-Track-Domain bestimmen, wird **kein** Link mit falschem Host gebaut: die Einladung wird als `failed` mit klarem Grund protokolliert (`missing_fasttrack_portal_domain`) und im Zusage-Screen erscheint der bestehende Support-Hinweis statt eines kaputten Buttons.

### 2. Logo: keine Vermittlungs-Quelle in Fast-Track-Mails
Für Fast-Track-Vorlagen (`invitation`, `welcome`, `registration`, `registration_complete`) gilt: Fast-Track-Landing → Tenant-Logo des Fast-Track-Mandanten → Ziel-Landing **nur wenn nicht `flow_type = 'broker'`**. Die Quell-Landing der Vermittlung entfällt als Kandidat. Findet sich kein Logo, geht die Mail ohne Logo raus (wie bisher) und `email_logo_reason` zeigt im Mail-Center, warum.

### 3. Dieselbe Basis überall
Der Zusage-Screen im Interview holt seinen Link über `getExistingRegistrationLink`/`ensureRegistrationLink` — beide nutzen künftig die neue Auflösung, damit Mail-Link und Button-Link identisch sind. Auch der Reminder-Pfad (`resend-invites`, `process-invite-resend-queue`) wird auf dieselbe Logik geprüft und angeglichen.

## Technische Details
- `src/lib/interview-engine.server.ts`: `resolvePortalBase` → Fast-Track-Auflösung (Landing → `fasttrack_tenant_id` → Tenant, sofern kein Broker), Rückgabe `null` statt Broker-Host; `ensureRegistrationLink`/`getExistingRegistrationLink` behandeln `null` als Fehler mit Grund.
- `supabase/functions/send-invitation-email/index.ts`: Logo-Kandidaten für Fast-Track-Flow neu ordnen, Broker-Landings ausschließen (`flow_type`-Prüfung ist bereits geladen).
- Prüfen und ggf. angleichen: `src/lib/resend-invites.functions.ts`, `supabase/functions/process-invite-resend-queue/index.ts`, `src/routes/api/public/applications.ts` (`portalBaseFromTenant`) — überall gilt: Registrierungs-Links nie aus dem Vermittlungs-Mandanten.
- Keine Migration, keine Schema-Änderung.

## Verifikation
- Diagnose-Skript `scripts/diagnose-invite-mail.sh` für die betroffene Bewerbung (nur lesend): zeigt Fast-Track-Mandant, Token und `email_logo_source`/`email_logo_reason`.
- Danach Testversand über den bestehenden Dry-Run/Test-Pfad: Link muss auf die MuS-Portal-Domain zeigen, Logo aus der Fast-Track-Quelle stammen.
