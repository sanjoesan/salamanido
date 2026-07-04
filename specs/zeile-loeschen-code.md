# Umsetzungsplan: Feature „Zeile löschen“

Gegenstück zu `specs/zeile-loeschen-req.md`. Dieser Plan ist das Ergebnis einer
tatsächlichen Codeprüfung (nicht nur Übernahme der Anforderungsdatei) — Abschnitt 1
bestätigt/korrigiert den Ist-Stand-Befund aus der Anforderungsdatei, alle weiteren
Abschnitte sind der dateigenaue Bauplan.

Geltungsbereich wie in der Anforderungsdatei: gemeinsamer Editor
(`src/formats/shared/editor/*`, `src/formats/shared/schema.ts`) für DOCX und ODT;
Import/Export bleibt formatspezifisch (`src/formats/docx/*`, `src/formats/odt/*`).

---

## 1. Bestätigung des Ist-Stands (eigene Codeprüfung)

Der Befund in `zeile-loeschen-req.md` Abschnitt 0 trifft zu, mit drei zusätzlichen,
für die Umsetzung relevanten Präzisierungen, die die Anforderungsdatei nicht (oder nur
implizit) benennt:

1. **`prosemirror-tables`s `deleteRow` ist für den Sonderfall „letzte Zeile“ nicht direkt
   verwendbar.** Quelltext (`node_modules/prosemirror-tables/dist/index.js`, Funktion
   `deleteRow`, ca. Zeile 1506–1522):
   ```js
   function deleteRow(state, dispatch) {
     if (!isInTable(state)) return false;
     if (dispatch) {
       const rect = selectedRect(state), tr = state.tr;
       if (rect.top == 0 && rect.bottom == rect.map.height) return false;   // <-- No-Op!
       ...
   ```
   `deleteRow` verweigert jede Löschung, bei der die Selektion **alle** Zeilen der
   Tabelle umfasst (das ist exakt der Fall „einzige verbleibende Zeile“, Abschnitt 2.4
   der Anforderungsdatei, aber auch der allgemeinere Fall „per `CellSelection` wirklich
   alle Zeilen markiert“). Der Aufruf tut in diesem Fall **gar nichts** und gibt `true`
   zurück (Rückgabewert lügt nicht direkt, aber `dispatch` wird nie aufgerufen) — ein
   naiver Wrapper um `deleteRow` würde Abschnitt 2.4/2.8 der Anforderungsdatei verletzen
   (stiller Fehlschlag: Klick auf „Zeile löschen“ bei einzeiliger Tabelle täte nichts).
   **Konsequenz:** `deleteTableRow` darf `deleteRow` nicht einfach aufrufen, sondern muss
   diesen Fall selbst erkennen und auf Tabellen-Entfernung umleiten (Details Abschnitt 3).

2. **`removeRow` (die von `deleteRow` intern verwendete, ebenfalls öffentlich
   exportierte Funktion) implementiert Rowspan-Migration und Rowspan-Dekrement bereits
   korrekt** (dieselbe Datei, Funktion `removeRow`, Zeile 1470–1500): Wird die
   Ankerzeile einer `rowspan`-Zelle gelöscht, kopiert `removeRow` die Zelle mit
   `rowspan - 1` in die nächste Zeile (`tr.insert(..., copy)`); wird nur eine
   „überdeckte“ Zeile gelöscht, wird lediglich `attrs.rowspan - 1` auf die Ankerzelle
   gesetzt (`tr.setNodeMarkup`). Das deckt Grenzfall 5/6 der Anforderungsdatei bereits
   auf Bibliotheksebene ab — **muss aber, wie die Anforderungsdatei selbst fordert,
   durch einen eigenen Test bestätigt werden**, nicht nur durch dieses Code-Lesen.

3. **Entf/Rücktaste auf einer `CellSelection` löscht bereits heute nur den Zellinhalt**,
   nicht die Struktur — ganz ohne eigene `keymap`-Bindung. Grund:
   `prosemirror-tables`s `CellSelection`-Klasse überschreibt `replace(tr, content)`
   (`dist/index.js`, Zeile 580–588) so, dass **nur der Inhalt jeder erfassten Zelle**
   ersetzt wird, nie die Zeilen-/Zellstruktur. `baseKeymap`s `Backspace`/`Delete`
   (`prosemirror-commands`) rufen letztlich `state.tr.deleteSelection()` auf, was
   intern `this.selection.replace(tr)` aufruft — bei einer `CellSelection` landet man
   also automatisch bei deren überschriebenem `replace()`. Da `WordEditor.tsx` sowohl
   `tableEditing()` (Zeile 82) als auch `keymap(baseKeymap)` (Zeile 80) bereits aktiv
   registriert, **funktioniert Zugriffsweg 4 der Anforderungsdatei (Abschnitt 1, Zeile
   103) schon jetzt korrekt, ganz ohne Codeänderung** — es fehlt nur der Nachweis per
   Test. Das ist eine wichtige Korrektur gegenüber dem „ungeklärt“-Befund der
   Anforderungsdatei: **kein Produktivcode nötig, nur ein Regressionstest.**

4. **Zusätzlicher, in der Anforderungsdatei nicht erwähnter Fund mit direkter Relevanz
   für Abschnitt 4.2, Testfall 3 (Rundreise Rowspan-Löschung, ODT):** Der ODT-Writer
   erzeugt für Zeilen, die von einer `rowspan`-Zelle einer vorherigen Zeile „überdeckt“
   werden, **kein** `<table:covered-table-cell/>`-Element — nach ODF-Spezifikation
   zwingend erforderlich, damit Spaltenzahl und Merge-Referenzen einer Tabelle gültig
   bleiben (siehe `src/formats/odt/writer.ts`, Fallunterscheidung `case 'table'`,
   Zeile 86–111 — dort wird pro Zeile ausschließlich über `row.content` iteriert, ein
   Platzhalter für überdeckte Positionen fehlt komplett; Volltextsuche nach
   `covered-table-cell` im gesamten `src/`-Baum liefert **keinen** Treffer). Der
   bestehende Rundreise-Test `src/formats/odt/__tests__/roundtrip.test.ts`
   („preserves merged cells (colspan/rowspan)“, Zeile 194–209) deckt das nicht auf,
   weil er nur `colspan` in einer einzeiligen Tabelle prüft (`rowspan: 1` überall) —
   ein echter, über zwei Zeilen reichender `rowspan`-Fall wird dort **nicht** getestet
   (anders als im äquivalenten DOCX-Test, Zeile 223–248, der das korrekt abdeckt und
   auch korrekt grün ist, weil `src/formats/docx/reader.ts`/`writer.ts` Spaltenposition
   über ein `anchors[]`-Array sauber nachführen, siehe Abschnitt 5.1 unten).
   Der eigene Lese-Pfad (`src/formats/odt/reader.ts`, Zeile 189–203) übersteht das
   „unsichtbar“, weil er ausschließlich nach `table-cell`-Kindelementen filtert (ein
   fehlendes `covered-table-cell` fällt beim *eigenen* Reimport nicht auf) — die
   erzeugte Datei ist aber nicht ODF-konform und würde in echtem LibreOffice mit
   Spaltenversatz/Darstellungsfehlern importiert. Das ist eine **Vorbedingung**, die vor
   grünen ODT-Rundreise-Tests für „Zeile löschen“ (insbesondere Abschnitt 4.2, Testfall
   3, und die Baseline 4.1) behoben werden muss — siehe Abschnitt 5.2 unten. Ohne diesen
   Fix ist Abnahmekriterium 8 der Anforderungsdatei für ODT nicht ehrlich erfüllbar.

