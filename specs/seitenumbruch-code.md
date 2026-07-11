# Umsetzungsplan „Seitenumbruch einfügen" — dateigenau, gegen den tatsächlichen Code geprüft

Bezug: `E:\docs\specs\seitenumbruch-req.md` (Anforderung), `E:\docs\FEATURE-SPEC-DOCX-ODT.md`
(Rahmenbedingungen, Abschnitte 2/8/15/17/18/19/20/21). Code-Stand **erneut** direkt gelesen und
verifiziert am 2026-07-04 in `E:\docs` (kein Git-Repo im Sinne von `git status`, aber
`git log` vorhanden; alle Zeilenangaben unten wurden gegen den **aktuellen** Dateiinhalt
geprüft, nicht aus einer früheren Fassung übernommen).

Rolle dieses Dokuments: legt fest, was am **bestehenden Code** fehlt bzw. falsch ist, trifft die
Architekturentscheidung zum Datenmodell (Abschnitt 1), spezifiziert Schema/Commands
(Abschnitte 2–3), Editor-Verdrahtung/Toolbar/Visualisierung/Paginierung (Abschnitte 4–7), die
Import-/Export-Anpassungen für OOXML/DOCX (Abschnitte 8–9) und ODF/ODT (Abschnitte 11–12),
inklusive eines neuen kleinen Shared-Moduls (Abschnitt 10), und schließt mit Grenzfall-Mapping,
Testplan und Abnahme-Checkliste (Abschnitte 13–16).

---

## 0.0 Korrekturen gegenüber der vorherigen Fassung dieses Dokuments

Diese Datei existierte bereits, wurde aber **vor** mehreren Umbauten am Editor-/Reader-/
Writer-Code geschrieben (u. a. `insertHardBreak`/`Shift-Enter`, `cutSelection`/`Shift-Delete`,
`unsupported_block`, der `collectRuns`/`decodeRunElement`-Split im DOCX-Reader, der
`listContext`-Umbau im DOCX-Writer, der `tableNames`-Parameter im ODT-Writer, `strike`/
`textColor`/`highlight`). Ihre Zeilenangaben und mehrere Code-Schnipsel waren dadurch **veraltet
und teils direkt falsch**. Beim erneuten Nachprüfen gegen den echten Code wurden folgende
Punkte korrigiert — jeder einzelne würde bei wörtlicher Umsetzung der alten Fassung entweder
den Build brechen oder bestehende Funktionen zerstören:

1. **Keymap-Regression (Abschnitt 4):** Die alte Fassung zeigte ein `keymap({...})`, das
   `'Shift-Enter': insertHardBreak()` **und** `'Shift-Delete': cutSelection(...)` **weggelassen**
   hätte — beides ist heute vorhanden (`WordEditor.tsx:97` bzw. `:106`) und würde beim
   Ersetzen gelöscht. Korrigiert: nur additiv ergänzen.
2. **DOCX-`<w:br>`-Stelle (Abschnitt 9.2):** Das `w:br`-Handling liegt **nicht mehr** in
   `decodeParagraphRuns` (Z. 132–133 der alten Fassung), sondern in `decodeRunElement`
   (`reader.ts:177–178`). `decodeParagraphRuns` (`:218–222`) delegiert heute an `collectRuns`.
3. **`RunLike` (Abschnitt 9.1):** hat heute bereits die Variante `'unsupported'` samt
   `unsupportedKind`/`unsupportedBlocks` (`reader.ts:117–125`). `'pageBreak'` wird **ergänzt**,
   nicht die alte, zu kleine Union ersetzt.
4. **`paragraphToBlocks` (Abschnitt 9.3):** hat heute einen `depth`-Parameter, behandelt
   `unsupported`-Runs **und** wird von **drei** Stellen aufgerufen (inkl. der Textbox-Rekursion
   in `decodeDrawingOrPict`, `reader.ts:161–163`), nicht nur zwei. Alle drei müssen bei einer
   Signaturänderung mitgezogen werden.
5. **`runsToInline` (Abschnitt 9.3):** ist heute **allowlist**-basiert
   (`r.kind === 'text' || r.kind === 'break'`, `reader.ts:282–287`) — `pageBreak` fällt damit
   automatisch heraus, **keine Änderung nötig**. Die alte, denylist-basierte Umschreibung
   (`kind !== 'image' && kind !== 'pageBreak'`) hätte `unsupported`-Runs fälschlich in den
   Inline-Text durchgelassen.
6. **DOCX-Writer (Abschnitt 8):** der `paragraph`-Zweig nutzt heute `listContext`
   (`writer.ts:112–116`), nicht die alte Variable `listNumId`.
7. **ODT-Writer (Abschnitt 11):** `blockToOdt` hat heute einen vierten Parameter
   `tableNames: TableNameSequence` (`writer.ts:85`).
8. **Shared-Helfer-Präzedenz (Abschnitt 10):** die alte Fassung berief sich auf ein
   `src/formats/shared/imageFallback.ts` — **das existiert nicht**. Die real existierenden,
   Format-übergreifend geteilten, PM-/React-freien Helfer sind `shared/zipDeterminism.ts`
   (von beiden Writern importiert) und `shared/validateDocument.ts` (von beiden Readern).
9. **`ListMarker` (Abschnitt 9.5):** trägt heute zusätzlich `ilvl: number`
   (`reader.ts:289–292`); synthetische Marker müssen `{ numId: null, ilvl: 0 }` sein.
10. **Leere Absätze ohne `content: []` (Abschnitte 9.5/10):** beide Reader lassen für leere
    Absätze das `content`-Feld **bewusst weg** (`emptyParagraph()`, `reader.ts:224–226` DOCX /
    `:93–95` ODT; Begründung im Code: `Node.toJSON()`-Parität, sonst `toEqual`-Bruch bei der
    Leerdokument-Rundreise). Synthetische Umbruch-Absätze müssen dieselbe Form haben
    (`content` weglassen), nicht `content: []` setzen.
11. **`removePageBreak*` (Abschnitt 3.4):** vereinfacht zu **reinem Attribut-Löschen** (eine
    `setNodeAttribute`-Transaktion) statt der fragilen `state.apply(tr)`+Step-Replay-plus-
    `joinBackward/joinForward`-Konstruktion der alten Fassung — einfacher, sicherer, erfüllt 3.9
    trivial und ist für „Umbruch entfernen" sogar korrekter (entfernt genau den Umbruch, nichts
    sonst; Begründung in 3.4).
12. **ODT-Reader `fo:break-after` (Abschnitt 12.4):** sauberere Umsetzung — das
    „endet-mit-break-after"-Signal wird direkt im Top-Level-Loop aus dem Style-Namen des Kindes
    gelesen, **ohne** das in der alten Fassung vorgeschlagene, exception-anfällige
    Pseudo-Attribut `breakAfterHint` durch `elementToBlocks` zu fädeln.
13. **Fixture-Zahlen (Abschnitt 0.3):** durch Entpacken der echten ZIPs korrigiert (siehe dort):
    `60329.docx` = **3×** `lastRenderedPageBreak` **und 85×** einfaches `<w:br/>` (alte Fassung
    nannte nur „3×", die Anforderungsdatei fälschlich „1×"); `pagebreaks.odt` = **2×**
    `fo:break-before` **+ 1×** `fo:break-after`; `text-extract.odt` = **2×** `soft-page-break`.
