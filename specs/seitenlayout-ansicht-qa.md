# QA-Testplan: „Seitenlayoutansicht (Druckansicht)"

Bezug: `specs/seitenlayout-ansicht-req.md` (Anforderung), `specs/seitenlayout-ansicht-code.md`
(Umsetzungsplan, insbesondere dessen Abschnitt 4 „Tests"). Rolle dieses Dokuments: **unabhängige
QA-Prüfung** des in `-code.md` Abschnitt 4 skizzierten Testplans plus Lückenschluss. Kernauftrag laut
Anforderungsdatei Abschnitt 6, Punkt 11: Rundreise-Anforderungen müssen **sowohl** als Unit-Test gegen
Reader/Writer **als auch** als E2E-Test über echte Bedienung (echter Upload → echter Download → echter
Re-Upload) geführt werden — reine Unit-Tests mit direkt konstruierten ProseMirror-JSON-Fixtures allein
reichen nicht. Dieses Dokument spezifiziert beides konkret, dateigenau und lauffähig gegen die
**tatsächlich verifizierten** Konventionen dieses Repos (Vitest für Unit-Tests, Playwright für E2E).

**Verifikationsstand dieses QA-Dokuments (2026-07-05, gegen den echten Code geprüft, nicht behauptet):**

- Test-Harness E2E: `tests/e2e/fixtures.ts` exportiert `test`/`expect` (dismisst Banner + geht auf `/`),
  `docxCard(page)`/`odtCard(page)` (Karten-Lokalisierung über `getByRole('heading', …)`),
  `assertNoExternalRequests`. Bestehende Rundreise-Tests: `tests/e2e/docx.spec.ts` (baut mit `JSZip` ein
  Sample-DOCX, lädt per `input[type=file].setInputFiles`, exportiert per Klick, liest den Download per
  `fs.readFile(await download.path())` → `JSZip.loadAsync` → `word/document.xml`), analog `odt.spec.ts`.
- Anti-Race-Muster ist im Repo **bereits etabliert**: `tests/e2e/selection-regression.spec.ts` fügt nach
  jedem tastaturgetriebenen Cursor-Move (`End`) **vor** der nächsten Eingabe ein `await
  page.waitForTimeout(50)` ein, mit ausführlichem Kommentar zum asynchronen `selectionchange`-Event.
  Git-Historie bestätigt mehrere Flaky-Fixes exakt dieser Klasse (Commits „Fix flaky Mobile-project …
  same async-selection-sync race", „give async selection sync time before the next keystroke"). **Jeder
  neue E2E-Test in diesem Plan muss dieses Muster übernehmen** — siehe Abschnitt 1 (Determinismus).
- Unit-Test-Konventionen: `src/formats/docx/__tests__/roundtrip.test.ts` (Helfer `doc()`, `paragraph()`,
  `roundTrip()`; Header/Footer-Rundtrip im `describe('DOCX round trip: header, footer, and metadata')`,
  **Zeilen 334–344/401–410**), `src/formats/odt/__tests__/roundtrip.test.ts` (Äquivalent),
  `src/formats/shared/editor/__tests__/pagination.test.ts` (10 Arithmetik-Fälle).
- **`src/formats/docx/__tests__/pageSetup.test.ts` existiert bereits** und pinnt das DOCX-Export-Verhalten
  aus Befund 4 (genau ein `w:pgSz`=11906/16838, ein `w:pgMar`=1417, Reihenfolge nach header/footerReference).
  **Ein ODT-Äquivalent existiert nicht** — reale Lücke, siehe Abschnitt 2.7.

---

## 0. Ist-Stand des Codes vs. Plan aus `-code.md` (WICHTIG für die Einordnung roter Tests)

`specs/seitenlayout-ansicht-code.md` ist ein **Umsetzungsplan**, der zum Stand dieser QA-Prüfung
**noch nicht implementiert** ist. Direkt am Code verifiziert (2026-07-05):

| Vom Plan vorausgesetztes Artefakt | Ist-Stand im Code | Betrifft Tests |
|---|---|---|
| `paginationKey` **exportiert** (`-code.md` 3.2a) | **privat** (`pagination.ts` Zeile 31: `const paginationKey`) | 2.3 (Unit docChanged) |
| `computeFillerBeforeBreaks` (`-code.md` 3.2b) | **existiert nicht** | 2.2 |
| Plugin-State `{ decorations, pageCount }` / `getPageCount` | State ist nur `DecorationSet` | 2.3, 3.* (data-page-count) |
| `data-view-mode="page-layout"` / `data-page-count` am Wrapper (`-code.md` 3.4) | **existiert nicht** (Grep: 0 Treffer) | fast alle E2E-Tests unten |
| `PageSheets` mit Pro-Seite-Schatten (`-code.md` 3.3) | **existiert nicht**; aktuell `pageBackgroundStyle()`-Gradient (`pageLayout.ts`) | 3.2 (Screenshot), 3.4, 3.13 |
| dynamische Spacer-Höhe (Filler) | Spacer ist fixe `PAGE_GAP_PX`-Höhe | 2.2, 3.2 |
| Resize-Listener (`-code.md` 1.3) | **fehlt** | 3.5 |

**Konsequenz für die QA-Ausführung (keine stille Annahme):** Die unten spezifizierten Tests zerfallen in
zwei Klassen, die beim Testlauf **getrennt** zu berichten sind:

- **Heute schon lauffähig** (unabhängig vom Plan): die reinen Reader/Writer-Rundreise-Unit-Tests
  (2.4, 2.5, 2.6), der Fixture-Sanity-Check (2.6), der bestehende `pageSetup.test.ts` (DOCX-Geometrie) und
  das neu geforderte ODT-Geometrie-Pendant (2.7) sowie alle E2E-Rundreise-Tests, die **nur** über
  `.ProseMirror`/Export/Download-Bytes prüfen und **kein** `data-*`-Attribut brauchen (3.6 ohne die
  page-count-Vorprüfung, 3.8 ohne die Mehrseiten-Vorprüfung, 3.10, 3.12).
- **Rot/blockiert bis der `-code.md`-Plan gelandet ist**: alles, was `data-view-mode`/`data-page-count`,
  `paginationKey`-Export, `PageSheets` oder `computeFillerBeforeBreaks` voraussetzt. Diese sind bei
  fehlendem Artefakt **als „blockiert (Feature nicht implementiert)"**, nicht als „übersprungen" und nicht
  als „bestanden", zu melden. Ein grüner Gesamtlauf ist erst nach Umsetzung des Plans möglich.

Dieser Testplan ist bewusst so geschrieben, dass er nach Umsetzung des `-code.md`-Plans **ohne Umbau**
grün werden kann und bis dahin die Freigabe ehrlich blockiert.

---

## 1. Determinismus-Regeln (verbindlich für alle E2E-Tests dieses Plans)

Der Auftrag verlangt ausdrücklich **deterministische** Tests: keine Race-Conditions durch zu schnelle
Tastatureingaben, Selektions-Sync abwarten. Die Paginierung verschärft das, weil sie **asynchron** ist:
`createPaginationPlugin()` misst die Blockhöhen in einem `requestAnimationFrame` **nach** jedem
View-Update und dispatcht dann eine **Folge-Transaktion** (`pagination.ts` Zeile 93,
`setMeta(paginationKey, …)`). `data-page-count` und `.page-break-spacer` ändern sich daher noch **ein
oder mehrere Frames nach** dem letzten Tastendruck. Wer unmittelbar danach zählt/screenshotet, misst
einen Zwischenzustand. Verbindliche Regeln:

**R1 — Nach jedem tastaturgetriebenen Cursor-Move vor der nächsten Eingabe warten.** Genau das etablierte
Muster aus `selection-regression.spec.ts`: nach `End`/`Home`/`ControlOrMeta+Home`/`ControlOrMeta+End`/
Pfeiltasten folgt vor dem nächsten `type`/`press('Enter')` ein `await page.waitForTimeout(50)`. Grund:
ProseMirror erfährt den nativen Caret-Move nur über das asynchrone `selectionchange`-Event; ein sofort
nachgeschobener Tastendruck kann diesem zuvorkommen und auf der alten Position wirken.

**R2 — Bulk-Tippen mit kleinem Per-Zeichen-Delay.** Text, der mehrere Seiten füllen soll, wird mit
`page.keyboard.type(text, { delay: 5 })` eingegeben, nicht mit dem Default-`delay: 0`. Das entkoppelt die
Eingabe von der Selection-Sync-Pipeline (Ursache der Mobile-Flakes in der Git-Historie) und kostet bei
den hier nötigen Textmengen < 1 s.

**R3 — Paginierung explizit stabilisieren, bevor darauf geprüft wird.** Vor **jeder** Assertion auf
`data-page-count`, `.page-break-spacer`-Anzahl/-Position oder vor **jedem** Screenshot wird auf einen
stabilen Paginierungszustand gewartet — deterministisch über den **beobachteten Wert**, nicht über einen
festen Sleep. Dafür der Helfer unten (`waitForPaginationStable`). **Verboten** sind
Tautologie-„Sync-Punkte" wie `await expect(spacers).toHaveCount(await spacers.count())` (prüft den Wert
gegen sich selbst → immer wahr, synchronisiert nichts) — das war ein konkreter Mangel im geprüften
Entwurf und ist hier ersetzt.

