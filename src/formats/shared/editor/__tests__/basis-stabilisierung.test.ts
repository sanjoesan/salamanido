import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection, AllSelection } from 'prosemirror-state'
import type { Node as PMNode, Mark } from 'prosemirror-model'
import { wordSchema } from '../../schema'
import {
  isMarkActive,
  isAlignActive,
  isListActive,
  applyMarkColor,
  clearMarkColor,
  activeColor,
  insertTable,
} from '../commands'
import { pageBackgroundStyle, PAGE_HEIGHT_PX, PAGE_SEPARATOR_PX } from '../pageLayout'

// Unit coverage for specs/basis-stabilisierung-req.md §5.1 (B1/B2/B4/B5).

// ---- builders -------------------------------------------------------------
function para(text?: string, marks: Mark[] = []): PMNode {
  return wordSchema.node('paragraph', null, text ? [wordSchema.text(text, marks)] : [])
}
function alignedPara(align: string, text: string): PMNode {
  return wordSchema.node('paragraph', { align }, [wordSchema.text(text)])
}
function docState(...blocks: PMNode[]): EditorState {
  return EditorState.create({ doc: wordSchema.node('doc', null, blocks), schema: wordSchema })
}
function findTextPos(doc: PMNode, text: string): number {
  let found = -1
  doc.descendants((node, pos) => {
    if (found >= 0) return false
    if (node.isText && node.text && node.text.includes(text)) found = pos
    return found < 0
  })
  if (found < 0) throw new Error(`text ${JSON.stringify(text)} not found`)
  return found
}
function withCursorAt(state: EditorState, text: string): EditorState {
  return state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(findTextPos(state.doc, text) + 1))))
}
/** Selects from the start of `fromText` to the end of `toText` (inclusive). */
function withRange(state: EditorState, fromText: string, toText: string): EditorState {
  const from = findTextPos(state.doc, fromText)
  const to = findTextPos(state.doc, toText) + toText.length
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, to)))
}

const strong = wordSchema.marks.strong
const boldMark = strong.create()

// ---- B1: isMarkActive -----------------------------------------------------
describe('isMarkActive (B1 §2.1)', () => {
  it('collapsed cursor in plain text → inactive', () => {
    const state = withCursorAt(docState(para('normal')), 'normal')
    expect(isMarkActive(state, strong)).toBe(false)
  })

  it('collapsed cursor with a pending storedMark → active (the "click Fett, nothing showed" bug)', () => {
    const base = withCursorAt(docState(para('normal')), 'normal')
    const state = base.apply(base.tr.addStoredMark(boldMark))
    expect(isMarkActive(state, strong)).toBe(true)
  })

  it('collapsed cursor inside bold text → active', () => {
    const state = withCursorAt(docState(para('fett', [boldMark])), 'fett')
    expect(isMarkActive(state, strong)).toBe(true)
  })

  it('range that is bold throughout → active', () => {
    const state = withRange(docState(para('fett', [boldMark])), 'fett', 'fett')
    expect(isMarkActive(state, strong)).toBe(true)
  })

  it('partially bold range → INACTIVE (whole-range Word semantics, not "anywhere")', () => {
    const doc = wordSchema.node('doc', null, [
      wordSchema.node('paragraph', null, [wordSchema.text('fett', [boldMark]), wordSchema.text(' normal')]),
    ])
    const base = EditorState.create({ doc, schema: wordSchema })
    const state = base.apply(base.tr.setSelection(TextSelection.create(base.doc, 1, base.doc.content.size - 1)))
    expect(isMarkActive(state, strong)).toBe(false)
  })

  it('Strg+A (AllSelection) over mixed formatting → inactive; over all-bold → active', () => {
    const mixed = docState(para('fett', [boldMark]), para('normal'))
    const mixedAll = mixed.apply(mixed.tr.setSelection(new AllSelection(mixed.doc)))
    expect(isMarkActive(mixedAll, strong)).toBe(false)

    const allBold = docState(para('eins', [boldMark]), para('zwei', [boldMark]))
    const allBoldAll = allBold.apply(allBold.tr.setSelection(new AllSelection(allBold.doc)))
    expect(isMarkActive(allBoldAll, strong)).toBe(true)
  })
})

// ---- B1: isAlignActive ----------------------------------------------------
describe('isAlignActive (B1 §2.1, Mehrabsatz)', () => {
  it('multi-paragraph selection with uniform alignment → that alignment active', () => {
    const state = withRange(docState(alignedPara('center', 'eins'), alignedPara('center', 'zwei')), 'eins', 'zwei')
    expect(isAlignActive(state, 'center')).toBe(true)
    expect(isAlignActive(state, 'left')).toBe(false)
  })

  it('mixed alignment → NO alignment reads active (no misleading first-block state)', () => {
    const state = withRange(docState(alignedPara('left', 'eins'), alignedPara('center', 'zwei')), 'eins', 'zwei')
    expect(isAlignActive(state, 'left')).toBe(false)
    expect(isAlignActive(state, 'center')).toBe(false)
    expect(isAlignActive(state, 'right')).toBe(false)
    expect(isAlignActive(state, 'justify')).toBe(false)
  })

  it('collapsed cursor → the containing paragraph decides', () => {
    const state = withCursorAt(docState(alignedPara('right', 'eins')), 'eins')
    expect(isAlignActive(state, 'right')).toBe(true)
    expect(isAlignActive(state, 'left')).toBe(false)
  })
})

