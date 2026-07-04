# Durchgestrichen — dateigenauer Umsetzungsplan

Gegenstück zu `specs/durchgestrichen-req.md`. Dieses Dokument beschreibt, nach
tatsächlicher Codelektüre (nicht nur Backlog-/Anforderungsangabe), was am bestehenden
Code zu ändern ist, welche Dateien neu angelegt werden, und wie die in der Anforderung
geforderte Verifikation technisch umgesetzt wird. Stil und Gliederung folgen bewusst
`specs/unterstrichen-einfach-code.md` (nächstverwandtes, bereits geprüftes Feature),
damit beide Pläne vergleichbar bleiben.

## 0. TL;DR

Schema, Toolbar-Button, DOCX-/ODT-Reader/Writer für „Durchgestrichen" existieren und
funktionieren im Kern. Die Anforderungsdatei benennt jedoch drei **echte, im Code
bestätigte Defekte/Lücken**, die in dieser Umsetzung behoben werden:

1. **`src/formats/docx/reader.ts:106`** — `<w:strike>` wird unabhängig von `w:val`
   als „durchgestrichen" gewertet. Ein Import von `<w:strike w:val="0"/>` (geerbte
   Formatierung lokal ausgeschaltet) markiert Text fälschlich als durchgestrichen.
   **Echter Bug, wird gefixt** (Grenzfall 1 / Verdachtsmoment 1).
2. **`src/formats/shared/editor/Toolbar.tsx:42`** (`MarkButton`) — `aria-pressed`
   wird ausschließlich aus `$from.marks()` berechnet, ignoriert den Rest einer
   mehrteiligen Selektion. Betrifft **alle vier** Buttons (Fett/Kursiv/Unterstrichen/
   Durchgestrichen), da sie dieselbe Komponente teilen. **Wird gefixt** (Grenzfall 11 /
   Verdachtsmoment 5), mit einer neuen, dokumentierten Anzeige-Konvention.
3. **`src/formats/shared/editor/WordEditor.tsx`** — kein Tastenkürzel für
   Durchgestrichen. Die Anforderung verlangt eine **getroffene, umgesetzte
   Entscheidung** (Abschnitt 3.6), nicht nur Feststellung. **Entscheidung: `Mod-Shift-x`
   wird ergänzt.**

Zusätzlich beim Audit gefunden, **nicht** in der Ist-Zustand-Tabelle der Anforderung
erwähnt:

4. **`src/formats/docx/writer.ts`** (`runPropertiesXml`) — die Reihenfolge der
   erzeugten `<w:rPr>`-Kindelemente folgt der UI-Spalten-Reihenfolge
   (`b, i, u, strike, color, shd`), nicht der von ECMA-376 (§17.3.2.28, `CT_RPr`)
   vorgeschriebenen `xsd:sequence` (`b, i, strike, color, highlight, u, ...`). Der
   eigene Reader liest ordnungsunabhängig (per Tag/Namespace, nicht Position) und
   bemerkt das daher nie — genau die in Anforderungsabschnitt 5 Punkt 8 beschriebene
   Gefahr „Schreib- und Lesefehler gleichen sich gegenseitig unsichtbar aus". Eine
   strikte OOXML-Schemaprüfung (in Anforderung 5.8 explizit als Validierungsoption
   genannt) würde die aktuelle Reihenfolge als ungültig zurückweisen. **Wird gefixt**,
   weil unmittelbar an der `<w:strike/>`-Position hängend.

Alle übrigen in Abschnitt 4/6 der Anforderung benannten Grenzfälle/Verdachtsmomente
sind **keine Bugs**, sondern entweder bereits korrektes Bibliotheksverhalten (nur
Test nötig) oder bewusste, zu dokumentierende Fallback-Entscheidungen (kein
Codewechsel nötig). Siehe Abschnitt 3 im Detail.

Der weit überwiegende Teil des Aufwands ist wie beim Schwesterfeature **neue
Testabdeckung**: gezielte Unit-Tests für Fremddatei-Grenzfälle (inkl. zwei echten
ODT-Fixtures mit `single`/`double`/`none`-Durchstreichung, die im vorhandenen Korpus
gefunden wurden) sowie ein komplett neuer E2E-Test über echte Browser-Bedienung.

---

## 1. Methodik dieser Prüfung

Gelesen wurden: `src/formats/shared/schema.ts`, `src/formats/shared/editor/Toolbar.tsx`,
`src/formats/shared/editor/WordEditor.tsx`, `src/formats/shared/editor/commands.ts`,
`src/formats/docx/{reader,writer,xmlUtil}.ts`, `src/formats/odt/{reader,writer,
styleRegistry,xmlUtil}.ts`, beide `__tests__/roundtrip.test.ts`, beide
`__tests__/external-fixtures.test.ts`, `src/formats/odt/__tests__/zzz-probe.test.ts`,
`tests/e2e/{docx,odt,selection-regression}.spec.ts`, `FEATURE-SPEC-DOCX-ODT.md`
(Abschnitte 3, 17, 18–20), `FEATURE-BACKLOG.md` sowie zum Vergleich
`specs/unterstrichen-einfach-code.md`. Zusätzlich wurde `prosemirror-commands`
(`toggleMark`, Zeile 679–734) und `prosemirror-model` (`Mark.addToSet`, Zeile 439ff.,
`Node.rangeHasMark`, Zeile 1386) im Quellcode geprüft, um Abschnitt 3.3/3.4 der
Anforderung sowie Grenzfall 11 auf Codeebene zu bewerten statt zu vermuten. Der
gesamte Fixture-Korpus (`tests/fixtures/external/{docx,odt}`, 127 bzw. 202 Dateien)
wurde programmatisch nach `w:strike`/`w:dstrike` bzw. `text-line-through-style`
durchsucht (Ergebnis: Abschnitt 6).

---

## 2. Ist-Zustand nach Codelektüre — Abgleich mit der Anforderungstabelle

