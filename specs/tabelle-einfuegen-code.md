# Umsetzungsplan (Code-Ebene): Feature „Tabelle einfügen“

Bezug: `specs/tabelle-einfuegen-req.md` (Anforderung), `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6/17,
`FEATURE-BACKLOG.md` Zeile 181. Dieser Plan wurde gegen den tatsächlichen Code-Stand im Repo
(Stand 2026-07-04) verifiziert — nicht nur gegen die Beschreibung in der Anforderung. Abweichungen
sind unten explizit markiert.

Rollenteilung: Dieses Dokument ist der Bauplan des „Entwicklers“. Es ändert selbst noch keinen
Code. Es beantwortet außerdem die in der Anforderung offen gelassenen Produktfragen (Abschnitt 3,
Grenzfälle 3.7/3.8 u. a.), damit die Umsetzung nicht an ungeklärten Fragen hängen bleibt.

---

## 0. Verifikation des in der Anforderung referenzierten Ist-Stands

Alle in `tabelle-einfuegen-req.md` (Zeilen 37–52) zitierten Fundstellen wurden erneut gegen den
Code gelesen. Ergebnis: **alle Angaben treffen zu**, mit folgenden Präzisierungen, die für die
Umsetzung relevant sind:

| Punkt aus der Anforderung | Präzisierung nach eigener Prüfung |
|---|---|
| „analog zum bestehenden Muster in `PrivacyModal.tsx` (Fokus-Falle, Schließen-Mechanismus)“ (Zeile 81) | **Ungenau.** `src/app/PrivacyModal.tsx` hat *keinen* Fokus-Trap und *keine* Escape-/Klick-außerhalb-Behandlung — es hat nur einen einzigen Bestätigen-Button ohne jede Tastatur-Sonderbehandlung. Es ist lediglich das einzige vorhandene „Overlay mit `fixed inset-0 z-50 bg-black/50`“-Strukturmuster. Fokus-Trap, Escape und Klick-außerhalb müssen für den neuen Dialog **komplett neu** gebaut werden, nicht aus `PrivacyModal.tsx` übernommen werden. |
| `WordEditor.tsx:81-82`, „kein eigener `keymap`-Eintrag für Tab“ | Bestätigt. Zusätzlich verifiziert: `goToNextCell(direction)` aus `prosemirror-tables@1.8.5` (`node_modules/prosemirror-tables/dist/index.cjs`) gibt `false` zurück, wenn es keine nächste Zelle gibt — es erzeugt **selbst keine neue Zeile**. Die Aussage in `FEATURE-SPEC-DOCX-ODT.md` Zeile 153 („Tab in letzter Zelle fügt neue Zeile hinzu“) ist folglich **nicht** durch bloßes Binden von `goToNextCell` erledigt; dafür ist zusätzliche eigene Logik nötig (siehe Abschnitt 3.1 unten). Das deckt sich mit der Einschätzung der Anforderung (Zeile 67), bestätigt sie aber jetzt als geprüfte Tatsache statt als Vermutung. |
| `docx/writer.ts:131`, hartkodiert `w:w="2000"` je Spalte | Bestätigt, und **quantifiziert**: Bei z. B. 20 Spalten ergibt das `20 × 2000 = 40000` dxa ≈ 27,8 Zoll Tabellenbreite auf einer A4-Seite mit nutzbarer Breite von ca. `PAGE_CONTENT_WIDTH_PX ≈ 606px` (`pageLayout.ts:13`) ≈ `9090` dxa. Das ist kein rein kosmetischer Mangel, sondern ein **reales Overflow-Problem** bei Tabellen mit mehr als ca. 4–5 Spalten, direkt relevant für Grenzfall 3.14. |
| `odt/writer.ts:88`, Spaltenzahl über `rows[0]?.content?.length` | Bestätigt. Zusätzlich: `<table:table-column/>` in der aktuellen ODT-Ausgabe trägt **keine** Breitenangabe, d. h. der ODT-Export hat (anders als DOCX) **kein** Overflow-Problem, weil ODF-Konsumenten (LibreOffice) Spalten ohne Breitenangabe automatisch gleichmäßig verteilen. Die Spaltenzahl-Unterschätzung bei `colspan` in Zeile 1 bleibt aber ein reiner Datenfehler (siehe Abschnitt 5.1). |
| `commands.ts:76-86`, `insertTable(rows, cols)` „bereits vollständig parametrisiert“ | Bestätigt. Ergänzung: Die Funktion hat **keine Obergrenze und keine Tiefenprüfung** — weder für Zeilen/Spalten-Anzahl noch für Verschachtelungstiefe. Das ist für Grenzfälle 3.3/3.7 relevant (siehe Abschnitt 1 und 3.1). |
| `tests/e2e/selection-regression.spec.ts:34-50` | Bestätigt als einziger E2E-Test, der den Button „Tabelle einfügen“ tatsächlich klickt (Zeile 37: `page.getByRole('button', { name: 'Tabelle einfügen' }).click()`). **Kritisch für die Umsetzung:** Da dieser Klick nach der Umsetzung nicht mehr sofort eine Tabelle einfügt, sondern den neuen Dialog öffnet, **bricht dieser Test ohne Anpassung** (Zeile 39 erwartet direkt danach `.ProseMirror td`-Elemente). Siehe Abschnitt 6.2, Pflichtänderung Nr. 1. |
| `prosemirror-tables` Version | `1.8.5` (aus `node_modules/prosemirror-tables/package.json`). Exporte geprüft: `goToNextCell`, `addRowAfter`, `selectedRect`, `isInTable`, `selectionCell`, `TableMap` u. a. sind vorhanden und für die Umsetzung ausreichend — keine zusätzliche Abhängigkeit nötig. |

---

## 1. Architektur-/Produktentscheidungen (beantworten die offenen Fragen aus Abschnitt 2.8/3 der Anforderung)

Diese Entscheidungen sind Voraussetzung für eine widerspruchsfreie Umsetzung. Sie sollten nach
Umsetzung als Ergebnis in `tabelle-einfuegen-req.md` (Grenzfall 3.7 u. a.) nachgetragen werden,
wie dort in Zeile 192–193 gefordert.

### 1.1 Grenzfall 3.7 — Tabelle einfügen, während Cursor in einer bestehenden Tabellenzelle steht
**Entscheidung: Erlaubt (verschachtelte Tabelle entsteht), analog zu Word/LibreOffice.**
Begründung: Das Schema erlaubt es bereits (`tableGroup: 'block'`, `cellContent: 'block+'`,
`schema.ts:106`), der Import-Pfad hat mit `MAX_TABLE_NESTING_DEPTH = 25`
(`docx/reader.ts:208`) bereits eine Absturz-Schutzschicht für importierte verschachtelte
Tabellen, und ein Verbot wäre inkonsistent mit dem, was Nutzer:innen aus Word/LibreOffice
erwarten. Um das „kein Absturz“-Kriterium aus Grenzfall 7 auch für **aktives** Einfügen (nicht
nur Import) sicherzustellen, bekommt `insertTable()` einen Tiefen-Guard (siehe Abschnitt 3.1),
der eine neue Tabelle ablehnt (Command gibt `false` zurück), sobald die Verschachtelungstiefe
`MAX_TABLE_NESTING_DEPTH` erreicht ist. Der Dialog zeigt in diesem (praktisch nie erreichten)
Fall eine Fehlermeldung statt zu scheitern.

### 1.2 Grenzfall 3.8 — Tabelle einfügen, während Cursor in einem Listenelement steht
**Entscheidung: Tabelle wird in das Listenelement eingebettet, die Liste wird nicht unterbrochen.**
Begründung (Schema-Analyse `schema.ts:98-104`): `list_item` hat das Content-Model
`'paragraph block*'`. `table` gehört zur Gruppe `block` (`tableGroup: 'block'`). Ruft man
`state.tr.replaceSelectionWith(table)` mit dem Cursor mitten im Text eines `list_item`s auf,
sucht ProseMirrors Einfüge-Logik (`Transform`-Ebene) die am wenigsten invasive gültige Stelle:
Da `table` bereits als zusätzliches Kind **desselben** `list_item`s passt (der umschließende
Absatz wird dafür an der Cursor-Position gesplittet, wie bei einem Enter), muss nicht bis zur
Ebene von `bullet_list`/`ordered_list` „ausgepackt“ werden. Erwartetes Ergebnis: Das
`list_item` enthält danach z. B. `[paragraph, table, paragraph]` (Text vor/nach dem Cursor in
zwei Absätzen, Tabelle dazwischen), die Liste selbst bleibt durchgehend. **Dies muss durch
einen dedizierten Test verifiziert werden** (siehe Abschnitt 6.1) — die Analyse ist plausibel,
aber nicht ohne Testlauf zu 100 % beweisbar.

### 1.3 Obergrenzen für Zeilen/Spalten (Grenzfälle 3.3, 3.4, 3.14)
**Entscheidung: `MAX_TABLE_ROWS = 50`, `MAX_TABLE_COLS = 50`.** Begründung: Grenzfall 3.4 fordert
ausdrücklich, dass 20×20 noch funktionieren muss; Grenzfall 3.3 nennt 100×100 als Beispiel für
„muss mit Fehlermeldung abgelehnt werden“. 50×50 liegt sauber dazwischen, ist großzügig genug für
jeden plausiblen Anwendungsfall und schützt gleichzeitig vor dem DOM-Größenexplosionsrisiko bei
drei- oder vierstelligen Werten (jede Zelle ist mindestens ein `<td>`+`<p>`-Elementpaar; 50×50 =
2500 Zellen ist noch von `columnResizing()`/`tableEditing()`/der Pagination-Messung
(`pagination.ts`, misst pro `requestAnimationFrame` alle Top-Level-Kinder) unproblematisch
handhabbar, 100×100 = 10000 Zellen ist es mit spürbarer Wahrscheinlichkeit nicht mehr,
insbesondere da die Pagination-Plugin-`view.update`-Hook bei jeder Transaktion erneut misst).

### 1.4 Keine Persistierung der „zuletzt verwendeten Größe“ über einen Seiten-Reload hinaus
**Entscheidung: Nur In-Memory-`useState` innerhalb der laufenden Editor-Sitzung, kein
`localStorage`/`sessionStorage`.** Begründung: `PrivacyModal.tsx` verspricht der Nutzerin explizit
„nirgendwo gespeichert“ und „sobald du diese Seite schließt oder neu lädst, sind alle Dokumente
und Änderungen unwiderruflich gelöscht“ (Zeilen 19–26). Eine über `localStorage` persistierte
Tabellengröße würde diesem zentralen Produktversprechen widersprechen. Die Anforderung selbst
lässt „3×3 oder der zuletzt verwendete Wert“ (Zeile 87/61) ausdrücklich als Alternativen zu —
die einfachste, mit dem Rest der App konsistente Wahl ist In-Memory-State, das sich innerhalb
einer Sitzung „zuletzt verwendet“ verhält und nach Reload wieder bei 3×3 startet.

### 1.5 Rahmen-Frage beim Export (DOCX Abschnitt 4.1.4, ODT sinngemäß)
**Entscheidung: Rahmen werden aktiv exportiert, nicht nur als bekannte Einschränkung
dokumentiert.** Der Editor zeigt per CSS (`index.css:50-56`) durchgehend sichtbare Zellrahmen;
„Rahmen sichtbar“ ist in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 ausdrücklich als Soll-Kriterium
genannt. Ein Export, der dieses Aussehen nicht reproduziert, wäre ein sichtbarer Bruch zwischen
Editor-Vorschau und tatsächlichem Ergebnis — das ist der Kern dessen, was in der Anforderung als
„nicht funktional“ moniert wurde. Umsetzung: explizite `<w:tblBorders>` in DOCX (Abschnitt 4.1),
neue automatische Zellrahmen-Formatvorlage in ODT (Abschnitt 5.2).

### 1.6 Spaltenbreiten-Frage (Abschnitt 2.5 / DoD Punkt 8)
**Entscheidung: zweigeteilt.**
- **DOCX-Fallback-Verteilung wird repariert** (kein `w:w="2000"` mehr pro Spalte unabhängig von
  der Spaltenzahl, sondern gleichmäßige Verteilung der verfügbaren Seitenbreite) — das ist ein
  echter Bug (Overflow, siehe Abschnitt 0), kein reines Komfort-Feature.
- **Individuelle, im Editor per Ziehen gesetzte Spaltenbreite (`colwidth`-Attribut) wird beim
  DOCX-Export mit übernommen, wenn vorhanden** (pro Spalte, aus `columnResizing()`), sonst greift
  die reparierte Fallback-Verteilung. Das ist mit vertretbarem Aufwand möglich (siehe Abschnitt
  4.1) und schließt exakt die in Abschnitt 2.5 der Anforderung benannte Lücke.
- **Lesen** individueller Spaltenbreiten beim **Import** einer Fremddatei (`w:tcW`/`table:column-width`)
  bleibt **bewusst unverändert** (`colwidth: null`, wie bisher) — das ist von der Anforderung selbst
  ausdrücklich als akzeptable, zu dokumentierende Einschränkung eingestuft (Zeile 252–255:
  „auch wenn die ursprüngliche Spaltenbreite dabei nicht exakt reproduziert wird — das ist als
  bekannte, zu dokumentierende Einschränkung … zu behandeln“). Aufwand/Nutzen für diesen Teil ist
  in dieser Iteration nicht gerechtfertigt; siehe Abschnitt 10 als Folgearbeit.
- **ODT:** Da kein Overflow-Bug vorliegt (siehe Abschnitt 0), wird für ODT **keine**
  Spaltenbreiten-Persistierung ergänzt — bewusst dokumentierte Einschränkung, DoD-Punkt 8 ist für
  ODT über die Dokumentation in diesem Plan (Abschnitt 8) erfüllt.

### 1.7 Explizit nicht Teil dieser Umsetzung (laut Anforderung selbst optional/außerhalb des Scopes)
- Kontextmenü (Rechtsklick) „Tabelle einfügen“ — Anforderung Zeile 65: „nicht Teil dieser
  Anforderung“.
- Tastenkombination zum Einfügen — Zeile 64: „kein Blocker … optional ergänzbar“. Wird nicht
  gebaut, um den Scope nicht unnötig zu vergrößern.
- Sicherheitsabfrage beim Ersetzen einer nicht-trivialen Textselektion durch die Tabelle —
  Grenzfall 5 nennt das nur als „ggf. erwägen“. Entscheidung: **nicht bauen** — Undo deckt den
  Fall bereits ab (Abschnitt 2.6 der Anforderung), zusätzliche Bestätigungsdialoge widersprächen
  dem Standardverhalten von Word/LibreOffice, das die Anforderung an anderer Stelle selbst als
  Referenz nimmt.
- Zeilen-/Spalten-Kontextfunktionen (einfügen/löschen/verbinden/teilen/Tabelle löschen) — explizit
  eigene Backlog-Slugs, siehe Anforderung Zeile 22–32.

---

## 2. Neue Dateien

### 2.1 `src/formats/shared/tableConfig.ts` (neu)
Zentrale, von Editor **und** beiden Formaten gemeinsam genutzte Konstanten, um Magic Numbers nicht
weiter zu duplizieren (aktuell definiert `docx/reader.ts:208` `MAX_TABLE_NESTING_DEPTH = 25` lokal,
`odt/reader.ts:162` hat mit `MAX_NESTING_DEPTH = 25` eine eigene, aber semantisch andere
Allzweck-Tiefengrenze für Listen **und** Tabellen zusammen — die neue Datei ist zusätzlich, ersetzt
diese vorhandenen Konstanten **nicht**, da deren Semantik nicht identisch ist).

```ts
/** Reused by the "insert table" dialog (UI validation) and by insertTable() (structural guard). */
export const MAX_TABLE_ROWS = 50
export const MAX_TABLE_COLS = 50
/** Same nesting-depth ceiling the DOCX/ODT readers already use for imported files (see
 *  docx/reader.ts MAX_TABLE_NESTING_DEPTH, odt/reader.ts MAX_NESTING_DEPTH) — reused here so
 *  actively inserting a table via the toolbar cannot exceed what an imported file could reach. */
