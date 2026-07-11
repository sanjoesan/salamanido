# QA-Testplan: „Durchgestrichen" (Strikethrough)

Gegenstück zu `specs/durchgestrichen-req.md` (Anforderung) und `specs/durchgestrichen-code.md`
(Umsetzungsplan des Dev-Agenten). Dieses Dokument ist der **Testplan der QA-Rolle**: er legt
fest, welche Tests mit welchem konkreten, **deterministischen** Code gegen welche echten
Dateien/Fixtures geschrieben werden und wie das Ergebnis gegen Anforderungsabschnitt 7/8
abgeglichen wird. Stil/Aufbau folgen bewusst `durchgestrichen-req.md`/`durchgestrichen-code.md`,
damit alle drei Dokumente gemeinsam gelesen werden können.

> **Revisionshinweis (diese Fassung).** Eine frühere QA-Fassung war inhaltlich weitgehend
> korrekt, hatte aber fünf harte Mängel, die hier behoben sind:
> 1. **Determinismus** (die Kernvorgabe des Auftrags) war unzureichend adressiert — die
>    `Shift+Pfeil`-Selektionsschleifen und der Undo-Test ignorierten die im Repo bereits
>    schmerzhaft erlernten Race-Muster (`tests/e2e/cut.spec.ts`,
>    `tests/e2e/selection-regression.spec.ts`). Neuer, verbindlicher Abschnitt 3 plus
>    Anwendung in **jedem** betroffenen Test.
> 2. **Testfall 11** enthielt echten Platzhalter-Müll (`page.mouse.click(0, 0)`, toter
>    `noWaitAfter`-Press, `.catch(() => {})`) — ersetzt durch eine saubere, deterministische
>    „Ende-durchgestrichen"-Selektion, die den eigentlichen Bug fängt.
> 3. **Testfall 8/9** prüfte eine **unmögliche** DOM-Verschachtelung (`<u>` in `<s>`); `strike`
>    ist die **innerste** Mark (`<strong><em><u><s>`). Korrigiert auf tag-einzelne Prüfung.
> 4. **Testfall 18/19** ließ den von Anforderung §5.1 / DoD 3 **ausdrücklich verlangten**
>    Re-Import weg (reine XML-Prüfung ist dort explizit als ungenügend markiert). Ergänzt um
>    echten Re-Import über den „← Formate"-Weg der UI.
> 5. **Cross-Format 20/21/22** waren `.catch()`-Stubs; die App hat **keinen** Cross-Format-
>    Export in der UI (bestätigt in `src/app/DocumentWorkspace.tsx` und dokumentiert in
>    `tests/e2e/cut.spec.ts`). Verlagert auf deterministische **Unit-**Rundreisen; die
>    E2E-UI-Grenze ist ehrlich als Blocker vermerkt.

---

## 0. Kurzfassung für Eilige

- **Vor Testerstellung wurde der tatsächliche Code geprüft** (nicht nur `durchgestrichen-code.md`
  gelesen). Ergebnis, direkt am Quellstand verifiziert: **keiner der vier in
  `durchgestrichen-code.md` Abschnitt 0 angekündigten Fixes ist im aktuellen Code umgesetzt.**
  Stand dieser Prüfung ist der reine **Ist-Zustand aus `durchgestrichen-req.md` Abschnitt 1**.
  Einzelheiten (mit Zeilen-Beleg) in Abschnitt 1.
- Der Plan bildet **beide Zustände** ab: Tests, die einen der vier offenen Bugs betreffen, sind
  als „**erwartet RED** bis `durchgestrichen-code.md` umgesetzt, danach GREEN" gekennzeichnet.
  Das ist Absicht (Red-Green: ein Test, der schon vor dem Fix grün ist, beweist nichts).
