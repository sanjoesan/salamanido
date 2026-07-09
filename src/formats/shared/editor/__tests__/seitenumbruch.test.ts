import { describe, it, expect, vi } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import type { Node as PMNode } from 'prosemirror-model'
import { wordSchema } from '../../schema'
import { insertPageBreak } from '../commands'
import { computePageBreakIndices, computePageCount } from '../pagination'

// Unit-Abdeckung für specs/seitenumbruch-req.md §6.5 (Command) und §3.8 (Paginierung).

function para(text?: string): PMNode {
  return wordSchema.node('paragraph', null, text ? [wordSchema.text(text)] : [])
}
function heading(level: number, text: string): PMNode {
  return wordSchema.node('heading', { level }, [wordSchema.text(text)])
}
function docState(...blocks: PMNode[]): EditorState {
  return EditorState.create({ doc: wordSchema.node('doc', null, blocks), schema: wordSchema })
}
function withCursor(state: EditorState, pos: number): EditorState {
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)))
}
function apply(state: EditorState, onBlocked?: (msg: string) => void): EditorState {
  let next = state
  const ran = insertPageBreak(onBlocked)(state, (tr) => {
    next = state.apply(tr)
  })
  expect(ran).toBe(true)
  return next
}
function types(state: EditorState): string[] {
  const out: string[] = []
  state.doc.forEach((node) => out.push(node.type.name))
  return out
}

describe('insertPageBreak (Command, §3.1–§3.2)', () => {
  it('mitten im Absatz: teilt den Absatz, Umbruch dazwischen, Cursor am Anfang des zweiten Teils', () => {
    // doc: p("vorher|nachher") — Cursor zwischen r und n (pos 7: 1 + 'vorher'.length)
    const state = withCursor(docState(para('vorhernachher')), 7)
    const next = apply(state)
    expect(types(next)).toEqual(['paragraph', 'page_break', 'paragraph'])
    expect(next.doc.child(0).textContent).toBe('vorher')
    expect(next.doc.child(2).textContent).toBe('nachher')
    // Cursor am Anfang von "nachher" — nächstes Tippen landet auf der neuen Seite
    expect(next.selection.$from.parent.textContent).toBe('nachher')
    expect(next.selection.$from.parentOffset).toBe(0)
  })

  it('am Absatzende (letzter Block): Umbruch + neuer leerer Absatz als Cursor-Heimat (Grenzfall 2)', () => {
    const state = withCursor(docState(para('text')), 5) // hinter "text"
    const next = apply(state)
    expect(types(next)).toEqual(['paragraph', 'page_break', 'paragraph'])
    expect(next.doc.child(0).textContent).toBe('text')
    expect(next.doc.child(2).content.size).toBe(0)
    expect(next.selection.$from.parent).toBe(next.doc.child(2))
  })

  it('am Absatzanfang des ersten Blocks: Umbruch davor → bewusst leere erste Seite (Grenzfall 1)', () => {
    const state = withCursor(docState(para('text')), 1)
    const next = apply(state)
    expect(types(next)).toEqual(['page_break', 'paragraph'])
    expect(next.doc.child(1).textContent).toBe('text')
  })

  it('mitten in einer Überschrift: beide Hälften behalten Typ und Level (Grenzfall 6)', () => {
    // doc: h2("TitelRest") — Cursor nach "Titel" (pos 6)
    const state = withCursor(docState(heading(2, 'TitelRest')), 6)
    const next = apply(state)
    expect(types(next)).toEqual(['heading', 'page_break', 'heading'])
    expect(next.doc.child(0).attrs.level).toBe(2)
    expect(next.doc.child(2).attrs.level).toBe(2)
    expect(next.doc.child(0).textContent).toBe('Titel')
    expect(next.doc.child(2).textContent).toBe('Rest')
  })

  it('ersetzt eine bestehende Selektion (§3.2)', () => {
    const base = docState(para('eins zwei drei'))
    const state = base.apply(base.tr.setSelection(TextSelection.create(base.doc, 6, 10))) // "zwei"
    const next = apply(state)
    expect(types(next)).toEqual(['paragraph', 'page_break', 'paragraph'])
    expect(next.doc.child(0).textContent).toBe('eins ')
    expect(next.doc.child(2).textContent).toBe(' drei')
  })

  it('zweimal hintereinander: zwei Umbrüche, leere Seite dazwischen bleibt erhalten (Grenzfall 3)', () => {
    const state = withCursor(docState(para('text')), 5)
    const once = apply(state)
    const twice = apply(once)
    expect(types(twice)).toEqual(['paragraph', 'page_break', 'page_break', 'paragraph'])
  })

  it('in einer Tabellenzelle: Zeilenumbruch statt Seitenumbruch + sichtbare Meldung (Grenzfall 4)', () => {
    const cellPara = wordSchema.node('paragraph', null, [wordSchema.text('zelle')])
    const cell = wordSchema.node('table_cell', null, [cellPara])
    const row = wordSchema.node('table_row', null, [cell])
    const table = wordSchema.node('table', null, [row])
    const base = docState(table)
    const state = base.apply(base.tr.setSelection(TextSelection.create(base.doc, 4))) // in "zelle"
    const onBlocked = vi.fn()
    const next = apply(state, onBlocked)
    expect(onBlocked).toHaveBeenCalledWith(expect.stringContaining('Tabellen'))
    expect(types(next)).toEqual(['table']) // Struktur unversehrt, kein page_break
    let hardBreaks = 0
    next.doc.descendants((node) => {
      if (node.type.name === 'hard_break') hardBreaks += 1
    })
    expect(hardBreaks).toBe(1)
  })

  it('in einem Listenpunkt: Zeilenumbruch statt Seitenumbruch + sichtbare Meldung (Grenzfall 5)', () => {
    const itemPara = wordSchema.node('paragraph', null, [wordSchema.text('punkt')])
    const item = wordSchema.node('list_item', null, [itemPara])
    const list = wordSchema.node('bullet_list', null, [item])
    const base = docState(list)
    const state = base.apply(base.tr.setSelection(TextSelection.create(base.doc, 4)))
    const onBlocked = vi.fn()
    const next = apply(state, onBlocked)
    expect(onBlocked).toHaveBeenCalledWith(expect.stringContaining('Listen'))
    expect(types(next)).toEqual(['bullet_list'])
  })
})

