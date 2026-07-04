# Umsetzungsplan: Feature „Zellen verbinden" — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/zellen-verbinden-req.md`. Dieses Dokument prüft den
**tatsächlichen** Code-Stand gegen jede Behauptung/jedes Verdachtsmoment der Anforderung
und legt fest, welche Dateien wie geändert bzw. neu angelegt werden. Stil orientiert an
`FEATURE-SPEC-DOCX-ODT.md` und `specs/ausrichtung-zentriert-code.md`. Kein Punkt hier ist
bereits umgesetzt — dies ist der Plan, nicht der Vollzug.

Alle Befunde in Abschnitt 2 wurden nicht nur durch Lesen des Codes, sondern durch
tatsächliche Ausführung verifiziert: dedizierte, danach wieder vollständig entfernte
Vitest-Reproduktionen (`EditorState`, `mergeCells`/`CellSelection` aus
`prosemirror-tables@1.8.5`, `readDocx`/`writeDocx`/`readOdt`/`writeOdt` gegen synthetische
und echte Fixture-Bytes), sowie Inspektion der rohen XML-Bytes mehrerer in
`tests/fixtures/external/{docx,odt}/` vorhandener Dateien per JSZip. Nach jeder
Reproduktion wurde der Arbeitsbaum wieder auf den Ausgangsstand zurückgesetzt
(`git diff --stat` vor/nach jeder Sitzung geprüft) — dieser Plan selbst enthält noch
keine der vorgeschlagenen Änderungen.

---

## 0. Kurzfassung

Die Ist-Stand-Tabelle in `zellen-verbinden-req.md` Abschnitt 1 ist in praktisch allen
Zeilenangaben exakt (siehe Abschnitt 1 unten). Die tatsächliche Ausführung des Codes
deckt aber **drei bislang unentdeckte, kritische Funktionsfehler** auf, die über die in
Abschnitt 6 der Anforderung geäußerten Verdachtsmomente hinausgehen bzw. sie konkret
bestätigen und verschärfen:

1. **Rechteckiges Verbinden (Testfall 4/5, `colspan` UND `rowspan` gleichzeitig) erzeugt
   nach einer DOCX-Rundreise einen falschen, zu hohen `rowspan`-Wert.** Reproduziert: ein
   2×2-Merge (`colspan: 2, rowspan: 2`) liefert nach Schreiben+Lesen `rowspan: 3` statt
   `2`. Ursache: `docx/reader.ts`s Anker-Tracking zählt pro **Fortsetzungszelle**
   hoch, nicht pro **Fortsetzungszeile** — bei `colspan > 1` verweisen mehrere
   Gitterspalten auf denselben Anker, der dadurch mehrfach pro Zeile inkrementiert wird.
   Die bestehenden Roundtrip-Tests decken nur reine Spalten- **oder** reine
   Zeilen-Merges ab, nie beide gleichzeitig — genau die von Testfall 4/5 geforderte
   Kombination war bislang ungetestet. Siehe Abschnitt 2.1.
2. **ODT-Export für verbundene Zellen fehlt `<table:covered-table-cell>` komplett** —
   Verdachtsmoment 7 der Anforderung bestätigt sich, und zwar **umfassender** als dort
   beschrieben: Nicht nur für von `rowspan` verdeckte **Zeilen** fehlt das Element,
   sondern auch für die von `colspan` verdeckten **Spaltenpositionen in derselben
   Zeile** — das reale Fixture `tests/fixtures/external/odt/tableCoveredContent.odt`
   belegt exakt dieses Muster (ein `<table:table-cell
   table:number-columns-spanned="2">` wird dort **immer** unmittelbar von einem
   `<table:covered-table-cell/>` gefolgt, auch wenn kein `rowspan` beteiligt ist).
   Zusätzlich berechnet der Writer die Spaltenanzahl (`table:table-column`-Anzahl) über
   `rows[0].content.length` **ohne** `colspan`-Gewichtung — bereits ein einfacher
   horizontaler Merge in der ersten Zeile (exakt Testfall 2, der einfachste Testfall
   dieser Datei) erzeugt dadurch zu wenige `<table:table-column>`-Elemente. Siehe
   Abschnitt 2.2/2.3.