- **Determinismus ist erste Bürgerpflicht** (ausdrückliche Auftragsvorgabe: „keine
  Race-Conditions durch zu schnelle Tastatureingaben; Selektions-Sync abwarten"). Abschnitt 3
  kodifiziert die im Repo bereits bewährten Regeln und **jeder** E2E-Test unten wendet sie an —
  begründet, wo eine Wartezeit nötig ist, und begründet, wo bewusst keine steht.
- Zwei Testebenen, wie beauftragt:
  1. **Unit-Tests (Vitest/jsdom)** für die Reader/Writer-Rundreise DOCX **und** ODT, inkl.
     Grenzfällen und Cross-Format — Abschnitt 5.
  2. **Echte Playwright-Browser-Tests** — echte Mausklicks (`getByTitle(...).click()`), echtes
     Tippen (`page.keyboard`), echter Datei-Upload (`input[type=file].setInputFiles`), echter
     Export/Download (`page.waitForEvent('download')`) mit anschließendem Einlesen/Entpacken der
     **tatsächlich heruntergeladenen Datei** **und** echtem Re-Import über die UI — nicht bloß
     interne Aufrufe von `readDocx`/`writeDocx`/`readOdt`/`writeOdt`. Abschnitt 6.
- Alle referenzierten Fixtures wurden **vor dem Schreiben** selbst geprüft: die drei ODT-Dateien
  mit realer Durchstreichung existieren im Korpus (`tests/fixtures/external/odt/`,
  per `ls` bestätigt), Inhalt siehe Abschnitt 7.

---

## 1. Ausgangslage: Code-Audit vor Testerstellung

Geprüft wurden die tatsächlichen Dateien im Repo: `src/formats/docx/{reader,writer}.ts`,
`src/formats/odt/{reader,writer,styleRegistry}.ts`, `src/formats/shared/schema.ts`,
`src/formats/shared/editor/{Toolbar.tsx,WordEditor.tsx,commands.ts}`, `src/app/{FormatPicker,
DocumentWorkspace}.tsx`, beide `__tests__/roundtrip.test.ts`, sowie die bestehenden E2E-Specs
`tests/e2e/{cut,selection-regression,docx,odt}.spec.ts`.

| # | `durchgestrichen-code.md` Abschnitt 0 kündigt an | Tatsächlicher Code-Stand (verifiziert) | QA-Konsequenz |
|---|---|---|---|
| 1 | `docx/reader.ts` liest künftig `w:val` von `<w:strike>` (`isOnOffEnabled`-Helper) | **Nicht umgesetzt.** `reader.ts:107` lautet weiterhin `if (firstChildNS(rPr, OOXML_NAMESPACES.w, 'strike')) marks.push({ type: 'strike' })` — reine Existenzprüfung, `w:val` wird nicht gelesen | Testfall 25 / Grenzfall 1 **muss** enthalten sein; er schlägt heute **fehl** (bestätigter, reproduzierbarer Bug) |
| 2 | `docx/writer.ts` `runPropertiesXml` erzeugt `<w:rPr>` künftig in `EG_RPrBase`-Reihenfolge | **Nicht umgesetzt.** Ausgabereihenfolge folgt weiterhin dem `marks`-Array | Optionaler Order-Test (4.2) — kein Abnahmekriterium |
| 3 | `Toolbar.tsx`/neuer `markActive`-Helper in `commands.ts` berechnet „aktiv" über die gesamte Selektion (`rangeHasMark`) | **Nicht umgesetzt.** `Toolbar.tsx:69` = `const active = markType.isInSet(view.state.selection.$from.marks()) !== undefined`; `commands.ts` exportiert **kein** `markActive` | Testfall 11/12, Grenzfälle 11/12 → **RED**; Unit-Test 5.5 **kompiliert nicht**, bis `markActive` existiert — im Test vermerkt |
| 4 | `WordEditor.tsx` Keymap ergänzt `'Mod-Shift-x': toggleMark(wordSchema.marks.strike)` | **Nicht umgesetzt.** Keymap-Block (`85–108`) enthält `Mod-b/-i/-u` (Zeile 98–100, **direkt am Quellstand nachgezählt**), **keinen** Strike-Eintrag; die frühere QA-Fassung nannte hier fälschlich „Zeile 90–92" (veralteter Codestand, denselben Fehler warnt `durchgestrichen-code.md` ab) | Testfall 32 → **RED** |

Zusätzlich verifiziert, **bereits korrekt** (kein Fix nötig, nur Testabdeckung):

- `schema.ts:176–181`: Mark `strike` exakt wie beschrieben — `parseDOM` deckt `<s>`, `<strike>`,
  CSS `text-decoration=line-through` ab; `toDOM → ['s', 0]`.
- **Mark-Verschachtelung**: Rang in `schema.ts:157–196` ist `strong, em, underline, strike,
  textColor, highlight`. Im DOM ist damit `strong` **außen** und `strike` **innen**:
  `<strong><em><u><s>Text</s></u></em></strong>`. (Direkt aus `toDOM` abgeleitet — relevant für
  Testfall 8/9, siehe 6.2.)
- `odt/reader.ts:56–57`: `text-line-through-style !== 'none'` ⇒ Mark — korrekt für Grenzfall 2.
- `odt/writer.ts:38` + `styleRegistry.ts:55`: schreibt korrekt
  `style:text-line-through-style="solid" style:text-line-through-type="single"`.
- `docx/reader.ts`/`odt/reader.ts` lesen `w:dstrike` bzw. `text-line-through-type` **nirgends** —
  bestätigter, unschädlicher Fallback (kein Crash, kein Textverlust) für Grenzfall 3.
- Keine Mark hat ein `excludes` → Reihenfolge-Unabhängigkeit beim Kombinieren (Anforderung 3.4)
  ist strukturell gegeben.
- **UI-Selektoren bestätigt** (`Toolbar.tsx`/`FormatPicker.tsx`/`DocumentWorkspace.tsx`):
  Button `title="Durchgestrichen"` (Zeile 187), `title="Fett"/"Kursiv"/"Unterstrichen"`,
  `title="Aufzählung"/"Nummerierte Liste"/"Tabelle einfügen"`, `<select aria-label="Absatzformat">`
  (Optionen `normal`/`1`–`6`), Karten-Headings „OpenDocument Text (.odt)" / „Word-Dokument (.docx)",
  Buttons „Neu erstellen", „Exportieren", Rücksprung „← Formate".
- **Bestehende Roundtrip-Tests** (`docx/__tests__/roundtrip.test.ts:63–98`) testen
  Fett/Kursiv/Unterstrichen/Durchgestrichen nur an **getrennten** Läufen; der Kombitest deckt
  **nur** `strong`+`em` ab — **`strike` kombiniert fehlt** (Verdachtsmoment 4/7 bestätigt).
- **Kein** E2E-Test bedient bisher den Durchgestrichen-Button (Verdachtsmoment 2 bestätigt).
- Fixture-Korpus: **0** DOCX-Fixtures mit `w:strike`/`w:dstrike`; **3** ODT-Fixtures
  (`character-styles.odt`, `feature_attributes_character_MSO15.odt`, `listStyleId.odt`) mit realer
  Durchstreichung (Abschnitt 7).

**Konsequenz:** Die Tests aus Abschnitt 5/6 dokumentieren den heutigen (Bug-)Zustand korrekt als
fehlschlagend **und** werden nach Umsetzung von `durchgestrichen-code.md` ohne Änderung grün — es
wird **kein** Test „geschönt", um heute zu bestehen.

---

## 2. Testumgebung & Ausführung

| Ebene | Werkzeug | Befehl | Konfiguration |
|---|---|---|---|
| Unit | Vitest, `jsdom`, `globals: true` | `npm test` / `npm run test:watch` | `vite.config.ts`; Node-APIs (`node:fs`, `node:path`) funktionieren im jsdom-Setup (bereits von Fixture-Tests genutzt) |
| E2E | Playwright | `npm run test:e2e` | `playwright.config.ts`: `webServer` baut+startet die Preview automatisch; Projekte **Desktop Chrome**, **Mobile (Pixel 7)**, **Tablet (iPad Mini/WebKit)** |

Alle neuen/erweiterten Dateien fügen sich ohne Konfigurationsänderung ein.

---

## 3. Determinismus-Regeln (verbindlich für alle E2E-Tests)

Das Repo hat diese Races bereits reproduziert und in Kommentaren festgehalten. Dieser Plan
**übernimmt genau diese bewährten Muster**, statt sie neu zu erfinden — jede Regel ist an einer
existierenden, grünen Testdatei belegt.

**Regel A — Selektion per `Shift+Pfeil` aufbauen → pro Taste `{ delay: 20 }`, danach
`await page.waitForTimeout(50)`.**
Belegt in `tests/e2e/cut.spec.ts` (Testfall 1, Grenzfall 3/13): eine Null-Delay-Folge einzelner
`Shift+ArrowRight`-Keydowns, unmittelbar gefolgt von der nächsten Aktion, kann ProseMirrors
asynchronen `selectionchange`-Sync überholen und zu **falscher Selektionslänge** führen
(`window.getSelection()` meldete korrekt, die tatsächlich betroffene Textmenge schwankte).
20 ms/Taste entspricht realistischer Key-Repeat-Rate; die 50-ms-Pause nach dem Loslassen lässt
den bereits laufenden Sync landen.

**Regel B — Nativer Caret-Move (`Home`/`End`/Klick) vor einer strukturellen Taste (`Enter`) →
`await page.waitForTimeout(50)`.**
Belegt in `tests/e2e/selection-regression.spec.ts`: ProseMirror erfährt einen nativen
Caret-Move nur über das asynchrone `selectionchange`-Event; ein sofortiges `Enter` kann
vorauseilen und auf der alten Position wirken.

**Regel C — Vor einem `Strg+A`+Toggle, dessen Undo-Atomarität später geprüft wird →
`await page.waitForTimeout(600)`.**
Belegt in `tests/e2e/cut.spec.ts` (Testfall 9): `prosemirror-history` fasst benachbarte
Transaktionen innerhalb ~500 ms (`newGroupDelay`) zu **einem** Undo-Schritt zusammen. Ohne Pause
landen Tippen und Format-Toggle im selben Schritt → ein einzelnes `Strg+Z` macht **beides**
rückgängig. Der Undo-Test (Testfall 15/16) wäre sonst falsch grün/rot.

**Regel D — `Strg+A` unmittelbar gefolgt von **einem** Toolbar-Klick braucht **keine** Pause.**
`Strg+A` ist ein atomarer nativer Select-all-Befehl; die gesamte bestehende Suite
(`cut.spec.ts:95`, `selection-regression.spec.ts:19`) nutzt genau diese Folge stabil. Bewusst
**keine** überflüssige Wartezeit — der Plan fügt Waits nur dort ein, wo ein Race real belegt ist,
um die Suite nicht künstlich zu verlangsamen.

**Regel E — Nur web-first-Assertions.** Ausschließlich auto-retryende Matcher
(`expect(locator).toHaveText/toContainText/toHaveAttribute/toHaveCount`). **Nie** Zustand in eine
Variable lesen und synchron über eine Async-Grenze prüfen. Damit sind alle *Assertions* per
Konstruktion race-frei; die Waits oben betreffen ausschließlich *Aktions*-Sequenzen zwischen
Tastendrücken.

---

## 4. Traceability-Matrix — Anforderung (§7) → Testartefakt

| Testfall (`durchgestrichen-req.md` §7) | Ebene | Testartefakt | Erwartung vor Fixes aus §1 |
|---|---|---|---|
| 1–3 (Selektionsmethoden) | E2E | `strike.spec.ts` | GREEN |
| 4 (Alles auswählen + Regression) | E2E | `selection-regression.spec.ts` (Erweiterung) | GREEN |
| 5 (Cursor ohne Selektion) | E2E | `strike.spec.ts` | GREEN |
| 6 (Toggle aus) | E2E | `strike.spec.ts` | GREEN |
| 7 (gemischte Selektion) | E2E | `strike.spec.ts` | GREEN |
| 8–9 (Kombination mit anderen Formaten) | Unit + E2E | `roundtrip.test.ts` + `strike.spec.ts` | GREEN |
| 10 (Button aktiv, Cursor ohne Selektion) | E2E | `strike.spec.ts` | GREEN |
| 11 (Button bei gemischter Selektion) | Unit + E2E | `commands.test.ts` + `strike.spec.ts` | **RED bis Fix #3** |
| 12 (Button an leerer Schreibmarke, `storedMarks`) | Unit | `commands.test.ts` | **RED bis Fix #3** |
| 13–15 (Liste/Tabelle/Überschrift) | Unit + E2E | `roundtrip.test.ts` + `strike.spec.ts` | GREEN |
| 16 (Undo/Redo) | E2E | `strike.spec.ts` (Regel C) | GREEN |
| 17 (Paste extern) | E2E | `strike.spec.ts` | GREEN |
| 18–19 (Eigenrundreise DOCX/ODT **inkl. Re-Import**) | E2E | `strike.spec.ts` | GREEN |
| 20–21 (Cross-Format) | **Unit** | `cross-format-strike.test.ts` | GREEN (E2E-UI fehlt, Blocker §11) |
| 22 (Doppel-Cross-Format, kombiniert) | **Unit** | `cross-format-strike.test.ts` | GREEN |
| 23 (reale DOCX-Fremddatei) | — | **kein Korpus-Kandidat**, Blocker §11 | blockiert, Ersatz dokumentiert |
| 24 (reale ODT-Fremddatei) | E2E | `strike.spec.ts` mit `character-styles.odt` | GREEN |
| 25 (`w:strike w:val="0"`) | Unit + E2E | `docx/__tests__/strike.test.ts` + `strike.spec.ts` | **RED bis Fix #1** |
| 26 (`text-line-through-style="none"`) | Unit | `odt/__tests__/strike.test.ts` | GREEN |
| 27 (doppelte Durchstreichung, Fallback) | Unit | `docx`/`odt` `strike.test.ts` | GREEN |
| 28 (E2E über echte Bedienung inkl. Re-Import) | E2E | `strike.spec.ts` | GREEN (DOCX+ODT) |
| 29 (DOCX mammoth assertiert Strike) | Unit | `docx/__tests__/external-validation.test.ts` (Erw.) | GREEN |
| 30 (ODT gezielte `text-line-through`-Assertion) | Unit | `odt/__tests__/external-validation.test.ts` (Erw.) | GREEN |
| 31 (Icon-Rendering) | E2E (visuell) | `strike.spec.ts` Screenshot | GREEN (Begründung §7-Icon) |
| 32 (Tastenkürzel `Mod-Shift-x`) | E2E | `strike.spec.ts` | **RED bis Fix #4** |
| 33 (Performance große Selektion) | E2E | `strike.spec.ts` (reformuliert, siehe 6.2) | GREEN |
| 34 (Mehrfachklick) | E2E | `strike.spec.ts` | GREEN |
| 35 (Import-Render Voll-Fixture bleibt grün) | E2E | bestehende `docx.spec.ts`/`odt.spec.ts` | GREEN |

---

## 5. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX **und** ODT)

### 5.1 Bestandsaufnahme

Vorhanden: beide `roundtrip.test.ts` (isolierte Einzel-Marks; Kombitest nur `strong`+`em`),
generische „importiert ohne Absturz"-Fixture-Tests (**keine** `strike`-Assertion). Fehlt:
Grenzfall-Reader-Tests (`w:val`, `dstrike`/`double`), `strike` kombiniert auf demselben Lauf,
Liste/Tabelle/Überschrift, Cross-Format, `markActive`.

### 5.2 Neu: `src/formats/docx/__tests__/strike.test.ts`

```ts
import JSZip from 'jszip'
import { readDocx } from '../reader'

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'

/** Minimal, hand-built DOCX mit genau einem Lauf und frei wählbarem <w:rPr>-Inhalt —
 *  unabhängig vom eigenen Writer, damit Reader-Bugs sichtbar werden, die der eigene
 *  Writer nie erzeugen würde (Grenzfall 1/3, Verdachtsmoment 1). */
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
  zip.folder('_rels')!.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
      `</Relationships>`,
  )
  zip.folder('word')!.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NS}><w:body>` +
      `<w:p><w:r><w:rPr>${rPrInner}</w:rPr><w:t>Text</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
  )
  return new Blob([await zip.generateAsync({ type: 'nodebuffer' })])
}

const runOf = async (rPr: string) =>
  (((await readDocx(await buildDocxWithRun(rPr))).body as any).content[0].content[0])
const isStruck = (run: any) => (run.marks ?? []).some((m: any) => m.type === 'strike')

describe('DOCX reader: <w:strike> w:val (Grenzfall 1 / Testfall 25)', () => {
  // ERWARTUNG: heute FEHLSCHLAGEND für die "false"-Fälle, solange reader.ts:107 nur die
  // Existenz prüft (§1, Fix #1). Nach Umsetzung von code.md 3.1 vollständig GREEN.
  it.each([
    ['<w:strike/>', true], // kein w:val -> ECMA-376 CT_OnOff Default "an"
    ['<w:strike w:val="true"/>', true],
    ['<w:strike w:val="1"/>', true],
    ['<w:strike w:val="on"/>', true],
    ['<w:strike w:val="false"/>', false],
    ['<w:strike w:val="0"/>', false], // Testfall 25
    ['<w:strike w:val="off"/>', false],
    ['<w:strike w:val="FALSE"/>', false], // Groß-/Kleinschreibung
  ])('%s -> strike=%s', async (rPr, expected) => {
    const run = await runOf(rPr)
    expect(run.text).toBe('Text') // kein Textverlust in KEINEM Fall
    expect(isStruck(run)).toBe(expected)
  })
})

describe('DOCX reader: <w:dstrike> Fallback (Grenzfall 3 / Testfall 27)', () => {
  it('nur <w:dstrike/> -> normaler Text, kein Absturz, kein Textverlust', async () => {
    const run = await runOf('<w:dstrike/>')
    expect(run.text).toBe('Text')
    expect(isStruck(run)).toBe(false)
  })
  it('<w:strike/> UND <w:dstrike/> -> kollabiert bewusst auf "einfach durchgestrichen"', async () => {
    const run = await runOf('<w:strike/><w:dstrike/>')
    expect(run.text).toBe('Text')
    expect(isStruck(run)).toBe(true)
  })
})
```

### 5.3 Neu: `src/formats/odt/__tests__/strike.test.ts`

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readOdt } from '../reader'

