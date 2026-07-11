# Testplan (QA): Feature „Zeile löschen“

Gegenstück zu `specs/zeile-loeschen-req.md` (Anforderungen) und
`specs/zeile-loeschen-code.md` (Umsetzungsplan). Dieser Testplan ist **nicht**
Übernahme der beiden Vorgänger-Dateien, sondern Ergebnis einer eigenen Prüfung des
**tatsächlichen** Repository-Zustands (verifiziert am realen Code, nicht aus den Specs
abgeschrieben):

- `src/formats/shared/editor/tableCommands.ts`, `TableToolbar.tsx`, `icons.tsx`,
  `runEditorCommand.ts` **existieren noch nicht** (Glob/Grep bestätigt).
- `src/formats/shared/editor/commands.ts` importiert und re-exportiert aus
  `prosemirror-tables` **nur** `isInTable` (Zeile 3/6); `insertTable` ist lokal
  definiert (Zeile 92). **Kein** `deleteTableRow`/`canDeleteTableRow`.
- `src/formats/shared/editor/Toolbar.tsx` enthält genau **einen** Tabellen-Button
  „Tabelle einfügen“ (`title`/`aria-label="Tabelle einfügen"`, sichtbares Glyph
  `⊞ Tabelle`, `onMouseDown → run(view, insertTable(2, 2))`, Zeile 277–289) — **kein**
  zweiter Button und **keine** kontextabhängige Tabellenleiste für Zeilenoperationen.
- `src/formats/shared/editor/WordEditor.tsx` rendert nur `<Toolbar … cutError …>`,
  **keine** `<TableToolbar>`.
- `tests/e2e/` enthält u. a. `docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`,
  `selection-regression.spec.ts`, `cut.spec.ts` — **keine** Datei zu Tabellenzeilen.

**Wichtige Korrektur gegenüber der früheren Fassung dieses QA-Plans (verifiziert am
realen Code):** Eine frühere Fassung dieser Datei behauptete, `src/formats/odt/writer.ts`
erzeuge **kein** `<table:covered-table-cell/>` (ein „bestätigter Bug“, für den ein
„rot vor Fix / grün nach Fix“-Nachweis nötig sei). **Dieser Befund ist FALSCH und wurde
entfernt.** Der aktuelle `writer.ts` (`case 'table'`, Zeile 110–174) emittiert
`<table:covered-table-cell/>` sowohl für **horizontale** (colspan, Zeile 160–162) als
auch für **vertikale** Überdeckung (rowspan, `pending[]`-Tracker, Zeile 126/135–140/
165–167) und berechnet `colCount` korrekt als **Summe der colspan-Werte** von Zeile 0
(Zeile 115–116). Dafür existieren bereits **grüne** Tests in
`src/formats/odt/__tests__/roundtrip.test.ts`:
- Zeile 275: „emits ODF-compliant covered-table-cell placeholders for a horizontal
  (colspan) merge“
- Zeile 310–339: „… for a vertical (rowspan) merge“ (baut eine echte `rowspan: 2`-Struktur
  auf und prüft, dass Zeile 2 an Spalte 0 eine `covered-table-cell` trägt).

Das deckt sich wörtlich mit `zeile-loeschen-req.md` Befund 8 und
`zeile-loeschen-code.md` Abschnitt 1 Punkt 4 / Abschnitt 5.2 („darf **nicht** erneut als
offener Befund geführt werden“; „**kein** ODT-Reader/-Writer muss für dieses Feature
geändert werden“). **Für „Zeile löschen“ ist an Reader/Writer beider Formate nichts zu
ändern** — es ist eine reine Editor-Änderung; die Rundreise-Tests unten belegen das,
statt einen nicht existierenden Bug zu „fixen“.

**Konsequenz für diesen Testplan (TDD-Charakter):** Er ist bewusst **gegen den
Soll-Zustand aus `zeile-loeschen-code.md` geschrieben**, nicht gegen den Ist-Zustand.
Die neuen Tests sollen **heute** (vor Implementierung) fehlschlagen bzw. nicht
kompilieren (`deleteTableRow`/`TableToolbar` fehlen) und **nach** Umsetzung des Codeplans
grün werden. Das ist der Beleg, dass ein späteres „grün“ die Funktion tatsächlich
nachweist und kein zufällig grünes, wirkungsloses Stub ist. Im Sinne von „nicht
vertrauenswürdig in beide Richtungen“ (`zeile-loeschen-req.md` Abschnitt 0) gilt: Weder
wird unterstellt, der Codeplan sei lückenlos korrekt (siehe Abschnitt 7, „Vorbehalte an
Dev“ — insbesondere zum No-Op-Guard von `deleteRow`), noch wird ein „alle Tests grün“
ohne die konkreten Prüfungen dieser Datei akzeptiert.

---

## 1. Prüfgrundsatz und Testebenen

### 1.1 Zwei Ebenen, strikt getrennt

| Ebene | Was sie beweist | Was sie NICHT beweist |
|---|---|---|
| **Unit-Tests** (Vitest, `jsdom`) | Die reine Transaktionslogik von `deleteTableRow`/`removeWholeTable` ist für sich korrekt; Reader/Writer erzeugen bei Im-/Export nach einer **programmatisch** ausgeführten Löschung die richtige XML-Struktur (Rundreise). | Dass ein Mensch den Button sieht/anklicken kann, dass die Maus-`CellSelection` visuell funktioniert, dass ein echter Datei-Download im Browser die richtigen Bytes liefert, dass Touch-Geräte den Button bedienen. |
| **Echte Playwright-E2E-Tests** (echter Chromium / echte Devices laut `playwright.config.ts`) | Der Button existiert, ist zum richtigen Zeitpunkt sichtbar/unsichtbar, reagiert auf echte Klicks/Tastatur/Maus-Drags; ein echter Datei-**Upload** wird korrekt importiert; ein echter Datei-**Download** liefert eine Datei, deren Inhalt (nach Öffnen mit `JSZip`) die erwartete Struktur hat. | Feingranulare interne Transaktionsdetails (z. B. exakte `rowspan`-Dekrement-Arithmetik in jedem denkbaren Fall) — dafür sind die Unit-Tests da; E2E deckt die repräsentativen Fälle ab. |

**Bindende Regel:** Jeder E2E-Test in Abschnitt 4 interagiert ausschließlich über
`page.getByRole`/`getByTitle`/`.ProseMirror`-Locator, `page.keyboard`, `page.mouse`/
`page.touchscreen` und `input[type=file]`/`page.waitForEvent('download')` — **niemals**
über `page.evaluate(() => view.dispatch(...))`, `page.evaluate(() => deleteTableRow()(...))`
o. Ä. Ein Test, der die Editor-/Command-API aus `page.evaluate` aufruft, ist ein
Unit-Test mit Browser-Kulisse und zählt für „echte Playwright-Browser-Tests“ **nicht**.
Diese Regel wird in Abschnitt 8 (Freigabe) explizit gegen den eingereichten Diff geprüft.

### 1.2 Bezugsrahmen

Testfall-Nummern referenzieren `zeile-loeschen-req.md`: „Grenzfall N“ → Abschnitt 3,
„Testfall N“ → Abschnitt 7, „Rundreise-Testfall N“ → Abschnitt 5.2. Datei-/Funktionsnamen
referenzieren `zeile-loeschen-code.md` Abschnitt 3/5/6. Weicht die tatsächliche Umsetzung
namentlich ab (anderer Funktions-/Dateiname), sind die Tests nachzuführen; die
**Testfälle selbst** (was geprüft wird) bleiben unberührt.

### 1.3 Determinismus (verbindlich — Aufgaben-Kernvorgabe)

