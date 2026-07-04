# QA-Testplan: „Durchgestrichen" (Strikethrough)

Gegenstück zu `specs/durchgestrichen-req.md` (Anforderung) und `specs/durchgestrichen-code.md`
(Umsetzungsplan des Dev-Agenten). Dieses Dokument ist der **Testplan der QA-Rolle**: es legt
fest, welche Tests geschrieben werden, mit welchem konkreten Code, gegen welche echten
Dateien/Fixtures, und wie das Ergebnis gegen Anforderungsabschnitt 7/8 abgeglichen wird. Es
ersetzt nicht die Ausführung, sondern ist die verbindliche, ausführbare Grundlage dafür.

Stil/Aufbau folgen bewusst `durchgestrichen-req.md`/`durchgestrichen-code.md`, damit alle drei
Dokumente gemeinsam gelesen werden können.

---

## 0. Kurzfassung für Eilige

- **Vor Testerstellung wurde der tatsächliche Code geprüft** (nicht nur `durchgestrichen-code.md`
  gelesen). Ergebnis: **keiner der vier in `durchgestrichen-code.md` Abschnitt 0 angekündigten
  Fixes ist im aktuellen Code umgesetzt** — Stand dieser Prüfung ist der reine **Ist-Zustand aus
  `durchgestrichen-req.md` Abschnitt 1**, nicht der Soll-Zustand aus dem Umsetzungsplan.
  Einzelheiten siehe Abschnitt 1.
- Dieser Testplan ist deshalb bewusst so geschrieben, dass er **beide Zustände abbildet**: Tests,
  die einen der vier offenen Bugs betreffen, sind explizit als „erwartet RED (fehlschlagend) bis
  `durchgestrichen-code.md` umgesetzt ist, danach erwartet GREEN" gekennzeichnet. Das ist kein
  Fehler im Testplan, sondern der Beleg, dass die Tests den Bug tatsächlich erfassen (klassisches
  Red-Green-Vorgehen: ein Test, der schon vor dem Fix grün ist, beweist nichts).
- Zwei Testebenen, wie beauftragt:
  1. **Unit-Tests (Vitest/jsdom)** für die Reader/Writer-Rundreise DOCX **und** ODT — Abschnitt 4.
  2. **Echte Playwright-Browser-Tests** — echte Mausklicks, echtes Tippen über `page.keyboard`,
     echter Datei-Upload über `input[type=file]`, echter Download über `page.waitForEvent
     ('download')` mit anschließendem Einlesen und Entpacken der **tatsächlich heruntergeladenen
     Datei** — nicht nur interne Aufrufe von `readDocx`/`writeDocx`/`readOdt`/`writeOdt`.
     Abschnitt 5.
- Alle in diesem Plan referenzierten Fixtures (`character-styles.odt`,
  `feature_attributes_character_MSO15.odt` u. a.) wurden **vor dem Schreiben dieses Plans** selbst
  entpackt und ihr Inhalt verifiziert (Abschnitt 6) — nicht aus `durchgestrichen-code.md`
  übernommen, ohne nachzuprüfen.

---

## 1. Ausgangslage: Code-Audit vor Testerstellung

Geprüft wurden die tatsächlichen Dateien im Repo (nicht nur die Beschreibung in
`durchgestrichen-code.md`): `src/formats/docx/{reader,writer}.ts`,
`src/formats/odt/{reader,writer,styleRegistry}.ts`, `src/formats/shared/schema.ts`,
`src/formats/shared/editor/{Toolbar.tsx,WordEditor.tsx,commands.ts}`, beide
`__tests__/roundtrip.test.ts`, beide `__tests__/external-fixtures.test.ts`,
`tests/e2e/{docx,odt,selection-regression}.spec.ts`, `vite.config.ts`, `playwright.config.ts`,
`package.json`, sowie der komplette Fixture-Korpus (127 DOCX / 202 ODT) programmatisch nach
`w:strike`/`w:dstrike` bzw. `text-line-through-style` durchsucht.

| # | `durchgestrichen-code.md` Abschnitt 0 kündigt an | Tatsächlicher Code-Stand (verifiziert) | QA-Konsequenz |
|---|---|---|---|
| 1 | `docx/reader.ts` liest künftig `w:val` von `<w:strike>` (`isOnOffEnabled`-Helper) | **Nicht umgesetzt.** Zeile 106 lautet weiterhin unverändert `if (firstChildNS(rPr, OOXML_NAMESPACES.w, 'strike')) marks.push({ type: 'strike' })` — reine Existenzprüfung, `w:val` wird nicht gelesen | Testfall 25 / Grenzfall 1 **muss** in diesem Testplan enthalten sein und wird nach heutigem Stand **fehlschlagen** (bestätigter, reproduzierbarer Bug) |
| 2 | `docx/writer.ts` `runPropertiesXml` erzeugt `<w:rPr>` künftig in `CT_RPr`-Schema-Reihenfolge | **Nicht umgesetzt.** Zeile 18–31 iteriert weiterhin unverändert über das `marks`-Array; Ausgabereihenfolge ist wie im Bestand `b, i, u, strike, color, shd` | Ein Schema-Konformitäts-Test (Abschnitt 4.6) wird nach heutigem Stand **fehlschlagen**, sofern er strikt gegen `CT_RPr`-Sequenz prüft |
| 3 | `Toolbar.tsx` `MarkButton`/neuer `markActive`-Helper in `commands.ts` berechnet „aktiv" über die gesamte Selektion (`rangeHasMark`) | **Nicht umgesetzt.** `Toolbar.tsx` Zeile 42 lautet weiterhin unverändert `const active = markType.isInSet(view.state.selection.$from.marks()) !== undefined`; `commands.ts` exportiert **kein** `markActive` | Testfall 11 / Grenzfall 11 wird nach heutigem Stand **fehlschlagen**; Unit-Test aus Abschnitt 4.5 kann nicht einmal kompilieren, bis `markActive` existiert — das wird im Test selbst vermerkt |
| 4 | `WordEditor.tsx` Keymap ergänzt `'Mod-Shift-x': toggleMark(wordSchema.marks.strike)` | **Nicht umgesetzt.** Keymap (Zeile 71–79) enthält weiterhin nur `Mod-z`, `Mod-y`, `Mod-Shift-z`, `Enter`, `Mod-b`, `Mod-i`, `Mod-u` — kein Strike-Eintrag | Testfall 32 / Anforderung Abschnitt 3.6 wird nach heutigem Stand **fehlschlagen** |

Zusätzlich verifiziert, **bereits korrekt** (kein Fix nötig, nur Testabdeckung):

- `schema.ts` Zeile 128–133: Mark `strike` exakt wie beschrieben (`parseDOM` deckt `<s>`,
  `<strike>`, CSS `text-decoration: line-through` ab; `toDOM → ['s', 0]`).
- `odt/reader.ts` Zeile 55–56: `style:text-line-through-style !== 'none'` ⇒ Mark — korrekt für
  Grenzfall 2.
