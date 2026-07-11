import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import type { Node as PMNode, Mark } from 'prosemirror-model'
import { wordSchema } from '../../schema'
import { normalizeLinkHref, linkAtSelection, applyLink, removeLink } from '../commands'

// Unit-Abdeckung für specs/hyperlink-einfuegen-req.md §3.1–§3.5 + §3.3/Grenzfall 4.9.

const link = (href: string) => wordSchema.marks.link.create({ href })
const strong = wordSchema.marks.strong.create()

function para(...children: PMNode[]): PMNode {
  return wordSchema.node('paragraph', null, children)
}
function docState(...blocks: PMNode[]): EditorState {
  return EditorState.create({ doc: wordSchema.node('doc', null, blocks), schema: wordSchema })
}
function withCursor(state: EditorState, pos: number): EditorState {
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)))
}
function withRange(state: EditorState, from: number, to: number): EditorState {
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, to)))
}
function apply(state: EditorState, cmd: ReturnType<typeof applyLink>): { ran: boolean; next: EditorState } {
  let next = state
  const ran = cmd(state, (tr) => (next = state.apply(tr)))
  return { ran, next }
}
function marksAt(state: EditorState, pos: number): readonly Mark[] {
  return state.doc.resolve(pos).marks()
}

describe('normalizeLinkHref (§3.3, Grenzfall 4.9)', () => {
  it('leer/Whitespace → null', () => {
    expect(normalizeLinkHref('')).toBeNull()
    expect(normalizeLinkHref('   ')).toBeNull()
  })
  it('javascript:/data:/vbscript: werden abgelehnt — auch verschleiert', () => {
    expect(normalizeLinkHref('javascript:alert(1)')).toBeNull()
    expect(normalizeLinkHref('JaVaScRiPt:alert(1)')).toBeNull()
    expect(normalizeLinkHref('  java script : alert(1)')).toBeNull()
    expect(normalizeLinkHref('data:text/html,<script>1</script>')).toBeNull()
    expect(normalizeLinkHref('vbscript:msgbox')).toBeNull()
  })
  it('http/https/mailto/tel bleiben unverändert', () => {
    expect(normalizeLinkHref('https://x.test/pfad?a=1')).toBe('https://x.test/pfad?a=1')
    expect(normalizeLinkHref('http://x.test')).toBe('http://x.test')
    expect(normalizeLinkHref('mailto:a@b.test')).toBe('mailto:a@b.test')
    expect(normalizeLinkHref('tel:+491234')).toBe('tel:+491234')
  })
  it('ohne Schema → https:// vorangestellt (Word-/Docs-Verhalten)', () => {
    expect(normalizeLinkHref('beispiel.de')).toBe('https://beispiel.de')
    expect(normalizeLinkHref('www.beispiel.de/pfad')).toBe('https://www.beispiel.de/pfad')
  })
  it('relative Pfade/Anker crashen nicht und bleiben roh', () => {
    expect(normalizeLinkHref('../datei.docx')).toBe('../datei.docx')
    expect(normalizeLinkHref('/absolut')).toBe('/absolut')
    expect(normalizeLinkHref('#anker')).toBe('#anker')
  })
})

describe('linkAtSelection (§3.4 — Mark-Grenzen bestimmen den Bereich)', () => {
  it('Cursor mitten im Link: findet den GESAMTEN zusammenhängenden Bereich, auch über Formatwechsel', () => {
    // "vor [linkA][linkA+fett] nach" — Link läuft über zwei unterschiedlich formatierte Läufe
    const state = docState(
      para(
        wordSchema.text('vor '),
        wordSchema.text('norm', [link('https://x.test/')]),
        wordSchema.text('fett', [strong, link('https://x.test/')]),
        wordSchema.text(' nach'),
      ),
    )
    const cursor = withCursor(state, 7) // in "norm"
    expect(linkAtSelection(cursor)).toEqual({ href: 'https://x.test/', from: 5, to: 13 })
  })

  it('zwei ANEINANDERGRENZENDE Links mit verschiedenen Zielen bleiben getrennt (Grenzfall 8)', () => {
    const state = docState(
      para(wordSchema.text('eins', [link('https://a.test/')]), wordSchema.text('zwei', [link('https://b.test/')])),
    )
    const cursor = withCursor(state, 3) // in "eins"
    expect(linkAtSelection(cursor)).toEqual({ href: 'https://a.test/', from: 1, to: 5 })
  })

  it('Cursor außerhalb jedes Links → null', () => {
    const state = withCursor(docState(para(wordSchema.text('kein Link'))), 4)
    expect(linkAtSelection(state)).toBeNull()
  })
})

