import { listStyleDefs, BULLET_LIST_STYLE_NAME, ORDERED_LIST_STYLE_NAME } from '../styleRegistry'
import { ODF_NAMESPACES } from '../xmlUtil'

// liste-einruecken-tab-req.md Befund C (ODT-Zwilling der DOCX-Ebenen-Härtung): beide
// Listenstile definieren ALLE 10 ODF-Ebenen mit eigenem Symbol/Zahlenformat und
// wachsendem Label-Einzug — vorher existierte nur text:level="1" und tiefere Ebenen
// hatten in LibreOffice keinerlei eigene Definition.

function parseDefs(): Document {
  const xml =
    `<?xml version="1.0"?><root xmlns:text="${ODF_NAMESPACES.text}" xmlns:style="${ODF_NAMESPACES.style}">` +
    listStyleDefs() +
    `</root>`
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
  return doc
}

function styleByName(doc: Document, name: string): Element {
  const style = Array.from(doc.getElementsByTagNameNS(ODF_NAMESPACES.text, 'list-style')).find(
    (el) => el.getAttributeNS(ODF_NAMESPACES.style, 'name') === name,
  )
  expect(style).toBeDefined()
  return style!
}

describe('ODT listStyleDefs: alle 10 Ebenen definiert', () => {
  it(`${BULLET_LIST_STYLE_NAME}: 10 Bullet-Ebenen mit wachsendem Einzug`, () => {
    const style = styleByName(parseDefs(), BULLET_LIST_STYLE_NAME)
    const levels = Array.from(style.getElementsByTagNameNS(ODF_NAMESPACES.text, 'list-level-style-bullet'))
    expect(levels).toHaveLength(10)
    for (const [i, lvl] of levels.entries()) {
      expect(lvl.getAttributeNS(ODF_NAMESPACES.text, 'level')).toBe(String(i + 1))
      expect(lvl.getAttributeNS(ODF_NAMESPACES.text, 'bullet-char')).toBeTruthy()
      const props = lvl.getElementsByTagNameNS(ODF_NAMESPACES.style, 'list-level-properties')[0]
      expect(props.getAttributeNS(ODF_NAMESPACES.text, 'space-before')).toBe(`${(0.5 * (i + 1)).toFixed(1)}cm`)
    }
  })

  it(`${ORDERED_LIST_STYLE_NAME}: 10 Nummern-Ebenen (Formate zyklisch 1/a/i) mit wachsendem Einzug`, () => {
    const style = styleByName(parseDefs(), ORDERED_LIST_STYLE_NAME)
    const levels = Array.from(style.getElementsByTagNameNS(ODF_NAMESPACES.text, 'list-level-style-number'))
    expect(levels).toHaveLength(10)
    const formats = ['1', 'a', 'i']
    for (const [i, lvl] of levels.entries()) {
      expect(lvl.getAttributeNS(ODF_NAMESPACES.text, 'level')).toBe(String(i + 1))
      expect(lvl.getAttributeNS(ODF_NAMESPACES.style, 'num-format')).toBe(formats[i % 3])
      expect(lvl.getAttributeNS(ODF_NAMESPACES.style, 'num-suffix')).toBe('.')
    }
  })
})
