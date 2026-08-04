# Bewerber → Mitarbeiter: Leckagen schließen (überarbeitet)

Angepasst an dein Feedback. SMS bleibt draußen, Registrierungsprozess bleibt wie er ist, Statistik wird erweitert statt neu gebaut.

## Korrektur zu meinem letzten Punkt

Nächtliche Erinnerungen **gehen nicht verloren**. Der Lauf bricht zwischen 22 und 6 Uhr komplett ab, aber die Fälligkeit ist ein breites Zeitfenster (z. B. „24 h bis 72 h nach Bewerbung"), und nur ein tatsächlich versendeter Reminder blockiert weitere Versuche. Der erste Lauf ab 6 Uhr holt die Nacht also nach. Punkt 5 aus dem alten Plan ist damit vom Tisch.

## Schritt 1 — Zusage-Mail: prüfen, ob dein Fix von heute wirklich greift

Du hast vor 7–8 Stunden am Mailversand gearbeitet. Bevor wir daran etwas anfassen, wird nachgesehen:
- Wie viele Bewerbungen mit Zusage haben bis heute **keinen** Versandversuch (weder gesendet, noch fehlgeschlagen, noch übersprungen)?
- Ab welchem Zeitpunkt ist die Lücke verschwunden — gibt es nach dem Fix noch neue Fälle?

Ergebnis entscheidet:
- **Keine neuen Fälle** → nur die Altfälle einmalig mit frischem Registrierungslink nachversorgen.
- **Weiterhin neue Fälle** → der Zusage-Pfad wird so umgebaut, dass eine Zusage ohne protokollierten Versandversuch nicht mehr entstehen kann, plus ein Wächter-Lauf, der Zusagen ohne Versuch automatisch nachträglich auslöst.

## Schritt 2 — Terminvorlauf auf 7 Tage

Das Buchungsfenster steht projektweit auf 60 Tage. Es wird auf **7 Tage** gesetzt: Standardwert für neue Verfügbarkeiten und bestehende Verfügbarkeiten werden mit heruntergezogen. Bewerber sehen dann nur noch Slots innerhalb der nächsten Woche.

Für den Fall „Bewerber kann in der Woche nicht": Termine lassen sich weiter im Admin manuell vergeben, und wer nichts Passendes findet, landet über den Absage-/Neubuchungs-Weg wieder in der Erinnerungsstaffel. Der Wert bleibt jederzeit im Panel unter Verfügbarkeiten änderbar, falls 7 Tage zu knapp sind.

## Schritt 3 — Statistik zum echten Funnel ausbauen

Die bestehende Statistik-Seite wird um eine Trichter-Ansicht erweitert:
Bewerbung → Termin gebucht → Termin gehalten → Zusage → Zusage-Mail zugestellt → registriert → Vertrag → Ausweis → Mitarbeiter.
Pro Stufe: Anzahl, Prozent von der Vorstufe, absoluter Verlust; filterbar nach Zeitraum und Landingpage. Damit ist belegbar, wo die Bewerber wirklich abbrechen, statt es aus Listen zu schätzen.

## Schritt 4 — Show-Rate am Termin

- **24-h-Erinnerung** vor dem Interview zusätzlich zur bestehenden 30-Minuten-Mail. Beide mit Terminlink zum Verschieben/Stornieren, damit statt eines No-Shows eine Neubuchung entsteht.
- **Kalenderdatei** bleibt in der Buchungsbestätigung als Beigabe — kein Kernbestandteil, da sie kaum genutzt wird.
- **Absage-Flow**: In der Stornierungs-Bestätigung steht direkt der Link zur neuen Terminauswahl, nicht erst 24 Stunden später als Erinnerung.

## Was bleibt unverändert

- Registrierungsprozess im Portal (wie beim Kollegen) — kein Kürzen, keine passwortlose Variante.
- Kein SMS-Kanal in diesem Schritt; als späterer Ausbau vorgemerkt.

## „Drosselung" — einfach erklärt

Der Mailanbieter erlaubt nur **150 Mails pro Stunde**, und nur zwischen 6 und 22 Uhr. Wenn wir für die Altfälle plötzlich mehrere hundert Zusage-Mails nachschicken, würde das dieses Limit reißen und der Anbieter würde blockieren oder die Adresse als Spam einstufen.

Deshalb der Nachversand portionsweise: eine feste Anzahl pro Lauf, dann Pause, bis alle durch sind. Jede Mail wird protokolliert — versendet, fehlgeschlagen oder auf später verschoben — sodass niemand doppelt eine Mail bekommt und niemand vergessen wird. Für dich heißt das nur: die Aufholaktion ist nach ein paar Stunden fertig statt nach einer Minute.

## Technische Notizen

- Buchungsfenster: `availability_schedules.max_days_ahead` (Default 60 → 7, Bestand hochgezogen), plus Anzeige/Einstellung in der Verfügbarkeiten-Ansicht.
- Zusage-Prüfung: `applications.invite_mail_status/-_error/-_at`, `invitation_tokens`, `email_send_log`.
- Erinnerungen: `send-appointment-reminders` (bisher nur Fenster 25–40 Min vor Termin) erhält eine 24-h-Stufe mit eigenem `reminder_kind` und eigener Log-Zeile für Idempotenz.
- Nachversand nutzt die vorhandenen Sende-Wächter (`send-guard`, `send-claim`) mit Lauf-Limit statt eines Massenversands.
- Statistik-Erweiterung ist rein lesend.
