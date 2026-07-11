# Feature „Spalte löschen" — Dateigenauer Umsetzungsplan

Status: **Entwurf, Entwickler-Review vor Umsetzung — kritische Neufassung (2026-07-04).**
Basiert auf `specs/spalte-loeschen-req.md` und einer **eigenen, direkt am aktuellen Code
durchgeführten Verifikation** (jede Datei gelesen, `prosemirror-tables@1.8.5` bis auf
Quelltext-/Export-Ebene inspiziert, und — entscheidend — **vier lauffähige Probe-Tests
gegen den echten Reader/Writer/State** ausgeführt, um die zentralen Streitpunkte
empirisch zu klären, statt sie zu behaupten).

> **Warum Neufassung:** Die vorige Fassung dieses Dokuments war an mehreren Stellen
> **veraltet oder sachlich falsch** — sie stützte sich auf gedriftete Zeilennummern und auf
> Annahmen, die der reale Code widerlegt. Zwei ihrer Kernvorschläge hätten
> funktionierenden Code **verschlechtert** (siehe Abschnitt 0 und 3). Diese Fassung
> ersetzt sie vollständig. Wo eine Aussage empirisch geprüft wurde, steht „**[verifiziert]**"
> mit der Prüf-Methode.

---

## 0. Was gegenüber der Vorfassung korrigiert wurde (mit Belegen)

| Thema | Vorfassung behauptete | Tatsächlicher Stand (im Code/durch Probe verifiziert) | Konsequenz |
|---|---|---|---|
| **`aria-label` am „Tabelle einfügen"-Button** (Vorf. Befund 1.3) | Button habe **kein** `aria-label`, nur `title`; der Test `selection-regression.spec.ts` sei deshalb **rot**; man müsse `aria-label` erst ergänzen. | **Falsch/veraltet.** `Toolbar.tsx:280` trägt bereits `aria-label="Tabelle einfügen"`. Der Locator in `selection-regression.spec.ts:46` (`getByRole('button', { name: 'Tabelle einfügen' })`) ist damit **gültig**. | Kein Toolbar-Fix am Bestandsbutton nötig. Der neue Button bekommt ebenfalls ein `aria-label` — als Neubau, nicht als Reparatur. |
| **SVG-Icons im Projekt** (Vorf. Entscheidung 8 / 3.3) | Es gebe **kein** `<svg` in `src/`; „Spalte löschen" sei der **erste** SVG-Icon-Präzedenzfall. | **Falsch.** `Toolbar.tsx:33-53` enthält bereits `ScissorsIcon` — inline-SVG mit `currentColor`, `aria-hidden`, `focusable="false"`. | Das neue Icon **folgt** einem bestehenden Muster (1:1 an `ScissorsIcon` orientieren), es begründet keinen neuen Präzedenzfall. |
| **ODT-`colCount` (Befund 7)** | `odt/writer.ts:88` laute `rows[0]?.content?.length ?? 1` und müsse auf die `colspan`-Summe geändert werden. | **Falsch/veraltet.** `odt/writer.ts:115-116` summiert bereits `colspan` (`reduce(... colspan ...)`), identisch zum DOCX-Writer. Der Writer schreibt zudem korrekt `<table:covered-table-cell/>` für colspan (Z. 161) **und** rowspan (Z. 137). | **Keine** Writer-Codeänderung. Nur Regressionstest (Abschnitt 5.6). |
| **ODT-`covered-table-cell`-Reader (Befund 8)** | Der Reader ignoriere `covered-table-cell` → **Spaltenverschiebung auch bei selbst erzeugten** `rowspan`-Dateien; Fix: Reader mit Anker-Array analog DOCX **neu schreiben** und `rowspan` aus der Anzahl der Folgezellen **rekonstruieren**. | **Empirisch widerlegt [verifiziert, 3 Probe-Tests].** Der aktuelle Reader liest `number-rows-spanned` **direkt vom Anker** und überspringt `covered-table-cell` — das ist für ODF **korrekt**. Selbst erzeugte `rowspan`-ODTs **und** echte LibreOffice-Dateien (u. a. `tableCoveredContent.odt`, 24 covered-cells — nicht 33, siehe Korrektur 0.1.d —, rowspan bis 6) reisen fehlerfrei rund. Der vorgeschlagene Rewrite hätte `rowspan` **doppelt gezählt** (Attribut **+** Folgezellen) und exakt diese heute funktionierenden Dateien **kaputt gemacht**. | **Kein** Reader-Rewrite. Der ODT-Reader bleibt unverändert. Details + Gegenbeweis in Abschnitt 3. |
| **Zeilennummern durchgehend** | `Toolbar.tsx:228-239`, `WordEditor.tsx:81-82`, `docx/writer.ts:130`, `odt/writer.ts:88`, `odt/reader.ts:192`, `docx/reader.ts:210-256`, `schema.ts:106`. | **Alle gedriftet.** Aktuell (2026-07-05 direkt nachgeprüft, nach Einzug des `Ausschneiden`-Features): `Toolbar.tsx:277-289`, `WordEditor.tsx:109-110` (Tabellen-Plugins) bzw. `93-95` (Undo-Keymap, `history()` bei `84`), `docx/writer.ts:160`, `odt/writer.ts:115-116`, `odt/reader.ts:301-321`, `docx/reader.ts:311-364`, `schema.ts:154`, `commands.ts:6`. | Referenzen unten aktualisiert; wo Drift wahrscheinlich ist, wird zusätzlich das **Symbol** genannt. |
| **Fehlende Test-Fixtures** | Es existiere kein Tabellen-Fixture außer `E:\docs\test.odt`. | **Falsch.** `tests/fixtures/external/odt/` enthält einen ganzen Korpus, u. a. `BigTable.odt`, `table-column-delete-with-merge.odt`, `table-column-delete-with-merge-2-times.odt`, `tableCoveredContent.odt`, `tableComplex_DOC_LO41.odt`. Für DOCX analog `tests/fixtures/external/docx/`. | Rundreise-/Fremddatei-Tests nutzen diesen vorhandenen Korpus, keine Neu-Beschaffung nötig (Abschnitt 5.7). |

Die inhaltlich korrekten Teile der Vorfassung (eigener „letzte Spalte"-Guard,
CSS-Sichtbarkeit, `.tableWrapper`-Overflow, Toolbar-Button, kein Kontextmenü, kein Dialog)
sind übernommen und **zusätzlich empirisch abgesichert**.

## 0.1 Eigene Korrekturen dieser Durchsicht (Stand 2026-07-05, dritte Prüfung)

Beim erneuten, unabhängigen Abgleich **dieser** Datei gegen den aktuellen Code (nicht nur
gegen die Anforderungsdatei) wurden vier weitere Punkte gefunden, die vor Umsetzung korrigiert
werden müssen:

