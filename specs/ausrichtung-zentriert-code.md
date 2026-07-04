# Umsetzungsplan: Feature „Ausrichtung zentriert" — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/ausrichtung-zentriert-req.md`. Dieses Dokument prüft
den **tatsächlichen** Code-Stand (inkl. Ausführung gegen echte Fixture-Dateien und
gezielte Reproduktionen) gegen jede Behauptung/jedes Verdachtsmoment der Anforderung und
legt fest, welche Dateien wie geändert bzw. neu angelegt werden. Stil orientiert an
`FEATURE-SPEC-DOCX-ODT.md` und `specs/fett-code.md`. Kein Punkt hier ist bereits
umgesetzt — dies ist der Plan, nicht der Vollzug.

Alle Befunde in Abschnitt 2 wurden nicht nur durch Lesen des Codes, sondern durch
tatsächliche Ausführung verifiziert: einerseits mit dedizierten, danach wieder
entfernten Vitest-Reproduktionen (ProseMirror-`EditorState`/`EditorView` in jsdom,
`readDocx`/`readOdt` gegen echte Fixture-Bytes aus `tests/fixtures/external/`),
andererseits durch Inspektion der rohen XML-Bytes der in der Anforderung genannten
Fixture-Kandidaten per JSZip. Die Ergebnisse sind unten mit den jeweils beobachteten
Werten belegt.

---

## 0. Kurzfassung

Die Ist-Stand-Tabelle in `ausrichtung-zentriert-req.md` Abschnitt 1 ist in praktisch
allen Zeilenangaben exakt (siehe Abschnitt 1 unten). Die tatsächliche Ausführung des
Codes deckt aber **einen bislang völlig unentdeckten, kritischen Funktionsfehler** auf,
der weit über das in Abschnitt 6 Punkt 4 der Anforderung geäußerte Verdachtsmoment
("vermutlich mehrere Undo-Schritte") hinausgeht:

