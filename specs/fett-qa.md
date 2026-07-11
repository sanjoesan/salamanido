# QA-Testplan: Feature „Fett"

Rolle: QA-Antwort auf `specs/fett-req.md` (Anforderung) und `specs/fett-code.md`
(Entwicklerplan). Dieses Dokument nimmt **keinen** der beiden Vorgängertexte als
bewiesen an — auch `fett-code.md` ist laut eigenem Titel ein *Plan*, keine
verifizierte Umsetzung („Kein Punkt hier ist bereits umgesetzt"). Jede Behauptung
aus beiden Dokumenten wird hier auf einen konkreten, ausführbaren Testfall
abgebildet. Ergebnis ist ein Testplan, kein Testbericht — die Tests sind zum
Zeitpunkt dieses Dokuments größtenteils **noch nicht geschrieben** (siehe Abschnitt
7, Spalte „Erwarteter Status").

Alle Abschnitts- und Zeilennummern in diesem Dokument sind gegen den **aktuellen**
Code (`fett-req.md`/`fett-code.md` in der Fassung mit deren jeweiligem Abschnitt 0
„Korrekturen") sowie durch direktes Lesen der Quelldateien verifiziert. Verweise auf
`fett-req.md`-Abschnitte folgen dessen **aktueller** Gliederung: §2 = Bedienelemente,
§3 = gewünschtes Verhalten (3.1–3.7), §4 = Defekte A–D, §5 = Grenzfälle (1–14),
§6 = Rundreise (6.1–6.4), §7 = E2E-Testfälle (1–15), §8 = Abnahmekriterien (7 Punkte).

---

## 0. QA-Gegenkontrolle des Ist-Codes (direkt gelesen, nicht aus den Vorgängerdokumenten übernommen)

Die vier Defekte A–D aus `fett-req.md` §4 und die Import-Lücken wurden direkt im
Code nachvollzogen. Verifizierte Fundstellen (aktuell, gegen frühere QA-Fassung
korrigiert — die alte Fassung trug um 50–70 Zeilen verschobene Nummern):

| Behauptung | QA-Gegenkontrolle (gelesen) | Ergebnis |
|---|---|---|
| Defekt A: Button nur `onMouseDown`, kein `onClick`/`onKeyDown` | `Toolbar.tsx:76-79` (in `MarkButton`, 55-89) | **Bestätigt.** `onMouseDown` mit `e.preventDefault()` → `run(view, toggleMark(markType))`. Kein `onClick`, kein `onKeyDown`. Ein natives `<button>` feuert bei Tab-Fokus + Enter/Space **kein** `mousedown` → Button per Tastatur nicht auslösbar. |
| Defekt B: `active` ignoriert `storedMarks` und Gesamtselektion | `Toolbar.tsx:69` | **Bestätigt.** `const active = markType.isInSet(view.state.selection.$from.marks()) !== undefined` — kein `state.storedMarks`, nur `$from` (Selektionsanfang), keine Voll-Deckungs-Prüfung. |
| Defekt C: DOCX-Reader ignoriert `@w:val` an `<w:b>` | `docx/reader.ts:103` (in `marksFromRunProperties`, 100-115) | **Bestätigt.** `if (firstChildNS(rPr, OOXML_NAMESPACES.w, 'b')) marks.push({ type: 'strong' })` — reine Existenzprüfung. Kontrast: Unterstrichen `:106` prüft `getAttributeNS(..., 'val') !== 'none'`. Inkonsistenz im selben Block belegt. |
| Defekt D: keine `.ProseMirror h1..h6 { font-weight }`-Regel | `src/index.css` (per Grep geprüft) | **Bestätigt.** Einzige `font-weight`-Regel betrifft `.ProseMirror th`; keine `h1`–`h6`-Regel. Tailwind-Preflight setzt Überschriften auf Gewicht 400. |
| Lücke A: DOCX `w:rStyle` (Zeichenformatvorlage) nicht aufgelöst | `docx/reader.ts:100-115` liest nur `w:rPr` | **Plausibel bestätigt** (kein `w:rStyle`-Handling im Run-Dekoder). Wird per synthetischer Fixture abgesichert (D6/D7). |
| Lücke B: ODT-Reader liest nur `office:automatic-styles`, kein `office:styles`/`style:parent-style-name` | `odt/reader.ts:52` prüft `=== 'bold'` (Literal) | **Bestätigt** (Literal-Vergleich; numerische/vererbte/benannte Gewichte gehen verloren). Abgesichert per O4/O5 + verifizierter realer Fixture. |

Zusätzlich korrigiert gegenüber der vorherigen QA-Fassung:
- `selection-regression.spec.ts` hat **vier** Fett-Tests (`:14,43,61,88`), nicht drei.
- Fett-Button liegt auf `Toolbar.tsx:184`, nicht `:135`; Aktiv-Zustand `:69`, nicht `:42`.
- Redo-Bindungen liegen auf `WordEditor.tsx:94` (`Mod-y`) und `:95` (`Mod-Shift-z`);
  Undo `Mod-z` auf `:93`; `Mod-b` auf `:98`; `dispatchTransaction` auf `:125`,
  `tr.docChanged`-Gate auf `:128`, `forceRender` auf `:131`. Das sind die
  **Post-Cut-Merge**-Zeilen (deckungsgleich mit `fett-req.md` §1 und `fett-code.md` §0).
  Die vorherige QA-Fassung trug hier die veralteten Vor-Cut-Nummern `:86/:87/:90`/`:123`
  — der Cut-Merge hat `WordEditor.tsx` um ~8 Zeilen nach unten geschoben. Alle
  Verweise unten sind auf die realen HEAD-Zeilen korrigiert.
- Der „Datei hochladen"-Button existiert real (`FormatPicker.tsx:77-83`) und löst
  `fileInputs.current[id]?.click()` (`:79`) auf den versteckten Input (`:92-104`) aus —
  der `filechooser`-Pfad (Abschnitt 5.10) ist damit echt bedienbar.

Konsequenz: Alle Defekt-/Lücken-Punkte werden unten als **aktuell rot erwartete**
Regressionstests geführt (dokumentieren den Bug bis `fett-code.md` §4 umgesetzt ist),
nicht als hypothetische Grenzfälle.

---

## 1. Testumgebung und verifizierte Konventionen

- **Unit-Tests:** `npm test` (Vitest, `jsdom`-Environment). Dateien liegen in
  `src/formats/**/__tests__/`.
- **E2E-Tests:** `npm run test:e2e` (Playwright, `playwright.config.ts`):
  - `baseURL: 'http://localhost:4173/salamanido/'`; `webServer` baut + startet
    `vite preview` automatisch (`playwright.config.ts:13-26`).
  - **Drei Vollsuite-Projekte** (`:34-36`): **Desktop Chrome**, **Mobile** (`Pixel 7`,
    Chromium), **Tablet** (`iPad Mini`, WebKit). Jeder neue Fett-Testfall muss in allen
    drei grün sein.
  - **Firefox** und **Desktop Safari** laufen nur auf `clipboard.*.spec.ts`
    (`:37-53`, `testMatch`). Für `fett-req.md` §7.15 (Strg+B auf Nicht-Chromium) ist
    daher eine bewusste Konfig-Erweiterung nötig — siehe Abschnitt 4.9.
- **Verifizierte Selektoren/Handlungen** (aus `docx.spec.ts`/`odt.spec.ts`/
  `selection-regression.spec.ts` übernommen; in neuen Tests identisch verwenden):
  - Start + Privacy-Banner: `page.goto('/')`, dann
    `page.getByRole('button', { name: /verstanden/i }).click()`.
  - Karte: `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })` bzw. `'OpenDocument Text (.odt)'`.
  - Neues Dokument: `…getByRole('button', { name: 'Neu erstellen' }).click()`.
  - Editor: `page.locator('.ProseMirror')`.
  - Fett-Button: `page.getByTitle('Fett')` (`title` **und** `aria-label` = „Fett",
    `Toolbar.tsx:73-74,184` — eindeutig, nur der `strong`-Button trägt diesen Titel).
  - Weitere Mark-Buttons: `getByTitle('Kursiv')`, `getByTitle('Unterstrichen')`,
    `getByTitle('Durchgestrichen')`.
  - Export: `page.getByRole('button', { name: 'Exportieren' })` + `page.waitForEvent('download')` + `download.path()` + `fs.readFile`.
  - Zurück zum Picker (für Re-Import): `page.getByRole('button', { name: /formate/i }).click()`.
  - Datei-Upload (schnell): `card.locator('input[type="file"]').setInputFiles({ name, mimeType, buffer })`.
  - Datei-Upload (echter Klickpfad): `filechooser`, siehe Abschnitt 4.10/5.10.
- **DOCX-MIME:** `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- **Unabhängige Validierer im Projekt** (keine neue Dependency):
  - `jszip` (Download entpacken), `jsdom`-`DOMParser` (strukturelles XML-Parsen),
  - `mammoth` (DOCX→HTML, in `docx/__tests__/external-validation.test.ts` etabliert),
  - `xmllint-wasm` gegen `tests/fixtures/external/odf-schema/OpenDocument-v1.3-schema.rng`
    (in `odt/__tests__/external-validation.test.ts` etabliert).

---

## 2. Determinismus-Regeln (BINDEND für alle E2E-Tests dieses Plans)

Diese Regeln sind nicht optional. Der Editor synchronisiert Selektions- und
`storedMarks`-Zustand teils **asynchron**; zu schnelle, aufeinanderfolgende
Tastatureingaben haben in genau diesem Repo bereits zu flakigen Tests geführt
(insbesondere im **Mobile/Pixel-7-Projekt**; behoben u. a. in
`selection-regression.spec.ts` und `cut.spec.ts`). Jeder neue Fett-Test muss diesen
Mustern folgen.

### R1 — Selektions-Sync nach nativem Caret-Move abwarten
Nach jeder Aktion, die den Cursor **nativ** verschiebt (Klick zum Platzieren,
`End`/`Home`, `ArrowLeft/Right`), und **vor** der nächsten dispatchenden Eingabe
(`Enter`, `type(...)`, die an der neuen Position landen muss) ist der bereits
etablierte Sync-Puffer einzufügen:

```ts
await page.keyboard.press('End')
// ProseMirror lernt einen nativen, tastaturgetriebenen Caret-Move nur über das
// asynchrone `selectionchange`-Event. Ein sofort danach gefeuertes `Enter`/`type`
// (ohne menschliche Reaktionszeit) kann dem Sync vorauslaufen und noch auf der
// alten Position wirken. Kurzes Warten gibt dem laufenden Sync Zeit zu landen —
// identisch zum Muster in selection-regression.spec.ts:27-34,71-72,102-103.
await page.waitForTimeout(50)
await page.keyboard.press('Enter')
```

Gilt insbesondere für B14/B16 (Undo-Sequenzen), B5/B10 (Caret-Positionierung) und
jede Rundreise, die nach Upload erst den Cursor umsetzt und dann tippt.

### R2 — Zustands-Assertions immer auto-retrying, nie als Momentaufnahme
`aria-pressed` und `font-weight` reflektieren erst nach dem Toolbar-Re-Render
(`WordEditor.tsx:131` `forceRender` in `dispatchTransaction` `:125`, läuft nach jedem
`view.updateState` — bei **jeder** Transaktion inkl. reiner Selektions-/
`storedMarks`-Transaktion, unabhängig vom `tr.docChanged`-Gate `:128`). Deshalb **nie** per
einmaligem `getAttribute`/`page.evaluate`-Snapshot prüfen, sondern ausschließlich
über web-first, automatisch wiederholende Assertions, die auf das Re-Render warten:
- `await expect(page.getByTitle('Fett')).toHaveAttribute('aria-pressed', 'true')`
- `await expect(editor.locator('strong')).toHaveCSS('font-weight', '700')`
- `await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('.ProseMirror strong')!).fontWeight)).toBe('700')`

### R3 — Fokus vor Tastatur-Aktivierung explizit sicherstellen
Im Tastatur-Fokus-Pfad (B3) **nicht** eine feste Anzahl `Tab` annehmen. Entweder
`page.getByTitle('Fett').focus()` verwenden oder in einer Schleife `Tab` drücken bis
`await expect(page.getByTitle('Fett')).toBeFocused()` gilt, erst dann `Enter`/`Space`.

### R4 — `waitForTimeout` nur als gezielter Sync-Puffer, nicht als allgemeine Krücke
`waitForTimeout(50)` ist ausschließlich für den dokumentierten Selektions-Sync (R1)
erlaubt. Alle anderen Wartepunkte laufen über auto-retrying Assertions
(`toBeVisible`, `toContainText`, `toHaveAttribute`). Kein `waitForTimeout` als Ersatz
für eine fehlende Assertion.

### R5 — Fehlerüberwachung während des ganzen Tests
Jeder E2E-Test registriert vor der ersten Handlung
`page.on('pageerror', (e) => pageErrors.push(String(e)))` (Muster
`docx.spec.ts:256-257,342`) und prüft am Ende `expect(pageErrors).toEqual([])`.
Deckt „kein Absturz"-Grenzfälle (B11, B25, B26) ohne Zusatztest ab.

### R6 — Determinismus-Gate: Mobile-Projekt
Ein Fett-Test gilt erst als deterministisch, wenn er auf dem **Mobile (Pixel 7)**-
Projekt stabil grün ist (dort traten die historischen Sync-Races auf). CI läuft mit
`retries: 1` (`playwright.config.ts:7`) — ein Test, der nur *mit* Retry grün wird,
ist als flaky zu behandeln und nach R1–R4 nachzubessern, nicht zu akzeptieren.

---

## 3. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

**Zweck:** Schnelle, browserunabhängige Absicherung der Datenebene (Mark ⇄ XML),
komplett entkoppelt von den UI-Defekten A/B. Testet ausschließlich
`writeDocx`/`readDocx`/`writeOdt`/`readOdt`/`wordSchema` direkt — **keine** Playwright-
Interaktion.

### 3.1 Bestandsaufnahme (vorhanden, als Basisschutz erhalten, nicht ersetzen)

| Datei | Deckt ab |
|---|---|
| `src/formats/docx/__tests__/roundtrip.test.ts` | Grundfall Fett/Kursiv/Unterstr./Durchgestr. unabhängig; „preserves combined marks" (Ansatz, in 3.2 erweitert) — §3.4 |
| `src/formats/odt/__tests__/roundtrip.test.ts` | analog — §3.4 |
| `src/formats/{docx,odt}/__tests__/external-fixtures.test.ts` | Import vieler Fremddateien, bisher nur „stürzt nicht ab" — Teilabdeckung §6.1.6/§6.2.6 (in 3.4 um gezielte Bold-Assertion erweitert) |
| `src/formats/{docx,odt}/__tests__/external-validation.test.ts` | unabhängige Validierung (mammoth / xmllint-wasm) — Basis für 3.5 |

### 3.2 `src/formats/docx/__tests__/roundtrip.test.ts` (erweitert)

| # | Testfall | Vorgehen | Erwartung | Bezug |
|---|---|---|---|---|
| D1 | Toggle „aus" bleibt „aus" | Doc mit Run **ohne** `strong` → `writeDocx` → `readDocx` | Kein `<w:b/>` im Export, kein `strong` nach Re-Import | §6.1.4 |
| D2 | Fett+Kursiv+Unterstrichen auf **einem** Run | Text-Node `marks:[strong,em,underline]` → `writeDocx` → `document.xml` per DOMParser | Genau **ein** `<w:r>`, dessen `<w:rPr>` alle drei Kindelemente (`w:b`,`w:i`,`w:u`) trägt; kein Run-Split | §6.1.3 |
| D3 | Fett über `hard_break` | Content `text(fett) → hard_break → text(fett)` | Nach Rundreise beide Text-Nodes weiter `strong` | §6.1.5 |
| D4 | Reihenfolge-Unabhängigkeit | Zweimal derselbe Inhalt, `marks:[color,strong]` vs. `[strong,color]` → `writeDocx` | Resultierendes `<w:rPr>` als **Kindelement-Menge** identisch (ProseMirror normalisiert Mark-Reihenfolge nach Schema-Rang → `JSON.stringify`-Merge in `writer.ts` stabil) | §3.4 |
| D5 | **Regression Defekt C** — `<w:b w:val="0"/>` (Bold-aus-Override) | Rohes DOCX per JSZip (wie `docx.spec.ts:buildSampleDocx`), Run mit `<w:rPr><w:b w:val="0"/></w:rPr>` → `readDocx` | **Kein** `strong`. Zusätzlich `"false"`/`"off"` als Varianten. **Jetzt ROT** bis `isOnOffTrue` (code §4.6) | §5.7, Defekt C |
| D5b | Nicht-Regression zu D5 | `<w:b/>` ohne `@val` → `readDocx` | Weiterhin `strong` | Defekt C (Absicherung) |
| D6 | **Regression Lücke A** — Fett nur via `w:rStyle` | Rohes DOCX: `styles.xml` mit `<w:style w:type="character" w:styleId="StrongChar"><w:rPr><w:b/></w:rPr></w:style>`, Run mit `<w:rStyle w:val="StrongChar"/>` ohne direktes `<w:b/>` | `strong` gesetzt (aus Vorlage geerbt). **Jetzt ROT**. Zweite Variante mit `w:basedOn`-Vererbung | §5.8 |
| D7 | Direktformatierung schlägt Zeichenformatvorlage | Wie D6 **plus** direktes `<w:b w:val="0"/>` am Run | **Kein** `strong` (Direktvorrang). Sinnvoll erst schreibbar, wenn D5+D6 grün — bis dahin „blockiert" | §5.8, code §4.6 |
| D8 | Leerer Absatz, kein Text | `doc([{type:'paragraph', content:[]}])` → `writeDocx` | Kein leerer `<w:r>` für diesen Absatz, kein Wurf (`storedMarks` sind nicht Teil von `doc.toJSON()`) | §5.11 |

### 3.3 `src/formats/odt/__tests__/roundtrip.test.ts` (erweitert)

| # | Testfall | Vorgehen | Erwartung | Bezug |
|---|---|---|---|---|
| O1 | Toggle „aus" bleibt „aus" | analog D1 | Kein `fo:font-weight="bold"`-Bezug mehr | §6.2.5 |
| O2 | Zwei identische Markkombinationen → **eine** Stildefinition | `doc([paragraph('a',…,[strong]), paragraph('b',…,[strong])])` → `writeOdt` → `content.xml` | Genau **ein** `<style:style style:family="text">` mit `fo:font-weight="bold"`; beide `text:span` referenzieren denselben Namen (Dedup `styleRegistry.ts`) | §6.2.3 |
| O3 | Fett + Hervorhebung kombiniert | Run `marks:[strong,highlight]` → `writeOdt` | **Eine** Stildefinition trägt beide Eigenschaften, keine zwei geschachtelten `text:span` | §6.2.4 |
| O4 | **Regression Lücke B** — Stil aus `office:styles` | Rohes ODT: `styles.xml` `office:styles` mit `<style:style style:name="Strong" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>`, `content.xml`-`text:span` referenziert `Strong` | `strong` gesetzt. **Jetzt ROT** | §5.9 |
| O5 | **Regression Lücke B (Vererbung)** — `style:parent-style-name` | Automatischer Stil ohne eigenes `fo:font-weight`, aber `style:parent-style-name="Strong"` (auf O4-Stil) | `strong` trotzdem gesetzt (Vererbungskette aufgelöst). **Jetzt ROT** | §5.9 |
| O6 | **Regression Lücke C** — numerisches `fo:font-weight` | Automatischer Stil mit `fo:font-weight="700"` bzw. `"499"`/`"normal"` | `700` → `strong`; `499`/`normal` → kein `strong`. **`700`-Fall jetzt ROT** (Literal-Vergleich `reader.ts:52`) | §5.10 |

### 3.4 `external-fixtures.test.ts` (DOCX + ODT, gezielte Bold-Assertion ergänzt)

Aktuell nur „importiert ohne Absturz". Ergänzen um eine **gezielte** `strong`-Assertion
auf mindestens einer Fixture mit **verifiziertem** Stil-Fett-Inhalt (Inhalt vor
Verwendung entpacken/parsen — Dateiname ist keine Garantie):
- **ODT (verifiziert geeignet):**
  `tests/fixtures/external/odt/sameLocationSpansUsingMultipleTemplateStyles_BOLD-Outer-ITALIC-Inner-Text-Yellow.odt`
  — benannter Text-Stil `BOLD` in `office:styles`, `content.xml` enthält **null**
  direkte `font-weight="bold"` und nutzt `style:parent-style-name`. Nach Umsetzung von
  code §4.8 muss der `outer`-Textlauf `strong` tragen. **Jetzt ROT** (Lücke B).
- **DOCX:** Laut `fett-code.md` §0 ist **keine** reale Fixture für Fett-via-`w:rStyle`
  verifiziert (0/19 `rStyle`-Fixtures betreffen Fett). Daher bleibt DOCX-Stil-Fett bei
  der **synthetischen** Fixture D6; eine reale DOCX-Fixture mit Fett per
  **Direktformatierung** dient nur als Positivkontrolle (Kandidat vorab durch Öffnen
  bestätigen), §6.1.6.

### 3.5 Unabhängige Validierung — `external-validation.test.ts` (erweitert), Anforderung §6.4

| # | Testfall | Werkzeug | Erwartung |
|---|---|---|---|
| V1 | DOCX-Export mit Fett unabhängig gegenlesen | `mammoth.convertToHtml` auf einen selbst erzeugten Fett-Export | Ziel-Textlauf wird als fett erkannt (`<strong>`/`font-weight:bold` im mammoth-HTML) — beweist, dass nicht Reader- und Writer-Fehler sich gegenseitig aufheben |
| V2 | ODT-Export mit Fett schema-validieren | `xmllint-wasm` gegen `OpenDocument-v1.3-schema.rng` | `content.xml` ist **valide** und enthält `fo:font-weight="bold"` in einer automatischen Text-Formatvorlage (`style:family="text"`) |

### 3.6 Neu: `src/formats/shared/__tests__/cross-format-roundtrip.test.ts`, Anforderung §6.3

Cross-Format ist per UI **nicht** möglich (Zielformat beim Export nicht wählbar,
`speichern-unter-format` fehlt) und darf laut §6.3/§7.14 **ausdrücklich nicht** als
E2E-Test formuliert werden. Prüfung deshalb nur auf Code-Ebene:

| # | Testfall | Vorgehen | Erwartung |
|---|---|---|---|
| X1 | DOCX-Start → ODT | `json = readDocx(writeDocx(doc_mit_fett))`, dann `readOdt(writeOdt(json))` | `strong`-Mark an derselben Textposition nach beiden Konvertierungen erhalten |
| X2 | ODT-Start → DOCX | Spiegelbildlich | s. o. |

### 3.7 Neu: `src/formats/shared/__tests__/schema-bold.test.ts`, Grenzfall §5.6

500er-`font-weight`-Grenze der `parseDOM`-Regel `/^(bold|[5-9]\d{2,})$/` (`schema.ts`)
isoliert absichern — ergänzt, ersetzt **nicht** den echten Paste-Test B29/B30:
- `400`/`normal`/`499`/`bolder` → **kein** `strong`.
- `500`/`999`/`bold` → `strong`.
- `<b>`/`<strong>` ohne Style → `strong` (Grundfall).

Umsetzung: `DOMParser.fromSchema(wordSchema).parse(<HTML-Fragment>)` (ProseMirror,
jsdom-Environment) und resultierendes Dokument auf `strong` prüfen.

### 3.8 `src/formats/shared/editor/__tests__/commands.test.ts` (erweitert), Defekt B / code §6.2

Die Datei existiert (testet `canCut`/`cutSelection`) — noch **kein** `isMarkActive`.
Ergänzen (setzt voraus, dass code §4.1 `isMarkActive` in `commands.ts` einführt;
bis dahin **ROT**):
- Leere Selektion **mit** `storedMarks:[strong]` → `true`.
- Leere Selektion **ohne** `storedMarks`, Cursor in fettem Text → `true`.
- Vollständig fette Selektion → `true`.
- Halb fette Selektion → **`false`** (nicht `rangeHasMark`/„irgendeine Stelle").
- Selektion über ein `image`/eine Tabellenzelle hinweg → kein Absturz, Nicht-Text-Knoten übersprungen (§5.5 auf Command-Ebene).

---

## 4. Teil B — Echte Playwright-Browser-Tests (`tests/e2e/bold.spec.ts`)

**Grundsatz (bindend):** Kein Testfall in Teil B darf durch direkten Aufruf interner
Funktionen (`toggleMark`, `isMarkActive`, `readDocx`, …) im Node-Kontext ersetzt
werden. Jeder Fall läuft über echte Nutzer:innen-Handlungen: `locator.click()`,
`page.keyboard.press/type`, `input.setInputFiles`/echtes `filechooser`-Event,
`page.waitForEvent('download')` + Auslesen der heruntergeladenen Datei vom
Dateisystem. Alle Fälle beachten Abschnitt 2 (Determinismus).

Neue Datei `tests/e2e/bold.spec.ts`, `describe` je Themenblock, ein `test` je Zeile.
`beforeEach`: `goto('/')` → Privacy-Banner → je nach Block „Neu erstellen" der
passenden Karte. `pageErrors`-Überwachung nach R5 in jedem Test.

### 4.1 Bedienung: Maus **und** Tastatur (§2 Bedienelemente, §4 Defekt A)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| B1 | Klick setzt Fett auf Selektion | Text tippen, `ControlOrMeta+a`, `getByTitle('Fett').click()` | `expect(getByTitle('Fett')).toHaveAttribute('aria-pressed','true')` **und** `expect(editor.locator('strong')).toHaveCSS('font-weight','700')` (R2) | §7.1 |
| B2 | Identisch per `Strg+B`/`Cmd+B` | Text tippen, `ControlOrMeta+a`, `keyboard.press('ControlOrMeta+b')` | wie B1 | §7.2 |
| B3 | **Reiner Tastatur-Fokus-Pfad** (Regression Defekt A) | Selektion per `Shift+`-Pfeil setzen, dann `getByTitle('Fett').focus()`, `toBeFocused()` (R3), `keyboard.press('Enter')`; separater Testlauf mit `keyboard.press(' ')` | Fett wird angewendet (`aria-pressed`/`font-weight`). **Jetzt ROT** (kein `onClick`) → nach code §4.2 grün | §7.3, Defekt A |
| B4 | Kein Doppel-Toggle bei schneller Bedienung (§5.12) | Selektion, `getByTitle('Fett').click()` **zweimal** ohne Wartepause | Nach zwei echten Toggles ist Fett wieder **aus** (`aria-pressed`→`false`), Text nicht fett — kein drei-/einmaliges Feuern | §5.12 |

### 4.2 Toggle-Verhalten und Zustandsanzeige (§3.1–3.3, §5.1–5.3, §4 Defekt B)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| B5 | Fett ohne Selektion, dann tippen | Cursor ans Textende (kein Selektion), `getByTitle('Fett').click()`, `keyboard.type('neu')` | „neu" ist fett (R2: `expect(editor.locator('strong')).toHaveText('neu')`/`toHaveCSS`), Alttext bleibt nicht-fett | §7.4, §3.2 |
| B6 | **Button sofort „gedrückt" nach Aktivieren an leerer Schreibmarke, vor dem Tippen** (Regression Defekt B) | Cursor setzen (kein Selektion), `getByTitle('Fett').click()`, **vor** dem nächsten Tastendruck prüfen | `expect(getByTitle('Fett')).toHaveAttribute('aria-pressed','true')`. **Jetzt ROT** (`active` liest nur `$from.marks()`, nicht `storedMarks`) → nach code §4.1/§4.2 grün | §7.4, §3.3, Defekt B |
| B7 | Fett auf voll fette Selektion → entfernt | Text, fett, erneut voll selektieren, `getByTitle('Fett').click()` | Text nicht mehr fett, `aria-pressed`→`false` | §7.5, §3.1 |
| B8 | Gemischte Selektion → gesamte Selektion wird fett | Zwei Wörter tippen, nur das erste fett, dann **beide** selektieren, Fett klicken | Standard-`toggleMark`: **beide** Wörter danach fett | §7.6, §5.3 |
| B9 | `aria-pressed` bei gemischter Selektion **vor** dem Klick | Wie B8, Assertion direkt nach dem Selektieren, vor dem Klick | `aria-pressed`=`false` (nur Teil fett). Selektionsrichtung deterministisch festlegen (Anker im nicht-fetten Teil). **Jetzt ggf. ROT/nichtdeterministisch** (Code prüft nur `$from`) → nach Defekt-B-Fix stabil `false` | §7.6, §5.3, Defekt B |
| B10 | Cursor an Formatgrenze | Fetten Lauf erzeugen, Cursor per `ArrowLeft/Right` exakt an linke bzw. rechte Grenze (R1: Sync-Wait vor der Assertion nach jedem Move), kein Selektion | `aria-pressed` folgt dokumentiert „Marks vor dem Cursor, außer am Absatzanfang"; Ergebnis beider Seiten hier eintragen, sobald der Test läuft | §5.2 |
| B11 | Leeres Dokument | Neu, kein Text, `getByTitle('Fett').click()` | Kein `pageerror` (R5); Button-Zustand wechselt auf „gedrückt" (vorgemerktes Mark) | §5.1 |

### 4.3 Kombination + Export mit unabhängigem Parser (§3.4, §6.1.3/§6.2.4)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| B12 | Fett+Kursiv+Unterstrichen → DOCX, unabhängiger Parser | Text, `ControlOrMeta+a`, `Fett`/`Kursiv`/`Unterstrichen` klicken (in einem 2. Lauf umgekehrte Reihenfolge), exportieren, Download lesen | JSZip → `word/document.xml` mit jsdom-`DOMParser`: **ein** `<w:r>`, dessen `<w:rPr>` `w:b`+`w:i`+`w:u` trägt; beide Reihenfolgen identisch | §7.7, §6.1.3 |
| B13 | Gleiches für ODT | Analog, ODT-Karte | `content.xml` per DOMParser: **ein** `<text:span>` → eine Stildefinition mit `fo:font-weight="bold"`, `fo:font-style="italic"`, `style:text-underline-style` gemeinsam | §7.8, §6.2.4 |

### 4.4 Undo/Redo (§3.7)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| B14 | Undo direkt nach Fett | Text, selektieren, Fett per Klick, `keyboard.press('ControlOrMeta+z')` | Text bleibt, Fett weg (ein Undo-Schritt). `aria-pressed`→`false` (R2) | §7.9, §3.7 |
| B15 | Redo stellt Fett wieder her | Nach B14: `keyboard.press('ControlOrMeta+y')` (`WordEditor.tsx:94`); 2. Lauf mit `ControlOrMeta+Shift+z` (`:95`) | Fett wieder da | §7.9, §3.7 |
| B16 | Gemischte Sequenz | Tippen → Fett an → tippen → Fett aus → mehrfach Undo (R1-Waits zwischen Caret-Moves) | Jeder Undo macht genau einen Schritt in umgekehrter Reihenfolge rückgängig, kein Nebeneffekt auf Text/andere Marks | §3.7 |

### 4.5 Rundreise je Format über echten Upload/Download (§6.1/§6.2)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| B17 | DOCX-Rundreise, **echter** `filechooser` + echter Download | `filechooser` über „Datei hochladen" (Abschnitt 4.10) mit hand-gebautem DOCX (ein fettes Wort), Editor-Inhalt prüfen, unverändert exportieren, Download lesen | Nach Import: fettes Wort im Editor fett (R2); im Download `word/document.xml`: genau der Run des Worts trägt `<w:b/>`, restlicher Text nicht (DOMParser, R2 nicht nötig da Datei statisch) | §7.10, §6.1.1 |
| B18 | ODT-Rundreise, analog | Wie B17, ODT-Karte, `content.xml` prüfen | Analog | §7.10, §6.2.1 |
| B19 | DOCX: neuer Text + Fett, nur betroffener Run | Neu, zwei Wörter, nur eines fett, exportieren | DOMParser: **nur** der `<w:r>` des fetten Worts trägt `<w:b/>`, der Nachbar-Run nicht | §6.1.2 |
| B20 | DOCX „Fett aus" nach Rundreise | Fette Datei importieren, Fett am Wort entfernen, exportieren | `<w:b/>` für diesen Run fehlt im Export | §6.1.4 |
| B21 | Fett über `Shift+Enter` (hard_break) | Wort tippen, `Shift+Enter`, mehr Text, alles fett, exportieren | Fettung auf beiden Seiten des `hard_break` erhalten (DOMParser beider Runs) | §6.1.5 |
| B22 | Reale DOCX-Fremddatei mit Direktformat-Fett sichtbar fett | `filechooser`/`setInputFiles` mit vorab bestätigter Fixture aus `tests/fixtures/external/docx/` | Editor zeigt ≥1 fettes Wort (`getComputedStyle`, nicht nur Textinhalt) | §6.1.6 |
| B23 | Reale ODT-Fremddatei mit Stil-Fett sichtbar fett | Fixture `sameLocationSpansUsingMultipleTemplateStyles_BOLD-…​.odt` (verifiziert, siehe 3.4) | `outer`-Wort im Editor fett. **Jetzt ROT** (Lücke B) → nach code §4.8 grün | §6.2.6, §5.9 |
| B24 | Leerer Listenpunkt/leere Tabellenzelle, Fett umschalten | Liste/Tabelle einfügen, in leerem Punkt/leerer Zelle Fett togglen ohne Text, exportieren | Kein `pageerror` (R5); kein leerer `<w:r>`/`<text:span>` ohne Inhalt im Export | §5.11 |
| B25 | Fett über Bild-/Tabellengrenze | Dokument mit Text + Bild (+ Tabelle), `ControlOrMeta+a`, Fett klicken | Kein `pageerror` (R5); Bild bleibt Bild, Tabellenstruktur erhalten, nur Inline-Text wird fett | §5.5 |

> **Bewusst NICHT als E2E enthalten (Korrektur der vorherigen QA-Fassung):** Ein
> Cross-Format-Fluss „DOCX öffnen → als ODT exportieren" (und umgekehrt) ist per UI
> **unmöglich** — der Export erfolgt immer im Ursprungsformat, `speichern-unter-format`
> fehlt. `fett-req.md` §6.3/§7.14 verbietet dafür ausdrücklich einen E2E-Test. Die
> frühere QA-Fassung enthielt hierfür die (nicht durchführbaren) Fälle B22/B27/B28 —
> ersatzlos gestrichen; Cross-Format ist ausschließlich Unit-Ebene (X1/X2, Abschnitt
> 3.6).

### 4.6 500er-`font-weight`-Schwelle beim Einfügen (§5.6)

Deterministische Einfüge-Simulation ohne echte Systemzwischenablage: im Seitenkontext
ein `paste`-`ClipboardEvent` mit `DataTransfer` (`text/html`-Payload) auf den
fokussierten Editor dispatchen. Falls die CI-Sandbox `ClipboardEvent`-Konstruktion
blockiert: Fallback `document.execCommand('insertHTML', …)`. Assertion nach R2.

| # | Test | Payload | Assertion | Bezug |
|---|---|---|---|---|
| B26 | `font-weight:499` nicht fett | `<span style="font-weight:499">x</span>` | „x" **nicht** fett (`getComputedStyle`) | §5.6 |
| B27 | `font-weight:500` fett | `<span style="font-weight:500">x</span>` | „x" fett | §5.6 |
| B28 | `bolder` dokumentiert | `<span style="font-weight:bolder">x</span>` | Ergebnis (kein `strong`) protokollieren — bewusste Einschränkung | §5.6 |

### 4.7 Überschriften-Fettung (Sichtprüfung, §3.5 / Defekt D)

| # | Test | Schritte | Assertion | Bezug |
|---|---|---|---|---|
| B29 | Ist `h1` im Editor optisch fett? | Absatzformat-Dropdown auf „Überschrift 1", Text tippen, `expect.poll(getComputedStyle('.ProseMirror h1').fontWeight)` | Ergebnis protokollieren. **Jetzt erwartet `400`** (keine CSS-Regel) → nach code §4.5 `700`. Antwort zu §3.5 hier **und** in `fett-req.md` nachtragen | §5.4, Defekt D |
| B30 | Fett-Toggle **innerhalb** einer Überschrift | Wort in Überschrift selektieren, Fett togglen | `aria-pressed` reagiert; visuelle Wirkung hängt von B29 ab — dokumentieren | §3.5 |
| B31 | Entferntes Mark hebt Stil-Ebene beim Export nicht auf | Wort in Überschrift, Fett entfernen, DOCX exportieren | Run-`<w:rPr>` ohne `<w:b/>`, **aber** `styles.xml`-„Heading1" behält `<w:b/>` (Stil-Ebene) — dokumentiert redundant, nicht falsch | §3.5, §5.4 |

### 4.8 Icon-Rendering-Bewertung (§8 Punkt 6)

| # | Test | Schritte | Assertion |
|---|---|---|---|
| B32 | Zugängliche Bezeichnung unabhängig vom Glyph | `getByTitle('Fett')` vorhanden, `aria-label="Fett"` | Grün unabhängig von „F"-Glyph oder SVG-Icon (Entscheidung code §4.2) |
| B33 | Visuelle Erkennbarkeit (dokumentierend) | `getByTitle('Fett').screenshot()` vor/nach Icon-Entscheidung ablegen | Manuelle Sichtprüfung; getroffene Entscheidung protokollieren |

### 4.9 Browser-Matrix inkl. Firefox/Strg+B (§7.15)

`playwright.config.ts` beschränkt Firefox/Safari aktuell auf `clipboard.*`. Für §7.15
(Strg+B auf Nicht-Chromium) ist ein schmales Firefox-Projekt zu ergänzen, das
`bold.spec.ts` (oder gezielt B2/B15) mitnimmt:

```ts
// zusätzlich in projects[], analog zu 'Desktop Firefox (Clipboard)'
{ name: 'Desktop Firefox (Bold)', testMatch: /(clipboard|bold).*\.spec\.ts/, use: { ...devices['Desktop Firefox'] } }
```

Alternativ die Nichtabdeckung bewusst dokumentieren. Bindend zu prüfen: `Mod-b`
(`WordEditor.tsx:98`) unterdrückt in Firefox die native Belegung (Lesezeichen-Sidebar),
solange der Editor fokussiert ist — `prosemirror-keymap` ruft bei `true`-Rückgabe
`preventDefault()` auf.

| Testgruppe | Desktop Chrome | Mobile (Pixel 7) | Tablet (iPad Mini/WebKit) | Firefox (neu) |
|---|---|---|---|---|
| Klick-basiert (B1,B4,B5,B7,B8,B12–B25,B29–B33) | Pflicht | Pflicht (Determinismus-Gate R6) | Pflicht | — |
| Tastatur (B2,B3,B6,B14–B16) | Pflicht | Pflicht | Pflicht | **B2/B15** (§7.15) |

Auf Touch-Projekten (Mobile/Tablet) sendet `page.keyboard.press` CDP-Events
unabhängig vom simulierten Gerät; reales Touch-Nutzerverhalten ohne Hardware-Tastatur
ist als Sonderfall zu dokumentieren, aber kein Testausschluss.

### 4.10 Datei-Upload: echter `filechooser`

Die bestehenden Upload-Tests rufen `input.setInputFiles(...)` **direkt** auf dem
versteckten Input (`FormatPicker.tsx:92-104`) und umgehen den sichtbaren
„Datei hochladen"-Button (`:77-83`, `onClick` → `fileInputs.current[id]?.click()`
`:79`). Für „echte Bedienung" braucht mindestens **ein** Fall je Format den echten
Klickpfad (B17/B18):

```ts
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  docxCard(page).getByRole('button', { name: 'Datei hochladen' }).click(),
])
await fileChooser.setFiles({ name: 'beispiel.docx', mimeType: DOCX_MIME, buffer })
```

Re-Import der heruntergeladenen Bytes: erst per „Formate" zurück
(`getByRole('button', { name: /formate/i })`), dann `setInputFiles({ buffer: exportedBuffer })`
(Muster `docx.spec.ts:241-247`). Die schnellen `setInputFiles`-Tests bleiben zusätzlich.

### 4.11 Bestehende Tests, die unverändert grün bleiben müssen

- `tests/e2e/selection-regression.spec.ts` — **alle vier** Fett-Tests (`:14,43,61,88`),
  Pflicht (§8 Punkt 5). Nach jeder `Toolbar.tsx`-Änderung (Defekt-A/B-Fix) erneut
  ausführen: `getByTitle('Fett').click()` löst bei Playwright die volle
  `mousedown`→`mouseup`→`click`-Sequenz aus, bleibt also mit zusätzlichem `onClick`
  kompatibel — muss aber **tatsächlich** erneut grün laufen (inkl. Mobile-Projekt,
  R6), nicht nur angenommen werden.
- `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts` — bleiben; ihre Fett-Assertions
  werden durch `bold.spec.ts` fachlich abgelöst, aber nicht gelöscht (decken Upload/
  Edit-nach-Upload mit ab).

### 4.12 Strukturelle statt String-Prüfung der Downloads (§6.1.2)

Bestehende Tests nutzen nur `expect(documentXml).toContain('<w:b/>')`. Neue
strukturelle Prüfungen (B12/B13/B17–B21) müssen den **richtigen** Run treffen:

```ts
import { JSDOM } from 'jsdom' // bereits Devdependency
const parser = new JSDOM('').window.DOMParser()
const xml = parser.parseFromString(documentXml, 'application/xml')
const run = [...xml.getElementsByTagNameNS(W, 'r')].find((r) => r.textContent === 'Testwort')
const rPr = run?.getElementsByTagNameNS(W, 'rPr')[0]
expect(rPr?.getElementsByTagNameNS(W, 'b').length).toBe(1)
```

Damit ist „`<w:b/>` steht am richtigen Run" geprüft, nicht nur „kommt irgendwo vor"
(relevant für B19: Nachbar-Run darf **kein** `<w:b/>` tragen).

---

## 5. Traceability

### 5.1 Grenzfälle `fett-req.md` §5 → Testfall

| §5 | Grenzfall | Testfall(e) |
|---|---|---|
| 1 | Leeres Dokument/leerer Absatz | B11, D8 |
| 2 | Cursor an Formatgrenze | B10 |
| 3 | Gemischte Selektion | B8, B9, commands-Unit (3.8) |
| 4 | Fett + Überschrift | B29, B30, B31 |
| 5 | Fett über Bild-/Tabellengrenze | B25, commands-Unit (3.8) |
| 6 | Numerischer `font-weight` beim Einfügen | B26, B27, B28, schema-Unit (3.7) |
| 7 | DOCX `<w:b w:val="0"/>` | D5, D5b |
| 8 | DOCX Fett via `w:rStyle` | D6, D7 |
| 9 | ODT Fett via benannte/vererbte Vorlage | O4, O5, B23, external-fixtures (3.4) |
| 10 | ODT numerisches `font-weight` | O6 |
| 11 | Fett in leerem Listenpunkt/Zelle | B24, D8 |
| 12 | Schnelles wiederholtes Umschalten | B4 |
| 13 | Fett als Auslöser Selection-Sync-Bug | `selection-regression.spec.ts` (4 Tests) |
| 14 | Änderungsverfolgung (fehlt) | n/a (dokumentiert) |

### 5.2 E2E-Testliste `fett-req.md` §7 → Testfall

| §7 | Punkt | Testfall(e) |
|---|---|---|
| 1 | Klick auf Selektion | B1 |
| 2 | Strg+B | B2 |
| 3 | Tastatur-Fokus-Pfad (Defekt A) | B3 |
| 4 | Fett ohne Selektion + sofort `aria-pressed` (Defekt B) | B5, B6 |
| 5 | Voll fette Selektion → entfernt | B7 |
| 6 | Gemischte Selektion | B8, B9 |
| 7 | Fett+Kursiv+Unterstr. DOCX, unabh. Parser | B12 |
| 8 | Gleiches für ODT | B13 |
| 9 | Undo/Redo | B14, B15 |
| 10 | Rundreise echter Upload/Download | B17, B18 |
| 11 | Import-Fixtures C/5.8/5.9/5.10 | D5, D6, D7, O4, O5, O6 |
| 12 | 500er-Grenze | B26, B27, B28 |
| 13 | `getComputedStyle` h1 | B29 |
| 14 | Cross-Format nur Unit | X1, X2 (3.6) |
| 15 | Browser-Matrix Strg+B Nicht-Chromium | B2 auf Firefox (4.9) |

### 5.3 Rundreise `fett-req.md` §6 → Testfall

| §6 | Anforderung | Testfall(e) |
|---|---|---|
| 6.1.1 | DOCX Rundreise Fett erhalten | B17, D1–D3 |
| 6.1.2 | DOCX unabhängiger Parser | B19, V1 |
| 6.1.3 | Fett+Kursiv+Unterstr. ein Run | D2, B12 |
| 6.1.4 | Fett „aus" | D1, B20 |
| 6.1.5 | Fett über `hard_break` | D3, B21 |
| 6.1.6 | reale Fremddatei, Direktformat | B22, external-fixtures (3.4) |
| 6.1.7 | Fremddatei via `w:rStyle` | D6 (synthetisch; keine verifizierte reale Fixture) |
| 6.2.1 | ODT Rundreise Fett erhalten | B18, O1 |
| 6.2.2 | ODT auto-Style `font-weight:bold` | B18, V2 |
| 6.2.3 | Dedup → eine Stildefinition | O2 |
| 6.2.4 | Fett+Highlight eine Definition | O3, B13 |
| 6.2.5 | Fett „aus" | O1 |
| 6.2.6 | reale Fremddatei benannt/vererbt | O4, O5, B23 |
| 6.3 | Cross-Format Code-Ebene | X1, X2 |
| 6.4 | unabhängige Validierung | V1 (mammoth), V2 (xmllint) |

---

## 6. Abgleich mit Abnahmekriterien (`fett-req.md` §8, 7 Punkte)

| §8 | Kriterium | Abdeckung |
|---|---|---|
| 1 | Alle §7-Fälle real im Browser, grün | 4.1–4.9 (B1–B33) + Traceability 5.2 |
| 2 | Rundreisen §6 per Re-Import **und** unabh. Validierer bestätigt | B17–B23, D-/O-/X-Reihe, V1/V2, 4.12 |
| 3 | Alle Grenzfälle §5 einzeln geprüft/dokumentiert | Traceability 5.1 (jeder §5-Punkt zugeordnet) |
| 4 | Defekte A–D behoben+Regressionstest **oder** dokumentiert; §3.5 beantwortet | A→B3; B→B6/B9/commands-Unit; C→D5; D→B29 (Antwort in `fett-req.md` §3.5 nachtragen) |
| 5 | Selection-Sync-Regression bleibt Pflicht | 4.11 (4 Tests, unverändert) |
| 6 | Icon-Risiko bewertet | 4.8 (B32/B33) |
| 7 | Cross-Format-Einschränkung sichtbar bis `speichern-unter-format` | 3.6 (nur Code-Ebene), E2E bewusst ausgelassen + dokumentiert (4.5) |

---

## 7. Erwarteter Ist-Status je neuem Testfall (vor Umsetzung von `fett-code.md`)

| Status | Testfälle | Grund |
|---|---|---|
| **Erwartet ROT** (dokumentiert bestätigten Bug/Lücke) | B3, B6, B9, B23, B29 (Wert 400 statt 700), D5, D6, D7 (blockiert bis D5+D6), O4, O5, O6, V-Teil an Stil-Fixtures, commands-Unit `isMarkActive` (Funktion existiert noch nicht), 3.4-ODT-Assertion | Defekte A–D + Lücken A/B/C (Abschnitt 0) |
| **Erwartet GRÜN** (mit aktuellem Code bereits vorhanden) | B1, B2, B4, B5, B7, B8, B10, B11, B12–B22, B24, B25, B26, B27, B28, B30, B31, B32, B33, D1–D4, D5b, D8, O1–O3, X1, X2, schema-Unit | Unveränderter Reader/Writer/Toggle-Grundpfad |
| **Abhängig von Design-Entscheidung** | B29/B30/B31 (Ausgang nach CSS-Fix), B32/B33 (Icon) | `fett-code.md` §5 |

Sobald `fett-code.md` §4 umgesetzt ist, müssen B3, B6, B9, B23, B29, D5, D6, D7, O4,
O5, O6 und der `isMarkActive`-Unit-Test von ROT auf GRÜN wechseln — das ist der
maschinell prüfbare Nachweis, dass die Fixes wirken (nicht nur Code-Review).

---

## 8. Ausführungsreihenfolge (Vorschlag)

1. Unit-Regressions D5, D6, O4, O5, O6, `isMarkActive`-Unit (3.8) **bewusst rot**
   schreiben — Ausgangsnachweis, dass die Bugs real und reproduzierbar sind.
2. `bold.spec.ts` B1–B11 (Bedienung/Zustand) — deckt Defekte A/B sichtbar auf.
3. B12–B25 (Kombination/Export/Rundreise) + 4.12 (DOMParser-Helfer).
4. B26–B31 (Font-Weight/Überschrift) + schema-Unit (3.7) + X1/X2 (3.6).
5. B32/B33 (Icon) + Browser-Matrix/Firefox (4.9, Konfig-Erweiterung).
6. V1/V2 (unabhängige Validierung, 3.5) an je einem Fett-Export.
7. Nach Umsetzung von `fett-code.md`: alle als ROT markierten Fälle erneut ausführen,
   Statuswechsel dokumentieren; `selection-regression.spec.ts` erneut grün fahren
   (4.11), inkl. Mobile-Projekt (R6).
8. Traceability (5) und DoD-Abgleich (6) final gegenprüfen, dann §3.5-Antwort in
   `fett-req.md` nachtragen, erst dann Backlog-Status auf „verifiziert".

---

## 9. Offene Punkte für QA

- B22/B23 benötigen vorab manuelle Sichtung der Fixture-Dateien (`unzip` +
  `content.xml`/`document.xml` prüfen) — Dateiname ist keine Inhaltsgarantie. Für ODT
  ist `sameLocationSpansUsingMultipleTemplateStyles_BOLD-…​.odt` bereits verifiziert
  (`fett-code.md` §3.2), für DOCX ist ein Direktformat-Kandidat noch zu bestätigen.
- B26–B28 (Paste-Simulation) können je nach Playwright-/Browser-Version und
  CI-Clipboard-Berechtigungen instabil sein; Fallback `execCommand('insertHTML')`
  vorsehen. Die drei Vollsuite-Projekte haben unterschiedliche Clipboard-Permissions
  (`playwright.config.ts:34-36`: Tablet ohne explizite Clipboard-Permission) — beim
  Paste-Test darauf achten, dass die Simulation permissionsunabhängig ist.
- B29/B30/B31 hängen von der Design-Entscheidung `fett-code.md` §5 ab; Endergebnis
  nach Umsetzung sowohl hier als auch in `fett-req.md` §3.5 / §8 Punkt 4 nachtragen.
- §7.15 (Firefox) erfordert eine bewusste `playwright.config.ts`-Erweiterung
  (Abschnitt 4.9) oder eine dokumentierte Nichtabdeckung — vor Abnahme entscheiden.