3. **Verdachtsmoment 5 (Testfall 7, von der Anforderung selbst als „kritischster
   Einzeltest" bezeichnet) bestätigt sich als echter Bug, reproduziert auf
   ProseMirror-Modellebene:** Direkt nach `mergeCells` steht eine `CellSelection` auf
   der neuen Zelle; `CellSelection.replaceWith`
   (`node_modules/prosemirror-tables/dist/index.js:589–591`) ersetzt beim nächsten
   Tippen den **gesamten** Inhalt dieser Zelle durch das eine getippte Zeichen. Mit
   einer echten `EditorState` reproduziert: nach Merge zweier Zellen mit Text „AAA" und
   „BBB" liefert `state.tr.insertText('X')` als Dokumenttext **nur noch** `"X"` — der
   gesamte zusammengeführte Inhalt ist weg. Ein im selben Test verifizierter Fix
   (Selektion nach dem Merge aktiv auf einen Text-Cursor am Ende der Zelle umsetzen)
   behebt das nachweislich (Dokumenttext danach: `"AAA BBB X"`-Äquivalent, alle Teile
   erhalten). Siehe Abschnitt 2.4.

Zusätzlich: Die von der Anforderung selbst als offen markierte Frage nach einer realen
DOCX-Datei mit **beiden** Merge-Arten (Abschnitt 5 Punkt 1) lässt sich mit bereits
vorhandenem Material beantworten — `tests/fixtures/external/docx/bug57031.docx` enthält
tatsächlich sowohl `gridSpan` (12×) als auch `vMerge` (8×) und ist mit 55 KB
handlich groß; eine zusätzliche externe Beschaffung ist **nicht** nötig (Abschnitt 2.5).
Ein weiterer, von der Anforderung nicht benannter, aber für Menüpunkt 9/Testfall 11
blockierender Befund: **Tab-Navigation zwischen Tabellenzellen existiert im Editor
aktuell überhaupt nicht** (nicht nur „nach dem Merge kaputt") — `tableEditing()`s
`handleKeyDown` bindet nur Pfeiltasten/Backspace/Delete, kein `Tab`
(`node_modules/prosemirror-tables/dist/index.js:2113–2126`), und `WordEditor.tsx`s
eigene Keymap kennt ebenfalls kein `Tab`. Ohne diese Ergänzung ist Testfall 11 nicht
sinnvoll durchführbar. Siehe Abschnitt 2.6.

Positiv bestätigt: Die JS-/Decoration-Seite der Mehrzellen-Selektion
(Verdachtsmoment 3) ist bereits **vollständig** vorhanden — `tableEditing()`s
`drawCellSelection` (`dist/index.js:689–696`) hängt bei jeder `CellSelection` bereits
die CSS-Klasse `selectedCell` an jede markierte Zelle. Es fehlt **ausschließlich** die
CSS-Regel dafür; kein JS-/Plugin-Code muss dafür geändert werden (Abschnitt 2.7).

---

## 1. Verifikation der Ist-Stand-Tabelle aus `zellen-verbinden-req.md` Abschnitt 1

| Fundstelle laut Anforderung | Ergebnis der Prüfung |
|---|---|
| `schema.ts:106` `tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` | Bestätigt exakt. `colspan`/`rowspan`/`colwidth` kommen mit Defaults `1`/`1`/`null` aus `tableNodes()` selbst (`node_modules/prosemirror-tables/dist/index.js:279–296`), keine Schema-Änderung für dieses Feature nötig. |
| `WordEditor.tsx:8,81–82` `columnResizing()`/`tableEditing()` | Bestätigt exakt. **Ergänzender Befund:** `columnResizing()` registriert bereits automatisch eine `TableView`-NodeView (`dist/index.js:2354–2395`), die jede `table` in `<div class="tableWrapper"><table><colgroup/><tbody/></table></div>` rendert — die für Testfall 1 nötige DOM-Struktur ist also **bereits vorhanden**, es fehlt nur CSS (siehe Kurzfassung Punkt „positiv bestätigt" und Abschnitt 2.7). |
| `src/index.css` kein `.selectedCell:after` | Bestätigt exakt (komplette Datei erneut gelesen, 72 Zeilen). Vendor-Stylesheet unter `node_modules/prosemirror-tables/style/tables.css` enthält exakt die fehlenden Regeln (`.tableWrapper`, `td/th{position:relative}`, `.selectedCell:after`, `.column-resize-handle`, `.resize-cursor`). |
| `commands.ts` keine `mergeCells`/`splitCell`-Verwendung | Bestätigt (`grep -rn "mergeCells\|splitCell\|CellSelection\|covered-table-cell\|cellsOverlapRectangle" src/` → 0 Treffer im gesamten `src/`-Baum). |
| `node_modules/prosemirror-tables/dist/index.d.ts` Export-Zeile | Bestätigt: `mergeCells`, `splitCell`, `CellSelection`, `cellAround`, `goToNextCell`, `deleteColumn`, `deleteRow` u. a. sind alle bereits exportiert (installierte Version: `prosemirror-tables@1.8.5`, siehe `package.json:29`). |
| `Toolbar.tsx` (247 Zeilen), Tabellen-Button Zeile 228–239 | Bestätigt exakt: `insertTable(2, 2)`, `aria-pressed={isInTable(view.state)}`, kein `disabled`-Attribut irgendwo in der Datei — dieses Muster existiert im gesamten Toolbar noch **nicht** und wird für den neuen Button erstmals eingeführt (Abschnitt 4.2). |
| `docx/reader.ts` `parseTable` (Zeile 210–256) | Bestätigt exakt in der Grundstruktur (Anker-Array, `MAX_TABLE_NESTING_DEPTH = 25` Zeile 208, `isContinuation`-Erkennung Zeile 227). **Aber:** Die Anforderung unterschätzt einen Fehler in genau diesem Mechanismus — siehe Fehler 1, Abschnitt 2.1 (Anker wird pro Fortsetzungs**zelle**, nicht pro Fortsetzungs**zeile** hochgezählt). |
| `docx/writer.ts` `tableToDocx` (Zeile 128–171) | Bestätigt exakt. Schreiber und (unkorrigierter) Leser sind bei reinen Zeilen-/Spalten-Merges konsistent — bei kombinierten Merges ist der Leser die Fehlerursache (Abschnitt 2.1), der Schreiber selbst ist strukturell gültiges, wenn auch nicht optimal kompaktes OOXML. |
| `odt/reader.ts` (Zeile 189–203, `childElements` Zeile 28–30) | Bestätigt exakt: exakter Local-Name-Filter auf `table-cell` überspringt `covered-table-cell`-Geschwister automatisch. **Zusätzlich verifiziert** (nicht nur „dürfte funktionieren"): reale Fixture `tableCoveredContent.odt` (reich an `covered-table-cell`) importiert bereits heute korrekt — kein Code-Fix am Reader nötig, nur dedizierte Tests fehlen (Abschnitt 3). |
| `odt/writer.ts` (Zeile 86–109) | Bestätigt, dass kein `covered-table-cell` geschrieben wird — **aber die Anforderung benennt nur die Hälfte des Problems** (nur „für jede verdeckte Zellposition" pauschal). Die tatsächliche, mit echten Fixtures belegte Regel ist präziser und auch für reine `colspan`-Fälle in derselben Zeile relevant — siehe Fehler 2, Abschnitt 2.2. Zusätzlich: falsche Spaltenanzahl-Berechnung, ein von der Anforderung **nicht** benannter zweiter Bug in derselben Funktion (Fehler 3, Abschnitt 2.3). |
| Unit-/Roundtrip-Tests (`docx/__tests__/roundtrip.test.ts:205–248`, `odt/__tests__/roundtrip.test.ts:194–209`) | Bestätigt exakt: je ein Test für reines `colspan` und reines `rowspan` (DOCX getrennt, ODT nur als Attribut-Assertion auf einer einzelnen Zelle, nie als XML-Struktur-Check). **Keiner** der bestehenden Tests deckt eine Kombination aus `colspan > 1` **und** `rowspan > 1` auf derselben Zelle ab — exakt die Lücke, die Fehler 1 verdeckt hielt. |
| E2E-Tests, reale Fixtures | Bestätigt exakt wie beschrieben (kein Merge-Test, Fixture-Liste vollständig vorhanden — Datei-Existenz aller genannten Namen per `ls` verifiziert). |
| DOCX-Fixture-Kandidaten (Abschnitt 1 letzte Zeile) | **Präzisiert:** `TestTableCellAlign.docx`/`table-alignment.docx` haben tatsächlich 0 `gridSpan`/0 `vMerge`; `TestTableColumns.docx` hat `gridSpan: 1`, aber `vMerge: 0` (nur horizontaler Merge). Für die geforderte Kombination aus horizontalem **und** vertikalem Merge in einer realen Datei ist `bug57031.docx` bereits im Repository vorhanden und geeignet (Abschnitt 2.5) — die Anforderung lässt offen, ob eine zusätzliche Datei beschafft werden muss; das ist **nicht** nötig. |

---

## 2. Gefundene Fehler (priorisiert)

### 2.1 Fehler 1 (kritisch): Rechteckiger Merge (`colspan`+`rowspan` kombiniert) liefert nach DOCX-Rundreise einen zu hohen `rowspan`

**Datei:** `src/formats/docx/reader.ts`, `parseTable` (Zeile 218–253):

```ts
const rows: JsonNode[] = rowEls.map((rowEl) => {
  const cells: JsonNode[] = []
  let col = 0
  for (const tcEl of childElements(rowEl, OOXML_NAMESPACES.w, 'tc')) {
    // ...
    if (isContinuation) {
      const anchor = col < colCount ? anchors[col] : null
      if (anchor?.attrs) anchor.attrs.rowspan = (Number(anchor.attrs.rowspan) || 1) + 1
      col += colspan
      continue
    }
    // ...
    for (let c = col; c < Math.min(col + colspan, colCount); c++) {
      anchors[c] = vMergeVal === 'restart' ? cellNode : null
    }
    col += colspan
  }
  return { type: 'table_row', content: cells }
})
```

Bei einer Anker-Zelle mit `colspan > 1` (Zeile 247–249) wird **dieselbe** `cellNode`-Referenz
in mehrere Gitterspalten von `anchors[]` eingetragen. `docx/writer.ts`s `tableToDocx`
(Zeile 141–146, 161–163) schreibt für eine Fortsetzungszeile eines rechteckigen Merges
**pro betroffener Gitterspalte eine eigene** `<w:tc><w:tcPr><w:vMerge/></w:tcPr><w:p/></w:tc>`
(kein `gridSpan` auf der Fortsetzungszelle) — bei `colspan = 2` also **zwei** separate
Fortsetzungs-`<w:tc>`-Elemente pro Fortsetzungszeile. Der Reader durchläuft diese beiden
Elemente **einzeln** und erhöht `rowspan` bei **jedem** davon um 1, obwohl es sich um
**eine** logische Fortsetzungszeile handelt.

**Reproduziert** (dedizierte, danach entfernte Vitest-Datei, `writeDocx`→`readDocx` mit
echten Bytes, kein Mock):

```
Eingabe:  table_cell { colspan: 2, rowspan: 2 }  (2×2-Merge, wie Testfall 4)
Ausgabe nach Rundtrip: attrs.rowspan === 3   ✗ (erwartet: 2)
```

**Auswirkung auf die Anforderung:** Testfall 4 (2×2), Testfall 5 (2×3, 3×3),
Rundreise-Anforderung 5.3/5.4/5.7 (jede DOCX-Rundreise mit rechteckigem Merge) und
Grenzfall 3 schlagen mit dem aktuellen Code **strukturell falsch** fehl — nicht mit
einer Exception, sondern mit einem stillschweigend falschen, zu hohen `rowspan`-Wert,
der beim erneuten Rendern zu viele Zeilen "verschluckt" bzw. beim erneuten Export einen
inkonsistenten Grid-Zustand erzeugen kann. Das ist real gravierender als alles, was
Abschnitt 6 der Anforderung zu diesem Mechanismus vermutet (Verdachtsmoment 9 vermutet
nur allgemein „nie mit echter Word-Datei getestet", nicht diesen konkreten,
mit der **eigenen** Schreiber/Leser-Kette bereits reproduzierbaren Fehler).

**Fix:** Pro Zeile merken, welche Anker bereits hochgezählt wurden, und nur **einmal
pro Zeile** erhöhen — unabhängig davon, wie viele Fortsetzungs-`<w:tc>`-Elemente
denselben Anker referenzieren:

```ts
const rows: JsonNode[] = rowEls.map((rowEl) => {
  const cells: JsonNode[] = []
  let col = 0
  const bumpedThisRow = new Set<JsonNode>()
  for (const tcEl of childElements(rowEl, OOXML_NAMESPACES.w, 'tc')) {
    // ... (unverändert bis isContinuation)
    if (isContinuation) {
      const anchor = col < colCount ? anchors[col] : null
      if (anchor?.attrs && !bumpedThisRow.has(anchor)) {
        anchor.attrs.rowspan = (Number(anchor.attrs.rowspan) || 1) + 1
        bumpedThisRow.add(anchor)
      }
      col += colspan
      continue
    }
    // ... (unverändert)
  }
  return { type: 'table_row', content: cells }
})
```

**Verifiziert:** Mit exakt diesem Fix (probeweise angewendet, danach wieder entfernt)
liefert derselbe 2×2-Reproduktionstest `rowspan === 2` (korrekt), ein zusätzlicher
3×3-Test (`colspan: 3, rowspan: 3`) liefert `rowspan === 3` (korrekt), und **beide**
bestehenden Roundtrip-Tests (`docx/__tests__/roundtrip.test.ts`, reines `colspan`
und reines `rowspan`) bleiben weiterhin grün — der Fix ist also robust gegen die
bereits abgedeckten Fälle und behebt zusätzlich den kombinierten Fall, ohne
Nebenwirkungen auf den einfachen Fall (dort gibt es ohnehin nur eine Gitterspalte pro
Anker, `bumpedThisRow` ändert dort nichts am Ergebnis).

**Empfohlene Zusatzmaßnahme (nicht zwingend für Korrektheit, siehe Abschnitt 4.6):**
`docx/writer.ts` so ändern, dass eine Fortsetzungszeile eines Merges mit `colspan > 1`
**eine** kombinierte `<w:tc><w:tcPr><w:gridSpan w:val="N"/><w:vMerge/></w:tcPr><w:p/></w:tc>`
schreibt statt `N` einzelner 1-Spalten-Zellen — kompakter, und die einzige real
verfügbare externe DOCX-Datei mit `vMerge` (`bug57031.docx`) enthält zwar keinen
kombinierten Fall zum Abgleich, aber diese Form ist die übliche, kompaktere
OOXML-Darstellung. Mit dem Reader-Fix aus diesem Abschnitt ist die Korrektheit aber
bereits **unabhängig** davon sichergestellt, ob der Schreiber (eigener oder ein
fremder, z. B. echtes Word) eine reale Datei so oder so schreibt.

### 2.2 Fehler 2 (kritisch, präzisiert Verdachtsmoment 7): ODT-Export schreibt kein `<table:covered-table-cell>` — auch nicht für `colspan` in derselben Zeile

**Datei:** `src/formats/odt/writer.ts`, `case 'table'` (Zeile 86–111):

```ts
case 'table': {
  const rows = node.content ?? []
  const colCount = rows[0]?.content?.length ?? 1
  // ...
  const cells = (row.content ?? [])
    .map((cell) => {
      const colspan = Number(cell.attrs?.colspan ?? 1)
      const rowspan = Number(cell.attrs?.rowspan ?? 1)
      // ... schreibt ausschließlich <table:table-cell ...>, nie <table:covered-table-cell/>
    })
    .join('')
  // ...
}
```

**Ground Truth aus einer echten, extern erzeugten Datei**
(`tests/fixtures/external/odt/tableCoveredContent.odt`, per JSZip aus `content.xml`
extrahiert):

```xml
<table:table-cell table:style-name="TableCell17" table:number-columns-spanned="2">
  <text:p .../>
</table:table-cell>
<table:covered-table-cell/>
<table:table-cell table:style-name="TableCell19" table:number-columns-spanned="2">
  <text:p .../>
</table:table-cell>
<table:covered-table-cell/>
```

Das belegt: **Jede zusätzliche von `colspan` überdeckte Spalte braucht ihr eigenes
`<table:covered-table-cell/>` in derselben Zeile** — nicht nur Zeilen, die von einem
`rowspan` verdeckt werden (was die Anforderung als einzigen Fall benennt). Für eine
rein vertikal verdeckte Zeile bestätigt dieselbe Datei das von der Anforderung
genannte Muster (`<table:covered-table-cell>` an der Spaltenposition der Ursprungszelle
in jeder Folgezeile); für eine **rechteckige** Verdeckung (Zeile + Spalte kombiniert)
zeigt die Datei zusätzlich, dass **jede** überdeckte Spaltenposition in **jeder**
überdeckten Zeile ein eigenes `<table:covered-table-cell/>` benötigt (belegt an der
`TableCell72`/`number-columns-spanned="2" number-rows-spanned="2"`-Stelle: die
Folgezeile enthält zwei aufeinanderfolgende `<table:covered-table-cell/>`-Elemente an
genau diesen zwei Spaltenpositionen).

**Reproduziert mit einer zweiten realen Fixture**
(`tests/fixtures/external/odt/table-column-delete-with-merge.odt`, per JSZip mit
korrekter Verschachtelungstiefen-Behandlung extrahiert — bestätigt exakt dasselbe
Muster: ein `table:number-columns-spanned="4"`-Zelle wird von genau drei
`<table:covered-table-cell/>` gefolgt, unabhängig von einem eventuellen `rowspan`).

**Fix** (verifiziert, siehe unten):

```ts
case 'table': {
  const rows = node.content ?? []
  const colCount = (rows[0]?.content ?? []).reduce((sum, cell) => sum + Number(cell.attrs?.colspan ?? 1), 0) || 1
  const columns = Array.from({ length: colCount }, () => '<table:table-column/>').join('')
  const pending: number[] = Array.from({ length: colCount }, () => 0)
  const rowsXml = rows
    .map((row) => {
      const rowCells = row.content ?? []
      const cellsXml: string[] = []
      let col = 0
      let cellIndex = 0
      while (col < colCount) {
        if (pending[col] > 0) {
          pending[col] -= 1
          cellsXml.push('<table:covered-table-cell/>')
          col += 1
          continue
        }
        const cell = rowCells[cellIndex]
        cellIndex += 1
        if (!cell) { col += 1; continue }
        const colspan = Number(cell.attrs?.colspan ?? 1)
        const rowspan = Number(cell.attrs?.rowspan ?? 1)
        const spanAttrs = [
          colspan > 1 ? `table:number-columns-spanned="${colspan}"` : '',
          rowspan > 1 ? `table:number-rows-spanned="${rowspan}"` : '',
        ].filter(Boolean).join(' ')
        const inner = (cell.content ?? []).map((child) => blockToOdt(child, styles, images)).join('')
        cellsXml.push(`<table:table-cell ${spanAttrs}>${inner || '<text:p/>'}</table:table-cell>`)
        // ODF verlangt ein <table:covered-table-cell/> pro zusätzlicher Spalte, die
        // dieser Merge in DERSELBEN Zeile belegt (siehe tableCoveredContent.odt).
        for (let k = 1; k < colspan; k++) cellsXml.push('<table:covered-table-cell/>')
        if (rowspan > 1) {
          for (let c = col; c < col + colspan; c++) pending[c] = rowspan - 1
        }
        col += colspan
      }
      return `<table:table-row>${cellsXml.join('')}</table:table-row>`
    })
    .join('')
  const tableName = `Table${Math.round(Math.random() * 1_000_000)}`
  return `<table:table table:name="${tableName}">${columns}${rowsXml}</table:table>`
}
```

**Verifiziert** (probeweise angewendet, dedizierter Test gegen die eigene Ausgabe
plus Reimport über `readOdt`, danach wieder entfernt): Für einen 2×2-Merge (Testfall 4)
liefert der Export exakt

```xml
<table:table-column/><table:table-column/><table:table-column/>
<table:table-row>
  <table:table-cell table:number-columns-spanned="2" table:number-rows-spanned="2">Merged</table:table-cell>
  <table:covered-table-cell/>
  <table:table-cell>R1C3</table:table-cell>
</table:table-row>
<table:table-row>
  <table:covered-table-cell/>
  <table:covered-table-cell/>
  <table:table-cell>R2C3</table:table-cell>
</table:table-row>
```

— exakt dieselbe Form wie im echten Fixture-Beleg oben. Reimport über den
**unveränderten** `odt/reader.ts` liefert wieder `colspan: 2, rowspan: 2` (der Reader
überspringt `covered-table-cell` bereits korrekt, siehe Abschnitt 1). Alle 224
bestehenden ODT-Tests (`roundtrip.test.ts`, `external-fixtures.test.ts`) bleiben mit
diesem Fix weiterhin grün.

### 2.3 Fehler 3 (mittel, von der Anforderung nicht benannt): Spaltenanzahl-Berechnung im ODT-Export ignoriert `colspan`

**Datei:** `src/formats/odt/writer.ts:88` (Teil derselben Funktion wie Fehler 2):

```ts
const colCount = rows[0]?.content?.length ?? 1
```

Zählt die Anzahl der **Zellknoten** der ersten Zeile, nicht die Summe ihrer
`colspan`-Werte — im Unterschied zum strukturell identischen, aber korrekten Pendant
in `docx/writer.ts:130`
(`(rows[0]?.content ?? []).reduce((sum, cell) => sum + Number(cell.attrs?.colspan ?? 1), 0) || 1`).
Enthält die erste Zeile einer Tabelle bereits eine verbundene Zelle (**exakt der Fall
von Testfall 2**, dem einfachsten Testfall dieser Datei: zwei Zellen der ersten Zeile
horizontal verbinden), wird die Anzahl der geschriebenen `<table:table-column>`-Elemente
zu niedrig berechnet. Der bestehende Roundtrip-Test
(`odt/__tests__/roundtrip.test.ts:194–209`, „preserves merged cells (colspan/rowspan)")
deckt das nicht auf, weil er nur `cell.attrs.colspan` nach dem Reimport prüft, nie die
Anzahl der exportierten `<table:table-column>`-Elemente.

**Fix:** Im selben Zuge wie Fehler 2 behoben (siehe Code-Block in Abschnitt 2.2 —
`colCount` wird dort bereits korrekt über die `colspan`-Summe der ersten Zeile
berechnet, analog zu `docx/writer.ts:130`). Diese Berechnung ist nur korrekt, **weil**
Zeile 0 einer gültigen, rechteckigen Tabelle nie selbst von einem `rowspan` einer
(nicht existierenden) Vorzeile verdeckt sein kann — dieselbe Voraussetzung, auf der
auch die DOCX-Seite bereits beruht.

### 2.4 Fehler 4 (kritisch, bestätigt Verdachtsmoment 5 der Anforderung): `CellSelection` nach dem Merge löscht bei sofortigem Tippen den gesamten zusammengeführten Inhalt

**Bibliothekscode:** `mergeCells` (`node_modules/prosemirror-tables/dist/index.js:1583`)
setzt nach erfolgreichem Merge `tr.setSelection(new CellSelection(tr.doc.resolve(mergedPos + rect.tableStart)))`
— eine `CellSelection`, deren Anker **und** Kopf dieselbe (neue) Zelle sind. Das ist
laut Konstruktor (`dist/index.js:508–526`) eine `CellSelection` mit genau **einer**
`SelectionRange`, die den **kompletten Inhalt** dieser Zelle abdeckt.

`CellSelection.replaceWith` (`dist/index.js:589–591`):

```js
replaceWith(tr, node) {
  this.replace(tr, new Slice(Fragment.from(node), 0, 0))
}
replace(tr, content = Slice.empty) {
  const ranges = this.ranges
  for (let i = 0; i < ranges.length; i++) {
    const { $from, $to } = ranges[i]
    tr.replace(mapping.map($from.pos), mapping.map($to.pos), i ? Slice.empty : content)
  }
  // ...
}
```

`EditorState.prototype.insertText` (`node_modules/prosemirror-state/dist/index.js:627–648`,
der Pfad, den jedes normale Tastatur-Zeichen über `EditorView`s Texteingabe-Behandlung
nimmt) ruft bei einer nicht-leeren Selektion `replaceSelectionWith` →
`selection.replaceWith(tr, node)` auf. Für die einzige Range der frisch gemergten
Zelle bedeutet das: **der komplette Inhalt der Zelle** (`$from`=Zellinhalt-Start bis
`$to`=Zellinhalt-Ende) wird durch den einen getippten Textknoten ersetzt.

**Reproduziert** (dedizierte, danach entfernte Vitest-Datei, echte `EditorState` mit
zwei Zellen „AAA"/„BBB", Merge über `mergeCells`, danach `state.tr.insertText('X')`):

```
Nach Merge, Dokumenttext: "AAA BBB"   (beide Inhalte erhalten, wie von 3.4 gefordert)
Nach state.tr.insertText('X'):  "X"   ✗ (AAA und BBB sind vollständig verschwunden)
```

**Fix** (im selben Reproduktionslauf verifiziert): Die vom Merge-Befehl erzeugte
`CellSelection` **innerhalb derselben Transaktion**, vor dem `dispatch`, durch einen
Text-Cursor am Ende des Zellinhalts ersetzen:

```ts
const endPos = cellPos + cellNode.nodeSize - 1
tr.setSelection(TextSelection.near(tr.doc.resolve(endPos), -1))
```

Mit diesem Fix liefert derselbe Reproduktionstest nach `insertText('X')` den
Dokumenttext `"AAA BBBX"` (Inhalt vollständig erhalten, `X` korrekt angehängt) — siehe
Abschnitt 4.1 für die konkrete Einbettung in einen neuen `mergeSelectedCells`-Befehl.
Dies ist exakt die von Testfall 7/Menüpunkt-Abschnitt 3.5 geforderte Korrektur und
sollte **nicht** dem Bibliotheks-Default überlassen werden.

### 2.5 Präzisierung (kein Fehler): Reale DOCX-Fixture mit horizontalem UND vertikalem Merge bereits vorhanden

Die Anforderung lässt in Abschnitt 5 Punkt 1 offen, ob eine zusätzliche externe Datei
beschafft werden muss. Per Volltextsuche über alle `.docx`-Dateien in
`tests/fixtures/external/docx/` (`gridSpan`/`vMerge`-Vorkommen in `word/document.xml`
gezählt):

| Datei | `gridSpan` | `vMerge` | Eignung |
|---|---|---|---|
| `TestTableColumns.docx` | 1 | 0 | nur horizontaler Merge, ungeeignet für „beide Arten" |
| `TestTableCellAlign.docx`, `table-alignment.docx`, `table-indent.docx`, `deep-table-cell.docx` | 0 | 0 | kein Merge enthalten |
| `60329.docx`, `bug59058.docx`, `drawing.docx`, `form_footnotes.docx` | 1–56 | 0 | nur horizontaler Merge |
| **`bug57031.docx`** | 12 | **8** | **beide Arten enthalten, 55 KB, geeignet** |
| `bug65649.docx` | 7437 | 3687 | beide Arten, aber bereits als `SKIP_SLOW_UNDER_JSDOM` markiert (`docx/__tests__/external-fixtures.test.ts:34–40`, 12 MB) — als Playwright-E2E-Stresstest geeignet, nicht für Vitest/jsdom-Unit-Tests |

**Konsequenz:** `bug57031.docx` wird als primäre reale Fixture für Testfall 24/Abschnitt
5 Punkt 1 verwendet; `bug65649.docx` zusätzlich für einen E2E-Performance-Test
(Grenzfall 11/Testfall 17, analog zum bereits etablierten
`tests/e2e/large-document-import.spec.ts`-Muster).

### 2.6 Fehler 5 (von der Anforderung nicht benannt, blockiert Menüpunkt 9/Testfall 11): Tab-Navigation zwischen Zellen existiert nicht

**Befund:** `tableEditing()`s `handleKeyDown` (`node_modules/prosemirror-tables/dist/index.js:2113–2126`)
bindet ausschließlich:

```js
const handleKeyDown = keydownHandler({
  ArrowLeft: arrow('horiz', -1), ArrowRight: arrow('horiz', 1),
  ArrowUp: arrow('vert', -1), ArrowDown: arrow('vert', 1),
  'Shift-ArrowLeft': shiftArrow('horiz', -1), /* ... */
  Backspace: deleteCellSelection, 'Mod-Backspace': deleteCellSelection,
  Delete: deleteCellSelection, 'Mod-Delete': deleteCellSelection,
})
```

Kein `Tab`/`Shift-Tab`. `WordEditor.tsx`s eigene Keymap (Zeile 71–79) kennt ebenfalls
kein `Tab`, und `prosemirror-commands`s `baseKeymap` bindet `Tab` ebenfalls nicht
(verifiziert per `grep -n "Tab" node_modules/prosemirror-commands/dist/index.js` → kein
Treffer). Tab drückt also aktuell **niemals** in die nächste Zelle, weder vor noch nach
einem Merge — der Browser führt stattdessen sein Standard-Fokus-Verhalten aus
(Fokus verlässt das `contenteditable`-Element in Richtung des nächsten fokussierbaren
DOM-Elements der Seite, z. B. einen Toolbar-Button). Menüpunkt 9/Testfall 11 der
Anforderung setzen Tab-Navigation als **bereits bestehende, nur nach Merge zu
prüfende** Baseline voraus — die existiert nicht, muss also als Voraussetzung
mit-implementiert werden.

**Fix:** `goToNextCell` (bereits aus `prosemirror-tables` exportiert,
`dist/index.js:1815–1826`) in die Keymap von `WordEditor.tsx` aufnehmen:

```ts
Tab: goToNextCell(1),
'Shift-Tab': goToNextCell(-1),
```

`goToNextCell` liefert `false`, wenn der Cursor nicht in einer Tabelle steht
(`dist/index.js:1817`: `if (!isInTable(state)) return false`) — außerhalb von Tabellen
fällt das Tastenkürzel dadurch automatisch auf das normale Browser-Verhalten zurück,
keine Regression für den Rest des Editors. Da `goToNextCell` intern über
`findNextCell`/die `TableMap` navigiert (gitterspalten-bewusst, nicht DOM-naiv),
überspringt es von `rowspan`/`colspan` verdeckte Positionen automatisch korrekt — nach
Verdrahtung ist Menüpunkt 9/Testfall 11 ohne weitere merge-spezifische Sonderbehandlung
erfüllt.

### 2.7 Bestätigung (kein Fehler, nur Lücke): Mehrzellen-Selektions-Feedback ist bereits vollständig verdrahtet — es fehlt ausschließlich CSS

**Befund:** `tableEditing()`s `decorations`-Prop ist `drawCellSelection`
(`dist/index.js:689–696`):

```js
function drawCellSelection(state) {
  if (!(state.selection instanceof CellSelection)) return null
  const cells = []
  state.selection.forEachCell((node, pos) => {
    cells.push(Decoration.node(pos, pos + node.nodeSize, { class: 'selectedCell' }))
  })
  return DecorationSet.create(state.doc, cells)
}
```

Dieser Code ist **bereits aktiv** (Teil des bereits eingehängten `tableEditing()`,
`WordEditor.tsx:82`) und hängt bei jeder `CellSelection` automatisch die Klasse
`selectedCell` an jede markierte Zelle an — unabhängig davon, ob ein Merge-Befehl
existiert. Verdachtsmoment 3/Menüpunkt 3 der Anforderung ist also **kein**
JS-/Plugin-Problem, sondern ausschließlich ein fehlendes CSS-Gegenstück (siehe
Abschnitt 4.4). Kein Code in `WordEditor.tsx` oder anderswo muss dafür geändert werden.

---

## 3. Kein Fehler, aber ausdrücklich zu bestätigen (bereits korrekt, nur ungetestet/undokumentiert)

- **Inhaltszusammenführungs-Reihenfolge (3.4/Verdachtsmoment 6):** Bibliotheksverhalten
  (`mergeCells`, `dist/index.js:1556–1571`) verkettet alle nicht-leeren Zellinhalte in
  Lesereihenfolge als zusätzliche Absätze der Ankerzelle, mit `isEmpty(cell)`-Prüfung
  (leere Zellen tragen nichts bei) und `seen`-Deduplizierung bereits verdeckter
  Positionen. Dies wird hiermit als **gewünschtes Produktverhalten bestätigt und
  übernommen** (entspricht der Word/LibreOffice-Konvention) — keine Code-Änderung
  nötig, nur Dokumentation dieser bewussten Entscheidung (Abschnitt 5.1).
- **`cellsOverlapRectangle`-Guard (3.6/Verdachtsmoment 4):** `mergeCells` liefert bei
  nicht-rechteckiger/überlappender Auswahl bereits zuverlässig `false`
  (`dist/index.js:1552`), ohne die Transaktion auszulösen — kein Bibliotheks-Fix nötig,
  nur eine UI-seitige Umsetzung als `disabled`-Zustand (Abschnitt 4.2), die diesen
  bereits vorhandenen Rückgabewert lediglich abfragt.
- **`sel.$anchorCell.pos != sel.$headCell.pos`-Guard (3.7):** Bei nur einer markierten
  Zelle liefert `mergeCells` bereits `false` (`dist/index.js:1550`) — ebenfalls nur
  UI-seitig als `disabled` umzusetzen.
- **Erweitern eines bereits verbundenen Merges (3.8):** Funktioniert über
  `selectedRect`/`TableMap` bereits strukturell korrekt für ein größeres Rechteck —
  keine Sonderbehandlung im Bibliothekscode nötig, wird über einen neuen Testfall in
  Abschnitt 6 abgesichert.
- **ODT-Import von `covered-table-cell` (Verdachtsmoment 8):** Bestätigt bereits
  korrekt in Abschnitt 1 dieser Datei — funktioniert nachweislich mit den realen
  Fixtures `tableCoveredContent.odt` und `table-column-delete-with-merge(-2-times).odt`
  (siehe Abschnitt 2.2). Kein Reader-Fix nötig, nur dedizierte Tests (Abschnitt 6.5).
- **Ein-Transaktions-Undo (3.12):** `mergeCells` baut nachweislich eine einzige
  Transaktion auf (`const tr = state.tr` am Anfang der Funktion, ein `dispatch(tr)` am
  Ende, `dist/index.js:1554–1584`) — bestätigt bereits im Quellcode, wird über
  Testfall 12/13 zusätzlich am laufenden Editor abgesichert.

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/editor/commands.ts` (geändert)

Neue Imports (`TextSelection` als Wert, nicht nur Typ; `mergeCells`/`CellSelection`
zusätzlich zum bereits vorhandenen `isInTable`):

```ts
import type { Command, EditorState } from 'prosemirror-state'
import { TextSelection } from 'prosemirror-state'
import { wrapInList, liftListItem } from 'prosemirror-schema-list'
import { isInTable, mergeCells, CellSelection } from 'prosemirror-tables'
import { wordSchema } from '../schema'
```

Neuer Befehl, direkt hinter `insertTable` (Zeile 76–86) einzufügen:

```ts
/**
 * Führt die markierten Zellen (`CellSelection` mit ≥ 2 Zellen, rechteckig, siehe
 * `cellsOverlapRectangle`-Guard in `mergeCells`) zu einer Zelle zusammen. Wrappt
 * `mergeCells` aus `prosemirror-tables`, weil die Bibliothek nach dem Merge eine
 * `CellSelection` auf der neuen Zelle hinterlässt (`dist/index.js:1583`) —
 * unkorrigiert würde das nächste getippte Zeichen den kompletten frisch
 * zusammengeführten Inhalt ersetzen (`CellSelection.replaceWith`, `dist/index.js:
 * 589–591`; empirisch reproduziert und mit exakt diesem Fix verifiziert, siehe
 * `specs/zellen-verbinden-code.md` Abschnitt 2.4). Ohne Dispatch (reine Prüfung, z. B.
 * für den Aktivierungszustand des Toolbar-Buttons) verhält sich dieser Befehl wie
 * `mergeCells` selbst: liefert `true`/`false`, ohne den Zustand zu verändern.
 */
export function mergeSelectedCells(): Command {
  return (state, dispatch) => {
    return mergeCells(
      state,
      dispatch &&
        ((tr) => {
          const sel = tr.selection
          if (sel instanceof CellSelection) {
            const cellPos = sel.$anchorCell.pos
            const cellNode = tr.doc.nodeAt(cellPos)
            if (cellNode) {
              const endPos = cellPos + cellNode.nodeSize - 1
              tr.setSelection(TextSelection.near(tr.doc.resolve(endPos), -1))
            }
          }
          dispatch(tr)
        }),
    )
  }
}
```

`mergeSelectedCells()(view.state)` (ohne zweites Argument) dient in `Toolbar.tsx`
sowohl als Ausführung (`run(view, mergeSelectedCells())`) als auch als reine
Aktivierungsprüfung — ein in diesem Projekt neues, aber idiomatisches
ProseMirror-Muster (Befehl mit und ohne `dispatch` aufrufbar), bislang ungenutzt, da
kein bestehender Button einen `disabled`-Zustand kennt (siehe Abschnitt 4.2).

`splitCell` (für das separate, hier nicht in Scope befindliche Feature
„Zellen teilen", `zellen-teilen-req.md`) bleibt bewusst **unverdrahtet** — die
Anforderung grenzt das in Menüpunkt 6 explizit als eigenständiges Backlog-Item ab.

### 4.2 `src/formats/shared/editor/Toolbar.tsx` (geändert)

Neuer Import: `mergeSelectedCells` aus `./commands`.

Neue Komponente, direkt vor `Toolbar`:

```tsx
function MergeCellsButton({ view }: { view: EditorView }) {
  const canMerge = mergeSelectedCells()(view.state)
  return (
    <button
      type="button"
      title="Zellen verbinden"
      aria-label="Zellen verbinden"
      disabled={!canMerge}
      onMouseDown={(e) => {
        e.preventDefault()
        run(view, mergeSelectedCells())
      }}
      className={`px-2 py-1 rounded text-sm border border-transparent text-neutral-700 dark:text-neutral-300 ${
        canMerge ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800' : 'opacity-40 cursor-not-allowed'
      }`}
    >
      ⊞ Verbinden
    </button>
  )
}
```

Einbindung direkt nach dem bestehenden „⊞ Tabelle"-Button (Zeile 228–239), als neue
Tabellen-Kontextgruppe im Sinne von Menüpunkt 1:

```tsx
<button /* ⊞ Tabelle, unverändert */>⊞ Tabelle</button>
<MergeCellsButton view={view} />
```

Damit sind Menüpunkt 1 (Button existiert, verdrahtet über `mergeCells`), Menüpunkt 2
(deaktiviert bei keiner Tabelle/Einzelzelle/nicht-rechteckiger Auswahl — alle drei
Fälle werden durch den einen `mergeSelectedCells()(view.state)`-Aufruf abgedeckt, da
`mergeCells` selbst alle drei Bedingungen prüft, siehe Abschnitt 3) und Menüpunkt 5
(`title` **und** `aria-label`, analog zu `MarkButton` Zeile 47, nicht zu `AlignButton`)
erfüllt. Ein deaktivierter `<button>` löst nativ weder `click` noch `mousedown` aus —
das erfüllt das „kein stiller Fehlschlag"-Prinzip aus Menüpunkt 2/Grenzfall 3.6
proaktiv (Verhindern statt Fehlermeldung nachträglich anzeigen); die App besitzt aktuell
ohnehin **keine** Toast-/Fehlermeldungs-Infrastruktur (`grep -rln "toast\|Toast\|alert(\|notification" src/`
→ 0 Treffer), sodass „deaktiviert" hier die einzige Option ohne zusätzlichen
Infrastruktur-Aufbau ist.

### 4.3 `src/formats/shared/editor/WordEditor.tsx` (geändert)

Import erweitern (Zeile 8):

```ts
import { tableEditing, columnResizing, goToNextCell } from 'prosemirror-tables'
```

Keymap (Zeile 71–79) um Tab-Navigation ergänzen (behebt Fehler 5, Abschnitt 2.6):

```ts
keymap({
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
  Enter: splitListItem(wordSchema.nodes.list_item),
  'Mod-b': toggleMark(wordSchema.marks.strong),
  'Mod-i': toggleMark(wordSchema.marks.em),
  'Mod-u': toggleMark(wordSchema.marks.underline),
  Tab: goToNextCell(1),
  'Shift-Tab': goToNextCell(-1),
}),
```

Kein Eingriff in `reconcileSelectionOnClick` (Zeile 42–53) nötig: Sobald der Fix aus
Abschnitt 4.1 greift, endet ein Merge bereits mit einem echten, kollabierten
Text-Cursor statt einer `CellSelection` — der bestehende Klick-Reconciliation-Mechanismus
(geschrieben für eine andere, aber verwandte Fehlerklasse, stale `AllSelection`) bleibt
unverändert korrekt anwendbar und muss nicht erweitert werden. Der in Testfall 18/
Abschnitt 3.13 geforderte Regressionstest wird trotzdem als **expliziter, neuer**
Playwright-Test angelegt (Abschnitt 6.1), nicht nur implizit über den bestehenden
`selection-regression.spec.ts` mitgetestet.

### 4.4 `src/index.css` (geändert)

Ergänzung nach der bestehenden `.ProseMirror th`-Regel (Zeile 58–61), bewusst
**nicht** als kompletter Import des Vendor-Stylesheets (`prosemirror-tables/style/
tables.css` setzt zusätzlich `table-layout: fixed` und würde das bestehende, eigene
Spaltenbreiten-Verhalten der App unerwartet verändern) — stattdessen gezielt nur die
für Testfall 1/Menüpunkt 3 fehlenden Regeln, an die bestehende Formatierung angepasst:

```css
.ProseMirror .tableWrapper {
  overflow-x: auto;
}

.ProseMirror td,
.ProseMirror th {
  position: relative; /* Voraussetzung für das .selectedCell:after-Overlay unten */
}

/* Mehrzellen-Auswahl sichtbar machen (behebt Verdachtsmoment 3/Menüpunkt 3).
   Die Decoration-Klasse `selectedCell` wird bereits von tableEditing()'s
   drawCellSelection gesetzt (siehe Abschnitt 2.7) — hier fehlte bislang nur das
   CSS-Gegenstück. */
.ProseMirror .selectedCell:after {
  content: '';
  position: absolute;
  z-index: 2;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(200, 200, 255, 0.4);
  pointer-events: none;
}
```

Kein Dark-Mode-Gegenstück nötig: Die editierbare Seitenfläche ist bereits bewusst
durchgehend hell gehalten (`.ProseMirror { color: #111827 }`, Zeile 26,
`pageBackgroundStyle()` in `pageLayout.ts:22–29` mit fest `white` als Hintergrund,
unabhängig vom App-Theme) — die Überlagerungsfarbe ist für diesen immer-hellen
Hintergrund konzipiert.

**Bewusst zurückgestellt (angrenzend, aber nicht Teil dieses Features):**
`.column-resize-handle`/`.resize-cursor` aus demselben Vendor-Stylesheet fehlen
ebenfalls (die bereits aktive `columnResizing()` hat dadurch aktuell auch keine
sichtbare Ziehgriff-Rückmeldung) — das betrifft Spaltenbreiten-Anpassung, ein
eigenständiges, hier nicht angefordertes Verhalten, wird deshalb **nicht**
mit-behoben, um den Scope nicht zu überschreiten.

### 4.5 `src/formats/docx/reader.ts` (geändert)

Fix aus Abschnitt 2.1 (`bumpedThisRow`-Set in `parseTable`, Zeile 218–253).

### 4.6 `src/formats/docx/writer.ts` (empfohlen, optional — siehe Abschnitt 2.1)

Kompaktere Fortsetzungszeilen-Kodierung für rechteckige Merges: Statt pro betroffener
Gitterspalte eine eigene 1-Spalten-`<w:tc>`-Fortsetzungszelle zu schreiben (Zeile
141–146), eine **kombinierte** Zelle mit passendem `gridSpan` schreiben, sobald mehrere
aufeinanderfolgende `pending`-Spalten zum selben Merge gehören. Nicht zwingend für
Korrektheit (der Reader-Fix in Abschnitt 4.5 macht das bestehende Schreiber-Verhalten
bereits korrekt lesbar), aber empfohlen für kompakteres, konventionelleres OOXML.
**Offener Punkt für die spätere Verifikation:** Mit `bug57031.docx` lässt sich dieses
konkrete Detail nicht gegenprüfen (keine kombinierten Merges in dieser Datei enthalten,
siehe Abschnitt 2.5) — bei Gelegenheit mit einer in echtem Word erzeugten
rechteckig gemergten Tabelle abgleichen (Rundreise-Anforderung Abschnitt 5 Punkt 8).

### 4.7 `src/formats/odt/writer.ts` (geändert)

Fix aus Abschnitt 2.2/2.3 (`colCount`-Berechnung + `pending`-basierte
`covered-table-cell`-Erzeugung in `case 'table'`, Zeile 86–111).

### 4.8 `src/formats/odt/reader.ts` (unverändert)

Kein Code-Fix nötig (siehe Abschnitt 1/3) — nur neue, dedizierte Tests gegen reale
Fixtures (Abschnitt 6.5), da der bestehende Mechanismus bereits korrekt ist, aber
bislang durch keinen Test mit einer echten Datei belegt war (Verdachtsmoment 8).

### 4.9 `src/formats/shared/schema.ts` (unverändert)

`tableNodes()` liefert `colspan`/`rowspan`/`colwidth` bereits als Standardattribute
(Zeile 106) — kein Schema-Fix für dieses Feature nötig. `cellAttributes: {}` bleibt wie
in Grenzfall 5 der Anforderung dokumentiert bewusst unverändert (Zellhintergrund ist
Gegenstand des separaten Backlog-Items `tabelle-eigenschaften`).

---

## 5. Offene Entscheidungen (explizit getroffen, nicht stillschweigend offengelassen)

### 5.1 Inhaltszusammenführungs-Verhalten (3.4/Verdachtsmoment 6)

**Entscheidung:** Bibliotheks-Default übernehmen (alle nicht-leeren Zellinhalte in
Lesereihenfolge als zusätzliche Absätze der Ankerzelle anhängen, Zeichenformatierung
pro Absatz erhalten). Begründung: entspricht der etablierten Word/LibreOffice-Konvention,
mit der Nutzerinnen bereits vertraut sind; „nur Anker-Inhalt behalten" würde beim
Verbinden befüllter Zellen zu unerwartetem, stillem Datenverlust führen. Keine
Code-Änderung — nur diese Dokumentation und ein expliziter Test (Abschnitt 6.2).

### 5.2 Icon vs. Unicode-Symbol (Menüpunkt 4)

**Entscheidung:** Unicode-Text-Button „⊞ Verbinden" statt eingebettetem SVG-Icon, **im
Widerspruch zur wörtlichen Formulierung** der Anforderung („bevorzugt eingebettetes
SVG-Icon"), aber in Übereinstimmung mit deren eigener Zusatzbedingung „konsistent mit
den übrigen Toolbar-Icons dieser App": **Alle** bestehenden Toolbar-Schaltflächen
(`F`/`K`/`U`/`S`, `⇤↔⇥≡`, `• Liste`/`1. Liste`/`⇧ Liste`, `⊞ Tabelle`, `🖼 Bild`)
verwenden ausnahmslos Unicode-Zeichen/Text, kein einziges SVG. Ein neu eingeführtes
SVG-Icon wäre in diesem Toolbar tatsächlich das **inkonsistente** Element. `⊞` ist
bereits als Tabellen-Symbol im Einsatz (rendert also nachweislich korrekt auf allen
Zielsystemen dieser App, Testfall 32 damit für den wiederverwendeten Teil des Symbols
bereits abgedeckt) und wird für die neue Tabellen-Kontextgruppe wiederverwendet statt
ein neues, ungetestetes Symbol einzuführen.

### 5.3 Tastenkürzel (Menüpunkt 7)

**Entscheidung:** Kein globales Tastenkürzel für V1. Begründung: Weder Word noch
LibreOffice definieren eines (von der Anforderung selbst bestätigt), ein neu
erfundenes Kürzel hätte keinen Wiedererkennungswert und würde das Risiko einer
Kollision mit Browser-/OS-Tastenkombinationen oder zukünftigen Funktionen eingehen.
Der Toolbar-Button gilt als ausreichender Zugriffsweg für V1 — dokumentiert, nicht
stillschweigend offengelassen.

### 5.4 Kontextmenü (Menüpunkt 8)

**Entscheidung:** Kein Rechtsklick-Kontextmenü für V1. Die App besitzt aktuell
**keinerlei** Kontextmenü-Infrastruktur (weder für Tabellen noch für andere Elemente) —
dessen Einführung wäre eine eigenständige, deutlich größere Änderung mit Auswirkung auf
den gesamten Editor, nicht nur auf dieses Feature. Der Toolbar-Button ist der alleinige
Zugriffsweg für V1, wie von der Anforderung als zulässige Option vorgesehen.

### 5.5 Grenzfall 13 (Kopfzeile `table_header` mit Datenzelle `table_cell` verbinden)

**Befund:** Weder `docx/reader.ts` noch `odt/reader.ts` erzeugen jemals einen
`table_header`-Knoten (`grep -rn "table_header" src/ tests/` → 0 Treffer im gesamten
Projekt). OOXML kennt keine Zell-Ebene für Kopfzeilen-Semantik (nur zeilenbezogenes
`<w:trPr><w:tblHeader/>` für wiederholende Kopfzeilen bei Seitenumbrüchen), ODF ebenso
nur zeilenbezogen (`<table:table-header-rows>`). Ein echter Import-Test mit realer
Kopfzeilen-Datei (wie in Testfall 28 gefordert) ist mit dem aktuellen Reader-Stand
**nicht durchführbar**, unabhängig von diesem Feature.

**Entscheidung:** Reader-seitige Kopfzeilenerkennung ist **nicht** Teil dieses Plans
(separater Scope, würde Änderungen an `parseTable`/`elementToBlocks` unabhängig vom
Merge-Feature erfordern). Stattdessen: Ein handgebauter Unit-Test (siehe Abschnitt
6.2), der einen `table_header`- und einen `table_cell`-Knoten direkt im JSON aufbaut
und über `mergeSelectedCells` zusammenführt, um zu bestätigen, dass der Node-Typ der
Ankerzelle erhalten bleibt (`mergeCells`s `tr.setNodeMarkup(mergedPos, null, {...})`
ohne Typwechsel, `dist/index.js:1574` — bereits durch die Bibliothek garantiert). Der
fehlende Reader-Support wird als bewusst zurückgestellter, dokumentierter
Folge-Punkt vermerkt, nicht stillschweigend übergangen.

---

## 6. Testplan

### 6.1 Neue Datei: `tests/e2e/table-merge.spec.ts`

Playwright, echte Maus-/Tastatur-Interaktion (kein programmatisches Setzen der
Selektion), analog zum Muster in `tests/e2e/selection-regression.spec.ts`:

1. Tabelle einfügen (2×2) → per echtem `page.mouse.down()/move()/up()`-Drag über zwei
   nebeneinanderliegende Zellen ziehen → `.ProseMirror .selectedCell` mit `count: 2`
   sichtbar (Testfall 1, deckt Abschnitt 2.7 ab — muss **vor** dem CSS-Fix
   nachweislich fehlschlagen, da `getComputedStyle`/visuelle Erkennung sonst nichts
   zum Prüfen hat; hier genügt der Decoration-Klassen-Check unabhängig vom CSS für die
   Existenz der Selektion, ein zusätzlicher `toHaveCSS`-Check auf den Overlay-Hintergrund
   sichert das CSS selbst ab).
2. „Zellen verbinden" klicken → resultierende Zelle hat `colspan="2"` (per
   `page.locator('.ProseMirror td').first().getAttribute('colspan')`), Text sichtbar
   über volle Breite (Testfall 2).
3. Vertikaler Merge über zwei Zeilen (Drag von Zeile 1 zu Zeile 2 derselben Spalte) →
   `rowspan="2"` (Testfall 3).
4. 2×2-, 2×3-, 3×3-Rechteck-Merge (neue, größere Tabelle einfügen) → `colspan`
   **und** `rowspan` gleichzeitig gesetzt (Testfall 4/5, Regressionstest für Fehler 1
   auf E2E-Ebene).
5. Zellen mit gemischtem Inhalt (leer, ein Absatz, mehrere Absätze, fett/kursiv/farbig)
   verbinden → alle nicht-leeren Inhalte in Lesereihenfolge mit erhaltener
   Zeichenformatierung sichtbar (Testfall 6).
6. **Kritischster Test (Testfall 7, Regressionstest für Fehler 4):** Direkt nach dem
   Merge, ohne weiteren Klick, `X` tippen → ursprünglicher zusammengeführter Inhalt
   bleibt vollständig erhalten, `X` erscheint angehängt (nicht ersetzend).
7. Nicht-rechteckige Auswahl (z. B. eine teilweise verbundene Zelle nur anschneiden) →
   Button bleibt deaktiviert, kein Klick möglich (Testfall 8).
8. Nur eine Zelle markiert → Button deaktiviert (Testfall 9).
9. Bereits verbundene 2×1-Zelle + Nachbarzelle neu markieren, erneut verbinden →
   Ergebnis 2×2, keine Exception (Testfall 10).
10. Nach dem Merge Tab drücken → Fokus springt zur nächsten echten Zelle, nicht in
    eine verdeckte Position (Testfall 11, Regressionstest für Fehler 5/Abschnitt 2.6 —
    muss **vor** dem Fix nachweislich fehlschlagen, da Tab den Editor komplett
    verlässt).
11. Strg+Z direkt nach Merge → ein Schritt stellt alle Original-Einzelzellen mit
    Originalinhalt wieder her (Testfall 12); Strg+Y danach → Merge wiederhergestellt
    (Testfall 13).
12. Rand der Tabelle (erste/letzte Zeile/Spalte) verbinden → identisches Verhalten,
    weiterhin editierbar (Testfall 14).
13. Gesamte Tabelle zu einer Zelle verbinden → bleibt editierbar, danach exportierbar
    (Testfall 15).
14. Verschachtelte Tabelle (Tabelle in Tabellenzelle einfügen) verbinden → kein
    Absturz, Inhalt lesbar (Testfall 16).
15. `BigTable.odt` importieren, gesamte Fläche verbinden → UI bleibt reaktionsfähig,
    definierte Zeitschranke (Testfall 17).
16. **Regressionstest gemäß Abschnitt 3.13/Testfall 18:** Zellen verbinden → per Klick
    außerhalb der Tabelle neu positionieren → Enter → weitertippen → kein
    Dokumentinhalt geht verloren (analog zu `selection-regression.spec.ts`s
    Tabellen-Testfall, aber mit vorherigem Merge als zusätzlichem Auslöser).
17. DOCX-Rundreise: neue Tabelle, horizontal **und** vertikal verbinden (zwei separate
    Tabellen oder eine kombinierte), exportieren, reimportieren → Struktur/Inhalt
    erhalten (Testfall 19, Regressionstest für Fehler 1).
18. ODT-Rundreise ebenso, zusätzlich exportierte Datei per JSZip auf Vorhandensein von
    `<table:covered-table-cell>` an den korrekten Positionen prüfen (Testfall 20,
    zentraler Regressionstest für Fehler 2/3).
19. Cross-Format-Rundreisen DOCX→ODT und ODT→DOCX (Testfall 21/22).
20. Doppelte Cross-Format-Rundreise DOCX→ODT→DOCX mit kombiniertem Merge + Fett/Farbe/
    mehreren Absätzen (Testfall 23).
21. Upload `bug57031.docx` (Testfall 24, siehe Abschnitt 2.5) → unverändert
    exportieren → reimportieren → Zellstruktur identisch.
22. Upload `mergedCells.odt` (Testfall 25) → Export → Reimport → identisch.
23. Upload `tableCoveredContent.odt` (Testfall 26) → keine Spaltenverschiebung.
24. Upload `table-column-delete-with-merge.odt` und `-2-times.odt` (Testfall 27) → kein
    Absturz, unverändert exportieren/reimportieren → kein zusätzlicher Verlust.
25. Icon-Erkennbarkeitstest (Testfall 32): `⊞ Verbinden` bleibt von `⊞ Tabelle`
    unterscheidbar (unterschiedlicher Textzusatz reicht, da beide denselben
    Basis-Glyphen `⊞` teilen — visueller Screenshot-Vergleich als Beleg).
26. `bug65649.docx` (bereits `SKIP_SLOW_UNDER_JSDOM`, siehe Abschnitt 2.5) als
    Performance-Stresstest (Testfall 34, analog `large-document-import.spec.ts`).

### 6.2 Neue Datei: `src/formats/shared/editor/__tests__/table-merge-commands.test.ts`

Unit-Tests (Vitest, echte `EditorState` wie in den Reproduktionen dieses Plans, kein
Mock von `prosemirror-tables`):

- `mergeSelectedCells()`: 2 horizontale Zellen → `colspan: 2`; 2 vertikale Zellen (über
  `table_row`-Grenzen) → `rowspan: 2`; 2×2-Rechteck → beide Attribute; Einzelzelle
  markiert → Befehl liefert `false`, kein `dispatch`; nicht-rechteckige/überlappende
  Auswahl → `false`.
- **Regressionstest für Fehler 4 (Abschnitt 2.4):** Merge zweier textgefüllter Zellen,
  danach `state.tr.insertText('X')` auf dem resultierenden State → Dokumenttext enthält
  weiterhin beide Originalinhalte **und** `X` (muss vor dem Fix nachweislich mit nur
  `"X"` als Ergebnis fehlschlagen).
- Resultierende Selektion nach Merge ist eine `TextSelection`, keine `CellSelection`
  mehr (direkter Test des in Abschnitt 4.1 gezeigten Fixes).
- Kopfzeilen-Grenzfall (Abschnitt 5.5): handgebauter `table_header`+`table_cell`-Node,
  Merge → resultierender Node-Typ bleibt `table_header` (Anker war die
  Kopfzeilenzelle) bzw. `table_cell` (Anker war die Datenzelle) — beide Richtungen
  testen, da die Bibliothek den Typ der **Anker**-Zelle übernimmt, nicht pauschal
  einen der beiden Typen bevorzugt.
- Bereits verbundene Zelle + Nachbarzelle erneut verbinden (Testfall 10) → größeres
  Rechteck, keine Exception, `colCount` der Tabelle bleibt über den Zyklus konsistent.

### 6.3 `src/formats/docx/__tests__/roundtrip.test.ts` (ergänzt)

- Neuer Fall: `colspan: 2, rowspan: 2` auf **einer** Zelle (2×2-Rechteck) →
  **Regressionstest für Fehler 1**, muss vor dem Fix in Abschnitt 4.5 nachweislich
  `rowspan: 3` liefern, danach `rowspan: 2`.
- Neuer Fall: `colspan: 3, rowspan: 3` (3×3), `colspan: 2, rowspan: 3` (2×3) — deckt
  Testfall 5 auch auf Unit-Ebene ab.
- Neuer Fall: Kopfzeilen-Grenzfall auf DOCX-Ebene, falls im Zuge von Abschnitt 5.5
  Reader-Support ergänzt wird (sonst als expliziter, dokumentierter Nicht-Test
  vermerkt).

### 6.4 `src/formats/odt/__tests__/roundtrip.test.ts` (ergänzt)

- Neuer Fall: 2×2-Rechteck-Merge → **zusätzlich zur Attribut-Prüfung nach Reimport**
  auch die rohe `content.xml` per JSZip auf die exakte, in Abschnitt 2.2 belegte
  `<table:covered-table-cell/>`-Struktur prüfen (Regressionstest für Fehler 2).
- Neuer Fall: reine `colspan`-Zelle in der **ersten** Zeile → Anzahl der
  `<table:table-column>`-Elemente korrekt (Regressionstest für Fehler 3, Testfall 2).
- Neuer Fall: 2×3-/3×3-Rechteck.

### 6.5 Neue Datei: `src/formats/docx/__tests__/merge-fixtures.test.ts`

Dediziert (nicht in `external-fixtures.test.ts` gemischt, das bewusst nur
„importiert ohne Absturz" prüft):

- `bug57031.docx`: mindestens eine Zelle mit `attrs.colspan > 1`, mindestens eine mit
  `attrs.rowspan > 1` tatsächlich im importierten JSON vorhanden (nicht nur
  „importiert ohne Fehler") — Beleg für Testfall 24.
- Unverändert reexportieren → reimportieren → identische `colspan`/`rowspan`-Werte an
  denselben Textpositionen (Rundreise-Anforderung 5.1).

### 6.6 Neue Datei: `src/formats/odt/__tests__/merge-fixtures.test.ts`

- `mergedCells.odt`: importierte Zelle mit `colspan: 2` vorhanden (Testfall 25).
- `tableCoveredContent.odt`: importierte Struktur enthält die erwartete Anzahl Zellen
  je Zeile trotz mehrfacher `covered-table-cell`-Positionen, keine Spaltenverschiebung
  (Testfall 26, Regressionstest für Verdachtsmoment 8).
- `table-column-delete-with-merge.odt`/`-2-times.odt`: Import ohne Absturz, verschachtelte
  Tabelle innerhalb der gemergten Zelle korrekt gelesen (Grenzfall 6), unverändert
  reexportieren/reimportieren → kein zusätzlicher Verlust (Testfall 27); reexportierte
  Datei enthält weiterhin `<table:covered-table-cell>` an den korrekten Positionen
  (Regressionstest für Fehler 2 gegen eine **fremd-erzeugte**, nicht nur eine
  eigene Test-Struktur).

### 6.7 Zuordnung zu den Abnahmekriterien (Abschnitt 8 der Anforderung)

| DoD-Punkt | Abdeckung durch diesen Plan |
|---|---|
| 1. Klickbarer Button inkl. sichtbarer Mehrzellen-Selektion, verdrahtet über `mergeCells` | Abschnitt 4.1–4.4 |
| 2. Alle Testfälle aus Abschnitt 7 ausgeführt/dokumentiert | Abschnitt 6.1–6.6 |
| 3. Jedes Verdachtsmoment aus Abschnitt 6 eingestuft | 1→„fehlt, jetzt behoben" (4.1–4.4); 2→„bestätigt, kein Fix nötig" (Abschnitt 1); 3→„bestätigt, nur CSS fehlte" (2.7/4.4); 4→„bestätigt, kein Bibliotheks-Fix nötig, UI-seitig gelöst" (3/4.2); 5→„bestätigt als echter Bug, behoben" (2.4/4.1); 6→„bestätigt, als Produktverhalten übernommen" (5.1); 7→„bestätigt und **erweitert** (auch `colspan` in derselben Zeile), behoben" (2.2/4.7); 8→„bestätigt bereits korrekt, nur Tests ergänzt" (Abschnitt 1/6.6); 9→„bestätigt als kritischerer Fehler als vermutet (Fehler 1), behoben" (2.1/4.5); 10→„E2E neu angelegt" (6.1); 11→„Backlog-Einschätzung bestätigt, Reader/Writer-Lücken jetzt konkret benannt" (Abschnitt 0/2) |
| 4. Verdachtsmoment 5 konkret getestet, Korrektur dokumentiert | Abschnitt 2.4/4.1/6.2 |
| 5. E2E-Test inkl. Selection-Sync-Regressionstest verankert | Abschnitt 6.1 Punkte 6, 16 |
| 6. Rundreise DOCX+ODT, Cross-Format, je eine reale Fixture, beide Spalte-löschen-Fixtures | Abschnitt 6.1 Punkte 17–24, 6.3–6.6 |
| 7. Tastenkürzel/Kontextmenü entschieden | Abschnitt 5.3/5.4 |
| 8. Inhaltszusammenführungs-Verhalten bewusst bestätigt | Abschnitt 5.1 |
| 9. Wechselwirkung mit „Zeile/Spalte löschen" für Fixture-Fall funktioniert | Abschnitt 6.6 (Import + unveränderte Rundreise der beiden `table-column-delete-with-merge*.odt`-Fixtures; die Lösch-Funktion selbst ist separates Backlog-Item, hier nur die Merge-Rundreise nach bereits-vorhandenem Löschen im Ausgangsmaterial geprüft) |

---

## 7. Reihenfolge der Umsetzung (Vorschlag)

1. **`docx/reader.ts`** (Abschnitt 4.5) und **`odt/writer.ts`** (Abschnitt 4.7) zuerst —
   behebt die beiden kritischen, bereits ohne jede UI reproduzierbaren Datenfehler
   (Fehler 1–3), unabhängig von allem Weiteren testbar über die bestehenden
   Roundtrip-Suiten.
2. `docx/__tests__/roundtrip.test.ts`/`odt/__tests__/roundtrip.test.ts` (Abschnitt
   6.3/6.4) unmittelbar danach, um Fehler 1–3 dauerhaft als Regressionstest
   abzusichern.
3. **`commands.ts`** (Abschnitt 4.1) — führt `mergeSelectedCells` inkl. Fix für
   Fehler 4 ein; `table-merge-commands.test.ts` (Abschnitt 6.2) direkt im Anschluss.
4. **`Toolbar.tsx`**, **`WordEditor.tsx`**, **`index.css`** (Abschnitt 4.2–4.4) —
   macht das Feature erstmals bedienbar (Button, Tab-Navigation, sichtbare
   Selektion).
5. **`tests/e2e/table-merge.spec.ts`** (Abschnitt 6.1) — Ende-zu-Ende-Absicherung auf
   Browser-Ebene, inkl. des kritischen Testfall 7/Fehler-4-Regressionstests.
6. `merge-fixtures.test.ts` (DOCX und ODT, Abschnitt 6.5/6.6) — reale Fixtures,
   setzt 1–2 vollständig voraus.
7. Abschließend: `zellen-verbinden-req.md` um die in Abschnitt 5 dieses Plans
   getroffenen Entscheidungen ergänzen (Tastenkürzel, Kontextmenü, Icon,
   Inhaltszusammenführung, Kopfzeilen-Grenzfall) — dieser Plan ändert die
   Anforderungsdatei selbst nicht, siehe `ausrichtung-zentriert-code.md`-Präzedenzfall.
