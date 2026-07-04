import { writeOdt } from '../writer'
import { readOdt } from '../reader'
import { createBlankWordDocument } from '../../shared/documentModel'

// QA suite for specs/neues-dokument-qa.md Abschnitt 1.3 (U11-U14).

describe('ODT round trip: blank document (R2, R6)', () => {
  it('U11: writeOdt -> readOdt round trip yields toEqual(createBlankWordDocument())', async () => {
    const original = createBlankWordDocument()
    const blob = await writeOdt(original)
    const result = await readOdt(blob)
    expect(result).toEqual(createBlankWordDocument())
  })

  it('U12: mimetype is the first, uncompressed zip entry (byte-level check, independent of JSZip high-level API)', async () => {
    const blob = await writeOdt(createBlankWordDocument())
    const bytes = new Uint8Array(await blob.arrayBuffer())

    // Local File Header: 4 byte signature 'PK\x03\x04', 2 byte version, 2 byte
    // flags, 2 byte compression method (offset 8-9), ..., filename from offset 30.
    expect(bytes[0]).toBe(0x50) // 'P'
    expect(bytes[1]).toBe(0x4b) // 'K'
    expect(bytes[2]).toBe(0x03)
    expect(bytes[3]).toBe(0x04)

    const compressionMethod = bytes[8] | (bytes[9] << 8)
    expect(compressionMethod).toBe(0) // STORE, not DEFLATE

    const nameLength = bytes[26] | (bytes[27] << 8)
    const name = new TextDecoder().decode(bytes.slice(30, 30 + nameLength))
    expect(name).toBe('mimetype')
  })

  it('U13: content.xml, styles.xml, meta.xml, META-INF/manifest.xml exist and are well-formed', async () => {
    const JSZip = (await import('jszip')).default
    const blob = await writeOdt(createBlankWordDocument())
    const zip = await JSZip.loadAsync(blob)

    for (const path of ['content.xml', 'styles.xml', 'meta.xml', 'META-INF/manifest.xml']) {
      const entry = zip.file(path)
      expect(entry, `expected ${path} to exist`).not.toBeNull()
      const xml = await entry!.async('text')
      const doc = new DOMParser().parseFromString(xml, 'application/xml')
      expect(doc.getElementsByTagName('parsererror'), `${path} should be well-formed`).toHaveLength(0)
    }
  })

  it('U14: meta.xml contains no dc:title placeholder text (empty or absent is fine, a placeholder is not)', async () => {
    const JSZip = (await import('jszip')).default
    const blob = await writeOdt(createBlankWordDocument())
    const zip = await JSZip.loadAsync(blob)
    const metaXml = await zip.file('meta.xml')!.async('text')
    const doc = new DOMParser().parseFromString(metaXml, 'application/xml')
    const titleEls = doc.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'title')
    if (titleEls.length > 0) {
      expect(titleEls[0].textContent).toBe('')
    }
    expect(metaXml).not.toMatch(/undefined|null|Unbenanntes Dokument/)
  })
})
