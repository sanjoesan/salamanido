# Umsetzungsplan (Code-Ebene): Feature „Tabelle löschen"

Bezug: `specs/tabelle-loeschen-req.md` (Anforderung), `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6
(Zeile 157) und Abschnitt 17/20, `FEATURE-BACKLOG.md` Slug `tabelle-loeschen`.

Dieser Plan wurde am **2026-07-04 vollständig gegen den tatsächlichen Repo-Stand gegengelesen**
(jede genannte Datei frisch geöffnet, jede Zeilenangabe nachgezählt) und dabei gegenüber der
vorherigen Fassung an mehreren Stellen **korrigiert**: Der Quellcode wurde nach der ersten
Planfassung durch andere Features (u. a. „Ausschneiden", „Speichern/Exportieren") weiter verändert,
wodurch sämtliche Zeilenangaben verschoben waren und drei inhaltliche Aussagen faktisch falsch
geworden sind. Die Korrekturen sind in Abschnitt 0.0 gebündelt und an den jeweiligen Stellen
markiert.

**Erneute Verifikation am 2026-07-05** (dieser Durchgang): Sämtliche technischen Kernaussagen wurden
direkt am Code und an der Bibliothek nachgeprüft und **bestätigt** — `prosemirror-tables`'
`deleteTable` (`node_modules/prosemirror-tables/dist/index.cjs:1832`) löst weiterhin über
`state.selection.$anchor` auf und dispatcht `tr.delete($pos.before(d), $pos.after(d)).scrollIntoView()`;
`isInTable` (`:390`) prüft `$head` auf einen `row`-Ahnen; `NodeSelection` wird aus `prosemirror-state`
exportiert; `commands.ts` (168 Z.), `Toolbar.tsx` (298 Z.) und `schema.ts` (202 Z.) sind seit dem
04.07. **byte-stabil** (alle dortigen Zeilenangaben weiterhin korrekt). **Einzige Drift:**
`WordEditor.tsx` ist von 178 auf **186 Zeilen** gewachsen (endgültige Fassung der „Ausschneiden"-
UI: `useAutoDismiss`-Helfer + `cutError`-Banner), wodurch dort alle Zeilenangaben unterhalb von
`reconcileSelectionOnClick` um ca. +8 verschoben sind. Diese sind in diesem Durchgang auf den
Stand 2026-07-05 nachgezogen (Keymap jetzt Z. 85–107, `tableEditing()` Z. 110, contextmenu-Kommentar
Z. 117–121, `mouseup`-Handler Z. 146–153). Inhaltlich ändert sich **nichts** am Bauplan.

Rollenteilung: Dieses Dokument ist der Bauplan des „Entwicklers". Es ändert selbst noch keinen
Code.

> Hinweis zu Zeilenangaben: Alle Zeilennummern unten entsprechen dem Stand **2026-07-04** und sind
> als *Orientierung* zu verstehen. Verbindlicher Anker ist immer der genannte **Symbolname**
> (Funktion/Export/Konstante), nicht die Zeilennummer — der Code wird bis zur Umsetzung dieses
> Features vermutlich erneut wachsen. Vor dem Bau ist die jeweilige Stelle per Symbolsuche neu zu
> lokalisieren.

---

## 0.0 Korrekturen gegenüber der vorherigen Planfassung (Pflichtlektüre)

Die vorherige Fassung behauptete, „gegen den tatsächlichen Code-Stand verifiziert" zu sein. Das
traf zum damaligen Zeitpunkt zu, ist inzwischen aber überholt. Konkret **korrigiert**:

1. **Alle Zeilenangaben waren veraltet.** Beispiele: `commands.ts` `insertTable` steht bei
   Zeile 92–102 (vorher als 76–86 angegeben); `schema.ts` `doc: 'block+'` bei Zeile 14 (nicht 7),
   `tableNodes(...)` bei Zeile 154 (nicht 106); `Toolbar.tsx` Einfüge-Button bei Zeile 277–289
   (nicht 228–239); `WordEditor.tsx` Keymap bei Zeile 85–107 (Stand 2026-07-05; die 04.07.-Fassung
   nannte 77–99, was mit der finalen „Ausschneiden"-UI erneut um ca. +8 verrutscht ist). Sämtliche
   Angaben in diesem Dokument sind auf den Stand 2026-07-05 gesetzt.

2. **GEFÄHRLICH war der vorgeschlagene Keymap-Patch.** Die vorherige Fassung zeigte für
   `WordEditor.tsx` einen **kompletten** Keymap-Objekt-Ersatz, der die inzwischen vorhandenen
   Bindungen `'Shift-Enter': insertHardBreak()` (Zeile 89) und
   `'Shift-Delete': cutSelection({ onCutBlocked: setCutError })` (Zeile 98) **nicht** enthielt.
   Ein wörtliches Anwenden hätte zwei funktionierende Features (manueller Zeilenumbruch,
   sekundärer Ausschneiden-Shortcut) stillschweigend gelöscht. Abschnitt 4.4 beschreibt jetzt eine
   **additive Einzelzeilen-Ergänzung**, keinen Block-Ersatz.

3. **STALE: Der ODT-`covered-table-cell`-„Blocker" existiert nicht mehr.** Die vorherige Fassung
   (Abschnitt 6.2 / 7.3 / 9) behandelte drei ODT-Merge-Bugs als offen und empfahl deshalb einen
   `test.todo`. Diese Bugs sind **bereits behoben** (offenbar im Zuge von „Speichern/Exportieren",
   der Writer-Kommentar verweist auf `speichern-exportieren-code.md 1.4`):
   `odt/writer.ts` summiert `colspan` korrekt (Zeile 115–116) und emittiert vollständige
   `<table:covered-table-cell/>`-Platzhalter für horizontale **und** vertikale Merges
   (Zeile 119–167); es gibt dafür **grüne** Round-Trip-Tests (`odt/__tests__/roundtrip.test.ts`
   Zeile 275 „colspan merge" und Zeile 310 „rowspan merge") sowie eine unabhängige
   ODF-Validierung (`odt/__tests__/external-validation.test.ts` Zeile 144–159). Der `test.todo`
   entfällt; die betroffenen Rundreise-/Fixture-Tests dürfen jetzt volle Struktur-Assertions
   verwenden (Abschnitt 6.2/7.3 neu).

4. **FALSCH: `tests/e2e/large-document-import.spec.ts` „existiert nicht".** Diese Datei
   **existiert** und wird aktiv referenziert (von `docx/__tests__/external-fixtures.test.ts`
   Zeile 36/39 und `odt/__tests__/external-fixtures.test.ts` Zeile 15); zusätzlich existiert
   `tests/e2e/large-document-export.spec.ts`. `tests/e2e/` enthält aktuell **17** Spec-Dateien
   (per `ls tests/e2e/*.spec.ts | wc -l` nachgezählt — eine vorherige Fassung dieses Punkts
   nannte fälschlich 18; korrigiert, unabhängig auch von `tabelle-loeschen-qa.md` Abschnitt 1
   Punkt 12 bestätigt), nicht die vier, die die ursprüngliche Fassung aufzählte. Der frühere
   „Dokumentationsfehler"-Befund in Abschnitt 9 ist gestrichen.

5. **STALE: ODT-Bilder liegen unter `Pictures/`, nicht im ZIP-Wurzelverzeichnis.**
   `odt/imageCollector.ts:22` erzeugt Dateinamen der Form `Pictures/image${n}.${ext}`. Der
   frühere Test-Assertion-Hinweis „ODT legt Bilder direkt im Wurzelverzeichnis ab" ist korrigiert
   (Abschnitt 7.3, Punkt „Bild in gelöschter Zelle").

6. **Keymap-/Command-Bestand war unvollständig aufgezählt.** Der Editor bindet inzwischen mehr als
   „nur `Mod-z/y/Shift-z`, `Enter`, `Mod-b/i/u`": zusätzlich `Shift-Enter`, `Shift-Delete`; und
   `commands.ts` enthält heute u. a. `insertHardBreak`, `applyMarkColor`/`clearMarkColor`,
   `canCut`/`cutSelection`. Die Ist-Stand-Tabelle (Abschnitt 0.1) ist entsprechend aktualisiert.
   Der gewählte Shortcut `Mod-Alt-Backspace` ist in **keinem** der beiden registrierten Keymaps
   und in `baseKeymap` unbelegt — erneut verifiziert.

7. **Nachbar-Features sind noch nicht gebaut.** Projektweite Suche nach
   `deleteTable`/`canDeleteTable`/`tableCommands`/`TableToolbar`/`tableIcons` in `src/` liefert
   **0 Treffer**. Weder `zeile-loeschen` noch `spalte-loeschen` noch dieses Feature existieren im
   Code; `tableIcons.tsx` existiert nicht. Alle „falls die Nachbardatei schon existiert"-Hinweise
   bleiben als Vorsorge bestehen, sind heute aber rein hypothetisch (Abschnitt 9 aktualisiert).
8. **NEU: Ein vollständiger QA-Testplan liegt bereits vor.** `specs/tabelle-loeschen-qa.md`
   (1.472 Zeilen laut `wc -l`) enthält bereits **lauffertigen** Testcode für exakt die Testdateien,
   die dieser Plan in Abschnitt 7 beschreibt: `tableCommands.test.ts`, Erweiterungen beider
   `roundtrip.test.ts`, `tableDelete.crossFormat.test.ts`, beide `tableDelete.fixtures.test.ts`
   (34 ODT- + 6 DOCX-Fixtures, Dateilisten deckungsgleich mit Abschnitt 7.5 unten) sowie
   `tests/e2e/table-delete.spec.ts`. Dieser QA-Plan wurde **unabhängig** gegen den Code verifiziert
   (eigene Codesichtung, nicht Übernahme dieses Dokuments) und bestätigt praktisch jede technische
   Kernaussage hier von außen — u. a. „kein `deleteTable`/`canDeleteTable` in `commands.ts`", die
   167/297/185/201-Zeilen-Stände (siehe Fußnote zu Abschnitt 0.1), 17 (nicht 18) E2E-Spec-Dateien
   und den bereits behobenen ODT-`covered-table-cell`-Fix. **Konsequenz für die Umsetzung:** Der
   Testcode in `tabelle-loeschen-qa.md` ist die verbindliche Abnahmegrundlage — bei einem
   Widerspruch zwischen einer Formulierung hier und dem tatsächlichen QA-Testcode gilt Letzterer.
   Ein für Abschnitt 4.3 unten wichtiges Detail daraus: Der QA-Plan verankert den neuen Button über
   `getByTitle('Tabelle löschen')` **und** `getByRole('button', { name: 'Tabelle löschen' })` und
   verlangt ausdrücklich, dass **beide** Attribute (`title` **und** `aria-label`) gesetzt werden
   (`tabelle-loeschen-qa.md` Abschnitt 5.1, Punkt 5). Der in Abschnitt 4.3 vorgesehene, im
   deaktivierten Zustand **abweichende** `title`-Text (`„Tabelle löschen (Cursor muss in einer
   Tabelle stehen)"`) bricht diesen Locator **nicht** — Playwrights `getByTitle`/`getByRole`
   matchen einen String-Parameter standardmäßig als getrimmten, case-insensitiven **Teilstring**,
   nicht exakt, sodass beide Zustände weiterhin auf „Tabelle löschen" matchen (in der
   Playwright-Dokumentation zu `getByText`/`getByTitle` nachgeprüft, nicht angenommen).

---

## 0.1 Geltungsbereich und Ist-Stand der Kern-Dateien (frisch gegengelesen)

Gemeinsamer Editor (`src/formats/shared/editor/*`, `src/formats/shared/schema.ts`) für DOCX und
ODT; Import/Export bleibt formatspezifisch (`src/formats/docx/*`, `src/formats/odt/*`). Betroffene
Kern-Dateien mit **aktuellen** Zeilenangaben:

| Datei | Rolle heute (Stand 2026-07-04) |
|---|---|
| `src/formats/shared/schema.ts` (202 Z.) | `doc: { content: 'block+' }` (Z. 14); `...tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` (Z. 154); `export const wordSchema` (Z. 198). Tabellenknoten heißen `table`/`table_row`/`table_cell`/`table_header` (Standard aus `tableNodes`). |
| `src/formats/shared/editor/commands.ts` (168 Z.) | Z. 1–6: Imports + Re-Export `isInTable`. Z. 92–102: `insertTable(rows, cols)`. Weiter vorhanden: `setAlign`/`isAlignActive` (13–38), `setHeading` (40–55), `toggleList`/`liftFromList` (57–64), `insertImage` (66–74), `insertHardBreak` (83–90), `applyMarkColor`/`clearMarkColor` (106–122), `canCut`/`cutSelection` (126–166). **Kein** `deleteTable`/`removeTable`/`canDeleteTable` — Verdacht Abschnitt 5.1 bestätigt. |
| `src/formats/shared/editor/Toolbar.tsx` (298 Z.) | `run(view, command)` (Z. 28–31) ruft `command(view.state, view.dispatch, view)` + `view.focus()`. Inline-SVG-Beispiel `ScissorsIcon` (Z. 33–53). „Ausschneiden"-Button mit `disabled={!canCut(...)}` (Z. 143–156) als Präzedenz für den `disabled`-Stil. Einfüge-Button „⊞ Tabelle" mit `title`/`aria-label="Tabelle einfügen"`/`aria-pressed={isInTable(view.state)}`/`onMouseDown → insertTable(2,2)` (Z. 277–289); direkt danach Bild-Label „🖼 Bild" (Z. 291–294). **Kein** Lösch-Button — Verdacht 5.2 bestätigt. |
| `src/formats/shared/editor/WordEditor.tsx` (186 Z., Stand 2026-07-05) | `reconcileSelectionOnClick` (Z. 43–50), aufgerufen aus dem `mouseup`-Handler (Z. 146–153) nach Klick-vs-Drag-Erkennung. Eigenes `keymap({...})` (Z. 85–107): `Mod-z`(93), `Mod-y`(94), `Mod-Shift-z`(95), `Enter`(96), `Shift-Enter`(97), `Mod-b`(98), `Mod-i`(99), `Mod-u`(100), `Shift-Delete`(106). Danach `keymap(baseKeymap)` (Z. 108), `columnResizing()` (109), `tableEditing()` (110), `dropCursor()`/`gapCursor()`/`createPaginationPlugin()` (111–113). Warnkommentar Z. 86–92: neue Keymap-Bindungen dürfen `Mod-c/x/v` nicht verschlucken. Kommentar Z. 117–121: bewusst **kein** `contextmenu`-Listener. Import `cutSelection, insertHardBreak` aus `./commands` bei Z. 12. |
| `src/formats/docx/writer.ts` / `reader.ts` | `tableToDocx` (writer 158–201, inkl. vollständiger `colspan`/`rowspan`-`vMerge`-Logik), `blocksToDocx` (203–205), `blockToDocx` (105). `new ImageCollector()` je Export (253), `RelationshipRegistry` (254/285). Reader: `parseTable` (311ff., Anchor-Array für `vMerge` bei 316), `MAX_TABLE_NESTING_DEPTH = 25` (309), `decodeParagraphRuns` (218). |
| `src/formats/odt/writer.ts` / `reader.ts` | `blockToOdt` (85), Fall `'table'` (110–175, `colCount` summiert `colspan` bei 115–116, `covered-table-cell`-Emission 126–167). `new TextStyleRegistry()` (261/268), `new ImageCollector()` (262). Reader: `elementToBlocks` (250), Fall `table` (301–321, liest `colspan`/`rowspan` bei 305–306). Bilder unter `Pictures/` (`odt/imageCollector.ts:22`). |

> **Fußnote zu den „X Zeilen"-Gesamtangaben:** Per `wc -l` (POSIX-Neuzeilen-Zählung) nachgemessen
> sind die vier Kern-Dateien tatsächlich `commands.ts` **167** (nicht 168), `Toolbar.tsx` **297**
> (nicht 298), `WordEditor.tsx` **185** (nicht 186), `schema.ts` **201** (nicht 202) Zeilen lang —
> ein durchgängiger, mechanischer Off-by-one zwischen `wc -l` und der in diesem Dokument verwendeten
> Zählweise (jede Datei endet auf eine Newline, was `wc -l` nicht als zusätzliche Zeile zählt, ein
> naives Aufsplitten des Dateiinhalts an `\n` aber schon). Alle **relativen** Angaben in diesem
> Dokument (Zeile X–Y, „direkt nach Zeile N einfügen") bleiben davon unberührt und korrekt; nur beim
> Cross-Check gegen ein eigenes `wc -l` ist der hier genannte Gesamtwert um 1 zu hoch. Wie bereits
> eingangs vermerkt bleibt ohnehin der **Symbolname** der verbindliche Anker, nicht die Zeilenzahl.

---

## 1. Verifikation der „Ist-Stand"-Verdachtspunkte aus `tabelle-loeschen-req.md` Abschnitt 5

| # | Verdachtspunkt der Anforderung | Ergebnis der Prüfung (2026-07-04) |
|---|---|---|
| 1 | Kein Löschen-Befehl im Datenmodell/Editor | **Bestätigt.** `commands.ts` exportiert nur `insertTable` für Tabellen; `deleteTable` aus `prosemirror-tables` wird nirgends importiert (Suche in `src/`: 0 Treffer). |
| 2 | Kein Toolbar-Button für Löschen | **Bestätigt** (`Toolbar.tsx:277-289` nur Einfügen). |
| 3 | Kein Kontextmenü | **Bestätigt.** Suche nach `contextmenu`/`onContextMenu`: 0 Treffer; `WordEditor.tsx:117-121` dokumentiert die bewusste Abwesenheit ausdrücklich. |
| 4 | Keine Tastenkombination fürs Löschen | **Bestätigt für eine *dafür entworfene* Bindung.** Präzisierung: Es gibt einen bereits heute funktionierenden **Nebenweg** über `baseKeymap`s Standard-Backspace an der Tabellengrenze (Abschnitt 2.4) — kein Widerspruch, nur eine für die Umsetzung wichtige Ergänzung. |
| 5 | Keine Node-Selektion für ganze Tabellen vorbereitet | **Bestätigt für „vorbereitet"** (kein eigener Code). Präzisierung: Eine `NodeSelection` auf dem `table`-Knoten entsteht bereits heute automatisch (Abschnitt 2.4), muss also aktiv behandelt werden. |
| 6 | Kein Fallback für „Tabelle ist einziger Dokumentinhalt" | **Bestätigt für „kein eigener Code"**, **entwarnt für „muss von Grund auf gebaut werden"**: ProseMirrors `Transform`-Fitting setzt bei `doc: 'block+'` automatisch einen leeren Absatz ein (Abschnitt 2.1). Kein eigener Fallback-Code nötig. |
| 7 | Kein Aufräumen verwaister Bild-Ressourcen geprüft | **Bestätigt als „noch nicht durch Test belegt"**; per Code-Lesen erhärtet, dass es automatisch korrekt ist (Abschnitt 5/6). Bleibt Pflicht-Testfall. |
| 8 | Verschachtelte Tabellen ungetestet für Löschzwecke | **Bestätigt als „ungetestet"**; das Bibliotheksverhalten ist bereits korrekt (Abschnitt 2.2 — `deleteTable` trifft die innerste umschließende Tabelle). Nur Tests nötig. |
| 9 | Keine Tests für Tabellen-Löschen | **Bestätigt.** Kein Test in `__tests__`/`tests/e2e` stellt Tabellen-Löschen nach; `selection-regression.spec.ts` deckt nur den allgemeinen Selection-Sync-Bug ab (inkl. eines Tabellen-Zell-Falls, Z. 43, aber ohne Struktur-Löschung). |
| 10 | Verhältnis zu `zeile-loeschen`/`spalte-loeschen` | **Bestätigt**; beide Nachbar-Features sind ebenfalls ungebaut (0 Treffer im Code). Die früher als Konflikt geführten ODT-Merge-Bugs sind zwischenzeitlich **unabhängig** behoben worden (Abschnitt 0.0 Punkt 3), sodass der frühere Cross-Feature-Blocker entfällt. |

**Fazit:** Der Backlog-Status „fehlt" ist korrekt. Der reine Bauaufwand ist kleiner als von
Abschnitt 5 der Anforderung befürchtet: „einziger Dokumentinhalt", verschachtelte Tabellen und
Bild-/Stil-Aufräumen sind bereits durch vorhandene Bibliotheks-/Architektur-Mechanismen gelöst und
brauchen nur **Verdrahtung + Tests**.

---

## 2. Bibliotheks- und Ist-Code-Verhalten (Grundlage der Entwurfsentscheidungen)

Die folgenden Aussagen sind aus dem **Quelltext** von `prosemirror-tables@1.8.5`
(`node_modules/prosemirror-tables/dist/index.cjs`) und `prosemirror-commands` abgeleitet und
frisch am Code verifiziert. Sie sind in Abschnitt 7.1 durch echte Unit-Tests **verbindlich
abzusichern** (nicht nur zu argumentieren) — die Anforderung verlangt Nachweis, nicht Plausibilität.

### 2.1 „Tabelle ist einziger Dokumentinhalt" löst ProseMirror selbst korrekt auf

`deleteTable` (index.cjs:1832) dispatcht schlicht
`state.tr.delete($pos.before(d), $pos.after(d)).scrollIntoView()` — **kein** eigener
Fallback-Code. Bei einem Schema mit `doc: 'block+'` (`schema.ts:14`) setzt ProseMirrors
`Transform.replace`-Fitting selbstständig einen leeren `defaultType`-Block (Absatz) ein, wenn sonst
ein leeres, ungültiges Dokument entstünde. **Konsequenz:** Grenzfall 1 der Anforderung braucht
**keinen** eigenen `if (childCount === 1) { insert paragraph }`-Wrapper. Durch Unit-Test 7.1
abzusichern.

### 2.2 Verschachtelte Tabellen: `deleteTable` trifft automatisch die innerste Tabelle

Quelltext (index.cjs:1832):
```js
function deleteTable(state, dispatch) {
  const $pos = state.selection.$anchor;
  for (let d = $pos.depth; d > 0; d--) if ($pos.node(d).type.spec.tableRole == "table") {
    if (dispatch) dispatch(state.tr.delete($pos.before(d), $pos.after(d)).scrollIntoView());
    return true;
  }
  return false;
}
```
Die Schleife läuft von der **größten** Tiefe (`$pos.depth`, also von innen) nach außen und nimmt
den **ersten** Treffer — bei verschachtelten Tabellen die **innerste** umschließende relativ zur
Selektion. Damit ist Abschnitt 2.6 der Anforderung (Cursor in innerer Tabelle → nur innere;
Cursor in äußerer Zelle → äußere samt Inhalt) bereits durch reine Bibliotheksnutzung erfüllt, inkl.
Rundreise-Testfall 4.1.7 („ersetzt durch einen leeren Absatz in dieser Zelle"). Eine `CellSelection`
über mehrere Zellen liest `deleteTable` ebenfalls korrekt (nur `state.selection.$anchor`, das stets
in der betroffenen Tabelle liegt).

### 2.3 Cursor-Ziel nach dem Löschen ist deterministisch — ohne eigenen Code

`deleteTable` setzt **keine** explizite Selektion; `EditorState.apply` mappt die alte Selektion
durch die Transaktion (`Selection.near` an der Löschstelle). Das landet zuverlässig an der von der
Anforderung gewünschten Stelle: Anfang des Folgeabsatzes bzw. Ende des vorherigen Absatzes bzw.
im automatisch eingesetzten leeren Absatz. **Trotzdem Pflicht**, dies per Test (7.1/7.6)
abzusichern — es ist ein `Transform`-Detail, kein dokumentierter API-Vertrag.

### 2.4 Eine `NodeSelection` direkt auf der Tabelle wird von `deleteTable` **nicht** erkannt

Bei `NodeSelection.create(doc, posDerTabelle)` liegt `$anchor` **vor** der Tabelle (Tiefe des
Elternknotens `doc`, also 0). `deleteTable`s Schleifenbedingung `d > 0` greift dann nicht →
Rückgabe `false`, **kein Wurf, keine Wirkung**. Analog liefert `isInTable` (index.cjs:390, prüft
`$head` auf einen `row`-Ahnen) hier `false`.

**Praktische Relevanz (kein theoretischer Randfall):** `baseKeymap`s `Backspace` ist
`chainCommands(deleteSelection, joinBackward, selectNodeBackward)`. Steht der Cursor am **Anfang
eines Absatzes direkt nach einer Tabelle** (Top-Level-Geschwister), scheitern `deleteSelection`
(leere Sel.) und `joinBackward` (Tabelle ist kein Textblock), und `selectNodeBackward` wandelt die
Selektion in eine `NodeSelection` auf der **ganzen Tabelle** um (`table` ist per Default
`selectable`). Ein **zweites** Backspace greift dann via `deleteSelection` und entfernt die Tabelle.
→ Ein Weg „Tabelle als Objekt markieren + Backspace" existiert bereits heute ohne neuen Code,
allerdings nur für die Position „unmittelbar nach der Tabelle".

**Konsequenz für die Umsetzung (Pflicht):** Sowohl `canDeleteTable` (Aktivierung) als auch
`deleteTable()` (Ausführung) müssen den `NodeSelection`-auf-Tabelle-Fall **explizit** behandeln —
sonst wäre der Button in genau diesem Zustand fälschlich deaktiviert bzw. ein Klick ein stiller
No-Op (Verstoß gegen Hauptspezifikation Abschnitt 20, Punkt 4). Siehe Abschnitt 4.1.

### 2.5 Entf/Backspace auf Zellinhalt ist bereits auf „nur Inhalt leeren" beschränkt

Zwei bereits aktive Mechanismen erfüllen Abschnitt 2.2 der Anforderung ohne Codeänderung:
1. `tableEditing()` (`WordEditor.tsx:110`) bindet intern `Backspace`/`Delete`/`Mod-Backspace`/
   `Mod-Delete` bei einer `CellSelection` auf `deleteCellSelection` — leert **nur** den Zellinhalt,
   fasst die Struktur nie an, und gibt `false` zurück, wenn keine `CellSelection` vorliegt.
2. `table_cell`/`table_header` sind schema-seitig `isolating: true` → ein einfacher Cursor am
   Zellrand verschmilzt nie über die Zellgrenze (`joinBackward`/`joinForward` greifen nicht).

**Kein Produktivcode nötig**, aber Pflicht-Regressionstest (Anforderung Testfall 3 / Abschnitt
7.6.3).

### 2.6 Keine verwaisten Stil-/Nummerierungs-Definitionen möglich — strukturell ausgeschlossen

- DOCX: `numberingXml()` (`docx/styleDefs.ts:64`) erzeugt **immer** exakt die zwei festen
  Definitionen `BULLET_NUM_ID = 1` / `ORDERED_NUM_ID = 2` (Z. 34–35), unabhängig vom Inhalt — nichts
  kann „verwaisen". Zeichenformatierung steht ohnehin inline im `<w:rPr>` jedes Runs.
- ODT: `listStyleDefs()` (`odt/styleRegistry.ts:98`) ist ein **statischer** String mit genau zwei
  Listenstil-Namen (`LB`/`LO`, Z. 95–96). `TextStyleRegistry` (`odt/styleRegistry.ts:22`) **ist**
  dynamisch, wird aber pro `writeOdt()`-Aufruf **neu** instanziiert (`odt/writer.ts:261/268`) und
  nur beim Ablaufen des zum Exportzeitpunkt aktuellen (bereits reduzierten) Baums befüllt — eine
  gelöschte Tabelle wird nie besucht.

**Konsequenz:** „Keine Geisterreste" ist für beide Formate strukturell garantiert. Pflicht-Testfall
bleibt (Anforderung Abschnitt 2.7).

---

## 3. Architektur-/Produktentscheidungen

### 3.1 Neuer Befehl: `commands.ts` erweitern, keine neue Datei

`deleteTable`/`canDeleteTable` werden direkt in `src/formats/shared/editor/commands.ts` ergänzt —
dort, wo bereits `insertTable` liegt. Begründung: minimaler Eingriff, kein neues Modul, konsistent
mit dem bestehenden Namens-/Ablagemuster. Sollte `zeile-loeschen` vorher umgesetzt und `insertTable`
in ein neues `tableCommands.ts` verschoben worden sein (heute existiert das **nicht**, 0 Treffer),
gilt diese Regel sinngemäß für die dann existierende Datei — entscheidend ist die Bündelung an
**einem** Ort, nicht der Modulname.

### 3.2 Neuer Button: `Toolbar.tsx`, direkt neben „⊞ Tabelle"

Die Anforderung ist eindeutig (Abschnitt 1, Zeile 56: „neben dem bestehenden Button „⊞ Tabelle""):
Erweiterung der bestehenden `Toolbar.tsx` an genau dieser Stelle (nach dem Einfüge-Button
Z. 277–289, vor dem Bild-Label Z. 291). Kein separater zweiter Werkzeugleisten-Aufbau.

### 3.3 Sichtbar + `disabled` statt ausgeblendet

Grenzfall 13 der Anforderung nennt „deaktiviert". Entscheidung: **immer sichtbar,
`disabled`-Attribut** — konsistent mit dem bestehenden „Ausschneiden"-Button
(`Toolbar.tsx:147`, `disabled={!canCut(...)}`). Begründung: keine Layout-Sprünge, kein
Sichtbarkeits-Race in E2E-Tests, durchgehend adressierbarer Playwright-Locator.

### 3.4 Kein Bestätigungsdialog

Wie von der Anforderung empfohlen (Abschnitt 1, Zeile 59) und konsistent mit „Bild löschen":
Undo (`history()`, aktiv über `Mod-z`) ist der alleinige Schutzmechanismus.

### 3.5 Kein Kontextmenü

Projektweit keine Kontextmenü-Infrastruktur; die Anforderung stuft es als Nice-to-have ein
(Abschnitt 1, Zeile 57). Nicht Teil dieser Umsetzung. `WordEditor.tsx:117-121` dokumentiert bereits,
dass das **native** Browser-Kontextmenü bewusst erreichbar bleibt.

### 3.6 Tastaturweg (optional): neuer `Mod-Alt-Backspace` + Dokumentation des Boundary-Backspace

Die Anforderung stuft eine Tastenkombination als **optional** ein (Abschnitt 1, Zeile 58). Umsetzung
trotzdem, weil billig und nützlich, in zwei Bausteinen:
- **Neu:** Keymap-Eintrag `Mod-Alt-Backspace` → ruft **denselben** `deleteTable()`-Befehl auf wie
  der Button (erfüllt „identisches Ergebnis" konstruktiv). `Mod-Alt-Backspace` ist im eigenen
  Keymap (Z. 85–107) und in `baseKeymap` unbelegt (erneut verifiziert) und kollidiert nicht mit dem
  Warnkommentar Z. 86–92 (kein `Mod-c/x/v`). Da das eigene Keymap **vor** `baseKeymap` registriert
  ist, gewinnt die Bindung ohnehin. Optionaler Weg — bei Bedarf cross-plattform (Cmd-Alt-Backspace
  auf macOS) im E2E-Test zu bestätigen.
- **Bereits vorhanden (kein Code):** Das Boundary-Backspace-Verhalten (Abschnitt 2.4) wird als
  dokumentiertes, getestetes Bonus-Verhalten übernommen, aber **nicht** als primärer Tastaturweg
  dargestellt (positionsabhängig, für Erstnutzer:innen nicht auffindbar).

### 3.7 Ein einziger, wiederverwendeter Befehl

Button **und** Keymap rufen exakt denselben exportierten `deleteTable()`-Befehl auf — keine zwei
divergierenden Code-Pfade.

---

## 4. Geänderte/neue Dateien — Editor-Kern

### 4.1 `src/formats/shared/editor/commands.ts` (ändern)

**Import ergänzen.** `NodeSelection` ist eine Klasse (Wert), kann nicht in die bestehende
`import type {...}`-Zeile (Z. 1). Neue Zeile ergänzen und die `prosemirror-tables`-Import-Zeile
(Z. 3) erweitern:
```ts
import type { Command, EditorState } from 'prosemirror-state'
import { NodeSelection } from 'prosemirror-state'                    // neu
import { wrapInList, liftListItem } from 'prosemirror-schema-list'
import { isInTable, deleteTable as pmDeleteTable } from 'prosemirror-tables'  // erweitert
import { wordSchema } from '../schema'

export { isInTable }
```
Import-Alias `pmDeleteTable`, damit der eigene Export unten `deleteTable` heißen kann (Muster
`insertTable`/`deleteTable`).

**Neu ergänzen** (Position: direkt nach `insertTable`, aktuell nach Z. 102):
```ts
/**
 * Whether "Tabelle löschen" would currently remove anything — Aktivierungsbedingung für den
 * Toolbar-Button (Anforderung Abschnitt 1: Button deaktiviert, wenn der Klick wirkungslos bliebe).
 *
 * `isInTable` allein reicht nicht: Eine NodeSelection, die die *ganze* Tabelle als Objekt markiert,
 * hat ihren Anker *vor* der Tabelle, nicht in einer Zelle — `isInTable` (prüft nur die
 * $head-Ahnenkette auf einen `row`) liefert dort fälschlich `false`. Dieser Zustand entsteht bereits
 * heute automatisch durch `baseKeymap`s Standard-Backspace am Anfang eines Absatzes direkt nach
 * einer Tabelle (siehe tabelle-loeschen-code.md Abschnitt 2.4).
 */