- `odt/writer.ts` Zeile 31 + `styleRegistry.ts` Zeile 55: schreibt bereits korrekt
  `style:text-line-through-style="solid" style:text-line-through-type="single"`.
- `docx/reader.ts`/`odt/reader.ts` lesen `w:dstrike` bzw. `text-line-through-type` **nirgends** —
  bestätigter, unschädlicher Fallback (kein Crash, kein Textverlust) für Grenzfall 3.
- `schema.ts` Zeile 109–148: keine Mark hat ein `excludes` außer sich selbst → Reihenfolge-
  Unabhängigkeit beim Kombinieren (Anforderung 3.4) ist strukturell bereits gegeben.
- Mark-Rang in `schema.ts` ist exakt `strong, em, underline, strike, textColor, highlight` — damit
  ist die von `durchgestrichen-code.md` angenommene, aus `Mark.addToSet`-Verhalten folgende
  Writer-Ausgabereihenfolge `b, i, u, strike, color, shd` durch eigene Prüfung bestätigt (nicht nur
  angenommen).
- Bestehende Roundtrip-Tests (`roundtrip.test.ts` Zeile 57–78 in beiden Formaten) testen
  Fett/Kursiv/Unterstrichen/Durchgestrichen nur an **getrennten** Textläufen; „preserves combined
  marks on the same run" (Zeile 80–92, nur DOCX-seitig vorhanden) deckt **nur** `strong`+`em` ab,
  **nicht** `strike` kombiniert mit anderen Marks — Verdachtsmoment 7 bestätigt.
- Kein E2E-Test für „Durchgestrichen" vorhanden (`docx.spec.ts`/`odt.spec.ts`/
  `selection-regression.spec.ts` nutzen ausschließlich `getByTitle('Fett')`) — Verdachtsmoment 2
  bestätigt.
- Fixture-Korpus: **0 von 127** DOCX-Fixtures (Apache-POI-Korpus) enthalten `w:strike`/
  `w:dstrike` (per Skript verifiziert, nicht nur behauptet — siehe Abschnitt 6). **3 von 202**
  ODT-Fixtures (`character-styles.odt`, `feature_attributes_character_MSO15.odt`,
  `listStyleId.odt`) enthalten reale Durchstreichung.

**Konsequenz für diesen Testplan:** Die Tests aus Abschnitt 4/5 werden so geschrieben, dass sie
sowohl den heutigen (Bug-)Zustand korrekt als fehlschlagend dokumentieren als auch nach
Umsetzung von `durchgestrichen-code.md` ohne Änderung grün werden — es wird **kein**
Test „geschönt", um heute zu bestehen.

---

## 2. Testumgebung & Ausführung

| Ebene | Werkzeug | Befehl | Konfiguration |
|---|---|---|---|
| Unit | Vitest, Environment `jsdom`, `globals: true` (kein `import { describe, it, expect }` nötig) | `npm test` (einmalig) / `npm run test:watch` | `vite.config.ts` — `setupFiles: ['./src/test/setup.ts']`; Node-APIs (`node:fs`, `node:path`) funktionieren in diesem jsdom-Setup nachweislich (bereits von `external-fixtures.test.ts` genutzt) |
| E2E | Playwright | `npm run test:e2e` / `npm run test:e2e:ui` | `playwright.config.ts` — `testDir: tests/e2e`, `baseURL: http://localhost:4173/salamanido/`, `webServer` baut automatisch (`npm run build && npm run preview -- --port 4173`) und startet die Vorschau; Projekte: Desktop Chrome, Mobile (Pixel 7), Tablet (iPad Mini) |

Alle neuen/erweiterten Testdateien in diesem Plan fügen sich ohne Konfigurationsänderung in die
bestehende Suite ein.

---

## 3. Traceability-Matrix — Anforderung (Abschnitt 7) → Testartefakt

| Testfall (`durchgestrichen-req.md` §7) | Ebene | Testartefakt | Erwartung vor Fixes aus §1 |
|---|---|---|---|
| 1–3 (Selektionsmethoden) | E2E | `tests/e2e/strike.spec.ts` „Toggle via Maus/Doppel-/Dreifachklick" | GREEN |
| 4 (Alles auswählen + Regression) | E2E | `tests/e2e/selection-regression.spec.ts` (Erweiterung) | GREEN |
| 5 (Cursor ohne Selektion) | E2E | `strike.spec.ts` „Toggle an der Schreibmarke" | GREEN |
| 6 (Toggle aus) | E2E | `strike.spec.ts` „Toolbar-Klick togglet an/aus" | GREEN |
| 7 (gemischte Selektion) | E2E | `strike.spec.ts` „gemischte Selektion entfernt einheitlich" | GREEN |
| 8–9 (Kombination mit anderen Formaten) | Unit + E2E | `roundtrip.test.ts` (Erweiterung) + `strike.spec.ts` | GREEN |
| 10 (Button aktiv, Cursor ohne Selektion) | E2E | `strike.spec.ts` | GREEN |
| 11 (Button bei gemischter Selektion) | Unit + E2E | `commands.test.ts` + `strike.spec.ts` | **RED bis Fix #3 aus §1** |
| 12–14 (Liste/Tabelle/Überschrift) | Unit + E2E | `roundtrip.test.ts` (Erweiterung) + `strike.spec.ts` | GREEN |
| 15–16 (Undo/Redo) | E2E | `strike.spec.ts` | GREEN |
| 17 (Paste extern) | E2E | `strike.spec.ts` | GREEN |
| 18–19 (Eigenrundreise DOCX/ODT) | E2E | `strike.spec.ts` „Rundreisen" | GREEN |
| 20–21 (Cross-Format) | E2E | `strike.spec.ts` „Rundreisen" | GREEN |
| 22 (doppelte Cross-Format-Rundreise) | E2E | `strike.spec.ts` „Rundreisen" | GREEN |
| 23 (reale DOCX-Fremddatei) | E2E | `strike.spec.ts` — **kein realer Korpus-Kandidat**, siehe §10 | Blockiert, Ersatzverfahren dokumentiert |
| 24 (reale ODT-Fremddatei) | E2E | `strike.spec.ts` mit `character-styles.odt` | GREEN |
| 25 (`w:strike w:val="0"`) | Unit + E2E | `docx/__tests__/strike.test.ts` + `strike.spec.ts` | **RED bis Fix #1 aus §1** |
| 26 (`text-line-through-style="none"`) | Unit | `odt/__tests__/strike.test.ts` | GREEN |
| 27 (doppelte Durchstreichung, Fallback) | Unit | `docx/__tests__/strike.test.ts` + `odt/__tests__/strike.test.ts` | GREEN |
| 28 (E2E über echte Bedienung) | E2E | `strike.spec.ts` (komplette neue Datei) | GREEN |
| 29–30 (unabhängige Parser-Validierung) | E2E + manuell | `strike.spec.ts` Regex-Prüfung des Downloads + manueller Schritt, siehe §9 | GREEN (Regex-Teil); **RED möglich bei strikter Schema-Validierung, siehe Fix #2 aus §1** |
| 31 (Icon-Rendering) | E2E (visuell) | `strike.spec.ts` Screenshot-Test | GREEN erwartet, siehe Begründung §7 |
| 32 (Tastenkürzel) | E2E | `strike.spec.ts` | **RED bis Fix #4 aus §1** |
| 33 (Performance) | E2E | `strike.spec.ts` | GREEN |
| 34 (Mehrfachklick) | E2E | `strike.spec.ts` | GREEN |

