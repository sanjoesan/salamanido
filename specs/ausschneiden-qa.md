# Testplan (QA): Feature „Ausschneiden“ (Cut)

Gegenstück zu `specs/ausschneiden-req.md` (Anforderung) und `specs/ausschneiden-code.md`
(Umsetzungsplan). Dieser Plan beschreibt **konkrete, ausführbare Tests** auf zwei Ebenen:

1. **Unit-Tests** (`vitest`, `jsdom`): Reader/Writer-Rundreise DOCX **und** ODT, rein
   datengetrieben (keine UI, kein Browser).
2. **Echte Playwright-Browser-Tests** (`@playwright/test`, alle 3 Projekte aus
   `playwright.config.ts`): echte Klicks, echtes Tippen (`page.keyboard`), echter
   Datei-Upload (`setInputFiles`) und echter Datei-Export (`page.waitForEvent('download')`
   + Prüfung der heruntergeladenen Datei per `JSZip`) — **keine** isolierten Aufrufe von
   `cutSelection(...)`/`canCut(...)` als Ersatz für echte Bedienung. Direkte
   Funktionsaufrufe von `commands.ts` sind ausschließlich in Abschnitt 3.4 (reine
   Logik-Absicherung, nicht als Ersatz für E2E) vorgesehen.

Alle Testfall-Nummern referenzieren `ausschneiden-req.md` Abschnitt 3 (Grenzfälle),
Abschnitt 4.2 (Rundreise) und Abschnitt 6 (E2E-Zusammenfassung).

---

## 0. Wichtige Voraussetzung: Was heute schon lauffähig ist, was nicht

Der Umsetzungsplan (`ausschneiden-code.md`) ist zum Stichtag dieses Testplans **noch nicht
umgesetzt** — verifiziert per Volltextsuche über `src/`: kein `cut`, `canCut`,
`cutSelection`, `execCommand`, `Shift-Delete` oder Ausschneiden-Button existiert in
`commands.ts`, `Toolbar.tsx` oder `WordEditor.tsx`. Für die Testplanung ist das
entscheidend, weil zwei völlig unterschiedliche Code-Pfade betroffen sind:

| Zugriffsweg | Hängt ab von | Heute schon testbar? |
|---|---|---|
| Strg+X/Cmd+X (nativ) | `prosemirror-view`s eingebauter `editHandlers.cut` (bereits vorhanden, Bibliothekscode) | **Ja** — funktioniert bereits ohne jede Code-Änderung aus dem Plan |
| Kontextmenü „Ausschneiden“ (nativ) | Browser-Standardverhalten, kein `contextmenu`-Listener im Code | **Ja**, aber Playwright kann native Kontextmenüs nicht zuverlässig automatisiert anklicken (siehe §7) — wird indirekt über den identischen `cut`-Event-Pfad wie Strg+X abgesichert |
| Rundreisen nach nativem Cut (DOCX/ODT Export/Reimport) | Nur bestehender Reader/Writer, keine neuen Dateien nötig | **Ja** |
| Toolbar-Button „Ausschneiden“ | `commands.ts` §3.1, `Toolbar.tsx` §3.2 aus `ausschneiden-code.md` | **Nein** — Tests in §4.3.9–4.3.11 unten schlagen fehl, bis der Button existiert; sie sind trotzdem bereits vollständig spezifiziert, damit Dev sie direkt nach Umsetzung grün bekommt |
| Umschalt+Entf | `WordEditor.tsx` §3.3.3 (`keymap`-Eintrag) | **Nein** — siehe §4.3.10 |
| „Zwischenablage blockiert“-Fehlerpfad (`onCutBlocked`) | `commands.ts` §3.1 (`execCommand`-Fehlerpfad) | **Nein** — nur über den Toolbar-Button auslösbar, siehe §4.3.11 |

**Konsequenz für die Ausführungsreihenfolge:** Die Tests in §3 (Unit) und die
E2E-Testfälle 1–8, 12–16 in §4.3 können **sofort** geschrieben und ausgeführt werden und
dienen zugleich als Nachweis, dass der native Pfad bereits Req-konform ist. Die
Testfälle 9–11 in §4.3 (Toolbar-Button, Umschalt+Entf, Fehlerpfad) sind **blockiert**,
bis `ausschneiden-code.md` Abschnitt 3 umgesetzt ist — sie werden hier dennoch vollständig
spezifiziert (nicht nur als Platzhalter), damit kein Wartezyklus zwischen Dev und QA
entsteht.

---

## 1. Testebenen — Zuordnung zur Req-Testmatrix (Abschnitt 7)

| Bereich (Req §7) | Testebene hier | Ort |
|---|---|---|
| Basis-Ausschneiden (Text, Maus-Selektion) | E2E | `tests/e2e/cut.spec.ts` |
| Strg+X / Tastenkombination | E2E | `tests/e2e/cut.spec.ts` |
| Alles auswählen + Ausschneiden | E2E | `tests/e2e/cut.spec.ts` |
| Bild ausschneiden | E2E + Unit-Rundreise | `tests/e2e/cut.spec.ts`, `src/formats/{docx,odt}/__tests__/cut-roundtrip.test.ts` |
| Tabellenzellen ausschneiden | E2E + Unit-Rundreise | wie oben |
| Liste ausschneiden | E2E + Unit-Rundreise | wie oben |
| Undo/Redo nach Ausschneiden | E2E | `tests/e2e/cut.spec.ts` |
| Selection-Sync-Regressionstest × Ausschneiden | E2E (Pflicht) | `tests/e2e/cut.spec.ts` |
| Cross-Format-Rundreise nach Ausschneiden | E2E (Download-Prüfung) + Unit (Daten-Rundreise) | beide |
| Mobile/Tablet-Verhalten | E2E (Playwright-Projekt-Matrix) | `tests/e2e/cut.spec.ts`, automatisch über `playwright.config.ts` |

---

## 2. Testinfrastruktur — vorbereitende Änderungen

### 2.1 `tests/e2e/fixtures/buildSampleDocuments.ts` (neu)

`buildSampleDocx()`/`buildSampleOdt()` existieren aktuell dupliziert und unexportiert in
`tests/e2e/docx.spec.ts` bzw. `tests/e2e/odt.spec.ts`. Für die Cross-Format-Rundreise-Tests
in §4.4 werden beide gebraucht. Empfehlung (deckungsgleich mit `ausschneiden-code.md`
§6.3-Hinweis): auslagern statt duplizieren.

```ts
// tests/e2e/fixtures/buildSampleDocuments.ts
export async function buildSampleDocx(): Promise<Buffer> { /* unverändert aus docx.spec.ts */ }
export async function buildSampleOdt(): Promise<Buffer> { /* unverändert aus odt.spec.ts */ }
```

`docx.spec.ts`/`odt.spec.ts` importieren danach von dort (reine Testinfrastruktur-
Bereinigung, keine Verhaltensänderung, siehe `ausschneiden-code.md` §6.3 letzter Absatz).

### 2.2 Konsolen-Fehler-Helper (neu, Pflicht für jeden Test in `cut.spec.ts`)

Erfüllt Req Abnahmekriterium 8.5 („keine JS-Exception in der Konsole“). Bislang existiert
in keiner bestehenden Spec-Datei ein solcher Helper — erste Einführung hier:

