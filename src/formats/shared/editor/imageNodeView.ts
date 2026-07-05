import type { EditorView, NodeView } from 'prosemirror-view'
import type { Node as PMNode } from 'prosemirror-model'
import { clampImageDim } from './commands'

type Dir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
const DIRS: Dir[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

/**
 * NodeView for `image` that renders eight resize handles when the node is selected and lets
 * the user drag them to resize. See specs/bild-groesse-aendern-req.md §2.3:
 * - corner handle → width+height together, aspect ratio (frozen at gesture start) preserved;
 * - edge handle → one dimension only;
 * - drag deltas are screen px but the model is un-zoomed CSS px, so deltas are divided by
 *   the current zoom factor (§2.3.4 / §3.20);
 * - live preview during the drag, a single committing transaction (= one undo step) on
 *   pointer-up (§2.3.3);
 * - pointer events unify mouse + touch (§3.21 handled best-effort; the size input fields in
 *   the panel remain the guaranteed non-mouse path).
 */
export class ImageResizeNodeView implements NodeView {
  dom: HTMLElement
  private node: PMNode
  private view: EditorView
  private getPos: () => number | undefined
  private getZoom: () => number
  private img!: HTMLImageElement
  private handles: HTMLElement[] = []
  private onLiveResize?: (size: { w: number; h: number } | null) => void

  constructor(
    node: PMNode,
    view: EditorView,
    getPos: () => number | undefined,
    getZoom: () => number,
    onLiveResize?: (size: { w: number; h: number } | null) => void,
  ) {
    this.node = node
    this.view = view
    this.getPos = getPos
    this.getZoom = getZoom
    this.onLiveResize = onLiveResize
    const wrap = document.createElement('span')
    wrap.className = 'pm-image-wrap'
    const img = document.createElement('img')
    img.src = node.attrs.src
    img.alt = node.attrs.alt ?? ''
    img.draggable = false // resize handles must not fight ProseMirror's drag-to-move
    this.dom = wrap
    this.img = img
    this.applySize(img, node)
    // Record the intrinsic size once the bitmap is available, so "reset to original size"
    // works for inserted images too (imported images get it from the reader). Session-only,
    // never exported (toDOM omits it); not an undo step (§2.5).
    img.addEventListener('load', () => {
      this.captureNaturalSize()
      this.updateHandleVisibility()
    })
    if (img.complete && img.naturalWidth) this.captureNaturalSize()
    wrap.appendChild(img)
    for (const dir of DIRS) {
      const h = document.createElement('span')
      h.className = `pm-image-handle pm-image-handle-${dir}`
      h.dataset.dir = dir
      h.addEventListener('pointerdown', (e) => this.startResize(e, dir))
      // Keep the currently-focused control (e.g. a size input mid-edit) from blurring when a
      // handle drag starts — otherwise its stale blur-commit would overwrite the drag result.
      h.addEventListener('mousedown', (e) => e.preventDefault())
      wrap.appendChild(h)
      this.handles.push(h)
    }
  }

  private captureNaturalSize() {
    if (this.node.attrs.naturalWidth != null) return
    const nw = this.img.naturalWidth
    const nh = this.img.naturalHeight
    if (!nw || !nh) return
    const pos = this.getPos()
    if (pos == null) return
    const tr = this.view.state.tr
      .setNodeAttribute(pos, 'naturalWidth', nw)
      .setNodeAttribute(pos, 'naturalHeight', nh)
    tr.setMeta('addToHistory', false) // internal bookkeeping, not a user-visible edit
    this.view.dispatch(tr)
  }

  private applySize(img: HTMLImageElement, node: PMNode) {
    const { width, height } = node.attrs
    // An explicitly set size wins over the responsive `max-width:100%` default so the field
    // value and the rendered size always agree, even when the image is wider than the page
    // (§2.7). Unsized images stay capped to the content width (max-width:100%). The wrapper's
    // cap is toggled in lockstep so the handles line up with the real image box either way.
    img.style.width = width != null ? `${width}px` : ''
    img.style.height = height != null ? `${height}px` : ''
    img.style.maxWidth = width != null ? 'none' : ''
    this.dom.style.maxWidth = width != null ? 'none' : ''
    this.updateHandleVisibility()
  }

  // Ten-pixel handles are meaningless on (and would completely cover) a very small image,
  // which also makes the image impossible to click. Below a threshold, hide the handles —
  // such an image is still resizable via the panel's number fields. The threshold uses the
  // effective size (explicit or intrinsic).
  private updateHandleVisibility() {
    const w = this.node.attrs.width ?? this.img.naturalWidth ?? 0
    const h = this.node.attrs.height ?? this.img.naturalHeight ?? 0
    this.dom.classList.toggle('pm-image-no-handles', w < 24 || h < 24)
  }

  /** Current effective pixel size (falls back to the rendered box when the model is null). */
  private currentSize(): { w: number; h: number } {
    const zoom = this.getZoom() || 1
    const rect = this.img.getBoundingClientRect()
    const w = (this.node.attrs.width ?? rect.width / zoom) || this.img.naturalWidth || 1
    const h = (this.node.attrs.height ?? rect.height / zoom) || this.img.naturalHeight || 1
    return { w: Math.round(w), h: Math.round(h) }
  }

  private startResize(event: PointerEvent, dir: Dir) {
    // Keep the gesture ours: no ProseMirror drag-to-move, no text selection, no click-reconcile.
    event.preventDefault()
    event.stopPropagation()

    const start = this.currentSize()
    const ratio = start.w / start.h || 1
    const startX = event.clientX
    const startY = event.clientY
    const isCorner = dir.length === 2
    const west = dir.includes('w')
    const north = dir.includes('n')
    let next = { w: start.w, h: start.h }

    const onMove = (e: PointerEvent) => {
      const zoom = this.getZoom() || 1
      const dx = (e.clientX - startX) / zoom
      const dy = (e.clientY - startY) / zoom
      let w = start.w
      let h = start.h
      if (isCorner) {
        // drive by the horizontal delta (signed by which side is dragged), keep the ratio
        w = start.w + (west ? -dx : dx)
        h = w / ratio
      } else if (dir === 'e' || dir === 'w') {
        w = start.w + (west ? -dx : dx)
      } else {
        h = start.h + (north ? -dy : dy)
      }
      next = { w: clampImageDim(w), h: clampImageDim(h) }
      // live preview only — no transaction per move (§2.3.3)
      this.img.style.width = `${next.w}px`
      this.img.style.height = `${next.h}px`
      this.img.style.maxWidth = 'none'
      this.onLiveResize?.({ w: next.w, h: next.h }) // mirror live values into the panel fields (§1.6)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      const pos = this.getPos()
      if (pos == null) return
      // one committing transaction for the whole gesture = one undo step (§2.9)
      const tr = this.view.state.tr
        .setNodeAttribute(pos, 'width', next.w)
        .setNodeAttribute(pos, 'height', next.h)
      this.view.dispatch(tr.scrollIntoView())
      this.onLiveResize?.(null) // drag done → the committed model value is the source of truth
      // Deliberately no view.focus() here: stealing focus from a mid-edit size input would
      // fire its stale blur-commit and overwrite this drag result. The image stays selected.
    }
    // Listen on window (not the handle) so the drag keeps tracking even when the pointer
    // leaves the small handle — robust with synthetic pointer events too.
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false
    this.node = node
    if (node.attrs.src !== this.img.getAttribute('src')) this.img.src = node.attrs.src
    this.img.alt = node.attrs.alt ?? ''
    this.applySize(this.img, node)
    return true
  }

  selectNode() {
    this.dom.classList.add('ProseMirror-selectednode', 'pm-image-selected')
  }
  deselectNode() {
    this.dom.classList.remove('ProseMirror-selectednode', 'pm-image-selected')
  }

  // The image is a leaf; we own all DOM mutations (style changes during a drag), so
  // ProseMirror must not try to read the document back out of them.
  ignoreMutation() {
    return true
  }
  // Let ProseMirror handle clicks (to select the node) but keep pointer drags on handles.
  stopEvent(event: Event) {
    const t = event.target as HTMLElement | null
    return !!t && t.classList.contains('pm-image-handle')
  }
}