export const MAX_TABLE_NESTING_DEPTH = 25
export const DEFAULT_TABLE_ROWS = 3
export const DEFAULT_TABLE_COLS = 3
```

### 2.2 `src/formats/shared/editor/InsertTableDialog.tsx` (neu)
Kompletter neuer Dialog. Kein Wiederverwenden von `PrivacyModal.tsx`-Code möglich (siehe Abschnitt
0) — nur das visuelle Overlay-Muster (`fixed inset-0 z-50 bg-black/50 flex items-center
justify-center`) wird übernommen, alles Interaktive ist neu.

Props:
```ts
interface InsertTableDialogProps {
  initialRows: number
  initialCols: number
  /** Returns null on success (dialog closes), or an error message to show inline (dialog stays open). */
  onConfirm: (rows: number, cols: number) => string | null
  onCancel: () => void
}
```

Verhalten (Anforderung Abschnitt 2.1/2.2, Grenzfälle 1/2/3/11):
- Root: `role="dialog" aria-modal="true" aria-labelledby="insert-table-dialog-title"`.
- Zwei kontrollierte Text-Inputs (`type="text"`, nicht `type="number"` — vermeidet
  browserspezifische Spinner-Eigenheiten und lässt sich einfacher exakt validieren), lokaler
  String-State je Feld, damit auch ein zwischenzeitlich leeres Feld möglich ist, ohne dass React
  den Wert zurückschreibt.
- `useEffect` beim Mount: `firstInputRef.current?.focus(); firstInputRef.current?.select()`
  (Fokus + Vorauswahl, damit Tippen den Vorgabewert sofort ersetzt).
- Fokus-Falle: `onKeyDown` am Dialog-Root fängt `Tab`/`Shift+Tab` ab, ermittelt fokussierbare
  Elemente per `dialogRef.current.querySelectorAll('input, button')` und springt am Rand um
  (erstes ↔ letztes Element), damit Tab den Dialog nicht verlassen kann.
- `Escape` (im selben `onKeyDown`) → `onCancel()`.
- Backdrop-`div` mit `onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}` für
  „Klick außerhalb schließt“.
- Validierungsfunktion (rein, testbar, exportiert für Unit-Tests):
  ```ts
  export function parseTableDimension(raw: string, max: number): { value: number } | { error: string } {
    const trimmed = raw.trim()
    if (trimmed === '') return { error: 'Bitte eine Zahl eingeben.' }
    if (!/^\d+$/.test(trimmed)) return { error: 'Bitte eine ganze Zahl ≥ 1 eingeben.' }
    const n = Number(trimmed)
    if (n < 1) return { error: 'Der Wert muss mindestens 1 sein.' }
    if (n > max) return { error: `Der Wert darf höchstens ${max} sein.` }
    return { value: n }
  }
  ```
  (Deckt Grenzfall 2: 0, negativ, nicht-numerisch, leer; Grenzfall 3: zu groß, mit Fehlermeldung
  statt stillem Abschneiden.)
- `<form onSubmit>` (verhindert Default, `Enter` in einem Feld löst submit aus — Anforderung
  Zeile 89) validiert beide Felder; bei Fehler: Fehlermeldung(en) inline anzeigen (`role="alert"`
  pro Feld oder ein gemeinsamer Fehlertext), Dialog bleibt offen, **kein** `onConfirm`-Aufruf.
  Bei Erfolg: `const result = onConfirm(rows, cols)`; ist `result` ein String, wird er als
  Fehlermeldung angezeigt (Fall „Tiefen-Guard aus Abschnitt 1.1 hat abgelehnt“ — seltener
  Grenzfall, aber definiertes Verhalten statt stillem No-Op); ist `result === null`, macht der
  **Aufrufer** (Toolbar) den Dialog zu (kein eigener Schließen-Aufruf nötig, da `Toolbar` den
  offenen Zustand hält).
- Doppel-Submit-Schutz (Grenzfall 11): `submittedRef = useRef(false)`; am Anfang des
  Submit-Handlers `if (submittedRef.current) return; submittedRef.current = true` **nur** wenn die
  Validierung erfolgreich war (bei einem Validierungsfehler darf erneut submittet werden, nachdem
  der Fehler behoben wurde — daher `submittedRef` erst nach bestandener Validierung setzen, und den
  Bestätigen-Button zusätzlich `disabled`, sobald `submittedRef.current` true ist, als sichtbares
  Feedback).
- Zwei Buttons: `Abbrechen` (`type="button"`, `onClick={onCancel}`) und `Einfügen`
  (`type="submit"`), Texte identisch zum bestehenden Sprachmuster der App (`PrivacyModal.tsx`
  nutzt „Verstanden“, `Toolbar.tsx`/e2e-Tests nutzen „Exportieren“, „Neu erstellen“ — kurze,
  eindeutige Verb-Beschriftungen).

---

## 3. Geänderte Dateien — Editor-Kern

### 3.1 `src/formats/shared/editor/commands.ts`
Änderungen:
1. Import ergänzen: `import { goToNextCell, addRowAfter, selectionCell, selectedRect, isInTable } from 'prosemirror-tables'`
   sowie `import { MAX_TABLE_NESTING_DEPTH } from '../tableConfig'`.
2. `insertTable(rows, cols)` (aktuell Zeile 76–86) bekommt einen Tiefen-Guard **vor** dem
   bestehenden `if (dispatch)`-Block, damit ein Dry-Run (`insertTable(r, c)(state)` ohne
   `dispatch`, siehe Dialog-Confirm-Handler in Abschnitt 3.3) die Ablehnung schon vor jeder
   Dispatch-Entscheidung liefert — Konvention wie bei `setAlign` (`commands.ts:13-27`), das seine
   Anwendbarkeit ebenfalls unabhängig von `dispatch` berechnet:
   ```ts
   function tableNestingDepth(state: EditorState): number {
     const { $from } = state.selection
     let depth = 0
     for (let d = $from.depth; d >= 0; d--) {
       if ($from.node(d).type.spec.tableRole === 'table') depth++
     }
     return depth
   }

   export function insertTable(rows: number, cols: number): Command {
     return (state, dispatch) => {
       if (tableNestingDepth(state) >= MAX_TABLE_NESTING_DEPTH) return false
       if (dispatch) {
         const cell = () => wordSchema.nodes.table_cell.createAndFill()!
         const row = () => wordSchema.nodes.table_row.create(null, Array.from({ length: cols }, cell))
         const table = wordSchema.nodes.table.create(null, Array.from({ length: rows }, row))
         dispatch(state.tr.replaceSelectionWith(table))
       }
       return true
     }
   }
   ```
   Die eigentliche Einfüge-Logik bleibt **unverändert** (Anforderung Zeile 63 verlangt explizit,
   dass an der Command-Funktion selbst nichts geändert werden muss außer der Toolbar-Anbindung —
   der Tiefen-Guard ist die einzige funktionale Erweiterung, rein defensiv, ändert das Verhalten
   für den Normalfall nicht).
3. **Neu:** `tableTab(direction: 1 | -1): Command` — bindet Tab/Umschalt+Tab-Semantik inkl.
   „neue Zeile am Ende“ (Anforderung Zeile 67, Grenzfall 9, `FEATURE-SPEC-DOCX-ODT.md` Zeile 153):
   ```ts
   export function tableTab(direction: 1 | -1): Command {
     return (state, dispatch) => {
       if (!isInTable(state)) return false
       if (goToNextCell(direction)(state)) {
         return goToNextCell(direction)(state, dispatch)
       }
       if (direction === -1) return false // Shift-Tab in der ersten Zelle: kein Sonderverhalten
       return insertRowAtEndAndFocusFirstCell(state, dispatch)
     }
   }
   ```
4. **Neu:** `insertRowAtEndAndFocusFirstCell(state, dispatch)` — Hilfsfunktion, kein Export nötig
   (oder als benannter Export für einen gezielten Unit-Test). Referenzalgorithmus (Details während
   der Umsetzung gegen die tatsächliche `prosemirror-tables`-API zu verifizieren, insbesondere
   Positions-Mapping durch die Transaktion):
   ```ts
   function insertRowAtEndAndFocusFirstCell(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
     if (!addRowAfter(state, undefined)) return false // dry run: reuses addRowAfter's own isInTable check
     if (!dispatch) return true

     let appended: Transaction | undefined
     addRowAfter(state, (tr) => { appended = tr })
     if (!appended) return false

     // Locate the just-appended last row's first cell in the NEW document and move the
     // selection there. `selectionCell(state)` (old state) gives the enclosing table's start
     // position pre-transaction; map it through `appended.mapping` to find it in the new doc,
     // then resolve the table node fresh and address its *new* last row / first cell directly
     // (simpler and more robust than re-deriving TableMap math for an appended row).
     const $oldCell = selectionCell(state)
     let tableDepth = $oldCell.depth
     while ($oldCell.node(tableDepth).type.spec.tableRole !== 'table') tableDepth--
     const oldTableStart = $oldCell.start(tableDepth) - 1 // position right before the table node
     const newTableStart = appended.mapping.map(oldTableStart)
     const tableNode = appended.doc.nodeAt(newTableStart)
     if (!tableNode) return false

     const lastRow = tableNode.child(tableNode.childCount - 1)
     const firstCellRelPos = 1 /* into table */ + 1 /* into last row */
       + Array.from({ length: tableNode.childCount - 1 }, (_, i) => tableNode.child(i).nodeSize)
           .reduce((a, b) => a + b, 0)
     const firstCellStart = newTableStart + firstCellRelPos
     const $target = appended.doc.resolve(firstCellStart + 1) // inside the new cell's content
     dispatch(appended.setSelection(TextSelection.near($target)).scrollIntoView())
     return true
   }
   ```
   **Muss durch einen dedizierten Unit-Test abgesichert werden** (siehe Abschnitt 6.1) — Cursor
   muss nachweislich im ersten Zellinhalt der neuen Zeile landen, nicht nur „irgendwo gültig“.
5. Zusätzlicher Import: `TextSelection` aus `prosemirror-state` (bereits im Projekt vorhanden,
   siehe `WordEditor.tsx:2`).

### 3.2 `src/formats/shared/editor/WordEditor.tsx`
1. Import ergänzen: `tableTab` aus `./commands`.
2. Im bestehenden ersten `keymap({...})`-Block (Zeilen 71–79) zwei Einträge ergänzen:
   ```ts
   keymap({
     'Mod-z': undo,
     'Mod-y': redo,
     'Mod-Shift-z': redo,
     Enter: splitListItem(wordSchema.nodes.list_item),
     'Mod-b': toggleMark(wordSchema.marks.strong),
     'Mod-i': toggleMark(wordSchema.marks.em),
     'Mod-u': toggleMark(wordSchema.marks.underline),
     Tab: tableTab(1),
     'Shift-Tab': tableTab(-1),
   }),
   ```
   Wichtig: `tableTab` gibt `false` zurück, wenn `isInTable(state)` falsch ist (siehe 3.1) — Tab
   außerhalb einer Tabelle bleibt dadurch **unverändert** dem bisherigen (in der Anforderung als
   potenziell fehlerhaft dokumentierten, aber ausdrücklich außerhalb des Geltungsbereichs dieser
   Datei liegenden) Browser-Standardverhalten überlassen, da `keymap(baseKeymap)` (Zeile 80)
   ebenfalls kein Tab bindet. Dieses Verhalten **außerhalb** von Tabellen zu ändern ist nicht Teil
   dieser Anforderung (siehe Geltungsbereich, Zeile 13–19: „Tab-Navigation … für die frisch
   eingefügte Tabelle“). Grenzfall 3.10 wird dadurch **innerhalb** von Tabellen sauber gelöst;
   außerhalb bleibt der Status quo unverändert und sollte, falls gewünscht, ein eigener
   Backlog-Eintrag werden (siehe Abschnitt 10).
3. Keine Änderung an der Plugin-Reihenfolge nötig: `columnResizing()`/`tableEditing()` (Zeile
   81–82) registrieren keine eigene Tab-Keymap, es gibt also keinen Bindungskonflikt.

### 3.3 `src/formats/shared/editor/Toolbar.tsx`
1. Import ergänzen: `InsertTableDialog` aus `./InsertTableDialog`, `DEFAULT_TABLE_ROWS`,
   `DEFAULT_TABLE_COLS` aus `../tableConfig`.
2. Neuer lokaler State (Toolbar wird nur einmal pro `WordEditor`-Mount instanziiert, siehe
   `WordEditor.tsx:118` — der State überlebt also „öffnen/schließen“-Zyklen innerhalb derselben
   Editier-Sitzung, siehe Entscheidung 1.4):
   ```ts
   const [tableDialogOpen, setTableDialogOpen] = useState(false)
   const [lastTableSize, setLastTableSize] = useState({ rows: DEFAULT_TABLE_ROWS, cols: DEFAULT_TABLE_COLS })
   ```
3. Der bestehende Button (Zeilen 228–239) wird **ersetzt** — kein direkter `insertTable(2, 2)`-Aufruf mehr:
   ```tsx
   <button
     type="button"
     title="Tabelle einfügen"
     aria-label="Tabelle einfügen"
     aria-haspopup="dialog"
     aria-expanded={tableDialogOpen}
     onMouseDown={(e) => {
       e.preventDefault()
       setTableDialogOpen(true)
     }}
     className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
   >
     ⊞ Tabelle
   </button>
   {tableDialogOpen && (
     <InsertTableDialog
       initialRows={lastTableSize.rows}
       initialCols={lastTableSize.cols}
       onConfirm={(rows, cols) => {
         const command = insertTable(rows, cols)
         if (!command(view.state)) {
           return 'Verschachtelungstiefe für Tabellen erreicht – Tabelle kann hier nicht eingefügt werden.'
         }
         run(view, command)
         setLastTableSize({ rows, cols })
         setTableDialogOpen(false)
         return null
       }}
       onCancel={() => {
         setTableDialogOpen(false)
         view.focus()
       }}
     />
   )}
   ```
   Anmerkung: `aria-pressed={isInTable(view.state)}` (bisherige Zeile 231) entfällt — das war
   semantisch ohnehin unpassend für einen Button, der eine Aktion auslöst statt einen Zustand zu
   toggeln (kleiner, vorher nicht dokumentierter A11y-Mangel, hier miterledigt, weil dieselbe
   Zeile ohnehin angefasst wird). `isInTable`-Import in `Toolbar.tsx` (Zeile 11) wird dadurch
   überflüssig und kann entfernt werden.
4. **Kein** `view.focus()`-Aufruf beim Öffnen des Dialogs — der Cursor/die Selektion im Editor
   bleiben dadurch exakt erhalten (Grenzfall 1: Abbrechen darf Cursor-Position/Selektion nicht
   verändern). Erst bei Erfolg (`run()`, das intern `view.focus()` aufruft, siehe `Toolbar.tsx:25`)
   oder bei `onCancel` (`view.focus()`) wird der Fokus zurück in den Editor gelegt.
5. Der Dialog wird als Geschwisterelement der Toolbar-`div` gerendert (JSX-Fragment `<>...</>`
   nötig, da `Toolbar` aktuell nur ein einzelnes `<div>` zurückgibt, `Toolbar.tsx:111`). `position:
   fixed` im Dialog ist unabhängig von der Verschachtelungstiefe innerhalb von `WordEditor`, **da
   kein Vorfahre in `WordEditor.tsx`/`Toolbar.tsx` `transform`/`filter`/`will-change` setzt** (nur
   `shadow-lg` auf dem Seiten-`div`, `WordEditor.tsx:126` — Box-Shadow erzeugt keinen neuen
   Containing Block) — verifiziert, kein zusätzlicher Portal/`createPortal` nötig.

### 3.4 `src/formats/shared/schema.ts`
**Keine Änderung nötig.** `tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes:
{} })` (Zeile 106) liefert bereits `colspan`/`rowspan`/`colwidth` als Standardattribute je Zelle;
das reicht für alle in dieser Anforderung geforderten Verhaltensweisen (verschachtelte Tabellen,
mehrere Absätze/Formatierung je Zelle, Einbettung in Listenelemente). Diese Datei wird nur indirekt
über den neuen Import in `commands.ts` (`tableNestingDepth`) genutzt.

---

## 4. DOCX Import/Export

### 4.1 `src/formats/docx/writer.ts`
`tableToDocx()` (Zeilen 128–171) wird in drei Punkten geändert:

1. **Spaltenbreiten statt hartkodiert `2000` je Spalte** (behebt den in Abschnitt 0 quantifizierten
   Overflow-Bug, setzt Entscheidung 1.6 um). Neue Hilfsfunktion oberhalb von `tableToDocx`:
   ```ts
   import { PAGE_CONTENT_WIDTH_PX } from '../shared/editor/pageLayout'

   const PX_TO_DXA = 15 // 20 dxa/pt, 96 px/in, 1440 dxa/in → 1440/96 = 15 dxa per CSS px
   const CONTENT_WIDTH_DXA = Math.round(PAGE_CONTENT_WIDTH_PX * PX_TO_DXA)
   const MIN_COL_WIDTH_DXA = 100

   /** First non-null colwidth found for each grid column, across all rows (columnResizing()
    *  writes the same colwidth to every cell in a column, so scanning row 0 usually suffices,
    *  but scanning all rows is more robust against edge cases with colspans in row 0). */
   function collectColumnWidthsPx(rows: JsonNode[], colCount: number): Array<number | null> {
     const widths: Array<number | null> = Array.from({ length: colCount }, () => null)
     for (const row of rows) {
       let col = 0
       for (const cell of row.content ?? []) {
         const colspan = Number(cell.attrs?.colspan ?? 1)
         const colwidth = cell.attrs?.colwidth as Array<number | null> | null | undefined
         for (let i = 0; i < colspan && col + i < colCount; i++) {
           const w = colwidth?.[i]
           if (widths[col + i] == null && typeof w === 'number' && w > 0) widths[col + i] = w
         }
         col += colspan
       }
     }
     return widths
   }

   function columnWidthsDxa(rows: JsonNode[], colCount: number): number[] {
     const px = collectColumnWidthsPx(rows, colCount)
     const known = px.filter((w): w is number => w != null)
     const knownTotalDxa = known.reduce((sum, w) => sum + w * PX_TO_DXA, 0)
     const unknownCount = colCount - known.length
     const fallbackEachDxa = unknownCount > 0
       ? Math.max(MIN_COL_WIDTH_DXA, Math.floor(Math.max(CONTENT_WIDTH_DXA - knownTotalDxa, 0) / unknownCount))
       : 0
     return px.map((w) => (w != null ? Math.round(w * PX_TO_DXA) : fallbackEachDxa))
   }
   ```
   In `tableToDocx`, Zeile 131 ersetzen:
   ```ts
   const widthsDxa = columnWidthsDxa(rows, colCount)
   const grid = `<w:tblGrid>${widthsDxa.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`
   ```
2. **Explizite Rahmen** (setzt Entscheidung 1.5 um). Zeile 170 (`return
   `<w:tbl><w:tblPr/>${grid}${rowsXml}</w:tbl>`) wird:
   ```ts
   const TABLE_BORDERS_XML =
     '<w:tblBorders>' +
     ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
       .map((edge) => `<w:${edge} w:val="single" w:sz="4" w:space="0" w:color="9CA3AF"/>`)
       .join('') +
     '</w:tblBorders>'

   return `<w:tbl><w:tblPr>${TABLE_BORDERS_XML}</w:tblPr>${grid}${rowsXml}</w:tbl>`
   ```
   Farbe `9CA3AF` bewusst identisch zu `#9ca3af` aus `index.css:52` gewählt, damit Editor-Vorschau
   und Word-Rendering optisch übereinstimmen. `w:sz="4"` = 0,5pt (Viertel-Punkt-Einheit), ein
   dünner Standard-Rahmen wie in der Editor-CSS (`border: 1px solid`).
