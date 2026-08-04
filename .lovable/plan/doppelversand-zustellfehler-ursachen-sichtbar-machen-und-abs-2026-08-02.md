# Doppelversand & Zustellfehler: Ursachen sichtbar machen und abstellen

## Was der Code heute tatsächlich macht

Ich habe die drei betroffenen Vorlagen im Versandpfad nachverfolgt:

- **booking_confirmation** wird in der Terminbestätigungs-Funktion pro Termin gesperrt (`booking_confirmation:<termin_id>`).
- **fasttrack_registration_pending_72h** und **vermittlung_rebook_after_cancel_24h** werden in der Bewerbungs-Erinnerungsfunktion pro Bewerbung gesperrt (`application_reminder:<bewerbung_id>:<art>`), zusätzlich über das Erinnerungsprotokoll und ein 20-Stunden-Fenster.

Daraus folgen drei konkrete Schwachstellen:

1. **Alle Sperren hängen am Vorgang, nicht am Empfänger.** Bewirbt sich dieselbe Person zweimal (oder bucht sie nach Absage neu), greift keine Sperre — die Person bekommt dieselbe Mail zweimal. Für den Empfänger ist das Doppelversand, technisch gilt es heute als korrekt.
2. **Der manuelle Sofort-Versand („Jetzt senden") umgeht sämtliche Sperren.** Im Force-Modus werden Bereits-gesendet-Prüfung, 20-Stunden-Fenster und die atomare Datenbank-Reservierung übersprungen. Ein Klick kurz vor oder nach einem Cron-Lauf erzeugt einen echten Doppelversand.
3. **Die Warnung im Mail-Center ist mehrdeutig.** Fehlt in einer Protokollzeile der Vorgangsbezug, gruppiert sie nur nach Vorlage + Adresse — dann erscheinen zwei getrennte Bewerbungen als „Doppelversand", obwohl die Sperre korrekt gearbeitet hat. Umgekehrt ist nicht erkennbar, ob Cron oder Handklick ausgelöst hat.

Welcher der drei Fälle bei den konkreten drei Adressen vorliegt, lässt sich ohne Blick in die Produktionsdatenbank nicht behaupten — deshalb steht die Diagnose als erster Schritt.

## Schritt 1: Diagnose (nur lesend)

Neues Skript `scripts/diagnose-duplicates.sh`, das für jede Doppelgruppe der letzten 7 Tage zeigt:

- Vorlage, Empfänger, Zeitpunkte, beteiligte Bewerbungs- und Termin-IDs
- Auslöser je Zeile (Cron-Funktion oder manueller Sofort-Versand, aus den Metadaten)
- Einstufung: `anderer Vorgang` (erwartbar) · `Handversand nach Cron` (Bedienfehler) · `echte Doppelung` (Code-Fehler)
- Gegenstück für die 63 Fehlversuche: Gruppierung nach Ursache, Mandant und Empfänger in Klartext („SMTP-Passwort falsch", „keine Zugangsdaten", „Provider-Limit", „Adresse existiert nicht")

Damit siehst du schwarz auf weiß, an welchen Punkten das System klemmt.

## Schritt 2: Empfängersperre ergänzen

Zusätzlich zur Vorgangssperre eine Sperre pro Empfänger + Vorlage (Standard 24 Stunden), angewendet in Terminbestätigung, Bewerbungs-Erinnerungen und Registrierungs-Erinnerungen. Blockierte Mails werden nicht verschluckt, sondern als übersprungen mit dem Grund „Gleiche Mail ging an diesen Empfänger bereits raus" protokolliert — sichtbar im Mail-Center und in der Mail-Kette des Bewerbers.

## Schritt 3: Handversand absichern

- Der Sofort-Versand läuft ebenfalls über die atomare Reservierung, ergänzt um eine Wiederhol-Kennung, damit ein bewusster zweiter Versand weiterhin möglich ist.
- Ging dieselbe Mail in den letzten 24 Stunden bereits raus, erscheint vor dem Senden eine Rückfrage mit Datum und Uhrzeit des letzten Versands.
- Jede Handsendung wird als solche protokolliert und bleibt in der Diagnose unterscheidbar.

## Schritt 4: Mail-Center schärfen

- Die Doppelversand-Karte zeigt je Gruppe Vorgang und Auslöser und trennt „erwartbar (anderer Vorgang)" von „echte Doppelung".
- Neue Karte „Warum Mails nicht ankamen": fehlgeschlagene Sendungen gruppiert nach Ursache mit konkretem nächsten Schritt je Mandant (Passwort erneuern, Zugangsdaten hinterlegen, Limit abwarten).

## Technische Details

- Diagnose als Shell-Skript im Stil von `scripts/diagnose-mail-failures.sh`, rein lesend, ohne Migration.
- Empfängersperre zentral in `supabase/functions/_shared/dedupe.ts` (Parameter `recipientWindowHours`), aufgerufen in `send-application-reminders`, `send-booking-confirmation`, `send-reminders`.
- Force-Pfad in `send-application-reminders/index.ts` (Zeilen ca. 810–853) reserviert künftig ebenfalls, statt die Sperre zu umgehen.
- UI-Anpassungen in `src/routes/admin.email-center.tsx` und `src/components/mail/MailChain.tsx`.
- Keine Protokollzeilen werden gelöscht; die Historie bleibt vollständig.

## Offene Entscheidung

Soll die Empfängersperre auch greifen, wenn wirklich **zwei verschiedene Bewerbungen** derselben Person vorliegen? Vorschlag: ja, mit 24-Stunden-Fenster. Sag Bescheid, falls du in diesem Fall beide Mails möchtest.