# Umsetzungsplan: Feature „Fett" — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/fett-req.md`. Dieses Dokument prüft den
**tatsächlichen** Code-Stand gegen jede Behauptung/Anforderung der Spezifikation und
legt fest, welche Dateien wie geändert bzw. neu angelegt werden. Stil orientiert an
`FEATURE-SPEC-DOCX-ODT.md`. Kein Punkt hier ist bereits umgesetzt — dies ist der Plan,
nicht der Vollzug.

---

## 0. Kurzfassung

Der in `fett-req.md` referenzierte Ist-Stand ist in den Zeilenangaben fast überall
exakt (verifiziert, siehe Abschnitt 1). Die tatsächliche Prüfung des Codes deckt aber
**vier neue, in der Anforderung nicht benannte Fehler** auf, die über die dort als
„zu verifizieren" markierten Punkte hinausgehen:

1. **Toolbar-Button „Fett" ist per Tastatur nicht auslösbar** (nur `onMouseDown`,
   kein `onClick`/`onKeyDown`) — verstößt direkt gegen Anforderung Abschnitt 1, Zeile 1.
2. **`aria-pressed`/aktiver Zustand ignoriert `state.storedMarks`** — der Button
   zeigt nach „Fett an der Schreibmarke ohne Selektion" aktivieren fälschlich
   „nicht gedrückt" an, obwohl der nächste Tastendruck fett wird — verstößt gegen
   Abschnitt 2.3.
3. **DOCX-Reader ignoriert `@w:val` an `<w:b>`** — ein expliziter
   Bold-**Aus**-Override (`<w:b w:val="0"/>`, wie ihn Word z. B. für ein bewusst
   nicht-fettes Wort in einer fetten Überschrift schreibt) wird als „fett"
   fehlinterpretiert. Realer Datenverlust-/Fehlinterpretationsfall bei
   Fremddateien, nicht nur ein Grenzfall.
4. **Die in der Anforderung als Ist-Stand zitierte CSS-Regel
   `.ProseMirror h1/h2/h3 { font-weight: 600 }` existiert im Code nicht.** Mit
   Tailwind v4 (`@import 'tailwindcss'`, Preflight aktiv) werden `h1`–`h6` auf
   `font-weight: inherit` zurückgesetzt — im Editor sind Überschriften daher
   vermutlich **gar nicht** fett dargestellt, unabhängig vom `strong`-Mark. Das ist
   die Grundannahme von Abschnitt 2.5 der Anforderung und muss zuerst per Browser-Test
   verifiziert werden, bevor die dortige Design-Frage überhaupt sinnvoll beantwortbar
   ist.

Zusätzlich bestehen zwei Lücken beim Import von Fremddateien mit Zeichenformat-
vorlagen (DOCX `w:rStyle`, ODT gemeinsame Stile in `office:styles`), die Grenzfall
3.10 der Anforderung direkt betreffen, sowie das unverändert offene Icon-Risiko
(Abschnitt 1 Zeile 3 / Abschnitt 20.1 in `FEATURE-SPEC-DOCX-ODT.md`).

---

## 1. Verifikation der Ist-Stand-Tabelle aus `fett-req.md`

| Fundstelle laut Anforderung | Ergebnis der Prüfung |
|---|---|
| `schema.ts:110-115` Mark `strong` | **Bestätigt**, Zeilen exakt. `parseDOM`-Regex `/^(bold\|[5-9]\d{2,})$/` erkennt `bold` sowie dreistellige numerische Werte `500`–`999…`; `499` und darunter korrekt ausgeschlossen. Grenze bei 500 verifiziert durch Lesen der Regex, noch kein Testfall vorhanden. |
| `Toolbar.tsx:135` Button „F" | Bestätigt, Zeile exakt. |
| `Toolbar.tsx:42` `isInSet($from.marks())` | Bestätigt, Zeile exakt. **Aber:** siehe Fehler 2 unten — die Methode ist unvollständig, nicht nur „zu verifizieren". |
| `WordEditor.tsx:76` `Mod-b` | Bestätigt, Zeile exakt. |
| `docx/reader.ts:102` `<w:b/>` → `strong` | Bestätigt, Zeile exakt. **Aber:** kein `@w:val`-Check — siehe Fehler 3. |
| `docx/writer.ts:21` `strong` → `<w:b/>` | Bestätigt, Zeile exakt. |
| `docx/styleDefs.ts:14` Heading-Stil `<w:b/>` | Fast bestätigt — die tatsächliche `<w:b/>`-Deklaration steht in der aktuellen Datei auf **Zeile 17**, nicht 14 (`headingStylesXml()`, `<w:rPr><w:b/>...`). Reine Zeilenverschiebung, keine inhaltliche Abweichung. |
| `odt/reader.ts:51,87` `fo:font-weight="bold"` → `strong` | Bestätigt, beide Zeilen exakt. |
| `odt/writer.ts:28` `strong` → `fo:font-weight="bold"` | Bestätigt, Zeile exakt. |
| `odt/styleRegistry.ts:48` dedupliziertes `style:style` | Bestätigt (Zeile mit den `fo:font-weight="bold" style:font-weight-asian=...`-Attributen). |
| `odt/styleRegistry.ts:89` Heading-Stil `fo:font-weight="bold"` | Bestätigt, Zeile exakt. |
| `index.css` (~Zeile 60) `.ProseMirror h1/h2/h3 { font-weight: 600 }` | **Widerlegt.** Zeile 60 in der tatsächlichen Datei ist `.ProseMirror th { font-weight: 600 }` (Tabellenkopf), nicht `h1`–`h3`. Es existiert **keine** `font-weight`-Regel für `.ProseMirror h1`…`h6` irgendwo im Projekt (`grep -r font-weight src` liefert nur die o. g. Stelle plus die ODT/DOCX-XML-Erzeugung). Siehe Fehler 4. |
| `tests/e2e/docx.spec.ts:60,99`, `odt.spec.ts:44,80` | Bestätigt vorhanden, prüfen ausschließlich per Maus-Klick (`getByTitle('Fett').click()`), nie per Tastenkombination — siehe Testlücken in Abschnitt 6. |
| `tests/e2e/selection-regression.spec.ts` | Bestätigt vorhanden, 3 Tests, „Fett" als auslösender Schritt in allen dreien. Muss unverändert weiterlaufen (siehe Abschnitt 7). |

