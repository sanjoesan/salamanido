# Testplan „Spalte löschen" — QA-Verifikation (`spalte-loeschen-qa.md`)

Rolle: QA-Antwort auf `specs/spalte-loeschen-req.md` (Anforderung) und
`specs/spalte-loeschen-code.md` (Umsetzungsplan, **kritische Neufassung 2026-07-04**).
Dieses Dokument legt **verbindlich** fest, mit welchen konkreten Tests — auf welcher
Ebene, in welcher Datei, mit welchem genauen Ablauf — jeder Testfall aus der Anforderung
nachgewiesen wird, bevor der Backlog-Status von `spalte-loeschen` von „fehlt" auf
„vorhanden" wechseln darf.

## 0. Kritische Nachprüfung der Vorfassung dieses QA-Dokuments (Stand 2026-07-05)

Diese Datei ist die **überarbeitete** Fassung. Die Vorfassung stützte sich noch auf die
inzwischen **verworfene Vorfassung des Umsetzungsplans** und behauptete mehrere Dinge, die
gegen den **tatsächlichen aktuellen Code** geprüft **falsch** sind. Sie wurden hier
korrigiert; wer die Vorfassung kennt, darf ihre Aussagen **nicht** übernehmen. Jede
Korrektur wurde direkt am Code verifiziert (Datei/Zeile in Klammern):

