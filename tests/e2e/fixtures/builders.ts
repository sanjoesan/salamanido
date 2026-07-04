import JSZip from 'jszip'

const W_NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" ' +
  'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" ' +
  'xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"'
const ODT_NS = `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"`

/** A minimal, hand-built DOCX — independent of this app's own writer — used to test import. */
export async function buildSampleDocx(bodyInner?: string): Promise<Buffer> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
      `</Types>`,
  )
  zip
    .folder('_rels')!
    .file(
      '.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
        `</Relationships>`,
    )
  zip
    .folder('docProps')!
    .file(
      'core.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Beispieldokument</dc:title></cp:coreProperties>`,
    )
  zip
    .folder('word')!
    .file(
      'document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<w:document ${W_NS}><w:body>` +
        (bodyInner ??
          `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Willkommen</w:t></w:r></w:p>` +
            `<w:p><w:r><w:t xml:space="preserve">Dies ist ein </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>Testdokument</w:t></w:r><w:r><w:t>.</w:t></w:r></w:p>`) +
        `<w:sectPr/>` +
        `</w:body></w:document>`,
    )
  return zip.generateAsync({ type: 'nodebuffer' })
}

/** A minimal, hand-built ODT — independent of this app's own writer — used to test import. */
export async function buildSampleOdt(officeTextBody?: string): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' })
  zip.file(
    'content.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${ODT_NS} office:version="1.3">` +
      `<office:automatic-styles><style:style style:name="Bold" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style></office:automatic-styles>` +
      `<office:body><office:text>${
        officeTextBody ??
        `<text:h text:outline-level="1">Willkommen</text:h>` +
          `<text:p>Dies ist ein <text:span text:style-name="Bold">Testdokument</text:span>.</text:p>`
      }</office:text></office:body></office:document-content>`,
  )
  zip.file(
    'styles.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${ODT_NS} office:version="1.3"><office:styles><style:style style:name="Standard" style:family="paragraph"/></office:styles></office:document-styles>`,
  )
  zip.file(
    'meta.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-meta ${ODT_NS} xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.3"><office:meta><dc:title>Beispieldokument</dc:title></office:meta></office:document-meta>`,
  )
  zip
    .folder('META-INF')!
    .file(
      'manifest.xml',
      `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/></manifest:manifest>`,
    )
  return zip.generateAsync({ type: 'nodebuffer' })
}

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const ODT_MIME = 'application/vnd.oasis.opendocument.text'