14. **Bestehende Testdateien (Abschnitt 14):** `commands.test.ts` **und** `pagination.test.ts`
    existieren bereits (`src/formats/shared/editor/__tests__/`) — sie werden **erweitert**, nicht
    neu angelegt (die alte Fassung nannte `commands.test.ts` „(neu)").
15. **Zeilennummern `WordEditor.tsx` (Re-Verifikation 2026-07-05):** Der Datei-Kopf ist seit der
    vorigen Prüfung um ~8 Zeilen gewachsen (zusätzlicher Kommentarblock im `keymap`). Korrigiert
    auf den echten Stand: `keymap({...})` **85–107**, `keymap(baseKeymap)` **108**, Plugins-Array
    **83–114**, `Shift-Enter` **97**, `Shift-Delete` **106** (vorher 77–99/100/75–106/89/98). Die
    Import-Zeile (Z. 12) und `reconcileSelectionOnClick` (43–50) sind unverändert korrekt.
    **Load-bearing bleibt das Verhalten, nicht die Zahl** — alle übrigen Datei/Zeilen-Angaben
    (Schema, Commands, Pagination, DOCX/ODT-Reader+Writer, `styleRegistry`, `pageLayout`,
    `index.css`) wurden am 2026-07-05 erneut gegen den echten Dateiinhalt geprüft und stimmen; die
    `prosemirror-transform ^1.12.0`-Dependency und der `canSplit`-Export sind bestätigt; alle
    realen Fixtures aus 0.3 wurden per Entpacken re-gezählt und stimmen exakt (saut_page 2+1,
    60329 3×lastRendered/85×`<w:br/>`, pagebreaks 2×before/1×after/1×soft, text-extract 2×soft/0,
    no_pagebreak 1×before-in-Zelle).
16. **Zwei durch tatsächliches Durchrechnen des eigenen Pseudocodes gefundene Logikfehler dieser
    Fassung, jetzt korrigiert (dritte, kritische Prüfrunde):**
    - **9.3, `paragraphToBlocks`:** die vorherige Version dieses Abschnitts rief den finalen
      `flush()` nur auf, wenn `endsWithPageBreak` falsch war (`if (!endsWithPageBreak) flush()`).
      Durchgerechnet an `<w:p><w:r><w:t>foo</w:t></w:r><w:r><w:br w:type="page"/></w:r>
      <w:r><w:t>bar</w:t></w:r></w:p>` (ein `w:br[type=page]`, gefolgt von **weiterem Text im
      selben Absatz** — laut OOXML zulässig, auch wenn keine der beiden Pflicht-Fixtures aus 0.3
      diesen Fall enthält) hätte das den finalen `buffer` (`"bar"`) **stillschweigend verworfen**,
      da `pendingBreakBefore` zu diesem Zeitpunkt noch `true` war. Behoben: `endsWithPageBreak`
      wird **vor** dem letzten `flush()` ausgewertet (`pendingBreakBefore && buffer.length === 0`),
      der letzte `flush()` läuft danach **unbedingt**.
    - **7.5, Testfall „resets cumulative height after a forced break":** die vorherige Fassung
      behauptete `computePageBreakIndices([100, 100, 250], 300, new Set([1]))` ergebe `[1]`. Echtes
      Durchrechnen des in 7.1 spezifizierten Algorithmus ergibt `[1, 2]` (nach dem erzwungenen
      Bruch bei Index 1 zählt dessen eigene Höhe, 100, bereits zur neuen Seite; 100+250=350 > 300
      löst dort **zusätzlich und korrekt** einen Überlauf-Bruch aus) — die Testerwartung war
      schlicht falsch, kein Fehler im Algorithmus. Behoben durch Ersetzen von `250` durch `150`
      (100+150=250 ≤ 300, kein zweiter Bruch), womit der Test tatsächlich nur den Reset prüft.

---

## 0.1 Bestätigter Codebefund (gegen aktuellen Dateiinhalt)

Der Kernbefund der Anforderungsdatei (Abschnitt 0: Funktion fehlt vollständig) ist bestätigt.
`grep -rniE "breakBefore|pageBreak|page_break|break-before|break-after" src --include=*.ts(x)`
liefert **null** Treffer außerhalb von `pagination.ts`/`pagination.test.ts` (das die rein
höhenbasierte Automatik betrifft, ein anderes Feature). Im Detail, mit **aktuellen**
Zeilenangaben:

| Datei | Zeilen | Ist-Zustand |
|---|---|---|
| `src/formats/shared/schema.ts` (202 Z.) | `alignAttr` 4; `paragraph` 16–24; `heading` 26–38; `hard_break` 42–56; `image` 58–85; `unsupported_block` 92–113; Listen 115–152; `tableNodes(...)` 154; Marks `strong`/`em`/`underline`/`strike`/`textColor`/`highlight` 158–195 | `paragraph` trägt nur `align`, `heading` nur `level`+`align`. Kein `page_break`-Node, kein `breakBefore`. |
| `src/formats/shared/editor/commands.ts` (168 Z.) | `alignableTypes` 10; `isInTable` re-exportiert 3+6; `insertHardBreak` 83–90; `cutSelection` 149–166 | kein `insertPageBreak`, kein `removePageBreak*`. |
| `src/formats/shared/editor/WordEditor.tsx` (185 Z.) | `keymap({...})` 85–107, danach `keymap(baseKeymap)` 108; Plugins-Array 83–114; Import aus `./commands` Z. 12; `reconcileSelectionOnClick` 43–50 | gebunden: `Mod-z/-y/-Shift-z`, `Enter`(splitListItem), **`Shift-Enter`(insertHardBreak, 97)**, `Mod-b/-i/-u`, **`Shift-Delete`(cutSelection, 106)**. `Mod-Enter` **frei**. `Backspace`/`Delete` nur via `baseKeymap`. |
| `src/formats/shared/editor/Toolbar.tsx` (298 Z.) | `run` 28–31; `ScissorsIcon` (SVG) 33–53; „Tabelle" 277–289; „Bild" 291–294 | kein „Seitenumbruch"-Button. **Es gibt bereits ein eingebettetes SVG-Icon** (`ScissorsIcon`) als Präzedenz — die pauschale „durchgängig Unicode/Emoji"-Behauptung der alten Fassung stimmt nicht mehr. |
| `src/formats/shared/editor/pagination.ts` (116 Z.) | `computePageBreakIndices` 12–25 (Frühausstieg `if (pageContentHeight <= 0) return []` Z. 13); `measureAndBuildDecorations` 33–63; `sameDecorationSet` 107–115 | rein höhenbasiert, kein Bezug zum Dokumentinhalt, nur 2 Argumente. Spacer-Klasse fix `'page-break-spacer'` (Z. 50). |
| `src/formats/shared/editor/pageLayout.ts` | `PAGE_CONTENT_HEIGHT_PX` 13; `PAGE_GAP_PX` 16; `pageBackgroundStyle` 23–31 | Editor-„Seite" per Gradient **immer weiß** (Z. 26 `white`), unabhängig vom App-Dark-Mode. |
| `src/index.css` | `.page-break-spacer` 69–71 (nur `width:100%`; Höhe wird in `pagination.ts` inline gesetzt) | kein `.pm-page-break-before`, kein `--manual`-Modifikator. |
| `src/formats/docx/writer.ts` (319 Z.) | `inlineToRuns` 41–67 (`hard_break`→`<w:r><w:br/></w:r>` Z. 62); `paragraphPropsXml` 69–72; `blockToDocx(node, images, rels, listContext=null)` 105–156 (`paragraph` 112–118, `heading` 119–124) | kein `<w:br w:type="page"/>`-Pfad. |
| `src/formats/docx/reader.ts` (555 Z.) | `RunLike` 117–125; `decodeRunElement` 170–184 (`w:br`→`{kind:'break'}` **Z. 177–178**); `collectRuns` 194–216; `decodeParagraphRuns` 218–222; `emptyParagraph` 224–226; `paragraphToBlocks(pEl,…,depth=0)` 229–280; `runsToInline` 282–287; `ListMarker` 289–292; `parseTable` 311–364; `readBodyChildren` 464–485 | **aktive Fehlinterpretation** (siehe 0.2). |
| `src/formats/odt/writer.ts` (305 Z.) | `blockToOdt(node, styles, images, tableNames)` 85–195 (`paragraph` 87–92 nutzt `PARAGRAPH_ALIGN_STYLE_NAME`, `heading` 93–98 nutzt `headingStyleName`); Imports 4–14 | kein `fo:break-before`/`fo:break-after`. |
| `src/formats/odt/reader.ts` (409 Z.) | `ParsedStyles` 23–27; `parseAutomaticStyles` 37–78 (paragraph-Zweig 63–67, liest **nur** `fo:text-align` Z. 65); `decodeInline`/`walk` 97–172; `paragraphToBlocks(pEl,styles,depth=0)` 175–213; `elementToBlocks` 250–324 (`text:h` 256–262); `readOfficeTextChildren` 351–355 | liest **weder** `fo:break-before` **noch** `fo:break-after`. |
| `src/formats/odt/styleRegistry.ts` (103 Z.) | `PARAGRAPH_ALIGN_STYLE_NAME` 61–66; `paragraphAlignStyleDefs` 68–75; `HEADING_FONT_SIZES` 77; `ALIGNS` 78; `headingStyleName` 80–82; `headingStyleDefs` 84–93 | erzeugt Absatz-/Überschrift-Styles nur nach Ausrichtung/Ebene, keine Umbruch-Dimension. |

### 0.2 DOCX-Reader: aktive Fehlinterpretation (bestätigt)

`decodeRunElement` (`reader.ts:177–178`):

```ts
} else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'br') {
  out.push({ kind: 'break' })
}
```

Jedes `<w:br>` — mit oder ohne `w:type="page"` — wird identisch als `{kind:'break'}` gelesen und
in `runsToInline` (`:282–287`) zu `{type:'hard_break'}`. Ein echter Word-Seitenumbruch wird also
**stillschweigend zu einem Zeilenumbruch degradiert** (Anforderung 3.5/0.6, verboten).
`<w:lastRenderedPageBreak>` fällt heute nur durch Abwesenheit eines Falls **zufällig** korrekt
durch — muss in einen expliziten, kommentierten, getesteten Fall überführt werden (Abschnitt 9.2).

### 0.3 Reale Test-Fixtures — vorhanden, Inhalte durch Entpacken der ZIPs **gezählt**

Alle folgenden Dateien existieren (`test -f` bestätigt) und ihre Umbruch-Marker wurden per
`unzip -p … | grep -o … | wc -l` gegen den echten ZIP-Inhalt **gezählt**, nicht geschätzt:

| Datei | Verifizierter Inhalt | Rolle |
|---|---|---|
| `tests/fixtures/external/docx/saut_page.docx` | **2×** `<w:br w:type="page"/>`, **1×** einfaches `<w:br/>`, **0×** `lastRenderedPageBreak`, 1× `w:sectPr` | Positiv+Negativ in einer Datei (2 Seitenumbrüche erkennen, 1 Zeilenumbruch **nicht** befördern) |
| `tests/fixtures/external/docx/60329.docx` | **3×** `<w:lastRenderedPageBreak/>`, **85×** einfaches `<w:br/>`, **0×** `w:br[type=page]` | „lastRendered ignorieren" **und** „85 Zeilenumbrüche bleiben Zeilenumbrüche" (Grenzfall 14) |
| `tests/fixtures/external/odt/pagebreaks.odt` | **2×** `fo:break-before="page"`, **1×** `fo:break-after="page"`, **1×** `soft-page-break` | alle drei ODF-Kodierungen in einer Datei (belegt, dass `fo:break-after` real vorkommt) |
| `tests/fixtures/external/odt/AB_pageBreakBefore.odt` | **1×** `fo:break-before="page"` (+1× beiläufiger `soft-page-break`) | sauberer `fo:break-before`-Test |
| `tests/fixtures/external/odt/pageBreakProblem.odt` | **1×** `fo:break-before="page"` (+1× `soft-page-break`) | zweiter `fo:break-before`-Beleg |
| `tests/fixtures/external/odt/no_pagebreak.odt` **und** `35585_-_no_pagebreak.odt` | **1×** `fo:break-before="page"` **innerhalb einer `<table:table-cell>`** | reale Evidenz Grenzfall 4 (LO-Bug 35585: dort rendert LO selbst **keinen** Umbruch) |
| `tests/fixtures/external/odt/text-extract.odt` | **2×** `soft-page-break`, **0×** `fo:break-before`/`-after`, enthält eine Tabelle | „darf nicht als manueller Umbruch fehlinterpretiert werden" (3.7) |

Anforderung Abschnitt 6/0.10 ist damit ohne neue Dateien erfüllbar.

---

## 1. Architekturentscheidung: Datenmodell

**Entscheidung: Absatz-/Überschrift-Attribut `breakBefore: boolean` auf `paragraph` und
`heading`** (nicht ein eigener `page_break`-Block-Node).

### 1.1 Begründung

- **Bildet das ODF-Modell direkt ab** (`fo:break-before` ist selbst ein Absatz-Attribut) → der
  ODT-Export wird trivial (Attribut sitzt bereits auf genau dem Absatz, dessen Style es braucht,
  ohne „nächster-Absatz"-Suche).
- **Der in Anforderung 3.6 antizipierte Fallback „Umbruch am Dokumentende → leeren Absatz
  anhängen" entfällt für den ODT-Writer** vollständig: `breakBefore` liegt **immer** auf einem
  real existierenden Knoten (Schema erzwingt `doc: 'block+'`, `schema.ts:14`, das Dokument ist
  nie leer). Die Komplexität verschwindet nicht, sondern verschiebt sich auf die **Reader**-Seite
  (Abschnitte 9.5/12.4), wo Fremddateien den Umbruch strukturell anders codieren.
- **Einfügen an der Cursor-Position wird strukturell identisch zu „Enter"** (Absatz teilen,
  zweiter Teil bekommt das Attribut) — direkt über `Transform.split` (Abschnitt 3), volle
  Wiederverwendung des eingebauten Split-Mechanismus samt Heading-/Listen-Verhalten.
- **DOCX-Export erfordert einen synthetischen Run** (`<w:br w:type="page"/>` als erster Run des
  Absatzes) — in der Anforderung (3.3) als Konsequenz dieser Wahl vorgesehen (Abschnitt 8).

### 1.2 Verworfene Alternative: eigener `page_break`-Block-Node

Bildet DOCX direkter ab, verlagert aber die Fallback-Komplexität (3.6) auf den ODT-**Writer**
(Style müsste am „nächsten Geschwister" ansetzen, mit Sonderfall „kein nächster Knoten"). Da ODT
der originär native Fall ist (`fo:break-before` ist wortwörtlich ein Absatzattribut), wäre das die
falsche Stelle. Das Attribut-Modell macht stattdessen den DOCX-**Reader** komplexer (Abschnitt 9),
weil echte Dateien den Bruch inline codieren (`saut_page.docx`: beide Umbrüche als **letzter** Run
ihres Absatzes) — das ist aber ohnehin nötig, unabhängig vom Datenmodell.

### 1.3 Konsequenz für verschachtelte Container (Listen/Tabellen)

`breakBefore` auf `paragraph`/`heading` ist strukturell überall gültig, wo diese Typen
vorkommen — auch in `list_item` (`content: 'block+'`, `schema.ts:146`) und Tabellenzellen
(`cellContent: 'block+'`, `schema.ts:154`). Gewollt (verhindert Datenverlust beim Import von
`no_pagebreak.odt`), hat aber Konsequenzen für die Live-Paginierung (Abschnitt 7.4).

---

## 2. Schema — `src/formats/shared/schema.ts`

Neben `alignAttr` (Z. 4) ein zweites Attribut-Fragment einführen:

```ts
const alignAttr = { align: { default: 'left', validate: 'string' } }
const pageBreakAttr = { breakBefore: { default: false, validate: 'boolean' } }
```

`paragraph` (16–24) und `heading` (26–38) je um `...pageBreakAttr` erweitern und `toDOM`/`parseDOM`
so anpassen, dass das Attribut auch einen **internen** Copy/Paste-Roundtrip übersteht (ProseMirror
serialisiert dabei über `toDOM`/`parseDOM`; ohne das ginge `breakBefore` beim In-App-Kopieren
still verloren — Anforderung 3.11):

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
    const attrs: Record<string, string> = { style: `text-align: ${node.attrs.align}` }
    if (node.attrs.breakBefore) attrs.class = 'pm-page-break-before'
    return ['p', attrs, 0]
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
    const attrs: Record<string, string> = { style: `text-align: ${node.attrs.align}` }
    if (node.attrs.breakBefore) attrs.class = 'pm-page-break-before'
    return [`h${node.attrs.level}`, attrs, 0]
  },
},
```

`validate: 'boolean'` ist vom bestehenden Muster gedeckt (`prosemirror-model`s `validateType`
prüft per `typeof` gegen den String, identisch zu `'string'`/`'number'`). Die `class` wird
**nur** gesetzt, wenn `breakBefore` wahr ist (kein `class=""` im Normalfall). **Keine Änderung**
an `hard_break`, `image`, `unsupported_block`, Listen-/Tabellen-Nodes, Marks.

---

## 3. Commands — `src/formats/shared/editor/commands.ts`

### 3.1 Vorarbeit: `alignableTypes` exportieren

Z. 10 `const alignableTypes = …` → `export const alignableTypes = …`. Exakt die Typen, die
`breakBefore` tragen können, sind identisch mit denen, die `align` tragen. `isInTable` und
`wordSchema` sind bereits importiert (Z. 3/4), `isInTable` wird bereits re-exportiert (Z. 6).

### 3.2 `insertPageBreak(): Command` — neu

```ts
import { canSplit } from 'prosemirror-transform' // prosemirror-transform ^1.12.0 ist direkte
                                                  // Dependency; canSplit ist exportiert (geprüft)

