# Unterstrichen (einfach) — QA-Testplan

Gegenstück zu `specs/unterstrichen-einfach-req.md` (verbindliche Anforderung) und
`specs/unterstrichen-einfach-code.md` (Dev-Umsetzungsplan mit Code-Audit). Dieser Plan
beschreibt, **wie** die in der Anforderung Abschnitt 6/8 geforderte Verifikation konkret
als automatisierte Tests umgesetzt wird — Datei für Datei, Testfall für Testfall,
zurückgeführt auf tatsächlich im Repo vorhandene Selektoren, Fixtures und Funktionsnamen
(gegengeprüft am Stand dieses Repos, nicht nur an den beiden Spec-Dateien).

**Nicht Ziel dieses Dokuments:** Bugs zu fixen. Ziel ist, Tests so zu schreiben, dass sie
den in `unterstrichen-einfach-code.md` Abschnitt 3 dokumentierten Ist-Zustand — inklusive
der beiden dort neu gefundenen, **noch nicht behobenen** Bugs — ehrlich sichtbar machen,
statt ihn durch zu lasche Assertions oder übersprungene Tests zu verschleiern (das ist
exakt die Kritik aus Anforderungsabschnitt 7 an bisherige Praxis).

**Gegengeprüft am aktuellen Code (Stand dieses QA-Plans):** `src/formats/odt/reader.ts`
liest `<style:text-properties>` in `parseAutomaticStyles` weiterhin nur für
`family === 'text'` (Zeile 47–61), `family === 'paragraph'` wertet nur
`paragraph-properties`/`fo:text-align` aus (Zeile 62–66); `decodeInline`/`walk` ruft für
jedes direkte `<text:p>`-Kind weiterhin `walk(child, [])` auf (Zeile 118) und kennt nur
`text:span`/`text:line-break`/`text:s`/`text:tab` (Zeile 104–115) — `<text:a>` fällt
weiterhin durch. `src/formats/docx/reader.ts`, `marksFromRunProperties` (Zeile 99–105)
konsultiert weiterhin nur das `<w:rPr>` des Laufs selbst, keinen Formatvorlagen-Default
aus `styles.xml`. Die in `unterstrichen-einfach-code.md` Abschnitt 3.1–3.5 vorgeschlagenen
Fixes sind **zum Zeitpunkt dieses Testplans noch nicht implementiert.** Der Testplan ist
so geschrieben, dass er unabhängig vom Fix-Zeitpunkt korrekt bleibt (Abschnitt 7 dieses
Dokuments benennt genau, welche Tests deshalb aktuell absichtlich ROT sind).

---

## 1. Testumgebung & Rahmenbedingungen

| Aspekt | Wert |
|---|---|
| Unit-Test-Runner | Vitest (`jsdom`-Environment), Befehl `npm test` (= `vitest run`) bzw. `npm run test:watch` |
| E2E-Runner | Playwright, Befehl `npm run test:e2e` (= `playwright test`), Config `playwright.config.ts` |
| E2E Base-URL | `http://localhost:4173/salamanido/` (Preview-Build, `webServer` startet `npm run build && npm run preview -- --port 4173` automatisch) |
| E2E-Projekte | „Desktop Chrome", „Mobile" (Pixel 7), „Tablet" (iPad Mini) — alle drei Projekte laufen für jede `.spec.ts`-Datei; Unterstrichen-Tests laufen dadurch automatisch auch auf Touch-Viewports mit |
| Bestehende Testdateien (Referenz für Konventionen) | `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, `tests/e2e/selection-regression.spec.ts`, `src/formats/{docx,odt}/__tests__/roundtrip.test.ts`, `src/formats/{docx,odt}/__tests__/external-fixtures.test.ts` |
| Fixture-Verzeichnisse | `tests/fixtures/external/docx/`, `tests/fixtures/external/odt/` (reale, nicht selbst erzeugte Dateien aus Apache-POI-/ODF-Toolkit-Testkorpora) |
| Reale UI-Selektoren (verifiziert im Code) | Privacy-Banner: `page.getByRole('button', { name: /verstanden/i })`; Karten: `div.rounded-lg` mit Heading „Word-Dokument (.docx)" bzw. „OpenDocument Text (.odt)"; „Neu erstellen"/„Exportieren"-Buttons je Karte; Editor: `.ProseMirror`; Toolbar-Button: `page.getByTitle('Unterstrichen')` (analog `'Fett'`, `'Kursiv'`, `'Durchgestrichen'`); Datei-Upload: `<card>.locator('input[type="file"]')`; Bild-Upload: Label „🖼 Bild" mit `input[type="file"][accept="image/*"]`; Tabelle einfügen: `getByRole('button', { name: 'Tabelle einfügen' })`; Textfarbe/Hervorhebung: `input[aria-label="Textfarbe"]` / `input[aria-label="Hervorhebungsfarbe"]` |

---

## 2. Teststrategie-Überblick

Zwei unabhängige, sich ergänzende Ebenen, wie in Anforderungsabschnitt 7 gefordert —
**keine ersetzt die andere**:

| Ebene | Beweist | Beweist NICHT |
|---|---|---|
| **A. Unit-Tests (Vitest)**, Abschnitt 4 dieses Plans | Reader/Writer-Funktionen sind für gegebenes XML/JSON korrekt (inkl. Verhalten gegen echte Fremddatei-Bytes aus dem Fixture-Korpus) | dass der Toolbar-Button klickbar ist, dass Strg+U im echten Editor funktioniert, dass der Button-Zustand sich mit dem Cursor mitbewegt, dass ein über die UI erzeugtes Dokument dieselbe Struktur wie handgebautes JSON erzeugt |
| **B. E2E-Tests (Playwright, echter Browser)**, Abschnitt 5 dieses Plans | Klick/Tastatur wirken im echten DOM, Datei-Upload über echtes `<input type="file">`, Export über echten Browser-Download-Event, heruntergeladene Datei wird nachträglich entpackt und ihr XML-Inhalt geprüft | Detailverhalten einzelner Reader-Codepfade bei exotischen XML-Varianten (dafür sind die Unit-Tests da — im Browser ließe sich das nur mit unzumutbarem Aufwand nachbauen) |

Beide Ebenen zusammen decken Anforderungsabschnitt 6 (Testfälle), Abschnitt 5
(Rundreise) und Abschnitt 4 (Grenzfälle) ab. Die Zuordnung im Detail steht in Abschnitt 6
dieses Plans.

---

## 3. Testfall-Nomenklatur

Jeder Testfall wird mit einer stabilen ID benannt, die in Commit-Messages, PR-Beschreibungen
und im Testnamen selbst wiederverwendet wird, damit Abnahme (Anforderungsabschnitt 8)
eindeutig nachvollziehbar bleibt:

- `U-TF-<n>` — Testfall n aus Anforderungsabschnitt 6.
- `U-GF-<n>` — Grenzfall n aus Anforderungsabschnitt 4.
- `U-RT-<n>` — Rundreise-Testfall n aus Anforderungsabschnitt 5.
- `U-BUG-<n>` — während dieser Verifikation gefundener, in `unterstrichen-einfach-code.md`
  Abschnitt 3 dokumentierter Fehler (Nummerierung folgt der dortigen Abschnittsnummer,
  z. B. `U-BUG-3.1`).

---

## 4. Teil A — Unit-Tests Reader/Writer-Rundreise (Vitest)

### 4.1 Bestehender Test — Ist-Stand, keine Änderung nötig

`src/formats/docx/__tests__/roundtrip.test.ts` und
`src/formats/odt/__tests__/roundtrip.test.ts`, jeweils Testfall
`'preserves bold, italic, underline, and strikethrough independently'` (Zeile 57–78):
konstruiert ProseMirror-JSON mit `marks: [{ type: 'underline' }]`, schreibt via
`writeDocx`/`writeOdt`, liest via `readDocx`/`readOdt` zurück, prüft
`marks` `toEqual([{ type: 'underline' }])`. Bleibt Teil der Suite (deckt den einfachsten
Eigenrundreise-Fall ab), ersetzt aber laut Anforderungsabschnitt 7 **nicht** die unten
stehenden Fremddatei- und Formatvorlagen-Tests.

### 4.2 Neu: `src/formats/docx/__tests__/underline.test.ts`

**Test-Helper:** analog `tests/e2e/docx.spec.ts::buildSampleDocx` — minimaler, selbst
gebauter DOCX-Zip (JSZip), unabhängig vom eigenen Writer, mit steuerbarem
`document.xml`- **und** `styles.xml`-Inhalt (letzteres neu, für 4.2.2 benötigt).

```ts
import JSZip from 'jszip'
import { readDocx } from '../reader'

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'

