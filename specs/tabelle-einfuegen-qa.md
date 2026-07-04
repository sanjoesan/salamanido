# Testplan (QA): Feature „Tabelle einfügen“

Bezug: `specs/tabelle-einfuegen-req.md` (Anforderung, Abschnitte 1–6), `specs/tabelle-einfuegen-code.md`
(Umsetzungsplan des Entwicklers, Abschnitte 0–10). Dieses Dokument ist der **Nachweisplan** des
QA-Agenten: Es legt fest, mit welchen konkreten, ausführbaren Tests jeder Punkt aus der Anforderung
(Bedienelemente Abschnitt 1, Verhalten Abschnitt 2, Grenzfälle Abschnitt 3, Rundreise Abschnitt 4,
Testfälle Abschnitt 5, Abnahmekriterien Abschnitt 6) nachgewiesen oder widerlegt wird. Es ändert
selbst keinen Produktcode.

**Rollenteilung:** Anforderung (PO/Lead) → Umsetzungsplan (Dev) → dieser Testplan (QA) → Ausführung
gegen den tatsächlich gebauten Code → Rückmeldung an Backlog-Status. Jeder Testfall hier ist bewusst
so konkret (Selektoren, Dateien, exakte Assertions), dass er direkt in Code umgesetzt/ausgeführt
werden kann, ohne weitere Interpretation.

---

## 0. Ausgangslage zum Zeitpunkt der Testplan-Erstellung (2026-07-04)

Gegen den Code verifiziert (deckt sich mit `tabelle-einfuegen-req.md` Zeilen 37–52 und
`tabelle-einfuegen-code.md` Abschnitt 0):

| Datei | Ist-Zustand jetzt |
|---|---|
| `src/formats/shared/editor/Toolbar.tsx:228-239` | Button ruft weiterhin **direkt** `run(view, insertTable(2, 2))` auf. Kein Dialog. `aria-pressed={isInTable(view.state)}` noch vorhanden. |
| `src/formats/shared/editor/commands.ts:76-86` | `insertTable(rows, cols)` unverändert, **kein** Tiefen-Guard. Kein `tableTab`, kein `insertRowAtEndAndFocusFirstCell`. |
| `src/formats/shared/editor/WordEditor.tsx:71-82` | Keymap ohne `Tab`/`Shift-Tab`-Einträge. |
| `src/formats/docx/writer.ts:128-171` | `w:gridCol w:w="2000"` hartkodiert (Zeile 131), `<w:tblPr/>` leer (Zeile 170) — kein `<w:tblBorders>`. |
| `src/formats/odt/writer.ts:86-111` | `colCount = rows[0]?.content?.length ?? 1` (Zeile 88, zählt Zellen statt `colspan`-Summe), Tabellenname `Math.random()` (Zeile 109), keine Zellrahmen-Formatvorlage. |
| `src/formats/shared/editor/InsertTableDialog.tsx`, `src/formats/shared/tableConfig.ts` | **Existieren nicht.** |
| `tests/e2e/selection-regression.spec.ts:37` | Klickt den Button und erwartet **unmittelbar danach** `.ProseMirror td` — funktioniert nur, solange der Button direkt einfügt. |

**Konsequenz für diesen Testplan:** Alle unten aufgeführten Testfälle, die einen Dialog voraussetzen
(Abschnitt B.1, Testfälle 1–5 aus Anforderung Abschnitt 5), sind **gegen den heutigen Code
zwangsläufig rot** — das ist erwartet und dokumentiert exakt den in der Anforderung als „nicht
vertrauenswürdig“/„nicht funktional“ eingestuften Zustand. Dieser Testplan ist als **Zielzustand**
geschrieben (setzt die Umsetzung gemäß `tabelle-einfuegen-code.md` voraus) und dient zugleich als
Abnahme-Suite, die nach jeder Umsetzungs-Iteration erneut vollständig gegen den dann aktuellen Code
ausgeführt wird. Abschnitt E dieses Dokuments hält die Baseline (Stand heute, vor Umsetzung) fest,
damit der Fortschritt messbar ist.

---

## 1. Ausführungsumgebung

| Ebene | Befehl | Bemerkung |
|---|---|---|
| Unit-/Komponententests | `npm run test` (`vitest run`) | jsdom-Umgebung (`jsdom` in `devDependencies`), `@testing-library/react` für `InsertTableDialog` |
| Coverage (optional, zur Absicherung neuer Zweige) | `npm run coverage` | insbesondere für `parseTableDimension`, `tableTab`, `columnWidthsDxa`/`collectColumnWidthsPx` |
| E2E (echter Browser) | `npm run test:e2e` (`playwright test`) | `playwright.config.ts`: `webServer` startet `npm run build && npm run preview -- --port 4173`, `baseURL: 'http://localhost:4173/salamanido/'`; drei Projekte: `Desktop Chrome`, `Mobile` (Pixel 7, `hasTouch: true`), `Tablet` (iPad Mini) — alle drei laufen standardmäßig, wie bei den bestehenden Specs (`docx.spec.ts`, `odt.spec.ts`, `selection-regression.spec.ts` schränken ebenfalls nichts ein) |
| E2E UI-Debug | `npm run test:e2e:ui` | zur manuellen Fehlersuche bei rotem Testfall |

Gemeinsame Konventionen (aus bestehenden Specs übernommen, **nicht** neu erfinden):
- Jeder Test beginnt mit `page.goto('/')` + `page.getByRole('button', { name: /verstanden/i }).click()`
  (schließt `PrivacyModal`, siehe `lifecycle.spec.ts:12`, `docx.spec.ts:57`, `odt.spec.ts:41`).
- Format-Karten: `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })`
  bzw. `'OpenDocument Text (.odt)'` (siehe `docx.spec.ts:50-52`, `odt.spec.ts:34-36`).
- Neues Dokument: `<Karte>.getByRole('button', { name: 'Neu erstellen' }).click()`.
- Datei-Upload: `<Karte>.locator('input[type="file"]')` + `setInputFiles({ name, mimeType, buffer })`
  (kein `filechooser`-Event nötig, da ein natives `<input type="file">` vorliegt — konsistent mit
  `docx.spec.ts:87-92`/`odt.spec.ts:72-73`; „echter Datei-Upload“ im Sinne der Anforderung Zeile
  358–361 ist damit erfüllt, ohne dass ein zusätzlicher OS-Dateidialog simuliert werden muss).