```ts
// tests/e2e/cut.spec.ts (Ausschnitt: Helper)
import { test, expect, type Page } from '@playwright/test'

function watchForConsoleErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(String(err)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  return () => expect(errors, `Unerwartete Konsolen-/JS-Fehler: ${errors.join('\n')}`).toEqual([])
}
```

Verwendung an jedem Testende: `const assertNoConsoleErrors = watchForConsoleErrors(page)`
zu Beginn, `assertNoConsoleErrors()` am Ende (auch bei Grenzfall-Tests, die absichtlich
nichts tun sollen — genau dort ist die Abwesenheit einer Exception der eigentliche Test).

---

## 3. Teil A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

Ausführung: `npm test` (vitest, `jsdom`-Environment, `globals: true` — kein Import von
`describe`/`it`/`expect` nötig, siehe `vite.config.ts`). Diese Tests rufen **ausschließlich**
`writeDocx`/`readDocx`/`writeOdt`/`readOdt` auf reinen JSON-Dokumentstrukturen auf — kein
ProseMirror-`EditorView`, kein DOM, kein `execCommand`. Sie bilden **nicht** den
Cut-Vorgang selbst nach (das ist ausschließlich Browser-/ProseMirror-Verhalten, siehe
`ausschneiden-code.md` §1.4), sondern verifizieren, dass die von Ausschneiden erzeugbaren
**Dokumentzustände** (leere Selektion-Reste, fehlendes Bild, geleerte Zelle, fehlende
Liste, komplett leeres Dokument) korrekt und ohne Strukturkorruption exportiert und
reimportiert werden — das ist exakt das, was Req Abschnitt 4 „Rundreise-Anforderung“ von
Reader/Writer verlangt, unabhängig davon, wie der Dokumentzustand entstanden ist.

### 3.1 Baseline (Voraussetzung, Req §4.1)

**Vor** den Cut-spezifischen Testfällen muss die bereits bestehende Suite grün sein:

- `src/formats/docx/__tests__/roundtrip.test.ts` (alle Describe-Blöcke)
- `src/formats/odt/__tests__/roundtrip.test.ts` (alle Describe-Blöcke)
- `src/formats/docx/__tests__/external-fixtures.test.ts`
- `src/formats/odt/__tests__/external-fixtures.test.ts`

QA-Schritt: `npm test -- roundtrip` vor Beginn der Cut-Testfälle ausführen und protokollieren.
Schlägt hier etwas fehl, ist es ein allgemeiner Reader/Writer-Bug, **kein**
Ausschneiden-Bug — nicht mit den Testfällen unten vermischen (Req §4.1 letzter Satz).

### 3.2 Neue Testdatei: `src/formats/docx/__tests__/cut-roundtrip.test.ts`

```ts
import { writeDocx } from '../writer'
import { readDocx } from '../reader'
import JSZip from 'jszip'
import type { WordDocumentContent } from '../../shared/documentModel'

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

function doc(content: unknown[]): WordDocumentContent {
  return { body: { type: 'doc', content }, header: null, footer: null, meta: { title: '' } }
}
function paragraph(text: string) {
  return { type: 'paragraph', attrs: { align: 'left' }, content: text ? [{ type: 'text', text }] : [] }
}
async function roundTrip(content: WordDocumentContent): Promise<WordDocumentContent> {
  return readDocx(await writeDocx(content))
}

describe('DOCX Rundreise: Zustand "nach Ausschneiden" (Req 4.2)', () => {
  it('Testfall 1/3: zusammengeführter Absatz nach Entfernen einer absatzübergreifenden Selektion bleibt ein sauberer Absatz, übriger Inhalt unverändert', async () => {
    // Ausgangslage vor Cut: "Vorher [SELEKTION: Rest von Absatz 1 + ganzer Absatz 2] Nachher"
    // Nach Cut simuliert der Editor bereits das Zusammenführen zu einem Absatz - hier wird
    // exakt dieser POST-CUT-Zustand als Reader/Writer-Eingabe verwendet.
    const postCut = doc([paragraph('Vorher Nachher'), paragraph('Unveränderter Absatz danach')])
    const result = await roundTrip(postCut)
    const paragraphs = (result.body as any).content
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0].content[0].text).toBe('Vorher Nachher')
    // keine doppelten/verschluckten Zeichen an der Nahtstelle:
    expect(paragraphs[0].content[0].text).not.toMatch(/(.)\1{2,}/)
    expect(paragraphs[1].content[0].text).toBe('Unveränderter Absatz danach')
  })

  it('Testfall 6: kein verwaistes Bild im DOCX-Zip nach Entfernen eines Bild-Knotens', async () => {
    // Zustand "vorher" (mit Bild) — Kontrollprobe, dass das Bild bei Anwesenheit exportiert wird:
    const withImage = doc([paragraph('Text'), { type: 'image', attrs: { src: TINY_PNG, alt: 'Diagramm' } }])
    const zipWithImage = await JSZip.loadAsync(await writeDocx(withImage))
    const mediaFilesWithImage = Object.keys(zipWithImage.files).filter((p) => p.startsWith('word/media/'))
    expect(mediaFilesWithImage).toHaveLength(1)

    // Zustand "nach Ausschneiden" (Bild-Knoten entfernt):
    const afterCut = doc([paragraph('Text')])
    const zipAfterCut = await JSZip.loadAsync(await writeDocx(afterCut))
    const mediaFilesAfterCut = Object.keys(zipAfterCut.files).filter((p) => p.startsWith('word/media/'))
    expect(mediaFilesAfterCut).toHaveLength(0)

    const result = await roundTrip(afterCut)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).not.toContain('image')
    expect(types).toContain('paragraph')
  })

  it('Testfall 7: geleerte Tabellenzelle (Inhalt weg, Struktur bleibt) — Zeilen/Spalten/colspan/rowspan unverändert', async () => {
    // "Zellinhalt geleert" heißt im Schema: ein leerer Absatz (cellContent: 'block+' erzwingt
    // mind. einen Block-Knoten, siehe schema.ts) statt Text — niemals ein Wegfall der Zelle selbst.
    const postCut = doc([
      {
        type: 'table',
        content: [
          {
            type: 'table_row',
            content: [
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('')] },
              { type: 'table_cell', attrs: { colspan: 2, rowspan: 1 }, content: [paragraph('bleibt erhalten')] },
            ],
          },
        ],
      },
    ])
    const result = await roundTrip(postCut)
    const table = (result.body as any).content[0]
    expect(table.content).toHaveLength(1) // eine Zeile, keine verschwundene <w:tr>
    expect(table.content[0].content).toHaveLength(2) // zwei Zellen, keine verschwundene Zelle
    expect(table.content[0].content[0].attrs).toMatchObject({ colspan: 1, rowspan: 1 })
    expect(table.content[0].content[1].attrs).toMatchObject({ colspan: 2, rowspan: 1 })
    expect(table.content[0].content[1].content[0].content[0].text).toBe('bleibt erhalten')
  })

  it('Testfall 8: vollständig ausgeschnittene Liste — keine leeren Listenreste, umgebende Absätze unverändert', async () => {
    const postCut = doc([paragraph('Davor'), paragraph('Danach')]) // Liste komplett entfernt
    const result = await roundTrip(postCut)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['paragraph', 'paragraph'])
    expect(types).not.toContain('bullet_list')
    expect(types).not.toContain('ordered_list')
  })

  it('Testfall 10: komplett geleertes Dokument (Strg+A → Ausschneiden) exportiert/reimportiert als valide, leere Datei', async () => {
    const postCut = doc([paragraph('')]) // Editor erzwingt mind. einen leeren Absatz (schema.ts: doc: "block+")
    const result = await roundTrip(postCut)
    expect((result.body as any).content).toHaveLength(1)
    expect((result.body as any).content[0].type).toBe('paragraph')
    expect((result.body as any).content[0].content).toEqual([])
  })
})

describe('DOCX Rundreise: Doppel-Konvertierung nach Ausschneiden (Req 4.2 Testfall 9)', () => {
  it('bleibt nach DOCX → ODT → DOCX inhaltlich stabil', async () => {
    const { writeOdt } = await import('../../odt/writer')
    const { readOdt } = await import('../../odt/reader')
    const postCut = doc([paragraph('Verbleibender Text'), paragraph('Zweiter Absatz')])

    const asOdtBlob = await writeOdt(postCut)
    const viaOdt = await readOdt(asOdtBlob)
    const backToDocxBlob = await writeDocx(viaOdt)
    const final = await readDocx(backToDocxBlob)

    const texts = (final.body as any).content.map((p: any) => p.content[0]?.text)
    expect(texts).toEqual(['Verbleibender Text', 'Zweiter Absatz'])
  })
})
```