3. Keine Änderung an Merge-Logik (`gridSpan`/`vMerge`, Zeilen 133–165) — bereits korrekt, wie von
   der Anforderung bestätigt (Zeile 45: „liest … korrekt“ bezog sich zwar auf den Reader, aber der
   Writer-Pfad für `colspan`/`rowspan` wurde ebenfalls gegengelesen und ist unverändert korrekt).

### 4.2 `src/formats/docx/reader.ts`
**Keine Pflichtänderung.** `colwidth` bleibt bewusst `null` beim Import (Zeile 244) — siehe
Entscheidung 1.6. Optionale Folgearbeit (nicht Teil dieser Iteration, siehe Abschnitt 10): `w:tcW`
je Zelle bzw. `w:tblGrid > w:gridCol/@w:w` auslesen und in `colwidth` (Pixel, `/PX_TO_DXA`)
umrechnen, damit eine importierte-dann-unverändert-reexportierte Datei ihre ursprünglichen
Spaltenbreiten exakter beibehält. Nicht nötig für die Abnahmekriterien dieser Anforderung, da
Abschnitt 4.1 Punkt 3 der Anforderung selbst (Zeile 252–255) diesen Verlust ausdrücklich als
akzeptable, nur zu dokumentierende Einschränkung einstuft.

