# Testplan „Spalte einfügen (links/rechts)" — QA-Verifikation

Gegenstück zu `specs/spalte-einfuegen-req.md` (Anforderung) und
`specs/spalte-einfuegen-code.md` (Umsetzungsplan). Dieses Dokument legt fest,
**welche Tests** geschrieben werden, **wo** sie liegen, **wie** sie deterministisch
ausgeführt werden und **wann** ein Punkt als abgehakt gilt. Zwei Ebenen, die
sich ergänzen, von denen aber **keine die andere ersetzen darf** — Anforderung
Abschnitt 8 verlangt dies ausdrücklich, weil der Ausgangsstatus „fehlt" ist und
**keine einzige** Codezeile für dieses Feature existiert (verifiziert:
`grep -n "addColumn\|insertColumn" src/formats/shared/editor/commands.ts` → nur
`isInTable`, kein Spalten-Export; `Toolbar.tsx` enthält keinen Spalten-Button):

1. **Unit-Tests** (Vitest, `jsdom`) für die Befehls-Logik
   (`insertColumnBefore`/`insertColumnAfter` gegen `EditorState` +
   Capture-Dispatch + echtes `prosemirror-tables`, **ohne** gemountete
   `EditorView` — Muster wie die bereits vorhandene `commands.test.ts`, siehe
   1.1) sowie für die Reader/Writer-Rundreise auf Daten-/XML-Ebene — schnell,
   präzise, aber **blind gegenüber** Toolbar, Button-Zustand (`disabled`),
   echter Tastatur-/Maus-Bedienung und dem tatsächlichen Datei-Dialog.
2. **Echte Playwright-Browser-Tests** — Klicks auf die tatsächlichen
   Toolbar-Buttons „Spalte links einfügen"/„Spalte rechts einfügen", echte
   Zellauswahl per Maus-Drag, echter `setInputFiles()`-Upload, echter
   `page.waitForEvent('download')`-Export und Prüfung der **tatsächlich
   heruntergeladenen Datei vom Datenträger** (`download.path()` →
   `fs.readFile` → `JSZip.loadAsync` → Ziel-XML lesen) — **nicht** ein
   interner Aufruf von `readDocx`/`readOdt`/`writeDocx`/`writeOdt`/
   `insertColumnBefore`/`insertColumnAfter`. Das ist die einzige Ebene, die
   beweisen kann, dass die Buttons überhaupt existieren, sichtbar
   (de)aktiviert sind und im echten Editor wirken — Kern des
   Verifikationsauftrags in Anforderung Abschnitt 8.

## Wichtige Korrektur gegenüber einem früheren Entwurf dieses Testplans

Ein früherer Stand dieser Datei führte einen **ODT-`colCount`-„Pflicht-Fix"**
(angeblich `odt/writer.ts:88`, `rows[0]?.content?.length` statt Colspan-Summe)
als Kernstück auf und verlangte, der zugehörige Test müsse **„vor dem Fix rot"**
laufen. **Dieser Fehler existiert im tatsächlichen Code nicht (mehr)** — gegen
den aktuellen Quellstand verifiziert: `src/formats/odt/writer.ts:115-116` lautet
bereits

```ts
const colCount =
  (rows[0]?.content ?? []).reduce((sum, cell) => sum + Number(cell.attrs?.colspan ?? 1), 0) || 1
```

(Colspan-Summe, identisch zum DOCX-Writer) und ist durch bestehende Tests
abgesichert — u. a. `src/formats/odt/__tests__/roundtrip.test.ts` sowie der
E2E-Test `tests/e2e/odt.spec.ts:207` (`expect(... <table:table-column\/> ...).toBe(2)`)
und sein DOCX-Pendant `tests/e2e/docx.spec.ts:236` (`<w:gridCol>` `.toBe(2)`).
Genau diese stehengebliebene Fehlbehauptung korrigieren **Anforderung
Abschnitt 6** und **Codeplan Abschnitt 0.1** ausdrücklich. Der ODT-/DOCX-Export
ist daher **kein Bugfix-Auftrag** dieses Features, sondern nur
**Regressionsschutz** (Abschnitt 1.2/1.3 unten). `odt/writer.ts` und
`docx/writer.ts` werden **nicht** geändert.

Der einzige **noch offene** Punkt am Datei-Ein-/Ausgabe-Pfad ist ein
**Verifikationspunkt** (kein bestätigter Bug): ob die Annahme des ODT-Readers,
`<table:covered-table-cell/>` zu überspringen (`odt/reader.ts:304`), auch für
**reale LibreOffice-Fremddateien** mit vertikaler Verbindung trägt (Anforderung
Abschnitt 6.2, Grenzfall 4.14). Ergebnis ist zu dokumentieren, nicht als
„Spalte-einfügen"-Fehler zu behandeln (Abschnitt 1.5/2.6 unten).

## Referenzierte reale Fixture-Dateien (alle im Repo vorhanden, `ls`-geprüft)

Existenz jedes Pfads wurde direkt geprüft (kein Verlass auf Namensähnlichkeit —
`crazyTable.odt` **und** `Crazy.odt` existieren z. B. beide, sind aber
verschiedene Dateien):

- DOCX: `tests/fixtures/external/docx/TestTableColumns.docx`,
  `deep-table-cell.docx`, `TestTableCellAlign.docx`, `Bug54771a.docx`,
  `Bug54771b.docx`.
- ODT: `tests/fixtures/external/odt/BigTable.odt`, `TestTextTable.odt`,
  `crazyTable.odt`, `TableWidth.odt`, `FrameWithTable.odt`, `OOStyledTable.odt`,
  `Tabelle1.odt`, `TableFunkyBackground.odt`, `feature_attributes_tables.odt`.

**Pflicht vor Verwendung:** Mit jeder Datei einmalig prüfen (per `readDocx`/
`readOdt` im Node-REPL), ob sie tatsächlich die für den jeweiligen Testfall
benötigte Struktur enthält — horizontaler Merge (`colspan`/`w:gridSpan`/
`table:number-columns-spanned`), vertikaler Merge (`rowspan`/`w:vMerge`/
`table:number-rows-spanned`) bzw. eine verschachtelte Tabelle. Die Dateinamen
allein garantieren das **nicht**. Enthält eine Datei die benötigte Struktur
nicht, ersatzweise eine andere Tabellen-Fixture aus derselben Liste heranziehen
und die tatsächlich verwendete Datei im Test kommentieren.

---

## 0. Ausführung und Reihenfolge

| Ebene | Befehl | Neue/geänderte Dateien |
|---|---|---|
| Unit | `npm test` (`vitest run`) | siehe Abschnitt 1 |
| Browser/E2E | `npm run test:e2e` (`playwright test`) | siehe Abschnitt 2 |

