import type { Command, EditorState, Transaction } from 'prosemirror-state'
import { TextSelection } from 'prosemirror-state'
import { wrapInList, liftListItem } from 'prosemirror-schema-list'
import {
  isInTable,
  addRowBefore,
  addRowAfter,
  deleteRow,
  addColumnBefore,
  addColumnAfter,
  deleteColumn,
  selectedRect,
  mergeCells,
  splitCell,
  CellSelection,
} from 'prosemirror-tables'
import { wordSchema } from '../schema'

// Insert commands are used verbatim from prosemirror-tables (they already handle
// colspan/rowspan correctly). Delete needs custom "last row/column removes the whole
// table" handling — see deleteRowOrTable / deleteColumnOrTable below.
export { isInTable, addRowBefore, addRowAfter, addColumnBefore, addColumnAfter }

export type Align = 'left' | 'center' | 'right' | 'justify'

const alignableTypes = new Set(['paragraph', 'heading'])

/** Sets text-align on the block(s) covered by the selection, if they support it. */
export function setAlign(align: Align): Command {
  return (state, dispatch) => {
    const { from, to } = state.selection
    let applicable = false
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (alignableTypes.has(node.type.name)) {
        applicable = true
        if (dispatch) {
          dispatch(state.tr.setNodeAttribute(pos, 'align', align))
        }
      }
    })
    return applicable
  }
}

export function isAlignActive(state: EditorState, align: Align): boolean {
  const { $from } = state.selection
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth)
    if (alignableTypes.has(node.type.name)) {
      return node.attrs.align === align
    }
  }
  return false
}

export function setHeading(level: number | null): Command {
  return (state, dispatch) => {
    const type = level === null ? wordSchema.nodes.paragraph : wordSchema.nodes.heading
    const attrs = level === null ? undefined : { level, align: 'left' }
    const { $from, $to } = state.selection
    if (!$from.sameParent($to)) return false
    const parent = $from.parent
    if (!alignableTypes.has(parent.type.name)) return false
    if (dispatch) {
      const pos = $from.before($from.depth)
      const tr = state.tr.setBlockType(pos, pos + parent.nodeSize, type, attrs)
      dispatch(tr)
    }
    return true
  }
}

export function toggleList(ordered: boolean): Command {
  const listType = ordered ? wordSchema.nodes.ordered_list : wordSchema.nodes.bullet_list
  return wrapInList(listType)
}

export function liftFromList(): Command {
  return liftListItem(wordSchema.nodes.list_item)
}

export function insertImage(src: string, alt = ''): Command {
  return (state, dispatch) => {
    const node = wordSchema.nodes.image.create({ src, alt })
    if (dispatch) {
      dispatch(state.tr.replaceSelectionWith(node))
    }
    return true
  }
}

/**
 * Inserts a `hard_break` at the current selection. Without this there is no
 * in-app way to create a `hard_break` at all (readers/writers already
 * round-trip it correctly, see specs/kopieren-code.md Abschnitt 0.5), which
 * makes the "copy a line break" behaviour untestable except via a file-import
 * detour. See specs/kopieren-code.md Abschnitt 2.4.
 */
export function insertHardBreak(): Command {
  return (state, dispatch) => {
    if (dispatch) {
      dispatch(state.tr.replaceSelectionWith(wordSchema.nodes.hard_break.create()).scrollIntoView())
    }
    return true
  }
}

export function insertTable(rows: number, cols: number): Command {
  return (state, dispatch) => {
    if (dispatch) {
      const cell = () => wordSchema.nodes.table_cell.createAndFill()!
      const row = () => wordSchema.nodes.table_row.create(null, Array.from({ length: cols }, cell))
      const table = wordSchema.nodes.table.create(null, Array.from({ length: rows }, row))
      dispatch(state.tr.replaceSelectionWith(table))
    }
    return true
  }
}

/**
 * Removes the entire table enclosing the current selection, then places the cursor in
 * a sensible spot next to where it stood. If the table was the only block in the
 * document, an empty paragraph is inserted so the schema's `content: 'block+'` invariant
 * holds and the editor stays usable. Undo restores the whole table in one step.
 */
function deleteEnclosingTable(): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) return false
    const rect = selectedRect(state)
    const tablePos = rect.tableStart - 1
    const tableNode = state.doc.nodeAt(tablePos)
    if (!tableNode || tableNode.type.name !== 'table') return false
    if (dispatch) {
      let tr = state.tr.delete(tablePos, tablePos + tableNode.nodeSize)
      let cursorPos = tablePos
      if (tr.doc.childCount === 0) {
        tr = tr.insert(0, wordSchema.nodes.paragraph.create())
        cursorPos = 1
      }
      const sel = TextSelection.near(tr.doc.resolve(Math.min(cursorPos, tr.doc.content.size)))
      dispatch(tr.setSelection(sel).scrollIntoView())
    }
    return true
  }
}

/**
 * Deletes the selected row(s). When the selection covers *every* row (a one-row table,
 * or a CellSelection spanning all rows) `deleteRow` from prosemirror-tables refuses
 * silently (no dispatch, and — the trap — its dispatch-less availability probe still
 * returns `true`). In that exact state we remove the whole table instead, matching
 * Word/LibreOffice. The guard mirrors the library's own refuse condition
 * (`rect.top === 0 && rect.bottom === map.height`). See specs/tabelle-struktur-bearbeiten-req.md §2.8.
 */
