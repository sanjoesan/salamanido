# QA-Testplan: Feature „Ausrichtung rechts"

Rolle: QA-Antwort auf `specs/ausrichtung-rechts-req.md` (Anforderung) und
`specs/ausrichtung-rechts-code.md` (Entwicklerplan). Dieses Dokument nimmt
**keinen** der beiden Vorgängertexte als bewiesen an — `ausrichtung-rechts-code.md`
ist laut eigenem Titel ein *Plan* („dateigenauer Umsetzungsplan"), keine
verifizierte Umsetzung. Abschnitt 0 prüft die wichtigsten Codebehauptungen beider
Dokumente direkt am aktuellen Stand von `E:\docs\src` nach, statt sie zu
übernehmen. Ergebnis ist ein **Testplan**, kein Testbericht: die hier aufgeführten
Testfälle sind zum jetzigen Zeitpunkt größtenteils **noch nicht geschrieben**
(Ausnahme: die bereits bestehenden Basis-Roundtrip-Tests, siehe 2.1).

Stil/Gliederung orientiert an `specs/fett-qa.md` (methodisch nächstverwandter,
bereits vorliegender QA-Plan für dasselbe Repo).

---

## 0. Stichprobenprüfung des Ist-Codes (QA-Gegenkontrolle)

Bevor der Plan aufgestellt wird, wurden die zentralen Codebehauptungen aus
`ausrichtung-rechts-req.md`/`-code.md` direkt an den genannten Dateien
nachvollzogen (nicht nur aus den Dokumenten übernommen):

| Behauptung | QA-Gegenkontrolle | Ergebnis |
|---|---|---|
| `isAlignActive` wertet nur `$from` aus | `src/formats/shared/editor/commands.ts:29-38` gelesen | **Bestätigt**, Zeile für Zeile identisch zum in beiden Dokumenten zitierten Code. |
| `setAlign` iteriert `nodesBetween`, unbedingtes Setzen | `commands.ts:13-27` gelesen | **Bestätigt.** |
| `setHeading` erzwingt `align: 'left'` bzw. verwirft auf `undefined` | `commands.ts:40-55` gelesen | **Bestätigt**, Zeile 43: `const attrs = level === null ? undefined : { level, align: 'left' }`. |
| `Toolbar.tsx`: `title={\`Ausrichtung: ${align}\`}`, kein `aria-label` an `AlignButton` | `src/formats/shared/editor/Toolbar.tsx:69-70` gelesen und mit `MarkButton` (Zeile 46-48, hat **beide** Attribute) verglichen | **Bestätigt.** `AlignButton` hat nur `title`, keinen `aria-label` — Inkonsistenz zu `MarkButton` real vorhanden, nicht nur behauptet. |
| `WordEditor.tsx`: kein Tastenkürzel für Ausrichtung, nur Undo/Redo/Fett/Kursiv/Unterstrichen | `src/formats/shared/editor/WordEditor.tsx:71-79` gelesen | **Bestätigt.** Keymap enthält exakt `Mod-z`, `Mod-y`, `Mod-Shift-z`, `Enter`, `Mod-b`, `Mod-i`, `Mod-u` — kein `Mod-r`. |
| `docx/reader.ts`: `JC_TO_ALIGN` ohne `start`/`end` | `src/formats/docx/reader.ts:13,151-152` gelesen | **Bestätigt.** `{ left, center, right, both }`, Fallback `?? 'left'`. |
| `odt/reader.ts`: `paragraphAligns` roh, keine `office:styles`/`parent-style-name`-Auflösung | `src/formats/odt/reader.ts:24,38-65,126,173` gelesen | **Bestätigt.** Rohwert wird unverändert per `paragraphAligns.set(name, align)` übernommen; Aufrufstellen nutzen nur `(styleName && styles.paragraphAligns.get(styleName)) || 'left'` — keine Kette. |
| `docx/writer.ts`/`odt/writer.ts`: Export-Fallback bei ungültigem `align` bereits korrekt | `docx/writer.ts:16,68`, `odt/writer.ts:64-65`, `styleRegistry.ts:61-66` gelesen | **Bestätigt für Absätze** — `JC_BY_ALIGN[align] ?? 'left'` bzw. `PARAGRAPH_ALIGN_STYLE_NAME[align] ?? PARAGRAPH_ALIGN_STYLE_NAME.left`. |
| `schema.ts`: `validate: 'string'`, kein Enum, kein `sanitizeAlign` | `src/formats/shared/schema.ts:4` gelesen | **Bestätigt.** Weder `ALIGN_VALUES` noch `sanitizeAlign` existieren aktuell im Schema — `ausrichtung-rechts-code.md` Abschnitt 3.8/3.9 ist vollständig **ungebaut**. |
| Fixture-Dateien (`60329.docx`, `rtl.docx`, `bug-paragraph-alignment.docx`, `invalid.odt`, `excelfileformat.odt`, `table-within-textBox-within-frame.odt`) existieren wie benannt | `Glob` gegen `tests/fixtures/external/{docx,odt}` | **Bestätigt**, alle sechs Dateien vorhanden. |
| `tests/e2e/*.spec.ts` enthält noch keinen dedizierten Ausrichtungs-Test | `Glob` gegen `tests/e2e` | **Bestätigt.** Nur `docx.spec.ts`, `odt.spec.ts`, `selection-regression.spec.ts`, `lifecycle.spec.ts` vorhanden — keine `align-right.spec.ts`. |

**Zusätzlicher QA-Fund, in keinem der beiden Vorgängerdokumente benannt:**
`src/formats/odt/styleRegistry.ts:80-93` — `headingStyleName(level, align)` baut den
Stilnamen per Template-String direkt aus dem rohen `align`-Wert
(`` `Heading${level}-${align}` ``), **ohne** die gleiche Absicherung, die
`blockToOdt` für Absätze bereits hat (`PARAGRAPH_ALIGN_STYLE_NAME[align] ??
PARAGRAPH_ALIGN_STYLE_NAME.left`, `odt/writer.ts:65`). `headingStyleDefs()`
erzeugt nur Stile für die vier bekannten Werte (`ALIGNS`-Konstante). Ein
korrupter/ungültiger `align`-Wert (Grenzfall 13) auf einer **Überschrift** würde
also `text:style-name="Heading{level}-foo"` referenzieren — einen Stilnamen, der
in `content.xml`/`styles.xml` **nirgends deklariert ist** (nur `Heading1-left`,
`Heading1-center`, `Heading1-right`, `Heading1-justify` usw. existieren). Das ist
dieselbe Fehlerklasse wie Testfall 36/Grenzfall 13, aber für Überschriften **nicht**
durch den in `ausrichtung-rechts-code.md` Abschnitt 5.1 vorgeschlagenen ODT-Writer-Test
(der nur einen Absatz prüft) abgedeckt. Wird unten als eigener Testfall O9 geführt
und muss vor Abnahme entweder als „bestätigter zusätzlicher Bug, zu beheben" oder
„bewusst hingenommen, weil in der Praxis unerreichbar" eingestuft werden — siehe
Abschnitt 8.

Konsequenz für diesen Testplan: **Kein** einziger der von `ausrichtung-rechts-code.md`
beschriebenen Fixes ist im aktuellen Code umgesetzt. Alle unten als „aktuell ROT
erwartet" markierten Testfälle sind also zum jetzigen Zeitpunkt echte,
reproduzierbare Bugs/Lücken, nicht hypothetische Grenzfälle.

---

## 1. Testumgebung

- Unit-Tests: `npm test` (Vitest, `jsdom`-Environment).
- E2E-Tests: `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `baseURL: 'http://localhost:4173/salamanido/'`, `webServer` baut
    (`npm run build`) und startet `vite preview` automatisch.
  - Drei Projekte: **Desktop Chrome**, **Mobile** (`Pixel 7`), **Tablet**
    (`iPad Mini`) — jeder neue Testfall muss in **allen drei** grün sein, sofern
    er nicht explizit auf Tastatur-only-Bedienung angewiesen ist (siehe 3.7).
- Bestehende Konventionen (aus `docx.spec.ts`/`odt.spec.ts`/
  `selection-regression.spec.ts` übernommen, beizubehalten):
  - `page.goto('/')` → Privacy-Banner wegklicken:
    `page.getByRole('button', { name: /verstanden/i }).click()`.
  - Karten-Locator: `docxCard(page)`/`odtCard(page)` über
    `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: '...' }) })`.
  - Editor-Locator: `page.locator('.ProseMirror')`.
  - Export: `page.getByRole('button', { name: 'Exportieren' })` +
    `page.waitForEvent('download')`.
- **Wichtiger, in `ausrichtung-rechts-code.md` implizit vorausgesetzter, aber
  aktuell falscher Zustand:** Der Code-Plan schreibt seine Beispiel-Tests bereits
  gegen `page.getByTitle('Ausrichtung: rechts')` — das ist der **Soll**-Zustand
  **nach** dem Tooltip-Fix (Abschnitt 3.7 dort). Solange dieser Fix nicht gebaut
  ist, muss jeder neu geschriebene Testfall gegen den **aktuellen** Titel
  `page.getByTitle('Ausrichtung: right')` laufen (Codebeleg: Abschnitt 0 oben).
  Testfall P32 (Abschnitt 3.12) hält exakt diesen Übergang fest. Alle übrigen
  Testfälle in Abschnitt 3 werden daher mit einer **Locator-Konstante**
  geschrieben (`const rightAlignButton = () => page.getByTitle(/Ausrichtung:\s*(right|rechts)\b/)`),
  damit sie unabhängig vom Umsetzungsstand des Tooltip-Fixes lauffähig sind und
  nicht wegen einer reinen Text-Umbenennung reihenweise brechen.

---

## 2. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

**Zweck:** Schnelle, browserunabhängige Absicherung der Datenebene
(`align`-Attribut ⇄ `<w:jc>`/`fo:text-align`). Getestet werden ausschließlich
`writeDocx`/`readDocx`/`writeOdt`/`readOdt` sowie die reine Editor-Logik
(`isAlignActive`/`setHeading` gegen ein synthetisches `EditorState`, **ohne**
DOM/Browser) und `sanitizeAlign`. **Keine** Playwright-Interaktion in diesem Teil.

### 2.1 Bestandsaufnahme (bereits vorhanden, als Basisschutz zu erhalten)

| Datei | Test | Deckt ab |
|---|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts:41-45` | „preserves heading alignment" (nur `center`, isolierter Absatz) | Anforderung 4.1.5 (Grundfall, nicht die Bold-Kombination) |
| `src/formats/docx/__tests__/roundtrip.test.ts:48-53` | `it.each(['left','center','right','justify'])` „preserves alignment", isolierter Absatz | Anforderung 4.1 (Grundfall) |
| `src/formats/odt/__tests__/roundtrip.test.ts:48-53` | analog | Anforderung 4.2 (Grundfall) |
| `src/formats/*/__tests__/external-fixtures.test.ts` | Import von Fremddateien, bisher **kein** Treffer für „align" (durch `Grep` bestätigt, siehe Anforderung Fundstellentabelle) | Kein Beitrag zur Ausrichtungsabdeckung — muss ergänzt werden (siehe 2.4) |