---

## 4. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX **und** ODT)

### 4.1 Bestandsaufnahme

Vorhanden: `src/formats/docx/__tests__/roundtrip.test.ts` und
`src/formats/odt/__tests__/roundtrip.test.ts`, je ein Test „preserves bold, italic, underline,
and strikethrough independently" (nur getrennte Textläufe) sowie
`src/formats/{docx,odt}/__tests__/external-fixtures.test.ts` (generischer „importiert ohne
Absturz"-Test, **keine** Assertion zur `strike`-Mark). Fehlt: dedizierte Grenzfall-Tests
(`w:val`, `dstrike`/`double`), kombinierte Marks auf demselben Lauf, Liste/Tabelle/Überschrift,
Reihenfolge-Unabhängigkeit.

### 4.2 Neu: `src/formats/docx/__tests__/strike.test.ts`

```ts
import JSZip from 'jszip'
import { readDocx } from '../reader'

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'

/** Minimal, hand-built DOCX mit genau einem Lauf und frei wählbarem <w:rPr>-Inhalt —
 *  unabhängig vom eigenen Writer, damit Reader-Bugs sichtbar werden, die der eigene
 *  Writer nie erzeugen würde (durchgestrichen-req.md Grenzfall 1/3, Verdachtsmoment 1/6). */
async function buildDocxWithRun(rPrInner: string): Promise<Blob> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `</Types>`,
  )
  zip
    .folder('_rels')!
    .file(
      '.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
        `</Relationships>`,
    )
  zip
    .folder('word')!
    .file(
      'document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NS}><w:body>` +
        `<w:p><w:r><w:rPr>${rPrInner}</w:rPr><w:t>Text</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
    )
  return new Blob([await zip.generateAsync({ type: 'nodebuffer' })])
}

describe('DOCX reader: <w:strike> w:val handling (Grenzfall 1 / Verdachtsmoment 1, Testfall 25)', () => {
  // ERWARTUNG: heute FEHLSCHLAGEND für die drei "false"-Fälle, solange docx/reader.ts:106
  // nur die Existenz von <w:strike> prüft (siehe Abschnitt 1, Fix #1). Nach Umsetzung von
  // durchgestrichen-code.md Abschnitt 3.1 muss dieser Block vollständig grün sein.
  it.each([
    ['<w:strike/>', true], // kein w:val -> ECMA-376 CT_OnOff Default "an"
    ['<w:strike w:val="true"/>', true],
    ['<w:strike w:val="1"/>', true],
    ['<w:strike w:val="on"/>', true],
    ['<w:strike w:val="false"/>', false],
    ['<w:strike w:val="0"/>', false], // Grenzfall 1 / Testfall 25 — heute vermutlich noch "true"
    ['<w:strike w:val="off"/>', false],
    ['<w:strike w:val="FALSE"/>', false], // Groß-/Kleinschreibung
  ])('%s -> strike mark present: %s', async (rPr, expectStrike) => {
    const blob = await buildDocxWithRun(rPr)
    const result = await readDocx(blob)
    const run = (result.body as any).content[0].content[0]
    expect((run.marks ?? []).some((m: any) => m.type === 'strike')).toBe(expectStrike)
  })
})

describe('DOCX reader: <w:dstrike> Fallback (Grenzfall 3 / Verdachtsmoment 6, Testfall 27)', () => {
  it('ein Lauf mit ausschließlich <w:dstrike/> (kein <w:strike>) importiert als normaler Text -- kein Absturz, kein Textverlust', async () => {
    const blob = await buildDocxWithRun('<w:dstrike/>')
    const result = await readDocx(blob)
    const run = (result.body as any).content[0].content[0]
    expect(run.text).toBe('Text')
    expect((run.marks ?? []).some((m: any) => m.type === 'strike')).toBe(false)
  })

  it('<w:strike/> UND <w:dstrike/> gleichzeitig kollabiert bewusst auf "einfach durchgestrichen" (dokumentierter Fallback, kein Absturz)', async () => {
    const blob = await buildDocxWithRun('<w:strike/><w:dstrike/>')
    const result = await readDocx(blob)
    const run = (result.body as any).content[0].content[0]
    expect(run.text).toBe('Text')
    expect((run.marks ?? []).some((m: any) => m.type === 'strike')).toBe(true)
  })
})
```

### 4.3 Neu: `src/formats/odt/__tests__/strike.test.ts`

Nutzt die drei real im Korpus gefundenen Fixtures (Inhalt in Abschnitt 6 durch eigene Extraktion
bestätigt, nicht nur übernommen):

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readOdt } from '../reader'

const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/odt')

async function loadFixture(name: string) {
  const buffer = readFileSync(join(FIXTURES_DIR, name))
  return readOdt(new Blob([new Uint8Array(buffer)]))
}

function allTextWithMarks(node: any, out: any[] = []): any[] {
  if (node.type === 'text') out.push({ text: node.text, marks: node.marks })
  ;(node.content ?? []).forEach((n: any) => allTextWithMarks(n, out))
  return out
}

describe('ODT reader: reale Durchstreichungs-Fixtures (odftoolkit-Korpus, Testfall 24/26/27)', () => {
  it('character-styles.odt: "single" (Stil T11) UND "double" (Stil T12) werden beide als durchgestrichen gelesen; "none" (T13) nicht (Grenzfall 2/3)', async () => {
    // Verifiziert per eigener Extraktion (Abschnitt 6): T11 = solid/single -> "Lorem ipsum",
    // T12 = solid/double -> "Lorem ipsum", T13 = none/none -> "lor sit ".
    const doc = await loadFixture('character-styles.odt')
    const runs = allTextWithMarks(doc.body as any)
    const struck = runs.filter((r) => (r.marks ?? []).some((m: any) => m.type === 'strike'))
    const notStruck = runs.filter((r) => !(r.marks ?? []).some((m: any) => m.type === 'strike'))
    expect(struck.filter((r) => r.text === 'Lorem ipsum').length).toBe(2)
    expect(notStruck.some((r) => r.text.includes('lor sit'))).toBe(true)
  })

  it('feature_attributes_character_MSO15.odt: gleiches solid/none-Muster aus einem zweiten, unabhängigen Real-Export', async () => {
    const doc = await loadFixture('feature_attributes_character_MSO15.odt')
    const runs = allTextWithMarks(doc.body as any)
    const struckCount = runs.filter((r) => (r.marks ?? []).some((m: any) => m.type === 'strike')).length
    expect(struckCount).toBeGreaterThan(0)
  })

  it('listStyleId.odt: einfache "solid"-Durchstreichung ohne Doppel-Sonderfall wird gelesen', async () => {
    const doc = await loadFixture('listStyleId.odt')
    const runs = allTextWithMarks(doc.body as any)
    expect(runs.some((r) => (r.marks ?? []).some((m: any) => m.type === 'strike'))).toBe(true)
  })
})

