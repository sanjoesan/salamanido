# QA-Testplan: Feature „Zellen verbinden"

Rolle: QA-Antwort auf `specs/zellen-verbinden-req.md` (Anforderung) und
`specs/zellen-verbinden-code.md` (Entwicklerplan). Dieses Dokument nimmt **keinen**
der beiden Vorgängertexte als bewiesen an — `zellen-verbinden-code.md` ist laut
eigenem Titel ein *Plan* („Kein Punkt hier ist bereits umgesetzt"). Jede Behauptung
aus beiden Dokumenten wird hier auf einen konkreten, ausführbaren Testfall
abgebildet. Ergebnis ist ein Testplan, kein Testbericht — die hier aufgeführten
Tests sind zum Zeitpunkt dieses Dokuments **noch nicht geschrieben** (siehe die
Spalte „Erwarteter Status" je Tabelle).

Stil/Gliederung orientiert an `specs/ausrichtung-zentriert-qa.md` (Präzedenzfall für
dieses Repo).

---

## 0. Kritische Überarbeitung dieser QA-Datei (Pflicht: „falls vorhanden, kritisch prüfen und verbessern")

**Die vorige Fassung dieser Datei war gegen einen älteren Codestand geschrieben** — exakt
die Falle, vor der `zellen-verbinden-req.md` Abschnitt 0 und `zellen-verbinden-code.md`
Abschnitt 0 ausdrücklich warnen. Sie wurde vollständig gegen den **heutigen** Quellcode
neu verifiziert. Konkret korrigiert wurde:

1. **Falscher Kernbefund „ODT-Export ist kaputt" entfernt.** Die vorige Fassung behauptete
   (unter „Fehler 2/3", Verdachtsmoment 7, Tests OR1/OR2/FO4/T20/T30/T25), `src/formats/odt/writer.ts`
   schreibe **kein** `<table:covered-table-cell/>` und berechne `colCount` als reine
   Zellenanzahl. **Das ist für den heutigen Code falsch.** `odt/writer.ts` schreibt
   `<table:covered-table-cell/>` für **beide** Achsen (horizontal Zeile 158–162, vertikal
   über den `pending`-Tracker Zeile 126/134–137/164–167) und berechnet `colCount` bereits
   **`colspan`-gewichtet** als Summe der ersten Zeile (Zeile 115–116). Die frühere Aussage
   „`covered-table-cell` kommt in der Datei nicht vor" (mit Zitat `odt/writer.ts:86–109`)
   ist gegenstandslos — der Local-Name kommt heute mehrfach vor. **Konsequenz:** Die
   ODT-Writer-Tests sind hier als **Regressions-Einfrier-Tests** (heute GRÜN, sie
   fixieren die bereits korrekte Ausgabe), **nicht** als „ROT vor Fix" geführt.
2. **Fehler-Nummerierung an `zellen-verbinden-code.md` angeglichen.** Der Code-Plan
   definiert genau **zwei** real reproduzierte Defekte: **Fehler 1** (DOCX-Reader:
   kombinierter `colspan`+`rowspan`-Merge → zu hoher `rowspan` nach DOCX-Rundreise) und
   **Fehler 2** (`CellSelection` nach dem Merge → sofortiges Tippen löscht den Inhalt).
   Die vorige Fassung erfand „Fehler 1–5" mit abweichender Bedeutung (ODT-Writer als
   „Fehler 2/3", Tab-Navigation als „Fehler 5"). Diese Datei benutzt durchgängig die
   Code-Plan-Nummerierung.
3. **Alle Zeilennummern neu geprüft** (die vorigen waren durchweg veraltet):
   `docx/reader.ts` `parseTable` **311–364** (vorher 210–256); `odt/writer.ts` `case 'table'`
   **110–175** (vorher 86–109); `Toolbar.tsx` Tabellen-Button **279–288** (vorher 228–239),
   `MarkButton` **55–89** (vorher 44–48); `docx/__tests__/roundtrip.test.ts` Merge-Tests
   **261/279** (vorher 205–244); `odt/__tests__/roundtrip.test.ts` Merge-Tests **251/275/310**
   (vorher 194–208).
4. **Button-Selektor korrigiert.** Die vorige Fassung behauptete, der „⊞ Tabelle"-Button
   habe „aktuell kein `title`-Attribut" und benutzte `getByRole('button', { name: '⊞ Tabelle' })`.
   Falsch: Der Button trägt `title="Tabelle einfügen"` **und** `aria-label="Tabelle einfügen"`
   (`Toolbar.tsx:279–281`); der Accessible Name ist damit „Tabelle einfügen", **nicht**
   „⊞ Tabelle" (das `aria-label` überschreibt den sichtbaren Text). Der bestehende Test
   `tests/e2e/selection-regression.spec.ts:46` verwendet bereits korrekt
   `getByRole('button', { name: 'Tabelle einfügen' })` — diese Datei übernimmt das.
5. **Falsche Aussage zur ODT-Rundreise-Testabdeckung entfernt.** Die vorige Fassung
   behauptete, der ODT-Roundtrip-Test habe „keine XML-Struktur-Prüfung auf
   `covered-table-cell`". Tatsächlich prüfen die Tests bei
   `odt/__tests__/roundtrip.test.ts:275` (horizontal) und **:310** (vertikal) exakt die
   rohe `content.xml`-Struktur inkl. `covered-table-cell` je Zeile. Die verbleibende Lücke
   ist enger: **kombiniertes** `colspan>1` **und** `rowspan>1` auf **einer** Zelle wird von
   keinem bestehenden Test abgedeckt (genau die Lücke, die Fehler 1 verdeckt hielt).
6. **Determinismus als eigener, verbindlicher Abschnitt (Abschnitt 3) neu.** Der Auftrag
   verlangt ausdrücklich deterministische Tests ohne Race-Conditions durch zu schnelle
   Tastatureingaben (Selektions-Sync abwarten). Das Repo hat dazu eine **dokumentierte
   Flaky-Historie** (jüngste Commits: „Fix flaky Mobile-project … same async-selection-sync
   race", „give async selection sync time before the next keystroke") und ein etabliertes
   Muster (`waitForTimeout(50)` zwischen nativer Caret-Bewegung und nächster Taste). Das ist
   jetzt zentral dokumentiert und für die kritischsten Tests (T7, T18) verbindlich gemacht.

**Unverändert gültige Kernaussage** (deckt sich mit beiden Vorgängerdokumenten): Der
Backlog-Status „fehlt" trifft für die **Bedienoberfläche** vollständig zu (kein Button,
kein Menü, kein Kürzel, keine CSS-sichtbare Mehrzellen-Selektion); der **Persistenz-Unterbau**
(Lesen/Schreiben/Rundreise bereits verbundener Zellen) ist für **beide** Formate vorhanden
und teilweise getestet, enthält aber die **zwei** oben genannten realen Defekte (Fehler 1
DOCX-Reader, Fehler 2 `CellSelection`).

---

## 1. QA-Gegenkontrolle des Ist-Codes (selbst am heutigen Stand verifiziert)

Alle Behauptungen unten wurden direkt im aktuellen Quellcode nachvollzogen, nicht aus den
Vorgängerdokumenten übernommen.

| Behauptung | QA-Gegenkontrolle | Ergebnis |
|---|---|---|
| Keine Nutzung von `mergeCells`/`splitCell`/`CellSelection` in `src/` | `grep -rn "mergeCells\|splitCell\|CellSelection" src/` | **Bestätigt: 0 Treffer.** Weder Button noch Command noch Wiring — Feature UI-seitig zu 100 % ungebaut. |
| `prosemirror-tables@1.8.5` installiert | `package.json` | **Bestätigt.** Voraussetzung für alle Zeilenzitate aus `dist/index.js`. |
| ODT-Writer schreibt `covered-table-cell` + colspan-gewichtete `colCount` | `odt/writer.ts` gelesen: `colCount` Zeile 115–116, `covered-table-cell` Zeile 137/161, `TableNameSequence` Zeile 54 | **Bestätigt — vorige QA-Fassung war hier falsch.** Beide Achsen erzeugen `covered-table-cell`; `colCount` ist Summe der `colspan` der ersten Zeile. **Kein Writer-Fix nötig** (Code-Plan §4.7). |
| Fehler 1: DOCX-Reader zählt `rowspan` bei kombiniertem Merge pro Fortsetzungs-`<w:tc>` statt pro Fortsetzungszeile | `docx/reader.ts:330–332` (Inkrement je Continuation-`<w:tc>`) + `:355–357` (dieselbe `cellNode` in mehrere `anchors[]`-Spalten) + `docx/writer.ts:174` (eine `<w:vMerge/>`-Zelle **pro Gitterspalte**) gelesen | **Mechanismus im Code bestätigt.** Bei `colspan=2` schreibt der Writer 2 Fortsetzungszellen je Folgezeile, der Reader erhöht `rowspan` bei jeder → nach Rundreise zu hoch. **Muss als Pflichttest DR1 unabhängig reproduziert werden**, bevor er als bewiesen gilt. |
| Fehler 2: `mergeCells` hinterlässt `CellSelection`; sofortiges Tippen ersetzt Inhalt | Bibliotheks-Verhalten (`prosemirror-tables` `mergeCells` setzt `CellSelection` auf die neue Zelle) | **Plausibel, im Code nachvollziehbar.** **Muss als Pflichttest M-bare (Abschnitt 4.2) gegen den nackten `mergeCells` unabhängig reproduziert werden** — der wichtigste einzelne Test dieses Plans. |
| `tableEditing()` liefert bereits die `selectedCell`-Decoration | `WordEditor.tsx:101–102` (`columnResizing(), tableEditing()`) | **Bestätigt.** Mehrzellen-Selektions-Feedback ist rein ein **CSS**-Problem (`.selectedCell` nirgends in `src/index.css`), kein JS/Plugin-Problem — Verdachtsmoment 3. |
| Keine `Tab`-Bindung im Editor | `WordEditor.tsx:77` (`keymap({...})` ohne `Tab`), `:100` (`keymap(baseKeymap)`) | **Bestätigt.** Tab navigiert derzeit **nie** zwischen Zellen; Menüpunkt 9/Testfall 11 setzen eine Baseline voraus, die real nicht existiert (Code-Plan §5.6). |
| `⊞ Tabelle`-Button: `title`+`aria-label`+`aria-pressed` | `Toolbar.tsx:279–288` gelesen: `title="Tabelle einfügen"`, `aria-label="Tabelle einfügen"`, `aria-pressed={isInTable(view.state)}`, `insertTable(2, 2)` | **Bestätigt.** Accessible Name = „Tabelle einfügen" (nicht „⊞ Tabelle"). Referenzpunkt für Platzierung/Selektor des neuen Buttons. |
| `MarkButton` setzt `title` **und** `aria-label` (identisch); `AlignButton` nur `title` | `Toolbar.tsx:73–74` (`title={title}`, `aria-label={title}`) vs. `:96` (nur `title`) | **Bestätigt.** Positivvorbild `MarkButton`, Negativvorbild `AlignButton` (Menüpunkt 5). |
| `disabled`-Muster über Command-Verfügbarkeit | `Toolbar.tsx:147` (`disabled={!canCut(view.state)}`) | **Bestätigt.** Vorlage für den `disabled`-Zustand des neuen „Verbinden"-Buttons. |
| Re-Render der Toolbar bei jeder Transaktion | `WordEditor.tsx:117–123` (`dispatchTransaction` → `forceRender`) | **Bestätigt.** `disabled` folgt der Selektion live, ohne Zusatzverdrahtung. |
| Datei-Upload über versteckten `<input type="file">` hinter sichtbarem Button | `src/app/FormatPicker.tsx:79` (`onClick → fileInputs.current[...].click()`), `:82` („Datei hochladen"), `:96–98` (`type="file"`, `className="hidden"`) | **Bestätigt.** Ankerpunkt für den echten `filechooser`-Pfad (Abschnitt 5.3). |
| ODT-Roundtrip-Test prüft rohe `covered-table-cell`-Struktur | `odt/__tests__/roundtrip.test.ts:275` (horizontal), `:310` (vertikal) | **Bestätigt — vorige QA-Fassung war hier falsch.** Struktur wird geprüft; nur der **kombinierte** Fall fehlt. |
| Reale Fixtures vorhanden | `ls tests/fixtures/external/{docx,odt}/` | **Bestätigt:** DOCX `bug57031`, `bug59058`, `bug65649`, `TestTableColumns`, `TestTableCellAlign`, `table-alignment`, `deep-table-cell`; ODT `mergedCells`, `tableCoveredContent`, `table-column-delete-with-merge(-2-times)`, `BigTable`, `crazyTable`, `subTables3-nested`, `subTables4`, `TestTextTable`, `tableOps`. Keine Beschaffung nötig. |
| Playwright-Projekte | `playwright.config.ts:27–54` | **Fünf** Projekte: **Desktop Chrome**, **Mobile** (Pixel 7), **Tablet** (iPad Mini) für die volle Suite; **Desktop Safari (Clipboard)** und **Desktop Firefox (Clipboard)** sind per `testMatch: /clipboard.*\.spec\.ts/` **nur** auf Clipboard-Specs beschränkt. `table-merge.spec.ts` läuft also in **drei** Projekten (Chrome/Mobile/Tablet). |

**Methodischer Vorbehalt (bleibt gültig):** Der Code-Plan enthält Reproduktionsbehauptungen
mit exakten Vorher/Nachher-Werten (`rowspan: 3` statt `2`; nach Tippen nur `"X"`). QA
übernimmt diese **nicht** als bereits erbracht, sondern führt sie in Abschnitt 4 als eigene,
zuerst auszuführende Tests (DR1 und M-bare) erneut auf — das ist die Existenzberechtigung
dieses eigenständigen QA-Dokuments gegenüber dem Code-Plan.

---

## 2. Testumgebung

- **Unit-Tests:** `npm test` (Vitest, `jsdom`).
- **E2E-Tests:** `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `baseURL: 'http://localhost:4173/salamanido/'`; `webServer` baut (`npm run build`) und
    startet `npm run preview` automatisch.
  - Für `table-merge.spec.ts` relevante Projekte: **Desktop Chrome**, **Mobile** (Pixel 7),
    **Tablet** (iPad Mini) — jeder neue Testfall muss in **allen drei** grün sein, mit der
    in Abschnitt 5.4 dokumentierten Best-effort-Ausnahme für feinmotorische Maus-Drag-Tests.
    (Die beiden Clipboard-Projekte Safari/Firefox greifen für diese Datei nicht.)
- **Etablierte E2E-Konventionen** (aus `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
  übernommen, in `table-merge.spec.ts` beizubehalten):
  - Einstieg: `await page.goto('/')` → Privacy-Banner: `await page.getByRole('button', { name: /verstanden/i }).click()`.
  - Neues Dokument: `await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()`
    bzw. `odtCard(page)`.
  - Karten-Locator: `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })`
    bzw. `{ name: 'OpenDocument Text (.odt)' }`.
  - Editor: `page.locator('.ProseMirror')`; Zellen: `page.locator('.ProseMirror td')`.
  - Tabelle einfügen: `page.getByRole('button', { name: 'Tabelle einfügen' })` (**korrigiert**;
    matcht den `aria-label`, siehe Abschnitt 0 Punkt 4 — belegt durch `selection-regression.spec.ts:46`).
  - Fett-Button (für den Formatierungs-Erhalt-Teil): `page.getByTitle('Fett')`.
  - Export: `page.getByRole('button', { name: 'Exportieren' })` + `page.waitForEvent('download')`.
  - Upload: schneller `input[type="file"].setInputFiles(...)` **und** mindestens ein Testfall
    je Format über den echten sichtbaren „Datei hochladen"-Button + `page.waitForEvent('filechooser')`
    (Abschnitt 5.3).
