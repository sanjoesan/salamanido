# QA-Testplan: Feature „Fett"

Rolle: QA-Antwort auf `specs/fett-req.md` (Anforderung) und `specs/fett-code.md`
(Entwicklerplan). Dieses Dokument nimmt **keinen** der beiden Vorgängertexte als
bewiesen an — auch `fett-code.md` ist laut eigenem Titel ein *Plan*, keine
verifizierte Umsetzung ("Kein Punkt hier ist bereits umgesetzt"). Jede Behauptung
aus beiden Dokumenten wird hier auf einen konkreten, ausführbaren Testfall
abgebildet. Ergebnis ist ein Testplan, kein Testbericht — die hier aufgeführten
Tests sind zum Zeitpunkt dieses Dokuments größtenteils **noch nicht geschrieben**
(siehe Abschnitt 6, Spalte „Erwarteter Status").

Stil/Gliederung orientiert an `fett-req.md`/`fett-code.md`/`FEATURE-SPEC-DOCX-ODT.md`.

---

## 0. Stichprobenprüfung des Ist-Codes (QA-Gegenkontrolle von `fett-code.md`)

Bevor der Plan aufgestellt wird, wurden die vier in `fett-code.md` Abschnitt 0
behaupteten Fehler stichprobenartig direkt im aktuellen Code nachvollzogen (nicht
nur aus dem Dokument übernommen):

| Behauptung aus `fett-code.md` | QA-Gegenkontrolle | Ergebnis |
|---|---|---|
| Fehler 1: Kein `onClick` am Toolbar-Button, nur `onMouseDown` | `src/formats/shared/editor/Toolbar.tsx:44-52` gelesen | **Bestätigt.** `MarkButton` verdrahtet ausschließlich `onMouseDown`; kein `onClick`/`onKeyDown` vorhanden. |
| Fehler 2: `active`-Zustand ignoriert `storedMarks` | `Toolbar.tsx:42` gelesen | **Bestätigt.** `const active = markType.isInSet(view.state.selection.$from.marks()) !== undefined` — kein Zugriff auf `state.storedMarks`, keine Prüfung auf „ganze Selektion fett". |
| Fehler 3: DOCX-Reader ignoriert `@w:val` an `<w:b>` | `src/formats/docx/reader.ts:99-106` gelesen | **Bestätigt.** `if (firstChildNS(rPr, ..., 'b')) marks.push({ type: 'strong' })` — reine Existenzprüfung, kein `getAttributeNS(..., 'val')`-Check. Der `underline`-Fall zwei Zeilen darunter prüft `@val` korrekt, der `b`-Fall nicht — Inkonsistenz bestätigt. |
| Fehler 4: Keine `.ProseMirror h1..h6 { font-weight }`-Regel in `index.css` | `grep -n font-weight src/index.css` ausgeführt | **Bestätigt.** Einziger Treffer ist eine andere Regel (Tabellenkopf), keine `h1`–`h6`-Regel im gesamten Projekt gefunden. |

Konsequenz für diesen Testplan: Alle vier Punkte werden unten als **aktuell
rot erwartete** Testfälle geführt (Regressionstests, die den Bug dokumentieren, bis
`fett-code.md` Abschnitt 4 umgesetzt ist), nicht als hypothetische Grenzfälle.
Dasselbe gilt sinngemäß für „Lücke A" (DOCX `w:rStyle` nicht aufgelöst) und „Lücke
B" (ODT `office:styles`/`style:parent-style-name` nicht aufgelöst) — beide sind
durch Lesen von `docx/reader.ts` bzw. `odt/reader.ts` plausibel, werden hier aber
zusätzlich durch dedizierte, für sich lauffähige Testfälle abgesichert statt nur
übernommen.

---

## 1. Testumgebung

- Unit-Tests: `npm test` (Vitest, `jsdom`-Environment, siehe `vitest`-Devdependency).
- E2E-Tests: `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `baseURL: 'http://localhost:4173/salamanido/'`, `webServer` baut (`npm run build`)
    und startet `vite preview` automatisch.
  - Drei Projekte: **Desktop Chrome**, **Mobile** (`Pixel 7`), **Tablet**
    (`iPad Mini`) — jeder neue Testfall muss in **allen drei** grün sein, sofern er
    nicht explizit auf reine Tastaturbedienung angewiesen ist (siehe 4.8).
- Bestehende Konventionen (aus `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
  übernommen, in neuen Tests beizubehalten):
  - `page.goto('/')` → Privacy-Banner wegklicken: `page.getByRole('button', { name: /verstanden/i }).click()`.
  - Karten-Locator: `docxCard(page)`/`odtCard(page)` über
    `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: '...' }) })`.
  - Editor-Locator: `page.locator('.ProseMirror')`.
  - Fett-Button: `page.getByTitle('Fett')` (Titel/`aria-label` identisch, siehe
    `Toolbar.tsx:135` in `fett-req.md`-Tabelle).
  - Export: `page.getByRole('button', { name: 'Exportieren' })` + `page.waitForEvent('download')`.

---

## 2. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

**Zweck:** Schnelle, browserunabhängige Absicherung der Datenebene (Mark ⇄ XML).
Diese Ebene ist von den UI-Bugs Fehler 1/2 (Toolbar-Bedienung) komplett
entkoppelt — ein rotes Toolbar-Verhalten darf hier keine Unit-Tests rot färben und
umgekehrt. Testet ausschließlich `writeDocx`/`readDocx`/`writeOdt`/`readOdt` sowie
`wordSchema` direkt, **keine** Playwright-Interaktion.

### 2.1 Bestandsaufnahme (bereits vorhanden, als Basisschutz zu erhalten)