**R4 — Keine Prüfung auf visuelle Sichtbarkeit des Spacers.** `.page-break-spacer` hat laut `src/index.css`
(einzige Regel `width: 100%`) **keine** Eigenoptik; `toBeVisible()` würde bei Nullhöhe sogar fehlschlagen.
DOM-Assertionen auf Spacer verwenden `toBeAttached()` (Existenz/Reihenfolge = reine Strukturprüfung); die
**visuelle** Aussage „mehrere Blätter erkennbar" liefern ausschließlich die Screenshot-Tests (3.2).

**Gemeinsamer Helfer** `tests/e2e/paginationHelpers.ts` (neu — von allen Specs dieses Plans importiert):

```ts
import { type Page, expect } from '@playwright/test'

/**
 * Pagination is async (pagination.ts: measure in rAF, then dispatch a follow-up meta
 * transaction). data-page-count keeps changing for one+ frames after the last keystroke,
 * so any assertion on page count / spacer positions must wait for it to settle first.
 * Deterministic: polls the *observed* value across an animation frame instead of sleeping
 * a fixed amount. Requires the -code.md plan's data-page-count attribute (see QA Abschnitt 0).
 */
export async function waitForPaginationStable(page: Page): Promise<number> {
  const read = async () =>
    (await page.locator('[data-view-mode="page-layout"]').getAttribute('data-page-count')) ?? ''
  await expect
    .poll(async () => {
      const a = await read()
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))))
      const b = await read()
      return a !== '' && a === b ? 'stable' : 'pending'
    }, { message: 'Paginierung (data-page-count) hat sich nicht stabilisiert' })
    .toBe('stable')
  return Number(await read())
}

/** Types `count` paragraphs deterministically (R2) and returns once pagination has settled (R3). */
export async function fillWithParagraphs(
  page: Page,
  count: number,
  textFor: (i: number) => string,
): Promise<number> {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  for (let i = 0; i < count; i++) {
    await page.keyboard.type(textFor(i), { delay: 5 }) // R2
    await page.keyboard.press('Enter')
  }
  return waitForPaginationStable(page) // R3
}
```

**R5 — Screenshot-Plattform-Determinismus.** Playwright legt Screenshot-Baselines per Plattform ab
(`*-linux.png` etc.), weil System-Font-Rendering zwischen Windows (lokal) und Linux (CI) differiert; die
CSP dieses Projekts blockiert externe Fonts, es kommen also OS-System-Fonts zum Einsatz. **Verbindliche
Baselines werden im CI-Container (Linux) erzeugt**, nicht lokal committet; `maxDiffPixelRatio` wird
explizit gesetzt (Abschnitt 3.2/3.4), nie stillschweigend auf 0 gelassen.

---

## 2. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

### 2.1 Bestehende Tests — unverändert als Regressionsschutz erhalten

- `src/formats/shared/editor/__tests__/pagination.test.ts` (10 bestehende Fälle: leer, exakter Fit,
  Überlauf, überdimensionierter Block, nicht-positive Seitenhöhe, `computePageCount`) — **nicht ändern**,
  nur ergänzen.
- `src/formats/docx/__tests__/roundtrip.test.ts` `describe('DOCX round trip: header, footer, and
  metadata')` (Zeilen 334–344/401–410) und das ODT-Äquivalent — Header/Footer bleiben erhalten; deckt die
  generische Hälfte von Grenzfall 13 ab.
- `src/formats/docx/__tests__/pageSetup.test.ts` (**bereits vorhanden**) — pinnt die A4/25-mm-Geometrie im
  DOCX-Export (Befund 4). Bei einem Test 2.2 wird die Filler-Arithmetik ergänzt; das Geometrie-Pinning ist
  hier **schon erledigt** für DOCX und muss nicht dupliziert werden.

### 2.2 Neu: `computeFillerBeforeBreaks` (setzt Root-Cause-Fix aus `-code.md` 1.1/3.2b voraus)

Ergänzung in `pagination.test.ts`. **Blockiert, bis `computeFillerBeforeBreaks` existiert (Abschnitt 0).**

