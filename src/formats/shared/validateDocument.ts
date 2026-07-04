import { wordSchema } from './schema'
import type { WordDocumentContent } from './documentModel'

/**
 * Throws a readable German error if the parsed content cannot be loaded into the
 * shared ProseMirror schema — converts a would-be white-screen crash deep inside the
 * editor mount (`WordEditor`'s `wordSchema.nodeFromJSON(...)` call, which runs *after*
 * `FormatPicker.handleFile`'s `try/catch` has already returned) into a normal,
 * catchable import error. Every reader (`readDocx`/`readOdt`) must call this before
 * returning so a schema-incompatible document never reaches the editor mount at all.
 */
export function assertLoadableDocument(content: WordDocumentContent): void {
  try {
    wordSchema.nodeFromJSON(content.body).check()
    if (content.header) wordSchema.nodeFromJSON(content.header).check()
    if (content.footer) wordSchema.nodeFromJSON(content.footer).check()
  } catch (err) {
    throw new Error(
      `Dokumentstruktur ist mit dem Editor nicht kompatibel: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}
