import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import type { Node as PMNode } from 'prosemirror-model'
import { wordSchema } from '../../schema'
import { activeFontSize, clampFontSizeInput, clearFontSize, setFontSize, DEFAULT_FONT_SIZE_PT } from '../commands'
import { writeDocx } from '../../../docx/writer'
import { readDocx } from '../../../docx/reader'
import { writeOdt } from '../../../odt/writer'
import { readOdt } from '../../../odt/reader'
import type { WordDocumentContent } from '../../documentModel'

// Unit-Abdeckung für specs/schriftgroesse-waehlen-req.md §2.1–§2.5, §3 (Rundreisen).

const size = (pt: number) => wordSchema.marks.fontSize.create({ pt })

function para(...children: PMNode[]): PMNode {
  return wordSchema.node('paragraph', null, children)
}
function docState(...blocks: PMNode[]): EditorState {
  return EditorState.create({ doc: wordSchema.node('doc', null, blocks), schema: wordSchema })
}
function withCursor(state: EditorState, pos: number): EditorState {
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)))
}
function withRange(state: EditorState, from: number, to: number): EditorState {
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, to)))
}

describe('clampFontSizeInput (§2.5 — nur für NEUE Eingaben)', () => {
  it('rundet aufs 0,5er-Raster und clamped auf 1–400', () => {
    expect(clampFontSizeInput(13.3)).toBe(13.5)
    expect(clampFontSizeInput(10.24)).toBe(10)
    expect(clampFontSizeInput(0.2)).toBe(1)
    expect(clampFontSizeInput(999)).toBe(400)
  })
  it('NaN/±Infinity/negativ → null (unbrauchbare Eingabe, §3.1/§4.1)', () => {
    expect(clampFontSizeInput(NaN)).toBeNull()
    expect(clampFontSizeInput(-3)).toBeNull()
    expect(clampFontSizeInput(Infinity)).toBeNull()
  })
})

describe('activeFontSize (§1 #4, §2.3, §2.4)', () => {
  it('unformatierter Fließtext → 11-pt-Anzeige-Standard, NICHT leer (§2.3)', () => {
    const state = withCursor(docState(para(wordSchema.text('normal'))), 3)
    expect(activeFontSize(state)).toBe(DEFAULT_FONT_SIZE_PT)
  })

  it('expliziter Mark gewinnt', () => {
    const state = withCursor(docState(para(wordSchema.text('groß', [size(18)]))), 3)
    expect(activeFontSize(state)).toBe(18)
  })

  it('Überschrift ohne Mark → implizite Vorlagen-Größe (§2.4)', () => {
    const h2 = wordSchema.node('heading', { level: 2 }, [wordSchema.text('Titel')])
    const state = withCursor(docState(h2), 3)
    expect(activeFontSize(state)).toBe(20)
  })

  it('expliziter Mark IN einer Überschrift überschreibt die Vorlage (§2.4)', () => {
    const h1 = wordSchema.node('heading', { level: 1 }, [wordSchema.text('klein', [size(9)])])
    const state = withCursor(docState(h1), 3)
    expect(activeFontSize(state)).toBe(9)
  })

  it('gemischte Selektion → null; exakter Vergleich (10,3 neben 10,5 ist gemischt, §2.3)', () => {
    const state = withRange(
      docState(para(wordSchema.text('aa', [size(10.3)]), wordSchema.text('bb', [size(10.5)]))),
      1,
      5,
    )
    expect(activeFontSize(state)).toBeNull()
  })

  it('einheitliche Selektion über Mark- und Lauf-Grenzen → die Zahl', () => {
    const state = withRange(docState(para(wordSchema.text('aa', [size(14)]), wordSchema.text('bb', [size(14)]))), 1, 5)
    expect(activeFontSize(state)).toBe(14)
  })

  it('vorgemerkte Größe an der Schreibmarke wird angezeigt (§2.2)', () => {
    const base = withCursor(docState(para(wordSchema.text('text'))), 3)
    let next = base
    setFontSize(24)(base, (tr) => (next = base.apply(tr)))
    expect(activeFontSize(next)).toBe(24)
  })
})

