# Testplan „Spalte einfügen (links/rechts)" — QA-Verifikation

Gegenstück zu `specs/spalte-einfuegen-req.md` (Anforderung) und
`specs/spalte-einfuegen-code.md` (Umsetzungsplan). Dieses Dokument legt fest,
**welche Tests** geschrieben werden, **wo** sie liegen, **wie** sie ausgeführt
werden und **wann** ein Punkt als abgehakt gilt. Zwei Ebenen, die sich
ergänzen, aber **keine ersetzen darf** — Anforderung Abschnitt 8 verlangt dies
ausdrücklich, weil der Ausgangsstatus „fehlt" ist und **keine einzige**
Codezeile für dieses Feature existiert:

1. **Unit-Tests** (Vitest, `jsdom`) für die Befehls-Logik
   (`insertColumnBefore`/`insertColumnAfter` gegen eine echte `EditorView` +
   echtes `prosemirror-tables`) sowie für die Reader/Writer-Rundreise auf
   Daten-/XML-Ebene — schnell, präzise, aber **blind gegenüber** Toolbar,
   Button-Zustand (`disabled`), echter Tastatur-/Maus-Bedienung und dem
   tatsächlichen Datei-Dialog.
2. **Echte Playwright-Browser-Tests** — Klicks auf die tatsächlichen
   Toolbar-Buttons „Spalte links einfügen"/„Spalte rechts einfügen", echte
   Zellauswahl per Maus-Drag, echter `setInputFiles()`-Upload, echter
   `page.waitForEvent('download')`-Export, Prüfung der **tatsächlich
   heruntergeladenen Datei** (nicht nur ein interner Aufruf von
   `readDocx`/`readOdt`/`writeDocx`/`writeOdt`/`insertColumnBefore`/
   `insertColumnAfter`). Das ist die einzige Ebene, die beweisen kann, dass die
   Buttons überhaupt existieren, sichtbar (de)aktiviert sind und im echten
   Editor wirken — Kern des Verifikationsauftrags in Anforderung Abschnitt 8.

Besonderheit dieser Anforderung gegenüber Fett/Kursiv/Ausrichtung: Es handelt
sich um ein **komplett neues** Feature (kein Bugfix eines vorhandenen), das
sich laut Codeplan größtenteils auf bereits korrekte, ungenutzte
Bibliotheksfunktionen (`addColumnBefore`/`addColumnAfter` aus
`prosemirror-tables`) stützt — und um einen **vorbestehenden, unabhängigen
Fehler** (ODT-`colCount`), der durch dieses Feature zum Alltagsfall wird und
dessen Fix Pflichtbestandteil der Abnahme ist (Anforderung Abschnitt 6,
Abnahmekriterium 5).

Referenzierte reale Fixture-Dateien (alle bereits im Repo vorhanden,
`ls`-geprüft, keine neuen zu beschaffen):
`tests/fixtures/external/docx/TestTableColumns.docx`,
`tests/fixtures/external/docx/deep-table-cell.docx`,
`tests/fixtures/external/docx/TestTableCellAlign.docx`,
`tests/fixtures/external/odt/BigTable.odt`,
`tests/fixtures/external/odt/TestTextTable.odt`,
`tests/fixtures/external/odt/crazyTable.odt`,
`tests/fixtures/external/odt/feature_attributes_tables.odt`,
`tests/fixtures/external/odt/TableWidth.odt`,
`tests/fixtures/external/odt/FrameWithTable.odt`.
Vor Verwendung ist mit jeder Datei kurz zu prüfen (per `readDocx`/`readOdt` im
Node-REPL o. ä.), ob sie tatsächlich einen Merge (`colspan`/`gridSpan`/
`number-columns-spanned`) enthält bzw. eine verschachtelte Tabelle — die Namen
allein garantieren das nicht; wo eine Datei die benötigte Struktur nicht
enthält, ersatzweise `tests/fixtures/external/docx/Bug54771a.docx`/
`Bug54771b.docx` bzw. eine weitere Tabellen-Fixture aus der obigen Liste in
`tests/fixtures/external/{docx,odt}/` heranziehen.

---

## 0. Ausführung und Reihenfolge

| Ebene | Befehl | Neue/geänderte Dateien |
|---|---|---|
| Unit | `npm test` (`vitest run`) | siehe Abschnitt 1 |
| Browser/E2E | `npm run test:e2e` (`playwright test`) | siehe Abschnitt 2 |

Reihenfolge (deckt sich mit `spalte-einfuegen-code.md` Abschnitt 5/6): zuerst
die Umsetzung aus dem Codeplan durchführen (`commands.ts` Re-Exports,
`Toolbar.tsx` neue Buttons/Icons, `odt/writer.ts`-Fix), **dann**
`commands.test.ts` (Abschnitt 1.1 hier) als erste Probe — dieser Test kann
gegen den reinen Befehl bereits ohne UI grün werden, sobald die Re-Exports
existieren. **Dann** die Writer-Tests (Abschnitt 1.2/1.3), **dann** die
E2E-Suite (Abschnitt 2), die als einzige Ebene beweist, dass die Buttons in
der Toolbar tatsächlich sichtbar/bedienbar sind. Vor jeglicher Umsetzung
laufen alle unten aufgeführten Tests erwartungsgemäß **rot** (keine Buttons,
keine Re-Exports, ODT-Fehler unbehoben) — das ist beabsichtigt, kein
Testfehler, und der Beleg dafür, dass der Backlog-Status „fehlt" zutrifft
(Anforderung Abschnitt 0).

Beide Suiten müssen grün sein, bevor „Spalte einfügen" laut Anforderung
Abschnitt 10 (Abnahmekriterien) als „verifiziert"/„vorhanden" gelten darf.

