# Testplan (QA): Feature „Zeile löschen“

Gegenstück zu `specs/zeile-loeschen-req.md` (Anforderungen) und
`specs/zeile-loeschen-code.md` (Umsetzungsplan). Dieser Testplan ist **nicht**
Ergebnis einer bloßen Übernahme der beiden Vorgänger-Dateien, sondern einer eigenen
Prüfung des tatsächlichen Repository-Zustands (Stand dieser Datei, 2026-07-04):

- `src/formats/shared/editor/tableCommands.ts`, `TableToolbar.tsx`, `icons.tsx`,
  `runCommand.ts` **existieren nicht**.
- `src/formats/shared/editor/commands.ts` exportiert **kein** `deleteTableRow`, nur
  `insertTable`, `isInTable` (re-export), `setAlign`, `setHeading`, `toggleList`,
  `liftFromList`, `insertImage`, `applyMarkColor`, `clearMarkColor`.
- `src/formats/shared/editor/Toolbar.tsx` enthält genau einen Tabellen-Button
  („Tabelle einfügen“, Zeile 228–239), keinen zweiten für Zeilen-Operationen.
- `src/formats/shared/editor/WordEditor.tsx` rendert nur `<Toolbar>` (Zeile 118),
  keine `<TableToolbar>`.
- `tests/e2e/` enthält `docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`,
  `selection-regression.spec.ts` — keine Datei zu Tabellenzeilen.
- `src/formats/odt/writer.ts` erzeugt tatsächlich kein
  `<table:covered-table-cell/>` (Bug bestätigt, siehe Abschnitt 3.3 unten).

**Konsequenz für diesen Testplan:** Er ist bewusst **gegen den Soll-Zustand aus
`zeile-loeschen-code.md` geschrieben**, nicht gegen den Ist-Zustand — die Tests
sollen heute (vor Implementierung) fehlschlagen bzw. nicht kompilieren
(`deleteTableRow`/`TableToolbar` fehlen), und nach Umsetzung des Codeplans grün
werden. Das ist der geforderte TDD-Beleg dafür, dass ein späteres „grün“ tatsächlich
die Funktion nachweist und nicht ein zufällig grünes, aber wirkungsloses Test-Stub.
Wie in Abschnitt 0 von `zeile-loeschen-req.md` gefordert, gilt „nicht vertrauenswürdig
in beide Richtungen“ auch hier: Weder wird unterstellt, dass der Codeplan lückenlos
korrekt ist (siehe Abschnitt 7, „Risiken/Rückfragen an Dev“ unten, insbesondere zum
No-Op-Verhalten von `deleteRow` und zum ODT-Bugfix), noch wird ein späteres „alle
Tests grün“ ohne die konkreten Prüfungen in dieser Datei akzeptiert.

---

## 1. Prüfgrundsatz und Testebenen

### 1.1 Zwei Ebenen, strikt getrennt

| Ebene | Was sie beweist | Was sie NICHT beweist |
|---|---|---|
| **Unit-Tests** (Vitest, `jsdom`) | Die reine Transaktionslogik von `deleteTableRow`/`removeWholeTable` ist für sich korrekt; Reader/Writer erzeugen bei Im-/Export nach einer programmatisch ausgeführten Löschung die richtige XML-Struktur. | Dass ein Mensch den Button überhaupt sehen/anklicken kann, dass die Maus-`CellSelection` visuell funktioniert, dass ein echter Datei-Download im Browser tatsächlich die richtigen Bytes liefert, dass Touch-Geräte den Button bedienen können. |
| **Echte Playwright-E2E-Tests** (echter Chromium/echte Devices laut `playwright.config.ts`) | Der Button existiert, ist sichtbar/unsichtbar zum richtigen Zeitpunkt, reagiert auf echte Klicks/Tastatureingaben/Maus-Drags, ein echter Datei-Upload wird korrekt importiert, ein echter Datei-Download liefert eine Datei, deren Inhalt (nach Öffnen mit JSZip) die erwartete Struktur hat. | Feingranulare interne Transaktionsdetails (z. B. exakte `rowspan`-Dekrement-Arithmetik in jedem denkbaren Fall) — dafür sind die Unit-Tests da, E2E deckt die repräsentativen Fälle ab. |

**Bindende Regel für diesen Testplan:** Jeder E2E-Test in Abschnitt 4 muss über
`page.getByRole`/`getByTitle`/`.ProseMirror`-Locator, `page.keyboard`, `page.mouse`
und `input[type=file]`/`page.waitForEvent('download')` interagieren — **niemals**
über `page.evaluate(() => view.dispatch(...))`, `page.evaluate(() =>
deleteTableRow()(...))` oder einen sonstigen Zugriff auf internes JS aus dem
Testcode heraus. Ein Test, der die Editor-API direkt aus `page.evaluate` aufruft,
sieht wie ein E2E-Test aus, ist aber ein Unit-Test mit Browser-Kulisse und zählt
für die Anforderung „echte Playwright-Browser-Tests“ **nicht**. Diese Regel gilt
für alle Tests in Abschnitt 4 ausnahmslos; Code-Review-Kriterium 4 in Abschnitt 8
prüft das explizit gegen den eingereichten Diff.

### 1.2 Bezugsrahmen

Alle Testfall-Nummern in diesem Dokument referenzieren `zeile-loeschen-req.md`:
„Grenzfall N“ → Abschnitt 3, „Testfall N“ (ohne Präfix) → Abschnitt 6,
„Rundreise-Testfall N“ → Abschnitt 4.2. Dateipfade/Funktionsnamen referenzieren
`zeile-loeschen-code.md` Abschnitt 3/5/6 — sollte die tatsächliche Umsetzung davon
abweichen (anderer Funktions-/Dateiname), sind die Tests entsprechend nachzuführen;
die **Testfälle selbst** (was geprüft wird) bleiben davon unberührt.

---

## 2. Testmatrix (Rückverfolgbarkeit)

| # | Fall (req.md) | Unit (2.x) | E2E (4.x) | Rundreise (3.x) |
|---|---|---|---|---|
| Grenzfall 1 / Testfall 1 | Kollabierter Cursor, eine Zelle | 3.1-A | 4.2-T1 | — |
| Grenzfall 2 / Testfall 3 | Teil-Zeilen-`CellSelection` | 3.1-B | 4.2-T3 | — |
| Grenzfall 3 / Testfall 2 | Mehrzeilen-`CellSelection` | 3.1-C | 4.2-T2 | RT-7 |
| Grenzfall 4 / Testfall 4 | Letzte Zeile löscht Tabelle | 3.1-D/E | 4.2-T4 | RT-5 |
| Grenzfall 5 / Testfall 5 | Rowspan-Anker gelöscht | 3.1-F | 4.2-T5 | RT-3 |
| Grenzfall 6 | Überdeckte Rowspan-Zeile gelöscht | 3.1-G | (in 4.2-T5 mit-geprüft) | RT-3 |
| Grenzfall 7 | Erste Zeile gelöscht, Off-by-one | 3.1-H | — (Unit ausreichend) | — |
| Grenzfall 8 | Letzte Zeile bei >1 Zeile | 3.1-I | — (Unit ausreichend) | — |
| Grenzfall 9 | Tabelle an Dokumentanfang/-ende | 3.1-J | — (Unit ausreichend) | — |
| Grenzfall 10 | Mehrere Absätze/Bild in Zeile | 3.1-K | RT-6 | RT-6 |
| Grenzfall 11 | Verschachtelte Tabelle | 3.1-L | — (Unit ausreichend, s. 3.1) | — |
| Grenzfall 12/13 | Undo / Undo+Redo | — (bewusst nicht Unit) | 4.2-T8, T9 | — |
| Grenzfall 14 | Selection-Sync-Regression | — | **4.2-T7 (Pflicht)** | — |
| Grenzfall 15 / Testfall 10 | Kein Tabellenkontext, kein stiller Fehlschlag | 3.1-M | 4.2-T10 | — |
| Grenzfall 16 | Reine Colspan-Zeile gelöscht | 3.1-N | (in 4.2-T5-Variante) | RT-4 |
| Grenzfall 17 / Testfall 13 | Große Tabelle (>5 Spalten, >10 Zeilen) | 3.1-O | 4.2-T13 | RT-11 |
| Grenzfall 18 | Reale Fremddatei, exotische Struktur | — | 3.5 (Fixture-Import + Löschen) | 3.5 |
| Grenzfall 19 | Track-Changes | **Explizit nicht getestet** (Phase 3, s. req.md Abschnitt 3.19) | — | — |
| Grenzfall 20 / Testfall 14 | Mobile/Tablet | — | 4.4 (alle Projekte automatisch) | — |
| Testfall 6 | Entf leert nur Inhalt | 3.1-P | 4.2-T6 | — |
| Testfall 11/12 | Export/Reimport nach Löschen (DOCX/ODT) | — | 4.3-T11, T12 | RT-1, RT-2 |
| Rundreise Baseline 4.1 | Unveränderte Rundreise vor Löschtest | 3.6 | — | RT-0 |
| Rundreise-Testfall 8/9/10 | Cross-Format | 3.4 | — | RT-8, RT-9, RT-10 |