const DIR = join(__dirname, '../../../../tests/fixtures/external/odt')
const loadFixture = (name: string) => readOdt(new Blob([new Uint8Array(readFileSync(join(DIR, name)))]))

function textRuns(node: any, out: any[] = []): any[] {
  if (node.type === 'text') out.push({ text: node.text, marks: node.marks })
  ;(node.content ?? []).forEach((n: any) => textRuns(n, out))
  return out
}
const struck = (r: any) => (r.marks ?? []).some((m: any) => m.type === 'strike')

describe('ODT reader: reale Durchstreichungs-Fixtures (odftoolkit-Korpus, Testfall 24/26/27)', () => {
  it('character-styles.odt: single (T11) UND double (T12) beide durchgestrichen; none (T13) nicht', async () => {
    // Verifiziert (Abschnitt 7): T11=solid/single -> "Lorem ipsum", T12=solid/double -> "Lorem ipsum",
    // T13=none -> "lor sit ". "double" kollabiert bewusst auf "single" (kein Verlust, kein Absturz).
    const runs = textRuns((await loadFixture('character-styles.odt')).body as any)
    expect(runs.filter((r) => struck(r) && r.text === 'Lorem ipsum')).toHaveLength(2)
    expect(runs.some((r) => !struck(r) && r.text.includes('lor sit'))).toBe(true)
    expect(runs.some((r) => struck(r) && r.text.includes('lor sit'))).toBe(false)
  })

  it('feature_attributes_character_MSO15.odt + listStyleId.odt: >=1 durchgestrichener Lauf, kein Crash', async () => {
    for (const name of ['feature_attributes_character_MSO15.odt', 'listStyleId.odt']) {
      const runs = textRuns((await loadFixture(name)).body as any)
      expect(runs.some(struck)).toBe(true)
    }
  })
})