```ts
import { computeFillerBeforeBreaks } from '../pagination'

describe('computeFillerBeforeBreaks', () => {
  it('needs no filler when a page is filled exactly', () => {
    expect(computeFillerBeforeBreaks([100, 100, 100, 150], 300, [3])).toEqual([0])
  })

  it('fills the gap left by an underfull page (Befund 6 regression, Beispiel aus -code.md 1.1)', () => {
    expect(computeFillerBeforeBreaks([290, 290], 300, [1])).toEqual([10])
  })

  it('computes an independent filler per break, resetting cumulative after each', () => {
    // Seite 1: [280] -> Filler 20 vor Break@1. Seite 2 (reset): [150,150] exakt -> Filler 0 vor Break@3.
    expect(computeFillerBeforeBreaks([280, 150, 150, 100], 300, [1, 3])).toEqual([20, 0])
  })

  it('mirrors the existing computePageBreakIndices([200,200,200,200],300)=[1,2,3] case', () => {
    // je Seite ein 200er-Block, es fehlen je 100px bis 300:
    expect(computeFillerBeforeBreaks([200, 200, 200, 200], 300, [1, 2, 3])).toEqual([100, 100, 100])
  })

  it('returns zeros for a non-positive page height without crashing (Anforderung 3.10)', () => {
    expect(computeFillerBeforeBreaks([100, 100], 0, [1])).toEqual([0])
  })

  it('returns an empty array when there are no breaks', () => {
    expect(computeFillerBeforeBreaks([100], 300, [])).toEqual([])
  })
})
```

Der dritte Fall (unterschiedlicher Filler pro Break) ist die **QA-Härtung** gegenüber dem Dev-Entwurf
(der nur einen einzelnen Break testete): ohne ihn bliebe unentdeckt, falls eine Implementierung
`cumulative` nach einem Break nicht zurücksetzt und denselben Filler global wiederverwendet.

### 2.3 Neu: Pagination-Meta-Transaktion markiert das Dokument nie als geändert (Anforderung 5.1 Punkt 3)

Setzt den **Export** von `paginationKey` voraus (`-code.md` 3.2a; aktuell privat). **Ohne diesen Export
ist der Test nicht schreibbar** — beim Testlauf dann als **rot/blockiert**, nicht „übersprungen", melden.

```ts
import { paginationKey } from '../pagination'
import { EditorState } from 'prosemirror-state'
import { DecorationSet } from 'prosemirror-view'
import { wordSchema } from '../../schema'

describe('pagination meta transactions never mark the document changed (Rundreise-Absicherung)', () => {
  it('tr.docChanged is false for a transaction that only sets pagination meta', () => {
    const state = EditorState.create({ schema: wordSchema })
    const tr = state.tr.setMeta(paginationKey, { decorations: DecorationSet.empty, pageCount: 3 })
    expect(tr.docChanged).toBe(false)
  })

  it('the applied state still has an identical document (no content mutation)', () => {
    const state = EditorState.create({ schema: wordSchema })
    const tr = state.tr.setMeta(paginationKey, { decorations: DecorationSet.empty, pageCount: 3 })
    const next = state.apply(tr)
    expect(next.doc.eq(state.doc)).toBe(true)
  })
})
```

Ein neu erzeugter zweiter `new PluginKey('pagination')` ist **nicht** derselbe Schlüssel (Identität, nicht
String — `-code.md` Zusatzbefund C); der Test ist nur mit dem echten, exportierten Key aussagekräftig.

### 2.4 Neu: Reader/Writer-Rundreise mit „virtuell mehrseitigem" Inhalt, ohne Paginierungs-Artefakte

Kern von Anforderung 5.1 Punkt 1/2 und 3.9: Da Paginierung reine View-Decoration ist, darf ein Dokument,
das im Editor mehrere simulierte Seiten erzeugen *würde*, beim reinen Reader/Writer-Roundtrip (ohne
Browser) niemals Paginierungs-Metadaten im XML enthalten. **Heute lauffähig** (kein Plan-Artefakt nötig).

`src/formats/docx/__tests__/roundtrip.test.ts`, neuer Block (`doc()`/`paragraph()` sind dort vorhanden):

```ts
import JSZip from 'jszip'

describe('DOCX round trip: content that would span multiple simulated pages', () => {
  it('preserves all paragraphs and never leaks pagination view-state into document.xml', async () => {
    const paragraphs = Array.from({ length: 150 }, (_, i) => paragraph(`Absatz Nummer ${i} mit Text.`))
    const original = doc(paragraphs)
    const blob = await writeDocx(original)

    const xmlText = await JSZip.loadAsync(blob).then((zip) => zip.file('word/document.xml')!.async('text'))
    expect(xmlText).not.toContain('page-break-spacer')
    expect(xmlText).not.toContain('pagination')

    const result = await readDocx(blob)
    const resultParagraphs = (result.body as { content: any[] }).content
    expect(resultParagraphs).toHaveLength(150)
    expect(resultParagraphs[0].content[0].text).toBe('Absatz Nummer 0 mit Text.')
    expect(resultParagraphs[149].content[0].text).toBe('Absatz Nummer 149 mit Text.')
  })
})
```

Analog `src/formats/odt/__tests__/roundtrip.test.ts` gegen `content.xml` (Marker `page-break-spacer`,
`pagination` dürfen dort ebenfalls nicht vorkommen).

**Warum trotz des E2E-Tests in 3.8 zusätzlich sinnvoll:** läuft ohne Browser in Millisekunden und
lokalisiert einen Regressionsfall sofort auf „Writer/Reader" statt erst im langsameren E2E-Lauf.

### 2.5 Neu: Cross-Format-Rundreise DOCX → ODT → DOCX auf Unit-Ebene (schließt QA-Befund A, Anforderung 5.2.6)