- Export/Download: `const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportieren' }).click(); const download = await downloadPromise; const buf = await fs.readFile((await download.path())!)`.
- **Unabhängiger Parser** (Anforderung Zeile 246 „z. B. python-docx oder direktes Parsen von
  `word/document.xml`“): In diesem Projekt bereits etabliertes Muster ist `JSZip.loadAsync(buffer)` +
  rohes XML-String-/Regex-Parsen (`docx.spec.ts:78-82`, `odt.spec.ts:63-67`) — **kein** python-docx
  verfügbar/nötig, da das Ziel („nicht die App sich selbst bestätigen lassen“) durch die
  Byte-für-Byte-Analyse der exportierten Zip-Datei mit einer generischen Zip-/String-Bibliothek
  bereits erfüllt ist. Für exakte **Zählungen** (`<w:tr>`, `<w:tc>`, `<table:table-row>`,
  `<table:table-column>`) wird **nicht** `toContain` verwendet (das prüft nur Vorhandensein),
  sondern `(xml.match(/<w:tr\b/g) ?? []).length` bzw. Äquivalent für ODT — siehe konkrete Snippets
  unten.

---

## 2. Abschnitt A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT) und Editor-Commands

### A.1 Bestehende Baseline (muss weiterhin grün bleiben, Regressionsschutz)

| Datei | Tests | Erwartung |
|---|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts:173-249` | „preserves rows, columns, and cell text“, „preserves merged cells (colspan)“, „preserves vertically merged cells (rowspan)“ | Bleiben unverändert grün; dienen als Fundament, auf dem A.4 aufbaut |
| `src/formats/odt/__tests__/roundtrip.test.ts:162-209` | „preserves rows, columns, and cell text“, „preserves merged cells (colspan/rowspan)“ | Bleiben unverändert grün |

Diese Tests arbeiten laut Anforderung (Zeile 51–52) ausschließlich mit **direkt konstruierten**
JSON-Testdaten (`doc([...])`-Helper), nicht über Toolbar/Dialog — deshalb zusätzlich Abschnitt B
(echte Bedienung). Sie decken außerdem **nicht** den ODT-Spaltenzähl-Fehler auf (Anforderung Zeile
52), weshalb A.5 einen gezielt dafür konstruierten Testfall ergänzt.

### A.2 Neu: `src/formats/shared/editor/__tests__/commands.test.ts`

Testet `tableTab`, `insertTable`s Tiefen-Guard und die Listenelement-Entscheidung — vollständig auf
Command-/State-Ebene (`EditorState.create` + `apply`), ohne Browser, aber mit **exakten**
Positions-Assertions (nicht nur „Dokument hat sich verändert“):

| Testname | Vorgehen | Assertion |
|---|---|---|
| `tableTab(1) springt von Zelle 1 zu Zelle 2` | 2×2-Tabelle, Cursor in Zelle (0,0), `tableTab(1)(state, dispatch)` | `dispatch` wurde mit einem `tr` aufgerufen, dessen `selection.$from` innerhalb der Zelle (0,1) liegt (Position via `TableMap`/Zellen-Grenzen berechnet, nicht geraten) |
| `tableTab(-1) springt von Zelle 2 zu Zelle 1` | Analog rückwärts | wie oben, umgekehrte Richtung |
| `Shift-Tab in der ersten Zelle ist ein No-Op` | Cursor in Zelle (0,0), `tableTab(-1)(state)` ohne `dispatch` | Rückgabewert `false`, `dispatch` **nicht** aufgerufen |
| `tableTab außerhalb einer Tabelle liefert false` | Cursor in normalem Absatz | `tableTab(1)(state)` → `false` |
| `Tab in letzter Zelle der letzten Zeile fügt neue Zeile hinzu` | 2×2-Tabelle, Cursor in Zelle (1,1) (letzte Zelle), `tableTab(1)(state, dispatch)` | Ergebnisdokument hat 3 `table_row`-Kinder (`tr.doc.content.child(0).childCount === 3` o. ä.); **zusätzlich**: `tr.selection` ist eine `TextSelection`, deren `$from.pos` **nachweislich innerhalb der ersten Zelle der neu erzeugten dritten Zeile** liegt — exakt geprüft über Auflösen der neuen Zeilen-/Zellposition, nicht nur „ist irgendwo im Dokument“ |
| `insertTable respektiert MAX_TABLE_NESTING_DEPTH` | Verschachtelt `insertTable(1,1)` `MAX_TABLE_NESTING_DEPTH`-mal ineinander (Cursor jeweils in die neu erzeugte Zelle gesetzt), letzter Versuch eine Ebene darüber | Die ersten `MAX_TABLE_NESTING_DEPTH` Aufrufe liefern `true` und verändern das Dokument, der Aufruf, der die Grenze überschreiten würde, liefert `false` und **dispatcht nichts** |
| `insertTable innerhalb eines Listenelements bettet die Tabelle ein, ohne die Liste zu unterbrechen` | Dokument `bullet_list > list_item > paragraph("ab|cd")`, Cursor zwischen „ab“ und „cd“, `insertTable(2,2)(state, dispatch)` | Ergebnis-JSON: **ein** `bullet_list`-Knoten mit **einem** `list_item`, dessen `content` `[paragraph("ab"), table, paragraph("cd")]` entspricht. **Falls das tatsächliche Verhalten abweicht** (z. B. Liste wird umschlossen/unterbrochen statt eingebettet), ist das ein **Befund**, kein automatisch bestandener Test — siehe Abschnitt D, Nachtrag zu Entscheidung 1.2 aus `tabelle-einfuegen-code.md` |

### A.3 Neu: `src/formats/shared/editor/__tests__/InsertTableDialog.test.tsx` (`@testing-library/react`)

| Testname | Vorgehen | Assertion |
|---|---|---|
| `parseTableDimension` — Tabellentest aller Grenzfälle | Direkter Funktionsaufruf (kein Rendering) mit `''`, `'0'`, `'-1'`, `'abc'`, `'3.5'`, `'50'`, `'51'`, `'1'` (bei `max=50`) | `''`/`'abc'`/`'3.5'` → `{ error: ... }` mit nicht-leerem String; `'0'`/`'-1'` → `{ error: ... }`; `'50'` → `{ value: 50 }`; `'51'` → `{ error: ... }`; `'1'` → `{ value: 1 }` |
| Mount mit Standardwerten zeigt 3×3 | `render(<InsertTableDialog initialRows={3} initialCols={3} onConfirm={fn} onCancel={fn} />)` | Beide Inputs zeigen `'3'`, erstes Feld hat den Fokus (`document.activeElement`), Inhalt ist vorausgewählt (`selectionStart === 0`, `selectionEnd === 1`) |
| Ungültige Eingabe + Submit zeigt Fehler, ruft `onConfirm` nicht auf | `userEvent.clear` + `type('0')` im Zeilenfeld, Submit (Klick „Einfügen“ oder Enter) | Fehlertext sichtbar (`screen.getByRole('alert')` o. ä.), `onConfirm` **nicht** aufgerufen, Dialog bleibt im DOM |
| Escape schließt und ruft `onCancel` | `fireEvent.keyDown(dialog, { key: 'Escape' })` | `onCancel` genau einmal aufgerufen, `onConfirm` nicht aufgerufen |
| Klick auf Backdrop (nicht auf die Box) ruft `onCancel` | Klick auf das äußere Overlay-Element, nicht auf `role="dialog"` selbst | `onCancel` aufgerufen |
| Klick auf die Dialog-Box selbst schließt **nicht** | Klick auf ein Element innerhalb `role="dialog"` | `onCancel` **nicht** aufgerufen |
| Doppel-Submit (Grenzfall 11) | Gültige Werte, zweimal sehr schnell hintereinander Submit auslösen (`fireEvent.submit` zweimal ohne `await` dazwischen) | `onConfirm` wird **genau einmal** aufgerufen |
| Fokus-Falle: Tab am letzten fokussierbaren Element springt zum ersten | `fireEvent.keyDown(dialog, { key: 'Tab' })` mit Fokus auf dem letzten Button | Fokus liegt danach auf dem ersten Input (nicht außerhalb des Dialogs) |
| `onConfirm`, das einen String zurückgibt (Tiefen-Guard-Fall), zeigt Fehler statt zu schließen | `onConfirm: () => 'Verschachtelungstiefe erreicht'` | Fehlertext sichtbar, Dialog bleibt im DOM (Aufrufer entscheidet, nicht die Komponente) |

### A.4 Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts`