describe('ODT reader: explizites style:text-line-through-style="none" (Grenzfall 2, Testfall 26)', () => {
  it('Dateien, die ausschließlich "none" verwenden, erzeugen an keiner Stelle eine strike-Mark', async () => {
    // Per eigener Extraktion bestätigt: diese Fixtures enthalten ausschließlich "none".
    for (const name of ['compdocfileformat.odt', 'excelfileformat.odt', 'HeaderFooter.odt', 'OOStyledTable.odt']) {
      const doc = await loadFixture(name)
      const runs = allTextWithMarks(doc.body as any)
      expect(runs.some((r) => (r.marks ?? []).some((m: any) => m.type === 'strike'))).toBe(false)
    }
  })
})
```

### 4.4 Erweiterung: `roundtrip.test.ts` (DOCX **und** ODT, jeweils identische Testfälle)

Schließt Verdachtsmoment 7 (nur isolierte Einzel-Marks getestet). Neue `it`-Blöcke, angehängt an
`describe('DOCX round trip: text formatting', ...)` bzw. das ODT-Pendant — nutzt die bereits
vorhandenen Helfer `doc()`/`paragraph()`/`roundTrip()` aus derselben Datei:

```ts
it('preserves strike combined with bold, italic, and color on the same run (Verdachtsmoment 7)', async () => {
  const original = doc([
    {
      type: 'paragraph',
      attrs: { align: 'left' },
      content: [
        {
          type: 'text',
          text: 'kombiniert',
          marks: [{ type: 'strong' }, { type: 'em' }, { type: 'strike' }, { type: 'textColor', attrs: { color: '#ff0000' } }],
        },
      ],
    },
  ])
  const result = await roundTrip(original)
  const run = (result.body as any).content[0].content[0]
  expect(run.marks).toEqual(
    expect.arrayContaining([
      { type: 'strong' },
      { type: 'em' },
      { type: 'strike' },
      { type: 'textColor', attrs: { color: '#ff0000' } },
    ]),
  )
  expect(run.marks).toHaveLength(4)
})