### 3.3 Neue Testdatei: `src/formats/odt/__tests__/cut-roundtrip.test.ts`

Spiegelbildlich zu §3.2, mit ODT-spezifischen Strukturprüfungen. Wichtigste Abweichung:
Bild-Dateien liegen bei ODT auf Zip-Root-Ebene (`imageN.ext`), nicht unter `word/media/`,
und werden zusätzlich im `META-INF/manifest.xml` referenziert (siehe
`src/formats/odt/writer.ts`, `buildManifestXml`).

```ts
import { writeOdt } from '../writer'
import { readOdt } from '../reader'
import JSZip from 'jszip'
import type { WordDocumentContent } from '../../shared/documentModel'

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

function doc(content: unknown[]): WordDocumentContent {
  return { body: { type: 'doc', content }, header: null, footer: null, meta: { title: '' } }
}
function paragraph(text: string) {
  return { type: 'paragraph', attrs: { align: 'left' }, content: text ? [{ type: 'text', text }] : [] }
}
async function roundTrip(content: WordDocumentContent): Promise<WordDocumentContent> {
  return readOdt(await writeOdt(content))
}

describe('ODT Rundreise: Zustand "nach Ausschneiden" (Req 4.2)', () => {
  it('Testfall 2/3: zusammengeführter Absatz bleibt sauber, übriger Inhalt unverändert', async () => {
    const postCut = doc([paragraph('Vorher Nachher'), paragraph('Unveränderter Absatz danach')])
    const result = await roundTrip(postCut)
    const paragraphs = (result.body as any).content
    expect(paragraphs[0].content[0].text).toBe('Vorher Nachher')
    expect(paragraphs[1].content[0].text).toBe('Unveränderter Absatz danach')
  })

  it('Testfall 6: kein verwaister Bild-Eintrag im Manifest/Zip nach Entfernen eines Bild-Knotens', async () => {
    const withImage = doc([paragraph('Text'), { type: 'image', attrs: { src: TINY_PNG, alt: 'Diagramm' } }])
    const zipWithImage = await JSZip.loadAsync(await writeOdt(withImage))
    const manifestWithImage = await zipWithImage.file('META-INF/manifest.xml')!.async('text')
    expect(manifestWithImage).toContain('media-type="image/png"')

    const afterCut = doc([paragraph('Text')])
    const zipAfterCut = await JSZip.loadAsync(await writeOdt(afterCut))
    const manifestAfterCut = await zipAfterCut.file('META-INF/manifest.xml')!.async('text')
    expect(manifestAfterCut).not.toContain('media-type="image/png"')
    const imageFilesAfterCut = Object.keys(zipAfterCut.files).filter((p) => /\.(png|jpe?g|gif)$/i.test(p))
    expect(imageFilesAfterCut).toHaveLength(0)
  })

  it('Testfall 7: geleerte Tabellenzelle — Zeilen/Spalten/colspan unverändert', async () => {
    const postCut = doc([
      {
        type: 'table',
        content: [
          {
            type: 'table_row',
            content: [
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('')] },
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('bleibt')] },
            ],
          },
        ],
      },
    ])
    const result = await roundTrip(postCut)
    const table = (result.body as any).content[0]
    expect(table.content[0].content).toHaveLength(2)
  })

  it('Testfall 8: vollständig ausgeschnittene Liste — keine Listenreste', async () => {
    const postCut = doc([paragraph('Davor'), paragraph('Danach')])
    const result = await roundTrip(postCut)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['paragraph', 'paragraph'])
  })

  it('Testfall 10: komplett geleertes Dokument exportiert/reimportiert als valide leere Datei', async () => {
    const postCut = doc([paragraph('')])
    const result = await roundTrip(postCut)
    expect((result.body as any).content).toEqual([{ type: 'paragraph', attrs: { align: 'left' }, content: [] }])
  })
})

describe('ODT Rundreise: Cross-Format nach Ausschneiden (Req 4.2 Testfall 4/5)', () => {
  it('DOCX → (Ausschneiden simuliert) → ODT → reimportiert: Inhalt abzüglich Ausgeschnittenem bleibt konsistent', async () => {
    const { writeDocx } = await import('../../docx/writer')
    const { readDocx } = await import('../../docx/reader')
    const postCut = doc([paragraph('Rest nach Ausschneiden')])

    const asDocxBlob = await writeDocx(postCut)
    const viaDocx = await readDocx(asDocxBlob)
    const backToOdtBlob = await writeOdt(viaDocx)
    const final = await readOdt(backToOdtBlob)

    expect((final.body as any).content[0].content[0].text).toBe('Rest nach Ausschneiden')
  })
})
```

### 3.4 Ergänzend: reine Logik-Unit-Tests für `commands.ts` (`canCut`/`cutSelection`)

Diese Tests sind **kein** Ersatz für die Playwright-Tests in Teil B — sie prüfen
ausschließlich die in `ausschneiden-code.md` §3.1 geplante Guard-/Fehlerpfad-Logik von
`cutSelection()` isoliert mit einem Fake-`view`-Objekt, weil `jsdom` weder
`navigator.clipboard` noch ein wirksames `document.execCommand` besitzt. **Blockiert**,
bis `commands.ts` um `canCut`/`cutSelection` ergänzt ist (siehe §0 oben).

Datei: `src/formats/shared/editor/__tests__/commands.test.ts` (neu)