| # | Thema | Was diese Datei bisher sagte | Tatsächlicher Stand (verifiziert) | Konsequenz |
|---|---|---|---|---|
| a | `commands.test.ts` (Abschnitt 5.1 a. F.) | „Es gibt bisher keine Testdatei für `commands.ts`", Datei wird als **neu** angelegt | **Falsch.** `src/formats/shared/editor/__tests__/commands.test.ts` **existiert bereits** — mit `describe('canCut', …)`/`describe('cutSelection', …)` für das `Ausschneiden`-Feature (`stateWithDoc()`-Helper, `EditorState.create({ doc, schema: wordSchema })`). **[verifiziert, Datei gelesen, 105 Zeilen]** | Die neuen Guard-Tests werden als **zusätzliche** `describe`-Blöcke an die **bestehende** Datei angehängt, nicht als neue Datei. Abschnitt 4.1/5.1/6 unten korrigiert. |
| b | Icon-Datei (Abschnitt 4.2 a. F.) | Neue Datei `tableIcons.tsx` (mit Escape-Hatch „alternativ lokal") | `grep -n "^function.*Icon" Toolbar.tsx` liefert **genau einen** Treffer (`ScissorsIcon`, Z. 33) — das **einzige** bisherige Icon im Projekt ist **inline in `Toolbar.tsx` definiert**, keine separate Icon-Datei existiert. **[verifiziert]** | Kein neues File. `DeleteColumnIcon` wird 1:1 wie `ScissorsIcon` **lokal in `Toolbar.tsx`** ergänzt — das ist der einzig belegte Präzedenzfall, nicht bloß eine gleichwertige Alternative. |
| c | Cross-Format-Rundreise auf Objektebene (Abschnitt 5.3 a. F.) | vage: „in derselben Datei oder Erweiterung von `docx.spec.ts`/`odt.spec.ts`" — das sind aber **Playwright**-E2E-Dateien, die aktuell **keine** `readX`/`writeY`-Funktionen importieren (nur rohes XML/JSZip zur Gegenprobe), und Cross-Format ist per Anforderung Befund 18 explizit **nicht** browserbasiert nachweisbar. | Es existiert ein **exaktes** Vorbild für genau diesen Fall: `src/formats/docx/__tests__/cut-roundtrip.test.ts` — ein reiner Vitest-Unit-Test (keine Playwright/Browser-Abhängigkeit), der den „Zustand nach der Aktion" **von Hand als JSON konstruiert** und dann `writeDocx→readDocx` sowie **`writeOdt→readOdt→writeDocx→readDocx`** (Cross-Format-Doppelkonvertierung, dort Z. 106-120) prüft — **ohne** je einen zweiten UI-Export zu benötigen. **[verifiziert, Datei komplett gelesen]** | Konkrete neue Datei nach demselben Muster: `src/formats/docx/__tests__/delete-column-roundtrip.test.ts` (Abschnitt 5.3a unten) statt der vagen Formulierung. |
| d | Zahlenangabe „33 `covered-table-cell`" (Abschnitt 3.1 Punkt 2) | `tableCoveredContent.odt` habe „33 `covered-table-cell`" (aus `spalte-loeschen-qa.md` übernommen) | **Ungenau — eigene Nachzählung, zwei unabhängige Methoden:** `unzip … \| grep -o 'covered-table-cell' \| wc -l` liefert **33**, aber das ist ein **Substring-Zähl-Artefakt**: 15 der Elemente sind selbstschließend (`<table:covered-table-cell/>`, 1 Treffer je Element), 9 haben Attribute/Kindinhalt und damit ein **separates** Schlusstag `</table:covered-table-cell>` — macht `15 + 9 (Auf) + 9 (Zu) = 33` Substring-Treffer, aber nur **24 tatsächliche Elemente** (per DOM-Zählung `<table:covered-table-cell(\s\|>)` bestätigt: 15+9=24). `rowspan bis 6` ist dagegen korrekt (`number-rows-spanned="6"` real vorhanden). **[verifiziert, zweimal gegengerechnet: JSZip+Regex in Node **und** `unzip`+`grep` in Bash]** | Kein Blocker, keine Code-Konsequenz — nur eine Zahlenkorrektur, damit ein künftiger QA-Durchlauf nicht versucht, „33" als Elementzahl zu reproduzieren und dabei fälschlich von einem Bug ausgeht. Unten in Abschnitt 3.1 korrigiert. |

Die übrigen, im Vorgänger-Review bereits geprüften Punkte (Zeilennummern, Befund 6-9,
Fixture-Verfügbarkeit) wurden in dieser Durchsicht **erneut stichprobenartig** gegen den
Code geprüft (u. a. `deleteColumn`/`removeColumn`/`tableEditing`-Keymap im installierten
`node_modules/prosemirror-tables/dist/index.js` wörtlich gelesen, `TableRect`/`TableMap`-
Typdefinitionen in `dist/index.d.ts` gegen den Guard-Code in Abschnitt 4.1 geprüft) und
**bestätigt**, keine weitere Korrektur nötig.

---

## 1. Verifizierter Ist-Stand (dateigenau, Stand 2026-07-05 — Zeilenrefs erneut am aktuellen Code geprüft)

- **`prosemirror-tables@1.8.5`** (`package.json:29`). Exportiert **[verifiziert, `grep` über
  `dist/index.d.ts`]** genau die benötigten Symbole: `deleteColumn`, `selectedRect`,
  `isInTable`, `CellSelection`, `TableMap`, `columnResizing`, `tableEditing`. Kein eigener
  Löschalgorithmus nötig.
- **`WordEditor.tsx:109-110`** registriert `columnResizing()` und `tableEditing()`.
  `history()` (Z. 84) samt Keymap `Mod-z`/`Mod-y`/`Mod-Shift-z` (Z. 93-95) steht im
  Plugin-Block. Undo/Redo und
  `CellSelection`-per-Maus funktionieren dadurch bereits — nur die Aktion „löschen" fehlt.
- **`WordEditor.tsx:125-133`** (`dispatchTransaction`) ruft `forceRender((n) => n + 1)`
  bei **jeder** Transaktion auf (Z. 131, außerhalb des `if (tr.docChanged)`-Zweigs bei
  Z. 128). **[verifiziert,
  Code gelesen]** Damit rendert die Toolbar auch bei reinen **Selektionsänderungen** neu —
  Voraussetzung dafür, dass der `disabled`-Zustand des neuen Buttons live mitläuft (genau
  wie heute schon `canCut`/`isInTable` an den Bestandsbuttons).
- **`WordEditor.tsx:117-121`** dokumentiert die bewusste Entscheidung: **kein** eigenes
  Kontextmenü, kein `contextmenu`-`preventDefault`; das native Browser-Kontextmenü bleibt
  erreichbar.
- **`Toolbar.tsx:277-289`**: einziger Tabellenbezug — Button „⊞ Tabelle", ruft
  `insertTable(2, 2)` (`commands.ts:92-102`), hat bereits `aria-label="Tabelle einfügen"`
  (Z. 280). Der `run`-Helper (`Toolbar.tsx:28-31`) ruft `command(view.state, view.dispatch,
  view)` und danach `view.focus()`.
- **`Toolbar.tsx:143-156`**: „Ausschneiden"-Button — **maßgeblicher Präzedenzfall** für den
  neuen Button: `disabled={!canCut(view.state)}` plus die Utility-Klassen
  `disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`.
- **`Toolbar.tsx:33-53`**: `ScissorsIcon` — bestehendes inline-SVG (Vorlage fürs neue Icon).
- **`commands.ts:1-6`**: importiert nur `isInTable` aus `prosemirror-tables` und
  re-exportiert es (`export { isInTable }`). **Kein** `deleteColumn`, **kein** Guard.
- **`schema.ts:154`**: `...tableNodes({ tableGroup: 'block', cellContent: 'block+',
  cellAttributes: {} })` — liefert `colspan`/`rowspan`/`colwidth` und ein Schema, das das
  Entfernen von Spalten strukturell erlaubt. Keine Änderung nötig.
- **`index.css:50-56`**: `.ProseMirror td, .ProseMirror th` — hat `border/padding/min-width/
  vertical-align`, **kein** `position: relative`. **Keine** `.selectedCell`-Regel, **keine**
  `.tableWrapper`-Regel, `prosemirror-tables/style/tables.css` wird **nicht** importiert
  (Befund 12 der Anforderung — real, siehe 2.2).
- **`docx/writer.ts:160`** und **`odt/writer.ts:115-116`**: `colCount` = Summe der
  `colspan`-Werte **aus Zeile 0**. Für reguläre Tabellen korrekt (siehe aber die
  Einschränkung in Abschnitt 3.3).
- **`odt/reader.ts:301-321`**: liest `childElements(rowEl, table, 'table-cell')` (schließt
  `covered-table-cell` durch exakten `localName`-Vergleich aus) und übernimmt
  `number-columns-spanned`/`number-rows-spanned` direkt vom Anker. **Für ODF korrekt**
  (Abschnitt 3).
- **`docx/reader.ts:311-364`** (`parseTable`): nutzt ein `anchors`-Array und **rekonstruiert
  `rowspan` durch Zählen** von `vMerge`-Fortsetzungen — nötig, weil OOXML den `rowspan`
  **nicht** als Zahl speichert. Diese Asymmetrie zu ODF ist der Grund, warum das
  DOCX-Muster **nicht** auf den ODT-Reader übertragen werden darf (Abschnitt 3).
- **Kein** `deleteColumn`-Aufruf, **kein** `table-columns.spec.ts`, **kein** UI-Weg. Backlog
  „fehlt" ist zutreffend.

---

## 2. Selbst verifizierte Befunde (Belege)

### 2.1 „Letzte Spalte"-Guard von `deleteColumn` greift bei dispatch-losem Aufruf nicht — **[verifiziert, Quelltext + Probe-Test]**

Quelltext `node_modules/prosemirror-tables/dist/index.js:1388` (wörtlich gelesen):

```js
function deleteColumn(state, dispatch) {
  if (!isInTable(state)) return false;
  if (dispatch) {
    const rect = selectedRect(state);
    const tr = state.tr;
    if (rect.left == 0 && rect.right == rect.map.width) return false;  // <-- NUR innerhalb if(dispatch)
    ...
    dispatch(tr);
  }
  return true;  // dispatch-los: erreicht, OHNE den Guard geprüft zu haben
}
```

Probe-Test (gegen echten `EditorState` mit `wordSchema`, danach wieder entfernt):
`deleteColumn(state)` **ohne** `dispatch` liefert auf einer **1-spaltigen** Tabelle `true`,
während der eigene Guard `canDeleteSelectedColumns` korrekt `false` liefert; bei einer
`CellSelection` über **alle** Spalten einer 3-spaltigen Tabelle liefert der eigene Guard
ebenfalls `false`, bei **einer von drei** Spalten `true`. Beide Probe-Fälle **grün**.

Konsequenz: Der `disabled`-Zustand darf **nicht** über `deleteColumn(state)` bestimmt
werden. Eigener Guard über das exportierte `selectedRect` (Abschnitt 4.1).

### 2.2 `CellSelection` ist visuell unsichtbar; `.tableWrapper` hat keinen Overflow — **[verifiziert, `grep`/Code]**

`tableEditing()` dekoriert selektierte Zellen mit der Klasse `selectedCell`
(`dist/index.js`, 2 Vorkommen), `columnResizing()` kapselt jede Tabelle in
`<div class="tableWrapper">` (1 Vorkommen). **`src/index.css` stylt beides nicht** (kein
Treffer für `selectedCell`/`tableWrapper`; kein Import der Bibliotheks-CSS). Ergebnis:
markierte Spalte unsichtbar; breite Tabelle kann auf schmalen Viewports die Seite sprengen.
→ CSS in Abschnitt 4.4 ergänzen. Real, unverändert gültig.

### 2.3 `Backspace`/`Delete` sind bereits belegt — **[verifiziert, Quelltext]**

`dist/index.js:2122-2125` bindet `Backspace`/`Mod-Backspace`/`Delete`/`Mod-Delete` an
`deleteCellSelection` (leert nur den **Inhalt** markierter Zellen). Diese Tasten dürfen
**nicht** für strukturelles Spaltenlöschen umgewidmet werden (Befund 14 der Anforderung).
Nur als Test-Abgrenzung relevant, kein Produktionscode.

---

## 3. Der Streitpunkt Befund 8 — empirische Klärung (zentral)

Dies ist die wichtigste inhaltliche Korrektur gegenüber der Vorfassung **und** gegenüber
der Anforderungsdatei (deren Befund 8 die Beweislast selbst als „vor belastbarer
Verifikation zu klären" markiert — hier ist sie geklärt).

### 3.1 Behauptung vs. Messung

Anforderung/Vorfassung: „Der Reader überspringt `covered-table-cell`, dadurch verschiebt
sich die Spaltenzuordnung in Fortsetzungszeilen — **auch bei selbst erzeugten** ODTs mit
`rowspan`."

**Gemessen (3 Probe-Tests, jeweils grün, danach entfernt):**

1. **Selbst erzeugt:** `writeOdt` → `readOdt` einer 2×2-Tabelle mit `rowspan:2`-Zelle A in
   (0,0), B in (0,1), C in (1,1). Ergebnis: Zeile 0 hat 2 Zellen, Zeile 1 hat **1** Zelle
   (C), A behält `rowspan:2`. Aus dem importierten Dokument gebaute `TableMap`: `width=2,
   height=2`, `grid[1][0]` zeigt auf A (Abdeckung durch rowspan), `grid[1][1]` = C.
   **Exakt korrekt** — `deleteColumn` würde auf einem sauberen 2×2-Raster arbeiten.
2. **Echte LibreOffice-Dateien:** `readOdt` → `writeOdt` → `readOdt` für vier reale
   Fixtures mit echten vertikalen Verbindungen (`number-rows-spanned` gesetzt):
   `tableCoveredContent.odt` (**24** `covered-table-cell`-Elemente — nicht 33, siehe
   Korrektur d in Abschnitt 0.1 —, `rowspan` bis 6), `TestTextTable.odt`,
   `tableRowDeletionTest.odt` reisen **fehlerfrei** rund (gleiche `TableMap`-Dimensionen,
   `rowspan > 1` erhalten, jede Map rechteckig `w*h === cells`). Die vierte Fixture
   (`tableOps.odt`) scheitert an der Rundreise — aber aus einem **anderen**, unter 3.3
   erklärten Grund (Writer-`colCount`-Schwäche, nicht Befund 8).
3. **Warum der Reader korrekt ist:** In **ODF** ist `rowspan` ein **explizites Attribut**
   (`table:number-rows-spanned`) am Anker; `covered-table-cell` ist reiner Platzhalter. Der
   Reader liest das Attribut und **überspringt** die Platzhalter — `prosemirror-tables`
   rekonstruiert die Spaltenposition aus den Spans (`TableMap`). In **OOXML** ist `rowspan`
   dagegen **implizit** (Zählung der `vMerge`-Fortsetzungen), weshalb `docx/reader.ts` dort
   ein Anker-Array **braucht**. Das DOCX-Muster auf ODF zu übertragen ist **falsch**.

### 3.2 Warum der vorgeschlagene Reader-Rewrite aktiv schädlich gewesen wäre

Der Rewrite der Vorfassung hätte pro `covered-table-cell` den `rowspan` des Ankers
**inkrementiert** — **zusätzlich** zum bereits gelesenen `number-rows-spanned`-Attribut.
Da der eigene Writer für eine `rowspan:2`-Zelle sowohl das Attribut **als auch** eine
`covered-table-cell` schreibt (`odt/writer.ts:137`), hätte der Rewrite `rowspan` **doppelt
gezählt** (2 aus dem Attribut + 1 pro Folgezelle) und die heute grünen Fälle aus 3.1
zerstört. Die Begründung der Vorfassung („selbst erzeugte Dateien haben 0 Folgezellen")
ist nachweislich falsch — der Writer erzeugt sie. **Deshalb: kein Reader-Rewrite.**

### 3.3 Was tatsächlich (aber außerhalb dieses Scopes) unrund ist — **[verifiziert, Probe]**

Von den vier realen `rowspan`-Fixtures scheiterte **eine** an der Rundreise: `tableOps.odt`
(eine Tabelle schrumpft `width 4 → 3`). Ursachenanalyse (Probe + Roh-XML):

- Die Tabelle ist **irregulär**: Zeile 0 belegt 3 Rasterspalten, Zeile 1 belegt 4.
- Das Quell-XML nutzt ODF-**Kompressionsattribute**, die der Reader **nicht** umsetzt:
  `<table:table-column table:number-columns-repeated="4"/>`,
  `<table:table-row table:number-rows-repeated="777">` und
  `<table:table-cell table:number-columns-repeated="2">` (zwei identische Zellen, **kein**
  `colspan`). Dadurch liest der Reader Zeile 0 zu schmal.
- Beim Export greift dann der **eigentliche** Defekt: **Writer leitet `colCount` allein aus
  Zeile 0 ab** (`odt/writer.ts:115`, `docx/writer.ts:160`). Ist eine spätere Zeile breiter,
  bricht die `while (col < colCount)`-Schleife zu früh ab und **verwirft** die
  überzähligen Zellen der breiteren Zeile → Datenverlust.

Einordnung:
- **Nicht** die `covered-table-cell`-Lücke aus Befund 8; ein **anderer**, tieferliegender
  Import-/Export-Randfall.
- **Nicht** durch „Spalte löschen" ausgelöst: `deleteColumn` entfernt eine Spalte über
  **alle** Zeilen und hält die Tabelle rechteckig; es erzeugt diese Irregularität nie.
- **Pre-existing** und **formatübergreifend** (beide Writer, identisch).

**Empfehlung (nicht Teil dieses Features):** als bekannte Einschränkung in der QA-Notiz
führen. Eine risikoarme Härtung wäre, `colCount` als **Maximum der Spaltenbelegung über
alle Zeilen** statt nur aus Zeile 0 zu berechnen (in `odt/writer.ts` **und**
`docx/writer.ts` symmetrisch). Das ist ein eigener, sauber testbarer Fix und sollte **nicht**
in „Spalte löschen" versteckt werden — hier nur dokumentiert, damit es nicht als
Regression **dieses** Features fehlgedeutet wird.

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/editor/commands.ts` (ändern)

Aktuell (Z. 1-6):

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
 * Deliberately does NOT probe applicability via `deleteColumn(state)` (dispatch omitted):
 * prosemirror-tables 1.8.5 nests its "would this empty the whole table" guard *inside*
 * `if (dispatch) {…}` (node_modules/prosemirror-tables/dist/index.js, function
 * `deleteColumn`), so a dispatch-less call returns `true` whenever `isInTable` holds —
 * even when the selection already spans every column. Verified with a state-level probe:
 * `deleteColumn(state)` returns true on a single-column table. Relying on it would leave
 * the toolbar button wrongly enabled for the "letzte verbleibende Spalte" case, making the
 * click a silent no-op. This replicates the exact guard `deleteColumn` applies internally.
 */
export function canDeleteSelectedColumns(state: EditorState): boolean {
  if (!isInTable(state)) return false
  const rect = selectedRect(state)
  return !(rect.left === 0 && rect.right === rect.map.width)
}
```

`deleteColumn` hat exakt die `Command`-Signatur `(state, dispatch?, view?) => boolean` und
ist direkt als Toolbar-Callback verwendbar (nur Re-Export, wie `isInTable`).
`selectedRect` ist öffentlich exportiert (verifiziert). Logik des Guards **[verifiziert per
Probe]**.

### 4.2 `src/formats/shared/editor/Toolbar.tsx` — neues Icon **inline**, keine neue Datei (korrigiert, siehe 0.1.b)

**Kein** neues File `tableIcons.tsx`. `grep -n "^function.*Icon" Toolbar.tsx` liefert
**genau einen** Treffer im gesamten Projekt (`ScissorsIcon`, Z. 33-53) — das einzige bisher
existierende Icon ist lokal in `Toolbar.tsx` definiert, es gibt **keine** separate
Icon-Datei, die dieser Plan fortsetzen könnte. `DeleteColumnIcon` wird deshalb **1:1 nach
demselben Muster direkt in `Toolbar.tsx` neben `ScissorsIcon`** ergänzt (nicht davor, nicht
in einer eigenen Datei):

```tsx
function DeleteColumnIcon() {
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

Verbindlich ist nur: inline-SVG, `currentColor`, kein Unicode/Emoji, `aria-hidden`,
`focusable="false"` (exakt die vier Eigenschaften, die `ScissorsIcon` bereits hat). Die
genaue Geometrie (3-Spalten-Gitter mit „X" über der mittleren Spalte) ist frei justierbar.
Sollte ein künftiges Geschwister-Feature (`spalte-einfuegen`, `zeile-loeschen`) ein drittes
Icon brauchen, ist **das** der richtige Zeitpunkt, die drei Icons in eine gemeinsame Datei
zu extrahieren — nicht vorab für ein einzelnes neues Icon.

### 4.3 `src/formats/shared/editor/Toolbar.tsx` (ändern)

1. Import ergänzen (der Block `Z. 6-20` importiert bereits aus `./commands`):
   ```ts
   import { canDeleteSelectedColumns, deleteColumn, /* … bestehende … */ } from './commands'
   ```
   Kein zusätzlicher Icon-Import nötig — `DeleteColumnIcon` ist wie `ScissorsIcon` lokal in
   derselben Datei definiert (4.2). `isInTable` ist bereits importiert (Z. 14).

2. **Neue Komponente** analog zu `MarkButton`/`AlignButton`, mit dem **`disabled`-Muster
   des „Ausschneiden"-Buttons** (`Toolbar.tsx:143-156`) — nicht mit einer selbstgebauten
   Klassenlogik:

   ```tsx
   function DeleteColumnButton({ view }: { view: EditorView }) {
     const inTable = isInTable(view.state)
     const canDelete = canDeleteSelectedColumns(view.state) // enthält isInTable-Prüfung
     const title = !inTable
       ? 'Spalte löschen — Cursor muss in einer Tabelle stehen'
       : canDelete
         ? 'Spalte löschen (entfernt die gesamte Spalte)'
         : 'Letzte verbleibende Spalte kann nicht einzeln gelöscht werden — ggf. Tabelle löschen'
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
         className="px-2 py-1 rounded text-sm flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
       >
         <DeleteColumnIcon />
         <span>Spalte löschen</span>
       </button>
     )
   }
   ```

   Eingebunden als `<DeleteColumnButton view={view} />` **direkt nach** dem „⊞ Tabelle"-Button
   (nach Z. 289, vor dem Bild-`<label>` Z. 291).

   Designpunkte:
   - **`aria-label="Spalte löschen"`** — Pflicht (Anforderung 2/7): für ein `<button>`
     gewönne sonst der Textinhalt (name-from-content) über `title`; der Test adressiert über
     `getByRole('button', { name: 'Spalte löschen' })`.
   - **`disabled`, kein `aria-pressed`** — „Spalte löschen" ist kein Toggle. Der
     „Tabelle einfügen"-Button nutzt `aria-pressed` (vorbestehende kleine A11y-Ungenauigkeit)
     — **nicht** übernehmen, aber auch nicht im Rahmen dieses Features korrigieren.
   - **Immer sichtbar**, nur `disabled` wechselt — vermeidet Layout-Sprünge/E2E-Races
     (konsistent mit „Ausschneiden"/„Tabelle einfügen"). Der `disabled`-Zustand bleibt live,
     weil `dispatchTransaction` bei jeder Transaktion neu rendert (Abschnitt 1).
   - **`onMouseDown` + `preventDefault`** — wie alle Toolbar-Buttons, damit die
     (Zell-)Selektion beim Klick nicht verloren geht.

3. **Kurzer Code-Kommentar** über dem Button: `Backspace`/`Delete` leeren bei aktiver
   `CellSelection` nur den Zellinhalt (`tableEditing()` → `deleteCellSelection`,
   `dist/index.js:2122-2125`) — beabsichtigt, **kein** struktureller Löschweg; damit ein
   späterer Bearbeiter das nicht als Bug „repariert".

Der bestehende „Tabelle einfügen"-Button wird **nicht** angefasst (hat sein `aria-label`
bereits).

### 4.4 `src/index.css` (ändern)

`.ProseMirror td, .ProseMirror th` (Z. 50-56) um `position: relative` ergänzen und die
zwei fehlenden Regeln hinzufügen:

```css
.ProseMirror td,
.ProseMirror th {
  border: 1px solid #9ca3af;
  padding: 4px 8px;
  min-width: 2em;
  vertical-align: top;
  position: relative; /* anchor for the .selectedCell overlay below */
}

/* columnResizing() wraps every table in this element via its TableView node view —
   without overflow handling a wide table blows out the page on narrow viewports
   (mobile/tablet, playwright.config.ts projects). */
.ProseMirror .tableWrapper {
  overflow-x: auto;
}

/* tableEditing() decorates every selected cell with .selectedCell — this app never styled
   it, so a CellSelection (e.g. dragged across a column before "Spalte löschen") was
   invisible. Overlay via ::after keeps text/borders untouched and is pointer-transparent. */
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

Bewusst **kein** `@import` von `prosemirror-tables/style/tables.css` — dessen
`table-layout: fixed`/`overflow: hidden` kollidierte mit den bestehenden
`.ProseMirror table`-Regeln (Z. 44-48); nur die fehlenden Teile gezielt ergänzen.

### 4.5 `src/formats/shared/schema.ts` — **keine Änderung**

`tableNodes(...)` (Z. 154) liefert `colspan`/`rowspan`/`colwidth` und erlaubt das Entfernen
strukturell. Bestätigt, kein Bedarf.

### 4.6 `src/formats/shared/editor/WordEditor.tsx` — **keine Änderung**

- Undo/Redo bereits vorhanden (`history()` Z. 84 + Keymap Z. 93-95); jede `deleteColumn`-Transaktion
  landet automatisch in der Historie.
- Cursor-Platzierung nach dem Löschen: `CellSelection.map(...)` fällt bibliotheksseitig auf
  eine `TextSelection` zurück, sobald die markierten Zellen wegfallen; die vorhandene
  `reconcileSelectionOnClick`-Logik (Z. 43-50) greift beim Folgeklick zusätzlich.
- Nur per E2E zu verifizieren, kein Produktionscode.

### 4.7 `src/formats/odt/reader.ts` — **keine Änderung** (Befund 8 empirisch geklärt)

Siehe Abschnitt 3. Der Reader ist für ODF-`rowspan` (`number-rows-spanned` am Anker +
`covered-table-cell` als Platzhalter) korrekt; der in der Vorfassung geplante Rewrite wäre
schädlich. Statt Code: ein **Regressionstest**, der die heute korrekte Rundreise absichert
(Abschnitt 5.5).

### 4.8 `src/formats/odt/writer.ts` — **keine Änderung** (Befund 7 bereits erledigt)

`colCount` summiert bereits `colspan` (Z. 115-116); `covered-table-cell` wird für colspan
(Z. 161) und rowspan (Z. 137) geschrieben. Nur **Regressionstest** (Abschnitt 5.6). Die in
Abschnitt 3.3 beschriebene `colCount`-aus-Zeile-0-Schwäche ist **außerhalb** dieses Scopes.

### 4.9 `src/formats/docx/writer.ts` / `docx/reader.ts` — **keine Änderung**

`colCount` (Writer Z. 160) ist für reguläre Tabellen korrekt; `vMerge`-Fortsetzungen werden
nie als eigene JSON-Zellen gespeichert (Befund 6). Der DOCX-Reader (Z. 311-364) behandelt
`vMerge` bereits robust. Nur Regressionstest (Abschnitt 5.6).

---

## 5. Tests

### 5.1 `src/formats/shared/editor/__tests__/commands.test.ts` (ändern — Datei existiert bereits, korrigiert siehe 0.1.a)

**Korrektur:** Die Datei existiert bereits (105 Zeilen, `describe('canCut', …)` und
`describe('cutSelection', …)` für das `Ausschneiden`-Feature, inkl. eines `stateWithDoc()`-
Helpers mit `EditorState.create({ doc, schema: wordSchema })`). Die neuen Tests werden als
**zusätzliche** `describe`-Blöcke an diese Datei angehängt — die bestehenden `canCut`/
`cutSelection`-Blöcke bleiben unverändert. Deckt den Guard aus 4.1 ab (eigener Doc-Helper mit
einer echten Tabelle via `wordSchema.node('table', …)`, dazu `CellSelection.create(doc,
anchorPos, headPos)` für die Mehrfachspalten-Fälle — Muster **[verifiziert]**, exakt so im
Guard-Probe-Test genutzt):

- `canDeleteSelectedColumns` = `false` außerhalb einer Tabelle.
- `= false` für die einzige Spalte einer 1-spaltigen Tabelle **und** für eine
  `CellSelection`, die alle Spalten einer mehrspaltigen Tabelle umfasst.
- `= true` für eine von mehreren Spalten (Cursor) und für eine `CellSelection` über eine
  Teilmenge der Spalten.
- **Bibliotheks-Dokumentationstest:** `deleteColumn(state)` **ohne** dispatch liefert auf
  einer 1-spaltigen Tabelle `true` — hält das Fehlverhalten fest, damit ein künftiges
  Bibliotheks-Update auffällt und der Workaround dann bewusst entfernt werden kann.

### 5.2 Neue E2E-Datei `tests/e2e/table-columns.spec.ts` (neu)

Konventionen aus `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
(`odtCard(page)`/`docxCard(page)`, „verstanden"→„Neu erstellen", `page.locator('.ProseMirror')`,
`input[type="file"]` für Upload, `page.waitForEvent('download')` + `JSZip.loadAsync` für
Export-Assertions). Buttons **immer** über `getByRole('button', { name: 'Spalte löschen' })`
bzw. `{ name: 'Tabelle einfügen' }`.

**Wichtige Umsetzungs-Randbedingung [verifiziert]:** `insertTable` erzeugt **fest 2×2**
(`commands.ts:92`, `Toolbar` ruft `insertTable(2, 2)`), und `spalte-einfuegen` existiert
nicht. Ein **3-spaltiger** Ausgangszustand (für „mittlere Spalte löschen, 2 bleiben") lässt
sich also **nicht** über die Toolbar herstellen. Lösung: Für alle Fälle, die ≥ 3 Spalten
oder `colspan`/`rowspan` brauchen, ein **Fixture per `input[type=file]` hochladen** (aus dem
vorhandenen Korpus `tests/fixtures/external/…` oder ein im Test via `writeOdt`/`writeDocx`
erzeugtes Dokument als Buffer). Fälle mit 2 Spalten (Grenzfall „letzte Spalte", disabled)
funktionieren direkt mit der 2×2-Tabelle.

Abzudeckende Fälle (Anforderung Abschnitt 7):
1. Cursor in mittlerer Spalte (3×3-Fixture) → „Spalte löschen" → 2 Spalten, Inhalt korrekt.
2. Cursor außerhalb Tabelle → Button `disabled`, keine Exception.
3. `CellSelection` über Teilhöhe (Maus-Drag über 2 von 3 Zeilen) → gesamte Spalte weg.
4. `CellSelection` über mehrere Spalten → alle markierten Spalten weg.
5. **Sichtbarkeit (Befund 12):** Spalte per Drag markieren → `.selectedCell`-Overlay ist
   sichtbar (`toHaveCSS`/Screenshot), **bevor** gelöscht wird.
6. `colspan:2`-Fixture → eine überspannte Spalte löschen → verbleibende Zelle behält Inhalt,
   `colspan` um 1 reduziert.
7. `rowspan:2`-Fixture → diese Spalte löschen → Zeilenanzahl unverändert.
8. 2-spaltige Tabelle → eine löschen → 1-spaltig, weiter editierbar.
9. **Letzte Spalte / alle Spalten markiert → Button `disabled`** (zentraler Pflichtfall,
   prüft Befund 13 auch bei `CellSelection` über alle Spalten).
10. Bild in einer Zelle der Spalte (`filechooser`) → Spalte löschen → Bild vollständig weg.
11. `Backspace`/`Delete` auf markierter Spalte → nur Zellinhalt geleert, Spalte bleibt
    (Abgrenzung Befund 14).
12. Undo (Strg+Z) → Spalte inkl. Inhalt zurück; Redo (Strg+Y) → erneut gelöscht.
13. Zwei Löschvorgänge, dann zweimal Undo → einzeln in umgekehrter Reihenfolge zurück.
14. **Selection-Sync-Regression** (Anforderung 3.10/7.14): Tabelle → tippen → Spalte
    markieren+löschen → in verbleibende Zelle klicken → tippen → Text landet korrekt.
15. Verschachtelte Tabelle (Grenzfall 14): äußere Spalte mit innerer Tabelle löschen → kein
    Absturz, innere Tabelle verschwindet mit.
16. Mobile/Tablet-Projekte (Pixel 7, iPad Mini): mind. Fall 1 und 9 grün; Tabelle sprengt
    den Viewport nicht (`.tableWrapper`-Overflow).

### 5.3 E2E-Rundreise über echten Upload/Download (Gleichformat) — Erweiterung von `docx.spec.ts`/`odt.spec.ts` oder der neuen Datei

**Nur Gleichformat** gehört hierher (echter Browser-Upload/-Download, Befund 18: kein
UI-Formatwähler beim Export). Cross-Format ist **nicht** Teil dieser Ebene — siehe 5.3a.

- **5.0 Basis-Rundreise ohne Änderung** je Format (inkl. ODT-`rowspan`): Upload →
  unverändert exportieren → reimportieren → Tabelle inhaltlich identisch. Sichert ab, dass
  „Spalte löschen" bestehende Tabellen nicht beschädigt.
- **DOCX** (Anforderung 5.1): 3×3-Fixture → mittlere Spalte löschen → Export →
  unabhängige XML-Assertion: `<w:tblGrid>` hat genau 2 `<w:gridCol>`, jede `<w:tr>` genau 2
  `<w:tc>`. Plus `colspan`-Reduktion, `rowspan`-Erhalt, zwei aufeinanderfolgende Löschungen.
- **ODT** (Anforderung 5.2): analog gegen `content.xml`: genau 2 `<table:table-column>` und
  pro `<table:table-row>` genau 2 `<table:table-cell>`.

### 5.3a Cross-Format-Rundreise auf Objektebene (Befund 18) — `src/formats/docx/__tests__/delete-column-roundtrip.test.ts` (neu, korrigiert siehe 0.1.c)

**Korrektur:** Die Vorfassung dieses Abschnitts verwies vage auf „dieselbe Datei oder eine
Erweiterung von `docx.spec.ts`/`odt.spec.ts`" — das sind aber Playwright-E2E-Dateien, die
aktuell keine `readX`/`writeY`-Funktionen importieren, und die Anforderung (Befund 18)
verlangt für Cross-Format ausdrücklich **Objektebene**, nicht einen (nicht existierenden)
zweiten UI-Export. Es gibt dafür bereits ein **exaktes** Vorbild im Repo:
`src/formats/docx/__tests__/cut-roundtrip.test.ts` — ein reiner Vitest-Unit-Test (kein
Playwright, kein Browser), der den Zustand „nach der Aktion" **von Hand als JSON**
konstruiert (`doc([...])`/`paragraph(...)`-Helper, Z. 9-17) und dann sowohl den normalen
Gleichformat-Roundtrip (`writeDocx→readDocx`, `roundTrip()`-Helper Z. 15-17) als auch die
**Cross-Format-Doppelkonvertierung** prüft (`describe('DOCX Rundreise: Doppel-Konvertierung
…')`, Z. 106-120: `writeOdt→readOdt→writeDocx→readDocx`, dynamischer Import der
ODT-Module, um einen Zyklus-Import zwischen den Formatmodulen zu vermeiden).

Neue Datei **1:1 nach diesem Muster**, aber mit einer **Tabelle** als Zustand „nach Spalte
löschen" statt eines Absatzes:

```ts
import { writeDocx } from '../writer'
import { readDocx } from '../reader'
import type { WordDocumentContent } from '../../shared/documentModel'

function doc(content: unknown[]): WordDocumentContent {
  return { body: { type: 'doc', content }, header: null, footer: null, meta: { title: '' } }
}
function paragraph(text: string) {
  return { type: 'paragraph', attrs: { align: 'left' }, content: text ? [{ type: 'text', text }] : [] }
}
// Zustand "nach Spalte löschen": eine 3-spaltige Tabelle, deren mittlere Spalte bereits
// entfernt ist (2 verbleibende Zellen pro Zeile) — genau das Ergebnis, das `deleteColumn`
// produziert, hier von Hand konstruiert wie in cut-roundtrip.test.ts (kein UI/Command-Aufruf).
function postDeleteColumnTable() {
  return doc([
    {
      type: 'table',
      content: [
        { type: 'table_row', content: [
          { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('A1')] },
          { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('C1')] },
        ] },
        { type: 'table_row', content: [
          { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('A2')] },
          { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('C2')] },
        ] },
      ],
    },
  ])
}

describe('DOCX Rundreise: Zustand "nach Spalte löschen" (spalte-loeschen-req.md Abschn. 5.1)', () => {
  it('2 verbleibende Spalten, Inhalt unverändert', async () => {
    const result = await readDocx(await writeDocx(postDeleteColumnTable()))
    const table = (result.body as any).content[0]
    expect(table.content).toHaveLength(2) // Zeilen unverändert
    expect(table.content[0].content).toHaveLength(2) // Spalten: 3 → 2
    expect(table.content[0].content[0].content[0].content[0].text).toBe('A1')
    expect(table.content[0].content[1].content[0].content[0].text).toBe('C1')
  })
})

describe('DOCX Rundreise: Doppel-Konvertierung nach Spalte löschen (Abschn. 5.3/9)', () => {
  it('bleibt nach DOCX → ODT → DOCX inhaltlich stabil (Befund 18: Objektebene, kein zweiter UI-Export)', async () => {
    const { writeOdt } = await import('../../odt/writer')
    const { readOdt } = await import('../../odt/reader')
    const postDelete = postDeleteColumnTable()
    const viaOdt = await readOdt(await writeOdt(postDelete))
    const final = await readDocx(await writeDocx(viaOdt))
    const table = (final.body as any).content[0]
    expect(table.content[0].content).toHaveLength(2)
    expect(table.content[0].content[0].content[0].content[0].text).toBe('A1')
  })
})
```

Zusätzlich abzudecken (alle nach demselben Muster, hand-konstruiertes „Nach-Löschen"-JSON,
kein UI): `colspan:2`-Zelle nach Löschen einer überspannten Spalte (`colspan` bereits auf 1
reduziert), `rowspan:2`-Zelle nach Löschen der Nachbarspalte (Zeilenanzahl unverändert), und
der ODT-Start-Fall `ODT → DOCX → ODT` (spiegelbildlich, Anforderung 5.3 Punkt 2). Das deckt
Anforderung Abschnitt 5.1 Punkt 5, 5.2 Punkt 5 und 5.3 vollständig auf der einzig laut
Befund 18 möglichen Ebene ab — **ohne** einen (nicht existierenden) zweiten
Export-Formatwähler vorauszusetzen.

### 5.4 `tests/e2e/selection-regression.spec.ts` — **keine Änderung, nur Re-Verifikation**

Der Bestandstest nutzt `getByRole('button', { name: 'Tabelle einfügen' })` (Z. 46); das
`aria-label` ist vorhanden (Toolbar Z. 280), der Locator also gültig. **Vor Feature-Abschluss
erneut ausführen und grün bestätigen** — nicht annehmen.

### 5.5 Regressionstest ODT-`rowspan`-Rundreise (Befund 8) — `src/formats/odt/__tests__/roundtrip.test.ts` erweitern

Der vorhandene Test „…covered-table-cell placeholders for a vertical (rowspan) merge"
(Z. 310-338) prüft **nur die Writer-XML**, **nicht** die volle Rundreise. Ergänzen: ein
**vollständiger** `writeOdt → readOdt`-Durchlauf einer `rowspan:2`-Tabelle mit Assertion,
dass Zeile 0 zwei Zellen, Zeile 1 eine Zelle hat und `rowspan===2` erhalten bleibt (das ist
die Absicherung dessen, was Abschnitt 3.1 empirisch gezeigt hat). Optional zusätzlich: eine
reale Fixture (`tableCoveredContent.odt`) über `readOdt → writeOdt → readOdt` auf stabile
`TableMap`-Dimensionen prüfen (in `src/formats/odt/__tests__/external-fixtures.test.ts`
existiert bereits die Infrastruktur zum Laden solcher Fixtures).

### 5.6 Regressionstests `colCount` (Writer) — bestehende Roundtrip-Tests erweitern

- ODT (Befund 7): Tabelle mit `colspan:2` in Zeile 0 → `writeOdt` → **direkt gegen die XML**
  prüfen: genau 3 `<table:table-column>` (der bereits vorhandene colspan-Test bei Z. 275-308
  ist die Vorlage; ggf. um den rowspan-Rundreise-Assert aus 5.5 ergänzen).
- DOCX (Befund 6): Tabelle mit `colspan:2` in Zeile 0 → `writeDocx` → genau 3 `<w:gridCol>`
  in `<w:tblGrid>`. Schreibt die Invariante fest, bevor `zeile-loeschen` sie relevant macht.

### 5.7 Reale Fremddateien (Anforderung 5.1.4/5.2.4)

Nutzt den **vorhandenen** Korpus statt Neu-Beschaffung: DOCX mit großer Tabelle aus
`tests/fixtures/external/docx/`, ODT u. a. `tableCoveredContent.odt`,
`table-column-delete-with-merge.odt`, `BigTable.odt` aus `tests/fixtures/external/odt/`.
Falls ein konkretes Fixture die in Abschnitt 3.3 beschriebene
`number-columns-repeated`-Schwäche trifft (z. B. `tableOps.odt`), ist das als
**bekannte, pre-existing Writer-Einschränkung** zu kennzeichnen — **nicht** als Fehlschlag
von „Spalte löschen".

---

## 6. Zusammenfassung: geänderte / neue Dateien

| Datei | Art | Zweck |
|---|---|---|
| `src/formats/shared/editor/commands.ts` | ändern | `deleteColumn` re-exportieren, `canDeleteSelectedColumns`-Guard (4.1) |
| `src/formats/shared/editor/Toolbar.tsx` | ändern | neuer „Spalte löschen"-Button **inkl.** lokal definiertem `DeleteColumnIcon` (4.2/4.3); Bestandsbutton **unangetastet**. **Kein** separates Icon-File (korrigiert, 0.1.b) |
| `src/index.css` | ändern | `.tableWrapper`-Overflow, `.selectedCell`-Overlay, `position: relative` (4.4) |
| `src/formats/shared/schema.ts` | **keine Änderung** | Tabellen-Nodes unterstützen Löschen bereits (4.5) |
| `src/formats/shared/editor/WordEditor.tsx` | **keine Änderung** | Undo/Redo, Cursor-Mapping vorhanden (4.6) |
| `src/formats/odt/reader.ts` | **keine Änderung** | Befund 8 empirisch als **kein Bug** widerlegt (3, 4.7) |
| `src/formats/odt/writer.ts` | **keine Änderung** | Befund 7 bereits erledigt (4.8) |
| `src/formats/docx/writer.ts`, `docx/reader.ts` | **keine Änderung** | Befund 6/9 bereits korrekt (4.9) |
| `src/formats/shared/editor/__tests__/commands.test.ts` | **ändern** (Datei existiert bereits für `canCut`/`cutSelection`, korrigiert 0.1.a) | zusätzlicher `describe`-Block für den `canDeleteSelectedColumns`-Guard + Bibliotheks-Doku (5.1) |
| `src/formats/odt/__tests__/roundtrip.test.ts` | ändern | volle `rowspan`-Rundreise (5.5), colspan-`colCount` (5.6) |
| `src/formats/docx/__tests__/roundtrip.test.ts` | ändern | `colCount`-Invariante (5.6) |
| `src/formats/docx/__tests__/delete-column-roundtrip.test.ts` | **neu** (nach Vorbild `cut-roundtrip.test.ts`, korrigiert 0.1.c) | Objektebene: Gleichformat- **und** Cross-Format-Rundreise „Zustand nach Spalte löschen" (5.3a) — einziger Nachweisweg für Befund 18 |
| `tests/e2e/table-columns.spec.ts` | **neu** | E2E-Abdeckung Anforderung Abschnitt 7, nur Gleichformat (5.2/5.3) |
| `tests/e2e/selection-regression.spec.ts` | **keine Änderung, nur Re-Verifikation** | Locator bereits gültig (5.4) |

Netto **produktiver** Code: `commands.ts`, `Toolbar.tsx` (Button + Icon), ein CSS-Block. Kein
Reader/Writer-Eingriff. Der Rest ist Test — davon ein Bestandteil (`commands.test.ts`) eine
**Erweiterung** einer bereits vorhandenen Datei, keine neue.

---

## 7. Reihenfolge der Umsetzung

1. `src/index.css` (4.4) — macht `CellSelection` sichtbar; Voraussetzung für sinnvolle
   manuelle **und** E2E-Maus-Tests.
2. `commands.ts` + Erweiterung von `commands.test.ts` (4.1/5.1) — isoliert testbarer Kern,
   keine UI; bestehende `canCut`/`cutSelection`-Blöcke bleiben unangetastet.
3. `Toolbar.tsx` — neuer Button **inkl.** lokal definiertem `DeleteColumnIcon` (4.2/4.3);
   danach `selection-regression.spec.ts` laufen lassen und grün bestätigen (5.4), **bevor**
   die neue E2E-Datei entsteht.
4. `src/formats/docx/__tests__/delete-column-roundtrip.test.ts` (5.3a) — reine Objektebene,
   nach Vorbild `cut-roundtrip.test.ts`; deckt Gleichformat **und** Cross-Format (Befund 18)
   ab, unabhängig von Schritt 3.
5. Regressionstests Writer/Reader (5.5/5.6) — reine Testarbeit, kein Produktionscode.
6. `tests/e2e/table-columns.spec.ts` (5.2/5.3) — zuletzt, hängt von allem ab; Fixtures aus
   dem vorhandenen Korpus (5.7).

---

## 8. Bewusst NICHT Teil dieses Features

- **Kein** Kontextmenü (Toolbar-Entscheidung, `WordEditor.tsx:117-121`).
- **Kein** Bestätigungsdialog (Undo genügt; keine Dialog-Infrastruktur im Projekt).
- **Kein** Reader-Rewrite für `covered-table-cell` (Befund 8 als Nicht-Bug widerlegt, 3).
- **Keine** automatische Spaltenbreiten-Neuverteilung (`colwidth` bleibt).
- **Kein** Fix der `colCount`-aus-Zeile-0-Schwäche des Writers (Abschnitt 3.3) — realer,
  aber **pre-existing**, formatübergreifender, von „Spalte löschen" **nicht** ausgelöster
  Randfall; separat zu behandeln (Empfehlung: `colCount` = Maximum über alle Zeilen, in
  beiden Writern symmetrisch).
- **Keine** Umsetzung von `number-columns-repeated`/`number-rows-repeated` im ODT-Reader
  (eigene Import-Fidelity-Baustelle, 3.3).
- `spalte-einfuegen`, `zeile-loeschen`, `zellen-verbinden`/`-teilen`, `tabelle-loeschen`,
  `kopfzeile-wiederholen`, Track-Changes — eigene Slugs (Anforderung Abschnitt 6).

---

## 9. Zuordnung zu den Abnahmekriterien (Anforderung Abschnitt 10)

| # | Kriterium | Abgedeckt durch |
|---|---|---|
| 1 | Echter klickbarer Toolbar-Button (`aria-label`) | 4.3 |
| 2 | Markierte Spalte vor dem Klick sichtbar | 4.4 (`.selectedCell`), E2E 5.2/Fall 5 |
| 3 | Alle drei Erkennungsfälle getestet | E2E 5.2/Fälle 1,3,4 |
| 4 | `colspan`/`rowspan`-Verhalten nachgewiesen | E2E 5.2/Fälle 6,7 + Unit 5.5/5.6 |
| 5 | Letzte Spalte via **eigenem** Guard `disabled` (Befund 13) | 4.1 + 4.3 + E2E 5.2/Fall 9 (per Probe verifiziert) |
| 6 | Abgrenzung Backspace/Entf (Befund 14) | E2E 5.2/Fall 11 |
| 7 | Selection-Sync-Regressionstest mit „Spalte löschen" | E2E 5.2/Fall 14 (Vorbedingung 5.4 grün) |
| 8 | Rundreise DOCX/ODT/Cross-Format/reale Fremddateien | 5.3 (Gleichformat, echter Upload/Download) + 5.3a (Cross-Format, Objektebene, Befund 18) + 5.7 |
| 9 | Befunde 6-9 einzeln geprüft, Ergebnis nachgetragen | Befund 6: korrekt (4.9); 7: erledigt (4.8/5.6); **8: als Nicht-Bug widerlegt (3, empirisch)**; 9: OOXML/ODF-Asymmetrie erklärt, kein Fix nötig (1, 3) |
| 10 | Kein stiller Datenverlust / keine Exception | 4.1 (Guard), E2E-Abdeckung; separat dokumentiert: pre-existing `colCount`-Randfall (3.3) |
| 11 | Undo/Redo zuverlässig | 4.6 (vorhanden), E2E 5.2/Fälle 12,13 |
| 12 | Desktop/Mobile/Tablet, kein Viewport-Sprengen | 4.4 + E2E 5.2/Fall 16 |
| 13 | Backlog-Status erst nach 1-12 auf „vorhanden" | nach Testlauf, nicht Teil dieses Plans |
