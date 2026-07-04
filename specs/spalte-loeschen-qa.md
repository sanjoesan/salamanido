# Testplan „Spalte löschen" — QA-Verifikation (`spalte-loeschen-qa.md`)

Rolle: QA-Antwort auf `specs/spalte-loeschen-req.md` (Anforderung) und
`specs/spalte-loeschen-code.md` (Umsetzungsplan). Dieses Dokument legt
**verbindlich** fest, mit welchen konkreten Tests — auf welcher Ebene, in
welcher Datei, mit welchem genauen Ablauf — jeder Testfall aus der Anforderung
nachgewiesen wird, bevor der Backlog-Status von `spalte-loeschen` von „fehlt"
auf „vorhanden" wechseln darf. Alle Datei-/Zeilenangaben wurden gegen den
aktuellen Repo-Stand geprüft (`src/formats/shared/editor/Toolbar.tsx:228-239`
hat noch **keinen** „Spalte löschen"-Button und **kein** `aria-label` auf dem
„⊞ Tabelle"-Button; `src/formats/shared/editor/commands.ts` exportiert bisher
nur `isInTable`; `src/formats/odt/writer.ts:88` zählt noch Zellenanzahl statt
Colspan-Summe; `src/formats/odt/reader.ts:189-203` liest noch keine
`covered-table-cell`-Elemente; `tests/e2e/selection-regression.spec.ts:37`
lokalisiert den bestehenden Tabellen-Button bereits über
`getByRole('button', { name: 'Tabelle einfügen' })` — dieser Test ist nach
eigener Prüfung des Codes aktuell **rot**, da der Button kein `aria-label` hat
und sein Accessible Name aus dem Text-Inhalt `⊞ Tabelle` stammt, nicht aus
`title`; damit ist Befund 1.3 aus `spalte-loeschen-code.md` bestätigt).

**Grundregel (Anforderung Abschnitt 9, bindend für diesen Plan):** Ein
Unit-Test, der `deleteColumn`/`canDeleteSelectedColumns` direkt gegen ein von
Hand gebautes ProseMirror-Dokument aufruft, beweist **nur** die Logik. Er
beweist **nicht**, dass ein neuer Toolbar-Button existiert und klickbar ist,
dass eine echte `CellSelection` per Maus-Drag im Browser funktioniert, dass der
Button im richtigen Moment sichtbar deaktiviert ist, oder dass eine über die UI
hochgeladene Tabellen-Datei nach echtem Export-Klick eine korrekt verkürzte
Datei auf die Festplatte liefert. Deshalb enthält dieser Plan zwei getrennte,
gleichrangig verbindliche Ebenen:

- **Ebene A — Unit-Tests (Vitest):** Reader/Writer-Rundreise (DOCX **und**
  ODT) auf Objektebene, plus die isolierte `canDeleteSelectedColumns`-Guard-
  Logik. Schnell, deterministisch, aber **kein** Ersatz für Ebene B.
- **Ebene B — echte Playwright-Browser-Tests:** tatsächliche Klicks,
  tatsächliches Maus-Drag zur Spaltenmarkierung, tatsächliches Tippen über
  `page.keyboard`, tatsächlicher Datei-Upload über `input[type="file"]`,
  tatsächlicher Export-Klick mit `page.waitForEvent('download')` und Prüfung
  des **heruntergeladenen** Datei-Inhalts (nicht eines In-Memory-Objekts).
  Keine Ebene-B-Behauptung darf durch einen internen Funktionsaufruf ersetzt
  werden.

Beide Ebenen zusammen decken alle Testfälle aus `spalte-loeschen-req.md`
Abschnitt 2–5/7 ab (Zuordnungstabelle: Abschnitt E dieses Dokuments).

---

## A. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT) und Guard-Logik

### A.1 `src/formats/shared/editor/__tests__/commands.test.ts` (neu)

Voraussetzung für alle Ebene-B-Tests, die einen deaktivierten Button erwarten
(Abschnitt 1.1 in `spalte-loeschen-code.md`: `deleteColumn(state)` ohne
`dispatch` liefert **fälschlich** `true` für die letzte Spalte, daher darf
`canDeleteSelectedColumns` diesen Aufrufstil **nicht** intern verwenden — das
muss hier auf Quellcode-Ebene erzwungen, nicht nur behauptet werden). Aufbau
gegen echte `EditorState`-Objekte (`wordSchema`, `TextSelection`,
`CellSelection.create(doc, anchorPos, headPos)` aus `prosemirror-tables`),
nicht gegen Reader/Writer-JSON.

| ID | Testfall | Zusicherung |
|---|---|---|
| UT-CMD-1 | Cursor außerhalb einer Tabelle | `canDeleteSelectedColumns(state)` → `false` |
| UT-CMD-2 | Cursor in einer von 3 Spalten einer 3×3-Tabelle | `canDeleteSelectedColumns(state)` → `true` |
| UT-CMD-3 | 1-spaltige Tabelle, Cursor in der einzigen Spalte | `canDeleteSelectedColumns(state)` → `false` (zentraler Guard-Test, Grenzfall 7) |
| UT-CMD-4 | `CellSelection` markiert explizit **alle** Spalten einer 3-spaltigen Tabelle | `canDeleteSelectedColumns(state)` → `false` |
| UT-CMD-5 | `CellSelection` markiert 2 von 3 Spalten | `canDeleteSelectedColumns(state)` → `true` |
| UT-CMD-6 | Regressions-Dokumentationstest für das Bibliotheksverhalten selbst (Abschnitt 1.1 des Umsetzungsplans) | Direkter Aufruf `deleteColumn(state)` (ohne zweites Argument) auf einer 1-spaltigen Tabelle liefert (bibliotheksbedingt) `true` — dieser Test dokumentiert bewusst **nicht** das eigene Verhalten, sondern das der Abhängigkeit `prosemirror-tables@1.8.5`; schlägt er nach einem Dependency-Update fehl, ist das ein Signal, `canDeleteSelectedColumns` zu überprüfen, nicht der Test selbst falsch |
| UT-CMD-7 | `deleteColumn` mit `dispatch` auf einer von mehreren Spalten | Transaktion wird dispatcht, Spaltenzahl im resultierenden `state.doc` sinkt um 1 |
| UT-CMD-8 | `deleteColumn` mit `dispatch` auf der letzten verbleibenden Spalte | liefert `false`, **kein** `dispatch`-Aufruf erfolgt, `state.doc` bleibt exakt unverändert (`toJSON()`-Vergleich) |

