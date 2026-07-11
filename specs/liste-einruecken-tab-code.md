# Umsetzungsplan: „Listenebene per Tab ändern" (`liste-einruecken-tab`)

Gegenstück zu `specs/liste-einruecken-tab-req.md` (überarbeitete Fassung **2026-07-05**, „Code
Zeile für Zeile neu verifiziert"). Alle Pfade relativ zu `E:\docs`. **Jede unten zitierte Zeile
wurde am 2026-07-05 direkt am aktuellen Quellcode erneut gelesen** (nicht aus der Anforderung
oder einer früheren Fassung dieser Datei übernommen). Gegenüber der ersten Ableitung (2026-07-04)
sind in dieser Fassung ausschließlich **Zeilennummern** (v. a. `WordEditor.tsx`, dessen Keymap
durch das später gebaute `Shift-Delete`/Cut-Feature um ~8 Zeilen nach unten gewandert ist) sowie
die **Test-/Abnahme-Zuordnung** (Anf. §6 hat jetzt **22** Fälle, §7 zusätzlich Kriterium **4b**)
nachgezogen; die Substanz (Kern = drei Editor-Dateien, DOCX-Writer-Typkollaps aus Abschnitt 5)
ist unverändert und war bereits gegen den 2026-07-05-Sachstand korrekt.

> ## ⚠️ Diese Datei wurde vollständig neu abgeleitet (die vorherige Fassung war veraltet)
>
> Die **frühere Version dieses `-code.md`** baute — wie im Kopf der Anforderung (Zeilen
> 12–26) vorhergesagt — auf einem **deutlich älteren Codestand** auf und war in fast jedem
> Abschnitt falsch. Sie behauptete u. a.:
> - „`list_item`, `content: 'paragraph block*'`" (`schema.ts:98-104`) → **falsch**, ist
>   `content: 'block+'` (`schema.ts:147`).
> - „harte `w:ilvl="0"` in `writer.ts:103`", Parameter `listNumId: number` → **falsch**, der
>   Writer hat längst `ListContext { numId, level }` und schreibt `w:ilvl` je Tiefe
>   (`writer.ts:96-99, 114-116, 134-136`).
> - „nur ein Ebene-0-`<w:lvl>` in `styleDefs.ts:37-46`" → **falsch**, `numberingXml()`
>   erzeugt **alle 9 Ebenen** (`styleDefs.ts:50-74`).
> - „`groupLists` … Ersatz durch einen Stack-basierten Aufbau" → **falsch**, `groupLists`
>   ist **bereits** Stack-/`Frame`-basiert und verschachtelt korrekt (`reader.ts:379-440`).
> - „`commands.ts` wird in `WordEditor.tsx` gar nicht importiert" → **falsch**, Zeile 12
>   importiert `cutSelection, insertHardBreak` daraus.
> - „Dangling Testverweis: `large-document-import.spec.ts` existiert nicht (nur 4
>   E2E-Dateien)" → **falsch**, die Datei existiert, die Suite hat **17** `*.spec.ts`.
> - „generische aber **ungetestete** ODT-Rekursion" → **falsch**, es gibt **grüne**
>   2-Ebenen-Rundreisetests für DOCX **und** ODT (`roundtrip.test.ts`).
>
> Ein vollständiges Änderungsprotokoll steht in **Abschnitt 12**. Konsequenz: Die tatsächlich
> zu bauende Menge ist **erheblich kleiner** als in der alten Fassung; der Kern ist rein
> editorseitig (drei Dateien). Import/Export-Verschachtelung ist gebaut **und getestet** und
> wird **verifiziert, nicht neu gebaut**.

---

## 0. Verifizierter Code-Stand (Ist), gegen den gebaut wird

Gegliedert wie die Anforderung: **(A) fehlt wirklich**, **(B) vorhanden + bereits getestet**,
**(C) vorhanden, aber mit konkreter Rest-Lücke**. Zeilennummern sind der **aktuelle** Stand.

### (A) Tatsächlich fehlend — der eigentliche Feature-Kern

| Fundstelle (aktuell) | Ist |
|---|---|
| `src/formats/shared/editor/WordEditor.tsx:85-107` (Keymap-Objekt) | Gebunden: `Mod-z/Mod-y/Mod-Shift-z` (93-95), `Enter: splitListItem(wordSchema.nodes.list_item)` (96), `Shift-Enter: insertHardBreak()` (97), `Mod-b/i/u` (98-100), `Shift-Delete: cutSelection(...)` (106). **Kein `Tab`, kein `Shift-Tab`.** Danach `keymap(baseKeymap)` (108), `columnResizing()` (109), `tableEditing()` (110). |
| `src/formats/shared/editor/commands.ts:2` | Import nur `wrapInList, liftListItem`. **`sinkListItem` nirgends importiert** (projektweit kein Treffer). Einziger Ausrück-Befehl `liftFromList()` (62-64); kein Einrück-Befehl. |
| `src/formats/shared/editor/Toolbar.tsx:241-273` | Drei Listen-Buttons: „• Liste"/`Aufzählung` (241-251), „1. Liste"/`Nummerierte Liste` (252-262), „⇧ Liste"/`Liste aufheben`→`liftFromList()` (263-273). **Kein** Einrück-Button; kein `title`/`aria-label` nennt Tab. |
| E2E-Tastatur-Abdeckung | **Keine** der 17 `tests/e2e/*.spec.ts` prüft Tab/Umschalt+Tab. |

### (B) Vorhanden **und bereits durch grüne Tests belegt** — nur verifizieren, nicht bauen

| Fundstelle (aktuell) | Ist |
|---|---|
| `schema.ts:115-152` | `bullet_list`/`ordered_list` `content:'list_item+'` (`ordered_list.attrs.start` Default 1, Z. 127); **`list_item` `content:'block+'`** (Z. 147) mit Begründungskommentar (139-145) zu `listLevel10.odt`/`imageWithinList.odt`. Nesting ist strukturell voll unterstützt; `sink/liftListItem` arbeiten rein per `NodeType`-Vergleich. |
| `docx/reader.ts:294-302` | `listMarkerFor` liest `numId` **und** `ilvl` (`ListMarker { numId, ilvl }`, 289-292). |
| `docx/reader.ts:379-440` | `groupLists` baut aus der flachen `<w:p>`-Folge per `Frame`-Stack (openFrame 389-392, closeFrame 394-403) eine **korrekt verschachtelte** Liste; tieferes `ilvl` öffnet Unterliste im zuletzt eingefügten `list_item`, flacheres schließt und hängt sie ein. |
| `docx/writer.ts:96-140` | `ListContext { numId, level }` (96-99), `MAX_LIST_ILVL=8` (103); Absatz schreibt `<w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${numId}"/></w:numPr>` (114-116); verschachtelte Liste → `level+1` (gedeckelt 8), gleiche `numId` (134-136). |
| `docx/styleDefs.ts:50-74` | `numberingXml()` definiert **alle 9 Ebenen** für Bullet (`bulletLevelsXml` 50-55, Glyphen `• ◦ ▪`) und Ordered (`orderedLevelsXml` 57-62, Formate `decimal/lowerLetter/lowerRoman`). |
| `odt/reader.ts:286-299` | `elementToBlocks` Fall `text:list` rekursiert generisch (jedes `list-item`-Kind erneut durch `elementToBlocks`, Z. 290, `depth+1`) → verschachtelte Listen bleiben erhalten. |
| `odt/writer.ts:99-109` | `blockToOdt` Fall `bullet_list`/`ordered_list` rekursiert generisch (Z. 104) → verschachteltes `<text:list>` im `<text:list-item>`. |
| **`docx/__tests__/roundtrip.test.ts:178-204`** | **Grüner** Test „preserves a nested list two levels deep" (Bullet Ebene 1 → Ebene 2, Struktur + Text bleiben erhalten). |
| **`odt/__tests__/roundtrip.test.ts:169-194`** | **Grüner** ODT-Zwilling desselben 2-Ebenen-Tests. |
| `tests/e2e/large-document-import.spec.ts` | Existiert; Suite hat 17 `*.spec.ts`. |

### (C) Vorhanden, aber mit konkreter Rest-Lücke (bewusst zu bauen bzw. zu entscheiden)

| Fundstelle (aktuell) | Rest-Lücke |
|---|---|
| `docx/reader.ts:78-98` `parseNumberingXml` | Liest je `abstractNum` **nur das erste** `<w:lvl>` (Z. 84 `firstChildNS(... 'lvl')`) → **ein** Typ je `numId` (Rückgabe `Map<string,'bullet'|'ordered'>`). `groupLists.openFrame` (390) fragt `kindByNumId.get(numId)` **ohne Ebene**. → Gemischt-typige Fremddatei (Bullet Ebene 0 / Decimal Ebene 1, z. B. `ComplexNumberedLists.docx`) bekommt **beim Import beide Ebenen mit dem Typ von Ebene 0**. |
| `odt/reader.ts:70-75` `parseAutomaticStyles` / `listKinds` | `hasNumber = childElements(...'list-level-style-number').length>0` (Z. 73) prüft nur, ob **irgendwo** im `text:list-style` ein Number-Level steht — **unabhängig von `text:level`** → ein Typ je Stilname (`listKinds: Map<string,'bullet'|'ordered'>`, Z. 26). `elementToBlocks` (288) fragt ohne Ebene. Analoge Import-Lücke wie DOCX, betrifft z. B. `listLevel10.odt`. |
| `odt/styleRegistry.ts:98-103` `listStyleDefs` | `LB`/`LO` definieren nur **`text:level="1"`**. Für Ebene 2+ existiert **keine** Bullet-/Nummern-/Einzugs-Definition → Darstellung tieferer Ebenen in LibreOffice/Word nicht aus dem Export ableitbar (rein visuell/interoperabel; die eigene Rundreise zählt Ebene über XML-Tiefe und ist **nicht** betroffen). |
| `docx/styleDefs.ts:50-62` | Erzeugte `<w:lvl>` haben `numFmt`/`lvlText`, aber **kein `<w:pPr><w:ind/>`** (per-Ebene-Einzug) und **kein `<w:start>`/`<w:lvlJc>`**. In Word ist die Tiefe daher ggf. nur am Symbol, nicht am Einzug erkennbar. **Zusätzlicher, beim Audit gefundener Defekt:** `orderedLevelsXml` (57-62) setzt `lvlText` zyklisch `%1./%2./%3.` per `ilvl % 3` — ab `ilvl ≥ 3` referenziert `%N` damit den Zähler einer **flacheren** Ebene (ilvl 3 → `%1.` = Ebene-0-Zähler) statt des eigenen. Latente Fehlanzeige tief verschachtelter **nummerierter** Listen. |
| `index.css:63-67` | `.ProseMirror ul, .ProseMirror ol { padding-left:1.4em; margin:0 0 0.6em; }` — Nachfahren-Selektor, `padding-left` **addiert sich je Verschachtelung**; kein `list-style-type` → UA-Stylesheet liefert Symbol-/Zählerwechsel je Tiefe. Für „sichtbar unterscheidbar" (Anf. 3.9) genügend; **keine Änderung nötig**, nur verifizieren. |

### Fazit des Ist-Stands

„fehlt" ist **nur für die Bedienung** (Tab/Umschalt+Tab) korrekt. Für **gleichartige** (Tab-
typische, durchweg gleichtypige) Listen ist die Rundreise **bereits gebaut und getestet** —
es genügt der editorseitige Kern (Abschnitt 2). Die Punkte aus (C) betreffen ausschließlich
**gemischt-typige Fremddateien** und die **visuelle Ausgestaltung tieferer Ebenen**; sie sind
Verbesserungen mit klar begrenzter Wirkung (siehe Abschnitte 4–5), kein Bestandteil des
Kernpfads.