Race Conditions durch zu schnelle Tastatureingaben sind in diesem Repo ein **bekanntes,
real reproduziertes** Problem: `tests/e2e/selection-regression.spec.ts` (Zeile 26–34)
dokumentiert, dass ProseMirror einen nativen, tastaturgesteuerten Cursor-Move (z. B.
`End`) erst über das **asynchrone** Browser-Event `selectionchange` übernimmt; ein
unmittelbar folgendes `Enter`/Tippen (ohne menschliche Reaktionszeit) kann diesem Sync
vorauslaufen und auf der **veralteten** Position agieren. Die jüngsten Repo-Commits
(„async-selection-sync race“, „give async selection sync time before the next keystroke“)
haben genau diese Flakiness in Nachbar-Specs behoben. „Zeile löschen“ ist laut
`zeile-loeschen-req.md` Abschnitt 2.7 ein **zusätzlicher** Verdachtsfall, weil es eine
Selektion durch eine Struktur-Transaktion ersetzt.

Verbindliche Determinismus-Regeln für **alle** E2E-Tests dieses Plans:

1. **Selektions-Sync abwarten, nicht überrennen.** Nach einem Klick zur
   Neupositionierung gefolgt von einem nativen Cursor-Move (`End`/`Home`/Pfeiltasten)
   und **vor** dem nächsten `Enter`/`type()`: `await page.waitForTimeout(50)` einfügen —
   exakt das im Repo etablierte, kommentierte Muster (selection-regression.spec.ts:34).
   Das ist **kein** willkürliches Sleep, sondern das gezielte Abwarten eines bereits
   in Flug befindlichen, asynchronen `selectionchange`. Der Pflicht-Regressionstest
   4.2‑T7 **muss** diesen Gap enthalten (die frühere Fassung dieses Plans hatte ihn
   vergessen — das wäre genau die Flake gewesen, die die o. g. Commits andernorts
   gefixt haben).
2. **Web-first-Assertions statt fester Wartezeiten**, wo immer möglich: Zustandswechsel
   über auto-retriende Erwartungen abwarten (`await expect(rows).toHaveCount(2)`,
   `await expect(page.getByTitle('Zeile löschen')).toBeVisible()`), **nicht** über
   `waitForTimeout`. Feste Timeouts nur für den unter (1) beschriebenen, bibliotheks-
   bedingten Selection-Sync-Gap.
3. **CellSelection-Drags deterministisch aufbauen:** `page.mouse.move(...)` mit
   explizitem `{ steps: N }` (mind. 5), damit `prosemirror-tables` den Zellgrenzen-
   Übertritt sicher als `CellSelection` erkennt; **vor** dem Klick auf „Zeile löschen“
   per `await expect(page.locator('.ProseMirror .selectedCell')).toHaveCount(k)` prüfen,
   dass die erwartete Zellzahl markiert ist — sonst könnte der Test bei nicht erkanntem
   Drag fälschlich grün werden, weil zufällig nur eine gewöhnliche Cursor-Zeile gelöscht
   wurde.
4. **Nach dem Löschen vor dem nächsten Schritt Stabilität abwarten:** Nach dem Klick
   auf „Zeile löschen“ zuerst die strukturelle Wirkung asserten (`toHaveCount`), **dann**
   erst weiterklicken/‑tippen — nie „blind“ die nächste Aktion feuern.
5. **Kein Test hängt von Klick-zu-DOM-Update-Zeit als hartem Limit ab** (CI-Runner-Timing
   variabel): Performance nur beobachtend protokollieren, nie als Assert (Testfall 13).
6. **Export-Downloads deterministisch abgreifen:** `page.waitForEvent('download')`
   **vor** dem Klick auf „Exportieren“ registrieren, dann `await download.path()` — nie
   nachträglich pollen. (Etabliertes Muster: `docx.spec.ts:79–88`, `odt.spec.ts:64–73`.)

---

## 2. Testmatrix (Rückverfolgbarkeit)

| # | Fall (req.md) | Unit (3.1-…) | E2E (4.2-…) | Rundreise (3.2–3.5) |
|---|---|---|---|---|
| Grenzfall 1 / Testfall 1 | Kollabierter Cursor, eine Zelle | 3.1-A | T1 | — |
| Grenzfall 2 / Testfall 3 | Teil-Zeilen-`CellSelection` (nicht alle Spalten) | 3.1-B | T3 | — |
| Grenzfall 3 / Testfall 2 | Mehrzeilen-`CellSelection` | 3.1-C | T2 | RT-7 |
| Grenzfall 4 / Testfall 4/5 | Alle-Zeilen-Selektion / letzte Zeile → Tabelle weg (Guard) | 3.1-D/E/Q | T4, T5 | RT-5 |
| Grenzfall 5 | Rowspan-Anker gelöscht (Migration) | 3.1-F | T6 | RT-3 |
| Grenzfall 6 | Überdeckte Rowspan-Zeile gelöscht (Dekrement) | 3.1-G | (in T6 mitgeprüft) | RT-3 |
| Grenzfall 7 | Erste Zeile gelöscht, Off-by-one | 3.1-H | — (Unit genügt) | — |
| Grenzfall 8 | Letzte Zeile bei >1 Zeile | 3.1-I | — (Unit genügt) | — |
| Grenzfall 9 | Tabelle an Dokumentanfang/-ende | 3.1-J | — (Unit genügt) | — |
| Grenzfall 10/11 | Zwei Tabellen hintereinander / Zeile mit mehreren Absätzen+Bild | 3.1-K | RT/T-Bild | RT-6 |
| Grenzfall 13 | Verschachtelte Tabelle | 3.1-L | T14 | — |
| Grenzfall 14 | Selection-Sync-Regression | — | **T7 (Pflicht, dauerhaft)** | — |
| Grenzfall 15 / Testfall 10 | Kein Tabellenkontext, kein stiller Fehlschlag | 3.1-M | T10 | — |
| Grenzfall 16 | Reine Colspan-Zeile gelöscht (keine Migration) | 3.1-N | (in T6-Variante) | RT-4 |
| Grenzfall 17 / Testfall 13 | Große Tabelle (>5 Spalten, >10 Zeilen) | 3.1-O | T13 | RT-11 |
| Grenzfall 18 / Testfall 13 | Reale Fremddatei, exotische Struktur | — | (3.5 + T13) | 3.5 |
| Grenzfall 19 (req 2.6) | Undo / Undo+Redo, Ein-Schritt-Granularität | 3.1-R | T8, T9 | — |
| Grenzfall 20 (Track-Changes) | Phase 3 | **explizit nicht getestet** | — | — |
| Grenzfall 21 / Testfall 15 | Mobile/Tablet | — | 4.4 (alle Projekte) | — |
| Testfall 6/8 | Entf/`CellSelection` leert nur Inhalt (Abgrenzung) | 3.1-P | T-Entf | — |
| Testfall 11/12 | Export/Reimport nach Löschen (DOCX/ODT), echter Download | — | 4.3-T11, T12 | RT-1, RT-2 |
| Rundreise Baseline 5.1 | Unveränderte Rundreise vor Löschtest | 3.6 | — | RT-0 |
| Rundreise-Testfall 10/11/12 | Cross-Format | 3.4 | — | RT-8, RT-9, RT-10 |

---

## 3. Teil A — Unit-Tests (Reader/Writer-Rundreise + Command-Logik)

### 3.1 NEU: `src/formats/shared/editor/__tests__/deleteTableRow.test.ts`

Reine Zustands-Tests gegen `deleteTableRow()`/`removeWholeTable` (aus `tableCommands.ts`
bzw. re-exportiert aus `commands.ts`) über direkt via `wordSchema.nodeFromJSON(...)` bzw.
`EditorState.create({ doc, schema: wordSchema, plugins: [tableEditing()] })` konstruierte
Zustände — **kein** DOM/View nötig. `plugins: [tableEditing()]` ist **zwingend**, damit
(a) `CellSelection` überhaupt per `CellSelection.create(doc, anchorPos, headPos)`
konstruiert werden kann und (b) die `appendTransaction`/`fixTables()`-Absicherung
(`zeile-loeschen-code.md` Abschnitt 1 Punkt 5) mitläuft — sonst liefe ein Test grün, der
in der echten App nicht repräsentativ wäre.