Reihenfolge (deckt sich mit `spalte-einfuegen-code.md` Abschnitt 5/6): zuerst
die Umsetzung aus dem Codeplan durchführen (`commands.ts` zwei Re-Exports,
`Toolbar.tsx` `ColumnButton` + zwei Icons + zwei Buttons — **kein**
Writer-/Reader-/Schema-Umbau); **dann** `commands.test.ts` (Abschnitt 1.1) als
erste Probe — die Command-Tests werden grün, sobald die Re-Exports existieren,
ganz ohne UI; **dann** die Writer-Regressionstests (Abschnitt 1.2/1.3); **dann**
die E2E-Suite (Abschnitt 2), die als einzige Ebene beweist, dass die Buttons in
der Toolbar sichtbar/bedienbar sind.

**Erwartungslage vor der Umsetzung** (wichtig, damit „rot" richtig gedeutet
wird):
- Die neuen Tests aus 1.1 und Abschnitt 2 sind **rot** — weil Re-Exports und
  Buttons fehlen. Das ist beabsichtigt und der Beleg, dass der Backlog-Status
  „fehlt" zutrifft.
- Die Writer-Tests aus 1.2/1.3 (und die bestehenden `odt.spec.ts:207`/
  `docx.spec.ts:236`) sind bereits **grün** — der Export ist schon korrekt. Ein
  „muss erst rot sein"-Kriterium gibt es hier **nicht** (Korrektur gegenüber
  dem früheren Entwurf). Sie dürfen durch „Spalte einfügen" nur nicht **brechen**.

Beide Suiten müssen grün sein, bevor „Spalte einfügen" laut Anforderung
Abschnitt 10 als „verifiziert"/„vorhanden" gelten darf.

---

## 0.1 Determinismus-Regeln (verbindlich für alle E2E-Tests)

Dieses Feature ist besonders race-anfällig, weil der Button-Zustand (`disabled`)
und die Wirkung des Commands **von der Editor-Selektion** abhängen und die
Anwendung die native Selektion **asynchron** in den ProseMirror-State
übernimmt (Reconciliation in `WordEditor.tsx`). Genau diese Klasse von
Race-Conditions hat in dieser Codebasis bereits wiederholt zu flakigen Tests
geführt (jüngste Fixes: „give async selection sync time before the next
keystroke" in `selection-regression.spec.ts` und `cut.spec.ts`, besonders auf
den Projekten **Mobile/Pixel 7** und **Tablet/iPad Mini**). Die folgenden
Regeln sind **Pflicht**, keine Empfehlung:

1. **Sync-Gate statt Schlaf nach „Cursor in Zelle setzen".** Nach `td.click()`
   (oder Tipp in eine Zelle) **niemals** sofort den Einfüge-Button klicken.
   Stattdessen auf das automatisch nachziehende Sync-Ergebnis warten — die
   auto-retryende Assertion ist das Gate:
   `await expect(page.getByRole('button', { name: 'Spalte rechts einfügen' })).toBeEnabled()`.
   Der `disabled`-Zustand wird aus `isInTable(view.state)` abgeleitet und
   aktualisiert sich erst, **nachdem** die Selektion in den State übernommen
   wurde. `toBeEnabled()`/`toBeDisabled()` pollen automatisch bis zum Timeout und
   sind damit deterministisch — im Gegensatz zu einem festen `waitForTimeout`.
2. **Kurze Sync-Pause vor `Enter`/Tippen nach einer nativen Cursorbewegung.**
   Wo ein Test per Tastatur den Caret bewegt (`End`, Pfeiltasten, Klick in eine
   andere Zelle) und **unmittelbar danach** `Enter` drückt oder tippt, vorher
   `await page.waitForTimeout(50)` einfügen — exakt das bereits in
   `selection-regression.spec.ts:26-34` dokumentierte und begründete Muster
   (ProseMirror lernt den nativen Caret-Move nur über das asynchrone
   `selectionchange`-Event; eine sofort folgende `press()`-Kette kann diesem
   Nachziehen vorauseilen). Diese 50 ms sind kein „Rate-Limit gegen zu schnelles
   Tippen", sondern geben dem bereits in Flug befindlichen Sync Zeit zu landen.
3. **CellSelection-Drag: auf die etablierte Auswahl warten.** Nach
   `mouse.down()`/`hover()`/`mouse.up()` **nicht** sofort den Button klicken,
   sondern auf das sichtbare CellSelection-Ergebnis warten:
   `await expect(page.locator('.ProseMirror td.selectedCell')).toHaveCount(2)`
   (`prosemirror-tables` markiert Zellen einer `CellSelection` mit der Klasse
   `selectedCell`, `node_modules/prosemirror-tables/style/tables.css:38` —
   Klassenname vor Verwendung einmal gegen das echte DOM gegenprüfen). Erst
   danach den Einfüge-Button klicken.
4. **Struktur-Assertions immer über auto-retryende Locator-Erwartungen.**
   Zellzahlen mit `await expect(rowCells).toHaveCount(n)` prüfen, **nicht** über
   ein einmalig ausgelesenes `count()` direkt nach der Aktion — Letzteres kann
   vor dem Re-Render feuern. `toHaveCount`/`toContainText` warten bis zum
   Timeout.
5. **Downloads immer per `waitForEvent('download')` vor dem Klick abonnieren.**
   `const downloadPromise = page.waitForEvent('download')` **vor**
   `getByRole('button', { name: 'Exportieren' }).click()`, dann
   `const download = await downloadPromise` — nie umgekehrt (Race gegen das
   Event). Muster aus `odt.spec.ts:64-72`/`docx.spec.ts:79-87`.
6. **Kein `nth()`-Zugriff auf noch nicht gerenderte Zellen.** Nach dem Einfügen
   erst die neue Zellzahl per `toHaveCount` abwarten, dann `nth(neuerIndex)`
   ansprechen.
7. **Diese Regeln gelten auf allen drei Playwright-Projekten** (Desktop Chrome,
   Mobile/Pixel 7, Tablet/iPad Mini). Die Touch-Projekte sind erfahrungsgemäß am
   empfindlichsten; die Sync-Gates aus (1)–(3) sind dort besonders wichtig.

---

## 1. Unit-Tests: Befehls-Logik + Reader/Writer-Rundreise (DOCX + ODT)

### 1.1 Geändert (erweitert): `src/formats/shared/editor/__tests__/commands.test.ts`

**Die Datei existiert bereits** und testet aktuell `canCut`/`cutSelection` mit
`EditorState.create({ doc, schema: wordSchema })` + Capture-Dispatch, **ohne**
gemountete `EditorView`. Der neue Block folgt genau diesem leichtgewichtigen
Muster (kein jsdom-`EditorView`-Mount, kein neues Framework):