describe('setFontSize/clearFontSize (§2.1/§2.2)', () => {
  it('Selektion: eine Transaktion setzt den Mark auf die ganze Range', () => {
    const state = withRange(docState(para(wordSchema.text('abcd'))), 1, 5)
    let next = state
    expect(setFontSize(16)(state, (tr) => (next = state.apply(tr)))).toBe(true)
    const mark = next.doc.resolve(3).marks().find((m) => m.type.name === 'fontSize')
    expect(mark?.attrs.pt).toBe(16)
  })

  it('Schreibmarke: storedMark (KEIN No-Op wie früher bei den Farben, §2.2)', () => {
    const state = withCursor(docState(para(wordSchema.text('text'))), 3)
    let next = state
    expect(setFontSize(16)(state, (tr) => (next = state.apply(tr)))).toBe(true)
    expect(next.storedMarks?.some((m) => m.type.name === 'fontSize')).toBe(true)
  })

  it('clearFontSize entfernt nur den Größen-Mark', () => {
    const strong = wordSchema.marks.strong.create()
    const state = withRange(docState(para(wordSchema.text('ab', [strong, size(20)]))), 1, 3)
    let next = state
    clearFontSize()(state, (tr) => (next = state.apply(tr)))
    const marks = next.doc.resolve(2).marks()
    expect(marks.some((m) => m.type.name === 'fontSize')).toBe(false)
    expect(marks.some((m) => m.type.name === 'strong')).toBe(true)
  })
})

describe('Rundreisen (§3/§5): Importwerte EXAKT, UI-Werte verlustfrei', () => {
  function doc(content: unknown[]): WordDocumentContent {
    return { body: { type: 'doc', content }, header: null, footer: null, meta: { title: '' } }
  }
  const sized = (text: string, pt: number) => ({
    type: 'paragraph',
    attrs: { align: 'left' },
    content: [{ type: 'text', text, marks: [{ type: 'fontSize', attrs: { pt } }] }],
  })
  function firstPt(result: WordDocumentContent): number | undefined {
    const para = (result.body as { content: Array<{ content?: Array<{ marks?: Array<{ type: string; attrs?: { pt?: number } }> }> }> }).content[0]
    return para.content?.[0]?.marks?.find((m) => m.type === 'fontSize')?.attrs?.pt
  }

  it('DOCX: 10,5 pt → w:sz 21 → 10,5 pt (halbe Punkte, verlustfrei)', async () => {
    const result = await readDocx(await writeDocx(doc([sized('text', 10.5)])))
    expect(firstPt(result)).toBe(10.5)
  })

  it('ODT: nicht-0,5er-Importwert 10,3 pt bleibt EXAKT erhalten (§2.5)', async () => {
    const result = await readOdt(await writeOdt(doc([sized('text', 10.3)])))
    expect(firstPt(result)).toBe(10.3)
  })

  it('ODT: Wert oberhalb der Eingabe-Obergrenze (500 pt) übersteht die reine Rundreise unverändert (§2.5)', async () => {
    const result = await readOdt(await writeOdt(doc([sized('text', 500)])))
    expect(firstPt(result)).toBe(500)
  })

  it('DOCX: Größe kombiniert mit Fett + Farbe überlebt', async () => {
    const original = doc([
      {
        type: 'paragraph',
        attrs: { align: 'left' },
        content: [
          {
            type: 'text',
            text: 'kombi',
            marks: [{ type: 'strong' }, { type: 'textColor', attrs: { color: '#ff0000' } }, { type: 'fontSize', attrs: { pt: 14 } }],
          },
        ],
      },
    ])
    const result = await readDocx(await writeDocx(original))
    const marks = (result.body as { content: Array<{ content: Array<{ marks?: Array<{ type: string }> }> }> }).content[0].content[0].marks ?? []
    expect(marks.map((m) => m.type).sort()).toEqual(['fontSize', 'strong', 'textColor'])
  })
})
