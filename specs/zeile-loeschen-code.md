# Umsetzungsplan: Feature „Zeile löschen“

Gegenstück zu `specs/zeile-loeschen-req.md`. Dieser Plan ist das Ergebnis einer
**tatsächlichen Codeprüfung am aktuellen Stand** (nicht Übernahme der Anforderungsdatei):
Jede Ort-/Zeilenangabe unten wurde gegen den realen Quelltext verifiziert. Abschnitt 1
bestätigt/korrigiert den Ist-Stand-Befund, alle weiteren Abschnitte sind der dateigenaue
Bauplan.

Geltungsbereich wie in der Anforderungsdatei: gemeinsamer Editor
(`src/formats/shared/editor/*`, `src/formats/shared/schema.ts`) für DOCX und ODT;
Import/Export bleibt formatspezifisch (`src/formats/docx/*`, `src/formats/odt/*`).

> **Revisionshinweis (wichtig für Reviewer):** Eine frühere Fassung dieses Plans führte
> einen ODT-Writer-Bug („kein `<table:covered-table-cell/>`“, „colCount = `rows[0].content.length`“)
> als offenen Punkt und Voraussetzung für Abnahmekriterium 8. **Dieser Befund war
> veraltet und ist FALSCH.** Der aktuelle `src/formats/odt/writer.ts` erzeugt
> `covered-table-cell` bereits für horizontale **und** vertikale Überdeckung und summiert
> `colCount` korrekt aus den `colspan`-Werten; es existieren dafür bereits **grüne** Tests
> (`odt/__tests__/roundtrip.test.ts`, Zeilen 275 und 310). Das deckt sich exakt mit
> `zeile-loeschen-req.md` Befund 8, der ausdrücklich warnt, diesen Punkt **nicht erneut**
> als offenen Befund zu führen. Abschnitt 1 und 5.2 sind entsprechend korrigiert: **kein
> ODT-Import/Export-Code muss für dieses Feature geändert werden.**
>
> **Revisionshinweis 2 (Zeilennummern nachgezogen):** Sämtliche `WordEditor.tsx`-Zeilenangaben
> in Abschnitt 1/3.7/4 waren gegenüber dem aktuellen Stand um ~8 Zeilen veraltet (das Symptom,
> vor dem `zeile-loeschen-req.md` Befund 9 warnt) und wurden erneut gegen den realen Quelltext
> geprüft und korrigiert: `history()` = Z. 84, `Mod-z`-Keymap = Z. 93–95, `keymap(baseKeymap)`
> = Z. 108, `columnResizing()`/`tableEditing()` = Z. 109–110, Kontextmenü-Kommentar = Z. 117–121,
> `reconcileSelectionOnClick`-Registrierung = Z. 154–155, Toolbar-JSX-Zeile = Z. 170. Alle
> übrigen Orte (`Toolbar.tsx`, `commands.ts`, `schema.ts:14`/`:154`, `docx/*`, `odt/*`,
> `prosemirror-tables` `deleteRow`@1506/`removeRow`@1470/`selectedRect`@1303, Fixtures,
> `selection-regression.spec.ts`) wurden verifiziert und stimmen.

---

## 1. Bestätigung des Ist-Stands (eigene Codeprüfung, gegen realen Code verifiziert)

Der Kernbefund in `zeile-loeschen-req.md` Abschnitt 0 trifft zu: es gibt weder UI-Weg noch
verdrahteten Command noch Test für „Zeile löschen“. Verifizierte Präzisierungen:

1. **`prosemirror-tables`s `deleteRow` bricht bei „alle Zeilen selektiert“ still ab —
   bestätigt.** Verifiziert in `node_modules/prosemirror-tables/dist/index.js`
   (Version laut `package.json`: **1.8.5**), Funktion `deleteRow` ab **Zeile 1506**:
   ```js
   function deleteRow(state, dispatch) {
     if (!isInTable(state)) return false;
     if (dispatch) {
       const rect = selectedRect(state), tr = state.tr;
       if (rect.top == 0 && rect.bottom == rect.map.height) return false;  // <-- Zeile 1510: No-Op
       for (let i = rect.bottom - 1;; i--) { removeRow(tr, rect, i); if (i == rect.top) break; ... }
       dispatch(tr);
     }
     return true;   // <-- ohne dispatch IMMER true, Guard wird nie ausgewertet
   }
   ```
   Umfasst die Selektion **alle** Zeilen (einzeilige Tabelle **oder** `CellSelection` über
   sämtliche Zeilen), dispatcht `deleteRow` **nicht** und gibt dennoch `true` zurück. Der
   dispatch-lose Verfügbarkeits-Check meldet die Aktion also fälschlich als „geht“. Ein
   naiver Wrapper um `deleteRow` verletzt damit Abschnitt 2.4/2.8 (stiller Fehlschlag).
   **Konsequenz:** `deleteTableRow` muss diesen Fall selbst erkennen und auf
   Tabellen-Entfernung umleiten (Abschnitt 3.1).

2. **`removeRow` erledigt Rowspan-Migration und -Dekrement bereits korrekt — bestätigt.**
   Verifiziert, `dist/index.js` **Zeile 1470–1499**:
   - überdeckte Zeile (`row > 0 && pos == map.map[index - map.width]`): setzt die Ankerzelle
     per `setNodeMarkup` auf `rowspan - 1` (Inhalt unberührt) — Grenzfall 7.
   - Ankerzeile (`row < map.height && pos == map.map[index + map.width]`): erzeugt eine
     **Kopie mit `rowspan - 1` und vollständigem `cell.content`** und `tr.insert`et sie in
     die Folgezeile (`map.positionAt(row + 1, col, table)`) — Inhalts-Migration, Grenzfall 6.

   `deleteRow` ruft `removeRow` intern von unten nach oben auf. Das deckt die Grenzfälle
   6/7 auf Bibliotheksebene ab — **muss aber laut Anforderungsdatei je eigenständig
   getestet werden.**

3. **Entf/Rücktaste auf einer `CellSelection` leert bereits heute nur den Zellinhalt —
   kein Produktivcode nötig.** `prosemirror-tables`’ `CellSelection` überschreibt
   `replace()` so, dass nur der Inhalt jeder erfassten Zelle ersetzt wird, nie die
   Zeilen-/Zellstruktur. `WordEditor.tsx` registriert `keymap(baseKeymap)`
   (**Zeile 108**) und `tableEditing()` (**Zeile 110**); `baseKeymap`s
   `Backspace`/`Delete` laufen über `deleteSelection` → `CellSelection.replace`. Damit ist
   Zugriffsweg 4 der Anforderungsdatei bereits korrekt — es fehlt **nur ein
   Abgrenzungs-Test** (Abschnitt 6.6, Testfall 6). Wichtige Korrektur gegenüber dem
   „ungeklärt“-Befund der Anforderungsdatei.