5. **`tableEditing()` registriert bereits ein `appendTransaction`, das `fixTables()`
   aufruft** (Zeile 2618–2619 in `dist/index.js`) und nach jeder Transaktion
   automatisch inkonsistente Tabellenformen (z. B. Zeilen mit falscher Breite)
   repariert. Das ist ein zusätzliches, bereits vorhandenes Sicherheitsnetz für
   Grenzfall 18 (exotische Fremddatei), das im Test explizit ausgenutzt werden kann,
   aber die eigentliche Lösch-Logik nicht ersetzt.

**Fazit Abschnitt 1:** Die Anforderungsdatei ist im Kern korrekt; der Umsetzungsaufwand
ist kleiner als „von Null“, aber größer als „nur Verdrahtung“ — vor allem wegen Punkt 1
(Sonderfall „letzte Zeile“ erfordert eigene Transaktionslogik, kein reiner
`deleteRow`-Aufruf) und Punkt 4 (ODT-Schreibpfad muss für gültige Rowspan-Rundreisen
nachgebessert werden, unabhängig davon, ob man das als Teil dieses Features oder als
Voraussetzung dafür betrachtet — es **blockiert** Abnahmekriterium 8).

---

## 2. Architekturentscheidung

- Neue Tabellen-Befehle bekommen ein eigenes Modul `tableCommands.ts` statt weiter in
  das bereits gemischte `commands.ts` zu wachsen. Grund: Mehrere Nachbar-Features im
  Backlog (`zeile-einfuegen`, `spalte-einfuegen`, `spalte-loeschen`,
  `zellen-verbinden`, `tabelle-loeschen` — je eigene `*-req.md`-Datei im selben
  `specs/`-Verzeichnis) werden voraussichtlich ebenfalls neue Tabellen-`Command`s
  brauchen; ein eigenes Modul vermeidet, dass alle Features denselben
  `commands.ts`-Abschnitt anfassen und sich gegenseitig Merge-Konflikte bereiten.
  `insertTable` (bisher in `commands.ts`) wird in dieses neue Modul verschoben,
  `commands.ts` re-exportiert es weiter, damit **kein** bestehender Importpfad
  (`Toolbar.tsx`) angefasst werden muss.
- Die kontextabhängige Tabellen-Werkzeugleiste bekommt eine eigene Komponente
  `TableToolbar.tsx` statt in `Toolbar.tsx` mit hineinzuwachsen — aus demselben Grund
  (Nachbar-Features werden hier weitere Buttons ergänzen: Zeile oberhalb/unterhalb
  einfügen, Spalte links/rechts einfügen/löschen, Zellen verbinden/teilen, Tabelle
  löschen). Diese Datei ist bewusst so angelegt, dass sie der gemeinsame Ort für **alle**
  Tabellen-Kontextfunktionen wird — für „Zeile löschen“ enthält sie zunächst genau
  einen Button.
- Icons: neues Modul `icons.tsx` für eingebettete SVG-Icons (Anforderung: kein
  Emoji/Unicode-Glyph, siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20, Punkt 1). Auch
  dieses Modul ist als gemeinsamer Ablageort für die Icons der Nachbar-Features gedacht,
  nicht nur für „Zeile löschen“. **Nicht im Scope:** die bereits bestehenden
  Emoji/Unicode-Buttons in `Toolbar.tsx` (⊞, 🖼, ⇧, ⇤, ↔, ⇥, ≡, ⌫, 🖍) werden hier
  **nicht** migriert — das ist eine allgemeine, vorbestehende Abweichung von Abschnitt
  20 der Feature-Spec und gehört nicht zum Slug `zeile-loeschen`.
- Ein kleiner gemeinsamer Helper `runCommand()` wird aus `Toolbar.tsx` herausgezogen
  (dort bisher als lokale Funktion `run()` definiert, Zeile 23–26), damit
  `TableToolbar.tsx` ihn ohne Duplikation mitverwenden kann.

---

## 3. Neue/geänderte Dateien — Editor-Kern

### 3.1 NEU: `src/formats/shared/editor/tableCommands.ts`

Enthält (verschoben aus `commands.ts`):
```ts
export function insertTable(rows: number, cols: number): Command { ... }  // unverändert übernommen
```

