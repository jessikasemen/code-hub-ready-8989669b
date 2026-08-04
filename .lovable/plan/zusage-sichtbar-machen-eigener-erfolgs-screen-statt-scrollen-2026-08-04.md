# Zusage sichtbar machen: eigener Erfolgs-Screen statt Scrollen

## Ziel
Wer die Zusage bekommt, landet sofort auf einem klaren Erfolgs-Screen mit einem einzigen sichtbaren Schritt: „Jetzt registrieren“. Kein Scrollen, kein Suchen im Chatverlauf.

## Was sich für den Bewerber ändert

1. **Umschalten statt Anhängen**
   Sobald das Gespräch beendet und die Zusage erteilt ist, wird der Chatverlauf ausgeblendet und stattdessen der Zusage-Screen bildschirmfüllend angezeigt — direkt oben, ohne Scrollen.
   Der Verlauf bleibt erhalten und ist über einen unauffälligen Link „Gesprächsverlauf anzeigen“ ein-/ausklappbar (falls jemand nachlesen will).

2. **Herzlicher Abschluss auf dem Screen**
   Über dem Button steht die Gratulation, z. B.:
   „Vielen Dank für das nette Gespräch! Herzlichen Glückwunsch — wir würden uns freuen, Sie im Team zu begrüßen.“
   Darunter kurz: was jetzt passiert (Konto anlegen, 3–5 Minuten), dann der Button.

3. **Zusätzlich als letzte Chat-Nachricht**
   Die KI verabschiedet sich beim Abschluss mit einer freundlichen Gratulation, damit der Wechsel nicht abrupt wirkt. Der Text wird im Interview-Prompt für den Abschluss mit Zusage vorgegeben.

4. **Kein Link, kein Blindflug**
   Der bestehende Schutz bleibt: Button erscheint nur mit gültigem persönlichem Link; solange nachgeladen wird, ein Ladehinweis; scheitert es, klarer Support-Hinweis mit Tenant-E-Mail.

5. **Absage/neutraler Abschluss unverändert**
   Ist keine Zusage erteilt, bleibt alles wie heute (Danke-Karte, Chat sichtbar).

## Technische Umsetzung

- `src/routes/interview.$appId.tsx`
  - Neuer Zustand `accepted = ended && appStatus === "akzeptiert"`.
  - Bei `accepted`: Chat-Container (`scrollRef`-Block) und Eingabeleiste nicht rendern, stattdessen `ZusageCard` als erstes Element in `<main>`; sticky Zusage-Banner entfernen (redundant) und den Scroll-Effekt auf den Screen-Wechsel reduzieren.
  - Collapsible „Gesprächsverlauf anzeigen“ unterhalb der Karte, Default zu.
- `src/components/interview/ZusageCard.tsx`
  - Gratulations-Headline + Ein-Satz-Erklärung ergänzen, Button als primäre Aktion groß und zuerst; bestehende Token-/Support-Logik unangetastet.
- `src/routes/api/public/interview-chat.ts`
  - Im Abschluss-Teil des System-Prompts die Verabschiedung mit Gratulation vorgeben (nur für den Zusage-Fall), ohne die `[INTERVIEW_END]`-Mechanik zu verändern.

Keine Datenbank- oder Mail-Änderungen; keine Migration nötig.
