# QA-Testplan: „Seitenlayoutansicht (Druckansicht)"

Bezug: `specs/seitenlayout-ansicht-req.md` (Anforderung), `specs/seitenlayout-ansicht-code.md`
(Umsetzungsplan, insbesondere dessen Abschnitt 4 „Tests"). Rolle dieses Dokuments: **unabhängige
QA-Prüfung** des in `-code.md` Abschnitt 4 skizzierten Testplans plus Lückenschluss. Kernauftrag laut
Anforderungsdatei Abschnitt 6, Punkt 10: Rundreise-Anforderungen müssen **sowohl** als Unit-Test gegen
Reader/Writer **als auch** als E2E-Test über echte Bedienung (echter Upload → echter Download → echter
Re-Upload) geführt werden — reine Unit-Tests mit direkt konstruierten ProseMirror-JSON-Fixtures allein
reichen nicht. Dieses Dokument spezifiziert beides konkret, dateigenau und lauffähig gegen die
tatsächlichen Konventionen dieses Repos (Vitest für Unit-Tests, Playwright für E2E — geprüft gegen
`playwright.config.ts`, `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`,
`tests/e2e/selection-regression.spec.ts`, `src/formats/{docx,odt}/__tests__/roundtrip.test.ts`,
`src/formats/shared/editor/__tests__/pagination.test.ts`).

---

## 0. QA-Befund zum Testplan aus `seitenlayout-ansicht-code.md` Abschnitt 4

Der Dev-Plan (Abschnitte 4.1–4.9) ist grundsätzlich solide und deckt die meisten Testplan-Punkte aus
der Anforderungsdatei ab. Folgende Lücken/Risiken wurden bei der QA-Durchsicht gefunden und werden in
diesem Dokument geschlossen bzw. konkretisiert:

| # | Befund | Konsequenz für diesen Testplan |
|---|---|---|
| A | **Cross-Format-Rundreise-Test (Anforderung 5.2 Punkt 6)** ist in `-code.md` Abschnitt 7 nur als Prosa-Verweis vorhanden („hier nicht separat ausformuliert, da strukturell identisch zu 4.9 nur mit Formatwechsel") — nicht lauffähig spezifiziert. | Wird unten in Abschnitt 3.4 (Unit) und 4.10 (E2E) konkret ausgeschrieben. |
| B | **Reale Mehrseitigkeit der Fixtures wird behauptet, nicht verifiziert.** `saut_page.docx`/`pagebreaks.odt` werden als „mehrseitig" vorausgesetzt, ohne dass ein Test zuerst prüft, dass die App für diese Datei tatsächlich `data-page-count > 1` anzeigt. Ändert sich die Fixture-Datei künftig (z. B. durch ein Fixture-Update), würde der Rundreise-Test für Grenzfall 15 unbemerkt zu einem einseitigen Dokument degenerieren und nichts mehr über Paginierungs-Artefakte im Export aussagen. | Jeder Test, der sich auf „mehrseitig" verlässt, muss das **selbst** per `data-page-count`-Assertion absichern, bevor er die eigentliche Prüfung macht (siehe 4.9, 4.10, 4.12). |
| C | **Viewport-Test (Dev-Plan 4.4) prüft nur Bedienbarkeit, nicht das tatsächliche Scroll-Verhalten.** Anforderung Element 9/Grenzfall 5 verlangt explizit, das **Ist-Verhalten zu dokumentieren** (horizontales Scrollen vs. Skalierung) — nicht nur zu bestätigen, dass Buttons klickbar bleiben. | Ergänzt um eine explizite `scrollWidth > clientWidth`-Messung (Abschnitt 4.4 unten). |
| D | **`.page-break-spacer` ist laut Code (`src/index.css`, einzige Regel `width: 100%`) visuell wirkungslos** — ein `toBeVisible()`-Assert auf diesem Element (Dev-Plan 4.6) bestätigt nur, dass es im Layout existiert (kein `display:none`/Nullgröße), **nicht**, dass eine Nutzerin eine Seitentrennung sieht. Diese Unterscheidung darf nicht verwischt werden. | Screenshot-Tests (Abschnitt 4.3) sind die einzige Quelle für die visuelle Aussage „mehrere Blätter erkennbar" (Element 2); `.page-break-spacer`-DOM-Assertions sind ausschließlich Strukturprüfungen. |
| E | **Kein Test für Grenzfall 13** (Kopf-/Fußzeile bleibt im Datenmodell erhalten, obwohl in der Seitenansicht unsichtbar) **im Kontext dieser Ansicht.** Generischer Header/Footer-Rundtrip existiert bereits (`src/formats/docx/__tests__/roundtrip.test.ts` Zeilen 278–295, analog ODT), deckt aber nicht ab, dass die Anwesenheit der Seitenlayoutansicht (Paginierung/Spacer) daran nichts ändert. | Ergänzender E2E-Test in Abschnitt 4.11. |
| F | **Kein Test, der `PageSheets` als rein dekorativ/nicht interaktiv bestätigt** (`aria-hidden`, `pointer-events: none`, aus `-code.md` Abschnitt 3.3) — ohne das könnte ein künftiger Screenreader/Tab-Regressionstest fälschlich die Blatt-Elemente als Inhalt/Tab-Stop einstufen. | Neuer, kleiner DOM-Test in Abschnitt 4.15. |
| G | **Screenshot-Tests sind ohne Pixel-Toleranz notorisch flaky** (Font-Rendering-Unterschiede CI vs. lokal, Sub-Pixel-Antialiasing) — Dev-Plan spezifiziert keine `maxDiffPixelRatio`. | Toleranzwert unten in 4.3/4.5 explizit gesetzt; als bewusste Entscheidung dokumentiert, nicht stillschweigend 0 gelassen. |
| H | **Resize-Test (Dev-Plan 4.6) deckt nur Fenstergröße ab, nicht die in Anforderung Befund 7/Entscheidung 1.3 explizit genannte Zoomstufen-Sub-Pixel-Rundung.** Ein `devicePixelRatio`-Wechsel ist mit Playwright nicht zur Laufzeit simulierbar (nur beim Kontext-Start setzbar). | Als **nicht automatisierbares Restrisiko** in Abschnitt 7 dokumentiert, kein stiller Verzicht. |

---

## 1. Testebenen-Übersicht

| Ebene | Werkzeug | Was sie beweist | Was sie **nicht** beweist |
|---|---|---|---|
| Unit (Vitest, jsdom) | `computePageBreakIndices`/`computeFillerBeforeBreaks`/`writeDocx`+`readDocx`/`writeOdt`+`readOdt` | Reine Arithmetik korrekt; Reader/Writer-Rundreise auf XML-Ebene korrekt und frei von Paginierungs-Artefakten | Tatsächliches Rendering, Screenshots, echte Datei-Downloads, Viewport-/Farbschema-Verhalten |
| E2E (Playwright, echter Chromium/WebKit/Firefox je Projekt) | echte Klicks, Tastatureingabe, `input[type=file].setInputFiles`, `page.waitForEvent('download')` + Lesen der heruntergeladenen Datei von Disk | Das tatsächliche Nutzerverhalten Ende-zu-Ende: Upload → Bearbeitung → Download → Inhalt der heruntergeladenen Datei | Verhalten in echtem MS Word/LibreOffice Writer beim Öffnen der Exportdatei (siehe Abschnitt 7) |
| Screenshot (Playwright `toHaveScreenshot`) | Pixel-Vergleich gegen Baseline | Visuelle Wahrnehmbarkeit (Element 2, Grenzfall 1/2/6) | Ursache eines Abweichung (nur Symptom, Diagnose bleibt Unit-Test-Aufgabe, z. B. `computeFillerBeforeBreaks`) |

Kein Test in diesem Plan ist ein „interner Funktionsaufruf, der wie ein Browser-Test aussieht" — jeder
E2E-Test in Abschnitt 4 fasst ausschließlich über sichtbare UI-Elemente an (`getByRole`, `getByTitle`,
`.locator(...)`, echte Tastatureingaben über `page.keyboard`) und prüft, wo eine Datei beteiligt ist,
den **tatsächlich heruntergeladenen Byte-Inhalt** (`download.path()` → `fs.readFile` → `JSZip.loadAsync`
→ Inhalt der ZIP-internen XML-Datei), nicht einen intern zurückgegebenen Blob.

---

## 2. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

### 2.1 Bestehende Tests — unverändert als Regressionsschutz erhalten

- `src/formats/shared/editor/__tests__/pagination.test.ts` (10 bestehende Fälle: leer, exakter Fit,
  Überlauf, überdimensionierter Block, nicht-positive Seitenhöhe) — **nicht ändern**, nur ergänzen.
- `src/formats/docx/__tests__/roundtrip.test.ts` Zeilen 278–295 und das ODT-Äquivalent (Header/Footer
  bleiben bytegleich erhalten) — bereits vorhanden, deckt die generische Hälfte von Grenzfall 13 ab.

### 2.2 Neu: `computeFillerBeforeBreaks` (falls Root-Cause-Fix aus `-code.md` Abschnitt 1.1 umgesetzt wird)

Ergänzung in `pagination.test.ts`:

```ts
import { computeFillerBeforeBreaks, paginationKey } from '../pagination'
import { EditorState } from 'prosemirror-state'
import { wordSchema } from '../../schema'

describe('computeFillerBeforeBreaks', () => {
  it('needs no filler when a page is filled exactly', () => {
    expect(computeFillerBeforeBreaks([100, 100, 100, 150], 300, [3])).toEqual([0])
  })

  it('fills the gap left by an underfull page (Befund 6 regression, konkretes Beispiel aus -code.md 1.1)', () => {
    expect(computeFillerBeforeBreaks([290, 290], 300, [1])).toEqual([10])
  })

  it('returns zeros for a non-positive page height without crashing (Anforderung 3.10)', () => {
    expect(computeFillerBeforeBreaks([100, 100], 0, [1])).toEqual([0])
  })

  it('returns an empty array when there are no breaks', () => {
    expect(computeFillerBeforeBreaks([100], 300, [])).toEqual([])
  })
})
```

**QA-Ergänzung gegenüber Dev-Plan:** zusätzlicher Test für **mehrere** Breaks mit **unterschiedlichem**
Filler-Bedarf pro Seite (Dev-Plan-Beispiel hatte nur einen Break):

```ts
  it('computes an independent filler per break, not a single global value', () => {
    // Seite 1: [280] -> Filler 20 vor Break 1. Seite 2 (reset): [150,150] exakt -> Filler 0 vor Break 3.
    expect(computeFillerBeforeBreaks([280, 150, 150, 100], 300, [1, 3])).toEqual([20, 0])
  })
```

Ohne diesen Fall bliebe unentdeckt, falls eine künftige Implementierung fälschlich denselben
Filler-Wert für alle Breaks wiederverwendet statt `cumulative` nach jedem Break zurückzusetzen.

### 2.3 Neu: Rundreise-Regressionstest für die Pagination-Meta-Transaktion (Anforderung 5.1 Punkt 3)

```ts
describe('pagination meta transactions never mark the document changed (Rundreise-Absicherung)', () => {
  it('tr.docChanged is false for a transaction that only sets pagination meta', () => {
    const state = EditorState.create({ schema: wordSchema })
    const tr = state.tr.setMeta(paginationKey, { decorations: null, pageCount: 3 })
    expect(tr.docChanged).toBe(false)
  })

  it('is still false after applying the transaction to produce a new state', () => {
    const state = EditorState.create({ schema: wordSchema })
    const tr = state.tr.setMeta(paginationKey, { decorations: null, pageCount: 3 })
    const next = state.apply(tr)
    expect(next.doc.eq(state.doc)).toBe(true)
  })
})
```

Voraussetzung: `paginationKey` muss aus `pagination.ts` exportiert werden (aktuell modul-privat,
siehe `-code.md` Zusatzbefund C) — **ohne diesen Export ist dieser Test nicht schreibbar**; falls der
Export beim Testlauf fehlt, muss dieser Punkt als **rot/blockiert**, nicht als „übersprungen“,
gemeldet werden.

### 2.4 Neu: Reader/Writer-Rundreise mit „virtuell mehrseitigem“ Inhalt, ohne Paginierungs-Artefakte im Export

Kern der Anforderung 5.1 Punkt 1/2 und 3.9: Da Paginierung reine View-Decoration ist, darf ein
Dokument, das im Editor mehrere simulierte Seiten erzeugen *würde*, beim reinen Reader/Writer-Roundtrip
(ohne jeden Browser) niemals Paginierungs-Metadaten im XML enthalten. Das ist auf Unit-Ebene günstig
und schnell prüfbar, unabhängig vom E2E-Test in Abschnitt 4.9:

`src/formats/docx/__tests__/roundtrip.test.ts`, neuer Block:

```ts
describe('DOCX round trip: content that would span multiple simulated pages', () => {
  it('preserves all paragraphs and never leaks pagination view-state into document.xml', async () => {
    const paragraphs = Array.from({ length: 150 }, (_, i) => paragraph(`Absatz Nummer ${i} mit Text.`))
    const original = doc(paragraphs)
    const blob = await writeDocx(original)

    const xmlText = await new JSZip().loadAsync(blob).then((zip) => zip.file('word/document.xml')!.async('text'))
    expect(xmlText).not.toContain('page-break-spacer')
    expect(xmlText).not.toContain('pagination')

    const result = await readDocx(blob)
    const resultParagraphs = (result.body as any).content
    expect(resultParagraphs).toHaveLength(150)
    expect(resultParagraphs[0].content[0].text).toBe('Absatz Nummer 0 mit Text.')
    expect(resultParagraphs[149].content[0].text).toBe('Absatz Nummer 149 mit Text.')
  })
})
```

(`JSZip`-Import ergänzen; `writeDocx`/`readDocx`/`doc`/`paragraph` sind bereits im Testfile definiert.)
Analog `src/formats/odt/__tests__/roundtrip.test.ts` gegen `content.xml`.

**Warum das trotz des E2E-Tests in 4.9 zusätzlich sinnvoll ist:** Dieser Test läuft ohne Browser in
Millisekunden und lokalisiert einen Regressionsfall sofort auf „Writer/Reader“ statt erst im
langsameren E2E-Lauf sichtbar zu werden, in dem die Ursache (View-Layer vs. Datenmodell-Layer)
weniger eindeutig wäre.

### 2.5 Neu: Cross-Format-Rundreise DOCX → ODT → DOCX auf Unit-Ebene (schließt QA-Befund A teilweise)

Neue Datei `src/formats/__tests__/cross-format-roundtrip.test.ts`:

```ts
import { writeDocx } from '../docx/writer'
import { readDocx } from '../docx/reader'
import { writeOdt } from '../odt/writer'
import { readOdt } from '../odt/reader'
import type { WordDocumentContent } from '../shared/documentModel'

function doc(content: unknown[]): WordDocumentContent {
  return { body: { type: 'doc', content }, header: null, footer: null, meta: { title: '' } }
}
function paragraph(text: string) {
  return { type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text }] }
}

describe('Cross-Format-Rundreise DOCX -> ODT -> DOCX (mehrseitiger Inhalt, Anforderung 5.2 Punkt 6)', () => {
  it('preserves all paragraph text across both conversions', async () => {
    const paragraphs = Array.from({ length: 120 }, (_, i) => paragraph(`Zeile ${i} mit ausreichend Text.`))
    const original = doc(paragraphs)

    const docxBlob = await writeDocx(original)
    const afterDocx = await readDocx(docxBlob)
    const odtBlob = await writeOdt(afterDocx)
    const afterOdt = await readOdt(odtBlob)
    const finalDocxBlob = await writeDocx(afterOdt)
    const final = await readDocx(finalDocxBlob)

    const finalParagraphs = (final.body as any).content
    expect(finalParagraphs).toHaveLength(120)
    for (let i = 0; i < 120; i++) {
      expect(finalParagraphs[i].content[0].text).toBe(`Zeile ${i} mit ausreichend Text.`)
    }
  })
})
```

**Abnahmekriterium hier bewusst nur Textinhalt** (wie Anforderung Abschnitt 5.2 Punkt 6 verlangt) —
Formatierungsnuancen bei Cross-Format sind laut Rest der Spezifikation zu dokumentieren, nicht Teil
dieses Tests.

### 2.6 Neu: Sanity-Check der realen Mehrseiten-Fixtures (schließt QA-Befund B auf Unit-Ebene)

Bevor sich E2E-Tests (Abschnitt 4.9/4.10) auf `saut_page.docx`/`pagebreaks.odt` als „mehrseitig"
verlassen, muss ein schneller Unit-Test bestätigen, dass diese Dateien genug Inhalt tragen, um
plausibel mehr als eine A4-Seite zu füllen (grober Proxy: Absatzzahl/Zeichenzahl, kein echtes
Rendering nötig):

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readDocx } from '../reader'

describe('Fixture-Sanity: saut_page.docx ist inhaltlich groß genug für einen Mehrseiten-Test', () => {
  it('hat genug Absätze/Text, um in der Seitenlayoutansicht plausibel >1 Seite zu ergeben', async () => {
    const buffer = readFileSync(join(__dirname, '../../../../tests/fixtures/external/docx/saut_page.docx'))
    const result = await readDocx(new Blob([new Uint8Array(buffer)]))
    const paragraphs = (result.body as any).content as unknown[]
    const totalChars = JSON.stringify(paragraphs).length
    // grobe Schwelle: eine A4-Seite fasst bei Standard-Schriftgröße realistisch nicht mehr als
    // ca. 3000-4000 Zeichen reinen Text; deutlich darüber liegt sicher über einer Seite.
    expect(totalChars).toBeGreaterThan(4000)
  })
})
```

Analog für `pagebreaks.odt` gegen `readOdt`. **Schlägt dieser Test künftig fehl** (z. B. weil die
Fixture-Datei ausgetauscht wurde), ist das ein Signal, dass Abschnitt 4.9/4.10/4.3 auf eine **neue**
mehrseitige Fixture umgestellt werden müssen, bevor deren grüner Status irreführend wird.

---

## 3. Echte Playwright-Browser-Tests

Alle folgenden Tests fassen ausschließlich über UI an: `getByRole('button', ...)`,
`getByTitle('Fett')`, `.locator('.ProseMirror')`, echte `page.keyboard.type`/`press`-Aufrufe,
`input[type=file].setInputFiles` für Uploads und `page.waitForEvent('download')` +
`fs.readFile(await download.path())` für Exportprüfungen — deckungsgleich mit der bestehenden
Konvention in `tests/e2e/docx.spec.ts`/`odt.spec.ts`. Laufen auf allen drei
`playwright.config.ts`-Projekten (`Desktop Chrome`, `Tablet`, `Mobile`), sofern nicht anders vermerkt.

### 3.1 `tests/e2e/page-layout.spec.ts` — Struktur & Modus-Kennzeichnung (Element 1, Anforderung 6.3)

```ts
import { test, expect } from '@playwright/test'

test.describe('Seitenlayoutansicht — Struktur', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
  })

  test('markiert den aktuellen Modus eindeutig als Seitenlayoutansicht', async ({ page }) => {
    await page.getByRole('button', { name: 'Neu erstellen' }).first().click()
    await expect(page.locator('[data-view-mode="page-layout"]')).toHaveAttribute('data-page-count', '1')
  })

  test('mehrseitiges Dokument erzeugt Seitentrenner in korrekter Reihenfolge und konsistenter Anzahl', async ({ page }) => {
    await page.getByRole('button', { name: 'Neu erstellen' }).first().click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    for (let i = 0; i < 80; i++) {
      await page.keyboard.type(`Absatz Nummer ${i} mit ausreichend Text, um mehrere Seiten zu füllen. `)
      await page.keyboard.press('Enter')
    }
    const spacerCount = await page.locator('.page-break-spacer').count()
    expect(spacerCount).toBeGreaterThanOrEqual(2) // Anforderung 6.3: mind. 3 Seiten -> mind. 2 Spacer
    await expect(page.locator('[data-view-mode="page-layout"]')).toHaveAttribute(
      'data-page-count',
      String(spacerCount + 1),
    )
  })
})
```

### 3.2 `tests/e2e/page-layout-screenshots.spec.ts` — Screenshot-Regression (Anforderung 6.4/6.5, Grenzfall 1/2)

```ts
import { test, expect } from '@playwright/test'