Neu:
```ts
import { TableMap, selectedRect, removeRow, isInTable } from 'prosemirror-tables'
import { TextSelection, type Command } from 'prosemirror-state'
import { wordSchema } from '../schema'

/**
 * Löscht die Zeile(n) der aktuellen Tabellen-Selektion (Cursor in einer Zelle oder
 * CellSelection über eine/mehrere Zeilen — siehe zeile-loeschen-req.md Abschnitt 2.2).
 * Bezieht sich immer auf ganze Zeilen, unabhängig davon, wie viele Spalten markiert sind.
 * Löscht die Selektion die einzige verbleibende Zeile bzw. ALLE Zeilen der Tabelle,
 * wird stattdessen die gesamte Tabelle entfernt (Abschnitt 2.4) — dafür wird bewusst
 * NICHT prosemirror-tables' `deleteRow` direkt aufgerufen, weil dessen interne Wächter-
 * Bedingung `rect.top == 0 && rect.bottom == rect.map.height` in genau diesem Fall
 * still (ohne dispatch) abbricht, siehe zeile-loeschen-code.md Abschnitt 1, Punkt 1.
 */
export function deleteTableRow(): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) return false

    let rect: ReturnType<typeof selectedRect>
    try {
      rect = selectedRect(state)
    } catch {
      // Defensiver Fallback für strukturell unerwartete Tabellen (Grenzfall 18) —
      // lieber unveränderter Ausgangszustand als eine halb ausgeführte Löschung.
      return false
    }

    const wholeTableSelected = rect.top === 0 && rect.bottom === rect.map.height
    if (!dispatch) return true

    if (wholeTableSelected) {
      return removeWholeTable(state, dispatch)
    }

    const tr = state.tr
    for (let row = rect.bottom - 1; ; row--) {
      removeRow(tr, rect, row)
      if (row === rect.top) break
      rect.table = rect.tableStart ? tr.doc.nodeAt(rect.tableStart - 1)! : tr.doc
      rect.map = TableMap.get(rect.table)
    }

    // Cursor: gleiche Spalte, bevorzugt die nachrückende Zeile, sonst die vorherige
    // (Anforderung Abschnitt 2.5).
    const finalTable = rect.tableStart ? tr.doc.nodeAt(rect.tableStart - 1)! : tr.doc
    const finalMap = TableMap.get(finalTable)
    const targetRow = rect.top < finalMap.height ? rect.top : Math.max(0, rect.top - 1)
    const targetCol = Math.min(rect.left, finalMap.width - 1)
    const cellPos = finalMap.positionAt(targetRow, targetCol, finalTable)
    tr.setSelection(TextSelection.near(tr.doc.resolve(rect.tableStart + cellPos + 1)))
    dispatch(tr.scrollIntoView())
    return true
  }
}

/**
 * Entfernt die gesamte Tabelle (Sonderfall „letzte Zeile gelöscht“, Abschnitt 2.4).
 * Bleibt dabei stets in einem gültigen Dokumentzustand: Ist die Tabelle das einzige
 * Kind ihres Elternknotens (Dokument-Ebene ODER Zelle einer äußeren Tabelle bei
 * verschachtelten Tabellen, Grenzfall 11), wird ein leerer Absatz eingesetzt statt die
 * Tabelle ersatzlos zu entfernen (sonst Verstoß gegen `content: 'block+'` im Schema).
 */
function removeWholeTable(state: EditorState, dispatch: (tr: Transaction) => void): boolean {
  const $anchor = state.selection.$anchor
  let tableDepth = -1
  for (let d = $anchor.depth; d > 0; d--) {
    if ($anchor.node(d).type.spec.tableRole === 'table') { tableDepth = d; break }
  }
  if (tableDepth === -1) return false // sollte durch isInTable bereits ausgeschlossen sein

  const from = $anchor.before(tableDepth)
  const to = $anchor.after(tableDepth)
  const parent = $anchor.node(tableDepth - 1)
  const tr = state.tr

  if (parent.childCount === 1) {
    const paragraph = wordSchema.nodes.paragraph.createAndFill()!
    tr.replaceWith(from, to, paragraph)
    tr.setSelection(TextSelection.near(tr.doc.resolve(from + 1)))
  } else {
    tr.delete(from, to)
    tr.setSelection(TextSelection.near(tr.doc.resolve(from)))
  }
  dispatch(tr.scrollIntoView())
  return true
}
```

Anmerkungen für die Umsetzung:
- `Rect`/`TableRect`-Typ wird aus `prosemirror-tables` nicht direkt exportiert unter
  diesem Namen für den Rückgabetyp von `selectedRect` — `ReturnType<typeof selectedRect>`
  vermeidet einen zusätzlichen Typ-Import und bleibt stabil, falls die Bibliothek den
  Typnamen ändert.
- Die Schleife im Nicht-Sonderfall spiegelt bewusst `deleteRow`s eigene interne Schleife
  (`dist/index.js` Zeile 1511–1518), **nicht** weil das nötig wäre, um Mehrzeilen-
  Selektionen korrekt zu entfernen (das könnte man auch mit einem eigenen Aufruf von
  `deleteRow(state, dispatch)` erreichen, solange `wholeTableSelected` false ist), sondern
  weil wir danach selbst eine **deterministische, spaltengenaue Cursor-Position** setzen
  wollen (Abschnitt 2.5) statt uns auf ProseMirrors automatische Selektions-Neuabbildung
  nach der Transaktion zu verlassen, die zwar eine gültige, aber nicht notwendigerweise
  spaltengleiche Position liefert.
- `state.selection.$anchor` statt `$head` in `removeWholeTable`, weil bei einer
  `CellSelection` `$anchorCell`/`$headCell` je nach Zieh-Richtung vertauscht sein können;
  `$anchor` ist für die reine Tiefensuche nach der umgebenden `table`-Rolle unabhängig
  von der Ziehrichtung korrekt, weil jede Zelle der Selektion im selben Tabellen-Ast liegt.

### 3.2 GEÄNDERT: `src/formats/shared/editor/commands.ts`

- Entfernen: Body von `insertTable` (Zeile 76–86).
- Ersetzen durch: `export { insertTable, deleteTableRow } from './tableCommands'`
- `isInTable`-Re-Export (Zeile 3/6) bleibt unverändert bestehen (weiterhin von
  `Toolbar.tsx` und neu von `TableToolbar.tsx` genutzt).

### 3.3 NEU: `src/formats/shared/editor/icons.tsx`

```tsx
/** Kleine, eingebettete SVG-Icons für Tabellen-Kontextfunktionen (kein Emoji/Unicode-
 *  Glyph, siehe FEATURE-SPEC-DOCX-ODT.md Abschnitt 20, Punkt 1). Gemeinsamer Ablageort
 *  für „Zeile löschen“ und die Icons der Nachbar-Tabellenfeatures. */
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
(Visuelle Ausgestaltung im Detail ist beim Bau final festzulegen — mittlere Zeile
markiert/durchgestrichen als Zeile-löschen-Symbol; Kernpunkt ist „SVG statt Glyph“.)

### 3.4 NEU: `src/formats/shared/editor/runCommand.ts`

```ts
import type { Command } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'

/** Führt einen ProseMirror-Command gegen die aktive View aus und stellt den Fokus
 *  wieder her — gemeinsam genutzt von Toolbar.tsx und TableToolbar.tsx. */