Hilfsfunktion (Muster: die fertigen JSON-Fixtures in `roundtrip.test.ts`, aber hier direkt
als `EditorState`); `rowspanAt` baut eine **echte** mehrzeilige Rowspan-Struktur (Ankerzelle
in einer Zeile, überdeckte Position in der Folgezeile fehlt im `content`-Array), **nicht**
nur `rowspan: 1` — sonst prüft der Test die Rowspan-Logik nicht wirklich (Warnung aus
`zeile-loeschen-code.md` Abschnitt 1 Punkt 4):

```ts
function makeTableState(rows: string[][], opts?: { rowspanAt?: [row: number, col: number, span: number] }) {
  const cell = (text: string, attrs = { colspan: 1, rowspan: 1 }) =>
    wordSchema.nodes.table_cell.create(attrs, wordSchema.nodes.paragraph.create(null, wordSchema.text(text)))
  const table = wordSchema.nodes.table.create(null, rows.map((r) =>
    wordSchema.nodes.table_row.create(null, r.map((t) => cell(t)))))
  const doc = wordSchema.nodes.doc.create(null, [table])
  return EditorState.create({ doc, schema: wordSchema, plugins: [tableEditing()] })
}
```

| ID | Testfall | Aufbau | Aktion | Assertion |
|---|---|---|---|---|
| 3.1-A | Grenzfall 1: kollabierter Cursor | 3 Zeilen × 2 Spalten, Text „R1C1“…„R3C2“ | `TextSelection` in Zelle Zeile 2/Spalte 1, `deleteTableRow()(state, dispatch)` | 1 Tabelle mit 2 Zeilen; „R1C1/R1C2“ und (ehem. Zeile 3) „R3C1/R3C2“ vorhanden; „R2C1/R2C2“ nirgends im `doc.toJSON()` |
| 3.1-B | Grenzfall 2: Teil-Zeilen-`CellSelection` | 4 Spalten × 2 Zeilen | `CellSelection` über Spalte 0–1 (nicht 2–3) **derselben** Zeile | Komplette Zeile (alle 4 Zellen) verschwindet, nicht nur Spalte 0–1; andere Zeile unverändert |
| 3.1-C | Grenzfall 3: Mehrzeilen-`CellSelection` | 4 Zeilen × 3 Spalten | `CellSelection` über Zeile 1–2 (0-indiziert) | Genau 2 Zeilen bleiben (ehem. 0 und 3); `dispatch`-Spy **genau 1×** aufgerufen (ein Undo-Schritt) |
| 3.1-D | Grenzfall 4/5: einzige Zeile in mehrelementigem Doc | `doc` = [Absatz, Tabelle(1 Zeile), Absatz] | Cursor in der einzigen Zeile, löschen | Keine Tabelle mehr, weiterhin 2 Absätze; `state.selection.$from.parent.type.name === 'paragraph'` |
| 3.1-E | Grenzfall 5: Tabelle als **einziges** Doc-Element | `doc` = [Tabelle(1 Zeile, 1 Spalte)] | Cursor in der einzigen Zelle, löschen | `doc.childCount === 1`, genau **ein** leerer `paragraph` (Schema `content: 'block+'` erzwingt ≥1 Block) — **kein** leeres `doc` |
| 3.1-F | Grenzfall 5: Rowspan-Anker gelöscht | 3 Zeilen, Spalte 0 = `rowspan 2` über Zeile 0–1, Text „Anker“ | Zeile 0 (Anker) löschen | Neue Zeile 0 (ehem. 1) enthält migrierte Zelle „Anker“ mit `rowspan === 1`; kein Datenverlust, keine Doppelzelle |
| 3.1-G | Grenzfall 6: überdeckte Rowspan-Zeile gelöscht | wie 3.1-F | Zeile 1 (überdeckt, nicht Anker) löschen | Zeile 0 bleibt Anker „Anker“, `rowspan` 2→1, Inhalt unverändert |
| 3.1-H | Grenzfall 7: erste Zeile, dann zweite | 4 Zeilen | Erste Zeile löschen, danach neue erste Zeile löschen (neu ermittelter Cursor) | Kein Off-by-one: übrig bleiben exakt ursprüngliche Zeilen 2 und 3 in Reihenfolge |
| 3.1-I | Grenzfall 8: letzte Zeile bei >1 | 3 Zeilen | Letzte Zeile löschen | Tabelle bleibt mit 2 Zeilen (kein `removeWholeTable`); `state.selection.$from` in der neuen letzten Zeile |
| 3.1-J | Grenzfall 9/10: Tabelle am Anfang/Ende | `doc` = [Tabelle(1 Zeile)] bzw. [Absatz, Tabelle(1 Zeile)] | Einzige Zeile löschen | Kein Wurf; `state.doc.resolve(pos)` der gesetzten Selektion wirft nicht; gültiger `gapCursor`/`TextSelection`-Zustand |
| 3.1-K | Grenzfall 12: mehrere Absätze/Bild in Zeile | Zelle mit 2 Absätzen + `image`-Knoten in der zu löschenden Zeile | Zeile löschen | Weder Bild-`src` noch Absatztexte dieser Zeile im `JSON.stringify(doc.toJSON())` (Volltextsuche) — kein verwaister Knoten |
| 3.1-L | Grenzfall 13: verschachtelte Tabelle | Äußere Tabelle, eine Zelle enthält innere Tabelle (2 Zeilen) | (a) äußere Zeile mit innerer Tabelle löschen; (b) Cursor **in** innerer Tabelle, deren Zeile löschen; (c) innere 1-Zeilen-Tabelle löschen → Ersatz-Absatz **innerhalb der äußeren Zelle** | Kein Wurf in allen 3 Fällen; `wordSchema.nodeFromJSON(doc.toJSON())` validiert (Schema-Konformität) |
| 3.1-M | Grenzfall 15: kein Tabellenkontext | Cursor in Fließtext-Absatz außerhalb jeder Tabelle | `deleteTableRow()(state, dispatch)`; separat `canDeleteTableRow(state)` | Rückgabe `false`; `dispatch`-Spy **nicht** aufgerufen; kein Wurf; `canDeleteTableRow === false` |
| 3.1-N | Grenzfall 16: reine Colspan-Zeile | Zeile mit einer `colspan: 2`-Zelle (kein rowspan), andere Zeilen normal | Diese Zeile löschen | Zeile inkl. verbundener Zelle vollständig weg, keine Migration; `colspan`-Werte der Nachbarzeilen unverändert |
| 3.1-O | Grenzfall 17: große Tabelle | 12 Zeilen × 6 Spalten, jede Zelle `R{row}C{col}` | Zeile 6 (mittig) löschen | Alle 11 übrigen Zeilen mit exakt ursprünglichem Text an ursprünglicher relativer Position (0–5 unverändert, ehem. 7–11 → 6–10) |
| 3.1-P | Testfall 6/8: Abgrenzung Entf (Modell-Ebene) | 2 Zeilen × 3 Spalten mit Text | `CellSelection` über eine ganze Zeile, dann **nicht** `deleteTableRow`, sondern `state.tr.deleteSelection()` (was `Delete`/`baseKeymap` auslöst) | Zeilenzahl bleibt 2 (Struktur unverändert), aber Zellinhalte der Zeile geleert (leere Absätze) — Beleg der in `zeile-loeschen-code.md` Abschnitt 1 Punkt 3 behaupteten `CellSelection.replace()`-Eigenschaft, **nicht nur** durch Code-Lesen |
| 3.1-Q | Grenzfall 4: **alle** Zeilen einer mehrzeiligen Tabelle | 3-Zeilen-Tabelle, `CellSelection` über **alle 3** Zeilen | `deleteTableRow()(state, dispatch)` | Tabelle-komplett-Pfad greift (kein stiller No-Op wie bei direktem `deleteRow`); Regressionsschutz gegen eine Implementierung, die `deleteRow` doch direkt statt über die eigene `wholeTableSelected`-Prüfung aufruft (`zeile-loeschen-code.md` Abschnitt 1 Punkt 1) |
| 3.1-R | req 2.6: Undo-Schritt-Granularität | Mehrzeilen-`CellSelection` über 3 Zeilen | `deleteTableRow()(state, dispatch)` mit `dispatch`-Spy | Spy **genau 1×** (eine Transaktion) — Voraussetzung für einen Undo-Schritt; das eigentliche Undo/Redo-*Verhalten* wird in 4.2-T8/T9 geprüft (echte `history()`-Instanz nötig) |

