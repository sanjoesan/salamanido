# Testplan „Schriftgröße wählen" — QA-Verifikation

Gegenstück zu `specs/schriftgroesse-waehlen-req.md` (Anforderung, **2. Fassung**) und
`specs/schriftgroesse-waehlen-code.md` (Umsetzungsplan, **2. Fassung**). Dieses Dokument
legt fest, **welche Tests** geschrieben werden, **wo** sie liegen, **wie** sie
deterministisch ausgeführt werden und **wann** ein Punkt als abgehakt gilt.

Anders als bei den meisten anderen `*-qa.md`-Gegenstücken in diesem Repo (z. B.
`kursiv-qa.md`) ist `fontSize` laut Anforderung Abschnitt 7 und Plan Abschnitt 0 ein
**vollständiger Neubau**: Es gibt noch keinen Mark, kein Toolbar-Element, keinen
Reader-/Writer-Code (per Verzeichnis-Scan bestätigt: `src/formats/shared/fontSize.ts`
existiert noch nicht). Dieser Testplan ist deshalb gleichzeitig **Abnahmekriterium für die
Implementierung** (Anforderung Abschnitt 9, Punkt 1–2) — jeder hier definierte Test muss
gegen den in `schriftgroesse-waehlen-code.md` beschriebenen, tatsächlich gebauten Code grün
sein, bevor der Backlog-Status von „fehlt" auf „vorhanden (verifiziert)" wechseln darf.

Zwei Ebenen, die sich ergänzen, von denen **keine die andere ersetzen darf**:

1. **Unit-Tests** (Vitest) für die Reader/Writer-Rundreise auf Daten-/XML-Ebene —
   schnell, präzise, deterministisch, aber blind gegenüber Toolbar/Tastatur/echtem
   Datei-Dialog.
2. **Echte Playwright-Browser-Tests** — Klicks auf das tatsächliche Schriftgrößen-Feld in
   der Toolbar, echte Tastatureingabe (inkl. Pfeiltasten in der Preset-Liste), echter
   `setInputFiles()`-Upload, echter `page.waitForEvent('download')`-Export, Prüfung der
   **tatsächlich heruntergeladenen Datei** vom Datenträger (nicht nur ein interner Aufruf
   von `readDocx`/`readOdt`/`writeDocx`/`writeOdt`/`setFontSize`/`getFontSizeAtSelection`).

Ein Test, der nur `readDocx(buffer)`/`setFontSize(state)` direkt aufruft, zählt **nicht**
als Ebene 2, auch wenn er in `tests/e2e/` liegt.

### Verankerung im realen Code (verifiziert, nicht vermutet)

- Fixture-Builder liegen zentral in **`tests/e2e/fixtures/builders.ts`** und werden von
  `docx.spec.ts`/`odt.spec.ts`/`cut.spec.ts`/`complex-import-fidelity.spec.ts` u. a.
  bereits importiert: `buildSampleDocx(bodyInner?: string)`, `buildSampleOdt(officeTextBody?:
  string)`, `DOCX_MIME`, `ODT_MIME`. `buildSampleDocx` nimmt einen optionalen Body-Inner-XML
  entgegen — damit lassen sich Läufe mit `<w:sz .../>` ohne neue Helfer einschleusen. **Neue
  Größen-Fixtures werden dort ergänzt, nicht dupliziert** (analog dem Vorgehen in
  `cut.spec.ts`).
- Die Unit-Rundreise-Helfer `doc(content)`, `paragraph(text, align, marks)`,
  `roundTrip(content)` existieren **identisch** in `src/formats/docx/__tests__/roundtrip.test.ts`
  und `src/formats/odt/__tests__/roundtrip.test.ts` und sind direkt wiederverwendbar
  (`paragraph` reicht `marks` durch, also `paragraph('Text','left',[{type:'fontSize',attrs:{pt:10.3}}])`).
- Der Konsolen-/Crash-Wächter `watchForConsoleErrors(page)` (Muster aus `cut.spec.ts`:
  `page.on('pageerror', …)` + `page.on('console', msg => msg.type()==='error')`) wird für
  alle „kein Absturz"-Grenzfälle (4.8, 4.9, 4.14, 4.15) wiederverwendet.

Referenzierte externe Fixtures (siehe `schriftgroesse-waehlen-code.md` Abschnitt 7):
`tests/fixtures/external/docx/bug59058.docx`, `61470.docx`, `IllustrativeCases.docx`;
`tests/fixtures/external/odt/TestTextSelection.odt`, `tableComplex_DOC_LO41.odt` (nur als
Negativ-/Gap-Beleg, siehe §1.3), `bigFont.odt`, `excelfileformat.odt`,
`Seasonal_Fruits2_en.odt`.

---

## 0. Ausführung

| Ebene | Befehl | Neue/geänderte Dateien |
|---|---|---|
| Unit | `npm test` (`vitest run`) | siehe Abschnitt 1 |
| Browser/E2E | `npm run test:e2e` (`playwright test`) | siehe Abschnitt 2 |

Beide Suiten müssen grün sein, bevor „Schriftgröße wählen" laut Anforderung Abschnitt 9 als
„vollständig verifiziert" gilt. Reihenfolge der Umsetzung: zuerst der Neubau aus
`schriftgroesse-waehlen-code.md` Abschnitt 4 (Schema, Commands, Toolbar, Reader, Writer,
CSS-Standardgröße), dann Unit-Tests, dann E2E-Tests, dann gemeinsamer Lauf beider Suiten
gegen den fertigen Code. Nach jedem grünen Teilschritt wird gemäß Projektvorgabe committet
und der CI-Lauf selbst geprüft.

---

## 1. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

Ziel: jede Rundreise-Behauptung aus Anforderung Abschnitt 5 sowie jeden Reader-/
Utility-Grenzfall aus Abschnitt 4 auf Daten-/XML-Ebene isoliert, deterministisch und ohne
Browser nachweisen. Diese Ebene prüft **Funktionen direkt** (`readDocx`, `writeDocx`,
`readOdt`, `writeOdt`, `roundToHalfPt`, `clampFontSizePt`, `parseFontSizeInput`) — das ist
hier ausdrücklich erlaubt und richtig, weil sie durch die Playwright-Ebene (Abschnitt 2)
**ergänzt, nicht ersetzt** wird.

> **Zentrale Korrektheitsregel dieser Ebene (Reconciliation 2. Fassung, Req 2.5/5, Plan
> 3.2):** *Import bewahrt EXAKT.* Ein aus DOCX/ODT gelesener Wert wird **niemals** gerundet
> und **niemals** geclampt. Rundung (`roundToHalfPt`) und Clamping (`clampFontSizePt`) gelten
> **ausschließlich** für vom Bedienelement/Preset/Paste **neu gesetzte** Werte. Jeder
> Reader-Test unten, der eine Rundung importierter Werte erwartete, wäre ein Bug im Testplan
> und würde die verbindliche verlustfreie ODT-Rundreise (10,3 pt) fälschlich brechen.

### 1.1 Neu: `src/formats/shared/__tests__/fontSize.test.ts`

