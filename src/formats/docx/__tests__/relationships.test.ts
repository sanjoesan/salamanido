import { RelationshipRegistry, RELATIONSHIP_TYPES } from '../relationships'

// hyperlink-einfuegen-req.md §0.7: externe Ziele brauchen TargetMode="External", und
// Target muss XML-escaped werden — ein &-Querystring erzeugte vorher ein nicht
// parsebares .rels-Part (latent auch für Bild-Dateinamen mit Sonderzeichen).

describe('RelationshipRegistry', () => {
  it('escaped Target und schreibt TargetMode="External" nur für externe Ziele', () => {
    const rels = new RelationshipRegistry()
    const internal = rels.add(RELATIONSHIP_TYPES.image, 'media/bild.png')
    const external = rels.add(RELATIONSHIP_TYPES.hyperlink, 'https://example.test/?a=1&b="x"', 'External')

    const xml = rels.serialize()
    expect(xml).toContain(`Id="${internal}" Type="${RELATIONSHIP_TYPES.image}" Target="media/bild.png"/>`)
    expect(xml).toContain('Target="https://example.test/?a=1&amp;b=&quot;x&quot;" TargetMode="External"/>')
    expect(xml.match(/TargetMode/g)).toHaveLength(1) // interne Parts bleiben ohne Attribut

    // das Ergebnis ist parsebares XML
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
    expect(doc.getElementsByTagName('Relationship')).toHaveLength(2)
    expect(external).toBe('rId2')
  })
})
