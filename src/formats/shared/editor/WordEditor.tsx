import { useEffect, useRef, useState } from 'react'
import { EditorState, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { history, undo, redo } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap, toggleMark } from 'prosemirror-commands'
import { splitListItem } from 'prosemirror-schema-list'
import { tableEditing, columnResizing } from 'prosemirror-tables'
import { dropCursor } from 'prosemirror-dropcursor'
import { gapCursor } from 'prosemirror-gapcursor'
import { wordSchema } from '../schema'
import { createPaginationPlugin } from './pagination'
import { pageBackgroundStyle, PAGE_WIDTH_PX, PAGE_MARGIN_PX } from './pageLayout'
import { Toolbar } from './Toolbar'
import type { FormatEditorProps } from '../../types'
import type { WordDocumentContent } from '../documentModel'

/**
 * ProseMirror can fail to collapse a stale non-empty selection (e.g. an
 * `AllSelection` left over from Ctrl+A, or a selection whose surrounding
 * text just got re-wrapped by a toolbar command like Bold) when the user
 * then clicks to place the caret elsewhere — the DOM caret moves, but
 * `view.state.selection` doesn't. Left uncorrected, the *next* keystroke
 * (Enter, typing, ...) acts on that stale range instead of the new caret
 * position — e.g. Enter silently no-ops because commands like `splitBlock`
 * don't know how to split an `AllSelection`, and plain typing instead wipes
 * out and replaces the entire stale selection.
 *
 * A `document`-level `selectionchange` listener would be the obvious fix,
 * but it does not reliably fire for a click that merely collapses an
 * existing selection back onto itself. A `mouseup` handler on the editor's
 * own DOM is guaranteed to fire for every click, so it's used instead;
 * `posAtCoords` maps the click's screen position straight to a doc
 * position. This runs synchronously (no rAF/setTimeout deferral) so it is
 * guaranteed to land before any subsequent keydown the user fires next —
 * deferring it left a real race where a fast Enter/keystroke right after
 * the click could still observe the stale selection. This only steps in
 * for the narrow, unambiguous case — DOM shows a plain collapsed caret but
 * the model still holds a non-empty selection — so it never fights
 * ProseMirror's own handling of an actual drag-to-select.
 */
function reconcileSelectionOnClick(view: EditorView, event: MouseEvent) {
  if (view.state.selection.empty) return
  const domSelection = document.getSelection()
  if (!domSelection || !domSelection.isCollapsed) return

  const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
  if (!coords) return
  const newSelection = TextSelection.near(view.state.doc.resolve(coords.pos))
  if (!newSelection.eq(view.state.selection)) {
    view.dispatch(view.state.tr.setSelection(newSelection))
  }
}

export function WordEditor({ document: doc, onChange }: FormatEditorProps<WordDocumentContent>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [, forceRender] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return

    const bodyNode = wordSchema.nodeFromJSON(doc.content.body)
    const state = EditorState.create({
      doc: bodyNode,
      schema: wordSchema,
      plugins: [
        history(),
        keymap({
          'Mod-z': undo,
          'Mod-y': redo,
          'Mod-Shift-z': redo,
          Enter: splitListItem(wordSchema.nodes.list_item),
          'Mod-b': toggleMark(wordSchema.marks.strong),
          'Mod-i': toggleMark(wordSchema.marks.em),
          'Mod-u': toggleMark(wordSchema.marks.underline),
        }),
        keymap(baseKeymap),
        columnResizing(),
        tableEditing(),
        dropCursor(),
        gapCursor(),
        createPaginationPlugin(),
      ],
    })

    const view = new EditorView(containerRef.current, {
      state,
      dispatchTransaction(tr) {
        const newState = view.state.apply(tr)
        view.updateState(newState)
        if (tr.docChanged) {
          onChangeRef.current({ ...doc.content, body: newState.doc.toJSON() })
        }
        forceRender((n) => n + 1)
      },
    })
    viewRef.current = view
    view.focus()
    forceRender((n) => n + 1)

    const onMouseUp = (event: MouseEvent) => reconcileSelectionOnClick(view, event)
    view.dom.addEventListener('mouseup', onMouseUp)

    return () => {
      view.dom.removeEventListener('mouseup', onMouseUp)
      view.destroy()
      viewRef.current = null
    }
    // Body content is only used to seed the initial state — ProseMirror owns
    // document identity from here on, re-syncing from props would fight it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col h-full">
      {viewRef.current && <Toolbar view={viewRef.current} />}
      <div className="flex-1 overflow-auto bg-neutral-200 dark:bg-neutral-950 flex justify-center py-8">
        <div
          style={{
            width: PAGE_WIDTH_PX,
            padding: `${PAGE_MARGIN_PX}px`,
            ...pageBackgroundStyle(),
          }}
          className="shadow-lg"
        >
          <div ref={containerRef} className="word-editor-surface outline-none" />
        </div>
      </div>
    </div>
  )
}
