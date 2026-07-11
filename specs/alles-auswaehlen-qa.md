# QA-Testplan: „Alles auswählen“ (Select All)

Bezug: `specs/alles-auswaehlen-req.md` (Anforderung), `specs/alles-auswaehlen-code.md`
(Umsetzungsplan). Code-Stand **erneut direkt gegen die Arbeitskopie verifiziert am 2026-07-05**
in `E:\docs`. Dieser Plan legt fest, **welche Tests geschrieben werden, in welcher Datei, mit
welchem konkreten Ablauf**, damit der Backlog-Status `alles-auswaehlen` von „nicht
vertrauenswürdig“ auf „verifiziert“ gehoben werden darf (Anforderung Abschnitt 8, Punkt 5).

Rolle dieses Dokuments gegenüber `alles-auswaehlen-code.md`: Der Code-Plan sagt, *dass* keine
Anwendungslogik geändert werden muss und *welche* Testdateien entstehen sollen. Dieser QA-Plan
geht eine Ebene tiefer: konkrete Testfälle, **exakt verifizierte** Selektoren/API-Aufrufe,
konkrete Prüfungen an der heruntergeladenen Datei, eine vollständige Rückverfolgbarkeits-Matrix,
verbindliche Determinismus-Leitlinien (Abschnitt 3) und die Abgrenzung „was ist bereits
abgedeckt und darf **nicht** dupliziert werden“ (Abschnitt 4) vs. „was ist die echte
Select-All-eigene Lücke“.

**Nicht verhandelbare Leitlinie für diesen Plan:** Kein Testfall gilt als erfüllt, nur weil er
einen internen Befehl (`selectAll(state, dispatch)`, `commands.ts`-Funktionen) isoliert aufruft.
Jeder in Teil B beschriebene Test **muss** über echte Playwright-Browserinteraktion laufen
(`page.keyboard`, `.click()`, `input[type=file].setInputFiles()`, `page.waitForEvent('download')`)
und, wo eine Datei entsteht, die **tatsächlich heruntergeladene Datei** mit `JSZip` inspizieren —
exakt wie es die bestehenden Dateien `tests/e2e/cut.spec.ts`, `tests/e2e/docx.spec.ts`,
`tests/e2e/odt.spec.ts` und `tests/e2e/selection-regression.spec.ts` bereits vormachen.

---

## 0. Kritische Korrekturen gegenüber der Vorfassung dieses QA-Plans

Dies ist der Kern der Überarbeitung („falls die Datei schon existiert: kritisch prüfen und
verbessern“). Die Vorfassung dieses QA-Plans war gegen einen **älteren** Stand von
`alles-auswaehlen-code.md` geschrieben und übernahm mehrere inzwischen falsche Annahmen. Jede
Zeile unten ist eine falsch gewordene Aussage samt am realen Code (2026-07-05) verifizierter
Realität. Wer nach der Vorfassung arbeitet, würde ohne diese Korrekturen **bereits vorhandene
Tests ein zweites Mal schreiben** oder **Infrastruktur unter falschem Namen neu bauen**.