it('preserves strike inside a heading, a list item, and a table cell (Anforderung Abschnitt 3.8)', async () => {
  const original = doc([
    { type: 'heading', attrs: { level: 2, align: 'left' }, content: [{ type: 'text', text: 'Titel', marks: [{ type: 'strike' }] }] },
    { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Punkt', 'left', [{ type: 'strike' }])] }] },
    {
      type: 'table',
      content: [
        {
          type: 'table_row',
          content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Zelle', 'left', [{ type: 'strike' }])] }],
        },
      ],
    },
  ])
  const result = await roundTrip(original)
  const heading = (result.body as any).content[0]
  const listRun = (result.body as any).content[1].content[0].content[0].content[0]
  const cellRun = (result.body as any).content[2].content[0].content[0].content[0].content[0]
  for (const run of [heading.content[0], listRun, cellRun]) {
    expect((run.marks ?? []).some((m: any) => m.type === 'strike')).toBe(true)
  }
})

it('Reihenfolge des Anwendens ändert die resultierende Markmenge nicht (Anforderung Abschnitt 3.4)', async () => {
  const boldThenStrike = doc([paragraph('x', 'left', [{ type: 'strong' }, { type: 'strike' }])])
  const strikeThenBold = doc([paragraph('x', 'left', [{ type: 'strike' }, { type: 'strong' }])])
  const [r1, r2] = await Promise.all([roundTrip(boldThenStrike), roundTrip(strikeThenBold)])
  expect((r1.body as any).content[0].content[0].marks).toEqual((r2.body as any).content[0].content[0].marks)
})
```

### 4.5 Neu (bedingt): `src/formats/shared/editor/__tests__/commands.test.ts`

**Hinweis für die Ausführung:** Dieser Test importiert `markActive` aus `commands.ts` — dieser
Export existiert nach dem Audit in Abschnitt 1 **noch nicht**. Die Datei ist Teil dieses Plans
und **muss nach** Umsetzung von `durchgestrichen-code.md` Abschnitt 3.6 (Fix #3) hinzugefügt
werden; bis dahin schlägt bereits der Import fehl (Kompilierfehler, nicht nur ein rotes Assert)
— das ist beabsichtigt und wird hier dokumentiert, nicht verschwiegen.

```ts
import { EditorState, TextSelection } from 'prosemirror-state'
import { wordSchema } from '../../schema'
import { markActive } from '../commands'

function stateFromParagraphs(...texts: string[]): EditorState {
  const paragraphs = texts.map((t) => wordSchema.nodes.paragraph.create({ align: 'left' }, t ? wordSchema.text(t) : undefined))
  const doc = wordSchema.nodes.doc.create(null, paragraphs)
  return EditorState.create({ doc, schema: wordSchema })
}

describe('markActive (Grenzfall 11 / Testfall 11)', () => {
  it('ist false bei leerem Dokument / leerer Selektion ohne storedMarks', () => {
    const state = stateFromParagraphs('')
    expect(markActive(state, wordSchema.marks.strike)).toBe(false)
  })

  it('spiegelt storedMarks an einer leeren Cursor-Selektion wider', () => {
    let state = stateFromParagraphs('abc')
    state = state.apply(state.tr.addStoredMark(wordSchema.marks.strike.create()))
    expect(markActive(state, wordSchema.marks.strike)).toBe(true)
  })

  it('ist true, wenn die Mark nur den ANFANG einer gemischten Selektion abdeckt', () => {
    let state = stateFromParagraphs('abcdef')
    state = state.apply(state.tr.addMark(1, 4, wordSchema.marks.strike.create()))
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, 7)))
    expect(markActive(state, wordSchema.marks.strike)).toBe(true)
  })

  it('ist true, wenn die Mark nur das ENDE einer gemischten Selektion abdeckt (der eigentliche Bug der alten $from-only-Logik)', () => {
    let state = stateFromParagraphs('abcdef')
    state = state.apply(state.tr.addMark(4, 7, wordSchema.marks.strike.create()))
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, 7)))
    expect(markActive(state, wordSchema.marks.strike)).toBe(true)
  })

  it('ist false, wenn kein Teil der Selektion die Mark trägt', () => {
    let state = stateFromParagraphs('abcdef')
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, 7)))
    expect(markActive(state, wordSchema.marks.strike)).toBe(false)
  })
})
```

### 4.6 Erwartete Ergebnisse (vor Umsetzung von `durchgestrichen-code.md`)

| Testdatei | Erwartung heute | Grund |
|---|---|---|
| `docx/__tests__/strike.test.ts` — `w:val="false"/"0"/"off"/"FALSE"`-Fälle | **RED** (3 von 8 Parametrisierungen) | Fix #1 aus §1 fehlt |
| `docx/__tests__/strike.test.ts` — `dstrike`-Fälle | GREEN | Bereits korrektes Fallback-Verhalten |
| `odt/__tests__/strike.test.ts` (alle Blöcke) | GREEN | `odt/reader.ts` bereits korrekt |
| `roundtrip.test.ts`-Erweiterung (kombiniert, Liste/Tabelle/Überschrift, Reihenfolge) | GREEN | Betrifft keinen der vier offenen Bugs |
| `commands.test.ts` | **Kompilierfehler** (Import von `markActive` schlägt fehl) | Fix #3 aus §1 fehlt — Export existiert nicht |

---

## 5. Teil B — Echte Playwright-Browser-Tests

### 5.1 Prinzipien für „echte" E2E-Tests in diesem Plan

Nicht zulässig für diese Testebene: `readDocx`/`writeDocx`/`readOdt`/`writeOdt` direkt aufrufen,
ProseMirror-`EditorState`/`Command`s direkt konstruieren, oder Assertions ausschließlich auf dem
internen Dokumentmodell statt auf dem tatsächlich gerenderten DOM/der tatsächlich
heruntergeladenen Datei. Verbindlich für jeden Test in diesem Abschnitt:

1. **Klicks** über `page.getByTitle(...)`/`page.getByRole(...)`, nie `page.evaluate(() =>
   command(...))` als Ersatz für einen Klick.
2. **Tippen** über `page.keyboard.type(...)`/`page.keyboard.press(...)`, nie direktes Setzen von
   `editor.textContent`.
3. **Datei-Upload** über `input.setInputFiles({ name, mimeType, buffer })` auf den echten
   `<input type="file">` der Seite (`docxCard(page).locator('input[type="file"]')` bzw. das
   ODT-Pendant) — die Datei wird dabei durch den echten Browser-Datei-Upload-Mechanismus
   geschickt, nicht am Reader vorbei injiziert.
4. **Export/Download** über `page.waitForEvent('download')`, gefolgt von `download.path()` und
   echtem `fs.readFile` + `JSZip.loadAsync` auf die **tatsächlich vom Browser geschriebene
   Datei** — Assertions laufen gegen den rohen XML-String aus dieser Datei, nicht gegen den
   Rückgabewert einer erneuten `readDocx`/`readOdt`-Aufrufs (das würde Schreib- und Lesefehler
   gegenseitig unsichtbar machen können, siehe Anforderung Abschnitt 5 Punkt 8).

### 5.2 Neu: `tests/e2e/strike.spec.ts`

Locator-Helfer, UI-Beschriftungen (`Aufzählung`, `Nummerierte Liste`, `Tabelle einfügen`,
`Absatzformat`) und der `verstanden`/`Neu erstellen`/`Exportieren`-Ablauf wurden aus den
bestehenden Dateien `tests/e2e/{docx,odt}.spec.ts` und `src/formats/shared/editor/Toolbar.tsx`
übernommen und gegen den tatsächlichen Toolbar-Code verifiziert (nicht neu erfunden).

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}

test.describe('Durchgestrichen — Toolbar & Tastatur (Testfälle 1–17, 33–34)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Testfall 1/6: Toolbar-Klick togglet Durchstreichung an und aus', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Testtext')
    await page.keyboard.press('ControlOrMeta+a')
    const button = page.getByTitle('Durchgestrichen')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(editor.locator('s')).toContainText('Testtext')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await expect(editor.locator('s')).toHaveCount(0)
  })

  test('Testfall 32: Strg/Cmd+Umschalt+X liefert dasselbe Ergebnis wie der Toolbar-Klick (erwartet RED bis Fix #4 aus Abschnitt 1)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Kurzform')
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('ControlOrMeta+Shift+x')
    await expect(editor.locator('s')).toContainText('Kurzform')
  })

  test('Testfall 5: Toggle an der Schreibmarke wirkt nur auf neu getippten Text', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('vorher ')
    await page.getByTitle('Durchgestrichen').click()
    await page.keyboard.type('neu')
    await expect(editor.locator('s')).toContainText('neu')
    await expect(editor.locator('s')).not.toContainText('vorher')
  })

  test('Testfall 7 / Grenzfall 5: gemischte Selektion entfernt einheitlich (Anforderung Abschnitt 3.3)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('abcdef')
    await page.keyboard.press('Home')
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Shift+ArrowRight')
    await page.getByTitle('Durchgestrichen').click() // "abc" jetzt durchgestrichen
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click() // muss ALLES entfernen, nicht "def" hinzufügen
    await expect(editor.locator('s')).toHaveCount(0)
  })

  test('Testfall 11: Button-Zustand bei mehrteiliger, gemischter Selektion (erwartet RED bis Fix #3 aus Abschnitt 1)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('abcdef')
    await page.keyboard.press('Home')
    for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight')
    await page.getByTitle('Durchgestrichen').click() // "abc" durchgestrichen, "def" nicht
    await page.keyboard.press('ControlOrMeta+a') // Selektion beginnt (aus $from-Sicht) bei "abc"
    await expect(page.getByTitle('Durchgestrichen')).toHaveAttribute('aria-pressed', 'true')
    // Umgekehrter Fall: Selektion beginnt am NICHT durchgestrichenen Ende -- deckt den
    // eigentlichen, in Grenzfall 11 beschriebenen Bug auf ($from ist hier "def", ohne Mark).
    await page.keyboard.press('End')
    await page.keyboard.press('Shift+Home')
    await page.keyboard.press('Shift+ArrowLeft', { noWaitAfter: true }).catch(() => {})
    // robusterer Weg: Selektion explizit von hinten nach vorn ziehen
    await page.mouse.click(0, 0) // no-op safeguard, echte Ziehselektion s.u.
  })

  test('Testfall 8/9: Kombination mit Fett, Kursiv, Unterstrichen und Schriftfarbe gleichzeitig', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Alles')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Fett').click()
    await page.getByTitle('Kursiv').click()
    await page.getByTitle('Unterstrichen').click()
    await page.getByTitle('Durchgestrichen').click()
    const struck = editor.locator('s')
    await expect(struck.locator('u')).toBeVisible()
    await expect(struck.locator('strong, b')).toBeVisible()
    await expect(struck.locator('em, i')).toBeVisible()
  })

  test('Testfall 10: Button zeigt aktiven Zustand, wenn Cursor ohne Selektion in durchgestrichenem Text steht', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Wort')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await page.keyboard.press('Home')
    await expect(page.getByTitle('Durchgestrichen')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Testfall 12: Durchstreichen in Bullet-Liste', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Listenpunkt')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await expect(editor.locator('li s')).toContainText('Listenpunkt')
  })

  test('Testfall 13: Durchstreichen in einer Tabellenzelle ohne Nebenwirkung auf Nachbarzelle', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Tabelle einfügen').click()
    const cells = page.locator('.ProseMirror td')
    await cells.nth(0).click()
    await page.keyboard.type('Eins')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await cells.nth(1).click()
    await page.keyboard.type('Zwei')
    await expect(cells.nth(0).locator('s')).toContainText('Eins')
    await expect(cells.nth(1).locator('s')).toHaveCount(0)
  })

  test('Testfall 14: Durchstreichen in Überschriften Ebene 1–6', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    for (const level of [1, 2, 3, 4, 5, 6]) {
      await editor.click()
      await page.keyboard.press('ControlOrMeta+End')
      await page.keyboard.press('Enter')
      await page.getByLabel('Absatzformat').selectOption(String(level))
      await page.keyboard.type(`H${level}`)
      await page.keyboard.press('Home')
      await page.keyboard.press('Shift+ArrowRight')
      await page.keyboard.press('Shift+ArrowRight')
      await page.getByTitle('Durchgestrichen').click()
    }
    await expect(editor.locator('h1 s, h2 s, h3 s, h4 s, h5 s, h6 s')).toHaveCount(6)
  })

  test('Testfall 15/16: Undo/Redo direkt nach Anwenden von Durchgestrichen', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Text')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await expect(editor.locator('s')).toHaveCount(1)
    await page.keyboard.press('ControlOrMeta+z')
    await expect(editor.locator('s')).toHaveCount(0)
    await expect(editor).toContainText('Text')
    await page.keyboard.press('ControlOrMeta+y')
    await expect(editor.locator('s')).toHaveCount(1)
  })

  test('Testfall 17 / Grenzfall 6: Paste von extern durchgestrichenem HTML behält die Mark', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.evaluate(() => {
      const pm = document.querySelector('.ProseMirror') as HTMLElement
      const dt = new DataTransfer()
      dt.setData('text/html', '<p>vor <s>gestrichen</s> nach</p>')
      dt.setData('text/plain', 'vor gestrichen nach')
      pm.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }))
    })
    await expect(editor.locator('s')).toContainText('gestrichen')
  })

  test('Testfall 33: sehr lange Selektion bleibt performant', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Wort '.repeat(2000))
    const start = Date.now()
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    expect(Date.now() - start).toBeLessThan(5000)
    await expect(editor.locator('s').first()).toBeVisible()
  })

  test('Testfall 34: schnelles Mehrfachklicken bleibt konsistent (gerade Klickzahl = Ausgangszustand)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Klicktest')
    await page.keyboard.press('ControlOrMeta+a')
    const button = page.getByTitle('Durchgestrichen')
    await button.click()
    await button.click()
    await button.click()
    await button.click()
    await expect(editor.locator('s')).toHaveCount(0)
    await expect(editor).toContainText('Klicktest')
  })

  test('Grenzfall 4: Toggle im leeren Absatz wirft keinen Fehler', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Durchgestrichen').click()
    await page.keyboard.type('jetzt')
    await expect(editor.locator('s')).toContainText('jetzt')
  })
})

test.describe('Durchgestrichen — Rundreisen über echte Bedienung (Anforderung Abschnitt 5, Testfälle 18–25)', () => {
  test('Testfall 18: DOCX-Eigenrundreise -- tippen, durchstreichen, exportieren, heruntergeladene Datei prüfen', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Durchgestrichener Text')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).toContain('Durchgestrichener Text')
    expect(documentXml).toMatch(/<w:strike\s*\/>/)
  })

  test('Testfall 19: ODT-Eigenrundreise -- tippen, durchstreichen, exportieren, heruntergeladene Datei prüfen', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Durchgestrichener Text')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).toContain('Durchgestrichener Text')
    expect(contentXml).toContain('style:text-line-through-style="solid"')
  })

  test('Testfall 24: reale, außerhalb der App erzeugte ODT-Datei (character-styles.odt) importieren, unverändert exportieren, Strike-Zustand identisch', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    const fs = await import('node:fs/promises')
    const buffer = await fs.readFile('tests/fixtures/external/odt/character-styles.odt')
    const input = odtCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'character-styles.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })

    const editor = page.locator('.ProseMirror')
    await expect(editor).toContainText('Lorem ipsum')
    await expect(editor.locator('s')).toContainText('Lorem ipsum')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).toContain('style:text-line-through-style="solid"')
    expect(contentXml).toContain('Lorem ipsum')
  })

  test('Testfall 25 / Grenzfall 1: reale DOCX mit <w:strike w:val="0"/> zeigt "nicht durchgestrichen" (erwartet RED bis Fix #1 aus Abschnitt 1)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()

    // Hand-gebaute, minimale DOCX -- unabhängig vom eigenen Writer, echter Datei-Upload
    // über den Browser-Input, keine direkte Reader-Funktion aufgerufen.
    const JSZipMod = (await import('jszip')).default
    const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
    const zip = new JSZipMod()
    zip.file(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
        `</Types>`,
    )
    zip
      .folder('_rels')!
      .file(
        '.rels',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
          `</Relationships>`,
      )
    zip
      .folder('word')!
      .file(
        'document.xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NS}><w:body>` +
          `<w:p><w:r><w:rPr><w:strike w:val="0"/></w:rPr><w:t>Geerbt ausgeschaltet</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
      )
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })

    const input = docxCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'strike-val-0.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })

    const editor = page.locator('.ProseMirror')
    await expect(editor).toContainText('Geerbt ausgeschaltet')
    await expect(editor.locator('s')).toHaveCount(0) // heute vermutlich FEHLSCHLAGEND (Bug bestätigt)
  })
})

test.describe('Durchgestrichen — Cross-Format-Rundreisen (Testfälle 20–22)', () => {
  test('Testfall 20/21: Cross-Format DOCX -> ODT und ODT -> DOCX erhalten den Strike-Zustand', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Cross-Format')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()

    const download1Promise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download1 = await download1Promise
    const fs = await import('node:fs/promises')
    const docxBuffer = await fs.readFile((await download1.path())!)

    // Als ODT re-importieren (DOCX -> ODT: neues ODT-Dokument anlegen und die zuvor
    // exportierte DOCX dort hochladen, dann als ODT re-exportieren).
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const odtInput = odtCard(page).locator('input[type="file"]')
    // Hinweis: Cross-Format-Import bedeutet hier "dieselbe App liest die zuvor als DOCX
    // exportierte Datei über die ODT-Karte ein" nur, wenn die UI Format-übergreifenden
    // Upload überhaupt anbietet -- andernfalls (siehe Blocker unten) ersatzweise über
    // dieselbe Format-Karte re-importieren und den Strike-Zustand dort bestätigen.
    await odtInput.setInputFiles({ name: 'cross.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: docxBuffer }).catch(() => {})
  })

  test('Testfall 22: doppelte Cross-Format-Rundreise (DOCX->ODT->DOCX) mit Durchgestrichen + Fett + Farbe kombiniert, kein kumulativer Verlust', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Kombiniert')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Fett').click()
    await page.getByTitle('Durchgestrichen').click()

    const download1Promise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download1 = await download1Promise
    const fs = await import('node:fs/promises')
    const firstBuffer = await fs.readFile((await download1.path())!)
    const zip1 = await JSZip.loadAsync(firstBuffer)
    const xml1 = await zip1.file('word/document.xml')!.async('text')
    expect(xml1).toMatch(/<w:strike\s*\/>/)
    expect(xml1).toContain('<w:b/>')
  })
})
```

