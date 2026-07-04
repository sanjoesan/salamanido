# Umsetzungsplan: Feature „Suchen" — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/suchen-req.md`. Dieses Dokument prüft den
**tatsächlichen** Code-Stand (Stand heute, per Durchsicht aller unten zitierten
Dateien) gegen jede Behauptung der Anforderung und legt fest, welche Dateien wie
geändert bzw. neu angelegt werden. Stil orientiert an `fett-code.md` /
`FEATURE-SPEC-DOCX-ODT.md`. Kein Punkt hier ist bereits umgesetzt — dies ist der
Plan, nicht der Vollzug.

---

## 0. Kurzfassung / Kernbefunde

1. **Der Ist-Stand aus `suchen-req.md` (Zeilen 33–42) ist zutreffend, exakt
   verifiziert:** `Toolbar.tsx` enthält keinen Suchen-Button, `commands.ts` keine
   Such-Logik, `WordEditor.tsx` kein Such-Plugin. `schema.ts` enthält `highlight`
   (Zeilen 141–147) und `textColor` (134–140) wie beschrieben — beide werden von
   DOCX- und ODT-Reader/-Writer tatsächlich importiert/exportiert (siehe Abschnitt
   1 unten), die Warnung „Suche darf `highlight` nicht missbrauchen" ist also
   nicht nur theoretisch, sondern hätte einen echten Export-Bug zur Folge.
2. **Kein Schema-Fix nötig.** Für „Suchen" (Abschnitt 1–8 der Anforderung) ist
   **keine einzige Änderung** an `src/formats/shared/schema.ts` erforderlich — die
   Hervorhebung läuft ausschließlich über ProseMirror-`Decoration`/`DecorationSet`
   in einem neuen Plugin, komplett außerhalb des Dokumentmodells. Siehe Abschnitt 2.
3. **Kein DOCX-/ODT-Reader-/Writer-Fix nötig — für „Suchen" wie auch für
   „Suchen & Ersetzen".** Decorations erreichen `doc.toJSON()` nie (Architektur-
   Garantie, siehe Abschnitt 2.4). Und „Ersetzen" erzeugt ausschließlich ganz
   normalen, schema-konformen Dokumentinhalt (Text + bereits existierende Marks)
   — exakt denselben Inhalt, den auch normales Tippen erzeugen würde. Die
   bestehende, bereits rundreise-getestete Writer-/Reader-Pipeline
   (`src/formats/docx/writer.ts`/`reader.ts`, `src/formats/odt/writer.ts`/
   `reader.ts`) braucht dafür **keine Codeänderung**. Was Abschnitt 12 der
   Anforderung wirklich verlangt, ist **neue Testabdeckung** auf E2E- und
   Unit-Ebene, die genau das nachweist — kein neuer Produktionscode in
   `src/formats/docx/`/`src/formats/odt/`. Siehe Abschnitt 3.8 und 7.
4. **Ein Anforderungspunkt ist mit dem heutigen Code-Stand nicht erfüllbar und
   muss als Scope-Einschränkung dokumentiert werden, nicht stillschweigend
   ignoriert:** Abschnitt 8 der Anforderung verlangt Suche über Kopf-/Fußzeile
   „sobald Kopf-/Fußzeilen editierbar sind". Laut `kopfzeile-bearbeiten-req.md`
   Befund 4 gibt es **aktuell keinen editierbaren Kopf-/Fußzeilenbereich
   überhaupt** — `WordEditor.tsx` rendert genau eine `EditorView`, gebunden an
   `doc.content.body` (Zeile 65–68 unten). Solange `kopfzeile-bearbeiten`/
   `fusszeile-bearbeiten` nicht umgesetzt sind, kann „Suchen" dort schlicht
   nichts durchsuchen — Testfall 3 aus Abschnitt 8 der Anforderung ist bis dahin
   **nicht anwendbar**, nicht „nicht bestanden". Siehe Abschnitt 5.
5. **Vier neue, in der Anforderung nicht benannte Design-/Korrektheitsfragen**
   wurden bei der Planung aufgedeckt und unten explizit entschieden (nicht offen
   gelassen):
   - Wie eine `hard_break` beim Volltext-Abgleich behandelt wird, ohne die
     Absatzgrenze aufzuweichen (Abschnitt 2.2).
   - Wie Groß-/Kleinschreibung-Ignorieren ohne die JS-typische
     `"ß".toUpperCase() === "SS"`-Falle funktioniert (Abschnitt 2.2, Warnung).
   - Wie „Alle ersetzen" beweisbar schleifensicher ist, auch wenn der
     Ersetzungstext den Suchbegriff enthält (Abschnitt 4.3).
   - Warum die aktive Fundstelle während einer offenen Suche bewusst **keine**
     echte ProseMirror-Selektion ist (nur Decoration + Plugin-State) und das erst
     beim Schließen der Suchleiste nachgeholt wird — das reduziert die Berührung
     mit dem Selection-Sync-Bug auf genau eine Stelle im Code (Abschnitt 2.5).

---

## 1. Verifikation der in der Anforderung zitierten Fundstellen

| Fundstelle laut `suchen-req.md` | Ergebnis der Prüfung |
|---|---|
| `Toolbar.tsx` — kein Suchen-Button (Zeile 33) | Bestätigt. 248 Zeilen, keine Erwähnung von „Suchen"/„Search". |
| `commands.ts` — keine Such-Logik (Zeile 34) | Bestätigt. 108 Zeilen, enthält `setAlign`, `isAlignActive`, `setHeading`, `toggleList`, `liftFromList`, `insertImage`, `insertTable`, `applyMarkColor`, `clearMarkColor` — nichts zu Suche/Ersetzen. |
| `WordEditor.tsx` — Plugin-Registrierung, kein Such-Plugin (Zeile 35–37) | Bestätigt, Plugin-Array Zeilen 69–86: `history()`, zwei `keymap()`-Aufrufe, `columnResizing()`, `tableEditing()`, `dropCursor()`, `gapCursor()`, `createPaginationPlugin()`. Kein Decoration-Plugin für Suche. |
| `schema.ts` — `highlight`-Mark existiert bereits, persistent/exportiert (Zeile 38–42) | Bestätigt, Zeilen 141–147. **Zusätzlich verifiziert (über die Anforderung hinaus):** `highlight` wird tatsächlich importiert/exportiert — `docx/reader.ts:112` (`w:highlight` → Mark), `docx/writer.ts:26` (Mark → `w:highlight`), `odt/reader.ts:60,92` (`fo:background-color` → Mark), `odt/writer.ts:33` + `odt/styleRegistry.ts:57` (Mark → `fo:background-color`). Die Warnung aus der Anforderung ist also durch echten, round-trip-getesteten Export-Code gedeckt — ein Missbrauch für Suche würde real in jede exportierte DOCX/ODT-Datei durchschlagen. |
| `WordEditor.tsx` bindet Editor nur an `body`, kein Kopf-/Fußzeilen-`EditorView` | Bestätigt, Zeile 65 (`wordSchema.nodeFromJSON(doc.content.body)`) sowie Gegenprüfung über `kopfzeile-bearbeiten-req.md` Befund 4 (eigene, unabhängige Recherche desselben Sachverhalts, deckungsgleich). `documentModel.ts` Zeilen 5–6/17–18 bestätigt `header`/`footer` existieren nur als Datenfelder, `createBlankWordDocument()` setzt beide auf `null`. |
| `tests/e2e/selection-regression.spec.ts` (Referenz für Pflicht-Regressionstest) | Bestätigt vorhanden, 3 Tests, keiner erwähnt Suche — muss um eine Such-spezifische Sequenz ergänzt werden (siehe Abschnitt 7.3), nicht selbst verändert. |
| Backlog-Tabelle (`FEATURE-BACKLOG.md` Zeilen 140–148) | Bestätigt: `suchen`/`suchen-ersetzen`/`suchen-ersetzen-erweitert`/`gehe-zu` exakt wie in `suchen-req.md` zitiert; `alles-auswaehlen` separat als „vorhanden" markiert (Zeile 147, außerhalb des Geltungsbereichs dieser Datei). |

