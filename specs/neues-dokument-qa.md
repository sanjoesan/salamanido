# Testplan (QA): „Neues Dokument erstellen"

Gegenstück zu `specs/neues-dokument-req.md` (Anforderungen/Befunde) und
`specs/neues-dokument-code.md` (Umsetzungsplan). Dieser Plan legt fest, **wie** jede
Behauptung aus beiden Dokumenten nachgewiesen wird — mit zwei getrennten Ebenen, die sich
bewusst nicht ersetzen:

1. **Unit-Tests (Vitest)** — schnelle, deterministische Rundreise-Prüfungen auf
   Reader/Writer-Ebene (`writeDocx`/`readDocx`, `writeOdt`/`readOdt`), inklusive
   Bytestruktur-Checks unabhängig vom eigenen Reader.
2. **Echte Playwright-Browser-Tests** — treiben die Anwendung tatsächlich per Klick,
   Tastatur, Datei-Upload und Datei-Download; verifizieren die heruntergeladene Datei mit
   einem vom Produktcode unabhängigen Parser (`JSZip` + `DOMParser`), **nicht** durch
   Aufruf interner Funktionen (`createNew()`/`exportFile()` im Node-Testprozess gilt
   ausdrücklich **nicht** als Ersatz für Abschnitt 2 — das ist genau die im Req-Dokument,
   Abschnitt 3.3 und 6, kritisierte Lücke).

**Vorab-Status geprüft (Ist-Code, Stand dieser Prüfung, 2026-07-04):**
Die im Umsetzungsplan beschriebenen Fixes sind **noch nicht implementiert**:
- `src/formats/shared/editor/WordEditor.tsx` — kein `view.focus()`-Aufruf nach
  `viewRef.current = view` (verifiziert, Zeile 100/101 im Ist-Stand).
- `src/app/FormatPicker.tsx#handleCreateNew` — kein `try/catch` (verifiziert, Zeile 28-33).
- `src/formats/shared/pageGeometry.ts`, `src/formats/docx/pageSetup.ts` — existieren noch
  nicht.
- `src/formats/docx/writer.ts#buildDocumentXml` — schreibt `<w:sectPr>` nur mit optionalen
  `headerReference`/`footerReference`, kein `w:pgSz`/`w:pgMar` (verifiziert, Zeile
  177-182, 231-248).
- `src/formats/odt/writer.ts` — schreibt weiterhin die hartkodierten Literale
  `fo:margin="2.5cm" fo:page-width="21cm" fo:page-height="29.7cm"` (Zeile 145).

Daraus folgt für diesen Testplan: mehrere Testfälle **müssen zunächst rot sein**
(explizit unten markiert). Ein grüner Lauf dieser Fälle **vor** dem jeweiligen Fix ist
selbst ein Befund (Test ist wirkungslos/falsch aufgebaut) und muss QA-seitig blockiert
werden, nicht stillschweigend akzeptiert werden.

---

## 0. Testinfrastruktur (Ist-Stand, verifiziert)

- Unit: `npm run test` → Vitest, `jsdom`-Environment, bestehende Konventionen in
  `src/formats/docx/__tests__/roundtrip.test.ts` / `src/formats/odt/__tests__/roundtrip.test.ts`
  (Hilfsfunktionen `doc(content)`, `paragraph(text, align, marks)`, `roundTrip(content)`).
- E2E: `npm run test:e2e` → Playwright, `playwright.config.ts`, drei Projekte
  (`Desktop Chrome`, `Mobile` = Pixel 7, `Tablet` = iPad Mini), `baseURL` =
  `http://localhost:4173/salamanido/`, Server via `npm run build && npm run preview`.
- Bestehende Konventionen, die dieser Plan wiederverwendet (nicht neu erfindet):
  - Karten-Locator `docxCard(page)`/`odtCard(page)` über
    `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: '...' }) })`
    (`tests/e2e/docx.spec.ts:50`, `tests/e2e/odt.spec.ts:34`).
  - Privacy-Modal muss vor jedem Test weggeklickt werden:
    `await page.getByRole('button', { name: /verstanden/i }).click()`.
  - Download-Verifikation: `page.waitForEvent('download')` +
    `await download.path()` + `fs.readFile` + `JSZip.loadAsync` + gezielte XML-Teil-Extraktion
    — **kein** eigener Reader-Aufruf zur Prüfung, das erfüllt bereits das
    „unabhängiger Parser"-Kriterium aus R1/R2.
