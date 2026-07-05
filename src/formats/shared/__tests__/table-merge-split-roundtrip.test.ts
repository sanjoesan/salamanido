import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'
import { EditorState, TextSelection } from 'prosemirror-state'
import { TableMap, CellSelection } from 'prosemirror-tables'
import type { Node as PMNode } from 'prosemirror-model'
import { wordSchema } from '../schema'
import type { WordDocumentContent } from '../documentModel'
import { mergeCellsWithCursor, splitCellWithCursor } from '../editor/commands'
import { writeDocx } from '../../docx/writer'
import { readDocx } from '../../docx/reader'
import { writeOdt } from '../../odt/writer'
import { readOdt } from '../../odt/reader'

// Round trip + independent raw-XML verification + cross-format + real fixtures for cell
// merge/split (specs/zellen-verbinden-req.md §4). Same rigour the table-structure feature
// was held to: assert against raw word/document.xml & content.xml via JSZip, not only the
// app's own reader.

/* eslint-disable @typescript-eslint/no-explicit-any */

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
function content(...blocks: PMNode[]): WordDocumentContent {
  return { body: wordSchema.node('doc', null, blocks).toJSON(), header: null, footer: null, meta: { title: '' } }
}
function cellPos(state: EditorState, idx: number): number {
  return 1 + TableMap.get(state.doc.firstChild!).map[idx]
}

/** Merges the cells with grid indices a..b (a rectangular CellSelection), returns new content. */
function mergeCells(input: WordDocumentContent, a: number, b: number): WordDocumentContent {
  let state = EditorState.create({ doc: wordSchema.nodeFromJSON(input.body), schema: wordSchema })
  state = state.apply(state.tr.setSelection(CellSelection.create(state.doc, cellPos(state, a), cellPos(state, b))))
  let next = state
  mergeCellsWithCursor()(state, (tr) => {
    next = state.apply(tr)
  })
  return { ...input, body: next.doc.toJSON() }
}

/** Puts the cursor inside the first cell whose colspan/rowspan > 1 (or, if `anyCell`, the
 * first table cell) and runs split. Returns new content unchanged if nothing was split. */
function splitCellAt(input: WordDocumentContent, opts: { anyCell?: boolean } = {}): WordDocumentContent {
  let state = EditorState.create({ doc: wordSchema.nodeFromJSON(input.body), schema: wordSchema })
  let target = -1
  state.doc.descendants((node, pos) => {
    if (target !== -1) return false
    if (node.type.name === 'table_cell' || node.type.name === 'table_header') {
      const merged = (node.attrs.colspan ?? 1) > 1 || (node.attrs.rowspan ?? 1) > 1
      if (opts.anyCell || merged) target = pos
    }
    return true
  })
  if (target < 0) return input
  state = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(target + 2))))
  let next = state
  splitCellWithCursor()(state, (tr) => {
    next = state.apply(tr)
  })
  return { ...input, body: next.doc.toJSON() }
}

function firstTable(c: WordDocumentContent): any {
  return (c.body as any).content.find((n: any) => n.type === 'table')
}
function count(hay: string, re: RegExp): number {
  return (hay.match(re) ?? []).length
}
async function docxXml(c: WordDocumentContent): Promise<string> {
  return (await JSZip.loadAsync(await writeDocx(c))).file('word/document.xml')!.async('text')
}
async function odtXml(c: WordDocumentContent): Promise<string> {
  return (await JSZip.loadAsync(await writeOdt(c))).file('content.xml')!.async('text')
}