---

## 1. Design-Entscheidungen (bindend)

1. **Tab-Command konsumiert IMMER, sobald der Anker in einem `list_item` liegt — unabhängig
   vom `sinkListItem`-Rückgabewert.** Begründung, **am Bibliothekscode verifiziert**
   (`node_modules/prosemirror-schema-list/dist/index.js:264-288`): `sinkListItem` gibt `false`
   **ohne zu dispatchen** zurück, wenn (a) kein Listen-`blockRange` gefunden wird (`!range`,
   Z. 269 — „nicht in einer Liste"), (b) der Punkt der erste seiner (Unter-)Liste ist
   (`startIndex==0`, Z. 272-273) oder (c) der Vorgänger kein `list_item` ist (Z. 275). Fälle
   (a) und (b)/(c) sind **am Rückgabewert nicht unterscheidbar**. Ein naives
   `Tab: sinkListItem(...)` würde daher beim **ersten** Punkt (Fall b) `false` liefern →
   `keymap` reicht Tab mangels weiterer Bindung an den Browser → **Fokus verlässt den Editor**
   (genau die Regression aus Grenzfall 1/Anf. 4.1). Der neue Command prüft deshalb **zuerst
   strukturell** `isInListItem(state)`; ist das `true`, ruft er `sinkListItem` (das nur
   dispatcht, wenn es wirkt) und gibt **immer `true`** zurück (Taste konsumiert). Da im No-Op
   kein `dispatch` erfolgt, entsteht **kein leerer Undo-Schritt** (Anf. 3.8). Außerhalb jedes
   Listenkontexts gibt der Command `false` zurück (Anf. 3.2/4.17, Abgrenzung `tabulator-zeichen`).
2. **Symmetrisch für `Shift-Tab`/`liftListItem`.** `liftListItem` (Lib-Z. 206-218) gibt „im
   Listenkontext aber wirkungslos" praktisch nie zurück; aus Konsistenz/Robustheit erhält
   `Shift-Tab` denselben „im-Listenkontext-immer-konsumieren"-Wrapper.
3. **Grenzfall 18 (Button „Liste aufheben" ↔ `Shift-Tab`):** Der Button bleibt **unverändert**
   bei `liftFromList()`. `Shift-Tab` und Button rufen **dieselbe** `liftListItem`-Funktion auf
   → identisches Verhalten (Ebene 1: entfernen; Ebene ≥ 2: eine Ebene aus). Kein zweiter
   Codepfad.
4. **Editor-Tiefendeckel = 9 Ebenen** (Index 0–8), passend zu OOXML `w:ilvl` 0–8 und der hier
   gewählten ODF-Konvention `text:level` 1–9. Ein Tab auf der tiefsten Ebene ist struktureller
   No-Op — der Wrapper konsumiert die Taste dennoch (Punkt 1). Der Deckel wird **nicht** im
   Editor-Command hart erzwungen (der `writer.ts:135`-Deckel `MAX_LIST_ILVL=8` fängt den Export
   ab; ODF-Lookup deckelt beim Import, Abschnitt 4d); es genügt, dass **kein Crash/kein
   undefiniertes Verhalten** entsteht (Grenzfall 2 → Testfall in 6.1/6.4). *Optional* könnte der
   Command bei erreichter Tiefe 9 gar nicht erst `sinkListItem` aufrufen; nicht erforderlich.
5. **Kein Typwechsel je Ebene durch Tab** (Grenzfall 7): `sinkListItem` erzeugt strukturell
   stets denselben Knotentyp — unverändert, außerhalb des Scopes (`mehrstufige-liste`).
6. **DOCX-Rundreise gemischt-typiger Ebenen ist mit dem statischen Numbering-Schema NICHT
   erhaltbar (siehe Abschnitt 5, Kernentscheidung).** Der reine Kernfall (gleicher Typ je Kette)
   ist nicht betroffen.

---

## 2. KERN — der einzige für das Feature zwingend nötige Umbau (drei Editor-Dateien)

> **Riskantester/​härtester Teil zuerst** (vgl. Sequenzierungswunsch): Der Fokus-Schutz aus
> Design-Entscheidung 1 ist die eigentliche Fehlerquelle des Features und wird zuerst gebaut
> und **unit-getestet** (Abschnitt 6.3), bevor irgendein Import/Export angefasst wird.

### 2.1 `src/formats/shared/editor/commands.ts`

**Ist:** Import Z. 2 `import { wrapInList, liftListItem } from 'prosemirror-schema-list'`;
`liftFromList()` (62-64) einziger listenbezogener Befehl. Das Muster „Vorfahren-Tiefe
durchlaufen" existiert bereits in `isAlignActive` (29-38).

**Änderung** (Import erweitern; Helfer + zwei Commands ergänzen; `liftFromList` unverändert):

```ts
import { wrapInList, liftListItem, sinkListItem } from 'prosemirror-schema-list'
// ...

/** True, wenn der Selektionsanker irgendwo in einem list_item liegt (beliebige Tiefe,
 *  auch innerhalb einer Tabellenzelle). Spiegelt den Tiefen-Durchlauf aus isAlignActive. */
function isInListItem(state: EditorState): boolean {
  const { $from } = state.selection
  for (let depth = $from.depth; depth >= 0; depth--) {
    if ($from.node(depth).type === wordSchema.nodes.list_item) return true
  }
  return false
}

/** Tab: eine Ebene tiefer verschachteln. Außerhalb jedes Listenkontexts `false` (keymap
 *  reicht Tab weiter — Abgrenzung tabulator-zeichen). Im Listenkontext IMMER `true`
 *  (Taste konsumiert), auch beim wirkungslosen No-Op (erster Punkt) — verhindert
 *  Fokusverlust; ohne dispatch entsteht dann kein leerer Undo-Schritt (Design-Entsch. 1). */
export function indentListItem(): Command {
  const sink = sinkListItem(wordSchema.nodes.list_item)
  return (state, dispatch) => {
    if (!isInListItem(state)) return false
    sink(state, dispatch)
    return true
  }
}

/** Shift-Tab: eine Ebene aus (Ebene ≥ 2) bzw. ganz aus der Liste (Ebene 1) — gleiche
 *  liftListItem-Semantik wie liftFromList(), mit demselben Fokus-Schutz (Design-Entsch. 2). */
export function outdentListItem(): Command {
  const lift = liftListItem(wordSchema.nodes.list_item)
  return (state, dispatch) => {
    if (!isInListItem(state)) return false
    lift(state, dispatch)
    return true
  }
}
```

`isInListItem` bleibt unexportiert. Der Guard nutzt bewusst nur `$from` (den Anker); Folge für
gemischte Selektion (Listenpunkt + Folgeabsatz, Grenzfall 4/16): Tab wird **konsumiert**, aber
`sinkListItem` findet keinen passenden `blockRange` → No-Op ohne dispatch. Dieses „konsumieren,
aber wirkungslos" ist das dokumentierte Ergebnis (Testfall 6, §6-16).

### 2.2 `src/formats/shared/editor/WordEditor.tsx`

**Ist:** Import Z. 12 `import { cutSelection, insertHardBreak } from './commands'` (die Datei
importiert also **bereits** aus `commands.ts`). Keymap-Objekt 85-107.

**Änderung:**

```ts
import { cutSelection, insertHardBreak, indentListItem, outdentListItem } from './commands'
// ...
// im keymap({...})-Objekt, direkt nach 'Shift-Enter': insertHardBreak(),  (Z. 97):
          Tab: indentListItem(),
          'Shift-Tab': outdentListItem(),
```

**Konfliktfreiheit verifiziert** (nicht angenommen): `keymap(baseKeymap)` (Z. 108) bindet kein
`Tab` (grep in `prosemirror-commands/dist/index.js`: kein Treffer). `tableEditing()` (Z. 110)
registriert **keine** eigene Keymap — `prosemirror-tables` exportiert zwar `goToNextCell`, bindet
es aber nirgends; solange die Zellen-Tab-Navigation nicht existiert (Anf. 2.6/Grenzfall 5),
**kein** Konflikt. `gapCursor()`/`dropCursor()` binden kein `Tab`. Die neue Bindung ist damit
der einzige Tab-Konsument. Der Warnkommentar (78-84) betrifft nur `Mod-c/x/v` — nicht berührt.

### 2.3 `src/formats/shared/editor/Toolbar.tsx`

**Ist:** Import-Block 6-20 (u. a. `liftFromList` Z. 15). `run`-Helfer 28-31
(`command(view.state, view.dispatch, view); view.focus()`). Listen-Buttons 241-273.

**Änderung:**
1. Import (6-20) um `indentListItem,` ergänzen.
2. **Neuer Button vor** dem „⇧ Liste"-Button (also vor Z. 263) — Maus-/Touch-/Screenreader-
   Alternative zu Tab, **zwingend** wegen des Tab-Trap-Risikos (Grenzfall 15/Anf. Bedienelement 4):

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

3. Bestehenden „⇧ Liste"-Button (263-273): `title` erweitern + `aria-label` ergänzen
   (Bedienelement 7):

```tsx
  title="Liste aufheben / Einzug verringern (Umschalt+Tab)"
  aria-label="Liste aufheben / Einzug verringern (Umschalt+Tab)"
```

Kein aktiver/deaktivierter Zustand für die Listen-Buttons (wie bisher; anders als
`MarkButton`/`AlignButton`) — Anf. verlangt keinen. Kein Kontextmenü (Bedienelement 8: kein Soll).

**Mit diesen drei Dateien ist das Feature im Editor funktionsfähig und für gleichartige Listen
in DOCX und ODT bereits rundreisefähig** (Audit B, bestehende grüne 2-Ebenen-Tests).

---

## 3. Bewusst KEINE Änderung (mit Begründung, damit es nicht versehentlich „gebaut" wird)

| Datei | Warum unverändert |
|---|---|
| `src/formats/shared/schema.ts` | `list_item` ist bereits `block+` (147). Nesting voll unterstützt. |
| `src/index.css` | Nachfahren-Selektor (63-67) kaskadiert bereits in verschachtelte `ul/ol`; UA-Stylesheet liefert Symbol-/Zählerwechsel. Erfüllt 3.9/3.10. **Verifizieren** statt ändern. |
| `src/formats/odt/writer.ts` | Verschachtelung entsteht generisch korrekt (99-109). ODF kodiert die Ebene über XML-Tiefe, nicht als Attribut — die in 4c neu definierten `text:level="2..9"` greifen automatisch. |
| `src/formats/docx/writer.ts` (Kern-Nesting) | `w:ilvl` je Tiefe + `numId`-Vererbung sind korrekt **für gleichtypige** Ketten. Eine Änderung ist **nur** für die optionale DOCX-Gemischt-Rundreise (Abschnitt 5, Option A) nötig. |

---

## 4. Enhancements (jeweils optional, mit klar begrenzter Wirkung)

> Alle vier verbessern **ausschließlich** (a) die visuelle Darstellung tieferer Ebenen in
> fremden Zielanwendungen bzw. (b) die **Anzeige beim erstmaligen Import** gemischt-typiger
> **Fremddateien**. Für den Kernpfad (Abschnitt 2) und die gleichtypige Eigenrundreise sind sie
> **nicht** erforderlich. Sie decken die Anforderungspunkte (C)/Audit-C, 4.10 und
> Abnahmekriterien 4/5 ab.

### 4a. `src/formats/docx/styleDefs.ts` — per-Ebene-Einzug + `%N`-Fix (Word-Darstellung)

> **Präzisierung (2026-07-05, gegen den tatsächlichen Testbestand geprüft):** `numberingXml()`
> wird **projektweit von keinem Unit-Test strukturell geprüft** — `docx/__tests__/styleDefs.test.ts`
> (aktuell 21 Zeilen) testet ausschließlich `headingStylesXml()`; `numberingXml` erscheint im
> gesamten `src/`-Baum nur als Definition (`styleDefs.ts`) und als Aufrufer (`writer.ts`), plus
> einer gleichnamigen, aber unabhängigen lokalen Variable `numberingXmlText` in
> `reader.ts:498-499` (String aus `word/numbering.xml`, keine Test-Berührung). Der Tiefenerhalt
> selbst ist zwar indirekt über `roundtrip.test.ts` (Audit B) abgedeckt, aber die konkrete
> `<w:lvl>`-Struktur (Einzug, `%N`-Referenz je Ebene) hat **keinen** bestehenden Test, der
> „nachgezogen" werden könnte. Abschnitt 6.2 unten ist entsprechend korrigiert: **neuer**
> `describe('numberingXml')`-Block, keine Anpassung eines bestehenden.

**Ist:** `bulletLevelsXml` (50-55) / `orderedLevelsXml` (57-62) ohne `w:ind`/`w:start`; Ordered-
`lvlText` zyklisch `%1./%2./%3.` (Zähler-Fehlreferenz ab ilvl ≥ 3, siehe (C)).

**Änderung** (ein gemeinsamer Level-Generator; `numberingXml()` 64-74 ruft ihn 9×):

```ts
export const MAX_DOCX_LIST_LEVEL = 8 // w:ilvl 0..8 (Grenzfall 2)

function bulletLevelXml(ilvl: number): string {
  const indent = (ilvl + 1) * 720 // Twips (~0,5" je Ebene, Word-typisch)
  return (
    `<w:lvl w:ilvl="${ilvl}"><w:start w:val="1"/><w:numFmt w:val="bullet"/>` +
    `<w:lvlText w:val="${BULLET_GLYPHS[ilvl % BULLET_GLYPHS.length]}"/><w:lvlJc w:val="left"/>` +
    `<w:pPr><w:ind w:left="${indent}" w:hanging="360"/></w:pPr></w:lvl>`
  )
}

function orderedLevelXml(ilvl: number): string {
  const indent = (ilvl + 1) * 720
  const fmt = ORDERED_FORMATS[ilvl % ORDERED_FORMATS.length].fmt
  // FIX: eigener Zähler je Ebene — %N referenziert den Zähler von ilvl N-1, also für die
  // eigene Ebene stets %${ilvl+1}. (Alt: zyklisches %1./%2./%3. brach ab ilvl>=3.)
  return (
    `<w:lvl w:ilvl="${ilvl}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/>` +
    `<w:lvlText w:val="%${ilvl + 1}."/><w:lvlJc w:val="left"/>` +
    `<w:pPr><w:ind w:left="${indent}" w:hanging="360"/></w:pPr></w:lvl>`
  )
}
```

Bewusst **kein** je Ebene wechselndes Bullet-Symbol über `• ◦ ▪` hinaus (bleibt
`mehrstufige-liste`-Scope). Der `%N`-Fix ist ein eigenständiger, beim Audit gefundener
Darstellungs-Defekt (Vermerk für Abnahmekriterium 9). **Regression:** Der bestehende Test
`styleDefs.test.ts` ist auf die neue Struktur nachzuziehen.

### 4b. `src/formats/docx/reader.ts` — `parseNumberingXml` ebenengenau (Import-Anzeige Fremddatei)

**Ist:** 78-98, ein Typ je `numId` (`Map<string,'bullet'|'ordered'>`).

**Änderung:** Rückgabetyp → `Map<string, Map<number,'bullet'|'ordered'>>`, **alle** `<w:lvl>`
je `abstractNum` lesen (per `childElements(abstractEl, w, 'lvl')`, je `ilvl` das `numFmt`);
`groupLists`-Signatur-Typ (379) mitziehen; **`openFrame` (389-392)** löst den Typ ebenengenau
auf:

```ts
const openFrame = (numId: string, ilvl: number) => {
  const byLevel = kindByNumId.get(numId)
  const kind = byLevel?.get(ilvl) ?? byLevel?.get(0) ?? 'bullet'
  stack.push({ numId, ilvl, node: { type: kind === 'ordered' ? 'ordered_list' : 'bullet_list', content: [] } })
}
```

`readDocx` (498-499) reicht `kindByNumId` unverändert durch (nur der Typ ändert sich).
`w:lvlOverride` innerhalb `<w:num>` wird bewusst **nicht** ausgewertet (Restrisiko, Abschnitt 9).
**Wirkung präzise:** verbessert die **Anzeige beim Import** von `ComplexNumberedLists.docx`
(Bullet Ebene 0 / Decimal Ebene 1). **Kein** Effekt auf die DOCX-**Rundreise** gemischter Typen
(der Export baut `numbering.xml` statisch neu, Abschnitt 5).

### 4c. `src/formats/odt/styleRegistry.ts` — `text:level` 1–9 (LibreOffice/Word-Darstellung)

**Ist:** 98-103, nur `text:level="1"` für `LB`/`LO`.

**Änderung:** `MAX_ODT_LIST_LEVEL = 9`; je Ebene 1–9 ein `text:list-level-style-bullet`
(`LB`, `text:bullet-char="•"`) bzw. `text:list-level-style-number` (`LO`, `style:num-format="1"`,
`style:num-suffix="."`), jeweils mit `text:space-before="${0.5*level}cm"` /
`text:min-label-width="0.5cm"`. `listStyleDefs()` baut beide Stile per `Array.from({length:9})`.
Kein `text:display-levels` (jede Ebene zählt unabhängig ab 1 — Mindestanf. 3.9, kein „1.1"). Der
Writer (`writer.ts:210` referenziert `listStyleDefs()`) bleibt unverändert.

### 4d. `src/formats/odt/reader.ts` — `listKinds`/`elementToBlocks` ebenengenau (Import-Anzeige Fremddatei)

**Ist:** `ParsedStyles.listKinds: Map<string,'bullet'|'ordered'>` (26); `parseAutomaticStyles`
setzt ein Flag je Stilname (70-75); `elementToBlocks` (250-324) führt `depth` (generischer
Nesting-Guard, **nicht** Listenebene) und fragt `listKinds.get(styleName)` ohne Ebene (288).

**Änderung:**
- `listKinds` → `Map<string, Map<number,'bullet'|'ordered'>>`.
- `parseAutomaticStyles` (70-75): je `text:list-style` alle Ebenen-Kinder iterieren, `text:level`
  lesen, `list-level-style-number` → `'ordered'`, `list-level-style-bullet` → `'bullet'`, in
  `Map<level,kind>` ablegen.
- `elementToBlocks` bekommt **separaten** Parameter `listLevel = 1` (zusätzlich zu `depth`):
  im `text:list`-Fall (286-299) `kind = byLevel?.get(min(listLevel,9)) ?? byLevel?.get(1) ?? 'bullet'`;
  `list-item`-Kinder mit `listLevel + 1` rekursieren; im `table`-Fall (301-321) Zellinhalte mit
  `listLevel = 1` **zurücksetzen** (Grenzfall 5/6). Aufrufer (`readOfficeTextChildren` 352,
  Header/Footer 380/384) unverändert (Default `listLevel=1`).

**Wirkung präzise:** verbessert die **Import-Anzeige** von `listLevel10.odt` u. ä.; für die eigene
ODT-Rundreise **nicht** nötig (unser Writer nutzt getrennte Stilnamen `LB`/`LO`, der Reader
mappt korrekt per Stilname — die gemischte Eigenrundreise funktioniert bereits, siehe Abschnitt 5).

---

## 5. Kernentscheidung: DOCX-Rundreise **gemischt-typiger** Ebenen (korrigiert die Anforderung)

**Befund (am Code hergeleitet).** Die Anforderung (5.1.2, 4.7, Abnahmekriterium 4) nimmt an, die
**Reader-Fixes (Audit C / 4b, 4d)** genügten, damit eine 3-stufig **gemischte** Eigenrundreise
(z. B. Bullet Ebene 1 / Nummeriert Ebene 2) Typ **und** Tiefe behält. Das ist **für ODT richtig,
für DOCX aber unvollständig**:

- **ODT:** `blockToOdt` (101) wählt den Stilnamen nach **Knotentyp** (`LB`/`LO`). Eine gemischte
  Verschachtelung schreibt also `<text:list style="LB"> … <text:list style="LO"> …`. Beim
  Reimport mappt der Reader je Stilname korrekt (`LB`→bullet, `LO`→ordered) — **Typ + Tiefe
  bleiben erhalten, schon ohne 4d**. ✔
- **DOCX:** `blockToDocx` (134-136) behält für eine verschachtelte Liste **die `numId` der
  Elternliste** und erhöht nur `w:ilvl`. Eine gemischte Kette Bullet(ilvl0)→Ordered(ilvl1) wird
  daher mit **einer einzigen `numId` (der Bullet-`numId` 1)** geschrieben. Diese `numId` verweist
  auf `BULLET_ABSTRACT_ID` (0), dessen **alle** Ebenen `numFmt="bullet"` sind. Beim Reimport
  liefert selbst der ebenengenaue `parseNumberingXml` (4b) für `numId 1` auf **jeder** Ebene
  `bullet` → **die nummerierte Unterebene fällt auf Bullet zurück. Tiefe bleibt, Typ geht
  verloren.** ✘ Der Reader-Fix allein kann das **nicht** heilen, weil bereits der **Writer** die
  Typinformation in eine gleichförmige `numId` kollabiert.

Das statische Zwei-`abstractNum`-Schema (je eins durchgängig Bullet / durchgängig Ordered) kann
eine **Ebene-0-Bullet/Ebene-1-Decimal-Kette unter einer `numId` prinzipiell nicht** kodieren
(getrennte `numId`s ⇒ getrennte, flache Listen beim Import; keine Verschachtelung).

**Optionen:**

- **Option A (voll konform, aber groß):** In `writer.ts` **pro Dokument** ein
  `numbering.xml` generieren: je oberster Liste eine `numId` mit einem `abstractNum`, dessen
  `<w:lvl>`-Typen der **tatsächlichen** Typkette der Verschachtelung entsprechen. Erfordert das
  Ausklammern von `numberingXml()` aus `styleDefs.ts` in eine dokumentabhängige Erzeugung und
  einen Zwei-Durchlauf über den Body. **Das ist im Kern `mehrstufige-liste`-Arbeit.**
- **Option B (empfohlen, korrekt gescoped):** Statisches Schema **behalten**. Reader-Fix 4b
  dennoch umsetzen (verbessert die **Anzeige** beim Fremddatei-**Import**, Abnahmekriterium 4,
  Testfall 6.9). **Explizit dokumentieren**, dass eine **DOCX-Rundreise einen Ebenen-Typwechsel
  nicht erhält** (nur Tiefe + Typ der obersten Ebene) — das gehört zu `mehrstufige-liste`. Der
  **Kernfall (Tab, gleicher Typ je Kette)** ist voll rundreisefähig, weil dort nie ein
  Typwechsel auftritt (Design-Entscheidung 5).

**Empfehlung: Option B.** Sie ist die ehrliche, korrekt abgegrenzte Wahl (deckt sich mit Anf.
Abschnitt 1 „feinabgestimmte Ausgestaltung bleibt `mehrstufige-liste` vorbehalten" und
Grenzfall 7). **Konsequenz für die Tests:** Der DOCX-Testfall 5.1.2 wird auf **Tiefenerhalt +
Typ-der-obersten-Ebene** geprüft und die Typ-Kollaps-Einschränkung als bewusster, dokumentierter
Befund festgehalten (Abschnitt 6.2, Abschnitt 9). Der **ODT**-Testfall 5.2.2 prüft Typ **und**
Tiefe (funktioniert). **Diese Abweichung von der wörtlichen Anforderung 5.1.2/4.7 ist mit
PO/Lead abzustimmen, bevor gegen die Tests gebaut wird** (Pipeline-Regel „kein Fehler ohne
Vermerk"; die Anforderung überzeichnet hier den Effekt des Reader-Fixes). Entscheidet der PO für
Option A, verschiebt sich der Aufwand erheblich in Richtung `mehrstufige-liste` und ist dort zu
verorten.

---

## 6. Tests

### 6.1 Vitest — bestehende `describe`-Blöcke **erweitern** (nicht neu anlegen)

Die 2-Ebenen-Rundreise ist in **beiden** Suiten bereits grün (`docx …roundtrip.test.ts:178-204`,
`odt …:169-194`) — sie bleibt als Audit-B-Beleg stehen. Ergänzt werden im jeweiligen
`describe('… round trip: lists')` (DOCX 141-205 / ODT 143-195), im vorhandenen Stil
(`doc([...])`, `paragraph(...)`, `roundTrip(...)`):

1. **3-stufig, DOCX (Option B):** `ordered_list > list_item > bullet_list > list_item > ordered_list`.
   Assert: Verschachtelungs-**Tiefe** 3 erhalten; oberste Ebene `ordered_list`; **explizit
   dokumentiert**, dass die gemischte Typkette der Unterebenen nach DOCX-Rundreise auf den Typ
   des `numId`-Abstracts fällt (Abschnitt 5). Deckt 5.1.2 unter Option B ab.
2. **3-stufig, ODT:** analoge Struktur; Assert: **Typ je Ebene** (`ordered/bullet/ordered`)
   **und** Tiefe erhalten (funktioniert; 5.2.2).
3. **Tiefendeckel (Grenzfall 2), DOCX:** 10-fach verschachtelte Liste bauen → `writeDocx` ohne
   Crash; im erzeugten `word/document.xml` (per `JSZip`) **kein `w:ilvl` > 8** (String-/Regex-
   Assertion). ODT-Variante: 10-fach → `writeOdt`/`readOdt` ohne Crash, Struktur bis zum Deckel
   erhalten.

### 6.2 Vitest — `styleDefs.test.ts` um einen `numberingXml()`-Block **ergänzen** (nur bei Umsetzung von 4a)

**Korrigiert gegenüber einer früheren Annahme:** Es gibt **keinen** bestehenden Test der
`<w:lvl>`-Struktur, der „nachgezogen" werden müsste (siehe Präzisierung in 4a) — `styleDefs.test.ts`
enthält bislang nur `describe('DOCX styleDefs: font default', …)` für `headingStylesXml()`. Statt
einer Anpassung ist ein **neuer** `describe('numberingXml', …)`-Block im selben Stil (DOMParser,
Namespace-Zugriff über `getElementsByTagNameNS`) hinzuzufügen, der für Bullet **und** Ordered je
9 `<w:lvl>` prüft: vorhandenes `<w:ind w:left=… w:hanging="360">`, `w:start`, `w:lvlJc`, und für
Ordered speziell `w:lvlText` = `%${ilvl+1}.` auf **jeder** der 9 Ebenen (Regressionstest gegen die
`%N`-Fehlreferenz, die ohne 4a ab `ilvl≥3` `%1./%2./%3.` zyklisch wiederholt).

### 6.3 Vitest — **neue Unit-Tests** für die Commands (`src/formats/shared/editor/__tests__/commands.test.ts`)

> **Klarstellung:** Die Datei **existiert bereits** (aktuell 106 Zeilen, zwei `describe`-Blöcke
> `canCut`/`cutSelection` aus dem Ausschneiden-Feature, Import nur `{ canCut, cutSelection } from
> '../commands'`) — sie wird um zwei **neue** `describe`-Blöcke (`indentListItem`,
> `outdentListItem`) **ergänzt**, nicht neu angelegt. Import entsprechend um
> `indentListItem, outdentListItem` erweitern.

Im Muster der Datei (`EditorState.create({doc: wordSchema.node(...)})`, Selektion setzen, Command
direkt aufrufen, Rückgabe/Doc prüfen — vgl. `stateWithDoc()`/`fakeView()`-Helfer, Z. 5-11/41-46).
**Diese Tests sichern den Fokus-Schutz deterministisch und schnell ab** (ergänzend zu E2E):

- `indentListItem()` bei Cursor in einem **normalen Absatz** → `false` (kein Listenkontext).
- `indentListItem()` beim **ersten** Punkt einer Liste → **`true`**, aber Doc **unverändert**
  (No-Op ohne dispatch) — der regressionskritische Fall (Grenzfall 1/4.1).
- `indentListItem()` beim **zweiten** Punkt → `true` **und** Doc verändert (Unterliste entsteht).
- `outdentListItem()` außerhalb Liste → `false`; auf Ebene-1-Punkt → `true` + Punkt verlässt die
  Liste (identisch zu `liftFromList()`).

### 6.4 Vitest — reale Fixtures (`external-fixtures.test.ts`, dedizierter `describe`-Block)

- **DOCX** (`FIXTURES_DIR = tests/fixtures/external/docx`): `ComplexNumberedLists.docx` importieren
  → rekursiv prüfen, dass **mindestens** ein `list_item` selbst wieder eine `bullet_list`/
  `ordered_list` enthält (Verschachtelungstiefe > 1). Nach 4b zusätzlich: Typ je Ebene korrekt.
- **ODT** (`FIXTURES_DIR = tests/fixtures/external/odt`): dieselbe Tiefen-Assertion für
  `listLevel10.odt`, `simpleList3.odt`, `liste2.odt`; zusätzlich eine **Rundreise**-Assertion
  (`readOdt(await writeOdt(await readOdt(buffer)))`), da 5.2.4 „importieren → exportieren →
  reimportieren" verlangt.
  Beide Blöcke ergänzen die bestehenden generischen Crash-Loops (DOCX `describe(...)` 63-125,
  ODT `describe(...)` 23-76) und ersetzen sie nicht.

### 6.5 Playwright — neue Datei `tests/e2e/list-indent.spec.ts`

Konventionen (verifiziert an `docx.spec.ts`/`odt.spec.ts`): `docxCard`/`odtCard`-Locator
(`docx.spec.ts:59-61`, `odt.spec.ts:43-45`), `beforeEach` mit
`page.getByRole('button',{name:/verstanden/i}).click()`; Import per
`card.locator('input[type="file"]').setInputFiles({name, mimeType, buffer})`; Export per
`page.waitForEvent('download')` + `getByRole('button',{name:'Exportieren'}).click()` +
`download.path()` + `fs.readFile`; Re-Import nach `getByRole('button',{name:/formate/i}).click()`;
Editor `page.locator('.ProseMirror')`; verschachtelte Liste als `.ProseMirror li ul`/`li ol`;
DOCX-Byte-Prüfung wie `docx.spec.ts:88-91` (`<w:b/>`-Muster → analog `w:ilvl`). Abdeckung der 22
Anforderungs-Testfälle (§6):

| §6 | Umsetzung |
|---|---|
| 1, 2 | 3-Punkte-Liste; `keyboard.press('Tab')` auf Punkt 2 → `.ProseMirror li ul` sichtbar; Tab auf Punkt 1 → keine DOM-Änderung **und** `await expect(editor).toBeFocused()` (Fokus-Regression 4.1, muss **vor** dem Bau rot sein). |
| 3, 4 | `Shift+Tab` auf Ebene-2 → Ebene 1, bleibt Listenelement; auf Ebene-1 → wird `<p>`, Text erhalten; DOM-Ergebnis identisch zu Klick auf „⇧ Liste" (4.18). |
| 5 | `Enter` am Punktende, dann `Tab` auf den neuen Punkt (3.7). |
| 6, 7 | `ControlOrMeta+z`/`+y` nach `Tab`; mehrfaches `Tab` → jede Stufe einzeln per Undo (Tiefe je Schritt prüfen). |
| 8 | Ablauf wie `selection-regression.spec.ts`, danach `Tab` als Folgeaktion (4.14). |
| 9, 10 | `setInputFiles` mit `ComplexNumberedLists.docx` bzw. `listLevel10.odt`/`simpleList3.odt` → verschachtelte `ul/ol` im DOM. |
| 11 | 5.1.1–5.1.3 / 5.2.1–5.2.3: im Editor erzeugen → **echter** Download → exportierte Bytes per `setInputFiles` reimportieren → Tiefe/Text/Typ prüfen. |
| 12 | 5.3: DOCX→ODT→DOCX und ODT→DOCX→ODT über Re-Upload der exportierten Datei in die jeweils andere Karte. |
| 13 | `Tab` in normalem Absatz außerhalb jeder Liste → keine Listen-Wirkung (Abgrenzung 4.17). |
| 14 | Tabelle einfügen, Liste in Zelle, `Tab` → nur Ebene ändert sich, kein Zellsprung; zusätzlich `listsInTable.odt`. |
| 15 | Selektion über 2 Punkte (`Shift+ArrowDown`), `Tab` → beide eine Ebene tiefer (3.4). |
| 16 | Selektion Listenpunkt **+** Folgeabsatz, `Tab` → dokumentiertes „konsumiert, aber No-Op" (Design 2.1 / 4.4). |
| 17 | Screenshot-/Sichtvergleich mehrstufige Liste vor Export vs. nach Reimport. |
| 18 | Heruntergeladene DOCX per `JSZip` auf korrekte `w:ilvl`-Werte je Absatz; ODT auf verschachtelte `<text:list>` im `content.xml`. |
| 19 | Gemischt-typige Rundreise: **ODT** Typ+Tiefe; **DOCX** gemäß Option B (Tiefe + oberste Ebene, Typ-Kollaps dokumentiert). |
| 20 | 10× `Tab` auf denselben Punkt → kein Crash, kein undefiniertes `w:ilvl` (Deckel-Nachweis, Grenzfall 2). |
| 21 | (a) Bildreinen Listenpunkt im Editor anlegen (`insertImage` in einen `list_item`), `Tab` → `sinkListItem` bricht **nicht** ab, Bild bleibt erhalten (4.6, auf Schemaebene `block+` gedeckt). (b) Erzeugte/reale DOCX mit bildreinem Listenpunkt importieren → belegen, ob der Punkt in der Liste bleibt; der **vorbestehende DOCX-Import-Defekt** (Abschnitt 9 Punkt 4: `readBodyChildren` hängt den `numId/ilvl`-Marker nur an `paragraph`-Blöcke) ist als **eigenes Ticket** festzuhalten, nicht zu übergehen. |
| 22 | Nummerierte Liste ≥ 4 Ebenen tief per `Tab` erzeugen → **echter** DOCX-Download → `word/numbering.xml`/`document.xml` per `JSZip` prüfen: tragen die tiefen Ebenen die **eigene** Zähler-Referenz (`%${ilvl+1}.` nach Enh. 4a) statt der zyklischen `%1/%2/%3`-Fehlreferenz? Ergebnis (4a umgesetzt **oder** als bekannter Defekt dokumentiert) festhalten (Anf. 4.9/§6-22, Abschnitt 9 Punkt 3). |

---

## 7. Geänderte / neue Dateien (Übersicht)

| Datei | Art | Pflicht? |
|---|---|---|
| `src/formats/shared/editor/commands.ts` | `sinkListItem`-Import; `isInListItem`, `indentListItem`, `outdentListItem`; `liftFromList` unverändert | **Kern** |
| `src/formats/shared/editor/WordEditor.tsx` | Import aus `./commands` erweitern; Keymap `Tab`/`Shift-Tab` | **Kern** |
| `src/formats/shared/editor/Toolbar.tsx` | neuer „Einzug erhöhen"-Button; `title`/`aria-label` von „⇧ Liste" | **Kern** |
| `src/formats/docx/styleDefs.ts` | per-Ebene `w:ind` + `%${ilvl+1}`-Fix; `MAX_DOCX_LIST_LEVEL` | Enh. 4a |
| `src/formats/docx/reader.ts` | `parseNumberingXml` ebenengenau; `groupLists`/`openFrame`-Typ | Enh. 4b |
| `src/formats/odt/styleRegistry.ts` | `listStyleDefs()` Ebene 1–9; `MAX_ODT_LIST_LEVEL` | Enh. 4c |
| `src/formats/odt/reader.ts` | `listKinds` ebenengenau; `elementToBlocks` `listLevel`-Param | Enh. 4d |
| `src/formats/docx/writer.ts` | **nur bei Option A** (Abschnitt 5) — sonst unverändert | optional |
| `src/formats/shared/schema.ts` · `src/index.css` · `src/formats/odt/writer.ts` | **keine Änderung** (Abschnitt 3) | — |
| `src/formats/docx/__tests__/roundtrip.test.ts` · `.../odt/…/roundtrip.test.ts` | 3-stufig + Deckel-Fälle (6.1) | Test |
| `src/formats/docx/__tests__/styleDefs.test.ts` | nachziehen (nur bei 4a) | Test |
| `src/formats/shared/editor/__tests__/commands.test.ts` | Unit-Tests der neuen Commands (6.3) | Test |
| `src/formats/docx/__tests__/external-fixtures.test.ts` · `.../odt/…` | dedizierte Fixture-Blöcke (6.4) | Test |
| `tests/e2e/list-indent.spec.ts` | **neu** — §6-Testfälle 1–20 (6.5) | Test |
| `specs/FEATURE-BACKLOG.md:158` | nach grüner Suite: „fehlt" → „verifiziert"; Abgrenzung zu `mehrstufige-liste` (Z. 157) vermerken | Doku |

---

## 8. Bezug zu den Abnahmekriterien (Anf. §7)

| # | Kriterium | Abgedeckt durch |
|---|---|---|
| 1 | Tab/Shift-Tab gebunden, kein Fokusverlust, Abgrenzung | Abschnitt 2 + Unit-Tests 6.3 + E2E 1/2/13 |
| 2 | DOCX-Import liest `w:ilvl` korrekt | **vorhanden** (B) — bestätigt durch bestehenden Test + 6.4 |
| 3 | DOCX-Export `w:ilvl` + `numberingXml()` alle Ebenen; per-Ebene-`w:ind` entschieden | **vorhanden** (B) + 4a (Einzug ergänzt/`%N` gefixt) |
| 4 | Reader-Ebenen-Typ-Restdefekte behoben (**Import-Anzeige**) | Enh. 4b (DOCX) + 4d (ODT) + Test 6.4; **klar abgegrenzt**: verbessert die Import-Anzeige, **nicht** die DOCX-Rundreise (→ Kriterium 4b) |
| 4b | DOCX-Gemischt-**Rundreise**-Entscheidung dokumentiert (5A) | Abschnitt 5 (Option B empfohlen, Writer-Typkollaps als bewusste, in `mehrstufige-liste` verortete Einschränkung) + Abschnitt 9 Punkt 1; Test 6.1-1/6.5-19-DOCX prüft **Tiefe + oberste Ebene** (kein voller Typerhalt), 6.1-2/6.5-19-**ODT** voll grün (Typ + Tiefe). Option A ist Lead/PO-Beschluss. |
| 5 | ODT-Ebene-2+-Darstellung geklärt | Enh. 4c + manuelle LibreOffice-Prüfung (Abschnitt 10) |
| 6 | Alle §6-Testfälle als E2E grün | 6.5 |
| 7 | Rundreise-Matrix 5.1/5.2/5.3 inkl. realer Fixtures | 6.1/6.4/6.5; DOCX-Gemischt gemäß Option B |
| 8 | Jeder Grenzfall geprüft, Verhalten festgehalten | Abschnitt 1 + 6.3/6.5 + Abschnitt 9 |
| 9 | Abgrenzung `mehrstufige-liste` im Backlog | Abschnitt 7-Zeile Backlog + Abschnitt 5 |
| 10 | Kein stiller Fehlschlag | No-Op nur bewusst (Design 2.1), dokumentiert |
| 11 | Kein Fehler ohne Vermerk; veraltete `-code.md`-Annahmen korrigiert | **Abschnitt 12** (Änderungsprotokoll) + Abschnitt 9 |

---

## 9. Offene Punkte / bekannte Restrisiken (Abnahmekriterium 9/11)

1. **DOCX-Rundreise gemischter Ebenen-Typen** wird unter Option B **nicht** erhalten (nur Tiefe +
   oberste Ebene). Bewusste Abgrenzung zu `mehrstufige-liste`; korrigiert die Annahme der
   Anforderung 5.1.2/4.7. Mit PO/Lead abzustimmen (Abschnitt 5).
2. **`w:lvlOverride`** (`<w:num>`-interne per-Instanz-Überschreibung) wird vom Reader nicht
   ausgewertet (4b). Seltener Realfall — dokumentierte Einschränkung.
3. **`%N`-Fehlreferenz** in nummerierten Ebenen ≥ 4 (alter `orderedLevelsXml`) — durch 4a behoben;
   als eigenständiger Audit-Fund vermerkt.
4. **Bildreiner Listenpunkt beim DOCX-Import** (unabhängig von diesem Feature entdeckt):
   `paragraphToBlocks` (229-280) liefert für ein `<w:p>` mit **nur** Bild einen `image`-Block,
   nie `paragraph`; `readBodyChildren` (476) hängt den Listen-Marker aber **nur** an
   `paragraph`-Blöcke (`block.type==='paragraph' ? marker : {numId:null,ilvl:0}`) → ein
   bildreiner Listenpunkt fällt beim **Import** aus der Liste. Vorbestehend, **nicht** Teil dieses
   Umbaus (Editor-Grenzfall 6 ist auf Schemaebene abgedeckt). Als eigenes Ticket festhalten.
5. **Mehrfach-Ebenensprung in einer Fremddatei** (`w:ilvl` springt 0→2 ohne Zwischenpunkt): der
   bestehende `groupLists`-Stack öffnet immer nur eine Ebene je Punkt; ein solcher Sprung klemmt
   defensiv (kein Crash). Betrifft nur synthetische Dateien, nicht die Repo-Fixtures.

---

## 10. Manuelle Verifikation (nicht automatisierbar)

1. **Abnahmekriterium 5 / 4.10:** ≥ 3-stufige, mit diesem Feature erzeugte **ODT** in LibreOffice
   Writer öffnen; Einzug/Symbol je Ebene protokollieren (greifen die 4c-Ebenen 2–9?). Ergebnis
   hier oder in der Anforderung nachtragen.
2. **Option-B-Nachweis:** eine gemischt-typige **DOCX** exportieren, in Word/LibreOffice öffnen —
   dokumentieren, dass die Unterebene den Typ der `numId` zeigt (erwartete Einschränkung,
   Abschnitt 5).
3. **§6-Testfall 18 (unabhängige Validierung):** exportierte DOCX mit `python-docx` (separat) auf
   `w:ilvl` prüfen; ODT mit unabhängigem ODF-Validator auf `<text:list>`-Verschachtelung.

---

## 11. Empfohlene Umsetzungsreihenfolge (Härtestes/Riskantestes zuerst)

1. **Kern-Editorverhalten** (`commands.ts` → `WordEditor.tsx` → `Toolbar.tsx`) **inkl. der
   Unit-Tests 6.3** — der Fokus-Schutz (Design 2.1) ist die eigentliche Fehlerquelle und wird
   isoliert grün gemacht, bevor Import/Export angefasst wird. Danach das Feature ist im Editor
   fertig und für gleichtypige Listen bereits rundreisefähig.
2. **DOCX-Gemischt-Entscheidung (Abschnitt 5) mit PO/Lead klären** — vor jedem davon abhängigen
   Test. Bei Option B: Reader-Fix 4b + Testerwartung 6.1/6.5-19 entsprechend.
3. **Reader-/Style-Enhancements** 4b/4d (Import-Anzeige) und 4a/4c (Darstellung tieferer Ebenen),
   je mit Regressionstest (6.1/6.2/6.4).
4. **E2E-Suite** `list-indent.spec.ts` (6.5), inkl. Cross-Format.
5. **Manuelle Verifikation** (Abschnitt 10).
6. **`FEATURE-BACKLOG.md:158`** auf „verifiziert" — nur wenn 1–5 grün und Option-Entscheidung
   dokumentiert ist.

---

## 12. Änderungsprotokoll gegenüber der vorherigen (veralteten) Fassung dieser Datei

Für Abnahmekriterium 11 und die Pipeline-Regel, dass gegen **korrigierte** Annahmen gebaut wird.
Die alte Fassung baute auf einem älteren Codestand; korrigiert wurde:

| Alte Behauptung (falsch) | Realität (verifiziert 2026-07-04) |
|---|---|
| `list_item` = `content: 'paragraph block*'` (`schema.ts:98-104`) | `content: 'block+'` (`schema.ts:147`) — Bild-/Nur-Unterliste-Punkte bereits abgedeckt. |
| Writer schreibt hart `w:ilvl="0"`, Parameter `listNumId: number` (`writer.ts:103/112-118`) | `ListContext { numId, level }`; `w:ilvl` je Tiefe (`writer.ts:96-99/114-116/134-136`). |
| `numberingXml()` definiert nur Ebene 0 (`styleDefs.ts:37-46`) | Definiert **alle 9 Ebenen** (`styleDefs.ts:50-74`). |
| `groupLists` legt alles flach; „Ersatz durch Stack-Aufbau" | `groupLists` ist **bereits** `Frame`-Stack-basiert und verschachtelt korrekt (`reader.ts:379-440`). |
| `commands.ts` wird in `WordEditor.tsx` nicht importiert | Import besteht (`WordEditor.tsx:12`). |
| ODT-Rekursion „ungetestet" (`odt/reader.ts:179-187`) | Rekursion bei `odt/reader.ts:286-299`; **grüne** 2-Ebenen-Rundreisetests (DOCX+ODT). |
| „Dangling Testverweis": `large-document-import.spec.ts` existiert nicht, nur 4 E2E-Dateien | Datei existiert; 17 `*.spec.ts`; der Verweis (`external-fixtures.test.ts:34-42`) ist ein legitimer Kommentar. |
| Die zwei Reader-Typ-Fixes seien „zusätzliche, in der Anforderung nicht erwähnte" Funde | Sie sind bereits Anf.-Audit **(C)**; **neu und wesentlich** ist stattdessen die DOCX-Writer-Typkollaps-Erkenntnis (Abschnitt 5), die die Anf. 5.1.2/4.7 überzeichnet. |

Zeilennummern in dieser Fassung sind der **aktuelle** Stand; frühere Nummern (z. B.
`WordEditor.tsx:71-80`, `styleDefs.ts:37-46`) sind obsolet.
