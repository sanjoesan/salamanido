# Umsetzungsplan: „Listenebene per Tab ändern" (`liste-einruecken-tab`)

Gegenstück zu `specs/liste-einruecken-tab-req.md`. Dieser Plan wurde gegen den
tatsächlichen Code-Stand vom 2026-07-04 verifiziert (jede unten zitierte Zeile wurde
gelesen, nicht nur aus der Anforderungsdatei übernommen). Alle Pfade sind relativ zu
`E:\docs`.

## 0. Ergebnis der Codeprüfung: Bestätigung + zwei zusätzliche Befunde

Der Code-Audit in `liste-einruecken-tab-req.md` (Zeilen 40–56) ist **zutreffend** —
jede dort zitierte Zeile wurde erneut gelesen und stimmt exakt (Keymap ohne
`Tab`/`Shift-Tab` in `WordEditor.tsx:71-80`, kein `sinkListItem`-Import in
`commands.ts`, nur ein Ebene-0-`<w:lvl>` in `styleDefs.ts:37-46`, harte
`w:ilvl="0"` in `writer.ts:103`, `numId`-Neuberechnung ohne Tiefenbezug in
`writer.ts:112-118`, generische aber ungetestete Rekursion in `odt/reader.ts:179-187`
und `odt/writer.ts:75-85`).

Zusätzlich zur Anforderungsdatei wurden beim Nachcodieren **zwei eigene, dort nicht
erwähnte Defekte** gefunden, die beide die geforderte Rundreise (Abschnitt 5 der
Anforderung) verhindern würden, selbst wenn nur die dort genannten Punkte behoben
würden:

1. **DOCX `parseNumberingXml` (`reader.ts:77-97`) ist „ebenen-blind“:** Für jeden
   `w:abstractNum` wird nur das **erste** `<w:lvl>`-Kind gelesen
   (`firstChildNS(abstractEl, ..., 'lvl')`, Zeile 83) und daraus **ein einziges**
   Bullet/Ordered-Flag für die gesamte `numId` abgeleitet. Eine reale Datei, die auf
   Ebene 0 Bullet und auf Ebene 1 Decimal verwendet (genau das legt der Dateiname
   `ComplexNumberedLists.docx` nahe), würde nach Fix von `w:ilvl` (Abschnitt 2 dieses
   Plans) zwar die Tiefe korrekt verschachteln, aber **beiden Ebenen denselben
   Listentyp** zuweisen — Testfall 5.1.4 (Abnahmekriterium 6) würde daran scheitern.
2. **ODT `listKinds` (`reader.ts:69-74`) ist ebenfalls „ebenen-blind“:** Es wird nur
   geprüft, ob **irgendwo** im `text:list-style` ein `text:list-level-style-number`
   vorkommt (`childElements(...).length > 0`, Zeile 72), unabhängig vom
   `text:level`-Attribut. Referenziert eine verschachtelte `<text:list>` (wie in ODF
   üblich) denselben Stilnamen wie die äußere Liste, aber mit anderem Symbol auf einer
   tieferen Ebene, bekäme die Unterliste fälschlich denselben Typ wie die oberste
   Ebene. Betrifft Testfall 5.2.2 und die reale Fixture `listLevel10.odt` (Name legt
   zehn Ebenen nahe).

Beide Punkte werden unten mit behoben (Abschnitt 3 und 5), da sie sonst denselben
Rundreiseverlust erzeugen wie die in der Anforderung bereits benannten Lücken.

Bestätigt außerdem als **korrekt und ausreichend, keine Änderung nötig**:
- `schema.ts:98-104` (`list_item`, `content: 'paragraph block*'`) — nimmt bereits
  verschachtelte `bullet_list`/`ordered_list` als Kind auf. `sinkListItem`/
  `liftListItem` aus `prosemirror-schema-list` arbeiten rein über `NodeType`-Vergleich
  (`node_modules/prosemirror-schema-list/dist/index.js:206-287`), nicht über
  `addListNodes`-Spezialschema — funktioniert also unverändert mit unserem
  handgeschriebenen Schema.
- `index.css:63-67` — Selektor `.ProseMirror ul`/`.ProseMirror ol` ist ein
  Nachfahren-Selektor und trifft **auch** verschachtelte `<ul>`/`<ol>`; `padding-left`
  addiert sich pro Verschachtelungsebene bereits heute. Da kein `list-style-type`
  gesetzt wird, greift zusätzlich das UA-Stylesheet des Browsers (Kreis/Scheibe/
  Quadrat-Wechsel bei `ul`, unabhängige Zählung je verschachtelter `ol`) — erfüllt
  Abschnitt 3.9/3.10 der Anforderung ohne Codeänderung.
- `prosemirror-tables`s `tableEditing()` (`WordEditor.tsx:82`) bindet keine eigene
  `Tab`-Taste (verifiziert: kein Treffer für `Tab` in
  `node_modules/prosemirror-commands/dist/index.js`, `tableEditing` selbst kommt aus
  `prosemirror-tables`, nicht `prosemirror-commands`, bindet aber ebenfalls keinen
  Keymap-Eintrag). Die neue Tab-Bindung erzeugt daher aktuell **keinen** Konflikt mit
  Tabellen-Navigation (die es noch nicht gibt, siehe Anforderung Zeile 134).

---

## 1. Design-Entscheidungen (vor der Implementierung festgelegt)

Die Anforderungsdatei lässt drei Punkte bewusst offen bzw. „zu verifizieren/
entscheiden" (Abschnitt 2 Zeile 1, Grenzfall 18, Grenzfall 10). Diese Entscheidungen
werden hier getroffen und sind für die Umsetzung bindend:

1. **Tab-Command konsumiert IMMER, sobald im Listenkontext — unabhängig vom
   `sinkListItem`-Rückgabewert.** Grund: `sinkListItem` selbst liefert `false` beim
   ersten Punkt einer (Unter-)Liste (Bibliotheks-No-Op, Zeile 272-273 der Library),
   OHNE zu dispatchen. Ein einfaches `Tab: sinkListItem(wordSchema.nodes.list_item)`
   würde in diesem Fall die Taste **nicht** konsumieren → `keymap` reicht sie mangels
   weiterer Bindung an den Browser durch → Fokus verlässt den Editor (genau die
   Regression aus Grenzfall 1). Der neue Command prüft daher zuerst strukturell, ob
   der Cursor überhaupt in einem `list_item` steht; wenn ja, wird `sinkListItem`
   aufgerufen (der Aufruf dispatcht selbst, falls er etwas bewirkt) und **immer**
   `true` zurückgegeben — auch wenn `sinkListItem` intern `false`/No-Op war. Da in
   diesem No-Op-Fall nie `dispatch` aufgerufen wird, entsteht dabei **kein** leerer
   Undo-Schritt (erfüllt 3.8 und `true`-Rückgabe gleichzeitig — kein Widerspruch,
   da „Event konsumieren" und „Transaktion dispatchen" zwei unabhängige Dinge sind).
   Außerhalb eines Listenkontexts liefert der Command `false`, `keymap` reicht die
   Taste unverändert weiter (Grenzfall 17, Abgrenzung zu `tabulator-zeichen`).