---

## 1. Unit-Tests: Befehls-Logik + Reader/Writer-Rundreise (DOCX + ODT)

### 1.1 Neu: `src/formats/shared/editor/__tests__/commands.test.ts`

Einzige Ebene, die `insertColumnBefore`/`insertColumnAfter` direkt gegen eine
echte `EditorView` mit derselben `dispatchTransaction`-Verdrahtung wie
`WordEditor.tsx` prüft (Muster: `ausrichtung-links-code.md` Abschnitt 6.1 /
`spalte-einfuegen-code.md` Abschnitt 6.1 — hier zu **Testfällen** ausgebaut,
nicht nur als Codeskizze). Kein bestehendes Muster für ProseMirror-Command-
Tests unter `editor/__tests__/` vorhanden (nur `pagination.test.ts`) — neu zu
etablieren.

Gemeinsame Hilfsfunktionen (`cell()`, `makeView()`, `selectText()`, plus eine
`selectCellRange()`-Hilfsfunktion über `cellAround`/`CellSelection` aus
`prosemirror-tables`, analog zur bereits im Codeplan Abschnitt 6.1 skizzierten
Reproduktion) an den Dateikopf.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | **Grundverhalten „rechts"** (Abschnitt 3.1/3.2) | 2×2-Tabelle mit Inhalt `A1,B1/A2,B2`, Cursor in „B1", `insertColumnAfter` | 3 Spalten je Zeile; neue, leere Zelle an Position 3 in **beiden** Zeilen; `A1,B1,A2,B2` unverändert an Position 1/2 | Abschnitt 3.1/3.2 |
| 2 | **Grundverhalten „links"** | dieselbe Tabelle, Cursor in „A1", `insertColumnBefore` | neue, leere Zelle als **erste** Spalte in beiden Zeilen; `A1,B1,A2,B2` rücken je eine Position nach rechts, Inhalt identisch | Abschnitt 3.1 |
| 3 | **Grenzfall 4.1** (1-spaltige Tabelle) | 1×2-Tabelle (`A1`/`A2`), `insertColumnBefore` **und** separat `insertColumnAfter` | Ergebnis je 2×2-Tabelle; ursprünglicher Inhalt vollständig in der jeweils anderen Spalte, neue Spalte leer | Grenzfall 4.1 |
| 4 | **Grenzfall 4.3** (linker/rechter Rand) | 1. Cursor in erster Spalte, `insertColumnBefore`; 2. Cursor in letzter Spalte, `insertColumnAfter` | je eine neue erste bzw. letzte Spalte, Cursor-Zellinhalt unverändert (nur Position verschoben) | Grenzfall 4.3, Abschnitt 3.2 |
| 5 | **Grenzfall 4.2** (gemischte Merges) | 3-Spalten-Tabelle: Zeile 1 = `[A1(colspan1), Merged(colspan2, Spalte 2–3)]`, Zeile 2 = `[A2,B2,C2]` (alle colspan1); Cursor in „B2", `insertColumnAfter` | Zeile 1: 2 Zellen, `colspan`-Array `[1,3]` (Merge von 2 auf 3 gewachsen, **keine** neue Zelle in Zeile 1); Zeile 2: 4 Zellen, Text-Array `['A2','B2','','C2']` (echte neue leere Zelle) — **beide Effekte in derselben Aktion** | Abschnitt 3.4, Grenzfall 4.2, Abnahmekriterium 3 |
| 6 | **Grenzfall 4.2, vertikal** (`rowspan`) | Tabelle mit `rowspan:2`-Zelle über Zeile 1–2 in Spalte 1, `insertColumnBefore` links davon | beide von der `rowspan`-Zelle überdeckten Zeilen bekommen konsistent je eine neue Zelle bzw. eine erweiterte Merge-Zelle (je nach genauer Anordnung); `rowspan`-Wert selbst unverändert | Abschnitt 3.4, letzter Absatz |
| 7 | **Grenzfall 4.4** (Mehrfachauswahl) | 3×3-Tabelle, `CellSelection` via `cellAround` über mittlere+rechte Spalte (Zeile 1), `insertColumnAfter` | Spaltenzahl wächst von 3 auf **4**, nicht auf 5 — **eine** Spalte pro Aufruf, unabhängig von Selektionsbreite (Entscheidung Codeplan Abschnitt 4.1) | Grenzfall 4.4, Abnahmekriterium 4 |
| 8 | **Grenzfall 4.5** (verschachtelte Tabelle) | äußere 1×2-Tabelle, in Zelle 1 eine innere 1×2-Tabelle, Cursor im Text der inneren Tabelle, `insertColumnAfter` | äußere Zeile bleibt bei **2** Zellen (unverändert); innere Zeile wächst von 2 auf **3** Zellen | Grenzfall 4.5, Abnahmekriterium 9 |
| 9 | **Inhalt neuer Zellen** (Abschnitt 3.5) | beliebige Tabelle, Insert ausführen | neue Zelle enthält genau einen leeren `paragraph`-Knoten (nicht `null`/kein Inhalt), kein Inhalt aus Nachbarzellen kopiert | Abschnitt 3.5 |
| 10 | **Grenzfall 4.11** (mehrabsätzige Zelle) | Zelle mit zwei `paragraph`-Kindern an der Einfügeposition, Insert einer Nachbarspalte | beide Absätze der mehrabsätzigen Zelle unverändert (Reihenfolge, Text, Anzahl) | Grenzfall 4.11 |
| 11 | **Undo — einfach** (Abschnitt 3.8) | 2×2-Tabelle, `insertColumnAfter`, dann `undo()` | Zeilen-/Zellstruktur exakt wie vor dem Insert (Spaltenzahl, Inhalt) | Abschnitt 3.8, Abnahmekriterium 8 |
| 12 | **Undo — mit Merge** | Aufbau wie Testfall 5, `insertColumnAfter`, dann `undo()` | Zeile 1 wieder `colspan`-Array `[1,2]`, Zeile 2 wieder 3 Zellen mit Original-Text — **inklusive** korrekt wiederhergestelltem Merge-Zustand | Abschnitt 3.8, Grenzfall 4.9, Abnahmekriterium 8 |
| 13 | **Redo** | Fortsetzung von Testfall 11, `redo()` | neue Spalte wieder vorhanden, identisch zum Zustand direkt nach dem ursprünglichen Insert | Abschnitt 3.8 |
| 14 | **Ein Klick = ein Undo-Schritt bei mehrzeiliger Tabelle** | 5-zeilige Tabelle (mehr als 2 Zeilen), `insertColumnAfter`, ein einziges `undo()` | **alle** 5 Zeilen gleichzeitig zurückgesetzt, nicht nur eine — belegt „genau eine Transaktion" auch jenseits des 2×2-Falls | Abschnitt 3.8, erster Absatz |
| 15 | **Deaktiviert außerhalb einer Tabelle** (Abschnitt 2 Punkt 3) | Dokument ohne Tabelle, Cursor im Absatz | `isInTable(view.state) === false`; `insertColumnBefore(view.state, view.dispatch)` liefert `false`, **kein** Dispatch, Dokument-Objektidentität unverändert | Abschnitt 2 Punkt 3, Grenzfall 4.8 |
| 16 | **`table_header`-Absicherung** (Zusatzfund Codeplan Abschnitt 2) | Tabelle ausschließlich über `insertTable`/Reader erzeugt, `insertColumnBefore`/`-After` mehrfach angewendet | alle Zell-Knotentypen bleiben `table_cell`, **niemals** `table_header` (Regressionsschutz für den Fall künftigen Kopfzeilen-Supports) | Codeplan Abschnitt 2, Zusatzfund |
| 17 | **Sehr breite Tabelle, keine Exception** (Grenzfall 4.7) | 2×2-Tabelle, `insertColumnAfter` 10× in Folge aufgerufen | 12 Spalten je Zeile, kein Throw, letzte Zelle weiterhin über `createAndFill()` befüllbar | Grenzfall 4.7 |

