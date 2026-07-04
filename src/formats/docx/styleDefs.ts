import { WORD_NAMESPACE_DECLARATIONS } from './xmlUtil'

const HEADING_FONT_SIZES: Record<number, number> = { 1: 48, 2: 40, 3: 36, 4: 32, 5: 28, 6: 26 } // half-points

export function HEADING_STYLE_ID(level: number): string {
  return `Heading${level}`
}

export function headingStylesXml(): string {
  const styles = Object.entries(HEADING_FONT_SIZES)
    .map(([level, size]) => {
      const id = HEADING_STYLE_ID(Number(level))
      return (
        `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="heading ${level}"/>` +
        `<w:basedOn w:val="Normal"/>` +
        `<w:pPr><w:outlineLvl w:val="${Number(level) - 1}"/></w:pPr>` +
        `<w:rPr><w:b/><w:sz w:val="${size}"/></w:rPr>` +
        `</w:style>`
      )
    })
    .join('')
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:styles ${WORD_NAMESPACE_DECLARATIONS}>` +
    `<w:docDefaults/>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>` +
    styles +
    `</w:styles>`
  )
}

export const BULLET_ABSTRACT_ID = 0
export const ORDERED_ABSTRACT_ID = 1
export const BULLET_NUM_ID = 1
export const ORDERED_NUM_ID = 2

export function numberingXml(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:numbering ${WORD_NAMESPACE_DECLARATIONS}>` +
    `<w:abstractNum w:abstractNumId="${BULLET_ABSTRACT_ID}"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl></w:abstractNum>` +
    `<w:abstractNum w:abstractNumId="${ORDERED_ABSTRACT_ID}"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>` +
    `<w:num w:numId="${BULLET_NUM_ID}"><w:abstractNumId w:val="${BULLET_ABSTRACT_ID}"/></w:num>` +
    `<w:num w:numId="${ORDERED_NUM_ID}"><w:abstractNumId w:val="${ORDERED_ABSTRACT_ID}"/></w:num>` +
    `</w:numbering>`
  )
}
