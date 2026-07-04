# QA-Testplan: Feature „Absatzformat-Dropdown (Standard/Überschrift 1–6)"

Rolle: QA-Antwort auf `specs/absatzformat-dropdown-req.md` (Anforderung) und
`specs/absatzformat-dropdown-code.md` (Entwicklerplan). Dieses Dokument nimmt
**keinen** der beiden Vorgängertexte als bewiesen an — auch
`absatzformat-dropdown-code.md` ist laut eigenem Titel ein *Plan*, keine
verifizierte Umsetzung („Kein Punkt hier ist bereits umgesetzt — dies ist der
Plan, nicht der Vollzug"). Jede Behauptung aus beiden Dokumenten wird hier auf
einen konkreten, ausführbaren Testfall abgebildet. Ergebnis ist ein Testplan,
kein Testbericht — die hier aufgeführten Tests sind zum Zeitpunkt dieses
Dokuments größtenteils **noch nicht geschrieben** (siehe Abschnitt 5, Spalte
„Erwarteter Status").

Stil/Gliederung orientiert an `fett-qa.md`/`absatzformat-dropdown-req.md`/
`absatzformat-dropdown-code.md`/`FEATURE-SPEC-DOCX-ODT.md`.

---

## 0. Stichprobenprüfung des Ist-Codes (QA-Gegenkontrolle)

Bevor der Plan aufgestellt wird, wurden zentrale Behauptungen aus
`absatzformat-dropdown-req.md` Abschnitt 0 und `absatzformat-dropdown-code.md`
Abschnitt 0/1 direkt am aktuellen Code nachvollzogen (nicht nur aus den
Dokumenten übernommen):

| Behauptung | QA-Gegenkontrolle | Ergebnis |
|---|---|---|
| `Toolbar.tsx:116-131` natives `<select aria-label="Absatzformat">` mit „Standard"/„Überschrift 1–6" | `src/formats/shared/editor/Toolbar.tsx:116-131` gelesen | **Bestätigt, zeilengenau.** Kein `disabled`, kein `title`-Attribut aktuell vorhanden — der in `code.md` §4.2 geplante Disabled-Zustand existiert noch nicht. |
| `currentHeadingLevel()` (`Toolbar.tsx:87-95`) tiefenbasierte Suche | `Toolbar.tsx:87-95` gelesen | **Bestätigt, zeilengenau.** Reine `for`-Schleife über `$from.depth`, kein Bezug zu `CellSelection.ranges`. |
| `setHeading` (`commands.ts:40-55`), `if (!$from.sameParent($to)) return false`, `attrs = level === null ? undefined : { level, align: 'left' }` | `src/formats/shared/editor/commands.ts:40-55` gelesen | **Bestätigt, zeilengenau.** `align: 'left'` ist hartcodiert (Zeile 43); bei Rückwechsel zu Standard ist `attrs === undefined` (Node-Default `align: 'left'` greift über `wordSchema`). Die von `code.md` §4.1 geplanten Funktionen `collectHeadingTargets`/`canSetHeading`/`headingTargetsInSelection` **existieren im Code noch nicht** — reiner Planungsstand. |
| `setAlign` (`commands.ts:13-27`) nutzt `doc.nodesBetween(from, to, …)` auf `state.selection.from/.to` | `commands.ts:13-27` gelesen | **Bestätigt, zeilengenau.** Bei einer `CellSelection` würde das laut `code.md` Finding A/B nur die Kopf-Zelle erreichen — diese konkrete Behauptung ist im Code **plausibel**, aber von QA (noch) nicht durch einen eigenen, unabhängigen Testlauf empirisch nachvollzogen (`code.md` verweist auf ein bereits wieder entferntes Scratch-Testskript, das für QA nicht nachprüfbar ist). **Konsequenz: Abschnitt 2.2 unten schreibt genau diesen Nachweis als eigenständigen, dauerhaften Unit-Test fest, statt ihn aus `code.md` zu übernehmen.** |
| `schema.ts:98-104` `list_item.content = 'paragraph block*'` vs. `tableNodes({ cellContent: 'block+' })` (Zeile 106) | `src/formats/shared/schema.ts:98-106` gelesen | **Bestätigt, zeilengenau** (Feld liegt exakt auf Zeile 99/106 im aktuellen Code). |
| `docx/reader.ts:48-75` `parseStylesXml`/`headingLevelForStyle`, kein `w:basedOn` gelesen | `src/formats/docx/reader.ts:40-75` gelesen | **Bestätigt.** `HeadingInfo` hat aktuell nur `outlineLvlByStyleId`, keine `basedOnByStyleId` — die in `code.md` §4.5 geplante Erweiterung ist noch nicht umgesetzt. |
| `odt/reader.ts:245-246`/`:252-256`, nur `office:automatic-styles` ausgewertet | `src/formats/odt/reader.ts:239-256` gelesen | **Bestätigt, zeilengenau** (`parseAutomaticStyles(contentAutomaticStyles)` Zeile 246, kein Zugriff auf `office:styles` im gesamten Bereich). |
| `docx/writer.ts` Finding F — `blockToDocx` Fall `'heading'` ignoriert `listNumId`, Fall `'paragraph'` nutzt ihn | `src/formats/docx/writer.ts:95-124` gelesen | **Bestätigt, zeilengenau.** Fall `'paragraph'` (Zeile 101-105) baut `numPr` aus `listNumId`; Fall `'heading'` (Zeile 106-111) referenziert `listNumId` nirgends. Eigenständig durch QA nachvollzogen, nicht nur aus `code.md` übernommen. |
| Finding C — keine `.ProseMirror h1/h2/h3 { font-weight: … }`-Regel in `index.css`, Überschriften also im Editor **nicht** fett | `Grep font-weight` in `src/index.css` | **Bestätigt** (bereits unabhängig in `fett-qa.md` Abschnitt 0 dokumentiert; hier für den Absatzformat-Kontext erneut bestätigt, relevant für Testfall H16/Grenzfall 13 unten). |
| `tests/e2e/docx.spec.ts:99`, `tests/e2e/odt.spec.ts:80` — keine Dropdown-Bedienung in bestehenden Tests | `Grep` nach `Absatzformat`/`getByLabel`/`selectOption` in `tests/` | **Bestätigt.** Keine Treffer außerhalb dieses Plans. |
| Fixture-Existenz für die in `code.md` §2/§5 genannten Kandidaten | `Glob tests/fixtures/external/**` | **Bestätigt vorhanden:** `MyHeading1.odt`, `ListHeading.odt`, `ListHeading2.odt`, `listStyleId.odt`, `heading123.docx`. Zusätzlich als mögliche Kandidaten für Grenzfall 16 (DOCX `w:basedOn`) identifiziert, aber **noch nicht inhaltlich geöffnet/bestätigt**: `Numbering.docx`, `ComplexNumberedLists.docx`, `bug-paragraph-alignment.docx` — vor Verwendung in Abschnitt 2.6/3.1 zwingend am tatsächlichen `styles.xml`-Inhalt prüfen, nicht am Dateinamen (gleiche Vorsichtsregel wie in `fett-qa.md` Abschnitt 8). |

**Konsequenz für diesen Testplan:** Alle Fundstellen sind sachlich zutreffend
und durch QA unabhängig nachvollzogen. Die in `absatzformat-dropdown-code.md`
Abschnitt 4 geplanten Funktionen (`collectHeadingTargets`, `canSetHeading`,
`headingTargetsInSelection`, Schema-Fix, `docx/reader.ts`-Erweiterung,
`docx/writer.ts`-Fix, `odt/reader.ts`-Erweiterung) sind **im aktuellen Code
nicht vorhanden** — jeder Testfall unten, der sich auf diese Funktionen oder
auf das damit geplante Verhalten (Mehrfachselektion erweitert, Ausrichtung
erhalten, Listen einheitlich erlaubt, `w:basedOn`/`office:styles` gelesen,
`<w:numPr>` bei Überschriften erhalten) bezieht, ist deshalb **heute (vor
Umsetzung) als ROT erwartet** zu führen (siehe Abschnitt 5), nicht als bereits
bestehendes, grünes Verhalten.

---

## 1. Testumgebung

- Unit-Tests: `npm test` (Vitest, `jsdom`-Environment).
- E2E-Tests: `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `baseURL: 'http://localhost:4173/salamanido/'`, `webServer` baut
    (`npm run build`) und startet `vite preview` automatisch.
  - Drei Projekte: **Desktop Chrome**, **Mobile** (`Pixel 7`), **Tablet**
    (`iPad Mini`) — jeder neue Testfall muss in **allen drei** grün sein,
    sofern er nicht explizit auf reine Tastaturbedienung angewiesen ist
    (siehe 3.7).
- Bestehende Konventionen (aus `docx.spec.ts`/`odt.spec.ts`/
  `selection-regression.spec.ts` übernommen, in neuen Tests beizubehalten):
  - `page.goto('/')` → Privacy-Banner wegklicken:
    `page.getByRole('button', { name: /verstanden/i }).click()`.
  - Karten-Locator: `docxCard(page)`/`odtCard(page)` über
    `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: '...' }) })`.
  - Editor-Locator: `page.locator('.ProseMirror')`.
  - **Absatzformat-Dropdown:** `page.getByLabel('Absatzformat')` bzw.
    `page.locator('select[aria-label="Absatzformat"]')`, bedient über
    Playwrights `selectOption({ label: 'Überschrift 1' })` bzw.
    `selectOption('normal')`/`selectOption('3')` (Options-`value` ist die
    Zeichenkette der Ebene oder `'normal'`, siehe `Toolbar.tsx:125-130`).
    **Kein** Testfall in Teil B darf stattdessen `setHeading(...)` direkt
    importieren/aufrufen — das ist die zentrale, im Auftrag ausdrücklich
    verlangte Abgrenzung.
  - Ausrichtungs-Buttons: über `page.getByTitle(...)` analog zum
    Fett-Button-Muster aus `fett-qa.md` — genaue Titel/`aria-label` vor
    Testimplementierung an `Toolbar.tsx` verifizieren (im aktuellen Code
    nicht Teil dieser Anforderung, daher hier nur als Hilfsmittel für
    Testfall H9/H21 referenziert, nicht selbst Testgegenstand).
  - Export: `page.getByRole('button', { name: 'Exportieren' })` +
    `page.waitForEvent('download')`.
  - Datei-Upload, **echter** Klickpfad (siehe 3.4): `page.waitForEvent('filechooser')`
    gemeinsam mit dem Klick auf „Datei hochladen" statt direktem
    `input.setInputFiles(...)` auf den versteckten `<input>`.

---

## 2. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

**Zweck:** Schnelle, browserunabhängige Absicherung der Datenebene (Node-Typ/
Level/Ausrichtung ⇄ XML) sowie der Editor-Command-Ebene (`setHeading` und die
in `code.md` §4.1 geplanten Hilfsfunktionen). Diese Ebene ist von der
UI-Bedienung (Dropdown-Klick) entkoppelt — ein rotes Toolbar-Verhalten darf
hier keine Unit-Tests rot färben und umgekehrt. **Keine** Playwright-Interaktion.

### 2.1 Bestandsaufnahme (bereits vorhanden, als Basisschutz zu erhalten)

| Datei | Test | Deckt ab |
|---|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts` | Rundreise für Überschriften (laut `req.md` §6-Zeile 1: „vorhanden, aber nur für vorgefertigte Daten, nicht über den Command") | Anforderung 4.1.1 (Grundfall, unverändertes Re-Exportieren) |
| `src/formats/odt/__tests__/roundtrip.test.ts` | analog | Anforderung 4.2.1 |
| `src/formats/*/__tests__/external-fixtures.test.ts` | Import von Fremddateien, bisher nur „stürzt nicht ab" | Teilabdeckung 4.1.7/4.2.7 (siehe 2.5 unten für gezielte Assertions) |

Diese Tests bleiben unverändert Teil der Suite; sie werden **nicht** ersetzt,
sondern ergänzt.

### 2.2 Neue Datei: `src/formats/shared/editor/__tests__/commands.test.ts` (heading-Teil)

**Koordinationshinweis** (analog `fett-qa.md` §2, dort für `isMarkActive`):
Falls eine andere Anforderung (`fett-*`) bereits eine Datei mit exakt diesem
Pfad plant/anlegt, müssen beide Testgruppen in **derselben** Datei
zusammengeführt werden (je ein `describe`-Block: `describe('setHeading', ...)`
neben `describe('toggleMark/isMarkActive', ...)`), nicht als zwei
konkurrierende Dateien mit demselben Namen.

Unit-Tests **gegen den aktuellen Code** (dokumentieren die in Abschnitt 0
bestätigten Bugs, bevor `code.md` §4.1 umgesetzt ist):

| # | Testfall | Vorgehen | Erwartung (aktueller Code) | Bezug |
|---|---|---|---|---|
| C1 | Cursor ohne Selektion, ein Absatz → Überschrift | `EditorState` mit Cursor in einem `paragraph`, `setHeading(1)(state, dispatch)` | `true`, Node-Typ wechselt zu `heading`, `level: 1` | 2.1, §5.1 |
| C2 | Direkter Ebenenwechsel (Level 2 → Level 5 in einem Aufruf) | Cursor in `heading(level:2)`, `setHeading(5)(...)` | `true`, `level: 5`, kein Zwischenzustand | 2.1, Grenzfall 10 |
| C3 | Rückwechsel zu Standard | Cursor in `heading`, `setHeading(null)(...)` | Node-Typ wechselt zu `paragraph`, `node.type.name === 'paragraph'` (nicht nur visuell) | 2.4 |
| C4 | **Regressionstest Befund 3** — Selektion über zwei Absätze | `$from`/`$to` in unterschiedlichen `paragraph`-Nodes, `setHeading(1)(...)` | `false` (No-Op), **kein** `dispatch`-Aufruf. **Erwarteter Status: GRÜN gegen aktuellen Code** (Bug ist der Ist-Zustand, dieser Test dokumentiert ihn) — **muss nach `code.md` §4.1 auf das neue Verhalten (beide Blöcke konvertiert) umgeschrieben und dann erneut grün sein.** | 2.3, Grenzfall 2 |
| C5 | **Regressionstest Befund 4** — Ausrichtung geht beim Wechsel verloren | Absatz mit `align: 'center'`, `setHeading(1)(...)` | Resultierender `heading`-Node hat `align: 'left'`, **nicht** `'center'`. **Erwarteter Status: GRÜN gegen aktuellen Code** (Bug), **muss nach Fix aus `code.md` §3.2/§4.1 auf `align: 'center'` als Erwartung umgeschrieben werden.** | 2.5, Grenzfall 8 |
| C6 | Kumulativer Ausrichtungsverlust über zwei Wechsel | `align: 'center'` → `setHeading(1)` → `setHeading(null)` | Nach **beiden** Wechseln `align: 'left'` (aktuell), nach Fix: `align: 'center'` bleibt über beide Wechsel erhalten | Grenzfall 9 |
| C7 | **Regressionstest Befund 5** — erster vs. zweiter Absatz in einem Listenpunkt | Zwei `EditorState`-Fixtures: (a) Cursor im **ersten** Kind eines `list_item` mit `content: 'paragraph block*'`, (b) Cursor im **zweiten** Kind desselben `list_item` | (a): `setHeading(1)` liefert `false` (strukturell verweigert, `canReplaceWith` scheitert); (b): liefert `true`. **Erwarteter Status: GRÜN gegen aktuellen Code** (dokumentiert die Inkonsistenz), **nach Schema-Fix aus `code.md` §4.3 müssen beide `true` liefern** — Test wird dann umgeschrieben, nicht gelöscht. | 2.6, Grenzfall 4/5 |
| C8 | Tabellenzelle, einzelne Position | Cursor in einer `table_cell` (Content `block+`), `setHeading(2)(...)` | `true`, jede Position in der Zelle konvertierbar | 2.7, Grenzfall 6 |
| C9 | **`CellSelection` über mehrere Zellen — Ursachen-Nachweis für Finding A** | 2×2-`CellSelection` (Anker `A1`, Kopf `B2`, Text `A1/B1/A2/B2`) aufbauen (`prosemirror-tables`), `state.selection.from`/`.to` sowie `$from.sameParent($to)` protokollieren, danach `setHeading(2)(state, dispatch)` aufrufen | Aktuell: `sameParent` ist **wahr** (widerlegt die in Grenzfall 2.7 unterstellte Ursache „unterschiedliche Elternknoten"), `setHeading` liefert dennoch `false`, weil `parent.type.name === 'table_cell'` und `table_cell` nicht in `alignableTypes` enthalten ist. **Dieser Test ist der von QA selbst durchgeführte, dauerhafte Nachweis für `code.md` Finding A** (ersetzt den dort nur einmalig und wieder entfernten Scratch-Test) — **muss dauerhaft Teil der Suite bleiben**, auch nach dem Fix (dann mit umgekehrter Erwartung: alle vier Zellen werden Ziel). | Grenzfall 7, `code.md` §3.1 Finding A |
| C10 | Selektion über Absatz **und** Überschrift gemeinsam | `$from` in `paragraph`, `$to` in benachbartem `heading` | `false` (No-Op), Dropdown-Anzeige darf laut Anforderung kein zufälliges Ergebnis zeigen — separat in H-Reihe (Toolbar-Ebene) geprüft, hier nur die Command-Ebene | Grenzfall 3 |
| C11 | Leerer Absatz | `paragraph` ohne Content, Cursor darin, `setHeading(1)(...)` | `true`, kein Wurf | Grenzfall 1 |

Zusätzliche Tests **für den in `code.md` §4.1 geplanten** (noch nicht
existierenden) Funktionsumfang — dürfen erst geschrieben werden, wenn
`collectHeadingTargets`/`canSetHeading`/`headingTargetsInSelection`
tatsächlich exportiert werden (vorher schlägt bereits der Import fehl, kein
sinnvoller Rot-Zustand):

| # | Testfall | Erwartung nach Umsetzung von `code.md` §4.1 |
|---|---|---|
| C12 | Selektion über zwei Absätze → zwei Targets | `collectHeadingTargets` liefert 2 Einträge, `setHeading` konvertiert **beide** in einer Transaktion (`tr.docChanged`, ein Undo-Schritt), jeder behält seine eigene vorherige `align` |
| C13 | `CellSelection` über 2×2 Zellen → vier Targets | Alle vier Zellen werden zu Überschriften, ein einziger Undo-Schritt macht alle vier rückgängig |
| C14 | `CellSelection` über eine reine Bildzelle | Keine Targets, `canSetHeading(state) === false` |
| C15 | Cursor im ersten **und** zweiten Kind eines Listenpunkts (nach Schema-Fix) | Beide liefern genau ein Target |
| C16 | `canSetHeading`/`headingTargetsInSelection` liefern für dieselbe Selektion konsistente Ergebnisse wie `setHeading` selbst | Kein Auseinanderlaufen zwischen Anzeige-/Disabled-Logik und tatsächlichem Command-Ergebnis (Abnahmekriterium 8, „kein stiller Fehlschlag") |

### 2.3 Neue/erweiterte Testfälle — `src/formats/docx/__tests__/roundtrip.test.ts`

| # | Testfall | Vorgehen | Erwartung | Bezug |
|---|---|---|---|---|
| D1 | Alle vier Ausrichtungen für Überschriften | `it.each(['left','center','right','justify'])`, `heading`-Node mit jeweiliger `align` → `writeDocx` → `readDocx` | `align` bleibt je Fall erhalten (erweitert die laut `req.md` §6 nur für `'center'` bestehende Abdeckung) | 4.1.5 |
| D2 | Level 3–6 (bisher nur 1/2 abgedeckt laut `req.md` §6) | `it.each([3,4,5,6])` | Level bleibt erhalten | 4.1.1 |
| D3 | Struktur-Test mit unabhängigem Parser | Nach `writeDocx`: rohes `word/document.xml` per `DOMParser`/JSZip (nicht `writeDocx`+`readDocx`-Rundreise) auf `<w:pStyle w:val="Heading3"/>` im `w:pPr` des betroffenen Absatzes prüfen | Erfüllt Abnahme 4.1.2 wörtlicher als ein reiner Reader-Rundreise-Test | 4.1.2 |
| D4 | Rückwechsel „Heading3" → Standard | Node-Typ `paragraph` statt `heading` → `writeDocx` | Export enthält **kein** `<w:pStyle>` (bzw. `Normal`) für diesen Absatz | 4.1.3 |
| D5 | Ebenenwechsel „Heading2" → „Heading5" in einem Schritt | `heading(level:5)` direkt (simuliert Editor-Ergebnis nach `setHeading`) → `writeDocx` | Export referenziert ausschließlich `Heading5`, keine Reste von `Heading2` | 4.1.4 |
| D6 | **Regressionstest Finding F** — Überschrift als Kind eines Listenpunkts behält `<w:numPr>` | `bullet_list` mit einem `list_item`, dessen Kind eine `heading` ist (Level beliebig) → `writeDocx` → `document.xml` parsen | Erwartet: `<w:numPr>` mit passender `w:numId` im `<w:pPr>` der Überschrift vorhanden. **Erwarteter Status jetzt: ROT** (Finding F in Abschnitt 0 dieser Datei eigenständig bestätigt: `blockToDocx`-Fall `'heading'` ignoriert `listNumId`, Zeile 106-111) — muss nach `code.md` §4.6 grün werden. | Finding F, `code.md` §4.6 |
| D7 | Cross-Format-Grundlage: reine Datenebene für 4.1.6 | ODT-Modell mit Überschriften → (simulierter Import) → DOCX-Modell → `writeDocx` | Level/Text bleiben erhalten (Datenebene, ergänzt den Browser-Test in 3.1 unten) | 4.1.6 |

### 2.4 Neue/erweiterte Testfälle — `src/formats/odt/__tests__/roundtrip.test.ts`

Analog zu 2.3:

| # | Testfall | Erwartung | Bezug |
|---|---|---|---|
| O1 | Alle vier Ausrichtungen für Überschriften | `align` bleibt je Fall erhalten | 4.2.5 |
| O2 | Level 3–6 | Level bleibt erhalten | 4.2.1 |
| O3 | Neuer Absatz → „Überschrift 4" (simuliert) → Export | `content.xml` enthält `<text:h text:style-name="Heading4-…" text:outline-level="4">` (`odt/writer.ts:69-74`, `styleRegistry.ts:80-93` — Zeilenangabe aus `code.md`, vor Testimplementierung gegen aktuellen Code erneut verifizieren) | 4.2.2 |
| O4 | Rückwechsel zu Standard | Export enthält `<text:p>` statt `<text:h>`, kein `outline-level`-Attribut mehr | 4.2.3 |
| O5 | Ebenenwechsel in einem Schritt | Nur neue Ebene referenziert | 4.2.4 |
| O6 | Überschrift innerhalb eines Listenpunkts (nach Schema-Fix) | Bleibt strukturell korrekt verschachtelt — kein Gegenstück zu Finding F nötig, da ODF Listenmitgliedschaft rein strukturell abbildet (siehe `code.md` §4.6, durch QA in Abschnitt 0 per Codelesen mitverifiziert) | 4.2.2, Grenzfall 5 |

### 2.5 Erweiterung — `external-fixtures.test.ts` (DOCX + ODT)

Aktuell nur „importiert ohne Absturz". Ergänzen um **gezielte** Assertions:

| # | Fixture | Testfall | Erwartung | Bezug |
|---|---|---|---|---|
| E1 | `tests/fixtures/external/odt/MyHeading1.odt` | `Heading2`-Überschrift korrekt als `level: 2` erkannt, obwohl `Heading2` **ausschließlich** in `office:styles` (nicht `office:automatic-styles`) deklariert ist | Text/Level bleiben erhalten (heute schon, da `outline-level` direkt am Element steht); zusätzlich **explizit den Ausrichtungswert protokollieren** (`align` des importierten Node) | Befund 6, Grenzfall 15, 4.2.7 |
| E2 | `tests/fixtures/external/odt/ListHeading.odt` | `list_item` mit zwei Kindern: erstes `paragraph`, zweites `heading` | Beide Kinder korrekt erkannt, `outline-level` des zweiten Kindes stimmt | Befund 5, Grenzfall 5 |
| E3 | `tests/fixtures/external/odt/ListHeading2.odt` | analog E2 | analog | Befund 5 |
| E4 | `tests/fixtures/external/odt/listStyleId.odt` | **Zusätzlich zum reinen Crash-Test:** `wordSchema.nodeFromJSON(doc.body)` + Versuch, eine `EditorView` zu mounten + `splitListItem` an der Position der Überschrift **dry-run** ausführen (`command(state, undefined)`) | Darf **nicht** werfen. **Erwarteter Status jetzt: ROT** — QA hat Finding E3 (`RangeError: Called contentMatchAt on a node with invalid content`) nicht selbst reproduziert, übernimmt die Behauptung aus `code.md` daher nur als **zu verifizierende**, nicht als bestätigte Tatsache; genau deshalb ist dieser Test hier verpflichtend als *erster* Schritt vor jeder weiteren Arbeit an Abschnitt 2.6/4.3 zu schreiben und auszuführen — sein tatsächliches Ergebnis (wirft/wirft nicht) ist hier nach Ausführung nachzutragen. | Finding E3, `code.md` §3.3 |
| E5 | `tests/fixtures/external/docx/heading123.docx` | Level und Text korrekt erkannt | Einfache Rundreise-Kandidatin, Abnahme 4.1.7 | 4.1.7 |
| E6 | Kandidaten für Grenzfall 16 (`w:basedOn` ohne eigenes `w:outlineLvl`) | `Numbering.docx`/`ComplexNumberedLists.docx` — **vor Verwendung öffnen und den tatsächlichen `styles.xml`-Inhalt gegen die Erwartung prüfen** (Dateiname ist keine Garantie); falls keine der beiden das Muster real enthält, eine synthetische Fixture nach dem Muster aus 2.6/T2 verwenden | Level wird über die `w:basedOn`-Kette korrekt aufgelöst, sofern implementiert (siehe 2.6) | Grenzfall 16 |

### 2.6 Neue Datei: `src/formats/docx/__tests__/reader-edge-cases.test.ts`

| # | Testfall | Vorgehen | Erwartung | Bezug |
|---|---|---|---|---|
| T1 | **Regressionstest Finding D** — Formatvorlage erbt Level nur über `w:basedOn` | Hand-gebauter `styles.xml`-Ausschnitt: Stil `CustomHeading` mit `<w:basedOn w:val="Heading1"/>`, **ohne** eigenes `w:outlineLvl` → `readDocx` auf ein Dokument, das einen Absatz mit `w:pStyle w:val="CustomHeading"` referenziert | `heading`-Node mit `level: 1`. **Erwarteter Status jetzt: ROT** (Finding D in Abschnitt 0 dieser Datei bestätigt: `HeadingInfo` hat aktuell kein `basedOnByStyleId`-Feld) — muss nach `code.md` §4.5 grün werden. | Finding D, Grenzfall 16 |
| T2 | Zyklischer `w:basedOn` (A basiert auf B, B auf A) | Analog T1, zyklische Kette | Kein Hang/Absturz, Rückgabe `null` (Level unbekannt) — analog zum bereits bestehenden `MAX_TABLE_NESTING_DEPTH`-Muster in derselben Datei (Vorbild: `code.md` §4.5, `MAX_STYLE_INHERITANCE_DEPTH`) | Robustheit, kein direkter Anforderungsbezug, aber Abnahmekriterium 8 („kein stiller Fehlschlag"/keine Exception) |
| T3 | Lokalisierter sichtbarer Name („Überschrift 1"), andere interne Style-ID | Hand-gebauter Stil mit `w:styleId="berschrift1"` (oder ähnlich verstümmelter interner ID) und `w:name` „Überschrift 1", aber **mit** eigenem `w:outlineLvl` | Level wird über `w:outlineLvl` korrekt erkannt (funktioniert bereits heute laut Befund 7 — Regressionstest, kein neuer Bug) | Befund 7 |

### 2.7 Neue Datei: `src/formats/odt/__tests__/reader-edge-cases.test.ts`

Hand-gebaute, minimale ODT-Zips (Muster: `tests/e2e/odt.spec.ts`s
`buildSampleOdt()`, auf Unit-Ebene mit JSZip direkt) für deterministische,
synthetische Fälle, die der reale Fixture-Korpus nicht in der benötigten
Präzision liefert:

| # | Testfall | Vorgehen | Erwartung | Bezug |
|---|---|---|---|---|
| S1 | **Regressionstest Befund 6** — `office:styles` statt `office:automatic-styles`, mit explizitem `fo:text-align` | `<text:h text:style-name="Common1" ...>`, `Common1` **ausschließlich** in `office:styles` definiert, `fo:text-align="center"` | `align: 'center'` korrekt gelesen. **Erwarteter Status jetzt: ROT** (vor Fix: `'left'`, stiller Verlust) — muss nach `code.md` §4.7 grün werden. | Befund 6, `code.md` §3.4/§4.7 |
| S2 | `style:parent-style-name`-Kette | Stil A erbt von Stil B, nur B deklariert `fo:text-align` | Ausrichtung wird über die Kette aufgelöst. **Erwarteter Status jetzt: ROT** | Befund 6 |
| S3 | Zyklische `style:parent-style-name`-Kette | Analog T2 | Kein Hang/Absturz, Fallback `'left'` | Robustheit |
| S4 | Kollision: derselbe Stilname in `automatic-styles` **und** `office:styles` | Beide definieren `fo:text-align` unterschiedlich | Automatischer Stil hat Vorrang (laut `code.md` §4.7 „Vorrang bei Namenskollision") | `code.md` §4.7 |

### 2.8 Neue Datei: `src/formats/shared/__tests__/schema.test.ts`

Schnelle, browserunabhängige Absicherung der Content-Regel-Änderung aus
Befund 5/`code.md` §4.3, isoliert vom vollen Editor-Aufbau:

| # | Testfall | Erwartung |
|---|---|---|
| SC1 | `list_item.content` aktueller Wert | Ist `'paragraph block*'` (dokumentiert den Ist-Zustand vor dem Fix, damit ein versehentliches stilles Zurücksetzen des Schema-Fixes sofort auffällt) |
| SC2 | `canReplaceWith`-Verhalten mit aktueller Regel | Erstes Kind eines `list_item` akzeptiert **keine** `heading`, zweites+ Kind akzeptiert `heading` — reproduziert Befund 5 direkt am Schema, ohne Editor-Aufbau |
| SC3 | Nach geplantem Fix (`'block+'`) | Beide Positionen akzeptieren `heading`; `createAndFill()` für einen leeren Listenpunkt liefert weiterhin einen einzelnen leeren `paragraph` (kein Regressionsrisiko für den Normalfall, wie in `code.md` §4.3 behauptet — **von QA hier als eigener Test verifiziert, nicht nur übernommen**) |
| SC4 | `wrapInList` auf eine einzelne `heading` (Finding E2) | Mit aktueller Regel: `false`/No-Op. **Erwarteter Status jetzt: GRÜN gegen aktuellen Code** (dokumentiert Finding E2 als Bug), nach Fix: `true` |

### 2.9 Neue Datei: `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts`

Unit-Ebene für Anforderung 4.3 (schneller als E2E, ergänzt — ersetzt nicht —
den Browser-Test in 3.1 unten):

| # | Testfall | Vorgehen | Erwartung |
|---|---|---|---|
| X1 | DOCX → ODT → DOCX | `WordDocumentContent` mit Überschriften unterschiedlicher Ebenen → `readDocx(writeDocx(c))` → `readOdt(writeOdt(...))` → erneut `readDocx(writeDocx(...))` | Level und Text nach zwei Konvertierungen identisch |
| X2 | ODT → DOCX → ODT | Spiegelbildlich zu X1 | analog |
| X3 | Formatwechsel + Cross-Format (Anforderung 4.3.3) | Simulierter Formatwechsel (Standard → Überschrift → Standard, inkl. der aktuell verlorenen Ausrichtung) → Cross-Format-Export/Reimport | Ergebnis entspricht exakt dem tatsächlichen Nach-Wechsel-Zustand, **kein** zufälliges Wiederauftauchen der alten Ausrichtung durch einen Konvertierungs-Nebeneffekt (expliziter Negativ-Test) |

---

## 3. Teil B — Echte Playwright-Browser-Tests

**Grundsatz (bindend für diesen Abschnitt, wörtliche Vorgabe aus dem
Auftrag):** Kein Testfall in Teil B darf durch direkten Aufruf interner
Funktionen (`setHeading(...)`, `collectHeadingTargets(...)`, `readDocx(...)`
etc.) im Node-Kontext ersetzt werden. Jeder Testfall muss über echte
Nutzer:innen-Handlungen im Browser laufen: `locator.click()`,
`page.keyboard.press(...)`/`.type(...)`, `select.selectOption(...)`, echtes
`filechooser`-Event für Uploads, `page.waitForEvent('download')` + Auslesen
der heruntergeladenen Datei vom Dateisystem mit einem unabhängigen Parser
(JSZip + DOMParser, nicht der App-eigene Reader).

### 3.1 Neue Datei: `tests/e2e/absatzformat.spec.ts`

Dediziert über `page.getByLabel('Absatzformat')`/`selectOption`, ersetzt/
ergänzt die in `req.md` §5 als „nicht ausreichend" geführten Rundreise-Tests
in `docx.spec.ts:99`/`odt.spec.ts:80` (diese bleiben zusätzlich bestehen,
siehe 3.5).

#### 3.1.1 Grundfunktion (Anforderung 2.1/2.2, Testfälle 5.1–5.3)

| # | Test | Konkrete Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H1 | Neuer Absatz → „Überschrift 1" | Editor anklicken, Text tippen, Cursor im Absatz belassen (keine Selektion), `select.selectOption({ label: 'Überschrift 1' })` | `editor.locator('h1')` sichtbar mit dem getippten Text; `select` zeigt weiterhin `'1'`/„Überschrift 1" (`expect(select).toHaveValue('1')`) | §5.1 |
| H2 | Direkt „Überschrift 4" ohne Zwischenschritt | Direkt im Anschluss an H1: `selectOption({ label: 'Überschrift 4' })` | Text wird zu `<h4>`, `<h1>` nicht mehr vorhanden, kein sichtbarer Zwischenzustand | §5.2, Grenzfall 10 |
| H3 | Zurück zu „Standard" | `selectOption('normal')` | Text wird zu `<p>` — **zusätzlich** per `page.evaluate` prüfen, dass es sich um einen echten DOM-Tag-Wechsel handelt, nicht nur eine CSS-Klasse | §5.3, 2.4 |
| H4 | Mehrfachselektion über zwei Absätze | Zwei Absätze tippen, per Maus-Drag markieren (`page.mouse.down()` am Anfang, `.move()` ans Ende, `.up()`, **nicht** `ControlOrMeta+a`, um gezielt eine Mehrfachabsatz-Selektion ohne Tabellen-/Ganzdokument-Sonderfall zu erzeugen), `selectOption({ label: 'Überschrift 2' })` | **Vor Umsetzung von `code.md` §3.1/§4.1:** beide Absätze bleiben `<p>`, `select` zeigt nach kurzer optischer Änderung wieder den ursprünglichen Wert (React-kontrolliert). **Nach Umsetzung:** beide werden `<h2>`. Ergebnis hier nach jedem Lauf konkret eintragen — **dies ist der zentrale, in `req.md` §7 Punkt 3 geforderte Nachweis der Design-Entscheidung.** | §5.4, 2.3, Grenzfall 2 |
| H5 | Konsolenfehler-Freiheit bei H1–H4 | `page.on('pageerror', ...)`/`page.on('console', msg => msg.type() === 'error')` während H1–H4 mitschneiden | Keine JS-Exception, auch nicht beim (aktuell) stillen No-Op in H4 | Abnahmekriterium 8 |

#### 3.1.2 Listen (Anforderung 2.6, Grenzfälle 4/5, Testfälle 5.5/5.6)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H6 | Erster Absatz eines Listenpunkts | Liste einfügen (Button „• Liste"), in den ersten (einzigen) Absatz eines Punkts tippen, `selectOption({ label: 'Überschrift 1' })` | **Vor Schema-Fix:** kein sichtbarer Effekt, Listenpunkt bleibt `<p>`, `select` springt optisch zurück. **Nach Schema-Fix:** Listenpunkt wird zu `<h1>`. Ergebnis konkret eintragen. | §5.5, Grenzfall 4 |
| H7 | Zweiter Absatz **innerhalb desselben** Listenpunkts | Wie H6, danach `Shift+Enter` (weicher Zeilenumbruch/zusätzlicher Absatz im selben `<li>`, sofern per UI erzeugbar — vor Testimplementierung verifizieren, wie ein zweiter Block im selben `list_item` über die UI überhaupt entsteht), Cursor in den zweiten Absatz, `selectOption({ label: 'Überschrift 1' })` | Funktioniert bereits **heute** (vor jedem Fix) — zweiter Block wird `<h1>` innerhalb desselben `<li>`. **Explizit im Testreport festhalten: H6 und H7 liefern vor dem Fix unterschiedliche Ergebnisse für strukturell sehr ähnliche Ausgangslagen — das ist die dokumentierte Inkonsistenz aus Befund 5.** | §5.6, Grenzfall 5 |
| H8 | Reale Fremddatei `ListHeading.odt` hochladen | Echter Upload (siehe 3.4), Cursor in den ersten Absatz des betroffenen Listenpunkts, „Überschrift 1" wählen (bzw. Ebene wechseln, falls bereits `heading`) | Ergebnis konsistent mit H6/H7 an derselben Datei nachweisen | E2 (Abschnitt 2.5), Grenzfall 4/5 |
| H9 | **Pflicht-Regressionstest Finding E3** — `listStyleId.odt` hochladen, Enter am Ende der eingebetteten Überschrift | Echter Upload von `listStyleId.odt`, Cursor exakt ans Ende der Überschrift innerhalb des Listenpunkts setzen (Text-Suche + `End`-Taste), `page.keyboard.press('Enter')`, danach weiter tippen | Editor bleibt bedienbar, **kein** `pageerror`/keine Konsolen-`error`-Meldung, Dokument enthält weiterhin allen vorherigen **und** den neu getippten Text. **Erwarteter Status jetzt: ROT** (bzw. muss vor Schema-Fix als **abstürzend** nachgewiesen werden — QA-Pflicht, da `code.md` diesen Absturz nur einmalig unter Vitest+jsdom reproduziert hat, **nicht** im echten Browser). Muss nach `code.md` §4.3 grün und **dauerhaft Teil der Suite** sein. | Finding E3, `code.md` §3.3, Grenzfall 4/5 |

#### 3.1.3 Tabellenzellen (Anforderung 2.7, Testfälle 5.7/5.8)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H10 | Einzelne Zelle | Tabelle einfügen, in eine Zelle klicken, `selectOption({ label: 'Überschrift 2' })` | Zelle zeigt `<h2>`, restliche Tabelle/Zellen unverändert `<p>` | §5.7 |
| H11 | `CellSelection` über mehrere Zellen | Tabelle einfügen, per Maus-Drag über mind. 4 Zellen selektieren (Playwright-`CellSelection` entsteht bei ProseMirror-Tabellen typischerweise durch Drag über Zellgrenzen; vor Testimplementierung am echten UI verifizieren, dass ein Maus-Drag tatsächlich eine `CellSelection` und keine Text-Selektion erzeugt), `selectOption({ label: 'Überschrift 1' })` | **Vor Fix:** No-Op, keine Zelle wird `<h1>` (siehe Abschnitt 0 dieser Datei, Test C9: Ursache ist `alignableTypes`, nicht `sameParent`). **Nach Fix (`code.md` §3.1 Finding A):** **alle** selektierten Zellen werden `<h1>` — das in `req.md` Testfall 5.8 noch als „No-Op nachweisen" formulierte Ziel wird durch die Design-Entscheidung aus `code.md` §3.1 **ersetzt**; Ergebnis hier nach Ausführung konkret eintragen. | §5.8, 2.7, Grenzfall 7 |
| H12 | Rest der Tabelle bei H11 unverändert | Direkt im Anschluss an H11 | Zellen außerhalb der `CellSelection` bleiben `<p>` (auch nach dem Fix — nur die tatsächlich selektierten Zellen ändern sich) | 2.7 |

#### 3.1.4 Ausrichtung (Anforderung 2.5, Grenzfälle 8/9, Testfall 5.9)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H13 | Zentrierter Absatz → Formatwechsel | Absatz zentrieren (Ausrichtungs-Button — genauen Titel/Locator vor Implementierung an `Toolbar.tsx` verifizieren), danach `selectOption({ label: 'Überschrift 1' })` | **Vor Fix:** Ausrichtung springt im DOM sichtbar auf „links" (`text-align: left` bzw. Abwesenheit der Center-Klasse). **Nach Fix (`code.md` §3.2):** Ausrichtung bleibt `center`. Ergebnis konkret eintragen — Pflicht-Testfall unabhängig vom Ausgang. | §5.9, Grenzfall 8 |
| H14 | Kumulativer Verlust über zwei Wechsel | Zentrieren → „Überschrift 1" → „Standard" | **Vor Fix:** Ausrichtung bleibt „links" (zweifacher Verlust). **Nach Fix:** ursprüngliche „center"-Ausrichtung bleibt über beide Wechsel erhalten. | Grenzfall 9 |
| H15 | Rundreise: zentrierte Überschrift exportieren/reimportieren | Wie H13, danach exportieren (DOCX **und** ODT je ein Lauf), heruntergeladene Datei mit JSZip+DOMParser prüfen (`<w:jc w:val="center"/>` bzw. `fo:text-align="center"`), erneut hochladen | Ergebnis (erhalten oder verloren) durch echten Datei-Export/-Reimport belegt, nicht nur durch DOM-Zustand im Editor — erfüllt Abnahme 4.1.5/4.2.5 wörtlich | 4.1.5, 4.2.5 |

#### 3.1.5 Enter-Verhalten (Anforderung 2.8, Grenzfälle 11/12, Testfälle 5.10/5.11)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H16 | Enter am Ende einer Überschrift | „Überschrift 1" setzen, Cursor ans Ende, `Enter`, weiter tippen | Neuer Block ist `<p>`, **keine** weitere `<h1>` | §5.10, Grenzfall 11 |
| H17 | Enter mitten in einer Überschrift | „Überschrift 2" mit Text, Cursor in die Mitte, `Enter` | Beide Hälften bleiben `<h2>` (gleiche Ebene) | §5.11, Grenzfall 12 |
| H18 | Sichtprüfung: ist die Überschrift im Editor optisch fett? (Cross-Ref zu `fett-qa.md` B31) | `page.evaluate(() => getComputedStyle(document.querySelector('.ProseMirror h1')).fontWeight)` | Ergebnis hier protokollieren (erwartungsgemäß **kein** `700`, siehe Finding C in Abschnitt 0) — reine Dokumentation, kein eigenständiges Kriterium dieser Datei | Abschnitt 2.9 der Anforderung, `code.md` Finding C |
| H19 | Fett-Mark auf Überschriftentext, danach Rückwechsel zu Standard | Überschrift setzen, Text markieren, `Strg+B`, zurück zu „Standard" wählen | Text erscheint danach **echt** fett (Mark bleibt bestehen), unabhängig vom optischen Zustand aus H18 — genau der in Grenzfall 13/Abschnitt 2.9 beschriebene Übergang | Grenzfall 13, 2.9 |

#### 3.1.6 Undo/Redo (Anforderung 2.10, Testfall 5.12)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H20 | Undo direkt nach Formatwechsel | „Überschrift 1" setzen, `ControlOrMeta+z` | Vorheriger Node-Typ wiederhergestellt (`<p>` falls vorher Standard); **nach Umsetzung von `code.md` §3.2** zusätzlich: vorherige Ausrichtung wiederhergestellt | §5.12, 2.10 |
| H21 | Redo | Direkt nach H20: `ControlOrMeta+y`/`ControlOrMeta+Shift+z` | Formatwechsel erneut hergestellt | 2.10 |
| H22 | Mehrere aufeinanderfolgende Wechsel einzeln rückgängig | Standard → Überschrift 1 → Überschrift 3 → Standard, dann dreimal Undo | Jeder Schritt einzeln, in umgekehrter Reihenfolge, rückgängig gemacht | 2.10 letzter Punkt |

#### 3.1.7 Selection-Sync-Regression (Anforderung Grenzfall 14, Testfall 5.13)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H23 | Formatwechsel als Auslöser statt Fett | Text tippen → „Überschrift 1" per Dropdown setzen → per Klick im Text neu positionieren → `Enter` → weiter tippen (1:1-Adaption von `selection-regression.spec.ts`, aber mit dem Dropdown statt dem Fett-Button als auslösendem Schritt) | Beide Textteile bleiben erhalten, `page.locator('.ProseMirror p, .ProseMirror h1, .ProseMirror h2, ...')` hat die erwartete Anzahl Blöcke, kein JS-Fehler | Grenzfall 14, `req.md` §5.13/§7 Punkt 7 |
| H24 | Analoge Variante in einer Tabellenzelle | Wie `selection-regression.spec.ts`s zweiter Test, aber Formatwechsel statt Fett als Trigger in einer Zelle | Beide Zellinhalte bleiben erhalten | Grenzfall 14 |
| H25 | Stresstest: mehrere Zyklen | Wie `selection-regression.spec.ts`s dritter Test, Formatwechsel statt Fett, 4 Zyklen | Alle Absätze bleiben erhalten, korrekte Anzahl Blöcke | Grenzfall 14, Grenzfall 17 (schnelle Wechselfolge) |

#### 3.1.8 Vollständige Rundreise über echten Upload/Download (Anforderung Abschnitt 4)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H26 | DOCX-Rundreise, echter Upload-Button + `filechooser` | Hand-gebaute DOCX-Datei (Muster `docx.spec.ts`s `buildSampleDocx()`, erweitert um „Heading1"/„Heading2") über echten Klickpfad hochladen (siehe 3.4), unverändert exportieren, heruntergeladene Datei mit JSZip+DOMParser prüfen | Level/Text identisch zum Original | §5.14, 4.1.1 |
| H27 | ODT-Rundreise, analog | Analog, `content.xml` prüfen | Analog | §5.14, 4.2.1 |
| H28 | DOCX: im Editor erzeugte Überschrift, exportiert, mit unabhängigem Parser geprüft | Neues Dokument, Text tippen, „Überschrift 3" per Dropdown, exportieren | `document.xml` enthält exakt `<w:pStyle w:val="Heading3"/>` im `w:pPr` des betroffenen Absatzes (DOMParser-Prüfung, keine reine String-Suche) | 4.1.2 |
| H29 | Rückwechsel zu Standard, exportiert | Wie H28, danach „Standard" wählen, exportieren | Export enthält **kein** `<w:pStyle>` mehr für diesen Absatz | 4.1.3 |
| H30 | Ebenenwechsel „Überschrift 2" → „Überschrift 5", exportiert | Wie H28 mit direktem Ebenenwechsel | Export referenziert ausschließlich `Heading5` | 4.1.4 |
| H31 | ODT: im Editor erzeugte Überschrift, exportiert | Neues Dokument, „Überschrift 4" setzen, exportieren | `content.xml` enthält `<text:h ... text:outline-level="4">` | 4.2.2 |
| H32 | ODT Rückwechsel/Ebenenwechsel, exportiert | Analog H29/H30 für ODT | Analog | 4.2.3/4.2.4 |
| H33 | Cross-Format einfach: ODT → DOCX | ODT mit Überschriften hochladen, als DOCX exportieren (bzw. Re-Import-Umweg, falls direkter Formatwechsel beim Export nicht unterstützt — vor Testimplementierung an der UI verifizieren, analog `fett-qa.md` Abschnitt 8 zu B22) | Level/Text bleiben erhalten | 4.1.6 |
| H34 | Cross-Format einfach: DOCX → ODT | Spiegelbildlich | analog | 4.2.6 |
| H35 | Reale Fremddatei DOCX (`heading123.docx`) | Echter Upload | Level/Text korrekt erkannt, sichtbar im Editor | 4.1.7 |
| H36 | Reale Fremddatei ODT (`MyHeading1.odt`) | Echter Upload | Text/Ebene bleiben erhalten; Ausrichtung protokollieren (vor Fix vermutlich `left`, nach Fix ggf. weiterhin `left`, falls die Fixture selbst kein `fo:text-align` deklariert — siehe E1/Abschnitt 2.5, hier den tatsächlichen Browser-Zustand zusätzlich bestätigen) | 4.2.7, Befund 6, Grenzfall 15 |
| H37 | Reale Fremddatei ODT (`ListHeading.odt`/`ListHeading2.odt`) | Echter Upload | `list_item` mit Absatz+Überschrift korrekt dargestellt, Konvertierbarkeit an beiden Positionen im Browser nachgewiesen (ergänzt H6-H8) | Grenzfall 4/5 |

#### 3.1.9 Cross-Format-Rundreise hin und zurück (Anforderung 4.3, Testfall 5.15)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H38 | DOCX → ODT → DOCX | DOCX mit Überschriften unterschiedlicher Ebenen hochladen → als ODT exportieren (Download abfangen) → diese Datei über die ODT-Karte erneut hochladen → als DOCX zurückexportieren | Level/Text nach zwei Formatkonvertierungen identisch (DOMParser-Prüfung auf dem letzten Download) | 4.3.1 |
| H39 | ODT → DOCX → ODT | Spiegelbildlich | analog | 4.3.2 |
| H40 | Formatwechsel + Cross-Format kombiniert | Standard → Überschrift → Standard (im Editor per Dropdown) → Export als jeweils anderes Format → Reimport | Ergebnis entspricht exakt dem tatsächlichen Nach-Wechsel-Zustand (inkl. ggf. verlorener Ausrichtung, falls `code.md` §3.2 zum Testzeitpunkt noch nicht umgesetzt ist) — **kein** überraschendes Wiederauftauchen der alten Ausrichtung durch einen Konvertierungs-Zufall | 4.3.3 |

#### 3.1.10 Mobile/Tablet (Anforderung §1 Zeile 6, Testfall 5.17)

| # | Test | Projekte | Assertion | Bezug |
|---|---|---|---|---|
| H41 | Kernfunktion H1–H3 auf allen drei Projekten | Desktop Chrome, Mobile (Pixel 7), Tablet (iPad Mini) | Dropdown erreichbar (nicht abgeschnitten/verdeckt), `selectOption` funktioniert projektunabhängig identisch zu H1-H3 | §1 Zeile 6, §5.17 |
| H42 | Toolbar-Layout nicht abgeschnitten | Screenshot/Bounding-Box des `<select>` auf Mobile/Tablet | `select` liegt vollständig innerhalb des sichtbaren Viewports (`boundingBox()` gegen Viewport-Maße prüfen) | §1 Zeile 6 |

### 3.2 Ergänzende Grenzfall-Tests (Anforderung Abschnitt 3, vollständige Abdeckung)

Zur vollständigen Abdeckung aller 18 Grenzfälle aus `req.md` Abschnitt 3 (§5
listet nur eine Teilmenge namentlich): H1-H42 decken bereits 1, 2, 4-13, 17
ab (siehe Bezug-Spalten oben) — zusätzlich:

| # | Test | Bezug |
|---|---|---|
| H43 | Grenzfall 3 — Selektion über Absatz **und** Überschrift gemeinsam, Dropdown-Anzeige währenddessen | Absatz + Überschrift per Maus-Drag gemeinsam markieren, `select`-Wert **vor** einer Aktion prüfen (`expect(select).toHaveValue(...)` — welcher Wert das ist, ist die in `code.md` §4.2 dokumentierte Tie-Break-Regel „erster erfasster Block", hier am echten DOM nachweisen) | Grenzfall 3 |
| H44 | Grenzfall 17 — sehr viele Wechsel in kurzer Zeit | `selectOption` 20× in schneller Folge mit wechselnden Werten (simuliert schnelles Durchschalten per Pfeiltasten im offenen Dropdown) | Kein doppeltes/verzögertes Dispatch, `select`-Wert am Ende entspricht exakt dem letzten gewählten Wert, kein veralteter Zwischenzustand | Grenzfall 17 |
| H45 | Grenzfall 18 — Track-Changes-Abhängigkeit | Kein Testfall möglich/nötig, solange Änderungsverfolgung laut Backlog nicht existiert; hier nur als „nicht anwendbar, vermerkt" geführt (analog `fett-qa.md` B36) | Grenzfall 18, explizit **nicht im Scope** |

### 3.3 Tastenkombination (Anforderung §1 Zeile 3, optional laut `code.md` §4.4)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| H46 | `Strg+Alt+1`…`6`/`Strg+Alt+0`, **nur falls** `code.md` §4.4 umgesetzt wird | Cursor in Absatz, `page.keyboard.press('ControlOrMeta+Alt+1')` | Wechselt zu „Überschrift 1", analog für 2-6 und `0` (Standard) | §1 Zeile 3 |
| H47 | Falls **nicht** umgesetzt | Kein Testfall — stattdessen explizit im Testreport vermerken: „bewusst fehlende Komfortfunktion, dokumentiert, kein Blocker" (wörtliche Vorgabe aus `req.md` §1 Zeile 3) | §1 Zeile 3 |

### 3.4 Datei-Upload: echter `filechooser`, nicht nur `setInputFiles` auf versteckten Input

**Befund (identisch zum bereits in `fett-qa.md` Abschnitt 3.4 dokumentierten
Muster):** Die bestehenden Upload-Tests (`docx.spec.ts`, `odt.spec.ts`) rufen
`input.setInputFiles(...)` **direkt** auf dem versteckten `<input type="file"
className="hidden">` auf und umgehen damit den sichtbaren „Datei
hochladen"-Button. Für „echte Bedienung" im Sinne dieses Auftrags gehört
mindestens **ein** Testfall pro Format (H26/H27, H38/H39), der den
tatsächlichen Klickpfad nutzt:

```ts
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  docxCard(page).getByRole('button', { name: 'Datei hochladen' }).click(),
])
await fileChooser.setFiles({ name: 'beispiel.docx', mimeType: '...', buffer })
```

Die übrigen Testfälle in diesem Plan (H8, H9, H35-H37) dürfen der Einfachheit
halber weiterhin `input.setInputFiles(...)` nutzen, solange **mindestens** die
oben genannten Kern-Rundreise-Tests den echten Klickpfad abdecken — analog zur
in `fett-qa.md` getroffenen Abwägung.

### 3.5 Bestehende Tests, die unverändert weiterlaufen müssen

- `tests/e2e/selection-regression.spec.ts` (alle 3 Tests) — **Pflichtbestandteil**
  (Abnahmekriterium 7 aus `req.md`), bleibt zusätzlich zu H23-H25 bestehen.
- `tests/e2e/docx.spec.ts:99`, `tests/e2e/odt.spec.ts:80` — bleiben bestehen;
  ihre Überschriften-Assertionen werden durch `absatzformat.spec.ts` (H1-H47)
  fachlich abgelöst, aber **nicht** gelöscht, solange sie andere Aspekte
  (Upload, Edit-nach-Upload) mit abdecken.
- `tests/e2e/lifecycle.spec.ts` — unverändert, keine Absatzformat-Berührung
  erwartet, muss aber grün bleiben.

### 3.6 Unabhängige Prüfung der heruntergeladenen Datei

Anforderung 4.1.2/4.2.2 verlangt explizit einen „unabhängigen Parser" statt
reiner String-Suche. Für alle strukturellen Prüfungen in H15, H28-H32, H35-H40:

```ts
import { JSDOM } from 'jsdom' // bereits Devdependency
const parser = new JSDOM('').window.DOMParser()
const xmlDoc = parser.parseFromString(documentXml, 'application/xml')
const headingParagraph = [...xmlDoc.getElementsByTagNameNS(W_NS, 'p')]
  .find((p) => p.textContent?.includes('Erwarteter Text'))
const pStyle = headingParagraph
  ?.getElementsByTagNameNS(W_NS, 'pPr')[0]
  ?.getElementsByTagNameNS(W_NS, 'pStyle')[0]
expect(pStyle?.getAttributeNS(W_NS, 'val')).toBe('Heading3')
```

Analog für ODT: `content.xml` per DOMParser auf `<text:h
text:outline-level="…">` bzw. Abwesenheit von `text:outline-level` bei
`<text:p>` prüfen.

### 3.7 Cross-Browser-Matrix

| Testgruppe | Desktop Chrome | Mobile (Pixel 7) | Tablet (iPad Mini) | Anmerkung |
|---|---|---|---|---|
| `selectOption`-basierte Tests (H1-H3, H6-H18, H26-H40, H43) | Pflicht | Pflicht | Pflicht | `selectOption` funktioniert projektunabhängig (löst natives `change`-Event aus) |
| Maus-Drag-Selektion (H4, H11, H12, H43) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | Touch-Geräte ohne Maus — Playwright simuliert `page.mouse` unabhängig vom Gerätetyp, reales Touch-Drag-Verhalten ist ein zu dokumentierender Sonderfall, kein Testausschluss |
| Tastatur-only-Tests (H16, H17, H20-H22, H46) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | Analog `fett-qa.md` 3.7 |
| Layout/Erreichbarkeit (H42) | n/a | Pflicht | Pflicht | Kernzweck dieses Tests ist gerade die kleineren Viewports |

---

## 4. Traceability-Matrix (Anforderung Abschnitt 5 → Testfall)

| `absatzformat-dropdown-req.md` §5, Punkt | Testfall(e) in diesem Plan |
|---|---|
| 1 | H1 |
| 2 | H2 |
| 3 | H3 |
| 4 | H4 |
| 5 | H6, H8 |
| 6 | H7, H8 |
| 7 | H10 |
| 8 | H11, H12 |
| 9 | H13 |
| 10 | H16 |
| 11 | H17 |
| 12 | H20, H21 |
| 13 | H23, H24 |
| 14 | H26-H37 |
| 15 | H38, H39 |
| 16 | H35-H37, E1-E6, T1-T3 |
| 17 | H41, H42 |

| `req.md` Abschnitt 3, Grenzfall | Testfall(e) |
|---|---|
| 1 | C11 |
| 2 | H4, C4 |
| 3 | H43, C10 |
| 4 | H6, C7 |
| 5 | H7, H37, C7 |
| 6 | H10, C8 |
| 7 | H11, H12, C9 |
| 8 | H13, C5 |
| 9 | H14, C6 |
| 10 | H2, C2 |
| 11 | H16 |
| 12 | H17 |
| 13 | H19 |
| 14 | H23, H24 |
| 15 | H36, E1, S1, S2 |
| 16 | H35, E6, T1, T2 |
| 17 | H44 |
| 18 | H45 (nicht anwendbar, vermerkt) |

---

## 5. Erwarteter Ist-Status je Testfall (vor Umsetzung von `absatzformat-dropdown-code.md`)

| Status | Testfälle | Grund |
|---|---|---|
| **Erwartet ROT** (dokumentiert bestätigten Bug/fehlende Implementierung) | C4, C5, C7, C9 (Ursache, nicht Ergebnis — Ergebnis „No-Op" ist grün, aber aus falschem Grund laut Grenzfall 2.7, siehe Abschnitt 0), C12-C16 (Funktionen existieren noch nicht), D6, T1, S1, S2, SC4, H4 (neues Verhalten), H6 (neues Verhalten), H9/Finding E3 (Status unklar, siehe E4/H9 — von QA zu verifizieren, nicht anzunehmen), H11 (neues Verhalten), H13/H14 (neues Verhalten) | Befunde 3/4/5, Finding D/E2/E3/F, `code.md` §4 (noch nicht umgesetzt) |
| **Erwartet GRÜN** (sollte mit aktuellem Code bereits bestehen, dokumentiert den Ist-Zustand/Bug als Ist-Zustand) | C1-C3, C8, C10, C11, C9 (Ergebnis „No-Op"), H1-H3, H7, H8 (für den bereits funktionierenden zweiten Kind-Fall), H10, H12, H16-H18, H20-H22, H23-H25, H26-H40 (Grundfunktion Rundreise, sofern kein Formatwechsel-Erhalt geprüft wird), H35, H41-H44, D1-D5, D7, O1-O6, E1-E3, E5, T3, SC1-SC3, X1-X3 | Basiert auf unverändertem, bereits funktionierendem Reader/Writer/Command-Grundverhalten |
| **Unbekannt, muss zuerst ausgeführt werden** (QA übernimmt Behauptung nicht ungeprüft) | E4, H9 (Finding E3 — nur unter Vitest+jsdom reproduziert, nicht im echten Browser) | `code.md` §3.3 selbst räumt ein, dass der Nachweis „temporär" war; QA muss dies eigenständig im echten Browser reproduzieren, bevor der Status hier final eingetragen wird |

Sobald `absatzformat-dropdown-code.md` Abschnitt 4 umgesetzt ist, müssen C4,
C5, C7, C9 (Erwartung), D6, T1, S1, S2, SC4, H4, H6, H11, H13, H14 von ROT auf
GRÜN wechseln (mit entsprechend angepassten Assertions, siehe die jeweiligen
Zeilen oben) — das ist der konkrete, maschinell prüfbare Nachweis, dass die
Fixes wirken, nicht nur Code-Review.

---

## 6. Abgleich mit Abnahmekriterien (`absatzformat-dropdown-req.md` Abschnitt 7)

| DoD-Punkt | Abdeckung in diesem Testplan |
|---|---|
| 1. Alle Testfälle aus Anforderung §5 real im Browser ausgeführt, grün | Abschnitt 3.1 (H1-H42) + Traceability-Matrix Abschnitt 4 |
| 2. Rundreise-Anforderungen §4 durch unabhängigen Parser/Re-Import bestätigt | H15, H26-H40, D1-D7, O1-O6, Abschnitt 3.6 |
| 3. Design-Frage Mehrfachselektion (§2.3/Grenzfall 2) entschieden und Ergebnis nachgetragen | H4, C4, C12/C13 — Ergebnis der Entscheidung aus `code.md` §3.1 hier durch H4 empirisch am DOM belegt |
| 4. Design-Frage Ausrichtungserhalt (§2.5/Grenzfall 8-9) entschieden und nachgetragen | H13-H15, C5/C6 — Ergebnis der Entscheidung aus `code.md` §3.2 hier durch H13-H15 belegt |
| 5. Listen-Inkonsistenz (§2.6/Grenzfall 4-5) aufgelöst | H6-H8, H37, C7, SC1-SC4 — Ergebnis der Entscheidung aus `code.md` §3.3 (einheitlich erlauben) hier belegt |
| 6. ODT-`office:styles`-Befund (Befund 6/Grenzfall 15/Testfall 4.2.7) an realer Fremddatei nachvollzogen | H36, E1, S1, S2 |
| 7. Selection-Sync-Regressionstest × Absatzformat geschrieben, grün, dauerhaft Teil der Suite | H23-H25 |
| 8. Kein Testfall zeigt stillen Datenverlust/JS-Exception | H5, H9 (Finding E3), Abschnitt 3.2 (H43-H45), `disabled`-Zustand des Dropdowns (sobald `code.md` §4.2 umgesetzt ist, per zusätzlichem Test `expect(select).toBeDisabled()` bei einer nicht-anwendbaren Selektion zu ergänzen — **aktuell fehlt dieser Test noch explizit im Plan und ist vor Abnahme nachzutragen, sobald `code.md` §4.2 real existiert**) |
| 9. Backlog-Status-Korrektur | Nicht Gegenstand dieses Testplans (ändert `absatzformat-dropdown-req.md`/`FEATURE-BACKLOG.md` nicht selbst) — nach grünem Abschnitt 5 dieses Dokuments kann der Status von „vorhanden" auf den tatsächlich verifizierten Stand aktualisiert werden. |

---

## 7. Ausführungsreihenfolge (Vorschlag)

1. **Zuerst** Abschnitt 0 dieser Datei (Stichprobenprüfung) vollständig
   nachvollziehen — bereits geschehen, Ergebnis oben dokumentiert.
2. Unit-Tests C4, C5, C7, C9, D6, T1, S1, S2, SC1, SC2, SC4 (Abschnitt 2)
   zuerst schreiben und **bewusst rot bzw. den dokumentierten Ist-Zustand
   bestätigend** laufen lassen — dient als Ausgangsnachweis, dass die in
   Abschnitt 0 bestätigten Bugs real und reproduzierbar sind, bevor
   irgendetwas gefixt wird.
3. **E4/H9 (Finding E3) vorrangig vor allen anderen E2E-Tests ausführen** —
   dies ist der einzige Befund mit Absturzpotenzial; muss vor jeder weiteren
   manuellen/automatisierten Exploration des Editors bestätigt oder
   widerlegt sein.
4. `absatzformat.spec.ts` H1-H25 (Bedienung/Zustand/Grenzfälle/Regression).
5. `absatzformat.spec.ts` H26-H40 (Rundreise einfach + Cross-Format).
6. `absatzformat.spec.ts` H41-H47 (Mobile/Tablet, Tastenkombination, sonstige
   Grenzfälle) + verbleibende Unit-Tests (Abschnitt 2.3-2.9).
7. Nach Umsetzung von `absatzformat-dropdown-code.md` Abschnitt 4: alle als
   „ROT erwartet" markierten Fälle erneut ausführen, Statuswechsel auf GRÜN
   dokumentieren; `selection-regression.spec.ts` **und** H23-H25 zusätzlich
   erneut laufen lassen.
8. Traceability-Matrix (Abschnitt 4) und DoD-Abgleich (Abschnitt 6) final
   gegenprüfen, bevor der Backlog-Status geändert wird.

---

## 8. Offene Punkte für QA

- **E4/H9 (Finding E3):** `code.md` behauptet einen reproduzierten Absturz,
  belegt ihn aber nur mit einem bereits wieder entfernten Vitest-Scratch-Test.
  QA darf dies **nicht** als bestätigt übernehmen — Priorität 1 vor jeder
  weiteren Arbeit an diesem Plan (siehe Ausführungsreihenfolge Punkt 3).
- **C9 (Finding A):** Ebenso von `code.md` nur einmalig unter Vitest
  nachgewiesen — Abschnitt 2.2 dieser Datei schreibt bewusst einen
  **dauerhaften** Test dafür fest, statt die Behauptung unverifiziert zu
  übernehmen.
- H4/H6/H11/H13/H14 hängen vollständig von den in `code.md` §3.1/§3.2/§3.3
  getroffenen Design-Entscheidungen ab. Sollte das Entwicklerteam eine
  andere Entscheidung treffen (z. B. Mehrfachselektion doch nicht erweitern),
  müssen diese Testfälle vor Ausführung entsprechend umgeschrieben werden —
  die Tabellen oben nennen für jeden Fall explizit „vor Fix"/„nach Fix", damit
  ein Wechsel der Entscheidung keine stillschweigend falschen Erwartungen
  hinterlässt.
- H7 (zweiter Absatz **innerhalb** desselben Listenpunkts per UI) setzt
  voraus, dass sich ein zweiter Block im selben `<li>` überhaupt über die
  bestehende UI erzeugen lässt (z. B. `Shift+Enter`) — vor
  Testimplementierung am echten Editor verifizieren, welche Tastenkombination
  das tatsächlich auslöst, da `WordEditor.tsx`s `Enter`-Bindung laut
  `req.md` 2.8 für Listenpunkte gesondert behandelt wird.
- E6 (Grenzfall 16, DOCX `w:basedOn`-Kandidaten `Numbering.docx`/
  `ComplexNumberedLists.docx`) muss vor Verwendung inhaltlich geöffnet werden
  — Dateiname ist keine Garantie, dass das Muster tatsächlich enthalten ist;
  andernfalls eine synthetische Fixture nach Muster T1 verwenden.
- H13/H15 benötigen vorab die genauen `Toolbar.tsx`-Locators für die
  Ausrichtungs-Buttons (nicht Gegenstand dieser Anforderung selbst, aber
  Voraussetzung für den Testaufbau) — vor Testimplementierung kurz gegen den
  aktuellen Code verifizieren.
- Abschnitt 6, DoD-Punkt 8 (Disabled-Zustand des Dropdowns): Der zugehörige
  Testfall existiert in diesem Plan noch nicht als eigener Eintrag, da
  `code.md` §4.2 (disabled-Attribut) im aktuellen Code noch nicht existiert
  (siehe Abschnitt 0). Sobald umgesetzt, muss hier ein Test `H48` ergänzt
  werden: nicht-anwendbare Selektion (z. B. reine `CellSelection` über eine
  Bildzelle) → `expect(select).toBeDisabled()` **und** `title`-Attribut
  vorhanden.