---

## 3. Teil A — Unit-Tests

### 3.1 NEU: `src/formats/shared/editor/__tests__/deleteTableRow.test.ts`

Reine Zustands-Tests gegen `deleteTableRow()`/`removeWholeTable` (aus
`tableCommands.ts` bzw. re-exportiert aus `commands.ts`) über direkt via
`wordSchema.nodeFromJSON(...)` bzw. `EditorState.create({ doc, schema: wordSchema,
plugins: [tableEditing()] })` konstruierte Zustände — **kein** DOM/View nötig.
`plugins: [tableEditing()]` muss enthalten sein, damit `CellSelection` überhaupt per
`CellSelection.create(doc, anchorPos, headPos)` konstruiert werden kann (aus
`prosemirror-tables` importiert) und damit die `appendTransaction`/`fixTables()`-
Absicherung (`zeile-loeschen-code.md` Abschnitt 1, Punkt 5) mitläuft — sonst würde
ein Test grün laufen, der ohne das Plugin in der echten App gar nicht repräsentativ
wäre.

Hilfsfunktion (analog zum bereits im Repo etablierten Muster fertiger JSON-Fixtures
in `roundtrip.test.ts`, aber hier direkt als `EditorState`, nicht nur als JSON):

```ts
function makeTableState(rows: string[][], opts?: { rowspanAt?: [row: number, col: number, span: number] }) {
  const cell = (text: string, attrs = { colspan: 1, rowspan: 1 }) =>
    wordSchema.nodes.table_cell.create(attrs, wordSchema.nodes.paragraph.create(null, wordSchema.text(text)))
  // ... rowspanAt baut eine echte mehrzeilige rowspan-Struktur (Ankerzelle + fehlende
  // Position in der überdeckten Zeile), NICHT nur rowspan:1 wie im bestehenden
  // roundtrip.test.ts-Grundmuster — siehe zeile-loeschen-code.md Abschnitt 1, Punkt 4
  // zur Warnung, dass ein einzeiliger Test die Rowspan-Logik nicht wirklich prüft.
  const table = wordSchema.nodes.table.create(null, rows.map((r) => wordSchema.nodes.table_row.create(null, r.map((t) => cell(t)))))
  const doc = wordSchema.nodes.doc.create(null, [table])
  return EditorState.create({ doc, schema: wordSchema, plugins: [tableEditing()] })
}
```