Neue Tests **innerhalb** von `describe('DOCX round trip: tables', …)` (Zeile 173), zusätzlich zu den
bestehenden drei aus A.1:

```ts
it('gridCol count matches the colspan-derived column count, not row-0 cell count', async () => {
  // Zeile 0 hat EINE colspan=2-Zelle, Zeile 1 hat ZWEI normale Zellen — Spaltenzahl ist 2 in
  // beiden Lesarten, aber der Test bleibt als Regressionsschutz für den DOCX-Pfad bestehen
  // (der laut Anforderung Zeile 45/130 bereits korrekt colspan-summiert).
})

it('exported <w:tblPr> contains <w:tblBorders>', async () => {
  const original = doc([/* 2x2-Tabelle */])
  const result = await roundTripRaw(original) // liefert das rohe XML, nicht nur das rundgereiste JSON
  expect(result.documentXml).toMatch(/<w:tblPr>.*<w:tblBorders>.*<\/w:tblBorders>.*<\/w:tblPr>/s)
})

it('column widths for a wide table stay within the page content width', async () => {
  const original = doc([/* Tabelle mit 20 Spalten, je 1 Zeile */])
  const result = await roundTripRaw(original)
  const widths = [...result.documentXml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => Number(m[1]))
  expect(widths).toHaveLength(20)
  expect(widths.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(CONTENT_WIDTH_DXA)
})

it('an editor-set colwidth attribute on a cell is carried into the exported gridCol width', async () => {
  const original = doc([/* Tabelle, cell.attrs.colwidth = [300] auf einer Spalte */])
  const result = await roundTripRaw(original)
  const widths = [...result.documentXml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => Number(m[1]))
  expect(widths[0]).toBe(Math.round(300 * PX_TO_DXA))
})
```

*Hinweis:* `roundTripRaw`/Zugriff auf das rohe `document.xml` muss ggf. als zusätzlicher Test-Helper
neben dem bestehenden `roundTrip()` (der direkt das reimportierte JSON liefert) ergänzt werden — die
bestehende Datei re-importiert bereits intern über `JSZip`, ein zusätzlicher Rückgabewert mit dem
rohen XML-String ist eine kleine, non-invasive Erweiterung des Test-Helpers, kein Produktcode.

### A.5 Erweiterung: `src/formats/odt/__tests__/roundtrip.test.ts`

Neue Tests **innerhalb** von `describe('ODT round trip: tables', …)` (Zeile 162), zusätzlich zu den
bestehenden zwei aus A.1 — insbesondere der von der Anforderung (Zeile 289–291) **namentlich
geforderte** Testfall, der von den bisherigen Unit-Tests laut Anforderung (Zeile 52) bewusst **nicht**
abgedeckt ist:

```ts
it('table:table-column count matches the true column count when a colspan cell sits in row 0', async () => {
  // Genau das in der Anforderung (Zeile 289–291) verlangte Szenario:
  // Zeile 0: eine einzelne Zelle mit colspan=3 → rows[0].content.length === 1
  // Zeile 1: drei normale Zellen → tatsächliche Spaltenzahl ist 3
  const original = doc([
    {
      type: 'table',
      content: [
        { type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 3, rowspan: 1 }, content: [paragraph('Merged')] }] },
        { type: 'table_row', content: [
          { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('A')] },
          { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('B')] },
          { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('C')] },
        ] },
      ],
    },
  ])
  const contentXml = await exportOdtRaw(original) // roher content.xml-String
  const columnCount = (contentXml.match(/<table:table-column\b/g) ?? []).length
  expect(columnCount).toBe(3) // Vor dem Fix (Zeile 88: rows[0].content.length ?? 1) schlägt dies mit 1 fehl
})

it('two tables in the same document get distinct, non-random table:name values', async () => {
  const original = doc([
    { type: 'table', content: [/* 2x2 */] },
    paragraph('Zwischentext'),
    { type: 'table', content: [/* 2x2 */] },
  ])
  const contentXml = await exportOdtRaw(original)
  const names = [...contentXml.matchAll(/<table:table table:name="([^"]+)"/g)].map((m) => m[1])
  expect(names).toHaveLength(2)
  expect(new Set(names).size).toBe(2) // Regressionsschutz gegen Math.random()-Kollision
})

it('every table cell references the border style name', async () => {
  const original = doc([{ type: 'table', content: [/* 2x2 */] }])
  const contentXml = await exportOdtRaw(original)
  const cellCount = (contentXml.match(/<table:table-cell\b/g) ?? []).length
  const borderedCellCount = (contentXml.match(/<table:table-cell[^>]*table:style-name="TCBorder"/g) ?? []).length
  expect(borderedCellCount).toBe(cellCount)
})
```

### A.6 Erwartungs-Matrix Abschnitt A (Baseline heute vs. nach Umsetzung)