### 1.2 Geändert: `src/formats/odt/__tests__/roundtrip.test.ts` — Pflicht-Fix-Nachweis (Anforderung Abschnitt 6)

Kernstück des gesamten Testplans neben 1.1 — die einzige Ebene, die den in
Anforderung Abschnitt 0/6 dokumentierten `colCount`-Fehler (`odt/writer.ts:88`,
`rows[0]?.content?.length` statt Colspan-Summe) unmittelbar sichtbar macht,
**auch ohne** dass „Spalte einfügen" selbst aufgerufen wird — der Fehler ist
vorbestehend und unabhängig von diesem Feature, wird aber durch dieses Feature
zum Alltagsfall (Anforderung Abschnitt 0, vorletzte Tabellenzeile).

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | **Abschnitt 6, Testfall 1**: Merge in Zeile 1, **ohne** Spalte-einfügen | Tabelle: `colspan:2`-Zelle + eine normale Zelle in Zeile 1 (2 Zellen, 3 tatsächliche Spalten), exportieren | exportiertes `content.xml` enthält genau **3** `<table:table-column/>`, nicht 2 (rohe Zellenzahl) | Anforderung Abschnitt 6, Testfall 1 — deckt den Fehler unmittelbar auf |
| 2 | **Abschnitt 6, Testfall 2**: dieselbe Tabelle plus zusätzliche Spalte | wie #1, zusätzlich eine dritte (simulierte, neu eingefügte) Zelle in Zeile 1 | `<table:table-column/>`-Anzahl ist **4**, korrekt fortgeschrieben | Anforderung Abschnitt 6, Testfall 2 |
| 3 | **Rundreise-Testfall 5.2.1**: Colspan-gewichtete Spaltenzahl bleibt bei Re-Import erhalten | Export aus #1 erneut mit `readOdt` importiert | resultierendes Dokument hat 3 tatsächliche Spalten (Summe der `colspan`-Werte in Zeile 1 ergibt 3), Zellinhalt unverändert | Rundreise 5.2.1 |
| 4 | **Rundreise-Testfall 5.2.2**: `table:number-columns-spanned="2"` plus zusätzliche Spalte | ODT mit `number-columns-spanned="2"`-Zelle hand- oder reader-seitig konstruiert, plus eine weitere Spalte | exportierte `<table:table-column/>`-Anzahl entspricht Summe aller spannweiten-gewichteten Zellen der ersten Zeile | Rundreise 5.2.2, Abschnitt 6 Testfall 3 (Regressionstest) |
| 5 | **Regressionsschutz**: bestehende Merge-Rundreise-Tests bleiben grün | bestehende `it.each`/Merge-Testfälle dieser Datei (Anforderung Abschnitt 6 Testfall 3 verlangt Erweiterung, nicht Ersetzung) | alle bisherigen Assertions weiterhin erfüllt, zusätzlich `<table:table-column>`-Anzahl neu geprüft | Anforderung Abschnitt 6, Testfall 3 |

### 1.3 Geändert: `src/formats/docx/__tests__/roundtrip.test.ts` — symmetrischer Regressionstest

