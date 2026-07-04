import { headingStylesXml } from '../styleDefs'

describe('DOCX styleDefs: font default', () => {
  it("a blank new document's Normal style carries no explicit font or size (implicit application default, see specs/neues-dokument-code.md 3.5)", () => {
    const xml = headingStylesXml()
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)

    // <w:docDefaults/> stays empty — no product-wide font/size standard is enforced.
    expect(xml).toMatch(/<w:docDefaults\s*\/>/)

    const w = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    const normalStyle = Array.from(doc.getElementsByTagNameNS(w, 'style')).find(
      (el) => el.getAttributeNS(w, 'styleId') === 'Normal',
    )
    expect(normalStyle).toBeDefined()
    expect(normalStyle!.getElementsByTagNameNS(w, 'rFonts')).toHaveLength(0)
    expect(normalStyle!.getElementsByTagNameNS(w, 'sz')).toHaveLength(0)
  })
})