async function buildDocx(bodyXml: string, stylesXmlExtra = ''): Promise<Blob> {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', /* wie buildSampleDocx in tests/e2e/docx.spec.ts */ CONTENT_TYPES_XML)
  zip.folder('_rels')!.file('.rels', RELS_XML)
  zip.folder('docProps')!.file('core.xml', CORE_XML)
  zip.folder('word')!.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NS}><w:body>${bodyXml}</w:body></w:document>`,
  )
  zip.folder('word')!.file(
    'styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W_NS}>${stylesXmlExtra}</w:styles>`,
  )
  return new Blob([await zip.generateAsync({ type: 'nodebuffer' })])
}

function firstRunMarks(result: Awaited<ReturnType<typeof readDocx>>): string[] {
  const run = (result.body as any).content[0].content[0]
  return (run.marks ?? []).map((m: any) => m.type)
}
```

**Testfälle:**

| # | Testname | Eingabe | Erwartung |
|---|---|---|---|
| 4.2.1 | `w:val="single"` → underline erkannt | `<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>Text</w:t></w:r>` | `marks` enthält `underline` |
| 4.2.2 | `w:val="none"` → kein underline | dito mit `w:val="none"` | `marks` enthält **kein** `underline` |
| 4.2.3 (`U-GF-9`) | `w:val` ∈ {`double`, `wave`, `dotted`, `dash`} — Fremdwerte, im Korpus nicht vorhanden, daher **handgebaut** | je ein Testfall pro Wert (`it.each`) | Reader vereinfacht aktuell auf „einfach" (Mark `underline` gesetzt) — Test fixiert dieses **dokumentierte** Fallback-Verhalten explizit, kein stiller Bug (siehe Anforderung Abschnitt 4, Grenzfall 9) |
| 4.2.4 (`U-GF-14`) | `w:val="NONE"`, `w:val="SINGLE"` (Großschreibung) | `it.each` | **Aktuell (unfixed) erwartetes Ergebnis:** `NONE` wird NICHT als `none` erkannt (Code vergleicht exakten Kleinbuchstaben-String, Zeile 105) → Mark wird fälschlich gesetzt. Test dokumentiert das als `U-BUG-3.4` (siehe Abschnitt 7) — **nicht** einfach das aktuell falsche Verhalten als „grün" fixieren, sondern mit Kommentar `// aktuell: Großschreibung wird nicht normalisiert, siehe unterstrichen-einfach-code.md Abschnitt 3.4` versehen, damit der Test beim Fix bewusst angepasst werden muss |
| 4.2.5 (`U-BUG-3.2`, aus `unterstrichen-einfach-code.md` Abschnitt 3.2) | Absatz referenziert Formatvorlage `TitleTest` (`<w:pStyle w:val="TitleTest"/>`), `styles.xml` enthält `<w:style w:type="paragraph" w:styleId="TitleTest"><w:rPr><w:u w:val="single"/></w:rPr></w:style>`, Lauf selbst hat **kein** eigenes `<w:u>` | `readDocx` | **Aktuell (unfixed) erwartetes Ergebnis: Mark `underline` fehlt** (Bug, siehe Abschnitt 7). Test ist bewusst so geschrieben, dass er nach Umsetzung des in `unterstrichen-einfach-code.md` Abschnitt 3.2/4.2 vorgeschlagenen Fixes von ROT auf GRÜN kippt — Assertion lautet auf das **korrekte** Soll-Verhalten (`expect(...).toContain('underline')`), der Test bleibt also bewusst rot bis zum Fix, nicht grün-geschönt |
| 4.2.6 | Wie 4.2.5, aber Lauf hat zusätzlich eigenes `<w:u w:val="none"/>` | `readDocx` | Eigenes Element muss Formatvorlagen-Default überschreiben → **kein** `underline` (auch nach Fix; heute bereits „richtig grün", weil der Lauf sein eigenes `<w:u>` hat und der fehlende Default-Fallback hier folgenlos ist) |
| 4.2.7 | Kombination Fett+Farbe+Unterstrichen auf demselben Lauf (`<w:b/><w:color w:val="FF0000"/><w:u w:val="single"/>`) | `readDocx` | alle drei Marks gleichzeitig vorhanden, unabhängig voneinander |

### 4.3 Neu: `src/formats/odt/__tests__/underline.test.ts`

**Test-Helper — Fremddatei-Loader** (analog `external-fixtures.test.ts`):

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readOdt } from '../reader'

const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/odt')

async function loadFixture(name: string) {
  return readOdt(new Blob([readFileSync(join(FIXTURES_DIR, name))]))
}

function underlinedTexts(node: any): string[] {
  const out: string[] = []
  ;(function visit(n: any) {
    if (n.type === 'text' && (n.marks ?? []).some((m: any) => m.type === 'underline')) out.push(n.text)
    n.content?.forEach(visit)
  })(node)
  return out
}

