# WebID-Simulationsumgebung — Konzept & Plan

## Ziel

Ein Original-WebID-Gateway-Link (z. B. `https://webid-gateway.de/service/status/cn/000631/aid/620631658`)
lässt sich durch reines Austauschen der Domain in einen Simulationslink verwandeln
(z. B. `https://webid.uwk-consulting.de/service/status/cn/000631/aid/620631658`).
Pfad und Parameter bleiben 1:1 erhalten. Beim Aufruf wird die echte
WebID-Oberfläche transparent durchgereicht, aber eindeutig als Simulation
gekennzeichnet.

## Kernprinzip: transparenter Reverse-Proxy

Die Simulationsdomain ist ein dünner HTTP-Proxy vor `webid-gateway.de`:

```text
Teilnehmer ── https://webid.uwk-consulting.de/<pfad>
                │
                ▼
        Simulations-Server ── holt ── https://webid-gateway.de/<pfad>
                │  (rewritet HTML/CSS/JS-URLs, injiziert Overlay)
                ▼
        Antwort an Teilnehmer
```

Es werden **keine** Formulardaten abgefangen, gespeichert oder umgeleitet
— die Simulation ist nur eine Sichtebene.

## Simulations-Markierungen (Pflicht, immer sichtbar)

1. **Topbar** oben, volle Breite, hoher Kontrast:
   „⚠ SIMULATIONSUMGEBUNG – Keine echte Identifikation. Zu Schulungszwecken."
2. **Hinweis-Popup** beim ersten Seitenaufruf pro Session, muss aktiv
   bestätigt werden, bevor die Seite bedienbar wird.
3. **Seitentitel** wird zu `[SIMULATION] <Originaltitel>` umgeschrieben.
4. **Firmenlogo** (UWK/Kunde) unten rechts als fixierter Badge.
5. **Favicon** wird durch ein Simulations-Favicon ersetzt.

Serverseitig ins HTML injiziert und per CSP so verankert, dass Skripte
der Zielseite sie nicht entfernen.

## Domain & Hosting — Empfehlung

Vorhandene Landing-Server-Infrastruktur (`landing-server/`, Bun + Caddy
mit on-demand TLS) nachbauen. Vorteile:

- Caddy holt automatisch Let's-Encrypt-Zertifikate für jede neue
  Simulationsdomain.
- Trennung vom Portal (kein Risiko für Produktivdaten).

Neuer Bun-Service `webid-sim-server/` läuft auf `127.0.0.1:3002`, Caddy
leitet Simulationsdomains dorthin. Aktive Domains werden in einer neuen
Tabelle `webid_sim_domains` verwaltet, damit Anlage/Deaktivierung ohne
Server-Zugriff geht.

## Admin-UI im Portal

Neue Route `admin.webid-sim.tsx`:

- Liste aller Simulationsdomains (Domain, Kunde, aktiv, Ziel-Origin).
- Anlegen/Bearbeiten: Domain, Anzeigename, Logo-Upload, Topbar-Text,
  Ziel-Origin (Default `https://webid-gateway.de`).
- Aktion „Link umschreiben": Original-Link rein, Simulationslink raus
  (reiner Domain-Swap).
- Audit-Log für Aktivierung/Deaktivierung.

## Technische Details

- **Proxy**: Bun `fetch`, streamt Antworten. Setzt korrekten `Host`,
  reicht Cookies durch (Domain-Attribut wird auf Simulationsdomain
  umgeschrieben).
- **HTML-Rewrite**: bei `Content-Type: text/html` absolute Links auf
  `webid-gateway.de` → Simulationsdomain umschreiben; vor `</body>` das
  Overlay-Bundle injizieren; `<title>` präfixen; Favicon ersetzen.
- **Assets**: CSS/JS/Fonts/Bilder unverändert weiterreichen; in CSS
  `url(...)` absolute Origins mit umschreiben.
- **CSP**: eingehende CSP entfernen, eigene setzen, die Overlay erlaubt.
- **Guards**: nur GET/POST/OPTIONS, Rate-Limit pro IP, Pfad-Whitelist
  (`/service/*`, Assets), keine Weiterleitung an fremde Origins,
  Bodies/Query nicht loggen.
- **Robots**: `X-Robots-Tag: noindex, nofollow`, `/robots.txt` Disallow.

## Rechtlicher Rahmen

Nutzung ist freigegeben. Zusätzliche Schutzmechanismen:

- Nicht ausblendbare Simulations-Kennzeichnung.
- Kein Speichern von Identifikations- oder Formulardaten.
- `noindex`.
- Zugriffs-Log ohne PII (Zeit, Pfad, Status, IP-Hash).

## Umsetzung — Reihenfolge

1. Skelett `webid-sim-server/` (Bun): Reverse-Proxy für einen festen
   Ziel-Origin mit Overlay-Injektion.
2. Overlay-Bundle (Topbar + Popup + Logo-Badge + Titel/Favicon-Patch).
3. Caddy-Konfig analog `landing-server/Caddyfile`, `ask`-Endpoint zur
   Domain-Whitelist.
4. Tabelle `webid_sim_domains` + RLS + Admin-Route `admin.webid-sim.tsx`.
5. `webid-sim-server/setup.sh` analog `landing-server/setup.sh`.
6. Runbook-Eintrag: DNS-Setup, Domain anlegen, Deaktivierung.

## Nicht Teil dieses Plans

- Kein Fake-Ergebnis (bestätigt/abgelehnt) — dazu bräuchte es einen
  echten Nachbau der WebID-Logik, nicht nur einen Proxy. Falls später
  gewünscht: Folgeplan.
- Keine Integration ins bestehende (deaktivierte) `WEBID_ENABLED`-Modul
  im Mitarbeiter-Portal — die Simulation ist eigenständige Infra.

## Offene Fragen vor Umsetzung

- Welche Simulationsdomain(s) initial (z. B. `webid.uwk-consulting.de`)?
  DNS auf welchen Server?
- Welches Logo unten rechts (Datei/URL)?
- Bei POST-Requests (echte Submits): wirklich an WebID weiterleiten,
  oder Simulation stoppen und „Simulation beendet"-Screen zeigen?
  **Vorschlag: stoppen** — damit garantiert keine echte Identifikation
  ausgelöst wird.