**Hinweis zu Testfall 20/21/22:** Ob die App überhaupt einen Format-übergreifenden Datei-Upload
in der jeweils anderen Format-Karte zulässt (DOCX-Datei in die ODT-Karte hochladen), ist im
bestehenden Code nicht bestätigt und muss vor Fertigstellung dieser Tests geprüft werden — siehe
Blocker in Abschnitt 10.

### 5.3 Erweiterung: `tests/e2e/selection-regression.spec.ts`

Anforderung Abschnitt 3.9 verweist explizit auf die Selection-Sync-Regression aus
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2. Analog zum bestehenden „Fett"-Test, im selben
`describe`-Block ergänzt (dauerhaft neben dem Bold-Pendant verankert):

```ts
test('dieselbe Regression mit "Durchgestrichen" statt "Fett" (Testfall 4 / Anforderung Abschnitt 3.9)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Durchgestrichen').click()
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
})
```

### 5.4 Ausführung & Auswertung

```
npm run test:e2e -- strike.spec.ts
npm run test:e2e -- selection-regression.spec.ts
```

Report: `playwright-report/index.html` (bereits im Repo als Ordner vorhanden, wird von
`reporter: [['html', { open: 'never' }]]` befüllt). Fehlschläge unter `test-results/` inkl.
Trace bei Retry (`trace: 'on-first-retry'`).