Diese Tests bleiben unverändert Teil der Suite; sie werden **nicht** ersetzt,
sondern ergänzt.

### 2.2 Neue Datei: `src/formats/docx/__tests__/align-right.test.ts`

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status jetzt | Bezug |
|---|---|---|---|---|---|
| D1 | `<w:jc w:val="right"/>` → `right` | Hand-gebautes Mini-DOCX (per JSZip, wie `docx.spec.ts` `buildSampleDocx()`), ein Absatz mit `<w:jc w:val="right"/>` | `align === 'right'` | GRÜN | Baseline |
| D2 | `<w:jc w:val="start"/>` → `left` | dito mit `start` | `align === 'left'` | GRÜN (zufällig bereits richtig — Fallback `?? 'left'` trifft ohnehin) | Grenzfall 6 |
| D3 | `<w:jc w:val="end"/>` → **erwartet `right`** | dito mit `end` (im realen Korpus laut `ausrichtung-rechts-code.md` Abschnitt 6.1 auf Absatzebene **nicht** vorhanden — Wert ist aber gültiges OOXML, siehe OOXML-Schema `ST_Jc`) | `align === 'right'` | **ROT** — aktueller Code liefert `'left'` (kein Eintrag in `JC_TO_ALIGN`, Fallback greift) | Grenzfall 6/Verdachtsmoment 1, Testfall 25 |
| D4 | `<w:jc w:val="distribute"/>` → `left`, kein Absturz | dito mit `distribute` | `align === 'left'`, kein Wurf | GRÜN (dokumentierter Fallback bereits vorhanden) | Grenzfall 7, Testfall 36 |
| D5 | Reale Datei `rtl.docx`: `w:jc="start"` auf arabischem Fließtext | `readDocx` auf die echte Fixture | Alle betroffenen Absätze `align === 'left'` (dokumentierte, akzeptierte RTL-Einschränkung — **kein** Bug-Test), **und** arabischer Text (`إسبانيا`) bleibt vollständig im Modell erhalten | GRÜN (Text-Erhalt ist das eigentlich scharfe Kriterium hier) | Grenzfall 6/Testfall 25, Abschnitt 3.1.1 des Codeplans |
| D6 | Reale Datei `bug-paragraph-alignment.docx`: Absatz ohne eigenes `<w:jc>`, Stil „Title" deklariert `jc="center"` | `readDocx` auf die echte Fixture, den Absatz mit Text „This paragraph does not have explicit alignment…" identifizieren | `align === 'center'` | **ROT** — aktueller Code liest `w:pStyle` beim Ausrichtungs-Fallback nicht, Ergebnis ist `'left'` | Grenzfall 9/Verdachtsmoment 3, Testfall 27 |
| D7 | Hand-gebaute zweistufige `w:basedOn`-Kette (Stil A hat `jc="right"`, Stil B ist `basedOn` A, Absatz referenziert nur B) | JSZip-`styles.xml` + `document.xml` | `align === 'right'` | **ROT** (Feature existiert noch nicht) | Grenzfall 9 (Tiefenfall) |
| D8 | Eigenes `<w:jc>` am Absatz gewinnt immer über die Formatvorlage | Absatz mit `w:pStyle` **und** eigenem `<w:jc w:val="right"/>`, Stil deklariert `center` | `align === 'right'` | GRÜN (trivial, da aktueller Code Formatvorlagen ohnehin ignoriert — muss aber **nach** Fix D6/D7 weiterhin grün bleiben, Regressionsnetz) | Konsistenzprüfung |
| D9 | Writer: ungültiger/korrupter `align`-Wert (`"foo"`) | `WordDocumentContent` mit `attrs: { align: 'foo' }` → `writeDocx` | Export enthält `<w:jc w:val="left"/>`, kein Wurf, kein invalides XML | GRÜN (Fallback bereits im Code vorhanden, siehe Abschnitt 0) | Grenzfall 13, Testfall 36 |