---

## 2. Gefundene Fehler (priorisiert)

### 2.1 Fehler 1 (hoch): Toolbar-Button nicht per Tastatur auslösbar

**Datei:** `src/formats/shared/editor/Toolbar.tsx`, `MarkButton` (Zeilen 28–62), betrifft
den Fett-Button in Zeile 135 sowie (als Nebenbefund, gleicher Code) Kursiv/
Unterstrichen/Durchgestrichen.

Der Button verdrahtet ausschließlich `onMouseDown`:

```tsx
onMouseDown={(e) => {
  e.preventDefault()
  run(view, toggleMark(markType))
}}
```

Es gibt **keinen** `onClick`-Handler. Ein natives `<button>` löst bei Tastatur-
Aktivierung (Tab-Fokus + Enter/Space) **kein** `mousedown`-Ereignis aus, sondern nur
ein `click`-Ereignis. Ergebnis: Tab zum Button, Enter/Leertaste drücken → **nichts
passiert**. Das verstößt unmittelbar gegen Anforderung Abschnitt 1, Zeile 1: „Muss per
Maus **und** Tastatur (Tab-Fokus + Enter/Space) auslösbar sein".

**Fix:** Toggle-Logik von `onMouseDown` nach `onClick` verschieben; `onMouseDown`
behält nur `e.preventDefault()` (verhindert Fokus-/Selektionsverlust beim Klick).
`onClick` feuert zuverlässig für Maus-Klick **und** Tastatur-Aktivierung, aber nur
**einmal** pro Interaktion (kein Doppel-Toggle, siehe Grenzfall 3.9).

### 2.2 Fehler 2 (hoch): Aktiver Zustand ignoriert `state.storedMarks`

**Datei:** `Toolbar.tsx:42`.

```tsx
const active = markType.isInSet(view.state.selection.$from.marks()) !== undefined
```

`ResolvedPos.marks()` liefert die Marks **im Dokument** an dieser Position gemäß der
ProseMirror-Konvention „Marks vor dem Cursor, außer am Absatzanfang" — es
berücksichtigt **nicht** `state.storedMarks`. `storedMarks` ist aber genau das Feld,
das `toggleMark` bei leerer Selektion setzt/löscht (das „vorgemerkte" Mark aus
Anforderung 2.2/2.3). Reproduktion: Cursor in normalen Text setzen (keine Selektion),
„Fett" umschalten → `state.storedMarks = [strongMark]`, aber `$from.marks()` bleibt
unverändert (kein Dokument-Mark an dieser Stelle) → Button zeigt weiterhin
`aria-pressed="false"` an, obwohl der nächste getippte Buchstabe fett wird. Das ist
das **exakte Gegenteil** der in Abschnitt 2.3 geforderten Anzeige.

Zusätzlich adressiert dieser Fehler Grenzfall 3.3 (gemischte Selektion): die
aktuelle Methode prüft nur die Position `$from`, nicht ob die **gesamte** Selektion
fett ist — bei einer Selektion, die zur Hälfte fett ist, kann `aria-pressed`
fälschlich `true` anzeigen, obwohl nur ein Teil betroffen ist (abhängig davon, ob
`$from` zufällig im fetten Teil liegt).

**Fix:** Neue Hilfsfunktion `isMarkActive(state, markType)` in `commands.ts` (siehe
Abschnitt 3.1), die
- bei leerer Selektion `state.storedMarks || $from.marks()` prüft (Standardmuster
  aus `prosemirror-example-setup`/ProseMirror-Doku), und
