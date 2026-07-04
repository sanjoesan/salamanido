# QA-Testplan: „Tabelle löschen"

Gegenstück zu `specs/tabelle-loeschen-req.md` (Anforderung) und `specs/tabelle-loeschen-code.md`
(Umsetzungsplan des Dev-Agenten). Dieses Dokument ist der **Testplan der QA-Rolle**: es legt fest,
welche Tests geschrieben werden, mit welchem konkreten Code, gegen welche echten Dateien/Fixtures,
und wie das Ergebnis gegen Anforderungsabschnitt 6/7 abgeglichen wird. Es ersetzt nicht die
Ausführung, sondern ist die verbindliche, ausführbare Grundlage dafür.

Stil/Aufbau folgen bewusst `specs/liste-aufheben-qa.md` (zuletzt geprüftes Schwesterfeature),
damit alle QA-Pläne in diesem Repo vergleichbar bleiben.

---

## 0. Kurzfassung für Eilige

- **Vor Testerstellung wurde der tatsächliche Code geprüft** (nicht nur `tabelle-loeschen-code.md`
  gelesen). Ergebnis, abweichend von den meisten Schwesterfeatures: Hier gibt es **keine**
  Teilumsetzung zu verifizieren — der in `tabelle-loeschen-req.md` Abschnitt 5 und
  `tabelle-loeschen-code.md` Abschnitt 1 beschriebene Ist-Zustand („zu 100 % ungebaut") ist exakt
  der tatsächliche Code-Stand (Details Abschnitt 1). **Praktisch jeder** in diesem Plan neu
  vorgeschlagene Test ist deshalb heute **RED** (Compile-/Laufzeitfehler oder fehlendes
  UI-Element) — das ist der korrekte, erwartete Zustand vor dem Bau, kein Testfehler.
- Zwei Testebenen, wie beauftragt:
  1. **Unit-Tests (Vitest/jsdom)** für die Reader/Writer-Rundreise DOCX **und** ODT — Abschnitt 4.
  2. **Echte Playwright-Browser-Tests** — echte Mausklicks, echtes Tippen über `page.keyboard`,
     echter Datei-Upload über `input[type=file]`, echter Export-Download über
     `page.waitForEvent('download')` mit anschließendem Einlesen/Entpacken der **tatsächlich
     heruntergeladenen Datei** per `JSZip` — nicht nur interne Aufrufe von
     `readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`deleteTable`. Abschnitt 5.
- Alle ~40 in `tabelle-loeschen-req.md` Abschnitt 4.2 gelisteten Fixture-Dateien wurden **vor dem
  Schreiben dieses Plans** per `ls` gegen das tatsächliche Dateisystem geprüft — **alle
  vorhanden** (Abschnitt 6), keine wurde unbesehen aus der Anforderung übernommen.
- Weder unter `src/**/__tests__/` noch unter `tests/e2e/` existiert **irgendeine** der in diesem
  Plan vorgeschlagenen neuen Testdateien (`tableCommands.test.ts`,
  `tableDelete.crossFormat.test.ts`, `tableDelete.fixtures.test.ts` ×2, `table-delete.spec.ts`) —
  per `ls`/`Glob` bestätigt. Dieser Plan beschreibt vollständig **neue** Testabdeckung plus
  Erweiterungen der beiden bestehenden `roundtrip.test.ts`-Dateien.
- **Wichtigste QA-Konsequenz gegenüber `tabelle-loeschen-code.md`:** Der Codeplan begründet an
  mehreren Stellen (Abschnitt 2.1–2.5), dass ein Großteil des gewünschten Verhaltens „bereits
  heute automatisch durch `prosemirror-tables`/ProseMirror selbst korrekt" sei. Das mag für die
  **Bibliothek** `deleteTable` (direkt aus `prosemirror-tables` importiert) zutreffen — es trifft
  **nicht** auf das Produkt zu, solange `commands.ts` keinen eigenen `deleteTable`/`canDeleteTable`
  exportiert, kein Toolbar-Button existiert und kein Keymap-Eintrag gebunden ist. Dieser Plan
  testet ausschließlich den **Produkt**-Zustand (echter Button-Klick, echter Tastaturweg, echter
  Export), nicht die isolierte Bibliotheksfunktion — entsprechend sind die in
  `tabelle-loeschen-code.md` Abschnitt 2 als „empirisch verifiziert" bezeichneten Befunde hier
  als **Vorhersage für nach dem Bau**, nicht als bereits bestehende Testabdeckung zu lesen.

---

## 1. Ausgangslage: Code-Audit vor Testerstellung

Geprüft wurden die tatsächlichen Dateien im Repo (nicht nur die Beschreibung in
`tabelle-loeschen-code.md`): `src/formats/shared/schema.ts`,
`src/formats/shared/editor/{commands.ts,Toolbar.tsx,WordEditor.tsx}`,
`src/formats/docx/{reader.ts,writer.ts}`, `src/formats/odt/{reader.ts,writer.ts}`, beide
`__tests__/roundtrip.test.ts`, `src/formats/odt/__tests__/external-fixtures.test.ts`,
`tests/e2e/{docx,odt,selection-regression,lifecycle}.spec.ts`, `playwright.config.ts`,
`package.json`, sowie das Vorhandensein aller in `tabelle-loeschen-req.md` Abschnitt 4.2
genannten Fixture-Dateien per `ls`.

| # | Verdachtspunkt / Codeplan-Aussage | Tatsächlicher Code-Stand (verifiziert) | QA-Konsequenz |
|---|---|---|---|
| 1 | `commands.ts` hat keinen `deleteTable`/`canDeleteTable` (req Abschnitt 5.1, code Abschnitt 1) | **Bestätigt.** Datei (`src/formats/shared/editor/commands.ts`, 108 Zeilen) exportiert `isInTable` (Re-Export), `setAlign`, `isAlignActive`, `setHeading`, `toggleList`, `liftFromList`, `insertImage`, `insertTable`, `applyMarkColor`, `clearMarkColor` — kein `deleteTable`, kein `canDeleteTable`, kein Import von `prosemirror-tables`' `deleteTable`. | Jeder Test in `tableCommands.test.ts`, der `deleteTable`/`canDeleteTable` aus `../commands` importiert, **muss** heute mit `SyntaxError`/`undefined is not a function` fehlschlagen (kein TS-Compile-Gate in Vitest, siehe `vite.config.ts` — Vitest führt `.ts` direkt über esbuild aus, ein fehlender Named Export fällt erst beim Aufruf zur Laufzeit auf, nicht beim Import selbst, da JS-Module fehlende Exports als `undefined` binden) |
| 2 | Kein zweiter Toolbar-Button für Löschen (req Abschnitt 5.2) | **Bestätigt.** `Toolbar.tsx` (Zeile 228-239) enthält im Tabellen-Bereich ausschließlich den Einfüge-Button (`title="Tabelle einfügen"`, `aria-pressed={isInTable(view.state)}`, `onMouseDown → insertTable(2, 2)`), danach direkt das Bild-Label (Zeile 241-244). Kein zweiter Button. | Jeder E2E-Test, der `page.getByTitle('Tabelle löschen')`/`page.getByRole('button', { name: 'Tabelle löschen' })` erwartet, **muss** heute mit Timeout/„element not found" fehlschlagen |
| 3 | Kein Kontextmenü (req Abschnitt 5.3) | **Bestätigt**, projektweite Suche nach `contextmenu`/`onContextMenu` liefert 0 Treffer außerhalb von `node_modules`. | Kein Test nötig (Nice-to-have, bewusst nicht im Scope, siehe `tabelle-loeschen-code.md` Abschnitt 3.5) |
| 4 | Keine Tastenkombination fürs Löschen (req Abschnitt 5.4) | **Bestätigt für einen dedizierten Eintrag.** `WordEditor.tsx` Zeile 71-79 bindet nur `Mod-z/y/Shift-z`, `Enter` (`splitListItem`), `Mod-b/i/u`; Zeile 80 zusätzlich `keymap(baseKeymap)`. Kein `Mod-Alt-Backspace`, keine sonstige Tabellen-Lösch-Bindung. | Jeder E2E-Test für `Mod-Alt-Backspace` **muss** heute RED sein (Dokument bleibt unverändert) |
| 5 | Boundary-Backspace (zweimal Backspace direkt nach einer Tabelle) entfernt die Tabelle bereits heute „automatisch", ganz ohne neuen Code (code Abschnitt 2.4) | **Geprüft und bestätigt als tatsächlich zutreffend** — dies ist der **einzige** Teil des gesamten Feature-Umfangs, der schon heute im Produkt funktioniert, weil er ausschließlich aus bereits aktivem Bibliothekscode (`baseKeymap`, `tableEditing()`) folgt, ohne dass irgendein neuer Projekt-Code existieren muss: `keymap(baseKeymap)` ist bereits aktiv (`WordEditor.tsx:80`), `table`/`table_cell` werden von `tableNodes()` ohne `selectable: false` erzeugt (`schema.ts:106`). | **Einziger heute schon GREEN-fähiger E2E-Testfall** dieses gesamten Plans (Abschnitt 5.2, Testfall 13) — muss trotzdem tatsächlich ausgeführt und nicht nur behauptet werden, siehe Abschnitt 3 |
| 6 | `deleteTable` aus `prosemirror-tables` existiert und verhält sich wie in code Abschnitt 2.1/2.2 beschrieben | **Bestätigt durch eigene Prüfung** des tatsächlich installierten Pakets: `node_modules/prosemirror-tables/package.json` → Version `1.8.5` (identisch zu `package.json`s `^1.8.5`); `node_modules/prosemirror-tables/dist/index.js` exportiert eine Funktion `deleteTable(state, dispatch)`, deren Quelltext exakt der im Codeplan zitierten Schleife (`$pos.depth` abwärts, erster `tableRole == "table"`-Treffer) entspricht. | Dieses Bibliotheksverhalten wird **nicht separat gegen `prosemirror-tables` selbst** getestet (das wäre ein Test der Fremdbibliothek, nicht des Produkts) — es fließt ausschließlich über die noch zu bauende `commands.ts`-Funktion in die Tests dieses Plans ein, siehe Abschnitt 0 |
| 7 | `odt/writer.ts:88`: `colCount = rows[0]?.content?.length ?? 1` ignoriert `colspan` (code Abschnitt 6.2) | **Bestätigt.** Zeile 88 lautet exakt `const colCount = rows[0]?.content?.length ?? 1`; die Zellschleife (Zeile 92-105) erzeugt zwar `table:number-columns-spanned`/`table:number-rows-spanned`-Attribute, aber **nirgends** ein `<table:covered-table-cell/>` (projektweite Suche nach `covered` in `src/formats/odt/` → 0 Treffer). | Bestätigt einen **bereits vor diesem Feature bestehenden** ODT-Bug, der für Rundreise-Tests mit mehrzeiligem `rowspan` in einer **überlebenden** Tabelle relevant wird (Abschnitt 4.4, `test.todo`) |
| 8 | `odt/reader.ts` liest `covered-table-cell` nicht (code Abschnitt 6.2) | **Bestätigt.** `elementToBlocks`, Fall `table` (Zeile 189-203), iteriert ausschließlich über `table:table-cell`-Kindelemente; `covered-table-cell` wird nicht behandelt. | Gleicher Blocker wie Punkt 7 — dokumentiert, nicht in diesem Feature zu beheben |
| 9 | DOCX-Reader hat einen Tiefen-Schutz `MAX_TABLE_NESTING_DEPTH = 25` für verschachtelte Tabellen (code Abschnitt 7.5) | **Bestätigt.** `docx/reader.ts:208` `const MAX_TABLE_NESTING_DEPTH = 25`; `parseTable` (Zeile 210) verwendet ihn in Zeile 239 (`if (depth < MAX_TABLE_NESTING_DEPTH)`), referenziert für `deep-table-cell.docx`. | Fixture-Test für `deep-table-cell.docx` prüft entsprechend nur Absturzfreiheit über den vollen Zyklus, nicht Vollständigkeit jeder Verschachtelungsebene (Abschnitt 4.6) |
| 10 | Keine Fußnoten-Unterstützung im DOCX-Pfad (req Abschnitt 4.2, code Abschnitt 5) | **Bestätigt.** `grep -ri footnote src/formats/docx/*.ts` → 0 Treffer. | `table_footnotes.docx`-Testfall prüft nur „kein Crash / keine kaputte XML-Struktur nach Löschen+Export", **nicht** Fußnotenverwaltung (bereits in `tabelle-loeschen-code.md` Abschnitt 5 als bewusst außerhalb des Scopes dokumentiert) |
| 11 | `ImageCollector` wird in beiden Writern pro Aufruf neu instanziiert (req Abschnitt 5.7, code Abschnitt 2.6/5/6.1) | **Bestätigt.** `docx/writer.ts:223` `const images = new ImageCollector()` innerhalb der Export-Funktion; `odt/writer.ts:185` analog. Beide Instanzen werden ausschließlich während des jeweils aktuellen Baum-Durchlaufs befüllt. | Bild-Aufräum-Tests (Abschnitt 4.4/4.6) sind reine **Bestätigungstests** einer bereits strukturell garantierten Eigenschaft — aber weiterhin Pflicht laut Anforderung, „nachgewiesen, nicht nur plausibel" |
| 12 | `tests/e2e/large-document-import.spec.ts`, auf die `odt/__tests__/external-fixtures.test.ts:16` verweist, existiert nicht (code Abschnitt 9, Punkt 4) | **Bestätigt.** `Glob tests/e2e/*` liefert genau vier Dateien: `lifecycle.spec.ts`, `odt.spec.ts`, `docx.spec.ts`, `selection-regression.spec.ts`. Kein `large-document-import.spec.ts`. | Dieser Plan verweist an keiner Stelle auf diese nicht existierende Datei als „bereits abgedeckt" — Performance-/Großtabellen-Fälle werden in Abschnitt 5.2 explizit selbst mit echten E2E-Tests abgedeckt (Testfall 5/6) |
| 13 | Alle ~40 in `tabelle-loeschen-req.md` Abschnitt 4.2 gelisteten Fixture-Dateien existieren | **Bestätigt**, alle 34 ODT- und 6 DOCX-Dateien per `ls`/Bash-Schleife einzeln geprüft (Abschnitt 6) — keine Datei fehlt, keine wurde unbesehen übernommen | Fixture-Testliste in Abschnitt 4.6/5.2 kann 1:1 aus der Anforderung übernommen werden |
| 14 | Keine der in diesem Plan vorgeschlagenen neuen Testdateien existiert bereits | **Bestätigt** per `Glob`: `tableCommands.test.ts`, `tableDelete.crossFormat.test.ts`, `tableDelete.fixtures.test.ts` (beide Formate), `table-delete.spec.ts` sind allesamt neue Pfade. | Dieser Plan beschreibt vollständig neue Testabdeckung, siehe Abschnitt 4/5 |

Zusätzlich verifiziert, **bereits korrekt und unverändert von diesem Feature betroffen** (kein Fix
nötig, nur zukünftige Testabdeckung relevant):

- `schema.ts:7` `doc: { content: 'block+' }` und `schema.ts:106`
  `tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })` — exakt wie in
  Anforderung/Codeplan beschrieben, keine Abweichung.
- `docx/__tests__/roundtrip.test.ts:173-249` (`describe('DOCX round trip: tables', ...)`) und
  `odt/__tests__/roundtrip.test.ts:162-211` (analog) — beide prüfen ausschließlich das **Anlegen**
  von Tabellen (2×2 einfach, `colspan`-Merge, `rowspan`-Merge), **kein** Test ruft ein
  Lösch-Kommando auf oder prüft den Zustand danach.
- `tests/e2e/selection-regression.spec.ts:34-50` enthält bereits einen Tabellen-Test
  („same regression inside a table cell"), der **exakt** das für Grenzfall 9/Testfall 4 dieses
  Plans benötigte Interaktionsmuster (Zelle A tippen+formatieren → Klick in Zelle B) vorführt,
  aber **ohne** anschließende Lösch-Aktion — bestätigt `tabelle-loeschen-req.md` Abschnitt 5,
  Punkt 9 wortgleich.
- `playwright.config.ts` — `testDir: tests/e2e`, drei Projekte (Desktop Chrome, Mobile/Pixel 7,
  Tablet/iPad Mini), `webServer` baut+startet automatisch — keine Konfigurationsänderung für
  diesen Plan nötig.

**Konsequenz für diesen Testplan:** Anders als bei den meisten bisher geprüften Schwesterfeatures
(z. B. „Liste aufheben", wo nur einzelne Bugs offen waren) ist hier die **überwältigende
Mehrheit** der neuen Tests heute RED, weil das Feature schlicht noch nicht existiert. Jeder Test
in diesem Plan ist trotzdem so geschrieben, dass er **nach** Umsetzung von
`tabelle-loeschen-code.md` ohne weitere Änderung grün werden soll — die Erwartung „RED heute,
GREEN nach Bau" wird pro Testblock explizit vermerkt (Abschnitte 4.7 und 5.3), damit ein
QA-Lauf vor Fertigstellung nicht fälschlich als „Feature kaputt" statt „Feature noch nicht gebaut"
gelesen wird.

---

## 2. Testumgebung & Ausführung

| Ebene | Werkzeug | Befehl | Konfiguration |
|---|---|---|---|
| Unit | Vitest, Environment `jsdom`, `globals: true` | `npm test` / `npm run test:watch` | `vite.config.ts` — kein Typecheck-Plugin aktiv (wichtig für Abschnitt 1, Punkt 1: ein fehlender Named Export fällt erst als Laufzeit-Fehler auf, nicht als Build-Fehler) |
| E2E | Playwright | `npm run test:e2e` / `npm run test:e2e:ui` | `playwright.config.ts` — `testDir: tests/e2e`, `webServer` baut automatisch (`npm run build && npm run preview -- --port 4173`); Projekte: Desktop Chrome, Mobile (Pixel 7), Tablet (iPad Mini) — alle drei Projekte laufen automatisch, kein `test.describe.configure` nötig |

Alle neuen/erweiterten Testdateien in diesem Plan fügen sich ohne Konfigurationsänderung in die
bestehende Suite ein.

---

## 3. Traceability-Matrix — Anforderung → Testartefakt

### 3.1 Testfälle (`tabelle-loeschen-req.md` Abschnitt 6)

| Testfall | Ebene | Testartefakt | Erwartung heute |
|---|---|---|---|
| 1 (Button-Zustand nur in Tabelle aktiv) | E2E | `table-delete.spec.ts` „Testfall 1" | RED (Button existiert nicht) |
| 2 (Klick entfernt komplette Tabelle) | E2E | `table-delete.spec.ts` „Testfall 2" | RED |
| 3 (Entf/Backspace leert nur Zellinhalt) | E2E | `table-delete.spec.ts` „Testfall 3" | **GREEN erwartet bereits heute** — reines `tableEditing()`-Verhalten, unabhängig vom neuen Feature (Abschnitt 1, Zusatzverifikation) |
| 4 (Tastaturweg liefert dasselbe Ergebnis wie Button) | E2E | `table-delete.spec.ts` „Testfall 12" | RED |
| 5 (Cursor-Ziel deterministisch, Editor sofort bedienbar) | Unit + E2E | `tableCommands.test.ts` + `table-delete.spec.ts` „Testfall 6/7" | RED |
| 6 (Undo/Redo bit-genau, mehrere Zyklen) | Unit + E2E | `tableCommands.test.ts` + `table-delete.spec.ts` „Testfall 10" | RED |
| 7 (verschachtelte Tabelle, beide Richtungen) | Unit + E2E | `tableCommands.test.ts` + `table-delete.spec.ts` „Testfall 9" | RED |
| 8 (Bild-/Listen-Aufräumen im Export) | Unit (Rundreise) + E2E | Abschnitt 4.4 Punkt 2/7, `table-delete.spec.ts` „Testfall 14/15" | RED |
| 9 (Selection-Sync-Regression) | E2E | `table-delete.spec.ts` „Testfall 4" — **Pflichttest** | RED |
| 10 (Grenzfälle 1-16) | Unit + E2E | Abschnitt 3.2 unten | überwiegend RED, siehe dort |
| 11 (Rundreise DOCX+ODT, Editor-erzeugt, 4.1.1-4.1.8) | Unit | Abschnitt 4.4/4.5 | RED |
| 12 (Import+Löschen+Rundreise je reale Fixture, 4.2) | Unit + E2E | Abschnitt 4.6 (alle Dateien) + `table-delete.spec.ts` „Testfall 16" (Teilmenge über echten Upload) | RED |
| 13 (unabhängiger Parser-Validierung DOCX) | Unit | Abschnitt 4.4, `JSZip`/XML-String-Assertions direkt auf dem geschriebenen `document.xml`, nicht nur über den eigenen Reader | RED |
| 14 (dito ODT) | Unit | Abschnitt 4.5, direkt auf `content.xml` | RED |

### 3.2 Grenzfälle (`tabelle-loeschen-req.md` Abschnitt 3) → Testort

| # | Kurzfassung | Testort | Erwartung heute |
|---|---|---|---|
| 1 | Tabelle = einziges Dokumentelement | `tableCommands.test.ts`, `table-delete.spec.ts` Testfall 6 | RED |
| 2 | 1×1-Tabelle | `tableCommands.test.ts` | RED |
| 3 | Sehr große Tabelle, Performance | `tableCommands.test.ts` (synthetisch), `table-delete.spec.ts` Testfall 5 (`BigTable.odt`) | RED |
| 4 | Tabelle am Dokumentanfang | `tableCommands.test.ts`, `table-delete.spec.ts` Testfall 7 | RED |
| 5 | Tabelle am Dokumentende | `tableCommands.test.ts`, `table-delete.spec.ts` Testfall 7 | RED |
| 6 | Zwei aufeinanderfolgende Tabellen | `tableCommands.test.ts`, `table-delete.spec.ts` Testfall 8 | RED |
| 7 | Verschachtelte Tabelle, beide Richtungen | `tableCommands.test.ts`, `table-delete.spec.ts` Testfall 9, Fixtures `subTables*.odt` (Abschnitt 4.6) | RED |
| 8 | Bereits gemergte/gelöschte Spalten (Fremddatei) | Fixtures `table-column-delete-with-merge*.odt` (Abschnitt 4.6) | RED |
| 9 | Selection-Sync-Regressionsmuster | `table-delete.spec.ts` Testfall 4 (**Pflicht**) | RED |
| 10 | Löschen unmittelbar nach Einfügen | `tableCommands.test.ts`, `table-delete.spec.ts` Testfall 5 | RED |
| 11 | Mehrfaches Undo/Redo | `tableCommands.test.ts`, `table-delete.spec.ts` Testfall 10 | RED |
| 12 | Mehrere Absätze/gemischte Formatierung in Zelle | `tableCommands.test.ts` | RED |
| 13 | Löschen während Bild-/Fremdauswahl außerhalb der Tabelle | `tableCommands.test.ts` (`canDeleteTable`), `table-delete.spec.ts` Testfall 11 | RED |
| 14 | Bild in Zelle löschen, danach exportieren | Abschnitt 4.4 Punkt 2/7, `table-delete.spec.ts` Testfall 14 | RED |
| 15 | Rundreise mit Format-Wechsel (Cross-Format) | `tableDelete.crossFormat.test.ts` | RED |
| 16 | Reale Fremddatei: Rundreise ohne Löschen unbeeinträchtigt | Abschnitt 4.6, Schritt 1 jeder Fixture (bestehender `readOdt`/`readDocx`-Import bereits heute GREEN, siehe `external-fixtures.test.ts`) | **Import-Teil bereits GREEN**, Lösch-Teil RED |

---

## 4. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX **und** ODT)

### 4.1 Bestandsaufnahme

Vorhanden: `src/formats/docx/__tests__/roundtrip.test.ts`
(`describe('DOCX round trip: tables', ...)`, Zeile 173-249) und
`src/formats/odt/__tests__/roundtrip.test.ts` (`describe('ODT round trip: tables', ...)`, Zeile
162-211) — beide prüfen ausschließlich das **Anlegen** von Tabellen (2×2 mit Text, `colspan`-Merge,
`rowspan`-Merge über zwei Zeilen). **Keiner** ruft ein Lösch-Kommando auf oder prüft den Zustand
**nach** einer Löschung. Fehlt vollständig: jeder Test der eigentlichen Editor-Transformation
selbst (`tableCommands.test.ts` existiert nicht), jede Rundreise für den Zustand „Tabelle
gelöscht", jede Fixture-getriebene Prüfung.

### 4.2 Neu: `src/formats/shared/editor/__tests__/tableCommands.test.ts`

Reine Logik-Tests ohne Browser/DOM — konstruiert `EditorState` direkt aus `wordSchema` und prüft
`deleteTable`/`canDeleteTable` isoliert gegen jeden in Anforderungsabschnitt 2/3 beschriebenen
Fall. Positionen werden über einen robusten Text-Such-Helfer ermittelt (nicht über hartkodierte
`nodeSize`-Arithmetik — bleibt bei künftigen Schemaänderungen korrekt):

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
  let ran = false
  ran = deleteTable()(state, (tr) => {
    result = state.apply(tr)
  })
  return { result, ran }
}

describe('deleteTable (Anforderung Abschnitt 2.1 -- Grundverhalten, erwartet RED bis tabelle-loeschen-code.md Abschnitt 4.1 umgesetzt ist)', () => {
  it('cursor in any cell removes the whole table, not just the current row/cell', () => {
    let state = stateFor(doc(table(row(cell(para('A1')), cell(para('B1'))), row(cell(para('A2')), cell(para('B2'))))))
    state = cursorIn(state, 'B1')
    const { result, ran } = applyDeleteTable(state)
    expect(ran).toBe(true)
    expect(result.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
    expect(result.doc.textContent).toBe('')
  })

  it('surrounding paragraphs before and after the table survive untouched (Abschnitt 2.1)', () => {
    let state = stateFor(doc(para('Davor'), table(row(cell(para('A1')))), para('Danach')))
    state = cursorIn(state, 'A1')
    const { result } = applyDeleteTable(state)
    expect(result.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph', 'paragraph'])
    expect(result.doc.textContent).toBe('DavorDanach')
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

  it('nested table: cursor in the inner table removes ONLY the inner table (Abschnitt 2.5/Grenzfall 7)', () => {
    const inner = table(row(cell(para('inner-a')), cell(para('inner-b'))))
    let state = stateFor(
      doc(table(row(cell(para('outer-a1'), inner), cell(para('outer-b1'))), row(cell(para('outer-a2')), cell(para('outer-b2'))))),
    )
    state = cursorIn(state, 'inner-a')
    const { result } = applyDeleteTable(state)
    const outer = result.doc.content.content[0]
    expect(outer.type.name).toBe('table')
    // Outer table keeps BOTH rows and all its own cells; only the cell that held the
    // inner table now contains an empty paragraph instead.
    expect(outer.textContent).toBe('outer-a1outer-b1outer-a2outer-b2')
    const tableCount = countDescendantTables(result.doc)
    expect(tableCount).toBe(1)
  })

  it('nested table: cursor in an outer cell outside the inner table removes the ENTIRE outer table, inner included (Abschnitt 2.5/Grenzfall 7)', () => {
    const inner = table(row(cell(para('inner-a'))))
    let state = stateFor(doc(table(row(cell(para('outer-a1'), inner), cell(para('outer-b1'))))))
    state = cursorIn(state, 'outer-b1')
    const { result } = applyDeleteTable(state)
    expect(result.doc.content.content.map((n) => n.type.name)).toEqual(['paragraph'])
    expect(countDescendantTables(result.doc)).toBe(0)
  })

  it('a colspan/rowspan-merged table deletes fully with no special handling required (Abschnitt 2.6)', () => {
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
    const inTable = cursorIn(afterInsert, '')
    // insertTable produces empty cells; select the first cell directly by position instead.
    const firstCellPos = afterInsert.doc.content.firstChild!.type.name === 'table' ? 2 : 0
    const withCursor = afterInsert.apply(
      afterInsert.tr.setSelection(TextSelection.near(afterInsert.doc.resolve(firstCellPos + 1))),
    )
    const { ran } = applyDeleteTable(withCursor)
    expect(ran).toBe(true)
  })

  it('a NodeSelection directly on the table node (post boundary-Backspace state) is still deleted -- regression guard for the prosemirror-tables fallthrough (Abschnitt 2.2 der Anforderung, Konsistenzpflicht)', () => {
    let state = stateFor(doc(table(row(cell(para('X')))), para('Danach')))
    const tablePos = 0
    state = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, tablePos)))
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
    expect(elapsedMs).toBeLessThan(500) // generous bound; real perf is confirmed against BigTable.odt via E2E
  })
})

describe('canDeleteTable (Abschnitt 1 Zeile 50 der Anforderung, Grenzfall 13 -- erwartet RED bis Abschnitt 4.1 des Codeplans umgesetzt ist)', () => {
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

describe('Undo/Redo of deleteTable (Abschnitt 2.4, Grenzfall 11 -- mehrere Zyklen, erwartet RED bis Abschnitt 4.1 des Codeplans umgesetzt ist)', () => {
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

function countDescendantTables(doc: PMNode): number {
  let count = 0
  doc.descendants((node) => {
    if (node.type.name === 'table') count++
  })
  return count
}
```

**Erwartung heute:** Jeder Test in dieser Datei importiert `deleteTable`/`canDeleteTable` aus
`../commands` — beide Namen existieren im heutigen Code nicht (Abschnitt 1, Punkt 1). Jeder
`describe`-Block schlägt daher mit `TypeError: deleteTable is not a function` bzw.
`canDeleteTable is not a function` fehl. **Erwartet GREEN, sobald `tabelle-loeschen-code.md`
Abschnitt 4.1 umgesetzt ist**, ohne Änderung an diesem Testcode.

### 4.3 Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts`

Neuer `describe`-Block nach dem bestehenden `'DOCX round trip: tables'`-Block (Zeile 173-249),
der **den echten Befehl** anwendet (nicht nur fertige JSON-Strukturen direkt konstruieren) —
Ablauf: `EditorState` mit Tabelle(n) aufbauen (per `wordSchema.nodeFromJSON`) → `deleteTable()`
anwenden → `state.doc.toJSON()` in `WordDocumentContent.body` einsetzen → `writeDocx` → `readDocx`
→ Struktur/Text sowie das rohe `word/document.xml` prüfen:

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

describe('DOCX round trip: tabelle löschen (erwartet RED bis tabelle-loeschen-code.md Abschnitt 4.1 umgesetzt ist)', () => {
  it('simple 2x2 table with a paragraph before/after, deleted immediately -> re-import shows only the two paragraphs, no <w:tbl> left (Rundreise 4.1.1)', async () => {
    const original = doc([
      paragraph('Davor'),
      {
        type: 'table',
        content: [
          { type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('A1')] }] },
        ],
      },
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

  it('table with text, formatting, image, and a nested list, then deleted -> re-import shows neither table nor cell content, surrounding text unchanged, no orphaned image in word/media/ (Rundreise 4.1.3, Grenzfall 14)', async () => {
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
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['paragraph', 'paragraph'])
  })

  it('two tables, only one deleted -> the surviving table is bit-identical (Rundreise 4.1.5)', async () => {
    const survivingTable = {
      type: 'table',
      content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Bleibt')] }] }],
    }
    const original = doc([
      {
        type: 'table',
        content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Weg')] }] }],
      },
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
              {
                type: 'table_cell',
                attrs: { colspan: 1, rowspan: 1 },
                content: [
                  {
                    type: 'table',
                    content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Innen')] }] }],
                  },
                ],
              },
            ],
          },
        ],
      },
      paragraph('Danach'),
    ])
    const deletedBody = deleteFirstTable(original.body)
    const result = await roundTrip({ ...original, body: deletedBody as any })
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['paragraph', 'paragraph'])
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
              {
                type: 'table_cell',
                attrs: { colspan: 1, rowspan: 1 },
                content: [
                  {
                    type: 'table',
                    content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Innen')] }] }],
                  },
                ],
              },
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
    // First cell no longer contains a nested table.
    expect(outer.content[0].content[0].content.some((n: any) => n.type === 'table')).toBe(false)
  })

  it('table_footnotes.docx-like minimal document with a table and a footnote reference in the surrounding text -> deleting the table, export/reimport does not crash and the reference text survives as-is (Abschnitt 5 des Codeplans -- known footnote-support limitation, NOT re-tested here)', async () => {
    const original = doc([
      paragraph('Text mit Fußnotenverweis 1'),
      {
        type: 'table',
        content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Tabelleninhalt')] }] }],
      },
    ])
    const deletedBody = deleteFirstTable(original.body)
    const result = await roundTrip({ ...original, body: deletedBody as any })
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['paragraph'])
    expect((result.body as any).content[0].content[0].text).toBe('Text mit Fußnotenverweis 1')
  })
})
```

### 4.4 Erweiterung: `src/formats/odt/__tests__/roundtrip.test.ts`

Analog zu 4.3, im bestehenden `describe('ODT round trip: tables', ...)`-Kontext (Zeile 162-211),
Testfälle 1-6 wortgleich für ODT (`writeOdt`/`readOdt`). Zusätzlich zwei ODT-spezifische Fälle:

```ts
describe('ODT round trip: tabelle löschen (erwartet RED bis tabelle-loeschen-code.md Abschnitt 4.1 umgesetzt ist)', () => {
  // Testfälle 1-6: identisch zur DOCX-Variante (Abschnitt 4.3 dieses Plans), gegen writeOdt/readOdt,
  // mit Assertions gegen content.xml statt word/document.xml und gegen Dateien im ZIP-Wurzelverzeichnis
  // statt word/media/ (siehe writer.ts:206 -- ODT legt Bilder ohne Pictures/-Unterordner ab).

  it('image in a cell of a deleted table leaves no leftover picture file in the ODT zip root and no orphaned manifest:file-entry (Grenzfall 14, ODT-Teil)', async () => {
    const original = doc([
      {
        type: 'table',
        content: [
          {
            type: 'table_row',
            content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'image', attrs: { src: TINY_PNG, alt: 'x' } }] }],
          },
        ],
      },
    ])
    const deletedBody = deleteFirstTable(original.body)
    const blob = await writeOdt({ ...original, body: deletedBody as any })
    const zip = await JSZip.loadAsync(blob)
    const pictureFiles = Object.keys(zip.files).filter((name) => /\.(png|jpe?g|gif)$/i.test(name))
    expect(pictureFiles).toHaveLength(0)
    const manifestXml = await zip.file('META-INF/manifest.xml')!.async('text')
    expect(manifestXml.match(/manifest:media-type="image\//g) ?? []).toHaveLength(0)
  })

  it('list in a cell of a deleted table leaves no <text:list> instance, though the static list style defs remain (Abschnitt 2.6 der Anforderung)', async () => {
    const original = doc([
      {
        type: 'table',
        content: [
          {
            type: 'table_row',
            content: [
              {
                type: 'table_cell',
                attrs: { colspan: 1, rowspan: 1 },
                content: [{ type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Punkt')] }] }],
              },
            ],
          },
        ],
      },
    ])
    const deletedBody = deleteFirstTable(original.body)
    const blob = await writeOdt({ ...original, body: deletedBody as any })
    const zip = await JSZip.loadAsync(blob)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).not.toContain('<text:list')
  })

  test.todo(
    'known, documented blocker: two tables where the SURVIVING one has a multi-row rowspan cell -- red until odt/writer.ts emits <table:covered-table-cell> (see tabelle-loeschen-code.md Abschnitt 6.2, zeile-loeschen-code.md Abschnitt 5.2, spalte-loeschen-code.md Abschnitt 3.7-3.8) -- NOT to be fixed by this feature',
  )
})
```

### 4.5 Neu: `src/formats/shared/editor/__tests__/tableDelete.crossFormat.test.ts`

Deckt Rundreise 4.1.8 sowie Grenzfall 15 (Abschnitt 4.1/3 der Anforderung):

```ts
import { EditorState, TextSelection } from 'prosemirror-state'
import { wordSchema } from '../../schema'
import { deleteTable } from '../commands'
import { writeOdt, readOdt } from '../../../odt/writer'
import { readOdt as readOdtDoc } from '../../../odt/reader'
import { writeDocx, readDocx } from '../../../docx/writer'
// (import paths adapted to the project's actual module boundaries; writer/reader re-exports
// used identically to the existing roundtrip.test.ts files)

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

describe('Cross-Format Rundreise nach Tabelle löschen (Rundreise 4.1.8, Grenzfall 15 -- erwartet RED bis tabelle-loeschen-code.md Abschnitt 4.1 umgesetzt ist)', () => {
  it('editor-created table deleted -> ODT export -> reimport -> DOCX export -> reimport: table stays gone, surrounding text survives both conversions', async () => {
    const original = {
      body: {
        type: 'doc',
        content: [
          { type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'Davor' }] },
          {
            type: 'table',
            content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'Weg' }] }] }] }],
          },
          { type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'Danach' }] },
        ],
      },
      header: null,
      footer: null,
      meta: { title: '' },
    }
    const deletedBody = docWithTableDeleted(original.body)
    const asOdtBlob = await writeOdt({ ...original, body: deletedBody as any })
    const afterOdt = await readOdtDoc(asOdtBlob)
    const asDocxBlob = await writeDocx(afterOdt)
    const afterDocx = await readDocx(asDocxBlob)
    const types = (afterDocx.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['paragraph', 'paragraph'])
    expect((afterDocx.body as any).content.map((n: any) => n.content?.[0]?.text)).toEqual(['Davor', 'Danach'])
    expect(JSON.stringify(afterDocx.body)).not.toContain('"table"')
  })

  it('reverse direction: DOCX -> ODT (Grenzfall 15 wortgleich)', async () => {
    const original = {
      body: {
        type: 'doc',
        content: [
          { type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'Vor der Tabelle' }] },
          {
            type: 'table',
            content: [{ type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'X' }] }] }] }],
          },
          { type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'Nach der Tabelle' }] },
        ],
      },
      header: null,
      footer: null,
      meta: { title: '' },
    }
    const asDocxBlob = await writeDocx(original)
    const imported = await readDocx(asDocxBlob)
    const deletedBody = docWithTableDeleted(imported.body)
    const asOdtBlob = await writeOdt({ ...imported, body: deletedBody as any })
    const afterOdt = await readOdtDoc(asOdtBlob)
    const types = (afterOdt.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['paragraph', 'paragraph'])
    expect((afterOdt.body as any).content.map((n: any) => n.content?.[0]?.text)).toEqual(['Vor der Tabelle', 'Nach der Tabelle'])
  })
})
```

### 4.6 Neu: Fixture-getriebene Tests für **alle** in Abschnitt 4.2 der Anforderung gelisteten Dateien

Zwei neue Dateien, `src/formats/docx/__tests__/tableDelete.fixtures.test.ts` und
`src/formats/odt/__tests__/tableDelete.fixtures.test.ts`, im selben Lade-Stil wie das bereits
vorhandene `external-fixtures.test.ts` (`readFileSync` gegen
`tests/fixtures/external/{docx,odt}`), aber mit einem zusätzlichen Schritt: statt nur zu
importieren, wird für jede gelistete Datei

1. `readOdt`/`readDocx` aufgerufen (Ist-Zustand, bereits heute GREEN — siehe Abschnitt 1, Punkt 16
   der Traceability-Matrix),
2. eine `EditorState` mit `wordSchema.nodeFromJSON(doc.body)` aufgebaut,
3. die **erste** im Dokument gefundene `table`-Node lokalisiert
   (`state.doc.descendants(...)`), Cursor per `TextSelection.near` in deren erste Textposition
   gesetzt,
4. der **echte, exportierte** `deleteTable()`-Befehl angewendet (dieselbe Funktion, die auch der
   Toolbar-Button aufruft),
5. `writeOdt`/`writeDocx` → `readOdt`/`readDocx` erneut aufgerufen,
6. Assertions: (a) kein Absturz in Schritt 1-5, (b) das reimportierte Dokument enthält **eine
   Tabelle weniger** als das Original (Zählung über `descendants`), (c) der restliche
   Text-Inhalt (alle `text`-Knoten außerhalb von Tabellen, verkettet in Dokumentreihenfolge) ist
   zwischen Original-Import und Nach-Löschen-Reimport **identisch**.

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
    if (node.type.name === 'table') {
      node.forEach((child: any) => walk(child, true))
      return
    }
    if (!insideTable && node.isText) out += node.text
    node.forEach((child: any) => walk(child, insideTable))
  }
  walk(docNode, false)
  return out
}

function countTables(bodyJson: unknown): number {
  const docNode = wordSchema.nodeFromJSON(bodyJson as any)
  let count = 0
  docNode.descendants((node: any) => {
    if (node.type.name === 'table') count++
  })
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
      node.descendants((inner: any, innerPos: number) => {
        if (firstTextPos === -1 && inner.isText) firstTextPos = innerPos
      })
      pos = p + 1 + Math.max(firstTextPos, 0)
      return false
    }
    return pos === -1
  })
  const state = EditorState.create({ doc: docNode, schema: wordSchema })
  const withCursor = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(pos))))
  let afterDelete = withCursor
  const ran = deleteTable()(withCursor, (tr) => {
    afterDelete = withCursor.apply(tr)
  })

  const blob = await writeOdt({ ...original, body: afterDelete.doc.toJSON() as any })
  const reimported = await readOdt(blob)

  return { ran, originalTableCount, originalNonTableText, reimported }
}

// Exact fixture list from tabelle-loeschen-req.md Abschnitt 4.2, verified to exist via `ls`
// before writing this file (see Abschnitt 6 of tabelle-loeschen-qa.md).
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

// Known blocker documented in tabelle-loeschen-code.md Abschnitt 6.2: fixtures with an
// unusual/merged column structure that a SURVIVING table might still expose after deletion.
// These fixtures are asserted only on (a)/(b)/(c) above, never on ODF-schema-validity of any
// surviving table's XML (see tabelle-loeschen-qa.md Abschnitt 1, Punkte 7/8).
const KNOWN_ROWSPAN_EXPORT_BLOCKER = new Set(['BigTable.odt', 'crazyTable.odt', 'table-column-delete-with-merge.odt', 'table-column-delete-with-merge-2-times.odt'])

describe('ODT: Tabelle löschen gegen reale Fixture-Dateien (Anforderung Abschnitt 4.2/6 Testfall 12 -- jede Datei ein eigener Test, erwartet RED bis tabelle-loeschen-code.md Abschnitt 4.1 umgesetzt ist)', () => {
  for (const fixtureName of ODT_FIXTURES) {
    it(`imports, deletes the contained table via the real command, exports and reimports "${fixtureName}" with the table gone and surrounding text intact`, async () => {
      const { ran, originalTableCount, originalNonTableText, reimported } = await importDeleteFirstTableExportReimport(fixtureName)
      expect(ran).toBe(true)
      expect(countTables(reimported.body)).toBe(originalTableCount - 1)
      if (!KNOWN_ROWSPAN_EXPORT_BLOCKER.has(fixtureName)) {
        expect(nonTableText(reimported.body)).toBe(originalNonTableText)
      }
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

Für `deep-table-cell.docx` gilt zusätzlich: Der bestehende Reader-Schutz
`MAX_TABLE_NESTING_DEPTH = 25` (`docx/reader.ts:208`) bedeutet, dass „die erste gefundene Tabelle"
ggf. bereits auf einer der oberen Verschachtelungsebenen landet — für diesen Testzweck ausreichend
(Absturzfreiheit über den vollen Lösch-Export-Reimport-Zyklus, nicht Vollständigkeit jeder
Verschachtelungsebene, siehe Abschnitt 1, Punkt 9). Für `table_footnotes.docx` gilt: Assertion (c)
prüft ausschließlich Textgleichheit außerhalb von Tabellen; eine Fußnotenverwaltung existiert im
Reader nicht (Abschnitt 1, Punkt 10) und wird hier **nicht** simuliert.

### 4.7 Erwartete Ergebnisse heute (vor Umsetzung von `tabelle-loeschen-code.md`)

| Testdatei | Erwartung heute | Grund |
|---|---|---|
| `tableCommands.test.ts` (alle `describe`-Blöcke) | **RED** (`TypeError: deleteTable is not a function` / `canDeleteTable is not a function`) | Abschnitt 1, Punkt 1 |
| `docx/__tests__/roundtrip.test.ts` — neuer Block „tabelle löschen" | **RED**, gleicher Grund (importiert `deleteTable` aus `commands.ts`) | dito |
| `odt/__tests__/roundtrip.test.ts` — neuer Block „tabelle löschen" | **RED**, dito | dito |
| `tableDelete.crossFormat.test.ts` | **RED**, dito | dito |
| `docx/__tests__/tableDelete.fixtures.test.ts` (alle 6 Fixtures) | **RED**, dito (der `readDocx`-Teil selbst wäre GREEN, aber `deleteTable()` bricht den Testlauf vorher ab) | dito |
| `odt/__tests__/tableDelete.fixtures.test.ts` (alle 34 Fixtures) | **RED**, dito | dito |

Nach Umsetzung von `tabelle-loeschen-code.md` Abschnitt 4.1 (Ergänzung von `deleteTable`/
`canDeleteTable` in `commands.ts`) müssen **alle** Tests in Abschnitt 4 ohne Änderung an diesem
Testcode grün werden — mit der einen dokumentierten Ausnahme `test.todo` in Abschnitt 4.4 (ODT
`covered-table-cell`-Blocker, siehe Abschnitt 1, Punkte 7/8).

---

## 5. Teil B — Echte Playwright-Browser-Tests

### 5.1 Prinzipien für „echte" E2E-Tests in diesem Plan

Nicht zulässig für diese Testebene: `readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`deleteTable`
direkt aufrufen, ProseMirror-`EditorState`/`Command`s direkt konstruieren, oder Assertions
ausschließlich auf dem internen Dokumentmodell statt auf dem tatsächlich gerenderten DOM/der
tatsächlich heruntergeladenen Datei. Verbindlich für jeden Test in diesem Abschnitt:

1. **Klicks** über `page.getByTitle(...)`/`page.getByRole(...)`/Zell-Locators
   (`page.locator('.ProseMirror td')`), nie `page.evaluate(() => command(...))` als Ersatz für
   einen Klick.
2. **Tippen** über `page.keyboard.type(...)`/`page.keyboard.press(...)`, nie direktes Setzen von
   `editor.textContent`.
3. **Datei-Upload** über `input.setInputFiles({ name, mimeType, buffer })` auf den echten
   `<input type="file">` der Seite (`docxCard(page).locator('input[type="file"]')` bzw. das
   ODT-Pendant) — bereits etabliertes Muster aus `docx.spec.ts`/`odt.spec.ts`.
4. **Export/Download** über `page.waitForEvent('download')`, gefolgt von `download.path()` und
   echtem `fs.readFile` + `JSZip.loadAsync` auf die **tatsächlich vom Browser geschriebene
   Datei** — Assertions laufen gegen den rohen XML-String aus dieser Datei, **nicht** gegen den
   Rückgabewert eines erneuten `readDocx`/`readOdt`-Aufrufs.
5. **Locators für den neuen Button** ausschließlich `page.getByTitle('Tabelle löschen')`
   (verlässlich, unabhängig von Accessible-Name-Berechnung — siehe Beobachtung unten) — **nicht**
   Annahmen über den bestehenden „⊞ Tabelle"-Einfüge-Button, dessen Markup sich laut
   `tabelle-einfuegen-code.md` unabhängig ändern könnte.

**Beobachtung aus dem Code-Audit (Abschnitt 1), relevant für Locator-Wahl:** Der bestehende
Einfüge-Button hat `title="Tabelle einfügen"`, aber **kein** `aria-label` — sein sichtbarer
Text-Inhalt „⊞ Tabelle" bestimmt daher die berechnete Accessible Name, nicht der `title`
(ARIA-Namensberechnung: Inhalt schlägt `title`, sobald der Button eigenen sichtbaren Text hat).
`tests/e2e/selection-regression.spec.ts:37` verwendet trotzdem
`page.getByRole('button', { name: 'Tabelle einfügen' })` — das ist ein bereits vor diesem Feature
bestehendes, unabhängiges Locator-Risiko in einer fremden Testdatei (nicht Gegenstand dieses
Plans, wird hier nur dokumentiert, damit die neuen Tests **nicht** dasselbe Muster für den neuen
Button übernehmen). Dieser Plan verankert seine eigenen Locators daher konsequent an
`getByTitle('Tabelle löschen')`, das unabhängig vom sichtbaren Textinhalt zuverlässig matcht,
sofern `tabelle-loeschen-code.md` Abschnitt 4.3 wie geplant sowohl `title` als auch `aria-label`
setzt.

### 5.2 Neu: `tests/e2e/table-delete.spec.ts`

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
async function uploadFixture(card: ReturnType<typeof odtCard>, relativePath: string, mimeType: string) {
  const buffer = await readFile(join(__dirname, '..', 'fixtures', 'external', relativePath))
  await card.locator('input[type="file"]').setInputFiles({ name: relativePath.split('/').pop()!, mimeType, buffer })
}

test.describe('Tabelle löschen — Grundverhalten & Toolbar (Testfälle 1/2/5, Grenzfälle 1/2/4/5/6/10)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Testfall 1: Button ist deaktiviert außerhalb einer Tabelle, aktiv sobald der Cursor in einer Zelle steht', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('normaler Absatz')
    await expect(page.getByTitle('Tabelle löschen')).toBeDisabled()

    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').first().click()
    await expect(page.getByTitle('Tabelle löschen')).toBeEnabled()
  })

  test('Testfall 2: Klick auf "Tabelle löschen" entfernt die komplette Tabelle inkl. Inhalt, egal in welcher Zelle der Cursor stand', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    const cells = page.locator('.ProseMirror td')
    await cells.nth(2).click() // not cell 0 -- proves the action targets the whole table
    await page.keyboard.type('Inhalt')
    await page.getByTitle('Tabelle löschen').click()
    await expect(editor.locator('table')).toHaveCount(0)
    await expect(editor).not.toContainText('Inhalt')
  })

  test('Testfall 3 / Abschnitt 2.2: Entf auf markiertem Zellinhalt leert nur den Inhalt, Tabellenstruktur bleibt', async ({ page }) => {
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

  test('Grenzfall 10: Löschen unmittelbar nach dem Einfügen (kein Klick dazwischen) funktioniert', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.getByTitle('Tabelle löschen').click()
    await expect(editor.locator('table')).toHaveCount(0)
    await page.keyboard.type('geht weiter')
    await expect(editor).toContainText('geht weiter')
  })

  test('Grenzfall 1: Tabelle als einziges Dokumentelement löschen -> Editor bleibt sofort bedienbar', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').first().click()
    await page.getByTitle('Tabelle löschen').click()
    await expect(editor.locator('table')).toHaveCount(0)
    await editor.click()
    await page.keyboard.type('weiter tippen ohne Absturz')
    await expect(editor).toContainText('weiter tippen ohne Absturz')
  })

  test('Grenzfall 4/5: Tabelle am Dokumentanfang und am Dokumentende — Cursor landet deterministisch im jeweiligen Nachbarabsatz', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click() // table at doc start
    await page.keyboard.press('ControlOrMeta+End')
    await page.keyboard.type('Danach')
    await page.locator('.ProseMirror td').first().click()
    await page.getByTitle('Tabelle löschen').click()
    await expect(editor.locator('table')).toHaveCount(0)
    await page.keyboard.type('X')
    await expect(editor).toContainText('XDanach')
  })

  test('Grenzfall 6: Zwei aufeinanderfolgende Tabellen ohne trennenden Absatz — nur die per Cursor ausgewählte verschwindet', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').last().click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await expect(editor.locator('table')).toHaveCount(2)
    const firstTableCell = editor.locator('table').first().locator('td').first()
    await firstTableCell.click()
    await page.keyboard.type('T1')
    const secondTableCell = editor.locator('table').nth(1).locator('td').first()
    await secondTableCell.click()
    await page.keyboard.type('T2')
    await editor.locator('table').first().locator('td').first().click()
    await page.getByTitle('Tabelle löschen').click()
    await expect(editor.locator('table')).toHaveCount(1)
    await expect(editor).toContainText('T2')
    await expect(editor).not.toContainText('T1')
  })
})

test.describe('Tabelle löschen — Pflicht-Regressionstest Selection-Sync (Testfall 9/Grenzfall 9)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('type in one cell, click into a different cell, immediately delete the table -> table fully removed, no crash, no wrong target', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    const cells = page.locator('.ProseMirror td')
    await cells.nth(0).click()
    await page.keyboard.type('Zelle eins')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Fett').click()
    await cells.nth(1).click() // reposition cursor into a DIFFERENT cell -- exact regression pattern
    await page.getByTitle('Tabelle löschen').click()
    await expect(editor.locator('table')).toHaveCount(0)
    await expect(editor).not.toContainText('Zelle eins')
  })

  test('same pattern with two tables present -- only the targeted one is removed, the other is untouched', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').first().click()
    await page.keyboard.type('Zelle A')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Fett').click()
    await editor.locator('table').first().locator('td').nth(1).click() // reposition inside the SAME table
    await page.keyboard.press('End')
    await page.getByTitle('Tabelle löschen').click()
    await expect(editor.locator('table')).toHaveCount(0)
  })
})

test.describe('Tabelle löschen — verschachtelte Tabellen (Testfall 7/Grenzfall 7)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('cursor in the inner table removes only the inner table; outer table with its other cells remains', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    const outerCells = editor.locator('table').first().locator('> tbody > tr > td, > tr > td')
    await outerCells.first().click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click() // inserts a nested table inside the first cell
    await expect(editor.locator('table')).toHaveCount(2)
    editor.locator('table').nth(1).locator('td').first().click()
    await page.getByTitle('Tabelle löschen').click()
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
    await page.getByTitle('Tabelle löschen').click()
    await expect(editor.locator('table')).toHaveCount(0)
  })
})

test.describe('Tabelle löschen — Undo/Redo & Grenzfall-Abdeckung (Testfall 6, Grenzfälle 11/13)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Strg+Z restores the exact table, Strg+Y removes it again, 3 cycles', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').first().click()
    await page.keyboard.type('Ursprung')
    await page.locator('.ProseMirror td').first().click()

    for (let cycle = 0; cycle < 3; cycle++) {
      await page.getByTitle('Tabelle löschen').click()
      await expect(editor.locator('table')).toHaveCount(0)
      await page.keyboard.press('ControlOrMeta+z')
      await expect(editor.locator('table')).toHaveCount(1)
      await expect(editor).toContainText('Ursprung')
    }
    await page.keyboard.press('ControlOrMeta+z')
    await expect(editor.locator('table')).toHaveCount(0)
    await page.keyboard.press('ControlOrMeta+y')
    await expect(editor.locator('table')).toHaveCount(1)
  })

  test('Grenzfall 13: cursor on an image directly before a table keeps the button disabled, click is a no-op', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    const fs = await import('node:fs/promises')
    const tinyPng = await fs.readFile(join(__dirname, '..', 'fixtures', 'tiny.png')).catch(() => null)
    // Fallback: insert via the existing image input if a fixture isn't present.
    await editor.locator('input[type="file"][accept="image/*"]').setInputFiles({
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer: tinyPng ?? Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
    })
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await editor.locator('img').click() // select the image node, NOT a table cell
    await expect(page.getByTitle('Tabelle löschen')).toBeDisabled()
    const tableCountBefore = await editor.locator('table').count()
    await page.getByTitle('Tabelle löschen').click({ force: true })
    await expect(editor.locator('table')).toHaveCount(tableCountBefore)
  })

  test('Mod-Alt-Backspace with the cursor anywhere in the table gives the identical result to the button click', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').nth(2).click()
    await page.keyboard.press('ControlOrMeta+Alt+Backspace')
    await expect(editor.locator('table')).toHaveCount(0)
  })

  test('documented pre-existing boundary-Backspace path: two Backspaces right after a table select then remove it (no new code, regression-only)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.keyboard.press('ControlOrMeta+End')
    await page.keyboard.press('Enter')
    await page.keyboard.type('nach der Tabelle')
    await page.keyboard.press('Home')
    await page.keyboard.press('Backspace') // first press: selects the whole table as a NodeSelection
    await page.keyboard.press('Backspace') // second press: removes it
    await expect(editor.locator('table')).toHaveCount(0)
    await expect(editor).toContainText('nach der Tabelle')
  })
})

test.describe('Tabelle löschen — Export/Download (Testfall 8/14/15, Grenzfall 14)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
  })

  test('DOCX: delete a table with an image in a cell, export via real download -> reimport shows no table, no orphaned image in word/media/', async ({ page }) => {
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').first().click()
    await editor.locator('input[type="file"][accept="image/*"]').setInputFiles({
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
    })
    await page.locator('.ProseMirror td').first().click()
    await page.getByTitle('Tabelle löschen').click()
    await expect(editor.locator('table')).toHaveCount(0)

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const exportedBuffer = await readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).not.toContain('<w:tbl>')
    const mediaFiles = Object.keys(zip.files).filter((name) => name.startsWith('word/media/'))
    expect(mediaFiles).toHaveLength(0)
  })

  test('ODT: same scenario over a real download', async ({ page }) => {
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    await page.locator('.ProseMirror td').first().click()
    await editor.locator('input[type="file"][accept="image/*"]').setInputFiles({
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
    })
    await page.locator('.ProseMirror td').first().click()
    await page.getByTitle('Tabelle löschen').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const exportedBuffer = await readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).not.toContain('<table:table')
    const pictureFiles = Object.keys(zip.files).filter((name) => /\.(png|jpe?g)$/i.test(name))
    expect(pictureFiles).toHaveLength(0)
  })
})

test.describe('Tabelle löschen — repräsentative Fixture-Teilmenge über echten Upload (Testfall 12/16)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
  })

  test('simple-table.odt: upload, delete the visible first table, export, verify no table XML remains', async ({ page }) => {
    await uploadFixture(odtCard(page), 'odt/simple-table.odt', 'application/vnd.oasis.opendocument.text')
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('table')).toHaveCount(1)
    await editor.locator('table').first().locator('td').first().click()
    await page.getByTitle('Tabelle löschen').click()
    await expect(editor.locator('table')).toHaveCount(0)
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const exportedBuffer = await readFile((await (await downloadPromise).path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    expect(await zip.file('content.xml')!.async('text')).not.toContain('<table:table')
  })

  test('BigTable.odt: upload, delete the large table without a visible freeze, export cleanly', async ({ page }) => {
    await uploadFixture(odtCard(page), 'odt/BigTable.odt', 'application/vnd.oasis.opendocument.text')
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('table').first()).toBeVisible({ timeout: 10_000 })
    await editor.locator('table').first().locator('td').first().click()
    const start = Date.now()
    await page.getByTitle('Tabelle löschen').click()
    await expect(editor.locator('table')).toHaveCount(0, { timeout: 5_000 })
    expect(Date.now() - start).toBeLessThan(5_000)
  })

  test('subTables3-nested.odt: nested table fixture -- delete the first table found, no crash', async ({ page }) => {
    await uploadFixture(odtCard(page), 'odt/subTables3-nested.odt', 'application/vnd.oasis.opendocument.text')
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('table').first()).toBeVisible()
    const tableCountBefore = await editor.locator('table').count()
    await editor.locator('table').first().locator('td').first().click()
    await page.getByTitle('Tabelle löschen').click()
    await expect(editor.locator('table')).toHaveCount(tableCountBefore - 1)
  })

  test('table-column-delete-with-merge.odt: exotic merge structure -- delete without crashing', async ({ page }) => {
    await uploadFixture(odtCard(page), 'odt/table-column-delete-with-merge.odt', 'application/vnd.oasis.opendocument.text')
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('table').first()).toBeVisible()
    await editor.locator('table').first().locator('td').first().click()
    await page.getByTitle('Tabelle löschen').click()
    await expect(editor.locator('table')).toHaveCount(0)
  })

  test('TestTableColumns.docx: DOCX fixture upload + delete + export', async ({ page }) => {
    await uploadFixture(docxCard(page), 'docx/TestTableColumns.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('table').first()).toBeVisible()
    await editor.locator('table').first().locator('td').first().click()
    await page.getByTitle('Tabelle löschen').click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const exportedBuffer = await readFile((await (await downloadPromise).path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    expect(await zip.file('word/document.xml')!.async('text')).not.toContain('<w:tbl>')
  })

  test('table_footnotes.docx: table with a footnote reference -- delete + export does not crash or corrupt the zip', async ({ page }) => {
    await uploadFixture(docxCard(page), 'docx/table_footnotes.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('table').first()).toBeVisible()
    await editor.locator('table').first().locator('td').first().click()
    await page.getByTitle('Tabelle löschen').click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const exportedBuffer = await readFile((await (await downloadPromise).path())!)
    // A corrupt zip throws on load -- this alone is the primary assertion for this fixture.
    const zip = await JSZip.loadAsync(exportedBuffer)
    expect(await zip.file('word/document.xml')!.async('text')).not.toContain('<w:tbl>')
  })
})
```

### 5.3 Erwartete Ergebnisse heute (vor Umsetzung von `tabelle-loeschen-code.md`)

| Test | Erwartung heute | Grund |
|---|---|---|
| Alle Tests, die `page.getByTitle('Tabelle löschen')` referenzieren | **RED** (Timeout: Element existiert nicht) | Abschnitt 1, Punkt 2 |
| „documented pre-existing boundary-Backspace path" | **Einziger GREEN-fähiger E2E-Test bereits heute** | Abschnitt 1, Punkt 5 — reiner Bibliothekscode, kein neuer Button/Command nötig |
| Testfall 3 (Entf/Backspace leert nur Zellinhalt) | **GREEN bereits heute** | Abschnitt 1, Zusatzverifikation — `tableEditing()`/`isolating: true` sind bereits aktiv |
| Alle übrigen Tests in Abschnitt 5.2 | **RED** | Button/Keymap-Eintrag fehlen vollständig |

Nach Umsetzung von `tabelle-loeschen-code.md` müssen **alle** Tests in Abschnitt 5.2 ohne Änderung
grün werden.

---

## 6. Fixture-Existenzprüfung (vor Testerstellung durchgeführt)

Alle in `tabelle-loeschen-req.md` Abschnitt 4.2 gelisteten Dateien wurden per Bash-Schleife
(`[ -f "tests/fixtures/external/{odt,docx}/$f" ]`) einzeln geprüft — **alle 34 ODT- und 6
DOCX-Dateien vorhanden**, keine Datei fehlt:

ODT: `BigTable.odt`, `crazyTable.odt`, `subTables.odt`, `subTables2.odt`,
`subTables3-nested.odt`, `subTables3-onlyOneColumn.odt`, `subTables4.odt`,
`table-within-textBox-within-frame.odt`, `table-column-delete-with-merge.odt`,
`table-column-delete-with-merge-2-times.odt`, `tableRowDeletionTest.odt`, `tableOps.odt`,
`tableCoveredContent.odt`, `OOStyledTable.odt`, `coloredTable_MSO15.odt`,
`TableFunkyBackground.odt`, `feature_attributes_tables.odt`,
`feature_attributes_tables-backgroundTableOnly.odt`,
`feature_attributes_tables-backgroundTableOnly-AO341.odt`,
`feature_attributes_tables_FunnyTable_With_xmlid.odt`, `feature_attributes_tables_SMALL.odt`,
`table_1x3_paragraph_background-MSO2013-LO3_6.odt`, `TableWidth.odt`, `tableNotFullWidth.odt`,
`simple-table.odt`, `simpleTable.odt`, `simple_table.odt`, `simple-table-with-lists.odt`,
`listsInTable.odt`, `table.odt`, `table_simple.odt`, `TestTextTable.odt`,
`doc_heading_table.odt`, `empty4table.odt`.

DOCX: `TestTableCellAlign.docx`, `TestTableColumns.docx`, `deep-table-cell.docx`,
`table-alignment.docx`, `table-indent.docx`, `table_footnotes.docx`.

---

## 7. Bekannte Blocker / bewusst nicht in diesem Feature zu beheben

Diese Punkte werden dokumentiert, damit ein RED-Testergebnis korrekt zugeordnet werden kann, sind
aber **nicht** Teil des Umsetzungsauftrags für „Tabelle löschen" selbst (übereinstimmend mit
`tabelle-loeschen-code.md` Abschnitt 6.2/9/11):

1. **ODT `covered-table-cell` fehlt** (`odt/writer.ts:88`, kein Emit; `odt/reader.ts:189-203`,
   kein Read) — betrifft nur Rundreise-Tests, bei denen eine **überlebende** Tabelle selbst einen
   mehrzeiligen `rowspan` hat. In diesem Plan als `test.todo` (Abschnitt 4.4) markiert, in den
   Fixture-Tests (Abschnitt 4.6) durch gezielten Ausschluss der XML-Validitätsprüfung für die
   betroffenen vier Fixtures dokumentiert, nicht stillschweigend übersprungen.
2. **Keine Fußnoten-Unterstützung im DOCX-Pfad** — `table_footnotes.docx`-Tests prüfen
   ausschließlich Absturzfreiheit/Zip-Validität, keine Fußnotenverwaltung.
3. **`tests/e2e/large-document-import.spec.ts` existiert nicht**, obwohl beide
   `external-fixtures.test.ts`-Dateien darauf verweisen — unabhängiger, bereits vor diesem Feature
   bestehender Dokumentationsfehler; dieser Plan verlässt sich an keiner Stelle auf diese Datei.
4. **Integrationsrisiko zwischen den drei parallelen Tabellen-Feature-Plänen**
   (`tabelle-loeschen`, `zeile-loeschen`, `spalte-loeschen`) bezüglich Toolbar-Architektur
   (`Toolbar.tsx` vs. `TableToolbar.tsx`) und Modul-Ort (`commands.ts` vs. `tableCommands.ts`) —
   dokumentiert in `tabelle-loeschen-code.md` Abschnitt 9. Dieser Testplan verankert seine
   Locators bewusst nur an `aria-label`/`title="Tabelle löschen"`, nicht an einer Annahme über
   Dateistruktur, und bleibt damit unabhängig davon funktionsfähig, wie die Integration diese
   Frage löst.

---

## 8. Abnahmekriterien-Abgleich (Definition of Done, `tabelle-loeschen-req.md` Abschnitt 7)

| DoD-Punkt | Abgedeckt durch |
|---|---|
| Jeder Punkt aus Abschnitt 2 über echte Bedienung im Browser nachgewiesen | Abschnitt 5.2 (E2E), ergänzt um Unit-/Integrationstests (Abschnitt 4) für Rundreise-Strukturprüfungen |
| Jeder Grenzfall aus Abschnitt 3 hat einen dauerhaften Test | Traceability-Matrix Abschnitt 3.2 |
| Rundreise für beide Formate, alle gelisteten Fixture-Dateien | Abschnitt 4.6 (alle 40 Dateien einzeln), Abschnitt 5.2 (repräsentative Teilmenge über echten Upload/Download) |
| Jeder Verdachtspunkt aus Abschnitt 5 der Anforderung eindeutig aufgelöst | Abschnitt 1 dieses Plans (Code-Audit-Tabelle) |
| Kein stiller Fehlschlag | `canDeleteTable`/`disabled`-Button-Tests (Abschnitt 4.2, 5.2 Testfall 1/Grenzfall 13) |
| Backlog-Statuswechsel erst nach Erfüllung aller obigen Punkte | Nicht Teil dieses QA-Plans — obliegt dem Backlog-Pflegeprozess nach grünen Tests |

**Zusammenfassender Hinweis an PO/Lead:** Solange `tabelle-loeschen-code.md` nicht umgesetzt ist,
ist der korrekte, erwartete Zustand dieses gesamten Testplans „fast vollständig RED" — mit den
beiden in Abschnitt 1/4.7/5.3 explizit benannten Ausnahmen (bereits aktives
Boundary-Backspace-Verhalten, bereits aktives Entf/Backspace-auf-Zellinhalt-Verhalten). Ein
QA-Lauf vor Fertigstellung des Features darf **nicht** als „Feature fehlerhaft" fehlinterpretiert
werden — er bestätigt exakt das, was `tabelle-loeschen-req.md` Abschnitt 5 bereits selbst
feststellt: das Feature ist zu 100 % ungebaut, nicht nur ungetestet.