### 2.3 Neue Datei: `src/formats/odt/__tests__/align-right.test.ts`

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status jetzt | Bezug |
|---|---|---|---|---|---|
| O1 | `fo:text-align="right"` → `right` | Hand-gebautes Mini-ODT oder Writer-Rundreise | `align === 'right'` | GRÜN | Baseline |
| O2 | `fo:text-align="start"` → **erwartet `left`** | Automatischer Stil mit `fo:text-align="start"`, Absatz referenziert ihn | `align === 'left'` | **ROT** — aktueller Code übernimmt den Rohwert `"start"` unverändert in `paragraphAligns`, das Modell trägt dann `align: 'start'` statt `'left'` | Grenzfall 8/Verdachtsmoment 2 |
| O3 | Reale Datei `excelfileformat.odt`: `fo:text-align="end"` (21×) → **erwartet `right`** | `readOdt` auf die echte Fixture, alle vorkommenden `align`-Werte im Baum sammeln | Menge der gefundenen `align`-Werte ist Teilmenge von `{left,center,right,justify}` **und** enthält `'right'` | **ROT** — aktuell landet der Rohwert `"end"` unnormalisiert im Modell; keiner der vier bekannten Werte, **kein** `AlignButton` würde „aktiv" anzeigen | Grenzfall 8/Verdachtsmoment 2, Testfall 26 |
| O4 | Reale Datei `table-within-textBox-within-frame.odt`: Absatz mit Text „SOW", Stil „P74" ohne eigenes `fo:text-align`, Elternstil „Subtitle" (in `styles.xml`/`office:styles`) mit `fo:text-align="end"` | `readOdt` auf die echte Fixture, Absatz mit Text „SOW" finden | `align === 'right'` (kombiniert Grenzfall 8 **und** 9) | **ROT** — aktueller Code löst weder die Vererbungskette noch `office:styles` auf; Ergebnis ist `'left'` | Grenzfall 8+9/Verdachtsmoment 2+3, Testfall 26+27 |
| O5 | Hand-gebaute zweistufige `style:parent-style-name`-Kette | Synthetisches ODT | `align` korrekt aufgelöst | **ROT** (Feature existiert noch nicht) | Grenzfall 9 (Tiefenfall) |
| O6 | Eigenes `fo:text-align` am direkt referenzierten Stil gewinnt immer über einen geerbten Wert | Absatz-Stil mit eigenem `fo:text-align="left"` **und** Elternstil mit `"right"` | `align === 'left'` | GRÜN (trivial vor Fix, **muss** nach Fix weiter grün bleiben — Regressionsnetz, besonders relevant weil der **eigene** Writer dieser App **immer** einen direkten `fo:text-align` je erzeugtem Stil schreibt) | Konsistenzprüfung |
| O7 | Zwei Absätze mit `align: 'right'` im selben Dokument → **eine** gemeinsame Stildefinition | `writeOdt` mit zwei `right`-Absätzen, `content.xml` parsen: Anzahl `<style:style ... style:name="Ppara-right">` **== 1**, beide `<text:p>` referenzieren denselben Namen | Dedupliziert wie von `PARAGRAPH_ALIGN_STYLE_NAME` (fester Name je Wert) strukturell garantiert | GRÜN | Rundreise 4.2.3 |
| O8 | Writer: ungültiger `align`-Wert (`"foo"`) auf einem **Absatz** | `attrs: { align: 'foo' }` → `writeOdt` | `content.xml` referenziert `text:style-name="Ppara-left"`, kein Wurf | GRÜN (Fallback bereits vorhanden) | Grenzfall 13, Testfall 36 |
| O9 | **Neuer QA-Fund (Abschnitt 0):** Writer: ungültiger `align`-Wert (`"foo"`) auf einer **Überschrift** | `{ type: 'heading', attrs: { level: 1, align: 'foo' } }` → `writeOdt` → `content.xml` **und** die Menge aller in `content.xml` per `headingStyleDefs()` tatsächlich deklarierten `style:name`-Werte parsen | Der von `<text:h>` referenzierte `text:style-name` **muss** unter den tatsächlich deklarierten Stilen sein (kein dangling Reference wie `Heading1-foo`) | **ROT** — `headingStyleName(level, align)` hat keinen Fallback, erzeugt `"Heading1-foo"`, das nirgends definiert ist | Grenzfall 13/Testfall 36, **nicht** in `ausrichtung-rechts-code.md` behandelt — siehe Abschnitt 8 |

### 2.4 Erweiterung — `src/formats/docx/__tests__/roundtrip.test.ts` und `src/formats/odt/__tests__/roundtrip.test.ts`