Reine Utility-Funktionstests (kein DOM/Editor nötig), gegen `src/formats/shared/fontSize.ts`
(Plan Abschnitt 3.1/4.1). *(Pfad `shared/__tests__/`, nicht `shared/editor/__tests__/` — die
Utility liegt in `shared/`, verifiziert am Verzeichnis; `shared/__tests__/` existiert bereits.)*

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | Rundung auf 0,5-pt-Schritte (nur Neusetzung) | `roundToHalfPt(13.37)`, `(13.1)`, `(13.26)`, `(10)` | `13.5`, `13`, `13.5`, `10` | 4.4, 2.5 |
| 2 | Clamping nach unten (0/negativ → 1 pt) | `clampFontSizePt(0)`, `(-5)` | `1` | 4.2 |
| 3 | Clamping nach oben (>400 pt → 400 pt) | `clampFontSizePt(5000)` | `400` | 4.3 |
| 4 | Rundung **und** Clamping kombiniert | `clampFontSizePt(399.8)` | `400` | 4.3/4.4 zusammen |
| 5 | Deutsches Komma als Dezimaltrennzeichen | `parseFontSizeInput("12,5")` | `12.5` | 4.5 |
| 6 | Ungültige/leere Eingabe liefert `null`, wirft nicht | `"abc"`, `""`, `"0"`, `"-5"`, `"Infinity"`, `"NaN"`, `"1.2.3"`, `"13abc"` | jeweils `null` | 4.1/4.2 — `"13abc"`/`"Infinity"` schließen einen stillen `parseFloat`-Fallback aus |
| 7 | Anzeige-Formatierung | `formatFontSizePt(12)`, `(13.5)` | `"12"`, `"13,5"` | Element 4 (Anzeige) |
| 8 | Preset-Liste vollständig | `FONT_SIZE_PRESETS_PT` | enthält exakt `8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72` | Element 2 |
| 9 | App-Standard-Konstante | `FONT_SIZE_DEFAULT_PT` | `11` (Auflösung Frage 3.4) | 3.4, DoD 9.5 |

### 1.2 Neu: `src/formats/docx/__tests__/fontSize.test.ts`

Reader-Robustheit gegen Fremddatei-Grenzfälle, je über eine minimal per JSZip gebaute
`.docx` (Muster `buildSampleDocx(bodyInner)` aus `tests/e2e/fixtures/builders.ts`, hier als
reiner Unit-Buffer genutzt) und `readDocx(blob)`.

| # | Testfall | Eingabe (`w:rPr`) | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | Preset-Wert | `<w:sz w:val="24"/>` | `fontSize`-Mark `pt: 12` | Basisfall |
| 2 | Nicht-Preset-Wert | `<w:sz w:val="26"/>` | `pt: 13`, **keine** Rundung auf einen Preset | 4.12 |
| 3 | Halbpunkt-Wert | `<w:sz w:val="27"/>` | `pt: 13.5` | 4.16 |
| 4 | Fehlendes `w:sz` | kein `w:sz`-Element im Lauf | **kein** `fontSize`-Mark | Req 3, Punkt 3 |
| 5 | Nicht-numerisches `w:val` | `<w:sz w:val="abc"/>` | **kein** Mark, kein Absturz, **kein** `NaN` | 4.17, Plan-Fund 2 |
| 6 | `w:val="0"` bzw. negativ | `<w:sz w:val="0"/>`, `<w:sz w:val="-2"/>` | **kein** Mark (nicht `pt: 0`) | 4.17 |
| 7 | Wert außerhalb 1–400 pt bleibt **ungeclampt** | `<w:sz w:val="1000"/>` | `pt: 500`, **nicht** auf 400 gekappt | Plan 3.2 — Regressionsschutz gegen versehentliches Reader-Clamping |
| 8 | Kombination mit `w:b`/`w:color` | `<w:sz w:val="28"/><w:b/><w:color w:val="FF0000"/>` | alle drei Marks gleichzeitig, keiner verdrängt einen anderen | Req 5.1 Zeile 5 |

### 1.3 Neu: `src/formats/odt/__tests__/fontSize.test.ts`

Analog für ODT, über ein handgebautes `content.xml` (`family="text"`-Automatikstil + `text:span`)
und `readOdt(blob)`, **plus** gezielte Assertions gegen echte Fixtures. **Achtung:** Der
ODT-Reader rundet **nicht** — Nicht-0,5-Dezimalen bleiben exakt (Korrektur gegenüber einer
früheren Planfassung, siehe Korrektheitsregel oben und Plan 3.2/4.8).

| # | Testfall | Eingabe (referenzierter `style:text-properties`) | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | Preset-Wert | `fo:font-size="14pt"` | `pt: 14` | Basisfall |
| 2 | Nicht-Preset-Wert | `fo:font-size="13pt"` | `pt: 13` | 4.12 |
| 3 | Dezimalwert auf 0,5-Schritt | `fo:font-size="10.5pt"` | `pt: 10.5` unverändert | 4.16 |
| 4 | **Off-grid-Dezimalwert bleibt EXAKT** | `fo:font-size="13.37pt"` | `pt: 13.37` — **kein** Runden auf 13,5 | **2.5/5 (Kernnachweis Import-exakt)** |
| 5 | **Verbindlicher 10,3-pt-Nachweis** | `fo:font-size="10.3pt"` | `pt: 10.3` exakt (**nicht** 10,5) | 2.5/5.1, DoD 9.3 |
| 6 | Fehlendes `fo:font-size` | kein Attribut im Text-Stil | **kein** `fontSize`-Mark | Req 3, Punkt 5 |
| 7 | Prozentangabe (relativ) | `fo:font-size="120%"` | **kein** Mark, Text erhalten, kein Absturz | 4.18 |
| 8 | Nicht-pt-Einheit | `fo:font-size="0.5cm"` | **kein** Mark, Text erhalten | 4.18 |
| 9 | Null/negativ/unlesbar | `fo:font-size="0pt"`, `"-3pt"`, `"abcpt"` | jeweils **kein** Mark, kein `NaN` | 4.17 |
| 10 | Reale Fixture `TestTextSelection.odt`, Stil `T10` (13 pt, `family="text"`) | Datei einlesen, den über `T10` formatierten Lauf im Dokumentbaum suchen | Lauf trägt `fontSize`-Mark `pt: 13` | 4.12, echte unveränderte Drittdatei |
| 11 | Reale Fixture `bigFont.odt` (72 pt, `family="text"`) | Datei einlesen | passender Lauf trägt `fontSize`-Mark `pt: 72` | Positivtest gegen echte Datei |
| 12 | Dokumentierter Gap: `tableComplex_DOC_LO41.odt`, Stil `P2` (`family="paragraph"`, `fo:font-size="21.5pt"`, **kein** `text:span`) | Datei einlesen | betroffener Absatztext trägt **keinen** `fontSize`-Mark — bewusst dokumentiertes, **vorbestehendes** Reader-Verhalten (Plan Abschnitt 2, Fund 3). **Kein** Regressions-Fail, sondern ein Beleg-Test, der verhindert, dass dieser Gap künftig fälschlich als „neuer Bug von `schriftgroesse-waehlen`" gewertet wird | Plan-Fund 3 |

### 1.4 Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts` und `.../odt/__tests__/roundtrip.test.ts`

Neue `describe`-Blöcke „font size", analog zu den vorhandenen Formatierungs-Blöcken; Helfer
`doc`/`paragraph`/`roundTrip` wiederverwenden. Deckt Anforderung Abschnitt 5.1 auf reiner
Daten-Ebene ab (ergänzt die E2E-Rundreisen in §2.6, ersetzt sie nicht).

**Beide Formate (DOCX und ODT):**

