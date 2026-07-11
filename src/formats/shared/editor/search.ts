import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import type { EditorState, Transaction } from 'prosemirror-state'
import type { Node as PMNode } from 'prosemirror-model'
import { Decoration, DecorationSet } from 'prosemirror-view'
import type { EditorView } from 'prosemirror-view'

/**
 * Suchen (specs/suchen-req.md): flüchtige, rein darstellungsseitige Trefferhervorhebung
 * über ein Decoration-Plugin — verbindliche Architekturentscheidung §6: KEIN Missbrauch
 * des highlight-Marks, kein Undo-Schritt, kein Export-Inhalt, kein dirty-Umschalten
 * (alle Zustandsänderungen laufen als Meta-only-Transaktionen mit docChanged === false).
 */

export interface SearchQuery {
  text: string
  caseSensitive: boolean
  wholeWord: boolean
}

export interface SearchMatch {
  from: number
  to: number
}

export interface SearchState {
  query: SearchQuery | null
  matches: SearchMatch[]
  /** Index in `matches`; -1 = kein aktiver Treffer. */
  activeIndex: number
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Unicode-bewusste Wortzeichen-Definition (req §3.2): Buchstaben, Ziffern, Unterstrich.
 * Bewusste Entscheidung laut Spec-Vorschlag: Ziffern = Wortzeichen, Bindestrich = Grenze.
 * Die naive JS-`\b`-Semantik wäre ASCII-basiert und erkennt bei „Straße"/„über"/„Café"
 * FALSCHE Wortgrenzen — genau die in der req markierte Falle. */
const isWordChar = (ch: string | undefined) => ch !== undefined && /[\p{L}\p{N}_]/u.test(ch)

/**
 * Findet alle Fundstellen im Dokument (req §3): je Textblock auf dem REINEN Textinhalt
 * (Formatierungsgrenzen sind keine Treffergrenzen; Textblockgrenzen schon), hard_break
 * zählt als ein `\n`-Zeichen, Treffer sind links-nach-rechts NICHT überlappend, der
 * Suchbegriff ist reiner Literaltext (vollständig escaped). Groß-/Kleinschreibung läuft
 * über das `i`-Regex-Flag (längentreu — ein toLowerCase-Vergleich könnte bei Zeichen wie
 * `İ` die Länge ändern); Diakritika bleiben bewusst signifikant (§3.1).
 */
export function findMatches(doc: PMNode, query: SearchQuery): SearchMatch[] {
  const text = query.text
  if (!text || !text.trim()) return []
  const matches: SearchMatch[] = []
  const regex = new RegExp(escapeRegex(text), query.caseSensitive ? 'gu' : 'giu')

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    // hard_break (leafText '\n') bleibt 1 Zeichen breit → Textindex == Positionsoffset.
    const blockText = node.textBetween(0, node.content.size, undefined, (leaf) =>
      leaf.type.spec.leafText ? (leaf.type.spec.leafText(leaf) as string) : '￼',
    )
    regex.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = regex.exec(blockText)) !== null) {
      if (match[0].length === 0) break // defensiv: nie in einer Endlosschleife hängen
      if (query.wholeWord) {
        const before = blockText[match.index - 1]
        const after = blockText[match.index + match[0].length]
        if (isWordChar(before) || isWordChar(after)) {
          // abgelehnter Kandidat: nur EIN Zeichen weiter, sonst gingen spätere
          // wortgrenzen-gültige Vorkommen verloren
          regex.lastIndex = match.index + 1
          continue
        }
      }
      const start = pos + 1 + match.index
      matches.push({ from: start, to: start + match[0].length })
    }
    return false // Textblöcke haben keine weiteren Textblöcke in sich
  })
  return matches
}

/** Der erste Treffer an oder nach `referencePos`, mit Umbruch zum ersten Treffer
 * (req §4 „Initiale aktive Fundstelle"). -1 nur bei leerer Trefferliste. */