Bisher wird Ausrichtung nur an **isolierten Einzelabsätzen** getestet (Fundstelle
„Unit-/Roundtrip-Tests" der Anforderung). Neue, je Datei gleich aufgebaute Fälle:

| # | Testfall | Vorgehen | Erwartung | Bezug |
|---|---|---|---|---|
| R1 | Rechtsbündige Überschrift **kombiniert mit Fett** | Heading Level 2, `align: 'right'`, Text-Node mit `marks: [{type:'strong'}]` → Rundreise | `align === 'right'` **und** `level === 2` **und** `marks` enthält `strong` — alle drei gleichzeitig, nicht nur je einzeln getestet wie bisher | Rundreise 4.1.5 |
| R2 | Rechtsbündiger Absatz in einer Tabellenzelle, Nachbarzelle links | Tabelle mit zwei Zellen, unterschiedliche Ausrichtung | Zelle 1 `align === 'right'`, Zelle 2 `align === 'left'` (keine Kreuzkontamination) | Rundreise 4.1.6/4.2.5 |
| R3 | Rechtsbündiger Listenpunkt, Bullet **und** nummeriert | `bullet_list`/`ordered_list` je mit `align: 'right'`-Paragraph im `list_item` | Beide behalten `align === 'right'` **und** ihre Listenzugehörigkeit | Rundreise 4.1.7/4.2.6 |
| R4 | Rechtsbündiger Absatz mit `hard_break` | Ein Paragraph, `align: 'right'`, Text — `hard_break` — Text | `align === 'right'` für den **gesamten** Absatz, `hard_break` bleibt erhalten, Textinhalt beider Seiten vollständig | Rundreise 4.1.4, Grenzfall 4 |

### 2.5 Neue Datei: `src/formats/shared/editor/__tests__/commands.test.ts`

Reine Logik-Tests **ohne** Browser/DOM, direkt gegen `EditorState` aus
`prosemirror-state` — testet exakt das, was Playwright später nur indirekt über
`aria-pressed`/CSS beobachten kann, aber schneller und ohne UI-Rauschen:

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status jetzt | Bezug |
|---|---|---|---|---|---|
| C1 | `isAlignActive` bei kollabiertem Cursor in bereits rechtsbündigem Absatz | Ein-Absatz-Doc, `align:'right'`, Cursor hinein, `isAlignActive(state,'right')` | `true` | GRÜN | Grundfall |
| C2 | `isAlignActive` bei gemischter Selektion, **erster** Absatz rechts, Rest nicht | Drei-Absatz-Doc (`right`,`left`,`center`), Selektion über alle drei, `isAlignActive(state,'right')` | **Soll:** `false` (nicht alle betroffenen Absätze sind rechtsbündig) | **ROT** — aktueller Code liest nur `$from`, liefert `true`, obwohl 2 von 3 Absätzen **nicht** rechtsbündig sind. Das ist der in Grenzfall 1/Verdachtsmoment 5 beschriebene irreführende Zustand, hier erstmals **reproduzierbar isoliert** (nicht nur aus dem Code abgeleitet) | Grenzfall 1/Verdachtsmoment 5, Testfall 7 |
| C3 | `isAlignActive` bei `AllSelection` (Strg+A) über gemischte Ausrichtung | Zwei-Absatz-Doc (`right`,`left`), `AllSelection`, `isAlignActive(state,'right')` | **Soll:** `false` | **ROT** (analog C2, je nachdem wo `$from` bei `AllSelection` landet — muss empirisch mit dem echten `EditorState` bestätigt werden, nicht angenommen) | Grenzfall 1, Testfall 4/7 |
| C4 | `isAlignActive`, wenn **alle** betroffenen Absätze bereits rechtsbündig sind | Drei-Absatz-Doc, alle `right`, Selektion über alle | `true` | GRÜN (auch mit altem Code korrekt, da `$from` zufällig übereinstimmt) | Entscheidung Abschnitt 9.5 des Codeplans |
| C5 | `setAlign` und `isAlignActive` stimmen nach Anwendung überein (Regressionsnetz) | Gemischte Selektion → `isAlignActive` vorher `false` → `setAlign('right')` anwenden → `isAlignActive` danach `true` | Beide Zustände wie erwartet | Teil **ROT** (der Vorher-Zustand hängt an C2/C3) | Konsistenzprüfung |
| C6 | `setHeading`: rechtsbündiger Standard-Absatz → Überschrift 1 | Ein-Absatz-Doc `align:'right'`, `setHeading(1)` anwenden | `type === 'heading'`, `level === 1`, **`align === 'right'`** (nicht `'left'`) | **ROT** — aktueller Code erzwingt `align: 'left'` fest (`commands.ts:43`) | Grenzfall 5/Verdachtsmoment 4, Testfall 11 |
| C7 | `setHeading`: rechtsbündige Überschrift 1 → Standard | Heading-Doc `align:'right'`, `setHeading(null)` anwenden | `type === 'paragraph'`, **`align === 'right'`** (nicht Schema-Default `'left'`) | **ROT** — `attrs: undefined` verwirft die Ausrichtung, Schema-Default greift (`schema.ts:4`) | Grenzfall 5/Verdachtsmoment 4, Testfall 12 |

### 2.6 Neue Datei: `src/formats/shared/__tests__/schema.test.ts`

| # | Testfall | Erwartung | Erwarteter Status jetzt | Bezug |
|---|---|---|---|---|
| S1 | `sanitizeAlign('right')` etc. für alle vier gültigen Werte | Wert unverändert durchgereicht | **BLOCKIERT/ROT** — `sanitizeAlign` existiert im aktuellen `schema.ts` **nicht** (Abschnitt 0 bestätigt), der Test kann nicht einmal kompilieren, bis die Funktion gebaut ist | Grenzfall 13/Verdachtsmoment 8 |
| S2 | `sanitizeAlign('foo')`, `sanitizeAlign('start')`, `sanitizeAlign(null)`, `sanitizeAlign(undefined)`, `sanitizeAlign(123)`, `sanitizeAlign({})` | Fällt jeweils auf `'left'` zurück | **BLOCKIERT/ROT** (dito) | Grenzfall 13 |

### 2.7 Neue Datei: `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts`

Unit-Ebene für Anforderung 4.3, schneller als E2E, **ergänzt** — ersetzt nicht —
den Browser-Test in Abschnitt 3.8:

| # | Testfall | Vorgehen | Erwartung | Erwarteter Status jetzt |
|---|---|---|---|---|
| X1 | DOCX → ODT → DOCX, rechtsbündige Überschrift + Fett + Farbe | `readDocx(writeDocx(c))` → `readOdt(writeOdt(...))` → `readDocx(writeDocx(...))` | `align === 'right'` bleibt über beide Konvertierungen hinweg erhalten, ebenso `strong`-Mark und Farbe | GRÜN erwartet (reiner Absatz-Fall, keine Formatvorlagen-Abhängigkeit) |
| X2 | ODT → DOCX → ODT, spiegelbildlich | analog | analog | GRÜN erwartet |

---

## 3. Teil B — Echte Playwright-Browser-Tests

**Grundsatz (bindend für diesen Abschnitt, wörtlich aus dem Auftrag):** Kein
Testfall in Teil B darf durch direkten Aufruf interner Funktionen
(`setAlign(...)`, `isAlignActive(...)`, `readDocx(...)` etc.) im Node-Kontext
ersetzt werden. Jeder Testfall läuft über echte Nutzer:innen-Handlungen im
Browser: `locator.click()`, `page.keyboard.press(...)`/`.type(...)`,
`input.setInputFiles(...)` bzw. echtes `filechooser`-Event, sowie
`page.waitForEvent('download')` **plus** tatsächliches Einlesen und Parsen der
heruntergeladenen Datei vom Dateisystem (nicht nur „Download ist irgendeine
Datei").

### Neue Datei: `tests/e2e/align-right.spec.ts`

Gliederung nach den 36 Testfällen aus `ausrichtung-rechts-req.md` Abschnitt 7.

#### 3.1 Bedienung: Maus-Selektionsarten (Testfälle 1–3)

| # | Test | Schritte | Assertion | Erwarteter Status | Bezug |
|---|---|---|---|---|---|
| P1 | Maus-Selektion (Ziehen) + Toolbar-Klick | Text tippen, `ControlOrMeta+a`, rechts-Button klicken | `aria-pressed` → `true`, `editor.locator('p')` hat CSS `text-align: right` | GRÜN | Testfall 1 |
| P2 | Doppelklick (Wort) → **ganzer** Absatz rechtsbündig | Mehrwortsatz tippen, ein Wort per `dblclick()` selektieren, rechts-Button klicken | Ganzer `<p>` hat `text-align: right`, nicht nur das Wort (kein CSS-Konzept für Teil-Zeichen ohnehin, aber Assertion bestätigt **Block**-Charakter der Eigenschaft) | GRÜN | Testfall 2 |
| P3 | Dreifachklick (Absatz) | `click({ clickCount: 3 })` auf den Absatz, rechts-Button klicken | `text-align: right` | GRÜN | Testfall 3 |

#### 3.2 Cursor ohne Selektion (Testfälle 5–6)

| # | Test | Schritte | Assertion | Erwarteter Status | Bezug |
|---|---|---|---|---|---|
| P4 | Cursor ohne Selektion → gesamter Absatz | Cursor irgendwo im getippten Text platzieren (kein Shift/Drag), rechts-Button klicken | `text-align: right` auf dem **gesamten** `<p>` | GRÜN | Testfall 5 |
| P5 | Cursor in leerem Absatz | Neuer, leerer Absatz, rechts-Button klicken, danach tippen | Kein Konsolenfehler (`page.on('pageerror')` überwacht), neu getippter Text sichtbar `text-align: right` | GRÜN | Testfall 6, Grenzfall 3 |

#### 3.3 Mehrfachauswahl, gemischte Ausgangsausrichtung, Button-Zustand (Testfall 4/7 — Kernstück für Verdachtsmoment 5)

```ts
test('Testfall 7: gemischte Ausgangsausrichtung — Klick setzt alle rechtsbündig; Button-Zustand VOR dem Klick darf nicht faelschlich "aktiv" zeigen', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Erster Absatz')
  await rightAlignButton(page).click()          // erster Absatz jetzt rechts
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz')      // bleibt links (Default)
  await page.keyboard.press('ControlOrMeta+a')    // Selektion ueber BEIDE Absaetze

  // Kernaussage Grenzfall 1 / Verdachtsmoment 5: der erste Absatz IST rechts,
  // der zweite nicht -> Button darf NICHT "aktiv" anzeigen, sonst irrefuehrend.
  await expect(rightAlignButton(page)).toHaveAttribute('aria-pressed', 'false')

  await rightAlignButton(page).click()
  const paragraphs = editor.locator('p')
  await expect(paragraphs).toHaveCount(2)
  for (const p of await paragraphs.all()) await expect(p).toHaveCSS('text-align', 'right')
})
```

**Erwarteter Status jetzt: teilweise ROT.** Der zweite Teil (nach dem Klick sind
beide Absätze rechtsbündig) ist bereits grün — `setAlign` funktioniert korrekt.
Die `aria-pressed: 'false'`-Assertion **vor** dem Klick ist mit dem aktuellen
`isAlignActive` **nichtdeterministisch/potenziell rot**: Sie hängt an der
`$from`-Position, die je nach genauer Cursor-Semantik von „Strg+A" auf den
**ersten** Absatz (bereits rechtsbündig) zeigen kann — dann würde der Button
fälschlich `true` anzeigen. Muss beim ersten Testlauf empirisch bestätigt und das
Ergebnis hier nachgetragen werden (nicht nur aus C2/C3 in Abschnitt 2.5
übernommen, da Playwright echtes Browser-Verhalten von `ControlOrMeta+a` prüft,
das von der Unit-Test-Simulation abweichen könnte). Danach Regressionstest für
den Fix aus `ausrichtung-rechts-code.md` Abschnitt 3.5.

Zusätzlich, Testfall 4 (Regressionsmuster wie bei Fett/Durchgestrichen):

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| P6 | Nach Strg+A + rechts: Klick-Neupositionierung + Enter + Tippen | Nach P-Test oben: ans Ende des letzten Absatzes klicken, `Enter`, dritten Absatz tippen | 3 Absätze insgesamt, dritter Absatz-Text sichtbar, keine der ersten beiden Absätze durch die neue Eingabe beschädigt | Testfall 4, `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 |

#### 3.4 Umschalten zwischen vier Werten + Idempotenz (Testfälle 8–9)

| # | Test | Schritte | Assertion | Erwarteter Status | Bezug |
|---|---|---|---|---|---|
| P7 | rechts → zentriert → Blocksatz → links → rechts | Je Schritt Button klicken | Nach **jedem** Schritt: passendes `aria-pressed`/CSS | GRÜN (einheitliche Einzelabsatz-Selektion, `$from`-Logik funktioniert hier zufällig korrekt) | Testfall 8 |
| P8 | Erneuter Klick auf bereits aktives „rechts" | Zwei Klicks nacheinander auf denselben Button | Bleibt `text-align: right`, `aria-pressed: true`, keine Exception | GRÜN (Entscheidung 9.2 des Codeplans: bewusst idempotent, keine Code-Änderung nötig) | Testfall 9 |

#### 3.5 Kombination mit Zeichenformatierung (Testfall 10)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| P9 | Fett + Kursiv + Textfarbe gleichzeitig mit rechts | Text tippen, `ControlOrMeta+a`, Fett-, Kursiv-Button, Farbe setzen, rechts-Button | Alle vier Eigenschaften gleichzeitig sichtbar (`text-align: right`, `<strong>`/`<em>` vorhanden, `color` in `getComputedStyle`) | GRÜN |

#### 3.6 Absatzformat-Wechsel — Kernstück der bestätigten Bugs (Testfälle 11–12)

| # | Test | Schritte | Assertion | Erwarteter Status | Bezug |
|---|---|---|---|---|---|
| P10 | Rechtsbündigen Standard-Absatz zu „Überschrift 1" wechseln | Text tippen, `ControlOrMeta+a`, rechts-Button, `getByLabel('Absatzformat').selectOption('1')` | **Soll:** `h1` bleibt `text-align: right` | **ROT** — aktueller Code setzt beim Umschalten auf Heading unbedingt `align:'left'` (`commands.ts:43`), Absatz zeigt danach `text-align: left` | Grenzfall 5/Verdachtsmoment 4, Testfall 11 |
| P11 | Umgekehrt: rechtsbündige Überschrift zurück zu „Standard" | Heading anlegen, rechtsbündig setzen, `selectOption('normal')` | **Soll:** `<p>` bleibt `text-align: right` | **ROT** — `attrs: undefined` lässt den neuen Absatz auf Schema-Default `left` zurückfallen | Grenzfall 5/Verdachtsmoment 4, Testfall 12 |

Diese beiden Fälle sind die praktisch wichtigsten Befunde dieses gesamten Plans:
Ein alltäglicher Bedienschritt (erst Ausrichtung, dann Format wechseln oder
umgekehrt) zerstört heute nachweislich sichtbar die Nutzer:inneneingabe im echten
Browser — nicht nur auf Codeebene vermutet.

#### 3.7 Listen, Tabellen, hard_break (Testfälle 13–15)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| P12 | Rechtsbündig in Bullet-Liste | Aufzählung einfügen, Text tippen, `ControlOrMeta+a`, rechts-Button | `li p`/`li` hat `text-align: right`, Aufzählungszeichen unverändert an Position (visuell, `::marker`-Pseudoelement bleibt links außerhalb des Textflusses) | GRÜN |
| P13 | Rechtsbündig in nummerierter Liste | analog mit „Nummerierte Liste" | analog | GRÜN |
| P14 | Rechtsbündig in Tabellenzelle, keine Nebenwirkung auf Nachbarzelle | Tabelle einfügen, Zelle 1 rechtsbündig, Zelle 2 unverändert | Zelle 1: `text-align: right`; Zelle 2: **nicht** `right` | GRÜN |
| P15 | `hard_break` (Umschalt+Enter) im rechtsbündigen Absatz | Zwei Zeilen per `Shift+Enter` getrennt, ganzer Absatz rechtsbündig | `<p>` hat `text-align: right`, genau ein `<br>` im Absatz, **beide** Zeilen optisch rechtsbündig (Screenshot/Boundingbox-Vergleich beider Zeilen gegen den rechten Editorrand als zusätzliche, nicht nur CSS-Property-basierte Absicherung) | GRÜN |

#### 3.8 Undo/Redo (Testfälle 16–17)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| P16 | Undo direkt nach Anwenden stellt den **tatsächlichen** Vorwert wieder her (nicht pauschal „links") | Text tippen, zentriert setzen, dann rechts setzen, `ControlOrMeta+z` | Zurück zu `text-align: center` (nicht `left`) | GRÜN |
| P17 | Redo danach | `ControlOrMeta+y` | Wieder `text-align: right` | GRÜN |

#### 3.9 Rundreisen über echte Bedienung inkl. Prüfung der heruntergeladenen Datei (Testfälle 18–27, Anforderung Abschnitt 4)

**Diese Gruppe ist der praktische Kern des Auftrags** — jeder Test lädt eine
echte Datei hoch (über den sichtbaren Button + `filechooser`, nicht nur
`setInputFiles` auf den versteckten Input) bzw. exportiert und liest die
**tatsächlich heruntergeladene** Datei vom Dateisystem, geparst mit JSZip +
(wo strukturelle Prüfung nötig ist) einem vom eigenen Reader **unabhängigen**
DOM-Parser (`jsdom`s `DOMParser`, bereits Devdependency), nicht mit
`readDocx`/`readOdt` selbst.

```ts
test('Testfall 18/Rundreise 4.1.2: DOCX-Eigenrundreise ueber echte Bedienung, Downloadpruefung mit unabhaengigem Parser', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Rechtsbuendiger Text')
  await page.keyboard.press('ControlOrMeta+a')
  await rightAlignButton(page).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const exportedBuffer = await fs.readFile((await download.path())!)

  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(exportedBuffer)
  const documentXml = await zip.file('word/document.xml')!.async('text')

  // Strukturelle Pruefung mit unabhaengigem DOMParser statt reiner String-Suche
  // (Anforderung 4.1.3 verlangt "unabhaengigen Parser", nicht nur toContain):
  const { JSDOM } = await import('jsdom')
  const xmlDoc = new JSDOM('').window.DOMParser.prototype.constructor
    ? new (new JSDOM('')).window.DOMParser().parseFromString(documentXml, 'application/xml')
    : null
  const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
  const run = xmlDoc && [...xmlDoc.getElementsByTagNameNS(W_NS, 'r')].find((r) => r.textContent?.includes('Rechtsbuendiger'))
  const pPr = run?.parentElement?.getElementsByTagNameNS(W_NS, 'pPr')[0]
  const jc = pPr?.getElementsByTagNameNS(W_NS, 'jc')[0]
  expect(jc?.getAttributeNS(W_NS, 'val')).toBe('right')
})
```

| # | Test | Schritte (Kurzform) | Assertion | Erwarteter Status | Bezug |
|---|---|---|---|---|---|
| P18 | DOCX-Eigenrundreise | siehe Code-Block oben | `<w:jc w:val="right"/>` im richtigen `<w:pPr>`, struktureller Nachweis | GRÜN | Testfall 18, Rundreise 4.1.2 |
| P19 | ODT-Eigenrundreise | analog, `content.xml` prüfen: `<text:p>` referenziert einen Stil mit `fo:text-align="right"` | analog | GRÜN | Testfall 19, Rundreise 4.2.2 |
| P20 | Upload reale DOCX (`60329.docx`, unverändert) → Export → Reimport | **Echter** `filechooser`-Upload (Abschnitt 3.11), Text „Protocol No." muss rechtsbündig erscheinen, danach Export + Struktur-Check | Text und `text-align: right` identisch zum Original nach Rundreise | GRÜN | Testfall 23, Rundreise 4.1.1 |
| P21 | Upload reale ODT (`invalid.odt`, unverändert) → Export → Reimport | Text „hallo" muss rechtsbündig erscheinen | analog | GRÜN | Testfall 24, Rundreise 4.2.1 |
| P22 | Upload reale DOCX `rtl.docx` (`w:jc="start"` auf arabischem Text) | Upload, Editor zeigt arabischen Text vollständig, kein Absturz | Text `إسبانيا` sichtbar; Ausrichtung dokumentiert als `left` (akzeptierte RTL-Einschränkung, **kein** Fehlschlag) | GRÜN (dokumentierte Grenze, kein Bug-Test) | Testfall 25, Grenzfall 6/12 |
| P23 | Upload reale ODT `excelfileformat.odt` (`fo:text-align="end"`) | Upload, Absatz mit `end`-Stil im Editor identifizieren | **Soll:** `aria-pressed` des rechts-Buttons bei Cursor in diesem Absatz ist `true`, `text-align: right` im DOM | **ROT** — aktuell landet der Rohwert `"end"` unnormalisiert im Modell (Abschnitt 2.3, O3); der Button zeigt **keine** der vier Optionen aktiv, obwohl der Browser den unbekannten CSS-Wert `text-align: end` selbst korrekt als „rechts" rendert (LTR-Kontext) — **sichtbar widersprüchlicher UI-Zustand: Absatz sieht rechtsbündig aus, aber kein Button ist gedrückt.** Genau der in Verdachtsmoment 2 beschriebene Fehler, hier erstmals im Browser demonstriert statt nur auf Modellebene | **ROT** | Testfall 26, Grenzfall 8/Verdachtsmoment 2 |
| P24 | Upload reale DOCX `bug-paragraph-alignment.docx` (Ausrichtung nur über Stil „Title" → `center`) | Upload, Absatz mit Text „does not have explicit alignment" | **Soll:** `text-align: center` im DOM | **ROT** — aktueller Code ignoriert `w:pStyle`-Vererbung, Absatz erscheint `text-align: left` | Testfall 27, Grenzfall 9/Verdachtsmoment 3 |
| P25 | Cross-Format DOCX → ODT | DOCX mit rechtsbündigem Absatz erstellen/hochladen → als ODT exportieren → heruntergeladene ODT-Datei über die ODT-Karte per `filechooser` **erneut hochladen** → sichtbar weiterhin rechtsbündig | `text-align: right` nach Formatwechsel erhalten | GRÜN | Testfall 20, Rundreise 4.3.1 |
| P26 | Cross-Format ODT → DOCX | spiegelbildlich | analog | GRÜN | Testfall 21, Rundreise 4.3.2 |
| P27 | Doppelte Cross-Format-Rundreise DOCX→ODT→DOCX, rechtsbündige Überschrift + Fett + Farbe kombiniert | Überschrift mit allen drei Eigenschaften anlegen, zweimal konvertieren wie P25+P26 verkettet, letzten Download strukturell prüfen | `<w:jc w:val="right"/>` **und** `<w:b/>`/Farbe am selben Run nach zwei Konvertierungen weiterhin vorhanden | GRÜN erwartet (keine bekannte Lücke für den reinen Absatzfall ohne Formatvorlagen-Abhängigkeit) | Testfall 22, Rundreise 4.3.3 |
| P28 | Import Fremddatei mit ungültigem `w:jc`-Wert (`distribute`) — synthetisch, da im realen Korpus laut `ausrichtung-rechts-code.md` Abschnitt 6.1 **nicht** vorhanden | In-Memory per JSZip gebaute DOCX-Datei (Bytes, kein Pfad auf Platte) über `filechooser`/`setInputFiles` hochladen — bewusst weiterhin über den echten Upload-Pfad, nicht über `readDocx` direkt | Kein Absturz (`page.on('pageerror')` bleibt leer), Text bleibt vollständig sichtbar, Ausrichtung fällt dokumentiert auf `left` zurück | GRÜN | Testfall 36, Grenzfall 7 |

#### 3.10 Icon-Rendering, Tooltip, Tastenkürzel (Testfälle 31–33)

| # | Test | Schritte | Assertion | Erwarteter Status | Bezug |
|---|---|---|---|---|---|
| P29 | Icon-Screenshot der vier Ausrichtungs-Buttons nebeneinander | `page.locator('...AlignButton-Gruppe...').screenshot()` in allen drei Playwright-Projekten (deckt Chromium **und** WebKit über „Tablet" ab) | Dokumentierender Snapshot-Test, kein hartes Pass/Fail-Kriterium beim ersten Lauf — Baseline wird hier erstmals angelegt; manuelle Sichtprüfung, dass „⇤"/„↔"/„⇥"/„≡" optisch unterscheidbar bleiben | Dokumentierend | Testfall 31 |
| P30 | Tooltip zeigt durchgängig deutschen Text (Regressionstest für den Fix) | `expect(page.getByTitle('Ausrichtung: rechts')).toBeVisible()`; `expect(page.getByTitle(/Ausrichtung: right\b/)).toHaveCount(0)` | Zweite Assertion prüft explizit die **Abwesenheit** des Bugs | **ROT** (aktueller Titel ist `"Ausrichtung: right"`, erste Assertion schlägt fehl; zweite würde sogar treffen) — wird nach Fix (`Toolbar.tsx` Abschnitt 3.7 des Codeplans) GRÜN | Testfall 32, Verdachtsmoment 7 |
| P31 | Zugängliche Bezeichnung (Accessible Name) unabhängig vom Fix-Stand | `page.getByRole('button', { name: /Ausrichtung/ })` muss den rechts-Button treffen — Accessible-Name-Berechnung nutzt `title` bereits **heute** als Fallback (kein `aria-label` vorhanden), sollte also schon jetzt funktionieren | Button per Rollen-Locator auffindbar, **unabhängig** davon ob `aria-label` später ergänzt wird | GRÜN erwartet schon jetzt — **abweichend von Verdachtsmoment 11**, das den fehlenden `aria-label` als Risiko einstuft: `title` liefert laut ARIA-Accname-Spezifikation bereits einen gültigen Accessible Name für ein Element ohne Eigentext. Muss trotzdem real gegen mindestens Chromium **und** WebKit geprüft werden (Screenreader-Verhalten kann trotzdem abweichen — das bleibt ein dokumentiertes Restrisiko, kein automatisiert vollständig prüfbarer Fall) | Verdachtsmoment 11 |
| P32 | Tastenkürzel `Strg+R`/`Cmd+R` setzt rechtsbündig statt die Seite neu zu laden | Text tippen, `ControlOrMeta+a`, `page.keyboard.press('ControlOrMeta+r')` | Text bleibt im DOM, `text-align: right` gesetzt | **ROT** — `Mod-r` ist aktuell **nicht** in der Keymap gebunden (Abschnitt 0 bestätigt); der Tastendruck hat schlicht **keine** Wirkung auf die Ausrichtung. **Wichtiger methodischer Vorbehalt, siehe Kasten unten.** | Testfall 33, Verdachtsmoment 6 |

> **QA-Vorbehalt zu P32/Testfall 33 (über den Codeplan hinausgehender Befund):**
> `ausrichtung-rechts-code.md` Abschnitt 3.4 begründet die Wahl von `Mod-r` explizit
> mit dem Risiko „Browser-Reload-Konflikt" und schlägt genau diesen Playwright-Test
> als automatisierten Nachweis vor, dass `Strg+R` **nicht** zum Neuladen der Seite
> führt. **Dieser automatisierte Nachweis ist so nicht tragfähig:** Playwright sendet
> Tastatureingaben über `page.keyboard.press(...)` per CDP (`Input.dispatchKeyEvent`)
> **direkt an die Seite/den Renderer**, nicht an die Browser-Chrome-Ebene, die in
> einem echten, von Hand bedienten Desktop-Browser reservierte Tastenkombinationen
> wie „Seite neu laden" abfängt. Ein `page.keyboard.press('ControlOrMeta+r')` in
> Playwright löst in der Automatisierung **so gut wie nie** ein echtes
> Browser-Neuladen aus — unabhängig davon, ob die Seite selbst `preventDefault()`
> aufruft oder nicht. Der vorgeschlagene Test würde also **auch dann grün laufen,
> wenn** überhaupt kein `keydown`-Handler existiert (aktueller Zustand: der Text
> bleibt einfach automatisch stehen, weil in der Automatisierung ohnehin nichts
> neu lädt) — er beweist **nicht**, was er zu beweisen behauptet. Test P32 bleibt
> trotzdem sinnvoll, um zu prüfen, dass `Mod-r` **innerhalb der Seite** tatsächlich
> `setAlign('right')` auslöst (das ist ein echter, aussagekräftiger Nachweis), aber
> die Aussage „schützt zuverlässig vor echtem Browser-Reload" **kann ausschließlich
> manuell in einem echten, nicht automatisierten Desktop-Browser (Chrome, Firefox,
> Edge, jeweils mit sichtbarem Fenster und echter Tastatur) verifiziert werden** —
> das muss vor Abnahme **zusätzlich** zum automatisierten Test durchgeführt und hier
> protokolliert werden, nicht nur als „durch E2E-Test abgedeckt" durchgewunken
> werden, wie es in `ausrichtung-rechts-code.md` Abschnitt 3.4/9.1 nahegelegt wird.

#### 3.11 Performance und Mehrfachklick (Testfälle 34–35)

| # | Test | Schritte | Assertion | Erwarteter Status |
|---|---|---|---|---|
| P33 | Sehr lange Selektion (mehrere Seiten) bleibt performant | ~2000 Wörter tippen, `ControlOrMeta+a`, rechts-Button klicken, Zeitmessung | Anwendung unter praktikablem Zeitlimit (z. B. < 5 s), UI bleibt bedienbar, `text-align: right` gesetzt | GRÜN erwartet |
| P34 | Schnelles Mehrfachklicken bleibt konsistent | Vier schnelle Klicks auf denselben Button ohne Wartezeit | Alle betroffenen Absätze am Ende konsistent `text-align: right`, kein Zwischenzustand mit nur teilweise geänderten Absätzen | GRÜN erwartet |

#### 3.12 Kopf-/Fußzeilen (Grenzfall 2.8) — nicht end-to-end testbar, wird dokumentiert statt ausgelassen

Da laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 aktuell **keine UI** zum Bearbeiten
von Kopf-/Fußzeilen existiert (durch `Glob`/`Grep` in `src/formats/shared/editor`
bestätigt: keine Header/Footer-Komponente vorhanden), ist dieser Fall **nicht**
über echte Browser-Bedienung testbar. Wird hier ausdrücklich als
„nicht anwendbar, bis UI existiert" vermerkt (Anforderung verlangt genau das,
nicht stillschweigendes Weglassen).

---

## 4. Traceability-Matrix (Anforderung §7 → Testfall in diesem Plan)

| `ausrichtung-rechts-req.md` §7, Testfall | Testfall(e) in diesem Plan |
|---|---|
| 1 | P1 |
| 2 | P2 |
| 3 | P3 |
| 4 | P6 (+ P5/P7 Vorstufe) |
| 5 | P4 |
| 6 | P5 |
| 7 | P5/P7 (Kernstück, siehe 3.3) |
| 8 | P7 |
| 9 | P8 |
| 10 | P9 |
| 11 | P10 |
| 12 | P11 |
| 13 | P12 |
| 14 | P13, P14 |
| 15 | P15 |
| 16 | P16 |
| 17 | P17 |
| 18 | P18, D-Reihe (Abschnitt 2.2) |
| 19 | P19, O-Reihe (Abschnitt 2.3) |
| 20 | P25 |
| 21 | P26 |
| 22 | P27 |
| 23 | P20 |
| 24 | P21 |
| 25 | P22, D3/D5 |
| 26 | P23, O3/O4 |
| 27 | P24, D6/D7, O4/O5 |
| 28 | Diese komplette neue Datei `align-right.spec.ts` |
| 29 | P18 (struktureller DOMParser-Nachweis) |
| 30 | P19 (analog) |
| 31 | P29 |
| 32 | P30 |
| 33 | P32 (+ QA-Vorbehalt oben) |
| 34 | P33 |
| 35 | P34 |
| 36 | D4, D9, O8, O9 (neuer Fund), P28 |

---

## 5. Erwarteter Ist-Status je Testfall (vor Umsetzung von `ausrichtung-rechts-code.md`)

| Status | Testfälle | Grund |
|---|---|---|
| **Erwartet ROT** (dokumentiert bestätigten Bug, muss nach Fix auf GRÜN wechseln) | D3, D6, D7, O2, O3, O4, O5, O9 (neuer Fund), C2, C3, C5 (teilweise), C6, C7, S1, S2 (blockiert bis `sanitizeAlign` existiert), P10, P11, P23, P24, P30, P32 (teilweise, siehe Vorbehalt), Teil von P7 | Bestätigte Bugs aus Abschnitt 0: `isAlignActive` nur `$from`, `setHeading` verwirft Ausrichtung, `start`/`end` unnormalisiert, keine Formatvorlagen-Vererbung, Tooltip-Mischsprache, fehlendes Tastenkürzel, fehlendes `sanitizeAlign`, ODT-Heading-Stilname ohne Fallback |
| **Erwartet GRÜN** (sollte mit aktuellem Code bereits bestehen) | D1, D2, D4, D5, D8, D9, O1, O6, O7, O8, C1, C4, R1–R4, X1, X2, P1–P6, P8, P9, P12–P22, P25–P29, P31, P33, P34 | Basiert auf bereits funktionierendem `setAlign`/`nodesBetween`, funktionierenden Basis-Readern/-Writern und dem bereits vorhandenen, korrekten Export-Fallback für Absätze |

Sobald `ausrichtung-rechts-code.md` Abschnitt 3/9 umgesetzt ist, müssen **alle** in
der ersten Zeile gelisteten Testfälle nachweislich auf GRÜN wechseln — das ist der
konkrete, maschinell prüfbare Nachweis, dass die Fixes wirken (nicht nur
Code-Review). O9 (neuer QA-Fund) ist in `ausrichtung-rechts-code.md` **nicht**
mit adressiert und muss vor Abnahme zusätzlich entschieden werden (siehe
Abschnitt 8).

---

## 6. Abgleich mit Abnahmekriterien (`ausrichtung-rechts-req.md` Abschnitt 9)

| DoD-Punkt | Abdeckung in diesem Testplan |
|---|---|
| 1. Alle 36 Testfälle aus Anforderung §7 real ausgeführt, dokumentiert | Abschnitt 3 (P1–P34) + Abschnitt 2 (D/O/R/C/S/X) + Traceability-Matrix Abschnitt 4 |
| 2. Jedes der 11 Verdachtsmomente aus Anforderung §6 explizit eingestuft | Abschnitt 0 (Gegenkontrolle je Behauptung) + Abschnitt 5 (Rot/Grün-Zuordnung je Verdachtsmoment) — zusätzlich: neuer, nicht in §6 enthaltener Fund (O9) explizit als offen markiert |
| 3. Alle 5 offenen Entscheidungen aus Anforderung §8 getroffen, umgesetzt, Ergebnis nachgetragen | Wird durch das GRÜN-Werden von C2/C3/C6/C7 (Entscheidungen 3/5), P32 (Entscheidung 1), P8 (Entscheidung 2, bereits erfüllt), D3/O2/O3 (Entscheidung 4) nachweisbar — Nachtrag in `-req.md`/`-code.md` bleibt Aufgabe der Entwicklung, nicht dieses QA-Dokuments |
| 4. Mindestens ein dauerhaft verankerter E2E-Test über echte Browser-Bedienung | `tests/e2e/align-right.spec.ts` (P1–P34) |
| 5. Rundreise-Anforderung §4 für DOCX **und** ODT, inkl. Cross-Format und je mindestens einer realen Fremddatei | P20/P21 (reale Einzeldatei-Rundreise), P22–P24 (weitere reale Grenzfall-Dateien), P25–P27 (Cross-Format), D/O-Reihe (Unit-Ebene) |
| 6. Tooltip-Lokalisierungsfehler behoben, Regressionstest vorhanden | P30 |
| 7. Mindestens ein Fixture-Test mit realer Fremddatei je Format, dauerhaft in der Suite | D5/D6 (DOCX: `rtl.docx`, `bug-paragraph-alignment.docx`), O3/O4 (ODT: `excelfileformat.odt`, `table-within-textBox-within-frame.odt`) — deutlich übererfüllt (je zwei statt einer Datei) |

---

## 7. Ausführungsreihenfolge (Vorschlag)

1. **Zuerst** die Unit-Tests, die bestätigte Bugs bewusst **rot** dokumentieren:
   D3, D6, D7, O2–O5, O9, C2, C3, C5–C7 (Abschnitt 2). Dient als reproduzierbarer
   Ausgangsnachweis, bevor irgendetwas gefixt wird — ergänzt die in Abschnitt 0
   bereits durchgeführte Code-Lektüre um tatsächlich lauffähige, rote Tests.
2. `align-right.spec.ts` P1–P9 (Bedienung/Zustand/Umschalten) — deckt die
   `isAlignActive`-Problematik sichtbar im Browser auf (P7).
3. `align-right.spec.ts` P10–P11 (Formatvorlagen-Wechsel) — deckt den
   praktisch wichtigsten Bug sichtbar auf.
4. `align-right.spec.ts` P12–P17 (Listen/Tabellen/hard_break/Undo-Redo).
5. `align-right.spec.ts` P18–P28 (Rundreisen inkl. realer Fremddateien,
   Cross-Format) + zugehörige Unit-Erweiterungen R1–R4, X1–X2.
6. `align-right.spec.ts` P29–P34 (Icon/Tooltip/Tastenkürzel/Performance) +
   `schema.test.ts` (S1/S2, sobald `sanitizeAlign` existiert).
7. Manuelle Ergänzungsprüfung für den in Abschnitt 3.10 dokumentierten
   Playwright-Blindpunkt bei `Strg+R` (echter Desktop-Browser, kein CDP).
8. **Nach** Umsetzung von `ausrichtung-rechts-code.md`: alle als „ROT erwartet"
   markierten Fälle erneut ausführen, Statuswechsel auf GRÜN dokumentieren;
   `tests/e2e/selection-regression.spec.ts` zusätzlich erneut laufen lassen
   (muss unverändert grün bleiben, siehe Abschnitt 3 in `fett-qa.md` für das
   etablierte Muster dieser Regressionsprüfung).
9. Traceability-Matrix (Abschnitt 4) und DoD-Abgleich (Abschnitt 6) final
   gegenprüfen, bevor der Backlog-Status auf „verifiziert" geändert wird.

---

## 8. Offene Punkte für QA / an die Entwicklung zurückzumelden

- **O9 (neuer Fund, Abschnitt 0):** `headingStyleName(level, align)` in
  `src/formats/odt/styleRegistry.ts:80-81` hat keinen Fallback für ungültige
  `align`-Werte, im Unterschied zum bereits abgesicherten Absatz-Pfad
  (`PARAGRAPH_ALIGN_STYLE_NAME[align] ?? PARAGRAPH_ALIGN_STYLE_NAME.left`).
  Muss vor Abnahme entweder als „bestätigter zusätzlicher Bug, wird mit
  behoben" oder „bewusst hingenommen, weil praktisch unerreichbar" eingestuft
  und in `ausrichtung-rechts-code.md`/`-req.md` nachgetragen werden — ist in
  keinem der beiden Dokumente bisher erwähnt.
- **P7/Testfall 7:** Das genaue Verhalten von `isAlignActive` bei `Strg+A` über
  gemischte Ausrichtung im **echten Browser** (nicht nur im synthetischen
  `EditorState` aus C2/C3) muss beim ersten Testlauf empirisch bestätigt werden
  — ProseMirrors `AllSelection`/`$from`-Auflösung könnte in der echten
  DOM-Umgebung geringfügig anders funktionieren als im minimalen Unit-Test-Setup.
- **P32/Testfall 33:** Siehe QA-Vorbehalt in Abschnitt 3.10 — der von
  `ausrichtung-rechts-code.md` vorgeschlagene automatisierte Nachweis für
  „`Strg+R` löst kein Browser-Reload aus" ist methodisch nicht tragfähig
  (Playwright-CDP-Tastatureingaben erreichen keine Browser-Chrome-Shortcuts).
  Eine manuelle Prüfung in einem echten, nicht automatisierten Desktop-Browser
  ist zwingend zusätzlich nötig und muss hier protokolliert werden.
- **P20/P21 (reale Fremddateien, unveränderte Rundreise):** Vor der
  Testimplementierung mit `readDocx`/`readOdt` (oder direktem Entpacken) prüfen,
  dass `60329.docx`/`invalid.odt` tatsächlich **nur einen** rechtsbündigen
  Absatz mit eindeutig identifizierbarem, kurzem Text enthalten (Dateiname
  allein ist keine Garantie) — `ausrichtung-rechts-code.md` Abschnitt 6.1/6.2
  benennt den jeweiligen Text bereits (\"Protocol No.\"/\"hallo\"), vor
  Testimplementierung trotzdem am tatsächlichen `document.xml`/`content.xml`
  gegenprüfen.
- **P25–P27 (Cross-Format-Export):** Vor Testimplementierung an der UI
  verifizieren, ob ein Export in ein **anderes** Format direkt aus derselben
  Karte möglich ist, oder ob zwingend der Umweg über Reimport in die jeweils
  andere Karte nötig ist (identische offene Frage wie in `fett-qa.md` Abschnitt
  8, dort für „Fett" bereits vermerkt — hier dieselbe UI-Eigenschaft, also
  vermutlich dieselbe Antwort, aber vor Testimplementierung erneut zu bestätigen).
- **P28 (synthetische `distribute`-Fixture):** Da im realen Fixture-Korpus laut
  `ausrichtung-rechts-code.md` Abschnitt 6.1 kein Beispiel für `w:jc
  w:val="distribute"` auf Absatzebene existiert, muss die Testdatei synthetisch
  (per JSZip, In-Memory-Bytes) gebaut werden — Upload-Pfad bleibt trotzdem der
  echte `filechooser`/`setInputFiles`, nur die Bytes sind konstruiert statt von
  Platte gelesen; das ist kein Widerspruch zum Grundsatz „keine internen
  Funktionsaufrufe" aus Abschnitt 3, da der Parser (`readDocx`) weiterhin nur
  über die reguläre Upload-UI erreicht wird.
