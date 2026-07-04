# Umsetzungsplan „Seitenumbruch einfügen" — dateigenau, gegen den tatsächlichen Code geprüft

Bezug: `E:\docs\specs\seitenumbruch-req.md` (Anforderung), `E:\docs\FEATURE-SPEC-DOCX-ODT.md`
(Rahmenbedingungen, Abschnitte 2/8/15/17/18/19/20/21). Code-Stand geprüft am 2026-07-04 in
`E:\docs` (kein Git-Repo; Datei-Inhalte direkt gelesen, alle Zeilenangaben unten gegen den
tatsächlichen Dateiinhalt verifiziert, nicht aus der Anforderungsdatei übernommen).

Rolle dieses Dokuments: legt fest, was am **bestehenden Code** fehlt (Abschnitt 0 bestätigt
den Befund aus `seitenumbruch-req.md` Abschnitt 0 und ergänzt ihn um mehrere beim eigenen
Nachprüfen zusätzlich gefundene, für die Umsetzung entscheidende Tatsachen), trifft die
Architekturentscheidung zum Datenmodell (Abschnitt 1), spezifiziert Schema/Commands
(Abschnitte 2–3), Editor-Verdrahtung/Toolbar/Visualisierung (Abschnitte 4–7), die
Import-/Export-Anpassungen für OOXML/DOCX (Abschnitt 8–9) und ODF/ODT (Abschnitt 11–12),
inklusive eines neuen kleinen Shared-Moduls (Abschnitt 10), und schließt mit
Grenzfall-Mapping, Testplan und Abnahme-Checkliste (Abschnitte 13–16).

---

## 0. Bestätigung des Codebefunds aus `seitenumbruch-req.md` Abschnitt 0 + Zusatzbefunde

### 0.1 Bestätigt

Gegen den tatsächlichen Dateiinhalt geprüft, Befund aus der Anforderungsdatei **vollständig
bestätigt**:

1. `src/formats/shared/schema.ts` (154 Zeilen) kennt `doc`, `paragraph` (9–17), `heading`
   (19–31), `text` (33), `hard_break` (35–43), `image` (45–72), `bullet_list`/`ordered_list`/
   `list_item` (74–104), Tabellen-Nodes aus `tableNodes(...)` (106). Kein `page_break`-Node,
   kein `breakBefore`-Attribut.
2. `src/formats/shared/editor/commands.ts` (108 Zeilen) hat `setAlign`, `isAlignActive`,
   `setHeading`, `toggleList`, `liftFromList`, `insertImage`, `insertTable`,
   `applyMarkColor`/`clearMarkColor` — kein `insertPageBreak`.
3. `Toolbar.tsx` (247 Zeilen) hat keinen „Seitenumbruch"-Eintrag.
   `WordEditor.tsx:71–79` bindet `Mod-z`, `Mod-y`, `Mod-Shift-z`, `Enter`
   (`splitListItem`), `Mod-b`, `Mod-i`, `Mod-u`, dann `keymap(baseKeymap)` (Zeile 80) —
   kein `Mod-Enter`.
4. `src/formats/shared/editor/pagination.ts` (116 Zeilen) berechnet Umbrüche ausschließlich
   aus gemessenen DOM-Höhen (`computePageBreakIndices`, 12–25;
   `measureAndBuildDecorations`, 33–63) und ist an keiner Stelle mit Dokumentinhalt
   verknüpft.
5. `src/formats/docx/writer.ts:58–61` (`inlineToRuns`) erzeugt für `hard_break`
   ausschließlich `<w:r><w:br/></w:r>` — kein `w:type`. `src/formats/docx/reader.ts` hat
   keine Fallunterscheidung für `w:type="page"`.
6. `src/formats/odt/writer.ts:50` erzeugt für `hard_break` nur `<text:line-break/>` — kein
   `fo:break-before`/`fo:break-after` irgendwo im Writer. `src/formats/odt/reader.ts:36–77`
   (`parseAutomaticStyles`) liest nur `fo:text-align`, nicht `fo:break-before`/
   `fo:break-after`.
7. `grep -rn "page-break\|pagebreak\|seitenumbruch" src tests` (case-insensitiv) liefert nur
   Treffer in `pagination.ts`/`pagination.test.ts` (anderes Feature, siehe Punkt 4).

### 0.2 Zusatzbefund A (wichtig, ändert die Einschätzung des DOCX-Readers): kein „Ignorieren", sondern aktive Fehlinterpretation

`seitenumbruch-req.md` Abschnitt 0 Punkt 5 formuliert vorsichtig „wird … entweder komplett
ignoriert oder (zu verifizieren) fälschlich wie ein normaler Zeilenumbruch behandelt". Das ist
jetzt verifiziert: **Fall zwei trifft zu.** `src/formats/docx/reader.ts:132–133`
(`decodeParagraphRuns`):

```ts
} else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'br') {
  runs.push({ kind: 'break' })
}
```

Jedes `<w:br>`-Element — mit oder ohne `w:type="page"` — wird identisch als `{kind: 'break'}`
gelesen und in `runsToInline` (Zeile 188) zu `{type: 'hard_break'}`. Ein aus einer echten
Word-Datei importierter manueller Seitenumbruch verschwindet damit nicht nur als *Konzept*,
er wird **stillschweigend zu einem einfachen Zeilenumbruch degradiert** — genau der in
Anforderung 3.5 explizit verbotene Fall.

`<w:lastRenderedPageBreak/>` dagegen wird schon heute **korrekt ignoriert** — allerdings nur,
weil `decodeParagraphRuns`s `if/else if`-Kette (Zeilen 130–139) keinen Fall dafür hat und der
Knoten stillschweigend durchfällt. Das ist **richtig durch Zufall**, nicht durch Absicht —
muss in einen expliziten, kommentierten, getesteten Fall überführt werden (Abschnitt 9.3),
damit es nicht bei einer künftigen Refaktorierung unbeabsichtigt kaputtgeht.

### 0.3 Zusatzbefund B (wichtig, widerspricht `seitenumbruch-req.md` Abschnitt 6 Punkt 5): reale Test-Fixtures mit echten manuellen Seitenumbrüchen sind **bereits im Repo vorhanden**

Die Anforderungsdatei geht davon aus, reale Word-/LibreOffice-Fixtures mit manuellem
Seitenumbruch seien „laut aktueller Repo-Durchsicht nicht vorhanden". Das ist nach
Durchsicht von `tests/fixtures/external/{docx,odt}/` **nicht zutreffend** — dort liegen
bereits mehrere brauchbare reale Dateien, nur bisher ungenutzt für dieses Feature (die
vorhandenen `external-fixtures.test.ts` prüfen nur „importiert ohne Absturz", nicht den
Seitenumbruch-Inhalt selbst). Verifiziert per Skript (JSZip, Node) gegen die tatsächlichen
ZIP-Inhalte:

| Datei | Format | Inhalt (verifiziert) |
|---|---|---|
| `tests/fixtures/external/docx/saut_page.docx` | DOCX | 2× `<w:br w:type="page"/>` (jeweils als **letzter** Run des jeweiligen `<w:p>`) + 1× einfaches `<w:br/>` mitten in Fließtext (`BLA<w:br/>BLA`) — ideale Positiv-/Negativ-Kombination in einer Datei |
| `tests/fixtures/external/docx/60329.docx` | DOCX | 3× `<w:lastRenderedPageBreak/>`, **0×** `w:br[type=page]` — sauberer „muss ignoriert werden"-Testfall |
| `tests/fixtures/external/odt/pagebreaks.odt` | ODT | Automatic-Styles `P1`/`P2` mit `fo:break-before="page"` (einer davon per Kommentar im Fließtext als „(ctrl+return)" markiert, referenziert von `<text:p text:style-name="P1">`/`P2` direkt im Text-Body), **und** `P3` mit `fo:break-after="page"` — einziger real gefundener `break-after`-Beleg, siehe 0.4 |
| `tests/fixtures/external/odt/AB_pageBreakBefore.odt` | ODT | Zwei Absätze `A`/`B`, `B`s Style trägt `fo:break-before="page"` |
| `tests/fixtures/external/odt/pageBreakProblem.odt` | ODT | Gleiche Struktur wie `AB_pageBreakBefore.odt` |
| `tests/fixtures/external/odt/no_pagebreak.odt` **und** `35585_-_no_pagebreak.odt` | ODT | `fo:break-before="page"` auf einem Absatz-Style, der aber **innerhalb einer Tabellenzelle** referenziert wird (`<table:table-cell><text:p text:style-name="ad7a907"/></table:table-cell>`) — siehe 0.5, entscheidend für Grenzfall 4 |
| `tests/fixtures/external/odt/text-extract.odt` | ODT | Enthält `<text:soft-page-break/>`, **kein** `fo:break-before`/`fo:break-after` irgendwo in der Datei — sauberer „darf nicht fehlinterpretiert werden"-Testfall (Anforderung 3.7) |

Diese Dateien werden in Abschnitt 14.3 als Pflicht-Fixtures für die realen Rundreise-/
Erkennungstests verwendet — **Anforderung Abschnitt 6 Punkt 5 gilt damit als bereits
erfüllbar ohne neue Dateien**, das dortige „müssen … aufgenommen werden" ist bereits
erledigt vorgefunden.

### 0.4 Zusatzbefund C: `fo:break-after` kommt in echten Dateien vor und darf nicht ignoriert werden

`pagebreaks.odt`s Style `P3` (`style:paragraph-properties style:page-number="auto"
fo:break-after="page"`) zeigt, dass reale ODF-Erzeugung (hier vermutlich LibreOffice, über
Absatzattribut statt Strg+Eingabe) auch `fo:break-after` statt `fo:break-before` verwendet.
`seitenumbruch-req.md` Abschnitt 3.7/3.6 erwähnt nur `fo:break-before` — wird hier bewusst um
`fo:break-after` erweitert (Abschnitt 12.2), sonst ginge beim Import dieser realen Datei ein
Umbruch still verloren (Verstoß gegen `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18).

### 0.5 Zusatzbefund D: reale Evidenz für die Grenzfall-4-Entscheidung (Seitenumbruch in Tabellenzelle)

`no_pagebreak.odt`/`35585_-_no_pagebreak.odt` (Dateiname deutet auf einen dokumentierten
LibreOffice-Bug „35585" hin) zeigen: ein `fo:break-before="page"` **innerhalb einer
Tabellenzelle** wird von LibreOffice selbst **nicht** als echter Seitenumbruch gerendert
(daher der Dateiname „no pagebreak"). Das ist direkte reale Evidenz für die in Abschnitt 3.2
unten getroffene Design-Entscheidung zu Grenzfall 4 und wird als Regressionstest verwendet
(Abschnitt 14.1).

---

## 1. Architekturentscheidung: Datenmodell

**Entscheidung: Absatz-/Überschrift-Attribut `breakBefore: boolean` auf `paragraph` und
`heading`** (nicht ein eigener `page_break`-Block-Node).

### 1.1 Begründung

`seitenumbruch-req.md` Abschnitt 3.3 verlangt explizit, die Wahl zu treffen und zu
dokumentieren, weil beide Modelle unterschiedliche Cross-Format-Konsequenzen haben:

- **Bildet das ODF-Modell direkt ab** (`fo:break-before` ist selbst schon ein
  Absatz-Attribut) — der ODT-Export wird dadurch **trivial**: das Attribut sitzt bereits auf
  genau dem Knoten, dessen Style es braucht, ganz ohne „nächster Absatz"-Suche.
- **Der in Abschnitt 3.6 der Anforderung antizipierte Fallback („Umbruch am Dokumentende,
  kein nachfolgender Absatz vorhanden → leeren Absatz anhängen") entfällt für den
  ODT-Writer vollständig**, weil `breakBefore` bei diesem Modell **immer** auf einem
  real existierenden Knoten liegt (unser Schema erzwingt `doc: 'block+'`, das Dokument kann
  nie leer sein) — es gibt nie eine Situation, in der „der nächste Absatz" fehlt, weil das
  Attribut nie auf „den nächsten Absatz" verweist, sondern immer auf sich selbst. Die vom
  Anforderungsdokument erwartete Komplexität verschwindet nicht — sie verschiebt sich (siehe
  1.2) auf die **Reader**-Seite (DOCX-Reader Abschnitt 9.4, ODT-Reader Abschnitt 12.3), wo
  echte Fremddateien den Umbruch strukturell anders (inline-Run bzw. „vorheriger Absatz
  bricht danach") codieren können.
- **Einfügen an der Cursor-Position wird strukturell identisch zu „Enter"**: „Absatz an
  Cursor-Position teilen, zweiter Teil bekommt das Attribut" (Anforderung 3.1) lässt sich
  direkt mit `Transform.split` (siehe Abschnitt 3) umsetzen — keine neue
  Node-Einfüge-Logik nötig, volle Wiederverwendung des in ProseMirror eingebauten
  Split-Mechanismus samt dessen etabliertem Heading/Listen-Verhalten.
- **DOCX-Export erfordert einen synthetischen Run** (`<w:br w:type="page"/>` als erster Run
  des Absatzes) — das ist in der Anforderung selbst als Konsequenz dieser Wahl genannt
  (Abschnitt 3.3) und wird in Abschnitt 8 umgesetzt.

### 1.2 Verworfene Alternative: eigener `page_break`-Block-Node

Wurde geprüft und verworfen: bildet DOCX direkter ab, verlagert aber die vom
Anforderungsdokument beschriebene Fallback-Komplexität (3.6) auf den ODT-**Writer**
(Style müsste am „nächsten Geschwister-Knoten" ansetzen, mit Sonderfall „kein nächster
Knoten vorhanden"). Da ODT band der beiden Zielformate der **originär native** Fall ist
(`fo:break-before` ist wortwörtlich ein Absatzattribut), hätte diese Alternative die
Komplexität an die falsche Stelle verschoben. Das Attribut-Modell macht stattdessen den
DOCX-Reader komplexer (Abschnitt 9), weil dort echte Dateien den Bruch **inline, nicht am
Absatzanfang** codieren können (siehe `saut_page.docx`-Befund 0.3: beide echten
Seitenumbrüche stehen als **letzter** Run ihres Absatzes, nicht als eigener, isolierter
Absatz) — das ist aber ohnehin nötig, unabhängig vom Datenmodell, weil eine Fremddatei
so aussehen *kann*.

### 1.3 Konsequenz für verschachtelte Container (Listen/Tabellen)

`breakBefore` ist ein Attribut auf `paragraph`/`heading` — es ist damit strukturell
**überall** gültig, wo diese Node-Typen vorkommen dürfen, also auch verschachtelt in
`list_item` (`content: 'paragraph block*'`, `schema.ts:99`) und in Tabellenzellen
(`cellContent: 'block+'`, `schema.ts:106`). Das ist **gewollt** (verhindert Datenverlust
beim Import realer Dateien wie `no_pagebreak.odt`, die genau das tun) — hat aber
Konsequenzen für die automatische Paginierung, siehe Abschnitt 7.4.

---

## 2. Schema-Änderungen — `src/formats/shared/schema.ts`

```ts
const alignAttr = { align: { default: 'left', validate: 'string' } }
const pageBreakAttr = { breakBefore: { default: false, validate: 'boolean' } }
```

`paragraph` (aktuell Zeilen 9–17) und `heading` (aktuell Zeilen 19–31) erhalten je
`...pageBreakAttr` zusätzlich zu `...alignAttr`:

```ts
paragraph: {
  group: 'block',
  content: 'inline*',
  attrs: { ...alignAttr, ...pageBreakAttr },
  parseDOM: [{
    tag: 'p',
    getAttrs: (dom) => ({
      align: (dom as HTMLElement).style.textAlign || 'left',
      breakBefore: (dom as HTMLElement).classList.contains('pm-page-break-before'),
    }),
  }],
  toDOM(node) {
    const cls = node.attrs.breakBefore ? 'pm-page-break-before' : ''
    return ['p', { style: `text-align: ${node.attrs.align}`, class: cls }, 0]
  },
},

heading: {
  group: 'block',
  content: 'inline*',
  attrs: { level: { default: 1, validate: 'number' }, ...alignAttr, ...pageBreakAttr },
  defining: true,
  parseDOM: [1, 2, 3, 4, 5, 6].map((level) => ({
    tag: `h${level}`,
    getAttrs: (dom) => ({
      level,
      align: (dom as HTMLElement).style.textAlign || 'left',
      breakBefore: (dom as HTMLElement).classList.contains('pm-page-break-before'),
    }),
  })),
  toDOM(node) {
    const cls = node.attrs.breakBefore ? 'pm-page-break-before' : ''
    return [`h${node.attrs.level}`, { style: `text-align: ${node.attrs.align}`, class: cls }, 0]
  },
},
```

`validate: 'boolean'` ist bereits vom vorhandenen Muster gedeckt — geprüft gegen
`node_modules/prosemirror-model/dist/index.js:2294–2301` (`validateType`): der String wird
per `typeof value` gegen die Pipe-getrennten Typnamen geprüft, `'boolean'` funktioniert
identisch zu den bereits verwendeten `'string'`/`'number'`.

Die `parseDOM`/`class`-Ergänzung ist **nicht** von der Anforderung explizit verlangt, aber
ohne sie ginge das Attribut bei einem **internen** Kopieren/Einfügen innerhalb des Editors
(ProseMirror serialisiert bei Copy/Paste über `toDOM`/`parseDOM` desselben Schemas) sang-
und klanglos verloren — ein stiller Datenverlust im Sinne des allgemeinen Grundsatzes aus
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18, auch wenn dafür kein expliziter Testfall in der
Anforderungsdatei existiert. Günstig mitgenommen, da praktisch kostenlos.

**Keine Änderung** an `hard_break`, `image`, Listen-/Tabellen-Nodes nötig.

---

## 3. Commands — `src/formats/shared/editor/commands.ts`

### 3.1 Vorarbeit: `alignableTypes` exportieren

Zeile 10 (`const alignableTypes = new Set(['paragraph', 'heading'])`) wird zu
`export const alignableTypes = ...` — exakt die Menge der Node-Typen, die `breakBefore`
tragen können, ist identisch zu der, die `align` trägt. Kein zweites, potenziell
divergierendes Set anlegen.

### 3.2 `insertPageBreak(): Command` — neu

Referenzimplementierung (Kernlogik; Feinschliff/Fehlerfälle beim Schreiben durch die
Unit-Tests aus Abschnitt 14.1 abzusichern):

```ts
import { canSplit } from 'prosemirror-transform'

export function insertPageBreak(): Command {
  return (state, dispatch) => {
    // Grenzfall 4 — durch reale Evidenz gestützt (Zusatzbefund D, Abschnitt 0.5):
    // LibreOffice selbst rendert fo:break-before innerhalb einer Tabellenzelle NICHT als
    // echten Seitenumbruch. Word-Parität: Strg+Eingabe in einer Zelle erzeugt dort einen
    // Zeilenumbruch, keinen Seitenumbruch. Bewusste, dokumentierte Abweichung von einem
    // "echten" Umbruch, aber kein stiller Fehlschlag (Anforderung 3.10) und keine
    // Tabellenstruktur-Beschädigung.
    if (isInTable(state)) {
      if (dispatch) {
        dispatch(state.tr.replaceSelectionWith(wordSchema.nodes.hard_break.create()).scrollIntoView())
      }
      return true
    }

    let tr = state.tr
    if (!state.selection.empty) tr = tr.deleteSelection() // Anforderung 3.2

    const $pos = tr.selection.$from
    let depth = $pos.depth
    while (depth > 0 && !alignableTypes.has($pos.node(depth).type.name)) depth--

    const insertStandaloneFallback = () => {
      // Kein paragraph/heading-Vorfahre an der Cursor-Position (z. B. GapCursor direkt
      // neben einem Bild/einer Tabelle ohne Text drumherum, Grenzfall 12) — statt eines
      // stillen No-Ops (verboten laut Anforderung 3.10) einen eigenen, leeren Absatz mit
      // gesetztem Umbruch einfügen.
      const node = wordSchema.nodes.paragraph.create({ breakBefore: true })
      tr.insert($pos.pos, node)
      if (dispatch) dispatch(tr.scrollIntoView())
      return true
    }

    if (depth === 0) return insertStandaloneFallback()

    const originalType = $pos.node(depth).type
    const atEnd = $pos.end(depth) === $pos.pos
    // Enter-am-Ende-einer-Überschrift-Parität (Grenzfall 6): das ist exakt die Regel, die
    // prosemirror-commands' eigenes splitBlock (node_modules/prosemirror-commands/dist/
    // index.js:402–454, "atEnd && deflt") für normales Enter anwendet — hier bewusst
    // dieselbe Regel repliziert, damit sich "Seitenumbruch mitten in/am Ende einer
    // Überschrift" ununterscheidbar von "Enter mitten in/am Ende einer Überschrift"
    // verhält, wie von der Anforderung gefordert.
    const afterType = atEnd ? wordSchema.nodes.paragraph : originalType
    const afterAttrs = afterType === wordSchema.nodes.heading ? $pos.node(depth).attrs : undefined

    // Grenzfall 5 (Liste): auch das list_item mitteilen, damit der zweite Teil ein neues
    // list_item **derselben** Liste wird (Nummerierung bleibt lückenlos) — analog zu
    // splitListItem, aber mit eigenem breakBefore-Attribut auf dem inneren Absatz statt
    // reinem Enter-Verhalten. Bewusst NICHT die Liste selbst aufsplitten (siehe 3.3).
    const parentIsListItem = $pos.node(depth - 1)?.type.name === 'list_item'
    const splitDepth = parentIsListItem ? 2 : 1
    const types = parentIsListItem
      ? [{ type: wordSchema.nodes.list_item }, { type: afterType, attrs: afterAttrs }]
      : [{ type: afterType, attrs: afterAttrs }]

    if (!canSplit(tr.doc, $pos.pos, splitDepth, types)) return insertStandaloneFallback()

    tr.split($pos.pos, splitDepth, types)
    const $after = tr.doc.resolve(tr.mapping.map($pos.pos))
    let afterDepth = $after.depth
    while (afterDepth > 0 && !alignableTypes.has($after.node(afterDepth).type.name)) afterDepth--
    tr.setNodeAttribute($after.before(afterDepth), 'breakBefore', true)

    if (dispatch) dispatch(tr.scrollIntoView())
    return true
  }
}
```

**Wichtig — genau eine Transaktion:** `deleteSelection()`, `split()` und
`setNodeAttribute()` laufen alle auf demselben `tr`-Objekt (`Transform`-Methodenkette,
keine separaten `dispatch`-Aufrufe) — damit ist Anforderung 3.9 („ein einziger
Undo-Schritt") strukturell erfüllt, nicht nur zufällig, weil `prosemirror-history` jede
`dispatch`-Transaktion grundsätzlich als eigenen Undo-Eintrag behandelt (mehrere Aufrufe
auf **einer** Transaktion zählen dagegen als ein Eintrag).

### 3.3 Verworfene Alternative: Liste selbst am Umbruch aufsplitten

Geprüft und verworfen: eine Variante, bei der `insertPageBreak` innerhalb eines
`list_item` die **gesamte** `ordered_list`/`bullet_list` in zwei Top-Level-Listen
aufspaltet (mit `start`-Attribut-Fortsetzung auf der zweiten), hätte den Vorteil, dass die
automatische Paginierung (Abschnitt 7, die nur Top-Level-Kinder von `doc` betrachtet) den
Umbruch direkt „sähe" und visuell umsetzen könnte. Verworfen, weil dabei eine **bereits
vorhandene, vom Seitenumbruch-Feature unabhängige Lücke** sichtbar würde: `groupLists` in
`src/formats/docx/reader.ts:258–283` setzt beim Wiederzusammenbau eines durch einen
Nicht-Listen-Absatz unterbrochenen `w:numId`-Laufs **kein** `start`-Attribut auf die zweite
`ordered_list` (bleibt beim Schema-Default `1`) — eine eigene Top-Level-Aufspaltung würde
also in unserer **eigenen** Editor-Vorschau fälschlich wieder bei „1." beginnen, obwohl der
Export nach DOCX (gemeinsame `w:numId`, siehe `docx/writer.ts:112–118`) vermutlich korrekt
fortlaufend bliebe — eine verwirrende, nur in der eigenen Vorschau falsche Inkonsistenz.
Das ist ein eigenständiger, vorbestehender Nummerierungs-Bug außerhalb des Geltungsbereichs
dieses Tickets (`seitenumbruch-req.md` Abschnitt „Geltungsbereich" begrenzt explizit auf
Seitenumbruch) und wird **nicht** hier mitbehoben. Die gewählte, einfachere Variante
(3.2: Split nur bis `list_item`, Liste bleibt **eine** Liste) umgeht dieses Problem
vollständig, weil nie eine zweite Liste entsteht. Konsequenz: das Feature bekommt für
Listen (und aus demselben, in `pagination.ts:8–10` bereits dokumentierten Grund auch für
Tabellenzellen) **keine** automatische visuelle Live-Vorschau-Aufteilung — dokumentiert als
bewusste Einschränkung in Abschnitt 7.4/13 (Grenzfall 5).

### 3.4 `removePageBreakBackward()` / `removePageBreakForward(): Command` — neu

Zuständig für Anforderung 1 Zeile 4 (Löschen mit Entf/Backspace) und Grenzfall 13
(Undo nach Löschen — hier über den normalen Undo-Mechanismus, da wieder nur eine
Transaktion pro Aufruf).

```ts
import { joinBackward, joinForward } from 'prosemirror-commands'

export function removePageBreakBackward(): Command {
  return (state, dispatch) => {
    const { $from, empty } = state.selection
    if (!empty || $from.parentOffset !== 0) return false
    const parent = $from.parent
    if (!alignableTypes.has(parent.type.name) || !parent.attrs.breakBefore) return false

    const tr = state.tr.setNodeAttribute($from.before($from.depth), 'breakBefore', false)
    // Transaktions-Verkettung durch Steps-Replay: joinBackward wird gegen den
    // Zwischenzustand NACH dem Attribut-Löschen ausgeführt (state.apply(tr) hat exakt
    // dasselbe Dokument wie tr.doc — derselbe Positionsraum), seine Schritte werden auf
    // dieselbe externe tr repliziert, statt eine zweite Transaktion zu dispatchen — damit
    // bleibt das Ganze EIN Undo-Schritt (Anforderung 3.9).
    const midState = state.apply(tr)
    joinBackward(midState, (joinTr) => joinTr.steps.forEach((step) => tr.step(step)))
    if (dispatch) dispatch(tr.scrollIntoView())
    return true
  }
}

export function removePageBreakForward(): Command {
  return (state, dispatch) => {
    const { $from, empty } = state.selection
    if (!empty || $from.parentOffset !== $from.parent.content.size) return false
    const parentIndex = $from.index($from.depth - 1)
    const nextSibling = $from.node($from.depth - 1).maybeChild(parentIndex + 1)
    if (!nextSibling || !alignableTypes.has(nextSibling.type.name) || !nextSibling.attrs.breakBefore) {
      return false
    }
    const nextPos = $from.after($from.depth)
    const tr = state.tr.setNodeAttribute(nextPos, 'breakBefore', false)
    const midState = state.apply(tr)
    joinForward(midState, (joinTr) => joinTr.steps.forEach((step) => tr.step(step)))
    if (dispatch) dispatch(tr.scrollIntoView())
    return true
  }
}
```

Beide geben `false` zurück, wenn die Bedingung nicht zutrifft — genau wie
`Enter: splitListItem(...)` in `WordEditor.tsx:75` heute schon **vor** `baseKeymap`
eingehängt ist und bei Rückgabe `false` transparent an `baseKeymap`s eigenes
`Backspace`/`Delete` (`chainCommands(deleteSelection, joinBackward, selectNodeBackward)`
bzw. `chainCommands(deleteSelection, joinForward, selectNodeForward)`, siehe
`node_modules/prosemirror-commands/dist/index.js:807–848`) durchgereicht wird — bereits
etabliertes, funktionierendes Muster in diesem Code, kein neuer Mechanismus.

Falls das Zusammenführen mit dem vorherigen/nächsten Block strukturell nicht möglich ist
(z. B. der Umbruch sitzt auf dem allerersten Dokument-Knoten und es gibt nichts, womit er
verschmelzen könnte), bleibt nach `joinBackward`/`joinForward` (die dann selbst `false`
liefern und nichts anhängen) trotzdem das saubere, sichtbare Ergebnis „Attribut entfernt,
zwei getrennte Absätze bleiben bestehen" — kein Absturz, kein stiller Fehlschlag.

### 3.5 `commands.ts`-Exportliste — Ergänzung

`insertPageBreak`, `removePageBreakBackward`, `removePageBreakForward`, `alignableTypes`
(neu exportiert) zur bestehenden Exportliste hinzufügen.

---

## 4. `src/formats/shared/editor/WordEditor.tsx` — Keymap-Verdrahtung

`keymap({...})`-Objekt (aktuell Zeilen 71–79) ergänzen:

```ts
keymap({
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
  Enter: splitListItem(wordSchema.nodes.list_item),
  'Mod-b': toggleMark(wordSchema.marks.strong),
  'Mod-i': toggleMark(wordSchema.marks.em),
  'Mod-u': toggleMark(wordSchema.marks.underline),
  'Mod-Enter': insertPageBreak(),
  Backspace: removePageBreakBackward(),
  Delete: removePageBreakForward(),
}),
```

`'Mod-Enter'` ist auf Windows/Linux `Strg+Enter`, auf Mac `Cmd+Enter` — genau die von
`prosemirror-keymap`s `Mod`-Normalisierung abgedeckte, plattformübliche Abbildung
(dieselbe Konvention wie `Mod-z`/`Mod-b`/etc. bereits im selben Objekt), erfüllt
Anforderung 1 Zeile 2 ohne eigene Plattformerkennung.

Import-Ergänzung: `insertPageBreak, removePageBreakBackward, removePageBreakForward` aus
`./commands`.

**Keine Änderung** an `plugins: [...]` (Zeilen 69–86) nötig — `createPaginationPlugin()`
bleibt unverändert eingehängt; die Integration des manuellen Umbruchs geschieht **innerhalb**
von `pagination.ts` selbst (Abschnitt 7), nicht über ein zusätzliches Plugin. **Keine
Änderung** an `reconcileSelectionOnClick` (Zeilen 42–53) nötig: `insertPageBreak` /
`removePageBreak*` lösen wie jede andere Command-Ausführung eine reguläre, über
`dispatchTransaction` verarbeitete Transaktion aus — kein DOM-Mutations-ohne-Transaktion-Pfad,
der den bekannten Selection-Sync-Bug auslösen könnte. Trotzdem **muss** dies laut
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 / Anforderung Grenzfall 7 mit einem dedizierten
Regressionstest bestätigt werden (Abschnitt 14.4).

---

## 5. `src/formats/shared/editor/Toolbar.tsx` — neuer Button

Platzierung: in der bestehenden „Einfügen"-Gruppe, direkt nach „Tabelle einfügen"
(Zeilen 228–239) und vor „Bild" (Zeilen 241–244) — entspricht Anforderung 1 Zeile 1
(„sinnvoll platziert … neben Tabelle/Bild einfügen").

**Eingebettetes SVG, kein Unicode/Emoji** (Anforderung 1 Zeile 1, `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 20.1): der Rest der Toolbar verwendet aktuell durchgängig Unicode/Emoji
(`⊞`, `🖼`, `🖍`, `⌫`, `⇤`, `↔`, `⇥`, `≡`) — das ist als **eigenständiges, umfassenderes**
Problem bereits in Abschnitt 20.1 der Hauptspezifikation dokumentiert und **nicht**
Gegenstand dieses Tickets; hier wird nur sichergestellt, dass der **neue** Button dieses
Muster nicht fortschreibt.

```tsx
function PageBreakIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 5V2h4M14 5V2h-4M2 11v3h4M14 11v3h-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2 8h12" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 1.6" strokeLinecap="round" />
    </svg>
  )
}

// … innerhalb von Toolbar(), nach dem Tabelle-Button (Zeile 239), vor dem Bild-Label (241):
<button
  type="button"
  title="Seitenumbruch einfügen"
  aria-label="Seitenumbruch einfügen"
  onMouseDown={(e) => {
    e.preventDefault()
    run(view, insertPageBreak())
  }}
  className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
>
  <PageBreakIcon />
</button>
```

Symbol: zwei angedeutete Eckenpaare (Blattecken oben/unten) mit gestrichelter Trennlinie
dazwischen — ein in Word/LibreOffice geläufiges Icon-Motiv für „Seitenumbruch", eindeutig
von Tabelle (`⊞`-artiges Gitter) und Bild (Bildrahmen-Piktogramm) unterscheidbar, auch bei
deaktivierter Emoji-Schriftart korrekt darstellbar (reines Vektor-SVG, kein Zeichen-Font
nötig). `title`/`aria-label` liefern den in Playwright per
`getByRole('button', { name: 'Seitenumbruch einfügen' })` bzw. `getByTitle(...)`
adressierbaren, für Screenreader UND E2E-Tests identischen Namen — folgt demselben Muster
wie die bereits vorhandenen `title`-Attribute der übrigen Buttons.

Import-Ergänzung: `insertPageBreak` aus `./commands`.

Kein Deaktivieren des Buttons in Tabellen-Kontext (`isInTable(view.state)`) — bewusst:
`insertPageBreak` bleibt dort funktional (Fallback auf `hard_break`, Abschnitt 3.2), ein
deaktivierter Button widerspräche der bewussten Fallback-Entscheidung und würde selbst
wieder wie ein stiller Fehlschlag wirken.

---

## 6. Visuelle Kennzeichnung (Anforderung 1 Zeile 3, 3.8)

### 6.1 CSS — `src/index.css`

Ergänzung nach dem bestehenden `.page-break-spacer`-Block (aktuell Zeilen 69–71). Die
Editor-„Seite" ist laut `pageBackgroundStyle()` (`pageLayout.ts:22–30`) immer weiß
gerendert, unabhängig vom App-weiten Hell-/Dunkel-Modus (wie ein Blatt Papier) — deshalb
genügen feste Farben ohne `prefers-color-scheme`-Variante, konsistent mit dem Rest der
Editor-Fläche:

```css
.ProseMirror .pm-page-break-before {
  position: relative;
  border-top: 2px dashed #2563eb;
  margin-top: 2.4em;
  padding-top: 0.5em;
}

.ProseMirror .pm-page-break-before::before {
  content: 'Seitenumbruch';
  position: absolute;
  top: -1.65em;
  left: 0;
  font-size: 0.7rem;
  line-height: 1;
  color: #1d4ed8;
  background: #eff6ff;
  padding: 0.15em 0.5em;
  border-radius: 3px;
  user-select: none;
}

.page-break-spacer--manual {
  outline: 2px dashed #2563eb;
  outline-offset: -2px;
}
```

Damit sind ein manueller Umbruch (blau gestrichelte Linie + Label direkt am Absatz,
**unabhängig** von jeder Höhenmessung sichtbar) und ein automatischer Umbruch (nur der
neutrale graue `page-break-spacer`-Zwischenraum ohne Label) klar unterscheidbar — erfüllt
Anforderung 1 Zeile 3 mit zwei unabhängigen, jeweils per DOM-Attribut/Klasse prüfbaren
Signalen (Testplan Punkt 6).

### 6.2 Zusammenspiel mit `pagination.ts`

Siehe Abschnitt 7 — der `page-break-spacer--manual`-Klassenzusatz wird dort beim Bau der
Decoration gesetzt.

---

## 7. `src/formats/shared/editor/pagination.ts` — Integration erzwungener Umbrüche

### 7.1 `computePageBreakIndices` — Signaturerweiterung (rückwärtskompatibel)

```ts
export function computePageBreakIndices(
  heights: number[],
  pageContentHeight: number,
  forcedBreakIndices: ReadonlySet<number> = new Set(),
): number[] {
  const breaks: number[] = []
  let cumulative = 0
  for (let i = 0; i < heights.length; i++) {
    const height = heights[i]
    const forced = i > 0 && forcedBreakIndices.has(i)
    const overflow = pageContentHeight > 0 && cumulative > 0 && cumulative + height > pageContentHeight
    if (forced || overflow) {
      breaks.push(i)
      cumulative = 0
    }
    cumulative += height
  }
  return breaks
}
```

**Wichtig — Einzelpass, nicht zweiphasig (erst Höhen, dann Merge):** ein zweiphasiger Ansatz
(erst `computePageBreakIndices` unverändert höhenbasiert rechnen, danach erzwungene Indizes
per Vereinigungsmenge hinzufügen) wäre **falsch**, sobald nach einem erzwungenen Umbruch
weitere natürliche Überlauf-Umbrüche folgen müssten: deren `cumulative`-Basis muss ab dem
erzwungenen Umbruch neu bei 0 beginnen (Anforderung 3.8, „Kombination beider Mechanismen …
muss korrekt zusammenwirken"). Der obige Einzelpass setzt `cumulative = 0` exakt wie beim
bereits vorhandenen natürlichen Fall, egal ob der Umbruch durch `forced` oder `overflow`
ausgelöst wurde — dadurch bleibt jede nachfolgende Höhen-Messung korrekt.

**Rückwärtskompatibilität:** alle 8 bestehenden Tests in `pagination.test.ts` rufen die
Funktion **ohne** drittes Argument auf (Default `new Set()`) — `forced` ist dann für jedes
`i` `false`, Verhalten bleibt bytegleich zum Ist-Zustand. Einzige Verhaltensänderung
gegenüber der Ist-Fassung: der bisherige Frühausstieg `if (pageContentHeight <= 0) return []`
entfällt (ersetzt durch die `overflow`-Bedingung, die `pageContentHeight > 0` selbst prüft) —
**ohne** funktionalen Unterschied für die bestehenden Tests (`computePageBreakIndices([100,
100], 0)`/`(...,-10)` liefern weiterhin `[]`, weil `overflow` dann für jedes `i` `false`
bleibt und ohne `forcedBreakIndices`-Argument auch `forced` immer `false` ist), aber jetzt
korrekt für den (in den bestehenden Tests nicht vorkommenden) Fall „`pageContentHeight`
unbekannt/0, aber ein Umbruch ist erzwungen" — der erzwungene Umbruch muss auch dann
sichtbar bleiben.

### 7.2 `measureAndBuildDecorations` — erzwungene Indizes aus dem Dokument ableiten

```ts
function forcedBreakIndicesFrom(doc: ProseMirrorNode): Set<number> {
  const forced = new Set<number>()
  doc.forEach((node, _offset, index) => {
    // Bewusst nur Top-Level-Kinder von doc (siehe Abschnitt 7.4) — ein verschachtelter
    // breakBefore (Listenpunkt/Tabellenzelle) wird für die Live-Vorschau NICHT ausgewertet.
    if ((node.type.name === 'paragraph' || node.type.name === 'heading') && node.attrs.breakBefore) {
      forced.add(index)
    }
  })
  return forced
}

function measureAndBuildDecorations(view: EditorView): DecorationSet {
  const dom = view.dom
  const children = Array.from(dom.children) as HTMLElement[]
  const heights = children.map((el) => el.getBoundingClientRect().height)
  const forced = forcedBreakIndicesFrom(view.state.doc)
  const breakIndices = computePageBreakIndices(heights, PAGE_CONTENT_HEIGHT_PX, forced)

  if (breakIndices.length === 0) return DecorationSet.empty

  const breakIndexSet = new Set(breakIndices)
  const decorations: Decoration[] = []
  view.state.doc.forEach((_node, offset, index) => {
    if (breakIndexSet.has(index)) {
      const isManual = forced.has(index)
      decorations.push(
        Decoration.widget(
          offset,
          () => {
            const spacer = document.createElement('div')
            spacer.className = isManual ? 'page-break-spacer page-break-spacer--manual' : 'page-break-spacer'
            spacer.style.height = `${PAGE_GAP_PX}px`
            spacer.setAttribute('aria-hidden', 'true')
            spacer.setAttribute('contenteditable', 'false')
            spacer.dataset.manualPageBreak = String(isManual)
            return spacer
          },
          { side: -1, key: `page-break-${index}-${isManual ? 'manual' : 'auto'}` },
        ),
      )
    }
  })

  return DecorationSet.create(view.state.doc, decorations)
}
```

`spacer.dataset.manualPageBreak` liefert ein zweites, von der CSS-Klasse unabhängiges
DOM-Attribut-Signal für Testplan Punkt 6 („mindestens eine DOM-Attribut-Assertion").

**Der `key` im Decoration-Widget wurde bewusst um `-manual`/`-auto` erweitert.** Grund: die
Widget-Fabrik-Funktion (das zweite Argument von `Decoration.widget`) wird von ProseMirror
nur bei tatsächlicher Neuerzeugung der Decoration aufgerufen; ändert sich **nur** der
`isManual`-Status eines Bruchs an einer bereits vorher als Bruch erkannten Position (z. B.
weil dort schon ein automatischer Höhen-Überlauf-Bruch lag und der Absatz jetzt zusätzlich
`breakBefore: true` bekommt), bliebe die alte Fabrik ohne diese Erweiterung sonst
möglicherweise gecached — mit dem eindeutigen `key` wird stattdessen zuverlässig neu
gebaut.

### 7.3 `sameDecorationSet` — Korrektur (sonst verpasste Neu-Darstellung)

Die bestehende Vergleichsfunktion (Zeilen 107–115) vergleicht nur `.from`-Positionen:

```ts
function sameDecorationSet(a: DecorationSet, b: DecorationSet): boolean {
  const aLocal = a.find()
  const bLocal = b.find()
  if (aLocal.length !== bLocal.length) return false
  for (let i = 0; i < aLocal.length; i++) {
    if (aLocal[i].from !== bLocal[i].from) return false
  }
  return true
}
```

**Das ist unzureichend für diese Erweiterung:** liegt an Index `N` bereits ein
höhenbasierter automatischer Bruch, und wird an genau diesem Index zusätzlich
`breakBefore: true` gesetzt, bleibt die Positions-Liste (`.from`-Werte) identisch — die
Funktion meldet fälschlich „keine Änderung", die neue Transaktion mit dem
`manual`-gekennzeichneten Widget würde **nicht** dispatcht, das alte (nicht-manuelle)
Spacer-Element bliebe stehen. Korrektur: Vergleich um den `key` erweitern (der jetzt den
manuellen/automatischen Status codiert, siehe 7.2):

```ts
function sameDecorationSet(a: DecorationSet, b: DecorationSet): boolean {
  const aLocal = a.find()
  const bLocal = b.find()
  if (aLocal.length !== bLocal.length) return false
  for (let i = 0; i < aLocal.length; i++) {
    if (aLocal[i].from !== bLocal[i].from) return false
    if (String((aLocal[i] as unknown as { type: { spec: { key?: string } } }).type.spec.key) !==
        String((bLocal[i] as unknown as { type: { spec: { key?: string } } }).type.spec.key)) {
      return false
    }
  }
  return true
}
```

(Falls sich der interne `Decoration`-Typ als zu unhandlich für einen sauberen Zugriff auf
`spec.key` erweist, ist die einfachere, robustere Alternative: `measureAndBuildDecorations`
gibt zusätzlich zum `DecorationSet` eine kleine Vergleichs-Signatur zurück — z. B. ein
`string` aus `breakIndices.map(i => `${offset(i)}:${forced.has(i)}`).join(',')` — und
`recompute()` vergleicht **diese** Signatur statt `sameDecorationSet` aufzurufen. Beide
Varianten sind gleichwertig korrekt; das Ziel ist ausschließlich, dass ein reiner
Attribut-Wechsel ohne Positionsverschiebung zuverlässig eine Neuzeichnung auslöst.)

### 7.4 Bewusste Einschränkung: keine visuelle Live-Vorschau-Aufteilung für verschachtelte Umbrüche

`forcedBreakIndicesFrom` (7.2) betrachtet **ausschließlich** direkte Top-Level-Kinder von
`doc`. Ein `breakBefore: true` auf einem Absatz **innerhalb** eines `list_item` (Grenzfall 5)
oder einer Tabellenzelle (Grenzfall 4) wird von der Live-Vorschau **nicht** in einen
zusätzlichen Seiten-Spacer umgesetzt. Das ist **keine neue Lücke dieses Tickets**, sondern
Konsequenz eines bereits bestehenden, im Code selbst dokumentierten Architektur-Constraints:

> „A block taller than a whole page is simply left to overflow that page rather than
> split — true intra-block splitting would require duplicating DOM nodes across pages,
> which ProseMirror's single-EditorView model doesn't support." — `pagination.ts:8–10`
> (unverändert)

Das gilt für automatische **und** manuelle Umbrüche gleichermaßen: die gesamte Paginierung
arbeitet ausschließlich auf Höhe von Top-Level-Blöcken; eine Liste oder Tabelle wird schon
heute nie *innerhalb* aufgeteilt. Datenebene (Schema, Commands, Import, Export,
Rundreise-Fähigkeit inkl. korrekter Listen-Nummerierung) ist davon **nicht** betroffen und
vollständig korrekt (Abschnitt 3.2 spaltet auf `list_item`-Ebene, bleibt in derselben
Liste) — nur die Live-Editor-Vorschau zeigt in diesem verschachtelten Fall keinen
zusätzlichen Seitenumbruch-Spacer an. Wird in Abschnitt 13 (Grenzfall 4/5) explizit als
befundetes, bewusst nicht behobenes Verhalten festgehalten (kein stiller Mangel).

### 7.5 `pagination.test.ts` — neue Testfälle

```ts
describe('computePageBreakIndices: forced (manual) breaks', () => {
  it('forces a break at the given index even when there is plenty of room left', () => {
    expect(computePageBreakIndices([100, 100, 100], 1000, new Set([2]))).toEqual([2])
  })

  it('never forces a break at index 0 (nothing precedes it)', () => {
    expect(computePageBreakIndices([100, 100], 1000, new Set([0]))).toEqual([])
  })

  it('resets the cumulative height after a forced break, so later overflow is measured fresh', () => {
    // page height 300: forced break at index 1 resets the running total; the following
    // [100, 250] would NOT overflow measured from zero, so no further break is expected.
    expect(computePageBreakIndices([100, 100, 250], 300, new Set([1]))).toEqual([1])
  })

  it('combines a forced break with a later natural overflow break correctly', () => {
    expect(computePageBreakIndices([100, 100, 200, 200], 300, new Set([1]))).toEqual([1, 3])
  })

  it('is a no-op (identical to no third argument) when the set is empty', () => {
    expect(computePageBreakIndices([100, 100, 100, 150], 300, new Set())).toEqual([3])
  })
})
```

---

## 8. DOCX-Export — `src/formats/docx/writer.ts`

`blockToDocx` (aktuell Zeilen 94–126), Fälle `paragraph` (101–105) und `heading`
(106–111) — synthetischer Run **vor** dem eigentlichen Inhalt (Anforderung 3.3/3.4):

```ts
function pageBreakRunXml(node: JsonNode): string {
  return node.attrs?.breakBefore ? '<w:r><w:br w:type="page"/></w:r>' : ''
}

case 'paragraph': {
  const align = (node.attrs?.align as string) ?? 'left'
  const numPr = listNumId ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${listNumId}"/></w:numPr>` : ''
  return `<w:p>${paragraphPropsXml(align, numPr)}${pageBreakRunXml(node)}${inlineToRuns(node.content)}</w:p>`
}
case 'heading': {
  const level = Number(node.attrs?.level ?? 1)
  const align = (node.attrs?.align as string) ?? 'left'
  const styleTag = `<w:pStyle w:val="${HEADING_STYLE_ID(level)}"/>`
  return `<w:p>${paragraphPropsXml(align, styleTag)}${pageBreakRunXml(node)}${inlineToRuns(node.content)}</w:p>`
}
```

- **Eindeutig unterscheidbar vom `hard_break`-Run** (`<w:r><w:br/></w:r>`, weiterhin ohne
  `w:type`, unverändert in `inlineToRuns:60`) — Anforderung 3.4 erfüllt, kein
  Verwechslungsrisiko, da beide Fälle an vollständig getrennten Code-Stellen erzeugt werden.
- **Nie `<w:lastRenderedPageBreak/>`** — trivial erfüllt, dieses Element wird an keiner
  Stelle des Writers je erzeugt.
- List-Fall (`bullet_list`/`ordered_list`, Zeilen 112–118) ruft für jedes `list_item`-Kind
  rekursiv `blockToDocx` auf — die obige Änderung greift dort automatisch mit, **keine**
  Zusatzänderung am Listen-Zweig nötig.

---

## 9. DOCX-Import — `src/formats/docx/reader.ts`

Der aufwendigste Teil, weil reale Dateien den Umbruch **innerhalb** eines Runs, an
**beliebiger** Position im Absatz codieren (belegt durch `saut_page.docx`, Zusatzbefund
0.3: beide echten Umbrüche stehen als **letzter** Run ihres jeweiligen Absatzes, gefolgt
von einem komplett separaten `<w:p>`).

### 9.1 `RunLike` — neue Art

```ts
interface RunLike {
  kind: 'text' | 'break' | 'image' | 'pageBreak'
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  imageRelId?: string
  imageAlt?: string
}
```

### 9.2 `decodeParagraphRuns` — `w:br`-Fallunterscheidung nach `w:type`

Aktuell (Zeilen 132–133):

```ts
} else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'br') {
  runs.push({ kind: 'break' })
}
```

Neu:

```ts
} else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'br') {
  const brType = child.getAttributeNS(OOXML_NAMESPACES.w, 'type')
  // Nur "page" ist im Geltungsbereich dieses Tickets ein manueller Seitenumbruch.
  // "column" (Spaltenumbruch) und alle anderen/unbekannten Werte werden bewusst wie ein
  // gewöhnlicher Zeilenumbruch behandelt (verlustfrei bzgl. Textinhalt, aber ohne
  // Sonderbedeutung) — Spaltenumbrüche sind nicht Gegenstand dieser Anforderung und
  // würden sonst fälschlich als Seitenumbruch fehlinterpretiert.
  runs.push({ kind: brType === 'page' ? 'pageBreak' : 'break' })
}
```

`<w:lastRenderedPageBreak>` bleibt weiterhin durch Abwesenheit eines eigenen Falls
ignoriert — jetzt **mit explizitem Kommentar** an der `if/else`-Kette dokumentiert:

```ts
// w:lastRenderedPageBreak (falls vorhanden) fällt hier bewusst durch: es ist ein von
// Word selbst erzeugter, rein informativer Marker für einen AUTOMATISCHEN Umbruch, kein
// manueller Seitenumbruch — Anforderung 3.5. Abgesichert durch
// docx/__tests__/roundtrip.test.ts ("ignores lastRenderedPageBreak…", Abschnitt 14.1)
// gegen die reale Fixture 60329.docx.
```

### 9.3 `paragraphToBlocks` — Aufsplitten an `pageBreak`-Runs, Rückgabe erweitert

Aktuell liefert die Funktion (Zeilen 146–183) `JsonNode[]`. Neue Signatur:
`{ blocks: JsonNode[]; endsWithPageBreak: boolean }`. Die bestehende Bild-Aufsplitt-Logik
(Puffer/`flush`, Zeilen 164–182) wird um den `pageBreak`-Fall erweitert:

```ts
function paragraphToBlocks(
  pEl: Element,
  headingInfo: HeadingInfo,
  imageRels: Map<string, string>,
): { blocks: JsonNode[]; endsWithPageBreak: boolean } {
  // … align/level/styleId wie bisher (Zeilen 147–153) …
  const runs = decodeParagraphRuns(pEl)
  const hasImage = runs.some((r) => r.kind === 'image')
  const hasPageBreak = runs.some((r) => r.kind === 'pageBreak')

  if (!hasImage && !hasPageBreak) {
    const content = runsToInline(runs)
    const block = level
      ? { type: 'heading', attrs: { level, align }, content }
      : { type: 'paragraph', attrs: { align }, content }
    return { blocks: [block], endsWithPageBreak: false }
  }

  const blocks: JsonNode[] = []
  let buffer: RunLike[] = []
  let pendingBreakBefore = false
  const makeBlock = (content: JsonNode[]): JsonNode =>
    level
      ? { type: 'heading', attrs: { level, align, breakBefore: pendingBreakBefore }, content }
      : { type: 'paragraph', attrs: { align, breakBefore: pendingBreakBefore }, content }
  const flush = () => {
    if (buffer.length === 0) { pendingBreakBefore = false; return }
    blocks.push(makeBlock(runsToInline(buffer)))
    buffer = []
    pendingBreakBefore = false
  }
  for (const run of runs) {
    if (run.kind === 'image') {
      flush()
      const target = run.imageRelId ? imageRels.get(run.imageRelId) : undefined
      attachPendingBreakBefore(blocks, pendingBreakBefore, () => blocks.push({
        type: 'image', attrs: { src: target ?? '', alt: run.imageAlt ?? '' },
      }))
      pendingBreakBefore = false
    } else if (run.kind === 'pageBreak') {
      flush()
      pendingBreakBefore = true
    } else {
      buffer.push(run)
    }
  }
  const endsWithPageBreak = pendingBreakBefore
  if (!endsWithPageBreak) flush()
  return { blocks, endsWithPageBreak }
}
```

`runsToInline` (Zeile 185–190) muss zusätzlich `pageBreak`-Runs aus dem Inline-Ergebnis
herausfiltern (sie sind reine Strukturmarker, kein Inhalt):

```ts
function runsToInline(runs: RunLike[]): JsonNode[] {
  return runs
    .filter((r) => r.kind !== 'image' && r.kind !== 'pageBreak')
    .map((r) => (r.kind === 'break' ? { type: 'hard_break' } : { type: 'text', text: r.text ?? '', marks: r.marks }))
    .filter((n) => n.type !== 'text' || n.text)
}
```

**Wichtig — kein erzwungenes leeres Fragment am Absatzende:** steht `pageBreak` als
**letzter** Run des Absatzes (genau der in `saut_page.docx` beobachtete reale Fall), bleibt
`buffer` beim Erreichen des Schleifenendes leer — `flush()` wird dann **bewusst nicht**
aufgerufen (`if (!endsWithPageBreak) flush()`), und `endsWithPageBreak = true` wird an den
Aufrufer zurückgegeben. Der Aufrufer (`readBodyChildren`, 9.4) entscheidet, ob der nächste
`<w:p>`/`<w:tbl>` das Attribut übernimmt oder — am Dokumentende — ein neuer leerer Absatz
synthetisiert wird. Eine frühere Entwurfs-Idee dieses Plans, hier **immer** ein leeres
Fragment mit `breakBefore: true` zu erzwingen, wäre **falsch** gewesen: bei einem Umbruch
am Absatzende mit direkt folgendem `<w:p>` (der Normalfall lt. `saut_page.docx`) entstünde
dadurch ein überflüssiger, in echten Word-/LibreOffice-Dateien nicht vorhandener leerer
Zwischenabsatz.

### 9.4 Neuer Shared Helper `attachPendingBreakBefore` — siehe Abschnitt 10

### 9.5 `readBodyChildren` — Weiterreichen über Absatz-/Tabellengrenzen hinweg

Aktuell (Zeilen 307–328):

```ts
async function readBodyChildren(bodyEl, headingInfo, kindByNumId, imageRels, zip) {
  const items: Array<{ marker: ListMarker; block: JsonNode }> = []
  for (const child of Array.from(bodyEl.children)) {
    if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'p') {
      const marker = listMarkerFor(child)
      for (const block of paragraphToBlocks(child, headingInfo, imageRels)) {
        items.push({ marker: block.type === 'paragraph' ? marker : { numId: null }, block })
      }
    } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'tbl') {
      items.push({ marker: { numId: null }, block: parseTable(child, headingInfo, imageRels) })
    }
  }
  const grouped = groupLists(items, kindByNumId)
  await resolveImageSources(zip, grouped)
  return grouped
}
```

Neu:

```ts
async function readBodyChildren(bodyEl, headingInfo, kindByNumId, imageRels, zip) {
  const items: Array<{ marker: ListMarker; block: JsonNode }> = []
  let pendingBreakBefore = false
  for (const child of Array.from(bodyEl.children)) {
    if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'p') {
      const marker = listMarkerFor(child)
      const { blocks, endsWithPageBreak } = paragraphToBlocks(child, headingInfo, imageRels)
      attachPendingBreakBefore(blocks, pendingBreakBefore)
      pendingBreakBefore = endsWithPageBreak
      for (const block of blocks) {
        items.push({ marker: block.type === 'paragraph' ? marker : { numId: null }, block })
      }
    } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'tbl') {
      const blocks = [parseTable(child, headingInfo, imageRels)]
      attachPendingBreakBefore(blocks, pendingBreakBefore)
      pendingBreakBefore = false
      for (const block of blocks) items.push({ marker: { numId: null }, block })
    }
  }
  // Grenzfall 2/10 — Umbruch am Dokumentende: hier, nicht im ODT-Writer (siehe
  // Abschnitt 1.1/1.2), lebt der von seitenumbruch-req.md Abschnitt 3.6 antizipierte
  // Fallback tatsächlich.
  if (pendingBreakBefore) {
    items.push({
      marker: { numId: null },
      block: { type: 'paragraph', attrs: { align: 'left', breakBefore: true }, content: [] },
    })
  }
  const grouped = groupLists(items, kindByNumId)
  await resolveImageSources(zip, grouped)
  return grouped
}
```

`parseTable`s eigener rekursiver `paragraphToBlocks`-Aufruf für Zelleninhalte (aktuell
Zeile 236) wird zu `paragraphToBlocks(p, headingInfo, imageRels).blocks` angepasst;
`endsWithPageBreak` wird dort **bewusst verworfen** — keine Weiterreichung über
Zellen-/Zeilen-/Tabellengrenzen hinweg (konsistente Scope-Entscheidung mit Grenzfall 4,
Abschnitt 7.4: ein Umbruch, der wörtlich als letzter Run einer Tabellenzelle steht, ist ein
extrem seltener Grenzfall ohne reale Fixture-Evidenz und bleibt lokal auf die Zelle
beschränkt, verlustfrei aber ohne Cross-Zellen-Wirkung).

`readBodyChildren` wird unverändert auch für Kopf-/Fußzeilen-Inhalt aufgerufen
(`readDocx`, Zeilen 363/372) — ein Seitenumbruch-Attribut in einer Kopf-/Fußzeile ist
semantisch wirkungslos, wird aber verlustfrei mit übernommen (kein Sonderfall nötig,
außerhalb des Geltungsbereichs dieser Anforderung laut deren einleitendem Abschnitt).

---

## 10. Neu: `src/formats/shared/pageBreakBlocks.ts`

Kleines, ProseMirror-/React-freies Hilfsmodul (dieselbe Layer-Begründung wie
`src/formats/shared/imageFallback.ts` aus dem `einfuegen`-Ticket: der Reader/Writer-Layer
bleibt bewusst frei von `prosemirror-model`/React-Abhängigkeiten), von **beiden** Readern
(`docx/reader.ts` **und** `odt/reader.ts`, Abschnitt 12) importiert, um Drift zwischen zwei
unabhängig gepflegten Kopien derselben Logik zu vermeiden:

```ts
interface MinimalBlockNode {
  type: string
  attrs?: Record<string, unknown>
}