export function runCommand(view: EditorView, command: Command) {
  command(view.state, view.dispatch)
  view.focus()
}
```

### 3.5 GEÄNDERT: `src/formats/shared/editor/Toolbar.tsx`

- Lokale Funktion `run()` (Zeile 23–26) entfernen, stattdessen
  `import { runCommand } from './runCommand'` und alle 12 Aufrufstellen `run(view, …)`
  → `runCommand(view, …)` (rein mechanisches Rename, keine Verhaltensänderung).
- Kein Button für „Zeile löschen“ hier — der lebt ausschließlich in `TableToolbar.tsx`
  (Abschnitt 1 der Anforderungsdatei verlangt eine **eigene**, kontextabhängige
  Werkzeugleiste, nicht einen weiteren Button in der immer sichtbaren Haupt-Toolbar).

### 3.6 NEU: `src/formats/shared/editor/TableToolbar.tsx`

```tsx
import type { EditorView } from 'prosemirror-view'
import { deleteTableRow, isInTable } from './commands'
import { runCommand } from './runCommand'
import { RowDeleteIcon } from './icons'

interface TableToolbarProps {
  view: EditorView
}

/**
 * Kontextabhängige Werkzeugleiste für Tabellenoperationen — sichtbar ausschließlich,
 * während sich Cursor/Selektion in einer Tabelle befindet (isInTable). Gemeinsamer
 * Ort für alle Tabellen-Kontextfunktionen (zeile-loeschen-req.md Abschnitt 1, Zugriffs-
 * weg 1); enthält für dieses Feature genau einen Button.
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
        onMouseDown={(e) => {
          e.preventDefault()
          runCommand(view, deleteTableRow())
        }}
        className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
      >
        <RowDeleteIcon />
      </button>
    </div>
  )
}
```

Design-Entscheidung „statische zweite Zeile statt am Cursor schwebend“: Die
Anforderungsdatei verlangt nur, dass die Werkzeugleiste **erscheint, während** sich der
Cursor in einer Tabelle befindet — keine am Cursor „schwebende“ Positionierung. Eine
fest angeordnete zweite Symbolleiste direkt unter der Haupt-Toolbar (analog zu vielen
Textverarbeitungen mit kontextabhängiger zweiter Leiste) erfüllt das mit deutlich
weniger Risiko (keine Scroll-/Positionierungs-Bugs, keine zusätzliche
Selection-Sync-Fehlerquelle) als ein floatendes Overlay in Cursor-Nähe. Ein floatendes
Overlay wäre eine spätere, rein optische Verbesserung, kein funktionales Erfordernis
dieser Anforderungsdatei.

### 3.7 GEÄNDERT: `src/formats/shared/editor/WordEditor.tsx`

- Neuer Import: `import { TableToolbar } from './TableToolbar'`
- Im JSX (Zeile 118, direkt nach `<Toolbar view={viewRef.current} />`):
  ```tsx
  {viewRef.current && <Toolbar view={viewRef.current} />}
  {viewRef.current && <TableToolbar view={viewRef.current} />}
  ```
- Keine weiteren Änderungen nötig: `columnResizing()`/`tableEditing()` (Zeile 81–82)
  und die vorhandene `history()`/`keymap`-Konfiguration (Zeile 70–80, insbesondere
  `Mod-z`/`Mod-y`/`Mod-Shift-z` für Undo/Redo) decken Abschnitt 2.6 der
  Anforderungsdatei bereits ab — **kein neuer Keymap-Eintrag** für „Zeile löschen“
  nötig oder gewollt (Anforderungsdatei Abschnitt 1, Zugriffsweg 3: bewusst keine
  Tastenkombination).
- Der bereits vorhandene `mouseup`-Handler `reconcileSelectionOnClick` (Zeile 42–53)
  wird **nicht verändert** — er ist bereits generisch genug, um auch nach einer
  Tabellen-Struktur-Transaktion zu greifen; das muss aber durch den neuen
  Regressionstest in Abschnitt 6.5 unten **verifiziert**, nicht nur angenommen werden
  (siehe Anforderungsdatei Abschnitt 2.7).

### 3.8 GEÄNDERT: `src/index.css`

Ergänzen (keine bestehende Regel wird verändert), damit eine per Maus über mehrere
Zellen/Zeilen aufgezogene `CellSelection` überhaupt sichtbar ist — Voraussetzung dafür,
dass Grenzfall 2/3 und Testfall 6 (Abschnitt 6 der Anforderungsdatei: Entf auf
`CellSelection`) beim manuellen wie beim automatisierten Test überhaupt einen sichtbar
markierten Zustand haben, den man löschen bzw. dessen Content-Leerung man beobachten
kann (aktuell existiert **keinerlei** CSS für `.selectedCell`, obwohl das Plugin diese
Klasse bereits aktiv setzt):
```css
/* Von prosemirror-tables' CellSelection-Decoration gesetzte Klasse — ohne dieses Regel
   ist eine per Maus aufgezogene Zeilen-/Zellselektion unsichtbar. */
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
| 2 | Rechtsklick-Kontextmenü „Zeilen löschen“ | **Bewusst nicht umgesetzt** | Kein eigenes `contextmenu`-Handling wird gebaut; natives Browser-Kontextmenü bleibt bestehen (ohne Tabellenbezug). Analog zur bereits dokumentierten Entscheidung zum „Anwendungsmenü“-Fall in `ausschneiden-req.md` Abschnitt 1: „Zeile löschen“ ist ausschließlich über Weg 1 (Tabellen-Werkzeugleiste) erreichbar. Diese Zeile in diesem Plan **ist** die geforderte Dokumentation dieser Entscheidung. |
| 3 | Tastenkombination | **Bewusst nicht umgesetzt** | Kein Referenzverhalten in Word/LibreOffice; kein Keymap-Eintrag in `WordEditor.tsx`. |
| 4 | Entf/Rücktaste bei `CellSelection` | **Bereits vorhanden, keine Codeänderung** | Siehe Abschnitt 1, Punkt 3 dieses Plans — `CellSelection.replace()` aus `prosemirror-tables` leert nur Inhalt. Nur Testabsicherung nötig (Abschnitt 6.1, Testfall „Entf-Abgrenzung“). |
| 5 | Bestätigungsdialog | **Bewusst nicht umgesetzt** | Strg+Z (vorhandener `history()`/`undo`-Keymap) ist das vorgesehene Sicherheitsnetz. |
| 6 | Mobile/Touch | **Über Weg 1 abgedeckt** | `TableToolbar`-Button ist ein normales `<button>`-Element ohne Hover-Abhängigkeit — auf „Mobile“ (Pixel 7) und „Tablet“ (iPad Mini) laut `playwright.config.ts` per Tap erreichbar. Nachweis über E2E-Tests, die ohne Projekt-Einschränkung laufen (Abschnitt 6.5). |

