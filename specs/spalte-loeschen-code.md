# Feature „Spalte löschen" — Datei­genauer Umsetzungsplan

Status: **Entwurf, Entwickler-Review vor Umsetzung.** Basiert auf `specs/spalte-loeschen-req.md`
und einer eigenen Verifikation des tatsächlichen Code-Stands (Dateien gelesen, `deleteColumn`
in der installierten `prosemirror-tables@1.8.5` bis auf Zeilenebene inspiziert, ein bestehender
E2E-Test tatsächlich mit Playwright ausgeführt). Alle Zeilenangaben der Anforderungsdatei wurden
gegen den realen Code geprüft und sind **zutreffend** (`Toolbar.tsx:228-239`, `commands.ts:6`,
`schema.ts:106`, `WordEditor.tsx:81-82`, `docx/writer.ts:130`, `odt/writer.ts:88`,
`odt/reader.ts:192`, `docx/reader.ts:210-256`). Dieser Plan ergänzt vier eigene, durch
Code-Lektüre bzw. echten Testlauf verifizierte Befunde (Abschnitt 1), trifft die in der
Anforderungsdatei offen gelassenen Entscheidungen (Abschnitt 2) und beschreibt danach
dateigenau, was zu ändern ist (Abschnitt 3).

---

## 1. Ergänzende, selbst verifizierte Befunde

Diese vier Punkte stehen **nicht** in `spalte-loeschen-req.md`, sind aber für eine korrekte
Umsetzung notwendig und wurden durch eigene Code-Analyse bzw. einen echten Playwright-Lauf
bestätigt.

### 1.1 `deleteColumn`s „letzte Spalte"-Guard greift NICHT bei einem dispatch-losen Aufruf

`node_modules/prosemirror-tables/dist/index.js:1388-1405`:

```js
function deleteColumn(state, dispatch) {
	if (!isInTable(state)) return false;
	if (dispatch) {
		const rect = selectedRect(state);
		const tr = state.tr;
		if (rect.left == 0 && rect.right == rect.map.width) return false;   // <-- NUR hier drin!
		...
		dispatch(tr);
	}
	return true;   // <-- wird erreicht, wenn dispatch fehlt, OHNE den Guard geprüft zu haben
}
```

Die Prüfung „würde das alle Spalten treffen?" steckt **innerhalb** von `if (dispatch)`. Der in
ProseMirror sonst übliche Zweck des optionalen `dispatch`-Parameters — „rufe den Command ohne
`dispatch` auf, um nur zu testen, ob er anwendbar wäre" — funktioniert bei dieser Funktion **für
genau diesen Grenzfall nicht**: `deleteColumn(state)` (ohne zweites Argument) liefert `true`,
sobald `isInTable(state)` wahr ist — **auch dann, wenn die Selektion bereits alle Spalten
umfasst**. Ein naiver, in ProseMirror sonst korrekter Implementierungsansatz für den
„disabled"-Zustand des Buttons (Abschnitt 1 Zeile 3 der Anforderungsdatei) —
`const canDelete = deleteColumn(view.state)` — würde daher **den zentralen Pflicht-Testfall aus
Abschnitt 3.7/10.4 der Anforderungsdatei nicht erfüllen**: Der Button bliebe für die letzte
Spalte aktiv, der Klick wäre dann ein stiller No-Op (`dispatch` bekäme zwar `view.dispatch`
übergeben, aber real würde `deleteColumn(state, dispatch)` beim tatsächlichen Klick korrekt
`false` liefern und nichts passiert — nur ist der Button vorher fälschlich nicht deaktiviert).

**Konsequenz für die Umsetzung:** Es darf **kein** Aufruf von `deleteColumn(state)` ohne
`dispatch` zur „wäre das möglich"-Prüfung verwendet werden. Stattdessen wird ein eigener Helper
`canDeleteSelectedColumns(state)` geschrieben, der denselben Guard **repliziert**, indem er
`isInTable` + das öffentlich exportierte `selectedRect` selbst auswertet (siehe Abschnitt 3.1).

### 1.2 `CellSelection` ist aktuell komplett unsichtbar — keine CSS-Regel vorhanden