4. **KORREKTUR gegenüber der früheren Fassung dieses Plans — der ODT-Writer ist bereits
   ODF-konform, kein Bug.** Verifiziert in `src/formats/odt/writer.ts`, Fall `'table'`
   (**Zeile 110–175**):
   - `colCount` = **Summe der `colspan`-Werte von Zeile 0** (**Zeile 115–116**:
     `(rows[0]?.content ?? []).reduce((sum, cell) => sum + Number(cell.attrs?.colspan ?? 1), 0) || 1`)
     — **nicht** `rows[0].content.length`. Der früher hier behauptete colCount-Bug
     existiert nicht.
   - `<table:covered-table-cell/>` wird für **horizontale** Überdeckung (colspan,
     **Zeile 160–162**) **und** für **vertikale** Überdeckung (rowspan) über einen
     `pending[]`-Tracker (**Zeile 126, 135–140, 165–167**) emittiert. Eine Volltextsuche
     `covered-table-cell` über `src/` liefert **15** Treffer (nicht null), inkl.
     **bereits grüner** Tests `odt/__tests__/roundtrip.test.ts`:
     - Zeile 275: „emits ODF-compliant covered-table-cell placeholders for a horizontal
       (colspan) merge“
     - Zeile 310–339: „… for a vertical (rowspan) merge“ (prüft, dass Zeile 2 an Spalte 0
       eine `covered-table-cell` trägt).

   Das entspricht `zeile-loeschen-req.md` Befund 8 wörtlich („darf **nicht** erneut als
   offener Befund geführt werden“). **Für „Zeile löschen“ ist am ODT-Reader/-Writer nichts
   zu ändern** (Details/Belege Abschnitt 5.2).

5. **`tableEditing()` fixt Tabellenformen automatisch nach jeder Transaktion —
   bestätigt.** `fixTables` ab `dist/index.js` **Zeile 784**, aufgerufen aus dem
   `appendTransaction` von `tableEditing()` (Normalisierung, Zeile ~2619). Zusätzliches,
   bereits vorhandenes Sicherheitsnetz für Grenzfall 18, ersetzt aber nicht die eigene
   Guard-Sonderbehandlung.

**Fazit Abschnitt 1:** Der Umsetzungskern ist Verdrahtung (UI + Command-Wrapper) plus die
**eine** echte Bau-Arbeit — die Guard-Sonderbehandlung „letzte/alle Zeile(n)“ aus Punkt 1.
Weder ODT- noch DOCX-Import/Export müssen angefasst werden.

---

## 2. Architekturentscheidung

- **Neue Tabellen-Befehle in eigenem Modul `tableCommands.ts`.** Grund: mehrere
  Nachbar-Features (`zeile-einfuegen`, `spalte-einfuegen`, `spalte-loeschen`,
  `zellen-verbinden`, `tabelle-loeschen`) brauchen ebenfalls Tabellen-`Command`s; ein
  eigenes Modul vermeidet Sammel-Merge-Konflikte in `commands.ts`.
  **`insertTable` bleibt vorerst unverändert in `commands.ts` (Zeile 92–102) — es wird
  NICHT verschoben** (unnötiger Diff/Regressionsrisiko am funktionierenden
  „Tabelle einfügen“-Button). `commands.ts` bekommt lediglich einen Re-Export der neuen
  Befehle, damit `TableToolbar.tsx` demselben Importstil wie `Toolbar.tsx` folgen kann.
- **Kontextabhängige Werkzeugleiste als eigene Komponente `TableToolbar.tsx`** (nicht in
  `Toolbar.tsx` hineinwachsen) — künftiger gemeinsamer Ort aller Tabellen-Buttons; für
  dieses Feature genau ein Button.
- **SVG-Icons in neuem Modul `icons.tsx`** (Anforderung „kein Emoji/Unicode-Glyph“,
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1; Muster: das bestehende `ScissorsIcon` in
  `Toolbar.tsx:33–53`). **Nicht im Scope:** Migration der bestehenden Glyph-Buttons in
  `Toolbar.tsx` (⊞, 🖼, ⇤, ↔, ⇥, ≡, ⌫, 🖍) — vorbestehende, feature-fremde Abweichung.
- **Kleiner Ausführungs-Helper `runEditorCommand.ts`** für `TableToolbar.tsx`.
  **Achtung — Korrektur gegenüber der früheren Fassung:** Die lokale `run()`-Funktion in
  `Toolbar.tsx` (Zeile 28–31) ruft den Command mit **drei** Argumenten auf —
  `command(view.state, view.dispatch, view)`. Das dritte (`view`) ist **zwingend**, weil
  `cutSelection` (`commands.ts:149–166`) es benötigt (`view.focus()`, `view.dom…execCommand`).
  Der neue Helper **muss** dieselbe Drei-Argument-Signatur haben. Ein Umstellen der 13
  `run(view, …)`-Aufrufstellen in `Toolbar.tsx` auf den neuen Helper ist **optional und
  nicht Teil dieses Plans** (reines Refactoring am funktionierenden Code; falls doch, darf
  das dritte `view`-Argument nicht verloren gehen — sonst bricht „Ausschneiden“).

---

## 3. Neue/geänderte Dateien — Editor-Kern

### 3.1 NEU: `src/formats/shared/editor/tableCommands.ts`

Kernstück des Features. Delegiert den Normalfall an die (verifiziert korrekte) Bibliothek
und behandelt **nur** den Guard-Sonderfall selbst.