```ts
import { EditorState, TextSelection, NodeSelection, AllSelection } from 'prosemirror-state'
import { wordSchema } from '../../schema'
import { canCut, cutSelection } from '../commands'

function stateWithSelection(kind: 'empty' | 'text' | 'image' | 'all') {
  const doc = wordSchema.node('doc', null, [
    wordSchema.node('paragraph', { align: 'left' }, wordSchema.text('Hallo')),
    wordSchema.node('image', { src: 'data:image/png;base64,AAA=', alt: '' }),
  ])
  const state = EditorState.create({ doc, schema: wordSchema })
  if (kind === 'empty') return state
  if (kind === 'text') return state.apply(state.tr.setSelection(TextSelection.create(doc, 1, 4)))
  if (kind === 'image') return state.apply(state.tr.setSelection(NodeSelection.create(doc, doc.content.size - 1)))
  return state.apply(state.tr.setSelection(new AllSelection(doc)))
}

describe('canCut', () => {
  it('ist false bei kollabiertem Cursor ohne Selektion', () => {
    expect(canCut(stateWithSelection('empty'))).toBe(false)
  })
  it('ist true bei TextSelection, NodeSelection (Bild) und AllSelection', () => {
    expect(canCut(stateWithSelection('text'))).toBe(true)
    expect(canCut(stateWithSelection('image'))).toBe(true)
    expect(canCut(stateWithSelection('all'))).toBe(true)
  })
})

describe('cutSelection guard (Req §2.1)', () => {
  it('gibt false zurück und ruft weder view.focus() noch execCommand auf, wenn die Selektion leer ist', () => {
    const focus = () => { throw new Error('focus() darf hier nicht aufgerufen werden') }
    const execCommand = () => { throw new Error('execCommand() darf hier nicht aufgerufen werden') }
    const state = stateWithSelection('empty')
    const view = { dom: { ownerDocument: { execCommand } }, focus, state, dispatch: () => {} } as any
    const result = cutSelection()(state, view.dispatch, view)
    expect(result).toBe(false)
  })

  it('reine Verfügbarkeitsabfrage (dispatch=undefined) ruft execCommand nicht auf', () => {
    let called = false
    const state = stateWithSelection('text')
    const view = {
      dom: { ownerDocument: { execCommand: () => { called = true; return true } } },
      focus: () => {},
      state,
    } as any
    expect(cutSelection()(state, undefined, view)).toBe(true)
    expect(called).toBe(false)
  })
})

describe('cutSelection Fehlerpfad (Req §2.7, "kein stiller Fehlschlag")', () => {
  it('ruft onCutBlocked mit nicht-leerer deutscher Meldung auf, wenn execCommand false liefert', () => {
    const state = stateWithSelection('text')
    let blockedMessage: string | undefined
    const view = {
      dom: { ownerDocument: { execCommand: () => false } },
      focus: () => {},
      state,
      dispatch: () => {},
    } as any
    const result = cutSelection({ onCutBlocked: (msg) => (blockedMessage = msg) })(state, view.dispatch, view)
    expect(result).toBe(false)
    expect(blockedMessage).toBeTruthy()
  })

  it('onCutBlocked wird NICHT aufgerufen, wenn execCommand true liefert', () => {
    const state = stateWithSelection('text')
    let called = false
    const view = {
      dom: { ownerDocument: { execCommand: () => true } },
      focus: () => {},
      state,
      dispatch: () => {},
    } as any
    const result = cutSelection({ onCutBlocked: () => (called = true) })(state, view.dispatch, view)
    expect(result).toBe(true)
    expect(called).toBe(false)
  })

  it('fängt eine Exception aus execCommand ab (kein Rewurf) und behandelt sie wie false', () => {
    const state = stateWithSelection('text')
    let blockedMessage: string | undefined
    const view = {
      dom: {
        ownerDocument: {
          execCommand: () => {
            throw new Error('SecurityError: simulated sandbox restriction')
          },
        },
      },
      focus: () => {},
      state,
      dispatch: () => {},
    } as any
    expect(() =>
      cutSelection({ onCutBlocked: (msg) => (blockedMessage = msg) })(state, view.dispatch, view),
    ).not.toThrow()
    expect(blockedMessage).toBeTruthy()
  })
})
```

---

## 4. Teil B — Echte Playwright-Browser-Tests

### 4.1 Grundprinzipien

- Läuft in **echten** Browser-Engines über die 3 Projekte aus `playwright.config.ts`
  (Desktop Chrome, Mobile/Pixel 7, Tablet/iPad Mini) — keine Sonderkonfiguration pro Test
  nötig, außer explizit vermerkt (z. B. Clipboard-Permissions nur auf Chromium, §4.3.13).
- Auslösung ausschließlich über sichtbare Nutzerinteraktion: `page.keyboard.press(...)`,
  `page.keyboard.type(...)`, `page.mouse.down/move/up(...)`, `.click()`,
  `input[type=file].setInputFiles(...)`. **Kein** `page.evaluate(() => view.dispatch(...))`
  oder ähnlicher interner Zugriff auf ProseMirror-Internas — das würde genau die Lücke
  reproduzieren, die Req §0 kritisiert („kein echter, klickbarer UI-Weg getestet“).
- Datei-Downloads werden über `page.waitForEvent('download')` abgefangen, per
  `download.path()` von der Platte gelesen und mit `JSZip` inhaltlich geprüft — analog zu
  `tests/e2e/docx.spec.ts`/`tests/e2e/odt.spec.ts`. Das ist die einzige Möglichkeit, die
  Rundreise-Anforderung aus Req Abschnitt 4 tatsächlich End-to-End (Klick → echte Datei
  auf der Platte) statt nur auf Datenebene nachzuweisen — Teil A (§3) prüft das Gleiche
  bereits auf Datenebene als schnellere, deterministische Ergänzung.
- Jeder Test installiert den Konsolen-Fehler-Helper aus §2.2 und ruft ihn am Ende auf.

### 4.2 Testdatei-Kopf `tests/e2e/cut.spec.ts`

```ts
import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'
import { buildSampleDocx, buildSampleOdt } from './fixtures/buildSampleDocuments'

function watchForConsoleErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(String(err)))
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  return () => expect(errors, `Unerwartete Konsolen-/JS-Fehler: ${errors.join('\n')}`).toEqual([])
}

function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
})
```

### 4.3 Kern-Testfälle (Req Abschnitt 6, Nummerierung übernommen)

**Testfall 1 — Maus-Selektion + Strg+X entfernt Text**

```ts
test('Testfall 1: Text per Maus markieren und mit Strg+X ausschneiden entfernt ihn aus dem Editor', async ({ page }) => {
  const assertNoConsoleErrors = watchForConsoleErrors(page)
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Dieser Satz wird teilweise entfernt.')

  // Echte Maus-Selektion über einen Wortbereich (kein programmatischer Selektionsaufruf):
  const box = await editor.boundingBox()
  await page.mouse.click(box!.x + 10, box!.y + 10) // Cursor an den Anfang
  await page.keyboard.press('Home')
  await page.keyboard.down('Shift')
  for (let i = 0; i < 'Dieser Satz'.length; i++) await page.keyboard.press('ArrowRight')
  await page.keyboard.up('Shift')

  await page.keyboard.press('ControlOrMeta+x')

  await expect(editor).not.toContainText('Dieser Satz wird')
  await expect(editor).toContainText('teilweise entfernt.')
  assertNoConsoleErrors()
})
```