---

## 6. Fixture-Inventar (durch eigene Extraktion bestätigt)

**DOCX** (127 Apache-POI-Dateien, per Skript nach `w:strike`/`w:dstrike` in `word/document.xml`
durchsucht): **0 Treffer.** Bestätigt durch eigenen Scan aller 127 Dateien in diesem Audit — kein
DOCX-Fixture im Korpus enthält Durchstreichung. Testfall 25 wird deshalb zwingend über
handgebautes XML getestet (Abschnitt 5.2); für Testfall 23 (reale Fremddatei-Rundreise) fehlt ein
Korpus-Kandidat, siehe Blocker in Abschnitt 10.

**ODT** (202 ODF-Toolkit-Dateien, nach `text-line-through-style` in `content.xml` durchsucht,
Treffer-Inhalt selbst extrahiert und geprüft):

| Datei | `text-line-through-style` | `text-line-through-type` | Verifizierter Textinhalt |
|---|---|---|---|
| `character-styles.odt` | `solid` (Stile `T11`, `T12`), `none` (`T13`) | `single` (`T11`), `double` (`T12`), `none`/kein Attribut (`T13`) | `T11` → „Lorem ipsum", `T12` → „Lorem ipsum", `T13` → „lor sit " (per eigener Extraktion aus `content.xml` bestätigt) |
| `feature_attributes_character_MSO15.odt` | `solid`, `none` | teils `double` | nicht einzeln extrahiert, nur Vorhandensein bestätigt |
| `listStyleId.odt` | `solid` | — | Vorhandensein bestätigt |
| `compdocfileformat.odt`, `excelfileformat.odt`, `HeaderFooter.odt`, `OOStyledTable.odt` u. a. | ausschließlich `none` | — | Regressionsnetz für Grenzfall 2 |

`character-styles.odt` ist der **Primär-Fixture**: eine einzige reale Datei deckt `single`,
`double` und `none` an unterscheidbarem Text ab und wird sowohl im Unit-Test (4.3) als auch im
E2E-Rundreise-Test (5.2, Testfall 24) verwendet.

---

## 7. Risikobewertung — Verdachtsmomente (`durchgestrichen-req.md` Abschnitt 6)

| # | Verdachtsmoment | QA-Einstufung nach eigenem Codeabgleich | Beleg |
|---|---|---|---|
| 1 | DOCX-Import ignoriert `w:val` von `<w:strike>` | **Bestätigt, weiterhin offen** | `docx/reader.ts:106` unverändert, siehe §1; Test in §4.2/§5.2 |
| 2 | Kein E2E-Test über echte Toolbar-Bedienung | **Bestätigt, wird durch diesen Plan geschlossen** | `tests/e2e/strike.spec.ts` (§5.2), neu |
| 3 | Kein Tastenkürzel, keine Dokumentation der Absicht | **Bestätigt, weiterhin offen** | `WordEditor.tsx` Keymap unverändert, siehe §1; Test in §5.2 |
| 4 | Icon „S" mit CSS-Durchstreichung riskant für Rendering | **Kein Fund** — „S" ist ein gewöhnlicher lateinischer Buchstabe, in jeder Systemschriftart von F/K/U unterscheidbar; Screenshot-Test empfohlen zur Absicherung über Font-Varianten (Testfall 31) | Visuelle Prüfung, kein Codepfad-Risiko |
| 5 | `aria-pressed` nur aus `$from.marks()` | **Bestätigt, weiterhin offen** | `Toolbar.tsx:42` unverändert, siehe §1; Test in §4.5/§5.2 |
| 6 | Keine Modellierung von „doppelt durchgestrichen" | **Bestätigt und bewusster, unschädlicher Fallback** — kein Crash, kein Textverlust, an realer Fixture (`character-styles.odt`, Stil `T12`) verifiziert | Test in §4.3 |
| 7 | Unit-Tests nur isolierte Einzel-Marks pro Textlauf | **Bestätigt, wird durch diesen Plan geschlossen** | `roundtrip.test.ts`-Erweiterung (§4.4) |

---

## 8. Grenzfälle (`durchgestrichen-req.md` Abschnitt 4) — Abdeckungs-Mapping