describe('ODT reader: explizites style:text-line-through-style="none" (Grenzfall 2, Testfall 26)', () => {
  it('Fixtures mit ausschließlich "none" erzeugen keine strike-Mark', async () => {
    for (const name of ['compdocfileformat.odt', 'excelfileformat.odt', 'HeaderFooter.odt', 'OOStyledTable.odt']) {
      const runs = textRuns((await loadFixture(name)).body as any)
      expect(runs.some(struck)).toBe(false)
    }
  })
})
```

> Robustheit: `toHaveLength(2)` ist zulässig, weil im Korpus-Scan nur `T11`/`T12` `="solid"`
> tragen. `"lor sit "` trägt ein abschließendes Leerzeichen (Rohtext) → `.includes('lor sit')`
> statt Gleichheit.

### 5.4 Erweiterung: `roundtrip.test.ts` (DOCX **und** ODT, identisch)

Schließt Verdachtsmoment 4/7 und Anforderung 3.4/3.8. Nutzt die bereits vorhandenen Helfer
`doc()`/`paragraph()`/`roundTrip()` derselben Datei (verifiziert: `docx/__tests__/roundtrip.test.ts:14–30`).

```ts
it('preserves strike combined with bold, italic and color on the SAME run (Verdachtsmoment 4)', async () => {
  const original = doc([{ type: 'paragraph', attrs: { align: 'left' }, content: [
    { type: 'text', text: 'kombiniert', marks: [
      { type: 'strong' }, { type: 'em' }, { type: 'strike' }, { type: 'textColor', attrs: { color: '#ff0000' } },
    ] },
  ] }])
  const run = (await roundTrip(original) as any).body.content[0].content[0]
  expect(run.marks).toEqual(expect.arrayContaining([
    { type: 'strong' }, { type: 'em' }, { type: 'strike' }, { type: 'textColor', attrs: { color: '#ff0000' } },
  ]))
  expect(run.marks).toHaveLength(4)
})

it.each([1, 2, 3, 4, 5, 6])('preserves strike in a heading level %s (Anforderung 3.8/Testfall 15)', async (level) => {
  const original = doc([{ type: 'heading', attrs: { level, align: 'left' }, content: [{ type: 'text', text: 'Titel', marks: [{ type: 'strike' }] }] }])
  const run = (await roundTrip(original) as any).body.content[0].content[0]
  expect((run.marks ?? []).some((m: any) => m.type === 'strike')).toBe(true)
})

it('preserves strike inside a list item and a table cell (Anforderung 3.8/Testfall 13/14)', async () => {
  const original = doc([
    { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Punkt', 'left', [{ type: 'strike' }])] }] },
    { type: 'table', content: [{ type: 'table_row', content: [
      { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Zelle', 'left', [{ type: 'strike' }])] },
    ] }] },
  ])
  const r = (await roundTrip(original) as any).body
  const listRun = r.content[0].content[0].content[0].content[0]
  const cellRun = r.content[1].content[0].content[0].content[0].content[0]
  for (const run of [listRun, cellRun]) expect((run.marks ?? []).some((m: any) => m.type === 'strike')).toBe(true)
})

it('mark-application order does not change the resulting mark set (Anforderung 3.4)', async () => {
  const a = doc([paragraph('x', 'left', [{ type: 'strong' }, { type: 'strike' }])])
  const b = doc([paragraph('x', 'left', [{ type: 'strike' }, { type: 'strong' }])])
  const [ra, rb] = await Promise.all([roundTrip(a), roundTrip(b)])
  expect((ra as any).body.content[0].content[0].marks).toEqual((rb as any).body.content[0].content[0].marks)
})
```

### 5.5 Neu (bedingt): `src/formats/shared/editor/__tests__/commands.test.ts` (`markActive`)

**Ausführungshinweis:** importiert `markActive` aus `commands.ts` — dieser Export existiert laut
§1 **noch nicht**. Bis Fix #3 umgesetzt ist, scheitert bereits der Import (Kompilierfehler, nicht
nur ein rotes Assert). Das ist beabsichtigt und hier dokumentiert. Falls `commands.test.ts` schon
existiert (aktuell mit `canCut`/`cutSelection`), wird der Block **angehängt**, nicht ersetzt.

```ts
import { EditorState, TextSelection } from 'prosemirror-state'
import { wordSchema } from '../../schema'
import { markActive } from '../commands'

function stateFromParagraphs(...texts: string[]): EditorState {
  const paras = texts.map((t) => wordSchema.nodes.paragraph.create({ align: 'left' }, t ? wordSchema.text(t) : undefined))
  return EditorState.create({ doc: wordSchema.nodes.doc.create(null, paras), schema: wordSchema })
}
const strike = wordSchema.marks.strike

describe('markActive (Grenzfälle 11/12, Testfälle 11/12)', () => {
  it('false bei leerer Selektion ohne storedMarks', () => {
    expect(markActive(stateFromParagraphs(''), strike)).toBe(false)
  })
  it('spiegelt storedMarks an leerer Schreibmarke wider (Grenzfall 12)', () => {
    let s = stateFromParagraphs('abc')
    s = s.apply(s.tr.addStoredMark(strike.create()))
    expect(markActive(s, strike)).toBe(true)
  })
  it('true, wenn nur der ANFANG einer gemischten Selektion die Mark trägt', () => {
    let s = stateFromParagraphs('abcdef')
    s = s.apply(s.tr.addMark(1, 4, strike.create()))
    s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, 1, 7)))
    expect(markActive(s, strike)).toBe(true)
  })
  it('true, wenn nur das ENDE einer gemischten Selektion die Mark trägt (der eigentliche alte Bug)', () => {
    let s = stateFromParagraphs('abcdef')
    s = s.apply(s.tr.addMark(4, 7, strike.create()))
    s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, 1, 7)))
    expect(markActive(s, strike)).toBe(true) // alte $from-only-Logik hätte false gemeldet
  })
  it('false, wenn kein Teil der Selektion die Mark trägt', () => {
    let s = stateFromParagraphs('abcdef')
    s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, 1, 7)))
    expect(markActive(s, strike)).toBe(false)
  })
})
```

### 5.6 Neu: `src/formats/shared/__tests__/cross-format-strike.test.ts` (Cross-Format, Testfälle 20–22)

Cross-Format wird **auf Unit-Ebene** geprüft: die App hat **keinen** Cross-Format-Export in der UI
(bestätigt in `src/app/DocumentWorkspace.tsx` — „Exportieren" ruft immer `module.exportFile(...)`
des geöffneten Formats; siehe auch die identische Feststellung in `tests/e2e/cut.spec.ts`
Rundreise 4/5). Die Format-Konvertierung ist eine reine Reader/Writer-Angelegenheit über das
geteilte interne Modell — deterministisch und ohne UI prüfbar. (Import-Pfade ggf. an die reale
Modulstruktur anpassen.)

```ts
import { writeDocx } from '../../docx/writer'
import { readDocx } from '../../docx/reader'
import { writeOdt } from '../../odt/writer'
import { readOdt } from '../../odt/reader'
import type { WordDocumentContent } from '../documentModel'

