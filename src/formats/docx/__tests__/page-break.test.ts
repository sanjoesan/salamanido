import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'
import { writeDocx } from '../writer'
import { readDocx } from '../reader'
import { writeOdt } from '../../odt/writer'
import { readOdt } from '../../odt/reader'
import type { WordDocumentContent } from '../../shared/documentModel'

// specs/seitenumbruch-req.md §6.1/§6.2 (DOCX-Writer/-Reader) + §5.2.3/4 (Cross-Format,
// auf Unit-Ebene — die App bietet keinen Cross-Format-Export über die UI an).

const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/docx')

function doc(content: unknown[]): WordDocumentContent {
  return { body: { type: 'doc', content }, header: null, footer: null, meta: { title: '' } }
}
function paragraph(text: string) {
  return { type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text }] }
}
const pageBreak = () => ({ type: 'page_break' })

async function documentXmlOf(content: WordDocumentContent): Promise<string> {
  const blob = await writeDocx(content)
  const zip = await JSZip.loadAsync(blob)
  return zip.file('word/document.xml')!.async('text')
}

function countNodes(result: WordDocumentContent, type: string): number {
  let count = 0
  const visit = (node: { type?: string; content?: unknown[] }) => {
    if (node.type === type) count += 1
    ;(node.content as Array<{ type?: string; content?: unknown[] }> | undefined)?.forEach(visit)
  }
  ;(result.body as { content?: unknown[] }).content?.forEach((n) => visit(n as never))
  return count
}

describe('DOCX-Writer: manueller Seitenumbruch (§3.4)', () => {
  it('schreibt exakt <w:br w:type="page"/> — nicht lastRenderedPageBreak, nicht sectPr-basiert', async () => {
    const xml = await documentXmlOf(doc([paragraph('a'), pageBreak(), paragraph('b')]))
    expect(xml.match(/<w:br w:type="page"\/>/g)).toHaveLength(1)
    expect(xml).not.toContain('lastRenderedPageBreak')
    // genau EIN sectPr (das Standard-Seitensetup am Body-Ende), keins pro Umbruch
    expect(xml.match(/<w:sectPr>/g)).toHaveLength(1)
  })

  it('Umbruch-Run steht im FOLGE-Absatz (dessen Typ/Inhalt erhalten bleibt)', async () => {
    const xml = await documentXmlOf(doc([paragraph('a'), pageBreak(), paragraph('b')]))
    // der Break-Run gehört zum Absatz mit "b"
    expect(xml).toMatch(/<w:r><w:br w:type="page"\/><\/w:r><w:r>(<w:rPr>.*?<\/w:rPr>)?<w:t[^>]*>b<\/w:t>/)
  })

  it('Zeilenumbruch (hard_break) bleibt <w:br/> OHNE type — keine Verwechslung (§3.11)', async () => {
    const xml = await documentXmlOf(
      doc([{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'x' }, { type: 'hard_break' }, { type: 'text', text: 'y' }] }]),
    )
    expect(xml).toContain('<w:br/>')
    expect(xml).not.toContain('w:type="page"')
  })

  it('Umbruch vor einer Tabelle → eigenständiger Break-Absatz vor <w:tbl>', async () => {
    const table = {
      type: 'table',
      content: [
        {
          type: 'table_row',
          content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [paragraph('z')] }],
        },
      ],
    }
    const xml = await documentXmlOf(doc([paragraph('a'), pageBreak(), table]))
    expect(xml).toMatch(/<w:p><w:r><w:br w:type="page"\/><\/w:r><\/w:p><w:tbl>/)
  })
})