| # | Testfall | Erwartung |
|---|---|---|
| 1 | Preset-Größe (14 pt) → Export → Reimport | `pt: 14` unverändert am selben Textlauf |
| 2 | Nicht-Preset-Größe (13 pt) → Export → Reimport | `pt: 13` unverändert, keine Rundung auf einen Preset |
| 3 | Halbpunkt-Größe (10,5 pt) → Export → Reimport | `pt: 10.5` exakt, kein Rundungsverlust (4.16) |
| 4 | Schriftgröße + Fett + Textfarbe auf demselben Lauf | alle drei Marks nach Reimport gemeinsam vorhanden (5.1 Zeile 5); ODT-Stil-Dedup kollisionsfrei |
| 5 | Explizite Größe (z. B. 30 pt) auf einem Lauf **innerhalb** einer Überschrift (Level 1, implizit 24 pt) | nach Reimport: dieser Lauf trägt weiterhin explizit `pt: 30`; der Rest der Überschrift bleibt **ohne** Mark (implizit 24 pt) — 2.4/4.7/5.1 Zeile 6 |

**NUR ODT (verbindlicher Zusatznachweis, DoD 9.3):**

| # | Testfall | Erwartung |
|---|---|---|
| 6 | **Off-grid-Dezimalwert 10,3 pt → Export → Reimport bleibt EXAKT** | `pt: 10.3` unverändert (**kein** 10,5); der exportierte `content.xml` enthält wörtlich `fo:font-size="10.3pt"`. Dies ist der zentrale Beleg der verlustfreien, ungerundeten ODT-Rundreise (Req 2.5/5.1). **Kein reales Fixture im Bestand deckt dies ab** (Plan Abschnitt 0/7: einzige Nicht-Ganzzahl-Werte im Korpus sind 17,5/21,5 pt, beide auf dem 0,5-Raster und auf `family="paragraph"`) → der Testwert wird **synthetisch** über `doc()`/`paragraph()` erzeugt. |

### 1.5 Regressionstest: ODT-Stil-Deduplizierung mit `fontSize` als 7. Feld

**Erweiterung `src/formats/odt/__tests__/roundtrip.test.ts`** — deckt den in
`schriftgroesse-waehlen-code.md` Abschnitt 2 (Fund 1) / Abschnitt 4.10 beschriebenen,
vorbestehenden `JSON.stringify(props)`-Ordnungs-Bug ab, der mit dem neuen `fontSize`-Feld
ein höheres Kollisionsrisiko bekommt:

```ts
it('does not create duplicate automatic text styles when the same bold+fontSize combination arrives in different mark-array order', async () => {
  const original = doc([
    {
      type: 'paragraph',
      attrs: { align: 'left' },
      content: [
        { type: 'text', text: 'A', marks: [{ type: 'strong' }, { type: 'fontSize', attrs: { pt: 14 } }] },
        { type: 'text', text: 'B', marks: [{ type: 'fontSize', attrs: { pt: 14 } }, { type: 'strong' }] },
      ],
    },
  ])
  const blob = await writeOdt(original)
  const zip = await JSZip.loadAsync(blob)
  const contentXml = await zip.file('content.xml')!.async('text')
  const styleDefCount = (contentXml.match(/<style:style style:name="T\d+"/g) ?? []).length
  expect(styleDefCount).toBe(1)
})
```

Muss **vor** dem Fix aus Plan Abschnitt 4.10 rot sein (zwei Style-Defs statt einer), danach
grün — als eigenständiger Beleg, dass der Fix wirkt, nicht nur als Behauptung.

### 1.6 Validierung gegen unabhängigen Parser

Da dieses Repo keine Python-Toolchain besitzt, erfolgt die unabhängige Validierung
zweistufig (analog `kursiv-qa.md` Abschnitt 1.5):

1. **Automatisiert, Teil der E2E-Suite:** Prüfung des exportierten XML-Strings per
   Regex/`DOMParser`, **ohne** den eigenen `readDocx`/`readOdt` zu benutzen — umgesetzt in
   §2.6, Szenarien „unabhängige Validierung".
2. **Manuell, einmalig vor Statuswechsel auf „verifiziert":** eine exportierte
   Test-DOCX/-ODT mit mehreren unterschiedlichen Größen (inkl. 13 pt und 10,5 pt) außerhalb
   dieses Repos in Word bzw. LibreOffice öffnen, Schriftgrad-Feld an den jeweiligen
   Textstellen ablesen, Übereinstimmung hier oder in einer Folgedatei vermerken. Kein
   Bestandteil der automatisierten CI-Suite, aber Pflicht-Checkliste-Punkt (Abschnitt 4).

---

## 2. Echte Playwright-Browser-Tests

**Grundregel dieser Ebene:** Jeder Test bedient die Anwendung ausschließlich so, wie eine
Person es täte — `page.getByLabel('Schriftgröße')` (aria-label) bzw.
`page.getByTitle('Schriftgröße (in Punkt)')` für Klicks/Eingaben,
`page.keyboard.type(...)`/`.press(...)` für Tastatur, `input.setInputFiles(...)` für
Uploads, `page.waitForEvent('download')` + Lesen der heruntergeladenen Datei vom Datenträger
für Exporte. **Kein Test in diesem Abschnitt darf** `readDocx`/`writeDocx`/`readOdt`/
`writeOdt`/`setFontSize`/`clearFontSize`/`getFontSizeAtSelection` direkt importieren oder
aufrufen — das wäre Ebene 1. Hochzuladende Dateien werden **unabhängig** vom Reader/Writer
dieses Projekts per JSZip gebaut (`buildSampleDocx`/`buildSampleOdt` aus
`tests/e2e/fixtures/builders.ts`) — das stellt sicher, dass eine Rundreise nicht zufällig
nur beweist, dass Writer und Reader sich gegenseitig kompensieren.

### 2.0 Neue Datei: `tests/e2e/font-size.spec.ts`

Struktur/Locator-Helfer identisch zu den bestehenden Dateien:

```ts
function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function fontSizeInput(page: import('@playwright/test').Page) {
  return page.getByLabel('Schriftgröße')
}
function watchForConsoleErrors(page: import('@playwright/test').Page) {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(String(err)))
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  return () => expect(errors, `Unerwartete Konsolen-/JS-Fehler: ${errors.join('\n')}`).toEqual([])
}
```

`beforeEach`: `page.goto('/')` → Privacy-Banner „Verstanden" wegklicken → je nach Testfall
`docxCard`/`odtCard` „Neu erstellen" klicken (exakt wie `selection-regression.spec.ts`).

**Hinweis zur Preset-Auswahl per Klick:** Ein natives `<input list>` erlaubt in Playwright
keinen direkten `option.click()` wie bei eigenem Dropdown-Markup. Der „Preset-Klick"-Schritt
wird als `fontSizeInput(page).fill('24')` → `press('Enter')` umgesetzt, **zusätzlich** ein
dedizierter Test, der die Datalist-Option per Tastatur erreicht (`ArrowDown` in der
geöffneten Liste, dann `Enter`) — deckt Element 5 (Pfeiltasten-Navigation) unabhängig ab,
weil das eigentliche Preset-Klick-Verhalten laut Plan 3.4 auf einem Chromium-spezifischen
`insertReplacementText`-`inputType` beruht und deshalb **explizit selbst** verifiziert werden
muss, nicht als gegeben angenommen werden darf.

### 2.0.1 Determinismus-Regeln (verbindlich für ALLE E2E-Tests dieser Datei)

