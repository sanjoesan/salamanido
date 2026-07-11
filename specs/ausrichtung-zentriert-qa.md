# QA-Testplan: Feature „Ausrichtung zentriert"

Rolle: QA-Antwort auf `specs/ausrichtung-zentriert-req.md` (Anforderung) und
`specs/ausrichtung-zentriert-code.md` (Entwicklerplan). Dieses Dokument nimmt
**keinen** der beiden Vorgängertexte als bewiesen an — `ausrichtung-zentriert-code.md`
ist laut eigenem Titel ein *Plan*, keine verifizierte Umsetzung („Kein Punkt hier ist
bereits umgesetzt"). Jede Behauptung aus beiden Dokumenten wird hier auf einen
konkreten, ausführbaren Testfall abgebildet. Ergebnis ist ein Testplan, kein
Testbericht — die hier aufgeführten Tests sind zum Zeitpunkt dieses Dokuments
größtenteils **noch nicht geschrieben** (siehe Abschnitt 5, Spalte „Erwarteter
Status").

Stil/Gliederung orientiert an `fett-qa.md` (Präzedenzfall für dieses Repo).

> **Revisionshinweis dieser Fassung (QA-Selbstkorrektur).** Eine frühere Fassung
> dieses Testplans war gegen einen **älteren** Quell- und Anforderungsstand
> geschrieben und enthielt durchgehend **veraltete Referenzen**, die exakt dem in
> `ausrichtung-zentriert-code.md` selbst dokumentierten „Revisionshinweis"
> entsprachen: (a) falsche Zeilennummern (z. B. `AlignButton` bei `Toolbar.tsx:64-84`
> statt tatsächlich `91-111`, `MarkButton`-`aria-label` bei `:47` statt `:74`,
> `title` bei `:69` statt `:96`, Keymap bei `WordEditor.tsx:71-79` statt tatsächlich
> `85-107`, `JC_TO_ALIGN` bei `docx/reader.ts:13` statt `14`, ODT-Align bei `reader.ts:62-65`
> statt `63-66`); (b) **falsche Abschnittsverweise** auf die Anforderung
> (Testfälle als „Abschnitt 7" statt aktuell **Abschnitt 8**, Verdachtsmomente als
> „Abschnitt 6" statt **Abschnitt 7**, Abnahmekriterien als „Abschnitt 8" statt
> **Abschnitt 10**); (c) eine **überzählige Testfallnummerierung** (Verweise auf
> Anforderungs-Testfälle bis 40, obwohl die aktuelle Anforderung nur **35** Testfälle
> in Abschnitt 8 führt) mit entsprechend verrutschter Traceability; (d)
> durcheinandergeratene **Grenzfallnummern** (wiederholtes Klicken ist Grenzfall
> **9**, Copy/Paste **10**, Selection-Sync **11**, Kopf-/Fußzeile **12**, RTL **13**,
> lange Selektion **14**, ungültiger `align`-Wert **15**); (e) die falsche Angabe,
> `src/formats/shared/editor/__tests__/commands.test.ts` sei **neu** anzulegen,
> obwohl die Datei **bereits existiert** (deckt aktuell nur `canCut`/`cutSelection`
> ab) und nur **ergänzt** wird. Alle Zeilen-, Abschnitts- und Testfallangaben unten
> sind gegen den **jetzigen** Stand von Quellcode, Anforderung und Code-Plan neu
> verifiziert. Die zusätzlich fehlende Abdeckung von Anforderungs-Testfall 35
> (Import eines ungültigen `align`-Werts) ist als **D11/O7** ergänzt.
>
> **Nachtrag (zweite QA-Durchsicht, direkt gegen die Quelldateien).** Bei einer
> erneuten, dateigenauen Gegenprüfung fielen in dieser Fassung selbst noch **falsche
> `WordEditor.tsx`-Zeilennummern** auf — dieselbe Fehlerklasse, die der Revisionshinweis
> oben eigentlich beheben wollte, hatte die `WordEditor.tsx`-Referenzen nur unvollständig
> korrigiert (auf `77-99` statt korrekt `85-107`). Jetzt gegen den tatsächlichen
> Quellstand richtiggestellt (deckungsgleich mit `ausrichtung-zentriert-code.md`): das
> **Keymap**-Objekt steht bei Z. **85-107** (Mark-Bindings `Mod-b/i/u` Z. **98-100**,
> `Shift-Enter` Z. 97, `Shift-Delete` Z. 106; **kein** `Mod-e`), `dispatchTransaction`
> bei Z. **125-132** (nicht `117-124`), und `reconcileSelectionOnClick` ist Z. **43-50**
> definiert und über die `mousedown`/`mouseup`-Handler Z. **143-155** (Aufruf Z. 152)
> verdrahtet (nicht „`117-147`"). Alle übrigen in Abschnitt 0 geprüften Zeilenangaben
> (`commands.ts:13-27/21`, `:29-38`, `:40-55/43`; `Toolbar.tsx` `MarkButton` 55-89 /
> `aria-label` 74, `AlignButton` 91-111 / `title` 96 / `onMouseDown` 98-101 / center-Aufruf
> 235; `docx/reader.ts:14`; `odt/reader.ts:63-66/65-66`) sowie die Fünf-Projekte-Struktur
> aus `playwright.config.ts` (drei Basisprojekte + zwei clipboard-`testMatch`-Projekte,
> Tablet ohne Clipboard-Permission) wurden dabei erneut direkt am Code **bestätigt**.

---

## 0. Stichprobenprüfung des Ist-Codes (QA-Gegenkontrolle von `ausrichtung-zentriert-code.md`)

Bevor der Plan aufgestellt wird, wurden die zentralen Behauptungen aus
`ausrichtung-zentriert-code.md` Abschnitt 2 (Fehler 1–9) direkt im aktuellen Code
nachvollzogen (nicht nur aus dem Dokument übernommen). Alle Zeilennummern hier sind
gegen den tatsächlichen Quellstand geprüft.

| Behauptung (Code-Plan §2) | QA-Gegenkontrolle (Fundstelle) | Ergebnis |
|---|---|---|
| **Fehler 1** (§2.1, kritisch): `setAlign` erzeugt bei Mehrabsatz-Selektion pro Treffer eine neue, vom ursprünglichen `state` abgeleitete Transaktion (`state.tr`-Getter in der `nodesBetween`-Schleife) | `src/formats/shared/editor/commands.ts:13-27`, Kernzeile **21** | **Bestätigt (Code-Struktur exakt).** `state.doc.nodesBetween(from, to, (node, pos) => { …; dispatch(state.tr.setNodeAttribute(pos, 'align', align)) })` — `state` ist der äußere, zum Aufrufzeitpunkt fixierte Parameter; jeder Schleifendurchlauf holt `state.tr` erneut vom selben, unveränderten `state`. `WordEditor.tsx:125-132` (`dispatchTransaction`) wendet jede Transaktion auf das jeweils aktuelle `view.state` an. Die tatsächliche Laufzeit-Exception (`RangeError: Applying a mismatched transaction`) hat QA **noch nicht** durch Ausführung reproduziert — das ist der erste Pflichttest dieses Plans (C2, Z3). |
| **Fehler 2** (§2.2, hoch): `setHeading` setzt `align` bei jedem Formatvorlagenwechsel hart auf `'left'` | `commands.ts:40-55`, Zeile **43** | **Bestätigt exakt.** `const attrs = level === null ? undefined : { level, align: 'left' }`. Der `undefined`-Zweig (Wechsel zurück zu „Standard") fällt auf den Schema-Default `'left'` zurück — ebenfalls betroffen. Wirkt nur bei Einzelblock-Selektion (`if (!$from.sameParent($to)) return false`, Zeile 45). |
| **Fehler 3** (§2.3, hoch): ODT-Reader reicht `fo:text-align` unnormalisiert durch (z. B. `"end"`/`"start"` landen roh im `align`-Attribut) | `src/formats/odt/reader.ts:63-66`, Zeilen **65-66** | **Bestätigt exakt.** `const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align'); if (align) paragraphAligns.set(name, align)` — keine Wertetabelle/Normalisierung wie beim DOCX-Reader. |
| **Fehler 4** (§2.4, mittel-hoch): `isAlignActive` prüft nur den alignierbaren Vorfahren von `$from`, nicht die volle Selektion | `commands.ts:29-38` | **Bestätigt exakt.** Schleife nur über `$from`-Vorfahren; bei gemischter Mehrabsatz-Selektion, die mit einem zentrierten Absatz beginnt, liefert die Funktion `true`, obwohl weitere Absätze anders ausgerichtet sind. |
| **Fehler 5** (§2.5, gebündelt): `AlignButton` verdrahtet nur `onMouseDown`, **kein** `onClick` (Tastatur-Aktivierung wirkungslos); **kein** `aria-label`; `title` zeigt internen Bezeichner; Glyphe `↔` mehrdeutig | `src/formats/shared/editor/Toolbar.tsx:91-111`; center-Instanz Zeile **235** | **Bestätigt (alle vier).** `AlignButton` 91-111: `title={`Ausrichtung: ${align}`}` (Z. **96**), **kein** `aria-label`, nur `onMouseDown` (Z. 98-101), kein `onClick`/`onKeyDown` → ein natives `<button>` feuert bei Tab+Enter/Space kein `mousedown`. Vergleich: `MarkButton` (55-89) setzt `aria-label={title}` (Z. **74**). Center-Aufruf `<AlignButton view={view} align="center" label="↔" />` Z. **235** (links `⇤` 234, rechts `⇥` 236, Blocksatz `≡` 237). |
| **Fehler 6** (§2.6, hoch): keine stil-/vererbungsbasierte Ausrichtungsauflösung beim Import (DOCX `w:pStyle`→`styles.xml`; ODT `office:styles`/`style:parent-style-name`) | `docx/reader.ts` (`JC_TO_ALIGN` Z. 14, `align` allein aus direktem `w:jc`); `odt/reader.ts` (nur `office:automatic-styles`) | **Bestätigt.** DOCX liest `w:pStyle` nur für Heading-Level, nicht für `w:jc`; ODT wertet weder `office:styles` noch `parent-style-name` aus. Real reproduzierbar mit `bug-paragraph-alignment.docx` (Absatz 1 stilbasiert zentriert). |
| **Fehler 7** (§2.7, mittel): unvollständige `jc`-/`text-align`-Wertetabelle | `docx/reader.ts:14` `JC_TO_ALIGN = { left, center, right, both }`, Fallback `?? 'left'` | **Bestätigt exakt.** `start`/`end`/`distribute`/`thaiDistribute`/`*Kashida`/`numTab` fallen still auf `'left'`. Für `center` unkritisch; relevant für RTL (`rtl.docx`: `w:bidi` + `jc="start"`) und Nachbarabsätze. |
| **Fehler 8** (§2.8, Testplanungs-Korrektur): drei vorgeschlagene Fixtures ungeeignet (`table-alignment.docx`, `TestTableCellAlign.docx`, ggf. `CharacterParagraphFormat.odt`) | JSZip-Rohbyte-Inspektion (im Code-Plan) | **Übernommen als zu bestätigende Annahme.** Wird in AF-D3/AF-D4/AF-O2 als **dokumentierender** Test verankert, der die Eignung selbst mitprüft. |
| **Fehler 9** (§2.9, optional/riskant): Copy/Paste verliert Ausrichtung, wenn der Stil auf einem Vorfahren-Element sitzt | `schema.ts` `getAttrs` liest nur `dom.style.textAlign` des `<p>`/`<hN>` selbst | **Bestätigt.** `<div style="text-align:center"><p>…</p></div>` → `align:'left'`. Anforderung verlangt hier laut **Grenzfall 10** nur Nachweis+Dokumentation des Fallbacks, keine zwingende Behebung. Ausschließlich per E2E prüfbar (Z18), nicht per Unit (jsdom löst `getComputedStyle`-Vererbung nicht auf, siehe Abschnitt 2.8). |
| Kein Tastenkürzel für irgendeine Ausrichtung (Verdachtsmoment §7.10) | `WordEditor.tsx:85-107` (Mark-Bindings `Mod-b/i/u` Z. 98-100) | **Bestätigt.** Keymap enthält `Mod-z/y/Shift-z`, `Enter`, `Shift-Enter`, `Mod-b/i/u`, `Shift-Delete` — **kein** `Mod-e`/`Mod-l`/`Mod-r`/`Mod-j`. |
| Kein Enum/keine Validierung des `align`-Attributs (Verdachtsmoment §7.6) | `schema.ts` `alignAttr = { align: { default: 'left', validate: 'string' } }` | **Bestätigt.** `validate: 'string'` = jeder String zulässig. Export-Fallback (`?? 'left'`) vorhanden, aber ungetestet → neu abgedeckt durch D11/O7 (Testfall 35). |
| Kein Toolbar-Button zum Verbinden von Tabellenzellen (`colspan`/`rowspan` nur importierbar) | `Toolbar.tsx` per Volltextsuche nach `mergeCells`/„verbinden" | **Bestätigt: kein Treffer.** Relevant für Z14 (siehe Abschnitt 8, offener Punkt). |
| Kein Kopf-/Fußzeile-Bearbeitungs-UI | `Toolbar.tsx` durchsucht nach `header`/`footer`/„Kopfzeile"/„Fußzeile" | **Bestätigt: kein Treffer.** Bestätigt **Grenzfall 12** der Anforderung („nicht end-to-end über die Oberfläche testbar"). |
| Fixture-Existenz: `bug-paragraph-alignment.docx`, `table-alignment.docx`, `TestTableCellAlign.docx`, `rtl.docx`, `CharacterParagraphFormat.odt`, `feature_attributes_paragraph_MSO2013.odt` | Per `Glob` in `tests/fixtures/external/{docx,odt}/` | **Alle vorhanden.** |
| `commands.test.ts` existiert bereits (nur `canCut`/`cutSelection`) | `src/formats/shared/editor/__tests__/commands.test.ts` gelesen | **Bestätigt: Datei existiert.** Die Ausrichtungs-Tests C1–C10 werden **ergänzt**, nicht in einer neuen Datei angelegt. |

**Konsequenz für diesen Testplan:** Alle neun nummerierten Fehler (§2.1–2.9) und alle
elf Verdachtsmomente (Anforderung Abschnitt 7) werden unten als **aktuell rot
erwartete** Testfälle geführt (Regressionstests, die den Bug dokumentieren, bis
`ausrichtung-zentriert-code.md` Abschnitt 4 umgesetzt ist), nicht als hypothetische
Grenzfälle. Fehler 1 (RangeError bei Mehrabsatz-Zentrierung) ist der schwerwiegendste
Einzelbefund und blockiert praktisch jeden Mehrabsatz-Testfall in diesem Plan
(C2–C4, C10, Z3–Z5, Z22, Z41) — er wird deshalb sowohl auf Unit- als auch auf
E2E-Ebene als erster Testfall geführt.

---

## 1. Testumgebung

- Unit-Tests: `npm test` (Vitest, `jsdom`-Environment).
- E2E-Tests: `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `baseURL: 'http://localhost:4173/salamanido/'`, `webServer` baut (`npm run build`)
    und startet `vite preview` automatisch (`VITE_ENABLE_TEST_HOOKS=true` nur für
    diesen Playwright-Build).
  - **Fünf** Projekte, aber nur drei bilden die Basismatrix für `alignment.spec.ts`:
    **Desktop Chrome** (mit `clipboard-read/-write`), **Mobile** (`Pixel 7`, mit
    Clipboard-Permissions), **Tablet** (`iPad Mini`). Die beiden weiteren Projekte
    **Desktop Safari (Clipboard)** und **Desktop Firefox (Clipboard)** sind per
    `testMatch: /clipboard.*\.spec\.ts/` **ausschließlich** auf die Clipboard-Specs
    beschränkt und greifen für `alignment.spec.ts` **nicht** (der Dateiname passt
    nicht auf `clipboard.*`). Jeder neue Testfall muss folglich auf den drei
    Basisprojekten grün sein, sofern er nicht explizit auf reine Tastaturbedienung
    angewiesen ist (siehe Abschnitt 3.6).
- Bestehende Konventionen (aus `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
  übernommen, in `alignment.spec.ts` beizubehalten):
  - `page.goto('/')` → Privacy-Banner wegklicken: `page.getByRole('button', { name: /verstanden/i }).click()`.
  - Karten-Locator: `docxCard(page)`/`odtCard(page)` über
    `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: '…' }) })`.
  - Editor-Locator: `page.locator('.ProseMirror')`.
  - Export: `page.getByRole('button', { name: 'Exportieren' })` + `page.waitForEvent('download')`.
  - Datei-Upload zwei Varianten (siehe Abschnitt 3.4): schneller `input.setInputFiles(…)`
    auf `input[type="file"]` **und** mindestens ein Testfall pro Format über den
    echten sichtbaren Button + `page.waitForEvent('filechooser')`.
- **Wichtiger Selektor-Vorbehalt (aus Abschnitt 0, Fehler 5 / Verdachtsmomente
  7.7–7.8):** Der Zentriert-Button hat **aktuell** `title="Ausrichtung: center"`
  (interner englischer Bezeichner, kein `aria-label`). Alle Tests in diesem Plan
  verwenden deshalb vorläufig `page.getByTitle('Ausrichtung: center')`. Sobald
  `ausrichtung-zentriert-code.md` Abschnitt 4.2 umgesetzt ist, wechselt der Titel
  auf `"Ausrichtung: Zentriert"` (via `ALIGN_LABELS`) **und** ein `aria-label` wird
  ergänzt — dann **müssen alle Testfälle in diesem Plan auf den neuen Titeltext
  migriert werden**, sonst laufen sie nach dem Fix fälschlich rot statt grün. Analog
  für „Links"/„Rechts"/„Blocksatz" in Z6 (`"Ausrichtung: left"` → `"Ausrichtung:
  Links"` usw.). Diese Migration ist selbst ein abzuhakender Schritt (Abschnitt 7,
  Punkt 8).

---

## 2. Teil A — Unit-Tests (Reader/Writer-Rundreise DOCX **und** ODT + geteilte Commands)

**Zweck:** Schnelle, browserunabhängige Absicherung von zwei getrennten Ebenen, die
in dieser Anforderung beide kritisch sind: (A.1) der geteilte ProseMirror-Mechanismus
selbst (`setAlign`/`isAlignActive`/`setHeading` — hier sitzt der schwerwiegendste
Bug, Fehler 1, unabhängig von DOCX/ODT reproduzierbar) sowie (A.2) die
Reader/Writer-Rundreise DOCX **und** ODT (Kernauftrag dieses Plans). Ein rotes
Toolbar-/Browser-Verhalten darf diese Unit-Tests nicht rot färben und umgekehrt.

### 2.1 Bestandsaufnahme (bereits vorhanden, als Basisschutz zu erhalten)

| Datei | Test | Deckt ab |
|---|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts:47-52` (heading) / `:54-58` (`it.each`) | dedizierter Test „preserves heading alignment" (`center`) + `it.each(['left','center','right','justify'])` für Absätze | Anforderung 5.1 Grundfall, **nur** Writer→eigener Reader, **ein** isolierter Absatz/Heading |
| `src/formats/odt/__tests__/roundtrip.test.ts:49-52` (heading) / `:56-58` (`it.each`) | analog | Grundfall, nur Writer→eigener Reader |

Diese Tests bleiben unverändert Teil der Suite; sie werden **nicht** ersetzt, nur
ergänzt — sie decken laut Anforderungsabschnitt 1 explizit **nicht** Tabellen,
Listen, Formatvorlagen-Wechsel oder Fremddateien ab.

### 2.2 `src/formats/shared/editor/__tests__/commands.test.ts` (**ergänzt** — Datei existiert bereits)

Die Datei existiert und testet aktuell nur `canCut`/`cutSelection`. **Ergänzen** um
echte `EditorState`/`EditorView` in jsdom (analog zu den in `ausrichtung-zentriert-code.md`
Abschnitt 0/2.1 beschriebenen Reproduktionen), **mit** `history()`-Plugin, damit
Undo-Verhalten geprüft werden kann.

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status |
|---|---|---|---|---|
| C1 | `setAlign('center')` auf Einzelabsatz (Cursor, keine Selektion) | Ein-Absatz-Dokument, Cursor hineinsetzen, `setAlign('center')(view.state, view.dispatch)` | `align === 'center'`, kein Fehler | Grün erwartet |
| C2 | **Kritischer Regressionstest Fehler 1** — `setAlign('center')` auf 3-Absatz-Selektion | 3 Absätze (`left`, `right`, `justify`), Selektion über alle drei, `setAlign('center')(view.state, view.dispatch)` | Alle drei `align === 'center'`, **kein** `RangeError`-Wurf | **ROT** (reproduziert die in `ausrichtung-zentriert-code.md` §2.1 dokumentierte Exception `RangeError: Applying a mismatched transaction`, Endergebnis `['center','left','left']`) |
| C3 | Ein Klick = **ein** Undo-Schritt bei Mehrabsatz-Selektion | Direkt nach (gefixtem) C2: ein einziges `undo()` aus `prosemirror-history` | Alle drei Absätze zurück auf `['left','right','justify']` in **einem** Schritt | Blockiert durch C2 |
| C4 | No-Op bei bereits gesetztem Wert (Grenzfall 9) | `setAlign('center')` zweimal auf dieselbe, bereits zentrierte Selektion; `undoDepth`/Anzahl `dispatchTransaction`-Aufrufe vor/nach vergleichen | Zweiter Aufruf erzeugt **keine** neue Undo-Stufe | Blockiert durch C2 |
| C5 | **Regressionstest Fehler 4** — `isAlignActive` bei gemischter Selektion | Zwei Absätze, erster `center`, zweiter `left`, Selektion über beide, `isAlignActive(state, x)` für **alle vier** Werte | Für **keinen** der vier Werte `true` | **ROT** (aktuell `true` für `'center'`, da nur `$from` geprüft) |
| C6 | **Regressionstest Fehler 2** — `setHeading(1)` auf zentrierten Absatz | Absatz mit `align:'center'`, `setHeading(1)(state, dispatch)` | `align` bleibt `'center'` | **ROT** (aktuell `'left'`) |
| C7 | `setHeading(null)` auf zentrierte Überschrift (zurück zu Standard) | Überschrift `align:'center'`, `setHeading(null)(state, dispatch)` | `align` bleibt `'center'` | **ROT** |
| C8 | `setHeading` zwischen zwei Überschriftsebenen (1→3) auf zentriertem Text | Überschrift Ebene 1, `align:'center'`, `setHeading(3)` | `align` bleibt `'center'` | **ROT** |
| C9 | `setAlign` auf Absatz innerhalb `list_item`/`table_cell` | Dokument mit `list_item > paragraph` bzw. `table_cell > paragraph` per JSON, Cursor hinein, `setAlign('center')` | `align === 'center'`, keine Nebenwirkung auf Nachbarknoten | Grün erwartet (bestätigt Anforderung 3.6, bisher unbelegt) |
| C10 | Performance-Rauchtest (Vorstufe zu Z41) | Synthetisches Dokument mit 200 Absätzen, Selektion über alle, `setAlign('center')` | Läuft ohne Timeout, alle 200 `'center'` (`performance.now()`-Differenz protokollieren) | Blockiert durch C2 (vor dem Fix bricht die Schleife nach dem zweiten Absatz mit `RangeError` ab) |

### 2.3 `src/formats/docx/__tests__/roundtrip.test.ts` (ergänzt)

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status |
|---|---|---|---|---|
| D1 | **Regressionstest Grenzfall 1 / Fehler 6** — stilbasierte Zentrierung ohne direktes `w:jc` | Synthetisch: Absatz mit `w:pStyle`, referenzierter Stil in `styles.xml` mit `<w:jc w:val="center"/>`, kein direktes `w:jc` am Absatz | `align === 'center'` | **ROT** (aktuell `'left'`) |
| D2 | `w:basedOn`-Kette (2 Ebenen) + Zyklenschutz | Stil A `basedOn` B, nur B hat `<w:jc>`; separat: A `basedOn` B, B `basedOn` A (Zyklus) | Kette korrekt aufgelöst; Zyklus wirft **nicht**, bricht nach `MAX_STYLE_CHAIN_DEPTH` ab | Blockiert durch D1 |
| D3 | Direkte Formatierung schlägt Stil (Vorrang-Test) | Absatz mit eigenem `<w:jc w:val="left"/>` **und** `w:pStyle`, dessen Stil `center` definiert | `align === 'left'` | Grün erwartet (spiegelt Absatz 2 aus `bug-paragraph-alignment.docx`) |
| D4 | **Regressionstest Fehler 7** — `jc="start"`/`jc="end"` mit/ohne `<w:bidi/>` | 4 Kombinationen: `start`+kein bidi, `start`+bidi, `end`+kein bidi, `end`+bidi | `left`/`right`/`right`/`left` (gemäß Code-Plan §4.4b) | **ROT** (aktuell alle vier → `'left'`) |
| D5 | Erweiterte `jc`-Werte | `jc="distribute"`/`"thaiDistribute"`/`"mediumKashida"` | Alle drei → `'justify'` | **ROT** (aktuell alle drei → `'left'`) |
| D6 | Zentrierter Absatz **innerhalb** `table_cell` | Rundreise Writer→Reader mit `table_cell > paragraph, align:'center'` | `align` bleibt `'center'` | Grün erwartet, aber bisher **kein** Test (Anforderung 5.1.5) |
| D7 | Zentrierter Absatz **innerhalb** `list_item` (Bullet + nummeriert) | Analog D6 für `bullet_list`/`ordered_list > list_item > paragraph` | `align` bleibt `'center'` | Grün erwartet, bisher kein Test (Anforderung 5.1.6) |
| D8 | Leerer, zentrierter Absatz (Grenzfall 5) | `paragraph` mit `align:'center'`, `content: []` | Rundreise erhält `align:'center'`, Absatz verschwindet nicht | Grün erwartet, bisher kein Test |
| D9 | Formatvorlagen-Wechsel vor Export (voller Rundreise-Pfad) | Absatz `align:'center'` → `setHeading(2)`-äquivalentes JSON → `writeDocx` → `readDocx` | `align === 'center'` (nicht `'left'`) | **ROT** vor Fehler-2-Fix (Anforderung 5.3.4) |
| D10 | Zentrierte Überschrift + Fett/Farbe kombiniert (Grenzfall 6) | Überschrift `align:'center'`, Text-Run mit `strong` + `textColor`-Mark | Beide Ebenen unabhängig erhalten nach Rundreise | Grün erwartet |
| D11 | **Regressionstest Grenzfall 15 / Verdachtsmoment 7.6** — ungültiger `align`-Wert | Dokument-JSON mit `paragraph attrs.align = 'foo'` → `writeDocx` | Export schreibt gültiges Fallback-XML (`<w:jc w:val="left"/>`), **kein** Absturz, kein korruptes XML | Grün erwartet (Export-Fallback vorhanden, bisher ungetestet) |

### 2.4 `src/formats/odt/__tests__/roundtrip.test.ts` (ergänzt)

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status |
|---|---|---|---|---|
| O1 | `fo:text-align` nur auf per `style:parent-style-name` referenziertem Elternstil | Automatischer Stil ohne eigenes `fo:text-align`, aber `style:parent-style-name` verweist auf Stil mit `fo:text-align="center"` | `align === 'center'` nach Import | **ROT** (aktuell nicht ausgewertet, kein Ersatzfixture — reiner Unit-Test nötig) |
| O2 | **Regressionstest Fehler 3** — `fo:text-align="end"`/`"start"` normalisiert | Paragraph-Stil mit `fo:text-align="end"`, einmal ohne, einmal mit `style:writing-mode="rl-tb"` | Ohne RTL: `'right'`; mit RTL: `'left'` (invertiert) | **ROT** (aktuell roh `"end"` durchgereicht) |
| O3 | Zentrierter Absatz in `table_cell`/`list_item` | Rundreise Writer→Reader | `align` bleibt `'center'` | Grün erwartet, bisher kein Test |
| O4 | Leerer, zentrierter Absatz (Grenzfall 5) | Analog D8 für ODT | `align` bleibt `'center'` | Grün erwartet, bisher kein Test |
| O5 | Formatvorlagen-Wechsel vor Export | Analog D9 für ODT | `align === 'center'` nach vollem Rundreise-Pfad | **ROT** vor Fix |
| O6 | Stil aus `office:styles` statt `office:automatic-styles` referenziert | `office:styles`-Eintrag (Familie `paragraph`) mit `fo:text-align="center"`, automatischer Stil verweist darauf | `align === 'center'` | **ROT** (aktuell nur `office:automatic-styles` gelesen) |
| O7 | **Regressionstest Grenzfall 15** — ungültiger `align`-Wert | Analog D11 für ODT (`writeOdt` mit `align:'foo'`) | Export schreibt gültigen Fallback-Stil (`PARAGRAPH_ALIGN_STYLE_NAME.left`), kein Absturz | Grün erwartet |

### 2.5 Neue Datei: `src/formats/docx/__tests__/alignment-fixtures.test.ts`

Dediziert (nicht in `external-fixtures.test.ts` gemischt, das nur „importiert ohne
Absturz" prüft). **Diese Tests bestätigen zugleich Fehler 8** (Fixture-Eignung):

| # | Testfall | Erwartung | Erwarteter Status |
|---|---|---|---|
| AF-D1 | `bug-paragraph-alignment.docx`: Absatz 1 (stilbasiert zentriert, kein direktes `w:jc`) | `align === 'center'` | **ROT** (aktuell `'left'`) |
| AF-D1b | Dieselbe Datei, Absatz 2 (direktes `w:jc="left"`, überschreibt Stil) | `align === 'left'` | Grün erwartet |
| AF-D2 | `rtl.docx`: Absatz mit `jc="start"` + `w:bidi="1"` | `align === 'right'` (physisch, siehe D4) | **ROT** (aktuell `'left'`) |
| AF-D3 | `table-alignment.docx` — dokumentierender Test | Kein `table_cell`-Absatz hat einen von `'left'` abweichenden `align`-Wert | Grün erwartet (bestätigt Ungeeignetheit: reine Tabellen-Fließausrichtung `<w:tblPr><w:jc>`, kein `<w:pPr><w:jc>` in einer Zelle) |
| AF-D4 | `TestTableCellAlign.docx` — dokumentierender Test | Datei enthält **kein** `<w:jc>` (nur `<w:vAlign>`, vertikale Zellausrichtung) | Grün erwartet (dokumentiert Ungeeignetheit, verhindert Fehlnutzung) |

### 2.6 Neue Datei: `src/formats/odt/__tests__/alignment-fixtures.test.ts`

| # | Testfall | Erwartung | Erwarteter Status |
|---|---|---|---|
| AF-O1 | `feature_attributes_paragraph_MSO2013.odt`: „Center"-Absatz | `align === 'center'` | Grün erwartet (kanonischer Wert) |
| AF-O1b | Dieselbe Datei: „Align Text Right"-Absatz (`fo:text-align="end"`) | `align === 'right'` | **ROT** (aktuell `'end'` roh durchgereicht) |
| AF-O1c | Dieselbe Datei: „Justify"-Absatz | `align === 'justify'` | Grün erwartet |
| AF-O2 | `CharacterParagraphFormat.odt` — dokumentierender Test | Kein `fo:text-align` in `content.xml`/`styles.xml`, alle Absätze `'left'` | Grün erwartet (bestätigt Ungeeignetheit als Primärkandidat; `feature_attributes_paragraph_MSO2013.odt` ist der korrigierte Kandidat) |

### 2.7 Neue Datei: `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts`

Datenmodell-Ersatz für die UI-Cross-Format-Rundreise (siehe Abschnitt 3.1.8 zur
UI-Einschränkung). Deckt Anforderung 5.3.1–5.3.3.

| # | Testfall | Vorgehen | Erwartung |
|---|---|---|---|
| X1 | DOCX → ODT → DOCX, einfache Zentrierung | `readDocx(writeDocx(…))` → `readOdt(writeOdt(…))` → `readDocx(writeDocx(…))` | `align === 'center'` bleibt über beide Konvertierungen (Anforderung 5.3.1/5.3.3) |
| X2 | ODT → DOCX → ODT, einfache Zentrierung | Spiegelbildlich zu X1 | Analog (Anforderung 5.3.2/5.3.3) |
| X3 | **Doppelte Cross-Format-Rundreise mit Kombination** | Wie X1, aber Absatz/Überschrift kombiniert mit Zentrierung + Fett + Farbe + Überschrift-Ebene 2 | Kein kumulativer Verlust der Zentrierung über zwei Konvertierungen (Anforderung 5.3.3) |

### 2.8 Bekannte Grenze der Unit-Test-Ebene (Fehler 9, Copy/Paste)

`ausrichtung-zentriert-code.md` Abschnitt 2.9 dokumentiert, dass `getComputedStyle`
(die diskutierte Reparatur für „Stil auf umschließendem `<div>` statt auf `<p>`
selbst") in jsdom **keine** CSS-Vererbung auflöst — weder für ein freistehendes noch
für ein an `document.body` angehängtes Element. Ein Unit-Test für diesen konkreten
Fehler ist deshalb **nicht sinnvoll möglich**; er wird ausschließlich in Abschnitt 3
(Z18, echter Browser) abgedeckt. Dies wird hier bewusst dokumentiert, damit kein
zukünftiger Versuch unternommen wird, ihn fälschlich als Unit-Test nachzurüsten.

---

## 3. Teil B — Echte Playwright-Browser-Tests

**Grundsatz (bindend für diesen Abschnitt):** Kein Testfall in Teil B darf durch
direkten Aufruf interner Funktionen (`setAlign(…)`, `isAlignActive(…)`, `readDocx(…)`
etc.) im Node-Kontext ersetzt werden. Jeder Testfall muss über echte
Nutzer:innen-Handlungen im Browser laufen: `locator.click()`,
`page.keyboard.press(…)`/`.type(…)`, `input.setInputFiles(…)` bzw. echtes
`filechooser`-Event, `page.waitForEvent('download')` + Auslesen der heruntergeladenen
Datei vom Dateisystem und Prüfung mit einem vom eigenen Reader **unabhängigen**
Parser (JSZip + `DOMParser`, nicht nur String-`.toContain`).

**Determinismus (verpflichtend, Lehre aus `selection-regression.spec.ts` /
`cut.spec.ts`):** Die App reconciliert die ProseMirror-Selektion bei einem echten
Klick über ein separates `mouseup`-Handling, das erst nach dem Klick-Event feuert
(`WordEditor.tsx:143-155` ruft `reconcileSelectionOnClick`, definiert Z. 43-50;
`dispatchTransaction` Z. 125-132) — die neue Selektion steht damit nicht im selben
Tick wie der auslösende Klick fest. Deshalb gilt für **jeden** Testfall:

- Nach einem Toolbar-Klick, der die Selektion/den Dokumentzustand verändert, **nicht
  sofort** die nächste Taste drücken. Statt fixer `waitForTimeout` auf einen
  **beobachtbaren** Zustand warten: `await expect(button).toHaveAttribute('aria-pressed', 'true')`
  bzw. `await expect(p).toHaveCSS('text-align', 'center')`, **bevor** die nächste
  Interaktion erfolgt.
- Vor `ControlOrMeta+a`/Pfeiltasten sicherstellen, dass der Editor fokussiert ist
  (`await page.locator('.ProseMirror').click()` an definierter Stelle, dann auf die
  resultierende Selektion warten), damit keine Race-Condition zwischen DOM-Fokus und
  ProseMirror-Selektion entsteht.
- Text nicht per `.type()` mit Default-Delay „durchrattern", wo die Reihenfolge
  gegenüber einem vorangegangenen asynchronen Selektions-Sync kritisch ist —
  zwischen Sync-auslösender Aktion und Tastatureingabe erst auf den Sync-Effekt
  warten (analog Commit `db61c89`/`0797d13`).
- Konsolen-/Seitenfehler pro Test einsammeln: `const errors: Error[] = []; page.on('pageerror', e => errors.push(e))` und am Ende `expect(errors).toEqual([])` (außer wo ein Fehler bewusst als Ist-Zustand dokumentiert wird — dann exakt diesen einen erwarten).

### 3.1 Neue Datei: `tests/e2e/alignment.spec.ts`

Struktur analog zu `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
(`docxCard`/`odtCard`-Helfer, `buildSampleDocx`/`buildSampleOdt`-Muster für
handgebaute Fixtures wiederverwenden). **Dies ist der erste Test, der `setAlign` über
einen echten Button-Klick auslöst** (Abnahmekriterium 5, Verdachtsmoment 7.11). Ein
`test` je Zeile unten.

#### 3.1.1 Grundbedienung und Selektionsmethoden (Anforderung §3.1/3.2, Testfall 1–2)

| # | Test | Schritte | Assertion |
|---|---|---|---|
| Z1 | Cursor ohne Selektion → Zentriert klicken | Neues Dokument, Text tippen, Cursor bleibt an Position (keine Selektion), `page.getByTitle('Ausrichtung: center').click()` | `expect(page.locator('.ProseMirror p')).toHaveCSS('text-align', 'center')`; `aria-pressed="true"` auf dem Button |
| Z2 | Alle Selektionsmethoden liefern identisches Ergebnis | Vier Sub-Fälle: Maus-Ziehen (`page.mouse.down/move/up` mit >3 px), Doppelklick (`dblclick`), Dreifachklick (`click({ clickCount: 3 })`), `ControlOrMeta+a` — je gefolgt von Klick auf „Zentriert", je nach Klick auf `text-align: center` warten | Für jede Methode identisch: **gesamter** Absatz `text-align: center` (nicht nur das markierte Wort) |

#### 3.1.2 KRITISCH: Mehrabsatz-Selektion (Regressionstest Fehler 1, Anforderung §3.2, Grenzfall 4, Testfall 3–5)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z3 | Drei Absätze mit gemischter Ausgangsausrichtung → Zentriert (deckt Testfall 3, 4 und 5) | Drei Absätze anlegen; Absatz 2 rechts (`Ausrichtung: right`), Absatz 3 Blocksatz (`Ausrichtung: justify`) setzen (je auf aktualisiertes `aria-pressed` warten); `page.on('pageerror', …)` registrieren; Editor fokussieren; `ControlOrMeta+a`; auf `AllSelection` warten; `Ausrichtung: center` klicken | **Alle drei** `<p>` haben `text-align: center` (nicht nur der erste); `expect(errors).toEqual([])` (kein unbehandelter `RangeError`) | **ROT** (Kernbefund: nur der erste Absatz wird zentriert, Browser-Konsole zeigt eine unbehandelte `RangeError`-Exception) |
| Z4 | Direkt danach: **ein** `ControlOrMeta+z` | Unmittelbar nach Z3, auf sichtbaren Effekt warten | Alle drei Absätze zurück auf ihre jeweilige Ausgangsausrichtung (`left`/`right`/`justify`) — Nachweis „ein Klick = ein Undo-Schritt" | Blockiert durch Z3 |
| Z5 | Erneuter Klick auf bereits aktives „Zentriert" (Grenzfall 9, Testfall 6) | Nach Z3 erneut `Ausrichtung: center` klicken, danach **ein** `ControlOrMeta+z` | Zweiter Klick verändert nichts sichtbar; das eine `Strg+Z` führt zurück zum Zustand **vor** dem ursprünglichen Zentrieren (kein leerer Undo-Schritt durch den No-Op) | Blockiert durch Z3 |

#### 3.1.3 Toggle-Verhalten und Zustandsanzeige (Anforderung §3.3/3.4, Testfall 7–9)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z6 | Links/Rechts/Blocksatz auf zentrierten Absatz (Testfall 7) | Absatz zentrieren, dann nacheinander `Ausrichtung: left`/`right`/`justify` klicken (je auf `aria-pressed`-Wechsel warten) | Jede Aktion ersetzt die Zentrierung korrekt; nie zwei `aria-pressed="true"` gleichzeitig | Grün erwartet |
| Z7 | `aria-pressed` bei Cursor in zentriertem Text ohne Selektion; wechselt bei Cursor-Bewegung (Testfall 8) | Zwei Absätze (einer zentriert, einer links), Cursor in den zentrierten setzen, dann in den linken | `aria-pressed="true"` im zentrierten Absatz; `false` nach Cursor-Bewegung in den linken | Grün erwartet |
| Z8 | **Regressionstest Fehler 4** — gemischte Selektion (Testfall 9) | Zwei Absätze: erster zentriert, zweiter links; beide markieren (`ControlOrMeta+a`) | **Keiner** der vier Ausrichtungs-Buttons zeigt `aria-pressed="true"` | **ROT** (aktuell „Zentriert" fälschlich `true`, da nur der Selektionsanfang geprüft) |

#### 3.1.4 Formatvorlagen-Wechsel (Kernverdacht — Anforderung §3.5, Testfall 10–11)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z9 | Zentrierung einer Überschrift (Ebene 1, 3, 6 als Stichprobe) (Testfall 10) | Absatzformat-Dropdown auf „Überschrift 1"/„3"/„6", Text zentrieren | Identisch zu einem normalen Absatz zentriert (`h1`/`h3`/`h6` `text-align: center`) | Grün erwartet |
| Z10 | **Regressionstest Fehler 2** — Absatz zentrieren → Dropdown „Überschrift 1" (Testfall 11a) | Absatz zentrieren, auf `aria-pressed` warten, dann Absatzformat-Dropdown auf „1" | `text-align: center` bleibt auf dem resultierenden `<h1>` | **ROT** (aktuell auf `left` zurückgesetzt) |
| Z11 | Umgekehrt: zentrierte Überschrift → Dropdown „Standard" (Testfall 11b) | Überschrift zentrieren, dann Dropdown auf „Standard" | Zentrierung bleibt auf dem resultierenden `<p>` | **ROT** |
| Z12 | Zwischen zwei Überschriftsebenen (1 → 3) (Testfall 11c) | Überschrift 1 zentrieren, dann Dropdown auf „3" | Zentrierung bleibt erhalten | **ROT** |

#### 3.1.5 Tabellenzellen und Listen (Anforderung §3.6, Testfall 12–13)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z13 | Zentrierung in einer Tabellenzelle (Testfall 12) | Tabelle-Button (2×2), erste Zelle anklicken, Text tippen, zentrieren | Nur diese Zelle `text-align: center`; die drei übrigen Zellen unverändert (`page.locator('.ProseMirror td')`, je einzeln) | Grün erwartet |
| Z14 | Zentrierung in einer über `colspan`/`rowspan` verbundenen Zelle (Testfall 12) | **Kein UI-Weg** (siehe Abschnitt 0/8): handgebaute DOCX-/ODT-Fixture mit bereits verbundener Zelle per `setInputFiles` importieren, danach Zellinhalt zentrieren | Verbundene Zelle zentriert sich identisch, keine Nebenwirkung auf angrenzende Zellen | Blockiert bis Fixture gebaut (Abschnitt 8) |
| Z15 | Zentrierung eines Bullet-Listeneintrags (Testfall 13) | Bullet-Liste, Text tippen, zentrieren | Text zentriert; Position des Aufzählungszeichens (`<li>`-Bounding-Box vor/nach) unverändert (`page.evaluate` → `getBoundingClientRect()`) | Grün erwartet |
| Z16 | Zentrierung eines nummerierten Listeneintrags (Testfall 13) | Nummerierte Liste, analog Z15 | Analog | Grün erwartet |

#### 3.1.6 Kombination mit Zeichenformatierung und Zwischenablage (Anforderung §3.8, Grenzfall 10, Testfall 14–16)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z17 | Zentrierung + Fett + Schriftfarbe im selben Textlauf (Testfall 14) | Text tippen, `ControlOrMeta+a`, Fett-, Farbe- und Zentriert-Button (je auf Effekt warten) | Alle drei gleichzeitig sichtbar (`toHaveCSS('text-align','center')`, `font-weight:700`, `color`) | Grün erwartet |
| Z18 | **Regressionstest Fehler 9 / Grenzfall 10** — Paste mit Stil auf umschließendem Element (Testfall 15) | Echtes Einfügen von `<div style="text-align: center"><p>Von außen zentriert</p></div>` über einen echten `ClipboardEvent`/`DataTransfer` per `page.evaluate` auf den fokussierten Editor (nicht `insertHTML`) | Resultierender Absatz hat `text-align: center` | **ROT** (aktuell `left`, `getAttrs` liest nur `dom.style.textAlign` des `<p>` selbst). Läuft **ausschließlich** hier — jsdom löst `getComputedStyle`-Vererbung nicht auf (Abschnitt 2.8) |
| Z19 | Leeren Absatz zentrieren, dann tippen (Grenzfall 5, Testfall 16) | Neuer, leerer Absatz, zentrieren, auf `aria-pressed` warten, `page.keyboard.type(…)` | Getippter Text erscheint zentriert | Grün erwartet |

#### 3.1.7 Icon, Tooltip, `aria-label`, Tastenkürzel (Anforderung §3.10, Testfall 17–19)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z36 | Tooltip-Text (Verdachtsmoment 7.8, Testfall 18) | `page.getByTitle('Ausrichtung: center')` vorhanden | Dokumentiert den aktuellen (englischen) Zustand; nach Umsetzung von Code-Plan §4.2 auf `getByTitle('Ausrichtung: Zentriert')` migrieren | **ROT gegen Zielzustand** (aktuell korrekt gegen Ist-Zustand — Migrationshinweis Abschnitt 1) |
| Z37 | `aria-label` vorhanden und konsistent zum Titel (Verdachtsmoment 7.7, Testfall 18) | `expect(page.getByTitle(…)).toHaveAttribute('aria-label', …)` | Muss identisch zum Titeltext sein (Konsistenz zu `MarkButton`) | **ROT** (aktuell kein `aria-label`) |
| Z38 | Reiner Tastatur-Fokus-Pfad auf den Zentriert-Button (Fehler 5, Testfall 19) | Wiederholt `Tab` bis Button fokussiert (`toBeFocused()`), dann `Enter` bzw. separat `Space`, auf vorher gesetzte Selektion angewendet | Zentrierung wird angewendet | **ROT** (kein `onClick`; `mousedown` wird bei Tastatur-Aktivierung nicht ausgelöst) |
| Z39 | Icon-Rendering-Dokumentation (Verdachtsmoment 7.9, Testfall 17) | Screenshot des Zentriert-Buttons (`page.getByTitle(…).screenshot()`) vor/nach SVG-Entscheidung | Dokumentierend, kein Pass/Fail; hält fest, ob `↔` von `⇤`/`⇥`/`≡` unterscheidbar bleibt | Dokumentierend |
| Z40 | Tastenkürzel `Strg/Cmd+E` (Testfall 19) | Text markieren, `page.keyboard.press('ControlOrMeta+e')` | Text wird zentriert | **ROT** (aktuell kein Kürzel gebunden — bewusst rot geschrieben; Entscheidung Code-Plan §5, 9.6: `Mod-e` wird ergänzt) |

#### 3.1.8 Undo/Redo und Selection-Sync-Regression (Anforderung §3.9, Grenzfall 11, Testfall 20–21)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z20 | Undo direkt nach Zentrieren (Einzelabsatz) (Testfall 20) | Absatz zentrieren, auf `aria-pressed` warten, `ControlOrMeta+z` | Ausrichtung zurück zum Vorzustand | Grün erwartet |
| Z21 | Redo danach (Testfall 20) | Direkt nach Z20: `ControlOrMeta+y` | Zentrierung kommt zurück | Grün erwartet |
| Z22 | Selection-Sync-Regression mit „Zentriert" als auslösender Aktion (Testfall 21, Grenzfall 11) | Analog `selection-regression.spec.ts`, aber Zentrieren statt Fett: Mehrabsatz-Dokument, `ControlOrMeta+a`, „Zentriert" klicken, per Klick neu positionieren (auf Selektions-Sync warten), `Enter`, weitertippen | Beide entstehenden Absätze bleiben erhalten **und** zentriert; erwartete Absatzanzahl | Abhängig von Z3-Fix — mit unbehobenem Fehler 1 bricht bereits der „Zentriert"-Klick auf mehr als einen Absatz mit einer Exception ab |

#### 3.1.9 Vollständige Rundreise über echten Upload/Download (Anforderung Abschnitt 5, Testfall 22–34)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z23 | DOCX-Rundreise nach eigener Bearbeitung (Testfall 22) | Neues Dokument (DOCX-Karte), Text tippen, zentrieren, exportieren (`waitForEvent('download')`), heruntergeladene Datei per `input.setInputFiles` reimportieren | `text-align: center` im reimportierten Editor weiterhin sichtbar; JSZip auf `word/document.xml` → `<w:jc w:val="center"/>` am richtigen `<w:p>` | Grün erwartet |
| Z24 | ODT-Rundreise nach eigener Bearbeitung (Testfall 23) | Analog Z23 für ODT-Karte; `content.xml` → `fo:text-align="center"` am referenzierten `Ppara-center` | Analog | Grün erwartet |
| Z25 | Cross-Format DOCX → ODT (Testfall 24) | UI-Pfad an der laufenden App vorab verifizieren (Abschnitt 8); falls UI-Cross-Format noch nicht existiert (siehe `roundtrip-fidelity.spec.ts` `test.skip`), auf X1 (Unit) verweisen | Nach Cross-Export/Re-Import: Zentrierung erhalten | Vorab an der UI zu verifizieren (Abschnitt 8) |
| Z26 | Cross-Format ODT → DOCX (Testfall 24) | Spiegelbildlich zu Z25 | Analog | Wie Z25 |
| Z27 | **Doppelte Cross-Format-Rundreise kombiniert** (Testfall 25) | Zentrierter Absatz + Fett + Farbe + Überschrift-Ebene 2 → zwei Konvertierungsschritte; letzten Download per `DOMParser` prüfen | Zentrierung **und** alle kombinierten Formate bleiben erhalten | Ergänzt X3 (Unit) um echten Browser-Nachweis; UI-Verfügbarkeit wie Z25 |
| Z28 | **Reale Fixture DOCX, stilbasiert** (Testfall 26, 28, 30) | `bug-paragraph-alignment.docx` per `setInputFiles` **und** einmal per echtem `filechooser` (3.4) hochladen → unverändert exportieren → JSZip + `DOMParser` auf `word/document.xml` | Absatz 1 trägt nach Export `<w:jc w:val="center"/>` (obwohl die Quelle **kein** direktes `w:jc` daran hatte — Nachweis der Stilauflösung); Absatz 2 `left` | **ROT** vor Fix (Absatz 1 aktuell `left`) |
| Z29 | **Reale Fixture ODT** (Testfall 27, 30) | `feature_attributes_paragraph_MSO2013.odt` (korrigierter Kandidat) hochladen → unverändert exportieren → `content.xml` per `DOMParser` | „Center"-Absatz weiterhin `fo:text-align="center"`; „Align Text Right"-Absatz jetzt `fo:text-align="right"` (nicht mehr roh `"end"` und nicht fälschlich `"left"`) | Teilweise **ROT** vor Fix (Right-Absatz) |
| Z30 | Stilbasierte Zentrierung sichtbar **im Editor** (nicht erst nach Export) (Testfall 26, 28) | `bug-paragraph-alignment.docx` hochladen, Absatz 1 direkt im Editor prüfen | `toHaveCSS('text-align', 'center')` | **ROT** vor Fix (aktuell `left` im Editor) |
| Z31 | `rtl.docx` hochladen (Testfall 29, Grenzfall 13) | Upload, betroffenen Absatz (`jc="start"` + `w:bidi="1"`) lokalisieren | `toHaveCSS('text-align', 'right')` (physisch rechtsbündig, ohne Anspruch auf korrekte RTL-Zeilenrichtung, Code-Plan §5.6) | **ROT** vor Fix (aktuell `left`) |
| Z32 | Zentrierte Zelle, Rundreise DOCX (Testfall 31) | Tabelle einfügen, Zelle zentrieren, exportieren, reimportieren | Zentrierung der Zelle bleibt erhalten | Grün erwartet |
| Z33 | Zentrierte Zelle, Rundreise ODT (Testfall 31) | Analog Z32 für ODT | Analog | Grün erwartet |
| Z34 | Zentrierte Listeneinträge, Rundreise DOCX (Testfall 31) | Liste einfügen, Eintrag zentrieren, exportieren, reimportieren | Zentrierung bleibt erhalten | Grün erwartet |
| Z35 | Zentrierte Listeneinträge, Rundreise ODT (Testfall 31) | Analog Z34 für ODT | Analog | Grün erwartet |
| Z43 | **Mehrfachabsatz-Rundreise** (Testfall 32) | Drei Absätze anlegen, `ControlOrMeta+a`, „Zentriert", exportieren, reimportieren, alle drei prüfen | **Alle** drei reimportierten Absätze `text-align: center` | Blockiert durch Z3 (erst nach Fehler-1-Fix sinnvoll durchführbar) |

#### 3.1.10 Fremdwert-Import und Performance/Robustheit (Anforderung Grenzfall 2/9/14, Testfall 33–35)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| Z41 | Sehr lange Selektion (viele Absätze) zentrieren (Testfall 33, Grenzfall 14) | Dokument mit ~150 Absätzen (per `page.evaluate` auf das ProseMirror-Dokument oder Import einer Fixture aufgebaut), `ControlOrMeta+a`, „Zentriert", Zeit bis UI reagiert messen | Kein spürbares Einfrieren (Zeitbudget dokumentieren); Stichprobe Anfang/Mitte/Ende alle `center`; kein `pageerror` | Blockiert durch Z3 (vor dem Fix bricht die Schleife nach dem zweiten Absatz mit `RangeError` ab) |
| Z42 | Schnelles Mehrfachklicken auf bereits aktiven Zentriert-Button (Testfall 6, Grenzfall 9) | 5× `click()` in schneller Folge auf einen bereits zentrierten Absatz, dann **ein** `ControlOrMeta+z` | Kein inkonsistenter Zwischenzustand; **ein** `Strg+Z` stellt den ursprünglichen Vorzustand her (keine aufgeblähte Undo-Historie) | Grün erwartet, sofern No-Op-Kurzschluss (C4) implementiert ist |
| Z44 | Import Fremdwert `w:jc="distribute"` / `fo:text-align="end"` über echte Fixture (Testfall 34, Grenzfall 2) | `rtl.docx` (`start`/`end`) bzw. `feature_attributes_paragraph_MSO2013.odt` (`end`) hochladen | Kein Absturz, kein Textverlust; Fallback-Verhalten sichtbar dokumentiert (`distribute`→`justify`, `end`→`right`) | Teilweise **ROT** vor Fix (via Z29/Z31 mit abgedeckt) |

Der Import eines **ungültigen** `align`-Werts (`"foo"`, Testfall 35, Grenzfall 15) ist
über die Oberfläche nicht erzeugbar (kein UI-Weg, korrupte Daten zu setzen) und wird
deshalb ausschließlich auf Unit-Ebene geprüft (**D11/O7**) — hier bewusst vermerkt,
damit er nicht als E2E-Lücke missverstanden wird.

### 3.2 Icon-Rendering-Bewertung (Abnahmekriterium — Verdachtsmoment 7.9)

Siehe Z39. Kein automatisiertes Pass/Fail (Font-Rendering ist plattformabhängig),
aber verpflichtender dokumentierender Schritt vor Abschluss der Verifikation, analog
`fett-qa.md` Abschnitt 3.3.

### 3.3 Bestehende Tests, die unverändert weiterlaufen müssen

- `tests/e2e/selection-regression.spec.ts` (alle Tests) — **Pflichtbestandteil**,
  bleibt unverändert. Nach jeder Änderung an `Toolbar.tsx`/`commands.ts`
  (Fehler-1/2/4/5-Fixes) erneut ausführen, um sicherzustellen, dass der
  Fett-bezogene Regressionsschutz durch die Ausrichtungs-Änderungen nicht beschädigt
  wurde.
- `tests/e2e/roundtrip-fidelity.spec.ts` — enthält bereits den vorhandenen
  zentrierten-Absatz-Rundreisetest (Kriterium 4, DOCX **und** ODT, **ohne**
  Button-Klick, ein einzelner vorkonstruierter Absatz). Bleibt bestehen; die
  Cross-Format-Zeilen dort sind bewusst `test.skip` („blocked on backlog slug
  speichern-unter-format", siehe Abschnitt 8 zu Z25/Z26).
- `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts` — bleiben bestehen; enthalten
  keine Ausrichtungs-Assertions, daher keine Überschneidung mit `alignment.spec.ts`.
- `tests/e2e/lifecycle.spec.ts` — unverändert, keine Ausrichtungs-Berührung erwartet,
  muss aber Teil der Dauer-Suite bleiben und grün laufen.

### 3.4 Datei-Upload: echter `filechooser` zusätzlich zu `setInputFiles`

Wie in `fett-qa.md` Abschnitt 3.4 begründet: `setInputFiles` direkt auf den
versteckten `<input type="file">` testet Reader/Formular-Wiring, nicht die
tatsächliche Bedienung. Mindestens **ein** Testfall (Z28, reale DOCX-Fixture) muss
den echten sichtbaren Klickpfad nutzen:

```ts
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  docxCard(page).getByRole('button', { name: 'Datei hochladen' }).click(),
])
await fileChooser.setFiles({ name: 'bug-paragraph-alignment.docx', mimeType: '…', buffer })
```

Die schnellere `setInputFiles`-Variante bleibt für alle übrigen Testfälle Standard —
kein Widerspruch, nur Ergänzung.

### 3.5 Unabhängige Prüfung der heruntergeladenen Datei (nicht nur `.toContain`)

Für alle Export-Assertionen (Z23–Z35, Z43), die eine strukturelle Prüfung erfordern
(insbesondere Z28/Z29, wo **welcher** Absatz welchen Wert trägt entscheidend ist),
wird ein vom eigenen Reader unabhängiger Parser verlangt:

```ts
import { JSDOM } from 'jsdom' // bereits Devdependency
const parser = new JSDOM('').window.DOMParser()
const xmlDoc = parser.parseFromString(documentXml, 'application/xml')
const paragraphs = [...xmlDoc.getElementsByTagNameNS(W_NS, 'p')]
const target = paragraphs.find((p) => p.textContent?.includes('does not have explicit alignment'))
const jc = target?.getElementsByTagNameNS(W_NS, 'pPr')[0]?.getElementsByTagNameNS(W_NS, 'jc')[0]
expect(jc?.getAttributeNS(W_NS, 'val')).toBe('center')
```

Reine String-Suche (`expect(documentXml).toContain('<w:jc w:val="center"/>')`) genügt
**nicht**, wenn — wie bei Z28 — mehrere Absätze mit unterschiedlichem
Ausrichtungswert im selben Dokument geprüft werden müssen.

### 3.6 Cross-Browser-Matrix

`alignment.spec.ts` läuft auf den drei Basisprojekten (die beiden Clipboard-Projekte
sind per `testMatch` ausgeschlossen, siehe Abschnitt 1).

| Testgruppe | Desktop Chrome | Mobile (Pixel 7) | Tablet (iPad Mini) | Anmerkung |
|---|---|---|---|---|
| Klick-basierte Tests (Z1, Z2, Z6–Z13, Z15–Z17, Z19, Z23–Z37, Z39, Z42–Z44) | Pflicht | Pflicht | Pflicht | `.click()` funktioniert projektunabhängig |
| Tastatur-only-Tests (Z4, Z5, Z20, Z21, Z38, Z40) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | `page.keyboard.press` funktioniert unabhängig vom simulierten Gerät (CDP-Events); reales Verhalten auf Touch-Geräten ohne Hardware-Tastatur ist ein zu dokumentierender Sonderfall |
| Mehrabsatz-/Performance-Tests (Z3, Z22, Z41, Z43) | Pflicht | Pflicht | Pflicht | Kein gerätespezifisches Verhalten erwartet; auf Mobile/Tablet ggf. langsamer — Zeitbudget pro Projekt gesondert kalibrieren |

---

## 4. Traceability-Matrix (Anforderung Abschnitt 8, Testfälle 1–35 → Testfall in diesem Plan)

| Anforderung Testfall # | Kurzbeschreibung | Testfall(e) in diesem Plan |
|---|---|---|
| 1 | Cursor ohne Selektion → zentriert | Z1, C1 |
| 2 | Text markieren (Maus/Doppel/Dreifach) → ganzer Absatz | Z2 |
| 3 | Kernfehler Mehrfachselektion ≥3 Absätze | Z3, C2 (+ Z4, C3) |
| 4 | Kernfehler „Alles auswählen" (Strg+A) | Z3 (`ControlOrMeta+a`), C2 |
| 5 | Gemischte Ausgangsausrichtung → einheitlich | Z3, C2 |
| 6 | Erneuter Klick bei bereits zentriert (No-Op/Undo) | Z5, Z42, C4 |
| 7 | Links/Rechts/Blocksatz ersetzt Zentrierung | Z6 |
| 8 | Aktiv-Zustand bei Cursor ohne Selektion | Z7 |
| 9 | Button-Zustand bei gemischter Mehrfachselektion | Z8, C5 |
| 10 | Überschrift zentrieren | Z9 |
| 11 | Formatvorlagen-Wechsel-Regressionstest | Z10, Z11, Z12, C6, C7, C8, D9, O5 |
| 12 | Tabellenzelle (+ colspan/rowspan) | Z13, Z14, D6, O3 |
| 13 | Listeneintrag (Bullet + nummeriert) | Z15, Z16, D7, O3 |
| 14 | Zentrierung + Fett/Kursiv/Farbe | Z17, D10 |
| 15 | Copy/Paste inline vs. klassenbasiert (Grenzfall 10) | Z18 |
| 16 | Leeren Absatz zentrieren, tippen (Grenzfall 5) | Z19, D8, O4 |
| 17 | Icon-Rendering `↔` unterscheidbar | Z39 |
| 18 | Tooltip/`aria-label` deutsch | Z36, Z37 |
| 19 | Tastenkürzel Strg+E (+ Tastatur-Aktivierung) | Z40, Z38 |
| 20 | Undo/Redo Einzelabsatz | Z20, Z21 |
| 21 | Selection-Sync-Regression | Z22 |
| 22 | DOCX-Rundreise eigene Bearbeitung | Z23 |
| 23 | ODT-Rundreise eigene Bearbeitung | Z24 |
| 24 | Cross-Format DOCX→ODT und ODT→DOCX | Z25, Z26, X1, X2 |
| 25 | Doppelte Cross-Format-Rundreise (kombiniert) | Z27, X3 |
| 26 | Upload `bug-paragraph-alignment.docx` unverändert | Z28, Z30, AF-D1 |
| 27 | Upload `CharacterParagraphFormat.odt` (korr. `feature_attributes…`) unverändert | Z29, AF-O1/AF-O1b/AF-O1c, AF-O2 |
| 28 | Upload Fremddatei mit **stilbasierter** Zentrierung | Z28, Z30, AF-D1, D1 |
| 29 | Upload `rtl.docx` (Grenzfall 13) | Z31, AF-D2, D4 |
| 30 | Export-Validierung gegen unabhängigen Parser | Z28, Z29 (DOMParser) |
| 31 | Tabellenzellen + Listeneinträge Rundreise DOCX **und** ODT | Z32, Z33, Z34, Z35, D6, D7, O3 |
| 32 | Mehrfachabsatz-Rundreise (nach Fix 3.2) | Z43, C10 (Vorstufe) + D6/D7 |
| 33 | Performance/Stabilität lange Selektion (Grenzfall 14) | Z41, C10 |
| 34 | Import Fremdwert `distribute`/`end` (Grenzfall 2) | Z44, D4, D5, AF-D2, AF-O1b |
| 35 | Import ungültiger `align`-Wert `"foo"` (Grenzfall 15) | D11, O7 |

### Verdachtsmomente (Anforderung Abschnitt 7) → Einstufung in diesem Plan

| # | Verdachtsmoment (Anforderung §7) | Einstufung | Testfall(e) |
|---|---|---|---|
| 7.1 | `setAlign`-`RangeError` (Mehrfachabsatz) — höchste Priorität | Bestätigt **und verschärft**: kein Undo-Granularitätsproblem, sondern harter `RangeError`-Crash, nur erster Block zentriert | Z3, Z4, Z22, Z41, Z43, C2, C3, C10 |
| 7.2 | Formatvorlagen-Wechsel setzt Zentrierung auf „links" | Bestätigt (Zeile 43 `align:'left'`) | Z10–Z12, C6–C8, D9, O5 |
| 7.3 | Kein Import stil-/geerbter Zentrierung | Bestätigt, real reproduzierbar mit `bug-paragraph-alignment.docx` | Z28, Z30, D1, O1, O6, AF-D1 |
| 7.4 | Unvollständige `jc`-/`text-align`-Wertetabelle | Bestätigt, real reproduzierbar mit `rtl.docx` | Z31, Z44, D4, D5, O2, AF-D2, AF-O1b |
| 7.5 | `isAlignActive` nur aus `$from` | Bestätigt | Z8, C5 |
| 7.6 | Kein Enum/keine Validierung des `align`-Attributs | Bestätigt; Export-Fallback vorhanden, jetzt getestet | D11, O7 |
| 7.7 | Fehlendes `aria-label` am `AlignButton` | Bestätigt | Z37 |
| 7.8 | Title-Attribut zeigt internen englischen Bezeichner | Bestätigt | Z36 |
| 7.9 | Icon-Rendering / `↔`-Mehrdeutigkeit | Bestätigt (dokumentierend) | Z39 |
| 7.10 | Kein Tastenkürzel | Bestätigt; Entscheidung Code-Plan §5 (9.6): `Mod-e` wird ergänzt | Z40, Z38 |
| 7.11 | Kein Test ruft `setAlign` auf | Bestätigt; wird durch `alignment.spec.ts` behoben (Button-Klick löst `setAlign` aus) | Gesamter Abschnitt 3 (v. a. Z1, Z3, Z10) |

---

## 5. Erwarteter Ist-Status je neuem Testfall (vor Umsetzung von `ausrichtung-zentriert-code.md`)

| Status | Testfälle | Grund |
|---|---|---|
| **Erwartet ROT** (dokumentiert bestätigten Bug) | C2, C3 (blockiert), C4 (blockiert), C5, C6, C7, C8, C10 (blockiert), D1, D2 (blockiert), D4, D5, D9, O1, O2, O5, O6, AF-D1, AF-D2, AF-O1b, Z3, Z4 (blockiert), Z5 (blockiert), Z8, Z10, Z11, Z12, Z18, Z22 (blockiert), Z28, Z29 (teilweise), Z30, Z31, Z36 (gegen Zielzustand), Z37, Z38, Z40, Z41 (blockiert), Z43 (blockiert), Z44 (teilweise) | Fehler 1–7/9 und Verdachtsmomente 7.1–7.11 aus Abschnitt 0/`ausrichtung-zentriert-code.md` |
| **Erwartet GRÜN** (sollte mit aktuellem Code bereits bestehen) | C1, C9, D3, D6, D7, D8, D10, D11, O3, O4, O7, X1, X2, X3, AF-D1b, AF-D3, AF-D4, AF-O1, AF-O1c, AF-O2, Z1, Z2, Z6, Z7, Z9, Z13, Z15–Z17, Z19, Z20, Z21, Z23, Z24, Z32–Z35, Z42 | Basiert auf unverändertem, bereits funktionierendem Reader/Writer/Radio-Button-Grundverhalten (nicht von Fehler 1/2/4/5/9 betroffen) |
| **Blockiert/abhängig von vorherigem Fix** | C3, C4, C10, D2, Z4, Z5, Z14 (Fixture fehlt), Z22, Z41, Z43, Z25/Z26 (UI-Cross-Format) | Kann erst sinnvoll geprüft werden, nachdem der jeweils vorausgesetzte Fehler behoben bzw. das UI-Feature/die Fixture vorhanden ist |
| **Dokumentierend, kein Pass/Fail** | AF-D3, AF-D4, AF-O2 (Fixture-Eignung), Z39 (Icon) | Reine Feststellung, kein Bug |

Sobald `ausrichtung-zentriert-code.md` Abschnitt 4 (Fixes) umgesetzt ist, müssen
**alle** als ROT markierten Fälle von ROT auf GRÜN wechseln (inklusive der zuvor
blockierten Fälle, die dann erstmals ausführbar werden) — das ist der konkrete,
maschinell prüfbare Nachweis, dass die Fixes wirken, nicht nur Code-Review.

---

## 6. Abgleich mit Abnahmekriterien (`ausrichtung-zentriert-req.md` Abschnitt 10)

| DoD-Punkt (Anforderung §10) | Abdeckung in diesem Testplan |
|---|---|
| 1. Kernfehler 3.2 im Browser nachgestellt **und** behoben, inkl. Regressionstest (TF 3/4) + Mehrfachabsatz-Rundreise (TF 32) | C2, C3, Z3, Z4 (Nachstellung/Regression); Z43, D6/D7 (Mehrfachabsatz-Rundreise) |
| 2. Alle Testfälle aus §8 real ausgeführt und dokumentiert | Abschnitt 3 (Z1–Z44) + Abschnitt 2 (C/D/O/AF/X) + Traceability-Matrix Abschnitt 4 |
| 3. Jedes Verdachtsmoment aus §7 explizit eingestuft (bestätigt+behoben / bewusst dokumentiert / widerlegt) | Abschnitt 4, Tabelle „Verdachtsmomente" (alle 11) |
| 4. Alle offenen Entscheidungen aus §9 getroffen/umgesetzt/nachgetragen | Verifiziert über Z40 (Kürzel 9.6), Z36/Z37 (Tooltip/`aria-label` 9.7), Z8/C5 (`aria-pressed` gemischt 9.5), D4/O2 (`start`/`end` 9.4), D1/O1 (Stil-Import 9.3), C3/C4 (eine Transaktion 9.1), C6–C8 (Formatvorlage 9.2) |
| 5. Mind. 1 E2E-Test klickt den Button (`setAlign`), inkl. Formatvorlagen-Wechsel-Regressionstest (TF 11) | `alignment.spec.ts`: Z1 (Grundtest), Z3 (Mehrfach), Z10–Z12 (Formatvorlagen-Wechsel) |
| 6. Rundreise DOCX+ODT, Cross-Format, Tabellenzellen, Listen, je 1 reale Datei (TF 26/27), unabhängiger Parser (TF 30) | Z23–Z35, D6/D7/O3 (Tabellen/Listen), X1–X3 (Cross-Format-Datenmodell), Z28/Z29 (reale Fixtures, korrigierter Kandidat), Z28/Z29 DOMParser (unabhängiger Parser) |

---

## 7. Ausführungsreihenfolge (Vorschlag)

1. **`commands.test.ts`** (C1–C10, ergänzen) zuerst schreiben und bewusst rot laufen
   lassen (C2, C5, C6–C8) — schneller, browserunabhängiger Ausgangsnachweis, dass die
   Fehler 1/2/4 real und reproduzierbar sind, bevor irgendetwas gefixt wird.
2. `alignment.spec.ts` Z1–Z8 (Grundbedienung, kritischer Mehrabsatz-Test Z3/Z4/Z5,
   Zustandsanzeige) — deckt Fehler 1/4/5 sichtbar im Browser auf.
3. `alignment.spec.ts` Z9–Z12 (Formatvorlagen-Wechsel) — deckt Fehler 2 auf.
4. `roundtrip.test.ts`-Erweiterungen (D1–D11, O1–O7) + `alignment-fixtures.test.ts`
   (AF-D1–AF-D4, AF-O1–AF-O2) — deckt Fehler 3/6/7 sowie die Fixture-Korrektur
   (Fehler 8) und Grenzfall 15 (D11/O7) ab.
5. `alignment.spec.ts` Z13–Z35, Z43, Z44 (Tabellen, Listen, Kombination, Rundreisen,
   reale Fixtures, Mehrfachabsatz-Rundreise) + `cross-format-roundtrip.test.ts`
   (X1–X3).
6. `alignment.spec.ts` Z36–Z42 (Tooltip/`aria-label`/Icon/Tastenkürzel/Performance)
   — abschließende Politur- und Robustheitsprüfungen.
7. **Nach Umsetzung von `ausrichtung-zentriert-code.md`:** alle als ROT markierten
   Fälle erneut ausführen, Statuswechsel auf GRÜN dokumentieren;
   `selection-regression.spec.ts` **und** `roundtrip-fidelity.spec.ts` zusätzlich
   erneut laufen lassen (Abschnitt 3.3), um sicherzustellen, dass der bestehende
   Regressionsschutz durch die Ausrichtungs-Fixes nicht beschädigt wurde.
8. Titeltext-Migration durchführen (Abschnitt 1, Selektor-Vorbehalt): alle
   `getByTitle('Ausrichtung: center'/'left'/'right'/'justify')`-Aufrufe auf die
   deutschen Titel migrieren, sobald Code-Plan §4.2 umgesetzt ist.
9. Traceability-Matrix (Abschnitt 4) und DoD-Abgleich (Abschnitt 6) final
   gegenprüfen, bevor der Backlog-Status auf „verifiziert" geändert wird.

---

## 8. Offene Punkte für QA

- **Z14 (verbundene Tabellenzelle) ist aktuell nicht ausführbar:** Es existiert keine
  Toolbar-Funktion zum Verbinden von Zellen (`Toolbar.tsx` enthält keinen „Zellen
  verbinden"-Button, per Volltextsuche bestätigt in Abschnitt 0). Vor
  Testimplementierung muss entweder (a) eine handgebaute DOCX-/ODT-Fixture mit
  bereits verbundener Zelle gebaut werden (analog `buildSampleDocx()`-Muster, mit
  `<w:gridSpan>`/`<w:vMerge>` bzw. ODT-Äquivalent), oder (b) geklärt werden, ob dieser
  Testfall bis zur Umsetzung von `zellen-verbinden-req.md` als „nicht end-to-end über
  die Oberfläche testbar, nur auf Reader/Writer-Ebene" vermerkt wird (analog
  Grenzfall 12, Kopf-/Fußzeile).
- **Z25/Z26/Z27 (UI-Cross-Format-Export)** hängen davon ab, ob die UI überhaupt einen
  Formatwechsel beim Export erlaubt. `tests/e2e/roundtrip-fidelity.spec.ts` führt beide
  Cross-Format-Richtungen aktuell bewusst als `test.skip` („blocked on backlog slug
  speichern-unter-format"). Bis dieses Feature existiert, sind die UI-Testfälle 24/25
  **nicht** über die Oberfläche durchführbar; die Datenmodell-Abdeckung (X1–X3) bleibt
  der verbindliche Nachweis, die UI-Variante wird mit sichtbarer Begründung
  zurückgestellt (an der laufenden App vor Testimplementierung erneut verifizieren).
- **Z18/Z29 (Clipboard-Paste- bzw. Fixture-Interaktion)** können je nach Playwright-/
  Browser-Version und CI-Sandbox-Einstellungen für Zwischenablage-Berechtigungen
  instabil sein. Für `alignment.spec.ts` greifen die Clipboard-Permissions **nur** auf
  Desktop Chrome und Mobile (siehe `playwright.config.ts` — Tablet/iPad Mini hat keine
  Clipboard-Permission); Z18 daher primär auf Desktop Chrome absichern und einen
  Fallback auf ein synthetisches, aber echtes `ClipboardEvent`/`DataTransfer`-Konstrukt
  im Seitenkontext vorsehen, falls direkte OS-Zwischenablage-Interaktion in CI
  blockiert wird.
- **Z39 (Icon-Screenshot)** und **Z36 (Tooltip-Zielzustand)** hängen von den in
  `ausrichtung-zentriert-code.md` Abschnitt 4.2/5 getroffenen Design-Entscheidungen ab
  (deutscher `title` via `ALIGN_LABELS`, Inline-SVG-Zentrier-Icon nur für `center`);
  Endergebnis ist nach Umsetzung sowohl hier als auch in
  `ausrichtung-zentriert-req.md` Abschnitt 9 nachzutragen.
- **Kopf-/Fußzeile (Grenzfall 12 der Anforderung):** bestätigt **nicht** end-to-end
  über die Oberfläche testbar (kein UI-Zugriff auf `header`/`footer` gefunden, siehe
  Abschnitt 0) — muss ausschließlich auf Datenmodell-/Reader-/Writer-Ebene (direkt
  konstruierte `header`/`footer`-Inhalte, außerhalb dieses Plans, siehe
  `kopfzeile-bearbeiten-req.md`/`fusszeile-bearbeiten-req.md`) geprüft werden, sobald
  diese Features existieren.
