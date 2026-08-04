# Zusage → Registrierung: die Lücke schließen

12 Zusagen in 24 h, 0 Registrierungen. Ich habe die Kette Interview → Zusage-Screen → `/register` Zeile für Zeile durchgesehen. Der Text ist nur ein Teil des Problems — es gibt zwei harte Stolperstellen im Ablauf und eine Stelle, an der der Link kaputt sein kann.

## Was ich im Code gefunden habe

**1. Der Registrierungslink kann ohne Token rausgehen.**
Der „Jetzt registrieren"-Button nutzt den persönlichen Token-Link. Fehlt der (weil kein Token gefunden wurde), fällt er auf `/register` **ohne** Token zurück. Folge: E-Mail nicht vorbefüllt, Firma nicht zugeordnet, Bewerbung nicht verknüpft — und am Ende des Formulars bricht es mit „Tenant konnte nicht ermittelt werden" ab. Wer über diesen Fallback geht, kann die Registrierung im schlechtesten Fall gar nicht abschließen und taucht in der Statistik nie als registriert auf.

**2. Das Konto entsteht nicht in Schritt 1 — nachgeprüft.**
Du hattest recht mit der Erwartung, aber so ist es nicht gebaut: Schritt 1 prüft nur E-Mail/Passwort auf Plausibilität und schaltet weiter, ohne etwas anzulegen. Auch Schritt 2 bis 4 speichern nichts — im Code steht ausdrücklich „Account & Profil werden ERST jetzt angelegt – nach allen 5 Schritten". Zwischenstände liegen nur im Browser des Bewerbers. Wer bei Schritt 2 abbricht, hinterlässt keine Spur, und wir sehen „0 registriert", ohne zu wissen, ob überhaupt jemand angefangen hat.


**3. Erinnerungen greifen genau dort nicht, wo es weh tut.**
Die Erinnerungen für „Zusage erteilt, aber nicht registriert" (24 h und 72 h) gibt es und sie funktionieren. Sie hören aber auf, sobald ein Benutzerkonto zur E-Mail existiert — **unabhängig davon, ob die Bestätigungs-Mail geklickt wurde**. Wer das Formular komplett ausfüllt und die Bestätigung nie öffnet, gilt für die Erinnerungslogik als registriert und hört ab da nichts mehr. Genau dieser Fall ist der teuerste, denn der Bewerber war schon durch. Zusätzlich enden die Erinnerungen nach rund acht Tagen komplett.
**4. Die Texte schrecken ab.**
Der Zusage-Screen verspricht „Dauert nur 5 Minuten", verlangt im selben Atemzug aber „Bitte bereithalten: Personalausweis, IBAN, Steuer-ID". Diese Angaben braucht es erst später im Portal, nicht für die Registrierung. Wer sie nicht zur Hand hat, verschiebt — und kommt nicht zurück.

## Was ich umsetzen möchte

### Phase 1 — Link absichern (technischer Kern)
- Der Zusage-Screen zeigt den Button nur mit gültigem Token-Link. Ist keiner vorhanden, wird einer nachgezogen; erst wenn das scheitert, erscheint statt des Buttons ein klarer Hinweis mit Support-Kontakt — statt eines Links, der später abbricht.
- `/register` ohne Token: verbleibende Fälle bekommen einen verständlichen Hinweis samt „Link erneut anfordern" statt der Fehlermeldung am Ende des Formulars.

