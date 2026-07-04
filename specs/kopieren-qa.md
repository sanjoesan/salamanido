# Testplan (QA): Feature „Kopieren“

Bezug: `E:\docs\specs\kopieren-req.md` (Anforderung), `E:\docs\specs\kopieren-code.md`
(Umsetzungsplan, Dateien/Codeänderungen). Dieser Testplan prüft **gegen den in
`kopieren-code.md` beschriebenen Soll-Zustand** — er ist so geschrieben, dass er
unmittelbar nach Umsetzung von `kopieren-code.md` Abschnitt 11 (Umsetzungsreihenfolge
Schritt 1–4) ausführbar ist, und dokumentiert an jeder Stelle, wo eine Testimplementierung
von einer noch offenen Entscheidung oder einem Blocker abhängt.

Grundprinzip (siehe Auftrag): Unit-Tests allein reichen nicht. Für jeden Testfall aus
`kopieren-req.md`, der eine tatsächliche Nutzerinteraktion beschreibt (Tastenkombination,
Klick, Drag, Datei-Upload, Datei-Export), muss ein **echter, im Browser laufender
Playwright-Test** existieren, der die Bedienoberfläche tatsächlich bedient (Klicks,
`page.keyboard.type`/`.press`, `input.setInputFiles`, `page.waitForEvent('download')`)
und die heruntergeladene Datei tatsächlich öffnet und inhaltlich prüft — nicht nur einen
internen ProseMirror-/Reader-/Writer-Funktionsaufruf aus einem Testskript heraus.

---

## 0. Testumgebung

| Ebene | Befehl | Runner | Ort |
|---|---|---|---|
| Unit/Modell | `npm test` (`vitest run`) | Vitest | `src/**/__tests__/*.test.ts` |
| E2E (echter Browser) | `npm run test:e2e` (`playwright test`) | Playwright, gegen `npm run build && npm run preview` (siehe `playwright.config.ts`) | `tests/e2e/*.spec.ts` |

Neue Playwright-Projekte (Voraussetzung: `kopieren-code.md` Abschnitt 3.7 ist umgesetzt),
zusätzlich zu den bestehenden drei (`Desktop Chrome`, `Mobile`, `Tablet`):

| Projekt | Engine | Scope | Zweck |
|---|---|---|---|
| `Desktop Safari (Clipboard)` | WebKit | nur `clipboard*.spec.ts` | Entscheidung 2.2 aus `kopieren-code.md` |
| `Desktop Firefox (Clipboard)` | Firefox | nur `clipboard*.spec.ts` | dito |

Alle Clipboard-E2E-Tests müssen auf **mindestens** `Desktop Chrome`, `Desktop Safari
(Clipboard)`, `Desktop Firefox (Clipboard)` grün sein; `Tablet` zusätzlich für die
Touch-spezifischen Fälle (Abschnitt 3.2, Testfall T-13). `Mobile` wird für Clipboard nicht
gesondert verlangt (Anforderung listet nur „Touch-Gerät“ als Tablet-Fall, `kopieren-req.md`
Abschnitt 1, Zeile 70).

`context.grantPermissions(['clipboard-read', 'clipboard-write'])` funktioniert laut
`kopieren-code.md` Abschnitt 2.2 nur unter Chromium. Deshalb zwei Testtechniken, konsequent
je Testfall vermerkt:

- **Technik A (In-Page-Tastatur-Rundlauf):** Auswählen → `ControlOrMeta+c` → Cursor an
  andere Stelle setzen (Klick) → `ControlOrMeta+v` → resultierenden DOM-Inhalt prüfen.
  Läuft auf **allen** Engines identisch, da echte Browser-Zwischenablage-Mechanik ohne
  Permissions-API genutzt wird.
- **Technik B (Rohzugriff via `navigator.clipboard.read()`):** nur für MIME-Typ-genaue
  Prüfungen (`text/html`-Rohinhalt, Multi-MIME-Nachweis), **nur auf `Desktop Chrome`**
  lauffähig, mit `test.skip(browserName !== 'chromium', …)` in den betroffenen Tests markiert.

---

## 1. Unit-Tests

### 1.1 `src/formats/shared/editor/__tests__/clipboard.test.ts` (neu)

Voraussetzung: `src/formats/shared/editor/clipboard.ts` existiert
(`kopieren-code.md` Abschnitt 3.2). Reine Node-Ebene, kein DOM, kein `EditorView` —
`clipboardTextSerializer(slice, view)` wird direkt mit von Hand gebauten
`wordSchema`-Knoten aufgerufen (`view`-Parameter wird von der aktuell entworfenen
Implementierung nicht verwendet, daher `undefined!`/`null as any` in Tests zulässig,
mit Kommentar, warum).