Neue Datei `src/formats/__tests__/cross-format-roundtrip.test.ts`. **Heute lauffähig.**

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

    const afterDocx = await readDocx(await writeDocx(original))
    const afterOdt = await readOdt(await writeOdt(afterDocx))
    const final = await readDocx(await writeDocx(afterOdt))

    const finalParagraphs = (final.body as { content: any[] }).content
    expect(finalParagraphs).toHaveLength(120)
    for (let i = 0; i < 120; i++) {
      expect(finalParagraphs[i].content[0].text).toBe(`Zeile ${i} mit ausreichend Text.`)
    }
  })
})
```

Abnahmekriterium hier bewusst **nur Textinhalt** (Anforderung 5.2 Punkt 6); Cross-Format-Formatnuancen
sind laut Rest der Spezifikation zu dokumentieren, nicht Teil dieses Tests.

### 2.6 Neu: Sanity-Check der realen Mehrseiten-Fixtures (schließt QA-Befund B auf Unit-Ebene)

Fixtures **verifiziert vorhanden**: `tests/fixtures/external/docx/saut_page.docx`,
`tests/fixtures/external/odt/pagebreaks.odt`, `tests/fixtures/external/docx/bug65649.docx`,
`tests/fixtures/external/odt/brokenList.odt`. Bevor sich E2E-Tests (3.7/3.8) auf `saut_page.docx`/
`pagebreaks.odt` als „mehrseitig" verlassen, bestätigt ein schneller Unit-Test, dass sie genug Inhalt für
plausibel > 1 A4-Seite tragen. **Heute lauffähig.**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readDocx } from '../reader'

describe('Fixture-Sanity: saut_page.docx ist inhaltlich groß genug für einen Mehrseiten-Test', () => {
  it('hat genug Text, um in der Seitenlayoutansicht plausibel >1 Seite zu ergeben', async () => {
    const buffer = readFileSync(join(__dirname, '../../../../tests/fixtures/external/docx/saut_page.docx'))
    const result = await readDocx(new Blob([new Uint8Array(buffer)]))
    const totalChars = JSON.stringify((result.body as { content: unknown[] }).content).length
    // grobe Schwelle: eine A4-Seite fasst bei Standard-Schriftgröße realistisch ~3000-4000 Zeichen;
    // deutlich darüber liegt sicher über einer Seite.
    expect(totalChars).toBeGreaterThan(4000)
  })
})
```

Analog für `pagebreaks.odt` gegen `readOdt`. **Schlägt dieser Test künftig fehl** (Fixture ausgetauscht),
ist das das Signal, 3.7/3.8/3.2 auf eine neue mehrseitige Fixture umzustellen, bevor deren grüner Status
irreführend wird.

### 2.7 Neu: ODT-Export-Geometrie pinnen (schließt reale Lücke — DOCX hat `pageSetup.test.ts`, ODT nicht)

Anforderung 5.1 Punkt 4 / Testplan Punkt 10 verlangt das Pinning **beider** Formate. Für DOCX erledigt
`src/formats/docx/__tests__/pageSetup.test.ts` das bereits; ein ODT-Pendant **fehlt** (Verzeichnis
`src/formats/odt/__tests__/` enthält kein `page-setup`/`pageSetup`). Neue Datei
`src/formats/odt/__tests__/pageSetup.test.ts`. **Heute lauffähig.**

```ts
import JSZip from 'jszip'
import { writeOdt } from '../writer'
import type { WordDocumentContent } from '../../shared/documentModel'

function doc(content: unknown[]): WordDocumentContent {
  return { body: { type: 'doc', content }, header: null, footer: null, meta: { title: '' } }
}

describe('ODT writer: page layout geometry (Befund 4, Gegenstück zu docx/pageSetup.test.ts)', () => {
  it('writes exactly one style:page-layout with A4/2.5cm geometry', async () => {
    const blob = await writeOdt(doc([{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'x' }] }]))
    const stylesXml = await JSZip.loadAsync(blob).then((z) => z.file('styles.xml')!.async('text'))
    expect(stylesXml.match(/<style:page-layout\b/g)).toHaveLength(1)
    expect(stylesXml).toContain('fo:page-width="21cm"')
    expect(stylesXml).toContain('fo:page-height="29.7cm"')
    expect(stylesXml).toContain('fo:margin="2.5cm"')
  })
})
```

Damit ist das in Befund 4 korrigierte, aktuell korrekte Export-Verhalten **für beide Formate** gepinnt —
ein späterer Umbau auf dokumentabgeleitete Geometrie kann die feste A4/25-mm-Konsistenz nicht mehr
unbemerkt verlieren.

---

## 3. Echte Playwright-Browser-Tests

Alle folgenden Tests fassen ausschließlich über UI an: `docxCard(page)`/`odtCard(page)` +
`getByRole('button', …)`/`getByTitle('Fett')`, `.locator('.ProseMirror')`, echte `page.keyboard`-Eingaben
(**mit den Determinismus-Regeln R1–R5 aus Abschnitt 1**), `input[type=file].setInputFiles` für Uploads,
`page.waitForEvent('download')` + `fs.readFile(await download.path())` + `JSZip.loadAsync` für
Exportprüfungen — deckungsgleich mit `tests/e2e/docx.spec.ts`/`odt.spec.ts`. **Kein** Test prüft einen
intern zurückgegebenen Blob; jede Datei-Assertion prüft den tatsächlich heruntergeladenen Byte-Inhalt.
Import über den bestehenden `./fixtures`-Harness (`import { test, expect, docxCard, odtCard } from
'./fixtures'`), der Banner-Dismiss/`/`-Navigation kapselt; die hier zur Lesbarkeit gezeigten
`page.goto('/')`+„verstanden"-Zeilen sind beim Implementieren durch den Harness zu ersetzen.

### 3.1 `tests/e2e/page-layout.spec.ts` — Struktur & Modus-Kennzeichnung (Element 1, Anforderung 6.3)

Setzt `data-view-mode`/`data-page-count` voraus (Abschnitt 0 → bis dahin blockiert).

```ts
import { test, expect, docxCard } from './fixtures'
import { fillWithParagraphs } from './paginationHelpers'

test.describe('Seitenlayoutansicht — Struktur', () => {
  test('markiert den aktuellen Modus eindeutig als Seitenlayoutansicht', async ({ page }) => {
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    await expect(page.locator('[data-view-mode="page-layout"]')).toHaveAttribute('data-page-count', '1')
  })

  test('mehrseitiges Dokument erzeugt Seitentrenner in korrekter Reihenfolge und konsistenter Anzahl', async ({ page }) => {
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const pageCount = await fillWithParagraphs(page, 80, (i) =>
      `Absatz Nummer ${i} mit ausreichend Text, um mehrere Seiten zu füllen. `,
    ) // R3: kehrt erst nach stabilem data-page-count zurück
    const spacerCount = await page.locator('.page-break-spacer').count()
    expect(spacerCount).toBeGreaterThanOrEqual(2) // Anforderung 6.3: mind. 3 Seiten -> mind. 2 Spacer
    expect(pageCount).toBe(spacerCount + 1) // Konsistenz pageCount === Spacer + 1 (kein Literal)
  })
})
```

### 3.2 `tests/e2e/page-layout-screenshots.spec.ts` — Screenshot-Regression (Anforderung 6.4/6.5, Grenzfall 1/2)

Setzt `PageSheets`/`data-page-count` voraus (Abschnitt 0). Baselines im CI erzeugen (R5).

