import { writeDocx } from '../writer'
import { readDocx } from '../reader'
import type { WordDocumentContent } from '../../shared/documentModel'

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

function doc(content: unknown[]): WordDocumentContent {
  return {
    body: { type: 'doc', content },
    header: null,
    footer: null,
    meta: { title: '' },
  }
}

function paragraph(text: string, align = 'left', marks?: Array<{ type: string; attrs?: Record<string, unknown> }>) {
  return { type: 'paragraph', attrs: { align }, content: text ? [{ type: 'text', text, marks }] : [] }
}

async function roundTrip(content: WordDocumentContent): Promise<WordDocumentContent> {
  const blob = await writeDocx(content)
  return readDocx(blob)
}

describe('DOCX round trip: headings', () => {
  it('preserves heading levels and text', async () => {
    const original = doc([
      { type: 'heading', attrs: { level: 1, align: 'left' }, content: [{ type: 'text', text: 'Titel' }] },
      { type: 'heading', attrs: { level: 2, align: 'left' }, content: [{ type: 'text', text: 'Untertitel' }] },
    ])
    const result = await roundTrip(original)
    const headings = (result.body as any).content.filter((n: any) => n.type === 'heading')
    expect(headings).toHaveLength(2)
    expect(headings[0].attrs.level).toBe(1)
    expect(headings[1].attrs.level).toBe(2)
    expect(headings[0].content[0].text).toBe('Titel')
    expect(headings[1].content[0].text).toBe('Untertitel')
  })

  it('preserves heading alignment', async () => {
    const original = doc([{ type: 'heading', attrs: { level: 1, align: 'center' }, content: [{ type: 'text', text: 'Mitte' }] }])
    const result = await roundTrip(original)
    expect((result.body as any).content[0].attrs.align).toBe('center')
  })
})

describe('DOCX round trip: paragraph alignment', () => {
  it.each(['left', 'center', 'right', 'justify'])('preserves "%s" alignment', async (align) => {
    const original = doc([paragraph('Text', align)])
    const result = await roundTrip(original)
    expect((result.body as any).content[0].attrs.align).toBe(align)
  })
})

describe('DOCX round trip: text formatting', () => {
  it('preserves bold, italic, underline, and strikethrough independently', async () => {
    const original = doc([
      {
        type: 'paragraph',
        attrs: { align: 'left' },
        content: [
          { type: 'text', text: 'fett', marks: [{ type: 'strong' }] },
          { type: 'text', text: 'kursiv', marks: [{ type: 'em' }] },
          { type: 'text', text: 'unterstrichen', marks: [{ type: 'underline' }] },
          { type: 'text', text: 'durchgestrichen', marks: [{ type: 'strike' }] },
          { type: 'text', text: 'normal' },
        ],
      },
    ])
    const result = await roundTrip(original)
    const runs = (result.body as any).content[0].content
    expect(runs.find((r: any) => r.text === 'fett').marks).toEqual([{ type: 'strong' }])
    expect(runs.find((r: any) => r.text === 'kursiv').marks).toEqual([{ type: 'em' }])
    expect(runs.find((r: any) => r.text === 'unterstrichen').marks).toEqual([{ type: 'underline' }])
    expect(runs.find((r: any) => r.text === 'durchgestrichen').marks).toEqual([{ type: 'strike' }])
    expect(runs.find((r: any) => r.text === 'normal').marks).toBeUndefined()
  })

  it('preserves combined marks on the same run', async () => {
    const original = doc([
      {
        type: 'paragraph',
        attrs: { align: 'left' },
        content: [{ type: 'text', text: 'fett+kursiv', marks: [{ type: 'strong' }, { type: 'em' }] }],
      },
    ])
    const result = await roundTrip(original)
    const run = (result.body as any).content[0].content[0]
    expect(run.marks).toEqual(expect.arrayContaining([{ type: 'strong' }, { type: 'em' }]))
    expect(run.marks).toHaveLength(2)
  })

  it('preserves text color and highlight color', async () => {
    const original = doc([
      {
        type: 'paragraph',
        attrs: { align: 'left' },
        content: [
          { type: 'text', text: 'rot', marks: [{ type: 'textColor', attrs: { color: '#ff0000' } }] },
          { type: 'text', text: 'gelb markiert', marks: [{ type: 'highlight', attrs: { color: '#ffff00' } }] },
        ],
      },
    ])
    const result = await roundTrip(original)
    const runs = (result.body as any).content[0].content
    expect(runs.find((r: any) => r.text === 'rot').marks).toEqual([{ type: 'textColor', attrs: { color: '#ff0000' } }])
    expect(runs.find((r: any) => r.text === 'gelb markiert').marks).toEqual([
      { type: 'highlight', attrs: { color: '#ffff00' } },
    ])
  })

  it('preserves hard line breaks within a paragraph', async () => {
    const original = doc([
      {
        type: 'paragraph',
        attrs: { align: 'left' },
        content: [{ type: 'text', text: 'Zeile eins' }, { type: 'hard_break' }, { type: 'text', text: 'Zeile zwei' }],
      },
    ])
    const result = await roundTrip(original)
    const content = (result.body as any).content[0].content
    expect(content.some((n: any) => n.type === 'hard_break')).toBe(true)
    expect(content.map((n: any) => n.text ?? n.type).join('|')).toBe('Zeile eins|hard_break|Zeile zwei')
  })

  it('preserves runs of multiple spaces and tab characters', async () => {
    const original = doc([paragraph('eins   zwei\tdrei')])
    const result = await roundTrip(original)
    const text = (result.body as any).content[0].content.map((n: any) => n.text).join('')
    expect(text).toBe('eins   zwei\tdrei')
  })
})