| ID | Testfall | Aufbau | Aktion | Assertion |
|---|---|---|---|---|
| 3.1-A | Grenzfall 1: Kollabierter Cursor | 3 Zeilen × 2 Spalten, Text „R1C1“…„R3C2“ | Cursor per `TextSelection` in Zelle Zeile 2, Spalte 1 setzen, `deleteTableRow()(state, dispatch)` | `doc.content` hat noch 1 Tabelle mit 2 Zeilen; Zeile-1-Text „R1C1“/„R1C2“ und Zeile-2-Text (ehem. Zeile 3) „R3C1“/„R3C2“ vorhanden, „R2C1“/„R2C2“ nirgends im `doc.toJSON()` |
| 3.1-B | Grenzfall 2: Teil-Zeilen-`CellSelection` | 4-Spalten-Tabelle, 2 Zeilen | `CellSelection` über Spalte 0–1 (nicht 2–3) derselben Zeile | Komplette Zeile (alle 4 Zellen) verschwindet, nicht nur Spalte 0–1; verbleibende Zeile unverändert |
| 3.1-C | Grenzfall 3: Mehrzeilen-`CellSelection` | 4 Zeilen × 3 Spalten | `CellSelection` über Zeile 1–2 (von 0-indiziert) | Genau 2 Zeilen bleiben übrig (ehem. Zeile 0 und 3), `tr.getMeta` bzw. Anzahl der `dispatch`-Aufrufe = **1** (ein Undo-Schritt, s. u.) |
| 3.1-D | Grenzfall 4: Einzige Zeile in mehrelementigem Dokument | `doc` = [Absatz, Tabelle(1 Zeile), Absatz] | Cursor in der einzigen Zeile | `doc.content` enthält keine Tabelle mehr, aber weiterhin 2 Absätze; Cursor-Selection liegt in einem `paragraph` |
| 3.1-E | Grenzfall 4 (2. Teil): Tabelle als einziges Dokumentelement | `doc` = [Tabelle(1 Zeile, 1 Spalte)] | Cursor in der einzigen Zelle | `doc.content` hat genau 1 leeren `paragraph`, **kein** leeres `doc` (`doc.childCount >= 1` zwingend, da Schema `content: 'block+'`) |
| 3.1-F | Grenzfall 5: Rowspan-Anker gelöscht | 3 Zeilen, Spalte 0 = rowspan 2 über Zeile 0–1 mit Text „Anker“, Zeile 2 unabhängig | Zeile 0 (Ankerzeile) löschen | Neue Zeile 0 (ehem. Zeile 1) enthält jetzt die migrierte Zelle mit Text „Anker“ und `rowspan === 1`; kein Datenverlust, keine doppelte Zelle |
| 3.1-G | Grenzfall 6: Überdeckte Rowspan-Zeile gelöscht | dieselbe Struktur wie 3.1-F | Zeile 1 (überdeckte, nicht Ankerzeile) löschen | Zeile 0 bleibt Ankerzeile mit Text „Anker“, `rowspan` sinkt von 2 auf 1, Inhalt unverändert |
| 3.1-H | Grenzfall 7: Erste Zeile, dann direkt zweite Löschung | 4 Zeilen | Erste Zeile löschen, danach (im selben Testlauf, zweiter `deleteTableRow`-Aufruf mit neu ermitteltem Cursor) die neue erste Zeile löschen | Kein Off-by-one: Nach beiden Löschungen bleiben genau die ursprünglichen Zeilen 2 und 3 (0-indiziert) übrig, in unveränderter Reihenfolge |
| 3.1-I | Grenzfall 8: Letzte Zeile bei >1 Zeile | 3 Zeilen | Letzte Zeile löschen | Tabelle bleibt mit 2 Zeilen bestehen (kein `removeWholeTable`-Pfad); Cursor-Assertion: `state.selection.$from` liegt in der neuen letzten Zeile, gleiche Spalte wie vor dem Löschen |
| 3.1-J | Grenzfall 9: Tabelle am Dokumentanfang/-ende | `doc` = [Tabelle(1 Zeile)] (Anfang) bzw. `doc` = [Absatz, Tabelle(1 Zeile)] (Ende) | Einzige Zeile löschen | Kein Wurf/Exception, `TextSelection.near(...)` liefert eine gültige, auflösbare Position; `state.doc.resolve(pos)` wirft nicht |
| 3.1-K | Grenzfall 10: Mehrere Absätze/Bild in Zeile | Zelle mit 2 Absätzen + `image`-Knoten in der zu löschenden Zeile | Zeile löschen | `doc.toJSON()` enthält an keiner Stelle mehr den charakteristischen Bild-`src`-Wert oder die Absatz-Texte dieser Zeile — Volltextsuche im resultierenden JSON-String |
| 3.1-L | Grenzfall 11: Verschachtelte Tabelle | Äußere Tabelle, eine Zelle enthält eine innere Tabelle (2 Zeilen) | (a) Cursor in Zeile der äußeren Tabelle (außerhalb der inneren Zelle) löschen → äußere Zeile inkl. kompletter innerer Tabelle verschwindet, kein Wurf. (b) Cursor **in der inneren Tabelle** löschen → nur innere Zeile betroffen, äußere Tabelle unverändert. (c) Innere Tabelle hat nur 1 Zeile/1 Zelle, dort löschen → innere Tabelle wird zu einem Ersatz-Absatz *innerhalb der äußeren Zelle* (nicht der äußeren Tabelle), äußere Zellstruktur bleibt sonst intakt | kein Absturz in allen drei Fällen; `wordSchema.nodeFromJSON(doc.toJSON())` validiert erfolgreich (Schema-Konformität) |
| 3.1-M | Grenzfall 15: Kein Tabellenkontext | Cursor in normalem Fließtext-Absatz außerhalb jeder Tabelle | `deleteTableRow()(state, dispatch)` | Rückgabewert `false`; `dispatch` (als Spy) wird **nicht** aufgerufen; kein Wurf |
| 3.1-N | Grenzfall 16: Reine Colspan-Zeile | Zeile mit einer Zelle `colspan: 2` (kein `rowspan`), andere Zeilen normal | Diese Zeile löschen | Zeile inkl. verbundener Zelle vollständig weg, keine Migration/Artefakt in Nachbarzeilen, deren `colspan`-Werte unverändert |
| 3.1-O | Grenzfall 17: Große Tabelle | 12 Zeilen × 6 Spalten, jede Zelle mit eindeutigem Text `R{row}C{col}` | Zeile 6 (mittig) löschen | Alle 11 verbleibenden Zeilen haben exakt ihren ursprünglichen Text an der ursprünglichen relativen Position (Zeilen 0–5 unverändert, ehem. Zeilen 7–11 auf neue Indizes 6–10 verschoben, Inhalt exakt gleich) |
| 3.1-P | Ergänzung zu Testfall 6 (Abgrenzung, Unit-Ebene) | 2 Zeilen × 3 Spalten mit Text | `CellSelection` über eine komplette Zeile aufziehen, dann **nicht** `deleteTableRow`, sondern die Standard-`baseKeymap`-Delete-Logik simulieren: `state.tr.deleteSelection()` (entspricht dem, was `Delete`-Taste auslöst) | Zeilenanzahl bleibt bei 2 (Struktur unverändert), aber Zellinhalte der selektierten Zeile sind geleert (leere Absätze) — Beleg auf Modell-Ebene für die in `zeile-loeschen-code.md` Abschnitt 1, Punkt 3 behauptete `CellSelection.replace()`-Eigenschaft, **nicht nur durch Code-Lesen angenommen** |
| 3.1-Q | Ergänzung zu Grenzfall 4: Vollständig markierte Mehrzeilen-Selektion | 3-Zeilen-Tabelle, `CellSelection` deckt **alle 3** Zeilen ab (nicht nur eine 1-Zeilen-Tabelle) | `deleteTableRow()(state, dispatch)` | Auch hier greift der Tabelle-komplett-Pfad (kein stiller No-Op wie bei direktem `deleteRow`-Aufruf, s. `zeile-loeschen-code.md` Abschnitt 1, Punkt 1) — das ist der Regressionstest, der genau die dort beschriebene Falle abdeckt, falls die Implementierung `deleteRow` doch direkt statt über die eigene `wholeTableSelected`-Prüfung aufruft |
| 3.1-R | Undo-Schritt-Granularität (Abschnitt 2.6) | Mehrzeilen-`CellSelection` über 3 Zeilen | `deleteTableRow()(state, dispatch)` mit `dispatch` als Spy | Spy wird **genau einmal** aufgerufen (eine Transaktion) — Voraussetzung dafür, dass `history()` das später als einen Undo-Schritt gruppiert; das eigentliche Undo/Redo-*Verhalten* wird bewusst nicht hier, sondern in 4.2-T8/T9 geprüft (echte `history()`-Plugin-Instanz + echtes Strg+Z nötig) |

**Ausdrücklich nicht Gegenstand dieser Unit-Tests:** Undo/Redo-Endverhalten
(Grenzfall 12/13) und die visuelle CSS-Markierung von `.selectedCell`
(`zeile-loeschen-code.md` Abschnitt 3.8) — beides erfordert eine echte
View/DOM-Instanz bzw. echtes Rendering und wird ausschließlich auf E2E-Ebene
geprüft (Abschnitt 4.2-T8/T9 bzw. 4.5).

### 3.2 NEU: `src/formats/docx/__tests__/rowDelete.roundtrip.test.ts`

Reader/Writer-Rundreise, DOCX. Muster wie bestehendes `roundtrip.test.ts`
(`writeDocx`/`readDocx`, `paragraph()`-Helper), aber **mit echtem Aufruf von
`deleteTableRow()`** auf einem zuvor aufgebauten `EditorState` statt direkt
konstruierter Nach-Löschen-JSON-Strukturen — das ist der entscheidende
Unterschied zum bestehenden Test, der nur bereits-fertige Strukturen prüft
(siehe `zeile-loeschen-req.md` Abschnitt 0, letzter Punkt).

Ablaufschema pro Testfall: `EditorState` mit Tabelle aufbauen → `deleteTableRow()`
anwenden → `state.doc.toJSON()` in `WordDocumentContent.body` einsetzen →
`writeDocx(content, 'test.docx')` → resultierenden `Blob` mit `readDocx` erneut
einlesen → sowohl das rückgelesene ProseMirror-JSON **als auch** das rohe
`word/document.xml` (per `JSZip.loadAsync` auf denselben `Blob`, analog zu
`tests/e2e/docx.spec.ts` Zeile 78–79) prüfen — die XML-Prüfung ist notwendig, weil
ein rein über den eigenen Reimport geführter Test denselben (hypothetischen)
Schreibfehler nicht aufdecken würde, den der Reimport-Code am Ende ja wieder
„glättet“ (Analogie zum in `zeile-loeschen-code.md` Abschnitt 1, Punkt 4
beschriebenen Blindspot beim ODT-Reader).

