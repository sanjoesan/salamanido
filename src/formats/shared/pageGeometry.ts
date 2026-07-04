/**
 * Fixe Seitengeometrie für jedes neu erstellte und jedes exportierte Dokument:
 * A4 (210 x 297 mm), 2,5 cm Rand auf allen Seiten. Es gibt aktuell keine
 * Persistenz pro Dokument (kein Feld in `WordDocumentContent`) und keine UI, das zu
 * ändern — siehe specs/neues-dokument-code.md Abschnitt 5 ("Nicht-Ziele") sowie die
 * Backlog-Einträge `papierformat`/`seitenraender`/`seitenausrichtung`.
 *
 * Konsumenten:
 * - shared/editor/pageLayout.ts (Bildschirm-Simulation, in px)
 * - docx/writer.ts (w:pgSz/w:pgMar, in Twips)
 * - odt/writer.ts (style:page-layout-properties, in cm)
 */
export const PAGE_WIDTH_MM = 210
export const PAGE_HEIGHT_MM = 297
export const PAGE_MARGIN_MM = 25

const TWIPS_PER_MM = 1440 / 25.4

/** OOXML misst Seiten-/Randmaße in Twentieths of a Point (1/1440 inch). */
export function mmToTwips(mm: number): number {
  return Math.round(mm * TWIPS_PER_MM)
}