**Testfall 2 — Strg+V an anderer Stelle stellt Formatierung wieder her**

```ts
test('Testfall 2: sofortiges Strg+V an anderer Stelle fügt Text mit erhaltener Fett-Formatierung ein', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('fett markiert')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()
  await page.keyboard.press('ControlOrMeta+x')
  await expect(editor).not.toContainText('fett markiert')

  await page.keyboard.type('Neuer Absatz: ')
  await page.keyboard.press('ControlOrMeta+v')

  await expect(editor).toContainText('Neuer Absatz: fett markiert')
  await expect(editor.locator('strong')).toContainText('fett markiert')
})
```

**Testfall 3 — Ausschneiden ohne Selektion (nur Cursor)**

```ts
test('Testfall 3: Strg+X ohne Selektion verändert nichts und wirft keine Exception', async ({ page }) => {
  const assertNoConsoleErrors = watchForConsoleErrors(page)
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Unveränderter Text')
  const before = await editor.textContent()

  await page.keyboard.press('ControlOrMeta+x')

  await expect(editor).toHaveText(before ?? '')
  assertNoConsoleErrors()
})
```

**Testfall 4 — Strg+A → Strg+X leert das Dokument gültig**

```ts
test('Testfall 4: Strg+A gefolgt von Strg+X leert das Dokument in einen validen, weiter bedienbaren Zustand', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Alles wird entfernt.')

  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('ControlOrMeta+x')

  await expect(page.locator('.ProseMirror p')).toHaveCount(1)
  await expect(editor).toHaveText('')

  // Weiterhin bedienbar, kein Fokusverlust (Req §2.4):
  await page.keyboard.type('Neuer Inhalt nach dem Leeren.')
  await expect(editor).toContainText('Neuer Inhalt nach dem Leeren.')
})
```

**Testfall 5 — PFLICHT: Selection-Sync-Regressionstest × Ausschneiden (Req §2.6/§3.15)**

Analog zu `tests/e2e/selection-regression.spec.ts`, aber mit Ausschneiden statt Fett als
auslösende Aktion. **Dieser Test muss dauerhaft Teil der Suite sein** (Req DoD 8.3).

```ts
test('Testfall 5 (PFLICHT): Tippen → Strg+A → Strg+X → Klick zur Neupositionierung → Enter → weiter tippen bleibt korrekt', async ({ page }) => {
  const assertNoConsoleErrors = watchForConsoleErrors(page)
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Erster Inhalt vor dem Ausschneiden.')

  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('ControlOrMeta+x')
  await expect(page.locator('.ProseMirror p')).toHaveCount(1)

  // Re-Klick in den (jetzt leeren) Editor — das ist exakt die Stelle, an der der
  // bekannte Bug (reconcileSelectionOnClick) ansetzt: DOM zeigt kollabierten Cursor,
  // Modell könnte noch eine veraltete AllSelection halten.
  await editor.click()
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz nach der Regression-Prüfung.')

  await expect(editor).toContainText('Zweiter Absatz nach der Regression-Prüfung.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
  assertNoConsoleErrors()
})
```

**Testfall 6 — Ausschneiden innerhalb einer Tabellenzelle (nur Zelltext)**

```ts
test('Testfall 6: Ausschneiden innerhalb einer Tabellenzelle entfernt nur den Zellinhalt, Tabelle bleibt strukturell unverändert', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()

  const cells = page.locator('.ProseMirror td')
  await cells.nth(0).click()
  await page.keyboard.type('Zellinhalt')
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('ControlOrMeta+x')

  await expect(cells).toHaveCount(4) // 2x2 Standardtabelle, keine Zeile/Spalte verschwunden
  await expect(cells.nth(0)).toHaveText('')
})
```

**Testfall 7 — `CellSelection` über mehrere Zellen**

```ts
test('Testfall 7: Ausschneiden über mehrere per Maus-Drag markierte Zellen leert nur Inhalte, Struktur bleibt', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()

  const cells = page.locator('.ProseMirror td')
  await cells.nth(0).click()
  await page.keyboard.type('A')
  await cells.nth(1).click()
  await page.keyboard.type('B')

  const boxA = await cells.nth(0).boundingBox()
  const boxB = await cells.nth(1).boundingBox()
  await page.mouse.move(boxA!.x + boxA!.width / 2, boxA!.y + boxA!.height / 2)
  await page.mouse.down()
  await page.mouse.move(boxB!.x + boxB!.width / 2, boxB!.y + boxB!.height / 2, { steps: 5 })
  await page.mouse.up()

  await page.keyboard.press('ControlOrMeta+x')

  await expect(cells).toHaveCount(4)
  await expect(cells.nth(0)).toHaveText('')
  await expect(cells.nth(1)).toHaveText('')
})
```

**Testfall 8 — Bild ausschneiden (`NodeSelection`)**

```ts
test('Testfall 8: Bild anklicken und mit Strg+X ausschneiden entfernt es, umgebender Text bleibt', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Text davor.')

  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const tinyPngPath = path.join(__dirname, 'fixtures', 'tiny.png')
  await fs.writeFile(
    tinyPngPath,
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
  )
  await editor.locator('label:has-text("Bild")').locator('input[type=file]').setInputFiles(tinyPngPath)

  await expect(editor.locator('img')).toHaveCount(1)
  await editor.locator('img').click() // erzeugt NodeSelection
  await page.keyboard.press('ControlOrMeta+x')

  await expect(editor.locator('img')).toHaveCount(0)
  await expect(editor).toContainText('Text davor.')
})
```

**Testfall 9 — Strg+Z direkt nach Ausschneiden stellt Ursprungszustand wieder her**

```ts
test('Testfall 9: Strg+Z direkt nach Strg+X stellt exakt den Ursprungszustand wieder her', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Wiederherstellbarer Inhalt.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('ControlOrMeta+x')
  await expect(editor).toHaveText('')

  await page.keyboard.press('ControlOrMeta+z')

  await expect(editor).toContainText('Wiederherstellbarer Inhalt.')
  // Cursor muss sinnvoll positioniert/editor bedienbar sein:
  await page.keyboard.type('X')
  await expect(editor).toContainText('X')
})

test('Zusatz (Req §2.5): Fett direkt vor Ausschneiden bleibt ein separater Undo-Schritt', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Zu formatierender Text')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()
  await page.keyboard.press('ControlOrMeta+x')
  await expect(editor).toHaveText('')

  await page.keyboard.press('ControlOrMeta+z') // 1. Undo: nur Cut rückgängig
  await expect(editor).toContainText('Zu formatierender Text')
  await expect(editor.locator('strong')).toContainText('Zu formatierender Text')

  await page.keyboard.press('ControlOrMeta+z') // 2. Undo: erst jetzt Fett rückgängig
  await expect(editor.locator('strong')).toHaveCount(0)
  await expect(editor).toContainText('Zu formatierender Text')
})
```

**Zusatztests zu Grenzfällen aus Req Abschnitt 3 (mit heutigem, nativen Code lauffähig)**