| Thema | Vorfassung dieses QA-Docs behauptete | Tatsächlicher Stand (2026-07-05, im Code geprüft) | Konsequenz für den Testplan |
|---|---|---|---|
| `aria-label` am „Tabelle einfügen"-Button | Button habe **kein** `aria-label`; `selection-regression.spec.ts` sei deshalb **rot**; Befund 1.3 „bestätigt". | **Falsch.** `Toolbar.tsx:280` trägt `aria-label="Tabelle einfügen"` (verifiziert). `selection-regression.spec.ts:46` nutzt `getByRole('button', { name: 'Tabelle einfügen' })` und ist **grün**. | Kein Toolbar-Fix am Bestandsbutton nötig. PRE-1 bleibt als reine **Re-Verifikation** (nicht als „erst Fix, dann grün"). |
| ODT-`colCount` (Befund 7) | `odt/writer.ts:88` zähle noch `content.length` statt Colspan-Summe → Bug; Test müsse „vor dem Fix rot" sein. | **Falsch/veraltet.** `odt/writer.ts:115-116` summiert bereits `colspan` (`reduce(...colspan...)`), identisch zum DOCX-Writer. | Kein Writer-Fix. UT-ODT-COL-4 ist ein **bereits grüner Regressionstest**, kein Red-Green-Fix-Nachweis. |
| ODT-`covered-table-cell`-Reader (Befund 8) | Reader (`odt/reader.ts:189-203`) ignoriere `covered-table-cell`; man brauche einen Reader-Fix mit Anchor-Array analog DOCX; A.4 teste diesen Fix. | **Empirisch widerlegt** (Umsetzungsplan Abschn. 3, 3 Probe-Tests). `odt/reader.ts:301-321` liest `number-rows-spanned` **direkt vom Anker** und überspringt `covered-table-cell` — für ODF **korrekt**. Der vorgeschlagene Fix hätte `rowspan` **doppelt gezählt** (Attribut **+** Folgezellen) und heute grüne Dateien **kaputt** gemacht. | **Kein** Reader-Fix. A.4 wird zum **Regressions-/Invariantentest**, der die heute korrekte Rundreise **absichert** und einen künftigen Doppelzähl-„Fix" rot werden lässt. |
| Cross-Format-Export über die UI | Als „ungeprüfte" Option (PW-RT-COL-8/9/10/11) im E2E-Plan geführt. | **Verifiziert nicht vorhanden.** `DocumentWorkspace.tsx:124-142` hat **einen** „Exportieren"-Button; er ruft `module.exportFile(...)` des **beim Öffnen gewählten** Formatmoduls. Kein Formatwähler, keine Cross-Format-Ausgabe. | Cross-Format-Rundreise (Anforderung 5.3) wird auf **Ebene A** (Objektebene) nachgewiesen; E2E deckt nur **Gleichformat**-Rundreisen ab. UI-Grenze in Abschnitt D dokumentiert (kein erfundener Blocker). |
| Fixture-Korpus | „nicht verifiziert, welche Datei `covered-table-cell` enthält"; Kandidatenliste teils geraten. | **Korpus vorhanden und geprüft:** `tests/fixtures/external/odt/` (202 Dateien) enthält u. a. `tableCoveredContent.odt` (laut Umsetzungsplan 33 covered-cells, rowspan bis 6), `mergedCells.odt`, `subTables3-nested.odt`, `table-column-delete-with-merge.odt`, `BigTable.odt`, `simple-table.odt`, `table.odt`, `tableOps.odt`; `tests/fixtures/external/docx/` (127) u. a. `TestTableColumns.docx`, `deep-table-cell.docx`. | Reale Fixtures konkret benannt; „vor Verwendung durch Entpacken prüfen" bleibt als Sorgfaltsschritt, nicht als Unsicherheit über die Existenz. |
| Zeilennummern durchgehend | `Toolbar.tsx:228-239`, `commands.ts:76-86`, `odt/writer.ts:88`, `odt/reader.ts:189-203`, `docx/reader.ts:210-256`, `selection-regression.spec.ts:37`. | **Alle gedriftet.** Aktuell: `Toolbar.tsx:277-289` (Button), `:280` (aria-label), `:33-53` (ScissorsIcon), `:143-156` (Ausschneiden-`disabled`-Muster); `commands.ts:6` (nur `isInTable`), `:92-102` (insertTable); `odt/writer.ts:115-116`; `odt/reader.ts:301-321`; `docx/reader.ts:311-364`; `docx/writer.ts:158-201`; `playwright.config.ts:27-36` (Projekte); `selection-regression.spec.ts:43-59` (Tabellen-Test). | Referenzen unten aktualisiert. |

**Grundregel (Anforderung Abschnitt 9, bindend):** Ein Unit-Test, der
`deleteColumn`/`canDeleteSelectedColumns` direkt gegen ein von Hand gebautes
ProseMirror-Dokument aufruft, beweist **nur** die Logik. Er beweist **nicht**, dass ein
neuer Toolbar-Button existiert und klickbar ist, dass eine echte `CellSelection` per
Maus-Drag im Browser funktioniert, dass die markierte Spalte **sichtbar** hervorgehoben
ist, dass der Button im richtigen Moment **deaktiviert** ist, oder dass eine über die UI
hochgeladene Tabellen-Datei nach echtem Export-Klick eine korrekt verkürzte Datei auf die
Festplatte liefert. Deshalb enthält dieser Plan zwei getrennte, gleichrangig verbindliche
Ebenen:

- **Ebene A — Unit-Tests (Vitest):** Reader/Writer-Rundreise (DOCX **und** ODT) auf
  Objektebene, plus die isolierte `canDeleteSelectedColumns`-Guard-Logik. Schnell,
  deterministisch, aber **kein** Ersatz für Ebene B.
- **Ebene B — echte Playwright-Browser-Tests:** tatsächliche Klicks, tatsächliches
  Maus-Drag zur Spaltenmarkierung, tatsächliches Tippen über `page.keyboard`, tatsächlicher
  Datei-Upload über `input[type="file"]`, tatsächlicher Export-Klick mit
  `page.waitForEvent('download')` und Prüfung des **heruntergeladenen** Datei-Inhalts (nicht
  eines In-Memory-Objekts). Keine Ebene-B-Behauptung darf durch einen internen
  Funktionsaufruf ersetzt werden.

Beide Ebenen zusammen decken alle Testfälle aus `spalte-loeschen-req.md` Abschnitt 2–5/7
ab (Zuordnungstabelle: Abschnitt E).

---

## 0.1 Determinismus-Leitplanken (verbindlich für **alle** Ebene-B-Tests)

Der Auftrag verlangt ausdrücklich reproduzierbare, race-freie Tests. Die folgenden Regeln
sind aus dem realen Verhalten des Editors abgeleitet (`WordEditor.tsx`
`dispatchTransaction` ruft bei **jeder** Transaktion `forceRender` → die Toolbar rendert
auch bei reinen Selektionsänderungen neu; ProseMirror lernt native, per Maus/Tastatur
ausgelöste Selektionsänderungen aber erst über das **asynchrone** `selectionchange`-Event
des Browsers). Präzedenz im Repo: `selection-regression.spec.ts:34/72/103`
(`await page.waitForTimeout(50)` nach einem nativen Caret-Move, **bevor** der nächste
Tastendruck erfolgt).

1. **Selektions-Sync als auto-retrying Barriere, nicht als fester Sleep.** Nach einem
   Maus-Drag (`CellSelection`) oder einem Klick, der den Cursor umsetzt, wird der
   `disabled`/`enabled`-Zustand des „Spalte löschen"-Buttons **nicht** sofort abgefragt und
   der Button **nicht** sofort geklickt. Stattdessen wird der erwartete Zustand über eine
   auto-retryende Assertion **abgewartet**:
   `await expect(page.getByRole('button', { name: 'Spalte löschen' })).toBeEnabled()`
   (bzw. `.toBeDisabled()`). Playwright wiederholt die Prüfung, bis der async
   `selectionchange` → PM-Selektion → React-Re-Render durchgelaufen ist. **Erst danach**
   folgt der Klick. Das ist das Hauptmittel gegen Race-Conditions in diesem Feature.
2. **Nach einem umsetzenden Klick nicht sofort tippen.** Wird nach einer Toolbar-Aktion in
   eine Zelle geklickt und danach getippt (der Selection-Sync-Regressionsfall B.2), wird
   **vor** dem Tippen entweder `await page.waitForTimeout(50)` eingefügt (Repo-Präzedenz)
   **oder** über eine auto-retryende Assertion auf einen sichtbaren Zwischenzustand
   gewartet. Nie `keyboard.type(...)` unmittelbar nach einem Reposition-Klick + vorheriger
   Toolbar-Transaktion ohne eine solche Barriere.
3. **`CellSelection` per echtem Maus-Drag mit Zwischenschritten:** `mouse.move(x, y,
   { steps: 10 })` mit expliziten Koordinaten aus `boundingBox()` der Ziel-`<td>` (Mitte),
   nicht `hover()` — `tableEditing()`s Drag-Handler braucht echte, gestufte
   `mousemove`-Events über der Zielzelle. Ablauf: `boundingBox()` beider Zellen holen →
   `mouse.move(start)` → `mouse.down()` → `mouse.move(end, { steps: 10 })` → `mouse.up()`.
4. **Sichtbarkeit vor Struktur:** Der `.selectedCell`-Overlay (Umsetzungsplan 4.4) wird
   **vor** dem Löschen per `toBeVisible()`/`toHaveCSS(...)` abgewartet — das ist zugleich
   der Nachweis, dass die Markierung im Modell steht (Selektion synchron), bevor „Spalte
   löschen" geklickt wird.
5. **Keine festen Sleeps als Ergebnis-Assertion.** `waitForTimeout` dient **nur** dem
   Überbrücken des bekannten Sync-Fensters (Regel 2). Ergebnis-Assertions laufen immer über
   auto-retryende `expect(...).toHaveCount/toContainText/toBeDisabled`.
6. **Konsolen-/Seitenfehler in jedem Test:** `const pageErrors: Error[] = []` +
   `page.on('pageerror', e => pageErrors.push(e))`; am Ende `expect(pageErrors).toEqual([])`
   (Anforderung Abschnitt 10, Punkt 10).

---

## A. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT) und Guard-Logik

### A.1 `src/formats/shared/editor/__tests__/commands.test.ts` (neu)

Deckt den Guard `canDeleteSelectedColumns` aus Umsetzungsplan 4.1 ab. Zentral (Umsetzungs­
plan 2.1, empirisch verifiziert): `deleteColumn(state)` **ohne** `dispatch` liefert
**fälschlich** `true` für die letzte Spalte, weil der Guard `rect.left==0 &&
rect.right==rect.map.width` **innerhalb** von `if (dispatch) {…}` steht
(`node_modules/prosemirror-tables/dist/index.js`, Funktion `deleteColumn`). Deshalb darf
`canDeleteSelectedColumns` diesen Aufrufstil **nicht** verwenden, sondern muss den Guard
über `selectedRect` selbst nachbilden. Aufbau gegen echte `EditorState`-Objekte
(`EditorState.create({ schema: wordSchema, doc: wordSchema.nodeFromJSON(...) })`,
`TextSelection`, `CellSelection.create(doc, anchorPos, headPos)` aus `prosemirror-tables`),
nicht gegen Reader/Writer-JSON.

| ID | Testfall | Zusicherung |
|---|---|---|
| UT-CMD-1 | Cursor außerhalb einer Tabelle | `canDeleteSelectedColumns(state)` → `false` |
| UT-CMD-2 | Cursor in einer von 3 Spalten einer 3×3-Tabelle | `canDeleteSelectedColumns(state)` → `true` |
| UT-CMD-3 | 1-spaltige Tabelle, Cursor in der einzigen Spalte | `canDeleteSelectedColumns(state)` → `false` (zentraler Guard-Test, Grenzfall 7) |
| UT-CMD-4 | `CellSelection` markiert explizit **alle** Spalten einer 3-spaltigen Tabelle | `canDeleteSelectedColumns(state)` → `false` (Befund 13: greift auch bei Mehrspalten-Selektion, nicht nur bei 1-Spalten-Tabellen) |
| UT-CMD-5 | `CellSelection` markiert 2 von 3 Spalten | `canDeleteSelectedColumns(state)` → `true` |
| UT-CMD-6 | **Bibliotheks-Dokumentationstest** (Umsetzungsplan 2.1/5.1): direkter Aufruf `deleteColumn(state)` **ohne** zweites Argument auf einer 1-spaltigen Tabelle | liefert (bibliotheksbedingt) `true`. Dokumentiert bewusst das Fehlverhalten der Abhängigkeit `prosemirror-tables@1.8.5`, nicht das eigene: schlägt er nach einem Dependency-Update fehl, ist das das Signal, den eigenen Guard/Workaround zu überprüfen. |
| UT-CMD-7 | `deleteColumn` **mit** `dispatch` auf einer von mehreren Spalten | Transaktion wird dispatcht, logische Spaltenzahl im resultierenden `state.doc` sinkt um 1 |
| UT-CMD-8 | `deleteColumn` **mit** `dispatch` auf der letzten verbleibenden Spalte | liefert `false`, `state.doc` bleibt exakt unverändert (`toJSON()`-Vergleich) — kein stiller Teil-Dispatch |

### A.2 `src/formats/docx/__tests__/roundtrip.test.ts` — Erweiterung des bestehenden `describe('DOCX round trip: tables', …)`

Wichtig: Der Löschschritt wird **nicht** als vorgefertigtes Ziel-JSON geschrieben, sondern
über den echten Produktionscode-Pfad erzeugt — ein `EditorState` (mit `tableEditing()`)
wird aufgebaut, `deleteColumn(state, dispatch)` als Transaktion dispatcht, und **erst das
resultierende `state.doc.toJSON()`** an `writeDocx` übergeben. Das prüft zusätzlich, dass
der Lösch-Code selbst schema-konformen Output erzeugt.

| ID | Testfall (Bezug Anforderung) | Ablauf | Zusicherung |
|---|---|---|---|
| UT-DOCX-COL-1 | 3×3-Tabelle, mittlere Spalte löschen (5.1/1) | 3×3-JSON (eindeutiger Zellinhalt `A1`…`C3`) → `EditorState` → Cursor in mittlere Spalte → `deleteColumn` → `writeDocx(state.doc.toJSON())` → `readDocx` | Re-importiertes `word/document.xml`: genau 2 `<w:gridCol>` in `<w:tblGrid>`, jede `<w:tr>` genau 2 `<w:tc>`, Inhalt der verbleibenden Spalten unverändert, mittlere Spalte vollständig weg |
| UT-DOCX-COL-2 | `colspan: 2`-Zelle, eine überspannte Spalte löschen (5.1/2; Befund 5) | 2×2-Fixture, Zeile 0 = 1 Zelle mit `colspan: 2`, Zeile 1 = 2 Zellen → eine überspannte Spalte löschen → Rundreise | Verbleibende Zelle in Zeile 0 hat `colspan: 1` bzw. **kein** `<w:gridSpan>` mehr, Inhalt vollständig erhalten, nicht dupliziert |
| UT-DOCX-COL-2b | `colspan: 2` exakt gefüllt, beide überspannten Spalten löschen (Grenzfall 5) | wie oben, aber beide Spalten der Spanne löschen | `colspan`-Zelle **komplett** entfernt, Zeile 0 wie Zeile 1 verkürzt |
| UT-DOCX-COL-3 | `rowspan: 2`-Zelle, genau diese Spalte löschen (5.1/3; Abschn. 3.5) | Fixture analog zum bestehenden Rowspan-Test → Spalte mit der `rowspan`-Zelle löschen | `<w:tr>`-Anzahl **unverändert**, `vMerge` für diese Spalte verschwindet aus **beiden** Zeilen, Nachbarspalte unangetastet |
| UT-DOCX-COL-4 | Zwei aufeinanderfolgende Löschungen vor **einem** Export (5.1/6) | 4-spaltige Tabelle, zwei verschiedene Spalten nacheinander per `deleteColumn` (zwei Transaktionen auf demselben `state`), **erst danach** `writeDocx` | Export enthält genau 2 verbleibende Spalten, keine gelöschte Spalte „kommt zurück" |
| UT-DOCX-COL-5 | Regressionstest **Befund 6** (Umsetzungsplan 4.9): `colCount` aus Zeile 0 bleibt korrekt bei `colspan` in Zeile 0 | Zeile 0 = `colspan: 2`-Zelle + 1 normale Zelle (3 logische Spalten, 2 JSON-Zellen) → `writeDocx` **ohne** Löschung | Assertion direkt gegen den `word/document.xml`-String: genau 3 `<w:gridCol` |
| UT-DOCX-COL-6 | Letzte verbleibende Spalte via `deleteColumn` mit `dispatch` (3.6, Grenzfall 7) | 1-spaltige Tabelle → `deleteColumn(state, dispatch)` | liefert `false`, `state.doc` unverändert |

### A.3 `src/formats/odt/__tests__/roundtrip.test.ts` — Erweiterung des bestehenden `describe('ODT round trip: tables', …)`

Identisches Muster wie A.2, gegen `writeOdt`/`readOdt` und `content.xml`.

| ID | Testfall (Bezug) | Ablauf | Zusicherung |
|---|---|---|---|
| UT-ODT-COL-1 | 3×3-Tabelle, mittlere Spalte löschen (5.2/1) | wie UT-DOCX-COL-1 | genau 2 `<table:table-column>`, pro `<table:table-row>` genau 2 `<table:table-cell>`, Inhalt korrekt |
| UT-ODT-COL-2 | `number-columns-spanned="2"`, eine Spalte löschen (5.2/2) | wie UT-DOCX-COL-2 | Attribut reduziert sich/verschwindet, Inhalt erhalten; **zusätzlich** (ODF-Regel: jede Zeile deklariert `colCount` Zellen): Anzahl `<table:table-column>` = tatsächliche logische Spaltenzahl der Zeile 0 (Colspan-Summe) |
| UT-ODT-COL-3 | `number-rows-spanned="2"`, genau diese Spalte löschen (5.2/3) | wie UT-DOCX-COL-3 | Zeilenanzahl **unverändert**, Anker-Zelle vollständig entfernt |
| UT-ODT-COL-4 | Regressionstest **Befund 7** (bereits behoben, Umsetzungsplan 4.8): `colCount` = Colspan-Summe, direkt gegen XML | Zeile 0 = 1 normale Zelle + 1 Zelle `colspan: 2` (3 logische Spalten, 2 JSON-Zellen) → `writeOdt` **ohne** Löschung | `JSZip.loadAsync` → `content.xml`: genau 3 `<table:table-column`. **Dieser Test ist im aktuellen Code bereits grün** (`odt/writer.ts:115-116` summiert `colspan`); er hält die Invariante fest, kein Red-Green-Fix-Nachweis |

### A.4 `src/formats/odt/__tests__/coveredTableCell-roundtrip.test.ts` (neu) — **Befund 8 als Nicht-Bug absichern**

**Zweck (korrigiert gegenüber der Vorfassung):** Umsetzungsplan Abschnitt 3 hat empirisch
gezeigt, dass der ODT-Reader `covered-table-cell` **korrekt** überspringt und `rowspan` aus
`number-rows-spanned` am Anker liest — es gibt **keinen** Reader-Fix. Diese Datei sichert
die **heute korrekte** Rundreise ab und lässt einen künftigen, naiven „Fix" (der pro
`covered-table-cell` den `rowspan` inkrementiert und ihn damit **doppelt** zählt) sofort rot
werden.

