import JSZip from 'jszip'
import type { WordDocumentContent } from '../shared/documentModel'
import { assertLoadableDocument } from '../shared/validateDocument'
import { ODF_NAMESPACES, parseXmlDocument } from './xmlUtil'

interface JsonNode {
  type: string
  attrs?: Record<string, unknown>
  content?: JsonNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

interface RunStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  color?: string
  highlight?: string
}

interface ParsedStyles {
  textStyles: Map<string, RunStyle>
  paragraphAligns: Map<string, string>
  listKinds: Map<string, 'bullet' | 'ordered'>
}

function childElements(el: Element, ns: string, localName: string): Element[] {
  return Array.from(el.children).filter((child) => child.namespaceURI === ns && child.localName === localName)
}

function firstChildNS(el: Element, ns: string, localName: string): Element | null {
  return childElements(el, ns, localName)[0] ?? null
}

function parseAutomaticStyles(automaticStylesEl: Element | null): ParsedStyles {
  const textStyles = new Map<string, RunStyle>()
  const paragraphAligns = new Map<string, string>()
  const listKinds = new Map<string, 'bullet' | 'ordered'>()
  if (!automaticStylesEl) return { textStyles, paragraphAligns, listKinds }

  for (const styleEl of childElements(automaticStylesEl, ODF_NAMESPACES.style, 'style')) {
    const name = styleEl.getAttributeNS(ODF_NAMESPACES.style, 'name')
    const family = styleEl.getAttributeNS(ODF_NAMESPACES.style, 'family')
    if (!name) continue

    if (family === 'text') {
      const props = firstChildNS(styleEl, ODF_NAMESPACES.style, 'text-properties')
      if (!props) continue
      const style: RunStyle = {}
      if (props.getAttributeNS(ODF_NAMESPACES.fo, 'font-weight') === 'bold') style.bold = true
      if (props.getAttributeNS(ODF_NAMESPACES.fo, 'font-style') === 'italic') style.italic = true
      const underline = props.getAttributeNS(ODF_NAMESPACES.style, 'text-underline-style')
      if (underline && underline !== 'none') style.underline = true
      const strike = props.getAttributeNS(ODF_NAMESPACES.style, 'text-line-through-style')
      if (strike && strike !== 'none') style.strike = true
      const color = props.getAttributeNS(ODF_NAMESPACES.fo, 'color')
      if (color) style.color = color
      const bg = props.getAttributeNS(ODF_NAMESPACES.fo, 'background-color')
      if (bg) style.highlight = bg
      textStyles.set(name, style)
    } else if (family === 'paragraph') {
      const props = firstChildNS(styleEl, ODF_NAMESPACES.style, 'paragraph-properties')
      const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
      if (align) paragraphAligns.set(name, align)
    }
  }

  for (const listStyleEl of childElements(automaticStylesEl, ODF_NAMESPACES.text, 'list-style')) {
    const name = listStyleEl.getAttributeNS(ODF_NAMESPACES.style, 'name')
    if (!name) continue
    const hasNumber = childElements(listStyleEl, ODF_NAMESPACES.text, 'list-level-style-number').length > 0
    listKinds.set(name, hasNumber ? 'ordered' : 'bullet')
  }

  return { textStyles, paragraphAligns, listKinds }
}

const EMPTY_REDLINE_MARKER_NAMES = new Set([
  'change',
  'change-start',
  'change-end',
  'bookmark',
  'bookmark-start',
  'bookmark-end',
])

function isEmptyRedlineMarker(el: Element): boolean {
  return el.namespaceURI === ODF_NAMESPACES.text && EMPTY_REDLINE_MARKER_NAMES.has(el.localName)
}

function emptyParagraph(): JsonNode {
  return { type: 'paragraph', attrs: { align: 'left' } }
}

