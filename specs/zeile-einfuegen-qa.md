# Testplan „Zeile einfügen (oberhalb/unterhalb)" (QA)

Bezug: `E:\docs\specs\zeile-einfuegen-req.md` (Anforderung, Stand geprüft
2026-07-04), `E:\docs\specs\zeile-einfuegen-code.md` (Umsetzungsplan, Stand
geprüft 2026-07-04). Geltungsbereich: identisch zur Anforderungsdatei — die
Zeile-einfügen-Funktion (oberhalb/unterhalb) im gemeinsamen DOCX/ODT-Editor
(`src/formats/shared/editor/`), inklusive der laut Umsetzungsplan neuen
Exporte `insertRowBefore`/`insertRowAfter`/`goToTableCell`/
`insertRowOnTabAtTableEnd` in `src/formats/shared/editor/commands.ts`, der
zwei neuen Toolbar-Buttons in `Toolbar.tsx` und der `Tab`/`Shift-Tab`-Keymap-
Ergänzung in `WordEditor.tsx`.

> **Kritische Korrektur gegenüber einer früheren Fassung dieses QA-Dokuments
> (bewusst dokumentiert, analog zu `zeile-einfuegen-code.md` Abschnitt 12):**
> Eine frühere Fassung dieses Testplans verlangte, im Rahmen dieses Tickets
> einen „`odt/writer.ts`-Bug" zu beheben (fehlendes `<table:covered-table-cell/>`
> bei `rowspan`, colspan-blinde Spaltenzahl) und bezeichnete den entsprechenden
> ODT-Rundreise-Testblock als „wichtigsten Unit-Testblock, der den einzigen
> existierenden Bug aufdeckt". **Diese Annahme ist gegen den aktuellen Code
> falsch und wurde vollständig entfernt.** Verifiziert am tatsächlichen
> Dateiinhalt (siehe Codebefund Abschnitt 0 unten): Der ODT-Writer schreibt
> `<table:covered-table-cell/>` bereits sowohl für horizontale (`colspan`,
> `odt/writer.ts:160–162`) als auch für vertikale (`rowspan`, über den
> `pending[]`-Tracker, `odt/writer.ts:134–137/165–167`) Merges, berechnet
> `colCount` colspan-bewusst als Summe der colspans der ersten Zeile
> (`odt/writer.ts:115–116`, identisch zu `docx/writer.ts`) und vergibt
> Tabellennamen deterministisch (`TableNameSequence`, `odt/writer.ts:54`). Die
> passenden Roh-`content.xml`-Tests **existieren bereits** (colspan:
> `odt/__tests__/roundtrip.test.ts:275`, rowspan: `:310`). **Dieses Ticket
> ändert weder Writer noch Reader noch Schema** (`zeile-einfuegen-code.md`
> Abschnitt 1/6.4/7/12, `zeile-einfuegen-req.md` Befund 0.6). Der Export-Teil
> ist damit reiner **Regressionsschutz**, kein Bugfix. Wer diesen Testplan
> gegen einen erneut behaupteten „ODT-Writer-Bug" abgleicht, prüfe zuerst
> `odt/writer.ts` Zeile 110–174 im Ist-Code, bevor er den Befund übernimmt.

Status dieses Dokuments: Testplan **vor** vollständiger Umsetzung von
`zeile-einfuegen-code.md` verfasst. Alle unten genannten Testfälle für noch
nicht existierenden Code (`insertRowBefore`/`insertRowAfter`, die zwei
Toolbar-Buttons, die `Tab`-Keymap-Kette) sind zum jetzigen Zeitpunkt
**rot/nicht ausführbar** — sie sind die Abnahmekriterien, gegen die die
Umsetzung aus `zeile-einfuegen-code.md` Abschnitt 10 (Reihenfolge der
Umsetzung) läuft. Tests gegen bereits existierenden Code (Baseline-Rundreise,
bestehender Selection-Sync-Regressionstest, bestehende
`describe('… round trip: tables')`-Blöcke inkl. der vorhandenen
`covered-table-cell`-Roh-XML-Tests) sind schon heute ausführbar und müssen
vor **und** nach jeder Änderung als Referenzlauf grün sein.

Grundsatz aus `zeile-einfuegen-req.md` Abschnitt 6, Punkt 4, hier verbindlich
umgesetzt: **Unit-Tests mit direkt konstruierten `ProseMirrorJSON`-Fixtures
allein reichen nicht** — das ist exakt die Lücke, die Befund 0.5/0.7 der
Anforderungsdatei beschreibt (Reader/Writer wurden bisher nur gegen von Hand
gebaute Fixtures getestet, nie gegen eine über echte Bedienung erzeugte
Tabellenstruktur). Jede funktionale Anforderung, die über eine Bedienhandlung
ausgelöst wird (Toolbar-Klick, Tastatur, Datei-Export/-Upload), bekommt
zusätzlich einen echten Playwright-Browser-Test, der tatsächlich in eine
Tabellenzelle klickt, den neuen Button klickt, tippt, den Export-Download
abfängt und die heruntergeladene Datei inhaltlich (nicht nur visuell) prüft —
nicht nur eine interne Command-/Reader-/Writer-Funktion direkt aus dem
Testprozess aufruft.

---

## 0. Verifizierter Codebefund für diesen Testplan (Ist-Stand 2026-07-04)

Damit die Testfälle unten gegen reale Fundstellen und nicht gegen einen
überholten Befund geschrieben sind, wurde der relevante Code direkt geprüft:

1. **ODT-Writer bereits ODF-konform (kein Bug).** `src/formats/odt/writer.ts`,
   `case 'table'` (Zeile 110–174): `colCount = Summe der colspans der ersten
   Zeile` (115–116); `pending[]`-Tracker (126) für vertikale Merges; schreibt
   `<table:covered-table-cell/>` für horizontal überdeckte (160–162) **und**
   vertikal überdeckte (134–137, gesetzt in 165–167) Rasterzellen;
   deterministische Tabellennamen via `TableNameSequence` (54). **Keine
   Änderung durch dieses Ticket.**
2. **DOCX-Writer bereits korrekt.** `src/formats/docx/writer.ts`, `tableToDocx`:
   `colCount` als Summe der colspans, `pending[]`, `<w:vMerge/>`-Continuation
   pro überdeckter Rasterzelle. **Keine Änderung durch dieses Ticket.**
3. **Vorhandene Tabellen-Rundreise-Tests (müssen grün bleiben, werden nicht
   neu geschrieben):**
   * `src/formats/docx/__tests__/roundtrip.test.ts`,
     `describe('DOCX round trip: tables')` **ab Zeile 229**:
     `it('preserves rows, columns, and cell text')` (230),
     `it('preserves merged cells (colspan)')` (261),
     `it('preserves vertically merged cells (rowspan)')` (279, echtes
     `rowspan: 2` über zwei Zeilen).
   * `src/formats/odt/__tests__/roundtrip.test.ts`,
     `describe('ODT round trip: tables')` **ab Zeile 219**:
     `it('preserves rows, columns, and cell text')` (220),
     `it('preserves merged cells (colspan/rowspan)')` (251, Reader-Rückweg),
     `it('emits ODF-compliant covered-table-cell placeholders for a horizontal
     (colspan) merge')` (**275**, Roh-`content.xml` via `JSZip.loadAsync`),
     `it('emits ODF-compliant covered-table-cell placeholders for a vertical
     (rowspan) merge')` (**310**, Roh-XML: Zeile 2 beginnt mit
     `<table:covered-table-cell/><table:table-cell`).
   * **Konsequenz:** Ein echter zweizeiliger rowspan-Test **mit Roh-XML** und
     ein colspan-Roh-XML-Test existieren für ODT **bereits**. Neu zu bauen ist
     **nicht** „der fehlende rowspan-Test", sondern ausschließlich der
     dedizierte Grenzfall-5-Regressionstest (Zeile *oberhalb* einer
     Merge-Zeile 0 einfügen, siehe DR-01/OR-03 unten).
4. **Keine Tests für Zeilenoperationen.** Kein `addRow`/`insertRow`/
   „Zeile einfügen" in `tests/` oder `src/**/__tests__`. Noch keine
   `tests/e2e/zeile-einfuegen.spec.ts`.