```ts
import { test, expect, docxCard } from './fixtures'
import { fillWithParagraphs, waitForPaginationStable } from './paginationHelpers'

test.describe('Seitenlayoutansicht — Screenshot-Regression', () => {
  test.beforeEach(async ({ page }) => {
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('kurzes Dokument: Seitenrand entspricht Sollgröße, kein unerwarteter Leerraum', async ({ page }) => {
    await page.locator('.ProseMirror').click()
    await page.keyboard.type('Ein kurzer Absatz.', { delay: 5 })
    await waitForPaginationStable(page) // R3: nicht mitten im rAF-Zyklus screenshotten
    await expect(page.locator('[data-view-mode="page-layout"]')).toHaveScreenshot('short-document-top.png', {
      clip: { x: 0, y: 0, width: 900, height: 300 },
      maxDiffPixelRatio: 0.02, // R5: Toleranz gegen Font-Antialiasing-Rauschen CI/lokal, bewusst gesetzt
    })
  })

  test('langes Dokument (>= 4 Seiten): Übergänge Seite 1/2 UND 3/4 zeigen keinen kumulativen Versatz', async ({ page }) => {
    await fillWithParagraphs(page, 220, (i) => `Zeile ${i} mit genug Text, um mehrere Seiten zu füllen. `)
    const spacers = page.locator('.page-break-spacer')
    const count = await spacers.count()
    expect(count).toBeGreaterThanOrEqual(3) // harter Abbruch: sonst ist der 3/4-Vergleich sinnlos

    await spacers.nth(0).scrollIntoViewIfNeeded()
    await expect(page).toHaveScreenshot('long-document-page-1-2-boundary.png', { maxDiffPixelRatio: 0.02 })
    await spacers.nth(2).scrollIntoViewIfNeeded()
    await expect(page).toHaveScreenshot('long-document-page-3-4-boundary.png', { maxDiffPixelRatio: 0.02 })
  })
})
```

**QA-Anmerkung:** Der zweite Test bricht bei `< 3` Spacern **hart** ab (statt den 3/4-Vergleich still zu
überspringen), damit ein zu kurz geratenes Test-Dokument nicht zu einem grünen, aber aussagelosen Test
führt. Der ursprüngliche Dev-Entwurf hatte hier ein `if (count >= 3)`-Skip — bewusst entfernt.

### 3.3 `tests/e2e/page-layout-viewport.spec.ts` — Tablet/Mobile (Anforderung 6.6, Grenzfall 5, QA-Befund C)

Läuft auf `Tablet`/`Mobile` (`playwright.config.ts`). Der Toolbar-/Export-Teil ist **heute lauffähig**;
die `scrollWidth`-Messung braucht `data-view-mode` (Abschnitt 0).

```ts
import { test, expect, docxCard } from './fixtures'

test.describe('Seitenlayoutansicht auf schmalen Viewports', () => {
  test('Toolbar erreichbar, Kernfunktionen bedienbar, Scroll-Verhalten dokumentiert', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Desktop Chrome', 'nur schmale Viewports')
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()

    await expect(page.getByTitle('Fett')).toBeVisible()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Mobiler Test', { delay: 5 })
    await page.keyboard.press('ControlOrMeta+a')
    await page.waitForTimeout(50) // R1: Selektions-Sync vor der Toolbar-Aktion abwarten
    await page.getByTitle('Fett').click()
    await expect(editor).toContainText('Mobiler Test')

    // QA-Ergänzung (Befund C): tatsächliches Ist-Verhalten messen und annotieren (Element 9),
    // nicht nur annehmen, dass overflow-auto "irgendwie" funktioniert.
    const container = page.locator('[data-view-mode="page-layout"]')
    const { scrollWidth, clientWidth } = await container.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }))
    testInfo.annotations.push({
      type: 'viewport-scroll-behavior',
      description: `scrollWidth=${scrollWidth} clientWidth=${clientWidth} -> ${
        scrollWidth > clientWidth ? 'horizontales Scrollen aktiv (Ist-Zustand, -code.md 1.6)' : 'passt ohne Scrollen'
      }`,
    })

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    expect(await download.path()).toBeTruthy()
  })
})
```

Ergebnis der Annotation ist nach Testlauf in `-req.md` Element 9 als endgültiger Ist-Befund nachzutragen
(Freigabekriterium, Abschnitt 5).

### 3.4 `tests/e2e/page-layout-color-scheme.spec.ts` — Farbschema (Anforderung 6.7, Grenzfall 6)

Setzt `PageSheets` mit stabilem Hook voraus (Abschnitt 0). **Wichtige QA-Korrektur des Selektors:** der
geprüfte Entwurf griff `[data-view-mode] >> css=div` `.first()` ab — das ist der **Stack-Wrapper**
(transparent), **nicht** ein Blatt. Das weiße Blatt ist ein Kind der `PageSheets`-Ebene. **Empfehlung an
Dev:** `PageSheets` ein stabiles `data-page-sheet`-Attribut je Blatt geben, damit dieser (und der
Screenshot-)Test nicht an der DOM-Verschachtelung bricht.

```ts
import { test, expect, docxCard } from './fixtures'

for (const scheme of ['light', 'dark'] as const) {
  test(`Seiten-Hintergrund bleibt weiß bei prefers-color-scheme: ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    await page.locator('.ProseMirror').click()
    await page.keyboard.type('Test', { delay: 5 })
    await expect(page).toHaveScreenshot(`page-background-${scheme}.png`, { maxDiffPixelRatio: 0.02 })

    // Explizite Farbwert-Assertion zusätzlich zum Screenshot -> ein Fehlschlag benennt sofort die
    // Ursache (Blatt-Hintergrundfarbe) statt nur "Pixel weichen ab". Selektor zielt auf das Blatt
    // selbst (data-page-sheet), nicht den transparenten Stack-Wrapper.
    const sheetBg = await page
      .locator('[data-page-sheet]')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(sheetBg).toMatch(/rgb\(255,\s*255,\s*255\)/)
  })
}
```

### 3.5 `tests/e2e/page-layout-resize.spec.ts` — Resize (Anforderung 6.9, Grenzfall 8)

Setzt `data-page-count` voraus (Abschnitt 0).

```ts
import { test, expect, docxCard } from './fixtures'
import { fillWithParagraphs, waitForPaginationStable } from './paginationHelpers'