`tableEditing()` (bereits aktiv, `WordEditor.tsx:82`) dekoriert jede selektierte Zelle
automatisch mit der Klasse `selectedCell`
(`node_modules/prosemirror-tables/dist/index.js:693`, `Decoration.node(pos, ..., { class:
"selectedCell" })`). Die zugehörige Standard-CSS der Bibliothek
(`node_modules/prosemirror-tables/style/tables.css`, Regel `.ProseMirror .selectedCell:after {
background: rgba(200, 200, 255, 0.4); ... }`) wird in dieser App **nirgends importiert** —
Grep über `src/` nach `selectedCell` und `prosemirror-tables/style` liefert null Treffer, und
`src/index.css` enthält keine eigene Ersatzregel. Eine `CellSelection` per Maus-Drag ist damit
heute **funktional aktiv, aber visuell komplett unsichtbar**. Das verletzt direkt Abschnitt 1
Zeile 6 der Anforderungsdatei („Muss visuell eindeutig erkennbar sein, bevor der
Löschen-Button geklickt wird"). Fix: eigene `.selectedCell`-Overlay-Regel in `src/index.css`
ergänzen (Abschnitt 3.4), mit hell/dunkel-Variante statt der fixen Bibliotheksfarbe.

### 1.3 Bestehender E2E-Test zur Tabellen-Selektion ist schon heute rot — real nachgewiesen

`tests/e2e/selection-regression.spec.ts:37` lokalisiert den bestehenden „⊞ Tabelle"-Button über
`page.getByRole('button', { name: 'Tabelle einfügen' })`. Der Button
(`Toolbar.tsx:228-239`) hat aber **kein** `aria-label`, nur `title="Tabelle einfügen"` und den
sichtbaren Inhalt `⊞ Tabelle`. Für ein `<button>` gewinnt bei der Berechnung des Accessible
Name der **Text-Inhalt** gegenüber `title` (name-from-content). Test tatsächlich ausgeführt
(`npx playwright test tests/e2e/selection-regression.spec.ts --project="Desktop Chrome" -g "same
regression inside a table"`) — Ergebnis: **Timeout, `waiting for getByRole('button', { name:
'Tabelle einfügen' })`**, Seiten-Snapshot bestätigt den tatsächlichen Accessible Name als
`button "⊞ Tabelle"`. Der Test ist also **aktuell defekt**, unabhängig von „Spalte löschen".

**Konsequenz:** Da genau diese Datei laut Anforderung Abschnitt 2.10/3.19/7.12 der Ort ist, an
dem der Pflicht-Regressionstest für „Spalte löschen" ergänzt werden soll, darf dieses Muster
(Locator über `title`-Text, der nicht dem Accessible Name entspricht) nicht wiederholt werden —
sonst hängt/scheitert auch der neue Test. Der Plan sieht daher vor, **`aria-label`
explizit auf beiden Tabellen-Buttons zu setzen** (bestehender „Tabelle einfügen"-Button **und**
neuer „Spalte löschen"-Button) und den bestehenden kaputten Test im selben Zug zu reparieren,
da ohnehin dieselbe Datei (`Toolbar.tsx`) angefasst wird (Abschnitt 3.6).

### 1.4 `.tableWrapper` (bereits durch `columnResizing()` erzeugt) hat keine Overflow-Regel

`columnResizing()` (bereits aktiv, `WordEditor.tsx:81`) installiert intern eine `TableView`-
NodeView, die **jede** Tabelle in ein `<div class="tableWrapper">` einbettet
(`node_modules/prosemirror-tables/dist/index.js:2282-2287`). `src/index.css` enthält aber keine
Regel für `.tableWrapper`. Ohne `overflow-x: auto` kann eine Tabelle den Seiteninhalt auf
schmalen Viewports (die in `playwright.config.ts:20-22` definierten Projekte „Mobile"/Pixel 7
und „Tablet"/iPad Mini, gefordert in Abschnitt 1 Zeile 7 der Anforderungsdatei) horizontal
sprengen. Kein Bug, der durch „Spalte löschen" entsteht, aber eine Vorbedingung, um Testfall 17
(Mobile/Tablet-Bedienung) zuverlässig zu erfüllen, und trivial im selben CSS-Patch mit
zu erledigen (Abschnitt 3.4).

---

## 2. Getroffene Entscheidungen zu den offenen Fragen der Anforderungsdatei

| # | Offene Frage (Referenz) | Entscheidung | Begründung |
|---|---|---|---|
| 1 | Kontextmenü vs. Toolbar-Button (Abschnitt 1 Zeile 4) | **Nur Toolbar-Button, kein Kontextmenü-System.** | Es existiert aktuell **keinerlei** Kontextmenü-Infrastruktur in der App (projektweite Suche: null Treffer). Ein neues, generisches Kontextmenü-System für **ein** Feature aufzubauen ist unverhältnismäßig; die Anforderungsdatei selbst erlaubt Zurückstellen, verlangt aber eine explizite Entscheidung. Sobald `spalte-einfuegen`/`zeile-loeschen`/`zellen-verbinden` real umgesetzt werden (≥ 3 Geschwister-Aktionen), ist ein gemeinsames Kontextmenü wirtschaftlich sinnvoll — dann sollte es **`canDeleteSelectedColumns` + `deleteColumn` aus `commands.ts` unverändert wiederverwenden** (siehe Abschnitt 3.1), nicht neu implementieren. Kein Abnahmekriterium aus Abschnitt 10 der Anforderungsdatei verlangt zwingend ein Kontextmenü. |
| 2 | `CellSelection` innerhalb einer Spalte, nicht volle Höhe (Abschnitt 2.1 Fall 2) | **Bibliotheksverhalten übernehmen** (löscht immer die gesamte Spalte). | Entspricht der Empfehlung der Anforderungsdatei; kein Zusatzcode zur Vorprüfung, da die volle Spalte in jedem Fall aus Nutzersicht sinnvoll ist (analog Word/LibreOffice). Wird durch Tooltip-Text am Button kommuniziert (Abschnitt 3.2) statt durch permanenten Hinweistext im UI (kein Precedent für erklärenden Fließtext neben Buttons in dieser Toolbar). |
| 3 | `CellSelection` über mehrere Spalten (Abschnitt 2.1 Fall 3) | **Bibliotheksverhalten übernehmen** (alle markierten Spalten werden auf einen Klick gelöscht). | Wie von der Anforderungsdatei empfohlen; konsistent mit Word/LibreOffice; kein Zusatzcode nötig, da `deleteColumn`/`selectedRect` dies bereits korrekt handhaben (Iteration `rect.right - 1` bis `rect.left`). |
| 4 | Letzte verbleibende Spalte (Abschnitt 2.6/3.7) | **Lösungsweg 1: Button deaktiviert** (`disabled`, mit erklärendem `title`). | Kein neuer UI-Baustein (Toast/Modal) nötig — die App hat aktuell kein Toast-System (einzige vergleichbare Komponente ist `PrivacyBanner`, kein generischer Hinweismechanismus). `disabled` ist die mit Abstand einfachste, robusteste, mit Playwright zuverlässig testbare Lösung (Element bleibt im DOM, nur das Attribut wechselt — kein Race zwischen Sichtbarkeits-Wechsel und Klick). Deckt Abnahmekriterium 4 aus Abschnitt 10 vollständig ab, ohne von `tabelle-loeschen` (eigener, nicht existierender Slug) abhängig zu sein. |
| 5 | Bestätigungsdialog (Abschnitt 3.13) | **Kein Dialog.** | Wie empfohlen: Undo ist der alleinige Schutzmechanismus, konsistent mit dem bereits vorhandenen Verhalten „Bild löschen" (Entf-Taste, kein Rückfragedialog) und dem Fehlen jeglicher Dialog-Infrastruktur im restlichen Code. |
| 6 | ODT-`colCount`-Bug beheben oder dokumentieren (Befund 7) | **Beheben, Teil dieses Features.** | Ein-Zeilen-Fix (`odt/writer.ts:88`, Summe der `colspan`-Werte statt Zellenanzahl, analog zu `docx/writer.ts:130`). Wird durch jeden Rundreise-Testfall mit `colspan` in Zeile 0 direkt exercised (Abschnitt 5.2.2 der Anforderungsdatei) — ohne Fix wäre dieser Pflicht-Testfall nicht grün zu bekommen. Behebt zugleich die in Befund 9 dokumentierte Asymmetrie zum DOCX-Writer. |
| 7 | ODT-`covered-table-cell`-Lücke beheben oder als Blocker dokumentieren (Befund 8) | **Minimal beheben, Teil dieses Features.** | Ohne Fix ist der in Abschnitt 5.2.4/3.18 der Anforderungsdatei **pflicht-geforderte** Testfall („reale, mit LibreOffice erzeugte ODT-Datei mit vertikaler Verbindung") von vornherein blockiert, und Abnahmekriterium 7 aus Abschnitt 10 verlangt ausdrücklich, dass Befund 8 „einzeln geprüft" und das Ergebnis nachgetragen wird. Der Fix ist mit demselben Anchor-Array-Muster, das `docx/reader.ts:210-256` bereits nutzt, mit überschaubarem Risiko lösbar (Abschnitt 3.7) und behebt zugleich die in Befund 9 dokumentierte Asymmetrie zum DOCX-Reader. **Umfang bewusst minimal:** nur Spalten-Ausrichtungskorrektur (rowspan-Zählung am Anker), keine allgemeine Überarbeitung des ODT-Tabellenmodells. |
| 8 | Icon: SVG statt Unicode (Abschnitt 1 Zeile 1) | **Neue, kleine gemeinsame Icon-Datei**, erster SVG-Icon-Präzedenzfall im Projekt. | Bisher nutzt **jeder** Toolbar-Button ein Unicode-/Emoji-Zeichen (verifiziert: kein `<svg` in `src/` vorhanden). Für „Spalte löschen" wird erstmals ein inline-SVG mit `currentColor` verwendet (Abschnitt 3.3), als Vorlage für künftige Tabellen-Aktionen (`spalte-einfuegen` etc.), gemäß der in `FEATURE-SPEC-DOCX-ODT.md:440-442` dokumentierten Lehre. |

---

## 3. Dateigenauer Umsetzungsplan

### 3.1 `src/formats/shared/editor/commands.ts` (ändern)

Aktuell (Zeilen 1-6):
```ts
import type { Command, EditorState } from 'prosemirror-state'
import { wrapInList, liftListItem } from 'prosemirror-schema-list'
import { isInTable } from 'prosemirror-tables'
import { wordSchema } from '../schema'

export { isInTable }
```

Ändern zu:
```ts
import type { Command, EditorState } from 'prosemirror-state'
import { wrapInList, liftListItem } from 'prosemirror-schema-list'
import { deleteColumn, isInTable, selectedRect } from 'prosemirror-tables'
import { wordSchema } from '../schema'

export { isInTable, deleteColumn }

/**
 * Whether "Spalte löschen" would currently remove anything.
 *
 * Deliberately does NOT delegate to `deleteColumn(state)` (dispatch omitted) to test
 * applicability — prosemirror-tables 1.8.5 nests its "would this empty the whole table"
 * guard *inside* `if (dispatch) {...}` (see node_modules/prosemirror-tables/dist/index.js,
 * function `deleteColumn`), so a dispatch-less call unconditionally returns `true` while
 * `isInTable` holds, even when the selection already spans every column. Relying on that
 * call shape here would silently defeat the toolbar's disabled state for exactly the
 * "letzte verbleibende Spalte" case this check exists for. This function instead
 * replicates the same guard `deleteColumn` itself applies before dispatching.
 */
export function canDeleteSelectedColumns(state: EditorState): boolean {
  if (!isInTable(state)) return false
  const rect = selectedRect(state)
  return !(rect.left === 0 && rect.right === rect.map.width)
}
```

Begründung: `deleteColumn` selbst hat exakt die vom `Command`-Typ verlangte Signatur
`(state, dispatch?) => boolean` und kann 1:1 als Toolbar-Callback verwendet werden — kein
Wrapper nötig, nur Re-Export (entspricht dem bestehenden Muster `export { isInTable }`,
Zeile 6). `selectedRect` ist in der installierten Version öffentlich exportiert
(`node_modules/prosemirror-tables/dist/index.d.ts:313`), daher ist keine Nachbildung von
`TableMap`/`selectionCell` nötig.

**Neuer Unit-Test:** `src/formats/shared/editor/__tests__/commands.test.ts` (neu, es existiert
bisher keine Testdatei für `commands.ts` — nur `editor/__tests__/pagination.test.ts`). Deckt
direkt den in Abschnitt 1.1 dokumentierten Bug ab:
- `canDeleteSelectedColumns` liefert `false` außerhalb einer Tabelle.
- `canDeleteSelectedColumns` liefert `false`, wenn Cursor/Selektion die einzige Spalte einer
  1-spaltigen Tabelle betrifft, **und** wenn eine `CellSelection` explizit alle Spalten einer
  mehrspaltigen Tabelle markiert.
- `canDeleteSelectedColumns` liefert `true` für eine von mehreren Spalten.
- Regressionstest, der genau das Bug-Muster aus Abschnitt 1.1 abdeckt: Aufruf von
  `deleteColumn(state)` **ohne** dispatch auf einer 1-Spalten-Tabelle liefert (bibliotheks-
  bedingt) `true` — dieser Test dokumentiert bewusst das Bibliotheksverhalten (nicht das
  eigene), damit ein künftiges Bibliotheks-Update, das diesen Fehler behebt, hier auffällt
  und der eigene Workaround dann bewusst entfernt werden kann.
- Aufbau (Doc-Fixture) analog zum bereits vorhandenen Muster in
  `src/formats/docx/__tests__/roundtrip.test.ts` (`doc([...])`/`paragraph(...)`-Helper),
  aber direkt gegen `EditorState.create({ schema: wordSchema, doc: wordSchema.nodeFromJSON(...) })`
  und `TextSelection`/`CellSelection.create(doc, anchorPos, headPos)` aus
  `prosemirror-state`/`prosemirror-tables`, da hier reine ProseMirror-State-Objekte statt
  Import/Export geprüft werden.

### 3.2 `src/formats/shared/editor/Toolbar.tsx` (ändern)

Änderungen:

1. Import ergänzen:
   ```ts
   import { canDeleteSelectedColumns, deleteColumn, ... } from './commands'
   import { DeleteColumnIcon } from './tableIcons'
   ```
2. **Bestehenden** „⊞ Tabelle"-Button (Zeilen 228-239) um ein explizites `aria-label` ergänzen
   (behebt Befund 1.3, ohne das Bibliotheksverhalten oder die Optik zu ändern):
   ```tsx
   <button
     type="button"
     title="Tabelle einfügen"
     aria-label="Tabelle einfügen"
     aria-pressed={isInTable(view.state)}
     ...
   >
     ⊞ Tabelle
   </button>
   ```
3. **Neuer** Button direkt danach, vor dem Bild-Label (Zeile 241), als eigene kleine
   Komponente analog zu `MarkButton`/`AlignButton`:

   ```tsx
   function DeleteColumnButton({ view }: { view: EditorView }) {
     const inTable = isInTable(view.state)
     const canDelete = inTable && canDeleteSelectedColumns(view.state)
     const title = !inTable
       ? 'Spalte löschen (Cursor muss in einer Tabelle stehen)'
       : canDelete
         ? 'Spalte löschen'
         : 'Letzte verbleibende Spalte kann nicht einzeln gelöscht werden'
     return (
       <button
         type="button"
         title={title}
         aria-label="Spalte löschen"
         disabled={!canDelete}
         onMouseDown={(e) => {
           e.preventDefault()
           run(view, deleteColumn)
         }}
         className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
           canDelete
             ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
             : 'text-neutral-300 dark:text-neutral-700 cursor-not-allowed'
         }`}
       >
         <DeleteColumnIcon />
         <span>Spalte löschen</span>
       </button>
     )
   }
   ```

   Eingebunden in `Toolbar` als `<DeleteColumnButton view={view} />` direkt nach dem
   „⊞ Tabelle"-Button.

   **Bewusst *kein* `aria-pressed`** (anders als beim „⊞ Tabelle"-Button): `aria-pressed`
   bezeichnet einen Toggle-Zustand, „Spalte löschen" ist aber keine toggle-fähige Aktion —
   `disabled` ist hier die semantisch korrekte Eigenschaft und zugleich das, was Abschnitt 1
   Zeile 3 der Anforderungsdatei verlangt. (Die bestehende `aria-pressed`-Nutzung beim
   „Tabelle einfügen"-Button ist eine vorbestehende kleine A11y-Ungenauigkeit — wird hier
   nicht mit übernommen, aber auch nicht im Rahmen dieses Features korrigiert, da außerhalb
   des Scopes.)

   Button bleibt **immer sichtbar** (nicht versteckt), nur `disabled` wechselt — konsistent
   mit dem „⊞ Tabelle"-Button, der ebenfalls immer sichtbar ist, und vermeidet
   Layout-Sprünge/Race-Bedingungen in E2E-Tests (Entscheidung 4 aus Abschnitt 2).

4. Klarstellung (Code-Kommentar über dem neuen Button einfügen): `Backspace`/`Strg+Backspace`
   löschen bei aktiver `CellSelection` nur den **Zellinhalt** (`tableEditing()` bindet dies
   intern an `deleteCellSelection`, `node_modules/prosemirror-tables/dist/index.js:2122-2123`)
   — das ist beabsichtigtes Bibliotheksverhalten, **kein** struktureller Spalten-Löschweg,
   und darf nicht mit „Spalte löschen" verwechselt werden. Dieser Kommentar verhindert, dass
   ein späterer Bearbeiter das Tastaturverhalten fälschlich als Bug interpretiert.

### 3.3 `src/formats/shared/editor/tableIcons.tsx` (neu)

Erste SVG-Icon-Datei des Projekts (Entscheidung 8, Abschnitt 2), bewusst als eigene,
wiederverwendbare Datei angelegt (nicht inline in `Toolbar.tsx`), damit `spalte-einfuegen`,
`zeile-loeschen` etc. dieselbe Konvention fortsetzen können:

```tsx
/** Inline SVG icons for table toolbar actions — `currentColor` so they inherit the
 *  button's text color (incl. the disabled/dark-mode variants), `aria-hidden` since the
 *  accessible name always comes from the button's own `aria-label`, never from the icon. */

export function DeleteColumnIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <rect x="1" y="2" width="14" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1="6" y1="2" x2="6" y2="14" stroke="currentColor" strokeWidth="1.2" />
      <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" strokeWidth="1.2" />
      <line x1="6.5" y1="5" x2="9.5" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="9.5" y1="5" x2="6.5" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
```

(3-Spalten-Tabellengitter mit einem „X" über der mittleren Spalte. Exakte Pfad-/Geometrie-
Feinabstimmung ist beim Umsetzen frei, nicht Teil der verbindlichen Vorgabe dieses Plans —
verbindlich ist nur: inline SVG, `currentColor`, kein Unicode/Emoji, `aria-hidden`.)

### 3.4 `src/index.css` (ändern)

Ergänzen (nach der bestehenden `.ProseMirror td, .ProseMirror th`-Regel, Zeilen 50-56):

```css
.ProseMirror td,
.ProseMirror th {
  border: 1px solid #9ca3af;
  padding: 4px 8px;
  min-width: 2em;
  vertical-align: top;
  position: relative; /* anchor for the .selectedCell overlay below */
}

/* prosemirror-tables' columnResizing() already wraps every table in this element via its
   TableView node view — without overflow handling a wide table can blow out the page on
   narrow (mobile/tablet) viewports. */
.ProseMirror .tableWrapper {
  overflow-x: auto;
}

/* tableEditing() already decorates every selected cell with .selectedCell (see
   node_modules/prosemirror-tables/dist/index.js) — this app never styled that class, so a
   CellSelection (e.g. dragged across a column before "Spalte löschen") was previously
   invisible. */
.ProseMirror .selectedCell::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  background: rgba(37, 99, 235, 0.18);
  pointer-events: none;
}