function decodeInline(pEl: Element, styles: ParsedStyles): JsonNode[] {
  const result: JsonNode[] = []

  function marksFor(styleName: string | null): Array<{ type: string; attrs?: Record<string, unknown> }> {
    if (!styleName) return []
    const style = styles.textStyles.get(styleName)
    if (!style) return []
    const marks: Array<{ type: string; attrs?: Record<string, unknown> }> = []
    if (style.bold) marks.push({ type: 'strong' })
    if (style.italic) marks.push({ type: 'em' })
    if (style.underline) marks.push({ type: 'underline' })
    if (style.strike) marks.push({ type: 'strike' })
    if (style.color) marks.push({ type: 'textColor', attrs: { color: style.color } })
    if (style.highlight) marks.push({ type: 'highlight', attrs: { color: style.highlight } })
    return marks
  }

  function walk(node: ChildNode, marks: Array<{ type: string; attrs?: Record<string, unknown> }>) {
    if (node.nodeType === node.TEXT_NODE) {
      const text = node.textContent ?? ''
      if (text) result.push({ type: 'text', text, marks: marks.length ? marks : undefined })
      return
    }
    if (node.nodeType !== node.ELEMENT_NODE) return
    const el = node as Element
    if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'span') {
      const styleName = el.getAttributeNS(ODF_NAMESPACES.text, 'style-name')
      const childMarks = [...marks, ...marksFor(styleName)]
      for (const child of Array.from(el.childNodes)) walk(child, childMarks)
    } else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'line-break') {
      result.push({ type: 'hard_break' })
    } else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 's') {
      const count = Number(el.getAttributeNS(ODF_NAMESPACES.text, 'c') ?? '1') || 1
      result.push({ type: 'text', text: ' '.repeat(count), marks: marks.length ? marks : undefined })
    } else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'tab') {
      result.push({ type: 'text', text: '\t', marks: marks.length ? marks : undefined })
    } else if (isEmptyRedlineMarker(el)) {
      // Redline/bookmark markers carry no textual content of their own — nothing to
      // descend into, listed separately purely for documentation clarity.
    } else {
      // Any other inline element (hyperlink `text:a`, `text:placeholder`,
      // `text:date`/`text:page-number`/`text:page-count`/`text:author-name`, a
      // footnote's `text:note`, ...) is not individually interpreted, but its visible
      // text must not be silently dropped — descend into its children with the same
      // marks instead of stopping here (see datei-oeffnen-req.md §3.13).
      for (const child of Array.from(el.childNodes)) walk(child, marks)
    }
  }

  for (const child of Array.from(pEl.childNodes)) walk(child, [])
  return result
}

/** A `<text:p>` may hold plain text, image/textbox/object frames, or both — split it into block nodes. */
function paragraphToBlocks(pEl: Element, styles: ParsedStyles, depth = 0): JsonNode[] {
  const frames = childElements(pEl, ODF_NAMESPACES.draw, 'frame')
  const styleName = pEl.getAttributeNS(ODF_NAMESPACES.text, 'style-name')
  const align = (styleName && styles.paragraphAligns.get(styleName)) || 'left'

  if (frames.length === 0) {
    const content = decodeInline(pEl, styles)
    // Mirror ProseMirror's own Node.toJSON(), which omits `content` entirely for an
    // empty fragment rather than emitting `content: []` — otherwise a freshly created
    // blank document and the same document after an export/import round trip would be
    // structurally different (`toEqual`) despite ProseMirror treating them as the same
    // node. See createBlankWordDocument()/emptyDocJSON() in documentModel.ts.
    return [content.length > 0 ? { type: 'paragraph', attrs: { align }, content } : { type: 'paragraph', attrs: { align } }]
  }

  const blocks: JsonNode[] = []
  let textBuffer: ChildNode[] = []

  const flushText = () => {
    if (textBuffer.length === 0) return
    const wrapper = pEl.ownerDocument.createElementNS(ODF_NAMESPACES.text, 'text:p')
    for (const node of textBuffer) wrapper.appendChild(node.cloneNode(true))
    const inline = decodeInline(wrapper, styles)
    if (inline.length > 0) blocks.push({ type: 'paragraph', attrs: { align }, content: inline })
    textBuffer = []
  }

  for (const child of Array.from(pEl.childNodes)) {
    if (child.nodeType === child.ELEMENT_NODE && (child as Element).localName === 'frame' && (child as Element).namespaceURI === ODF_NAMESPACES.draw) {
      flushText()
      blocks.push(...frameToBlocks(child as Element, styles, depth))
    } else {
      textBuffer.push(child)
    }
  }
  flushText()

  return blocks
}

// Guards against pathologically deep nesting (lists-in-lists, tables-in-tables,
// textbox-in-textbox) in real-world files, which otherwise either blow the call stack
// or make import take far too long. Past this depth we stop descending further.
const MAX_NESTING_DEPTH = 25