| ID | Rundreise-Testfall (req.md 4.2) | Prüfung |
|---|---|---|
| RT-1 | 1: Mehrzeilige Tabelle, eine Zeile gelöscht | Reimportiertes JSON hat korrekte Zeilenzahl/-inhalte; rohes XML: Anzahl `<w:tr` exakt um 1 reduziert, `w:tblGrid`-Spaltenanzahl unverändert, kein `<w:tr>` mit dem gelöschten Zelltext mehr vorhanden |
| RT-3 | 3: Rowspan-Anker gelöscht | Reimport: migrierte Zelle mit `rowSpan` korrekt dekrementiert an richtiger Stelle; rohes XML: `<w:vMerge w:val="restart"/>` bzw. Fortsetzungs-`<w:vMerge/>` für die verbleibende(n) Zeile(n) konsistent (kein `vMerge`-Fortsetzungs-Tag ohne vorausgehenden „restart“) |
| RT-4 | 4: Colspan-Zeile gelöscht | Reimport: Zeile inkl. verbundener Zelle vollständig weg; rohes XML: übrige `<w:gridSpan w:val="…"/>`-Werte in anderen Zeilen unverändert |
| RT-5 | 5: Letzte verbleibende Zeile gelöscht | Reimport: kein `table`-Knoten mehr im Dokument-JSON; rohes XML: kein `<w:tbl>`-Element mehr vorhanden; Nachbar-Absätze (davor/danach im Testaufbau) textlich unverändert |
| RT-6 | 6: Zeile mit Bild gelöscht | Reimport: kein `image`-Knoten mit der ursprünglichen `src` mehr im JSON; rohes ZIP: `word/media/`-Ordner enthält **keine** Datei, die im `word/document.xml.rels` nicht mehr referenziert ist — Test öffnet `word/_rels/document.xml.rels` zusätzlich zu `word/media/` und vergleicht die Dateilisten (jede Datei in `media/` muss eine passende `Relationship` haben und umgekehrt jede Bild-Relationship muss im Dokument referenziert sein) |
| RT-7 | 7: Mehrzeilen-`CellSelection` gelöscht | Reimport: exakt die erwarteten (nicht mehr, nicht weniger) Zeilen fehlen, per Text-Fingerprint jeder verbliebenen Zeile geprüft |
| RT-11 | 11: Große Tabelle, mittlere Zeile gelöscht | Reimport: alle übrigen Zellinhalte identisch und in unveränderter Reihenfolge (gleicher Textfingerprint-Vergleich wie 3.1-O, aber jetzt über die komplette Reader/Writer-Kette statt nur im Editor-Modell) |

### 3.3 NEU: `src/formats/odt/__tests__/rowDelete.roundtrip.test.ts`

Analog zu 3.2, für ODT (`writeOdt`/`readOdt`), deckt RT-2, RT-3 (ODT-Teil), RT-4
(ODT-Teil), RT-5 (ODT-Teil), RT-6 (ODT-Teil), RT-7 (ODT-Teil), RT-11 (ODT-Teil) ab —
gleiche Tabelle wie 3.2, aber mit `table:table-row`/`table:table-cell`/
`table:number-columns-spanned`/`table:number-rows-spanned` statt der DOCX-Pendants,
und `Pictures/`-Ordner statt `word/media/` für den Bild-Verwaisungstest (RT-6).

**Zusätzlich zwingend (blockiert Abnahmekriterium 8 aus `zeile-loeschen-req.md`
Abschnitt 8, siehe auch `zeile-loeschen-code.md` Abschnitt 5.2):**

- **Test „exportiert `<table:covered-table-cell/>` für eine von einer Rowspan-Zelle
  unberührt bleibende Zeile, nachdem eine andere Zeile gelöscht wurde“:**
  3-Zeilen-Tabelle aufbauen, Spalte 0 als Rowspan-Paar über Zeile 0+1 (Ankerzelle
  in Zeile 0, `rowspan: 2`), Zeile 2 unabhängig davon mit normalem Inhalt. Zeile 2
  löschen (das Rowspan-Paar bleibt unberührt) → `writeOdt` → **rohes** `content.xml`
  aus dem erzeugten `Blob` extrahieren (`JSZip.loadAsync`, dann
  `zip.file('content.xml')!.async('text')`, analog zu `tests/e2e/odt.spec.ts`
  Zeile 63–64) → Assertion: XML enthält **mindestens ein**
  `<table:covered-table-cell` als direktes Kind der zweiten `<table:table-row>`.
  Dieser Test **muss vor dem in `zeile-loeschen-code.md` Abschnitt 5.2
  beschriebenen Fix rot sein** (sonst beweist er nichts) — Prüfschritt für die
  QA-Freigabe: einmal gegen den unveränderten `writer.ts` laufen lassen und
  Fehlschlag beobachten, bevor der Fix als „nachgewiesen wirksam“ gilt.
- **Test „`colCount` berücksichtigt `colspan` in der ersten Zeile korrekt“**
  (Nebenbefund aus `zeile-loeschen-code.md` Abschnitt 5.2, letzter Absatz): Erste
  Zeile mit einer `colspan: 2`-Zelle + einer normalen Zelle (macht 3 Spalten
  gesamt), zweite Zeile mit 3 normalen Zellen → Export → rohes XML: Anzahl
  `<table:table-column>` (bzw. die aus `colCount` abgeleitete Spaltenzahl in den
  Zeilen-Elementen) ist **3**, nicht 2.
- **Regressions-Check gegen bestehenden Test:** Der bereits vorhandene Test
  „preserves merged cells (colspan/rowspan)“
  (`src/formats/odt/__tests__/roundtrip.test.ts`, Zeile 194–209) muss nach dem Fix
  weiterhin grün sein (`npm run test -- roundtrip.test.ts` gezielt laufen lassen)
  — der Fix darf die bestehende, funktionierende Colspan-Behandlung nicht
  brechen.
- **Ergänzung zu diesem bestehenden Test:** Er wird um einen echten,
  **über zwei Zeilen reichenden** `rowspan`-Fall erweitert (das DOCX-Pendant,
  Zeile 223–248, hat das bereits; das ODT-Pendant testet laut Codeplan-Befund
  bisher ausschließlich `rowspan: 1`) — unabhängig von „Zeile löschen“ als
  Voraussetzung, damit der Codeplan-Befund aus Abschnitt 1, Punkt 4 nicht nur
  behauptet, sondern durch einen Testlauf **bestätigt** ist, dass dieser Fall vor
  dem Fix tatsächlich fehlschlägt bzw. gültige-aber-falsche XML erzeugt.

### 3.4 NEU: `src/formats/shared/editor/__tests__/rowDelete.crossFormat.test.ts`

| ID | Rundreise-Testfall | Ablauf |
|---|---|---|
| RT-8 | 8: ODT → Zeile löschen → DOCX → reimportieren | `readOdt` auf im Test erzeugte ODT-Tabelle → `deleteTableRow()` im Editor-Modell → `writeDocx` → `readDocx` → Struktur (verbleibende Zeilen, verbundene Zellen) konsistent |
| RT-9 | 9: DOCX → Zeile löschen → ODT → reimportieren | umgekehrt |
| RT-10 | 10: Doppelte Rundreise | DOCX → Zeile löschen → ODT → (laden, keine weitere Änderung) → DOCX → Inhalt entspricht weiterhin dem erwarteten Nach-Löschen-Zustand; insbesondere: der ODT-Zwischenschritt darf keine zusätzliche, in DOCX nicht vorhandene Struktur (z. B. fehlerhafte `covered-table-cell`-Handhabung, s. 3.3) einschleusen, die erst beim zweiten Rücksprung nach DOCX auffällt |

### 3.5 NEU: Reale Fixture-Fälle (Baseline 4.1 / Grenzfall 18)

Ergänzung in den Dateien aus 3.2/3.3 (kein drittes Modul nötig — Fixture-Ladepfad
aus `external-fixtures.test.ts`, `FIXTURES_DIR`-Konstante, wiederverwenden):

