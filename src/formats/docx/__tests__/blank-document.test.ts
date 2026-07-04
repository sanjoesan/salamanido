import JSZip from 'jszip'
import { writeDocx } from '../writer'
import { readDocx } from '../reader'
import { createBlankWordDocument } from '../../shared/documentModel'

// QA suite for specs/neues-dokument-qa.md Abschnitt 1.2 (U6-U10). Seed input
// is exactly createBlankWordDocument(), matching R1/R6/Testfall 4-5 of the req doc.

describe('DOCX round trip: blank document (R1, R6, Testfall 4/5)', () => {
  it('U6: writeDocx -> readDocx round trip yields toEqual(createBlankWordDocument())', async () => {
    const original = createBlankWordDocument()
    const blob = await writeDocx(original)
    const result = await readDocx(blob)
    expect(result).toEqual(createBlankWordDocument())
  })

  it('U7: export blob is a valid zip with the minimal required OOXML parts', async () => {
    const blob = await writeDocx(createBlankWordDocument())
    const zip = await JSZip.loadAsync(blob)
    expect(zip.file('[Content_Types].xml')).not.toBeNull()
    expect(zip.file('_rels/.rels')).not.toBeNull()
    expect(zip.file('word/document.xml')).not.toBeNull()
  })

  it('U8: word/document.xml is well-formed XML (no parsererror)', async () => {
    const blob = await writeDocx(createBlankWordDocument())
    const zip = await JSZip.loadAsync(blob)
    const xml = await zip.file('word/document.xml')!.async('text')
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
  })

  it('U9: meta.title survives the round trip as exactly "" (not undefined/"undefined"/a placeholder)', async () => {
    const blob = await writeDocx(createBlankWordDocument())
    const result = await readDocx(blob)
    expect(result.meta.title).toBe('')
    expect(result.meta.title).not.toBe('undefined')
    expect(result.meta.title).not.toBe('Unbenanntes Dokument')
  })

  it('U10: no header/footer relationship is written when header and footer are both null', async () => {
    const blob = await writeDocx(createBlankWordDocument())
    const zip = await JSZip.loadAsync(blob)
    const relsXml = await zip.file('word/_rels/document.xml.rels')!.async('text')
    expect(relsXml).not.toMatch(/relationships\/header/)
    expect(relsXml).not.toMatch(/relationships\/footer/)
    expect(zip.file('word/header1.xml')).toBeNull()
    expect(zip.file('word/footer1.xml')).toBeNull()
  })
})
