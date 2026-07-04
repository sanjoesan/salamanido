import JSZip from 'jszip'
import { writeDocx } from '../writer'
import { readDocx } from '../reader'
import { OOXML_NAMESPACES } from '../xmlUtil'
import type { WordDocumentContent } from '../../shared/documentModel'

function doc(content: unknown[]): WordDocumentContent {
  return {
    body: { type: 'doc', content },
    header: null,
    footer: null,
    meta: { title: '' },
  }
}

function paragraph(text: string) {
  return { type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text }] }
}

async function sectPrOf(blob: Blob): Promise<Element> {
  const zip = await JSZip.loadAsync(blob)
  const xmlText = await zip.file('word/document.xml')!.async('text')
  const xmlDoc = new DOMParser().parseFromString(xmlText, 'application/xml')
  expect(xmlDoc.getElementsByTagName('parsererror')).toHaveLength(0)
  const sectPr = xmlDoc.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'sectPr')[0]
  expect(sectPr).toBeDefined()
  return sectPr
}

describe('DOCX writer: page size and margins', () => {
  it('writes A4 page size and 2.5cm margins into every exported document', async () => {
    const blob = await writeDocx(doc([paragraph('x')]))
    const sectPr = await sectPrOf(blob)

    const pgSz = sectPr.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'pgSz')[0]
    const pgMar = sectPr.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'pgMar')[0]

    expect(pgSz.getAttributeNS(OOXML_NAMESPACES.w, 'w')).toBe('11906')
    expect(pgSz.getAttributeNS(OOXML_NAMESPACES.w, 'h')).toBe('16838')
    expect(pgMar.getAttributeNS(OOXML_NAMESPACES.w, 'top')).toBe('1417')
    expect(pgMar.getAttributeNS(OOXML_NAMESPACES.w, 'right')).toBe('1417')
    expect(pgMar.getAttributeNS(OOXML_NAMESPACES.w, 'bottom')).toBe('1417')
    expect(pgMar.getAttributeNS(OOXML_NAMESPACES.w, 'left')).toBe('1417')
  })

  it('places the page size XML after any header/footer reference in sectPr', async () => {
    const original: WordDocumentContent = {
      body: { type: 'doc', content: [paragraph('Inhalt')] },
      header: { type: 'doc', content: [paragraph('Kopf')] },
      footer: { type: 'doc', content: [paragraph('Fuss')] },
      meta: { title: '' },
    }
    const blob = await writeDocx(original)
    const sectPr = await sectPrOf(blob)

    const childNames = Array.from(sectPr.childNodes)
      .filter((n): n is Element => n.nodeType === 1)
      .map((el) => el.localName)

    expect(childNames).toEqual(['headerReference', 'footerReference', 'pgSz', 'pgMar'])
  })

  it('re-importing an exported blank document still yields exactly one empty paragraph, no header/footer', async () => {
    // Strict toEqual (not toMatchObject) on the full body/header/footer/meta shape —
    // see src/formats/docx/__tests__/blank-document.test.ts (U6) for the dedicated
    // createBlankWordDocument() round-trip regression test this mirrors.
    const blob = await writeDocx(doc([{ type: 'paragraph', attrs: { align: 'left' } }]))
    const result = await readDocx(blob)

    expect(result).toEqual({
      body: { type: 'doc', content: [{ type: 'paragraph', attrs: { align: 'left' } }] },
      header: null,
      footer: null,
      meta: { title: '' },
    })
  })
})
