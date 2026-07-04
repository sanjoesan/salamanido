import JSZip from 'jszip'
import { readDocx } from '../reader'
import { WORD_NAMESPACE_DECLARATIONS } from '../xmlUtil'

/** Hand-built minimal DOCX with a given `<w:body>` inner XML, independent of this app's own writer. */
async function buildDocx(bodyInner: string): Promise<Blob> {
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
  zip
    .folder('_rels')!
    .file(
      '.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
        `</Relationships>`,
    )
  zip
    .folder('word')!
    .file(
      'document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<w:document ${WORD_NAMESPACE_DECLARATIONS}><w:body>${bodyInner}<w:sectPr/></w:body></w:document>`,
    )
  const buffer = await zip.generateAsync({ type: 'nodebuffer' })
  return new Blob([new Uint8Array(buffer)])
}

function allText(node: unknown): string {
  const fragments: string[] = []
  JSON.stringify(node, (key, value) => {
    if (key === 'text') fragments.push(value)
    return value
  })
  return fragments.join('')
}

describe('DOCX reader: text wrapped in hyperlink/ins/sdt/fldSimple survives, w:del does not (U-6)', () => {
  it('keeps hyperlink text visible (<w:hyperlink>)', async () => {
    const blob = await buildDocx(
      `<w:p><w:r><w:t xml:space="preserve">Siehe </w:t></w:r>` +
        `<w:hyperlink r:id="rId2"><w:r><w:t>hier</w:t></w:r></w:hyperlink>` +
        `<w:r><w:t>.</w:t></w:r></w:p>`,
    )
    const doc = await readDocx(blob)
    const text = allText(doc.body)
    expect(text).toContain('Siehe')
    expect(text).toContain('hier')
  })

  it('keeps accepted tracked-insertion text visible (<w:ins>)', async () => {
    const blob = await buildDocx(
      `<w:p><w:r><w:t xml:space="preserve">Vorher </w:t></w:r>` +
        `<w:ins w:id="1" w:author="X" w:date="2024-01-01T00:00:00Z"><w:r><w:t>eingefügt</w:t></w:r></w:ins>` +
        `<w:r><w:t xml:space="preserve"> nachher</w:t></w:r></w:p>`,
    )
    const doc = await readDocx(blob)
    const text = allText(doc.body)
    expect(text).toContain('Vorher')
    expect(text).toContain('eingefügt')
    expect(text).toContain('nachher')
  })

  it('keeps content-control text visible (<w:sdt>/<w:sdtContent>)', async () => {
    const blob = await buildDocx(
      `<w:p><w:sdt><w:sdtPr/><w:sdtContent><w:r><w:t>Inhaltssteuerelement-Text</w:t></w:r></w:sdtContent></w:sdt></w:p>`,
    )
    const doc = await readDocx(blob)
    const text = allText(doc.body)
    expect(text).toContain('Inhaltssteuerelement-Text')
  })

  it('keeps a simple field\'s cached result text visible (<w:fldSimple>)', async () => {
    const blob = await buildDocx(
      `<w:p><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p>`,
    )
    const doc = await readDocx(blob)
    const text = allText(doc.body)
    expect(text).toContain('1')
  })

  it('does NOT show rejected/pending tracked-deletion text (<w:del>)', async () => {
    const blob = await buildDocx(
      `<w:p><w:r><w:t xml:space="preserve">Sichtbar </w:t></w:r>` +
        `<w:del w:id="2" w:author="X" w:date="2024-01-01T00:00:00Z"><w:r><w:delText>GEHEIM_GELOESCHT</w:delText></w:r></w:del>` +
        `<w:r><w:t xml:space="preserve"> Rest</w:t></w:r></w:p>`,
    )
    const doc = await readDocx(blob)
    const text = allText(doc.body)
    expect(text).toContain('Sichtbar')
    expect(text).toContain('Rest')
    expect(text).not.toContain('GEHEIM_GELOESCHT')
  })

  it('handles nested wrappers (hyperlink containing ins containing sdt) without dropping text or crashing', async () => {
    const blob = await buildDocx(
      `<w:p><w:hyperlink r:id="rId2"><w:ins w:id="3" w:author="X" w:date="2024-01-01T00:00:00Z">` +
        `<w:sdt><w:sdtPr/><w:sdtContent><w:r><w:t>Verschachtelt</w:t></w:r></w:sdtContent></w:sdt>` +
        `</w:ins></w:hyperlink></w:p>`,
    )
    const doc = await readDocx(blob)
    const text = allText(doc.body)
    expect(text).toContain('Verschachtelt')
  })
})