**Ausdrücklich nicht Gegenstand der Unit-Tests:** Undo/Redo-Endverhalten (E2E T8/T9,
echte `history()`-Plugin-Instanz + echtes Strg+Z nötig) und die visuelle
`.selectedCell`-Markierung (E2E 4.5).

### 3.2 NEU: `src/formats/docx/__tests__/rowDelete.roundtrip.test.ts`

Reader/Writer-Rundreise DOCX. Muster wie `roundtrip.test.ts` (`writeDocx(content)` →
`readDocx(blob)`, `paragraph()`-Helper), aber **mit echtem Aufruf von `deleteTableRow()`**
auf einem zuvor aufgebauten `EditorState` — statt direkt konstruierter Nach-Löschen-JSONs.
Genau das ist der Unterschied zum bestehenden Test, der nur bereits-fertige Strukturen
prüft (`zeile-loeschen-req.md` Abschnitt 0, Befund 11).

Ablauf pro Fall: `EditorState` mit Tabelle → `deleteTableRow()` anwenden →
`state.doc.toJSON()` als `WordDocumentContent.body` → `writeDocx(content)` → `Blob` mit
`readDocx` reimportieren **und** zusätzlich das rohe `word/document.xml` per
`JSZip.loadAsync(blob)` prüfen. Die **rohe XML-Prüfung ist notwendig**: ein rein über den
eigenen Reimport geführter Test würde einen hypothetischen Schreibfehler nicht aufdecken,
den der Reader beim Reimport wieder „glättet“ (Prinzip aus
`zeile-loeschen-req.md` Abschnitt 5.2, Abnahmemaßstab: unabhängige Prüfung).

| ID | Rundreise-Testfall (req 5.2) | Prüfung (Reimport-JSON **und** rohes XML) |
|---|---|---|
| RT-1 | 1: mehrzeilige Tabelle, eine Zeile gelöscht | JSON: korrekte Zeilenzahl/-inhalte. XML: Anzahl `<w:tr` exakt um 1 reduziert; `w:tblGrid`-Spaltenzahl unverändert; kein `<w:tr>` mit dem gelöschten Zelltext |
| RT-3 | 3: Rowspan-Anker gelöscht | JSON: migrierte Zelle `rowSpan` korrekt dekrementiert an richtiger Stelle. XML: `<w:vMerge w:val="restart"/>` + Fortsetzungs-`<w:vMerge/>` konsistent (kein Fortsetzungs-Tag ohne vorausgehenden „restart“) |
| RT-4 | 4: Colspan-Zeile gelöscht | JSON: Zeile inkl. verbundener Zelle komplett weg. XML: `<w:gridSpan w:val="…"/>` der übrigen Zeilen unverändert |
| RT-5 | 5/7: letzte verbleibende Zeile gelöscht | JSON: kein `table`-Knoten mehr. XML: kein `<w:tbl>`; Nachbar-Absätze textlich unverändert (bei einziger Tabelle: eingefügter leerer Absatz vorhanden) |
| RT-6 | 6: Zeile mit Bild gelöscht (keine verwaiste Datei) | JSON: kein `image` mit ursprünglicher `src`. ZIP: `word/media/` + `word/_rels/document.xml.rels` gegeneinander prüfen — jede Datei in `media/` hat eine passende `Relationship` und jede Bild-Relationship ist im Dokument referenziert (keine Verwaisung in beide Richtungen) |
| RT-7 | 8: Mehrzeilen-`CellSelection` gelöscht | Reimport: exakt die erwarteten Zeilen fehlen (nicht mehr, nicht weniger), per Text-Fingerprint jeder verbliebenen Zeile |
| RT-11 | 13: große Tabelle, mittlere Zeile gelöscht | Reimport: alle übrigen Zellinhalte identisch und in unveränderter Reihenfolge (gleicher Fingerprint-Vergleich wie 3.1-O, aber über die volle Reader/Writer-Kette) |

### 3.3 NEU: `src/formats/odt/__tests__/rowDelete.roundtrip.test.ts`

Analog 3.2 für ODT (`writeOdt(content)` → `readOdt(blob)`), deckt die ODT-Seite von RT-1
(als RT-2), RT-3, RT-4, RT-5, RT-6, RT-7, RT-11 ab — gleiche Tabellen wie 3.2, aber mit
`table:table-row`/`table:table-cell`/`table:number-columns-spanned`/
`table:number-rows-spanned` statt der DOCX-Pendants und `Pictures/` statt `word/media/`
für den Bild-Verwaisungstest (RT-6). Rohes `content.xml` per
`JSZip.loadAsync(blob)`/`zip.file('content.xml')!.async('text')` (Muster
`odt.spec.ts:71–73`).

**Kein ODT-Writer-Bug, kein „Fix“ (Korrektur der früheren Fassung).** Diese Tests setzen
auf die **bereits vorhandene, korrekte** `covered-table-cell`-Logik auf (siehe Kopf dieser
Datei und `zeile-loeschen-code.md` Abschnitt 5.2). Es wird **nichts** „rot vor Fix“
nachgewiesen. Die bestehenden Tests `roundtrip.test.ts:275` (colspan) und `:310–339`
(rowspan `2`) bleiben der Beleg für die Placeholder-Korrektheit und werden **nicht**
dupliziert. Was hier **zusätzlich** geprüft wird, ist ein **Regressionsschutz**: dass die
neue Löschoperation diese korrekte Ausgabe nicht beschädigt.

| ID | Prüfung |
|---|---|
| RT-2 | ODT-Seite von RT-1: eine Zeile gelöscht → rohes XML: Anzahl `<table:table-row` um 1 reduziert; Anzahl `<table:table-column>` unverändert; kein `table:table-row` mit dem gelöschten Zelltext |
| RT-3/ODT | Rowspan-**Anker** gelöscht → Reimport: `rowspan` der verbleibenden Zelle korrekt reduziert, migrierter Inhalt an richtiger Stelle, keine verwaiste `number-rows-spanned`-Referenz |
| RT-Cov (Regressionsschutz, req 5.2 Testfall 5 / code.md 5.2) | 3-Zeilen-Tabelle, Spalte 0 = Rowspan-Paar über Zeile 0+1 (Anker in Zeile 0, `rowspan: 2`), Zeile 2 unabhängig. **Zeile 2 löschen** (Rowspan-Paar bleibt unberührt) → `writeOdt` → rohes `content.xml`: die zweite `<table:table-row>` beginnt weiterhin mit `<table:covered-table-cell/>` an Spalte 0 (die überdeckte Position). Beweist: „Zeile löschen“ **erhält** die schon korrekte covered-cell-Ausgabe (kein Nachweis eines Bugs, sondern Schutz gegen dessen Einschleusung) |
| RT-4/ODT | Zeile mit `colspan`-Zelle gelöscht → Reimport: Zeile komplett weg; `number-columns-spanned` der übrigen Zeilen unverändert |
| RT-5/ODT | letzte Zeile gelöscht → kein `<table:table>` mehr; umgebende Absätze unverändert |
| RT-6/ODT | Zeile mit Bild gelöscht → `Pictures/` enthält keine verwaiste Datei; `manifest.xml`-Einträge konsistent |
| RT-7/ODT, RT-11/ODT | wie DOCX-Pendant |

### 3.4 NEU: `src/formats/shared/editor/__tests__/rowDelete.crossFormat.test.ts`