- **Selektor-Vorbehalt für den neuen Button:** Der genaue `title`/`aria-label` des
  „Zellen verbinden"-Buttons steht erst nach Umsetzung von `zellen-verbinden-code.md`
  Abschnitt 4.2 fest (dort vorgeschlagen: `title="Zellen verbinden"`,
  `aria-label="Zellen verbinden"`, eigenes SVG-Icon `MergeCellsIcon`). Alle Testfälle
  verwenden vorläufig `page.getByRole('button', { name: 'Zellen verbinden' })` — **vor der
  ersten Testausführung an der real gebauten UI zu verifizieren** (Abschnitt 11).
- **CSS-Selektor für die sichtbare Mehrzellen-Selektion:** `.ProseMirror .selectedCell`
  (Decoration-Klasse, laut Abschnitt 1 heute schon JS-seitig aktiv, nur CSS fehlt).

---

## 3. Determinismus-Anforderungen (verbindlich für alle E2E-Tests)

Der Auftrag verlangt explizit deterministische Tests **ohne** Race-Conditions durch zu
schnelle Tastatureingaben und **mit** abgewartetem Selektions-Sync. Dieses Repo hat dazu
eine dokumentierte Flaky-Historie (Commits „Fix flaky Mobile-project … same
async-selection-sync race", „give async selection sync time before the next keystroke").
Die folgenden Regeln sind für `table-merge.spec.ts` bindend:

1. **Ursache des Races (aus `selection-regression.spec.ts:26–34` wörtlich belegt):**
   ProseMirror erfährt eine native, tastaturgetriebene Caret-Bewegung (z. B. `End`, ein
   Klick in eine andere Zelle, oder die vom Merge-Fix gesetzte Text-Cursor-Position)
   **nur** über das **asynchrone** `selectionchange`-Event des Browsers. Feuert ein
   Playwright-`press()`/`type()` unmittelbar danach — ohne menschliche Reaktionspause —,
   kann es der Sync-Verarbeitung vorauslaufen und auf der **alten** Selektion operieren.
2. **Etabliertes Gegenmittel (unverändert übernehmen):** zwischen einer nativen
   Selektions-/Caret-Änderung und der nächsten Taste ein kurzes
   `await page.waitForTimeout(50)` einfügen — genau wie in `selection-regression.spec.ts:34/72/103`.
   Kein „menschlich" schnelles Tippen ohne diese Pause an den unten markierten Stellen.