2. **Dieselbe Logik, symmetrisch, für `Shift-Tab`/`liftListItem`** — auch wenn
   `liftListItem` nach Code-Lage praktisch nie „im Listenkontext, aber wirkungslos"
   zurückgibt (der einzige theoretische Fall ist `liftTarget(range) == null` in
   `liftToOuterList`, Bibliothekszeile 228-230, ein struktureller Grenzfall). Aus
   Konsistenz- und Robustheitsgründen bekommt `Shift-Tab` denselben
   „immer-konsumieren-im-Listenkontext"-Wrapper wie `Tab`.
3. **Grenzfall 18 (Verhältnis Button „Liste aufheben" zu `Shift-Tab`):** Der
   bestehende Button **bleibt unverändert** bei `liftFromList()` (= „komplett
   entfernen, unabhängig von der Ebene, aber inhaltlich macht `liftListItem` ohnehin
   nur eine Ebene, wenn es eine gibt"). Es wird **keine** neue, semantisch andere
   Button-Funktion gebaut. Begründung: `Shift-Tab` und der Button rufen **dieselbe**
   `liftListItem`-Funktion auf und verhalten sich bei Ebene 1 identisch (komplett
   entfernen) und bei Ebene ≥ 2 identisch (eine Ebene ausrücken) — der einzige
   Unterschied ist der in Punkt 2 beschriebene Fokus-Schutz, der für einen
   Mausklick irrelevant ist. Es gibt daher keinen Grund, zwei verschiedene Funktionen
   zu pflegen; der Button bleibt der etablierte, bereits gestestete Pfad.
4. **Maximale Verschachtelungstiefe wird technisch gedeckelt, nicht unbegrenzt
   gelassen** (Grenzfall 2): 9 Ebenen (Index 0–8), passend zur OOXML-Konvention
   (`w:ilvl` 0–8) und zur hier gewählten ODF-Konvention (`text:level` 1–9). Ein
   `Tab` auf der tiefsten definierten Ebene wird zum strukturellen No-Op (der
   Sink-Wrapper konsumiert die Taste trotzdem, siehe Punkt 1) statt eine Ebene zu
   erzeugen, für die weder `numberingXml()` noch `listStyleDefs()` einen Stil
   definieren.
5. **Kein Typwechsel je Ebene** (Grenzfall 7): `sinkListItem` erzeugt strukturell
   immer denselben Knotentyp wie die aktuelle Liste — bleibt unverändert, ist
   explizit außerhalb des Scopes dieser Datei (gehört zu `mehrstufige-liste`).
6. **ODT: Restunsicherheit bei Typwechsel über Ebenen hinweg (Grenzfall 7 kombiniert
   mit Grenzfall 10) bleibt ein offener, manuell zu verifizierender Punkt.** Laut
   ODF-Spezifikation wird die wirksame Ebene rein über die XML-Verschachtelungstiefe
   von `<text:list>`-Elementen gezählt, unabhängig vom referenzierten Stilnamen. Der
   Schreiber wählt aber pro Knoten den Stilnamen nach **Typ** (`LB`/`LO`, wie
   bisher) — wechselt der Typ mitten in einer Verschachtelung (z. B. Bullet auf
   Ebene 1, Nummeriert auf Ebene 2, wie testweise in einer Fremddatei importiert),
   referenziert die tiefere `<text:list>` zwar korrekt `LO`, aber der von
   `Ziel-Anwendung berechnete Ebenen-Index für die Stil-Auswahl könnte 2 statt 1
   sein (weil er alle Vorfahren-`<text:list>`-Elemente zählt, nicht nur die mit
   demselben Stilnamen). Das ist mit einer echten Zielanwendung zu prüfen (siehe
   Abschnitt 6.4); für den **in dieser Datei geforderten Kernfall** (Tab/Umschalt+Tab
   erzeugt stets denselben Typ je Verschachtelungskette, Entscheidung 5) tritt der
   Fall nicht auf und ist daher kein Blocker für die Abnahme dieser Datei.

---

## 2. `src/formats/shared/editor/commands.ts` — neue Commands

**Ist:** Importiert nur `wrapInList, liftListItem` (Zeile 2). `liftFromList()`
(Zeile 62-64) ist der einzige listenbezogene Ausrück-Befehl. Kein Einrück-Befehl
vorhanden.

**Änderung:**

```ts
import type { Command, EditorState } from 'prosemirror-state'
import { wrapInList, liftListItem, sinkListItem } from 'prosemirror-schema-list'
// ... bestehende Imports unverändert ...

/** True, wenn der Selektionsanker innerhalb eines list_item liegt (beliebige Tiefe, auch in Tabellenzellen). */
function isInListItem(state: EditorState): boolean {
  const { $from } = state.selection
  for (let depth = $from.depth; depth >= 0; depth--) {
    if ($from.node(depth).type === wordSchema.nodes.list_item) return true
  }
  return false
}

/**
 * Tab-Befehl für Listenpunkte: verschachtelt per `sinkListItem` eine Ebene tiefer.
 * Gibt außerhalb jedes Listenkontexts `false` zurück (keymap reicht Tab an die
 * nächste Bindung/den Browser weiter — Abgrenzung zu `tabulator-zeichen`).
 * Innerhalb eines Listenkontexts wird die Taste immer als konsumiert gemeldet
 * (`true`), auch wenn `sinkListItem` selbst ein wirkungsloses No-Op war (erster
 * Punkt einer (Unter-)Liste) — verhindert, dass der Fokus den Editor verlässt
 * (siehe liste-einruecken-tab-code.md Abschnitt 1, Entscheidung 1). Da im
 * No-Op-Fall nie dispatcht wird, entsteht dabei kein leerer Undo-Schritt.
 */
export function indentListItem(): Command {
  const sink = sinkListItem(wordSchema.nodes.list_item)
  return (state, dispatch) => {
    if (!isInListItem(state)) return false
    sink(state, dispatch)
    return true
  }
}

/**
 * Umschalt+Tab-Befehl: rückt per `liftListItem` eine Ebene aus (Ebene ≥ 2) bzw.
 * entfernt den Punkt komplett aus der Liste (Ebene 1) — dieselbe Semantik wie
 * `liftFromList()`, nur mit demselben Fokus-Schutz-Wrapper wie `indentListItem`
 * (siehe Entscheidung 2). `liftFromList()` selbst bleibt für den bestehenden
 * Toolbar-Button unverändert (Entscheidung 3 / Grenzfall 18).
 */
export function outdentListItem(): Command {
  const lift = liftListItem(wordSchema.nodes.list_item)
  return (state, dispatch) => {
    if (!isInListItem(state)) return false
    lift(state, dispatch)
    return true
  }
}

export function liftFromList(): Command {
  return liftListItem(wordSchema.nodes.list_item) // unverändert, siehe outdentListItem
}
```

`isInListItem` bleibt unexportiert (rein interner Helfer); die Toolbar zeigt für
Listen-Buttons aktuell ohnehin keinen aktiven/deaktivierten Zustand an (im
Unterschied zu `MarkButton`/`AlignButton`), das bleibt unverändert.

---

## 3. `src/formats/shared/editor/WordEditor.tsx` — Keymap-Eintrag

**Ist:** Zeilen 71-80, `keymap({...})` enthält `Mod-z`, `Mod-y`, `Mod-Shift-z`,
`Enter`, `Mod-b`, `Mod-i`, `Mod-u`. Kein `Tab`/`Shift-Tab`. `commands.ts` wird in
dieser Datei aktuell gar nicht importiert (nur `Toolbar.tsx` importiert davon).

**Änderung:**

```ts
import { splitListItem } from 'prosemirror-schema-list'
import { indentListItem, outdentListItem } from './commands'
// ...

keymap({
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
  Enter: splitListItem(wordSchema.nodes.list_item),
  Tab: indentListItem(),
  'Shift-Tab': outdentListItem(),
  'Mod-b': toggleMark(wordSchema.marks.strong),
  'Mod-i': toggleMark(wordSchema.marks.em),
  'Mod-u': toggleMark(wordSchema.marks.underline),
}),
keymap(baseKeymap),
```

Reihenfolge bleibt entscheidend: der neue Eintrag steht in derselben `keymap({...})`
wie die anderen projekteigenen Bindungen, **vor** `keymap(baseKeymap)` (Zeile 80) —
`baseKeymap` bindet ohnehin kein `Tab` (siehe Abschnitt 0), Reihenfolge ist also nur
aus Konsistenzgründen wichtig, nicht aus Konfliktgründen.

---

## 4. `src/formats/shared/editor/Toolbar.tsx` — neuer Button + Tooltip-Ergänzung

**Ist:** Zeilen 214-224, ein Button „⇧ Liste" / `title="Liste aufheben"`, ruft
`liftFromList()` auf. Kein Einrück-Button, kein Hinweis auf Tab in irgendeinem
`title`.

**Änderung:**
1. Import-Zeile 5-17 um `indentListItem` ergänzen.
2. Neuer Button **vor** dem bestehenden „⇧ Liste"-Button (Bedienelement Nr. 4 der
   Anforderung — Maus-/Screenreader-Alternative zu Tab, notwendig wegen des
   Tab-Trap-Risikos aus Grenzfall 15, da Tab jetzt im Listenkontext abgefangen wird):

```tsx
<button
  type="button"
  title="Einzug erhöhen (Tab)"
  aria-label="Einzug erhöhen (Tab)"
  onMouseDown={(e) => {
    e.preventDefault()
    run(view, indentListItem())
  }}
  className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
>
  ⇥ Liste
</button>
```

3. Bestehenden Button „⇧ Liste" um `aria-label` ergänzen und `title` um den
   Tastenhinweis erweitern (Bedienelement Nr. 7 der Anforderung):

```tsx
<button
  type="button"
  title="Liste aufheben / Einzug verringern (Umschalt+Tab)"
  aria-label="Liste aufheben / Einzug verringern (Umschalt+Tab)"
  onMouseDown={(e) => {
    e.preventDefault()
    run(view, liftFromList())
  }}
  className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
>
  ⇧ Liste
</button>
```

Kein Kontextmenü-Eintrag (Bedienelement Nr. 8: explizit kein Soll-Bestandteil).

---

## 5. `src/formats/docx/styleDefs.ts` — Ebenen-Definitionen für `w:lvl` 0–8

**Ist:** Zeilen 37-47, `numberingXml()` schreibt je Bullet/Ordered genau **ein**
`<w:lvl w:ilvl="0">`.

**Änderung:** neue Konstante `MAX_DOCX_LIST_LEVEL = 8`, Level-Generator, der für
jede Ebene 0–8 ein eigenes `<w:lvl>` mit **selbstreferenzierendem** `%N`
(`N = ilvl + 1`) erzeugt — wichtig: **nicht** `%1` für jede Ebene fest verdrahten,
sonst zeigt Word auf jeder Ebene denselben (Ebene-0-)Zähler statt einer je Ebene
unabhängig bei 1 neu beginnenden Nummerierung (verletzt sonst Anforderung 3.9).
Zusätzlich `w:ind`/`w:hanging` je Ebene, damit Word auch ohne
`mehrstufige-liste`-Symbolwechsel wenigstens sichtbar unterschiedlich einrückt.

```ts
export const BULLET_ABSTRACT_ID = 0
export const ORDERED_ABSTRACT_ID = 1
export const BULLET_NUM_ID = 1
export const ORDERED_NUM_ID = 2
export const MAX_DOCX_LIST_LEVEL = 8 // w:ilvl 0..8 (9 Ebenen) — Grenzfall 2

function lvlXml(ilvl: number, fmt: 'bullet' | 'decimal', lvlText: string): string {
  const indent = (ilvl + 1) * 720 // Twips, ~0.5" je Ebene, Word-typischer Schritt
  return (
    `<w:lvl w:ilvl="${ilvl}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/>` +
    `<w:lvlText w:val="${lvlText}"/><w:lvlJc w:val="left"/>` +
    `<w:pPr><w:ind w:left="${indent}" w:hanging="360"/></w:pPr></w:lvl>`
  )
}

export function numberingXml(): string {
  const bulletLvls = Array.from({ length: MAX_DOCX_LIST_LEVEL + 1 }, (_, ilvl) => lvlXml(ilvl, 'bullet', '•')).join('')
  const orderedLvls = Array.from({ length: MAX_DOCX_LIST_LEVEL + 1 }, (_, ilvl) =>
    lvlXml(ilvl, 'decimal', `%${ilvl + 1}.`),
  ).join('')
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:numbering ${WORD_NAMESPACE_DECLARATIONS}>` +
    `<w:abstractNum w:abstractNumId="${BULLET_ABSTRACT_ID}">${bulletLvls}</w:abstractNum>` +
    `<w:abstractNum w:abstractNumId="${ORDERED_ABSTRACT_ID}">${orderedLvls}</w:abstractNum>` +
    `<w:num w:numId="${BULLET_NUM_ID}"><w:abstractNumId w:val="${BULLET_ABSTRACT_ID}"/></w:num>` +
    `<w:num w:numId="${ORDERED_NUM_ID}"><w:abstractNumId w:val="${ORDERED_ABSTRACT_ID}"/></w:num>` +
    `</w:numbering>`
  )
}
```

Bewusst **kein** je Ebene wechselndes Bullet-Zeichen (bleibt „•" auf allen Ebenen) —
das wäre bereits `mehrstufige-liste`-Scope (Anforderung Abschnitt 1); die
Ebenen-Einrückung allein genügt als „sichtbar unterscheidbares Merkmal" (3.9).

---

## 6. `src/formats/docx/writer.ts` — `w:ilvl` korrekt je Tiefe schreiben

**Ist:** Zeilen 94-126. `blockToDocx(node, images, rels, listNumId)` schreibt in
Zeile 103 hart `w:ilvl w:val="0"`. Der Fall `bullet_list`/`ordered_list`
(Zeile 112-118) berechnet `numId` bei jeder Rekursion **neu allein aus dem
Knotentyp** und verwirft den von außen übergebenen `listNumId` — das ist exakt der
in der Anforderung beschriebene Flachlege-Defekt.

**Änderung:** `listNumId: number | null` durch einen Kontext `{ numId, level }`
ersetzen, der bei jeder Rekursion in eine verschachtelte Liste **hochgezählt**
wird, wenn der Kindknoten denselben Typ (= dieselbe `numId`) hat wie die
umgebende Liste, und auf `0` **zurückgesetzt** wird, wenn der Typ wechselt (Bullet
→ Ordered oder umgekehrt, siehe Design-Entscheidung 5 — Typwechsel ist kein
automatisches Tab-Ergebnis, kommt aber z. B. beim Reimport einer Fremddatei vor).
Innerhalb einer Tabellenzelle beginnt eine Liste strukturell immer wieder bei
Kontext `null`/Ebene 0 (siehe `tableToDocx`, unverändert), passend zu Grenzfall 5/6.

```ts
import { HEADING_STYLE_ID, headingStylesXml, BULLET_NUM_ID, ORDERED_NUM_ID, numberingXml, MAX_DOCX_LIST_LEVEL } from './styleDefs'

interface ListContext {
  numId: number
  level: number
}

function blockToDocx(
  node: JsonNode,
  images: ImageCollector,
  rels: RelationshipRegistry,
  listCtx: ListContext | null = null,
): string {
  switch (node.type) {
    case 'paragraph': {
      const align = (node.attrs?.align as string) ?? 'left'
      const numPr = listCtx
        ? `<w:numPr><w:ilvl w:val="${listCtx.level}"/><w:numId w:val="${listCtx.numId}"/></w:numPr>`
        : ''
      return `<w:p>${paragraphPropsXml(align, numPr)}${inlineToRuns(node.content)}</w:p>`
    }
    case 'heading': {
      // unverändert
    }
    case 'bullet_list':
    case 'ordered_list': {
      const numId = node.type === 'ordered_list' ? ORDERED_NUM_ID : BULLET_NUM_ID
      const level = listCtx && listCtx.numId === numId ? Math.min(listCtx.level + 1, MAX_DOCX_LIST_LEVEL) : 0
      const nextCtx: ListContext = { numId, level }
      return (node.content ?? [])
        .flatMap((item) => (item.content ?? []).map((child) => blockToDocx(child, images, rels, nextCtx)))
        .join('')
    }
    case 'table':
      return tableToDocx(node, images, rels)
    case 'image':
      return imageParagraphXml(node, images, rels)
    default:
      return ''
  }
}
```

`tableToDocx` (Zeile 159, `blockToDocx(child, images, rels)`, 3-Parameter-Aufruf)
bleibt unverändert — `listCtx` ist per Default `null`, jede Zelle beginnt also
automatisch mit einem frischen Listenkontext.

---

## 7. `src/formats/docx/reader.ts` — `w:ilvl` lesen, Ebenen-typisierte Kind-Zuordnung, verschachtelte Liste bauen

Dies ist die umfangreichste Änderung. Drei Teile:

### 7.1 `listMarkerFor` — `w:ilvl` lesen

**Ist:** Zeilen 192-201, liest nur `numId`.

```ts
interface ListMarker {
  numId: string | null
  ilvl: number
}

function listMarkerFor(pEl: Element): ListMarker {
  const pPr = firstChildNS(pEl, OOXML_NAMESPACES.w, 'pPr')
  const numPr = pPr && firstChildNS(pPr, OOXML_NAMESPACES.w, 'numPr')
  const numIdEl = numPr && firstChildNS(numPr, OOXML_NAMESPACES.w, 'numId')
  const ilvlEl = numPr && firstChildNS(numPr, OOXML_NAMESPACES.w, 'ilvl')
  const rawIlvl = Number(ilvlEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? '0') || 0
  return {
    numId: numIdEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? null,
    ilvl: Math.max(0, Math.min(rawIlvl, MAX_DOCX_LIST_LEVEL)), // defensiver Deckel, Grenzfall 2
  }
}
```

### 7.2 `parseNumberingXml` — Ebenen-genaue Kind-Zuordnung (behebt den in Abschnitt 0
Punkt 1 zusätzlich gefundenen Defekt)

**Ist:** Zeilen 77-97, liest nur das erste `<w:lvl>` je `abstractNum`.

```ts
function parseNumberingXml(numberingDoc: Document | null): Map<string, Map<number, 'bullet' | 'ordered'>> {
  const kindByNumId = new Map<string, Map<number, 'bullet' | 'ordered'>>()
  if (!numberingDoc) return kindByNumId
  const abstractKindById = new Map<string, Map<number, 'bullet' | 'ordered'>>()
  for (const abstractEl of Array.from(numberingDoc.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'abstractNum'))) {
    const id = abstractEl.getAttributeNS(OOXML_NAMESPACES.w, 'abstractNumId')
    if (!id) continue
    const byLevel = new Map<number, 'bullet' | 'ordered'>()
    for (const lvl of childElements(abstractEl, OOXML_NAMESPACES.w, 'lvl')) {
      const ilvl = Number(lvl.getAttributeNS(OOXML_NAMESPACES.w, 'ilvl') ?? '0') || 0
      const numFmt = firstChildNS(lvl, OOXML_NAMESPACES.w, 'numFmt')
      const fmt = numFmt?.getAttributeNS(OOXML_NAMESPACES.w, 'val')
      byLevel.set(ilvl, fmt === 'bullet' ? 'bullet' : 'ordered')
    }
    abstractKindById.set(id, byLevel)
  }
  for (const numEl of Array.from(numberingDoc.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'num'))) {
    const numId = numEl.getAttributeNS(OOXML_NAMESPACES.w, 'numId')
    const abstractRef = firstChildNS(numEl, OOXML_NAMESPACES.w, 'abstractNumId')
    const abstractId = abstractRef?.getAttributeNS(OOXML_NAMESPACES.w, 'val')
    if (numId && abstractId && abstractKindById.has(abstractId)) {
      kindByNumId.set(numId, abstractKindById.get(abstractId)!)
    }
  }
  return kindByNumId
}
```

Signatur-Änderung wirkt sich auf `readDocx`/`readBodyChildren` (Zeilen 307-328,
341-346) nur über den Typ von `kindByNumId` aus — Aufrufe selbst bleiben gleich.
`w:lvlOverride` innerhalb `<w:num>` (pro-Instanz-Überschreibung einzelner Ebenen)
wird **nicht** ausgewertet — bewusste Vereinfachung, als Restrisiko in Abschnitt 9
vermerkt.

### 7.3 `groupLists` → verschachtelnder Listenaufbau

**Ist:** Zeilen 258-283, baut ausschließlich flache Listen (eine Ebene, ignoriert
`ilvl` komplett — existierte vor diesem Feature noch nicht einmal im `ListMarker`).

**Ersatz** durch einen Stack-basierten Aufbau:

```ts
function groupLists(
  items: Array<{ marker: ListMarker; block: JsonNode }>,
  kindByNumId: Map<string, Map<number, 'bullet' | 'ordered'>>,
): JsonNode[] {
  const result: JsonNode[] = []
  let currentNumId: string | null = null
  let stack: Array<{ level: number; list: JsonNode }> = []

  const kindFor = (numId: string, level: number): 'bullet' | 'ordered' => {
    const byLevel = kindByNumId.get(numId)
    return byLevel?.get(level) ?? byLevel?.get(0) ?? 'bullet'
  }

  const flush = () => {
    if (stack.length) result.push(stack[0].list)
    stack = []
    currentNumId = null
  }

  for (const { marker, block } of items) {
    if (!marker.numId) {
      flush()
      result.push(block)
      continue
    }
    if (currentNumId !== null && currentNumId !== marker.numId) flush()
    currentNumId = marker.numId

    if (stack.length === 0) {
      const kind = kindFor(marker.numId, marker.ilvl)
      stack.push({ level: 0, list: { type: kind === 'ordered' ? 'ordered_list' : 'bullet_list', content: [] } })
    }

    // Ebenen schließen, die tiefer liegen als der aktuelle Absatz.
    while (stack.length > 1 && marker.ilvl < stack[stack.length - 1].level) stack.pop()

    // Ebenen öffnen (immer nur eine auf einmal, auch wenn die Datei einen
    // größeren Sprung fordert — reale Word-Dateien überspringen nie eine
    // Ebene ohne dazwischenliegenden Punkt; ein solcher Sprung ist nur bei
    // manipulierten/fremderzeugten Dateien denkbar, siehe Grenzfall 2).
    while (marker.ilvl > stack[stack.length - 1].level) {
      const top = stack[stack.length - 1]
      const lastItem = top.list.content?.[top.list.content.length - 1] as JsonNode | undefined
      if (!lastItem) break // kein Anker-Punkt vorhanden — auf aktueller Ebene bleiben
      const level = top.level + 1
      const kind = kindFor(marker.numId, level)
      const childList: JsonNode = { type: kind === 'ordered' ? 'ordered_list' : 'bullet_list', content: [] }
      lastItem.content = lastItem.content ?? []
      lastItem.content.push(childList)
      stack.push({ level, list: childList })
    }

    stack[stack.length - 1].list.content!.push({ type: 'list_item', content: [block] })
  }
  flush()
  return result
}
```

`readBodyChildren` (Zeile 307-328) ruft `groupLists(items, kindByNumId)` unverändert
auf — nur der Inhalt von `items[].marker` (jetzt mit `ilvl`) und der Typ von
`kindByNumId` ändern sich.

---

## 8. `src/formats/odt/styleRegistry.ts` — `text:level` 1–9 definieren

**Ist:** Zeilen 95-103, `listStyleDefs()` definiert nur `text:level="1"` für
`LB`/`LO`.

**Änderung:**

```ts
export const BULLET_LIST_STYLE_NAME = 'LB'
export const ORDERED_LIST_STYLE_NAME = 'LO'
export const MAX_ODT_LIST_LEVEL = 9 // text:level 1..9 — an OOXML-Konvention angelehnt (Grenzfall 2)

function bulletLevelXml(level: number): string {
  const spaceBefore = (0.5 * level).toFixed(2)
  return (
    `<text:list-level-style-bullet text:level="${level}" text:bullet-char="•">` +
    `<style:list-level-properties text:space-before="${spaceBefore}cm" text:min-label-width="0.5cm"/>` +
    `</text:list-level-style-bullet>`
  )
}

function numberLevelXml(level: number): string {
  const spaceBefore = (0.5 * level).toFixed(2)
  return (
    `<text:list-level-style-number text:level="${level}" style:num-format="1" style:num-suffix=".">` +
    `<style:list-level-properties text:space-before="${spaceBefore}cm" text:min-label-width="0.5cm"/>` +
    `</text:list-level-style-number>`
  )
}

export function listStyleDefs(): string {
  const bulletLevels = Array.from({ length: MAX_ODT_LIST_LEVEL }, (_, i) => bulletLevelXml(i + 1)).join('')
  const numberLevels = Array.from({ length: MAX_ODT_LIST_LEVEL }, (_, i) => numberLevelXml(i + 1)).join('')
  return (
    `<text:list-style style:name="${BULLET_LIST_STYLE_NAME}">${bulletLevels}</text:list-style>` +
    `<text:list-style style:name="${ORDERED_LIST_STYLE_NAME}">${numberLevels}</text:list-style>`
  )
}
```

Jede Ebene bekommt **keinen** `text:display-levels`-Verweis auf Elternebenen — jede
Ebene zählt unabhängig ab 1 (Mindestanforderung 3.9, kein Word-Verbundformat
„1.1" nötig). Bullet-Zeichen bleibt „•" auf allen Ebenen (`mehrstufige-liste`-Scope
bewusst ausgeklammert wie bei DOCX, Abschnitt 5).

`src/formats/odt/writer.ts` (Zeilen 61-85) braucht **keine Änderung**: Die
Verschachtelung wird bereits heute strukturell korrekt erzeugt (bestätigt in
Abschnitt 0), und ODF selbst kodiert die Ebene nicht als Attribut am `<text:list>`,
sondern rein über die XML-Verschachtelungstiefe — die neu definierten
`text:level="2"`…`"9"` in `LB`/`LO` greifen automatisch, sobald eine tiefere
`<text:list>` mit demselben Stilnamen verschachtelt vorkommt.

---

## 9. `src/formats/odt/reader.ts` — ebenen-genaue Kind-Zuordnung

Behebt den in Abschnitt 0 Punkt 2 zusätzlich gefundenen Defekt.

### 9.1 `ParsedStyles.listKinds` — Typänderung

**Ist:** Zeile 25, `listKinds: Map<string, 'bullet' | 'ordered'>`.

**Neu:** `listKinds: Map<string, Map<number, 'bullet' | 'ordered'>>`.

### 9.2 `parseAutomaticStyles` — je `text:level` erfassen

**Ist:** Zeilen 69-74, ein einziges `hasNumber`-Flag pro Stilname.

```ts
for (const listStyleEl of childElements(automaticStylesEl, ODF_NAMESPACES.text, 'list-style')) {
  const name = listStyleEl.getAttributeNS(ODF_NAMESPACES.style, 'name')
  if (!name) continue
  const byLevel = new Map<number, 'bullet' | 'ordered'>()
  for (const levelEl of Array.from(listStyleEl.children)) {
    const level = Number(levelEl.getAttributeNS(ODF_NAMESPACES.text, 'level') ?? '1') || 1
    if (levelEl.namespaceURI === ODF_NAMESPACES.text && levelEl.localName === 'list-level-style-number') {
      byLevel.set(level, 'ordered')
    } else if (levelEl.namespaceURI === ODF_NAMESPACES.text && levelEl.localName === 'list-level-style-bullet') {
      byLevel.set(level, 'bullet')
    }
  }
  listKinds.set(name, byLevel)
}
```

### 9.3 `elementToBlocks` — `listLevel`-Parameter

**Ist:** Zeilen 164-206, `depth`-Parameter existiert bereits (nur für die
Absturzbremse `MAX_NESTING_DEPTH`), aber keine separate Ebenenzählung für die
Stil-Auflösung.

```ts
const MAX_ODT_LIST_LEVEL_LOOKUP = 9 // Deckel nur für die Stil-Ebenen-Auflösung, siehe Grenzfall 2

function elementToBlocks(el: Element, styles: ParsedStyles, depth = 0, listLevel = 1): JsonNode[] {
  // ... paragraph/heading-Zweige unverändert ...

  if (depth >= MAX_NESTING_DEPTH) return []

  if (ns === ODF_NAMESPACES.text && local === 'list') {
    const styleName = el.getAttributeNS(ODF_NAMESPACES.text, 'style-name')
    const byLevel = styleName ? styles.listKinds.get(styleName) : undefined
    const cappedLevel = Math.min(listLevel, MAX_ODT_LIST_LEVEL_LOOKUP)
    const kind = byLevel?.get(cappedLevel) ?? byLevel?.get(1) ?? 'bullet'
    const items = childElements(el, ODF_NAMESPACES.text, 'list-item').map((itemEl) => ({
      type: 'list_item',
      content: Array.from(itemEl.children).flatMap((child) => elementToBlocks(child, styles, depth + 1, listLevel + 1)),
    }))
    return [{ type: kind === 'ordered' ? 'ordered_list' : 'bullet_list', content: items }]
  }

  if (ns === ODF_NAMESPACES.table && local === 'table') {
    // Tabellen-Zellinhalt beginnt strukturell wieder bei Ebene 1 (Grenzfall 5/6):
    // ... content: Array.from(cellEl.children).flatMap((child) => elementToBlocks(child, styles, depth + 1, 1)) ...
  }

  return []
}
```

Aufrufer außerhalb von `elementToBlocks` (`readOfficeTextChildren`, Header/Footer in
`readOdt`, Zeilen 233-269) bleiben unverändert — der neue Parameter hat einen
Default (`listLevel = 1`).

---

## 10. Zusammenfassung: geänderte / neue Dateien

| Datei | Art der Änderung |
|---|---|
| `src/formats/shared/editor/commands.ts` | Import `sinkListItem` ergänzt; neue `isInListItem`, `indentListItem`, `outdentListItem`; `liftFromList` unverändert |
| `src/formats/shared/editor/WordEditor.tsx` | Import aus `./commands`; zwei neue Keymap-Einträge `Tab`/`Shift-Tab` |
| `src/formats/shared/editor/Toolbar.tsx` | Neuer Button „Einzug erhöhen"; `title`/`aria-label` des bestehenden „⇧ Liste"-Buttons ergänzt |
| `src/formats/docx/styleDefs.ts` | `numberingXml()` erzeugt 9 `w:lvl`-Einträge je Abstract-Num statt 1; neue Konstante `MAX_DOCX_LIST_LEVEL` |
| `src/formats/docx/writer.ts` | `blockToDocx` bekommt `ListContext { numId, level }` statt `listNumId: number`; `w:ilvl` korrekt je Tiefe |
| `src/formats/docx/reader.ts` | `ListMarker` + `ilvl`; `parseNumberingXml` ebenen-genau; `groupLists` → Stack-basierter, verschachtelnder Aufbau |
| `src/formats/odt/styleRegistry.ts` | `listStyleDefs()` erzeugt `text:level` 1–9 statt nur 1; neue Konstante `MAX_ODT_LIST_LEVEL` |
| `src/formats/odt/reader.ts` | `ParsedStyles.listKinds` wird ebenen-genau; `elementToBlocks` bekommt `listLevel`-Parameter |
| `src/formats/odt/writer.ts` | **keine Änderung** (Begründung Abschnitt 8) |
| `src/formats/shared/schema.ts` | **keine Änderung** (Begründung Abschnitt 0) |
| `src/index.css` | **keine Änderung** (Begründung Abschnitt 0) |
| `src/formats/docx/__tests__/roundtrip.test.ts` | Neue Testfälle „lists“ (siehe Abschnitt 11) |
| `src/formats/odt/__tests__/roundtrip.test.ts` | Neue Testfälle „lists“ (siehe Abschnitt 11) |
| `src/formats/docx/__tests__/external-fixtures.test.ts` | Neuer dedizierter Block für `ComplexNumberedLists.docx` |
| `src/formats/odt/__tests__/external-fixtures.test.ts` | Neuer dedizierter Block für `listLevel10.odt`, `simpleList3.odt`, `liste2.odt` |
| `tests/e2e/list-indent.spec.ts` | **Neue Datei** — alle 18 Testfälle aus Anforderung Abschnitt 6 |
| `specs/FEATURE-BACKLOG.md` | Nach grüner Testsuite: Status `liste-einruecken-tab` (Zeile 158) von „fehlt" auf „verifiziert" |

---

## 11. Unit-Tests (Vitest) — Ergänzungen

### 11.1 `src/formats/docx/__tests__/roundtrip.test.ts`, `describe('DOCX round trip: lists')`

Neue `it(...)`-Fälle, im bestehenden Stil (`doc([...])`, `paragraph(...)`,
`roundTrip(...)`, siehe Zeilen 1-24 der Datei):

1. **2-stufige Liste:** `bullet_list` mit `list_item`s A, B, C; B enthält
   zusätzlich einen verschachtelten `bullet_list` mit einem `list_item` „B1". Nach
   `roundTrip`: Struktur exakt erhalten (B1 als Kind von B, nicht als Geschwister
   von A/B/C), Text aller Punkte unverändert. Prüft direkt Abschnitt 5.1.1 sowie
   Abnahmekriterien 2+3.
2. **3-stufig gemischt:** `ordered_list` → `list_item` → verschachtelter
   `bullet_list` → `list_item` → verschachtelter `ordered_list`. Nach `roundTrip`:
   jede Ebene behält ihren Typ (`ordered_list`/`bullet_list`/`ordered_list`) und
   ihre Tiefe. Deckt den in Abschnitt 0 zusätzlich gefundenen Ebenen-blinden-Kind-
   Defekt ab (5.1.2).
3. **Deckel bei Ebene 9 (Grenzfall 2):** Eine Liste mit 10 verschachtelten Ebenen
   erzeugen → Export darf nicht crashen, `w:ilvl` darf `MAX_DOCX_LIST_LEVEL` (8)
   nicht überschreiten (String-Assertion auf die erzeugte XML oder Re-Import und
   Tiefenzählung).

### 11.2 `src/formats/odt/__tests__/roundtrip.test.ts`, `describe('ODT round trip: lists')`

Analoge drei Fälle wie 11.1, ODT-Variante (`text:list`/`text:list-item`
XML-Struktur wird über `readOdt(await writeOdt(...))` geprüft, nicht direkt XML
inspiziert, konsistent mit bestehendem `roundTrip`-Helfer der Datei).

### 11.3 `src/formats/docx/__tests__/external-fixtures.test.ts`

Neuer, dedizierter `describe`-Block (zusätzlich zum bestehenden generischen
Crash-Test-Loop, Zeilen 46-100 — dieser bleibt unverändert bestehen):

```ts
describe('DOCX reader: mehrstufige Listen bleiben erhalten (reale Fixture)', () => {
  it('erhält Verschachtelungsebenen aus ComplexNumberedLists.docx', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'ComplexNumberedLists.docx'))
    const doc = await readDocx(new Blob([new Uint8Array(buffer)]))
    // Rekursiv prüfen: mindestens eine bullet_list/ordered_list enthält ein
    // list_item, dessen content selbst wieder eine bullet_list/ordered_list ist
    // (max. Verschachtelungstiefe > 1) — sonst wäre der Import weiterhin flach.
  })
})
```

### 11.4 `src/formats/odt/__tests__/external-fixtures.test.ts`

Analoger Block für `listLevel10.odt`, `simpleList3.odt`, `liste2.odt` — zusätzlich
eine Rundreise-Assertion (`writeOdt(await readOdt(buffer))` erneut mit `readOdt`
einlesen), da Abschnitt 5.2.4 explizit „importieren → unverändert exportieren →
erneut importieren" fordert, nicht nur einmaligen Import.

---

## 12. E2E-Tests (Playwright) — neue Datei `tests/e2e/list-indent.spec.ts`

Struktur/Konventionen wie `tests/e2e/docx.spec.ts`, `odt.spec.ts`,
`selection-regression.spec.ts` (`docxCard`/`odtCard`-Locator-Helfer,
`page.getByRole('button', { name: /verstanden/i })` im `beforeEach`,
`page.waitForEvent('download')` + `download.path()` fürs Exportieren,
`input.setInputFiles({...})` fürs Importieren). Deckt alle 18 Testfälle aus
Anforderung Abschnitt 6 ab; Zuordnung:

| Testfall (Anforderung §6) | Umsetzung in `list-indent.spec.ts` |
|---|---|
| 1, 2 | DOCX **und** ODT: 3-Punkte-Liste anlegen, `page.keyboard.press('Tab')` auf Punkt 2 → `.ProseMirror li ul`/`ol` verschachtelt sichtbar; Tab auf Punkt 1 → keine DOM-Änderung, `editor` bleibt fokussiert (`await expect(editor).toBeFocused()` nach dem Tab-Druck) |
| 3, 4 | `Shift+Tab` auf Ebene-2-Punkt → Ebene 1, bleibt Listenelement; `Shift+Tab` auf Ebene-1-Punkt → wird zu `<p>`, Text erhalten; Vergleich mit Klick auf „⇧ Liste"-Button auf einem zweiten, identischen Punkt → identisches DOM-Ergebnis |
| 5 | `Enter` am Ende eines Ebene-2-Punkts, dann `Tab` auf den neuen Punkt → verschachtelt normal |
| 6, 7 | `Mod+z`/`Mod+y` direkt nach `Tab`; mehrfaches `Tab` hintereinander, dann mehrfaches `Mod+z` → jede Stufe einzeln rückgängig (DOM-Verschachtelungstiefe nach jedem Undo-Schritt prüfen) |
| 8 | Ablauf wie `selection-regression.spec.ts` (Alles auswählen → Fett → Klick zum Neupositionieren), danach `Tab` statt Enter/Tippen — Regressionstest, kein Content-Verlust |
| 9 | `filechooser`/`setInputFiles` mit `tests/fixtures/external/docx/ComplexNumberedLists.docx` → verschachteltes `<ul>`/`<ol>` im DOM sichtbar |
| 10 | Analog mit `listLevel10.odt`, `simpleList3.odt` |
| 11 | Für 5.1.1–5.1.3 und 5.2.1–5.2.3: im Editor erzeugen → `Exportieren`-Button + `page.waitForEvent('download')` → mit `JSZip` erzeugte Datei erneut per `setInputFiles` importieren → Ebene/Text/Typ prüfen (echter Datei-Kreislauf, nicht nur interner Reader/Writer-Aufruf, wie in Anforderung Testfall 11 verlangt) |
| 12 | 5.3.1/5.3.2: DOCX→ODT→DOCX und ODT→DOCX→ODT über zwei aufeinanderfolgende Card-Wechsel (Format wechseln über die App-UI, sofern die App einen Format-Wechsel nach Import unterstützt — falls nicht, Re-Upload der exportierten Datei in die jeweils andere Format-Karte) |
| 13 | `Tab` in einem normalen Absatz außerhalb jeder Liste → aktuelles/unverändertes Verhalten (kein Listen-Effekt); dokumentiert als Regressionsschutz für `tabulator-zeichen` |
| 14 | Tabelle einfügen, in einer Zelle eine Liste erzeugen (`toggleList`), `Tab` auf einen Listenpunkt in der Zelle → nur Listenebene ändert sich, kein Zellsprung; zusätzlich Fixture `listsInTable.odt` importieren und denselben Ablauf wiederholen |
| 15 | Selektion über 2 Listenpunkte (Shift+Klick oder `Shift+ArrowDown`), `Tab` → beide Punkte eine Ebene tiefer |
| 16 | Selektion über einen Listenpunkt **und** einen nachfolgenden normalen Absatz, `Tab` → Ergebnis dokumentieren (laut Code-Lage: `sinkListItem`s `blockRange`-Prädikat verlangt `node.firstChild.type == itemType` für den umschließenden Elternknoten — bei einer Selektion, die über die Listengrenze hinausreicht, liefert `$from.blockRange` typischerweise gar keinen Bereich mit diesem Prädikat mehr, das Command wird also `false`/No-Op — durch Test zu bestätigen, nicht nur anzunehmen) |
| 17 | Screenshot-Vergleich (`expect(page).toHaveScreenshot()` oder manueller visueller Vergleich) einer mehrstufigen Liste vor Export und nach Reimport derselben Datei |
| 18 | Nach Export: heruntergeladene DOCX mit einem externen Parser prüfen (`python-docx` **nicht** im JS-Testrunner verfügbar — stattdessen eigenständige `JSZip`+XML-`w:ilvl`-Assertion direkt auf die Datei, wie bereits in `docx.spec.ts` für `<w:b/>` gehandhabt, Zeilen 76-82); ODT analog auf `<text:list>`-Verschachtelung im `content.xml` |

---

## 13. Manuelle Verifikationsschritte (nicht automatisierbar / erfordern echte Zielanwendung)

1. **Grenzfall 10 / Abnahmekriterium 4:** Eine mit diesem Feature erzeugte,
   mindestens 3-stufige ODT-Datei in LibreOffice Writer öffnen und die
   Darstellung von Ebene 2/3 gegenüber Ebene 1 protokollieren (Einzug sichtbar
   unterschiedlich? Aufzählungszeichen sichtbar auf jeder Ebene?). Ergebnis in
   diesem Dokument (Abschnitt 14) oder direkt in der Anforderungsdatei
   nachtragen.
2. **Design-Entscheidung 6 (Restunsicherheit Typwechsel über Ebenen bei ODT):**
   Testweise eine Fremddatei mit Bullet auf Ebene 1 / Nummeriert auf Ebene 2 in
   LibreOffice erzeugen, mit dieser App importieren/re-exportieren, erneut in
   LibreOffice öffnen und Ebene/Symbol vergleichen.
3. **Testfall 18 (Anforderung §6):** Exportierte DOCX-Datei mit `python-docx`
   (separates, nicht in dieses Repo integriertes Tool) auf korrekte
   `w:ilvl`-Werte prüfen; exportierte ODT-Datei mit einem unabhängigen
   ODF-Validator prüfen.

---

## 14. Offene Punkte / bekannte Restrisiken (für Abnahmekriterium 9 „kein Fehler ohne Vermerk")

1. **`w:lvlOverride`** (pro-Numerierungsinstanz-Überschreibung einzelner
   `w:lvl`-Einträge innerhalb eines `<w:num>`) wird vom Reader nicht ausgewertet
   (Abschnitt 7.2). Seltener Fall in freier Wildbahn, aber möglich — als
   bekannte Einschränkung dokumentiert, kein Show-Stopper für diese Datei.
2. **Bild als einziges Kind eines Listenpunkts beim DOCX-Import:** Unabhängig von
   diesem Feature entdeckt — `paragraphToBlocks` (`reader.ts:146-183`) liefert für
   einen `<w:p>` mit **nur** einem Bild (keinem Textlauf) ausschließlich einen
   `{type:'image'}`-Block, nie einen `{type:'paragraph'}`-Block. Die
   Marker-Zuordnung in `readBodyChildren` (Zeile 319,
   `block.type === 'paragraph' ? marker : { numId: null }`) hängt den
   Listen-Marker aber nur an `paragraph`-Blöcke — ein bildreiner Listenpunkt
   würde also schon vor diesem Feature beim Import **komplett aus der Liste
   fallen**. Vorbestehender, von dieser Anforderung unabhängiger Defekt
   (betrifft Grenzfall 6 nur am Rande, da dort der Editor-Fall gemeint ist, nicht
   der Import-Fall) — als Ticket/Vermerk festzuhalten, nicht Teil dieses Umbaus.
3. **Mehrfach-Ebenen-Sprung in einer Fremddatei** (z. B. `w:ilvl` springt direkt
   von 0 auf 2 ohne Zwischenpunkt): Der in Abschnitt 7.3 beschriebene
   Stack-Aufbau klemmt in diesem Fall auf der zuletzt erreichbaren Ebene fest
   (kein Absturz, aber die Zieldatei-Ebene wird nicht 1:1 erreicht) — dokumentiert
   als bewusste, defensive Vereinfachung, betrifft nur pathologische/synthetische
   Dateien, nicht die realen Repo-Fixtures (verifiziert an
   `ComplexNumberedLists.docx` im Rahmen von Testfall 11.3).
4. **Dangling Testverweis:** Ein Kommentar in
   `src/formats/docx/__tests__/external-fixtures.test.ts:37-39` verweist auf
   `tests/e2e/large-document-import.spec.ts` — diese Datei existiert im Repo
   **nicht** (verifiziert per `Glob` über `tests/e2e/**/*`, nur 4 Dateien
   vorhanden). Unabhängig von diesem Feature, aber während der Codeprüfung
   entdeckt — als eigener Vermerk festzuhalten, nicht Gegenstand dieses Plans.

---

## 15. Bezug zu den Abnahmekriterien (Anforderung Abschnitt 7)

| # | Kriterium | Abgedeckt durch |
|---|---|---|
| 1 | Tab/Shift-Tab gebunden, kein Fokusverlust, korrekte Abgrenzung | Abschnitt 2 (`commands.ts`), Abschnitt 3 (`WordEditor.tsx`), E2E-Tests 1/2/13 |
| 2 | DOCX-Import liest `w:ilvl` korrekt | Abschnitt 7 (`reader.ts`), Unit-Test 11.1/11.3 |
| 3 | DOCX-Export schreibt `w:ilvl` + `numberingXml()` für alle Ebenen | Abschnitt 5+6 (`styleDefs.ts`, `writer.ts`), Unit-Test 11.1 |
| 4 | ODT-Export/-Import für 2–3 Ebenen geprüft (echte App/Validator) | Abschnitt 8+9 (`styleRegistry.ts`, `reader.ts`), manuelle Prüfung Abschnitt 13.1 |
| 5 | Alle Testfälle aus §6 als E2E vorhanden und grün | Abschnitt 12 (`list-indent.spec.ts`) |
| 6 | Rundreise-Matrix §5.1–5.3 bestanden, inkl. realer Fixtures | Abschnitt 11.3/11.4, Abschnitt 12 (Testfall 11/12) |
| 7 | Jeder Grenzfall einzeln geprüft und Verhalten festgehalten | Abschnitt 1 (Design-Entscheidungen), Abschnitt 12 (Tabelle), Abschnitt 14 |
| 8 | Abgrenzung zu `mehrstufige-liste` im Backlog vermerkt | Abschnitt 5/8 (bewusst kein Symbolwechsel je Ebene) — nach Umsetzung in `FEATURE-BACKLOG.md` nachtragen |
| 9 | Kein gefundener Fehler ohne Ticket/Vermerk | Abschnitt 14 |

---

## 16. Empfohlene Umsetzungsreihenfolge

1. `commands.ts` + `WordEditor.tsx` + `Toolbar.tsx` (Editor-Verhalten isoliert
   testbar, unabhängig von Import/Export).
2. `docx/styleDefs.ts` + `docx/writer.ts` (Export korrekt, bevor der Reader
   darauf aufbauende Rundreise-Tests bekommt).
3. `docx/reader.ts` (Import-Fix — laut Anforderung Zeile 403-404 zwingende
   Voraussetzung für Rundreise-Testfall 5.1.4).
4. `odt/styleRegistry.ts` + `odt/reader.ts` (ODT-Äquivalent; `odt/writer.ts`
   bleibt unangetastet).
5. Unit-Tests (Abschnitt 11) — laufen bereits nach Schritt 2–4 grün.
6. E2E-Tests (Abschnitt 12) — inklusive Cross-Format-Fälle, die auf 2+4
   gleichzeitig aufbauen.
7. Manuelle Verifikation (Abschnitt 13) — LibreOffice-Sichtprüfung, unabhängiger
   Validator.
8. `specs/FEATURE-BACKLOG.md` Status-Update, nur wenn alle obigen Schritte grün
   sind (Abnahmekriterium 1-9 vollständig erfüllt).
