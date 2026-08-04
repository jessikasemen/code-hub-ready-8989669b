# Vor dem Tagesbetrieb: Kette absichern + Phase 4

## Deine zwei Fragen, einfach erklärt

**1. „24h-Erinnerungstext ist fest im Code"**
Die Mail „Morgen um 14:00 Uhr: Ihr Bewerbungsgespräch" existiert und geht raus, aber der Text steht im Programmcode statt in der Vorlagen-Verwaltung. Praktische Folgen:
- Du siehst die Zeile im E-Mail-Center, kannst Betreff/Text/Button aber nicht anpassen — jede Formulierungsänderung braucht mich.
- Alle Mandanten bekommen exakt denselben Text; mandantenspezifische Ansprache ist nicht möglich.
- Es ist kein Fehler und blockiert nichts. Nur Bearbeitbarkeit fehlt.

**2. „Phase 4"**
Zwei Nachfass-Mails, die heute noch fehlen bzw. nur halb existieren:
- *E-Mail bestätigen*: Wer das Registrierungsformular abschickt, muss danach noch eine Bestätigungsmail anklicken. Wer das nicht tut, hat ein Konto, das nie aktiv wird — und taucht bei dir als „nicht registriert" auf. Diese Erinnerung existiert bereits (`confirm_email`, 24h) und muss nur verifiziert werden.
- *Abgebrochene Registrierung*: Wer den Link öffnet und z. B. bei Schritt 2 aufhört, bekommt heute **gar nichts**. Genau diese Gruppe ist bei „12 Zusagen, 0 Registrierungen" der wahrscheinlichste Verlust. Neu zu bauen: eine kurze Erinnerung „Du warst fast fertig — hier weitermachen" mit demselben persönlichen Link.

## Wichtigster Punkt für heute: Reihenfolge des Deploys

Nichts von den letzten Änderungen ist eingespielt. Kritisch:
- Wird die neue Terminerinnerung (Funktion) **vor** der Datenbank-Migration `20260804010000_interview_reminder_24h` deployt, lehnt die Datenbank den Protokolleintrag ab → die Doppelversand-Sperre greift nicht → dieselbe 24h-Mail geht alle 10 Minuten erneut an denselben Bewerber. Das darf nicht passieren.
- Reihenfolge: **erst** `bash scripts/migrate.sh` (Migrationen), **dann** Edge Functions. `deploy-backend-local.sh` macht genau diese Reihenfolge automatisch.
- Betroffene Migrationen: `20260804000000_booking_window_7_days` (7-Tage-Fenster), `20260804010000_interview_reminder_24h`, `20260817000000_registration_progress` (Fortschritts-Sichtbarkeit).
- Ohne die Fortschritts-Migration zeigt die Statistik die neuen Stufen einfach als 0 an (kein Absturz, geprüft).

## Arbeitsschritte

1. **Vorflug-Check (read-only)**
   Skript, das gegen die Live-Datenbank prüft und eine Liste ausgibt: fehlende Spalten/Constraints, aktive Cron-Jobs (`send-application-reminders`, `send-appointment-reminders`, `send-reminders`), Zusagen ohne Mailversuch, Bewerbungen mit Termin > 7 Tage in der Zukunft, gesperrte Empfänger. Ergebnis vor dem Deploy anschauen — nichts wird verändert.

2. **Deploy in korrekter Reihenfolge**
   Migrationen, dann Funktionen, dann Schema-Cache-Reload; danach ein Trockenlauf der Reminder-Funktionen (`dryRun`), damit sichtbar ist, was sie senden *würden*, bevor sie wirklich senden.

3. **Phase 4a — Erinnerung bei abgebrochener Registrierung**
   Neue Stufe `registration_abandoned_24h`: Bewerbung hat Zusage + Link geöffnet oder Schritt ≥ 1, aber kein Konto. Läuft im bestehenden 30-Minuten-Cron mit, einmalig pro Bewerbung, Text als Tenant-Feld (bearbeitbar im E-Mail-Center), Fallback-Text im Code. Constraint um die neue Stufe erweitern.

4. **Phase 4b — „E-Mail bestätigen" verifizieren**
   Die Stufe existiert. Prüfen, dass sie beim aktuellen Mandanten wirklich greift (SMTP aktiv, nicht pausiert, kein Empfänger-Block) und im E-Mail-Center sichtbar protokolliert wird. Nur reparieren, was nicht greift.

5. **24h-Terminmail editierbar machen**
   Betreff/Text/Button als Tenant-Felder (`reminder_interview_24h_*`) inkl. Migration, Vorlagen-Editor und Fallback auf den heutigen Text — analog zur 30-Minuten-Mail.

6. **Textdurchgang Zusage → Registrierung**
   Zusage-Mail, Zusage-Screen, Registrierungs-Wizard und Erfolgsseite auf eine Handlung und eine Sprache bringen: gleiche Zeitangabe (3–5 Min), gleicher Schrittzähler, klarer Hinweis auf die Bestätigungsmail inkl. Spam-Ordner, Support-Adresse des Mandanten überall sichtbar. Struktur des Registrierungsprozesses bleibt unverändert.

## Technische Details

- Vorflug-Check als `scripts/preflight-applicant-chain.sh` (nur `SELECT`).
- Neue Stufe in `supabase/functions/send-application-reminders/index.ts` (`ReminderKind`, Kandidatenauswahl über `registration_step`/`registration_link_opened_at`, Tenant-Felder + `DEFAULTS`), Migration erweitert `application_reminder_log_reminder_kind_check`.
- 24h-Mail: `bewerbung_reminder_24h_subject/body/button` auf `tenants`, gelesen in `send-appointment-reminders`, gepflegt in `admin.email-templates.tsx`, Kette in `src/lib/mail-chain.ts` als editierbar markieren.
- Texte: `src/components/interview/ZusageCard.tsx`, `src/routes/register.tsx` (Erfolgsschritt 99), `send-invitation-email` Standardvorlage.