```ts
import { deleteRow, isInTable, selectedRect } from 'prosemirror-tables'
import { TextSelection, type Command, type EditorState, type Transaction } from 'prosemirror-state'
import { wordSchema } from '../schema'

/**
 * Löscht die Zeile(n) der aktuellen Tabellen-Selektion (Cursor in einer Zelle ODER
 * CellSelection über eine/mehrere Zeilen — zeile-loeschen-req.md 2.2). Bezieht sich immer
 * auf GANZE Zeilen, unabhängig von der Spaltenmarkierung.
 *
 * Umfasst die Selektion ALLE Zeilen (einzige Zeile ODER CellSelection über sämtliche
 * Zeilen), wird die gesamte Tabelle entfernt (2.4). In genau diesem Fall darf
 * prosemirror-tables' `deleteRow` NICHT verwendet werden: sein interner Guard
 * `rect.top == 0 && rect.bottom == rect.map.height` (dist/index.js:1510) bricht dort still
 * ab (kein dispatch, Rückgabe true) — siehe zeile-loeschen-code.md Abschnitt 1, Punkt 1.
 */
export function deleteTableRow(): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) return false

    let rect: ReturnType<typeof selectedRect>
    try {
      rect = selectedRect(state)
    } catch {
      // Defensiver Fallback für strukturell unerwartete Tabellen (Grenzfall 18):
      // lieber unveränderter Ausgangszustand als eine halb ausgeführte Löschung.
      return false
    }

    const wholeTableSelected = rect.top === 0 && rect.bottom === rect.map.height
    if (!dispatch) return true // Verfügbarkeit: in einer Tabelle immer „möglich“ (s. u.)

    if (wholeTableSelected) return removeWholeTable(state, dispatch, rect)

    // Normalfall: an die Bibliothek delegieren. `deleteRow` entfernt alle von der
    // CellSelection berührten Zeilen von unten nach oben in EINER Transaktion und bildet
    // die Selektion auf eine gültige Zelle ab (Grenzfälle 1/2/3/6/7/8/9/16, Undo = 1 Schritt).
    return deleteRow(state, dispatch)
  }
}

/**
 * Verfügbarkeit für den Button-Zustand. Bewusst identisch zu `isInTable`:
 * `deleteTableRow` tut in JEDEM Tabellenkontext etwas Sichtbares — im Normalfall Zeile(n)
 * löschen, im Guard-Fall die ganze Tabelle entfernen (2.4, Variante a). Es gibt daher
 * KEINEN Zustand, in dem der Button ein stiller No-Op wäre; ein guard-abhängiges
 * `disabled` (wie es der dispatch-lose `deleteRow`-Check nahelegen würde) ist deshalb
 * WEDER nötig NOCH gewünscht — es würde den zulässigen Weg „letzte Zeile → Tabelle weg“
 * fälschlich sperren. Erfüllt zeile-loeschen-req.md Abschnitt 6, Zeile 3 / Abschnitt 2.8.
 */
export function canDeleteTableRow(state: EditorState): boolean {
  return isInTable(state)
}

/**
 * Entfernt die gesamte Tabelle (Sonderfall „alle/letzte Zeile(n)“, 2.4) und hält dabei
 * stets einen gültigen Dokumentzustand. Nutzt das bereits berechnete `rect`:
 * `rect.tableStart` ist die Position DIREKT INNERHALB der Tabelle, der Tabellenknoten
 * selbst beginnt also bei `rect.tableStart - 1`.
 */
function removeWholeTable(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  rect: ReturnType<typeof selectedRect>,
): boolean {
  const from = rect.tableStart - 1
  const to = from + rect.table.nodeSize
  const parent = state.doc.resolve(from).parent
  const tr = state.tr

  if (parent.childCount === 1) {
    // Tabelle ist einziges Kind ihres Containers — Dokumentwurzel (doc: 'block+',
    // schema.ts:14) ODER eine äußere Tabellenzelle (cellContent: 'block+', bei
    // verschachtelten Tabellen, Grenzfall 13). Ersatz durch leeren Absatz statt
    // ersatzlosem Entfernen, sonst verletzt man das 'block+'-Content-Modell.
    tr.replaceWith(from, to, wordSchema.nodes.paragraph.createAndFill()!)
    tr.setSelection(TextSelection.near(tr.doc.resolve(from + 1)))
  } else {
    tr.delete(from, to)
    // Bias bewusst NICHT -1 (siehe Revisionshinweis 3): `Selection.near($pos, bias)`
    // sucht zuerst in Richtung `bias`, erst als Fallback rückwärts (prosemirror-state
    // `static near`: `findFrom($pos, bias) || findFrom($pos, -bias)`). Verlangt ist
    // "nachfolgender Absatz bevorzugt, vorhergehender als Fallback" (2.5) — das ist
    // die STANDARD-Richtung (bias = 1, vorwärts zuerst), nicht -1. Ein -1 hier würde
    // die Prioritätsreihenfolge exakt umkehren.
    tr.setSelection(TextSelection.near(tr.doc.resolve(from)))
  }
  dispatch(tr.scrollIntoView())
  return true
}
```

Anmerkungen:
- **Warum Delegation statt eigener Lösch-Schleife:** Die frühere Fassung baute die
  bottom→top-Schleife aus `deleteRow` per Hand nach, um danach eine spaltengenaue
  Cursor-Position zu setzen. Das ist zusätzliches Off-by-one-/Mapping-Risiko für einen
  Nutzen (spaltengleiche Zelle), den Abschnitt 2.5 nur „bevorzugt“ verlangt — die von
  `deleteRow` automatisch neu abgebildete Selektion ist bereits „eine sinnvolle Zelle“ und
  hält den Editor fokussiert/bedienbar. Delegation ist robuster. Falls E2E-Tests eine
  spaltengenaue Position doch erfordern, kann die Schleife später additiv nachgezogen
  werden (siehe Abschnitt 8, „optional“).
- `ReturnType<typeof selectedRect>` als rect-Typ vermeidet einen fragilen Typ-Import (der
  Rückgabetyp wird nicht unter stabilem Namen exportiert).
- **Warum `canDeleteTableRow` trotz des `try/catch` in `deleteTableRow` nie zu einem
  stillen No-Op führt:** `isInTable(state)` prüft, ob **irgendein** Vorfahre von
  `state.selection.$head` die `tableRole` `"row"` trägt (`prosemirror-tables`
  `dist/index.js:390-393`). Das Schema (`tableNodes(...)`, `schema.ts:154`) erlaubt einer
  `table_row` **ausschließlich** `table_cell`/`header_cell`-Kinder — liegt `$head` also
  innerhalb eines `row`-Vorfahren, liegt es zwangsläufig **auch** innerhalb eines
  `cell`-Vorfahren derselben Zeile. `selectionCell` (von `selectedRect` intern genutzt,
  `dist/index.js:398-405`) findet über `cellAround($head)` in genau diesem Fall immer eine
  Zelle. Der `try/catch` um `selectedRect` in `deleteTableRow` ist also, **solange
  `isInTable(state)` true ist**, strukturell unerreichbar (reines Defense-in-Depth, kein
  tatsächlicher Divergenzpfad) — `canDeleteTableRow(state) = isInTable(state)` kann demnach
  nie „aktiviert“ anzeigen, während `deleteTableRow` intern still `false` zurückgibt.

### 3.2 GEÄNDERT: `src/formats/shared/editor/commands.ts`