---

## 5. ODT Import/Export

### 5.1 `src/formats/odt/writer.ts`
`blockToOdt()`, Fall `'table'` (Zeilen 86–111), wird in drei Punkten geändert:

1. **Colspan-korrekte Spaltenzählung** (behebt den in Abschnitt 0 bestätigten Datenfehler, DoD
   Punkt 4 erste Teilanforderung). Zeile 88 ersetzen:
   ```ts
   // Wie docx/writer.ts:130 — Spaltenzahl aus der Summe der colspan-Werte JEDER Zeile, nicht nur
   // aus der Zellenanzahl von Zeile 0 (die bei einer colspan-Zelle in Zeile 0 zu niedrig wäre).
   const colCount = rows.reduce(
     (max, row) => Math.max(max, (row.content ?? []).reduce((sum, cell) => sum + Number(cell.attrs?.colspan ?? 1), 0)),
     1,
   )
   ```
   (Absichtlich über **alle** Zeilen maximiert, nicht nur Zeile 0 — robuster als die von der
   Anforderung Zeile 289–291 explizit geforderte Testkonstellation „colspan-Zelle in Zeile 1,
   gefolgt von einer normalen Zeile mit mehr Zellen“ hinaus, für den Fall, dass irgendeine
   spätere Zeile die meisten Spalten hat.)