- Command-Ausführung über eine `apply(state, cmd)`-Hilfsfunktion, die eine
  Capture-Dispatch-Funktion übergibt und den Folgezustand zurückgibt sowie den
  booleschen Rückgabewert des Commands festhält.
- Undo-Tests über `EditorState.create({ …, plugins: [history()] })` +
  `undo`/`redo` aus `prosemirror-history`.
- `CellSelection` für den Mehrfachauswahl-Fall über `cellAround` +
  `CellSelection` aus `prosemirror-tables` (dieselbe Konstruktion, die die
  Bibliothek intern nutzt).

Kopf des neuen `describe`-Blocks (Hilfsfunktionen `P()`, `CELL()`, `ROW()`,
`TABLE()`, `apply()`, `selectCellRange()` analog Codeplan Abschnitt 6.1).

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | **Grundverhalten „rechts"** | 2×2-Tabelle `A1,B1/A2,B2`, Cursor in „B1", `insertColumnAfter` | 3 Spalten je Zeile; neue leere Zelle an Position 3 in **beiden** Zeilen; `A1,B1,A2,B2` unverändert an Position 1/2 | 3.1/3.2 |
| 2 | **Grundverhalten „links"** | dieselbe Tabelle, Cursor in „A1", `insertColumnBefore` | neue leere Zelle als **erste** Spalte beider Zeilen; `A1,B1,A2,B2` rücken je eine Position nach rechts, Inhalt identisch | 3.1 |
| 3 | **Grenzfall 4.1** (1-spaltige Tabelle) | 1×2-Tabelle (`A1`/`A2`), `insertColumnBefore` **und** separat `insertColumnAfter` | je 2×2-Ergebnis; ursprünglicher Inhalt vollständig in der jeweils anderen Spalte, neue Spalte leer | 4.1 |
| 4 | **Grenzfall 4.3** (linker/rechter Rand) | 1. Cursor erste Spalte, `insertColumnBefore`; 2. Cursor letzte Spalte, `insertColumnAfter` | je neue erste bzw. letzte Spalte, Cursor-Zellinhalt unverändert (nur Position verschoben) | 4.3, 3.2 |
| 5 | **Grenzfall 4.2** (gemischte Merges, horizontal) | 3-Spalten-Tabelle: Zeile 1 `[A1(colspan1), Merged(colspan2, Sp. 2–3)]`, Zeile 2 `[A2,B2,C2]`; Cursor in „B2", `insertColumnAfter` | Zeile 1: 2 Zellen, `colspan`-Array `[1,3]` (Merge 2→3, **keine** neue Zelle in Zeile 1); Zeile 2: 4 Zellen, Text `['A2','B2','','C2']` — **beide Effekte in derselben Aktion** | 3.4, 4.2, Abnahme 3 |
| 6 | **Grenzfall 4.2** (`rowspan`, vertikal) | Tabelle mit `rowspan:2`-Zelle über Zeile 1–2 in Spalte 1, `insertColumnBefore` links davon | beide überdeckten Zeilen konsistent (neue Zelle bzw. erweiterte Merge-Zelle je Anordnung); `rowspan`-Wert selbst unverändert | 3.4 (letzter Absatz) |
| 7 | **Grenzfall 4.4** (Mehrfachauswahl) | 3×3-Tabelle, `CellSelection` via `cellAround` über mittlere+rechte Spalte (Zeile 1), `insertColumnAfter` | Spaltenzahl 3 → **4** (nicht 5) — **eine** Spalte je Aufruf, unabhängig von der Auswahlbreite (bewusste v1-Entscheidung Codeplan 4.1) | 4.4, Abnahme 4 |
| 8 | **Grenzfall 4.5** (verschachtelte Tabelle) | äußere 1×2, in Zelle 1 innere 1×2, Cursor im Text der inneren, `insertColumnAfter` | äußere Zeile bleibt **2**; innere Zeile 2 → **3** | 4.5, Abnahme 9 |
| 9 | **Inhalt neuer Zellen** | beliebige Tabelle, Insert ausführen | neue Zelle enthält genau einen leeren `paragraph`-Knoten (nicht `null`), kein Inhalt aus Nachbarzellen kopiert | 3.5 |
| 10 | **Grenzfall 4.11** (mehrabsätzige Zelle) | Zelle mit zwei `paragraph`-Kindern an der Einfügeposition, Nachbarspalte einfügen | beide Absätze unverändert (Reihenfolge, Text, Anzahl) | 4.11 |
| 11 | **Undo — einfach** | 2×2, `insertColumnAfter`, dann `undo()` | Struktur exakt wie vor dem Insert (Spaltenzahl, Inhalt) | 3.8, Abnahme 8 |
| 12 | **Undo — mit Merge** | Aufbau wie #5, `insertColumnAfter`, dann `undo()` | Zeile 1 wieder `colspan`-Array `[1,2]`, Zeile 2 wieder 3 Zellen mit Original-Text — inkl. korrekt wiederhergestelltem Merge | 3.8, 4.9, Abnahme 8 |
| 13 | **Redo** | Fortsetzung #11, `redo()` | neue Spalte wieder vorhanden, identisch zum Zustand direkt nach dem Insert | 3.8 |
| 14 | **Ein Klick = ein Undo-Schritt bei mehrzeiliger Tabelle** | 5-zeilige Tabelle, `insertColumnAfter`, **ein** `undo()` | **alle** 5 Zeilen gleichzeitig zurückgesetzt (belegt „genau eine Transaktion" jenseits von 2×2) | 3.8 (1. Absatz) |
| 15 | **Deaktiviert außerhalb einer Tabelle** | Dokument ohne Tabelle, Cursor im Absatz | `isInTable(state) === false`; `insertColumnBefore(state, captureDispatch)` liefert `false` und dispatcht **nie** (Capture-Callback wird nicht aufgerufen); Doc-Objektidentität unverändert | Abschnitt 2 Pkt 3, Grenzfall 4.8 |
| 16 | **`table_header`-Absicherung** (Zusatzfund Codeplan Abschnitt 2) | Tabelle wie von `insertTable`/Reader erzeugt, `insertColumnBefore`/`-After` mehrfach | alle Zell-Knotentypen bleiben `table_cell`, **niemals** `table_header` (Regressionsschutz für künftigen Kopfzeilen-Support) | Codeplan Abschnitt 2 |
| 17 | **Sehr breite Tabelle, keine Exception** | 2×2, `insertColumnAfter` 10× hintereinander | 12 Spalten je Zeile, kein Throw, letzte neue Zelle weiterhin ein leerer `paragraph` (befüllbar) | 4.7 |

### 1.2 Geändert (erweitert): `src/formats/odt/__tests__/roundtrip.test.ts` — Regressionsschutz (KEIN Bugfix)

Die Datei hat **bereits** die relevanten Merge-Export-Tests, die das
**bereits korrekte** `colCount`-Verhalten (Colspan-Summe) absichern (u. a. der
`covered-table-cell`-Platzhalter-Test mit `expect(<table:table-column\/>-Anzahl).toBe(2)`
und das `rowspan`-Pendant). Diese müssen grün **bleiben**. Ergänzt wird **ein**
additiver Fall im bestehenden `describe('ODT round trip: tables', …)`-Block, der
die Situation „Merge **plus** zusätzliche echte Spalte" abdeckt (simuliert das
Ergebnis eines Spalten-Inserts neben einem bestehenden Merge) — reiner
Regressionsschutz, dass „Spalte einfügen" die Spaltenzahl nicht bricht.