| ID | Rundreise-Testfall (req 5.2) | Ablauf |
|---|---|---|
| RT-8 | 10: ODF → Zeile löschen → DOCX → reimportieren | `readOdt` auf im Test erzeugte ODT-Tabelle → `deleteTableRow()` im Editor-Modell → `writeDocx` → `readDocx` → Struktur (verbleibende Zeilen, verbundene Zellen) konsistent |
| RT-9 | 11: DOCX → Zeile löschen → ODT → reimportieren | umgekehrt |
| RT-10 | 12: doppelte Rundreise | DOCX → Zeile löschen → ODT → (laden, keine weitere Änderung) → DOCX → Inhalt entspricht weiterhin dem erwarteten Nach-Löschen-Zustand; insbesondere schleust der ODT-Zwischenschritt keine in DOCX fehlende Struktur ein. Text-/Strukturverlust unzulässig; Cross-Format-Formatierungsverluste dokumentieren |

### 3.5 NEU: reale Fixture-Fälle (Baseline 5.1 / Grenzfall 18) — ergänzt in 3.2/3.3

Kein drittes Modul: Fixture-Ladepfad aus `external-fixtures.test.ts` wiederverwenden
(`FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/odt')` bzw. `…/docx`,
`readFileSync`). **Verifiziert vorhanden** (Glob):

- ODT: `tableRowDeletionTest.odt` (direkt einschlägig — bevorzugt), `tableOps.odt`,
  `tableCoveredContent.odt`, `tableComplex_DOC_LO41.odt`, `table-column-delete-with-merge.odt`,
  `mergedCells.odt`, `subTables.odt`/`subTables2.odt` (verschachtelt, Grenzfall 13),
  `BigTable.odt`/`crazyTable.odt` (groß/exotisch), `feature_attributes_tables.odt`,
  `Tabelle1.odt`, `TestTextTable.odt`.
- DOCX: `TestTableColumns.docx`, `deep-table-cell.docx`, `table-indent.docx`.

Vorgehen:

- **Baseline 5.1 zuerst, ohne jede Löschung:** je eine reale Tabellen-Fixture
  (`TestTableColumns.docx`, `TestTextTable.odt`) importieren → **ohne Änderung**
  exportieren → reimportieren → Tabellenstruktur (Zeilenzahl, verbundene Zellen) = erster
  Import. **Diese Baseline muss zuerst grün sein**, sonst ist ein späterer Fehlschlag der
  Lösch-Tests nicht eindeutig zuzuordnen (`zeile-loeschen-req.md` Abschnitt 5.1).
- **Danach mit Löschung (Grenzfall 18):** je Fixture importieren → Cursor programmatisch
  in die erste Zelle der ersten Tabelle → `deleteTableRow()` → Assertion: **kein Wurf**,
  `wordSchema.nodeFromJSON(result.body)` validiert (Schema-Konformität als Mindestnachweis
  „keine stille Korruption“), Ergebnis übersteht `writeOdt`/`writeDocx` + Reimport. Zeigt
  eine Fixture ein deterministisches, aber überraschendes Verhalten (exotische
  `gridSpan`/`vMerge`/`covered-table-cell`-Kombination), wird das **dokumentiert, nicht als
  Fehlschlag gewertet** — solange kein Crash und keine Schema-Verletzung (Grenzfall 18).
  Für `tableCoveredContent.odt` gilt die in `zeile-loeschen-req.md` Befund 8 / Rundreise-
  Testfall 9 genannte Reader-Asymmetrie bei fremden vertikalen Verbindungen als
  **Abhängigkeit der geteilten Import-Infrastruktur**, nicht als `zeile-loeschen`-Fehler.

### 3.6 Bestehende Rundreise-Tests — Regressionsschutz

`src/formats/docx/__tests__/roundtrip.test.ts` (`describe('DOCX round trip: tables')` ab
Zeile 229, inkl. Rowspan-Test `:279–300`) und `src/formats/odt/__tests__/roundtrip.test.ts`
(`describe('ODT round trip: tables')` ab Zeile 219, inkl. covered-cell-Tests `:275`/
`:310–339`) müssen nach allen Änderungen dieses Features **unverändert grün** bleiben. Vor
QA-Abschluss: vollständiger `npm run test`-Lauf (nicht nur neue Dateien) — keine vorher
grüne Testdatei darf rot werden. (Da für dieses Feature **kein** Reader/Writer-Code
geändert wird, ist hier keine Regression zu erwarten; der Lauf ist der Beleg dafür.)

---

## 4. Teil B — Echte Playwright-E2E-Tests

### 4.1 Bindende Konventionen (aus bestehenden Specs verifiziert übernommen)

- **Privacy-Banner** zuerst schließen: `await page.getByRole('button', { name: /verstanden/i }).click()`
  (Muster `docx.spec.ts:66`, `selection-regression.spec.ts:10`).
- **Karten-Locator:** `docxCard(page)` = `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })`;
  `odtCard(page)` mit Heading `'OpenDocument Text (.odt)'` (verifiziert `docx.spec.ts:59`,
  `odt.spec.ts`/`selection-regression.spec.ts:3–5`).
- **Neues Dokument:** `card.getByRole('button', { name: 'Neu erstellen' }).click()`.
- **Editor-Locator:** `page.locator('.ProseMirror')`; Tabellenzeilen/-zellen:
  `.ProseMirror tr` / `.ProseMirror td` (prosemirror-tables-Standard-DOM).
- **Zeile-löschen-Button:** `page.getByTitle('Zeile löschen')`. Der Codeplan sieht
  `title="Zeile löschen"` **und** `aria-label="Zeile löschen"` vor
  (`zeile-loeschen-code.md` Abschnitt 3.6) — beide müssen gerendert werden. Alternativ
  `page.getByRole('button', { name: 'Zeile löschen' })` (greift auf `aria-label`).
- **Tabelle einfügen (für Testaufbau):** `page.getByRole('button', { name: 'Tabelle einfügen' })`
  erzeugt laut aktuellem `commands.ts` eine feste **2×2**-Tabelle. Mehrfacher Klick fügt
  **eine weitere** 2×2-Tabelle ein, **nicht** Zeilen an eine bestehende. Für Tests mit
  >2 Zeilen daher eine **hochgeladene** DOCX/ODT-Fixture mit passender Zeilenzahl nutzen
  (echter `setInputFiles`-Upload ist eine echte Browser-Interaktion und erfüllt die
  Vorgabe „nicht nur interne Funktionsaufrufe“) — nicht per UI zusammenbauen.
- **Datei-Upload:** `card.locator('input[type="file"]').setInputFiles({ name, mimeType, buffer })`
  — Buffer aus echter Fixture (`node:fs/promises`, Pfad wie 3.5) oder im Test mit `JSZip`
  gebaut (Muster `buildSampleDocx`/`buildSampleOdt` aus `docx.spec.ts:16`/`odt.spec.ts:16`,
  aber mit eingebetteter Tabelle im `document.xml`/`content.xml`). MIME:
  `application/vnd.openxmlformats-officedocument.wordprocessingml.document` bzw.
  `application/vnd.oasis.opendocument.text`.
- **Datei-Export/-Download (Pflicht für jeden Export-Testfall):**
  `const downloadPromise = page.waitForEvent('download')` **vor** dem Klick auf
  „Exportieren“, danach `const download = await downloadPromise`,
  `const p = await download.path()`, `await fs.readFile(p)`, `JSZip.loadAsync(...)`,
  Einzelteile per `zip.file(...).async('text')` prüfen (exakt `docx.spec.ts:79–88`,
  `odt.spec.ts:64–73`). **Die Prüfung der heruntergeladenen Datei ist Pflichtbestandteil
  jedes Testfalls, der einen Export nach einer Löschung behauptet.**
- **Fehler-Wächter:** in **jedem** Testfall
  `const errors: string[] = []; page.on('pageerror', (e) => errors.push(String(e)))`
  (zusätzlich `page.on('console', m => m.type() === 'error' && errors.push(m.text()))`),
  am Ende `expect(errors).toEqual([])` (Abnahmekriterium 9, req Abschnitt 9).