2. **Deterministische, eindeutige Tabellennamen statt `Math.random()`** (behebt Zeile 109,
   DoD Punkt 4 zweite Teilanforderung, Grenzfall/Testfall Abschnitt 4.2 Punkt 6). Folgt demselben
   Zähler-Muster wie bereits `RelationshipRegistry` (`docx/relationships.ts:10-14`) und
   `TextStyleRegistry` (`odt/styleRegistry.ts:22-44`) im Projekt verwenden — kein neues Muster,
   sondern Wiederverwendung des etablierten Konsistenzstils:
   ```ts
   // Neue kleine Klasse, z. B. direkt in writer.ts oder in styleRegistry.ts co-lokiert:
   class TableNameGenerator {
     private counter = 0
     next(): string {
       this.counter += 1
       return `Table${this.counter}`
     }
   }
   ```
   Eine **einzige** Instanz pro `writeOdt()`-Aufruf wird erzeugt (analog zu `bodyStyles`/`images`,
   Zeilen 184–185) und durch `blocksToOdt`/`blockToOdt` durchgereicht (zusätzlicher Parameter,
   analog zu `styles`/`images`), damit Tabellen in Kopf-/Fußzeile **und** Hauptdokument garantiert
   nicht kollidieren (aktuell nutzen `bodyXml`, `headerXml`, `footerXml` je eigene
   `TextStyleRegistry`-Instanzen, Zeile 184/188 — die neue `TableNameGenerator`-Instanz muss
   dagegen **eine gemeinsame** für alle drei Aufrufe sein, da Tabellennamen dokumentweit eindeutig
   sein müssen, nicht nur je Teil).
