# QA-Testplan: „Manueller Zeilenumbruch (Umschalt+Enter)"

Bezug: `specs/zeilenumbruch-manuell-req.md` (Anforderung, Stand 2026-07-05) und
`specs/zeilenumbruch-manuell-code.md` (Umsetzungsplan, Stand 2026-07-05). Rolle
dieses Dokuments: konkreter, ausführbarer Testplan für die Freigabe nach Anforderung
Abschnitt 7. Alle referenzierten Bestandsdateien wurden für diesen Testplan **direkt
gegen den aktuellen Repo-Inhalt (2026-07-05)** verifiziert:
`playwright.config.ts`, `tests/e2e/docx.spec.ts`, `tests/e2e/selection-regression.spec.ts`,
`src/formats/shared/schema.ts`, `src/formats/shared/editor/commands.ts`,
`src/formats/shared/editor/Toolbar.tsx`, `src/formats/shared/editor/WordEditor.tsx`,
`src/formats/docx/__tests__/roundtrip.test.ts`, `src/formats/odt/__tests__/roundtrip.test.ts`.
**Load-bearing ist jeweils das beschriebene Verhalten und der Testname, nicht die exakte
Zeilennummer** — die Dateien verschieben sich zwischen den Ständen.

**Grundprinzip dieses Testplans (bindend):** Zwei getrennte, beide verpflichtende Ebenen —
(1) Unit-Tests gegen Reader/Writer direkt (schnell, deterministisch, aber blind für den
Tastatur-Eingabeweg) und (2) **echte** Playwright-Browser-Tests, die den kompletten Weg
Klick/Tastendruck → sichtbare DOM-Änderung → echter Datei-Download → Byte-Inspektion der
heruntergeladenen Datei → echter Re-Upload nachstellen. Interne Funktionsaufrufe
(`readDocx`/`writeOdt` o. Ä. direkt im Testcode) zählen **nicht** als Ersatz für Ebene (2) —
sie sind zulässig als Ebene (1) oder als klar gekennzeichnete Ergänzung *innerhalb* eines
E2E-Tests (siehe 0.5 zur Cross-Format-Einschränkung), niemals als vollwertiger Ersatz für
„im Browser geklickt/getippt".

---

## 0. Prüfmethodik — Befund, Korrekturen und Verschärfungen

### 0.1 Zwei-Ebenen-Prinzip (übernommen)

Die Testfall-Enumeration aus `zeilenumbruch-manuell-code.md` Abschnitt 14 wird inhaltlich
übernommen und unten in konkrete, ausführbare Testdateien überführt. Ergänzt um die in 0.2–0.9
benannten Korrekturen und Verschärfungen.

### 0.2 KORREKTUR (kritisch): Browser-Matrix — Firefox/Safari existieren **bereits**, nur `testMatch` muss erweitert werden

Ein früherer Stand dieses QA-Dokuments (Stand 2026-07-04) ging davon aus, `playwright.config.ts`
enthalte nur `Desktop Chrome`, `Mobile`/Pixel 7 und `Tablet`/iPad Mini und **keine**
Firefox-Engine, und schrieb vor, ein **neues** `Desktop Firefox`-Projekt anzulegen. **Das ist gegen
den aktuellen Code falsch** und wird hiermit korrigiert.

Verifiziert (`playwright.config.ts`, aktuell fünf Projekte):

```ts
{ name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'], permissions: ['clipboard-read', 'clipboard-write'] } },
{ name: 'Mobile',         use: { ...devices['Pixel 7'],         permissions: ['clipboard-read', 'clipboard-write'] } },
{ name: 'Tablet',         use: { ...devices['iPad Mini'] } },
{ name: 'Desktop Safari (Clipboard)',  testMatch: /clipboard.*\.spec\.ts/, use: { ...devices['Desktop Safari'] } },
{ name: 'Desktop Firefox (Clipboard)', testMatch: /clipboard.*\.spec\.ts/, use: { ...devices['Desktop Firefox'] } },
```