describe('computePageBreakIndices mit erzwungenen Umbrüchen (§3.8)', () => {
  const PAGE = 100

  it('erzwungener Index bricht unabhängig von der Höhe', () => {
    expect(computePageBreakIndices([10, 10, 10], PAGE, [2])).toEqual([2])
  })

  it('erzwungener Umbruch setzt das Höhenbudget zurück (kombiniert mit natürlichem Überlauf)', () => {
    // Blöcke: 60, [erzwungen ab 1] 80, 30 → natürlicher Umbruch bei Index 2 (80+30 > 100)
    expect(computePageBreakIndices([60, 80, 30], PAGE, [1])).toEqual([1, 2])
  })

  it('zwei aufeinanderfolgende erzwungene Umbrüche → bewusst leere Seite (Grenzfall 3)', () => {
    // [p, pb, pb, p] → erzwungen bei 2 und 3, auch wenn Seite 2 leer bleibt
    expect(computePageBreakIndices([20, 5, 5, 20], PAGE, [2, 3])).toEqual([2, 3])
  })

  it('erzwungener Index 0 wird ignoriert (kein Umbruch vor dem ersten Block)', () => {
    expect(computePageBreakIndices([20, 20], PAGE, [0])).toEqual([])
  })

  it('ohne erzwungene Indizes unverändert wie bisher (Regressionsschutz)', () => {
    expect(computePageBreakIndices([60, 60, 60], PAGE)).toEqual([1, 2])
    expect(computePageCount([60, 60, 60], PAGE)).toBe(3)
  })

  it('computePageCount zählt erzwungene Seiten mit', () => {
    expect(computePageCount([10, 10, 10], PAGE, [1, 2])).toBe(3)
  })
})