describe('DOCX-Rundreise: Seitenumbruch (§5.2)', () => {
  it('p / Umbruch / p überlebt Export→Reimport an derselben Stelle', async () => {
    const result = await readDocx(await writeDocx(doc([paragraph('vorher'), pageBreak(), paragraph('nachher')])))
    const content = (result.body as { content: Array<{ type: string }> }).content
    expect(content.map((n) => n.type)).toEqual(['paragraph', 'page_break', 'paragraph'])
    expect(countNodes(result, 'hard_break')).toBe(0) // nicht degradiert (§3.11)
  })

  it('Überschrift direkt nach dem Umbruch bleibt Überschrift (§5.2.6)', async () => {
    const original = doc([
      paragraph('text'),
      pageBreak(),
      { type: 'heading', attrs: { level: 3, align: 'left' }, content: [{ type: 'text', text: 'Kapitel' }] },
    ])
    const result = await readDocx(await writeDocx(original))
    const content = (result.body as { content: Array<{ type: string; attrs?: { level?: number } }> }).content
    expect(content.map((n) => n.type)).toEqual(['paragraph', 'page_break', 'heading'])
    expect(content[2].attrs?.level).toBe(3)
  })

  it('mehrere Umbrüche bleiben einzeln und an der richtigen Stelle (Grenzfall 9)', async () => {
    const original = doc([paragraph('k1'), pageBreak(), paragraph('k2'), pageBreak(), paragraph('k3')])
    const result = await readDocx(await writeDocx(original))
    const content = (result.body as { content: Array<{ type: string }> }).content
    expect(content.map((n) => n.type)).toEqual(['paragraph', 'page_break', 'paragraph', 'page_break', 'paragraph'])
  })

  it('Umbruch am Dokumentende: neue leere Seite bleibt erhalten (Grenzfall 2)', async () => {
    const result = await readDocx(await writeDocx(doc([paragraph('text'), pageBreak(), { type: 'paragraph', attrs: { align: 'left' } }])))
    const content = (result.body as { content: Array<{ type: string }> }).content
    expect(content.map((n) => n.type)).toEqual(['paragraph', 'page_break', 'paragraph'])
  })

  it('zwei Umbrüche ohne Inhalt dazwischen bleiben zwei Umbrüche (Grenzfall 3)', async () => {
    const original = doc([paragraph('a'), pageBreak(), pageBreak(), paragraph('b')])
    const result = await readDocx(await writeDocx(original))
    const content = (result.body as { content: Array<{ type: string }> }).content
    expect(content.map((n) => n.type)).toEqual(['paragraph', 'page_break', 'page_break', 'paragraph'])
  })
})

describe('DOCX-Reader: reale Fixtures (§0.10, §6.2)', () => {
  it('saut_page.docx: 2 echte Seitenumbrüche erkannt, der eine Zeilenumbruch NICHT befördert', async () => {
    const result = await readDocx(readFileSync(join(FIXTURES_DIR, 'saut_page.docx')) as unknown as Blob)
    expect(countNodes(result, 'page_break')).toBe(2)
    expect(countNodes(result, 'hard_break')).toBe(1)
  })

  it('60329.docx: 0 Seitenumbrüche (3× lastRenderedPageBreak ignoriert), alle 85 Zeilenumbrüche bleiben (Grenzfall 14)', async () => {
    const result = await readDocx(readFileSync(join(FIXTURES_DIR, '60329.docx')) as unknown as Blob)
    expect(countNodes(result, 'page_break')).toBe(0)
    expect(countNodes(result, 'hard_break')).toBe(85)
  })
})

describe('Cross-Format (Unit-Ebene, §5.2.3/§5.2.4)', () => {
  it('DOCX → ODT → DOCX: Umbruch bleibt über beide Konvertierungen erhalten', async () => {
    const original = doc([paragraph('vorher'), pageBreak(), paragraph('nachher')])
    const viaOdt = await readOdt(await writeOdt(await readDocx(await writeDocx(original))))
    const back = await readDocx(await writeDocx(viaOdt))
    const content = (back.body as { content: Array<{ type: string }> }).content
    expect(content.map((n) => n.type)).toEqual(['paragraph', 'page_break', 'paragraph'])
    expect(content.map((n) => (n as { content?: Array<{ text?: string }> }).content?.[0]?.text)).toEqual([
      'vorher',
      undefined,
      'nachher',
    ])
  })

  it('ODT → DOCX → ODT: umgekehrte Richtung ebenso', async () => {
    const original = doc([paragraph('vorher'), pageBreak(), paragraph('nachher')])
    const viaDocx = await readDocx(await writeDocx(await readOdt(await writeOdt(original))))
    const back = await readOdt(await writeOdt(viaDocx))
    const content = (back.body as { content: Array<{ type: string }> }).content
    expect(content.map((n) => n.type)).toEqual(['paragraph', 'page_break', 'paragraph'])
  })
})