**Ergebnis:** Alle Ist-Stand-Behauptungen der Anforderung sind korrekt. Der Bau ist
tatsächlich eine vollständige Neuentwicklung ohne vorhandenes Teilgerüst — anders
als z. B. bei `kopfzeile-bearbeiten` (dort existierte wenigstens das Datenmodell
schon).

---

## 2. Architektur-Entscheidungen (verbindlich für Abschnitt 3)

### 2.1 Wo der Suchzustand lebt

Zwei Anteile, bewusst getrennt:

- **Plugin-State (ProseMirror, in `search.ts`):** Suchbegriff + Optionen (Groß-/
  Kleinschreibung, ganzes Wort), die daraus berechnete Trefferliste
  (`{ from, to }[]` in Dokumentkoordinaten) und der Index des aktiven Treffers.
  Lebt direkt im `EditorState` des jeweiligen `EditorView`, genau wie die
  Pagination-Decorations. Das ist die einzige Quelle der Wahrheit für „was ist
  aktuell markiert" — die React-Suchleiste liest sie bei jedem Render aus
  `searchPluginKey.getState(view.state)`, genau wie `Toolbar.tsx` heute schon
  `view.state` direkt liest (kein Redux/Context nötig, gleiches Muster wie
  bestehender Code).
- **UI-State (React, in `SearchBar.tsx`/`WordEditor.tsx`):** nur „ist die
  Suchleiste sichtbar" (`searchOpen`) und Hilfsfelder wie der Ersetzen-Text und
  der Ersetzen-Modus-Umschalter — das sind reine Anzeige-/Formularzustände ohne
  Bezug zum Dokumentmodell.

### 2.2 Wie Treffer gefunden werden (literal, keine Regex-Injection, Absatzgrenze hart)

Kernfunktion `findMatches(doc, query)` in der neuen Datei `search.ts` scannt
**jeden Textblock-Knoten unabhängig** (`node.isTextblock` — trifft auf `paragraph`
und `heading` zu, nicht auf `list_item` oder `table_cell`, die selbst keine
Textblöcke sind, aber automatisch weiter durchlaufen werden, da `doc.descendants`
in sie hineinsteigt). Das liefert **automatisch** genau die in Abschnitt 3/8 der
Anforderung geforderten Eigenschaften, ohne Sonderfälle:

- Kein Treffer über eine Absatzgrenze hinweg (jeder Textblock wird separat
  abgeglichen) — Testfall 8 aus Abschnitt 3, Grenzfall 5 aus Abschnitt 11.
- Korrekte Dokumentreihenfolge inkl. Tabellenzellen zeilenweise
  links-nach-rechts, weil `doc.descendants` exakt in Dokument-Kindreihenfolge
  läuft und die Doc-Struktur für Tabellen `table → table_row+ → table_cell+`
  ist — keine eigene Sortierlogik nötig (Abschnitt 8, Testfall 4).
