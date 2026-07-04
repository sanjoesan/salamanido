import JSZip from 'jszip'
import type { WordDocumentContent } from '../shared/documentModel'
import { OOXML_NAMESPACES, parseXmlDocument } from './xmlUtil'

interface JsonNode {
  type: string
  attrs?: Record<string, unknown>
  content?: JsonNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

const JC_TO_ALIGN: Record<string, string> = { left: 'left', center: 'center', right: 'right', both: 'justify' }

function childElements(el: Element, ns: string, localName: string): Element[] {
  return Array.from(el.children).filter((child) => child.namespaceURI === ns && child.localName === localName)
}

function firstChildNS(el: Element, ns: string, localName: string): Element | null {
  return childElements(el, ns, localName)[0] ?? null
}

async function readRelationships(zip: JSZip, relsPath: string): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const text = await zip.file(relsPath)?.async('text')
  if (!text) return map
  const doc = parseXmlDocument(text)
  for (const rel of Array.from(doc.getElementsByTagName('Relationship'))) {
    const id = rel.getAttribute('Id')
    const target = rel.getAttribute('Target')
    if (id && target) map.set(id, target)
  }
  return map
}

function resolvePartPath(basePath: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1)
  const baseDir = basePath.split('/').slice(0, -1)
  const parts = target.split('/')
  const stack = [...baseDir]
  for (const part of parts) {
    if (part === '..') stack.pop()
    else if (part !== '.') stack.push(part)
  }
  return stack.join('/')
}

interface HeadingInfo {
  outlineLvlByStyleId: Map<string, number>
}

function parseStylesXml(stylesDoc: Document | null): HeadingInfo {
  const outlineLvlByStyleId = new Map<string, number>()
  if (!stylesDoc) return { outlineLvlByStyleId }
  for (const styleEl of Array.from(stylesDoc.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'style'))) {
    const styleId = styleEl.getAttributeNS(OOXML_NAMESPACES.w, 'styleId')
    if (!styleId) continue
    const pPr = firstChildNS(styleEl, OOXML_NAMESPACES.w, 'pPr')
    const outlineLvl = pPr && firstChildNS(pPr, OOXML_NAMESPACES.w, 'outlineLvl')
    if (outlineLvl) {
      const val = Number(outlineLvl.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? '0')
      outlineLvlByStyleId.set(styleId, val)
    }
  }
  return { outlineLvlByStyleId }
}

function headingLevelForStyle(styleId: string | null, info: HeadingInfo): number | null {
  if (!styleId) return null
  const fromStyles = info.outlineLvlByStyleId.get(styleId)
  if (fromStyles !== undefined) return fromStyles + 1
  const match = /^Heading\s?([1-6])$/i.exec(styleId)
  if (match) return Number(match[1])
  return null
}

function parseNumberingXml(numberingDoc: Document | null): Map<string, 'bullet' | 'ordered'> {
  const kindByNumId = new Map<string, 'bullet' | 'ordered'>()
  if (!numberingDoc) return kindByNumId
  const abstractKindById = new Map<string, 'bullet' | 'ordered'>()
  for (const abstractEl of Array.from(numberingDoc.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'abstractNum'))) {
    const id = abstractEl.getAttributeNS(OOXML_NAMESPACES.w, 'abstractNumId')
    const lvl = firstChildNS(abstractEl, OOXML_NAMESPACES.w, 'lvl')
    const numFmt = lvl && firstChildNS(lvl, OOXML_NAMESPACES.w, 'numFmt')
    const fmt = numFmt?.getAttributeNS(OOXML_NAMESPACES.w, 'val')
    if (id) abstractKindById.set(id, fmt === 'bullet' ? 'bullet' : 'ordered')
  }
  for (const numEl of Array.from(numberingDoc.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'num'))) {
    const numId = numEl.getAttributeNS(OOXML_NAMESPACES.w, 'numId')
    const abstractRef = firstChildNS(numEl, OOXML_NAMESPACES.w, 'abstractNumId')
    const abstractId = abstractRef?.getAttributeNS(OOXML_NAMESPACES.w, 'val')
    if (numId && abstractId && abstractKindById.has(abstractId)) {
      kindByNumId.set(numId, abstractKindById.get(abstractId)!)
    }
  }
  return kindByNumId
}