- **`insertTable` (Zeile 92–102) bleibt unverändert** (kein Verschieben).
- **Ergänzen** (bei den übrigen Re-Exports, in der Nähe von `export { isInTable }`,
  Zeile 6): `export { deleteTableRow, canDeleteTableRow } from './tableCommands'`.
- Sonst keine Änderung an dieser Datei.

### 3.3 NEU: `src/formats/shared/editor/icons.tsx`

SVG-Icon für „Zeile löschen“ (kein Glyph). Muster analog `ScissorsIcon`
(`Toolbar.tsx:33–53`).

```tsx
/** Eingebettete SVG-Icons für Tabellen-Kontextfunktionen (kein Emoji/Unicode-Glyph,
 *  FEATURE-SPEC-DOCX-ODT.md Abschnitt 20.1). Gemeinsamer Ablageort für „Zeile löschen“
 *  und künftige Nachbar-Tabellenfeatures. */
export function RowDeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <rect x="1.5" y="2.5" width="13" height="3" rx="0.5" stroke="currentColor" />
      <rect x="1.5" y="6.5" width="13" height="3" rx="0.5" stroke="currentColor" fill="currentColor" fillOpacity="0.25" />
      <rect x="1.5" y="10.5" width="13" height="3" rx="0.5" stroke="currentColor" />
      <path d="M4 6.5 L12 9.5 M12 6.5 L4 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
```
(Visuelle Detailausgestaltung beim Bau final; Kernpunkt: SVG statt Glyph, `aria-hidden`.)

### 3.4 NEU: `src/formats/shared/editor/runEditorCommand.ts`

Korrekte Drei-Argument-Signatur (siehe Abschnitt 2). Wird von `TableToolbar.tsx` genutzt.

```ts
import type { Command } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'

/** Führt einen ProseMirror-Command gegen die aktive View aus und stellt den Fokus wieder
 *  her. Reicht `view` als drittes Argument durch — Commands wie `cutSelection` benötigen
 *  es; ein Weglassen würde diese brechen (siehe Toolbar.tsx `run()`, Zeile 28–31). */
export function runEditorCommand(view: EditorView, command: Command) {
  command(view.state, view.dispatch, view)
  view.focus()
}
```

### 3.5 GEÄNDERT: `src/formats/shared/editor/Toolbar.tsx`

**Keine Änderung nötig oder geplant.** Der „Zeile löschen“-Button lebt ausschließlich in
`TableToolbar.tsx` (Anforderungsdatei Abschnitt 1: eigene, kontextabhängige Leiste, nicht
ein weiterer Button in der stets sichtbaren Haupt-Toolbar). Die lokale `run()`-Funktion
(Zeile 28–31) und ihre 13 Aufrufstellen bleiben unverändert.

### 3.6 NEU: `src/formats/shared/editor/TableToolbar.tsx`

```tsx
import type { EditorView } from 'prosemirror-view'
import { canDeleteTableRow, deleteTableRow, isInTable } from './commands'
import { runEditorCommand } from './runEditorCommand'
import { RowDeleteIcon } from './icons'

interface TableToolbarProps {
  view: EditorView
}

/**
 * Kontextabhängige Werkzeugleiste für Tabellenoperationen — sichtbar ausschließlich,
 * während sich Cursor/Selektion in einer Tabelle befindet (isInTable). Gemeinsamer Ort
 * für alle Tabellen-Kontextfunktionen (zeile-loeschen-req.md Abschnitt 1, Zugriffsweg 1);
 * für dieses Feature genau ein Button.
 */
export function TableToolbar({ view }: TableToolbarProps) {
  if (!isInTable(view.state)) return null

  return (
    <div
      role="toolbar"
      aria-label="Tabellenwerkzeuge"
      className="flex flex-wrap items-center gap-1 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900/60 px-2 py-1"
    >
      <button
        type="button"
        title="Zeile löschen"
        aria-label="Zeile löschen"
        disabled={!canDeleteTableRow(view.state)}
        onMouseDown={(e) => {
          e.preventDefault()
          runEditorCommand(view, deleteTableRow())
        }}
        className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <RowDeleteIcon />
      </button>
    </div>
  )
}
```

`disabled={!canDeleteTableRow(...)}` ist hier faktisch nie `true` (die Leiste rendert nur
in einer Tabelle) — bewusst mitgeführt für Konsistenz mit den Nachbar-Buttons und als
explizite Umsetzung von Abnahmekriterium 3 (keine stille No-Op-Fläche).

**Positionierung — statische zweite Leiste statt schwebendes Overlay:** Die
Anforderungsdatei verlangt nur, dass die Leiste **erscheint, während** der Cursor in einer
Tabelle ist — keine am Cursor schwebende Positionierung. Eine feste zweite Symbolleiste
direkt unter der Haupt-Toolbar erfüllt das risikoärmer (keine Scroll-/Positionierungs- und
keine zusätzliche Selection-Sync-Fehlerquelle) als ein Floating-Overlay. Ein Overlay wäre
eine spätere rein optische Verbesserung.

### 3.7 GEÄNDERT: `src/formats/shared/editor/WordEditor.tsx`

- **Import ergänzen** (nach `import { Toolbar } from './Toolbar'`, Zeile 16):
  ```ts
  import { TableToolbar } from './TableToolbar'
  ```
- **JSX ergänzen.** Die bestehende Toolbar-Zeile (**Zeile 170**) lautet aktuell **exakt**:
  ```tsx
  {viewRef.current && <Toolbar view={viewRef.current} cutError={cutError} setCutError={setCutError} />}
  ```
  **Diese Zeile bleibt unverändert** (insbesondere `cutError`/`setCutError` dürfen NICHT
  entfallen — `Toolbar` verlangt sie, `Toolbar.tsx:113`). Direkt darunter einfügen:
  ```tsx
  {viewRef.current && <TableToolbar view={viewRef.current} />}
  ```
  > Korrektur gegenüber der früheren Fassung, die hier fälschlich
  > `<Toolbar view={viewRef.current} />` ohne die beiden Pflicht-Props zitierte/ersetzte —
  > das hätte den „Ausschneiden“-Fehlerpfad zerstört.