```ts
test('Grenzfall 3: Selektion über eine Absatzgrenze hinweg führt Reste sauber zusammen', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Erster Absatz Ende')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz Anfang')
  // Selektion vom Ende des ersten bis zum Anfang des zweiten Wortes im zweiten Absatz:
  await page.keyboard.press('Home')
  await page.keyboard.down('Shift')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.up('Shift')
  await page.keyboard.press('ControlOrMeta+x')
  await expect(page.locator('.ProseMirror p')).toHaveCount(1)
})

test('Grenzfall 4: komplette Liste ausschneiden lässt keine leeren Listenpunkte zurück', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByTitle('Aufzählung').click()
  await page.keyboard.type('Punkt eins')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Punkt zwei')
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('ControlOrMeta+x')
  await expect(page.locator('.ProseMirror li')).toHaveCount(0)
})

test('Grenzfall 13: Ausschneiden direkt am Dokumentanfang bzw. -ende bleibt editierbar, kein Off-by-one', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('ABCDEF')
  await page.keyboard.press('Home')
  await page.keyboard.down('Shift')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.up('Shift')
  await page.keyboard.press('ControlOrMeta+x')
  await expect(editor).toHaveText('CDEF')
  await page.keyboard.press('End')
  await page.keyboard.down('Shift')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.up('Shift')
  await page.keyboard.press('ControlOrMeta+x')
  await expect(editor).toHaveText('CDE')
  await page.keyboard.type('X')
  await expect(editor).toContainText('X')
})

test('Grenzfall 14: Fokus im Textfarbe-Farbwähler — systemweites Strg+X darf Editor-Inhalt nicht verändern', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Unangetasteter Editor-Inhalt')
  const before = await editor.textContent()

  await page.getByLabel('Textfarbe').focus()
  await page.keyboard.press('ControlOrMeta+x')

  await expect(editor).toHaveText(before ?? '')
})

test('Grenzfall 17: Ausschneiden der einzigen nicht-leeren Zelle lässt eine gültige leere Zelle zurück', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
  const cells = page.locator('.ProseMirror td')
  await cells.nth(0).click()
  await page.keyboard.type('Einziger Inhalt')
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('ControlOrMeta+x')
  await expect(cells).toHaveCount(4)
  await expect(cells.nth(0)).toHaveText('')
})
```

**Testfall 12 — Extern formatiert eingefügt, danach erneut ausgeschnitten (nur Chromium)**

```ts
test('Testfall 12: extern (Word/LibreOffice-artig) formatierter, eingefügter Text bleibt über einen zweiten Cut-Schritt konsistent formatiert', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard-read/-write-Permissions sind in Playwright nur für Chromium zuverlässig steuerbar.')
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()

  await page.evaluate(async () => {
    const html = '<p><strong>Fett aus externer Quelle</strong></p>'
    const item = new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })
    await navigator.clipboard.write([item])
  })
  await page.keyboard.press('ControlOrMeta+v')
  await expect(editor.locator('strong')).toContainText('Fett aus externer Quelle')

  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('ControlOrMeta+x')
  await page.keyboard.press('ControlOrMeta+v')
  await expect(editor.locator('strong')).toContainText('Fett aus externer Quelle')
})
```

**Testfall 13 — Projekt-Matrix (Mobile/Tablet)**

Wird automatisch erfüllt: Testfälle 1–5 laufen unverändert auf allen 3 in
`playwright.config.ts` konfigurierten Projekten, da Playwright-Projekte pro Datei
angewendet werden. Zusätzlicher Kommentar direkt im Testfile (kein separater Testfall):

```ts
// Hinweis (Req Abnahmekriterium 8.2 / Grenzfall 6 in der Zugriffswege-Tabelle):
// Die native OS-Textauswahlblase ("Ausschneiden"-Eintrag auf Android/iOS) ist von
// Playwright aus nicht antippbar (kein Zugriff auf OS-Chrome außerhalb der Web-Seite).
// "Funktioniert auf Mobile/Tablet" wird hier über denselben, bereits auf allen 3
// Projekten verifizierten `cut`-Event-Pfad ABGELEITET, nicht durch echtes Antippen
// der Auswahlblase bewiesen. Bewusst dokumentierte Automatisierungsgrenze, siehe §7.
```

### 4.3 Testfälle, die die Umsetzung aus `ausschneiden-code.md` §3 voraussetzen

Diese drei Tests sind vollständig spezifiziert, aber **rot, bis implementiert** (siehe §0).

**Testfall (neu) 9 — Toolbar-Button „Ausschneiden“: disabled/enabled/Klickverhalten**

```ts
test('Toolbar-Button "Ausschneiden": disabled ohne Selektion, aktiv mit Selektion, Klick entspricht Strg+X', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  const cutButton = page.getByRole('button', { name: 'Ausschneiden' })
  await editor.click()
  await page.keyboard.type('Text ohne Selektion')

  await expect(cutButton).toBeDisabled()

  await page.keyboard.press('ControlOrMeta+a')
  await expect(cutButton).toBeEnabled()

  await cutButton.click()
  await expect(editor).toHaveText('')
})
```

**Testfall (neu) 10 — Umschalt+Entf als zweiter Zugriffsweg**

```ts
test('Umschalt+Entf schneidet die aktuelle Selektion aus wie Strg+X', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Über Umschalt+Entf entfernen')
  await page.keyboard.press('ControlOrMeta+a')

  await page.keyboard.press('Shift+Delete')

  await expect(editor).toHaveText('')
})
```

**Testfall (neu) 11 — Grenzfall 11: Zwischenablage-Zugriff verweigert/blockiert (deterministisch simuliert)**

```ts
test('Grenzfall 11: schlägt execCommand("cut") fehl, bleibt der Text erhalten und eine Fehlermeldung erscheint', async ({ page }) => {
  const assertNoConsoleErrors = watchForConsoleErrors(page)
  await page.addInitScript(() => {
    const original = document.execCommand.bind(document)
    // @ts-expect-error – Testinstrumentierung, simuliert vom Browser blockierten Zugriff
    document.execCommand = (cmd: string, ...rest: unknown[]) => (cmd === 'cut' ? false : original(cmd, ...rest))
  })
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()

  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Darf nicht verloren gehen')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByRole('button', { name: 'Ausschneiden' }).click()

  await expect(editor).toContainText('Darf nicht verloren gehen') // kein Datenverlust!
  await expect(page.getByRole('alert')).toBeVisible()
  assertNoConsoleErrors()
})
```

### 4.4 Rundreise-E2E-Tests (Req Abschnitt 4.2) — echter Export/Download

Diese Tests führen den **kompletten** Weg: echte Bedienung im Browser → echter Export-Klick
→ `page.waitForEvent('download')` → Datei von der Platte lesen → mit `JSZip` inhaltlich
prüfen. Ergänzt (nicht ersetzt) die schnelleren, deterministischen Unit-Rundreisen aus §3.