- **Baseline 4.1 zuerst, ohne jede Löschung:** Reale Tabellen-Fixture
  (`tests/fixtures/external/docx/TestTableColumns.docx`,
  `tests/fixtures/external/odt/TestTextTable.odt`) importieren → **ohne Änderung**
  exportieren → reimportieren → Tabellenstruktur (Zeilenzahl, verbundene Zellen)
  entspricht dem ersten Import. **Diese Baseline muss zuerst grün sein**, sonst ist
  ein späterer Fehlschlag der eigentlichen Lösch-Tests nicht eindeutig zuzuordnen
  (siehe `zeile-loeschen-req.md` Abschnitt 4.1, letzter Satz).
- **Danach mit Löschung (Grenzfall 18):** Für jede der Fixtures
  `BigTable.odt`, `crazyTable.odt`, `feature_attributes_tables.odt`,
  `Tabelle1.odt`, `TestTextTable.odt`, `tableRowDeletionTest.odt` (letztere ist im
  Fixture-Korpus bereits mit passendem Namen vorhanden und sollte bevorzugt
  verwendet werden), sowie `TestTableColumns.docx`, `deep-table-cell.docx`,
  `table-indent.docx` (DOCX): Datei importieren → Cursor programmatisch in die
  erste Zelle der ersten gefundenen Tabelle setzen → `deleteTableRow()` anwenden →
  Assertion: kein Wurf, `wordSchema.nodeFromJSON(result.body)` validiert das
  Ergebnis erfolgreich (Schema-Konformität als Mindestnachweis „keine stille
  Korruption“). Wo `removeRow`/`removeWholeTable` erkennbar ein deterministisches,
  aber möglicherweise überraschendes Verhalten zeigt (z. B. bei `gridSpan`/`vMerge`-
  Kombinationen, die vom eigenen Reader in ein Format überführt wurden, das nicht
   1:1 dem Original entspricht), wird das **dokumentiert, nicht als Fehlschlag
  gewertet** — sofern kein Crash und keine Schema-Verletzung auftritt (Anforderung
  aus Grenzfall 18: „mindestens kein Absturz und keine stille Korruption“).

### 3.6 Bestehende Rundreise-Tests — Regressionsschutz

`src/formats/docx/__tests__/roundtrip.test.ts` (Abschnitt „round trip: tables“,
Zeile 173–252) und `src/formats/odt/__tests__/roundtrip.test.ts` (Zeile 162–210)
müssen nach allen Änderungen aus diesem Feature (insbesondere dem ODT-Bugfix aus
3.3) **unverändert grün** bleiben. Vor Abschluss der QA-Prüfung: vollständigen
`npm run test`-Lauf (nicht nur die neuen Dateien) ausführen und mit dem Stand vor
den Änderungen vergleichen — keine vorher grüne Testdatei darf rot werden.

---

## 4. Teil B — Echte Playwright-E2E-Tests

### 4.1 Bindende Konventionen (aus bestehenden Specs übernommen)

- Karten-Locator wie in `tests/e2e/odt.spec.ts`/`docx.spec.ts`/
  `selection-regression.spec.ts`: `docxCard(page)`/`odtCard(page)` als
  `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: … }) })`.
- Editor-Locator: `page.locator('.ProseMirror')`.
- Button-Klicks über `page.getByRole('button', { name: … })` bzw.
  `page.getByTitle('Zeile löschen')` (der Codeplan sieht `title="Zeile löschen"`
  **und** `aria-label="Zeile löschen"` vor, s. `zeile-loeschen-code.md`
  Abschnitt 3.6 — beide Attribute müssen tatsächlich gerendert werden, sonst
  schlägt `getByTitle` bzw. eine Accessibility-Prüfung fehl).
- Datei-Upload: `input.setInputFiles({ name, mimeType, buffer })` auf
  `card.locator('input[type="file"]')` — Buffer entweder aus einer echten Fixture
  (`node:fs/promises`, Pfad wie in 3.5) oder einer im Test mit `JSZip`
  handgebauten Minimal-Datei (Muster `buildSampleDocx`/`buildSampleOdt` aus
  `docx.spec.ts`/`odt.spec.ts`, aber mit eingebetteter Tabelle im
  `document.xml`/`content.xml`).
- Datei-Export/-Download: `const downloadPromise = page.waitForEvent('download')`
  **vor** dem Klick auf „Exportieren“ registrieren, danach
  `await download.path()`, Datei mit `node:fs/promises` lesen, mit
  `JSZip.loadAsync` öffnen, einzelne XML-Teile per `zip.file(...).async('text')`
  prüfen — exakt das bestehende Muster aus `docx.spec.ts` Zeile 70–82 /
  `odt.spec.ts` Zeile 55–67. **Diese Prüfung der heruntergeladenen Datei ist
  Pflichtbestandteil jedes Testfalls, der einen Export nach einer Löschung
  behauptet** (Testfälle 11/12, RT-1..RT-11 auf E2E-Ebene in 4.3).
- Konsole-/Seitenfehler-Wächter: In jedem Testfall aus Abschnitt 4.2, der
  „keine Konsole-Exception“ behauptet (insbesondere T7, T10), wird zu Testbeginn
  `const errors: string[] = []; page.on('pageerror', (e) => errors.push(String(e)))`
  registriert und am Testende `expect(errors).toEqual([])` geprüft — nicht nur
  implizit über „Test ist nicht abgestürzt“ angenommen.
- Neue Tabelle für Testaufbau: über den bestehenden Button „Tabelle einfügen“
  (`page.getByRole('button', { name: 'Tabelle einfügen' })`, erzeugt laut
  aktuellem `commands.ts` eine feste 2×2-Tabelle) klicken, danach bei Bedarf
  per Tab/Klick weitere Zeilen ergänzen (mehrfacher Klick auf „Tabelle einfügen“
  fügt **eine weitere** 2×2-Tabelle ein, nicht mehr Zeilen an eine bestehende —
  für Tests mit >2 Zeilen daher entweder eine Fixture mit vorgefertigter
  Tabellenstruktur hochladen, oder — sobald das Nachbarfeature
  „zeile-einfuegen“ verdrahtet ist — dessen Button nutzen; bis dahin: Tabellen
  mit mehr als 2 Zeilen in diesen Tests über einen Datei-Upload einer im Test
  gebauten DOCX/ODT-Datei mit passender Zeilenzahl erzeugen, nicht rein über
  UI-Interaktion zusammenbauen).

### 4.2 NEU: `tests/e2e/table-row-delete.spec.ts`

Läuft **ohne** `test.describe.configure({ ... })`-Projekt-Einschränkung, dadurch
automatisch auf allen drei in `playwright.config.ts` konfigurierten Projekten
(„Desktop Chrome“, „Mobile“/Pixel 7, „Tablet“/iPad Mini) — deckt Testfall 14 ohne
zusätzlichen Code ab, sofern jeder einzelne Testfall auch auf Touch-Geräten
tatsächlich durchläuft (siehe Einschränkungen in Abschnitt 4.4 zu Maus-Drag auf
Touch-Projekten).

**T1 — Basis-Löschen (Grenzfall 1/Testfall 1):**
```ts
test('Zeile löschen entfernt die mittlere Zeile einer 3-Zeilen-Tabelle', async ({ page }) => {
  // Tabelle mit 3 Zeilen per Datei-Upload laden (siehe 4.1, Hinweis zu Tabellenaufbau)
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'drei-zeilen.docx', mimeType: '…', buffer: buildThreeRowTableDocx() })

  const cells = page.locator('.ProseMirror td')
  await cells.nth(2).click() // Zeile 2 (0-indiziert), Spalte 0
  await page.getByTitle('Zeile löschen').click()

  const rows = page.locator('.ProseMirror tr')
  await expect(rows).toHaveCount(2)
  await expect(page.locator('.ProseMirror')).toContainText('Zeile1')
  await expect(page.locator('.ProseMirror')).toContainText('Zeile3')
  await expect(page.locator('.ProseMirror')).not.toContainText('Zeile2')
})
```

