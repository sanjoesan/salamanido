import JSZip from 'jszip'

/**
 * Realistic, hand-built test documents combining every §6 round-trip criterion in one
 * file (headings, a two-level list, a table with a merged/spanned cell, an embedded
 * image, and mixed character formatting within one text run) — see
 * specs/datei-oeffnen-req.md Abschnitt 6 "Testdaten-Anforderung". Built independently
 * of this app's own writer.ts/reader.ts (raw XML/ZIP), so the round trip actually
 * exercises the reader against real, foreign-authored OOXML/ODF, not content the app's
 * own writer already knows how to produce.
 */

// 1x1 red pixel PNG.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
export const TINY_PNG_BUFFER = Buffer.from(TINY_PNG_BASE64, 'base64')
export const RICH_DOC_TITLE = 'Rundreise-Testdokument'

export async function buildRichDocx(): Promise<Buffer> {
  const zip = new JSZip()

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Default Extension="png" ContentType="image/png"/>` +
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
        `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${RICH_DOC_TITLE}</dc:title></cp:coreProperties>`,
    )

  const word = zip.folder('word')!
  word.folder('media')!.file('image1.png', TINY_PNG_BUFFER)

  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
  const WP = 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"'
  const A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
  const PIC = 'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"'
  const R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'

  const heading = `<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:jc w:val="left"/></w:pPr><w:r><w:t>Überschrift Eins</w:t></w:r></w:p>`

  // A two-level bullet list, authored the way real Word documents represent it: a flat
  // sequence of paragraphs sharing one numId, each with its own w:ilvl.
  const list =
    `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Punkt A</w:t></w:r></w:p>` +
    `<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Unterpunkt A1</w:t></w:r></w:p>` +
    `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Punkt B</w:t></w:r></w:p>`

  // A 2x2 table whose top row is one merged (gridSpan=2) cell, bottom row two plain cells.
  const table =
    `<w:tbl><w:tblPr/><w:tblGrid><w:gridCol/><w:gridCol/></w:tblGrid>` +
    `<w:tr><w:tc><w:tcPr><w:gridSpan w:val="2"/></w:tcPr><w:p><w:r><w:t>Verbunden</w:t></w:r></w:p></w:tc></w:tr>` +
    `<w:tr><w:tc><w:p><w:r><w:t>Zelle A2</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Zelle B2</w:t></w:r></w:p></w:tc></w:tr>` +
    `</w:tbl>`

  const image =
    `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="304800" cy="228600"/><wp:docPr id="1" name="Testbild"/>` +
    `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Testbild"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="304800" cy="228600"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`

  // Mixed character formatting within a single paragraph: bold, italic+colored, plain.
  const mixedFormatting =
    `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>` +
    `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Fett </w:t></w:r>` +
    `<w:r><w:rPr><w:i/><w:color w:val="C00000"/></w:rPr><w:t xml:space="preserve">kursiv-rot </w:t></w:r>` +
    `<w:r><w:t>normal</w:t></w:r></w:p>`

  const numberingXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:numbering ${W}>` +
    `<w:abstractNum w:abstractNumId="1">` +
    `<w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl>` +
    `<w:lvl w:ilvl="1"><w:numFmt w:val="bullet"/><w:lvlText w:val="◦"/></w:lvl>` +
    `</w:abstractNum>` +
    `<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>` +
    `</w:numbering>`
  word.file('numbering.xml', numberingXml)
  word
    .folder('_rels')!
    .file(
      'document.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>` +
        `</Relationships>`,
    )

  word.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<w:document ${W} ${WP} ${A} ${PIC} ${R}><w:body>` +
      heading +
      list +
      table +
      image +
      mixedFormatting +
      `<w:sectPr/>` +
      `</w:body></w:document>`,
  )

  return zip.generateAsync({ type: 'nodebuffer' })
}

export async function buildRichOdt(): Promise<Buffer> {
  const zip = new JSZip()
  const NS = `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"`

  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' })
  zip
    .folder('Pictures')!
    .file('image1.png', TINY_PNG_BUFFER)

  const automaticStyles =
    `<style:style style:name="Bold" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>` +
    `<style:style style:name="ItalicRed" style:family="text"><style:text-properties fo:font-style="italic" fo:color="#C00000"/></style:style>` +
    `<style:style style:name="Centered" style:family="paragraph"><style:paragraph-properties fo:text-align="center"/></style:style>` +
    `<text:list-style style:name="L1"><text:list-level-style-bullet text:level="1" text:bullet-char="•"/><text:list-level-style-bullet text:level="2" text:bullet-char="◦"/></text:list-style>`

  const heading = `<text:h text:outline-level="1">Überschrift Eins</text:h>`

  // A two-level bullet list, authored the ODF way: an outer <text:list> containing an
  // item, which itself contains a nested <text:list> as a further child.
  const list =
    `<text:list text:style-name="L1">` +
    `<text:list-item><text:p>Punkt A</text:p>` +
    `<text:list text:style-name="L1"><text:list-item><text:p>Unterpunkt A1</text:p></text:list-item></text:list>` +
    `</text:list-item>` +
    `<text:list-item><text:p>Punkt B</text:p></text:list-item>` +
    `</text:list>`

  const table =
    `<table:table><table:table-column/><table:table-column/>` +
    `<table:table-row><table:table-cell table:number-columns-spanned="2"><text:p>Verbunden</text:p></table:table-cell><table:covered-table-cell/></table:table-row>` +
    `<table:table-row><table:table-cell><text:p>Zelle A2</text:p></table:table-cell><table:table-cell><text:p>Zelle B2</text:p></table:table-cell></table:table-row>` +
    `</table:table>`

  const image =
    `<text:p><draw:frame draw:name="Testbild" svg:width="0.8cm" svg:height="0.6cm"><draw:image xlink:href="Pictures/image1.png"/></draw:frame></text:p>`

  const mixedFormatting =
    `<text:p text:style-name="Centered">` +
    `<text:span text:style-name="Bold">Fett </text:span>` +
    `<text:span text:style-name="ItalicRed">kursiv-rot </text:span>` +
    `normal</text:p>`

  zip.file(
    'content.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS} office:version="1.3">` +
      `<office:automatic-styles>${automaticStyles}</office:automatic-styles>` +
      `<office:body><office:text>${heading}${list}${table}${image}${mixedFormatting}</office:text></office:body></office:document-content>`,
  )
  zip.file(
    'styles.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NS} office:version="1.3"><office:styles><style:style style:name="Standard" style:family="paragraph"/></office:styles></office:document-styles>`,
  )
  zip.file(
    'meta.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-meta ${NS} xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.3"><office:meta><dc:title>${RICH_DOC_TITLE}</dc:title></office:meta></office:document-meta>`,
  )
  zip
    .folder('META-INF')!
    .file(
      'manifest.xml',
      `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">` +
        `<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>` +
        `<manifest:file-entry manifest:full-path="Pictures/image1.png" manifest:media-type="image/png"/>` +
        `</manifest:manifest>`,
    )

  return zip.generateAsync({ type: 'nodebuffer' })
}