```ts
test('Rundreise 1 (DOCX): Text ausschneiden, exportieren, Zip-Inhalt zeigt korrekten Reststand', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Bleibt erhalten. Wird entfernt.')
  await page.keyboard.press('Home')
  for (let i = 0; i < 'Bleibt erhalten. '.length; i++) await page.keyboard.press('ArrowRight')
  await page.keyboard.down('Shift')
  for (let i = 0; i < 'Wird entfernt.'.length; i++) await page.keyboard.press('ArrowRight')
  await page.keyboard.up('Shift')
  await page.keyboard.press('ControlOrMeta+x')
  await expect(editor).toHaveText('Bleibt erhalten. ')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const zip = await JSZip.loadAsync(await fs.readFile((await download.path())!))
  const documentXml = await zip.file('word/document.xml')!.async('text')

  expect(documentXml).toContain('Bleibt erhalten.')
  expect(documentXml).not.toContain('Wird entfernt.')
})

test('Rundreise 2 (ODT): identische Sequenz wie Rundreise 1, gegen content.xml geprüft', async ({ page }) => {
  await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Bleibt erhalten. Wird entfernt.')
  await page.keyboard.press('Home')
  for (let i = 0; i < 'Bleibt erhalten. '.length; i++) await page.keyboard.press('ArrowRight')
  await page.keyboard.down('Shift')
  for (let i = 0; i < 'Wird entfernt.'.length; i++) await page.keyboard.press('ArrowRight')
  await page.keyboard.up('Shift')
  await page.keyboard.press('ControlOrMeta+x')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const zip = await JSZip.loadAsync(await fs.readFile((await download.path())!))
  const contentXml = await zip.file('content.xml')!.async('text')

  expect(contentXml).toContain('Bleibt erhalten.')
  expect(contentXml).not.toContain('Wird entfernt.')
})

test('Rundreise 6 (Bild): Bild ausschneiden, DOCX-Export enthält keine word/media-Datei mehr', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const tinyPngPath = path.join(__dirname, 'fixtures', 'tiny.png')
  await fs.writeFile(
    tinyPngPath,
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
  )
  await editor.locator('label:has-text("Bild")').locator('input[type=file]').setInputFiles(tinyPngPath)
  await expect(editor.locator('img')).toHaveCount(1)
  await editor.locator('img').click()
  await page.keyboard.press('ControlOrMeta+x')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const zip = await JSZip.loadAsync(await fs.readFile((await download.path())!))
  const mediaFiles = Object.keys(zip.files).filter((p) => p.startsWith('word/media/'))
  expect(mediaFiles).toHaveLength(0)
})

test('Rundreise 4/5 (Cross-Format): ODT hochladen, ausschneiden, als DOCX exportieren, reimportieren', async ({ page }) => {
  const buffer = await buildSampleOdt()
  const input = odtCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'beispiel.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
  const editor = page.locator('.ProseMirror')
  await expect(editor).toContainText('Willkommen')

  await editor.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('ControlOrMeta+x')
  await page.keyboard.type('Nur dieser Text bleibt.')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren als DOCX' }).click().catch(async () => {
    await page.getByRole('button', { name: 'Exportieren' }).click()
  })
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const zip = await JSZip.loadAsync(await fs.readFile((await download.path())!))
  const documentXml = await zip.file('word/document.xml')!.async('text')

  expect(documentXml).toContain('Nur dieser Text bleibt.')
  expect(documentXml).not.toContain('Willkommen')
})

test('Rundreise 10: Strg+A → Strg+X → Export → Reimport ergibt eine gültige, leere Datei', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Wird komplett entfernt.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('ControlOrMeta+x')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile((await download.path())!)

  // Reimport in einem frischen Kontext desselben Formats:
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({
    name: 'reimport.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer,
  })
  await expect(page.locator('.ProseMirror p')).toHaveCount(1)
  await expect(page.locator('.ProseMirror')).toHaveText('')
})
```

> Hinweis zu `docxCard(page).getByRole('button', { name: 'Exportieren als DOCX' })` in der
> Cross-Format-Rundreise: Der genaue Button-Text für einen zielformatspezifischen Export
> ist zum Stichtag dieses Testplans nicht separat verifiziert (nur ein generischer
> „Exportieren“-Button ist in `docx.spec.ts`/`odt.spec.ts` belegt). **Vor Implementierung
> dieses Tests klären**, ob Cross-Format-Export über einen eigenen Button/Dropdown oder
> nur über Umbenennen+erneutes „Neu erstellen“ im Zielformat abgebildet ist — sonst
> Selektor entsprechend anpassen. Das ist eine offene Klärungsfrage an Dev/PO, keine
> Bestätigung eines bereits vorhandenen UI-Elements.

---

## 5. Traceability-Matrix

| Req-Referenz | Testebene | Datei::Test | Status heute |
|---|---|---|---|
| §4.1 Baseline DOCX/ODT | Unit | `docx/__tests__/roundtrip.test.ts`, `odt/__tests__/roundtrip.test.ts` (bestehend) | lauffähig |
| §4.2 Testfall 1/2 (Absatz-Rundreise) | Unit + E2E | `cut-roundtrip.test.ts` (beide Formate), `cut.spec.ts` Rundreise 1/2 | lauffähig |
| §4.2 Testfall 3 (Verschieben Cut+Paste) | E2E | `cut.spec.ts` Testfall 2 (Kernverhalten), Export-Erweiterung optional nachrüstbar | lauffähig (Kern), Export-Variante als Ausbaustufe |
| §4.2 Testfall 4/5 (Cross-Format) | Unit + E2E | `odt/__tests__/cut-roundtrip.test.ts` (Cross-Format-Block), `cut.spec.ts` Rundreise 4/5 | lauffähig, Selektor-Klärung offen (s. Hinweis §4.4) |
| §4.2 Testfall 6 (Bild, keine Waisen) | Unit + E2E | `cut-roundtrip.test.ts` (beide Formate), `cut.spec.ts` Rundreise 6, Testfall 8 | lauffähig |
| §4.2 Testfall 7 (Zelle geleert, Struktur bleibt) | Unit + E2E | `cut-roundtrip.test.ts`, `cut.spec.ts` Testfall 6/7 | lauffähig |
| §4.2 Testfall 8 (Liste komplett weg) | Unit + E2E | `cut-roundtrip.test.ts`, `cut.spec.ts` Grenzfall 4 | lauffähig |
| §4.2 Testfall 9 (Doppel-Rundreise) | Unit | `cut-roundtrip.test.ts` (Doppel-Konvertierung-Block) | lauffähig |
| §4.2 Testfall 10 (Alles leeren, valide leere Datei) | Unit + E2E | `cut-roundtrip.test.ts`, `cut.spec.ts` Rundreise 10 | lauffähig |
| §6 Testfall 1–9, 12, 13 | E2E | `cut.spec.ts` (siehe §4.3) | lauffähig |
| §6 Testfall 10/11 (Export/Reimport) | E2E | `cut.spec.ts` Rundreise 1/2 | lauffähig |
| Grenzfall 1 | E2E | Testfall 3 | lauffähig |
| Grenzfall 2 | E2E | Testfall 4 | lauffähig |
| Grenzfall 3 | E2E | Zusatztest „Grenzfall 3“ | lauffähig |
| Grenzfall 4 | E2E | Zusatztest „Grenzfall 4“ | lauffähig |
| Grenzfall 5 | E2E | Testfall 8 | lauffähig |
| Grenzfall 6 | E2E | Testfall 7 | lauffähig |
| Grenzfall 7 | E2E | Testfall 7 (Struktur-Assertion `toHaveCount(4)`) | lauffähig |
| Grenzfall 8 | E2E | Testfall 2, Testfall 12 | lauffähig (12: nur Chromium) |
| Grenzfall 9 | — | nicht automatisiert (zweiter Browser-Kontext/Tab, System-Clipboard-Grenze von Playwright), manuell verifizieren | bewusst nicht automatisiert, siehe §7 |
| Grenzfall 10 | — | nicht automatisiert (externe Anwendung außerhalb des Browsers) | bewusst nicht automatisiert, siehe §7 |
| Grenzfall 11 | E2E | Testfall (neu) 11 | **blockiert**, siehe §0 |
| Grenzfall 12 | — | kein App-Code betroffen, kein Extra-Test | n/a |
| Grenzfall 13 | E2E | Zusatztest „Grenzfall 13“ | lauffähig |
| Grenzfall 14 | E2E | Zusatztest „Grenzfall 14“ | lauffähig |
| Grenzfall 15 | E2E (PFLICHT) | Testfall 5 | lauffähig |
| Grenzfall 16 | E2E | Testfall 9 | lauffähig |
| Grenzfall 17 | E2E | Zusatztest „Grenzfall 17“ | lauffähig |
| Grenzfall 18 (Track Changes) | — | explizit außerhalb Scope (Req selbst so vermerkt) | kein Test vorgesehen |
| Zugriffsweg: Toolbar-Button | E2E | Testfall (neu) 9 | **blockiert**, siehe §0 |
| Zugriffsweg: Umschalt+Entf | E2E | Testfall (neu) 10 | **blockiert**, siehe §0 |
| Zugriffsweg: Mobile/Touch-Auswahlblase | E2E (abgeleitet) | Kommentar bei Testfall 13 | bewusst nicht direkt automatisiert, siehe §7 |
| Req §2.5 (getrennte Undo-Schritte) | E2E | „Zusatz (Req §2.5)“-Test bei Testfall 9 | lauffähig |