@media (prefers-color-scheme: dark) {
  .ProseMirror .selectedCell::after {
    background: rgba(96, 165, 250, 0.28);
  }
}
```

Kein `@import` des kompletten `prosemirror-tables/style/tables.css` — dessen
`table-layout: fixed`/`overflow: hidden`-Regeln würden mit den bereits bestehenden,
abweichenden `.ProseMirror table`-Regeln (Zeilen 44-48) kollidieren; stattdessen werden nur
die tatsächlich fehlenden Teile gezielt ergänzt.

### 3.5 `src/formats/shared/schema.ts` — keine Änderung

Bestätigt: `tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })`
(Zeile 106) liefert bereits alle Standardattribute (`colspan`, `rowspan`, `colwidth`) und ein
Schema, das das Entfernen von Zellen/Spalten strukturell zulässt. Kein Änderungsbedarf.

### 3.6 `src/formats/shared/editor/WordEditor.tsx` — keine Änderung

`columnResizing()` und `tableEditing()` sind bereits registriert (Zeilen 81-82), `history()`
mit `Mod-z`/`Mod-y`/`Mod-Shift-z`-Keymap ebenfalls (Zeilen 70-74) — Undo/Redo für „Spalte
löschen" ist damit **automatisch** vorhanden, sobald der Command über `dispatch` läuft (jede
ProseMirror-Transaktion landet automatisch in der Undo-Historie). Kein Code nötig, nur
E2E-Nachweis (Abschnitt 3.9, Testfälle 10/11 der Anforderungsdatei).

Cursor-Platzierung nach dem Löschen (Abschnitt 2.3 der Anforderungsdatei) ist ebenfalls ohne
Zusatzcode abgedeckt: `CellSelection.map(doc, mapping)`
(`node_modules/prosemirror-tables/dist/index.js:527-537`) fällt automatisch auf
`TextSelection.between(...)` zurück, sobald die selektierten Zellen durch die Löschung nicht
mehr existieren — die vorhandene `reconcileSelectionOnClick`-Logik (Zeilen 42-53) greift bei
einem anschließenden Klick zusätzlich ab. Nur per E2E zu verifizieren, kein Produktionscode.

### 3.7 `src/formats/odt/reader.ts` (ändern — Befund 8)

Aktuell (Zeilen 189-203):
```ts
if (ns === ODF_NAMESPACES.table && local === 'table') {
  const rows = childElements(el, ODF_NAMESPACES.table, 'table-row').map((rowEl) => ({
    type: 'table_row',
    content: childElements(rowEl, ODF_NAMESPACES.table, 'table-cell').map((cellEl) => {
      const colspan = Number(cellEl.getAttributeNS(ODF_NAMESPACES.table, 'number-columns-spanned') ?? '1') || 1
      const rowspan = Number(cellEl.getAttributeNS(ODF_NAMESPACES.table, 'number-rows-spanned') ?? '1') || 1
      return {
        type: 'table_cell',
        attrs: { colspan, rowspan, colwidth: null },
        content: Array.from(cellEl.children).flatMap((child) => elementToBlocks(child, styles, depth + 1)),
      }
    }),
  }))
  return [{ type: 'table', content: rows }]
}
```

Ändern zu (Anchor-Array-Muster analog `docx/reader.ts:210-256`, damit
`<table:covered-table-cell/>`-Platzhalter aus echten LibreOffice/OpenOffice-Dateien die
Spaltenausrichtung nicht mehr verschieben, sondern korrekt in `rowspan` der Ursprungszelle
aufgehen):

```ts
if (ns === ODF_NAMESPACES.table && local === 'table') {
  // Tracks, per column index, the anchor cell a covered-table-cell placeholder extends —
  // mirrors docx/reader.ts's `anchors` handling for vMerge continuations.
  const anchors: Array<JsonNode | null> = []

  const rows: JsonNode[] = childElements(el, ODF_NAMESPACES.table, 'table-row').map((rowEl) => {
    const cells: JsonNode[] = []
    let col = 0
    for (const child of Array.from(rowEl.children)) {
      if (child.namespaceURI !== ODF_NAMESPACES.table) continue

      if (child.localName === 'covered-table-cell') {
        const anchor = anchors[col] ?? null
        if (anchor?.attrs) anchor.attrs.rowspan = (Number(anchor.attrs.rowspan) || 1) + 1
        col += 1
        continue
      }
      if (child.localName !== 'table-cell') continue

      const colspan = Number(child.getAttributeNS(ODF_NAMESPACES.table, 'number-columns-spanned') ?? '1') || 1
      const rowspan = Number(child.getAttributeNS(ODF_NAMESPACES.table, 'number-rows-spanned') ?? '1') || 1
      const cellNode: JsonNode = {
        type: 'table_cell',
        attrs: { colspan, rowspan, colwidth: null },
        content: Array.from(child.children).flatMap((c) => elementToBlocks(c, styles, depth + 1)),
      }
      cells.push(cellNode)
      for (let c = col; c < col + colspan; c++) anchors[c] = cellNode
      col += colspan
    }
    return { type: 'table_row', content: cells }
  })
  return [{ type: 'table', content: rows }]
}
```

Wichtig: `rowspan` wird jetzt **rekonstruiert** aus der Anzahl der tatsächlich vorhandenen
`covered-table-cell`-Folgeelemente, statt (wie bisher) blind aus dem ggf. bereits im
`table-cell`-Attribut vorhandenen `number-rows-spanned` übernommen zu werden — für
selbst-erzeugte Dateien (eigener Writer schreibt `number-rows-spanned` korrekt, aber nie
`covered-table-cell`) bleibt das Ergebnis identisch (0 Folgeelemente + bereits korrektes
Attribut ⇒ unverändert), für importierte Fremddateien mit echten
`covered-table-cell`-Elementen wird die Spaltenausrichtung jetzt korrekt gehalten.

**Testfall (neu, in `src/formats/odt/__tests__/roundtrip.test.ts` oder eigene Datei
`src/formats/odt/__tests__/coveredTableCell.test.ts`):** Handgebautes `content.xml`
(JSZip, analog zum Muster in `tests/e2e/docx.spec.ts:buildSampleDocx`) mit einer Tabelle:
Zeile 0 hat eine Zelle mit `table:number-rows-spanned="2"` in Spalte 0 und eine normale Zelle
in Spalte 1; Zeile 1 hat ein `<table:covered-table-cell/>` in Spalte 0 und eine normale Zelle
in Spalte 1 — Assertion: Zeile 1 im gelesenen JSON hat genau **eine** Zelle (die Fortsetzung
wird nicht als eigene Zelle gezählt) und deren Text landet in Spalte 1, nicht Spalte 0.

### 3.8 `src/formats/odt/writer.ts` (ändern — Befund 7)

Zeile 88, aktuell:
```ts
const colCount = rows[0]?.content?.length ?? 1
```

Ändern zu (exakt analog `docx/writer.ts:130`):
```ts
const colCount = (rows[0]?.content ?? []).reduce((sum, cell) => sum + Number(cell.attrs?.colspan ?? 1), 0) || 1
```

**Testfall (neu, `src/formats/odt/__tests__/roundtrip.test.ts`, Erweiterung des
`describe('ODT round trip: tables', ...)`-Blocks):** Tabelle mit Zeile 0 = 1 normale Zelle +
1 Zelle mit `colspan: 2` (⇒ 3 logische Spalten, aber nur 2 JSON-Zellen in Zeile 0) — Assertion
**direkt gegen die erzeugte XML** (nicht nur gegen das zurückgelesene JSON, da der Reader den
Fehler sonst kaschieren könnte): `writeOdt(...)` aufrufen, mit `JSZip.loadAsync` den
`content.xml`-Teil auslesen und zählen, dass genau 3 `<table:table-column`-Vorkommen
enthalten sind.

### 3.9 `src/formats/docx/writer.ts` — keine Codeänderung, nur Verifikations-Test

Befund 6 der Anforderungsdatei bestätigt sich bei genauer Prüfung als **aktuell nicht
zutreffend**: `vMerge`-Fortsetzungszellen werden im Dokumentmodell überhaupt nicht als eigene
JSON-Zellen gespeichert (sie werden beim Schreiben aus dem `rowspan`-Attribut der
Ursprungszelle über das `pending`-Array, Zeilen 133/142-146, synthetisiert) — Zeile 0 kann
also strukturell **nie** eine `vMerge`-Fortsetzung enthalten, unabhängig von „Spalte löschen"
oder künftigem „Zeile löschen". Die in Befund 6 selbst offen gelassene Einschränkung („bei
Zeile 0 nicht möglich") trifft also immer zu — `(rows[0]?.content ?? []).reduce(...colspan...)`
(Zeile 130) bleibt nach jedem `deleteColumn`-Aufruf korrekt.

**Trotzdem neuer Regressionstest** (`src/formats/docx/__tests__/roundtrip.test.ts`,
Erweiterung `describe('DOCX round trip: tables', ...)`), um diese Invariante festzuschreiben,
bevor `zeile-loeschen` (das Befund 6 laut Anforderungsdatei erst tatsächlich relevant machen
würde) umgesetzt wird: Tabelle mit Zeile 0 = `colspan: 2`-Zelle + normale Zelle (⇒ 3 Spalten),
Assertion direkt gegen `word/document.xml`: genau 3 `<w:gridCol`-Vorkommen in `<w:tblGrid>`.

### 3.10 Neue E2E-Testdatei: `tests/e2e/table-columns.spec.ts`

Folgt den bestehenden Konventionen aus `tests/e2e/docx.spec.ts`/`odt.spec.ts`/
`selection-regression.spec.ts` (`docxCard(page)`/`odtCard(page)`-Helper,
`page.locator('.ProseMirror')`, `input[type="file"]` für Upload,
`page.waitForEvent('download')` + `JSZip.loadAsync` für Export-Prüfung). Deckt Abschnitt 7,
Testfälle 1-17 der Anforderungsdatei ab. Kern-Locator-Strategie (behebt Befund 1.3): Buttons
werden über `page.getByRole('button', { name: 'Spalte löschen' })` bzw.
`page.getByRole('button', { name: 'Tabelle einfügen' })` gefunden — funktioniert **nur**, weil
Abschnitt 3.2 beiden Buttons ein `aria-label` hinzufügt.

Struktur (pro Format als eigener `test.describe`, ODT und DOCX jeweils mit den Kern-Fällen,
da beide Formate denselben `WordEditor` teilen — Format-spezifisch sind nur die
Rundreise-Assertions gegen die jeweilige XML):

```ts
test.describe('Spalte löschen (ODT)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Cursor in mittlerer Spalte einer 3×3-Tabelle löscht genau diese Spalte', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    // 2x2-Standardtabelle -> für 3x3 wird direkt ein JSON-Fixture über Datei-Upload
    // verwendet (kein "Tabelle einfügen mit wählbarer Größe" — das ist `tabelle-einfuegen`,
    // eigener Slug, hier out of scope), ODER Spalte manuell einmal ergänzt, falls im
    // Umsetzungszeitpunkt noch keine Größenwahl existiert.
    ...
    await page.locator('.ProseMirror td').nth(1).click()
    await page.getByRole('button', { name: 'Spalte löschen' }).click()
    await expect(page.locator('.ProseMirror tr').first().locator('td')).toHaveCount(2)
  })

  test('Button ist deaktiviert außerhalb einer Tabelle', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await expect(page.getByRole('button', { name: 'Spalte löschen' })).toBeDisabled()
  })

  test('letzte verbleibende Spalte: Button bleibt deaktiviert, kein stiller No-Op', async ({ page }) => {
    // 1-spaltige Tabelle (oder alle Spalten einer 2-spaltigen Tabelle per CellSelection
    // markiert) -> Button MUSS disabled sein, siehe Abschnitt 1.1 dieses Plans.
    ...
    const button = page.getByRole('button', { name: 'Spalte löschen' })
    await expect(button).toBeDisabled()
  })

  test('CellSelection über Teilhöhe einer Spalte löscht dennoch die gesamte Spalte', async ({ page }) => {
    const cells = page.locator('.ProseMirror td')
    await cells.nth(0).hover()
    await page.mouse.down()
    await cells.nth(3).hover() // gleiche Spalte, andere Zeile — CellSelection über 2 von 3 Zeilen
    await page.mouse.up()
    await page.getByRole('button', { name: 'Spalte löschen' }).click()
    ...
  })

  test('Undo stellt die gelöschte Spalte inkl. Inhalt wieder her, Redo löscht erneut', async ({ page }) => {
    ...
    await page.keyboard.press('ControlOrMeta+z')
    ...
    await page.keyboard.press('ControlOrMeta+y')
    ...
  })

  test('Selection-Sync-Regression: Spalte löschen, dann in verbleibende Zelle klicken und tippen', async ({ page }) => {
    // Analog tests/e2e/selection-regression.spec.ts, aber mit "Spalte löschen" als
    // auslösendem Schritt (Abschnitt 2.10/3.19/7.12 der Anforderungsdatei).
    ...
  })

  test('Rundreise: ODT mit 3×3-Tabelle hochladen, mittlere Spalte löschen, exportieren', async ({ page }) => {
    const input = odtCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'tabelle.odt', mimeType: '...', buffer: /* Fixture */ })
    ...
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const zip = await JSZip.loadAsync(await fs.readFile((await download.path())!))
    const contentXml = await zip.file('content.xml')!.async('text')
    expect((contentXml.match(/<table:table-column/g) ?? []).length).toBe(2)
    expect((contentXml.match(/<table:table-cell/g) ?? []).length).toBe(4) // 2 Zeilen × 2 Zellen
  })
})