3. **Zellrahmen** (setzt Entscheidung 1.5 um, siehe 5.2 für die neue Formatvorlage):
   ```ts
   return `<table:table-cell table:style-name="${TABLE_CELL_BORDER_STYLE_NAME}" ${spanAttrs}>${inner || '<text:p/>'}</table:table-cell>`
   ```
   (Import `TABLE_CELL_BORDER_STYLE_NAME` aus `./styleRegistry`.)

### 5.2 `src/formats/odt/styleRegistry.ts`
Neue Konstante + Funktion, im selben Stil wie `PARAGRAPH_ALIGN_STYLE_NAME`/`paragraphAlignStyleDefs`
(Zeilen 61–75):
```ts
export const TABLE_CELL_BORDER_STYLE_NAME = 'TCBorder'

export function tableCellBorderStyleDef(): string {
  return (
    `<style:style style:name="${TABLE_CELL_BORDER_STYLE_NAME}" style:family="table-cell">` +
    `<style:table-cell-properties fo:border="0.5pt solid #9ca3af"/>` +
    `</style:style>`
  )
}
```
In `writer.ts`, `buildContentXml()` (Zeile 129–137) wird `tableCellBorderStyleDef()` in die
`office:automatic-styles`-Konkatenation (Zeile 133, neben `paragraphAlignStyleDefs()` etc.)
aufgenommen: `${paragraphAlignStyleDefs()}${headingStyleDefs()}${listStyleDefs()}${tableCellBorderStyleDef()}${styles.serializeDefs()}`.
Farbe `#9ca3af` identisch zur DOCX-Rahmenfarbe (Abschnitt 4.1) und zu `index.css:52` gewählt, für
konsistentes Aussehen über alle drei Repräsentationen (Editor-CSS, DOCX-Export, ODT-Export).

### 5.3 `src/formats/odt/reader.ts`
**Keine Pflichtänderung**, gleiche Begründung wie Abschnitt 4.2 — `colwidth` bleibt `null` beim
Import. `table:number-columns-spanned`/`table:number-rows-spanned` (Zeilen 193–194) sind bereits
korrekt, keine Änderung nötig.

---

## 6. Tests

### 6.1 Unit-/Komponententests (neu bzw. erweitert)

| Datei | Änderung |
|---|---|
| `src/formats/shared/editor/__tests__/commands.test.ts` (**neu**) | Tests für `tableTab(1)`/`tableTab(-1)`: Sprung zur nächsten/vorherigen Zelle; Tab in der letzten Zelle der letzten Zeile fügt eine neue Zeile hinzu **und** platziert den Cursor nachweislich im ersten Zellinhalt dieser neuen Zeile (prüft exakte `state.selection.$from`-Position, nicht nur „Dokument hat jetzt eine Zeile mehr“); Shift-Tab in der ersten Zelle der ersten Zeile ist ein No-Op (`false`); `tableTab` außerhalb einer Tabelle gibt `false` zurück. Zusätzlich Tests für `insertTable`s Tiefen-Guard: Tabelle in Tabelle in Tabelle … bis `MAX_TABLE_NESTING_DEPTH` erlaubt, ein Schritt darüber hinaus liefert `false`. |
| `src/formats/shared/editor/__tests__/commands.test.ts` | Test für Grenzfall 3.8 (Entscheidung 1.2): Dokument mit `bullet_list > list_item > paragraph("ab|cd")` (Cursor zwischen b/c), `insertTable(2,2)` ausführen, Ergebnis-JSON prüfen: `bullet_list` bleibt einzelnes Element mit einem `list_item`, dessen `content` `[paragraph("ab"), table, paragraph("cd")]` entspricht (oder eine während der Umsetzung tatsächlich beobachtete äquivalente Struktur — falls die Analyse aus Abschnitt 1.2 nicht zutrifft, muss die Entscheidung in Abschnitt 1.2 korrigiert und hier dokumentiert werden, **nicht** stillschweigend ein anderes Verhalten hinnehmen). |
| `src/formats/shared/editor/__tests__/InsertTableDialog.test.tsx` (**neu**, `@testing-library/react`) | `parseTableDimension` direkt testen (0, negativ, Text, leer, Dezimalzahl, Grenzwert `MAX_TABLE_COLS`/`+1`); Komponententest: Mount mit `initialRows=3, initialCols=3`, Standardwerte sichtbar; Eingabe ungültiger Wert + Submit → Fehlermeldung sichtbar, `onConfirm` **nicht** aufgerufen; Escape-Taste → `onCancel` aufgerufen; Klick auf Backdrop (nicht auf die Dialog-Box) → `onCancel`; zweifaches schnelles Submit (Grenzfall 11) → `onConfirm` nur einmal aufgerufen. |
| `src/formats/docx/__tests__/roundtrip.test.ts` | Neuer Test in `describe('DOCX round trip: tables', …)`: Tabelle mit `colspan`-Zelle in Zeile 0 exportieren, `document.xml` direkt aus dem Zip lesen (wie es der bestehende Zugriff über `roundTrip()` bereits ermöglicht bzw. per zusätzlichem Export-only-Test, siehe `docx.spec.ts`-Muster), Anzahl `<w:gridCol>` prüfen (muss `colCount`, nicht Zellenanzahl von Zeile 0, entsprechen — für DOCX bereits korrekt, dient hier als Regressionsschutz). Neuer Test: `<w:tblBorders>` ist im exportierten `<w:tblPr>` enthalten. Neuer Test: Bei 5 Spalten ist die Summe der `w:gridCol/@w:w`-Werte ≤ `CONTENT_WIDTH_DXA` (kein Overflow mehr). |
| `src/formats/odt/__tests__/roundtrip.test.ts` | Neuer Test: Tabelle mit `colspan`-Zelle in Zeile 0, gefolgt von einer Zeile mit mehr Zellen als `rows[0].content.length` (exakt das in der Anforderung Zeile 289–291 verlangte Szenario) — Anzahl `<table:table-column>` im exportierten `content.xml` muss der tatsächlich benötigten Spaltenzahl entsprechen. Neuer Test: zwei Tabellen im selben Dokument exportieren → beide `table:name`-Werte sind verschieden (Regressionsschutz gegen erneuten `Math.random()`-Rückfall). Neuer Test: jede `<table:table-cell>` referenziert `table:style-name="TCBorder"` (oder den tatsächlich gewählten Namen). |

