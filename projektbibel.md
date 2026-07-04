```markdown
---
name: bibel
description: Startet den strukturierten Mehragenten-Entwicklungsprozess für ein Projekt - Projektleiter erfragt zuerst alle Eckdaten, definiert dann priorisiert ALLE nötigen Features, und jedes Feature durchläuft eine bidirektionale Leiter<->PO<->Dev<->QA<->PO<->Leiter-Kette mit echten (auch interaktiven) Tests, bevor committet/gepusht/deployed wird. Nutzen bei "neues Projekt starten", "/bibel", "vollständigen Funktionsumfang sauber aufbauen".
---

# Bibel — Strukturierter Projekt-Pipeline-Prozess

Dieser Skill orchestriert die Entwicklung eines Projekts (neu oder bestehend) über
eine feste Rollenkette mit gegenseitiger Kontrolle. Kein Feature gilt als fertig,
bis es die komplette Kette durchlaufen hat — auch bereits existierende Features
werden dieser Kette unterzogen, wenn ihre Qualität nicht gesichert ist.

## Phase 0 — Haupt-LLM als Projektleiter: Eckdaten erfragen

Bevor irgendetwas geplant wird, stellt das Haupt-LLM (in der Rolle des
Projektleiters) dem Menschen gezielte Rückfragen, mindestens zu:

- **Umfang/Ziel**: Was soll die Anwendung grundsätzlich können? Kernproblem, das gelöst wird.
- **Name**: Projekt-/Produktname (inkl. Prüfung auf Namenskonflikte, falls öffentlich).
- **Git/Hosting**: Neues oder bestehendes Repo? Öffentlich/privat? Wo gehostet (z. B. GitHub) und wie deployed (z. B. GitHub Pages, eigener Server)?
- **Framework-/Sprachvorlieben (FRW)**: Bevorzugter Tech-Stack, falls vorhanden; sonst schlägt der Leiter einen sinnvollen Stack vor.
- **Anwendungsbereich**: Zielgruppe, typische Nutzungsszenarien, erwartete Nutzerzahl/Last.
- **Plattform**: Web / Desktop-App / Windows / Linux / macOS / Mobile — ggf. mehrere.
- **Design**: Bestehende Designvorgaben/Branding? Oder frei? Referenzen/Vorbilder?
- **Weitere Pflichtfragen, die ein Projektleiter sonst auch stellen würde:**
  - Daten/Datenschutz: Wo werden Daten gespeichert, gibt es Compliance-Anforderungen?
  - Nicht-funktionale Anforderungen: Performance-Erwartungen, Barrierefreiheit, Mehrsprachigkeit.
  - Authentifizierung/Nutzerkonten nötig oder nicht?
  - Externe Integrationen/Drittanbieter-APIs?
  - Lizenz (Open Source vs. proprietär) und ggf. erlaubte Abhängigkeits-Lizenzen.
  - Zeitrahmen/Priorität: Eher schnell und schlank, oder gründlich und vollständig (wie hier)?
  - Wer sonst noch beteiligt ist / wer freigibt.
  - Was **explizit außerhalb** des Umfangs liegt.

Antworten werden knapp in `PROJECT-BRIEF.md` im Projekt-Root festgehalten.

## Phase 1 — Leiter: Feature-Gesamtliste erstellen

Der Leiter überlegt sich **wirklich ALLE** nötigen Features — technische Basis
(Grundgerüst, Build, CI/CD, Datenmodell) **und** fachliche Funktionen **und**
Menüpunkte/Bedienelemente. Granular, nicht grob (einzelne Menüpunkte einzeln
auflisten, keine Sammelkategorien). Legt für jedes eine **Priorität** fest
(z. B. 1 = essenziell/fundamental, 2 = wichtig, 3 = nice-to-have, 4 = Randfall).

Ergebnis: `feature-all.md` im Root — eine Tabelle mit Slug, Titel, Beschreibung,
Status (vorhanden/teilweise/fehlt), Priorität. Nichts wird stillschweigend
weggelassen oder künstlich gekürzt — Vollständigkeit ist der Zweck dieses Schritts.

Dieses Dokument wird dem Menschen vorgelegt, bevor die Umsetzung pro Feature beginnt.

## Phase 2 — Pro Feature: PO → Dev → QA (Vorbereitung)

Für jedes Feature aus `feature-all.md`, in Prioritätsreihenfolge:

1. **PO** arbeitet das Feature aus: Anforderungen im Detail, Menüpunkte im Detail,
   Abläufe, Fallstricke, Edge Cases, Definition of Done. Schreibt `feature-name-req.md`.
2. **Dev** liest `feature-name-req.md`, schreibt einen konkreten, dateigenauen
   Umsetzungsplan `feature-name-code.md` (welche Dateien, welche Architektur-
   Entscheidungen, was am ggf. bestehenden Code falsch/unvollständig ist).
3. **QA** liest `feature-name-req.md` **und** `feature-name-code.md`, schreibt
   `feature-name-qa.md`: Testfälle für Headless-Tests (Unit/Integration) **und**
   echte interaktive Tests (z. B. Playwright im echten Browser: Klicks, Eingaben,
   Datei-Upload/-Download, nicht nur interne Funktionsaufrufe).

## Phase 3 — Umsetzung: Bidirektionale Agentenkette

Der Dev (als "Senior Dev") baut das Feature gemäß `feature-name-code.md`. Danach
läuft die volle bidirektionale Kette — **jede Stufe kann bei Kritik an die vorige
zurückwerfen**, nicht nur linear nach vorne:

```
LEITER <-> PO <-> DEV <-> QA <-> PO <-> LEITER
```

Konkret:
1. Dev setzt um, führt Build + Tests aus.
2. QA verifiziert (Headless- **und** echte interaktive Tests). Bei Mängeln: zurück an Dev mit konkretem Feedback (begrenzte Anzahl Runden, z. B. max. 5, um nicht endlos zu schleifen).
3. **PO** prüft unabhängig — nicht nur QA's Aussage vertrauen, sondern selbst gegen `feature-name-req.md` gegenprüfen. Bei Mängeln: zurück an Dev (neue Dev↔QA-Runde).
4. **Leiter** trifft die finale Entscheidung auf Basis von QA- und PO-Bericht. Bei Mängeln: zurück an PO/Dev.

Dieser Prozess läuft für jedes Feature einzeln; unabhängige Features können
parallel bearbeitet werden (Spezifikationsphasen sicher parallelisierbar, echte
Code-Umsetzung sicherheitshalber sequenziell, um Konflikte im selben Arbeitsstand
zu vermeiden — bzw. mit isolierten Arbeitskopien, falls parallel gewünscht).

## Phase 4 — Abschluss: CI/CD

Nach Abnahme durch den Leiter: commit, push, deploy (CI/CD-Pipeline). Zwischenstände
und die finale Zusammenfassung werden fortlaufend in `SUMMARY-latest.md` festgehalten
(anhängen, nicht überschreiben), damit der Fortschritt jederzeit nachvollziehbar ist.

## Hinweis zur Umsetzung

Dieser Prozess ist explizit als Mehragenten-Orchestrierung gedacht (z. B. über das
Workflow-Tool: Leiter/PO/Dev/QA als eigene Agenten-Aufrufe, Bidirektionalität als
begrenzte Retry-Schleifen abgebildet). Er wird nur auf ausdrücklichen Wunsch
gestartet (hohe Kosten durch viele Agenten) — nicht automatisch bei jeder Aufgabe.
```