5. **Bedien-/Locator-Konventionen (aus dem echten Code abgeleitet):**
   * Toolbar-Buttons setzen `title` **und** `aria-label` gleich
     (`Toolbar.tsx:73–74`) — die neuen Buttons heißen laut Umsetzungsplan
     `„Zeile oberhalb einfügen"` / `„Zeile unterhalb einfügen"`. Damit
     funktionieren **sowohl** `page.getByRole('button', { name: 'Zeile
     oberhalb einfügen' })` (über `aria-label`, bevorzugt wegen
     Barrierefreiheit # 8) **als auch** `page.getByTitle('Zeile oberhalb
     einfügen')`.
   * Tabelle einfügen: `page.getByRole('button', { name: 'Tabelle
     einfügen' })`. Fett: `page.getByTitle('Fett')`. Export:
     `page.getByRole('button', { name: 'Exportieren' })`. Alle drei sind im
     Ist-Code so vorhanden und in bestehenden E2E-Tests bereits genutzt.
   * Upload/Import: `card.locator('input[type="file"]').setInputFiles({ name,
     mimeType, buffer })` (Muster aus `tests/e2e/docx.spec.ts:96/112/242`).
   * Download lesen: `const d = await page.waitForEvent('download'); const p =
     await d.path(); const buf = await fs.readFile(p!)` (Muster aus
     `docx.spec.ts:79–86`).
   * Playwright-Projekte (`playwright.config.ts:27–52`): **Desktop Chrome**,
     **Mobile** (Pixel 7), **Tablet** (iPad Mini). Die Clipboard-only-Projekte
     Desktop Safari/Firefox laufen per `testMatch: /clipboard.*\.spec\.ts/`
     und fassen `zeile-einfuegen.spec.ts` **nicht** an — dieses Feature
     braucht keinen Zwischenablage-Zugriff, daher keine projektspezifischen
     Ausnahmen nötig (anders als `einfuegen-qa.md`).

---

## 1. Teststufen-Übersicht

| Stufe | Werkzeug | Zweck | Abschnitt hier |
|---|---|---|---|
| Unit — Command-Ebene | Vitest (`environment: 'jsdom'`), `EditorState.create` + `wordSchema` direkt, kein `EditorView`/Browser | Schnelle Regressionsprüfung der Wrapper-Commands selbst (Merge-Verlängerung, Spaltenkonsistenz, Selektions-/Undo-Mapping, Tab-Kette) gegen einen konstruierten `ProseMirror`-Zustand | Abschnitt 2.1 |
| Unit — Reader/Writer-Rundreise (DOCX + ODT) | Vitest, `writeDocx`/`readDocx`/`writeOdt`/`readOdt` direkt aufgerufen, JSON-Fixtures **plus** über Commands erzeugte Strukturen, inkl. Roh-XML per `JSZip` | Rundreise Import → (Fixture **oder** über Command eingefügte Zeile) → Export → Re-Import, inkl. dediziertem Grenzfall-5-Regressionstest (Roh-XML, beide Formate) | Abschnitt 2.2–2.3 |
| Unit — Cross-Format-Adapter | Vitest, `readDocx→…→writeOdt→readOdt` und umgekehrt | Cross-Format-Rundreise, die laut App-Architektur nur auf Adapter-Ebene (kein Cross-Format-Export in der UI) möglich ist — dokumentierte Einschränkung | Abschnitt 2.4 |
| E2E — echte Browser-Bedienung | Playwright, `.ProseMirror td`-Klick, `getByRole/getByTitle`-Button-Klick, `keyboard.type/press`, `input.setInputFiles(...)`, `waitForEvent('download')` + `JSZip.loadAsync` auf der echten heruntergeladenen Datei | Kernstück: Zeile tatsächlich per Klick einfügen, deterministisch (Selektions-Sync abwarten) danach tippen/formatieren, exportieren, heruntergeladene Datei entpacken und prüfen, reimportieren | Abschnitt 3 |
| Manuell/exploratory | Echte, lokal installierte LibreOffice-/Word-Instanz; große Tabelle (>5 Spalten/>10 Zeilen) im laufenden Browser | Grenzfall 14 (Performance-Eindruck), Sichtprüfung des ODT-Exports in einer echten Zielanwendung (Anforderung Abschnitt 0.6/2, „nicht nur durch unseren eigenen Reader wieder einlesbar") | Abschnitt 3.9 |

Alle drei nicht-clipboard Playwright-Projekte (Desktop Chrome, Mobile, Tablet)
laufen mit den deterministischen Klick-/Tipp-Interaktionen unten mit.

---

## 2. Unit-Tests: Command-Ebene und Reader/Writer-Rundreise (DOCX + ODT)

### 2.1 Neue Datei `src/formats/shared/editor/__tests__/tableRowCommands.test.ts`

Direkter Test der in `zeile-einfuegen-code.md` Abschnitt 6.1 spezifizierten
Commands gegen einen mit `EditorState.create` konstruierten Testzustand
(Anforderung Abschnitt 6, Testplanhinweis 2) — unabhängig vom Browser,
Muster analog zu `src/formats/shared/editor/__tests__/pagination.test.ts`.

```ts
import { EditorState } from 'prosemirror-state'
import { tableEditing, CellSelection } from 'prosemirror-tables'
import { chainCommands } from 'prosemirror-commands'
import { history, undo, redo } from 'prosemirror-history'
import { wordSchema } from '../../schema'
import {
  insertRowBefore,
  insertRowAfter,
  goToTableCell,
  insertRowOnTabAtTableEnd,
} from '../commands'
```

Helper: `buildTable(rows)` konstruiert eine `table`-Node aus einem
verschachtelten Array von Zellbeschreibungen (`{ text, colspan?, rowspan? }`)
über `wordSchema.nodeFromJSON(...)`, analog zu den bestehenden
`doc()`/`paragraph()`-Helpern in `roundtrip.test.ts`. Der Testzustand wird als
`EditorState.create({ doc, plugins: [history(), tableEditing()] })` erstellt
(`history()` ist für die Undo/Redo-Fälle nötig, `tableEditing()` für
`fixTables` in Grenzfall 9). Jeder Testfall dispatcht über
`command(state, (tr) => { state = state.apply(tr) })` und prüft
`state.doc.toJSON()` sowie `state.selection`.

**Determinismus auf Unit-Ebene:** keine Timer, keine `EditorView` — jede
Transaktion wird synchron mit `state.apply(tr)` verrechnet. Selektion und
Undo werden über `tr.mapping`/`history()` deterministisch geprüft, keine
Race-Condition möglich (die betrifft nur die DOM-Ebene, Abschnitt 3).

| ID | Testfall | Eingabe | Erwartung | Bezug |
|---|---|---|---|---|
| TC-01 | `insertRowBefore`, Grundfall | 2×2-Tabelle, Cursor in Zeile 2 | 3 Zeilen danach; neue Zeile unmittelbar **vor** der bisherigen Zeile 2; neue Zeile hat 2 leere Zellen (je min. 1 leerer `paragraph`, keine Marks) | Anforderung 3.1/3.5 |
| TC-02 | `insertRowAfter`, Grundfall | wie TC-01 | neue Zeile unmittelbar **nach** der Cursor-Zeile | Anforderung 3.2 |
| TC-03 | Grenzfall 1: Tabelle mit nur 1 Zeile | 1×2-Tabelle | nach `insertRowBefore` **und** separat nach `insertRowAfter`: je 2 Zeilen, beide Zellen der neuen Zeile leer | Grenzfall 1 |
| TC-04 | Grenzfall 2: Einfügen innerhalb eines rowspan-Bereichs | 3-Zeilen-Tabelle, Zelle A hat `rowspan: 3`, Cursor in Zeile 2 | `rowspan` der Zelle A wird auf 4 erhöht, **keine** neue eigenständige Zelle an dieser Spaltenposition, keine verwaiste Referenz | Anforderung 3.3, Grenzfall 2 |
| TC-05 | Grenzfall 3: Nachbarzeile hat `colspan` | Zeile 1: eine Zelle `colspan: 2`; Zeile 2: 2 Einzelzellen; Cursor in Zeile 2 | neue Zeile hat exakt 2 Einzelzellen (`colspan: 1` je Zelle), Summe effektive Spalten = 2, kein 1-/3-Zeller-Fehlaufteilung | Grenzfall 3 |
| TC-06 | Grenzfall 5: Zeile **oberhalb** der bisherigen Zeile 1 einfügen, Zeile 1 hatte `colspan: 2` | 2-Zeilen-Tabelle (effektiv 2 Spalten), `insertRowBefore` mit Cursor in Zeile 1 | neue Zeile 0 hat 2 Einzelzellen (Summe colspans = 2, identisch zur übrigen Tabelle); Vorstufe zum Export-Roh-XML-Regressionstest DR-01/OR-03 | Grenzfall 5, Befund 0.6 |
| TC-07 | Anforderung 3.4: Cursor-/Selektionsverhalten | Text-/Zellselektion in einer Zelle vor der Aktion, `insertRowBefore` bzw. `insertRowAfter` | Selektion bleibt in **derselben logischen Zelle** (Vergleich über Zellinhalt, nicht über die rohe Positionszahl); bei `insertRowBefore` verschiebt sich die absolute Position, bei `insertRowAfter` bleibt sie unverändert | Anforderung 3.4 |
| TC-08 | Anforderung 3.6: Undo | `insertRowBefore` dispatchen, dann `undo(state, dispatch)` | Dokument **und** Selektion exakt wie unmittelbar vor dem Einfügen, in **einem** Undo-Schritt (nicht zellenweise) | Anforderung 3.6 |
| TC-09 | Grenzfall 6: `CellSelection` über mehrere Zellen derselben Zeile | `CellSelection` über 2 Zellen in Zeile 1, `insertRowBefore` | genau **eine** neue Zeile, nicht zwei | Grenzfall 6 |
| TC-10 | Grenzfall 7: `CellSelection` markiert eine ganze Zeile | wie Grundfall | Verhalten identisch zu TC-01 | Grenzfall 7 |
| TC-11 | Grenzfall 8: `CellSelection` über mehrere Zeilen | 5-Zeilen-Tabelle, `CellSelection` Zeile 2–4, `insertRowBefore` **und** separat `insertRowAfter` | verbindlich **Variante (a)** (`zeile-einfuegen-code.md` 4.1): **genau eine** neue Zeile relativ zur **obersten** Zeile („oberhalb") bzw. **untersten** Zeile („unterhalb") — **nicht** 3 Zeilen; Test schlägt explizit fehl, falls 3 Zeilen entstehen, akzeptiert kein „irgendein plausibles Ergebnis" | Grenzfall 8, verbindliche Entscheidung |
| TC-12 | Grenzfall 9: strukturell inkonsistente Tabelle | Tabelle mit inkonsistenter Zellenzahl je Zeile per `nodeFromJSON` (unter Umgehung von `fixTables`), Plugins `[tableEditing()]` | nach der ersten dispatchten Transaktion normalisiert `fixTables` via `appendTransaction`, **bevor** `insertRowBefore`/`insertRowAfter` läuft; kein Crash, Struktur danach valide | Grenzfall 9 |
| TC-13 | Grenzfall 10: verschachtelte Tabelle | äußere Tabelle, eine Zelle enthält eine innere `table`-Node | `insertRowBefore` in der **äußeren** Tabelle lässt die innere unverändert (`toJSON()`-Vergleich); `insertRowBefore` **in der inneren** wirkt nicht auf die Zeilenzahl der äußeren | Grenzfall 10 |
| TC-14 | Grenzfall 12: schnelles wiederholtes Auslösen | zwei aufeinanderfolgende `insertRowAfter` auf dem jeweils fortgeschriebenen `state` | zwei separate neue Zeilen | Grenzfall 12 |
| TC-15 | Grenzfall 15: Einfügen → Undo → Redo → erneut Einfügen | Sequenz über `undo`/`redo` | jeder Zwischenzustand exakt wie erwartet, keine kumulierten Abweichungen | Grenzfall 15 |
| TC-16 | `goToTableCell(1)` (Tab), Nicht-Endzelle | Cursor in Zelle 1 von 4 | Selektion bewegt sich zu Zelle 2, **keine** neue Zeile | Grenzfall 4 |
| TC-17 | `insertRowOnTabAtTableEnd` in letzter Zelle | Cursor in der letzten Zelle der letzten Zeile; Kette `chainCommands(goToTableCell(1), insertRowOnTabAtTableEnd())` | neue Zeile unterhalb angehängt, Cursor landet in deren **erster** Zelle, alles in **einer** Transaktion (ein Undo macht die gesamte Aktion rückgängig) — insb. den `+1`-Cursor-Offset und `rect.bottom` als neuen Zeilenindex explizit prüfen (`zeile-einfuegen-code.md` 6.1) | Grenzfall 4, 3.6 |
| TC-18 | `goToTableCell(-1)` (Shift-Tab) in der ersten Zelle | Cursor in Zelle 1 | liefert `false`, kein Crash, keine Zeile entsteht | Umsetzungsplan Abschnitt 3, Punkt 4 |
| TC-19 | Tab-Kette **außerhalb** einer Tabelle | Cursor in normalem Absatz | `goToTableCell(1)` **und** `insertRowOnTabAtTableEnd()` liefern beide `false` (über `isInTable`), nativer Fokuswechsel/`liste-einruecken-tab`-Kompatibilität bleibt möglich | Umsetzungsplan Abschnitt 3, Punkt 4 (Anforderung 3.8) |

**Explizit nicht in dieser Datei getestet (per Konstruktion nicht prüfbar):**
ob die Toolbar-Buttons tatsächlich `disabled` sind, ob ein Klick im Browser
ankommt, ob der Export einer echten Datei die neue Zeile enthält — das ist
ausschließlich Gegenstand von Abschnitt 3 (Playwright) bzw. Abschnitt 2.2/2.3
(Reader/Writer direkt).

### 2.2 Erweiterung `src/formats/docx/__tests__/roundtrip.test.ts` (`describe('DOCX round trip: tables')`, ab Zeile 229)

Neue `it(...)`-Blöcke **im bestehenden Describe**, ohne die vorhandenen Tests
(230/261/279) zu verändern.

| ID | Testfall | Aufbau | Erwartung | Bezug |
|---|---|---|---|---|
| DR-01 | **Grenzfall 5, DOCX-Seite — dedizierter, benannter Roh-XML-Regressionstest (Testplanhinweis 6; eigener `it(...)`, nicht Teil eines Bestandstests)** | Tabelle mit `colspan: 2` in Zeile 0 und 2 Einzelzellen in Zeile 1 als JSON; auf einem daraus konstruierten `EditorState` mit `insertRowBefore` eine Zeile **oberhalb der bisherigen Zeile 0** einfügen, `state.doc.toJSON()` als neuen `body` exportieren (`writeDocx`) | **Roh-`word/document.xml`** (via `JSZip.loadAsync`): jede `<w:tr>` deklariert exakt `colCount`-viele Rasterzellen (`<w:tc>`, inkl. der vom `colspan`/`vMerge` erzeugten); die alte Zeile mit `<w:gridSpan w:val="2"/>` bleibt inhaltlich/strukturell unverändert; **kein** Kollaps der Gesamt-Spaltenzahl. Zusätzlich Reader-Rückweg: `readDocx(...)` liefert konsistente Struktur | Grenzfall 5, Befund 0.6, Freigabekriterium Abschnitt 7 |
| DR-02 | Feature-Rundreise 5.2 Punkt 5 (rowspan-Verlängerung, Command-erzeugt) | 3-Zeilen-Tabelle mit `rowspan: 3`-Zelle; `insertRowBefore`/`insertRowAfter` **innerhalb** des Merge-Bereichs; Ergebnis als neuer `body` | `readDocx(await writeDocx(...))`: verlängerter Merge (`rowspan: 4`) bleibt **eine** zusammenhängende Zelle über 4 Zeilen, kein Datenverlust | Anforderung 3.3, Feature-Rundreise 5.2 Punkt 5 |
| DR-03 | Feature-Rundreise 5.2 Punkt 6 (formatierter Nachbarzeilen-Erhalt) | bestehende Zeile mit einer Zelle aus 2 Absätzen, einer davon `strong`; `insertRowAfter` daneben | Export → Re-Import: bestehende, formatierte Zeile **exakt** erhalten (Absatzanzahl, Text, `strong`-Mark) | Feature-Rundreise 5.2 Punkt 6 |

### 2.3 Erweiterung `src/formats/odt/__tests__/roundtrip.test.ts` (`describe('ODT round trip: tables')`, ab Zeile 219)

**Wichtig (Korrektur der früheren Fassung):** Die ODT-Roh-`content.xml`-Tests
für colspan (`:275`) **und** rowspan (`:310`) sowie der Reader-Rückweg-Test
für Merges (`:251`) **existieren bereits und bleiben unverändert** — sie sind
**Baseline-Regressionsschutz** (Abschnitt 3.7), nicht neu zu schreiben. Neu
kommt ausschließlich der Grenzfall-5-Test (OR-03) und der formatierte
Nachbarzeilen-Test (OR-04) hinzu.

| ID | Testfall | Aufbau | Erwartung | Bezug |
|---|---|---|---|---|
| OR-01 | **Bestehender rowspan-Roh-XML-Test (`:310`) — Referenzlauf, kein Neuschrieb** | vorhandene Fixture (`rowspan: 2` über 2 Zeilen) | bleibt grün: `content.xml`-Zeile 2 beginnt mit `<table:covered-table-cell/><table:table-cell` | Baseline-Regressionsschutz 5.1 |
| OR-02 | **Bestehender colspan-Roh-XML-Test (`:275`) — Referenzlauf, kein Neuschrieb** | vorhandene Fixture (`colspan: 2`) | bleibt grün: pro `<table:table-row>` ist Anzahl `<table:table-cell` + `<table:covered-table-cell` = `colCount` | Baseline-Regressionsschutz 5.1 |
| OR-03 | **Grenzfall 5, ODT-Seite — dedizierter, benannter Roh-XML-Regressionstest (analog DR-01)** | Tabelle mit `colspan: 2` (und optional `rowspan`) in Zeile 0; `insertRowBefore` fügt oberhalb ein; `writeOdt` | rohe `content.xml`: `colCount` (Anzahl `<table:table-column/>`) bleibt für die **gesamte** Tabelle konsistent; jede `<table:table-row>` deklariert exakt `colCount` Zellen (`<table:table-cell` + `<table:covered-table-cell`), auch nachdem die alte Zeile 0 zur Zeile 1 wurde | Grenzfall 5, Befund 0.6 |
| OR-04 | Feature-Rundreise 5.2 Punkt 6, ODT-Seite | analog DR-03 | analog DR-03, für ODT | Feature-Rundreise 5.2 Punkt 6 |

**Regressionsvorsicht (Regressionsschutz, kein Bugfix):** Dieses Ticket ändert
`odt/writer.ts` **nicht**. Trotzdem laufen als Referenz die bestehenden
ODT-Fixture-Importtests (`src/formats/odt/__tests__/external-fixtures.test.ts`,
u. a. Tabellen-Fixtures wie `TestTextTable.odt`, `feature_attributes_tables*.odt`,
`crazyTable.odt`, `BigTable.odt`, `OOStyledTable.odt`) mit — sie müssen vor und
nach den `commands.ts`/`Toolbar.tsx`/`WordEditor.tsx`-Änderungen unverändert
grün bleiben (kein Nebenwirkungs-Regressionsfehler durch neue Toolbar-Handler/
Keymap-Bindungen, die beim reinen Import/Anzeigen ungewollt greifen).

### 2.4 Cross-Format-Unit-Tests — nur auf Adapter-Ebene möglich (Anforderung 5.2)

Neue Datei `src/formats/shared/__tests__/cross-format-tablerow.test.ts`.
**Ausschließlich auf Unit-Ebene**, nicht per echter Bedienung: Laut
`zeile-einfuegen-code.md` Abschnitt 4.4 (verifiziert gegen
`src/formats/types.ts`; jedes `FormatModule.exportFile` schreibt nur sein
eigenes Format) besitzt die App **keine** UI-Funktion „als anderes Format
exportieren". Ein als DOCX geöffnetes Dokument kann über die UI nicht als ODT
exportiert werden. **Dokumentierte, strukturelle Einschränkung** — kein still
übersprungener Punkt.

| ID | Testfall | Aufbau | Erwartung |
|---|---|---|---|
| CF-01 | DOCX → Zeile einfügen → als ODT exportieren | `readDocx(...)` → `body`-JSON via `wordSchema.nodeFromJSON` → `EditorState` → `insertRowBefore`/`insertRowAfter` → `tr.doc.toJSON()` als neuer `body` → `writeOdt(...)` → `readOdt(...)` | neue leere Zeile vorhanden, bestehende Zeilen inhaltlich unverändert, `rowspan`/`colspan` korrekt übernommen (inkl. `covered-table-cell`) |
| CF-02 | ODT → Zeile einfügen → als DOCX exportieren | spiegelbildlich zu CF-01 | analog |
| CF-03 | Doppelte Rundreise (Format-Wechsel hin und zurück) mit mehreren, an unterschiedlichen Positionen eingefügten Zeilen (Feature-Rundreise 5.2 Punkt 8) | DOCX → 2× `insertRowBefore`/`insertRowAfter` an verschiedenen Positionen → ODT-Export → ODT-Reimport → erneut DOCX-Export → DOCX-Reimport | kein kumulativer Struktur-/Textverlust nach der zweiten Rundreise |

Dieser Abschnitt wird in der Abnahme-Checkliste (Abschnitt 5) explizit als
„Cross-Format nur auf Unit-/Adapter-Ebene geprüft" vermerkt, damit er nicht
stillschweigend als vollwertig E2E-getestet erscheint (Anforderung Abschnitt
7; `zeile-einfuegen-code.md` Abschnitt 4.4).

### 2.5 Nicht in Unit-Tests abgedeckt (bewusst, siehe Abschnitt 3)

Toolbar-`disabled`-Zustand, echter Mausklick in eine Zelle, echter Datei-
Download/-Upload, Sichtbarkeit des Fehlerbanners (`rowError`), Selection-Sync
über echte Klickfolgen, Touch/Mobile — ausschließlich Abschnitt 3 (Playwright).

---

## 3. E2E-Tests (Playwright) — echte Browser-Bedienung

Neue Datei `tests/e2e/zeile-einfuegen.spec.ts`; Aufbau/Locator-Konventionen
identisch zu den bestehenden Suiten (`docx.spec.ts`, `odt.spec.ts`,
`selection-regression.spec.ts`): `page.goto('/')` → Privacy-Banner wegklicken
(`page.getByRole('button', { name: /verstanden/i }).click()`) →
`docxCard(page)`/`odtCard(page)`-Locator-Helper → `getByRole('button', { name:
'Neu erstellen' })` → `page.locator('.ProseMirror')`.

Jeder Testfall unten führt **tatsächliche Browser-Interaktionen** aus
(`.click()`, `keyboard.type/press`, `input.setInputFiles(...)`,
`waitForEvent('download')`) — **keiner** ruft `insertRowBefore`/`addRowBefore`/
`writeOdt` etc. direkt aus dem Testprozess auf. Das ist die zentrale
Abgrenzung zu Abschnitt 2.

### 3.0 Determinismus-Regeln (verbindlich für alle E2E-Tests hier)

Die Anforderung (und die Aufgabenstellung) verlangen ausdrücklich
deterministische Tests **ohne** Race-Conditions durch zu schnelle
Tastatureingaben; der Selektions-Sync ist abzuwarten. Konkret:

1. **Kein `keyboard.type` unmittelbar nach einem nativen Cursor-Wechsel per
   Klick.** Ein `.ProseMirror td`-Klick setzt die DOM-Selektion; ProseMirror
   erfährt sie erst über das **asynchrone** `selectionchange`-Event (dieselbe
   Mechanik, die `reconcileSelectionOnClick` in `WordEditor.tsx` behandelt und
   die den in `selection-regression.spec.ts` dokumentierten Stale-Selection-
   Bug verursachte). Zwischen `cell.click()` und der nächsten Tastatureingabe
   (bzw. dem Toolbar-Klick, der die Selektion auswertet) muss der Sync landen.
   Bevorzugt über eine **auto-retriegernde Assertion**, die den Zustand
   erzwingt, statt eines blinden Sleeps — z. B.
   `await expect(page.getByRole('button', { name: 'Zeile oberhalb einfügen'
   })).toBeEnabled()` (wird erst wahr, wenn `isInTable(view.state)` nach dem
   Selektions-Sync greift). Wo keine solche Assertion existiert, das im Repo
   bereits etablierte Muster verwenden: `await page.waitForTimeout(50)` (exakt
   wie `selection-regression.spec.ts` nach dem `End`-Tastendruck, mit
   dortiger Begründung).
2. **Nach dem Einfügen-Button, vor dem Tippen (Selection-Sync-Kernprüfung):**
   Der Button-Klick dispatcht die ProseMirror-Transaktion **synchron**, die
   Selektion wird über `tr.mapping` synchron mitgeführt (`zeile-einfuegen-
   code.md` Abschnitt 2, Punkt 4) — hier ist **kein** Sleep nötig. Trotzdem
   wird der Effekt geprüft (E-13/E-14/E-25), weil genau dieser Übergang der
   Selection-Sync-Regressionsschutz ist.
3. **Zählprüfungen auto-retriegernd:** immer
   `await expect(page.locator('.ProseMirror tr')).toHaveCount(n)` statt eines
   sofortigen `.count()` — `toHaveCount` wartet bis zum Timeout auf den
   erwarteten DOM-Zustand und ist damit gegen langsame Renderzyklen robust.
4. **Downloads deterministisch:** `const downloadPromise =
   page.waitForEvent('download')` **vor** dem `Exportieren`-Klick anlegen,
   danach `await downloadPromise` — nie umgekehrt (sonst Race).
5. **Doppelklick-Test (E-24)** prüft bewusst das Race-Verhalten: zwei
   schnelle Klicks müssen **genau** zwei Zeilen erzeugen. Kein künstliches
   Warten dazwischen — der Test verifiziert, dass kein Event-Race eine
   doppelte/fehlende Zeile erzeugt.
6. **Keine Abhängigkeit von Testreihenfolge:** jeder `test()` baut sein
   Dokument im `beforeEach` frisch auf; kein geteilter Zustand zwischen Tests.

### 3.1 Test-Infrastruktur (Helper in `zeile-einfuegen.spec.ts`)

```ts
import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'
import { promises as fs } from 'node:fs'

function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

/** Baut eine 2×2-Tabelle über den echten "⊞ Tabelle"-Button auf und liefert den
 *  Zellen-Locator zurück — der in Anforderung Abschnitt 6.1 vorgeschriebene
 *  primäre Testweg. */
async function insertTableViaToolbar(page: Page) {
  await page.locator('.ProseMirror').click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
  return page.locator('.ProseMirror td')
}

/** Klickt in eine Zelle und wartet deterministisch, bis ProseMirror die
 *  Selektion übernommen hat (isInTable → Button enabled), bevor der Test
 *  fortfährt. Verhindert die selection-sync Race (Determinismus-Regel 1). */
async function focusCellThenWaitInTable(page: Page, cellIndex: number) {
  await page.locator('.ProseMirror td').nth(cellIndex).click()
  await expect(page.getByRole('button', { name: 'Zeile oberhalb einfügen' })).toBeEnabled()
}

async function exportAndUnzip(page: Page, format: 'docx' | 'odt') {
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).toBeTruthy()
  const buffer = await fs.readFile(path!)
  const zip = await JSZip.loadAsync(buffer)
  const xmlPath = format === 'docx' ? 'word/document.xml' : 'content.xml'
  const xml = await zip.file(xmlPath)!.async('text')
  return { zip, xml, buffer }
}
```

Reimport nutzt exakt das Download-Buffer erneut:
`await card.locator('input[type="file"]').setInputFiles({ name: 'rt.' + format,
mimeType: format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/vnd.oasis.opendocument.text', buffer })`.

### 3.2 Grundverhalten der Buttons (Anforderung Abschnitt 1)

Für **beide** Formate (DOCX-Karte **und** ODT-Karte, zwei parallele
`describe`-Blöcke wie in `docx.spec.ts`/`odt.spec.ts`):

| ID | Aktion (echte Bedienung) | Prüfung | Bezug |
|---|---|---|---|
| E-01 | Neues Dokument, Cursor in einen normalen Absatz (kein Klick in eine Tabelle) | beide Buttons `getByRole('button', { name: 'Zeile oberhalb/unterhalb einfügen' })` sind `toBeDisabled()` | Abschnitt 1 # 5, Anforderung 3.7 |
| E-02 | Tabelle via `insertTableViaToolbar`, dann `focusCellThenWaitInTable` in eine Zelle | beide Buttons `toBeEnabled()` (die Assertion in E-02 ist zugleich der Selektions-Sync-Abwart-Schritt) | Abschnitt 1 # 1/# 2 |
| E-03 | wie E-02, Klick „Zeile oberhalb einfügen" | `await expect(page.locator('.ProseMirror tr')).toHaveCount(3)` (von 2) | Abschnitt 1 # 1, Freigabekriterium Abschnitt 7 |
| E-04 | wie E-02, Klick „Zeile unterhalb einfügen" | `tr`-Anzahl 3; neue Zeile **nach** der Cursor-Zeile (Reihenfolge über Zellinhalt geprüft) | Abschnitt 1 # 2 |
| E-05 | nach E-03/E-04: Cursor per Klick außerhalb der Tabelle (in einen Absatz vor/nach der Tabelle) | beide Buttons wieder `toBeDisabled()`, kein dauerhaft „hängender" aktivierter Zustand | Abschnitt 1 # 5 |
| E-06 | Barrierefreiheit: Buttons per `Tab`-Fokus erreichbar, `aria-label` gesetzt, Auslösung mit `Enter`/`Space` | `getByRole('button', { name: 'Zeile oberhalb einfügen' })` existiert (Name aus `aria-label`); fokussiert + `keyboard.press('Enter')` fügt eine Zeile ein | Abschnitt 1 # 8 |

### 3.3 Grundfall, Cursor-Verhalten, Undo/Redo (Anforderung 3.1/3.2/3.4/3.6)

| ID | Aktion | Prüfung | Bezug |
|---|---|---|---|
| E-10 | 3×2-Tabelle (Zellen befüllt), Zeile oberhalb der **ersten** Zeile einfügen | `tr`-Anzahl 4; neue erste Zeile leer; übrige 3 Zeilen inhaltlich in unveränderter Reihenfolge (`.ProseMirror tr` `.nth(n)` je geprüft) | 3.1, Feature-Rundreise 5.2 Punkt 1 |
| E-11 | dieselbe Tabelle, Zeile unterhalb der **letzten** Zeile | `tr`-Anzahl 4; neue letzte Zeile leer; Reihenfolge davor unverändert | 3.2, Feature-Rundreise 5.2 Punkt 2 |
| E-12 | Zeile in der **Mitte** einer 3-Zeilen-Tabelle | Reihenfolge vorher/neu/nachher exakt korrekt (Zellinhalt-Vergleich je Zeile) | Feature-Rundreise 5.2 Punkt 3 |
| E-13 | Cursor via `focusCellThenWaitInTable` in eine **befüllte** Zelle (nicht erste), „Zeile oberhalb einfügen" klicken, **direkt danach** `keyboard.type('XY')` (kein Sleep — Selektion wurde synchron mitgemappt, Determinismus-Regel 2) | getippter Text landet in der **ursprünglichen, unveränderten logischen Zelle** (jetzt eine Zeile tiefer im DOM), **nicht** in der neuen leeren Zeile — Prüfung über `.ProseMirror tr` `.nth(k)` → `td` `.nth(j)`-Text | Anforderung 3.4, Selection-Sync |
| E-14 | wie E-13, aber „Zeile unterhalb einfügen" | getippter Text bleibt in der unveränderten Zelle (DOM-Position unverändert) | Anforderung 3.4 |
| E-15 | nach E-03: `page.keyboard.press('ControlOrMeta+z')` | `await expect(...tr).toHaveCount(2)` — **ein** Strg+Z genügt (kein zellenweises Undo) | Anforderung 3.6 |
| E-16 | nach E-15: `page.keyboard.press('ControlOrMeta+y')` (Fallback `ControlOrMeta+Shift+z`) | `tr`-Anzahl wieder 3, Zustand identisch wiederhergestellt | Anforderung 3.6 |

### 3.4 Grenzfälle über echte Bedienung (Anforderung Abschnitt 4)

| ID | Grenzfall | Aktion | Prüfung |
|---|---|---|---|
| E-20 | #4 Tab in letzter Zelle | 2×2-Tabelle, `focusCellThenWaitInTable(0)`, dann 4× `keyboard.press('Tab')` (Zelle 1→2→3→4→neue Zeile). Zwischen den `Tab`-Drücken ist **keine** async DOM-Selektion im Spiel (Tab läuft über die Keymap, synchrone Transaktion) | `await expect(...tr).toHaveCount(3)`; Cursor in der neuen (dritten) Zeile erster Zelle — geprüft durch sofortiges `keyboard.type('X')` und Kontrolle, dass `'X'` in genau dieser Zelle erscheint; **ein** Strg+Z macht Zeile **und** Cursor-Sprung rückgängig |
| E-21 | #4 Gegenprobe: Tab in **Nicht**-Endzelle | `Tab` aus Zelle 1 heraus | `tr`-Anzahl bleibt 2 (**keine** neue Zeile), Cursor bewegt sich zu Zelle 2 (Regressionsschutz gegen zu aggressives Tab-Binding) |
| E-22 | #11 Tabelle am Dokumentanfang | frisches Dokument, Tabelle direkt via `insertTableViaToolbar`, Zeile oberhalb der ersten Zeile einfügen | kein Crash; Editor bleibt bedienbar: Cursor per `gapCursor`/Klick **vor** die Tabelle setzen (z. B. `ArrowUp` aus Zeile 1 oder Klick oberhalb der Tabellen-Bounding-Box), Tippen an dieser Stelle funktioniert |
| E-23 | #11 Tabelle am Dokumentende | Absatz tippen, Tabelle anhängen, Zeile unterhalb der letzten Zeile einfügen | Editor bleibt bedienbar, Cursor per Klick/`ArrowDown` aus der Tabelle heraus positionierbar |
| E-24 | #12 schnelles wiederholtes Auslösen | „Zeile unterhalb einfügen" **zweimal schnell hintereinander** klicken (kein Warten dazwischen) | genau **2** zusätzliche Zeilen (`toHaveCount(4)`) — kein Event-Race, keine doppelte/fehlende Zeile; danach 2× Strg+Z stellt den Ausgangszustand her (2 unabhängige Undo-Schritte) |
| E-25 | #13 Einfügen + Formatierung danach | „Zeile oberhalb einfügen", Cursor ist (nach 3.4) synchron in der ursprünglichen Zelle, `ControlOrMeta+a` **innerhalb der Zelle**, `getByTitle('Fett').click()` | Fett wird auf den erwarteten (unveränderten) Zellinhalt angewendet, **kein** falscher Text verschwindet — direkter Selection-Sync-Regressionsschutz (Hauptspezifikation Abschnitt 2) |
| E-26 | Merge-Zeile sichtbar (Feature-Rundreise 5.2 Punkt 4) | Tabelle mit `colspan` über eine hochgeladene Fixture importieren (App bietet keinen manuellen Merge in der Toolbar), Cursor in eine Zelle der verbundenen Zeile, Zeile oberhalb/unterhalb einfügen | bestehender Merge bleibt als `td[colspan]` im DOM sichtbar (`page.locator('.ProseMirror td[colspan]')` weiterhin vorhanden), neue Zeile hat plausible Zellenzahl |

**Hinweis zu Grenzfall 2/3/5/8/9/10 auf E2E-Ebene:** Diese Grenzfälle sind
laut `zeile-einfuegen-code.md` Abschnitt 2 vollständig durch
`prosemirror-tables`' eigene `addRow`-Implementierung abgedeckt und werden mit
hoher Präzision auf Unit-Ebene geprüft (TC-04/05/06/09–13). Auf E2E-Ebene
werden sie **nicht redundant im Detail nachgestellt**, sondern über
Export/Reimport in der Feature-Rundreise (Abschnitt 3.6) bestätigt — entspricht
Anforderung Abschnitt 6, Testplanhinweis 4 („sowohl Unit- als auch E2E"), ohne
die E2E-Suite mit Duplikaten aufzublähen.

### 3.5 Selection-Sync-Regressionstest mit Zeilen-Einfügen-Sequenz (Anforderung Abschnitt 2/7, letzter Punkt)

Neuer `test()` **innerhalb** von `tests/e2e/selection-regression.spec.ts`
(nicht in `zeile-einfuegen.spec.ts` — die Anforderung verlangt dauerhafte
Zugehörigkeit zu dieser Regressions-Suite, Abschnitt 7). Muster und
Determinismus-Behandlung exakt wie die bestehenden Tests der Datei:

```ts
test('insert-row toolbar action followed by typing lands in the right cell', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()

  const cells = page.locator('.ProseMirror td')
  await cells.nth(2).click() // untere linke Zelle der 2×2-Tabelle
  // Selektions-Sync abwarten, BEVOR der Button ausgewertet wird (Determinismus-
  // Regel 1): der Button wird erst enabled, wenn isInTable nach dem async
  // selectionchange greift.
  await expect(page.getByRole('button', { name: 'Zeile oberhalb einfügen' })).toBeEnabled()
  await page.getByRole('button', { name: 'Zeile oberhalb einfügen' }).click()

  // Kein Sleep nötig: der Button dispatcht die Transaktion synchron, die
  // Selektion wird über tr.mapping synchron mitgeführt.
  await page.keyboard.type('Nach Einfügen')

  await expect(editor).toContainText('Nach Einfügen')
  await expect(page.locator('.ProseMirror tr')).toHaveCount(3)
})
```

Zusätzlicher Test **in derselben Datei** mit „Zeile unterhalb einfügen" sowie
einer Kombination Select-all-in-Zelle → Fett → erneuter Klick in eine andere
Zelle **nach** dem Einfügen (Muster identisch zum bestehenden
`'same regression inside a table cell...'`, Zeile 39–53 der Datei; dort wird
zwischen den Zellklicks ohne künstliches Warten getippt, weil `type` selbst
den Sync abwartet — hier genauso). Stellt sicher, dass die neuen
Tabellen-Commands nicht dieselbe Klasse von Stale-Selection-Bug reproduzieren.

### 3.6 Feature-Rundreise mit echtem Datei-Export (Anforderung Abschnitt 5.2) — Kernstück

Für **jede** Zeile: neues Dokument → Tabelle via `insertTableViaToolbar` →
Zellen befüllen (`keyboard.type`) → `focusCellThenWaitInTable` → Zeile per
Toolbar-Button einfügen → `exportAndUnzip(page, 'docx' | 'odt')` (echter
`waitForEvent('download')`, echte Datei von der Festplatte gelesen, echtes
`JSZip.loadAsync`) → Inhalt im entpackten XML geprüft → Datei **erneut über
den Datei-Upload-Input** importiert (`setInputFiles({ name, mimeType, buffer })`,
exakt das Download-Buffer wiederverwendet) → Inhalt im `.ProseMirror`-DOM
erneut geprüft. Volle Rundreise **über die echte Anwendung**, nicht nur
`writeDocx`/`readDocx`/`writeOdt`/`readOdt` direkt (das leistet Abschnitt
2.2/2.3 auf Unit-Ebene).

| ID | Inhalt (Anforderung 5.2, Nr.) | DOCX | ODT |
|---|---|---|---|
| E-30 | 1. Einfache Tabelle, Zeile oberhalb der ersten Zeile | Export: 3 `<w:tr>` in korrekter Reihenfolge, neue Zeile leer, übrige Zellen inhaltlich unverändert (Text im rohen `document.xml`); Reimport zeigt identische Reihenfolge im DOM | analog: 3 `<table:table-row>` in `content.xml`, Reimport identisch |
| E-31 | 2. Zeile unterhalb der letzten Zeile | analog E-30, gespiegelt | analog |
| E-32 | 3. Zeile in der Mitte einer 3-Zeilen-Tabelle | Reihenfolge aller Zeilen (vorher/neu/nachher) im Export korrekt | analog |
| E-33 | 4. Tabelle mit horizontalem Merge (`colspan`), Zeile oberhalb/unterhalb der verbundenen Zeile | Export: `<w:gridSpan w:val="2"/>` der bestehenden Zeile unverändert, neue Zeile hat korrekte effektive Spaltenzahl; **jede** `<w:tr>` deklariert exakt `colCount` `<w:tc>` (Grenzfall 5) | Export: `table:number-columns-spanned="2"` unverändert; **jede** `<table:table-row>` hat exakt `colCount` (`<table:table-cell` + `<table:covered-table-cell`) und die Gesamt-`<table:table-column/>`-Zahl passt (Grenzfall 5) |
| E-34 | 5. Tabelle mit vertikalem Merge (`rowspan`), Zeile **innerhalb** des Merge-Bereichs einfügen | Export: `<w:vMerge/>`-Continuation um 1 Zeile verlängert, Reimport zeigt `rowspan` um 1 erhöht als **eine** zusammenhängende Zelle | Export: `table:number-rows-spanned` um 1 erhöht **und** die Anzahl `<table:covered-table-cell` in den betroffenen Zeilen stimmt (Roh-XML, analog OR-01, aber über den echten Button-Klick statt einer konstruierten Fixture — bestätigt die bereits korrekte Writer-Logik am vollen E2E-Pfad) |
| E-35 | 6. Zellinhalt mit mehreren Absätzen/Formatierung in bestehender Zeile, Zeile daneben einfügen | bestehende, formatierte Zeile (mehrere `<w:p>`, `<w:b/>`) bleibt bei der Rundreise exakt erhalten | analog |
| E-36 | 7. Tabelle direkt am Dokumentanfang/-ende | siehe E-22/E-23, zusätzlich Export/Reimport: Struktur bleibt korrekt, Editor danach bedienbar |
| E-37 | 8. Doppelte Rundreise **im selben Format** (Export→Reimport→erneuter Export desselben Formats, 2×) mit mehreren, an verschiedenen Positionen eingefügten Zeilen | kein kumulativer Datenverlust; die **Cross-Format**-Variante (DOCX↔ODT) ist laut `zeile-einfuegen-code.md` Abschnitt 4.4 über die App-UI nicht auslösbar und wird in CF-03 (Abschnitt 2.4) auf Adapter-Ebene geprüft — hier **nicht** dupliziert, sondern per Verweis dokumentiert |

**Abnahmekriterium (aus Anforderung 5.2, operationalisiert):** Für alle
E-30…E-37 gilt **hart**: kein Struktur-/Textverlust nach irgendeiner Rundreise
(`expect(xml).toContain(...)` auf rohem XML **und** nach Reimport im DOM). Eine
falsch berechnete Spaltenzahl oder ein verlorener/kaputter Merge beim Export
(Grenzfälle 2/5) gilt als Strukturverlust und ist ein Abnahme-Blocker — E-33
(colspan) und E-34 (rowspan) prüfen das explizit für **beide** Formate.

### 3.7 Baseline-Rundreise (Anforderung Abschnitt 5.1) — Regressionsschutz

Kein neuer Test nötig — **Pflicht-Referenzlauf** der bereits vorhandenen
Suiten vor **und** nach jeder Änderung:

- `tests/e2e/docx.spec.ts` (u. a. „uploads an existing DOCX file…" und der
  Upload→Export-Rundreise-Test **ohne** Zeilen-Einfügen) und `tests/e2e/odt.spec.ts`.
- `src/formats/docx/__tests__/roundtrip.test.ts` und
  `src/formats/odt/__tests__/roundtrip.test.ts` — **alle** bestehenden
  `describe`-Blöcke, insbesondere die Tabellen-Tests (DOCX ab 229: 230/261/279;
  ODT ab 219: 220/251/275/310). Diese müssen grün bleiben; sie werden **nicht**
  verändert.
- `src/formats/odt/__tests__/external-fixtures.test.ts` und
  `src/formats/docx/__tests__/external-fixtures.test.ts` — Reader-Importe,
  Referenzlauf (kein Writer/Reader wird angefasst; das Ticket ändert nur
  `commands.ts`/`Toolbar.tsx`/`WordEditor.tsx`).

Als CI-Gate: **kein** Merge einer Änderung an `commands.ts`, `Toolbar.tsx`
oder `WordEditor.tsx`, der einen dieser Bestandstests rot werden lässt.

### 3.8 Rückverfolgbarkeits-Matrix (Anforderung → Testfall)

| Anforderungs-Abschnitt | Testfall(e) |
|---|---|
| 1 (# 1/# 2, Buttons) | E-02, E-03, E-04 |
| 1 (# 5, deaktivierter Zustand) | E-01, E-05, TC-19 |
| 1 (# 6, sichtbares Feedback) | E-03, E-04 (Zeilenanzahl-Änderung als Bestätigung) |
| 1 (# 7, Touch/Mobile) | Projekte Mobile/Tablet über gesamte Suite (Abschnitt 3.10) |
| 1 (# 8, Barrierefreiheit/`aria-label`/SVG) | E-06 |
| 3.1/3.2 Grundfall | TC-01, TC-02, TC-03, E-10, E-11, E-12 |
| 3.3 rowspan-Verlängerung | TC-04, DR-02, OR-01, E-34 |
| 3.4 Cursor-/Selektionsverhalten | TC-07, E-13, E-14 |
| 3.5 Formatierung/Zellinhalt der neuen Zeile | `zeile-einfuegen-code.md` 4.2 („keine Zusatzlogik"); implizit TC-01/TC-02 (neue Zellen leer, keine Marks) |
| 3.6 Undo/Redo | TC-08, TC-15, TC-17, E-15, E-16, E-20, E-24 |
| 3.7 Kein stiller Fehlschlag (`rowError`) | E-01 (disabled statt Klick ins Leere), TC-12 (Grenzfall 9 Unit) |
| 3.8 Tab außerhalb Tabelle unverändert | TC-19, E-21 |
| Grenzfall 1 | TC-03 |
| Grenzfall 2 | TC-04, DR-02, OR-01/E-34 (Roh-XML) |
| Grenzfall 3 | TC-05, E-33 |
| Grenzfall 4 | TC-16, TC-17, TC-18, E-20, E-21 |
| Grenzfall 5 | TC-06, DR-01, OR-03, E-33 (dedizierte Roh-XML-Regressionstests **beide** Formate) |
| Grenzfall 6 | TC-09 |
| Grenzfall 7 | TC-10 |
| Grenzfall 8 | TC-11 (verbindlich Variante a, `zeile-einfuegen-code.md` 4.1) |
| Grenzfall 9 | TC-12, M-03 |
| Grenzfall 10 | TC-13 |
| Grenzfall 11 | E-22, E-23, E-36 |
| Grenzfall 12 | TC-14, E-24 |
| Grenzfall 13 | E-25, Selection-Sync-Test Abschnitt 3.5 |
| Grenzfall 14 | M-01 (manuell; kein automatisierter Perf-Test, deckungsgleich `zeile-einfuegen-code.md` Abschnitt 9 Zeile 14) |
| Grenzfall 15 | TC-15 |
| Grenzfall 16 (Touch) | Abschnitt 3.10 (Mobile/Tablet) |
| 5.1 (Baseline-Rundreise) | Abschnitt 3.7 (Bestandstests) |
| 5.2 (Feature-Rundreise, DOCX/ODT) | E-30…E-37, DR-01…DR-03, OR-03/OR-04 |
| 5.2 (Cross-Format, Adapter-Ebene) | CF-01, CF-02, CF-03 (Einschränkung dokumentiert) |
| Hauptspezifikation Abschnitt 2 (Selection-Sync) | Abschnitt 3.5, E-13/E-14/E-25 |
| ODT/DOCX `covered-table-cell`/`vMerge`-Export (Regressionsschutz, **kein** Bugfix) | OR-01, OR-02 (Bestand, grün halten), DR-01, OR-03, E-33, E-34 |
| Abschnitt 7 (Freigabekriterium) | Abschnitt 5 unten |

### 3.9 Nicht automatisierbar — manuell/exploratory

| # | Prüfung | Durchführung |
|---|---|---|
| M-01 | Grenzfall 14: sehr große Tabelle (>5 Spalten, >10 Zeilen), Zeile in der Mitte einfügen | Im laufenden, nicht headless Browser eine große Tabelle aufbauen (z. B. über eine importierte Fixture wie `BigTable.odt`), Zeile mittig einfügen, subjektiv beobachten: UI reaktionsfähig, keine spürbare Verzögerung |
| M-02 | Sichtprüfung des ODT-Exports in echter Zielanwendung | Eine `rowspan`-Tabelle, in die eine Zeile eingefügt wurde, als ODT exportieren, in einer lokal installierten LibreOffice-Writer-Instanz öffnen — bestätigt, dass die (bereits korrekte) `covered-table-cell`-Ausgabe nicht nur den eigenen Reader, sondern auch eine externe Anwendung korrekt bedient (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19) |
| M-03 | Grenzfall 9, Sichtprüfung mit realer Fremddatei | Eine strukturell ungewöhnliche Fixture aus `tests/fixtures/external/{docx,odt}/` (z. B. `crazyTable.odt`, `Crazy.odt`, `feature_attributes_tables_FunnyTable_With_xmlid.odt`) hochladen, Cursor in eine Tabellenzelle, „Zeile oberhalb/unterhalb einfügen" — bestätigt am echten, unregelmäßigen Korpus, dass `fixTables` vor dem Command-Aufruf greift und kein Crash auftritt |

Ergebnis jeder manuellen Prüfung wird in `zeile-einfuegen-code.md` Abschnitt 11
(Abnahme-Checkliste) nachgetragen: wer, wann, welche LibreOffice-Version,
Ergebnis.

### 3.10 Touch/Mobile (Grenzfall 16, Anforderung Abschnitt 1 # 7)

Die E2E-Suite `zeile-einfuegen.spec.ts` läuft laut `playwright.config.ts`
automatisch auf **Desktop Chrome**, **Mobile** (Pixel 7) und **Tablet** (iPad
Mini). Das Kernverhalten (Einfügen E-03/E-04, Undo E-15, Selektionskonsistenz
E-13/E-14) wird damit auf allen drei Projekten nachgewiesen, ohne
projektspezifische Duplikate. Falls ein `.ProseMirror td`-Klick auf einem
Touch-Projekt unzuverlässig ist, wird für dieses Projekt auf `tap()` statt
`click()` umgestellt und der Selektions-Sync **weiterhin** über die
auto-retriegernde `toBeEnabled()`-Assertion (Determinismus-Regel 1)
abgewartet — kein blinder Sleep, keine erhöhte Flakiness. Zeigt sich auf einem
Touch-Projekt eine echte, nicht durch Test-Timing bedingte Bedien-Lücke (Button
per Touch nicht erreichbar), ist der Backlog-Status auf **teilweise** zu setzen
(Anforderung Abschnitt 7) und der konkrete Punkt hier nachzutragen.

---

## 4. Testdaten/Fixtures

- Bestehende `doc()`/`paragraph()`-Helper aus `roundtrip.test.ts` plus ein
  neuer `buildTable(rows)`-Helper (Abschnitt 2.1), wiederverwendet in
  `tableRowCommands.test.ts` **und** den Cross-Format-Tests (2.4) — keine
  Doppelimplementierung.
- Grenzfall-9-Unit-Test (TC-12): eine bewusst inkonsistente, von Hand über
  `wordSchema.nodeFromJSON` konstruierte Tabelle (nicht aus einer echten
  Datei), damit der worst case exakt kontrollierbar ist.
- Manuelle Grenzfall-9-Sichtprüfung (M-03) und Grenzfall 14 (M-01): vorhandene
  Fixtures aus `tests/fixtures/external/{docx,odt}/` (`crazyTable.odt`,
  `Crazy.odt`, `BigTable.odt`, `feature_attributes_tables*.odt`,
  `OOStyledTable.odt`, `TableFunkyBackground.odt`) — kein neuer Download nötig.
- E-26 (sichtbarer colspan-Merge im DOM): eine bereits vorhandene Fixture mit
  `colspan` importieren (die App bietet keinen manuellen Merge-Button).
- `TINY_PNG`/Bild-Fixtures werden **nicht** benötigt (keine Bild-Anforderung in
  `zeile-einfuegen-req.md`).

---

## 5. Exit-Kriterien für diesen Testplan

Deckt sich mit `zeile-einfuegen-req.md` Abschnitt 7 und
`zeile-einfuegen-code.md` Abschnitt 11. Der Testplan gilt als **erfüllt**, wenn:

1. Alle Unit-Testfälle TC-01…TC-19, DR-01…DR-03, OR-03/OR-04 und CF-01…CF-03
   automatisiert vorliegen und grün sind (`npm test`); die bestehenden
   Roh-XML-Tests OR-01/OR-02 (`odt/…/roundtrip.test.ts:275/310`) sowie die
   DOCX-Tabellen-Tests (230/261/279) bleiben als Referenz grün.
2. Alle E2E-Testfälle E-01…E-37 automatisiert vorliegen und grün sind
   (`npm run test:e2e`), für alle drei nicht-clipboard Playwright-Projekte
   (Desktop Chrome, Mobile, Tablet) — deterministisch, ohne Flakiness durch zu
   schnelle Tastatureingaben (Determinismus-Regeln Abschnitt 3.0 eingehalten).
3. Die Baseline-Rundreise (Abschnitt 3.7) läuft unmittelbar vor **und** nach
   dem Merge der Zeile-einfügen-Änderungen grün. **Kein Writer/Reader wird
   geändert** — das Format-Regressionsrisiko dieses Tickets ist gering, muss
   aber trotzdem verifiziert werden.
4. Jeder Grenzfall aus Abschnitt 4 der Anforderung ist einzeln befundet
   (funktioniert / funktioniert nicht und dokumentiert / repariert) — siehe
   Rückverfolgbarkeits-Matrix 3.8. Insbesondere Grenzfall 8 (verbindlich
   Variante a, TC-11) und Grenzfall 5 (dedizierter Roh-XML-Regressionstest für
   **beide** Formate, DR-01/OR-03/E-33).
5. Grenzfall 16 (Touch) ist auf Mobile und Tablet nachgewiesen (Abschnitt 3.10).
6. Die Selection-Sync-Regressionstests (Abschnitt 3.5) sind grün und dauerhaft
   Teil von `selection-regression.spec.ts`.
7. Die manuellen Prüfschritte M-01…M-03 sind durchgeführt und in
   `zeile-einfuegen-code.md` Abschnitt 11 mit Ergebnis nachgetragen.
8. Die Cross-Format-Einschränkung (Abschnitt 2.4, nur Adapter-/Unit-Ebene) ist
   im Freigabe-Vermerk ausdrücklich als dokumentierte, strukturelle
   Einschränkung genannt, nicht stillschweigend als vollwertig E2E-getestet
   behauptet (Anforderung Abschnitt 7; `zeile-einfuegen-code.md` 4.4/11).
9. `npm run build` (`tsc -b`) läuft nach jeder Code-Änderung fehlerfrei durch
   (neue Commands, `run()`-Rückgabewert, `rowError`-State/Props,
   `Tab`/`Shift-Tab`-Keymap).

Erst wenn alle neun Punkte erfüllt sind, darf laut `zeile-einfuegen-req.md`
Abschnitt 7 der Backlog-Status von `zeile-einfuegen` auf **vorhanden** gesetzt
werden; andernfalls **teilweise**, mit den konkret fehlenden Teilpunkten hier
bzw. in `zeile-einfuegen-code.md` Abschnitt 11 nachgetragen.