test('Paginierung bleibt nach Fenster-Resize konsistent (mit Resize-Listener) bzw. dokumentiert eingefroren (ohne)', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const before = await fillWithParagraphs(page, 100, (i) => `Absatz ${i} mit ausreichend Text zum Füllen mehrerer Seiten. `)

  await page.setViewportSize({ width: 800, height: 600 })
  const after = await waitForPaginationStable(page) // R3 statt fester waitForTimeout(300)

  expect(after).toBe(before) // feste Seitenbreite reflowt nicht mit der Fensterbreite
  await expect(page.locator('.page-break-spacer').first()).toBeAttached() // R4: kein Crash/leerer State
})
```

**QA-Anmerkung (Freigabekriterium H):** prüft *Konsistenz/Crash-Freiheit*, nicht *ob* neu gemessen wurde —
bei fester Seitenbreite ist Letzteres ohnehin nicht zu erwarten. Der eigentliche Auslöser des in `-code.md`
1.3 vorgeschlagenen Resize-Listeners (Sub-Pixel-Drift bei **Zoomstufen**-Änderung) ist mit Playwright
**nicht** automatisierbar (`devicePixelRatio` nur beim Kontext-Start setzbar) → Restrisiko Abschnitt 6.

### 3.6 Ergänzung `tests/e2e/selection-regression.spec.ts` — Tippen an der Umbruchstelle (Anforderung 6.8, Grenzfall 9)

Der Rundreise-Teil ist **heute lauffähig**; die `.page-break-spacer`-Vorprüfung braucht das Feature. R1
ist hier **kritisch** (Cursor-Moves direkt vor Eingaben — genau der Race, gegen den diese Datei existiert).

```ts
import JSZip from 'jszip'
import { fillWithParagraphs } from './paginationHelpers'

test('Tippen direkt an einer automatisch berechneten Umbruchstelle verliert/vertauscht keinen Text', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  await fillWithParagraphs(page, 60, (i) => `Zeile ${i} mit ausreichend Text, um einen Seitenumbruch zu erzwingen. `)
  await expect(page.locator('.page-break-spacer').first()).toBeAttached() // R4

  await page.keyboard.press('ControlOrMeta+Home')
  await page.waitForTimeout(50) // R1: Selektions-Sync nach Cursor-Move abwarten
  await page.keyboard.type('EINFUEGUNG-VORNE ', { delay: 5 })
  await page.keyboard.press('ControlOrMeta+End')
  await page.waitForTimeout(50) // R1
  await page.keyboard.type(' EINFUEGUNG-HINTEN', { delay: 5 })

  const editor = page.locator('.ProseMirror')
  await expect(editor).toContainText('EINFUEGUNG-VORNE')
  await expect(editor).toContainText('EINFUEGUNG-HINTEN')
  await expect(editor).toContainText('Zeile 0')
  await expect(editor).toContainText('Zeile 59')

  // QA-Ergänzung: echte Rundreise ab dieser Bearbeitung (Anforderung 5.2 Punkt 3), nicht nur DOM-Text.
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const zip = await JSZip.loadAsync(await fs.readFile((await download.path())!))
  const xml = await zip.file('word/document.xml')!.async('text')
  expect(xml).toContain('EINFUEGUNG-VORNE')
  expect(xml).toContain('EINFUEGUNG-HINTEN')
  expect(xml).toContain('Zeile 0')
  expect(xml).toContain('Zeile 59')
})
```

Analog als ODT-Variante über `odtCard` gegen `content.xml` (Anforderung 5.2 Punkt 4 verlangt DOCX **und**
ODT).

### 3.7 `tests/e2e/large-document-import.spec.ts` — Performance mit realem großem Dokument (Anforderung 3.7)

Die Datei **existiert bereits** (misst DOCX-`bug65649.docx`- und ODT-`brokenList.odt`-Import, 15-s-Grenze,
„Tab nicht eingefroren"-Beweis). **Ergänzen, nicht neu anlegen** — um die paginierungs-spezifische
Assertion (braucht `data-page-count`, Abschnitt 0):

```ts
// NACH dem bestehenden Import-Timing-Block im bug65649.docx-Test:
await expect
  .poll(async () => Number(await page.locator('[data-view-mode="page-layout"]').getAttribute('data-page-count')),
    { timeout: 15_000 })
  .toBeGreaterThan(1) // mehrseitiges Groß-Dokument paginiert
await page.locator('.ProseMirror').click()
await page.keyboard.type('X', { delay: 5 })
await expect(page.locator('.ProseMirror')).toContainText('X') // Editor bleibt nach rAF-Neumessung reaktionsfähig
```

### 3.8 `tests/e2e/docx.spec.ts` / `odt.spec.ts` — Baseline-Rundreise mit realen Fixtures (Anforderung 5.1)

Der Rundreise-/Byte-Teil ist **heute lauffähig**; die Mehrseiten-Vorprüfung (Befund B) braucht
`data-page-count` (Abschnitt 0) — bis dahin diese eine Zeile auskommentieren und der Fixture-Sanity-Test
2.6 trägt die Mehrseitigkeit.

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

test('reale mehrseitige DOCX-Datei: Rundreise ohne Paginierungs-Artefakte im Export', async ({ page }) => {
  const buffer = readFileSync(join(__dirname, '../fixtures/external/docx/saut_page.docx'))
  await docxCard(page).locator('input[type="file"]').setInputFiles({ name: 'saut_page.docx', mimeType: DOCX_MIME, buffer })
  await expect(page.locator('.ProseMirror')).toBeVisible()

  // QA-Ergänzung (Befund B): erst verifizieren, dass die Fixture tatsächlich mehrseitig gerendert wird.
  await expect(page.locator('[data-view-mode="page-layout"]')).not.toHaveAttribute('data-page-count', '1')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const zip = await JSZip.loadAsync(await fs.readFile((await download.path())!))
  const documentXml = await zip.file('word/document.xml')!.async('text')

  expect(documentXml).not.toContain('page-break-spacer')
  expect(documentXml).not.toContain('pagination')
})
```

Analog in `odt.spec.ts` mit `pagebreaks.odt` gegen `content.xml`.

### 3.9 Neu: Cross-Format-Feature-Rundreise E2E — `tests/e2e/page-layout-cross-format.spec.ts` (QA-Befund A)

**Offener UI-Klärungspunkt** (kein Blocker für den Unit-Beweis 2.5): Ein echter DOCX→ODT-Formatwechsel
*im selben Lauf* setzt voraus, dass die App dafür einen Weg bietet. **Verifiziert an der aktuellen UI:**
es gibt zwei unabhängige Editor-Karten (`docxCard`/`odtCard`), aber **kein** verifizierter In-App-Pfad,
denselben importierten Inhalt aus der einen Karte in die andere zu übernehmen. Daher liefert diesen Test
konservativ als **DOCX→Export→DOCX-Reimport-Stabilität** (echter Upload/Download je Schritt); der
vollständige Formatwechsel-Beweis bleibt auf Unit-Ebene (2.5), bis ein UI-Pfad existiert.

