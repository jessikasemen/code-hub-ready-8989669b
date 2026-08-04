# Bewerberkette vor dem nächsten Einsatz absichern

## Bestätigte Befunde

- **Shokoufeh hätte keine Zusage bekommen dürfen.** Die aktuelle Auswertung lehnt nur bei fehlender Zeit, fehlendem Interesse oder unseriösem Verhalten ab. Eine klare Aussage wie „Unter diesen Bedingungen kann ich die Tätigkeit nicht annehmen“ ist nicht als Absagegrund abgesichert. Dadurch kann die KI trotzdem `akzeptiert` setzen, den Registrierungslink erzeugen und die Zusage-Mail senden.
- **Die Entscheidung ist zu stark auf Zusage voreingestellt.** Ein einziges KI-Ergebnis entscheidet binär; auch die technische Notauswertung lädt standardmäßig ein und erkennt konditionsbezogene Absagen nicht zuverlässig.
- **Individuell gespeicherte Landing-Prompts können alte Texte weiterverwenden.** Der neue Standard-Prompt allein garantiert deshalb noch nicht überall 603 €, wenig Namenswiederholungen und vollständige Antworten auf Bewerberfragen.
- **Die Zusage ist jetzt sichtbar geplant/umgesetzt:** Nach der letzten Chatnachricht bleibt eine Lesepause, danach ersetzt der Zusage-Screen den Chat; der Verlauf bleibt aufklappbar. Der Button erscheint nur mit persönlichem Registrierungslink.
- **Mail-Center ist fast, aber nicht vollständig konsistent.** Die Mail für fehlenden Personalausweis/Vertrag ist als „Onboarding (Perso/Vertrag)“ vorhanden. Die neue Mail „Registrierung begonnen, nicht beendet“ ist editierbar, fehlt aber in Teilen der Mail-Center-Auswertung und Beschriftung. Ein inaktiver Legacy-Eintrag wird noch als aktiver Ablauf dargestellt.
- **Noch nichts davon ist deployed.** Bestehende Live-Chats und alte Zusagen werden durch reine Codeänderungen nicht rückwirkend korrigiert.

## Umsetzung

1. **Fehlzusagen technisch verhindern**
   - Vor jeder KI-Auswertung eine enge Sicherheitsregel anwenden: Eine ausdrückliche Ablehnung der Tätigkeit oder der angebotenen Konditionen erzwingt `reject`.
   - Reine Gehaltsfragen, Verhandlungen oder der Wunsch nach Klärung bleiben erlaubt und führen nicht automatisch zur Absage.
   - Dieselbe Regel in Chat, Voice und technischer Notauswertung verwenden.
   - Bei klarer Ablehnung ehrlich und wertschätzend abschließen, statt eine spätere interne Prüfung vorzutäuschen.

2. **Interview-Prompt verbindlich humanisieren**
   - Den gewählten Auftritt beibehalten: Recruiterin tritt als Person aus dem HR-Team auf, reagiert auf Bot-Fragen aber abwechslungsreicher und weniger wie mit einem starren Dementi-Textbaustein.
   - Bewerberfrage immer zuerst konkret beantworten; danach höchstens eine eigene Frage.
   - Vorname nur bei Begrüßung und Abschluss verwenden.
   - 603 € als verbindliche Minijob-Grenze 2026 ergänzen und alte 538-/553-€-Angaben überschreiben.
   - Diese Kernregeln als abschließende Vorgaben an alle Gespräche anhängen, damit auch ältere individuelle Landing-Prompts sie nicht aushebeln.

3. **Zusage- und Registrierungsübergang prüfen**
   - Lesepause und Screen-Wechsel auf Reload, langsamen Linkaufbau und fehlgeschlagenen Mailversand testen.
   - Sicherstellen, dass Button und Zusage-Mail dieselbe Portal-Domain und denselben persönlichen Token verwenden.
   - Prüfen, dass ein Bewerber bei einer echten Zusage sofort einen nutzbaren Button sieht und bei fehlendem Link einen klaren Lade- oder Supportzustand erhält.
   - Den noch laufenden Detail-Audit der Registrierungsstrecke auswerten und ausschließlich bestätigte Fehler korrigieren.

4. **Mail-Center mit dem realen Versand synchronisieren**
   - „Registrierung begonnen, nicht beendet“ in Abdeckung, Statistik und lesbare Labels aufnehmen.
   - Den deaktivierten Legacy-Reminder „Akzeptiert, aber kein Account“ nicht länger als aktiven Ablauf darstellen; der aktuelle Zusage-Reminder läuft bereits 24/72 Stunden über die Bewerberkette.
   - „Onboarding (Perso/Vertrag)“ beibehalten und prüfen, dass Betreff/Text weiterhin über `reminder_completion_*` bearbeitbar sind.
   - Nicht editierbare Erst-Bestätigungsmails im Center klar von der editierbaren 24h-Erinnerung unterscheiden, statt eine vollständige Editierbarkeit vorzutäuschen.

5. **Vor Deployment validieren**
   - Entscheidungsfälle testen: klare Zusage, Gehaltsfrage, Verhandlungswunsch, klare Konditions-Absage, allgemeine Absage und technische Notauswertung.
   - Chat- und Voice-Abschluss sowie Zusage-Screen im Browser durchspielen.
   - Relevante Tests und den bestehenden Bewerberketten-Preflight ausführen.
   - Keine Migration oder Funktion live ausrollen, bis die Prüfung fehlerfrei ist; anschließend einen gemeinsamen Deploy der zusammengehörigen Änderungen vorbereiten.

## Erwartetes Ergebnis

Interessierte Bewerber erhalten eine menschlichere, korrekte Unterhaltung und nach echter Zusage einen unübersehbaren Registrierungsweg. Bewerber, die die Konditionen ausdrücklich ablehnen, werden nicht mehr fälschlich als Zusage gezählt oder mit Registrierungs-Mails angeschrieben. Das Mail-Center bildet die tatsächlich aktiven Bewerber- und Onboarding-Mails nachvollziehbar ab.