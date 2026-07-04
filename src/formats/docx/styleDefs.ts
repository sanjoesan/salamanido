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

// A list can now be nested up to `w:ilvl` 8 (see docx/writer.ts blockToDocx's
// MAX_LIST_ILVL) — define a `<w:lvl>` for every one of the 9 OOXML levels on both
// abstract numbering definitions so an exported nested list has an actual level
// definition to point to instead of relying on a reader's/Word's fallback for
// undefined levels. Bullet glyphs cycle through the three Word normally uses;
// ordered levels cycle decimal/lowerLetter/lowerRoman, the conventional Word default.
const BULLET_GLYPHS = ['•', '◦', '▪']
const ORDERED_FORMATS: Array<{ fmt: string; text: string }> = [
  { fmt: 'decimal', text: '%1.' },
  { fmt: 'lowerLetter', text: '%2.' },
  { fmt: 'lowerRoman', text: '%3.' },
]

function bulletLevelsXml(): string {
  return Array.from(
    { length: 9 },
    (_, ilvl) => `<w:lvl w:ilvl="${ilvl}"><w:numFmt w:val="bullet"/><w:lvlText w:val="${BULLET_GLYPHS[ilvl % BULLET_GLYPHS.length]}"/></w:lvl>`,
  ).join('')
}

function orderedLevelsXml(): string {
  return Array.from({ length: 9 }, (_, ilvl) => {
    const { fmt, text } = ORDERED_FORMATS[ilvl % ORDERED_FORMATS.length]
    return `<w:lvl w:ilvl="${ilvl}"><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${text}"/></w:lvl>`
  }).join('')
}

export function numberingXml(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:numbering ${WORD_NAMESPACE_DECLARATIONS}>` +
    `<w:abstractNum w:abstractNumId="${BULLET_ABSTRACT_ID}">${bulletLevelsXml()}</w:abstractNum>` +
    `<w:abstractNum w:abstractNumId="${ORDERED_ABSTRACT_ID}">${orderedLevelsXml()}</w:abstractNum>` +
    `<w:num w:numId="${BULLET_NUM_ID}"><w:abstractNumId w:val="${BULLET_ABSTRACT_ID}"/></w:num>` +
    `<w:num w:numId="${ORDERED_NUM_ID}"><w:abstractNumId w:val="${ORDERED_ABSTRACT_ID}"/></w:num>` +
    `</w:numbering>`
  )
}
