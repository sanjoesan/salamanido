import { createBlankWordDocument } from '../documentModel'
import { docxModule } from '../../docx/docx'
import { odtModule } from '../../odt/odt'

// QA suite for specs/neues-dokument-qa.md Abschnitt 1.1 (U1-U5) and 1.6 (U22).
// Independent of the developer's own test files — verifies the same claims
// from scratch against the real module exports.

describe('createBlankWordDocument() (U1-U4)', () => {
  it('U1: body.content has exactly one left-aligned, empty paragraph', () => {
    const doc = createBlankWordDocument()
    const content = doc.body.content as unknown[]
    expect(content).toHaveLength(1)
    expect(content[0]).toEqual({ type: 'paragraph', attrs: { align: 'left' } })
  })

  it('U2: header and footer are strictly null', () => {
    const doc = createBlankWordDocument()
    expect(doc.header).toBeNull()
    expect(doc.footer).toBeNull()
  })

  it('U3: meta.title is strictly the empty string, not undefined/null', () => {
    const doc = createBlankWordDocument()
    expect(doc.meta.title).toBe('')
    expect(doc.meta.title).not.toBeUndefined()
    expect(doc.meta.title).not.toBeNull()
  })

  it('U4: two consecutive calls are structurally equal but not the same object references', () => {
    const a = createBlankWordDocument()
    const b = createBlankWordDocument()
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
    expect(a.body).not.toBe(b.body)
    expect(a.meta).not.toBe(b.meta)

    // Mutating one must never leak into the other (Grenzfall 8).
    const aContent = a.body.content as Array<{ attrs: { align: string } }>
    const bContent = b.body.content as unknown[]
    aContent[0].attrs.align = 'center'
    expect(bContent[0]).toEqual({ type: 'paragraph', attrs: { align: 'left' } })
  })
})

describe('DOCX vs ODT createNew() parity (U5)', () => {
  it('U5: docxModule.createNew() and odtModule.createNew() produce toEqual-identical structures', () => {
    const fromDocx = docxModule.createNew()
    const fromOdt = odtModule.createNew()
    expect(fromDocx).toEqual(fromOdt)
  })
})

describe('FormatModule.createNew contract (U22)', () => {
  it('U22: createNew() is synchronous (no .then), for both docx and odt modules', () => {
    const docxResult = docxModule.createNew()
    const odtResult = odtModule.createNew()
    expect(typeof (docxResult as unknown as { then?: unknown }).then).not.toBe('function')
    expect(typeof (odtResult as unknown as { then?: unknown }).then).not.toBe('function')
  })
})
