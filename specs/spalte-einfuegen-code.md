# Umsetzungsplan: Feature „Spalte einfügen (links/rechts)" — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/spalte-einfuegen-req.md`. Stil/Aufbau orientiert an
`specs/ausrichtung-links-code.md` und `specs/fett-code.md`. Dieses Dokument prüft den
**tatsächlichen** Code-Stand (nicht nur die in der Anforderung zitierten Fundstellen),
führt zusätzlich **ausführbare Reproduktionen** der Kernbehauptungen der Anforderung durch
(gegen die echte, im Projekt installierte `prosemirror-tables@1.8.5` mit einem Schema, das
`table_cell`/`table_row`/`table` **identisch** wie `src/formats/shared/schema.ts` über
`tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` erzeugt —
Details Abschnitt 1/3) und legt fest, welche Dateien wie geändert bzw. neu angelegt werden.
**Kein Punkt hier ist bereits umgesetzt — dies ist der Plan, nicht der Vollzug.**

---

## 0. Kurzfassung

Die Codeprüfung aus `spalte-einfuegen-req.md` Abschnitt 0 ist **vollständig zutreffend**:
Es existiert keine einzige Zeile, die eine Tabellenspalte gezielt einfügt
(`grep -rn "addColumn\|insertColumn" src/` → null Treffer). Die eigentliche Arbeit ist
UI-Anbindung (zwei Toolbar-Buttons + Aktivierungszustand) plus Tests — **kein**
Datenmodell-, Schema-, Reader- oder Writer-Umbau.

Vier Kernbehauptungen der Anforderung wurden **tatsächlich ausgeführt** (Node-Repro gegen
`prosemirror-model`/`-state`/`-history`/`-tables` aus `node_modules`, Schema wie oben) und
dabei **bestätigt und mit echten Werten belegt**:

1. **Undo-Gruppierung (Anforderung 3.8) ist bereits korrekt, ohne Zusatzcode:** 2×2-Tabelle,
   Cursor in `B1`, `addColumnAfter` → `[3,3]` Zellen; **ein einziges** `undo()` → `[2,2]`.
   Genau eine Transaktion, ein Dispatch.
2. **Grenzfall 4.2 (gemischte Merges) mit echten Werten:** 3-Spalten-Tabelle, Zeile 1
   `[A1, Merged(colspan 2)]`, Zeile 2 `[A2,B2,C2]`. Cursor in `B2`, `addColumnAfter` →
   Zeile 1 colspans **`[1, 3]`** (Merge wächst 2→3), Zeile 2 Texte **`['A2','B2','','C2']`**
   (echte neue leere Zelle). Beide Effekte in **einer** Aktion, pro Zeile unabhängig.
3. **Grenzfall 4.4 (Mehrfachauswahl):** echte `CellSelection` (via `cellAround`) über
   Spalte 2–3 einer 3×3-Tabelle, `addColumnAfter` → Zeile wächst von 3 auf **4** Zellen
   (nicht 5). **Eine** Spalte pro Klick, unabhängig von der Auswahlbreite.
4. **Grenzfall 4.5 (verschachtelte Tabelle):** äußere 1×2-Tabelle mit innerer 1×2-Tabelle
   in Zelle 1, Cursor in der inneren Tabelle, `addColumnAfter` → äußere Zeile bleibt bei
   **2** Zellen, innere Zeile wächst auf **3**.

Zusätzlich bestätigt: außerhalb einer Tabelle liefert `addColumnBefore(state, dispatch)`
`false` und dispatcht nichts (`isInTable` = `false`) — Grundlage für den `disabled`-Zustand.

Die drei von der Anforderung als „zu entscheiden" markierten Punkte werden in Abschnitt 4
getroffen: (a) Mehrfachauswahl-Semantik → **Bibliotheksverhalten für v1 akzeptiert**,
dokumentiert, mit Testfall belegt; (b) sehr breite Tabellen → **horizontales Scrollen**
(bereits vorhandenes Verhalten) bewusst akzeptiert; (c) Kontextmenü → **nicht Teil** des
Umfangs.

### 0.1 Korrektur gegenüber dem vorherigen Entwurf dieses Plans (wichtig)

Ein früherer Stand dieser Datei (vom selben Tag, vor der Neufassung der Anforderung)
führte einen **ODT-`colCount`-„Pflicht-Fix"** (angeblich `const colCount =
rows[0]?.content?.length ?? 1` in `odt/writer.ts`), dessen Umsetzung in Abschnitt 5.5 und
dessen Tests in Abschnitt 6.2 als bugaufdeckend beschrieben waren. **Dieser Fehler
existiert im tatsächlichen Code nicht (mehr).** `src/formats/odt/writer.ts:115-116` lautet
bereits:

```ts
const colCount =
  (rows[0]?.content ?? []).reduce((sum, cell) => sum + Number(cell.attrs?.colspan ?? 1), 0) || 1