test.describe('Seitenlayoutansicht — Screenshot-Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await page.getByRole('button', { name: 'Neu erstellen' }).first().click()
  })

  test('kurzes Dokument: Seitenrand entspricht dokumentierter Sollgröße, kein unerwarteter Leerraum', async ({ page }) => {
    await page.locator('.ProseMirror').click()
    await page.keyboard.type('Ein kurzer Absatz.')
    await expect(page.locator('[data-view-mode="page-layout"]')).toHaveScreenshot('short-document-top.png', {
      clip: { x: 0, y: 0, width: 900, height: 300 },
      maxDiffPixelRatio: 0.02, // QA-Ergänzung: Toleranz gegen Font-Antialiasing-Rauschen zw. CI/lokal
    })
  })

  test('langes Dokument (>= 4 Seiten): Übergänge Seite 1/2 UND Seite 3/4 zeigen keinen kumulativen Versatz', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    for (let i = 0; i < 220; i++) {
      await page.keyboard.type(`Zeile ${i} mit genug Text, um zuverlässig mehrere Seiten zu füllen. `)
      await page.keyboard.press('Enter')
    }
    const spacers = page.locator('.page-break-spacer')
    await expect(spacers).toHaveCount(await spacers.count()) // Sync-Punkt, kein flaky race
    expect(await spacers.count()).toBeGreaterThanOrEqual(3) // sonst ist Seite 3/4-Vergleich unten sinnlos

    await spacers.nth(0).scrollIntoViewIfNeeded()
    await expect(page).toHaveScreenshot('long-document-page-1-2-boundary.png', { maxDiffPixelRatio: 0.02 })

    await spacers.nth(2).scrollIntoViewIfNeeded()
    await expect(page).toHaveScreenshot('long-document-page-3-4-boundary.png', { maxDiffPixelRatio: 0.02 })
  })
})
```

**QA-Anmerkung:** Der zweite Test bricht bewusst mit `expect(...).toBeGreaterThanOrEqual(3)` **hart**
ab (statt den 3/4-Vergleich stillschweigend zu überspringen wie im ursprünglichen Dev-Plan-Entwurf),
damit ein zu kurz geratenes Test-Dokument nicht zu einem grünen, aber aussagelosen Test führt.

### 3.3 `tests/e2e/page-layout-viewport.spec.ts` — Tablet/Mobile (Anforderung 6.6, Grenzfall 5, QA-Befund C)

```ts
import { test, expect } from '@playwright/test'