`import JSZip from 'jszip'` und `import { writeOdt } from '../writer'` sind am
Dateikopf bereits vorhanden.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | **Regression: Merge in Zeile 1, korrekte Spaltenzahl** | Tabelle mit `colspan:2`-Zelle + normaler Zelle in Zeile 1 (2 Zellknoten, 3 effektive Spalten), `writeOdt` | `content.xml` enthält genau **3** `<table:table-column/>` (nicht 2) | Anforderung 6.1 |
| 2 | **Regression: Merge + zusätzliche Spalte** | wie #1, zusätzlich eine dritte normale Zelle in Zeile 1 (simuliert das Insert-Ergebnis) | `<table:table-column/>`-Anzahl ist **4**, korrekt fortgeschrieben | 6.1, Rundreise 5.2.2 |
| 3 | **Regression: Colspan-gewichtete Spaltenzahl übersteht Re-Import** | Export aus #1 erneut mit `readOdt` importieren | resultierendes Dokument hat 3 effektive Spalten (Summe der `colspan` in Zeile 1), Zellinhalt unverändert | Rundreise 5.2.1 |
| 4 | **Regression: `rowspan` + covered-table-cell am richtigen Grid-Index** | `table:number-rows-spanned="2"`-Zelle, Export | überdeckte Folgezeile trägt am richtigen Index `<table:covered-table-cell/>`; Spaltenzahl je Zeile korrekt | Rundreise 5.2.3 |
| 5 | **Bestehende Merge-Tests bleiben grün** | vorhandene Merge-/`it`-Fälle dieser Datei | alle bisherigen Assertions weiterhin erfüllt (Erweiterung, keine Ersetzung) | 6.1 |

**Hinweis:** Kein Testfall dieses Abschnitts muss „vor einem Fix rot" laufen —
der Writer ist bereits korrekt (Korrektur gegenüber dem früheren Entwurf).

### 1.3 Geändert (erweitert): `src/formats/docx/__tests__/roundtrip.test.ts` — symmetrischer Regressionsschutz

Der DOCX-Writer ist bereits korrekt (Codeplan Abschnitt 2/5.6). Die bestehenden
Tabellentests assertieren auf das **re-importierte JSON** via `roundTrip()`.
Ergänzt wird symmetrisch zu 1.2:

| # | Testfall | Eingabe | Erwartung |
|---|---|---|---|
| 1 | Colspan-gewichtete `<w:gridCol>`-Anzahl | Tabelle mit `colspan:2`-Zelle + normaler Zelle in Zeile 1, `writeDocx` | `word/document.xml` enthält genau **3** `<w:gridCol>` (JSZip-Text-Lesung; `import JSZip` konsistent mit `odt/roundtrip.test.ts` ergänzen) |
| 2 | Jede `<w:tr>` hat korrekte `<w:tc>`-Anzahl nach simuliertem Insert | wie #1, plus dritte Zelle in Zeile 1 | 3 `<w:gridCol>`, jede `<w:tr>` genau die richtige `<w:tc>`-Zahl (Merge-Zeile mit `w:gridSpan`) |
| 3 | `w:vMerge`/`w:gridSpan` bleiben nach Rundreise korrekt | Tabelle mit `rowspan:2`-Zelle, Spalte simuliert eingefügt, `roundTrip()` | `w:vMerge`-Struktur unverändert korrekt, Spaltenzahl konsistent (Rundreise 5.1.3) |

### 1.4 Ergänzung: Cross-Format-Unit-Tests (Rundreise 5.1.4/5.2.3, ohne Browser)

Je ein Testfall pro Richtung: ODT-Tabellen-JSON (mit simulierter neuer Spalte)
über `writeDocx` exportieren und `readDocx` re-importieren — und spiegelbildlich
DOCX-JSON über `writeOdt`/`readOdt`. Prüft, dass die `colCount`-Berechnung
beider Writer nach dem Insert konsistent bleibt, unabhängig vom Ursprungsformat.
Schnelle Vorstufe, **kein** Ersatz für die echten Browser-Cross-Format-Tests
(Abschnitt 2.6).

### 1.5 Ergänzung: ODT-Reader-Verifikationspunkt (Anforderung 6.2 / Grenzfall 4.14) — Unit-Vorstufe

Als schnelle Vorstufe zum E2E-Beleg in 2.6: eine reale LibreOffice-ODT mit
vertikaler Verbindung (aus der Fixture-Liste, deren `rowspan` per `readOdt`
**vorab bestätigt** wurde) laden → `readOdt` → resultierendes Doc auf korrekte
Spalten-/Zellzuordnung der Folgezeilen prüfen → optional `insertColumnBefore`
auf das importierte Doc anwenden → `writeOdt` → `readOdt` → Zuordnung erneut
prüfen. **Ergebnis dokumentieren:**
1. Annahme trägt → als bestätigt vermerken (kein Handlungsbedarf).
2. Annahme trägt nicht → als **eigenständige Reader-Abhängigkeit/Ticket**
   erfassen, **nicht** als „Spalte-einfügen"-Fehler (der Reader-Pfad ist
   unabhängig von diesem Feature).

Dies ist bewusst eine **Verifikations-, keine Fix-Anforderung** — es liegt kein
bestätigter Reader-Bug vor.

---

## 2. Echte Playwright-Browser-Tests

**Grundregel dieser Ebene:** Jeder Test bedient die Anwendung ausschließlich so,
wie eine Person es täte — `getByRole('button', { name: … }).click()`,
`keyboard.type(…)`/`.press(…)`, Maus-Drag für Mehrfachauswahl,
`input.setInputFiles(…)` für Uploads, `waitForEvent('download')` + Lesen der
heruntergeladenen Datei vom Datenträger für Exporte. **Kein Test in diesem
Abschnitt darf** `insertColumnBefore`/`insertColumnAfter`/`isInTable`/
`readDocx`/`writeDocx`/`readOdt`/`writeOdt` direkt importieren oder aufrufen —
das wäre Ebene 1. Die Buttons heißen laut Codeplan 5.2 exakt
`"Spalte links einfügen"` und `"Spalte rechts einfügen"` (identisch als `title`
**und** `aria-label`) — beide Locator-Formen (`getByRole('button', { name })`,
`getByTitle(…)`, `getByLabel(…)`) müssen denselben Button treffen. Alle Tests
befolgen die Determinismus-Regeln aus **Abschnitt 0.1**.