```ts
import { test, expect, docxCard } from './fixtures'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

test('mehrseitiges DOCX: Upload -> echter Export -> Reimport erhält den Textinhalt', async ({ page }) => {
  const buffer = readFileSync(join(__dirname, '../fixtures/external/docx/saut_page.docx'))
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'saut_page.docx', mimeType: DOCX_MIME, buffer })
  await expect(page.locator('.ProseMirror')).toBeVisible()
  const textAfterImport = await page.locator('.ProseMirror').innerText()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const fs = await import('node:fs/promises')
  const roundtripBuffer = await fs.readFile((await (await downloadPromise).path())!)

  await input.setInputFiles({ name: 'saut_page-reimport.docx', mimeType: DOCX_MIME, buffer: roundtripBuffer })
  await expect(page.locator('.ProseMirror')).toContainText(textAfterImport.slice(0, 40))
})
```

Der echte Cross-Format-Beweis DOCX↔ODT ist über den Unit-Test 2.5 vollständig abgedeckt; dieser E2E-Test
sichert die reale Datei-Rundreise (Bytes über Disk) auf DOCX-Ebene ab.

### 3.10 Neu: Kopf-/Fußzeile bleibt erhalten trotz Unsichtbarkeit (Grenzfall 13, QA-Befund E)

Fixtures mit Header/Footer **verifiziert vorhanden**: `tests/fixtures/external/docx/PageSpecificHeadFoot.docx`,
`DiffFirstPageHeadFoot.docx`. Alternativ ein per Testcode gebautes DOCX mit `header1.xml` (Muster
`buildSampleDocx()` in `docx.spec.ts`). Der Sichtbarkeits-Check auf `data-view-mode` braucht das Feature;
der Export-Erhalt-Teil ist **heute lauffähig**.

```ts
import JSZip from 'jszip'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

test('Dokument mit Kopf-/Fußzeile: in Seitenansicht unsichtbar, aber im Export erhalten', async ({ page }) => {
  const buffer = readFileSync(join(__dirname, '../fixtures/external/docx/PageSpecificHeadFoot.docx'))
  await docxCard(page).locator('input[type="file"]').setInputFiles({ name: 'PageSpecificHeadFoot.docx', mimeType: DOCX_MIME, buffer })
  await expect(page.locator('.ProseMirror')).toBeVisible()

  // Header/Footer-Text darf im body-only-Editor NICHT erscheinen (Anforderung 3.4/Element 5).
  // Konkreter Header-Text der Fixture ist vor Verwendung einmalig auszulesen und hier einzusetzen.
  // await expect(page.locator('.ProseMirror')).not.toContainText('<Header-Marker der Fixture>')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const fs = await import('node:fs/promises')
  const zip = await JSZip.loadAsync(await fs.readFile((await (await downloadPromise).path())!))
  const headerXml = await zip.file('word/header1.xml')?.async('text')
  expect(headerXml).toBeTruthy() // Header-Part im Export erhalten (Datenmodell nicht verloren)
})
```

### 3.11 Neu: Undo direkt nach seitenauslösender Aktion (Grenzfall 10)

Setzt `data-page-count`/`.page-break-spacer` voraus (Abschnitt 0).

```ts
import { fillWithParagraphs, waitForPaginationStable } from './paginationHelpers'

test('Undo nach einer seitenauslösenden Aktion hinterlässt keinen Geister-Leerraum', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  expect(await page.locator('.page-break-spacer').count()).toBe(0)

  await fillWithParagraphs(page, 100, (i) => `Absatz ${i} mit viel Text, um sicher eine zweite Seite auszulösen. `)
  expect(await page.locator('.page-break-spacer').count()).toBeGreaterThan(0)

  for (let i = 0; i < 100; i++) {
    await page.keyboard.press('ControlOrMeta+z')
  }
  await waitForPaginationStable(page) // R3: Neupaginierung nach Undo-Kaskade abwarten
  await expect(page.locator('.page-break-spacer')).toHaveCount(0)
  await expect(page.locator('[data-view-mode="page-layout"]')).toHaveAttribute('data-page-count', '1')
})
```

### 3.12 Neu: Bild größer als eine Seite — Rundreise (Anforderung 5.2 Punkt 5, Grenzfall 3)

Export-/Media-Erhalt ist **heute lauffähig**; die konkrete Bild-Einfüge-Bedienung ist an die reale
`Toolbar.tsx` anzupassen (Feature „Bild einfügen"). Fokus hier auf Rundreise, nicht auf das (bewusst
akzeptierte) Überlaufverhalten.

```ts
import JSZip from 'jszip'

test('Bild größer als eine Seite: bleibt in der Rundreise vollständig erhalten', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  // ... großes Bild via Toolbar "Bild einfügen"/Drag&Drop einfügen (an reale Bedienung anpassen) ...
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const fs = await import('node:fs/promises')
  const zip = await JSZip.loadAsync(await fs.readFile((await (await downloadPromise).path())!))
  const mediaFiles = Object.keys(zip.files).filter((n) => n.startsWith('word/media/'))
  expect(mediaFiles.length).toBeGreaterThan(0)
})
```

### 3.13 Neu: `PageSheets` sind rein dekorativ (QA-Befund F)

Setzt `PageSheets` voraus (Abschnitt 0).

```ts
test('simulierte Seiten-Blätter sind rein dekorativ (kein Tab-Stop, keine Interaktion)', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()

  const sheetsLayer = page.locator('[data-view-mode="page-layout"] [aria-hidden="true"]').first()
  await expect(sheetsLayer).toHaveCSS('pointer-events', 'none')

  await page.getByTitle('Fett').focus()
  await page.keyboard.press('Tab')
  const focusedAriaHidden = await page.evaluate(() => document.activeElement?.getAttribute('aria-hidden'))
  expect(focusedAriaHidden).not.toBe('true') // Fokus landet nie auf einem aria-hidden-Blatt
})
```

---

## 4. Grenzfall-Testabdeckungs-Matrix (Anforderungsdatei Abschnitt 4)

| # | Grenzfall | Test(s) | Ebene |
|---|---|---|---|
| 1 | Kurzes Dokument | 3.2 (erster Test) | E2E Screenshot |
| 2 | Sehr langes Dokument (> 5 Seiten) | 3.2 (zweiter Test) | E2E Screenshot |
| 3 | Bild höher als eine Seite | 3.12 (Rundreise); Überlauf bereits als bewusstes Verhalten im Code kommentiert | E2E |
| 4 | Große Tabelle über Seitengrenze | analog 3.12 mit Tabellen-Fixture (gleiches Muster, nicht erneut ausformuliert) | E2E |
| 5 | Schmaler Viewport (Tablet/Mobile) | 3.3 | E2E |
| 6 | Farbschema-Wechsel | 3.4 | E2E Screenshot + Style-Assertion |
| 7 | Asynchron nachladendes Bild | **nicht abgedeckt** — außerhalb Kern-Scope (`-code.md` Abschnitt 5), kein Testfall in Anforderung 6 gefordert; offene Restlücke, Abschnitt 6 | — |
| 8 | Fenster-Resize ohne Bearbeitung | 3.5 | E2E |
| 9 | Tippen an automatischer Umbruchstelle | 3.6 (inkl. Rundreise, R1-kritisch) | E2E |
| 10 | Undo nach seitenauslösender Aktion | 3.11 | E2E |
| 11 | Leeres Dokument | 3.1 (erster Test) + bestehende Unit-Tests (`computePageCount([], …) = 1`) | Unit + E2E |
| 12 | Abweichendes Ursprungsformat | Dokumentationspflicht; optionaler Unit-Test: Import mit Nicht-A4-`w:pgSz` **crasht nicht** (Reader ignoriert es bewusst), siehe Empfehlung Abschnitt 5 | Unit (optional) |
| 13 | Kopf-/Fußzeile vorhanden, aber unsichtbar | 3.10 + bestehender Header/Footer-Rundtrip (2.1) | Unit + E2E |
| 14 | Manueller Seitenumbruch trifft auto. Paginierung | Cross-Referenz `seitenumbruch-req.md`, hier keine Duplikate | — |
| 15 | Unverändert hochladen/exportieren/reimportieren | 3.8, 2.4 | Unit + E2E |