---

## 5. Import/Export-Anpassungen

### 5.1 DOCX — keine Anpassung an Reader/Writer nötig

`src/formats/docx/reader.ts` (`parseTable`, Zeile 210–256) und
`src/formats/docx/writer.ts` (`tableToDocx`, Zeile 128–171) lesen bzw. schreiben die
Tabellenstruktur bei **jedem** Export/Import komplett neu aus dem aktuellen
ProseMirror-Dokument (`node.content` zum Zeitpunkt des Exports). Da „Zeile löschen“
ausschließlich den ProseMirror-Zustand verändert (Abschnitt 3.1), spiegelt ein
nachfolgender Export automatisch die reduzierte Zeilenzahl wider:
- `tblGrid`/Spaltenanzahl wird aus `rows[0]` neu berechnet (Writer, Zeile 130) — kein
  verwaistes `<w:tr>` möglich, weil jede Zeile 1:1 aus dem aktuellen Dokument-JSON
  entsteht.
- `vMerge`/`gridSpan` werden pro Zeile aus dem aktuellen `pending[]`-Array neu erzeugt
  (Writer, Zeile 133–165) bzw. beim Import über ein spaltenweises `anchors[]`-Array
  korrekt nachgeführt (Reader, Zeile 216–250) — beides bereits vor diesem Feature
  korrekt und durch den bestehenden Rowspan-Rundreise-Test abgesichert
  (`src/formats/docx/__tests__/roundtrip.test.ts`, Zeile 223–248).
- Bilder in gelöschten Zellen verschwinden automatisch aus dem Export, weil
  `ImageCollector` (`src/formats/docx/imageCollector.ts`) nur beim rekursiven Ablaufen
  des tatsächlichen (nach der Löschung bereits reduzierten) Dokumentbaums befüllt wird
  (`writer.ts`, `blockToDocx`/`tableToDocx`) — ein gelöschtes Bild wird nie besucht,
  landet nie in der Collector-Liste und damit auch nicht im ZIP. Kein Code nötig für
  Abschnitt 4.2, Testfall 6 (DOCX-Teil).

**Fazit:** Für DOCX ist dieses Feature eine reine Editor-Änderung; Reader/Writer
bleiben unangetastet. Das muss trotzdem durch die neuen Rundreise-Tests in Abschnitt
6.2 **bestätigt**, nicht nur behauptet werden.

### 5.2 ODT — Bugfix erforderlich, Voraussetzung für Abnahmekriterium 8

**Datei: `src/formats/odt/writer.ts`, Funktion `blockToOdt`, Fall `'table'`
(Zeile 86–111).** Aktuell wird pro Zeile ausschließlich über die tatsächlich
vorhandenen `row.content`-Zellen iteriert; für Spalten, die von einer `rowspan`-Zelle
einer vorherigen Zeile überdeckt werden, fehlt das nach ODF-Spezifikation zwingende
`<table:covered-table-cell/>`-Platzhalterelement. Das betrifft **jede** Tabelle mit
`rowspan > 1` über mehr als eine Zeile, unabhängig von „Zeile löschen“ — wird aber
durch dieses Feature **sichtbar/relevant**, weil Abschnitt 4.2, Testfall 3 der
Anforderungsdatei genau diesen Fall (Rowspan-Anker gelöscht → Export → Reimport)
verlangt, und weil in vielen Ausgangstabellen nach dem Löschen einer *anderen*, mit dem
Rowspan nicht zusammenhängenden Zeile ein unverändertes Rowspan-Paar übrig bleibt, das
dann fehlerhaft exportiert würde.

Notwendige Änderung (innerhalb der bestehenden `case 'table'`-Behandlung):
- Beim Aufbau der Zeilen zusätzlich Buchführung über offene Rowspans pro Spalte führen
  (Pendant zum bereits vorhandenen `pending[]`-Array im DOCX-Writer, Zeile 133 in
  `docx/writer.ts` — dasselbe Muster lässt sich 1:1 auf ODT übertragen):
  ```ts
  const colCount = /* wie bisher, aus rows[0] inkl. colspan-Summe berechnen —
                        bisher (Zeile 88) fälschlich nur rows[0]?.content?.length,
                        was bei colspan>1 in Zeile 1 bereits eine zu kleine
                        Spaltenzahl liefert; Fix: dieselbe Summenbildung wie
                        docx/writer.ts Zeile 130 übernehmen */
  const pendingRowSpans: number[] = Array.from({ length: colCount }, () => 0)
  const rowsXml = rows.map((row) => {
    let col = 0
    let cellIndex = 0
    const cellsXml: string[] = []
    while (col < colCount) {
      if (pendingRowSpans[col] > 0) {
        pendingRowSpans[col] -= 1
        cellsXml.push('<table:covered-table-cell/>')
        col += 1
        continue
      }
      const cell = row.content?.[cellIndex]
      cellIndex += 1
      if (!cell) { col += 1; continue }
      const colspan = Number(cell.attrs?.colspan ?? 1)
      const rowspan = Number(cell.attrs?.rowspan ?? 1)
      // ... bestehende spanAttrs-/inner-Logik unverändert ...
      if (rowspan > 1) {
        for (let c = col; c < col + colspan; c++) pendingRowSpans[c] = rowspan - 1
      }
      col += colspan
    }
    return `<table:table-row>${cellsXml.join('')}</table:table-row>`
  })
  ```
- **Zusätzlich betroffen (bereits existierender, von diesem Fix mit ausgebesserter
  Bug):** `colCount` (Zeile 88: `rows[0]?.content?.length ?? 1`) berücksichtigt
  `colspan` nicht — bei einer ersten Zeile mit einer `colspan: 2`-Zelle und einer
  normalen Zelle würde `colCount` fälschlich `2` statt `3` liefern, sobald weitere
  Spalten existieren. Fix im selben Zug: `colCount` wie im DOCX-Writer als Summe der
  `colspan`-Werte der ersten Zeile berechnen.