const doc = (content: unknown[]): WordDocumentContent =>
  ({ body: { type: 'doc', content }, header: null, footer: null, meta: { title: '' } })
const firstRun = (c: WordDocumentContent) => (c.body as any).content[0].content[0]
const hasMark = (c: WordDocumentContent, t: string) => (firstRun(c).marks ?? []).some((m: any) => m.type === t)

const struckDoc = doc([{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'x', marks: [{ type: 'strike' }] }] }])

it('DOCX -> ODT: Strike bleibt erhalten (Testfall 20)', async () => {
  const viaDocx = await readDocx(await writeDocx(struckDoc))
  const viaOdt = await readOdt(await writeOdt(viaDocx))
  expect(hasMark(viaOdt, 'strike')).toBe(true)
})

it('ODT -> DOCX: Strike bleibt erhalten (Testfall 21)', async () => {
  const viaOdt = await readOdt(await writeOdt(struckDoc))
  const viaDocx = await readDocx(await writeDocx(viaOdt))
  expect(hasMark(viaDocx, 'strike')).toBe(true)
})

it('DOCX -> ODT -> DOCX mit Strike+Fett+Farbe: kein kumulativer Verlust (Testfall 22)', async () => {
  const combined = doc([{ type: 'paragraph', attrs: { align: 'left' }, content: [
    { type: 'text', text: 'x', marks: [{ type: 'strike' }, { type: 'strong' }, { type: 'textColor', attrs: { color: '#ff0000' } }] },
  ] }])
  const a = await readDocx(await writeDocx(combined))
  const b = await readOdt(await writeOdt(a))
  const c = await readDocx(await writeDocx(b))
  expect(hasMark(c, 'strike')).toBe(true)
  expect(hasMark(c, 'strong')).toBe(true)
  expect(hasMark(c, 'textColor')).toBe(true)
})
```

### 5.7 Erweiterung: unabhängige Parser-Validierung (Testfälle 29/30, DoD 4)

**DOCX** — `src/formats/docx/__tests__/external-validation.test.ts` (mammoth). Neuer, eigener
`it`-Block:

```ts
it('strikethrough übersteht einen unabhängigen Parser (mammoth) als <s> (Testfall 29)', async () => {
  const content = { body: { type: 'doc', content: [{ type: 'paragraph', attrs: { align: 'left' },
    content: [{ type: 'text', text: 'durchgestrichen', marks: [{ type: 'strike' }] }] }] },
    header: null, footer: null, meta: { title: '' } } as WordDocumentContent
  const buffer = Buffer.from(await (await writeDocx(content)).arrayBuffer())
  // WICHTIG: mammoths Default-Style-Map behandelt Strikethrough je Version unterschiedlich;
  // "strike => s" wird deshalb EXPLIZIT gesetzt (an die Default-Map angehängt). Beim Umsetzen
  // die real installierte mammoth-Version prüfen; gibt sie Strike schon ohne styleMap als <s>
  // aus, ist der Eintrag harmlos redundant.
  const { value: html } = await mammoth.convertToHtml({ buffer }, { styleMap: ['strike => s'] })
  expect(html).toContain('<s>durchgestrichen</s>')
})
```

**ODT** — `src/formats/odt/__tests__/external-validation.test.ts`. Das validierte Dokument enthält
bereits einen Strike-Lauf; direkt nach der `content.xml`-Schemaprüfung ergänzen:

```ts
// Testfall 30 / DoD 4: gezielter Nachweis, dass die Durchstreichung im schema-validen
// content.xml tatsächlich als solide Linie kodiert ist (nicht nur "Datei ist gültig").
expect(contentXml).toContain('style:text-line-through-style="solid"')
```

### 5.8 Erwartete Unit-Ergebnisse (heute, vor den Fixes)

| Testdatei | Erwartung heute | Grund |
|---|---|---|
| `docx/__tests__/strike.test.ts` — `w:val` false/0/off/FALSE | **RED** (4/8) | Fix #1 fehlt |
| `docx/__tests__/strike.test.ts` — `dstrike`-Fälle | GREEN | Fallback bereits korrekt |
| `odt/__tests__/strike.test.ts` (alle Blöcke) | GREEN | `odt/reader.ts` bereits korrekt |
| `roundtrip.test.ts`-Erweiterung (kombiniert/Liste/Tabelle/Heading/Reihenfolge) | GREEN | betrifft keinen offenen Bug |
| `cross-format-strike.test.ts` | GREEN | geteiltes Modell, kein offener Bug |
| `external-validation`-Erweiterungen | GREEN | Writer-Ausgabe bereits korrekt |
| `commands.test.ts` (`markActive`) | **Kompilierfehler** | Fix #3 fehlt — Export existiert nicht |

---

## 6. Teil B — Echte Playwright-Browser-Tests

### 6.1 Prinzipien

Nicht zulässig: `readDocx`/`writeDocx`/`readOdt`/`writeOdt` direkt aufrufen, `EditorState`/
`Command`s selbst konstruieren, oder Assertions nur gegen das interne Modell. Verbindlich:
Klicks über `getByTitle/getByRole`, Tippen über `page.keyboard`, Upload über
`input.setInputFiles`, Export über `page.waitForEvent('download')` + `fs.readFile` +
`JSZip.loadAsync` auf die **tatsächlich geschriebene** Datei, und für Rundreisen der
**Pflicht-Re-Import** über die UI (Rücksprung „← Formate", dann Karten-`input[type=file]` —
verifiziert in `DocumentWorkspace.tsx:113`; dasselbe Muster nutzt `cut.spec.ts` Rundreise 10).
Alle Aktionssequenzen folgen den **Determinismus-Regeln aus Abschnitt 3**.

### 6.2 Neu: `tests/e2e/strike.spec.ts`

```ts
import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'

const odtCard = (page: Page) =>
  page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
const docxCard = (page: Page) =>
  page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })

test.describe('Durchgestrichen — Toolbar & Tastatur (Testfälle 1–17, 33–34)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Testfall 1/6: Toolbar-Klick togglet an und aus', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Testtext')
    await page.keyboard.press('ControlOrMeta+a') // Regel D: kein Wait nötig
    const button = page.getByTitle('Durchgestrichen')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(editor.locator('s')).toContainText('Testtext')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await expect(editor.locator('s')).toHaveCount(0)
  })

  test('Testfall 32: Strg/Cmd+Umschalt+X == Toolbar-Klick (erwartet RED bis Fix #4)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Kurzform')
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('ControlOrMeta+Shift+x')
    await expect(editor.locator('s')).toContainText('Kurzform')
    await expect(page.getByTitle('Durchgestrichen')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Testfall 5: Toggle an der Schreibmarke wirkt nur auf neu getippten Text', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('vorher ')
    await page.getByTitle('Durchgestrichen').click() // Fokus bleibt (onMouseDown+preventDefault)
    await page.keyboard.type('neu')
    await expect(editor.locator('s')).toContainText('neu')
    await expect(editor.locator('s')).not.toContainText('vorher')
  })

  test('Testfall 7 / Grenzfall 5: gemischte Selektion entfernt einheitlich (Anforderung 3.3)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('abcdef')
    await page.keyboard.press('Home')
    await page.keyboard.down('Shift')
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight', { delay: 20 }) // Regel A
    await page.keyboard.up('Shift')
    await page.waitForTimeout(50) // Regel A: selectionchange-Sync abwarten
    await page.getByTitle('Durchgestrichen').click() // "abc" durchgestrichen
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click() // toggleMark-Default: entfernt ALLES
    await expect(editor.locator('s')).toHaveCount(0)
  })

  test('Testfall 11 / Grenzfall 11: aria-pressed true, wenn nur das ENDE der Selektion durchgestrichen ist (erwartet RED bis Fix #3)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('abcdef')
    // "def" (letzte drei Zeichen) deterministisch von hinten durchstreichen:
    await page.keyboard.press('End')
    await page.keyboard.down('Shift')
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft', { delay: 20 }) // Regel A
    await page.keyboard.up('Shift')
    await page.waitForTimeout(50) // Regel A
    await page.getByTitle('Durchgestrichen').click()
    // Ganze Zeile: $from ("a") ist NICHT durchgestrichen, der Bereich enthält aber das
    // durchgestrichene "def". Alte $from-only-Logik meldet fälschlich "false" -> der Bug.
    await page.keyboard.press('ControlOrMeta+a')
    await expect(page.getByTitle('Durchgestrichen')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Testfall 8/9: Fett + Kursiv + Unterstrichen + Durchgestrichen gleichzeitig auf demselben Lauf', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Alles')
    await page.keyboard.press('ControlOrMeta+a')
    for (const t of ['Fett', 'Kursiv', 'Unterstrichen', 'Durchgestrichen']) await page.getByTitle(t).click()
    // Marks verschachteln in Schema-Rang-Reihenfolge strong>em>u>s (schema.ts:157–196):
    // <s> ist das INNERSTE Element, <u> dessen Vorfahr. Deshalb NICHT "u in s" prüfen
    // (das gäbe es nicht), sondern jede Auszeichnung EINZELN.
    for (const tag of ['strong', 'em', 'u', 's']) await expect(editor.locator(tag)).toContainText('Alles')
    // Grenzfall 7: Unterstrichen (<u>, Grundlinie) + Durchgestrichen (<s>, x-Höhe) rendern per
    // Browser-Default auf unterschiedlicher Höhe -> optisch unterscheidbar, beide existieren.
    await expect(editor.locator('u')).toHaveCount(1)
    await expect(editor.locator('s')).toHaveCount(1)
  })

  test('Testfall 10: Button aktiv, wenn Cursor (ohne Selektion) in durchgestrichenem Text steht', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Wort')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await page.keyboard.press('Home') // Selektion kollabiert in durchgestrichenen Text
    await expect(page.getByTitle('Durchgestrichen')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Testfall 13: Bullet-Liste', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Listenpunkt')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await expect(editor.locator('li s')).toContainText('Listenpunkt')
  })

  test('Testfall 14: Tabellenzelle ohne Nebenwirkung auf Nachbarzelle', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    const cells = editor.locator('td')
    await cells.nth(0).click()
    await page.keyboard.type('Eins')
    await page.keyboard.press('ControlOrMeta+a') // in dieser App dokumentweit; hier nur eine Zelle befüllt
    await page.getByTitle('Durchgestrichen').click()
    await cells.nth(1).click()
    await page.keyboard.type('Zwei')
    await expect(cells.nth(0).locator('s')).toContainText('Eins')
    await expect(cells.nth(1).locator('s')).toHaveCount(0)
  })

  test('Testfall 15: Überschrift (Ebene 2) durchstreichen', async ({ page }) => {
    // Ebenen 1–6 sind strukturell identisch (level-parametrischer heading-Node) und werden
    // deterministisch im Unit-Roundtrip (5.4, it.each 1–6) abgedeckt. Hier ein E2E-Smoke:
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Titel')
    await page.getByLabel('Absatzformat').selectOption('2')
    await editor.click() // nach selectOption Fokus zurück in den Editor (sonst tippt/selektiert man im <select>)
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await expect(editor.locator('h2 s')).toContainText('Titel')
  })

  test('Testfall 16: Undo/Redo direkt nach Anwenden', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Text')
    await page.waitForTimeout(600) // Regel C: Tippen und Strike-Toggle NICHT in einen Undo-Schritt gruppieren
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await expect(editor.locator('s')).toHaveCount(1)
    await page.keyboard.press('ControlOrMeta+z')
    await expect(editor.locator('s')).toHaveCount(0)
    await expect(editor).toContainText('Text') // Text bleibt (nur der Format-Schritt wird rückgängig gemacht)
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

  test('Testfall 33: große Selektion einfrierfrei durchstreichen', async ({ page }) => {
    // Statt 10.000 Zeichen einzeln zu tippen (langsam/flaky) wird ein großer Block per Paste
    // eingefügt; das misst denselben Toggle-Pfad. Keine brittle Date.now()-Schwelle: friert der
    // Toggle ein, läuft die web-first-Assertion in ihr Timeout -> Fehlschlag. "Nicht eingefroren"
    // == "Assertion löst innerhalb des normalen expect-Timeouts auf".
    const editor = page.locator('.ProseMirror')
    await editor.click()
    const big = ('Wort '.repeat(400) + '\n').repeat(10) // ~4000 Wörter, mehrere Absätze
    await page.evaluate((text) => {
      const pm = document.querySelector('.ProseMirror') as HTMLElement
      const dt = new DataTransfer()
      dt.setData('text/plain', text)
      pm.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }))
    }, big)
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await expect(editor.locator('s').first()).toBeVisible()
  })

  test('Testfall 34: schnelles Mehrfachklicken bleibt konsistent', async ({ page }) => {
    // Deterministisch OHNE Wartezeit zwischen den Klicks: toggleMark liest/schreibt view.state
    // SYNCHRON pro Klick; das async forceRender betrifft nur die aria-Anzeige, nicht die
    // Zustandslogik. 4 Klicks == 4 Toggles == Ausgangszustand, unabhängig vom Render-Timing.
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Klicktest')
    await page.keyboard.press('ControlOrMeta+a')
    const button = page.getByTitle('Durchgestrichen')
    for (let i = 0; i < 4; i++) await button.click()
    await expect(editor.locator('s')).toHaveCount(0)
    await expect(editor).toContainText('Klicktest')
    await expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  test('Grenzfall 4: Toggle im leeren Absatz wirft keinen Fehler', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Durchgestrichen').click()
    await page.keyboard.type('jetzt')
    await expect(editor.locator('s')).toContainText('jetzt')
  })
})