describe('cell merge: round trip + raw-XML (req §4)', () => {
  it('a horizontal merge writes a real <w:gridSpan> (DOCX) and number-columns-spanned (ODT)', async () => {
    const merged = mergeCells(content(table(trow(cell('l'), cell('r')))), 0, 1)
    const dx = await docxXml(merged)
    expect(count(dx, /<w:gridSpan\b/g)).toBeGreaterThanOrEqual(1)
    const ox = await odtXml(merged)
    expect(ox).toMatch(/table:number-columns-spanned="2"/)
  })

  it('a vertical merge writes a real <w:vMerge> (DOCX) and covered-table-cell (ODT)', async () => {
    // grid indices 0 (0,0) and 1 (1,0) — a 2×1 vertical selection
    const merged = mergeCells(content(table(trow(cell('top')), trow(cell('bottom')))), 0, 1)
    const dx = await docxXml(merged)
    expect(count(dx, /<w:vMerge\b/g)).toBeGreaterThanOrEqual(1)
    const ox = await odtXml(merged)
    expect(count(ox, /<table:covered-table-cell\b/g)).toBeGreaterThanOrEqual(1)
  })

  it('merged content survives DOCX and ODT reimport (both cell texts kept)', async () => {
    const merged = mergeCells(content(table(trow(cell('eins'), cell('zwei')))), 0, 1)
    const viaDocx = await readDocx(await writeDocx(merged))
    const viaOdt = await readOdt(await writeOdt(merged))
    for (const r of [viaDocx, viaOdt]) {
      const txt = JSON.stringify(r.body)
      expect(txt).toContain('eins')
      expect(txt).toContain('zwei')
    }
    expect(firstTable(viaDocx).content[0].content[0].attrs.colspan).toBe(2)
  })
})

describe('cell split: round trip (req §4)', () => {
  it('splitting a colspan cell removes the merge from the exported XML', async () => {
    const split = splitCellAt(content(table(trow(cell('x', { colspan: 2 })))))
    const dx = await docxXml(split)
    expect(count(dx, /<w:gridSpan\b/g)).toBe(0) // merge gone
    const ox = await odtXml(split)
    expect(ox).not.toMatch(/table:number-columns-spanned="2"/)
    // and the row now has two real cells after reimport
    const viaOdt = await readOdt(await writeOdt(split))
    expect(firstTable(viaOdt).content[0].content).toHaveLength(2)
  })
})

describe('cell merge/split: cross-format adapter (req §4.5)', () => {
  it('DOCX-origin merge exported as ODT keeps the merge; ODT-origin merge exported as DOCX too', async () => {
    const base = content(table(trow(cell('a'), cell('b'))))
    const fromDocx = await readDocx(await writeDocx(base))
    const mergedViaOdt = await readOdt(await writeOdt(mergeCells(fromDocx, 0, 1)))
    expect(firstTable(mergedViaOdt).content[0].content[0].attrs.colspan).toBe(2)

    const fromOdt = await readOdt(await writeOdt(base))
    const mergedViaDocx = await readDocx(await writeDocx(mergeCells(fromOdt, 0, 1)))
    expect(firstTable(mergedViaDocx).content[0].content[0].attrs.colspan).toBe(2)
  })
})

describe('cell merge/split: real foreign-file fixtures (req §3 Nr. 16)', () => {
  const ODT_DIR = join(__dirname, '../../../../tests/fixtures/external/odt')
  it('tableCoveredContent.odt: splitting an already-merged cell then reimporting stays valid', async () => {
    const buffer = readFileSync(join(ODT_DIR, 'tableCoveredContent.odt'))
    const imported = await readOdt(new Blob([new Uint8Array(buffer)]))
    // sanity: the fixture contains at least one merged cell
    const hasMerge = JSON.stringify(imported.body).match(/"(colspan|rowspan)":[2-9]/)
    expect(hasMerge).not.toBeNull()
    const split = splitCellAt(imported) // splits a genuinely merged cell (colspan/rowspan>1)
    const reimported = await readOdt(await writeOdt(split))
    // no crash, still a table present, and the doc actually changed (a merge was resolved)
    expect(firstTable(reimported)).toBeDefined()
    expect(JSON.stringify(split.body)).not.toBe(JSON.stringify(imported.body))
  })
})