**Datei: `src/formats/odt/reader.ts`, Funktion `elementToBlocks`, Fall
`ns === ODF_NAMESPACES.table && local === 'table'` (Zeile 189–203).** Keine
zwingende Änderung nötig — der Reader filtert bereits korrekt nur nach
`table-cell`-Kindern (`childElements(rowEl, ODF_NAMESPACES.table, 'table-cell')`,
Zeile 192) und ignoriert `covered-table-cell` damit implizit richtig, auch für Dateien,
die (nach dem Fix oben) jetzt korrekt welche enthalten, und für real importierte
Fremddateien, die sie schon immer enthalten. **Empfohlen, aber optional:** einen
Kommentar an dieser Stelle ergänzen, der explizit festhält, dass
`covered-table-cell`-Elemente absichtlich übersprungen werden (Wartbarkeit/Nachvoll-
ziehbarkeit für zukünftige Bearbeiter), keine Verhaltensänderung.

**Auswirkung auf bestehenden Test:** Der bestehende Test „preserves merged cells
(colspan/rowspan)“ in `src/formats/odt/__tests__/roundtrip.test.ts` (Zeile 194–209)
bleibt grün (er testet nur `colspan`, keine mehrzeilige `rowspan`-Struktur) — er wird
in Abschnitt 6.3 unten um einen echten mehrzeiligen `rowspan`-Fall ergänzt, der ohne
diesen Fix fehlschlagen würde (Nachweis, dass der Fix nötig und wirksam ist).

---

## 6. Tests

### 6.1 NEU: `src/formats/shared/editor/__tests__/deleteTableRow.test.ts`

Reine Unit-Tests gegen `deleteTableRow()` über direkt konstruierte `EditorState`s
(kein DOM/View nötig, analog zum bereits vorhandenen Muster in
`pagination.test.ts`, nur mit `prosemirror-state`/`prosemirror-model` statt reiner
Funktionen). Deckt ab:

| Testfall | Grenzfall (Anforderungsdatei) |
|---|---|
| Cursor (kollabiert) in einer Zelle einer 3-Zeilen-Tabelle → mittlere Zeile verschwindet, Zeile 1/3 bleiben, Reihenfolge korrekt | 3.1 |
| `CellSelection` über 2 von 4 Spalten einer Zeile → komplette Zeile verschwindet, nicht nur markierte Zellen | 3.2 |
| `CellSelection` über 2 vollständige Zeilen einer 4-Zeilen-Tabelle → beide verschwinden in einer Transaktion | 3.3 |
| Tabelle mit genau 1 Zeile → gesamte Tabelle verschwindet, Cursor landet im umgebenden Absatz | 3.4 / 2.4 |
| Tabelle mit 1 Zeile als **einziges** Dokumentelement → nach Löschung genau ein leerer Absatz übrig, kein leeres `doc` | 2.4 (zweiter Teil) |
| Rowspan-Anker-Zeile gelöscht → Inhalt migriert in Folgezeile, `rowspan` dekrementiert | 3.5 |
| Nur überdeckte Zeile (nicht Anker) gelöscht → Ankerzelle `rowspan - 1`, Inhalt unverändert | 3.6 |
| Erste Zeile gelöscht → keine Off-by-one-Verschiebung bei einer zweiten, direkt folgenden Löschung derselben Tabelle | 3.7 |
| Letzte Zeile gelöscht (bei >1 Zeile) → Tabelle bleibt, Cursor in neuer letzter Zeile | 3.8 |
| Tabelle als erstes bzw. letztes Element des Dokuments, letzte Zeile gelöscht → Cursor in gültigem Nachbar-Absatz, kein Crash | 3.9 |
| Zelle mit mehreren Absätzen/Bild in der gelöschten Zeile → Knoten verschwinden vollständig, kein Rest andernorts im Dokument | 3.10 |
| Verschachtelte Tabelle: Zeile der äußeren Tabelle gelöscht, während sich Cursor in der inneren Tabelle befindet vs. in der äußeren → jeweils korrekte (innerste) Tabelle betroffen, kein Absturz; zusätzlich: innere Tabelle ist einzige Zeile & einziger Zellinhalt → Zelle bekommt Ersatz-Absatz (Fallback-Pfad aus `removeWholeTable`) | 3.11 |
| Aufruf ohne Tabellenkontext (`isInTable` false) → `false`, keine Exception, `dispatch` nicht aufgerufen | 3.15 |
| Große Tabelle (>5 Spalten, >10 Zeilen) → Löschen einer mittleren Zeile lässt alle anderen Zellinhalte unverändert und in korrekter Reihenfolge | 3.17 |
| Zeile mit reiner `colspan`-Zelle (kein rowspan) gelöscht → Zelle verschwindet vollständig, keine Migration | 3.16 |
| Selektierte Spanne deckt **alle** Zeilen einer mehrzeiligen Tabelle ab (nicht nur eine einzeilige Tabelle) → ebenfalls Tabelle-komplett-Pfad, kein stiller No-Op wie bei `deleteRow` direkt | Ergänzung zu 2.4 (Abschnitt 1, Punkt 1 dieses Plans) |

Cursor-/Selektionsprüfungen (Abschnitt 2.5) erfolgen durch Assertion auf
`state.selection.$from.parent`/Spaltenindex nach Anwendung des Commands, nicht nur auf
die Dokumentstruktur.

*Nicht* Gegenstand dieser Unit-Tests: Undo/Redo (Abschnitt 2.6/Grenzfall 12/13) — das
erfordert eine echte `history()`-Plugin-Instanz und wird bewusst auf E2E-Ebene
geprüft (Abschnitt 6.5), wo es zusammen mit echtem Tippen/Klicken sinnvoll beobachtbar
ist. Unit-seitig wird nur sichergestellt, dass `deleteTableRow` **genau einen**
`dispatch(tr)`-Aufruf pro Ausführung erzeugt (Voraussetzung dafür, dass die
Undo-Historie sie als einen Schritt gruppiert).

### 6.2 NEU: `src/formats/docx/__tests__/rowDelete.roundtrip.test.ts`

Integrationstest, der (anders als `roundtrip.test.ts`) nicht direkt fertige
Nach-Löschen-JSON-Strukturen konstruiert, sondern den echten Befehl ausführt:
`EditorState` mit Tabelle aufbauen → `deleteTableRow()` anwenden → `state.doc.toJSON()`
in `WordDocumentContent.body` einsetzen → `writeDocx` → `readDocx` → Struktur prüfen.
Deckt Abschnitt 4.2, Testfälle 1, 3, 4, 5, 6, 7, 11 (DOCX-Teil) ab:
1. Mehrzeilige Tabelle, eine Zeile gelöscht → Export/Reimport → Zeile fehlt,
   übrige Zeilen/Zellinhalte unverändert, `tblGrid` konsistent.