- bei nicht-leerer Selektion nur dann `true` liefert, wenn **jede** Textstelle im
  Bereich das Mark trägt (nicht nur „irgendeine" wie `doc.rangeHasMark`) — das
  entspricht dem Word/LibreOffice-Verhalten: der Button zeigt „gedrückt" nur bei
  vollständig fetter Selektion, das Toggle-Ergebnis selbst bleibt aber Standard-
  ProseMirror-Verhalten (erster Klick fettet die gesamte Selektion, siehe Grenzfall
  3.3 — Toggle-Verhalten und Anzeige sind bewusst getrennte Entscheidungen).

### 2.3 Fehler 3 (hoch): DOCX-Reader ignoriert `@w:val` an `<w:b>`

**Datei:** `src/formats/docx/reader.ts:102`, Funktion `marksFromRunProperties`.

```ts
if (firstChildNS(rPr, OOXML_NAMESPACES.w, 'b')) marks.push({ type: 'strong' })
```

Dies prüft nur, **ob** ein `<w:b>`-Element existiert — nicht seinen `@w:val`. Nach
ECMA-376 bedeutet `<w:b/>` (kein `@val`) „an", aber `<w:b w:val="0"/>`,
`w:val="false"` oder `w:val="off"` bedeuten explizit „aus" (typischerweise verwendet,
um eine von einer Zeichenformatvorlage oder dem Absatzformat (z. B. „Heading 1")
geerbte Fettung für einen einzelnen Lauf gezielt auszuschalten — genau der Fall aus
Anforderung 2.5, den ein:e Nutzer:in erwarten könnte). Der Code behandelt einen
expliziten Bold-Aus-Override fälschlich als „fett". Zum Vergleich: der Underline-Fall
zwei Zeilen darunter macht es bereits richtig (`val !== 'none'`-Check) — die
Inkonsistenz bestätigt, dass es sich um ein Versehen handelt, nicht um Absicht.

Gleiches Muster (ohne `@val`-Prüfung) besteht auch bei `<w:i>` (Kursiv, Zeile 103)
und `<w:strike>` (Zeile 106) — außerhalb des Geltungsbereichs „Fett", aber als
verwandter Fund für das Backlog vermerkt.

**Fix:** Hilfsfunktion `isOnOffTrue(el)` einführen; `<w:b>` (und für Konsistenz optional
auch die anderen On/Off-Elemente) darüber prüfen.

### 2.4 Fehler 4 (mittel, blockiert Beantwortung von Abschnitt 2.5): Fehlende Heading-Fettung im Editor-CSS

Siehe Abschnitt 1: Die in der Anforderung referenzierte CSS-Regel existiert nicht.
`package.json` bestätigt Tailwind v4 (`"tailwindcss": "^4.3.2"`,
`@import 'tailwindcss'` in `src/index.css:1`) — Tailwinds Preflight setzt
`h1`–`h6 { font-size: inherit; font-weight: inherit; }`. Ohne eigene Gegenregel
erben Überschriften ihr `font-weight` von einem Vorfahren (üblicherweise `400`,
normal), sind also im Editor **nicht** fett dargestellt — unabhängig vom
`strong`-Mark und unabhängig davon, ob die Überschrift-Formatvorlage in DOCX/ODT auf
Stil-Ebene fett deklariert (`styleDefs.ts`, `styleRegistry.ts` — die sind nur für den
**Export**, nicht für die Editor-Darstellung relevant).

**Konsequenz für Abschnitt 2.5 der Anforderung:** Die dort gestellte Frage („Ist es
gewollt, dass die CSS-Fettung der Überschrift ein bewusst normales Wort verhindert?")
setzt voraus, dass Überschriften überhaupt fett aussehen. Das muss zuerst per
Playwright-Sichtprüfung (`getComputedStyle`) bestätigt werden. Zwei Fälle:

- **Bestätigt sich der Befund** (Überschriften sind aktuell nicht fett dargestellt):
  Dann ist die gesamte Fragestellung aus Abschnitt 2.5 aktuell gegenstandslos, bis die
  CSS-Regel nachgerüstet wird. Empfehlung: `.ProseMirror h1`…`.ProseMirror h6` mit
  `font-weight: 700` (oder gestaffelt wie `styleDefs.ts`/`styleRegistry.ts` es für den
  Export tun) versehen, damit Editor-Darstellung und Export-Optik übereinstimmen.
- **Widerlegt sich der Befund** (z. B. weil eine andere, hier nicht gefundene Quelle
  die Fettung doch herstellt): Dann bleibt Abschnitt 2.5 der Anforderung wie dort
  beschrieben gültig, und die dortige Empfehlung (Fett-Mark bewusst redundant zur
  Stil-Ebene, siehe Abschnitt 2.9 unten) greift unverändert.

**Fix (empfohlen, unabhängig vom Ausgang):** `src/index.css` um eine explizite
`font-weight`-Regel für `.ProseMirror h1`–`h6` ergänzen, weil sich der Editor sonst
strukturell darauf verlässt, dass Tailwinds Preflight-Verhalten sich nie ändert —
eine versteckte Abhängigkeit, die unabhängig vom eigentlichen Fett-Feature behoben
werden sollte.

---

## 3. Zusätzliche Lücken (kein akuter Bug, aber Grenzfall-relevant)

### 3.1 Lücke A: DOCX-Reader löst keine Zeichenformatvorlage (`w:rStyle`) auf — Grenzfall 3.10

`marksFromRunProperties`/`decodeParagraphRuns` lesen ausschließlich Direktformatierung
aus `w:rPr` eines Runs. Ein `<w:rStyle w:val="..."/>`-Verweis auf eine in `styles.xml`
definierte **Zeichenformatvorlage**, die selbst `<w:b/>` deklariert (ggf. über eine
`w:basedOn`-Kette vererbt), wird nirgends aufgelöst — solcher Text kommt beim Import
unsichtbar **nicht-fett** im Editor an, obwohl Word ihn fett anzeigen würde. Das ist
exakt der in Grenzfall 3.10 als „zu prüfen" markierte Fall — hiermit bestätigt als
**tatsächliche Lücke**, nicht nur ein theoretisches Risiko.

### 3.2 Lücke B: ODT-Reader berücksichtigt nur `office:automatic-styles`, keine gemeinsamen/benannten Stile

`parseAutomaticStyles` in `src/formats/odt/reader.ts:36` liest ausschließlich
`<office:automatic-styles>` (aus `content.xml` bzw. `styles.xml` für Kopf-/Fußzeilen).
Nach ODF-Spezifikation kann `text:style-name` auf einem `<text:span>` aber ebenso gut
auf einen **gemeinsamen/benannten** Stil in `<office:styles>` verweisen (z. B.
LibreOffice-Zeichenvorlagen wie „Strong Emphasis" oder ein von Nutzer:innen benannter
Stil). Solche Referenzen werden aktuell gar nicht gefunden (`textStyles.get(name)`
liefert `undefined`, keine Marks). Zusätzlich wird `style:parent-style-name`
(Vererbungskette) **nirgends** aufgelöst — auch nicht innerhalb der automatischen
Stile selbst. Beides ist ein Analogon zu Lücke A und potenziell relevant für Grenzfall
3.10/Abnahme 4.2.7 („reale, komplexe Fremddatei").

### 3.3 Lücke C: Icon weiterhin reiner Buchstabe, kein SVG

`Toolbar.tsx:59`/`:135` — unverändert seit der in `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 20.1 dokumentierten Risikoeinschätzung. Muss laut Abnahmekriterium 6 der
Anforderung *bewertet* werden (beibehalten oder auf SVG umgestellt) — siehe
Abschnitt 5 dieses Plans für die getroffene Empfehlung.

### 3.4 Lücke D: Fehlende Testabdeckung

Bestehende E2E-Tests (`docx.spec.ts:60/99`, `odt.spec.ts:44/80`) decken „Fett" nur
über Maus-Klick ab, nie über `Strg+B`/`Cmd+B`. Es existieren keine Tests für:
gemischte Selektion (3.3), 500er-`font-weight`-Grenze (3.6), Undo/Redo einzeln pro
Fett-Aktion (2.7), Bild-/Tabellengrenze (3.5), leerer Listenpunkt/leere Zelle (3.8),
Cross-Format-Doppelrundreise (4.3), sowie Zeichenformatvorlagen-Import (3.10). Siehe
Abschnitt 6 für den vollständigen Testplan.

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/editor/commands.ts` (geändert)

Neue exportierte Hilfsfunktionen ergänzen (Kern der Fehler-2-Behebung):

```ts
import type { EditorState } from 'prosemirror-state'
import type { MarkType } from 'prosemirror-model'

/**
 * True if the mark is "active" for the toolbar's purposes: for an empty
 * selection this follows the stored-mark-aware convention from the ProseMirror
 * docs (state.storedMarks wins over $from.marks() when set — this is what
 * `toggleMark` itself writes when there's no selection to apply the mark to).
 * For a non-empty selection this requires the mark to cover the *entire*
 * range, not just some position in it — see fett-code.md §2.2 for why
 * `$from`-only / `rangeHasMark`-only checks are insufficient.
 */
export function isMarkActive(state: EditorState, markType: MarkType): boolean {
  const { from, to, empty, $from } = state.selection
  if (empty) return !!markType.isInSet(state.storedMarks || $from.marks())
  let coversAll = true
  let sawText = false
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return
    const start = Math.max(pos, from)
    const end = Math.min(pos + node.nodeSize, to)
    if (start >= end) return
    sawText = true
    if (!markType.isInSet(node.marks)) coversAll = false
  })
  return sawText && coversAll
}
```

Keine Änderung an `toggleMark`-Verwendung selbst (bleibt Standard aus
`prosemirror-commands` — Toggle-Verhalten bei gemischter Selektion bleibt wie in
Grenzfall 3.3 beschrieben: erster Klick fettet die gesamte Selektion).

### 4.2 `src/formats/shared/editor/Toolbar.tsx` (geändert)

`MarkButton` (Zeilen 28–62):

- `active`-Berechnung auf `isMarkActive(view.state, markType)` umstellen (Zeile 42).
- `onMouseDown` reduziert auf `e.preventDefault()` (Fokus-/Selektionserhalt).
- Neuer `onClick`-Handler führt `run(view, toggleMark(markType))` aus — feuert für
  Maus-Klick (nach `mousedown`→`mouseup`) **und** Tastatur-Aktivierung (Enter/Space
  auf fokussiertem `<button>`), jeweils genau einmal (kein Doppel-Toggle, siehe
  Grenzfall 3.9 unten).
- Neuer optionaler Prop `icon?: React.ReactNode` für den Fett-Button (Umsetzung
  Icon-Entscheidung, siehe Abschnitt 5); Standard-Buchstaben-Glyph bleibt für
  Kursiv/Unterstrichen/Durchgestrichen unverändert (Geltungsbereich dieser
  Anforderung ist ausschließlich „Fett").

Aufrufstelle Zeile 135:

```tsx
<MarkButton view={view} mark="strong" label="Fett" title="Fett" icon={<BoldIcon />} />
```

(`label` dient nur als Fallback/Screenreader-Redundanz falls `icon` fehlt; die
eigentliche zugängliche Bezeichnung bleibt `aria-label={title}` auf dem `<button>`.)

Neue Komponente `BoldIcon` (gleiche Datei, kleines inline SVG, keine externe
Icon-Bibliothek im Projekt vorhanden — `package.json` bestätigt das):

```tsx
function BoldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
    </svg>
  )
}
```

(Pfad entspricht dem verbreiteten, Apache-2.0-lizenzierten Material-Icons
„format_bold"-Glyph — unabhängig von Systemschriftart/Emoji-Unterstützung
darstellbar, behebt Lücke C / Backlog-Punkt 20.1.)

### 4.3 `src/formats/shared/editor/WordEditor.tsx` (keine funktionale Änderung)

`Mod-b`-Bindung (Zeile 76) bleibt unverändert — `prosemirror-keymap` ruft bei
zurückgegebenem `true` automatisch `event.preventDefault()` auf, wodurch eine
kollidierende Browser-Aktion (z. B. Firefox' „Lesezeichen-Seitenleiste umschalten"
auf `Strg+B`) unterdrückt wird, **solange der Fokus im Editor liegt**. Kein Codefix
nötig, aber Abschnitt 1 Zeile 2 der Anforderung verlangt einen **Nachweis** — siehe
neuer Testfall in Abschnitt 6.2.

### 4.4 `src/formats/shared/schema.ts` (keine Änderung)

Mark-Definition ist korrekt (siehe Abschnitt 1). Lediglich neue Testabdeckung für die
500er-Grenze nötig (Abschnitt 6.3), kein Code-Fix.

### 4.5 `src/index.css` (geändert)

Nach Zeile 37 (Ende des bestehenden `h1`–`h6`-Margin-Blocks) ergänzen:

```css
.ProseMirror h1,
.ProseMirror h2,
.ProseMirror h3,
.ProseMirror h4,
.ProseMirror h5,
.ProseMirror h6 {
  font-weight: 700;
}
```

Behebt Fehler 4. Muss vor der endgültigen Beantwortung von Abschnitt 2.5 der
Anforderung umgesetzt sein, da sie sonst auf einer falschen Grundannahme beruht.

### 4.6 `src/formats/docx/reader.ts` (geändert)

**Fix für Fehler 3** (`@w:val`-Prüfung), Funktion `marksFromRunProperties`
(Zeile 99–114):

```ts
function isOnOffTrue(el: Element | null): boolean {
  if (!el) return false
  const val = el.getAttributeNS(OOXML_NAMESPACES.w, 'val')
  if (val === null) return true // <w:b/> ohne @w:val bedeutet "an" (ECMA-376)
  return val !== '0' && val !== 'false' && val !== 'off'
}
```

```ts
if (isOnOffTrue(firstChildNS(rPr, OOXML_NAMESPACES.w, 'b'))) marks.push({ type: 'strong' })
```

**Fix für Lücke A** (Zeichenformatvorlagen-Fallback, Grenzfall 3.10) — größere
Änderung:

- `HeadingInfo` (Zeile 48–50) umbenennen/erweitern zu einer `StylesInfo`, die
  zusätzlich `boldByStyleId: Map<string, boolean>` führt (Style-Typ `character`,
  über `w:basedOn`-Kette aufgelöst, mit Zyklen-Schutz analog zum bestehenden
  `MAX_TABLE_NESTING_DEPTH`-Muster).
- `parseStylesXml` (Zeile 52–66) erweitern: für jeden `<w:style w:type="character">`
  in `styles.xml` prüfen, ob `<w:rPr><w:b/></w:rPr>` direkt gesetzt ist; falls nicht,
  `w:basedOn` verfolgen (max. Tiefe begrenzen).
- `marksFromRunProperties` bekommt einen zusätzlichen Parameter `stylesInfo:
  StylesInfo`. Vor der direkten `<w:b>`-Prüfung zusätzlich prüfen: hat der Run ein
  `<w:rStyle w:val="X"/>` in `rPr`, und liefert `stylesInfo.boldByStyleId.get(X)`
  `true`? Falls ja, `strong`-Mark auch ohne direktes `<w:b/>` setzen (aber: ein
  direktes `<w:b w:val="0"/>` auf Run-Ebene überschreibt weiterhin die
  Zeichenformatvorlage — Priorität: Direktformatierung > Zeichenformatvorlage,
  entspricht Word-Semantik).
- Die Threading-Kette (`readDocx` → `readBodyChildren` → `paragraphToBlocks` →
  `decodeParagraphRuns` → `marksFromRunProperties`) existiert bereits für
  `headingInfo` und muss nur um das erweiterte Objekt ergänzt werden, keine neue
  Parameterkette nötig.

### 4.7 `src/formats/docx/writer.ts` (optional, siehe Abschnitt 5 — Design-Entscheidung)

Siehe Abschnitt 5 „Empfehlung zu Abschnitt 2.5". Falls die Entscheidung fällt, dass
Nutzer:innen ein bewusst nicht-fettes Wort **innerhalb** einer Überschrift erzeugen
können sollen: `runPropertiesXml` (Zeile 18–31) müsste kontextabhängig (Absatz ist
`heading`) für Runs **ohne** `strong`-Mark explizit `<w:b w:val="0"/>` statt nichts
schreiben. Das erfordert, dass `inlineToRuns`/`blockToDocx` den Node-Typ des
umgebenden Absatzes an `runPropertiesXml` durchreichen — nicht trivial, da
`runPropertiesXml` aktuell kontextfrei ist. **Nicht Teil des Mindestumfangs**, siehe
Empfehlung.

### 4.8 `src/formats/odt/reader.ts` (geändert)

**Fix für Lücke B**: `parseAutomaticStyles` (Zeile 36–77) erweitern bzw. durch eine
neue Funktion `parseStyleCascade(contentDoc, stylesDoc)` ersetzen, die:

1. `<office:styles>` (gemeinsame/benannte Stile, typischerweise nur in `styles.xml`
   vorhanden) zusätzlich zu `<office:automatic-styles>` einliest (Familie `text` und
   `paragraph`, gleiches Attribut-Mapping wie bisher).
2. `style:parent-style-name` rekursiv aullöst (Kind überschreibt geerbte
   Eigenschaften des Elternstils; Zyklenschutz nach demselben Muster wie
   `MAX_NESTING_DEPTH` in dieser Datei).
3. Eine gemeinsame `Map<string, RunStyle>` zurückgibt, in der automatische Stile bei
   Namenskollision Vorrang vor gemeinsamen Stilen haben (automatische Stile sind
   näher am konkreten Textlauf).

`readOdt` (Zeile 239 ff.) übergibt zusätzlich das geparste `<office:styles>`-Element
aus `styles.xml` (wird dort bereits für `stylesDoc` geladen, Zeile 252–256 — nur die
Weitergabe an die Stil-Auflösung fehlt).

### 4.9 `src/formats/odt/writer.ts` / `src/formats/odt/styleRegistry.ts` (optional)

Analog zu 4.7: nur falls die Design-Entscheidung aus Abschnitt 5 einen expliziten
Bold-Aus-Override für Überschriftentext verlangt (`fo:font-weight="normal"` in einer
dedizierten Stildefinition für Runs ohne `strong`-Mark innerhalb `text:h`). Nicht Teil
des Mindestumfangs.

---

## 5. Empfehlung zu der offenen Frage aus Abschnitt 2.5 der Anforderung

Vorschlag (zur Übernahme in `fett-req.md` Abschnitt 2.5 / Abnahmekriterium 4, sobald
entschieden — diese Datei ändert `fett-req.md` nicht selbst):

1. **CSS-Fix zuerst** (Abschnitt 4.5) umsetzen, damit Überschriften im Editor
   überhaupt wieder optisch fett erscheinen — unabhängig von der folgenden
   Entscheidung, da sonst Editor-Optik und DOCX/ODT-Export-Optik auseinanderlaufen.
2. **Minimalumfang (empfohlen für diese Anforderung):** Das dokumentierte
   Ist-Verhalten aus Abschnitt 2.5, letzter Absatz, wird **beibehalten und explizit
   als gewollt bestätigt**: Ein entferntes `strong`-Mark auf Überschriftentext hebt
   die Stil-Ebene (`Heading1`…`6` mit `<w:b/>`/`fo:font-weight="bold"`) nicht auf; die
   Überschrift bleibt in Word/LibreOffice weiterhin vollständig fett. Das Mark ist in
   diesem Fall nur redundant, nicht falsch. Kein Code-Fix in 4.7/4.9 erforderlich für
   den Abschluss dieser Anforderung.
3. **Erweiterung (separates Backlog-Item, nicht Teil dieses Umsetzungsplans):** Sollte
   künftig verlangt werden, dass Nutzer:innen ein einzelnes Wort innerhalb einer
   Überschrift bewusst „normal" darstellen können, sind die in 4.7/4.9 skizzierten
   Bold-Aus-Overrides umzusetzen. Das ist ein eigenständiges, klar abgrenzbares
   Feature mit eigenem Test- und Verifikationsaufwand — hier nur als Option
   dokumentiert, damit die Frage aus 2.5 nicht unbeantwortet bleibt.

Begründung für Option 2 statt 3 als Minimalumfang: Der Geltungsbereich dieser
Anforderung ist ausschließlich das `strong`-Mark-Verhalten, nicht ein neues
Style-Override-Feature; Option 3 wäre ein Scope-Erweiterung mit eigenem
Test-/Risikoaufwand (Absatzformat-Kontext muss bis in `runPropertiesXml`
durchgereicht werden, siehe 4.7).

---

## 6. Testplan (Zuordnung zu Abschnitt 5 der Anforderung)

### 6.1 Neue Datei: `tests/e2e/bold.spec.ts` (neu)

Dedizierte Suite, ersetzt/ergänzt die verstreuten Fett-Assertions in
`docx.spec.ts`/`odt.spec.ts` um die in der Anforderung Abschnitt 5 geforderten,
bisher fehlenden Fälle. Struktur (je Test = ein Punkt aus Abschnitt 5):

1. Toolbar-Klick auf Selektion → `expect(locator).toHaveCSS('font-weight', '700')`
   (oder äquivalent über `getComputedStyle` im Seitenkontext) **und**
   `aria-pressed="true"`.
2. Identische Aktion per `page.keyboard.press('ControlOrMeta+b')` statt Klick —
   deckt Fehler 1 (Tastatur) und Anforderung 1/Zeile 2 ab.
3. **Tastatur-Fokus-Pfad explizit**: `button.focus()` (bzw. wiederholt `Tab`),
   dann `page.keyboard.press('Enter')` und separat `Space` — deckt Fehler 1 exakt
   in der in der Anforderung verlangten Form ab („Tab-Fokus + Enter/Space").
4. Fett ohne Selektion aktivieren, tippen → neuer Text fett, Nachbartext nicht;
   **zusätzlich**: Button zeigt sofort nach Aktivierung (vor dem Tippen)
   `aria-pressed="true"` — deckt Fehler 2 ab.
5. Fett auf vollständig fette Selektion → entfernt, `aria-pressed` → `false`.
6. Gemischte Selektion (halb fett) → Ergebnis gemäß Grenzfall 3.3 (ganze Selektion
   wird fett), und `aria-pressed` **vor** dem Klick ist `false` (nicht fälschlich
   `true`), da nicht die gesamte Selektion fett ist — deckt Fehler 2/Grenzfall 3.3.
7. Fett+Kursiv+Unterstrichen kombiniert, DOCX-Export → unabhängiger Parser (JSZip +
   DOMParser auf `word/document.xml`) prüft `<w:rPr>` enthält alle drei Elemente in
   einem einzigen `<w:r>`.
8. Gleicher Test für ODT (`content.xml`, ein `<text:span>` mit einer Stildefinition,
   die alle drei Eigenschaften trägt).
9. Undo direkt nach Fett-Anwendung (Klick, dann `Strg+Z`) → Formatierung weg, Text
   bleibt; Redo (`Strg+Y`/`Strg+Shift+Z`) stellt sie wieder her.
10. Vollständige Rundreise je Format (Upload via `setInputFiles`, Export via
    `page.waitForEvent('download')`), wie in 4.1/4.2 beschrieben — nicht nur über
    interne Reader/Writer-Aufrufe.
11. Cross-Format-Rundreise: DOCX hochladen → als ODT exportieren → resultierende
    Datei erneut hochladen (im ODT-Kartenbereich) → als DOCX zurückexportieren →
    Fettung an derselben Textstelle prüfen. Zweiter Test mit vertauschter
    Startrichtung.
12. `selection-regression.spec.ts` bleibt unverändert Teil der Suite (keine
    Änderung nötig, nur Bestätigung, dass er nach den Toolbar-Änderungen aus 4.2
    weiterhin grün ist — die Interaktion `getByTitle('Fett').click()` bleibt
    kompatibel, da Playwright `.click()` die volle `mousedown`→`mouseup`→`click`-
    Sequenz auslöst).
13. Einfügen von HTML-Fragment mit `font-weight: 499` vs. `500` über
    `page.evaluate` + `ClipboardEvent`/`execCommand('insertHTML')` oder
    Fokus+`page.keyboard.insertText` mit vorbereitetem Clipboard — 499 nicht fett,
    500 fett.
14. Sichtprüfung Grenzfall 2.5: `getComputedStyle` auf eine `h1` im Editor vor und
    nach dem CSS-Fix aus 4.5, Ergebnis hier und in `fett-req.md` nachtragbar.

### 6.2 `src/formats/shared/editor/__tests__/commands.test.ts` (neu)

Unit-Tests (Vitest) für `isMarkActive` aus Abschnitt 4.1: leere Selektion mit/ohne
`storedMarks`, volle Selektion, teilweise Selektion, Selektion über ein `image`
hinweg (Grenzfall 3.5 auf Command-Ebene).

### 6.3 `src/formats/docx/__tests__/roundtrip.test.ts` (ergänzt)

- Neuer Fall: Text mit `<w:b w:val="0"/>` importieren → **kein** `strong`-Mark
  (Regressionstest für Fehler 3).
- Neuer Fall: Run mit `<w:rStyle w:val="Strong"/>`, referenzierte Zeichenvorlage in
  `styles.xml` mit `<w:b/>` → `strong`-Mark gesetzt (Regressionstest für Lücke A).
- Neuer Fall: leerer Absatz, Fett umgeschaltet (nur `storedMarks`, kein Text) →
  Export enthält keinen leeren `<w:r>` (Grenzfall 3.8, struktureller Nachweis statt
  reiner Behauptung).
- Ergänzung zur bestehenden `preserves bold, italic, underline...`-Testgruppe
  (Zeile 57 ff.): Reihenfolge-Unabhängigkeit — Farbe-dann-Fett vs. Fett-dann-Farbe
  ergibt identisches `<w:rPr>` (Nachweis für Anforderung 2.4).

### 6.4 `src/formats/odt/__tests__/roundtrip.test.ts` (ergänzt)

- Neuer Fall: `text:span` referenziert einen Stil aus `<office:styles>` (nicht
  `<office:automatic-styles>`) mit `fo:font-weight="bold"` → `strong`-Mark gesetzt
  (Regressionstest für Lücke B).
- Neuer Fall: Stil mit `style:parent-style-name`, Fettung nur im Elternstil
  deklariert → `strong`-Mark trotzdem gesetzt (Vererbungskette).
- Neuer Fall: zwei Textläufe mit identischer Markkombination → `TextStyleRegistry`
  erzeugt genau eine Stildefinition (`T1`), Nachweis für Anforderung 4.2.3 (bisher
  ungetestet).

### 6.5 `src/formats/docx/__tests__/external-fixtures.test.ts` /
`src/formats/odt/__tests__/external-fixtures.test.ts` (ergänzt)

Aktuell nur „importiert ohne Absturz". Ergänzen um gezielte Bold-Assertions an
mindestens einer Fixture mit bekannter Zeichenformatvorlage (Kandidaten:
`Styles.docx` für DOCX-`rStyle`; `CharacterParagraphFormat.odt`/
`TestStyleSelection.odt`/`TestStyleStyleAttribute.odt` für ODT-Stilvererbung — Inhalt
vor Verwendung verifizieren, da Dateinamen aus dem Testkorpus keine Garantie über den
exakten Inhalt geben). Deckt Abnahme 4.1.7/4.2.7 („reale, komplexe Fremddatei").

### 6.6 Neue Datei: `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts` (neu)

Unit-Ebene (schneller als E2E) für Abnahme 4.3: `writeDocx` → `readOdt`-kompatibles
Zwischenformat ist nicht direkt verkettbar (unterschiedliche Blob-Typen), daher:
`readDocx(writeDocx(doc))` liefert Ausgangs-JSON, dann `readOdt(writeOdt(dasselbe
JSON))`, Vergleich der `strong`-Marks an derselben Textposition nach beiden
Konvertierungen. Ergänzt (nicht ersetzt) den E2E-Test aus 6.1 Punkt 11, der die reale
Browser-Bedienung nachweist.

---

## 7. Zuordnung zu den Abnahmekriterien (Abschnitt 6 der Anforderung)

| DoD-Punkt | Abdeckung durch diesen Plan |
|---|---|
| 1. Alle Testfälle aus Abschnitt 5 real im Browser ausgeführt | Abschnitt 6.1 dieser Datei (neue `bold.spec.ts`) |
| 2. Rundreise-Anforderungen (Abschnitt 4) per unabhängigem Parser/Re-Import bestätigt | Abschnitt 6.1 Punkte 7,8,10,11 + 6.3/6.4/6.6 |
| 3. Alle Grenzfälle (Abschnitt 3) einzeln geprüft und dokumentiert | Abschnitte 2–3 dieser Datei (1–4,7,10 als Bugs/Lücken bestätigt; 2,5,6,9,11 als „kein Fehler, aber Testfall nötig" eingeordnet; 8 als „strukturell ausgeschlossen" begründet — `storedMarks` sind nicht Teil des `doc.toJSON()` und erreichen den Writer nie) |
| 4. Offene Frage aus 2.5 beantwortet | Abschnitt 5 dieser Datei (Empfehlung), zur Übernahme nach `fett-req.md` |
| 5. Regressionstest 3.7/Selection-Sync bleibt Pflichtbestandteil | Abschnitt 6.1 Punkt 12 — keine Änderung an `selection-regression.spec.ts` nötig, nur Kompatibilitätsnachweis nach dem Toolbar-Fix |
| 6. Icon-Rendering-Risiko bewertet | Abschnitt 3.3 (Lücke C) + Abschnitt 4.2 (Fix: SVG `BoldIcon`) |

---

## 8. Reihenfolge der Umsetzung (Vorschlag)

1. `src/index.css` (4.5) — unabhängig, schnell, entblockt Abschnitt 2.5.
2. `commands.ts` + `Toolbar.tsx` (4.1/4.2) — behebt Fehler 1 und 2, betrifft die
   sichtbarste Nutzer:innen-facing-Baustelle.
3. `docx/reader.ts` `@w:val`-Fix (4.6, kleiner Teil) — behebt Fehler 3, isoliert und
   risikoarm.
4. Testergänzungen 6.1–6.5, um 1–3 abzusichern, bevor die größeren Lücken A/B
   angegangen werden.
5. `docx/reader.ts` `rStyle`-Fallback (4.6, größerer Teil) und `odt/reader.ts`
   Stil-Kaskade (4.8) — größte Änderungen, eigene Testrunde (6.3/6.4/6.5).
6. Cross-Format-Tests (6.6, 6.1 Punkt 11).
7. Entscheidung gemäß Abschnitt 5 treffen und in `fett-req.md` nachtragen; 4.7/4.9
   nur umsetzen, falls Option 3 gewählt wird.