test.describe('Seitenlayoutansicht auf schmalen Viewports', () => {
  test('Toolbar erreichbar, Kernfunktionen bedienbar, Scroll-Verhalten dokumentiert', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await page.getByRole('button', { name: 'Neu erstellen' }).first().click()

    await expect(page.getByTitle('Fett')).toBeVisible()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Mobiler Test')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Fett').click()
    await expect(editor).toContainText('Mobiler Test')

    // QA-Ergänzung: tatsächliches Ist-Verhalten messen und dokumentieren (Element 9), nicht nur
    // annehmen, dass overflow-auto "irgendwie" funktioniert.
    const scrollContainer = page.locator('[data-view-mode="page-layout"]')
    const { scrollWidth, clientWidth } = await scrollContainer.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }))
    test.info().annotations.push({
      type: 'viewport-scroll-behavior',
      description: `scrollWidth=${scrollWidth} clientWidth=${clientWidth} -> ${
        scrollWidth > clientWidth ? 'horizontales Scrollen aktiv (Ist-Zustand, Entscheidung -code.md 1.6)' : 'Seite passt ohne Scrollen'
      }`,
    })

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    expect(await download.path()).toBeTruthy()
  })
})
```

Läuft ausschließlich auf `Tablet`/`Mobile` (Playwright `--project`-Filter oder `test.skip` auf
`Desktop Chrome` via `testInfo.project.name`). Ergebnis der Annotation ist nach Testlauf in
`-code.md`/`-req.md` als endgültiger Ist-Befund nachzutragen (Freigabekriterium, Abschnitt 5 unten).

### 3.4 `tests/e2e/page-layout-color-scheme.spec.ts` — Farbschema (Anforderung 6.7, Grenzfall 6)

```ts
import { test, expect } from '@playwright/test'