Dieses Repo hat eine dokumentierte Historie flakiger E2E-Tests durch **zu schnelle,
menschlich unmögliche Tastenfolgen**, die der asynchronen ProseMirror-Selektions-Sync
vorauslaufen (vgl. Commits „Fix flaky … same async-selection-sync race" sowie die
ausführlichen Kommentare in `selection-regression.spec.ts` und `cut.spec.ts`). Jeder hier
neue Test hält deshalb folgende Regeln ein — sie sind **kein** Nice-to-have, sondern
Abnahmebedingung, damit die Suite auf allen Playwright-Projekten (inkl. **Mobile**)
deterministisch grün ist:

1. **Nach jeder nativen, tastaturgetriebenen Cursor-Bewegung** (`End`, `Home`,
   `ControlOrMeta+Home`, `ArrowLeft/Right/Up/Down`) und **vor** dem nächsten Tastendruck,
   der auf der neuen Position operiert, steht `await page.waitForTimeout(50)`. ProseMirror
   erfährt einen nativen Caret-Move nur über das asynchrone `selectionchange`-Event; ein
   sofort folgender Tastendruck kann noch auf der alten Position wirken. (Exakt das Muster
   aus `selection-regression.spec.ts` Zeile 34, dort mit ausführlichem Kommentar.)
2. **Selektion per Tastatur, nicht per Pixel-Maus-Drag.** Zum Markieren wird
   `ControlOrMeta+a` (Alles) oder `ControlOrMeta+Home` + `Shift+ArrowRight` verwendet.
   Feste-Pixel-Mausdrags sind über die Projekte unzuverlässig (fixe Druckseiten-Breite,
   Zeilenumbruch), und **plain `Home` ist auf dem Mobile-Projekt unzuverlässig** (springt zum
   Anfang der *visuellen* Zeile bei Umbruch) — daher `ControlOrMeta+Home`. (Direkt in
   `cut.spec.ts` verifiziert und kommentiert.)
3. **Zeichenweise Selektions-Schleifen bekommen eine Tastenverzögerung:**
   `await page.keyboard.press('ArrowRight', { delay: 20 })` pro Zeichen bei
   `Shift`-gehaltener Auswahl; danach `Shift` lösen und **erst** `waitForTimeout(50)`, dann
   die Folgeaktion. Eine Null-Delay-Schleife kann je Lauf 1–11 statt 11 Zeichen erwischen
   (in `cut.spec.ts` reproduziert und dokumentiert).
4. **Bevor ein Schriftgrößen-Commit auf eine gerade geänderte Selektion wirkt**, muss der
   Selektions-Sync gelandet sein: entweder über Regel 1/3, oder indem die Feldanzeige den
   erwarteten Ableitungswert bereits zeigt (`await expect(fontSizeInput(page)).toHaveValue(...)`
   als auto-retryende Wartebedingung). Die Feldanzeige aktualisiert sich über
   `forceRender` in `WordEditor.dispatchTransaction` bei jeder Transaktion — das ist React-
   asynchron, deshalb **nie** mit einem Einmal-Read (`inputValue()`) prüfen, **immer** mit
   der web-first-Assertion `toHaveValue(...)`, die intern wiederholt.