> **Revisionshinweis 3 (dieser Durchgang — kritische Prüfung gegen den realen Code, keine
> Übernahme des Vorgängerplans):** Alle Datei-Fundstellen dieses Plans wurden erneut Zeile
> für Zeile gegen den aktuellen Quelltext **und** die installierte `prosemirror-tables`-Version
> geprüft (inkl. Blick in `node_modules/prosemirror-tables/dist/index.js` und
> `node_modules/prosemirror-state/dist/index.js`). Ergebnis: der Plan war größtenteils exakt
> (jede zitierte Zeile/Codezeile stimmte). Vier konkrete Korrekturen:
> 1. **Echter Bug in `removeWholeTable` (Abschnitt 3.1) behoben:** Der `else`-Zweig setzte
>    `TextSelection.near(tr.doc.resolve(from), -1)`. `Selection.near($pos, bias)`
>    (`prosemirror-state/dist/index.js`, `static near`) sucht **zuerst in Richtung `bias`,
>    erst danach in Gegenrichtung** (`findFrom($pos, bias) || findFrom($pos, -bias)`).
>    `bias = -1` sucht also **zuerst rückwärts** (vorhergehender Absatz) und erst als
>    Fallback vorwärts — exakt **entgegengesetzt** zu `zeile-loeschen-req.md` Abschnitt 2.5
>    („Cursor in den **nachfolgenden** … Absatz, falls keiner existiert, vorhergehenden“).
>    Fix: Standard-Bias (`1`, vorwärts zuerst) verwenden, wie im `if`-Zweig (leerer Absatz)
>    bereits korrekt (implizit über `from + 1`, das ohnehin innerhalb des neuen Absatzes
>    liegt) der Fall. Codeblock und Erläuterung in Abschnitt 3.1 sind entsprechend korrigiert.
> 2. **Stale Zeilenangabe:** `docx/reader.ts`s `parseTable` endet inzwischen bei Zeile **364**,
>    nicht 360 (zwischenzeitlich kam ein `MAX_TABLE_NESTING_DEPTH`-Guard mit `depth`-Parameter
>    hinzu, s. Abschnitt 5.1) — Start (311) und Substanz des Befunds (vMerge→rowspan-Rekonstruktion
>    korrekt) unverändert.
> 3. **Faktenfehler korrigiert:** „14 `run(view, …)`-Aufrufstellen“ in `Toolbar.tsx` — nachgezählt
>    (`grep -n "run(view" Toolbar.tsx`) sind es **13** (die 14. „Fundstelle“ war die
>    Funktionsdefinition selbst, keine Aufrufstelle).
> 4. **Testdateinamen an bestehende Konvention angeglichen:** Jedes existierende
>    `__tests__`-File in `src/formats/docx/`/`odt/` nutzt durchgängig Kebab-Case
>    (`cut-roundtrip.test.ts`, `blank-document.test.ts`, `external-fixtures.test.ts`,
>    `external-validation.test.ts`) — keines nutzt ein Binnen-Camel plus Punkt wie das
>    ursprünglich vorgeschlagene `rowDelete.roundtrip.test.ts`. In Abschnitt 6.2/6.3/6.4 auf
>    `row-delete-roundtrip.test.ts` (docx/odt) bzw. `row-delete-cross-format.test.ts`
>    umbenannt — reiner Namens-Fix, keine inhaltliche Änderung.
>
> Zusätzlich ergänzt (kein Fehler, aber eine bislang unbelegte Behauptung): eine explizite
> Begründung, warum `canDeleteTableRow`s isInTable-only-Definition **nie** zu einem stillen
> No-Op führen kann, obwohl `deleteTableRow` defensiv ein `try/catch` um `selectedRect` legt
> (Abschnitt 3.1, Anmerkungen).

- **Keine weiteren Änderungen.** `columnResizing()`/`tableEditing()` (**Zeile 109–110**),
  `history()` (Zeile 84) und die `keymap`-Konfiguration mit `Mod-z`/`Mod-y`/`Mod-Shift-z`
  (**Zeile 93–95**) decken Undo/Redo (2.6) bereits ab — **kein neuer Keymap-Eintrag** für
  „Zeile löschen“ (Anforderungsdatei Abschnitt 1, Zugriffsweg 3: bewusst keine Tastenkombination).
- Der `mouseup`-Handler `reconcileSelectionOnClick` (**Zeile 43–50**, Handler definiert
  143–153, per `addEventListener` registriert **Zeile 154–155**) bleibt **unverändert**;
  seine Wirksamkeit auch nach einer
  Tabellen-Struktur-Transaktion wird durch den Regressionstest 6.6/7 **verifiziert**, nicht
  nur angenommen (Anforderungsdatei 2.7).

### 3.8 GEÄNDERT: `src/index.css`

Verifiziert: `src/index.css` (Tailwind v4, `@import 'tailwindcss'`; über `main.tsx`
eingebunden) enthält `.ProseMirror`-Regeln, aber **keinerlei** `.selectedCell`-Regel
(Volltextsuche über `src/`: kein Treffer). `prosemirror-tables` setzt bei einer per Maus
aufgezogenen `CellSelection` die Klasse `selectedCell` per Decoration — ohne CSS ist die
Selektion jedoch **unsichtbar**. Für die Grenzfälle 2/3 und den Entf-Abgrenzungstest
(6.6/6) muss ein aufgezogener Zeilen-/Zellbereich sichtbar sein. Ergänzen (verändert keine
bestehende Regel):
```css
/* Von prosemirror-tables' CellSelection-Decoration gesetzt — ohne diese Regel ist eine
   per Maus aufgezogene Zeilen-/Zellselektion unsichtbar. */
.ProseMirror .selectedCell {
  position: relative;
}
.ProseMirror .selectedCell::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  background: rgba(37, 99, 235, 0.15);
  pointer-events: none;
}
```

---

## 4. Zugriffswege — Entscheidung je Weg (Abnahmekriterium 2)

| # | Weg | Entscheidung | Begründung/Umsetzung |
|---|---|---|---|
| 1 | Kontextabhängige Tabellen-Werkzeugleiste, Button „Zeile löschen“ | **Umgesetzt** | Abschnitt 3.6/3.7 |
| 2 | Rechtsklick-Kontextmenü „Zeilen löschen“ | **Bewusst nicht umgesetzt** | Kein eigenes `contextmenu`-Handling; das native Kontextmenü bleibt erreichbar (bewusste projektweite Entscheidung, `WordEditor.tsx:117–121`, analog `ausschneiden-req.md` Abschnitt 1). „Zeile löschen“ ist ausschließlich über Weg 1 erreichbar. Diese Zeile **ist** die geforderte Dokumentation. |
| 3 | Tastenkombination | **Bewusst nicht umgesetzt** | Kein Referenzverhalten in Word/LibreOffice; kein Keymap-Eintrag. |
| 4 | Entf/Rücktaste bei `CellSelection` | **Bereits vorhanden, keine Codeänderung** | Abschnitt 1, Punkt 3 — `CellSelection.replace` leert nur Inhalt. Nur Testabsicherung (6.6/6). |
| 5 | Bestätigungsdialog | **Bewusst nicht umgesetzt** | Strg+Z (`history()`) ist das Sicherheitsnetz. |
| 6 | Mobile/Touch | **Über Weg 1 abgedeckt** | `TableToolbar`-Button ist ein normales `<button>` ohne Hover-Abhängigkeit — per Tap erreichbar. Nachweis über E2E ohne Projekt-Einschränkung (6.6). |