### A.2 `src/formats/docx/__tests__/roundtrip.test.ts` — Erweiterung `describe('DOCX round trip: tables', ...)` (bestehender Block, Zeilen 173–249)

Wichtig: Der Ersetzungs-/Löschschritt wird **nicht** als vorgefertigtes
Ziel-JSON geschrieben, sondern über den echten Produktionscode-Pfad erzeugt —
ein `EditorState` wird aufgebaut, `deleteColumn(state, dispatch)` wird als
Transaktion dispatcht, und **erst das resultierende `state.doc.toJSON()`**
wird an `writeDocx` übergeben. Das prüft zusätzlich, dass der Lösch-Code selbst
schema-konformen Output erzeugt, nicht nur, dass Reader/Writer mit von Hand
geschriebenem JSON klarkommen.

| ID | Testfall (Bezug Anforderung) | Ablauf | Zusicherung |
|---|---|---|---|
| UT-DOCX-COL-1 | Einfache 3×3-Tabelle, mittlere Spalte löschen (Abschnitt 5.1, Testfall 1) | Fixture-Dokument mit 3×3-Tabelle (eindeutiger Zellinhalt je Zelle, z. B. `A1`…`C3`) → `EditorState` mit `tableEditing()`-Plugin → Cursor-Selektion in Spalte 1 (mittlere) → `deleteColumn(state, dispatch)` → `writeDocx(state.doc.toJSON())` → `readDocx` | Re-importiertes `word/document.xml`: genau 2 `<w:gridCol>` in `<w:tblGrid>`, jede `<w:tr>` genau 2 `<w:tc>`, Inhalt der verbleibenden Spalten (`A`, `C`) unverändert, `B`-Spalte vollständig verschwunden |
| UT-DOCX-COL-2 | Zelle mit `colspan: 2`, eine der beiden Spalten löschen (Abschnitt 5.1, Testfall 2; Befund 5) | 2×2-Fixture, Zeile 0 = 1 Zelle mit `colspan: 2`, Zeile 1 = 2 normale Zellen → eine der beiden von der `colspan`-Zelle überspannten Spalten via `deleteColumn` löschen → Rundreise | Verbleibende Zelle in Zeile 0 hat `colspan: 1` bzw. **kein** `<w:gridSpan>`-Element mehr (je nach Implementierungswahl), Inhalt bleibt vollständig erhalten, nicht dupliziert |
| UT-DOCX-COL-3 | Zelle mit `rowspan: 2`, genau diese Spalte löschen (Abschnitt 5.1, Testfall 3; Abschnitt 2.5) | Fixture analog zum bestehenden Rowspan-Test (Zeilen 223–248) → Spalte mit der `rowspan`-Zelle löschen | `<w:tr>`-Anzahl unverändert, `vMerge`-Element für diese Spalte verschwindet vollständig aus **beiden** betroffenen Zeilen, Nachbarspalte unangetastet |
| UT-DOCX-COL-4 | Zwei aufeinanderfolgende Löschvorgänge vor einem einzigen Export (Abschnitt 5.1, Testfall 6) | 4-spaltige Tabelle, zwei verschiedene Spalten nacheinander per `deleteColumn` löschen (zwei separate Transaktionen auf demselben `state`), **erst danach** `writeDocx` | Export enthält genau 2 verbleibende Spalten, keine der beiden gelöschten Spalten „kommt zurück" |
| UT-DOCX-COL-5 | Regressionstest Befund 6 (Umsetzungsplan Abschnitt 3.9): `colCount`-Berechnung aus Zeile 0 bleibt korrekt, wenn Zeile 0 eine `colspan`-Zelle enthält | Zeile 0 = `colspan: 2`-Zelle + 1 normale Zelle (3 logische Spalten, 2 JSON-Zellen) → `writeDocx` **ohne** vorherige Löschung | Assertion direkt gegen `word/document.xml`-String (nicht nur zurückgelesenes JSON): genau 3 `<w:gridCol` |
| UT-DOCX-COL-6 | Letzte verbleibende Spalte über `deleteColumn` mit `dispatch` (Abschnitt 2.6/3.7, Grenzfall 7) | 1-spaltige Tabelle → `deleteColumn(state, dispatch)` | liefert `false`, `state.doc` unverändert, **kein** Export-Aufruf mit beschädigter Tabelle möglich |

### A.3 `src/formats/odt/__tests__/roundtrip.test.ts` — spiegelbildlicher Block `describe('ODT round trip: tables', ...)` (bestehend, Zeilen 162–208)

Identisches Muster wie A.2, IDs `UT-ODT-COL-1`…`UT-ODT-COL-4`, gegen
`writeOdt`/`readOdt`. Zusätzlich die beiden Bugfix-Regressionstests aus dem
Umsetzungsplan:

| ID | Testfall (Bezug) | Ablauf | Zusicherung |
|---|---|---|---|
| UT-ODT-COL-1 | Einfache 3×3-Tabelle, mittlere Spalte löschen (Abschnitt 5.2, Testfall 1) | wie UT-DOCX-COL-1, gegen `content.xml` | genau 2 `<table:table-column>`, pro `<table:table-row>` genau 2 `<table:table-cell>`, Inhalt korrekt |
| UT-ODT-COL-2 | `table:number-columns-spanned="2"`, eine Spalte löschen (Abschnitt 5.2, Testfall 2; **Befund 7 explizit mitgeprüft**) | wie UT-DOCX-COL-2 | Attribut reduziert sich/verschwindet korrekt, Inhalt erhalten; **zusätzlich**: Anzahl `<table:table-column>`-Elemente entspricht der tatsächlichen logischen Spaltenzahl der Zeile 0 (Colspan-Summe), nicht der reinen Zellenanzahl — dieser Test schlägt mit dem unbehobenen `odt/writer.ts:88`-Bug (`rows[0]?.content?.length`) fehl und muss daher **vor** Abnahme des Fixes rot sein, danach grün |
| UT-ODT-COL-3 | `table:number-rows-spanned="2"`, genau diese Spalte löschen (Abschnitt 5.2, Testfall 3) | wie UT-DOCX-COL-3 | Zeilenanzahl unverändert, Attribut verschwindet vollständig |
| UT-ODT-COL-4 | Regressionstest Befund 7 ohne Löschung, direkt gegen XML (Umsetzungsplan Abschnitt 3.8) | Zeile 0 = 1 normale Zelle + 1 Zelle mit `colspan: 2` (3 logische Spalten, 2 JSON-Zellen) → `writeOdt` | `JSZip.loadAsync` auf das Ergebnis, `content.xml` auslesen: genau 3 `<table:table-column` |

### A.4 `src/formats/odt/__tests__/coveredTableCell.test.ts` (neu — Befund 8)

Deckt **ausschließlich** den Reader-Fix aus `odt/reader.ts:189-203` ab (Anchor-
Array-Muster analog `docx/reader.ts:210-256`), unabhängig von „Spalte löschen"
selbst, aber **Voraussetzung**, damit Testfall 5.2.4/A.6 unten überhaupt
verlässlich ist.