### 6.2 E2E-Tests (Playwright, `tests/e2e/`)

**Pflichtänderung Nr. 1 (kritisch, sonst bricht ein bestehender, laut Anforderung dauerhaft
grüner Pflichttest):** `tests/e2e/selection-regression.spec.ts`, Test `'same regression inside a
table cell …'` (Zeile 34–50). Nach dem bisherigen Klick auf den Button (Zeile 37) muss der neue
Dialog abgefangen werden, bevor auf `.ProseMirror td` zugegriffen wird:
```ts
await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
await page.getByRole('dialog', { name: 'Tabelle einfügen' }).getByRole('button', { name: 'Einfügen' }).click()
```
(Restlicher Testinhalt unverändert — 3×3-Standardgröße hat weiterhin mindestens zwei Zellen für
`cells.nth(0)`/`cells.nth(1)`.) Ohne diese Änderung schlägt der Test **sofort** fehl, sobald die
Dialog-Umstellung live ist — das muss im selben Commit/PR wie die Toolbar-Änderung passieren, nicht
später nachgezogen werden.

**Neue Datei `tests/e2e/table-insert.spec.ts`** — deckt Anforderung Abschnitt 5, Testfälle 1–13:

| Testfall (Abschnitt 5) | Testname (Vorschlag) |
|---|---|
| 1 | „clicking the toolbar button opens the size dialog“ |
| 2 | „entering rows=4, cols=3 and confirming inserts a 4×3 table“ |
| 3 | „confirming with default values inserts the default table size“ |
| 4 | „invalid input (0, negative, text) shows an error and inserts nothing“ (drei Sub-Fälle oder `test.each`) |
| 5 | „pressing Escape closes the dialog without any DOM/document change“ |
| 6 | „typing into every cell of a freshly inserted table lands in the right cell“ (Erweiterung auf **alle** Zellen einer 3×3- oder 4×3-Tabelle, nicht nur zwei wie in `selection-regression.spec.ts`) |
| 7 | „Tab moves the cursor to the next cell“ |
| 8 | „Tab in the last cell of the last row appends a new row“ |
| 9 | „Ctrl+Z right after inserting removes the whole table“ |
| 10 | „Ctrl+Shift+Z (Redo) restores the table at the correct size“ |
| 11 | „inserting between existing text keeps both text parts intact“ |
| 12 | „inserting while text is selected replaces the selection“ |
| 13 | „inserting with the cursor already inside a table cell creates a nested table without crashing“ |

**Neue Datei `tests/e2e/table-roundtrip.spec.ts`** — deckt Abschnitt 4 (Rundreise) und
Abschnitt 5, Testfälle 14–18, im selben Stil wie `tests/e2e/docx.spec.ts`
(`page.waitForEvent('download')`, `JSZip.loadAsync`, direkte XML-String-Prüfung als „unabhängiger
Parser“ im Sinne der Anforderung Zeile 246):
- DOCX: 4×3 über Dialog einfügen, exportieren, `word/document.xml` parsen → genau 4 `<w:tr>`, je
  3 `<w:tc>`, Zellinhalte an richtiger Position (Abschnitt 4.1.1); Datei erneut importieren →
  Editor zeigt identische Struktur (4.1.2); `<w:tblBorders>` vorhanden (4.1.4); Fremddatei mit
  `colspan`/`rowspan` importieren → unverändert exportieren → erneut importieren, Verbund bleibt
  (4.1.5, jetzt über echten Upload/Download statt nur Unit-Test); Cross-Format ODT→DOCX (4.1.6).
- ODT: analog, inkl. des in Abschnitt 4.2.2 explizit geforderten `colspan`-in-Zeile-1-Szenarios
  über echten Datei-Upload/-Download, und des Zwei-Tabellen-Namenskollisions-Tests (4.2.6) über
  echten Export.
- Cross-Format doppelte Rundreise (4.3): DOCX→ODT→DOCX und ODT→DOCX→ODT, Struktur-/Inhaltstreue
  geprüft, Spaltenbreite/Rahmen-Feinheiten explizit **nicht** geprüft (laut Anforderung Zeile
  312–313 bewusst ausgenommen).
- Große Tabelle (20×20, Testfall 17): Einfügen über Dialog, Performance-Sanity-Check (z. B.
  `test.setTimeout`, Messung, dass Export/Re-Import unter der in der Anforderung genannten
  3-Sekunden-Schwelle bleibt, Zeile 180), UI bleibt bedienbar (z. B. ein weiterer Tastatureingabe-
  Test direkt danach, der nicht hängt).
- Testfall 18 (reale komplexe Fremddatei mit großer Tabelle): auf eine bereits im Repo vorhandene
  Testfixture zurückgreifen, falls `tests/`/`src/**/__tests__` bereits größere Beispieldateien
  enthält (bei Umsetzung prüfen — in dieser Analyse nicht gefunden, ggf. neu mit einer
  hand-gebauten großen DOCX-Datei nach dem Muster von `buildSampleDocx()` in `docx.spec.ts:7-48`
  erzeugen, mit z. B. 6 Spalten × 12 Zeilen und gemischter Formatierung).

**Bestehende Datei `tests/e2e/selection-regression.spec.ts`**: bleibt ansonsten unverändert
bestehen (Pflichtanforderung Abschnitt 2.7/DoD Punkt 7) — nur die eine Stelle aus Pflichtänderung
Nr. 1 wird angepasst.

### 6.3 Vollständige Zuordnung Anforderung Abschnitt 5 → Umsetzung

| # | Testfall | Datei |
|---|---|---|
| 1–5, 11–13 | Dialog-Verhalten, Grenzfälle | `tests/e2e/table-insert.spec.ts` |
| 6 | Alle Zellen klickbar/tippbar | `tests/e2e/table-insert.spec.ts` (+ bestehender Test in `selection-regression.spec.ts` bleibt für den Sync-Bug-Teil erhalten) |
| 7–8 | Tab-Navigation | `tests/e2e/table-insert.spec.ts` + Unit-Test in `commands.test.ts` |
| 9–10 | Undo/Redo | `tests/e2e/table-insert.spec.ts` |
| 14–16, 18 | Rundreise/Cross-Format | `tests/e2e/table-roundtrip.spec.ts` |
| 17 | Große Tabelle, Performance | `tests/e2e/table-roundtrip.spec.ts` |
| 19 | Regressionstest bleibt bestehen | `tests/e2e/selection-regression.spec.ts` (mit Pflichtänderung Nr. 1) |

---

## 7. Grenzfälle (Anforderung Abschnitt 3) — Umsetzungsstatus je Punkt

