export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export const OOXML_NAMESPACES = {
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture',
  ct: 'http://schemas.openxmlformats.org/package/2006/content-types',
  pr: 'http://schemas.openxmlformats.org/package/2006/relationships',
  cp: 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
  dc: 'http://purl.org/dc/elements/1.1/',
  dcterms: 'http://purl.org/dc/terms/',
} as const

export const WORD_NAMESPACE_DECLARATIONS = `xmlns:w="${OOXML_NAMESPACES.w}" xmlns:r="${OOXML_NAMESPACES.r}" xmlns:wp="${OOXML_NAMESPACES.wp}" xmlns:a="${OOXML_NAMESPACES.a}" xmlns:pic="${OOXML_NAMESPACES.pic}"`

export function parseXmlDocument(text: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const errorNode = doc.getElementsByTagName('parsererror')[0]
  if (errorNode) {
    throw new Error(`Ungültiges XML: ${errorNode.textContent}`)
  }
  return doc
}