3. Rowspan-Anker gelöscht → Export/Reimport → `rowSpan` der verbleibenden Zelle korrekt
   dekrementiert, migrierter Inhalt an richtiger Stelle.
4. Colspan-Zeile gelöscht → Export/Reimport → Zeile inkl. verbundener Zelle komplett
   weg, übrige `gridSpan`-Werte unangetastet.
5. Einzige Zeile gelöscht → Export/Reimport → keine leere Tabelle im Ergebnis,
   Nachbarabsätze unverändert.
6. Zeile mit Bild gelöscht → Export/Reimport → Bild nicht mehr enthalten, `writeDocx`
   erzeugtes ZIP enthält keine verwaiste Bilddatei (Test öffnet das erzeugte `Blob` mit
   `JSZip` und prüft die Dateiliste in `word/media/` direkt).
7. Mehrzeilen-`CellSelection` gelöscht → Export/Reimport → exakt erwartete Zeilen fehlen.
11. Große Tabelle (>5 Spalten, >10 Zeilen), mittlere Zeile gelöscht → Export/Reimport →
    alle übrigen Zellinhalte identisch und in unveränderter Reihenfolge.

### 6.3 NEU: `src/formats/odt/__tests__/rowDelete.roundtrip.test.ts`

Analog zu 6.2, für ODT (`writeOdt`/`readOdt`), deckt Testfälle 2, 3, 4, 5, 6, 7, 11 ab.
**Enthält zusätzlich** den in Abschnitt 5.2 angekündigten Nachweis, dass der
`covered-table-cell`-Fix nötig und wirksam ist:
- Test „exportiert gültige `covered-table-cell`-Platzhalter für unberührte
  Rowspan-Zeilen nach Löschung einer anderen Zeile“: 3-Zeilen-Tabelle, Zeile 0+1 bilden
  ein Rowspan-Paar (Spalte 0), Zeile 2 ist unabhängig davon; Zeile 2 wird gelöscht
  (Rowspan-Paar bleibt unberührt) → Export → das rohe XML (`content.xml` aus dem `Blob`
  extrahiert) wird auf Vorhandensein von genau einem
  `<table:covered-table-cell` in Zeile 1 geprüft, **nicht** nur über den eigenen
  Reimport (der den Fehler nicht sichtbar machen würde, siehe Abschnitt 1, Punkt 4).
- Test für Testfall 3 (Rowspan-Anker selbst gelöscht) prüft zusätzlich, dass **kein**
  verwaistes `table:number-rows-spanned` auf eine nicht mehr existierende Zeile zeigt
  (indirekt über: exportierte Spaltenanzahl pro Zeile stimmt mit `table:table-column`-
  Anzahl überein, wenn man reale, überdeckte Positionen mitzählt).

### 6.4 NEU: `src/formats/shared/editor/__tests__/rowDelete.crossFormat.test.ts`

Deckt Abschnitt 4.2, Testfälle 8, 9, 10 ab:
8. ODT importieren (`readOdt` auf eine im Test erzeugte ODT-Tabelle) → `deleteTableRow`
   im Editor-Modell → als DOCX exportieren (`writeDocx`) → reimportieren (`readDocx`) →
   Struktur konsistent.
9. Umgekehrt: DOCX → Zeile löschen → ODT → reimportieren.
10. Doppelte Rundreise: DOCX → Zeile löschen → ODT → (erneut laden, keine weitere
    Änderung) → DOCX → Inhalt entspricht weiterhin dem erwarteten Nach-Löschen-Zustand.

### 6.5 NEU: reale Fixture-Fälle (Grenzfall 18 / Baseline 4.1)

Ergänzung in `src/formats/odt/__tests__/rowDelete.roundtrip.test.ts` bzw.
`src/formats/docx/__tests__/rowDelete.roundtrip.test.ts` (kein separates drittes Modul
nötig, um den Fixture-Ladepfad aus `external-fixtures.test.ts` wiederzuverwenden):
Import einer echten Datei mit Tabelle aus dem vorhandenen Korpus
(`tests/fixtures/external/odt/{BigTable,crazyTable,feature_attributes_tables,Tabelle1,TestTextTable}.odt`,
`tests/fixtures/external/docx/{TestTableColumns,deep-table-cell,table-indent}.docx`) →
`deleteTableRow` auf die erste im Dokument gefundene Tabelle anwenden (Cursor
programmatisch in die erste Zelle der ersten Tabelle setzen) → Assertion: kein Wurf,
Ergebnisdokument ist weiterhin ein gültiges `wordSchema`-Dokument
(`wordSchema.nodeFromJSON(result.body)` wirft nicht). Deckt Baseline 4.1 (reale Datei,
hier zusätzlich mit einer tatsächlichen Löschoperation statt nur unverändertem
Rundreise-Test) sowie Grenzfall 18 ab.

### 6.6 NEU: `tests/e2e/table-row-delete.spec.ts`

Analog zu `tests/e2e/selection-regression.spec.ts` (gleiche Locator-/Card-Konventionen:
`odtCard`/`docxCard`-Helper, `.ProseMirror`-Locator, `getByRole`/`getByTitle`, echte
Browser-Interaktion über `page.keyboard`/`page.mouse`). Läuft **ohne**
Projekt-Einschränkung, dadurch automatisch auf allen drei in `playwright.config.ts`
konfigurierten Projekten (Desktop Chrome, Mobile/Pixel 7, Tablet/iPad Mini) — deckt
damit Testfall 14 ohne zusätzlichen Code ab. Testfälle (Abschnitt 6 der
Anforderungsdatei, 1:1 nummeriert):

1. Tabelle mit 3 Zeilen, Cursor in mittlerer Zeile, `getByTitle('Zeile löschen')` klicken
   → mittlere Zeile weg, Zeile 1/3 bleiben und rücken zusammen.
2. Zwei komplette Zeilen per `page.mouse.down/move/up` über mehrere `td` aufziehen
   (`CellSelection`), „Zeile löschen“ klicken → beide Zeilen verschwinden in einem
   Schritt.
3. Nur Teilbereich einer Zeile markieren (nicht alle Spalten), „Zeile löschen“ klicken
   → komplette Zeile verschwindet trotzdem.