| ID | Testfall | Ablauf | Zusicherung |
|---|---|---|---|
| UT-ODT-CTC-1 | Handgebautes `content.xml` (JSZip, Muster wie `buildSampleDocx` in `docx.spec.ts:16-57`) mit vertikaler Verbindung über `<table:covered-table-cell/>` | Zeile 0: Zelle A (Spalte 0, `number-rows-spanned="2"`) + Zelle B (Spalte 1, normal); Zeile 1: `<table:covered-table-cell/>` (Spalte 0) + Zelle C (Spalte 1) → `readOdt` | Zeile 1 im JSON hat genau **eine** `table_cell` (Text „C"), **nicht** zwei; Zelle A hat `rowspan: 2` (**nicht** 3) — der Platzhalter wird korrekt übersprungen |
| UT-ODT-CTC-2 | Vollständige Selbst-Rundreise einer `rowspan: 2`-Tabelle (Umsetzungsplan 5.5) | `writeOdt` → `readOdt` einer 2×2-Tabelle mit `rowspan:2`-Zelle A in (0,0), B in (0,1), C in (1,1) | Zeile 0 zwei Zellen, Zeile 1 **eine** Zelle, `rowspan===2` erhalten; die aus dem Ergebnis gebaute `TableMap` ist rechteckig (`width*height === Zellzahl+Spans`) — beweist, dass Writer (schreibt `covered-table-cell`, `odt/writer.ts:137`) und Reader konsistent sind |
| UT-ODT-CTC-3 | Reale LibreOffice-Fixture `tests/fixtures/external/odt/tableCoveredContent.odt` (Umsetzungsplan 3.1) | `readOdt` → `writeOdt` → `readOdt` | stabile `TableMap`-Dimensionen über beide Rundreisen, `rowspan > 1` erhalten, jede Map rechteckig — schließt aus, dass ein künftiger Reader-Rewrite diese heute grüne Datei zerstört (Infrastruktur zum Fixture-Laden existiert bereits in `src/formats/odt/__tests__/external-fixtures.test.ts`) |

### A.5 Cross-Format-Rundreise auf Objektebene — neue Datei `src/formats/shared/__tests__/table-column-cross-format-roundtrip.test.ts`

Deckt Anforderung Abschnitt 5.3 ab. **Nur hier**, weil die UI keinen Cross-Format-Export
anbietet (Abschnitt 0/D). Löschschritt über den echten `deleteColumn`-Command-Pfad, nicht
über handgeschriebenes Ziel-JSON.

| ID | Testfall (Bezug 5.3) | Ablauf | Zusicherung |
|---|---|---|---|
| UT-XFMT-COL-1 | DOCX → Spalte löschen → ODT → Reimport → DOCX (5.3/1) | `readDocx(fixture)` → `deleteColumn` (echter `EditorState`) → `writeOdt` → `readOdt` → `writeDocx` → `readDocx` | Verbleibende Spalteninhalte nach zwei Formatkonvertierungen textgleich; **kein** Textverlust (Formatierungsverlust bei Cross-Format ist laut `FEATURE-SPEC-DOCX-ODT.md` Abschn. 19 akzeptabel, Textverlust nicht) |
| UT-XFMT-COL-2 | Spiegelbildlich mit Startpunkt ODT (5.3/2), inkl. `rowspan` | `readOdt` (Fixture mit `rowspan`) → `deleteColumn` einer **anderen** als der `rowspan`-Spalte → `writeDocx` → `readDocx` → `writeOdt` → `readOdt` | Zeilenanzahl stabil, `rowspan` erhalten, kein Textverlust |

---

## B. Echte Playwright-Browser-Tests (Ebene B — verbindlich, keine Ausnahme)

### B.0 Konventionen (aus bestehenden Suiten übernommen)

- **Karten-Locator** (`docx.spec.ts:59-61`, `selection-regression.spec.ts:3-5`):
  `docxCard(page)` = `page.locator('div.rounded-lg', { has: page.getByRole('heading',
  { name: 'Word-Dokument (.docx)' }) })`; `odtCard` analog mit Heading
  `'OpenDocument Text (.odt)'`.
- **Setup je Test:** `page.goto('/')` →
  `page.getByRole('button', { name: /verstanden/i }).click()` (Privacy-Banner) → dann
  `card.getByRole('button', { name: 'Neu erstellen' }).click()` **oder** Fixture-Upload.
- **Datei-Upload:** echter `<input type="file">` über
  `card.locator('input[type="file"]').setInputFiles({ name, mimeType, buffer })` bzw.
  `.setInputFiles(fixturePath)` — **kein** direkter `readDocx`/`readOdt`-Aufruf im Test.
- **Export:** echter Klick auf `page.getByRole('button', { name: 'Exportieren' })`
  kombiniert mit `page.waitForEvent('download')`, danach `download.path()` +
  `fs.readFile` + `JSZip.loadAsync` auf die **tatsächlich heruntergeladenen Bytes**
  (Muster `docx.spec.ts:79-91`). Der einzige Export-Button gibt im Format des **beim
  Öffnen** gewählten Moduls aus (`DocumentWorkspace.tsx:124-142`).
- **Editor-Locator:** `page.locator('.ProseMirror')`; Zellen `page.locator('.ProseMirror td')`.
- **Button-Locatoren** ausschließlich über
  `getByRole('button', { name: 'Spalte löschen' })` bzw. `{ name: 'Tabelle einfügen' }`
  (beide setzen `aria-label`; „Tabelle einfügen" bereits vorhanden, `Toolbar.tsx:280`).
- **Determinismus:** Abschnitt 0.1 gilt in **jedem** Test (Selektions-Sync als
  auto-retryende `toBeEnabled/toBeDisabled`-Barriere; `mouse.move(..., { steps: 10 })`;
  `waitForTimeout(50)` nur zum Überbrücken des Sync-Fensters vor dem Tippen).
- **Fehlerüberwachung:** `page.on('pageerror', …)` in jedem Test, am Ende
  `expect(pageErrors).toEqual([])`.

**3×3-Ausgangszustand (wichtige Randbedingung, verifiziert):** Der „⊞ Tabelle"-Button ruft
`insertTable(2, 2)` (`commands.ts:92-102`, `Toolbar.tsx:284`) — **fest 2×2**;
`spalte-einfuegen`/`tabelle-einfuegen` (wählbare Größe) existieren nicht. Für alle Fälle mit
≥ 3 Spalten oder `colspan`/`rowspan` wird daher ein **Fixture per `input[type=file]`
hochgeladen** (reales Korpus-Fixture **oder** ein im Test via `writeOdt`/`writeDocx` als
Buffer erzeugtes Dokument). Fälle mit 2 Spalten (Grenzfall „letzte Spalte", `disabled`)
funktionieren direkt mit der 2×2-Tabelle.

### B.1 Neue Datei `tests/e2e/table-columns.spec.ts`

Pro Format ein eigener `test.describe` (DOCX **und** ODT teilen denselben `WordEditor`;
format-spezifisch sind nur die Rundreise-Assertions in B.3). Fälle mit reinem
Editor-Verhalten (keine Datei-Assertion) laufen mindestens einmal je Format.

| ID | Testfall (Bezug Anforderung Abschn. 7) | Playwright-Ablauf (konkret) |
|---|---|---|
| PW-COL-1 | Cursor in mittlerer Spalte einer 3×3-Tabelle → „Spalte löschen" (Testfall 1) | 3×3-Fixture hochladen; `page.locator('.ProseMirror td').nth(1).click()`; **Barriere:** `await expect(delBtn).toBeEnabled()`; `delBtn.click()`; `await expect(page.locator('.ProseMirror tr').first().locator('td')).toHaveCount(2)`; verbleibende Zellinhalte via `toContainText` unverändert, mittlere Spalte weg |
| PW-COL-2 | Cursor außerhalb einer Tabelle (Testfall 2) | `editor.click()` in normalem Absatz (kein Tabellen-Insert); `await expect(delBtn).toBeDisabled()`; `pageErrors` bleibt leer |
| PW-COL-3 | `CellSelection` über Teilhöhe einer Spalte (2 von 3 Zeilen) → gesamte Spalte weg (Testfall 3; Grenzfall 2) | Maus-Drag (0.1/3) über Zelle Zeile0/Spalte1 → Zeile1/Spalte1 (**nicht** Zeile 2); Overlay abwarten (`.selectedCell` sichtbar); `await expect(delBtn).toBeEnabled()`; klicken; **alle drei** Zeilen haben danach 2 Zellen |
| PW-COL-4 | `CellSelection` über mehrere Spalten → alle auf einen Klick (Testfall 4; Grenzfall 3) | Maus-Drag über 2 Zellen derselben Zeile in benachbarten Spalten; Overlay abwarten; klicken; Spaltenzahl sinkt in **einem** Schritt um 2 |
| PW-COL-5 | **Sichtbarkeit (Befund 12):** markierte Spalte hervorgehoben, **bevor** gelöscht wird (Testfall 5) | Maus-Drag über eine Spalte; `await expect(page.locator('.ProseMirror td.selectedCell').first()).toBeVisible()` und Overlay-Nachweis via `toHaveCSS('position','relative')` auf `td`/sichtbarem `::after` (bzw. Screenshot-Vergleich); erst dann löschen |
| PW-COL-6 | `colspan: 2`-Zelle, eine der beiden Spalten löschen (Testfall 6) | Fixture mit verbundener Zelle hochladen (kein `zellen-verbinden` in der UI); Cursor in eine überspannte Spalte; löschen; verbleibende Zelle behält Inhalt, DOM-`colspan` der `<td>` = 1 (`toHaveAttribute('colspan','1')` bzw. Attribut entfernt) |
| PW-COL-7 | `rowspan`-Zelle, genau diese Spalte löschen (Testfall 7) | Fixture mit `rowspan`-Zelle; Spalte löschen; `page.locator('.ProseMirror tr')`-Anzahl **unverändert**, Anker-Zelle aus dem DOM verschwunden |
| PW-COL-8 | 2-Spalten-Tabelle → 1-spaltiges, weiter editierbares Ergebnis (Testfall 8) | 2×2 via „Tabelle einfügen"; eine Spalte löschen; danach in verbleibende Zelle klicken, `await page.waitForTimeout(50)` (0.1/2), tippen; `await expect(editor).toContainText(<Text>)` |
| PW-COL-9 | **Zentraler Pflicht-Testfall:** letzte verbleibende Spalte → Button `disabled`, kein stiller No-Op (Testfall 9; Grenzfall 7; DoD 5; Befund 13) | 1-spaltige Tabelle (2×2 einfügen → eine Spalte löschen). **Barriere:** `await expect(delBtn).toBeDisabled()`; Zellzahl merken; erzwungener Klickversuch (`delBtn.dispatchEvent('click')` via `page.$eval`, da ein `disabled`-`<button>` sonst kein `click` feuert) bewirkt **keine** Änderung (`toHaveCount` vorher = nachher). **Zusatzvariante:** `CellSelection` über **alle** Spalten einer mehrspaltigen Fixture → ebenfalls `toBeDisabled()` (prüft Befund 13 auch für Mehrspalten-Selektion) |
| PW-COL-10 | Bild in Zelle der zu löschenden Spalte (Testfall 10; Grenzfall 12) | echter `filechooser`-Flow (`page.on('filechooser', …)`, analog Bild-Einfügen) fügt Bild in eine Zelle ein; Spalte mit Bild löschen; `await expect(page.locator('.ProseMirror img')).toHaveCount(0)`; nach Export (B.3-Variante) keine verwaiste Bilddatei im Zip |
| PW-COL-11 | `Backspace`/`Delete` auf markierter Spalte ≠ Strukturlöschen (Testfall 11; Grenzfall 21; Befund 14) | Zellen befüllen; Spalte per `CellSelection` markieren; `page.keyboard.press('Delete')`; **Nachweis:** Zellinhalte geleert, aber `page.locator('.ProseMirror td')`-Anzahl **unverändert** (Spalte bleibt) — klar abgegrenzt vom Toolbar-Löschen |
| PW-COL-12 | Undo/Redo (Testfall 12; Abschn. 3.8) | Spalte löschen → `page.keyboard.press('ControlOrMeta+z')` → Spalte inkl. Inhalt exakt zurück (`toContainText` + Zellzahl wie vorher) → `page.keyboard.press('ControlOrMeta+y')` → Spalte erneut weg |
| PW-COL-13 | Zwei Löschungen, zweimal Undo (Testfall 13) | zwei verschiedene Spalten nacheinander löschen; zweimal Undo; beide **einzeln**, in umgekehrter Reihenfolge zurück (Zwischenzustand nach dem ersten Undo geprüft, nicht nur Endzustand) |
| PW-COL-14 | Mehrfaches schnelles Hintereinander-Löschen bis der Guard greift (Grenzfall 16) | 3-spaltige Fixture; dreimal „Spalte löschen" (jeweils Barriere `toBeEnabled` abwarten); der letzte Versuch trifft die 1-spaltige Tabelle → `toBeDisabled`, kein No-Op-Datenverlust |
| PW-COL-15 | Verschachtelte Tabelle: äußere Spalte mit innerer Tabelle löschen (Testfall 19; Grenzfall 14) | Fixture-Upload mit äußerer Tabelle, deren Zelle eine vollständige innere Tabelle enthält (Kandidat `tests/fixtures/external/odt/subTables3-nested.odt` oder `tests/fixtures/external/docx/deep-table-cell.docx` — Struktur vor Verwendung durch Entpacken prüfen, siehe D); äußere Spalte mit innerer Tabelle löschen; `pageErrors` leer, innere Tabelle vollständig aus dem DOM verschwunden |
| PW-COL-16 | Frische 2×2-Tabelle direkt nach „Tabelle einfügen", ohne Tippen, Spalte löschen (Grenzfall 15) | 2×2 einfügen; **ohne** zu tippen Cursor in eine Zelle; löschen; kein Absturz, 1 Spalte bleibt |
| PW-COL-17 | Zelle mit mehreren Absätzen/gemischter Formatierung (Grenzfall 11) | in einer Zelle zwei Absätze mit Fett/Kursiv anlegen; deren Spalte löschen; gesamter Zellinhalt weg, keine Teilreste, `pageErrors` leer |
| PW-COL-18 | Mobile/Tablet-Bedienung + Overflow (Testfall 20; Bedienelement 8) | Kernfälle PW-COL-1 und PW-COL-9 zusätzlich auf den Projekten `Mobile` (Pixel 7) und `Tablet` (iPad Mini) aus `playwright.config.ts:35-36` (`--project=Mobile`/`--project=Tablet`); mindestens „Cursor in Zelle, Button klicken" (ohne `CellSelection`) grün auf allen drei Projekten; `.tableWrapper` scrollt statt den Viewport zu sprengen (`await expect(page.locator('.tableWrapper')).toHaveCSS('overflow-x','auto')` und Body-Breite ≤ Viewport) |

### B.2 Pflicht-Regressionstest: Selection-Sync mit „Spalte löschen" als Auslöser

Analog zum bestehenden `selection-regression.spec.ts:43-59` („same regression inside a table
cell"), aber mit „Spalte löschen" als zusätzlichem, auslösendem Zwischenschritt. Laut
Anforderung (3.10, Grenzfall 19, DoD 7) **nicht verhandelbar**; lebt dauerhaft in
`table-columns.spec.ts` **oder** direkt in `selection-regression.spec.ts`. Der
`waitForTimeout(50)` vor dem Tippen ist die aus dem Repo übernommene Determinismus-Barriere
(0.1/2), **nicht** eine Ergebnis-Assertion.

```ts
test('column deletion does not leave a stale selection — click + type lands correctly', async ({ page }) => {
  const pageErrors: Error[] = []
  page.on('pageerror', (e) => pageErrors.push(e))

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

  // Cursor in die rechte Spalte, dann strukturell löschen (Toolbar-Transaktion):
  await cells.nth(1).click()
  const delBtn = page.getByRole('button', { name: 'Spalte löschen' })
  await expect(delBtn).toBeEnabled() // Selektions-Sync abwarten (0.1/1)
  await delBtn.click()

  // Kritischer Nachweis: Klick in die verbleibende Zelle setzt die echte
  // ProseMirror-Selektion an die geklickte Stelle, nicht an eine stale interne
  // Selektion (Bezug FEATURE-SPEC-DOCX-ODT.md Abschnitt 2).
  await page.locator('.ProseMirror td').first().click()
  await page.waitForTimeout(50) // Sync-Fenster vor dem Tippen überbrücken (0.1/2)
  await page.keyboard.type('XYZ')

  await expect(editor).toContainText('LinksXYZ')
  await expect(editor).not.toContainText('Rechts')
  await expect(page.locator('.ProseMirror td')).toHaveCount(1)
  expect(pageErrors).toEqual([])
})
```

### B.3 Neue Datei `tests/e2e/table-columns-roundtrip.spec.ts` (Anforderung Abschnitt 5 — echte Datei-Ebene)

Jeder Test lädt eine **reale Fixture-Datei** über den echten `<input type="file">`, bedient
Toolbar/Maus wie in Ebene B, klickt auf „Exportieren", liest die **tatsächlich
heruntergeladene Datei** von der Festplatte, entpackt sie mit `JSZip` und prüft den
XML-Inhalt. **Nur Gleichformat-Rundreisen** (Cross-Format ist ohne UI-Formatwähler nicht
möglich, siehe 0/D — dafür UT-XFMT-COL-1/2 auf Ebene A).

| ID | Testfall (Bezug) | Ablauf |
|---|---|---|
| PW-RT-COL-0a | **Basis-Rundreise DOCX ohne Änderung** (5.0/1) | DOCX-Tabellen-Fixture hochladen → **unverändert** exportieren → heruntergeladene Datei re-importieren (erneuter Upload) → Spaltenzahl/Zellinhalte/Verbindungen identisch. Sichert, dass die neue Funktion bestehende Tabellen nicht beschädigt |
| PW-RT-COL-0b | **Basis-Rundreise ODT ohne Änderung, inkl. `rowspan`** (5.0/2) | wie 0a mit `tableCoveredContent.odt` bzw. einer `rowspan`-Fixture → `content.xml` behält `number-rows-spanned`, `covered-table-cell` konsistent |
| PW-RT-COL-1 | DOCX 3×3, mittlere Spalte, Rundreise (5.1/1) | 3×3-DOCX-Fixture hochladen → Cursor in mittlere Spalte → „Spalte löschen" → `waitForEvent('download')` + „Exportieren" → `JSZip.loadAsync` → `word/document.xml`: genau 2 `<w:gridCol`, jede `<w:tr` genau 2 `<w:tc` (Regex-Zählung im rohen XML, Muster `docx.spec.ts`) |
| PW-RT-COL-2 | ODT-Äquivalent zu PW-RT-COL-1 (5.2/1) | wie oben, `odtCard`, `content.xml`, `<table:table-column`/`<table:table-cell` |
| PW-RT-COL-3 | DOCX, `colspan`-Zelle, eine Spalte löschen (5.1/2) | Fixture mit `colspan: 2` → betroffene Spalte löschen → Export → `<w:gridSpan>` verschwunden bzw. `w:val="1"`, Inhalt vorhanden |
| PW-RT-COL-4 | ODT, `number-columns-spanned`-Zelle (5.2/2, inkl. Befund 7) | wie oben gegen `content.xml`; zusätzlich Anzahl `<table:table-column` = logische Spaltenzahl nach dem Löschen |
| PW-RT-COL-5 | DOCX, `rowspan`-Zelle (5.1/3) | Fixture mit `rowspan: 2` → diese Spalte löschen → Export → `<w:tr`-Anzahl unverändert, `vMerge` verschwunden |
| PW-RT-COL-6 | ODT, `number-rows-spanned`-Zelle (5.2/3) | spiegelbildlich; Zeilenanzahl stabil |
| PW-RT-COL-7 | DOCX, zwei Spalten nacheinander, dann **ein** Export (5.1/6) | 4-spaltige Fixture → zwei verschiedene Spalten löschen → Export → beide fehlen, keine „kommt zufällig zurück" |
| PW-RT-COL-8 | Reale komplexe DOCX-Fremddatei, > 5 Spalten (5.1/4) | Kandidat `tests/fixtures/external/docx/TestTableColumns.docx` (Struktur vor Verwendung prüfen, ggf. anderes Fixture) → mittlere Spalte löschen → exportieren → **erneut über echten Upload re-importieren** → verbleibende Zellinhalte identisch, keine Verschiebung |
| PW-RT-COL-9 | **Pflicht-Testfall Befund 8:** reale ODT-Fremddatei mit `covered-table-cell` (5.2/4; Grenzfall 18) | `tableCoveredContent.odt` (laut Umsetzungsplan 33 `covered-table-cell`, verifiziert lauffähig; falls nötig alternativ aus `tests/fixtures/external/odt/` durch Entpacken einen Treffer auf `<table:covered-table-cell` suchen). Ablauf: hochladen → **vor** jeder Lösch-Aktion prüfen, ob die Spaltenzuordnung korrekt importiert ist (Spot-Check sichtbarer Zellinhalte). Da Befund 8 empirisch als Nicht-Bug geklärt ist, **wird der Import als korrekt erwartet**; sollte er wider Erwarten falsch sein, ist der Fall als **blockiert durch Befund 8** zu kennzeichnen (Abschnitt D), nicht als Fehlschlag von „Spalte löschen". Danach: eine Spalte (nicht die verbundene) löschen → exportieren → reimportieren → Ergebnis dokumentieren |

**Bewusst nicht als E2E enthalten (durch UI-Grenze, siehe D):** Cross-Format-Rundreisen
(Anforderung 5.3) — vollständig durch UT-XFMT-COL-1/2 (Ebene A) abgedeckt.

---

## C. Selection-Sync-Vorbedingung (muss vor B.2 grün sein) — reine Re-Verifikation

| ID | Prüfschritt |
|---|---|
| PRE-1 | `npx playwright test tests/e2e/selection-regression.spec.ts --project="Desktop Chrome" -g "inside a table"` **isoliert** ausführen — muss **grün** sein, bevor `table-columns.spec.ts` entsteht. **Korrektur gegenüber der Vorfassung:** Dies ist **keine** Vorbedingung „erst `aria-label` ergänzen" — `Toolbar.tsx:280` trägt `aria-label="Tabelle einfügen"` bereits, der Locator `getByRole('button', { name: 'Tabelle einfügen' })` (`selection-regression.spec.ts:46`) ist gültig. Der Schritt stellt nur sicher, dass die neue Suite denselben, funktionierenden Locator- und Determinismus-Rahmen erbt |

---

## D. Bekannte Einschränkungen / Blocker — nicht als „nicht bestanden" zu werten

- **Kein Cross-Format-Export über die UI (verifiziert):** `DocumentWorkspace.tsx:124-142`
  hat genau einen „Exportieren"-Button, der `module.exportFile(...)` des **beim Öffnen**
  gewählten Formatmoduls aufruft; es gibt keinen Formatwähler. Anforderung 5.3
  (DOCX→ODT→DOCX, ODT→DOCX→ODT) ist daher **nicht** per Browser-Bedienung abbildbar und wird
  auf Objektebene (UT-XFMT-COL-1/2) nachgewiesen. Das ist eine reale Produkt-Grenze, kein
  QA-Ausweichen; sollte je ein Cross-Format-Export-Pfad entstehen, sind PW-Varianten
  nachzuziehen.
- **Befund 8 ist ein Nicht-Bug (empirisch geklärt):** Der ODT-Reader (`reader.ts:301-321`)
  überspringt `covered-table-cell` korrekt und liest `rowspan` vom Anker. PW-RT-COL-9 /
  UT-ODT-CTC-* erwarten daher **korrekten** Import. Nur falls ein konkretes reales Fixture
  wider Erwarten falsch importiert, wird **dieses Fixture** als blockiert markiert — nicht
  „Spalte löschen".
- **Pre-existing `colCount`-aus-Zeile-0-Schwäche (Umsetzungsplan 3.3):** Bei irregulären
  Tabellen mit `number-columns-repeated`/`number-rows-repeated` (z. B.
  `tests/fixtures/external/odt/tableOps.odt`) leiten **beide** Writer `colCount` allein aus
  Zeile 0 ab und können überzählige Zellen breiterer Folgezeilen verwerfen. Das ist
  **pre-existing**, formatübergreifend und **nicht** von „Spalte löschen" ausgelöst
  (`deleteColumn` hält die Tabelle rechteckig). Trifft ein Fremddatei-Test darauf, ist es
  als bekannte Writer-Einschränkung zu vermerken, nicht als Feature-Fehlschlag.
- **Kein Kontextmenü (Projektentscheidung, `WordEditor.tsx:109-113`):** Dieser Plan prüft
  **keinen** Rechtsklick-Pfad — bewusste, dokumentierte Scope-Entscheidung, kein vergessener
  Testfall.
- **Fixture-Strukturen vor Verwendung entpacken:** Für PW-COL-6/7/15 und PW-RT-COL-8/9 ist
  die genaue Struktur (colspan/rowspan-Lage, Verschachtelung, Spaltenzahl) des jeweiligen
  Fixtures **vor** dem Test durch Entpacken (`JSZip`) zu verifizieren; ODT/DOCX sind
  ZIP-Container, ein reiner Datei-Grep über das Repo findet den Inhalt nicht. Passt kein
  vorhandenes Fixture, wird eines im Test via `writeOdt`/`writeDocx` als Buffer synthetisch
  erzeugt (bevorzugt gegenüber Neu-Beschaffung).

---

## E. Zuordnung Ebene A / Ebene B zu den Pflicht-Grenzfällen (Anforderung Abschnitt 4)

| # | Grenzfall (Anforderung) | Ebene A (Unit) | Ebene B (Playwright) |
|---|---|---|---|
| 1 | Cursor ohne Selektion in einer Zelle | UT-CMD-2, UT-DOCX-COL-1 | PW-COL-1 |
| 2 | `CellSelection` in einer Spalte, Teilhöhe | UT-CMD-5 | PW-COL-3 |
| 3 | `CellSelection` über mehrere Spalten | UT-CMD-5 (Guard) | PW-COL-4 |
| 4 | `colspan`-Zelle über Spaltengrenze hinaus | UT-DOCX-COL-2, UT-ODT-COL-2 | PW-COL-6, PW-RT-COL-3/4 |
| 5 | `colspan` exakt passend → Zelle komplett entfernt | UT-DOCX-COL-2b | PW-COL-6 (Variante) |
| 6 | `rowspan`-Zelle | UT-DOCX-COL-3, UT-ODT-COL-3, UT-ODT-CTC-2 | PW-COL-7, PW-RT-COL-5/6 |
| 7 | Letzte verbleibende Spalte / alle Spalten markiert | UT-CMD-1/3/4/6, UT-DOCX-COL-6 | **PW-COL-9** (zentraler Pflichttest) |
| 8 | Genau 2 Spalten → 1-spaltiges Ergebnis | — | PW-COL-8 |
| 9 | Links/rechts/Mitte-Position | UT-DOCX-COL-1 (Mitte); Rand-Varianten im selben `describe` | PW-COL-1 (Mitte); Rand-Varianten analog |
| 10 | Leere Zellen in der Spalte | — | implizit in PW-COL-8/16 (frische Tabelle leer) |
| 11 | Zelle mit mehreren Absätzen/gemischter Formatierung | — | PW-COL-17 |
| 12 | Bild in gelöschter Spalte | — | PW-COL-10 |
| 13 | Bestätigungsdialog (keiner) | — (Scope-Entscheidung) | implizit: kein Dialog blockiert PW-COL-1/9 |
| 14 | Verschachtelte Tabelle | UT-XFMT (indirekt) | PW-COL-15 |
| 15 | Direkt nach „Tabelle einfügen" ohne Tippen | — | PW-COL-16 |
| 16 | Mehrfaches schnelles Hintereinander-Löschen | UT-DOCX-COL-4 | PW-COL-14 |
| 17 | Reale Fremddatei, große Tabelle | — | PW-RT-COL-8 |
| 18 | Reale ODT-Fremddatei mit `covered-table-cell` | UT-ODT-CTC-1/2/3 | PW-RT-COL-9 |
| 19 | Selection-Sync-Regression | — | **PW-COL/B.2** (Pflicht) |
| 20 | Track-Changes (zukünftig) | nicht im Scope | nicht im Scope |
| 21 | Keyboard-Löschen ≠ Strukturlöschen (Befund 14) | UT-CMD (Bibliotheks-Binding dokumentiert) | PW-COL-11 |

---

## F. Definition of Done — Abnahme-Checkliste (Bezug Anforderung Abschnitt 10)

Der Backlog-Status von `spalte-loeschen` darf erst auf „vorhanden" wechseln, wenn **alle**
folgenden Zeilen grün sind:

| DoD-Punkt (Anforderung Abschnitt 10) | Nachweis-IDs |
|---|---|
| 1. Echter klickbarer Toolbar-Button (`aria-label`) löst `deleteColumn` sichtbar aus | PW-COL-1, PW-COL-8 |
| 2. Markierte Spalte **vor** dem Klick sichtbar hervorgehoben (Befund 12) | PW-COL-5 |
| 3. Alle 3 Erkennungsfälle (Abschn. 3.1) einzeln getestet | UT-CMD-2/5, PW-COL-1, PW-COL-3, PW-COL-4 |
| 4. Verhalten bei `colspan`/`rowspan` nachgewiesen | UT-DOCX-COL-2/2b/3, UT-ODT-COL-2/3, UT-ODT-CTC-2, PW-COL-6/7, PW-RT-COL-3..6 |
| 5. Letzte-Spalte-Grenzfall via **eigenem** Guard `disabled`, kein stiller No-Op (Befund 13) | UT-CMD-1/3/4/6, UT-DOCX-COL-6, PW-COL-9 |
| 6. Abgrenzung Backspace/Entf (Befund 14) | PW-COL-11 |
| 7. Selection-Sync-Regressionstest mit „Spalte löschen", dauerhaft in Suite | B.2 (+ PRE-1 als Re-Verifikation) |
| 8. Rundreise DOCX/ODT/Basis/Cross-Format/reale Fremddateien | PW-RT-COL-0a/0b/1..9, UT-DOCX-COL-1..6, UT-ODT-COL-1..4, UT-XFMT-COL-1/2 |
| 9. Befunde 6–9 einzeln geprüft, Ergebnis dokumentiert | Befund 6: korrekt (UT-DOCX-COL-5); Befund 7: bereits behoben → Regression (UT-ODT-COL-4); **Befund 8: als Nicht-Bug abgesichert** (UT-ODT-CTC-1/2/3, PW-RT-COL-9); Befund 9 (OOXML/ODF-Asymmetrie): durch 7+8 erklärt, kein Fix |
| 10. Kein stiller Datenverlust, keine JS-Exception | `pageErrors`-Prüfung in **jedem** B-Test; PW-COL-2/9/14 |
| 11. Undo/Redo zuverlässig, auch mehrfach | PW-COL-12, PW-COL-13 |
| 12. Desktop/Mobile/Tablet, kein Viewport-Sprengen (Befund 12) | PW-COL-18 |
| 13. Backlog-Status-Änderung erst nach 1–12 | nach vollständigem Testlauf; Blocker aus Abschnitt D explizit dokumentiert oder aufgelöst |

Zusätzlich, spezifisch für diesen Feature-Plan: **Kein** Testfall aus Abschnitt E darf beim
finalen Testlauf übersprungen oder als „n/a" geführt werden, ohne dass die Begründung in
Abschnitt D nachgetragen ist. Determinismus (Abschnitt 0.1) ist Abnahmebestandteil: ein Test,
der nur mit festen Sleeps als Ergebnis-Barriere oder ohne Selektions-Sync-Abwarten grün wird,
gilt als **nicht** bestanden und ist vor Abnahme umzubauen.
