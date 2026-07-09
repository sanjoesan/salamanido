import JSZip from 'jszip'
import { readDocx } from '../reader'

// liste-einruecken-tab-req.md Befund C / §5A Option B (Reader-Hälfte): Eine Fremddatei,
// die innerhalb DERSELBEN numId auf Ebene 0 Bullet und auf Ebene 1 Decimal nutzt (Words
// übliche Kodierung gemischter Ketten), muss beim Import den Typ JE EBENE behalten —
// vorher wurde nur das erste <w:lvl> gelesen und beide Ebenen wurden Bullet.

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

function listParagraph(text: string, numId: number, ilvl: number): string {
  return (
    `<w:p><w:pPr><w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr></w:pPr>` +
    `<w:r><w:t>${text}</w:t></w:r></w:p>`
  )
}

async function buildMixedDocx(): Promise<Blob> {
  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="${W}"><w:body>` +
    listParagraph('oben bullet', 5, 0) +
    listParagraph('unten nummeriert', 5, 1) +
    listParagraph('wieder oben', 5, 0) +
    `<w:sectPr/></w:body></w:document>`
  const numberingXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:numbering xmlns:w="${W}">` +
    `<w:abstractNum w:abstractNumId="0">` +
    `<w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl>` +
    `<w:lvl w:ilvl="1"><w:numFmt w:val="decimal"/><w:lvlText w:val="%2."/></w:lvl>` +
    `</w:abstractNum>` +
    `<w:num w:numId="5"><w:abstractNumId w:val="0"/></w:num>` +
    `</w:numbering>`
  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `</Types>`
  const rels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `</Relationships>`
  const zip = new JSZip()
  zip.file('[Content_Types].xml', contentTypes)
  zip.folder('_rels')!.file('.rels', rels)
  const word = zip.folder('word')!
  word.file('document.xml', documentXml)
  word.file('numbering.xml', numberingXml)
  return zip.generateAsync({ type: 'blob' })
}

const FULL_NS =
  `xmlns:w="${W}" ` +
  `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
  `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ` +
  `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
  `xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"`

/** Ein Listenpunkt, dessen EINZIGER Inhalt ein Bild ist (Grenzfall 4.6). */
function imageOnlyListParagraph(numId: number, ilvl: number): string {
  return (
    `<w:p><w:pPr><w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr></w:pPr>` +
    `<w:r><w:drawing><wp:inline><wp:extent cx="914400" cy="914400"/><wp:docPr id="1" name="Bild"/>` +
    `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic><pic:blipFill><a:blip r:embed="rId9"/></pic:blipFill></pic:pic>` +
    `</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
  )
}

async function buildImageListDocx(): Promise<Blob> {
  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document ${FULL_NS}><w:body>` +
    listParagraph('vor dem Bild', 5, 0) +
    imageOnlyListParagraph(5, 0) +
    listParagraph('nach dem Bild', 5, 0) +
    `<w:sectPr/></w:body></w:document>`
  const numberingXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:numbering xmlns:w="${W}">` +
    `<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl></w:abstractNum>` +
    `<w:num w:numId="5"><w:abstractNumId w:val="0"/></w:num>` +
    `</w:numbering>`
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `</Types>`,
  )
  zip.folder('_rels')!.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
      `</Relationships>`,
  )
  const word = zip.folder('word')!
  word.file('document.xml', documentXml)
  word.file('numbering.xml', numberingXml)
  return zip.generateAsync({ type: 'blob' })
}

describe('DOCX-Import: bildreiner Listenpunkt (Grenzfall 4.6)', () => {
  it('das Bild bleibt IN der Liste — ein Listenpunkt je Absatz, keine Listenspaltung', async () => {
    const result = await readDocx(await buildImageListDocx())
    const content = (result.body as { content: Array<{ type: string; content: Array<{ content: Array<{ type: string }> }> }> }).content
    expect(content.map((n) => n.type)).toEqual(['bullet_list'])
    const list = content[0]
    expect(list.content).toHaveLength(3)
    expect(list.content[1].content.map((n) => n.type)).toContain('image')
  })
})

describe('DOCX-Import: gemischt-typige Ebenen innerhalb EINER numId', () => {
  it('Ebene 0 bleibt Bullet, Ebene 1 wird Nummeriert (Typ je Ebene, nicht je numId)', async () => {
    const result = await readDocx(await buildMixedDocx())
    const content = (result.body as { content: Array<{ type: string; content: Array<Record<string, unknown>> }> }).content
    expect(content).toHaveLength(1)
    const outer = content[0]
    expect(outer.type).toBe('bullet_list')

    // Struktur: item("oben bullet" + nested ordered("unten nummeriert")), item("wieder oben")
    expect(outer.content).toHaveLength(2)
    const firstItem = outer.content[0] as { content: Array<{ type: string; content?: unknown[] }> }
    const nested = firstItem.content.find((n) => n.type === 'ordered_list')
    expect(nested, 'Ebene 1 muss als ordered_list erkannt werden (nicht Bullet-Rückfall)').toBeTruthy()
    const nestedText = JSON.stringify(nested)
    expect(nestedText).toContain('unten nummeriert')
  })
})