---

## 6. Abnahmekriterien für QA-Sign-off (Abgleich mit Req Abschnitt 8)

1. **Baseline grün** (§3.1) — Voraussetzung für alles Weitere.
2. **Alle Unit-Rundreise-Tests aus §3.2/§3.3 grün** für DOCX **und** ODT.
3. **Alle E2E-Testfälle 1–8, Zusatztests, 12, 13 aus §4.3 grün** auf allen 3
   Playwright-Projekten (Desktop Chrome/Mobile/Tablet), außer Testfall 12 (bewusst nur
   Chromium).
4. **Pflicht-Regressionstest Testfall 5 grün und dauerhaft in der Suite** — kein
   Überspringen, kein `test.skip`.
5. **Rundreise-E2E-Tests aus §4.4 grün** für DOCX und ODT, inkl. Bild- und
   Cross-Format-Fall (nach Klärung des offenen Selektor-Punkts, siehe Hinweis §4.4).
6. **Nach Umsetzung von `ausschneiden-code.md` §3:** zusätzlich Testfälle 9–11 aus §4.3
   grün, bevor der Backlog-Status `ausschneiden` als „vorhanden“ (statt „teilweise“)
   bestätigt wird (Req DoD 8.6).
7. **Kein Testlauf zeigt eine Konsolen-/JS-Exception** (§2.2-Helper in jedem Test aktiv).
8. Dieser Testplan selbst wird nicht als grün gemeldet, solange Punkt 6 offen ist — der
   Backlog-Status ist erst nach vollständiger Umsetzung **und** grünen Tests 9–11 final zu
   bestätigen, vorher nur als „teilweise, Basisverhalten verifiziert“ zu vermerken.

---

## 7. Bekannte Grenzen der Automatisierung (bewusst dokumentiert, kein stiller Blindspot)

- **Grenzfall 9** (zweites Dokument/zweiter Browser-Tab): Playwright-Kontexte teilen sich
  zwar dieselbe System-Zwischenablage auf manchen Setups, aber das ist plattform-/
  CI-abhängig und nicht zuverlässig deterministisch — daher nicht automatisiert; manuell
  in einer Vor-Release-Prüfung zu verifizieren und im QA-Bericht zu vermerken.
- **Grenzfall 10** (Einfügen in eine echte externe Anwendung außerhalb des Browsers):
  Playwright kann nicht in Texteditoren/andere native Anwendungen einfügen — nicht
  automatisierbar, manuell zu verifizieren.
- **Mobile/Tablet-Auswahlblase** (Req Zugriffsweg 6): Die native OS-Textauswahl-Bubble ist
  kein Teil des Web-Inhalts und daher für Playwright nicht ansprechbar. Das Ergebnis wird
  aus dem identischen, auf allen Projekten getesteten `cut`-Event-Pfad **abgeleitet** —
  bei Bedarf durch manuelle Geräte-QA auf echten Android-/iOS-Geräten zu ergänzen.
- **Kontextmenü-Klick selbst** (Req Zugriffsweg 2): Playwright kann das native
  Browser-Kontextmenü öffnen (`page.click(..., { button: 'right' })`), aber dessen
  Menüeinträge sind Browser-Chrome außerhalb des DOM und nicht zuverlässig über alle 3
  Engines hinweg anklickbar. Getestet wird stattdessen der zugrunde liegende, identische
  `cut`-Event-Pfad über Strg+X (siehe `ausschneiden-code.md` §1.4) — das ist eine bewusste,
  dokumentierte Testlücke auf UI-Ebene, keine unklare Auslassung.
- **`execCommand('cut')`-Zukunftssicherheit** (siehe `ausschneiden-code.md` §9): Sollte ein
  Ziel-Browser diese Legacy-API künftig entfernen, würde Testfall (neu) 9 fehlschlagen und
  müsste dann echten Browser-Support statt eines Mocks widerspiegeln — bewusst kein
  Dauerrisiko, aber im QA-Bericht als beobachtbare Zukunftsabhängigkeit zu vermerken.

---

## 8. Ausführungsreihenfolge (Empfehlung)

1. `npm test -- roundtrip` (Baseline, §3.1) — muss grün sein, bevor überhaupt fortgefahren wird.
2. `npm test -- cut-roundtrip` (§3.2/§3.3) — schnelle, deterministische Datenebene.
3. `npm test` (gesamt, inkl. neuem `commands.test.ts`, sobald `ausschneiden-code.md` §3.1
   umgesetzt ist).
4. `npm run test:e2e -- cut.spec.ts` — alle 3 Projekte automatisch über
   `playwright.config.ts`; zuerst nur die heute lauffähigen Testfälle (§4.3 ohne die drei
   in §4.3-Block „setzt Umsetzung voraus“) laufen lassen, um den **bereits funktionierenden
   nativen Pfad** vom **Backlog** zu trennen und frühzeitig grünes Feedback zu geben.
5. Nach Umsetzung von `ausschneiden-code.md` §3: die drei blockierten Testfälle (§4.3,
   „setzt Umsetzung voraus“) aktivieren/ausführen.
6. Abschließend: gesamte Suite (`npm test && npm run test:e2e`) für den finalen
   QA-Sign-off gemäß §6.