```ts
import { Slice, Fragment } from 'prosemirror-model'
import { wordSchema } from '../../schema'
import { clipboardTextSerializer } from '../clipboard'

function fullSlice(...nodes: import('prosemirror-model').Node[]) {
  return new Slice(Fragment.from(nodes), 0, 0)
}

function paragraph(text: string) {
  return wordSchema.nodes.paragraph.create({ align: 'left' }, text ? wordSchema.text(text) : null)
}

function cell(text: string, attrs: { colspan?: number; rowspan?: number } = {}) {
  return wordSchema.nodes.table_cell.create(
    { colspan: attrs.colspan ?? 1, rowspan: attrs.rowspan ?? 1 },
    paragraph(text),
  )
}

function row(...cells: import('prosemirror-model').Node[]) {
  return wordSchema.nodes.table_row.create(null, cells)
}

describe('clipboardTextSerializer', () => {
  it('serializes a 2x2 table as tab-separated cells, newline-separated rows', () => {
    const table = wordSchema.nodes.table.create(null, [row(cell('A1'), cell('B1')), row(cell('A2'), cell('B2'))])
    expect(clipboardTextSerializer(fullSlice(table), undefined as never)).toBe('A1\tB1\nA2\tB2')
  })

  it('serializes a bullet list with a "- " marker per item, not a paragraph chain', () => {
    const list = wordSchema.nodes.bullet_list.create(null, [
      wordSchema.nodes.list_item.create(null, paragraph('Eins')),
      wordSchema.nodes.list_item.create(null, paragraph('Zwei')),
      wordSchema.nodes.list_item.create(null, paragraph('Drei')),
    ])
    expect(clipboardTextSerializer(fullSlice(list), undefined as never)).toBe('- Eins\n- Zwei\n- Drei')
  })

  it('serializes an ordered list with a numeric marker honoring a non-default start', () => {
    const list = wordSchema.nodes.ordered_list.create({ start: 5 }, [
      wordSchema.nodes.list_item.create(null, paragraph('Fünf')),
      wordSchema.nodes.list_item.create(null, paragraph('Sechs')),
    ])
    expect(clipboardTextSerializer(fullSlice(list), undefined as never)).toBe('5. Fünf\n6. Sechs')
  })

  it('serializes a nested list with indentation and no lost items', () => {
    const inner = wordSchema.nodes.bullet_list.create(null, [wordSchema.nodes.list_item.create(null, paragraph('Unterpunkt'))])
    const outer = wordSchema.nodes.bullet_list.create(null, [
      wordSchema.nodes.list_item.create(null, [paragraph('Oberpunkt'), inner]),
    ])
    const text = clipboardTextSerializer(fullSlice(outer), undefined as never)
    expect(text).toContain('- Oberpunkt')
    expect(text).toContain('Unterpunkt')
    expect(text.indexOf('Unterpunkt')).toBeGreaterThan(text.indexOf('Oberpunkt'))
  })

  it('renders a hard_break as a single newline within a paragraph (regression, Befund A)', () => {
    const para = wordSchema.nodes.paragraph.create({ align: 'left' }, [
      wordSchema.text('Zeile1'),
      wordSchema.nodes.hard_break.create(),
      wordSchema.text('Zeile2'),
    ])
    const text = clipboardTextSerializer(fullSlice(para), undefined as never)
    // Exakter Wortvergleich, kein Substring-Check: schließt sowohl den ursprünglichen
    // Bug ("Zeile1Zeile2", spurloses Verschwinden) als auch ein falsches
    // Leerzeichen-Verhalten ("Zeile1 Zeile2") explizit aus.
    expect(text).toBe('Zeile1\nZeile2')
  })

  it('separates top-level blocks (heading, paragraph, list) with a blank line each', () => {
    const heading = wordSchema.nodes.heading.create({ level: 2, align: 'left' }, wordSchema.text('Titel'))
    const para = paragraph('Text.')
    const list = wordSchema.nodes.bullet_list.create(null, [wordSchema.nodes.list_item.create(null, paragraph('Eins'))])
    expect(clipboardTextSerializer(fullSlice(heading, para, list), undefined as never)).toBe('Titel\n\nText.\n\n- Eins')
  })

  it('returns an empty string for an empty slice without throwing', () => {
    expect(clipboardTextSerializer(new Slice(Fragment.empty, 0, 0), undefined as never)).toBe('')
  })

  it('flattens embedded newlines within a single table cell to spaces (no broken tab grid)', () => {
    const para = wordSchema.nodes.paragraph.create({ align: 'left' }, [
      wordSchema.text('Zeile A'),
      wordSchema.nodes.hard_break.create(),
      wordSchema.text('Zeile B'),
    ])
    const table = wordSchema.nodes.table.create(null, [
      row(wordSchema.nodes.table_cell.create({ colspan: 1, rowspan: 1 }, para), cell('B1')),
    ])
    expect(clipboardTextSerializer(fullSlice(table), undefined as never)).toBe('Zeile A Zeile B\tB1')
  })
})

describe('wordSchema.nodes.hard_break — leafText regression (Befund A)', () => {
  it('defines leafText so Fragment.textBetween no longer swallows the line break', () => {
    expect(wordSchema.nodes.hard_break.spec.leafText).toBeTypeOf('function')
    expect(wordSchema.nodes.hard_break.spec.leafText!(wordSchema.nodes.hard_break.create())).toBe('\n')
  })

  it('doc.textBetween keeps two hard_break-separated lines apart at the schema level', () => {
    const doc = wordSchema.nodes.doc.create(null, [
      wordSchema.nodes.paragraph.create({ align: 'left' }, [
        wordSchema.text('Zeile1'),
        wordSchema.nodes.hard_break.create(),
        wordSchema.text('Zeile2'),
      ]),
    ])
    expect(doc.textBetween(0, doc.content.size, '\n\n')).toBe('Zeile1\nZeile2')
  })
})
```