```

— d. h. **Colspan-Summe**, identisch zum DOCX-Writer, und ist durch bestehende Unit-Tests
abgesichert (`odt/roundtrip.test.ts:298`, `.toBe(2)`). Die Anforderung warnt in ihrer
Präambel und in Abschnitt 6 **ausdrücklich** vor genau dieser stehengebliebenen
Fehlbehauptung. Dieser Plan **entfernt** den vermeintlichen Fix vollständig: `odt/writer.ts`
wird **nicht** geändert (Abschnitt 5.5), die zugehörigen Tests sind reiner
**Regressionsschutz** (Abschnitt 6.2), und die Dateiliste (Abschnitt 8) führt `odt/writer.ts`
unter „bewusst unverändert". Zusätzlich wurden **alle** Zeilennummern gegen den aktuellen
Quellstand neu verifiziert (der alte Entwurf zitierte durchgängig veraltete Zeilen, siehe
Abschnitt 2).

### 0.2 Erneute kritische Prüfung (aktueller Durchlauf, unabhängig von 0/0.1)

Für diese Überarbeitung wurden **alle** unten zitierten Fundstellen ein weiteres Mal direkt
gegen den aktuellen Quellstand gelesen (nicht nur aus einer vorherigen Fassung übernommen)
und **alle vier** Kernbehauptungen aus Abschnitt 0/3 erneut ausführbar reproduziert (frisches,
eigenständiges Node-Skript gegen die echte, installierte `prosemirror-tables@1.8.5` mit
identischem Schema) — Ergebnis in jedem Fall **byte-identisch** zu den bereits dokumentierten
Werten (Undo `[2,2]→[3,3]→[2,2]`; Merge-Mischfall `[1,3]`/`['A2','B2','','C2']`;
Mehrfachauswahl `[4,4,4]`; verschachtelt `[2,3]`; außerhalb Tabelle `isInTable=false`,
`addColumnBefore` gibt `false` zurück, kein Dispatch). Zusätzlich neu geprüft und **bestätigt**:
`package.json:29` (`"^1.8.5"`), alle Zeilenanker in `commands.ts`, `Toolbar.tsx`, `WordEditor.tsx`,
`schema.ts`, beiden Writern, beiden Readern, `src/index.css:44-54`, `pageGeometry.ts`
(`PAGE_WIDTH_MM=210`/`PAGE_MARGIN_MM=25` → exakt `794`/`94`/`606` px wie in Abschnitt 3.5
gerechnet), der Merge-Status aller in Abschnitt 5–6 genannten ODT-Fremddateien (`BigTable.odt`,
`OOStyledTable.odt`, `coloredTable_MSO15.odt`, `TableWidth.odt`, `crazyTable.odt`,
`subTables3-nested.odt`: 0 `number-columns-spanned`/`number-rows-spanned`, also **merge-frei**;
`tableComplex_DOC_LO41.odt`: 12 `number-columns-spanned`, 0 `number-rows-spanned`, also
**horizontale Merges**; `table-column-delete-with-merge.odt`: 2 `number-columns-spanned` —
ebenfalls horizontal) sowie die Existenz von `zeile-einfuegen-req.md`/`spalte-loeschen-req.md`
und der unveränderte Backlog-Status „fehlt" (`FEATURE-BACKLOG.md:185`). Keine der geprüften
Aussagen musste korrigiert werden — zwei **Präzisierungen** wurden trotzdem ergänzt (siehe
Fußnoten in 6.5 und 6.6), da beide Stellen für die spätere Testimplementierung sonst zu
Verwirrung führen könnten:

- **`tests/e2e/selection-regression.spec.ts` hat inzwischen vier statt drei Tests** (ein
  vierter, Kopieren-bezogener Regressionstest wurde von `kopieren-code.md` bei `:88-110`
  ergänzt, `test.describe`-Block endet jetzt bei `:111`). Ändert nichts an Abschnitt 6.5 selbst
  (dort war ohnehin nur „ans Ende anfügen" gefordert, keine Zeilenzahl-Annahme), ist aber der
  Vollständigkeit halber hier festgehalten, damit „ans Ende" beim Implementieren korrekt als
  „nach Zeile 111" verstanden wird.
- **`playwright.config.ts` hat inzwischen fünf statt drei Projekte** (`:34-36` weiterhin
  Desktop Chrome/Mobile/Tablet wie zitiert, **plus** zwei neue, jeweils per `testMatch:
  /clipboard.*\.spec\.ts/` auf Clipboard-Tests beschränkte Projekte „Desktop Safari
  (Clipboard)"/„Desktop Firefox (Clipboard)", `:43-53`). Das neue `tables.spec.ts` (6.4)
  matcht dieses `testMatch`-Muster nicht und läuft daher weiterhin nur auf den drei in
  Abschnitt 2 Punkt 6 / Grenzfall 4.15 geforderten Projekten (Desktop Chrome, Mobile, Tablet)
  — die zwei neuen Projekte sind **nicht** zusätzlich abzudecken.

---

## 1. Methodik

Zusätzlich zur Codelektüre aller in der Anforderung genannten Dateien (`schema.ts`,
`Toolbar.tsx`, `commands.ts`, `WordEditor.tsx`, `docx/writer.ts`, `odt/writer.ts`,
`docx/reader.ts`, `odt/reader.ts`, beide `__tests__/roundtrip.test.ts`,
`editor/__tests__/commands.test.ts`, `tests/e2e/selection-regression.spec.ts`,
`tests/e2e/{odt,docx}.spec.ts`):

- **Bibliotheks-Export-Prüfung:** `node -e "Object.keys(require('prosemirror-tables'))"`
  bestätigt, dass `addColumnBefore`, `addColumnAfter`, `addColumn`, `isInTable`,
  `CellSelection`, `cellAround`, `selectedRect`, `columnResizing`, `updateColumnsOnResize`,
  `columnIsHeader` in der installierten Version vorhanden und exportiert sind.
- **Ausführbare Reproduktion** (temporäres, nicht ins Repo übernommenes Node-Skript,
  `NODE_PATH` auf `E:/docs/node_modules`): die vier Behauptungen aus Abschnitt 0 (Undo,
  4.2, 4.4, 4.5) plus der „außerhalb einer Tabelle"-Fall — **alle bestanden ohne jede
  Anpassung an der Bibliothek**. Reine Verifikation, keine Implementierung. Ergebnisse
  wörtlich in Abschnitt 0/3.
- **Breiten-/Layout-Mechanismus** durch Quelltext-Inspektion in
  `node_modules/prosemirror-tables/dist/index.cjs` (`updateColumnsOnResize`,
  `columnResizing`-Defaults) präzisiert — siehe Abschnitt 3.4/3.5.
- **Testkonventionen des Projekts** gesichtet: `editor/__tests__/commands.test.ts`
  (existiert bereits — leichtgewichtiges Muster ohne gemountete `EditorView`, capture-
  dispatch), `odt/__tests__/roundtrip.test.ts` (nutzt `import JSZip` + `writeOdt` +
  `doc()`/`paragraph()`-Helfer, hat bereits `<table:table-column>`-Zähltests bei
  Zeile 298/337), `docx/__tests__/roundtrip.test.ts` (assertet bei Tabellen auf das
  **re-importierte JSON** via `roundTrip()`, nutzt `zipInspect` statt JSZip),
  `tests/e2e/selection-regression.spec.ts` (Muster für Selection-Sync-Tests, hat bereits
  einen Tabellen-Fall), `tests/e2e/{odt,docx}.spec.ts` (Muster `waitForEvent('download')`
  → `download.path()` → `fs.readFile` → `JSZip.loadAsync`, plus `setInputFiles` für
  Re-Upload).
- **Icon-Recherche:** Im gesamten `src/` existiert genau **ein** SVG-Icon (`ScissorsIcon`,
  `Toolbar.tsx:33-53`, `viewBox="0 0 24 24"`, `stroke="currentColor"`, `fill="none"`);
  `package.json` führt **keine** Icon-Bibliothek als Abhängigkeit. Die neuen Icons werden
  daher **im selben Idiom selbst gezeichnet** (Inline-SVG, `currentColor`), nicht aus einer
  externen Quelle bezogen — siehe Entscheidung 4.4/Abschnitt 5.2.

---

## 2. Verifikation der Ist-Stand-Tabelle aus `spalte-einfuegen-req.md` Abschnitt 0

Alle Zeilennummern gegen den aktuellen Quellstand neu geprüft. Die Anforderung ist inhaltlich
korrekt; die hier genannten Zeilen sind der Stand **jetzt** (der frühere Entwurf dieses Plans
zitierte durchweg veraltete Zeilen — Spalte „alter Planentwurf" zeigt den Unterschied).

| Aussage | Aktuelle Fundstelle (verifiziert) | Alter Planentwurf (falsch/veraltet) |
|---|---|---|
| Schema: `tableNodes(...)` liefert `colspan`/`rowspan`/`colwidth` auf `table_cell` | `schema.ts:154` | „`:106`" |
| Toolbar: genau ein „⊞ Tabelle"-Button, `insertTable(2,2)` | `Toolbar.tsx:277-289` (Button), `:284` (`insertTable(2, 2)`) | „`:228-239` / `:284`… teils `:231`" |
| Commands: nur `insertTable`, keine Spalten-Funktion; Re-Export `isInTable` | `commands.ts:92-102` (`insertTable`), `:3`/`:6` (`isInTable`); Datei hat **168** Zeilen | „`:76-86`, 108 Zeilen" |
| Editor: `columnResizing()`/`tableEditing()` aktiv, keine Spalten-Keymap | `WordEditor.tsx:8`, `:109` (`columnResizing()`), `:110` (`tableEditing()`), Keymap `:85-107` | „`:81-82`, Keymap `:71-79`" |
| `prosemirror-tables` v1.8.5, `addColumnBefore`/`addColumnAfter` ungenutzt | `package.json` `"^1.8.5"`; per `Object.keys(require(...))` als Export bestätigt; `grep` in `src/` → 0 Treffer | korrekt |
| DOCX-Writer `colCount` = Colspan-Summe (bereits korrekt) | `docx/writer.ts:158` (`tableToDocx`), `:160` (`colCount`), `:161` (`<w:tblGrid>`/`<w:gridCol w:w="2000"/>`) | „`:128-171`, colCount `:130`" |
| **ODT-Writer `colCount` = Colspan-Summe (bereits korrekt, KEIN Fehler)** | `odt/writer.ts:115-116` (`reduce(... colspan ...)`), `:117` (`<table:table-column/>`) | **„`:88` `rows[0]?.content?.length` — Fehler real, Fix nötig" → FALSCH, siehe 0.1** |
| Beide Reader: `colwidth: null` fest, keine Writer-Nutzung von `colwidth` | `odt/reader.ts:315`, `docx/reader.ts:350` | „`:197` / `:244`" |
| ODT-Reader liest `colspan`/`rowspan` aus echten `table-cell`, überspringt `covered-table-cell` | `odt/reader.ts:304` (`childElements(..., 'table-cell')`), `:305-306` | (nicht zitiert) |
| Kein Kontextmenü im Repo | `grep -rn "contextmenu\|onContextMenu" src/` → 0 Treffer; `WordEditor.tsx:117-121` (Kommentar) | korrekt |
| Bestehende Tabellentests nur JSON-konstruiert, kein E2E-Spalten-Test | `odt/roundtrip.test.ts:219+` (`describe('ODT round trip: tables')`), `docx/roundtrip.test.ts:229+`; `tests/e2e/*` → nur `selection-regression.spec.ts:43` (Tabellen-Fall), kein „Spalte"/„column" | korrekt |

**Zusatzfund (unabhängig von der Anforderung):** `tableNodes()` erzeugt neben `table_cell`
auch einen `table_header`-Typ (`tableRole: 'header_cell'`). **Kein** Reader/Writer/
`insertTable` erzeugt ihn je, daher greift `addColumn`s interne `columnIsHeader`-Prüfung in
dieser App nie — jede neu eingefügte Zelle ist garantiert eine `table_cell`. Kein Fix nötig,
aber im Testplan (6.1) als Regressionsschutz mitbelegt.

**Zusatzfund:** Der bestehende „⊞ Tabelle"-Button trägt `aria-pressed={isInTable(view.state)}`
(`Toolbar.tsx:281`) — semantisch fragwürdig (Einfügen ist kein Umschalter), aber
**außerhalb des Scopes** dieser Anforderung; wird nicht angefasst.

---

## 3. Durch Ausführung verifizierte Detailergebnisse

### 3.1 Undo/Redo (Anforderung 3.8) — bereits korrekt, kein Zusatzcode

`addColumnBefore`/`addColumnAfter` prüfen `isInTable`, ermitteln über `selectedRect` das
Auswahlrechteck und rufen `addColumn(state.tr, rect, rect.left|right)` — **genau ein**
`dispatch`. `addColumn` iteriert intern über `map.height` Zeilen und akkumuliert alle
Änderungen (Zellen-Insert **und** Colspan-Erweiterung) auf **derselben** `tr`. Repro:

```
[undo] before rowCounts: [2,2]   isInTable: true
[undo] after insert:     [3,3]   ok: true
[undo] after single undo:[2,2]   ✓ ein einziges Undo genügt
```

**Konsequenz:** Kein Wrapper-Code für Undo-Gruppierung nötig — ein dünner Re-Export genügt
(Abschnitt 5.1).

### 3.2 Grenzfall 4.2 (gemischte Merges) — exakt nachgestellt

Tabelle: Zeile 1 = `[A1(colspan 1), Merged(colspan 2)]`, Zeile 2 = `[A2, B2, C2]`. Cursor in
`B2`, `addColumnAfter` (Einfügegrenze Grid-Index 2, liegt innerhalb der Zeile-1-Merge):

```
Ergebnis Zeile 1 colspans: [1, 3]                       // Merge 2 → 3 gewachsen
Ergebnis Zeile 2 texte:    ["A2","B2","","C2"]          // echte neue leere Zelle
```

Exakt das in Anforderung 3.4/4.2 beschriebene Verhalten: „Zelle verbreitert" **und** „neue
leere Zelle" in **derselben** Aktion, pro Zeile unabhängig. Kein Zusatzcode.

### 3.3 Grenzfall 4.4 (Mehrfachauswahl) und 4.5 (verschachtelte Tabelle) — exakt nachgestellt

- **4.4:** 3×3-Tabelle, echte `CellSelection` (via `cellAround`, dieselbe interne
  Konstruktion wie `prosemirror-tables` selbst) über Spalte 2–3 (`B1`–`C1`),
  `addColumnAfter` → Zeile wächst von 3 auf **4** (nicht 5). **Eine** Spalte pro Klick.
- **4.5:** äußere 1×2-Tabelle, in Zelle 1 innere 1×2-Tabelle. Cursor in der inneren
  Tabelle, `addColumnAfter` → äußere Zeile **2** Zellen (unverändert), innere Zeile **3**.
  Die Bibliothek löst die relevante Tabelle bereits über `$pos.node(-1)` (in
  `selectionCell`/`selectedRect`) auf die **innerste** Tabelle auf.

### 3.4 Präzisierung zu Anforderung 3.6 (Breite der neuen Spalte)

`columnResizing()` (Aufruf ohne Argumente, `WordEditor.tsx:109`) registriert seinen eigenen
`TableView` selbstständig über `plugin.spec.props.nodeViews` — Spalten-Resizing ist bereits
vollständig verdrahtet, **kein** `nodeViews`-Prop in `new EditorView(...)` nötig. Sein
`updateColumnsOnResize` berechnet pro Spalte `hasWidth = colwidth && colwidth[j]`. Da
`colwidth` in dieser App **immer** `null` ist (`odt/reader.ts:315`, `docx/reader.ts:350`),
ist `hasWidth` für **jede** Spalte falsy → keine feste Pixelbreite pro `<col>`, und das
`<table>` bekommt `style.minWidth = <Spaltenzahl> × defaultCellMinWidth` (Default **100px**,
`prosemirror-tables` `columnResizing({ defaultCellMinWidth = 100 })`), aber **kein**
explizites `width`. Die Stylesheet-Regel `.ProseMirror table { width: 100% }`
(`src/index.css:46`) bleibt wirksam; da **kein** `table-layout: fixed` gesetzt ist
(`grep "table-layout" src/index.css` → 0 Treffer), verteilt der Browser die Breite
**inhaltsbasiert** (`table-layout: auto`). Eine frisch eingefügte leere Spalte bekommt in
der Praxis zunächst nur ihre CSS-`min-width: 2em` (`src/index.css:54`), bis Text hineinkommt.

**Bewertung:** **keine Regression** durch dieses Feature (jede bestehende Mehrspalten-Tabelle
mit `colwidth: null` verhält sich identisch), sondern dieselbe vorbestehende, in
Anforderung 3.6/Abschnitt 7 als „nicht Teil dieses Umfangs" eingestufte Einschränkung — nur
mit dem exakten Mechanismus belegt statt der etwas zu optimistischen Formulierung „dieselbe
Default-Breite wie alle übrigen Spalten". **Kein Fix.** Der Abnahme-Testfall wird geschärft
(6.2/6.4: „neue Spalte ist mindestens `min-width` breit und sofort editierbar", nicht „exakt
gleich breit").

### 3.5 Präzisierung zu Grenzfall 4.7 (sehr breite Tabelle)

Mit `minWidth = <Spaltenzahl> × 100px` und `PAGE_CONTENT_WIDTH_PX = PAGE_WIDTH_PX −
2·PAGE_MARGIN_PX = 794 − 2·94 = **606px**` (`pageLayout.ts:14`) wird die Seiteninhaltsbreite
bereits ab **7 Spalten** überschritten (7×100 = 700 > 606; 6×100 = 600 ≤ 606), nicht erst
„> 10 Spalten" wie das Beispiel in Grenzfall 4.7 nennt. Ab diesem Punkt fängt die **äußere**
scrollende Hülle (`WordEditor.tsx:171`, `className="flex-1 overflow-auto ..."`) den Überlauf
mit horizontalem Scrollbalken ab. **Das ist bereits heute das Verhalten jeder breiten
Tabelle** — Grenzfall 4.7 verlangt nur eine **bewusste** Wahl zwischen „horizontales
Scrollen" und „automatische Schrumpfung". **Entscheidung (4.2): horizontales Scrollen** wird
akzeptiert; kein Code/CSS-Fix, aber ein Crash-/Bedienbarkeitstest (6.4).

---

## 4. Zu treffende Entscheidungen (verbindlich)

### 4.1 Mehrfachauswahl-Semantik (Anforderung 3.3 / Grenzfall 4.4)

**Entscheidung: Bibliotheksverhalten wird für v1 akzeptiert** — eine `CellSelection` über
mehrere Spalten fügt **genau eine** Spalte an der Auswahlgrenze ein, **nicht** eine pro
markierter Spalte (abweichend von Word/LibreOffice). **Begründung:** (a) Word-Parität
erfordert N-faches Wiederholen mit Neuberechnung der Selektionsgrenzen nach jedem Insert
(die `TableMap` ändert sich jeweils) — fehleranfällig; (b) die Anforderung verlangt hier nur
eine **bewusste Entscheidung mit Testfall**, keine bestimmte Semantik; (c) das Verhalten ist
über Testfall 6.1-4 und 6.4 dokumentiert. **Nachbesserungs-Ticket** (falls Word-Parität
später gefordert): eigener Backlog-Eintrag `spalte-einfuegen-mehrfachauswahl`, nicht Teil
dieses Umfangs.

### 4.2 Sehr breite Tabellen (Grenzfall 4.7)

**Entscheidung: horizontales Scrollen** (bereits vorhandenes Verhalten, Abschnitt 3.5) wird
bewusst akzeptiert. Keine automatische Spalten-Schrumpfung. **Begründung:** Schrumpfung
erforderte `table-layout: fixed` + prozentuale `colwidth`-Zuweisung, obwohl `colwidth` laut
Anforderung Abschnitt 7 explizit **außerhalb** des Scopes ist — eine Schrumpfung ohne echte
`colwidth`-Rundreise wäre inkonsistent (Breiten gingen beim nächsten Reader/Writer-Zyklus
ohnehin verloren). Nachweis über Test 6.4.

### 4.3 Kontextmenü

**Bestätigt: nicht Teil dieses Umfangs** (Anforderung Abschnitt 2 Punkt 4 / Abschnitt 7;
`WordEditor.tsx:117-121`). Kein Code hierfür.

### 4.4 Icon-Wahl

**Entscheidung: zwei selbstgezeichnete Inline-SVG-Icons im Idiom des bestehenden
`ScissorsIcon`** (`viewBox="0 0 24 24"`, `stroke="currentColor"`, `fill="none"`), klar
unterscheidbar durch **gespiegelte** Anordnung (hervorgehobene neue Spalte + „+" links bzw.
rechts eines Zwei-Spalten-Rasters), **nicht** nur durch Farbe. **Begründung:** erfüllt
Anforderung Abschnitt 2 Punkt 1/2 (eigenes SVG statt Unicode/Emoji, links/rechts strukturell
verschieden), bleibt konsistent mit dem einzigen bereits vorhandenen Icon und vermeidet eine
neue npm-Abhängigkeit. Die exakte Pfadgeometrie ist illustrativ und beim Implementieren
visuell gegenzuprüfen (Icons sind billig zu justieren) — kein externer Bezug, dessen
Pfaddaten nicht verifizierbar wären.

---

## 5. Dateigenauer Umsetzungsplan

### 5.1 `src/formats/shared/editor/commands.ts` (geändert)

Import erweitern und zwei dünne Re-Exports direkt neben dem bestehenden
`export { isInTable }` (Zeile 6) — bewusst **keine** Neuimplementierung (Abschnitt 3.1: die
Bibliotheksfunktionen erfüllen bereits Undo-Gruppierung, Merge-Verhalten, innerste-Tabelle-
Auflösung):

```ts
// Zeile 3 erweitern:
import { isInTable, addColumnBefore, addColumnAfter } from 'prosemirror-tables'
// … (Rest der bestehenden Imports unverändert)

// direkt bei Zeile 6:
export { isInTable }

/**
 * Fügt eine neue, leere Spalte unmittelbar links der Spalte der aktuellen
 * Selektion ein (bei einer CellSelection über mehrere Spalten: genau eine
 * Spalte links des Auswahlrechtecks — bewusste v1-Entscheidung, siehe
 * spalte-einfuegen-code.md Abschnitt 4.1). Dünner Re-Export von
 * prosemirror-tables' addColumnBefore: behandelt colspan/rowspan an der
 * Einfügegrenze bereits korrekt (verbreitert einen bestehenden Merge statt ihn
 * zu spalten, pro Zeile unabhängig), löst verschachtelte Tabellen auf die
 * innerste auf und dispatcht genau eine Transaktion (ein Undo-Schritt) — durch
 * Ausführung verifiziert, siehe Abschnitt 3.
 */