| Fundstelle laut Anforderung | Verifiziert im Code | Abweichung? |
|---|---|---|
| `schema.ts` Mark `strike`, `parseDOM: [{tag:'s'},{tag:'strike'},{style:'text-decoration=line-through'}]`, `toDOM → ['s',0]` (Zeile 128–133) | Ja, exakt so | keine |
| `Toolbar.tsx` `MarkButton` mit `mark="strike"`, `label="S"`, `title="Durchgestrichen"`, `glyphClassName="line-through"` (Zeile 138) | Ja, exakt so | keine |
| `WordEditor.tsx` Keymap ohne Strike-Eintrag (Zeile 71–79) | Ja, bestätigt — nur `Mod-b`/`Mod-i`/`Mod-u` vorhanden | bestätigt, siehe Abschnitt 3.5 |
| `docx/reader.ts:106` `if (firstChildNS(rPr, w, 'strike')) marks.push(...)` — prüft nur Existenz | Ja, exakt so | **bestätigter Bug**, siehe Abschnitt 3.1 |
| `docx/writer.ts:24` `if (mark.type === 'strike') props.push('<w:strike/>')`, kein `w:val` | Ja (Writer schreibt bewusst nie `w:val="0"`, das ist korrekt — Default ist „an") | keine inhaltliche Abweichung, aber Positionsproblem, siehe Abschnitt 3.2 |
| `odt/reader.ts:55–56` `style:text-line-through-style !== 'none'` ⇒ Mark | Ja, exakt so | korrekt für Grenzfall 2; ignoriert `text-line-through-type`, siehe Abschnitt 3.3 |
| `odt/writer.ts:31` + `odt/styleRegistry.ts:55` `style:text-line-through-style="solid" style:text-line-through-type="single"` | Ja, exakt so | keine |
| Unit-/Roundtrip-Tests: nur Writer→eigener-Reader, nur isolierte Einzel-Marks pro Lauf | Ja, bestätigt (`roundtrip.test.ts` Zeile 57–78 in beiden Formaten) | bestätigt — keine Tabellen/Listen/Überschriften-Kombination mit Strike |
| E2E-Tests: „Fett" vorhanden, „Durchgestrichen" fehlt | Ja, bestätigt (`docx.spec.ts`/`odt.spec.ts` nutzen nur `getByTitle('Fett')`; `selection-regression.spec.ts` ebenfalls nur „Fett") | bestätigt |

Zusätzlich beim Audit gefunden, **nicht** in der Anforderungstabelle erwähnt:

- `docx/writer.ts` `runPropertiesXml` (Zeile 18–31): Elementreihenfolge verletzt
  `CT_RPr`-Schema-Sequenz — siehe Abschnitt 3.2 (TL;DR Punkt 4).
- `docx/reader.ts` liest `<w:dstrike>` (doppelte Durchstreichung) **nirgends** —
  weder um sie zu erkennen noch um sie abzulehnen. Das ist bereits der in
  Backlog/Anforderung geforderte Fallback („nicht durchgestrichen"), aber bisher
  **nicht kommentiert und nicht getestet** — siehe Abschnitt 3.3.
- `odt/styleRegistry.ts` `TextStyleRegistry.styleNameFor` (Zeile 28–39): identisches
  Härtungsthema wie in `unterstrichen-einfach-code.md` Abschnitt 3.3 beschrieben
  (`JSON.stringify(props)` statt kanonischem Key) — **immer noch nicht angewendet**.
  Für Durchgestrichen genauso folgenlos wie dort analysiert (siehe Abschnitt 3.6).
  Kein erneuter Fix in diesem Plan, nur Bestätigung des bereits bekannten Zustands.
- Reale Testkorpus-Fixtures mit tatsächlicher Durchstreichung wurden gezielt gesucht
  und gefunden (`character-styles.odt`, `feature_attributes_character_MSO15.odt`,
  `listStyleId.odt` — alle aus dem ODF-Toolkit-Korpus) — siehe Abschnitt 6. Im
  DOCX-Korpus (Apache-POI) existiert **keine einzige** Datei mit `w:strike`/
  `w:dstrike` — Grenzfall 1/9 muss daher zwingend über eine handgebaute XML-Datei
  getestet werden, nicht über einen Korpus-Fixture.

---

## 3. Gefundene Defekte / Verbesserungen im bestehenden Code

### 3.1 `src/formats/docx/reader.ts` — `w:val` von `<w:strike>` wird ignoriert (Bug)

Zeile 106, aktuell:

```ts
if (firstChildNS(rPr, OOXML_NAMESPACES.w, 'strike')) marks.push({ type: 'strike' })
```

`w:strike` ist laut ECMA-376 `CT_OnOff` — der Wert kann `"true"`/`"1"`/`"on"`
**oder** `"false"`/`"0"`/`"off"` sein; fehlt `w:val` ganz, gilt „an" (Default lt.
Spezifikation). Der aktuelle Code prüft nur, ob das Element existiert, nie `w:val`.
Eine reale Word-Datei, die eine geerbte Durchstreichung lokal mit
`<w:strike w:val="0"/>` wieder ausschaltet, würde fälschlich als durchgestrichen
importiert — exakt Grenzfall 1 / Verdachtsmoment 1 der Anforderung. Fix:

```ts
/** ECMA-376 `CT_OnOff`: fehlendes `val` ⇒ an; sonst `false`/`0`/`off` (beliebige
 * Groß-/Kleinschreibung) ⇒ aus, alles andere ⇒ an. Betrifft `w:strike`, und —
 * derselbe Elementtyp — auch `w:b`/`w:i` (siehe Empfehlung am Ende dieses Abschnitts). */
function isOnOffEnabled(el: Element | null): boolean {
  if (!el) return false
  const val = el.getAttributeNS(OOXML_NAMESPACES.w, 'val')
  if (val === null) return true
  const normalized = val.trim().toLowerCase()
  return normalized !== 'false' && normalized !== '0' && normalized !== 'off'
}
```

und in `marksFromRunProperties`:

```ts
if (isOnOffEnabled(firstChildNS(rPr, OOXML_NAMESPACES.w, 'strike'))) marks.push({ type: 'strike' })
```

**Empfehlung (optional, gleicher Codepfad, nicht zwingend Teil dieser
Anforderung):** `w:b`/`w:i` (Zeile 102–103) sind ebenfalls `CT_OnOff` und haben
denselben Blindfleck (`<w:b w:val="0"/>` würde heute fälschlich als „fett"
gelesen). Da `isOnOffEnabled` ohnehin neu entsteht, spricht nichts dagegen, sie im
selben Commit auch dort einzusetzen — separates Ticket wäre unverhältnismäßig für
eine Einzeiler-Wiederverwendung. Kein Bestandteil der Abnahmekriterien dieses
Plans, daher nicht in Abschnitt 10 verbindlich aufgeführt.

### 3.2 `src/formats/docx/writer.ts` — `<w:rPr>`-Elementreihenfolge (neuer Fund)

Zeile 18–31, aktuell iteriert `runPropertiesXml` einfach über das `marks`-Array in
der Reihenfolge, in der es ankommt:

```ts
function runPropertiesXml(marks: JsonNode['marks']): string {
  const props: string[] = []
  for (const mark of marks ?? []) {
    if (mark.type === 'strong') props.push('<w:b/>')
    if (mark.type === 'em') props.push('<w:i/>')
    if (mark.type === 'underline') props.push('<w:u w:val="single"/>')
    if (mark.type === 'strike') props.push('<w:strike/>')
    if (mark.type === 'textColor') props.push(`<w:color w:val="${...}"/>`)
    if (mark.type === 'highlight') props.push(`<w:shd .../>`)
  }
  return props.length ? `<w:rPr>${props.join('')}</w:rPr>` : ''
}
```

Weil `prosemirror-model`s `Mark.addToSet` (Zeile 439ff.) Marks beim Anwenden immer
nach Schema-Rang einsortiert (Rang = Deklarationsreihenfolge in `schema.ts`:
`strong, em, underline, strike, textColor, highlight`), kommt das `marks`-Array in
der Praxis **immer** in exakt dieser Reihenfolge an (siehe auch Abschnitt 3.4/3.6)
— das erzeugte XML lautet also stets `b, i, u, strike, color, shd`. Die
tatsächliche, in ECMA-376 §17.3.2.28 (`CT_RPr`, `xsd:sequence`) vorgeschriebene
Reihenfolge ist jedoch `b, i, strike, color, highlight, u, ...` — `u` gehört
**nach** `highlight`, `strike` **vor** `color`. Der eigene Reader bemerkt das nie,
weil `firstChildNS`/`childElements` (Zeile 15–21) ausschließlich nach
Namespace+Lokalname filtern, nie nach Position. Eine strikte Schemaprüfung
(z. B. Open-XML-SDK-Validator — in Anforderung Abschnitt 5 Punkt 8 explizit als
zulässige „unabhängige Prüfung" genannt) würde die aktuelle Ausgabe als ungültig
zurückweisen. Fix — Reihenfolge fest verdrahten statt aus Array-Reihenfolge
abzuleiten:

```ts
function runPropertiesXml(marks: JsonNode['marks']): string {
  const byType = new Map((marks ?? []).map((m) => [m.type, m] as const))
  const props: string[] = []
  // Reihenfolge folgt CT_RPr (ECMA-376 §17.3.2.28), NICHT der Reihenfolge im
  // marks-Array — Word/strikte OOXML-Validatoren werten <w:rPr> als xsd:sequence.
  // Siehe durchgestrichen-code.md Abschnitt 3.2.
  if (byType.has('strong')) props.push('<w:b/>')
  if (byType.has('em')) props.push('<w:i/>')
  if (byType.has('strike')) props.push('<w:strike/>')
  const textColor = byType.get('textColor')
  if (textColor) props.push(`<w:color w:val="${String(textColor.attrs?.color ?? '').replace('#', '')}"/>`)
  const highlight = byType.get('highlight')
  if (highlight) {
    props.push(`<w:shd w:val="clear" w:color="auto" w:fill="${String(highlight.attrs?.color ?? '').replace('#', '')}"/>`)
  }
  if (byType.has('underline')) props.push('<w:u w:val="single"/>')
  return props.length ? `<w:rPr>${props.join('')}</w:rPr>` : ''
}
```

Risikofrei für bestehende Tests: der eigene Reader liest ordnungsunabhängig, alle
`roundtrip.test.ts`-Assertions bleiben unverändert grün. Reine
Schema-Konformitäts-Härtung, keine Verhaltensänderung für dieses Repo selbst.

### 3.3 Doppelte Durchstreichung (`w:dstrike` / `text-line-through-type="double"`) — bewusster Fallback, keine Verhaltensänderung

Bestätigt durch Codelesen **und** durch reale Fixtures (Abschnitt 6):

- **DOCX**: `marksFromRunProperties` (`docx/reader.ts`) fragt nirgends nach
  `<w:dstrike>`. Eine Datei mit **nur** `<w:dstrike/>` (kein `<w:strike>`) landet
  also als „nicht durchgestrichen" — kein Absturz, kein Textverlust, Text bleibt
  vollständig erhalten, nur das Attribut geht verloren. Das ist laut Backlog
  (`durchgestrichen-doppelt`, Status „fehlt") ein zulässiges Fallback-Ergebnis.
- **ODT**: `parseAutomaticStyles` (`odt/reader.ts:55–56`) liest nur
  `text-line-through-style` (`solid`/`none`), nie `text-line-through-type`
  (`single`/`double`). Eine Datei mit `text-line-through-style="solid"
  text-line-through-type="double"` (reale Fixture: `character-styles.odt`, Stil
  `T12`, Text „Lorem ipsum") wird daher **wie einfach durchgestrichen** gelesen —
  exakt der in Verdachtsmoment 6 vermutete Fall, jetzt an einer echten Datei
  bestätigt statt nur spekuliert.

**Entscheidung (verbindlich für diesen Umsetzungsstand, siehe Grenzfall 3 der
Anforderung):** Beide Fallbacks bleiben wie sie sind — kein Datenverlust, kein
Absturz, nachvollziehbares Verhalten. Es wird **kein** neues Schema-Attribut/keine
neue Mark für „doppelt" eingeführt (das wäre der Umfang von
`durchgestrichen-doppelt`, explizit außerhalb dieses Features). Stattdessen:

1. Code-Kommentare an beiden Stellen ergänzen, die die Entscheidung explizit
   festhalten (statt stillschweigend), z. B. in `odt/reader.ts` direkt über
   Zeile 55:

   ```ts
   // Durchgestrichen (durchgestrichen-req.md Grenzfall 3 / Verdachtsmoment 6):
   // `text-line-through-type` ("single" vs. "double") wird bewusst NICHT gelesen.
   // `durchgestrichen-doppelt` ist laut FEATURE-BACKLOG.md nicht im Funktionsumfang;
   // jeder Wert außer "none" kollabiert absichtlich auf die einfache `strike`-Mark.
   // Kein Textverlust, kein Absturz — geprüfter, dokumentierter Fallback (siehe
   // durchgestrichen-code.md Abschnitt 3.3), keine stillschweigende Vereinfachung.
   ```

   und analog in `docx/reader.ts` oberhalb der `strike`-Zeile, dass `w:dstrike`
   bewusst nicht ausgewertet wird.
2. Dedizierte Tests, die dieses Verhalten **feststellen und einfrieren** (siehe
   Abschnitt 5.2) — inkl. der beiden echten ODT-Fixtures mit `double`.

### 3.4 Reihenfolge-Unabhängigkeit beim Kombinieren mit anderen Formaten (Anforderung 3.4) — bereits erfüllt, nur Test nötig

Anforderung 3.4 verlangt, dass die Reihenfolge des Anwendens (erst Fett dann
Durchgestrichen vs. umgekehrt) keinen Unterschied im Ergebnis macht. Das ist durch
`prosemirror-model`s `Mark.addToSet` (siehe Abschnitt 3.2) bereits strukturell
garantiert: Marks werden beim Hinzufügen immer nach Schema-Rang eingeordnet,
unabhängig von der Klickreihenfolge des Menschen. Keine der sechs Marks
(`strong, em, underline, strike, textColor, highlight`) hat ein `excludes` außer
sich selbst (`schema.ts` Zeile 109–148 definiert keine `excludes`-Eigenschaft),
sie schließen sich also gegenseitig nicht aus. **Keine Codeänderung nötig**, nur
ein Test, der das explizit nachweist statt es anzunehmen (siehe Abschnitt 5.2).

### 3.5 `src/formats/shared/editor/WordEditor.tsx` — Tastenkürzel (Entscheidung, Abschnitt 3.6)

**Entscheidung: `Mod-Shift-x` wird ergänzt.** Begründung: Analogie zu
`Mod-b`/`Mod-i`/`Mod-u` (Zeile 76–78) sowie verbreitete Konvention in Google Docs,
Slack, Notion u. a. — von der Anforderung selbst als „gängiger Kandidat" genannt.
`Mod-Shift-x` ist aktuell unbelegt (`Mod-Shift-z` ist bereits Redo, Zeile 74). Fix
in der Keymap (Zeile 71–79):

```ts
keymap({
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
  Enter: splitListItem(wordSchema.nodes.list_item),
  'Mod-b': toggleMark(wordSchema.marks.strong),
  'Mod-i': toggleMark(wordSchema.marks.em),
  'Mod-u': toggleMark(wordSchema.marks.underline),
  // Durchgestrichen (durchgestrichen-req.md Abschnitt 3.6): bewusst entschiedenes
  // Tastenkürzel, analog zu Mod-b/-i/-u und zu Ctrl/Cmd+Shift+X in Google Docs/
  // Slack/Notion. Zuvor unbelegt — siehe Abnahmekriterium 5 der Anforderung.
  'Mod-Shift-x': toggleMark(wordSchema.marks.strike),
}),
```

Der Toolbar-`title="Durchgestrichen"` (Toolbar.tsx Zeile 138) bleibt unverändert
(kein `"(Strg+Umschalt+X)"`-Zusatz im Tooltip-Text) — bewusst minimal-invasiv,
analog zur Entscheidung im Unterstrichen-Plan, den Titel nicht anzufassen. Ein
`page.getByTitle('Durchgestrichen')` bliebe davon ohnehin unberührt (Playwright
matcht standardmäßig als Teilstring), es wird aber kein Bedarf gesehen, den
Tooltip-Text zu erweitern, solange kein anderer Button im Set das ebenfalls tut.

### 3.6 `src/formats/shared/editor/Toolbar.tsx` — `aria-pressed` nur aus `$from.marks()` (Grenzfall 11)

Zeile 42, aktuell:

```ts
const active = markType.isInSet(view.state.selection.$from.marks()) !== undefined
```

Das betrachtet ausschließlich die Marks an `$from` (Selektionsanfang), nie den Rest
einer mehrteiligen Selektion. Bei einer Selektion, die vorne durchgestrichen
beginnt, aber überwiegend normal ist, zeigt der Button „aktiv", obwohl ein Klick
laut Abschnitt 3.3 der Anforderung (`toggleMark`s Default-Verhalten,
`removeWhenPresent: true`, siehe `prosemirror-commands` Zeile 679–734) de facto
**die gesamte Selektion entfernt** — korrekt für „aktiv"-Anzeige, aber der
umgekehrte Fall (hinten durchgestrichen, `$from` normal) zeigt „inaktiv", obwohl
ein Klick ebenfalls **alles entfernen** würde (da irgendwo in der Selektion die
Mark vorkommt) — der Button zeigt dann fälschlich an, ein Klick würde
„hinzufügen".

**Entscheidung (verbindliche Anzeige-Konvention für Grenzfall 11):** `aria-pressed`
muss dieselbe Bedingung abbilden, die `toggleMark` tatsächlich zum Entfernen
veranlasst — „irgendwo in der Selektion vorhanden" (dieselbe Semantik wie
`removeWhenPresent: true`), nicht „einheitlich in der ganzen Selektion vorhanden".
Die Alternative („nur aktiv, wenn *überall* vorhanden") würde einen schlimmeren
Widerspruch erzeugen: der Button zeigt „inaktiv", obwohl ein Klick trotzdem
**entfernt** statt hinzufügt. Diese Wahl hält Anzeige und tatsächliches
Klickergebnis konsistent — das ist der in der Anforderung geforderte
„nachvollziehbare" Zustand.

Neuer, wiederverwendbarer Helper in `src/formats/shared/editor/commands.ts`
(betrifft **alle vier** `MarkButton`-Instanzen — Fett/Kursiv/Unterstrichen/
Durchgestrichen — gleichermaßen, da sie dieselbe Komponente teilen; siehe TL;DR
Punkt 2):

```ts
import type { MarkType } from 'prosemirror-model'

/**
 * Ob `markType` im Toolbar-Button als "aktiv" angezeigt werden soll.
 * Leere Selektion (Cursor): reflektiert `storedMarks` (an der Schreibmarke
 * vorgemerkter, noch nicht getippter Zustand) bzw. die Marks an der Schreibmarke —
 * unverändert zum bisherigen Verhalten.
 * Nicht-leere Selektion: aktiv, wenn die Mark *irgendwo* in der Selektion
 * vorkommt (`rangeHasMark` über jeden Eintrag von `selection.ranges` — dieselbe
 * Pro-Range-Definition, die `toggleMark`s Default `removeWhenPresent: true`
 * intern verwendet, siehe `prosemirror-commands`). Dadurch zeigt der Button immer
 * exakt an, was ein Klick als Nächstes tun wird: "aktiv" ⇒ Klick entfernt aus der
 * gesamten Selektion; "inaktiv" ⇒ Klick wendet auf die gesamte Selektion an
 * (siehe durchgestrichen-code.md Abschnitt 3.6 / Grenzfall 11 der Anforderung).
 */
export function markActive(state: EditorState, markType: MarkType): boolean {
  const { $from, empty, ranges } = state.selection
  if (empty) return !!markType.isInSet(state.storedMarks || $from.marks())
  return ranges.some(({ $from: rf, $to: rt }) => state.doc.rangeHasMark(rf.pos, rt.pos, markType))
}
```

`Toolbar.tsx` `MarkButton` (Zeile 41–42) ändert sich zu:

```ts
const markType = wordSchema.marks[mark]
const active = markActive(view.state, markType)
```

Deckt nebenbei auch `CellSelection` korrekt ab (`ranges` enthält dann einen
Eintrag je selektierter Zelle — dieselbe Struktur, mit der `toggleMark` selbst
arbeitet), ohne dass `Toolbar.tsx` etwas über Tabellen wissen muss.

---

## 4. Dateigenauer Änderungsplan — bestehende Dateien

| # | Datei | Änderung | Typ |
|---|---|---|---|
| 1 | `src/formats/docx/reader.ts` | `isOnOffEnabled`-Helper + Anwendung auf `<w:strike>` (Abschnitt 3.1); Code-Kommentar zu bewusst nicht gelesenem `w:dstrike` (Abschnitt 3.3) | Fix + Doku |
| 2 | `src/formats/docx/writer.ts` | `runPropertiesXml` auf feste `CT_RPr`-Reihenfolge umstellen (Abschnitt 3.2) | Fix |
| 3 | `src/formats/odt/reader.ts` | Code-Kommentar zu bewusst nicht gelesenem `text-line-through-type` (Abschnitt 3.3) | Doku |
| 4 | `src/formats/shared/editor/commands.ts` | neuer Export `markActive(state, markType)` (Abschnitt 3.6) | Neu (Funktion in bestehender Datei) |
| 5 | `src/formats/shared/editor/Toolbar.tsx` | `MarkButton`: `active`-Berechnung auf `markActive(...)` umstellen (Abschnitt 3.6) | Fix |
| 6 | `src/formats/shared/editor/WordEditor.tsx` | Keymap-Eintrag `'Mod-Shift-x': toggleMark(wordSchema.marks.strike)` + Entscheidungs-Kommentar (Abschnitt 3.5) | Neu (Zeile in bestehender Datei) |
| 7 | `src/formats/shared/schema.ts` | **Keine funktionale Änderung.** Mark `strike` ist bereits korrekt (Zeile 128–133) | — |
| 8 | `src/formats/odt/writer.ts` | **Keine Änderung.** Schreibt bereits korrekt `style:text-line-through-style="solid" style:text-line-through-type="single"` | — |
| 9 | `src/formats/odt/styleRegistry.ts` | **Keine Änderung in diesem Plan.** Bekanntes, weiterhin folgenloses Härtungsthema aus `unterstrichen-einfach-code.md` §3.3 (siehe Abschnitt 3 oben) | — |

Es wird **keine neue Command-Abstraktion** für das Toggle selbst eingeführt:
Toolbar und Keymap rufen beide direkt `toggleMark(wordSchema.marks.strike)` auf —
identisch zum Muster bei Fett/Kursiv/Unterstrichen. Die einzige neue
Code-Abstraktion ist `markActive` für die Anzeige (Punkt 4/5 oben), die kein
Toggle-Verhalten ändert, sondern nur die Button-Optik.

---

## 5. Neue Dateien

### 5.1 Unit-Tests (Vitest, `jsdom`)

**Neu: `src/formats/docx/__tests__/strike.test.ts`**

Dedizierte Reader-Tests für Grenzfall 1/3/9 der Anforderung, die
`roundtrip.test.ts` bewusst nicht abdeckt (der eigene Writer erzeugt nie
`w:val="0"` oder `w:dstrike`). Aufbau analog zum `buildSampleDocx`-Muster aus
`tests/e2e/docx.spec.ts`:

```ts
import JSZip from 'jszip'
import { readDocx } from '../reader'

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'

async function buildDocxWithRun(rPrInner: string): Promise<Blob> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `</Types>`,
  )
  zip
    .folder('_rels')!
    .file(
      '.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
        `</Relationships>`,
    )
  zip
    .folder('word')!
    .file(
      'document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NS}><w:body>` +
        `<w:p><w:r><w:rPr>${rPrInner}</w:rPr><w:t>Text</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
    )
  return new Blob([await zip.generateAsync({ type: 'nodebuffer' })])
}

describe('DOCX reader: <w:strike> w:val handling (Grenzfall 1 / Verdachtsmoment 1)', () => {
  it.each([
    ['<w:strike/>', true], // bare element, kein w:val ⇒ an (ECMA-376 Default)
    ['<w:strike w:val="true"/>', true],
    ['<w:strike w:val="1"/>', true],
    ['<w:strike w:val="on"/>', true],
    ['<w:strike w:val="false"/>', false], // Grenzfall 1 — bisher fälschlich "true"
    ['<w:strike w:val="0"/>', false], // Grenzfall 1 / Testfall 25
    ['<w:strike w:val="off"/>', false],
    ['<w:strike w:val="FALSE"/>', false], // Groß-/Kleinschreibung
  ])('%s → strike mark present: %s', async (rPr, expectStrike) => {
    const blob = await buildDocxWithRun(rPr)
    const result = await readDocx(blob)
    const run = (result.body as any).content[0].content[0]
    expect((run.marks ?? []).some((m: any) => m.type === 'strike')).toBe(expectStrike)
  })
})

describe('DOCX reader: <w:dstrike> fallback (Grenzfall 3 / Verdachtsmoment 6)', () => {
  it('a run with only <w:dstrike/> (no <w:strike>) imports as plain text, no crash, no text loss (documented fallback)', async () => {
    const blob = await buildDocxWithRun('<w:dstrike/>')
    const result = await readDocx(blob)
    const run = (result.body as any).content[0].content[0]
    expect(run.text).toBe('Text')
    expect((run.marks ?? []).some((m: any) => m.type === 'strike')).toBe(false)
  })
})
```

**Neu: `src/formats/odt/__tests__/strike.test.ts`**

Analog für ODT, **plus** Assertions gegen zwei echte, im Korpus gefundene
Fixtures (Abschnitt 6) statt nur synthetischer Daten:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readOdt } from '../reader'

const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/odt')

async function loadFixture(name: string) {
  const buffer = readFileSync(join(FIXTURES_DIR, name))
  return readOdt(new Blob([buffer]))
}

function allTextWithMarks(node: any, out: any[] = []): any[] {
  if (node.type === 'text') out.push({ text: node.text, marks: node.marks })
  ;(node.content ?? []).forEach((n: any) => allTextWithMarks(n, out))
  return out
}

describe('ODT reader: real-world strikethrough fixtures (odftoolkit corpus)', () => {
  it('character-styles.odt: single ("T11") and double ("T12") strikethrough both read as struck-through; "none" ("T13") does not (Grenzfall 2/3, Testfall 26/27)', async () => {
    const doc = await loadFixture('character-styles.odt')
    const runs = allTextWithMarks(doc.body as any)
    const struck = runs.filter((r) => (r.marks ?? []).some((m: any) => m.type === 'strike')).map((r) => r.text)
    const plain = runs.filter((r) => !(r.marks ?? []).some((m: any) => m.type === 'strike')).map((r) => r.text)
    // Beide "Lorem ipsum"-Läufe (T11 = single, T12 = double) sind bewusst identisch
    // als "durchgestrichen" erkannt (siehe durchgestrichen-code.md Abschnitt 3.3) —
    // "double" kollabiert absichtlich auf "single", kein Absturz, kein Textverlust.
    expect(struck.filter((t) => t === 'Lorem ipsum').length).toBe(2)
    expect(plain).toContain('lor sit') // T13, style="none"
  })

  it('feature_attributes_character_MSO15.odt: same single/double/none pattern from a different real-world export', async () => {
    const doc = await loadFixture('feature_attributes_character_MSO15.odt')
    const runs = allTextWithMarks(doc.body as any)
    const struckCount = runs.filter((r) => (r.marks ?? []).some((m: any) => m.type === 'strike')).length
    expect(struckCount).toBeGreaterThan(0)
  })
})

describe('ODT reader: explicit style:text-line-through-style="none" (Grenzfall 2)', () => {
  it('text with style:text-line-through-style="none" is not marked struck-through (confirmed via existing fixtures with mixed solid/none runs)', async () => {
    // compdocfileformat.odt, excelfileformat.odt, HeaderFooter.odt, OOStyledTable.odt
    // u. a. enthalten ausschließlich text-line-through-style="none" — Regressionsnetz:
    // keine dieser Dateien darf irgendeine strike-Mark erzeugen.
    for (const name of ['compdocfileformat.odt', 'excelfileformat.odt', 'HeaderFooter.odt']) {
      const doc = await loadFixture(name)
      const runs = allTextWithMarks(doc.body as any)
      expect(runs.some((r) => (r.marks ?? []).some((m: any) => m.type === 'strike'))).toBe(false)
    }
  })
})
```

(Fixture-Werte wurden vor dem Schreiben dieses Plans per Skript aus dem
`content.xml` der genannten Dateien extrahiert — siehe Abschnitt 6 — die konkreten
Textinhalte `"Lorem ipsum"`/`"lor sit"` und Stilnamen `T11`/`T12`/`T13` sind
bestätigt, nicht angenommen.)

**Neu: `src/formats/shared/editor/__tests__/commands.test.ts`**

Reiner Logik-Test für `markActive` ohne Browser/DOM — konstruiert einen
`EditorState` direkt aus `wordSchema` und prüft Grenzfall 11 isoliert:

```ts
import { EditorState, TextSelection } from 'prosemirror-state'
import { wordSchema } from '../../schema'
import { markActive } from '../commands'

function stateFromParagraphs(...texts: string[]): EditorState {
  const paragraphs = texts.map((t) =>
    wordSchema.nodes.paragraph.create({ align: 'left' }, t ? wordSchema.text(t) : undefined),
  )
  const doc = wordSchema.nodes.doc.create(null, paragraphs)
  return EditorState.create({ doc, schema: wordSchema })
}

describe('markActive (Grenzfall 11 / durchgestrichen-code.md Abschnitt 3.6)', () => {
  it('is false for an empty document / empty selection with no stored marks', () => {
    const state = stateFromParagraphs('')
    expect(markActive(state, wordSchema.marks.strike)).toBe(false)
  })

  it('reflects storedMarks at an empty cursor selection', () => {
    let state = stateFromParagraphs('abc')
    const tr = state.tr.addStoredMark(wordSchema.marks.strike.create())
    state = state.apply(tr)
    expect(markActive(state, wordSchema.marks.strike)).toBe(true)
  })

  it('is true when the mark covers only the START of a mixed selection (previously mis-reported)', () => {
    // "abc" struck through, "def" plain, selection spans both.
    let state = stateFromParagraphs('abcdef')
    const strikeTr = state.tr.addMark(1, 4, wordSchema.marks.strike.create())
    state = state.apply(strikeTr)
    const sel = TextSelection.create(state.doc, 1, 7)
    state = state.apply(state.tr.setSelection(sel))
    expect(markActive(state, wordSchema.marks.strike)).toBe(true)
  })

  it('is true when the mark covers only the END of a mixed selection (the actual bug in the old $from-only logic)', () => {
    // "abc" plain, "def" struck through, selection spans both — $from has NO
    // strike mark here, so the old `$from.marks()`-only check reported "inactive"
    // even though a click would remove strike from the whole selection.
    let state = stateFromParagraphs('abcdef')
    const strikeTr = state.tr.addMark(4, 7, wordSchema.marks.strike.create())
    state = state.apply(strikeTr)
    const sel = TextSelection.create(state.doc, 1, 7)
    state = state.apply(state.tr.setSelection(sel))
    expect(markActive(state, wordSchema.marks.strike)).toBe(true)
  })

  it('is false when no part of the selection has the mark', () => {
    let state = stateFromParagraphs('abcdef')
    const sel = TextSelection.create(state.doc, 1, 7)
    state = state.apply(state.tr.setSelection(sel))
    expect(markActive(state, wordSchema.marks.strike)).toBe(false)
  })
})
```

**Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts`** und
**`src/formats/odt/__tests__/roundtrip.test.ts`**

Die bestehenden Tests prüfen Fett/Kursiv/Unterstrichen/Durchgestrichen nur an
**getrennten** Textläufen (Verdachtsmoment 7). Neue Testfälle, je Datei:

```ts
it('preserves strike combined with bold, italic, and color on the same run (Verdachtsmoment 7)', async () => {
  const original = doc([
    {
      type: 'paragraph',
      attrs: { align: 'left' },
      content: [
        {
          type: 'text',
          text: 'kombiniert',
          marks: [
            { type: 'strong' },
            { type: 'em' },
            { type: 'strike' },
            { type: 'textColor', attrs: { color: '#ff0000' } },
          ],
        },
      ],
    },
  ])
  const result = await roundTrip(original)
  const run = (result.body as any).content[0].content[0]
  expect(run.marks).toEqual(
    expect.arrayContaining([
      { type: 'strong' },
      { type: 'em' },
      { type: 'strike' },
      { type: 'textColor', attrs: { color: '#ff0000' } },
    ]),
  )
  expect(run.marks).toHaveLength(4)
})

it('preserves strike inside a table cell, a list item, and a heading (Abschnitt 3.8)', async () => {
  const original = doc([
    { type: 'heading', attrs: { level: 2, align: 'left' }, content: [{ type: 'text', text: 'Titel', marks: [{ type: 'strike' }] }] },
    {
      type: 'bullet_list',
      content: [{ type: 'list_item', content: [paragraph('Punkt', 'left', [{ type: 'strike' }])] }],
    },
    {
      type: 'table',
      content: [
        {
          type: 'table_row',
          content: [{ type: 'table_cell', attrs: { colspan: 1, rowspan: 1 }, content: [paragraph('Zelle', 'left', [{ type: 'strike' }])] }],
        },
      ],
    },
  ])
  const result = await roundTrip(original)
  const heading = (result.body as any).content[0]
  const listText = (result.body as any).content[1].content[0].content[0].content[0]
  const cellText = (result.body as any).content[2].content[0].content[0].content[0].content[0]
  for (const run of [heading.content[0], listText, cellText]) {
    expect((run.marks ?? []).some((m: any) => m.type === 'strike')).toBe(true)
  }
})

it('order of applying marks does not affect the resulting mark set (Anforderung Abschnitt 3.4)', async () => {
  const boldThenStrike = doc([
    paragraph('x', 'left', [{ type: 'strong' }, { type: 'strike' }]),
  ])
  const strikeThenBold = doc([
    paragraph('x', 'left', [{ type: 'strike' }, { type: 'strong' }]),
  ])
  const [r1, r2] = await Promise.all([roundTrip(boldThenStrike), roundTrip(strikeThenBold)])
  expect((r1.body as any).content[0].content[0].marks).toEqual((r2.body as any).content[0].content[0].marks)
})
```

### 5.2 E2E-Tests (Playwright)

**Neu: `tests/e2e/strike.spec.ts`**

Kernstück dieser Anforderung — analog zu `docx.spec.ts`/`odt.spec.ts`/
`selection-regression.spec.ts` (gleiche `odtCard`/`docxCard`-Locator-Helfer).
Deckt die Testfälle aus Abschnitt 7 sowie die Grenzfälle aus Abschnitt 4 der
Anforderung ab, soweit über die UI erreichbar:

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}

test.describe('Durchgestrichen — Toolbar & Tastatur', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Testfall 1/6: Toolbar-Klick togglet Durchstreichung an und aus', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Testtext')
    await page.keyboard.press('ControlOrMeta+a')
    const button = page.getByTitle('Durchgestrichen')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(editor.locator('s')).toContainText('Testtext')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await expect(editor.locator('s')).toHaveCount(0)
  })

  test('Testfall 32: Strg+Umschalt+X liefert identisches Ergebnis wie Toolbar-Klick (Abschnitt 3.6 Entscheidung)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Kurzform')
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('ControlOrMeta+Shift+x')
    await expect(editor.locator('s')).toContainText('Kurzform')
  })

  test('Testfall 5: Toggle an der Schreibmarke wirkt nur auf neu getippten Text', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('vorher ')
    await page.getByTitle('Durchgestrichen').click()
    await page.keyboard.type('neu')
    await expect(editor.locator('s')).toContainText('neu')
    await expect(editor.locator('s')).not.toContainText('vorher')
  })

  test('Testfall 7 / Grenzfall 5: gemischte Selektion (halb durchgestrichen, halb nicht) entfernt einheitlich (Abschnitt 3.3)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('abcdef')
    // "abc" durchstreichen
    await page.keyboard.press('Home')
    await page.keyboard.press('Shift+Right Shift+Right Shift+Right')
    await page.getByTitle('Durchgestrichen').click()
    // gesamte Zeile selektieren, einmal klicken -> muss alles entfernen (nicht: alles hinzufügen)
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await expect(editor.locator('s')).toHaveCount(0)
  })

  test('Testfall 11: Button-Zustand bei mehrteiliger, gemischter Selektion (Grenzfall 11)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('abcdef')
    await page.keyboard.press('Home')
    for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight')
    await page.getByTitle('Durchgestrichen').click() // "abc" jetzt durchgestrichen
    // Selektion, die hinten (nicht durchgestrichenem "def") beginnt aber komplette Zeile umfasst
    await page.keyboard.press('ControlOrMeta+a')
    await expect(page.getByTitle('Durchgestrichen')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Testfall 8/9: Kombination mit Fett, Kursiv, Schriftfarbe und Unterstrichen gleichzeitig', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Alles')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Fett').click()
    await page.getByTitle('Kursiv').click()
    await page.getByTitle('Unterstrichen').click()
    await page.getByTitle('Durchgestrichen').click()
    const struck = editor.locator('s')
    await expect(struck.locator('u')).toBeVisible()
    await expect(struck.locator('strong, b')).toBeVisible()
  })

  test('Testfall 10: Button zeigt aktiven Zustand, wenn Cursor ohne Selektion in durchgestrichenem Text steht', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Wort')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await page.keyboard.press('Home')
    await expect(page.getByTitle('Durchgestrichen')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Testfall 12: Durchstreichen in Bullet- und nummerierter Liste', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzählung').click()
    await page.keyboard.type('Listenpunkt')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await expect(editor.locator('li s')).toContainText('Listenpunkt')
  })

  test('Testfall 13: Durchstreichen in einer Tabellenzelle ohne Nebenwirkung auf Nachbarzelle', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    const cells = page.locator('.ProseMirror td')
    await cells.nth(0).click()
    await page.keyboard.type('Eins')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await cells.nth(1).click()
    await page.keyboard.type('Zwei')
    await expect(cells.nth(0).locator('s')).toContainText('Eins')
    await expect(cells.nth(1).locator('s')).toHaveCount(0)
  })

  test('Testfall 14: Durchstreichen in Überschriften Ebene 1–6', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    for (const level of [1, 2, 3, 4, 5, 6]) {
      await editor.click()
      await page.keyboard.press('ControlOrMeta+End')
      await page.keyboard.press('Enter')
      await page.getByLabel('Absatzformat').selectOption(String(level))
      await page.keyboard.type(`H${level}`)
      await page.keyboard.press('Home')
      for (let i = 0; i < 2; i++) await page.keyboard.press('Shift+ArrowRight')
      await page.getByTitle('Durchgestrichen').click()
    }
    await expect(editor.locator('h1 s, h2 s, h3 s, h4 s, h5 s, h6 s')).toHaveCount(6)
  })

  test('Testfall 15/16: Undo/Redo direkt nach Anwenden', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Text')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    await expect(editor.locator('s')).toHaveCount(1)
    await page.keyboard.press('ControlOrMeta+z')
    await expect(editor.locator('s')).toHaveCount(0)
    await expect(editor).toContainText('Text')
    await page.keyboard.press('ControlOrMeta+y')
    await expect(editor.locator('s')).toHaveCount(1)
  })

  test('Testfall 17: Paste von extern durchgestrichenem HTML behält die Mark (Grenzfall 6)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.evaluate(() => {
      const pm = document.querySelector('.ProseMirror') as HTMLElement
      const dt = new DataTransfer()
      dt.setData('text/html', '<p>vor <s>gestrichen</s> nach</p>')
      dt.setData('text/plain', 'vor gestrichen nach')
      const evt = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt })
      pm.dispatchEvent(evt)
    })
    await expect(editor.locator('s')).toContainText('gestrichen')
  })

  test('Testfall 33: sehr lange Selektion bleibt performant', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Wort '.repeat(2000))
    const start = Date.now()
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()
    expect(Date.now() - start).toBeLessThan(5000)
    await expect(editor.locator('s').first()).toBeVisible()
  })

  test('Testfall 34: schnelles Mehrfachklicken bleibt konsistent (gerade Anzahl Klicks = Ausgangszustand)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Klicktest')
    await page.keyboard.press('ControlOrMeta+a')
    const button = page.getByTitle('Durchgestrichen')
    await button.click()
    await button.click()
    await button.click()
    await button.click()
    await expect(editor.locator('s')).toHaveCount(0)
    await expect(editor).toContainText('Klicktest')
  })

  test('Grenzfall 4: Toggle im leeren Absatz wirft keinen Fehler', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Durchgestrichen').click()
    await page.keyboard.type('jetzt')
    await expect(editor.locator('s')).toContainText('jetzt')
  })
})