### 1.2 `src/formats/shared/editor/__tests__/clipboard-privacy.test.ts` (neu)

Statischer Vitest, kein DOM. Setzt `kopieren-req.md` Abschnitt 5, Grenzfall 15 automatisiert
um (ergänzt, nicht ersetzt, den manuellen Review-Punkt aus Abschnitt 4 unten):

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC_ROOT = join(__dirname, '..', '..', '..', '..')

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return collectSourceFiles(full)
    return /\.(ts|tsx)$/.test(entry) ? [full] : []
  })
}

describe('clipboard privacy invariant', () => {
  it('never calls navigator.clipboard anywhere under src/', () => {
    const offenders = collectSourceFiles(SRC_ROOT)
      .map((file) => ({ file, content: readFileSync(file, 'utf8') }))
      .filter(({ content }) => /navigator\s*\.\s*clipboard/.test(content))
    expect(offenders.map((o) => o.file)).toEqual([])
  })

  it('the clipboard module never logs, transmits, or persists its input', () => {
    const clipboardTs = readFileSync(join(SRC_ROOT, 'formats/shared/editor/clipboard.ts'), 'utf8')
    expect(clipboardTs).not.toMatch(/console\.(log|warn|error|info)/)
    expect(clipboardTs).not.toMatch(/\bfetch\s*\(/)
    expect(clipboardTs).not.toMatch(/localStorage|indexedDB/i)
  })
})
```

### 1.3 DOCX-Reader/Writer-Rundreise — Ergänzung in `src/formats/docx/__tests__/roundtrip.test.ts`

**Wichtig für das Verständnis dieses Abschnitts:** Kopieren/Einfügen **innerhalb** des
Editors erzeugt keinen eigenen Codepfad — es entstehen dieselben `wordSchema`-Knoten wie
bei getipptem Inhalt (`kopieren-code.md` Abschnitt 3.6). Ein Rundreise-Test „für Kopieren“
auf Reader/Writer-Ebene bedeutet deshalb: **exakt die Knotenstrukturen, die ein
Kopieren/Einfügen-Vorgang gemäß `kopieren-req.md` Abschnitt 2.2 erzeugen würde**, durch
`writeDocx`/`readDocx` schicken und prüfen, dass nichts verloren geht — unabhängig davon,
ob der Inhalt getippt oder eingefügt wurde. Das ist keine Doppelung des bestehenden
Rundreise-Tests, sondern gezielt die in Abschnitt 2.2/4 der Anforderung gelisteten
Merkmalskombinationen, die die bestehende Datei noch **nicht** einzeln abdeckt.

Neue `describe`-Blöcke, angehängt an die bestehende Datei (gleiche Helfer `doc()`,
`paragraph()`, `roundTrip()` wiederverwenden):

```ts
describe('DOCX round trip: content shape produced by copy/paste of a partially-bold word', () => {
  it('preserves a bold/non-bold boundary that falls mid-word', async () => {
    // Entspricht kopieren-req.md Abschnitt 2.2, Testfall 3: Selektion beginnt/endet
    // mitten in einer Formatierung — hier als bereits kopiertes/eingefügtes Ergebnis
    // modelliert (zwei Runs mit exakter Zeichengrenze).
    const original = doc([
      {
        type: 'paragraph',
        attrs: { align: 'left' },
        content: [
          { type: 'text', text: 'fe', marks: [{ type: 'strong' }] },
          { type: 'text', text: 'tt' },
        ],
      },
    ])
    const result = await roundTrip(original)
    const runs = (result.body as any).content[0].content
    expect(runs.map((r: any) => r.text).join('')).toBe('fett')
    expect(runs.find((r: any) => r.text === 'fe').marks).toEqual([{ type: 'strong' }])
    expect(runs.find((r: any) => r.text === 'tt').marks ?? []).toEqual([])
  })
})

describe('DOCX round trip: mixed-blocktype selection (heading + paragraph + list), as produced by copy/paste', () => {
  it('keeps heading, paragraph, and list distinct after a combined multi-block insert', async () => {
    // kopieren-req.md Abschnitt 2.2, Testfall 4 / Abschnitt 4, Testfall 3.
    const original = doc([
      { type: 'heading', attrs: { level: 2, align: 'left' }, content: [{ type: 'text', text: 'Abschnitt' }] },
      paragraph('Fließtext.'),
      {
        type: 'bullet_list',
        content: [{ type: 'list_item', content: [paragraph('Punkt A')] }, { type: 'list_item', content: [paragraph('Punkt B')] }],
      },
    ])
    const result = await roundTrip(original)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['heading', 'paragraph', 'bullet_list'])
  })
})

describe('DOCX round trip: whole-cell table selection (as produced by a CellSelection copy/paste)', () => {
  it('preserves a table pasted as a self-contained slice, including colspan', async () => {
    // kopieren-req.md Abschnitt 3, Testfall 2 / Abschnitt 5, Grenzfall 5.
    const original = doc([
      {
        type: 'table',
        content: [
          { type: 'table_row', content: [{ type: 'table_cell', attrs: { colspan: 2, rowspan: 1 }, content: [paragraph('Kopf')] }] },
          {
            type: 'table_row',
            content: [
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('A2')] },
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('B2')] },
            ],
          },
        ],
      },
    ])
    const result = await roundTrip(original)
    const table = (result.body as any).content[0]
    expect(table.content[0].content[0].attrs.colspan).toBe(2)
    expect(table.content[1].content).toHaveLength(2)
  })
})

