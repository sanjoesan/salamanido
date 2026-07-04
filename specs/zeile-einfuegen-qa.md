# Testplan „Zeile einfügen (oberhalb/unterhalb)" (QA)

Bezug: `E:\docs\specs\zeile-einfuegen-req.md` (Anforderung, Stand geprüft
2026-07-04), `E:\docs\specs\zeile-einfuegen-code.md` (Umsetzungsplan, Stand
geprüft 2026-07-04). Geltungsbereich: identisch zur Anforderungsdatei — die
Zeile-einfügen-Funktion (oberhalb/unterhalb) im gemeinsamen DOCX/ODT-Editor
(`src/formats/shared/editor/`), inklusive der laut Umsetzungsplan neuen
Exporte `insertRowBefore`/`insertRowAfter`/`goToTableCell`/
`insertRowOnTabAtTableEnd` in `src/formats/shared/editor/commands.ts`, der
zwei neuen Toolbar-Buttons in `Toolbar.tsx`, der Tab-Keymap-Ergänzung in
`WordEditor.tsx` sowie des als Teil dieses Tickets zwingend mitzubehebenden
`odt/writer.ts`-Bugs (fehlendes `<table:covered-table-cell/>` bei
`rowspan`, siehe `zeile-einfuegen-code.md` Abschnitt 1).

Status dieses Dokuments: Testplan **vor** vollständiger Umsetzung von
`zeile-einfuegen-code.md` verfasst. Alle unten genannten Testfälle für noch
nicht existierenden Code (`insertRowBefore`/`insertRowAfter`, die zwei
Toolbar-Buttons, die Tab-Keymap-Kette, der `odt/writer.ts`-Bugfix) sind zum
jetzigen Zeitpunkt **rot/nicht ausführbar** — sie sind die Abnahmekriterien,
gegen die die Umsetzung aus `zeile-einfuegen-code.md` Abschnitt 10
(Reihenfolge der Umsetzung) läuft. Tests gegen bereits existierenden Code
(Baseline-Rundreise, bestehender Selection-Sync-Regressionstest, bestehende
`describe('… round trip: tables')`-Blöcke) sind schon heute ausführbar und
müssen vor jeder Änderung als Referenzlauf grün sein.

Grundsatz aus `zeile-einfuegen-req.md` Abschnitt 6, Punkt 4, hier
verbindlich umgesetzt: **Unit-Tests mit direkt konstruierten
`ProseMirrorJSON`-Fixtures allein reichen nicht** — das ist exakt die Lücke,
die Befund 0.5/0.7 der Anforderungsdatei beschreibt (Reader/Writer wurden
bisher nur gegen von Hand gebaute Fixtures getestet, nie gegen eine über
echte Bedienung erzeugte Tabellenstruktur). Jede funktionale Anforderung,
die über eine Bedienhandlung ausgelöst wird (Toolbar-Klick, Tastatur,
Datei-Export/-Upload), bekommt zusätzlich einen echten Playwright-
Browser-Test, der tatsächlich in eine Tabellenzelle klickt, den neuen
Button klickt, tippt, den Export-Download abfängt und die heruntergeladene
Datei inhaltlich (nicht nur visuell) prüft — nicht nur eine interne
Command-/Reader-/Writer-Funktion direkt aus dem Testprozess aufruft.

---

## 1. Teststufen-Übersicht