---

## 5. Freigabekriterien-Checkliste (Testebene)

- [ ] **Ist-Stand-Abgleich (Abschnitt 0) durchgeführt:** jeder als „blockiert" markierte Test ist entweder
      nach Umsetzung des `-code.md`-Plans grün **oder** ausdrücklich als „blockiert (Feature nicht
      implementiert)" berichtet — nie stillschweigend „übersprungen"/„grün".
- [ ] Abschnitt 2 (Unit) grün, insbesondere: 2.3 (setzt `paginationKey`-Export voraus → bei fehlendem
      Export als **blockiert**, nicht **übersprungen**), 2.6 (Fixture-Sanity vor E2E-Verlass), 2.7
      (ODT-Geometrie-Pin — schließt die reale Lücke gegenüber dem vorhandenen DOCX-`pageSetup.test.ts`).
- [ ] Abschnitt 3 (E2E) grün auf `Desktop Chrome`; 3.3 zusätzlich auf `Tablet`/`Mobile` mit
      dokumentiertem Scroll-Verhalten (Annotation aus 3.3 wird in `-req.md` Element 9 nachgetragen).
- [ ] **Determinismus (Abschnitt 1) in jedem E2E-Test tatsächlich angewandt:** R1 (waitForTimeout(50) nach
      Cursor-Moves), R2 (`{ delay: 5 }` beim Bulk-Tippen), R3 (`waitForPaginationStable` vor jeder
      page-count-/Spacer-/Screenshot-Assertion), keine Tautologie-Sync-Punkte (R3), keine
      `toBeVisible()`-Prüfung auf `.page-break-spacer` (R4). Bei drei Wiederholungsläufen (`--repeat-each=3`)
      auf allen drei Projekten null Flakes.
- [ ] Screenshot-Baselines (3.2, 3.4) im CI-Container erzeugt (R5) und manuell sichtgeprüft, dass sie
      „mehrere getrennte Blätter" statt „ein Streifenmuster" zeigen (ein Screenshot-Test prüft nur gegen
      sich selbst, nicht ob das Referenzbild „richtig aussieht").
- [ ] Grenzfall-Matrix (Abschnitt 4) — jede Zeile einzeln befundet (grün / bewusst dokumentierte
      Einschränkung / offene Restlücke), keine Zeile stillschweigend offen.
- [ ] 3.4/3.2: **Dev-Empfehlung umgesetzt oder Selektor angepasst** — `PageSheets` erhält ein stabiles
      `data-page-sheet`-Attribut je Blatt (sonst ist die Blatt-Farbwert-/Screenshot-Prüfung brüchig).
- [ ] 3.10 (Header/Footer): konkreter Header-Text der Fixture ausgelesen und die auskommentierte
      Negativ-Sichtbarkeits-Assertion mit echtem Marker aktiviert.
- [ ] Alle in Abschnitt 0 (QA-Befund A–H) benannten Lücken sind entweder in einen Test übernommen
      (A, B, C, E, F, G) oder explizit als nicht automatisierbares Restrisiko dokumentiert (D, H — Abschnitt 6).

---

## 6. Nicht automatisierbare Restrisiken (explizit dokumentiert, kein stiller Verzicht)

1. **Öffnen der Exportdatei in echtem Microsoft Word / LibreOffice Writer.** Kein Playwright-Test kann
   eine native Desktop-Anwendung starten und deren Rendering prüfen. Zu bestätigen ist dort visuell:
   (a) die exportierte Datei öffnet als **A4 mit 2,5-cm-Rändern** — nicht Words Locale-Default —, weil
   `w:pgSz`/`w:pgMar` bzw. `style:page-layout` **aktiv geschrieben** werden (Befund 4, **korrigiert**);
   auf Byte-Ebene ist das durch `docx/pageSetup.test.ts` (vorhanden) und den neuen ODT-Pin (2.7) bereits
   automatisiert belegt, offen bleibt nur die visuelle native-App-Bestätigung. (b) Ein Dokument mit
   **abweichendem** Ursprungsformat (US Letter/Legal) wird beim Reimport→Export **nach A4/25 mm
   normalisiert** (Reader liest die Originalgeometrie nie) — das ist der dokumentationspflichtige
   Seitenformat-Informationsverlust (kein Textverlust). **QA-Hinweis:** die frühere Formulierung dieses
   Punkts („der *fehlende* w:pgSz/w:pgMar fällt auf Words Locale-Default zurück") war gegen den
   **aktuellen** Code überholt/falsch und ist hier korrigiert.
2. **Browser-Zoomstufen-Sub-Pixel-Rundung** (Anforderung Befund 7, `-code.md` 1.3). Playwright erlaubt
   `devicePixelRatio` nur beim Kontext-Start, nicht als Laufzeit-Trigger für ein `resize`-Event mit
   veränderten Schriftmetriken. Der Resize-Listener selbst ist durch 3.5 auf Crash-Freiheit/Konsistenz
   getestet; sein eigentlicher Auslöser (Zoom-Rundungsfehler) bleibt ungetestet — Restrisiko, kein Bug.
3. **Screenreader-Verhalten** von `PageSheets` über die einfache `aria-hidden`/Fokus-Prüfung (3.13) hinaus
   (tatsächliches NVDA/JAWS-Verhalten) — außerhalb des Werkzeugsatzes dieses Testplans.
4. **Visuelle „mehrere Blätter statt Streifen"-Wahrnehmung** (Element 2): automatisiert nur als
   Screenshot-Regression (3.2) absicherbar; ob die Baseline **selbst** die Sollwirkung zeigt, ist eine
   einmalige menschliche Sichtprüfung (Freigabekriterium Abschnitt 5).