test.describe('Durchgestrichen — Rundreisen (Anforderung Abschnitt 5)', () => {
  test('Rundreise 1/3: DOCX-Eigenrundreise über echte Bedienung', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Durchgestrichener Text')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).toContain('Durchgestrichener Text')
    expect(documentXml).toMatch(/<w:strike\s*\/>/)
  })

  test('Rundreise 2/4: ODT-Eigenrundreise über echte Bedienung', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Durchgestrichener Text')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Durchgestrichen').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).toContain('Durchgestrichener Text')
    expect(contentXml).toContain('style:text-line-through-style="solid"')
  })

  test('Rundreise 23: reale, außerhalb der App erzeugte ODT-Datei mit Durchstreichung importieren, unverändert exportieren, Text+Strike-Zustand identisch', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    const fs = await import('node:fs/promises')
    const buffer = await fs.readFile('tests/fixtures/external/odt/character-styles.odt')
    const input = odtCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'character-styles.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
    await expect(page.locator('.ProseMirror')).toContainText('Lorem ipsum')
    await expect(page.locator('.ProseMirror s')).toContainText('Lorem ipsum')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).toContain('style:text-line-through-style="solid"')
  })

  test('Rundreise 25/Grenzfall 1: reale (handgebaute) DOCX mit <w:strike w:val="0"/> zeigt "nicht durchgestrichen"', async ({ page }) => {
    // handgebaute Minimal-DOCX (siehe strike.test.ts buildDocxWithRun) als Fixture-Buffer
    // hochladen; erwartet: kein <s> im editierten DOM.
  })

  test('Rundreise 5/6: Cross-Format DOCX -> ODT und ODT -> DOCX erhalten den Strike-Zustand', async ({ page }) => { /* ... */ })

  test('Rundreise 7/22: doppelte Cross-Format-Rundreise (DOCX->ODT->DOCX) mit Durchgestrichen + Fett + Farbe kombiniert, kein kumulativer Verlust', async ({ page }) => { /* ... */ })
})
```

**Erweiterung: `tests/e2e/selection-regression.spec.ts`**

Anforderung Abschnitt 3.9 verweist explizit auf die Selection-Sync-Regression aus
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2. Analog zum bestehenden „Fett"-Test, direkt
im selben `describe`-Block ergänzt (nicht neue Datei — dauerhaft neben dem
Bold-Pendant verankert, wie bereits für Unterstrichen empfohlen):

```ts
test('same regression with "Durchgestrichen" instead of "Fett" (Testfall 4 / Abschnitt 3.9)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Durchgestrichen').click()
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
})
```

---

## 6. Fixture-Inventar — reale Dateien für die Rundreise-/Grenzfall-Testfälle

Bestandsaufnahme durch programmatisches Entpacken von
`tests/fixtures/external/{docx,odt}` (siehe Methodik, Abschnitt 1):

**DOCX** (127 Apache-POI-Dateien durchsucht nach `w:strike`/`w:dstrike` in
`word/document.xml`): **keine einzige Treffer-Datei.** Grenzfall 1/9 (Testfall 25)
und Grenzfall 3 (Testfall 27) müssen daher zwingend über handgebautes XML getestet
werden (siehe `strike.test.ts`, Abschnitt 5.1) — es gibt im vorhandenen Korpus
keine reale DOCX mit Durchstreichung. Für die „reale Fremddatei"-Pflicht aus
Anforderung Abschnitt 5 Punkt 9/Testfall 23 (DOCX-Rundreise mit echter,
außerhalb der App erzeugter Datei) fehlt damit ein Korpus-Kandidat — siehe
Vermerk in Abschnitt 9.

**ODT** (202 ODF-Toolkit-Dateien durchsucht nach `text-line-through-style` in
`content.xml`):

| Datei | gefundene `text-line-through-style` | `text-line-through-type` |
|---|---|---|
| `character-styles.odt` | `solid` (×2 Stile: `T11`, `T12`), `none` (`T13`) | `single` (`T11`), `double` (`T12`), `none` (`T13`) |
| `feature_attributes_character_MSO15.odt` | `solid` (`T11`, `T12`), `none` (`T13`) | (kein `type` bei `T11`), `double` (`T12`) |
| `listStyleId.odt` | `solid` | — |
| `compdocfileformat.odt`, `compdocfileformat_shortened.odt`, `excelfileformat.odt`, `groupshape.odt`, `HeaderFooter.odt`, `nestedFrames.odt`, `OOStyledTable.odt`, `test1.odt`, `text-extract.odt`, `_annotation.odt` | ausschließlich `none` | — |

→ `character-styles.odt` ist der **Primär-Fixture** für diese Anforderung: enthält
in einer einzigen, realen (nicht app-eigenen) Datei alle drei relevanten
Zustände (`single`, `double`, `none`) an unterscheidbarem, bekanntem Text
(„Lorem ipsum" ×2, „lor sit"). Deckt Testfall 24 (ODT-Rundreise mit realer
Fremddatei), 26 (explizites „none") und 27 (doppelte Durchstreichung, Fallback)
gleichzeitig ab. `listStyleId.odt` eignet sich als einfacherer Zweit-Fixture ohne
Doppel-Sonderfall.

Diese Dateien wurden bisher nur indirekt über den generischen „importiert ohne
Absturz"-Test in `external-fixtures.test.ts` abgedeckt — mit keiner einzigen
Assertion zum tatsächlichen Vorhandensein/Fehlen der `strike`-Mark. Exakt die in
Anforderungsabschnitt 6/7 kritisierte Lücke, geschlossen durch die neue Datei aus
Abschnitt 5.1.

---

## 7. Unabhängige Parser-Validierung (Rundreise-Anforderung Punkt 8 / DoD Punkt 4)

Wie bereits in `unterstrichen-einfach-code.md` Abschnitt 7 begründet: dieses Repo
ist reines TypeScript/Vite ohne Python-Toolchain. Zwei-stufiger Ansatz, identisch
zum Schwesterfeature:

1. **Automatisiert:** Die Playwright-Tests aus Abschnitt 5.2 prüfen den
   exportierten XML-String direkt per Regex, **ohne** `readDocx`/`readOdt` zu
   verwenden (`expect(documentXml).toMatch(/<w:strike\s*\/>/)` bzw.
   `expect(contentXml).toContain('style:text-line-through-style="solid"')`) —
   das erfüllt „nicht nur mit dem eigenen Reader rückgelesen" für die
   automatisierte Suite.
2. **Manuell, einmalig:** Empfehlung, eine mit dieser App exportierte Test-DOCX/
   -ODT mit `python-docx` bzw. LibreOffice/einem ODF-Validator zu öffnen und das
   Ergebnis in dieser Datei oder `durchgestrichen-req.md` zu vermerken, **bevor**
   der Feature-Status auf „verifiziert" wechselt. Kein Bestandteil der
   automatisierten CI. Der in Abschnitt 3.2 gefixte `<w:rPr>`-Elementreihenfolge-
   Bug erhöht die Erfolgswahrscheinlichkeit dieser manuellen Prüfung gegen einen
   strikten Validator gegenüber dem vorherigen Zustand.

---

## 8. Bewusst nicht geänderter Code (und warum)

- **`schema.ts` Mark `strike`** — bereits korrekt, `parseDOM` deckt `<s>`,
  `<strike>` und CSS `text-decoration: line-through` ab (deckt Grenzfall 6 —
  Copy/Paste externer Quellen — bereits strukturell ab, nur Test fehlte).
- **`odt/writer.ts` / `odt/styleRegistry.ts`** — Ausgabe (`style:text-line-
  through-style="solid" style:text-line-through-type="single"`) ist bereits
  korrekt und exakt das, was Anforderung/Rundreise verlangen.
- **`index.css`** — keine eigene `<s>`/`<u>`-Regel definiert; Browser-Default-
  Rendering von `<s>` (Linie mittig durch die x-Höhe) und `<u>` (Linie an der
  Grundlinie) liegen bereits auf unterschiedlicher Höhe und überlappen nicht —
  Abschnitt 3.5/Grenzfall 7 der Anforderung („beide Linien optisch
  unterscheidbar") ist damit ohne CSS-Zutun erfüllt; nur ein visueller
  Bestätigungstest ist nötig (Testfall 9 in `strike.spec.ts`), keine Änderung.
- **Toolbar-Icon „S"** — keine Änderung. Anders als die reinen Symbol-Icons im
  selben Toolbar (`⌫`, `🖍`, `⊞`, `🖼`, `⇤ ↔ ⇥ ≡` — echte Emoji/Sonderzeichen mit
  Font-Abhängigkeit, das eigentliche Rendering-Risiko aus
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20) ist „S" ein gewöhnlicher
  lateinischer Buchstabe wie „F"/„K"/„U" — in jeder Systemschriftart eindeutig
  von den drei anderen unterscheidbar. Empfehlung: Testfall 31 als
  Playwright-Screenshot-Vergleich (`toHaveScreenshot`) auf die Button-Reihe
  absichern, um das über mehrere CI-Runner/Fonts hinweg zu bestätigen — keine
  Code-Änderung am Icon selbst.
- **`prosemirror-commands` `toggleMark`** — Verhalten bei gemischter Selektion
  (Abschnitt 3.3), bei leerer Selektion/`storedMarks` (Abschnitt 3.2), bei
  mehreren `ranges` einer `CellSelection` (Testfall 13) ist
  Fremdbibliotheks-Standardverhalten, korrekt und muss nur verifiziert, nicht
  implementiert werden.
- **`odt/styleRegistry.ts` Dedup-Key** — siehe Abschnitt 3 (Audit-Fund):
  weiterhin `JSON.stringify(props)` ohne kanonische Feldreihenfolge, aber
  weiterhin folgenlos, weil `Mark.addToSet` die Array-Reihenfolge bereits
  kanonisch hält (Abschnitt 3.4). Kein Fix in diesem Plan.

---

## 9. Offene Abhängigkeiten (nur dokumentieren, kein Code jetzt)

- **`durchgestrichen-doppelt`** (Backlog-Status „fehlt"): Sobald umgesetzt, muss
  entschieden werden, ob eine neue Mark oder ein Attribut auf der bestehenden
  `strike`-Mark verwendet wird. Attribut-Variante würde DOCX-seitig zwischen
  `<w:strike>`/`<w:dstrike>` und ODT-seitig über `style:text-line-through-type`
  (`single`/`double`) unterscheiden — in dem Fall müssen `docx/reader.ts` und
  `odt/reader.ts` aus Abschnitt 3.1/3.3 dieses Plans ohnehin erneut angefasst
  werden. Keine Entscheidung jetzt nötig, nur Weichenstellung vermerkt.
- **`formatierung-loeschen`** (Backlog-Status „fehlt", siehe Anforderung
  Abschnitt 3.7): Sobald implementiert, muss sie `wordSchema.marks.strike` mit in
  ihre Clear-Logik aufnehmen. Kein Code jetzt, da die Zielfunktion nicht
  existiert.
- **Track Changes** (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13, Grenzfall 12 der
  Anforderung): noch nicht begonnen. Sobald umgesetzt, muss die reguläre
  `strike`-Mark visuell von der Lösch-Markierung der Änderungsverfolgung
  (ebenfalls typischerweise durchgestrichen dargestellt) unterscheidbar bleiben
  — z. B. per Farbe/CSS-Klasse auf dem Track-Changes-Rendering, nicht auf
  `<s>` selbst. Keine Implementierung jetzt, nur dokumentierter Vermerk (erfüllt
  damit den in Grenzfall 12 verlangten Nachweis „Abgrenzung ist dokumentiert").
- **Kopf-/Fußzeilen-Bearbeitung** (Grenzfall 8): Aktuell keine UI zum Bearbeiten
  von Header/Footer-Inhalten vorhanden (`src/formats/shared/editor` enthält keine
  Header/Footer-Komponente; Daten existieren nur im Modell/Reader/Writer, siehe
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9). Durchgestrichen in Kopf-/Fußzeile ist
  damit **nicht testbar**, bis diese UI-Lücke geschlossen ist — wie von der
  Anforderung selbst verlangt, hier ausdrücklich vermerkt statt stillschweigend
  ausgelassen.
- **Fehlender DOCX-Korpus-Fixture mit realer Durchstreichung** (Abschnitt 6):
  Für Testfall 23/Rundreise-Anforderung Punkt 9 (reale, außerhalb der App
  erzeugte DOCX mit `w:strike`) enthält der vorhandene Apache-POI-Korpus keine
  Datei. Empfehlung: einmalig eine kleine, mit echtem Microsoft Word erzeugte
  DOCX mit durchgestrichenem Text unter `tests/fixtures/external/docx/`
  ergänzen (Herkunft/Lizenz in `tests/fixtures/external/README.md`
  dokumentieren) — bis dahin deckt `strike.test.ts` (Abschnitt 5.1) den
  DOCX-Grenzfall nur synthetisch ab, das ODT-Pendant ist über
  `character-styles.odt` bereits real abgedeckt.

---

## 10. Abnahme-Mapping (Anforderung Abschnitt 6/7/8 → Testdatei)

| Anforderung | Abgedeckt durch |
|---|---|
| Testfälle 1–17 (Abschnitt 7) | `tests/e2e/strike.spec.ts`, describe „Toolbar & Tastatur" |
| Testfall 4 / Selection-Sync-Regression (Abschnitt 3.9) | `tests/e2e/selection-regression.spec.ts`, neuer Test |
| Testfälle 18–22 (Rundreisen) | `tests/e2e/strike.spec.ts`, describe „Rundreisen" |
| Testfälle 23/24 (reale Fremddatei-Rundreise) | `tests/e2e/strike.spec.ts` (ODT: `character-styles.odt`); DOCX siehe offene Abhängigkeit Abschnitt 9 |
| Testfall 25 (DOCX `w:val="0"`) | `src/formats/docx/__tests__/strike.test.ts` + Fix Abschnitt 3.1 |
| Testfall 26 (ODT `text-line-through-style="none"`) | `src/formats/odt/__tests__/strike.test.ts` |
| Testfall 27 (doppelte Durchstreichung, Fallback) | `src/formats/docx/__tests__/strike.test.ts` + `src/formats/odt/__tests__/strike.test.ts` (echte Fixture `character-styles.odt`) + Doku Abschnitt 3.3 |
| Testfall 28 (E2E über echte Toolbar-Bedienung) | `tests/e2e/strike.spec.ts` — komplett neu, wie in DoD Punkt 3 gefordert |
| Testfall 29/30 (unabhängige Parser-Validierung) | Abschnitt 7 dieses Plans + Fix Abschnitt 3.2 (Schema-Konformität) |
| Testfall 31 (Icon-Rendering) | Abschnitt 8 (Begründung „kein Fund") + empfohlener Screenshot-Test |
| Testfall 32 (Tastenkürzel) | `tests/e2e/strike.spec.ts` + Entscheidung/Fix Abschnitt 3.5 |
| Testfälle 33/34 (Performance, Mehrfachklick) | `tests/e2e/strike.spec.ts` |
| Verdachtsmoment 1 / Grenzfall 1 | Fix Abschnitt 3.1 + Test in `strike.test.ts` |
| Verdachtsmoment 2 (fehlender E2E-Test) | `tests/e2e/strike.spec.ts` (komplette neue Datei) |
| Verdachtsmoment 3 (Tastenkürzel) | Entscheidung + Fix Abschnitt 3.5 |
| Verdachtsmoment 4 (Icon „S") | Abschnitt 8 — bewusst kein Fund, begründet |
| Verdachtsmoment 5 / Grenzfall 11 (`aria-pressed`) | Fix Abschnitt 3.6 + `commands.test.ts` |
| Verdachtsmoment 6 / Grenzfall 3 (doppelte Durchstreichung) | Abschnitt 3.3 (Entscheidung + Doku + Test mit echter Fixture) |
| Verdachtsmoment 7 (nur isolierte Einzel-Marks getestet) | Erweiterung `roundtrip.test.ts` (Abschnitt 5.1) |
| Neuer Fund: `<w:rPr>`-Reihenfolge | Fix Abschnitt 3.2 |
| DoD Punkt 1 (alle Testfälle ausgeführt, dokumentiert) | Diese Tabelle + Testdateien aus Abschnitt 5 |
| DoD Punkt 2 (jedes Verdachtsmoment eingestuft) | Abschnitt 3 dieses Plans (jeweils „bestätigt und behoben" / „bestätigt und bewusst dokumentiert" / „bereits korrekt, nur Test nötig") |
| DoD Punkt 3 (E2E dauerhaft verankert) | `tests/e2e/strike.spec.ts` + Erweiterung `selection-regression.spec.ts` |
| DoD Punkt 4 (Rundreise inkl. realer Fremddatei je Format) | Abschnitt 5.2/6/9 — ODT vollständig über `character-styles.odt`, DOCX synthetisch + offener Vermerk für echte Fremddatei |
| DoD Punkt 5 (Tastenkürzel-Entscheidung getroffen) | Abschnitt 3.5 |