| Test (Kurzform) | Status **heute** (vor Umsetzung) | Status **nach** Umsetzung gemäß `tabelle-einfuegen-code.md` |
|---|---|---|
| `tableTab`/Tiefen-Guard/Listen-Einbettung (A.2) | Kann nicht existieren — `tableTab` nicht vorhanden, Datei muss neu angelegt werden | Muss grün sein |
| `InsertTableDialog`-Tests (A.3) | Kann nicht existieren — Komponente fehlt | Muss grün sein |
| `<w:tblBorders>` vorhanden (A.4) | **Rot** — `<w:tblPr/>` ist leer (`docx/writer.ts:170`) | Muss grün sein |
| Spaltenbreiten-Summe ≤ Seitenbreite bei 20 Spalten (A.4) | **Rot** — `20 × 2000 = 40000` dxa ≫ `CONTENT_WIDTH_DXA` (siehe `tabelle-einfuegen-code.md` Abschnitt 0, Zeile 24) | Muss grün sein |
| `colwidth`-Übernahme (A.4) | **Rot** — Attribut wird komplett ignoriert | Muss grün sein |
| ODT `table:table-column`-Anzahl bei `colspan` in Zeile 0 (A.5) | **Rot** — liefert `1` statt `3` (`odt/writer.ts:88`) | Muss grün sein |
| ODT Tabellennamen-Eindeutigkeit (A.5) | Wahrscheinlich grün (Kollisionswahrscheinlichkeit bei `Math.random()` gering, aber **nicht deterministisch abgesichert** — Test ist ein Flakiness-Risiko vor dem Fix, siehe Hinweis unten) | Muss deterministisch grün sein |
| ODT Zellrahmen-Style-Referenz (A.5) | **Rot** — Attribut existiert nicht | Muss grün sein |

**Wichtiger Hinweis zur Tabellennamen-Eindeutigkeit:** Der Test in A.5 kann vor dem Fix zufällig grün
werden (`Math.random()` kollidiert nur mit geringer Wahrscheinlichkeit bei zwei Aufrufen) — das macht
ihn vor dem Fix zu einem **unzuverlässigen** Nachweis, nicht zu einem Beleg für Korrektheit. QA muss
dies im Abnahmeprotokoll (Abschnitt D) explizit als "kann falsch-grün sein, bis `TableNameGenerator`
implementiert ist" vermerken, nicht stillschweigend als bestanden werten.

---

## 3. Abschnitt B — E2E-Tests (echte Playwright-Browser-Bedienung)

Alle Tests in diesem Abschnitt verwenden **ausschließlich** echte Nutzerinteraktion: `page.click()`,
`page.keyboard.type()`/`.press()`, `input.setInputFiles()`, `page.waitForEvent('download')` +
tatsächliches Einlesen der heruntergeladenen Datei von der Festplatte. Kein Test in diesem Abschnitt
ruft `insertTable()`, `parseTableDimension()` oder einen anderen internen Funktions-/Command-Export
direkt auf — das ist bewusst Abschnitt A vorbehalten.

### B.0 Pflichtänderung an bestehender Datei: `tests/e2e/selection-regression.spec.ts`

Test `'same regression inside a table cell (click between cells after formatting)'` (Zeile 34–50)
klickt aktuell den Button und erwartet **sofort** `.ProseMirror td` (Zeile 39). Nach Umsetzung des
Dialogs öffnet der Klick zunächst den Dialog — der Test muss angepasst werden, **ohne** seinen
eigentlichen Prüfzweck (Selection-Sync-Bug in Tabellenzellen) zu verändern:

```ts
await editor.click()
await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
await page.getByRole('dialog', { name: 'Tabelle einfügen' }).getByRole('button', { name: 'Einfügen' }).click()
// ... Rest des Tests unverändert (Standardgröße 3×3 hat weiterhin ≥ 2 Zellen für cells.nth(0)/nth(1))
```

**Abnahmekriterium:** Dieser Test muss vor **und** nach der Umsetzung als **derselbe, inhaltlich
unveränderte** Test lauffähig sein (nur die Klick-Sequenz zum Öffnen/Bestätigen des Dialogs ändert
sich) — QA prüft per Diff, dass keine Assertion aus dem ursprünglichen Test entfernt/abgeschwächt
wurde (DoD Punkt 7, Anforderung Zeile 399–401).

### B.1 Neue Datei `tests/e2e/table-insert.spec.ts` — Dialog, Grundverhalten, Grenzfälle

Gemeinsamer Helper (analog `docxCard`/`odtCard` aus den bestehenden Specs):

```ts
function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
async function openNewDocxEditor(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
}
async function openInsertTableDialog(page: Page) {
  await page.locator('.ProseMirror').click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
  return page.getByRole('dialog', { name: 'Tabelle einfügen' })
}
```

| # (Anforderung §5) | Testname | Kernschritte | Assertion |
|---|---|---|---|
| 1 | `clicking the toolbar button opens the size dialog` | `openInsertTableDialog(page)` | `dialog` sichtbar; erstes Eingabefeld hat den Fokus (`await expect(dialog.locator('input').first()).toBeFocused()`) |
| 2 | `entering rows=4, cols=3 and confirming inserts a 4×3 table` | Dialog öffnen, `rowsInput.fill('4')`, `colsInput.fill('3')`, `Einfügen` klicken | `await expect(page.locator('.ProseMirror tr')).toHaveCount(4)`; jede Zeile hat 3 `td` (`for`-Schleife über `tr.locator('td')`) |
| 3 | `confirming with default values inserts the default table size` | Dialog öffnen, sofort `Einfügen` klicken (keine Eingabe) | 3 `tr`, je 3 `td` (Standard `DEFAULT_TABLE_ROWS/COLS = 3`) |
| 4a–c | `invalid input (0 / negative / text) shows an error and inserts nothing` | Je Sub-Fall: Dialog öffnen, `rowsInput.fill('0' \| '-1' \| 'abc')`, `Einfügen` klicken | Fehlertext sichtbar (`dialog.getByRole('alert')`), Dialog bleibt offen, `.ProseMirror td` existiert **nicht** (`toHaveCount(0)`), **keine** Konsolenfehler (`page.on('console', ...)`-Listener seit Testbeginn sammelt keine `'error'`-Einträge) |
| 4d | `value above the maximum (e.g. 100) shows an error, not silent clamping` | `rowsInput.fill('100')`, `colsInput.fill('100')`, `Einfügen` | Fehlertext sichtbar, **keine** 100×100-Tabelle im DOM, kein Einfrieren (Seite reagiert weiterhin: `page.getByRole('button', { name: 'Abbrechen' }).click()` funktioniert danach) |
| 5 | `pressing Escape closes the dialog without any DOM/document change` | Editor-Cursor an bekannte Position setzen (z. B. Text tippen, `Home` drücken), Dialog öffnen, `Escape` | Dialog verschwindet aus dem DOM; `.ProseMirror td` existiert nicht; Cursor-Position unverändert (z. B. erneut tippen und prüfen, dass der neue Text an der erwarteten Stelle landet, nicht z. B. nach der Selektion irgendeines Dialog-Restzustands) |
| 5b | `clicking outside the dialog (backdrop) closes it without inserting` | Dialog öffnen, Klick auf `page.locator('body')` an einer Koordinate außerhalb der Dialog-Box | Dialog verschwindet, keine Tabelle eingefügt |
| 11 | `double-clicking "Einfügen" quickly does not insert twice` | Dialog öffnen, gültige Werte, `Einfügen`-Button **zweimal** ohne `await` dazwischen anklicken (`Promise.all([click(), click()])` bzw. zwei `dispatchEvent`-Aufrufe in schneller Folge) | Genau **eine** Tabelle im Dokument (`.ProseMirror table`) `toHaveCount(1)`, nicht 2 |