- **Determinismus:** Abschnitt 1.3 gilt für **alle** Tests hier ausnahmslos.

### 4.2 NEU: `tests/e2e/table-row-delete.spec.ts`

Läuft **ohne** `test.describe.configure`-Projekt-Einschränkung → automatisch auf allen
drei Projekten (`playwright.config.ts:34–36`: „Desktop Chrome“, „Mobile“/Pixel 7,
„Tablet“/iPad Mini) → deckt Testfall 15 (Mobile/Tablet) ohne Zusatzcode, sofern jeder Fall
auch auf Touch durchläuft (Einschränkungen 4.4).

**T1 — Basis-Löschen (Grenzfall 1 / Testfall 1):**
```ts
test('Zeile löschen entfernt die mittlere Zeile einer 3-Zeilen-Tabelle', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/'); await page.getByRole('button', { name: /verstanden/i }).click()
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'drei-zeilen.docx', mimeType: DOCX_MIME, buffer: await buildThreeRowTableDocx() })

  const cells = page.locator('.ProseMirror td')
  await cells.nth(2).click()                 // Zeile 2 (0-indiziert), Spalte 0
  await page.getByTitle('Zeile löschen').click()

  await expect(page.locator('.ProseMirror tr')).toHaveCount(2)   // web-first, kein Sleep
  await expect(page.locator('.ProseMirror')).toContainText('Zeile1')
  await expect(page.locator('.ProseMirror')).toContainText('Zeile3')
  await expect(page.locator('.ProseMirror')).not.toContainText('Zeile2')
  expect(errors).toEqual([])
})
```

**T2 — Mehrzeilen-`CellSelection` (Grenzfall 3 / Testfall 2):** zwei komplette Zeilen per
echtem Maus-Drag markieren (deterministisch, mit `steps` und `.selectedCell`-Vorprüfung):
```ts
const boxA = await page.locator('.ProseMirror td').nth(0).boundingBox()
const boxB = await page.locator('.ProseMirror td').nth(3).boundingBox() // Ende Zeile 2 bei 2 Spalten
await page.mouse.move(boxA!.x + 2, boxA!.y + 2)
await page.mouse.down()
await page.mouse.move(boxB!.x + boxB!.width - 2, boxB!.y + boxB!.height - 2, { steps: 6 })
await page.mouse.up()
await expect(page.locator('.ProseMirror .selectedCell')).toHaveCount(4) // Drag als CellSelection erkannt
await page.getByTitle('Zeile löschen').click()
await expect(page.locator('.ProseMirror tr')).toHaveCount(1)            // beide Zeilen in EINEM Schritt weg
```

**T3 — Teil-Zeilen-Selektion (Grenzfall 2 / Testfall 3):** wie T2, aber 4-Spalten-Tabelle,
Drag nur über Spalte 0–1 **einer** Zeile (`.selectedCell` Count = 2) → komplette Zeile
verschwindet trotzdem (`tr`-Count um 1 reduziert, nicht nur zwei Zellen geleert).

**T4 — Alle-Zeilen-Selektion einer mehrzeiligen Tabelle (Grenzfall 4 / Testfall 4):**
`CellSelection` über **alle** Zeilen aufziehen (`.selectedCell` = alle Zellen) →
„Zeile löschen“ → `await expect(page.locator('.ProseMirror table')).toHaveCount(0)` (Tabelle
weg, **kein** stiller No-Op). `expect(errors).toEqual([])`.

**T5 — Einzige Zeile löscht Tabelle, Editor sofort bedienbar (Grenzfall 5 / Testfall 5):**
```ts
await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
const editor = page.locator('.ProseMirror')
await editor.click()
await page.getByRole('button', { name: 'Tabelle einfügen' }).click() // 2×2
await page.locator('.ProseMirror td').first().click()
await page.getByTitle('Zeile löschen').click()                        // Zeile 1 von 2 weg
await expect(page.locator('.ProseMirror tr')).toHaveCount(1)          // Stabilität abwarten
await page.locator('.ProseMirror td').first().click()
await page.getByTitle('Zeile löschen').click()                        // letzte Zeile → Tabelle weg
await expect(page.locator('.ProseMirror table')).toHaveCount(0)
await page.keyboard.type('Weiter ohne Klick.')                        // Editor bleibt fokussiert/bedienbar
await expect(editor).toContainText('Weiter ohne Klick.')
```

**T6 — Rowspan-Migration + Dekrement sichtbar (Grenzfall 5/6 / Testfall 6):** Fixture mit
Rowspan-Tabelle laden (Ankerzelle „Anker“ über 2 Zeilen). (a) Cursor in Ankerzeile →
„Zeile löschen“ → verbleibende Zeile zeigt weiterhin sichtbar „Anker“
(`await expect(page.locator('.ProseMirror td')).toContainText('Anker')`), kein Datenverlust.
(b) zweiter Fall in derselben Datei: Zeile 2 (überdeckt) löschen → „Anker“ bleibt an
gleicher Stelle sichtbar, keine Verschiebung. Ergänzend eine reine-`colspan`-Variante
(Grenzfall 16): Zeile mit `colspan`-Zelle löschen → Zeile inkl. verbundener Zelle weg.

**T7 — Pflicht-Regressionstest Selection-Sync × Zeile löschen (Grenzfall 14, req 2.7 —
dauerhaft):** kombiniert die Struktur-Löschung mit dem im Repo dokumentierten
Selection-Sync-Gap (Abschnitt 1.3, Regel 1):
```ts
test('Zeile löschen, Klick zur Neupositionierung, Enter, weiter tippen — Dokument konsistent', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  // 3-Zeilen-Tabelle laden (Zeilen „Zeile1“/„Zeile2“/„Zeile3“), Cursor in mittlere Zeile
  await page.locator('.ProseMirror td').nth(2).click()
  await page.getByTitle('Zeile löschen').click()
  await expect(page.locator('.ProseMirror tr')).toHaveCount(2)   // Löschung abgeschlossen

  await page.locator('.ProseMirror td').first().click()          // Neupositionierung — der kritische Schritt
  await page.keyboard.press('End')
  await page.waitForTimeout(50)                                   // async selectionchange abwarten (Abschnitt 1.3)
  await page.keyboard.press('Enter')
  await page.keyboard.type('Weiterer Absatz nach Zeile löschen.')

  await expect(page.locator('.ProseMirror')).toContainText('Weiterer Absatz nach Zeile löschen.')
  await expect(page.locator('.ProseMirror')).toContainText('Zeile1')   // keine Komplett-Ersetzung
  await expect(page.locator('.ProseMirror')).toContainText('Zeile3')
  expect(errors).toEqual([])
})
```
Dieser Test ist gemäß Abnahmekriterium 6 (req Abschnitt 9) **dauerhaft** Teil der Suite.

**T-Entf — Abgrenzung Entf/`CellSelection` (Testfall 6/8):**
```ts
// Zeile per Drag markieren wie T2 (.selectedCell-Vorprüfung), dann:
await page.keyboard.press('Delete')
await expect(page.locator('.ProseMirror tr')).toHaveCount(/* unverändert */ 2)  // Struktur bleibt
await expect(page.locator('.ProseMirror td').nth(0)).toHaveText('')             // nur Inhalt geleert
await expect(page.locator('.ProseMirror td').nth(1)).toHaveText('')
```

**T8/T9 — Undo/Redo (req 2.6):**
```ts
// 3-Zeilen-Tabelle, mittlere Zeile löschen, Löschung asserten (toHaveCount 2), dann:
await page.keyboard.press('ControlOrMeta+z')
await expect(page.locator('.ProseMirror tr')).toHaveCount(3)
await expect(page.locator('.ProseMirror')).toContainText('Zeile2')
// T9 zusätzlich:
await page.keyboard.press('ControlOrMeta+y')
await expect(page.locator('.ProseMirror tr')).toHaveCount(2)
await expect(page.locator('.ProseMirror')).not.toContainText('Zeile2')
```
Zusatz (req 2.6, keine Verschmelzung): **vor** dem Löschen in einer *anderen* Zelle tippen,
dann löschen, dann **ein** Strg+Z → nur die Zeilen-Löschung wird rückgängig, der getippte
Text bleibt; erst ein zweites Strg+Z macht das Tippen rückgängig.