test.describe('Spalte löschen (DOCX)', () => {
  // Gleiche Fallgruppe wie oben, Rundreise-Assertion gegen word/document.xml:
  // genau 2 <w:gridCol> und pro <w:tr> genau 2 <w:tc>.
})

test.describe('Spalte löschen — Grenzfälle', () => {
  // colspan-Reduktion, rowspan-Erhalt, Bild in gelöschter Spalte, verschachtelte Tabelle,
  // Cross-Format-Rundreise DOCX->ODT->DOCX und ODT->DOCX->ODT.
})
```

**Wichtiger Hinweis für die Umsetzung der `CellSelection`-per-Maus-Testfälle:** Ein einzelnes
`hover()` auf die Zielzelle nach `mouse.down()` erzeugt in Playwright nur ein bis wenige
`mousemove`-Events; `tableEditing()`s eigener Drag-Handler benötigt mindestens ein
`mousemove` über der Zielzelle, um die Selektion zu erweitern. Falls sich das beim
Implementieren als zu unzuverlässig erweist, `page.mouse.move(x, y, { steps: 10 })` mit
expliziten Koordinaten (aus `boundingBox()` der Ziel-`<td>`) statt `hover()` verwenden.

**Fixtures:** Für die Rundreise-Testfälle mit „> 5 Spalten, > 10 Zeilen" (Testfall 15,
Abschnitt 5.1.4/5.2.4 der Anforderungsdatei) und die reale LibreOffice-ODT mit
`covered-table-cell` (Testfall 15/18) müssen Binärdateien beschafft/erzeugt werden — kein
solches Fixture existiert aktuell im Repo (`E:\docs\test.odt` im Repo-Root ist die einzige
vorhandene Test-ODT-Datei; Inhalt vor Verwendung prüfen, ob sie überhaupt eine Tabelle mit
vertikaler Verbindung enthält). Falls kein passendes Open-Source-Testkorpus-Fixture
beschafft werden kann, ist dies **explizit als offene Abhängigkeit** zu vermerken (siehe
Abschnitt 4) statt stillschweigend übersprungen zu werden.

### 3.11 `tests/e2e/selection-regression.spec.ts` (Fix, kein neuer Testfall)

Keine strukturelle Änderung nötig, **sobald** Abschnitt 3.2 (`aria-label="Tabelle einfügen"`)
umgesetzt ist — der bereits vorhandene, aktuell rote Test „same regression inside a table
cell" wird dadurch wieder grün (in Abschnitt 1.3 verifiziert: der einzige Fehlerpunkt ist der
Locator, keine tiefere Logik). **Vor Abschluss dieses Features erneut mit Playwright
ausführen und grün bestätigen** — nicht nur „sollte jetzt funktionieren" annehmen.

### 3.12 `tests/e2e/docx.spec.ts` / `tests/e2e/odt.spec.ts` (optional erweitern)

Kein Zwang zur Änderung (die neuen Tabellen-Rundreise-Fälle leben primär in der neuen Datei
`table-columns.spec.ts`, Abschnitt 3.10) — falls die bestehenden Dateien inhaltlich besser
zum „normaler Rundreise-Smoke-Test je Format"-Zweck passen, können die Cross-Format-Fälle aus
Abschnitt 5.3 der Anforderungsdatei (DOCX→ODT→DOCX / ODT→DOCX→ODT nach Spalten-Löschung) auch
hier ergänzt werden. Beide Orte sind vertretbar; Entscheidung ist beim Umsetzen nach
Lesbarkeit zu treffen, nicht architektonisch festgelegt.

---

## 4. Zusammenfassung: geänderte / neue Dateien

| Datei | Art | Zweck |
|---|---|---|
| `src/formats/shared/editor/commands.ts` | ändern | `deleteColumn` re-exportieren, `canDeleteSelectedColumns`-Guard ergänzen (Abschnitt 3.1) |
| `src/formats/shared/editor/tableIcons.tsx` | **neu** | SVG-Icon `DeleteColumnIcon` (Abschnitt 3.3) |
| `src/formats/shared/editor/Toolbar.tsx` | ändern | neuer „Spalte löschen"-Button, `aria-label`-Fix am bestehenden Tabellen-Button (Abschnitt 3.2) |
| `src/index.css` | ändern | `.tableWrapper`-Overflow, `.selectedCell`-Sichtbarkeit, `position: relative` auf `td`/`th` (Abschnitt 3.4) |
| `src/formats/odt/reader.ts` | ändern | `covered-table-cell`-Unterstützung, Befund 8 (Abschnitt 3.7) |
| `src/formats/odt/writer.ts` | ändern | `colCount`-Bug, Befund 7 (Abschnitt 3.8) |
| `src/formats/docx/writer.ts` | **keine Änderung** | Befund 6 verifiziert als bereits korrekt (Abschnitt 3.9) |
| `src/formats/shared/schema.ts` | **keine Änderung** | Tabellen-Nodes unterstützen Löschen bereits strukturell (Abschnitt 3.5) |
| `src/formats/shared/editor/WordEditor.tsx` | **keine Änderung** | Undo/Redo, Cursor-Mapping bereits vorhanden (Abschnitt 3.6) |
| `src/formats/shared/editor/__tests__/commands.test.ts` | **neu** | Unit-Test für `canDeleteSelectedColumns` inkl. Bug-Dokumentation (Abschnitt 3.1) |
| `src/formats/docx/__tests__/roundtrip.test.ts` | ändern | Regressionstest Befund 6 (Abschnitt 3.9) |
| `src/formats/odt/__tests__/roundtrip.test.ts` bzw. neue `coveredTableCell.test.ts` | ändern/neu | Tests Befund 7/8 (Abschnitt 3.7/3.8) |
| `tests/e2e/table-columns.spec.ts` | **neu** | E2E-Abdeckung Abschnitt 7 der Anforderungsdatei (Abschnitt 3.10) |
| `tests/e2e/selection-regression.spec.ts` | **kein Codeänderung, aber Re-Verifikation** | wird durch `aria-label`-Fix wieder grün (Abschnitt 3.11) |

---

## 5. Reihenfolge der Umsetzung (Abhängigkeiten)

1. `src/index.css` (Abschnitt 3.4) — macht `CellSelection` sichtbar, Voraussetzung dafür,
   dass alle folgenden manuellen und automatisierten Maus-Tests überhaupt sinnvoll geprüft
   werden können.
2. `commands.ts` + `commands.test.ts` (Abschnitt 3.1) — isoliert testbarer Kern, keine
   UI-Abhängigkeit.
3. `tableIcons.tsx` + `Toolbar.tsx` (Abschnitt 3.2/3.3) — inkl. `aria-label`-Fix am
   bestehenden Button; danach `selection-regression.spec.ts` erneut laufen lassen und grün
   bestätigen (Abschnitt 3.11), **bevor** die neue E2E-Datei geschrieben wird, damit die
   neue Datei nicht denselben, bereits bekannten Locator-Fehler erbt.
4. `odt/writer.ts` (Abschnitt 3.8, Befund 7) — trivialer, risikoarmer Fix zuerst.
5. `odt/reader.ts` (Abschnitt 3.7, Befund 8) — risikoreicherer Fix, eigener Testlauf der
   gesamten bestehenden ODT-Testsuite danach (`npx vitest run src/formats/odt`), um
   sicherzustellen, dass keine bestehende ODT-Fremddatei-Kompatibilität durch das neue
   Anchor-Array-Verhalten regressiert.
6. `docx/writer.ts`-Regressionstest ohne Codeänderung (Abschnitt 3.9).
7. `tests/e2e/table-columns.spec.ts` (Abschnitt 3.10) — zuletzt, da von allen vorigen
   Schritten abhängig.
8. Reale Fixture-Dateien beschaffen/prüfen (Abschnitt 3.10, letzter Absatz) — parallel zu
   7 möglich, aber deren Ergebnis (grün oder „blockiert durch Befund 8" bzw. „blockiert
   durch fehlendes Fixture") muss vor Abnahme in dieser Datei nachgetragen werden.

---

## 6. Was dieser Plan bewusst NICHT löst

- Kein Kontextmenü-System (Entscheidung 1, Abschnitt 2) — nur Toolbar.
- Keine automatische Neuverteilung der Spaltenbreiten nach dem Löschen — `colwidth` der
  verbleibenden Spalten bleibt unverändert (von `removeColSpan` in der Bibliothek bereits so
  behandelt, entspricht Abschnitt 2.7 der Anforderungsdatei).
- `spalte-einfuegen`, `zeile-loeschen`, `zellen-verbinden`/`zellen-teilen`, `tabelle-loeschen`,
  `kopfzeile-wiederholen`, Track-Changes-Markierung — alle explizit außerhalb des Scopes
  (Abschnitt 6 der Anforderungsdatei), hier nicht mit umgesetzt.
- Vollständige Überarbeitung des ODT-Tabellenmodells (z. B. eigenes Schreiben von
  `covered-table-cell`-Platzhaltern im Writer) — der Reader-Fix in Abschnitt 3.7 behandelt
  nur den Lesepfad für Fremddateien; der eigene Writer bleibt bewusst unverändert
  (schreibt weiterhin keine Platzhalter, ist intern weiterhin selbstkonsistent).
- Beschaffung/Kuratierung eines konkreten Open-Source-Testkorpus-Fixtures (Apache-POI-Daten
  o. Ä.) — wird in Abschnitt 3.10 als offene Abhängigkeit benannt, nicht hier vorweggenommen.

---

## 7. Zuordnung zu den Abnahmekriterien (Abschnitt 10 der Anforderungsdatei)

| # | Kriterium | Abgedeckt durch |
|---|---|---|
| 1 | Echter klickbarer UI-Weg | Abschnitt 3.2 (Toolbar-Button) |
| 2 | Alle 3 Erkennungsfälle einzeln getestet | Abschnitt 3.10 (Testfälle „Cursor", „CellSelection Teilhöhe", „CellSelection mehrere Spalten") |
| 3 | Verbindungsverhalten (colspan/rowspan) nachgewiesen | Abschnitt 3.10 (Grenzfälle-Testgruppe) + 3.8/3.9 (Unit-Tests) |
| 4 | Letzte-Spalte-Grenzfall sichtbar zurückgemeldet | Abschnitt 3.1 (`canDeleteSelectedColumns`) + 3.2 (`disabled`) |
| 5 | Selection-Sync-Regressionstest mit „Spalte löschen" | Abschnitt 3.10 (dedizierter Testfall) + 3.11 (Vorbedingung: bestehender Test muss zuerst wieder grün sein) |
| 6 | Rundreise DOCX/ODT/Cross-Format/reale Fremddateien | Abschnitt 3.10 |
| 7 | Befunde 6-9 einzeln geprüft, Ergebnis nachgetragen | Abschnitt 3.7/3.8/3.9 (Befund 6: bereits korrekt; Befund 7: behoben; Befund 8: behoben, minimal; Befund 9: Asymmetrie durch 7+8 aufgelöst) |
| 8 | Kein stiller Datenverlust/keine JS-Exception | Abschnitt 3.1 (Guard verhindert Fehlklick), 3.10 (Testabdeckung) |
| 9 | Undo/Redo zuverlässig | Abschnitt 3.6 (bereits vorhanden), 3.10 (Testnachweis) |
| 10 | Backlog-Status-Änderung erst nach 1-9 | Nicht Teil dieses Code-Plans — Entscheidung nach Testlauf-Ergebnissen von Abschnitt 3.10/5 |