| Stufe | Werkzeug | Zweck | Abschnitt hier |
|---|---|---|---|
| Unit — Command-Ebene | Vitest (`environment: 'jsdom'`), `EditorState.create` + `wordSchema` direkt, kein `EditorView`/Browser | Schnelle Regressionsprüfung der Wrapper-Commands selbst (Merge-Verlängerung, Spaltenkonsistenz, Selektions-/Undo-Mapping) gegen einen konstruierten `ProseMirror`-Zustand | Abschnitt 2.1 |
| Unit — Reader/Writer-Rundreise (DOCX + ODT) | Vitest, `writeDocx`/`readDocx`/`writeOdt`/`readOdt` direkt aufgerufen, JSON-Fixtures **plus** über Commands erzeugte Strukturen | Rundreise Import → (Fixture **oder** über Command eingefügte Zeile) → Export → Re-Import, inkl. dediziertem Grenzfall-5-Regressionstest und dem ODT-`covered-table-cell`-Bugfix-Test | Abschnitt 2.2–2.3 |
| E2E — echte Browser-Bedienung | Playwright, `page.locator('.ProseMirror td').click()`, `page.getByTitle(...).click()`, `page.keyboard.type/press`, `input.setInputFiles(...)`, `page.waitForEvent('download')` + `JSZip.loadAsync` auf der echten heruntergeladenen Datei | Kernstück: Zeile tatsächlich per Klick einfügen, direkt danach tippen/formatieren, exportieren, heruntergeladene Datei entpacken und prüfen, reimportieren | Abschnitt 3 |
| Manuell/exploratory | Echte, lokal installierte LibreOffice-/Word-Instanz; große Tabelle (>5 Spalten/>10 Zeilen) im laufenden Browser | Grenzfall 14 (Performance-Eindruck bei großer Tabelle), Sichtprüfung der ODT-Export-Datei in einer echten Zielanwendung (Anforderung Abschnitt 0.6/1 — „nicht nur durch unseren eigenen Reader wieder einlesbar") | Abschnitt 3.9 |

Alle Playwright-Projekte aus `playwright.config.ts` (Desktop Chrome, Mobile,
Tablet) laufen mit den deterministischen Klick-/Tipp-Interaktionen unten
mit; keiner der hier definierten Testfälle benötigt echten
Zwischenablage-Zugriff, daher keine projektspezifischen Ausnahmen wie im
Einfügen-Testplan (`einfuegen-qa.md` Abschnitt 1) nötig.

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
import { wordSchema } from '../../schema'
import {
  insertRowBefore,
  insertRowAfter,
  goToTableCell,
  insertRowOnTabAtTableEnd,
} from '../commands'
```

Helper: `buildTable(rows)` konstruiert eine `table`-Node aus einem
verschachtelten Array von Zellbeschreibungen (`{ text, colspan?, rowspan?
}`) über `wordSchema.nodeFromJSON(...)`, analog zu den bestehenden
`doc()`/`paragraph()`-Helpern in `roundtrip.test.ts`. Jeder Testfall
dispatcht über `command(state, (tr) => { state = state.apply(tr) })` und
prüft `state.doc.toJSON()` sowie `state.selection`.

| ID | Testfall | Eingabe | Erwartung | Bezug |
|---|---|---|---|---|
| TC-01 | `insertRowBefore`, Grundfall | 2×2-Tabelle, Cursor in Zeile 2 | 3 Zeilen danach, neue Zeile unmittelbar vor der bisherigen Zeile 2, neue Zeile hat 2 leere Zellen (je min. 1 leerer `paragraph`) | Anforderung 3.1 |
| TC-02 | `insertRowAfter`, Grundfall | wie TC-01, Aktion unterhalb | neue Zeile unmittelbar nach der Cursor-Zeile | Anforderung 3.2 |
| TC-03 | Grenzfall 1: Tabelle mit nur 1 Zeile | 1×2-Tabelle | nach `insertRowBefore` **und** separat nach `insertRowAfter`: 2 Zeilen, beide Zellen der neuen Zeile leer | Grenzfall 1 |
| TC-04 | Grenzfall 2: Einfügen innerhalb eines rowspan-Bereichs | 3-Zeilen-Tabelle, Zelle A hat `rowspan: 3` über alle Zeilen, Cursor in Zeile 2 | `rowspan` der Zelle A wird auf 4 erhöht, **keine** neue eigenständige Zelle an dieser Spaltenposition, keine verwaiste Referenz (`table.content[1].content` enthält keine zusätzliche Zelle an Spalte 0) | Anforderung 3.3, Grenzfall 2 |
| TC-05 | Grenzfall 3: Nachbarzeile hat `colspan` | Zeile 1 hat eine Zelle mit `colspan: 2`, Zeile 2 hat 2 Einzelzellen, Cursor in Zeile 2 | neue Zeile hat exakt 2 Einzelzellen (`colspan: 1` je Zelle), Summe der effektiven Spalten = 2, keine 1-Zeller- oder 3-Zeller-Fehlaufteilung | Grenzfall 3 |
| TC-06 | Grenzfall 5: Zeile oberhalb der bisherigen Zeile 1 einfügen, wenn Zeile 1 `colspan: 2` hatte | 2-Zeilen-Tabelle (effektiv 2 Spalten), `insertRowBefore` mit Cursor in Zeile 1 | resultierende neue Zeile 0 hat 2 Einzelzellen (Summe colspans = 2, identisch zur übrigen Tabelle); dient als Vorstufe zum Export-Regressionstest in Abschnitt 2.2 | Grenzfall 5, Befund 0.6 |
| TC-07 | Anforderung 3.4: Cursor-/Selektionsverhalten | Cursor/Textselektion in einer beliebigen Zelle vor der Aktion, `insertRowBefore` bzw. `insertRowAfter` | nach der Aktion befindet sich `state.selection` weiterhin in **derselben logischen Zelle** (Vergleich über Zellinhalt, nicht über die rohe Positionszahl); bei `insertRowBefore` ändert sich die absolute Position (verschiebt sich um die Größe der neuen Zeile), bei `insertRowAfter` bleibt sie unverändert | Anforderung 3.4 |
| TC-08 | Anforderung 3.6: Undo/Redo | `insertRowBefore` dispatchen, dann `undo(state, dispatch)` aus `prosemirror-history` | Zustand (Dokument **und** Selektion) exakt wie unmittelbar vor dem Einfügen, in **einem** Undo-Schritt (nicht zellenweise) | Anforderung 3.6 |
| TC-09 | Grenzfall 6: `CellSelection` über mehrere Zellen derselben Zeile | `CellSelection` spannt 2 Zellen in Zeile 1 auf, `insertRowBefore` | es entsteht genau **eine** neue Zeile, nicht zwei | Grenzfall 6 |
| TC-10 | Grenzfall 7: `CellSelection` markiert eine ganze Zeile | wie Grundfall | Verhalten identisch zu TC-01 | Grenzfall 7 |
| TC-11 | Grenzfall 8: `CellSelection` über mehrere Zeilen | 5-Zeilen-Tabelle, `CellSelection` von Zeile 2 bis Zeile 4 (3×N-Selektion), `insertRowBefore` **und** separat `insertRowAfter` | verbindlich nach Design-Entscheidung `zeile-einfuegen-code.md` Abschnitt 4.1 (Variante a): **genau eine** neue Zeile relativ zur **obersten** Zeile der Selektion (bei „oberhalb") bzw. zur **untersten** Zeile (bei „unterhalb") — **nicht** 3 neue Zeilen; Test schlägt explizit fehl, falls stattdessen 3 Zeilen entstehen, akzeptiert kein „irgendein plausibles Ergebnis" | Grenzfall 8, verbindlich dokumentierte Entscheidung |
| TC-12 | Grenzfall 9: strukturell inkonsistente Tabelle | Tabelle direkt per `wordSchema.nodeFromJSON` mit inkonsistenter Zellenzahl je Zeile konstruiert (unter Umgehung von `fixTables`), `EditorState.create({ plugins: [tableEditing()] })` | nach der ersten dispatchten Transaktion normalisiert `fixTables` (via `appendTransaction`) die Struktur, **bevor** `insertRowBefore`/`insertRowAfter` aufgerufen wird; kein Crash, Struktur bleibt valide danach | Grenzfall 9 |
| TC-13 | Grenzfall 10: verschachtelte Tabelle | äußere Tabelle, eine Zelle enthält eine innere `table`-Node | `insertRowBefore` in der **äußeren** Tabelle lässt die innere Tabelle in der betroffenen Zelle strukturell unverändert (`toJSON()`-Vergleich der inneren Tabelle vor/nach); `insertRowBefore` **innerhalb** der inneren Tabelle wirkt sich nicht auf die Zeilenzahl der äußeren Tabelle aus | Grenzfall 10 |
| TC-14 | Grenzfall 12: schnelles wiederholtes Auslösen | zwei aufeinanderfolgende `insertRowAfter`-Aufrufe auf demselben, jeweils fortgeschriebenen `state` | zwei separate neue Zeilen (keine verlorene/doppelt eingefügte Zeile durch geteilten `state`) | Grenzfall 12 |
| TC-15 | Grenzfall 15: Einfügen → Undo → Redo → erneut Einfügen | Sequenz wie beschrieben | jeder Zwischenzustand exakt wie erwartet, keine kumulierten Abweichungen | Grenzfall 15 |
| TC-16 | `goToTableCell(1)` (Tab), Nicht-Endzelle | Cursor in Zelle 1 von 4 | Selektion bewegt sich zu Zelle 2, **keine** neue Zeile entsteht | Grenzfall 4, Abschnitt 6.3 |
| TC-17 | `insertRowOnTabAtTableEnd`, Grenzfall 4 | Cursor in der letzten Zelle der letzten Zeile, Tab-Kette (`chainCommands(goToTableCell(1), insertRowOnTabAtTableEnd())`) ausgelöst | neue Zeile wird unterhalb angehängt, Cursor landet in deren **erster** Zelle, alles in **einer** Transaktion (ein Undo-Schritt macht die gesamte Aktion rückgängig) | Grenzfall 4, Anforderung 3.6 |
| TC-18 | `goToTableCell(-1)` (Shift-Tab) in der ersten Zelle | Cursor in Zelle 1 | liefert `false`, kein Crash, keine Zeile entsteht | Abschnitt 3, Punkt 4 des Umsetzungsplans |
| TC-19 | Tab-Kette außerhalb einer Tabelle | Cursor in einem normalen Absatz | `goToTableCell(1)` und `insertRowOnTabAtTableEnd()` liefern beide `false` (über `isInTable`), nativer Fokuswechsel bleibt unangetastet | Abschnitt 3, Punkt 4 (Kompatibilität mit `liste-einruecken-tab`) |

**Explizit nicht in dieser Datei getestet, weil hier per Konstruktion nicht
prüfbar:** ob die Toolbar-Buttons tatsächlich `disabled` sind, ob ein Klick
tatsächlich im Browser ankommt, ob der Export einer echten Datei die neue
Zeile enthält — das ist ausschließlich Gegenstand von Abschnitt 3 (Playwright)
bzw. Abschnitt 2.2/2.3 (Reader/Writer direkt).

### 2.2 Erweiterung `src/formats/docx/__tests__/roundtrip.test.ts` (`describe('DOCX round trip: tables')`, Zeile 173–249)

| ID | Testfall | Aufbau | Erwartung | Bezug |
|---|---|---|---|---|
| DR-01 | **Grenzfall 5, DOCX-Seite (Pflicht-Regressionstest, Testplanhinweis 6 — eigener, benannter `it(...)`-Block, nicht Teil eines bestehenden Tests)** | Tabelle mit `colspan: 2` in Zeile 0 und 2 Einzelzellen in Zeile 1 direkt als JSON-Fixture; Reader→Editor-Transaktion simuliert „Zeile oberhalb der bisherigen Zeile 0 einfügen" (`insertRowBefore` auf einem aus der Fixture konstruierten `EditorState`, `state.doc.toJSON()` als neuer `original` in `roundTrip(...)`) | Export → Re-Import: Spaltenzahl der gesamten Tabelle bleibt konsistent (2), **kein** Kollaps auf eine falsche Gesamt-Spaltenzahl; die (jetzt) alte Zeile mit `colspan: 2` bleibt inhaltlich und strukturell unverändert | Grenzfall 5, Befund 0.6, Freigabekriterium Abschnitt 7 |
| DR-02 | Feature-Rundreise 5.2 Punkt 5 (rowspan-Verlängerung), Unit-Ebene | 3-Zeilen-Tabelle mit `rowspan: 3`-Zelle über alle Zeilen, `insertRowBefore`/`insertRowAfter` innerhalb des Merge-Bereichs ausgeführt, Ergebnis als neuer `original` | Export → Re-Import: verlängerter Merge (`rowspan: 4`) bleibt als **eine** zusammenhängende Zelle über 4 Zeilen erhalten, kein Datenverlust | Anforderung 3.3, Feature-Rundreise 5.2 Punkt 5 |
| DR-03 | Feature-Rundreise 5.2 Punkt 6 (Zellinhalt mit mehreren Absätzen/Formatierung bleibt bei Nachbar-Einfügung erhalten) | Bestehende Zeile mit einer Zelle, die 2 Absätze enthält, einer davon fett formatiert; Zeile daneben per `insertRowAfter` eingefügt | Export → Re-Import: die bestehende, formatierte Zeile bleibt **exakt** erhalten (Absatzanzahl, Text, `strong`-Mark) | Feature-Rundreise 5.2 Punkt 6 |

### 2.3 Erweiterung `src/formats/odt/__tests__/roundtrip.test.ts` (`describe('ODT round trip: tables')`, Zeile 162–210)

Diese Erweiterung ist laut `zeile-einfuegen-code.md` Abschnitt 1 der
**wichtigste** Unit-Testblock dieses Tickets, weil er den einzigen
existierenden Bug aufdeckt, der unabhängig vom Feature besteht, aber durch
dessen Abnahmekriterien zwingend zutage tritt (fehlendes
`<table:covered-table-cell/>` bei `rowspan`).

| ID | Testfall | Aufbau | Erwartung | Bezug |
|---|---|---|---|---|
| OR-01 | **Echter zweizeiliger rowspan-Test (fehlte bisher — der bestehende Test bei Zeile 194–209 deckt nur `colspan` ab, siehe Codebefund Abschnitt 0 Punkt 5)** | Fixture identisch zum DOCX-Pendant `docx/__tests__/roundtrip.test.ts:223–248`: Zeile 1 hat eine Zelle mit `rowspan: 2` plus eine Einzelzelle, Zeile 2 hat nur die verbleibende Einzelzelle (an Spalte 1) | `readOdt(await writeOdt(original))`: `table.content[0].content[0].attrs.rowspan === 2`, Text der gemergten Zelle erhalten, `table.content[1].content` enthält genau 1 Zelle (Spalte 1) | Bugbehebung, Anforderung 3.3 für ODT |
| OR-02 | **Raw-XML-Check für `<table:covered-table-cell/>` (deckt den Bug tatsächlich auf — ein reiner Reader-Rückweg-Test würde ihn verdecken, siehe Codebefund Abschnitt 1, „Warum das bisher nicht auffiel")** | Dieselbe Fixture wie OR-01; statt `readOdt(...)` wird die von `writeOdt(...)` erzeugte Zip-Datei direkt mit `JSZip.loadAsync` geöffnet und `content.xml` als Text geparst | für die Zeile, die eine von `rowspan` überdeckte Spalte enthält: Anzahl `<table:table-cell` + Anzahl `<table:covered-table-cell` in dieser `<table:table-row>` ergibt exakt `colCount` (2); **dieser Test ist vor dem `odt/writer.ts`-Fix rot und danach grün** — muss so im Test-Kommentar festgehalten werden | `zeile-einfuegen-code.md` Abschnitt 1/6.4, Freigabekriterium Abschnitt 7 |
| OR-03 | **Grenzfall 5, ODT-Seite (analog DR-01)** | Tabelle mit `colspan: 2` in Zeile 0, `insertRowBefore` simuliert Einfügen oberhalb; Export über `writeOdt` | rohe `content.xml`: `table:number-columns="2"` (bzw. 2 `<table:table-column/>`-Elemente) bleibt für die **gesamte** Tabelle konsistent, auch nachdem die alte Zeile 0 (mit `colspan`) zur Zeile 1 wurde; behebt zugleich strukturell die in Codebefund 0.6 dokumentierte Ignoranz von `colspan` in der bisherigen `colCount`-Berechnung | Grenzfall 5, Befund 0.6 |
| OR-04 | Feature-Rundreise 5.2 Punkt 6, ODT-Seite | analog DR-03 | analog DR-03, für ODT | Feature-Rundreise 5.2 Punkt 6 |

**Regressionsvorsicht (explizit aus `zeile-einfuegen-code.md` Abschnitt 11
übernommen):** Der `odt/writer.ts`-Bugfix ändert das Exportformat für **jede**
Tabelle mit `rowspan`, nicht nur für neu eingefügte Zeilen. Deshalb müssen
nach dem Fix zusätzlich die bestehenden ODT-Fixture-Importtests
(`src/formats/odt/__tests__/external-fixtures.test.ts`, insbesondere
Fixtures mit Tabellen wie `TestTextTable.odt`, `feature_attributes_tables*.odt`,
`crazyTable.odt`, `BigTable.odt`, `OOStyledTable.odt`) weiterhin ohne Crash
importierbar bleiben — reiner Regressionslauf, kein neuer Testfall nötig, da
diese Tests nur den Reader betreffen, der unverändert bleibt.

### 2.4 Cross-Format-Unit-Tests (Anforderung 5.2, „Cross-Format": in ein als DOCX importiertes Dokument eine Zeile einfügen und als ODT exportieren, sowie umgekehrt)

Neue Datei `src/formats/shared/__tests__/cross-format-tablerow.test.ts` —
**ausschließlich auf Unit-Ebene möglich**, nicht per echter Bedienung, weil
laut `zeile-einfuegen-code.md` Abschnitt 4.4 (code-verifizierter Befund
gegen `src/formats/types.ts`/`DocumentWorkspace.tsx`) die App **keine**
Funktion „als anderes Format exportieren" besitzt — ein als DOCX geöffnetes
Dokument kann über die UI nicht als ODT exportiert werden. Dieser Punkt ist
eine **dokumentierte, strukturelle Einschränkung**, kein Lückenschluss, der
hier stillschweigend übersprungen wird.

| ID | Testfall | Aufbau | Erwartung |
|---|---|---|---|
| CF-01 | DOCX → Zeile einfügen → als ODT exportieren | `readDocx(...)` → `body`-JSON via `wordSchema.nodeFromJSON` → `EditorState` → `insertRowBefore`/`insertRowAfter` → `tr.doc.toJSON()` als neuer `body` → `writeOdt(...)` → `readOdt(...)` | neue leere Zeile vorhanden, bestehende Zeilen inhaltlich unverändert, `rowspan`/`colspan` korrekt übernommen (inkl. `covered-table-cell`, siehe OR-02) |
| CF-02 | ODT → Zeile einfügen → als DOCX exportieren | spiegelbildlich zu CF-01 | analog |
| CF-03 | Doppelte Rundreise (Format-Wechsel hin und zurück) an einer Tabelle mit mehreren, an unterschiedlichen Positionen eingefügten Zeilen (Feature-Rundreise 5.2 Punkt 8) | DOCX → 2× `insertRowBefore`/`insertRowAfter` an unterschiedlichen Positionen → ODT-Export → ODT-Reimport → erneut DOCX-Export → DOCX-Reimport | kein kumulativer Struktur-/Textverlust nach der zweiten Rundreise |

Dieser Abschnitt wird in der Abnahme-Checkliste (Abschnitt 5 unten) explizit
als „Cross-Format nur auf Unit-Test-Ebene geprüft" vermerkt, damit er nicht
stillschweigend als vollwertig E2E-getestet erscheint (Bezug: Anforderung
Abschnitt 7, Freigabekriterium; `zeile-einfuegen-code.md` Abschnitt 4.4).

### 2.5 Nicht in Unit-Tests abgedeckt (bewusst, siehe Abschnitt 3)

Folgende Anforderungen sind nicht sinnvoll als Unit-Test prüfbar, weil sie
echtes `EditorView`/DOM-Verhalten (Toolbar-Button-`disabled`-Zustand,
tatsächlicher Mausklick in eine Zelle, echter Datei-Download, Sichtbarkeit
des Fehlerbanners, Selection-Sync über echte Klickfolgen) betreffen und
werden ausschließlich in Abschnitt 3 (Playwright) getestet: Abschnitt 1 der
Anforderung (# 1/# 2/# 5/# 6, Buttons selbst), Anforderung 3.7 (sichtbare
Rückmeldung), die gesamte Feature-Rundreise 5.2 **über echte Bedienung**
(im Unterschied zu Abschnitt 2.2/2.3, die dieselben Szenarien nur auf
Reader-/Writer-Ebene abdecken), der Selection-Sync-Regressionstest
(Hauptspezifikation Abschnitt 2), Grenzfall 4 über echtes Tab-Drücken im
Browser, Grenzfall 11 (Tabelle am Dokumentanfang/-ende, Cursor per Klick
davor setzen), Grenzfall 12/13 über echte, zeitlich aufeinanderfolgende
Klicks, Grenzfall 14 (große Tabelle, Reaktionsfähigkeit).

---

## 3. E2E-Tests (Playwright) — echte Browser-Bedienung

Neue Datei `tests/e2e/zeile-einfuegen.spec.ts`, Aufbau/Locator-Konventionen
identisch zu den bestehenden Suiten (`docx.spec.ts`, `odt.spec.ts`,
`selection-regression.spec.ts`): `page.goto('/')` → Privacy-Banner
wegklicken (`page.getByRole('button', { name: /verstanden/i }).click()`) →
`docxCard(page)`/`odtCard(page)`-Locator-Helper (`div.rounded-lg` mit
passender `heading`) → `getByRole('button', { name: 'Neu erstellen' })` →
`page.locator('.ProseMirror')`. Zentrale Technik laut Anforderung Abschnitt
6.1: Tabelle über den bestehenden `⊞ Tabelle`-Button einfügen, Zelle per
`page.locator('.ProseMirror td').nth(n).click()` selektieren, neuen Button
(`page.getByTitle('Zeile oberhalb einfügen')` / `page.getByTitle('Zeile
unterhalb einfügen')`) klicken, `page.locator('.ProseMirror tr')`/`td`
auszählen statt nur visuell zu prüfen.

Jeder Testfall unten führt **tatsächliche Browser-Interaktionen** aus
(`page.locator(...).click()`, `page.keyboard.type/press`,
`input.setInputFiles(...)` für Uploads, `page.waitForEvent('download')` für
Exporte) — **keiner** ruft `insertRowBefore`/`addRowBefore`/`writeOdt` etc.
direkt aus dem Testprozess auf. Das ist die zentrale Abgrenzung zu
Abschnitt 2.

### 3.1 Test-Infrastruktur (Helper-Funktionen in `zeile-einfuegen.spec.ts`)

```ts
import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'

function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

/** Baut eine Tabelle über den echten "⊞ Tabelle"-Button auf und liefert den
 *  Zellen-Locator zurück — exakt der in der Anforderung Abschnitt 6.1
 *  vorgeschriebene primäre Testweg. */
async function insertTableViaToolbar(page: Page) {
  await page.locator('.ProseMirror').click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
  return page.locator('.ProseMirror td')
}

async function exportAndUnzip(page: Page, format: 'docx' | 'odt') {
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).toBeTruthy()
  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile(path!)
  const zip = await JSZip.loadAsync(buffer)
  const xml = await zip.file(format === 'docx' ? 'word/document.xml' : 'content.xml')!.async('text')
  return { zip, xml, buffer }
}
```

### 3.2 Grundverhalten der Buttons (Anforderung Abschnitt 1)

Für **beide** Formate (DOCX-Karte **und** ODT-Karte, zwei parallele
`describe`-Blöcke wie in `docx.spec.ts`/`odt.spec.ts`):

| ID | Aktion (echte Bedienung) | Prüfung | Bezug |
|---|---|---|---|
| E-01 | Neues Dokument, Cursor in einen normalen Absatz (kein Klick in eine Tabelle) | `page.getByTitle('Zeile oberhalb einfügen')` **und** `page.getByTitle('Zeile unterhalb einfügen')` sind `toBeDisabled()` | Abschnitt 1 # 5, Anforderung 3.7 |
| E-02 | Tabelle über `insertTableViaToolbar` einfügen, Cursor per Klick in eine Zelle setzen | beide Buttons sind `toBeEnabled()` | Abschnitt 1 # 1/# 2 |
| E-03 | wie E-02, Klick auf „Zeile oberhalb einfügen" | `page.locator('.ProseMirror tr')` wächst von 2 auf 3 (Freigabekriterium Abschnitt 7, erster Punkt: Button über echte Browser-Interaktion auslösbar) | Abschnitt 1 # 1 |
| E-04 | wie E-02, Klick auf „Zeile unterhalb einfügen" | `tr`-Anzahl wächst von 2 auf 3, neue Zeile erscheint **nach** der Cursor-Zeile (Reihenfolge über Zellinhalt geprüft) | Abschnitt 1 # 2 |
| E-05 | nach E-03/E-04: Cursor zurück in einen normalen Absatz (falls vorhanden) oder Klick außerhalb der Tabelle | Buttons werden wieder `disabled`, kein dauerhaft „hängender" aktivierter Zustand | Abschnitt 1 # 5 |

### 3.3 Grundfall, Cursor-Verhalten, Undo/Redo (Anforderung 3.1/3.2/3.4/3.6)

| ID | Aktion | Prüfung | Bezug |
|---|---|---|---|
| E-10 | 3×2-Tabelle (3 Zeilen tippen), Zeile oberhalb der **ersten** Zeile einfügen | `tr`-Anzahl = 4, neue erste Zeile leer, übrige 3 Zeilen inhaltlich in unveränderter Reihenfolge (`page.locator('.ProseMirror tr').nth(n)` je geprüft) | 3.1, Feature-Rundreise 5.2 Punkt 1 |
| E-11 | dieselbe Tabelle, Zeile unterhalb der **letzten** Zeile einfügen | `tr`-Anzahl = 4, neue letzte Zeile leer, Reihenfolge davor unverändert | 3.2, Feature-Rundreise 5.2 Punkt 2 |
| E-12 | Zeile in der **Mitte** einer 3-Zeilen-Tabelle einfügen | Reihenfolge vorher/neu/nachher exakt korrekt (Zellinhalt-Vergleich je Zeile) | Feature-Rundreise 5.2 Punkt 3 |
| E-13 | Cursor in Zelle mit Text setzen (nicht erste Zelle), „Zeile oberhalb einfügen" klicken, direkt danach tippen | getippter Text landet in der **ursprünglichen, unveränderten logischen Zelle** (jetzt eine Zeile weiter unten im DOM), **nicht** in der neuen leeren Zeile — Prüfung über `page.locator('.ProseMirror tr').nth(k) td').nth(j)`-Text | Anforderung 3.4 |
| E-14 | wie E-13, aber „Zeile unterhalb einfügen" | getippter Text landet weiterhin in der unveränderten Zelle (Position im DOM ändert sich nicht) | Anforderung 3.4 |
| E-15 | nach E-03: `page.keyboard.press('ControlOrMeta+z')` | `tr`-Anzahl wieder wie vor dem Einfügen (2), **ein** Strg+Z genügt (kein zellenweises Undo) | Anforderung 3.6 |
| E-16 | nach E-15: `page.keyboard.press('ControlOrMeta+y')` (bzw. `Mod-Shift-z`) | `tr`-Anzahl wieder wie unmittelbar nach dem Einfügen (3), Zustand identisch wiederhergestellt | Anforderung 3.6 |

### 3.4 Grenzfälle über echte Bedienung (Anforderung Abschnitt 4)

| ID | Grenzfall | Aktion | Prüfung |
|---|---|---|---|
| E-20 | #4 Tab in letzter Zelle | 2×2-Tabelle, alle 4 Zellen nacheinander per `page.keyboard.press('Tab')` durchlaufen (nach Klick in Zelle 1), im Tab-Druck **aus** Zelle 4 heraus | `tr`-Anzahl wächst auf 3, Cursor landet nachweislich in der neuen (dritten) Zeile erster Zelle — geprüft durch sofortiges `page.keyboard.type('X')` und Kontrolle, dass `'X'` in genau dieser Zelle erscheint |
| E-21 | #4, Gegenprobe: Tab in einer **Nicht**-Endzelle | Tab aus Zelle 1 heraus | `tr`-Anzahl bleibt 2 (**keine** neue Zeile), Cursor bewegt sich zu Zelle 2 (Regressionsschutz gegen ein zu aggressives Tab-Binding) |
| E-22 | #11 Tabelle am Dokumentanfang | Dokument beginnt direkt mit der Tabelle (kein vorheriger Absatz-Tipp, Tabelle unmittelbar nach `insertTableViaToolbar` in einem frischen Dokument), Zeile oberhalb der ersten Zeile einfügen | kein Crash, Editor bleibt bedienbar: Klick **vor** die Tabelle (z. B. `page.mouse.click` oberhalb der Tabellen-Bounding-Box) setzt den Cursor sichtbar davor, Tippen an dieser Stelle funktioniert |
| E-23 | #11 Tabelle am Dokumentende | Tabelle ans Ende eines Dokuments mit vorherigem Absatz, Zeile unterhalb der letzten Zeile einfügen | Editor bleibt bedienbar, Cursor kann per Klick/`ArrowDown` aus der Tabelle heraus positioniert werden |
| E-24 | #12 schnelles wiederholtes Auslösen | Button „Zeile unterhalb einfügen" zweimal **schnell hintereinander** klicken (`Promise.all` zweier `click()`-Aufrufe bzw. ohne Wartezeit dazwischen) | genau **2** zusätzliche Zeilen entstehen (kein Event-Race, keine doppelt/nicht eingefügte Zeile); danach 2× Strg+Z stellt den Ausgangszustand wieder her (2 unabhängige Undo-Schritte) |
| E-25 | #13 Einfügen + Formatierung danach | „Zeile oberhalb einfügen" klicken, Cursor befindet sich (nach 3.4) in der ursprünglichen Zelle, `ControlOrMeta+a` **innerhalb der Zelle**, `page.getByTitle('Fett').click()` | Fett wird auf den erwarteten (unveränderten) Zellinhalt angewendet, **kein** falscher Text verschwindet — direkter Bezug zum Selection-Sync-Regressionsschutz (Hauptspezifikation Abschnitt 2) |
| E-26 | Grundfall mit horizontalem Merge (Feature-Rundreise 5.2 Punkt 4, sichtbar) | Tabelle mit `colspan` (z. B. über eine 2. Tabelle mit anschließendem manuellem Merge, falls in der App bedienbar, sonst über eine hochgeladene Fixture-Datei mit bereits vorhandenem `colspan` importiert) → Zeile oberhalb/unterhalb der verbundenen Zeile einfügen | bestehender Merge bleibt als eine `<td colspan="2">`-äquivalente Zelle im DOM sichtbar (`page.locator('.ProseMirror td[colspan]')` weiterhin vorhanden), neue Zeile hat plausible Zellenzahl |

**Hinweis zu Grenzfall 2/3/5/8/9/10 auf E2E-Ebene:** Diese Grenzfälle sind
laut `zeile-einfuegen-code.md` Abschnitt 2 bereits vollständig durch
`prosemirror-tables`s eigene `addRow`-Implementierung abgedeckt und werden
mit hoher Präzision auf Unit-Ebene geprüft (Abschnitt 2.1 TC-04/05/06/09
bis TC-13). Auf E2E-Ebene werden sie **nicht redundant im Detail
nachgestellt**, sondern nur im Rahmen der Feature-Rundreise (Abschnitt 3.6)
über echten Export/Reimport bestätigt — das entspricht dem in der
Anforderung Abschnitt 6, Testplanhinweis 4 geforderten „sowohl Unit- als
auch E2E", ohne die E2E-Suite unnötig mit Duplikaten der Unit-Coverage
aufzublähen.

### 3.5 Selection-Sync-Regressionstest mit Zeilen-Einfügen-Sequenz (Anforderung Abschnitt 2/7, letzter Punkt)

Ergänzung eines neuen `test()` **innerhalb** von
`tests/e2e/selection-regression.spec.ts` (nicht in `zeile-einfuegen.spec.ts`,
damit er dauerhaft Teil der bestehenden Regressions-Suite bleibt — die
Anforderung verlangt explizit Wiederverwendung dieser Datei, Abschnitt 2 der
Hauptspezifikation):

```ts
test('insert-row toolbar action followed by typing lands in the right cell', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()

  const cells = page.locator('.ProseMirror td')
  await cells.nth(2).click() // untere linke Zelle der 2×2-Tabelle
  await page.getByTitle('Zeile oberhalb einfügen').click()
  await page.keyboard.type('Nach Einfügen')

  await expect(editor).toContainText('Nach Einfügen')
  await expect(page.locator('.ProseMirror tr')).toHaveCount(3)
})
```

Zusätzlicher Test **in derselben Datei**, der die identische Sequenz mit
„Zeile unterhalb einfügen" sowie eine Kombination aus Select-all-in-Zelle →
Fett → erneutem Klick in eine andere Zelle nach dem Einfügen abdeckt (Muster
identisch zum bestehenden Test `'same regression inside a table cell...'`,
Zeile 34–50 der Datei) — stellt sicher, dass die neuen Tabellen-Commands
nicht dieselbe Klasse von Stale-Selection-Bug reproduzieren, die dieser
Testfile ursprünglich für Klicks zwischen Zellen dokumentiert.

### 3.6 Feature-Rundreise mit echtem Datei-Export (Anforderung Abschnitt 5.2) — Kernstück dieses Testplans

Für **jede** Zeile der folgenden Tabelle: neues Dokument → Tabelle über
`insertTableViaToolbar` einfügen → Zellen befüllen (`page.keyboard.type`) →
Zeile per Toolbar-Button einfügen → `exportAndUnzip(page, 'docx')` bzw.
`('odt')` (echter `page.waitForEvent('download')`, echte Datei von der
Festplatte gelesen, echtes `JSZip.loadAsync`) → Inhalt im entpackten XML
geprüft → Datei anschließend **erneut über den Datei-Upload-Input**
importiert (`input.setInputFiles({ name, mimeType, buffer })`, exakt das
Download-Buffer wiederverwendet) → Inhalt im `.ProseMirror`-DOM erneut
geprüft. Das ist die volle Rundreise **über die echte Anwendung**, nicht nur
`writeDocx`/`readDocx`/`writeOdt`/`readOdt` direkt aufgerufen (das leistet
bereits Abschnitt 2.2/2.3 auf Unit-Ebene).

| ID | Inhalt (Anforderung 5.2, Nr.) | DOCX | ODT |
|---|---|---|---|
| E-30 | 1. Einfache Tabelle, Zeile oberhalb der ersten Zeile | Export enthält 3 `<w:tr>` in korrekter Reihenfolge, neue Zeile leer, übrige Zellen inhaltlich unverändert (Text-Vergleich im rohen `document.xml`); Reimport zeigt identische Reihenfolge im DOM | analog: 3 `<table:table-row>` in `content.xml`, Reimport zeigt identische Reihenfolge |
| E-31 | 2. Zeile unterhalb der letzten Zeile | analog E-30, gespiegelt | analog |
| E-32 | 3. Zeile in der Mitte einer 3-Zeilen-Tabelle | Reihenfolge aller Zeilen (vorher/neu/nachher) im Export korrekt | analog |
| E-33 | 4. Tabelle mit horizontalem Merge (`colspan`), Zeile oberhalb/unterhalb der verbundenen Zeile | Export: `<w:gridSpan w:val="2"/>` (o. ä.) der bestehenden Zeile unverändert, neue Zeile hat korrekte effektive Spaltenzahl (Grenzfall 3/5) | Export: `table:number-columns-spanned="2"` unverändert, neue Zeile korrekte Spaltenzahl — **inklusive** Prüfung, dass die Gesamt-`table:number-columns`-Deklaration weiterhin zur tatsächlichen Zellenzahl passt (Grenzfall 5) |
| E-34 | 5. Tabelle mit vertikalem Merge (`rowspan`), Zeile **innerhalb** des Merge-Bereichs einfügen | Export: `<w:vMerge/>`-Continuation-Zellen um 1 Zeile verlängert, Reimport zeigt `rowspan` um 1 erhöht als **eine** zusammenhängende Zelle | Export: `table:number-rows-spanned` um 1 erhöht **und** die Anzahl `<table:covered-table-cell` in der/den betroffenen Zeile(n) stimmt (raw-XML-Check, analog OR-02, aber jetzt über den echten Button-Klick statt einer konstruierten Fixture — das ist der Test, der den Abschnitt-1-Bug auf vollem E2E-Pfad bestätigt) |
| E-35 | 6. Zellinhalt mit mehreren Absätzen/Formatierung in bestehender Zeile, Zeile daneben einfügen | bestehende, formatierte Zeile (mehrere `<w:p>`, `<w:b/>`) bleibt bei der Rundreise exakt erhalten | analog |
| E-36 | 7. Tabelle direkt am Dokumentanfang/-ende | siehe E-22/E-23, zusätzlich Export/Reimport-Prüfung: Struktur bleibt korrekt, Editor bleibt danach bedienbar |
| E-37 | 8. Doppelte Rundreise (Format-Wechsel hin und zurück) mit mehreren, an unterschiedlichen Positionen eingefügten Zeilen | **auf E2E-Ebene innerhalb desselben Formats** (Export→Reimport→erneuter Export desselben Formats, zweimal hintereinander): kein kumulativer Datenverlust; die **Cross-Format**-Variante (DOCX↔ODT) ist laut `zeile-einfuegen-code.md` Abschnitt 4.4 über die App-UI nicht auslösbar und wird stattdessen in CF-03 (Abschnitt 2.4) auf Unit-Ebene abgedeckt — hier **nicht** dupliziert, sondern explizit als Verweis dokumentiert |

**Abnahmekriterium (aus Anforderung Abschnitt 5.2, hier operationalisiert):**
Für alle E-30…E-37 gilt **hart**: Struktur-/Textverlust nach keiner
Rundreise (`expect(xml).toContain(...)` auf rohem XML **und** nach Reimport
im DOM). Eine falsch berechnete Spaltenzahl beim Export (Grenzfall 5) gilt
als Strukturverlust und ist damit ein Abnahme-Blocker (Anforderung Abschnitt
5, letzter Satz) — E-33 prüft das explizit für beide Formate.

### 3.7 Baseline-Rundreise (Anforderung Abschnitt 5.1) — Regressionsschutz

Kein neuer Test nötig — **Pflicht-Referenzlauf** der bereits vorhandenen
Suiten vor **und** nach jeder Änderung an der Tabellen-Logik:

- `tests/e2e/docx.spec.ts` — insbesondere `'uploads an existing DOCX file...'`
  und `'round trip: uploading then exporting unchanged...'`: reiner Upload →
  Export, **ohne** jeden Zeilen-Einfügen-Vorgang.
- `tests/e2e/odt.spec.ts` — analog.
- `src/formats/docx/__tests__/roundtrip.test.ts`,
  `src/formats/odt/__tests__/roundtrip.test.ts` (alle bestehenden
  `describe`-Blöcke, inkl. der drei bereits existierenden Tabellen-Tests bei
  Zeile 173–249 bzw. 162–210).
- `src/formats/odt/__tests__/external-fixtures.test.ts`,
  `src/formats/docx/__tests__/external-fixtures.test.ts` — **besonders**
  nach dem `odt/writer.ts`-Bugfix erneut laufen lassen (Abschnitt 2.3,
  Regressionsvorsicht): der Fix ändert das Exportverhalten für **jede**
  Tabelle mit `rowspan`, nicht nur neu eingefügte Zeilen; diese Suite deckt
  Reader-Importe ab, nicht den geänderten Writer-Pfad direkt, ist aber
  Pflicht-Referenzlauf, weil dieselbe `case 'table':`-Codestelle betroffen
  ist.

Wird als CI-Gate formuliert: **kein** Merge von Änderungen an `commands.ts`,
`Toolbar.tsx`, `WordEditor.tsx` oder `odt/writer.ts`, der einen dieser
Bestandstests rot werden lässt.

### 3.8 Rückverfolgbarkeits-Matrix (Anforderung → Testfall)

| Anforderungs-Abschnitt | Testfall(e) |
|---|---|
| 1 (# 1/# 2, Buttons) | E-02, E-03, E-04 |
| 1 (# 5, deaktivierter Zustand) | E-01, E-05, TC-19 |
| 1 (# 6, sichtbares Feedback) | E-03, E-04 (Zeilenanzahl-Änderung als Bestätigung) |
| 3.1/3.2 Grundfall | TC-01, TC-02, TC-03, E-10, E-11, E-12 |
| 3.3 rowspan-Verlängerung | TC-04, DR-02, OR-01, OR-02, E-34 |
| 3.4 Cursor-/Selektionsverhalten | TC-07, E-13, E-14 |
| 3.5 Formatierung/Zellinhalt der neuen Zeile | (dokumentiert in `zeile-einfuegen-code.md` Abschnitt 4.2 als „keine Zusatzlogik nötig" — implizit durch TC-01/TC-02 mitgeprüft: neue Zellen sind leer, tragen keine Marks) |
| 3.6 Undo/Redo | TC-08, TC-15, E-15, E-16 |
| 3.7 Kein stiller Fehlschlag | E-01, TC-12 (Grenzfall 9 auf Unit-Ebene) |
| Grenzfall 1 | TC-03 |
| Grenzfall 2 | TC-04 |
| Grenzfall 3 | TC-05 |
| Grenzfall 4 | TC-16, TC-17, TC-18, E-20, E-21 |
| Grenzfall 5 | TC-06, DR-01, OR-03, E-33 |
| Grenzfall 6 | TC-09 |
| Grenzfall 7 | TC-10 |
| Grenzfall 8 | TC-11 (verbindliche Entscheidung Variante a, siehe `zeile-einfuegen-code.md` Abschnitt 4.1) |
| Grenzfall 9 | TC-12 |
| Grenzfall 10 | TC-13 |
| Grenzfall 11 | E-22, E-23, E-36 |
| Grenzfall 12 | TC-14, E-24 |
| Grenzfall 13 | E-25, Selection-Sync-Test Abschnitt 3.5 |
| Grenzfall 14 | Abschnitt 3.9 (manuell, kein automatisierter Performance-Test in diesem Ticket — deckungsgleich mit `zeile-einfuegen-code.md` Abschnitt 9, Zeile 14) |
| Grenzfall 15 | TC-15 |
| 5.1 (Baseline-Rundreise) | Abschnitt 3.7 (Bestandstests) |
| 5.2 (Feature-Rundreise, DOCX/ODT) | E-30…E-37 |
| 5.2 (Cross-Format) | CF-01, CF-02, CF-03 (Unit-Ebene, Einschränkung dokumentiert) |
| Hauptspezifikation Abschnitt 2 (Selection-Sync) | Abschnitt 3.5 |
| `zeile-einfuegen-code.md` Abschnitt 1 (ODT-`covered-table-cell`-Bug) | OR-01, OR-02, E-34 |
| Abschnitt 7 (Freigabekriterium) | Abschnitt 5 unten |

### 3.9 Nicht automatisierbar — manuell/exploratory (Grenzfall 14, Sichtprüfung ODT in echter Zielanwendung)

| # | Prüfung | Durchführung |
|---|---|---|
| M-01 | Grenzfall 14: sehr große Tabelle (>5 Spalten, >10 Zeilen), Zeile in der Mitte einfügen | Im laufenden, nicht headless Browser eine entsprechend große Tabelle aufbauen (z. B. über eine importierte Fixture wie `BigTable.odt`), Zeile mittig einfügen, subjektiv beobachten: UI bleibt reaktionsfähig, keine spürbare Verzögerung |
| M-02 | Sichtprüfung des ODT-Exports in echter Zielanwendung | Eine Tabelle mit `rowspan`, in die eine Zeile eingefügt wurde, als ODT exportieren, die Datei in einer echten, lokal installierten LibreOffice-Writer-Instanz öffnen — bestätigt, dass die `covered-table-cell`-Korrektur (Abschnitt 2.3, OR-02) nicht nur den eigenen Reader, sondern auch eine externe Anwendung korrekt bedient (Bezug: `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19, „nicht nur durch unseren eigenen Reader wieder einlesbar") |
| M-03 | Grenzfall 9, Sichtprüfung mit realer Fremddatei | Eine der strukturell ungewöhnlichen Fixture-Dateien aus `tests/fixtures/external/{docx,odt}/` (z. B. `crazyTable.odt`, `Crazy.odt`, `feature_attributes_tables_FunnyTable_With_xmlid.odt`) hochladen, Cursor in eine Tabellenzelle setzen, „Zeile oberhalb/unterhalb einfügen" klicken — bestätigt am echten, unregelmäßigen Korpus (nicht nur der künstlich konstruierten TC-12-Fixture), dass `fixTables` bereits vor dem Command-Aufruf greift und kein Crash auftritt |

Ergebnis jeder manuellen Prüfung wird in `zeile-einfuegen-code.md` Abschnitt
11 (Abnahme-Checkliste) nachgetragen: wer, wann, welche
LibreOffice-Version, Ergebnis.

---

## 4. Testdaten/Fixtures

- Bestehende `doc()`/`paragraph()`-Helper aus `roundtrip.test.ts` sowie ein
  neuer `buildTable(rows)`-Helper (Abschnitt 2.1) — Letzterer wird in
  `tableRowCommands.test.ts` **und** in den Cross-Format-Tests (Abschnitt
  2.4) wiederverwendet, um Doppelimplementierung zu vermeiden.
- Für Grenzfall-9-Tests auf Unit-Ebene (TC-12): eine bewusst inkonsistente,
  von Hand über `wordSchema.nodeFromJSON` konstruierte Tabelle (nicht aus
  einer echten Datei), damit der worst case exakt kontrollierbar ist.
- Für die manuelle Grenzfall-9-Sichtprüfung (M-03) und Grenzfall 14 (M-01):
  bereits vorhandene Fixtures aus `tests/fixtures/external/{docx,odt}/`
  (z. B. `crazyTable.odt`, `Crazy.odt`, `BigTable.odt`,
  `feature_attributes_tables*.odt`, `OOStyledTable.odt`,
  `TableFunkyBackground.odt`) — kein neuer Fixture-Download nötig.
- `TINY_PNG`/vergleichbare Bild-Fixtures werden für diesen Testplan **nicht**
  benötigt (keine Bild-Anforderung in `zeile-einfuegen-req.md`).

---

## 5. Exit-Kriterien für diesen Testplan

Deckt sich mit `zeile-einfuegen-req.md` Abschnitt 7 und
`zeile-einfuegen-code.md` Abschnitt 11. Der Testplan gilt als **erfüllt**,
wenn:

1. Alle Unit-Testfälle TC-01…TC-19, DR-01…DR-03, OR-01…OR-04 und CF-01…CF-03
   automatisiert vorliegen und grün sind (`npm test`), insbesondere OR-02
   (der einzige Test, der den `odt/writer.ts`-Bug aus
   `zeile-einfuegen-code.md` Abschnitt 1 tatsächlich aufdeckt).
2. Alle E2E-Testfälle E-01…E-37 automatisiert vorliegen und grün sind
   (`npm run test:e2e`), für alle drei Playwright-Projekte (Desktop Chrome,
   Mobile, Tablet) — keine projektspezifischen Ausnahmen wie im
   Einfügen-Testplan nötig, da hier kein echter Clipboard-Zugriff verwendet
   wird.
3. Die Baseline-Rundreise (Abschnitt 3.7) läuft unmittelbar vor **und** nach
   dem Merge der Zeile-einfügen-Änderungen grün — **besonders** nach dem
   `odt/writer.ts`-Bugfix, da dieser jede rowspan-Tabelle betrifft, nicht
   nur neu eingefügte Zeilen.
4. Jeder Grenzfall aus Abschnitt 4 der Anforderung ist einzeln befundet
   (funktioniert / funktioniert nicht und dokumentiert / repariert) — siehe
   Rückverfolgbarkeits-Matrix Abschnitt 3.8, kein Grenzfall bleibt
   unbeantwortet. Insbesondere Grenzfall 8 (Verhalten verbindlich auf
   Variante a festgelegt, TC-11) und Grenzfall 5 (dedizierter
   Regressionstest für **beide** Formate, DR-01/OR-03/E-33).
5. Die Selection-Sync-Regressionstests (Abschnitt 3.5) sind grün und
   dauerhaft Teil von `selection-regression.spec.ts`.
6. Die manuellen Prüfschritte M-01…M-03 sind durchgeführt und in
   `zeile-einfuegen-code.md` Abschnitt 11 mit Ergebnis nachgetragen.
7. Die Cross-Format-Einschränkung (Abschnitt 2.4, nur Unit-Test-Ebene) ist im
   Freigabe-Vermerk ausdrücklich als dokumentierte, strukturelle
   Einschränkung genannt, nicht stillschweigend als vollwertig E2E-getestet
   behauptet (Anforderung Abschnitt 7; `zeile-einfuegen-code.md` Abschnitt
   4.4/11).
8. `npm run build` (`tsc -b`) läuft nach jeder Code-Änderung fehlerfrei
   durch — insbesondere nach dem `odt/writer.ts`-Bugfix und den neuen
   Toolbar-`disabled`/`useState`-Ergänzungen (`zeile-einfuegen-code.md`
   Abschnitt 10, Schritt 1).

Erst wenn alle acht Punkte erfüllt sind, darf laut `zeile-einfuegen-req.md`
Abschnitt 7 der Backlog-Status von `zeile-einfuegen` auf **vorhanden**
gesetzt werden; andernfalls **teilweise**, mit den konkret fehlenden
Teilpunkten hier bzw. in `zeile-einfuegen-code.md` Abschnitt 11
nachgetragen.