5. **`fill('…')` + `press('Enter')`** ist für das Feld selbst atomar und race-frei (`fill`
   setzt den Wert synchron, `Enter` committet) — es ersetzt bewusst ein zeichenweises
   `type()` in das Feld, das erneut Timing-abhängig wäre. Für die **Pfeiltasten-Variante**
   (Test §2.1 #3) gilt zusätzlich Regel 1.
6. **Download vor dem Klick abonnieren:** `const dl = page.waitForEvent('download')` **vor**
   dem Klick auf „Exportieren", dann `await dl` (Muster aus `docx.spec.ts`). Kein
   `waitForTimeout` als Ersatz für ein Event.
7. **Zustandsprüfungen ausschließlich über web-first-Assertions** (`toHaveValue`,
   `toHaveAttribute`, `toBeFocused`, `toContainText`, `toHaveCount`) mit deren
   Auto-Retry/`timeout` — **keine** festen `waitForTimeout` als Zusicherung eines Ergebnisses
   (die 50/20-ms-Waits aus Regel 1–3 sind ausschließlich Sync-Überbrückung *zwischen
   Eingaben*, nie das Assertion-Kriterium).

Wo ein Test unten „markieren", „Cursor setzen" oder „Enter danach" beschreibt, ist die
Umsetzung dieser Regeln implizit gefordert und wird im Review geprüft.

### 2.1 Toolbar & Tastatur — Grundverhalten (Anforderung Abschnitt 1, Testfälle 1–3)

| # | Testfall | Schritte (echte Bedienung) | Assertion |
|---|---|---|---|
| 1 | Feld sichtbar und per Tab erreichbar, zugänglicher Name (4.19) | Editor fokussieren, per `Tab` zum Feld navigieren | `fontSizeInput(page)` `toBeVisible()` **und** `toBeFocused()` nach Erreichen per Tab; `getByLabel('Schriftgröße')` löst auf (aria-label vorhanden) |
| 2 | Preset per Eintippen anwenden, Fokus kehrt zurück | Text tippen, `ControlOrMeta+a`, `fontSizeInput.fill('24')`, `press('Enter')` | markierter Text liegt in Element mit Inline-`style` `font-size: 24pt`; `.ProseMirror` hat wieder Fokus (`toBeFocused()`), nicht das Feld |
| 3 | Preset über Pfeiltasten + Enter in geöffneter Liste | Selektion setzen, Feld fokussieren, `ArrowDown` (Regel 2.0.1-1: danach `waitForTimeout(50)`), `Enter` | resultierender Feldwert entspricht einem Preset; Wert auf Selektion angewendet |
| 4 | Freitext + Enter wendet an, Rundung greift (4.4) | Selektion, Feld `fill('13,37')`, `Enter` | `await expect(fontSizeInput(page)).toHaveValue('13,5')`; DOM-Inline-Style `font-size: 13.5pt` an der Selektion |
| 5 | Escape verwirft Freitext ohne Anwendung (Element 3, Plan-3.4-Ref-Fix) | Feld fokussieren, vorherigen Wert notieren, `fill('99')`, `Escape` | `toHaveValue(<vorheriger Wert>)`; Selektion unverändert, **kein** `font-size: 99pt` im DOM; kein Konsolenfehler |
| 6 | Anzeige aktualisiert sich bei Cursor-Bewegung (Element 4) | Zwei Textstellen mit unterschiedlicher Größe erzeugen, Cursor abwechselnd hineinsetzen (Regel 2.0.1-1) | `fontSizeInput` `toHaveValue(...)` ändert sich synchron mit der Cursor-Position, ohne Interaktion mit dem Feld |
| 7 | Uniformer, unformatierter Fließtext zeigt den App-Standard **als Zahl** (nicht leer) | Neues Dokument, Text tippen, Cursor irgendwo im Text, Feld **nicht** berühren | `await expect(fontSizeInput(page)).toHaveValue('11')` — verbindlicher Nachweis der 2.-Fassung-Korrektur (Req 2.3/Element 4: unformatierter Text zeigt „11", **nicht** `—`) |

### 2.2 Größe ohne Selektion — Stored-Mark-Verhalten (Anforderung 2.2, Testfall 4, kritisch)

**Kritisch**, weil dies laut Anforderung 2.2 der bewusste, explizit geforderte
**Unterschied** zu `applyMarkColor`/`clearMarkColor` ist (die bei leerer Selektion nichts
bewirken) — die zentrale Regressionslinie gegen ein versehentliches „Rückfall auf das
falsche Vorbild".

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Größe an leerer Schreibmarke wirkt **nur** auf neu getippten Text | „ABC" tippen, `ControlOrMeta+Home` (Regel 2.0.1-2), `waitForTimeout(50)`, Größe `24` setzen, dann `X` tippen | „X" liegt in Element mit `font-size: 24pt`; „ABC" unverändert (kein `24pt` darum) |
| 2 | Umgebender Bestandstext bleibt unberührt | Fortsetzung von #1 | `ABC`-Textknoten hat weiterhin keinen `font-size`-Style |
| 3 | Zweite Formatierungsaktion direkt danach ohne erneutes Markieren (2.1.3) | Nach Anwenden einer Größe auf eine Selektion sofort `getByTitle('Fett').click()` ohne erneut zu markieren | derselbe Text ist jetzt sowohl `font-size` als auch `strong`/fett |

### 2.3 Gemischte Selektion (Anforderung 2.3, Testfall 5, Grenzfall 4.6/4.7)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Selektion mit zwei unterschiedlichen Größen zeigt „gemischt" | Zwei Textteile mit unterschiedlicher Größe erzeugen, beide gemeinsam markieren (`ControlOrMeta+a` oder Shift-Auswahl gem. 2.0.1) | `await expect(fontSizeInput(page)).toHaveValue('')` (Platzhalter `—` sichtbar) — **nicht** die Größe des ersten Teils |
| 2 | Neue Größe vereinheitlicht den gesamten Bereich | Fortsetzung: `fill('18')`, `Enter` | **beide** vormals unterschiedlich großen Teile tragen jetzt `font-size: 18pt` |
| 3 | Gemischt über Tabellenzellgrenzen (4.6) | Tabelle einfügen, zwei Zellen unterschiedlich groß befüllen, beide als Zellselektion markieren (Shift-Klick über Zellgrenze, Muster aus `selection-regression.spec.ts` „table cell") | Feld `toHaveValue('')`; neue Größe vereinheitlicht beide Zellen |
| 4 | Selektion über Überschrift **und** Fließtext (4.7) | Überschrift + folgenden Absatz gemeinsam markieren (unterschiedliche implizite/explizite Größe) | Feld `toHaveValue('')`; neue Größe wird auf **beide** Anteile als direkte Formatierung angewendet |

### 2.4 Formatvorlagen-Zusammenspiel (Anforderung 2.4, Testfall 6)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Explizite Größe **innerhalb** einer Überschrift übersteuert die Vorlagen-Größe | Überschrift 1 erzeugen, Teilbereich des Überschriftentexts markieren, Größe `36` setzen | markierter Teilbereich `font-size: 36pt`; restlicher Überschriftentext **ohne** diesen Style (bleibt bei impliziter Vorlagen-Größe) |
| 2 | Formatvorlagen-Wechsel lässt expliziten Mark unangetastet | Fortsetzung: Absatzformat von „Überschrift 1" auf „Standard" wechseln | zuvor auf `36pt` gesetzter Teilbereich behält `font-size: 36pt`, obwohl sich die implizite Größe des restlichen Texts ändert |

### 2.5 Ungültige Eingaben und Grenzfälle (Testfälle 7–8, Grenzfälle 4.1–4.5, 4.8–4.9, 4.14–4.15)

Alle Tests dieses Abschnitts setzen zu Beginn `const noErrors = watchForConsoleErrors(page)`
und rufen `noErrors()` am Ende auf (kein `pageerror`, keine `console.error`).

| # | Testfall | Schritte | Assertion | Grenzfall |
|---|---|---|---|---|
| 1 | Nicht-numerischer Wert wird verworfen | Selektion, `fill('abc')`, `Enter` | `toHaveValue(<vorheriger Wert>)`; kein `NaN`/kein neuer `font-size` im DOM | 4.1 |
| 2 | Leeres Feld bei Enter wird verworfen | Feld leeren, `Enter` | vorheriger Wert bleibt sicht-/wirksam | 4.1/4.19 |
| 3 | Eingabe `0` springt auf 1 pt | `fill('0')`, `Enter` | `toHaveValue('1')`, DOM `font-size: 1pt`, **nicht** `0pt` | 4.2 |
| 4 | Negativer Wert springt auf 1 pt | `fill('-5')`, `Enter` | wie #3 | 4.2 |
| 5 | Wert über 400 wird gekappt | `fill('5000')`, `Enter` | `toHaveValue('400')`, DOM `font-size: 400pt` | 4.3 |
| 6 | Deutsches Komma akzeptiert | `fill('12,5')`, `Enter` | `toHaveValue('12,5')`, DOM `font-size: 12.5pt` | 4.5 |
| 7 | Anwenden auf Bild/leere Zelle ohne Text | Bild einfügen, Bild-Node selektieren (bzw. leere Zelle), Feld ändern | keine Exception (`noErrors()` leer), Bild/Zelle unverändert; Feld `toHaveValue('')` | 4.8 |
| 8 | Paste von externem Text mit `font-size` (px) | Synthetisches `ClipboardEvent` mit `text/html` `<span style="font-size: 22px">Text</span>` per `page.evaluate` auf den Editor dispatchen | eingefügter Text hat `font-size: 16.5pt` (22 × 72⁄96), **nicht** auf Zufallswert normalisiert | 4.9 |
| 9 | Paste-Wert außerhalb Bereich wird geclamped | `ClipboardEvent`-Payload `style="font-size: 600pt"` | eingefügter Text `font-size: 400pt`, kein Absturz | 4.3/4.9 |
| 10 | Zwei aufeinanderfolgende Änderungen sind deterministisch (last-wins) | Ersten Wert via `fill('24')`+`Enter` (awaited), sofort danach zweiten via `fill('18')`+`Enter` (awaited) — beide von Playwright serialisiert | am Ende genau **ein** `fontSize`-Mark (`18pt`) auf der Selektion, **kein** widersprüchlicher Zwischenstand (kein Lauf mit zwei `w:sz`/`fo:font-size`); Nachweis, dass die *Implementierung* ordnungs-deterministisch ist, nicht dass wir die Harness überholen | 4.14 |
| 11 | Sehr lange Selektion bleibt performant | Langes Dokument befüllen (`page.evaluate`-Seed + abschließende echte Tastatureingabe), `ControlOrMeta+a`, `waitForTimeout(50)`, neue Größe setzen | Anwendung innerhalb definiertem Budget (`toHaveAttribute(..., { timeout: 3000 })`), UI danach reaktionsfähig (weiterer Klick/Eingabe funktioniert), Undo als **ein** Schritt | 4.15 |

### 2.6 Rundreisen — vollständige Matrix aus Anforderung Abschnitt 5.1

Jedes Szenario prüft die **heruntergeladene Datei** (`download.path()` → `fs.readFile` →
`JSZip.loadAsync` → Ziel-XML aus dem Zip lesen), nicht nur, dass der Editor nach Re-Import
„irgendwie richtig aussieht". Download-Promise **vor** dem Export-Klick abonnieren (Regel
2.0.1-6). Der Re-Import erfolgt über echten `setInputFiles(...)` mit der gerade
heruntergeladenen Datei.

| # | Szenario | Ablauf | Assertion an heruntergeladener Datei |
|---|---|---|---|
| 1 | DOCX-Eigenrundreise | Neu → tippen → Teil markieren → Größe `18` → Export → Re-Import | Text bleibt an dieser Stelle `18pt`; `word/document.xml` enthält `<w:sz w:val="36"/>` exakt am erwarteten Lauf |
| 2 | ODT-Eigenrundreise | wie 1, ODT | `content.xml` enthält `fo:font-size="18pt"` am erwarteten Lauf |
| 3 | DOCX-Fremddatei „unverändert" (Testfall 12) | `buildSampleDocx(bodyInner)` mit mehreren Läufen: u. a. Nicht-Preset `w:val="26"` (13 pt), Halbpunkt `w:val="17"` (8,5 pt), `w:val="24"` (12 pt) — hochladen → **ohne Änderung** sofort exportieren | jede Ursprungsgröße bleibt an ihrem Lauf exakt erhalten (kein Rundungsdrift, keine Vertauschung zwischen Läufen) |
| 4 | ODT-Fremddatei „unverändert" (Testfall 12) | analog, `buildSampleOdt(officeTextBody)` mit mehreren `fo:font-size`, u. a. Nicht-Preset (13 pt) **und** Off-grid `10.3pt` | exportiertes `content.xml`: jede Größe exakt erhalten (13 pt bleibt 13 pt, `10.3pt` bleibt `10.3pt` — **nicht** 10,5), an ursprünglicher Stelle |
| 5 | Größe + Fett + Farbe, DOCX (Testfall 13) | Text mit allen drei Eigenschaften, Export → Re-Import | `<w:sz .../>`, `<w:b/>`, `<w:color .../>` gemeinsam am selben Lauf im XML |
| 6 | Größe + Fett + Farbe, ODT (Testfall 13) | analog | `fo:font-size`, `fo:font-weight="bold"`, `fo:color` gemeinsam in **einem** `style:style` (Dedup kollisionsfrei) |
| 7 | Überschrift-Übersteuerung, DOCX (2.4) | Überschrift 1 mit Teilbereich `36pt` → Export → Re-Import | im XML: Teilbereich hat eigenes `<w:rPr><w:sz w:val="72"/></w:rPr>`; Rest der Überschrift referenziert weiter nur die `heading 1`-Vorlage ohne eigenes `w:sz` |
| 8 | Überschrift-Übersteuerung, ODT (2.4) | analog | Teilbereich mit eigenem `text:span`-Stil (`fo:font-size="36pt"`); Rest referenziert weiter nur die `HeadingN`-Vorlage |
| 9 | Halbpunkt DOCX-Eigenrundreise (4.16) | Größe `10,5` → Export → Re-Import → Feld zeigt weiter `10,5` | `<w:sz w:val="21"/>` im Export (21 Halbpunkte = 10,5 pt exakt) |
| 10 | Halbpunkt ODT-Eigenrundreise (4.16) | analog | `fo:font-size="10.5pt"` im Export |
| 11 | **Unabhängige DOCX-Validierung** | exportierte Datei laden, `word/document.xml` **per Regex/`DOMParser`, nicht per `readDocx`** prüfen | erwartetes `<w:sz w:val="…"/>` vorhanden, **kein** zweiter, widersprüchlicher `w:sz` am selben Lauf |
| 12 | **Unabhängige ODT-Validierung** | analog | `fo:font-size="…pt"` per Regex/`DOMParser` bestätigt |

Ergänzend (nachrichtlich, laut Req 5.1 letzte Zeile nicht blockierend): Cross-Format-Export
DOCX → ODT, sobald `speichern-unter-format` existiert — bis dahin `test.skip(...)` mit
Kommentar, kein stillschweigendes Fehlen.

### 2.7 Mindestabdeckung der Testdatei(en) (Anforderung 5.2)

Mindestens eine Testdatei je Format in §2.6 muss zusätzlich folgende Fälle **in derselben
Datei** kombinieren (nicht über mehrere kleine Dateien verteilt, damit ein einzelner Test
die volle Breite gleichzeitig beweist):

- Mindestens drei unterschiedliche, nicht dem App-Standard (11 pt) entsprechende Größen im
  selben Dokument (z. B. 9, 14, 24 pt).
- Mindestens ein Halbpunkt-Wert (z. B. 10,5 pt).
- Mindestens ein Wert außerhalb der Preset-Dropdown-Liste (z. B. 13 pt).
- **Nur ODT:** mindestens ein Off-grid-Dezimalwert (z. B. 10,3 pt) — exakter, ungerundeter
  Nachweis (Req 5.2/2.5).
- Mindestens eine Überschrift mit einem Textlauf, der eine von der Vorlagen-Größe
  abweichende, explizite Größe trägt.

Da `schriftgroesse-waehlen-code.md` Abschnitt 7 für den Off-grid- **und** den
Überschrift-Override-Fall **keine** passende reale Fixture im Korpus findet, werden diese
über eine **handgebaute** Test-XML abgedeckt (`buildSampleDocx`/`buildSampleOdt` mit
Custom-Body) — hier bewusst vermerkt, damit die Mindestabdeckung nicht stillschweigend an
diesem Punkt lückenhaft bleibt.

### 2.8 Undo/Redo (Anforderung Testfall 9, Grenzfall 4.10)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Ein `Strg+Z` macht genau die Größenänderung rückgängig | Text tippen → markieren → Größe `24` → `ControlOrMeta+z` | kein `font-size: 24pt` mehr im DOM, getippter Text **vollständig** erhalten (Undo hat nicht das Tippen mitrückgängig gemacht) |
| 2 | Redo stellt die Größe wieder her | Fortsetzung: `ControlOrMeta+y` (bzw. `ControlOrMeta+Shift+z`) | `font-size: 24pt` wieder vorhanden |
| 3 | Toolbar-Änderung über mehrere Ranges (Tabellenzellen) zählt als **ein** Undo-Schritt | Zwei Zellen selektieren, Größe setzen, ein `ControlOrMeta+z` | beide Zellen verlieren die neue Größe gemeinsam in einem Schritt, nicht nacheinander |

### 2.9 Selektions-Sync-Regression mit Schriftgröße (Grenzfall 4.11, Pflicht)

**Erweiterung der bestehenden Datei** `tests/e2e/selection-regression.spec.ts` (nicht neue
Datei — analog zur bereits vorhandenen Fett-/Kopieren-Variante). Exakt dasselbe Testmuster,
aber mit dem Schriftgrößenfeld statt `getByTitle('Fett')`. **Der `waitForTimeout(50)`
zwischen `End` und `Enter` ist zwingend** (Regel 2.0.1-1) — genau der Punkt, an dem die
Vorlage sonst flaky wird:

```ts
test('same regression with font-size instead of bold (Grenzfall 4.11)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')

  await page.keyboard.press('ControlOrMeta+a')
  await page.getByLabel('Schriftgröße').fill('24')
  await page.getByLabel('Schriftgröße').press('Enter')

  await editor.click()
  await page.keyboard.press('End')
  // Pflicht: der async native selectionchange-Sync muss VOR dem Enter landen,
  // sonst wirkt Enter noch auf die veraltete AllSelection (identischer Race wie
  // in den bestehenden Fett-/Kopieren-Varianten dieser Datei).
  await page.waitForTimeout(50)
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')

  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
})
```

Assertion identisch zum Vorbild: beide Absätze bleiben vollständig erhalten, keine
gelöschten/ersetzten Inhalte, `<p>`-Anzahl stimmt.

### 2.10 WYSIWYG-Check / offene Frage 3.4 (Testfall 16)

> **Reconciliation-Korrektur (an Code-Plan 2. Fassung, Fund 4 / Abschnitt 3.3 angeglichen —
> vorher fälschlich stale):** Eine frühere Fassung dieses Abschnitts erwartete, dass der
> Export den App-Standard **hart verankert** (`<w:docDefaults><w:rPrDefault><w:rPr><w:sz
> w:val="22"/>` in DOCX bzw. `fo:font-size="11pt"` im ODT-`Standard`-Stil). Das ist
> **falsch** und würde zwei bereits grüne Tripwire-Tests brechen. Korrigiert: Der gepaarte
> Umsetzungsplan hat 11 pt bewusst **NUR als UI-/CSS-Wert** umgesetzt und **NICHT** in den
> Export geschrieben, um die ausgelieferte Produktentscheidung „Kein Produktstandard"
> (`neues-dokument-code.md` Entscheidung 3) zu wahren. Am Quellstand verifiziert:
> `src/formats/docx/__tests__/styleDefs.test.ts` erwartet ein **leeres** `<w:docDefaults/>`
> **und** `Normal` ohne `w:sz`; der `describe('ODT writer: font default')`-Block in
> `src/formats/odt/__tests__/roundtrip.test.ts` erwartet den `Standard`-Stil
> **selbstschließend** (`style:family="paragraph"\s*/>`). Der Export bleibt default-frei; die
> 11 pt wirken ausschließlich in der Editor-Optik und in der Feldanzeige-Fallback-Logik.

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | In-App-Darstellung ohne jede Interaktion mit dem Feld entspricht dem App-Standard | Neues Dokument, Text tippen, Feld **nie** berühren | `getComputedStyle(paragraph).fontSize` numerisch geprüft: `Math.abs(parseFloat(v) - 14.6667) < 0.05` (11 pt bei 96 dpi = exakt 11 × 96⁄72 = 14,6̅ px; CSS-`pt` ist per Spezifikation DPR-unabhängig, daher auf allen Projekten inkl. **Mobile** identisch). Konsistent für DOCX- **und** ODT-Karte. **Kein** exakter String-Vergleich (`=== "14.6667px"`), damit der Test nicht an einer Browser-Rundungsstelle flaky wird. |
| 2 | Export ohne Interaktion enthält **weder einen Export-Default noch einen Lauf-Mark** (korrigiert, Fund 4) | Fortsetzung: exportieren, heruntergeladene Datei per JSZip prüfen | **DOCX:** `word/styles.xml` enthält ein **leeres** `<w:docDefaults/>` (**kein** `w:rPrDefault`/`w:sz`), `Normal` trägt **kein** `w:sz`, und der getippte Lauf in `document.xml` hat **kein** eigenes `<w:sz>`. **ODT:** der `Standard`-Stil in `styles.xml` ist **selbstschließend** (**kein** `style:text-properties`/`fo:font-size`), und der Textlauf in `content.xml` referenziert **keinen** `text:span` mit `fo:font-size`. Belegt „kein erfundener Default beim unveränderten Export" (Req 3.4 letzter Satz). |
| 3 | Nach Benutzung des Felds hat **nur** der betroffene Text einen expliziten Mark | Auf Teilbereich Größe `18` anwenden | nur dieser Teilbereich `font-size: 18pt` in DOM/Export; unberührter Text bleibt beim reinen CSS-/Vorlagen-Standard ohne Mark |

Deckt die in Anforderung Abschnitt 3.4 dokumentierte, laut `schriftgroesse-waehlen-code.md`
Abschnitt 3.3 mit **11 pt (reiner UI-/CSS-Wert, kein Export-Default)** beantwortete offene
Frage messtechnisch ab. Schlägt #1 fehl, laufen CSS-Optik und die dokumentierte
Standard-Zahl auseinander; schlägt #2 fehl (der Export trägt doch einen
`w:sz`/`fo:font-size`-Default), wurde die Entscheidung aus `neues-dokument-code.md`
versehentlich umgekehrt und die beiden Tripwire-Tests würden rot — beides ein Befund gegen
Abnahmekriterium Anforderung Abschnitt 9, Punkt 4/5, kein optionaler Zusatztest.

**Guardrail-Cross-Check (Pflicht, kein neuer Test nötig):** Die zwei bestehenden
Tripwire-Unit-Tests — `src/formats/docx/__tests__/styleDefs.test.ts` („… Normal style
carries no explicit font or size") und der `describe('ODT writer: font default')`-Block in
`src/formats/odt/__tests__/roundtrip.test.ts` — müssen nach der `fontSize`-Implementierung
**unverändert grün** bleiben. Sie sind die eigentliche Regressionssperre gegen ein
versehentliches Wieder-Einschreiben des 11-pt-Export-Defaults. Wird einer rot, wurde die
nur mit PO-/Lead-Freigabe zulässige Export-Default-Alternative (Code-Plan 3.3) ohne die
dort geforderte Spec-/Test-Nachführung eingebaut — Stopp und zurück an PO/Lead.

---

## 3. Zuordnung Anforderung → Test (Abnahme-Mapping)

| Anforderungs-Abschnitt / Grenzfall | Testebene(n) | Datei(en) |
|---|---|---|
| Abschnitt 1 (Bedienelemente, Element 1–5) | E2E | `font-size.spec.ts` §2.0/2.1 |
| 2.1 (Anwenden auf Selektion) | E2E | `font-size.spec.ts` §2.1 #2–4 |
| 2.2 (Anwenden ohne Selektion, Stored-Mark) | E2E | `font-size.spec.ts` §2.2 |
| 2.3 (Anzeige bei uneinheitlicher Selektion) | E2E | `font-size.spec.ts` §2.3, §2.1 #7 |
| 2.4 (Formatvorlagen-Zusammenspiel) | E2E | `font-size.spec.ts` §2.4 |
| 2.5 (Werte/Einheit/Rundung; Import exakt) | Unit + E2E | `shared/…/fontSize.test.ts` #1, `odt/…/fontSize.test.ts` #4/#5, `font-size.spec.ts` §2.1 #4, §2.5 |
| 3.4 (offene Standardgrößen-Frage, 11 pt) | Unit + E2E | `shared/…/fontSize.test.ts` #9, `font-size.spec.ts` §2.10 |
| 4.1 (nicht-numerisch) | Unit + E2E | `shared/…/fontSize.test.ts` #6, `font-size.spec.ts` §2.5 #1–2 |
| 4.2 (0/negativ) | Unit + E2E | `shared/…/fontSize.test.ts` #2, `font-size.spec.ts` §2.5 #3–4 |
| 4.3 (>400 pt) | Unit + E2E | `shared/…/fontSize.test.ts` #3, `font-size.spec.ts` §2.5 #5/#9 |
| 4.4 (Rundung 0,5 pt bei Neusetzung) | Unit + E2E | `shared/…/fontSize.test.ts` #1/#4, `font-size.spec.ts` §2.1 #4 |
| 4.5 (deutsches Komma) | Unit + E2E | `shared/…/fontSize.test.ts` #5, `font-size.spec.ts` §2.5 #6 |
| 4.6 (Tabellen-Mehrfachselektion) | E2E | `font-size.spec.ts` §2.3 #3 |
| 4.7 (Überschrift + Fließtext gemischt) | E2E | `font-size.spec.ts` §2.3 #4, §2.4 |
| 4.8 (Bild/leere Zelle → „—") | E2E | `font-size.spec.ts` §2.5 #7 |
| 4.9 (Paste px/pt, Clamp) | E2E | `font-size.spec.ts` §2.5 #8–9 |
| 4.10 (Undo/Redo) | E2E | `font-size.spec.ts` §2.8 |
| 4.11 (Selection-Sync-Regression) | E2E | `selection-regression.spec.ts` (erweitert, §2.9) |
| 4.12 (Nicht-Preset-Fremdwert) | Unit + E2E | `docx/…/fontSize.test.ts` #2/#7, `odt/…/fontSize.test.ts` #2/#10, `font-size.spec.ts` §2.6 #3–4 |
| 4.13 (Kopf-/Fußzeile) | nachrichtlich, kein Test jetzt | — (Req selbst: kein Blocker) |
| 4.14 (Race Condition, last-wins) | E2E | `font-size.spec.ts` §2.5 #10 |
| 4.15 (Performance, langes Dokument) | E2E | `font-size.spec.ts` §2.5 #11 |
| 4.16 (Halbpunkt-Rundreise) | Unit + E2E | `roundtrip.test.ts` (beide) #3, `font-size.spec.ts` §2.6 #9–10 |
| **4.16 exakt off-grid (10,3 pt ODT)** | Unit + E2E | `odt/…/fontSize.test.ts` #5, `odt/…/roundtrip.test.ts` #6 (synthetisch), `font-size.spec.ts` §2.6 #4 |
| **4.17 (fehlerhaftes Größenattribut, kein NaN)** | Unit | `docx/…/fontSize.test.ts` #5/#6, `odt/…/fontSize.test.ts` #9 |
| **4.18 (relatives/nicht-pt Attribut)** | Unit | `odt/…/fontSize.test.ts` #7/#8 |
| **4.19 (Bedienelement-Robustheit, sichtbare Rückmeldung)** | E2E | `font-size.spec.ts` §2.1 #1, §2.5 #1–5 |
| Abschnitt 5.1 (vollständige Rundreise-Matrix) | Unit + E2E | `roundtrip.test.ts` (beide) §1.4, `font-size.spec.ts` §2.6 |
| Abschnitt 5.2 (Mindestabdeckung Testdateien) | E2E | `font-size.spec.ts` §2.7 |
| Testfälle 1–16 (Anforderung Abschnitt 8) | Unit + E2E | jeweilige Zeile oben; Testfall-Nummern 1:1 in §2.1–2.10 referenziert |
| Plan-Fund 1 (ODT-Dedup-Key-Ordnung) | Unit | `odt/…/roundtrip.test.ts` §1.5 |
| Plan-Fund 2 (`NaN` nicht schema-seitig abgefangen) | Unit | `docx/…/fontSize.test.ts` #5, `shared/…/fontSize.test.ts` #6 |
| Plan-Fund 3 (ODT-Absatzformat-Ebene, vorbestehender Gap) | Unit (Beleg, kein Fail) | `odt/…/fontSize.test.ts` #12 |
| Plan Abschnitt 3.2 (Reader rundet/clampt NICHT) | Unit | `docx/…/fontSize.test.ts` #7, `odt/…/fontSize.test.ts` #4/#5 |

---

## 4. Abnahme-Checkliste (vor Statuswechsel „verifiziert")

- [ ] `npm test` grün, inkl. aller neuen Dateien aus Abschnitt 1 (`fontSize.test.ts` in
      `shared/__tests__`, `docx/__tests__`, `odt/__tests__`, sowie erweiterte
      `roundtrip.test.ts` in beiden Formaten).
- [ ] `npm run test:e2e` grün auf **allen** konfigurierten Projekten (inkl. Mobile), inkl.
      `font-size.spec.ts` und der Erweiterung von `selection-regression.spec.ts`.
- [ ] Jeder Testfall aus Anforderung Abschnitt 8 (1–16) und jeder Grenzfall aus Abschnitt 4
      (**4.1–4.19**, mit Ausnahme von 4.13, laut Anforderung selbst nachrichtlich) hat
      mindestens einen grünen, dauerhaft in der Suite verbleibenden Test.
- [ ] Die verbindliche **exakte, ungerundete** ODT-Rundreise eines Off-grid-Werts (10,3 pt)
      ist grün — sowohl als Reader-Unit (§1.3 #5) als auch als synthetische ODT-Rundreise
      (§1.4 #6). **Kein** Reader-Test erwartet ein Runden importierter Werte.
- [ ] Die vollständige Rundreise-Matrix aus Anforderung Abschnitt 5.1 ist für DOCX **und**
      ODT grün, inklusive der beiden unabhängigen XML-Validierungen (§2.6 #11–12).
- [ ] Die Mindestabdeckung aus Anforderung Abschnitt 5.2 ist in mindestens einer Testdatei
      je Format tatsächlich erfüllt (nicht nur behauptet) — per Review der in §2.7
      referenzierten Fixtures bestätigt.
- [ ] Die offene Frage aus Anforderung Abschnitt 3.4 ist beantwortet (11 pt **als reiner
      UI-/CSS-Wert, NICHT als Export-Default**, siehe `schriftgroesse-waehlen-code.md`
      Abschnitt 3.3) und der WYSIWYG-Beleg (§2.10) ist grün. Als Regressionssperre bleiben
      die zwei bestehenden Tripwire-Tests (`docx/__tests__/styleDefs.test.ts` „font default";
      `odt/__tests__/roundtrip.test.ts` „ODT writer: font default") **unverändert grün** —
      Beleg, dass kein `w:sz`/`fo:font-size`-Export-Default eingeschlichen wurde.
- [ ] **Determinismus:** kein E2E-Test feuert einen Tastendruck direkt nach einer nativen
      Cursor-Bewegung ohne den `waitForTimeout(50)`-Sync (Regel 2.0.1-1); zeichenweise
      Selektionsschleifen nutzen `{ delay: 20 }`; Selektion per `ControlOrMeta+Home`/`+a`
      statt Pixel-Drag/plain `Home`; Zustandsprüfungen nur über web-first-Assertions
      (`toHaveValue`/`toHaveAttribute`/…), nie über festen `waitForTimeout` als Kriterium —
      stichprobenartig per Review bestätigt.
- [ ] Manuelle Einmalvalidierung einer exportierten Datei mit mehreren unterschiedlichen
      Größen (inkl. 13 pt und 10,5 pt) gegen Word/LibreOffice durchgeführt und vermerkt
      (§1.6).
- [ ] Kein Test in `font-size.spec.ts` bzw. der Erweiterung von `selection-regression.spec.ts`
      ruft `readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`setFontSize`/`clearFontSize`/
      `getFontSizeAtSelection` direkt auf — per Review bestätigt.
- [ ] Für jeden in `schriftgroesse-waehlen-code.md` Abschnitt 2 dokumentierten Zusatzfund
      (ODT-Dedup-Key-Ordnung, `NaN`-Schutz außerhalb des Schemas, ODT-Absatzformat-Ebene-Gap)
      liegt entweder ein Fix mit grünem Regressionstest vor, oder das Verhalten ist bewusst
      als bekannte, vorbestehende Einschränkung dokumentiert (kein stiller Fehlschlag, analog
      `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4).
- [ ] Grenzfall 4.13 (Kopf-/Fußzeile) bleibt als offener, nachrichtlicher Punkt sichtbar
      vermerkt, bis `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` existieren.