export function insertPageBreak(): Command {
  return (state, dispatch) => {
    // Grenzfall 4 (reale Evidenz no_pagebreak.odt/LO-Bug 35585): in einer Tabellenzelle KEIN
    // echter Seitenumbruch, sondern Zeilenumbruch-Fallback (Word-Parität: Strg+Eingabe in einer
    // Zelle erzeugt dort einen Zeilenumbruch). Bewusst, dokumentiert, KEIN stiller Fehlschlag
    // (3.10), KEINE Tabellenstruktur-Beschädigung.
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
      // Kein paragraph/heading-Vorfahre (z. B. GapCursor neben Bild/Tabelle, Grenzfall 12) —
      // statt eines verbotenen stillen No-Ops (3.10) einen eigenen leeren Absatz mit Umbruch.
      tr.insert($pos.pos, wordSchema.nodes.paragraph.create({ breakBefore: true }))
      if (dispatch) dispatch(tr.scrollIntoView())
      return true
    }
    if (depth === 0) return insertStandaloneFallback()

    const originalType = $pos.node(depth).type
    const atEnd = $pos.end(depth) === $pos.pos
    // Enter-in/-am-Ende-einer-Überschrift-Parität (Grenzfall 6): dieselbe Regel wie
    // prosemirror-commands' splitBlock (atEnd → Standardabsatz, sonst gleicher Typ), damit sich
    // "Seitenumbruch in einer Überschrift" ununterscheidbar von "Enter in einer Überschrift"
    // verhält.
    const afterType = atEnd ? wordSchema.nodes.paragraph : originalType
    const afterAttrs = afterType === wordSchema.nodes.heading ? $pos.node(depth).attrs : undefined

    // Grenzfall 5 (Liste): bis zum list_item mitsplitten, damit der zweite Teil ein neues
    // list_item DERSELBEN Liste wird (Nummerierung lückenlos). Bewusst NICHT die Liste selbst
    // aufsplitten (3.3).
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

**Genau eine Transaktion:** `deleteSelection()`, `split()`, `setNodeAttribute()` laufen auf
demselben `tr` (Methodenkette, ein `dispatch`) → Anforderung 3.9 („ein Undo-Schritt")
strukturell erfüllt.

### 3.3 Verworfene Alternative: Liste am Umbruch in zwei Top-Level-Listen aufsplitten

Verworfen, weil dabei eine **vorbestehende, feature-fremde** Lücke sichtbar würde: `groupLists`
(`docx/reader.ts:379–440`) setzt beim Wiederzusammenbau eines durch einen Nicht-Listen-Absatz
unterbrochenen `w:numId`-Laufs **kein** `start`-Attribut auf die zweite `ordered_list`
(Schema-Default `1`, `schema.ts:127`) — eine Top-Level-Aufspaltung würde in der eigenen Vorschau
fälschlich wieder bei „1." beginnen. Das ist ein eigenständiger Nummerierungs-Bug außerhalb des
Geltungsbereichs (`seitenumbruch-req.md` „Geltungsbereich") und wird hier **nicht** mitbehoben.
Die gewählte Variante (Split nur bis `list_item`) umgeht ihn vollständig. Konsequenz: für Listen
(und Tabellenzellen) **keine** automatische visuelle Live-Vorschau-Aufteilung (Abschnitt 7.4,
Grenzfälle 4/5) — Datenebene/Rundreise bleiben vollständig korrekt.

### 3.4 `removePageBreakBackward()` / `removePageBreakForward(): Command` — neu (vereinfacht)

Für Anforderung 1 Zeile 4 (Löschen mit Entf/Backspace). **Bewusst reines Attribut-Löschen** —
nicht zusätzlich Blöcke verschmelzen. Begründung: der Umbruch ist genau das `breakBefore`-Attribut;
ihn zu „entfernen" heißt, das Attribut zu löschen — danach fließt der Folgeinhalt wieder auf die
vorige Seite zurück (Anforderung 1 Zeile 4: „danach fließt nachfolgender Inhalt wieder normal
zurück"), ohne dass die beiden Absätze zwangsweise verschmolzen werden. Das ist vorhersehbar
(genau ein Konzept pro Tastendruck), trivial **ein** Undo-Schritt (3.9), und vermeidet die
fragile `state.apply`+Step-Replay-Konstruktion der alten Fassung. Ein zweites Backspace (Attribut
jetzt `false`) fällt via `false`-Rückgabe transparent an `baseKeymap`s eigenes
`joinBackward`/`joinForward` durch — also normales Verschmelzen als getrennter, zweiter Schritt.

```ts
export function removePageBreakBackward(): Command {
  return (state, dispatch) => {
    const { $from, empty } = state.selection
    if (!empty || $from.parentOffset !== 0) return false
    const parent = $from.parent
    if (!alignableTypes.has(parent.type.name) || !parent.attrs.breakBefore) return false
    if (dispatch) {
      dispatch(state.tr.setNodeAttribute($from.before($from.depth), 'breakBefore', false).scrollIntoView())
    }
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
    if (dispatch) {
      dispatch(state.tr.setNodeAttribute($from.after($from.depth), 'breakBefore', false).scrollIntoView())
    }
    return true
  }
}
```

`false`-Rückgabe bei Nicht-Zutreffen ist exakt das bereits etablierte Muster von
`Enter: splitListItem(...)` (`WordEditor.tsx:88`), das bei `false` an `baseKeymap` durchreicht.
Kein neuer Mechanismus.

### 3.5 Exportliste

`insertPageBreak`, `removePageBreakBackward`, `removePageBreakForward`, `alignableTypes` (neu
exportiert) zur Exportliste ergänzen.

---

## 4. `WordEditor.tsx` — Keymap (nur additiv!)

Das bestehende `keymap({...})`-Objekt (Z. 85–107) **additiv** ergänzen — die vorhandenen Zeilen
`Shift-Enter`/`Shift-Delete` **bleiben** (sonst Zeilenumbruch/Ausschneiden kaputt, siehe 0.0
Punkt 1). Nur die drei fett markierten Zeilen sind neu:

```ts
keymap({
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
  Enter: splitListItem(wordSchema.nodes.list_item),
  'Shift-Enter': insertHardBreak(),                 // BLEIBT (Zeilenumbruch)
  'Mod-b': toggleMark(wordSchema.marks.strong),
  'Mod-i': toggleMark(wordSchema.marks.em),
  'Mod-u': toggleMark(wordSchema.marks.underline),
  'Shift-Delete': cutSelection({ onCutBlocked: setCutError }), // BLEIBT (Ausschneiden)
  'Mod-Enter': insertPageBreak(),                   // NEU — Strg+Enter/Cmd+Enter
  Backspace: removePageBreakBackward(),             // NEU (fällt sonst an baseKeymap durch)
  Delete: removePageBreakForward(),                 // NEU (fällt sonst an baseKeymap durch)
}),
```

`Mod-Enter` = Windows/Linux `Strg+Enter`, Mac `Cmd+Enter` (prosemirror-keymap-`Mod`-
Normalisierung, wie `Mod-b` etc.). Import in Z. 12 ergänzen:
`import { cutSelection, insertHardBreak, insertPageBreak, removePageBreakBackward, removePageBreakForward } from './commands'`.

**Keine Änderung** an `plugins` (Array 83–114): `createPaginationPlugin()` bleibt unverändert; die
Umbruch-Integration passiert **innerhalb** `pagination.ts` (Abschnitt 7). **Keine Änderung** an
`reconcileSelectionOnClick` (43–50): `insertPageBreak`/`removePageBreak*` lösen reguläre, über
`dispatchTransaction` verarbeitete Transaktionen aus — kein DOM-Mutations-ohne-Transaktion-Pfad,
der den Selection-Sync-Bug auslösen könnte. Trotzdem laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 /
Grenzfall 7 mit dediziertem Regressionstest zu bestätigen (Abschnitt 14.4).

---

## 5. `Toolbar.tsx` — neuer Button

Platzierung: in der „Einfügen"-Gruppe direkt nach dem „Tabelle einfügen"-Button (Z. 277–289) und
vor dem „Bild"-`<label>` (Z. 291–294) — Anforderung 1 Zeile 1.

**Eingebettetes SVG, kein Unicode/Emoji.** Es existiert bereits ein SVG-Präzedenzfall in dieser
Datei — `ScissorsIcon` (Z. 33–53) — dem der neue Icon-Baustein 1:1 folgt (gleiche `viewBox`,
`stroke="currentColor"`, `aria-hidden`):

```tsx
function PageBreakIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M6 3H4v4M18 3h2v4M6 21H4v-4M18 21h2v-4" />
      <line x1="3" y1="12" x2="21" y2="12" strokeDasharray="3 2.5" />
    </svg>
  )
}

// … nach dem Tabelle-Button (Z. 289), vor dem Bild-Label (Z. 291):
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

Motiv: zwei Blattecken (oben/unten) mit gestrichelter Trennlinie — geläufiges „Seitenumbruch"-
Icon, eindeutig von Tabelle (`⊞`) und Bild (`🖼`) unterscheidbar, reines Vektor-SVG (kein
Emoji-Font nötig). `title` **und** `aria-label` liefern den identischen, für Screenreader **und**
Playwright (`getByRole('button', { name: 'Seitenumbruch einfügen' })`) adressierbaren Namen.

Import ergänzen: `insertPageBreak` aus `./commands` (der `run`-Helfer Z. 28–31 wird
unverändert genutzt: `command(view.state, view.dispatch, view); view.focus()`).

Kein Deaktivieren im Tabellen-Kontext — `insertPageBreak` bleibt dort funktional
(`hard_break`-Fallback, 3.2); ein deaktivierter Button widerspräche der Fallback-Entscheidung und
wirkte selbst wie ein stiller Fehlschlag.

---

## 6. Visuelle Kennzeichnung (Anforderung 1 Zeile 3, 3.8) — `src/index.css`

Ergänzung **nach** dem bestehenden `.page-break-spacer`-Block (Z. 69–71). Die Editor-„Seite" ist
laut `pageBackgroundStyle()` (`pageLayout.ts:26`) immer weiß — feste Farben ohne
`prefers-color-scheme`-Variante für Linie/Label auf dem Absatz genügen:

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

/* Der Spacer selbst liegt über der Seiten-Zwischenraum-Chrome (bg-neutral-200 / dark:neutral-950);
   ein blau gestricheltes Outline hat auf beiden ausreichend Kontrast. */
.page-break-spacer--manual {
  outline: 2px dashed #2563eb;
  outline-offset: -2px;
}
```

Damit sind manueller Umbruch (blaue Linie + Label direkt am Absatz, **unabhängig** von jeder
Höhenmessung sichtbar) und automatischer Umbruch (neutraler grauer Spacer ohne Label)
unterscheidbar — zwei unabhängige, jeweils per DOM-Klasse prüfbare Signale (Testplan Punkt 7). Die
`--manual`-Klasse setzt `pagination.ts` (Abschnitt 7.2).

---

## 7. `pagination.ts` — Integration erzwungener Umbrüche

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

**Einzelpass, nicht zweiphasig:** die `cumulative`-Basis muss ab **jedem** Umbruch (erzwungen
**oder** Überlauf) neu bei 0 beginnen (Anforderung 3.8, „Kombination beider Mechanismen").

**Rückwärtskompatibilität:** alle bestehenden Aufrufe (`pagination.test.ts` sowie
`computePageCount` Z. 28 und `measureAndBuildDecorations` Z. 37) rufen **ohne** drittes Argument
auf (Default `new Set()`) → `forced` immer `false`, Verhalten unverändert. Der bisherige
Frühausstieg `if (pageContentHeight <= 0) return []` (Z. 13) entfällt; die `overflow`-Bedingung
prüft `pageContentHeight > 0` selbst. Für die Bestandstests bytegleich (`computePageBreakIndices([100,100],0)`
liefert weiterhin `[]`), aber jetzt korrekt für den neuen Fall „`pageContentHeight` unbekannt/0,
aber Umbruch erzwungen".

### 7.2 `measureAndBuildDecorations` — erzwungene Indizes aus dem Dokument ableiten

```ts
function forcedBreakIndicesFrom(doc: ProseMirrorNode): Set<number> {
  const forced = new Set<number>()
  doc.forEach((node, _offset, index) => {
    // Bewusst nur Top-Level-Kinder von doc (Abschnitt 7.4) — verschachtelte breakBefore
    // (Listenpunkt/Tabellenzelle) werden für die Live-Vorschau NICHT ausgewertet.
    if ((node.type.name === 'paragraph' || node.type.name === 'heading') && node.attrs.breakBefore) {
      forced.add(index)
    }
  })
  return forced
}
```

`measureAndBuildDecorations` (33–63) leitet `forced` ab und reicht es an
`computePageBreakIndices` weiter; beim Widget-Bau die Klasse und ein DOM-Attribut je nach
`isManual = forced.has(index)` setzen:

```ts
const forced = forcedBreakIndicesFrom(view.state.doc)
const breakIndices = computePageBreakIndices(heights, PAGE_CONTENT_HEIGHT_PX, forced)
// … pro Bruch-Index:
const isManual = forced.has(index)
const spacer = document.createElement('div')
spacer.className = isManual ? 'page-break-spacer page-break-spacer--manual' : 'page-break-spacer'
spacer.style.height = `${PAGE_GAP_PX}px`
spacer.setAttribute('aria-hidden', 'true')
spacer.setAttribute('contenteditable', 'false')
spacer.dataset.manualPageBreak = String(isManual)
// … Decoration.widget(offset, () => spacer, { side: -1, key: `page-break-${index}-${isManual ? 'manual' : 'auto'}` })
```

`dataset.manualPageBreak` ist das von der CSS-Klasse unabhängige zweite DOM-Attribut-Signal
(Testplan Punkt 7). Der `key` codiert `manual`/`auto`, damit ein Wechsel des Status an **derselben**
Position eine echte Neuerzeugung des Widgets erzwingt.

### 7.3 `sameDecorationSet` — Korrektur (sonst verpasste Neu-Darstellung)

Die Bestandsfunktion (107–115) vergleicht nur `.from`. Liegt an Index N bereits ein automatischer
Bruch und wird dort zusätzlich `breakBefore: true` gesetzt, bleiben die `.from`-Werte identisch →
sie meldet fälschlich „keine Änderung", der alte (nicht-manuelle) Spacer bliebe stehen. Vergleich
um den `key` (der jetzt `manual`/`auto` codiert) erweitern:

```ts
function sameDecorationSet(a: DecorationSet, b: DecorationSet): boolean {
  const aLocal = a.find()
  const bLocal = b.find()
  if (aLocal.length !== bLocal.length) return false
  for (let i = 0; i < aLocal.length; i++) {
    if (aLocal[i].from !== bLocal[i].from) return false
    const ak = (aLocal[i] as unknown as { type: { spec: { key?: string } } }).type.spec.key
    const bk = (bLocal[i] as unknown as { type: { spec: { key?: string } } }).type.spec.key
    if (ak !== bk) return false
  }
  return true
}
```

(Gleichwertig robuste Alternative: `measureAndBuildDecorations` gibt zusätzlich eine
Vergleichs-Signatur `breakIndices.map(i => `${i}:${forced.has(i)}`).join(',')` zurück, gegen die
`recompute()` prüft. Ziel ist nur: ein reiner Attribut-Wechsel ohne Positionsverschiebung löst
zuverlässig eine Neuzeichnung aus.)

### 7.4 Bewusste Einschränkung: keine Live-Vorschau-Aufteilung bei verschachtelten Umbrüchen

`forcedBreakIndicesFrom` betrachtet nur direkte Top-Level-Kinder von `doc`. Ein `breakBefore` in
einem `list_item` (Grenzfall 5) oder einer Tabellenzelle (Grenzfall 4) wird **nicht** in einen
Seiten-Spacer umgesetzt — Konsequenz des bereits im Code dokumentierten Architektur-Constraints:

> „A block taller than a whole page is simply left to overflow that page rather than split — true
> intra-block splitting would require duplicating DOM nodes across pages, which ProseMirror's
> single-EditorView model doesn't support." — `pagination.ts:6–10` (unverändert)

Gilt für automatische **und** manuelle Umbrüche. Datenebene (Schema, Commands, Import, Export,
Rundreise inkl. Listen-Nummerierung) ist **nicht** betroffen und vollständig korrekt — nur die
Live-Vorschau zeigt in diesem verschachtelten Fall keinen zusätzlichen Spacer (Abschnitt 13,
Grenzfälle 4/5, als bewusst nicht behobenes Verhalten festgehalten).

### 7.5 `pagination.test.ts` — neue Fälle (Datei existiert bereits)

```ts
describe('computePageBreakIndices: forced (manual) breaks', () => {
  it('forces a break even with room left', () => {
    expect(computePageBreakIndices([100, 100, 100], 1000, new Set([2]))).toEqual([2])
  })
  it('never forces a break at index 0', () => {
    expect(computePageBreakIndices([100, 100], 1000, new Set([0]))).toEqual([])
  })
  it('resets cumulative height after a forced break', () => {
    // NICHT [100, 100, 250]: die Korrektur ist real durchgerechnet (nicht nur behauptet) —
    // nach dem erzwungenen Bruch bei Index 1 startet Index 1 selbst bereits die neue Seite
    // und zählt mit seinen 100 zur neuen `cumulative`; ein direkt folgendes 250-hohes Element
    // (100+250=350 > 300) löste in einer früheren Fassung dieses Tests **zusätzlich** einen
    // (korrekten!) Überlauf-Bruch bei Index 2 aus, wodurch die dort behauptete Erwartung
    // `[1]` **nicht** zu `computePageBreakIndices` aus 7.1 passte (tatsächliches Ergebnis
    // wäre `[1, 2]` gewesen) — kein Reset-Fehler im Code, sondern eine falsche Testerwartung.
    // Mit 150 statt 250 passt Index 2 ohne weiteren Überlauf auf die neue Seite (100+150=250
    // ≤ 300) und der Test prüft tatsächlich nur den Reset, ohne einen zweiten,
    // ungewollten Überlauf-Bruch mit hineinzumischen.
    expect(computePageBreakIndices([100, 100, 150], 300, new Set([1]))).toEqual([1])
  })
  it('combines a forced break with a later natural overflow', () => {
    expect(computePageBreakIndices([100, 100, 200, 200], 300, new Set([1]))).toEqual([1, 3])
  })
  it('is a no-op with an empty set (identical to no 3rd arg)', () => {
    expect(computePageBreakIndices([100, 100, 100, 150], 300, new Set())).toEqual([3])
  })
})
```

---

## 8. DOCX-Export — `src/formats/docx/writer.ts`

`blockToDocx` (105–156), Fälle `paragraph` (112–118) und `heading` (119–124): synthetischen Run
**vor** dem Inhalt einfügen. **Wichtig:** der `paragraph`-Zweig nutzt heute `listContext` (nicht
`listNumId`) — die vorhandene `numPr`-Berechnung bleibt unverändert, es wird nur `pageBreakRunXml`
eingeschoben:

```ts
function pageBreakRunXml(node: JsonNode): string {
  return node.attrs?.breakBefore ? '<w:r><w:br w:type="page"/></w:r>' : ''
}

case 'paragraph': {
  const align = (node.attrs?.align as string) ?? 'left'
  const numPr = listContext
    ? `<w:numPr><w:ilvl w:val="${listContext.level}"/><w:numId w:val="${listContext.numId}"/></w:numPr>`
    : ''
  return `<w:p>${paragraphPropsXml(align, numPr)}${pageBreakRunXml(node)}${inlineToRuns(node.content)}</w:p>`
}
case 'heading': {
  const level = Number(node.attrs?.level ?? 1)
  const align = (node.attrs?.align as string) ?? 'left'
  const styleTag = `<w:pStyle w:val="${HEADING_STYLE_ID(level)}"/>`
  return `<w:p>${paragraphPropsXml(align, styleTag)}${pageBreakRunXml(node)}${inlineToRuns(node.content)}</w:p>`
}
```

- **Eindeutig vom `hard_break`-Run unterscheidbar** (`<w:r><w:br/></w:r>` ohne `w:type`,
  `inlineToRuns:62`, unverändert) — Anforderung 3.4, kein Verwechslungsrisiko (getrennte Stellen).
- **Nie `<w:lastRenderedPageBreak/>`, nie `w:sectPr`** — der Writer erzeugt beides nirgends für
  Inhaltsknoten (`w:sectPr` nur einmalig als Layout-Container, `writer.ts:210/275`).
- Der Listen-Zweig (125–140) ruft rekursiv `blockToDocx` je `list_item`-Kind — greift automatisch
  mit, keine Zusatzänderung.
- `unsupported_block` (145–152) hat kein `breakBefore` (Schema) → nicht betroffen.

---

## 9. DOCX-Import — `src/formats/docx/reader.ts`

Aufwendigster Teil: echte Dateien codieren den Umbruch **inline** an beliebiger Run-Position
(`saut_page.docx`: beide Umbrüche als **letzter** Run ihres Absatzes, gefolgt von einem separaten
`<w:p>`).

### 9.1 `RunLike` — Variante ergänzen (nicht ersetzen)

Die bestehende Union (117–125) hat bereits `'unsupported'`. Nur `'pageBreak'` ergänzen:

```ts
interface RunLike {
  kind: 'text' | 'break' | 'image' | 'unsupported' | 'pageBreak'
  // … alle bestehenden Felder unverändert (text, marks, imageRelId, imageAlt,
  //    unsupportedKind, unsupportedBlocks) …
}
```

### 9.2 `decodeRunElement` — `w:br`-Fallunterscheidung nach `w:type` (Z. 177–178)

```ts
} else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'br') {
  const brType = child.getAttributeNS(OOXML_NAMESPACES.w, 'type')
  // Nur "page" ist im Geltungsbereich ein manueller Seitenumbruch. "column" und alle
  // anderen/unbekannten Werte werden bewusst wie ein gewöhnlicher Zeilenumbruch behandelt
  // (textinhaltsverlustfrei, aber ohne Sonderbedeutung) — Spaltenumbrüche sind nicht
  // Gegenstand dieser Anforderung.
  out.push({ kind: brType === 'page' ? 'pageBreak' : 'break' })
}
```

`<w:lastRenderedPageBreak>` bleibt durch Abwesenheit eines Falls ignoriert — jetzt **mit
explizitem Kommentar** an der `if/else`-Kette in `decodeRunElement`:

```ts
// Hinweis: w:lastRenderedPageBreak fällt hier bewusst durch — ein von Word selbst erzeugter,
// rein informativer Marker für einen AUTOMATISCHEN Umbruch, KEIN manueller Seitenumbruch
// (Anforderung 3.5). Abgesichert gegen die reale Fixture 60329.docx (3× lastRendered),
// Abschnitt 14.
```

### 9.3 `paragraphToBlocks` — an `pageBreak`-Runs aufsplitten, `endsWithPageBreak` melden

Aktuelle Signatur (229): `paragraphToBlocks(pEl, headingInfo, imageRels, depth = 0): JsonNode[]`;
behandelt heute `image` **und** `unsupported` (`hasBlockRun`, Z. 244). Neue Rückgabe:
`{ blocks: JsonNode[]; endsWithPageBreak: boolean }`. **Wichtig:** `unsupported`-Behandlung und
`depth`-Parameter **bleiben** erhalten. Skizze (die bestehende `flush`/Puffer-Logik nur um den
`pageBreak`-Fall und `breakBefore` erweitert):

```ts
function paragraphToBlocks(pEl, headingInfo, imageRels, depth = 0): { blocks: JsonNode[]; endsWithPageBreak: boolean } {
  // … align/level/styleId wie bisher (Z. 235–241) …
  const runs = decodeParagraphRuns(pEl, headingInfo, imageRels, depth)
  const hasBlockRun = runs.some((r) => r.kind === 'image' || r.kind === 'unsupported')
  const hasPageBreak = runs.some((r) => r.kind === 'pageBreak')

  if (!hasBlockRun && !hasPageBreak) {
    // unveränderter Schnellpfad inkl. der bewussten content-Weglassung bei leerem Fragment
    // (Z. 246–255) …
    return { blocks: [ /* heading|paragraph wie bisher */ ], endsWithPageBreak: false }
  }

  const blocks: JsonNode[] = []
  let buffer: RunLike[] = []
  let pendingBreakBefore = false
  const makeParagraph = (content: JsonNode[]): JsonNode => {
    const attrs: Record<string, unknown> = { align }
    if (pendingBreakBefore) attrs.breakBefore = true
    return level ? { type: 'heading', attrs: { ...attrs, level }, content } : { type: 'paragraph', attrs, content }
  }
  const flush = () => {
    if (buffer.length === 0) { pendingBreakBefore = false; return }
    const content = runsToInline(buffer)
    if (content.length > 0) blocks.push(makeParagraph(content))
    buffer = []
    pendingBreakBefore = false
  }
  for (const run of runs) {
    if (run.kind === 'image') {
      flush()
      const target = run.imageRelId ? imageRels.get(run.imageRelId) : undefined
      const img: JsonNode = { type: 'image', attrs: { src: target ?? '', alt: run.imageAlt ?? '' } }
      attachPendingBreakBefore([img], pendingBreakBefore) // Bild trägt kein breakBefore → ggf. leerer Vorab-Absatz
      blocks.push(img)                                    //   (Abschnitt 10)
      pendingBreakBefore = false
    } else if (run.kind === 'unsupported') {
      flush()
      const content = run.unsupportedBlocks?.length ? run.unsupportedBlocks : [emptyParagraph()]
      const ub: JsonNode = { type: 'unsupported_block', attrs: { kind: run.unsupportedKind ?? 'object' }, content }
      attachPendingBreakBefore([ub], pendingBreakBefore)
      blocks.push(ub)
      pendingBreakBefore = false
    } else if (run.kind === 'pageBreak') {
      flush()
      pendingBreakBefore = true
    } else {
      buffer.push(run)
    }
  }
  // WICHTIG (Korrektheits-Fix gegenüber einer früheren Fassung dieses Abschnitts, siehe
  // 0.0 Punkt 16): `endsWithPageBreak` MUSS vor dem letzten `flush()` ausgewertet werden,
  // und dieser letzte `flush()` MUSS unbedingt laufen — nicht nur, wenn kein Umbruch
  // aussteht. Grund: `w:br[type=page]` muss laut OOXML nicht der letzte Run eines `<w:p>`
  // sein; folgt im selben Absatz noch Text (`<w:p><w:r><w:t>foo</w:t></w:r>
  // <w:r><w:br w:type="page"/></w:r><w:r><w:t>bar</w:t></w:r></w:p>`), landet dieser Text
  // nach der `pageBreak`-Verzweigung erneut im (nun wieder leeren) `buffer`. Ein
  // `if (!endsWithPageBreak) flush()` — wie in einer vorherigen Fassung dieses Abschnitts —
  // würde diesen finalen `flush()` bei weiterhin `pendingBreakBefore === true`
  // überspringen und "bar" damit **stillschweigend verwerfen** (Verstoß gegen
  // `FEATURE-SPEC-DOCX-ODT.md` §18). Real durchgespielt an genau diesem Beispiel: ohne
  // diesen Fix verschwindet "bar" ersatzlos. Mit dem Fix unten entstehen zwei Absätze —
  // "foo" (kein Umbruch) und "bar" (`breakBefore:true`) — beide Textteile bleiben erhalten.
  const endsWithPageBreak = pendingBreakBefore && buffer.length === 0
  flush() // unbedingt, s.o. — flush() selbst ist bereits ein No-Op, wenn buffer leer ist
  return { blocks, endsWithPageBreak }
}
```

**`runsToInline` (282–287) braucht KEINE Änderung** — es ist allowlist-basiert
(`r.kind === 'text' || r.kind === 'break'`) und schließt `pageBreak` (wie `image`/`unsupported`)
bereits automatisch aus. (Die alte Fassung schlug hier fälschlich eine denylist-Umschreibung vor.)

**Kein erzwungenes leeres Fragment am Absatzende:** steht `pageBreak` als **letzter** Run (der
reale `saut_page.docx`-Fall), ist `buffer` beim finalen `flush()` leer (No-Op), und
`endsWithPageBreak = true` geht an den Aufrufer (9.5), der entscheidet, wer das Attribut übernimmt.
Folgt dagegen — wie im obigen Beispiel — noch Text im selben `<w:p>` **nach** dem Umbruch, wird
dieser Text durch den unbedingten finalen `flush()` als **eigener** Absatz mit `breakBefore:true`
ausgegeben (`makeParagraph` liest `pendingBreakBefore`, das zu diesem Zeitpunkt noch `true` ist,
bevor `flush()` es am Ende zurücksetzt) — `endsWithPageBreak` ist in diesem Fall `false`, der
Umbruch wurde bereits **innerhalb** dieses Aufrufs vollständig verarbeitet.

**Drei Aufrufstellen mitziehen** (alle geben heute `JsonNode[]` weiter, künftig `.blocks`):
1. `decodeDrawingOrPict` (161–163, Textbox-Rekursion mit `depth+1`): `…, imageRels, depth + 1).blocks`
   — `endsWithPageBreak` hier **verwerfen** (ein Umbruch am Ende eines Textbox-Absatzes hat keine
   Cross-Textbox-Wirkung; bleibt lokal, verlustfrei).
2. `parseTable` (337–339): `…paragraphToBlocks(p, headingInfo, imageRels).blocks` — `endsWithPageBreak`
   ebenfalls **verwerfen** (keine Weiterreichung über Zellgrenzen, konsistent mit 7.4/Grenzfall 4).
3. `readBodyChildren` (siehe 9.5): wertet `endsWithPageBreak` aus.

### 9.4 Neuer Shared-Helfer `attachPendingBreakBefore` — Abschnitt 10.

### 9.5 `readBodyChildren` — über Absatz-/Tabellengrenzen weiterreichen

Aktuell (464–485). Neu — `pendingBreakBefore` über die Kinder tragen; `ListMarker` braucht
`ilvl: 0`; der Dokumentende-Fallback nutzt die `emptyParagraph`-Form **ohne** `content`:

```ts
async function readBodyChildren(bodyEl, headingInfo, kindByNumId, imageRels, zip): Promise<JsonNode[]> {
  const items: Array<{ marker: ListMarker; block: JsonNode }> = []
  let pendingBreakBefore = false
  for (const child of Array.from(bodyEl.children)) {
    if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'p') {
      const marker = listMarkerFor(child)
      const { blocks, endsWithPageBreak } = paragraphToBlocks(child, headingInfo, imageRels)
      attachPendingBreakBefore(blocks, pendingBreakBefore)
      pendingBreakBefore = endsWithPageBreak
      for (const block of blocks) {
        items.push({ marker: block.type === 'paragraph' ? marker : { numId: null, ilvl: 0 }, block })
      }
    } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'tbl') {
      const blocks = [parseTable(child, headingInfo, imageRels)]
      attachPendingBreakBefore(blocks, pendingBreakBefore)
      pendingBreakBefore = false
      for (const block of blocks) items.push({ marker: { numId: null, ilvl: 0 }, block })
    }
  }
  // Grenzfall 2/10 — Umbruch am Dokumentende: hier (nicht im ODT-Writer, siehe 1.1) lebt der von
  // Anforderung 3.6 antizipierte Fallback. content BEWUSST weggelassen (emptyParagraph-Parität,
  // sonst toEqual-Bruch bei der Rundreise — Z. 224–226/248–252).
  if (pendingBreakBefore) {
    items.push({ marker: { numId: null, ilvl: 0 }, block: { type: 'paragraph', attrs: { align: 'left', breakBefore: true } } })
  }
  const grouped = groupLists(items, kindByNumId)
  await resolveImageSources(zip, grouped)
  return grouped
}
```

`readBodyChildren` wird unverändert auch für Kopf-/Fußzeilen genutzt (`readDocx`, 520/529) — ein
`breakBefore` dort ist semantisch wirkungslos, wird aber verlustfrei mitgeführt (kein Sonderfall,
außerhalb des Geltungsbereichs).

---

## 10. Neu: `src/formats/shared/pageBreakBlocks.ts`

Kleines, PM-/React-freies Hilfsmodul im Reader/Writer-Layer — dieselbe Layer-Begründung wie die
real existierenden geteilten Helfer `src/formats/shared/zipDeterminism.ts` (von beiden Writern
importiert) und `src/formats/shared/validateDocument.ts` (von beiden Readern importiert). Von
beiden Readern (`docx/reader.ts` **und** `odt/reader.ts`) genutzt, um Drift zwischen zwei Kopien
zu vermeiden:

```ts
interface MinimalBlockNode { type: string; attrs?: Record<string, unknown> }

/** Hängt ein „manueller Umbruch vor diesem Block"-Flag (über eine Element-/Absatzgrenze hinweg
 *  propagiert — aus einem abschließenden w:br[type=page]-Run in DOCX oder einem
 *  fo:break-after="page"-Style in ODF) an den ersten folgenden Block. Ist dieser ein
 *  paragraph/heading, wird das Flag dessen breakBefore-Attribut. Ist er etwas anderes (image,
 *  table — beide tragen kein breakBefore) ODER fehlt er ganz (letztes Element im Body), wird ein
 *  neuer leerer Absatz mit dem Flag davorgestellt — nie still verworfen (kein stiller
 *  Datenverlust, FEATURE-SPEC-DOCX-ODT.md §18). Der synthetische Absatz lässt content bewusst
 *  weg (emptyParagraph-Parität beider Reader). */
export function attachPendingBreakBefore<T extends MinimalBlockNode>(blocks: T[], pending: boolean): void {
  if (!pending) return
  const first = blocks[0]
  if (first && (first.type === 'paragraph' || first.type === 'heading')) {
    first.attrs = { ...first.attrs, breakBefore: true }
    return
  }
  blocks.unshift({ type: 'paragraph', attrs: { align: 'left', breakBefore: true } } as unknown as T)
}
```

Wiederverwendet an **vier** Stellen: DOCX-Reader (9.3 vor eingebettetem Bild/`unsupported`, 9.5
über Absatz-/Tabellengrenzen inkl. Dokumentende) und ODT-Reader (12.4, über Element-Grenzen inkl.
Dokumentende) — eine gemeinsam getestete Implementierung.

---

## 11. ODT-Export — `styleRegistry.ts` + `writer.ts`

### 11.1 `styleRegistry.ts` — Style-Erzeugung um `breakBefore`-Dimension erweitern

Bestehendes Enumerations-Muster (Ausrichtungen 61–75; 6 Ebenen × 4 Ausrichtungen 84–93) um eine
boolesche Dimension verdoppeln — **kein** Architekturwechsel:

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

`PARAGRAPH_ALIGN_STYLE_NAME` (61–66), `HEADING_FONT_SIZES` (77), `ALIGNS` (78) bleiben unverändert.
**Achtung Signaturänderung:** `headingStyleName` bekommt einen dritten Parameter — die einzige
weitere Aufrufstelle ist `writer.ts:97` (11.2), die mitgezogen wird.

### 11.2 `writer.ts` — Aufrufstellen anpassen

`blockToOdt(node, styles, images, tableNames)` (85–195), Fälle `paragraph` (87–92) und `heading`
(93–98) — der vierte Parameter `tableNames` bleibt unberührt:

```ts
case 'paragraph': {
  const align = (node.attrs?.align as string) ?? 'left'
  const styleName = paragraphStyleName(align, Boolean(node.attrs?.breakBefore))
  return `<text:p text:style-name="${styleName}">${inlineToOdt(node.content, styles)}</text:p>`
}
case 'heading': {
  const level = Number(node.attrs?.level ?? 1)
  const align = (node.attrs?.align as string) ?? 'left'
  const styleName = headingStyleName(level, align, Boolean(node.attrs?.breakBefore))
  return `<text:h text:style-name="${styleName}" text:outline-level="${level}">${inlineToOdt(node.content, styles)}</text:h>`
}
```

Import-Block (4–14): `PARAGRAPH_ALIGN_STYLE_NAME` wird im Writer nicht mehr direkt gebraucht
(nur noch intern in `styleRegistry.ts`), stattdessen `paragraphStyleName` importieren;
`headingStyleName` bleibt importiert (neue Signatur). **Kein Dokumentende-Fallback nötig** (1.1):
`breakBefore` sitzt immer auf einem realen Knoten, auch wenn dieser (9.5) erst vom DOCX-Reader
synthetisiert wurde.

---

## 12. ODT-Import — `src/formats/odt/reader.ts`

### 12.1 `ParsedStyles` — neue Map (23–27)

`paragraphBreaks: Map<string, { before: boolean; after: boolean }>` ergänzen; im
`parseAutomaticStyles`-Kopf (37–41) und der Rückgabe (77) mitführen.

### 12.2 `parseAutomaticStyles` — `fo:break-before`/`fo:break-after` lesen (paragraph-Zweig 63–67)

```ts
} else if (family === 'paragraph') {
  const props = firstChildNS(styleEl, ODF_NAMESPACES.style, 'paragraph-properties')
  const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
  if (align) paragraphAligns.set(name, align)
  // Nur "page" ist im Geltungsbereich (3.6/3.7); "column"/"auto"/andere werden NICHT als
  // Seitenumbruch gewertet (analog zu w:type="column" im DOCX-Reader, 9.2).
  const before = props?.getAttributeNS(ODF_NAMESPACES.fo, 'break-before') === 'page'
  const after = props?.getAttributeNS(ODF_NAMESPACES.fo, 'break-after') === 'page'
  if (before || after) paragraphBreaks.set(name, { before, after })
}
```

Reale Belegung: `pagebreaks.odt` (2× `break-before` **+** 1× `break-after`) — beide Varianten
müssen für diese Datei korrekt gelesen werden.

**Nicht umgesetzt (dokumentierte Lücke, kein Blocker):** die vollständige
`style:parent-style-name`-Vererbungskette über `office:styles` hinweg — **keine** der realen
Fixtures (0.3) benötigt sie (alle deklarieren `fo:break-before`/`-after` direkt auf dem
referenzierten Automatic-Style). Tritt künftig eine solche Fixture auf, ist das ein Nachtrag.

### 12.3 `breakBefore` setzen — nur auf dem **ersten** erzeugten Fragment

`paragraphToBlocks` (175–213) und der `text:h`-Zweig von `elementToBlocks` (256–262) ermitteln
bereits `styleName`/`align`. Dort zusätzlich:

```ts
const breakInfo = (styleName && styles.paragraphBreaks.get(styleName)) || { before: false, after: false }
```

und im erzeugten `paragraph`/`heading`-Knoten `attrs: { align, breakBefore: breakInfo.before }`
(die `breakBefore`-Eigenschaft nur setzen, wenn `true`, um `emptyParagraph`-Parität zu wahren).
**Achtung Split-Fall:** enthält ein `text:p` mit `fo:break-before` zusätzlich ein `draw:frame`
(Bild), teilt `paragraphToBlocks` in mehrere Blöcke (190–212) — `breakBefore: true` darf dann
**nur auf den ersten** erzeugten Block, nicht auf alle Fragmente (sonst mehrere Umbrüche statt
einem). Praktisch: `breakInfo.before` nur beim ersten `blocks.push(...)` bzw. im
Nicht-Frame-Schnellpfad (187) berücksichtigen.

`fo:break-after` wird hier **nicht** verarbeitet, sondern im Top-Level-Loop (12.4).

### 12.4 `readOfficeTextChildren` — `fo:break-after` sauber am Top-Level (351–355)

Anders als die alte Fassung **kein** Pseudo-Attribut `breakAfterHint` durch `elementToBlocks`
fädeln. Stattdessen den Style-Namen des Kindes direkt lesen (wir haben `styles.paragraphBreaks`):

```ts
async function readOfficeTextChildren(bodyTextEl: Element, styles: ParsedStyles, zip: JSZip): Promise<JsonNode[]> {
  const blocks: JsonNode[] = []
  let pendingBreakBefore = false
  for (const child of Array.from(bodyTextEl.children)) {
    const childBlocks = elementToBlocks(child, styles)
    attachPendingBreakBefore(childBlocks, pendingBreakBefore)
    blocks.push(...childBlocks)
    // Nur text:p/text:h können fo:break-after tragen; deren Style-Name ist direkt am Element
    // ablesbar — kein Durchfädeln durch elementToBlocks nötig. text:list/table:table melden
    // hier bewusst kein Signal (konsistent mit 7.4/Grenzfall 4: keine Cross-Grenzen-Wirkung).
    const isPorH = child.namespaceURI === ODF_NAMESPACES.text && (child.localName === 'p' || child.localName === 'h')
    const styleName = isPorH ? child.getAttributeNS(ODF_NAMESPACES.text, 'style-name') : null
    pendingBreakBefore = Boolean(styleName && styles.paragraphBreaks.get(styleName)?.after)
  }
  if (pendingBreakBefore) {
    blocks.push({ type: 'paragraph', attrs: { align: 'left', breakBefore: true } }) // content weggelassen (Parität)
  }
  await resolveImageSources(zip, blocks)
  return blocks
}
```

Rekursive Aufrufe innerhalb von `text:list`/`table:table` (`elementToBlocks` 286–321) bleiben
unverändert — `fo:break-before` **innerhalb** eines `text:list-item`/`table:table-cell` wird über
12.3 trotzdem verlustfrei auf dem verschachtelten Knoten abgelegt (exakt der `no_pagebreak.odt`-
Fall: Attribut übernommen, aber kein Top-Level-Spacer, siehe 7.4). Kopf-/Fußzeilen
(`readOdt:380/384`) rufen `elementToBlocks` direkt — dort ist `fo:break-after`-Weiterreichung
irrelevant (wirkungslos), kein Sonderfall.

### 12.5 `text:soft-page-break` — bewusst ignoriert (Kommentar + Test)

In `decodeInline`s `walk` (138–168) hat `text:soft-page-break` keinen eigenen Fall: es fällt in
den generischen `else`-Zweig (160–167), der in die Kinder absteigt — da das Element leer ist,
passiert nichts, es wird verworfen. Korrekt (3.7). Mit **explizitem Kommentar** am `else`-Zweig
absichern:

```ts
// Hinweis: text:soft-page-break trägt keinen Text und landet hier im generischen else — ein
// reiner Paginierungs-Hinweis für den Renderer, KEIN erzwungener Seitenumbruch (3.7).
// Abgesichert gegen die reale Fixture text-extract.odt (2× soft-page-break, 0× break-before),
// Abschnitt 14.
```

Das Dokument-Attribut `text:use-soft-page-breaks="true"` auf `<office:text>` (u. a. in
`pagebreaks.odt`) wird nicht ausgewertet und muss es nicht — reiner Darstellungs-Hinweis auf
Dokumentebene.

---

## 13. Grenzfälle-Mapping (Anforderung Abschnitt 4)

| # | Grenzfall | Umsetzung |
|---|---|---|
| 1 | Umbruch am Dokumentanfang | Kein Sonderfall: Split auch an Position 0 (3.2) → leere führende Seite + Original — echtes Word-Verhalten, **kein** No-Op. Import mit `breakBefore` auf dem allerersten Knoten: verlustfrei, aber von der Live-Vorschau nicht als „erzwungen" behandelt (Index 0 ausgenommen, 7.1/7.2 — nichts davor zu „beenden"). |
| 2 | Umbruch am Dokumentende | `insertPageBreak` erzeugt immer einen zweiten Knoten (leere Folgeseite). Import: DOCX-Reader synthetisiert bei Bedarf einen leeren Absatz (9.5, `content` weggelassen); ODT-Writer braucht keinen Fallback (1.1/11.2). |
| 3 | Zwei aufeinanderfolgende Umbrüche | Kein Zusammenfassen: jeder Top-Level-Knoten mit `breakBefore` erzeugt unabhängig einen Bruch-Index (7.1); zwei leere Absätze mit je `breakBefore` = zwei Brüche, eine leere Seite dazwischen. |
| 4 | Umbruch in Tabellenzelle | Bewusste Abweichung (reale Evidenz `no_pagebreak.odt`/LO-Bug 35585): `insertPageBreak` → `hard_break`-Fallback (3.2); ein importierter `breakBefore` in einer Zelle wird verlustfrei gelesen, aber nicht als Spacer visualisiert (7.4). Keine Struktur-Beschädigung, kein Absturz. |
| 5 | Umbruch in Listenpunkt | Split bis `list_item` (3.2), Nummerierung lückenlos (dieselbe Liste, keine Top-Level-Aufspaltung, 3.3). Live-Vorschau ohne zusätzlichen Spacer (7.4). Datenebene/Rundreise korrekt. |
| 6 | Umbruch mitten in Überschrift | Split-Regel repliziert `splitBlock` („atEnd → Standardabsatz, sonst gleicher Typ/Level", 3.2) — konsistent mit `Enter`. |
| 7 | Einfügen + weitertippen (Selection-Sync) | Strukturell unauffällig (Abschnitt 4): reguläre Transaktion, kein DOM-ohne-Transaktion-Pfad. Pflicht-Regressionstest 14.4. |
| 8 | Kurzes Dokument mit einem Umbruch | Erzwungener Bruch erzeugt zwei Seiten unabhängig von Höhen (7.1) — der Zusatzraum ist per DOM-Attribut/Klasse (6/7.2) eindeutig auf ein Nutzer-`breakBefore` zurückführbar, klar unterscheidbar vom offenen Rendering-Verdacht in `FEATURE-SPEC-DOCX-ODT.md` §8. |
| 9 | Import mehrerer Umbrüche | Jeder `w:br[type=page]`/`fo:break-before`/`-after` unabhängig verarbeitet (Schleifen 9.5/12.4), keine „nur erster/letzter"-Beschränkung. Evidenz: `saut_page.docx` (2×), `pagebreaks.odt` (2×before+1×after). |
| 10 | Cross-Format DOCX→ODT→DOCX, Umbruch am Ende | DOCX-Reader synthetisiert höchstens **einen** trailing-Absatz (9.5), ODT verändert dessen Anzahl nicht (kein Fallback dort, 1.1) — per Test 14.1/14.2 zu verifizieren; ein evtl. zusätzlicher Leerabsatz ist dokumentationspflichtig, aber kein Textverlust. |
| 11 | Löschen des Absatzes nach einem (ODT-Attribut-)Umbruch | Festgelegt: normales Backspace/Entf **auf den Absatz** (nicht `removePageBreak*`, die nur an der exakten Grenze greifen) löscht ihn inkl. seines `breakBefore` — der Umbruch verschwindet **mit** dem Absatz, wandert nicht automatisch. Bewusst einfache, vorhersagbare Regel. |
| 12 | Umbruch direkt vor/nach Bild/Tabelle | GapCursor → `insertStandaloneFallback` (3.2): eigener leerer Absatz mit `breakBefore` neben dem Bild/der Tabelle, keine Verschiebung/Duplizierung. |
| 13 | Strg+Z direkt nach Einfügen | Ein Undo-Schritt (3.2: eine Transaktion) — Standard-`prosemirror-history`. |
| 14 | Datei mit vielen einfachen `<w:br/>` | **Keiner** wird befördert (9.2, allowlist-`runsToInline`). Evidenz: `60329.docx` (85× `<w:br/>`). |
| 15 | Datei mit `soft-page-break`, ohne `break-before/-after` | **Kein** manueller Umbruch (12.5). Evidenz: `text-extract.odt` (2× soft). |

---

## 14. Tests

### 14.1 Unit-Tests (Reader/Writer/Commands/Pagination)

| Datei | Fälle |
|---|---|
| `src/formats/shared/editor/__tests__/commands.test.ts` (**existiert**, erweitern) | `insertPageBreak`: teilt Absatz, zweiter Teil `breakBefore:true`, ein Undo; über Selektion (ersetzt); Anfang/Ende; Liste (dieselbe Liste, `list_item`-Split); Überschrift (mittendrin `heading`, am Ende `paragraph`); Tabellenzelle (`hard_break`-Fallback via `isInTable`); GapCursor neben Bild (Standalone-Fallback). `removePageBreakBackward`/`-Forward`: löscht Attribut, sonst `false`; kein Crash am Dokumentanfang. |
| `src/formats/shared/editor/__tests__/pagination.test.ts` (**existiert**, erweitern) | Abschnitt 7.5 (5 neue `it`s). |
| `src/formats/docx/__tests__/roundtrip.test.ts` (neuer `describe`-Block „page break", vgl. Struktur Z. 32/54/62/141) | `breakBefore:true` → exakt `<w:br w:type="page"/>` als erster Run, **nicht** `<w:br/>`/`lastRenderedPageBreak`/`sectPr`; Rundreise write→read erhält `breakBefore`; zwei Absätze mit Umbruch dazwischen. |
| `src/formats/docx/__tests__/pagebreak.test.ts` (**neu**) | Gegen `saut_page.docx`: an den erwarteten Stellen `breakBefore:true`, der eingebettete einfache `<w:br/>` bleibt `hard_break`. Gegen `60329.docx`: **kein** Knoten hat `breakBefore` (3× `lastRendered` ignoriert **und** 85× `<w:br/>` bleiben `hard_break`). (Nicht in `external-fixtures.test.ts` — das ist ein generischer „importiert ohne Absturz"-Sweep via `readdirSync`.) |
| `src/formats/odt/__tests__/roundtrip.test.ts` (neuer `describe`-Block, vgl. Z. 34/56/64/143/197) | `breakBefore:true` → `fo:break-before="page"` im Style des Absatzes; Rundreise erhält es; `fo:break-after`-Import (synthetisches XML) → Attribut landet auf dem **nächsten** Absatz. |
| `src/formats/odt/__tests__/pagebreak.test.ts` (**neu**) | Gegen `pagebreaks.odt`: 2× `break-before` **und** 1× `break-after` ergeben zusammen die erwartete Abfolge (break-after verschiebt korrekt auf den Folgeabsatz). Gegen `AB_pageBreakBefore.odt`/`pageBreakProblem.odt`: einfacher Fall. Gegen `no_pagebreak.odt`: `breakBefore` auf dem Tabellenzellen-Absatz gelesen (kein Datenverlust), aber `forcedBreakIndicesFrom`-Ebene ignoriert es. Gegen `text-extract.odt`: **kein** `breakBefore` irgendwo (2× `soft-page-break` nicht fehlinterpretiert). |
| `src/formats/shared/__tests__/pageBreakBlocks.test.ts` (**neu**) | `attachPendingBreakBefore`: erster Block ist paragraph/heading → Attribut gesetzt; erster Block ist image/table → leerer Vorab-Absatz (ohne `content`) davor; leeres Array → ein Absatz; `pending=false` → No-Op. |

### 14.2 E2E-Tests (Playwright) — neue Datei `tests/e2e/seitenumbruch.spec.ts`

Aufbau wie `selection-regression.spec.ts` (111 Z.; `odtCard`-Helfer Z. 3, `describe` Z. 7, erster
Test Z. 14) und `docx.spec.ts` (344 Z.; `JSZip.loadAsync(exportedBuffer)` Z. 87,
`documentXml.toContain(...)` Z. 90–91, `input.setInputFiles(...)` Z. 97):

1. Toolbar-Klick „Seitenumbruch einfügen" **und** separat `ControlOrMeta+Enter` → je ein
   `.page-break-spacer--manual` im DOM, der Folgeabsatz trägt `pm-page-break-before`; adressiert
   über `getByRole('button', { name: 'Seitenumbruch einfügen' })`.
2. Nach dem Einfügen: `page.keyboard.type(...)` landet sichtbar **nach** dem Spacer/Label.
3. **Pflicht-Regressionssequenz** (Grenzfall 7, direkt im Anschluss an Fall 1): Text tippen →
   Umbruch einfügen → `ControlOrMeta+a` → Fett → Klick zum Neupositionieren → `Enter` →
   weitertippen → beide Textteile bleiben erhalten (Technik wie `selection-regression.spec.ts:14`).
4. Backspace unmittelbar nach eingefügtem Umbruch → Umbruch verschwindet (Attribut gelöscht), Text
   davor/danach unverändert, `ControlOrMeta+z` macht es in einem Schritt rückgängig.
5. Visuelle Unterscheidbarkeit (Testplan Punkt 7): Dokument mit viel Freiraum + einem manuellen
   Umbruch zeigt **genau ein** `.page-break-spacer--manual` und **kein** einfaches
   `.page-break-spacer` ohne Modifikator.
6. Feature-Rundreise (5.2 Fall 1/2): zwei Absätze, Umbruch dazwischen → Export → `JSZip`-Prüfung
   auf `<w:br w:type="page"/>` bzw. `fo:break-before="page"` → Re-Upload → Umbruch + beide Absätze
   vorhanden. Je einmal DOCX-Karte und ODT-Karte.
7. Cross-Format (5.2 Fall 3/4): je nach tatsächlichem App-Workflow (Export in einem Format →
   Reimport im anderen) — beide Richtungen, Umbruch bleibt erhalten.
8. Echte Fremddatei (`input.setInputFiles`, Muster `docx.spec.ts:97`):
   `tests/fixtures/external/docx/saut_page.docx` → 2 Umbrüche als `pm-page-break-before` erkennbar
   → Export → Re-Import → weiterhin vorhanden; ebenso `tests/fixtures/external/odt/pagebreaks.odt`.

### 14.3 Rundreise (Anforderung Abschnitt 5)

- **5.1 Baseline:** bestehende `docx.spec.ts`/`odt.spec.ts`/beide `roundtrip.test.ts`/beide
  `external-fixtures.test.ts`/beide `reader.test.ts` müssen **vor und nach** allen Änderungen grün
  bleiben — insbesondere `60329.docx` (nach der Erweiterung **weiterhin** kein `breakBefore` aus
  85× `<w:br/>` oder 3× `lastRendered`) und `text-extract.odt` (kein `breakBefore` aus 2× soft).
- **5.2 Feature-Rundreise:** 14.1 (Unit) **und** 14.2 Punkte 6–8 (E2E, echte Bedienung + echter
  Download/Re-Upload) — beide Ebenen verpflichtend (Anforderung Testplan Punkt 8).

### 14.4 Selection-Sync-Regression (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2)

14.2 Punkt 3 zusätzlich als eigener `test()` in den `describe`-Block von
`tests/e2e/selection-regression.spec.ts` (Z. 7 ff.) aufnehmen — nicht nur in `seitenumbruch.spec.ts`
—, damit er dauerhaft Teil der Selection-Sync-Suite bleibt.

---

## 15. Reihenfolge der Umsetzung

1. Schema (2) + `commands.ts` (3) + `commands.test.ts` erweitern (14.1) — Datenmodell/Kernverhalten
   zuerst, unabhängig von Import/Export.
2. `WordEditor.tsx` (4, **additiv**) + `Toolbar.tsx` (5) — Bedienung erreichbar.
3. `pagination.ts` (7) + `index.css` (6) + `pagination.test.ts` erweitern (7.5) — visuelle
   Kennzeichnung.
4. `docx/writer.ts` (8) + `docx/roundtrip.test.ts`-Block (14.1) — DOCX-Export.
5. `shared/pageBreakBlocks.ts` (10) + `docx/reader.ts` (9) + `pageBreakBlocks.test.ts`/
   `docx/pagebreak.test.ts` gegen `saut_page.docx`/`60329.docx` — DOCX-Import, aufwendigster
   Schritt. **Alle drei `paragraphToBlocks`-Aufrufstellen** (9.3) mitziehen.
6. `styleRegistry.ts` + `odt/writer.ts` (11) — ODT-Export (`headingStyleName`-Signaturänderung an
   ihrer einzigen weiteren Aufrufstelle mitziehen).
7. `odt/reader.ts` (12) + `odt/pagebreak.test.ts` gegen `pagebreaks.odt`/`AB_pageBreakBefore.odt`/
   `no_pagebreak.odt`/`text-extract.odt` — ODT-Import.
8. Baseline-Rundreise (14.3) grün bestätigen, bevor E2E ergänzt wird.
9. `tests/e2e/seitenumbruch.spec.ts` (14.2) + Ergänzung in `selection-regression.spec.ts` (14.4).
10. Grenzfälle (13) einzeln gegenprüfen und Ergebnis dokumentieren.
11. `npm run build` (`tsc -b`; `tsconfig.app.json` `noUnusedLocals`/`noUnusedParameters`) **real**
    ausführen — insbesondere nach 9/11/12, da mehrere Signaturen geändert werden
    (`paragraphToBlocks` 3 Stellen, `headingStyleName` 2 Stellen) und alle Aufrufstellen synchron
    mitmüssen.

---

## 16. Abnahme-Checkliste (Bezug: `seitenumbruch-req.md` Abschnitt 7)

- [ ] Toolbar-Button (SVG, zugänglicher Name), `Mod-Enter`, sichtbare Kennzeichnung, Löschen via
      Entf/Backspace — alle vier vorhanden und funktionsfähig (Abschnitte 3–6).
- [ ] `Shift-Enter` (Zeilenumbruch) und `Shift-Delete` (Ausschneiden) **weiterhin** funktionsfähig
      (Keymap nur additiv erweitert, Abschnitt 4 / 0.0 Punkt 1).
- [ ] Alle Testfälle aus Abschnitt 14 automatisiert und grün — inkl. der DOCX-Reader-Fälle
      (`saut_page.docx`, `60329.docx`) und ODT-Reader-Fälle (`pagebreaks.odt` mit `break-before`
      **und** `break-after`, `text-extract.odt`).
- [ ] Die verifizierten stillen Datenverluste (DOCX-Reader-Degradierung 0.2, ODT-Reader-Ignoranz
      von `break-before`/`-after`) nachweislich behoben.
- [ ] Grenzfälle (13) einzeln befundet — insbesondere 4/5 als „Datenebene vollständig,
      Live-Vorschau mit dokumentierter, vorbestehender Einschränkung (7.4)".
- [ ] Baseline-Rundreise (5.1) bleibt für **alle** Bestandstests grün, insbesondere `60329.docx`
      und `text-extract.odt`.
- [ ] Feature-Rundreise (5.2) für DOCX, ODT und **beide** Cross-Format-Richtungen, inkl. der
      realen Fixtures aus 0.3.
- [ ] Selection-Sync-Regressionstest mit Seitenumbruch-Sequenz (14.4) grün und dauerhaft Teil von
      `selection-regression.spec.ts`.
- [ ] Zusammenspiel mit der automatischen Paginierung (7) geprüft, Einschränkung 7.4 dokumentiert.
- [ ] `npm run build` läuft nach allen Änderungen fehlerfrei (Abschnitt 15 Punkt 11).

Erst wenn alle Punkte erfüllt sind, darf der Backlog-Status von `seitenumbruch` von „fehlt" auf
„vorhanden" wechseln — sonst „teilweise" mit Verweis auf die konkret offenen Punkte.