### B.2 Zellen-Klick/Tipp-Test — alle Zellen (Testfall 6)

```ts
test('typing into every cell of a freshly inserted 4×3 table lands in the right cell', async ({ page }) => {
  await openNewDocxEditor(page)
  const dialog = await openInsertTableDialog(page)
  await dialog.getByLabel(/zeilen/i).fill('4')
  await dialog.getByLabel(/spalten/i).fill('3')
  await dialog.getByRole('button', { name: 'Einfügen' }).click()

  const cells = page.locator('.ProseMirror td')
  await expect(cells).toHaveCount(12)
  for (let i = 0; i < 12; i++) {
    await cells.nth(i).click()
    await page.keyboard.type(`Z${i}`)
  }
  for (let i = 0; i < 12; i++) {
    await expect(cells.nth(i)).toHaveText(`Z${i}`)
  }
})
```
Erweitert bewusst den bestehenden Test aus `selection-regression.spec.ts:34` (der nur zwei Zellen
prüft, siehe Anforderung Zeile 341–342) auf **alle** Zellen, um positionsabhängige Fehler (z. B. eine
falsch berechnete Zellgrenze bei `colspan`/`TableMap`) aufzudecken, die ein Zwei-Zellen-Test
übersehen würde.

### B.3 Tab-/Umschalt+Tab-Navigation (Testfälle 7–8, Grenzfall 9)

```ts
test('Tab moves the cursor to the next cell', async ({ page }) => {
  await openNewDocxEditor(page)
  await insertDefaultTable(page) // Helper: Dialog öffnen + Einfügen mit Standardwerten
  const cells = page.locator('.ProseMirror td')
  await cells.nth(0).click()
  await page.keyboard.type('A')
  await page.keyboard.press('Tab')
  await page.keyboard.type('B')
  await expect(cells.nth(0)).toHaveText('A')
  await expect(cells.nth(1)).toHaveText('B')
})

test('Tab in the last cell of the last row appends a new row and focuses its first cell', async ({ page }) => {
  await openNewDocxEditor(page)
  await insertTableViaDialog(page, { rows: 2, cols: 2 })
  const cells = page.locator('.ProseMirror td')
  await expect(cells).toHaveCount(4)
  await cells.nth(3).click() // letzte Zelle
  await page.keyboard.press('Tab')
  await expect(page.locator('.ProseMirror tr')).toHaveCount(3)
  const newCells = page.locator('.ProseMirror td')
  await expect(newCells).toHaveCount(6)
  await page.keyboard.type('X')
  await expect(newCells.nth(4)).toHaveText('X') // Cursor muss in der ERSTEN Zelle der neuen Zeile stehen
})
```
**Erwarteter Status heute:** Beide Tests schlagen fehl (Anforderung Zeile 343–347, Grenzfall 9 —
„gilt bis zum Gegenbeweis als fehlend“). Das ist der dokumentierte Ist-Zustand, kein Testfehler.

### B.4 Undo/Redo (Testfälle 9–10, Grenzfall 6/12)

```ts
test('Ctrl+Z right after inserting removes the whole table', async ({ page }) => {
  await openNewDocxEditor(page)
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('Vorher.')
  await insertDefaultTable(page)
  await expect(page.locator('.ProseMirror table')).toHaveCount(1)
  await page.keyboard.press('ControlOrMeta+z')
  await expect(page.locator('.ProseMirror table')).toHaveCount(0)
  await expect(page.locator('.ProseMirror')).toContainText('Vorher.')
})

test('Redo restores the table at the correct size', async ({ page }) => {
  await openNewDocxEditor(page)
  await insertTableViaDialog(page, { rows: 4, cols: 3 })
  await page.keyboard.press('ControlOrMeta+z')
  await expect(page.locator('.ProseMirror table')).toHaveCount(0)
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect(page.locator('.ProseMirror tr')).toHaveCount(4)
})

test('Undo after insert, then typing at the restored cursor position does not lose content (Grenzfall 12)', async ({ page }) => {
  await openNewDocxEditor(page)
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('Text davor. ')
  await insertDefaultTable(page)
  await page.keyboard.press('ControlOrMeta+z')
  await page.keyboard.type('Text danach.')
  await expect(page.locator('.ProseMirror')).toContainText('Text davor. Text danach.')
  await expect(page.locator('.ProseMirror table')).toHaveCount(0)
})
```

### B.5 Cursor-Position, Selektion, Sonderpositionen (Testfälle 11–13, Grenzfälle 5/6/7/8/15)

