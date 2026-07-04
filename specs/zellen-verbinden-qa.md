# QA-Testplan: Feature „Zellen verbinden"

Rolle: QA-Antwort auf `specs/zellen-verbinden-req.md` (Anforderung) und
`specs/zellen-verbinden-code.md` (Entwicklerplan). Dieses Dokument nimmt **keinen**
der beiden Vorgängertexte als bewiesen an — `zellen-verbinden-code.md` ist laut
eigenem Titel ein *Plan* („Kein Punkt hier ist bereits umgesetzt"). Jede Behauptung
aus beiden Dokumenten wird hier auf einen konkreten, ausführbaren Testfall
abgebildet. Ergebnis ist ein Testplan, kein Testbericht — die hier aufgeführten
Tests sind zum Zeitpunkt dieses Dokuments **noch nicht geschrieben** (siehe
Abschnitt 6, Spalte „Erwarteter Status").

Stil/Gliederung orientiert an `ausrichtung-zentriert-qa.md` (Präzedenzfall für
dieses Repo).

---

## 0. Stichprobenprüfung des Ist-Codes (QA-Gegenkontrolle)

Bevor der Plan aufgestellt wird, wurden die zentralen Tatsachenbehauptungen aus
`zellen-verbinden-req.md` Abschnitt 1 und `zellen-verbinden-code.md` Abschnitt 0–2
direkt im aktuellen Code nachvollzogen (nicht nur aus den Dokumenten übernommen):

| Behauptung | QA-Gegenkontrolle | Ergebnis |
|---|---|---|
| Kein einziger Treffer für `mergeCells`/`splitCell`/`CellSelection`/`Verbinden`/`covered-table-cell` im gesamten `src/`-Baum | `grep -rn "mergeCells\|splitCell\|CellSelection\|Verbinden\|covered-table-cell" src/` | **Bestätigt: 0 Treffer.** Weder Button noch Command noch Wiring existiert — das Feature ist zu 100 % ungebaut, keine Teilimplementierung übersehen. |
| `prosemirror-tables@1.8.5` als installierte Version | `package.json:29` | **Bestätigt exakt.** Alle Zeilennummern-Zitate aus `zellen-verbinden-req.md`/`-code.md` gegen `dist/index.js` dieser Version sind damit potenziell verifizierbar (von QA hier nicht erneut Byte für Byte nachvollzogen, aber die Versionsübereinstimmung ist die Voraussetzung dafür). |
| `WordEditor.tsx`-Keymap kennt kein `Tab` | `grep -n "keymap(\|Mod-z\|Tab:" src/formats/shared/editor/WordEditor.tsx` → nur `Mod-z`, `keymap(baseKeymap)`, kein `Tab:` | **Bestätigt.** Fehler 5 aus dem Code-Plan (Tab-Navigation zwischen Zellen existiert **nicht**, nicht nur „nach Merge kaputt") ist damit unabhängig verifiziert — Menüpunkt 9/Testfall 11 setzen eine Baseline voraus, die real nicht existiert. |
| `⊞ Tabelle`-Button existiert bereits, `insertTable(2, 2)`, `aria-pressed={isInTable(view.state)}` | `src/formats/shared/editor/Toolbar.tsx:228–239` gelesen | **Bestätigt.** Dieser Button dient als einziger vorhandener Referenzpunkt für Selektoren/Platzierung des neuen „Zellen verbinden"-Buttons. |
| `MarkButton` setzt `title` **und** `aria-label` identisch (Zeile 47) | `Toolbar.tsx:44–48` gelesen | **Bestätigt.** Referenzmuster für Menüpunkt 5 — der neue Button muss diesem Muster folgen, nicht dem inkonsistenten `AlignButton`-Gegenbeispiel (siehe `ausrichtung-zentriert-qa.md` Abschnitt 0). |
| Reale Fixtures existieren wie behauptet: `mergedCells.odt`, `tableCoveredContent.odt`, `table-column-delete-with-merge.odt`, `table-column-delete-with-merge-2-times.odt`, `BigTable.odt`, `crazyTable.odt`, `subTables3-nested.odt`, `subTables4.odt` (ODT); `bug57031.docx`, `bug65649.docx`, `TestTableColumns.docx`, `TestTableCellAlign.docx`, `table-alignment.docx`, `deep-table-cell.docx` (DOCX) | Per `ls`/`Glob` in `tests/fixtures/external/{docx,odt}/` geprüft | **Alle vorhanden**, wie in beiden Vorgängerdokumenten behauptet. Keine zusätzliche externe Fixture-Beschaffung nötig — deckt sich mit Code-Plan Abschnitt 2.5. |
| „Datei hochladen"-Button löst echten Datei-Dialog auf verstecktem `<input type="file">` aus | `src/app/FormatPicker.tsx:62–89` gelesen | **Bestätigt.** `onClick={() => fileInputs.current[module.id]?.click()}` auf sichtbarem Button, `className="hidden"` auf dem eigentlichen Input — das ist der Ankerpunkt für den in Abschnitt 3.4 geforderten echten `filechooser`-Testpfad (nicht nur `setInputFiles`). |
| Bestehende E2E-Konventionen (`docxCard`/`odtCard`, `buildSampleDocx`, Download+JSZip-Prüfung) | `tests/e2e/docx.spec.ts:1–150` gelesen | **Bestätigt.** `table-merge.spec.ts` (Abschnitt 3) übernimmt exakt dieses Muster: `page.waitForEvent('download')` → `download.path()` → `fs.readFile` → `JSZip.loadAsync` → gezielte XML-Knoten prüfen (kein reines `.toContain`, siehe Abschnitt 3.5). |
| Playwright-Projekte: Desktop Chrome, Mobile (Pixel 7), Tablet (iPad Mini) | `playwright.config.ts` gelesen | **Bestätigt exakt.** Jeder neue Testfall muss in **allen drei** grün sein, sofern er nicht explizit auf reine Maus-Drag-Feinmotorik angewiesen ist (siehe Abschnitt 3.6, Sonderfall Maus-Drag auf Touch-Emulation). |
| Code-Plan Fehler 1 (kombinierter `colspan`+`rowspan`-Merge liefert nach DOCX-Rundreise `rowspan: 3` statt `2`) | Nicht durch eigene Codeausführung reproduziert (QA hat keine dedizierte Vitest-Reproduktion angelegt, siehe Vorbehalt unten) | **Als unverifizierte, aber plausible Behauptung übernommen** — der im Code-Plan Abschnitt 2.1 gezeigte Mechanismus (`anchors[c]`-Mehrfacheintrag bei `colspan > 1`, pro Fortsetzungszelle statt pro Fortsetzungszeile hochgezählt) ist im gelesenen Quellcode (`docx/reader.ts:210–256`) nachvollziehbar. **Muss als erster Pflichttest dieses Plans (DR1) unabhängig reproduziert werden**, bevor er als bestätigt gilt — QA übernimmt Entwicklerbehauptungen grundsätzlich nicht ungeprüft. |
| Code-Plan Fehler 2/3 (ODT-Export ohne `covered-table-cell`, falsche `colCount`) | `odt/writer.ts:86–109` gelesen, `covered-table-cell` kommt in der Datei nicht vor | **Struktur bestätigt** (kein `covered-table-cell` im Writer-Code), **Auswirkung noch nicht durch eigenen Test gegen die reale Fixture `tableCoveredContent.odt` verifiziert** — Pflichttest OR1/FO2 dieses Plans. |

**Wichtiger methodischer Vorbehalt:** Anders als `ausrichtung-zentriert-code.md`
(dort mit dediziert ausgeführten, danach entfernten Vitest-Reproduktionen belegt)
enthält `zellen-verbinden-code.md` ebenfalls Reproduktionsbehauptungen mit exakten
Vorher/Nachher-Werten (`rowspan: 3` statt `2` etc.). QA übernimmt diese **nicht**
als bereits erbracht, sondern führt sie in Abschnitt 2 als eigene, erste
auszuführende Testfälle (DR1, OR1–OR3, M6) erneut auf — das ist die gesamte
Existenzberechtigung dieses eigenständigen QA-Dokuments gegenüber dem Code-Plan.

---

## 1. Testumgebung

- Unit-Tests: `npm test` (Vitest, `jsdom`-Environment).
- E2E-Tests: `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `baseURL: 'http://localhost:4173/salamanido/'`, `webServer` baut (`npm run build`)
    und startet `vite preview` automatisch.
  - Drei Projekte: **Desktop Chrome**, **Mobile** (`Pixel 7`), **Tablet**
    (`iPad Mini`) — jeder neue Testfall muss in **allen drei** grün sein, mit der
    in Abschnitt 3.6 dokumentierten Ausnahme für feinmotorische Maus-Drag-Tests.
- Bestehende Konventionen (aus `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
  übernommen, in `table-merge.spec.ts` beizubehalten):
  - `page.goto('/')` → Privacy-Banner wegklicken: `page.getByRole('button', { name: /verstanden/i }).click()`.
  - Karten-Locator: `docxCard(page)`/`odtCard(page)` über
    `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: '...' }) })`.
  - Editor-Locator: `page.locator('.ProseMirror')`.
  - Tabelle einfügen: `page.getByTitle('⊞ Tabelle')`-Äquivalent — **Vorbehalt:**
    der bestehende Button hat laut `Toolbar.tsx:228–239` aktuell **kein** `title`-
    Attribut, nur sichtbaren Text `⊞ Tabelle`; Selektor daher vorläufig
    `page.getByRole('button', { name: '⊞ Tabelle' })`.
  - Export: `page.getByRole('button', { name: 'Exportieren' })` + `page.waitForEvent('download')`.
  - Datei-Upload zwei Varianten (siehe Abschnitt 3.4): schneller `input.setInputFiles(...)`
    auf `input[type="file"]` **und** mindestens ein Testfall pro Format über den
    echten sichtbaren „Datei hochladen"-Button + `page.waitForEvent('filechooser')`.
- **Selektor-Vorbehalt für den neuen Button (analog zum bereits bekannten Muster
  aus `ausrichtung-zentriert-qa.md` Abschnitt 1):** Der genaue `title`/`aria-label`-
  Text des „Zellen verbinden"-Buttons steht erst nach Umsetzung von
  `zellen-verbinden-code.md` Abschnitt 4.2 fest (dort vorgeschlagen: `title="Zellen
  verbinden"`, `aria-label="Zellen verbinden"`, sichtbarer Text `⊞ Verbinden`).
  Alle Testfälle in diesem Plan verwenden **testweise**
  `page.getByRole('button', { name: 'Zellen verbinden' })` (matcht sowohl `title`
  als auch `aria-label`, sofern React sie wie in `MarkButton` identisch setzt) —
  **muss vor der ersten Testausführung an der tatsächlich gebauten UI verifiziert
  werden** (siehe Abschnitt 9, offener Punkt).
- **CSS-Selektor für sichtbare Mehrzellen-Selektion:** `.ProseMirror .selectedCell`
  (Decoration-Klasse, laut Code-Plan Abschnitt 2.7 bereits **heute** aktiv, auch
  ohne UI — siehe T1).

---

## 2. Teil A — Unit-Tests (Reader/Writer-Rundreise DOCX + ODT, Command-Ebene)

**Zweck:** Schnelle, browserunabhängige Absicherung von drei getrennten Ebenen:
(A.1) der neue, geteilte `mergeSelectedCells`-Befehl selbst — inkl. des laut
Code-Plan „kritischsten Einzeltests" (`CellSelection`→Text-Cursor-Fix, Fehler 4),
(A.2) die Reader/Writer-Rundreise DOCX **und** ODT für `colspan`/`rowspan`
(Kernauftrag dieses QA-Dokuments, hier sitzen die beiden schwerwiegendsten
Fehler 1–3), sowie (A.3) reale, extern erzeugte Fixture-Dateien. Ein rotes
Toolbar-/Browser-Verhalten darf diese Unit-Tests nicht rot färben und umgekehrt.

### 2.1 Bestandsaufnahme (bereits vorhanden, als Basisschutz zu erhalten)

| Datei | Test | Deckt ab |
|---|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts:205–244` | „preserves merged cells (colspan)" / „… (rowspan)" | Reine Spalten- bzw. reine Zeilen-Merges, **nie kombiniert** — Writer→eigener-Reader, Zellen-JSON von Hand gebaut |
| `src/formats/odt/__tests__/roundtrip.test.ts:194–208` | „preserves merged cells (colspan/rowspan)" | Attribut-Prüfung nach Reimport auf **einer** Zelle, keine XML-Struktur-Prüfung auf `covered-table-cell` |

Diese Tests bleiben unverändert Teil der Suite; sie werden **nicht** ersetzt, nur
ergänzt — sie decken laut Anforderungsabschnitt 1 explizit **nicht** die
Kombination `colspan > 1` **und** `rowspan > 1` auf derselben Zelle ab (exakt die
Lücke, die Fehler 1 laut Code-Plan verdeckt hielt), und auch nie die tatsächliche
XML-Byte-Struktur des ODT-Exports.

### 2.2 Neue Datei: `src/formats/shared/editor/__tests__/table-merge-commands.test.ts`

Echte `EditorState`/`EditorView` in jsdom, **mit** `history()`-Plugin, `mergeCells`/
`CellSelection`/`isInTable` direkt aus `prosemirror-tables` importiert (kein Mock).

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status |
|---|---|---|---|---|
| M1 | Zwei horizontale Zellen verbinden | 2×2-Tabelle, `CellSelection` über Zelle (0,0)–(0,1) programmatisch setzen, `mergeSelectedCells()(state, dispatch)` | Resultierende Zelle `colspan: 2`, Textinhalte beider Zellen erhalten (deckt Testfall 2/3.1 auf Modellebene ab) | Blockiert bis `commands.ts` den Befehl exportiert (siehe Abschnitt 6) |
| M2 | Zwei vertikale Zellen (über `table_row`-Grenze) verbinden | `CellSelection` über Zelle (0,0)–(1,0) | `rowspan: 2` (Testfall 3) | Blockiert |
| M3 | 2×2-Rechteck verbinden | `CellSelection` über Zelle (0,0)–(1,1) | `colspan: 2` **und** `rowspan: 2` gleichzeitig (Testfall 4) | Blockiert |
| M4 | 2×3- und 3×3-Rechteck | Analog M3, größere Ausgangstabellen | Beide Attribute korrekt (Testfall 5) | Blockiert |
| M5 | Einzelzelle markiert (keine echte `CellSelection`, `$anchorCell.pos === $headCell.pos`) | `mergeSelectedCells()(state)` ohne `dispatch` (reine Prüfung) | Liefert `false`, kein `dispatch`-Aufruf (Testfall 9/3.7) | Blockiert |
| M6 | **Regressionstest Fehler 4 (kritischster Test dieser Datei laut Anforderung §7 Testfall 7)** | Zwei textgefüllte Zellen „AAA"/„BBB" per `mergeSelectedCells` verbinden, danach `view.dispatch(view.state.tr.insertText('X'))` auf dem resultierenden State aufrufen | Dokumenttext enthält weiterhin **beide** Originalinhalte **und** `X` angehängt (nicht nur `"X"`) | **ROT ohne den in Code-Plan §4.1 gezeigten Selektions-Fix** — mit dem reinen `prosemirror-tables`-`mergeCells`-Default (ohne App-Wrapper) liefert derselbe Test nachweislich nur `"X"`; muss von QA **vor** jeder Implementierung einmal explizit mit dem **unkorrigierten** `mergeCells` reproduziert werden (siehe unten „Vorstufe M6a") |
| M6a | Vorstufe zu M6: nackter `mergeCells` ohne App-Fix | Wie M6, aber `mergeCells(state, dispatch)` direkt aus `prosemirror-tables`, **ohne** den `mergeSelectedCells`-Wrapper | Nach `insertText('X')`: Dokumenttext ist nur `"X"` — **muss** so fehlschlagen, sonst ist die von `zellen-verbinden-code.md` Abschnitt 2.4 behauptete Bibliotheks-Falle nicht real und der gesamte Fix wäre unnötig | Ausführbar **heute schon**, unabhängig von jeglicher App-Implementierung (reiner `prosemirror-tables`-Test) — **muss als erster Testfall dieses Plans laufen**, bevor irgendetwas gefixt wird |
| M7 | Resultierende Selektion nach Merge ist `TextSelection`, keine `CellSelection` mehr | Direkter Test des in Code-Plan §4.1 gezeigten Fixes | `tr.selection instanceof TextSelection === true` nach `mergeSelectedCells` | Blockiert |
| M8 | Nicht-rechteckige/überlappende Auswahl | `CellSelection`, die eine bereits teilweise verbundene Zelle nur anschneidet, konstruieren | `mergeSelectedCells()(state)` liefert `false` (Testfall 8/3.6) | Blockiert |
| M9 | Bereits verbundene Zelle (2×1) + Nachbarzelle neu markieren, erneut verbinden | Erst M1 anwenden, danach `CellSelection` über die neue 2×1-Zelle + eine weitere Nachbarzelle, erneut `mergeSelectedCells` | Ergebnis 2×2, keine Exception, `colCount` der Tabelle bleibt konsistent (Testfall 10/3.8) | Blockiert |
| M10 | Kopfzeilen-Grenzfall (Grenzfall 13/Code-Plan §5.5) | Handgebauter `table_header`+`table_cell`-Knoten im JSON, einmal Anker=Kopfzeile, einmal Anker=Datenzelle, `mergeSelectedCells` | Resultierender Node-Typ = Typ der **Anker**-Zelle in beiden Richtungen (kein stiller Typverlust) | Blockiert |
| M11 | Gesamte Tabelle (z. B. 3×3) zu einer Zelle verbinden | `CellSelection` über alle Zellen | Ergebnis: 1×1 mit gesamtem Inhalt in Lesereihenfolge, weiterhin editierbar (Grenzfall 2/Testfall 15) | Blockiert |
| M12 | Inhaltszusammenführung mit gemischtem Inhalt | Leere Zelle + Zelle mit 2 Absätzen + Zelle mit fett/farbig formatiertem Text verbinden | Alle nicht-leeren Inhalte in Lesereihenfolge in der Ankerzelle, Zeichenformatierung pro Absatz erhalten, leere Zelle trägt nichts bei (Testfall 6/Grenzfall 4/12, deckt 3.4/Verdachtsmoment 6 ab) | Blockiert |

### 2.3 `src/formats/docx/__tests__/roundtrip.test.ts` (ergänzt)

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status |
|---|---|---|---|---|
| DR1 | **Regressionstest Fehler 1 (zentraler Test dieses Abschnitts)** — kombinierter 2×2-Merge | `table_cell` mit `colspan: 2, rowspan: 2` von Hand gebaut, `writeDocx` → `readDocx` | `rowspan === 2` nach Rundreise (nicht `3`) | **ROT vor Fix** — laut Code-Plan §2.1 liefert der unkorrigierte `docx/reader.ts` `rowspan: 3`; QA reproduziert das hier unabhängig, nicht nur aus dem Code-Plan übernommen |
| DR2 | 3×3-Merge (`colspan: 3, rowspan: 3`) | Analog DR1 | `rowspan === 3` (nicht höher) | **ROT vor Fix** (deckt Testfall 5) |
| DR3 | 2×3-Merge (`colspan: 2, rowspan: 3`) | Analog | `rowspan === 3` | **ROT vor Fix** |
| DR4 | Reiner Spalten-Merge bleibt unverändert korrekt (Nicht-Regression) | Bestehender Testfall aus 2.1 erneut nach dem Fix ausführen | Weiterhin `colspan: 2` korrekt (Fix darf reinen Fall nicht brechen) | Grün erwartet, auch nach Fix |
| DR5 | Reiner Zeilen-Merge bleibt unverändert korrekt (Nicht-Regression) | Analog DR4 | Weiterhin `rowspan: 2` korrekt | Grün erwartet, auch nach Fix |
| DR6 | Verschachtelte Tabelle mit Merge innerhalb einer Zelle | Tabelle in `table_cell` einer äußeren Tabelle, innere Tabelle mit 2×2-Merge, Rundreise | Kein Absturz, `MAX_TABLE_NESTING_DEPTH = 25` nicht verletzt, innere `colspan`/`rowspan` korrekt (Grenzfall 6) | Grün erwartet, aber bisher kein Test vorhanden |
| DR7 | Kopfzeilen-Grenzfall auf DOCX-Reader-Ebene | Falls im Zuge von Code-Plan §5.5 Reader-Support für `table_header` ergänzt wird: echte `<w:tblHeader/>`-Zeile + Merge | Node-Typ bleibt erhalten | **Dokumentierter Nicht-Test**, solange Reader-seitige Kopfzeilenerkennung nicht Teil des Scopes ist (siehe Abschnitt 9) |

### 2.4 `src/formats/odt/__tests__/roundtrip.test.ts` (ergänzt)

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status |
|---|---|---|---|---|
| OR1 | **Regressionstest Fehler 2 (zentraler Test dieses Abschnitts)** — `<table:covered-table-cell>` fehlt komplett | 2×2-Merge (`colspan: 2, rowspan: 2`) exportieren, **rohe** `content.xml` (nicht nur reimportierte Attribute) per String-/DOM-Prüfung untersuchen | Export enthält exakt ein `<table:covered-table-cell/>` neben der Ankerzelle in Zeile 1 **und** zwei `<table:covered-table-cell/>` in Zeile 2 (Muster aus Code-Plan §2.2, belegt an `tableCoveredContent.odt`) | **ROT vor Fix** — aktuell 0 `covered-table-cell`-Elemente im Export |
| OR2 | **Regressionstest Fehler 3** — Spaltenanzahl ignoriert `colspan` | Zwei Zellen der **ersten** Zeile horizontal verbinden (`colspan: 2`), 1 weitere Zelle daneben (Gesamt 3 Gitterspalten) | Export enthält exakt 3 `<table:table-column/>`-Elemente (nicht 2) | **ROT vor Fix** — aktuell zu wenige `<table:table-column>` (Testfall 2, einfachster Testfall der Anforderung) |
| OR3 | Reimport der eigenen, gefixten Ausgabe | `writeOdt` (gefixt) → `readOdt` (unverändert) auf OR1-Struktur | `colspan: 2, rowspan: 2` korrekt reimportiert — bestätigt, dass Reader `covered-table-cell` bereits richtig überspringt (kein Reader-Fix nötig) | Grün erwartet, sobald Writer-Fix steht |
| OR4 | 2×3-/3×3-Rechteck-Merge, XML-Struktur-Prüfung | Analog OR1 für größere Rechtecke | Korrekte Anzahl `covered-table-cell` je Zeile/Spalte | **ROT vor Fix** |
| OR5 | Verschachtelte Tabelle mit Merge | Analog DR6 für ODT | Kein Absturz, innere Struktur korrekt (Grenzfall 6) | Grün erwartet, bisher kein Test |
| OR6 | Reine `colspan`/`rowspan`-Fälle aus 2.1 bleiben nach dem Fix korrekt (Nicht-Regression) | Bestehende Tests erneut nach Fix | Weiterhin grün | Grün erwartet, auch nach Fix |
| OR7 | Kopfzeilen-Grenzfall auf ODT-Reader-Ebene | Analog DR7 | — | **Dokumentierter Nicht-Test** (Grenzfall 13, siehe Abschnitt 9) |

### 2.5 Neue Datei: `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts` (ergänzt um Merge-Fälle)

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status |
|---|---|---|---|---|
| XF1 | DOCX → ODT → DOCX, horizontal **und** vertikal verbundene Zellen kombiniert | `readDocx(writeDocx(...))` → `readOdt(writeOdt(...))` → `readDocx(writeDocx(...))` auf einer Tabelle mit beiden Merge-Arten | `colspan`/`rowspan` beider Zellen bleiben über beide Konvertierungen erhalten (Testfall 21) | Blockiert durch DR1/OR1 (kombinierter Fall ist exakt der von Fehler 1/2 betroffene) |
| XF2 | ODT → DOCX → ODT, spiegelbildlich | Analog XF1 | Analog (Testfall 22) | Blockiert durch DR1/OR1 |
| XF3 | **Doppelte Cross-Format-Rundreise (DOCX→ODT→DOCX) mit kombiniertem Merge + Fett/Farbe/mehreren Absätzen** | Wie XF1, zusätzlich Text-Runs mit `strong`/`textColor`-Marks und Mehrfach-Absatz-Zellen | Kein kumulativer Verlust der Zellstruktur **oder** der Zeichenformatierung über zwei Konvertierungen (Testfall 23) | Blockiert durch DR1/OR1 |
| XF4 | Cross-Format-Rundreise einer **verschachtelten** Tabelle mit Merge | DOCX mit Tabelle-in-Zelle, innere Tabelle mit Merge, → ODT → DOCX | Kein Datenverlust/Absturz (Rundreise-Anforderung Punkt 9) | Grün erwartet nach DR6/OR5, sonst blockiert |

### 2.6 Neue Datei: `src/formats/docx/__tests__/merge-fixtures.test.ts`

Dediziert (nicht in `external-fixtures.test.ts` gemischt, das bewusst nur
„importiert ohne Absturz" prüft):

| # | Testfall | Erwartung | Erwarteter Status |
|---|---|---|---|
| FD1 | `bug57031.docx`: reale Datei mit horizontalem **und** vertikalem Merge | Importiertes JSON enthält mindestens eine Zelle mit `attrs.colspan > 1` **und** mindestens eine mit `attrs.rowspan > 1` (nicht nur „importiert ohne Fehler") | Grün erwartet (reiner Import, reine `colspan`- oder reine `rowspan`-Zellen sind laut Code-Plan §2.5 nicht zwingend beide auf derselben Zelle kombiniert — falls doch, zusätzlich von DR1 abhängig) |
| FD2 | `bug57031.docx`: unverändert reexportieren → reimportieren | Identische `colspan`/`rowspan`-Werte an denselben Textpositionen wie nach dem ersten Import (Rundreise-Anforderung 5.1, Testfall 24) | Grün erwartet, sofern keine Zelle beide Attribute kombiniert enthält — sonst blockiert durch DR1 |
| FD3 | `TestTableColumns.docx`/`TestTableCellAlign.docx`/`table-alignment.docx` — dokumentierender Eignungstest | Bestätigt gemäß Code-Plan §2.5 präzise: `TestTableColumns.docx` hat `gridSpan: 1`/`vMerge: 0` (nur horizontal), die beiden anderen 0/0 — als Merge-Fixtures **ungeeignet**, verhindert künftige Fehlnutzung | Grün erwartet (reine Dokumentation) |
| FD4 | `bug65649.docx` (12 MB, bereits `SKIP_SLOW_UNDER_JSDOM` markiert) | Nicht als Vitest/jsdom-Unit-Test verwendet — ausschließlich als E2E-Performance-Fixture (siehe T34) | Bewusst **nicht** Teil dieser Datei, nur dokumentiert |

### 2.7 Neue Datei: `src/formats/odt/__tests__/merge-fixtures.test.ts`

| # | Testfall | Erwartung | Erwarteter Status |
|---|---|---|---|
| FO1 | `mergedCells.odt`: reale Datei mit verbundenen Zellen | Importierte Zelle mit `colspan: 2` (oder passendem Wert je nach Dateiinhalt) vorhanden (Testfall 25) | Grün erwartet (reiner Import) |
| FO2 | `mergedCells.odt`: unverändert reexportieren → reimportieren | Zellstruktur identisch zum ersten Import | Blockiert durch OR1/OR2, sofern die Datei einen Merge in der ersten Zeile oder eine rechteckige Verdeckung enthält |
| FO3 | `tableCoveredContent.odt`: Import, **kein** Code-Fix nötig laut Code-Plan §1/Abschnitt 3 | Importierte Struktur enthält je Zeile die korrekte Anzahl **echter** Zellen (keine Spaltenverschiebung durch übersehene/falsch behandelte `covered-table-cell`-Geschwister), Zellenanzahl je Zeile stimmt mit der visuellen Gitterstruktur überein | Grün erwartet — **muss** grün sein, sonst widerlegt das die im Code-Plan behauptete „bereits korrekte" Reader-Seite (Testfall 26/Verdachtsmoment 8) |
| FO4 | `tableCoveredContent.odt`: unverändert reexportieren | Rohe exportierte `content.xml` enthält an den vom Original vorgegebenen Positionen ebenfalls `covered-table-cell` (Regressionstest für Fehler 2 gegen eine **fremd-erzeugte**, nicht nur eine eigene Teststruktur) | Blockiert durch OR1 |
| FO5 | `table-column-delete-with-merge.odt` / `-2-times.odt`: Import | Kein Absturz, Inhalt lesbar, `colspan`/`rowspan` der von der (noch nicht existierenden) Spalten-Lösch-Funktion betroffenen Zelle plausibel (Grenzfall 10) | Grün erwartet (reiner Import, unabhängig vom Merge-Feature selbst) |
| FO6 | `table-column-delete-with-merge.odt` / `-2-times.odt`: unverändert reexportieren/reimportieren | Kein zusätzlicher Verlust gegenüber dem ersten Import (Testfall 27, Rundreise-Anforderung Punkt 11) | Blockiert durch OR1, sofern die Datei rechteckige Verdeckungen enthält (vorab per JSZip-Inspektion zu klären, siehe Abschnitt 9) |

### 2.8 Grenzen der Unit-Test-Ebene (bewusst nicht hier, sondern in Teil B geprüft)

Folgende, von der Anforderung geforderte Prüfungen sind auf Unit-Test-Ebene **nicht
sinnvoll** durchführbar und werden ausschließlich in Abschnitt 3 abgedeckt — dies
wird hier bewusst dokumentiert, damit kein zukünftiger Versuch unternommen wird,
sie fälschlich als Unit-Test nachzurüsten:

- **Sichtbare Mehrzellen-Selektion** (Menüpunkt 3/Testfall 1): Ob die
  `selectedCell`-Decoration-Klasse tatsächlich ein sichtbares CSS-Overlay ergibt
  (statt nur im DOM zu existieren), erfordert echtes Rendering + `getComputedStyle`
  in einem echten Browser — jsdom rendert kein Layout/keine `:after`-Pseudo-Elemente
  zuverlässig genug für diese Prüfung (analog zur in `ausrichtung-zentriert-qa.md`
  Abschnitt 2.8 dokumentierten Grenze für `getComputedStyle`-Vererbung).
- **Echte Maus-Ziehauswahl über Zellgrenzen hinweg**: `EditorView`-Mausereignisse
  lassen sich in jsdom nicht realistisch genug simulieren, um `tableEditing()`s
  internes `CellSelection`-Erzeugungsverhalten aus echten `mousedown`/`mousemove`-
  Events zu prüfen — nur die **Konsequenz** einer bereits bestehenden
  `CellSelection` ist auf Modellebene testbar (siehe M1–M12), nicht deren
  **Entstehung** durch Mausbewegung.
- **Tab-Fokus-Navigation im Browser** (Fehler 5, Menüpunkt 9/Testfall 11): Erfordert
  echten Tastatur-Fokus-Wechsel zwischen DOM-Elementen, nicht nur den internen
  `goToNextCell`-Rückgabewert.
- **UI-Reaktionsfähigkeit bei großen Tabellen** (Grenzfall 11/Testfall 17/34):
  Erfordert echte Rendering-Performance-Messung, kein jsdom-Äquivalent.

---

## 3. Teil B — Echte Playwright-Browser-Tests

**Grundsatz (bindend für diesen Abschnitt, wortgleich mit dem Auftrag dieses
Dokuments):** Kein Testfall in Teil B darf durch direkten Aufruf interner
Funktionen (`mergeSelectedCells(...)`, `mergeCells(...)`, `readDocx(...)` etc.) im
Node-Kontext ersetzt werden. Jeder Testfall muss über echte Nutzer:innen-Handlungen
im Browser laufen: `locator.click()`, echtes `page.mouse.down()/move()/up()`-Drag
über Zellgrenzen hinweg, `page.keyboard.press(...)`/`.type(...)`,
`input.setInputFiles(...)` bzw. echtes `filechooser`-Event, `page.waitForEvent(
'download')` + Auslesen der heruntergeladenen Datei vom Dateisystem und Prüfung
mit einem vom eigenen Reader unabhängigen Parser (JSZip + `DOMParser`, nicht nur
String-`.toContain`).

### 3.1 Neue Datei: `tests/e2e/table-merge.spec.ts`

Struktur analog zu `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
(`docxCard`/`odtCard`-Helfer, `buildSampleDocx`/`buildSampleOdt`-Muster für
handgebaute Fixtures wiederverwenden, echte Fixture-Buffer für die realen
Dateien aus `tests/fixtures/external/` per `fs.readFile` laden). Ein `test` je
Zeile unten.

**Wichtiger Vorbehalt für diesen gesamten Abschnitt:** Da laut Abschnitt 0 aktuell
**kein einziges** Stück UI existiert (kein Button, kein CSS für Selektion), sind
praktisch **alle** Testfälle T2 ff. vor Umsetzung von `zellen-verbinden-code.md`
Abschnitt 4.1–4.4 **nicht nur „rot", sondern schlicht nicht ausführbar** (der
Locator `page.getByRole('button', { name: 'Zellen verbinden' })` liefert 0
Elemente, Playwright bricht mit Timeout ab). Das wird unten je Testfall explizit
als „Blockiert: Button existiert nicht" vermerkt, nicht pauschal als „rot" — dieser
Unterschied ist für die Priorisierung der Umsetzung relevant (siehe Abschnitt 8).

#### 3.1.1 Sichtbare Mehrzellen-Selektion — Voraussetzungstest (Anforderung Menüpunkt 3, Testfall 1)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T1 | Zwei nebeneinanderliegende Zellen per echtem Maus-Drag markieren | 2×2-Tabelle einfügen (`⊞ Tabelle`), in beide Zellen unterschiedlichen Text tippen, `page.mouse.move()` in Zelle (0,0), `page.mouse.down()`, `page.mouse.move()` in Zelle (0,1) (mehrere Zwischenschritte, kein einzelner Sprung — reales Drag-Verhalten), `page.mouse.up()` | `page.locator('.ProseMirror .selectedCell')` hat `count: 2` (JS-Decoration bereits heute aktiv laut Code-Plan §2.7); **zusätzlich** `toHaveCSS`-Prüfung auf sichtbares Overlay (z. B. `background-color` ungleich `transparent`/`rgba(0,0,0,0)`, oder Screenshot-Vergleich) | **ROT (Teilaspekt CSS) / Grün (Teilaspekt Decoration-Klasse)** — die Decoration-Klasse existiert laut Code-Plan bereits vor jedem CSS-Fix; der CSS-Teil dieses Tests **muss** vor `index.css`-Ergänzung (Code-Plan §4.4) nachweislich fehlschlagen, sonst hat der Test selbst keine Aussagekraft |

#### 3.1.2 Grundlegendes horizontales/vertikales/rechteckiges Verbinden (Anforderung §3.1–3.3, Testfall 2–5)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T2 | Horizontaler Merge über echten Drag + Klick | Nach T1-Drag: `page.getByRole('button', { name: 'Zellen verbinden' }).click()` | Resultierende `<td>` hat `colspan="2"` (`page.locator('.ProseMirror td').first().getAttribute('colspan')`), Text beider Ursprungszellen sichtbar über volle Breite | Blockiert: Button existiert nicht |
| T3 | Vertikaler Merge über zwei Zeilen | Drag von Zelle (0,0) zu Zelle (1,0) derselben Spalte, „Zellen verbinden" klicken | `rowspan="2"` | Blockiert: Button existiert nicht |
| T4 | 2×2-Rechteck-Merge (**Regressionstest Fehler 1 auf E2E-Ebene**) | Drag von Zelle (0,0) zu Zelle (1,1), verbinden, exportieren, Download parsen | `colspan="2"` **und** `rowspan="2"` gleichzeitig im Editor; nach Export/Reimport (siehe T19) bleibt `rowspan` bei `2`, nicht `3` | Blockiert: Button existiert nicht; nach UI-Fertigstellung zusätzlich blockiert durch DR1, bis Reader-Fix steht |
| T5 | 2×3- und 3×3-Rechteck-Merge | Größere Tabelle (3×3/4×3) einfügen, entsprechende Drags | `colspan`/`rowspan` korrekt für beide Größen | Blockiert: Button existiert nicht |

#### 3.1.3 Inhaltszusammenführung und kritischster Test (Anforderung §3.4/3.5, Testfall 6–7)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T6 | Zellen mit gemischtem Inhalt verbinden | 2×2-Tabelle: Zelle A leer, Zelle B ein Absatz, Zelle C mehrere Absätze, Zelle D fett/kursiv/farbiger Text; alle vier per Drag markieren, verbinden | Alle nicht-leeren Inhalte erscheinen in der Ankerzelle in Lesereihenfolge, mit erhaltener Zeichenformatierung (`toHaveCSS('font-weight', '700')` etc. auf dem jeweiligen Textabschnitt); leere Zelle trägt sichtbar nichts bei | Blockiert: Button existiert nicht |
| T7 | **KRITISCHSTER TEST DIESES PLANS (Anforderung §7 Testfall 7, „kritischster Einzeltest")** — sofortiges Tippen nach dem Merge | Zwei Zellen mit Text „AAA"/„BBB" per Drag markieren, verbinden, **ohne weiteren Klick** sofort `page.keyboard.type('X')` | Editor zeigt weiterhin „AAA BBB" (oder produktseitig festgelegtes Trennzeichen) **plus** angehängtes `X` — **nicht** nur `X` allein | **ROT ohne Fix** (Fehler 4) — **Blockiert: Button existiert nicht**, bis UI existiert; danach der wichtigste einzelne Test dieser gesamten Datei, muss vor jedem Release grün sein |

#### 3.1.4 Deaktivierungslogik / Guard-Fälle (Anforderung §3.6/3.7, Testfall 8–9)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T8 | Nicht-rechteckige/überlappende Auswahl | Zuerst 2×1-Merge durchführen, danach versuchen, nur eine „Ecke" dieser Zelle zusammen mit einer neuen, nicht vollständig einschließenden Nachbarzelle zu markieren | Button bleibt `disabled` (kein Klick möglich) **oder** Klick zeigt sichtbare Fehlermeldung — kein stiller No-Op (`expect(button).toBeDisabled()` **oder** `expect(page.getByRole('alert')).toBeVisible()`) | Blockiert: Button/Deaktivierungslogik existiert nicht |
| T9 | Nur eine einzelne Zelle markiert | Cursor in eine Zelle setzen, **keine** Mehrzellen-Selektion erzeugen | `expect(page.getByRole('button', { name: 'Zellen verbinden' })).toBeDisabled()` | Blockiert |

#### 3.1.5 Erweitern eines bestehenden Merges (Anforderung §3.8, Testfall 10)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T10 | Bereits verbundene 2×1-Zelle + Nachbarzelle neu markieren, erneut verbinden | Nach einem 2×1-Merge: Drag über die neue Zelle **und** eine weitere Nachbarzelle, erneut „Zellen verbinden" klicken | Ergebnis 2×2, kein Absturz/keine Exception in der Browser-Konsole (`page.on('pageerror', ...)` registrieren, muss leer bleiben) | Blockiert |

#### 3.1.6 Tab-Navigation nach dem Merge (Anforderung §3.10/Menüpunkt 9, Testfall 11 — Regressionstest Fehler 5)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T11 | Tab-Taste nach Merge drückt zur nächsten **echten** Zelle | 2×2-Tabelle, 2×1-Merge in der ersten Zeile, Cursor in die gemergte Zelle setzen, `page.keyboard.press('Tab')` | Fokus/Cursor springt in die nächste **echte**, nicht verdeckte Zelle (Position via `page.evaluate` auf `window.getSelection()`/ProseMirror-`state.selection` geprüft, **nicht** verlässt der Fokus das `.ProseMirror`-Element) | **ROT — muss vor Fix nachweislich fehlschlagen, weil Tab-Navigation im gesamten Editor aktuell komplett fehlt** (Code-Plan §2.6/Abschnitt 0 dieses Dokuments — nicht nur „nach Merge kaputt", sondern nie funktionsfähig gewesen). Zusätzlich blockiert, bis Button überhaupt existiert |

#### 3.1.7 Undo/Redo (Anforderung §3.12, Testfall 12–13)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T12 | Strg+Z direkt nach Merge | Merge durchführen, **ein** `ControlOrMeta+z` | Ursprüngliche Einzelzellen mit exakt ihrem jeweiligen Originalinhalt wiederhergestellt, **in einem Schritt** (kein Doppel-Undo nötig) | Blockiert |
| T13 | Strg+Y (Redo) danach | Direkt nach T12: `ControlOrMeta+y` | Merge wird wiederhergestellt | Blockiert |

#### 3.1.8 Randfälle und Grenzfälle (Anforderung Abschnitt 4, Testfall 14–17)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T14 | Verbinden am Rand der Tabelle (erste Zeile, letzte Spalte, erste Spalte, letzte Zeile) | Vier Sub-Fälle je an einer Tabellenkante | Identisches Verhalten wie in der Mitte, weiterhin editierbar danach (Grenzfall 1/9) | Blockiert |
| T15 | Gesamte Tabelle zu einer Zelle verbinden | Alle Zellen einer 3×3-Tabelle per Drag/`ControlOrMeta+a`-Äquivalent markieren, verbinden, danach exportieren | Ergebnis bleibt editierbar **und** exportierbar (Download erfolgreich, Grenzfall 2/Testfall 15) | Blockiert |
| T16 | Verschachtelte Tabelle (Tabelle in Tabellenzelle) verbinden | Tabelle in eine Zelle einer äußeren Tabelle einfügen, Zellen der inneren Tabelle verbinden | Kein Absturz (`pageerror`-Log leer), Inhalt bleibt lesbar (Grenzfall 6/Testfall 16) | Blockiert |
| T17 | `BigTable.odt` importieren, gesamte Fläche verbinden | Upload `BigTable.odt`, alle Zellen markieren (Performance-kritisch, ggf. per Tastatur-Wiederholung statt Einzel-Drag), verbinden | UI bleibt reaktionsfähig, definierte Zeitschranke (z. B. < 3 s bis Button wieder reagiert), kein Timeout (Grenzfall 11/Testfall 17) | Blockiert |

#### 3.1.9 Selection-Sync-Regression (Anforderung §3.13, Testfall 18)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T18 | Merge → Klick außerhalb der Tabelle → Enter → weitertippen (analog `selection-regression.spec.ts`, aber mit Merge als zusätzlichem Auslöser) | Tabelle mit Merge, danach Klick in einen Absatz außerhalb der Tabelle, `Enter`, `page.keyboard.type(...)` | Kein Dokumentinhalt geht verloren; `page.locator('.ProseMirror p')` hat die erwartete Anzahl, neuer Text erscheint korrekt an der neuen Cursor-Position | Blockiert: Button existiert nicht; **Pflichtbestandteil der Abnahme (DoD 5)**, muss zusätzlich zum bestehenden `selection-regression.spec.ts` dauerhaft in der Suite verankert werden |

#### 3.1.10 Vollständige Rundreisen über echten Upload/Download (Anforderung Abschnitt 5, Testfall 19–27)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T19 | DOCX-Rundreise nach eigener Bearbeitung, horizontal **und** vertikal (Testfall 19) | Neue Tabelle, horizontalen Merge in Tabelle 1 + vertikalen Merge in Tabelle 2 (oder kombiniert in einer Tabelle) durchführen, exportieren (Download abfangen), heruntergeladene Datei erneut über `input.setInputFiles` hochladen | `colspan`/`rowspan` und exakter Textinhalt bleiben nach Reimport erhalten | Blockiert: Button existiert nicht; bei kombiniertem Merge zusätzlich abhängig von DR1-Fix |
| T20 | **ODT-Rundreise, zentraler Test dieser Datei** (Testfall 20) | Analog T19 für ODT-Karte, zusätzlich exportierte Datei per JSZip auf Vorhandensein von `<table:covered-table-cell>` an den korrekten Positionen prüfen (nicht nur reimportierte Attribute) | `covered-table-cell`-Elemente an allen verdeckten Positionen vorhanden (deckt Verdachtsmoment 7 ab) | Blockiert: Button existiert nicht; zusätzlich abhängig von OR1/OR2-Fix |
| T21 | Cross-Format-Rundreise DOCX → ODT | Tabelle mit horizontalem **und** vertikalem Merge in DOCX-Karte erstellen, exportieren, resultierende Datei in ODT-Karte hochladen (bzw. äquivalentem Re-Import-Pfad, siehe Abschnitt 9 zur UI-Klärung), erneut exportieren | Beide Merge-Arten bleiben über den Formatwechsel erhalten | Blockiert: Button existiert nicht + UI-Klärung Cross-Format-Pfad offen |
| T22 | Cross-Format-Rundreise ODT → DOCX | Spiegelbildlich zu T21 | Analog | Wie T21 |
| T23 | **Doppelte Cross-Format-Rundreise (DOCX→ODT→DOCX)** mit kombiniertem Merge + Fett/Farbe/mehreren Absätzen | Kette wie T21/T22, zweimal hintereinander, mit Text-Formatierung kombiniert | Kein kumulativer Verlust der Zellstruktur über zwei Konvertierungen (DOMParser-Prüfung auf dem letzten Download) | Blockiert, wie T21 |
| T24 | **Reale externe Fixture DOCX** (Testfall 24) | `bug57031.docx` per `setInputFiles` **und** einmal per echtem `filechooser` (siehe 3.4) hochladen → unverändert exportieren → JSZip + `DOMParser` auf `word/document.xml` | Mindestens eine Zelle mit `gridSpan`, mindestens eine mit `vMerge`, nach Export identisch zum importierten Zustand | Grün erwartet, sofern kein kombinierter Merge in dieser Datei betroffen ist — sonst blockiert durch DR1 |
| T25 | **Reale externe Fixture ODT** (Testfall 25) | `mergedCells.odt` hochladen → unverändert exportieren → Reimport | Zellstruktur identisch zum Original | Blockiert durch OR1/OR2, falls die Datei einen Merge in der ersten Zeile oder eine rechteckige Verdeckung enthält (vorab zu prüfen) |
| T26 | `tableCoveredContent.odt` (Testfall 26) | Upload, Editor-Inhalt auf korrekte Zellenanzahl je Zeile prüfen (keine Spaltenverschiebung) | Keine Spaltenverschiebung im importierten Ergebnis (deckt Verdachtsmoment 8 ab) | Grün erwartet (reiner Import, kein Writer-Fix nötig für diesen Teilaspekt) |
| T27 | `table-column-delete-with-merge.odt` **und** `-2-times.odt` (Testfall 27) | Upload beider Dateien → Import ohne Absturz, Inhalt lesbar → unverändert exportieren/reimportieren | Kein zusätzlicher Verlust gegenüber dem ersten Import (Grenzfall 10/Abschnitt 5 Punkt 11) | Grün erwartet für reinen Import; Rundreise-Teil blockiert durch OR1, falls rechteckige Verdeckung enthalten |

#### 3.1.11 Kopfzeile, unabhängige Validierung, Icon, Tastenkürzel, Performance (Testfall 28–34)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T28 | Kopfzeilen-/Datenzellen-Merge (Grenzfall 13) | Import einer realen Datei mit echter Kopfzeile — **aktuell nicht durchführbar**, da weder `docx/reader.ts` noch `odt/reader.ts` jemals `table_header`-Knoten erzeugen (bestätigt Code-Plan §5.5) | — | **Blockiert, dauerhaft dokumentiert als „nicht end-to-end über die Oberfläche testbar"** (analog Grenzfall 9 aus `ausrichtung-zentriert-qa.md`), solange kein Reader-Support für Kopfzeilen existiert — ersatzweise durch M10 (Unit-Ebene) abgedeckt |
| T29 | **Unabhängige Validierung DOCX-Export** (Testfall 29) | Nach T19: `word/document.xml` mit `DOMParser` (nicht nur JSZip-String) auf schemakonforme `<w:gridSpan>`/`<w:vMerge>`-Struktur prüfen (Attribut-Namen, Platzierung innerhalb `<w:tcPr>`) | Struktur entspricht OOXML-Schema; bei Verfügbarkeit zusätzlich gegen `python-docx` oder eine OOXML-Schemaprüfung gegenprüfen (siehe Abschnitt 9, Werkzeug-Abhängigkeit) | Blockiert, wie T19 |
| T30 | **Unabhängige Validierung ODT-Export (zentraler Validierungstest für Verdachtsmoment 7)** (Testfall 30) | Nach T20: `content.xml` mit `DOMParser` auf `table:number-columns-spanned`/`table:number-rows-spanned` **und** `table:covered-table-cell` an den exakt richtigen Positionen prüfen; wenn verfügbar, echtes Öffnen in LibreOffice (headless) als Zusatznachweis (siehe Abschnitt 9) | Alle drei Attribute/Elemente korrekt und ODF-schemakonform vorhanden | Blockiert, wie T20 |
| T31 | **E2E-Test über echte Toolbar-Bedienung — Primärnachweis für DoD Punkt 5** | Entspricht in der Summe T1+T2 (echter Maus-Drag + echter Klick + visuelle Prüfung + Export/Reimport) | Siehe T1/T2/T19 — hier als **benannter Sammelnachweis** geführt, dass „mindestens ein Playwright-Test über echte Browser-Bedienung dauerhaft in der Testsuite verankert ist" (Anforderung §8 Punkt 5) | Blockiert: Button existiert nicht |
| T32 | Icon-Erkennbarkeitstest (Testfall 32) | Screenshot von `page.getByRole('button', { name: 'Zellen verbinden' })` neben Screenshot von `page.getByRole('button', { name: '⊞ Tabelle' })` | Dokumentierend: beide Symbole bleiben unterscheidbar (unterschiedlicher Textzusatz `⊞ Verbinden` vs. `⊞ Tabelle` laut Code-Plan §5.2) — kein automatisiertes Pass/Fail-Kriterium, aber verpflichtender dokumentierender Schritt | Blockiert bis Button existiert; danach dokumentierend |
| T33 | Tastenkürzel-Dokumentationstest (Testfall 33) | Laut Code-Plan §5.3: **kein** Kürzel für V1 vorgesehen. Test prüft **negativ**: ein erfundenes Kürzel (z. B. `ControlOrMeta+m`) löst **nichts** aus | Bestätigt die bewusste Entscheidung „kein Kürzel", kein stillschweigend offenbleibender Zustand (Menüpunkt 7) | Dokumentierend, sobald Entscheidung final ist |
| T34 | Performance/Stresstest mit `bug65649.docx` (12 MB, viele Merges) | Upload, sehr lange Zellauswahl über viele Zeilen einer großen Tabelle markieren und verbinden (Testfall 34, analog `large-document-import.spec.ts`-Muster) | UI bleibt reaktionsfähig, kein spürbares Einfrieren, definierte Zeitschranke | Blockiert bis Button existiert; separat als reiner Performance-Rauchtest von den übrigen funktionalen Tests zu trennen |

### 3.2 Bestehende Tests, die unverändert weiterlaufen müssen

- `tests/e2e/selection-regression.spec.ts` (alle drei Tests) — **Pflichtbestandteil**,
  bleibt unverändert erhalten. Nach jeder Änderung an `Toolbar.tsx`/`commands.ts`/
  `WordEditor.tsx` (Button-, Tab-Navigations- und Merge-Fix) erneut ausführen, um
  sicherzustellen, dass der bestehende Fett-bezogene Regressionsschutz durch die
  Tabellen-Änderungen nicht beschädigt wurde.
- `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts` — bleiben bestehen; enthalten
  keine Merge-Assertions, daher keine Überschneidung mit `table-merge.spec.ts`.
- `tests/e2e/lifecycle.spec.ts` — unverändert, keine Tabellen-Berührung erwartet,
  muss aber Teil der Dauer-Suite bleiben und grün laufen.

### 3.3 Datei-Upload: echter `filechooser` zusätzlich zu `setInputFiles`

Wie in `ausrichtung-zentriert-qa.md` Abschnitt 3.4 begründet: `setInputFiles`
direkt auf den versteckten `<input type="file">` testet Reader/Formular-Wiring,
nicht die tatsächliche Bedienung durch eine Nutzerin. Mindestens **zwei**
Testfälle dieses Plans (T24 für DOCX, T25 für ODT) müssen den echten sichtbaren
Klickpfad über den „Datei hochladen"-Button (`src/app/FormatPicker.tsx:62–68`)
nutzen:

```ts
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  docxCard(page).getByRole('button', { name: 'Datei hochladen' }).click(),
])
await fileChooser.setFiles({ name: 'bug57031.docx', mimeType: '...', buffer })
```

Die schnellere `setInputFiles`-Variante bleibt für alle übrigen Testfälle als
Standard bestehen — kein Widerspruch, nur Ergänzung.

### 3.4 Unabhängige Prüfung der heruntergeladenen Datei (nicht nur `.toContain`)

Für alle Export-Assertionen in diesem Plan, die eine strukturelle Prüfung
erfordern (insbesondere T20/T30, wo **welche** Zellposition **welches** Element
trägt, entscheidend ist), wird verbindlich verlangt:

```ts
import { JSDOM } from 'jsdom' // bereits Devdependency
const parser = new JSDOM('').window.DOMParser()
const xmlDoc = parser.parseFromString(contentXml, 'application/xml')
const T_NS = 'urn:oasis:names:tc:opendocument:xmlns:table:1.0'
const rows = [...xmlDoc.getElementsByTagNameNS(T_NS, 'table-row')]
const firstRowChildren = [...rows[0].children].map((el) => el.localName)
expect(firstRowChildren).toEqual(['table-cell', 'covered-table-cell', 'table-cell'])
```

Reine String-Suche (`expect(contentXml).toContain('<table:covered-table-cell/>')`,
wie in den bestehenden `docx.spec.ts`/`odt.spec.ts`-Tests für Fett verwendet)
genügt **nicht**, wenn — wie bei T20/T30 — die exakte **Reihenfolge und Position**
mehrerer gleichartiger Elemente je Zeile geprüft werden muss. Für DOCX analog mit
dem `W_NS`-Namensraum auf `<w:tc>`/`<w:tcPr>`/`<w:gridSpan>`/`<w:vMerge>`.

### 3.5 Cross-Browser-Matrix

| Testgruppe | Desktop Chrome | Mobile (Pixel 7) | Tablet (iPad Mini) | Anmerkung |
|---|---|---|---|---|
| Klick-/Tipp-basierte Tests (T2, T6–T10, T12–T18, T21–T34) | Pflicht | Pflicht | Pflicht | `.click()`/`.type()` funktionieren projektunabhängig |
| Maus-Drag-Tests (T1, T3–T5, T8) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | `page.mouse.down()/move()/up()` emuliert Touch-Geräte über CDP-Events technisch korrekt, reales Nutzer:innen-Verhalten mit Finger-Drag auf echter Touch-Hardware ist ein gesondert zu dokumentierender Sonderfall (kein 1:1-Ersatz) |
| Tastatur-only-Tests (T11, T12/T13, T33) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | `page.keyboard.press` funktioniert unabhängig vom simulierten Gerät, reales Verhalten auf Touch-Geräten ohne Hardware-Tastatur ist gesondert zu dokumentieren |
| Performance-Tests (T17, T34) | Pflicht | Pflicht | Pflicht | Zeitbudget je Projekt gesondert kalibrieren, Mobile/Tablet ggf. langsamer |

---

## 4. Traceability-Matrix (Anforderung Abschnitt 7, Testfälle 1–34 → Testfall in diesem Plan)

| Anforderung Testfall # | Testfall(e) in diesem Plan |
|---|---|
| 1 | T1 |
| 2 | T2, M1 |
| 3 | T3, M2 |
| 4 | T4, M3, DR1 |
| 5 | T5, M4, DR2, DR3 |
| 6 | T6, M12 |
| 7 | T7, M6, M6a |
| 8 | T8, M8 |
| 9 | T9, M5 |
| 10 | T10, M9 |
| 11 | T11 |
| 12 | T12 |
| 13 | T13 |
| 14 | T14 |
| 15 | T15, M11 |
| 16 | T16, DR6, OR5 |
| 17 | T17, FD4 |
| 18 | T18 |
| 19 | T19, XF1 (Teilaspekt) |
| 20 | T20, OR1, OR2 |
| 21 | T21, XF1 |
| 22 | T22, XF2 |
| 23 | T23, XF3 |
| 24 | T24, FD1, FD2 |
| 25 | T25, FO1, FO2 |
| 26 | T26, FO3 |
| 27 | T27, FO5, FO6 |
| 28 | T28, M10 |
| 29 | T29 |
| 30 | T30, OR1 |
| 31 | T31 (Sammelnachweis aus T1/T2/T19) |
| 32 | T32 |
| 33 | T33 |
| 34 | T17, T34, FD4 |

---

## 5. Verdachtsmomente (Anforderung Abschnitt 6) und Fehler (Code-Plan Abschnitt 2) → Einstufung

| # | Verdachtsmoment/Fehler | Einstufung durch QA | Testfall(e) |
|---|---|---|---|
| Verdachtsmoment 1 | Komplettes Fehlen der Bedienoberfläche | **Bestätigt exakt** (Abschnitt 0: 0 Treffer für `mergeCells`/`Verbinden` in `src/`) — gewichtigster Einzelbefund, blockiert praktisch alle Testfälle in Teil B | T2–T34 (als „Blockiert: Button existiert nicht" geführt) |
| Verdachtsmoment 2 | `mergeCells`/`splitCell` aus `prosemirror-tables` ungenutzt | Bestätigt, reine Verdrahtungsaufgabe laut Code-Plan | M1–M12 (setzen die Verdrahtung als Voraussetzung) |
| Verdachtsmoment 3 | Keine visuelle Rückmeldung für Mehrzellen-Selektion | **Präzisiert durch Code-Plan §2.7:** JS-Decoration bereits aktiv, nur CSS fehlt — kein reines Verdachtsmoment mehr, sondern klar lokalisierter Fix-Bedarf | T1 |
| Verdachtsmoment 4 | Rechteck-Zwang ohne UI-Rückmeldung | Bestätigt (Bibliotheks-Guard `cellsOverlapRectangle` liefert bereits `false`, nur UI-seitige Umsetzung als `disabled` fehlt) | T8, M8 |
| Verdachtsmoment 5 | `CellSelection` statt Text-Cursor nach Merge (Fehler 4 im Code-Plan) | **Bestätigt als echter, reproduzierbarer Bug** — kritischster Einzeltest dieses gesamten Features | T7, M6, M6a |
| Verdachtsmoment 6 | Inhaltszusammenführungs-Reihenfolge nicht produktseitig bestätigt | Als Produktentscheidung übernommen (Code-Plan §5.1: Bibliotheks-Default), von QA als expliziter Test verifiziert, nicht nur angenommen | T6, M12 |
| Verdachtsmoment 7 | Vermuteter ODF-Schema-Verstoß beim Export (fehlendes `covered-table-cell`) | **Bestätigt und laut Code-Plan §2.2 umfassender als ursprünglich vermutet** (auch reine `colspan`-Fälle in derselben Zeile betroffen) — zentraler Verifikationspunkt dieses gesamten Plans | T20, T30, OR1, OR2, OR4, FO4 |
| Verdachtsmoment 8 | ODT-Import von `covered-table-cell` plausibel, aber unverifiziert | Wird durch FO3/T26 gegen die reale Fixture `tableCoveredContent.odt` **erstmals tatsächlich verifiziert** (nicht nur „dürfte funktionieren") | T26, FO3 |
| Verdachtsmoment 9 | DOCX-`vMerge`-Anker-Tracking nur gegen eigenen Schreiber getestet | **Präzisiert durch Code-Plan Fehler 1:** kein reines „nie mit echter Datei getestet", sondern ein konkreter, mit der eigenen Schreiber/Leser-Kette bereits reproduzierbarer Fehler bei kombiniertem `colspan`+`rowspan` | DR1, DR2, DR3, T4, T19 |
| Verdachtsmoment 10 | Kein E2E-Test vorhanden | Bestätigt; wird durch `table-merge.spec.ts` behoben | Gesamter Abschnitt 3 |
| Verdachtsmoment 11 | Backlog-Status „fehlt" trifft nur auf UI zu, nicht auf Datenmodell | Bestätigt, aber laut QA-Gegenkontrolle (Abschnitt 0) **mit konkreten Datenmodell-Bugs** (Fehler 1–3), die über „nur ungetestet" hinausgehen — Backlog-Einschätzung war in dieser Hinsicht zu optimistisch | Abschnitt 0, DR1, OR1, OR2 |
| Fehler 1 (Code-Plan) | Kombinierter Merge liefert nach DOCX-Rundreise falschen `rowspan` | **Muss von QA unabhängig reproduziert werden** (siehe Vorbehalt Abschnitt 0) | DR1, DR2, DR3, T4, T19 |
| Fehler 2 (Code-Plan) | ODT-Export fehlt `covered-table-cell` (auch für reinen `colspan`-Fall in derselben Zeile) | Wie oben, Verdachtsmoment 7 | OR1, OR2, OR4, T20, T30, FO4 |
| Fehler 3 (Code-Plan) | ODT-Export: `colCount`-Berechnung ignoriert `colspan` | Bestätigt strukturell (Abschnitt 0), Auswirkung von OR2 unabhängig verifiziert | OR2 |
| Fehler 4 (Code-Plan) | `CellSelection` nach Merge löscht Inhalt bei sofortigem Tippen | Wie Verdachtsmoment 5 | T7, M6, M6a |
| Fehler 5 (Code-Plan) | Tab-Navigation zwischen Zellen existiert überhaupt nicht | **Bestätigt unabhängig in Abschnitt 0 dieses Dokuments** (Keymap-Grep) | T11 |

---

## 6. Erwarteter Ist-Status je neuem Testfall (vor Umsetzung von `zellen-verbinden-code.md`)

| Status | Testfälle | Grund |
|---|---|---|
| **Ausführbar und erwartet ROT** (unabhängig von jeder UI-Implementierung, reine Modell-/Reader-/Writer-Ebene) | M6a, DR1, DR2, DR3, OR1, OR2, OR4 | Reproduzieren Fehler 1/2/3/4 direkt über `prosemirror-tables`/`readDocx`/`writeDocx`/`readOdt`/`writeOdt`, ganz ohne Toolbar-Button — diese Tests sind **heute schon** schreib- und ausführbar und müssen **vor** jeder Implementierung rot laufen, sonst ist die jeweilige Bug-Behauptung nicht belegt |
| **Blockiert bis `commands.ts` den neuen Befehl exportiert** | M1–M5, M7, M9–M12 | Setzen `mergeSelectedCells` (bzw. den finalen Funktionsnamen) voraus, existiert noch nicht |
| **Blockiert: Button existiert nicht** | T2–T18, T21–T25, T27–T34 | `page.getByRole('button', { name: 'Zellen verbinden' })` liefert 0 Treffer — kein Testlauf möglich, solange Code-Plan §4.2 nicht umgesetzt ist |
| **Teilweise ausführbar, teilweise blockiert** | T1 | Decoration-Klassen-Teil bereits heute prüfbar (JS-Seite aktiv laut Code-Plan §2.7), CSS-Teil erst nach `index.css`-Ergänzung |
| **Erwartet GRÜN, sobald Import allein geprüft wird (kein Merge-Feature nötig)** | FD1, FD3, FO3, FO5, T26 | Reiner Import realer Fixtures, unabhängig vom noch fehlenden Merge-Button — sollte schon heute funktionieren |
| **Grün erwartet nach vollständiger Umsetzung** | Alle übrigen | Reguläres Funktionsverhalten ohne bekannten Gegenbeleg |

Sobald `zellen-verbinden-code.md` Abschnitt 4 (Fixes + UI) umgesetzt ist, müssen
**alle** als ROT/blockiert markierten Fälle auf GRÜN wechseln (inklusive der zuvor
blockierten Fälle, die dann erstmals ausführbar werden) — das ist der konkrete,
maschinell prüfbare Nachweis, dass die Fixes wirken, nicht nur Code-Review.

---

## 7. Abgleich mit Abnahmekriterien (`zellen-verbinden-req.md` Abschnitt 8)

| DoD-Punkt | Abdeckung in diesem Testplan |
|---|---|
| 1. Klickbarer Button inkl. sichtbarer Mehrzellen-Selektion, verdrahtet über `mergeCells`/`prosemirror-tables`, nicht nur Datenmodell | T1, T2, Abschnitt 3.1 gesamt |
| 2. Alle Testfälle aus Anforderung §7 real ausgeführt und dokumentiert | Abschnitt 3 (T1–T34) + Abschnitt 2 (M/DR/OR/XF/FD/FO) + Traceability-Matrix Abschnitt 4 |
| 3. Jedes Verdachtsmoment aus §6 explizit eingestuft | Abschnitt 5 (alle 11 Verdachtsmomente + 5 Code-Plan-Fehler) |
| 4. Verdachtsmoment 5 (`CellSelection` statt Text-Cursor) konkret getestet, Korrektur dokumentiert | T7, M6, M6a — der laut Anforderung selbst „kritischste Einzeltest" dieser gesamten Datei |
| 5. Mindestens ein E2E-Test über echte Browser-Bedienung dauerhaft verankert, inkl. Selection-Sync-Regressionstest | T31 (Sammelnachweis), T18 (Selection-Sync-Regression) |
| 6. Rundreise DOCX+ODT, Cross-Format, je mindestens eine reale externe Testdatei je Format, beide „Spalte löschen kreuzt Merge"-Fixtures | T19–T27, DR1–DR7, OR1–OR7, FD1–FD4, FO1–FO6 |
| 7. Tastenkürzel-/Kontextmenü-Entscheidung getroffen und umgesetzt oder begründet zurückgestellt | T33 (verifiziert die in Code-Plan §5.3/5.4 getroffenen Entscheidungen „kein Kürzel, kein Kontextmenü für V1") |
| 8. Inhaltszusammenführungs-Verhalten bewusst als Produktentscheidung bestätigt | T6, M12 (verifizieren die in Code-Plan §5.1 getroffene Entscheidung „Bibliotheks-Default übernehmen") |
| 9. Wechselwirkung mit „Zeile/Spalte einfügen/löschen" für den Fall „Spalte/Zeile löschen kreuzt Merge" nachweislich funktioniert | T27, FO5, FO6 (Import + unveränderte Rundreise der beiden `table-column-delete-with-merge*.odt`-Fixtures) |

---

## 8. Ausführungsreihenfolge (Vorschlag)

1. **`table-merge-commands.test.ts` Testfall M6a zuerst** — reproduziert Fehler 4
   direkt gegen den nackten `prosemirror-tables`-`mergeCells`, **ganz ohne** jede
   App-Implementierung. Dient als schneller, unabhängiger Ausgangsnachweis, dass
   der laut Anforderung „kritischste Einzeltest" real und nicht nur behauptet ist,
   bevor irgendetwas gebaut wird.
2. **`docx/__tests__/roundtrip.test.ts` DR1–DR3** und **`odt/__tests__/roundtrip.test.ts`
   OR1/OR2/OR4** — reproduzieren Fehler 1/2/3 unabhängig vom Code-Plan, ebenfalls
   ohne jede UI-Abhängigkeit, direkt gegen `readDocx`/`writeDocx`/`readOdt`/
   `writeOdt`.
3. **`docx/__tests__/merge-fixtures.test.ts`** (FD1, FD3) und
   **`odt/__tests__/merge-fixtures.test.ts`** (FO3, FO5) — reiner Import realer
   Fixtures, ebenfalls bereits heute ausführbar, unabhängig von Button/Merge-Command.
4. Nach Umsetzung von `commands.ts` (Code-Plan §4.1): **M1–M12** (inkl. M6, das den
   gefixten Zustand gegen M6a kontrastiert).
5. Nach Umsetzung von `Toolbar.tsx`/`WordEditor.tsx`/`index.css` (Code-Plan
   §4.2–4.4): **T1–T18** (Grundbedienung, kritischer Typing-Test T7, Guards,
   Undo/Redo, Tab-Navigation, Grenzfälle, Selection-Sync-Regression).
6. **T19–T30** (Rundreisen, Cross-Format, reale Fixtures, unabhängige
   Export-Validierung) + verbleibende `merge-fixtures.test.ts`-Fälle (FD2, FD4,
   FO1/FO2/FO4/FO6) + `cross-format-roundtrip.test.ts` (XF1–XF4).
7. **T31–T34** (Sammelnachweis, Icon, Tastenkürzel-Dokumentation, Performance) —
   abschließende Politur- und Robustheitsprüfungen.
8. **Nach vollständiger Umsetzung:** alle als ROT/blockiert markierten Fälle
   erneut ausführen, Statuswechsel auf GRÜN dokumentieren; `selection-regression
   .spec.ts` zusätzlich erneut laufen lassen (Abschnitt 3.2), um sicherzustellen,
   dass die bestehende Regressionsabsicherung durch die Tabellen-Änderungen nicht
   beschädigt wurde.
9. Traceability-Matrix (Abschnitt 4) und DoD-Abgleich (Abschnitt 7) final
   gegenprüfen, bevor der Backlog-Status auf „verifiziert" geändert wird.

---

## 9. Offene Punkte für QA

- **Button-Selektor muss an der tatsächlich gebauten UI verifiziert werden:** Der
  in diesem Plan durchgängig verwendete Selektor
  `page.getByRole('button', { name: 'Zellen verbinden' })` setzt voraus, dass
  `title`/`aria-label` exakt diesen Text tragen (Code-Plan §4.2-Vorschlag). Weicht
  die tatsächliche Umsetzung ab (z. B. anderer Wortlaut, nur `title` ohne
  `aria-label`), müssen **alle** Testfälle in Abschnitt 3 migriert werden — analog
  zur in `ausrichtung-zentriert-qa.md` dokumentierten Titeltext-Migration.
- **T21/T22 (Cross-Format-Export direkt aus einer Karte heraus):** Unklar, ob die
  UI einen Formatwechsel beim Export aus derselben Karte erlaubt oder ob dafür
  zwingend der Umweg über Re-Import in die jeweils andere Karte nötig ist — vor
  Testimplementierung an der laufenden App verifizieren (identische Unklarheit wie
  in `fett-qa.md`/`ausrichtung-zentriert-qa.md` Abschnitt 8 dokumentiert).
- **T28 (Kopfzeilen-Merge) ist aktuell nicht end-to-end ausführbar:** Weder
  `docx/reader.ts` noch `odt/reader.ts` erzeugen jemals `table_header`-Knoten
  (bestätigt Code-Plan §5.5). Muss bis zur Umsetzung eines separaten
  Kopfzeilen-Reader-Supports als „nicht end-to-end über die Oberfläche testbar,
  nur auf Command-Ebene (M10)" vermerkt bleiben — analog zu Grenzfall 9
  (Kopf-/Fußzeile) in `ausrichtung-zentriert-qa.md`.
- **FD2/FO2/FO6/T24/T25/T27 hängen vom genauen Fixture-Inhalt ab:** Vor
  Testimplementierung per JSZip-Rohinspektion klären, ob `bug57031.docx`,
  `mergedCells.odt` und die beiden `table-column-delete-with-merge*.odt`-Dateien
  tatsächlich eine Zelle mit **kombiniertem** `colspan > 1` **und** `rowspan > 1`
  enthalten (dann blockiert durch DR1/OR1) oder nur reine Spalten-/Zeilen-Merges
  (dann unabhängig von Fehler 1/2 bereits grün lauffähig) — der Code-Plan trifft
  dazu keine abschließende Aussage für diese konkreten Dateien.
- **T29/T30 (unabhängige Parser-Validierung):** Die Anforderung (§5 Punkt 8)
  verlangt idealerweise eine von `python-docx`/`odfpy` oder echtem Word/LibreOffice
  unabhängige Gegenprüfung. Dieser Plan verwendet ersatzweise `DOMParser` (bereits
  vorhandene Devdependency `jsdom`) als minimalen, vom eigenen Reader
  unabhängigen Parser. Ob zusätzlich eine externe Python-Toolchain oder ein
  headless LibreOffice in der CI verfügbar gemacht wird, ist vor
  Testimplementierung mit dem Team zu klären (Infrastrukturfrage, kein
  Testdesign-Punkt).
- **T1 (Maus-Drag-Emulation) und Touch-Geräte:** `page.mouse.down()/move()/up()`
  über die Playwright-Mobile-/Tablet-Projekte emuliert technisch Zeigereignisse,
  entspricht aber nicht zwangsläufig echtem Finger-Drag-Verhalten auf realer
  Touch-Hardware (siehe Abschnitt 3.5) — als Best-effort/dokumentierender
  Sonderfall geführt, nicht als hartes Pflichtkriterium für Mobile/Tablet.
- **Reihenfolge-Abhängigkeit der Fehler 1–3 (DOCX-Reader/ODT-Writer) zur
  UI-Fertigstellung ist bewusst entkoppelt:** DR1–DR3/OR1/OR2/OR4 können und
  sollen **vor** jeglicher Button-Implementierung geschrieben und rot laufen
  gelassen werden (siehe Abschnitt 8, Schritt 1–2) — diese Reihenfolge ist
  zwingend, damit die schwerwiegendsten Datenfehler nicht erst am Ende der
  Implementierung entdeckt werden.
