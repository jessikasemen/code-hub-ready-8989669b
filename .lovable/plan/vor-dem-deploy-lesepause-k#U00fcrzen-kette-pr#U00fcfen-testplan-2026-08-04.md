# Vor dem Deploy: Lesepause kürzen, Kette prüfen, Testplan

## 1. Antwort: Funktioniert die Mail „Onboarding (Perso/Vertrag)"?

Geprüft im Reminder-Job (`send-reminders`, Abschnitt „Complete-Registration"):

- Sie geht nur an Konten mit **bestätigter E-Mail** und Profil, dessen Onboarding nicht abgeschlossen ist (deaktiviert/abgelehnt ausgeschlossen).
- Sie listet konkret, was fehlt: „Personalausweis (Identitätsprüfung)" wenn keine KYC-Prüfung eingereicht/verifiziert ist, „Unterschriebener Arbeitsvertrag" wenn kein Vertrag vorliegt.
- Betreff/Text kommen aus den Tenant-Vorlagen (im Vorlagen-Editor änderbar), Fallback ist die Standardvorlage.
- Doppelversand ist über die Ereignissperre in der Datenbank blockiert; Bounces, „cold"-Bewerbungen und Stundenlimits werden respektiert; nach der letzten Stufe der Staffel stoppt sie.

Fazit: technisch korrekt verdrahtet. Was hier **nicht** lokal prüfbar ist: ob auf dem Live-Server die Cron-Jobs laufen und die SMTP-Zugänge gültig sind — das steht im Testplan unten.

## 2. Lesepause nach der Zusage kürzen

Aktuell: 8 Sekunden, bevor der Zusage-Screen den Chat ersetzt (nur im laufenden Gespräch; nach einem Reload erscheint der Screen sofort).

Änderung:

- Pause auf **4 Sekunden** reduzieren.
- Während der Pause ein dezenter Hinweis mit Button „Weiter zur Registrierung", damit niemand warten muss, der schnell ist.
- Wer tippt/liest, verliert nichts: der Verlauf bleibt über „Gesprächsverlauf anzeigen" aufklappbar.

## 3. Woran lag es: 12 Zusagen, 0 Registrierungen

Der Ablauf hatte mehrere Stellen, an denen der Weg endete, ohne dass es jemand sah:

1. **Kein sichtbarer nächster Schritt.** Der „Jetzt registrieren"-Button lag unter dem Chat — man musste scrollen. (behoben: Zusage-Screen ersetzt den Chat)
2. **Kein persönlicher Link.** Fehlte das Token, zeigte die Karte einen Link, der später abbrach; nachgezogen wurde nichts. (behoben: Token wird idempotent erzeugt, Button erscheint nur mit gültigem Link, sonst Support-Kontakt)
3. **Keine Zusage-Mail.** Wer die Seite verließ, hatte keinen zweiten Zugang. (behoben: Versand + Nachversand, Sichtbarkeit in der Statistik als „Zusage ohne Mail")
4. **Registrierung war unsichtbar.** Gespeichert wurde erst in Schritt 5 — ein Abbruch in Schritt 2 sah wie „nie angefangen" aus. (behoben: Fortschritts-Stempel Schritt 1–5 + Erinnerung „Registrierung abgebrochen")
5. **Abschreckende Texte.** Dichte Blöcke mit Ausweis/IBAN direkt nach der Zusage, falsche Minijob-Grenze (538 € statt 603 €), sehr häufige Namensnennung. (behoben)

Das war also überwiegend ein Loch in der Kette, nicht fehlender Wille. Der ehrliche Vorbehalt: ob die Registrierungsquote jetzt steigt, zeigt erst der erste Tag mit Live-Zahlen — dafür ist der Funnel in der Statistik jetzt vollständig sichtbar.

## 4. Deploy-Vorbereitung (was ich mache)

- Lesepause kürzen (Punkt 2).
- Kompletter Durchlauf lokal: Typprüfung, Lint, Build, und ein Klick-Durchlauf Interview → Zusage → Registrierungs-Wizard (Schritt 1–5) im Preview.
- Gegencheck, dass die drei neuen Migrationen (7-Tage-Fenster, Fortschritt, abgebrochene Registrierung/24-h-Vorlagen) in `supabase/manual-migrations/` liegen und in der richtigen Reihenfolge sortiert sind.

## 5. Was du testen solltest (nach dem Deploy, ca. 10 Minuten)

Auf dem Server:

1. `bash scripts/preflight-applicant-chain.sh` — prüft Kette, Cron-Jobs und offene Zusagen ohne Mail.
2. `bash scripts/check-mail-health.sh` — SMTP-Zugänge und letzte Fehler.
3. Deploy: `bash /opt/apps/portal/scripts/deploy.sh` (spielt die neuen Migrationen mit ein).

Im Portal von Hand:

4. Testbewerbung abschicken → Bestätigungsmail kommt an.
5. Termin buchen → Bestätigung mit Kalenderdatei; stornieren → Absage mit Neubuchungs-Link.
6. Interview bis zur Zusage führen → Zusage-Screen erscheint nach kurzer Pause, „Jetzt registrieren" führt zu `/register?token=…`.
7. Registrierung in Schritt 2 abbrechen, Seite neu laden → Eingaben noch da; in der Statistik steigt „Registrierung begonnen".
8. Registrierung abschließen → Bestätigungsmail; danach in Statistik als registriert sichtbar.
9. E-Mail-Center: „Onboarding (Perso/Vertrag)" öffnen, Testversand an deine Adresse — Text muss die fehlenden Unterlagen benennen.

## Technische Details

- `src/routes/interview.$appId.tsx`: Timeout 8000 → 4000 ms, plus Skip-Button im Pausenzustand.
- Keine Backend-Änderung nötig; die Reminder-Logik in `supabase/functions/send-reminders/index.ts` bleibt unverändert.