Es gibt also **bereits** echte Firefox- **und** Safari-Desktop-Projekte (eingeführt für die
„Kopieren"-Browser-Matrix). Beide sind jedoch per `testMatch: /clipboard.*\.spec\.ts/`
**ausschließlich** auf Dateien beschränkt, deren Name mit `clipboard…` beginnt. Eine neue
`tests/e2e/zeilenumbruch.spec.ts` würde von ihnen **nicht** erfasst.

**Korrigierte Voraussetzung dieses Testplans (statt „neues Projekt anlegen"):** den `testMatch`
beider Desktop-Projekte um den neuen Spec-Namen erweitern (`zeilenumbruch-manuell-code.md`
Abschnitt 13):

```ts
name: 'Desktop Safari (Clipboard)',
testMatch: /(clipboard|zeilenumbruch).*\.spec\.ts/,
use: { ...devices['Desktop Safari'] },
```
```ts
name: 'Desktop Firefox (Clipboard)',
testMatch: /(clipboard|zeilenumbruch).*\.spec\.ts/,
use: { ...devices['Desktop Firefox'] },
```

Damit läuft `zeilenumbruch.spec.ts` auf **Chromium** (Desktop Chrome), **Firefox** (Desktop
Safari-Projekt heißt so, verwendet aber Gecko … nein: Firefox) und **WebKit** (Desktop Safari) —
Anforderung Testplan-Punkt 5 (mind. **zwei echte Engines** für den Tastatur-Test) ist damit
wirksam erfüllt, **ohne** die Firefox-/Safari-Projekte auf die gesamte Suite auszuweiten (das
verdoppelte nur die Laufzeit). Kein neues Projekt, keine Änderung an den bestehenden
Clipboard-Specs. Die Namenszusätze „(Clipboard)" werden durch die erweiterte Reichweite
ungenau — optional zu `Desktop Firefox`/`Desktop Safari` entschärfen, nicht zwingend.

### 0.3 KORREKTUR: `insertHardBreak()` + `'Shift-Enter'` sind **bereits umgesetzt** — offene Arbeit ist der Guard-Bugfix

Ein früherer QA-Stand behandelte den Erzeugungsweg als möglicherweise noch nicht implementiert
(„E1 zuerst ausführen, um die Fragilität des nativen Fallbacks zu prüfen"). **Das ist überholt.**
Verifiziert im aktuellen Code:

- `src/formats/shared/editor/commands.ts`: `insertHardBreak(): Command` existiert
  (`replaceSelectionWith(hard_break)`).
- `src/formats/shared/editor/WordEditor.tsx`: `'Shift-Enter': insertHardBreak()` ist im ersten
  `keymap({...})`-Plugin gebunden; `insertHardBreak` ist dort importiert.
- `src/formats/shared/schema.ts` (Zeile 42–56): `hard_break` inkl. `leafText: () => '\n'`
  (Zeile 51) vorhanden.
- Serialisierung vollständig: DOCX-Writer `<w:r><w:br/></w:r>`, DOCX-Reader `<w:br>` → `hard_break`,
  ODT-Writer `<text:line-break/>`, ODT-Reader `text:line-break` → `hard_break`.

**Konsequenz:** Es gibt **keine** offene Frage „expliziter Command oder nativer Fallback" mehr —
sie ist zugunsten des expliziten Command entschieden. Der einzige verbliebene **Pflicht-Codefix**
ist der `NodeSelection`-Guard in `insertHardBreak` (0.7). E1 (Grundfall) muss daher im aktuellen
Code **bereits grün** sein; ist er es nicht, ist das ein Regressions-Befund am bestehenden
Command, nicht der Nachweis eines fehlenden Features.

### 0.4 VERSCHÄRFUNG (zentral, laut Auftrag): Determinismus — Selektions-Sync abwarten, keine Race durch zu schnelle Tastatureingaben

Der Editor synchronisiert eine per Klick/Pfeiltaste/`Home`/`End` ausgelöste native
Cursorbewegung **asynchron** über das `selectionchange`-Event des Browsers in sein
ProseMirror-Modell (`WordEditor.tsx` `reconcileSelectionOnClick`). Ein unmittelbar folgender
Playwright-`press()` (ohne menschliche Reaktionspause) kann diesem Nachlauf **vorauslaufen** und
noch auf der alten Selektion agieren. Diese Race ist im Repo **bereits dokumentiert und
abgesichert** — `tests/e2e/selection-regression.spec.ts` fügt nach jedem `End`/Reposition-Klick
ein bewusstes `await page.waitForTimeout(50)` ein (Kommentar dort, Zeilen 26–34):

> „ProseMirror only learns a native, keyboard-driven caret move … via the browser's
> asynchronous `selectionchange` event. Firing the next key immediately after … can race ahead
> of that catch-up … a short wait here just gives the already-in-flight sync a chance to land."

**Bindende Determinismus-Regeln für ALLE E2E-Tests dieses Plans:**

1. **Nach jeder Selektions-/Cursor-Umpositionierung durch Klick, `Home`, `End`, Pfeiltaste, `ControlOrMeta+a`
   oder Bild-Klick → vor dem nächsten Tastendruck `await page.waitForTimeout(50)`** (exakt das
   etablierte Muster). Betrifft insbesondere E2 (Select-all → Shift+Enter), E3 (Home/End),
   E9b (Bild-NodeSelection per Klick → Shift+Enter), E10a/b (Home/End → Backspace/Delete),
   E13 (Pfeiltasten-Navigation → Tipp-Marker), E14 (Doppelklick), und den Grenzfall-15-Test (4.3).
2. **Kein „blindes" `waitForTimeout` als Assertion-Ersatz.** Ergebnis-Prüfungen laufen über
   auto-wiederholende `expect(locator).toHaveCount(...)`/`toContainText(...)` (web-first
   assertions), nicht über feste Wartezeiten. `waitForTimeout(50)` dient **ausschließlich** dem
   Selektions-Sync-Nachlauf vor dem nächsten Eingabeschritt, nie der Ergebnisstabilisierung.
3. **Tippen deterministisch:** `page.keyboard.type(text)` für zusammenhängende Eingabe;
   `page.keyboard.press('Shift+Enter')` als einzelner, atomarer Umbruch. Keine `paste`-Simulation
   für den Umbruch selbst (nur im ausdrücklichen Abgrenzungstest E27).
4. **Download deterministisch:** `const dl = page.waitForEvent('download')` **vor** dem
   Exportieren-Klick registrieren, danach `await dl`; Byte-Prüfung über `await download.path()` →
   `fs.readFile` → `JSZip.loadAsync` (Muster aus `docx.spec.ts`).
5. **Re-Upload deterministisch über die etablierte Navigation:** zurück zum Datei-Picker per
   `await page.getByRole('button', { name: /formate/i }).click()` (das `input[type=file]` existiert
   nur auf dem Picker-Screen, nicht im offenen Editor — verifiziert in `docx.spec.ts`), **kein**
   `page.reload()` (verwirft den akzeptierten Datenschutz-Banner-Zustand und ist gegen das
   Repo-Muster).
6. **Massentest (E15):** die 60 `Shift+Enter` in einer Schleife mit `await` je Iteration; die
   Erfolgsprüfung ist eine einzige auto-retry-`expect(...).toHaveCount(60)` mit ausreichendem
   Test-Timeout, kein manuelles Warten.

Jede in diesem Plan angegebene Referenz-Implementierung (Abschnitt 4.3/4.4) enthält diese Waits
**explizit**; ein Testfall, der eine Reposition ohne den 50-ms-Sync-Wait direkt vor `Shift+Enter`
setzt, gilt als **nicht regelkonform** und ist vor Freigabe zu korrigieren.

### 0.5 VERSCHÄRFUNG: Cross-Format ist nur teilweise ein „echter" Browser-Test — so kennzeichnen, nicht verschleiern

Die App besitzt **keine** UI-Funktion „als anderes Format speichern"/„konvertieren" (verifiziert:
kein Treffer für `convert`/`Konvertier` im `src`-Baum; jedes Format-Modul nutzt nur den eigenen
Reader/Writer). Die Cross-Format-Rundreise (Grenzfall 16, Anforderung 5.2.3) ist deshalb **nicht**
als reiner UI-E2E ausführbar. Sie wird auf zwei Ebenen abgedeckt:

- **Unit (vollwertig, U9–U11):** reine Reader/Writer-Verkettung `readDocx → writeOdt → readOdt →
  writeDocx` (und symmetrisch) mit `hard_break`-Fixture.
- **E2E-Handoff (Teilnachweis, E25):** Umbruch per **echter Tastatur** in der DOCX-Karte erzeugen,
  echten Download auslösen, dann den heruntergeladenen Buffer **im Testcode** per `readDocx →
  writeOdt → readOdt` weiterreichen. Der Tastatur-/Export-Teil ist echte Browser-Interaktion, der
  Format-Wechsel ist programmatisch.

**QA-Entscheidung:** E25 wird im Testbericht als „E2E: Umschalt+Enter erzeugt beim echten Export
eine korrekt lesbare Datei + programmatischer Formatwechsel" geführt, **nicht** als „E2E:
Cross-Format bestanden" — das verschleierte den tatsächlichen Umfang. Die Cross-Format-Behauptung
selbst trägt die Unit-Verkettung. Zusätzlich an PO zu melden (Abschnitt 10): eine vollständig
browsergetriebene Cross-Format-Prüfung ist produktseitig grundsätzlich unmöglich — Produktlücke,
keine Testlücke.

### 0.6 VERSCHÄRFUNG: jede Rundreise-Prüfung schließt eine echte Byte-Inspektion ein

Reines „nach Re-Import steht der Text wieder im Editor" verdeckt einen stillen Strukturverlust
(z. B. `hard_break` → Absatz degradiert, sichtbarer Text unverändert). Jeder E2E-Rundreise-Test in
Abschnitt 4.2 prüft deshalb **zusätzlich** die entpackte XML-Struktur der heruntergeladenen Datei
selbst (`<w:br/>` in `word/document.xml` bzw. `<text:line-break/>` in `content.xml`, über echtes
`download.path()` → `fs.readFile` → `JSZip.loadAsync`) **sowie** die Anzahl der `<p>`-Elemente im
Editor-DOM (kein stiller Absatz-Split).

### 0.7 BLOCKER: Bild-/Tabellen-`NodeSelection`-Datenverlust (Anforderung 0.7/3.3) ist Freigabe-Blocker

`insertHardBreak()` (`commands.ts`) verwendet das ungeschützte Muster
`state.tr.replaceSelectionWith(hard_break)`. Verifiziert im Schema: `image` ist `group: 'block'`,
`draggable: true`, **ohne** `selectable: false` (`schema.ts` Zeile 58–85) — also per Klick als
`NodeSelection` markierbar. In diesem Zustand **löscht** `replaceSelectionWith` den selektierten
Knoten (Bild/ganze Tabelle) still und ersetzt ihn durch einen synthetisierten leeren Absatz mit dem
Umbruch. **QA-Einstufung:** Testfall **E9b** ist ein **Pflicht-Blocker**. Schlägt er fehl (Bild
verschwindet), ist der gesamte Feature-Rundreise-Status (Anforderung 5.2) als **nicht bestanden**
zu werten — unabhängig vom Status aller anderen Tests, weil das Abnahmekriterium (Anforderung 5)
„vollständiges Verschwinden … von Textinhalt/Umbruch/Knoten" ausschließt. Der Fix ist der
`NodeSelection`-Guard aus `zeilenumbruch-manuell-code.md` Abschnitt 3.2; E9b muss **ohne** den Fix
rot sein und ihn damit erzwingen.

### 0.8 VERSCHÄRFUNG: Kopieren-Regression bleibt Teil der Baseline

`hard_break.leafText` und der `clipboardTextSerializer` sind mit „Kopieren" geteilt (Anforderung
0.8). Die Kopieren-Regressionstests (`src/formats/shared/editor/__tests__/clipboard.test.ts`:
`leafText === '\n'`, „renders a hard_break as a newline instead of merging the surrounding words")
sind Teil der Baseline (Abschnitt 7.1) und müssen vor **und** nach jeder Arbeit an diesem Feature
grün bleiben. Kein Entfernen/Ändern von `leafText`.

### 0.9 ERGÄNZUNG: Undo/Redo-Gruppierung als eigener, protokollierter Testfall

Anforderung 3.15 verlangt explizit „kein unerwartetes Undo-Gruppierungsverhalten". Ohne feste
Sollvorgabe der Gruppierung. QA führt dafür einen eigenen Testfall (E12): das beobachtete Verhalten
ist zu **protokollieren** und danach als reproduzierbare Referenz festzuhalten, nicht nachträglich
als Bug zu werten, sofern es stabil und datenverlustfrei ist.

---

## 1. Teststufen-Übersicht

| Ebene | Werkzeug | Deckt ab | Deckt **nicht** ab |
|---|---|---|---|
| Unit | Vitest, `readDocx`/`writeDocx`/`readOdt`/`writeOdt` direkt | Reader/Writer-Korrektheit, Serialisierungsformat, Fremd-Fixture-Parsing, Cross-Format-Verkettung, Marken-Erhalt über den Umbruch, bekannte Reader-Lücken (Grenzfall 13/14) | Den echten Tastatur-Eingabeweg (`Shift+Enter` im `contenteditable`), UI-Bedienbarkeit, Datei-Upload/-Download über die reale Oberfläche, den Datenverlust-Bug 0.7 |
| E2E (Playwright, echter Browser) | `page.keyboard`, `page.locator(...).click()`, `input.setInputFiles(...)`, `page.waitForEvent('download')`, `JSZip` | Kompletter Nutzerweg: Klicks, echte Tastatureingabe inkl. `Shift+Enter`, Datei-Upload, Export mit echtem Download-Event, Byte-Inspektion, Re-Upload, Cross-Browser (Chromium/Firefox/WebKit), Touch-Button, Bild-`NodeSelection`-Datenverlust | Feinkörnige interne Datenmodell-Zustände ohne DOM-Auswirkung (Unit-Ebene, günstiger) |

Beide Ebenen sind laut Anforderung Testplan-Punkt 10 **beide verpflichtend** — keine ersetzt die
andere.

---

## 2. Testumgebung & Fixtures

### 2.1 Voraussetzung: `playwright.config.ts` — `testMatch` erweitern (nicht neues Projekt)

Wie in 0.2 korrigiert: **kein** neues Firefox-/Safari-Projekt anlegen. Stattdessen den `testMatch`
der beiden bestehenden Desktop-Projekte auf `/(clipboard|zeilenumbruch).*\.spec\.ts/` erweitern
(Snippet in 0.2). **Vor** dem ersten Testlauf dieses Plans zu erledigen. Nebenwirkung: die
bestehenden Clipboard-Specs bleiben unberührt; nur `zeilenumbruch.spec.ts` kommt auf Firefox/Safari
hinzu. Die restliche E2E-Suite (docx/odt/lifecycle/selection-regression) bleibt wie gehabt auf
Chromium + Mobile + Tablet — **keine** ungewollte Laufzeitverdopplung.

### 2.2 Reale Fixture-Dateien (bereits im Repo, verifiziert per Verzeichnis-Listing)

| Datei | Verwendung |
|---|---|
| `tests/fixtures/external/docx/drawing.docx` | echtes `<w:br/>` (impliziter + expliziter `w:type="textWrapping" w:clear="all"`) — Anforderung 3.8/5.2.6 |
| `tests/fixtures/external/docx/saut_page.docx` | Grenzfall 13: `<w:br w:type="page"/>` **und** einfaches `<w:br/>` im selben Dokument |
| `tests/fixtures/external/docx/bug57031.docx`, `bug65649.docx` | weitere Grenzfall-13-Fixtures; `bug65649.docx` zusätzlich sehr viele Umbrüche (Grenzfall 17, Reader-seitig) |
| `tests/fixtures/external/odt/TextLineBreakText.odt` | echtes `<text:line-break/>`, **verschachtelt in `<text:span>`** (Grenzfall 20), Anforderung 3.10/5.2.7 |
| `tests/fixtures/external/odt/EasyList.odt`, `ListStyleResolution.odt` | Grenzfall 7 (Umbruch in Listenpunkt) mit echter Fremddatei |
| `tests/fixtures/external/odt/text-extract.odt`, `sections.odt` | Negativtest Grenzfall 14: `<text:soft-page-break/>` **ohne** `<text:line-break/>` |

### 2.3 Neu zu erstellendes synthetisches Fixture (Grenzfall 14, exakte Adjazenz)

Kein reales Fixture enthält `<text:line-break/>` **unmittelbar gefolgt von**
`<text:soft-page-break/>` im selben Absatz (bestätigt in `zeilenumbruch-manuell-code.md`
Abschnitt 0.5). Wird als kleines, im Testcode per JSZip gebautes ODT-Fixture erzeugt (U8) — kein
Blocker, da synthetisch reproduzierbar.

### 2.4 Reihenfolge-Voraussetzungen (Codefix und Touch-Button vor bestimmten Tests)

- **E9b** setzt den `NodeSelection`-Guard (`code.md` 3.2) voraus, um grün zu sein — ist aber
  bewusst so geschrieben, dass er **ohne** den Fix rot ist (er erzwingt ihn). Er darf **vor** dem
  Fix ausgeführt werden (Rot = erwartet).
- **E29** (Touch-Button) setzt den Toolbar-Button `getByTitle('Zeilenumbruch einfügen')` aus
  `code.md` Abschnitt 6/8 voraus. Dieser Button existiert im aktuellen Code **noch nicht**
  (verifiziert: `Toolbar.tsx` importiert `insertImage`/`insertTable`, **nicht** `insertHardBreak`,
  und hat keinen entsprechenden Button). E29 ist folglich erst nach Umsetzung von `code.md`
  Abschnitt 6 lauffähig; bis dahin ist der Touch-Weg **unerfüllt** und Grenzfall 21 offen
  (Abschnitt 10, Risiko).
- Alle übrigen E-Tests (E1–E8, E10–E27) sind gegen den aktuellen Code lauffähig; E9b ist der
  einzige, der einen Rot-vor-Fix-Zustand erwartet.

---

## 3. Unit-Testplan (Reader/Writer-Rundreise, DOCX + ODT)

Referenzimplementierung für U3–U12 liegt als Code in `zeilenumbruch-manuell-code.md` Abschnitt 14.1
(a–f) vor; QA übernimmt diese Snippets als verbindliche Basis mit den unten genannten
Pflichtergänzungen. `doc`/`roundTrip`-Helper sind in beiden `roundtrip.test.ts` bereits vorhanden.

| ID | Datei | Testname (sinngemäß) | Prüft | Bezug |
|---|---|---|---|---|
| U1 | `docx/__tests__/roundtrip.test.ts` | „preserves hard line breaks within a paragraph" | **bereits vorhanden** (`Zeile eins\|hard_break\|Zeile zwei`) — Regressionsschutz, unverändert | 3.5 Baseline |
| U2 | `odt/__tests__/roundtrip.test.ts` | „preserves hard line breaks within a paragraph" | **bereits vorhanden** — Regressionsschutz, unverändert | 3.5 Baseline |
| U3 | `docx/__tests__/roundtrip.test.ts` (neu) | „preserves multiple consecutive hard breaks in the same paragraph" | 3 aufeinanderfolgende `hard_break` bleiben exakt 3, korrekte Reihenfolge (`A\|hard_break\|hard_break\|hard_break\|B`) | Grenzfall 3/17 |
| U4 | `docx/__tests__/roundtrip.test.ts` (neu) | „preserves a hard break inside a heading" | Überschrift bleibt **1** Node (`heading`), `hard_break` erhalten | Grenzfall 6, 3.11 |
| U5 | `docx/__tests__/roundtrip.test.ts` (neu) | „preserves a leading and trailing hard break" | führende/folgende leere Zeile nicht verworfen | Grenzfall 1/2, 3.4 |
| U6 | `odt/__tests__/roundtrip.test.ts` (neu) | identische drei Tests wie U3–U5, ODT-Variante | dito für ODT | wie oben |
| U7a | `docx/__tests__/external-fixtures.test.ts` (neue `describe`) | „reads plain `<w:br/>` (drawing.docx) as hard_break" | Fremd-Fixture korrekt gelesen | 3.8, 5.2.6 |
| U7b | dito | „documents that `<w:br w:type=\"page\"/>` in saut_page.docx is ALSO read as hard_break — count assertion" | **bewusst dokumentierte Lücke** sichtbar, kein Fix hier | Grenzfall 13, 3.8 |
| U7c | dito | „reads an explicit `w:type=\"textWrapping\"` break (drawing.docx) as hard_break too" | Default-Fall korrekt | 3.8 |
| U7d | `odt/__tests__/external-fixtures.test.ts` (neue `describe`) | „reads the styled, nested `<text:line-break/>` in TextLineBreakText.odt as hard_break" | Fremd-Fixture, in `<text:span>` verschachtelt, Formatierung erhalten | Grenzfall 20, 3.10 |
| U7e | dito | „does not misinterpret text:soft-page-break as hard_break (text-extract.odt)" | Negativtest | Grenzfall 14, 3.10 |
| U8 | `odt/__tests__/hardBreakVsSoftPageBreak.test.ts` (neu, synthetisch) | „line-break unmittelbar gefolgt von soft-page-break im selben Absatz" | genau **1** `hard_break`, Reihenfolge `Zeile eins\|hard_break\|Zeile zwei` | Grenzfall 14 |
| U9 | `formats/__tests__/crossFormatHardBreak.test.ts` (neu) | „DOCX → ODT → DOCX" | `hard_break` übersteht doppelten Formatwechsel, Text unverändert, **weiterhin 1 Absatz** | Grenzfall 16, 5.2.3 |
| U10 | dito | „ODT → DOCX → ODT" | wie U9, umgekehrte Richtung | Grenzfall 16, 5.2.3 |
| U11 | dito | „multiple breaks + heading + list survive a double format round trip" | kumulativer Verlust-Test (Heading+Liste+2×`hard_break`) | Grenzfall 16, 5.2.8 |
| **U12** | `docx/__tests__/roundtrip.test.ts` **und** `odt/…` (neu) | „preserves marks on BOTH sides of a hard break" | fetter Text + `hard_break` + fetter Text → beide Seiten behalten `strong` nach Rundreise (beide Formate) | **Grenzfall 19**, 3.6 |

**Pflichtergänzung zu U3 (Reihenfolge, nicht nur Anzahl — Anforderung 3.13):**
```ts
it('preserves exact ordering around multiple consecutive hard breaks', async () => {
  const original = doc([
    { type: 'paragraph', attrs: { align: 'left' }, content: [
      { type: 'text', text: 'A' },
      { type: 'hard_break' }, { type: 'hard_break' }, { type: 'hard_break' },
      { type: 'text', text: 'B' },
    ] },
  ])
  const result = await roundTrip(original)
  const content = (result.body as any).content[0].content
  expect(content.map((n: any) => n.text ?? n.type).join('|')).toBe('A|hard_break|hard_break|hard_break|B')
})
```

**Pflichtergänzung zu U9/U10 (Negativ-Assertion gegen Absatz-Degradierung — Anforderung 3.12):**
```ts
expect((final.body as any).content).toHaveLength(1) // weiterhin genau 1 Absatz, kein Split
```

**U12 (neu, Grenzfall 19 — Marken-Erhalt beidseitig, Serialisierungsebene):**
```ts
it('preserves marks on both sides of a hard break', async () => {
  const original = doc([
    { type: 'paragraph', attrs: { align: 'left' }, content: [
      { type: 'text', text: 'fett eins', marks: [{ type: 'strong' }] },
      { type: 'hard_break' },
      { type: 'text', text: 'fett zwei', marks: [{ type: 'strong' }] },
    ] },
  ])
  const result = await roundTrip(original)
  const content = (result.body as any).content[0].content
  const bold = content.filter((n: any) => n.marks?.some((m: any) => m.type === 'strong'))
  expect(bold.map((n: any) => n.text)).toEqual(['fett eins', 'fett zwei'])
  expect(content.some((n: any) => n.type === 'hard_break')).toBe(true)
})
```

---

## 4. Playwright E2E-Testplan — echte Browser-Interaktion (Pflicht)

Neue Datei `tests/e2e/zeilenumbruch.spec.ts`, Aufbau analog `tests/e2e/docx.spec.ts` /
`tests/e2e/selection-regression.spec.ts`:

- Datenschutz-Banner: `await page.getByRole('button', { name: /verstanden/i }).click()`.
- DOCX-Karte: `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })`.
- ODT-Karte: `… { name: 'OpenDocument Text (.odt)' }`.
- Neues Dokument: `.getByRole('button', { name: 'Neu erstellen' })`.
- Editor: `page.locator('.ProseMirror')`.
- Export: `page.getByRole('button', { name: 'Exportieren' })` + `page.waitForEvent('download')`.
- Zurück zum Picker (für Re-Upload): `page.getByRole('button', { name: /formate/i }).click()`.

**Jeder** Testfall verwendet ausschließlich `page.keyboard.*` / `page.locator(...).click()` /
`input.setInputFiles(...)` für die Interaktion — **keine** direkten `insertHardBreak()`/`readDocx()`/
`writeOdt()`-Aufrufe im Testkörper, außer als klar gekennzeichnete „Byte-Inspektion" (JSZip) oder
im einen Cross-Format-Handoff (E25, siehe 0.5). **Alle** Repositions-Schritte respektieren die
Determinismus-Regeln aus 0.4 (50-ms-Sync-Wait vor dem nächsten Tastendruck).

### 4.1 Kern-Testfälle (Tastatur-Eingabeweg)

| ID | Name | Schritte (echte Interaktion) | Assertion | Bezug |
|---|---|---|---|---|
| E1 | Grundfall Shift+Enter | `Neu erstellen` → `editor.click()` → `type('Zeile eins')` → `press('Shift+Enter')` → `type('Zeile zwei')` | `.ProseMirror p` Count **1**; `editor.locator('br')` Count **1**; beide Texte sichtbar | 3.1 |
| E2 | Selektion ersetzen | E1-Text, `ControlOrMeta+a`, **`waitForTimeout(50)`**, `Shift+Enter` | vorheriger Text weg, `br` Count 1, `p` Count 1 | 3.2 |
| E3 | Anfang/Ende | `Home`, `waitForTimeout(50)`, `Shift+Enter`; separat `End`, `waitForTimeout(50)`, `Shift+Enter`, weitertippen | führende bzw. folgende leere Zeile, kein No-Op (`br` Count steigt sichtbar) | 3.4, Grenzfall 1/2 |
| E4 | Mehrfach ohne Text | 3× `Shift+Enter` hintereinander | `br` Count **3**, kein Zusammenfall auf 1 | Grenzfall 3 |
| E5 | Shift+Enter + Enter gemischt | Text, `Shift+Enter`, Text, `Enter`, Text | `.ProseMirror p` Count **2**; erster Absatz genau **1** `br` | Grenzfall 4 |
| E6 | Leerer Absatz | `Neu erstellen`, `editor.click()`, sofort `Shift+Enter` | kein `pageerror`, `br` Count **1** | Grenzfall 5 |
| E7 | Überschrift | `getByLabel('Absatzformat')` → `selectOption('1')`, Text, `Shift+Enter`, Text | `.ProseMirror h1` Count weiterhin **1**, kein Split | Grenzfall 6, 3.11 |
| E8 | Listenpunkt | `getByTitle('Aufzählung').click()`, Text, `Shift+Enter`, Text | `.ProseMirror li` Count weiterhin **1** | Grenzfall 7, 3.11 |
| E9a | Tabellenzelle (Text-Cursor) | `getByTitle('Tabelle einfügen').click()`, Zelle klicken, `waitForTimeout(50)`, Text, `Shift+Enter`, Text | `.ProseMirror td` Count unverändert, beide Zeilen in derselben Zelle | Grenzfall 8, 3.11 |
| **E9b** (**BLOCKER**) | Bild-`NodeSelection` + Shift+Enter | Bild via `label:has-text('Bild') input[type=file]` + `setInputFiles` (kleines PNG) einfügen, dann **`editor.locator('img').click()`** (setzt `NodeSelection`), **`waitForTimeout(50)`**, `Shift+Enter` | `editor.locator('img')` Count bleibt **1** (nicht 0) — Pflicht-Blocker (0.7); ohne Guard rot | Grenzfall 9 |
| E9c | Bild-Textnachbarschaft (kein NodeSelection) | Bild einfügen, Cursor **im Text davor** per Klick, `waitForTimeout(50)`, `Shift+Enter` | Bild bleibt sichtbar (`img` Count 1), Umbruch im Text | Grenzfall 9 |
| **E9d** | `CellSelection` (ganze Zellen) | Tabelle einfügen, über mehrere ganze Zellen eine `CellSelection` ziehen (Maus-Drag von Zelle 0 nach Zelle n), `waitForTimeout(50)`, `Shift+Enter` | `.ProseMirror td` Count unverändert, keine Zelle gelöscht — charakterisierend (Guard erfasst `CellSelection` nicht, `code.md` 3.3) | **Grenzfall 8b** |
| E10a | Löschen (Backspace nach Umbruch) | Text, `Shift+Enter`, Text; `Home` (Anfang 2. Zeile), `waitForTimeout(50)`, `Backspace` | `br` Count **0**, beide Teile zu **einer** Zeile, exakter `editor.textContent()`-Vergleich (kein Zeichenverlust) | Grenzfall 10 |
| E10b | Löschen (Delete vor Umbruch) | wie E10a, aber `End` (Ende 1. Zeile), `waitForTimeout(50)`, `Delete` | dieselbe Assertion wie E10a | Grenzfall 10 |
| E11 | Undo/Redo — Umbruch allein | E1-Sequenz, `ControlOrMeta+z` → `br` Count **0**, Text unverändert; `ControlOrMeta+y` (bzw. `ControlOrMeta+Shift+z`) → `br` Count wieder **1** | 3.15, Grenzfall 22 |
| E12 | Undo-Gruppierung Umbruch+Tippen | E1-Sequenz, **ein** `ControlOrMeta+z` | beobachtetes Gruppierungsverhalten **protokollieren** (nur „Zeile zwei" weg **oder** Umbruch+Text zusammen), danach reproduzierbar — keine feste Sollvorgabe, aber datenverlustfrei | 3.15, 0.9 |
| E13 | Navigation (Pfeiltasten) | Text A + `Shift+Enter` + Text B, `Home`, `waitForTimeout(50)`, `ArrowRight` × (Länge A + 1), `waitForTimeout(50)`, Tipp-Marker | Marker erscheint in Zeile B, nicht in Zeile A | Grenzfall 11, 3.14 |
| E14 | Doppelklick-Wortgrenze | „vor" + `Shift+Enter` + „nach", Doppelklick auf „vor", `waitForTimeout(50)` | `page.evaluate(() => window.getSelection()?.toString())` exakt `"vor"` (ohne Umbruch/Folgewort) | Grenzfall 12, 3.14 |
| E15 | Massentest (60×) | 60× `Shift+Enter` in Schleife (je `await`) | kein Timeout, `br` Count **60**; danach Export → Re-Import → weiterhin 60 | Grenzfall 17 |
| **E16** | Marken über den Umbruch + Weitertippen | Text tippen, `ControlOrMeta+a`, `waitForTimeout(50)`, `getByTitle('Fett').click()`, Cursor ans Ende (`End`, `waitForTimeout(50)`), `Shift+Enter`, weitertippen | neuer Text ist fett (`editor.locator('strong')` umschließt beide Seiten); danach Export → Re-Import → beide Seiten weiterhin fett | **Grenzfall 19**, 3.6 |
| E27 | Zwischenablage-Abgrenzung (extern) | Umbruch erzeugen, danach mehrzeiligen **externen** Klartext per simuliertem `paste`-Event einfügen | ergibt zusätzliche `<p>`-Absätze (nicht `hard_break`), ursprünglicher `br` bleibt Count 1 an unveränderter Position | 3.13 (Abgrenzung) |
| **E28** | Intern kopieren + einfügen (Klartext `\n`) | Absatz mit `Shift+Enter` erzeugen, `ControlOrMeta+a`, `waitForTimeout(50)`, `ControlOrMeta+c`, Cursor ans Ende, `ControlOrMeta+v` | eingefügter Abschnitt enthält den Umbruch erneut (`br` Count steigt); Klartext-Repräsentation bleibt `\n` (Kopplung an Kopieren, keine Wort-Verschmelzung) | **Grenzfall 18**, 3.13 |

### 4.2 Datei-Upload/-Export-Testfälle (echter Download + Byte-Inspektion, Pflicht)

| ID | Name | Schritte | Assertion (inkl. Byte-Ebene) | Bezug |
|---|---|---|---|---|
| E17 | DOCX-Export enthält `<w:br/>` | DOCX-Karte, Text+`Shift+Enter`+Text, Export, `download.path()` → `fs.readFile` → `JSZip` → `word/document.xml` | `documentXml` enthält `<w:br/>` (ohne `w:type`) **und** beide Textteile | 3.7 |
| E18 | DOCX-Re-Import erhält Umbruch | nach E17: über `/formate/i` zurück, exportierten Buffer per `setInputFiles` erneut in DOCX-Karte hochladen | `.ProseMirror p` Count 1, `br` Count 1, beide Texte sichtbar | 5.2.1 |
| E19 | ODT-Export enthält `<text:line-break/>` | wie E17, ODT-Karte, `content.xml` | enthält `<text:line-break/>`, beide Textteile | 3.9 |
| E20 | ODT-Re-Import erhält Umbruch | wie E18, ODT-Karte | wie E18 | 5.2.1 |
| E21 | Import fremde Word-Datei | `setInputFiles({ buffer: readFileSync('…/docx/drawing.docx') })` in DOCX-Karte → Export → Re-Import | Import zeigt Inhalt; Export-`documentXml` enthält `<w:br/>`; Re-Import erhält ihn | 3.8, 5.2.6 |
| E22 | Import fremde LibreOffice-Datei | wie E21 mit `…/odt/TextLineBreakText.odt` in ODT-Karte (deckt `text:span`-verschachtelten Fall / Grenzfall 20) | analoge Assertion mit `<text:line-break/>` | 3.10, 5.2.7, Grenzfall 20 |
| E23 | Baseline: DOCX ohne Umbruch bleibt frei von `<w:br/>` | reale DOCX **ohne** Umbruch (`buildSampleDocx()`-Muster aus `docx.spec.ts`) unverändert exportieren | `documentXml` enthält **kein** `<w:br/>` — kein fälschlich erkannter Umbruch | 5.1.1 |
| E24 | Baseline: ODT-Pendant | wie E23 für ODT | `content.xml` enthält **kein** `<text:line-break/>` | 5.1.2 |
| E25 | Cross-Format-Handoff (Teilnachweis, 0.5) | in DOCX-Karte Umbruch per Tastatur, Export (echter Download), Buffer im Test per `readDocx → writeOdt → readOdt` | Ergebnis enthält `hard_break`; umgekehrte Richtung symmetrisch — **im Bericht NICHT als „E2E Cross-Format" führen** | 5.2.3, Grenzfall 16 |
| E26 | Baseline: reines `Enter` unverändert | Text, reines `Enter`, Text (direkter Nachbartest zu E1) | **2** `<p>`-Absätze — keine Vermischung Enter/Shift+Enter | 5.1.4 |

### 4.3 Ergänzung `tests/e2e/selection-regression.spec.ts` (Grenzfall 15, Pflicht) — **mit** Sync-Wait

Neuer Test **innerhalb** des bestehenden `describe`-Blocks (bleibt Teil der etablierten
Selection-Sync-Suite). **Der 50-ms-Sync-Wait nach `End` ist verpflichtend** (0.4) — er fehlte in
einem früheren QA-Entwurf und ist hier korrigiert, exakt nach dem Muster des ersten Tests dieser
Datei:

```ts
test('Shift+Enter after a stale-selection reposition click — both line parts must survive', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')

  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()

  await editor.click()
  await page.keyboard.press('End')
  // Selektions-Sync-Nachlauf abwarten — gleiche async-`selectionchange`-Race wie im
  // ersten Test dieser Datei (Kommentar dort). OHNE dieses Warten kann Shift+Enter auf
  // der veralteten AllSelection agieren.
  await page.waitForTimeout(50)
  await page.keyboard.press('Shift+Enter')
  await page.keyboard.type('Zweite Zeile.')

  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweite Zeile.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(1)
  await expect(editor.locator('br')).toHaveCount(1)
})
```

### 4.4 Referenz-Implementierung E1 + E17/E18 (Muster für alle übrigen Testfälle, mit Determinismus)

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}

test.describe('Zeilenumbruch (Shift+Enter) — DOCX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('E1: Shift+Enter erzeugt einen Umbruch im selben Absatz, kein neuer <p>', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Zeile eins')
    await page.keyboard.press('Shift+Enter')
    await page.keyboard.type('Zeile zwei')

    await expect(page.locator('.ProseMirror p')).toHaveCount(1)
    await expect(editor.locator('br')).toHaveCount(1)
    await expect(editor).toContainText('Zeile eins')
    await expect(editor).toContainText('Zeile zwei')
  })

  test('E17+E18: Export enthält <w:br/>, Re-Upload erhält den Umbruch', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Zeile eins')
    await page.keyboard.press('Shift+Enter')
    await page.keyboard.type('Zeile zwei')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const downloadedPath = await download.path()
    expect(downloadedPath).toBeTruthy()

    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile(downloadedPath!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).toContain('<w:br/>')
    expect(documentXml).toContain('Zeile eins')
    expect(documentXml).toContain('Zeile zwei')

    // Echter Re-Upload über die UI — zurück zum Picker (das input[type=file] existiert
    // nur dort), KEIN page.reload(). Kein direkter readDocx()-Aufruf im Test.
    await page.getByRole('button', { name: /formate/i }).click()
    const input = docxCard(page).locator('input[type="file"]')
    await input.setInputFiles({
      name: 'reimport.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: exportedBuffer,
    })
    await expect(editor.locator('br')).toHaveCount(1)
    await expect(editor.locator('p')).toHaveCount(1)
    await expect(editor).toContainText('Zeile eins')
    await expect(editor).toContainText('Zeile zwei')
  })
})
```

Alle übrigen Testfälle folgen demselben Muster (`page.keyboard`/`click`/`setInputFiles`/
`waitForEvent('download')`) mit den in 4.1/4.2 beschriebenen Schritten/Assertions und den
Determinismus-Regeln aus 0.4.

### 4.5 Touch-Testfall (Grenzfall 21) — abhängig vom Toolbar-Button

```ts
// E29 (läuft auf 'Mobile' und 'Tablet'; setzt den Toolbar-Button aus code.md Abschnitt 6/8 voraus)
test('E29: Zeilenumbruch per Toolbar-Button auf Touch erzeugbar', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Zeile eins')
  await page.getByTitle('Zeilenumbruch einfügen').click()
  await page.keyboard.type('Zeile zwei')
  await expect(page.locator('.ProseMirror p')).toHaveCount(1)
  await expect(editor.locator('br')).toHaveCount(1)
})
```

Solange der Button nicht umgesetzt ist (aktueller Code, 2.4), ist Grenzfall 21 **offen** und als
Risiko zu melden (Abschnitt 10). Die Tastatur-Tests E1–E28 werden auf „Mobile"/„Tablet" per
`test.skip(({ isMobile }) => isMobile, 'Shift+Enter auf Software-Tastatur nicht verlässlich')`
übersprungen, damit dort nur E29 (Button) läuft und `Shift+Enter`-Erwartungen nicht fälschlich
fehlschlagen.

---

## 5. Browser-Coverage-Matrix

| Testfall-Gruppe | Desktop Chrome (Chromium) | Desktop Firefox | Desktop Safari (WebKit) | Mobile (Chromium, Touch) | Tablet (WebKit, Touch) |
|---|---|---|---|---|---|
| E1–E16, E27, E28 (Kern-Tastatur) | Pflicht | **Pflicht** (nach `testMatch`-Erweiterung, 0.2) | **Pflicht** (dito) | übersprungen (kein `Shift+Enter`) | übersprungen |
| E9b (Blocker Bild) | Pflicht | Pflicht (Selektionsverhalten kann pro Engine leicht abweichen) | Pflicht | — | — |
| E17–E26 (Datei-Upload/-Export) | Pflicht | Empfehlung | Empfehlung | Optional | Optional |
| E29 (Touch-Button) | — | — | — | **Pflicht** | **Pflicht** |

**Minimalanforderung zur Freigabe:** E1 (Grundfall) und E9b (Blocker) müssen unter **mindestens
zwei echten Engines** (Chromium + Firefox **oder** Chromium + WebKit) grün sein — nach der
`testMatch`-Erweiterung automatisch auf allen drei Desktop-Engines (Anforderung Testplan-Punkt 5).

---

## 6. Grenzfall-Abdeckungsmatrix (Anforderung Abschnitt 4 — alle 22)

| # | Grenzfall | Test-ID(s) |
|---|---|---|
| 1 | Umbruch am Absatzanfang | E3 |
| 2 | Umbruch am Absatzende | E3 |
| 3 | Mehrfach ohne Text | E4, U3 |
| 4 | Umbruch + Enter gemischt | E5 |
| 5 | Umbruch in leerem Absatz | E6 |
| 6 | Umbruch in Überschrift | E7, U4 |
| 7 | Umbruch in Listenpunkt | E8; reale Fixtures `EasyList.odt`/`ListStyleResolution.odt` (Import) |
| 8 | Umbruch in Tabellenzelle (Text-Cursor) | E9a |
| 8b | `CellSelection` (ganze Zellen) | **E9d** (charakterisierend, Restlücke bewusst nicht behoben) |
| 9 | Umbruch bei `NodeSelection`-Bild/Tabelle | **E9b (BLOCKER)**, E9c |
| 10 | Backspace/Entf am Umbruch | E10a, E10b |
| 11 | Pfeiltasten über den Umbruch | E13 |
| 12 | Doppelklick-Wortgrenze | E14 |
| 13 | `w:br` + `w:br[type=page/column]` | U7a, U7b (bewusst dokumentierte Lücke, kein Fix) |
| 14 | `text:line-break` + `text:soft-page-break` | U7e, U8 |
| 15 | Selection-Sync-Regression mit Umbruch | **Abschnitt 4.3** (neuer Test in `selection-regression.spec.ts`, mit Sync-Wait) |
| 16 | Cross-Format DOCX↔ODT | U9, U10, U11 (vollwertig Unit); E25 (Teilnachweis E2E, **nicht** als voll-E2E führen, 0.5) |
| 17 | 50+ Umbrüche | E15; Reader-seitig `bug65649.docx` (U3-analog) |
| 18 | Intern kopieren + einfügen, Klartext `\n` | **E28**; Kopieren-Regressionssuite (`clipboard.test.ts`, 0.8) bleibt grün |
| 19 | Marken über den Umbruch + Rundreise | **E16** (E2E), **U12** (Unit, beide Formate) |
| 20 | ODT `line-break` in `text:span` | U7d, E22 (`TextLineBreakText.odt`) |
| 21 | Touch „Mobile"/„Tablet" | **E29** (Toolbar-Button) — offen bis Button umgesetzt (2.4, Abschnitt 10) |
| 22 | Undo, Redo | E11 (Umbruch allein), E12 (Gruppierung protokolliert) |

---

## 7. Rundreise-Testmatrix (Anforderung Abschnitt 5)

### 7.1 Baseline (5.1 — Regressionsschutz)

| Anforderung | Test-ID(s) |
|---|---|
| 5.1.1 reale DOCX ohne Umbruch, unverändert exportiert/reimportiert | E23 |
| 5.1.2 reale ODT ohne Umbruch | E24 |
| 5.1.3 Datei mit echtem Seitenumbruch, bekannte Abweichung dokumentiert | U7b (dokumentiert die Lücke bewusst) |
| 5.1.4 Baseline bleibt grün nach Guard-Fix / Toolbar-Button | E26 (reines Enter unverändert) + bestehende `selection-regression.spec.ts` (unverändert grün) |
| 5.1.5 **Kopieren-Regression bleibt grün** | `clipboard.test.ts` (`leafText === '\n'`, „keeps two hard_break-separated lines apart") — 0.8 |

### 7.2 Feature-Rundreise (5.2)

| Anforderung | Test-ID(s) |
|---|---|
| 5.2.1 Neues Dokument, Umbruch per echter Tastatur, DOCX | E1, E17, E18 |
| 5.2.1 dasselbe, ODT | E19, E20 |
| 5.2.2 mehrere Umbrüche im selben Absatz | E4, E15, U3 |
| 5.2.3 Cross-Format beide Richtungen | U9, U10 (Unit vollwertig); E25 (Teilnachweis, 0.5); an PO gemeldet |
| 5.2.4 Umbruch mitten in fettem/farbigem Text | E16, U12 |
| 5.2.5 Umbruch + andere Strukturen (Liste/Tabelle/Bild/Überschrift) | E7, E8, E9a, E9b, E9c, U11 |
| 5.2.6 Import echte Word-Datei | E21, U7a, U7c |
| 5.2.7 Import echte LibreOffice-Datei (inkl. `text:span`) | E22, U7d |
| 5.2.8 doppelte Rundreise mit mehreren Features | U11 |

**Abnahmekriterium (bindend, aus Anforderung 5):** vollständiges Verschwinden eines Umbruchs, seine
Umwandlung in einen Absatzumbruch (oder umgekehrt), Verlust umgebender Marken, Verlust eines
selektierten Bildes/einer Tabelle (0.7) oder von Textinhalt lässt die gesamte Rundreise-Prüfung als
**nicht bestanden** gelten — unabhängig vom Status der übrigen Testfälle.

---

## 8. Abnahmekriterien / Exit-Kriterium für diesen Testplan

Erfüllt (Voraussetzung für Freigabe nach `zeilenumbruch-manuell-req.md` Abschnitt 7), wenn:

- [ ] Alle Unit-Testfälle U1–U12 grün (Vitest).
- [ ] Alle E2E-Testfälle E1–E28 grün auf **Desktop Chrome + Desktop Firefox + Desktop Safari**
      (nach `testMatch`-Erweiterung, 0.2/2.1).
- [ ] **E9b (Blocker) grün** — kein Bilddatenverlust bei `Shift+Enter` über eine Bild-`NodeSelection`;
      der `NodeSelection`-Guard (`code.md` 3.2) ist umgesetzt.
- [ ] Grenzfall-Matrix (Abschnitt 6) vollständig — alle 22 Grenzfälle mit mindestens einem
      Test-Ergebnis (grün oder bewusst dokumentierte Abweichung wie Grenzfall 13).
- [ ] Rundreise-Matrix (Abschnitt 7) vollständig — Baseline **und** Feature-Rundreise, inkl.
      Kopieren-Regression (7.1.5) und Marken-Erhalt (E16/U12).
- [ ] Neuer `selection-regression.spec.ts`-Testfall (Grenzfall 15) grün — **mit** dem
      50-ms-Sync-Wait (4.3).
- [ ] `playwright.config.ts`: `testMatch` beider Desktop-Projekte erweitert; bestehende Suite bleibt
      unter Chromium/Mobile/Tablet unverändert grün.
- [ ] Touch-Weg (Grenzfall 21) **entschieden**: Toolbar-Button umgesetzt + E29 grün, **oder**
      Nicht-Unterstützung im Bericht bewusst dokumentiert (nicht stillschweigend offen).
- [ ] 0.5 (Cross-Format-Einschränkung) im Testbericht **explizit als Einschränkung** vermerkt,
      nicht als „E2E Cross-Format bestanden".
- [ ] Bekannte, akzeptierte Einschränkungen (keine visuelle ¶-Unterscheidung;
      `w:type=page/column`-Fehlklassifizierung; verworfenes `w:clear`) im Bericht verlinkt/übernommen.

---

## 9. Bekannte Test-Limitationen (bewusst, zu dokumentieren, allein kein Blocker)

1. **Keine echte Cross-Format-UI-Funktion** (0.5) — Grenzfall 16/Anforderung 5.2.3 nicht vollständig
   browsergetrieben testbar; Produktlücke, an PO zu melden (Abschnitt 10).
2. **Keine visuelle ¶-Unterscheidung im Editor** (Anforderung Menüpunkt 7) — „Zeilen- oder
   Absatzumbruch?" wird ausschließlich über DOM-Struktur (`<p>`/`<br>`-Anzahl) und
   Export-Byte-Inspektion beantwortet, nicht über Screenshot. Einzig verlässliche Methode, solange
   das Toggle (`formatierungszeichen-toggle`) fehlt.
3. **`CellSelection` (Grenzfall 8b)** — E9d ist charakterisierend, nicht abgesichert-durch-Guard;
   die Exposition ist vorbestehend (`insertImage`/`insertTable`, `code.md` 3.3), nicht durch dieses
   Feature neu. Nur falls E9d echten Struktur-Schaden zeigt, wird ein `CellSelection`-Guard
   nachgezogen.
4. **`bug65649.docx` (Massentest) unter Vitest/jsdom** ggf. via `SKIP_SLOW_UNDER_JSDOM` übersprungen
   — die UI-Massenperformance (Grenzfall 17) deckt stattdessen E15 (echter Browser) ab.
5. **Touch-Button noch nicht im Code** (2.4) — E29 ist erst nach `code.md` Abschnitt 6 lauffähig.

---

## 10. Offene Punkte / Risiken für PO und Dev vor Freigabe

1. **E9b ist der wichtigste Einzeltest dieses Plans** — er deckt einen bereits verifizierten,
   stillen Datenverlust-Bug ab (Bild verschwindet bei `Shift+Enter` über eine `NodeSelection`).
   Schlägt er fehl, ist das Bestätigung des Bugs aus Anforderung 0.7, kein Testfehler —
   Freigabe-Blocker bis der `NodeSelection`-Guard (`code.md` 3.2) umgesetzt ist.
2. **Browser-Matrix wirksam machen** (0.2): der `testMatch` beider Desktop-Projekte **muss** vor dem
   Testlauf erweitert werden, sonst läuft `zeilenumbruch.spec.ts` **nur** auf Chromium und
   Testplan-Punkt 5 (zwei echte Engines) ist verfehlt. **Kein** neues Firefox-Projekt anlegen (der
   ältere QA-Entwurf lag hier falsch, 0.2).
3. **Touch-Zugang (Grenzfall 21) ist entscheidungspflichtig**: entweder Toolbar-Button umsetzen
   (`code.md` Abschnitt 6/8) und E29 grün, **oder** die Nicht-Unterstützung bewusst dokumentieren.
   Ein stiller Zustand, in dem die Funktion auf Touch unerreichbar ist, ist unzulässig
   (Anforderung 3.16).
4. **Cross-Format bleibt strukturell nur teil-E2E** (0.5) — an PO zu meldende Produktlücke (keine
   UI-Formatwechsel-Funktion), unabhängig vom Ausgang dieses Tickets.
5. **Undo-Gruppierung (E12) hat keine feste Sollvorgabe** — das beobachtete Verhalten
   dokumentieren und als Regressions-Referenz festhalten, nicht nachträglich als Bug werten, sofern
   stabil und datenverlustfrei.
6. **Determinismus ist bindend** (0.4): jeder Testfall mit einer Klick-/`Home`/`End`/Pfeiltasten-/
   `select-all`-Reposition setzt vor dem nächsten Tastendruck `await page.waitForTimeout(50)`
   (Selektions-Sync-Nachlauf). Ein Testfall ohne diesen Wait an einer Reposition gilt als
   nicht regelkonform und ist vor Freigabe zu korrigieren.