| Datei | Test | Deckt ab |
|---|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts:57` | „preserves bold, italic, underline, and strikethrough independently" | Anforderung 2.4 (Grundfall) |
| `src/formats/odt/__tests__/roundtrip.test.ts:57` | analog | Anforderung 2.4 (Grundfall) |
| `src/formats/docx/__tests__/roundtrip.test.ts:80` (combined marks, gekürzt gelesen) | „preserves combined marks on the same run" | Anforderung 4.1.3 (Ansatz vorhanden, siehe 2.2 unten für Erweiterung) |
| `src/formats/*/__tests__/external-fixtures.test.ts` | Import von ~50+ Fremddateien je Format, bisher nur „stürzt nicht ab" | Teilabdeckung 4.1.7/4.2.7 (siehe 2.4 unten für gezielte Bold-Assertion) |

Diese Tests bleiben unverändert Teil der Suite; sie werden **nicht** ersetzt,
sondern ergänzt.

### 2.2 Neue/erweiterte Testfälle — `src/formats/docx/__tests__/roundtrip.test.ts`

| # | Testfall | Vorgehen | Erwartung | Bezug |
|---|---|---|---|---|
| D1 | Toggle „aus" bleibt „aus" nach Rundreise | `doc([paragraph mit Run **ohne** `strong`-Mark, der vorher fett war])` → `roundTrip` → Run hat `marks === undefined`/kein `strong` | Kein `<w:b/>` im Export für diesen Run | 2.1, 4.1.4 |
| D2 | Fett+Kursiv+Unterstrichen bleiben auf **einem** Run, nicht aufgesplittet | Ein Text-Node mit `marks: [{type:'strong'},{type:'em'},{type:'underline'}]` → `writeDocx` → rohe `document.xml` per Regex/DOMParser prüfen: genau **ein** `<w:r>` mit allen drei Elementen im selben `<w:rPr>` | Kein Run-Split, kein Verlust | 4.1.3 |
| D3 | Fettes Wort über `hard_break` hinweg | Paragraph-Content: `text(fett) → hard_break → text(fett)`, beide mit `marks:[{type:'strong'}]` | Nach Rundreise: beide Text-Nodes vor/nach dem `hard_break` weiterhin `strong` | 4.1.5 |
| D4 | Reihenfolge-Unabhängigkeit (Farbe/Fett) | Zwei Varianten desselben Inhalts, einmal `marks:[color, strong]`, einmal `marks:[strong, color]` → beide durch `writeDocx` | Resultierendes `<w:rPr>` (Kindelement-Menge) ist in beiden Fällen inhaltlich identisch (Vergleich als Menge, nicht als exakte Zeichenkette wegen möglicher Reihenfolge im Rendering selbst) | 2.4 |
| D5 | **Regressionstest Fehler 3** — `<w:b w:val="0"/>` (expliziter Bold-Aus-Override) | Rohes DOCX **nicht** über `writeDocx`, sondern direkt per JSZip gebaut (wie in `tests/e2e/docx.spec.ts` `buildSampleDocx()`), Run mit `<w:rPr><w:b w:val="0"/></w:rPr>` → `readDocx(blob)` | Erwartet: **kein** `strong`-Mark auf diesem Run. **Erwarteter Status jetzt: ROT** (Bug bestätigt in Abschnitt 0) — Test bleibt bewusst rot bis `fett-code.md` Abschnitt 4.6 (`isOnOffTrue`) umgesetzt ist; danach muss er grün werden. | Grenzfall 2.5/Anforderung, `fett-code.md` Fehler 3 |
| D6 | **Regressionstest Lücke A** — Fettung nur über `w:rStyle`/Zeichenformatvorlage | Rohes DOCX per JSZip: `styles.xml` mit `<w:style w:type="character" w:styleId="Strong"><w:rPr><w:b/></w:rPr></w:style>`, Run referenziert `<w:rPr><w:rStyle w:val="Strong"/></w:rPr>` ohne direktes `<w:b/>` → `readDocx` | Erwartet: `strong`-Mark gesetzt (geerbt aus Zeichenformatvorlage). **Erwarteter Status jetzt: ROT** (Lücke A, noch nicht implementiert) | Grenzfall 3.10 |
| D7 | Direktformatierung überschreibt Zeichenformatvorlage | Wie D6, aber Run zusätzlich mit explizitem `<w:b w:val="0"/>` **neben** `<w:rStyle>` | Erwartet: **kein** `strong`-Mark (Direktformatierung hat Vorrang) — Test kann erst sinnvoll geschrieben werden, wenn D5 **und** D6 grün sind; bis dahin als „blockiert" markiert | Grenzfall 3.10, `fett-code.md` Abschnitt 4.6 letzter Punkt |
| D8 | Leerer Absatz, nur `storedMarks` (kein Text) | `doc([{ type:'paragraph', attrs:{align:'left'}, content: [] }])` → `writeDocx` | Export enthält für diesen Absatz **keinen** leeren `<w:r>`; kein Wurf/Absturz | Grenzfall 3.8 |

### 2.3 Neue/erweiterte Testfälle — `src/formats/odt/__tests__/roundtrip.test.ts`

| # | Testfall | Vorgehen | Erwartung | Bezug |
|---|---|---|---|---|
| O1 | Toggle „aus" bleibt „aus" | analog D1, Assertion auf Abwesenheit von `fo:font-weight="bold"` | Kein `font-weight`-Bezug mehr | 2.1, 4.2.5 |
| O2 | Zwei Textläufe mit identischer Markkombination → **eine** Stildefinition | `doc([paragraph('a', 'left', [{type:'strong'}]), paragraph('b', 'left', [{type:'strong'}])])` → `writeOdt` → `content.xml` parsen: Anzahl `<style:style style:family="text">` mit `fo:font-weight="bold"` **== 1**, beide `text:span` referenzieren denselben Stilnamen | Dedupliziert wie in `styleRegistry.ts:48` behauptet | 4.2.3 |
| O3 | Fett + Hervorhebungsfarbe kombiniert | Ein Run mit `marks:[{type:'strong'},{type:'highlight',attrs:{color:'#ffff00'}}]` | Eine einzige Stildefinition trägt **beide** Eigenschaften (`fo:font-weight="bold"` und Hervorhebung), nicht zwei sich überschreibende `text:span`-Ebenen | 4.2.4 |
| O4 | **Regressionstest Lücke B** — Stil aus `<office:styles>` statt `<office:automatic-styles>` | Rohes ODT per JSZip: `styles.xml`/`content.xml` mit `<office:styles><style:style style:name="Strong" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style></office:styles>`, `text:span` referenziert `style:name="Strong"` | Erwartet: `strong`-Mark gesetzt. **Erwarteter Status jetzt: ROT** (Lücke B) | Grenzfall 3.10 |
| O5 | **Regressionstest Lücke B (Vererbung)** — `style:parent-style-name` | Automatischer Stil ohne eigenes `fo:font-weight`, aber `style:parent-style-name="Strong"` verweist auf O4-Stil | Erwartet: `strong`-Mark trotzdem gesetzt (Vererbungskette aufgelöst). **Erwarteter Status jetzt: ROT** | Grenzfall 3.10 |

### 2.4 Erweiterung — `external-fixtures.test.ts` (DOCX + ODT)

Aktuell nur „importiert ohne Absturz". Ergänzen um **gezielte** Bold-Assertion auf
mindestens einer Fixture mit bekannter Zeichenformatvorlage:

- DOCX: Kandidat `tests/fixtures/external/docx/...` mit Style-Bezug (Name vor
  Verwendung am tatsächlichen `document.xml`/`styles.xml`-Inhalt verifizieren, nicht
  nur am Dateinamen).
- ODT: Kandidaten in `tests/fixtures/external/odt/`: `character-styles.odt`,
  `CharacterParagraphFormat.odt`, `TestStyleSelection.odt`,
  `TestStyleStyleAttribute.odt` (alle vorhanden, per `Glob` bestätigt) — Inhalt vor
  Verwendung öffnen/parsen, da Dateiname keine Garantie über exakten Inhalt gibt.

Erwartung: mindestens ein Wort in der jeweiligen Fixture kommt nach Import als
`strong`-Mark im Editor-Modell an. **Erwarteter Status jetzt: vermutlich ROT**
(hängt an denselben Lücken A/B) — muss zuerst durch Öffnen der Fixture bestätigt
werden, dass sie tatsächlich Zeichenformatvorlagen-Fettung statt
Direktformatierung enthält, sonst ist der Test kein echter Nachweis.

### 2.5 Neue Datei: `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts`

Unit-Ebene für Anforderung 4.3 (schneller als E2E, ergänzt — ersetzt nicht — den
Browser-Test in 4.3 unten):

| # | Testfall | Vorgehen | Erwartung |
|---|---|---|---|
| X1 | DOCX → ODT → DOCX | `WordDocumentContent` mit fettem Wort → `readDocx(writeDocx(c))` (simuliert „aus DOCX importiert") → Ergebnis via `readOdt(writeOdt(...))` (simuliert „als ODT exportiert, erneut importiert") → erneut `readDocx(writeDocx(...))` | `strong`-Mark an derselben Textstelle nach beiden Konvertierungen weiterhin vorhanden |
| X2 | ODT → DOCX → ODT | Spiegelbildlich zu X1 | s. o. |

### 2.6 Neue Datei: `src/formats/shared/__tests__/schema.test.ts`

Schnelle, browserunabhängige Absicherung der 500er-`font-weight`-Grenze aus
Grenzfall 3.6 auf Ebene des `parseDOM`-Regex selbst (ergänzt, ersetzt **nicht** den
echten Browser-Paste-Test in 4.3 Punkt 13 unten — dieser Unit-Test prüft nur die
Regel isoliert, nicht das tatsächliche Paste-Verhalten im Editor):

- `font-weight: 400` / `normal` → keine `strong`-Erkennung.
- `font-weight: 499` → keine `strong`-Erkennung.
- `font-weight: 500` → `strong`-Erkennung.
- `font-weight: 999` / `bold` → `strong`-Erkennung.
- `<b>`/`<strong>` ohne Style-Attribut → `strong`-Erkennung (Grundfall).

Umsetzung: `DOMParser` aus `jsdom` (Vitest-Environment stellt es bereits global
bereit) auf ein HTML-Snippet anwenden und `wordSchema.marks.strong.spec.parseDOM`
direkt gegen die erzeugten Elemente ausführen, oder einfacher: einen Mini-`ProseMirror`-
`DOMParser.fromSchema(wordSchema).parse(...)` auf das Snippet anwenden und das
resultierende Dokument auf das `strong`-Mark prüfen.

---

## 3. Teil B — Echte Playwright-Browser-Tests

**Grundsatz (bindend für diesen Abschnitt):** Kein Testfall in Teil B darf durch
direkten Aufruf interner Funktionen (`toggleMark(...)`, `isMarkActive(...)`,
`readDocx(...)` etc.) im Node-Kontext ersetzt werden. Jeder Testfall muss über
echte Nutzer:innen-Handlungen im Browser laufen: `locator.click()`,
`page.keyboard.press(...)`/`.type(...)`, `input.setInputFiles(...)` bzw. echtes
`filechooser`-Event, `page.waitForEvent('download')` + Auslesen der
heruntergeladenen Datei vom Dateisystem. Das ist die explizite Abgrenzung aus dem
Auftrag zu diesem Testplan und aus `fett-req.md` Abschnitt 5/6 Punkt 1.

### 3.1 Neue Datei: `tests/e2e/bold.spec.ts`

Ersetzt/ergänzt die verstreuten Fett-Assertions in `docx.spec.ts`/`odt.spec.ts`
(die laut `fett-req.md` explizit als „nicht vertrauenswürdig" geführt werden) durch
eine dedizierte Suite. Eine `describe`-Gliederung je Themenblock, ein `test` je
Zeile unten. `Bezug` verweist auf `fett-req.md` Abschnitt 5 (Punktnummer) bzw.
Abschnitt 3 (Grenzfall-Nummer).

#### 3.1.1 Bedienung: Maus **und** Tastatur (Anforderung Abschnitt 1, Zeilen 1–2)

| # | Test | Konkrete Schritte | Assertion | Bezug |
|---|---|---|---|---|
| B1 | Klick auf Toolbar-Button setzt Fett auf Selektion | Text tippen, `ControlOrMeta+a`, `page.getByTitle('Fett').click()` | `expect(page.getByTitle('Fett')).toHaveAttribute('aria-pressed', 'true')`; `expect(editor.locator('strong, [style*="font-weight"]')).toHaveCSS('font-weight', '700')` (oder per `page.evaluate(() => getComputedStyle(...).fontWeight)`) | §5.1 |
| B2 | Identische Aktion per `Strg+B`/`Cmd+B` statt Klick | Text tippen, `ControlOrMeta+a`, `page.keyboard.press('ControlOrMeta+b')` | Gleiche Assertions wie B1 | §5.2, §1 Zeile 2 |
| B3 | **Reiner Tastatur-Fokus-Pfad** auf den Button (Regressionstest Fehler 1) | Wiederholt `page.keyboard.press('Tab')` bis `page.getByTitle('Fett')` fokussiert ist (`expect(...).toBeFocused()`), dann `page.keyboard.press('Enter')` **und** separat (neuer Testlauf) `page.keyboard.press(' ')` | Fett wird auf vorher per Maus/Shift+Pfeil gesetzte Selektion angewendet. **Erwarteter Status jetzt: ROT** (Fehler 1 bestätigt in Abschnitt 0 — Button hat kein `onClick`, ein natives `<button>` feuert bei Tastatur-Aktivierung kein `mousedown`) | §1 Zeile 1, §5.3 |
| B4 | Kein Doppel-Toggle bei schneller Interaktion | `page.getByTitle('Fett').click()` zweimal in kurzer Folge (`{ clickCount: 2 }` bzw. zwei einzelne `.click()` ohne Wartezeit) | Nach zwei Klicks: Fett-Zustand ist wieder **aus** (zwei echte Toggles, kein Event-Bubbling-Doppel-Feuern, das drei- oder einmal statt zweimal togglet) | Grenzfall 3.9 |

#### 3.1.2 Toggle-Verhalten und Zustandsanzeige (Anforderung 2.1–2.3, Grenzfall 3.2/3.3)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| B5 | Fett ohne Selektion (nur Cursor), dann tippen | Cursor ans Ende von bestehendem, nicht-fettem Text setzen (kein Selektion), `page.getByTitle('Fett').click()`, `page.keyboard.type('neu')` | Neu getippter Text `neu` ist fett (`getComputedStyle` im Seitenkontext prüfen), umgebender Alttext bleibt nicht-fett | §5.3, §2.2 |
| B6 | **Button zeigt „gedrückt" sofort nach Aktivieren an der Schreibmarke, vor dem Tippen** (Regressionstest Fehler 2) | Cursor setzen (keine Selektion), `page.getByTitle('Fett').click()`, **vor** dem nächsten Tastendruck prüfen | `expect(page.getByTitle('Fett')).toHaveAttribute('aria-pressed', 'true')`. **Erwarteter Status jetzt: ROT** (Fehler 2 bestätigt — `active` liest nur `$from.marks()`, nicht `storedMarks`) | §2.3, §5.4 (Ergänzung) |
| B7 | Fett auf vollständig fette Selektion → entfernt | Text tippen, fett machen, erneut vollständig selektieren, `page.getByTitle('Fett').click()` | Text nicht mehr fett, `aria-pressed` → `false` | §5.4 |
| B8 | Gemischte Selektion (teils fett, teils nicht) | Zwei Wörter tippen, nur das erste fett machen, dann **beide** Wörter selektieren und Fett klicken | Definiertes Ergebnis: **gesamte** Selektion wird fett (Standard-`toggleMark`-Verhalten) — beide Wörter danach fett | Grenzfall 3.3, §5.5 |
| B9 | `aria-pressed` bei gemischter Selektion **vor** dem Klick aus B8 | Wie B8, aber Assertion direkt nach dem Selektieren, **vor** dem Klick | `aria-pressed` muss `false` sein (nicht fälschlich `true`, da nur ein Teil fett ist). **Erwarteter Status jetzt: ROT möglich** (abhängig davon, ob `$from` zufällig im fetten Teilbereich liegt — nichtdeterministisch mit aktuellem Code, siehe Fehler 2) | Grenzfall 3.3, §1 Zeile 4 |
| B10 | Formatgrenze: Cursor direkt vor/nach fettem Textlauf | Fetten Textlauf erzeugen, Cursor exakt an die linke bzw. rechte Grenze setzen (`ArrowLeft`/`ArrowRight` zählen), kein Selektion | `aria-pressed` folgt dokumentiert der ProseMirror-Konvention „Marks vor dem Cursor, außer am Absatzanfang" — Ergebnis für **beide** Seiten einzeln festhalten (Wert hier eintragen, sobald Test läuft) | Grenzfall 3.2 |
| B11 | Leere Selektion/leeres Dokument | Neues Dokument, keinerlei Text, `page.getByTitle('Fett').click()` | Keine Exception/Konsolenfehler (`page.on('pageerror')`/`page.on('console')` auf `error`-Level überwachen), Button-Zustand wechselt auf „gedrückt" (vorgemerktes Mark) | Grenzfall 3.1 |

#### 3.1.3 Kombination mit anderen Formaten + Export-Validierung (Anforderung 2.4, 4.1.3/4.2.4)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| B12 | Fett+Kursiv+Unterstrichen kombiniert, DOCX-Export, unabhängiger Parser | Text tippen, `ControlOrMeta+a`, `Fett`-Button, `Kursiv`-Button, `Unterstrichen`-Button klicken (in dieser Reihenfolge **und** in einem zweiten Testlauf umgekehrter Reihenfolge), Export abfangen | Herunterladene Datei per JSZip laden, `word/document.xml` mit **echtem DOMParser** (`new (await import('jsdom')).JSDOM('').window.DOMParser()`, `jsdom` ist bereits Devdependency) parsen, im relevanten `<w:r>` `<w:rPr>` auf alle drei Kindelemente (`w:b`, `w:i`, `w:u`) prüfen — **ein** Run, keine Aufsplittung, beide Reihenfolgen liefern dasselbe Ergebnis | §5.6, §4.1.3, §2.4 |
| B13 | Gleicher Test für ODT | Analog B12, Export als ODT | `content.xml` mit DOMParser: ein `<text:span>` referenziert eine Stildefinition mit `fo:font-weight="bold"`, `fo:font-style="italic"`, `style:text-underline-style` gemeinsam | §5.7, §4.2.4 |

#### 3.1.4 Undo/Redo (Anforderung 2.7)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| B14 | Undo direkt nach Fett-Anwendung | Text tippen, selektieren, Fett per Klick, `page.keyboard.press('ControlOrMeta+z')` | Text bleibt erhalten, Fett-Formatierung ist weg (ein Undo-Schritt genügt) | §5.8 |
| B15 | Redo stellt Fett wieder her | Direkt nach B14: `page.keyboard.press('ControlOrMeta+y')` (Bindung laut `WordEditor.tsx:73`; alternativ `ControlOrMeta+Shift+z` gemäß Zeile 74 in einem zweiten Testlauf) | Fett wieder sichtbar | §5.9 |
| B16 | Gemischte Sequenz (Tippen → Fett an → Tippen → Fett aus → mehrfach Undo) | Wie in Anforderung 2.7 letzter Punkt beschrieben, Schritt für Schritt nachbauen | Jeder Undo-Schritt macht exakt einen Schritt rückgängig, in umgekehrter Reihenfolge, kein Nebeneffekt auf Textinhalt | §2.7 |

#### 3.1.5 Vollständige Rundreise je Format über echten Upload/Download (Anforderung Abschnitt 4)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| B17 | DOCX-Rundreise, echter Upload-Button + `filechooser` | `docxCard(page).getByRole('button', { name: 'Datei hochladen' }).click()` **gleichzeitig mit** `page.waitForEvent('filechooser')` erwarten (statt wie in bestehenden Tests direkt `input.setInputFiles(...)` auf den versteckten Input aufzurufen), `fileChooser.setFiles({ name: 'beispiel.docx', ... })` — siehe 3.4 unten für die Begründung dieser Änderung | Datei importiert (`editor` enthält Originaltext, Wort weiterhin fett), danach unverändert exportieren (`waitForEvent('download')`), heruntergeladene Datei mit JSZip+DOMParser prüfen: fettes Wort weiterhin `<w:b/>`, restlicher Text weiterhin ohne | §5.10, §4.1.1 |
| B18 | ODT-Rundreise, analog | Wie B17, ODT-Karte, `content.xml` prüfen | Analog | §5.10, §4.2.1 |
| B19 | DOCX: neuer Text + Fett, Export, unabhängiger Parser auf **genau den betroffenen Run** | Neues Dokument, zwei Wörter tippen, nur eines fett machen, exportieren | DOMParser-Prüfung: **nur** der `<w:r>` des fetten Worts trägt `<w:b/>`, der Nachbar-Run **nicht** | §4.1.2 |
| B20 | DOCX „Fett aus" nach Rundreise | Fette Datei importieren, Fett-Markierung auf das Wort entfernen, exportieren | `<w:b/>` für diesen Run fehlt in der exportierten Datei | §4.1.4 |
| B21 | Fettes Wort über einen Zeilenumbruch (`Shift+Enter`) hinweg | Wort tippen, `Shift+Enter` einfügen, mehr Text tippen, alles fett machen, exportieren | Fettung bleibt auf beiden Seiten des `hard_break` erhalten (DOMParser-Prüfung beider Runs) | §4.1.5 |
| B22 | Cross-Format einfach: ODT mit Fett importieren → als DOCX exportieren | ODT-Karte, Upload, Karten-übergreifender Export-Test (prüfen, ob die App das erlaubt — falls Formatwechsel beim Export nicht direkt unterstützt wird, stattdessen: Re-Import-Zyklus wie in B23 nutzen) | `<w:b/>` im DOCX-Export vorhanden | §4.1.6 |
| B23 | Reale Fremddatei (DOCX) mit Fettdruck importieren, sichtbar fett | `setInputFiles`/`filechooser` mit einer Datei aus `tests/fixtures/external/docx/` (Kandidat vorab durch Öffnen bestätigen, dass sie sichtbare Fettung per Direktformatierung enthält) | Editor zeigt mindestens ein fettes Wort (visuelle Prüfung über `getComputedStyle`, nicht nur Textinhalt) | §4.1.7 |
| B24 | Reale Fremddatei (ODT), analog | Kandidat aus `tests/fixtures/external/odt/` (z. B. `HelloWorld.odt` als Positivkontrolle, falls Fettung enthalten — sonst gezielt eine Fixture mit bekanntem Bold-Inhalt wählen) | Analog | §4.2.7 |
| B25 | Leerer Listenpunkt/leere Tabellenzelle, Fett umgeschaltet | Liste/Tabelle einfügen, in leerem Punkt/leerer Zelle Fett togglen, ohne Text zu tippen, exportieren | Kein Rendering-Fehler im Editor, kein leerer `<w:r>`/`<text:span>` ohne Inhalt im Export | Grenzfall 3.8 |
| B26 | Fett über Bild-/Tabellengrenze hinweg | Dokument mit Text + Bild (+ Tabelle), `ControlOrMeta+a`, Fett klicken | Kein Absturz/Konsolenfehler; Bild bleibt Bild, Tabellenstruktur bleibt erhalten, nur textuelle Inline-Inhalte werden fett | Grenzfall 3.5 |

#### 3.1.6 Cross-Format-Rundreise (Anforderung 4.3)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| B27 | DOCX → ODT → DOCX | DOCX mit fettem Wort hochladen → als ODT exportieren (Download abfangen) → diese heruntergeladene ODT-Datei erneut über die ODT-Karte hochladen (`download.path()` als `setInputFiles`-Quelle oder erneut per `filechooser`) → als DOCX zurückexportieren | Fettung an derselben Textstelle nach zwei Formatkonvertierungen weiterhin vorhanden (DOMParser-Prüfung auf dem letzten Download) | §5.11, §4.3.1 |
| B28 | ODT → DOCX → ODT | Spiegelbildlich zu B27 | Analog | §5.11, §4.3.2 |

#### 3.1.7 Grenzfall 500er-`font-weight`-Schwelle beim Einfügen (Anforderung Grenzfall 3.6)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| B29 | `font-weight: 499` wird **nicht** als fett erkannt | Im Seitenkontext ein `ClipboardEvent`/`DataTransfer` mit HTML-Payload `<span style="font-weight:499">x</span>` simulieren (`page.evaluate` + `document.dispatchEvent(new ClipboardEvent('paste', ...))` auf den fokussierten Editor, oder Fallback: `execCommand('insertHTML')` im Seitenkontext, falls Clipboard-Permissions in CI fehlen) | Eingefügtes „x" ist **nicht** fett (`getComputedStyle`) | §5.13, Grenzfall 3.6 |
| B30 | `font-weight: 500` wird als fett erkannt | Wie B29 mit `font-weight:500` | Eingefügtes „x" **ist** fett | §5.13, Grenzfall 3.6 |

#### 3.1.8 Sichtprüfung Überschriften-Fettung (Anforderung Grenzfall 2.5/3.4, `fett-code.md` Fehler 4)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| B31 | Ist eine `h1`/`h2`/`h3` im Editor aktuell optisch fett? | Überschrift einfügen, `page.evaluate(() => getComputedStyle(document.querySelector('.ProseMirror h1')).fontWeight)` | Ergebnis hier protokollieren. **Erwarteter Status jetzt laut Abschnitt 0: `400`/`normal`/`inherit`**, nicht `600`/`700` — widerlegt die in `fett-req.md` Zeile 33 zitierte CSS-Regel; bestätigt `fett-code.md` Fehler 4. Nach Umsetzung von `fett-code.md` 4.5 muss dieser Wert auf `700` wechseln. | Grenzfall 2.5/3.4 |
| B32 | Fett-Toggle auf Wort **innerhalb** einer Überschrift | Wort in Überschrift selektieren, Fett togglen | Internes Mark wird gesetzt/entfernt (`aria-pressed` reagiert), visuelle Änderung hängt von B31 ab — Diskrepanz dokumentieren, kein eigenständiger Bug (siehe `fett-req.md` 2.5) | §2.5, §5.14 |
| B33 | Entferntes Mark auf Überschriftentext hebt Stil-Ebene beim Export nicht auf | Wort in Überschrift, Fett explizit entfernen, DOCX exportieren | `<w:rPr>` des betroffenen Runs enthält kein `<w:b/>` mehr, **aber** die Absatzformatvorlage „Heading 1" in `styles.xml` deklariert weiterhin `<w:b/>` auf Stil-Ebene — Word/LibreOffice zeigt die Überschrift dennoch fett. Dokumentiert bewusst redundantes, nicht falsches Verhalten | §2.5 letzter Absatz |

### 3.2 Ergänzende Grenzfall-Tests (Anforderung Abschnitt 3, nicht bereits in Abschnitt 5 enumeriert)

Zur vollständigen Abdeckung aller 11 Grenzfälle aus `fett-req.md` Abschnitt 3
(Abschnitt 5 der Anforderung listet nur eine Teilmenge namentlich): B3/B4 decken
3.9, B10 deckt 3.2, B11 deckt 3.1, B25 deckt 3.8, B26 deckt 3.5, B29/B30 decken 3.6,
B5/B6 decken 3.2/3.3, D6/D7/O4/O5 decken 3.10 auf Unit-Ebene — zusätzlich:

| # | Test | Bezug |
|---|---|---|
| B34 | Grenzfall 3.10 **im Browser** (nicht nur Unit-Test D6): reale Fremddatei mit Zeichenformatvorlagen-Fettung hochladen (siehe B23/B24-Kandidaten), sichtbar prüfen, ob das erwartete Wort im Editor fett erscheint | Grenzfall 3.10, ergänzt D6/O4 um echten Bedienungsnachweis |
| B35 | Grenzfall 3.7 — Regressionstest `selection-regression.spec.ts` bleibt **unverändert** Pflichtbestandteil, „Fett" bleibt auslösender Schritt | Kein neuer Test nötig — siehe 3.5 unten für Bestätigungspflicht nach jeder Toolbar-Änderung |
| B36 | Grenzfall 3.11 — Toggle bei (aktuell nicht existierender) Änderungsverfolgung | Kein Testfall möglich/nötig, solange das Feature laut Backlog fehlt; hier nur als „nicht anwendbar, vermerkt" geführt | 3.11 |

### 3.3 Icon-Rendering-Bewertung (Abnahmekriterium 6)

| # | Test | Schritte | Assertion |
|---|---|---|---|
| B37 | Zugängliche Bezeichnung unabhängig von visueller Umsetzung | `page.getByTitle('Fett')` vorhanden, `aria-label="Fett"` | Muss unabhängig davon grün sein, ob Glyph „F" oder SVG-Icon (Entscheidung aus `fett-code.md` Abschnitt 4.2) |
| B38 | Visuelle Erkennbarkeit (dokumentierend, kein Pass/Fail-Kriterium) | Screenshot des Buttons (`page.getByTitle('Fett').screenshot()`) vor/nach der SVG-Entscheidung ablegen | Manuelle Sichtprüfung, dokumentiert die getroffene Entscheidung aus `fett-req.md` Abnahmekriterium 6 |

### 3.4 Datei-Upload: echter `filechooser`, nicht nur `setInputFiles` auf versteckten Input

**Befund:** Die bestehenden Upload-Tests (`docx.spec.ts`, `odt.spec.ts`) rufen
`input.setInputFiles(...)` **direkt** auf dem versteckten `<input type="file"
className="hidden">` auf (`FormatPicker.tsx:77-89`) und umgehen damit den
sichtbaren „Datei hochladen"-Button, der per `onClick` ein `fileInputs.current[...].click()`
auf genau diesem Input auslöst (`FormatPicker.tsx:62-68`). Das testet, dass
Reader/Formular-Wiring funktioniert, **nicht**, dass ein:e Nutzer:in den
sichtbaren Button erfolgreich bedienen kann. Für „echte Bedienung" im Sinne dieses
Auftrags gehört mindestens **ein** Testfall pro Format, der den tatsächlichen
Klickpfad nutzt:

```ts
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  docxCard(page).getByRole('button', { name: 'Datei hochladen' }).click(),
])
await fileChooser.setFiles({ name: 'beispiel.docx', mimeType: '...', buffer })
```

Umsetzung in B17/B18 oben. Die bestehenden `setInputFiles`-Tests bleiben zusätzlich
als schnellere Variante bestehen (kein Widerspruch, nur Ergänzung).

### 3.5 Bestehende Tests, die unverändert weiterlaufen müssen

- `tests/e2e/selection-regression.spec.ts` (alle 3 Tests) — **Pflichtbestandteil**,
  nicht optional (Abnahmekriterium 5). Nach jeder Änderung an `Toolbar.tsx` (Fehler
  1/2-Fix) erneut ausführen: `getByTitle('Fett').click()` löst bei Playwright die
  volle `mousedown`→`mouseup`→`click`-Sequenz aus, bleibt also mit einem
  zusätzlichen `onClick`-Handler kompatibel — muss aber nach dem Fix **tatsächlich**
  erneut grün laufen, nicht nur angenommen werden.
- `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts` — bleiben bestehen; ihre
  Fett-Assertionen werden durch `bold.spec.ts` (B1–B38) fachlich abgelöst, aber
  nicht gelöscht, solange sie andere Aspekte (Upload, Edit-nach-Upload) mit
  abdecken, die nicht rein Fett-bezogen sind.
- `tests/e2e/lifecycle.spec.ts` — unverändert, keine Fett-Berührung erwartet, aber
  Teil der Dauer-Suite und muss grün bleiben.

### 3.6 Unabhängige Prüfung der heruntergeladenen Datei (nicht nur `.toContain`)

Anforderung 4.1.2 verlangt explizit einen „unabhängigen Parser" statt reiner
String-Suche. Bestehende Tests verwenden bislang nur `expect(documentXml).toContain('<w:b/>')`
(String-Ebene). Für die in diesem Plan neu geforderten strukturellen Prüfungen
(B12, B13, B19, B20 u. a.) wird empfohlen:

```ts
import { JSDOM } from 'jsdom' // bereits Devdependency, kein neues Package nötig
const parser = new JSDOM('').window.DOMParser()
const xmlDoc = parser.parseFromString(documentXml, 'application/xml')
const run = [...xmlDoc.getElementsByTagNameNS(W_NS, 'r')].find((r) => r.textContent === 'Testdokument')
const rPr = run?.getElementsByTagNameNS(W_NS, 'rPr')[0]
expect(rPr?.getElementsByTagNameNS(W_NS, 'b').length).toBe(1)
```

Dies stellt sicher, dass die Prüfung **strukturell** ist (richtiges Element im
richtigen Run) statt nur „die Zeichenkette `<w:b/>` kommt irgendwo in der Datei
vor" — relevant z. B. für B19 (nur der betroffene Run, nicht der Nachbar-Run, darf
`<w:b/>` tragen).

### 3.7 Cross-Browser-Matrix

| Testgruppe | Desktop Chrome | Mobile (Pixel 7) | Tablet (iPad Mini) | Anmerkung |
|---|---|---|---|---|
| Klick-basierte Tests (B1, B4, B5, B7, B8, B12–B28, B31–B34) | Pflicht | Pflicht | Pflicht | `.click()` funktioniert projektunabhängig |
| Tastatur-only-Tests (B2, B3, B14–B16) | Pflicht | Best-effort/dokumentieren | Best-effort/dokumentieren | Touch-Geräte ohne Hardware-Tastatur — `page.keyboard.press` funktioniert in Playwright unabhängig vom simulierten Gerät (sendet CDP-Events), reales Nutzer:innen-Verhalten auf Touch-Geräten ist aber ein zu dokumentierender Sonderfall, kein Testausschluss |
| Undo/Redo (B14–B16) | Pflicht | Pflicht | Pflicht | Tastenkombination bleibt via `page.keyboard` unabhängig vom Projekt auslösbar |

---

## 4. Traceability-Matrix (Anforderung Abschnitt 5 → Testfall)

| `fett-req.md` §5, Punkt | Testfall(e) in diesem Plan |
|---|---|
| 1 | B1 |
| 2 | B2 |
| 3 | B5 |
| 4 | B7 |
| 5 | B8, B9 |
| 6 | B12 |
| 7 | B13 |
| 8 | B14 |
| 9 | B15 |
| 10 | B17, B18 |
| 11 | B27, B28 |
| 12 | Bestehender `selection-regression.spec.ts` (3.5) |
| 13 | B29, B30 |
| 14 | B31, B32 |

---

## 5. Erwarteter Ist-Status je neuem Testfall (vor Umsetzung von `fett-code.md`)

| Status | Testfälle | Grund |
|---|---|---|
| **Erwartet ROT** (dokumentiert bestätigten Bug) | B3, B6, B9 (ggf.), D5, D6, D7 (blockiert), O4, O5, B31 (Wert weicht von Anforderungstext ab, kein Bug im engeren Sinn, aber Abweichung von der in `fett-req.md` zitierten Grundannahme) | Fehler 1–4 und Lücken A/B, siehe Abschnitt 0 |
| **Erwartet GRÜN** (sollte mit aktuellem Code bereits bestehen) | B1, B2, B4, B5, B7, B8, B10, B11, B12, B13, B14–B16, B17–B28 (Grundfunktion Rundreise), B29, B30, B32, B33, B34 (falls Fixture keine Zeichenformatvorlage nutzt), B35–B38, D1–D4, D8, O1–O3, X1, X2 | Basiert auf unverändertem, bereits funktionierendem Reader/Writer/Toggle-Grundverhalten |
| **Abhängig von Design-Entscheidung** | B31/B32/B33 (Ausgang), B37/B38 (Icon-Entscheidung) | `fett-code.md` Abschnitt 5 — Ergebnis erst nach Entscheidung endgültig einzutragen |

Sobald `fett-code.md` Abschnitt 4 (Fixes) umgesetzt ist, müssen B3, B6, B9, D5, D6,
D7, O4, O5 von ROT auf GRÜN wechseln — das ist der konkrete, maschinell prüfbare
Nachweis, dass die Fixes wirken (nicht nur Code-Review).

---

## 6. Abgleich mit Abnahmekriterien (`fett-req.md` Abschnitt 6)

| DoD-Punkt | Abdeckung in diesem Testplan |
|---|---|
| 1. Alle Testfälle aus Anforderung §5 real im Browser ausgeführt, grün | Abschnitt 3.1 (B1–B33) + Traceability-Matrix Abschnitt 4 |
| 2. Rundreise-Anforderungen §4 durch unabhängigen Parser/Re-Import bestätigt | B12, B13, B17–B28, D-Reihe, O-Reihe, X1/X2, Abschnitt 3.6 |
| 3. Alle Grenzfälle §3 einzeln geprüft und dokumentiert | Abschnitt 3.2 (B34–B36) + Verweise in Abschnitt 3.1 je Grenzfall |
| 4. Offene Frage §2.5 beantwortet | B31, B32, B33 — Ergebnis hier und in `fett-req.md`/`fett-code.md` nachzutragen, sobald ausgeführt |
| 5. Regressionstest Selection-Sync bleibt Pflichtbestandteil | Abschnitt 3.5 |
| 6. Icon-Rendering-Risiko bewertet | Abschnitt 3.3 (B37, B38) |

---

## 7. Ausführungsreihenfolge (Vorschlag)

1. Unit-Tests D5, D6, O4, O5 (Abschnitt 2) zuerst schreiben und **bewusst rot**
   laufen lassen — dient als Ausgangsnachweis, dass die in Abschnitt 0 behaupteten
   Bugs real und reproduzierbar sind, bevor irgendetwas gefixt wird.
2. `bold.spec.ts` B1–B11 (Bedienung/Zustand) — deckt Fehler 1/2 sichtbar auf.
3. `bold.spec.ts` B12–B26 (Formate/Export/Rundreise einfach).
4. `bold.spec.ts` B27–B28 (Cross-Format) + `cross-format-roundtrip.test.ts` (X1/X2).
5. `bold.spec.ts` B29–B33 (Grenzfälle Font-Weight/Überschrift) + `schema.test.ts`.
6. `bold.spec.ts` B34–B38 (verbleibende Grenzfälle/Icon).
7. Nach Umsetzung von `fett-code.md`: alle als „ROT erwartet" markierten Fälle
   erneut ausführen, Statuswechsel auf GRÜN dokumentieren; `selection-regression.spec.ts`
   zusätzlich erneut laufen lassen (Abschnitt 3.5).
8. Traceability-Matrix (Abschnitt 4) und DoD-Abgleich (Abschnitt 6) final
   gegenprüfen, bevor der Backlog-Status auf „verifiziert" geändert wird.

---

## 8. Offene Punkte für QA

- B22 (Cross-Format-Export direkt aus einer Karte heraus) hängt davon ab, ob die
  UI überhaupt einen Formatwechsel beim Export aus derselben Karte erlaubt oder ob
  dafür zwingend der Umweg über Re-Import in die jeweils andere Karte nötig ist
  (wie in B27/B28 beschrieben) — vor Testimplementierung an der UI verifizieren.
- B23/B24/B34 benötigen vorab eine manuelle Sichtung der genannten Fixture-Dateien
  (Dateiname allein ist keine Garantie für den tatsächlichen Inhalt) — vor
  Testimplementierung `unzip`/`content.xml` der Kandidaten prüfen.
- B29/B30 (Clipboard-Paste-Simulation) können je nach Playwright-/Browser-Version
  und CI-Sandbox-Einstellungen für Zwischenablage-Berechtigungen instabil sein;
  Fallback auf `execCommand('insertHTML')` im Seitenkontext vorsehen, falls
  `ClipboardEvent`-Konstruktion in CI blockiert wird.
- B31/B32/B33 hängen von der noch offenen Design-Entscheidung aus `fett-code.md`
  Abschnitt 5 ab; Endergebnis ist nach Entscheidung sowohl hier als auch in
  `fett-req.md` Abschnitt 2.5/Abnahmekriterium 4 nachzutragen.