4. Tabelle mit genau einer Zeile → „Zeile löschen“ klicken → Tabelle verschwindet,
   Editor bleibt bedienbar (Tippen direkt danach funktioniert, kein weiterer Klick nötig).
5. Tabelle mit rowspan-Zelle (2 Zeilen) → Ankerzeile löschen → verbleibende Zeile zeigt
   migrierten Inhalt.
6. Entf-Taste bei markierter `CellSelection` einer ganzen Zeile → nur Zellinhalte
   geleert, Zeile bleibt strukturell bestehen (Abgrenzungstest, siehe Abschnitt 1,
   Punkt 3 — hier zusätzlich der geforderte E2E-Nachweis, dass **kein** neuer
   Produktivcode das versehentlich ändert).
7. **Pflicht-Regressionstest** (Abschnitt 2.7/3.14 der Anforderungsdatei): Tabelle mit
   mehreren Zeilen anlegen → „Zeile löschen“ → per Klick in verbleibender Zelle neu
   positionieren → Enter → weiter tippen → Dokument bleibt konsistent, beide
   benachbarten Zellen/Absätze bleiben erhalten (analog zum bestehenden Muster in
   `selection-regression.spec.ts`, Test „same regression inside a table cell“, aber mit
   einer echten Struktur-Löschung statt nur einer Formatierungs-Aktion davor).
8. Strg+Z direkt nach „Zeile löschen“ → exakter Ursprungszustand.
9. Strg+Z, danach Strg+Y → Zeile erneut identisch entfernt.
10. „Zeile löschen“ ohne Tabellenkontext (Cursor im Fließtext) → Button nicht sichtbar
    (`getByTitle('Zeile löschen')` liefert kein Element/ist nicht sichtbar), keine
    Konsole-Exception (`page.on('console', …)`/`page.on('pageerror', …)`-Assertion).
11. Export nach DOCX über echten Download-Flow → Reimport → siehe 6.2, Testfall 1
    (E2E-Gegenstück zum Integrationstest, über echte UI-Bedienung).
12. Dasselbe für ODT.
13. Große Tabelle über echten Datei-Import laden (Fixture aus 6.5), mittlere Zeile per
    Toolbar löschen → übrige Zellinhalte sichtbar unverändert.
14. Implizit durch fehlende Projekt-Einschränkung (s. o.) auf allen drei Projekten
    nachgewiesen.

---

## 7. Abnahmekriterien-Abgleich (Definition of Done, Anforderungsdatei Abschnitt 8)

| # | Kriterium | Abgedeckt durch |
|---|---|---|
| 1 | Kontextabhängige Werkzeugleiste mit funktionierendem „Zeile löschen“ | Abschnitt 3.6/3.7, Testfall 6.6/1 |
| 2 | Jeder Zugriffsweg dokumentiert | Abschnitt 4 dieses Plans |
| 3 | Cursor/Teil-Zeile/Mehrzeilen-Verhalten exakt nach 2.2, inkl. Abgrenzung zu Entf | Abschnitt 3.1, Tests 6.1 + 6.6/6 |
| 4 | Rowspan-/Colspan-Sonderfälle je eigener Test | Tests 6.1 (Zeilen 5/6/16), 6.2/6.3 Testfall 3/4 |
| 5 | „Letzte Zeile löscht Tabelle“ inkl. Tabelle-als-einziges-Element | Abschnitt 3.1 `removeWholeTable`, Test 6.1 |
| 6 | Alle Grenzfälle aus Abschnitt 3 einzeln abgedeckt/dokumentiert | Mapping-Tabelle 6.1, Grenzfall 19 explizit als Nicht-Scope in Abschnitt 8 unten |
| 7 | Pflicht-Regressionstest Selection-Sync × Zeile löschen | Test 6.6/7 |
| 8 | Rundreise-Testfälle 4.2 für DOCX **und** ODT grün, inkl. Bild-Verwaisung | Abschnitt 5.1/5.2 (inkl. nötigem ODT-Bugfix als Voraussetzung), Tests 6.2/6.3 |
| 9 | Kein stiller Datenverlust/keine Konsole-Exception | `removeWholeTable`-Fallback (nie leeres `doc`), `try/catch` um `selectedRect`, Test 6.6/10 |
| 10 | Backlog-Statuswechsel erst nach 1–9 | Nicht Teil dieses Codeplans — Entscheidung obliegt dem Backlog-Pflegeprozess, nachdem alle oben genannten Tests grün sind |

---

## 8. Bewusst nicht im Scope

- **Grenzfall 19 (Track-Changes-Abhängigkeit):** Änderungsverfolgung existiert laut
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13 noch nicht (Phase 3, separat). „Zeile
  löschen“ entfernt Inhalt daher immer sofort endgültig; keine Vorbereitung dafür wird
  in `deleteTableRow` eingebaut, um keine tote Abstraktion vorwegzunehmen.
- **Eigenes Kontextmenü (Zugriffsweg 2):** siehe Abschnitt 4 — explizit nicht gebaut.
- **Migration der bestehenden Emoji/Unicode-Buttons in `Toolbar.tsx` auf SVG:**
  vorbestehende, allgemeine Abweichung von Abschnitt 20 der Feature-Spec, gehört zu
  keinem Einzel-Slug und wird hier nicht mitgezogen.
- **Allgemeine Spaltenbreiten-/Rahmen-Darstellung, Tab-Navigation, Zellen
  verbinden/teilen, Spalte einfügen/löschen, Tabelle explizit löschen:** eigene
  Backlog-Slugs mit eigenen `*-req.md`-Dateien (`spalte-einfuegen`, `spalte-loeschen`,
  `zellen-verbinden`, `tabelle-loeschen`, `zeile-einfuegen`) — `TableToolbar.tsx` ist so
  angelegt, dass diese Features ihre Buttons dort ergänzen können, aber ihre Umsetzung
  ist nicht Teil dieses Plans.
- **Exotischer Fallback bei nicht eindeutig auflösbarer Rowspan-Migration
  (Grenzfall 18, zweiter Halbsatz):** `prosemirror-tables`s `removeRow` liefert bereits
  ein deterministisches Verhalten (siehe Abschnitt 1, Punkt 2) und wird unverändert
  übernommen; ein zusätzlicher eigener Fallback-Mechanismus für hypothetische, damit
  nicht abgedeckte Strukturen wird nicht gebaut, da im vorhandenen Fixture-Korpus
  (Abschnitt 6.5) keine solche Struktur nachgewiesen werden konnte, die `removeRow`
  nicht sauber verarbeitet.