---

## 5. Import/Export — Analyse (verifiziert)

### 5.1 DOCX — keine Anpassung an Reader/Writer nötig

`src/formats/docx/writer.ts` `tableToDocx` (**Zeile 158–201**) und
`src/formats/docx/reader.ts` `parseTable` (**Zeile 311–364** — inzwischen mit `depth`-Parameter
und `MAX_TABLE_NESTING_DEPTH`-Guard gegen Stack-Overflow bei pathologisch tief verschachtelten
Fremddateien, Revisionshinweis 3; Substanz der vMerge→rowspan-Rekonstruktion unverändert)
verarbeiten die
Tabellenstruktur bei jedem Export/Import komplett neu aus dem aktuellen
ProseMirror-Dokument. Da „Zeile löschen“ nur den ProseMirror-Zustand ändert, spiegelt ein
nachfolgender Export automatisch die reduzierte Zeilenzahl:
- `colCount`/`tblGrid` aus `rows[0]` inkl. `colspan`-Summe (**Writer Zeile 160–161**) —
  kein verwaistes `<w:tr>` möglich.
- `vMerge`/`gridSpan` werden pro Zeile aus dem `pending[]`-Array neu erzeugt
  (**Writer Zeile 163–193**: `restart` bei 188, Fortsetzung `<w:vMerge/>` bei 174) bzw.
  beim Import über ein spaltenweises `anchors[]`-Array rekonstruiert
  (**Reader Zeile 317–356**). Bereits durch den Rowspan-Rundreise-Test
  `docx/__tests__/roundtrip.test.ts:279–300` („preserves vertically merged cells (rowspan)“)
  abgesichert.
- Bilder in gelöschten Zellen verschwinden automatisch aus dem Export, weil der
  `ImageCollector` nur beim rekursiven Ablaufen des (bereits reduzierten) Dokumentbaums
  befüllt wird (`writer.ts`, `blockToDocx`/`tableToDocx`) — ein gelöschtes Bild wird nie
  besucht, landet nie in `word/media/`. Kein Code für 5.2-Testfall 6 (DOCX) nötig.

**Fazit DOCX:** reine Editor-Änderung; Reader/Writer unangetastet. Durch die neuen
Rundreise-Tests (6.2) zu **bestätigen**.

### 5.2 ODT — keine Anpassung an Reader/Writer nötig (frühere „Bugfix“-Annahme war falsch)

Verifiziert (siehe Abschnitt 1, Punkt 4):
- `src/formats/odt/writer.ts` `case 'table'` (**Zeile 110–175**) berechnet `colCount`
  korrekt als `colspan`-Summe (Zeile 115–116) und emittiert `<table:covered-table-cell/>`
  für horizontale (Zeile 160–162) **und** vertikale (Zeile 126, 135–140, 165–167)
  Überdeckung. **Bereits ODF-konform.**
- `src/formats/odt/reader.ts` `table`-Fall (**Zeile 301–321**) liest je Zeile nur
  `<table:table-cell>` (Zeile 304) und rekonstruiert `colspan`/`rowspan` aus
  `number-columns-/rows-spanned` (Zeile 305–306). Das Überspringen von
  `covered-table-cell` ist für das ProseMirror-Modell selbstkonsistent (überdeckte
  Rasterpositionen dürfen im `content`-Array einer Zeile nicht auftauchen). Für dieses
  Feature **keine Änderung**; für fremde ODT-Dateien mit vertikalen Verbindungen bleibt es
  eine bekannte, geteilte Import-Asymmetrie (Rundreise-Testfall 9, als **Abhängigkeit** der
  gemeinsamen Import-Infrastruktur zu kennzeichnen, nicht als `zeile-loeschen`-Fehler —
  Anforderungsdatei Befund 8).

Wie DOCX ist „Zeile löschen“ auch für ODT eine reine Editor-Änderung, die ein
nachfolgender Export automatisch abbildet. **Kein ODT-Bugfix, keine Voraussetzung für
Abnahmekriterium 8** (die frühere Fassung dieses Plans lag hier falsch). Nachweis durch
die neuen Rundreise-Tests (6.3), die auf die bereits vorhandene, korrekte
`covered-table-cell`-Logik aufsetzen.

Optional (Wartbarkeit, keine Verhaltensänderung): ein Kommentar am ODT-Reader-`table`-Fall,
dass `covered-table-cell` bewusst übersprungen wird.

---

## 6. Tests

### 6.1 NEU: `src/formats/shared/editor/__tests__/deleteTableRow.test.ts`

Unit-Tests gegen `deleteTableRow()`/`canDeleteTableRow()` über direkt konstruierte
`EditorState`s (Muster wie `commands.test.ts`/`pagination.test.ts` im selben `__tests__`).
Deckt ab:

| Testfall | Grenzfall (req) |
|---|---|
| Kollabierter Cursor in einer Zelle einer 3-Zeilen-Tabelle → mittlere Zeile weg, Zeile 1/3 bleiben, Reihenfolge korrekt | 3.1 |
| `CellSelection` über 2 von 4 Spalten einer Zeile → komplette Zeile weg, nicht nur markierte Zellen | 3.2 |
| `CellSelection` über 2 vollständige Zeilen (von 4) → beide in einer Transaktion weg | 3.3 |
| Tabelle mit genau 1 Zeile → gesamte Tabelle weg, Cursor im umgebenden Absatz | 3.4 / 2.4 |
| Tabelle mit 1 Zeile als **einziges** Dokumentelement → danach genau ein leerer Absatz, kein leeres `doc` | 2.4 |
| `CellSelection` über **alle** Zeilen einer **mehrzeiligen** Tabelle → Tabelle-komplett-Pfad (kein stiller No-Op wie bei `deleteRow` direkt) | 3.4 / Abschnitt 1 Punkt 1 |
| Rowspan-Ankerzeile gelöscht → Inhalt migriert in Folgezeile, `rowspan` dekrementiert | 3.6 |
| Nur überdeckte Zeile (nicht Anker) gelöscht → Ankerzelle `rowspan-1`, Inhalt unverändert | 3.7 |
| Erste Zeile gelöscht → keine Off-by-one-Verschiebung bei Folgeoperation | 3.8 |
| Letzte Zeile (bei >1) gelöscht → Tabelle bleibt, Cursor sinnvoll | 3.9 |
| Zelle mit mehreren Absätzen/Bild in gelöschter Zeile → Knoten vollständig weg, kein Rest andernorts | 3.12 |
| Verschachtelte Tabelle: innere einzeilige Tabelle, deren einzige Zeile gelöscht wird → Zelle erhält Ersatz-Absatz (`removeWholeTable`-Fallback), kein Absturz | 3.13 |
| `deleteTableRow` ohne Tabellenkontext → `false`, keine Exception, `dispatch` nicht aufgerufen; `canDeleteTableRow` → `false` | 3.15 |
| Große Tabelle (>5 Spalten, >10 Zeilen) → mittlere Zeile gelöscht, alle übrigen Inhalte/Reihenfolge unverändert | 3.17 |
| Reine `colspan`-Zelle (kein rowspan) in gelöschter Zeile → Zelle vollständig weg, keine Migration | 3.16 |

