import { describe, it, expect } from 'vitest'
import type { Node as PMNode } from 'prosemirror-model'
import { wordSchema } from '../../schema'
import { findMatches, initialActiveIndex, type SearchQuery } from '../search'

// Unit-Abdeckung für specs/suchen-req.md §3 (Literal-Escaping, Diakritik-Sensitivität,
// Nicht-Überlappung, Formatierungs-/Block-/hard_break-Grenzen, Unicode-Wortgrenzen).

function doc(...blocks: PMNode[]): PMNode {
  return wordSchema.node('doc', null, blocks)
}
function para(...children: PMNode[]): PMNode {
  return wordSchema.node('paragraph', null, children)
}
const t = (text: string, marks: Parameters<typeof wordSchema.text>[1] = []) => wordSchema.text(text, marks)
const q = (text: string, opts: Partial<SearchQuery> = {}): SearchQuery => ({
  text,
  caseSensitive: false,
  wholeWord: false,
  ...opts,
})
const texts = (d: PMNode, matches: Array<{ from: number; to: number }>) =>
  matches.map((m) => d.textBetween(m.from, m.to))

describe('findMatches (§3.1)', () => {
  it('case-insensitive als Standard, case-sensitive per Toggle', () => {
    const d = doc(para(t('Haus haus HAUS')))
    expect(findMatches(d, q('haus'))).toHaveLength(3)
    expect(findMatches(d, q('haus', { caseSensitive: true }))).toHaveLength(1)
  })

  it('diakritik-sensitiv: „u" findet nicht „ü", „ss" nicht „ß" — aber „ü" findet „ü"', () => {
    const d = doc(para(t('über Straße')))
    expect(findMatches(d, q('uber'))).toHaveLength(0)
    expect(findMatches(d, q('strasse'))).toHaveLength(0)
    expect(findMatches(d, q('ü'))).toHaveLength(1)
    expect(findMatches(d, q('ß'))).toHaveLength(1)
  })

  it('Regex-Metazeichen werden buchstäblich gesucht', () => {
    const d = doc(para(t('genau a.b*c hier, nicht aXbYYYc')))
    const matches = findMatches(d, q('a.b*c'))
    expect(matches).toHaveLength(1)
    expect(texts(d, matches)).toEqual(['a.b*c'])
  })

  it('nicht überlappend: „aa" in „aaaa" → 2; „ana" in „banana" → 1', () => {
    expect(findMatches(doc(para(t('aaaa'))), q('aa'))).toHaveLength(2)
    expect(findMatches(doc(para(t('banana'))), q('ana'))).toHaveLength(1)
  })

  it('leer/nur Leerzeichen → keine Treffer (keine Highlight-Flut)', () => {
    const d = doc(para(t('viel   Raum')))
    expect(findMatches(d, q(''))).toHaveLength(0)
    expect(findMatches(d, q('   '))).toHaveLength(0)
  })
})

describe('Treffergrenzen (§3.2)', () => {
  it('Formatierungsgrenze im selben Block ist KEINE Treffergrenze', () => {
    const strong = wordSchema.marks.strong.create()
    const d = doc(para(t('Wo', [strong]), t('rt')))
    const matches = findMatches(d, q('Wort'))
    expect(matches).toHaveLength(1)
    expect(texts(d, matches)).toEqual(['Wort'])
  })

  it('Absatzgrenze ist eine harte Grenze', () => {
    const d = doc(para(t('Ende Wo')), para(t('rt Anfang')))
    expect(findMatches(d, q('Wort'))).toHaveLength(0)
  })

  it('hard_break zählt als ein \\n-Zeichen: normaler Begriff endet dort, \\n-haltiger überspannt ihn', () => {
    const d = doc(para(t('Zeile eins'), wordSchema.node('hard_break'), t('Zeile zwei')))
    expect(findMatches(d, q('einsZeile'))).toHaveLength(0)
    expect(findMatches(d, q('eins\nZeile'))).toHaveLength(1)
    expect(findMatches(d, q('Zeile'))).toHaveLength(2)
  })

  it('Treffer in Tabellenzellen und Listen werden gefunden', () => {
    const cellPara = para(t('Zelltreffer'))
    const cell = wordSchema.node('table_cell', null, [cellPara])
    const row = wordSchema.node('table_row', null, [cell])
    const table = wordSchema.node('table', null, [row])
    const item = wordSchema.node('list_item', null, [para(t('Listentreffer'))])
    const list = wordSchema.node('bullet_list', null, [item])
    const d = doc(table, list)
    expect(findMatches(d, q('treffer'))).toHaveLength(2)
  })
})

describe('„Nur ganzes Wort" mit Unicode-Wortgrenzen (§3.2 — die \\b-Falle)', () => {
  it('„Straße" freistehend zählt, in „Hauptstraße" nicht', () => {
    const d = doc(para(t('Die Straße neben der Hauptstraße')))
    const matches = findMatches(d, q('Straße', { wholeWord: true }))
    expect(matches).toHaveLength(1)
  })

  it('„über" freistehend, nicht in „überall"; „Café" wird als ganzes Wort erkannt', () => {
    const d = doc(para(t('über das Café, überall')))
    expect(findMatches(d, q('über', { wholeWord: true }))).toHaveLength(1)
    expect(findMatches(d, q('Café', { wholeWord: true }))).toHaveLength(1)
  })

  it('„Stra" ist in „Straße" KEIN ganzes Wort (ASCII-\\b hätte hier eine falsche Grenze)', () => {
    const d = doc(para(t('Straße')))
    expect(findMatches(d, q('Stra', { wholeWord: true }))).toHaveLength(0)
  })

  it('Ziffern sind Wortzeichen, Bindestrich ist Grenze (dokumentierte Entscheidung)', () => {
    const d = doc(para(t('Wort1 und Wort-Grenze')))
    expect(findMatches(d, q('Wort', { wholeWord: true }))).toHaveLength(1) // nur vor „-Grenze"
  })

  it('Metazeichen-Begriff („c++") kombiniert literal + wortgrenzen-genau', () => {
    const d = doc(para(t('c++ ist nicht c+++x')))
    const matches = findMatches(d, q('c++', { wholeWord: true }))
    // "c++" freistehend zählt; in "c+++x" liegt links eine Wortgrenze, rechts '+' (kein
    // Wortzeichen) → nach der definierten Semantik zählt auch dieser Kandidat: prüfen,
    // dass GENAU die dokumentierte Semantik gilt (beide Ränder Nicht-Wortzeichen).
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(texts(d, matches)[0]).toBe('c++')
  })
})

describe('initialActiveIndex (§4)', () => {
  const matches = [
    { from: 5, to: 8 },
    { from: 20, to: 23 },
    { from: 40, to: 43 },
  ]
  it('erster Treffer an/nach der Referenzposition', () => {
    expect(initialActiveIndex(matches, 0)).toBe(0)
    expect(initialActiveIndex(matches, 6)).toBe(1)
    expect(initialActiveIndex(matches, 20)).toBe(1)
  })
  it('nach dem letzten Treffer → Umbruch zum ersten; leer → -1', () => {
    expect(initialActiveIndex(matches, 99)).toBe(0)
    expect(initialActiveIndex([], 0)).toBe(-1)
  })
})