export function initialActiveIndex(matches: SearchMatch[], referencePos: number): number {
  if (matches.length === 0) return -1
  const at = matches.findIndex((m) => m.from >= referencePos)
  return at === -1 ? 0 : at
}

export const searchKey = new PluginKey<SearchState>('search')

const EMPTY: SearchState = { query: null, matches: [], activeIndex: -1 }

export function createSearchPlugin(): Plugin<SearchState> {
  return new Plugin<SearchState>({
    key: searchKey,
    state: {
      init: () => EMPTY,
      apply(tr: Transaction, prev: SearchState): SearchState {
        const meta = tr.getMeta(searchKey) as Partial<SearchState> | { clear: true } | undefined
        if (meta && 'clear' in meta) return EMPTY
        let next = prev
        if (meta) next = { ...prev, ...meta }
        if (tr.docChanged && next.query) {
          // Live-Neuberechnung bei jeder Inhaltsänderung (req §7): Positionen NIE aus
          // dem alten Baum weiterverwenden. Der aktive Index folgt der bisherigen
          // aktiven Position so nah wie möglich.
          const previousActiveFrom =
            next.activeIndex >= 0 && next.matches[next.activeIndex]
              ? tr.mapping.map(next.matches[next.activeIndex].from)
              : 0
          const matches = findMatches(tr.doc, next.query)
          return { ...next, matches, activeIndex: initialActiveIndex(matches, previousActiveFrom) }
        }
        return next
      },
    },
    props: {
      decorations(state: EditorState) {
        const search = searchKey.getState(state)
        if (!search || search.matches.length === 0) return DecorationSet.empty
        const decorations = search.matches.map((match, index) =>
          Decoration.inline(match.from, match.to, {
            class: index === search.activeIndex ? 'search-match search-match--active' : 'search-match',
          }),
        )
        return DecorationSet.create(state.doc, decorations)
      },
    },
  })
}

/** Setzt Suchbegriff/Optionen neu und bestimmt den aktiven Treffer relativ zur
 * aktuellen Cursorposition (Meta-only — docChanged bleibt false, req §6). */
export function runSearch(view: EditorView, query: SearchQuery): SearchState {
  const matches = findMatches(view.state.doc, query)
  const reference = view.state.selection?.from ?? 0
  const activeIndex = initialActiveIndex(matches, reference)
  const next: SearchState = { query, matches, activeIndex }
  view.dispatch(view.state.tr.setMeta(searchKey, next))
  return next
}

/** Bewegt den aktiven Treffer mit Umbruch (req §5). */
export function moveActive(view: EditorView, delta: 1 | -1): SearchState | null {
  const search = searchKey.getState(view.state)
  if (!search || search.matches.length === 0) return null
  const count = search.matches.length
  const activeIndex = ((search.activeIndex < 0 ? 0 : search.activeIndex) + delta + count) % count
  view.dispatch(view.state.tr.setMeta(searchKey, { activeIndex }))
  return { ...search, activeIndex }
}

/**
 * Schließt die Suche: Decorations verschwinden spurlos, und der Cursor wird SYNCHRON in
 * derselben Transaktion als echte PM-Selektion an den zuletzt aktiven Treffer gesetzt
 * (req §5 — der kritische Selection-Sync-Punkt: sofortiges Weitertippen darf nie den
 * Dokumentinhalt ersetzen). Ohne aktiven Treffer bleibt die Selektion unverändert.
 */
export function closeSearch(view: EditorView): void {
  const search = searchKey.getState(view.state)
  let tr = view.state.tr.setMeta(searchKey, { clear: true })
  const active = search && search.activeIndex >= 0 ? search.matches[search.activeIndex] : null
  if (active) {
    tr = tr.setSelection(TextSelection.create(view.state.doc, Math.min(active.to, view.state.doc.content.size)))
  }
  view.dispatch(tr)
  view.focus()
}