Zusätzlich: `deleteTableRow` erzeugt **genau einen** `dispatch(tr)` pro Ausführung
(Voraussetzung für Undo = ein Schritt, 2.6). Undo/Redo selbst wird auf E2E-Ebene (6.6)
geprüft.

### 6.2 NEU: `src/formats/docx/__tests__/row-delete-roundtrip.test.ts`

> Dateiname an die im Verzeichnis durchgängig verwendete Kebab-Case-Konvention angeglichen
> (`cut-roundtrip.test.ts`, `blank-document.test.ts`, `external-fixtures.test.ts`,
> `external-validation.test.ts`) — Revisionshinweis 3.

Führt den **echten** Befehl aus (nicht: fertiges Nach-Löschen-JSON konstruieren):
`EditorState` mit Tabelle → `deleteTableRow()` → `state.doc.toJSON()` als `body` →
`writeDocx` → `readDocx` → prüfen. Deckt 5.2-Testfälle 1,3,4,5,6,7,13 (DOCX):
1. Mehrzeilige Tabelle, eine Zeile gelöscht → Zeile fehlt, Rest unverändert, `tblGrid` konsistent.
3. Rowspan-Anker gelöscht → `rowspan` der verbleibenden Zelle korrekt dekrementiert, migrierter Inhalt an richtiger Stelle.
4. Colspan-Zeile gelöscht → Zeile inkl. verbundener Zelle komplett weg, übrige `gridSpan` unangetastet.
5. Einzige Zeile gelöscht → keine leere Tabelle, Nachbarabsätze unverändert.
6. Zeile mit Bild gelöscht → Bild nicht mehr enthalten; erzeugtes ZIP per `JSZip` öffnen und prüfen, dass `word/media/` keine verwaiste Datei enthält.
7. Mehrzeilen-`CellSelection` gelöscht → exakt erwartete Zeilen fehlen.
13. Große Tabelle, mittlere Zeile gelöscht → alle übrigen Inhalte identisch/Reihenfolge unverändert.

### 6.3 NEU: `src/formats/odt/__tests__/row-delete-roundtrip.test.ts`

Analog 6.2 für ODT (`writeOdt`/`readOdt`), Testfälle 2,3,4,5,6,7,13.
**Wichtig — nutzt die bereits vorhandene, korrekte `covered-table-cell`-Logik**; es wird
**kein** Writer-Bug „nachgewiesen/gefixt“ (den es nicht gibt). Die bestehenden Tests
`odt/__tests__/roundtrip.test.ts:275` (colspan) und `:310–339` (rowspan) bleiben der
Beleg für die Placeholder-Korrektheit und dürfen **nicht** dupliziert werden. Ergänzend
sinnvoll:
- Rowspan-Paar bleibt bei Löschung einer **anderen** Zeile unberührt → Export → das rohe
  `content.xml` (aus dem `Blob`) enthält weiterhin die erwarteten `covered-table-cell`
  an den überdeckten Rasterpositionen (raw-XML-Assertion, nicht nur eigener Reimport).
- Rowspan-Anker selbst gelöscht (Testfall 3) → Export → Reimport → `rowspan` der
  verbleibenden Zelle korrekt reduziert, keine verwaiste `number-rows-spanned`-Referenz.

### 6.4 NEU: `src/formats/shared/editor/__tests__/row-delete-cross-format.test.ts`

5.2-Testfälle 10,11,12:
- ODT (im Test erzeugt) → `readOdt` → `deleteTableRow` → `writeDocx` → `readDocx` → Struktur konsistent.
- Umgekehrt: DOCX → Zeile löschen → ODT → Reimport.
- Doppelte Rundreise DOCX → Zeile löschen → ODT → DOCX → Inhalt weiterhin = erwarteter Nach-Löschen-Zustand (Text-/Strukturverlust unzulässig; Cross-Format-Formatierungsverluste dokumentieren).

### 6.5 NEU: reale Fixture-Fälle (Grenzfall 18 / Baseline 5.1)

Ergänzung in 6.2/6.3 (Fixture-Ladepfad aus `external-fixtures.test.ts` wiederverwenden).
Verifiziert vorhandene, einschlägige Fixtures:
`tests/fixtures/external/odt/`: `tableRowDeletionTest.odt` (direkt einschlägig),
`tableOps.odt`, `tableCoveredContent.odt`, `tableComplex_DOC_LO41.odt`,
`table-column-delete-with-merge.odt`, `mergedCells.odt`, `subTables.odt`/`subTables2.odt`
(verschachtelt, Grenzfall 13), `BigTable.odt`/`crazyTable.odt` (groß/exotisch);
`tests/fixtures/external/docx/`: `deep-table-cell.docx`, `TestTableColumns.docx`,
`table-indent.docx`.
Vorgehen: Datei importieren → Cursor programmatisch in die erste Zelle der ersten Tabelle
setzen → `deleteTableRow` → Assertion: **kein Wurf**, Ergebnis bleibt gültiges
`wordSchema`-Dokument (`wordSchema.nodeFromJSON(result.body)` wirft nicht) und übersteht
`writeOdt`/`writeDocx` + Reimport. Deckt Baseline 5.1 (reale Datei mit echter
Löschoperation) und Grenzfall 18.

### 6.6 NEU: `tests/e2e/table-row-delete.spec.ts`