### 2.0 Neue Datei: `tests/e2e/tables.spec.ts`

Struktur/Locator-Helfer identisch zu bestehenden Dateien:

```ts
function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
```

`beforeEach`: `page.goto('/')` →
`page.getByRole('button', { name: /verstanden/i }).click()` →
`odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()` (Muster
aus `selection-regression.spec.ts`). Der Tabellen-Einfüge-Button trägt den
accessiblen Namen `'Tabelle einfügen'` (in `selection-regression.spec.ts:46`
bereits erprobt). ODT dient als Standard-Format der UI-Verhaltenstests; die
Rundreise-Prüfungen decken DOCX und ODT getrennt in Abschnitt 2.6 ab.

### 2.1 Toolbar-Buttons: Existenz und Aktiv-/Deaktiviert-Zustand (Abschnitt 2 Pkt 3, Abnahme 1)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Beide Buttons existieren, außerhalb einer Tabelle sichtbar aber deaktiviert | frisches Dokument, Cursor im leeren Absatz (kein „Tabelle einfügen") | `getByRole('button', { name: 'Spalte links einfügen' })` und `… 'Spalte rechts einfügen'` sind `toBeVisible()` **und** `toBeDisabled()` |
| 2 | Buttons werden aktiv, sobald der Cursor in eine Tabelle wechselt | „Tabelle einfügen" klicken, erste `.ProseMirror td` anklicken | **Sync-Gate:** `await expect(bothButtons).toBeEnabled()` (auto-retry deckt die asynchrone Selektionsübernahme ab, Regel 0.1-1) |
| 3 | Buttons werden wieder deaktiviert, sobald der Cursor die Tabelle verlässt | wie #2, danach Cursor per Klick in einen Absatz außerhalb der Tabelle | beide Buttons wieder `toBeDisabled()` (auto-retry) |
| 4 | Klick auf einen deaktivierten Button hat keine Wirkung (Grenzfall 4.8) | Zustand wie #1, `.click({ force: true })` versuchen | kein Fehler; Editor-Inhalt/Struktur unverändert (Playwright verweigert echten Klick auf `disabled` ohnehin; `force: true` bestätigt zusätzlich, dass selbst ein erzwungener Klick nichts auslöst) |
| 5 | `aria-label` konsistent mit `title` | Cursor in einer Tabelle (Sync-Gate abwarten) | `getByTitle('Spalte links einfügen')` und `getByLabel('Spalte links einfügen')` referenzieren denselben Button (Handle-Vergleich); analog „rechts" |
| 6 | Tastatur-Erreichbarkeit (Abschnitt 2 Pkt 5) | Cursor in Tabelle (Sync-Gate), dann Button per `Tab` fokussieren, `Enter` bzw. separat `Space` | Spalte eingefügt, identisch zum Maus-Klick (`await expect(rowCells).toHaveCount(3)` bei 2×2-Start) |

### 2.2 Grundverhalten (Abschnitt 3.1/3.2, Abnahme 2)

Vor jedem Button-Klick gilt Regel 0.1-1 (Cursor-Zelle klicken → `toBeEnabled()`
abwarten → Button klicken).

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | „Spalte rechts" fügt rechts der Cursor-Zelle ein, Inhalt bleibt | 2×2 einfügen, alle 4 Zellen befüllen (`A1,B1/A2,B2`), Cursor in „B1" (Gate), „Spalte rechts einfügen" | erste **und** zweite `<tr>` `await expect(...).toHaveCount(3)` `<td>`; `A1`,`B1` an Position 1/2 unverändert, Position 3 in beiden Zeilen leer |
| 2 | Neue leere Zelle ist sofort tippbar (Abschnitt 3.5) | Fortsetzung #1: neue Zelle (Position 3) anklicken, `keyboard.type('Neu')` | Zelle enthält danach „Neu" (`toContainText`) |
| 3 | „Spalte links" fügt links der Cursor-Zelle ein | wie #1, Cursor in „B1", „Spalte links einfügen" | 3 `<td>` je Zeile; neue leere Zelle an Position 2 (zwischen A1 und B1), `A1` bleibt Position 1, `B1` rückt auf Position 3 |
| 4 | Grenzfall 4.3: Einfügen am linken Rand | Cursor erste Zelle, „Spalte links" | neue erste Spalte, ursprünglicher Inhalt der ersten Zelle unverändert (nur verschoben) |
| 5 | Grenzfall 4.3: Einfügen am rechten Rand | Cursor letzte Zelle, „Spalte rechts" | neue letzte Spalte, ursprünglicher Inhalt der letzten Zelle unverändert |
| 6 | Grenzfall 4.1: 1-spaltige Tabelle | reale Fixture mit 1-Spalten-Tabelle hochladen (falls in der Liste vorhanden; sonst als bewusst konstruierter Fall dokumentieren), Cursor in die einzige Spalte, „Spalte rechts" | Ergebnis 2×n, ursprünglicher Inhalt vollständig in der anderen Spalte |

