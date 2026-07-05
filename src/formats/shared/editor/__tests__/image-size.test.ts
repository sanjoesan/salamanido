import { EditorState, NodeSelection, TextSelection } from 'prosemirror-state'
import { DOMParser as PMDOMParser, type Node as PMNode } from 'prosemirror-model'
import { wordSchema } from '../../schema'
import { setImageSize, setImageSizeAt, selectedImage, clampImageDim, IMAGE_MIN_PX, IMAGE_MAX_PX } from '../commands'

const TINY = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

function imageState(attrs: Record<string, unknown> = {}): EditorState {
  const doc = wordSchema.node('doc', null, [
    wordSchema.node('paragraph', null, [wordSchema.text('vor')]),
    wordSchema.node('image', { src: TINY, ...attrs }),
    wordSchema.node('paragraph', null, [wordSchema.text('nach')]),
  ])
  let state = EditorState.create({ doc, schema: wordSchema })
  const imgPos = state.doc.child(0).nodeSize // position right before the image node
  return state.apply(state.tr.setSelection(NodeSelection.create(state.doc, imgPos)))
}
function apply(state: EditorState, command: ReturnType<typeof setImageSize>): EditorState {
  let next = state
  const ran = command(state, (tr) => {
    next = state.apply(tr)
  })
  return ran ? next : state
}
function theImage(state: EditorState): PMNode {
  return state.doc.child(1)
}

describe('clampImageDim', () => {
  it('clamps to [8, 3000] and floors NaN/≤0 to the minimum', () => {
    expect(clampImageDim(100)).toBe(100)
    expect(clampImageDim(2)).toBe(IMAGE_MIN_PX)
    expect(clampImageDim(0)).toBe(IMAGE_MIN_PX)
    expect(clampImageDim(-50)).toBe(IMAGE_MIN_PX)
    expect(clampImageDim(NaN)).toBe(IMAGE_MIN_PX)
    expect(clampImageDim(99999)).toBe(IMAGE_MAX_PX)
    expect(clampImageDim(123.6)).toBe(124) // rounded
  })
})

describe('selectedImage', () => {
  it('returns the image node when a NodeSelection on an image is active, else null', () => {
    expect(selectedImage(imageState())?.node.type.name).toBe('image')
    const noSel = EditorState.create({ doc: wordSchema.node('doc', null, [wordSchema.node('paragraph')]), schema: wordSchema })
    expect(selectedImage(noSel)).toBeNull()
  })
})

describe('setImageSize', () => {
  it('sets width/height on the selected image', () => {
    const after = apply(imageState(), setImageSize(640, 480))
    expect(theImage(after).attrs.width).toBe(640)
    expect(theImage(after).attrs.height).toBe(480)
  })

  it('clamps out-of-range values in the command (not just the writer)', () => {
    const after = apply(imageState(), setImageSize(0, 99999))
    expect(theImage(after).attrs.width).toBe(IMAGE_MIN_PX)
    expect(theImage(after).attrs.height).toBe(IMAGE_MAX_PX)
  })

  it('keeps the NodeSelection on the image (so a second resize needs no re-click)', () => {
    const after = apply(imageState(), setImageSize(200, 150))
    expect(after.selection instanceof NodeSelection).toBe(true)
    expect((after.selection as NodeSelection).node.type.name).toBe('image')
  })

  it('returns false when the selection is not an image', () => {
    const textState = (() => {
      const doc = wordSchema.node('doc', null, [wordSchema.node('paragraph', null, [wordSchema.text('hallo')])])
      const s = EditorState.create({ doc, schema: wordSchema })
      return s.apply(s.tr.setSelection(TextSelection.create(s.doc, 1, 4)))
    })()
    expect(setImageSize(100, 100)(textState, undefined)).toBe(false)
  })

  it('never writes a NaN into the model from a bad value', () => {
    const after = apply(imageState(), setImageSize(Number('abc'), 200))
    expect(Number.isNaN(after.doc.child(1).attrs.width)).toBe(false)
    expect(after.doc.child(1).attrs.width).toBe(IMAGE_MIN_PX)
  })
})

describe('setImageSizeAt (position-based, robust against a lost NodeSelection)', () => {
  it('resizes the image at a position even when the current selection is NOT that image', () => {
    // selection is a plain text cursor, not the image's NodeSelection (the tablet-timing case)
    const base = imageState()
    const imgPos = base.doc.child(0).nodeSize
    const textSel = base.apply(base.tr.setSelection(TextSelection.create(base.doc, 1)))
    expect(selectedImage(textSel)).toBeNull() // precondition: image is not node-selected
    let next = textSel
    const ran = setImageSizeAt(imgPos, 300, 200)(textSel, (tr) => {
      next = textSel.apply(tr)
    })
    expect(ran).toBe(true)
    expect(next.doc.child(1).attrs.width).toBe(300)
    expect(next.doc.child(1).attrs.height).toBe(200)
    // and it re-establishes the NodeSelection on the image
    expect(selectedImage(next)?.node.type.name).toBe('image')
  })

  it('clamps and is a no-op when unchanged; returns false when the position is not an image', () => {
    const base = imageState()
    const imgPos = base.doc.child(0).nodeSize
    const after = apply(base, setImageSizeAt(imgPos, 0, 99999))
    expect(after.doc.child(1).attrs.width).toBe(IMAGE_MIN_PX)
    expect(after.doc.child(1).attrs.height).toBe(IMAGE_MAX_PX)
    expect(setImageSizeAt(0, 100, 100)(base, undefined)).toBe(false) // pos 0 is not an image
  })
})

describe('image schema: type normalisation + internal attrs do not leak to the DOM', () => {
  it('parseDOM normalises the width/height HTML string to number|null', () => {
    const dom = document.createElement('div')
    dom.innerHTML = `<img src="${TINY}" width="100" height="80">`
    const parsed = PMDOMParser.fromSchema(wordSchema).parse(dom)
    let img: PMNode | null = null
    parsed.descendants((n) => {
      if (n.type.name === 'image') img = n
      return img === null
    })
    expect(img).not.toBeNull()
    expect(img!.attrs.width).toBe(100)
    expect(img!.attrs.height).toBe(80)
    expect(typeof img!.attrs.width).toBe('number')
  })

  it('toDOM omits naturalWidth/naturalHeight and any null width/height', () => {
    const node = wordSchema.nodes.image.create({ src: TINY, naturalWidth: 640, naturalHeight: 480 })
    const out = node.type.spec.toDOM!(node) as [string, Record<string, string>]
    expect(out[1].src).toBe(TINY)
    expect('naturalwidth' in out[1]).toBe(false)
    expect('naturalWidth' in out[1]).toBe(false)
    expect('width' in out[1]).toBe(false) // null width is not emitted
  })
})