Muster wie `tests/e2e/selection-regression.spec.ts` (verifiziert: `odtCard`-Helper Zeile 3,
`getByTitle(...)`, Test „same regression inside a table cell“ Zeile 43; echte Interaktion
über `page.keyboard`/`page.mouse`). Läuft **ohne** Projekt-Einschränkung → automatisch auf
allen drei Projekten (`playwright.config.ts`: Desktop Chrome, Mobile/Pixel 7,
Tablet/iPad Mini) → deckt Testfall 15 (Mobile/Tablet) ohne Zusatzcode. Testfälle (req
Abschnitt 7):
1. 3 Zeilen, Cursor in mittlere Zeile, `getByTitle('Zeile löschen')` klicken → mittlere weg, 1/3 bleiben.
2. Zwei komplette Zeilen per `page.mouse` aufziehen (`CellSelection`), löschen → beide weg, dritte bleibt.
3. Teilbereich einer Zeile (nicht alle Spalten) markieren, löschen → komplette Zeile weg.
4. `CellSelection` über **alle** Zeilen → löschen → Tabelle verschwindet, kein stiller No-Op (Guard, Grenzfall 4).
5. Tabelle mit genau 1 Zeile → löschen → Tabelle weg, Editor bleibt bedienbar (Tippen ohne weiteren Klick).
6. Tabelle mit rowspan (2 Zeilen) → Ankerzeile löschen → verbleibende Zeile zeigt migrierten Inhalt.
7. **Pflicht-Regressionstest Selection-Sync (2.7/Grenzfall 14):** Tabelle → Zeile löschen → per Klick in verbleibende Zelle neu positionieren → Enter → weiter tippen → Dokument konsistent, keine unbeabsichtigte Komplett-Löschung.
8. Entf bei markierter `CellSelection` einer ganzen Zeile → nur Zellinhalte geleert, Zeile bleibt strukturell (Abgrenzungstest, Abschnitt 1 Punkt 3).
9. Strg+Z direkt nach „Zeile löschen“ → exakter Ursprungszustand; danach Strg+Y → erneut identisch entfernt.
10. „Zeile löschen“ ohne Tabellenkontext (Cursor im Fließtext) → Button nicht sichtbar (`getByTitle('Zeile löschen')` nicht vorhanden/sichtbar), keine Konsole-/`pageerror`-Exception.
11. Export nach DOCX über echten Download-Flow → Reimport → siehe 6.2/1.
12. Dasselbe für ODT.
13. Große Tabelle per echtem Datei-Import (Fixture aus 6.5), mittlere Zeile per Toolbar löschen → übrige Inhalte sichtbar unverändert.
14. Verschachtelte Tabelle (`subTables*.odt`) → Zeile der äußeren Tabelle mit innerer Tabelle löschen → kein Absturz, innere Tabelle verschwindet mit (Grenzfall 13).

---

## 7. Abnahmekriterien-Abgleich (Definition of Done, req Abschnitt 9)

| # | Kriterium | Abgedeckt durch |
|---|---|---|
| 1 | Kontextabhängige Werkzeugleiste mit funktionierendem „Zeile löschen“ | 3.6/3.7, Test 6.6/1 |
| 2 | Jeder Zugriffsweg dokumentiert | Abschnitt 4 |
| 3 | Cursor/Teil-Zeile/Mehrzeilen-Verhalten exakt nach 2.2, inkl. Entf-Abgrenzung | 3.1, Tests 6.1 + 6.6/8 |
| 4 | Guard-Sonderfall (letzte/alle Zeile → Tabelle weg, nie stiller No-Op; einzige Tabelle → leerer Absatz) | 3.1 `removeWholeTable` + `canDeleteTableRow`, Tests 6.1, 6.6/4+5 |
| 5 | Rowspan-Migration, Rowspan-Dekrement, Colspan-Komplettverlust je eigener Test | Tests 6.1 (3.6/3.7/3.16), 6.2/6.3 Testfall 3/4 |
| 6 | Pflicht-Regressionstest Selection-Sync × Zeile löschen | Test 6.6/7 |
| 7 | Rundreise 5.2 für DOCX **und** ODT grün, inkl. Bild-Verwaisung, unabhängiger Parser | 5.1/5.2 (ohne ODT-Bugfix — keiner nötig), Tests 6.2/6.3/6.4 |
| 8 | Alle Grenzfälle aus req Abschnitt 3 einzeln abgedeckt/dokumentiert | Mapping 6.1/6.6; Grenzfall 20 als Nicht-Scope (Abschnitt 8) |
| 9 | Kein stiller Datenverlust/keine Konsole-Exception | `removeWholeTable`-Fallback (nie leeres `doc`), `try/catch` um `selectedRect`, Test 6.6/10 |
| 10 | Statuswechsel „fehlt“ → „vorhanden“ erst nach 1–9 | Backlog-Pflegeprozess, nachdem alle Tests grün |

---

## 8. Bewusst nicht im Scope

- **Grenzfall 20 (Track-Changes):** Änderungsverfolgung existiert noch nicht
  (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13, Phase 3). „Zeile löschen“ entfernt sofort
  endgültig; keine tote Abstraktion vorwegnehmen.
- **Eigenes Kontextmenü (Zugriffsweg 2):** Abschnitt 4 — explizit nicht gebaut.
- **Migration bestehender Glyph-Buttons in `Toolbar.tsx` auf SVG** und **Umstellen der 14
  `run()`-Aufrufstellen** auf `runEditorCommand`: vorbestehend/optional, kein
  `zeile-loeschen`-Scope (und: das dritte `view`-Argument darf dabei nicht verloren gehen).
- **Verschieben von `insertTable` nach `tableCommands.ts`:** unnötiger Diff; bleibt in
  `commands.ts`.
- **Spaltengenaue Cursor-Neupositionierung nach Mehrzeilen-Löschung:** Abschnitt 2.5
  verlangt sie nur „bevorzugt“; `deleteRow`s automatische Selektions-Neuabbildung genügt.
  Falls E2E doch eine spaltengenaue Position erfordert, additiv als eigene Schleife
  nachrüstbar (Abschnitt 3.1, Anmerkung) — nicht als Erstumsetzung.
- **Nachbar-Tabellenfeatures** (`zeile-einfuegen`, `spalte-einfuegen`, `spalte-loeschen`,
  `zellen-verbinden`, `tabelle-loeschen`): eigene Slugs/`*-req.md`. `TableToolbar.tsx`,
  `icons.tsx`, `tableCommands.ts`, `runEditorCommand.ts` sind als gemeinsame Ablageorte
  angelegt, ihre Umsetzung ist nicht Teil dieses Plans.