| # | Grenzfall | Wie abgedeckt |
|---|---|---|
| 1 | Dialog abbrechen | `InsertTableDialog` `onCancel`, kein Dispatch vor Bestätigung (Abschnitt 2.2/3.3) |
| 2 | Ungültige Eingabe | `parseTableDimension` (Abschnitt 2.2) |
| 3 | Sehr große Werte (100×100) | `MAX_TABLE_ROWS/COLS = 50` (Entscheidung 1.3) |
| 4 | Große, zulässige Tabelle (20×20) | Performance-Test in `table-roundtrip.spec.ts` |
| 5 | Einfügen bei Textselektion | Bestehendes ProseMirror-Verhalten (`replaceSelectionWith`), Test 12 |
| 6 | Dokumentanfang/-ende | Test 11/vorhandenes Verhalten, gezielter Test in `table-insert.spec.ts` |
| 7 | Verschachtelte Tabelle | Entscheidung 1.1 (erlaubt, mit Tiefen-Guard), Test 13 |
| 8 | Einfügen in Listenelement | Entscheidung 1.2, Unit-Test in `commands.test.ts` |
| 9 | Tab in letzter Zelle | `tableTab`/`insertRowAtEndAndFocusFirstCell` (Abschnitt 3.1), Test 8 |
| 10 | Tab verlässt versehentlich den Editor | Innerhalb von Tabellen behoben (Abschnitt 3.2); außerhalb unverändert, siehe Abschnitt 10 |
| 11 | Mehrfach-Klick | Doppel-Submit-Schutz im Dialog (Abschnitt 2.2) |
| 12 | Undo nach Einfügen + erneutes Tippen | Test in `table-insert.spec.ts`, kombiniert Undo-Test mit anschließender Eingabe |
| 13 | Selection-Sync-Bug beim Zellwechsel | Bestehender Test bleibt (Pflichtänderung Nr. 1 hält ihn lauffähig) |
| 14 | Spaltenanzahl > Seitenbreite | DOCX-Fallback-Verteilung repariert (Abschnitt 4.1 Punkt 1), visuelle Prüfung als Teil von Testfall 17 |
| 15 | Einfügen in leeres Dokument | Abgedeckt durch Standardverhalten von `replaceSelectionWith` auf dem einzigen leeren Absatz aus `emptyDocJSON()` (`documentModel.ts:10-12`); gezielter Test ergänzt in `table-insert.spec.ts` |

---

## 8. Abnahmekriterien (Anforderung Abschnitt 6) — wie jeder Punkt erfüllt wird

1. Dialog gebaut/verdrahtet, feste 2×2-Einfügung entfernt → Abschnitt 2.2, 3.3; Tests 1–5.
2. Tab/Umschalt+Tab inkl. neue Zeile am Ende → Abschnitt 3.1, 3.2; Tests 7–8.
3. Alle Testfälle Abschnitt 5 ausgeführt → Abschnitt 6.2/6.3 (muss bei Umsetzung tatsächlich grün
   laufen, dieser Plan legt nur die Dateien/Fälle fest).
4. Rundreise-Anforderungen inkl. der zwei benannten Datenfehler → ODT-Spaltenzählung Abschnitt
   5.1 Punkt 1, DOCX-Rahmen Abschnitt 4.1 Punkt 2 (jeweils per Unit- **und** E2E-Test verifiziert,
   nicht nur eines von beidem).
5. Grenzfälle einzeln geprüft/dokumentiert → Abschnitt 7 dieser Datei, plus die tatsächlichen
   Testergebnisse nach Umsetzung.
6. Grenzfall 3.7 explizit beantwortet → Abschnitt 1.1 (Ergebnis: erlaubt, mit Tiefen-Guard); nach
   Umsetzung in `tabelle-einfuegen-req.md` Zeile 192–193 nachzutragen.
7. Selection-Sync-Regressionstest bleibt Teil der Suite → Abschnitt 6.2, Pflichtänderung Nr. 1
   passt ihn an die neue Dialog-UI an, statt ihn zu entfernen; Test bleibt inhaltlich derselbe.
8. Spaltenbreiten-Einschränkung entweder dokumentiert oder behoben → Entscheidung 1.6: DOCX-Teil
   behoben (Fallback-Verteilung **und** Übernahme individuell gesetzter `colwidth`-Werte), ODT
   bewusst dokumentiert (kein Overflow-Risiko vorhanden), Lesen beim Import bewusst als
   Einschränkung dokumentiert (von der Anforderung selbst als akzeptabel eingestuft).

---

## 9. Umsetzungsreihenfolge (Vorschlag)

1. `src/formats/shared/tableConfig.ts` anlegen; `commands.ts` (Tiefen-Guard, `tableTab`,
   `insertRowAtEndAndFocusFirstCell`) + zugehörige Unit-Tests in `commands.test.ts` — lässt sich
   vollständig ohne UI-Änderung verifizieren.
2. `WordEditor.tsx` Keymap-Erweiterung (Tab/Shift-Tab) — abhängig von Schritt 1.
3. `InsertTableDialog.tsx` + Komponententests — unabhängig von Schritt 1/2 parallelisierbar.
4. `Toolbar.tsx`-Verdrahtung (Dialog + `insertTable`-Aufruf) — abhängig von Schritt 1 und 3.
5. **Sofort im selben Schritt:** Pflichtänderung Nr. 1 an `selection-regression.spec.ts`, sonst
   ist die Suite ab hier rot.
6. `docx/writer.ts` (Rahmen + Spaltenbreiten), `odt/writer.ts` + `odt/styleRegistry.ts` (Rahmen,
   Spaltenzählung, Tabellennamen) + zugehörige Unit-Tests — unabhängig von 1–5, parallelisierbar.
7. Neue E2E-Dateien `table-insert.spec.ts`, `table-roundtrip.spec.ts` — nach Abschluss von 1–6.
8. Volllauf aller Tests (`npm run test`, `npm run test:e2e`), Abgleich gegen Abschnitt 6–8 dieses
   Plans, danach Rückmeldung an `tabelle-einfuegen-req.md`/`FEATURE-BACKLOG.md` zur
   Status-Änderung „teilweise“ → „verifiziert“ (liegt außerhalb des Umsetzungsplans selbst, ist
   Aufgabe der anschließenden QA-Verifikation laut Kopf der Anforderungsdatei, Zeile 3–4).

---

## 10. Bewusst nicht umgesetzt / Folgearbeiten (für spätere Backlog-Einträge)

- DOCX-Reader: `w:tcW`/`w:gridCol`-Breiten beim Import auslesen, damit Fremddateien ihre
  Spaltenbreite nach Rundreise exakter behalten (Abschnitt 4.2). Nicht blockierend für diese
  Anforderung (siehe Zitat in Abschnitt 1.6).
- Tab-Verhalten **außerhalb** von Tabellen (Fokus verlässt möglicherweise den Editor komplett,
  Grenzfall 3.10 teilweise) — nur der Tabellen-Fall ist Teil dieser Anforderung; ein generelles
  Tab-Handling für den gesamten Editor (z. B. Tab fügt an anderer Stelle einen Einzug ein statt
  den Fokus zu verlassen) wäre ein eigener Backlog-Punkt.
- Kontextmenü „Tabelle einfügen“ (Rechtsklick) — laut Anforderung explizit außerhalb des Scopes.
- Tastenkombination zum Einfügen — laut Anforderung explizit optional, nicht gebaut.
- Individuelle Spaltenbreiten-Persistierung für ODT (`style:column-width` je
  `table:table-column`) — aus Symmetriegründen zu `docx/writer.ts` denkbar, aber ohne
  zugrundeliegenden Bug nicht in dieser Iteration priorisiert (Entscheidung 1.6).
- Alle in `tabelle-einfuegen-req.md` Zeile 22–32 explizit ausgeschlossenen Funktionen
  (Zeile/Spalte einfügen/löschen, Zellen verbinden/teilen, Tabelle löschen, Tabelleneigenschaften,
  Formatvorlagen, Kopfzeile wiederholen, Text↔Tabelle, Tabellenformel, Sortieren, Autoanpassen,
  Zeichnen) — eigene Backlog-Slugs, nicht Teil dieses Plans.