describe('DOCX round trip: an inserted-standalone image (as produced by copy/paste of an image-only selection)', () => {
  it('keeps the image isolated with no adjacent text merged in', async () => {
    // kopieren-req.md Abschnitt 5, Grenzfall 6.
    const original: WordDocumentContent = {
      body: { type: 'doc', content: [paragraph('Davor'), { type: 'image', attrs: { src: TINY_PNG, alt: '' } }, paragraph('Danach')] },
      header: null,
      footer: null,
      meta: { title: '' },
    }
    const result = await roundTrip(original)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['paragraph', 'image', 'paragraph'])
  })
})
```

### 1.4 ODT-Reader/Writer-Rundreise — Ergänzung in `src/formats/odt/__tests__/roundtrip.test.ts`

Dieselben vier `describe`-Blöcke wie 1.3, 1:1 übertragen auf `writeOdt`/`readOdt` (Helfer
dort analog vorhanden, `expect(...).content[...]` Zugriffspfade identisch, da beide Reader
dasselbe `WordDocumentContent`-Modell erzeugen). Nicht wörtlich ausgeschrieben, um
Redundanz in diesem Dokument zu vermeiden — Auftrag an Umsetzung: Datei- und
Testnamensspiegelung 1:1 zu 1.3, mit `writeOdt`/`readOdt` statt `writeDocx`/`readDocx`.

### 1.5 Cross-Format-Rundreise auf Reader/Writer-Ebene (kein E2E nötig für diesen Teilaspekt)

Ergänzend zu den E2E-Rundreise-Tests (Abschnitt 3.3) — weil dies rein datenmodellseitig ist
und keine UI-Bedienung erfordert, ist das ein legitimer Unit-Test-Fall, kein Verstoß gegen
das „echte Browser-Tests“-Prinzip: **neue Datei**
`src/formats/shared/__tests__/cross-format-clipboard-content.test.ts`, die denselben
`WordDocumentContent` einmal durch `writeDocx`→`readDocx` und einmal durch
`writeOdt`→`readOdt` schickt und beide Ergebnisse auf inhaltliche Gleichheit (Text, keine
Verluste) statt Byte-Gleichheit prüft — Nachweis für `kopieren-req.md` Abschnitt 4,
Testfälle 4/5 auf Datenebene, unabhängig vom in Abschnitt 3.3/Abschnitt 4 dieses Dokuments
beschriebenen UI-seitigen Blocker (fehlende Format-Wahl beim Export).

```ts
import { writeDocx } from '../../docx/writer'
import { readDocx } from '../../docx/reader'
import { writeOdt } from '../../odt/writer'
import { readOdt } from '../../odt/reader'
import type { WordDocumentContent } from '../documentModel'

function extractText(content: WordDocumentContent): string {
  const walk = (node: any): string =>
    node.type === 'text' ? node.text : (node.content ?? []).map(walk).join('')
  return walk(content.body)
}

describe('cross-format content parity (DOCX vs. ODT) for a copy/paste-shaped document', () => {
  it('yields the same extracted text through either format for heading+bold+list+table+image', async () => {
    const original: WordDocumentContent = {
      body: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1, align: 'left' }, content: [{ type: 'text', text: 'Bericht' }] },
          {
            type: 'paragraph',
            attrs: { align: 'left' },
            content: [{ type: 'text', text: 'fett', marks: [{ type: 'strong' }] }, { type: 'text', text: ' Text.' }],
          },
          { type: 'bullet_list', content: [{ type: 'list_item', content: [{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'Punkt' }] }] }] },
        ],
      },
      header: null,
      footer: null,
      meta: { title: '' },
    }
    const viaDocx = await readDocx(await writeDocx(original))
    const viaOdt = await readOdt(await writeOdt(original))
    expect(extractText(viaDocx)).toBe(extractText(viaOdt))
    expect(extractText(viaDocx)).toBe('BerichtfettText.Punkt'.replace('Textfett', 'fettText'))
  })
})
```
*(Der letzte `expect`-String dient nur der Illustration des Vergleichsprinzips und ist bei
Umsetzung an die tatsächliche `extractText`-Verkettung anzupassen — entscheidend ist der
Gleichheits-Assert zwischen `viaDocx` und `viaOdt`, nicht der exakte String.)*

---

## 2. E2E-Tests — echte Playwright-Browserbedienung

Grundsatz für diesen gesamten Abschnitt: **kein** `page.evaluate(() => editorView.dispatch(...))`
und **kein** direkter Aufruf einer internen Funktion aus dem Testskript, um „Kopieren“
nachzustellen. Jeder Testfall führt echte `page.keyboard`/`page.mouse`/`locator.click`-
Aktionen aus und liest das Ergebnis aus dem sichtbaren DOM, der System-/Browser-
Zwischenablage oder — für Rundreise-Fälle — aus der tatsächlich heruntergeladenen Datei.

### 2.1 `tests/e2e/clipboard.spec.ts` (neu)

Gemeinsamer Prolog (Konventionen aus `odt.spec.ts`/`selection-regression.spec.ts`
übernommen: `odtCard`-Helper, `.ProseMirror`-Locator, `getByTitle`-Buttons):

```ts
import { test, expect } from '@playwright/test'

