# Umsetzungsplan: Feature „Fett" — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/fett-req.md` (Fassung vom 2026-07-04, mit
Abschnitt 0 „Korrekturen gegenüber der vorherigen Fassung"). Dieses Dokument prüft den
**tatsächlichen** Code-Stand gegen jede Behauptung/Anforderung der Spezifikation und
legt dateigenau fest, was geändert bzw. neu angelegt wird. Stil orientiert an
`FEATURE-SPEC-DOCX-ODT.md`. Kein Punkt hier ist bereits umgesetzt — dies ist der Plan,
nicht der Vollzug.

---

## 0. Kurzfassung — auch: was an der vorherigen Fassung dieses Plans falsch war

Diese Datei existierte bereits aus einem früheren Durchlauf. Bei der erneuten,
direkten Gegenprüfung gegen den **aktuellen** Code hat sich gezeigt, dass die alte
Fassung dieses Plans noch gegen den **veralteten** `fett-req.md` geschrieben war und
durchgehend **falsche Zeilennummern und veraltete Abschnittsverweise** trug. Konkret
korrigiert:

- Alle Zeilenangaben der alten Fassung waren um 50–70 Zeilen verschoben (dem
  `Toolbar.tsx` wurde u. a. der `ScissorsIcon` vorangestellt). Beispiele — alt → **real**:
  `schema.ts:110-115` → **158-163**; Fett-Button `Toolbar.tsx:135` → **184**;
  Aktiv-Zustand `Toolbar.tsx:42` → **69**; `Mod-b` `WordEditor.tsx:76` → **98**;
  `docx/reader.ts:102` → **103**; `docx/styleDefs.ts:14` → **17**;
  `odt/reader.ts:51,87` → **52,105**. Alle Fundstellen unten sind **neu gegen den
  aktuellen Stand verifiziert**.
- **Nachtrag (diese Fassung, erneute Direktprüfung gegen HEAD):** Eine frühere Fassung
  *dieses* Plans trug ihrerseits noch **veraltete `WordEditor.tsx`-Zeilen** (auf dem
  Vor-Cut-Stand, ~8 Zeilen zu niedrig): der Cut-Merge hat in `WordEditor.tsx` u. a. den
  `useAutoDismiss`-Hook und den `cutError`-State ergänzt und damit alles darunter nach
  unten geschoben. Alt → **real** an HEAD: `Mod-b` `:90` → **98**; Undo/Redo-Keymap
  `:86-87` → **93-95**; `dispatchTransaction` `:117-124` → **125-132**; `forceRender`
  `:123` → **131**; `tr.docChanged`/`onChange` `:120-121` → **128-129**. Sämtliche
  `WordEditor.tsx`-Verweise unten sind auf diese realen Zeilen korrigiert und decken sich
  jetzt mit `fett-req.md` Abschnitt 1 (das die korrekten Zeilen bereits trug).
- Die alte Fassung nannte „3 Tests" in `selection-regression.spec.ts` — real sind es
  **vier** (`:14,43,61,88`), alle mit „Fett" als auslösendem Schritt.
- Die alte Fassung schlug für den DOCX-`rStyle`-Regressionstest die reale Fixture
  `Styles.docx` vor. **Das ist falsch:** `Styles.docx/word/document.xml` benutzt gar
  **kein** `w:rStyle`. Von 127 DOCX-Fixtures referenzieren 19 ein `w:rStyle`, aber
  ausschließlich für Hyperlink-/Platzhalter-Zeichenstile (`InternetLink`,
  `PlaceholderText`, `Hyperlink`, `ad`) — **keine** davon verifiziert für Fett. Für den
  Regressionstest ist deshalb eine **synthetische** Fixture (analog `buildSampleDocx()`
  in `docx.spec.ts`) nötig, keine reale (siehe 6.3/6.5).
- Für die ODT-Stil-Lücke hat die alte Fassung nur vage Kandidaten genannt. Verifiziert
  geeignet ist
  `tests/fixtures/external/odt/sameLocationSpansUsingMultipleTemplateStyles_BOLD-Outer-ITALIC-Inner-Text-Yellow.odt`
  (siehe 3.2/6.4): ein **benannter** Text-Stil `BOLD` in `office:styles`
  (`styles.xml`), Body-Spans referenzieren `outer`/`middle`/`inner`, `content.xml`
  enthält **null** direkte `font-weight="bold"` und nutzt `style:parent-style-name` —
  d. h. der heutige Reader verliert diese Fettung garantiert.
- **Nachtrag (diese Fassung, gegen die um Defekt E erweiterte `fett-req.md` geprüft):**
  Die vorherige Fassung *dieses* Plans deckte nur die Defekte A–D ab und **fehlte
  komplett** beim neu hinzugekommenen Defekt E (`toggleMark` ohne
  `removeWhenPresent: false`, beide Aufrufstellen). Das ist am tatsächlich installierten
  `prosemirror-commands@1.7.1` (`node_modules/prosemirror-commands/dist/index.cjs:521-561`)
  direkt nachvollzogen, nicht nur aus der `.d.ts`-Doku übernommen: `removeWhenPresent`
  defaultet dort auf `true` (Zeile 524), und bei nicht-leerer Selektion wird
  `ranges = state.selection.ranges` (Zeile 531, **nicht** `from`/`to`) sowie
  `add = !ranges.some(r => state.doc.rangeHasMark(...))` (Zeile 540-543) berechnet —
  exakt das in `fett-req.md` Defekt E beschriebene Verhalten. Abschnitt 2.5 ergänzt Fix
  und Regressionstest. Zusätzlich wurde die in der alten Fassung vorgeschlagene
  `isMarkActive`-Hilfsfunktion (4.1) gegen einen selbst übersehenen Fehler geprüft: Sie
  las `from`/`to` direkt aus `state.selection`, was bei einer Mehrzell-`CellSelection`
  laut Bibliothekscode (`prosemirror-state/dist/index.cjs:39-47`, Getter `from`/`to`/
  `$from`/`$to` liefern ausschließlich `ranges[0]`) **nur die erste** Zelle geprüft hätte
  — der in `fett-req.md` Grenzfall 5.15 explizit gewarnte Fehler. 4.1 iteriert jetzt über
  `state.selection.ranges` (alle Zellen). Ferner wurde Testfall 7.10 (echter
  `filechooser`-Rundreise-Test statt `setInputFiles`) nachgezogen (6.1/11) und
  Bedienelement 1 (Touch als dritte Modalität) in 4.2 explizit bewertet.

Inhaltlich bestätigt die Prüfung des **tatsächlichen** Codes die fünf Defekte A–E aus
`fett-req.md` Abschnitt 4 sowie die Import-Lücken für Fremd-Zeichenstile. Die
Umsetzungsreihenfolge in Abschnitt 8 ist gegenüber der alten Fassung **auf
Hardest/Core-first umgestellt** (die schweren Import-Fidelity-Arbeiten und die
Kern-Interaktion — inklusive Defekt E — zuerst, der CSS-Einzeiler und das Icon zuletzt).

---

## 1. Verifikation der Ist-Stand-Tabelle aus `fett-req.md` Abschnitt 1

Jede Zeile der Anforderungs-Tabelle wurde gegen den aktuellen Code geprüft. **Alle
Zeilennummern der Anforderung sind korrekt** (die Anforderung wurde offenkundig bereits
neu verifiziert). Ergebnis:

| Fundstelle laut Anforderung | Ergebnis der Prüfung |
|---|---|
| `schema.ts:158-163` Mark `strong` | **Bestätigt.** `parseDOM` = `[{tag:'strong'},{tag:'b'},{style:'font-weight',getAttrs:v=>/^(bold\|[5-9]\d{2,})$/.test(v)&&null}]`; `toDOM`=`['strong',0]` (Zeile 159/161). |
| `Toolbar.tsx:184` Button „F" | **Bestätigt**, exakt. |
| `Toolbar.tsx:55-89` `MarkButton` | **Bestätigt.** Generisch für F/K/U/S; `<button aria-pressed=… aria-label={title}>`. |
| `Toolbar.tsx:76-79` nur `onMouseDown` | **Bestätigt.** `onMouseDown` mit `e.preventDefault()`, dann `run(view, toggleMark(markType))`. **Kein `onClick`, kein `onKeyDown`.** → Defekt A. |
| `Toolbar.tsx:69` Aktiv-Zustand | **Bestätigt.** `markType.isInSet(view.state.selection.$from.marks()) !== undefined` — ohne `storedMarks`, nur `$from`. → Defekt B. |
| `WordEditor.tsx:98` `Mod-b` | **Bestätigt.** `'Mod-b': toggleMark(wordSchema.marks.strong)`, direkt in der Keymap (`:98`, unabhängig vom Button); `Mod-i`/`Mod-u` folgen `:99-100`, Undo/Redo `:93-95`. |
| `docx/reader.ts:103` `<w:b/>`→`strong` | **Bestätigt.** `if (firstChildNS(rPr, …w, 'b')) marks.push({type:'strong'})` — nur Existenzprüfung, kein `@w:val`. Kontrast Unterstrichen `:106` prüft `val !== 'none'`. → Defekt C. |
| `docx/reader.ts:53-67` `parseStylesXml` | **Bestätigt.** Liest nur `outlineLvl`; kein `<w:b>` aus Stilen, kein `w:rStyle`. → Lücke A. |
| `docx/writer.ts:23` `strong`→`<w:b/>` | **Bestätigt** (in `runPropertiesXml`, 20-33). |
| `docx/writer.ts:52-59` Run-Merge | **Bestätigt.** Benachbarte Textknoten mit `JSON.stringify(marks)`-Gleichheit werden zu einem `<w:r>` verschmolzen. |
| `docx/styleDefs.ts:17` Heading-`<w:b/>` | **Bestätigt.** `headingStylesXml()` schreibt `<w:rPr><w:b/><w:sz…/></w:rPr>` je Heading1–6 (Stil-Ebene). |
| `odt/reader.ts:52` + `:105` | **Bestätigt.** `props.getAttributeNS(fo,'font-weight')==='bold'` (Literal) → `style.bold`; `marksFor`→`{type:'strong'}`. |
| `odt/reader.ts:37` `parseAutomaticStyles` | **Bestätigt.** Liest ausschließlich `office:automatic-styles`; **kein** `office:styles`, **kein** `style:parent-style-name`. → Lücke B. |
| `odt/writer.ts:35,77-78` | **Bestätigt.** `strong`→`props.bold`; `inlineToOdt` umschließt Text in `<text:span text:style-name=…>`. |
| `odt/styleRegistry.ts:48` | **Bestätigt.** `props.bold`→`fo:font-weight="bold" style:font-weight-asian="bold" style:font-weight-complex="bold"`. |
| `odt/styleRegistry.ts:22-44` Dedup | **Bestätigt.** `TextStyleRegistry` dedupliziert per `JSON.stringify`-Schlüssel zu `T1,T2,…`. |
| `odt/styleRegistry.ts:89` Heading-Bold | **Bestätigt** (Stil-Ebene je Überschrift-Stil). |
| `index.css:29-37,58-61` | **Bestätigt.** `.ProseMirror h1`–`h6` haben **nur** `margin` (29-37); einzige `font-weight`-Regel ist `.ProseMirror th {font-weight:600}` (58-61). Keine Heading-Fettung. → Defekt D. |
| `docx.spec.ts:69,108,253/:299` | **Bestätigt** (Titel „…types and bolds text" `:69`; Rundreise ~`:108`; Voll-Coverage `strong`-Assertion `:299`). Assertions nur `contains('<w:b/>')`. |
| `odt.spec.ts:53,89,229/:275` | **Bestätigt** (analog; `contains('font-weight="bold"')`, `strong`-Assertion `:275`). |
| `selection-regression.spec.ts:14,43,61,88` | **Bestätigt: vier Tests**, jeweils `getByTitle('Fett').click()`. |
| `playwright.config.ts:27-54` | **Bestätigt.** Firefox/Desktop-Safari nur auf `clipboard.*` (`testMatch`, 43-53); Vollsuite auf Desktop Chrome / Mobile (Pixel 7) / Tablet (iPad Mini, WebKit). |

**Unabhängige Validierer** (für 6.7): `mammoth` und `xmllint-wasm` sind
DevDependencies (`package.json:48,54`), das ODF-1.3-RNG liegt unter
`tests/fixtures/external/odf-schema/OpenDocument-v1.3-schema.rng`. Beide werden bereits
verwendet: `docx/__tests__/external-validation.test.ts` (mammoth `convertToHtml`),
`odt/__tests__/external-validation.test.ts` (`validateXML` gegen das RNG). Keine neue
Abhängigkeit nötig.

---

## 2. Verifizierte Defekte (A–E) mit dateigenauem Fix

### 2.1 Defekt A (hoch): Toolbar-Button per Tastatur nicht auslösbar

**Datei:** `src/formats/shared/editor/Toolbar.tsx`, `MarkButton` (55-89), Aufrufstelle
Fett `:184`.

`MarkButton` verdrahtet nur `onMouseDown` (76-79):

```tsx
onMouseDown={(e) => {
  e.preventDefault()
  run(view, toggleMark(markType))
}}
```

Ein natives `<button>` feuert bei Tastatur-Aktivierung (Tab-Fokus + Enter/Space)
**kein** `mousedown`, sondern nur `click`. Ergebnis: Tab zum „F"-Button, Enter/Space →
nichts. Verstößt gegen Bedienelement 1 („per Maus **und** Tastatur auslösbar").
Strg+B bleibt wirksam, weil es über die Keymap läuft (`WordEditor.tsx:98`) — der
**Button** bleibt aber tastaturunbedienbar (Barrierefreiheits- und
Anforderungsverstoß).

**Fix:** Toggle nach `onClick` verschieben, `onMouseDown` behält nur
`e.preventDefault()` (verhindert Fokus-/Selektionsverlust). `onClick` feuert für
Maus-Klick (nach `mousedown`→`mouseup`) **und** Tastatur-Aktivierung, jeweils genau
**einmal** (kein Doppel-Toggle, Grenzfall 5.12). Details in 4.2.

**Nebenbefund (dokumentiert, außerhalb „Fett"-Scope):** `MarkButton` ist geteilt —
der Fix behebt Kursiv/Unterstrichen/Durchgestrichen mit. Die übrigen Toolbar-Buttons
(`AlignButton` 91-111, Listen 241-273, Tabelle/Bild 277-294) tragen denselben
`onMouseDown`-only-Mangel; sie sind **nicht** Teil dieser Anforderung, aber als
zusammenhängender Barrierefreiheits-Befund fürs Backlog vermerkt.

### 2.2 Defekt B (hoch): Aktiv-Zustand ignoriert `storedMarks` und die Gesamtselektion

**Datei:** `Toolbar.tsx:69`.

```tsx
const active = markType.isInSet(view.state.selection.$from.marks()) !== undefined
```

`ResolvedPos.marks()` liefert die **Dokument**-Marks vor dem Cursor — **nicht**
`state.storedMarks`. `storedMarks` ist aber genau das Feld, das `toggleMark` bei leerer
Selektion setzt (das „vorgemerkte" Fett aus Anforderung 3.2/3.3). Reproduktion: Cursor
in normalen Text, „Fett" umschalten → `storedMarks=[strong]`, `$from.marks()` bleibt
unverändert → Button zeigt weiter `aria-pressed="false"`, obwohl der nächste Buchstabe
fett wird. Zusätzlich prüft die Zeile nur `$from` (Selektionsanfang) — bei halb fetter
Selektion kann `aria-pressed` je nach Startposition falsch `true`/`false` sein
(Grenzfall 5.3).

**Warum der Fix sofort sichtbar wird (Mechanik):** Die `Toolbar` wird bei **jeder**
Transaktion neu gerendert — `dispatchTransaction` (`WordEditor.tsx:125-132`) ruft nach
`view.updateState` (`:127`) immer `forceRender((n)=>n+1)` (`:131`). Auch reine
Selektions-/`storedMarks`-Transaktionen laufen hier durch. Sobald `active` aus
`storedMarks` liest, aktualisiert sich `aria-pressed` also ohne Zusatz-Verkabelung bei
jeder Cursor-/Selektionsänderung (Anforderung 3.3, „sofort").

**Fix:** Neue, testbare Hilfsfunktion `isMarkActive(state, markType)` in `commands.ts`
(analog zum bestehenden `isAlignActive`, `commands.ts:29-38`), die
- bei **leerer** Selektion `state.storedMarks ?? $from.marks()` prüft (Standardmuster
  aus der ProseMirror-Doku / `prosemirror-example-setup`), und
- bei **nicht-leerer** Selektion nur `true` liefert, wenn **jede** Textstelle im
  Bereich das Mark trägt (Voll-Deckung, nicht `rangeHasMark`/„irgendeine").

Die bewusste Abweichung vom `example-setup`-Muster (das für nicht-leere Selektionen
`rangeHasMark` = „irgendeine Stelle" nutzt) ist erforderlich, damit `aria-pressed` bei
gemischter Selektion **nicht** fälschlich „aktiv" zeigt (Grenzfall 5.3 / Testfall 6).
Das **Toggle-Verhalten selbst** bleibt Standard-`toggleMark` (erster Klick fettet die
gesamte Selektion) — Anzeige und Toggle sind bewusst getrennt. Code in 4.1.

### 2.3 Defekt C (hoch): DOCX-Reader ignoriert `@w:val` an `<w:b>`

**Datei:** `src/formats/docx/reader.ts:103`, Funktion `marksFromRunProperties`
(100-115).

```ts
if (firstChildNS(rPr, OOXML_NAMESPACES.w, 'b')) marks.push({ type: 'strong' })
```

Nur Existenzprüfung. Nach ECMA-376 bedeutet `<w:b/>` (ohne `@val`) „an", aber
`<w:b w:val="0"/>`, `="false"`, `="off"` bedeuten explizit „aus" — Word schreibt genau
das, um eine von einer Formatvorlage geerbte Fettung für einen einzelnen Lauf gezielt
abzuschalten. Der Code macht einen Bold-Aus-Override fälschlich fett. Die Inkonsistenz
ist im selben Block belegt: Unterstrichen `:106` wertet `val !== 'none'` bereits korrekt
aus. **Fix in 4.6** (`isOnOffTrue`). Dasselbe Muster ohne `@val`-Prüfung besteht bei
`<w:i>` (`:104`) und `<w:strike>` (`:107`) — außerhalb „Fett"-Scope, aber die
`isOnOffTrue`-Behandlung wird für Konsistenz auf alle drei angewandt (risikoarm,
Regressionstests dafür in 6.3).

### 2.4 Defekt D (mittel, blockiert Beantwortung von 3.5): Überschriften im Editor nicht fett

**Datei:** `src/index.css` (29-37 / 58-61). Es gibt **keine** `font-weight`-Regel für
`.ProseMirror h1`–`h6`. Das Projekt nutzt Tailwind v4 (`@import 'tailwindcss'`,
`index.css:1`; `tailwindcss ^4.3.2`, `package.json:50`), dessen Preflight `h1`–`h6` auf
`font-weight: inherit` (→ 400) zurücksetzt. Das `strong`-Mark rendert als `<strong>`,
Preflight setzt `strong { font-weight: bolder }` (relativ zu 400 = 700). **Wahrscheinliche,
per `getComputedStyle` zu bestätigende Folge:**
- Eine Überschrift **ohne** `strong` erscheint im Editor **nicht** fett (400) —
  während DOCX/ODT-Export sie sehr wohl fett machen (Stil-Ebene, `styleDefs.ts:17` /
  `styleRegistry.ts:89`). Editor- und Export-Optik laufen auseinander.
- Ein Fett-Toggle **innerhalb** einer Überschrift ist daher optisch **sehr wohl**
  wirksam (die Wörter springen auf 700) — das Gegenteil der alten Annahme.

**Fix in 4.5** (Heading-`font-weight` in `index.css`). Muss **vor** der endgültigen
Beantwortung von 3.5 stehen, weil deren Fragestellung sonst auf falscher Grundannahme
beruht.

### 2.5 Defekt E (hoch, direkt am Bibliothekscode verifiziert — kein Verdacht): Gemischte Selektion wird beim ersten Klick entfettet statt gefettet

**Fundstellen:** `Toolbar.tsx:78` (`run(view, toggleMark(markType))`) und
`WordEditor.tsx:98` (`'Mod-b': toggleMark(wordSchema.marks.strong)`) — **beide ohne**
drittes Options-Argument. Direkt in der installierten Abhängigkeit nachgelesen
(`node_modules/prosemirror-commands/dist/index.cjs:521-561`, nicht nur aus der
`.d.ts`-Doku übernommen):

```js
function toggleMark(markType) {
  var attrs = ... ;
  var options = arguments.length > 2 ? arguments[2] : undefined;
  var removeWhenPresent = (options && options.removeWhenPresent) !== false;   // Default: true
  ...
  var ranges = state.selection.ranges;                                       // NICHT from/to
  ...
  if (removeWhenPresent) {
    add = !ranges.some(r => state.doc.rangeHasMark(r.$from.pos, r.$to.pos, markType));
  } else {
    add = !ranges.every(r => /* volle Abdeckung über nodesBetween */);
  }
  ...
}
```

Ohne drittes Argument bleibt `removeWhenPresent` auf dem Default `true`. Für eine
**gemischte** Selektion (ein Teil bereits fett) meldet `rangeHasMark` „vorhanden", sobald
**irgendein** Zeichen im Bereich das Mark trägt → `ranges.some(...)` = `true` →
`add = !true = false` → der **erste** Klick **entfernt** die Fettung aus der **gesamten**
Selektion. Das ist das Gegenteil der Word-/LibreOffice-Konvention und der in `fett-req.md`
3.1/5.3 verlangten Soll-Anforderung. Betrifft **jede** Aufrufstelle, die `toggleMark`
ohne dieses Argument nutzt — beide oben genannten Stellen sind identisch betroffen.

**Fix:** drittes Argument `{ removeWhenPresent: false }` ergänzen. Am `else`-Zweig
derselben Funktion (`add = !ranges.every(...)`, Voll-Abdeckung statt „irgendeine Stelle")
verifiziert: danach entfernt ein Klick die Fettung nur noch, wenn **jeder** Textabschnitt
der Selektion sie bereits vollständig trägt; in jedem anderen Fall (gemischt **oder**
komplett ohne Mark) wird gesetzt. Umsetzung siehe 4.2 (`Toolbar.tsx`) und 4.3
(`WordEditor.tsx`).

**Nebenbefund (dokumentiert, analog zum Umgang mit Defekt A/C):** `Toolbar.tsx:78` liegt
in der für F/K/U/S **geteilten** `MarkButton`-Komponente — der Fix behebt also
Kursiv/Unterstrichen/Durchgestrichen bei Mausklick **mit**, ohne dass das eigens verdrahtet
werden muss. `WordEditor.tsx:99-100` (`Mod-i`, `Mod-u`) sind dagegen **separate**
Keymap-Einträge, für die dieser Plan **aus Konsistenzgründen** (gleiches Bug-Muster,
gleiches Risiko-Nullrisiko wie bei `isOnOffTrue` in 2.3) dieselbe Korrektur mitzieht;
`strike` hat keine Tastenkombination. Kein Fix außerhalb dieser vier Aufrufstellen nötig.

**Regressionstest (Pflicht, DoD Punkt 4):** Zwei Wörter, nur das erste fett, beide
selektieren, „Fett" klicken → **beide** danach fett (nicht: beide danach nicht-fett);
zweiter Klick auf die jetzt komplett fette Selektion entfernt sie wieder. Test in 6.1/6.

**Zusätzlich zu prüfen (Grenzfall 5.15, Mehrzell-`CellSelection`):** `toggleMark` liest
`ranges` bereits korrekt aus `state.selection.ranges` (Zeile 531 oben), **nicht** aus
`from`/`to` — die Fett-Anwendung selbst erreicht also schon vor diesem Fix jede erfasste
Zelle einer `CellSelection`, inklusive der Defekt-E-Korrektur. Nur die **Anzeige**
(`isMarkActive`, 4.1) hatte in der vorherigen Fassung dieses Plans denselben `from`/`to`-
Fehler, den Defekt E im Toggle-Verhalten der Bibliothek vermeidet — siehe 4.1.

---

## 3. Import-Lücken für Fremd-Zeichenstile (Grenzfälle 5.8/5.9/5.10)

### 3.1 Lücke A: DOCX-Reader löst `w:rStyle` (Zeichenformatvorlage) nicht auf — Grenzfall 5.8

`marksFromRunProperties`/`decodeRunElement` (`reader.ts:100-184`) lesen ausschließlich
Direktformatierung aus `w:rPr`. Ein `<w:rStyle w:val="…"/>`, dessen Zeichenformatvorlage
in `styles.xml` `<w:b/>` deklariert (ggf. über `w:basedOn` vererbt), wird nirgends
aufgelöst → solcher Text kommt **nicht-fett** an, obwohl Word ihn fett zeigt: **stiller
Datenverlust**, den `FEATURE-SPEC` §18 verbietet. Bestätigt als **tatsächliche Lücke**.
Fix in 4.6 (größerer Teil). Regressionstest: **synthetische** Fixture (siehe 0/6.3),
**nicht** `Styles.docx`.

### 3.2 Lücke B: ODT-Reader liest nur `office:automatic-styles`, keine benannten/vererbten Stile — Grenzfall 5.9

`parseAutomaticStyles` (`odt/reader.ts:37`) liest ausschließlich
`office:automatic-styles`. `text:style-name` auf einem `<text:span>` kann aber auf einen
**benannten** Stil in `office:styles` verweisen (z. B. LibreOffice „Strong Emphasis"),
und `style:parent-style-name` (Vererbung) wird **nirgends** aufgelöst — auch nicht
innerhalb der automatischen Stile.

**Verifizierte Gap-Fixture** (Inhalt real geprüft, nicht nur Dateiname):
`tests/fixtures/external/odt/sameLocationSpansUsingMultipleTemplateStyles_BOLD-Outer-ITALIC-Inner-Text-Yellow.odt`:
- `styles.xml/office:styles` enthält den benannten Text-Stil
  `style:name="BOLD" style:family="text"` mit `fo:font-weight="bold"`.
- Body-Spans referenzieren `outer`/`middle`/`inner`; `content.xml` enthält **null**
  direkte `font-weight="bold"` und nutzt `style:parent-style-name`.
- Heutiges Verhalten: `textStyles.get('outer'|'inner')` → `undefined` **oder** ohne
  aufgelöste Vererbung ohne `bold` → Fettung geht verloren.

Fix in 4.8 (Stil-Kaskade). Regressionstests in 6.4.

### 3.3 Lücke C: ODT-Reader erkennt nur den Literal `bold`, keine numerischen Gewichte — Grenzfall 5.10

`odt/reader.ts:52` prüft exakt `=== 'bold'`. ODF erlaubt `fo:font-weight="700"` u. Ä.;
eine Fremddatei mit `700` verliert die Fettung. Asymmetrie zur HTML-Einfüge-Erkennung
(`schema.ts:159` erkennt numerisch ≥ 500). **Entscheidung (siehe 4.8):** ODT-Reader auf
dieselbe ≥ 500-Schwelle wie `schema.ts` anheben (Konsistenz), `bold` weiterhin
akzeptieren. Alternativ dokumentierte Einschränkung — hier wird der Fix empfohlen, da
er trivial und konsistenzstiftend ist.

### 3.4 Lücke D: Icon weiterhin reiner Buchstabe „F", kein SVG — Bedienelement 4 / Abnahme 6

`Toolbar.tsx:184` rendert den CSS-fetten Buchstaben „F" (`glyphClassName="font-bold"`),
kein SVG. Geringeres Risiko als die Emoji-Glyphen (🖍/⊞/🖼), aber gemäß
`FEATURE-SPEC` §20.1 / Abnahme 6 zu **bewerten**. SVG-Präzedenz existiert
(`ScissorsIcon`, `Toolbar.tsx:33-53`). Empfehlung + Code in 4.2/5.

### 3.5 Lücke E (Testabdeckung — **nicht** zu verwechseln mit Defekt E aus Abschnitt 2.5, dem `toggleMark`-Bug)

Bestehende Fett-Tests (`docx.spec.ts:69/108`, `odt.spec.ts:53/89`,
`selection-regression.spec.ts:14/43/61/88`) lösen „Fett" **nur per Maus-Klick** aus,
nie per Tastatur, prüfen Export nur per String-`contains('<w:b/>')` und nie
`aria-pressed`/`getComputedStyle`. Es fehlen Tests für: Tastatur-Fokus-Pfad (Defekt A),
`storedMarks`-Anzeige (Defekt B), gemischte Selektion inkl. Fix-Nachweis (5.3, Defekt E),
Mehrzell-`CellSelection`-Anzeige (5.15), `<w:b w:val="0"/>` (5.7), `w:rStyle` (5.8), ODT
`office:styles`/`parent` (5.9), numerisches ODT-`font-weight` (5.10), 500er-Grenze (5.6),
Undo/Redo einzeln (3.7), unabhängige Parser (6.7), Cross-Format auf Code-Ebene (6.3),
echter `filechooser`-Klickpfad statt `setInputFiles` (7.10). Vollständiger Testplan in
Abschnitt 6.

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/editor/commands.ts` (geändert) — Kern von Defekt B, `CellSelection`-sicher (Grenzfall 5.15)

Neue exportierte Hilfsfunktion (Imports `EditorState` ist bereits importiert, `MarkType`
aus `prosemirror-model` ergänzen):

```ts
import type { MarkType } from 'prosemirror-model'

/**
 * True, wenn das Mark für die Toolbar-Anzeige „aktiv" ist. Leere Selektion:
 * stored-mark-bewusste Konvention (storedMarks schlagen $from.marks(), weil genau das
 * `toggleMark` ohne Selektion setzt). Nicht-leere Selektion: nur aktiv, wenn das Mark
 * *jede* Textstelle in *jedem* Range der Selektion deckt (nicht `rangeHasMark`/
 * „irgendeine Stelle") — damit eine gemischte Selektion nicht fälschlich „aktiv" zeigt
 * (fett-req.md 5.3 / Defekt B). Iteriert bewusst über `state.selection.ranges` statt
 * über `from`/`to`: Für eine Mehrzell-`CellSelection` liefern die Getter `from`/`to`/
 * `$from`/`$to` (`prosemirror-state`, `Selection` Basisklasse) ausschließlich
 * `ranges[0]` — die erste erfasste Zelle. Ein naiver `from`/`to`-Check sähe daher bei
 * "eine Zelle fett, eine nicht" fälschlich nur die erste Zelle (fett-req.md Grenzfall
 * 5.15, `CellSelection`-Konstruktor in `prosemirror-tables/dist/index.cjs:508-526`
 * verifiziert: `ranges` = eine `SelectionRange` je erfasster Zelle). Das
 * Toggle-Verhalten selbst (`toggleMark`, siehe Defekt E in 2.5) iterierte schon vorher
 * korrekt über `ranges` — nur die Anzeige musste hier nachgezogen werden.
 */
export function isMarkActive(state: EditorState, markType: MarkType): boolean {
  const { empty, $from, ranges } = state.selection
  if (empty) return markType.isInSet(state.storedMarks ?? $from.marks()) != null
  let sawText = false
  let coversAll = true
  for (const { $from: rFrom, $to: rTo } of ranges) {
    state.doc.nodesBetween(rFrom.pos, rTo.pos, (node, pos) => {
      if (!node.isText) return
      const overlapStart = Math.max(pos, rFrom.pos)
      const overlapEnd = Math.min(pos + node.nodeSize, rTo.pos)
      if (overlapStart >= overlapEnd) return
      sawText = true
      if (!markType.isInSet(node.marks)) coversAll = false
    })
  }
  return sawText && coversAll
}
```

`nodesBetween` überspringt Nicht-Text-Knoten (`image`, Tabellenstruktur) automatisch —
das deckt Grenzfall 5.5 (Selektion über Bild/Tabelle) auf Command-Ebene ab, ohne
Sonderfall. Für eine gewöhnliche `TextSelection`/`AllSelection` hat `ranges` genau ein
Element, das Verhalten ist also identisch zur einfacheren `from`/`to`-Variante — die
Schleife ändert an diesen Fällen nichts, schließt aber die `CellSelection`-Lücke. Keine
Änderung an der `toggleMark`-Verwendung selbst (die bekommt ihren eigenen Fix in 2.5/4.2/4.3).

### 4.2 `src/formats/shared/editor/Toolbar.tsx` (geändert) — Defekt A + B + E + Lücke D

In `MarkButton` (55-89):

- Import `isMarkActive` aus `./commands` ergänzen (Import-Block 6-20).
- Zeile 69: `const active = isMarkActive(view.state, markType)`.
- Zeile 76-79: `onMouseDown` reduzieren auf `e.preventDefault()`; **neuer**
  `onClick={() => run(view, toggleMark(markType, null, { removeWhenPresent: false }))}`
  — das dritte Argument ist der Defekt-E-Fix (2.5), am selben Aufruf mit erledigt, weil
  Defekt A ohnehin verlangt, diese Zeile von `onMouseDown` nach `onClick` zu verschieben.
  `run` fokussiert bereits den View danach (`Toolbar.tsx:28-31`), also bleibt der
  Editor-Fokus erhalten. `onClick` feuert genau einmal für Maus **und** Tastatur.
- **Bedienelement 1 (Touch, dritte Modalität):** kein separater Fix nötig, aber explizit
  zu bewerten, weil `fett-req.md` Touch ausdrücklich als **nicht optional** einstuft
  (Vollsuite-Projekt „Mobile", Pixel 7/Chromium, bedient ausschließlich per Tap). Ein Tap
  auf ein natives `<button>` löst ohne `preventDefault()` auf `touchstart`/`touchend`
  in Chromium die W3C-„compatibility mouse events" aus: `mousedown` → `mouseup` →
  `click`, in dieser Reihenfolge, sofern kein Handler `touchstart`/`touchend`
  abbricht (unser Code registriert dort nichts). Der Umzug des Toggles von
  `onMouseDown` nach `onClick` **verbessert** Touch sogar gegenüber dem Ist-Zustand:
  vorher hing das Toggle am früher feuernden, nicht garantierten `mousedown`-Kompat-
  Event; `click` ist das verbindliche, am Ende der Tap-Geste garantierte Event für
  Maus, Tastatur **und** Touch gleichermaßen. Kein Extra-Listener, keine
  `touchstart`/`ontouchend`-Sonderbehandlung nötig. Zu verifizieren per Test (6.1),
  nicht nur zu behaupten.
- Optionaler Prop `icon?: ReactNode`; falls gesetzt statt `<span className={glyph}>`
  rendern. `ReactNode` ist in `Toolbar.tsx` **noch nicht** importiert (Zeile 1 importiert
  nur `ChangeEvent`) — `import type { ChangeEvent, ReactNode } from 'react'` ergänzen.
  `label`/`aria-label`/`title` bleiben unverändert (Screenreader-Bezeichnung
  „Fett" bleibt). Nur der Fett-Aufruf `:184` bekommt `icon={<BoldIcon />}`; K/U/S
  behalten ihren Buchstaben-Glyph (Scope = „Fett").

Neue Komponente `BoldIcon` (gleiche Datei, inline-SVG — keine Icon-Bibliothek in
`package.json`, bewusst self-contained wegen CSP):

```tsx
function BoldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
    </svg>
  )
}
```

(verbreiteter, Apache-2.0-lizenzierter Material-„format_bold"-Pfad; unabhängig von
Systemschrift/Emoji darstellbar — behebt Lücke D / Abnahme 6). Aufrufstelle `:184`:

```tsx
<MarkButton view={view} mark="strong" label="F" title="Fett" glyphClassName="font-bold" icon={<BoldIcon />} />
```

Kompatibilität: Die selection-regression-Tests (`getByTitle('Fett').click()`) bleiben
grün, weil Playwright `.click()` die volle `mousedown`→`mouseup`→`click`-Sequenz
auslöst; die Reconciliation-Listener in `WordEditor.tsx` hängen an `view.dom`, nicht am
Button, es gibt keine Interferenz.

### 4.3 `src/formats/shared/editor/WordEditor.tsx` (geändert) — Defekt E, Keymap

**Zeile 98** (`'Mod-b': toggleMark(wordSchema.marks.strong)`) wird zu
`'Mod-b': toggleMark(wordSchema.marks.strong, null, { removeWhenPresent: false })`
(Defekt-E-Fix, zweite Aufrufstelle neben `Toolbar.tsx:78`). **Aus Konsistenzgründen**
(identisches Bug-Muster, siehe Nebenbefund in 2.5) ziehen die direkt benachbarten
Zeilen **99–100** dieselbe Korrektur mit: `'Mod-i': toggleMark(wordSchema.marks.em, null,
{ removeWhenPresent: false })`, `'Mod-u': toggleMark(wordSchema.marks.underline, null,
{ removeWhenPresent: false })`. Das ist eine bewusste, minimal-invasive Ausweitung über
den strikten „Fett"-Scope hinaus (analog zu `isOnOffTrue` in 2.3, das ebenfalls
risikoarm auf `<w:i>`/`<w:strike>` mitangewandt wird) — keine neue Abhängigkeit, keine
Verhaltensänderung außer der bereits für Fett geforderten.

Keymap-Einträge `Mod-z`/`Mod-y`/`Mod-Shift-z` (93-95) und die übrige Struktur bleiben
unverändert. `prosemirror-keymap` ruft bei `true`-Rückgabe automatisch
`event.preventDefault()` auf, wodurch die Browser-Belegung (z. B. Firefox
Lesezeichen-Sidebar) unterdrückt wird, solange der Editor fokussiert ist — Nachweis per
Test (6.1 Test 2/14), kein weiterer Codefix. Ebenfalls kein Codefix, aber im Testplan zu
**bestätigen** (Anforderung 3.2/3.7): Ein reines Umschalten des vorgemerkten Marks bei
leerer Selektion erzeugt eine Transaktion **ohne** Dokument-Schritt (`toggleMark` setzt
nur `storedMarks`) → `tr.docChanged === false` → `onChange` wird nicht ausgelöst
(`:128-129`) und `prosemirror-history` legt keinen Undo-Schritt an. Strukturell erwartet;
per Test zu belegen. Der `$cursor`-Zweig von `toggleMark` (leere Selektion) ist von
`removeWhenPresent` **nicht** betroffen (`index.cjs:534-535` nutzt dafür
ausschließlich `markType.isInSet(...)`, unabhängig vom dritten Argument) — der Fix
ändert also nur das Verhalten bei **nicht-leerer** Selektion, wie in Defekt E
beschrieben.

### 4.4 `src/formats/shared/schema.ts` (keine Änderung, nur Bewertung) — Grenzfall 5.6

Regex `/^(bold|[5-9]\d{2,})$/` (`:159`) erkennt `bold` und numerisch **500–999** (und
technisch 5000+); nicht erkannt: `100`–`499`, `400`, `normal`, `bolder`/`lighter`,
`1000`. Die 500er-Grenze ist bewusst und wird per Test belegt (6.1 Test 12:
`font-weight:499` vs. `500`). `bolder` als bewusste Einschränkung **dokumentieren**
(kein Fix — `bolder` ist relativ und ohne Kontext nicht eindeutig fett). Kein
Code-Fix.

### 4.5 `src/index.css` (geändert) — Defekt D

Nach dem `h1`–`h6`-Margin-Block (Ende `:37`) ergänzen:

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

Bringt Editor-Optik mit Export-Optik in Einklang und entfernt die versteckte
Abhängigkeit von Tailwind-Preflight-Interna. Muss vor der Beantwortung von 3.5 stehen.

### 4.6 `src/formats/docx/reader.ts` (geändert) — Defekt C + Lücke A

**Teil 1 — `@w:val` (Defekt C, klein, risikoarm):** Hilfsfunktion + Anwendung in
`marksFromRunProperties` (100-115):

```ts
function isOnOffTrue(el: Element | null): boolean {
  if (!el) return false
  const val = el.getAttributeNS(OOXML_NAMESPACES.w, 'val')
  if (val === null) return true // <w:b/> ohne @w:val = "an" (ECMA-376)
  return val !== '0' && val !== 'false' && val !== 'off'
}
```

`<w:b>` (`:103`) sowie für Konsistenz `<w:i>` (`:104`) und `<w:strike>` (`:107`) über
`isOnOffTrue(...)` prüfen statt bloßer Existenz.

**Teil 2 — `w:rStyle`-Auflösung (Lücke A, größer):**

- `interface HeadingInfo` (49-51) zu `interface StylesInfo` erweitern:
  `outlineLvlByStyleId` **plus** `boldByStyleId: Map<string, boolean>`. Der Bezeichner
  `headingInfo` ist bereits bis `decodeRunElement` (`:170`) durch die Kette gefädelt
  (`readDocx`→`readBodyChildren`→`paragraphToBlocks`→`decodeParagraphRuns`→
  `collectRuns`→`decodeRunElement`) — es kommt an diesen Signaturen nur ein Feld hinzu.
  **Korrektur gegenüber der alten Fassung:** `decodeRunElement` ruft
  `marksFromRunProperties(rPr)` heute **ohne** `headingInfo` auf (`reader.ts:172`, nur
  `rPr`). Die eine noch fehlende Weitergabe ist genau **ein** neuer Aufrufparameter an
  dieser Stelle (`marksFromRunProperties(rPr, headingInfo)`) plus die Signatur — keine
  darüber hinausgehende neue Parameterkette. (`parseTable`/`decodeDrawingOrPict` reichen
  das Objekt bereits weiter.)
- `parseStylesXml` (53-67) erweitern: für jeden `<w:style w:type="character">` prüfen,
  ob `<w:rPr>` ein `<w:b>` mit `isOnOffTrue` trägt; sonst der `w:basedOn`-Kette folgen
  (Tiefencap analog `MAX_TABLE_NESTING_DEPTH`, `reader.ts:309`, gegen Zyklen). Ergebnis
  in `boldByStyleId` ablegen. (Optional analog auch Paragraph-Stile mit `<w:b/>` im
  `rPr` — **out of scope**; Überschriften werden über die Heading-Stildefinition/den
  CSS-Fix bereits fett dargestellt, ein zusätzliches `strong`-Mark ist nicht nötig.)
- `marksFromRunProperties` bekommt `stylesInfo: StylesInfo` als Parameter. Neue Logik
  (ersetzt die Existenzprüfung in `:103`):

```ts
const bEl = firstChildNS(rPr, OOXML_NAMESPACES.w, 'b')
const rStyleEl = firstChildNS(rPr, OOXML_NAMESPACES.w, 'rStyle')
const styleId = rStyleEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? null
const styleBold = styleId ? (stylesInfo.boldByStyleId.get(styleId) ?? false) : false
const bold = bEl ? isOnOffTrue(bEl) : styleBold
if (bold) marks.push({ type: 'strong' })
```

Priorität: **Direktformatierung > Zeichenformatvorlage** — ein direktes
`<w:b w:val="0"/>` auf Run-Ebene schaltet auch eine per Stil geerbte Fettung ab
(Word-Semantik; deckt zugleich den Kombinationsfall aus 5.7+5.8 ab).

### 4.7 `src/formats/docx/writer.ts` (optional, nur bei Design-Option 3) — siehe 5

Kein Fix im Mindestumfang. Nur falls entschieden wird, dass Nutzer:innen ein bewusst
nicht-fettes Wort **innerhalb** einer Überschrift erzeugen können sollen, müsste
`runPropertiesXml` (20-33) kontextabhängig (Absatz ist `heading`, Run ohne `strong`)
explizit `<w:b w:val="0"/>` schreiben. Das erfordert, den umgebenden Node-Typ bis in
`runPropertiesXml` durchzureichen (aktuell kontextfrei) — eigenständiges Feature, siehe
5.

### 4.8 `src/formats/odt/reader.ts` (geändert) — Lücke B + Lücke C

**Teil 1 — numerisches `font-weight` (Lücke C, klein):** In `parseAutomaticStyles`
(`:52`) die Erkennung ersetzen durch eine Hilfsfunktion, die `bold` **oder** numerisch
≥ 500 akzeptiert (gleiche Schwelle wie `schema.ts:159`):

```ts
function isBoldWeight(v: string | null): boolean {
  if (!v) return false
  if (v === 'bold') return true
  const n = Number(v)
  return Number.isFinite(n) && n >= 500
}
```

**Teil 2 — Stil-Kaskade (Lücke B, größer):** `parseAutomaticStyles` zu einer
`parseStyleCascade` erweitern/ersetzen, die
1. zusätzlich `office:styles` (benannte Stile aus `styles.xml`, Familien `text` und
   `paragraph`) einliest — gleiches Attribut-Mapping;
2. `style:parent-style-name` **rekursiv** auflöst (Kind überschreibt geerbte
   Eigenschaften; Zyklen-/Tiefencap analog `MAX_NESTING_DEPTH`, `reader.ts:218`);
3. eine gemeinsame `Map<string, RunStyle>` liefert, in der automatische Stile bei
   Namenskollision Vorrang vor benannten haben (näher am konkreten Lauf).

`readOdt` (357-409): Das `office:styles`-Element aus `styles.xml` wird dort bereits
geladen (`stylesDoc`, `:372`), aber nur dessen `automatic-styles` (`:373`) verwendet.
`office:styles` zusätzlich extrahieren und als **Basis** in die Auflösung für **Body**
(`contentStyles`, `:364`) **und** Kopf/Fuß (`stylesForChrome`, `:374`) einspeisen —
benannte Stile sind dokumentweit. Kein neuer Parameter durch `elementToBlocks` nötig
(die gemergte `ParsedStyles` wird bereits durchgereicht).

Hinweis Round-Trip-Sicherheit: Unser **eigener** Writer legt Text-Stile in
`office:automatic-styles` ab (`styleRegistry.ts`/`writer.ts:210`) und schreibt in
`office:styles` nur `Standard` (paragraph, `writer.ts:220`). Eigenexporte werden also
weiter korrekt gelesen; die Kaskade betrifft nur Fremddateien.

### 4.9 `src/formats/odt/writer.ts` / `styleRegistry.ts` (optional, nur bei Option 3)

Analog 4.7: nur falls ein expliziter Bold-Aus-Override für Überschriftentext verlangt
wird (`fo:font-weight="normal"` in einer eigenen Stildefinition für Runs ohne `strong`
innerhalb `text:h`). Nicht Teil des Mindestumfangs.

---

## 5. Empfehlung zur offenen Frage aus `fett-req.md` 3.5 (Fett in Überschriften)

Zur Übernahme nach `fett-req.md` 3.5 / Abnahme 4, sobald entschieden (diese Datei ändert
`fett-req.md` nicht selbst):

1. **CSS-Fix zuerst** (4.5), damit Überschriften im Editor überhaupt fett erscheinen —
   unabhängig vom Rest, sonst laufen Editor- und Export-Optik auseinander. Ergebnis der
   `getComputedStyle`-Prüfung (Testfall 6.1/13 — Referenz „6.1/14" in einer früheren
   Fassung dieses Plans war bereits vor dieser Überarbeitung falsch, siehe dortige
   Testliste; hier korrigiert) hier und in `fett-req.md` nachtragen.
2. **Minimalumfang (empfohlen):** Das dokumentierte Ist-Verhalten wird **beibehalten und
   als gewollt bestätigt**: Ein entferntes `strong`-Mark auf Überschriftentext hebt die
   Stil-Ebene (`Heading1…6` mit `<w:b/>`/`fo:font-weight="bold"`) **nicht** auf — die
   Überschrift bleibt in Word/LibreOffice fett; das Mark ist dort nur redundant, nicht
   falsch. Kein Fix in 4.7/4.9 nötig.
3. **Erweiterung (separates Backlog-Item):** Soll künftig ein einzelnes Wort in einer
   Überschrift bewusst „normal" darstellbar sein, sind die Bold-Aus-Overrides aus
   4.7/4.9 umzusetzen (Absatzkontext bis in `runPropertiesXml`/`styleRegistry`
   durchreichen) — eigenständiges Feature mit eigenem Test-/Risikoaufwand.

Begründung Option 2 statt 3: Scope dieser Anforderung ist ausschließlich das
`strong`-Mark-Verhalten, nicht ein neues Style-Override-Feature.

**Icon-Entscheidung (Abnahme 6):** SVG `BoldIcon` (4.2) — konsistent mit der bereits
etablierten `ScissorsIcon`-Präzedenz und robust gegen fehlende Systemschriften;
minimaler Aufwand.

---

## 6. Testplan (Zuordnung zu `fett-req.md` Abschnitt 7)

### 6.1 Neu: `tests/e2e/bold.spec.ts` (echte Browser-Bedienung)

Je Test = ein Punkt aus Anforderung 7:
1. Toolbar-Klick auf Selektion → `getComputedStyle`/`toHaveCSS('font-weight','700')`
   **und** `aria-pressed="true"`.
2. Gleiche Aktion per `page.keyboard.press('ControlOrMeta+b')` statt Klick.
3. **Tastatur-Fokus-Pfad (Defekt A):** `getByTitle('Fett').focus()`, dann
   `keyboard.press('Enter')` und separat `Space` → Toggle wirkt. (Aktuell rot → nach
   4.2 grün.)
4. Fett ohne Selektion aktivieren, tippen → neuer Text fett, Nachbartext nicht; **und**
   Button sofort nach Aktivierung (vor dem Tippen) `aria-pressed="true"` (Defekt B).
5. Fett auf vollständig fette Selektion → entfernt, `aria-pressed`→`false`.
6. **Defekt-E-Regressionstest (Pflicht, DoD Punkt 4):** Zwei Wörter, nur das erste fett,
   beide selektieren, „Fett" klicken → **beide** danach fett (nicht: vor dem Fix wäre
   das Gegenteil — beide danach nicht-fett — zu beobachten gewesen). Zweiter Klick auf
   die jetzt komplett fette Selektion entfernt sie wieder. Zusätzlich: `aria-pressed`
   **vor** dem ersten Klick `false` (Defekt B). Ohne den Fix aus 2.5/4.2/4.3 ist dieser
   Test der einzige, der bei einem versehentlichen Revert von `removeWhenPresent: false`
   sofort rot würde — bewusst so geschrieben, dass er den Fix und nicht nur den
   Ist-Zustand nach dem Fix festhält.
7. **Mehrzell-`CellSelection` (Grenzfall 5.15):** Tabelle mit zwei Zellen anlegen, eine
   Zelle fett, eine nicht; per Mausklick+Ziehen über die Zellgrenze auswählen (nicht
   Strg+A) → Playwright-Äquivalent: `mouse.down()` in Zelle 1, `mouse.move()` in Zelle 2,
   `mouse.up()`, um eine echte `CellSelection` zu erzeugen. Erwartung: `aria-pressed`
   spiegelt **beide** Zellen wider (nicht nur die erste, siehe 4.1); „Fett" klicken →
   **beide** Zellen werden (falls vorher gemischt) vollständig fett, analog zu Test 6.
8. Fett+Kursiv+Unterstrichen, DOCX-Export → **unabhängiger Parser** (JSZip+DOMParser auf
   `word/document.xml`) prüft alle drei in **einem** `<w:r>`/`<w:rPr>`.
9. Gleicher Kombitest für ODT (`content.xml`, ein `<text:span>` mit einer Stildefinition,
   die alle drei Eigenschaften trägt).
10. Undo direkt nach Fett (Klick, dann Strg+Z) → Format weg, Text bleibt; Redo
    (`Strg+Y`/`Strg+Shift+Z`, `WordEditor.tsx:93-95`) stellt es wieder her.
11. Vollständige Rundreise je Format über **echten** Upload und **echten** Download
    (`waitForEvent('download')`). **Für mindestens einen Rundreise-Test je Format**
    (DOCX **und** ODT) ist der reale Klickpfad **Pflicht** (`fett-req.md` Testfall 7.10):
    `page.waitForEvent('filechooser')` + Klick auf den sichtbaren „Datei hochladen"-Button
    (Muster bereits etabliert in `file-open-edge-cases.spec.ts:296-317,366-367`,
    `card(page).getByRole('button', { name: 'Datei hochladen' })`), **nicht**
    `input.setInputFiles(...)` direkt auf dem versteckten `<input type="file">` wie es
    `docx.spec.ts:94-106`/`odt.spec.ts` heute ausschließlich tun. Die schnelleren
    `setInputFiles`-Varianten bleiben für alle übrigen Fälle (12, 13, Fixtures in
    6.3/6.4) zulässig und ergänzend bestehen — nur je Format **ein** Test muss den
    echten Dateiauswahl-Dialog-Pfad nehmen.
12. 500er-Grenze (5.6): HTML mit `font-weight:499` vs. `500` einfügen → 499 nicht fett,
    500 fett; `bolder` → dokumentiertes Ergebnis.
13. `getComputedStyle` auf eine `h1` im Editor (Defekt D / 3.5) — Ergebnis hier und in
    `fett-req.md` nachtragen.
14. **Browser-Matrix (7/15):** Test 2 (Strg+B) auf einem Nicht-Chromium-Projekt
    absichern. `playwright.config.ts` beschränkt Firefox/Safari aktuell auf `clipboard.*`
    (`:44,51`). Empfehlung: ein schmales Firefox-Projekt mit
    `testMatch: /(clipboard|bold).*\.spec\.ts/` ergänzen (oder Nichtabdeckung bewusst
    dokumentieren). Änderung an `playwright.config.ts` ist Teil dieses Plans.

### 6.2 `src/formats/shared/editor/__tests__/commands.test.ts` (ergänzt)

Die Datei existiert und testet `canCut`/`cutSelection` — **kein** `isMarkActive`.
Ergänzen: Unit-Tests für `isMarkActive` (4.1) — leere Selektion mit/ohne `storedMarks`,
voll fette Selektion, halb fette Selektion (→ `false`), Selektion über ein `image`
hinweg (5.5), **und** eine synthetische `CellSelection` über zwei Zellen (eine fett, eine
nicht) → `false`, beide fett → `true` (Grenzfall 5.15, unabhängig vom E2E-Test 6.1/7 —
Unit-Ebene deckt die reine Logik ohne Browser-Rendering ab).

### 6.3 `src/formats/docx/__tests__/roundtrip.test.ts` (ergänzt)

- `<w:b w:val="0"/>` (und `"false"`/`"off"`) importieren → **kein** `strong` (Defekt C).
- `<w:b/>` ohne `@val` → weiterhin `strong` (Nicht-Regression).
- **Synthetische** Fixture: Run mit `<w:rStyle w:val="StrongChar"/>`, dazu `styles.xml`
  mit `<w:style w:type="character" w:styleId="StrongChar"><w:rPr><w:b/></w:rPr></w:style>`
  → `strong` gesetzt (Lücke A). Zweite Variante mit `w:basedOn`-Vererbung. Dritte:
  `rStyle`=bold **plus** direktes `<w:b w:val="0"/>` → **nicht** fett (Direktvorrang).
- Reihenfolge-Unabhängigkeit (Anforderung 3.4): Farbe-dann-Fett vs. Fett-dann-Farbe
  ergibt identisches `<w:rPr>` (die vorhandene Gruppe „preserves combined marks",
  `roundtrip.test.ts:86`, erweitern). Begründung im Test: ProseMirror normalisiert
  Mark-Reihenfolge nach Schema-Rang, daher ist der `JSON.stringify`-Vergleich in
  `writer.ts:54` stabil — **kein** Writer-Fix nötig, aber zu belegen.
- Leerer Absatz, Fett nur vorgemerkt (kein Text) → Export enthält keinen leeren `<w:r>`
  (5.11, struktureller Nachweis: `storedMarks` sind nicht Teil von `doc.toJSON()`).

### 6.4 `src/formats/odt/__tests__/roundtrip.test.ts` (ergänzt)

- Synthetische Fixture: `text:span` referenziert einen Stil aus `office:styles` (nicht
  `automatic-styles`) mit `fo:font-weight="bold"` → `strong` (Lücke B).
- Stil mit `style:parent-style-name`, Fettung nur im Elternstil → `strong` (Vererbung).
- `fo:font-weight="700"` → `strong` (Lücke C); `="499"`/`="normal"` → nicht fett.
- Zwei Läufe mit identischer Markkombination → `TextStyleRegistry` erzeugt genau **eine**
  Definition `T1` (Anforderung 6.2.3, bisher ungetestet).
- Fett+Highlight kombiniert → **eine** Stildefinition mit beiden Eigenschaften
  (Anforderung 6.2.4).

### 6.5 `src/formats/docx|odt/__tests__/external-fixtures.test.ts` (ergänzt)

Gezielte Bold-Assertion an der **verifizierten** ODT-Fixture
`sameLocationSpansUsingMultipleTemplateStyles_BOLD-Outer-ITALIC-Inner-Text-Yellow.odt`
(nach 4.8 muss der `outer`-Textlauf `strong` tragen). Für DOCX **keine** reale Fixture
für Fett-via-`rStyle` vorhanden (0/19 verifiziert) → dort bleibt es bei der
synthetischen Fixture aus 6.3. Diese Assertion deckt Abnahme-Anforderung 6.1.7/6.2.6
(„reale Fremddatei mit Fett über Formatvorlage").

### 6.6 Neu: `src/formats/shared/editor/__tests__/cross-format-roundtrip.test.ts` — Anforderung 6.3

Cross-Format ist per UI **nicht** möglich (`speichern-unter-format` fehlt) → nur
Code-Ebene: `readDocx(writeDocx(doc))` liefert Ausgangs-JSON, dann
`readOdt(writeOdt(sameJson))`; `strong`-Marks an derselben Textposition nach beiden
Konvertierungen vergleichen (und mit Startpunkt ODT umgekehrt). **Kein** E2E, solange
das Zielformat nicht wählbar ist (Anforderung 6.3, ausdrücklich).

### 6.7 Unabhängige Validierung — Anforderung 6.4 (in 6.3/6.4-Tests integriert)

- DOCX: mindestens ein Fett-Export zusätzlich mit `mammoth` (bereits in
  `docx/__tests__/external-validation.test.ts` etabliert) — Ziel-Lauf als fett erkannt.
- ODT: `content.xml` mit `xmllint-wasm` gegen
  `tests/fixtures/external/odf-schema/OpenDocument-v1.3-schema.rng` validieren (valide
  **und** `fo:font-weight="bold"` vorhanden) — Muster aus
  `odt/__tests__/external-validation.test.ts` übernehmen.

### 6.8 `selection-regression.spec.ts` (unverändert, Pflicht)

Alle **vier** Fett-Tests (`:14,43,61,88`) müssen nach den Toolbar-Änderungen (4.2)
weiter grün sein — reiner Kompatibilitätsnachweis, keine Teständerung.

---

## 7. Zuordnung zu den Abnahmekriterien (`fett-req.md` Abschnitt 8, 7 Punkte)

| DoD-Punkt | Abdeckung |
|---|---|
| 1. Alle Testfälle Abschnitt 7 real im Browser | 6.1 (neue `bold.spec.ts`, jetzt 14 Tests inkl. Defekt E [6] und `CellSelection` [7]) + Matrix-Erweiterung 6.1/14 |
| 2. Rundreisen (Abschnitt 6) per Re-Import **und** unabhängigem Validierer | 6.1/8,9,11 + 6.3–6.7 (mammoth/xmllint) |
| 3. Alle Grenzfälle (Abschnitt 5) geprüft/dokumentiert | 5.1/5.11 strukturell (2.x/4.x), 5.2–5.6/5.10 als Tests (6.x), 5.7–5.9 als Fixtures (6.3–6.5), 5.13 = 6.8, **5.15 (`CellSelection`) = 4.1 (Fix) + 6.1/7 + 6.2 (Unit)** |
| 4. Defekte A–E einzeln behoben+Regressionstest **oder** dokumentiert; 3.5 beantwortet | A/B → 4.1/4.2/6.1/6.2; C → 4.6/6.3; D → 4.5/6.1-13; **E → 2.5/4.2/4.3/6.1-6 (behoben, nicht nur dokumentiert — DoD verlangt das explizit)**; 3.5 → Abschnitt 5 |
| 5. Selection-Sync-Regression bleibt Pflicht | 6.8 (unverändert) |
| 6. Icon-Risiko bewertet | 3.4 + 4.2 (SVG `BoldIcon`) + 5 |
| 7. Cross-Format-Einschränkung sichtbar bis `speichern-unter-format` | 6.6 (Code-Ebene), E2E bewusst ausgelassen und dokumentiert |

---

## 8. Reihenfolge der Umsetzung — Hardest/Core-first

Bewusst **nicht** easy-first (Korrektur gegenüber der alten Fassung dieses Plans): die
schweren Import-Fidelity-Arbeiten und die Kern-Interaktion — **inklusive des zwingend zu
behebenden Defekts E** — zuerst, Kosmetik zuletzt. Jeder Schritt landet **zusammen mit
seinem Regressionstest** und wird einzeln committet/gepusht; CI-Status nach jedem Push
selbst prüfen.

1. **DOCX `w:rStyle`-Auflösung + `w:basedOn`-Kette** (4.6 Teil 2) mit synthetischen
   Fixtures (6.3) — schwerste, datenverlust-kritische Änderung (`FEATURE-SPEC` §18).
2. **ODT Stil-Kaskade** (`office:styles` + `parent-style-name` + numerisch, 4.8) mit
   Fixtures (6.4) und der verifizierten realen Fixture (6.5).
3. **`isMarkActive` (`CellSelection`-sicher) + Toolbar-Umbau + Defekt-E-Fix
   (`removeWhenPresent: false`)** (4.1/4.2/4.3) — Kern-Interaktion (Defekt A+B+E), inkl.
   Unit-Tests (6.2, inkl. `CellSelection`) und E2E-Kern (6.1 Tests 1–7). Bewusst als
   **ein** zusammenhängender Schritt, weil alle drei Aufrufstellen (`Toolbar.tsx:78`,
   `WordEditor.tsx:98-100`) ohnehin angefasst werden und der Defekt-E-Fix am selben Diff
   hängt wie der Defekt-A-Fix (`onMouseDown`→`onClick`-Umzug, 4.2).
4. **DOCX `@w:val`-Fix** (4.6 Teil 1) + Regressionstests (6.3) — klein, isoliert.
5. **Cross-Format- und Kombi-/Undo-/Rundreise-Tests** (6.1 Tests 8–11, 6.6, 6.7) —
   Test 11 jetzt **inklusive** des Pflicht-`filechooser`-Klickpfads je Format (7.10).
6. **CSS-Heading-Fett** (4.5) + `getComputedStyle`-Test (6.1/13) → 3.5 endgültig
   beantworten und in `fett-req.md` nachtragen.
7. **Icon** (SVG `BoldIcon`, 4.2) + **Browser-Matrix** (`playwright.config.ts`, 6.1/14).
8. Entscheidung Abschnitt 5 dokumentieren; 4.7/4.9 nur bei Option 3.

Nicht-Ziele (bewusst außerhalb Scope, fürs Backlog vermerkt): Bold-Aus-Override in
Überschriften (Option 3); `@w:val`/`isOnOffTrue` konsequent auch für alle übrigen
On/Off-Elemente über Fett hinaus; Tastatur-Zugänglichkeit der übrigen Toolbar-Buttons
(`AlignButton`, Listen, Tabelle/Bild); UI-`speichern-unter-format` für echte
Cross-Format-E2E-Rundreisen; `removeWhenPresent: false` für Marks außerhalb
F/K/U (Farbe/Hervorhebung nutzen `addMark`/`removeMark` direkt, nicht `toggleMark` —
Defekt E betrifft sie strukturell nicht, siehe `commands.ts:106-122`).