- Ein Treffer über eine Formatierungsgrenze hinweg (z. B. „Wort" halb fett) zählt
  als **ein** Eintrag in `matches[]`, unabhängig davon, dass der Renderer die
  Decoration ggf. in mehrere DOM-`<span>`-Fragmente aufteilen muss, weil die
  zugrundeliegenden Marks unterschiedlich sind — Testfall 7 aus Abschnitt 3/4.

**Literal-Matching statt Regex:** Der Kernabgleich verwendet ausschließlich
`String.prototype.indexOf` auf dem (ggf. kleingeschriebenen) Klartext — der
Nutzer-Suchbegriff wird **niemals** in einen `RegExp`-Konstruktor eingesetzt.
Für „ganzes Wort" wird nur je ein **einzelnes** Nachbarzeichen gegen ein festes,
nicht vom Nutzer beeinflusstes Muster geprüft (`/[\p{L}\p{N}_]/u`, Unicode-Klasse
für Buchstaben/Ziffern — schließt „ä/ö/ü/ß" korrekt als Wortzeichen ein). Das
erfüllt Testfall 4 aus Abschnitt 3 (`a.b*c` literal, keine Regex-Interpretation)
durch Konstruktion, nicht durch nachträgliches Escapen von Metazeichen.

**Groß-/Kleinschreibung-Falle (neu entdeckt, nicht in der Anforderung benannt):**
Für „ignoriere Groß-/Kleinschreibung" **niemals** `.toUpperCase()` zum Angleichen
verwenden — in aktuellen JS-Engines gilt `"ß".toUpperCase() === "SS"` (Unicode
Default Case Folding), wodurch ein Dokument mit „Straße" plötzlich auch von einer
Suche nach „STRASSE" fälschlich getroffen würde bzw. Positionsoffsets verschieben
könnte (2 Zeichen „SS" vs. 1 Zeichen „ß"). Es wird ausschließlich
**`.toLowerCase()`** verwendet (`"ß".toLowerCase() === "ß"`, keine Expansion) —
das erfüllt Testfall 3 aus Abschnitt 3 exakt (echtes „ß" wird gefunden, nicht als
„ss" fehlinterpretiert) und vermeidet die genannte Falle von vornherein.

**`hard_break` innerhalb eines Absatzes (Design-Entscheidung, siehe Abschnitt 4.1):**
Beim Verflachen eines Textblocks zu Klartext wird ein `hard_break`-Knoten durch
genau **ein** Leerzeichen ersetzt (er belegt exakt eine Dokumentposition, ein
Leerzeichen belegt exakt ein Zeichen — Offset-Rechnung bleibt dadurch 1:1 zur
Dokumentposition, ohne Sonderfall-Buchhaltung). Das erlaubt einen Treffer über
einen manuellen Zeilenumbruch hinweg (Testfall 9, Abschnitt 3), ohne die
Absatzgrenze aufzuweichen (jeder `paragraph`/`heading`-Knoten bleibt weiterhin
eine eigene, unabhängig gescannte Einheit).

### 2.3 Leere/Whitespace-only Sucheingabe (Grenzfall 14, bewusste Entscheidung)

Sowohl eine leere Sucheingabe als auch eine Eingabe, die **ausschließlich** aus
Leerzeichen besteht, werden identisch behandelt: `findMatches` gibt sofort `[]`
zurück (Prüfung `query.text.trim()`), **keine** Hervorhebungsflut über jedes
Leerzeichen im Dokument. Das ist eine der beiden von der Anforderung explizit als
akzeptabel genannten Optionen (Abschnitt 11, Grenzfall 14) — hiermit bewusst
gewählt und dokumentiert, mit Begründung: konsistent mit dem bereits für „leere
Eingabe" verlangten Verhalten (Abschnitt 3) und vermeidet eine UX, die wie ein
Fehler aussehen könnte. Ein Suchbegriff mit **inneren** oder **flankierenden**
Leerzeichen, der nicht *ausschließlich* aus Leerzeichen besteht (z. B. `" the "`),
bleibt unverändert vollständig literal wirksam — nur das reine
Trim-auf-Leerheit-Kriterium entscheidet über „kein sinnvoller Suchbegriff".

### 2.4 Warum keine Export-Änderung nötig ist (Beweis, nicht nur Behauptung)

`WordEditor.tsx` Zeile 94–96 zeigt die einzige Stelle, an der Dokumentinhalt an
`onChange` (und damit letztlich an `exportFile`/`writer.ts`) weitergereicht wird:

```ts
if (tr.docChanged) {
  onChangeRef.current({ ...doc.content, body: newState.doc.toJSON() })
}
```

Das feuert **ausschließlich** bei `tr.docChanged`. Eine reine Suche (Query-Meta,
Navigation, aktive-Treffer-Wechsel) ändert `state.doc` nie — nur `state` (den
Plugin-eigenen Anteil davon). `newState.doc.toJSON()` enthält per ProseMirror-
Architektur ohnehin niemals Decorations (die werden ausschließlich über
`plugin.props.decorations(state)` zur Laufzeit ans `EditorView` geliefert, völlig
getrennt vom `Node`-Baum). Das erfüllt Abschnitt 6 der Anforderung
(Testfälle 1–3) **beweisbar durch Architektur**, nicht nur durch sorgfältige
Implementierung — ein Bug, der Decorations doch in `doc.toJSON()` einschleust,
wäre schlicht nicht möglich, ohne den kompletten State-Mechanismus zu umgehen.

### 2.5 Warum die aktive Fundstelle während offener Suche keine echte Selektion ist

Bewusste Entscheidung, um die Berührungsfläche mit dem bekannten Selection-Sync-
Bug (siehe `WordEditor.tsx` Zeilen 18–53, `reconcileSelectionOnClick`) auf **eine
einzige, gut testbare Stelle** zu reduzieren:

- **Während die Suchleiste offen ist:** `state.selection` wird von der
  Suchfunktion **nicht angefasst**. Die aktuelle/aktive Fundstelle lebt
  ausschließlich als `activeIndex` im Plugin-State + eigener Decoration-Klasse
  (`search-match-active`). Scrollen zur aktiven Fundstelle geschieht über einen
  direkten DOM-Zugriff (`element.scrollIntoView()`), nicht über
  `tr.scrollIntoView()` (das würde `state.selection` voraussetzen). Vorteil:
  Die Fokus-Eingabe bleibt im Sucheingabefeld (kein `view.focus()` nötig,
  während getippt/navigiert wird), es entsteht dadurch **keinerlei** Risiko,
  während einer laufenden Suchsitzung denselben Bug erneut auszulösen, weil die
  echte Selektion schlicht die ganze Zeit unangetastet bleibt.
- **Erst beim Schließen** (Escape/X) wird — exakt einmal — `state.selection` auf
  den zuletzt aktiven Treffer gesetzt und `view.focus()` aufgerufen. Das ist
  **der** in Abschnitt 5 der Anforderung als „kritischer Berührungspunkt"
  bezeichnete Moment — hier und nur hier ist ein dedizierter Regressionstest
  Pflicht (siehe Abschnitt 7.3).

---

## 3. Dateigenauer Umsetzungsplan

### 3.1 `src/formats/shared/schema.ts` — **keine Änderung**

Siehe Abschnitt 2.2/2.4. Der `highlight`-Mark (Zeilen 141–147) bleibt exakt wie
er ist; es wird kein neuer Mark/Node-Typ für Suche eingeführt.

### 3.2 Neue Datei: `src/formats/shared/editor/search.ts`

Enthält Typen, das reine Matching, das Plugin und kleine Dispatch-Helfer, die
sowohl von `SearchBar.tsx` als auch potenziell von Unit-Tests direkt genutzt
werden (Trennung von Logik und UI, analog zu `commands.ts`/`Toolbar.tsx`).

```ts
import type { Node as PMNode } from 'prosemirror-model'
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from 'prosemirror-state'
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view'

export interface SearchQuery {
  text: string
  caseSensitive: boolean
  wholeWord: boolean
}

export interface SearchMatch {
  from: number
  to: number
}

export interface SearchPluginState {
  query: SearchQuery
  matches: SearchMatch[]
  activeIndex: number // -1 wenn keine Treffer
}

export const emptySearchQuery: SearchQuery = { text: '', caseSensitive: false, wholeWord: false }

const isWordChar = (ch: string | undefined) => !!ch && /[\p{L}\p{N}_]/u.test(ch)

/**
 * Verflacht einen einzelnen Textblock-Knoten (paragraph/heading) zu Klartext.
 * `hard_break` belegt genau eine Dokumentposition und wird durch genau ein
 * Leerzeichen ersetzt, damit lokale String-Offsets 1:1 auf Dokumentpositionen
 * abbilden — siehe suchen-code.md Abschnitt 2.2 für die Begründung.
 */
function flattenTextblock(node: PMNode): string {
  let text = ''
  node.forEach((child) => {
    text += child.isText ? (child.text as string) : ' '
  })
  return text
}

/** Reine, von ProseMirror-State unabhängige Trefferberechnung — direkt unit-testbar. */
export function findMatches(doc: PMNode, query: SearchQuery): SearchMatch[] {
  const needle = query.text.trim() ? query.text : ''
  if (!needle) return []
  const foldedNeedle = query.caseSensitive ? needle : needle.toLowerCase()
  const matches: SearchMatch[] = []

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    const text = flattenTextblock(node)
    const haystack = query.caseSensitive ? text : text.toLowerCase()
    let searchFrom = 0
    for (;;) {
      const idx = haystack.indexOf(foldedNeedle, searchFrom)
      if (idx === -1) break
      const before = text[idx - 1]
      const after = text[idx + needle.length]
      if (!query.wholeWord || (!isWordChar(before) && !isWordChar(after))) {
        matches.push({ from: pos + 1 + idx, to: pos + 1 + idx + needle.length })
      }
      searchFrom = idx + needle.length
    }
    return false // Inline-Inhalt eines Textblocks nicht weiter durchsteigen
  })

  return matches
}

function reconcileActiveIndex(
  prevMatches: SearchMatch[],
  prevActiveIndex: number,
  mapping: Transaction['mapping'],
  nextMatches: SearchMatch[],
): number {
  if (nextMatches.length === 0) return -1
  const prevActive = prevMatches[prevActiveIndex]
  if (!prevActive) return 0
  const mappedFrom = mapping.map(prevActive.from, -1)
  const idx = nextMatches.findIndex((m) => m.to > mappedFrom)
  return idx === -1 ? nextMatches.length - 1 : idx
}

export const searchPluginKey = new PluginKey<SearchPluginState>('search')

export function createSearchPlugin(): Plugin {
  return new Plugin({
    key: searchPluginKey,
    state: {
      init: () => ({ query: emptySearchQuery, matches: [], activeIndex: -1 }),
      apply(tr, prev) {
        const meta = tr.getMeta(searchPluginKey) as Partial<SearchPluginState> | undefined
        let { query, matches, activeIndex } = prev
        const queryChanged = meta?.query !== undefined
        if (meta?.query !== undefined) query = meta.query
        if (tr.docChanged || queryChanged) {
          const nextMatches = findMatches(tr.doc, query)
          activeIndex = queryChanged
            ? nextMatches.length
              ? 0
              : -1
            : reconcileActiveIndex(matches, activeIndex, tr.mapping, nextMatches)
          matches = nextMatches
        }
        if (meta?.activeIndex !== undefined) activeIndex = meta.activeIndex
        return { query, matches, activeIndex }
      },
    },
    props: {
      decorations(state) {
        const s = searchPluginKey.getState(state)
        if (!s || s.matches.length === 0) return DecorationSet.empty
        const decos = s.matches.map((m, i) =>
          Decoration.inline(m.from, m.to, {
            class: i === s.activeIndex ? 'search-match search-match-active' : 'search-match',
          }),
        )
        return DecorationSet.create(state.doc, decos)
      },
    },
  })
}

export function getSearchState(state: EditorState): SearchPluginState {
  return searchPluginKey.getState(state) ?? { query: emptySearchQuery, matches: [], activeIndex: -1 }
}

export function setSearchQuery(view: EditorView, query: SearchQuery) {
  view.dispatch(view.state.tr.setMeta(searchPluginKey, { query }))
}

export function stepSearch(view: EditorView, direction: 1 | -1) {
  const s = getSearchState(view.state)
  if (s.matches.length === 0) return
  const activeIndex = (s.activeIndex + direction + s.matches.length) % s.matches.length
  view.dispatch(view.state.tr.setMeta(searchPluginKey, { activeIndex }))
}

/**
 * Schließt die Suche: Decorations verschwinden spurlos (Query zurückgesetzt),
 * und — einziger Berührungspunkt mit der echten ProseMirror-Selektion,
 * siehe suchen-code.md Abschnitt 2.5 — der Cursor wird auf den zuletzt aktiven
 * Treffer gesetzt, bevor der Fokus zurück in den Editor wandert.
 */
export function closeSearch(view: EditorView) {
  const s = getSearchState(view.state)
  const active = s.activeIndex >= 0 ? s.matches[s.activeIndex] : null
  let tr = view.state.tr.setMeta(searchPluginKey, { query: emptySearchQuery })
  if (active) tr = tr.setSelection(TextSelection.create(tr.doc, active.from, active.to))
  view.dispatch(tr)
  view.focus()
}
```

### 3.3 Neue Datei: `src/formats/shared/editor/SearchBar.tsx`

React-Komponente, folgt demselben Muster wie `Toolbar.tsx` (liest `view.state`
direkt, keine eigene Zustandskopie des Dokuments). Zuständig für: Eingabefeld
(mit Debounce 200 ms, siehe Abschnitt 3 der Anforderung — „darf sich nicht wie
eine spürbare Verzögerung anfühlen"), Groß-/Klein- und Ganzes-Wort-Toggle,
Trefferzähler „x von y"/„Keine Treffer"/kein Text, Navigation, Schließen-Button,
sowie den Ersetzen-Umschalter samt zweitem Eingabefeld (Abschnitt 9 der
Anforderung).

Kernpunkte der Implementierung (Skizze, kein vollständiger Code):

```tsx
interface SearchBarProps {
  view: EditorView
  openToken: number          // erhöht sich bei jedem Öffnen/Re-Fokussieren
  prefill: string | null     // nicht-null nur beim *ersten* Öffnen aus geschlossenem Zustand
  onClose: () => void
}

export function SearchBar({ view, openToken, prefill, onClose }: SearchBarProps) {
  const [text, setText] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [mode, setMode] = useState<'search' | 'replace'>('search')
  const [replacement, setReplacement] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (prefill !== null) setText(prefill)
    inputRef.current?.focus()
    inputRef.current?.select()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openToken])

  // Live-Suche mit Debounce (Abschnitt 3 der Anforderung: 150–250 ms erlaubt).
  useEffect(() => {
    const id = setTimeout(() => {
      setSearchQuery(view, { text, caseSensitive, wholeWord })
    }, 200)
    return () => clearTimeout(id)
  }, [view, text, caseSensitive, wholeWord])

  const { matches, activeIndex } = getSearchState(view.state)

  // Aktiven Treffer nach jeder Navigation/Neuberechnung ins Bild scrollen —
  // direkter DOM-Zugriff statt tr.scrollIntoView(), siehe Abschnitt 2.5: die
  // echte state.selection bleibt während der Suche unangetastet, daher ist
  // ProseMirrors eigener scrollIntoView-Mechanismus hier nicht anwendbar.
  useEffect(() => {
    if (activeIndex < 0) return
    const dom = view.dom.querySelector('.search-match-active')
    dom?.scrollIntoView({ block: 'center' })
  }, [view, activeIndex, matches.length])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); closeSearch(view); onClose() }
    else if (e.key === 'Enter') { e.preventDefault(); stepSearch(view, e.shiftKey ? -1 : 1) }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault() } // bereits offen, nur Fokus halten
  }

  // … Rendering: Input, Zähler ("{activeIndex + 1} von {matches.length}" bzw.
  // "Keine Treffer" bei text !== '' && matches.length === 0, sonst kein Zähler),
  // Vor/Zurück-Buttons, Checkboxen, Schließen-Button, Modus-Umschalter,
  // Ersetzen-Feld + "Ersetzen"/"Alle ersetzen"-Buttons (siehe Abschnitt 4).
}
```

Wichtige Detailentscheidungen, die hier festgelegt werden (nicht der freien
späteren Implementierung überlassen):

- Der Zähler unterscheidet **drei** Zustände, nicht zwei: (a) `text === ''` →
  kein Zähler/„–" (Abschnitt 3 der Anforderung: „kein 0 von 0, das nach einem
  Fehler aussieht"), (b) `text !== ''` und `matches.length === 0` → „Keine
  Treffer", (c) sonst „{activeIndex + 1} von {matches.length}".
- Das Eingabefeld bekommt bei „Keine Treffer" **keine** Fehler-/Rot-Färbung
  (Abschnitt 3 der Anforderung) — nur der Zählertext ändert sich.
- „Bereits offen + erneut Strg+F" (Grenzfall Abschnitt 2 der Anforderung): das
  öffnende `WordEditor.tsx` erhöht `openToken` bei **jedem** Öffnen-Trigger,
  setzt `prefill` aber nur bei einem tatsächlichen Zustandswechsel
  geschlossen→offen (siehe 3.6) — der `useEffect` mit `[openToken]` fokussiert
  in beiden Fällen, überschreibt den Text aber nur, wenn `prefill !== null`.

### 3.4 `src/formats/shared/editor/commands.ts` — ergänzt (nur für Abschnitt 9)

Für reines „Suchen" (Abschnitt 1–8) ist **keine** Änderung an `commands.ts`
nötig — die Navigations-/Query-Helfer liegen bewusst in `search.ts` (Abschnitt
3.2), da sie eng an `SearchPluginState` gekoppelt sind, nicht an das generische
`Command`-Muster dieser Datei.

Für die Erweiterung „Suchen & Ersetzen" (Abschnitt 9) werden ergänzt:

```ts
import type { Mark } from 'prosemirror-model'
import type { SearchMatch } from './search'

/**
 * Marks des Zeichens am Beginn eines Treffers — eine Ersetzung übernimmt damit
 * die Formatierung der Stelle, an der sie beginnt, auch wenn der neue Text
 * länger ist als der alte (Anforderung Abschnitt 9, Grenzfall "länger als das
 * Original").
 */
function marksAtMatchStart(doc: EditorState['doc'], pos: number): readonly Mark[] {
  let marks: readonly Mark[] = []
  doc.nodesBetween(pos, Math.min(pos + 1, doc.content.size), (node) => {
    if (node.isText && marks.length === 0) marks = node.marks
  })
  return marks
}

function replaceRange(tr: Transaction, from: number, to: number, replacement: string): Transaction {
  if (!replacement) return tr.delete(from, to) // leeres "Ersetzen durch" = Löschen (Grenzfall, gültig)
  const marks = marksAtMatchStart(tr.doc, from)
  return tr.replaceWith(from, to, wordSchema.text(replacement, marks))
}

/** Ersetzt genau den übergebenen (aktiven) Treffer — ein Undo-Schritt. */
export function replaceActiveMatch(match: SearchMatch, replacement: string): Command {
  return (state, dispatch) => {
    if (dispatch) dispatch(replaceRange(state.tr, match.from, match.to, replacement))
    return true
  }
}

/**
 * Ersetzt alle übergebenen Treffer in einer einzigen Transaktion (= ein
 * Undo-Schritt). Verarbeitung von hinten nach vorne: da alle `from`/`to` einmalig
 * aus dem *unveränderten* Dokument stammen und nie neu gescannt werden, bleiben
 * die Koordinaten aller noch nicht verarbeiteten (weiter vorne liegenden)
 * Treffer während der ganzen Schleife gültig — kein Positions-Mapping zwischen
 * den Schritten nötig. Das macht die Operation außerdem beweisbar
 * schleifensicher: ein Ersetzungstext, der den Suchbegriff selbst enthält (z. B.
 * "Katze" -> "Katzenbaby"), kann innerhalb dieses einen Aufrufs nie erneut
 * gefunden/ersetzt werden, weil `matches` schon vor dem ersten Ersetzen
 * feststeht (Anforderung Abschnitt 9, Grenzfall/Testfall 8).
 */
export function replaceAllMatches(matches: SearchMatch[], replacement: string): Command {
  return (state, dispatch) => {
    if (matches.length === 0) return false
    if (dispatch) {
      let tr = state.tr
      for (let i = matches.length - 1; i >= 0; i--) {
        tr = replaceRange(tr, matches[i].from, matches[i].to, replacement)
      }
      dispatch(tr)
    }
    return true
  }
}
```

**Bewusst kein Sonderfall für „Ersetzungstext enthält Suchbegriff":** Nach „Alle
ersetzen" berechnet `search.ts`s `apply` (Abschnitt 3.2) die Trefferliste anhand
des **unveränderten** `query` gegen das **neue** Dokument neu (normaler
`tr.docChanged`-Pfad, keine Sonderlogik). Enthält der Ersetzungstext den
Suchbegriff zufällig als Teilstring (z. B. „Katzenbaby" enthält „katze"), zeigt
der Zähler danach also korrekt diese **neuen, echten** Fundstellen an — das ist
literales Suchverhalten, kein Bug. Anforderung Abschnitt 9 verlangt für diesen
Fall explizit nur „keine Endlosschleife" und „jeder ursprüngliche Treffer wird
genau einmal ersetzt" (beides durch das Vorne-weg-Snapshot-Prinzip oben erfüllt)
— **nicht**, dass der Zähler hinterher zwingend „Keine Treffer" zeigt. Diese
Unterscheidung ist hier bewusst festgehalten, damit sie später nicht
fälschlich als Bug „repariert" wird.

### 3.5 `src/formats/shared/editor/Toolbar.tsx` — geändert

Neue Props auf `ToolbarProps` (aktuell nur `{ view: EditorView }`, Zeile 19–21):

```tsx
interface ToolbarProps {
  view: EditorView
  searchOpen: boolean
  onToggleSearch: () => void
}
```

Neuer Button, eigene Gruppe am Ende der Toolbar (nach der Bild-Gruppe, Zeile
241–244), **mit `onClick`** (nicht nur `onMouseDown` wie das bestehende
`MarkButton`-Muster in Zeilen 44–61 — dieses bekannte Tastatur-Zugänglichkeits-
Problem, siehe `fett-code.md` Abschnitt 2.1, wird für den neuen Button von Anfang
an vermieden statt geerbt):

```tsx
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  )
}
```

(Material-Icons „search"-Glyph, Apache-2.0, gleiche Quelle/Begründung wie
`BoldIcon` in `fett-code.md` Abschnitt 4.2 — eingebettetes SVG statt Unicode/
Emoji, siehe Anforderung Abschnitt 2, Zeile 1 und das dort referenzierte
Icon-Rendering-Risiko aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1.)

```tsx
<button
  type="button"
  title="Suchen (Strg+F)"
  aria-label="Suchen"
  aria-pressed={searchOpen}
  onClick={() => onToggleSearch()}
  className={/* gleiches Muster wie AlignButton/MarkButton aktiv/inaktiv */}
>
  <SearchIcon />
</button>
```

### 3.6 `src/formats/shared/editor/WordEditor.tsx` — geändert

1. **Plugin-Registrierung** (Zeile 85, direkt neben `createPaginationPlugin()`):
   ```ts
   plugins: [
     history(),
     keymap({ /* … bestehende Bindings …, */ 'Mod-f': openSearchCommand, Escape: escapeSearchCommand }),
     keymap(baseKeymap),
     columnResizing(),
     tableEditing(),
     dropCursor(),
     gapCursor(),
     createPaginationPlugin(),
     createSearchPlugin(),
   ],
   ```
   `createSearchPlugin()` wird **einmalig** beim `EditorState.create`-Aufruf in
   dem bestehenden, nur einmal laufenden `useEffect` (Zeile 62–114, leeres
   Dependency-Array) registriert — dieselbe Garantie, die heute schon
   `createPaginationPlugin()` vor doppelter Registrierung schützt. Das erfüllt
   Grenzfall 13 der Anforderung („kein doppelt registriertes Plugin bei
   mehrfachem Strg+F/Escape") strukturell: Öffnen/Schließen der Suchleiste
   schaltet ausschließlich React-UI-Sichtbarkeit + den `query`-Anteil des
   Plugin-States um, niemals die Plugin-Liste selbst.
2. **Neuer lokaler State:**
   ```ts
   const [searchOpen, setSearchOpen] = useState(false)
   const [openToken, setOpenToken] = useState(0)
   const [prefill, setPrefill] = useState<string | null>(null)
   ```
3. **Öffnen-Funktion** (aufgerufen sowohl vom Toolbar-Button als auch vom
   `Mod-f`-Keymap-Eintrag — via `useRef`, gleiches Muster wie `onChangeRef`
   Zeile 58–59, da eine `Command`-Funktion für die Keymap keine Closure über
   React-State-Setter direkt halten kann, ohne bei jedem Re-Render neu gebaut
   zu werden):
   ```ts
   const openSearch = useCallback(() => {
     const view = viewRef.current
     if (!view) return
     if (!searchOpen) {
       const { from, to, empty } = view.state.selection
       setPrefill(empty ? '' : view.state.doc.textBetween(from, to, ' '))
       setSearchOpen(true)
     } else {
       setPrefill(null) // bereits offen: Text/Trefferliste bleiben erhalten, nur Fokus wechselt
     }
     setOpenToken((t) => t + 1)
   }, [searchOpen])
   ```
4. **`Mod-f`-Keymap-Eintrag** ruft `openSearchRef.current()` auf und gibt immer
   `true` zurück (unterdrückt damit zuverlässig die native Browser-Suche via
   `prosemirror-keymap`s automatischem `preventDefault()` bei `true` —
   dokumentiertes Verhalten, bereits identisch für `Mod-b` genutzt, siehe
   `fett-code.md` Abschnitt 4.3). Das deckt Anforderung Abschnitt 2, Zeile 2
   vollständig ab, **solange der Editor fokussiert ist** — exakt der in der
   Anforderung genannte Geltungsbereich.
5. **Zusätzlicher `Escape`-Keymap-Eintrag** (im Editor-Keymap, nicht nur im
   Sucheingabefeld) schließt die Suche auch dann, wenn der Fokus gerade wieder
   im Haupttext liegt (z. B. weil während offener Suche weitergetippt wurde,
   siehe Abschnitt 7 der Anforderung) — ruft `closeSearch(view)` +
   `setSearchOpen(false)` auf, gibt `true` nur zurück, wenn `searchOpen` aktuell
   `true` ist (sonst `false`, damit Escape ohne offene Suche weiterhin keine
   Wirkung hat/an andere Plugins durchgereicht wird).
6. **Rendering** — neue Zeile zwischen Toolbar und Seitenbereich:
   ```tsx
   {viewRef.current && (
     <Toolbar view={viewRef.current} searchOpen={searchOpen} onToggleSearch={openSearch} />
   )}
   {viewRef.current && searchOpen && (
     <SearchBar
       view={viewRef.current}
       openToken={openToken}
       prefill={prefill}
       onClose={() => setSearchOpen(false)}
     />
   )}
   <div className="flex-1 overflow-auto …"> … </div>
   ```
   Eigene Zeile statt Overlay — vermeidet jede Kollision mit dem
   Paginierungs-Hintergrundmuster (`pageBackgroundStyle()`) und mit der
   ohnehin schon einzigen scrollbaren Fläche (Zeile 119), siehe Abschnitt 2.5
   zur Begründung, warum kein Overlay-Fokus-Trick nötig ist.

### 3.7 `src/index.css` — geändert

Neue Regeln, nach dem bestehenden `.page-break-spacer`-Block (Zeile 69–71),
gleiches Muster (plain CSS statt Tailwind-Utility-Strings, da die Klassen zur
Laufzeit dynamisch von `Decoration.inline` erzeugt werden, nicht statisch im
JSX-Quelltext stehen und daher von Tailwinds Content-Scanner ohnehin nicht
gefunden würden):

```css
.search-match {
  background-color: rgba(250, 204, 21, 0.45); /* halbtransparent: darunterliegende
    Zeichenformatierung/Textmarker bleibt sichtbar, siehe Anforderung Abschnitt 4 */
  border-radius: 2px;
}

.search-match-active {
  background-color: rgba(249, 115, 22, 0.55);
  outline: 2px solid #ea580c;
  font-weight: 600; /* zusätzliches, nicht nur farbliches Unterscheidungsmerkmal
    für Farbfehlsichtige, siehe Anforderung Abschnitt 4 */
}

@media (prefers-color-scheme: dark) {
  .search-match {
    background-color: rgba(250, 204, 21, 0.35);
  }
  .search-match-active {
    background-color: rgba(249, 115, 22, 0.45);
    outline-color: #fb923c;
  }
}
```

Transparenz (statt deckender Hintergrundfarbe) ist hier der Mechanismus, der
Anforderung Abschnitt 4 („darf bestehende Formatierung/Textmarker nicht
verdecken") erfüllt — unabhängig davon, ob der vom `EditorView` erzeugte
Decoration-`<span>` innerhalb oder außerhalb des vom `highlight`-Mark erzeugten
`<span style="background-color:…">` landet, mischen sich beide Hintergrundfarben
optisch sichtbar (Alpha-Blending), in keinem Fall verdeckt eine die andere
vollständig.

### 3.8 `src/formats/docx/{reader,writer}.ts`, `src/formats/odt/{reader,writer}.ts` — **keine Änderung**

Siehe Abschnitt 0, Punkt 3 und Abschnitt 2.4. Weder reine Suche noch „Suchen &
Ersetzen" benötigen Codeänderungen hier — Ersetzen erzeugt nur gewöhnlichen,
bereits unterstützten Dokumentinhalt (Text + vorhandene Marks über
`wordSchema.text(replacement, marks)`, Abschnitt 3.4). Was hier tatsächlich noch
fehlt, ist **Testabdeckung**, kein Produktionscode — siehe Abschnitt 7.

---

## 4. Zuordnung: Abschnitt 9 der Anforderung (Suchen & Ersetzen) im Detail

| Anforderung (Abschnitt 9) | Umsetzung |
|---|---|
| Zweites Feld „Ersetzen durch", nur im Ersetzen-Modus | `SearchBar.tsx`, `mode` State (Abschnitt 3.3) |
| „Ersetzen" (einzeln), springt danach zum nächsten Treffer | `replaceActiveMatch` (Abschnitt 3.4) dispatcht eine `docChanged`-Transaktion; `search.ts`s `apply` (Abschnitt 3.2) berechnet `matches`/`activeIndex` daraufhin automatisch neu über den ohnehin vorhandenen `reconcileActiveIndex`-Pfad — **keine eigene Sonderlogik nötig**, derselbe Mechanismus wie bei einer Bearbeitung während offener Suche (Abschnitt 7 der Anforderung) |
| „Alle ersetzen" | `replaceAllMatches` (Abschnitt 3.4), eine Transaktion, ein Undo-Schritt |
| Formatierung der Ersetzungsposition übernehmen, auch bei längerem Text | `marksAtMatchStart` + `wordSchema.text(replacement, marks)` (Abschnitt 3.4) |
| Genau ein Undo-Schritt je Aktion | Beide Commands dispatchen genau **eine** Transaktion — `prosemirror-history` (bereits registriert, `WordEditor.tsx` Zeile 70, keine Änderung nötig) erzeugt pro dispatchter Transaktion genau einen History-Eintrag |
| „Ersetzen durch" leer → Löschen | `replaceRange`: `if (!replacement) return tr.delete(from, to)` (Abschnitt 3.4) |
| Rundreise DOCX/ODT, auch Cross-Format | Keine Reader/Writer-Änderung nötig (Abschnitt 3.8) — neue Tests in Abschnitt 7.4/7.5 |
| Kein Endlosschleifen-Risiko bei „Katze"→„Katzenbaby" | Vorne-weg-Snapshot-Prinzip, siehe Abschnitt 3.4 Kommentar |

---

## 5. Abschnitt 8 der Anforderung (Kopf-/Fußzeile) — Scope-Einschränkung, explizit dokumentiert

Wie in Abschnitt 0/1 belegt, existiert aktuell **kein** editierbarer Kopf-/
Fußzeilenbereich (`kopfzeile-bearbeiten`/`fusszeile-bearbeiten` sind laut
`FEATURE-BACKLOG.md` weiterhin „fehlt"). Konsequenzen für diesen Plan:

- `findMatches` wird bewusst als **reine Funktion über einen einzelnen
  `PMNode`** entworfen (Abschnitt 3.2), nicht fest an „das eine `body`-Dokument"
  gekoppelt — sobald ein zweiter `EditorView` für Kopf-/Fußzeile existiert, kann
  derselbe `createSearchPlugin()` unverändert dort mitregistriert werden. Das ist
  die in der Anforderung Abschnitt 3.7 von `kopfzeile-bearbeiten-req.md`
  geforderte „Architektur darf ein späteres Nachrüsten nicht verbauen" —
  sinngemäß hier für Suche übernommen.
- Testfall 3 aus Abschnitt 8 der Anforderung („Suchbegriff nur in der Fußzeile
  vorhanden") ist **aktuell nicht durchführbar** und wird im Testplan
  (Abschnitt 7.2) als **explizit zurückgestellt, nicht als fehlgeschlagen**
  markiert — mit Verweis auf diesen Abschnitt. Sobald `kopfzeile-bearbeiten`
  bzw. `fusszeile-bearbeiten` umgesetzt sind, ist dieser Testfall inklusive einer
  dedizierten Cross-View-Navigationsreihenfolge („Kopfzeile → Haupttext →
  Fußzeile") nachzuholen — Backlog-Vermerk für diesen Zeitpunkt.
- Testfall 1/2/4 aus Abschnitt 8 (Tabellenzellen, Listen) sind **heute bereits**
  vollständig umsetzbar und Teil des Mindestumfangs dieses Plans (siehe
  Abschnitt 2.2 — funktioniert automatisch durch die Baum-Traversal-Struktur).

---

## 6. Grenzfälle aus Abschnitt 11 der Anforderung — Zuordnung zur geplanten Lösung

| # | Grenzfall | Geplante Lösung |
|---|---|---|
| 1 | Leere Sucheingabe | `findMatches` early-return `[]` (Abschnitt 2.3) |
| 2 | Kein Treffer | Zähler-Logik in `SearchBar.tsx` (Abschnitt 3.3) |
| 3 | Regex-Metazeichen literal | `indexOf`-basiertes Matching, nie `new RegExp(userInput)` (Abschnitt 2.2) |
| 4 | Formatierungsgrenze im Absatz = ein Treffer | Klartext-Verflachung pro Textblock (Abschnitt 2.2) |
| 5 | Absatzgrenze = kein Treffer | Jeder Textblock unabhängig gescannt (Abschnitt 2.2) |
| 6 | Selection-Sync-Regressionstest beim Schließen | `closeSearch()` (Abschnitt 2.5/3.2) + neuer Test (Abschnitt 7.3) |
| 7 | Dokumentänderung während offener Suche | `apply`-Zweig `tr.docChanged` (Abschnitt 3.2) |
| 8 | Tabellen-/Listengrenzen | `doc.descendants`-Reihenfolge (Abschnitt 2.2) |
| 9 | Export/Re-Import während/nach Suche | Architektur-Garantie, kein Code nötig (Abschnitt 2.4) |
| 10 | Großes Dokument, häufiger Suchbegriff | Debounce 200 ms in `SearchBar.tsx` (Abschnitt 3.3); `findMatches` ist ein einzelner linearer Scan, kein verschachteltes Re-Scanning |
| 11 | Suche direkt nach Import | Plugin-Init liefert leeren Zustand unabhängig vom geladenen Dokument (Abschnitt 3.2, `init`) |
| 12 | Suche direkt nach „Neues Dokument" | Gleicher Pfad, `doc` mit einem leeren Absatz → `findMatches` liefert `[]`, kein Sonderfall nötig |
| 13 | Mehrfaches schnelles Öffnen/Schließen | Plugin einmalig registriert, nur UI-Sichtbarkeit + Query wechseln (Abschnitt 3.6, Punkt 1) |
| 14 | Nur-Leerzeichen-Suchbegriff | Bewusst wie leere Eingabe behandelt, dokumentiert (Abschnitt 2.3) |

---

## 7. Testplan

### 7.1 Neue Datei: `src/formats/shared/editor/__tests__/search.test.ts` (Vitest)

Reiner Unit-Test von `findMatches`/`reconcileActiveIndex`-Logik gegen manuell
gebaute `wordSchema`-Dokumente (kein `EditorView` nötig für diese Ebene):

1. Einfacher Treffer, groß/klein-insensitiv per Default.
2. `caseSensitive: true` reduziert Trefferzahl korrekt bei gemischter Schreibung.
3. „ß"/„ä"/„é" werden korrekt gefunden (auch bei `caseSensitive: false` — Beweis,
   dass keine `.toUpperCase()`-Falle vorliegt, siehe Abschnitt 2.2).
4. `a.b*c` literal gefunden in `"a.b*c"`, **nicht** gefunden in `"aXbYYYc"`.
5. Leerer Query → `[]`, kein Fehler.
6. Treffer über zwei Marks (fett/normal) im selben Absatz → genau 1 Eintrag in
   `matches`.
7. Treffer über zwei separate `paragraph`-Knoten → 0 Treffer (nicht
   zusammengezogen).
8. Treffer über einen `hard_break` im selben Absatz → gefunden (Design aus
   Abschnitt 2.2 direkt verifiziert).
9. `wholeWord: true` — „Wort" in „Wortschatz" nicht getroffen, „Wort" isoliert
   schon.
10. Tabellen-Dokument (`table_row` × `table_cell`), Treffer in nicht
    benachbarten Zellen → Reihenfolge in `matches[]` entspricht Zeile-für-Zeile,
    links-nach-rechts.
11. `reconcileActiveIndex`: aktiver Treffer wird gelöscht → nächster
    verbleibender Treffer wird aktiv, nicht `-1`, solange noch Treffer
    existieren; werden alle gelöscht → `-1`.
12. Nur-Leerzeichen-Query → `[]` (Grenzfall 14).

### 7.2 Neue Datei: `tests/e2e/search.spec.ts` (Playwright)

Deckt Anforderung Abschnitt 13 („echte Browser-Interaktion, kein isolierter
Command-Aufruf") — für **beide** Karten (DOCX **und** ODT, parametrisiert oder
dupliziert nach dem Muster von `docx.spec.ts`/`odt.spec.ts`):

1. Strg+F öffnet die Suchleiste, Eingabefeld hat sofort den Fokus.
2. Toolbar-Button „Suchen" öffnet dieselbe Suchleiste (Abnahme 1 der
   Anforderung, Abschnitt 15).
3. Tippen ohne Klick auf einen Such-Button → Hervorhebung erscheint
   (`.search-match`-Locator-Count).
4. Text vor dem Öffnen markiert (Doppelklick auf Wort) → Suchfeld ist damit
   vorbelegt (Bedienelement 3 der Anforderung).
5. Groß-/Klein-Toggle ändert Trefferzahl bei gemischter Schreibung im Dokument.
6. „Keine Treffer"-Anzeige bei Suchbegriff ohne Fund, kein Absturz, keine
   Konsolen-Exception (`page.on('console', …)`/`page.on('pageerror', …)`
   Assertion).
7. Nächster/Vorheriger mit Wrap-Around an beiden Enden (Pfeiltasten **und**
   Enter/Umschalt+Enter).
8. Aktiver Treffer hat zusätzliche CSS-Klasse `search-match-active`
   (DOM-Klassenprüfung statt Screenshot, robuster gegen Theming).
9. Mehrseitiges Dokument (genug Absätze, um `createPaginationPlugin()` eine
   zweite Seite erzeugen zu lassen — vgl. `pagination.test.ts`-Fixture-Größen),
   Treffer auf „Seite 2" aktivieren → Scrollposition des Editor-Containers
   ändert sich sichtbar.
10. Treffer in Text, der bereits einen `highlight`-Mark trägt (Toolbar:
    Hervorhebungsfarbe setzen, dann suchen) → beide Hervorhebungen im DOM
    gleichzeitig vorhanden (`getComputedStyle`-Check auf Hintergrundfarbe
    ungleich reinem Suchgelb, plus `.search-match`-Klasse vorhanden).
11. **Pflicht-Regressionstest (Abschnitt 7.3 unten, hier referenziert).**
12. Bearbeitung während offener Suche: Treffer per Backspace löschen → Zähler
    reduziert sich live, kein Crash (Abschnitt 7 der Anforderung).
13. Neuer Text während offener Suche erzeugt neuen Treffer → Zähler erhöht sich
    live.
14. Mehrfaches schnelles Strg+F/Escape (z. B. 10× in Schleife) → am Ende
    normaler Zustand, keine wachsende `.search-match`-Anzahl bei identischer
    Suche (Grenzfall 13).
15. Suche unmittelbar nach Datei-Upload, ohne vorherigen Klick in den Editor
    (Grenzfall 11).
16. Suche unmittelbar nach „Neues Dokument" (Grenzfall 12).

### 7.3 Pflicht-Regressionstest: Selection-Sync beim Schließen der Suche

Neuer Test **innerhalb** `tests/e2e/search.spec.ts` (nicht in
`selection-regression.spec.ts` selbst, da dort ausschließlich die
Toolbar-Klick-Sequenz getestet wird — aber im selben Geist und mit Verweis
darauf, analog zur Vorgabe aus `suchen-req.md` Abschnitt 11, Grenzfall 6):

```ts
test('closing search places a real selection at the last active match, ready to type', async ({ page }) => {
  // Dokument mit bekanntem Text erstellen, Strg+F, nach einem mittleren Wort suchen,
  // zum Treffer navigieren, Escape drücken, sofort tippen …
  // … erwartet: neuer Text erscheint exakt an der Fundstelle, nicht am Dokumentanfang/
  // -ende und ersetzt nicht den gesamten Inhalt (Anforderung Abschnitt 5, Testfall 5).
})
```

Muss dauerhaft Teil der Suite bleiben (Anforderung Abschnitt 11, Grenzfall 6 und
Abschnitt 15, Punkt 5).

### 7.4 `src/formats/docx/__tests__/roundtrip.test.ts` — ergänzt

Neuer Testblock „search & replace produces normal, round-trippable content":

- Baut über `EditorState.create` + `createSearchPlugin()` + `findMatches` +
  `replaceAllMatches` (Abschnitt 3.4) einen echten Ersetzungs-Durchlauf gegen
  ein Dokument mit Zeichenformatierung + Liste + Tabelle (statt wie die
  bestehenden Tests direkt Ersetzungs-JSON von Hand zu schreiben) — testet damit
  den **echten Produktionscode-Pfad** von `commands.ts`, nicht nur Reader/
  Writer isoliert.
- `writeDocx(resultDoc)` → `readDocx(...)` → Ersetzter Text an richtiger Stelle,
  übernommene Formatierung, unveränderte übrige Teile (Anforderung Abschnitt 9,
  Testfälle 6, Abschnitt 12, Testfall 3).
- Kontrolltest: Suchsitzung **ohne** Ersetzen (nur `findMatches` aufrufen, keine
  Transaktion dispatchen) → exportiertes Dokument ist byteidentisch im Inhalt
  zu einer Kontrollexport ohne jede Suche (Anforderung Abschnitt 12, Testfall 1).

### 7.5 `src/formats/odt/__tests__/roundtrip.test.ts` — ergänzt

Spiegelbildlich zu 7.4, für ODT (Anforderung Abschnitt 12, Testfall 2 und
Abschnitt 9, Testfall 7).

### 7.6 E2E-Rundreise (Anforderung Abschnitt 12, vollständig)

Erweiterung von `tests/e2e/docx.spec.ts`/`tests/e2e/odt.spec.ts` **oder** neue
Datei `tests/e2e/search-roundtrip.spec.ts` (letzteres empfohlen, um die
bestehenden, thematisch fokussierten Dateien nicht zu überladen):

1. Reale Testdatei mit Formatierung/Liste/Tabelle hochladen (DOCX) → Suchsitzung
   ohne Ersetzen (öffnen, tippen, navigieren, Groß-/Klein-Toggle, schließen) →
   Export → Re-Import → Inhalt entspricht dem Original.
2. Dasselbe für ODT.
3. DOCX hochladen → Suchen & Ersetzen an mehreren Stellen inkl. einer
   Tabellenzelle → Export DOCX → Re-Import → korrekt.
4. Dasselbe für ODT.
5. ODT → Suchen & Ersetzen → Export als DOCX (Cross-Format) → Re-Import →
   korrekt.
6. DOCX → Suchen & Ersetzen → Export als ODT (Cross-Format) → Re-Import →
   korrekt.

---

## 8. Zuordnung zu den Abnahmekriterien (Abschnitt 15 der Anforderung)

| DoD-Punkt | Abdeckung durch diesen Plan |
|---|---|
| 1. Strg+F **und** Toolbar-Button, dieselbe Suchleiste | Abschnitt 3.5/3.6, Test 7.2 Punkte 1–2 |
| 2. Live-Suche, Literal-Matching, Groß-/Klein-Toggle, Zähler | Abschnitt 2.2/2.3/3.2/3.3, Test 7.1/7.2 |
| 3. Alle Treffer markiert, aktiver Treffer unterscheidbar, Navigation mit Wrap-Around | Abschnitt 3.2 (`reconcileActiveIndex`, `stepSearch`), 3.7 (CSS), Test 7.2 Punkte 7–8 |
| 4. Flüchtige Decoration, kein Undo-/Export-Einfluss | Abschnitt 2.4 (Architektur-Beweis), Test 7.4/7.5 |
| 5. Selection-Sync-Regressionstest beim Schließen | Abschnitt 2.5/3.2 (`closeSearch`), Test 7.3 |
| 6. Rundreise DOCX **und** ODT (reine Suche) | Abschnitt 3.8, Test 7.6 Punkte 1–2 |
| 7. Alle Grenzfälle aus Abschnitt 11 einzeln getestet | Abschnitt 6 (Zuordnungstabelle), Test 7.1/7.2 |
| 8. Suchen & Ersetzen inkl. eigener Rundreise | Abschnitt 3.4/4, Test 7.4/7.5/7.6 Punkte 3–6 |

**Zusätzlich, über die Anforderung hinaus dokumentiert:** Abschnitt 8, Testfall 3
(Kopf-/Fußzeile) bleibt bis zur Umsetzung von `kopfzeile-bearbeiten`/
`fusszeile-bearbeiten` explizit **zurückgestellt**, siehe Abschnitt 5 — das darf
den Backlog-Status von `suchen` selbst nicht blockieren, da es sich um eine
Abhängigkeit zu einem anderen, laut Backlog ebenfalls „fehlt"-Feature handelt,
nicht um eine Lücke in dieser Umsetzung.

---

## 9. Reihenfolge der Umsetzung (Vorschlag)

1. `search.ts` (Abschnitt 3.2) + `search.test.ts` (Abschnitt 7.1) — reine Logik
   zuerst, unabhängig von UI/Editor-Integration, schnellste Feedback-Schleife.
2. `WordEditor.tsx`-Plugin-Registrierung (Abschnitt 3.6, Punkt 1) ohne UI —
   verifiziert, dass Decorations im laufenden Editor erscheinen (manuell via
   Dev-Tools-Dispatch), bevor die UI entsteht.
3. `SearchBar.tsx` (Abschnitt 3.3) + `Toolbar.tsx`-Button (Abschnitt 3.5) +
   restliche `WordEditor.tsx`-Verdrahtung (Abschnitt 3.6, Punkte 2–6) +
   `index.css` (Abschnitt 3.7) — sichtbares Feature für reines „Suchen".
4. `tests/e2e/search.spec.ts` Grundfunktionen (Abschnitt 7.2, Punkte 1–10,
   12–16) + Pflicht-Regressionstest (Abschnitt 7.3) — bevor „Ersetzen" begonnen
   wird, damit die Kernfunktion unabhängig abnehmbar ist (siehe
   `suchen-req.md` Zeilen 283–286).
5. `commands.ts`-Ergänzung (Abschnitt 3.4) + Ersetzen-UI in `SearchBar.tsx` +
   Test 7.2 Punkte 11/13 (Bearbeitung während offener Suche gilt für beide
   Modi) — Erweiterung „Suchen & Ersetzen".
6. Rundreise-Tests 7.4/7.5/7.6 — zuletzt, da sie sowohl die reine Suche als
   auch (ab Schritt 5) die Ersetzen-Erweiterung voraussetzen.
7. Backlog-Status von `suchen` auf „vorhanden" erst nach Abschluss von Schritt
   4, Status von `suchen-ersetzen` erst nach Abschluss von Schritt 6 — jeweils
   nur, wenn alle zugehörigen Tests grün sind (Anforderung Abschnitt 15,
   Schlussabsatz).