function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

test.describe('Kopieren (Zwischenablage)', () => {
  test.beforeEach(async ({ page, browserName }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    if (browserName === 'chromium') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    }
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  // ... Testfälle T-1 bis T-15, siehe unten
})
```

| ID | Testfall | Bezug `kopieren-req.md` | Kerntechnik |
|---|---|---|---|
| T-1 | Text markieren, `ControlOrMeta+c`, Cursor an andere Stelle, `ControlOrMeta+v` → identischer Inhalt kommt an | Abschnitt 1, Testfall 1/2 | Technik A |
| T-2 | Zuerst Text A kopieren; danach Cursor **ohne Selektion** setzen, `ControlOrMeta+c` erneut drücken; danach einfügen → weiterhin Text A (bisheriger Zwischenablageninhalt unverändert) | Abschnitt 5, Grenzfall 1 | Technik A |
| T-3 | Synthetisches `contextmenu`-Event auf `.ProseMirror` dispatchen → `event.defaultPrevented === false` | Abschnitt 1, Testfall 4; Grenzfall 13 | `locator.evaluate` (DOM-Event, kein Interna-Aufruf) |
| T-4 | Fett + Textfarbe + Hervorhebung auf denselben Textlauf anwenden, kopieren, an neuer Stelle einfügen → alle drei Formate im eingefügten Text vorhanden (`getComputedStyle` oder `innerHTML`-Check auf `<strong>`, `color:`, `background-color:`) | Abschnitt 2.2, Testfall 2 | Technik A |
| T-5 | In einem fett gesetzten Wort nur die zweite Hälfte markieren (`Shift+ArrowLeft` von hinten), kopieren, einfügen → eingefügter Text ist **nicht** fett | Abschnitt 2.2, Testfall 3 | Technik A |
| T-6 | Überschrift + Absatz + Liste markieren (`ControlOrMeta+a` in einem entsprechend aufgebauten Dokument), kopieren, in neues leeres Dokument einfügen → `h2`, `p`, `ul>li` alle vorhanden | Abschnitt 2.2, Testfall 4 | Technik A |
| T-7 | Tabelle einfügen, zwei ganze Zellen per `page.mouse.down/move/up` markieren (Drag über Zellgrenze), kopieren, außerhalb der Tabelle einfügen → eingefügtes Ergebnis enthält `table > tr > td` | Abschnitt 3, Testfall 2; Entscheidung 2.3 | Technik A + Maus-Drag |
| T-8 | Nur Text **innerhalb einer** Zelle markieren (Klick+Drag ohne Zellgrenze zu verlassen), kopieren, außerhalb einfügen → eingefügtes Ergebnis ist reiner Text, **keine** neue `<table>` | Grenzfall 5; Entscheidung 2.3 | Technik A + Maus-Drag (Gegenprobe zu T-7) |
| T-9 | Bild einfügen, Bild allein anklicken (Node-Selection), kopieren, an anderer Stelle einfügen → eingefügtes Ergebnis enthält **nur** ein `<img>`, keinen umgebenden Text | Grenzfall 6 | Technik A |
| T-10 | Text tippen (= Änderung), `ControlOrMeta+a`, kopieren (keine Änderung), `ControlOrMeta+z` einmal → Editor ist leer (Undo betraf das Tippen, nicht „Kopieren“) | Abschnitt 3, Testfall 3 | Technik A |
| T-11 | Vier verschiedene Wörter nacheinander schnell markieren+kopieren (`for`-Schleife ohne Wartezeit), danach einfügen → nur das **letzte** kopierte Wort kommt an | Grenzfall 12 | Technik A |
| T-12 | Verstecktes `<input type="file">` fokussieren (`page.locator('input[type=file]').focus()`), `ControlOrMeta+c` drücken, `page.on('pageerror', ...)`-Listener registriert → keine Exception; Editor-Inhalt landet nicht in einer parallel geöffneten `<textarea>`-Testfläche | Abschnitt 3, Testfall 4 | Technik A |
| T-13 | `Tablet`-Projekt: Text per Touch-Drag (`page.touchscreen` bzw. `locator.tap` + Drag) selektieren, `ControlOrMeta+c`/`v` → Rundlauf erfolgreich. **Kommentar im Test:** natives mobiles Kontextmenü selbst ist nicht automatisierbar, dieser Test deckt nur die Tastatur-/Zwischenablage-Mechanik unter Touch-Emulation ab | Abschnitt 1, Testfall 5 | Technik A, Projekt `Tablet` |
| T-14 | Tabelle/Liste kopieren, in ein zusätzliches natives `<textarea>` einfügen (per `page.evaluate` einmalig ins DOM injiziert, **nicht** um Kopieren zu simulieren, sondern als unabhängiges Klartext-Ziel) → Tab-/Zeilenstruktur entspricht 1.1 (`A1\tB1\nA2\tB2` bzw. `- Eins\n- Zwei`) | Abschnitt 6, Zeile 6 | Technik A |
| T-15 | *(Nur `Desktop Chrome`)* `navigator.clipboard.read()` nach Kopieren mit Formatierung → mindestens `text/html` und `text/plain` als Typen vorhanden | Abschnitt 2.1 | Technik B, `test.skip(browserName !== 'chromium', 'clipboard.read() ist Chromium-spezifisch')` |

Beispielhafte Umsetzung von T-7/T-8 (Zellauswahl vs. Textauswahl — der technisch
heikelste Fall, da ein reiner `locator.click()` nur eine `TextSelection` erzeugt und
`prosemirror-tables` eine `CellSelection` erst durch tatsächliches Ziehen über eine
Zellgrenze hochstuft):

```ts
test('copying two whole cells yields a table on paste; copying text inside one cell does not', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
  const cells = page.locator('.ProseMirror td')
  await cells.nth(0).click()
  await page.keyboard.type('A1')
  await cells.nth(1).click()
  await page.keyboard.type('B1')

  // T-7: Drag von der Mitte der ersten Zelle zur Mitte der zweiten Zelle → CellSelection.
  const box0 = (await cells.nth(0).boundingBox())!
  const box1 = (await cells.nth(1).boundingBox())!
  await page.mouse.move(box0.x + box0.width / 2, box0.y + box0.height / 2)
  await page.mouse.down()
  await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2, { steps: 5 })
  await page.mouse.up()
  await page.keyboard.press('ControlOrMeta+c')

  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.press('ControlOrMeta+v')
  await expect(page.locator('.ProseMirror p + table, .ProseMirror table ~ table')).toHaveCount(1)

  // T-8 (Gegenprobe): reine Textauswahl innerhalb einer einzelnen Zelle.
  await cells.nth(0).click()
  await page.keyboard.press('Home')
  await page.keyboard.press('Shift+ArrowRight')
  await page.keyboard.press('ControlOrMeta+c')
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.press('Enter')
  const tablesBefore = await page.locator('.ProseMirror table').count()
  await page.keyboard.press('ControlOrMeta+v')
  await expect(page.locator('.ProseMirror table')).toHaveCount(tablesBefore)
})
```

### 2.2 `tests/e2e/clipboard-roundtrip.spec.ts` (neu)

Struktur exakt wie `docx.spec.ts`/`odt.spec.ts`: Datei per `input.setInputFiles(...)` hochladen
(oder „Neu erstellen“ + Eingabe), im Editor bedienen, per `page.getByRole('button', { name:
'Exportieren' }).click()` exportieren, `page.waitForEvent('download')` abwarten, die
heruntergeladene Datei mit `fs.readFile` einlesen und mit `JSZip` öffnen, dann den
`document.xml`/`content.xml`-Inhalt tatsächlich auf die erwarteten Merkmale prüfen — **nicht**
nur den DOM-Zustand vor dem Export.

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}

test.describe('Kopieren + Datei-Rundreise', () => {
  test.beforeEach(async ({ page, browserName }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    if (browserName === 'chromium') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    }
  })

  test('R-1 (DOCX): copy/paste of a composed document, then export, then verify the downloaded file', async ({ page }) => {
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()

    // Ausgangsdokument mit Überschrift, formatiertem Absatz, Liste, Tabelle, Bild aufbauen.
    await page.keyboard.type('Bericht')
    await page.keyboard.press('ControlOrMeta+a')
    // Absatzformat auf Überschrift 1 setzen
    await page.getByLabel('Absatzformat').selectOption('1')
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await page.getByLabel('Absatzformat').selectOption('normal')
    await page.keyboard.type('Formatierter Text.')
    await page.keyboard.press('Home')
    await page.keyboard.press('Shift+ArrowRight', ) // erstes Zeichen markieren als stellvertretende Formatierung
    await page.getByTitle('Fett').click()

    // Alles markieren, kopieren, in ein zweites, neues leeres Dokument einfügen (kopieren-req.md Abschnitt 4, Testfall 3).
    await page.keyboard.press('ControlOrMeta+End')
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('ControlOrMeta+c')

    await page.getByRole('button', { name: '← Formate' }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    await page.locator('.ProseMirror').click()
    await page.keyboard.press('ControlOrMeta+v')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const documentXml = await zip.file('word/document.xml')!.async('text')

    expect(documentXml).toContain('Bericht')
    expect(documentXml).toContain('Formatierter Text.')
    expect(documentXml).toContain('<w:b/>')
    expect(documentXml).toMatch(/Heading1|w:pStyle/)
  })

  test('R-2 (ODT): same composed-document copy/paste, exported as ODT', async ({ page }) => {
    // Analog R-1, mit odtCard statt docxCard und content.xml statt word/document.xml.
    // Erwartungen: enthält Text, "font-weight:bold" bzw. äquivalentes ODT-Fett-Merkmal,
    // Überschrift als text:h.
  })

  test.fixme(
    'R-3 (Cross-Format DOCX→ODT): blocked — no export-format picker exists yet, see kopieren-code.md Abschnitt 0.4/9',
    async () => {},
  )

  test.fixme(
    'R-4 (Cross-Format ODT→DOCX): blocked, same reason as R-3',
    async () => {},
  )

  test.fixme(
    'R-5 (double cross-format round trip DOCX→ODT→DOCX): blocked, same reason as R-3',
    async () => {},
  )

  test('R-6: clipboard survives closing document A and opening a fresh document B', async ({ page }) => {
    // kopieren-req.md Abschnitt 4, Testfall 6 — die App zeigt jeweils ein aktives
    // Dokument; "zwei gleichzeitig geöffnete Dokumente" ist architektonisch nicht
    // vorgesehen (kopieren-code.md Abschnitt 6.3, Punkt 6). Getestet wird deshalb der
    // dokumentierte Ersatzweg: schließen + neu öffnen, Systemzwischenablage bleibt bestehen.
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    await page.locator('.ProseMirror').click()
    await page.keyboard.type('Inhalt aus Dokument A')
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('ControlOrMeta+c')

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: '← Formate' }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    await page.locator('.ProseMirror').click()
    await page.keyboard.press('ControlOrMeta+v')

    await expect(page.locator('.ProseMirror')).toContainText('Inhalt aus Dokument A')
  })
})
```