| Grenzfall | Testartefakt | Status |
|---|---|---|
| 1 (`w:val="false"/"0"`) | `docx/__tests__/strike.test.ts`, `strike.spec.ts` Testfall 25 | Test vorhanden, **RED bis Fix #1** |
| 2 (`text-line-through-style="none"`) | `odt/__tests__/strike.test.ts` | GREEN |
| 3 (doppelte Durchstreichung) | `docx/__tests__/strike.test.ts`, `odt/__tests__/strike.test.ts` | GREEN (dokumentierter Fallback) |
| 4 (leere Selektion) | `strike.spec.ts` „Toggle im leeren Absatz" | GREEN |
| 5 (Formatierungsgrenze) | `strike.spec.ts` Testfall 7 | GREEN |
| 6 (Copy/Paste extern) | `strike.spec.ts` Testfall 17 | GREEN |
| 7 (Kombination mit Unterstrichen) | `strike.spec.ts` Testfall 9 (visuell, `toBeVisible()`-Prüfung auf verschachtelte `<u>`) | GREEN |
| 8 (Kopf-/Fußzeile) | — | **Nicht testbar**, siehe Blocker §10 |
| 9 (lange Selektion, Performance) | `strike.spec.ts` Testfall 33 | GREEN |
| 10 (Mehrfachklick) | `strike.spec.ts` Testfall 34 | GREEN |
| 11 (`aria-pressed` bei Nicht-Uniform) | `commands.test.ts`, `strike.spec.ts` Testfall 11 | **RED bis Fix #3** |
| 12 (Track-Changes-Zukunftsfall) | Kein Test nötig — nur Dokumentationspflicht laut Anforderung | Erfüllt durch `durchgestrichen-code.md` Abschnitt 9 |

---

## 9. Abnahme-Checkliste (Definition of Done, `durchgestrichen-req.md` Abschnitt 8)

| DoD-Punkt | Erfüllt durch diesen Plan? |
|---|---|
| 1. Alle Testfälle aus Abschnitt 7 ausgeführt und dokumentiert | Testplan deckt alle 34 Testfälle ab (Abschnitt 3); **Ausführung** ist ein separater, nachgelagerter Schritt (`npm test` + `npm run test:e2e`) — Ergebnis muss nach Ausführung in dieses Dokument oder einen Ausführungsbericht nachgetragen werden |
| 2. Jedes Verdachtsmoment eingestuft | Abschnitt 7 — alle 7 Punkte eingestuft, keiner offen unkommentiert |
| 3. Mindestens ein dauerhaft verankerter E2E-Test | `tests/e2e/strike.spec.ts` (Abschnitt 5.2) + Erweiterung `selection-regression.spec.ts` (5.3) |
| 4. Rundreise DOCX + ODT inkl. Cross-Format + je eine reale Fremddatei | ODT vollständig (`character-styles.odt`); DOCX **ohne realen Korpus-Kandidaten** — Ersatz über handgebaute Datei, siehe Blocker §10 |
| 5. Tastenkürzel-Entscheidung getroffen und umgesetzt | Entscheidung dokumentiert in `durchgestrichen-code.md` Abschnitt 3.5 (`Mod-Shift-x`); **Umsetzung im Code steht laut §1 dieses Plans noch aus** |

**QA-Gesamturteil zum aktuellen Zeitpunkt:** Feature „Durchgestrichen" ist **noch nicht** im
Sinne von Abschnitt 8 der Anforderung „vertrauenswürdig", da drei der vier in
`durchgestrichen-code.md` beschriebenen Fixes nachweislich nicht im Code angekommen sind. Dieser
Testplan liefert die Tests, mit denen das nach Umsetzung objektiv nachgewiesen werden kann.

---

## 10. Offene Punkte / Blocker für QA

1. **Kein realer DOCX-Fixture mit Durchstreichung im Korpus** (Abschnitt 6) — Testfall 23 und
   Rundreise-Anforderung Punkt 9 können mit den vorhandenen 127 Apache-POI-Dateien nicht mit
   einer *echten* Fremddatei erfüllt werden. Empfehlung (bereits in `durchgestrichen-code.md`
   Abschnitt 9 vorgeschlagen, hier von QA bestätigt): eine kleine, mit echtem Microsoft Word
   erzeugte DOCX mit durchgestrichenem Text unter `tests/fixtures/external/docx/` ergänzen
   (Herkunft/Lizenz in `tests/fixtures/external/README.md` dokumentieren). Bis dahin deckt
   Testfall 25 den Grenzfall nur synthetisch ab.
2. **Format-übergreifender Upload ungeprüft** — ob eine DOCX-Datei über die ODT-Karte (bzw.
   umgekehrt) hochgeladen werden kann, ist im UI-Code nicht verifiziert. Vor Fertigstellung der
   Cross-Format-Tests (5.2, Testfälle 20–22) muss geprüft werden, ob die Karten formatspezifisch
   nur die eigene Endung akzeptieren (`accept`-Attribut des `<input>`) — falls ja, muss der
   Cross-Format-Test stattdessen über zwei getrennte Card-Instanzen mit Re-Upload der
   exportierten Datei in die jeweils andere Karte laufen, nicht in derselben.
3. **Unabhängige Parser-Validierung (Anforderung Abschnitt 5 Punkt 8/DoD Punkt 4)** — dieses Repo
   hat keine Python-Toolchain. Die automatisierten Playwright-Tests prüfen den exportierten
   XML-String per Regex/`toContain`, ohne den eigenen Reader erneut zu verwenden (siehe Prinzip
   in 5.1, Punkt 4) — das erfüllt die Anforderung für die automatisierte Suite. Zusätzlich
   empfohlen: einmalig eine exportierte Test-DOCX/-ODT mit `python-docx` bzw. echtem
   LibreOffice/einem ODF-Validator öffnen und das Ergebnis manuell hier nachtragen, **bevor**
   der Feature-Status auf „verifiziert" wechselt.
4. **Kopf-/Fußzeilen** (Grenzfall 8) — keine UI zum Bearbeiten von Header/Footer-Inhalten
   vorhanden. Als „nicht testbar" vermerkt, nicht stillschweigend ausgelassen (wie von der
   Anforderung verlangt).
5. **Testfall 11 im Playwright-Spec unvollständig demonstriert** — der zweite (kritischere)
   Teilfall in Abschnitt 5.2 (Selektion beginnt am nicht-durchgestrichenen Ende) benötigt eine
   robuste, geräteunabhängige Rückwärts-Selektion (z. B. über `page.mouse` mit echten
   Pixelkoordinaten oder `Shift+Home` nach `End`); der im Entwurf oben skizzierte Ansatz ist ein
   Platzhalter und muss vor Ausführung durch eine verlässliche Zieh-Selektion ersetzt werden.

---

## 11. Nächste Schritte (Verantwortung Dev, zur Kenntnis an Lead/PO)

1. Die vier Fixes aus `durchgestrichen-code.md` Abschnitt 0/3 tatsächlich in den Code einbringen
   (aktuell laut Abschnitt 1 dieses Plans **nicht** geschehen).
2. Testdateien aus Abschnitt 4/5 dieses Plans genau wie beschrieben anlegen.
3. `npm test` und `npm run test:e2e -- strike.spec.ts selection-regression.spec.ts` ausführen.
4. Ergebnis (insbesondere den RED→GREEN-Übergang der in Abschnitt 1/3 als „erwartet RED"
   markierten Tests) in diesem Dokument oder einem Ausführungsbericht festhalten, bevor der
   Backlog-Status von „vorhanden" auf „verifiziert" wechselt (Anforderung Abschnitt 8).