/**
 * Decides what a `<draw:frame>` represents:
 * - an actual image (`draw:image` child present) → an `image` node, as before.
 * - otherwise a textbox (`draw:text-box` child present) → its contents are kept as an
 *   `unsupported_block` so the visible text survives instead of turning into a
 *   blank/empty image node (datei-oeffnen-req.md §3.13, "draw:frame-Textbox").
 * - otherwise (a chart/OLE object with no extractable text) → an opaque
 *   `unsupported_block` placeholder, still visible rather than vanishing.
 *
 * Also used directly from `elementToBlocks` for page-anchored frames, which may
 * appear as a direct child of `office:text` (not nested inside a `text:p`).
 */
function frameToBlocks(frameEl: Element, styles: ParsedStyles, depth: number): JsonNode[] {
  const imageEl = firstChildNS(frameEl, ODF_NAMESPACES.draw, 'image')
  if (imageEl) {
    const href = imageEl.getAttributeNS(ODF_NAMESPACES.xlink, 'href') ?? ''
    const alt = frameEl.getAttributeNS(ODF_NAMESPACES.draw, 'name') ?? ''
    return [{ type: 'image', attrs: { src: href, alt } }]
  }

  const textBoxEl = firstChildNS(frameEl, ODF_NAMESPACES.draw, 'text-box')
  if (textBoxEl) {
    if (depth >= MAX_NESTING_DEPTH) return [{ type: 'unsupported_block', attrs: { kind: 'object' }, content: [emptyParagraph()] }]
    const content = Array.from(textBoxEl.children).flatMap((child) => elementToBlocks(child, styles, depth + 1))
    return [{ type: 'unsupported_block', attrs: { kind: 'textbox' }, content: content.length ? content : [emptyParagraph()] }]
  }

  return [{ type: 'unsupported_block', attrs: { kind: 'object' }, content: [emptyParagraph()] }]
}

function elementToBlocks(el: Element, styles: ParsedStyles, depth = 0): JsonNode[] {
  const ns = el.namespaceURI
  const local = el.localName

  if (ns === ODF_NAMESPACES.text && local === 'p') return paragraphToBlocks(el, styles, depth)

  if (ns === ODF_NAMESPACES.text && local === 'h') {
    const level = Number(el.getAttributeNS(ODF_NAMESPACES.text, 'outline-level') ?? '1') || 1
    const styleName = el.getAttributeNS(ODF_NAMESPACES.text, 'style-name')
    const align = (styleName && styles.paragraphAligns.get(styleName)) || 'left'
    const content = decodeInline(el, styles)
    return [content.length > 0 ? { type: 'heading', attrs: { level, align }, content } : { type: 'heading', attrs: { level, align } }]
  }

  if (depth >= MAX_NESTING_DEPTH) return []

  // A `draw:frame` may legally appear as a direct child of `office:text` (e.g. a
  // page-anchored textbox/image, `text:anchor-type="page"`), not just nested inside a
  // `text:p` — without this, such a frame (and any text inside it) was silently
  // dropped entirely (datei-oeffnen-code.md §5, "Bug B").
  if (ns === ODF_NAMESPACES.draw && local === 'frame') return frameToBlocks(el, styles, depth)

  if (ns === ODF_NAMESPACES.text && local === 'list') {
    const styleName = el.getAttributeNS(ODF_NAMESPACES.text, 'style-name')
    const kind = (styleName && styles.listKinds.get(styleName)) || 'bullet'
    const items = childElements(el, ODF_NAMESPACES.text, 'list-item').map((itemEl) => ({
      type: 'list_item',
      content: Array.from(itemEl.children).flatMap((child) => elementToBlocks(child, styles, depth + 1)),
    }))
    return [{ type: kind === 'ordered' ? 'ordered_list' : 'bullet_list', content: items }]
  }

  if (ns === ODF_NAMESPACES.table && local === 'table') {
    const rows = childElements(el, ODF_NAMESPACES.table, 'table-row').map((rowEl) => ({
      type: 'table_row',
      content: childElements(rowEl, ODF_NAMESPACES.table, 'table-cell').map((cellEl) => {
        const colspan = Number(cellEl.getAttributeNS(ODF_NAMESPACES.table, 'number-columns-spanned') ?? '1') || 1
        const rowspan = Number(cellEl.getAttributeNS(ODF_NAMESPACES.table, 'number-rows-spanned') ?? '1') || 1
        return {
          type: 'table_cell',
          attrs: { colspan, rowspan, colwidth: null },
          content: Array.from(cellEl.children).flatMap((child) => elementToBlocks(child, styles, depth + 1)),
        }
      }),
    }))
    return [{ type: 'table', content: rows }]
  }

  return []
}