| Testname | Kernschritte | Assertion |
|---|---|---|
| `inserting between existing text keeps both text parts intact` | Text tippen „AB“, `Home`, `→` (Cursor zwischen A/B), Tabelle einfügen | `.ProseMirror` enthält weiterhin „A“ und „B“ als getrennte Textknoten vor/nach der Tabelle (Reihenfolge im DOM geprüft, nicht nur `toContainText`) |
| `inserting while text is selected replaces the selection` | Text tippen, `ControlOrMeta+a`, Tabelle einfügen | Ursprünglicher Text ist **weg** (`not.toContainText`), Tabelle vorhanden — bestätigt Grenzfall 5 als gewolltes Verhalten |
| `inserting at the very start of the document` | Neues leeres Dokument, sofort Tabelle einfügen ohne vorherige Eingabe | Tabelle ist erstes Element; Cursor kann per `Home`+`ArrowUp`-Sequenz oder Klick vor die Tabelle gesetzt und dort weiter getippt werden (Grenzfall 6/15) |
| `inserting at the very end of the document` | Text tippen, `End`, Tabelle einfügen | Tabelle nach dem Text; Cursor kann danach positioniert und weitergetippt werden |
| `inserting with the cursor already inside an existing table cell` | Tabelle einfügen, in Zelle 1 klicken, **erneut** „Tabelle einfügen“ + bestätigen | Kein Absturz (keine Konsolenfehler, keine leere weiße Seite), Entscheidung 1.1 aus `tabelle-einfuegen-code.md` (verschachtelte Tabelle erlaubt) wird sichtbar bestätigt: `.ProseMirror td .ProseMirror table` bzw. äquivalenter DOM-Nachweis einer Tabelle **innerhalb** einer Zelle existiert |
| `inserting inside a list item does not break the list (Grenzfall 8)` | Aufzählung erzeugen, Text „ab“ tippen, Cursor zwischen a/b, Tabelle einfügen | Liste bleibt **ein** `<ul>`-Element (nicht in zwei `<ul>` gesplittet); Tabelle liegt innerhalb desselben `<li>` — direkter DOM-Nachweis für die in `tabelle-einfuegen-code.md` Abschnitt 1.2 getroffene Entscheidung |

### B.6 Rundreise DOCX — echter Upload/Export (Testfall 14, Anforderung Abschnitt 4.1)

Neue Datei `tests/e2e/table-roundtrip.spec.ts`:

```ts
test('DOCX: 4×3 table via dialog round-trips through export/re-import with an independent parser', async ({ page }) => {
  await openNewDocxEditor(page)
  const dialog = await openInsertTableDialog(page)
  await dialog.getByLabel(/zeilen/i).fill('4')
  await dialog.getByLabel(/spalten/i).fill('3')
  await dialog.getByRole('button', { name: 'Einfügen' }).click()

  const cells = page.locator('.ProseMirror td')
  for (let i = 0; i < 12; i++) {
    await cells.nth(i).click()
    await page.keyboard.type(`Zelle${i}`)
  }

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile((await download.path())!)

  // Unabhängiger Parser: JSZip + rohes XML, KEIN Aufruf der App-eigenen reader.ts-Funktionen
  const zip = await JSZip.loadAsync(buffer)
  const documentXml = await zip.file('word/document.xml')!.async('text')

  const rowCount = (documentXml.match(/<w:tr\b/g) ?? []).length
  expect(rowCount).toBe(4)
  const rowsXml = documentXml.split(/(?=<w:tr\b)/).filter((s) => s.startsWith('<w:tr'))
  for (const row of rowsXml) {
    expect((row.match(/<w:tc\b/g) ?? []).length).toBe(3)
  }
  expect(documentXml).toContain('Zelle0')
  expect(documentXml).toContain('Zelle11')
  expect(documentXml).toMatch(/<w:tblBorders>/) // Anforderung 4.1.4

  // Re-Import: dieselbe Datei erneut hochladen (Anforderung 4.1.2)
  await page.reload()
  await page.getByRole('button', { name: /verstanden/i }).click()
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'export.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
  await expect(page.locator('.ProseMirror tr')).toHaveCount(4)
  await expect(page.locator('.ProseMirror td').nth(0)).toHaveText('Zelle0')
  await expect(page.locator('.ProseMirror td').nth(11)).toHaveText('Zelle11')
})

test('DOCX: merged cells from an uploaded foreign file survive export via real upload/download (Anforderung 4.1.5)', async ({ page }) => {
  // buildSampleDocxWithMergedCells(): hand-gebaute DOCX mit gridSpan/vMerge, unabhängig vom
  // eigenen Writer — analog zu buildSampleDocx() in docx.spec.ts, aber mit einer Tabelle.
  const buffer = await buildSampleDocxWithMergedCells()
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'merged.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
  await expect(page.locator('.ProseMirror table')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const exportedBuffer = await fs.readFile((await (await downloadPromise).path())!)
  const zip = await JSZip.loadAsync(exportedBuffer)
  const documentXml = await zip.file('word/document.xml')!.async('text')
  expect(documentXml).toMatch(/<w:gridSpan w:val="2"\/>/)
})
```

### B.7 Rundreise ODT — inkl. gezielter `colspan`-in-Zeile-1-Test (Testfall 15, Anforderung 4.2.2)

```ts
test('ODT: table:table-column count is correct even with a colspan cell in row 0', async ({ page }) => {
  await openNewOdtEditor(page)
  // Dialog-Weg reicht hier nicht aus, um eine colspan-Zelle in Zeile 0 zu erzeugen (der Dialog
  // erzeugt nur gleichförmige Tabellen) — dieser konkrete Testfall braucht eine Fremddatei mit
  // bereits verbundener Zelle in Zeile 0, gefolgt von einer Zeile mit mehr Zellen (exakt das in
  // der Anforderung Zeile 289–291 verlangte Szenario), analog buildSampleOdt() in odt.spec.ts.
  const buffer = await buildSampleOdtWithColspanInFirstRow() // Zeile 0: 1 Zelle colspan=3; Zeile 1: 3 Zellen
  const input = odtCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'colspan-row0.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
  await expect(page.locator('.ProseMirror table')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const exportedBuffer = await fs.readFile((await (await downloadPromise).path())!)
  const zip = await JSZip.loadAsync(exportedBuffer)
  const contentXml = await zip.file('content.xml')!.async('text')

  const columnCount = (contentXml.match(/<table:table-column\b/g) ?? []).length
  expect(columnCount).toBe(3) // Vor dem Fix: 1 (siehe odt/writer.ts:88) — Kern-Defektnachweis über echten Upload/Export
})

test('ODT: two tables in the same document get non-colliding names on real export (Anforderung 4.2.6)', async ({ page }) => {
  await openNewOdtEditor(page)
  await insertDefaultTable(page)
  await page.locator('.ProseMirror').click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.press('Enter')
  await insertDefaultTable(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const buffer = await fs.readFile((await (await downloadPromise).path())!)
  const zip = await JSZip.loadAsync(buffer)
  const contentXml = await zip.file('content.xml')!.async('text')
  const names = [...contentXml.matchAll(/<table:table table:name="([^"]+)"/g)].map((m) => m[1])
  expect(names).toHaveLength(2)
  expect(new Set(names).size).toBe(2)
})
```

### B.8 Cross-Format-Rundreise (Testfall 16, Anforderung 4.1.6/4.2.5/4.3)