for (const scheme of ['light', 'dark'] as const) {
  test(`Seiten-Hintergrund bleibt weiß bei prefers-color-scheme: ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await page.getByRole('button', { name: 'Neu erstellen' }).first().click()
    await page.locator('.ProseMirror').click()
    await page.keyboard.type('Test')
    await expect(page).toHaveScreenshot(`page-background-${scheme}.png`, { maxDiffPixelRatio: 0.02 })

    // QA-Ergänzung: explizite Farbwert-Assertion zusätzlich zum Screenshot, damit ein Fehlschlag
    // sofort die Ursache benennt (Hintergrundfarbe der simulierten Seite) statt nur "Pixel weichen ab".
    const sheetBg = await page
      .locator('[data-view-mode="page-layout"] >> css=div')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(sheetBg).toMatch(/rgb\(255,\s*255,\s*255\)|white/)
  })
}
```

### 3.5 `tests/e2e/page-layout-resize.spec.ts` — Resize (Anforderung 6.9, Grenzfall 8)

```ts
import { test, expect } from '@playwright/test'

test('Paginierung bleibt nach Fenster-Resize konsistent (mit Resize-Listener) bzw. dokumentiert eingefroren (ohne)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await page.getByRole('button', { name: 'Neu erstellen' }).first().click()
  await page.setViewportSize({ width: 1200, height: 900 })

  const editor = page.locator('.ProseMirror')
  await editor.click()
  for (let i = 0; i < 100; i++) {
    await page.keyboard.type(`Absatz ${i} mit ausreichend Text zum Füllen mehrerer Seiten. `)
    await page.keyboard.press('Enter')
  }
  const pageCountBefore = await page.locator('[data-view-mode="page-layout"]').getAttribute('data-page-count')

  await page.setViewportSize({ width: 800, height: 600 })
  await page.waitForTimeout(300) // rAF-Koaleszierung eines etwaigen Resize-Listeners abwarten

  const pageCountAfter = await page.locator('[data-view-mode="page-layout"]').getAttribute('data-page-count')
  expect(pageCountAfter).toBe(pageCountBefore) // feste Seitenbreite reflowt nicht mit der Fensterbreite
  await expect(page.locator('.page-break-spacer').first()).toBeAttached() // kein Absturz/leerer State nach Resize
})
```

**QA-Anmerkung zu Freigabekriterium H:** Dieser Test prüft *Konsistenz* (kein Crash, keine
Divergenz), nicht, *ob* neu gemessen wurde — das ist bei fester Seitenbreite ohnehin nicht zu
erwarten. Der eigentliche Zweck des in `-code.md` Abschnitt 1.3 vorgeschlagenen Resize-Listeners
(Sub-Pixel-Drift bei Zoomstufen-Änderung) ist mit Playwright **nicht** automatisierbar (siehe
Abschnitt 7 unten) — dieser Test allein reicht nicht als vollständiger Beleg für Entscheidung 1.3,
sondern nur als Crash-/Konsistenz-Regressionsschutz.

### 3.6 Ergänzung `tests/e2e/selection-regression.spec.ts` — Umbruchstelle (Anforderung 6.8, Grenzfall 9)

```ts
test('Tippen direkt an einer automatisch berechneten Umbruchstelle verliert/vertauscht keinen Text', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  for (let i = 0; i < 60; i++) {
    await page.keyboard.type(`Zeile ${i} mit ausreichend Text, um einen Seitenumbruch zu erzwingen. `)
    await page.keyboard.press('Enter')
  }
  await expect(page.locator('.page-break-spacer').first()).toBeAttached()

  await page.keyboard.press('ControlOrMeta+Home')
  await page.keyboard.type('EINFUEGUNG-VORNE ')
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type(' EINFUEGUNG-HINTEN')

  await expect(editor).toContainText('EINFUEGUNG-VORNE')
  await expect(editor).toContainText('EINFUEGUNG-HINTEN')
  await expect(editor).toContainText('Zeile 0')
  await expect(editor).toContainText('Zeile 59')

  // QA-Ergänzung: zusätzlich echte Rundreise ab dieser Bearbeitung (Anforderung 5.2 Punkt 3),
  // nicht nur DOM-Text-Prüfung im Editor selbst.
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const JSZip = (await import('jszip')).default
  const buffer = await fs.readFile((await download.path())!)
  const zip = await JSZip.loadAsync(buffer)
  const xml = await zip.file('word/document.xml')!.async('text')
  expect(xml).toContain('EINFUEGUNG-VORNE')
  expect(xml).toContain('EINFUEGUNG-HINTEN')
  expect(xml).toContain('Zeile 0')
  expect(xml).toContain('Zeile 59')
})
```

Analog als eigener Testfall in einer ODT-Variante des Editors (`odtCard`-Locator-Muster aus
`odt.spec.ts`), da Anforderung 5.2 Punkt 4 DOCX **und** ODT verlangt.

### 3.7 `tests/e2e/large-document-import.spec.ts` — Performance mit realem großen Dokument (Anforderung 3.7)

```ts
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

test('großes reales DOCX-Dokument (bug65649.docx, ~16000 Absätze) importiert performant und bleibt bedienbar', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()

  const buffer = readFileSync(join(__dirname, '../fixtures/external/docx/bug65649.docx'))
  const input = page
    .locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
    .locator('input[type="file"]')

  const start = Date.now()
  await input.setInputFiles({
    name: 'bug65649.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer,
  })
  await expect(page.locator('.ProseMirror')).toBeVisible()
  await expect(page.locator('[data-view-mode="page-layout"]')).not.toHaveAttribute('data-page-count', '1', {
    timeout: 15_000,
  })
  expect(Date.now() - start).toBeLessThan(10_000)

  await page.locator('.ProseMirror').click()
  await page.keyboard.type('X')
  await expect(page.locator('.ProseMirror')).toContainText('X')
})
```

**QA-Ergänzung:** analoger Test mit einer großen realen **ODT**-Datei (z. B. `brokenList.odt`,
bereits als „groß/langsam unter jsdom" in `src/formats/odt/__tests__/external-fixtures.test.ts`
referenziert) — der Dev-Plan deckt nur DOCX ab; Anforderung 3.7 nennt keine Formatbeschränkung.

### 3.8 `tests/e2e/docx.spec.ts` / `tests/e2e/odt.spec.ts` — Baseline-Rundreise mit realen Fixtures (Anforderung 5.1)

```ts
test('reale mehrseitige DOCX-Datei: Rundreise ohne Paginierungs-Artefakte im Export', async ({ page }) => {
  const buffer = readFileSync(join(__dirname, '../fixtures/external/docx/saut_page.docx'))
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({
    name: 'saut_page.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer,
  })
  await expect(page.locator('.ProseMirror')).toBeVisible()

  // QA-Ergänzung (schließt Befund B): erst verifizieren, dass die Fixture tatsächlich mehrseitig
  // gerendert wird, bevor der Rundreise-Test sich darauf verlässt.
  await expect(page.locator('[data-view-mode="page-layout"]')).not.toHaveAttribute('data-page-count', '1')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const exportedBuffer = await fs.readFile((await download.path())!)
  const zip = await JSZip.loadAsync(exportedBuffer)
  const documentXml = await zip.file('word/document.xml')!.async('text')

  expect(documentXml).not.toContain('page-break-spacer')
  expect(documentXml).not.toContain('pagination')
})
```

Analog in `odt.spec.ts` mit `pagebreaks.odt` gegen `content.xml`.

### 3.9 Neu: Cross-Format-Feature-Rundreise E2E — `tests/e2e/page-layout-cross-format.spec.ts` (schließt QA-Befund A)

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

test('DOCX -> ODT -> DOCX Rundreise eines mehrseitigen Dokuments über echten Upload/Export je Formatwechsel', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()

  // Schritt 1: reale mehrseitige DOCX-Datei importieren.
  const docxBuffer = readFileSync(join(__dirname, '../fixtures/external/docx/saut_page.docx'))
  const docxInput = page
    .locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
    .locator('input[type="file"]')
  await docxInput.setInputFiles({
    name: 'saut_page.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: docxBuffer,
  })
  await expect(page.locator('.ProseMirror')).toBeVisible()
  await expect(page.locator('[data-view-mode="page-layout"]')).not.toHaveAttribute('data-page-count', '1')
  const editorTextAfterImport = await page.locator('.ProseMirror').innerText()

  // Schritt 2: als DOCX exportieren, dann als ODT wieder hochladen (App muss dafür einen Format-
  // wechsel-Weg anbieten; falls nicht vorhanden, ist dieser Testschritt an der aktuellen UI zu
  // verifizieren/anzupassen — siehe Freigabekriterien-Hinweis Abschnitt 5).
  const download1Promise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download1 = await download1Promise
  const fs = await import('node:fs/promises')
  const docxRoundtripBuffer = await fs.readFile((await download1.path())!)

  // (Re-)Import als DOCX zur Kontrolle, dass der Inhalt bereits nach Schritt 1 stabil ist:
  await docxInput.setInputFiles({
    name: 'saut_page-reimport.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: docxRoundtripBuffer,
  })
  await expect(page.locator('.ProseMirror')).toContainText(editorTextAfterImport.slice(0, 40))
})
```

**QA-Hinweis:** Ein echter DOCX→ODT-Formatwechsel **im selben Browser-Lauf** setzt voraus, dass die
App tatsächlich einen Weg bietet, ein importiertes Dokument als anderes Format zu exportieren, oder
dass zwei separate Editor-Karten (`docxCard`/`odtCard`) unabhängig denselben Inhalt importieren
können. Dies ist **vor** Fertigstellung dieses Tests gegen die tatsächliche `Toolbar.tsx`/App-UI zu
verifizieren (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19 zur Cross-Format-Erwartung) — ist kein
Blocker für den in Abschnitt 2.5 bereits vorhandenen Unit-Test-Beweis auf Reader/Writer-Ebene, wohl
aber offener Klärungspunkt für den E2E-Teil dieses Testfalls (siehe Freigabekriterien, Abschnitt 5).

### 3.10 Neu: Kopf-/Fußzeile bleibt erhalten trotz Unsichtbarkeit in der Seitenansicht (Grenzfall 13, QA-Befund E)

```ts
test('Dokument mit Kopf-/Fußzeile: bleibt in Seitenansicht unsichtbar, aber im Export erhalten', async ({ page }) => {
  // Fixture mit Header/Footer nötig (z. B. eine der externen Fixtures mit sectPr headerReference,
  // oder ein per Testcode gebautes DOCX analog buildSampleDocx() mit zusätzlichem header1.xml).
  // ... Upload wie in 3.8 ...
  await expect(page.locator('.ProseMirror')).toBeVisible()
  // Seitenansicht zeigt ausschließlich body-Inhalt (Anforderung 3.4/Element 5):
  await expect(page.locator('[data-view-mode="page-layout"]')).not.toContainText(/Kopfzeilen-Text-Marker/)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const zip = await JSZip.loadAsync(await fs.readFile((await download.path())!))
  const headerXml = await zip.file('word/header1.xml')?.async('text')
  expect(headerXml).toContain('Kopfzeilen-Text-Marker')
})
```

### 3.11 Neu: Undo direkt nach seitenauslösender Aktion (Grenzfall 10)

```ts
test('Undo nach einer Aktion, die eine neue Seite ausgelöst hat, hinterlässt keinen Geister-Leerraum', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await page.getByRole('button', { name: 'Neu erstellen' }).first().click()
  const editor = page.locator('.ProseMirror')
  await editor.click()

  const countBefore = await page.locator('.page-break-spacer').count()
  expect(countBefore).toBe(0)

  for (let i = 0; i < 100; i++) {
    await page.keyboard.type(`Absatz ${i} mit viel Text, um sicher eine zweite Seite auszulösen. `)
    await page.keyboard.press('Enter')
  }
  expect(await page.locator('.page-break-spacer').count()).toBeGreaterThan(0)

  for (let i = 0; i < 100; i++) {
    await page.keyboard.press('ControlOrMeta+z')
  }

  await expect(page.locator('.page-break-spacer')).toHaveCount(0)
  await expect(page.locator('[data-view-mode="page-layout"]')).toHaveAttribute('data-page-count', '1')
})
```

### 3.12 Neu: Bild größer als eine Seite — Rundreise (Anforderung 5.2 Punkt 5)

```ts
test('Bild größer als eine Seite: überläuft seine Seite in der Anzeige, bleibt aber in der Rundreise vollständig erhalten', async ({ page }) => {
  // Vorbereitung: großes Bild via Toolbar-"Bild einfügen" oder Drag&Drop einfügen (an tatsächliche
  // Toolbar.tsx-Bedienung anzupassen), Seitenumbruch-Überlauf visuell nicht weiter geprüft (bereits
  // als bewusstes Verhalten dokumentiert, Grenzfall 3) — Fokus hier ausschließlich auf Rundreise.
  // ...
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const zip = await JSZip.loadAsync(await fs.readFile((await download.path())!))
  const mediaFiles = Object.keys(zip.files).filter((name) => name.startsWith('word/media/'))
  expect(mediaFiles.length).toBeGreaterThan(0)
})
```

### 3.13 Neu: `PageSheets` sind rein dekorativ (QA-Befund F)

```ts
test('simulierte Seiten-Blätter sind rein dekorativ (kein Tab-Stop, keine Klick-Interaktion)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await page.getByRole('button', { name: 'Neu erstellen' }).first().click()

  const sheets = page.locator('[data-view-mode="page-layout"] [aria-hidden="true"]')
  await expect(sheets.first()).toHaveCSS('pointer-events', 'none')

  // Tab-Reihenfolge darf die Blatt-Elemente nicht erfassen: nach einem Tab von der Toolbar aus
  // landet der Fokus im Editor, nicht auf einem Blatt-Div.
  await page.getByTitle('Fett').focus()
  await page.keyboard.press('Tab')
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-hidden'))
  expect(focused).not.toBe('true')
})
```

---

## 4. Grenzfall-Testabdeckungs-Matrix (Anforderungsdatei Abschnitt 4)

| # | Grenzfall | Test(s) | Ebene |
|---|---|---|---|
| 1 | Kurzes Dokument | 3.2 (erster Test) | E2E Screenshot |
| 2 | Sehr langes Dokument (> 5 Seiten) | 3.2 (zweiter Test) | E2E Screenshot |
| 3 | Bild höher als eine Seite | 3.12 (Rundreise-Teil); visuelles Überlaufverhalten bereits im Code kommentiert, kein separater Screenshot-Test verlangt | E2E |
| 4 | Große Tabelle über Seitengrenze | analog 3.12, mit Tabellen-Fixture statt Bild — hier nicht ausformuliert, gleiches Muster | E2E |
| 5 | Schmaler Viewport (Tablet/Mobile) | 3.3 | E2E |
| 6 | Farbschema-Wechsel | 3.4 | E2E Screenshot + Style-Assertion |
| 7 | Asynchron nachladendes Bild | **nicht abgedeckt** — außerhalb des Kern-Scopes laut `-code.md` Abschnitt 5, kein expliziter Testfall in Anforderung Abschnitt 6 gefordert; als offene Restlücke in Abschnitt 5 vermerkt | — |
| 8 | Fenster-Resize ohne Bearbeitung | 3.5 | E2E |
| 9 | Tippen an automatischer Umbruchstelle | 3.6 | E2E (inkl. Rundreise) |
| 10 | Undo nach seitenauslösender Aktion | 3.11 | E2E |
| 11 | Leeres Dokument | 3.1 (erster Test) + bestehende Unit-Tests (`computePageCount([], …) = 1`) | Unit + E2E |
| 12 | Abweichendes Ursprungsformat | Dokumentations-Pflicht (keine Testautomatisierung sinnvoll, da Verhalten bewusst „ignorieren“ ist) — Reader/Writer-Unit-Test könnte höchstens bestätigen, dass ein Import mit abweichendem `w:pgSz` **nicht crasht**; siehe Empfehlung Abschnitt 5 | Unit (optional) |
| 13 | Kopf-/Fußzeile vorhanden, aber unsichtbar | 3.10 + bestehender genereller Header/Footer-Rundtrip (Abschnitt 2.1) | Unit + E2E |
| 14 | Manueller Seitenumbruch trifft auf automatische Paginierung | Cross-Referenz `seitenumbruch-req.md`, hier keine Duplikat-Tests | — |
| 15 | Unverändert hochladen/exportieren/reimportieren | 3.8, 2.4 | Unit + E2E |

---

## 5. Freigabekriterien-Checkliste (Testebene)

- [ ] Abschnitt 2 (alle Unit-Tests) grün, insbesondere 2.3 (setzt Export von `paginationKey` voraus —
      bei fehlendem Export als **blockiert**, nicht **übersprungen**, melden).
- [ ] Abschnitt 3 (alle E2E-Tests) grün auf `Desktop Chrome`; 3.3 zusätzlich auf `Tablet`/`Mobile`
      mit dokumentiertem Scroll-Verhalten (Annotation aus 3.3 wird in `-req.md` Element 9
      nachgetragen).
- [ ] Screenshot-Baselines (3.2, 3.4) einmalig unter `Desktop Chrome` erzeugt und geprüft, dass sie
      tatsächlich „mehrere Blätter" statt „ein Streifenmuster" zeigen (manuelle Sichtprüfung der
      Baseline-PNGs vor dem ersten Commit — ein Screenshot-Test kann nur gegen sich selbst
      regressionsprüfen, nicht von sich aus beurteilen, ob das Referenzbild „richtig aussieht").
- [ ] Grenzfall-Matrix (Abschnitt 4 oben) — jede Zeile einzeln befundet (grün / bewusst
      dokumentierte Einschränkung / offene Restlücke), keine Zeile stillschweigend offen.
- [ ] 3.9 (Cross-Format-E2E) — vor Fertigstellung geklärt, über welchen UI-Weg ein Formatwechsel
      im Browser tatsächlich nachgestellt wird (siehe QA-Hinweis dort); bis dahin liefert der
      Unit-Test aus 2.5 den vollständigen Beweis auf Reader/Writer-Ebene.
- [ ] 3.10 (Header/Footer) — konkrete Fixture mit Header/Footer beschafft oder synthetisch gebaut
      (analog `buildSampleDocx()`-Muster in `docx.spec.ts`) und Platzhalter-Marker durch echten
      Text ersetzt.
- [ ] Alle in Abschnitt 0 (QA-Befund A–H) benannten Lücken sind entweder in einen Test übernommen
      (A, B, C, E, F, G) oder explizit als nicht automatisierbares Restrisiko dokumentiert (D, H —
      siehe Abschnitt 6).

---

## 6. Nicht automatisierbare Restrisiken (explizit dokumentiert, kein stiller Verzicht)

1. **Öffnen der Exportdatei in echtem Microsoft Word/LibreOffice Writer** zur visuellen Bestätigung,
   dass der fehlende `<w:pgSz>`/`<w:pgMar>` (Befund 4) tatsächlich auf Words Locale-Default statt A4
   zurückfällt — kein Playwright-Test kann eine native Desktop-Anwendung starten und deren Rendering
   prüfen. Bleibt manuelle Stichprobe außerhalb dieses automatisierten Testplans, ist aber bereits
   durch Code-Lektüre (kein `w:pgSz` im XML) hinreichend belegt für die Dokumentationspflicht aus
   Anforderung 3.1.
2. **Browser-Zoomstufen-Sub-Pixel-Rundung** (Anforderungsdatei Befund 7, `-code.md` Entscheidung 1.3)
   — Playwright erlaubt `devicePixelRatio` nur beim Kontext-Start, nicht als Laufzeit-Trigger für ein
   `resize`-Event mit veränderten Schriftmetriken. Der Resize-Listener selbst ist durch 3.5 auf
   Crash-Freiheit/Konsistenz getestet, sein eigentlicher Auslöser (Zoom-Rundungsfehler) bleibt
   ungetestet — als Restrisiko vermerkt, nicht als Bug zu werten.
3. **Screenreader-Verhalten** von `PageSheets` über die einfache `aria-hidden`/Fokus-Prüfung (3.13)
   hinaus (z. B. tatsächliches NVDA/JAWS-Verhalten) — außerhalb des Werkzeugsatzes dieses Testplans.