function marksFromRunProperties(rPr: Element | null): Array<{ type: string; attrs?: Record<string, unknown> }> {
  if (!rPr) return []
  const marks: Array<{ type: string; attrs?: Record<string, unknown> }> = []
  if (firstChildNS(rPr, OOXML_NAMESPACES.w, 'b')) marks.push({ type: 'strong' })
  if (firstChildNS(rPr, OOXML_NAMESPACES.w, 'i')) marks.push({ type: 'em' })
  const underline = firstChildNS(rPr, OOXML_NAMESPACES.w, 'u')
  if (underline && underline.getAttributeNS(OOXML_NAMESPACES.w, 'val') !== 'none') marks.push({ type: 'underline' })
  if (firstChildNS(rPr, OOXML_NAMESPACES.w, 'strike')) marks.push({ type: 'strike' })
  const color = firstChildNS(rPr, OOXML_NAMESPACES.w, 'color')
  const colorVal = color?.getAttributeNS(OOXML_NAMESPACES.w, 'val')
  if (colorVal && colorVal !== 'auto') marks.push({ type: 'textColor', attrs: { color: `#${colorVal}` } })
  const shd = firstChildNS(rPr, OOXML_NAMESPACES.w, 'shd')
  const fill = shd?.getAttributeNS(OOXML_NAMESPACES.w, 'fill')
  if (fill && fill !== 'auto') marks.push({ type: 'highlight', attrs: { color: `#${fill}` } })
  return marks
}

interface RunLike {
  kind: 'text' | 'break' | 'image'
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  imageRelId?: string
  imageAlt?: string
}

function decodeParagraphRuns(pEl: Element): RunLike[] {
  const runs: RunLike[] = []
  for (const rEl of childElements(pEl, OOXML_NAMESPACES.w, 'r')) {
    const rPr = firstChildNS(rEl, OOXML_NAMESPACES.w, 'rPr')
    const marks = marksFromRunProperties(rPr)
    for (const child of Array.from(rEl.children)) {
      if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 't') {
        runs.push({ kind: 'text', text: child.textContent ?? '', marks: marks.length ? marks : undefined })
      } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'br') {
        runs.push({ kind: 'break' })
      } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'drawing') {
        const blip = child.getElementsByTagNameNS(OOXML_NAMESPACES.a, 'blip')[0]
        const relId = blip?.getAttributeNS(OOXML_NAMESPACES.r, 'embed') ?? undefined
        const docPr = child.getElementsByTagNameNS(OOXML_NAMESPACES.wp, 'docPr')[0]
        runs.push({ kind: 'image', imageRelId: relId, imageAlt: docPr?.getAttribute('name') ?? '' })
      }
    }
  }
  return runs
}

/** A `<w:p>` may mix text and image-drawing runs — split it into block nodes. */
function paragraphToBlocks(pEl: Element, headingInfo: HeadingInfo, imageRels: Map<string, string>): JsonNode[] {
  const pPr = firstChildNS(pEl, OOXML_NAMESPACES.w, 'pPr')
  const pStyleEl = pPr && firstChildNS(pPr, OOXML_NAMESPACES.w, 'pStyle')
  const styleId = pStyleEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? null
  const jcEl = pPr && firstChildNS(pPr, OOXML_NAMESPACES.w, 'jc')
  const jcVal = jcEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? 'left'
  const align = JC_TO_ALIGN[jcVal] ?? 'left'
  const level = headingLevelForStyle(styleId, headingInfo)

  const runs = decodeParagraphRuns(pEl)
  const hasImage = runs.some((r) => r.kind === 'image')

  if (!hasImage) {
    const content = runsToInline(runs)
    if (level) return [{ type: 'heading', attrs: { level, align }, content }]
    return [{ type: 'paragraph', attrs: { align }, content }]
  }

  const blocks: JsonNode[] = []
  let buffer: RunLike[] = []
  const flush = () => {
    if (buffer.length === 0) return
    const content = runsToInline(buffer)
    if (content.length > 0) blocks.push({ type: 'paragraph', attrs: { align }, content })
    buffer = []
  }
  for (const run of runs) {
    if (run.kind === 'image') {
      flush()
      const target = run.imageRelId ? imageRels.get(run.imageRelId) : undefined
      blocks.push({ type: 'image', attrs: { src: target ?? '', alt: run.imageAlt ?? '' } })
    } else {
      buffer.push(run)
    }
  }
  flush()
  return blocks
}