// ---- B1: isListActive -----------------------------------------------------
describe('isListActive (B1 §2.1, Listen-Buttons)', () => {
  function bulletListDoc(): EditorState {
    const li = wordSchema.node('list_item', null, [para('punkt')])
    const ul = wordSchema.node('bullet_list', null, [li])
    return docState(ul, para('draussen'))
  }

  it('cursor inside a bullet list → bullet active, ordered inactive', () => {
    const state = withCursorAt(bulletListDoc(), 'punkt')
    expect(isListActive(state, false)).toBe(true)
    expect(isListActive(state, true)).toBe(false)
  })

  it('cursor outside any list → both inactive', () => {
    const state = withCursorAt(bulletListDoc(), 'draussen')
    expect(isListActive(state, false)).toBe(false)
    expect(isListActive(state, true)).toBe(false)
  })
})

// ---- B5: colour marks at a collapsed cursor -------------------------------
describe('applyMarkColor/clearMarkColor bei kollabiertem Cursor (B5)', () => {
  const textColor = wordSchema.marks.textColor

  it('applyMarkColor with empty selection sets a stored mark (no silent false any more)', () => {
    const state = withCursorAt(docState(para('text')), 'text')
    let next = state
    const ran = applyMarkColor('textColor', '#ff0000')(state, (tr) => {
      next = state.apply(tr)
    })
    expect(ran).toBe(true)
    const stored = next.storedMarks ?? []
    const mark = textColor.isInSet(stored)
    expect(mark).toBeTruthy()
    expect(mark!.attrs.color).toBe('#ff0000')
    // the swatch reflects the pending colour (B1 "Farbfelder")
    expect(activeColor(next, 'textColor')).toBe('#ff0000')
  })

  it('re-picking replaces the pending colour instead of stacking', () => {
    const base = withCursorAt(docState(para('text')), 'text')
    let s1 = base
    applyMarkColor('textColor', '#ff0000')(base, (tr) => (s1 = base.apply(tr)))
    let s2 = s1
    applyMarkColor('textColor', '#00ff00')(s1, (tr) => (s2 = s1.apply(tr)))
    const marks = (s2.storedMarks ?? []).filter((m) => m.type === textColor)
    expect(marks).toHaveLength(1)
    expect(marks[0].attrs.color).toBe('#00ff00')
  })

  it('clearMarkColor with the cursor inside coloured text drops the inherited colour for typing', () => {
    const colored = wordSchema.text('bunt', [textColor.create({ color: '#ff0000' })])
    const doc = wordSchema.node('doc', null, [wordSchema.node('paragraph', null, [colored])])
    const base = EditorState.create({ doc, schema: wordSchema })
    const state = withCursorAt(base, 'bunt')
    expect(activeColor(state, 'textColor')).toBe('#ff0000')
    let next = state
    const ran = clearMarkColor('textColor')(state, (tr) => {
      next = state.apply(tr)
    })
    expect(ran).toBe(true)
    expect(next.storedMarks).not.toBeNull() // explicit "no colour" override for the next input
    expect(textColor.isInSet(next.storedMarks ?? [])).toBeUndefined()
    expect(activeColor(next, 'textColor')).toBeNull()
  })

  it('activeColor: uniform range → colour, mixed range → null', () => {
    const doc = wordSchema.node('doc', null, [
      wordSchema.node('paragraph', null, [
        wordSchema.text('rot', [textColor.create({ color: '#ff0000' })]),
        wordSchema.text('blau', [textColor.create({ color: '#0000ff' })]),
      ]),
    ])
    const base = EditorState.create({ doc, schema: wordSchema })
    const uniform = base.apply(base.tr.setSelection(TextSelection.create(base.doc, 1, 4)))
    expect(activeColor(uniform, 'textColor')).toBe('#ff0000')
    const mixed = base.apply(base.tr.setSelection(TextSelection.create(base.doc, 1, 8)))
    expect(activeColor(mixed, 'textColor')).toBeNull()
  })
})

// ---- B2: the trigger state (table as only document node) -------------------
describe('insertTable in ein leeres Dokument (B2 §5.1)', () => {
  it('produces a document whose ONLY node is the table — the boundary state B2 must handle', () => {
    const state = docState(para())
    let next = state
    insertTable(2, 2)(state, (tr) => {
      next = state.apply(tr)
    })
    expect(next.doc.childCount).toBe(1)
    expect(next.doc.firstChild!.type.name).toBe('table')
  })
})

// ---- B4: full-page background geometry --------------------------------------
describe('pageBackgroundStyle (B4)', () => {
  it('paints each FULL page (incl. both margins) white, separated only by the gap', () => {
    const style = pageBackgroundStyle()
    const period = PAGE_HEIGHT_PX + PAGE_SEPARATOR_PX
    expect(style.backgroundSize).toBe(`100% ${period}px`)
    expect(style.backgroundImage).toContain(`white ${PAGE_HEIGHT_PX}px`)
    // no offset any more — the white band starts at the very top of the sheet
    expect(style.backgroundPositionY).toBeUndefined()
  })
})
