# QA-Testplan: „Tabelle löschen"

Gegenstück zu `specs/tabelle-loeschen-req.md` (Anforderung) und `specs/tabelle-loeschen-code.md`
(Umsetzungsplan des Dev-Agenten). Dieses Dokument ist der **Testplan der QA-Rolle**: es legt fest,
welche Tests geschrieben werden, mit welchem konkreten Code, gegen welche echten Dateien/Fixtures,
und wie das Ergebnis gegen Anforderungsabschnitt 3/4/7 abgeglichen wird. Es ersetzt nicht die
Ausführung, sondern ist die verbindliche, ausführbare Grundlage dafür.

Stil/Aufbau folgen bewusst den bereits geprüften Schwester-QA-Plänen dieses Repos, damit alle
QA-Pläne vergleichbar bleiben.

> **Revision (kritische Überarbeitung, 2026-07-05).** Die erste Fassung dieses Plans war gegen
> einen **veralteten Code-Stand** (vor dem Merge des „Ausschneiden"-Features) geschrieben und
> enthielt dadurch mehrere **faktisch falsche** Ist-Stand-Behauptungen. Sie sind gegen den
> **tatsächlichen aktuellen Repo-Stand** neu verifiziert und korrigiert. Die wichtigsten
> Korrekturen (Details je Stelle markiert):
> 1. **ODT `covered-table-cell` ist implementiert**, nicht fehlend. `odt/writer.ts:115-116`
>    summiert `colspan`, `odt/writer.ts:137/161` emittiert `<table:covered-table-cell/>` für
>    horizontale **und** vertikale Merges; grüne Tests unter `odt/__tests__/roundtrip.test.ts:275`
>    (colspan) / `:310` (rowspan) und `odt/__tests__/external-validation.test.ts:144-159`. Der
>    frühere `test.todo`-„Blocker" entfällt ersatzlos; die betroffenen Tests dürfen volle
>    Struktur-Assertions verwenden.
> 2. **`tests/e2e/large-document-import.spec.ts` existiert.** `tests/e2e/` enthält aktuell **17**
>    Spec-Dateien (nicht vier). Der frühere „Datei fehlt"-Befund war falsch.
> 3. **ODT-Bilder liegen unter `Pictures/`** (`odt/imageCollector.ts:22`), nicht im ZIP-Wurzel-
>    verzeichnis.
> 4. **Der Einfüge-Button hat heute `aria-label="Tabelle einfügen"`** (`Toolbar.tsx:280`) zusätzlich
>    zu `title` — die frühere Warnung „kein aria-label, Accessible Name nur aus sichtbarem Text"
>    ist überholt. `getByRole('button', { name: 'Tabelle einfügen' })` matcht zuverlässig (so nutzt
>    es auch `selection-regression.spec.ts:46`).
> 5. **`commands.ts` hat 167 Zeilen** und exportiert zusätzlich `insertHardBreak`,
>    `applyMarkColor`/`clearMarkColor`, `canCut`/`cutSelection`. Sämtliche Zeilenangaben in Abschnitt
>    1 sind auf den aktuellen Stand gesetzt.
> 6. **Zwei konkrete Testcode-Defekte der ersten Fassung behoben:** (a) der Bild-`<input>` liegt in
>    der Toolbar, **nicht** in `.ProseMirror` — Locator ist jetzt seiten-, nicht editor-bezogen;
>    (b) fehlende Selektions-Sync-Wartepunkte zwischen Reposition und Folgeaktion sind ergänzt
>    (Abschnitt 5.1, Determinismus).

---

## 0. Kurzfassung für Eilige

- **Vor Testerstellung wurde der tatsächliche Code geprüft** (nicht nur `tabelle-loeschen-code.md`
  gelesen), und zwar erneut gegen den aktuellen Stand nach dem „Ausschneiden"-Merge. Ergebnis: Hier
  gibt es **keine** Teilumsetzung zu verifizieren — der in `tabelle-loeschen-req.md` Abschnitt 5 und
  `tabelle-loeschen-code.md` Abschnitt 1 beschriebene Ist-Zustand („zu 100 % ungebaut") ist exakt der
  tatsächliche Code-Stand (Details Abschnitt 1). **Praktisch jeder** in diesem Plan neu
  vorgeschlagene Test ist deshalb heute **RED** (Laufzeitfehler `deleteTable is not a function`
  bzw. fehlendes UI-Element) — das ist der korrekte, erwartete Zustand vor dem Bau, kein Testfehler.
- Zwei Testebenen, wie beauftragt:
  1. **Unit-Tests (Vitest/jsdom)** für die Reader/Writer-Rundreise DOCX **und** ODT — Abschnitt 4.
  2. **Echte Playwright-Browser-Tests** — echte Mausklicks, echtes Tippen über `page.keyboard`,
     echter Datei-Upload über `input[type=file].setInputFiles(...)`, echter Export-Download über
     `page.waitForEvent('download')` mit anschließendem Einlesen/Entpacken der **tatsächlich
     heruntergeladenen Datei** per `JSZip` — nicht nur interne Aufrufe von
     `readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`deleteTable`. Abschnitt 5.
- Alle in `tabelle-loeschen-req.md` Abschnitt 4.2 gelisteten Fixture-Dateien wurden **vor dem
  Schreiben dieses Plans** per `ls` gegen das tatsächliche Dateisystem geprüft — **alle vorhanden**
  (Abschnitt 6), keine wurde unbesehen aus der Anforderung übernommen.
- Weder unter `src/**/__tests__/` noch unter `tests/e2e/` existiert **irgendeine** der in diesem
  Plan vorgeschlagenen neuen Testdateien (`tableCommands.test.ts`,
  `tableDelete.crossFormat.test.ts`, `tableDelete.fixtures.test.ts` ×2, `table-delete.spec.ts`) —
  per `Glob` bestätigt. Dieser Plan beschreibt vollständig **neue** Testabdeckung plus Erweiterungen
  der beiden bestehenden `roundtrip.test.ts`-Dateien.
- **Wichtigste QA-Konsequenz gegenüber `tabelle-loeschen-code.md`:** Der Codeplan begründet an
  mehreren Stellen (Abschnitt 2.1-2.5), dass ein Großteil des gewünschten Verhaltens „bereits heute
  automatisch durch `prosemirror-tables`/ProseMirror selbst korrekt" sei. Das mag für die
  **Bibliothek** `deleteTable` zutreffen — es trifft **nicht** auf das Produkt zu, solange
  `commands.ts` keinen eigenen `deleteTable`/`canDeleteTable` exportiert, kein Toolbar-Button
  existiert und kein Keymap-Eintrag gebunden ist. Dieser Plan testet ausschließlich den
  **Produkt**-Zustand (echter Button-Klick, echter Tastaturweg, echter Export), nicht die isolierte
  Bibliotheksfunktion — entsprechend sind die im Codeplan als „empirisch verifiziert" bezeichneten
  Befunde hier als **Vorhersage für nach dem Bau**, nicht als bereits bestehende Testabdeckung zu
  lesen.

---

## 1. Ausgangslage: Code-Audit vor Testerstellung (neu verifiziert 2026-07-05)

Geprüft wurden die tatsächlichen Dateien im Repo (nicht nur die Beschreibung in
`tabelle-loeschen-code.md`): `src/formats/shared/schema.ts`,
`src/formats/shared/editor/{commands.ts,Toolbar.tsx,WordEditor.tsx}`,
`src/formats/docx/{reader.ts,writer.ts}`, `src/formats/odt/{reader.ts,writer.ts,imageCollector.ts}`,
beide `__tests__/roundtrip.test.ts`, `odt/__tests__/external-validation.test.ts`,
`tests/e2e/*.spec.ts` (Verzeichnis-Listing), `tests/e2e/fixtures.ts`, `playwright.config.ts`,
`package.json`, sowie das Vorhandensein aller in `tabelle-loeschen-req.md` Abschnitt 4.2 genannten
Fixture-Dateien per `ls`.

| # | Verdachtspunkt / Codeplan-Aussage | Tatsächlicher Code-Stand (verifiziert 2026-07-05) | QA-Konsequenz |
|---|---|---|---|
| 1 | `commands.ts` hat keinen `deleteTable`/`canDeleteTable` (req 5.1, code 1) | **Bestätigt.** Datei (`src/formats/shared/editor/commands.ts`, **167 Zeilen**) exportiert `isInTable` (Re-Export, Z. 6), `setAlign`/`isAlignActive`, `setHeading`, `toggleList`/`liftFromList`, `insertImage`, `insertHardBreak` (Z. 83), `insertTable` (Z. 92-102), `applyMarkColor`/`clearMarkColor`, `canCut`/`cutSelection` (Z. 126-166) — **kein** `deleteTable`, **kein** `canDeleteTable`, **kein** Import von `prosemirror-tables`' `deleteTable`. | Jeder Test, der `deleteTable`/`canDeleteTable` aus `../commands` importiert, schlägt heute zur **Laufzeit** fehl (`TypeError: deleteTable is not a function`). Vitest führt `.ts` über esbuild ohne Typecheck-Gate aus — ein fehlender Named Export bindet als `undefined` und fällt erst beim Aufruf auf, nicht beim Import. |
| 2 | Kein zweiter Toolbar-Button fürs Löschen (req 5.2) | **Bestätigt.** `Toolbar.tsx` (298 Z.) enthält im Tabellen-Bereich nur den Einfüge-Button `Z. 277-289` (`title`/`aria-label="Tabelle einfügen"`, `aria-pressed={isInTable(view.state)}`, `onMouseDown → insertTable(2,2)`), danach direkt das Bild-Label `Z. 291-294`. **Kein** Lösch-Button. **Korrektur ggü. 1. Fassung:** der Einfüge-Button hat heute ein `aria-label` (Z. 280). | Jeder E2E-Test, der `getByRole('button', { name: 'Tabelle löschen' })`/`getByTitle('Tabelle löschen')` erwartet, schlägt heute mit Timeout/„element not found" fehl. |
| 3 | Kein Kontextmenü (req 5.3) | **Bestätigt.** Suche nach `contextmenu`/`onContextMenu`: 0 Treffer im Produktcode; `WordEditor.tsx:~110` dokumentiert die bewusste Abwesenheit. | Kein Test nötig (Nice-to-have, bewusst außer Scope, code 3.5). |
| 4 | Keine Tastenkombination fürs Löschen (req 5.4) | **Bestätigt für einen dedizierten Eintrag.** `WordEditor.tsx` `keymap({...})` `Z. 77-99` bindet `Mod-z`(85), `Mod-y`(86), `Mod-Shift-z`(87), `Enter`(88), `Shift-Enter`(89), `Mod-b`(90), `Mod-i`(91), `Mod-u`(92), `Shift-Delete`(98); danach `keymap(baseKeymap)`(100), `columnResizing()`(101), `tableEditing()`(102). **Kein** `Mod-Alt-Backspace`, keine sonstige Tabellen-Lösch-Bindung. | Jeder E2E-Test für `Mod-Alt-Backspace` ist heute RED (Dokument unverändert). |
| 5 | Boundary-Backspace (zweimal Backspace direkt nach einer Tabelle) entfernt die Tabelle bereits heute ohne neuen Code (code 2.4) | **Geprüft und bestätigt.** Der **einzige** Teil des Feature-Umfangs, der schon heute funktioniert, weil er nur aus aktivem Bibliothekscode folgt: `keymap(baseKeymap)` ist aktiv (`WordEditor.tsx:100`), `table`/`table_cell` werden von `tableNodes()` (`schema.ts:154`) ohne `selectable: false` erzeugt. | **Einziger heute schon GREEN-fähiger** E2E-Testfall (Abschnitt 5.2 Block „Undo/Redo & Grenzfälle", boundary-Backspace) — muss trotzdem tatsächlich ausgeführt werden. |
| 6 | `deleteTable` aus `prosemirror-tables` existiert und verhält sich wie code 2.1/2.2 beschreibt | **Bestätigt** über das installierte Paket `prosemirror-tables@1.8.5` (identisch zu `package.json`s `^1.8.5`): `deleteTable(state, dispatch)` läuft `$pos.depth` abwärts, nimmt den ersten `tableRole == "table"`-Treffer. | Wird **nicht** separat gegen die Fremdbibliothek getestet, sondern ausschließlich über die noch zu bauende `commands.ts`-Wrapper-Funktion (Abschnitt 0). |
| 7 | **KORREKTUR:** ODT ignoriert `colspan` / emittiert kein `covered-table-cell` (frühere Behauptung) | **Widerlegt — bereits implementiert.** `odt/writer.ts:115-116` berechnet `colCount` als **Summe der `colspan`-Werte** der ersten Zeile; `odt/writer.ts:137` und `:161` emittieren `<table:covered-table-cell/>` für horizontale (`colspan`) **und** vertikale (`rowspan`) Merges (per-Grid-`pending`-Tracker). Grüne Tests: `odt/__tests__/roundtrip.test.ts:275`/`:310`. | **Kein `test.todo`, kein Blocker.** Rundreise-Tests mit einer **überlebenden** rowspan-Tabelle dürfen voll auf Struktur prüfen (Abschnitt 4.4). |
| 8 | **KORREKTUR:** ODT-Reader liest `covered-table-cell` nicht (frühere Behauptung) | **Widerlegt.** `odt/reader.ts` (Fall `table`) liest `number-columns-spanned`/`number-rows-spanned` und überspringt `covered-table-cell` bewusst — ergibt exakt das ProseMirror-Tabellenmodell. | Gleiche Konsequenz wie Punkt 7 — kein offener Blocker. |
| 9 | DOCX-Reader hat Tiefen-Schutz `MAX_TABLE_NESTING_DEPTH = 25` (code 7.5) | **Bestätigt.** `docx/reader.ts:309` `const MAX_TABLE_NESTING_DEPTH = 25`, benutzt in `Z. 340`. | Fixture-Test für `deep-table-cell.docx` prüft nur Absturzfreiheit über den vollen Zyklus, nicht Vollständigkeit jeder Verschachtelungsebene (Abschnitt 4.6). |
| 10 | Keine Fußnoten-Unterstützung im DOCX-Pfad (req 4.2, code 5) | **Bestätigt.** Keine Fußnoten-Repräsentation im Reader/Writer. | `table_footnotes.docx`-Test prüft nur „kein Crash / keine kaputte XML-Struktur nach Löschen+Export", **nicht** Fußnotenverwaltung (bewusst außer Scope, code 5). |
| 11 | `ImageCollector` wird pro Export neu instanziiert (req 5.7, code 2.6/5/6.1) | **Bestätigt.** `docx/writer.ts:253` `const images = new ImageCollector()`; `odt/writer.ts:262` analog (dazu `new TextStyleRegistry()` je Aufruf, Z. 261/268). Beide nur beim Ablaufen des zum Exportzeitpunkt aktuellen (reduzierten) Baums befüllt. | Bild-/Stil-Aufräum-Tests (Abschnitt 4.4/4.6) sind **Bestätigungstests** einer strukturell garantierten Eigenschaft — laut Anforderung dennoch Pflicht („nachgewiesen, nicht nur plausibel"). |
| 12 | **KORREKTUR:** `tests/e2e/large-document-import.spec.ts` existiert nicht (frühere Behauptung) | **Widerlegt.** Die Datei existiert; `tests/e2e/` enthält aktuell **17** Spec-Dateien (u. a. `large-document-import.spec.ts`, `large-document-export.spec.ts`, `clipboard*.spec.ts`, `cut.spec.ts`, `save-export-lifecycle.spec.ts`). | Dieser Plan verlässt sich an **keiner** Stelle auf eine angeblich fehlende Datei; Performance-/Großtabellen-Fälle werden in Abschnitt 5.2 selbst mit echten E2E-Tests abgedeckt. |
| 13 | Alle in req 4.2 gelisteten Fixture-Dateien existieren | **Bestätigt**, alle ODT- und DOCX-Dateien per `ls` einzeln geprüft (Abschnitt 6). | Fixture-Testliste (Abschnitt 4.6/5.2) kann 1:1 aus der Anforderung übernommen werden. |
| 14 | Keine der vorgeschlagenen neuen Testdateien existiert bereits | **Bestätigt** per `Glob`: alle sind neue Pfade. | Dieser Plan beschreibt vollständig neue Abdeckung, siehe Abschnitt 4/5. |

Zusätzlich verifiziert, **bereits korrekt und unverändert von diesem Feature betroffen**:

- `schema.ts:14` `doc: { content: 'block+' }` und `schema.ts:154`
  `...tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })`; `wordSchema`
  bei `Z. 198`. Exakt wie Anforderung/Codeplan.
- `docx/__tests__/roundtrip.test.ts` `describe('DOCX round trip: tables', ...)` bei **Z. 229** und
  `odt/__tests__/roundtrip.test.ts` `describe('ODT round trip: tables', ...)` bei **Z. 219** — beide
  prüfen nur das **Anlegen** von Tabellen (2×2, `colspan`-Merge, `rowspan`-Merge); **kein** Test ruft
  ein Lösch-Kommando auf oder prüft den Zustand danach.
- `tests/e2e/selection-regression.spec.ts:43-59` enthält bereits einen Tabellen-Test
  („same regression inside a table cell"), der **exakt** das für Grenzfall 9/Testfall 4 benötigte
  Muster (Zelle A tippen+`Fett` → Klick in Zelle B) vorführt, aber **ohne** anschließende
  Lösch-Aktion.
- `playwright.config.ts` — `testDir: tests/e2e`, drei Projekte (Desktop Chrome, Mobile/Pixel 7,
  Tablet/iPad Mini), `webServer` baut+startet automatisch. Keine Konfigurationsänderung nötig.
- `tests/e2e/fixtures.ts` exportiert `test` (dismisst die Datenschutz-Overlay „verstanden" und
  navigiert automatisch auf `/`, sammelt zusätzlich `pageerror`/console-errors) sowie `expect`,
  `docxCard`, `odtCard`. Dieser Plan nutzt diese Fixture, um „kein Absturz" mit abzudecken.

**Konsequenz für diesen Testplan:** Die **überwältigende Mehrheit** der neuen Tests ist heute RED,
weil das Feature schlicht noch nicht existiert. Jeder Test ist so geschrieben, dass er **nach**
Umsetzung von `tabelle-loeschen-code.md` ohne weitere Änderung grün wird — die Erwartung „RED heute,
GREEN nach Bau" wird pro Block explizit vermerkt (Abschnitte 4.7 und 5.3), damit ein QA-Lauf vor
Fertigstellung nicht als „Feature kaputt" statt „Feature noch nicht gebaut" fehlgelesen wird.

---

## 2. Testumgebung & Ausführung

| Ebene | Werkzeug | Befehl | Konfiguration |
|---|---|---|---|
| Unit | Vitest, Environment `jsdom`, `globals: true` | `npm test` / `npm run test:watch` | `vite.config.ts` — **kein** Typecheck-Plugin aktiv (relevant für Abschnitt 1 Punkt 1: fehlender Named Export = Laufzeitfehler, kein Build-Fehler) |
| E2E | Playwright | `npm run test:e2e` / `npm run test:e2e:ui` | `playwright.config.ts` — `testDir: tests/e2e`, `webServer` baut automatisch (`npm run build && npm run preview`); Projekte: Desktop Chrome, Mobile (Pixel 7), Tablet (iPad Mini) — alle drei laufen automatisch, kein `test.describe.configure` nötig |

Alle neuen/erweiterten Testdateien fügen sich ohne Konfigurationsänderung in die bestehende Suite ein.

---

## 3. Traceability-Matrix — Anforderung → Testartefakt

### 3.1 Testfälle (`tabelle-loeschen-req.md` Abschnitt 7)

| Testfall | Ebene | Testartefakt | Erwartung heute |
|---|---|---|---|
| 1 (Button-Zustand nur in Tabelle aktiv) | E2E | `table-delete.spec.ts` „Testfall 1" | RED (Button existiert nicht) |
| 2 (Klick entfernt komplette Tabelle) | E2E | `table-delete.spec.ts` „Testfall 2" | RED |
| 3 (`CellSelection` Maus-Drag → ganze Tabelle) | Unit + E2E | `tableCommands.test.ts` + `table-delete.spec.ts` „CellSelection" | RED |
| 4 (Entf/Backspace leert nur Zellinhalt) | E2E | `table-delete.spec.ts` „Testfall 3" | **GREEN erwartet bereits heute** — reines `tableEditing()`/`isolating`-Verhalten, unabhängig vom neuen Feature |
| 5 (NodeSelection, kein stiller No-Op) | Unit + E2E | `tableCommands.test.ts` + `table-delete.spec.ts` „boundary-Backspace/NodeSelection" | RED |
| 6 (Tastaturweg = Button) | E2E | `table-delete.spec.ts` „Mod-Alt-Backspace" | RED |
| 7 (Cursor-Ziel deterministisch, Editor sofort bedienbar) | Unit + E2E | `tableCommands.test.ts` + `table-delete.spec.ts` „Grenzfall 1/4/5" | RED |
| 8 (Undo/Redo bit-genau, mehrere Zyklen) | Unit + E2E | `tableCommands.test.ts` + `table-delete.spec.ts` „Undo/Redo" | RED |
| 9 (verschachtelte Tabelle, beide Richtungen) | Unit + E2E | `tableCommands.test.ts` + `table-delete.spec.ts` „verschachtelt" | RED |
| 10 (Bild-/Listen-Aufräumen im Export) | Unit (Rundreise) + E2E | Abschnitt 4.4/4.5 + `table-delete.spec.ts` „Export/Download" | RED |
| 11 (Selection-Sync-Regression) | E2E | `table-delete.spec.ts` „Selection-Sync" — **Pflichttest** | RED |
| 12 (Grenzfälle 1-18) | Unit + E2E | Abschnitt 3.2 unten | überwiegend RED, siehe dort |
| 13 (Rundreise DOCX+ODT, Editor-erzeugt, 4.1.1-4.1.8) | Unit | Abschnitt 4.3/4.4/4.5 | RED |
| 14 (Import+Löschen+Rundreise je reale Fixture, 4.2) | Unit + E2E | Abschnitt 4.6 (alle Dateien) + `table-delete.spec.ts` „Fixture-Teilmenge" | RED |
| 15/16 (unabhängige Parser-Validierung DOCX/ODT) | Unit | Abschnitt 4.3/4.4 — `JSZip`/roher-XML-String-Assertions direkt auf `word/document.xml` bzw. `content.xml`, nicht nur über den eigenen Reader | RED |
| 17 (Kernverhalten auf allen drei Projekten) | E2E | Abschnitt 5.2 läuft ohne Projekt-Einschränkung auf allen drei | RED |

### 3.2 Grenzfälle (`tabelle-loeschen-req.md` Abschnitt 3) → Testort

| # | Kurzfassung | Testort | Erwartung heute |
|---|---|---|---|
| 1 | Tabelle = einziges Dokumentelement | `tableCommands.test.ts`, `table-delete.spec.ts` „Grenzfall 1" | RED |
| 2 | 1×1-Tabelle | `tableCommands.test.ts` | RED |
| 3 | Sehr große Tabelle, Performance | `tableCommands.test.ts` (synthetisch), `table-delete.spec.ts` „BigTable.odt" | RED |
| 4 | Tabelle am Dokumentanfang | `tableCommands.test.ts`, `table-delete.spec.ts` „Grenzfall 4/5" | RED |
| 5 | Tabelle am Dokumentende | `tableCommands.test.ts`, `table-delete.spec.ts` „Grenzfall 4/5" | RED |
| 6 | Zwei aufeinanderfolgende Tabellen | `tableCommands.test.ts`, `table-delete.spec.ts` „Grenzfall 6" | RED |
| 7 | Verschachtelte Tabelle, beide Richtungen | `tableCommands.test.ts`, `table-delete.spec.ts` „verschachtelt", Fixtures `subTables*.odt` (4.6) | RED |
| 8 | Bereits gemergte/gelöschte Spalten (Fremddatei) | Fixtures `table-column-delete-with-merge*.odt` (4.6) | RED |
| 9 | Selection-Sync-Regressionsmuster | `table-delete.spec.ts` „Selection-Sync" (**Pflicht**) | RED |
| 10 | Löschen unmittelbar nach Einfügen | `tableCommands.test.ts`, `table-delete.spec.ts` „Grenzfall 10" | RED |
| 11 | Mehrfaches Undo/Redo | `tableCommands.test.ts`, `table-delete.spec.ts` „Undo/Redo" | RED |
| 12 | Mehrere Absätze/gemischte Formatierung in Zelle | `tableCommands.test.ts` | RED |
| 13 | Klick außerhalb (Bild/Fremdauswahl) | `tableCommands.test.ts` (`canDeleteTable`), `table-delete.spec.ts` „Grenzfall 13" | RED |
| 14 | Ganze Tabelle als NodeSelection | `tableCommands.test.ts`, `table-delete.spec.ts` „boundary-Backspace" | RED |
| 15 | Bild in Zelle löschen, exportieren | Abschnitt 4.3/4.4, `table-delete.spec.ts` „Export/Download" | RED |
| 16 | Rundreise mit Format-Wechsel (Cross-Format) | `tableDelete.crossFormat.test.ts` | RED |
| 17 | Reale Fremddatei: Rundreise ohne Löschen unbeeinträchtigt | Abschnitt 4.6, Schritt (a) jeder Fixture (`readOdt`/`readDocx`-Import bereits heute GREEN) | **Import-Teil GREEN**, Lösch-Teil RED |
| 18 | Mobile/Touch | Abschnitt 5.2 läuft auf allen drei Projekten inkl. Mobile/Tablet | RED |

---

## 4. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX **und** ODT)

### 4.1 Bestandsaufnahme

Vorhanden: `src/formats/docx/__tests__/roundtrip.test.ts` (`describe('DOCX round trip: tables', ...)`,
**Z. 229**) und `src/formats/odt/__tests__/roundtrip.test.ts`
(`describe('ODT round trip: tables', ...)`, **Z. 219**) — beide prüfen ausschließlich das **Anlegen**
von Tabellen (2×2, `colspan`-Merge, `rowspan`-Merge über zwei Zeilen, inkl. der grünen
`covered-table-cell`-Tests bei `odt/...roundtrip.test.ts:275`/`:310`). **Keiner** ruft ein
Lösch-Kommando auf oder prüft den Zustand **nach** einer Löschung. Fehlt vollständig: jeder Test der
eigentlichen Editor-Transformation (`tableCommands.test.ts` existiert nicht), jede Rundreise für den
Zustand „Tabelle gelöscht", jede Fixture-getriebene Prüfung.

### 4.2 Neu: `src/formats/shared/editor/__tests__/tableCommands.test.ts`

Reine Logik-Tests ohne Browser/DOM — konstruiert `EditorState` direkt aus `wordSchema` und prüft
`deleteTable`/`canDeleteTable` isoliert gegen jeden in Anforderungsabschnitt 2/3 beschriebenen Fall.
Positionen werden über einen robusten Text-Such-Helfer ermittelt (nicht über hartkodierte
`nodeSize`-Arithmetik):

```ts
import { EditorState, TextSelection, NodeSelection } from 'prosemirror-state'
import { undo, redo, history } from 'prosemirror-history'
import type { Node as PMNode } from 'prosemirror-model'
import { wordSchema } from '../../schema'
import { deleteTable, canDeleteTable } from '../commands'

function doc(...children: PMNode[]) {
  return wordSchema.nodes.doc.create(null, children)
}
function para(text?: string) {
  return wordSchema.nodes.paragraph.create({ align: 'left' }, text ? wordSchema.text(text) : undefined)
}
function cell(...children: PMNode[]) {
  return wordSchema.nodes.table_cell.create({ colspan: 1, rowspan: 1, colwidth: null }, children)
}
function row(...cells: PMNode[]) {
  return wordSchema.nodes.table_row.create(null, cells)
}
function table(...rows: PMNode[]) {
  return wordSchema.nodes.table.create(null, rows)
}
function image() {
  return wordSchema.nodes.image.create({ src: 'data:image/png;base64,x', alt: '' })
}

function stateFor(node: ReturnType<typeof doc>, plugins: any[] = [history()]) {
  return EditorState.create({ doc: node, schema: wordSchema, plugins })
}

function findTextPos(root: PMNode, text: string): number {
  let found = -1
  root.descendants((node, pos) => {
    if (found !== -1) return false
    if (node.isText && node.text === text) {
      found = pos
      return false
    }
    return true
  })
  if (found === -1) throw new Error(`findTextPos: "${text}" nicht im Dokument gefunden`)
  return found
}

function cursorIn(state: EditorState, text: string): EditorState {
  const pos = findTextPos(state.doc, text) + 1
  return state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(pos))))
}

function applyDeleteTable(state: EditorState): { result: EditorState; ran: boolean } {
  let result = state
  const ran = deleteTable()(state, (tr) => {
    result = state.apply(tr)
  })
  return { result, ran }
}

function countDescendantTables(d: PMNode): number {
  let count = 0
  d.descendants((node) => {
    if (node.type.name === 'table') count++
  })
  return count
}

describe('deleteTable (Anforderung 2.1 -- Grundverhalten, erwartet RED bis tabelle-loeschen-code.md 4.1 umgesetzt ist)', () => {
  it('cursor in any cell removes the whole table, not just the current row/cell', () => {
    let state = stateFor(doc(table(row(cell(para('A1')), cell(para('B1'))), row(cell(para('A2')), cell(para('B2'))))))
    state = cursorIn(state, 'B1')
    const { result, ran } = applyDeleteTable(state)
    expect(ran).toBe(true)
    expect(result.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
    expect(result.doc.textContent).toBe('')
  })

  it('surrounding paragraphs before and after the table survive untouched (2.1)', () => {
    let state = stateFor(doc(para('Davor'), table(row(cell(para('A1')))), para('Danach')))
    state = cursorIn(state, 'A1')
    const { result } = applyDeleteTable(state)
    expect(result.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph', 'paragraph'])
    expect(result.doc.textContent).toBe('DavorDanach')
  })

  it('a CellSelection over multiple cells removes the whole table, not only the marked cells (2.1)', () => {
    // Import lazily to keep the top-of-file import list focused on the product API.
    const { CellSelection } = require('prosemirror-tables')
    let state = stateFor(doc(table(row(cell(para('A1')), cell(para('B1'))), row(cell(para('A2')), cell(para('B2'))))))
    const aPos = findTextPos(state.doc, 'A1')
    const bPos = findTextPos(state.doc, 'B2')
    const sel = CellSelection.create(state.doc, state.doc.resolve(aPos).before(-1), state.doc.resolve(bPos).before(-1))
    state = state.apply(state.tr.setSelection(sel))
    const { result, ran } = applyDeleteTable(state)
    expect(ran).toBe(true)
    expect(countDescendantTables(result.doc)).toBe(0)
  })

  it('table is the sole document element -> exactly one empty paragraph remains, doc stays valid (Grenzfall 1)', () => {
    let state = stateFor(doc(table(row(cell(para('Einzig'))))))
    state = cursorIn(state, 'Einzig')
    const { result } = applyDeleteTable(state)
    expect(result.doc.content.content).toHaveLength(1)
    expect(result.doc.content.content[0].type.name).toBe('paragraph')
    expect(result.doc.content.content[0].content.size).toBe(0)
  })

  it('1x1 table deletes identically to larger tables (Grenzfall 2)', () => {
    let state = stateFor(doc(table(row(cell(para('Solo'))))))
    state = cursorIn(state, 'Solo')
    const { result, ran } = applyDeleteTable(state)
    expect(ran).toBe(true)
    expect(result.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
  })

  it('table at document start, cursor lands at the start of the following paragraph (Grenzfall 4)', () => {
    let state = stateFor(doc(table(row(cell(para('X')))), para('Danach')))
    state = cursorIn(state, 'X')
    const { result } = applyDeleteTable(state)
    expect(result.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
    expect(result.doc.textContent).toBe('Danach')
    expect(result.selection.empty).toBe(true)
    expect(result.selection.from).toBe(1)
  })

  it('table at document end, cursor lands at the end of the preceding paragraph (Grenzfall 5)', () => {
    let state = stateFor(doc(para('Davor'), table(row(cell(para('X'))))))
    state = cursorIn(state, 'X')
    const { result } = applyDeleteTable(state)
    expect(result.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
    expect(result.doc.textContent).toBe('Davor')
    expect(result.selection.empty).toBe(true)
  })

  it('two consecutive tables without a separating paragraph: deleting the first leaves the second fully intact (Grenzfall 6)', () => {
    let state = stateFor(doc(table(row(cell(para('T1A')))), table(row(cell(para('T2A'))))))
    state = cursorIn(state, 'T1A')
    const { result } = applyDeleteTable(state)
    const remaining = result.doc.content.content.find((n) => n.type.name === 'table')
    expect(remaining).toBeTruthy()
    expect(remaining!.textContent).toBe('T2A')
  })

  it('nested table: cursor in the inner table removes ONLY the inner table (2.6/Grenzfall 7)', () => {
    const inner = table(row(cell(para('inner-a')), cell(para('inner-b'))))
    let state = stateFor(
      doc(table(row(cell(para('outer-a1'), inner), cell(para('outer-b1'))), row(cell(para('outer-a2')), cell(para('outer-b2'))))),
    )
    state = cursorIn(state, 'inner-a')
    const { result } = applyDeleteTable(state)
    const outer = result.doc.content.content[0]
    expect(outer.type.name).toBe('table')
    expect(outer.textContent).toBe('outer-a1outer-b1outer-a2outer-b2')
    expect(countDescendantTables(result.doc)).toBe(1)
  })

  it('nested table: cursor in an outer cell outside the inner table removes the ENTIRE outer table, inner included (2.6/Grenzfall 7)', () => {
    const inner = table(row(cell(para('inner-a'))))
    let state = stateFor(doc(table(row(cell(para('outer-a1'), inner), cell(para('outer-b1'))))))
    state = cursorIn(state, 'outer-b1')
    const { result } = applyDeleteTable(state)
    expect(result.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
    expect(countDescendantTables(result.doc)).toBe(0)
  })

  it('a colspan/rowspan-merged table deletes fully with no special handling required (2.7)', () => {
    const bigCell = wordSchema.nodes.table_cell.create({ colspan: 2, rowspan: 1, colwidth: null }, para('Merged'))
    let state = stateFor(doc(table(row(bigCell))))
    state = cursorIn(state, 'Merged')
    const { result, ran } = applyDeleteTable(state)
    expect(ran).toBe(true)
    expect(result.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
  })

  it('cell content with multiple paragraphs and mixed formatting disappears entirely (Grenzfall 12)', () => {
    const boldText = wordSchema.text('fett', [wordSchema.marks.strong.create()])
    const p1 = wordSchema.nodes.paragraph.create({ align: 'left' }, boldText)
    const p2 = wordSchema.nodes.paragraph.create({ align: 'center' }, wordSchema.text('kursiv-Absatz'))
    let state = stateFor(doc(table(row(cell(p1, p2)))))
    state = cursorIn(state, 'fett')
    const { result } = applyDeleteTable(state)
    expect(result.doc.textContent).toBe('')
    expect(result.doc.content.content).toHaveLength(1)
  })

  it('deleting immediately after insertTable() (no dispatch in between) works identically (Grenzfall 10)', async () => {
    const { insertTable } = await import('../commands')
    let state = stateFor(doc(para('x')))
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, 2)))
    let afterInsert = state
    insertTable(2, 2)(state, (tr) => {
      afterInsert = state.apply(tr)
    })
    // insertTable produces empty cells; put the cursor into the first cell by position.
    const firstCellInnerPos = afterInsert.doc.content.firstChild!.type.name === 'table' ? 3 : 1
    const withCursor = afterInsert.apply(
      afterInsert.tr.setSelection(TextSelection.near(afterInsert.doc.resolve(firstCellInnerPos))),
    )
    const { ran } = applyDeleteTable(withCursor)
    expect(ran).toBe(true)
  })

  it('a NodeSelection directly on the table node (post boundary-Backspace state) is still deleted -- regression guard for the prosemirror-tables fallthrough (2.3/2.9)', () => {
    let state = stateFor(doc(table(row(cell(para('X')))), para('Danach')))
    state = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, 0)))
    expect(state.selection).toBeInstanceOf(NodeSelection)
    const { result, ran } = applyDeleteTable(state)
    expect(ran).toBe(true)
    expect(result.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
  })

  it('large table (12 cols x 25 rows) deletes without throwing, leaving exactly one paragraph (Grenzfall 3, functional half of the performance requirement)', () => {
    const rows = Array.from({ length: 25 }, (_, r) =>
      row(...Array.from({ length: 12 }, (_, c) => cell(para(`R${r}C${c}`)))),
    )
    let state = stateFor(doc(table(...rows)))
    state = cursorIn(state, 'R12C6')
    const start = performance.now()
    const { result, ran } = applyDeleteTable(state)
    const elapsedMs = performance.now() - start
    expect(ran).toBe(true)
    expect(result.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
    expect(elapsedMs).toBeLessThan(500) // generous bound; real perf confirmed against BigTable.odt via E2E
  })
})

describe('canDeleteTable (Anforderung Abschnitt 1, Grenzfall 13 -- erwartet RED bis 4.1 umgesetzt ist)', () => {
  it('is false outside any table', () => {
    const state = stateFor(doc(para('normal')))
    expect(canDeleteTable(state)).toBe(false)
  })

  it('is true with the cursor in a cell', () => {
    let state = stateFor(doc(table(row(cell(para('x'))))))
    state = cursorIn(state, 'x')
    expect(canDeleteTable(state)).toBe(true)
  })

  it('is true for a NodeSelection directly on the table (post boundary-Backspace state)', () => {
    let state = stateFor(doc(table(row(cell(para('x')))), para('y')))
    state = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, 0)))
    expect(canDeleteTable(state)).toBe(true)
  })

  it('is false with a NodeSelection on an image directly before a table -- must NOT delete the nearby table (Grenzfall 13)', () => {
    let state = stateFor(doc(image(), table(row(cell(para('x'))))))
    state = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, 0)))
    expect(state.selection).toBeInstanceOf(NodeSelection)
    expect(canDeleteTable(state)).toBe(false)
    // Defense in depth: even if canDeleteTable were wrongly true, a click must not mutate the doc.
    const before = state.doc.toJSON()
    deleteTable()(state, () => {
      throw new Error('must not dispatch when the selection is on an unrelated image')
    })
    expect(state.doc.toJSON()).toEqual(before)
  })
})

describe('Undo/Redo of deleteTable (2.5, Grenzfall 11 -- mehrere Zyklen, erwartet RED bis 4.1 umgesetzt ist)', () => {
  it('restores the exact table (rows, cells, formatting) across 3 delete/undo/redo cycles', () => {
    const boldText = wordSchema.text('Zelle', [wordSchema.marks.strong.create()])
    const original = doc(table(row(cell(wordSchema.nodes.paragraph.create({ align: 'left' }, boldText)), cell(para('B1')))))
    let state = stateFor(original)
    const originalJson = state.doc.toJSON()

    for (let cycle = 0; cycle < 3; cycle++) {
      state = cursorIn(state, 'Zelle')
      const { result, ran } = applyDeleteTable(state)
      expect(ran).toBe(true)
      state = result
      expect(state.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])

      let undone = state
      const undoRan = undo(state, (tr) => {
        undone = state.apply(tr)
      })
      expect(undoRan).toBe(true)
      expect(undone.doc.toJSON()).toEqual(originalJson)
      state = undone
    }
  })

  it('redo removes the table again after undo', () => {
    let state = stateFor(doc(table(row(cell(para('X'))))))
    state = cursorIn(state, 'X')
    const { result } = applyDeleteTable(state)
    state = result
    let undone = state
    undo(state, (tr) => {
      undone = state.apply(tr)
    })
    state = undone
    let redone = state
    const redoRan = redo(state, (tr) => {
      redone = state.apply(tr)
    })
    expect(redoRan).toBe(true)
    expect(redone.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
  })
})
```

**Erwartung heute:** Jeder Test importiert `deleteTable`/`canDeleteTable` aus `../commands` — beide
Namen existieren im heutigen Code nicht (Abschnitt 1 Punkt 1). Jeder `describe`-Block schlägt mit
`TypeError: deleteTable is not a function` bzw. `canDeleteTable is not a function` fehl. **GREEN,
sobald `tabelle-loeschen-code.md` Abschnitt 4.1 umgesetzt ist**, ohne Änderung an diesem Testcode.

### 4.3 Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts`

Neuer `describe`-Block nach dem bestehenden `'DOCX round trip: tables'`-Block (**Z. 229**), der
**den echten Befehl** anwendet (nicht nur fertige JSON-Strukturen konstruiert) — Ablauf: `EditorState`
mit Tabelle(n) aufbauen (per `wordSchema.nodeFromJSON`) → `deleteTable()` anwenden →
`state.doc.toJSON()` in `WordDocumentContent.body` → `writeDocx` → `readDocx` → Struktur/Text **sowie
das rohe `word/document.xml`** prüfen (unabhängige Parser-Validierung, req Testfall 15):

```ts
import { EditorState, TextSelection } from 'prosemirror-state'
import { wordSchema } from '../../shared/schema'
import { deleteTable } from '../../shared/editor/commands'
import JSZip from 'jszip'

function deleteFirstTable(bodyJson: unknown): unknown {
  const docNode = wordSchema.nodeFromJSON(bodyJson as any)
  let pos = -1
  docNode.descendants((node, p) => {
    if (pos === -1 && node.type.name === 'table') {
      pos = p + 2 // inside the first cell's first paragraph
      return false
    }
    return pos === -1
  })
  if (pos === -1) throw new Error('no table found in fixture body')
  const state = EditorState.create({ doc: docNode, schema: wordSchema })
  const withCursor = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(pos))))
  let result = withCursor
  const ran = deleteTable()(withCursor, (tr) => {
    result = withCursor.apply(tr)
  })
  if (!ran) throw new Error('deleteTable did not run')
  return result.doc.toJSON()
}

describe('DOCX round trip: tabelle löschen (erwartet RED bis tabelle-loeschen-code.md 4.1 umgesetzt ist)', () => {
  it('simple 2x2 table with a paragraph before/after, deleted immediately -> re-import shows only the two paragraphs, no <w:tbl> left (Rundreise 4.1.1)', async () => {
    const original = doc([
      paragraph('Davor'),
      { type: 'table', content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('A1')] }] }] },
      paragraph('Danach'),
    ])
    const deletedBody = deleteFirstTable(original.body)
    const blob = await writeDocx({ ...original, body: deletedBody as any })
    const zip = await JSZip.loadAsync(blob)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).not.toContain('<w:tbl>')

    const result = await readDocx(blob)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['paragraph', 'paragraph'])
  })

  it('table with text, formatting, image, and a nested list, then deleted -> no orphaned image in word/media/, surrounding text unchanged (Rundreise 4.1.3, Grenzfall 15)', async () => {
    const original = doc([
      paragraph('Davor'),
      {
        type: 'table',
        content: [
          {
            type: 'table_row',
            content: [
              {
                type: 'table_cell',
                attrs: { colspan: 1, rowspan: 1 },
                content: [
                  paragraph('Zelltext', 'left', [{ type: 'strong' }]),
                  { type: 'image', attrs: { src: TINY_PNG, alt: 'x' } },
                  { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Punkt')] }] },
                ],
              },
            ],
          },
        ],
      },
      paragraph('Danach'),
    ])
    const deletedBody = deleteFirstTable(original.body)
    const blob = await writeDocx({ ...original, body: deletedBody as any })
    const zip = await JSZip.loadAsync(blob)
    const mediaFiles = Object.keys(zip.files).filter((name) => name.startsWith('word/media/'))
    expect(mediaFiles).toHaveLength(0)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).not.toContain('Zelltext')
    expect(documentXml).not.toContain('Punkt')

    const result = await readDocx(blob)
    expect((result.body as any).content.map((n: any) => n.type)).toEqual(['paragraph', 'paragraph'])
  })

  it('two tables, only one deleted -> the surviving table is bit-identical (Rundreise 4.1.5)', async () => {
    const survivingTable = { type: 'table', content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Bleibt')] }] }] }
    const original = doc([
      { type: 'table', content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Weg')] }] }] },
      survivingTable,
    ])
    const deletedBody = deleteFirstTable(original.body)
    const result = await roundTrip({ ...original, body: deletedBody as any })
    const tables = (result.body as any).content.filter((n: any) => n.type === 'table')
    expect(tables).toHaveLength(1)
    expect(tables[0].content[0].content[0].content[0].content[0].text).toBe('Bleibt')
  })

  it('nested table: deleting the outer table removes both outer and inner, surrounding content survives (Rundreise 4.1.6)', async () => {
    const original = doc([
      paragraph('Davor'),
      {
        type: 'table',
        content: [
          {
            type: 'table_row',
            content: [
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [
                { type: 'table', content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Innen')] }] }] },
              ] },
            ],
          },
        ],
      },
      paragraph('Danach'),
    ])
    const deletedBody = deleteFirstTable(original.body)
    const result = await roundTrip({ ...original, body: deletedBody as any })
    expect((result.body as any).content.map((n: any) => n.type)).toEqual(['paragraph', 'paragraph'])
    expect((result.body as any).content.map((n: any) => n.content?.[0]?.text)).toEqual(['Davor', 'Danach'])
  })

  it('nested table: deleting ONLY the inner table leaves the outer table with its other cells intact (Rundreise 4.1.7)', async () => {
    const original = doc([
      {
        type: 'table',
        content: [
          {
            type: 'table_row',
            content: [
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [
                { type: 'table', content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Innen')] }] }] },
              ] },
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Andere Zelle')] },
            ],
          },
        ],
      },
    ])
    // Locate the INNER table's cell text, not the first table found.
    const docNode = wordSchema.nodeFromJSON(original.body as any)
    let innerPos = -1
    docNode.descendants((node, p) => {
      if (node.isText && node.text === 'Innen') innerPos = p
    })
    const state = EditorState.create({ doc: docNode, schema: wordSchema })
    const withCursor = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(innerPos))))
    let afterDelete = withCursor
    deleteTable()(withCursor, (tr) => {
      afterDelete = withCursor.apply(tr)
    })
    const result = await roundTrip({ ...original, body: afterDelete.doc.toJSON() as any })
    const outer = (result.body as any).content[0]
    expect(outer.type).toBe('table')
    expect(outer.content[0].content).toHaveLength(2)
    expect(outer.content[0].content[1].content[0].content[0].text).toBe('Andere Zelle')
    expect(outer.content[0].content[0].content.some((n: any) => n.type === 'table')).toBe(false)
  })

  it('minimal document with a table and a footnote-like reference in the surrounding text -> deleting the table, export/reimport does not crash and the reference text survives as-is (code 5 -- known footnote-support limitation, NOT re-tested here)', async () => {
    const original = doc([
      paragraph('Text mit Fußnotenverweis 1'),
      { type: 'table', content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Tabelleninhalt')] }] }] },
    ])
    const deletedBody = deleteFirstTable(original.body)
    const result = await roundTrip({ ...original, body: deletedBody as any })
    expect((result.body as any).content.map((n: any) => n.type)).toEqual(['paragraph'])
    expect((result.body as any).content[0].content[0].text).toBe('Text mit Fußnotenverweis 1')
  })
})
```

### 4.4 Erweiterung: `src/formats/odt/__tests__/roundtrip.test.ts`

Analog 4.3, im bestehenden `describe('ODT round trip: tables', ...)`-Kontext (**Z. 219**),
Testfälle 1-6 wortgleich für ODT (`writeOdt`/`readOdt`), mit Assertions gegen `content.xml` statt
`word/document.xml`. **Korrektur ggü. 1. Fassung:** Bilder liegen unter **`Pictures/`**
(`odt/imageCollector.ts:22`), **nicht** im ZIP-Wurzelverzeichnis. Zusätzlich drei ODT-spezifische
Fälle — inklusive des früher fälschlich als `test.todo`-„Blocker" geführten rowspan-Falls, der
**jetzt ein echter, grün zu erwartender Test** ist (`covered-table-cell` ist implementiert, Abschnitt
1 Punkt 7):

```ts
describe('ODT round trip: tabelle löschen (erwartet RED bis tabelle-loeschen-code.md 4.1 umgesetzt ist)', () => {
  // Testfälle 1-6: identisch zur DOCX-Variante (Abschnitt 4.3), gegen writeOdt/readOdt,
  // mit Assertions gegen content.xml statt word/document.xml und gegen Pictures/ statt word/media/.

  it('image in a cell of a deleted table leaves no leftover picture file under Pictures/ and no orphaned manifest:file-entry (Grenzfall 15, ODT-Teil)', async () => {
    const original = doc([
      { type: 'table', content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'image', attrs: { src: TINY_PNG, alt: 'x' } }] }] }] },
    ])
    const deletedBody = deleteFirstTable(original.body)
    const blob = await writeOdt({ ...original, body: deletedBody as any })
    const zip = await JSZip.loadAsync(blob)
    const pictureFiles = Object.keys(zip.files).filter((name) => name.startsWith('Pictures/'))
    expect(pictureFiles).toHaveLength(0)
    const manifestXml = await zip.file('META-INF/manifest.xml')!.async('text')
    expect(manifestXml.match(/manifest:media-type="image\//g) ?? []).toHaveLength(0)
  })

  it('list in a cell of a deleted table leaves no <text:list> instance, though the static list style defs remain (2.7)', async () => {
    const original = doc([
      { type: 'table', content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Punkt')] }] }] }] }] },
    ])
    const deletedBody = deleteFirstTable(original.body)
    const blob = await writeOdt({ ...original, body: deletedBody as any })
    const zip = await JSZip.loadAsync(blob)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).not.toContain('<text:list')
  })

  it('two tables where the SURVIVING one has a multi-row rowspan cell: the deleted one is gone, the survivor keeps its rowspan intact after reimport (Rundreise 4.1.5 mit Merge -- covered-table-cell ist implementiert)', async () => {
    const survivor = {
      type: 'table',
      content: [
        { type: 'table_row', content: [
          { type: 'table_cell', attrs: { colspan: 1, rowspan: 2 }, content: [paragraph('Hoch')] },
          { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('R1')] },
        ] },
        { type: 'table_row', content: [
          { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('R2')] },
        ] },
      ],
    }
    const original = doc([
      { type: 'table', content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Weg')] }] }] },
      survivor,
    ])
    const deletedBody = deleteFirstTable(original.body)
    const result = await roundTrip({ ...original, body: deletedBody as any })
    const tables = (result.body as any).content.filter((n: any) => n.type === 'table')
    expect(tables).toHaveLength(1)
    // The surviving table keeps its rowspan-2 cell (covered-table-cell round-trips correctly).
    const firstCell = tables[0].content[0].content[0]
    expect(firstCell.attrs.rowspan).toBe(2)
    expect(firstCell.content[0].content[0].text).toBe('Hoch')
  })
})
```

### 4.5 Neu: `src/formats/shared/editor/__tests__/tableDelete.crossFormat.test.ts`

Deckt Rundreise 4.1.8 sowie Grenzfall 16 (Cross-Format nach dem Löschen):

```ts
import { EditorState, TextSelection } from 'prosemirror-state'
import { wordSchema } from '../../schema'
import { deleteTable } from '../commands'
import { writeOdt } from '../../../odt/writer'
import { readOdt } from '../../../odt/reader'
import { writeDocx } from '../../../docx/writer'
import { readDocx } from '../../../docx/reader'
// (import paths adapted to the project's actual module boundaries; reader/writer used identically
// to the existing roundtrip.test.ts files)

function docWithTableDeleted(bodyJson: unknown) {
  const docNode = wordSchema.nodeFromJSON(bodyJson as any)
  let pos = -1
  docNode.descendants((node, p) => {
    if (pos === -1 && node.type.name === 'table') pos = p + 2
    return pos === -1
  })
  const state = EditorState.create({ doc: docNode, schema: wordSchema })
  const withCursor = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(pos))))
  let result = withCursor
  deleteTable()(withCursor, (tr) => {
    result = withCursor.apply(tr)
  })
  return result.doc.toJSON()
}

const base = (tableCellText: string) => ({
  body: {
    type: 'doc',
    content: [
      { type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'Davor' }] },
      { type: 'table', content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: tableCellText }] }] }] }] },
      { type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'Danach' }] },
    ],
  },
  header: null,
  footer: null,
  meta: { title: '' },
})

describe('Cross-Format Rundreise nach Tabelle löschen (Rundreise 4.1.8, Grenzfall 16 -- erwartet RED bis 4.1 umgesetzt ist)', () => {
  it('editor-created table deleted -> ODT export -> reimport -> DOCX export -> reimport: table stays gone, surrounding text survives both conversions', async () => {
    const original = base('Weg')
    const deletedBody = docWithTableDeleted(original.body)
    const asOdt = await writeOdt({ ...original, body: deletedBody as any })
    const afterOdt = await readOdt(asOdt)
    const asDocx = await writeDocx(afterOdt)
    const afterDocx = await readDocx(asDocx)
    expect((afterDocx.body as any).content.map((n: any) => n.type)).toEqual(['paragraph', 'paragraph'])
    expect((afterDocx.body as any).content.map((n: any) => n.content?.[0]?.text)).toEqual(['Davor', 'Danach'])
    expect(JSON.stringify(afterDocx.body)).not.toContain('"table"')
  })

  it('reverse direction: DOCX -> ODT after deletion keeps the table gone and surrounding text intact', async () => {
    const original = base('X')
    const asDocx = await writeDocx(original)
    const imported = await readDocx(asDocx)
    const deletedBody = docWithTableDeleted(imported.body)
    const asOdt = await writeOdt({ ...imported, body: deletedBody as any })
    const afterOdt = await readOdt(asOdt)
    expect((afterOdt.body as any).content.map((n: any) => n.type)).toEqual(['paragraph', 'paragraph'])
    expect((afterOdt.body as any).content.map((n: any) => n.content?.[0]?.text)).toEqual(['Davor', 'Danach'])
  })
})
```

### 4.6 Neu: Fixture-getriebene Tests für **alle** in Abschnitt 4.2 der Anforderung gelisteten Dateien

Zwei neue Dateien, `src/formats/docx/__tests__/tableDelete.fixtures.test.ts` und
`src/formats/odt/__tests__/tableDelete.fixtures.test.ts`, im Lade-Stil des bestehenden
`external-fixtures.test.ts` (`readFileSync` gegen `tests/fixtures/external/{docx,odt}`), je Datei ein
eigenes `it(...)`. Ablauf pro Datei: (1) `readOdt`/`readDocx`, (2) `EditorState` via
`wordSchema.nodeFromJSON`, (3) erste `table`-Node lokalisieren, Cursor per `TextSelection.near` in
deren erste Textposition, (4) **echten** `deleteTable()`-Befehl anwenden, (5) `writeOdt`/`writeDocx`
→ `readOdt`/`readDocx`, (6) Assertions: (a) kein Absturz in 1-5, (b) reimportiertes Dokument enthält
**eine Tabelle weniger** als das Original, (c) der Text außerhalb von Tabellen ist zwischen
Original-Import und Nach-Löschen-Reimport **identisch**.

> **Korrektur ggü. 1. Fassung:** Der frühere `KNOWN_ROWSPAN_EXPORT_BLOCKER`-Ausschluss der
> Text-Assertion für vier Fixtures ist **ersatzlos entfernt** — er stützte sich auf den inzwischen
> widerlegten „ODT emittiert kein covered-table-cell"-Befund (Abschnitt 1 Punkt 7). Assertion (c)
> gilt jetzt für **alle** Fixtures.

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { EditorState, TextSelection } from 'prosemirror-state'
import { wordSchema } from '../../shared/schema'
import { deleteTable } from '../../shared/editor/commands'
import { readOdt } from '../reader'
import { writeOdt } from '../writer'

const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/odt')

function nonTableText(bodyJson: unknown): string {
  const docNode = wordSchema.nodeFromJSON(bodyJson as any)
  let out = ''
  function walk(node: any, insideTable: boolean) {
    if (node.type.name === 'table') { node.forEach((child: any) => walk(child, true)); return }
    if (!insideTable && node.isText) out += node.text
    node.forEach((child: any) => walk(child, insideTable))
  }
  walk(docNode, false)
  return out
}

function countTables(bodyJson: unknown): number {
  const docNode = wordSchema.nodeFromJSON(bodyJson as any)
  let count = 0
  docNode.descendants((node: any) => { if (node.type.name === 'table') count++ })
  return count
}

async function importDeleteFirstTableExportReimport(fixtureName: string) {
  const buffer = readFileSync(join(FIXTURES_DIR, fixtureName))
  const original = await readOdt(new Blob([new Uint8Array(buffer)]))
  const originalTableCount = countTables(original.body)
  const originalNonTableText = nonTableText(original.body)

  const docNode = wordSchema.nodeFromJSON(original.body as any)
  let pos = -1
  docNode.descendants((node, p) => {
    if (pos === -1 && node.type.name === 'table') {
      let firstTextPos = -1
      node.descendants((inner: any, innerPos: number) => { if (firstTextPos === -1 && inner.isText) firstTextPos = innerPos })
      pos = p + 1 + Math.max(firstTextPos, 0)
      return false
    }
    return pos === -1
  })
  const state = EditorState.create({ doc: docNode, schema: wordSchema })
  const withCursor = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(pos))))
  let afterDelete = withCursor
  const ran = deleteTable()(withCursor, (tr) => { afterDelete = withCursor.apply(tr) })

  const blob = await writeOdt({ ...original, body: afterDelete.doc.toJSON() as any })
  const reimported = await readOdt(blob)
  return { ran, originalTableCount, originalNonTableText, reimported }
}

// Exact fixture list from tabelle-loeschen-req.md Abschnitt 4.2, verified to exist via `ls`
// before writing this file (see Abschnitt 6 of this plan).
const ODT_FIXTURES = [
  'BigTable.odt', 'crazyTable.odt',
  'subTables.odt', 'subTables2.odt', 'subTables3-nested.odt', 'subTables3-onlyOneColumn.odt',
  'subTables4.odt', 'table-within-textBox-within-frame.odt',
  'table-column-delete-with-merge.odt', 'table-column-delete-with-merge-2-times.odt',
  'tableRowDeletionTest.odt', 'tableOps.odt', 'tableCoveredContent.odt',
  'OOStyledTable.odt', 'coloredTable_MSO15.odt', 'TableFunkyBackground.odt',
  'feature_attributes_tables.odt', 'feature_attributes_tables-backgroundTableOnly.odt',
  'feature_attributes_tables-backgroundTableOnly-AO341.odt',
  'feature_attributes_tables_FunnyTable_With_xmlid.odt', 'feature_attributes_tables_SMALL.odt',
  'table_1x3_paragraph_background-MSO2013-LO3_6.odt',
  'TableWidth.odt', 'tableNotFullWidth.odt',
  'simple-table.odt', 'simpleTable.odt', 'simple_table.odt', 'simple-table-with-lists.odt',
  'listsInTable.odt', 'table.odt', 'table_simple.odt', 'TestTextTable.odt',
  'doc_heading_table.odt', 'empty4table.odt',
]

describe('ODT: Tabelle löschen gegen reale Fixture-Dateien (req 4.2 Testfall 14 -- jede Datei ein eigener Test, erwartet RED bis 4.1 umgesetzt ist)', () => {
  for (const fixtureName of ODT_FIXTURES) {
    it(`imports, deletes the contained table via the real command, exports and reimports "${fixtureName}" with the table gone and surrounding text intact`, async () => {
      const { ran, originalTableCount, originalNonTableText, reimported } = await importDeleteFirstTableExportReimport(fixtureName)
      expect(ran).toBe(true)
      expect(countTables(reimported.body)).toBe(originalTableCount - 1)
      expect(nonTableText(reimported.body)).toBe(originalNonTableText)
    }, 20_000)
  }
})
```

DOCX-Pendant (`src/formats/docx/__tests__/tableDelete.fixtures.test.ts`) analog gegen
`readDocx`/`writeDocx`, mit folgender Dateiliste:

```ts
const DOCX_FIXTURES = [
  'TestTableCellAlign.docx', 'TestTableColumns.docx', 'deep-table-cell.docx',
  'table-alignment.docx', 'table-indent.docx', 'table_footnotes.docx',
]
```

Für `deep-table-cell.docx`: der Reader-Schutz `MAX_TABLE_NESTING_DEPTH = 25` (`docx/reader.ts:309`)
bedeutet, dass „die erste gefundene Tabelle" ggf. bereits auf einer oberen Verschachtelungsebene
landet — für diesen Testzweck ausreichend (Absturzfreiheit über den vollen Zyklus, nicht
Vollständigkeit jeder Ebene, Abschnitt 1 Punkt 9). Für `table_footnotes.docx`: Assertion (c) prüft
nur Textgleichheit außerhalb von Tabellen; eine Fußnotenverwaltung existiert im Reader nicht
(Abschnitt 1 Punkt 10) und wird **nicht** simuliert.

### 4.7 Erwartete Ergebnisse heute (vor Umsetzung von `tabelle-loeschen-code.md`)

| Testdatei | Erwartung heute | Grund |
|---|---|---|
| `tableCommands.test.ts` (alle Blöcke) | **RED** (`TypeError: deleteTable/canDeleteTable is not a function`) | Abschnitt 1 Punkt 1 |
| `docx/__tests__/roundtrip.test.ts` — neuer Block „tabelle löschen" | **RED** (importiert `deleteTable`) | dito |
| `odt/__tests__/roundtrip.test.ts` — neuer Block „tabelle löschen" | **RED** | dito |
| `tableDelete.crossFormat.test.ts` | **RED** | dito |
| `docx/__tests__/tableDelete.fixtures.test.ts` (6 Fixtures) | **RED** (`readDocx` selbst wäre GREEN, aber `deleteTable()` bricht vorher ab) | dito |
| `odt/__tests__/tableDelete.fixtures.test.ts` (34 Fixtures) | **RED** | dito |

Nach Umsetzung von `tabelle-loeschen-code.md` Abschnitt 4.1 müssen **alle** Tests in Abschnitt 4 ohne
Änderung an diesem Testcode grün werden — **ohne** verbleibenden `test.todo` (der frühere
ODT-`covered-table-cell`-Vorbehalt ist gegenstandslos, Abschnitt 1 Punkt 7).

---

## 5. Teil B — Echte Playwright-Browser-Tests

### 5.1 Prinzipien für „echte" E2E-Tests + Determinismus

Nicht zulässig für diese Ebene: `readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`deleteTable` direkt
aufrufen, ProseMirror-`EditorState`/`Command`s direkt konstruieren, oder Assertions ausschließlich auf
dem internen Dokumentmodell statt auf dem gerenderten DOM / der heruntergeladenen Datei. Verbindlich:

1. **Klicks** über `getByTitle(...)`/`getByRole(...)`/Zell-Locators (`page.locator('.ProseMirror td')`),
   nie `page.evaluate(() => command(...))` als Ersatz für einen Klick.
2. **Tippen** über `page.keyboard.type(...)`/`press(...)`, nie direktes Setzen von `textContent`.
3. **Datei-Upload** über `input.setInputFiles({ name, mimeType, buffer })` auf den echten
   `<input type="file">` der jeweiligen Karte (`odtCard(page).locator('input[type="file"]')` bzw.
   `docxCard(page)`) — etabliertes Muster aus `odt.spec.ts:81`/`docx.spec.ts`.
4. **Export/Download** über `page.waitForEvent('download')`, gefolgt von `download.path()` und echtem
   `fs.readFile` + `JSZip.loadAsync` auf die **tatsächlich vom Browser geschriebene Datei** —
   Assertions laufen gegen den rohen XML-String, **nicht** gegen den Rückgabewert eines erneuten
   `readDocx`/`readOdt`.
5. **Locator für den neuen Button:** `getByTitle('Tabelle löschen')` **oder**
   `getByRole('button', { name: 'Tabelle löschen' })` — beide sind zuverlässig, sofern
   `tabelle-loeschen-code.md` Abschnitt 4.3 wie geplant **sowohl** `title` **als auch** `aria-label`
   setzt. Nie am Nachbar-Button „Tabelle einfügen" verankern.

**Determinismus (Selektions-Sync — Pflicht, sonst Flakiness):** Der Editor lernt einen nativen,
tastatur- oder klickgetriebenen Cursorwechsel teils erst über das **asynchrone**
`selectionchange`-Event (siehe `WordEditor.tsx` `reconcileSelectionOnClick` und den ausführlichen
Kommentar in `selection-regression.spec.ts:26-34`). Ohne menschliche Reaktionspause kann eine
sofort folgende Playwright-Aktion die noch nicht eingespielte Selektion „überholen". Regeln für **alle**
Tests hier:

- **Nach einem Klick in eine Zelle, bevor der Lösch-Button geklickt wird:** deterministisch auf den
  daraus folgenden Button-Zustand warten — `await expect(page.getByTitle('Tabelle löschen')).toBeEnabled()`.
  Das ist ein Web-First-Assert, der garantiert, dass `canDeleteTable(view.state)` die neue Selektion
  bereits sieht (kein willkürliches Sleep).
- **Nach einem tastaturgetriebenen Cursorwechsel** (`End`, `Home`, `ControlOrMeta+End`), bevor eine
  davon abhängige Folge-Taste gedrückt wird: `await page.waitForTimeout(50)` — exakt das im Repo
  bereits etablierte Muster (`selection-regression.spec.ts:34/72/103`), mit gleicher Begründung.
- **Nie** `press()`/`type()` unmittelbar an einen repositionierenden Klick/Cursorwechsel anketten,
  ohne einen der beiden obigen Wartepunkte.

**Bild-`<input>`-Locator (Korrektur ggü. 1. Fassung):** Der Bild-Upload-`<input accept="image/*">`
liegt in der **Toolbar** (`Toolbar.tsx:293`), **nicht** innerhalb von `.ProseMirror`. Locator daher
**seitenbezogen**: `page.locator('input[type="file"][accept="image/*"]')` — nicht `editor.locator(...)`.

### 5.2 Neu: `tests/e2e/table-delete.spec.ts`

Nutzt die Projekt-Fixture `tests/e2e/fixtures.ts` (`test` dismisst die Datenschutz-Overlay
automatisch und navigiert auf `/`; sammelt zusätzlich `pageerror`/console-errors → „kein Absturz"
wird kostenlos mitgeprüft). Läuft ohne Projekt-Einschränkung auf **allen drei**
`playwright.config.ts`-Projekten (Desktop Chrome, Mobile/Pixel 7, Tablet/iPad Mini) — erfüllt
req Testfall 17/Grenzfall 18.

```ts
import { test, expect, odtCard, docxCard } from './fixtures'
import JSZip from 'jszip'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

async function uploadFixture(card: ReturnType<typeof odtCard>, relativePath: string, mimeType: string) {
  const buffer = await readFile(join(__dirname, 'fixtures', 'external', relativePath))
  await card.locator('input[type="file"]').setInputFiles({ name: relativePath.split('/').pop()!, mimeType, buffer })
}

const del = (page: import('@playwright/test').Page) => page.getByTitle('Tabelle löschen')

test.describe('Tabelle löschen — Grundverhalten & Toolbar (Testfälle 1/2/3, Grenzfälle 1/4/5/6/10)', () => {
  test.beforeEach(async ({ page }) => {
    // fixtures.ts already dismissed the banner and navigated to '/'.
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Testfall 1: Button disabled außerhalb einer Tabelle, aktiv sobald der Cursor in einer Zelle steht', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('normaler Absatz')
    await expect(del(page)).toBeDisabled()

    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').first().click()
    await expect(del(page)).toBeEnabled() // deterministic proof the selection synced into the table
  })

  test('Testfall 2: Klick entfernt die komplette Tabelle inkl. Inhalt, egal in welcher Zelle der Cursor stand', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').nth(2).click() // not cell 0 -- proves the whole table is targeted
    await page.keyboard.type('Inhalt')
    await expect(del(page)).toBeEnabled()
    await del(page).click()
    await expect(editor.locator('table')).toHaveCount(0)
    await expect(editor).not.toContainText('Inhalt')
  })

  test('Testfall 3 / Abschnitt 2.2: Entf auf markiertem Zellinhalt leert nur den Inhalt, Struktur bleibt (GREEN bereits heute)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').first().click()
    await page.keyboard.type('Text')
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('Delete')
    await expect(editor.locator('table')).toHaveCount(1)
    await expect(editor.locator('td')).toHaveCount(4)
    await expect(editor).not.toContainText('Text')
  })

  test('Grenzfall 10: Löschen unmittelbar nach dem Einfügen (kein Klick dazwischen)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await expect(del(page)).toBeEnabled()
    await del(page).click()
    await expect(editor.locator('table')).toHaveCount(0)
    await page.keyboard.type('geht weiter')
    await expect(editor).toContainText('geht weiter')
  })

  test('Grenzfall 1: Tabelle als einziges Dokumentelement löschen -> Editor sofort bedienbar', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').first().click()
    await expect(del(page)).toBeEnabled()
    await del(page).click()
    await expect(editor.locator('table')).toHaveCount(0)
    await editor.click()
    await page.keyboard.type('weiter tippen ohne Absturz')
    await expect(editor).toContainText('weiter tippen ohne Absturz')
  })

  test('Grenzfall 4/5: Tabelle am Dokumentanfang mit Folgeabsatz — Cursor landet deterministisch im Nachbarabsatz', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click() // table at doc start
    await page.keyboard.press('ControlOrMeta+End')
    await page.waitForTimeout(50) // keyboard caret move -> let selectionchange land before typing
    await page.keyboard.type('Danach')
    await page.locator('.ProseMirror td').first().click()
    await expect(del(page)).toBeEnabled()
    await del(page).click()
    await expect(editor.locator('table')).toHaveCount(0)
    await page.keyboard.type('X')
    await expect(editor).toContainText('XDanach')
  })

  test('Grenzfall 6: Zwei aufeinanderfolgende Tabellen — nur die per Cursor ausgewählte verschwindet', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').last().click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await expect(editor.locator('table')).toHaveCount(2)
    await editor.locator('table').first().locator('td').first().click()
    await page.keyboard.type('T1')
    await editor.locator('table').nth(1).locator('td').first().click()
    await page.keyboard.type('T2')
    await editor.locator('table').first().locator('td').first().click()
    await expect(del(page)).toBeEnabled()
    await del(page).click()
    await expect(editor.locator('table')).toHaveCount(1)
    await expect(editor).toContainText('T2')
    await expect(editor).not.toContainText('T1')
  })
})

test.describe('Tabelle löschen — Pflicht-Regressionstest Selection-Sync (Testfall 11/Grenzfall 9)', () => {
  test.beforeEach(async ({ page }) => {
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('type in one cell, click into a DIFFERENT cell, immediately delete -> table fully removed, no crash, no wrong target', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    const cells = page.locator('.ProseMirror td')
    await cells.nth(0).click()
    await page.keyboard.type('Zelle eins')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Fett').click()
    await cells.nth(1).click() // reposition into a DIFFERENT cell -- exact regression pattern
    await expect(del(page)).toBeEnabled() // wait for the async selection sync to land before deleting
    await del(page).click()
    await expect(editor.locator('table')).toHaveCount(0)
    await expect(editor).not.toContainText('Zelle eins')
  })
})

test.describe('Tabelle löschen — verschachtelte Tabellen (Testfall 9/Grenzfall 7)', () => {
  test.beforeEach(async ({ page }) => {
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('cursor in the inner table removes only the inner table; the outer table remains', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await editor.locator('table').first().locator('td').first().click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click() // nested table inside the first cell
    await expect(editor.locator('table')).toHaveCount(2)
    await editor.locator('table').nth(1).locator('td').first().click()
    await expect(del(page)).toBeEnabled()
    await del(page).click()
    await expect(editor.locator('table')).toHaveCount(1)
  })

  test('cursor in an outer cell outside the inner table removes the entire outer table, inner included', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    const outerCells = editor.locator('table').first().locator('td')
    await outerCells.first().click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await outerCells.nth(1).click() // a cell of the OUTER table, not inside the inner one
    await expect(del(page)).toBeEnabled()
    await del(page).click()
    await expect(editor.locator('table')).toHaveCount(0)
  })
})

test.describe('Tabelle löschen — Undo/Redo, Tastaturweg & Grenzfälle (Testfälle 6/8, Grenzfälle 11/13/14)', () => {
  test.beforeEach(async ({ page }) => {
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Strg+Z restores the exact table, Strg+Y removes it again, 3 cycles', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').first().click()
    await page.keyboard.type('Ursprung')
    await page.locator('.ProseMirror td').first().click()
    await expect(del(page)).toBeEnabled()

    for (let cycle = 0; cycle < 3; cycle++) {
      await del(page).click()
      await expect(editor.locator('table')).toHaveCount(0)
      await page.keyboard.press('ControlOrMeta+z')
      await expect(editor.locator('table')).toHaveCount(1)
      await expect(editor).toContainText('Ursprung')
      await editor.locator('table').first().locator('td').first().click()
      await expect(del(page)).toBeEnabled()
    }
    await del(page).click()
    await expect(editor.locator('table')).toHaveCount(0)
    await page.keyboard.press('ControlOrMeta+y')
    await expect(editor.locator('table')).toHaveCount(1)
  })

  test('Testfall 6 / Mod-Alt-Backspace mit Cursor irgendwo in der Tabelle == Button-Klick', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').nth(2).click()
    await expect(del(page)).toBeEnabled()
    await page.keyboard.press('ControlOrMeta+Alt+Backspace')
    await expect(editor.locator('table')).toHaveCount(0)
  })

  test('Grenzfall 14 (bereits heute GREEN): documented boundary-Backspace — two Backspaces right after a table select then remove it', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.keyboard.press('ControlOrMeta+End')
    await page.waitForTimeout(50)
    await page.keyboard.press('Enter')
    await page.keyboard.type('nach der Tabelle')
    await page.keyboard.press('Home')
    await page.waitForTimeout(50) // keyboard caret move -> let selectionchange land before Backspace
    await page.keyboard.press('Backspace') // first press: selects the whole table as a NodeSelection
    await page.keyboard.press('Backspace') // second press: removes it
    await expect(editor.locator('table')).toHaveCount(0)
    await expect(editor).toContainText('nach der Tabelle')
  })

  test('Grenzfall 13: cursor on an image directly before a table keeps the button disabled; a forced click is a no-op', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
      name: 'tiny.png', mimeType: 'image/png', buffer: Buffer.from(TINY_PNG, 'base64'),
    })
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await editor.locator('img').click() // select the image node, NOT a table cell
    await expect(del(page)).toBeDisabled()
    const tableCountBefore = await editor.locator('table').count()
    await del(page).click({ force: true })
    await expect(editor.locator('table')).toHaveCount(tableCountBefore)
  })
})

test.describe('Tabelle löschen — Export/Download der echten Datei (Testfälle 10/14/15)', () => {
  test('DOCX: delete a table with an image in a cell, export via real download -> no table, no orphaned image in word/media/', async ({ page }) => {
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').first().click()
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
      name: 'tiny.png', mimeType: 'image/png', buffer: Buffer.from(TINY_PNG, 'base64'),
    })
    await page.locator('.ProseMirror td').first().click()
    await expect(del(page)).toBeEnabled()
    await del(page).click()
    await expect(editor.locator('table')).toHaveCount(0)

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const zip = await JSZip.loadAsync(await readFile((await download.path())!))
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).not.toContain('<w:tbl>')
    expect(Object.keys(zip.files).filter((n) => n.startsWith('word/media/'))).toHaveLength(0)
  })

  test('ODT: same scenario over a real download -> no table XML, no leftover file under Pictures/', async ({ page }) => {
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').first().click()
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
      name: 'tiny.png', mimeType: 'image/png', buffer: Buffer.from(TINY_PNG, 'base64'),
    })
    await page.locator('.ProseMirror td').first().click()
    await expect(del(page)).toBeEnabled()
    await del(page).click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const zip = await JSZip.loadAsync(await readFile((await download.path())!))
    expect(await zip.file('content.xml')!.async('text')).not.toContain('<table:table')
    expect(Object.keys(zip.files).filter((n) => n.startsWith('Pictures/'))).toHaveLength(0)
  })
})

test.describe('Tabelle löschen — repräsentative Fixture-Teilmenge über echten Upload (Testfall 14)', () => {
  test('simple-table.odt: upload, delete the visible first table, export, verify no table XML remains', async ({ page }) => {
    await uploadFixture(odtCard(page), 'odt/simple-table.odt', 'application/vnd.oasis.opendocument.text')
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('table')).toHaveCount(1)
    await editor.locator('table').first().locator('td').first().click()
    await expect(del(page)).toBeEnabled()
    await del(page).click()
    await expect(editor.locator('table')).toHaveCount(0)
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const zip = await JSZip.loadAsync(await readFile((await (await downloadPromise).path())!))
    expect(await zip.file('content.xml')!.async('text')).not.toContain('<table:table')
  })

  test('BigTable.odt: upload, delete the large table without a visible freeze, export cleanly (Grenzfall 3)', async ({ page }) => {
    await uploadFixture(odtCard(page), 'odt/BigTable.odt', 'application/vnd.oasis.opendocument.text')
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('table').first()).toBeVisible({ timeout: 10_000 })
    await editor.locator('table').first().locator('td').first().click()
    await expect(del(page)).toBeEnabled()
    const start = Date.now()
    await del(page).click()
    await expect(editor.locator('table')).toHaveCount(0, { timeout: 5_000 })
    expect(Date.now() - start).toBeLessThan(5_000)
  })

  test('subTables3-nested.odt: nested table fixture -- delete the first table found, one fewer table remains', async ({ page }) => {
    await uploadFixture(odtCard(page), 'odt/subTables3-nested.odt', 'application/vnd.oasis.opendocument.text')
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('table').first()).toBeVisible()
    const before = await editor.locator('table').count()
    await editor.locator('table').first().locator('td').first().click()
    await expect(del(page)).toBeEnabled()
    await del(page).click()
    await expect(editor.locator('table')).toHaveCount(before - 1)
  })

  test('table-column-delete-with-merge.odt: exotic merge structure -- delete without crashing (Grenzfall 8)', async ({ page }) => {
    await uploadFixture(odtCard(page), 'odt/table-column-delete-with-merge.odt', 'application/vnd.oasis.opendocument.text')
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('table').first()).toBeVisible()
    await editor.locator('table').first().locator('td').first().click()
    await expect(del(page)).toBeEnabled()
    await del(page).click()
    await expect(editor.locator('table')).toHaveCount(0)
  })

  test('TestTableColumns.docx: DOCX fixture upload + delete + export', async ({ page }) => {
    await uploadFixture(docxCard(page), 'docx/TestTableColumns.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('table').first()).toBeVisible()
    await editor.locator('table').first().locator('td').first().click()
    await expect(del(page)).toBeEnabled()
    await del(page).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const zip = await JSZip.loadAsync(await readFile((await (await downloadPromise).path())!))
    expect(await zip.file('word/document.xml')!.async('text')).not.toContain('<w:tbl>')
  })

  test('table_footnotes.docx: table with a footnote reference -- delete + export does not crash or corrupt the zip', async ({ page }) => {
    await uploadFixture(docxCard(page), 'docx/table_footnotes.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('table').first()).toBeVisible()
    await editor.locator('table').first().locator('td').first().click()
    await expect(del(page)).toBeEnabled()
    await del(page).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    // A corrupt zip throws on load -- surviving load + no <w:tbl> is the assertion for this fixture.
    const zip = await JSZip.loadAsync(await readFile((await (await downloadPromise).path())!))
    expect(await zip.file('word/document.xml')!.async('text')).not.toContain('<w:tbl>')
  })
})
```

### 5.3 Erwartete Ergebnisse heute (vor Umsetzung von `tabelle-loeschen-code.md`)

| Test | Erwartung heute | Grund |
|---|---|---|
| Alle Tests, die `getByTitle('Tabelle löschen')` referenzieren | **RED** (Timeout: Element existiert nicht) | Abschnitt 1 Punkt 2 |
| „boundary-Backspace" (Grenzfall 14) | **Einziger heute GREEN-fähiger** E2E-Test | Abschnitt 1 Punkt 5 — reiner Bibliothekscode, kein neuer Button/Command nötig |
| Testfall 3 (Entf/Backspace leert nur Zellinhalt) | **GREEN bereits heute** | `tableEditing()`/`isolating: true` bereits aktiv |
| Alle übrigen Tests in 5.2 | **RED** | Button/Keymap-Eintrag fehlen vollständig |

Nach Umsetzung von `tabelle-loeschen-code.md` müssen **alle** Tests in 5.2 ohne Änderung grün werden,
auf **allen drei** Playwright-Projekten.

---

## 6. Fixture-Existenzprüfung (vor Testerstellung durchgeführt)

Alle in `tabelle-loeschen-req.md` Abschnitt 4.2 gelisteten Dateien wurden per `ls`/Bash-Schleife
gegen `tests/fixtures/external/{odt,docx}` einzeln geprüft — **alle 34 ODT- und 6 DOCX-Dateien
vorhanden**, keine fehlt:

ODT: `BigTable.odt`, `crazyTable.odt`, `subTables.odt`, `subTables2.odt`, `subTables3-nested.odt`,
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

DOCX: `TestTableCellAlign.docx`, `TestTableColumns.docx`, `deep-table-cell.docx`,
`table-alignment.docx`, `table-indent.docx`, `table_footnotes.docx`.

---

## 7. Bekannte Einschränkungen / bewusst nicht in diesem Feature zu beheben

Dokumentiert, damit ein RED/übersprungenes Ergebnis korrekt zugeordnet wird — **nicht** Teil des
Umsetzungsauftrags für „Tabelle löschen":

1. **Keine Fußnoten-Unterstützung im DOCX-Pfad** — `table_footnotes.docx`-Tests prüfen ausschließlich
   Absturzfreiheit/Zip-Validität, keine Fußnotenverwaltung (`tabelle-loeschen-code.md` Abschnitt 5).
2. **Integrationsrisiko zwischen den drei parallelen Tabellen-Feature-Plänen** (`tabelle-loeschen`,
   `zeile-loeschen`, `spalte-loeschen`) bezüglich Toolbar-Architektur (`Toolbar.tsx` vs.
   `TableToolbar.tsx`) und Modul-Ort (`commands.ts` vs. `tableCommands.ts`) — dokumentiert in
   `tabelle-loeschen-code.md` Abschnitt 9. Dieser Testplan verankert seine Locators bewusst nur an
   `aria-label`/`title="Tabelle löschen"`, nicht an einer Annahme über die Dateistruktur, und bleibt
   damit unabhängig davon funktionsfähig, wie die Integration diese Frage löst.
3. **Track-Changes** (req 2.10) — Phase 3, nicht im aktuellen Scope; hier weder getestet noch
   vorausgesetzt.

> **Gestrichen ggü. der 1. Fassung:** Die früher hier gelisteten Blocker „ODT `covered-table-cell`
> fehlt" und „`tests/e2e/large-document-import.spec.ts` existiert nicht" sind **beide widerlegt**
> (Abschnitt 1 Punkte 7/8/12) und daher entfernt.

---

## 8. Abnahmekriterien-Abgleich (Definition of Done, `tabelle-loeschen-req.md` Abschnitt 9)

| DoD-Punkt | Abgedeckt durch |
|---|---|
| 1 Echter, klickbarer Toolbar-Button entfernt Tabelle inkl. Inhalt | 5.2 „Grundverhalten" Testfall 1/2 |
| 2 NodeSelection-auf-Tabelle-Pflichtfall (kein stiller No-Op) | 4.2 (`canDeleteTable`/`deleteTable`), 5.2 „boundary-Backspace"/„Mod-Alt-Backspace" |
| 3 Abgrenzung „Struktur löschen" vs. „nur Zellinhalt leeren" | 5.2 Testfall 3 (Regression, GREEN bereits heute) |
| 4 Sonderfall „einzige/letzte Tabelle" → Ersatz-Absatz | 4.2 (Grenzfall 1), 5.2 „Grenzfall 1" |
| 5 Undo/Redo strukturell exakt, mehrere Zyklen | 4.2 (Undo/Redo), 5.2 „Undo/Redo 3 Zyklen" |
| 6 Verschachtelte Tabellen, beide Richtungen | 4.2, 5.2 „verschachtelt" |
| 7 Jeder Grenzfall aus Abschnitt 3 hat einen Test | Traceability-Matrix 3.2 |
| 8 Selection-Sync-Regressionstest im Tabellenkontext | 5.2 „Selection-Sync" (Pflicht) |
| 9 Rundreise beide Formate, alle Fixtures, unabhängiger Parser | 4.3/4.4/4.6 (roher `document.xml`/`content.xml` + alle 40 Fixtures) |
| 10 Kernverhalten auf allen drei Playwright-Projekten | 5.2 (ohne Projekt-Einschränkung) |
| 11 Jeder Verdachtspunkt aus req Abschnitt 5 eindeutig aufgelöst | Abschnitt 1 (Code-Audit-Tabelle) |
| 12 Kein stiller Fehlschlag | 4.2 (`canDeleteTable`/`disabled`), 5.2 Testfall 1/Grenzfall 13 |
| 13 Backlog-Statuswechsel erst nach Erfüllung aller Punkte | Nicht Teil dieses QA-Plans — Backlog-Pflegeprozess nach grünen Tests |

**Zusammenfassender Hinweis an PO/Lead:** Solange `tabelle-loeschen-code.md` nicht umgesetzt ist, ist
der korrekte, erwartete Zustand dieses gesamten Testplans „fast vollständig RED" — mit den beiden
explizit benannten Ausnahmen (bereits aktives Boundary-Backspace-Verhalten, bereits aktives
Entf/Backspace-auf-Zellinhalt-Verhalten). Ein QA-Lauf vor Fertigstellung darf **nicht** als „Feature
fehlerhaft" fehlinterpretiert werden — er bestätigt exakt, was `tabelle-loeschen-req.md` Abschnitt 5
feststellt: das Feature ist zu 100 % ungebaut, nicht nur ungetestet. **Kein** verbleibender
`test.todo` und **kein** offener ODT-Merge-Blocker (im Unterschied zur ersten, gegen veralteten Code
geschriebenen Fassung dieses Plans).