function runsToInline(runs: RunLike[]): JsonNode[] {
  return runs
    .filter((r) => r.kind !== 'image')
    .map((r) => (r.kind === 'break' ? { type: 'hard_break' } : { type: 'text', text: r.text ?? '', marks: r.marks }))
    .filter((n) => n.type !== 'text' || n.text)
}

interface ListMarker {
  numId: string | null
}

function listMarkerFor(pEl: Element): ListMarker {
  const pPr = firstChildNS(pEl, OOXML_NAMESPACES.w, 'pPr')
  const numPr = pPr && firstChildNS(pPr, OOXML_NAMESPACES.w, 'numPr')
  const numIdEl = numPr && firstChildNS(numPr, OOXML_NAMESPACES.w, 'numId')
  return { numId: numIdEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? null }
}

function parseTable(tblEl: Element, headingInfo: HeadingInfo, imageRels: Map<string, string>): JsonNode {
  const rowEls = childElements(tblEl, OOXML_NAMESPACES.w, 'tr')
  const colCount =
    childElements(tblEl, OOXML_NAMESPACES.w, 'tblGrid')[0]?.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'gridCol')
      .length ?? 1
  // Tracks, per grid column, the anchor cell node a vMerge continuation should extend.
  const anchors: Array<JsonNode | null> = Array.from({ length: colCount }, () => null)

  const rows: JsonNode[] = rowEls.map((rowEl) => {
    const cells: JsonNode[] = []
    let col = 0
    for (const tcEl of childElements(rowEl, OOXML_NAMESPACES.w, 'tc')) {
      const tcPr = firstChildNS(tcEl, OOXML_NAMESPACES.w, 'tcPr')
      const gridSpanEl = tcPr && firstChildNS(tcPr, OOXML_NAMESPACES.w, 'gridSpan')
      const colspan = Number(gridSpanEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? '1') || 1
      const vMergeEl = tcPr && firstChildNS(tcPr, OOXML_NAMESPACES.w, 'vMerge')
      const vMergeVal = vMergeEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val')
      const isContinuation = !!vMergeEl && vMergeVal !== 'restart'

      if (isContinuation) {
        const anchor = col < colCount ? anchors[col] : null
        if (anchor?.attrs) anchor.attrs.rowspan = (Number(anchor.attrs.rowspan) || 1) + 1
        col += colspan
        continue
      }

      const content = childElements(tcEl, OOXML_NAMESPACES.w, 'p')
        .flatMap((p) => paragraphToBlocks(p, headingInfo, imageRels))
        .concat(childElements(tcEl, OOXML_NAMESPACES.w, 'tbl').map((t) => parseTable(t, headingInfo, imageRels)))
      const cellNode: JsonNode = { type: 'table_cell', attrs: { colspan, rowspan: 1, colwidth: null }, content }
      cells.push(cellNode)

      for (let c = col; c < Math.min(col + colspan, colCount); c++) {
        anchors[c] = vMergeVal === 'restart' ? cellNode : null
      }
      col += colspan
    }
    return { type: 'table_row', content: cells }
  })

  return { type: 'table', content: rows }
}

function groupLists(items: Array<{ marker: ListMarker; block: JsonNode }>, kindByNumId: Map<string, 'bullet' | 'ordered'>): JsonNode[] {
  const result: JsonNode[] = []
  let currentNumId: string | null = null
  let currentItems: JsonNode[] = []

  const flush = () => {
    if (currentItems.length === 0) return
    const kind = (currentNumId && kindByNumId.get(currentNumId)) || 'bullet'
    result.push({ type: kind === 'ordered' ? 'ordered_list' : 'bullet_list', content: currentItems })
    currentItems = []
    currentNumId = null
  }

  for (const { marker, block } of items) {
    if (marker.numId) {
      if (currentNumId !== null && currentNumId !== marker.numId) flush()
      currentNumId = marker.numId
      currentItems.push({ type: 'list_item', content: [block] })
    } else {
      flush()
      result.push(block)
    }
  }
  flush()
  return result
}