**T2 — Mehrzeilen-`CellSelection` (Grenzfall 3/Testfall 2):** Zwei komplette
Zeilen per echtem Maus-Drag markieren:
```ts
const cellA = page.locator('.ProseMirror td').nth(0)
const cellB = page.locator('.ProseMirror td').nth(3) // Ende der zweiten Zeile bei 2 Spalten
const boxA = await cellA.boundingBox()
const boxB = await cellB.boundingBox()
await page.mouse.move(boxA!.x + 2, boxA!.y + 2)
await page.mouse.down()
await page.mouse.move(boxB!.x + boxB!.width - 2, boxB!.y + boxB!.height - 2, { steps: 5 })
await page.mouse.up()
await page.getByTitle('Zeile löschen').click()
```
Assertion: beide Zeilen verschwinden in einem Schritt (`rows` vorher/nachher
vergleichen), verbleibende Zeilen unverändert. **Hinweis:** `prosemirror-tables`
erkennt eine `CellSelection` nur, wenn während des Drags tatsächlich die
Zellgrenze überquert wird — vor dem Assert zusätzlich prüfen, dass
`.ProseMirror .selectedCell` (CSS-Klasse aus `zeile-loeschen-code.md`
Abschnitt 3.8) während des Drags sichtbar mindestens 2 Zellen markiert
(`await expect(page.locator('.ProseMirror .selectedCell')).toHaveCount(n)` vor
dem Klick auf „Zeile löschen“), damit der Test bei einem nicht erkannten Drag
nicht fälschlich grün wird, weil zufällig nur eine normale Cursor-Zeile gelöscht
wurde.

**T3 — Teil-Zeilen-Selektion (Grenzfall 2/Testfall 3):** Wie T2, aber Drag nur
über 2 von 4 Spalten derselben Zeile (Tabelle mit 4 Spalten laden) → komplette
Zeile verschwindet trotzdem.

**T4 — Einzige Zeile löscht Tabelle (Grenzfall 4/Testfall 4):**
```ts
test('Löschen der einzigen Zeile entfernt die ganze Tabelle, Editor bleibt sofort bedienbar', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click() // 2×2 laut aktuellem insertTable
  // ggf. auf 1 Zeile reduzieren, falls insertTable weiterhin 2×2 liefert: erst eine
  // Zeile löschen, dann die verbleibende — oder direkt eine 1-Zeilen-Fixture laden.
  await page.locator('.ProseMirror td').first().click()
  await page.getByTitle('Zeile löschen').click() // Zeile 1 von 2 weg
  await page.getByTitle('Zeile löschen').click() // letzte Zeile weg → Tabelle verschwindet

  await expect(page.locator('.ProseMirror table')).toHaveCount(0)
  // Editor bleibt ohne weiteren Klick bedienbar:
  await page.keyboard.type('Weiter geht’s ohne Klick.')
  await expect(editor).toContainText('Weiter geht’s ohne Klick.')
})
```

**T5 — Rowspan-Migration sichtbar (Grenzfall 5/Testfall 5):** Datei mit
Rowspan-Tabelle laden (Ankerzelle „Anker“ über 2 Zeilen) → Cursor in Ankerzeile →
„Zeile löschen“ → verbleibende Zeile zeigt weiterhin sichtbar den Text „Anker“
(`await expect(page.locator('.ProseMirror td')).toContainText('Anker')`), kein
Datenverlust. Ergänzend: Grenzfall 6 (überdeckte Zeile) als zweiter Testfall in
derselben Datei — Zeile 2 (überdeckt) löschen statt Zeile 1 (Anker) → „Anker“
bleibt an derselben Stelle sichtbar, keine Verschiebung.

**T6 — Entf-Abgrenzung (Testfall 6):**
```ts
test('Entf bei markierter CellSelection leert nur Inhalte, Zeile bleibt bestehen', async ({ page }) => {
  // Zeile per Drag markieren wie in T2
  await page.keyboard.press('Delete')
  await expect(page.locator('.ProseMirror tr')).toHaveCount(/* unverändert */ 2)
  await expect(page.locator('.ProseMirror td').nth(0)).toHaveText('')
  await expect(page.locator('.ProseMirror td').nth(1)).toHaveText('')
})
```

**T7 — Pflicht-Regressionstest Selection-Sync × Zeile löschen (Grenzfall 14):**
Analog zum bestehenden Muster in `selection-regression.spec.ts`
(„same regression inside a table cell“), aber mit echter Struktur-Löschung davor
statt nur einer Formatierungs-Aktion:
```ts
test('Zeile löschen, Klick zur Neupositionierung, Enter, weiter tippen — Dokument bleibt konsistent', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))

  // Tabelle mit 3 Zeilen laden, Cursor in mittlere Zeile, "Zeile löschen"
  await page.locator('.ProseMirror td').nth(2).click()
  await page.getByTitle('Zeile löschen').click()

  const remainingCell = page.locator('.ProseMirror td').first()
  await remainingCell.click() // Neupositionierung per Klick — der kritische Schritt
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Weiterer Absatz nach Zeile löschen.')

  await expect(page.locator('.ProseMirror')).toContainText('Weiterer Absatz nach Zeile löschen.')
  // Nachbarzellen/-absätze müssen weiterhin vorhanden sein, keine Komplett-Ersetzung:
  await expect(page.locator('.ProseMirror')).toContainText('Zeile1') // oder Fixture-spezifischer Inhalt
  expect(errors).toEqual([])
})
```
Dieser Test ist gemäß Abnahmekriterium 7 (`zeile-loeschen-req.md` Abschnitt 8)
**dauerhaft** Teil der Suite, nicht nur einmalig für diesen Feature-Abschluss.

**T8/T9 — Undo/Redo (Grenzfall 12/13):**
```ts
test('Strg+Z stellt Zeile/Inhalt/Reihenfolge nach Zeile löschen exakt wieder her', async ({ page }) => {
  // 3-Zeilen-Tabelle, mittlere Zeile löschen
  await page.keyboard.press('ControlOrMeta+z')
  await expect(page.locator('.ProseMirror tr')).toHaveCount(3)
  await expect(page.locator('.ProseMirror')).toContainText('Zeile2')
})

test('Strg+Z dann Strg+Y entfernt die Zeile erneut identisch', async ({ page }) => {
  // wie oben, danach zusätzlich:
  await page.keyboard.press('ControlOrMeta+y')
  await expect(page.locator('.ProseMirror tr')).toHaveCount(2)
  await expect(page.locator('.ProseMirror')).not.toContainText('Zeile2')
})
```
Zusätzliche Prüfung (Abschnitt 2.6, letzter Punkt — Undo-Verschmelzung mit
vorausgehender Aktion): Vor dem Löschen in einer *anderen* Zelle tippen, dann
Zeile löschen, dann **ein einziges** Strg+Z → Assertion: nur die Zeilen-Löschung
wird rückgängig gemacht, der zuvor getippte Text bleibt erhalten (zweites Strg+Z
macht erst das Tippen rückgängig).

**T10 — Kein Tabellenkontext, kein stiller Fehlschlag (Grenzfall 15/Testfall 10):**
```ts
test('Ohne Tabellenkontext ist "Zeile löschen" nicht bedienbar, keine Konsole-Exception', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('Normaler Fließtext ohne Tabelle.')

  await expect(page.getByTitle('Zeile löschen')).toHaveCount(0) // ausgeblendet, nicht nur deaktiviert (s. req.md Abschnitt 2.1)
  expect(errors).toEqual([])
})
```