### Phase 2 — Texte und Reibung (das, was du angesprochen hast)
Zusage-Screen:
- Klare Reihenfolge: nur **eine** Handlung („Zugang aktivieren"), Rest darunter.
- Der Hinweis auf Ausweis/IBAN/Steuer-ID wandert aus dem Zusage-Screen heraus dorthin, wo er gebraucht wird (Portal-Onboarding). Statt dessen: „Jetzt nur Name, Adresse und Startdatum — ca. 3 Minuten."
- Ehrliche Zeitangabe und Fortschritt („Schritt 1 von 5") statt pauschal „5 Minuten".
- Hinweis, dass der Link persönlich und nur für den Bewerber gültig ist, plus „Sie können jederzeit pausieren — Ihre Eingaben bleiben gespeichert". Zur Gültigkeit: der Registrierungslink hat **kein Ablaufdatum**, er ist nur einmalig verwendbar (nach abgeschlossener Registrierung entwertet). Ein Link von vor zwei Wochen funktioniert also weiterhin — die Aussage ist damit sauber.

Registrierungs-Formular (Ablauf bleibt wie beim Kollegen, nur Beschriftung):
- Passwortfeld mit Begründung („damit Sie später wieder in Ihr Portal kommen") statt nacktem „Min. 6 Zeichen".
- Pflichtfeld-Fehlermeldungen benennen das fehlende Feld statt „Bitte alle Pflichtfelder ausfüllen".
- Abschluss-Screen: Bestätigungs-E-Mail deutlicher erklären, Absender nennen, Spam-Hinweis, „Erneut senden" prominenter.
- Keine Vorbefüllung von Name/Telefon aus der Bewerbung — von dir gestrichen, bleibt draußen.

### Phase 3 — Abbruchstelle sichtbar machen (so, wie du es erwartet hattest)
Der Fortschritt wird ab Schritt 1 festgehalten, ohne den Ablauf zu ändern: sobald E-Mail und Passwort gesetzt sind, wird der Fortschritt an die Bewerbung geschrieben („Registrierung Schritt 1 erreicht"), und mit jedem weiteren Schritt aktualisiert. Damit steht in der Bewerbung, wo jemand ausgestiegen ist — ohne halbe Konten anzulegen (das würde sonst blockieren, wenn der Bewerber es später mit derselben E-Mail erneut versucht).

In der Statistik kommt dazu: „Link geöffnet / Schritt 1 / … / Formular abgeschickt / E-Mail bestätigt". Nach 24 h wissen wir dann exakt, ob die 12 gar nicht klicken, bei Schritt 3 aufgeben oder an der Bestätigungs-Mail hängen.

### Phase 4 — Nachfassen an der richtigen Stelle
- **Neu und wichtig:** eigene Erinnerung „E-Mail-Adresse bestätigen" für alle, die das Formular abgeschickt, aber die Bestätigung nicht geklickt haben. Diese Gruppe fällt heute durchs Raster, weil die bestehende Registrierungs-Erinnerung sie schon als registriert zählt.
- Erinnerung für abgebrochene Registrierungen (Schritt 1–4 erreicht, nie abgeschickt) mit demselben persönlichen Link.
- Beides läuft über die bestehende Erinnerungs-Mechanik mit Idempotenz, kein neues System.

## Technische Details
- `src/components/interview/ZusageCard.tsx`: Textblöcke, eine primäre Aktion, Ausweis/IBAN-Hinweis entfernen, Zustand „kein Link vorhanden".
- `src/routes/interview.$appId.tsx` und `interview.voice.$appId.tsx`: Fallback `${portalBase}/register` ohne Token entfernen; Token bei Bedarf nachladen.
- `src/routes/api/public/interview-chat.ts` / `src/lib/interview-engine.server.ts`: bei „invite" garantiert Token erzeugen und zurückgeben, auch wenn der Mailversand scheitert.
- `src/routes/register.tsx`, `src/components/register/StepAccount.tsx`: Texte, feldgenaue Fehlermeldungen, Abschluss-Screen, Fortschritts-Meldung ab Schritt 1 (Konto/Profil weiterhin erst am Ende).
- Fortschritts-Protokoll: schmale Spalten an `applications` (erreichter Schritt + Zeitpunkt), gesetzt über eine tokengebundene Server-Funktion; Auswertung in `src/lib/landing-cohorts.functions.ts` und `src/routes/admin.statistiken.tsx`.
- `supabase/functions/send-application-reminders`: bestehende `registration_pending`-Logik unterscheidet künftig „kein Konto" von „Konto ohne bestätigte E-Mail" (`email_confirmed_at`) und erhält eine eigene Stufe dafür, inklusive Eintrag in die erlaubten Reminder-Arten.
- Registrierungslinks (`invitation_tokens`) haben kein Ablaufdatum, nur `used` — keine Änderung nötig.

## Reihenfolge
Phase 1 und 2 zusammen (beide betreffen dieselben Dateien), dann Phase 3, danach Phase 4. Der Registrierungsprozess selbst — fünf Schritte, Passwort, E-Mail-Bestätigung — bleibt unverändert, wie du es festgelegt hast.