async function resolveImageSources(zip: JSZip, blocks: JsonNode[]): Promise<void> {
  const tasks: Promise<void>[] = []
  const visit = (node: JsonNode) => {
    if (node.type === 'image' && typeof node.attrs?.src === 'string' && node.attrs.src) {
      const path = resolvePartPath('word/document.xml', node.attrs.src as string)
      const entry = zip.file(path)
      if (entry) {
        tasks.push(
          entry.async('base64').then((base64) => {
            const ext = path.split('.').pop()?.toLowerCase() ?? 'png'
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

async function readBodyChildren(
  bodyEl: Element,
  headingInfo: HeadingInfo,
  kindByNumId: Map<string, 'bullet' | 'ordered'>,
  imageRels: Map<string, string>,
  zip: JSZip,
): Promise<JsonNode[]> {
  const items: Array<{ marker: ListMarker; block: JsonNode }> = []
  for (const child of Array.from(bodyEl.children)) {
    if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'p') {
      const marker = listMarkerFor(child)
      for (const block of paragraphToBlocks(child, headingInfo, imageRels)) {
        items.push({ marker: block.type === 'paragraph' ? marker : { numId: null }, block })
      }
    } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'tbl') {
      items.push({ marker: { numId: null }, block: parseTable(child, headingInfo, imageRels) })
    }
  }
  const grouped = groupLists(items, kindByNumId)
  await resolveImageSources(zip, grouped)
  return grouped
}

export async function readDocx(file: File | Blob): Promise<WordDocumentContent> {
  const zip = await JSZip.loadAsync(file)

  const documentXmlText = await zip.file('word/document.xml')?.async('text')
  if (!documentXmlText) throw new Error('word/document.xml fehlt — keine gültige DOCX-Datei.')
  const documentDoc = parseXmlDocument(documentXmlText)
  const bodyEl = documentDoc.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'body')[0]

  const stylesXmlText = await zip.file('word/styles.xml')?.async('text')
  const headingInfo = parseStylesXml(stylesXmlText ? parseXmlDocument(stylesXmlText) : null)

  const numberingXmlText = await zip.file('word/numbering.xml')?.async('text')
  const kindByNumId = parseNumberingXml(numberingXmlText ? parseXmlDocument(numberingXmlText) : null)

  const documentRels = await readRelationships(zip, 'word/_rels/document.xml.rels')

  const bodyBlocks = bodyEl ? await readBodyChildren(bodyEl, headingInfo, kindByNumId, documentRels, zip) : []

  let headerBlocks: JsonNode[] | null = null
  let footerBlocks: JsonNode[] | null = null
  const sectPr = bodyEl && firstChildNS(bodyEl, OOXML_NAMESPACES.w, 'sectPr')
  if (sectPr) {
    const headerRef = firstChildNS(sectPr, OOXML_NAMESPACES.w, 'headerReference')
    const footerRef = firstChildNS(sectPr, OOXML_NAMESPACES.w, 'footerReference')
    const headerRelId = headerRef?.getAttributeNS(OOXML_NAMESPACES.r, 'id')
    const footerRelId = footerRef?.getAttributeNS(OOXML_NAMESPACES.r, 'id')

    if (headerRelId && documentRels.has(headerRelId)) {
      const path = resolvePartPath('word/document.xml', documentRels.get(headerRelId)!)
      const text = await zip.file(path)?.async('text')
      if (text) {
        const headerDoc = parseXmlDocument(text)
        const root = headerDoc.documentElement
        headerBlocks = await readBodyChildren(root, headingInfo, kindByNumId, documentRels, zip)
      }
    }
    if (footerRelId && documentRels.has(footerRelId)) {
      const path = resolvePartPath('word/document.xml', documentRels.get(footerRelId)!)
      const text = await zip.file(path)?.async('text')
      if (text) {
        const footerDoc = parseXmlDocument(text)
        const root = footerDoc.documentElement
        footerBlocks = await readBodyChildren(root, headingInfo, kindByNumId, documentRels, zip)
      }
    }
  }

  let title = ''
  const coreXmlText = await zip.file('docProps/core.xml')?.async('text')
  if (coreXmlText) {
    const coreDoc = parseXmlDocument(coreXmlText)
    title = coreDoc.getElementsByTagNameNS(OOXML_NAMESPACES.dc, 'title')[0]?.textContent ?? ''
  }

  return {
    body: { type: 'doc', content: bodyBlocks.length ? bodyBlocks : [{ type: 'paragraph', attrs: { align: 'left' } }] },
    header: headerBlocks ? { type: 'doc', content: headerBlocks } : null,
    footer: footerBlocks ? { type: 'doc', content: footerBlocks } : null,
    meta: { title },
  }
}
