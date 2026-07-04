import { assertLoadableDocument } from '../validateDocument'
import type { WordDocumentContent } from '../documentModel'

function doc(body: unknown, header: unknown = null, footer: unknown = null): WordDocumentContent {
  return { body: body as any, header: header as any, footer: footer as any, meta: { title: '' } }
}

describe('assertLoadableDocument', () => {
  it('lets a valid document pass through unchanged (no throw)', () => {
    const content = doc({
      type: 'doc',
      content: [{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'Hallo' }] }],
    })
    expect(() => assertLoadableDocument(content)).not.toThrow()
  })

  it('lets a valid document with header and footer pass through', () => {
    const content = doc(
      { type: 'doc', content: [{ type: 'paragraph', attrs: { align: 'left' } }] },
      { type: 'doc', content: [{ type: 'paragraph', attrs: { align: 'left' } }] },
      { type: 'doc', content: [{ type: 'paragraph', attrs: { align: 'left' } }] },
    )
    expect(() => assertLoadableDocument(content)).not.toThrow()
  })

  it('throws a readable German error for a schema-incompatible body (bare text node in table_cell without a paragraph wrapper)', () => {
    const content = doc({
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'table_row',
              content: [
                {
                  type: 'table_cell',
                  attrs: { colspan: 1, rowspan: 1 },
                  // Invalid: table_cell requires block+ content, not a bare text node.
                  content: [{ type: 'text', text: 'kaputt' }],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(() => assertLoadableDocument(content)).toThrow(/Dokumentstruktur ist mit dem Editor nicht kompatibel/)
  })

  it('throws for a node type unknown to the schema', () => {
    const content = doc({ type: 'doc', content: [{ type: 'not_a_real_node_type' }] })
    expect(() => assertLoadableDocument(content)).toThrow()
  })

  it('throws when the body content array is empty (violates doc: block+)', () => {
    const content = doc({ type: 'doc', content: [] })
    expect(() => assertLoadableDocument(content)).toThrow()
  })

  it('throws for a schema-incompatible header even when the body is valid', () => {
    const content = doc(
      { type: 'doc', content: [{ type: 'paragraph', attrs: { align: 'left' } }] },
      { type: 'doc', content: [{ type: 'not_a_real_node_type' }] },
    )
    expect(() => assertLoadableDocument(content)).toThrow()
  })

  it('allows a list_item containing only a nested list, no leading paragraph (real-world ODT shape)', () => {
    const content = doc({
      type: 'doc',
      content: [
        {
          type: 'bullet_list',
          content: [
            {
              type: 'list_item',
              content: [
                {
                  type: 'bullet_list',
                  content: [{ type: 'list_item', content: [{ type: 'paragraph', attrs: { align: 'left' } }] }],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(() => assertLoadableDocument(content)).not.toThrow()
  })

  it('allows an unsupported_block node with nested block content', () => {
    const content = doc({
      type: 'doc',
      content: [
        {
          type: 'unsupported_block',
          attrs: { kind: 'object' },
          content: [{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: 'Text im Objekt' }] }],
        },
      ],
    })
    expect(() => assertLoadableDocument(content)).not.toThrow()
  })
})