test.describe('Durchgestrichen — Rundreisen mit PFLICHT-Re-Import (Testfälle 18/19/24/25/28)', () => {
  const FORMATS = [
    { name: 'DOCX', card: docxCard, ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', part: 'word/document.xml', needle: /<w:strike\s*\/>/ },
    { name: 'ODT', card: odtCard, ext: 'odt', mime: 'application/vnd.oasis.opendocument.text', part: 'content.xml', needle: /text-line-through-style="solid"/ },
  ] as const

  for (const f of FORMATS) {
    test(`Testfall 18/19 (${f.name}): durchstreichen -> Export -> Download prüfen -> Re-Import -> Strike bleibt`, async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: /verstanden/i }).click()
      await f.card(page).getByRole('button', { name: 'Neu erstellen' }).click()
      const editor = page.locator('.ProseMirror')
      await editor.click()
      await page.keyboard.type('Durchgestrichener Text')
      await page.keyboard.press('ControlOrMeta+a')
      await page.getByTitle('Durchgestrichen').click()
      await expect(editor.locator('s')).toContainText('Durchgestrichener Text')

      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Exportieren' }).click()
      const download = await downloadPromise
      const fs = await import('node:fs/promises')
      const buffer = await fs.readFile((await download.path())!)

      // (a) unabhängige XML-Prüfung der TATSÄCHLICH heruntergeladenen Datei (ohne eigenen Reader):
      const xml = await (await JSZip.loadAsync(buffer)).file(f.part)!.async('text')
      expect(xml).toContain('Durchgestrichener Text')
      expect(xml).toMatch(f.needle)

      // (b) PFLICHT-Re-Import über die UI (das, was R-7 fehlt; Anforderung §5.1 / DoD 3):
      await page.getByRole('button', { name: /formate/i }).click()
      await f.card(page).locator('input[type="file"]').setInputFiles({ name: `rt.${f.ext}`, mimeType: f.mime, buffer })
      await expect(page.locator('.ProseMirror s')).toContainText('Durchgestrichener Text')
    })
  }

  test('Testfall 24: reale, app-fremde ODT (character-styles.odt) importieren -> Export -> Strike erhalten', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    const fs = await import('node:fs/promises')
    const buffer = await fs.readFile('tests/fixtures/external/odt/character-styles.odt')
    await odtCard(page).locator('input[type="file"]').setInputFiles({
      name: 'character-styles.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
    const editor = page.locator('.ProseMirror')
    await expect(editor.locator('s')).toContainText('Lorem ipsum')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const out = await fs.readFile((await (await downloadPromise).path())!)
    const contentXml = await (await JSZip.loadAsync(out)).file('content.xml')!.async('text')
    expect(contentXml).toContain('style:text-line-through-style="solid"')
    expect(contentXml).toContain('Lorem ipsum')
  })

  test('Testfall 25 / Grenzfall 1: hand-gebaute DOCX mit <w:strike w:val="0"/> ist NICHT durchgestrichen (erwartet RED bis Fix #1)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    const JSZipMod = (await import('jszip')).default
    const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
    const zip = new JSZipMod()
    zip.file('[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `</Types>`)
    zip.folder('_rels')!.file('.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
      `</Relationships>`)
    zip.folder('word')!.file('document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NS}><w:body>` +
      `<w:p><w:r><w:rPr><w:strike w:val="0"/></w:rPr><w:t>Geerbt ausgeschaltet</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`)
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })

    await docxCard(page).locator('input[type="file"]').setInputFiles({
      name: 'strike-val-0.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
    const editor = page.locator('.ProseMirror')
    await expect(editor).toContainText('Geerbt ausgeschaltet')
    await expect(editor.locator('s')).toHaveCount(0) // heute vermutlich FEHLSCHLAGEND (Bug bestätigt)
  })
})
```

### 6.3 Erweiterung: `tests/e2e/selection-regression.spec.ts` (Testfall 4)

Anforderung 3.9 verlangt denselben Selection-Sync-Nachweis für Durchgestrichen. Als neuen Test im
selben `describe` anhängen — **inklusive** der bereits im Bold-Pendant bewährten Regel B
(`waitForTimeout(50)` vor `Enter`):

```ts
test('gleiche Ctrl+A -> Format -> Reposition -> Enter Regression mit "Durchgestrichen" (Testfall 4)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Durchgestrichen').click()
  await editor.click()
  await page.keyboard.press('End')
  await page.waitForTimeout(50) // Regel B: async selectionchange landet vor Enter
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
})
```

### 6.4 Icon-Rendering (Testfall 31)

`toHaveScreenshot`-Vergleich der Button-Reihe (F/K/U/S). „S" ist ein gewöhnlicher lateinischer
Buchstabe (kein Symbol-/Emoji-Glyph), in jeder Systemschrift von F/K/U unterscheidbar; die
CSS-`line-through` auf dem Buchstaben ist rein dekorativ. Erwartung GREEN. Kein Codepfad-Risiko —
reine Absicherung über Font-Varianten.

### 6.5 Ausführung

```
npm run test:e2e -- strike.spec.ts
npm run test:e2e -- selection-regression.spec.ts
```

Report: `playwright-report/index.html`; Fehlschläge + Trace unter `test-results/`.

---

## 7. Fixture-Inventar (durch eigene Prüfung bestätigt)

**DOCX** (Apache-POI-Korpus): **0** Dateien mit `w:strike`/`w:dstrike`. Testfall 25 daher über
hand-gebautes XML (5.2/6.2); für Testfall 23 (reale Fremddatei) fehlt ein Kandidat → Blocker §11.

**ODT** (`tests/fixtures/external/odt/`, per `ls` bestätigt vorhanden):

| Datei | `text-line-through-style` | `type` | Text |
|---|---|---|---|
| `character-styles.odt` | `solid` (`T11`,`T12`), `none` (`T13`) | `single`(T11), `double`(T12), `none`(T13) | „Lorem ipsum"(T11), „Lorem ipsum"(T12), „lor sit "(T13) |
| `feature_attributes_character_MSO15.odt` | `solid` | u. a. `double` | ≥1 durchgestrichener Lauf |
| `listStyleId.odt` | `solid` | — | ≥1 durchgestrichener Lauf |
| `compdocfileformat.odt`, `excelfileformat.odt`, `HeaderFooter.odt`, `OOStyledTable.odt` | ausschließlich `none` | — | Regressionsnetz Grenzfall 2 |

`character-styles.odt` ist der **Primär-Fixture**: eine reale Datei deckt `single`/`double`/`none`
an unterscheidbarem Text ab (Unit 5.3 **und** E2E 6.2 Testfall 24).

---

## 8. Risikobewertung — Verdachtsmomente (`durchgestrichen-req.md` §6)

| # | Verdachtsmoment | QA-Einstufung | Beleg |
|---|---|---|---|
| 1 | DOCX-Import ignoriert `w:val` | **Bestätigt, offen** | `reader.ts:107` unverändert; Test 5.2/6.2 |
| 2 | Doppelstrich asymmetrisch | **Bestätigt, bewusster Fallback** | Test 5.2/5.3 (kein Crash/Verlust) |
| 3 | `aria-pressed` nur aus `$from.marks()` | **Bestätigt, offen** | `Toolbar.tsx:69`; Test 5.5/6.2 (TF 11/12) |
| 4 | `strike`+andere Marks ungetestet | **Bestätigt, geschlossen** | `roundtrip.test.ts`-Erw. 5.4 |
| 5 | `strike` in Tabelle/Liste/Überschrift ungetestet | **Bestätigt, geschlossen** | 5.4 + E2E 13/14/15 |
| 6 | Re-Import in E2E fehlt (nur XML), kein ODT-Pendant | **Bestätigt, geschlossen** | 6.2 „Rundreisen mit Re-Import" (DOCX+ODT) |
| 7 | Unabhängiger Parser assertiert Strike nicht | **Bestätigt, geschlossen** | 5.7 (beide `external-validation`) |
| 8 | Kein Tastenkürzel, undokumentiert | **Bestätigt, offen** | Keymap unverändert; Test 6.2 TF 32 |
| 9 | Icon „S" Rendering-Risiko | **Kein echter Fund** | 6.4 (Screenshot-Absicherung) |

---

## 9. Grenzfälle (`durchgestrichen-req.md` §4) — Abdeckungs-Mapping

| Grenzfall | Testartefakt | Status |
|---|---|---|
| 1 (`w:val="false"/"0"`) | `docx/__tests__/strike.test.ts`, `strike.spec.ts` TF 25 | **RED bis Fix #1** |
| 2 (`="none"`) | `odt/__tests__/strike.test.ts` | GREEN |
| 3 (doppelte Durchstreichung) | `docx`/`odt` `strike.test.ts` | GREEN (dokumentierter Fallback) |
| 4 (leere Selektion) | `strike.spec.ts` „Toggle im leeren Absatz" | GREEN |
| 5 (Formatierungsgrenze) | `strike.spec.ts` TF 7 | GREEN |
| 6 (Copy/Paste extern) | `strike.spec.ts` TF 17 | GREEN |
| 7 (Unterstrichen + Durchgestrichen) | `strike.spec.ts` TF 8/9 (`<u>` und `<s>` je Count 1) | GREEN |
| 8 (Kopf-/Fußzeile) | — | **Nicht testbar** (keine UI), Blocker §11 |
| 9 (lange Selektion) | `strike.spec.ts` TF 33 | GREEN |
| 10 (Mehrfachklick) | `strike.spec.ts` TF 34 | GREEN |
| 11 (`aria-pressed` Nicht-Uniform) | `commands.test.ts`, `strike.spec.ts` TF 11 | **RED bis Fix #3** |
| 12 (`storedMarks` leere Schreibmarke) | `commands.test.ts` | **RED bis Fix #3** |
| 13 (Track-Changes-Zukunftsfall) | nur Dokumentationspflicht | erfüllt durch `code.md` §9 |

---

## 10. Abnahme-Checkliste (Definition of Done, `durchgestrichen-req.md` §8)

| DoD-Punkt | Erfüllt durch diesen Plan? |
|---|---|
| 1. Alle Testfälle §7 ausgeführt und dokumentiert | Plan deckt TF 1–35 ab (§4); **Ausführung** ist nachgelagert (`npm test` + `npm run test:e2e`) — Ergebnis nachtragen |
| 2. Jedes Risiko eingestuft | §8 — alle 9 Punkte eingestuft |
| 3. Mind. ein dauerhafter E2E mit Klick **+ Re-Import**, DOCX **und** ODT | 6.2 „Rundreisen mit Re-Import" (beide Formate) + 6.3 |
| 4. Rundreise DOCX+ODT inkl. Cross-Format + reale Fremddatei + gezielte unabh. Validierung | ODT real vollständig (`character-styles.odt`); Cross-Format als Unit (5.6); unabh. Validierung 5.7; **DOCX-Realdatei** offen (Blocker §11) |
| 5. Tastenkürzel-Entscheidung getroffen/umgesetzt | Entscheidung `Mod-Shift-x` in `code.md` 3.5; **Umsetzung im Code steht laut §1 noch aus** |
| 6. Aktiv-Zustand berücksichtigt `storedMarks`/Selektion | Fix #3 (`markActive`) + Test 5.5; **Umsetzung steht laut §1 noch aus** |

**QA-Gesamturteil (aktueller Stand):** „Durchgestrichen" ist **noch nicht** vertrauenswürdig im
Sinne von §8, da drei der vier Fixes nachweislich nicht im Code sind. Dieser Plan liefert die
Tests, mit denen der RED→GREEN-Übergang nach Umsetzung objektiv belegt wird.

---

## 11. Offene Punkte / Blocker

1. **Kein realer DOCX-Fixture mit Durchstreichung** (§7) — Testfall 23 / Rundreise-Punkt 9 sind
   mit den vorhandenen DOCX-Dateien nicht mit einer *echten* Fremddatei erfüllbar. Empfehlung
   (auch `code.md` §9): eine kleine, mit echtem Word erzeugte `.docx` unter
   `tests/fixtures/external/docx/` ergänzen (Herkunft/Lizenz in `tests/fixtures/external/README.md`).
   Bis dahin deckt Testfall 25 den Grenzfall **synthetisch** ab.
2. **Kein Cross-Format-Export in der UI** — „Exportieren" exportiert immer das geöffnete Format
   (`DocumentWorkspace.tsx`; identische Feststellung in `cut.spec.ts` Rundreise 4/5). Ein Upload
   der falschen Endung in die andere Karte läuft durch deren Reader und schlägt fehl
   (`setInputFiles` umgeht zwar das `accept`-Attribut, nicht aber die formatspezifische
   Verarbeitung). Cross-Format (Testfälle 20–22) ist deshalb **nur auf Unit-Ebene** deterministisch
   prüfbar (5.6). Sobald ein „Exportieren als …"-Steuerelement existiert, ist ein echter
   Cross-Format-E2E nachzurüsten.
3. **Unabhängige Parser-Validierung ohne Python-Toolchain** — die Suite prüft den exportierten
   XML-String (mammoth für DOCX, `text-line-through`-Assertion + ODF-Schemaprüfung für ODT, 5.7),
   ohne den eigenen Reader erneut zu verwenden. Das erfüllt die Anforderung automatisiert.
   Zusätzlich empfohlen: eine exportierte Datei einmalig in echtem Word/LibreOffice öffnen und den
   Sichtbefund nachtragen, bevor der Status auf „verifiziert" wechselt.
4. **Kopf-/Fußzeilen** (Grenzfall 8) — keine UI zum Bearbeiten. Als „nicht testbar" vermerkt (wie
   von der Anforderung verlangt), nicht stillschweigend ausgelassen.

---

## 12. Nächste Schritte (Verantwortung Dev, zur Kenntnis an Lead/PO)

1. Die vier Fixes aus `durchgestrichen-code.md` (3.1 `w:val`, 3.5 `Mod-Shift-x`, 3.6 `markActive`,
   optional 3.2 `<w:rPr>`-Reihenfolge) tatsächlich in den Code bringen (laut §1 noch **nicht**
   geschehen).
2. Testdateien aus Abschnitt 5/6 anlegen bzw. erweitern.
3. `npm test` und `npm run test:e2e -- strike.spec.ts selection-regression.spec.ts` ausführen.
4. RED→GREEN-Übergang der in §1/§4/§5.8 als „erwartet RED" markierten Tests hier festhalten, bevor
   der Backlog-Status von „vorhanden" auf „verifiziert" wechselt (Anforderung §8).