describe('DOCX round trip: lists', () => {
  it('preserves bullet lists with multiple items', async () => {
    const original = doc([
      {
        type: 'bullet_list',
        content: [
          { type: 'list_item', content: [paragraph('Erster Punkt')] },
          { type: 'list_item', content: [paragraph('Zweiter Punkt')] },
        ],
      },
    ])
    const result = await roundTrip(original)
    const list = (result.body as any).content[0]
    expect(list.type).toBe('bullet_list')
    expect(list.content).toHaveLength(2)
    expect(list.content[0].content[0].content[0].text).toBe('Erster Punkt')
  })

  it('preserves ordered lists distinctly from bullet lists', async () => {
    const original = doc([
      { type: 'ordered_list', content: [{ type: 'list_item', content: [paragraph('Schritt eins')] }] },
    ])
    const result = await roundTrip(original)
    expect((result.body as any).content[0].type).toBe('ordered_list')
  })

  it('keeps two separate lists distinct when a paragraph separates them', async () => {
    const original = doc([
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('A')] }] },
      paragraph('Zwischentext'),
      { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('B')] }] },
    ])
    const result = await roundTrip(original)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['bullet_list', 'paragraph', 'bullet_list'])
  })
})

describe('DOCX round trip: tables', () => {
  it('preserves rows, columns, and cell text', async () => {
    const original = doc([
      {
        type: 'table',
        content: [
          {
            type: 'table_row',
            content: [
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('A1')] },
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('B1')] },
            ],
          },
          {
            type: 'table_row',
            content: [
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('A2')] },
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('B2')] },
            ],
          },
        ],
      },
    ])
    const result = await roundTrip(original)
    const table = (result.body as any).content[0]
    expect(table.type).toBe('table')
    expect(table.content).toHaveLength(2)
    expect(table.content[0].content).toHaveLength(2)
    expect(table.content[0].content[0].content[0].content[0].text).toBe('A1')
    expect(table.content[1].content[1].content[0].content[0].text).toBe('B2')
  })

  it('preserves merged cells (colspan)', async () => {
    const original = doc([
      {
        type: 'table',
        content: [
          {
            type: 'table_row',
            content: [{ type: 'table_cell', attrs: { colspan: 2, rowspan: 1 }, content: [paragraph('Merged')] }],
          },
        ],
      },
    ])
    const result = await roundTrip(original)
    const cell = (result.body as any).content[0].content[0].content[0]
    expect(cell.attrs.colspan).toBe(2)
    expect(cell.content[0].content[0].text).toBe('Merged')
  })

  it('preserves vertically merged cells (rowspan)', async () => {
    const original = doc([
      {
        type: 'table',
        content: [
          {
            type: 'table_row',
            content: [
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 2 }, content: [paragraph('Tall')] },
              { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('R1C2')] },
            ],
          },
          {
            type: 'table_row',
            content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('R2C2')] }],
          },
        ],
      },
    ])
    const result = await roundTrip(original)
    const table = (result.body as any).content[0]
    expect(table.content[0].content[0].attrs.rowspan).toBe(2)
    expect(table.content[0].content[0].content[0].content[0].text).toBe('Tall')
    expect(table.content[1].content).toHaveLength(1)
    expect(table.content[1].content[0].content[0].content[0].text).toBe('R2C2')
  })
})