**T10 — Kein Tabellenkontext, kein stiller Fehlschlag (Grenzfall 15 / Testfall 10):**
```ts
test('Ohne Tabellenkontext ist "Zeile löschen" nicht bedienbar, keine Konsole-Exception', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('Normaler Fließtext ohne Tabelle.')
  await expect(page.getByTitle('Zeile löschen')).toHaveCount(0)   // ausgeblendet (req 2.1), nicht nur disabled
  expect(errors).toEqual([])
})
```

### 4.3 Echter Upload → Zeile löschen → echter Export → Prüfung der heruntergeladenen Datei

Der in der Aufgabenstellung ausdrücklich geforderte Kernblock: **kein** `page.evaluate`,
sondern echter `setInputFiles`-Upload, echter Klick auf „Zeile löschen“, echter Klick auf
„Exportieren“, echter `page.waitForEvent('download')`, echtes Lesen der Datei von Platte,
echtes Öffnen mit `JSZip`, Assertion gegen den **rohen** XML-Inhalt.

**T11 — DOCX (Testfall 11, RT-1 auf E2E-Ebene):**
```ts
test('Echter DOCX-Upload, Zeile löschen, echter Export, Download enthält korrekte Struktur', async ({ page }) => {
  const buffer = await buildThreeRowTableDocx()                 // eigenständige Fixture, 4.1
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'tabelle.docx', mimeType: DOCX_MIME, buffer })

  await page.locator('.ProseMirror td').nth(2).click()
  await page.getByTitle('Zeile löschen').click()
  await expect(page.locator('.ProseMirror tr')).toHaveCount(2)  // Löschung abgeschlossen, dann exportieren

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const p = await download.path(); expect(p).toBeTruthy()

  const fs = await import('node:fs/promises')
  const zip = await JSZip.loadAsync(await fs.readFile(p!))
  const documentXml = await zip.file('word/document.xml')!.async('text')
  expect((documentXml.match(/<w:tr[ >]/g) ?? []).length).toBe(2)
  expect(documentXml).toContain('Zeile1')
  expect(documentXml).toContain('Zeile3')
  expect(documentXml).not.toContain('Zeile2')
})
```

**T12 — ODT (Testfall 12, RT-2 auf E2E-Ebene):** gleicher Ablauf mit `odtCard`,
ODT-Fixture und `content.xml`; Assertion auf Anzahl `<table:table-row` = 2 statt `<w:tr`;
`not.toContain('Zeile2')`.

**T-Bild — verwaiste Bilddatei (Testfall 6, E2E-Ebene):** Tabelle mit Bild in einer Zelle
importieren (Fixture mit eingebettetem Bild) → Zeile mit dem Bild löschen → exportieren →
Download mit `JSZip` öffnen → `Object.keys(zip.files)` auf `word/media/` (DOCX) bzw.
`Pictures/` (ODT) filtern → Assertion: Anzahl Bilder **nach** der Löschung um genau 1
niedriger als vorher (nicht nur „Ordner existiert“); kein Media-Eintrag ohne referenzierende
Relationship.

**T13 — große Tabelle über echten Datei-Import (Testfall 13 / Grenzfall 17/18):** reale
Fixture (`tests/fixtures/external/odt/BigTable.odt` oder eine im Test gebaute >10-Zeilen-
Tabelle) per `setInputFiles` laden → mittlere Zeile per Klick + „Zeile löschen“ → alle
übrigen sichtbaren Zellinhalte per `toContainText`/Fingerprint unverändert; Performance nur
**beobachtend** protokolliert, kein hartes Zeitlimit-Assert (Abschnitt 1.3, Regel 5).

**T14 — verschachtelte Tabelle (Grenzfall 13):** `subTables.odt` (oder `subTables2.odt`)
laden → Zeile der **äußeren** Tabelle, die eine innere Tabelle enthält, löschen → kein
Absturz (`pageerror`-Wächter leer), innere Tabelle verschwindet mit der Zeile, Editor
bleibt bedienbar.

### 4.4 Mobile/Tablet (Grenzfall 21 / Testfall 15)

`table-row-delete.spec.ts` läuft ohne Projekt-Einschränkung → T1–T14 laufen automatisch
auch auf „Mobile“ (Pixel 7) und „Tablet“ (iPad Mini). Zusätzlich zu verifizieren, weil
Touch ≠ Maus:

- **Echtes Tap statt Klick:** Auf den Touch-Projekten für den „Zeile löschen“-Button und
  die Zellen-Navigation zusätzlich `locator.tap()` prüfen (`hasTouch` ist über
  `devices['Pixel 7']`/`devices['iPad Mini']` gesetzt). Kein `test.skip`-Gate — ein
  kleiner, eigener `.tap()`-Testfall, der auf Desktop Chrome nicht schadet.
- **Mehrzeilen-`CellSelection` per Touch (T2/T3):** `page.mouse.*` simuliert eine Maus,
  keinen Finger-Drag. Auf Touch-Projekten mit `page.touchscreen` versuchen; falls die
  eingesetzte `prosemirror-tables`-Version das nachweislich nicht als Drag erkennt, als
  **dokumentierte Einschränkung** festhalten (Mehrzeilen-Selektion per Touch derzeit nicht
  zuverlässig), **ohne** den Kernweg zu blockieren: einzeiliges Löschen per Tap auf den
  Button (T1/T5/T7) muss auf Touch funktionieren — req Testfall 15 verlangt ausdrücklich
  nur „mindestens einen funktionierenden Weg“.
- Ergebnis fließt in Abschnitt 6 als Nachweis für Zugriffsweg 6/7 (req Abschnitt 1) ein.

### 4.5 Visuelle Prüfung `.selectedCell`-Markierung

Kurzer eigenständiger Fall (kann Teil von T2 sein; separat, weil rein CSS): Nach einem
Maus-Drag über mehrere Zellen `getComputedStyle` auf `.ProseMirror .selectedCell::after`
prüfen (`page.locator('.ProseMirror .selectedCell').first().evaluate(el =>
getComputedStyle(el, '::after').backgroundColor)`) → nicht „transparent“/`rgba(0,0,0,0)`.
Stellt sicher, dass Grenzfall 2/3 und die Entf-Abgrenzung für eine echte Person am
Bildschirm beobachtbar sind (Codeplan Abschnitt 3.8 ergänzt `.selectedCell`-CSS, das
`src/index.css` heute nicht hat — Volltextsuche bestätigt: kein Treffer).

---

## 5. Nicht-funktionale Prüfungen

1. **Fehler-Wächter in jedem E2E-Test** (nicht nur T7/T10): `page.on('pageerror', …)` +
   `page.on('console', m => m.type() === 'error' && …)`, am Ende `expect(errors).toEqual([])`
   (req Abschnitt 9 verlangt es für **alle** Fälle).
2. **Tastatur-Erreichbarkeit:** `Tab`-Kette bis der „Zeile löschen“-Button fokussiert ist
   (`await expect(page.getByTitle('Zeile löschen')).toBeFocused()`), dann `Enter`/`Space`
   löst dieselbe Aktion aus wie ein Klick — Mindeststandard für ein natives `<button>`
   (Codeplan sieht ein `<button>` vor, kein `<div onClick>`).
3. **Kein Layout-Springen** beim Ein-/Ausblenden der `TableToolbar` (Cursor rein/raus aus
   der Tabelle) — optische Beobachtung, kein hartes Assert.

---

## 6. Abnahmekriterien-Abgleich (`zeile-loeschen-req.md` Abschnitt 9)