| # | Aussage der Vorfassung | Verifizierte Realität | Konsequenz für diesen Plan |
|---|---|---|---|
| K1 | `selection-regression.spec.ts` hat **3** bestehende Tests; ergänze REG-4 (Ausschneiden) und REG-5 (Kopieren) | Die Datei hat **4** Tests; Test 4 (`select-all, bold, copy, click …`) ist bereits die **Kopieren**-Variante | REG-5 (Kopieren) **nicht** anlegen — existiert. Die 4 Tests bleiben unverändert grün. Abschnitt 6.3 auf höchstens **einen** optionalen Test reduziert. |
| K2 | Ergänze REG-4: Strg+A → Strg+X → Klick → Enter → tippen | Existiert bereits **wortgleich** als `cut.spec.ts` **Testfall 5 (PFLICHT)** | REG-4 **nicht** anlegen. Referenzieren statt duplizieren (Abschnitt 4). |
| K3 | „auf allen **drei** `playwright.config.ts`-Projekten“; ein `Desktop Safari`-Projekt „existiert nicht“ | **Fünf** Projekte: `Desktop Chrome`, `Mobile` (Pixel 7/Chromium), `Tablet` (iPad Mini/**WebKit**), `Desktop Safari (Clipboard)`, `Desktop Firefox (Clipboard)` (beide `testMatch: /clipboard.*\.spec\.ts/`) | Frage 4 (Cmd+A/Desktop-WebKit) ist **jetzt konkret umsetzbar** über eine Ein-Zeilen-`testMatch`-Erweiterung (Abschnitt 6.5), nicht mehr „offener Punkt“. |
| K4 | Neuer Helper `tests/e2e/helpers/consoleErrors.ts` mit `collectPageErrors(page): Error[]` | Etabliertes Muster ist `watchForConsoleErrors(page)` → gibt eine **Assertions-Closure** zurück; existiert real in `cut.spec.ts`, `clipboard.spec.ts`, `clipboard-roundtrip.spec.ts`, `export-error-handling.spec.ts` | Bestehendes Muster übernehmen (Abschnitt 2), **nicht** eine zweite, abweichende API einführen. Zentralisierung ist optionale ticketübergreifende Aufräumarbeit (Code-Plan Fund G), kein Vorbedingung. |
| K5 | Das neue Unit-File wäre die „erste“ Datei, die `EditorState.create` direkt aufbaut / `AllSelection` prüft | `src/formats/shared/editor/__tests__/commands.test.ts` baut `EditorState.create({ doc, schema: wordSchema })` bereits auf **und** testet `AllSelection` bereits (`'is true for an AllSelection'`, Zeilen 33–37) | Neues Unit-File folgt dem **bestehenden** Muster; „erstmalig“ gestrichen (Abschnitt 5.4). |
| K6 | Als Vorlage für die Reader/Writer-Rundreise nur `roundtrip.test.ts` genannt | Es gibt bereits `src/formats/docx/__tests__/cut-roundtrip.test.ts` **und** `.../odt/__tests__/cut-roundtrip.test.ts` — exakt das gesuchte Muster (`doc()`/`paragraph()`/`roundTrip()`, `TINY_PNG`) inkl. leerem Dokument + Doppel-Konvertierung | `cut-roundtrip.test.ts` ist die primäre Vorlage. Leeres-Dokument- und Cross-Format-Konvertierungs-**Anteil** sind dort bereits bewiesen (Abschnitt 5). |
| K7 | Code-Plan-Verweise auf „Abschnitt 3.3“ (Cross-Format-Blocker) und „Abschnitt 9.1“ (Console-Helper) | Der reale Code-Plan führt den Cross-Format-Blocker in **§5.3** (und §0/Fund 6), den Console-Helper-Hinweis in **Fund G / §6.1**, die `testMatch`-Empfehlung in **§10** | Alle Verweise in diesem Plan auf die realen Abschnittsnummern korrigiert. |
| K8 | RT-5 (E2E-Tabelle) sollte eine `colspan`-Zelle **per Toolbar** erzeugen und `w:gridSpan` prüfen | Die Toolbar bietet **nur** `Tabelle einfügen` = `insertTable(2,2)` (plain 2×2, kein Zell-Merge, verifiziert `Toolbar.tsx` 277–289); eine gemergte Zelle ist über die UI **nicht** herstellbar. Merged-Cell-Tabellen existieren nur als vorgefertigte Fixtures (`richDocument.ts`/`fullCoverageDocument.ts` mit `gridSpan=2` / `number-columns-spanned=2`) oder als direkt gebautes doc-JSON (`cut-roundtrip.test.ts` Testfall 7). `docx.spec.ts` selbst prüft seinen Merged-Table-Rundtrip über einen **Fixture-Upload**, nicht über UI-Tabellenbau | RT-5 lädt eine **vorgefertigte Fixture** mit gemergter Zelle hoch (statt sie per UI zu bauen); `colspan`/`rowspan`-Erhalt am direkt gebauten Dokument ist zusätzlich UT-D3/UT-O3 zugeordnet (§6.2/§5). |
| K9 | §6.5 schlug `testMatch: /(clipboard\|select-all)\.spec\.ts/` vor | Diese Regex **verliert `clipboard-roundtrip.spec.ts`** (auf `clipboard` folgt dort nicht direkt `.spec.ts`) → stille Regression der bestehenden `Desktop Safari`/`Desktop Firefox`-Abdeckung. Die Variante `/(clipboard\|select-all).*\.spec\.ts/` wiederum zöge das **unerwünschte** `select-all-roundtrip.spec.ts` mit herein (dessen Download-/Clipboard-Schritte auf WebKit/Firefox-Desktop unzuverlässig sind) | Korrigiert auf `/(clipboard.*\|select-all)\.spec\.ts/` (§6.5): erhält **beide** Clipboard-Specs, ergänzt `select-all.spec.ts`, schließt `select-all-roundtrip.spec.ts` bewusst aus. |

**Das Kernergebnis bleibt unverändert:** „Alles auswählen“ braucht **keine Zeile neuen
Anwendungscode** — nur Tests. Die substanzielle Neubewertung ist, **wie viel** davon bereits als
Nebenprodukt der Kopieren-/Ausschneiden-Umsetzung existiert und daher **nicht** dupliziert wird.

---

## 1. Teststrategie-Überblick

| Ebene | Werkzeug | Was wird bewiesen | Datei(en) |
|---|---|---|---|
| A1 — Reader/Writer-Rundreise (Unit) | Vitest (reine Blob-/Objekt-Verarbeitung, kein Browser) | Eine Dokumentstruktur, wie sie nach „Strg+A + Aktion“ entsteht (einheitliche Formatierung über **alle** Blöcke inkl. erstem/letztem, Tabellenzellen, Listen, Bilder; vollständig geleertes Dokument), übersteht Schreiben+Lesen für **beide** Formate verlustfrei | `src/formats/docx/__tests__/select-all-roundtrip.test.ts` (neu), `src/formats/odt/__tests__/select-all-roundtrip.test.ts` (neu) |
| A2 — Editor-Zustand (Unit) | Vitest, `EditorState.create` direkt (Muster wie `commands.test.ts`) | Die Bibliotheksgarantien hinter `AllSelection` (Idempotenz, Undo-Neutralität = 0 Steps, valides Restdokument nach Löschen, kein Absturz bei reiner Bild-Node) sind auf State-Ebene nachweisbar | `src/formats/shared/editor/__tests__/select-all.test.ts` (neu) |
| B1 — Kernverhalten (E2E, echter Browser) | Playwright, `.ProseMirror`-Locator, `page.keyboard` | Strg+A/Cmd+A markiert wirklich alles, in jedem select-all-eigenen Grenzfall aus Anforderung Abschnitt 3, auf allen konfigurierten Projekten | `tests/e2e/select-all.spec.ts` (neu) |
| B2 — Datei-Rundreise (E2E + echte Datei) | Playwright + `JSZip` auf der **heruntergeladenen** Datei | Eine mit Strg+A als Zwischenschritt durchgeführte **Formatier**-Aktion überlebt Export → Re-Import unverändert, für DOCX und ODT | `tests/e2e/select-all-roundtrip.spec.ts` (neu) |
| B3 — Regressions-Pflichttests (E2E) | Playwright, bestehende Datei | Die **4** bestehenden Selection-Sync-Regressionstests bleiben grün; Ausschneiden-/Kopieren-Varianten sind **bereits** abgedeckt (Abschnitt 4), höchstens **1** optionaler Zusatz | `tests/e2e/selection-regression.spec.ts` (4 Tests unverändert, ≤1 optional neu) |
| B4 — Visueller Kontrast (E2E, Screenshot) | Playwright `toHaveScreenshot` | Selektionshintergrund ist in Light **und** Dark Mode lesbar | `tests/e2e/select-all.spec.ts` (Abschnitt 6.4) |

Gewichtung: Teil A ist schnell und deterministisch, beweist aber **nicht**, dass ein Nutzer im
Browser per Strg+A tatsächlich zu diesem Dokumentzustand kommt — dafür ist Teil B zuständig.
Beide Teile sind Pflicht; keiner ersetzt den anderen (Anforderung Abschnitt 6, Einleitung: „echte
Browser-Interaktion … keine isolierten Command-Aufrufe“).

---

## 2. Testinfrastruktur / Voraussetzungen (an den realen Code angeglichen)

1. **Konsolen-/JS-Fehler-Wächter — bestehendes Muster übernehmen, keine neue API.** Der real
   etablierte Helper ist `watchForConsoleErrors(page)` (identisch in `cut.spec.ts` Zeilen 16–23,
   `clipboard.spec.ts`, `clipboard-roundtrip.spec.ts`, `export-error-handling.spec.ts`) und gibt
   eine **Assertions-Closure** zurück, kein Array:
   ```ts
   function watchForConsoleErrors(page: Page) {
     const errors: string[] = []
     page.on('pageerror', (err) => errors.push(String(err)))
     page.on('console', (msg) => {
       if (msg.type() === 'error') errors.push(msg.text())
     })
     return () => expect(errors, `Unerwartete Konsolen-/JS-Fehler: ${errors.join('\n')}`).toEqual([])
   }
   ```
   `select-all.spec.ts` **kopiert dieses Muster** (wie alle anderen Specs auch). Eine
   Zentralisierung in einen gemeinsamen Helper (`tests/e2e/helpers/…`) ist eine sinnvolle, aber
   **ticketübergreifende** Aufräumempfehlung (Code-Plan Fund G / §6.1) — kein Vorbedingung für
   dieses Ticket, und **nicht** unter einem abweichenden Namen/API (`collectPageErrors`) neu
   erfinden.
2. **`settle(page)`-Helper** (identisch in `docx.spec.ts` Zeilen 30–32, `clipboard.spec.ts`):
   ```ts
   async function settle(page: Page) { await page.waitForTimeout(50) }
   ```
   Zweck und verbindliche Einsatzregeln: siehe Abschnitt 3 (Determinismus).
3. **Kartenselektoren wiederverwenden, nicht neu definieren** — exakt wie bestehend:
   ```ts
   const docxCard = (page) => page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
   const odtCard  = (page) => page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
   ```
   (Quelle: `cut.spec.ts` 25–30, `selection-regression.spec.ts` 3–5, `docx.spec.ts`.)
4. **Echte Test-PNG als Datei-Upload**, nicht als direkter `insertImage(dataUrl)`-Aufruf — exakt
   wie `cut.spec.ts` Testfall 8 / Rundreise 6: eine winzige PNG nach
   `tests/e2e/fixtures/tiny-select-all.png` schreiben und über
   `page.locator('label:has-text("Bild")').locator('input[type=file]').setInputFiles(pngPath)`
   hochladen (der Upload-`<label>` trägt den Text `🖼 Bild`, liegt als **Toolbar-Geschwister**
   außerhalb von `.ProseMirror`, daher auf `page` gescoped). Das testet den realen
   `FileReader.readAsDataURL`-Pfad, nicht eine Abkürzung.
5. **Reader/Writer-Unit-Vorlage:** `src/formats/docx/__tests__/cut-roundtrip.test.ts` bzw.
   `.../odt/__tests__/cut-roundtrip.test.ts` — dieselben `doc()`/`paragraph()`/`roundTrip()`-
   Helper und die `TINY_PNG`-Konstante übernehmen (nicht neu erfinden). **Wichtig zur Mark-Form:**
   Marks sitzen am **Text**-Knoten, nicht am Absatz — der erweiterte Helper aus
   `roundtrip.test.ts` (Zeile 23) ist maßgeblich:
   ```ts
   function paragraph(text, align = 'left', marks?) {
     return { type: 'paragraph', attrs: { align }, content: text ? [{ type: 'text', text, marks }] : [] }
   }
   ```

---

## 3. Determinismus-Leitlinien (verbindlich für **alle** Teil-B-Tests)

Die Anforderung dieses Auftrags verlangt ausdrücklich deterministische Tests ohne
Race-Conditions durch zu schnelle Tastatureingaben und mit abgewartetem Selektions-Sync. Die
folgenden Regeln sind **keine** Empfehlungen, sondern am realen Code bereits **verifizierte**
Gegenmaßnahmen (Fundstellen in Klammern). Jeder neue Testfall muss sie befolgen.

**D1 — Async `selectionchange`-Sync abwarten (`settle`/50 ms).** ProseMirror erfährt einen
**nativen, tastaturgetriebenen** Cursor-/Selektionswechsel (Klick, `End`, `Home`, `Arrow*`,
Shift+Arrow) nur über das **asynchrone** Browser-Event `selectionchange`. Feuert der nächste
Tastendruck ohne Pause hinterher (wie jede Playwright-`press()`-Kette ohne menschliche
Reaktionszeit), kann er die Nachführung überholen und auf der **alten** Position wirken. Regel:
**nach jedem nativen Caret-/Selektionswechsel und vor dem nächsten Tastendruck** `await
settle(page)` einfügen. (Belegt/kommentiert in `selection-regression.spec.ts` 26–34,
`cut.spec.ts` Testfall 1/6/13, `docx.spec.ts`.)

**D2 — Strg+A selbst ist synchron, Shift+Arrow nicht.** `Mod-a` löst über die Keymap **synchron**
`dispatch(setSelection(new AllSelection))` aus und hängt **nicht** an `selectionchange`. Ein
`type → Strg+A → Delete` braucht daher zwischen Strg+A und Delete **kein** `settle`. Genau
deshalb sind Select-All-Tests inhärent robuster als die Shift+Arrow-basierten Cut-Tests. `settle`
ist trotzdem Pflicht, **sobald** ein Testfall einen Klick, `End`/`Home`/`Arrow*` **vor** dem
nächsten Tastendruck enthält (z. B. B1-13 Cursor-Kollaps, B1-7 nach Klick).

**D3 — Per-Taste-Verzögerung bei Shift+Arrow-Schleifen (`{ delay: 20 }`).** Wo eine Selektion
zeichenweise mit `Shift+ArrowRight/Left` aufgebaut wird (nur in Rundreise-/Grenzfalltests, die
eine **Teil**selektion brauchen), jede Taste mit `{ delay: 20 }` drücken; ein zeichenloser
Nulldelay-Loop unmittelbar vor Strg+X/Delete schnitt in direkter Verifikation reproduzierbar 1–11
statt der markierten Zeichen. (Belegt in `cut.spec.ts` 70, 327, 501–503.) Für „Alles auswählen“
selbst i. d. R. **nicht** nötig (Strg+A statt Shift+Arrow), relevant nur, wo ein Test bewusst eine
Teilselektion herstellt.

**D4 — Undo-Gruppierungsfenster respektieren (`waitForTimeout(600)`).** `prosemirror-history`
fasst benachbarte Transaktionen innerhalb ~500 ms (`newGroupDelay`) zu **einem** Undo-Schritt
zusammen. Für den Undo-Neutralitätstest (B1-7) muss zwischen zwei Inhaltsphasen eine Pause von
**600 ms** liegen, damit sie garantiert **verschiedene** Undo-Gruppen bilden — sonst ist die
Assertion „ein Strg+Z entfernt nur den zweiten Absatz“ nicht deterministisch. (Belegt in
`cut.spec.ts` Testfall 9, `docx.spec.ts` 322–324.)

**D5 — Keine pixelbasierten Maus-Drags über Projekte hinweg für Selektion.** Die editierbare
Seite hat eine **feste Druckseiten-Breite** (`pageLayout.ts`); ein Fix-Pixel-Drag oder ein nacktes
`Home` bricht auf schmalen Viewports (Mobile-Projekt) unterschiedlich um. Selektion daher per
Tastatur (`ControlOrMeta+Home`, `ControlOrMeta+a`) statt Maus-Drag; wo eine Zeilen-/Zellselektion
nötig ist, `Home` + `Shift+End`. (Belegt in `cut.spec.ts` 51–67, 166–171.)

**D6 — Web-First-Assertions statt Momentaufnahmen.** Immer die auto-retryenden
`await expect(locator).toHaveText/…/toHaveCount(...)` verwenden, nie `const t = await
locator.textContent()` gefolgt von einem synchronen Vergleich (außer zum Festhalten eines
Vorher-Werts wie in `cut.spec.ts` Testfall 3/14). Das eliminiert Timing-Flakes ohne feste Sleeps.

**D7 — Bekannte CI-only-Mobile-Grenze im Blick behalten.** `cut.spec.ts` Rundreise 1/2 dokumentiert
eine **nur** in GitHub-Actions-Headless-Mobile (Pixel-7-Touch-Emulation) auftretende, lokal nie
reproduzierbare No-op bei einer **Shift+Arrow-aufgebauten** Selektion bis zum Dokumentende + Strg+X.
Für „Alles auswählen“ tritt diese Klasse **nicht** auf, weil Strg+A keine Shift+Arrow-Selektion
baut (D2). Sollte ein select-all-Rundreisetest dennoch nur auf Mobile-CI flaky werden, ist er
analog mit `test.skip(testInfo.project.name === 'Mobile', '…')` **plus** dokumentierendem Kommentar
zu behandeln (nicht kommentarlos), da der zugrunde liegende Pfad auf Desktop Chrome + Tablet/WebKit
real verifiziert bleibt.

---

## 4. Bereits vorhandene Abdeckung — was **nicht** dupliziert werden darf

Deckungsgleich mit `alles-auswaehlen-code.md` Abschnitt 3. **Vor** dem Schreiben jedes Teil-B-Tests
ist diese Tabelle zu prüfen. Ein Testfall, der eine dieser Zeilen nur nachbaut, ist abzulehnen.

| Anforderung (`alles-auswaehlen-req.md`) | Bereits abgedeckt durch | Verbleibende Select-All-**eigene** Lücke |
|---|---|---|
| §2.6 / Grenzfall 7: Strg+A → **Ausschneiden** → Klick → Enter → tippen | `cut.spec.ts` **Testfall 5 (PFLICHT)** | **Keine** — nicht anlegen |
| §2.6 / Grenzfall 7: Strg+A → **Kopieren** → Klick → Enter → tippen | `selection-regression.spec.ts` **Test 4** (`…, bold, copy, …`) | Nur „Kopieren **ohne** vorheriges Fett“ fehlt literal — near-duplicate, optional (6.3) |
| Grenzfall 6 / §4.2 #3: Strg+A → Ausschneiden → valider leerer Zustand + Export/Reimport | `cut.spec.ts` Testfall 4 **und** `cut.spec.ts` Rundreise 10 (Export→Reimport = gültige leere Datei) | Nur die **`Delete`-Taste** (statt Strg+X) als Auslöser ist select-all-eigen (B1-1, RT-3) |
| Grenzfall 10: Fokus im Textfarbe-`<input>`, systemweites Strg+X verändert Editor nicht | `cut.spec.ts` **Grenzfall 14** (Farbwähler-Fokus, Strg+X) | Das **Strg+A**-Analogon ist select-all-eigen (B1-9) |
| Grenzfall 8: Strg+Z nach einer Inhaltsänderung stellt her | `cut.spec.ts` Testfall 9 + „Zusatz (Req §2.5)“ | Die **Undo-Neutralität von Strg+A selbst** (kein eigener Undo-Eintrag) ist select-all-eigen (B1-7) |
| `AllSelection` als State-Konstrukt gültig / `canCut`-tauglich | `commands.test.ts` `'is true for an AllSelection'` (33–37) | Idempotenz/0-Steps/Restdokument/Bild-`setAlign` als **eigene** State-Asserts (A2) |
| §4.2 #1/2: Strg+A → **Fett über alles** → Export → **jeder** Lauf trägt Formatierung | — (Ausschneiden testet nur Lösch-Rundreisen) | **Vollständig offen** — echte Select-All-Rundreise (B2) |
| §1/§6: „Strg+A markiert wirklich **alles**“ als **eigenständige** Behauptung | — (überall nur als Trigger genutzt, nie selbst assertiert) | **Vollständig offen** — Kern dieses Tickets (B1) |

**Fazit:** Die zwei echten, nirgends abgedeckten Select-All-Lücken sind (1) „Strg+A markiert alles“
als eigenständiger, assertierter E2E-Test und (2) die **Formatier**-Rundreise DOCX/ODT. Alles Übrige
ist Bibliotheksgarantie (Code-Plan §4), bereits abgedeckt (diese Tabelle) oder fremdes Ticket.

---

## 5. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX **und** ODT)

### 5.1 Zweck und Abgrenzung

„Alles auswählen“ selbst schreibt keine Datei (Anforderung, Einleitung Abschnitt 4). Diese
Unit-Tests prüfen **nicht** die Selektion, sondern die Reader/Writer-Vertragssicherheit für genau
die Dokumentformen, die als **Ergebnis** einer „Strg+A + Aktion“-Sequenz entstehen — schnell und
browserunabhängig, als Ergänzung zu Teil B, nicht als Ersatz.

Vorlage: `cut-roundtrip.test.ts` (beide Formate). **Überschneidungshinweis:** Der leere-Dokument-
Fall ist dort bereits als „Testfall 10“ bewiesen, die Cross-Format-Doppel-Konvertierung als
„Doppel-Konvertierung … Req 4.2 Testfall 9“. Die neuen Select-All-Unit-Dateien konzentrieren sich
daher auf die **Formatierung-über-alle-Blöcke**-Fälle (die echte Lücke) und dürfen die
Leer-/Cross-Format-Fälle referenzieren statt sie ein zweites Mal zu beweisen; wo ein
selbsttragendes File gewünscht ist, sind sie mit Verweis „vgl. cut-roundtrip.test.ts“ nochmals
knapp aufzuführen.

### 5.2 `src/formats/docx/__tests__/select-all-roundtrip.test.ts` (neu)

`import { writeDocx } from '../writer'`, `import { readDocx } from '../reader'`,
`doc()`/`paragraph(text, align, marks)`/`roundTrip()`/`TINY_PNG` aus `cut-roundtrip.test.ts`
übernommen. DOCX-Fett = `<w:b/>` (verifiziert `writer.ts:23`).

| ID | Testfall | Aufbau | Prüfung |
|---|---|---|---|
| UT-D1 | Einheitliche Formatierung über **alle** Blöcke, inkl. erstem/letztem (Req 4.2 #1) | `doc([paragraph('Erster','left',[{type:'strong'}]), { type:'heading', attrs:{level:1,align:'left'}, content:[{type:'text',text:'Mitte',marks:[{type:'strong'}]}] }, paragraph('Letzter','left',[{type:'strong'}])])` | Nach `roundTrip()`: **jeder** Textlauf **jedes** Blocks trägt `marks:[{type:'strong'}]`; erster **und** letzter Block explizit per Index geprüft (`content[0]` **und** `content[content.length-1]`), nicht nur „irgendwo strong“ — deckt eine mögliche Off-by-one-Writer-Regel auf |
| UT-D2 | Vollständig geleertes Dokument (Req 4.2 #3) | `doc([paragraph('')])` (Editor erzwingt ≥1 leeren Absatz, `schema.ts` `doc:'block+'`) | `roundTrip()` wirft nicht; `result.body.content` hat genau **einen** Absatz, `content[0].content ?? []` ist leer. *(Deckungsgleich mit `cut-roundtrip.test.ts` Testfall 10 — hier nur als Verweis führen.)* |
| UT-D3 | Tabelle, **durchgehend** formatiert, inkl. `colspan`/`rowspan` (Req 4.2 #5) | Wie `cut-roundtrip.test.ts` Testfall 7, aber **jede** Zelle mit fett formatiertem Text | Zeilen-/Spaltenzahl unverändert; `attrs.colspan`/`attrs.rowspan` erhalten; **jede** Zelle trägt `strong` auf ihrem Text |
| UT-D4 | Liste, **jede Ebene** formatiert (Req 2.2 „alle Ebenen“) | Verschachtelte `bullet_list` (2 Ebenen), jeder `list_item`-Text fett | Verschachtelungstiefe unverändert; `strong` auf beiden Ebenen erhalten |
| UT-D5 | Bild + Text (Strg+A → Kopieren in neues Dokument, Req 4.2 #4) | `doc([paragraph('Vor Bild'), { type:'image', attrs:{ src: TINY_PNG, alt:'' } }, paragraph('Nach Bild','left',[{type:'strong'}])])` | Nach `roundTrip()`: Bild-Node vorhanden, Reihenfolge unverändert, Text davor/danach inkl. Formatierung erhalten |
| UT-D6 | Cross-Format-**Reader/Writer-Anteil** von Req 4.2 #6/7 (ohne blockierte UI) | `writeOdt(original)` → `readOdt` → `writeDocx` → `readDocx` (verkettet, wie `cut-roundtrip.test.ts` „Doppel-Konvertierung“) | Text + Formatierung je Block + Tabellenstruktur nach zwei Konvertierungen inhaltlich identisch — beweist den Konvertierungsanteil unabhängig vom UI-Blocker (Code-Plan §5.3). *(Weitgehend deckungsgleich mit `cut-roundtrip.test.ts` — als Verweis führen.)* |

### 5.3 `src/formats/odt/__tests__/select-all-roundtrip.test.ts` (neu)

Spiegelbildlich mit `writeOdt`/`readOdt`. ODT-Fett = Auto-Style mit `fo:font-weight="bold"`
(verifiziert `styleRegistry.ts:48`, `writer.ts:35`).

| ID | Testfall | Prüfung |
|---|---|---|
| UT-O1 | Einheitliche Formatierung über alle Blöcke (Req 4.2 #2) | Wie UT-D1, aber Prüfung: jeder Block referenziert einen Auto-Style mit `fo:font-weight="bold"` (bzw. das entsprechende `marks:[{type:'strong'}]` nach `readOdt`) |
| UT-O2 | Vollständig geleertes Dokument (Req 4.2 #3) | Wie UT-D2, ODT-Variante (vgl. `cut-roundtrip.test.ts` Testfall 10) |
| UT-O3 | Tabelle `table:number-columns-/rows-spanned`, durchgehend formatiert (Req 4.2 #5) | Wie UT-D3, ODT-Attributnamen |
| UT-O4 | Liste, beide Ebenen formatiert | Wie UT-D4 |
| UT-O5 | Bild + Text (Req 4.2 #4) | Wie UT-D5, `office:binary-data`/`draw:image` vorhanden |
| UT-O6 | Cross-Format umgekehrt (Req 4.2 #7): `writeDocx` → `readDocx` → `writeOdt` → `readOdt` | Wie UT-D6, umgekehrte Richtung |

### 5.4 `src/formats/shared/editor/__tests__/select-all.test.ts` (neu, Vitest)

Folgt dem **bestehenden** Muster aus `commands.test.ts` (`EditorState.create({ doc, schema:
wordSchema })`, `wordSchema.node(...)`; `import { AllSelection } from 'prosemirror-state'`) — **nicht
„erstmalig“** (K5). Deckt die Bibliotheksgarantien aus Code-Plan §4 direkt ab.

| ID | Testfall | Konkrete Prüfung |
|---|---|---|
| UT-S1 | `AllSelection` über leeres Dokument (Grenzfall 1) | `new AllSelection(state.doc)` wirft nicht bei einem Dokument mit genau einem leeren Absatz |
| UT-S2 | Undo-Neutralität strukturell (Grenzfall 8/Fund 2) | `const tr = state.tr.setSelection(new AllSelection(state.doc)); expect(tr.steps.length).toBe(0); expect(tr.docChanged).toBe(false)` |
| UT-S3 | Valides Restdokument nach Löschen (Grenzfall 1/6/Fund 3) | Dokument mit 3 Absätzen → über `AllSelection` löschen (`tr.deleteSelection()` bzw. `deleteSelection`-Command) → Ergebnis `doc.content.childCount === 1`, dieser Absatz leer, **nie** leerer `doc.content` |
| UT-S4 | Reiner Bild-Node crasht `setAlign` nicht (Grenzfall 4) | Dokument nur mit `image`-Node (wie `stateWithDoc()` in `commands.test.ts`, aber ohne Absatz) → `AllSelection` → `setAlign('center')(state, () => {})` liefert `false`, wirft nicht. Ergänzt die vorhandene `canCut`-Prüfung um die Ausrichtungs-Seite |
| UT-S5 | Idempotenz auf State-Ebene (Grenzfall 2) | `new AllSelection(doc).eq(new AllSelection(doc)) === true` für zwei unabhängig erzeugte Instanzen |

---

## 6. Teil B — Echte Playwright-Browser-Tests

**Grundgerüst (`beforeEach`, exakt wie die bestehenden Specs):**
```ts
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()   // Datenschutz-Hinweis
})
// pro Testfall: await <docxCard|odtCard>(page).getByRole('button', { name: 'Neu erstellen' }).click()
```
Kernfälle B1-1..B1-3 werden für **beide** Karten (`docxCard`/`odtCard`) parametrisiert (Schleife
über beide Locator-Helper), da „Alles auswählen“ eine gemeinsame Editor-Operation ist (Anforderung
Einleitung). Export: `getByRole('button', { name: 'Exportieren' })`. Reimport: **zuerst** die
Formatauswahl wieder einblenden über `getByRole('button', { name: /formate/i })`, **dann**
`<card>.locator('input[type="file"]').setInputFiles(...)` (verifiziert `docx.spec.ts` 241–243,
`cut.spec.ts` 622–628).

### 6.1 `tests/e2e/select-all.spec.ts` (neu)

Nach dem Muster von `selection-regression.spec.ts`/`cut.spec.ts`. Alle Selektoren unten sind gegen
`Toolbar.tsx` (2026-07-05) verifiziert: Fett `getByTitle('Fett')`; Tabelle
`getByRole('button', { name: 'Tabelle einfügen' })`; Ausrichtung zentriert
`getByTitle('Ausrichtung: center')` (Vorlage `title={\`Ausrichtung: ${align}\`}`, `Toolbar.tsx:96`);
Textfarbe `getByLabel('Textfarbe')`; Aufzählung `getByTitle('Aufzählung')`; Bild-Upload siehe
Abschnitt 2.4.

| ID | Req-Bezug | Ablauf (echte Interaktion) | Prüfung |
|---|---|---|---|
| B1-1 | Testfall 1, Grenzfall 6 | `editor.click()`; `type('Erster Absatz.')`; `Enter`; `type('Zweiter Absatz.')`; `Enter`; `type('Dritter Absatz.')`; `press('ControlOrMeta+a')`; `press('Delete')` | `expect(page.locator('.ProseMirror p')).toHaveCount(1)`; `expect(editor).toHaveText('')` (indirekter Beweis „wirklich alles markiert“) |
| B1-2 | Grenzfall 1 | `const assertNoErr = watchForConsoleErrors(page)`; frisches Dokument (nur leerer Absatz); `editor.click()`; `press('ControlOrMeta+a')`; dann `type('Text nach leer')` | `expect(editor).toContainText('Text nach leer')`; `assertNoErr()` |
| B1-3 | Grenzfall 2 | Text tippen; `press('ControlOrMeta+a')` **zweimal** (kein Zwischenschritt); `press('Delete')` | `.ProseMirror p` = 1, leer; `assertNoErr()` — identisches Ergebnis wie B1-1 beweist, dass das zweite Strg+A nichts anderes bewirkt (Idempotenz) |
| B1-4 | Grenzfall 3, Frage 2 = (a) | `getByRole('button', { name: 'Tabelle einfügen' }).click()`; in `.ProseMirror td` nth(0)/nth(1) je Text; `cells.nth(0).click()`; `press('ControlOrMeta+a')`; `press('Delete')` | `expect(page.locator('.ProseMirror table')).toHaveCount(0)`; `expect(page.locator('.ProseMirror p')).toHaveCount(1)` — bestätigt „sofort ganzes Dokument“ als **beobachtetes** Verhalten. (Abgrenzung: `cut.spec.ts` Testfall 6 beweist das Gegenteil für Strg+X **ohne** Strg+A — nur Zelle) |
| B1-5 | Grenzfall 4 | PNG-Upload (Abschnitt 2.4); Text davor/danach; `press('ControlOrMeta+a')`; `getByTitle('Ausrichtung: center').click()` | `assertNoErr()`; `expect(editor.locator('img')).toHaveCount(1)` (unverändert); die Text-Absätze `toHaveCSS('text-align','center')` |
| B1-6 | Grenzfall 5 | Text tippen; `press('ControlOrMeta+a')`; `type('Komplett neu.')` | `expect(editor).toHaveText('Komplett neu.')`; `.ProseMirror p` = 1 |
| B1-7 | Grenzfall 8 (Undo-Neutralität) | `type('A-Absatz')`; **`waitForTimeout(600)`** (D4: Gruppengrenze); `Enter`; `type('B-Absatz')`; `press('ControlOrMeta+a')` (reine Selektion); `press('ControlOrMeta+z')` | `expect(editor).toContainText('A-Absatz')` **und** `expect(editor).not.toContainText('B-Absatz')` mit **genau einem** Strg+Z — beweist: Strg+A verbrauchte **keinen** Undo-Schritt (sonst wäre B-Absatz noch da) |
| B1-8 | Grenzfall 9 (IME, näherungsweise) | `const assertNoErr = watchForConsoleErrors(page)`; `editor.evaluate(el => el.dispatchEvent(new CompositionEvent('compositionstart')))`; `press('ControlOrMeta+a')`; `editor.evaluate(el => el.dispatchEvent(new CompositionEvent('compositionend')))`; danach `type('ok')` | `assertNoErr()`; `expect(editor).toContainText('ok')` — **Kommentar im Test:** simuliert reale IME nur näherungsweise, echte OS-IME ist mit Playwright nicht auslösbar |
| B1-9 | Grenzfall 10 (Fokus außerhalb Editor) | `type('Unangetasteter Editor-Inhalt')`; `const before = await editor.textContent()`; `getByLabel('Textfarbe').focus()`; `press('ControlOrMeta+a')` | `expect(editor).toHaveText(before ?? '')` — kein editor-weiter Select-All-Effekt. (Strg+A-Analogon zu `cut.spec.ts` Grenzfall 14 mit Strg+X) |
| B1-10 | Grenzfall 11, Anforderung 2.3 letzter Punkt | ~300 Absätze **programmatisch schnell** erzeugen (z. B. Bulk-`type` einer langen Zeichenkette mit `\n` oder wiederholtes Einfügen); `const t0 = Date.now(); await press('ControlOrMeta+a'); const dt = Date.now() - t0`; `press('Delete')` | `expect(dt).toBeLessThan(500)`; `.ProseMirror p` = 1 (Markierung reichte bis zum Dokumentende, nicht nur sichtbarer Ausschnitt) |
| B1-11 | Req-Testfall 3, Grenzfall 16 | `const prevented = await editor.evaluate(el => { const ev = new MouseEvent('contextmenu', {bubbles:true, cancelable:true}); el.dispatchEvent(ev); return ev.defaultPrevented })` | `expect(prevented).toBe(false)` — kein App-Handler unterdrückt das native Kontextmenü |
| B1-12 | Req-Testfall 12 (Matrix) | Kein eigener Code — B1-1..B1-3 laufen auf allen Projekten; nach `testMatch`-Erweiterung (6.5) zusätzlich Desktop Safari/Firefox | Alle Projekte grün; Kommentar verweist auf die Mobile-Popup-Grenze (6.6) |
| B1-13 | Anforderung 2.4 (Cursor-Kollaps) | Mehrere Absätze tippen; `press('ControlOrMeta+a')`; `press('ArrowLeft')`; **`await settle(page)`** (D2); `type('X')` | `X` am **Anfang**; separater Testlauf mit `ArrowRight` + `settle` → `X` am **Ende** |

Referenz-Implementierung B1-4 (Tabellen-Eskalation):
```ts
test('Strg+A in einer Tabellenzelle markiert das ganze Dokument, nicht nur die Zelle', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()

  const cells = page.locator('.ProseMirror td')
  await cells.nth(0).click(); await page.keyboard.type('Zelle A')
  await cells.nth(1).click(); await page.keyboard.type('Zelle B')

  await cells.nth(0).click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('Delete')

  await expect(page.locator('.ProseMirror table')).toHaveCount(0)
  await expect(page.locator('.ProseMirror p')).toHaveCount(1)
  await expect(editor).toHaveText('')
})
```

### 6.2 `tests/e2e/select-all-roundtrip.spec.ts` (neu)

Nach dem Rundreise-Muster in `cut.spec.ts` (473–631) und `docx.spec.ts`: echter Export über
`waitForEvent('download')` → `download.path()` → `fs.readFile` → `JSZip.loadAsync` → Inhalt der
**tatsächlich heruntergeladenen** Datei prüfen (DOCX: `word/document.xml`; ODT: `content.xml`).
Deckt die **Formatier**-Rundreisen, die Ausschneiden nicht abdeckt (Abschnitt 4).

| ID | Req-Bezug | Ablauf | Prüfung an der heruntergeladenen Datei |
|---|---|---|---|
| RT-1 | 4.2 #1 (DOCX) | Neues DOCX-Dokument; 3 Absätze; `press('ControlOrMeta+a')`; `getByTitle('Fett').click()`; Export | In `word/document.xml`: **jeder** der drei Absätze hat einen `<w:r>` mit `<w:b/>` — **erster und letzter** explizit per Textsuche + Rückwärtssuche des umschließenden `<w:r>` geprüft, nicht nur „irgendwo `<w:b/>`“ |
| RT-2 | 4.2 #2 (ODT) | Wie RT-1, ODT-Karte | `content.xml`: jeder Absatz referenziert einen Style mit `fo:font-weight="bold"` |
| RT-3 | 4.2 #3 (beide Formate, **Delete**-Variante) | `press('ControlOrMeta+a')`; **`press('Delete')`** (nicht Strg+X — das ist `cut.spec.ts` Rundreise 10); Export DOCX, danach separater Testfall Export ODT; anschließend Reimport via `/formate/i` | Datei lädt fehlerfrei via `JSZip.loadAsync`; `word/document.xml`/`content.xml` enthält genau einen leeren Absatz; nach Reimport `.ProseMirror p` = 1, leer |
| RT-4 | 4.2 #4 (Kopieren in neues Dokument) | Dokument mit Fett/Liste/Tabelle/Bild; `ControlOrMeta+a`; `ControlOrMeta+c`; zweite Karte „Neu erstellen“ (leeres Dokument); `ControlOrMeta+v`; Export | Struktur (Fett-Marker, Listenelemente, Tabellenzeilen, `word/media`/`office:binary-data`) im Export des **neuen** Dokuments vorhanden. Clipboard-Rechte sind auf `Desktop Chrome`/`Mobile` **projektweit** gewährt (`playwright.config.ts` 34–35); `test.skip(browserName !== 'chromium', …)` wie `cut.spec.ts` Testfall 12, da Clipboard-Permissions nur auf Chromium zuverlässig |
| RT-5 | 4.2 #5 (Tabelle) | **Verbundene Zelle ist per Toolbar nicht erzeugbar** (nur `Tabelle einfügen` = `insertTable(2,2)`, plain 2×2, kein Zell-Merge — `Toolbar.tsx` 277–289). Daher: **vorgefertigte Fixture mit gemergter Zelle** über den Datei-Öffnen-Flow hochladen (`buildSampleDocx`/`buildSampleOdt` bzw. `richDocument.ts`/`fullCoverageDocument.ts` mit `gridSpan=2` / `number-columns-spanned=2` — dasselbe Muster wie der Merged-Table-Rundtrip in `docx.spec.ts`), dann `ControlOrMeta+a`; Fett; Export | Zeilen-/Spaltenzahl unverändert; `w:gridSpan`/`table:number-columns-spanned` erhalten (bzw. `w:gridCol`-Anzahl = 2, wie `docx.spec.ts` 236 prüft); `<w:b/>`/`fo:font-weight="bold"` **auch innerhalb** der Zellen (inkl. der gemergten). Der `colspan`/`rowspan`-Erhalt am **direkt gebauten** Dokument ist zusätzlich durch **UT-D3/UT-O3** abgedeckt (dort per doc-JSON konstruierbar, `cut-roundtrip.test.ts` Testfall 7) |
| RT-6 | 4.2 #6 (Cross-Format DOCX→ODT) | — | `test.fixme(true, 'Blockiert durch fehlende "Exportieren als …"-UI (DocumentWorkspace.tsx::handleExport exportiert nur im Ursprungsformat), siehe alles-auswaehlen-code.md §5.3 / kopieren-code.md / ausschneiden-code.md — identischer Blocker.')`. Konvertierungsanteil ist bereits durch UT-D6 bewiesen |
| RT-7 | 4.2 #7 (Cross-Format ODT→DOCX) | — | `test.fixme(...)`, gleicher Verweis; Konvertierungsanteil durch UT-O6 |
| RT-8 | 4.2 #8 (doppelte Rundreise mit Formatwechsel) | — | `test.fixme(...)`, gleicher Verweis; Konvertierungsanteil durch UT-D6/UT-O6 |
| RT-9 | 4.2 #9 (Regressionskette + Export) | Sequenz aus `selection-regression.spec.ts` Test 1 (Strg+A → Fett → Klick → **`settle`** → `End` → **`settle`** → Enter → tippen, D1) **plus** Export DOCX **und** ODT (Reimport via `/formate/i`) | In der jeweils heruntergeladenen Datei sind **beide** Absätze (`'Hallo, das ist ein Test.'`, `'Zweiter Absatz.'`) vorhanden — einziger Testfall, der die Selection-Sync-Fixlogik mit einer echten Datei-Rundreise verkettet |

Referenz-Implementierung RT-1 („jeder Block, inkl. erster/letzter“):
```ts
test('Strg+A + Fett wirkt auf jeden Absatz — exportiertes DOCX beweist es', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Erster Absatz.'); await page.keyboard.press('Enter')
  await page.keyboard.type('Mittlerer Absatz.'); await page.keyboard.press('Enter')
  await page.keyboard.type('Letzter Absatz.')

  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const zip = await JSZip.loadAsync(await fs.readFile((await download.path())!))
  const documentXml = await zip.file('word/document.xml')!.async('text')

  for (const text of ['Erster Absatz.', 'Mittlerer Absatz.', 'Letzter Absatz.']) {
    const at = documentXml.indexOf(text)
    expect(at).toBeGreaterThan(-1)
    const runXml = documentXml.slice(documentXml.lastIndexOf('<w:r>', at), documentXml.indexOf('</w:r>', at))
    expect(runXml).toContain('<w:b/>')
  }
})
```

### 6.3 `tests/e2e/selection-regression.spec.ts` (die 4 bestehenden Tests bleiben unverändert)

**Pflichtbedingung (Anforderung §2.6/§8.5):** Die **vier** bestehenden Tests (Zeilen 14–110 im
heutigen Stand — inkl. Test 4, dem Kopieren-Variantentest) bleiben **wortgleich unverändert** und
müssen grün laufen.

**Keine neuen REG-Tests aus der Vorfassung anlegen** (K1/K2):
- **Ausschneiden-Variante** (vormals „REG-4“): existiert als `cut.spec.ts` **Testfall 5 (PFLICHT)**.
- **Kopieren-Variante** (vormals „REG-5“): existiert als **Test 4** dieser Datei.

Genuin noch nicht vorhanden ist einzig „**Kopieren ohne vorheriges Fett**“ (reines
`ControlOrMeta+a` → `ControlOrMeta+c` → Klick → `settle` → `End` → `settle` → `Enter` → tippen;
prüft, dass Kopieren die Selektion **ganz ohne** zwischenliegende Doc-ändernde Transaktion nicht
perturbiert). Das ist ein **near-duplicate** von Test 4. **Empfehlung:** nur anlegen, falls
literale §2.6-Wortlautdeckung ausdrücklich gefordert wird; sonst als „durch Test 4 +
`cut.spec.ts` Testfall 5 abgedeckt“ dokumentieren. Wenn angelegt, gilt Determinismus D1 (die zwei
`settle`-Aufrufe sind Pflicht).

### 6.4 Visueller Kontrast-Check (Req-Testfall 14) — Teil von `select-all.spec.ts`

```ts
for (const scheme of ['light', 'dark'] as const) {
  test(`Selektionshintergrund bleibt in ${scheme} lesbar`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Sichtbarkeitsprobe Zeile eins.\nZeile zwei.')
    await page.keyboard.press('ControlOrMeta+a')
    await expect(editor).toHaveScreenshot(`select-all-${scheme}.png`)
  })
}
```
Baseline-Screenshots beim ersten Lauf **bewusst prüfen** (nicht blind akzeptieren). Erwarteter
Ausgang laut Code-Plan §0/Fund 4: kaum Unterschied zwischen Light/Dark, weil die editierbare Seite
themeunabhängig weiß ist (`.ProseMirror { color:#111827 }`, `pageBackgroundStyle()`). Falls der
Kontrast real doch unzureichend ist, ist das ein **neuer**, separat zu behandelnder Befund (Code-Plan
§6.0: `src/index.css` ohne Befund nicht anfassen).

### 6.5 Geräte-/Browser-Matrix und Frage-4-Umsetzung

| Projekt (`playwright.config.ts`) | Engine | Deckt ab | Bekannte Lücke |
|---|---|---|---|
| `Desktop Chrome` | Chromium | Alle B1-/RT-/REG-Tests | — |
| `Mobile` (Pixel 7) | Chromium (touch-emuliert) | B1-1..B1-3, B1-12 | Natives Touch-Auswahlpopup ist OS-Chrome, nicht per Playwright antippbar — Test verifiziert nur den `ControlOrMeta+a`-Pfad (6.6) |
| `Tablet` (iPad Mini) | **WebKit** | Alle B1-Tests inkl. B1-12; WebKit-`selectAll`/`AllSelection`-Codepfad | Touch-emuliert, kein echter macOS-Desktop mit physischer Cmd-Taste |
| `Desktop Safari (Clipboard)` | WebKit (Desktop) | Aktuell nur `clipboard*.spec.ts` | **Erfasst `select-all*.spec.ts` noch nicht** — siehe Empfehlung unten |
| `Desktop Firefox (Clipboard)` | Firefox (Desktop) | Aktuell nur `clipboard*.spec.ts` | dito |

**Empfohlene reale Änderung (Frage 4, jetzt konkret umsetzbar — K3, Code-Plan §10):** Die
`testMatch`-Regex **beider** Clipboard-Projekte von `/clipboard.*\.spec\.ts/` auf
```ts
testMatch: /(clipboard.*|select-all)\.spec\.ts/,
```
erweitern. **Die Regex-Form ist bewusst so gewählt und muss genau so lauten** (K9):
- **Falsch** `/(clipboard|select-all)\.spec\.ts/` — verlöre `clipboard-roundtrip.spec.ts` (auf
  `clipboard` folgt dort nicht direkt `.spec.ts`), das die beiden Projekte heute über
  `/clipboard.*\.spec\.ts/` mit abdecken → **stille Regression** der bestehenden Abdeckung.
- **Falsch** `/(clipboard|select-all).*\.spec\.ts/` — zöge das **unerwünschte**
  `select-all-roundtrip.spec.ts` mit herein (dessen Download-/Clipboard-Schritte auf
  WebKit/Firefox-Desktop unzuverlässig sind).
- **Richtig** `/(clipboard.*|select-all)\.spec\.ts/` — erhält `clipboard.spec.ts` **und**
  `clipboard-roundtrip.spec.ts`, ergänzt den **Tastatur-Kern** `select-all.spec.ts` und schließt
  `select-all-roundtrip.spec.ts` aus (nach `select-all` folgt dort `-roundtrip`, nicht das
  geforderte `\.spec\.ts`). Der Tastatur-Kern genügt für die Frage-4-Abdeckung.

Danach läuft der Strg/Cmd+A-Kern auf echtem **Desktop**-WebKit und -Firefox, nicht mehr nur
touch-emuliert. Kein neues Projekt anlegen (vermeidet doppelte CI-Laufzeit). Wird die Erweiterung
**nicht** vorgenommen, bleibt „echtes Desktop-macOS/Cmd+A“ ein dokumentierter offener Punkt und darf
**nicht** stillschweigend als erledigt markiert werden.

### 6.6 Dokumentierte Automatisierungsgrenzen (im Test als Kommentar festhalten)

- Natives OS-Auswahlpopup („Alles auswählen“ auf Android/iOS): von Playwright nicht antippbar;
  B1-12 leitet „funktioniert auf Mobile/Tablet“ aus dem verifizierten `ControlOrMeta+a`-Pfad ab
  (analog `cut.spec.ts` Schlusskommentar 404–411).
- Echte IME-Komposition: `CompositionEvent`-Simulation ist eine Näherung (B1-8).
- Physisches macOS/Safari mit echter Cmd-Taste bleibt außerhalb des CI-Scopes; der WebKit-Desktop-
  Codepfad ist nach 6.5 abgedeckt.

---

## 7. Rückverfolgbarkeits-Matrix (Traceability)

| Anforderung (`alles-auswaehlen-req.md`) | Test-ID(s) / bereits vorhandene Abdeckung |
|---|---|
| Abschnitt 1, Testfall 1 (Strg+A markiert alles) | B1-1 |
| Abschnitt 1, Testfall 2 (Cmd+A macOS) | `ControlOrMeta+a` auf allen Projekten; Desktop-WebKit/-Firefox nach 6.5; echtes macOS bleibt offen (6.6) |
| Abschnitt 1, Testfall 3 (Kontextmenü) | B1-11 |
| Abschnitt 1, Testfall 4 (Mobile/Tablet) | B1-12, 6.5/6.6 |
| Grenzfall 1 (leeres Dokument) | B1-2, UT-S1, UT-D2/UT-O2 |
| Grenzfall 2 (Idempotenz) | B1-3, UT-S5 |
| Grenzfall 3 (Tabellenzelle) | B1-4, RT-5, UT-D3/UT-O3 |
| Grenzfall 4 (nur Bild) | B1-5, UT-S4, UT-D5/UT-O5 |
| Grenzfall 5 (Strg+A → Tippen) | B1-6 |
| Grenzfall 6 (Strg+A → Entf) | B1-1, UT-S3; **Strg+X-Variante bereits** `cut.spec.ts` Testfall 4 |
| Grenzfall 7 (Pflicht-Regressionstest) | **4 bestehende Tests** in `selection-regression.spec.ts` (unverändert) + `cut.spec.ts` Testfall 5 |
| Grenzfall 8 (Undo-Neutralität) | B1-7, UT-S2 |
| Grenzfall 9 (IME) | B1-8 |
| Grenzfall 10 (Fokus außerhalb Editor) | B1-9; Strg+X-Analogon bereits `cut.spec.ts` Grenzfall 14 |
| Grenzfall 11 (Performance großes Dokument) | B1-10 |
| Grenzfall 12 (Strg+A → Kopieren/Ausschneiden) | RT-4; **bereits abgedeckt**: `cut.spec.ts` Testfall 5, `selection-regression.spec.ts` Test 4 |
| Grenzfall 16 (kein `contextmenu`-Handler) | B1-11 |
| Abschnitt 2.6 (Selection-Sync + Alles auswählen) | 4 bestehende Tests (unverändert) + `cut.spec.ts` Testfall 5; optional „Kopieren-ohne-Fett“ (6.3) |
| Abschnitt 4.2, Testfall 1 (DOCX Formatierung) | RT-1, UT-D1 |
| Abschnitt 4.2, Testfall 2 (ODT Formatierung) | RT-2, UT-O1 |
| Abschnitt 4.2, Testfall 3 (vollständige Löschung) | RT-3, UT-D2/UT-O2; Strg+X-Rundreise bereits `cut.spec.ts` Rundreise 10 |
| Abschnitt 4.2, Testfall 4 (Kopieren in neues Dokument) | RT-4, UT-D5/UT-O5 |
| Abschnitt 4.2, Testfall 5 (Tabelle) | RT-5, UT-D3/UT-O3 |
| Abschnitt 4.2, Testfall 6/7/8 (Cross-Format) | `test.fixme` RT-6/7/8 (UI blockiert, §5.3); Reader/Writer-Anteil durch UT-D6/UT-O6 bewiesen |
| Abschnitt 4.2, Testfall 9 (Regressionskette + Export) | RT-9 |
| Abschnitt 6, Testfall 14 (visueller Kontrast) | 6.4 |

---

## 8. Nicht-Ziele / bewusste Lücken dieses Testplans

1. **Cross-Format-Export (`test.fixme` RT-6/7/8):** Blockiert durch die fehlende „Exportieren als
   …“-UI (`DocumentWorkspace.tsx::handleExport` exportiert nur im Ursprungsformat), ein
   produktweiter Blocker (Code-Plan §5.3) — kein neuer Fix-Vorschlag hier. Der reine
   Konvertierungsanteil ist über UT-D6/UT-O6 abgesichert.
2. **Echtes natives Mobile-Auswahlpopup:** Playwright kann OS-Chrome nicht ansteuern (6.6).
3. **Echte IME-Komposition (B1-8):** `CompositionEvent`-Simulation ist eine Näherung.
4. **Echtes physisches macOS/Safari mit Cmd-Taste:** außerhalb CI-Scope; Desktop-WebKit-Codepfad
   nach der `testMatch`-Erweiterung (6.5) abgedeckt.
5. **Toolbar-Zustandsanzeige bei uneinheitlicher Formatierung** (Anforderung §2.5, Frage 3): gehört
   den vier Formatierungstickets (`fett`/`kursiv`/`durchgestrichen`/`unterstrichen-einfach`,
   Code-Plan §5.2) — hier **nicht** erneut getestet, um keine fünfte, abweichende Erwartung an
   dieselbe noch nicht kanonisierte `Toolbar.tsx`-Zeile 69 (`$from.marks()`) zu binden. Sobald eines
   dieser Tickets landet, ist **ein** Regressionstest fällig: der Fix muss auch für eine echte
   `AllSelection` (nicht nur `TextSelection`) greifen.
6. **Toolbar-Button „Alles auswählen“:** existiert laut Entscheidung (Anforderung/Code-Plan §8/§2,
   Frage 1 = „Nein“) bewusst nicht — kein Test dafür.

---

## 9. Ausführungsreihenfolge

1. `src/formats/docx/__tests__/select-all-roundtrip.test.ts` +
   `src/formats/odt/__tests__/select-all-roundtrip.test.ts` (Teil A1) — schnellstes Signal,
   `npm run test`; Vorlage `cut-roundtrip.test.ts`.
2. `src/formats/shared/editor/__tests__/select-all.test.ts` (Teil A2) — `npm run test`;
   Muster `commands.test.ts`.
3. `tests/e2e/select-all.spec.ts` (Teil B1) — `watchForConsoleErrors`/`settle`-Muster kopieren;
   **vor** jedem Testfall Abschnitt 4 prüfen, um Duplikate zu vermeiden.
   `npm run test:e2e -- select-all.spec.ts`.
4. `tests/e2e/select-all-roundtrip.spec.ts` (Teil B2) inkl. `test.fixme` für RT-6/7/8.
5. `playwright.config.ts` — `testMatch` **beider** Clipboard-Projekte um `select-all` erweitern
   (6.5); `select-all.spec.ts` auf Desktop-WebKit/-Firefox grün bestätigen.
6. Die **4** bestehenden Tests in `selection-regression.spec.ts` unverändert grün laufen lassen;
   höchstens den einen optionalen „Kopieren-ohne-Fett“-Test (6.3) **nur** bei ausdrücklicher
   §2.6-Wortlautforderung ergänzen.
7. Visueller Kontrast-Check (6.4) — Baseline-Screenshots erzeugen, manuell sichten, committen.
8. Vollständiger Lauf aller Projekte (`npx playwright test`) vor Abnahme.

---

## 10. Abnahmekriterien (Definition of Done dieses Testplans)

Deckungsgleich mit `alles-auswaehlen-req.md` Abschnitt 8, Punkt 5:

- [ ] Alle Testfälle aus Anforderungs-Abschnitt 1, 3 und 6 sind als automatisierte, dauerhafte
      Tests vorhanden und grün (Matrix Abschnitt 7) — teils neu (B1/RT/UT), teils **bereits**
      abgedeckt (Abschnitt 4), ohne Duplikate.
- [ ] Die **vier** bestehenden Selection-Sync-Regressionstests laufen unverändert grün; die
      Ausschneiden-Variante (`cut.spec.ts` Testfall 5) und die Kopieren-Variante
      (`selection-regression.spec.ts` Test 4) sind **bereits** vorhanden; ein optionaler
      „Kopieren-ohne-Fett“-Test nur bei ausdrücklicher Forderung.
- [ ] Rundreise-Anforderung Abschnitt 4 ist für DOCX und ODT nachgewiesen (RT-1..5, RT-9 + UT-D*/O*);
      RT-6/7/8 bleiben `test.fixme` mit Blocker-Verweis (§5.3), der Konvertierungsanteil ist via
      UT-D6/UT-O6 bewiesen — nicht kommentarlos übersprungen.
- [ ] Visueller Kontrast-Check (6.4) ist in Light **und** Dark durchgeführt, Baselines geprüft und
      committet.
- [ ] Alle Tests laufen auf `Desktop Chrome`/`Mobile`/`Tablet` grün; nach der `testMatch`-Erweiterung
      (6.5) zusätzlich der Strg/Cmd+A-Kern auf `Desktop Safari`/`Desktop Firefox`; verbleibende
      Lücken (echtes physisches macOS, natives Mobile-Popup, echte IME) sind in Abschnitt 8
      dokumentiert, nicht stillschweigend als erledigt markiert.
- [ ] Alle Teil-B-Tests befolgen die Determinismus-Leitlinien aus Abschnitt 3 (D1–D7); kein Test
      verlässt sich auf ungebremste Tastenfolgen über einen nativen Selektions-/Caret-Wechsel hinweg.
- [ ] `npm run test` (Vitest, Teil A) und `npm run test:e2e` (Playwright, Teil B) sind beide
      Bestandteil des CI-Laufs für dieses Feature.

Erst wenn alle Punkte erfüllt sind, darf der Backlog-Status `alles-auswaehlen` auf „verifiziert“
gesetzt werden.
