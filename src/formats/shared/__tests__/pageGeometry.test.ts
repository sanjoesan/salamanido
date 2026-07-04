import { mmToTwips, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, PAGE_MARGIN_MM } from '../pageGeometry'

// QA suite for specs/neues-dokument-qa.md U19 — anti-drift test for DOCX (twips)
// vs ODT (cm) vs on-screen (px) page geometry all deriving from one shared mm source.

describe('pageGeometry: anti-drift values (U19)', () => {
  it('mmToTwips produces the exact OOXML values used by the code plan', () => {
    expect(mmToTwips(210)).toBe(11906)
    expect(mmToTwips(297)).toBe(16838)
    expect(mmToTwips(25)).toBe(1417)
  })

  it('the shared mm constants match the values baked into ODT (21cm/29.7cm/2.5cm) and DOCX', () => {
    expect(PAGE_WIDTH_MM).toBe(210)
    expect(PAGE_HEIGHT_MM).toBe(297)
    expect(PAGE_MARGIN_MM).toBe(25)
    expect(mmToTwips(PAGE_WIDTH_MM)).toBe(11906)
    expect(mmToTwips(PAGE_HEIGHT_MM)).toBe(16838)
    expect(mmToTwips(PAGE_MARGIN_MM)).toBe(1417)
  })
})