function allTexts(node: any): string[] {
  const out: string[] = []
  ;(function visit(n: any) {
    if (n.type === 'text') out.push(n.text)
    n.content?.forEach(visit)
  })(node)
  return out
}
```

**Testfälle gegen reale, bereits im Repo liegende Fremddateien:**

| # | Fixture | Testname | Erwartung |
|---|---|---|---|
| 4.3.1 | `character-styles.odt` | `<text:span style-name="T3">Lorem ipsum</text:span>` (family=text, `text-underline-style="solid"`) wird als underline erkannt | `underlinedTexts(...)` enthält `'Lorem ipsum'` — **heute bereits grün**, sauberer `<text:span>`-Fall, nicht von `U-BUG-3.1`/`3.3` betroffen; empfohlener „echte Fremddatei"-Kandidat für `U-RT-6`/`U-RT-7` (Anforderung Abschnitt 5, DoD Punkt 2) |
| 4.3.2 | `UNDERLINE.odt` | enthält sowohl `solid` als auch `none`, beide über `<text:span>` | mindestens ein Textknoten mit, mindestens einer ohne `underline`-Mark |
| 4.3.3 (`U-GF-10`/`U-GF-14`) | `InvalidUnderlineAttribute.odt` | nicht-standardkonformer Wert `"ImSoInvalid"` | Reader fällt auf „vorhanden und `!== 'none'`" zurück → Mark **wird** gesetzt (dokumentiertes, gewolltes Fallback-Verhalten, kein Bug — analog DOCX `U-GF-9`) |
| 4.3.4 (`U-BUG-3.1`, kritisch) | `Tabelle1.odt` | Fünf Vorkommen des Absatzes `"Gomez bewege sich zu wenig"`, direkt (ohne `<text:span>`) Kind von `<text:p text:style-name="P86"/"P92">`, deren automatischer Stil `family="paragraph"` selbst `style:text-underline-style="wave"`/`"dotted"` trägt | **Aktuell (unfixed) erwartetes Ergebnis: alle fünf Textknoten haben `marks` leer/undefined** — Test dokumentiert dies als bestätigten, offenen Bug (`expect(gomez.every(r => !r.marks?.length)).toBe(true)` mit Kommentar, der auf `unterstrichen-einfach-code.md` Abschnitt 3.1 verweist). **Sobald der Fix umgesetzt ist, muss dieser Test umgedreht werden** auf `expect(gomez.every(r => r.marks?.length)).toBe(true)` — nicht vorher schon „grün lügen" |
| 4.3.5 | Handgebauter Minimalfall: `<text:p text:style-name="Ppara">Direkter Text ohne Span</text:p>`, `Ppara` ist `family="paragraph"` mit `style:text-underline-style="solid"` auf **eigener** `<style:text-properties>` | analoges Muster zu 4.3.4, aber gezielt mit dem in dieser Anforderung **relevanten** Wert `solid` (nicht `wave`/`dotted`), damit der In-Scope-Fall nicht nur zufällig über `Tabelle1.odt`s Fremdwerte bewiesen wird | Gleiches Bug-Verhalten wie 4.3.4 heute; nach Fix: Mark `underline` vorhanden |
| 4.3.6 (`U-BUG-3.3`, dokumentiert, **nicht** Teil dieses Tickets zu fixen) | `hyperlinkSpaces.odt` | Gesamter Absatzinhalt liegt in `<text:a>` | **Aktuell erwartetes Ergebnis: der komplette Textinhalt fehlt** (nicht nur die Formatierung) — Test dokumentiert diesen Bug explizit als „bekannt, gehört zu `hyperlink-einfuegen-req.md`", **nicht** als Underline-Regression fehlinterpretierbar. Deshalb **kein** Rundreise-Test für Underline gegen diese Datei (siehe 4.3.7) |
| 4.3.7 | Negativ-Testfall / Dokumentation | `hyperlinkSpaces.odt`, `hyperlinkSpacesNoUnderline.odt`, `hyperlink.odt`, `Hyperlink-AOO401.odt`, `hyperlink_destination.odt` explizit **nicht** in `U-RT-6`/`U-RT-7` verwenden | Kommentar im Testfile, der auf `U-BUG-3.3` verweist, damit niemand versehentlich eines dieser Fixtures als „Beweis, Underline funktioniert mit Fremddateien" heranzieht |

**Erweiterung `src/formats/odt/__tests__/roundtrip.test.ts` (`U-GF-11`):**

```ts
it('does not create duplicate automatic text styles for the same mark set in different array order', async () => {
  const original = doc([
    {
      type: 'paragraph',
      attrs: { align: 'left' },
      content: [
        { type: 'text', text: 'A', marks: [{ type: 'strong' }, { type: 'underline' }] },
        { type: 'text', text: 'B', marks: [{ type: 'underline' }, { type: 'strong' }] },
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

Hinweis: Im aktuellen App-Datenfluss ist dieser Fall laut Code-Audit nicht über die UI
auslösbar (ProseMirror hält Mark-Arrays konsistent in Schema-Rang-Reihenfolge) — der Test
ist reine Härtung (`styleNameFor` in `odt/styleRegistry.ts` nutzt `JSON.stringify(props)`
als Dedup-Key, Zeile 30) und **kann aktuell rot sein**, ohne dass ein über die UI
reproduzierbarer Anwenderfehler existiert; Priorität entsprechend niedriger einstufen als
4.3.4/4.2.5 (siehe Abschnitt 7).

### 4.4 Grenzfall 12 (leerer Style-Registry-Eintrag, nur Underline)

Neuer Testfall in `src/formats/odt/__tests__/roundtrip.test.ts` (Ergänzung, kein neues
File): Dokument mit **genau einer** Formatkombination — nur `underline`, keine weitere
Mark — exportieren, prüfen, dass genau eine Stildefinition erzeugt wird und dass
`buildTextStyleXml` (`odt/styleRegistry.ts` Zeile 50–54) korrekt
`style:text-underline-style="solid" style:text-underline-width="auto"
style:text-underline-color="font-color"` schreibt, **ohne** dass durch die
`isEmpty`-Prüfung (Zeile 13) eine leere Stildefinition parallel entsteht oder der Stil
fälschlich als „leer" übersprungen wird.

### 4.5 Grenzfall 13 (Performance, lange Läufe)

Neuer Testfall (Vitest, mit `performance.now()`-Zeitmessung, großzügigem Toleranzbudget
z. B. < 2000 ms): ProseMirror-JSON mit einem einzigen Textlauf von ca. 500.000 Zeichen,
Mark `underline`, durch `writeDocx`/`writeOdt` → `readDocx`/`readOdt` schicken. Kein
strenger Benchmark, sondern Regressionsschutz gegen eine versehentlich eingeführte
quadratische Komplexität (z. B. String-Concat in einer Schleife). Ergänzt in
`roundtrip.test.ts` beider Formate, nicht in einer eigenen Datei (geringe Priorität,
siehe Abschnitt 7).

---

## 5. Teil B — E2E-Tests (Playwright, echte Browser-Bedienung)

Dies ist die zentrale, laut Anforderungsabschnitt 7 bislang fehlende Testebene. Alle
Tests in diesem Abschnitt bedienen den echten Browser: Mausklicks auf reale Buttons,
`page.keyboard.type`/`press` in den echten `contenteditable`-Editor, Datei-Uploads über
echte `<input type="file">`-Elemente, Exporte über den echten `download`-Browser-Event
mit anschließendem Entpacken (`JSZip`) und String-/Regex-Prüfung der resultierenden
`document.xml`/`content.xml` — **nicht** interne Funktionsaufrufe von `readDocx`/`writeOdt`
o. ä. Das entspricht exakt dem in Anforderungsabschnitt 7 geforderten Nachweis.

### 5.1 Neue Datei: `tests/e2e/underline.spec.ts`

Struktur, Helper (`odtCard`, `docxCard`) und Locator-Stil wörtlich übernommen aus
`tests/e2e/odt.spec.ts`/`docx.spec.ts`/`selection-regression.spec.ts`, damit die Datei
sich nahtlos in die bestehende Suite einfügt.

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}

async function downloadAndUnzip(page: import('@playwright/test').Page, exportButtonScope = page) {
  const downloadPromise = page.waitForEvent('download')
  await exportButtonScope.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).toBeTruthy()
  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile(path!)
  return JSZip.loadAsync(buffer)
}
```

#### 5.1.1 `describe('Unterstrichen (einfach) — Toolbar & Tastatur')` — `U-TF-1` … `U-TF-9`

```ts
test.describe('Unterstrichen (einfach) — Toolbar & Tastatur', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('U-TF-1/2: Toolbar-Klick togglet Unterstreichung an und aus, Button-Zustand korrekt', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Testtext')
    await page.keyboard.press('ControlOrMeta+a')

    const button = page.getByTitle('Unterstrichen')
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(editor.locator('u')).toContainText('Testtext')

    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await expect(editor.locator('u')).toHaveCount(0)
  })

  test('U-TF-3: Strg+U liefert identisches Ergebnis wie Toolbar-Klick', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Tastaturtest')
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('ControlOrMeta+u')
    await expect(editor.locator('u')).toContainText('Tastaturtest')
    await expect(page.getByTitle('Unterstrichen')).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('ControlOrMeta+u')
    await expect(editor.locator('u')).toHaveCount(0)
  })

  test('U-TF-4: Toggle an der Schreibmarke wirkt nur auf neu getippten Text', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Vorher')
    await page.keyboard.press('ControlOrMeta+u')
    await page.keyboard.type('Neu')
    await page.keyboard.press('ControlOrMeta+u')
    await page.keyboard.type('Nachher')
    await expect(editor.locator('u')).toContainText('Neu')
    await expect(editor.locator('u')).not.toContainText('Vorher')
    await expect(editor.locator('u')).not.toContainText('Nachher')
  })

  test('U-TF-5: Button zeigt aktiven Zustand beim reinen Cursor-Verschieben (Pfeiltasten, kein Klick)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('abc')
    await page.keyboard.press('Shift+ArrowLeft')
    await page.keyboard.press('Shift+ArrowLeft')
    await page.keyboard.press('Shift+ArrowLeft')
    await page.getByTitle('Unterstrichen').click() // "abc" jetzt unterstrichen
    await page.keyboard.press('Home')
    await expect(page.getByTitle('Unterstrichen')).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.type('X') // außerhalb der Unterstreichung, danach in normalem Text
    await page.keyboard.press('End')
    await expect(page.getByTitle('Unterstrichen')).toHaveAttribute('aria-pressed', 'false')
  })

  test('U-TF-6/U-GF-4: gemischte Selektion und reine Leerzeichen-Selektion', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('eins zwei')
    // "eins " unterstreichen, "zwei" nicht
    await page.keyboard.press('Home')
    for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowRight')
    await page.getByTitle('Unterstrichen').click()
    // gesamte Selektion (gemischt) markieren und togglen
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Unterstrichen').click() // Anforderung 3.4: nicht-vollständig unterstrichen -> wird komplett unterstrichen
    await expect(editor.locator('u')).toContainText('eins zwei')
    await page.getByTitle('Unterstrichen').click() // jetzt vollständig -> wird entfernt
    await expect(editor.locator('u')).toHaveCount(0)

    // reine Leerzeichen-Selektion darf nicht crashen
    await page.keyboard.type('a   b')
    await page.keyboard.press('Home')
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight')
    for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight')
    await page.getByTitle('Unterstrichen').click()
    await expect(page.locator('.ProseMirror')).toBeVisible() // kein Absturz/kein JS-Fehler
  })

  test('U-TF-7: Fett + Unterstrichen + Schriftfarbe gleichzeitig, unabhängig entfernbar', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Kombiniert')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Fett').click()
    await page.getByTitle('Unterstrichen').click()
    await page.locator('input[aria-label="Textfarbe"]').fill('#ff0000')
    await expect(editor.locator('strong u, u strong')).toContainText('Kombiniert')
    // Unterstrichen einzeln wieder entfernen, Fett + Farbe bleiben
    await page.getByTitle('Unterstrichen').click()
    await expect(editor.locator('u')).toHaveCount(0)
    await expect(editor.locator('strong')).toContainText('Kombiniert')
  })

  test('U-TF-9: Undo/Redo über Tippen -> an -> aus -> Tippen', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('A')
    await page.keyboard.press('ControlOrMeta+u')
    await page.keyboard.type('B')
    await page.keyboard.press('ControlOrMeta+u')
    await page.keyboard.type('C')
    // Zustand: "A" normal, "B" unterstrichen, "C" normal
    await expect(editor.locator('u')).toContainText('B')

    await page.keyboard.press('ControlOrMeta+z') // "C" rückgängig
    await expect(editor).toContainText('AB')
    await page.keyboard.press('ControlOrMeta+z') // Unterstrichen-Aus rückgängig -> "B" wieder unterstrichen zusammen mit potentiell weiterem
    await page.keyboard.press('ControlOrMeta+z') // "B" rückgängig
    await expect(editor).toContainText('A')
    await page.keyboard.press('ControlOrMeta+Shift+z') // redo
    await expect(editor).toContainText('AB')
  })
})
```

#### 5.1.2 `describe('Unterstrichen (einfach) — Grenzfälle')` — `U-GF-1` … `U-GF-15`

Ein dedizierter Test je Grenzfall (Anforderungsabschnitt 6, Testfall 11: „kein
Sammeltest, der Einzelergebnisse verschleiert"):

| ID | Kurzbeschreibung | Testidee (Playwright) |
|---|---|---|
| `U-GF-1` | Toggle direkt vor/nach `hard_break` wirft keinen Fehler | `Shift+Enter` tippen, Cursor davor/danach setzen, `Strg+U`, dann tippen; `page.on('pageerror', …)` im Test registrieren und assert keine Fehler aufgezeichnet wurden |
| `U-GF-2` | Selektion über Absatzgrenze hinweg | Zwei Absätze tippen, `Shift+ArrowDown`-Sequenz über den Umbruch hinweg selektieren, `Strg+U`, beide Absätze prüfen (`editor.locator('u')` deckt beide ab) |
| `U-GF-3` | Selektion über Tabellen-Zellgrenze | Tabelle einfügen (`getByRole('button', {name:'Tabelle einfügen'})`), Text in zwei Zellen tippen, Selektion über Zellgrenze (Shift+Klick in Nachbarzelle oder `Ctrl+A` innerhalb Tabellen-Fokus je nach tatsächlichem Editor-Verhalten — im Test empirisch ermitteln, welche Tastenkombination eine `CellSelection` erzeugt), `Strg+U`, kein Crash, beide Zellen unterstrichen, keine Vermischung mit unselektierten Nachbarzellen |
| `U-GF-4` | Reine Leerzeichen-Selektion | siehe `U-TF-6` oben (kombiniert) |
| `U-GF-5` (korrigiert laut `unterstrichen-einfach-code.md` Abschnitt 3.6: `image` ist Block-, kein Inline-Node) | Selektion von Text bis in einen direkt benachbarten Bild-Block hinein | Bild einfügen (Label „🖼 Bild", `input[type=file][accept="image/*"]`, `setInputFiles` mit einer kleinen Test-PNG-Datei), Text davor tippen, Selektion von Textanfang bis inkl. Bild-Block (`Shift+ArrowDown`/`Shift+End` über die Blockgrenze), `Strg+U`, kein Crash, Text unterstrichen, Bild unverändert im DOM vorhanden |
| `U-GF-6` | Zwei schnelle `Strg+U` hintereinander → deterministisch „aus" | Text markieren, `await Promise.all([page.keyboard.press('ControlOrMeta+u'), page.keyboard.press('ControlOrMeta+u')])` bzw. zwei Presses ohne await dazwischen; Endzustand prüfen: **kein** `<u>` mehr vorhanden |
| `U-GF-7` | Undo/Redo nach Sequenz Fett→Unterstrichen→Unterstrichen-aus | Analog `U-TF-9`, aber mit `Fett` als erstem Schritt in der Kette; jeder Einzelschritt per Undo geprüft, nicht nur der Endzustand |
| `U-GF-8` | Selection-Sync-Bug mit „Unterstrichen" statt „Fett" | **Kein neuer Test in `underline.spec.ts`** — wird stattdessen dauerhaft in `tests/e2e/selection-regression.spec.ts` verankert, siehe Abschnitt 5.2 unten (DoD Punkt 3: „dauerhaft in der Suite", nicht in einer separaten, leicht vergessbaren Datei) |
| `U-GF-9` | Import `w:val` ∈ {`double`,`wave`,...} | **Unit-Test**, nicht E2E — siehe Abschnitt 4.2.3 (im Browser wäre der Upload einer handgebauten XML-Datei nur ein Duplikat des Unit-Tests ohne Mehrwert) |
| `U-GF-10` | Import `style:text-underline-style` Fremdwert | **Unit-Test**, siehe Abschnitt 4.3.3 |
| `U-GF-11` | Cross-Format-Stilnamenskollision | **Unit-Test**, siehe Abschnitt 4.3 Erweiterung `roundtrip.test.ts` |
| `U-GF-12` | Datei ohne jede Formatierung außer Unterstrichen | **Unit-Test**, siehe Abschnitt 4.4; zusätzlich E2E-Rauchtest: neues Dokument, nur Unterstrichen setzen, exportieren, `content.xml` enthält `text-underline-style="solid"` und keine zusätzliche leere `<style:style>`-Definition |
| `U-GF-13` | Performance bei sehr langen Läufen | **Unit-Test**, siehe Abschnitt 4.5. Optionaler E2E-Rauchtest: sehr langen String per `page.keyboard.insertText` (schneller als `type`) einfügen, `Strg+U`, Zeitbudget im Test prüfen — niedrige Priorität, siehe Abschnitt 7 |
| `U-GF-14` | Groß-/Kleinschreibung Fremddateien | **Unit-Test**, siehe Abschnitt 4.2.4/4.3.3 |
| `U-GF-15` | Fokus-Erhalt nach Toolbar-Klick | siehe Code-Block unten |

```ts
test('U-GF-15: Fokus bleibt nach Toolbar-Klick im Editor erhalten', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Fokustest')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Unterstrichen').click()
  await expect(editor).toBeFocused()
  // Selektion muss ebenfalls erhalten sein: direkt weitertippen ersetzt "Fokustest", nicht anhängen
  await page.keyboard.type('Ersetzt')
  await expect(editor).toContainText('Ersetzt')
  await expect(editor).not.toContainText('Fokustest')
})
```

### 5.2 Erweiterung: `tests/e2e/selection-regression.spec.ts` (`U-GF-8`)

Neuer Test **im bestehenden `describe`-Block**, nicht in einer neuen Datei — exakt
analog zum vorhandenen Bold-Test in dieser Datei, nur mit „Unterstrichen" statt „Fett":

```ts
test('same regression with "Unterstrichen" instead of "Fett" (Grenzfall 8 / U-GF-8)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Unterstrichen').click()
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
  // zusätzlich zum reinen Bold-Regressionstest: beide Absätze behalten ihre jeweils
  // korrekte Unterstreichungs-Formatierung (erster Absatz unterstrichen, zweiter nicht)
  await expect(page.locator('.ProseMirror p').nth(0).locator('u')).toContainText('Hallo, das ist ein Test.')
  await expect(page.locator('.ProseMirror p').nth(1).locator('u')).toHaveCount(0)
})
```

### 5.3 Rundreisen (`U-RT-1` … `U-RT-8`) — echte Datei-Uploads/Exporte

Alle Tests in diesem Abschnitt nutzen **echten** Datei-Upload
(`input.setInputFiles(...)`) und **echten** Datei-Export (`page.waitForEvent('download')`
+ nachträgliches Entpacken mit `JSZip`) — keine internen Reader/Writer-Aufrufe.

```ts
test.describe('Unterstrichen (einfach) — Rundreisen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
  })

  test('U-RT-1: DOCX-Eigenrundreise über echte Toolbar-Bedienung', async ({ page }) => {
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Unterstrichener Text')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Unterstrichen').click()

    const zip = await downloadAndUnzip(page)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).toMatch(/<w:u\s+w:val="single"\s*\/>/)

    // Re-Import der soeben exportierten Datei
    const fs = await import('node:fs/promises')
    const downloadPromise2 = page.waitForEvent('download')
    // (Export bereits oben ausgelöst — für den Re-Import wird der bereits erzeugte
    // Buffer erneut als Upload verwendet, kein zweiter Export nötig)
    void downloadPromise2
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    await page.reload()
    await page.getByRole('button', { name: /verstanden/i }).click()
    const input = docxCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'reimport.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
    await expect(page.locator('.ProseMirror u')).toContainText('Unterstrichener Text')
  })

  test('U-RT-2: ODT-Eigenrundreise über echte Toolbar-Bedienung', async ({ page }) => {
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Unterstrichener Text')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Unterstrichen').click()

    const zip = await downloadAndUnzip(page)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).toContain('style:text-underline-style="solid"')

    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    await page.reload()
    await page.getByRole('button', { name: /verstanden/i }).click()
    const input = odtCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'reimport.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
    await expect(page.locator('.ProseMirror u')).toContainText('Unterstrichener Text')
  })

  test('U-RT-3: Cross-Format DOCX -> ODT (reale Fremddatei 52449.docx)', async ({ page }) => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const buffer = await fs.readFile(path.join(process.cwd(), 'tests/fixtures/external/docx/52449.docx'))
    const input = docxCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: '52449.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
    await expect(page.locator('.ProseMirror u').first()).toBeVisible()

    // als ODT exportieren -> Karte wechseln nicht nötig, sofern die App Format-übergreifendes
    // Exportieren-in-anderes-Format unterstützt; falls die App stattdessen "Neu in ODT" +
    // manuellen Copy/Paste erfordert, hier den tatsächlichen App-Workflow nachbilden
    // (siehe Hinweis unten).
  })

  test('U-RT-4: Cross-Format ODT -> DOCX (reale Fremddatei character-styles.odt)', async ({ page }) => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const buffer = await fs.readFile(path.join(process.cwd(), 'tests/fixtures/external/odt/character-styles.odt'))
    const input = odtCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'character-styles.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
    await expect(page.locator('.ProseMirror u')).toContainText('Lorem ipsum')
  })

  test('U-RT-5: doppelte Cross-Format-Rundreise DOCX -> ODT -> DOCX', async ({ page }) => { /* Kombination aus U-RT-3/4, zweimal verkettet */ })

  test('U-RT-6/7 DOCX: reale Word-Datei importieren, Export unabhängig von readDocx() geprüft', async ({ page }) => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const buffer = await fs.readFile(path.join(process.cwd(), 'tests/fixtures/external/docx/52449.docx'))
    await docxCard(page).locator('input[type="file"]').setInputFiles({ name: '52449.docx', buffer })
    await expect(page.locator('.ProseMirror u').first()).toBeVisible()
    const zip = await downloadAndUnzip(page, docxCard(page))
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).toMatch(/<w:u\s+w:val="single"\s*\/>/) // Regex-Prüfung, NICHT über readDocx()
  })

  test('U-RT-6/7 ODT: reale LibreOffice-Datei importieren, Export unabhängig von readOdt() geprüft', async ({ page }) => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const buffer = await fs.readFile(path.join(process.cwd(), 'tests/fixtures/external/odt/character-styles.odt'))
    await odtCard(page).locator('input[type="file"]').setInputFiles({ name: 'character-styles.odt', buffer })
    const zip = await downloadAndUnzip(page, odtCard(page))
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).toContain('style:text-underline-style="solid"')
  })

  test('U-RT-8: kombiniert fett + farbig + unterstrichen bleibt über die Rundreise erhalten', async ({ page }) => {
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Kombitext')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Fett').click()
    await page.getByTitle('Unterstrichen').click()
    await page.locator('input[aria-label="Textfarbe"]').fill('#0000ff')

    const zip = await downloadAndUnzip(page)
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    await page.reload()
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).locator('input[type="file"]').setInputFiles({ name: 'kombi.odt', buffer })
    const reimported = page.locator('.ProseMirror')
    await expect(reimported.locator('u strong, strong u')).toContainText('Kombitext')
  })
})
```

**Wichtiger Hinweis zu `U-RT-3`/`U-RT-4`/`U-RT-5` (Cross-Format):** Ob die App
Cross-Format-Export ("importiertes DOCX als ODT exportieren") tatsächlich über einen
Format-Umschalter in der UI anbietet oder ob dafür zwei Karten (DOCX-Karte importieren,
Inhalt manuell in die ODT-Karte übertragen) bedient werden müssen, ist **vor
Implementierung dieser Tests am tatsächlichen UI zu verifizieren** (in den bisherigen
Spec-Dateien nicht abschließend spezifiziert). Die obigen Codeskizzen markieren diese
Stelle bewusst als zu klären, statt einen nicht existierenden Workflow zu unterstellen —
**erster Schritt bei der Umsetzung dieses Testplans:** manuell im Browser prüfen, wie
Cross-Format-Export tatsächlich ausgelöst wird, danach die Skizze konkretisieren.

### 5.4 Sichtprüfung / Screenshot-Vergleich (`U-TF-12`)

```ts
test('U-TF-12: visuelles Erscheinungsbild der Unterstreichung bleibt nach Re-Import gleich', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Visueller Vergleichstext')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Unterstrichen').click()
  await expect(editor.locator('u')).toHaveScreenshot('underline-before-export.png')

  const zip = await downloadAndUnzip(page)
  const buffer = await zip.generateAsync({ type: 'nodebuffer' })
  await page.reload()
  await page.getByRole('button', { name: /verstanden/i }).click()
  await odtCard(page).locator('input[type="file"]').setInputFiles({ name: 'reimport.odt', buffer })
  await expect(page.locator('.ProseMirror u')).toHaveScreenshot('underline-before-export.png')
})
```

Playwright-Snapshot-Vergleich (`toHaveScreenshot`) statt manueller Pixel-Diffs; erster
Lauf erzeugt die Baseline (`--update-snapshots`), spätere Läufe vergleichen automatisch.
Läuft auf allen drei konfigurierten Projekten (Desktop Chrome/Mobile/Tablet) — je
Projekt eigene Baseline, da Schriftrendering/Linienabstand je Viewport leicht abweichen
kann; das ist beabsichtigt und kein Fehlalarm.

---

## 6. Abnahme-Mapping (Anforderung → Testdatei/Testname)

| Anforderungsabschnitt | Testfall-ID | Testdatei |
|---|---|---|
| Abschnitt 6, Testfälle 1–9 | `U-TF-1` … `U-TF-9` | `tests/e2e/underline.spec.ts`, describe „Toolbar & Tastatur" |
| Abschnitt 6, Testfall 8 / Grenzfall 8 | `U-GF-8` | `tests/e2e/selection-regression.spec.ts` (Erweiterung) |
| Abschnitt 6, Testfall 10 (= Rundreisen) | `U-RT-1` … `U-RT-8` | `tests/e2e/underline.spec.ts`, describe „Rundreisen" |
| Abschnitt 6, Testfall 11 (= Grenzfälle) | `U-GF-1` … `U-GF-15` | `tests/e2e/underline.spec.ts`, describe „Grenzfälle" (mit Verweisen auf Unit-Tests für `U-GF-9/10/11/14`) |
| Abschnitt 6, Testfall 12 (Sichtprüfung) | `U-TF-12` | `tests/e2e/underline.spec.ts` |
| Abschnitt 5, Rundreise 1–2 (Eigenrundreise) | `U-RT-1`, `U-RT-2` | `tests/e2e/underline.spec.ts` |
| Abschnitt 5, Rundreise 3–5 (Cross-Format) | `U-RT-3`, `U-RT-4`, `U-RT-5` | `tests/e2e/underline.spec.ts` (Workflow vorab am UI zu klären, siehe Abschnitt 5.3 Hinweis) |
| Abschnitt 5, Rundreise 6 (echte Fremddatei) | `U-RT-6/7` (DOCX: `52449.docx`; ODT: `character-styles.odt`) | `tests/e2e/underline.spec.ts` + Unit-Tests Abschnitt 4.2/4.3 |
| Abschnitt 5, Rundreise 7 (unabhängiger Parser) | `U-RT-6/7` (Regex gegen `document.xml`/`content.xml`, **nicht** über `readDocx`/`readOdt`) + manueller Einmal-Check (Abschnitt 8) | `tests/e2e/underline.spec.ts` |
| Abschnitt 5, Rundreise 8 (kombiniert) | `U-RT-8` | `tests/e2e/underline.spec.ts` |
| Grenzfall 9 (DOCX `w:val` Fremdwerte) | Abschnitt 4.2.3 | `src/formats/docx/__tests__/underline.test.ts` |
| Grenzfall 10 (ODT `text-underline-style` Fremdwerte) | Abschnitt 4.3.3 | `src/formats/odt/__tests__/underline.test.ts` |
| Grenzfall 11 (Stilnamenskollision) | Abschnitt 4.3 (Erweiterung) | `src/formats/odt/__tests__/roundtrip.test.ts` |
| Grenzfall 12 (nur-Underline-Datei) | Abschnitt 4.4 | `src/formats/odt/__tests__/roundtrip.test.ts` |
| Grenzfall 13 (Performance) | Abschnitt 4.5 | beide `roundtrip.test.ts` |
| Grenzfall 14 (Groß-/Kleinschreibung) | Abschnitt 4.2.4, 4.3.3 | beide `underline.test.ts` |
| **`U-BUG-3.1`** (ODT: Absatzstil-Ebene ignoriert) | Abschnitt 4.3.4/4.3.5 | `src/formats/odt/__tests__/underline.test.ts` — **aktuell absichtlich ROT**, siehe Abschnitt 7 |
| **`U-BUG-3.2`** (DOCX: Formatvorlagen-Default ignoriert) | Abschnitt 4.2.5 | `src/formats/docx/__tests__/underline.test.ts` — **aktuell absichtlich ROT**, siehe Abschnitt 7 |
| **`U-BUG-3.3`** (ODT: `<text:a>` komplett ignoriert) | Abschnitt 4.3.6/4.3.7 | dokumentiert, **kein Fix hier**, siehe Abschnitt 7 |
| DoD Punkt 2 (unabhängiger Parser, reale Fremddatei) | `U-RT-6/7` + Abschnitt 8 dieses Plans | — |
| DoD Punkt 3 (Regressionstest dauerhaft verankert) | `U-GF-8` in `selection-regression.spec.ts`, nicht in Extra-Datei | — |
| DoD Punkt 4 (Fallback-Verhalten Fremddateien dokumentiert) | Abschnitt 4.2.3/4.2.4, 4.3.3, Testkommentare | — |
| DoD Punkt 5 (kein Fund ohne Vermerk) | Abschnitt 7 dieses Plans | — |

---

## 7. Bekannte, aktuell erwartet-ROTE Tests (Stand dieses Plans)

Der Vollständigkeit und Ehrlichkeit halber (Anforderungsabschnitt 7/DoD Punkt 5): Die
folgenden Tests aus diesem Plan **werden beim ersten Lauf fehlschlagen**, weil sie gegen
zwei in `unterstrichen-einfach-code.md` Abschnitt 3.1/3.2 dokumentierte, zum Zeitpunkt
dieses Plans **noch nicht behobene** Bugs im Reader-Code testen. Das ist **beabsichtigt**
— die Tests fixieren das korrekte Soll-Verhalten und dienen als Abnahmekriterium für den
Fix, nicht als „muss beim Schreiben schon grün sein":

| Test | Datei | Grund | Muss behoben sein, bevor Status auf „verifiziert" wechselt? |
|---|---|---|---|
| 4.3.4 (`Tabelle1.odt`, „Gomez"-Absätze) | `src/formats/odt/__tests__/underline.test.ts` | `U-BUG-3.1` — ODT-Reader liest keine Zeichenformatierung auf Absatzstil-Ebene | **Ja** — direkt Rundreise-relevant (Anforderung Abschnitt 5), DoD Punkt 4 verlangt explizit die Prüfung dieses Fallback-Pfads |
| 4.3.5 (handgebauter Minimalfall, `solid` auf Absatzstil-Ebene) | `src/formats/odt/__tests__/underline.test.ts` | `U-BUG-3.1`, In-Scope-Wert `solid` statt `wave`/`dotted` | **Ja** |
| 4.2.5 (Formatvorlagen-Default `TitleTest`) | `src/formats/docx/__tests__/underline.test.ts` | `U-BUG-3.2` — DOCX-Reader liest keinen Formatvorlagen-Default aus `styles.xml` | **Ja**, aus Konsistenzgründen zum analogen ODT-Bug, auch wenn im Fixture-Korpus (Stand `unterstrichen-einfach-code.md` Abschnitt 3.2) noch kein nicht-leerer Anwendungsfall bestätigt ist — der Code-Pfad ist strukturell identisch riskant |
| 4.3.6 (`hyperlinkSpaces.odt`, Textverlust) | `src/formats/odt/__tests__/underline.test.ts` | `U-BUG-3.3` — gehört zu `hyperlink-einfuegen-req.md`, nicht zu dieser Anforderung | **Nein** — wird als dokumentierter Fund geführt (DoD Punkt 5 erfüllt durch Dokumentation, nicht durch Fix in diesem Ticket); Test bleibt dauerhaft rot **markiert als bekannt**, bis `hyperlink-einfuegen-req.md` das aufgreift |
| 4.2.4 (`w:val="NONE"` Großschreibung) | `src/formats/docx/__tests__/underline.test.ts` | `U-BUG-3.4`/Grenzfall 14 — geringe Priorität, da im realen Korpus (Stand Code-Audit) durchgehend Kleinschreibung vorliegt | Empfohlen, aber laut Anforderungsabschnitt 4 Grenzfall 14 als „zu härten", nicht als kritischer Blocker eingestuft — vor Status „verifiziert" idealerweise mit erledigt, sonst als bekannte Restlücke im DoD-Vermerk |

**Vorgehen für die Testausführung:** Diese Tests **nicht** mit `test.skip`/`it.skip`
auskommentieren und **nicht** die Assertion auf das aktuell falsche Verhalten ändern, nur
damit die Suite grün wird — das wäre exakt die in Anforderungsabschnitt 7 kritisierte
Praxis („Code-Vorhandensein mit Funktionieren verwechselt"). Stattdessen: Tests wie oben
beschrieben auf das **korrekte Soll** schreiben, beim ersten CI-Lauf als erwartet
fehlschlagend im PR vermerken, Fix gemäß `unterstrichen-einfach-code.md` Abschnitt 3.1/3.2
in einem eigenen Dev-Commit nachziehen, danach werden dieselben Tests grün — ohne dass am
Testcode noch etwas geändert werden musste. Für `U-BUG-3.3` (out of scope) reicht eine
`test.fixme('U-BUG-3.3: ...')`-Markierung mit Verweis auf das Ticket bei
`hyperlink-einfuegen-req.md`, damit Playwright ihn nicht als „failed", sondern als
„fixme, bekannt" auflistet — hier **darf** `test.fixme` verwendet werden, weil der Fix
explizit einem anderen Backlog-Eintrag zugeordnet ist, nicht stillschweigend übersprungen
wird.

---

## 8. Unabhängige Parser-Validierung (DoD Punkt 2, manueller Einmalschritt)

Automatisiert (Teil der CI-Suite): `U-RT-6/7` prüfen den exportierten XML-String direkt
per Regex (`/<w:u\s+w:val="single"\s*\/>/` bzw.
`'style:text-underline-style="solid"'`), **ohne** die App-eigenen `readDocx`/`readOdt`-
Funktionen zu verwenden (Abschnitt 5.3) — das deckt „unabhängig vom eigenen Reader"
bereits weitgehend ab, ist aber noch dieselbe Sprache/Laufzeit wie die Anwendung selbst.

**Zusätzlich, manuell, einmalig vor dem Statuswechsel auf „verifiziert" (DoD Punkt 2
verlangt „echte, nicht selbst erzeugte Prüfwerkzeuge"):**

1. `npm run test:e2e -- tests/e2e/underline.spec.ts -g "U-RT-6/7"` lokal laufen lassen,
   den heruntergeladenen Dateien-Pfad aus dem Playwright-Trace/Testartefakt entnehmen
   (oder Export manuell im laufenden Dev-Server auslösen).
2. Exportierte DOCX-Datei mit `python-docx` öffnen (`pip install python-docx`):
   ```python
   from docx import Document
   d = Document('export.docx')
   for p in d.paragraphs:
       for r in p.runs:
           if r.underline:
               print('OK, python-docx erkennt Unterstreichung:', r.text)
   ```
3. Exportierte ODT-Datei in LibreOffice Writer öffnen, visuell bestätigen, dass der Text
   unterstrichen dargestellt wird (LibreOffice selbst ist die unabhängige
   Referenzimplementierung für ODF in diesem Schritt).
4. Ergebnis (Datum, LibreOffice-/python-docx-Version, Screenshot oder Konsolenausgabe)
   als Vermerk in dieser Datei (Abschnitt 9) oder in `unterstrichen-einfach-req.md`
   festhalten — **nicht** offen lassen (DoD Punkt 2 ist sonst nicht erfüllt, egal wie
   grün die automatisierte Suite ist).

Bewusst **kein** Bestandteil der automatisierten CI-Pipeline (keine Python-Laufzeit in
CI einführen nur für einen einmaligen Statusnachweis) — siehe auch
`unterstrichen-einfach-code.md` Abschnitt 7.

---

## 9. Vermerk manueller Prüfschritt (auszufüllen bei Durchführung)

| Datum | Durchgeführt von | python-docx-Ergebnis | LibreOffice-Ergebnis | Anmerkungen |
|---|---|---|---|---|
| _offen_ | _offen_ | _offen_ | _offen_ | Noch nicht durchgeführt — siehe Abschnitt 8, Schritt 1–4. Muss vor Statuswechsel auf „verifiziert" nachgetragen werden (DoD Punkt 2). |

---

## 10. Ausführung — Kommandos

```bash
# Unit-Tests (neu + bestehend)
npm test                          # vitest run — alle Unit-Tests inkl. neuer underline.test.ts
npm test -- underline             # nur die neuen Underline-Unit-Tests (Namensfilter)