3. **Kritische Stellen in diesem Plan, an denen der Sync zwingend abzuwarten ist:**
   - **T7 (kritischster Test — Fehler 2):** Nach dem Merge setzt der Fix aus Code-Plan §4.1
     die Selektion **innerhalb der Merge-Transaktion** auf einen Text-Cursor. Das ist eine
     Modell-Selektion, die der View erst asynchron in eine native DOM-Selektion überführt.
     Vor dem `page.keyboard.type('X')` daher `await page.waitForTimeout(50)` (und zusätzlich
     eine State-Assertion, siehe Punkt 4). Ohne diese Pause kann der Test **fälschlich**
     grün **oder** rot laufen, je nach Timing — nicht deterministisch.
   - **T18 (Selection-Sync-Regression):** identisches Muster wie
     `selection-regression.spec.ts` — nach dem Klick außerhalb der Tabelle und vor `Enter`
     ein `waitForTimeout(50)`.
   - **T12/T13 (Undo/Redo direkt nach Merge):** vor `ControlOrMeta+z` den Merge-Sync
     abwarten, damit Undo genau **eine** Transaktion rückgängig macht.
   - **Jeder Maus-Drag → Klick-Übergang (T2–T5):** nach `page.mouse.up()` (Erzeugung der
     `CellSelection`) und vor dem Klick auf „Zellen verbinden" kurz auf die
     Selektions-Reflektion warten (Punkt 4), damit der Button seinen `disabled`-Zustand
     bereits neu ausgewertet hat (er hängt an `mergeSelectedCells()(view.state)`).
4. **Bevorzugt zustandsbasiertes Warten statt fester Sleeps, wo möglich.** Ein fester
   `waitForTimeout(50)` ist das etablierte Repo-Muster und als Untergrenze zulässig; wo eine
   beobachtbare Bedingung existiert, ist sie vorzuziehen, weil sie schneller **und**
   robuster ist:
   - Auf die Selektion warten: `await expect(page.locator('.ProseMirror .selectedCell')).toHaveCount(2)`
     (Playwright-Auto-Retry) statt „blind" schlafen, bevor der Merge-Klick erfolgt.
   - Auf den Merge-Effekt warten: `await expect(page.locator('.ProseMirror td[colspan="2"]')).toBeVisible()`
     bevor weitergetippt wird.
   - Nur dort, wo keine DOM-beobachtbare Bedingung existiert (native Caret-Position nach
     `End`/Klick), auf `waitForTimeout(50)` zurückfallen.
5. **Kein `page.mouse`-Einzelsprung.** Ein Cross-Zellen-Drag muss über **mehrere**
   `page.mouse.move(...)`-Zwischenschritte laufen (nicht ein einziger Sprung von Start zu
   Ziel), damit `tableEditing()` die `CellSelection` wie bei echter Mausbewegung erzeugt und
   der `CLICK_DRAG_THRESHOLD_PX = 3`-Reconcile (`WordEditor.tsx:133`) sie nicht als
   Klick kollabiert.
6. **Netzwerk-/Server-freie Fixtures.** Reale Fixtures werden per `fs.readFile` aus
   `tests/fixtures/external/` als Buffer geladen und via `setInputFiles`/`filechooser`
   übergeben — kein Netzwerkzugriff, kein Zeit-abhängiger externer Zustand.
7. **Deterministische Tabellennamen im Export** sind bereits gesichert
   (`odt/writer.ts` `TableNameSequence` statt `Math.random()`), sodass Byte-/Struktur-Vergleiche
   der heruntergeladenen Datei stabil sind.

---

## 4. Teil A — Unit-Tests (Reader/Writer-Rundreise DOCX + ODT + Command-Ebene)

**Zweck:** Schnelle, browserunabhängige Absicherung von drei Ebenen: (A.1) der neue,
geteilte `mergeSelectedCells`-Befehl inkl. des kritischsten Fixes (`CellSelection`→Text-Cursor,
Fehler 2); (A.2) die Reader/Writer-Rundreise DOCX **und** ODT für `colspan`/`rowspan`
(Kernauftrag — hier sitzt Fehler 1 und hier wird die bereits korrekte ODT-Ausgabe
**eingefroren**); (A.3) reale, extern erzeugte Fixture-Dateien.

### 4.1 Bestand (bereits vorhanden — als Basisschutz erhalten, nicht ersetzen)

| Datei · Zeile | Test | Deckt ab |
|---|---|---|
| `docx/__tests__/roundtrip.test.ts:261` | „preserves merged cells (colspan)" | Reiner Spalten-Merge (`colspan:2, rowspan:1`), Writer→eigener-Reader |
| `docx/__tests__/roundtrip.test.ts:279` | „preserves vertically merged cells (rowspan)" | Reiner Zeilen-Merge (`colspan:1, rowspan:2`) |
| `odt/__tests__/roundtrip.test.ts:251` | „preserves merged cells (colspan/rowspan)" | Attribut-Prüfung nach Reimport |
| `odt/__tests__/roundtrip.test.ts:275` | „…covered-table-cell … horizontal (colspan) merge" | **Rohe** `content.xml`-Struktur, `covered-table-cell` je Zeile |
| `odt/__tests__/roundtrip.test.ts:310` | „…covered-table-cell … vertical (rowspan) merge" | **Rohe** `content.xml`-Struktur, `covered-table-cell` in Folgezeile |

**Lücke, die diese Tests offen lassen (und die Fehler 1 verdeckt hielt):** **keiner**
kombiniert `colspan>1` **und** `rowspan>1` auf **einer** Zelle. Genau das ergänzt DR1–DR3.

### 4.2 Neu: `src/formats/shared/editor/__tests__/table-merge-commands.test.ts` (Vitest, echte `EditorState`)

Echte `EditorState`/`EditorView` in jsdom, **mit** `history()`-Plugin; `mergeCells`/
`CellSelection`/`TextSelection`/`isInTable` direkt importiert (kein Mock).

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status |
|---|---|---|---|---|
| **M-bare** | **Vorstufe (Fehler 2, heute ausführbar, ohne App-Code)** | Tabelle mit zwei Zellen „AAA"/„BBB", `CellSelection` über beide, **nackter** `mergeCells(state, dispatch)` aus `prosemirror-tables`, danach `insertText('X')` | Nach dem Tippen ist der Dokumenttext **nur `"X"`** — beide Originalinhalte gelöscht | **Muss so ROT/„belegend" sein** — sonst ist die Bibliotheks-Falle nicht real und der Fix unnötig. **Erster Test des gesamten Plans** (Abschnitt 10). |
| M1 | Zwei horizontale Zellen verbinden | 2×2-Tabelle, `CellSelection` (0,0)–(0,1), `mergeSelectedCells()(state, dispatch)` | `colspan:2`, beide Textinhalte erhalten (Testfall 2/§3.1) | Blockiert bis `commands.ts` den Befehl exportiert |
| M2 | Zwei vertikale Zellen verbinden | `CellSelection` (0,0)–(1,0) | `rowspan:2` (Testfall 3) | Blockiert |
| M3 | 2×2-Rechteck verbinden | `CellSelection` (0,0)–(1,1) | `colspan:2` **und** `rowspan:2` (Testfall 4) | Blockiert |
| M4 | 2×3- und 3×3-Rechteck | Größere Ausgangstabellen | Beide Attribute korrekt (Testfall 5) | Blockiert |
| **M5** | **Regression Fehler 2 (gefixter Pfad, Kontrast zu M-bare)** | Wie M-bare, aber über `mergeSelectedCells`, danach `insertText('X')` | Dokumenttext enthält **beide** Originalinhalte **und** `X` angehängt (nicht nur `"X"`) | **ROT ohne den Fix aus Code-Plan §4.1**, GRÜN mit Fix |
| **M6** | Selektion nach Merge ist `TextSelection` | Direkter Test des Fixes | `tr.selection instanceof TextSelection === true` nach `mergeSelectedCells` (keine `CellSelection`) | ROT ohne Fix, GRÜN mit Fix |
| M7 | Einzelzelle / reine Textauswahl | `mergeSelectedCells()(state)` **ohne** `dispatch` | Liefert `false`, kein `dispatch` (Testfall 9/§3.7) | Blockiert |
| M8 | Nicht-rechteckige/überlappende Auswahl | `CellSelection`, die eine bereits verbundene Zelle nur anschneidet | `mergeSelectedCells()(state)` → `false` (Testfall 8/§3.6) | Blockiert |
| M9 | Bereits verbundene Zelle (2×1) + Nachbar erneut verbinden | M1, dann `CellSelection` über neue 2×1-Zelle + Nachbar, erneut mergen | Ergebnis 2×2, keine Exception, `colCount` konsistent (Testfall 10/§3.8) | Blockiert |
| M10 | Kopfzeilen-Grenzfall (Grenzfall 12/Code-Plan §5.5) | Handgebauter `table_header`+`table_cell`, je Anker=Kopf / Anker=Datenzelle | Node-Typ = Typ der **Anker**-Zelle in beiden Richtungen (kein stiller Typverlust) | Blockiert |
| M11 | Gesamte Tabelle zu einer Zelle | `CellSelection` über alle Zellen (3×3) | 1×1 mit gesamtem Inhalt in Lesereihenfolge, editierbar (Grenzfall 2/Testfall 12) | Blockiert |
| M12 | Inhaltszusammenführung, gemischter Inhalt | Leer + 2-Absatz-Zelle + fett/kursiv/farbige Zelle verbinden | Alle **nicht-leeren** Inhalte in Lesereihenfolge in der Ankerzelle, Marks je Absatz erhalten, leere Zelle trägt nichts bei (Testfall 5/Grenzfälle 4/11, §3.4/Verdachtsmoment 6) | Blockiert |
| M13 | Ein-Transaktions-Undo | Nach M1 einmal `undo` (aus `prosemirror-history`) | Originalzellen exakt wiederhergestellt in **einem** Schritt; `redo` stellt Merge her (§3.12/Testfall 10) | Blockiert |

