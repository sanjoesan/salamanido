import { render, cleanup } from '@testing-library/react'
import { WordEditor } from '../WordEditor'
import { createBlankWordDocument } from '../../documentModel'
import type { WordDocumentContent } from '../../documentModel'

afterEach(() => {
  cleanup()
})

function makeDoc(text?: string): WordDocumentContent {
  const content = createBlankWordDocument()
  if (text) {
    content.body = {
      type: 'doc',
      content: [{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text }] }],
    }
  }
  return content
}

describe('WordEditor: mount/unmount hygiene (Grenzfall 8)', () => {
  it('focuses the editable surface on mount, without requiring a click', () => {
    const { container } = render(<WordEditor document={{ fileName: 'a.docx', content: makeDoc(), dirty: false }} onChange={() => {}} />)
    const editable = container.querySelector('.word-editor-surface [contenteditable="true"]')
    expect(editable).not.toBeNull()
    expect(document.activeElement).toBe(editable)
  })

  it('leaves no DOM/text behind after unmount, and a fresh mount starts clean', () => {
    const { container: first, unmount } = render(
      <WordEditor document={{ fileName: 'a.docx', content: makeDoc('Erster Text'), dirty: false }} onChange={() => {}} />,
    )
    expect(first.textContent).toContain('Erster Text')

    unmount()
    expect(first.querySelector('.ProseMirror')).toBeNull()

    const { container: second } = render(
      <WordEditor document={{ fileName: 'b.docx', content: makeDoc(), dirty: false }} onChange={() => {}} />,
    )
    expect(second.textContent).not.toContain('Erster Text')
  })
})