### 2.3 Mehrfach-Zellauswahl und verschachtelte Tabelle (Abschnitt 3.3/3.9, Grenzfall 4.4/4.5, Abnahme 4/9)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Grenzfall 4.4: Mehrfachauswahl fügt genau **eine** Spalte ein | 2×2, Zellen 1+2 per echtem Maus-Drag markieren (`cells.nth(0).hover()`, `mouse.down()`, `cells.nth(1).hover()`, `mouse.up()`). **Sync-Gate:** `await expect(page.locator('.ProseMirror td.selectedCell')).toHaveCount(2)` (Regel 0.1-3). Dann „Spalte rechts einfügen" | erste `<tr>` danach `toHaveCount(3)` `<td>` (nicht 4) — bestätigt Entscheidung Codeplan 4.1 |
| 2 | Dieselbe Prüfung mit 3×3, mittlere+rechte Spalte markiert (konkreter Anforderungsfall) | 3×3 herstellen (2× „Spalte rechts" auf 2×2 vor der Markierung), mittlere+rechte Spalte Zeile 1 markieren (Sync-Gate `selectedCell`), „Spalte rechts" | Spaltenzahl 3 → **4** (nicht 5) |
| 3 | Grenzfall 4.5: verschachtelte Tabelle | äußere Tabelle einfügen, Cursor Zelle 1, erneut „Tabelle einfügen" (verschachtelt), Cursor in eine Zelle der **inneren** Tabelle (Sync-Gate `toBeEnabled`), „Spalte rechts" | innere Tabelle wächst 2 → **3** Zellen; äußere Tabelle unverändert **2** direkte Kind-`<td>`. **Hinweis:** verschachtelte `<table>`-Selektoren sind fragil — über `page.evaluate` mit direkter DOM-Traversierung (nur direkte `<td>`-Kinder der äußeren `<table>` zählen) robust lösen; Selektor vorab gegen echtes DOM verifizieren |

### 2.4 Undo/Redo (Abschnitt 3.8, Abnahme 8)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Ein Undo macht die komplette Einfügeaktion rückgängig | 2×2, Cursor Zelle 1 (Gate), „Spalte rechts einfügen", danach `editor.click()` (Fokus zurück in den Editor, **nicht** auf den Button) + `waitForTimeout(50)` (Regel 0.1-2) + `ControlOrMeta+z` | erste `<tr>` wieder `toHaveCount(2)` `<td>` |
| 2 | Redo stellt die neue Spalte wieder her | Fortsetzung #1, `ControlOrMeta+y` bzw. `ControlOrMeta+Shift+z` | erste `<tr>` wieder `toHaveCount(3)` `<td>` |
| 3 | Undo bei mehrzeiliger Tabelle wirkt auf **alle** Zeilen | reale Fixture mit ≥5 Zeilen (z. B. `BigTable.odt`, Zeilenzahl vorab prüfen) hochladen, Cursor in eine Zelle (Gate), „Spalte rechts", `editor.click()` + `waitForTimeout(50)` + `Strg+Z` | **alle** Zeilen gleichzeitig auf ursprüngliche Spaltenzahl zurückgesetzt |
| 4 | Undo nach Insert an Merge-Tabelle stellt Merge korrekt wieder her | reale Merge-Fixture (z. B. `TestTableCellAlign.docx` oder `feature_attributes_tables.odt`, Merge vorab per `readDocx`/`readOdt` bestätigt) hochladen, Spalte einfügen, `Strg+Z` (mit Sync-Pause) | Tabelle strukturell identisch zum Zustand direkt nach dem Import (Spaltenzahl, sichtbare Zellverbindungen) |

### 2.5 Selection-Sync-Regressionstest (Grenzfall 4.10, Abnahme 7)

**Erweiterung der bestehenden Datei** `tests/e2e/selection-regression.spec.ts`
(nicht neue Datei — Anforderung verlangt „dauerhaft Teil der Suite"; eine
separate, leicht vergessbare Datei widerspräche dem). Neuer Test im bestehenden
`describe`-Block, exakt Anforderung 3.7/Grenzfall 4.10 („Spalte einfügen → Klick
in andere Zelle → Enter/weitertippen → **kein** Datenverlust"), mit demselben
`waitForTimeout(50)`-Muster vor `Enter` wie die bestehenden Tests (Regel 0.1-2):

```ts
test('column insert + click-to-reposition + Enter + typing does not corrupt table content (Grenzfall 4.10)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()

  const cells = page.locator('.ProseMirror td')
  await cells.nth(0).click()
  await page.keyboard.type('Zelle A1')
  await cells.nth(3).click()
  await page.keyboard.type('Zelle B2')

  // Cursor in eine Zelle, Sync-Gate abwarten, dann einfügen.
  await cells.nth(0).click()
  const rightBtn = page.getByRole('button', { name: 'Spalte rechts einfügen' })
  await expect(rightBtn).toBeEnabled()
  await rightBtn.click()

  // Neue Zellzahl abwarten (Regel 0.1-4), dann in eine andere Zelle klicken.
  await expect(page.locator('.ProseMirror tr').first().locator('td')).toHaveCount(3)
  await page.locator('.ProseMirror td').nth(3).click()
  await page.keyboard.press('End')
  await page.waitForTimeout(50) // async selectionchange muss landen (Regel 0.1-2)
  await page.keyboard.type(' weiter')

  await expect(editor).toContainText('Zelle A1')
  await expect(editor).toContainText('Zelle B2 weiter')
})
```

Muss dauerhaft im bestehenden `describe`-Block bleiben (analog zu den vorhandenen
Bold-/Cut-Varianten dieser Datei), damit der bereits mehrfach aufgetretene
async-selection-sync-Regress nicht unbemerkt zurückkehrt.

### 2.6 Rundreise — alle Pflicht-Szenarien aus Anforderung Abschnitt 5 (Abnahme 5/6)

Jedes Szenario prüft die **heruntergeladene Datei** (`download.path()` →
`fs.readFile` → `JSZip.loadAsync` → Ziel-XML: DOCX `word/document.xml`, ODT
`content.xml`), nicht nur, dass der Editor nach Re-Import „irgendwie richtig
aussieht". Download-Promise vor dem Export-Klick abonnieren (Regel 0.1-5).
Muster: `odt.spec.ts:64-72`/`182-207`, `docx.spec.ts:79-87`/`213-236`.

**5.1 DOCX — Erweiterung `tests/e2e/docx.spec.ts`**

| # | Szenario (Anforderung 5.1) | Ablauf | Assertion an der heruntergeladenen Datei |
|---|---|---|---|
| 1 | **5.1.1 Einfache Eigenrundreise** | `docxCard` „Neu erstellen", 2×2 einfügen, 4 Zellen befüllen, Cursor Spalte 2 (Gate), „Spalte rechts einfügen" (→3×2), „Exportieren" | `word/document.xml`: `<w:tblGrid>` mit genau **3** `<w:gridCol>`; jede `<w:tr>` genau **3** `<w:tc>`; Re-Import (`setInputFiles` der exportierten Bytes) zeigt 3 Spalten, Original-Inhalt in unveränderten Zellen, leere Zelle in der neuen Spalte |
| 2 | **5.1.2 Horizontaler Merge** | Merge-Fixture (`TestTableCellAlign.docx`, Merge vorab bestätigt) importieren, Spalte in **nicht** verbundener Nachbarspalte einfügen, exportieren | ursprünglicher `w:gridSpan` bleibt erhalten, neue Spalte separat (zusätzlicher `<w:gridCol>`, zusätzliche `<w:tc>` in nicht-gemergten Zeilen) |
| 3 | **5.1.3 Vertikaler Merge** | Fixture mit `rowspan`/`w:vMerge` (vorab bestätigt), Spalte links davon einfügen, exportieren | `w:vMerge`-Struktur nach Rundreise korrekt, beide betroffenen Zeilen konsistent |
| 4 | **5.1.4 Cross-Format** | ODT-Tabelle importieren, Spalte einfügen, als DOCX exportieren | Re-Import zeigt korrekte Spaltenanzahl, unverändert erhaltenen Original-Zellinhalt |
| 5 | **5.1.5 Reale Fremddatei** | `TestTableColumns.docx` (oder `deep-table-cell.docx`, Inhalt vorab prüfen) hochladen, Spalte einfügen, exportieren, erneut hochladen | sämtlicher ursprünglicher Zellinhalt erhalten, neue Spalte vorhanden, kein Absturz (Grenzfall 4.12/4.13) |

**5.2 ODT — Erweiterung `tests/e2e/odt.spec.ts`**

| # | Szenario (Anforderung 5.2) | Ablauf | Assertion an der heruntergeladenen Datei |
|---|---|---|---|
| 1 | **5.2.1 Einfache Eigenrundreise** | analog DOCX #1 | `content.xml` enthält genau **3** `<table:table-column/>`; jede `<table:table-row>` genau 3 `table-cell`/`covered-table-cell`; Re-Import zeigt 3 Spalten, Original-Inhalt erhalten (dieser Test hält das **bereits korrekte** Verhalten fest — Regressionsschutz, kein Bugfix-Nachweis) |
| 2 | **5.2.2 Horizontaler Merge** | Fixture mit `table:number-columns-spanned` (`feature_attributes_tables.odt`, vorab bestätigt) importieren, Spalte einfügen, exportieren | `<table:table-column/>`-Anzahl = Summe der spannweiten-gewichteten Zellen der ersten Zeile; verbundene Zeile deklariert korrekte `covered-table-cell`-Platzhalter |
| 3 | **5.2.3 Cross-Format** | DOCX-Tabelle importieren, Spalte einfügen, als ODT exportieren | Re-Import zeigt korrekte Struktur und unveränderten Original-Inhalt |
| 4 | **5.2.4 Reale Fremddatei + Reader-Verifikationspunkt (Anforderung 6.2 / Grenzfall 4.14)** | reale ODT mit vertikaler Verbindung (`rowspan` vorab per `readOdt` bestätigt; sonst `BigTable.odt`/`crazyTable.odt`) hochladen, **vor** dem Einfügen Spaltenzuordnung prüfen, Spalte einfügen, exportieren, erneut hochladen | ursprünglicher Zellinhalt vollständig erhalten, neue Spalte vorhanden, kein Absturz. **Ergebnis der `covered-table-cell`-Annahme dokumentieren:** bestätigt (kein Handlungsbedarf) **oder** als eigenständige Reader-Abhängigkeit ticketiert — **nicht** als „Spalte-einfügen"-Fehler |

**5.3 Doppelte Rundreise / Cross-Format hin und zurück**

| # | Szenario | Ablauf | Assertion |
|---|---|---|---|
| 1 | Editor → ODT → Re-Import → DOCX | Tabelle erzeugen, Spalte einfügen, als ODT exportieren, re-importieren, als DOCX zurück-exportieren | Spaltenanzahl und Zellinhalt über beide Konvertierungen identisch (Formatierungsverluste bei Cross-Format akzeptabel laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19; Text-/Spaltenverlust nicht) |
| 2 | Editor → DOCX → Re-Import → ODT | spiegelbildlich | dieselbe Prüfung |

### 2.7 Sehr breite Tabelle (Grenzfall 4.7)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Wiederholtes „Spalte rechts" bleibt bedienbar | `pageerror`-Listener registrieren; 2×2, Cursor Zelle 1 (Gate), „Spalte rechts einfügen" 10× (vor jedem Klick `toBeEnabled()` abwarten) | erste `<tr>` `toHaveCount(12)` `<td>`, `pageerror`-Liste leer, letzte Zelle weiterhin klickbar/tippbar (`keyboard.type('noch bedienbar')` erscheint) |
| 2 | Gewählte Antwort auf Überbreite beobachtbar | Fortsetzung #1 | entsprechend Entscheidung Codeplan 4.2: horizontaler Scrollbalken am scrollenden Editor-Container beobachtbar, **keine** automatische Schrumpfung aller Spaltenbreiten — Test hält das beobachtete Verhalten fest, nicht nur „kein Crash" |

### 2.8 Kontextmenü — bewusste Nicht-Abdeckung (Abschnitt 2 Pkt 4)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Rechtsklick auf eine Zelle löst **kein** App-Kontextmenü aus | `cells.nth(0).click({ button: 'right' })` | kein anwendungseigenes Kontextmenü-DOM erscheint (nur das native Browser-Menü, das Playwright nicht rendert) — bestätigt als **bewusst nicht gebaut**, nicht als Lücke |

---

## 3. Zuordnung Anforderung → Test (Abnahme-Mapping)

| Anforderungs-/Codeplan-Abschnitt | Testebene(n) | Datei(en) |
|---|---|---|
| Abschnitt 2 Pkt 1–3 (Buttons existieren, `disabled`) | Unit + E2E | `commands.test.ts` #15, `tables.spec.ts` §2.1 |
| Abschnitt 2 Pkt 5 (Tastatur-Erreichbarkeit) | E2E | `tables.spec.ts` §2.1 #6 |
| Abschnitt 3.1/3.2 (Grundverhalten) | Unit + E2E | `commands.test.ts` #1/#2, `tables.spec.ts` §2.2 #1–3 |
| Grenzfall 4.1 (1-spaltige Tabelle) | Unit + E2E | `commands.test.ts` #3, `tables.spec.ts` §2.2 #6 |
| Grenzfall 4.3 (linker/rechter Rand) | Unit + E2E | `commands.test.ts` #4, `tables.spec.ts` §2.2 #4–5 |
| Abschnitt 3.3/Grenzfall 4.4 (Mehrfachauswahl) | Unit + E2E | `commands.test.ts` #7, `tables.spec.ts` §2.3 #1–2 |
| Abschnitt 3.4/Grenzfall 4.2 (Merges horiz./vert.) | Unit + E2E | `commands.test.ts` #5/#6, `tables.spec.ts` §2.6 5.1.2/5.1.3/5.2.2 |
| Abschnitt 3.5 (Inhalt neuer Zellen) | Unit + E2E | `commands.test.ts` #9, `tables.spec.ts` §2.2 #2 |
| Abschnitt 3.6 (Spaltenbreite, präzisierte Erwartung) | — | dokumentiert in Codeplan 3.4; kein separater Test (keine feste Breite zu prüfen) |
| Abschnitt 3.7/Grenzfall 4.10 (Selection-Sync-Regression) | E2E | `selection-regression.spec.ts` (erweitert), §2.5 |
| Abschnitt 3.8 (Undo/Redo) | Unit + E2E | `commands.test.ts` #11–14, `tables.spec.ts` §2.4 |
| Abschnitt 3.9/Grenzfall 4.5 (verschachtelte Tabelle) | Unit + E2E | `commands.test.ts` #8, `tables.spec.ts` §2.3 #3 |
| Abschnitt 6.1 (Merge-Export bereits korrekt, Regressionsschutz) | Unit | `odt/roundtrip.test.ts` §1.2, `docx/roundtrip.test.ts` §1.3 |
| Abschnitt 6.2 (ODT-Reader `covered-table-cell` bei Fremddatei) | Unit + E2E | §1.5, `tables.spec.ts`/`odt.spec.ts` §2.6 5.2.4 |
| Grenzfall 4.7 (sehr breite Tabelle) | Unit + E2E | `commands.test.ts` #17, `tables.spec.ts` §2.7 |
| Grenzfall 4.8 (Klick außerhalb Tabelle) | Unit + E2E | `commands.test.ts` #15, `tables.spec.ts` §2.1 #1/#4 |
| Grenzfall 4.9 (Undo/Redo inkl. Merge) | Unit + E2E | `commands.test.ts` #12, `tables.spec.ts` §2.4 #4 |
| Grenzfall 4.11 (mehrabsätzige Zelle) | Unit | `commands.test.ts` #10 |
| Grenzfall 4.12/4.13 (reale Fremddatei) | E2E | `docx.spec.ts`/`odt.spec.ts` §2.6 5.1.5/5.2.4 |
| Rundreise Abschnitt 5.1 (alle Testfälle) | E2E (echter Upload/Download) | `docx.spec.ts` §2.6 |
| Rundreise Abschnitt 5.2 (alle Testfälle) | E2E (echter Upload/Download) | `odt.spec.ts` §2.6 |
| Rundreise Abschnitt 5.3 (Doppel-/Cross-Format) | E2E | §2.6 5.3 |
| Cross-Format (schnelle Vorstufe, ohne Browser) | Unit | §1.4 |
| Abschnitt 2 Pkt 4 (Kontextmenü, bewusst nicht gebaut) | E2E | `tables.spec.ts` §2.8 |
| Grenzfall 4.15 (Touch: Mobile/Tablet) | E2E | gesamte `tables.spec.ts` läuft auf allen 3 Projekten (Regel 0.1-7) |

---

## 4. Abnahme-Checkliste (vor Statuswechsel „verifiziert"/„vorhanden")

- [ ] `npm test` grün, inkl. erweitertem `commands.test.ts` (§1.1),
      `odt/__tests__/roundtrip.test.ts` (§1.2) und
      `docx/__tests__/roundtrip.test.ts` (§1.3).
- [ ] `npm run test:e2e` grün auf **allen drei** Projekten (Desktop Chrome,
      Mobile/Pixel 7, Tablet/iPad Mini), inkl. neuem `tables.spec.ts`,
      erweitertem `selection-regression.spec.ts`, `docx.spec.ts`, `odt.spec.ts`.
- [ ] Alle E2E-Tests befolgen die Determinismus-Regeln aus Abschnitt 0.1
      (Sync-Gate `toBeEnabled()` nach Cursor-in-Zelle; `waitForTimeout(50)` vor
      `Enter`/Tippen nach nativer Caret-Bewegung; `selectedCell`-Gate vor
      Button-Klick bei Drag-Auswahl; `waitForEvent('download')` vor Export-Klick;
      `toHaveCount`/`toContainText` statt einmaligem `count()`). Kein blindes
      `waitForTimeout` als Ersatz für ein auto-retryendes Gate.
- [ ] Beide Toolbar-Buttons über echten Playwright-Klick bedienbar, außerhalb
      einer Tabelle sichtbar deaktiviert (Abnahme 1).
- [ ] Grundverhalten (3.1/3.2) inkl. Position der neuen Spalte relativ zur
      Cursor-Zelle per E2E nachgewiesen (Abnahme 2).
- [ ] Merge-Verhalten (3.4/4.2) mit konkretem Testfall (gemischt pro Zeile:
      `[1,3]` / `['A2','B2','','C2']`) belegt (Abnahme 3).
- [ ] Mehrfachauswahl-Abweichung (3.3/4.4) geprüft und als bewusst akzeptiertes
      v1-Verhalten bestätigt (Codeplan 4.1), nicht unentschieden offengelassen
      (Abnahme 4).
- [ ] **ODT-/DOCX-Export-Regressionstests grün** (§1.2/§1.3) — der Export ist
      bereits korrekt; **kein** „vor dem Fix rot"-Kriterium (Korrektur gegenüber
      dem früheren Entwurf). Bestehende `odt.spec.ts:207`/`docx.spec.ts:236`
      dürfen nicht brechen (Abnahme 5).
- [ ] **ODT-Reader-Verifikationspunkt** (Anforderung 6.2, §1.5/§2.6 5.2.4) mit
      realer LibreOffice-Fremddatei geprüft; Ergebnis **hier nachgetragen**:
      Annahme bestätigt **oder** als eigenständige Reader-Abhängigkeit
      ticketiert (nicht als „Spalte-einfügen"-Fehler) (Abnahme 6).
- [ ] Rundreise-Testfälle 5.1/5.2 (mind. Nr. 1–3 je Format) mit **echten**
      Datei-Uploads/Downloads bestanden — Prüfung an der heruntergeladenen Datei,
      nicht an intern aufgerufenen Reader/Writer-Funktionen (Abnahme 6).
- [ ] Selection-Sync-Regressionstest mit „Spalte einfügen" als Auslöser
      dauerhaft Teil von `selection-regression.spec.ts` (Abnahme 7).
- [ ] Undo/Redo inkl. korrekter Wiederherstellung von Merge-Zuständen als
      **ein** Schritt bestätigt (Abnahme 8).
- [ ] Verschachtelte-Tabelle-Grenzfall (4.5) mit echtem Testfall geprüft: kein
      Absturz, keine Verfälschung der äußeren Tabelle (Abnahme 9).
- [ ] Touch-Grundfall (4.15) auf „Mobile" und „Tablet" grün (Abnahme 10).
- [ ] Reale Fremddatei(en) DOCX **und** ODT importiert, Spalte eingefügt,
      exportiert, re-importiert — kein Absturz, Original-Inhalt vollständig
      erhalten (Grenzfall 4.12/4.13).
- [ ] Kein Test in `tables.spec.ts` bzw. den Erweiterungen von
      `selection-regression.spec.ts`/`docx.spec.ts`/`odt.spec.ts` importiert oder
      ruft `insertColumnBefore`/`insertColumnAfter`/`isInTable`/`readDocx`/
      `writeDocx`/`readOdt`/`writeOdt` direkt auf — per Review bestätigt.
- [ ] Kontextmenü bewusst als „nicht gebaut" bestätigt (§2.8).
- [ ] Entscheidung zu sehr breiten Tabellen (4.7, horizontales Scrollen statt
      Schrumpfung) beobachtet und bestätigt, nicht nur „kein Absturz" geprüft.
- [ ] Kein während der Verifikation gefundener Fehler bleibt ohne Ticket/Vermerk
      (Abnahme 11).
