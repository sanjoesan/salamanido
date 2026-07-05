import { EditorState, TextSelection } from 'prosemirror-state'
import { TableMap, CellSelection } from 'prosemirror-tables'
import type { Node as PMNode } from 'prosemirror-model'
import { wordSchema } from '../../schema'
import {
  canMergeCells,
  canSplitCell,
  deleteColumnOrTable,
  deleteRowOrTable,
  mergeCellsWithCursor,
  splitCellWithCursor,
} from '../commands'

// ---- builders -------------------------------------------------------------
function para(text?: string): PMNode {
  return wordSchema.node('paragraph', null, text ? [wordSchema.text(text)] : [])
}
function cell(text?: string, attrs?: Record<string, unknown>): PMNode {
  return wordSchema.node('table_cell', attrs ?? null, [para(text)])
}
function trow(...cells: PMNode[]): PMNode {
  return wordSchema.node('table_row', null, cells)
}
function table(...rows: PMNode[]): PMNode {
  return wordSchema.node('table', null, rows)
}
function docState(t: PMNode): EditorState {
  return EditorState.create({ doc: wordSchema.node('doc', null, [t]), schema: wordSchema })
}
function firstTable(doc: PMNode): PMNode {
  return doc.firstChild!
}
function mapOf(doc: PMNode): TableMap {
  return TableMap.get(firstTable(doc))
}
/** absolute position of the cell with grid index `idx` (table is the doc's first block). */
function cellPos(state: EditorState, idx: number): number {
  return 1 + mapOf(state.doc).map[idx]
}
function withCellSelection(state: EditorState, fromIdx: number, toIdx: number): EditorState {
  const sel = CellSelection.create(state.doc, cellPos(state, fromIdx), cellPos(state, toIdx))
  return state.apply(state.tr.setSelection(sel))
}
function withCursorInFirstCell(state: EditorState): EditorState {
  return state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(3))))
}
function applyCmd(state: EditorState, command: ReturnType<typeof mergeCellsWithCursor>): EditorState {
  let next = state
  const ran = command(state, (tr) => {
    next = state.apply(tr)
  })
  return ran ? next : state
}

describe('cell merge/split: availability guards', () => {
  it('canMergeCells is false for a plain cursor and true for a rectangular multi-cell selection', () => {
    const base = docState(table(trow(cell('a'), cell('b'))))
    expect(canMergeCells(withCursorInFirstCell(base))).toBe(false)
    expect(canMergeCells(withCellSelection(base, 0, 1))).toBe(true)
  })

  it('canSplitCell is false for a normal cell and true for a merged (colspan>1) cell', () => {
    expect(canSplitCell(withCursorInFirstCell(docState(table(trow(cell('a'), cell('b'))))))).toBe(false)
    expect(canSplitCell(withCursorInFirstCell(docState(table(trow(cell('merged', { colspan: 2 }))))))).toBe(true)
  })
})

describe('cell merge: structure + content + cursor', () => {
  it('merges two horizontally adjacent cells into one colspan=2 cell', () => {
    const start = withCellSelection(docState(table(trow(cell('a'), cell('b')))), 0, 1)
    const after = applyCmd(start, mergeCellsWithCursor())
    const row0 = firstTable(after.doc).child(0)
    expect(row0.childCount).toBe(1)
    expect(row0.child(0).attrs.colspan).toBe(2)
  })

  it('keeps the content of ALL merged cells (append, no silent loss)', () => {
    const start = withCellSelection(docState(table(trow(cell('links'), cell('rechts')))), 0, 1)
    const after = applyCmd(start, mergeCellsWithCursor())
    const mergedText = firstTable(after.doc).child(0).child(0).textContent
    expect(mergedText).toContain('links')
    expect(mergedText).toContain('rechts')
  })

  it('leaves a TEXT cursor (not a CellSelection) after merging, so typing would append', () => {
    const start = withCellSelection(docState(table(trow(cell('a'), cell('b')))), 0, 1)
    const after = applyCmd(start, mergeCellsWithCursor())
    expect(after.selection instanceof CellSelection).toBe(false)
    expect(after.selection instanceof TextSelection).toBe(true)
    expect(after.selection.empty).toBe(true) // a collapsed cursor, ready to type
  })

  it('merges a 2×2 rectangle into one colspan=2, rowspan=2 cell', () => {
    const start = withCellSelection(
      docState(table(trow(cell('a'), cell('b')), trow(cell('c'), cell('d')))),
      0,
      3, // grid indices 0 (0,0) .. 3 (1,1)
    )
    const after = applyCmd(start, mergeCellsWithCursor())
    const anchor = firstTable(after.doc).child(0).child(0)
    expect(anchor.attrs.colspan).toBe(2)
    expect(anchor.attrs.rowspan).toBe(2)
  })

  it('extends an existing merge when re-merged with a neighbouring cell (req §2.5)', () => {
    let state = withCellSelection(docState(table(trow(cell('a'), cell('b'), cell('c')))), 0, 1)
    state = applyCmd(state, mergeCellsWithCursor())
    expect(firstTable(state.doc).child(0).child(0).attrs.colspan).toBe(2)
    state = withCellSelection(state, 0, 2) // merged cell (grid 0) + col 2 (grid 2)
    state = applyCmd(state, mergeCellsWithCursor())
    expect(firstTable(state.doc).child(0).child(0).attrs.colspan).toBe(3)
  })

  it('merging the whole table yields a single cell holding all content (req §3 Nr.5)', () => {
    const start = withCellSelection(
      docState(table(trow(cell('A'), cell('B')), trow(cell('C'), cell('D')))),
      0,
      3,
    )
    const after = applyCmd(start, mergeCellsWithCursor())
    const map = mapOf(after.doc)
    expect(new Set(map.map).size).toBe(1) // exactly one distinct cell across the whole grid
    const txt = JSON.stringify(after.doc.toJSON())
    for (const c of ['A', 'B', 'C', 'D']) expect(txt).toContain(c)
  })
})

