import { PAGE_WIDTH_MM, PAGE_HEIGHT_MM, PAGE_MARGIN_MM, mmToTwips } from '../shared/pageGeometry'

/** `<w:pgSz>`/`<w:pgMar>` für die feste A4/2,5cm-Standardgeometrie (siehe pageGeometry.ts). */
export function defaultPageSetupXml(): string {
  const width = mmToTwips(PAGE_WIDTH_MM)
  const height = mmToTwips(PAGE_HEIGHT_MM)
  const margin = mmToTwips(PAGE_MARGIN_MM)
  return (
    `<w:pgSz w:w="${width}" w:h="${height}"/>` +
    `<w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" ` +
    `w:header="708" w:footer="708" w:gutter="0"/>`
  )
}