| Testname | Kernschritte | Assertion |
|---|---|---|
| `ODT with a table imported, exported as DOCX, keeps structure/content` | ODT-Fremddatei mit Tabelle hochladen (auf ODT-Karte), **Export als DOCX** (falls die App Cross-Format-Export über dieselbe Session unterstützt — sonst: Inhalt in neuem DOCX-Dokument nachbilden/den tatsächlich unterstützten Cross-Format-Weg der App verwenden, bei Umsetzung verifizieren) | Zeilen-/Spaltenzahl und Zellinhalte im exportierten `word/document.xml` identisch zur Quelle |
| `DOCX → ODT → DOCX (Doppel-Rundreise, Anforderung 4.3.1)` | DOCX mit Tabelle hochladen → als ODT exportieren → diese ODT-Datei erneut hochladen → als DOCX exportieren | Zeilen-/Spaltenzahl und Zellinhalte nach zwei Konvertierungen identisch zum Original; Spaltenbreite/Rahmen-Feinheiten **dürfen** abweichen (Anforderung Zeile 311–313) — dafür **keine** eigene Assertion, das ist bewusst ausgenommen |
| `ODT → DOCX → ODT (Anforderung 4.3.2)` | Analog umgekehrt | wie oben |

*Hinweis für QA bei Umsetzungsprüfung:* Zu klären, ob die App überhaupt einen direkten
Cross-Format-Export (ODT-Dokument im Editor → „als DOCX exportieren“-Knopf) anbietet, oder ob dafür
zunächst re-importiert werden muss. Der tatsächliche Bedienweg ist bei der Umsetzung zu verifizieren
und dieser Testfall entsprechend anzupassen — die Anforderung selbst verlangt nur das Ergebnis
(Struktur-/Inhaltstreue), nicht einen bestimmten Klickpfad.

### B.9 Große Tabelle — Performance/Reaktionsfähigkeit (Testfall 17, Grenzfall 3/4)

```ts
test('20×20 table: insert, edit, export/import stay responsive and complete within ~3s', async ({ page }) => {
  await openNewDocxEditor(page)
  const dialog = await openInsertTableDialog(page)
  await dialog.getByLabel(/zeilen/i).fill('20')
  await dialog.getByLabel(/spalten/i).fill('20')
  await dialog.getByRole('button', { name: 'Einfügen' }).click()
  await expect(page.locator('.ProseMirror td')).toHaveCount(400)

  // UI bleibt bedienbar: sofort nach dem Einfügen tippen, ohne Timeout/Hänger
  await page.locator('.ProseMirror td').first().click()
  await page.keyboard.type('Ecke')
  await expect(page.locator('.ProseMirror td').first()).toHaveText('Ecke')

  const start = Date.now()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const buffer = await fs.readFile((await download.path())!)
  const exportMs = Date.now() - start
  expect(exportMs).toBeLessThan(3000)

  const zip = await JSZip.loadAsync(buffer)
  const documentXml = await zip.file('word/document.xml')!.async('text')
  expect((documentXml.match(/<w:tr\b/g) ?? []).length).toBe(20)
})

test('101×101 (above the maximum) is rejected with an error, not a frozen UI', async ({ page }) => {
  await openNewDocxEditor(page)
  const dialog = await openInsertTableDialog(page)
  await dialog.getByLabel(/zeilen/i).fill('100')
  await dialog.getByLabel(/spalten/i).fill('100')
  await dialog.getByRole('button', { name: 'Einfügen' }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(page.locator('.ProseMirror table')).toHaveCount(0)
})
```

### B.10 Reale komplexe Fremddatei (Testfall 18)

```ts
test('a realistic large foreign DOCX table (6 cols × 12 rows, mixed formatting) round-trips without cell-content loss', async ({ page }) => {
  const buffer = await buildLargeSampleDocxWithTable({ cols: 6, rows: 12 }) // hand-gebaut, analog buildSampleDocx()
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'gross.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
  await expect(page.locator('.ProseMirror tr')).toHaveCount(12)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const exportedBuffer = await fs.readFile((await (await downloadPromise).path())!)

  // Erneuter Import der exportierten Datei
  await page.reload()
  await page.getByRole('button', { name: /verstanden/i }).click()
  const input2 = docxCard(page).locator('input[type="file"]')
  await input2.setInputFiles({ name: 're-import.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: exportedBuffer })
  await expect(page.locator('.ProseMirror tr')).toHaveCount(12)
  // Stichprobenartige Zellinhalts-Prüfung an mehreren Positionen, inkl. Formatierungserhalt (z. B. fett)
})
```
Sofern im Repo bereits größere Testfixtures existieren (lt. `tabelle-einfuegen-code.md` Zeile 625–629
zum Zeitpunkt der Code-Planung **nicht** gefunden), muss QA vor Testerstellung erneut in `tests/` und
`src/**/__tests__` prüfen, ob inzwischen eine geeignete Fixture ergänzt wurde, statt ungeprüft eine
neue zu bauen.

### B.11 Regressionstest (Testfall 19)

`tests/e2e/selection-regression.spec.ts` (alle drei Tests, nicht nur der Tabellen-Test) wird als
**Pflichtbestandteil** jedes vollständigen Testlaufs erneut ausgeführt und muss grün bleiben — siehe
B.0 für die notwendige, inhaltlich neutrale Anpassung der Klick-Sequenz.

---

## 4. Traceability-Matrix — Anforderung ↔ Testfall