describe('DOCX round trip: images', () => {
  it('preserves an embedded image as a self-contained data URL', async () => {
    const original = doc([{ type: 'image', attrs: { src: TINY_PNG, alt: 'Testbild', width: 100, height: 80 } }])
    const result = await roundTrip(original)
    const image = (result.body as any).content[0]
    expect(image.type).toBe('image')
    expect(image.attrs.src).toMatch(/^data:image\/png;base64,/)
    expect(image.attrs.src.split(',')[1]).toBe(TINY_PNG.split(',')[1])
  })

  it('splits a paragraph containing both text and an image into separate blocks', async () => {
    const original: WordDocumentContent = {
      body: {
        type: 'doc',
        content: [paragraph('Vorher'), { type: 'image', attrs: { src: TINY_PNG, alt: '' } }],
      },
      header: null,
      footer: null,
      meta: { title: '' },
    }
    const result = await roundTrip(original)
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toContain('image')
    expect(types).toContain('paragraph')
  })
})

describe('DOCX round trip: header, footer, and metadata', () => {
  it('preserves header and footer content', async () => {
    const original: WordDocumentContent = {
      body: { type: 'doc', content: [paragraph('Inhalt')] },
      header: { type: 'doc', content: [paragraph('Kopfzeile')] },
      footer: { type: 'doc', content: [paragraph('Fußzeile Seite')] },
      meta: { title: '' },
    }
    const result = await roundTrip(original)
    expect((result.header as any).content[0].content[0].text).toBe('Kopfzeile')
    expect((result.footer as any).content[0].content[0].text).toBe('Fußzeile Seite')
  })

  it('omits header/footer entirely when the document has none', async () => {
    const original = doc([paragraph('Nur Inhalt')])
    const result = await roundTrip(original)
    expect(result.header).toBeNull()
    expect(result.footer).toBeNull()
  })

  it('preserves the document title', async () => {
    const original: WordDocumentContent = {
      body: { type: 'doc', content: [paragraph('Inhalt')] },
      header: null,
      footer: null,
      meta: { title: 'Mein Testdokument' },
    }
    const result = await roundTrip(original)
    expect(result.meta.title).toBe('Mein Testdokument')
  })
})

describe('DOCX round trip: whole-document fidelity', () => {
  it('preserves a document combining every supported feature at once', async () => {
    const original: WordDocumentContent = {
      body: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1, align: 'left' }, content: [{ type: 'text', text: 'Bericht' }] },
          {
            type: 'paragraph',
            attrs: { align: 'justify' },
            content: [
              { type: 'text', text: 'Einleitung mit ' },
              { type: 'text', text: 'fett', marks: [{ type: 'strong' }] },
              { type: 'text', text: ' Text.' },
            ],
          },
          {
            type: 'bullet_list',
            content: [{ type: 'list_item', content: [paragraph('Punkt A')] }, { type: 'list_item', content: [paragraph('Punkt B')] }],
          },
          {
            type: 'table',
            content: [
              {
                type: 'table_row',
                content: [
                  { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('X')] },
                  { type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Y')] },
                ],
              },
            ],
          },
          { type: 'image', attrs: { src: TINY_PNG, alt: 'Diagramm' } },
        ],
      },
      header: { type: 'doc', content: [paragraph('Firma XY')] },
      footer: { type: 'doc', content: [paragraph('Seite')] },
      meta: { title: 'Gesamtbericht' },
    }

    const result = await roundTrip(original)

    expect(result.meta.title).toBe('Gesamtbericht')
    expect((result.header as any).content[0].content[0].text).toBe('Firma XY')
    expect((result.footer as any).content[0].content[0].text).toBe('Seite')
    const types = (result.body as any).content.map((n: any) => n.type)
    expect(types).toEqual(['heading', 'paragraph', 'bullet_list', 'table', 'image'])
  })
})