### 4.3 Echter Upload → Zeile löschen → echter Export → Prüfung der heruntergeladenen Datei

Dies ist der zentrale, in der Aufgabenstellung ausdrücklich geforderte Testblock:
**kein** `page.evaluate`, sondern echter `setInputFiles`-Upload, echter Klick auf
den Zeile-löschen-Button, echter Klick auf „Exportieren“, echter
`page.waitForEvent('download')`, echtes Einlesen der heruntergeladenen Datei von
Platte, echtes Öffnen mit `JSZip`.

**T11 — DOCX (Rundreise-Testfall 11 der req.md, Abschnitt 6):**
```ts
test('Echter DOCX-Upload, Zeile löschen, echter Export, Download-Datei enthält korrekte Struktur', async ({ page }) => {
  const buffer = await buildThreeRowTableDocx() // eigenständig gebaute Fixture, s. 4.1
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'tabelle.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })

  await page.locator('.ProseMirror td').nth(2).click()
  await page.getByTitle('Zeile löschen').click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const downloadedPath = await download.path()
  expect(downloadedPath).toBeTruthy()

  const fs = await import('node:fs/promises')
  const exportedBuffer = await fs.readFile(downloadedPath!)
  const zip = await JSZip.loadAsync(exportedBuffer)
  const documentXml = await zip.file('word/document.xml')!.async('text')

  expect((documentXml.match(/<w:tr[ >]/g) ?? []).length).toBe(2)
  expect(documentXml).toContain('Zeile1')
  expect(documentXml).toContain('Zeile3')
  expect(documentXml).not.toContain('Zeile2')
})
```

**T12 — ODT (Rundreise-Testfall 12):** Gleicher Ablauf mit `odtCard`, ODT-Fixture
und `content.xml`, Assertion auf `<table:table-row` Anzahl statt `<w:tr`.

**T-Bild — Verwaiste Bilddatei (Rundreise-Testfall 6, E2E-Ebene):** Tabelle mit
Bild in einer Zelle importieren (Fixture mit eingebettetem Bild oder echter
Bild-Upload über den bestehenden „🖼 Bild“-Button in eine Tabellenzelle vor dem
Export) → Zeile mit dem Bild löschen → exportieren → heruntergeladene Datei mit
`JSZip` öffnen → `Object.keys(zip.files)` auf `word/media/` (DOCX) bzw.
`Pictures/` (ODT) filtern → Assertion: Ordner ist leer bzw. enthält nur noch
Bilder, die tatsächlich an anderer Stelle im Dokument verbleiben (Anzahl vor vs.
nach der Löschung vergleichen, nicht nur „Ordner existiert“).

**T13 — Große Tabelle über echten Datei-Import (Testfall 13):** Reale Fixture
(`tests/fixtures/external/odt/BigTable.odt` oder eine im Test gebaute >10-Zeilen-
Tabelle) per `setInputFiles` laden → mittlere Zeile per Klick + „Zeile löschen“
entfernen → alle übrigen sichtbaren Zellinhalte per `toContainText`/Textvergleich
unverändert; zusätzlich grobe Performance-Beobachtung (Klick-bis-DOM-Update-Zeit
protokollieren, kein hartes Zeitlimit-Assert, da Playwright-Timing auf CI-Runnern
variabel ist — Beobachtung, kein Blocker).

### 4.4 Mobile/Tablet (Grenzfall 20/Testfall 14)

Da `table-row-delete.spec.ts` ohne Projekt-Einschränkung läuft, laufen T1–T13
automatisch auch auf „Mobile“ (Pixel 7) und „Tablet“ (iPad Mini). Zusätzlich
zwingend zu verifizieren, weil Touch-Interaktion sich von Maus-Interaktion
unterscheidet:

- **`click()` vs. echtes Tap-Gesture:** Playwrights `.click()` löst auf
  Touch-emulierten Geräten technisch ein synthetisches Klick-Event aus, nicht
  zwingend dieselbe Event-Sequenz wie ein echter Finger-Tap. Für die
  Mobile/Tablet-Projekte zusätzlich `locator.tap()` statt `.click()` für den
  „Zeile löschen“-Button und die Zellen-Navigation verwenden
  (`test.skip(!isMobileProject, …)`-Gate ist **nicht** erlaubt — stattdessen ein
  eigener, kleiner Testfall speziell mit `.tap()`, der nur auf den beiden
  Touch-Projekten sinnvoll ist, aber auf Desktop Chrome nicht schadet, da
  `.tap()` dort ebenfalls funktioniert, wenn `hasTouch` aktiviert ist — in
  `playwright.config.ts` bereits über `devices['Pixel 7']`/`devices['iPad Mini']`
  gesetzt).
- **Mehrzeilen-`CellSelection` per Touch (T2/T3 auf Touch-Projekten):**
  `page.mouse.down/move/up` simuliert eine Maus, keinen Finger-Drag. Auf den
  Touch-Projekten zusätzlich mit `page.touchscreen` (falls von der
  `prosemirror-tables`-Version tatsächlich als Drag erkannt) **oder** — falls das
  nachweislich nicht funktioniert — das als **dokumentierte Einschränkung**
  festhalten, dass Mehrzeilen-Selektion pro Touch derzeit nicht zuverlässig
  auslösbar ist, ohne dass das den Kern-Testfall (einzeiliges Löschen per Tap auf
  den Button, T1/T4/T7) auf Touch-Geräten blockiert — Testfall 14 der req.md
  verlangt ausdrücklich nur „mindestens ein funktionierender Weg“, nicht alle.
- Ergebnis dieser Prüfung fließt in Abschnitt 6 (Abnahmekriterien-Abgleich) als
  expliziter Nachweis für Zugriffsweg 6 aus `zeile-loeschen-req.md` Abschnitt 1
  ein.

### 4.5 Visuelle Prüfung `.selectedCell`-Markierung

Kurzer, eigenständiger Testfall (kann Teil von T2 sein, hier separat aufgeführt,
weil er reines CSS betrifft, nicht Funktionslogik): Nach einem Maus-Drag über
mehrere Zellen prüfen, dass `getComputedStyle` auf `.ProseMirror .selectedCell`
tatsächlich einen von „transparent“ verschiedenen Hintergrund liefert
(`page.locator('.ProseMirror .selectedCell').first().evaluate(el =>
getComputedStyle(el, '::after').backgroundColor)` oder äquivalent) — stellt
sicher, dass Grenzfall 2/3 und Testfall 6 für eine echte Person am Bildschirm
überhaupt beobachtbar sind, nicht nur im DOM-Baum vorhanden.

---

## 5. Nicht-funktionale Prüfungen

1. **Konsole-/Seitenfehler-Wächter** in **jedem** neuen E2E-Test (nicht nur T7/T10)
   registrieren (`page.on('pageerror', …)`/`page.on('console', msg => msg.type() ===
   'error' && …)`) und am Ende `expect(errors).toEqual([])` — Abnahmekriterium 9
   aus `zeile-loeschen-req.md` Abschnitt 8 verlangt das für **alle** Testfälle,
   nicht nur die explizit dafür benannten.
2. **Tastatur-Erreichbarkeit des Buttons:** `page.keyboard.press('Tab')`-Kette bis
   der „Zeile löschen“-Button fokussiert ist (`await
   expect(page.getByTitle('Zeile löschen')).toBeFocused()`), dann `Enter`/`Space`
   löst dieselbe Aktion aus wie ein Klick — nicht explizit in req.md gefordert,
   aber Mindeststandard für ein `<button>`-Element und günstig als Zusatzprüfung,
   da der Codeplan bewusst ein natives `<button>` statt eines reinen `<div
   onClick>` vorsieht.