async function resolveImageSources(
  zip: JSZip,
  blocks: JsonNode[],
): Promise<void> {
  const tasks: Promise<void>[] = []
  const visit = (node: JsonNode) => {
    if (node.type === 'image' && typeof node.attrs?.src === 'string') {
      const href = node.attrs.src as string
      const entry = zip.file(href)
      if (entry) {
        tasks.push(
          entry.async('base64').then((base64) => {
            const ext = href.split('.').pop()?.toLowerCase() ?? 'png'
            const mime = ext === 'jpg' ? 'jpeg' : ext
            node.attrs = { ...node.attrs, src: `data:image/${mime};base64,${base64}` }
          }),
        )
      }
    }
    node.content?.forEach(visit)
  }
  blocks.forEach(visit)
  await Promise.all(tasks)
}

async function readOfficeTextChildren(bodyTextEl: Element, styles: ParsedStyles, zip: JSZip): Promise<JsonNode[]> {
  const blocks = Array.from(bodyTextEl.children).flatMap((child) => elementToBlocks(child, styles))
  await resolveImageSources(zip, blocks)
  return blocks
}

export async function readOdt(file: File | Blob): Promise<WordDocumentContent> {
  const zip = await JSZip.loadAsync(file)

  const contentXmlText = await zip.file('content.xml')?.async('text')
  if (!contentXmlText) throw new Error('content.xml fehlt — keine gültige ODT-Datei.')
  const contentDoc = parseXmlDocument(contentXmlText)
  const contentAutomaticStyles = contentDoc.getElementsByTagNameNS(ODF_NAMESPACES.office, 'automatic-styles')[0] ?? null
  const contentStyles = parseAutomaticStyles(contentAutomaticStyles)
  const officeText = contentDoc.getElementsByTagNameNS(ODF_NAMESPACES.office, 'text')[0]
  const bodyBlocks = officeText ? await readOfficeTextChildren(officeText, contentStyles, zip) : []

  let headerBlocks: JsonNode[] | null = null
  let footerBlocks: JsonNode[] | null = null
  const stylesXmlText = await zip.file('styles.xml')?.async('text')
  if (stylesXmlText) {
    const stylesDoc = parseXmlDocument(stylesXmlText)
    const stylesAutomaticStyles = stylesDoc.getElementsByTagNameNS(ODF_NAMESPACES.office, 'automatic-styles')[0] ?? null
    const stylesForChrome = parseAutomaticStyles(stylesAutomaticStyles)
    const masterPage = stylesDoc.getElementsByTagNameNS(ODF_NAMESPACES.style, 'master-page')[0]
    if (masterPage) {
      const headerEl = firstChildNS(masterPage, ODF_NAMESPACES.style, 'header')
      const footerEl = firstChildNS(masterPage, ODF_NAMESPACES.style, 'footer')
      if (headerEl) {
        headerBlocks = Array.from(headerEl.children).flatMap((child) => elementToBlocks(child, stylesForChrome))
        await resolveImageSources(zip, headerBlocks)
      }
      if (footerEl) {
        footerBlocks = Array.from(footerEl.children).flatMap((child) => elementToBlocks(child, stylesForChrome))
        await resolveImageSources(zip, footerBlocks)
      }
    }
  }

  let title = ''
  const metaXmlText = await zip.file('meta.xml')?.async('text')
  if (metaXmlText) {
    const metaDoc = parseXmlDocument(metaXmlText)
    title = metaDoc.getElementsByTagNameNS(ODF_NAMESPACES.dc, 'title')[0]?.textContent ?? ''
  }

  const result: WordDocumentContent = {
    body: { type: 'doc', content: bodyBlocks.length ? bodyBlocks : [{ type: 'paragraph', attrs: { align: 'left' } }] },
    header: headerBlocks ? { type: 'doc', content: headerBlocks } : null,
    footer: footerBlocks ? { type: 'doc', content: footerBlocks } : null,
    meta: { title },
  }
  assertLoadableDocument(result)
  return result
}