**Wichtiger Hinweis zur Umsetzung von R-1/R-2:** Der Toolbar hat keinen Undo/Redo-Button und
kein `insertHardBreak`-UI-Element außer `Shift-Enter` (voraussetzt `kopieren-code.md`
Abschnitt 3.3/3.4 ist umgesetzt) — ein vollständiger Testfall, der **jede** Zeile aus
`kopieren-req.md` Abschnitt 2.2 einzeln plus Datei-Rundreise abdeckt (Anforderung Abschnitt 4,
Testfall 7), sollte als **parametrisierte** Testreihe (`test.each`-Äquivalent über ein Array
von Merkmalsbeschreibungen) ausgebaut werden, nicht nur als das eine kombinierte
Testdokument oben — dieses Dokument zeigt das Gerüst, die vollständige Parametrisierung ist
Teil der Implementierung dieses Testplans, nicht separat hier auszuschreiben.

### 2.3 Erweiterung `tests/e2e/selection-regression.spec.ts`

Neuer, vierter Test im bestehenden `describe`-Block (Datei existiert bereits, siehe
Zitat unten) — Selection-Sync-Interferenz **mit Kopieren als auslösender Aktion** statt nur
Toolbar+Klick+Enter, exakt `kopieren-req.md` Abschnitt 3, Testfall 1:

```ts
test('select-all, bold, copy, click to reposition, and type — copying must not corrupt the selection sync', async ({
  page,
}) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')

  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()
  await page.keyboard.press('ControlOrMeta+c') // <- einziger Unterschied zum bestehenden Regressionstest

  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')

  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
})
```

Bewusst in dieser Datei (nicht in `clipboard.spec.ts`), weil sie der bereits etablierte Ort
für Selection-Sync-Regressionen ist (siehe bestehende drei Tests, Zeilen 14–71 der Datei).

---

## 3. Manuelle / ergänzende Prüfungen (kein automatisierter Test möglich)

| # | Prüfung | Bezug | Warum nicht automatisierbar |
|---|---|---|---|
| 1 | Datenschutz-Code-Review bei jedem PR, der `clipboard.ts` berührt: kein `console.log`/`fetch`/Analytics mit Zwischenablagen-Inhalt, kein `localStorage`/`IndexedDB` | `kopieren-req.md` Abschnitt 5, Grenzfall 15 | teilweise durch 1.2 automatisiert, aber Review bleibt zusätzlich verlangt (Wortlaut der Anforderung) |
| 2 | Cross-App-Test: aus Salamanido kopieren, in **echtes** Microsoft Word/LibreOffice Writer einfügen, Grundformatierung prüfen | Abschnitt 2.3, Testfälle 1–3 | Ziel ist eine echte, unabhängige Desktop-Anwendung außerhalb der Playwright-Browserinstanz |
| 3 | Echtes Safari (macOS-Hardware) und echtes Firefox (nicht nur Playwright-WebKit/Firefox-Emulation) | Abschnitt 5, Grenzfall 11 | Playwrights WebKit-Engine ist keine 1:1-Kopie von Apple Safari (siehe `kopieren-code.md` Abschnitt 9) |
| 4 | Kopieren während aktiver IME-Komposition (ostasiatische Eingabemethoden) | Abschnitt 5, Grenzfall 9 | Playwright kann IME-Komposition nicht zuverlässig systemnah auslösen |
| 5 | Sehr großes Bild (mehrere MB) in Selektion kopieren, UI-Einfrieren beobachten | Abschnitt 5, Grenzfall 7 | als Performance-Beobachtung sinnvoller manuell/mit Profiler statt als hartes Assert; ein grober automatisierter Zeitbudget-Test (`expect(duration).toBeLessThan(...)`) kann ergänzend in `clipboard.spec.ts` stehen, ersetzt die manuelle Beobachtung aber nicht vollständig |

---

## 4. Bekannte Blocker vor Testausführung

1. **Kein Code existiert noch.** Alle Tests in diesem Plan setzen voraus, dass
   `kopieren-code.md` Abschnitt 3 (insbesondere 3.1–3.4, 3.7) umgesetzt ist. Vor Umsetzung
   schlagen praktisch alle E2E-Testfälle fehl oder sind nicht sinnvoll aussagekräftig
   (z. B. T-14/1.1 ohne `clipboardTextSerializer`, T-6/R-1 ohne `Shift-Enter` für
   `hard_break`-Testfälle).
