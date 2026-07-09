import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'
import { writeOdt } from '../writer'
import { readOdt } from '../reader'
import type { WordDocumentContent } from '../../shared/documentModel'

// specs/seitenumbruch-req.md §6.3/§6.4 (ODT-Writer/-Reader) inkl. realer Fixtures.

const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/odt')

function doc(content: unknown[]): WordDocumentContent {
  return { body: { type: 'doc', content }, header: null, footer: null, meta: { title: '' } }
}
function paragraph(text: string) {
  return { type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text }] }
}
const pageBreak = () => ({ type: 'page_break' })

async function contentXmlOf(content: WordDocumentContent): Promise<string> {
  const blob = await writeOdt(content)
  const zip = await JSZip.loadAsync(blob)
  return zip.file('content.xml')!.async('text')
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

describe('ODT-Writer: manueller Seitenumbruch (§3.6)', () => {
  it('Folgeabsatz referenziert einen Style mit fo:break-before="page" (LibreOffice-Kodierung)', async () => {
    const xml = await contentXmlOf(doc([paragraph('a'), pageBreak(), paragraph('b')]))
    expect(xml).toContain('fo:break-before="page"')
    // der Absatz mit "b" trägt den Break-Style
    expect(xml).toMatch(/<text:p text:style-name="Ppara-left-pb">b<\/text:p>/)
    // der Absatz mit "a" NICHT
    expect(xml).toMatch(/<text:p text:style-name="Ppara-left">a<\/text:p>/)
  })

  it('Überschrift nach dem Umbruch nutzt die Break-Variante ihres Styles', async () => {
    const xml = await contentXmlOf(
      doc([paragraph('a'), pageBreak(), { type: 'heading', attrs: { level: 2, align: 'left' }, content: [{ type: 'text', text: 'K' }] }]),
    )
    expect(xml).toContain('text:style-name="Heading2-left-pb"')
  })

  it('Umbruch vor einer Tabelle → leerer Break-Carrier-Absatz davor', async () => {
    const table = {
      type: 'table',
      content: [
        {
          type: 'table_row',
          content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [paragraph('z')] }],
        },
      ],
    }
    const xml = await contentXmlOf(doc([paragraph('a'), pageBreak(), table]))
    expect(xml).toMatch(/<text:p text:style-name="Ppara-left-pb"\/><table:table/)
  })

  it('Zeilenumbruch bleibt <text:line-break/> — keine Verwechslung (§3.11)', async () => {
    const xml = await contentXmlOf(
      doc([{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'x' }, { type: 'hard_break' }, { type: 'text', text: 'y' }] }]),
    )
    expect(xml).toContain('<text:line-break/>')
    // die -pb-Style-DEFINITIONEN stehen immer in den automatic-styles; entscheidend ist,
    // dass kein Absatz sie referenziert
    expect(xml).not.toMatch(/text:style-name="[^"]*-pb"/)
  })
})

describe('ODT-Rundreise: Seitenumbruch (§5.2)', () => {
  it('p / Umbruch / p überlebt Export→Reimport an derselben Stelle', async () => {
    const result = await readOdt(await writeOdt(doc([paragraph('vorher'), pageBreak(), paragraph('nachher')])))
    const content = (result.body as { content: Array<{ type: string }> }).content
    expect(content.map((n) => n.type)).toEqual(['paragraph', 'page_break', 'paragraph'])
    expect(countNodes(result, 'hard_break')).toBe(0)
  })

  it('Überschrift direkt nach dem Umbruch bleibt Überschrift samt Level (§5.2.6)', async () => {
    const original = doc([
      paragraph('text'),
      pageBreak(),
      { type: 'heading', attrs: { level: 3, align: 'left' }, content: [{ type: 'text', text: 'Kapitel' }] },
    ])
    const result = await readOdt(await writeOdt(original))
    const content = (result.body as { content: Array<{ type: string; attrs?: { level?: number } }> }).content
    expect(content.map((n) => n.type)).toEqual(['paragraph', 'page_break', 'heading'])
    expect(content[2].attrs?.level).toBe(3)
  })

  it('Umbruch vor Tabelle: Break-Carrier kollabiert beim Reimport — KEIN Streuner-Leerabsatz (Grenzfall 10)', async () => {
    const table = {
      type: 'table',
      content: [
        {
          type: 'table_row',
          content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [paragraph('z')] }],
        },
      ],
    }
    const result = await readOdt(await writeOdt(doc([paragraph('a'), pageBreak(), table])))
    const content = (result.body as { content: Array<{ type: string }> }).content
    expect(content.map((n) => n.type)).toEqual(['paragraph', 'page_break', 'table'])
  })

  it('Umbruch am Dokumentende bleibt erhalten, mit Leerabsatz als Cursor-Heimat (Grenzfall 2)', async () => {
    const result = await readOdt(await writeOdt(doc([paragraph('text'), pageBreak(), { type: 'paragraph', attrs: { align: 'left' } }])))
    const content = (result.body as { content: Array<{ type: string }> }).content
    expect(content.map((n) => n.type)).toEqual(['paragraph', 'page_break', 'paragraph'])
  })

  it('zwei Umbrüche ohne Inhalt dazwischen bleiben zwei Umbrüche (Grenzfall 3)', async () => {
    const original = doc([paragraph('a'), pageBreak(), pageBreak(), paragraph('b')])
    const result = await readOdt(await writeOdt(original))
    const content = (result.body as { content: Array<{ type: string }> }).content
    expect(content.map((n) => n.type)).toEqual(['paragraph', 'page_break', 'page_break', 'paragraph'])
  })
})

describe('ODT-Reader: reale Fixtures (§0.10, §6.4)', () => {
  it('pagebreaks.odt: 2× break-before + 1× break-after → 3 Umbrüche; soft-page-break ignoriert', async () => {
    const result = await readOdt(readFileSync(join(FIXTURES_DIR, 'pagebreaks.odt')) as unknown as Blob)
    expect(countNodes(result, 'page_break')).toBe(3)
  })

  it('AB_pageBreakBefore.odt: genau 1 Umbruch (beiläufiger soft-page-break ignoriert)', async () => {
    const result = await readOdt(readFileSync(join(FIXTURES_DIR, 'AB_pageBreakBefore.odt')) as unknown as Blob)
    expect(countNodes(result, 'page_break')).toBe(1)
  })

  it('text-extract.odt: nur soft-page-breaks → KEIN manueller Umbruch (Grenzfall 15)', async () => {
    const result = await readOdt(readFileSync(join(FIXTURES_DIR, 'text-extract.odt')) as unknown as Blob)
    expect(countNodes(result, 'page_break')).toBe(0)
  })

  it('no_pagebreak.odt / 35585: break-before IN einer Tabellenzelle wird wie in LibreOffice ignoriert (Grenzfall 4)', async () => {
    for (const name of ['no_pagebreak.odt', '35585_-_no_pagebreak.odt']) {
      const result = await readOdt(readFileSync(join(FIXTURES_DIR, name)) as unknown as Blob)
      expect(countNodes(result, 'page_break'), name).toBe(0)
    }
  })
})