export const insertColumnBefore: Command = addColumnBefore

/** Symmetrisches Gegenstück zu {@link insertColumnBefore}; fügt rechts ein. */
export const insertColumnAfter: Command = addColumnAfter
```

`Command` ist in dieser Datei bereits importiert (`import type { Command, EditorState } from
'prosemirror-state'`, Zeile 1) — kein zusätzlicher Import nötig. Keine Änderung an
`insertTable` oder sonstigen Exporten.

### 5.2 `src/formats/shared/editor/Toolbar.tsx` (geändert)

**(a) Import aus `./commands` (Zeile 6-20) um die zwei neuen Namen erweitern** —
alphabetisch neben `insertImage`/`insertTable`:

```tsx
import {
  applyMarkColor,
  canCut,
  clearMarkColor,
  cutSelection,
  insertColumnAfter,
  insertColumnBefore,
  insertImage,
  insertTable,
  isAlignActive,
  isInTable,
  liftFromList,
  setAlign,
  setHeading,
  toggleList,
  type Align,
} from './commands'
```

`Command` (`prosemirror-state`, Zeile 3) ist bereits importiert — **nicht** erneut
importieren. Für den Icon-Typ die bestehende React-Typimport-Zeile 1 nutzen:
`import type { ChangeEvent, ReactNode } from 'react'`.

**(b) Neue Komponente `ColumnButton`** (direkt nach `AlignButton`, Zeile 111, einfügen).
Bewusst **nicht** das `onMouseDown`-only-Muster des bestehenden `MarkButton`/`AlignButton`
(`:76-79`/`:98-101`): dort läuft die Aktion in `onMouseDown` — das feuert bei
**Tastatur**-Aktivierung (Tab-Fokus + Enter/Leertaste) **nicht** (kein `mousedown`-Event),
d. h. jene Buttons sind aktuell nicht per Tastatur auslösbar (vorbestehende, hier **nicht**
zu behebende Lücke außerhalb des Scopes). Die neuen Buttons erfüllen Anforderung Abschnitt 2
Punkt 5 (Tastatur) **und** Punkt 1 (Selektionserhalt), indem `onMouseDown` **nur**
`preventDefault()` macht (verhindert Fokus-/Selektionsverlust vor dem Mausklick) und die
Aktion in `onClick` läuft (feuert bei echtem Mausklick **und** bei Enter/Leertaste):

```tsx
function ColumnButton({
  view,
  command,
  title,
  icon,
}: {
  view: EditorView
  command: Command
  title: string
  icon: ReactNode
}) {
  const disabled = !isInTable(view.state)
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => run(view, command)}
      className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
    >
      {icon}
    </button>
  )
}
```

Der `disabled`-Zustand wird bei **jedem** Render neu aus `isInTable(view.state)` bestimmt;
`WordEditor.tsx` erzwingt via `forceRender` bei jeder Transaktion einen Toolbar-Re-Render
(`WordEditor.tsx:131`, im `dispatchTransaction`), sodass sich der Zustand live aktualisiert, wenn der Cursor in eine
Tabelle hinein-/herauswandert — dasselbe Muster wie die aktive Markierung von `MarkButton`.
Da `run()` (`Toolbar.tsx:28-31`) den Rückgabewert des Commands nicht auswertet, ist der
`disabled`-Zustand der einzige (und ausreichende) Schutz gegen einen stillen Fehlschlag
außerhalb einer Tabelle (Anforderung Abschnitt 2 Punkt 3).

**(c) Zwei Icons** (im `ScissorsIcon`-Idiom, ebenfalls nach `AlignButton` bzw. neben
`ScissorsIcon`). Geometrie illustrativ, beim Implementieren visuell prüfen (4.4):

```tsx
function AddColumnLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {/* bestehender Zwei-Spalten-Block rechts */}
      <rect x="12" y="4" width="8" height="16" rx="1" />
      <line x1="16" y1="4" x2="16" y2="20" />
      {/* neue Spalte links markiert durch ein „+" */}
      <line x1="5" y1="8.5" x2="5" y2="15.5" />
      <line x1="1.5" y1="12" x2="8.5" y2="12" />
    </svg>
  )
}

function AddColumnRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {/* bestehender Zwei-Spalten-Block links */}
      <rect x="4" y="4" width="8" height="16" rx="1" />
      <line x1="8" y1="4" x2="8" y2="20" />
      {/* neue Spalte rechts markiert durch ein „+" */}
      <line x1="19" y1="8.5" x2="19" y2="15.5" />
      <line x1="15.5" y1="12" x2="22.5" y2="12" />
    </svg>
  )
}
```

**(d) Aufrufstelle:** direkt **nach** dem bestehenden „⊞ Tabelle"-Button (endet
`Toolbar.tsx:289`), **vor** dem `<label>` für den Bild-Upload (`:291`):

```tsx
      {/* … bestehender „⊞ Tabelle"-Button (277-289) unverändert … */}

      <ColumnButton view={view} command={insertColumnBefore} title="Spalte links einfügen" icon={<AddColumnLeftIcon />} />
      <ColumnButton view={view} command={insertColumnAfter} title="Spalte rechts einfügen" icon={<AddColumnRightIcon />} />

      <label className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer">
        🖼 Bild
        {/* … */}
```

Der bestehende „⊞ Tabelle"-Button (277-289, inkl. des in Abschnitt 2 vermerkten
`aria-pressed`-Sonderfalls) bleibt unverändert.

### 5.3 `src/formats/shared/editor/WordEditor.tsx` (keine Änderung)

Keymap (`:85-107`) und Plugin-Liste (`:83-114`) bleiben unverändert. Die Anforderung sieht
(Abschnitt 2 Punkt 5) **keine** Tastenkombination für dieses Feature vor.
`columnResizing()` (`:109`) und `tableEditing()` (`:110`) sind aktiv und ausreichend
(Abschnitt 3.4).

### 5.4 `src/formats/shared/schema.ts` (keine Änderung)

`tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` (`:154`)
liefert bereits `colspan`/`rowspan`/`colwidth` auf `table_cell` — keine Schema-Änderung
nötig.

### 5.5 `src/formats/odt/writer.ts` (KEINE Änderung — Korrektur gegenüber altem Entwurf)

**Kein Fix.** `odt/writer.ts:115-116` berechnet `colCount` bereits als Colspan-Summe
(`reduce(... colspan ...)`), identisch zum DOCX-Writer, und erzeugt ODF-konforme
`<table:covered-table-cell/>`-Platzhalter (`:119-167`). Der im **früheren Entwurf dieses
Plans** hier verlangte „`colCount`-Bugfix" beruhte auf veraltetem Code und wird **gestrichen**
(siehe 0.1). Diese Datei wird nicht angefasst; die zugehörigen Tests (6.2) sind reiner
Regressionsschutz.

### 5.6 `src/formats/docx/writer.ts` (keine Änderung)

`tableToDocx` (`:158-195`), `colCount` (`:160`), `<w:tblGrid>`/`<w:gridCol>` (`:161`),
`pending`/`<w:vMerge/>` (`:163-193`) sind bereits korrekt. Kein Fix.

### 5.7 `src/formats/docx/reader.ts` / `src/formats/odt/reader.ts` (keine Änderung)

`colwidth: null` (`docx/reader.ts:350`, `odt/reader.ts:315`) bleibt — Spaltenbreiten-Rundreise
ist laut Anforderung Abschnitt 7 explizit **außerhalb** des Scopes. Beide Reader lesen
`colspan`/`rowspan` bereits korrekt; eine im Editor neu eingefügte Spalte fügt sich beim
nächsten Export nahtlos in die (unveränderte) `colCount`-Berechnung beider Writer ein — kein
Sonderpfad für „importiert, dann erweitert" nötig. Der in Anforderung Abschnitt 6.2
benannte **Verifikationspunkt** (ODT-Reader überspringt `covered-table-cell` bei realen
LibreOffice-Fremddateien mit `rowspan`) ist **kein Fix-Auftrag dieses Features**, sondern
eine mit einer echten Fixture zu prüfende Annahme (Test 6.4/6.6); trägt sie nicht, wird sie
als **eigenständige Reader-Abhängigkeit** ticketiert, nicht als „Spalte einfügen"-Fehler.

### 5.8 `src/index.css` (keine Änderung)

Bestehende `table`/`td`/`th`-Regeln (`:44-61`) reichen aus (Abschnitt 3.4/3.5, Entscheidung
4.2). Keine `table-layout: fixed`- oder `overflow-x`-Ergänzung.

---

## 6. Testplan

### 6.1 Geändert (erweitert): `src/formats/shared/editor/__tests__/commands.test.ts`

**Die Datei existiert bereits** (testet `canCut`/`cutSelection`, nutzt `wordSchema.node(...)`
+ `EditorState.create` + capture-dispatch, **ohne** gemountete `EditorView`). Neuer
`describe('Spalte einfügen (insertColumnBefore/insertColumnAfter)', …)`-Block im **selben,
leichtgewichtigen Stil**. Für die Command-Ausführung genügt eine capture-dispatch-Funktion
(kein `EditorView` nötig); für den Undo-Test wird `EditorState.create({ …, plugins:
[history()] })` verwendet; für 4.4 eine echte `CellSelection` via `cellAround` (wie im
Repro, Abschnitt 3.3). Kein neues Testframework, kein jsdom-`EditorView`-Mount nötig.

Hilfsfunktionen (Kopf des Blocks) und Testfälle:

```ts
import { history, undo } from 'prosemirror-history'
import { CellSelection, cellAround } from 'prosemirror-tables'
import { insertColumnBefore, insertColumnAfter, isInTable } from '../commands'