# E2E-Tests (Playwright, startet Preview-Server automatisch)
npm run test:e2e -- tests/e2e/underline.spec.ts
npm run test:e2e -- tests/e2e/selection-regression.spec.ts
npm run test:e2e -- --update-snapshots tests/e2e/underline.spec.ts   # Baseline für U-TF-12 initial erzeugen
```

---

## 11. Offene Punkte / Risiken für die Umsetzung dieses Plans

1. **Cross-Format-Workflow (`U-RT-3/4/5`) ist am tatsächlichen UI zu verifizieren**,
   bevor der Testcode final geschrieben wird (siehe Hinweis Abschnitt 5.3) — dieser Plan
   beschreibt die Zielstruktur, nicht bereits den 1:1 lauffähigen Endzustand für diese
   drei Tests.
2. **`U-GF-3` (Tabellenzellgrenze) hängt von tatsächlichem ProseMirror-`CellSelection`-
   Verhalten im konkreten Editor-Setup ab** — welche exakte Tastenkombination/Mausaktion
   im Browser eine `CellSelection` statt einer normalen Text-Selektion erzeugt, ist beim
   Schreiben des Tests empirisch zu ermitteln (z. B. Shift+Klick in Nachbarzelle), nicht
   nur aus dem ProseMirror-Tabellen-Modul-Dokument abzuleiten.
3. **Zwei der neuen Unit-Tests sind erwartungsgemäß rot, bis die zugehörigen Bugs
   (`U-BUG-3.1`, `U-BUG-3.2`) gefixt sind** — siehe Abschnitt 7. Wer diesen Plan
   umsetzt, muss das im PR/CI-Lauf transparent machen (z. B. im PR-Text „2 von N Tests
   rot, erwartet — siehe Abschnitt 7 des QA-Plans"), nicht kommentarlos einchecken.
4. **DoD Punkt 2 (unabhängiger Parser) bleibt bis zur manuellen Durchführung offen** —
   Abschnitt 9 dieser Datei ist der Ort, an dem das Ergebnis nachgetragen wird.
5. **Test-Fixtures für Bilder (`U-GF-5`)**: Es existiert noch keine Mini-PNG-Testdatei im
   Repo für E2E-Uploads — `src/formats/*/__tests__/roundtrip.test.ts` verwendet dafür
   eine inline Base64-`TINY_PNG`-Konstante; für den E2E-Test kann dieselbe Byte-Folge
   dekodiert und als `Buffer` an `setInputFiles` übergeben werden, statt eine neue
   Bilddatei ins Repo aufzunehmen.