/** Attaches a pending "manual page break before this" flag (propagated across an
 *  element/paragraph boundary — from a trailing w:br[type=page] run in DOCX, or a
 *  fo:break-after="page" style in ODF) onto the first upcoming block. If that block is a
 *  paragraph/heading, the flag becomes its `breakBefore` attribute directly. If it is
 *  anything else (image, table — neither carries `breakBefore` in the schema) or if there
 *  is no upcoming block at all (this was the last element in the document body), a new
 *  empty paragraph carrying the flag is inserted/appended instead — never silently
 *  dropped (kein stiller Datenverlust, FEATURE-SPEC-DOCX-ODT.md Abschnitt 18). */
export function attachPendingBreakBefore<T extends MinimalBlockNode>(
  blocks: T[],
  pending: boolean,
): void {
  if (!pending) return
  const first = blocks[0]
  if (first && (first.type === 'paragraph' || first.type === 'heading')) {
    first.attrs = { ...first.attrs, breakBefore: true }
    return
  }
  blocks.unshift({
    type: 'paragraph',
    attrs: { align: 'left', breakBefore: true },
    content: [],
  } as unknown as T)
}
```

Wiederverwendet an **drei** Stellen: DOCX-Reader (9.3 innerhalb eines Absatzes vor einem
eingebetteten Bild, 9.5 über Absatz-/Tabellengrenzen hinweg inkl. Dokumentende) und
ODT-Reader (12.3, über Element-Grenzen hinweg inkl. Dokumentende) — eine einzige,
gemeinsam getestete Implementierung statt vier potenziell divergierender Kopien.

---

## 11. ODT-Export — `src/formats/odt/writer.ts` + `src/formats/odt/styleRegistry.ts`

### 11.1 `styleRegistry.ts` — Style-Erzeugung um `breakBefore`-Dimension erweitern

Bestehendes, endliches Enumerations-Muster (4 Ausrichtungen für Absätze, Zeilen 61–75;
6 Ebenen × 4 Ausrichtungen für Überschriften, Zeilen 77–93) wird um eine zusätzliche
boolesche Dimension erweitert — **kein** Architekturwechsel, nur Verdopplung der
vorhandenen Enumeration, analog zum bestehenden Muster:

```ts
export function paragraphStyleName(align: string, breakBefore: boolean): string {
  const base = PARAGRAPH_ALIGN_STYLE_NAME[align] ?? PARAGRAPH_ALIGN_STYLE_NAME.left
  return breakBefore ? `${base}-break` : base
}