1. **Zentrieren einer Mehrabsatz-Selektion wirft eine `RangeError` und zentriert nur den
   ersten betroffenen Absatz — alle weiteren bleiben unverändert.** Reproduziert mit
   einer echten `EditorView`: `setAlign('center')` auf eine 3-Absatz-Selektion liefert
   `RangeError: Applying a mismatched transaction` und am Ende `['center', 'left',
   'left']` statt `['center', 'center', 'center']`. Das ist **kein** bloßes
   Undo-Granularitätsproblem, wie Verdachtsmoment 6.4 der Anforderung vermutet, sondern
   ein harter Funktionsfehler, der die Kernanforderung 3.2/Testfall 3/Grenzfall 4
   („jeder betroffene Absatz wird zentriert") komplett verletzt, sobald mehr als ein
   Absatz betroffen ist — z. B. auch bei „Alles auswählen" + „Zentriert" auf ein
   mehrabsätziges Dokument. Siehe Abschnitt 2.1.
2. **ODT-Reader gibt einen nicht-kanonischen `fo:text-align`-Wert unverändert als
   `align` durch, statt (wie der DOCX-Reader) auf einen der vier Schema-Werte
   abzubilden oder auf `'left'` zurückzufallen.** Mit der von der Anforderung selbst
   als Kandidat genannten Fixture `feature_attributes_paragraph_MSO2013.odt`
   reproduziert: Ein als „Align Text Right" beschrifteter Absatz mit
   `fo:text-align="end"` importiert als `attrs.align === "end"` — ein Wert, den weder
   `isAlignActive` noch die Export-Zuordnungstabellen von `docx/writer.ts` oder
   `odt/writer.ts` kennen. Attribute Export-Fallback beider Writer landet dadurch bei
   `'left'` → ein rechtsbündiger ODT-Absatz wird nach unverändertem Reimport+Export
   **stillschweigend linksbündig**. Das ist ein realer, mit einer der in der
   Anforderung selbst empfohlenen Dateien nachweisbarer Rundreise-Datenverlust — auch
   wenn `center` selbst (der fachliche Fokus) davon nicht betroffen ist, da ODF für
   „zentriert" nur den einen kanonischen Wert `"center"` kennt. Siehe Abschnitt 2.3.
3. **Grenzfall 1 (stilbasierte Zentrierung) ist mit der von der Anforderung
   vorgeschlagenen Datei `bug-paragraph-alignment.docx` real reproduzierbar und
   bestätigt sich als Bug:** Der erste Absatz dieser Datei enthält den Kommentartext
   „This paragraph does not have explicit alignment, it's centered per the paragraph
   style" und tatsächlich keinerlei `<w:jc>` am Absatz selbst — nur `<w:pStyle
   w:val="Title"/>`, wobei `Title` in `styles.xml` `<w:jc w:val="center"/>` definiert.
   Der aktuelle Reader importiert diesen Absatz nachweislich als `align: "left"`.
   Siehe Abschnitt 2.6.
4. **Drei der vier in der Anforderung als Rundreise-/Grenzfall-Kandidaten genannten
   Fixture-Dateien passen nicht zu dem, wofür sie vorgeschlagen wurden** — das ist kein
   Code-Fehler, aber wichtig für die Testplanung (Abschnitt 3 unten): `table-
   alignment.docx` enthält `<w:jc>` nur innerhalb von `<w:tblPr>` (Tabellen-
   Fließausrichtung auf der Seite, ein hier nicht implementiertes, anderes Feature),
   **nicht** in `<w:pPr>` einer Zelle; `TestTableCellAlign.docx` enthält ausschließlich
   `<w:vAlign>` (vertikale Zellausrichtung), keinen einzigen `<w:jc>`;
   `CharacterParagraphFormat.odt` enthält weder in `content.xml` noch in `styles.xml`
   ein einziges `fo:text-align`. Für Testfall 32 (zentrierter Tabellenzellen-Absatz,
   Rundreise) muss daher eine eigene, handgebaute Fixture verwendet werden.
5. **Copy/Paste von extern zentriertem Text geht beim naheliegenden Fall „Stil auf
   umschließendem `<div>`, nicht auf dem `<p>` selbst" nachweislich verloren.** Mit
   `DOMParser.fromSchema(wordSchema).parse(...)` reproduziert:
   `<div style="text-align: center"><p>Text</p></div>` liefert `align: "left"` (nicht
   `"center"`), weil `schema.ts`s `getAttrs` nur `dom.style.textAlign` **des `<p>`
   selbst** liest, nicht die geerbte/kaskadierte Eigenschaft. Genau diese Struktur ist
   real (u. a. wie Webseiten und manche Word-HTML-Clipboard-Exporte Ausrichtung
   setzen) und in der Anforderung (Grenzfall 13) als „muss mit echtem Browser-Test
   geprüft werden" markiert — hiermit als wahrscheinlicher Bug vorab bestätigt, siehe
   Abschnitt 2.9.

Zusätzlich bestätigen sich alle acht in Abschnitt 6 der Anforderung benannten
Verdachtsmomente als reale, im Code nachweisbare Fehler bzw. Lücken (siehe Abschnitt 2
für die Zuordnung 1:1 zu den Verdachtsmomenten 1–3, 5–9; Verdachtsmoment 4 wird durch
Befund 1 oben **verschärft**, nicht nur bestätigt).

---

## 1. Verifikation der Ist-Stand-Tabelle aus `ausrichtung-zentriert-req.md` Abschnitt 1

| Fundstelle laut Anforderung | Ergebnis der Prüfung |
|---|---|
| `schema.ts:4,12–16,22–30` `align`-Attribut | Bestätigt, Zeilen exakt (aktuelle Datei: Zeile 4 `alignAttr`, Paragraph-Node 9–17, Heading-Node 19–31 — die Anforderung zitiert die einzelnen Teilzeilen korrekt). `toDOM` rendert `style="text-align: ${align}"`, `parseDOM` liest `style.textAlign \|\| 'left'`. **Ergänzender Befund:** `getAttrs` liest nur `dom.style.textAlign` des jeweiligen `<p>`/`<hN>`-Elements selbst, keine geerbte/kaskadierte Eigenschaft eines umschließenden Elements — siehe neuer Befund 2.9. |
| `commands.ts:8,10,13–27,29–38` `setAlign`/`isAlignActive` | Bestätigt, Zeilen exakt. **Aber:** Die Anforderung unterschätzt die Schwere von `setAlign` bei Mehrabsatz-Selektion erheblich — siehe Befund 2.1 (echte `RangeError`, nicht nur „vermutlich mehrere Undo-Schritte"). |
| `commands.ts:40–55` `setHeading` | Bestätigt, Zeile 43 exakt: `attrs = level === null ? undefined : { level, align: 'left' }`. Bestätigt als Bug (Befund 2.2). |
| `Toolbar.tsx:64–84,185–188` `AlignButton` | Bestätigt, Zeilen exakt. `title={\`Ausrichtung: ${align}\`}` (Zeile 69) ohne eigenes `aria-label` (Zeile 67–74) — bestätigt. **Ergänzender Befund:** `AlignButton` verdrahtet wie `MarkButton` (vor dessen etwaigem Fix aus `fett-code.md`) ausschließlich `onMouseDown`, kein `onClick` — zum Zeitpunkt dieser Prüfung ist dieser Fix in `Toolbar.tsx` **nicht** vorhanden (verifiziert durch erneutes Lesen der Datei), betrifft also auch `AlignButton` unabhängig vom Fett-Feature. Siehe Befund 2.5. |
| `WordEditor.tsx:71–79` Keymap ohne Ausrichtungs-Kürzel | Bestätigt, kein `Mod-*` für `setAlign` vorhanden. |
| `docx/reader.ts:13,150–152` `JC_TO_ALIGN` | Bestätigt, Zeilen exakt: `{ left, center, right, both→justify }`, Fallback `?? 'left'` bei Zeile 152. **Mit echter Fixture reproduziert** (Befund 2.6/2.7): `bug-paragraph-alignment.docx` (Grenzfall 1) und `rtl.docx` (Grenzfall 2/10, `jc="start"` mit `w:bidi="1"`). |
| `docx/writer.ts:16,67–69` `JC_BY_ALIGN` | Bestätigt, Zeilen exakt. Schreibt bei jedem Absatz explizit `<w:jc>`, auch bei `left` — bestätigt unschädlich, kein Fix nötig. |
| `odt/reader.ts:36–77,126,173` `parseAutomaticStyles` | Bestätigt, Zeilen exakt: nur `office:automatic-styles`, keine `office:styles`/`style:parent-style-name`-Auflösung. **Ergänzender, in der Anforderung nicht benannter Befund:** Der gelesene `fo:text-align`-Rohwert wird **ungeprüft** durchgereicht (Zeile 65: `if (align) paragraphAligns.set(name, align)` — kein Mapping wie `JC_TO_ALIGN` auf der DOCX-Seite). Siehe Befund 2.3 — dies ist eine eigenständige, schwerwiegendere Lücke als das, was Verdachtsmoment 6.2/6.3 beschreibt (die nur von einem impliziten `'left'`-Fallback ausgehen). |
| `odt/writer.ts:61–73`, `odt/styleRegistry.ts:68–89` | Bestätigt, Zeilen exakt (`PARAGRAPH_ALIGN_STYLE_NAME`, `headingStyleName`). Kein Fix nötig — der Fehler liegt ausschließlich im Reader (Befund 2.3), nicht im Writer. |
| `docx/__tests__/roundtrip.test.ts:41–53`, `odt/__tests__/roundtrip.test.ts:41–53` | Bestätigt, Zeilen exakt. Reine Writer→eigener-Reader-Kette, wie beschrieben — bestätigt lückenhaft für Tabellen/Listen/Formatvorlagen-Wechsel/Fremddateien. |
| `tests/e2e/*.spec.ts` — kein Treffer für „align"/„Ausrichtung" | Bestätigt (erneut per Volltextsuche geprüft: `docx.spec.ts`, `odt.spec.ts`, `selection-regression.spec.ts`, `lifecycle.spec.ts` enthalten keinen Ausrichtungs-Test). |
| Reale Fixtures `tests/fixtures/external/{docx,odt}/*` | Alle in der Anforderung genannten Dateinamen existieren tatsächlich im Repo (verifiziert per `ls`). **Aber:** Drei der genannten Alternativ-Kandidaten sind für den vorgesehenen Zweck ungeeignet — siehe Befund 2.8 (Fixture-Korrektur). |

---

## 2. Gefundene Fehler (priorisiert)

### 2.1 Fehler 1 (kritisch): Mehrabsatz-Zentrierung wirft `RangeError`, nur der erste Absatz wird zentriert

**Datei:** `src/formats/shared/editor/commands.ts`, `setAlign` (Zeilen 13–27):

```ts
export function setAlign(align: Align): Command {
  return (state, dispatch) => {
    const { from, to } = state.selection
    let applicable = false
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (alignableTypes.has(node.type.name)) {
        applicable = true
        if (dispatch) {
          dispatch(state.tr.setNodeAttribute(pos, 'align', align))
        }
      }
    })
    return applicable
  }
}
```

`state.tr` ist ein Getter, der bei **jedem** Zugriff eine **neue** `Transaction`
erzeugt, deren `.before` der zum Zeitpunkt des Funktionsaufrufs fest eingefrorene
`state.doc` ist (`state` ist der Funktionsparameter, nicht `view.state` zur
Laufzeit). Für den zweiten und jeden weiteren Treffer in der Schleife wird also eine
Transaktion erzeugt, deren `.before` **immer noch der ursprüngliche, unveränderte
Dokumentzustand** ist — obwohl `view.state` durch den ersten `dispatch()`-Aufruf
(via `WordEditor.tsx`s `dispatchTransaction`, Zeilen 91–98) bereits weitergerückt ist.

`prosemirror-state`s `EditorState.applyInner` (siehe
`node_modules/prosemirror-state/dist/index.cjs:744`) enthält exakt diese Prüfung:

```js
if (!tr.before.eq(this.doc)) throw new RangeError("Applying a mismatched transaction");
```

Reproduziert mit einer echten `EditorView` (3 Absätze, Selektion über alle drei,
`setAlign('center')(view.state, view.dispatch)`):

```
threw: RangeError: Applying a mismatched transaction
    at EditorState.applyInner (.../prosemirror-state/dist/index.js:832:19)
    at EditorState.applyTransaction (.../prosemirror-state/dist/index.js:796:45)
    at EditorState.apply (.../prosemirror-state/dist/index.js:772:21)
    at EditorView.dispatchTransaction (WordEditor.tsx-Äquivalent im Test)
    at EditorView.dispatch (.../prosemirror-view/dist/index.js:5894:29)
    at commands.ts:21:11   (dispatch(...) im setAlign-Loop)
    at Fragment.nodesBetween (.../prosemirror-model/dist/index.js:98:31)
    at Node.nodesBetween (.../prosemirror-model/dist/index.js:1226:22)
    at commands.ts:17:15
final aligns: [ 'center', 'left', 'left' ]
```

**Auswirkung auf die Anforderung:** Testfall 3 (Mehrabsatz-Selektion → alle zentriert),
Testfall 4 (Undo-Verhalten danach), Grenzfall 4 (gemischte Selektion), Testfall 11/39
(lange Selektion über viele Absätze) und der in Abschnitt 3.9/`FEATURE-SPEC-DOCX-
ODT.md` Abschnitt 2 geforderte Regressionstest „Alles auswählen → Zentriert" schlagen
mit dem aktuellen Code **alle** fehl, sobald mehr als ein alignierbarer Knoten in der
Selektion liegt — nicht nur mit „unschöner" Undo-Granularität, sondern mit einer
tatsächlichen, im Browser als unbehandelte Exception sichtbaren Fehlfunktion (in
React 18/19 wird eine in einem synthetischen Event-Handler geworfene Exception nicht
lautlos verschluckt, sondern typischerweise über `reportError`/die Konsole sichtbar;
`view.focus()` in `Toolbar.tsx`s `run()`-Helfer, Zeile 24, wird wegen des Throws
zusätzlich nie erreicht).

**Fix:** Eine einzige Transaktion für alle betroffenen Knoten aufbauen (statt pro
Knoten neu `state.tr` zu holen und einzeln zu dispatchen), plus No-Op-Kurzschluss für
Grenzfall 12 (wiederholtes Klicken auf bereits korrekt ausgerichteten Text soll keine
neue Undo-Stufe erzeugen):

```ts
export function setAlign(align: Align): Command {
  return (state, dispatch) => {
    const { from, to } = state.selection
    const positions: number[] = []
    let allAlreadySet = true
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (alignableTypes.has(node.type.name)) {
        positions.push(pos)
        if (node.attrs.align !== align) allAlreadySet = false
      }
    })
    if (positions.length === 0) return false
    if (allAlreadySet) return true // no-op: nichts zu tun, keine leere Undo-Stufe (Grenzfall 12)
    if (dispatch) {
      let tr = state.tr
      for (const pos of positions) tr = tr.setNodeAttribute(pos, 'align', align)
      dispatch(tr)
    }
    return true
  }
}
```

Verifiziert per Prototyp gegen eine echte `EditorView` samt `history()`-Plugin:
3-Absatz-Selektion → `setAlign('center')` → alle drei `align === 'center'` → **ein
einziges** `undo()` (aus `prosemirror-history`) macht alle drei Änderungen gemeinsam
rückgängig (`['left','left','left']`), nicht drei separate Schritte. Das beantwortet
zugleich Verdachtsmoment 6.4/Testfall 4 der Anforderung abschließend mit „ein Klick =
ein Undo-Schritt", sobald dieser Fix greift — vorher war die Frage ohnehin hinfällig,
weil der zweite Absatz nie erreicht wurde.

### 2.2 Fehler 2 (hoch): `setHeading` setzt Ausrichtung bei jedem Formatvorlagenwechsel hart auf `'left'`

**Datei:** `src/formats/shared/editor/commands.ts:40–55`, bestätigt Verdachtsmoment 1
(„gewichtigster Einzelverdacht" der Anforderung) exakt:

```ts
const attrs = level === null ? undefined : { level, align: 'left' }
```

Betrifft **jeden** Wechsel: Standard→Überschrift X, Überschrift X→Überschrift Y,
Überschrift X→Standard (Fall 2 ist über den `undefined`-Pfad → Schema-Default
`'left'` genauso betroffen, nicht nur der explizite `align: 'left'`-Zweig).

**Fix:** Aktuelle Ausrichtung des betroffenen Absatzes/der Überschrift übernehmen statt
sie zu verwerfen:

```ts
export function setHeading(level: number | null): Command {
  return (state, dispatch) => {
    const type = level === null ? wordSchema.nodes.paragraph : wordSchema.nodes.heading
    const { $from, $to } = state.selection
    if (!$from.sameParent($to)) return false
    const parent = $from.parent
    if (!alignableTypes.has(parent.type.name)) return false
    const align = (parent.attrs.align as string | undefined) ?? 'left'
    const attrs = level === null ? { align } : { level, align }
    if (dispatch) {
      const pos = $from.before($from.depth)
      const tr = state.tr.setBlockType(pos, pos + parent.nodeSize, type, attrs)
      dispatch(tr)
    }
    return true
  }
}
```

`parent.attrs.align` existiert garantiert, da `alignableTypes` nur `paragraph` und
`heading` enthält und beide das `align`-Attribut mit Default `'left'` führen — der
`?? 'left'`-Fallback ist rein defensiv (deckt z. B. zukünftige, hier nicht
antizipierte Knotentypen ab, falls `alignableTypes` je erweitert wird).

### 2.3 Fehler 3 (hoch, in der Anforderung nicht in dieser Schärfe benannt): ODT-Reader gibt nicht-kanonische `fo:text-align`-Werte roh durch

**Datei:** `src/formats/odt/reader.ts:64–65` (analog Zeile 126, 173 für die
Verwendungsstellen):

```ts
const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
if (align) paragraphAligns.set(name, align)
```

Anders als der DOCX-Reader (`JC_TO_ALIGN[jcVal] ?? 'left'`, garantiert immer einer der
vier Schema-Werte) gibt es hier **keine** Normalisierungstabelle. ODF erlaubt für
`fo:text-align` neben `left`/`center`/`right`/`justify` auch die
richtungsrelativen logischen Werte `start`/`end` (ODF 1.3, §20.276) — diese werden
unverändert als `align`-Attributwert übernommen.

**Reproduziert mit der von der Anforderung selbst vorgeschlagenen Fixture**
`feature_attributes_paragraph_MSO2013.odt` (`readOdt()` gegen die echten Datei-Bytes
ausgeführt):

```
heading {"level":2,"align":"left"} ["Align Text Right"]
paragraph {"align":"end"} ["Lorem ipsum ... "]
```

Der als „Align Text Right" beschriftete Absatz importiert mit `align: "end"`, nicht
`"right"`. Folgen:
- `isAlignActive(state, 'right')` vergleicht `node.attrs.align === 'right'` → `false`,
  obwohl der Absatz eindeutig rechtsbündig gemeint ist — keiner der vier
  Toolbar-Buttons zeigt „aktiv".
- `docx/writer.ts:68`: `JC_BY_ALIGN['end'] ?? 'left'` → Export nach DOCX schreibt
  `<w:jc w:val="left"/>` — **Datenverlust beim Cross-Format-Export.**
- `odt/writer.ts:65`: `PARAGRAPH_ALIGN_STYLE_NAME['end'] ?? PARAGRAPH_ALIGN_STYLE_NAME.left`
  → auch der ODT-Reexport derselben Datei (unverändertes Hochladen → Exportieren, exakt
  Testfall 29!) würde den rechtsbündigen Absatz **stillschweigend linksbündig**
  reexportieren.

`center` selbst ist von diesem konkreten Fixture-Befund nicht betroffen, weil ODF für
„zentriert" nur den einen Wert `"center"` kennt (kein `start`/`end`-Analogon) — der
Mechanismus (fehlende Normalisierung) ist aber exakt derselbe geteilte Code, den auch
`center` durchläuft, und wird deshalb hier als Fehler dieses Features behandelt (siehe
Einleitung der Anforderung: „ein Mechanismus für alle vier Werte").

**Fix:** Analog zum DOCX-Reader eine Normalisierungsfunktion einführen (Details und
RTL-Erkennung via `style:writing-mode` siehe Abschnitt 4.5).

### 2.4 Fehler 4 (mittel-hoch): `isAlignActive` berücksichtigt nur `$from`, zeigt bei gemischter Selektion irreführend „aktiv"

**Datei:** `commands.ts:29–38`, bestätigt Verdachtsmoment 5/Grenzfall 3.4 der
Anforderung. Aktuell:

```ts
export function isAlignActive(state: EditorState, align: Align): boolean {
  const { $from } = state.selection
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth)
    if (alignableTypes.has(node.type.name)) {
      return node.attrs.align === align
    }
  }
  return false
}
```

Bei einer Selektion, die mit einem zentrierten Absatz beginnt, aber weitere, anders
ausgerichtete Absätze enthält, zeigt der „Zentriert"-Button fälschlich „aktiv", obwohl
ein Klick **alle** betroffenen Absätze überschreiben würde (inkl. der bereits korrekten
Anzeige-Konvention aus Word/LibreOffice, die die Anforderung in 3.4 selbst als
Zielverhalten nennt: bei gemischter Selektion ist **keiner** der vier Buttons aktiv).

**Fix** (analog zum in `fett-code.md` Abschnitt 2.2/4.1 für `isMarkActive`
etablierten Muster „volle Abdeckung der Selektion, nicht nur `$from`"):

```ts
export function isAlignActive(state: EditorState, align: Align): boolean {
  const { $from, from, to, empty } = state.selection
  if (empty) {
    for (let depth = $from.depth; depth >= 0; depth--) {
      const node = $from.node(depth)
      if (alignableTypes.has(node.type.name)) return node.attrs.align === align
    }
    return false
  }
  let allMatch = true
  let sawAny = false
  state.doc.nodesBetween(from, to, (node) => {
    if (alignableTypes.has(node.type.name)) {
      sawAny = true
      if (node.attrs.align !== align) allMatch = false
    }
  })
  return sawAny && allMatch
}
```

### 2.5 Fehler 5 (mittel): `AlignButton` ist per Tastatur nicht auslösbar

**Datei:** `Toolbar.tsx:64–84`. Wie `MarkButton` vor seinem in `fett-code.md` Abschnitt
2.1/4.2 vorgeschlagenen (zum Zeitpunkt dieser Prüfung **nicht** im Code vorhandenen)
Fix verdrahtet `AlignButton` die Aktion ausschließlich über `onMouseDown`:

```tsx
onMouseDown={(e) => {
  e.preventDefault()
  run(view, setAlign(align))
}}
```

Ein natives `<button>` löst bei Tastatur-Aktivierung (Tab-Fokus + Enter/Space) **kein**
`mousedown`, sondern nur `click` aus — Tab zu einem der vier Ausrichtungs-Buttons,
Enter/Leertaste drücken → nichts passiert. Verstößt gegen Anforderungsabschnitt 2
Punkt 1 (Klick muss „unabhängig von Maus-Selektion, Tastatur-Selektion..." — implizit
auch die Bedienung des Buttons selbst per Tastatur, analog zur allgemeinen
Barrierefreiheits-Erwartung, die `fett-code.md` für die Zeichenformat-Buttons bereits
explizit einfordert).

**Fix:** Gleiches Muster wie in `fett-code.md` Abschnitt 4.2 vorgeschlagen —
`onMouseDown` reduziert auf `e.preventDefault()`, neuer `onClick`-Handler führt
`run(view, setAlign(align))` aus. Falls `fett-code.md`s `MarkButton`-Fix bereits
umgesetzt sein sollte, wenn dieser Plan zur Ausführung kommt: `AlignButton` ist eine
separate Komponente, der Fix hier ist unabhängig und überschneidet sich nicht.

### 2.6 Fehler 6 (bestätigt aus Verdachtsmoment 2/Grenzfall 1, mit echter Fixture belegt): Keine stilbasierte Ausrichtungsauflösung beim Import

**DOCX**, `docx/reader.ts:146–152` (`paragraphToBlocks`) liest `align` ausschließlich
aus einem direkt am Absatz vorhandenen `<w:jc>`; `w:pStyle` wird nur für die
Überschriften-Ebene (`headingLevelForStyle`) ausgewertet, nie für Ausrichtung.

**Reproduziert** mit `tests/fixtures/external/docx/bug-paragraph-alignment.docx`
(genau die von der Anforderung in Abschnitt 5 Punkt 1 vorgeschlagene Datei):

- `word/document.xml`, Absatz 1: `<w:pPr><w:pStyle w:val="Title"/><w:rPr>...</w:rPr></w:pPr>`
  — **kein** `<w:jc>` am Absatz. Text: „This paragraph does not have explicit
  alignment, it's centered per the paragraph style."
- `word/styles.xml`: `<w:style w:type="paragraph" w:styleId="Title">...<w:pPr><w:jc
  w:val="center"/></w:pPr>...`
- Absatz 2 im selben Dokument (Kontrollfall, direkte Formatierung schlägt Stil):
  `<w:pPr><w:pStyle w:val="Title"/><w:jc w:val="left"/>...` mit Text „This paragraph
  has explicit left alignment, overriding the alignment in the paragraph style."
- `readDocx()` gegen diese echten Bytes ausgeführt liefert aktuell für **beide**
  Absätze `attrs.align === "left"` — Absatz 1 ist also nachweislich falsch (müsste
  `"center"` sein), Absatz 2 zufällig richtig (weil sein direktes `left` ohnehin dem
  fälschlichen Fallback entspricht).

**ODT:** `odt/reader.ts:36–77` liest `fo:text-align` nur aus
`style:style[@style:family='paragraph']` innerhalb von `office:automatic-styles` —
weder `office:styles` (benannte/gemeinsame Stile) noch eine
`style:parent-style-name`-Kette werden ausgewertet. Keine der verfügbaren
ODT-Fixtures demonstriert aktuell den **reinen** Vererbungsfall (Stil erbt
`fo:text-align` nur über `style:parent-style-name`, ohne ihn selbst zu wiederholen) —
alle geprüften Dateien (`feature_attributes_paragraph_MSO2013*.odt`) setzen
`fo:text-align` direkt auf dem referenzierten automatischen Stil. Für diesen
Teilfall ist deshalb eine handgebaute Fixture nötig (siehe Abschnitt 6.3).

**Fix:** Siehe Abschnitt 4.4 (DOCX) und 4.5 (ODT) für die konkrete
Implementierung (Stil-Kette mit `w:basedOn`/`style:parent-style-name`, Zyklenschutz
nach dem bereits im Code etablierten `MAX_TABLE_NESTING_DEPTH`/`MAX_NESTING_DEPTH`-
Muster). Direkte Absatzformatierung hat immer Vorrang vor der Formatvorlage (Word/
LibreOffice-Semantik, durch Absatz 2 der obigen Fixture explizit belegt).

### 2.7 Fehler 7 (bestätigt aus Verdachtsmoment 3, mit echter RTL-Fixture belegt): Unvollständige `jc`-Wertetabelle

**Datei:** `docx/reader.ts:13`. `JC_TO_ALIGN` kennt nur `left/center/right/both`.
**Reproduziert** mit `tests/fixtures/external/docx/rtl.docx` (von der Anforderung in
Grenzfall 10 explizit als bereits vorhandene Fixture genannt):

```xml
<w:pPr>
  <w:pStyle w:val="Normal"/>
  <w:bidi w:val="1"/>
  <w:jc w:val="start"/>
  ...
</w:pPr>
```

Dieser RTL-Absatz (arabischer Text) hat `jc="start"` **und** `w:bidi="1"` (Absatz ist
rechts-nach-links). Nach ECMA-376 bedeutet `start` in einem bidi-Absatz „am Anfang der
Zeile in Leserichtung" — für RTL-Text ist das die **rechte** Seite, physisch also
`right`, nicht `left`. Der aktuelle Code (`JC_TO_ALIGN['start'] ?? 'left'` →
`'left'`) importiert diesen Absatz als linksbündig — physisch falsch, exakt das in
Grenzfall 2/10 beschriebene Risiko.

**Wichtiger Scope-Hinweis:** Der Schema-/Reader-Code hat aktuell **keinerlei**
Behandlung von `w:bidi`/Textrichtung (kein `dir`-Attribut in `schema.ts`s `toDOM` für
`paragraph`/`heading`, `w:bidi` wird im DOCX-Reader nirgends gelesen). Vollständige
RTL-Unterstützung (korrekte Leserichtung/Zeichen-Shaping der Zeile selbst) ist ein
eigenständiges, hier nicht enthaltenes Feature und **nicht** Teil dieses Plans — siehe
Abschnitt 5.4 für die explizite Abgrenzung. Für **dieses** Feature genügt es, dass
`start`/`end` korrekt auf einen der vier physischen Werte abgebildet werden, was mit
dem bereits am Absatz vorhandenen `w:bidi`-Flag (unabhängig von echtem
Zeilenrichtungs-Rendering) möglich ist.

**Fix:** `resolveJc(jcVal, isBidi)`-Helfer (Abschnitt 4.4) sowie erweiterte Behandlung
der übrigen in Grenzfall 2 genannten Werte (`distribute`, `thaiDistribute`,
`*Kashida` → alle physisch am nächsten an `justify`; `numTab` bleibt dokumentiert bei
`'left'`, da kein sinnvolles physisches Äquivalent ohne volle
Nummerierungs-Tab-Modellierung existiert).

### 2.8 Fehler 8 (Testplanungs-Korrektur, kein Code-Fehler): Drei der vier vorgeschlagenen Alternativ-Fixtures passen nicht zum Feature

Per JSZip-Inspektion der rohen XML-Bytes geprüft:

| Datei (von der Anforderung vorgeschlagen für) | Tatsächlicher Inhalt | Eignung |
|---|---|---|
| `table-alignment.docx` (Alternative zu Testfall 23; Kandidat für Testfall 32) | 5×`<w:jc>`, aber **ausschließlich** innerhalb von `<w:tblPr>` (`left/start/center/right/end`) — das ist die **Fließausrichtung der Tabelle auf der Seite** (analog `align="center"` bei einem HTML-`<table>`), ein hier nicht implementiertes, komplett anderes Feature. **Kein einziges** `<w:jc>` innerhalb eines `<w:pPr>` einer Zelle. | **Ungeeignet** für Absatz-/Zellen-Textausrichtung. |
| `TestTableCellAlign.docx` (Kandidat für Testfall 32) | Enthält `<w:vAlign w:val="bottom"/>` (vertikale Zellausrichtung: oben/Mitte/unten) in `<w:tcPr>` — **kein einziges** `<w:jc>` irgendwo in der Datei. | **Ungeeignet**, betrifft ein anderes (vertikales) Ausrichtungs-Feature. |
| `CharacterParagraphFormat.odt` (primärer Kandidat für Testfall 29) | Weder in `content.xml` noch in `styles.xml` ein einziges `fo:text-align`-Attribut. | **Ungeeignet** für diesen Testfall. |
| `feature_attributes_paragraph_MSO2013.odt` (nur als „ersatzweise" genannt) | Enthält in `content.xml` echte, direkt gesetzte `fo:text-align="center"` (2×), `"end"` (2×), `"justify"` (2×) an benannten Automatikstilen, mit beschrifteten Testabschnitten „Align Text Left/Center/Right", „Justify" — **exakt passend**. | **Empfohlen als primärer Kandidat** für Testfall 29 statt `CharacterParagraphFormat.odt`. |

**Konsequenz für die Testplanung (Abschnitt 6 dieses Plans):** Testfall 32
(zentrierter Tabellenzellen-Absatz, Rundreise) benötigt eine **neu angelegte,
handgebaute** DOCX-Fixture (Muster: `w:tbl > w:tr > w:tc > w:p > w:pPr > w:jc
w:val="center"`, analog zum bereits etablierten `buildSampleDocx()`-Muster in
`tests/e2e/docx.spec.ts`), da keine der vier in der Anforderung genannten Dateien
(auch nicht `bug-paragraph-alignment.docx`) tatsächlich zentrierten Zelltext enthält.
Testfall 29 sollte primär gegen `feature_attributes_paragraph_MSO2013.odt` laufen,
nicht gegen `CharacterParagraphFormat.odt`.

### 2.9 Fehler 9 (neu, in der Anforderung als offener Prüfpunkt markiert — hiermit vorab bestätigt): Copy/Paste verliert Ausrichtung, wenn der Stil auf einem umschließenden Element sitzt

**Datei:** `schema.ts:13,26`, `getAttrs: (dom) => ({ align: (dom as
HTMLElement).style.textAlign || 'left' })`. Liest ausschließlich die **eigene**
Inline-`style`-Eigenschaft des gematchten `<p>`/`<hN>`-Elements, keine geerbte
Eigenschaft eines Vorfahren.

**Reproduziert** mit `prosemirror-model`s `DOMParser.fromSchema(wordSchema).parse(...)`:

```
Input:  <p style="text-align: center">Zentriert</p>
Output: attrs.align === "center"                        ✓ korrekt

Input:  <div style="text-align: center"><p>Zentriert (von außen)</p></div>
Output: attrs.align === "left"                            ✗ Zentrierung verloren
```

Diese Struktur (Ausrichtung auf einem umschließenden `<div>`, nicht direkt auf dem
`<p>`) ist real und in der Anforderung selbst als zu prüfender Fall benannt
(Grenzfall 13: „z. B. aus einer Webseite mit `style="text-align: center"`" — viele
Webseiten und manche Zwischenablage-Exporte setzen die Ausrichtung tatsächlich auf
einem Container statt auf jedem einzelnen `<p>`).

**Fix (empfohlen):** `getAttrs` von `dom.style.textAlign` auf
`getComputedStyle(dom as HTMLElement).textAlign` umstellen — `text-align` ist eine
vererbte CSS-Eigenschaft, `getComputedStyle` löst die Kaskade inkl. Vererbung aus
Vorfahren korrekt auf, in einem echten Browser (ProseMirrors Zwischenablage-Erfassung
fügt den eingefügten HTML-Ausschnitt dafür temporär in ein reales, wenn auch
unsichtbares DOM-Element ein, wodurch `getComputedStyle` dort zuverlässig
funktioniert — anders als bei einem komplett freistehenden, nie angehängten Element).

**Wichtige Test-Einschränkung, ebenfalls empirisch verifiziert:** jsdom (die
Testumgebung von Vitest, `vitest.config.ts`s `environment: 'jsdom'`) löst
`getComputedStyle`-Vererbung **nicht** auf — sowohl für ein freistehendes als auch für
ein an `document.body` angehängtes Element liefert `getComputedStyle(p).textAlign`
in jsdom einen leeren String, unabhängig vom übergeordneten `style`-Attribut. Dieser
Fix kann deshalb **nicht** über die bestehende Vitest/jsdom-Unit-Test-Suite verifiziert
werden (analoge, bereits im Code etablierte Erkenntnis: siehe
`docx/__tests__/external-fixtures.test.ts`s `SKIP_SLOW_UNDER_JSDOM`-Kommentar zur
generellen Diskrepanz zwischen jsdom und einem echten Browser-Engine). Verifikation
zwingend über einen echten Playwright/Chromium-E2E-Test (Abschnitt 6.1).

---

## 3. Kein Fehler, aber ausdrücklich zu bestätigen (bereits korrekt, nur ungetestet)

Folgende in der Anforderung als „zu prüfen" markierte Punkte sind nach Lektüre des
Codes strukturell bereits korrekt und benötigen **keinen Code-Fix**, nur die in
Abschnitt 6 aufgeführten Tests zur Absicherung:

- **3.3 Kein Toggle-Aus:** `setAlign` setzt immer den übergebenen Wert, es gibt keine
  Toggle-Logik — bereits korrekt (Radio-Button-Semantik).
- **3.6 Listen/Tabellenzellen:** `alignableTypes` prüft nur den Node-Typ, nicht die
  Elternstruktur — ein `paragraph` innerhalb `list_item`/`table_cell` ist
  strukturell identisch zu einem freistehenden Absatz und sollte sich identisch
  verhalten. Ebenso bleibt das Listensymbol (`<li>`-Marker) unberührt, da `text-align`
  nur auf dem inneren `<p>` gesetzt wird, nicht auf `<li>` selbst — Browser-Standard-
  verhalten (`list-style-position: outside`) platziert den Marker unabhängig vom
  Textfluss des Inhalts. Colspan/Rowspan-Zellen sind über eigene, unabhängige
  `table_cell`-Knoten mit jeweils eigenem `align` auf dem enthaltenen Absatz
  modelliert — keine gemeinsame Zustandsquelle, die Nebenwirkungen auf Nachbarzellen
  ermöglichen würde.
- **3.7 Visuelle Darstellung:** Reines CSS (`text-align`), keine Custom-Logik für
  Zeilenumbruch — Browser-Standardverhalten, kein Fix nötig.
- **3.8 Kombination mit Zeichenformatierung:** `align` ist ein Node-Attribut,
  Zeichenformatierung sind Marks auf den Inline-Kindern — vollständig orthogonale
  Systeme in ProseMirror, keine gegenseitige Beeinflussung möglich.
- **3.13 Copy/Paste (Grundmechanismus):** `parseDOM` liest `style.textAlign` bereits
  für den direkten Fall (Stil auf dem `<p>`/`<hN>` selbst) — funktioniert. Nur der in
  Befund 2.9 beschriebene Sonderfall (Stil auf Vorfahren) ist ein Bug.

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/editor/commands.ts` (geändert)

- `setAlign` ersetzen durch die in Abschnitt 2.1 gezeigte Fassung (eine Transaktion,
  No-Op-Kurzschluss).
- `isAlignActive` ersetzen durch die in Abschnitt 2.4 gezeigte Fassung
  (volle Selektionsabdeckung statt nur `$from`).
- `setHeading` ersetzen durch die in Abschnitt 2.2 gezeigte Fassung (Ausrichtung
  übernehmen statt hart zurücksetzen).

### 4.2 `src/formats/shared/editor/Toolbar.tsx` (geändert)

`AlignButton` (Zeilen 64–84):

- `onMouseDown` reduziert auf `e.preventDefault()`; neuer `onClick={() => run(view,
  setAlign(align))}` (behebt Fehler 5, Abschnitt 2.5).
- `aria-label={title}` ergänzen (behebt Verdachtsmoment 7 — Konsistenz zu
  `MarkButton` Zeile 47).
- Neue Konstante `ALIGN_LABELS: Record<Align, string>` (Datei-Modulebene, neben dem
  bestehenden `Align`-Import):

  ```ts
  const ALIGN_LABELS: Record<Align, string> = {
    left: 'Links',
    center: 'Zentriert',
    right: 'Rechts',
    justify: 'Blocksatz',
  }
  ```

  `title={\`Ausrichtung: ${ALIGN_LABELS[align]}\`}` statt `title={\`Ausrichtung:
  ${align}\`}` (Zeile 69) — behebt Verdachtsmoment 8 für alle vier Werte gleichzeitig
  (siehe Begründung/Scope-Abwägung in Abschnitt 5.2 — dies ist eine risikofreie,
  rein textuelle Änderung, im Gegensatz zum Icon, die deshalb sofort für alle vier
  Ausrichtungen mitgemacht wird statt auf die drei Geschwister-Anforderungen
  (`ausrichtung-links-req.md` etc.) verschoben zu werden).
- Neue Komponente `CenterAlignIcon` (kleines inline-SVG, gleiches Muster wie
  `fett-code.md` Abschnitt 4.2s `BoldIcon` — keine externe Icon-Bibliothek im
  Projekt vorhanden):

  ```tsx
  function CenterAlignIcon() {
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" fill="currentColor">
        <rect x="3" y="5" width="18" height="2" />
        <rect x="6" y="10" width="12" height="2" />
        <rect x="3" y="15" width="18" height="2" />
        <rect x="6" y="20" width="12" height="2" />
      </svg>
    )
  }
  ```

  (Klassisches „lang-kurz-lang-kurz, mittig zentriert"-Symbol für Textzentrierung —
  eindeutig von „links" (`⇤`), „rechts" (`⇥`) und „Blocksatz" (`≡`) unterscheidbar,
  behebt Verdachtsmoment 9 gezielt für `center`; die drei Geschwister-Icons bleiben
  unangetastet, siehe Scope-Abwägung Abschnitt 5.3).
- `AlignButton`-Komponente um optionalen `icon`-Prop erweitern (analog zu
  `fett-code.md`s `MarkButton`-Erweiterung), Aufrufstelle für `center` (Zeile 186):

  ```tsx
  <AlignButton view={view} align="center" label="↔" icon={<CenterAlignIcon />} />
  ```

  (`label` bleibt als Fallback/zusätzlicher Screenreader-Text erhalten, falls
  `icon` einmal entfernt wird.)

### 4.3 `src/formats/shared/editor/WordEditor.tsx` (geändert)

Keymap (Zeilen 71–79) um ein Tastenkürzel für „Zentriert" ergänzen:

```ts
keymap({
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
  Enter: splitListItem(wordSchema.nodes.list_item),
  'Mod-b': toggleMark(wordSchema.marks.strong),
  'Mod-i': toggleMark(wordSchema.marks.em),
  'Mod-u': toggleMark(wordSchema.marks.underline),
  'Mod-e': setAlign('center'),
}),
```

(`setAlign` zusätzlich aus `./commands` importieren.) Siehe Abschnitt 5.1 für die
Begründung, warum nur `Mod-e` implementiert wird und `Mod-l`/`Mod-r`/`Mod-j`
bewusst den Geschwister-Anforderungen überlassen bleiben.

### 4.4 `src/formats/docx/reader.ts` (geändert)

**a) Erweiterte Stil-Auflösung** (behebt Fehler 6/Grenzfall 1 für DOCX):

`HeadingInfo` (Zeile 48–50) zu `StylesInfo` erweitern:

```ts
interface StylesInfo {
  outlineLvlByStyleId: Map<string, number>
  alignByStyleId: Map<string, string> // bereits auf einen der 4 Schema-Werte normalisiert
}

const MAX_STYLE_CHAIN_DEPTH = 25 // Zyklenschutz, analog MAX_TABLE_NESTING_DEPTH (Zeile 208)
```

`parseStylesXml` (Zeile 52–66) erweitern: zusätzlich zu `outlineLvl` pro Stil auch
ein direktes `w:pPr/w:jc/@w:val` sowie `w:basedOn/@w:val` sammeln, danach die
`w:basedOn`-Kette mit Memoisierung auflösen (direkte Formatierung eines Stils hat
Vorrang vor dem, was er von seinem Elternstil erbt — die Kette wird nur verfolgt,
wenn der Stil selbst kein eigenes `w:jc` hat):

```ts
function resolveStyleAlign(
  styleId: string,
  directJcByStyleId: Map<string, string>,
  basedOnByStyleId: Map<string, string>,
  memo: Map<string, string>,
  depth = 0,
): string | null {
  if (memo.has(styleId)) return memo.get(styleId)!
  if (depth > MAX_STYLE_CHAIN_DEPTH) return null
  const direct = directJcByStyleId.get(styleId)
  if (direct) {
    const resolved = resolveJc(direct, false)
    memo.set(styleId, resolved)
    return resolved
  }
  const parentId = basedOnByStyleId.get(styleId)
  const inherited = parentId
    ? resolveStyleAlign(parentId, directJcByStyleId, basedOnByStyleId, memo, depth + 1)
    : null
  if (inherited) memo.set(styleId, inherited)
  return inherited
}
```

**b) Erweiterte `jc`-Wertetabelle inkl. bidi-bewusster `start`/`end`-Auflösung**
(behebt Fehler 7/Grenzfall 2):

```ts
const JC_TO_ALIGN: Record<string, string> = {
  left: 'left', center: 'center', right: 'right', both: 'justify',
  distribute: 'justify', thaiDistribute: 'justify',
  mediumKashida: 'justify', highKashida: 'justify', lowKashida: 'justify',
}

function resolveJc(jcVal: string, isBidi: boolean): string {
  if (jcVal === 'start') return isBidi ? 'right' : 'left'
  if (jcVal === 'end') return isBidi ? 'left' : 'right'
  return JC_TO_ALIGN[jcVal] ?? 'left' // z. B. numTab: dokumentierter Fallback, kein physisches Äquivalent
}
```

**c) `paragraphToBlocks`** (Zeile 146–152) — direkte Formatierung schlägt Stil:

```ts
const jcEl = pPr && firstChildNS(pPr, OOXML_NAMESPACES.w, 'jc')
const isBidi = !!(pPr && firstChildNS(pPr, OOXML_NAMESPACES.w, 'bidi'))
const directAlign = jcEl ? resolveJc(jcEl.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? 'left', isBidi) : null
const align = directAlign ?? (styleId && stylesInfo.alignByStyleId.get(styleId)) ?? 'left'
```

`paragraphToBlocks`, `parseTable`, `readBodyChildren`, `readDocx` erhalten
`stylesInfo: StylesInfo` statt `headingInfo: HeadingInfo` als durchgereichten
Parameter (bereits bestehende Signaturkette, nur Typ/Name erweitert — kein neuer
Fädelungspfad nötig, exakt wie in `fett-code.md` Abschnitt 4.6 für das analoge
`w:rStyle`-Vorhaben beschrieben).

### 4.5 `src/formats/odt/reader.ts` (geändert)

Behebt Fehler 3 (rohe Durchreichung) und den ODT-Teil von Fehler 6/Grenzfall 1.

**a) Normalisierung statt Rohwert-Durchreichung:**

```ts
const ODF_ALIGN_TO_SCHEMA: Record<string, string> = { left: 'left', center: 'center', right: 'right', justify: 'justify' }

function isRtlParagraphProps(props: Element | null): boolean {
  const writingMode = props?.getAttributeNS(ODF_NAMESPACES.style, 'writing-mode')
  return !!writingMode && writingMode.startsWith('rl')
}

function resolveOdfAlign(raw: string, isRtl: boolean): string {
  if (raw === 'start') return isRtl ? 'right' : 'left'
  if (raw === 'end') return isRtl ? 'left' : 'right'
  return ODF_ALIGN_TO_SCHEMA[raw] ?? 'left' // unbekannter/exotischer Wert: dokumentierter Fallback, nie roh durchreichen
}
```

`parseAutomaticStyles` (Zeile 62–66) ändern:

```ts
} else if (family === 'paragraph') {
  const props = firstChildNS(styleEl, ODF_NAMESPACES.style, 'paragraph-properties')
  const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
  if (align) paragraphAligns.set(name, resolveOdfAlign(align, isRtlParagraphProps(props)))
}
```

**b) Stil-Kaskade** (`office:styles` + `style:parent-style-name`, Zyklenschutz nach
dem bestehenden `MAX_NESTING_DEPTH`-Muster, Zeile 162): `parseAutomaticStyles`
erweitern bzw. um eine zweite Durchlaufstufe ergänzen, die zusätzlich
`office:styles` (Familie `paragraph`) einliest und `style:parent-style-name`
rekursiv aullöst (automatische Stile haben bei Namenskollision Vorrang, da näher am
konkreten Absatz). `readOdt` (Zeile 239 ff.) übergibt dafür zusätzlich das bereits
geladene `<office:styles>`-Element aus `content.xml`/`styles.xml` an die
Stil-Auflösung (analog zu `fett-code.md` Abschnitt 4.8 für Zeichenformatvorlagen —
gleiches Muster, andere Attribut-Familie).

### 4.6 `src/formats/docx/writer.ts`, `src/formats/odt/writer.ts`, `src/formats/odt/styleRegistry.ts` (keine Änderung)

Beide Writer sind für alle vier kanonischen Werte bereits korrekt (Abschnitt 1).
Kein Fix nötig — nur neue Tests (Abschnitt 6), die die jetzt garantiert kanonischen
Reader-Ausgaben (Abschnitt 4.4/4.5) durch den Writer bestätigen.

### 4.7 `src/formats/shared/schema.ts` (geändert, siehe Fehler 9/Abschnitt 2.9)

`paragraph.parseDOM`/`heading.parseDOM` `getAttrs` von `dom.style.textAlign` auf
`getComputedStyle(dom as HTMLElement).textAlign` umstellen:

```ts
parseDOM: [{ tag: 'p', getAttrs: (dom) => ({ align: getComputedStyle(dom as HTMLElement).textAlign || 'left' }) }],
```

(analog für die sechs `hN`-Regeln). **Risikohinweis:** `getComputedStyle` kann außerhalb
eines echten Browser-Renderkontexts (z. B. serverseitig oder in manchen Test-
Umgebungen) leer zurückliefern — siehe Abschnitt 2.9 zur jsdom-Einschränkung. Da
diese Funktion nur im Browser (ProseMirrors Zwischenablage-Erfassung, echtes
`DOMParser`-Parsing eines eingefügten HTML-Fragments) aufgerufen wird, ist das
Risiko im Produktivbetrieb gering, muss aber per E2E (nicht Unit-Test) bestätigt
werden.

---

## 5. Empfehlungen zu den offenen Fragen der Anforderung

### 5.1 Tastenkürzel (Abschnitt 3.10 der Anforderung)

**Entscheidung:** `Mod-e` (Strg+E / Cmd+E) für „Zentriert" wird implementiert
(Abschnitt 4.3). Für die drei anderen Ausrichtungen wird **bewusst kein** Kürzel in
diesem Plan ergänzt, mit folgender, aus tatsächlichem Browser-Verhalten abgeleiteter
Begründung:

- `Strg+E`/`Cmd+E` ist in keinem verbreiteten Desktop-Browser (Chrome, Firefox, Edge,
  Safari) reserviert — funktioniert zuverlässig, sobald der Tastendruck den Editor
  erreicht.
- `Strg+L` ist in Chrome/Firefox/Edge fest für „Adressleiste fokussieren" reserviert
  — ein Web-Frontend (dieses Projekt ist eine reine Vite/React-Webanwendung ohne
  Electron-Wrapper, siehe `package.json`) kann diesen Tastendruck nicht zuverlässig
  abfangen, unabhängig davon, was `keymap()`/`preventDefault()` im Code tun.
- `Strg+R` ist browserweit für „Seite neu laden" reserviert — gleiches Problem.
- `Strg+J` ist in Chrome für „Download-Liste öffnen" reserviert.
- Eine naheliegende Alternative (Google Docs verwendet z. B. `Strg+Umschalt+L/E/R/J`)
  löst das Problem für `L`/`E`/`J` vermutlich, aber `Strg+Umschalt+R` ist in
  Chrome/Firefox ebenfalls für „Hard-Reload ohne Cache" reserviert — die
  Kollisionsfrage lässt sich nicht pauschal für alle vier Tasten gleichzeitig durch
  einfaches Hinzufügen von „Umschalt" lösen und bedarf pro Taste eigener,
  manueller Verifikation in echten Browserfenstern (**nicht** zuverlässig per
  Playwright automatisierbar, da Playwrights `page.keyboard.press(...)` Ereignisse
  auf CDP-Ebene direkt an die Seite liefert und dabei nicht notwendigerweise exakt
  nachbildet, ob ein echter, manuell bedienter Browser den Tastendruck überhaupt an
  die Seite durchlässt oder ihn schon auf Browser-Chrome-Ebene abfängt).
- **Konsequenz:** Diese Entscheidung wird bewusst auf `center` beschränkt (deckungs-
  gleich mit dem fachlichen Fokus dieser Anforderungsdatei) und für die drei
  Geschwister-Ausrichtungen an `ausrichtung-links-req.md`, `ausrichtung-rechts-
  req.md` und `ausrichtung-blocksatz-req.md` (bzw. deren jeweilige `-code.md`-Pläne)
  verwiesen, wo die Kürzelfrage pro Taste einzeln mit echter Browser-Verifikation
  geklärt werden muss. Damit ist Abschnitt 3.10/Abnahmekriterium 5 der Anforderung
  für den hier behandelten Fokus „zentriert" erfüllt: Entscheidung getroffen (`Mod-e`),
  umgesetzt (Abschnitt 4.3) und mit Test abgesichert (Abschnitt 6.1).

### 5.2 Tooltip-Text (Verdachtsmoment 8)

**Entscheidung:** `title="Ausrichtung: Zentriert"` (und analog für die drei anderen
Werte) statt `title="Ausrichtung: center"` — konsistent zur sonst durchgehend
deutschen Beschriftung der App (`Fett`, `Kursiv`, `Unterstrichen`,
`Durchgestrichen`, `Textfarbe`, `Hervorhebungsfarbe`, `Aufzählung`, ...). Umgesetzt
in Abschnitt 4.2 für alle vier Werte gleichzeitig (siehe dortige Begründung, warum
diese risikofreie Änderung nicht auf `center` beschränkt wird).

### 5.3 Icon (Verdachtsmoment 9)

**Entscheidung:** Für `center` wird das Unicode-Zeichen `↔` durch ein kleines
inline-SVG ersetzt (Abschnitt 4.2), da `↔` in vielen UI-Konventionen „verschieben"/
„Breite ändern" statt „zentrieren" bedeutet — das eindeutigste, am weitesten
verbreitete Symbol für Textzentrierung ist die „lang-kurz-lang-kurz,
mittig ausgerichtet"-Balkendarstellung. Die drei Geschwister-Icons (`⇤`, `⇥`, `≡`)
bleiben unangetastet und werden den jeweiligen Geschwister-Anforderungen überlassen
(gleiche Scope-Disziplin wie in `fett-code.md` Abschnitt 4.2/5, das ebenfalls nur das
Fett-Icon ersetzt hat, nicht Kursiv/Unterstrichen/Durchgestrichen).

### 5.4 Stilbasierte Zentrierung aus Fremddateien (Grenzfall 1, Verdachtsmoment 2, Abnahmekriterium 6)

**Entscheidung:** Wird erkannt — siehe Abschnitt 4.4 (DOCX: `w:pStyle` →
`styles.xml`-Kette über `w:basedOn`) und 4.5 (ODT: `style:parent-style-name`-Kette,
inkl. `office:styles`). Direkte Absatzformatierung hat in beiden Formaten Vorrang vor
der Formatvorlage — durch die reale Fixture `bug-paragraph-alignment.docx`
(Abschnitt 2.6) explizit belegtes, gewolltes Word-Verhalten (deren zweiter Absatz
genau diesen Vorrang demonstriert).

### 5.5 RTL/`w:bidi`-Vollunterstützung (nicht Teil dieses Plans)

Explizit **außerhalb** des Umfangs dieses Plans: eine vollständige Umsetzung von
Absatz-Textrichtung (`dir="rtl"` im Editor-DOM, `w:bidi`/ODF `style:writing-mode` als
eigenes Schema-Attribut, Zeichen-Shaping) ist ein eigenständiges, deutlich größeres
Feature. Dieser Plan behebt ausschließlich die enger gefasste Lücke, dass die
**horizontale physische Ausrichtung** (`start`/`end` → `left`/`right`) unter
Berücksichtigung des bereits vorhandenen `w:bidi`-Flags korrekt aufgelöst wird
(Abschnitt 4.4b) — unabhängig davon, ob die Zeile selbst später korrekt von rechts
nach links dargestellt wird. Empfehlung: als eigenständiges Backlog-Item
("RTL-Absatzrichtung") vermerken, referenziert über `rtl.docx` als bereits
vorhandene Test-Fixture.

---

## 6. Testplan

### 6.1 Neue Datei: `tests/e2e/alignment.spec.ts` (neu)

Struktur analog zu `tests/e2e/docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`
(`docxCard`/`odtCard`-Helfer wiederverwenden). Je ein Test pro Punkt (Auswahl der
wichtigsten, vollständige Zuordnung zu Abschnitt 7 der Anforderung in Abschnitt 7
dieses Plans):

1. Cursor ohne Selektion in einen Absatz setzen → `getByTitle('Ausrichtung:
   Zentriert').click()` → `expect(p).toHaveCSS('text-align', 'center')` und
   `aria-pressed="true"`.
2. Text markieren (Maus-Ziehen via `page.mouse`, Doppelklick, Dreifachklick,
   `ControlOrMeta+a`) → jeweils identisches Ergebnis nach Klick auf „Zentriert".
3. **Regressionstest für Fehler 1 (Abschnitt 2.1):** Drei Absätze mit
   unterschiedlicher Ausgangsausrichtung anlegen, `ControlOrMeta+a`, „Zentriert"
   klicken → **alle drei** `<p>` haben `text-align: center` (nicht nur der erste) —
   und die Seite wirft keinen unbehandelten Fehler (`page.on('pageerror', ...)`
   registrieren und am Testende `expect(errors).toHaveLength(0)` prüfen).
4. Direkt danach ein einziges `ControlOrMeta+z` → alle drei Absätze zurück auf ihre
   jeweilige Ausgangsausrichtung (Nachweis: ein Klick = ein Undo-Schritt, sobald
   Fehler 1 behoben ist).
5. Erneuter Klick auf bereits aktives „Zentriert" → keine Zustandsänderung; zweites
   `ControlOrMeta+z` direkt danach führt zurück zum Zustand **vor** dem ursprünglichen
   Zentrieren (Nachweis, dass der erneute Klick keine leere Undo-Stufe erzeugt hat —
   Grenzfall 12).
6. „Links"/„Rechts"/„Blocksatz" auf zentrierten Absatz → ersetzt Zentrierung korrekt.
7. `aria-pressed="true"` bei Cursor in zentriertem Text ohne Selektion.
8. **Regressionstest für Fehler 4 (Abschnitt 2.4):** Zwei Absätze, einer zentriert,
   einer linksbündig, beide markiert → **kein** Ausrichtungs-Button zeigt
   `aria-pressed="true"`.
9. Zentrierung einer Überschrift (Ebene 1–6) → identisch zu Absatz.
10. **Regressionstest für Fehler 2/Kernverdacht 6.1 (Abschnitt 2.2):** Absatz
    zentrieren → Formatvorlagen-Dropdown auf „Überschrift 1" → `text-align: center`
    bleibt erhalten.
11. Umgekehrt: zentrierte Überschrift → Dropdown zurück zu „Standard" → Zentrierung
    bleibt erhalten.
12. Zwischen zwei Überschriftsebenen (Überschrift 1 → Überschrift 3) → Zentrierung
    bleibt erhalten.
13. Tabelle einfügen, Zelle zentrieren → nur diese Zelle betroffen (Nachbarzellen per
    `getByRole`/Zellindex prüfen).
14. Zeile/Spalte zusammenführen (`colspan`/`rowspan`, sofern über bestehende
    Toolbar-Funktion erreichbar) → Zentrierung der verbundenen Zelle funktioniert
    identisch.
15. Bullet-Liste, Zentrierung eines Eintrags → Text zentriert, Aufzählungszeichen
    bleibt an fester Position (visuell/Bounding-Box-Vergleich des `::marker`/`<li>`
    gegenüber dem zentrierten `<p>`).
16. Nummerierte Liste ebenso.
17. Zentrierung + Fett + Schriftfarbe im selben Textlauf → alle drei gleichzeitig
    sichtbar (`getByText(...)` + `toHaveCSS` für `font-weight`, `color`,
    `text-align`).
18. **Regressionstest für Fehler 9 (Abschnitt 2.9):** Echtes Einfügen von
    `<div style="text-align: center"><p>Von außen zentriert</p></div>` über
    `page.evaluate` + `ClipboardEvent`/`DataTransfer` (echter Paste-Event, nicht nur
    `insertHTML`) → resultierender Absatz im Editor hat `text-align: center`. Dieser
    Test läuft **ausschließlich** hier (E2E/echter Browser), da jsdom
    `getComputedStyle`-Vererbung nicht auflöst (Abschnitt 2.9).
19. Leeren Absatz zentrieren, dann tippen → getippter Text erscheint zentriert.
20. Undo direkt nach Zentrieren eines einzelnen Absatzes → zurück zum Vorzustand;
    Redo stellt Zentrierung wieder her.
21. Regressionstest gemäß `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 (Analog zu
    `selection-regression.spec.ts`, aber mit „Zentriert" statt „Fett" als
    auslösende Aktion): „Alles auswählen" → „Zentriert" → per Klick neu
    positionieren → Enter → weitertippen → beide Absätze bleiben erhalten **und**
    zentriert. (Diese Sequenz hätte den behobenen Fehler 1 bereits vor der
    Behebung zuverlässig als Fehlschlag/Exception aufgedeckt, sofern das
    Ausgangsdokument mehr als einen Absatz hatte.)
22. **Reale Fixture, DOCX (Testfall 28):** `bug-paragraph-alignment.docx` per
    `setInputFiles(join(__dirname, '../fixtures/external/docx/bug-paragraph-
    alignment.docx'))` hochladen → unverändert exportieren → resultierendes
    `word/document.xml` per JSZip prüfen: **beide** Absätze enthalten
    `<w:jc w:val="center"/>` bzw. `<w:jc w:val="left"/>` an der jeweils korrekten
    Stelle (der erste Absatz muss nach dem Fix in Abschnitt 4.4 als `center`
    exportiert werden, obwohl die Quelldatei kein direktes `<w:jc>` an diesem
    Absatz hatte — das ist der eigentliche Nachweis, dass die Stilauflösung
    gegriffen hat).
23. **Reale Fixture, ODT (Testfall 29, korrigierter Kandidat gemäß Abschnitt 2.8):**
    `feature_attributes_paragraph_MSO2013.odt` hochladen → unverändert exportieren →
    `content.xml` enthält weiterhin `fo:text-align="center"` für den
    „Center"-Absatz **und** (Regressionstest für Fehler 3) `fo:text-align="right"`
    (nicht mehr `"end"` unverändert durchgereicht, und nicht fälschlich `"left"`)
    für den „Align Text Right"-Absatz.
24. `rtl.docx` hochladen → der Absatz mit `w:bidi="1"`/`jc="start"` wird als
    physisch **rechtsbündig** dargestellt (`toHaveCSS('text-align', 'right')`) —
    Nachweis für Abschnitt 4.4b, ohne Anspruch auf korrekte RTL-Zeilenrichtung
    (Abschnitt 5.5).

### 6.2 Neue Datei: `src/formats/shared/editor/__tests__/commands.test.ts` (neu)

Unit-Tests (Vitest, echte `EditorState`/`EditorView` wie in den Reproduktionen dieses
Plans) für:

- `setAlign`: Einzelabsatz; 3-Absatz-Selektion → alle drei geändert, **kein**
  Throw (Regressionstest für Fehler 1, exakt die in Abschnitt 2.1 gezeigte
  Reproduktion, jetzt als bestehender/grüner statt schlagender Test); No-Op bei
  bereits gesetztem Wert erzeugt keinen weiteren Undo-Schritt (`history()`-Plugin
  + `undoDepth`/manuelles Zählen der `dispatchTransaction`-Aufrufe); ein Klick auf
  eine Mehrabsatz-Selektion ist genau ein `undo()`-Schritt.
- `isAlignActive`: leere Selektion (Vorfahren-Suche unverändert); volle Selektion,
  einheitlich ausgerichtet → `true`; gemischte Selektion → `false` für **alle**
  vier Werte (Regressionstest für Fehler 4); Selektion über eine `image`/`table`
  hinweg (nur die alignierbaren Blöcke zählen).
- `setHeading`: Absatz mit `align: 'center'` → „Überschrift 1" → `align` bleibt
  `'center'` (Regressionstest für Fehler 2, Kernverdacht 6.1); Überschrift 1
  (`center`) → Überschrift 3 → bleibt `center`; Überschrift (`center`) → Standard
  → bleibt `center` (nicht mehr `'left'`).

### 6.3 `src/formats/docx/__tests__/roundtrip.test.ts` (ergänzt)

- Neuer Fall: Absatz mit `w:pStyle` → Stil in `styles.xml` mit `<w:jc
  w:val="center"/>`, kein direktes `w:jc` am Absatz → importiert als `center`
  (synthetischer Nachbau von Befund 2.6, unabhängig von der externen Fixture).
- Neuer Fall: `w:basedOn`-Kette über zwei Ebenen (Stil A erbt von Stil B, nur B hat
  `<w:jc>`) → korrekt aufgelöst; Zyklus (`A basedOn B`, `B basedOn A`) → wirft
  nicht, bricht nach `MAX_STYLE_CHAIN_DEPTH` ab.
- Neuer Fall: `jc="start"`/`jc="end"` mit und ohne `<w:bidi/>` → vier
  Kombinationen, je erwartetes physisches Ergebnis gemäß Abschnitt 4.4b.
- Neuer Fall: `jc="distribute"`/`"thaiDistribute"`/`"mediumKashida"` → `justify`.
- Neuer Fall: zentrierter Absatz **innerhalb** `table_cell` (Testfall 13/32) und
  innerhalb `list_item` (Testfall 15/16/33) → Rundreise erhält `align`.
- Neuer Fall: leerer, zentrierter Absatz (kein Inline-Content) → Rundreise erhält
  `align: 'center'` (Grenzfall 5).
- Neuer Fall: Absatz zentrieren → `setHeading(2)` (bzw. direkter Aufbau des
  entsprechenden JSON) → Export → Reimport → `align` bleibt `center` (Testfall 5
  aus Abschnitt 5 der Anforderung, End-to-End über den vollen Rundreise-Pfad statt
  nur im laufenden Editor-Zustand).

### 6.4 `src/formats/odt/__tests__/roundtrip.test.ts` (ergänzt)

Analog zu 6.3:

- `fo:text-align` nur auf einem per `style:parent-style-name` referenzierten
  Elternstil (nicht auf dem automatischen Stil selbst) → korrekt aufgelöst
  (Regressionstest für den ODT-Teil von Fehler 6, da keine verfügbare externe
  Fixture diesen Fall abdeckt, siehe Abschnitt 2.8).
- `fo:text-align="end"`/`"start"` → korrekt auf `right`/`left` normalisiert
  (Regressionstest für Fehler 3), inkl. `style:writing-mode="rl-tb"`-Variante
  (→ invertiert).
- Zentrierter Absatz in `table_cell`/`list_item` → Rundreise erhält `align`.
- Leerer, zentrierter Absatz → Rundreise erhält `align: 'center'`.
- Formatvorlagen-Wechsel vor Export (analog 6.3 letzter Punkt).

### 6.5 Neue Datei: `src/formats/docx/__tests__/alignment-fixtures.test.ts` (neu)

Dediziert (nicht in `external-fixtures.test.ts` gemischt, das bewusst nur „importiert
ohne Absturz" prüft — gleiches Muster wie `fett-code.md` Abschnitt 6.5):

- `bug-paragraph-alignment.docx`: Absatz 1 → `align: 'center'` (Regressionstest für
  Befund 2.6, **muss vor dem Fix in Abschnitt 4.4 nachweislich fehlschlagen** —
  vorher: `'left'`); Absatz 2 → `align: 'left'` (direkte Formatierung schlägt
  weiterhin durch, unverändert korrekt).
- `rtl.docx`: betroffener Absatz → `align: 'right'` (Regressionstest für Befund 2.7).
- `table-alignment.docx`: dokumentierender Test, **kein** `table_cell`-Absatz hat
  einen von `'left'` abweichenden `align`-Wert (bestätigt Befund 2.8 — diese Datei
  eignet sich nachweislich nicht für Zentrierungs-Tests, verhindert künftiges
  versehentliches Wiederverwenden als „Ausrichtungs-Fixture").

### 6.6 Neue Datei: `src/formats/odt/__tests__/alignment-fixtures.test.ts` (neu)

- `feature_attributes_paragraph_MSO2013.odt`: „Center"-Absatz → `align: 'center'`;
  „Align Text Right"-Absatz → `align: 'right'` (**muss vor dem Fix in Abschnitt 4.5
  nachweislich fehlschlagen** — vorher: `'end'`); „Justify"-Absatz → `align:
  'justify'`.
- `CharacterParagraphFormat.odt`: dokumentierender Test, **keiner** der Absätze hat
  ein von `'left'` abweichendes `align` (bestätigt Befund 2.8).

### 6.7 Neue Datei: `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts` (neu, oder erweitert, falls durch `fett-code.md`s gleichnamigen Vorschlag bereits angelegt)

`readDocx(writeDocx(doc))` → `readOdt(writeOdt(Ergebnis))` (und umgekehrt) für ein
Dokument mit zentriertem Absatz kombiniert mit Fett/Farbe/Überschrift-Ebene 2 →
`align === 'center'` bleibt über beide Konvertierungsrichtungen hinweg erhalten
(Testfall 25–27 der Anforderung, Grenzfall/Rundreise-Punkt 7).

---

## 7. Zuordnung zu den Abnahmekriterien (Abschnitt 8 der Anforderung)

| DoD-Punkt | Abdeckung durch diesen Plan |
|---|---|
| 1. Alle Testfälle aus Abschnitt 7 real ausgeführt und dokumentiert | Abschnitt 6.1 (E2E, `alignment.spec.ts`) + 6.2–6.6 (Unit/Fixture) dieses Plans; Ergebnis-Dokumentation erfolgt bei Ausführung (dieser Plan legt nur die Testfälle fest, siehe Vollzugs-Hinweis Kopf des Dokuments) |
| 2. Jedes Verdachtsmoment aus Abschnitt 6 explizit eingestuft | Abschnitt 2 dieses Plans: 1→Fehler 2 (bestätigt+behoben), 2→Fehler 6 (bestätigt+behoben), 3→Fehler 7 (bestätigt+behoben), 4→Fehler 1 (bestätigt als **schwerwiegender** als vermutet+behoben), 5→Fehler 4 (bestätigt+behoben), 6→Abschnitt 5.1 (Entscheidung: `Mod-e` implementiert, Rest bewusst zurückgestellt+begründet), 7→Fehler-Liste 2.5-Umfeld (behoben), 8→Abschnitt 5.2 (entschieden+behoben), 9→Abschnitt 5.3 (entschieden+behoben), 10→Abschnitt 6.1 (E2E neu angelegt), 11→Abschnitt 6.3/6.4 (Tabellen/Listen/Formatvorlagen-Wechsel-Tests ergänzt) |
| 3. Mind. ein E2E-Test dauerhaft verankert, inkl. Formatvorlagen-Wechsel-Regressionstest | Abschnitt 6.1, Punkte 10–12 |
| 4. Rundreise DOCX+ODT, Cross-Format, Tabellen, Listen, je eine reale externe Testdatei | Abschnitt 6.1 Punkte 22–24, Abschnitt 6.3/6.4 (Tabellen/Listen), Abschnitt 6.7 (Cross-Format) — inkl. der in Abschnitt 2.8 korrigierten Fixture-Auswahl |
| 5. Tastenkürzel-Entscheidung getroffen/umgesetzt oder begründet zurückgestellt | Abschnitt 5.1 |
| 6. Stilbasierte Zentrierung bewusst entschieden/dokumentiert | Abschnitt 5.4 |

---

## 8. Reihenfolge der Umsetzung (Vorschlag)

1. **`commands.ts`** (Abschnitt 4.1) — behebt den kritischen Fehler 1 (Crash bei
   Mehrabsatz-Selektion) zuerst, da er die meisten nachgelagerten Tests blockiert
   (ohne diesen Fix schlägt praktisch jeder Mehrabsatz-Test in Abschnitt 6 fehl,
   inklusive des bereits bestehenden Regressionsmusters aus
   `selection-regression.spec.ts`, sobald es auf „Zentriert" übertragen wird).
2. `commands.test.ts` (Abschnitt 6.2) unmittelbar danach, um Fehler 1/2/4 dauerhaft
   abzusichern, bevor an der Oberfläche weitergearbeitet wird.
3. **`Toolbar.tsx` + `WordEditor.tsx`** (Abschnitt 4.2/4.3) — behebt Fehler 5, die
   Verdachtsmomente 6–9, macht das Feature erstmals per Tastatur und mit
   korrektem deutschen Tooltip/Icon bedienbar.
4. `alignment.spec.ts` Punkte 1–21 (Abschnitt 6.1) — sichert 1–3 auf Browser-Ebene ab,
   bevor die größeren Import/Export-Änderungen angegangen werden.
5. **`docx/reader.ts`** (Abschnitt 4.4) und **`odt/reader.ts`** (Abschnitt 4.5) —
   größte inhaltliche Änderungen (Stil-Kaskaden, Wertetabellen), eigene Testrunde
   6.3/6.4/6.5/6.6 direkt im Anschluss an jede der beiden Dateien.
6. **`schema.ts`** (Abschnitt 4.7) — unabhängig von 5, kann parallel erfolgen; Test
   ausschließlich über `alignment.spec.ts` Punkt 18 (E2E), da jsdom-seitig nicht
   verifizierbar (Abschnitt 2.9).
7. `alignment.spec.ts` Punkte 22–24 (reale Fixtures) + `cross-format-
   roundtrip.test.ts` (Abschnitt 6.7) — Abschluss, setzt 5 vollständig voraus.
8. Abschließend: `ausrichtung-zentriert-req.md` um die in Abschnitt 5 dieses Plans
   getroffenen Entscheidungen ergänzen (Tastenkürzel, Tooltip-Text, Icon,
   stilbasierte Zentrierung) — dieser Plan ändert die Anforderungsdatei selbst
   nicht, siehe `fett-code.md`-Präzedenzfall.