export function canDeleteTable(state: EditorState): boolean {
  if (isInTable(state)) return true
  const { selection } = state
  return selection instanceof NodeSelection && selection.node.type === wordSchema.nodes.table
}

/**
 * Entfernt die die Selektion umschließende Tabelle — bei Verschachtelung automatisch die *innerste*
 * (prosemirror-tables' deleteTable steigt von state.selection.$anchor mit größter Tiefe nach außen
 * und nimmt den ersten Treffer; siehe Abschnitt 2.2). Sonderfall: Ist die ganze Tabelle bereits als
 * NodeSelection markiert, gibt die Bibliotheksfunktion `false` zurück (ihr $anchor liegt *vor* der
 * Tabelle, Tiefe 0; Abschnitt 2.4) — ohne diese Fallunterscheidung ein stiller Fehlschlag.
 */
export function deleteTable(): Command {
  return (state, dispatch) => {
    const { selection } = state
    if (selection instanceof NodeSelection && selection.node.type === wordSchema.nodes.table) {
      if (dispatch) dispatch(state.tr.deleteSelection().scrollIntoView())
      return true
    }
    return pmDeleteTable(state, dispatch)
  }
}
```
`tr.deleteSelection()` auf einer `NodeSelection` entfernt den Tabellenknoten; der `block+`-Fallback
(Abschnitt 2.1) greift auch hier automatisch. Kein Tiefen-Guard und keine Sonderbehandlung großer
Tabellen nötig — `tr.delete(from, to)` ist ein einzelner Schritt unabhängig von der Zellenzahl
(Grenzfall 3).

Beide Funktionen erfüllen den `Command`/Prädikat-Vertrag als Verfügbarkeitsprüfung: `deleteTable()`
gibt außerhalb einer Tabelle (und ohne NodeSelection darauf) `false` zurück (delegiert an
`pmDeleteTable`, das keinen Treffer findet) — der Keymap-Eintrag fällt dann automatisch durch.

### 4.2 `src/formats/shared/editor/tableIcons.tsx` (neu)

`tableIcons.tsx` existiert **nicht** (verifiziert). Neu anlegen. Muster: inline SVG mit
`currentColor` + `aria-hidden`, exakt wie das bestehende `ScissorsIcon` in `Toolbar.tsx:33-53`
(dort inline definiert — dieses Feature lagert das Icon bewusst in eine wiederverwendbare Datei aus,
damit die Nachbar-Features `zeile-/spalte-loeschen` dieselbe Datei mitnutzen können). **Kein**
Emoji/Unicode (Hauptspezifikation Abschnitt 20, Punkt 1 — der bestehende „⊞ Tabelle"-Button ist ein
Alt-Verstoß, wird hier nicht mitmigriert, Abschnitt 11):
```tsx
export function DeleteTableIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <rect x="1" y="2" width="14" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1" y1="6" x2="15" y2="6" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="1.2" />
      <line x1="6" y1="2" x2="6" y2="14" stroke="currentColor" strokeWidth="1.2" />
      <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" strokeWidth="1.2" />
      <line x1="2.5" y1="3.5" x2="13.5" y2="12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="13.5" y1="3.5" x2="2.5" y2="12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