export function deleteRowOrTable(): Command {
  return (state, dispatch, view) => {
    if (!isInTable(state)) return false
    const rect = selectedRect(state)
    const deletesAllRows = rect.top === 0 && rect.bottom === rect.map.height
    return deletesAllRows ? deleteEnclosingTable()(state, dispatch, view) : deleteRow(state, dispatch)
  }
}

/** Column counterpart to {@link deleteRowOrTable}; removes the whole table when the
 * selection spans every column (`rect.left === 0 && rect.right === map.width`). */
export function deleteColumnOrTable(): Command {
  return (state, dispatch, view) => {
    if (!isInTable(state)) return false
    const rect = selectedRect(state)
    const deletesAllColumns = rect.left === 0 && rect.right === rect.map.width
    return deletesAllColumns ? deleteEnclosingTable()(state, dispatch, view) : deleteColumn(state, dispatch)
  }
}

/** True when the current selection is a rectangular multi-cell CellSelection that can be
 * merged — the exact condition `mergeCells` itself checks (a dispatch-less run is a pure
 * availability probe, ProseMirror convention). Drives the "Zellen verbinden" button state. */
export function canMergeCells(state: EditorState): boolean {
  return mergeCells(state)
}

/** True when the selection is a single cell with colspan>1 and/or rowspan>1 that can be
 * split. Drives the "Zelle teilen" button state. */
export function canSplitCell(state: EditorState): boolean {
  return splitCell(state)
}

/**
 * After merge/split, prosemirror-tables leaves a `CellSelection` (not a text cursor). Typing
 * in that state would REPLACE the just-merged / just-restored content instead of appending
 * to it — the feature's most dangerous silent trap. This collapses the CellSelection to a
 * real text cursor at the end of the top-left cell's content, in the SAME transaction, so
 * immediate typing appends. See specs/zellen-verbinden-req.md §2.3 / §2.6.
 */
function collapseCellSelectionToCursor(tr: Transaction): Transaction {
  const sel = tr.selection
  if (!(sel instanceof CellSelection)) return tr
  let topLeft = Infinity
  sel.forEachCell((_node, pos) => {
    if (pos < topLeft) topLeft = pos
  })
  if (!isFinite(topLeft)) return tr
  const cellNode = tr.doc.nodeAt(topLeft)
  if (!cellNode) return tr
  const contentEnd = topLeft + 1 + cellNode.content.size
  return tr.setSelection(TextSelection.near(tr.doc.resolve(contentEnd), -1))
}

/** Merges the selected cells (content of all cells appended to the top-left anchor), then
 * places a text cursor at the end of the merged content (see {@link collapseCellSelectionToCursor}). */
export function mergeCellsWithCursor(): Command {
  return (state, dispatch) => {
    if (!mergeCells(state)) return false
    if (dispatch) {
      mergeCells(state, (tr) => dispatch(collapseCellSelectionToCursor(tr).scrollIntoView()))
    }
    return true
  }
}

/** Splits a merged cell into its C×R individual cells (original content stays in the
 * top-left cell), then places a text cursor at the end of that content. */
export function splitCellWithCursor(): Command {
  return (state, dispatch) => {
    if (!splitCell(state)) return false
    if (dispatch) {
      splitCell(state, (tr) => dispatch(collapseCellSelectionToCursor(tr).scrollIntoView()))
    }
    return true
  }
}

export type ColorMarkName = 'textColor' | 'highlight'

export function applyMarkColor(markName: ColorMarkName, color: string): Command {
  return (state, dispatch) => {
    const { from, to, empty } = state.selection
    if (empty) return false
    if (dispatch) dispatch(state.tr.addMark(from, to, wordSchema.marks[markName].create({ color })))
    return true
  }
}

export function clearMarkColor(markName: ColorMarkName): Command {
  return (state, dispatch) => {
    const { from, to, empty } = state.selection
    if (empty) return false
    if (dispatch) dispatch(state.tr.removeMark(from, to, wordSchema.marks[markName]))
    return true
  }
}

/** True when a non-empty selection exists (Text/Image/Cell/All) — the single
 * condition for enabling the "Ausschneiden" toolbar button/keybinding. */
export function canCut(state: EditorState): boolean {
  return !state.selection.empty
}

export interface CutHandlers {
  /** Called when the native cut attempt fails, so callers can show visible
   * feedback instead of silently losing the selection. */
  onCutBlocked?: (message: string) => void
}

/**
 * Cut command for access paths that don't already produce a native `cut` DOM
 * event (toolbar button click, `Shift-Delete`). Native Ctrl+X/Cmd+X and the
 * browser context menu do NOT go through this function — those already work
 * correctly via prosemirror-view's built-in `cut` event handler.
 *
 * Deliberately triggers `document.execCommand('cut')` instead of chaining our
 * own clipboard-write + delete: this reproduces the exact same, already
 * correct path used by native Ctrl+X (including image/cell/all selections)
 * and avoids the async Clipboard API on purpose, so there is never a
 * half-completed state where the clipboard was written but the deletion
 * failed (or vice versa).
 */
export function cutSelection(handlers: CutHandlers = {}): Command {
  return (state, dispatch, view) => {
    if (state.selection.empty) return false
    if (!dispatch || !view) return true // availability check only (e.g. for `disabled`)

    view.focus()
    let succeeded = false
    try {
      succeeded = view.dom.ownerDocument.execCommand('cut')
    } catch {
      succeeded = false
    }
    if (!succeeded) {
      handlers.onCutBlocked?.('Ausschneiden wurde vom Browser blockiert. Es wurde nichts verändert.')
    }
    return succeeded
  }
}