- **Bewusste Einschränkung, von QA übernommen (siehe Code-Plan Abschnitt 6.1):** Es gibt
  aktuell **keinen** XSD-/RelaxNG-Validator im Projekt (`libxmljs2`, `xmllint`-WASM o. ä.
  fehlen als Dev-Dependency, verifiziert gegen `package.json`). R1/R2 („gegen das
  OOXML-/ODF-Schema prüfen") werden daher **strukturell** geprüft: wohlgeformtes XML
  (`DOMParser`, kein `parsererror`-Knoten), Pflichtteile vorhanden, korrekte ZIP-Struktur,
  `mimetype`-Sonderregel für ODT. Das ist schwächer als „schema-valide" — dieser Plan
  markiert das als offene Empfehlung (siehe Abschnitt 5), nicht als erledigt.

---

## 1. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

Ziel dieser Ebene: schnelle, deterministische Prüfung der reinen Datenmodell-Transformation
(`WordDocumentContent` → Datei-Bytes → `WordDocumentContent`) sowie XML-Struktur-Checks, die
nicht auf einen laufenden Browser angewiesen sind. **Ersetzt nicht** Abschnitt 2 — siehe
Einleitung.

### 1.1 `createBlankWordDocument()` (Abschnitt 3.2 des Req-Dokuments)

Datei: `src/formats/shared/documentModel.ts` — Test in
`src/formats/shared/__tests__/documentModel.test.ts` (neu).

| # | Test | Erwartung |
|---|---|---|
| U1 | `createBlankWordDocument()` liefert `body.content` mit genau einem Element vom Typ `paragraph`, `attrs.align === 'left'`, leerem `content` (kein Text) | `expect(doc.body.content).toHaveLength(1)`; `expect(doc.body.content[0]).toEqual({ type: 'paragraph', attrs: { align: 'left' } })` |
| U2 | `header === null`, `footer === null` | strikte `toBeNull()` |
| U3 | `meta.title === ''` | strikte `toBe('')`, nicht nur falsy (grenzt `undefined`/`null` explizit aus — Bezug zu R6) |
| U4 | Zwei aufeinanderfolgende Aufrufe liefern **strukturell identische**, aber **nicht objektidentische** Ergebnisse (`toEqual`, nicht `toBe`) — Regressionsschutz gegen versehentlich geteilte Referenzen zwischen zwei „Neu erstellen"-Vorgängen (Grenzfall 8: Dokument 2 darf keine Reste von Dokument 1 über eine gemeinsame Objektreferenz erben) | `expect(a).toEqual(b); expect(a).not.toBe(b); expect(a.body).not.toBe(b.body)` |
| U5 | DOCX und ODT: `docxModule.createNew()` und `odtModule.createNew()` liefern `toEqual`-identische Struktur (Abschnitt 3.2, letzter Punkt: „müssen für DOCX und ODT identisch sein") | Import beider Module, direkter `toEqual`-Vergleich |

### 1.2 DOCX-Rundreise, leeres Dokument (R1, R6, Testfall 4/5)

Datei: `src/formats/docx/__tests__/roundtrip.test.ts` (Ergänzung) oder neue Datei
`src/formats/docx/__tests__/blank-document.test.ts`. Verwendet die bestehenden Hilfsfunktionen
`doc()`/`roundTrip()` aus der Datei, seed-Input ist exakt `createBlankWordDocument()`.

| # | Test | Erwartung |
|---|---|---|
| U6 | `writeDocx(createBlankWordDocument())` dann `readDocx(blob)` → Ergebnis `toEqual(createBlankWordDocument())` (R1, Testfall 5) | voller `toEqual` auf allen vier Feldern |
| U7 | Export-Blob ist ein valides ZIP mit `JSZip.loadAsync` ladbar, enthält `[Content_Types].xml`, `_rels/.rels`, `word/document.xml` (Mindestbestandteile, strukturelle R1-Prüfung ohne Schema-Validator) | `zip.file('word/document.xml')` ist nicht `null` |
| U8 | `word/document.xml` ist wohlgeformtes XML — `new DOMParser().parseFromString(xml, 'application/xml')` liefert **keinen** `parsererror`-Knoten | `expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)` |
| U9 | `meta.title` bleibt nach Rundreise `''` — **nicht** `undefined`, **nicht** `'undefined'`, **nicht** `'Unbenanntes Dokument'` (R6, Abgrenzung `fileName` vs. `meta.title`) | `expect(result.meta.title).toBe('')` |
| U10 | Kein `w:hdr`-/`w:ftr`-Relationship in den Dokument-Rels, wenn `header`/`footer` beide `null` sind (Abschnitt 3.2) | Rels-XML enthält keinen `Type=".../header"`/`.../footer"`-Eintrag |

### 1.3 ODT-Rundreise, leeres Dokument (R2, R6)

Datei: `src/formats/odt/__tests__/roundtrip.test.ts` (Ergänzung) oder
`src/formats/odt/__tests__/blank-document.test.ts`.

| # | Test | Erwartung |
|---|---|---|
| U11 | `writeOdt(createBlankWordDocument())` dann `readOdt(blob)` → `toEqual(createBlankWordDocument())` | analog U6 |
| U12 | **`mimetype` ist der erste Eintrag im ZIP-Directory und unkomprimiert** — R2 verlangt das *separat* zu verifizieren, nicht nur implizit über den Import. Prüfung über die rohen ZIP-Bytes (nicht über `JSZip`s bequeme High-Level-API, die Kompression transparent macht): erstes Local-File-Header-Signaturfeld (`PK\x03\x04`) unmittelbar am Blob-Anfang, Dateiname-Feld `mimetype`, Compression-Method-Feld (Bytes 8-9 relativ zum Header) `=== 0` (STORE) | Byte-Level-Assertion auf `ArrayBuffer`/`Uint8Array`, siehe Testskizze unten |
| U13 | `content.xml`, `styles.xml`, `meta.xml`, `META-INF/manifest.xml` vorhanden und wohlgeformt (`DOMParser`, kein `parsererror`) | wie U8 |
| U14 | `meta.xml` enthält **kein** `<dc:title>` mit Platzhaltertext (weder fehlt das Element mit falschem Inhalt noch enthält es `undefined`/`null`/den Dateinamen) — leeres oder fehlendes `dc:title` ist beides akzeptabel, ein falscher Platzhalter nicht (R6) | Regex/DOM-Check: falls `dc:title` vorhanden, `textContent === ''` |

**Testskizze U12** (Byte-Ebene, Vitest, kein zusätzliches Dev-Dependency nötig):

```ts
it('stores mimetype as the first, uncompressed zip entry', async () => {
  const blob = await writeOdt(createBlankWordDocument())
  const bytes = new Uint8Array(await blob.arrayBuffer())
  // Local File Header: 4 Byte Signatur 'PK\x03\x04', dann 2 Byte Version,
  // 2 Byte Flags, 2 Byte Compression Method (Offset 8-9), ... , Dateiname ab Offset 30.
  expect(bytes[0]).toBe(0x50) // 'P'
  expect(bytes[1]).toBe(0x4b) // 'K'
  expect(bytes[2]).toBe(0x03)
  expect(bytes[3]).toBe(0x04)
  const compressionMethod = bytes[8] | (bytes[9] << 8)
  expect(compressionMethod).toBe(0) // STORE, nicht DEFLATE
  const nameLength = bytes[26] | (bytes[27] << 8)
  const name = new TextDecoder().decode(bytes.slice(30, 30 + nameLength))
  expect(name).toBe('mimetype')
})
```

### 1.4 Seitengeometrie (R5, Abschnitt 3.4 — **erwartet rot bis Fix 3.3/3.4 aus dem Code-Plan**)

Neue Datei: `src/formats/docx/__tests__/pageSetup.test.ts`.

| # | Test | Ist-Erwartung (VOR Fix) | Soll-Erwartung (NACH Fix) |
|---|---|---|---|
| U15 | `writeDocx(doc([paragraph('x')]))` → `word/document.xml` per `DOMParser` parsen, `getElementsByTagNameNS(W_NS, 'sectPr')[0]` prüfen: enthält Kind `w:pgSz` mit `w:w="11906"` `w:h="16838"` | **FEHLSCHLAG** (kein `w:pgSz` vorhanden — Ist-Stand verifiziert, Abschnitt „Vorab-Status" oben) | Muss nach Einbau von `defaultPageSetupXml()`/`pageSetup.ts` grün werden |
| U16 | `w:pgMar` mit `w:top="1417" w:right="1417" w:bottom="1417" w:left="1417"` | FEHLSCHLAG | grün nach Fix |
| U17 | Reihenfolge in `<w:sectPr>`: falls `header`/`footer` gesetzt sind, steht `w:headerReference`/`w:footerReference` **vor** `w:pgSz`/`w:pgMar` (OOXML-`CT_SectPr`-Schema-Reihenfolge; Abschnitt 3.3 des Code-Plans) | n/a (pgSz existiert noch nicht) | Kindknoten-Array von `sectPr` in exakt dieser Reihenfolge |
| U18 | ODT: `writeOdt(...)` → `styles.xml` enthält weiterhin `fo:margin="2.5cm" fo:page-width="21cm" fo:page-height="29.7cm"` (unverändert, nur Quelle refactored) | grün bereits jetzt (Ist-Wert) | muss grün **bleiben** — Regressionsschutz für den in Code-Plan 3.4 als „reiner Refactor" deklarierten Umbau |
| U19 | Wertegleichheit DOCX/ODT: `mmToTwips(210) === 11906`, `mmToTwips(297) === 16838`, `mmToTwips(25) === 1417` (nachgerechnete Werte aus dem Code-Plan, Abschnitt 3.3) sowie `21cm`/`29.7cm`/`2.5cm` entsprechen denselben mm-Werten (210/297/25) — verhindert das befürchtete „unbemerkte Auseinanderlaufen" (Abschnitt 3.2 des Req-Dokuments) | n/a vor Einführung von `pageGeometry.ts` | grün nach Fix, bleibt der zentrale Anti-Drift-Test |

**QA-Anweisung (Pflicht, kein optionaler Hinweis):** U15/U16/U17 müssen **vor** Umsetzung des
Fixes ausgeführt und ihr Fehlschlag protokolliert werden (Screenshot/Testlauf-Log genügt).
Ein direkt grüner Lauf ohne vorherigen roten Lauf ist selbst ein Befund („Test prüft nicht,
was er behauptet zu prüfen") und muss reklamiert werden — exakt der im Req-Dokument (R5,
Testfall 6) verlangte Rot→Grün-Nachweis.

### 1.5 Font-/Stil-Default (Abschnitt 3.5, bewusst dokumentiertes Verhalten, kein Bug)

Neue Datei: `src/formats/docx/__tests__/styleDefs.test.ts` + Ergänzung in
`src/formats/odt/__tests__/roundtrip.test.ts`.

| # | Test | Erwartung |
|---|---|---|
| U20 | `buildDocDefaults()`/`buildStyleDefs()`-Ausgabe (oder Export-XML eines leeren Dokuments) enthält **kein** `w:rFonts`, **kein** `w:sz` innerhalb `w:docDefaults` oder dem `Normal`-Stil | `expect(xml).not.toMatch(/<w:rFonts/); expect(xml).not.toMatch(/<w:sz\b/)` |
| U21 | ODT: `Standard`-Stil (`style:family="paragraph"`) enthält **kein** `style:text-properties` | `expect(xml).not.toMatch(/style:text-properties/)` innerhalb des `Standard`-Stil-Blocks |

Diese beiden Tests sind **Regressionsschutz für ein bewusst offenes Verhalten**, nicht für
einen Fix — sie müssen mit dem heutigen Code bereits grün sein. Schlagen sie fehl, ist das
ein **Abweichungsbefund** gegen Abschnitt 3.5 des Req-Dokuments (impliziter
Font/Size wurde irgendwo doch gesetzt), zu melden, nicht automatisch zu „reparieren".

### 1.6 Fehlerbehandlung im Erstell-Pfad, Modul-Ebene (Abschnitt 3.8, ergänzend zu Abschnitt 2)

`handleCreateNew` selbst ist UI-Code und wird primär in Abschnitt 2 (Komponententest,
`FormatPicker.test.tsx`) geprüft — hier nur der reine Modul-Vertrag:

| # | Test | Erwartung |
|---|---|---|
| U22 | `FormatModule.createNew` ist laut `types.ts` synchron (`() => TContent`, kein `Promise`) — Typtest/Kompilierprobe, dass `docxModule.createNew()`/`odtModule.createNew()` **kein** `.then` haben (`expect(typeof result.then).not.toBe('function')`) | schützt die im Code-Plan (3.2 „bleibt synchron") getroffene Entscheidung vor stillschweigender Aufweichung |

---

## 2. Echte Playwright-Browser-Tests (Klick, Tippen, Upload, Download, Dateiprüfung)

**Kernprinzip dieser Ebene:** Jede Aktion läuft über echte Nutzerinteraktion
(`page.getByRole(...).click()`, `page.keyboard.type(...)`, `page.keyboard.press(...)`,
`input.setInputFiles(...)`) gegen die im Browser laufende Anwendung. Kein Test in diesem
Abschnitt ruft `createNew()`, `exportFile()`, `writeDocx()` o. ä. direkt im Testprozess auf.
Wo eine Datei geprüft wird, ist es **immer** die tatsächlich über `page.waitForEvent('download')`
heruntergeladene Datei, geparst mit `JSZip`/`DOMParser` (unabhängig vom eigenen Reader) — genau
das vom Req-Dokument (Abschnitt 6, Einleitung) explizit verlangte Vorgehen.

Neue Datei: `tests/e2e/new-document.spec.ts`. Parametrisiert über die bestehenden
`docxCard`/`odtCard`-Helper (siehe Abschnitt 0), sodass jeder Testfall **für beide Formate**
läuft (`test.describe.each` oder zwei parallele `test.describe`-Blöcke analog zu
`docx.spec.ts`/`odt.spec.ts`). Läuft ungefiltert in allen drei `playwright.config.ts`-Projekten
(Desktop/Mobile/Tablet) — deckt Testfall 12/Grenzfall 10 ab, ohne Sonderkonfiguration.

### 2.1 Grundfall: Erstellen, sichtbarer Zustand (Testfall 1)

```ts
test('creates a new document: correct file name, no dirty indicator, no error banner', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()

  await expect(page.getByText('Unbenanntes Dokument.docx')).toBeVisible()
  await expect(page.getByText('● ungespeichert')).not.toBeVisible()
  await expect(page.getByRole('alert')).not.toBeVisible()
  await expect(page.locator('.ProseMirror')).toBeVisible()
})
```
Analog für ODT mit `odtCard`/`Unbenanntes Dokument.odt`.

### 2.2 **Fokus ohne Klick — zentraler Regressionstest (Testfall 2, Abschnitt 3.3)**

**Muss vor dem `view.focus()`-Fix rot sein, danach dauerhaft grün.** Höchste Priorität laut
Req-Dokument.

```ts
test('types immediately after creating a new document, without any prior click', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()

  await expect(page.locator('.ProseMirror')).toBeVisible()
  // BEWUSST: kein editor.click() hier — genau das ist der Prüfgegenstand.
  await page.keyboard.type('SofortTippen')

  await expect(page.locator('.ProseMirror')).toContainText('SofortTippen')
})
```

**QA-Anweisung:** Diesen Test unmittelbar nach dem Schreiben gegen den **ungefixten** Stand
laufen lassen und das Fehlschlagen protokollieren (erwarteter leerer Editor, da der Fokus
fehlt und `keyboard.type` ins Leere geht bzw. gegen `document.body` läuft). Danach den Fix aus
`specs/neues-dokument-code.md` Abschnitt 3.1 einbauen und denselben Test erneut grün laufen
lassen. Ein Test, der schon vor dem Fix grün ist, ist falsch aufgebaut (z. B. weil Playwright
per Default irgendeinen Fokus setzt) und muss korrigiert werden, bevor er als Nachweis zählt.

### 2.3 Tastatur-only-Auslösung (Testfall 3, Grenzfall 3)

```ts
test('creates a new document via keyboard only (Tab/focus + Enter)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()

  const button = docxCard(page).getByRole('button', { name: 'Neu erstellen' })
  await button.focus()
  await expect(button).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page.getByText('Unbenanntes Dokument.docx')).toBeVisible()
  await expect(page.locator('.ProseMirror')).toBeVisible()

  // Leertaste als zweite, unabhängige Aktivierungsart auf einem frischen Durchlauf prüfen:
})

test('creates a new document via keyboard only (Space)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  const button = docxCard(page).getByRole('button', { name: 'Neu erstellen' })
  await button.focus()
  await page.keyboard.press(' ')
  await expect(page.locator('.ProseMirror')).toBeVisible()
})
```

### 2.4 Export unveränderten leeren Dokuments + Re-Import (R1/R2, Testfall 4/5)

```ts
test('exports an unmodified new document; the file is structurally valid and re-import yields the same empty state', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await expect(page.locator('.ProseMirror')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('Unbenanntes Dokument.docx')

  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile((await download.path())!)

  // 1) Unabhängige Struktur-Prüfung (kein Aufruf von src/formats/docx/reader.ts):
  const zip = await JSZip.loadAsync(buffer)
  expect(zip.file('[Content_Types].xml')).not.toBeNull()
  expect(zip.file('word/document.xml')).not.toBeNull()
  const documentXml = await zip.file('word/document.xml')!.async('text')
  const parsed = new DOMParser().parseFromString(documentXml, 'application/xml')
  expect(parsed.getElementsByTagName('parsererror')).toHaveLength(0)

  // 2) Re-Import ÜBER DIE UI (echter Upload-Weg, kein direkter Funktionsaufruf):
  await page.reload()
  await page.getByRole('button', { name: /verstanden/i }).click()
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({
    name: 'reimport.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer,
  })
  const editor = page.locator('.ProseMirror')
  await expect(editor).toBeVisible()
  await expect(editor).toHaveText('') // ein leerer Absatz, kein Text
  await expect(page.getByText('● ungespeichert')).not.toBeVisible()
})
```

Für ODT zusätzlich (R2, „muss zusätzlich separat verifiziert werden"):

```ts
test('ODT: mimetype is the first, uncompressed zip entry in the downloaded file', async ({ page }) => {
  // ... bis zum Download wie oben, odtCard statt docxCard ...
  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  expect(bytes[0]).toBe(0x50)
  expect(bytes[1]).toBe(0x4b)
  expect(bytes[2]).toBe(0x03)
  expect(bytes[3]).toBe(0x04)
  const compressionMethod = bytes[8] | (bytes[9] << 8)
  expect(compressionMethod).toBe(0)
  const nameLength = bytes[26] | (bytes[27] << 8)
  expect(new TextDecoder().decode(bytes.slice(30, 30 + nameLength))).toBe('mimetype')
})
```

*(Diese Byte-Prüfung dupliziert bewusst U12 auf E2E-Ebene — U12 prüft die vom Writer direkt
erzeugte Blob, dieser Test prüft die tatsächlich über einen echten Browser-Download
angekommene Datei; ein Unterschied wäre ein browser-/Download-Pfad-spezifischer Bug, den U12
nicht sehen könnte.)*

### 2.5 Seitenformat der Exportdatei (Testfall 6, R5 — **erwartet rot für DOCX bis Fix 3.3**)

```ts
test('exported page size matches the displayed A4 default', async ({ page }) => {
  // ... Neu erstellen, unverändert exportieren wie in 2.4 ...
  const documentXml = await zip.file('word/document.xml')!.async('text')
  const parsed = new DOMParser().parseFromString(documentXml, 'application/xml')
  const pgSz = parsed.getElementsByTagNameNS(W_NS, 'pgSz')[0]
  expect(pgSz?.getAttribute('w:w')).toBe('11906')
  expect(pgSz?.getAttribute('w:h')).toBe('16838')
  const pgMar = parsed.getElementsByTagNameNS(W_NS, 'pgMar')[0]
  expect(pgMar?.getAttribute('w:top')).toBe('1417')
})
```

**QA-Anweisung:** Dieser Testfall **muss** vor Einbau des Fixes aus Code-Plan Abschnitt 3.3
rot sein (`pgSz` ist `undefined`, `getAttribute` liefert `null`) — das ist der geforderte
Nachweis für den in Req-Abschnitt 3.4 dokumentierten Bug, kein Testfehler. Für ODT parallel
gegen `style:page-layout-properties` `fo:margin="2.5cm"` etc. prüfen — dieser Teil ist bereits
heute grün (Ist-Wert), muss es auch bleiben.

### 2.6 Schließen ohne Änderung → kein Dialog (Testfall 8, Grenzfall 5)

```ts
test('closing immediately after creation asks no confirmation', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  let dialogFired = false
  page.on('dialog', () => { dialogFired = true })
  await page.getByRole('button', { name: '← Formate' }).click()
  expect(dialogFired).toBe(false)
  await expect(page.getByRole('heading', { name: /salamanido/i })).toBeVisible()
})
```

### 2.7 Schließen nach Änderung → Dialog, Abbrechen erhält Inhalt (Testfall 9, Grenzfall 4)

```ts
test('closing after an edit asks for confirmation; cancelling keeps the document open with content intact', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Wichtiger Text')

  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: '← Formate' }).click()

  await expect(editor).toContainText('Wichtiger Text')
  await expect(page.getByText('● ungespeichert')).toBeVisible()
})

test('closing after an edit and confirming returns to the format picker', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('X')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '← Formate' }).click()

  await expect(page.getByRole('heading', { name: /salamanido/i })).toBeVisible()
})
```

### 2.8 Undo bis zum leeren Ausgangszustand → `dirty` bleibt sichtbar (Testfall 10, Grenzfall 6)

```ts
test('undo back to empty leaves content empty but the dirty indicator remains visible', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('temp')
  await expect(editor).toContainText('temp')

  await page.keyboard.press('ControlOrMeta+z')
  await page.keyboard.press('ControlOrMeta+z')
  await page.keyboard.press('ControlOrMeta+z')
  await page.keyboard.press('ControlOrMeta+z')

  await expect(editor).toHaveText('')
  await expect(page.getByText('● ungespeichert')).toBeVisible() // bewusst akzeptiertes Verhalten, siehe Abschnitt 3.7
})
```

### 2.9 Zwei aufeinanderfolgende „Neu erstellen"-Zyklen (Testfall 11, Grenzfall 8)

```ts
test('two consecutive create-new cycles leave no leftover content or duplicated toolbars', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
  page.on('pageerror', (err) => consoleErrors.push(String(err)))

  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('Dokument eins')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '← Formate' }).click()
  await expect(page.getByRole('heading', { name: /salamanido/i })).toBeVisible()

  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await expect(editor).toBeVisible()
  await expect(editor).not.toContainText('Dokument eins')
  await expect(editor).toHaveText('')
  await expect(page.getByRole('toolbar')).toHaveCount(1)

  expect(consoleErrors).toEqual([])
})
```

*(Falls die Toolbar keine explizite `role="toolbar"` trägt, ist das zuerst gegen den
tatsächlichen DOM zu verifizieren und der Locator entsprechend anzupassen — z. B. über einen
stabilen Test-Anker wie `data-testid` oder die Elternklasse der Toolbar; kein Blindflug mit
`page.locator('.toolbar')` ohne vorherige Prüfung, dass diese Klasse existiert.)*

### 2.10 Fehlerbanner wird beim Neuerstellen zurückgesetzt (Grenzfall 9)

```ts
test('creating a new document clears a previous import error banner', async ({ page }) => {
  // Importfehler provozieren: eine offensichtlich ungültige Datei hochladen.
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({
    name: 'kaputt.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.from('nicht wirklich ein zip'),
  })
  await expect(page.getByRole('alert')).toBeVisible()

  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await expect(page.getByRole('alert')).not.toBeVisible()
})
```

### 2.11 Sofortiger Export vor Fokus/Render-Beruhigung (Grenzfall 12)

```ts
test('exporting immediately after creation, with no waiting, still reflects the empty body', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  // BEWUSST: kein await auf sichtbaren Editor/Toolbar vor dem Export-Klick.
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise

  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile((await download.path())!)
  const zip = await JSZip.loadAsync(buffer)
  const documentXml = await zip.file('word/document.xml')!.async('text')
  // Kein Text außer dem leeren Absatz — konkret: keine <w:t>-Elemente mit Inhalt.
  const parsed = new DOMParser().parseFromString(documentXml, 'application/xml')
  const textRuns = Array.from(parsed.getElementsByTagNameNS(W_NS, 't')).map((n) => n.textContent)
  expect(textRuns.every((t) => !t)).toBe(true)
})
```

### 2.12 Basis-Rundreise mit Inhalt (Testfall 7, R3/R4)

Bereits durch bestehende Tests abgedeckt — **nicht neu schreiben, nur referenzieren und
gegenprüfen:**
- `tests/e2e/docx.spec.ts:60` „creates a new document, types and bolds text, and exports it"
- `tests/e2e/odt.spec.ts:44` „creates a new document, types and bolds text, and exports it"

QA-Aufgabe hier: beide Tests laufen lassen und verifizieren, dass sie **tatsächlich** auf
„Neu erstellen" aufsetzen (nicht auf Upload) — bereits der Fall, siehe Zeilen oben. Keine
Codeänderung nötig, nur Ausführungsnachweis im Testlauf-Protokoll.

### 2.13 Konsole/Exceptions über den gesamten Ablauf (Testfall 14)

```ts
test('the full create → type → format → export flow stays free of console errors and unhandled rejections', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (msg) => { if (msg.type() === 'error') problems.push(`console.error: ${msg.text()}`) })
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`))
  page.on('crash', () => problems.push('page crashed'))

  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await page.keyboard.type('Text ohne Klick')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  await downloadPromise

  expect(problems).toEqual([])
})
```

### 2.14 Dateiname mit Umlauten (Testfall 13 — **umformuliert, siehe Befund unten**)

**Befund (bestätigt den im Code-Plan Abschnitt 6.2 bereits dokumentierten Punkt):** In
`src/app/DocumentWorkspace.tsx` (verifiziert, Zeile 49-51) ist `document.fileName` reine
Anzeige — kein Eingabefeld, keine Rename-Funktion. Testfall 13 in der Formulierung des
Req-Dokuments („Umlaute im **nachträglich vom Nutzer geänderten** Dateinamen, ausgehend von
einem neu erstellten Dokument") ist **nicht durchführbar**, ohne vorher eine
Rename-UI zu bauen — das ist kein QA-Fehler, sondern eine reale Lücke im Prüfgegenstand.
**Entscheidung (übernommen aus Code-Plan 6.2):** Test läuft stattdessen über den
Datei-Upload-Weg mit Umlaut-Dateinamen, deckt denselben Download-Namen-Kodierungspfad
(`downloadBlob`, `src/lib/download.ts`) ab:

```ts
test('downloading a file with umlauts in its name preserves the exact file name', async ({ page }) => {
  const buffer = await buildSampleDocx() // wiederverwendet aus docx.spec.ts / gleiche Hilfsfunktion
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({
    name: 'Übersicht Prüfbericht äöü.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer,
  })
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('Übersicht Prüfbericht äöü.docx')
})
```

**Offener Punkt, an PO/Backlog zurückzumelden:** Sobald `fileName`-Rename existiert (kein Teil
dieses Tickets laut Code-Plan Entscheidung 5), ist Testfall 13 in seiner ursprünglichen Form
(Rename **nach** „Neu erstellen", nicht nach Upload) nachzuholen.

### 2.15 R7 — Cross-Format-Export, bewusst offen (Abschnitt 4, R7)

```ts
test.fixme('R7: creates a new document and exports it under the other format without losing content', async ({ page }) => {
  // Absichtlich test.fixme: es gibt aktuell keinen UI-Weg, ein an docxModule
  // gebundenes Dokument als ODT zu exportieren (Backlog-Eintrag
  // `speichern-unter-format`, Priorität 2, separates Ticket).
  // Dieser Test bleibt bestehen und sichtbar `fixme`, damit R7 nicht
  // fälschlich als "kein Test vorhanden = kein Problem" verschwindet.
})
```

**QA-Anweisung:** `test.fixme` **nicht** löschen und **nicht** in `test.skip` ohne Kommentar
umwandeln — der sichtbare, benannte Fixme-Eintrag ist Teil des Nachweises, dass R7 offen
bleibt (Req-Dokument Abschnitt 4, letzter Satz: „kein bestehender Test darf ihn als
‚bestanden' ausweisen").

### 2.16 Fehlerbehandlung beim Erstellen (Abschnitt 3.8) — Komponententest statt E2E

Da `createNew()` im Ist-Code garantiert nicht wirft, lässt sich ein echter Fehlerfall nicht
per Playwright gegen die reale Anwendung erzeugen, ohne den Produktcode selbst zu
verändern (z. B. Modul mit absichtlich werfendem `createNew` injizieren). Diese Prüfung
gehört daher — abweichend vom generellen „echter Browser"-Prinzip dieses Abschnitts, mit
Begründung — in einen **Komponententest** (`@testing-library/react`, `jsdom`), analog zum
bestehenden Muster in `src/app/__tests__/FormatPicker.test.tsx`:

```tsx
it('shows an error message when creating a new document fails', async () => {
  const brokenModule = { ...docxModule, createNew: () => { throw new Error('vorlage kaputt') } }
  const onOpen = vi.fn()
  render(<FormatPicker modules={[brokenModule]} planned={[]} onOpen={onOpen} />)

  await userEvent.click(screen.getByRole('button', { name: 'Neu erstellen' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(/vorlage kaputt/)
  expect(onOpen).not.toHaveBeenCalled()
})

it('rapid double-click on "Neu erstellen" does not throw and calls onOpen twice with consistent payloads', async () => {
  const onOpen = vi.fn()
  render(<FormatPicker modules={[docxModule]} planned={[]} onOpen={onOpen} />)
  const button = screen.getByRole('button', { name: 'Neu erstellen' })
  fireEvent.click(button)
  fireEvent.click(button)
  expect(onOpen).toHaveBeenCalledTimes(2)
  expect(onOpen.mock.calls[0][1]).toEqual(onOpen.mock.calls[1][1])
})
```

**Wichtig, kein Widerspruch zur Regel „ECHTE Browser-Tests":** Diese beiden Fälle prüfen
React-Fehlerausbreitung/Render-Verhalten, nicht Datei-I/O oder Browser-Bedienung im
eigentlichen Sinn — deshalb hier ausdrücklich als Ausnahme vom sonst geltenden
Playwright-Only-Prinzip dieses Abschnitts deklariert, nicht als Ersatz für 2.1-2.15.

### 2.17 Mount/Unmount-Hygiene, ergänzend (Grenzfall 8)

Ergänzt 2.9 auf schnellerer, deterministischerer Ebene — Komponententest, kein E2E, mit
Begründung analog zu 2.16 (technische Lifecycle-Prüfung, kein Nutzerfluss):

Neue Datei: `src/formats/shared/editor/__tests__/WordEditor.test.tsx`. Rendert `WordEditor`
zweimal nacheinander (`render`/`unmount`) mit je frischem `createBlankWordDocument()`-Inhalt,
prüft `EditorView.prototype.destroy`-Spy wird beim Unmount aufgerufen und der zweite Mount
enthält keinen Text aus dem ersten Zyklus.

---

## 3. Viewport-Abdeckung (Testfall 12, Grenzfall 10)

Kein Sonderaufwand nötig: Da `tests/e2e/new-document.spec.ts` **keine** `test.use({ ... })`-
Projekt-Filter setzt, laufen alle Tests aus Abschnitt 2 automatisch in allen drei
`playwright.config.ts`-Projekten (`Desktop Chrome`, `Mobile`, `Tablet`). QA-Aufgabe:
nach Testlauf explizit die Playwright-HTML-Report-Ausgabe (`npx playwright show-report`)
projektweise durchsehen — insbesondere Testfall 2.2 (Fokus ohne Klick) auf `Mobile`/`Tablet`,
da synthetische Playwright-Keyboard-Events (nicht das reale OS-Keyboard) verwendet werden und
laut Code-Plan Abschnitt 3.1 „bekannte, akzeptierte Grenze" **nicht** durch die fehlende
virtuelle Bildschirmtastatur beeinträchtigt sein sollten — falls doch, ist das ein neuer
Befund, kein bekanntes Verhalten.

---

## 4. Zuordnung zu den Testfällen aus `neues-dokument-req.md` Abschnitt 6

| Testfall (Req, Abschnitt 6) | Abgedeckt durch |
|---|---|
| 1 | 2.1 |
| 2 | 2.2 (muss zuerst rot sein) |
| 3 | 2.3 |
| 4 | 2.4 + U6-U9 (Unit-Vorabprüfung) |
| 5 | 2.4 + U6 |
| 6 | 2.5 + U15-U17 (muss für DOCX zuerst rot sein) |
| 7 | 2.12 (bestehende Tests referenziert) |
| 8 | 2.6 |
| 9 | 2.7 |
| 10 | 2.8 |
| 11 | 2.9 + 2.17 |
| 12 | Abschnitt 3 (alle Projekte automatisch) |
| 13 | 2.14 (umformuliert, mit dokumentiertem Befund) |
| 14 | 2.13 |

| Rundreise-Anforderung (Req, Abschnitt 4) | Abgedeckt durch |
|---|---|
| R1 (DOCX, leer) | U6-U9, 2.4 |
| R2 (ODT, leer, inkl. mimetype) | U11-U14, 2.4 (ODT-Variante) |
| R3 (DOCX, mit Inhalt) | 2.12 (bestehender Test) |
| R4 (ODT, mit Inhalt) | 2.12 (bestehender Test) |
| R5 (Seitenformat) | U15-U19, 2.5 — DOCX-Teil muss zuerst rot sein |
| R6 (Titel-Rundreise) | U9, U14, 2.4 |
| R7 (Cross-Format) | 2.15, bewusst `test.fixme` |
| R8 (Doppelte Rundreise) | nicht Teil dieses Plans — abhängig von R7, erst nach dessen Umsetzung planbar (siehe Req-Abschnitt 4, R8: „sobald R7 umgesetzt ist") |

---

## 5. Bewusste Einschränkungen dieses Testplans (an PO/Lead zurückzumelden)

1. **Keine echte OOXML-/ODF-Schema-Validierung** (XSD/RelaxNG) — nur strukturelle Prüfung
   (Wohlgeformtheit, Pflichtteile, ZIP-Struktur, `mimetype`-Sonderregel). Empfehlung
   unverändert aus dem Code-Plan übernommen: `libxmljs2` oder WASM-`xmllint` als
   Dev-Dependency plus offizielle ECMA-376-/OASIS-ODF-1.3-Schemata als Fixtures in einem
   Folge-Ticket ergänzen.
2. **Testfall 13 (Umlaute im Dateinamen) läuft über den Upload-Pfad, nicht über einen
   Rename-nach-Erstellen-Pfad**, weil Letzterer laut Code-Review keine UI hat (siehe 2.14).
   Zurückzumelden als eigenständige Lücke unabhängig von diesem Feature.
3. **R8 wird nicht getestet**, da R7 (Cross-Format-Export) noch nicht existiert — R8 baut
   laut Req-Dokument explizit auf R7 auf.
4. **Testfall 2.16 (Fehlerpfad beim Erstellen) und 2.17 (Mount/Unmount-Hygiene) laufen als
   Komponententest, nicht als Playwright-E2E-Test**, mit expliziter Begründung (kein
   realer Fehlerfall im Ist-Code provozierbar bzw. reine Lifecycle-Technikprüfung ohne
   Nutzerfluss-Charakter) — bewusste, dokumentierte Ausnahme vom sonst in Abschnitt 2
   geltenden Playwright-Only-Prinzip, keine stillschweigende Aufweichung.

---

## 6. Abnahmekriterium

Der Backlog-Status für `neues-dokument` darf erst von „vorhanden" auf „bestätigt vorhanden
(mit Einschränkungen, siehe Abschnitt 5 dieses Dokuments)" geändert werden, wenn:

1. Alle Unit-Tests aus Abschnitt 1 grün sind, **inklusive** des dokumentierten
   Rot→Grün-Nachweises für U15-U17 (Screenshot/Log des roten Laufs vor dem Fix liegt vor).
2. Alle Playwright-Tests aus Abschnitt 2 in allen drei Projekten
   (Desktop Chrome/Mobile/Tablet) grün sind, **inklusive** des dokumentierten
   Rot→Grün-Nachweises für 2.2 und 2.5.
3. `test.fixme('R7: ...')` weiterhin vorhanden und als offen sichtbar ist (nicht gelöscht,
   nicht in einen unauffälligen `test.skip` ohne Erklärung umgewandelt).
4. `npm run test` und `npm run test:e2e` beide ohne manuelle Nacharbeit vollständig
   durchlaufen (`npm run lint` ebenfalls, da neue Dateien wie `pageGeometry.ts`/
   `pageSetup.ts` sonst nicht denselben Qualitätsstandard durchlaufen wie der Bestandscode).