const P = (t?: string) => wordSchema.node('paragraph', { align: 'left' }, t ? [wordSchema.text(t)] : [])
const CELL = (t?: string, attrs = {}) =>
  wordSchema.node('table_cell', { colspan: 1, rowspan: 1, colwidth: null, ...attrs }, [P(t)])
const ROW = (cells: unknown[]) => wordSchema.node('table_row', null, cells as never)
const TABLE = (rows: unknown[]) => wordSchema.node('table', null, rows as never)
// capture-dispatch: liefert den Folgezustand ohne EditorView
function apply(state, cmd) { let out = state; const ok = cmd(state, (tr) => (out = state.apply(tr))); return { ok, state: out } }
```

1. **Grundverhalten 3.1/3.2:** 2×2-Tabelle, Cursor in Zelle 2 Zeile 1, `insertColumnAfter`
   → 3 Spalten, neue Zelle leer an Position 3, Originalinhalt an Position 1/2 unverändert.
   Analog `insertColumnBefore` von Zelle 1 → neue erste Spalte.
2. **Grenzfall 4.1 (1-spaltige Tabelle):** 1×2 → `insertColumnBefore`/`-After` → 2×2,
   Originalinhalt vollständig in der jeweils anderen Spalte.
3. **Grenzfall 4.2 (gemischte Merges):** Aufbau aus Abschnitt 3.2, Assertions
   `rowColspans(row0) == [1,3]` und `rowTexts(row1) == ['A2','B2','','C2']`.
4. **Grenzfall 4.4 (Mehrfachauswahl):** `CellSelection` via `cellAround` über 2 von 3
   Spalten, `insertColumnAfter` → Spaltenzahl **+1** (nicht +2) — Regressionstest für
   Entscheidung 4.1.
5. **Grenzfall 4.5 (verschachtelte Tabelle):** äußere 1×2 mit innerer 1×2 in Zelle 1,
   Cursor in der inneren Tabelle, `insertColumnAfter` → äußere Zeile bleibt 2, innere → 3.
6. **Undo (3.8):** ein `insertColumnAfter` + ein `undo` → Struktur (inkl. `colspan`) exakt
   wie vor dem Insert.
7. **Deaktiviert außerhalb einer Tabelle (Abschnitt 2 Punkt 3):** Dokument ohne Tabelle →
   `isInTable(state) === false`; `insertColumnBefore(state, dispatch)` → gibt `false`
   zurück, **kein** Dispatch (Assertion: der capture callback wird nie aufgerufen).
8. **`table_header`-Absicherung (Zusatzfund Abschnitt 2):** verifiziert, dass eine per
   `insertTable`-analogem Aufbau erzeugte Tabelle ausschließlich `table_cell` enthält und
   ein Insert nie einen `table_header` erzeugt (Regressionsschutz für künftigen
   Kopfzeilen-Support).
9. **Grenzfall 4.11 (mehrabsätzige Zelle):** Zelle mit zwei `paragraph`-Kindern an der
   Einfügeposition → Inhalt nach Insert vollständig/unverändert (beide Absätze, Reihenfolge).

### 6.2 Geändert: `src/formats/odt/__tests__/roundtrip.test.ts` (Regressionsschutz, KEIN Bugfix)

Die Datei hat **bereits** die relevanten Merge-Export-Tests: `:275` („emits ODF-compliant
covered-table-cell placeholders for a horizontal (colspan) merge", mit
`expect((contentXml.match(/<table:table-column\/>/g) ?? []).length).toBe(2)` bei `:298`) und
`:310` (rowspan-Pendant). Diese sichern das **bereits korrekte** `colCount`-Verhalten ab
(Anforderung Abschnitt 6.1). Ergänzt wird **ein** additiver Fall im bestehenden
`describe('ODT round trip: tables', …)`-Block (nach `:339`), der die Situation „Merge **plus**
zusätzliche echte Spalte" abdeckt (simuliert das Ergebnis eines Spalten-Inserts neben einem
Merge) — reiner Regressionsschutz, dass „Spalte einfügen" die Spaltenzahl nicht bricht:

```ts
it('declares one table-column per grid column when a colspan-2 cell is followed by a normal cell (regression, spalte-einfuegen 6.1)', async () => {
  const original = doc([{ type: 'table', content: [{ type: 'table_row', content: [
    { type: 'table_cell', attrs: { colspan: 2, rowspan: 1 }, content: [paragraph('Merged')] },
    { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('C')] },
  ] }] }])
  const blob = await writeOdt(original)
  const contentXml = await (await JSZip.loadAsync(blob)).file('content.xml')!.async('text')
  expect((contentXml.match(/<table:table-column\/>/g) ?? []).length).toBe(3) // 2 + 1
})
```

`import JSZip from 'jszip'` und `import { writeOdt } from '../writer'` sind am Dateikopf
bereits vorhanden (`:1`/`:2`). **Keine** Umstellung des Writers, **kein** bugaufdeckender
Test — der frühere `.toBe(3)`-Test des alten Entwurfs war als „deckt den Fehler unmittelbar
auf" beschrieben; da kein Fehler existiert, ist die Formulierung auf „Regression" korrigiert.

### 6.3 Geändert: `src/formats/docx/__tests__/roundtrip.test.ts` (Regressionsschutz)

Der DOCX-Writer ist bereits korrekt (Abschnitt 2/5.6). Die bestehenden Tabellentests
(`:229-306`) assertieren auf das **re-importierte JSON** via `roundTrip()` (die Datei nutzt
`zipInspect`, **nicht** JSZip). Passend dazu wird ein additiver JSON-basierter Regressionstest
in `describe('DOCX round trip: tables', …)` ergänzt: Tabelle mit `colspan:2` + normaler Zelle
in Zeile 1 → nach `roundTrip()` bleibt die effektive Spaltenzahl (Merge-Zelle `colspan:2` +
1) erhalten. Falls stattdessen die von Anforderung 5.1.1 gewünschte **rohe**
`<w:gridCol>`-Zählung geprüft werden soll, ist `import JSZip from 'jszip'` am Dateikopf zu
ergänzen (konsistent mit `odt/roundtrip.test.ts:1`) und `word/document.xml` per
`JSZip.loadAsync` als Text zu lesen:

```ts
it('exports exactly as many <w:gridCol> as the colspan-weighted column count', async () => {
  const original = doc([{ type: 'table', content: [{ type: 'table_row', content: [
    { type: 'table_cell', attrs: { colspan: 2, rowspan: 1 }, content: [paragraph('Merged')] },
    { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('C')] },
  ] }] }])
  const documentXml = await (await JSZip.loadAsync(await writeDocx(original))).file('word/document.xml')!.async('text')
  expect((documentXml.match(/<w:gridCol /g) ?? []).length).toBe(3)
})
```

### 6.4 Neu: `tests/e2e/tables.spec.ts`

Playwright-E2E gemäß Anforderung Abschnitt 8 (echte Browser-Bedienung, nicht nur Unit).
Struktur/Konventionen aus `tests/e2e/selection-regression.spec.ts` (`odtCard`-Helper,
`getByRole('button', …)`, `beforeEach`: `goto('/')` → „verstanden" → ODT-Karte „Neu
erstellen"). Abgedeckte Fälle:

1. **Buttons außerhalb einer Tabelle deaktiviert, in einer Tabelle aktiviert:** beide
   Buttons sichtbar; `toBeDisabled()` vor „Tabelle einfügen"; nach „Tabelle einfügen" +
   Klick in eine `td` → `toBeEnabled()` (Abschnitt 2 Punkt 3, Abnahmekriterium 1).
2. **Grundverhalten 3.1/3.2:** 2×2 füllen (A1/B1/A2/B2), Cursor in B1, „Spalte rechts
   einfügen" → jede Zeile 3 `td`, Inhalt A1/B1 unverändert, neue Zelle leer und **sofort
   tippbar** (in neue Zelle klicken, „Neu" tippen, `toContainText('Neu')` — deckt die in
   3.4 geschärfte „mindestens `min-width` breit und editierbar"-Erwartung ab).
3. **Grenzfall 4.3 (linker Rand):** „Spalte links" auf die erste Spalte → 3 `td` in Zeile 1.
4. **Undo/Redo (3.8):** „Spalte rechts" → 3 `td`; `ControlOrMeta+z` → 2 `td`;
   `ControlOrMeta+y` → 3 `td`.
5. **Grenzfall 4.4 (Mehrfachauswahl):** Drag über beide Spalten der 2×2 (`mouse.down()` in
   Zelle 0 → `hover()` Zelle 1 → `mouse.up()`), „Spalte rechts" → 3 `td` (nicht 4) —
   E2E-Beleg der Entscheidung 4.1.
6. **Grenzfall 4.5 (verschachtelte Tabelle):** „Tabelle einfügen", Cursor in Zelle 1,
   erneut „Tabelle einfügen" (verschachtelt), Cursor in innere Zelle, „Spalte rechts" →
   innere Zeile 3 Zellen, äußere Zeile unverändert 2. **Hinweis:** verschachtelte
   `<table>`-Selektoren sind fragil; robuster über `page.evaluate` mit direkter
   DOM-Traversierung (beim Implementieren gegen das echte DOM verifizieren).
7. **Grenzfall 4.7 (10× einfügen):** 10× „Spalte rechts" → 12 `td`, kein Absturz/Hänger,
   danach in eine Zelle tippen („noch bedienbar") und verifizieren.
8. **Touch-Grundfall (Grenzfall 4.15):** derselbe „Cursor per Tipp in Zelle → Button
   antippen"-Fall läuft in den Playwright-Projekten „Mobile" (Pixel 7) und „Tablet"
   (iPad Mini) (`playwright.config.ts:34-36`) — keine `CellSelection` per Touch-Drag
   erforderlich (nur der Cursor-Fall ist Pflicht).

### 6.5 Geändert: `tests/e2e/selection-regression.spec.ts` — Pflicht-Regressionstest (Grenzfall 4.10)

Neuer Test im bestehenden `test.describe`-Block (`:7`, ans Ende anfügen — die Datei hat
inzwischen **vier** Tests, der Block endet bei `:111` (siehe 0.2); der bestehende
Tabellen-Fall liegt bei `:43`, der Stress-Test bei `:61`, ein vierter/Kopieren-Test bei
`:88-110`), exakt Anforderung 3.7/Grenzfall
4.10: „Spalte einfügen → Klick in andere Zelle → Enter/weitertippen → **kein** Datenverlust".
Nutzt dasselbe `waitForTimeout(50)`-Muster vor `Enter` wie die bestehenden Tests (`:34`).
Der Editor verwendet dieselbe `reconcileSelectionOnClick`-Logik
(`WordEditor.tsx:43-50`, mouseup-Handler `:146-153`), die dieser Test gegen einen
Tabellen-Spalten-Auslöser absichert.

### 6.6 Roundtrip-E2E (Anforderung Abschnitt 5)

`tests/e2e/odt.spec.ts` und `docx.spec.ts` je um einen Test erweitern (Muster: bestehender
`waitForEvent('download')` → `download.path()` → `fs.readFile` → `JSZip.loadAsync`, plus
`input.setInputFiles(...)` für Re-Upload — `odt.spec.ts` hat bei `:138` bereits einen
Merge-Rundreisetest als Vorlage): Tabelle im Editor erzeugen → Inhalt tippen → Spalte
einfügen → „Exportieren" → heruntergeladene Datei mit JSZip öffnen → für ODT
`<table:table-column>`-Anzahl prüfen, für DOCX `<w:gridCol>`-Anzahl und `<w:tc>` pro `<w:tr>`
→ Blob erneut hochladen (Re-Import) → Zellinhalte im Editor prüfen (Anforderung 5.1.1/5.2.1,
„echte Datei-Uploads/Downloads", Abnahmekriterium 5). Für die reale Fremddatei/den
ODT-Reader-Verifikationspunkt (Grenzfall 4.13/4.14, Anforderung 6.2) zusätzlich eine echte
Fixture aus `tests/fixtures/external/odt/` (z. B. `BigTable.odt`) importieren → Spalte
einfügen → exportieren → Absturzfreiheit + Erhalt des Originalinhalts prüfen; Ergebnis der
`covered-table-cell`-Annahme dokumentieren (bestätigt / als eigene Reader-Abhängigkeit
ticketiert).

**Präzisierung zu `tableCoveredContent.odt` (Grenzfall 4.14, Anforderung 6.2):** Die
Anforderung zählt „33× `<table:covered-table-cell/>`" — das ist die **rohe
Teilstring-Trefferzahl** von `covered-table-cell` in `content.xml` (per Zählung nachvollzogen:
24 tatsächliche Elemente, davon 15 selbstschließend und **9 mit eigenem Kindinhalt**
`<table:covered-table-cell>…</table:covered-table-cell>` statt `.../>` — macht 24 Öffnungen +
9 Schließungen = 33 rohe Teilstring-Treffer). Wer beim Implementieren stattdessen
`document.querySelectorAll('table\\:covered-table-cell')` o. Ä. zählt, bekommt **24**, nicht
33 — kein Fehler, nur ein anderes Zählverfahren. Zusätzlich bemerkenswert und beim
Schreiben des Tests zu berücksichtigen: dass reale LibreOffice-Dateien ein
`<table:covered-table-cell>` **mit** Kindinhalt erzeugen können (9 der 24 Elemente), ist ein
Datenpunkt für den in Abschnitt 6.2 der Anforderung offen gelassenen Verifikationspunkt —
der ODT-Reader (`odt/reader.ts:304`) selektiert ohnehin ausschließlich `table-cell` und
überspringt jedes `covered-table-cell` unabhängig davon, ob es Kindinhalt trägt oder
selbstschließend ist; diese Beobachtung ändert also nichts an Abschnitt 5.7, ist aber beim
Verifizieren der Annahme hilfreich zu wissen.

---

## 7. Abnahmekriterien-Mapping (Bezug zu Anforderung Abschnitt 10)

| # | Abnahmekriterium | Abgedeckt durch |
|---|---|---|
| 1 | Beide Buttons existieren, Playwright-bedienbar, außerhalb Tabelle deaktiviert, `onMouseDown`+preventDefault ohne Selektionsverlust | 5.2 (Buttons, `disabled`, `onClick`+`onMouseDown`), 6.4 Test 1 |
| 2 | Grundverhalten 3.1/3.2 per E2E | 6.4 Test 2/3 |
| 3 | Merge-Verhalten (3.4/4.2) mit konkretem Testfall | 6.1 Test 3 (Unit, exakte Werte `[1,3]`/`['A2','B2','','C2']`) |
| 4 | Mehrfachauswahl-Abweichung (3.3/4.4) entschieden | Entscheidung 4.1; 6.1 Test 4 + 6.4 Test 5 |
| 5 | Bestehende Merge-Export-Tests bleiben grün, Rundreise 5.1/5.2 mit echten Uploads/Downloads | 6.2/6.3 (Regression grün), 6.6 |
| 6 | ODT-Reader-Verifikationspunkt (6.2) mit realer Fremddatei geprüft, Ergebnis nachgetragen | 6.6 (Fremd-Fixture), 5.7 |
| 7 | Selection-Sync-Regressionstest mit „Spalte einfügen" als Auslöser | 6.5 |
| 8 | Undo/Redo inkl. Merge-Wiederherstellung als **ein** Schritt | 6.1 Test 6 (Unit), 6.4 Test 4 (E2E) |
| 9 | Verschachtelte-Tabelle-Grenzfall (4.5) mit echtem Testfall | 6.1 Test 5 (Unit), 6.4 Test 6 (E2E) |
| 10 | Touch-Grundfall (4.15) auf „Mobile"/„Tablet" | 6.4 Test 8 |
| 11 | Kein gefundener Fehler bleibt ohne Ticket/Vermerk | 4.1 (Mehrfachauswahl-Ticket), 3.4 (Breiten-Präzisierung, kein Fix), 2 (`aria-pressed`-Sonderfall vermerkt), 0.1 (stehengebliebener ODT-„Fix" korrigiert/entfernt) |

---

## 8. Zusammenfassung der Dateiliste

**Geändert:**
- `src/formats/shared/editor/commands.ts` — zwei neue Re-Exports (5.1)
- `src/formats/shared/editor/Toolbar.tsx` — zwei Buttons + `ColumnButton` + zwei Icons + Import (5.2)
- `src/formats/shared/editor/__tests__/commands.test.ts` — **existiert bereits**, neuer `describe`-Block (6.1)
- `src/formats/odt/__tests__/roundtrip.test.ts` — 1 additiver Regressionstest (6.2)
- `src/formats/docx/__tests__/roundtrip.test.ts` — 1 additiver Regressionstest (6.3)
- `tests/e2e/selection-regression.spec.ts` — 1 Pflicht-Regressionstest (6.5)
- `tests/e2e/odt.spec.ts`, `tests/e2e/docx.spec.ts` — je 1 Rundreise-/Fremddatei-Test (6.6)

**Neu angelegt:**
- `tests/e2e/tables.spec.ts` (6.4)

**Bewusst unverändert (mit Begründung):**
- `src/formats/odt/writer.ts` — `colCount` bereits korrekt, **kein** Fix (5.5, 0.1)
- `src/formats/docx/writer.ts` (5.6)
- `src/formats/docx/reader.ts`, `src/formats/odt/reader.ts` (5.7)
- `src/formats/shared/schema.ts` (5.4)
- `src/formats/shared/editor/WordEditor.tsx` (5.3)
- `src/index.css` (5.8)

**Netto-Produktivcode:** ~2 Zeilen Re-Export (`commands.ts`) + ~1 kleine Komponente und 2
Icons (`Toolbar.tsx`). Der weit überwiegende Aufwand ist Testabdeckung und Verifikation —
konsistent mit dem Befund der Anforderung, dass die Datenmodell-/Export-Ebene bereits
vollständig und korrekt ist und ausschließlich die UI-Anbindung fehlt.
