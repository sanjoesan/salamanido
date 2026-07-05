import { useEffect, useState } from 'react'
import type { EditorView } from 'prosemirror-view'
import { selectedImage, setImageSizeAt } from './commands'

// The model stores CSS px (96 dpi); the panel shows cm (the app's page geometry is metric).
// bild-groesse-aendern-req.md §2.6.
const PX_PER_CM = 96 / 2.54
const pxToCm = (px: number) => Math.round((px / PX_PER_CM) * 10) / 10
const cmToPx = (cm: number) => Math.round(cm * PX_PER_CM)

/**
 * Size properties panel shown while an image is selected. The numeric width/height fields
 * are the guaranteed keyboard-/touch-reachable way to resize (the drag handles are an
 * additional, not the only, path — req §1, §7.3). Width/height stay coupled while
 * "Seitenverhältnis beibehalten" is on. "Auf Originalgröße zurücksetzen" restores the
 * insert/import size and is disabled when that is unknown (§2.5).
 */
export function ImageSizePanel({
  view,
  liveSize,
}: {
  view: EditorView
  liveSize?: { w: number; h: number } | null
}) {
  const sel = selectedImage(view.state)
  const node = sel?.node
  const widthPx: number | null = node?.attrs.width ?? node?.attrs.naturalWidth ?? null
  const heightPx: number | null = node?.attrs.height ?? node?.attrs.naturalHeight ?? null

  const [lockRatio, setLockRatio] = useState(true)
  const [wField, setWField] = useState('')
  const [hField, setHField] = useState('')
  // While the user is mid-edit, an async model change (e.g. the intrinsic size being
  // captured on image load, which can land *after* the first keystroke — reproducibly on
  // slower/tablet timing) must NOT clobber the half-typed value. Sync the fields from the
  // model only when not editing.
  const [editing, setEditing] = useState(false)

  // Re-seed the fields only when the image identity or its EXPLICIT size changes (a committed
  // resize), or during a live drag — never on the internal, asynchronous intrinsic-size
  // capture. Depending on `widthPx`/`heightPx` (which fold in `naturalWidth`) would let that
  // capture reset a half-typed field to the intrinsic size at the exact moment the user
  // presses Enter, dropping the input (reproducible under tablet/parallel load).
  const explicitW = node?.attrs.width ?? null
  const explicitH = node?.attrs.height ?? null
  const selPos = sel?.pos
  useEffect(() => {
    if (editing) return
    const w = liveSize?.w ?? explicitW ?? node?.attrs.naturalWidth ?? null
    const h = liveSize?.h ?? explicitH ?? node?.attrs.naturalHeight ?? null
    setWField(w != null ? String(pxToCm(w)) : '')
    setHField(h != null ? String(pxToCm(h)) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explicitW, explicitH, selPos, editing, liveSize])

  if (!sel || !node) return null

  const pos = sel.pos // the image's position; stable across the position-neutral attr-capture
  const hasOriginal = node.attrs.naturalWidth != null && node.attrs.naturalHeight != null

  const revertFields = () => {
    setEditing(false)
    setWField(widthPx != null ? String(pxToCm(widthPx)) : '')
    setHField(heightPx != null ? String(pxToCm(heightPx)) : '')
  }

  const commit = (which: 'w' | 'h', raw: string) => {
    setEditing(false) // done editing → the model becomes the source of truth again
    const cm = Number(raw.replace(',', '.'))
    // Target the image by its (render-captured, still-valid) POSITION and read its size fresh
    // from that position — never from the current selection, which on tablet timing can
    // momentarily not be the image's NodeSelection at the Enter/blur moment (field focus / DOM
    // selection sync). `setImageSizeAt` re-establishes the selection. Robust against that race
    // and against the async intrinsic-size capture (§2.2/§2.6/§3.16, 2. QA-Nachbesserung).
    const at = view.state.doc.nodeAt(pos)
    if (!at || at.type.name !== 'image' || !Number.isFinite(cm) || cm <= 0) {
      revertFields() // invalid input / image gone → visibly restore the last good value (§3.1)
      return
    }
    const a = at.attrs
    const curW = (a.width as number | null) ?? (a.naturalWidth as number | null)
    const curH = (a.height as number | null) ?? (a.naturalHeight as number | null)
    const r = curW && curH ? curW / curH : 1
    const px = cmToPx(cm)
    let w = curW ?? px
    let h = curH ?? px
    if (which === 'w') {
      w = px
      if (lockRatio) h = Math.round(px / r)
    } else {
      h = px
      if (lockRatio) w = Math.round(px * r)
    }
    setImageSizeAt(pos, w, h)(view.state, view.dispatch)
  }

  const resetToOriginal = () => {
    const at = view.state.doc.nodeAt(pos)
    if (!at || at.attrs.naturalWidth == null || at.attrs.naturalHeight == null) return
    setImageSizeAt(pos, at.attrs.naturalWidth as number, at.attrs.naturalHeight as number)(view.state, view.dispatch)
  }

  const fieldClass =
    'w-20 min-h-10 px-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100'

  return (
    <div
      role="group"
      aria-label="Bildgröße"
      className="flex flex-wrap items-center gap-3 px-3 py-1.5 text-sm border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300"
    >
      <label className="flex items-center gap-1">
        Breite
        <input
          type="number"
          step="0.1"
          min="0"
          inputMode="decimal"
          aria-label="Breite in Zentimetern"
          className={fieldClass}
          value={wField}
          onChange={(e) => {
            setEditing(true)
            setWField(e.target.value)
          }}
          onBlur={(e) => commit('w', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              // read the live DOM value, not the closure `wField`: under load React may not
              // have processed the onChange state update yet when Enter fires, so the closure
              // could still hold the pre-typed value (empty → invalid → wrong revert).
              commit('w', (e.target as HTMLInputElement).value)
            }
          }}
        />
        cm
      </label>
      <label className="flex items-center gap-1">
        Höhe
        <input
          type="number"
          step="0.1"
          min="0"
          inputMode="decimal"
          aria-label="Höhe in Zentimetern"
          className={fieldClass}
          value={hField}
          onChange={(e) => {
            setEditing(true)
            setHField(e.target.value)
          }}
          onBlur={(e) => commit('h', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit('h', (e.target as HTMLInputElement).value)
            }
          }}
        />
        cm
      </label>
      <label className="flex items-center gap-1.5 min-h-10">
        <input type="checkbox" checked={lockRatio} onChange={(e) => setLockRatio(e.target.checked)} />
        Seitenverhältnis beibehalten
      </label>
      <button
        type="button"
        disabled={!hasOriginal}
        title={hasOriginal ? 'Auf Originalgröße zurücksetzen' : 'Auf Originalgröße zurücksetzen (Originalgröße unbekannt)'}
        onMouseDown={(e) => e.preventDefault()}
        onClick={resetToOriginal}
        className="min-h-10 px-2 rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        Auf Originalgröße zurücksetzen
      </button>
    </div>
  )
}