| # | Kriterium | Test(s) in diesem Plan |
|---|---|---|
| 1 | Kontextabhängige Werkzeugleiste mit funktionierendem Button | 4.2-T1, 4.2-T10 (Sichtbarkeitsumkehr) |
| 2 | Jeder Zugriffsweg dokumentiert/getestet | 4.4 (Mobile/Touch); Zugriffswege 2/3/5 „bewusst nicht umgesetzt“ (Codeplan Abschnitt 4), hier als solche geprüft (Kontextmenü nicht abgefangen, keine Tastenkombination, kein Dialog); Weg 4 (Entf) → T-Entf/3.1-P |
| 3 | Cursor/Teil-Zeile/Mehrzeilen exakt nach 2.2 inkl. Entf-Abgrenzung | 3.1-A/B/C/P, 4.2-T1/T2/T3/T-Entf |
| 4 | Guard-Sonderfall (alle/letzte Zeile → Tabelle weg, nie stiller No-Op; einzige Tabelle → leerer Absatz) | 3.1-D/E/Q, `removeWholeTable`, 4.2-T4/T5 |
| 5 | Rowspan-Migration, Rowspan-Dekrement, Colspan-Komplettverlust je eigener Test | 3.1-F/G/N, 3.2/3.3 RT-3/RT-4, 4.2-T6 |
| 6 | Pflicht-Regressionstest Selection-Sync × Zeile löschen, dauerhaft | 4.2-T7 (inkl. Selection-Sync-Gap, Abschnitt 1.3) |
| 7 | Rundreise 5.2 für DOCX **und** ODT grün, inkl. Bild-Verwaisung, unabhängiger Parser | 3.2, 3.3 (**ohne** ODT-Bugfix — keiner nötig), 3.4, 4.3-T11/T12/T-Bild |
| 8 | Alle Grenzfälle 1–21 einzeln abgedeckt/dokumentiert, 20 (Track-Changes) bewusst ausgenommen | Testmatrix Abschnitt 2 |
| 9 | Kein stiller Datenverlust/keine Konsole-Exception | 5.1 (global), 4.2-T10, `removeWholeTable`-Fallback über 3.1-E |
| 10 | Backlog-Statuswechsel „fehlt“→„vorhanden“ erst nach 1–9 | nicht Testgegenstand; QA-Freigabe (Abschnitt 8) ist Voraussetzung |

---

## 7. Vorbehalte an Dev (QA-Prüfpunkte gegen den Codeplan)

Im Sinne „nicht vertrauenswürdig in beide Richtungen“ (req Abschnitt 0): Diese Aussagen aus
`zeile-loeschen-code.md` gelten erst als **erwiesen**, wenn der jeweils benannte Test sie
belegt — erneutes Code-Lesen durch QA reicht nicht.

1. **No-Op-Falle bei `deleteRow`** (Codeplan Abschnitt 1 Punkt 1): 3.1-D **und** 3.1-Q
   decken genau den Fall ab. Ruft die Implementierung entgegen dem Plan doch direkt
   `deleteRow(state, dispatch)` ohne `wholeTableSelected`-Vorprüfung auf, **müssen** beide
   Tests rot werden (statt grünem stillem No-Op). E2E-Gegenprobe: 4.2-T4/T5.
2. **ODT-`covered-table-cell` ist bereits korrekt — kein Fix, kein „rot vor Fix“**
   (Codeplan Abschnitt 5.2, Kopf dieser Datei): 3.3 RT-Cov ist ein **Regressionsschutz**
   (die Löschung darf die schon korrekte Ausgabe nicht beschädigen), **nicht** der Nachweis
   eines Bugs. Sollte ein Reviewer erneut einen ODT-Writer-Bug behaupten, ist das gegen
   `writer.ts:115–116`/`135–167` und die grünen Tests `roundtrip.test.ts:275`/`:310–339`
   zu prüfen, bevor Aufwand entsteht.
3. **`CellSelection.replace()` leert bereits nur Inhalt** (Codeplan Abschnitt 1 Punkt 3,
   „kein Produktivcode nötig“): 3.1-P und 4.2-T-Entf bestätigen das **unabhängig** vom
   Codeplan-Text; ändert eine künftige `prosemirror-tables`-Version das Verhalten, schlägt
   der Test an, ohne dass jemand den Codeplan erneut lesen muss.
4. **`fixTables()`-Sicherheitsnetz** (Codeplan Abschnitt 1 Punkt 5): in 3.5 (reale
   Fixtures) indirekt mitgeprüft, aber nicht durch einen gezielt inkonsistenten
   Zwischenzustand — als akzeptierte Lücke dokumentiert (reines Bibliotheks-Verhalten, der
   Codeplan sieht keinen eigenen Umgang damit vor).
5. **Tabellenaufbau in E2E über Datei-Upload statt UI** (4.1): solange kein UI-Weg für
   >2 Zeilen existiert (`zeile-einfuegen` ist ein separater Slug), entstehen mehrzeilige
   Test-Tabellen über hochgeladene Dateien. Das ist **kein** Verstoß gegen „nicht nur
   interne Funktionsaufrufe“ (Upload ist echte Browser-Interaktion), beweist aber nicht das
   *Anlegen* mehrzeiliger Tabellen per UI — das ist bewusst nicht Teil dieses Features.
6. **Button-Locator strikt an `title`/`aria-label="Zeile löschen"` gekoppelt:** rendert die
   Implementierung nur eines der beiden oder einen abweichenden Text, schlagen die
   `getByTitle('Zeile löschen')`-Locator fast überall fehl — beabsichtigt (an req
   Abschnitt 1 gekoppelt), kein Test-Bug.
7. **Determinismus des Selection-Sync-Gaps** (Abschnitt 1.3): 4.2-T7 muss den
   `waitForTimeout(50)`-Gap nach dem nativen Cursor-Move enthalten. Fehlt er, ist der Test
   flaky (genau die Klasse Fehler, die die jüngsten Repo-Commits andernorts gefixt haben)
   und **nicht** freigabefähig — auch wenn er lokal „meist grün“ ist.

---

## 8. Definition of Done für die QA-Freigabe

Die QA-Prüfung gilt erst als abgeschlossen (Backlog-Status frühestens dann von „fehlt“ auf
„vorhanden“/„teilweise“, req Abschnitt 9 Punkt 10), wenn:

1. Alle Unit-Tests aus Abschnitt 3 (3.1–3.6) existieren und grün sind — inklusive der
   Reader/Writer-Rundreise **für DOCX und ODT** mit **echtem** `deleteTableRow()`-Aufruf
   (nicht bloß fertig konstruierter Nach-Löschen-JSONs) und der rohen XML-Assertion.
2. Alle E2E-Tests aus Abschnitt 4 (4.2–4.5) existieren, laufen auf allen drei
   Playwright-Projekten und sind grün — insbesondere der dauerhafte Pflicht-Regressionstest
   4.2-T7 (mit Selection-Sync-Gap) und der Upload→Löschen→Export→Download-Block 4.3.
3. Kein bestehender, vorher grüner Test (Abschnitt 3.6) wurde durch dieses Feature rot;
   ein vollständiger `npm run test` + `npx playwright test` wurde ausgeführt.
4. Diff-Prüfung bestätigt: **kein** E2E-Test in `tests/e2e/` ruft interne Editor-/Command-
   APIs über `page.evaluate` auf, um UI-Interaktion zu umgehen (Regel 1.1).
5. Die Testmatrix in Abschnitt 2 ist vollständig abgehakt — jede Zeile verweist auf
   mindestens einen tatsächlich existierenden, grünen Test (oder eine bewusst dokumentierte
   Ausnahme: Grenzfall 20 Track-Changes).
6. Die Vorbehalte in Abschnitt 7 sind einzeln durch den jeweils benannten Test beantwortet,
   nicht offen gelassen — insbesondere ist **nicht** erneut ein nicht existierender
   ODT-`covered-table-cell`-Bug eingeführt worden (Vorbehalt 2).