describe('cell split: structure + content + cursor', () => {
  it('splits a colspan=2 cell back into two cells, content in the top-left one', () => {
    const start = withCursorInFirstCell(docState(table(trow(cell('inhalt', { colspan: 2 })))))
    const after = applyCmd(start, splitCellWithCursor())
    const row0 = firstTable(after.doc).child(0)
    expect(row0.childCount).toBe(2)
    expect(row0.child(0).textContent).toBe('inhalt')
    expect(row0.child(1).textContent).toBe('')
  })

  it('splits a 2×2 merged block into exactly four cells', () => {
    // 2×2 grid where (0,0) spans everything; splitting yields 4 single cells.
    const start = withCursorInFirstCell(
      docState(
        table(
          trow(cell('block', { colspan: 2, rowspan: 2 })),
          trow(), // fully covered by the rowspan+colspan anchor
        ),
      ),
    )
    const after = applyCmd(start, splitCellWithCursor())
    const map = mapOf(after.doc)
    expect(map.width).toBe(2)
    expect(map.height).toBe(2)
    // four distinct cells now exist
    const cells = new Set(map.map)
    expect(cells.size).toBe(4)
  })

  it('leaves a TEXT cursor (not a CellSelection) after splitting', () => {
    const start = withCursorInFirstCell(docState(table(trow(cell('x', { colspan: 2 })))))
    const after = applyCmd(start, splitCellWithCursor())
    expect(after.selection instanceof CellSelection).toBe(false)
    expect(after.selection instanceof TextSelection).toBe(true)
  })
})

// DoD §6.8: a *self-made* merge must be handled correctly by the six existing row/column
// buttons. TableMap.get() throws on a ragged grid, so a clean map after the operation is the
// integrity proof. Grid indices in a 3×2 table after merging (0,0)+(0,1): the merged cell
// occupies map[0]/map[1]; map[2]=row0-col2, map[3..5]=row1-col0..2.
describe('cell merge: interaction with row/column delete (DoD §6.8)', () => {
  function mergedTopLeftPair(): EditorState {
    let state = docState(
      table(trow(cell('a'), cell('b'), cell('c')), trow(cell('d'), cell('e'), cell('f'))),
    )
    state = withCellSelection(state, 0, 1) // merge row-0 cols 0+1
    return applyCmd(state, mergeCellsWithCursor())
  }
  function cursorAtGrid(state: EditorState, idx: number): EditorState {
    const pos = 1 + mapOf(state.doc).map[idx]
    return state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(pos + 2))))
  }

  it('deleting a column that does NOT cross the merge keeps colspan=2, grid stays valid', () => {
    const merged = mergedTopLeftPair()
    expect(mapOf(merged.doc).width).toBe(3)
    const after = applyCmd(cursorAtGrid(merged, 5), deleteColumnOrTable()) // row1-col2
    const map = mapOf(after.doc) // throws if ragged
    expect(map.width).toBe(2)
    expect(firstTable(after.doc).child(0).child(0).attrs.colspan).toBe(2)
  })

  it('deleting a column that DOES cross the merge reduces its colspan, grid stays valid', () => {
    const merged = mergedTopLeftPair()
    const after = applyCmd(cursorAtGrid(merged, 3), deleteColumnOrTable()) // row1-col0 (crosses)
    const map = mapOf(after.doc) // throws if ragged
    expect(map.width).toBe(2)
    expect(firstTable(after.doc).child(0).child(0).attrs.colspan).toBe(1)
  })

  it('deleting a row that crosses a vertical merge keeps a valid grid', () => {
    // vertical merge of (0,0)+(1,0) in a 2×2 table, then delete row 1 (crosses it)
    let state = docState(table(trow(cell('a'), cell('b')), trow(cell('c'), cell('d'))))
    state = withCellSelection(state, 0, 2) // grid (0,0) and (1,0)
    state = applyCmd(state, mergeCellsWithCursor())
    expect(firstTable(state.doc).child(0).child(0).attrs.rowspan).toBe(2)
    const after = applyCmd(cursorAtGrid(state, 3), deleteRowOrTable()) // row1 via col1 cell
    const map = mapOf(after.doc) // throws if ragged
    expect(map.height).toBe(1)
  })
})