export function paragraphAlignStyleDefs(): string {
  return Object.entries(PARAGRAPH_ALIGN_STYLE_NAME)
    .flatMap(([align, name]) => [
      `<style:style style:name="${name}" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:text-align="${align}"/></style:style>`,
      `<style:style style:name="${name}-break" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:text-align="${align}" fo:break-before="page"/></style:style>`,
    ])
    .join('')
}

export function headingStyleName(level: number, align: string, breakBefore: boolean): string {
  return `Heading${level}-${align}${breakBefore ? '-break' : ''}`
}

export function headingStyleDefs(): string {
  return Object.entries(HEADING_FONT_SIZES)
    .flatMap(([level, size]) =>
      ALIGNS.flatMap((align) => [
        `<style:style style:name="${headingStyleName(Number(level), align, false)}" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:text-align="${align}"/><style:text-properties fo:font-weight="bold" fo:font-size="${size}pt"/></style:style>`,
        `<style:style style:name="${headingStyleName(Number(level), align, true)}" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:text-align="${align}" fo:break-before="page"/><style:text-properties fo:font-weight="bold" fo:font-size="${size}pt"/></style:style>`,
      ]),
    )
    .join('')
}
```

`PARAGRAPH_ALIGN_STYLE_NAME` selbst (Zeilen 61–66) bleibt unverändert — weiterhin die
„ohne Umbruch"-Namen, direkt referenziert von `paragraphStyleName(align, false)`.

### 11.2 `writer.ts` — Aufrufstellen anpassen

`blockToOdt` (Zeilen 61–123), Fälle `paragraph` (63–68) und `heading` (69–74):

```ts
case 'paragraph': {
  const align = (node.attrs?.align as string) ?? 'left'
  const styleName = paragraphStyleName(align, Boolean(node.attrs?.breakBefore))
  const inner = inlineToOdt(node.content, styles)
  return `<text:p text:style-name="${styleName}">${inner}</text:p>`
}
case 'heading': {
  const level = Number(node.attrs?.level ?? 1)
  const align = (node.attrs?.align as string) ?? 'left'
  const styleName = headingStyleName(level, align, Boolean(node.attrs?.breakBefore))
  const inner = inlineToOdt(node.content, styles)
  return `<text:h text:style-name="${styleName}" text:outline-level="${level}">${inner}</text:h>`
}
```

Import-Zeile (aktuell Zeile 4–14) um `paragraphStyleName` ergänzen (ersetzt den bisherigen
direkten `PARAGRAPH_ALIGN_STYLE_NAME`-Import, der dann nur noch intern in
`styleRegistry.ts` gebraucht wird).

**Kein Fallback für „Umbruch am Dokumentende" nötig** (siehe Begründung Abschnitt 1.1) —
`breakBefore` sitzt in diesem Modell immer auf einem real existierenden Knoten, auch wenn
dieser Knoten (wie in 9.5 beschrieben) erst vom DOCX-**Reader** synthetisiert wurde, bevor
er den ODT-Writer überhaupt erreicht.

---

## 12. ODT-Import — `src/formats/odt/reader.ts`

### 12.1 `ParsedStyles` — neue Map

Aktuell (Zeilen 22–26):

```ts
interface ParsedStyles {
  textStyles: Map<string, RunStyle>
  paragraphAligns: Map<string, string>
  listKinds: Map<string, 'bullet' | 'ordered'>
}
```

Neu: `paragraphBreaks: Map<string, { before: boolean; after: boolean }>` ergänzen.

### 12.2 `parseAutomaticStyles` — `fo:break-before`/`fo:break-after` lesen

Im `family === 'paragraph'`-Zweig (aktuell Zeilen 62–66):

```ts
} else if (family === 'paragraph') {
  const props = firstChildNS(styleEl, ODF_NAMESPACES.style, 'paragraph-properties')
  const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
  if (align) paragraphAligns.set(name, align)

  // Nur der Wert "page" ist im Geltungsbereich (Anforderung 3.6/3.7) — "column"/"auto"
  // und alle anderen Werte werden bewusst NICHT als Seitenumbruch gewertet (analoge
  // Entscheidung zu w:type="column" im DOCX-Reader, Abschnitt 9.2).
  const before = props?.getAttributeNS(ODF_NAMESPACES.fo, 'break-before') === 'page'
  const after = props?.getAttributeNS(ODF_NAMESPACES.fo, 'break-after') === 'page'
  if (before || after) paragraphBreaks.set(name, { before, after })
}
```

Reale Belegung: `pagebreaks.odt`s `P1`/`P2` (`break-before`) und `P3` (`break-after`,
Zusatzbefund 0.4) — beide Fälle müssen für diese eine reale Datei korrekt gelesen werden.

**Nicht umgesetzt (dokumentierte Lücke, kein Blocker):** vollständige
`style:parent-style-name`-Vererbungskette über `office:styles` (benannte/„common" Styles,
in `content.xml` **und** `styles.xml`) hinweg — die Anforderung (3.7) verlangt das zwar
wörtlich („direkt … oder über einen per Style-Vererbung wirksamen Wert"), aber **keine**
der unter 0.3 gesichteten realen Fixtures benötigt das (alle deklarieren
`fo:break-before`/`fo:break-after` direkt auf dem referenzierten Automatic-Style selbst,
auch wenn dieser wiederum `style:parent-style-name="Standard"` trägt — die Vererbung
betrifft dort nur andere Eigenschaften, nicht den Umbruch selbst). Sollte künftig eine
Fixture auftauchen, die das braucht, ist das ein Nachtrag zu diesem Plan, keine Annahme
für die aktuelle Abnahme.

### 12.3 `paragraphToBlocks`/`elementToBlocks` — Attribut setzen + `endsWithBreakAfter` melden

Anders als bei DOCX gibt es **keine** Inline-Aufsplitt-Logik nötig (ODF-Umbrüche sind reine
Style-Attribute, nie inline im Textfluss) — nur Attribut-Übernahme + Signal für die
Grenz-Weiterreichung. `paragraphToBlocks` (Zeilen 122–157) und der `text:h`-Zweig von
`elementToBlocks` (Zeilen 170–175) werden erweitert, ihr Rückgabewert für den
**Top-Level-Aufruf** (siehe 12.4) auf `{ blocks: JsonNode[]; endsWithBreakAfter: boolean }`
umgestellt; `align`-Ermittlung (Zeile 126/173) bekommt eine Schwester-Ermittlung:

```ts
const breakInfo = (styleName && styles.paragraphBreaks.get(styleName)) || { before: false, after: false }
// … in jedem erzeugten paragraph/heading-JsonNode: attrs: { align, breakBefore: breakInfo.before, ... }
```

`endsWithBreakAfter = breakInfo.after` wird von der **Top-Level**-Aufrufstelle
(`readOfficeTextChildren`, 12.4) ausgewertet; rekursive Aufrufe **innerhalb** von
`text:list`/`table:table` (Zeilen 179–203) verwerfen dieses Signal bewusst (identische,
konsistente Scope-Entscheidung zu Abschnitt 9.5/7.4 — kein Weiterreichen über
Zellen-/Listen-Grenzen hinweg). Ein `breakBefore`/`fo:break-before` **innerhalb** eines
`text:list-item` oder einer `table:table-cell` wird trotzdem korrekt gelesen und
verlustfrei auf dem jeweiligen verschachtelten Knoten abgelegt (bestätigt exakt den in
`no_pagebreak.odt`/Zusatzbefund D beobachteten Fall: das Attribut wird übernommen, aber
nicht zu einem sichtbaren Seiten-Spacer, siehe Abschnitt 7.4).

### 12.4 `readOfficeTextChildren` — Weiterreichen über Element-Grenzen hinweg

Aktuell (Zeilen 233–237):

```ts
async function readOfficeTextChildren(bodyTextEl: Element, styles: ParsedStyles, zip: JSZip): Promise<JsonNode[]> {
  const blocks = Array.from(bodyTextEl.children).flatMap((child) => elementToBlocks(child, styles))
  await resolveImageSources(zip, blocks)
  return blocks
}
```

Neu:

```ts
async function readOfficeTextChildren(bodyTextEl: Element, styles: ParsedStyles, zip: JSZip): Promise<JsonNode[]> {
  const blocks: JsonNode[] = []
  let pendingBreakBefore = false
  for (const child of Array.from(bodyTextEl.children)) {
    const childBlocks = elementToBlocks(child, styles)
    attachPendingBreakBefore(childBlocks, pendingBreakBefore)
    blocks.push(...childBlocks)
    // Nur text:p/text:h melden ein etwaiges fo:break-after; text:list/table:table geben
    // hier strukturell kein Signal (siehe 12.3) — endsWithBreakAfter wird direkt aus dem
    // *letzten* erzeugten Blocks-Eintrag gelesen, weil elementToBlocks für text:p/text:h
    // immer genau einen Block liefert.
    pendingBreakBefore =
      (child.namespaceURI === ODF_NAMESPACES.text && (child.localName === 'p' || child.localName === 'h')) &&
      Boolean((childBlocks[childBlocks.length - 1] as { attrs?: { breakAfterHint?: boolean } })?.attrs?.breakAfterHint)
  }
  if (pendingBreakBefore) {
    blocks.push({ type: 'paragraph', attrs: { align: 'left', breakBefore: true }, content: [] })
  }
  await resolveImageSources(zip, blocks)
  return blocks
}
```

**Hinweis zur genauen Signal-Übergabe:** da `elementToBlocks` (anders als der DOCX-Reader,
der dafür extra `{blocks, endsWithPageBreak}` zurückgibt) an vielen Stellen rekursiv
verschachtelt aufgerufen wird (Listen/Tabellen, 12.3), ist es einfacher, das
„hat `fo:break-after`"-Signal **vorübergehend** als internes, nicht exportiertes
Pseudo-Attribut `breakAfterHint` auf dem erzeugten `paragraph`/`heading`-JsonNode
mitzuführen (wie oben skizziert) und es in `readOfficeTextChildren` unmittelbar nach dem
Auslesen wieder zu entfernen (`delete node.attrs.breakAfterHint`), statt die Rückgabetypen
von `elementToBlocks` und all seinen rekursiven Fällen (Listen, Tabellen) auf ein
Tupel umzustellen — das hielte den Diff deutlich kleiner und lokaler. Alternative,
gleichwertig saubere Variante: `elementToBlocks` auf `{blocks, endsWithBreakAfter}`
umstellen wie beim DOCX-Reader, mit `endsWithBreakAfter: false` als Default in allen
rekursiven/Listen-/Tabellen-Zweigen — reine Geschmacksfrage, in der Umsetzung zu
entscheiden; **wichtig ist nur, dass am Ende exakt ein Signalweg existiert, konsistent
für `text:p` und `text:h`, und dass `breakAfterHint` (falls Variante 1 gewählt wird)
niemals im tatsächlich nach außen zurückgegebenen `WordDocumentContent`/`ProseMirrorJSON`
landet** (sonst schriebe `wordSchema.nodeFromJSON` beim Laden eine Exception, da
`breakAfterHint` kein deklariertes Attribut von `paragraph`/`heading` ist).

### 12.5 `text:soft-page-break` und `text:use-soft-page-breaks` — bewusst ignoriert

`decodeInline`s `walk`-Funktion (Zeilen 96–116) hat für `text:soft-page-break` **keinen**
eigenen Fall — das Element fällt bereits heute stillschweigend durch (weder Text-Knoten
noch einer der behandelten `text:span`/`line-break`/`s`/`tab`-Fälle). Das ist **korrekt**
(Anforderung 3.7: „darf nicht als manueller Seitenumbruch fehlinterpretiert werden"), muss
aber wie beim DOCX-Pendant (Abschnitt 9.2) durch einen **expliziten Kommentar** an der
`walk`-Funktion **und** einen Test gegen die reale Fixture `text-extract.odt`
(Zusatzbefund 0.3) abgesichert werden, damit es nicht „richtig durch Zufall" bleibt:

```ts
// text:soft-page-break (falls vorhanden) fällt hier bewusst durch: es ist ein reiner
// Paginierungs-Hinweis für den Renderer, KEIN erzwungener Seitenumbruch — Anforderung
// 3.7. Abgesichert durch odt/__tests__/roundtrip.test.ts gegen die reale Fixture
// text-extract.odt (Abschnitt 14.1).
```

Das Dokument-Attribut `text:use-soft-page-breaks="true"` auf `<office:text>` (in mehreren
der realen Fixtures vorhanden, z. B. `pagebreaks.odt`) wird an keiner Stelle des Readers
ausgewertet und braucht das auch nicht — reiner Darstellungs-Hinweis auf Dokumentebene,
ohne Bezug zu einzelnen Umbrüchen.

---

## 13. Grenzfälle-Mapping (Anforderung Abschnitt 4)

| # | Grenzfall | Umsetzung |
|---|---|---|
| 1 | Umbruch am Dokumentanfang | Kein Sonderfall: `insertPageBreak` splittet auch an Position 0 (Abschnitt 3.2), Ergebnis ist eine leere führende Seite gefolgt vom Original-Inhalt — entspricht exakt echtem Word-Verhalten (Ctrl+Enter am Dokumentanfang erzeugt ebenfalls eine leere erste Seite), **kein** No-Op. Import einer Fremddatei mit `breakBefore` auf dem allerersten Knoten: verlustfrei übernommen, aber von der Live-Vorschau nicht als „erzwungen" behandelt (Index 0 wird von `computePageBreakIndices`/`forcedBreakIndicesFrom` bewusst ausgenommen, Abschnitt 7.1/7.2 — es gibt nichts, was „beendet" werden müsste) |
| 2 | Umbruch am Dokumentende | `insertPageBreak` erzeugt eine neue leere Folgeseite (Split erzeugt immer einen zweiten Knoten, auch am Dokumentende). Import: DOCX-Reader synthetisiert bei Bedarf einen leeren Absatz (Abschnitt 9.5), ODT-Writer braucht dafür keinen Fallback (Abschnitt 1.1/11.2) |
| 3 | Zwei aufeinanderfolgende Umbrüche | Kein Zusammenfassen: jeder Top-Level-Knoten mit `breakBefore: true` erzeugt unabhängig einen eigenen erzwungenen Bruch-Index (Abschnitt 7.1); zwei benachbarte leere Absätze mit je `breakBefore: true` ergeben zwei Brüche, eine vollständig leere Seite dazwischen |
| 4 | Umbruch in Tabellenzelle | Bewusste Abweichung, gestützt durch reale Evidenz (`no_pagebreak.odt`, Zusatzbefund D): `insertPageBreak` fällt in Tabellenzellen auf `hard_break` zurück (Abschnitt 3.2); ein aus einer Fremddatei importierter, dennoch vorhandener `breakBefore` in einer Zelle wird verlustfrei gelesen, aber von der Live-Vorschau nicht visuell umgesetzt (Abschnitt 7.4) — keine Tabellenstruktur-Beschädigung, kein Absturz |
| 5 | Umbruch in Listenpunkt | Split bis `list_item` (Abschnitt 3.2), Nummerierung bleibt lückenlos, weil es **dieselbe** Liste bleibt (keine Top-Level-Aufspaltung, Abschnitt 3.3 begründet die verworfene Alternative). Live-Vorschau zeigt keinen zusätzlichen Seiten-Spacer (Abschnitt 7.4, vorbestehender Architektur-Constraint) — Datenebene/Rundreise vollständig korrekt |
| 6 | Umbruch mitten in Überschrift | Split-Regel repliziert `splitBlock`s eigene „atEnd && deflt"-Logik (Abschnitt 3.2): am Ende der Überschrift wird der zweite Teil `paragraph`, mittendrin bleibt er `heading` desselben Levels — konsistent mit generischem Enter-Verhalten (`baseKeymap`) |
| 7 | Einfügen + weitertippen (Selection-Sync-Regression) | Strukturell unauffällig (Abschnitt 4): normale Transaktion über `dispatchTransaction`, kein DOM-Mutation-ohne-Transaktion-Pfad. Pflicht-Regressionstest in `selection-regression.spec.ts` (Abschnitt 14.4) |
| 8 | Kurzes Dokument mit einem Umbruch | Erzwungener Bruch erzeugt zwei Seiten unabhängig von Höhen (Abschnitt 7.1, `forced`-Zweig ignoriert `pageContentHeight`) — bewusst zu unterscheiden vom in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8 als offen markierten *ungewollten* Leerraum-Verdacht: hier ist der Zusatzraum eindeutig auf ein vom Nutzer gesetztes `breakBefore`-Attribut zurückzuführen (per DOM-Attribut/Klasse aus Abschnitt 6.1/7.2 nachweisbar), nicht auf denselben ungeklärten Rendering-Fehler |
| 9 | Import mehrerer Umbrüche | Jeder `<w:br w:type="page"/>`/`fo:break-before`/`fo:break-after` wird unabhängig verarbeitet (Schleifen in 9.5/12.4 über alle Kinder), keine Beschränkung auf „nur ersten/letzten" |
| 10 | Cross-Format-Rundreise DOCX→ODT→DOCX, Umbruch am Dokumentende | Kein zusätzlicher Leerabsatz-Rest zu erwarten: DOCX-Reader synthetisiert höchstens **einen** trailing-Absatz (9.5), ODT-Export/-Reimport verändert dessen Anzahl nicht weiter (kein eigener Fallback-Mechanismus dort, Abschnitt 1.1) — zu verifizieren per Test 14.3 |
| 11 | Löschen des Absatzes nach einem (ODT-seitig als Attribut realisierten) Umbruch | Festgelegtes Verhalten: normales Backspace/Entf **auf den Absatz selbst** (nicht `removePageBreakBackward`/`-Forward`, die nur an der exakten Grenze greifen) löscht ihn wie jeden anderen Absatz inkl. seines `breakBefore`-Attributs — der Umbruch verschwindet **mit** dem Absatz, wandert **nicht** automatisch zum neuen Nachbarn. Bewusst einfache, vorhersagbare Regel (kein implizites „Attribut wandert" - Verhalten), dokumentiert als Antwort auf die von der Anforderung offen gelassene Frage |
| 12 | Umbruch direkt vor/nach Bild/Tabelle | GapCursor-Fall über den `insertStandaloneFallback`-Zweig abgedeckt (Abschnitt 3.2): erzeugt einen eigenen leeren Absatz mit `breakBefore: true` neben dem Bild/der Tabelle, keine Verschiebung/Duplizierung des Bild-/Tabellen-Knotens selbst |
| 13 | Strg+Z direkt nach Einfügen | Ein einziger Undo-Schritt (Abschnitt 3.2: eine Transaktion für Delete-Selection+Split+Attribut) — Standard-`prosemirror-history`-Verhalten, kein Zusatzcode nötig |

---

## 14. Tests

### 14.1 Neue/erweiterte Unit-Tests

| Datei | Neue Fälle |
|---|---|
| `src/formats/shared/editor/__tests__/commands.test.ts` (**neu**) | `insertPageBreak`: teilt Absatz an Cursor-Position, zweiter Teil trägt `breakBefore: true`, ein Undo-Schritt; über Selektion (ersetzt sie); am Dokumentanfang/-ende; in einer Liste (bleibt dieselbe Liste, `list_item`-Split); in einer Überschrift (mittendrin bleibt `heading`, am Ende wird `paragraph`); in einer Tabellenzelle (`hard_break`-Fallback, `isInTable`); GapCursor neben Bild (Standalone-Fallback). `removePageBreakBackward`/`-Forward`: löscht Attribut + merged Nachbarblock; kein Effekt, wenn Cursor nicht exakt an der Grenze steht; kein Crash am Dokumentanfang ohne Vorgänger |
| `src/formats/shared/editor/__tests__/pagination.test.ts` | Abschnitt 7.5 (5 neue `it`s für `forcedBreakIndices`) |
| `src/formats/docx/__tests__/roundtrip.test.ts` | `breakBefore: true` auf Absatz/Überschrift → Writer erzeugt exakt `<w:br w:type="page"/>` als erster Run, **nicht** `<w:br/>` ohne Attribut, **nicht** `<w:lastRenderedPageBreak/>`; Rundreise (write→read) erhält `breakBefore` exakt; zwei Absätze mit Umbruch dazwischen → Umbruch bleibt an der richtigen Stelle |
| `src/formats/docx/__tests__/external-fixtures.test.ts` **oder neue Datei** `src/formats/docx/__tests__/pagebreak.test.ts` | Gegen `saut_page.docx` (Zusatzbefund 0.3): importierte Struktur enthält an den erwarteten Stellen `breakBefore: true`, der eingebettete einfache `<w:br/>` bleibt `hard_break`; gegen `60329.docx`: **kein** Knoten im Ergebnis hat `breakBefore: true` (die 3 `lastRenderedPageBreak` werden vollständig ignoriert) |
| `src/formats/odt/__tests__/roundtrip.test.ts` | `breakBefore: true` → Writer erzeugt `fo:break-before="page"` im Style des Absatzes selbst; Rundreise erhält es; `fo:break-after`-Import (synthetisches XML) → Attribut landet korrekt auf dem **nächsten** Absatz |
| `src/formats/odt/__tests__/external-fixtures.test.ts` **oder neue Datei** `src/formats/odt/__tests__/pagebreak.test.ts` | Gegen `pagebreaks.odt`: `P1`/`P2` (`break-before`) UND `P3` (`break-after`) ergeben zusammen die erwartete Abfolge inkl. korrekt verschobenem Umbruch für den `P3`-Fall; gegen `AB_pageBreakBefore.odt`/`pageBreakProblem.odt`: einfacher Fall; gegen `no_pagebreak.odt`: `breakBefore: true` wird zwar auf dem verschachtelten Tabellenzellen-Absatz gelesen (kein Datenverlust), aber `forcedBreakIndicesFrom`-Äquivalent auf Editor-Ebene ignoriert es (kein zusätzlicher Top-Level-Bruch); gegen `text-extract.odt`: **kein** `breakBefore: true` irgendwo im Ergebnis (das enthaltene `text:soft-page-break` wird nicht fehlinterpretiert) |

### 14.2 E2E-Tests (Playwright)

Neue Datei `tests/e2e/seitenumbruch.spec.ts`, Aufbau wie `tests/e2e/selection-regression.spec.ts`
(`docxCard`/`odtCard`-Helper, `page.locator('.ProseMirror')`):

1. Toolbar-Klick auf „Seitenumbruch einfügen" **und** separat `ControlOrMeta+Enter` → in
   beiden Fällen erscheint ein `.page-break-spacer--manual`-Element im DOM, der Absatz
   danach trägt die Klasse `pm-page-break-before`.
2. Nach dem Einfügen: `page.keyboard.type(...)` landet sichtbar **nach** dem
   Spacer/Label (Testplan Punkt 3 der Anforderung).
3. **Pflicht-Regressionssequenz** (direkt im Anschluss an Testfall 1, Testplan Punkt 4 der
   Anforderung, Grenzfall 7): Text tippen → Seitenumbruch einfügen → `ControlOrMeta+a` →
   Fett → Klick zur Neupositionierung → `Enter` → weitertippen → beide Textteile bleiben
   erhalten (identische Technik wie `selection-regression.spec.ts:14–32`).
4. Backspace unmittelbar nach einem eingefügten Umbruch → Umbruch verschwindet, Text davor
   und danach bleibt unverändert, in einem Undo-Schritt rückgängig machbar
   (`ControlOrMeta+z`).
5. Visuelle Unterscheidbarkeit (Testplan Punkt 6): ein Dokument mit reichlich Freiraum
   (kein automatischer Umbruch zu erwarten) + einem manuellen Umbruch zeigt **genau ein**
   `.page-break-spacer--manual`-Element und **kein** einfaches `.page-break-spacer` ohne
   diesen Modifikator.
6. Feature-Rundreise (Anforderung 5.2, Testfall 1/2): Neues Dokument, zwei Absätze,
   Umbruch dazwischen → Export → `JSZip`-Prüfung auf `<w:br w:type="page"/>` bzw.
   `fo:break-before="page"` (Muster wie `docx.spec.ts:70–83`) → Re-Upload → Umbruch und
   beide Absätze weiterhin vorhanden. Einmal für die DOCX-Karte, einmal für die ODT-Karte.
7. Cross-Format (Anforderung 5.2, Testfall 3/4): Umbruch in einem DOCX-Dokument einfügen,
   als ODT exportieren (falls die App Cross-Format-Export unterstützt — sonst: DOCX
   exportieren → in der ODT-Karte reimportieren, je nach tatsächlichem App-Workflow zu
   verifizieren) → weiterhin vorhanden; umgekehrte Richtung ebenso.
8. Import einer echten Fremddatei (`tests/fixtures/external/docx/saut_page.docx` per
   `input.setInputFiles`, Muster wie `docx.spec.ts:85–97`) → Umbruch sichtbar als
   `pm-page-break-before` erkennbar → Export → Re-Import → weiterhin vorhanden. Ebenso für
   `tests/fixtures/external/odt/pagebreaks.odt`.

### 14.3 Rundreise-Tests (Anforderung Abschnitt 5)

- **5.1 Baseline:** bestehende `docx.spec.ts`/`odt.spec.ts`/beide `roundtrip.test.ts`/beide
  `external-fixtures.test.ts` müssen vor **und** nach allen Änderungen weiterhin grün
  bleiben — insbesondere `60329.docx` (nur `lastRenderedPageBreak`, darf nach der
  Erweiterung **weiterhin** keinen `breakBefore` erzeugen) und `text-extract.odt` (nur
  `soft-page-break`, ebenso).
- **5.2 Feature-Rundreise:** siehe 14.1 (Unit, Reader/Writer-Ebene) **und** 14.2 Punkte 6–8
  (E2E, echte Bedienung + echter Download/Re-Upload) — beide Ebenen sind laut Testplan
  Punkt 7 der Anforderung verpflichtend, nicht nur eine.

### 14.4 Regressionstest-Pflicht (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2)

14.2 Punkt 3 wird zusätzlich als eigener `test()` in den bestehenden
`describe`-Block von `tests/e2e/selection-regression.spec.ts` (Zeilen 7–72) aufgenommen —
nicht nur in der neuen `seitenumbruch.spec.ts` —, damit er dauerhaft Teil der
Selection-Sync-Regressions-Suite bleibt und nicht versehentlich isoliert vergessen wird.

---

## 15. Reihenfolge der Umsetzung

1. Schema (Abschnitt 2) + `commands.ts` (Abschnitt 3) + Unit-Tests dafür
   (`commands.test.ts`) — Datenmodell und Kernverhalten zuerst, unabhängig von
   Import/Export.
2. `WordEditor.tsx` (Abschnitt 4) + `Toolbar.tsx` (Abschnitt 5) — Bedienung sichtbar/
   erreichbar machen.
3. `pagination.ts` (Abschnitt 7) + `index.css` (Abschnitt 6.1) + Unit-Tests
   (Abschnitt 7.5) — visuelle Kennzeichnung.
4. `docx/writer.ts` (Abschnitt 8) + Unit-Tests — DOCX-Export.
5. `shared/pageBreakBlocks.ts` (Abschnitt 10) + `docx/reader.ts` (Abschnitt 9) +
   Unit-/Fixture-Tests gegen `saut_page.docx`/`60329.docx` — DOCX-Import, der
   aufwendigste Einzelschritt.
6. `styleRegistry.ts` + `odt/writer.ts` (Abschnitt 11) + Unit-Tests — ODT-Export.
7. `odt/reader.ts` (Abschnitt 12) + Unit-/Fixture-Tests gegen `pagebreaks.odt`,
   `AB_pageBreakBefore.odt`, `no_pagebreak.odt`, `text-extract.odt` — ODT-Import.
8. Baseline-Rundreise (14.3) gegen alle bestehenden Tests laufen lassen — muss grün
   bleiben, bevor E2E-Tests ergänzt werden.
9. `tests/e2e/seitenumbruch.spec.ts` (Abschnitt 14.2) + Ergänzung in
   `selection-regression.spec.ts` (Abschnitt 14.4).
10. Grenzfälle-Liste (Abschnitt 13) einzeln gegenprüfen und Ergebnis dokumentieren.
11. `npm run build` (`tsc -b`, `noUnusedLocals`/`noUnusedParameters: true` laut
    `tsconfig.app.json:20`) tatsächlich ausführen — insbesondere nach Abschnitt 9/12, da
    dort mehrere Funktionssignaturen geändert werden und alle Aufrufstellen (`parseTable`,
    Header-/Footer-Pfade) synchron mitgezogen werden müssen.

---

## 16. Abnahme-Checkliste (Bezug: `seitenumbruch-req.md` Abschnitt 7)

- [ ] Toolbar-Button, `Mod-Enter`, sichtbare Kennzeichnung, Löschen via Entf/Backspace —
      alle vier tatsächlich vorhanden und funktionsfähig (Abschnitte 3–6).
- [ ] Alle Testfälle aus Abschnitt 14 automatisiert vorhanden und grün.
- [ ] Grenzfälle aus Abschnitt 13 einzeln befundet (funktioniert wie spezifiziert /
      bewusst abweichend + dokumentiert / repariert) — insbesondere Grenzfall 4/5 als
      „funktioniert auf Datenebene vollständig, Live-Vorschau mit dokumentierter,
      vorbestehender Einschränkung" festgehalten, nicht stillschweigend übergangen.
- [ ] Baseline-Rundreise (5.1) bleibt für **alle** bestehenden Tests grün, insbesondere
      `60329.docx` und `text-extract.odt` (Abschnitt 14.3).
- [ ] Feature-Rundreise (5.2) für DOCX, ODT, beide Cross-Format-Richtungen, inklusive der
      bereits im Repo vorhandenen realen Fixtures aus Abschnitt 0.3 (kein Beschaffen neuer
      Dateien nötig, entgegen der ursprünglichen Annahme in der Anforderungsdatei).
- [ ] Selection-Sync-Regressionstest mit Seitenumbruch-Sequenz (Abschnitt 14.4) grün und
      dauerhaft Teil von `selection-regression.spec.ts`.
- [ ] Zusammenspiel mit automatischer Paginierung (Abschnitt 7) geprüft und die bewusste
      Einschränkung aus Abschnitt 7.4 (keine Live-Vorschau-Aufteilung bei
      Listen-/Tabellen-Verschachtelung) explizit dokumentiert, nicht nur implizit belassen.
- [ ] `npm run build` läuft nach allen Änderungen fehlerfrei durch (Abschnitt 15 Punkt 11).

Erst wenn alle Punkte erfüllt sind, darf der Backlog-Status von `seitenumbruch` von
„fehlt" auf „vorhanden" wechseln — andernfalls „teilweise" mit Verweis auf die konkret
offenen Punkte, analog zur in `seitenumbruch-req.md` Abschnitt 7 festgelegten Vorgehensweise.
