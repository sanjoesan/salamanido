import JSZip from 'jszip'
import { readOdt } from '../reader'

const NS = `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"`

/** Hand-built minimal ODT with a given `<office:text>` body, independent of this app's own writer. */
async function buildOdt(officeTextBody: string): Promise<Blob> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' })
  zip.file(
    'content.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS} office:version="1.3">` +
      `<office:body><office:text>${officeTextBody}</office:text></office:body></office:document-content>`,
  )
  zip
    .folder('META-INF')!
    .file(
      'manifest.xml',
      `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/></manifest:manifest>`,
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

describe('ODT reader: inline placeholder/date/page-number elements (U-5)', () => {
  it('keeps surrounding run text visible around a <text:placeholder>', async () => {
    const blob = await buildOdt(
      '<text:p>Vorname: <text:placeholder text:placeholder-type="text">Ihr Name</text:placeholder> Ende</text:p>',
    )
    const doc = await readOdt(blob)
    const text = allText(doc.body)
    expect(text).toContain('Vorname:')
    expect(text).toContain('Ende')
  })

  it('keeps surrounding run text visible around a <text:date> field', async () => {
    const blob = await buildOdt('<text:p>Datum: <text:date text:date-value="2024-01-01">1. Januar 2024</text:date>.</text:p>')
    const doc = await readOdt(blob)
    const text = allText(doc.body)
    expect(text).toContain('Datum:')
    expect(text).toContain('1. Januar 2024')
  })

  it('keeps surrounding run text visible around a <text:page-number> field', async () => {
    const blob = await buildOdt('<text:p>Seite <text:page-number>1</text:page-number> von <text:page-count>5</text:page-count></text:p>')
    const doc = await readOdt(blob)
    const text = allText(doc.body)
    expect(text).toContain('Seite')
    expect(text).toContain('1')
    expect(text).toContain('von')
    expect(text).toContain('5')
  })

  it('does not crash and keeps text on a document combining several inline field types in one paragraph', async () => {
    const blob = await buildOdt(
      '<text:p>' +
        'Hallo <text:placeholder text:placeholder-type="text">Name</text:placeholder>, heute ist ' +
        '<text:date text:date-value="2024-01-01">1.1.2024</text:date>, Seite ' +
        '<text:page-number>3</text:page-number>.' +
        '</text:p>',
    )
    const doc = await readOdt(blob)
    const text = allText(doc.body)
    expect(text).toContain('Hallo')
    expect(text).toContain('1.1.2024')
    expect(text).toContain('3')
    expect(text).toContain('heute ist')
  })
})

describe('ODT reader: <text:section> (multi-column layout, req §3.13 "mehrspaltiges Layout")', () => {
  it('keeps all paragraph text inside a <text:section> instead of dropping it', async () => {
    const blob = await buildOdt(
      '<text:section text:name="Spalten" text:style-name="Sect1">' +
        '<text:p>Text in der ersten Spalte.</text:p>' +
        '<text:p>Text in der zweiten Spalte.</text:p>' +
        '</text:section>',
    )
    const doc = await readOdt(blob)
    const text = allText(doc.body)
    expect(text).toContain('Text in der ersten Spalte.')
    expect(text).toContain('Text in der zweiten Spalte.')
  })

  it('keeps list/table content inside a <text:section> as well', async () => {
    const blob = await buildOdt(
      '<text:section text:name="Spalten" text:style-name="Sect1">' +
        '<table:table xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0">' +
        '<table:table-row><table:table-cell><text:p>Zelleninhalt</text:p></table:table-cell></table:table-row>' +
        '</table:table>' +
        '</text:section>',
    )
    const doc = await readOdt(blob)
    const text = allText(doc.body)
    expect(text).toContain('Zelleninhalt')
  })
})
