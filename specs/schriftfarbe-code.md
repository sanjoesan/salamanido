# Schriftfarbe — dateigenauer Umsetzungsplan

Gegenstück zu `specs/schriftfarbe-req.md`. Dieses Dokument beschreibt, nach
tatsächlicher Codelektüre (nicht nur Backlog-Angabe) und nach Stichproben gegen den
realen Fixture-Bestand (`tests/fixtures/external/{docx,odt}`), was am bestehenden Code
zu ändern ist, welche Dateien neu angelegt werden, und wie die in der Anforderung
geforderte Verifikation technisch umgesetzt wird. Es ist zugleich die in
`schriftfarbe-req.md` Abschnitt 3.2 / Abnahmekriterium 4 geforderte **Nachfolgedatei**,
die die Entscheidung zum Verhalten bei leerer Selektion explizit festhält (siehe
Abschnitt 3.3).

## 0. TL;DR

Die Referenztabelle in `schriftfarbe-req.md` ist **zu 100 % deckungsgleich mit dem
tatsächlichen Code** — jede dort zitierte Zeile/jedes Verhalten wurde nachgelesen und
bestätigt (Abschnitt 2). Schema, Toolbar, Befehle, DOCX-/ODT-Reader/Writer existieren
bereits und decken den Grundfall („Selektion markieren → Farbe setzen/entfernen")
funktional korrekt ab.

Der Umsetzungsaufwand gliedert sich in vier Kategorien:

1. **Zwei echte, mit realen Fremddateien nachgewiesene Bugs**, die über das hinausgehen,
   was `schriftfarbe-req.md` bereits als Ist-Zustand auflistet:
   - `docx/writer.ts` schreibt den Farbwert **ungeschützt/unescaped** in ein
     XML-Attribut (`w:val="…"`, ebenso `w:fill="…"` für Hervorhebung) — ein Fremdwert mit
     `"`/`&`/`<` erzeugt eine **kaputte, nicht mehr parsbare** DOCX-Datei (Abschnitt 3.1).
   - Sowohl DOCX- als auch ODT-Reader werten **ausschließlich Farbe an der einzelnen
     Textstelle** aus (Lauf-/Span-Ebene) und ignorieren vollständig **stilvererbte**
     Farbe (DOCX: `w:pStyle` → `w:style/w:rPr/w:color`; ODT: `style:family="paragraph"`
     mit `style:text-properties fo:color`, sowie `style:parent-style-name`-Ketten). Beides
     ist mit **bereits im Repo vorhandenen echten Fremddateien** nachweisbar
     (`tests/fixtures/external/docx/52288.docx`, `.../odt/text-color-from-paragraph.odt`)
     und führt zu **stillem Farbverlust beim Import** — ein direkter Verstoß gegen die
     verbindliche Rundreise-Anforderung aus Abschnitt 6 der Anforderung (Abschnitt 3.2).
2. **Eine explizite Entscheidung** zum in der Anforderung als offen markierten Verhalten
   bei leerer Selektion (Abschnitt 3.2/3.5 der Anforderung, Abnahmekriterium 4) — dieser
   Plan trifft die Entscheidung **„nachrüsten"** (Variante b) und liefert den konkreten,
   mit `prosemirror-commands`s eigener `toggleMark`-Implementierung deckungsgleichen Fix
   (Abschnitt 3.3).
3. **Ein mit den Grenzfällen 3.4/16 der Anforderung begründeter Fix** am kontinuierlichen
   `onChange`-Feuern von `<input type="color">` während des Ziehens im nativen Dialog
   (Abschnitt 3.4).
4. **Der eigentliche Kern der Anforderung**: komplett fehlende E2E-Tests (echte
   Toolbar-Bedienung im Browser) sowie gezielte Unit-Tests für alle in Abschnitt 4 der
   Anforderung benannten Grenzfälle, inklusive Auswertung von zehn bereits im Repo
   vorhandenen, dafür bislang ungenutzten echten Fremddateien (Abschnitt 9).

Zwei Punkte der Anforderung (Abschnitt 2 Punkt 1 „reiner Buchstabe A" und Punkt 4
„kein Aktiv-Zustand") werden **bewusst nicht** als Pflicht-Fix behandelt, da die
Anforderung selbst dafür ausdrücklich nur Verifikation/Dokumentation, keine Korrektur
verlangt (siehe Abschnitt 3.5/3.6 zu optionalen, nicht-blockierenden Verbesserungen).

---

## 1. Methodik dieser Prüfung

Gelesen wurden: `src/formats/shared/schema.ts`, `src/formats/shared/editor/Toolbar.tsx`,
`src/formats/shared/editor/WordEditor.tsx`, `src/formats/shared/editor/commands.ts`,
`src/formats/docx/{writer,reader,styleDefs,xmlUtil}.ts`,
`src/formats/odt/{writer,reader,styleRegistry,xmlUtil}.ts`, beide
`__tests__/roundtrip.test.ts`, beide `__tests__/external-fixtures.test.ts`,
`tests/e2e/{docx,odt,selection-regression,lifecycle}.spec.ts`, `specs/FEATURE-BACKLOG.md`
(Zeile 101, Bestätigung Status „vorhanden", Priorität 1) sowie die
`prosemirror-commands`/`prosemirror-state`-Quelle (`toggleMark`,
`Transaction.addStoredMark`/`removeStoredMark`) zur Absicherung des Fixes in
Abschnitt 3.3. Zusätzlich wurde der komplette Fixture-Bestand unter
`tests/fixtures/external/{docx,odt}` (127 DOCX-, 202 ODT-Dateien) programmatisch nach
`w:color`/`w:themeColor` bzw. `fo:color`/benannten Zeichenformatvorlagen durchsucht
(Node-Skript mit `jszip`, siehe Fund-Tabellen in Abschnitt 9) statt sich auf Dateinamen
zu verlassen — das deckt zwei Befunde auf, die aus reiner Codelektüre nicht sichtbar
gewesen wären (Abschnitt 3.2).

Referenzierte, aber im Repo nicht vorhandene Datei `FEATURE-SPEC-DOCX-ODT.md`: In
diesem Repo existiert keine Datei dieses Namens unter `specs/`; die dortigen
Abschnittsverweise aus `schriftfarbe-req.md` (2.2, 3, 17, 20.1) konnten daher nicht
gegen eine lokale Quelle verifiziert werden. Das ändert nichts an der Gültigkeit der
in `schriftfarbe-req.md` beschriebenen Anforderungen selbst (die Datei ist in sich
konsistent und beschreibt konkrete, im Code nachvollziehbare Zustände); es ist hier nur
vermerkt, damit dieser fehlende Querverweis nicht stillschweigend übergangen wird.

---

## 2. Ist-Zustand nach Codelektüre — Abgleich mit der Referenztabelle der Anforderung

| Fundstelle laut Anforderung | Verifiziert im Code | Abweichung? |
|---|---|---|
| `schema.ts` Mark `textColor`, `attrs: { color: { validate: 'string' } }`, `parseDOM: [{ style: 'color', … }]`, `toDOM` | Ja, exakt so (Zeilen 134–140) | keine |
| `Toolbar.tsx` Zeilen 142–161, Label „A" + `<input type="color">` + „⌫"-Button | Ja, exakt so (Zeilen 142–161) | keine |
| `commands.ts` `applyMarkColor`/`clearMarkColor`, `return false` bei leerer Selektion | Ja, exakt so (Zeilen 90–106) | keine |
| Keine Tastenkombination in `WordEditor.tsx`-Keymap | Ja, bestätigt (Zeilen 71–79 enthalten nur `Mod-z/y/Shift-z`, `Enter`, `Mod-b/i/u`) | keine |
| `docx/writer.ts` Zeile 25, `<w:color w:val="…"/>`, `.replace('#','')` | Ja, exakt so (heute Zeile 25) | keine — **aber zusätzlicher, nicht in der Anforderung erwähnter Fund**, siehe Abschnitt 3.1 |
| `docx/reader.ts` Zeilen 107–109, `w:val`, ignoriert `"auto"`, kein Trimming der Groß-/Kleinschreibung | Ja, exakt so (heute Zeile 107–109) | keine — **aber zusätzlicher Fund zu stilvererbter Farbe**, siehe Abschnitt 3.2 |
| `odt/styleRegistry.ts` `buildTextStyleXml` → `fo:color="…"`, `isEmpty()` behandelt jeden String als „nicht leer" | Ja, exakt so (Zeilen 12–14, 56) | keine |
| `odt/reader.ts` Zeilen 57–58/91, liest `fo:color` nur aus `office:automatic-styles`, `office:styles` nicht ausgewertet | Ja, exakt so (Zeilen 57–61, 91) | keine — **aber der tatsächliche Fund ist breiter als „nur benannte Stile", siehe Abschnitt 3.2** |
| Unit-Test „preserves text color and highlight color" in beiden `roundtrip.test.ts` | Ja, identisch in DOCX- und ODT-Variante (Zeilen 94–111), testet nur `#ff0000`/`#ffff00`, direkt als JSON konstruiert | keine |
| Keine E2E-Tests für „textColor"/„Textfarbe"/„Schriftfarbe" | Bestätigt — `tests/e2e/{docx,odt,selection-regression,lifecycle}.spec.ts` enthalten keinen Treffer | keine |
| Kein sichtbarer Aktiv-/Ist-Zustand am Farbwähler | Bestätigt — `Toolbar.tsx` hat für `textColor`/`highlight` kein Äquivalent zu `MarkButton`s `aria-pressed`/`isInSet`-Logik | keine |

Die Anforderungstabelle ist damit **vollständig korrekt** — keine der dort behaupteten
Fundstellen ist veraltet oder falsch zitiert. Der Rest dieses Plans behandelt (a) was
zusätzlich beim Audit gefunden wurde (Abschnitt 3), (b) die geforderten Entscheidungen
(Abschnitt 3.3) und (c) die eigentliche Testabdeckung (Abschnitte 6–9).

---

## 3. Gefundene Defekte / zu treffende Entscheidungen

### 3.1 `src/formats/docx/writer.ts` — ungeschützter Farbwert im XML-Attribut (Fix)

Zeile 25 (Schriftfarbe) und Zeile 27 (Hervorhebung, cross-referenziert für
`textmarker-farbe`, siehe Demarkation der Anforderung Abschnitt 0), aktuell:

```ts
if (mark.type === 'textColor') props.push(`<w:color w:val="${String(mark.attrs?.color ?? '').replace('#', '')}"/>`)
if (mark.type === 'highlight') {
  props.push(`<w:shd w:val="clear" w:color="auto" w:fill="${String(mark.attrs?.color ?? '').replace('#', '')}"/>`)
}
```

`escapeXml` ist in dieser Datei bereits importiert und wird für Textinhalt
(`encodeRunText`) und `docProps/core.xml` verwendet — **aber nicht** für diese beiden
Attributwerte. Da laut `schema.ts` (`validate: 'string'`) **jeder** String als
`color`-Attribut zulässig ist und laut Anforderung Abschnitt 3.8/Grenzfall 10 aus
Fremddateien (ODT-Import: „übernimmt `fo:color` als rohen String ohne jede
Formatprüfung") ein beliebiger, nicht validierter String bis in dieses Mark-Attribut
gelangen kann, erzeugt ein Wert wie `l"/><w:b/><w:color w:val="ff0000` (absichtlich
pathologisch, aber genau die Klasse Wert, die Grenzfall 10 als „ungültig/exotisch"
beschreibt) beim Export **kaputtes, nicht mehr parsbares XML** — nicht nur eine falsch
dargestellte Farbe, sondern eine ungültige Gesamtdatei. Das ist direkt relevant für
Rundreise-Testfall 6 der Anforderung („echte Fremddatei … importieren").

**Fix:**

```ts
if (mark.type === 'textColor') props.push(`<w:color w:val="${escapeXml(String(mark.attrs?.color ?? '').replace('#', ''))}"/>`)
if (mark.type === 'highlight') {
  props.push(`<w:shd w:val="clear" w:color="auto" w:fill="${escapeXml(String(mark.attrs?.color ?? '').replace('#', ''))}"/>`)
}
```

(ODT-seitig besteht dieses Risiko **nicht** — `odt/styleRegistry.ts`
`buildTextStyleXml`, Zeile 56/57, escaped `props.color`/`props.highlight` bereits
korrekt über `escapeXml`.)

### 3.2 DOCX- und ODT-Reader — stilvererbte Farbe wird vollständig ignoriert (Fix, mit realen Fremddateien nachgewiesen)

Die Anforderung benennt in Grenzfall 12 nur den engeren Fall „benannte/gemeinsame
Zeichenformatvorlage (`office:styles`) statt automatischer Formatvorlage" für ODT und
verlangt dafür laut Abnahmekriterium 5 nur **Prüfung + Dokumentation**, keinen
zwingenden Fix. Der beim Audit tatsächlich gefundene Fall ist **breiter und stiller**:
Farbe, die eine *Absatz*-Formatvorlage (nicht ein Zeichenlauf) definiert und die vom
Editor gar keine explizite Lauf-Formatierung mehr braucht, wird von **beiden** Readern
komplett übergangen — mit nachweisbarem Datenverlust an bereits im Repo vorhandenen,
echten Fremddateien (nicht selbst konstruiert):

**ODT — `tests/fixtures/external/odt/text-color-from-paragraph.odt`** (LibreOffice-
generierte ODF-Toolkit-Testdatei): enthält u. a.
`<text:p text:style-name="P1">Entire paragraph in red.</text:p>` mit
`<style:style style:name="P1" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:color="#ff0000"/></style:style>`
— **kein** `<text:span>` um den Lauf. `odt/reader.ts` `parseAutomaticStyles`
(Zeilen 42–67) liest bei `family === 'paragraph'` **ausschließlich**
`fo:text-align` (Zeile 62–65) aus den `paragraph-properties`; `style:text-properties`
eines Absatzstils wird nirgends gelesen. `decodeInline` (Zeilen 79–120) startet jeden
`walk()`-Aufruf mit `marks = []` (Zeile 118) und erweitert das Array **nur** über
`<text:span>`-Elemente (Zeile 104–107). Ergebnis: Dieser komplette Absatz importiert
heute **ohne jede `textColor`-Mark** — stiller Farbverlust, kein Absturz, keine
Fehlermeldung.

**DOCX — `tests/fixtures/external/docx/52288.docx`** (Apache-POI-Testkorpus):
enthält u. a. `<w:p><w:pPr><w:pStyle w:val="ChapterNumber"/></w:pPr><w:r><w:t>CHAPTER 1</w:t></w:r></w:p>`
(**kein** `<w:rPr>` am Lauf selbst) mit
`<w:style w:type="paragraph" w:styleId="ChapterNumber"><w:basedOn w:val="ChapterName"/><w:rPr><w:color w:val="000000"/></w:rPr></w:style>`
in `word/styles.xml`. `docx/reader.ts` `parseStylesXml` (Zeilen 52–66) liest aus
`<w:style w:type="paragraph">` **ausschließlich** `w:pPr/w:outlineLvl` (Zeile 58–63);
das `w:rPr` der Stildefinition wird nie ausgewertet. `marksFromRunProperties`
(Zeilen 99–114) bekommt nur das `w:rPr` des **einzelnen Laufs** übergeben
(`decodeParagraphRuns`, Zeile 127); ohne eigenes `<w:color>` am Lauf entsteht **keine**
`textColor`-Mark — derselbe stille Farbverlust wie bei ODT, nur über den
DOCX-Stilmechanismus statt ODF.

Beide Fälle sind **keine exotischen Sonderfälle**: „gesamten Absatz markieren, Farbe
zuweisen" ist ein alltäglicher Bedienweg in Word/LibreOffice, bei dem beide
Anwendungen aus Effizienzgründen bevorzugt die Absatz-/Stilebene statt einzelner
Zeichenformatierung nutzen. Das bedroht direkt die **verbindliche**
Rundreise-Anforderung aus Abschnitt 6 der Anforderung, insbesondere Testfall 6 („echte
Fremddatei … Farbe wird korrekt erkannt bzw. Fallback-Verhalten ist dokumentiert") —
aktuell gibt es hier **keinen dokumentierten Fallback**, sondern einen unbemerkten
Bug.

**Fix-Skizze ODT (`odt/reader.ts`):**

1. `parseAutomaticStyles`: Für `family === 'paragraph'` zusätzlich zu `fo:text-align`
   auch `style:text-properties` einlesen (Farbe/Fett/Kursiv/Unterstrichen/Durchgestrichen
   — dieselbe Extraktion, die für `family === 'text'` schon existiert; auf eine
   gemeinsame Hilfsfunktion `extractRunStyle(props: Element): RunStyle` ziehen, statt
   den Code zu duplizieren) in eine neue Map `paragraphRunStyles: Map<string, RunStyle>`.
2. `ParsedStyles`-Interface um `paragraphRunStyles` erweitern.
3. `decodeInline(pEl, styles, baseMarks: Mark[] = [])`: `walk()` mit `baseMarks` statt
   `[]` initialisieren.
4. `paragraphToBlocks`/`elementToBlocks` (Heading-Zweig): vor dem Aufruf von
   `decodeInline` den `styleName` des Absatzes/der Überschrift auflösen und
   `marksFor(styleName, styles.paragraphRunStyles)` als `baseMarks` übergeben (dieselbe
   `marksFor`-Hilfsfunktion, die für Spans schon existiert, um eine zweite Map
   parametrisiert).
5. Spans überschreiben/ergänzen weiterhin wie bisher (`[...marks, ...marksFor(spanStyleName)]`)
   — eine explizite Span-Formatierung muss Vorrang vor der geerbten Absatzfarbe
   behalten (ODF-Kaskadenlogik: näher am Text gewinnt).

**Fix-Skizze DOCX (`docx/reader.ts`):**

1. `parseStylesXml`: zusätzlich zu `outlineLvlByStyleId` eine Map
   `runDefaultsByStyleId: Map<string, { color?: string; basedOn?: string }>` aufbauen —
   pro `<w:style w:type="paragraph">` das eigene `<w:rPr><w:color>` (falls vorhanden)
   sowie `w:basedOn/@w:val` erfassen.
2. Neue Hilfsfunktion `resolveStyleColor(styleId, runDefaultsByStyleId, depth = 0): string | null`,
   die bei fehlender eigener Farbe die `basedOn`-Kette hochläuft (mit Tiefenbegrenzung
   nach demselben Muster wie `MAX_TABLE_NESTING_DEPTH`, um zirkuläre `basedOn`-Referenzen
   in beschädigten Fremddateien abzufangen).
3. `paragraphToBlocks` löst `styleId` bereits auf (Zeile 149) — den resultierenden
   `resolveStyleColor(styleId, …)`-Wert an `decodeParagraphRuns(pEl, headingInfo, inheritedColor)`
   durchreichen.
4. `marksFromRunProperties(rPr, inheritedColor)`: Wenn der Lauf **kein** eigenes
   `<w:color>` (bzw. nur `"auto"`) trägt, aber `inheritedColor` vorhanden ist, die Mark
   trotzdem mit dem geerbten Wert setzen; ein explizites `<w:color>` am Lauf hat
   weiterhin Vorrang (Kaskade wie bei ODT).

Beide Fixes sind **rein additiv beim Import** (mehr Fälle erkennen `textColor`, nie
weniger) und ändern nichts an bereits funktionierenden Pfaden — das bestehende
`roundtrip.test.ts` bleibt unverändert grün. Umfang bewusst **nicht** erweitert auf
volle Stil-Kaskaden-Engines (z. B. `w:rStyle`/Zeichenformatvorlagen-Verweise am Lauf,
mehrstufige ODF-`parent-style-name`-Ketten über Absatzstile hinweg) — das wäre ein
eigenständiges, deutlich größeres Feature („Stilvererbung" allgemein) und ist nicht
Gegenstand der Anforderung `schriftfarbe`; hier wird nur die konkrete, mit echten
Dateien nachgewiesene Farb-Verlustquelle geschlossen.

### 3.3 Verhalten bei leerer Selektion (Anforderung 3.2/3.5, Grenzfall 1, Abnahmekriterium 4) — Entscheidung: nachrüsten

Die Anforderung verlangt in Abnahmekriterium 4 ausdrücklich eine **explizite,
festgehaltene Entscheidung**, ob der aktuelle No-Op bei leerer Selektion als
akzeptabler Fallback gilt oder nachgerüstet werden muss. Diese Datei trifft die
Entscheidung: **nachrüsten (Variante b aus Anforderung Abschnitt 3.2)**, aus folgenden
Gründen:

- Bei allen anderen Marks (`strong`/`em`/`underline`/`strike`) wirkt die Formatierung
  über `toggleMark` an der Schreibmarke automatisch auf nachfolgend getippten Text
  (ProseMirror „stored marks"). Ein Nutzer, der Fett an der Schreibmarke aktiviert und
  dann tippt, sieht fetten Text; derselbe Ablauf mit Schriftfarbe tut nichts. Diese
  Inkonsistenz **innerhalb derselben Toolbar** ist ein sachlicher Bedienfehler-Trigger,
  kein Style-Detail.
- Der Fix ist **nicht** invasiv: `prosemirror-state`s `Transaction` stellt
  `addStoredMark(mark)`/`removeStoredMark(markType)` bereits öffentlich bereit — exakt
  das, was `prosemirror-commands`s eigenes `toggleMark` intern für den `$cursor`-Fall
  nutzt (`node_modules/prosemirror-commands/dist/index.cjs`, Zeile 534–535:
  `dispatch(state.tr.addStoredMark(markType.create(attrs)))`). `applyMarkColor`/
  `clearMarkColor` können dieselbe API eins-zu-eins übernehmen, ohne neue Abhängigkeit.

**Fix in `src/formats/shared/editor/commands.ts`:**

```ts
export function applyMarkColor(markName: ColorMarkName, color: string): Command {
  return (state, dispatch) => {
    const { from, to, empty } = state.selection
    const markType = wordSchema.marks[markName]
    if (dispatch) {
      dispatch(empty ? state.tr.addStoredMark(markType.create({ color })) : state.tr.addMark(from, to, markType.create({ color })))
    }
    return true
  }
}

export function clearMarkColor(markName: ColorMarkName): Command {
  return (state, dispatch) => {
    const { from, to, empty } = state.selection
    const markType = wordSchema.marks[markName]
    if (dispatch) {
      dispatch(empty ? state.tr.removeStoredMark(markType) : state.tr.removeMark(from, to, markType))
    }
    return true
  }
}
```

Konsequenzen dieser Entscheidung, die in den neuen Tests (Abschnitt 6/8) abzudecken
sind:

- Testfall 3 der Anforderung („Cursor ohne Selektion setzen, Farbe wählen, dann
  tippen") ändert seinen erwarteten Ausgang: **neu getippter Text übernimmt jetzt die
  gewählte Farbe** (Grenzfall 1 der Anforderung ist damit **kein** Ist-Zustand mehr,
  sondern korrigiertes Soll-Verhalten — die Anforderungsdatei selbst bleibt unverändert,
  da sie die Entscheidung explizit an eine Nachfolgedatei delegiert; dieser Abschnitt
  **ist** diese Nachfolgedatei).
  - Sonderfall: Bei nicht-leerer, aber **kollabierbarer** `$cursor`-Situation ist
    `state.selection.empty` bereits das korrekte Signal (identisch zu `toggleMark`s
    Prüfung) — keine weitere Fallunterscheidung nötig.
- Der „⌫"-Button muss bei leerer Selektion konsistent ebenfalls wirken (auf
  `storedMarks`, nicht auf ein Dokument-Mark) — das ist durch denselben Fix in
  `clearMarkColor` bereits erledigt.
- Optional (nicht Teil dieses Fixes, siehe Abschnitt 3.5): Der Button könnte statt
  eines stillen No-Ops künftig `disabled` sein, wenn weder Selektion noch
  `storedMarks`-Ziel sinnvoll ist — mit obigem Fix entfällt dieser Bedarf jedoch, da es
  nach dem Fix keinen Fall mehr gibt, in dem die Aktion wirkungslos bliebe.

### 3.4 Kontinuierliches `onChange` + `view.focus()` während offenem Farbwähler (Anforderung 3.4, Grenzfall 16) — Fix

`Toolbar.tsx` bindet aktuell `onChange={(e) => run(view, applyMarkColor('textColor', e.target.value))}`
direkt auf `<input type="color">` (Zeile 148); React bildet `onChange` für
`<input type="color">` auf das native `input`-Event ab. In Chromium-Browsern feuert
dieses Event nachweislich fortlaufend während der Nutzer im geöffneten
Farbwähler-Dialog zieht — jeder Zwischenwert löst `run()` aus, das wiederum
`view.dispatch(...)` **und** `view.focus()` aufruft (Zeile 23–26), während der Fokus
eigentlich im nativen Dialog liegen sollte. Das erzeugt potenziell (a) viele
Zwischen-Undo-Schritte für eine einzige Nutzerabsicht „Farbe X wählen" und (b) das
Risiko, dass der wiederholte Fokusentzug den nativen Dialog vorzeitig schließt (beides
muss laut Anforderung zusätzlich noch **im echten Browser verifiziert** werden — dieser
Fix beseitigt aber unabhängig vom Verifikationsergebnis die Ursache, statt nur ihre
Symptome zu beobachten).

**Fix:** Statt auf das (mehrfach feuernde) `input`-Event zu reagieren, nur auf das
native, einmalig beim Schließen/Bestätigen feuernde `change`-Event reagieren. React hat
dafür keinen synthetischen Prop-Namen, der sich vom `input`-Event unterscheidet —
daher per `ref` + `addEventListener('change', …)`:

```tsx
function ColorMarkControl({
  view,
  markName,
  label,
  title,
  removeTitle,
}: {
  view: EditorView
  markName: ColorMarkName
  label: string
  title: string
  removeTitle: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const handleChange = (event: Event) => {
      run(view, applyMarkColor(markName, (event.target as HTMLInputElement).value))
    }
    el.addEventListener('change', handleChange)
    return () => el.removeEventListener('change', handleChange)
  }, [view, markName])

  return (
    <>
      <label className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400" title={title}>
        <span aria-hidden>{label}</span>
        <input ref={inputRef} aria-label={title} type="color" className="w-6 h-6 p-0 border-0 bg-transparent" />
      </label>
      <button
        type="button"
        title={removeTitle}
        onMouseDown={(e) => {
          e.preventDefault()
          run(view, clearMarkColor(markName))
        }}
        className="px-1.5 py-1 text-xs rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
      >
        ⌫
      </button>
    </>
  )
}
```

`Toolbar.tsx` ersetzt die beiden bisherigen Label/Input/Button-Blöcke (Zeilen 142–161
für Textfarbe, 162–181 für Hervorhebung) durch je einen Aufruf
`<ColorMarkControl view={view} markName="textColor" label="A" title="Textfarbe" removeTitle="Textfarbe entfernen" />`
bzw. mit `markName="highlight"`/`label="🖍"`/`title="Hervorhebungsfarbe"`. Diese
Umstellung ist bewusst **gemeinsam für `textColor` und `highlight`** vorgesehen (der
gleiche Bug-Pfad betrifft beide, siehe `textmarker-farbe-req.md` — geteilter Code laut
Demarkation in `schriftfarbe-req.md` Abschnitt 0), damit nicht zwei beinahe identische,
aber leicht unterschiedliche Steuerelemente im selben Toolbar entstehen.

Ohne Zugriff auf einen echten Chromium/Firefox/Safari zur Laufzeit dieser Prüfung kann
nicht abschließend bestätigt werden, wie stark sich das Verhalten je Browser
unterscheidet — das bleibt Teil der in Abschnitt 6 der Anforderung geforderten
Browser-Verifikation (Testfall 12, Grenzfall 16). Der Fix ist unabhängig vom
Prüfergebnis sinnvoll: Er reduziert in jedem Browser die Anzahl ausgelöster
Transaktionen auf höchstens eine pro abgeschlossener Farbwahl.

### 3.5 Sichtbares Label „A" (Anforderung Abschnitt 2 Punkt 1) — keine Pflichtänderung, optionaler Vorschlag

Die Anforderung verlangt hier ausdrücklich nur **Verifikation/Vergleich**, keine
Korrektur („Bedienelement... zu verifizieren, ob ein reiner Buchstabe ohne
Farbunterlegung/Icon dafür ausreicht"). Dieser Plan schlägt **optional**, nicht
blockierend für die Abnahme, eine minimale CSS-Ergänzung vor, die dem in der
Anforderung genannten Word/LibreOffice-Vorbild (farbiger Unterstrich unter „A" als
Vorschau) entspricht:

```tsx
<span aria-hidden style={{ borderBottom: `2px solid ${lastPickedTextColor}` }}>A</span>
```

Dafür müsste die Toolbar den zuletzt gewählten Wert in einem lokalen State
(`useState<string>`) halten und beim `onChange`/`change`-Handler aktualisieren — kein
Bezug zur Selektion (siehe Abschnitt 3.6), rein kosmetisch. **Nicht Teil der
Abnahmekriterien**, hier nur festgehalten, damit die Möglichkeit dokumentiert, aber
nicht stillschweigend übergangen ist.

### 3.6 Aktiv-/Ist-Zustands-Anzeige (Anforderung Abschnitt 2 Punkt 4, 3.3) — keine Pflichtänderung, Ist-Zustand bestätigt

Bestätigt: Es existiert keinerlei Mechanismus, der den Farbchip auf die tatsächliche
`textColor`/`highlight`-Mark an `$from` synchronisiert (anders als `MarkButton`s
`aria-pressed` über `markType.isInSet(...)`, Zeile 42 in `Toolbar.tsx`). Die
Anforderung verlangt hier ausdrücklich **keine** Korrektur, sondern nur Klärung/
Dokumentation, ob das Absicht ist. Diese Datei hält fest: **Bewusst nicht behoben in
diesem Umsetzungsschritt** — Begründung: Ein `<input type="color">` kann seinen
sichtbaren Wert zwar per `value`-Prop synchronisieren, aber bei **gemischter** Selektion
(Grenzfall 6/Abschnitt 3.3) gibt es keine sinnvolle einzelne Farbe zum Anzeigen (anders
als bei einem reinen Bool-Toggle, wo „aktiv"/„inaktiv" immer eindeutig ist) — die
naheliegende Lösung („Farbe an `$from`") wäre bei einer Selektion mit mehreren Farben
irreführend, nicht nur unvollständig. Eine vollständige Lösung (z. B. ein
Mischzustands-Symbol wie in Word „mehrere Formate") wäre ein eigenständiges
UI-Feature und **kein** Teil dieser Anforderung. Sollte künftig verlangt werden: Am
ehesten geeigneter Ansatzpunkt wäre ein `useEffect`, der bei jedem `state`-Wechsel
`view.state.selection.$from.marks()` nach `textColor`/`highlight` durchsucht und den
`value`/`defaultValue` des jeweiligen `<input type="color">` aktualisiert (nur
eindeutiger Fall, sonst unverändert lassen) — hier nur als Diskussionsgrundlage
vermerkt, nicht umzusetzen.

---

## 4. Dateigenauer Änderungsplan — bestehende Dateien

| # | Datei | Änderung | Typ |
|---|---|---|---|
| 1 | `src/formats/shared/editor/commands.ts` | `applyMarkColor`/`clearMarkColor` nutzen `addStoredMark`/`removeStoredMark` statt `return false` bei leerer Selektion (Abschnitt 3.3) | Fix |
| 2 | `src/formats/shared/editor/Toolbar.tsx` | Neue `ColorMarkControl`-Komponente ersetzt die beiden Label/Input/Button-Blöcke für `textColor` und `highlight`; `change`- statt `onChange`(`input`)-Bindung (Abschnitt 3.4) | Fix |
| 3 | `src/formats/docx/writer.ts` | `escapeXml(...)` um den Farbwert in `<w:color w:val="…">` und `<w:shd … w:fill="…">` (Abschnitt 3.1) | Fix |
| 4 | `src/formats/docx/reader.ts` | `parseStylesXml` liest zusätzlich `w:rPr/w:color` + `w:basedOn` je Absatzstil; neue `resolveStyleColor`-Hilfsfunktion; `decodeParagraphRuns`/`marksFromRunProperties` erhalten geerbte Farbe als Fallback (Abschnitt 3.2) | Fix |
| 5 | `src/formats/odt/reader.ts` | `parseAutomaticStyles` liest zusätzlich `style:text-properties` aus `family="paragraph"`-Stilen in neue Map `paragraphRunStyles`; `decodeInline` erhält `baseMarks`-Parameter; `paragraphToBlocks`/Heading-Zweig übergeben aufgelöste Absatz-Marks (Abschnitt 3.2) | Fix |
| 6 | `src/formats/shared/schema.ts` | **Keine funktionale Änderung.** Mark-Definition ist bereits korrekt und ausreichend für alle in der Anforderung beschriebenen Fälle | — |
| 7 | `src/formats/odt/writer.ts` | **Keine Änderung.** `TextStyleRegistry`/`escapeXml`-Nutzung bereits korrekt | — |
| 8 | `src/formats/odt/styleRegistry.ts` | **Keine Änderung.** `isEmpty()`/Dedup-Verhalten bereits korrekt für Grenzfall 9/14 der Anforderung (siehe Abschnitt 5) | — |
| 9 | `src/formats/docx/styleDefs.ts` | **Keine Änderung** (nur Überschriften-/Nummerierungs-Styles des eigenen Writers, kein Bezug zur Farbvererbung beim *Lesen* fremder Dateien) | — |
| 10 | `src/formats/shared/editor/WordEditor.tsx` | **Keine Änderung.** Weder Keymap-Ergänzung (laut Anforderung Abschnitt 2 Punkt 5 kein Soll) noch Anpassung an `reconcileSelectionOnClick` nötig (bereits formatneutral) | — |

Es wird **keine neue Datei im Produktivcode** angelegt — alle Fixes sind Änderungen an
bereits vorhandenen Dateien. Der weit überwiegende Teil des Aufwands liegt in neuen
Testdateien (Abschnitte 7–9).

---

## 5. Bereits korrekt — bewusst nicht geänderter Code

- **`schema.ts`** — Mark-Definition, `parseDOM`/`toDOM` bereits vollständig für den
  Anforderungsumfang; kein `themeColor`/Palettenbezug im Schema nötig, da explizit aus
  dem Anforderungsumfang ausgeschlossen (Abschnitt 5 der Anforderung).
- **`odt/styleRegistry.ts` `isEmpty()`** — behandelt jeden gesetzten `color`-String,
  inklusive `"#000000"`, als „nicht leer" (Zeile 13: `!props.color` ist bei
  `"#000000"` falsy nur für den leeren String, nicht für einen gesetzten Hex-Wert) →
  Grenzfall 9 der Anforderung („explizites Schwarz vs. keine Farbe") ist bereits
  strukturell korrekt abgedeckt, nur der Test dafür fehlt (Abschnitt 8).
- **`docx/writer.ts` `runPropertiesXml`** — schreibt für Hervorhebung bewusst
  `<w:shd .../>` statt `<w:highlight .../>`, um freie RGB-Werte zu erlauben (Anforderung
  Abschnitt 3.7) — für Schriftfarbe selbst besteht dieses Problem nicht (`w:color`
  erlaubt bereits beliebige RGB-Werte), keine Änderung nötig.
- **`prosemirror-tables`/`CellSelection`** — `applyMarkColor`/`clearMarkColor` nutzen
  `tr.addMark(from, to, …)`/`tr.removeMark(from, to, …)` mit `state.selection.from/to`;
  bei einer `CellSelection` decken `from`/`to` den **äußeren** umschließenden Bereich ab
  (nicht nur die einzelnen Zellen-`ranges`), was für Grenzfall 3 der Anforderung
  („Selektion über eine Tabellen-Zellgrenze hinweg") ausreicht, da `addMark`/`removeMark`
  ohnehin über `nodesBetween` jeden Textknoten im Bereich erreicht, unabhängig von
  Zellgrenzen — **zu verifizieren über echte Bedienung** (Abschnitt 7), nicht rein
  durch Codelektüre, da `CellSelection.from`/`.to` sich in älteren
  `prosemirror-tables`-Versionen abweichend verhalten haben; keine Codeänderung
  vorgesehen, nur gezielter Test.
- **`commands.ts` `setHeading`** — ändert laut Code (Zeile 40–55) ausschließlich den
  Block-Typ via `tr.setBlockType`, fasst keine Marks an → Anforderung Abschnitt 3.9
  Punkt 2 ist bereits erfüllt, nur der Test fehlt.

---

## 6. Fixture-Inventar — reale Dateien für Rundreise-/Grenzfall-Tests

Durch programmatisches Entpacken (siehe Methodik, Abschnitt 1) ermittelt — Auszug, für
Details siehe Abschnitt 9 (Testzuordnung):

**DOCX** (`word/document.xml` bzw. `word/styles.xml` geprüft):

| Datei | Befund | Eignung |
|---|---|---|
| `Tika-792.docx` | ein Lauf `w:val="FF0000"` (Großschreibung) | Rundreise-Testfall 6/7, Grenzfall 4.10 |
| `drawing.docx` | mehrere Läufe `FF0000`/`0000FF` | Rundreise-Testfall 6, Kombinationstest mit Bildern |
| `TestDocument.docx` | `800000`, `E6FF00` | zusätzliche Fremddatei-Stichprobe |
| `SampleDoc.docx` | `w:val="548DD4" w:themeColor="text2" w:themeTint="99"` (Fallback-`val` **vorhanden**) | Grenzfall 11 — Theme-Farbe mit RGB-Fallback: aktueller Reader liest `#548DD4` korrekt (ignoriert nur die Theme-Metadaten, wie von der Anforderung als akzeptabler Fallback beschrieben) |
| `shapes-with-text.docx` | `w:val="000000" w:themeColor="dark1"`, 20 Vorkommen | Grenzfall 11, zweite unabhängige Fremddatei |
| `52288.docx` | `ChapterNumber`/`ChapterName`-Absatzstile mit `w:rPr/w:color`, **kein** Lauf-`w:color` | Abschnitt 3.2-Fix, siehe dort — muss nach Fix eine `textColor`-Mark erzeugen |
| `61787.docx`, `60329.docx`, `bug57031.docx`, `bug59058.docx`, `bug65649.docx` | überwiegend `#000000` (Standardfarbe explizit gesetzt) | Grenzfall 9 („explizit Schwarz vs. keine Farbe") an echten Dateien |

→ Kein Fixture mit `w:themeColor` **ohne** brauchbaren `w:val`-Fallback (also
`w:val="auto"` + `w:themeColor`) gefunden — dieser Teilfall aus Grenzfall 11 der
Anforderung muss, wie in `unterstrichen-einfach-code.md` methodisch vorgemacht, über
eine handgebaute XML-Datei getestet werden (Abschnitt 7.1).

**ODT** (`content.xml` geprüft):

| Datei | Befund | Eignung |
|---|---|---|
| `coloredParagraph.odt` | einfacher `fo:color`-Fall | Rundreise-Testfall 6 (Basisfall) |
| `coloredTable_MSO15.odt` | `#FF0000`/`#00B0F0`/`#7030A0` in Tabellenzellen | Grenzfall 3 (Tabellen-Zellgrenze) mit echter Fremddatei |
| `text-color-from-paragraph.odt` | Absatzstil-Farbe **ohne** Span (siehe Abschnitt 3.2) | Primär-Fixture für den Abschnitt-3.2-Fix; enthält zusätzlich den Fall „leerer Absatz mit `P1`-Stil" (Zeile im `content.xml`: `<text:p text:style-name="P1"/>`) — nach Fix muss auch ein leerer, aber farbig formatierter Absatz keine Exception werfen |
| `spanInheritanceTest.odt` | verschachtelte `<text:span>` mit `style:parent-style-name`-Verweisen auf **`office:styles`** (`BACKGROUND_YELLOW`, `BOLD`, `ITALIC` in `styles.xml`, nicht `content.xml`) | zeigt die **allgemeine** Stil-Vererbungs-Architektur, die Grenzfall 12 zugrunde liegt — dient als Regressionstest, dass der engere Fix aus Abschnitt 3.2 (nur `family="paragraph"`) diesen Fall **nicht** löst (bewusst außerhalb des Fix-Umfangs, siehe Abgrenzung in Abschnitt 3.2 Ende) |
| `character-styles.odt` | 13 automatische Textstile (`T1`…`T13`) plus ein Span mit `Default_20_Paragraph_20_Font` (gemeinsamer, nicht-automatischer Name) | Grenzfall 12 — Nachweis, dass ein Span auf einen nicht in `office:automatic-styles` vorhandenen Namen verweisen kann |
| `ListStyleResolution.odt`, `hyperlinkSpaces.odt`, `underlineNone.odt` | mehrere unterschiedliche Farbwerte kombiniert mit anderen Marks | Testfall 5/Rundreise-Testfall 8 (Kombination mit Fett/Unterstrichen/Hervorhebung) |

---

## 7. Neue/erweiterte Unit-Tests (Vitest)

### 7.1 `src/formats/docx/__tests__/textColor.test.ts` (neu)

Reader-Tests für Fälle, die die bestehende `roundtrip.test.ts` bewusst nicht abdeckt
(die testet nur, was der eigene Writer erzeugt):

- `w:val="FF0000"` (Großschreibung) → Mark `#FF0000` (unverändert übernommen, case
  bewusst nicht normalisiert, siehe Anforderung Abschnitt 3.8 — Test prüft
  **case-insensitiven** Vergleich, nicht exakte Groß-/Kleinschreibung, um nicht selbst
  in den in Abschnitt 3.8 beschriebenen Fallstrick zu laufen).
- `w:val="auto"` → keine Mark (bestätigt bestehendes Verhalten).
- `w:val="auto" w:themeColor="accent1"` (**ohne** brauchbaren Fallback, handgebaut, da
  kein Fixture das abdeckt, siehe Abschnitt 6) → keine Mark, Text bleibt in
  Standardfarbe (Grenzfall 11, dokumentierter Fallback).
- Absatzstil mit `w:rPr/w:color`, Lauf ohne eigenes `w:rPr` → nach Fix aus
  Abschnitt 3.2: Mark mit geerbter Farbe (gegen echtes Fixture `52288.docx`, Absatz
  „CHAPTER 1").
- Lauf mit eigenem `w:color`, Absatzstil mit **anderer** Farbe → Lauf-Farbe gewinnt
  (Kaskade, siehe Abschnitt 3.2 Fix-Skizze Punkt 4).
- `w:basedOn`-Kette über zwei Ebenen (Stil A ohne Farbe, `basedOn` Stil B mit Farbe) →
  Farbe von B wird übernommen.
- Zirkuläre `w:basedOn`-Referenz (`A basedOn B`, `B basedOn A`, konstruiert) → kein
  Stack-Overflow/Endlosschleife, `resolveStyleColor` bricht nach Tiefenlimit ab und
  liefert `null` (analog zum bestehenden `MAX_TABLE_NESTING_DEPTH`-Muster).
- `<w:color w:val="…">`-Attributwert mit `"`/`&` (pathologisch, simuliert korrupte
  Fremddatei) → Reader übernimmt ihn unverändert als Mark-Attribut (kein Absturz beim
  **Lesen**); separater Test in `docx/__tests__/writer-escaping.test.ts` (neu) prüft,
  dass der **Export** desselben Werts nach dem Fix aus Abschnitt 3.1 weiterhin
  valides, mit `DOMParser` fehlerfrei parsbares XML erzeugt.

### 7.2 `src/formats/odt/__tests__/textColor.test.ts` (neu)

- Gegen `text-color-from-paragraph.odt`: mindestens der Absatz „Entire paragraph in
  red." trägt nach Fix aus Abschnitt 3.2 eine `textColor`-Mark mit `#ff0000` auf jedem
  Textknoten; der leere `<text:p text:style-name="P1"/>`-Absatz wird ohne Exception
  verarbeitet (leerer `content`, keine Marks nötig, da kein Text vorhanden).
- Gegen `character-styles.odt`: Span mit `Default_20_Paragraph_20_Font` → **dokumentiert
  bestätigtes** Fallback-Verhalten (keine Mark, da `office:styles` weiterhin nicht
  gelesen wird — das ist die bewusst nicht in Abschnitt 3.2 gefixte, engere
  Grenzfall-12-Lücke; Test hält das **Ist-Verhalten nach dem Fix** fest, nicht als
  unentdeckten Bug).
- Gegen `spanInheritanceTest.odt`: bestätigt, dass `BACKGROUND_YELLOW`/`BOLD`/`ITALIC`
  (aus `office:styles` in `styles.xml`) weiterhin nicht aufgelöst werden — derselbe
  Zweck wie oben, nur mit einer zweiten unabhängigen Datei.
- Konstruiertes ODT (handgebaut wie in `roundtrip.test.ts`): `fo:color="notacolor"` →
  Reader übernimmt den String unverändert (Grenzfall 10 der Anforderung, dokumentierter
  Fallback: kein Absturz, `toDOM` gibt einen ungültigen CSS-Wert weiter, den der
  Browser stillschweigend ignoriert — das wird als **Verhalten**, nicht als zu
  behebender Bug, getestet).
- `props.color = "#000000"` vs. kein Mark → `TextStyleRegistry.styleNameFor` erzeugt
  zwei unterschiedliche Stilnamen (Grenzfall 9, gegen `isEmpty()` aus Abschnitt 5).
- Sehr viele unterschiedliche Farbwerte (Regenbogen-Text, Grenzfall 15) → Export läuft
  in vertretbarer Zeit durch, `styleNameFor` erzeugt für N unterschiedliche Farben
  exakt N Stildefinitionen (keine Explosion durch z. B. quadratisches Verhalten).

### 7.3 Erweiterung `src/formats/docx/__tests__/roundtrip.test.ts` und `.../odt/__tests__/roundtrip.test.ts`

- Testfall „explizites `#000000` vs. keine Farbe" (Grenzfall 9, Rundreise-Testfall 9):
  ein Textlauf mit `{ type: 'textColor', attrs: { color: '#000000' } }`, ein zweiter
  Lauf ganz ohne Mark → nach Rundreise strukturell unterscheidbar (DOCX: erster Lauf
  hat `<w:rPr><w:color w:val="000000"/></w:rPr>`, zweiter Lauf hat **kein** `<w:rPr>`;
  ODT: erster Lauf referenziert einen `Tn`-Stil mit `fo:color`, zweiter Lauf hat
  **keinen** `<text:span>`).
- Testfall „nur Schriftfarbe, keine weiteren Marks" (Grenzfall 14): Dokument mit genau
  einem farbigen Lauf und sonst keiner Formatierung → `isEmpty()`/Style-Erzeugung
  bleibt korrekt, keine unnötigen leeren Stildefinitionen.
- Testfall „Kombination Fett + Unterstrichen + Schriftfarbe + Hervorhebungsfarbe"
  (Rundreise-Testfall 8) — als konstruiertes Dokument, ergänzend zur E2E-Version in
  Abschnitt 8.

---

## 8. Neue E2E-Tests (Playwright) — Kern der Anforderung

### 8.1 `tests/e2e/schriftfarbe.spec.ts` (neu)

Struktur/Stil analog zu `tests/e2e/docx.spec.ts`/`odt.spec.ts`/
`selection-regression.spec.ts` (gleiche `odtCard`/`docxCard`-Locator-Helfer
wiederverwenden). Deckt Abschnitt 7 („Testfälle") der Anforderung ab:

- **Testfall 1/2**: Text markieren, `input[aria-label="Textfarbe"]` per `fill('#ff0000')`
  setzen (Playwright kann `<input type="color">` direkt per `fill` auf einen Hex-Wert
  setzen, ohne den nativen Dialog zu öffnen — das reicht für die Formatierungslogik;
  der native Dialog selbst ist Testfall 12/„Sichtprüfung", siehe unten), Text erscheint
  in `span[style*="color: #ff0000"]` (oder äquivalenter berechneter Stil); „⌫"-Klick →
  Mark verschwindet.
- **Testfall 3** (nach Fix aus Abschnitt 3.3, **korrigierter** Erwartungswert): Cursor
  ohne Selektion setzen, Farbe wählen, tippen → neuer Text **übernimmt** die Farbe. Test
  dokumentiert explizit im Testnamen, dass dies die in `schriftfarbe-code.md`
  Abschnitt 3.3 getroffene Entscheidung verifiziert, nicht den ursprünglichen
  Ist-Zustand aus der Anforderung.
- **Testfall 4/Grenzfall 6**: Gemischte Selektion (ein Teil `#ff0000`, ein Teil ohne
  Farbe) → neue Farbe setzen überschreibt einheitlich die gesamte Selektion, keine
  JS-Exception (Playwright `page.on('pageerror', …)`-Assertion).
- **Testfall 5**: Fett + Unterstrichen + Schriftfarbe + Hervorhebungsfarbe gleichzeitig
  setzen, alle vier unabhängig wieder entfernbar (je ein „⌫"/Toggle-Klick, restliche
  drei bleiben erhalten).
- **Testfall 6/Grenzfall 18** (Pflicht, siehe Abschnitt 8.2 zur Verankerung).
- **Testfall 7**: Tippen → Farbe A → Farbe B → Entfernen → Tippen, jeweils per
  `Strg+Z` einzeln zurücknehmen, `Strg+Y` wiederherstellen — Anzahl der tatsächlich
  ausgelösten `dispatchTransaction`-Aufrufe wird nicht direkt gezählt (kein Testhook
  dafür vorhanden), aber das **Endergebnis** jedes Schritts wird geprüft; zusätzlich
  ein expliziter Kommentar im Test, der auf Abschnitt 3.4 dieses Plans verweist (der
  Fix dort reduziert die Anzahl der Zwischenschritte auf höchstens einen pro
  `fill()`-Aufruf).
- **Testfall 9/Grenzfälle 1–19**: je ein dedizierter, benannter Test statt eines
  Sammeltests (siehe Auflistung unten) — u. a.:
  - Grenzfall 2 (Selektion über Absatzgrenze hinweg).
  - Grenzfall 3 (Selektion über Tabellenzellgrenze hinweg — Tabelle einfügen, beide
    Zellen selektieren, Farbe setzen, beide Zellen zeigen die Farbe, keine
    Vermischung mit einer dritten, nicht selektierten Zelle).
  - Grenzfall 4 (reine Leerzeichen-Selektion → Mark technisch gesetzt).
  - Grenzfall 5 (Selektion von Text bis in einen benachbarten Bild-Block — `image` ist
    laut `schema.ts` ein Block-, kein Inline-Node, siehe methodisch identischer Befund
    in `unterstrichen-einfach-code.md` Abschnitt 3.4; der tatsächlich testbare Fall ist
    eine Selektion, die einen Textabsatz und den direkt folgenden `image`-Block
    umspannt).
  - Grenzfall 7 (erneutes Anwenden derselben Farbe → keine doppelte Mark, geprüft über
    exportiertes XML: genau ein `<w:color>`/ein `Tn`-Stil, nicht zwei verschachtelte).
  - Grenzfall 8 (Weiß auf Weiß: `#ffffff` setzen, kein Absturz, Wert bleibt im
    exportierten XML erhalten, unabhängig von der visuellen Lesbarkeit).
  - Grenzfall 17 (Undo/Redo über Sequenz, s. Testfall 7).
  - Grenzfall 19 (Fokus bleibt nach Farbwahl im Editor, Selektion bleibt sichtbar aktiv
    — `expect(editor).toBeFocused()` nach `fill()` auf dem Farb-Input).
- **Testfall 10**: Screenshot-Vergleich Editor-Ansicht vor Export vs. nach Re-Import
  derselben Datei (Playwright `toHaveScreenshot()` auf einen definierten Editor-
  Ausschnitt).
- **Testfall 11**: Rendering-Prüfung „⌫" — Playwright kann keine echte visuelle
  Glyphen-Lesbarkeit über verschiedene Betriebssysteme automatisiert prüfen; hier wird
  stattdessen (a) sichergestellt, dass der Button ein nicht-leeres Textalternativ
  besitzt und im Accessibility-Tree als Button mit sichtbarem Text auftaucht, und (b)
  im Plan (Abschnitt 10) ein manueller Prüfschritt auf mind. zwei System/Browser-
  Kombinationen vermerkt, wie in Abnahmekriterium 6 gefordert.
- **Testfall 12**: Tastatur-Bedienbarkeit — `page.keyboard.press('Tab')` bis Fokus auf
  dem Farb-Input liegt, dann Fokus-Sichtbarkeit prüfen; **Hinweis:** Das tatsächliche
  Öffnen des nativen Farbwähler-Dialogs per Enter/Leertaste lässt sich mit Playwright
  nicht zuverlässig automatisiert prüfen (nativer OS-Dialog, kein DOM) — dieser Teil
  bleibt ein **manueller** Prüfschritt (siehe Abschnitt 10), die automatisierte
  Tab-Erreichbarkeit selbst ist aber testbar und wird getestet.

### 8.2 Erweiterung `tests/e2e/selection-regression.spec.ts` (Pflicht, Grenzfall 18/Testfall 6)

Analog zum bestehenden Bold-Regressionstest, im selben `describe`-Block ergänzt (nicht
neue Datei — Abnahmekriterium 3 verlangt „dauerhaft in der Testsuite verankert"):

```ts
test('same regression with "Schriftfarbe" instead of "Fett" (Grenzfall 18 / Testfall 6)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.locator('input[aria-label="Textfarbe"]').fill('#ff0000')
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
  // Beide Absätze müssen weiterhin die rote Farbe zeigen — Kernpunkt von Grenzfall 18
  // (nicht nur "Absätze überleben", sondern "Absätze behalten ihre jeweils korrekte
  // Formatierung").
  await expect(editor.locator('p', { hasText: 'Hallo, das ist ein Test.' })).toHaveCSS('color', 'rgb(255, 0, 0)')
})
```

### 8.3 Rundreise-E2E-Tests (Abschnitt 6 der Anforderung → Abnahmekriterium 2)

Neuer `test.describe`-Block in `schriftfarbe.spec.ts`:

- **Rundreise 1/2**: DOCX-/ODT-Eigenrundreise über echte Toolbar-Bedienung (Farbe per
  `fill()` setzen, exportieren, erneut importieren, Farbe erneut sichtbar) —
  entspricht Abnahmekriterium 2 zusammen mit Rundreise 6/7.
- **Rundreise 3/4/5**: Cross-Format DOCX→ODT, ODT→DOCX, doppelte Cross-Format-Rundreise.
- **Rundreise 6/7 (Pflicht laut Abnahmekriterium 2)**: Upload von
  `tests/fixtures/external/docx/Tika-792.docx` (echte, nicht selbst erzeugte
  Word-Datei mit `w:val="FF0000"`) → Farbe im Editor sichtbar → Export → exportiertes
  `word/document.xml` **per Regex/`DOMParser`, ohne `readDocx` zu verwenden** (Muster
  aus `docx.spec.ts`, `expect(documentXml).toContain('<w:b/>')`) auf
  `/<w:color\s+w:val="[Ff][Ff]0000"\s*\/>/` geprüft — das erfüllt „unabhängig vom
  anwendungseigenen Reader rückgelesen" (Abnahmekriterium 2/Rundreise-Testfall 7) ohne
  externe Python-Toolchain, siehe Begründung in Abschnitt 9. Analog für ODT mit
  `coloredParagraph.odt` und `style:style ... fo:color="#…"` im exportierten
  `content.xml`.
- **Rundreise 8**: kombiniert fett + unterstrichen + farbig sowie zweiter Lauf mit
  Schriftfarbe + Hervorhebungsfarbe gleichzeitig, über alle Rundreisen hinweg stabil.
- **Rundreise 9**: `#000000` explizit vs. keine Farbe, s. Abschnitt 7.3 (hier zusätzlich
  über echte Bedienung statt nur konstruiertem JSON).

### 8.4 Grenzfälle 11/12 mit echten Fremddateien (Abnahmekriterium 5)

- Grenzfall 11: Upload von `SampleDoc.docx` **und** `shapes-with-text.docx` (zwei
  unabhängige echte Word-Dateien mit `w:themeColor`+Fallback-`w:val`) → Editor zeigt die
  im `w:val` hinterlegte RGB-Farbe; dokumentierter Kommentar im Test, dass die
  Theme-Zuordnung selbst (`accent1`/`dark1` etc.) bewusst nicht ausgewertet wird
  (Anforderung Abschnitt 5, Nicht-Ziel).
- Grenzfall 12: Upload von `spanInheritanceTest.odt` **und** `character-styles.odt`
  (zwei unabhängige echte ODT-Dateien mit Bezug auf `office:styles`) → für die
  betroffenen Textstellen wird dokumentiert, dass die dort definierte Formatierung
  (Fett/Kursiv/Hervorhebung bzw. der `Default_20_Paragraph_20_Font`-Verweis) nach
  aktuellem Stand **nicht** übernommen wird (Test prüft explizit auf das **Fehlen**
  der jeweiligen Mark, mit Kommentar „bestätigter Fallback, kein Fix in diesem
  Umsetzungsschritt, siehe schriftfarbe-code.md Abschnitt 3.2").

---

## 9. Unabhängige Parser-Validierung (Rundreise-Testfall 7 / Abnahmekriterium 2)

Wie in `unterstrichen-einfach-code.md` Abschnitt 7 begründet, hat dieses Repo keine
Python-Toolchain; „python-docx" wörtlich einzubinden wäre unverhältnismäßig für einen
reinen Verifikationsschritt. Zwei-stufiger Ansatz, identisch übernommen:

1. **Automatisiert**: Die Playwright-Tests aus Abschnitt 8.3 prüfen den exportierten
   XML-String direkt per Regex/`DOMParser`, **ohne** `readDocx`/`readOdt` zu verwenden
   — das erfüllt den Zweck „nicht nur mit dem eigenen Reader rückgelesen" für die
   automatisierte Suite.
2. **Manuell, einmalig vor Status-Wechsel auf „verifiziert"**: Eine exportierte
   Test-DOCX/-ODT mit `python-docx` bzw. einem ODF-Validator/LibreOffice öffnen und das
   Ergebnis als Vermerk in einer Nachfolgedatei bzw. als Kommentar in dieser Datei
   festhalten. Kein `scripts/`-Hilfsskript vorgesehen, da nicht zwingend erforderlich.

---

## 10. Manuelle Prüfschritte (nicht automatisierbar, aber Teil der Abnahme)

Explizit festgehalten, damit sie nicht stillschweigend übergangen werden
(Abnahmekriterium 6, Anforderung Testfall 11/12):

1. **„⌫"-Glyph-Rendering** auf mindestens zwei System-/Browser-Kombinationen (z. B.
   Windows+Chrome und macOS+Safari oder Linux+Firefox) — Ergebnis (lesbar / Fragezeichen
   / leeres Rechteck) ist in dieser Datei oder einer Nachfolgedatei zu vermerken, sobald
   durchgeführt.
2. **Natives Farbwähler-Dialogverhalten** — öffnet sich der Dialog zuverlässig per
   Klick **und** per Tastatur (Tab, dann Enter/Leertaste) in mindestens Chrome,
   Firefox und einem WebKit-Browser; lässt sich ein Hex-Wert im nativen Dialog direkt
   eingeben.
3. **Undo-Schrittanzahl** nach dem Fix aus Abschnitt 3.4 — durch tatsächliches Ziehen im
   nativen Dialog (nicht per Playwright `fill()`, das den Dialog nicht öffnet) bestätigen,
   dass nach dem Fix höchstens ein Undo-Schritt pro abgeschlossener Farbwahl entsteht.
4. Ergebnis von 1–3 fließt in die endgültige Statusänderung „vorhanden" → „verifiziert"
   in `specs/FEATURE-BACKLOG.md` ein, sobald durchgeführt — nicht Teil dieses
   Umsetzungsplans selbst.

---

## 11. Offene Abhängigkeiten (nur dokumentieren, kein Code jetzt)

- **`formatierung-loeschen`** (Backlog-Status „fehlt"): muss nach Umsetzung
  `wordSchema.marks.textColor` mit in ihre Clear-Logik aufnehmen (Anforderung
  Abschnitt 3.6). Kein Code jetzt.
- **`textmarker-farbe`**: teilt sich `applyMarkColor`/`clearMarkColor`,
  `ColorMarkControl` (Abschnitt 3.4) und den `escapeXml`-Fix (Abschnitt 3.1) mit dieser
  Anforderung — bei separater Verifikation von `textmarker-farbe` auf denselben
  Codestand verweisen, nicht duplizieren (Demarkation gemäß `schriftfarbe-req.md`
  Abschnitt 0).
- **`schriftart-waehlen`/`schriftgroesse-waehlen`** (Status „fehlt"): keine inhaltliche
  Abhängigkeit, nur Nachbar-Toolbar-Gruppe — falls künftig als eigene `<select>`-Elemente
  neben dem Farbwähler eingefügt, ist die Toolbar-Zeile (`Toolbar.tsx`) an dieser Stelle
  ohnehin bereits vorbereitet (Trenner-`div`-Muster).
- **Allgemeine Stilvererbung** (`w:rStyle`, mehrstufige ODF-`parent-style-name`-Ketten
  über `office:styles`): Der Fix in Abschnitt 3.2 deckt nur den mit echten Dateien
  nachgewiesenen engsten Fall (Absatzstil-Ebene). Eine vollständige Kaskaden-Engine wäre
  ein eigenständiges, größeres Feature (relevant auch für Fett/Kursiv/Unterstrichen/
  Hervorhebung, nicht nur Schriftfarbe) — hier nur als Weichenstellung vermerkt, kein
  Code jetzt.

---

## 12. Abnahme-Mapping (Anforderung Abschnitt 6/7/9 → Umsetzung in diesem Plan)

| Anforderung | Abgedeckt durch |
|---|---|
| Testfälle 1–12 (Abschnitt 7) | Abschnitt 8.1 (`schriftfarbe.spec.ts`) |
| Testfall 6/Grenzfall 18 (Selection-Sync-Regression) | Abschnitt 8.2 (`selection-regression.spec.ts`) |
| Rundreise-Testfälle 1–9 (Abschnitt 6) | Abschnitt 8.3 |
| Grenzfälle 1–10, 13–19 | Abschnitt 8.1, je ein dedizierter Test |
| Grenzfall 11 (Theme-Farben) | Abschnitt 8.4, echte Fixtures `SampleDoc.docx`/`shapes-with-text.docx` |
| Grenzfall 12 (benannte ODT-Zeichenformatvorlagen) | Abschnitt 8.4, echte Fixtures `spanInheritanceTest.odt`/`character-styles.odt` |
| Abnahmekriterium 1 (alle Testfälle automatisiert, grün) | Abschnitte 7 + 8 zusammen |
| Abnahmekriterium 2 (Rundreise 1,2,6,7 mit echten Prüfwerkzeugen) | Abschnitt 8.3 + Abschnitt 9 |
| Abnahmekriterium 3 (Grenzfall 18 dauerhaft verankert) | Abschnitt 8.2, im bestehenden `selection-regression.spec.ts` |
| Abnahmekriterium 4 (Entscheidung leere Selektion) | Abschnitt 3.3 dieser Datei (Entscheidung: nachrüsten) |
| Abnahmekriterium 5 (Grenzfall 11/12 mit echten Fremddateien) | Abschnitt 8.4 |
| Abnahmekriterium 6 (⌫-Rendering, ≥2 Systeme) | Abschnitt 10 Punkt 1 (manuell) |
| Abnahmekriterium 7 (kein Fund ohne Vermerk) | Abschnitt 3 (Funde) + Abschnitt 11 (offene Abhängigkeiten) dieses Plans |