3. **Kein horizontales Layout-Springen** beim Ein-/Ausblenden der
   `TableToolbar` (Cursor rein/raus aus Tabelle) — optische Beobachtung, kein
   hartes Assert, da nicht Teil der funktionalen Anforderung.

---

## 6. Abnahmekriterien-Abgleich (`zeile-loeschen-req.md` Abschnitt 8)

| # | Kriterium | Test(s) in diesem Plan |
|---|---|---|
| 1 | Kontextabhängige Werkzeugleiste mit funktionierendem Button | 4.2-T1, 4.2-T10 (Sichtbarkeitsumkehr) |
| 2 | Jeder Zugriffsweg dokumentiert/getestet | 4.4 (Mobile/Touch), Abschnitt 7 unten (Zugriffswege 2/3/5 als „bewusst nicht getestet“ dokumentiert, konsistent mit `zeile-loeschen-code.md` Abschnitt 4) |
| 3 | Cursor/Teil-Zeile/Mehrzeilen exakt nach 2.2 inkl. Entf-Abgrenzung | 3.1-A/B/C/P, 4.2-T1/T2/T3/T6 |
| 4 | Rowspan-/Colspan-Sonderfälle je eigener Test | 3.1-F/G/N, 3.2/3.3 RT-3/RT-4, 4.2-T5 |
| 5 | „Letzte Zeile löscht Tabelle“ inkl. Tabelle-als-einziges-Element | 3.1-D/E/Q, 4.2-T4 |
| 6 | Alle Grenzfälle 1–18 einzeln abgedeckt/dokumentiert, 19 bewusst ausgenommen | Testmatrix Abschnitt 2 |
| 7 | Pflicht-Regressionstest Selection-Sync × Zeile löschen, dauerhaft in Suite | 4.2-T7 |
| 8 | Rundreise-Testfälle 4.2 für DOCX **und** ODT grün, inkl. Bild-Verwaisung | 3.2, 3.3 (inkl. ODT-Bugfix-Nachweis), 4.3-T11/T12/T-Bild |
| 9 | Kein stiller Datenverlust/keine Konsole-Exception | 5.1 (global), 4.2-T10, `removeWholeTable`-Fallback über 3.1-E |
| 10 | Backlog-Statuswechsel erst nach 1–9 | Nicht Testgegenstand — QA-Freigabe (Abschnitt 8 unten) ist die Voraussetzung dafür, nicht der Statuswechsel selbst |

---

## 7. Risiken / Rückfragen an Dev (QA-Vorbehalte gegen den Codeplan)

Im Sinne von „nicht vertrauenswürdig in beide Richtungen“ (`zeile-loeschen-req.md`
Abschnitt 0) hält QA hier fest, welche Aussagen aus `zeile-loeschen-code.md`
**durch einen konkreten Test bestätigt werden müssen, bevor sie als erwiesen
gelten** — reines erneutes Code-Lesen durch QA reicht nicht:

1. **No-Op-Falle bei `deleteRow`** (`zeile-loeschen-code.md` Abschnitt 1, Punkt 1):
   Test 3.1-D **und** 3.1-Q decken genau diesen Fall ab — falls die tatsächliche
   Implementierung entgegen dem Plan doch direkt `deleteRow(state, dispatch)`
   ohne die `wholeTableSelected`-Vorprüfung aufruft, **müssen** diese beiden Tests
   das aufdecken (roter Test statt grünem No-Op).
2. **ODT-`covered-table-cell`-Fix** (Abschnitt 5.2 des Codeplans): Muss laut
   Abschnitt 3.3 dieses Plans **vor** dem Fix nachweislich rot sein und **nach**
   dem Fix grün — beide Läufe sind Teil der QA-Freigabe, nicht nur der zweite.
3. **`CellSelection.replace()`-Verhalten bereits vorhanden** (Abschnitt 1, Punkt 3
   des Codeplans, „kein Produktivcode nötig“): Test 3.1-P und 4.2-T6 bestätigen das
   **unabhängig vom Codeplan-Text** — sollte eine künftige Bibliotheks-Version von
   `prosemirror-tables` dieses Verhalten ändern, schlägt der Test das an, ohne dass
   jemand den Codeplan erneut lesen muss.
4. **`fixTables()`-Sicherheitsnetz** (Abschnitt 1, Punkt 5 des Codeplans): Wird in
   3.5 (reale Fixtures) indirekt mitgeprüft, aber nicht durch einen gezielten
   Test, der absichtlich eine inkonsistente Zwischenstruktur erzeugt — als
   akzeptierte Lücke dokumentiert, da der Codeplan selbst keinen eigenen Umgang
   damit vorsieht (reines Bibliotheks-Verhalten).
5. **Tabellenaufbau in E2E-Tests über Datei-Upload statt UI-Interaktion**
   (Abschnitt 4.1, letzter Punkt dieses Plans): Solange kein Weg existiert, per
   UI mehr als eine 2×2-Tabelle zu erzeugen bzw. Zeilen hinzuzufügen (Feature
   „zeile-einfuegen“ ist ein separater Slug), müssen mehrzeilige Test-Tabellen
   über hochgeladene Dateien statt „echter“ Tabellenerstellung im Editor entstehen.
   Das ist **kein** Verstoß gegen die Vorgabe „nicht nur interne Funktionsaufrufe“
   (Datei-Upload ist eine echte Browser-Interaktion), sollte aber nicht mit einem
   Test verwechselt werden, der auch das *Anlegen* einer mehrzeiligen Tabelle per
   UI beweist — das ist explizit nicht Gegenstand dieses Features.
6. **Anzahl/Benennung der Icon-/Button-Locator:** Sollte die tatsächliche
   Implementierung den Button nicht mit exakt `title="Zeile löschen"` **und**
   `aria-label="Zeile löschen"` rendern (z. B. nur eines von beiden, oder ein
   abweichender Text), schlagen `getByTitle('Zeile löschen')`-Locator in fast
   allen E2E-Tests fehl — das ist beabsichtigt (Locator ist bewusst strikt an den
   in `zeile-loeschen-req.md` Abschnitt 1 geforderten `aria-label` gekoppelt) und
   kein Test-Bug, falls es auftritt.

---

## 8. Definition of Done für die QA-Freigabe

Diese QA-Prüfung gilt erst als abgeschlossen (Backlog-Status darf frühestens dann
von „fehlt“ auf „vorhanden“/„teilweise“ wechseln, s. `zeile-loeschen-req.md`
Abschnitt 8, Punkt 10), wenn:

1. Alle Unit-Tests aus Abschnitt 3 (3.1–3.6) existieren und grün sind, inklusive
   des in Abschnitt 3.3 geforderten „rot vor Fix, grün nach Fix“-Nachweises für
   den ODT-`covered-table-cell`-Bugfix.
2. Alle E2E-Tests aus Abschnitt 4 (4.2–4.5) existieren, laufen auf allen drei
   Playwright-Projekten und sind grün, insbesondere der dauerhafte
   Pflicht-Regressionstest 4.2-T7.
3. Kein bestehender, vorher grüner Test (Abschnitt 3.6) wurde durch diese Änderung
   rot.
4. Stichprobenartige Diff-Prüfung bestätigt: kein E2E-Test in `tests/e2e/` ruft
   interne Editor-/Command-APIs über `page.evaluate` auf, um UI-Interaktion zu
   umgehen (Regel aus Abschnitt 1.1).
5. Die Testmatrix in Abschnitt 2 ist vollständig „abgehakt“ — jede Zeile verweist
   auf mindestens einen tatsächlich existierenden, grünen Test.
6. Die in Abschnitt 7 aufgeführten Risiken sind einzeln durch den jeweils
   benannten Test beantwortet, nicht offen liegen gelassen.