DOCX-Writer ist laut Codeplan Abschnitt 2 bereits korrekt — dieser Test sichert
das nur regressionsfest ab, damit beide Formate symmetrisch gegen dieselbe
Fehlerklasse geprüft sind (Anforderung Abschnitt 5.1.1, „mit einem
unabhängigen Parser verifizieren").

| # | Testfall | Eingabe | Erwartung |
|---|---|---|---|
| 1 | Colspan-gewichtete `<w:gridCol>`-Anzahl | Tabelle mit `colspan:2`-Zelle + normaler Zelle in Zeile 1 exportiert | `word/document.xml` enthält genau 3 `<w:gridCol .../>` |
| 2 | Jede `<w:tr>` hat die richtige Anzahl `<w:tc>` nach Insert einer simulierten Spalte | wie #1, plus dritte Zelle in Zeile 1 | 3 `<w:gridCol>`, jede `<w:tr>` genau 3 `<w:tc>` |
| 3 | `w:vMerge`/`w:gridSpan` bleiben nach Rundreise korrekt (Rundreise 5.1.3) | Tabelle mit `rowspan:2`-Zelle, Spalte links davon simuliert eingefügt, Export → Re-Import | `w:vMerge`-Struktur unverändert korrekt, Spaltenzahl konsistent |

### 1.4 Ergänzung: Cross-Format-Unit-Tests (Rundreise 5.1.4/5.2.3, ohne Browser)

In den bestehenden Cross-Format-Blöcken (falls vorhanden, sonst neu
anzulegen) je ein Testfall pro Richtung: ODT-Tabellen-JSON (mit simulierter
neuer Spalte) über `writeDocx` exportieren und umgekehrt — prüft, dass die
`colCount`-Berechnung in beiden Writern nach dem Fix aus 1.2 konsistent
bleibt, unabhängig vom Ursprungsformat. Nicht Ersatz für die echten
Browser-Cross-Format-Tests in Abschnitt 2.6 unten, sondern schnelle
Vorstufe.

---

## 2. Echte Playwright-Browser-Tests

**Grundregel dieser Ebene:** Jeder Test bedient die Anwendung ausschließlich
so, wie eine Person es täte — `page.getByRole('button', { name: ... }).click()`,
`page.keyboard.type(...)`/`.press(...)`, Maus-Drag für Mehrfachauswahl,
`input.setInputFiles(...)` für Uploads, `page.waitForEvent('download')` +
Lesen der heruntergeladenen Datei vom Datenträger für Exporte. **Kein Test in
diesem Abschnitt darf** `insertColumnBefore`/`insertColumnAfter`/`isInTable`/
`readDocx`/`writeDocx`/`readOdt`/`writeOdt` direkt importieren oder
aufrufen — das wäre Ebene 1, nicht Ebene 2. Die Toolbar-Buttons heißen
laut Codeplan Abschnitt 5.2 exakt `"Spalte links einfügen"` und
`"Spalte rechts einfügen"` (identisch als `title` **und** `aria-label`,
Anforderung Abschnitt 2 Punkt 1/2) — beide Locator-Formen
(`getByRole('button', { name: ... })`, `getByTitle(...)`, `getByLabel(...)`)
müssen denselben Button treffen.

### 2.0 Neue Datei: `tests/e2e/tables.spec.ts`

Struktur/Locator-Helfer identisch zu den bestehenden Dateien:

```ts
function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
```

`beforeEach`: `page.goto('/')` → `page.getByRole('button', { name: /verstanden/i }).click()`
→ `odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()` (Muster
aus `selection-regression.spec.ts`; ODT als Standard-Format für die
UI-Verhaltenstests, da die Rundreise-Prüfungen selbst getrennt in Abschnitt
2.6 sowohl DOCX als auch ODT abdecken).

### 2.1 Toolbar-Buttons: Existenz und Aktiv-/Deaktiviert-Zustand (Abschnitt 2 Punkt 3, Abnahmekriterium 1)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Beide Buttons existieren und sind außerhalb einer Tabelle sichtbar, aber deaktiviert | frisches Dokument, Cursor im leeren Absatz (kein Klick auf „Tabelle einfügen") | `getByRole('button', { name: 'Spalte links einfügen' })` und `... 'Spalte rechts einfügen' ...` sind `toBeVisible()` **und** `toBeDisabled()` |
| 2 | Buttons werden aktiv, sobald der Cursor in eine Tabelle wechselt | `getByRole('button', { name: 'Tabelle einfügen' }).click()`, dann `.ProseMirror td` (erste Zelle) anklicken | beide Buttons `toBeEnabled()` |
| 3 | Buttons werden wieder deaktiviert, sobald der Cursor die Tabelle verlässt | wie #2, danach Cursor per Klick in einen Absatz außerhalb der Tabelle setzen | beide Buttons wieder `toBeDisabled()` |
| 4 | Klick auf einen deaktivierten Button hat keine Wirkung | Button deaktiviert (Zustand wie #1), `.click({ force: true })` versuchen | kein Fehler, Editor-Inhalt/Struktur unverändert (Playwright verweigert echten Klick auf `disabled`-Element ohnehin; `force: true` bestätigt zusätzlich, dass selbst ein erzwungener Klick keine Tabellenänderung auslöst) — Grenzfall 4.8 |
| 5 | `aria-label` konsistent mit `title` | Cursor in einer Tabelle | `page.getByTitle('Spalte links einfügen')` und `page.getByLabel('Spalte links einfügen')` referenzieren denselben Button (Element-Handle-Vergleich); analog für „rechts" | Anforderung Abschnitt 2 Punkt 1 |
| 6 | Tastatur-Erreichbarkeit (Abschnitt 2 Punkt 5) | Cursor in Tabelle, `Tab`-Taste wiederholt drücken bis Fokus auf „Spalte rechts einfügen", dann `Enter` bzw. separat `Space` | Spalte wird eingefügt, identisch zum Maus-Klick (Ergebnis: 3 Zellen je Zeile bei 2×2-Start) | Abschnitt 2 Punkt 5 |

### 2.2 Grundverhalten (Abschnitt 3.1/3.2, Abnahmekriterium 2)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | „Spalte rechts" fügt unmittelbar rechts der Cursor-Zelle ein, Inhalt bleibt erhalten | 2×2-Tabelle einfügen, alle 4 Zellen befüllen (`A1,B1/A2,B2`), Cursor in „B1", `getByRole('button', { name: 'Spalte rechts einfügen' }).click()` | erste **und** zweite `<tr>` haben je 3 `<td>`; `A1`,`B1` an Position 1/2 unverändert, Position 3 in beiden Zeilen leer |
| 2 | Neue, leere Zelle ist sofort tippbar (Abschnitt 3.5) | Fortsetzung #1 | Klick auf die neue Zelle, `page.keyboard.type('Neu')`, Zelle enthält danach „Neu" |
| 3 | „Spalte links" fügt unmittelbar links der Cursor-Zelle ein | wie #1, aber Cursor in „B1", `getByRole('button', { name: 'Spalte links einfügen' }).click()` | 3 Zellen je Zeile; neue leere Zelle an Position 2 (zwischen A1 und B1), `A1` bleibt an Position 1, `B1` rückt auf Position 3 |
| 4 | **Grenzfall 4.3**: Einfügen ganz am linken Rand | Cursor in erster Zelle (Position 1), „Spalte links" | neue erste Spalte, ursprünglicher Inhalt der ersten Zelle unverändert, nur um eine Position verschoben |
| 5 | **Grenzfall 4.3**: Einfügen ganz am rechten Rand | Cursor in letzter Zelle, „Spalte rechts" | neue letzte Spalte, ursprünglicher Inhalt der letzten Zelle an ursprünglicher Position unverändert |
| 6 | **Grenzfall 4.1**: 1-spaltige Tabelle | Tabelle mit nur einer Spalte herstellen (z. B. „Spalte links" zweimal anwenden und die überflüssige Spalte ignorieren, oder direkt über eine reale Fixture mit 1-Spalten-Tabelle, falls vorhanden — sonst als bewusst konstruierter Fall dokumentieren) | Ergebnis 2×n, ursprünglicher Inhalt vollständig in der jeweils anderen Spalte |

### 2.3 Mehrfach-Zellauswahl und verschachtelte Tabelle (Abschnitt 3.3/3.9, Grenzfall 4.4/4.5, Abnahmekriterium 4/9)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | **Grenzfall 4.4**: Mehrfachauswahl über mehrere Spalten fügt genau **eine** Spalte ein | 2×2-Tabelle, Zellen 1 und 2 per Maus-Drag markieren (`cells.nth(0).hover()`, `page.mouse.down()`, `cells.nth(1).hover()`, `page.mouse.up()` — echte Browser-`CellSelection`, kein `CellSelection`-Objekt aus dem Code konstruiert), `getByRole('button', { name: 'Spalte rechts einfügen' }).click()` | erste `<tr>` hat danach **3** `<td>` (nicht 4) — bestätigt Entscheidung Codeplan Abschnitt 4.1 |
| 2 | Dieselbe Prüfung mit 3×3-Tabelle, mittlere+rechte Spalte markiert (konkreter Testfall aus Grenzfall 4.4 der Anforderung) | 3×3 herstellen (zweimal „Spalte rechts" auf eine 2×2-Basistabelle anwenden, bevor die eigentliche Markierung erfolgt), Zellen der mittleren+rechten Spalte in Zeile 1 markieren, „Spalte rechts" | Spaltenzahl wächst von 3 auf **4**, nicht auf 5 |
| 3 | **Grenzfall 4.5**: verschachtelte Tabelle | äußere Tabelle einfügen, Cursor in Zelle 1, erneut „Tabelle einfügen" (verschachtelt sich in die Zelle), Cursor in eine Zelle der **inneren** Tabelle, „Spalte rechts" | äußere Tabelle bleibt strukturell/inhaltlich unverändert (weiterhin 2 `<td>` in der äußeren `<tr>`, geprüft über einen Selektor, der explizit nur direkte Kind-`<td>` der äußeren `<table>` zählt); innere Tabelle wächst von 2 auf 3 Zellen. **Hinweis:** Der Selektor für „äußere vs. innere Tabelle" ist vor Implementierung gegen das tatsächliche DOM zu verifizieren (verschachtelte `<table>`-Selektoren sind fragil) — ggf. über `page.evaluate` mit direkter DOM-Traversierung robuster lösen, analog Codeplan Abschnitt 6.4 Fußnote. |

### 2.4 Undo/Redo (Abschnitt 3.8, Abnahmekriterium 8)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Ein Undo macht die komplette Spalten-Einfügeaktion rückgängig | 2×2-Tabelle, Cursor in Zelle 1, „Spalte rechts einfügen" klicken, danach `editor.click()` (Fokus zurück in den Editor, nicht auf den Button) + `ControlOrMeta+z` | erste `<tr>` wieder bei 2 `<td>` (nicht nur teilweise zurückgesetzt) |
| 2 | Redo stellt die neue Spalte wieder her | Fortsetzung #1, `ControlOrMeta+y` bzw. `ControlOrMeta+Shift+z` | erste `<tr>` wieder bei 3 `<td>` |
| 3 | Undo bei mehrzeiliger Tabelle wirkt auf **alle** Zeilen gleichzeitig | 5-zeilige Tabelle (`insertTable` reicht nicht — mehrfach „Zeile"-Äquivalent nicht Teil dieses Scopes; stattdessen über eine reale Fixture mit ≥5 Zeilen wie `BigTable.odt` hochladen), Spalte einfügen, ein `Strg+Z` | **alle** Zeilen gleichzeitig auf ursprüngliche Spaltenzahl zurückgesetzt, nicht nur eine |
| 4 | Undo nach Insert an einer Merge-haltigen Tabelle stellt Merge korrekt wieder her | Tabelle mit einer über die Toolbar nicht direkt erzeugbaren Merge — stattdessen reale Fixture mit Merge hochladen (z. B. `TestTableCellAlign.docx` oder `feature_attributes_tables.odt`, je nach tatsächlichem Inhalt), Spalte einfügen, `Strg+Z` | Tabelle optisch/strukturell identisch zum Zustand direkt nach dem Import (Spaltenzahl, sichtbare Zellverbindungen) |

### 2.5 Selection-Sync-Regressionstest (Grenzfall 4.10, Abnahmekriterium 7)

**Erweiterung der bestehenden Datei** `tests/e2e/selection-regression.spec.ts`
(nicht neue, separate Datei — Anforderung verlangt „dauerhaft Teil der
Suite", eine zusätzliche, leicht vergessbare Datei widerspricht dem):

```ts
test('column insert followed by click-to-reposition + Enter + typing does not corrupt table content (Grenzfall 4.10)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
  const cells = page.locator('.ProseMirror td')
  await cells.nth(0).click()
  await page.keyboard.type('Zelle A1')
  await cells.nth(3).click()
  await page.keyboard.type('Zelle B2')

  await cells.nth(0).click()
  await page.getByRole('button', { name: 'Spalte rechts einfügen' }).click()

  await page.locator('.ProseMirror td').nth(3).click() // andere Zelle nach dem Insert
  await page.keyboard.press('End')
  await page.keyboard.type(' weiter')

  await expect(editor).toContainText('Zelle A1')
  await expect(editor).toContainText('Zelle B2 weiter')
})
```

Muss dauerhaft im bestehenden `describe`-Block bleiben (nicht später wieder
entfernt werden), analog zu den bereits vorhandenen Fett-Varianten dieser
Datei.

### 2.6 Rundreise — alle Pflicht-Szenarien aus Anforderung Abschnitt 5 (Abnahmekriterium 6)

Jedes Szenario prüft die **heruntergeladene Datei**
(`download.path()` → `fs.readFile` → `JSZip.loadAsync` → Ziel-XML lesen, für
DOCX `word/document.xml`, für ODT `content.xml`), nicht nur, dass der Editor
nach Re-Import „irgendwie richtig aussieht" — Anforderung Abschnitt 5
verlangt ausdrücklich echte Datei-Uploads/Downloads.

**5.1 DOCX — Erweiterung `tests/e2e/docx.spec.ts`**

| # | Szenario (Anforderung 5.1 Nr.) | Ablauf | Assertion an heruntergeladener Datei |
|---|---|---|---|
| 1 | **5.1.1 Einfache Eigenrundreise** | `docxCard` „Neu erstellen", 2×2-Tabelle einfügen, alle 4 Zellen befüllen, Cursor in Spalte 2, „Spalte rechts einfügen" klicken (→ 3×2), exportieren | `word/document.xml`: `<w:tblGrid>` enthält genau **3** `<w:gridCol>`; jede `<w:tr>` enthält genau **3** `<w:tc>`; re-importieren (`setInputFiles` mit der exportierten Datei bzw. zweiter `page`) zeigt 3 Spalten, Original-Inhalt in den unveränderten Zellen, leere Zelle in der neuen Spalte |
| 2 | **5.1.2 Mit horizontal verbundener Zelle** | Tabelle mit `colspan:2`-Zelle importieren (reale Fixture, z. B. `TestTableCellAlign.docx`, Inhalt vorab prüfen) oder über eine der App bereits bekannte Merge-Quelle, Spalte in nicht verbundener Nachbarspalte einfügen, exportieren | ursprünglicher `w:gridSpan` bleibt erhalten, neue Spalte separat sichtbar (zusätzlicher `<w:gridCol>`, zusätzliche `<w:tc>` in den nicht gemergten Zeilen) |
| 3 | **5.1.3 Mit vertikal verbundener Zelle** | Tabelle mit `rowspan:2`-Zelle (reale Fixture oder Vorbau via #2-Muster), Spalte links davon einfügen, exportieren | `w:vMerge`-Struktur nach Rundreise korrekt, beide betroffenen Zeilen konsistent (neue Zelle bzw. erweiterte Merge-Zelle je nach Position) |
| 4 | **5.1.4 Cross-Format** | ODT-Datei mit Tabelle importieren (`odtCard`), Format wechseln bzw. Editor-Inhalt erneut als DOCX exportieren (UI-Pfad wie in bestehenden Cross-Format-Tests), Spalte einfügen, als DOCX exportieren | Re-Import zeigt korrekte Spaltenanzahl, unverändert erhaltenen Original-Zellinhalt |
| 5 | **5.1.5 Reale Fremddatei** | `tests/fixtures/external/docx/TestTableColumns.docx` (oder `deep-table-cell.docx`, je nach tatsächlichem Inhalt — vorab prüfen) per `setInputFiles` hochladen, Spalte einfügen, exportieren, erneut hochladen | sämtlicher ursprünglicher Zellinhalt weiterhin vorhanden und unverändert, zusätzlich die neue Spalte vorhanden, kein Absturz (Grenzfall 4.12) |

**5.2 ODT — Erweiterung `tests/e2e/odt.spec.ts`**

| # | Szenario (Anforderung 5.2 Nr.) | Ablauf | Assertion an heruntergeladener Datei |
|---|---|---|---|
| 1 | **5.2.1 Einfache Eigenrundreise** | analog DOCX #1 | `content.xml` enthält genau **3** `<table:table-column/>` — **dieser Test deckt den Abschnitt-6-Fehler unmittelbar auf, sobald Zeile 1 einen Merge enthält, und muss grün sein, bevor „vorhanden" gesetzt werden darf** (Anforderung Abschnitt 5.2.1, wörtlich) |
| 2 | **5.2.2 Mit horizontal verbundener Zelle** | Tabelle mit `table:number-columns-spanned="2"`-Zelle (reale Fixture, z. B. `feature_attributes_tables.odt`, vorab prüfen) importieren, Spalte einfügen, exportieren | `<table:table-column/>`-Anzahl entspricht Summe aller spannweiten-gewichteten Zellen der ersten Zeile (konkreter Bugfix-Nachweis) |
| 3 | **5.2.3 Cross-Format** | DOCX-Tabelle importieren (`docxCard`), Spalte einfügen, als ODT exportieren | Re-Import zeigt korrekte Struktur und unveränderten Original-Inhalt |
| 4 | **5.2.4 Reale Fremddatei** | `tests/fixtures/external/odt/BigTable.odt` (oder `crazyTable.odt`/`TestTextTable.odt`, je nach tatsächlichem Inhalt — vorab prüfen) hochladen, Spalte einfügen, exportieren, erneut hochladen | ursprünglicher Zellinhalt vollständig erhalten, neue Spalte vorhanden, kein Absturz |

**5.3 Doppelte Rundreise / Cross-Format hin und zurück**

| # | Szenario | Ablauf | Assertion |
|---|---|---|---|
| 1 | Editor → ODT → Re-Import → DOCX | Tabelle im Editor erzeugen, Spalte einfügen, als ODT exportieren, re-importieren, als DOCX zurück-exportieren | Spaltenanzahl und Zellinhalt über beide Konvertierungen identisch (Formatierungsverluste bei Cross-Format akzeptabel laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19, Text-/Spaltenverlust nicht) |
| 2 | Editor → DOCX → Re-Import → ODT | spiegelbildlich | dieselbe Prüfung |

### 2.7 Sehr breite Tabelle (Grenzfall 4.7)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Wiederholtes Klicken auf „Spalte rechts" bleibt bedienbar | 2×2-Tabelle, Cursor in Zelle 1, „Spalte rechts einfügen" 10× in Folge klicken | 12 `<td>` in der ersten `<tr>`, keine Konsolenfehler (`pageerror`-Listener registriert und leer), letzte Zelle weiterhin klickbar/tippbar (`page.keyboard.type('noch bedienbar')` erscheint im Dokument) |
| 2 | Gewählte Antwort auf Überbreite ist beobachtbar | Fortsetzung #1 | entsprechend Entscheidung Codeplan Abschnitt 4.2: horizontaler Scrollbalken am Editor-Container sichtbar (`overflow-x`-Verhalten), **keine** automatische Schrumpfung aller Spaltenbreiten — Testfall hält das beobachtete Verhalten fest, nicht nur „kein Crash" |

### 2.8 Kontextmenü — bewusste Nicht-Abdeckung (Abschnitt 2 Punkt 4, Abnahmekriterium 10)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Rechtsklick auf eine Tabellenzelle löst **kein** Anwendungs-Kontextmenü aus | Cursor/Rechtsklick (`cells.nth(0).click({ button: 'right' })`) auf eine Zelle | kein anwendungseigenes Kontextmenü-DOM-Element erscheint (nur ggf. das native Browser-Kontextmenü, das Playwright nicht rendert) — bestätigt als **bewusst nicht gebautes** Verhalten, nicht als unentdeckte Lücke |

---

## 3. Zuordnung Anforderung → Test (Abnahme-Mapping)

| Anforderungs-/Codeplan-Abschnitt | Testebene(n) | Datei(en) |
|---|---|---|
| Abschnitt 2 Punkt 1–3 (Buttons existieren, `disabled`) | Unit + E2E | `commands.test.ts` #15, `tables.spec.ts` §2.1 |
| Abschnitt 2 Punkt 5 (Tastatur-Erreichbarkeit) | E2E | `tables.spec.ts` §2.1 #6 |
| Abschnitt 3.1/3.2 (Grundverhalten) | Unit + E2E | `commands.test.ts` #1/#2, `tables.spec.ts` §2.2 #1–3 |
| Grenzfall 4.1 (1-spaltige Tabelle) | Unit + E2E | `commands.test.ts` #3, `tables.spec.ts` §2.2 #6 |
| Grenzfall 4.3 (linker/rechter Rand) | Unit + E2E | `commands.test.ts` #4, `tables.spec.ts` §2.2 #4–5 |
| Abschnitt 3.3/Grenzfall 4.4 (Mehrfachauswahl) | Unit + E2E | `commands.test.ts` #7, `tables.spec.ts` §2.3 #1–2 |
| Abschnitt 3.4/Grenzfall 4.2 (Merges horizontal/vertikal) | Unit + E2E | `commands.test.ts` #5/#6, `tables.spec.ts` §2.6 5.1.2/5.1.3/5.2.2 |
| Abschnitt 3.5 (Inhalt neuer Zellen) | Unit + E2E | `commands.test.ts` #9, `tables.spec.ts` §2.2 #2 |
| Abschnitt 3.6 (Spaltenbreite, präzisierte Erwartung) | — | dokumentiert in `spalte-einfuegen-code.md` Abschnitt 3.4, kein separater Test verlangt (keine feste Breite zu prüfen) |
| Abschnitt 3.7/Grenzfall 4.10 (Selection-Sync-Regression) | E2E | `selection-regression.spec.ts` (erweitert), Abschnitt 2.5 hier |
| Abschnitt 3.8 (Undo/Redo) | Unit + E2E | `commands.test.ts` #11–14, `tables.spec.ts` §2.4 |
| Abschnitt 3.9/Grenzfall 4.5 (verschachtelte Tabelle) | Unit + E2E | `commands.test.ts` #8, `tables.spec.ts` §2.3 #3 |
| Abschnitt 6 (ODT-`colCount`-Fix) | Unit | `odt/__tests__/roundtrip.test.ts` §1.2, symmetrisch `docx/__tests__/roundtrip.test.ts` §1.3 |
| Grenzfall 4.7 (sehr breite Tabelle) | Unit + E2E | `commands.test.ts` #17, `tables.spec.ts` §2.7 |
| Grenzfall 4.8 (Klick außerhalb Tabelle) | Unit + E2E | `commands.test.ts` #15, `tables.spec.ts` §2.1 #1/#4 |
| Grenzfall 4.9 (Undo/Redo inkl. Merge) | Unit + E2E | `commands.test.ts` #12, `tables.spec.ts` §2.4 #4 |
| Grenzfall 4.11 (mehrabsätzige Zelle) | Unit | `commands.test.ts` #10 |
| Grenzfall 4.12 (reale Fremddatei, unregelmäßige Struktur) | E2E | `tables.spec.ts`/`docx.spec.ts`/`odt.spec.ts` §2.6 5.1.5/5.2.4 |
| Rundreise Abschnitt 5.1 (alle Testfälle) | E2E (echter Upload/Download) | `docx.spec.ts` §2.6 |
| Rundreise Abschnitt 5.2 (alle Testfälle) | E2E (echter Upload/Download) | `odt.spec.ts` §2.6 |
| Rundreise Abschnitt 5.3 (Doppel-/Cross-Format) | E2E | §2.6 5.3 hier |
| Abschnitt 2 Punkt 4 (Kontextmenü, bewusst nicht gebaut) | E2E | `tables.spec.ts` §2.8 |
| Abnahmekriterium 10 (kein Fund ohne Ticket) | Review | Abschnitt 4 hier (Checkliste) |

---

## 4. Abnahme-Checkliste (vor Statuswechsel „verifiziert"/„vorhanden")

- [ ] `npm test` grün, inkl. neuem `commands.test.ts`, erweitertem
      `odt/__tests__/roundtrip.test.ts` und `docx/__tests__/roundtrip.test.ts`.
- [ ] `npm run test:e2e` grün, inkl. neuem `tables.spec.ts`, erweitertem
      `selection-regression.spec.ts`, `docx.spec.ts`, `odt.spec.ts`.
- [ ] Beide Toolbar-Buttons sind über echten Playwright-Klick bedienbar,
      außerhalb einer Tabelle sichtbar deaktiviert (Abnahmekriterium 1).
- [ ] Grundverhalten (3.1/3.2) inklusive Position der neuen Spalte relativ
      zur Cursor-Zelle per E2E nachgewiesen (Abnahmekriterium 2).
- [ ] Merge-Verhalten (3.4/4.2) mit konkretem Testfall (unregelmäßige
      Merge-Struktur, gemischt pro Zeile) belegt (Abnahmekriterium 3).
- [ ] Mehrfachauswahl-Abweichung (3.3/4.4) geprüft und als bewusst
      akzeptiertes Verhalten bestätigt (Entscheidung Codeplan Abschnitt 4.1),
      nicht unentschieden offengelassen (Abnahmekriterium 4).
- [ ] ODT-`colCount`-Fix umgesetzt, mit eigenem Testfall abgesichert
      (Abschnitt 1.2 hier grün) und **vor** dem Fix nachweislich rot
      gelaufen — nicht nur nachträglich grün geschrieben, ohne den Fehler je
      gesehen zu haben (Review-Punkt, Abnahmekriterium 5).
- [ ] Rundreise-Testfälle 5.1/5.2 (mindestens Testfälle 1–3 je Format) mit
      echten Datei-Uploads/Downloads bestanden, nicht nur intern aufgerufenen
      Reader/Writer-Funktionen (Abnahmekriterium 6).
- [ ] Selection-Sync-Regressionstest mit „Spalte einfügen" als Auslöser
      dauerhaft Teil von `selection-regression.spec.ts` (Abnahmekriterium 7).
- [ ] Undo/Redo inklusive korrekter Wiederherstellung von Merge-Zuständen
      bestätigt (Abnahmekriterium 8).
- [ ] Verschachtelte-Tabelle-Grenzfall (4.5) mit echtem Testfall geprüft,
      kein Absturz, keine Verfälschung der äußeren Tabelle
      (Abnahmekriterium 9).
- [ ] Reale Fremddatei(en) (DOCX und ODT) mit Tabelle importiert, Spalte
      eingefügt, exportiert, re-importiert — kein Absturz, ursprünglicher
      Inhalt vollständig erhalten (Grenzfall 4.12).
- [ ] Kein Test in `tables.spec.ts` bzw. den Erweiterungen von
      `selection-regression.spec.ts`/`docx.spec.ts`/`odt.spec.ts` ruft
      `insertColumnBefore`/`insertColumnAfter`/`isInTable`/`readDocx`/
      `writeDocx`/`readOdt`/`writeOdt` direkt auf — stichprobenartig per
      Review bestätigt.
- [ ] Kontextmenü bewusst als „nicht gebaut" bestätigt (Abschnitt 2.8),
      nicht stillschweigend offengeblieben.
- [ ] Entscheidung zu sehr breiten Tabellen (Grenzfall 4.7, horizontales
      Scrollen statt Schrumpfung) beobachtet und bestätigt, nicht nur
      „kein Absturz" geprüft.
- [ ] Kein während der Verifikation gefundener Fehler bleibt ohne
      Ticket/Vermerk zurück (Abnahmekriterium 10).
