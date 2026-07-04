# QA-Testplan: Feature „Ausrichtung zentriert"

Rolle: QA-Antwort auf `specs/ausrichtung-zentriert-req.md` (Anforderung) und
`specs/ausrichtung-zentriert-code.md` (Entwicklerplan). Dieses Dokument nimmt
**keinen** der beiden Vorgängertexte als bewiesen an — `ausrichtung-zentriert-code.md`
ist laut eigenem Titel ein *Plan*, keine verifizierte Umsetzung ("Kein Punkt hier ist
bereits umgesetzt"). Jede Behauptung aus beiden Dokumenten wird hier auf einen
konkreten, ausführbaren Testfall abgebildet. Ergebnis ist ein Testplan, kein
Testbericht — die hier aufgeführten Tests sind zum Zeitpunkt dieses Dokuments
größtenteils **noch nicht geschrieben** (siehe Abschnitt 5, Spalte „Erwarteter
Status").

Stil/Gliederung orientiert an `fett-qa.md` (Präzedenzfall für dieses Repo).

---

## 0. Stichprobenprüfung des Ist-Codes (QA-Gegenkontrolle von `ausrichtung-zentriert-code.md`)

Bevor der Plan aufgestellt wird, wurden die zentralen Behauptungen aus
`ausrichtung-zentriert-code.md` Abschnitt 2 direkt im aktuellen Code
nachvollzogen (nicht nur aus dem Dokument übernommen):

| Behauptung | QA-Gegenkontrolle | Ergebnis |
|---|---|---|
| Fehler 1: `setAlign` erzeugt bei Mehrabsatz-Selektion pro Treffer eine neue, vom ursprünglichen `state` abgeleitete Transaktion (`state.tr` als Getter in der `nodesBetween`-Schleife) | `src/formats/shared/editor/commands.ts:13-27` gelesen | **Bestätigt (Code-Struktur exakt wie behauptet).** `state.doc.nodesBetween(from, to, (node, pos) => { ...; dispatch(state.tr.setNodeAttribute(pos, 'align', align)) })` — `state` ist der äußere, zum Aufrufzeitpunkt fixierte Parameter; jeder Schleifendurchlauf holt `state.tr` erneut vom selben, unveränderten `state`. Die tatsächliche Laufzeit-Exception (`RangeError`) wurde von QA selbst **noch nicht** durch Ausführung reproduziert — das ist der erste Pflichttest dieses Plans (C2, Abschnitt 2.2). |
| Fehler 2: `setHeading` setzt `align` bei jedem Formatvorlagenwechsel hart auf `'left'` | `commands.ts:40-55` gelesen | **Bestätigt exakt.** Zeile 43: `const attrs = level === null ? undefined : { level, align: 'left' }`. Der `undefined`-Zweig (Wechsel zurück zu „Standard") fällt auf den Schema-Default `'left'` zurück — ebenfalls betroffen. |
| Fehler 3: ODT-Reader reicht `fo:text-align` unnormalisiert durch (z. B. `"end"`/`"start"` landen roh im `align`-Attribut) | `src/formats/odt/reader.ts:62-65` gelesen | **Bestätigt exakt.** `const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align'); if (align) paragraphAligns.set(name, align)` — keine Wertetabelle wie beim DOCX-Reader. |
| Fehler 4: `isAlignActive` prüft nur den alignierbaren Vorfahren von `$from`, nicht die volle Selektion | `commands.ts:29-38` gelesen | **Bestätigt exakt.** Bei gemischter Mehrabsatz-Selektion, die mit einem zentrierten Absatz beginnt, liefert die Funktion `true`, obwohl weitere Absätze anders ausgerichtet sind. |
| Fehler 5: `AlignButton` verdrahtet nur `onMouseDown`, kein `onClick` (Tastatur-Aktivierung wirkungslos) | `src/formats/shared/editor/Toolbar.tsx:64-84` gelesen | **Bestätigt.** Kein `onClick`/`onKeyDown` vorhanden — ein natives `<button>` feuert bei Tab+Enter/Space kein `mousedown`. |
| Verdachtsmoment 7: kein `aria-label` an `AlignButton` (anders als `MarkButton`) | `Toolbar.tsx:64-84` vs. `Toolbar.tsx:47` | **Bestätigt.** `MarkButton` setzt `aria-label={title}` (Zeile 47), `AlignButton` setzt gar kein `aria-label`. |
| Verdachtsmoment 8: `title` zeigt internen Bezeichner statt deutscher Beschriftung | `Toolbar.tsx:69` gelesen | **Bestätigt exakt.** `title={`Ausrichtung: ${align}`}` rendert wörtlich `"Ausrichtung: center"`. Relevant für alle `getByTitle(...)`-Selektoren in diesem Plan (siehe Abschnitt 1). |
| Verdachtsmoment 6: kein Tastenkürzel für irgendeine Ausrichtung | `src/formats/shared/editor/WordEditor.tsx:71-79` gelesen | **Bestätigt.** Keymap enthält `Mod-z/y/Shift-z/b/i/u`, kein `Mod-e`/`Mod-l`/`Mod-r`/`Mod-j`. |
| DOCX: `JC_TO_ALIGN` kennt nur `left/center/right/both` | `src/formats/docx/reader.ts:13` gelesen | **Bestätigt exakt.** `{ left: 'left', center: 'center', right: 'right', both: 'justify' }`, Fallback `?? 'left'` bei Zeile 152. |
| Kein Toolbar-Button zum Verbinden von Tabellenzellen (`colspan`/`rowspan` nur importierbar, nicht per UI erzeugbar) | `Toolbar.tsx` per Volltextsuche nach `mergeCells`/„Zellen verbinden" durchsucht | **Bestätigt: kein Treffer.** Relevant für Testfall 14 (siehe Abschnitt 8, Offener Punkt). |
| Kein Kopf-/Fußzeile-Bearbeitungs-UI | `Toolbar.tsx` durchsucht nach `header`/`footer`/„Kopfzeile"/„Fußzeile" | **Bestätigt: kein Treffer.** Bestätigt Grenzfall 9 der Anforderung („nicht end-to-end über die Oberfläche testbar"). |
| Fixture-Existenz: `bug-paragraph-alignment.docx`, `table-alignment.docx`, `TestTableCellAlign.docx`, `rtl.docx`, `CharacterParagraphFormat.odt`, `feature_attributes_paragraph_MSO2013.odt` | Per `Glob` in `tests/fixtures/external/{docx,odt}/` geprüft | **Alle vorhanden**, wie in beiden Vorgängerdokumenten behauptet. |

**Konsequenz für diesen Testplan:** Alle fünf nummerierten Fehler und alle acht
Verdachtsmomente aus `ausrichtung-zentriert-code.md`/`-req.md` werden unten als
**aktuell rot erwartete** Testfälle geführt (Regressionstests, die den Bug
dokumentieren, bis `ausrichtung-zentriert-code.md` Abschnitt 4 umgesetzt ist), nicht
als hypothetische Grenzfälle. Fehler 1 (RangeError bei Mehrabsatz-Zentrierung) ist der
schwerwiegendste Einzelbefund und blockiert praktisch jeden Mehrabsatz-Testfall in
diesem Plan (C2–C4, Z3–Z5, Z8, Z22, Z36–Z37) — er wird deshalb sowohl auf
Unit- als auch auf E2E-Ebene als erster Testfall geführt.

---

## 1. Testumgebung

- Unit-Tests: `npm test` (Vitest, `jsdom`-Environment).
- E2E-Tests: `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `baseURL: 'http://localhost:4173/salamanido/'`, `webServer` baut (`npm run build`)
    und startet `vite preview` automatisch.
  - Drei Projekte: **Desktop Chrome**, **Mobile** (`Pixel 7`), **Tablet**
    (`iPad Mini`) — jeder neue Testfall muss in **allen drei** grün sein, sofern er
    nicht explizit auf reine Tastaturbedienung angewiesen ist (siehe Abschnitt 3.7).
- Bestehende Konventionen (aus `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
  übernommen, in `alignment.spec.ts` beizubehalten):
  - `page.goto('/')` → Privacy-Banner wegklicken: `page.getByRole('button', { name: /verstanden/i }).click()`.
  - Karten-Locator: `docxCard(page)`/`odtCard(page)` über
    `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: '...' }) })`.
  - Editor-Locator: `page.locator('.ProseMirror')`.
  - Export: `page.getByRole('button', { name: 'Exportieren' })` + `page.waitForEvent('download')`.
  - Datei-Upload zwei Varianten (siehe Abschnitt 3.4): schneller `input.setInputFiles(...)`
    auf `input[type="file"]` **und** mindestens ein Testfall pro Format über den
    echten sichtbaren Button + `page.waitForEvent('filechooser')`.
- **Wichtiger Selektor-Vorbehalt (aus Abschnitt 0 Verdachtsmoment 8):** Der
  Zentriert-Button hat **aktuell** `title="Ausrichtung: center"` (interner
  Bezeichner, kein `aria-label`). Alle Tests in diesem Plan verwenden deshalb
  vorläufig `page.getByTitle('Ausrichtung: center')`. Sobald
  `ausrichtung-zentriert-code.md` Abschnitt 4.2 umgesetzt ist, wechselt der Titel
  auf `"Ausrichtung: Zentriert"` **und** ein `aria-label` wird ergänzt — dann
  **müssen alle Testfälle in diesem Plan auf den neuen Titeltext migriert werden**,
  sonst laufen sie nach dem Fix fälschlich rot statt grün. Analog für
  „Links"/„Rechts"/„Blocksatz" in Z6 (`"Ausrichtung: left"` → `"Ausrichtung:
  Links"` usw.). Diese Migration ist selbst ein abzuhakender Schritt (siehe
  Abschnitt 7, Punkt 4).

---

## 2. Teil A — Unit-Tests

**Zweck:** Schnelle, browserunabhängige Absicherung von zwei getrennten Ebenen, die
in dieser Anforderung beide kritisch sind: (A.1) der geteilte ProseMirror-Mechanismus
selbst (`setAlign`/`isAlignActive`/`setHeading` — hier sitzt der schwerwiegendste
Bug, Fehler 1, und ist unabhängig von DOCX/ODT reproduzierbar) sowie (A.2) die
Reader/Writer-Rundreise DOCX **und** ODT (Kernauftrag dieses Plans). Ein rotes
Toolbar-/Browser-Verhalten darf diese Unit-Tests nicht rot färben und umgekehrt.

### 2.1 Bestandsaufnahme (bereits vorhanden, als Basisschutz zu erhalten)

| Datei | Test | Deckt ab |
|---|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts:41-53` | `it.each(['left','center','right','justify'])` für Absätze + dedizierter Test „preserves heading alignment" (`center`) | Anforderung 2.4 (Grundfall), nur Writer→eigener Reader |
| `src/formats/odt/__tests__/roundtrip.test.ts:41-53` | analog | Grundfall, nur Writer→eigener Reader |

Diese Tests bleiben unverändert Teil der Suite; sie werden **nicht** ersetzt, nur
ergänzt — sie decken laut Anforderungsabschnitt 1 explizit **nicht** Tabellen,
Listen, Formatvorlagen-Wechsel oder Fremddateien ab.

### 2.2 Neue Datei: `src/formats/shared/editor/__tests__/commands.test.ts`

Echte `EditorState`/`EditorView` in jsdom (analog zu den in
`ausrichtung-zentriert-code.md` Abschnitt 0 beschriebenen Reproduktionen), **mit**
`history()`-Plugin, damit Undo-Verhalten geprüft werden kann.

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status |
|---|---|---|---|---|
| C1 | `setAlign('center')` auf Einzelabsatz (Cursor, keine Selektion) | Ein-Absatz-Dokument, Cursor hineinsetzen, `setAlign('center')(view.state, view.dispatch)` | `align === 'center'`, kein Fehler | Grün erwartet |
| C2 | **Kritischer Regressionstest Fehler 1** — `setAlign('center')` auf 3-Absatz-Selektion | 3 Absätze (`left`, `right`, `justify`), Selektion über alle drei, `setAlign('center')(view.state, view.dispatch)` aufrufen | Alle drei `align === 'center'`, **kein** `RangeError`-Wurf | **ROT** (reproduziert exakt die in `ausrichtung-zentriert-code.md` Abschnitt 2.1 dokumentierte Exception: `RangeError: Applying a mismatched transaction`, Endergebnis `['center','left','left']`) |
| C3 | Ein Klick = ein Undo-Schritt bei Mehrabsatz-Selektion | Direkt nach (gefixtem) C2: ein einziges `undo()` aus `prosemirror-history` | Alle drei Absätze zurück auf `['left','right','justify']` in **einem** Schritt | Blockiert durch C2 (kann erst sinnvoll geprüft werden, sobald C2 grün ist) |
| C4 | No-Op bei bereits gesetztem Wert (Grenzfall 12) | `setAlign('center')` zweimal in Folge auf dieselbe, bereits zentrierte Selektion; `undoDepth`/Anzahl der `dispatchTransaction`-Aufrufe vor/nach vergleichen | Zweiter Aufruf erzeugt **keine** neue Undo-Stufe | Blockiert durch C2 |
| C5 | **Regressionstest Fehler 4** — `isAlignActive` bei gemischter Selektion | Zwei Absätze, erster `center`, zweiter `left`, Selektion über beide, `isAlignActive(state, 'center')` für **alle vier** Werte prüfen | Für **keinen** der vier Werte `true` (kein Button zeigt „aktiv") | **ROT** (aktuell `true` für `'center'`, da nur `$from` geprüft wird) |
| C6 | **Regressionstest Fehler 2/Kernverdacht 6.1** — `setHeading(1)` auf zentrierten Absatz | Absatz mit `align:'center'`, `setHeading(1)(state, dispatch)` | `align` bleibt `'center'` | **ROT** (aktuell `'left'`) |
| C7 | `setHeading(null)` auf zentrierte Überschrift (zurück zu Standard) | Überschrift mit `align:'center'`, `setHeading(null)(state, dispatch)` | `align` bleibt `'center'` | **ROT** |
| C8 | `setHeading` zwischen zwei Überschriftsebenen (1→3) auf zentriertem Text | Überschrift Ebene 1, `align:'center'`, `setHeading(3)` | `align` bleibt `'center'` | **ROT** |
| C9 | `setAlign` auf Absatz innerhalb `list_item`/`table_cell` | Dokument mit `list_item > paragraph` bzw. `table_cell > paragraph` direkt per JSON aufgebaut, Cursor hinein, `setAlign('center')` | `align === 'center'`, keine Nebenwirkung auf Nachbarknoten | Grün erwartet (bestätigt Abschnitt 3.6 der Anforderung, aber bisher unbelegt) |
| C10 | Performance-Rauchtest (Vorstufe zu Testfall 39) | Synthetisches Dokument mit 200 Absätzen, Selektion über alle, `setAlign('center')` | Läuft ohne Timeout durch (`performance.now()`-Differenz protokollieren) | Blockiert durch C2 (vor dem Fix bricht die Schleife nach dem zweiten Absatz mit `RangeError` ab) |

### 2.3 `src/formats/docx/__tests__/roundtrip.test.ts` (ergänzt)

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status |
|---|---|---|---|---|
| D1 | **Regressionstest Grenzfall 1/Fehler 6** — stilbasierte Zentrierung ohne direktes `w:jc` | Synthetisch: Absatz mit `w:pStyle`, referenzierter Stil in `styles.xml` mit `<w:jc w:val="center"/>`, kein direktes `w:jc` am Absatz | `align === 'center'` | **ROT** (aktuell `'left'`) |
| D2 | `w:basedOn`-Kette (2 Ebenen) + Zyklenschutz | Stil A `basedOn` B, nur B hat `<w:jc>`; separat: Stil A `basedOn` B, B `basedOn` A (Zyklus) | Kette korrekt aufgelöst; Zyklus wirft **nicht**, bricht nach `MAX_STYLE_CHAIN_DEPTH` ab | Blockiert durch D1 |
| D3 | Direkte Formatierung schlägt Stil (Vorrang-Test) | Absatz mit eigenem `<w:jc w:val="left"/>` **und** `w:pStyle`, dessen Stil `center` definiert | `align === 'left'` (Direktformatierung gewinnt) | Grün erwartet (spiegelt Absatz 2 aus `bug-paragraph-alignment.docx`) |
| D4 | **Regressionstest Fehler 7** — `jc="start"`/`jc="end"` mit/ohne `<w:bidi/>` | 4 Kombinationen: `start`+kein bidi, `start`+bidi, `end`+kein bidi, `end`+bidi | `left`/`right`/`right`/`left` (gemäß Abschnitt 4.4b des Code-Plans) | **ROT** (aktuell alle vier → `'left'`) |
| D5 | Erweiterte `jc`-Werte | `jc="distribute"`/`"thaiDistribute"`/`"mediumKashida"` | Alle drei → `'justify'` | **ROT** (aktuell alle drei → `'left'`) |
| D6 | Zentrierter Absatz **innerhalb** `table_cell` | Rundreise Writer→Reader mit `table_cell > paragraph, align:'center'` | `align` bleibt `'center'` nach Rundreise | Grün erwartet, aber bisher **kein** Test vorhanden (Testfall 13/32) |
| D7 | Zentrierter Absatz **innerhalb** `list_item` (Bullet + nummeriert) | Analog D6 für `bullet_list`/`ordered_list > list_item > paragraph` | `align` bleibt `'center'` | Grün erwartet, bisher kein Test (Testfall 15/16/33) |
| D8 | Leerer, zentrierter Absatz | `paragraph` mit `align:'center'`, `content: []` | Rundreise erhält `align:'center'`, Absatz verschwindet nicht (kein Rückfall auf Schema-Default) | Grün erwartet (Grenzfall 5), bisher kein Test |
| D9 | Formatvorlagen-Wechsel vor Export (voller Rundreise-Pfad) | Absatz `align:'center'` → `setHeading(2)`-äquivalentes JSON → `writeDocx` → `readDocx` | `align === 'center'` (nicht `'left'`) | **ROT** vor Fehler-2-Fix (Testfall 11 der Anforderung, End-to-End statt nur Editor-Zustand) |
| D10 | Zentrierte Überschrift + Fett/Farbe kombiniert | Überschrift `align:'center'`, Text-Run mit `strong` + `textColor`-Mark | Beide Ebenen unabhängig erhalten nach Rundreise | Grün erwartet (Grenzfall 6) |

### 2.4 `src/formats/odt/__tests__/roundtrip.test.ts` (ergänzt)

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status |
|---|---|---|---|---|
| O1 | `fo:text-align` nur auf per `style:parent-style-name` referenziertem Elternstil | Automatischer Stil ohne eigenes `fo:text-align`, aber `style:parent-style-name` verweist auf Stil mit `fo:text-align="center"` | `align === 'center'` nach Import | **ROT** (aktuell nicht ausgewertet, kein Ersatzfixture deckt das ab — reiner Unit-Test nötig) |
| O2 | **Regressionstest Fehler 3** — `fo:text-align="end"`/`"start"` normalisiert | Paragraph-Stil mit `fo:text-align="end"`, einmal ohne, einmal mit `style:writing-mode="rl-tb"` | Ohne RTL: `'right'`; mit RTL (`rl-tb`): `'left'` (invertiert) | **ROT** (aktuell roh `"end"` durchgereicht) |
| O3 | Zentrierter Absatz in `table_cell`/`list_item` | Rundreise Writer→Reader | `align` bleibt `'center'` | Grün erwartet, bisher kein Test |
| O4 | Leerer, zentrierter Absatz | Analog D8 für ODT | `align` bleibt `'center'` | Grün erwartet, bisher kein Test |
| O5 | Formatvorlagen-Wechsel vor Export | Analog D9 für ODT | `align === 'center'` nach vollem Rundreise-Pfad | **ROT** vor Fix |
| O6 | Stil aus `office:styles` statt `office:automatic-styles` referenziert | `office:styles`-Eintrag (Familie `paragraph`) mit `fo:text-align="center"`, automatischer Stil verweist darauf | `align === 'center'` | **ROT** (aktuell wird nur `office:automatic-styles` gelesen) |

### 2.5 Neue Datei: `src/formats/docx/__tests__/alignment-fixtures.test.ts`

Dediziert (nicht in `external-fixtures.test.ts` gemischt, das nur „importiert ohne
Absturz" prüft):

| # | Testfall | Erwartung | Erwarteter Status |
|---|---|---|---|
| AF-D1 | `bug-paragraph-alignment.docx`: Absatz 1 (stilbasiert zentriert, kein direktes `w:jc`) | `align === 'center'` | **ROT** (aktuell `'left'`) |
| AF-D1b | Dieselbe Datei, Absatz 2 (direktes `w:jc="left"`, überschreibt Stil) | `align === 'left'` | Grün erwartet (bereits korrekt, zufällig identisch zum Fallback) |
| AF-D2 | `rtl.docx`: Absatz mit `jc="start"` + `w:bidi="1"` | `align === 'right'` (physisch, siehe D4) | **ROT** (aktuell `'left'`) |
| AF-D3 | `table-alignment.docx` — dokumentierender Test | Kein `table_cell`-Absatz hat einen von `'left'` abweichenden `align`-Wert | Grün erwartet (bestätigt, dass diese Datei **nicht** für Zentrierungs-Tests geeignet ist — reine Tabellen-Fließausrichtung `<w:tblPr><w:jc>`, kein `<w:pPr><w:jc>` in einer Zelle) |
| AF-D4 | `TestTableCellAlign.docx` — dokumentierender Test | Datei enthält **kein** einziges `<w:jc>` (nur `<w:vAlign>`, vertikale Zellausrichtung) | Grün erwartet (dokumentiert Ungeeignetheit, verhindert künftige Fehlnutzung als Ausrichtungs-Fixture) |

### 2.6 Neue Datei: `src/formats/odt/__tests__/alignment-fixtures.test.ts`

| # | Testfall | Erwartung | Erwarteter Status |
|---|---|---|---|
| AF-O1 | `feature_attributes_paragraph_MSO2013.odt`: „Center"-Absatz | `align === 'center'` | Grün erwartet (kanonischer Wert, keine Normalisierung nötig) |
| AF-O1b | Dieselbe Datei: „Align Text Right"-Absatz (`fo:text-align="end"`) | `align === 'right'` | **ROT** (aktuell `'end'` roh durchgereicht) |
| AF-O1c | Dieselbe Datei: „Justify"-Absatz | `align === 'justify'` | Grün erwartet |
| AF-O2 | `CharacterParagraphFormat.odt` — dokumentierender Test | Kein `fo:text-align` in `content.xml`/`styles.xml`, alle Absätze `'left'` | Grün erwartet (bestätigt Ungeeignetheit für Testfall 29; `feature_attributes_paragraph_MSO2013.odt` ist der korrigierte Primärkandidat) |

### 2.7 Neue Datei: `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts`

| # | Testfall | Vorgehen | Erwartung |
|---|---|---|---|
| X1 | DOCX → ODT → DOCX, einfache Zentrierung | `readDocx(writeDocx(...))` → `readOdt(writeOdt(...))` → `readDocx(writeDocx(...))` | `align === 'center'` bleibt über beide Konvertierungen erhalten (Testfall 25) |
| X2 | ODT → DOCX → ODT, einfache Zentrierung | Spiegelbildlich zu X1 | Analog (Testfall 26) |
| X3 | **Doppelte Cross-Format-Rundreise mit Kombination** | Wie X1, aber Absatz/Überschrift kombiniert mit Zentrierung + Fett + Farbe + Überschrift-Ebene 2 | Kein kumulativer Verlust der Zentrierung über zwei Konvertierungen (Testfall 27) |

### 2.8 Bekannte Grenze der Unit-Test-Ebene (Fehler 9, Copy/Paste)

`ausrichtung-zentriert-code.md` Abschnitt 2.9 dokumentiert, dass `getComputedStyle`
(die empfohlene Reparatur für „Stil auf umschließendem `<div>` statt auf `<p>`
selbst") in jsdom **keine** CSS-Vererbung auflöst — weder für ein freistehendes
noch für ein an `document.body` angehängtes Element. Ein Unit-Test für diesen
konkreten Fehler ist deshalb **nicht sinnvoll möglich**; er wird ausschließlich in
Abschnitt 3 (Z18, echter Browser) abgedeckt. Dies wird hier bewusst dokumentiert,
damit kein zukünftiger Versuch unternommen wird, ihn fälschlich als Unit-Test
nachzurüsten.

---

## 3. Teil B — Echte Playwright-Browser-Tests

**Grundsatz (bindend für diesen Abschnitt):** Kein Testfall in Teil B darf durch
direkten Aufruf interner Funktionen (`setAlign(...)`, `isAlignActive(...)`,
`readDocx(...)` etc.) im Node-Kontext ersetzt werden. Jeder Testfall muss über
echte Nutzer:innen-Handlungen im Browser laufen: `locator.click()`,
`page.keyboard.press(...)`/`.type(...)`, `input.setInputFiles(...)` bzw. echtes
`filechooser`-Event, `page.waitForEvent('download')` + Auslesen der
heruntergeladenen Datei vom Dateisystem und Prüfung mit einem vom eigenen Reader
unabhängigen Parser (JSZip + `DOMParser`, nicht nur String-`.toContain`).

### 3.1 Neue Datei: `tests/e2e/alignment.spec.ts`

Struktur analog zu `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
(`docxCard`/`odtCard`-Helfer, `buildSampleDocx`/`buildSampleOdt`-Muster für
handgebaute Fixtures wiederverwenden). Ein `test` je Zeile unten.

#### 3.1.1 Grundbedienung und Selektionsmethoden (Anforderung §3.1/3.2, Testfall 1–2)

| # | Test | Schritte | Assertion |
|---|---|---|---|
| Z1 | Cursor ohne Selektion → Zentriert klicken | Neues Dokument, Text tippen, Cursor bleibt an Position (keine Selektion), `page.getByTitle('Ausrichtung: center').click()` | `expect(page.locator('.ProseMirror p')).toHaveCSS('text-align', 'center')`; `aria-pressed="true"` auf dem Button |
| Z2 | Alle Selektionsmethoden liefern identisches Ergebnis | Vier Sub-Fälle: Maus-Ziehen (`page.mouse.down/move/up`), Doppelklick (`dblclick`), Dreifachklick (`click({ clickCount: 3 })`), `ControlOrMeta+a` — je gefolgt von Klick auf „Zentriert" | Für jede Methode identisch: `text-align: center` |

#### 3.1.2 KRITISCH: Mehrabsatz-Selektion (Regressionstest Fehler 1, Anforderung §3.2, Grenzfall 4, Testfall 3–4)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z3 | Drei Absätze mit unterschiedlicher Ausgangsausrichtung → Zentriert | Drei Absätze anlegen (Standard/links, `Ausrichtung: right` klicken, `Ausrichtung: justify` klicken), `page.on('pageerror', e => errors.push(e))` registrieren, `ControlOrMeta+a`, `Ausrichtung: center` klicken | **Alle drei** `<p>` haben `text-align: center` (nicht nur der erste); `expect(errors).toHaveLength(0)` (kein unbehandelter `RangeError` in der Konsole) | **ROT** (Kernbefund: nur der erste Absatz wird zentriert, Browser-Konsole zeigt eine unbehandelte `RangeError`-Exception) |
| Z4 | Direkt danach: **ein** `ControlOrMeta+z` | Unmittelbar nach Z3 | Alle drei Absätze zurück auf ihre jeweilige Ausgangsausrichtung (`left`/`right`/`justify`) — Nachweis „ein Klick = ein Undo-Schritt" | Blockiert durch Z3 |
| Z5 | Erneuter Klick auf bereits aktives „Zentriert" (Grenzfall 12) | Nach Z3/Z4 erneut zentrieren, dann `Ausrichtung: center` ein zweites Mal klicken, danach **ein** `ControlOrMeta+z` | Zweiter Klick verändert nichts sichtbar; das eine `Strg+Z` führt zurück zum Zustand **vor** dem ursprünglichen Zentrieren (kein leerer Undo-Schritt durch den No-Op) | Blockiert durch Z3 |

#### 3.1.3 Toggle-Verhalten und Zustandsanzeige (Anforderung §3.3/3.4, Testfall 5–8)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z6 | Links/Rechts/Blocksatz auf zentrierten Absatz | Absatz zentrieren, dann nacheinander `Ausrichtung: left`/`right`/`justify` klicken | Jede Aktion ersetzt die Zentrierung korrekt; nie zwei `aria-pressed="true"` gleichzeitig | Grün erwartet |
| Z7 | `aria-pressed` bei Cursor in zentriertem Text ohne Selektion | Absatz zentrieren, Cursor irgendwo hineinsetzen (kein Selektion) | `expect(page.getByTitle('Ausrichtung: center')).toHaveAttribute('aria-pressed', 'true')` | Grün erwartet |
| Z8 | **Regressionstest Fehler 4** — gemischte Selektion | Zwei Absätze: erster zentriert, zweiter links; beide markieren (`ControlOrMeta+a` oder Maus-Ziehen über beide) | **Keiner** der vier Ausrichtungs-Buttons zeigt `aria-pressed="true"` | **ROT** (aktuell zeigt „Zentriert" fälschlich `true`, da nur der Selektionsanfang geprüft wird) |

#### 3.1.4 Formatvorlagen-Wechsel (Kernverdacht — Anforderung §3.5, Testfall 9–12)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z9 | Zentrierung einer Überschrift (Ebene 1, 3, 6 als Stichprobe) | Absatzformat-Dropdown auf „Überschrift 1"/„3"/„6", Text zentrieren | Identisch zu einem normalen Absatz zentriert | Grün erwartet |
| Z10 | **Kernverdacht 6.1** — Absatz zentrieren → Dropdown „Überschrift 1" | Absatz zentrieren, dann `page.getByLabel('Absatzformat').selectOption('1')` | `text-align: center` bleibt auf dem resultierenden `<h1>` erhalten | **ROT** (aktuell wird auf `left` zurückgesetzt) |
| Z11 | Umgekehrt: zentrierte Überschrift → Dropdown „Standard" | Überschrift zentrieren, dann `selectOption('normal')` | Zentrierung bleibt auf dem resultierenden `<p>` erhalten | **ROT** |
| Z12 | Zwischen zwei Überschriftsebenen (1 → 3) | Überschrift 1 zentrieren, dann `selectOption('3')` | Zentrierung bleibt erhalten | **ROT** |

#### 3.1.5 Tabellenzellen und Listen (Anforderung §3.6, Testfall 13–16)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z13 | Zentrierung in einer Tabellenzelle | „⊞ Tabelle"-Button (2×2), erste Zelle anklicken, Text tippen, zentrieren | Nur diese Zelle zeigt `text-align: center`; die drei übrigen Zellen bleiben unverändert (`page.locator('.ProseMirror td')`, je einzeln prüfen) | Grün erwartet |
| Z14 | Zentrierung in einer über `colspan`/`rowspan` verbundenen Zelle | **Kein UI-Weg vorhanden** (siehe Abschnitt 0/8) — Vorgehen: eine handgebaute DOCX- oder ODT-Fixture mit bereits verbundener Zelle per `setInputFiles` importieren, danach den Zellinhalt im Editor zentrieren | Verbundene Zelle zentriert sich identisch zu einer normalen Zelle, keine Nebenwirkung auf angrenzende Zellen | Blockiert bis Fixture identifiziert/gebaut ist (siehe Abschnitt 8) |
| Z15 | Zentrierung eines Bullet-Listeneintrags | „• Liste"-Button, Text tippen, zentrieren | Text zentriert; Position des Aufzählungszeichens (`::marker`/`<li>`-Bounding-Box) bleibt unverändert (`page.evaluate` → `getBoundingClientRect()` von `li` vor/nach Vergleich) | Grün erwartet |
| Z16 | Zentrierung eines nummerierten Listeneintrags | „1. Liste"-Button, analog zu Z15 | Analog | Grün erwartet |

#### 3.1.6 Kombination mit Zeichenformatierung und Zwischenablage (Anforderung §3.8, Grenzfall 13, Testfall 17–19)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z17 | Zentrierung + Fett + Schriftfarbe im selben Textlauf | Text tippen, `ControlOrMeta+a`, Fett-, Farbe- und Zentriert-Button klicken | Alle drei Formatierungen gleichzeitig sichtbar (`toHaveCSS('text-align','center')`, `toHaveCSS('font-weight','700')`, `color`) | Grün erwartet |
| Z18 | **Regressionstest Fehler 9** — Paste mit Stil auf umschließendem Element | Echtes Einfügen von `<div style="text-align: center"><p>Von außen zentriert</p></div>` über einen echten `ClipboardEvent`/`DataTransfer`, per `page.evaluate` auf den fokussierten Editor ausgelöst (nicht `insertHTML`) | Resultierender Absatz im Editor hat `text-align: center` | **ROT** (aktuell `left`, `getAttrs` liest nur `dom.style.textAlign` des `<p>` selbst). Läuft **ausschließlich** hier — jsdom löst `getComputedStyle`-Vererbung nicht auf (Abschnitt 2.8) |
| Z19 | Leeren Absatz zentrieren, dann tippen | Neuer, leerer Absatz, zentrieren, `page.keyboard.type(...)` | Getippter Text erscheint zentriert | Grün erwartet |

#### 3.1.7 Undo/Redo und Selection-Sync-Regression (Anforderung §3.9, Testfall 20–22)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z20 | Undo direkt nach Zentrieren (Einzelabsatz) | Absatz zentrieren, `ControlOrMeta+z` | Ausrichtung zurück zum Vorzustand | Grün erwartet |
| Z21 | Redo danach | Direkt nach Z20: `ControlOrMeta+y` | Zentrierung kommt zurück | Grün erwartet |
| Z22 | Selection-Sync-Regression mit „Zentriert" als auslösende Aktion (analog `selection-regression.spec.ts`, aber mit Zentrieren statt Fett) | Mehrabsätziges Dokument, `ControlOrMeta+a`, „Zentriert" klicken, per Klick neu positionieren, `Enter`, weitertippen | Beide entstehenden Absätze bleiben erhalten **und** zentriert; `page.locator('.ProseMirror p')` hat die erwartete Anzahl | Abhängig von Z3-Fix — mit unbehobenem Fehler 1 bricht bereits der „Zentriert"-Klick auf mehr als einen Absatz mit einer Exception ab |

#### 3.1.8 Vollständige Rundreise über echten Upload/Download (Anforderung Abschnitt 5, Testfall 23–33, 35–36)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z23 | DOCX-Rundreise nach eigener Bearbeitung (Testfall 23) | Neues Dokument (DOCX-Karte), Text tippen, zentrieren, exportieren (Download abfangen), heruntergeladene Datei erneut über `input.setInputFiles` hochladen | `text-align: center` im reimportierten Editor weiterhin sichtbar | Grün erwartet |
| Z24 | ODT-Rundreise nach eigener Bearbeitung (Testfall 24) | Analog Z23 für ODT-Karte | Analog | Grün erwartet |
| Z25 | Cross-Format-Rundreise DOCX → ODT, echter Download/Re-Upload (Testfall 25) | DOCX mit zentriertem Absatz erstellen → als DOCX-Karte exportieren ist nicht cross-format; stattdessen: Datei über die DOCX-Karte hochladen/erstellen, exportieren, die heruntergeladene Datei über die **ODT-Karte** hochladen (prüft, ob die App das erlaubt; falls nicht, s. Abschnitt 8) | Nach Upload in die ODT-Karte bzw. äquivalentem Re-Import-Pfad: Zentrierung erhalten | Vorab an der UI zu verifizieren (siehe Abschnitt 8, offener Punkt aus `fett-qa.md` §8 übernommen) |
| Z26 | Cross-Format-Rundreise ODT → DOCX (Testfall 26) | Spiegelbildlich zu Z25 | Analog | Wie Z25 |
| Z27 | **Doppelte Cross-Format-Rundreise kombiniert** (Testfall 27) | DOCX mit zentriertem Absatz + Fett + Farbe + Überschrift-Ebene 2 → Export als „Schritt 1" → Re-Upload/Export „Schritt 2" (Kette wie Z25/Z26, zweimal hintereinander) → letzten Download prüfen | Zentrierung **und** alle kombinierten Formate bleiben nach zwei Konvertierungen erhalten (DOMParser-Prüfung auf dem letzten Download) | Ergänzt X3 (Unit) um echten Browser-Nachweis |
| Z28 | **Reale Fixture DOCX** (Testfall 28, 35) | `bug-paragraph-alignment.docx` per `setInputFiles` **und** einmal per echtem `filechooser` (siehe 3.4) hochladen → unverändert exportieren → JSZip + `DOMParser` (`new (await import('jsdom')).JSDOM('').window.DOMParser()`) auf `word/document.xml` anwenden | Absatz 1 **und** Absatz 2 haben nach Export je ein korrektes `<w:jc w:val="…"/>` am richtigen `<w:p>` (Absatz 1 **muss** jetzt `center` sein, obwohl die Quelldatei kein direktes `<w:jc>` an diesem Absatz hatte — das ist der Nachweis, dass die Stilauflösung gegriffen hat) | **ROT** vor Fix (Absatz 1 aktuell `left`) |
| Z29 | **Reale Fixture ODT** (Testfall 29, 36) | `feature_attributes_paragraph_MSO2013.odt` (korrigierter Kandidat, siehe Abschnitt 0) hochladen → unverändert exportieren → `content.xml` mit `DOMParser` prüfen | „Center"-Absatz weiterhin `fo:text-align="center"`; „Align Text Right"-Absatz jetzt `fo:text-align="right"` (nicht mehr roh `"end"` und nicht fälschlich `"left"`) | Teilweise **ROT** vor Fix (Right-Absatz) |
| Z30 | Stilbasierte Zentrierung sichtbar **im Editor** (nicht erst nach Export) (Testfall 30) | `bug-paragraph-alignment.docx` hochladen, Absatz 1 direkt im Editor prüfen | `toHaveCSS('text-align', 'center')` | **ROT** vor Fix (aktuell `left` im Editor sichtbar) |
| Z31 | `rtl.docx` hochladen (Testfall 31) | Upload, betroffenen Absatz (`jc="start"` + `w:bidi="1"`) im Editor lokalisieren | `toHaveCSS('text-align', 'right')` (physisch rechtsbündig, ohne Anspruch auf korrekte RTL-Zeilenrichtung, siehe Code-Plan Abschnitt 5.5) | **ROT** vor Fix (aktuell `left`) |
| Z32 | Zentrierte Absätze in Tabellenzelle, Rundreise DOCX (Testfall 32) | Tabelle einfügen, Zelle zentrieren, exportieren, reimportieren | Zentrierung der Zelle bleibt erhalten | Grün erwartet |
| Z33 | Zentrierte Absätze in Tabellenzelle, Rundreise ODT (Testfall 32) | Analog Z32 für ODT | Analog | Grün erwartet |
| Z34 | Zentrierte Listeneinträge, Rundreise DOCX (Testfall 33) | Liste einfügen, Eintrag zentrieren, exportieren, reimportieren | Zentrierung bleibt erhalten | Grün erwartet |
| Z35 | Zentrierte Listeneinträge, Rundreise ODT (Testfall 33) | Analog Z34 für ODT | Analog | Grün erwartet |

#### 3.1.9 Icon, Tooltip, `aria-label`, Tastenkürzel (Anforderung §3.10, Verdachtsmomente 6–9, Testfall 37–38)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z36 | Tooltip-Text (Verdachtsmoment 8) | `page.getByTitle('Ausrichtung: center')` vorhanden | Dokumentiert den aktuellen (englischen) Zustand; muss nach Umsetzung von Code-Plan §4.2 auf `page.getByTitle('Ausrichtung: Zentriert')` migriert werden | **ROT gegen Zielzustand** (aktuell korrekt gegen Ist-Zustand — siehe Migrationshinweis Abschnitt 1) |
| Z37 | `aria-label` vorhanden und konsistent zum Titel | `expect(page.getByTitle(...)).toHaveAttribute('aria-label', ...)` | Muss identisch zum Titeltext sein (Konsistenz zu `MarkButton`) | **ROT** (aktuell kein `aria-label` gesetzt) |
| Z38 | Reiner Tastatur-Fokus-Pfad auf den Zentriert-Button (analog Fehler 1 aus `fett-qa.md`, hier für `AlignButton`) | Wiederholt `Tab` bis der Button fokussiert ist (`toBeFocused()`), dann `Enter` bzw. separat `Space` | Zentrierung wird auf vorher per Maus/Tastatur gesetzte Selektion angewendet | **ROT** (Fehler 5 — kein `onClick`, `mousedown` wird bei Tastatur-Aktivierung nicht ausgelöst) |
| Z39 | Icon-Rendering-Dokumentation (Testfall 37) | Screenshot des Zentriert-Buttons (`page.getByTitle(...).screenshot()`) vor/nach SVG-Entscheidung | Dokumentierend, kein Pass/Fail-Kriterium; hält fest, ob `↔` von `⇤`/`⇥`/`≡` unterscheidbar bleibt | Dokumentierend |
| Z40 | Tastenkürzel-Test `Strg+E` (Testfall 38) | Text markieren, `page.keyboard.press('ControlOrMeta+e')` | Text wird zentriert | **ROT** (aktuell kein Kürzel gebunden — muss vor Umsetzung bewusst rot geschrieben werden) |

#### 3.1.10 Performance und Robustheit (Anforderung §4.11 (Grenzfall 11)/12, Testfall 39–40)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z41 | Sehr lange Selektion (viele Absätze) zentrieren | Dokument mit ~150 Absätzen (schnell per `page.evaluate` auf das ProseMirror-Dokument oder per Tastatur-Schleife aufgebaut), `ControlOrMeta+a`, „Zentriert" klicken, Zeit bis UI wieder reagiert messen | Kein spürbares Einfrieren (Zeitbudget dokumentieren, z. B. < 2 s bis `aria-pressed` aktualisiert); kein `pageerror` | Blockiert durch Z3 (vor dem Fix würde die Schleife nach dem zweiten Absatz mit `RangeError` abbrechen) |
| Z42 | Schnelles Mehrfachklicken auf bereits aktiven Zentriert-Button | 5× `click()` in schneller Folge ohne Wartezeit auf einen bereits zentrierten Absatz | Kein inkonsistenter Zwischenzustand; **ein** `ControlOrMeta+z` stellt weiterhin den ursprünglichen Vorzustand her (keine aufgeblähte Undo-Historie) | Grün erwartet, sofern No-Op-Kurzschluss (C4) implementiert ist |

### 3.2 Icon-Rendering-Bewertung (Abnahmekriterium — Verdachtsmoment 9)

Siehe Z39. Kein automatisiertes Pass/Fail-Kriterium (Font-Rendering ist
plattformabhängig), aber verpflichtender dokumentierender Schritt vor Abschluss der
Verifikation, analog `fett-qa.md` Abschnitt 3.3.

### 3.3 Bestehende Tests, die unverändert weiterlaufen müssen

- `tests/e2e/selection-regression.spec.ts` (alle drei Tests) — **Pflichtbestandteil**,
  bleibt unverändert erhalten. Nach jeder Änderung an `Toolbar.tsx`/`commands.ts`
  (Fehler 1/2/4/5-Fixes) erneut ausführen, um sicherzustellen, dass der
  Fett-bezogene Regressionsschutz durch die Ausrichtungs-Änderungen nicht
  beschädigt wurde.
- `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts` — bleiben bestehen; enthalten
  keine Ausrichtungs-Assertions (per Volltextsuche in Anforderungsabschnitt 1
  bereits bestätigt), daher keine Überschneidung mit `alignment.spec.ts`.
- `tests/e2e/lifecycle.spec.ts` — unverändert, keine Ausrichtungs-Berührung
  erwartet, muss aber Teil der Dauer-Suite bleiben und grün laufen.

### 3.4 Datei-Upload: echter `filechooser` zusätzlich zu `setInputFiles`

Wie in `fett-qa.md` Abschnitt 3.4 begründet: `setInputFiles` direkt auf den
versteckten `<input type="file">` testet Reader/Formular-Wiring, nicht die
tatsächliche Bedienung durch eine Nutzerin. Mindestens **ein** Testfall dieses
Plans (Z28, reale DOCX-Fixture) muss den echten sichtbaren Klickpfad nutzen:

```ts
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  docxCard(page).getByRole('button', { name: 'Datei hochladen' }).click(),
])
await fileChooser.setFiles({ name: 'bug-paragraph-alignment.docx', mimeType: '...', buffer })
```

Die schnellere `setInputFiles`-Variante bleibt für alle übrigen Testfälle als
Standard bestehen — kein Widerspruch, nur Ergänzung.

### 3.5 Unabhängige Prüfung der heruntergeladenen Datei (nicht nur `.toContain`)

Für alle Export-Assertionen in diesem Plan (Z23–Z35), die eine strukturelle
Prüfung erfordern (insbesondere Z28/Z29, wo **welcher** Absatz welchen Wert trägt,
entscheidend ist), wird empfohlen:

```ts
import { JSDOM } from 'jsdom' // bereits Devdependency
const parser = new JSDOM('').window.DOMParser()
const xmlDoc = parser.parseFromString(documentXml, 'application/xml')
const paragraphs = [...xmlDoc.getElementsByTagNameNS(W_NS, 'p')]
const target = paragraphs.find((p) => p.textContent?.includes('does not have explicit alignment'))
const jc = target?.getElementsByTagNameNS(W_NS, 'pPr')[0]?.getElementsByTagNameNS(W_NS, 'jc')[0]
expect(jc?.getAttributeNS(W_NS, 'val')).toBe('center')
```

Reine String-Suche (`expect(documentXml).toContain('<w:jc w:val="center"/>')`, wie
in den bestehenden `docx.spec.ts`/`odt.spec.ts`-Tests für Fett verwendet) genügt
**nicht**, wenn — wie bei Z28 — mehrere Absätze mit unterschiedlichem
Ausrichtungswert im selben Dokument geprüft werden müssen.

### 3.6 Cross-Browser-Matrix

| Testgruppe | Desktop Chrome | Mobile (Pixel 7) | Tablet (iPad Mini) | Anmerkung |
|---|---|---|---|---|
| Klick-basierte Tests (Z1, Z2, Z6–Z13, Z15–Z17, Z19, Z23–Z37, Z39, Z42) | Pflicht | Pflicht | Pflicht | `.click()` funktioniert projektunabhängig |
| Tastatur-only-Tests (Z4, Z5, Z20–Z21, Z38, Z40) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | `page.keyboard.press` funktioniert unabhängig vom simulierten Gerät (CDP-Events), reales Nutzer:innen-Verhalten auf Touch-Geräten ohne Hardware-Tastatur ist ein zu dokumentierender Sonderfall |
| Mehrabsatz-/Performance-Tests (Z3, Z22, Z41) | Pflicht | Pflicht | Pflicht | Kein gerätespezifisches Verhalten erwartet, aber auf Mobile/Tablet ggf. langsamer — Zeitbudget pro Projekt gesondert kalibrieren |

---

## 4. Traceability-Matrix (Anforderung Abschnitt 7, Testfälle 1–40 → Testfall in diesem Plan)

| Anforderung Testfall # | Testfall(e) in diesem Plan |
|---|---|
| 1 | Z1 |
| 2 | Z2 |
| 3 | Z3, C2 |
| 4 | Z4, C3 |
| 5 | Z5, C4 |
| 6 | Z6 |
| 7 | Z7 |
| 8 | Z8, C5 |
| 9 | Z9 |
| 10 | Z10, C6 |
| 11 | Z11, C7, D9/O5 |
| 12 | Z12, C8 |
| 13 | Z13 |
| 14 | Z14 |
| 15 | Z15, D7 |
| 16 | Z16, D7 |
| 17 | Z17 |
| 18 | Z18 |
| 19 | Z19 |
| 20 | Z20 |
| 21 | Z21 |
| 22 | Z22 |
| 23 | Z23 |
| 24 | Z24 |
| 25 | Z25, X1 |
| 26 | Z26, X2 |
| 27 | Z27, X3 |
| 28 | Z28, AF-D1 |
| 29 | Z29, AF-O1/AF-O1b/AF-O1c |
| 30 | Z30, AF-D1 |
| 31 | Z31, AF-D2 |
| 32 | Z32, Z33, D6, O3 |
| 33 | Z34, Z35, D7, O3 |
| 34 | Z1 (dediziert erfüllt: erster neu angelegter E2E-Test über echte Toolbar-Bedienung) |
| 35 | Z28 |
| 36 | Z29 |
| 37 | Z39 |
| 38 | Z40 |
| 39 | Z41, C10 |
| 40 | Z42, C4 |

### Verdachtsmomente (Anforderung Abschnitt 6) → Einstufung in diesem Plan

| # | Verdachtsmoment | Einstufung | Testfall(e) |
|---|---|---|---|
| 1 | Formatvorlagen-Wechsel setzt Zentrierung zurück | Bestätigt (schwerwiegendster Einzelbefund neben Fehler 1) | Z10–Z12, C6–C8, D9, O5 |
| 2 | Keine stilbasierte/geerbte Ausrichtung beim Import | Bestätigt, real reproduzierbar mit `bug-paragraph-alignment.docx` | Z30, AF-D1, D1 |
| 3 | Unvollständige `jc`-Wertetabelle | Bestätigt, real reproduzierbar mit `rtl.docx` | Z31, AF-D2, D4/D5 |
| 4 | Mehrfach-Transaktion bei Mehrabsatz-Selektion | Bestätigt **und verschärft**: kein Undo-Granularitätsproblem, sondern harter `RangeError`-Crash | Z3, Z4, Z22, Z41, C2, C3 |
| 5 | `isAlignActive` nur aus `$from` | Bestätigt | Z8, C5 |
| 6 | Kein Tastenkürzel | Bestätigt; Entscheidung laut Code-Plan §5.1: `Mod-e` wird ergänzt | Z40 |
| 7 | Fehlendes `aria-label` | Bestätigt | Z37 |
| 8 | Title-Attribut zeigt internen Bezeichner | Bestätigt | Z36 |
| 9 | Icon-Rendering (`↔` mehrdeutig) | Bestätigt (dokumentierend) | Z39 |
| 10 | Kein E2E-Test vorhanden | Bestätigt; wird durch `alignment.spec.ts` behoben | Gesamter Abschnitt 3 |
| 11 | Unit-Tests kennen keine Tabellen/Listen/Formatvorlagen-Kombination | Bestätigt; wird durch D6/D7/D9/O3/O5 behoben | Abschnitt 2.3/2.4 |

Zusätzlich, nicht in der Verdachtsmomentenliste der Anforderung enumeriert, aber im
Code-Plan (`ausrichtung-zentriert-code.md` Abschnitt 2) mit eigener Nummerierung
geführt: **Fehler 9** (Copy/Paste verliert Ausrichtung bei Stil auf umschließendem
Element) → Testfall Z18, bestätigt, siehe Abschnitt 2.8 für die Unit-Test-Grenze.

---

## 5. Erwarteter Ist-Status je neuem Testfall (vor Umsetzung von `ausrichtung-zentriert-code.md`)

| Status | Testfälle | Grund |
|---|---|---|
| **Erwartet ROT** (dokumentiert bestätigten Bug) | C2, C3 (blockiert), C4 (blockiert), C5, C6, C7, C8, C10 (blockiert), D1, D2 (blockiert), D4, D5, D9, O1, O2, O5, O6, AF-D1, AF-D2, AF-O1b, Z3, Z4 (blockiert), Z5 (blockiert), Z8, Z10, Z11, Z12, Z18, Z22 (blockiert), Z28, Z29 (teilweise), Z30, Z31, Z36 (gegen Zielzustand), Z37, Z38, Z40, Z41 (blockiert) | Fehler 1–5 und Verdachtsmomente 1–3, 5–9 aus Abschnitt 0/`ausrichtung-zentriert-code.md` |
| **Erwartet GRÜN** (sollte mit aktuellem Code bereits bestehen) | C1, C9, D3, D6, D7, D8, D10, O3, O4, X1, X2, X3, AF-D1b, AF-D3, AF-D4, AF-O1, AF-O1c, AF-O2, Z1, Z2, Z6, Z7, Z9, Z13, Z15–Z17, Z19–Z21, Z23–Z27, Z32–Z35, Z42 | Basiert auf unverändertem, bereits funktionierendem Reader/Writer/Radio-Button-Grundverhalten (nicht von Fehler 1/2/4/5/9 betroffen) |
| **Blockiert/abhängig von vorherigem Fix** | C3, C4, C10, D2, Z4, Z5, Z14 (Fixture fehlt), Z22, Z41 | Kann erst sinnvoll geprüft werden, nachdem der jeweils vorausgesetzte Fehler behoben ist |
| **Dokumentierend, kein Pass/Fail** | AF-D3, AF-D4, AF-O2 (Fixture-Eignung), Z39 (Icon) | Reine Feststellung, kein Bug |

Sobald `ausrichtung-zentriert-code.md` Abschnitt 4 (Fixes) umgesetzt ist, müssen
**alle** als ROT markierten Fälle von ROT auf GRÜN wechseln (inklusive der zuvor
blockierten Fälle, die dann erstmals ausführbar werden) — das ist der konkrete,
maschinell prüfbare Nachweis, dass die Fixes wirken, nicht nur Code-Review.

---

## 6. Abgleich mit Abnahmekriterien (`ausrichtung-zentriert-req.md` Abschnitt 8)

| DoD-Punkt | Abdeckung in diesem Testplan |
|---|---|
| 1. Alle Testfälle aus Anforderung §7 real ausgeführt und dokumentiert | Abschnitt 3 (Z1–Z42) + Abschnitt 2 (C/D/O/AF/X) + Traceability-Matrix Abschnitt 4 |
| 2. Jedes Verdachtsmoment aus §6 explizit eingestuft | Abschnitt 4, Tabelle „Verdachtsmomente" (alle 11 + Fehler 9 aus dem Code-Plan) |
| 3. Mindestens ein E2E-Test dauerhaft verankert, inkl. Formatvorlagen-Wechsel-Regressionstest | `alignment.spec.ts` (Abschnitt 3.1), insbesondere Z1 (Grundtest) und Z10–Z12 (Formatvorlagen-Wechsel) |
| 4. Rundreise DOCX+ODT, Cross-Format, Tabellenzellen, Listen, je eine reale externe Testdatei | Z23–Z35, D6/D7/O3 (Tabellen/Listen), X1–X3 (Cross-Format), Z28/Z29 (reale Fixtures, korrigierter Kandidat gemäß Abschnitt 0) |
| 5. Tastenkürzel-Entscheidung getroffen/umgesetzt oder begründet zurückgestellt | Z40 (verifiziert `Mod-e`, sobald Code-Plan §4.3 umgesetzt ist) |
| 6. Stilbasierte Zentrierung bewusst entschieden/dokumentiert | Z25/Z30, AF-D1, D1 (verifizieren die in Code-Plan §5.4 getroffene Entscheidung „wird erkannt") |

---

## 7. Ausführungsreihenfolge (Vorschlag)

1. **`commands.test.ts`** (C1–C10) zuerst schreiben und bewusst rot laufen lassen
   (C2, C5, C6–C8) — dient als schneller, browserunabhängiger Ausgangsnachweis,
   dass die Fehler 1/2/4 real und reproduzierbar sind, bevor irgendetwas gefixt
   wird.
2. `alignment.spec.ts` Z1–Z8 (Grundbedienung, kritischer Mehrabsatz-Test Z3/Z4/Z5,
   Zustandsanzeige) — deckt Fehler 1/4/5 sichtbar im Browser auf.
3. `alignment.spec.ts` Z9–Z12 (Formatvorlagen-Wechsel) — deckt Fehler 2/Kernverdacht
   6.1 auf.
4. `roundtrip.test.ts`-Erweiterungen (D1–D10, O1–O6) + `alignment-fixtures.test.ts`
   (AF-D1–AF-D4, AF-O1–AF-O2) — deckt Fehler 3/6/7 sowie die Fixture-Korrektur aus
   Abschnitt 0 ab.
5. `alignment.spec.ts` Z13–Z35 (Tabellen, Listen, Kombination, Rundreisen, reale
   Fixtures) + `cross-format-roundtrip.test.ts` (X1–X3).
6. `alignment.spec.ts` Z36–Z42 (Tooltip/`aria-label`/Icon/Tastenkürzel/Performance)
   — abschließende Politur- und Robustheitsprüfungen.
7. **Nach Umsetzung von `ausrichtung-zentriert-code.md`:** alle als ROT markierten
   Fälle erneut ausführen, Statuswechsel auf GRÜN dokumentieren;
   `selection-regression.spec.ts` zusätzlich erneut laufen lassen (Abschnitt 3.3),
   um sicherzustellen, dass die Fett-Regressionsabsicherung durch die
   Ausrichtungs-Fixes nicht beschädigt wurde.
8. Titeltext-Migration durchführen (siehe Abschnitt 1, Selektor-Vorbehalt): alle
   `getByTitle('Ausrichtung: center'/'left'/'right'/'justify')`-Aufrufe auf die
   deutschen Titel migrieren, sobald Code-Plan §4.2 umgesetzt ist.
9. Traceability-Matrix (Abschnitt 4) und DoD-Abgleich (Abschnitt 6) final
   gegenprüfen, bevor der Backlog-Status auf „verifiziert" geändert wird.

---

## 8. Offene Punkte für QA

- **Z14 (verbundene Tabellenzelle) ist aktuell nicht ausführbar:** Es existiert
  keine Toolbar-Funktion zum Verbinden von Zellen (`Toolbar.tsx` enthält keinen
  „Zellen verbinden"-Button, per Volltextsuche bestätigt in Abschnitt 0). Vor
  Testimplementierung muss entweder (a) eine handgebaute DOCX-/ODT-Fixture mit
  bereits verbundener Zelle gebaut werden (analog `buildSampleDocx()`-Muster aus
  `docx.spec.ts`, mit `<w:gridSpan>`/`<w:vMerge>` bzw. ODT-Äquivalent), oder (b)
  geklärt werden, ob dieser Testfall bis zur Umsetzung von
  `zellen-verbinden-req.md` als „nicht end-to-end über die Oberfläche testbar,
  nur auf Reader/Writer-Ebene" vermerkt wird (analog zu Grenzfall 9,
  Kopf-/Fußzeile).
- **Z25/Z26 (Cross-Format-Export direkt aus einer Karte heraus)** hängt davon ab,
  ob die UI überhaupt einen Formatwechsel beim Export aus derselben Karte erlaubt
  oder ob dafür zwingend der Umweg über Re-Import in die jeweils andere Karte
  nötig ist — vor Testimplementierung an der laufenden App verifizieren (identische
  Unklarheit wie in `fett-qa.md` Abschnitt 8 für Fett dokumentiert).
- **Z18/Z29 (Clipboard-Paste- bzw. Fixture-Interaktion)** können je nach
  Playwright-/Browser-Version und CI-Sandbox-Einstellungen für
  Zwischenablage-Berechtigungen instabil sein; Fallback auf ein synthetisches,
  aber echtes `ClipboardEvent`-Konstrukt im Seitenkontext vorsehen, falls direkte
  OS-Zwischenablage-Interaktion in CI blockiert wird.
- **Z39 (Icon-Screenshot)** und **Z36 (Tooltip-Zielzustand)** hängen von den noch
  offenen Design-Entscheidungen aus `ausrichtung-zentriert-code.md` Abschnitt 5 ab;
  Endergebnis ist nach Entscheidung sowohl hier als auch in
  `ausrichtung-zentriert-req.md` nachzutragen.
- **Kopf-/Fußzeile (Grenzfall 9 der Anforderung):** bestätigt nicht end-to-end über
  die Oberfläche testbar (kein UI-Zugriff auf `header`/`footer` gefunden, siehe
  Abschnitt 0) — muss ausschließlich auf Datenmodell-/Reader-/Writer-Ebene (direkt
  konstruierte `header`/`footer`-Inhalte, außerhalb dieses Plans, siehe
  `kopfzeile-bearbeiten-req.md`/`fusszeile-bearbeiten-req.md`) geprüft werden,
  sobald diese Features existieren.