### 4.3 Ergänzt: `src/formats/docx/__tests__/roundtrip.test.ts` (Fehler 1)

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status |
|---|---|---|---|---|
| **DR1** | **Regression Fehler 1 — kombinierter 2×2-Merge** | `table_cell` mit `colspan:2, rowspan:2` im 3×3-Gitter von Hand bauen, `writeDocx` → `readDocx` | `rowspan === 2` nach Rundreise (nicht `3`) | **ROT vor Fix** (`docx/reader.ts`), GRÜN nach Fix — **heute ausführbar, ohne UI** |
| DR2 | 3×3-Merge (`colspan:3, rowspan:3`) | Analog DR1 | `rowspan === 3` (nicht `7`) | **ROT vor Fix** (Testfall 5) |
| DR3 | 2×3-Merge (`colspan:2, rowspan:3`) | Analog | `rowspan === 3` (nicht `5`) | **ROT vor Fix** |
| DR4 | Reiner Spalten-Merge unverändert korrekt (Nicht-Regression) | Bestehender Test :261 nach Fix | Weiterhin `colspan:2` | GRÜN, auch nach Fix (Fix darf reinen Fall nicht brechen) |
| DR5 | Reiner Zeilen-Merge unverändert korrekt | Bestehender Test :279 nach Fix | Weiterhin `rowspan:2` | GRÜN, auch nach Fix |
| DR6 | Verschachtelte Tabelle mit innerem 2×2-Merge | Innere Tabelle in `table_cell`, Rundreise | Kein Absturz, `MAX_TABLE_NESTING_DEPTH=25` nicht verletzt, innere Spannen korrekt (Grenzfall 6) | GRÜN erwartet (nach DR1-Fix); bisher kein Test |

### 4.4 Ergänzt: `src/formats/odt/__tests__/roundtrip.test.ts` (Einfrier-Tests der bereits korrekten Ausgabe)

**Wichtig:** Diese Tests sind **GRÜN** — der ODT-Writer ist bereits korrekt (Abschnitt 0/1).
Ihr Zweck ist, die korrekte `covered-table-cell`-/`colCount`-Ausgabe **einzufrieren**, damit
sie durch spätere Änderungen nicht unbemerkt bricht — **nicht**, einen vermuteten Fehler zu
belegen (das war der Irrtum der vorigen Fassung).

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status |
|---|---|---|---|---|
| OR1 | **Kombinierter** 2×2-Merge, rohe `content.xml` | `colspan:2, rowspan:2` exportieren, per JSZip Zeilenstruktur prüfen | Je Zeile gilt `#table-cell + #covered-table-cell == colCount`; Zeile 1 und Zeile 2 enthalten `covered-table-cell` an den korrekten Positionen | **GRÜN heute** (schließt die von 4.1 offen gelassene Kombinationslücke auf ODT-Seite) |
| OR2 | Reimport der kombinierten Ausgabe | `writeOdt` → `readOdt` auf OR1-Struktur | `colspan:2, rowspan:2` korrekt reimportiert (bestätigt, dass Reader `covered-table-cell` korrekt überspringt) | GRÜN heute |
| OR3 | `colCount` in der **ersten** Zeile bei reinem `colspan` | Zwei Zellen der ersten Zeile `colspan:2` + 1 Zelle daneben (3 Gitterspalten) | Export enthält exakt 3 `<table:table-column/>` | GRÜN heute (friert die korrekte, colspan-gewichtete `colCount`-Berechnung ein) |
| OR4 | 2×3-/3×3-Rechteck, rohe Struktur | Analog OR1 | Korrekte Anzahl `covered-table-cell` je Zeile/Spalte | GRÜN heute |
| OR5 | Verschachtelte Tabelle mit Merge | Analog DR6 für ODT | Kein Absturz, innere Struktur korrekt (Grenzfall 6) | GRÜN erwartet; bisher kein Test |

### 4.5 Neu/ergänzt: `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts`

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status |
|---|---|---|---|---|
| XF1 | DOCX→ODT→DOCX, horizontal **und** vertikal kombiniert | `readDocx(writeDocx)` → `readOdt(writeOdt)` → `readDocx(writeDocx)` | `colspan`/`rowspan` beider Merge-Arten über beide Konvertierungen erhalten (Testfall 17) | **Blockiert durch DR1** (kombinierter Fall ist exakt der von Fehler 1 betroffene) |
| XF2 | ODT→DOCX→ODT, spiegelbildlich | Analog XF1 | Analog (Testfall 17) | Blockiert durch DR1 |
| XF3 | Doppelte Rundreise DOCX→ODT→DOCX + Fett/Farbe/mehrere Absätze | Wie XF1, zusätzlich `strong`/`textColor`-Marks und Mehrfach-Absatz-Zellen | Kein kumulativer Verlust von Struktur **oder** Marks über zwei Konvertierungen (Testfall 18) | Blockiert durch DR1 |
| XF4 | Cross-Format einer **verschachtelten** Tabelle mit Merge | DOCX (Tabelle-in-Zelle, innerer Merge) → ODT → DOCX | Kein Datenverlust/Absturz (Rundreise-Anforderung Punkt 10) | GRÜN nach DR6/OR5, sonst blockiert |

### 4.6 Neu: `src/formats/docx/__tests__/merge-fixtures.test.ts`

