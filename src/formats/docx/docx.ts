import type { FormatModule } from '../types'
import { createBlankWordDocument, type WordDocumentContent } from '../shared/documentModel'
import { WordEditor } from '../shared/editor/WordEditor'
import { readDocx } from './reader'
import { writeDocx } from './writer'

export const docxModule: FormatModule<WordDocumentContent> = {
  id: 'docx',
  label: 'Word-Dokument (.docx)',
  description: 'Seitenbasierter Texteditor, kompatibel mit Microsoft Word.',
  extensions: ['.docx'],
  mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  importFile: (file) => readDocx(file),
  exportFile: (content) => writeDocx(content),
  createNew: () => createBlankWordDocument(),
  defaultName: 'Unbenanntes Dokument',
  editor: WordEditor,
}