| ID | Testfall | Ablauf | Zusicherung |
|---|---|---|---|
| UT-ODT-CTC-1 | Handgebautes `content.xml` (JSZip, analog `buildSampleDocx`-Muster aus `tests/e2e/docx.spec.ts:7-48`) mit vertikaler Verbindung über `<table:covered-table-cell/>` | Zeile 0: Zelle A (Spalte 0, `number-rows-spanned="2"`) + Zelle B (Spalte 1, normal); Zeile 1: `<table:covered-table-cell/>` (Spalte 0) + Zelle C (Spalte 1, normal) → `readOdt` | Zeile 1 im gelesenen JSON hat genau **eine** Zelle (`table_cell` mit Text „C"), **nicht** zwei; Zelle A hat `rowspan: 2` |
| UT-ODT-CTC-2 | Dieselbe Fixture, aber Reader **vor** dem Fix (Kontrollfall, nur als Dokumentation im Testkommentar, kein eigener `it`-Block) | — | vor dem Fix würde Zeile 1 fälschlich die `covered-table-cell` überspringen und die Text-„C"-Zelle landet an Spaltenindex 0 statt 1 im nachgelagerten DOM/Export — dieser Bug-Beweis wird **nicht** als separater grüner Test geführt, sondern als Kommentar/Git-Historie im selben Testfile referenziert, damit der Fix nicht versehentlich als „schon immer korrekt" missverstanden wird |
| UT-ODT-CTC-3 | Selbst-erzeugte Datei (eigener Writer, kein `covered-table-cell`) bleibt unverändert korrekt | `writeOdt` → `readOdt` auf einer `rowspan: 2`-Fixture ohne externe Herkunft | Ergebnis identisch zum Vorher-Zustand (0 Folgeelemente + bereits korrektes `number-rows-spanned`-Attribut ⇒ keine Regression durch den Fix) |

### A.5 Cross-Format-Rundreise — neue Datei `src/formats/shared/__tests__/table-column-cross-format-roundtrip.test.ts`

| ID | Testfall (Bezug Anforderung Abschnitt 5.3) | Ablauf |
|---|---|---|
| UT-XFMT-COL-1 | DOCX → Spalte löschen → ODT-Export → Re-Import → DOCX-Export | `readDocx(fixture)` → `deleteColumn` über echten `EditorState`/Command-Pfad → `writeOdt` → `readOdt` → `writeDocx` → `readDocx` → verbleibende Spalteninhalte nach zwei Formatkonvertierungen identisch zur Erwartung, kein Textverlust (Formatierungsverlust bei Cross-Format ist laut Referenzdokument akzeptabel, Textverlust nicht) |
| UT-XFMT-COL-2 | Spiegelbildlich mit Startpunkt ODT | analog |

---

## B. Echte Playwright-Browser-Tests (Ebene B — verbindlich, keine Ausnahme)

### B.0 Konventionen (aus bestehenden Suiten übernommen, siehe `tests/e2e/docx.spec.ts:50-52`, `odt.spec.ts`, `selection-regression.spec.ts:3-5`)

- Karten-Locator: `docxCard(page)` / `odtCard(page)` —
  `page.locator('div.rounded-lg', { has: page.getByRole('heading', {...}) })`.
- Datei-Upload: **echter** `<input type="file">` über
  `input.setInputFiles({ name, mimeType, buffer })` — kein direkter Aufruf von
  `readDocx`/`readOdt` in der Testdatei.
- Export: **echter** Klick auf
  `page.getByRole('button', { name: 'Exportieren' })`, kombiniert mit
  `page.waitForEvent('download')`, danach `download.path()` + `fs.readFile` +
  `JSZip.loadAsync` auf den **tatsächlich heruntergeladenen Bytes**.
- Editor-Locator: `page.locator('.ProseMirror')`, Zellen `page.locator('.ProseMirror td')`.
- Button-Locatoren **müssen** über `getByRole('button', { name: <aria-label> })`
  funktionieren — das setzt voraus, dass der Umsetzungsplan Abschnitt 3.2
  (`aria-label="Spalte löschen"` auf dem neuen Button, `aria-label="Tabelle einfügen"`
  nachträglich auf dem bestehenden Button) tatsächlich umgesetzt wurde. **Vor
  dem Schreiben von B.1 zu prüfen:** `tests/e2e/selection-regression.spec.ts`
  einmal isoliert ausführen (`npx playwright test selection-regression.spec.ts -g "inside a table"`)
  — muss **grün** sein, bevor die neue Datei entsteht, sonst erbt sie densel­ben
  Locator-Fehler (Umsetzungsplan Abschnitt 3.11, hier als Blocking-Vorbedingung
  übernommen).
- Konsolen-/Seitenfehler-Überwachung: `page.on('pageerror', ...)` in jedem Test
  aus B.1 registrieren, am Ende `expect(errors).toHaveLength(0)` (Anforderung
  Abschnitt 10, Punkt 8: „keine JS-Exception").
- `CellSelection` per Maus: `mouse.down()` auf der ersten Zielzelle, dann
  **`page.mouse.move(x, y, { steps: 10 })`** mit expliziten Koordinaten aus
  `boundingBox()` der Ziel-`<td>` (nicht nur `hover()` — `tableEditing()`s
  Drag-Handler braucht echte `mousemove`-Events über der Zielzelle, siehe
  Umsetzungsplan Abschnitt 3.10, letzter Hinweis vor „Fixtures"), dann
  `mouse.up()`.

### B.1 Neue Datei `tests/e2e/table-columns.spec.ts`

Pro Format als eigener `test.describe` (DOCX **und** ODT teilen denselben
`WordEditor`, daher identische Kernfälle; Format-spezifisch sind nur die
Rundreise-Assertions gegen die jeweilige XML). Jeder Test beginnt mit
`page.goto('/')`, Privacy-Banner wegklicken
(`getByRole('button', { name: /verstanden/i })`), Karte „Neu erstellen" oder
Fixture-Upload.

| ID | Testfall (Bezug Anforderung) | Playwright-Ablauf (konkret) |
|---|---|---|
| PW-COL-1 | Cursor in mittlerer Spalte einer 3×3-Tabelle → „Spalte löschen" (Abschnitt 7, Testfall 1) | `editor.click()`; `getByRole('button', {name:'Tabelle einfügen'}).click()` (liefert 2×2 — für 3×3 zusätzliche Spalte/Zeile nötig, siehe Hinweis unten); `page.locator('.ProseMirror td').nth(1).click()`; `getByRole('button', {name:'Spalte löschen'}).click()`; `expect(page.locator('.ProseMirror tr').first().locator('td')).toHaveCount(2)`; Inhalt der verbleibenden Zellen unverändert (`toContainText`) |
| PW-COL-2 | Button außerhalb einer Tabelle (Abschnitt 7, Testfall 2) | `editor.click()` in einem normalen Absatz (kein Tabellen-Insert); `expect(getByRole('button', {name:'Spalte löschen'})).toBeDisabled()`; Klickversuch löst **keine** Exception aus (`pageErrors` bleibt leer) |
| PW-COL-3 | `CellSelection` über Teilhöhe einer Spalte (2 von 3 Zeilen) → löscht trotzdem die gesamte Spalte (Abschnitt 7, Testfall 3; Grenzfall 2) | Maus-Drag (siehe B.0) über Zelle Zeile 0/Spalte 1 und Zeile 1/Spalte 1 (nicht Zeile 2); „Spalte löschen" klicken; `expect(page.locator('.ProseMirror tr').first().locator('td')).toHaveCount(2)` für **alle** drei Zeilen, nicht nur die markierten zwei |
| PW-COL-4 | `CellSelection` über mehrere Spalten → alle auf einen Klick (Abschnitt 7, Testfall 4; Grenzfall 3) | Maus-Drag über 2 Zellen derselben Zeile in benachbarten Spalten; „Spalte löschen"; verbleibende Spaltenzahl sinkt um 2 in einem Schritt |
| PW-COL-5 | `colspan: 2`-Zelle, eine der beiden Spalten löschen (Abschnitt 7, Testfall 5) | Tabelle mit vorbereiteter `colspan`-Zelle **nicht** über die UI erzeugbar (kein `zellen-verbinden` vorhanden) → Fixture-Datei mit bereits verbundener Zelle hochladen (echter `input[type="file"]`-Upload, kein direkter JSON-Konstrukt in der Testdatei); Cursor in eine der beiden überspannten Spalten setzen; „Spalte löschen"; verbleibende Zelle zeigt weiterhin den Inhalt, DOM-`colspan`-Attribut der `<td>` ist um 1 reduziert (`expect(cell).toHaveAttribute('colspan', '1')`) |
| PW-COL-6 | `rowspan`-Zelle, genau diese Spalte löschen (Abschnitt 7, Testfall 6) | Fixture-Upload mit `rowspan`-Zelle; Spalte löschen; `page.locator('.ProseMirror tr')`-Anzahl unverändert, Zelle vollständig aus dem DOM verschwunden |
| PW-COL-7 | Tabelle mit genau 2 Spalten → 1-spaltiges Ergebnis, weiterhin editierbar (Abschnitt 7, Testfall 7) | 2×2-Tabelle, eine Spalte löschen; danach in verbleibende Zelle klicken und tippen; `expect(editor).toContainText(<getippter Text>)` |
| PW-COL-8 | **Zentraler Pflicht-Testfall:** letzte verbleibende Spalte → Button deaktiviert, kein stiller No-Op (Abschnitt 7, Testfall 8; Grenzfall 7; DoD 4) | 1-spaltige Tabelle (per Fixture-Upload oder durch zweimaliges Löschen einer 3-spaltigen Tabelle erzeugt) → `expect(getByRole('button', {name:'Spalte löschen'})).toBeDisabled()`; **zusätzlich** erzwungener Klickversuch via `button.dispatchEvent('click', {force:true})` bzw. `page.evaluate` auf das native Element, um zu verifizieren, dass selbst ein erzwungener Klick auf ein `disabled`-Element **keine** Tabellenänderung bewirkt (`toHaveCount` auf Zellen vor/nach identisch) |
| PW-COL-9 | Bild in Zelle der zu löschenden Spalte (Abschnitt 7, Testfall 9) | Echter `filechooser`-Flow (`page.on('filechooser', ...)`, analog zu Bild-Einfügen-Tests) fügt Bild in eine Zelle ein; Spalte mit dem Bild löschen; `expect(page.locator('.ProseMirror img')).toHaveCount(0)` |
| PW-COL-10 | Undo/Redo (Abschnitt 7, Testfall 10; Abschnitt 2.8) | Spalte löschen → `page.keyboard.press('ControlOrMeta+z')` → Spalte inkl. Inhalt exakt wiederhergestellt (`toContainText` auf ursprünglichem Zellinhalt, Zellenzahl wieder wie vorher) → `page.keyboard.press('ControlOrMeta+y')` → Spalte erneut weg |
| PW-COL-11 | Zwei Löschvorgänge, zweimal Undo (Abschnitt 7, Testfall 11) | Zwei verschiedene Spalten nacheinander löschen; zweimal Undo; beide werden **einzeln**, in umgekehrter Reihenfolge wiederhergestellt (Zwischenzustand nach dem ersten Undo geprüft, nicht nur Endzustand) |
| PW-COL-12 | **Pflicht-Regressionstest Selection-Sync mit „Spalte löschen" als Auslöser** (Abschnitt 7, Testfall 12; Abschnitt 2.10/Grenzfall 19) | Siehe eigener Abschnitt B.2 unten |
| PW-COL-13 | Verschachtelte Tabelle: äußere Spalte mit innerer Tabelle löschen (Abschnitt 7, Testfall 16; Grenzfall 14) | Fixture-Upload mit äußerer Tabelle, deren eine Zelle eine vollständige innere Tabelle enthält (z. B. `tests/fixtures/external/docx/deep-table-cell.docx` — Inhalt vor Verwendung prüfen, ob die Verschachtelungstiefe/-form zum Testfall passt); äußere Spalte mit der inneren Tabelle löschen; kein Absturz (`pageErrors` leer), innere Tabelle vollständig aus dem DOM verschwunden |
| PW-COL-14 | Mobile/Tablet-Bedienung (Abschnitt 7, Testfall 17; Bedienelement 7) | Dieselben Kern-Testfälle PW-COL-1 und PW-COL-8 zusätzlich auf den Projekten `Mobile` (Pixel 7) und `Tablet` (iPad Mini) aus `playwright.config.ts:19-23` ausführen (`--project=Mobile`, `--project=Tablet`); mindestens „Cursor in Zelle, Button klicken" (ohne `CellSelection`) muss auf allen drei Projekten funktionieren |

**Hinweis zu PW-COL-1/3/4 (3×3-Tabelle):** Der bestehende „⊞ Tabelle"-Button
fügt laut `src/formats/shared/editor/commands.ts:76-86` (`insertTable(2, 2)`)
ausschließlich eine feste 2×2-Tabelle ein — `tabelle-einfuegen` (wählbare
Größe) ist ein eigener, noch nicht umgesetzter Slug. Für alle Testfälle, die
eine 3×3-Ausgangstabelle benötigen, wird daher **entweder** (a) eine kleine
Fixture-DOCX/ODT-Datei mit einer echten 3×3-Tabelle über den echten
`input[type="file"]`-Upload verwendet, **oder** (b) falls zum Umsetzungszeit­
punkt bereits ein Weg existiert, eine Spalte einzufügen, eine 2×2-Tabelle live
im Browser um eine dritte Spalte erweitert. Variante (a) ist zu bevorzugen, da
sie nicht von einem anderen, noch nicht abgenommenen Feature abhängt.

### B.2 Pflicht-Regressionstest: Selection-Sync mit „Spalte löschen"

Analog zu `tests/e2e/selection-regression.spec.ts:34-50` (bestehender Test
„same regression inside a table cell"), aber mit „Spalte löschen" als
zusätzlichem, auslösendem Zwischenschritt. Dieser Test ist laut Anforderung
(Abschnitt 2.10, Grenzfall 19, Abschnitt 10 Punkt 5) **nicht verhandelbar** und
lebt dauerhaft entweder in der neuen Datei `table-columns.spec.ts` oder wird
direkt in `selection-regression.spec.ts` ergänzt (Entscheidung beim Umsetzen,
Hauptsache: dauerhaft Teil der Suite, nicht nur einmalig ausgeführt).

```ts
test('column deletion does not leave a stale selection — click + type lands correctly', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()

  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()

  const cells = page.locator('.ProseMirror td')
  await cells.nth(0).click()
  await page.keyboard.type('Links')
  await cells.nth(1).click()
  await page.keyboard.type('Rechts')

  // CellSelection auf die rechte Spalte, dann löschen:
  await cells.nth(1).click()
  await page.getByRole('button', { name: 'Spalte löschen' }).click()

  // Kritischer Nachweis: Klick in die verbleibende Zelle danach positioniert
  // die echte ProseMirror-Selektion an der geklickten Stelle, nicht an einer
  // veralteten internen Selektion (Bezug FEATURE-SPEC-DOCX-ODT.md Abschnitt 2).
  await page.locator('.ProseMirror td').first().click()
  await page.keyboard.type('XYZ')

  await expect(editor).toContainText('LinksXYZ')
  await expect(editor).not.toContainText('Rechts')
  await expect(page.locator('.ProseMirror td')).toHaveCount(1)
})
```

### B.3 Neue Datei `tests/e2e/table-columns-roundtrip.spec.ts` (Anforderung Abschnitt 5, vollständig — echte Datei-Ebene)

Jeder Test lädt eine **reale Fixture-Datei** über den echten
`<input type="file">`, bedient Toolbar/Maus wie in Ebene B üblich, klickt auf
„Exportieren", liest die **tatsächlich heruntergeladene Datei** von der
Festplatte, entpackt sie mit `JSZip` und prüft den XML-Inhalt.

| ID | Testfall (Bezug) | Ablauf |
|---|---|---|
| PW-RT-COL-1 | DOCX, 3×3-Tabelle, mittlere Spalte, Rundreise (Abschnitt 5.1, Testfall 1) | Fixture-DOCX mit 3×3-Tabelle hochladen (`docxCard(page).locator('input[type="file"]').setInputFiles(...)`) → Cursor in mittlere Spalte → „Spalte löschen" → `downloadPromise` + „Exportieren" → `JSZip.loadAsync` auf die heruntergeladene Datei → `word/document.xml`: genau 2 `<w:gridCol`, jede `<w:tr` genau 2 `<w:tc` (regex-Zählung im rohen XML-String, analog zum bestehenden Muster in `tests/e2e/docx.spec.ts:70-80`) |
| PW-RT-COL-2 | ODT-Äquivalent zu PW-RT-COL-1 (Abschnitt 5.2, Testfall 1) | wie oben, `odtCard`, `content.xml`, `<table:table-column`/`<table:table-cell` |
| PW-RT-COL-3 | DOCX, `colspan`-Zelle, eine Spalte löschen (Abschnitt 5.1, Testfall 2) | Fixture mit `colspan: 2`-Zelle hochladen → betroffene Spalte löschen → Export → `word/document.xml`: `<w:gridSpan>` verschwunden bzw. `w:val="1"`, Inhalt vorhanden |
| PW-RT-COL-4 | ODT, `number-columns-spanned`-Zelle (Abschnitt 5.2, Testfall 2, inkl. Befund 7) | wie oben gegen `content.xml`; **zusätzlich**: Anzahl `<table:table-column` entspricht der tatsächlichen Zellenzahl der Zeile 0 nach dem Löschen |
| PW-RT-COL-5 | DOCX, `rowspan`-Zelle (Abschnitt 5.1, Testfall 3) | Fixture mit `rowspan: 2` hochladen → diese Spalte löschen → Export → `<w:tr`-Anzahl unverändert, `vMerge` verschwunden |
| PW-RT-COL-6 | ODT, `number-rows-spanned`-Zelle (Abschnitt 5.2, Testfall 3) | spiegelbildlich |
| PW-RT-COL-7 | Reale komplexe DOCX-Fremddatei, > 5 Spalten (Abschnitt 5.1, Testfall 4) | Kandidat: `tests/fixtures/external/docx/TestTableColumns.docx` (Inhalt vor Verwendung prüfen — Spaltenzahl/Struktur muss zum Testfall passen, ggf. anderes Fixture aus `tests/fixtures/external/docx/` wählen) hochladen → eine mittlere Spalte löschen → exportieren → **erneut über echten Upload re-importieren** → verbleibende Zellinhalte identisch zur Erwartung, keine Verschiebung |
| PW-RT-COL-8 | Cross-Format: ODT → Spalte löschen → DOCX-Export (Abschnitt 5.1, Testfall 5) | ODT-Fixture hochladen, Spalte löschen, **als DOCX exportieren** — setzt voraus, dass die UI einen Cross-Format-Export überhaupt anbietet (aktueller Codestand: ungeprüft, siehe Abschnitt D „Bekannte Einschränkung" unten); falls nicht vorhanden, wird dieser Fall durch UT-XFMT-COL-2 (Objektebene) abgedeckt und hier als Blocker vermerkt |
| PW-RT-COL-9 | Cross-Format: DOCX → Spalte löschen → ODT-Export (Abschnitt 5.2, Testfall 5) | spiegelbildlich zu PW-RT-COL-8 |
| PW-RT-COL-10 | Doppelte Rundreise DOCX→ODT→DOCX nach Löschung (Abschnitt 5.3, Testfall 1) | wie UT-XFMT-COL-1, aber vollständig über UI: Upload → Löschen → Export ODT → Re-Upload (ODT-Karte) → Export DOCX → finaler Inhalt identisch |
| PW-RT-COL-11 | Doppelte Rundreise ODT→DOCX→ODT (Abschnitt 5.3, Testfall 2) | spiegelbildlich |
| PW-RT-COL-12 | **Pflicht-Testfall Befund 8:** reale ODT-Fremddatei mit vertikaler Verbindung über `covered-table-cell` (Abschnitt 5.2, Testfall 4; Grenzfall 18) | Kandidaten aus `tests/fixtures/external/odt/`: `BigTable.odt`, `crazyTable.odt`, `TestTextTable.odt`, `feature_attributes_tables.odt`, `feature_attributes_tables_FunnyTable_With_xmlid.odt`, `OOStyledTable.odt`, `doc_heading_table.odt` — **vor** diesem Testfall muss durch Entpacken (`JSZip`/manuelles Unzip) jeder Kandidat auf tatsächliches Vorkommen von `<table:covered-table-cell` in `content.xml` geprüft werden (im Repo-Stand nicht durch reinen Datei-Grep feststellbar, da ODT ein ZIP-Container ist); der erste Treffer wird als Fixture übernommen. Ablauf danach: hochladen → vor jeder Lösch-Aktion zunächst verifizieren, dass die Spaltenzuordnung korrekt importiert wurde (Spot-Check der sichtbaren Zellinhalte gegen eine vorab manuell in LibreOffice/mit `JSZip` geprüfte Erwartung) → falls die Zuordnung bereits falsch ist, ist dieser Testfall als **blockiert durch Befund 8** zu kennzeichnen (siehe Abschnitt D), nicht als Fehlschlag von „Spalte löschen" selbst → falls korrekt: eine Spalte löschen → exportieren → reimportieren → Ergebnis dokumentieren |

---

## C. Selection-Sync-Vorbedingung (muss vor B.2 grün sein)

| ID | Prüfschritt |
|---|---|
| PRE-1 | `npx playwright test tests/e2e/selection-regression.spec.ts --project="Desktop Chrome" -g "same regression inside a table"` **isoliert** ausführen, **nachdem** `Toolbar.tsx` das `aria-label="Tabelle einfügen"` erhalten hat (Umsetzungsplan Abschnitt 3.2/3.11) — muss grün sein, sonst sind alle `getByRole('button', {name:'Tabelle einfügen'})`-Locatoren in B.1–B.3 ebenfalls betroffen und die neuen Tests wären von Anfang an unzuverlässig, nicht erst durch „Spalte löschen" selbst kaputt |

---

## D. Bekannte Einschränkungen / Blocker — nicht Teil dieses Testplans als „nicht bestanden"

- **Cross-Format-Export über die UI (PW-RT-COL-8/9):** Ob die Export-
  Schaltfläche tatsächlich eine Formatwahl anbietet (DOCX-Karte exportiert nach
  DOCX, ODT-Karte nach ODT) oder ob ein expliziter Cross-Format-Export-Button
  existiert, ist im aktuellen Codestand von `spalte-loeschen-code.md` nicht
  behandelt und muss vor Testimplementierung geprüft werden. Falls kein
  Cross-Format-Export über die UI existiert, werden PW-RT-COL-8/9 durch die
  Objektebene-Tests UT-XFMT-COL-1/2 (Abschnitt A.5) abgedeckt und die
  Playwright-Variante nachgezogen, sobald ein entsprechender UI-Pfad besteht —
  dokumentierter Blocker, keine stillschweigende Lücke.
- **Reale ODT-Fixture mit `covered-table-cell` (PW-RT-COL-12):** Es ist
  **nicht** vorab verifiziert, welche der in `tests/fixtures/external/odt/`
  vorhandenen Dateien tatsächlich einen `<table:covered-table-cell>`-Platzhalter
  enthält (ODT-Inhalt ist gezippt, ein reiner Datei-Grep über das Repo findet
  keine Treffer). Die Kandidatenliste in PW-RT-COL-12 muss vor Umsetzung durch
  Entpacken geprüft werden; falls **kein** vorhandenes Fixture einen echten
  Treffer liefert, ist eine mit LibreOffice/OpenOffice neu erzeugte Testdatei
  zu beschaffen. Bis dahin ist dieser Testfall als **offene Abhängigkeit**,
  nicht als roter Test, zu führen.
- **Kontextmenü (Anforderungsdatei Abschnitt 1, Zeile 4):** Der Umsetzungsplan
  entscheidet sich gegen ein Kontextmenü-System (nur Toolbar-Button). Dieser
  Testplan prüft daher **keinen** Rechtsklick-Interaktionspfad — das ist eine
  bewusste, dokumentierte Scope-Entscheidung, kein vergessener Testfall.
- **Verschachtelte Tabelle (PW-COL-13):** Das vorgeschlagene Fixture
  `deep-table-cell.docx` ist nach Namen plausibel, aber sein tatsächlicher
  Aufbau (Verschachtelungstiefe, ob eine äußere Spalte betroffen ist) wurde für
  diesen Testplan nicht am Byte-Inhalt verifiziert — vor Testimplementierung
  zu prüfen, ggf. Ersatz-Fixture wählen oder synthetisch bauen (verschachtelte
  Tabelle ist über die UI aktuell ohnehin nicht einfügbar, nur über
  Fixture-Upload erreichbar).

---

## E. Zuordnung Ebene A / Ebene B zu den Pflicht-Grenzfällen (Anforderung Abschnitt 3)

| # | Grenzfall (Anforderung) | Ebene A (Unit) | Ebene B (Playwright) |
|---|---|---|---|
| 1 | Cursor ohne Selektion in einer Zelle | UT-CMD-2, UT-DOCX-COL-1 | PW-COL-1 |
| 2 | `CellSelection` innerhalb einer Spalte, Teilhöhe | UT-CMD-5 | PW-COL-3 |
| 3 | `CellSelection` über mehrere Spalten | — | PW-COL-4 |
| 4 | `colspan`-Zelle über Spaltengrenze hinaus | UT-DOCX-COL-2, UT-ODT-COL-2 | PW-COL-5, PW-RT-COL-3/4 |
| 5 | `colspan` exakt passend → Zelle komplett entfernt | UT-DOCX-COL-2 (Variante mit `colspan: 2`, beide Spalten löschen) | PW-COL-5 (Variante) |
| 6 | `rowspan`-Zelle | UT-DOCX-COL-3, UT-ODT-COL-3 | PW-COL-6, PW-RT-COL-5/6 |
| 7 | Letzte verbleibende Spalte | UT-CMD-1/3/4, UT-CMD-6, UT-DOCX-COL-6 | PW-COL-8 (zentraler Pflichttest) |
| 8 | Genau 2 Spalten → 1-spaltiges Ergebnis | — | PW-COL-7 |
| 9 | Links/rechts/Mitte-Position | UT-DOCX-COL-1 (Mitte); Rand-Varianten als weitere Fälle im selben `describe`-Block zu ergänzen | PW-COL-1 (Mitte); Rand-Varianten analog |
| 10 | Leere Zellen in der zu löschenden Spalte | — | in PW-COL-1/7 implizit (frisch eingefügte Tabelle ist leer) |
| 11 | Zelle mit mehreren Absätzen/gemischter Formatierung | — | Ergänzungsfall in `table-columns.spec.ts` (mehrzeilige Zelle vor dem Löschen befüllen) |
| 12 | Bild in gelöschter Spalte | — | PW-COL-9 |
| 13 | Bestätigungsdialog | — (Entscheidung: kein Dialog, siehe Umsetzungsplan Abschnitt 2, Zeile 5) | PW-COL-8 bestätigt implizit „kein Dialog blockiert den Ablauf" |
| 14 | Verschachtelte Tabelle | — | PW-COL-13 |
| 15 | Direkt nach „Tabelle einfügen" ohne Tippen | — | Ergänzungsfall in PW-COL-1 (frisch eingefügte 2×2-Tabelle ohne vorheriges Tippen) |
| 16 | Mehrfaches schnelles Hintereinander-Löschen | — | PW-COL-11 (Undo-Variante deckt Mehrfach-Löschen mit ab) + eigener Fall „dreimal löschen bis Guard greift" |
| 17 | Reale Fremddatei, große Tabelle | — | PW-RT-COL-7 |
| 18 | Reale ODT-Fremddatei mit `covered-table-cell` | UT-ODT-CTC-1/2/3 | PW-RT-COL-12 (siehe Abschnitt D, ggf. blockiert) |
| 19 | Selection-Sync-Regression | — | PW-COL-12 (B.2, Pflicht) |
| 20 | Track-Changes (zukünftig) | nicht im Scope (siehe Anforderung Abschnitt 2.9) | nicht im Scope |

---

## F. Definition of Done — Abnahme-Checkliste (Bezug Anforderung Abschnitt 10)

Der Backlog-Status von `spalte-loeschen` darf erst auf „vorhanden" wechseln,
wenn **alle** folgenden Zeilen grün sind:

| DoD-Punkt (Anforderung Abschnitt 10) | Nachweis-IDs |
|---|---|
| 1. Echter klickbarer UI-Weg löst `deleteColumn` sichtbar aus | PW-COL-1, PW-COL-7 |
| 2. Alle 3 Erkennungsfälle aus Abschnitt 2.1 einzeln getestet | UT-CMD-2/5, PW-COL-1, PW-COL-3, PW-COL-4 |
| 3. Verhalten bei `colspan`/`rowspan` nachgewiesen | UT-DOCX-COL-2/3, UT-ODT-COL-2/3, PW-COL-5/6, PW-RT-COL-3..6 |
| 4. Letzte-Spalte-Grenzfall sichtbar zurückgemeldet, kein stiller Fehlschlag | UT-CMD-1/3/4/6, UT-DOCX-COL-6, PW-COL-8 |
| 5. Selection-Sync-Regressionstest mit „Spalte löschen", dauerhaft in Suite | PW-COL-12 (B.2) + PRE-1 (Vorbedingung) |
| 6. Rundreise DOCX, ODT, Cross-Format, reale Fremddateien | UT-DOCX-COL-1..5, UT-ODT-COL-1..4, UT-XFMT-COL-1/2, PW-RT-COL-1..11 |
| 7. Befunde 6–9 einzeln geprüft, Ergebnis dokumentiert | UT-DOCX-COL-5 (Befund 6: bestätigt bereits korrekt), UT-ODT-COL-4 (Befund 7: Fix verifiziert), UT-ODT-CTC-1..3 (Befund 8: Fix verifiziert), Asymmetrie Befund 9 durch 7+8 aufgelöst |
| 8. Kein stiller Datenverlust, keine JS-Exception | `pageErrors`-Prüfung in **jedem** B.1/B.2/B.3-Test; PW-COL-2 (Klick außerhalb Tabelle) |
| 9. Undo/Redo zuverlässig, auch über mehrere Löschvorgänge | PW-COL-10, PW-COL-11 |
| 10. Backlog-Status-Änderung erst nach 1–9 | nicht Teil dieses Testplans — Entscheidung nach Testlauf-Ergebnissen dieses Dokuments, inkl. Auflösung der in Abschnitt D benannten Blocker (oder deren expliziter Dokumentation als akzeptierte, zurückgestellte Lücke) |

Zusätzlich, spezifisch für diesen Feature-Plan (nicht 1:1 aus der generischen
DoD übernommen): **Kein** Testfall aus Abschnitt E dieses Dokuments darf beim
finalen Testlauf übersprungen oder als „n/a" geführt werden, ohne dass die
Begründung dafür in Abschnitt D dieses Dokuments nachgetragen ist.
