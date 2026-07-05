import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'
import { wordSchema } from '../schema'
import type { WordDocumentContent } from '../documentModel'
import { writeDocx } from '../../docx/writer'
import { readDocx } from '../../docx/reader'
import { writeOdt } from '../../odt/writer'
import { readOdt, odfLengthToPx } from '../../odt/reader'

// Image display size must survive DOCX/ODT export → reimport, incl. the case where the
// user never changed it (the §0.1 reader-bug fix: opening + saving a file must not distort
// an image to a default). Independent raw-XML checks via JSZip, not only the own reader.
// See bild-groesse-aendern-req.md §4 / §5.1.

/* eslint-disable @typescript-eslint/no-explicit-any */
const TINY = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

function content(imageAttrs: Record<string, unknown>): WordDocumentContent {
  const body = wordSchema.node('doc', null, [wordSchema.node('image', { src: TINY, ...imageAttrs })]).toJSON()
  return { body, header: null, footer: null, meta: { title: '' } }
}
function firstImage(c: WordDocumentContent): any {
  return (c.body as any).content.find((n: any) => n.type === 'image')
}
async function docxXml(c: WordDocumentContent): Promise<string> {
  return (await JSZip.loadAsync(await writeDocx(c))).file('word/document.xml')!.async('text')
}
async function odtXml(c: WordDocumentContent): Promise<string> {
  return (await JSZip.loadAsync(await writeOdt(c))).file('content.xml')!.async('text')
}

describe('ODF length parsing: svg:width/height in every unit (§5.1.3)', () => {
  it('converts cm, mm, in, pt, pc and px to px at 96 dpi', () => {
    expect(odfLengthToPx('2.54cm')).toBe(96) // 1 inch
    expect(odfLengthToPx('25.4mm')).toBe(96)
    expect(odfLengthToPx('1in')).toBe(96)
    expect(odfLengthToPx('72pt')).toBe(96)
    expect(odfLengthToPx('1pc')).toBe(16) // 1 pica = 1/6 inch = 16px
    expect(odfLengthToPx('150px')).toBe(150)
  })
  it('returns null for missing/garbage/non-positive values (no NaN into the model)', () => {
    expect(odfLengthToPx(null)).toBeNull()
    expect(odfLengthToPx('')).toBeNull()
    expect(odfLengthToPx('abc')).toBeNull()
    expect(odfLengthToPx('0cm')).toBeNull()
    expect(odfLengthToPx('10')).toBeNull() // no unit
  })
})

describe('image size round trip: DOCX', () => {
  it('preserves an explicit 640x480 size through export → reimport (reads wp:extent)', async () => {
    const back = await readDocx(await writeDocx(content({ width: 640, height: 480 })))
    const img = firstImage(back)
    expect(img.attrs.width).toBe(640)
    expect(img.attrs.height).toBe(480)
  })

  it('writes wp:extent in EMU matching the size (independent raw XML)', async () => {
    const xml = await docxXml(content({ width: 640, height: 480 }))
    const cx = Math.round((640 / 96) * 914400) // 6096000
    const cy = Math.round((480 / 96) * 914400) // 4572000
    expect(xml).toContain(`cx="${cx}"`)
    expect(xml).toContain(`cy="${cy}"`)
  })

  it('a width of 0 never produces cx="0" in the output (writer floor, §3.18)', async () => {
    const xml = await docxXml(content({ width: 0, height: 0 }))
    expect(xml).not.toContain('cx="0"')
    expect(xml).not.toContain('cy="0"')
  })
})

describe('image size round trip: ODT', () => {
  it('preserves an explicit size through export → reimport within ±1px (reads svg:width/height)', async () => {
    const back = await readOdt(await writeOdt(content({ width: 640, height: 480 })))
    const img = firstImage(back)
    expect(Math.abs(img.attrs.width - 640)).toBeLessThanOrEqual(1)
    expect(Math.abs(img.attrs.height - 480)).toBeLessThanOrEqual(1)
  })

  it('writes svg:width/height in cm, not px (independent raw XML, §2.6)', async () => {
    const xml = await odtXml(content({ width: 640, height: 480 }))
    expect(xml).toMatch(/svg:width="[\d.]+cm"/)
    expect(xml).toMatch(/svg:height="[\d.]+cm"/)
    expect(xml).not.toMatch(/svg:width="\d+px"/)
  })
})

describe('image size: cross-format (§4.4/§4.5)', () => {
  it('a size set on a DOCX-origin image survives export to ODT and back within ±1px', async () => {
    const fromDocx = await readDocx(await writeDocx(content({ width: 500, height: 300 })))
    const viaOdt = await readOdt(await writeOdt(fromDocx))
    expect(Math.abs(firstImage(viaOdt).attrs.width - 500)).toBeLessThanOrEqual(1)
    expect(Math.abs(firstImage(viaOdt).attrs.height - 300)).toBeLessThanOrEqual(1)
    const backToDocx = await readDocx(await writeDocx(viaOdt))
    expect(Math.abs(firstImage(backToDocx).attrs.width - 500)).toBeLessThanOrEqual(1)
  })
})

describe('image size: internal attrs never leak to the export', () => {
  it('naturalWidth/naturalHeight appear in neither DOCX nor ODT output', async () => {
    const c = content({ width: 200, height: 150, naturalWidth: 640, naturalHeight: 480 })
    expect((await docxXml(c)).toLowerCase()).not.toContain('naturalwidth')
    expect((await odtXml(c)).toLowerCase()).not.toContain('naturalwidth')
  })
})

describe('image size: real foreign-file fixture (§5.1 / §4.x, reader populates size)', () => {
  const imagesOf = (c: WordDocumentContent): any[] => {
    const out: any[] = []
    JSON.stringify(c.body, (_key, v) => {
      if (v && v.type === 'image') out.push(v)
      return v
    })
    return out
  }

  it('FruitDepot-SeasonalFruits4.odt: several images keep their INDIVIDUAL sizes through a round trip (§5.2.17)', async () => {
    const buffer = readFileSync(join(__dirname, '../../../../tests/fixtures/external/odt/FruitDepot-SeasonalFruits4.odt'))
    const imported = await readOdt(new Blob([new Uint8Array(buffer)]))
    const before = imagesOf(imported)
    // multiple images, each with a real (non-null) size (before the reader fix all were null)
    expect(before.length).toBeGreaterThanOrEqual(2)
    const sized = before.filter((im) => typeof im.attrs?.width === 'number' && im.attrs.width > 0)
    expect(sized.length).toBeGreaterThanOrEqual(2)
    // export/reimport preserves each image's own size (not unified to one default), ±1px
    const after = imagesOf(await readOdt(await writeOdt(imported)))
    expect(after.length).toBe(before.length)
    for (let i = 0; i < before.length; i++) {
      if (before[i].attrs?.width != null) {
        expect(Math.abs(after[i].attrs.width - before[i].attrs.width)).toBeLessThanOrEqual(1)
      }
    }
  })
})