| Anforderung | Testfall(e) in diesem Plan |
|---|---|
| §1 Zeile 60 (Dialog statt fester 2×2) | B.1 #1–3 |
| §1 Zeile 67 (Tab-Navigation) | B.3, A.2 |
| §1 Zeile 68 (Undo direkt nach Einfügen) | B.4 |
| §2.1/2.2 (Dialogverhalten, Validierung) | B.1, A.3 |
| §2.3 (Einfügen an Cursor-Position/Selektion) | B.5 |
| §2.4 (sofortige Bearbeitbarkeit) | B.2 |
| §2.5 (Spaltenbreite: Darstellung + Export-Lücke) | A.4 (`colwidth`-Übernahme, Breitensumme), B.9 (visuell/Performance bei 20 Spalten) |
| §2.6 (Undo/Redo) | B.4 |
| §2.7 (Selection-Sync-Bug in Tabellen) | B.0, B.11 |
| §2.8/Grenzfall 7/8 (verschachtelt/Liste) | B.5, A.2 |
| §3 Grenzfall 1 (Abbrechen) | B.1 #5, #5b |
| §3 Grenzfall 2 (ungültige Eingabe) | B.1 #4a–c, A.3 |
| §3 Grenzfall 3 (100×100 abgelehnt) | B.1 #4d, B.9 |
| §3 Grenzfall 4 (20×20 performant) | B.9 |
| §3 Grenzfall 5 (Ersetzen bei Selektion) | B.5 |
| §3 Grenzfall 6 (Dokumentanfang/-ende) | B.5 |
| §3 Grenzfall 7 (verschachtelte Tabelle) | B.5, A.2 |
| §3 Grenzfall 8 (Listenelement) | B.5, A.2 |
| §3 Grenzfall 9/10 (Tab letzte Zelle / Fokus verlässt Editor) | B.3 |
| §3 Grenzfall 11 (Mehrfachklick) | B.1 #11, A.3 |
| §3 Grenzfall 12 (Undo + erneutes Tippen) | B.4 |
| §3 Grenzfall 13 (Selection-Sync beim Zellwechsel) | B.0, B.11 |
| §3 Grenzfall 14 (Spaltenzahl > Seitenbreite) | A.4, B.9 |
| §3 Grenzfall 15 (leeres Dokument) | B.5 |
| §4.1 DOCX-Rundreise (1–7) | B.6, A.4, B.10 |
| §4.2 ODT-Rundreise (1–7) | B.7, A.5 |
| §4.3 Cross-Format doppelte Rundreise | B.8 |
| §5 Testfälle 1–19 | B.0–B.11 (siehe Kopfzeile je Unterabschnitt), A.1–A.5 |
| §6 DoD Punkt 1 (Dialog) | B.1, A.3 |
| §6 DoD Punkt 2 (Tab-Navigation) | B.3, A.2 |
| §6 DoD Punkt 3 (alle Testfälle §5 grün) | gesamter Abschnitt B |
| §6 DoD Punkt 4 (Rundreise + zwei benannte Defekte) | A.4/A.5 (Unit) **und** B.6/B.7 (E2E) — Anforderung verlangt ausdrücklich Nachweis über echten Upload/Download, nicht nur Unit-Ebene |
| §6 DoD Punkt 5 (Grenzfälle dokumentiert) | Abschnitt D dieses Plans |
| §6 DoD Punkt 6 (Grenzfall 3.7 beantwortet) | A.2 (Listen-/Verschachtelungstest), B.5 |
| §6 DoD Punkt 7 (Regressionstest bleibt bestehen) | B.0, B.11 |
| §6 DoD Punkt 8 (Spaltenbreiten-Einschränkung dokumentiert/behoben) | A.4 |

---

## 5. Abschnitt D — Abnahmeprotokoll-Vorlage

Für jeden Testfall aus Abschnitt A/B wird bei tatsächlicher Ausführung festgehalten:

| Testfall-ID | Ergebnis (Pass/Fail/Blocked) | Datum | Ausgeführt gegen Commit/Version | Bei Fail: Fundstelle im Code | Bemerkung |
|---|---|---|---|---|---|
| … | … | … | … | … | … |

Zusätzlich, **zwingend** vor Status-Änderung „teilweise“ → „verifiziert“ (Anforderung Abschnitt 6):
- Explizite schriftliche Antwort auf Grenzfall 3.7 (verschachtelte Tabelle), wie in
  `tabelle-einfuegen-req.md` Zeile 192–193 gefordert und in `tabelle-einfuegen-code.md` Abschnitt 1.1
  vorgeschlagen — QA bestätigt per Testergebnis aus B.5, ob das tatsächliche Verhalten der Entscheidung
  entspricht, und trägt das Ergebnis in `tabelle-einfuegen-req.md` nach.
- Explizite schriftliche Antwort auf Grenzfall 3.8 (Listenelement), analog über A.2/B.5.
- Bestätigung, dass `tests/e2e/selection-regression.spec.ts` nach Anpassung (B.0) **inhaltlich**
  unverändert ist (Diff-Review, nicht nur „Test ist grün“).

---

## 6. Abschnitt E — Baseline-Lauf (vor Umsetzung, Stand 2026-07-04)

Da die Umsetzung laut Abschnitt 0 zum Zeitpunkt der Testplan-Erstellung **noch nicht** erfolgt ist,
gilt für einen Testlauf gegen den heutigen Code:

| Testgruppe | Erwartetes Ergebnis heute | Grund |
|---|---|---|
| A.1 (bestehende Unit-Tests) | Grün | Unverändert, bereits vorhanden |
| A.2 (`commands.test.ts`, neu) | Kann nicht ausgeführt werden (Datei/Funktionen existieren nicht) | `tableTab` etc. fehlen |
| A.3 (`InsertTableDialog.test.tsx`, neu) | Kann nicht ausgeführt werden | Komponente fehlt |
| A.4/A.5 (Writer-Erweiterungen) | Rot bzw. nicht ausführbar, falls Test-Helper (`roundTripRaw`/`exportOdtRaw`) fehlen | Bugs bestehen unverändert (siehe A.6) |
| B.0/B.11 (Regressionstest) | Grün **im aktuellen, unveränderten** Zustand (Button fügt weiterhin direkt ein) | Muss nach der B.0-Anpassung erneut geprüft werden, sobald der Dialog existiert |
| B.1 (Dialogverhalten) | Rot/nicht ausführbar (`getByRole('dialog', ...)` findet nichts) | Dialog fehlt vollständig |
| B.2 (alle Zellen tippbar) | Grün (Grundfunktion existiert bereits über `insertTable(2,2)`, wenn Test auf feste 2×2-Größe statt Dialog angepasst wird) | Nur die Größenwahl fehlt, die Basisbearbeitbarkeit nicht |
| B.3 (Tab-Navigation) | Rot | Anforderung Zeile 343–347, Grenzfall 9, bestätigt fehlend |
| B.4 (Undo/Redo) | Voraussichtlich grün (generischer `history()`-Mechanismus, siehe Anforderung Zeile 68) — **muss dennoch tatsächlich ausgeführt werden**, nicht nur angenommen | Bisher kein eigener Test vorhanden (Anforderung Zeile 68: „aktuell nicht durch einen eigenen Test abgesichert“) |
| B.5–B.10 | Größtenteils rot/nicht ausführbar, da vom Dialog abhängig; Cross-Format/Fremddatei-Tests teils unabhängig vom Dialog möglich (Upload-Pfad) | Siehe einzelne Testfälle |

Dieser Abschnitt dient als **Nullmessung**: Nach jeder Umsetzungs-Iteration wird derselbe vollständige
Lauf wiederholt und das Ergebnis in Abschnitt D protokolliert, bis alle acht Punkte aus
`tabelle-einfuegen-req.md` Abschnitt 6 (Abnahmekriterien) erfüllt und grün sind.