Dediziert (nicht in `external-fixtures.test.ts`, das bewusst nur „importiert ohne Absturz" prüft).

| # | Testfall | Erwartung | Erwarteter Status |
|---|---|---|---|
| FD1 | `bug57031.docx` (verifiziert: `gridSpan`=12, `vMerge`=8) importieren | JSON enthält ≥1 Zelle mit `colspan>1` **und** ≥1 mit `rowspan>1` (nicht nur „ohne Fehler") | GRÜN erwartet (reiner Import) |
| FD2 | `bug57031.docx` unverändert reexportieren → reimportieren | Identische `colspan`/`rowspan` an denselben Textpositionen (Rundreise-Anforderung Punkt 1, Testfall 19; Verdachtsmoment 9) | GRÜN, **sofern keine Zelle beide Attribute kombiniert** — sonst blockiert durch DR1 (vorab per JSZip-Rohinspektion klären, Abschnitt 11) |
| FD3 | Eignungs-Dokumentationstest `TestTableColumns`/`TestTableCellAlign`/`table-alignment`.docx | Bestätigt: `TestTableColumns` nur triviales `gridSpan`, die anderen beiden **keine** Merges — als Merge-Fixtures **ungeeignet**, verhindert Fehlnutzung | GRÜN (reine Dokumentation) |
| FD4 | `bug65649.docx` (0,45 MB, `SKIP_SLOW_UNDER_JSDOM`) | **Nicht** als jsdom-Unit-Test — nur als E2E-Performance-Fixture (T34) | Bewusst **nicht** Teil dieser Datei |

### 4.7 Neu: `src/formats/odt/__tests__/merge-fixtures.test.ts`

| # | Testfall | Erwartung | Erwarteter Status |
|---|---|---|---|
| FO1 | `mergedCells.odt` (verifiziert: `colspan`, **0×** covered — reale Datei ohne verdeckte Zelle) importieren | Zelle mit `colspan:2` vorhanden (Testfall 20/Grenzfall 13) | GRÜN erwartet (reiner Import; Reader liest `colspan` aus der Ankerzelle, verdeckte Zelle nicht nötig) |
| FO2 | `mergedCells.odt` unverändert reexportieren → reimportieren | Re-Export **ergänzt** `covered-table-cell` (Normalisierung); nach der ersten Rundreise keine Spaltenverschiebung, Struktur stabil (Grenzfall 13, Testfall 20) | GRÜN erwartet (Writer bereits korrekt) |
| FO3 | `tableCoveredContent.odt` (verifiziert: 33× covered) importieren | Je Zeile korrekte Anzahl **echter** Zellen (keine Spaltenverschiebung durch `covered-table-cell`-Geschwister) | GRÜN — **muss** grün sein, sonst wäre die „bereits korrekte" Reader-Seite widerlegt (Testfall 20/Verdachtsmoment 8) |
| FO4 | `tableCoveredContent.odt` unverändert reexportieren | Rohe exportierte `content.xml` enthält an den vom Original vorgegebenen Positionen ebenfalls `covered-table-cell` (Rundreise gegen eine **fremd-erzeugte** Datei) | GRÜN erwartet (Writer bereits korrekt) |
| FO5 | `table-column-delete-with-merge.odt` (covered=5) / `-2-times.odt` (covered=7) importieren | Kein Absturz, Inhalt lesbar, `colspan`/`rowspan` plausibel (Grenzfall 9) | GRÜN erwartet (reiner Import) |
| FO6 | dieselben Dateien unverändert reexportieren/reimportieren | Kein zusätzlicher Verlust gegenüber dem ersten Import (Testfall 21, Rundreise-Anforderung Punkt 9) | GRÜN erwartet (Writer bereits korrekt) |

### 4.8 Grenzen der Unit-Test-Ebene (bewusst nur in Teil B geprüft)

Diese Prüfungen sind auf Unit-Ebene **nicht** sinnvoll und werden ausschließlich in
Abschnitt 5 abgedeckt (damit niemand versucht, sie fälschlich als jsdom-Test nachzurüsten):

- **Sichtbares CSS-Overlay der Mehrzellen-Selektion** (Menüpunkt 3/Testfall 1): erfordert
  echtes Rendering + `getComputedStyle` auf einem `:after`-Pseudo-Element — jsdom rendert
  kein Layout (analog zur `getComputedStyle`-Grenze in `ausrichtung-zentriert-qa.md`).
- **Entstehung** einer `CellSelection` aus echten `mousedown`/`mousemove`-Events: in jsdom
  nicht realistisch simulierbar — nur die **Konsequenz** einer bereits bestehenden
  `CellSelection` ist auf Modellebene testbar (M1–M13).
- **Tab-Fokus-Navigation** (Menüpunkt 9/Testfall 29): erfordert echten DOM-Fokuswechsel.
- **UI-Reaktionsfähigkeit bei großen Tabellen** (Grenzfall 10/Testfall 28): echte
  Rendering-Performance, kein jsdom-Äquivalent.

---

## 5. Teil B — Echte Playwright-Browser-Tests

**Grundsatz (bindend, wortgleich mit dem Auftrag):** Kein Testfall in Teil B darf durch
direkten Aufruf interner Funktionen (`mergeSelectedCells(...)`, `mergeCells(...)`,
`readDocx(...)` etc.) im Node-Kontext ersetzt werden. Jeder Testfall läuft über echte
Nutzer:innen-Handlungen: `locator.click()`, echtes `page.mouse.down()/move()/up()`-Drag
über Zellgrenzen (mehrere Zwischenschritte, Abschnitt 3 Punkt 5),
`page.keyboard.press(...)`/`.type(...)`, `input.setInputFiles(...)` bzw. echtes
`filechooser`-Event, `page.waitForEvent('download')` + Auslesen der heruntergeladenen Datei
vom Dateisystem und Prüfung mit einem vom eigenen Reader **unabhängigen** Parser
(JSZip + `DOMParser`, **nicht** nur String-`.toContain`, Abschnitt 5.5).

### 5.1 Neue Datei: `tests/e2e/table-merge.spec.ts`

Struktur analog `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
(`docxCard`/`odtCard`, `buildSampleDocx`/`buildSampleOdt` für Handdaten, reale Buffer per
`fs.readFile`). `page.on('pageerror', ...)` in jedem Test registrieren und am Ende leer
verlangen (kein stiller Absturz). **Vorbehalt für den gesamten Abschnitt:** Da laut
Abschnitt 1 aktuell **kein** UI-Element existiert, sind alle Tests T2 ff. vor Umsetzung von
Code-Plan §4.1–4.4 nicht nur „rot", sondern **nicht ausführbar** (Locator liefert 0
Elemente → Timeout). Das ist je Zeile als „Blockiert: Button existiert nicht" markiert.

#### 5.1.1 Sichtbare Mehrzellen-Selektion — Voraussetzungstest (Menüpunkt 3, Testfall 1)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T1 | Zwei Nachbarzellen per echtem Maus-Drag markieren | 2×2 einfügen, in beide Zellen Text tippen, `mouse.move` in Zelle (0,0), `mouse.down`, mehrere `mouse.move` bis Zelle (0,1), `mouse.up` | `page.locator('.ProseMirror .selectedCell')` → `toHaveCount(2)` (Decoration heute aktiv); **zusätzlich** `toHaveCSS`-Prüfung des sichtbaren Overlays (`background-color` ≠ `rgba(0, 0, 0, 0)`) | **Decoration-Teil: GRÜN heute; CSS-Overlay-Teil: ROT vor `index.css`-Fix** (muss vor dem CSS-Fix nachweislich fehlschlagen, sonst hat der Test keine Aussagekraft) |

#### 5.1.2 Horizontal / vertikal / rechteckig verbinden (§3.1–3.3, Testfälle 2–4)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T2 | Horizontaler Merge (Drag + Klick) | Nach T1-Drag: auf Selektion warten (Abschnitt 3.4), „Zellen verbinden" klicken | `.ProseMirror td` mit `colspan="2"`, Text beider Zellen über volle Breite | Blockiert: Button existiert nicht |
| T3 | Vertikaler Merge über zwei Zeilen | Drag (0,0)→(1,0), verbinden | `rowspan="2"` (Testfall 3) | Blockiert |
| T4 | 2×2-Rechteck (**E2E-Regression Fehler 1**) | Drag (0,0)→(1,1), verbinden, exportieren, Download parsen | `colspan="2"` **und** `rowspan="2"` im Editor; nach Export/Reimport bleibt `rowspan=2` (nicht 3) | Blockiert: Button; danach zusätzlich blockiert durch DR1, bis Reader-Fix steht |
| T5 | 2×3-/3×3-Rechteck | Größere Tabelle, entsprechende Drags | `colspan`/`rowspan` korrekt (Testfall 5) | Blockiert |

#### 5.1.3 Inhaltszusammenführung + kritischster Test (§3.4/3.5, Testfälle 5–6)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T6 | Gemischter Inhalt verbinden | 2×2: A leer, B ein Absatz, C mehrere Absätze, D fett/kursiv/farbig; alle vier markieren, verbinden | Alle nicht-leeren Inhalte in Lesereihenfolge in der Ankerzelle; Marks erhalten (`toHaveCSS('font-weight', '700')` auf dem fetten Abschnitt); leere Zelle trägt nichts bei (Testfall 5) | Blockiert |
| **T7** | **KRITISCHSTER TEST (Fehler 2, Anforderung §7 Testfall 6)** — sofortiges Tippen nach Merge | Zwei Zellen „AAA"/„BBB" markieren, verbinden; **Merge-Sync abwarten** (`waitForTimeout(50)` + `expect(td[colspan="2"]).toBeVisible()`), dann **ohne weiteren Klick** `page.keyboard.type('X')` | Editor zeigt weiterhin „AAA"/„BBB" **plus** angehängtes `X` — **nicht** nur `X` | **ROT ohne Fix** (Code-Plan §4.1); Blockiert bis Button existiert. **Wichtigster Einzeltest**, muss vor jedem Release grün sein. Determinismus zwingend (Abschnitt 3 Punkt 3). |

#### 5.1.4 Deaktivierungslogik / Guards (§3.6/3.7, Testfälle 7–8)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T8 | Nicht-rechteckige/überlappende Auswahl | Erst 2×1-Merge, dann eine „Ecke" davon + eine nicht vollständig einschließende Nachbarzelle markieren | Button bleibt `disabled` (`expect(button).toBeDisabled()`) **oder** sichtbare Fehlermeldung — kein stiller No-Op (Testfall 7/§3.6) | Blockiert |
| T9 | Nur eine einzelne Zelle / reine Textauswahl | Cursor in eine Zelle, keine Mehrzellen-Selektion | `expect(page.getByRole('button', { name: 'Zellen verbinden' })).toBeDisabled()` (Testfall 8/§3.7) | Blockiert |

#### 5.1.5 Erweitern eines bestehenden Merges (§3.8, Testfall 9)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T10 | 2×1-Zelle + Nachbar erneut verbinden | Nach 2×1-Merge: Drag über neue Zelle **und** Nachbar, erneut verbinden | Ergebnis 2×2, `pageerror`-Log leer (Testfall 9/§3.8) | Blockiert |

#### 5.1.6 Undo/Redo (§3.12, Testfall 10)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T11 | Strg+Z direkt nach Merge | Merge, Merge-Sync abwarten, **ein** `ControlOrMeta+z` | Originalzellen mit exaktem Inhalt in **einem** Schritt wiederhergestellt (kein Doppel-Undo) | Blockiert |
| T12 | Strg+Y (Redo) | Direkt nach T11: `ControlOrMeta+y` | Merge wiederhergestellt | Blockiert |

#### 5.1.7 Randfälle und Grenzfälle (Abschnitt 4, Testfälle 11–13)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T13 | Verbinden am Tabellenrand | Vier Sub-Fälle je an einer Kante (erste/letzte Zeile, erste/letzte Spalte) | Identisches Verhalten wie in der Mitte, danach editierbar (Grenzfall 1/Testfall 11) | Blockiert |
| T14 | Gesamte Tabelle zu einer Zelle | Alle Zellen einer 3×3 markieren, verbinden, exportieren | Ergebnis editierbar **und** exportierbar (Download erfolgreich, Grenzfall 2/Testfall 12) | Blockiert |
| T15 | Verschachtelte Tabelle verbinden | Tabelle in eine Zelle einfügen, innere Zellen verbinden | Kein Absturz (`pageerror` leer), Inhalt lesbar (Grenzfall 6/Testfall 13) | Blockiert |

#### 5.1.8 Selection-Sync-Regression (§3.13, Testfall 14 — Pflicht DoD 5)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T16 | Merge → Klick außerhalb → Enter → tippen (analog `selection-regression.spec.ts`, mit Merge als Auslöser) | Tabelle mit Merge, Klick in einen Absatz außerhalb, **`waitForTimeout(50)`** (Abschnitt 3 Punkt 3), `Enter`, `type(...)` | Kein Dokumentinhalt geht verloren; `.ProseMirror p` hat die erwartete Anzahl, neuer Text an richtiger Position (Testfall 14) | Blockiert; **Pflichtbestandteil DoD 5**, dauerhaft in der Suite |

#### 5.1.9 Rundreisen über echten Upload/Download (Abschnitt 5, Testfälle 15–24)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T17 | DOCX-Rundreise nach eigener Bearbeitung, horizontal **und** vertikal (Testfall 15) | Neue Tabelle, horizontalen + vertikalen (bzw. kombinierten) Merge per Button, exportieren (Download abfangen), heruntergeladene Datei per `setInputFiles` erneut hochladen | `colspan`/`rowspan` + exakter Text nach Reimport erhalten | Blockiert: Button; bei kombiniertem Merge zusätzlich abhängig von DR1-Fix |
| T18 | **ODT-Rundreise nach eigener Bearbeitung** (Testfall 16) | Analog T17 für ODT-Karte; exportierte Datei per JSZip auf `<table:covered-table-cell/>` an den verdeckten Positionen prüfen (nicht nur reimportierte Attribute) | `covered-table-cell` an allen verdeckten Positionen (deckt Verdachtsmoment 7 für den **UI-erzeugten** Merge) | Blockiert: Button; ODT-Writer bereits korrekt, daher **nur** Button-abhängig |
| T19 | Cross-Format DOCX → ODT (Testfall 17) | Tabelle mit horizontalem **und** vertikalem Merge in DOCX-Karte, exportieren, Datei in ODT-Karte hochladen, erneut exportieren | Beide Merge-Arten über den Formatwechsel erhalten | Blockiert: Button + Cross-Format-Pfad-Klärung (Abschnitt 11) |
| T20 | Cross-Format ODT → DOCX (Testfall 17) | Spiegelbildlich zu T19 | Analog | Wie T19 |
| T21 | Doppelte Cross-Format-Rundreise DOCX→ODT→DOCX + Fett/Farbe/Absätze (Testfall 18) | Kette wie T19/T20, zweimal, mit Formatierung | Kein kumulativer Verlust der Struktur (DOMParser-Prüfung auf dem letzten Download) | Blockiert, wie T19 |
| T22 | **Reale DOCX `bug57031.docx`** (Testfall 19) | Per `setInputFiles` **und** einmal per echtem `filechooser` (Abschnitt 5.3) hochladen → unverändert exportieren → JSZip + `DOMParser` auf `word/document.xml` | ≥1 `gridSpan`, ≥1 `vMerge`, nach Export identisch zum Import | GRÜN, sofern keine kombinierte Zelle betroffen — sonst blockiert durch DR1 |
| T23 | **Reale ODT `tableCoveredContent.odt`** (Testfall 20) | Hochladen → unverändert exportieren → reimportieren; zusätzlich `mergedCells.odt` (ohne covered, Grenzfall 13) | Zellstruktur identisch; `mergedCells.odt` ohne Spaltenverschiebung nach Re-Export | GRÜN erwartet (Reader/Writer bereits korrekt); nur der Import-Teil ist Button-unabhängig |
| T24 | `table-column-delete-with-merge.odt` **und** `-2-times.odt` (Testfall 21) | Beide hochladen → Import ohne Absturz → unverändert exportieren/reimportieren | Kein zusätzlicher Verlust gegenüber dem ersten Import (Grenzfall 9) | GRÜN erwartet (Import + unveränderte Rundreise, Merge-Feature nicht nötig) |

#### 5.1.10 Kopfzeile, unabhängige Validierung, Icon, Kürzel, Performance (Testfälle 22–28)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| T25 | Kopfzeilen-/Datenzellen-Merge (Testfall 22/Grenzfall 12) | **Aktuell nicht end-to-end durchführbar:** weder `docx/reader.ts` noch `odt/reader.ts` erzeugen je `table_header`-Knoten (`grep -rn "table_header" src/` → nur Schema) | — | **Dauerhaft dokumentiert als „nicht über die Oberfläche testbar"**, solange kein Kopfzeilen-Reader-Support existiert — ersatzweise durch M10 (Unit) abgedeckt |
| T26 | **Unabhängige Validierung DOCX-Export** (Testfall 23) | Nach T17: `word/document.xml` mit `DOMParser` auf schemakonforme `<w:gridSpan>`/`<w:vMerge>` in `<w:tcPr>` prüfen; wenn CI-Werkzeug verfügbar, zusätzlich `python-docx`/OOXML-Schema (Abschnitt 11) | Struktur OOXML-konform | Blockiert, wie T17 |
| T27 | **Unabhängige Validierung ODT-Export** (Testfall 24) | Nach T18: `content.xml` mit `DOMParser` auf `number-columns-spanned`/`number-rows-spanned` **und** `covered-table-cell` an exakten Positionen; wenn verfügbar, headless LibreOffice (Abschnitt 11) | Alle drei ODF-schemakonform | Blockiert, wie T18 |
| T28 | **E2E über echte Toolbar-Bedienung — Primärnachweis DoD 5** | = Summe T1+T2 (echter Drag + Klick + visuelle Prüfung + Export/Reimport aus T17) | Benannter Sammelnachweis, dass mindestens ein Playwright-Test über echte Browser-Bedienung dauerhaft verankert ist (Testfall 25) | Blockiert: Button |
| T29 | Icon-Erkennbarkeit (Testfall 26) | Screenshot von „Zellen verbinden"-Button neben „Tabelle einfügen"-Button | Beide Symbole unterscheidbar (eigenes SVG `MergeCellsIcon` vs. `⊞`, Code-Plan §5.2) — dokumentierend, kein Auto-Pass/Fail | Blockiert; danach dokumentierend |
| T30 | Tastenkürzel-Dokumentationstest (Testfall 27) | Laut Code-Plan §5.3 **kein** Kürzel für V1: prüft **negativ**, dass ein erfundenes Kürzel (`ControlOrMeta+m`) **nichts** auslöst | Bestätigt die bewusste Entscheidung „kein Kürzel" (Menüpunkt 7) | Dokumentierend, sobald Entscheidung final |
| T31 | Tab-Navigation nach Merge (Testfall 29) | 2×1-Merge, Cursor hinein, `page.keyboard.press('Tab')` | Fokus/Cursor in die nächste **echte**, nicht verdeckte Zelle (via `page.evaluate` auf ProseMirror-`state.selection`) | **ROT/„nicht funktionsfähig" — Tab-Navigation fehlt heute im gesamten Editor** (Abschnitt 1). Erst prüfbar, wenn `goToNextCell` verdrahtet ist (Code-Plan §5.6); sonst als „abhängig/zurückgestellt" dokumentiert |
| T32 | Performance mit `BigTable.odt` (Testfall 28/Grenzfall 10) | Upload, große Fläche markieren, verbinden | UI reaktionsfähig, Zeitschranke (z. B. < 3 s bis Button wieder reagiert), kein Timeout | Blockiert; separater Performance-Rauchtest |
| T33 | Performance-Stress `bug65649.docx` (0,45 MB, viele Merges) | Upload, lange Zellauswahl verbinden (Muster `large-document-import.spec.ts`) | Kein spürbares Einfrieren | Blockiert; von den funktionalen Tests getrennt |

### 5.2 Bestehende Tests, die unverändert weiterlaufen müssen

- `tests/e2e/selection-regression.spec.ts` (alle vier Tests) — **Pflicht**, unverändert.
  Nach jeder Änderung an `Toolbar.tsx`/`commands.ts`/`WordEditor.tsx` erneut ausführen, um
  sicherzustellen, dass der bestehende Fett-/Tabellen-Selektions-Regressionsschutz nicht
  beschädigt wurde (der zweite Test dort operiert bereits in einer Tabelle).
- `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts` — bleiben bestehen; keine
  Merge-Assertions, keine Überschneidung.
- `tests/e2e/lifecycle.spec.ts` — unverändert, muss Teil der Dauer-Suite bleiben.

### 5.3 Datei-Upload: echter `filechooser` zusätzlich zu `setInputFiles`

`setInputFiles` direkt auf den versteckten `<input type="file">` testet Reader/Wiring, nicht
die tatsächliche Bedienung. Mindestens **zwei** Testfälle (T22 für DOCX, T23 für ODT) nutzen
den echten sichtbaren Klickpfad über „Datei hochladen" (`FormatPicker.tsx:79/82`):

```ts
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  docxCard(page).getByRole('button', { name: 'Datei hochladen' }).click(),
])
await fileChooser.setFiles({ name: 'bug57031.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
```

Die schnellere `setInputFiles`-Variante bleibt für alle übrigen Testfälle Standard — kein
Widerspruch, nur Ergänzung.

### 5.4 Unabhängige Prüfung der heruntergeladenen Datei (nicht nur `.toContain`)

Für strukturelle Export-Assertionen (insbesondere T18/T27, wo **welche** Zellposition
**welches** Element trägt, entscheidend ist) wird verbindlich verlangt:

```ts
import { JSDOM } from 'jsdom' // bereits Devdependency
const parser = new JSDOM('').window.DOMParser()
const xmlDoc = parser.parseFromString(contentXml, 'application/xml')
const T_NS = 'urn:oasis:names:tc:opendocument:xmlns:table:1.0'
const rows = [...xmlDoc.getElementsByTagNameNS(T_NS, 'table-row')]
const firstRowChildren = [...rows[0].children].map((el) => el.localName)
expect(firstRowChildren).toEqual(['table-cell', 'covered-table-cell', 'table-cell'])
```

Reine String-Suche (`expect(contentXml).toContain('<table:covered-table-cell/>')`) genügt
**nicht**, wenn — wie bei T18/T27 — die exakte **Reihenfolge und Position** mehrerer
gleichartiger Elemente je Zeile geprüft werden muss. Für DOCX analog mit dem
`w`-Namensraum auf `<w:tc>`/`<w:tcPr>`/`<w:gridSpan>`/`<w:vMerge>`.

### 5.5 Cross-Browser-Matrix

| Testgruppe | Desktop Chrome | Mobile (Pixel 7) | Tablet (iPad Mini) | Anmerkung |
|---|---|---|---|---|
| Klick-/Tipp-basiert (T2, T6–T30, T32/T33) | Pflicht | Pflicht | Pflicht | `.click()`/`.type()` projektunabhängig |
| Maus-Drag (T1, T3–T5, T8) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | `mouse.down/move/up` emuliert Touch technisch korrekt, echtes Finger-Drag ist gesondert zu dokumentieren |
| Tastatur-only (T11/T12, T30, T31) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | `keyboard.press` geräteunabhängig; Touch ohne Hardware-Tastatur gesondert dokumentieren |
| Performance (T32, T33) | Pflicht | Pflicht | Pflicht | Zeitbudget je Projekt kalibrieren, Mobile/Tablet ggf. langsamer |

---

## 6. Traceability (Anforderung §7, Testfälle 1–29 → Testfälle in diesem Plan)

| Anforderung Testfall # | Testfall(e) in diesem Plan |
|---|---|
| 1 | T1 |
| 2 | T2, M1 |
| 3 | T3, M2 |
| 4 | T4, M3, DR1, OR1 |
| 5 | T5, M4, DR2, DR3, OR4 |
| 6 (kritisch, Tippen nach Merge) | **T7, M-bare, M5, M6** |
| 7 (nicht-rechteckig) | T8, M8 |
| 8 (Einzelzelle) | T9, M7 |
| 9 (bereits verbunden + Nachbar) | T10, M9 |
| 10 (Undo/Redo) | T11, T12, M13 |
| 11 (Rand) | T13 |
| 12 (ganze Tabelle) | T14, M11 |
| 13 (verschachtelt) | T15, DR6, OR5 |
| 14 (Selection-Sync) | T16 |
| 15 (DOCX-Rundreise eigene Bearbeitung) | T17, XF1 (Teilaspekt) |
| 16 (ODT-Rundreise eigene Bearbeitung) | T18, OR1, OR4 |
| 17 (Cross-Format DOCX↔ODT) | T19, T20, XF1, XF2 |
| 18 (doppelte Cross-Format + Marks) | T21, XF3 |
| 19 (reale DOCX `bug57031`) | T22, FD1, FD2 |
| 20 (reale ODT `tableCoveredContent`/`mergedCells`) | T23, FO1–FO4 |
| 21 (`table-column-delete-with-merge*`) | T24, FO5, FO6 |
| 22 (Kopfzeile) | T25, M10 |
| 23 (unabh. Validierung DOCX) | T26 |
| 24 (unabh. Validierung ODT) | T27, OR1 |
| 25 (E2E echte Bedienung) | T28 (Sammelnachweis aus T1/T2/T17) |
| 26 (Icon) | T29 |
| 27 (Kürzel/Kontextmenü) | T30 |
| 28 (Performance) | T32, T33, FD4 |
| 29 (Tab nach Merge) | T31 (abhängig, siehe Abschnitt 11) |

---

## 7. Verdachtsmomente (Anforderung §6, 1–11) und Fehler (Code-Plan §2) → QA-Einstufung

| # | Verdachtsmoment / Fehler | QA-Einstufung | Testfall(e) |
|---|---|---|---|
| VM 1 | Komplettes Fehlen der Bedienoberfläche | **Bestätigt** (0 Treffer für `mergeCells`/`Verbinden` in `src/`) — blockiert Teil B | T2–T33 (als „Blockiert: Button" geführt) |
| VM 2 | `mergeCells`/`splitCell` ungenutzt | Bestätigt, reine Verdrahtungsaufgabe | M1–M13 |
| VM 3 | Keine visuelle Rückmeldung für Mehrzellen-Selektion | **Präzisiert:** JS-Decoration `selectedCell` bereits aktiv (`tableEditing()`), **nur CSS** fehlt | T1 |
| VM 4 | Rechteck-Zwang ohne UI-Rückmeldung | Bestätigt; `cellsOverlapRectangle` liefert `false`, nur UI-`disabled` fehlt | T8, M8 |
| VM 5 | `CellSelection` statt Text-Cursor nach Merge | **= Fehler 2 (Code-Plan), bestätigt als echter Bug** — kritischster Einzeltest | **T7, M-bare, M5, M6** |
| VM 6 | Inhaltszusammenführungs-Reihenfolge nicht produktseitig bestätigt | Als Produktentscheidung übernommen (Code-Plan §5.1), von QA per Test verifiziert | T6, M12 |
| VM 7 | Vermuteter ODF-Schema-Verstoß beim Export (fehlendes `covered-table-cell`) | **ERLEDIGT/VORHANDEN — Verdacht widerlegt.** `odt/writer.ts` schreibt `covered-table-cell` für beide Achsen; **kein Fix.** Hier nur als Einfrier-Test + für den **UI-erzeugten** Merge nachzuweisen | OR1–OR4, T18, T27, FO4 (alle GRÜN erwartet) |
| VM 8 | ODT-Import von `covered-table-cell` plausibel, unverifiziert | Wird durch FO3/T23 gegen `tableCoveredContent.odt` (33× covered) **erstmals real verifiziert** | T23, FO3 |
| VM 9 | DOCX-`vMerge`-Anker-Tracking nur gegen eigenen Schreiber getestet | **Präzisiert zu Fehler 1:** kein reines „ungetestet", sondern ein konkreter, mit der eigenen Kette reproduzierbarer Bug bei kombiniertem `colspan`+`rowspan` | DR1–DR3, T4, T17, FD2 |
| VM 10 | Kein E2E-Test verbindet über die UI | Bestätigt; behoben durch `table-merge.spec.ts` | Gesamter Abschnitt 5 |
| VM 11 | Backlog „fehlt" trifft nur UI, nicht Persistenz | Bestätigt — aber Persistenz enthält **einen** realen Bug (Fehler 1); die Einschätzung „nur ungetestet" war zu optimistisch | DR1, Abschnitt 1 |
| Fehler 1 (Code-Plan §2.1) | Kombinierter Merge → zu hoher `rowspan` nach DOCX-Rundreise | **Von QA unabhängig zu reproduzieren** (DR1), bevor bestätigt | DR1, DR2, DR3, T4, T17 |
| Fehler 2 (Code-Plan §2.2) | `CellSelection` nach Merge löscht Inhalt bei sofortigem Tippen | **Von QA unabhängig zu reproduzieren** (M-bare), bevor bestätigt | T7, M-bare, M5, M6 |

**Nicht als „Fehler" geführt (Korrektur ggü. voriger Fassung):** Der ODT-Writer (VM 7) ist
**kein** Fehler; die Tab-Navigation ist **kein** Fehler, sondern eine bewusste
Scope-Entscheidung (Code-Plan §5.6) und wird als abhängiger Punkt (T31) geführt.

---

## 8. Erwarteter Ist-Status je Testfall (vor Umsetzung von `zellen-verbinden-code.md`)

| Status | Testfälle | Grund |
|---|---|---|
| **Heute ausführbar und erwartet ROT** (reine Modell-/Reader-Ebene, ganz ohne UI) | **M-bare, DR1, DR2, DR3** | Reproduzieren Fehler 1/2 direkt über `prosemirror-tables`/`readDocx`/`writeDocx` — **müssen vor jeder Implementierung rot laufen**, sonst ist die Bug-Behauptung nicht belegt |
| **Heute ausführbar und erwartet GRÜN** (Writer/Reader bereits korrekt — Einfrier-Tests) | **OR1–OR5, DR4–DR6** | Frieren die bereits korrekte ODT-`covered-table-cell`-/`colCount`-Ausgabe und die reinen DOCX-Merge-Fälle ein (Abschnitt 0 Punkt 1) |
| **Heute ausführbar und erwartet GRÜN** (reiner Import realer Fixtures) | **FD1, FD3, FO1, FO3, FO5, T23/T24 (Import-Teil)** | Import realer Dateien, unabhängig vom Merge-Button |
| **Blockiert bis `commands.ts` `mergeSelectedCells` exportiert** | M1–M13 (außer M-bare) | Setzen den Befehl voraus |
| **Blockiert: Button existiert nicht** | T2–T30, T32, T33 | Locator liefert 0 Treffer, solange Code-Plan §4.2 nicht umgesetzt |
| **Teilweise ausführbar** | T1 | Decoration-Teil heute grün, CSS-Overlay-Teil rot bis `index.css`-Fix |
| **Dauerhaft dokumentiert/abhängig** | T25 (Kopfzeile), T31 (Tab) | Kein Reader-Support für `table_header`; Tab-Navigation editorweit nicht verdrahtet |

Sobald Code-Plan Abschnitt 4 umgesetzt ist, müssen **alle** als ROT/blockiert markierten
Fälle auf GRÜN wechseln (inkl. der zuvor blockierten, die dann erstmals ausführbar werden) —
das ist der maschinell prüfbare Nachweis, dass die Fixes wirken, nicht nur Code-Review.

---

## 9. Abgleich mit Abnahmekriterien (Anforderung §8, DoD 1–9)

| DoD-Punkt | Abdeckung |
|---|---|
| 1. Klickbarer Button + sichtbare Mehrzellen-Selektion, verdrahtet über `mergeCells` | T1, T2, Abschnitt 5.1 gesamt |
| 2. Alle Testfälle aus §7 ausgeführt und dokumentiert | Abschnitt 5 (T1–T33) + Abschnitt 4 (M/DR/OR/XF/FD/FO) + Traceability Abschnitt 6 |
| 3. Jedes Verdachtsmoment eingestuft (keines offen) | Abschnitt 7 (VM 1–11 + Fehler 1/2); VM 7 ausdrücklich als „erledigt/vorhanden" |
| 4. Verdachtsmoment 5 (`CellSelection`) konkret getestet + Korrektur dokumentiert | **T7, M-bare, M5, M6** — der „kritischste Einzeltest" |
| 5. Mindestens ein E2E-Test über echte Bedienung + Selection-Sync-Regression, dauerhaft verankert | T28 (Sammelnachweis), T16 (Selection-Sync) |
| 6. Rundreise DOCX+ODT, Cross-Format, je reale Fixture, beide „Spalte löschen kreuzt Merge"-Fixtures | T17–T24, DR1–DR6, OR1–OR5, FD1–FD4, FO1–FO6 |
| 7. Inhaltszusammenführung bewusst als Produktentscheidung bestätigt | T6, M12 (verifizieren Code-Plan §5.1) |
| 8. Tastenkürzel-/Kontextmenü-Entscheidung getroffen | T30 (verifiziert Code-Plan §5.3/5.4: kein Kürzel, kein Kontextmenü V1) |
| 9. Wechselwirkung „Spalte/Zeile löschen kreuzt Merge" nachweislich | T24, FO5, FO6 (Import + unveränderte Rundreise der beiden `table-column-delete-with-merge*.odt`) |

---

## 10. Ausführungsreihenfolge (härtestes/Kern zuerst)

Reihenfolge nach dem Prinzip „schwerste/gefährlichste Arbeit zuerst", nicht Quick-Wins:

1. **M-bare zuerst** — reproduziert Fehler 2 gegen den nackten `prosemirror-tables`-`mergeCells`,
   **ganz ohne** App-Code. Schneller, unabhängiger Ausgangsnachweis, dass der „kritischste
   Einzeltest" real ist, bevor irgendetwas gebaut wird.
2. **DR1–DR3** — reproduzieren Fehler 1 (kombinierter DOCX-Merge) unabhängig vom Code-Plan,
   ebenfalls ohne UI, direkt gegen `readDocx`/`writeDocx`. Die beiden schwerwiegendsten
   Datenfehler damit **vor** jeder Implementierung festgenagelt.
3. **OR1–OR5, DR4–DR6** — Einfrier-Tests der bereits korrekten ODT-Ausgabe und der reinen
   DOCX-Fälle (heute grün); sichern, dass die anstehenden Fixes sie nicht brechen.
4. **Import-Fixture-Tests** (FD1/FD3, FO1/FO3/FO5) — heute grün, unabhängig vom Button.
5. Nach `commands.ts` (Code-Plan §4.1): **M1–M13** (inkl. M5/M6, die den gefixten Zustand
   gegen M-bare kontrastieren).
6. Nach `Toolbar.tsx`/`index.css`/`WordEditor.tsx` (§4.2–4.4): **T1–T16** (Grundbedienung,
   kritischer Typing-Test T7, Guards, Undo/Redo, Grenzfälle, Selection-Sync).
7. **T17–T27** (Rundreisen, Cross-Format, reale Fixtures, unabhängige Export-Validierung)
   + verbleibende `merge-fixtures`-/`cross-format`-Fälle (FD2/FD4, FO2/FO4/FO6, XF1–XF4).
8. **T28–T33** (Sammelnachweis, Icon, Kürzel-Doku, Tab, Performance).
9. **Abschluss:** alle ROT/blockierten Fälle erneut ausführen, Statuswechsel auf GRÜN
   dokumentieren; `selection-regression.spec.ts` erneut laufen lassen (Abschnitt 5.2);
   Traceability (Abschnitt 6) und DoD (Abschnitt 9) final gegenprüfen, bevor der
   Backlog-Status geändert wird.

---

## 11. Offene Punkte für QA

- **Button-Selektor an der real gebauten UI verifizieren:** `getByRole('button', { name: 'Zellen verbinden' })`
  setzt `title`/`aria-label` = „Zellen verbinden" voraus (Code-Plan §4.2). Weicht die
  Umsetzung ab, müssen alle Testfälle in Abschnitt 5 migriert werden.
- **Fixture-Inhalt für FD2/FO2/T22 vorab per JSZip-Rohinspektion klären:** enthält
  `bug57031.docx` eine Zelle mit **kombiniertem** `colspan>1` **und** `rowspan>1` (dann
  blockiert durch DR1) oder nur getrennte horizontale/vertikale Merges (dann unabhängig
  bereits grün)? Der Code-Plan trifft dazu für diese konkrete Datei keine abschließende
  Aussage. `mergedCells.odt` ist verifiziert **ohne** `covered-table-cell` (Grenzfall 13).
- **Cross-Format-Export-Pfad (T19–T21):** Unklar, ob die UI einen Formatwechsel beim Export
  aus derselben Karte erlaubt oder ob der Umweg über Re-Import in die andere Karte nötig ist
  — vor Testimplementierung an der laufenden App verifizieren (identische Unklarheit wie in
  `fett-qa.md`/`ausrichtung-zentriert-qa.md`).
- **T25 (Kopfzeilen-Merge) ist nicht end-to-end ausführbar:** kein Reader erzeugt
  `table_header`-Knoten (Code-Plan §5.5). Bleibt „nur auf Command-Ebene (M10)" vermerkt,
  bis ein separater Kopfzeilen-Reader-Support existiert.
- **T31 (Tab nach Merge) ist abhängig:** Tab navigiert editorweit nicht zwischen Zellen
  (Abschnitt 1). Erst prüfbar, wenn `goToNextCell` verdrahtet ist (Code-Plan §5.6, bewusste
  Scope-Entscheidung); bis dahin als „abhängig/zurückgestellt" führen.
- **T26/T27 (unabhängige Parser-Validierung):** Anforderung §5 Punkt 8 wünscht idealerweise
  eine von `python-docx`/`odfpy` oder echtem Word/LibreOffice unabhängige Gegenprüfung.
  Dieser Plan verwendet ersatzweise `DOMParser` (vorhandene Devdependency `jsdom`) als
  minimalen, vom eigenen Reader unabhängigen Parser. Ob zusätzlich eine externe
  Python-Toolchain oder headless LibreOffice in der CI verfügbar gemacht wird, ist mit dem
  Team zu klären (Infrastrukturfrage, kein Testdesign-Punkt).
- **Determinismus auf Mobile/Tablet:** Die jüngste Flaky-Historie betraf gerade das
  Mobile-Projekt. Für T7/T16 (und jeden Merge→Tippen-Übergang) ist das `waitForTimeout(50)`
  + zustandsbasierte Warten aus Abschnitt 3 auf **allen drei** Projekten zu verifizieren,
  bevor der jeweilige Test als stabil gilt.