2. **Cross-Format-Export-UI fehlt** (`kopieren-code.md` Abschnitt 0.4): R-3/R-4/R-5 bleiben
   `test.fixme(...)`, bis `DocumentWorkspace.tsx` einen Export-Format-Wähler erhält — das ist
   kein Kopieren-spezifischer Blocker, sondern ein Übergabepunkt an `FEATURE-SPEC-DOCX-ODT.md`
   Abschnitt 1.3.
3. **Kein Toolbar-Button für Kopieren** (Entscheidung 2.1 in `kopieren-code.md`, bereits
   getroffen: „Nein“) — dieser Testplan enthält deshalb bewusst **keinen** Test, der einen
   Kopieren-Button anklickt; alle Auslöser sind Tastenkombination/Kontextmenü/Touch-Menü.
4. **Browsermatrix-Erweiterung** (`Desktop Safari (Clipboard)`, `Desktop Firefox (Clipboard)`)
   muss in `playwright.config.ts` existieren, bevor die entsprechenden Projekt-Filter in
   Testläufen (`--project="Desktop Safari (Clipboard)"`) greifen.

---

## 5. Traceability-Matrix (Anforderung → Test)

| `kopieren-req.md` | Testfall(e) hier |
|---|---|
| Abschnitt 1, Testfälle 1–5 | T-1, T-3, T-13 |
| Abschnitt 2.1 (leere Selektion, Multi-MIME) | T-2, T-15 |
| Abschnitt 2.2, Testfälle 1–4 | T-4, T-5, T-6; 1.3/1.4 (Reader/Writer) |
| Abschnitt 2.3, Testfälle 1–3 | Abschnitt 3, Manuelle Prüfung 2 |
| Abschnitt 3, Testfälle 1–4 | 2.3 (Selection-Sync), T-7/T-8, T-10, T-12 |
| Abschnitt 4, Testfälle 1–6 | R-1, R-2, R-3 (fixme), R-4 (fixme), R-5 (fixme), R-6; 1.5 (Cross-Format Datenebene) |
| Abschnitt 5, Grenzfälle 1–15 | T-2 (1), (Performance-Anmerkung) (2, 7), (5, Formatgrenze) T-5 (3), (4 dokumentiert, kein Test — Anforderung selbst verlangt nur „definiertes Verhalten dokumentieren“), T-8/T-7 (5), T-9 (6), (7 s. Abschnitt 3.5 dieses Plans), T-10 (8), Manuelle Prüfung 4 (9), — (10, s. u.), (11) Browsermatrix Abschnitt 0, T-11 (12), T-3 (13), — (14, zurückgestellt laut Anforderung selbst), 1.2/Manuelle Prüfung 1 (15) |
| Abschnitt 6 (Menü-/Bedienelement-Übersicht) | T-1 (Zeile 1/2), T-3 (Zeile 2), Abschnitt 4 Punkt 3 dieses Plans (Zeile 3, „kein Button“), T-13 (Zeile 4), T-15 (Zeile 5), T-14 (Zeile 6) |

Grenzfall 10 (Zwischenablage-Berechtigung vom Browser verweigert, z. B. Iframe-Kontext) ist
im aktuellen Deployment-Kontext (GitHub Pages, Top-Level-Navigation, kein Iframe) laut
`kopieren-req.md` selbst als zu klärende Randbedingung markiert, nicht als Pflichttestfall.
Empfehlung: **ein** zusätzlicher E2E-Test, der die Seite in einem `<iframe>` ohne
`allow="clipboard-write"` einbettet und prüft, dass ein `ControlOrMeta+c`-Versuch keine
unbehandelte Konsolen-Exception erzeugt — als T-16 nachzutragen, sobald geklärt ist, ob
dieses Szenario für die Produktion überhaupt relevant ist (aktuell kein Embed-Anwendungsfall
bekannt).

---

## 6. Abnahmekriterien für diesen Testplan

Der Testplan gilt als vollständig abgearbeitet, wenn:

1. Alle Tests aus Abschnitt 1 (1.1–1.5) existieren und grün sind (`npm test`).
2. Alle Tests aus Abschnitt 2 (2.1–2.3) existieren und auf `Desktop Chrome`, `Desktop Safari
   (Clipboard)`, `Desktop Firefox (Clipboard)` sowie (für die touch-spezifischen Fälle)
   `Tablet` grün sind (`npm run test:e2e`), mit Ausnahme der unter Abschnitt 4, Punkt 2
   dokumentierten `test.fixme`-Fälle.
3. Die Traceability-Matrix (Abschnitt 5) keine Lücke ohne Begründung zeigt.
4. Die manuellen Prüfungen aus Abschnitt 3 durchgeführt und ihr Ergebnis dokumentiert
   (nicht nur „ausstehend“) sind.
5. Rückmeldung an `kopieren-req.md` Abschnitt 8 (offene Fragen) erfolgt ist — dieser
   Testplan trifft dazu keine neuen Produktentscheidungen, sondern verweist auf die in
   `kopieren-code.md` Abschnitt 2 bereits getroffenen.

Erst danach darf der Backlog-Status von `kopieren` auf „verifiziert“ wechseln
(`kopieren-req.md` Abschnitt 8, Punkt 4).