describe('applyLink (§3.1/§3.2/§3.4)', () => {
  it('Selektion: gesamte Range wird verlinkt, andere Marks bleiben', () => {
    const state = withRange(docState(para(wordSchema.text('ab'), wordSchema.text('cd', [strong]))), 1, 5)
    const { ran, next } = apply(state, applyLink('https://x.test/'))
    expect(ran).toBe(true)
    expect(marksAt(next, 2).some((m) => m.type.name === 'link')).toBe(true)
    const bold = next.doc.resolve(4).marks()
    expect(bold.some((m) => m.type.name === 'link')).toBe(true)
    expect(bold.some((m) => m.type.name === 'strong')).toBe(true)
  })

  it('gemischt verlinkte Selektion wird einheitlich auf die neue URL gesetzt (§3.1)', () => {
    const state = withRange(
      docState(para(wordSchema.text('alt', [link('https://alt.test/')]), wordSchema.text('neu'))),
      1,
      7,
    )
    const { next } = apply(state, applyLink('https://neu.test/'))
    const hrefs = new Set<string>()
    next.doc.descendants((node) => {
      node.marks.forEach((m) => {
        if (m.type.name === 'link') hrefs.add(m.attrs.href as string)
      })
      return true
    })
    expect([...hrefs]).toEqual(['https://neu.test/'])
  })

  it('Cursor im Link ohne Selektion: neue URL ersetzt den href auf dem GANZEN Bereich (§3.4)', () => {
    const state = withCursor(
      docState(para(wordSchema.text('vor '), wordSchema.text('linktext', [link('https://alt.test/')]))),
      8,
    )
    const { next } = apply(state, applyLink('https://neu.test/'))
    const marks = marksAt(next, 6)
    expect(marks.find((m) => m.type.name === 'link')?.attrs.href).toBe('https://neu.test/')
    // Bereich unverändert: "vor " bleibt unverlinkt
    expect(marksAt(next, 2).some((m) => m.type.name === 'link')).toBe(false)
  })

  it('Cursor ohne Link + Anzeigetext: fügt bereits verlinkten Text ein (§3.2b)', () => {
    const state = withCursor(docState(para(wordSchema.text('davor '))), 7)
    const { ran, next } = apply(state, applyLink('https://x.test/', 'Linktext'))
    expect(ran).toBe(true)
    expect(next.doc.textContent).toBe('davor Linktext')
    expect(marksAt(next, 9).find((m) => m.type.name === 'link')?.attrs.href).toBe('https://x.test/')
  })

  it('Cursor ohne Link und ohne Anzeigetext: false (Dialog erzwingt das Feld)', () => {
    const state = withCursor(docState(para(wordSchema.text('text'))), 2)
    expect(applyLink('https://x.test/')(state, () => {})).toBe(false)
  })
})

describe('removeLink (§3.5)', () => {
  it('Cursor im Link: entfernt NUR das link-Mark vom ganzen Bereich, Text+Marks bleiben', () => {
    const state = withCursor(
      docState(para(wordSchema.text('fettlink', [strong, link('https://x.test/')]))),
      4,
    )
    let next = state
    expect(removeLink()(state, (tr) => (next = state.apply(tr)))).toBe(true)
    expect(next.doc.textContent).toBe('fettlink')
    const marks = marksAt(next, 4)
    expect(marks.some((m) => m.type.name === 'link')).toBe(false)
    expect(marks.some((m) => m.type.name === 'strong')).toBe(true)
  })

  it('Cursor außerhalb eines Links: false', () => {
    const state = withCursor(docState(para(wordSchema.text('nix'))), 2)
    expect(removeLink()(state, () => {})).toBe(false)
  })
})