```
(Tabellengitter mit großem „X" — klar unterscheidbar von künftigen `DeleteColumnIcon`/
`DeleteRowIcon`. Geometrie-Feinabstimmung frei; verbindlich nur: inline SVG, `currentColor`,
`aria-hidden`, kein Unicode/Emoji.)

### 4.3 `src/formats/shared/editor/Toolbar.tsx` (ändern)

1. Import-Block (Z. 6–20) um `deleteTable`, `canDeleteTable` erweitern; neuer Import für das Icon:
   ```ts
   import { deleteTable, canDeleteTable, /* … bestehende … */ } from './commands'
   import { DeleteTableIcon } from './tableIcons'
   ```
2. Neuer Button, **direkt nach** dem „⊞ Tabelle"-Button (nach Z. 289), **vor** dem Bild-Label
   (Z. 291). `run()` (Z. 28–31) wird unverändert wiederverwendet:
   ```tsx
   <button
     type="button"
     title={
       canDeleteTable(view.state)
         ? 'Tabelle löschen'
         : 'Tabelle löschen (Cursor muss in einer Tabelle stehen)'
     }
     aria-label="Tabelle löschen"
     disabled={!canDeleteTable(view.state)}
     onMouseDown={(e) => {
       e.preventDefault()
       run(view, deleteTable())
     }}
     className="px-2 py-1 rounded text-sm flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
   >
     <DeleteTableIcon />
     <span>Tabelle löschen</span>
   </button>
   ```
   Der `disabled:*`-Utility-Stil ist 1:1 vom bestehenden „Ausschneiden"-Button (Z. 153)
   übernommen — konsistentes Deaktiviert-Aussehen ohne neue CSS-Regel.
3. `onMouseDown` + `e.preventDefault()` folgt jedem bestehenden Toolbar-Button: verhindert, dass der
   Button-Klick dem Editor Fokus/Selektion entzieht, **bevor** `run()` `view.state` liest. Wichtig
   für Grenzfall 9: der `mouseup`-Handler in `WordEditor.tsx` (Z. 146–153 →
   `reconcileSelectionOnClick`) ist bei einem vorherigen Zell-Klick bereits synchron gelaufen,
   `view.state` spiegelt also die zuletzt gesetzte Selektion.
4. **Bewusst kein `aria-pressed`** (Aktion, kein Umschaltzustand) — `disabled` ist die korrekte
   Eigenschaft.
5. Der „⊞ Tabelle"-Button selbst wird nicht verändert. E2E-Locators dieses Features verankern
   **ausschließlich** am eigenen `aria-label`/`title` „Tabelle löschen", nicht am Nachbar-Button
   (dessen Markup laut `tabelle-einfuegen-code.md` künftig auf einen Dialog umgestellt werden könnte).

### 4.4 `src/formats/shared/editor/WordEditor.tsx` (ändern) — **additive** Keymap-Ergänzung

> **Achtung (Korrektur ggü. vorheriger Fassung):** Das Keymap-Objekt (Z. 85–107) enthält heute
> `Shift-Enter` (97) und `Shift-Delete` (106). Es darf **nicht** durch einen Block ersetzt werden.
> Nur die **eine** neue Zeile additiv einfügen.

1. Import (Z. 12) erweitern:
   ```ts
   import { cutSelection, insertHardBreak, deleteTable } from './commands'
   ```
2. Innerhalb des bestehenden `keymap({...})`-Objekts **eine** Zeile ergänzen (z. B. direkt nach der
   `'Mod-u'`-Zeile 100, vor dem `Shift-Delete`-Kommentar). Alle übrigen Einträge bleiben unangetastet:
   ```ts
           'Mod-u': toggleMark(wordSchema.marks.underline),
           'Mod-Alt-Backspace': deleteTable(),   // neu — Tabelle löschen (identisch zum Toolbar-Button)
           // Windows' common secondary "cut" keybinding. …
           'Shift-Delete': cutSelection({ onCutBlocked: setCutError }),
   ```
3. Keine Änderung an `columnResizing()`/`tableEditing()` (Z. 109–110) oder
   `reconcileSelectionOnClick` (Z. 43–50) — Letzteres ist bereits generisch genug (per Test in
   Abschnitt 7.6.4 zu bestätigen, nicht anzunehmen).

### 4.5 `src/formats/shared/schema.ts` — keine Änderung

`tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` (Z. 154) und
`doc: { content: 'block+' }` (Z. 14) reichen unverändert. Kein `block*`-Downgrade (das würde ein
leeres `doc` erlauben, was die Anforderung ausschließt).

### 4.6 `src/index.css` — keine zwingende Änderung

„Tabelle löschen" braucht **keine** sichtbare `CellSelection` (ein einzelner Klick bei beliebiger
Cursor-Position genügt, Anforderung 2.1). Kein Code-Beitrag hier.

---

## 5. DOCX Import/Export — keine Anpassung nötig

`docx/reader.ts` (`parseTable`, 311ff.) und `docx/writer.ts` (`tableToDocx` 158–201, `blocksToDocx`
203–205) arbeiten bei jedem Import/Export auf dem **aktuellen** ProseMirror-Baum. „Tabelle löschen"
verändert nur diesen Baum (Abschnitt 4.1); ein Folge-Export spiegelt die fehlende Tabelle
automatisch:

- Eine gelöschte Tabelle ist im JSON-Baum schlicht nicht mehr vorhanden; `blocksToDocx` iteriert nur
  vorhandene Top-Level-Blöcke, kein separater Tabellen-Katalog.
- **Bilder** in gelöschten Zellen verschwinden automatisch: `ImageCollector`
  (`docx/imageCollector.ts`) wird pro `writeDocx()` **neu** instanziiert (`writer.ts:253`) und nur
  beim Ablaufen des (bereits reduzierten) Baums befüllt — kein Eintrag unter `word/media/`, keine
  `<a:blip r:embed>`-Relationship. Analog `RelationshipRegistry` (254/285).
- **Fußnoten** (`table_footnotes.docx`): Der Reader/Writer hat **keinerlei** Fußnoten-Repräsentation
  (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 11, Phase 3). Eine „verwaiste Fußnote" kann daher heute
  gar nicht entstehen. Dies ist eine **bestehende, dokumentierte Einschränkung außerhalb des Scopes**
  (Anforderung Abschnitt 4.2, letzter Absatz, bestätigt das ausdrücklich). Der Pflicht-Testfall zu
  `table_footnotes.docx` (7.5) prüft nur: Import ohne Crash, funktionierende Löschung, valide
  Reimport-Struktur.

**Fazit:** Reine Editor-Änderung; Reader/Writer bleiben unangetastet — durch die Rundreise-Tests
(Abschnitt 7) zu **bestätigen**.

---

## 6. ODT Import/Export — keine Anpassung nötig

### 6.1 Für die Löschfunktion selbst: keine Änderung

Dieselbe Argumentation wie Abschnitt 5 gilt für `odt/writer.ts` (`blockToOdt`, Fall `'table'`,
110–175) und `odt/reader.ts` (`elementToBlocks`, Fall `table`, 301–321): beide arbeiten auf dem zum
Aufrufzeitpunkt aktuellen Baum. Bilder (`ImageCollector`, neu je `writeOdt()`, `writer.ts:262`,
Ablage unter `Pictures/`) und `TextStyleRegistry` (neu je Aufruf, 261/268) verschwinden automatisch
mit einer gelöschten Tabelle (Abschnitt 2.6).

### 6.2 Der frühere ODT-`covered-table-cell`-Blocker ist erledigt (Korrektur)

> **Korrektur ggü. vorheriger Fassung:** Hier stand ein „bekannter Blocker" mit `test.todo`-Empfehlung.
> Er ist **gegenstandslos** — die betroffenen Bugs sind behoben:

- `odt/writer.ts:115-116` berechnet `colCount` als **Summe der `colspan`-Werte** der ersten Zeile
  (`(rows[0]?.content ?? []).reduce((sum, cell) => sum + Number(cell.attrs?.colspan ?? 1), 0) || 1`)
  — die früher vermutete Unterschätzung existiert nicht mehr.
- `odt/writer.ts:119-167` emittiert vollständige `<table:covered-table-cell/>`-Platzhalter für
  horizontale (`colspan`) **und** vertikale (`rowspan`) Merges (per-Grid-Spalten-`pending`-Tracker,
  analog zur `tableToDocx`-`vMerge`-Logik in `docx/writer.ts:163-193`).
- `odt/reader.ts:301-321` liest `number-columns-spanned`/`number-rows-spanned` (Z. 305–306) und
  überspringt `covered-table-cell` bewusst — das ergibt exakt das ProseMirror-Tabellenmodell
  (überdeckte Gitterpositionen sind implizit).
- **Grüne** Tests belegen das: `odt/__tests__/roundtrip.test.ts:275` (colspan) und `:310` (rowspan),
  plus unabhängige ODF-Validierung `odt/__tests__/external-validation.test.ts:144-159`.

**Konsequenz für dieses Feature:** Der Rundreise-Testfall „zwei Tabellen, überlebende hat rowspan"
(Anforderung 4.1.5) ist ein **echter, grün zu erwartender** Test (kein `test.todo` mehr), und die
Fixture-Tests (7.5) dürfen für überlebende Tabellen die volle Struktur prüfen. „Tabelle löschen"
ändert an der Merge-Logik ohnehin nichts (es löscht ganze Tabellen, baut keine um).

---

## 7. Tests

### 7.1 NEU: `src/formats/shared/editor/__tests__/tableCommands.test.ts`

Unit-Tests gegen `deleteTable()`/`canDeleteTable()` über direkt konstruierte `EditorState`s (kein
DOM/View nötig; Muster wie die bestehenden `commands.test.ts`). Baustein für die Zell-Konstruktion:
`wordSchema.nodes.table_cell.createAndFill()!` (wie `insertTable`, `commands.ts:95`). Deckt ab:

| Testfall | Anforderung |
|---|---|
| Cursor in einer Zelle einer 2×2-Tabelle → gesamte Tabelle weg, unabhängig von der Zelle | 2.1 |
| `CellSelection` über mehrere Zellen → ganze Tabelle weg (nicht nur markierte Zellen) | 2.1 |
| Tabelle = einziges Dokumentelement → danach genau **ein** leerer `paragraph`, kein leeres `doc` | 2.4/Grenzfall 1 |
| 1×1-Tabelle → identisch zu größeren | Grenzfall 2 |
| Tabelle am Dokumentanfang, Absatz danach → nur dieser Absatz bleibt, Cursor an dessen Anfang | Grenzfall 4 |
| Tabelle am Dokumentende, Absatz davor → nur dieser Absatz bleibt, Cursor an dessen Ende | Grenzfall 5 |
| Zwei aufeinanderfolgende Tabellen ohne trennenden Absatz, erste gelöscht → zweite unverändert | Grenzfall 6 |
| Verschachtelt: Cursor in innerer Tabelle → nur innere weg, äußere inkl. übriger Zellen bleibt, betroffene Zelle bekommt leeren Absatz | 2.6/Grenzfall 7 |
| Verschachtelt: Cursor in äußerer Zelle außerhalb der inneren → äußere inkl. innerer vollständig weg | 2.6 |
| `NodeSelection` auf dem `table`-Knoten (simuliert Zustand nach Boundary-Backspace) → `deleteTable()` entfernt trotzdem (Regressionstest gegen den Bibliotheks-Fallstrick 2.4) | 2.3/2.9 |
| `canDeleteTable`: `false` außerhalb Tabelle, `false` bei `NodeSelection` auf einem Bild vor einer Tabelle, `true` bei Cursor in Zelle, `true` bei `NodeSelection` auf der Tabelle | Grenzfall 13, Abschnitt 1 |
| Große Tabelle (12×25 synthetisch) → `deleteTable()` ohne Timeout/Exception, ein Absatz bleibt | Grenzfall 3 (Perf-Teil) |
| Tabelle mit `colspan`/`rowspan` (verbundene Zellen) → verschwindet vollständig | 2.7 |
| Mehrfaches Undo/Redo (`history()` + `undo`/`redo` gegen den `EditorState`) → `toJSON()` nach jedem Undo bit-genau identisch zum Vor-Zustand, ≥3 Zyklen | 2.5/Grenzfall 11 |
| Zelle mit mehreren Absätzen + gemischter Formatierung (fett/kursiv/Ausrichtung) → Löschen entfernt alles, Undo stellt alles inkl. Details wieder her | 2.5/Grenzfall 12 |
| Löschen unmittelbar nach `insertTable()` ohne Zwischen-Dispatch → identisch | Grenzfall 10 |

### 7.2 ERWEITERN: `src/formats/docx/__tests__/roundtrip.test.ts`

Neue Tests im bestehenden `describe('DOCX round trip: tables', …)`-Block (**aktuell Z. 229**), die
**den echten Befehl** anwenden (nicht nur JSON konstruieren): `EditorState` mit Tabelle(n) aufbauen →
`deleteTable()` anwenden → `state.doc.toJSON()` in `WordDocumentContent.body` → `writeDocx` →
`readDocx` → prüfen. Als Konstruktionsmuster kann der bestehende Block „whole-cell table selection"
(Z. 512) dienen.
1. 2×2-Tabelle mit Absatz davor/danach, sofort gelöscht → Reimport zeigt nur die zwei Absätze; kein
   `<w:tbl>` mehr (Rundreise 4.1.1).
2. Tabelle mit Text/Formatierung/Bild/verschachtelter Liste befüllt, dann gelöscht → Reimport ohne
   Tabellen-/Zellinhalt, umgebender Text unverändert; zusätzlich per `JSZip.loadAsync` prüfen:
   **keine** Datei unter `word/media/` (Rundreise 4.1.3, Grenzfall 15).
3. Zwei Tabellen, eine gelöscht → verbleibende bit-identisch zum Ausgangs-JSON (Rundreise 4.1.5).
4. Verschachtelt, äußere gelöscht → Reimport: äußere + innere fehlen, umgebender Inhalt bleibt (4.1.6).
5. Verschachtelt, nur innere gelöscht → Reimport: äußere mit allen übrigen Zellen vollständig,
   betroffene Zelle enthält nur noch einen leeren Absatz (4.1.7).
6. Handgebautes Minimaldokument mit Tabelle + einfachem Fußnotenverweis (Muster
   `tests/e2e/docx.spec.ts:buildSampleDocx`) → Löschen, Export/Reimport → kein Crash, restlicher
   Text unverändert (siehe Abschnitt 5 Fußnoten-Einschränkung — prüft „kein XML-Bruch", nicht eine
   fehlende Fußnotenverwaltung).

### 7.3 ERWEITERN: `src/formats/odt/__tests__/roundtrip.test.ts`

Analog 7.2, im bestehenden `describe('ODT round trip: tables', …)`-Block (**aktuell Z. 219**;
Konstruktionsmuster „whole-cell table selection" bei Z. 623). Testfälle 1–5 wortgleich für ODT
(`writeOdt`/`readOdt`). Zusätzlich:
6. **Zwei Tabellen, die überlebende enthält eine über zwei Zeilen reichende `rowspan`-Zelle, die
   andere wird gelöscht** → echter Test (kein `test.todo` mehr): nach Reimport ist die überlebende
   Tabelle inkl. `rowspan` vollständig erhalten (das ODT-Merge-Handling ist implementiert und
   getestet, Abschnitt 6.2).
7. Bild in einer Zelle einer gelöschten Tabelle → nach Export: **keine** Datei mehr unter
   **`Pictures/`** (nicht im ZIP-Root — Korrektur, `odt/imageCollector.ts:22`); `META-INF/manifest.xml`
   enthält keinen `file-entry` für ein nicht mehr vorhandenes Bild (Grenzfall 15, ODT-Teil).
8. Liste in einer Zelle einer gelöschten Tabelle → nach Export: `listStyleDefs()` bleibt (statisch,
   Abschnitt 2.6), aber **keine** `<text:list>`-Instanz mehr im `content.xml` (Anforderung 2.7).

### 7.4 NEU: `src/formats/shared/editor/__tests__/tableDelete.crossFormat.test.ts`

Rundreise 4.1.8 + Grenzfall 16:
1. Im Editor-Modell erzeugte, per `deleteTable()` gelöschte Tabelle → ODT export → reimport → DOCX
   export → reimport → Tabelle über beide Konvertierungen abwesend, umgebender Text exakt erhalten.
2. Umgekehrte Richtung DOCX → ODT.
3. Grenzfall 16: handgebautes DOCX (Tabelle + umgebender Text) importieren, Tabelle im Modell löschen,
   als ODT exportieren, reimportieren → Tabelle abwesend, umgebender Text über den Formatwechsel
   vollständig erhalten.

### 7.5 NEU: Fixture-getriebene Tests für **alle** in Anforderung Abschnitt 4.2 gelisteten Dateien

Zwei Dateien: `src/formats/docx/__tests__/tableDelete.fixtures.test.ts` und
`src/formats/odt/__tests__/tableDelete.fixtures.test.ts`, im Lade-Stil des bestehenden
`external-fixtures.test.ts` (`readFileSync`/`readdirSync` gegen `tests/fixtures/external/{docx,odt}`),
je Datei ein eigenes `it(...)` (kein Sammel-Loop). Ablauf pro Datei:
1. `readDocx`/`readOdt` (Import),
2. `EditorState` via `wordSchema.nodeFromJSON(doc.body)`,
3. erste `table`-Node lokalisieren (`state.doc.descendants(...)`), Cursor per `TextSelection.near`
   in deren erste Zelle,
4. **echten** `deleteTable()`-Befehl anwenden (dieselbe Funktion wie der Button),
5. `writeDocx`/`writeOdt` → `readDocx`/`readOdt` erneut,
6. Assertions: (a) kein Absturz in 1–5, (b) reimportiertes Dokument enthält **eine Tabelle weniger**
   als das Original (`descendants`-Zählung), (c) der Text außerhalb von Tabellen ist zwischen
   Original-Import und Nach-Löschen-Reimport **identisch**.

Dateiliste (aus Anforderung 4.2; jede per `ls` gegen `tests/fixtures/external/` als vorhanden
bestätigt):
- ODT: `BigTable.odt`, `crazyTable.odt`, `subTables.odt`, `subTables2.odt`, `subTables3-nested.odt`,
  `subTables3-onlyOneColumn.odt`, `subTables4.odt`, `table-within-textBox-within-frame.odt`,
  `table-column-delete-with-merge.odt`, `table-column-delete-with-merge-2-times.odt`,
  `tableRowDeletionTest.odt`, `tableOps.odt`, `tableCoveredContent.odt`, `OOStyledTable.odt`,
  `coloredTable_MSO15.odt`, `TableFunkyBackground.odt`, `feature_attributes_tables.odt`,
  `feature_attributes_tables-backgroundTableOnly.odt`,
  `feature_attributes_tables-backgroundTableOnly-AO341.odt`,
  `feature_attributes_tables_FunnyTable_With_xmlid.odt`, `feature_attributes_tables_SMALL.odt`,
  `table_1x3_paragraph_background-MSO2013-LO3_6.odt`, `TableWidth.odt`, `tableNotFullWidth.odt`,
  `simple-table.odt`, `simpleTable.odt`, `simple_table.odt`, `simple-table-with-lists.odt`,
  `listsInTable.odt`, `table.odt`, `table_simple.odt`, `TestTextTable.odt`, `doc_heading_table.odt`,
  `empty4table.odt`.
- DOCX: `TestTableCellAlign.docx`, `TestTableColumns.docx`, `deep-table-cell.docx`,
  `table-alignment.docx`, `table-indent.docx`, `table_footnotes.docx`.

Hinweis `deep-table-cell.docx`: dient bereits im Reader als Absturz-Schutz-Fall für tiefe
Verschachtelung (`docx/reader.ts:309` `MAX_TABLE_NESTING_DEPTH = 25`); der Lösch-Test prüft
Absturzfreiheit über den vollen Zyklus, nicht Vollständigkeit jeder Ebene.

> **Korrektur ggü. vorheriger Fassung:** Die frühere „Einschränkung für rowspan-Fixtures"
> (Assertion auf reinen Text beschränken) entfällt — das ODT-Merge-Handling ist implementiert und
> validiert (Abschnitt 6.2). Für überlebende Tabellen darf voll geprüft werden.

### 7.6 NEU: `tests/e2e/table-delete.spec.ts`

Echte Playwright-Bedienung, Stil wie `tests/e2e/selection-regression.spec.ts` / `docx.spec.ts` /
`odt.spec.ts` (`docxCard`/`odtCard` aus `tests/e2e/fixtures.ts`, `.ProseMirror`-Locator, echter
Upload via `filechooser`/`input[type=file]`, Download via `page.waitForEvent('download')`).
**Locator für den neuen Button ausschließlich** `page.getByRole('button', { name: 'Tabelle löschen' })`
bzw. `page.getByTitle('Tabelle löschen')` — **nicht** am Nachbar-Button. Ohne Projekt-Einschränkung,
damit automatisch auf allen drei `playwright.config.ts`-Projekten (Desktop Chrome, Mobile/Pixel 7,
Tablet/iPad Mini).

Testfälle:
1. Button deaktiviert außerhalb einer Tabelle; nach Klick in eine Zelle ohne weiteren Klick aktiv
   (Testfall 1, Grenzfall 13).
2. Tabelle einfügen, in eine beliebige Zelle (nicht Zelle 0) klicken, „Tabelle löschen" → komplette
   Tabelle inkl. Inhalt weg (Testfall 2).
3. Text in eine Zelle tippen, per Maus markieren, Entf → nur Zellinhalt leer, Tabelle bleibt
   sichtbar (Testfall 3/Abschnitt 2.2, Pflicht-Regression).
4. **Pflicht (Grenzfall 9/2.5):** Text in eine Zelle tippen → per Klick in eine **andere** Zelle
   neu positionieren → sofort „Tabelle löschen" → Tabelle vollständig weg, kein Crash, kein falsches
   Ziel. Nachbau des Musters aus `selection-regression.spec.ts` „same regression inside a table cell"
   (Z. 43, Locator `.ProseMirror td`, `cells.nth(0/1).click()`), nur mit Struktur-Löschung am Ende.
5. Cursor direkt nach dem Einfügen (kein Klick dazwischen) → Löschen funktioniert (Grenzfall 10).
6. Tabelle als einziges Dokumentelement (neu → Tabelle → sofort löschen) → Editor bedienbar, Tippen
   sofort möglich, kein Crash (Grenzfall 1).
7. Tabelle am Dokumentanfang mit Folgeinhalt / am Dokumentende mit vorherigem Inhalt (zwei Sub-Tests)
   → Cursor landet deterministisch im Nachbarabsatz, kein Inhaltsverlust (Grenzfall 4/5).
8. Zwei Tabellen ohne trennenden Absatz → nur die per Cursor gewählte verschwindet (Grenzfall 6).
9. Verschachtelte Tabelle (durch Einfügen-in-Einfügen erzeugt): Cursor in innerer löschen; separat
   Cursor in äußerer Zelle löschen → je erwartetes Ziel (Grenzfall 7, beide Richtungen).
10. `Strg+Z` direkt nach dem Löschen → Ursprungszustand sichtbar identisch; `Strg+Y` → erneut weg;
    zusätzlich Zyklus löschen→Undo→Redo→Undo (3 Runden) (Testfall 8, Grenzfall 11).
11. Cursor in einem Bild **vor** der Tabelle → Button deaktiviert; ein erzwungener Klick ändert
    nichts (Grenzfall 13).
12. `Mod-Alt-Backspace` mit Cursor irgendwo in der Tabelle → identisch zum Button-Klick
    (Abschnitt 3.6).
13. Boundary-Backspace (Abschnitt 2.4, kein neuer Code): Cursor am Anfang eines Absatzes direkt nach
    einer Tabelle, zweimal Backspace → erste Taste markiert die Tabelle (NodeSelection-Rahmen),
    zweite entfernt sie.
14. Export nach DOCX über echten Download-Flow → Reimport → Tabelle abwesend, `word/media/` ohne
    verwaiste Bilddatei (Grenzfall 15, DOCX).
15. Dasselbe für ODT (Bild-Prüfung gegen **`Pictures/`**).
16. Repräsentative Fixture-Teilmenge über echten Upload: `simple-table.odt`, `BigTable.odt`,
    `subTables3-nested.odt`, `table-column-delete-with-merge.odt`, `TestTableColumns.docx`,
    `table_footnotes.docx` (je ein Haupt-Risikofall). Upload → Cursor in die erste Tabelle → „Tabelle
    löschen" → Export → Download-Buffer per `JSZip` → keine Tabellen-XML mehr. Die **volle** Breite
    aller Fixtures wird auf Unit-/Integrationsebene (7.5) geprüft, wo `deleteTable()` ebenfalls direkt
    aufgerufen wird.

> **Korrektur ggü. vorheriger Fassung:** Die frühere Behauptung, `tests/e2e/large-document-import.spec.ts`
> „existiert nicht", ist falsch — die Datei existiert. Diese zweistufige Strategie (Unit-Breite +
> E2E-Stichprobe) steht aus eigenem Recht, unabhängig davon.

---

## 8. Grenzfall- und Zugriffswege-Abgleich

### 8.1 Zugriffswege (Anforderung Abschnitt 1)

| # | Weg | Entscheidung | Umsetzung |
|---|---|---|---|
| 1 | Toolbar-Button „Tabelle löschen" | **Pflicht — umgesetzt** | 4.2/4.3 |
| 2 | Rechtsklick-Kontextmenü | **Nicht umgesetzt** (Nice-to-have) | 3.5 |
| 3 | Tastenkombination | **Umgesetzt** (optional): neuer `Mod-Alt-Backspace` + dokumentiertes Boundary-Backspace | 3.6/4.4, Tests 7.6.12/13 |
| 4 | Bestätigungsdialog | **Nicht umgesetzt** | 3.4 |
| 5 | Icon | SVG (`DeleteTableIcon`), kein Emoji | 4.2 |
| 6 | Zustand außerhalb einer Tabelle | **`disabled`, immer sichtbar** | 3.3, `canDeleteTable` |
| 7 | Touch (Mobile/Tablet) | Button erreichbar/auslösbar, Kernverhalten nachgewiesen | 7.6 (alle drei Projekte) |

### 8.2 Grenzfälle (Anforderung Abschnitt 3) → Testort

| Grenzfall | Kurzfassung | Abgedeckt durch |
|---|---|---|
| 1 | Einzige Tabelle, einziges Element | 7.1, 7.6.6 |
| 2 | 1×1-Tabelle | 7.1 |
| 3 | Sehr große Tabelle, Performance | 7.1 (synthetisch), 7.5/7.6.16 (`BigTable.odt`) |
| 4 | Tabelle am Dokumentanfang | 7.1, 7.6.7 |
| 5 | Tabelle am Dokumentende | 7.1, 7.6.7 |
| 6 | Zwei aufeinanderfolgende Tabellen | 7.1, 7.6.8 |
| 7 | Verschachtelte Tabelle, beide Richtungen | 7.1, 7.6.9, `subTables*.odt` (7.5) |
| 8 | Gemergte/gelöschte Spalten (Fremddatei) | 7.5 (`table-column-delete-with-merge*.odt`) |
| 9 | Selection-Sync-Regressionsmuster | 7.6.4 (Pflicht) |
| 10 | Löschen unmittelbar nach Einfügen | 7.1, 7.6.5 |
| 11 | Mehrfaches Undo/Redo | 7.1, 7.6.10 |
| 12 | Mehrere Absätze/gemischte Formatierung je Zelle | 7.1 |
| 13 | Klick bei Cursor außerhalb (Bild/Fremdauswahl) | 7.1 (`canDeleteTable`), 7.6.11 |
| 14 | Ganze Tabelle als NodeSelection | 7.1, 7.6.13 |
| 15 | Bild in Zelle löschen, exportieren | 7.2.2, 7.3.7, 7.6.14/15 |
| 16 | Rundreise mit Format-Wechsel | 7.4 |
| 17 | Reale Fremddatei: Rundreise ohne Löschen unbeeinträchtigt | 7.5 Schritt (a)/(c) |
| 18 | Mobile/Touch | 7.6 (alle drei Projekte) |

---

## 9. Integrationsrisiken zwischen den drei parallelen Tabellen-Feature-Plänen

Stand 2026-07-04 ist **keines** der drei Features (`tabelle-loeschen`, `zeile-loeschen`,
`spalte-loeschen`) im Code umgesetzt (0 Treffer für `deleteTable`/`tableCommands`/`TableToolbar`/
`tableIcons` in `src/`). Die folgenden Konflikte betreffen die spätere Integration:

1. **Tabellen-UI-Architektur:** `zeile-loeschen-code.md` plant eine separate `TableToolbar.tsx`;
   `spalte-loeschen-code.md` und dieser Plan erweitern die bestehende `Toolbar.tsx`. **Empfehlung:**
   `Toolbar.tsx`-Ansatz (folgt dem Anforderungswortlaut, zwei von drei Plänen, weniger neue
   Infrastruktur). Wer zuerst umsetzt, legt die Architektur fest.
2. **`commands.ts` vs. neues `tableCommands.ts`:** Dieser Plan + `spalte-loeschen` erweitern
   `commands.ts`; `zeile-loeschen` verschiebt `insertTable` in ein neues Modul. Existiert
   `tableCommands.ts` zum Umsetzungszeitpunkt bereits, gilt Abschnitt 3.1 sinngemäß für diese Datei.
3. **Icon-Datei:** Dieser Plan + `spalte-loeschen` nutzen `tableIcons.tsx`; `zeile-loeschen` nutzt
   `icons.tsx`. Namenskollision unwahrscheinlich (unterschiedliche Exporte), aber auf **eine** Datei
   konsolidieren (Empfehlung: `tableIcons.tsx`).
4. **Bestätigt durch direkte Codesichtung der beiden Nachbarpläne (2026-07-05):** Nicht nur
   behauptet, sondern nachgelesen — `zeile-loeschen-code.md` Zeile 120–135 plant explizit ein
   eigenes `tableCommands.ts`, eine eigene `TableToolbar.tsx`-Komponente, ein eigenes `icons.tsx`
   **und** einen zusätzlichen `runEditorCommand.ts`-Helfer (vier neue Dateien statt Erweiterung
   bestehender). `spalte-loeschen-code.md` Abschnitt 4.1/4.2/4.3 (Zeile 210/257/287) erweitert
   dagegen — wortgleich zu diesem Plan — `commands.ts`, legt `tableIcons.tsx` an und erweitert
   `Toolbar.tsx`; es zitiert sogar dieselbe Präzedenz (`ScissorsIcon`, `Toolbar.tsx:33-53`,
   „Ausschneiden"-Button `Toolbar.tsx:143-156` als Vorbild für `disabled`). Die 2:1-Mehrheit aus
   Punkt 1 ist damit **verifiziert**, nicht nur angenommen; die Empfehlung „`Toolbar.tsx`/
   `commands.ts`/`tableIcons.tsx`" bleibt bestehen.

> **Korrektur ggü. vorheriger Fassung:** Der frühere Punkt 4 (gemeinsamer ODT-`covered-table-cell`-Fix
> als Cross-Feature-Blocker; angebliche Nicht-Existenz von `large-document-import.spec.ts`) ist
> **gestrichen**: Der ODT-Merge-Fix ist bereits (unabhängig) umgesetzt (Abschnitt 6.2), und die
> genannte E2E-Datei existiert. Keiner der verbleibenden drei Punkte blockiert dieses Feature für
> sich genommen.

---

## 10. Abnahmekriterien-Abgleich (Definition of Done, Anforderung Abschnitt 9)

| DoD-Punkt | Abgedeckt durch |
|---|---|
| 1 Echter, klickbarer Toolbar-Button entfernt Tabelle inkl. Inhalt | 4.2/4.3, 7.6.1/2 |
| 2 NodeSelection-auf-Tabelle-Pflichtfall (kein stiller No-Op) | 4.1 (`canDeleteTable`/`deleteTable`), 7.1, 7.6.13 |
| 3 Abgrenzung „Struktur löschen" vs. „nur Zellinhalt leeren" | 7.6.3 (Regression) |
| 4 Sonderfall „einzige/letzte Tabelle" → Ersatz-Absatz | 2.1, 7.1, 7.6.6 |
| 5 Undo/Redo strukturell exakt, mehrere Zyklen | 7.1, 7.6.10 |
| 6 Verschachtelte Tabellen, beide Richtungen | 7.1, 7.6.9 |
| 7 Jeder Grenzfall aus Abschnitt 3 hat einen Test | Tabelle 8.2 |
| 8 Selection-Sync-Regressionstest im Tabellenkontext | 7.6.4 (Pflicht) |
| 9 Rundreise beide Formate, alle Fixtures, unabhängiger Parser | 7.2/7.3/7.5, ODF-Validierung vorhanden (6.2) |
| 10 Kernverhalten auf allen drei Playwright-Projekten | 7.6 (ohne Projekt-Einschränkung) |
| 11 Jeder Verdachtspunkt aus Abschnitt 5 eindeutig aufgelöst | Abschnitt 1 |
| 12 Kein stiller Fehlschlag | 3.3/4.1 (`disabled` + NodeSelection-Fallback) |
| 13 Backlog-Statuswechsel erst nach allen Punkten | Backlog-Pflegeprozess, nicht Codeplan |

---

## 11. Bewusst nicht im Scope

- **Rechtsklick-Kontextmenü** (3.5) — Nice-to-have laut Anforderung.
- **Fußnoten-Verwaltung allgemein** (5) — eigener, noch ungebauter Bereich
  (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 11); nicht durch „Tabelle löschen" neu geschaffen.
- **Migration der bestehenden Emoji/Unicode-Toolbar-Buttons auf SVG** (`⊞ Tabelle`, `🖼 Bild` etc.) —
  vorbestehende allgemeine Abweichung von Hauptspezifikation Abschnitt 20, gehört zu keinem
  Einzel-Slug.
- **`TableToolbar.tsx`/`tableCommands.ts`-Migration** — nur nötig, falls die Integration
  (Abschnitt 9) sich gegen den hier gewählten `Toolbar.tsx`/`commands.ts`-Ansatz entscheidet; bewusst
  spät gehaltene Entscheidung, keine Unterlassung.
