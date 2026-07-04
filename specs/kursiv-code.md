# Kursiv — dateigenauer Umsetzungsplan

Gegenstück zu `specs/kursiv-req.md`. Dieses Dokument beschreibt, nach tatsächlicher
Codelektüre (inkl. Lektüre der `prosemirror-commands`/`prosemirror-model`-Quelltexte
in `node_modules` und Stichproben gegen die real vorhandenen Fixture-Korpora unter
`tests/fixtures/external/{docx,odt}`), was am bestehenden Code zu ändern ist, welche
Dateien neu angelegt werden, und wie die in der Anforderung geforderte Verifikation
technisch umgesetzt wird.

---

## 0. TL;DR

Anders als beim bereits geprüften `unterstrichen-einfach` (siehe
`specs/unterstrichen-einfach-code.md`) ist der Ist-Stand für „Kursiv" **nicht** nur
lückenhaft getestet, sondern enthält **mehrere echte, durch Quellcode- und
Fixture-Lektüre bestätigte Funktionsfehler** — nicht nur „Verdachtsfälle":

1. **Bestätigt (nicht nur vermutet):** Die Aktiv-Anzeige des Toolbar-Buttons
   ignoriert `state.storedMarks` UND prüft bei einer Selektion nur `$from`
   statt der gesamten Selektion — beides durch Lektüre von
   `node_modules/prosemirror-commands/dist/index.js` bestätigt, da `toggleMark`
   selbst intern exakt das Muster (`state.storedMarks || $cursor.marks()` bzw.
   `rangeHasMark`/„every") verwendet, das der Toolbar-Code nicht nachbildet.
2. **Bestätigt, echter Funktionsfehler (nicht nur Anzeige):** Alle Toggle-Aufrufe
   (`Toolbar.tsx`, `WordEditor.tsx`) verwenden `toggleMark(markType)` **ohne**
   Optionen, d. h. mit der Bibliotheks-Voreinstellung `removeWhenPresent: true`.
   Bei einer **gemischten** Selektion entfernt das die Formatierung, sobald sie
   irgendwo im Bereich vorkommt — das Gegenteil von Anforderung 2.1.1 („sofern
   nicht bereits **einheitlich** kursiv") und der Word/LibreOffice-Konvention.
3. **Bestätigt anhand einer echten Datei aus dem vorhandenen Fixture-Korpus**
   (`tests/fixtures/external/docx/form_footnotes.docx`, siehe Abschnitt 7):
   Ein Lauf mit `<w:i w:val="0"/>` existiert real in diesem Korpus und wird vom
   aktuellen Reader fälschlich als kursiv importiert — Grenzfall 3.3 der
   Anforderung ist kein Blaue-Vermutung, sondern reproduzierbar.
4. **Bestätigt, aber (noch) ohne passendes Korpus-Fixture:** `w:rStyle`
   (19 Fixture-Dateien referenzieren `w:rStyle`, keine davon zeigt aktuell
   Kursiv-über-Formatvorlage) und ODT `style:parent-style-name`
   auf `style:family="text"` (25 Fixture-Dateien referenzieren das Attribut)
   werden vom jeweiligen Reader nachweislich **nicht ausgewertet** — der
   Code-Pfad fehlt komplett, unabhängig davon, ob ein Fixture zufällig Kursiv
   darüber transportiert.
5. `oblique` wird nicht erkannt (einfacher, unstrittiger Fix).

Der Umsetzungsaufwand gliedert sich in:

- **Ein gemeinsamer Fix in `commands.ts`/`Toolbar.tsx`/`WordEditor.tsx`** (neue,
  generische, testbare Befehle `isMarkActive`/`toggleInlineMark`), der die
  Punkte 1+2 behebt. Da `MarkButton` und die Keymap-Einträge **pro Mark
  identisch** implementiert sind, wirkt dieser Fix zwangsläufig auch auf
  „Fett"/„Unterstrichen"/„Durchgestrichen" — das ist beabsichtigt und durch
  Anforderung 2.1.3 („Symmetrisch zu Fett") sowie durch die noch offene,
  strukturgleiche Beobachtung in `fett-req.md` Grenzfall 3.3 gedeckt. Für
  „Fett"/„Unterstrichen" existiert noch **kein** verabschiedeter Code-Plan
  (kein `fett-code.md`/`durchgestrichen-code.md` im Repo), es gibt also keinen
  Konflikt mit einer bereits akzeptierten Entscheidung.
- **Ein Reader-Fix in `docx/reader.ts`** (`w:val`-Auswertung nach OOXML
  `ST_OnOff`-Konvention) sowie **eine neue Auflösung von
  `w:rStyle`/`w:basedOn`** gegen `word/styles.xml`.
- **Ein Reader-Umbau in `odt/reader.ts`** (Zusammenführen von
  `office:automatic-styles` **und** `office:styles` aus `content.xml` **und**
  `styles.xml`, plus Auflösung von `style:parent-style-name`), inklusive
  `oblique`.
- **Keine Änderung** an `schema.ts`, `docx/writer.ts`, `odt/writer.ts`,
  `odt/styleRegistry.ts` — die Export-Seite ist bereits korrekt (siehe
  Abschnitt 8).
- **Der weit überwiegende Teil des Aufwands ist neue Testabdeckung** (Unit +
  E2E), siehe Abschnitt 5.

---

## 1. Methodik dieser Prüfung

Gelesen wurden: `src/formats/shared/schema.ts`,
`src/formats/shared/editor/Toolbar.tsx`, `src/formats/shared/editor/WordEditor.tsx`,
`src/formats/shared/editor/commands.ts`, `src/formats/docx/writer.ts`,
`src/formats/docx/reader.ts`, `src/formats/docx/styleDefs.ts`,
`src/formats/docx/xmlUtil.ts`, `src/formats/odt/writer.ts`, `src/formats/odt/reader.ts`,
`src/formats/odt/styleRegistry.ts`, `src/formats/odt/xmlUtil.ts`, beide
`__tests__/roundtrip.test.ts`, beide `__tests__/external-fixtures.test.ts`,
`tests/e2e/*.spec.ts`, `src/index.css`, sowie zum Vergleich der bereits
akzeptierte Plan `specs/unterstrichen-einfach-code.md` (gleiche Codebasis,
strukturell identischer Mark-Mechanismus) und die verwandten, noch offenen
Anforderungen `specs/fett-req.md`, `specs/durchgestrichen-req.md`,
`specs/einfuegen-code.md` (Cross-Dependency zu Copy/Paste, siehe Abschnitt 9).

Zusätzlich, über die reine Codelektüre hinaus:

- **Quelltext von `prosemirror-commands`** (`node_modules/prosemirror-commands/dist/index.js`,
  Funktionen `toggleMark`, `markApplies`) und **`prosemirror-model`**
  (`node_modules/prosemirror-model/dist/index.js`, `Node.rangeHasMark`) gelesen,
  um Grenzfälle 3.1/3.2 der Anforderung nicht spekulativ, sondern anhand des
  tatsächlichen Bibliotheksverhaltens zu bewerten (siehe Abschnitt 3.1–3.3).
- **Stichprobenauswertung der vorhandenen Fixture-Korpora**
  (`tests/fixtures/external/docx`, `tests/fixtures/external/odt`, je >50 reale
  Dateien aus dem Apache-POI- bzw. ODF-Toolkit/TDF-Korpus) per Skript
  durchsucht auf `<w:i w:val="false|0">`, `<w:rStyle>`,
  `style:parent-style-name` (Familie `text`) und `font-style="oblique"` —
  Ergebnisse in Abschnitt 7.

---

## 2. Ist-Zustand nach Codelektüre — Abgleich mit der Anforderungstabelle (Abschnitt 0)

| Fundstelle laut Anforderung | Verifiziert im Code | Abweichung / Ergänzung |
|---|---|---|
| `schema.ts` Mark `em`, `parseDOM: [{tag:'em'},{tag:'i'},{style:'font-style=italic'}]`, `toDOM → ['em',0]` | Ja, exakt so (Zeilen 116–121) | keine — bewusst keine Änderung, siehe Abschnitt 8 |
| `Toolbar.tsx` Zeile 136, `MarkButton mark="em" label="K" title="Kursiv" glyphClassName="italic"` | Ja, exakt so | keine strukturelle Abweichung, aber Zeile 41–42 (`active`) ist Teil des bestätigten Fehlers 3.1/3.2 |
| `Toolbar.tsx` Zeile 49–51, direkter `toggleMark(markType)`-Aufruf | Ja | Bestätigter Fehler 3.3 (Voreinstellung `removeWhenPresent: true`) |
| `WordEditor.tsx` Zeile 77, `'Mod-i': toggleMark(wordSchema.marks.em)` | Ja | Gleicher Fehler 3.3 wie oben, plus Keymap muss denselben Befehl wie der Button verwenden (Konsistenz-Pflicht aus Anforderung 2.1.2 „identische Wirkung wie Klick") |
| `docx/writer.ts` Zeile 22, `<w:i/>` bei `mark.type === 'em'` | Ja | keine — Export ist korrekt und bewusst unverändert (Abschnitt 8) |
| `docx/reader.ts` Zeile 103, nur Existenzprüfung von `<w:i>` | Ja | **Bestätigter Fehler** (Abschnitt 3.4) — zusätzlich **bestätigt in echter Fixture-Datei**, siehe Abschnitt 7 |
| `odt/writer.ts` Zeile 29 + `styleRegistry.ts` Zeile 49 | Ja | keine — Export korrekt, unverändert |
| `odt/reader.ts` Zeile 36–67/52/88, nur `office:automatic-styles`, `=== 'italic'` exakt | Ja | **Bestätigter Fehler** (Abschnitt 3.6/3.7) |
| Unit-Tests Rundreise (konstruierte Daten) | Ja, beide `roundtrip.test.ts`, Zeile 56–92 | bestätigt: nur Reader/Writer isoliert, keine Formatvorlagen-/`w:val`-Fälle |
| E2E-Test für „Kursiv" | Keine gefunden | bestätigt — `tests/e2e/` enthält weder „Kursiv" noch `Mod-i`/`ControlOrMeta+i` als String, und keinen `getByTitle('Kursiv')`-Aufruf |

Zusätzlich beim Audit gefunden, **nicht** in der Anforderungstabelle erwähnt:

- `commands.ts` enthält **keinerlei** Mark-bezogene Hilfsfunktion — weder
  `isMarkActive` noch ein Toggle-Wrapper. Das deckt sich mit der in der
  Anforderung (Zeile 27) explizit kritisierten Lücke „kein eigener, testbarer
  Befehl … anders als z. B. `setAlign`, `toggleList`". Der in diesem Plan
  vorgeschlagene Fix (Abschnitt 4.1) schließt diese Lücke direkt und macht sie
  für **alle** vier Mark-Buttons einzeln unit-testbar.
- `prosemirror-commands`s `toggleMark` exportiert die für 3.2 nötige
  „ist die Selektion einheitlich formatiert"-Prüfung **nicht** öffentlich (sie
  ist eine private Closure innerhalb der `toggleMark`-Fabrikfunktion,
  Zeile 701–711 in `node_modules/prosemirror-commands/dist/index.js`) — sie
  muss für die Aktiv-Anzeige in `commands.ts` **nachgebaut**, nicht importiert
  werden (siehe Abschnitt 4.1).
- `src/formats/docx/reader.ts::parseStylesXml` (Zeile 52–66) liest bereits
  `word/styles.xml`, aber **ausschließlich** `w:type="paragraph"`-Stile (für
  Überschriften-Erkennung). Es gibt noch **keinen** Code-Pfad, der
  `w:type="character"`-Stile überhaupt einliest — `w:rStyle` wird nirgends im
  Reader referenziert (bestätigt: `grep -c "rStyle"` in `docx/reader.ts` → 0
  Treffer).
- `src/index.css` enthält **keine** Regel, die `em`/`font-style` zurücksetzt
  (Abschnitt 4 der Anforderung, „verifizieren, dass keine globale CSS-Regel
  `em { font-style: normal }` dies unterdrückt") — bestätigt unbedenklich,
  reiner Browser-Standardstil greift. Auch Tailwinds Preflight (`@import
  'tailwindcss'` in `index.css`, keine zusätzliche `@tailwindcss/typography`-
  Einbindung) setzt `font-style` nicht zurück. Keine Änderung nötig, aber ein
  visueller Test (Abschnitt 5.2) sollte das trotzdem einmal automatisiert
  festhalten, da es sich um eine stillschweigende Abhängigkeit von
  Tailwind-Interna handelt, die sich mit einem Versions-Update ändern könnte.

---

## 3. Gefundene Defekte — mit Quellcode-/Fixture-Beleg

### 3.1 Aktiv-Anzeige ignoriert `storedMarks` — CONFIRMED

`Toolbar.tsx` Zeile 42:

```ts
const active = markType.isInSet(view.state.selection.$from.marks()) !== undefined
```

`node_modules/prosemirror-commands/dist/index.js` Zeile 689 (innerhalb von
`toggleMark`, Zweig für leere Selektion/Cursor) zeigt, welches Muster
ProseMirror selbst für exakt diese Frage verwendet:

```js
if (markType.isInSet(state.storedMarks || $cursor.marks()))
    dispatch(state.tr.removeStoredMark(markType));
else
    dispatch(state.tr.addStoredMark(markType.create(attrs)));
```

Der Toolbar-Code bildet dieses `state.storedMarks || …`-Muster **nicht** nach.
Damit ist der in Anforderung 3.1 geäußerte Verdacht **bestätigt, kein
Blaue-Vermutung**: Nach Toggle an leerer Schreibmarke zeigt der Button
weiterhin „inaktiv", bis das erste Zeichen getippt wurde — obwohl
`state.storedMarks` bereits korrekt gesetzt ist (`WordEditor.tsx`s
`dispatchTransaction` ruft zwar bei jeder Transaktion `forceRender` auf, Zeile
97, das ändert aber nichts an der fehlerhaften *Datenquelle* der Prüfung
selbst).

### 3.2 Aktiv-Anzeige bei gemischter Selektion nur `$from` — CONFIRMED

Gleiche Zeile wie oben: bei nicht-leerer Selektion wird ausschließlich
`$from.marks()` ausgewertet, nicht der gesamte Bereich. `toggleMark` selbst
verwendet für die äquivalente add/remove-Entscheidung `doc.rangeHasMark`
(Existenz-Prüfung „irgendwo im Bereich", Zeile 699) bzw. bei
`removeWhenPresent:false` eine `every`-Prüfung, ob **jeder** Knoten im Bereich
die Marke trägt (Zeile 702–711, siehe `node_modules/prosemirror-model/dist/index.js`
Zeile 1386–1394 für `rangeHasMark` selbst). Der Toolbar-Code hat kein
Äquivalent zu beidem. Bestätigt: Bei „AB" mit A kursiv, B nicht, zeigt der
Button nach Selektion beider Zeichen fälschlich „aktiv" (Zustand von A), obwohl
die Selektion gemischt ist — exakt wie in der Anforderung vermutet.

### 3.3 `toggleMark`-Voreinstellung widerspricht Anforderung 2.1.1 bei gemischter Selektion — CONFIRMED, echter Funktionsfehler (nicht nur Anzeige)

Dies ist ein Fund, der **über** die in der Anforderung unter 3.2 explizit
gestellte Frage („was soll bei gemischter Selektion passieren") hinausgeht und
sie technisch beantwortet: `toggleMark(markType)` — so wie es aktuell **ohne**
drittes Options-Argument aufgerufen wird (`Toolbar.tsx` Zeile 51,
`WordEditor.tsx` Zeile 77) — verwendet die Bibliotheks-Voreinstellung
`removeWhenPresent: true` (`node_modules/prosemirror-commands/dist/index.js`
Zeile 680: `let removeWhenPresent = (options && options.removeWhenPresent) !== false`).
Mit dieser Voreinstellung gilt (Zeile 698–699):

```js
if (removeWhenPresent) {
    add = !ranges.some(r => state.doc.rangeHasMark(r.$from.pos, r.$to.pos, markType));
}
```

D. h.: Ist die Marke **irgendwo** (auch nur an einer Stelle) im selektierten
Bereich vorhanden, wird sie für die **gesamte** Selektion entfernt. Für „AB"
(A kursiv, B nicht) würde ein Toggle also **A** die Kursivformatierung
**entziehen**, statt — wie Anforderung 2.1.1 verlangt („sofern nicht bereits
**einheitlich** kursiv … wird Kursiv auf den gesamten markierten Bereich
angewendet") — **B** kursiv zu machen. Das ist die dokumentierte
Word/LibreOffice-Konvention (in der Bibliothek selbst als Kommentar
hinterlegt, Zeile 670–678: „This will remove the mark if any marks of that
type exist in the selection, or add it otherwise" — also exakt das *nicht*
Word-kompatible Verhalten als Default). Die alternative Einstellung
`removeWhenPresent: false` (Zeile 701–711) implementiert stattdessen genau die
in der Anforderung verlangte Semantik: „nur entfernen, wenn *jeder* Knoten im
Bereich die Marke bereits trägt; sonst für den gesamten Bereich setzen."

**Das ist ein echter, aus der Anforderung direkt ableitbarer Bugfix, keine
optionale Politur** — betrifft aktuell **alle vier** Mark-Buttons
(`strong`/`em`/`underline`/`strike`) gleichermaßen, da `MarkButton` eine
gemeinsame Komponente ist.

### 3.4 DOCX-Import: `<w:i w:val="false|0">` fehlinterpretiert — CONFIRMED anhand echter Fixture-Datei

`docx/reader.ts::marksFromRunProperties`, Zeile 103:

```ts
if (firstChildNS(rPr, OOXML_NAMESPACES.w, 'i')) marks.push({ type: 'em' })
```

Per Skript gegen den vorhandenen Fixture-Korpus geprüft (Node-Skript, JSZip,
Regex gegen `word/document.xml` aller Dateien in
`tests/fixtures/external/docx`): **`tests/fixtures/external/docx/form_footnotes.docx`
enthält real** (nicht konstruiert) einen Lauf

```xml
<w:p><w:pPr><w:pStyle w:val="BodyText"/></w:pPr>
<w:r><w:rPr><w:i w:val="0"/></w:rPr>
<w:t>Provide services in Brazil of a temporary nature, including activities such as office and technical support, installation and repair of equipment, including computer and t...</w:t></w:r>
```

Mit dem aktuellen Reader wird dieser Text als kursiv importiert
(`marks: [{ type: 'em' }]`), obwohl `w:val="0"` laut OOXML `ST_OnOff` explizit
„aus" bedeutet. `bug65649.docx` enthält denselben Musterfall. Der in
Anforderung 3.3 geäußerte Verdacht ist damit **nicht nur plausibel, sondern an
einer bereits im Repo vorhandenen, unveränderten Drittdatei nachweisbar** —
ein bestehender Test kann direkt gegen diese Datei geschrieben werden, ganz
ohne synthetisches Fixture (siehe Abschnitt 5.1, Abschnitt 7).

### 3.5 DOCX-Import: `w:rStyle` nicht aufgelöst — CONFIRMED (Code-Pfad fehlt), Fixture-Beleg für Häufigkeit, nicht für konkreten Datenverlust

`marksFromRunProperties` (Zeile 99–114) liest ausschließlich direkte
Kind-Elemente von `w:rPr`. Es gibt **keinen** Aufruf von
`firstChildNS(rPr, OOXML_NAMESPACES.w, 'rStyle')` im gesamten Reader (bestätigt
per Volltextsuche). Stichprobe über den Fixture-Korpus: **19 von >50 Dateien**
referenzieren `<w:rStyle w:val="…">` in `word/document.xml`
(u. a. `55966.docx`, `56392.docx`, `58618.docx`, `Bug54849.docx`,
`bug59058.docx`, `bug65649.docx`, `bug65738.docx`, `drawing.docx`,
`endnotes.docx`). Von diesen referenziert **aktuell keine** eine
Zeichenformatvorlage, deren `w:rPr` selbst `<w:i/>` enthält — der *konkrete*
Datenverlust an Kursiv ist im vorhandenen Korpus also (noch) nicht direkt
nachweisbar, **der fehlende Code-Pfad selbst ist es**: 19 reale Dateien nutzen
das Feature `w:rStyle` produktiv (für andere Eigenschaften, z. B. Hyperlink-
oder Kommentar-Zeichenstile), ohne dass der Reader es überhaupt betrachtet.
Für den in Anforderung 3.4 geforderten Testfall („Zeichenformatvorlage Betont
mit `<w:i/>`") ist daher — wie beim strukturgleichen Fall in
`unterstrichen-einfach-code.md` Abschnitt 6 für `w:val="double"`/`"wave"` — eine
**handgebaute** DOCX-Datei nötig (siehe Abschnitt 5.1).

### 3.6 ODT-Import: nur `office:automatic-styles`, keine `office:styles`/`style:parent-style-name`-Auflösung — CONFIRMED (Code-Pfad fehlt), Fixture-Beleg für Häufigkeit

`parseAutomaticStyles` (Zeile 36–77) durchsucht ausschließlich das an sie
übergebene `office:automatic-styles`-Element; `readOdt` (Zeile 239–285) ruft
sie nur mit `contentDoc`s bzw. (für Kopf-/Fußzeile) `stylesDoc`s
`automatic-styles`-Element auf — **niemals** mit `office:styles`
(benannte Formatvorlagen, i. d. R. in `styles.xml`). `style:parent-style-name`
wird an keiner Stelle im Reader gelesen (bestätigt per Volltextsuche). Stichprobe:
**25 von >50 ODT-Fixture-Dateien** enthalten `style:parent-style-name` auf
einem `style:family="text"`-Element (u. a. `CharacterParagraphFormat_MSO15.odt`,
`coloredTable_MSO15.odt`, `crazyTable.odt`, `feature_fields.odt`,
`hyperlinkSpaces.odt`, `hyperlinkSpacesNoUnderline.odt`, `images.odt`) — auch
hier: kein Fixture zeigt aktuell konkret verlorenes Kursiv über diesen Pfad,
aber der Code-Pfad selbst fehlt nachweislich für ein in der Praxis (¼ des
Korpus!) verbreitetes Muster. Für den in Anforderung 3.5 geforderten Testfall
ist ebenfalls eine handgebaute ODT-Datei nötig (Abschnitt 5.1).

### 3.7 ODT-Import: `fo:font-style="oblique"` nicht erkannt — CONFIRMED, kein Korpus-Fixture

`odt/reader.ts` Zeile 52: exakter Stringvergleich `=== 'italic'`. Stichprobe im
ODT-Korpus: **0 Treffer** für `font-style="oblique"` — reale Testdaten enthalten
diesen Wert nicht, er ist aber laut ODF-Spezifikation gültig. Entscheidung
gemäß Anforderung 3.6: **ja, als Kursiv behandeln** (vertretbare Vereinfachung,
visuell/inhaltlich deckungsgleich; das PM-Schema hat ohnehin keine Mark, die
zwischen „italic" und „oblique" unterscheidet, ein Roundtrip würde
`oblique` → `em` → beim Export immer als `italic` zurückschreiben — das ist
eine bewusste, hier dokumentierte Vereinfachung, siehe Abschnitt 8/9).

---

## 4. Dateigenauer Änderungsplan — bestehende Dateien

| # | Datei | Änderung | Typ |
|---|---|---|---|
| 1 | `src/formats/shared/editor/commands.ts` | Neu: `isMarkActive(state, markType)` und `toggleInlineMark(markType, attrs?)` (Abschnitt 4.1) | Fix + neue testbare API |
| 2 | `src/formats/shared/editor/Toolbar.tsx` | `MarkButton` nutzt `isMarkActive`/`toggleInlineMark` statt `markType.isInSet($from.marks())`/`toggleMark` direkt (Abschnitt 4.1) | Fix |
| 3 | `src/formats/shared/editor/WordEditor.tsx` | Keymap-Einträge `Mod-b`/`Mod-i`/`Mod-u` nutzen `toggleInlineMark` statt `toggleMark` direkt, damit Tastatur und Klick identisch reagieren (Anforderung 2.1.2) (Abschnitt 4.1) | Fix |
| 4 | `src/formats/docx/reader.ts` | `w:val`-Auswertung nach `ST_OnOff` (`onOffVal`-Helfer) für `<w:i>`; neue `parseCharacterStyles`/`resolveCharacterStyleItalic` gegen `word/styles.xml`; `marksFromRunProperties` erhält zusätzlichen Parameter und löst `w:rStyle` auf (Abschnitt 4.2) | Fix + neues Feature |
| 5 | `src/formats/odt/reader.ts` | Umbau: `parseTextStyleDefs`/`resolveTextStyle` statt `parseAutomaticStyles`-Teilstück für `family="text"`; Zusammenführen von `content.xml`- und `styles.xml`-Stilen (automatisch **und** benannt); `style:parent-style-name`-Kette; `oblique` zusätzlich zu `italic` (Abschnitt 4.3) | Fix + neues Feature |
| 6 | `src/formats/shared/schema.ts` | **Keine Änderung.** `em`-Mark-Definition ist bereits korrekt und vollständig (Abschnitt 8) | — |
| 7 | `src/formats/docx/writer.ts` | **Keine Änderung.** Export ist bereits korrekt; Schreiben immer als direkte Lauf-Eigenschaft (`<w:i/>`), nie als `w:rStyle`-Referenz — das ist konsistent mit dem übrigen Writer-Verhalten und für die inhaltliche (nicht bytegenaue) Rundreise-Anforderung ausreichend (Abschnitt 8) | — |
| 8 | `src/formats/odt/writer.ts` / `src/formats/odt/styleRegistry.ts` | **Keine Änderung.** Export erzeugt bereits `fo:font-style="italic"` korrekt (Abschnitt 8) | — |
| 9 | `src/formats/docx/__tests__/roundtrip.test.ts`, `src/formats/odt/__tests__/roundtrip.test.ts` | Keine Änderung an bestehenden Tests nötig (Kursiv-Fälle dort bereits grün); nur **Ergänzung** durch neue, dedizierte Testdateien (Abschnitt 5.1) | Ergänzung |
| 10 | `tests/e2e/selection-regression.spec.ts` | Drei neue Tests, identisch zu den bestehenden Fett-Varianten, aber mit „Kursiv" (Grenzfall 3.7 / DoD Punkt 4) | Neu (Erweiterung bestehender Datei) |

### 4.1 `commands.ts` — `isMarkActive` / `toggleInlineMark`

```ts
import type { Command, EditorState } from 'prosemirror-state'
import type { MarkType } from 'prosemirror-model'
import { toggleMark as pmToggleMark } from 'prosemirror-commands'
// … bestehende Imports unverändert …

/**
 * Toggles `markType` the way Word/LibreOffice do: if the current selection
 * does *not* uniformly carry the mark, the whole selection is switched ON;
 * only when it is already uniform does the toggle switch it OFF. This is
 * `prosemirror-commands`' `toggleMark` with `removeWhenPresent: false` — the
 * library's *default* (`removeWhenPresent: true`, used by every call site in
 * this repo before this fix) instead removes the mark as soon as it is found
 * *anywhere* in the selection, which silently contradicts the "Kursiv"
 * requirement 2.1.1 ("... sofern nicht bereits (einheitlich) kursiv") for a
 * genuinely mixed selection. For an empty selection (caret only) this behaves
 * exactly like a bare `toggleMark` — the option only affects range selections.
 */
export function toggleInlineMark(markType: MarkType, attrs: Record<string, unknown> | null = null): Command {
  return pmToggleMark(markType, attrs, { removeWhenPresent: false })
}

/**
 * Whether `markType` should show as "active" for the current selection.
 *
 * - Empty selection: mirrors exactly what `toggleMark` itself checks
 *   internally (`state.storedMarks || $cursor.marks()`, see
 *   `prosemirror-commands`' `toggleMark`) so a toggle at the bare caret is
 *   reflected immediately, *before* any text is typed (fixes Grenzfall 3.1).
 * - Range selection: true only if *every* inline node in *every* selection
 *   range already carries the mark (mirrors the "every" branch `toggleMark`
 *   uses internally for `removeWhenPresent: false`, which is not exported by
 *   `prosemirror-commands` and is therefore reimplemented here) — a mixed
 *   selection reports `false`, never a false "active" (fixes Grenzfall 3.2).
 *   Iterates `state.selection.ranges` (not just `$from`/`$to`) so this also
 *   works correctly for a `CellSelection` spanning multiple table cells.
 */
export function isMarkActive(state: EditorState, markType: MarkType): boolean {
  const { $from, empty } = state.selection
  if (empty) return !!markType.isInSet(state.storedMarks || $from.marks())

  return state.selection.ranges.every(({ $from: rFrom, $to: rTo }) => {
    let uniform = true
    state.doc.nodesBetween(rFrom.pos, rTo.pos, (node, pos, parent) => {
      if (!uniform || !node.isInline) return
      const isWhitespaceOnly =
        node.isText &&
        /^\s*$/.test(node.textBetween(Math.max(0, rFrom.pos - pos), Math.min(node.nodeSize, rTo.pos - pos)))
      if (!isWhitespaceOnly && parent?.type.allowsMarkType(markType) && !markType.isInSet(node.marks)) {
        uniform = false
      }
    })
    return uniform
  })
}
```

**`Toolbar.tsx`** — `MarkButton` (Zeile 28–62):

```ts
import { isMarkActive, toggleInlineMark } from './commands'
// toggleMark-Import aus 'prosemirror-commands' entfernen — wird hier nicht mehr direkt benutzt

function MarkButton({ view, mark, label, title, glyphClassName = '' }: {/* unverändert */}) {
  const markType = wordSchema.marks[mark]
  const active = isMarkActive(view.state, markType)
  return (
    <button
      /* … */
      aria-pressed={active}
      onMouseDown={(e) => {
        e.preventDefault()
        run(view, toggleInlineMark(markType))
      }}
      /* … */
    >
      <span className={glyphClassName}>{label}</span>
    </button>
  )
}
```

**`WordEditor.tsx`** (Zeile 76–78):

```ts
import { toggleInlineMark } from './commands'
// toggleMark-Import aus 'prosemirror-commands' entfernen (nicht mehr direkt verwendet)

keymap({
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
  Enter: splitListItem(wordSchema.nodes.list_item),
  'Mod-b': toggleInlineMark(wordSchema.marks.strong),
  'Mod-i': toggleInlineMark(wordSchema.marks.em),
  'Mod-u': toggleInlineMark(wordSchema.marks.underline),
}),
```

**Bewusste Auswirkung auf andere Marks:** Da `MarkButton` und die
`keymap()`-Einträge nicht pro Mark spezialisiert sind, ändert dieser Fix das
Verhalten von „Fett" (`strong`), „Unterstrichen" (`underline`) identisch mit.
Das ist beabsichtigt (Anforderung 2.1.3 verlangt exakt diese Symmetrie) und
unproblematisch, weil weder `fett-code.md` noch `durchgestrichen-code.md`
existieren — es gibt also keine bereits abgenommene, dem widersprechende
Spezifikation. Die **Testabdeckung**, die dieser Plan liefert (Abschnitt 5),
bezieht sich aber ausschließlich auf Kursiv, wie von `kursiv-req.md` gefordert;
eine analoge Testerweiterung für Fett/Durchgestrichen ist nicht Gegenstand
dieses Plans (siehe Abschnitt 9).

`strike` besitzt aktuell **kein** Tastenkürzel (kein `Mod-…`-Eintrag in
`WordEditor.tsx`) — unverändert, außerhalb des Geltungsbereichs dieser
Anforderung.

### 4.2 `docx/reader.ts`

Neuer Helfer (OOXML `ST_OnOff`-Konvention: fehlendes `w:val` bzw. `"true"`/`"1"`
= an, `"false"`/`"0"` = aus; unbekannte/nicht standardkonforme Werte fallen
lenient auf „an" zurück — konsistent mit dem bereits im Reader etablierten
Umgang mit nicht-strengen Fremddateien, z. B. `headingLevelForStyle`s
Regex-Fallback):

```ts
function onOffVal(el: Element | null): boolean | undefined {
  if (!el) return undefined
  const raw = el.getAttributeNS(OOXML_NAMESPACES.w, 'val')
  if (raw === null) return true // bare <w:i/> element = on
  const v = raw.toLowerCase()
  if (v === 'false' || v === '0' || v === 'off') return false
  return true // 'true' | '1' | 'on' | unrecognized (documented lenient fallback)
}
```

Zeichenformatvorlagen-Auflösung (neu, analog zur vorhandenen
`parseStylesXml`/`HeadingInfo`, aber für `w:type="character"` statt
`"paragraph"`):

```ts
interface CharacterStyleDef {
  basedOn: string | null
  italic: boolean | undefined // undefined = diese Formatvorlage sagt nichts aus, an Eltern-Stil delegieren
}

function parseCharacterStyles(stylesDoc: Document | null): Map<string, CharacterStyleDef> {
  const defs = new Map<string, CharacterStyleDef>()
  if (!stylesDoc) return defs
  for (const styleEl of Array.from(stylesDoc.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'style'))) {
    if (styleEl.getAttributeNS(OOXML_NAMESPACES.w, 'type') !== 'character') continue
    const styleId = styleEl.getAttributeNS(OOXML_NAMESPACES.w, 'styleId')
    if (!styleId) continue
    const rPr = firstChildNS(styleEl, OOXML_NAMESPACES.w, 'rPr')
    const basedOnEl = firstChildNS(styleEl, OOXML_NAMESPACES.w, 'basedOn')
    defs.set(styleId, {
      basedOn: basedOnEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? null,
      italic: onOffVal(rPr && firstChildNS(rPr, OOXML_NAMESPACES.w, 'i')),
    })
  }
  return defs
}

// Guards a cyclic/self-referential w:basedOn chain in a malformed file — same
// defensive pattern as MAX_TABLE_NESTING_DEPTH further down in this file.
const MAX_STYLE_CHAIN_DEPTH = 25

function resolveCharacterStyleItalic(styleId: string | null, defs: Map<string, CharacterStyleDef>): boolean | undefined {
  let current = styleId
  const seen = new Set<string>()
  for (let depth = 0; current && depth < MAX_STYLE_CHAIN_DEPTH && !seen.has(current); depth++) {
    seen.add(current)
    const def = defs.get(current)
    if (!def) return undefined
    if (def.italic !== undefined) return def.italic
    current = def.basedOn
  }
  return undefined
}
```

`marksFromRunProperties` (Zeile 99–114) — Signatur erweitert um `charStyles`,
direkte `<w:i>`-Eigenschaft gewinnt immer über eine `w:rStyle`-Referenz (OOXML-
Kaskadenregel: Lauf-Ebene schlägt Formatvorlage):

```ts
function marksFromRunProperties(
  rPr: Element | null,
  charStyles: Map<string, CharacterStyleDef>,
): Array<{ type: string; attrs?: Record<string, unknown> }> {
  if (!rPr) return []
  const marks: Array<{ type: string; attrs?: Record<string, unknown> }> = []
  if (firstChildNS(rPr, OOXML_NAMESPACES.w, 'b')) marks.push({ type: 'strong' })

  const rStyleEl = firstChildNS(rPr, OOXML_NAMESPACES.w, 'rStyle')
  const rStyleId = rStyleEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? null
  const directItalic = onOffVal(firstChildNS(rPr, OOXML_NAMESPACES.w, 'i'))
  const italic = directItalic !== undefined ? directItalic : resolveCharacterStyleItalic(rStyleId, charStyles)
  if (italic) marks.push({ type: 'em' })

  // … underline/strike/color/highlight unverändert …
  return marks
}
```

Alle Aufrufer müssen `charStyles` durchreichen: `decodeParagraphRuns`,
`paragraphToBlocks`, `parseTable`, `readBodyChildren`. `readDocx` (Zeile
330–390) baut `charStyles = parseCharacterStyles(stylesDoc)` einmal auf
(gleiche `stylesDoc`, die bereits für `parseStylesXml` geparst wird — kein
zusätzliches `zip.file(...)`-Lesen nötig) und reicht sie neben `headingInfo`
durch.

**Bewusst nicht in diesem Plan enthalten, aber im selben Funktionskörper naheliegend:**
`onOffVal` ließe sich identisch auch für `<w:b>` und `<w:strike>` statt der
reinen Existenzprüfung einsetzen (dieselbe Fehlerklasse — real im Korpus z. B.
in `form_footnotes.docx`/`bug65649.docx` denkbar, nicht einzeln verifiziert, da
außerhalb des Geltungsbereichs „Kursiv"). Da `onOffVal` durch diesen Plan
ohnehin neu entsteht, wird empfohlen, es im selben Commit konsistent auch dort
einzusetzen, um nicht zwei Fehlerklassen (behoben für `i`, unbehoben für
`b`/`strike`) im selben Funktionskörper zu hinterlassen — keine gesonderte
Ticketpflicht, siehe Abschnitt 9.

### 4.3 `odt/reader.ts`

Umbau von `parseAutomaticStyles` (Zeile 36–77): Der `family === 'text'`-Zweig
wird durch eine wiederverwendbare, containerunabhängige Funktion ersetzt (sie
funktioniert identisch für ein `office:automatic-styles`- **und** ein
`office:styles`-Element):

```ts
interface RawTextStyleDef {
  parent: string | null
  own: RunStyle
}

function parseTextStyleDefs(container: Element | null): Map<string, RawTextStyleDef> {
  const defs = new Map<string, RawTextStyleDef>()
  if (!container) return defs
  for (const styleEl of childElements(container, ODF_NAMESPACES.style, 'style')) {
    if (styleEl.getAttributeNS(ODF_NAMESPACES.style, 'family') !== 'text') continue
    const name = styleEl.getAttributeNS(ODF_NAMESPACES.style, 'name')
    if (!name) continue
    const parent = styleEl.getAttributeNS(ODF_NAMESPACES.style, 'parent-style-name')
    const props = firstChildNS(styleEl, ODF_NAMESPACES.style, 'text-properties')
    const own: RunStyle = {}
    if (props) {
      if (props.getAttributeNS(ODF_NAMESPACES.fo, 'font-weight') === 'bold') own.bold = true
      const fontStyle = props.getAttributeNS(ODF_NAMESPACES.fo, 'font-style')
      if (fontStyle === 'italic' || fontStyle === 'oblique') own.italic = true // Grenzfall 3.6
      const underline = props.getAttributeNS(ODF_NAMESPACES.style, 'text-underline-style')
      if (underline && underline !== 'none') own.underline = true
      const strike = props.getAttributeNS(ODF_NAMESPACES.style, 'text-line-through-style')
      if (strike && strike !== 'none') own.strike = true
      const color = props.getAttributeNS(ODF_NAMESPACES.fo, 'color')
      if (color) own.color = color
      const bg = props.getAttributeNS(ODF_NAMESPACES.fo, 'background-color')
      if (bg) own.highlight = bg
    }
    defs.set(name, { parent, own })
  }
  return defs
}

const MAX_STYLE_CHAIN_DEPTH = 25 // gleicher Schutz wie MAX_NESTING_DEPTH weiter unten in dieser Datei

/** Walks style:parent-style-name from `name` up to its root ancestor, then
 *  applies properties root-first so the most specific (leaf) style wins. */
function resolveTextStyle(name: string, defs: Map<string, RawTextStyleDef>): RunStyle {
  const chain: RunStyle[] = []
  let current: string | null = name
  const seen = new Set<string>()
  for (let depth = 0; current && depth < MAX_STYLE_CHAIN_DEPTH && !seen.has(current); depth++) {
    seen.add(current)
    const def = defs.get(current)
    if (!def) break
    chain.push(def.own)
    current = def.parent
  }
  const resolved: RunStyle = {}
  for (const props of chain.reverse()) Object.assign(resolved, props)
  return resolved
}
```

`readOdt` (Zeile 239–285) führt Definitionen aus **allen** relevanten
Containern zusammen, bevor die Vererbungskette aufgelöst wird (wichtig: eine
automatische Formatvorlage aus `content.xml` kann über
`style:parent-style-name` auf eine **benannte** Formatvorlage aus
`styles.xml` verweisen — das ist genau ODFs eigenes Vererbungsmodell und der
Grund, warum die Zusammenführung *vor* der Auflösung passieren muss):

```ts
const contentAutomaticStyles = contentDoc.getElementsByTagNameNS(ODF_NAMESPACES.office, 'automatic-styles')[0] ?? null
const contentOfficeStyles = contentDoc.getElementsByTagNameNS(ODF_NAMESPACES.office, 'styles')[0] ?? null // selten, aber spec-legal

const stylesXmlText = await zip.file('styles.xml')?.async('text')
const stylesDoc = stylesXmlText ? parseXmlDocument(stylesXmlText) : null
const namedOfficeStyles = stylesDoc?.getElementsByTagNameNS(ODF_NAMESPACES.office, 'styles')[0] ?? null

// Reihenfolge = Präzedenz beim Zusammenführen: automatische (dokument-lokale)
// Stile überschreiben gleichnamige benannte Stile — in der Praxis kollidieren
// die Namensräume nicht (automatische Namen sind generatorvergeben wie "T1",
// benannte Namen menschenlesbar wie "Emphasis"), aber falls doch, gewinnt die
// automatische (spezifischere) Definition.
const textStyleDefs = new Map<string, RawTextStyleDef>()
for (const container of [namedOfficeStyles, contentOfficeStyles, contentAutomaticStyles]) {
  for (const [name, def] of parseTextStyleDefs(container)) textStyleDefs.set(name, def)
}
const resolvedTextStyles = new Map<string, RunStyle>()
for (const name of textStyleDefs.keys()) resolvedTextStyles.set(name, resolveTextStyle(name, textStyleDefs))

const contentStyles: ParsedStyles = { textStyles: resolvedTextStyles, paragraphAligns, listKinds }
```

`paragraphAligns`/`listKinds` bleiben unverändert aus
`contentAutomaticStyles` abgeleitet (außerhalb des Geltungsbereichs dieser
Anforderung). Für Kopf-/Fußzeile (`stylesForChrome`, aktuell nur
`parseAutomaticStyles(stylesAutomaticStyles)`) gilt dieselbe Zusammenführung
symmetrisch — auch Kopf-/Fußzeilentext kann über `style:parent-style-name`
oder eine benannte Formatvorlage kursiv sein, sobald Kopf-/Fußzeilen laut
Anforderung 2.4 UI-bedienbar werden.

`decodeInline`s `marksFor` (Zeile 82–94) bleibt unverändert — es erhält
weiterhin ein bereits vollständig aufgelöstes `RunStyle` je Name über
`styles.textStyles.get(styleName)`, jetzt eben aus dem zusammengeführten,
vererbungsaufgelösten `resolvedTextStyles` statt nur aus dem alten
`automatic-styles`-only-Ergebnis.

---

## 5. Neue Dateien — Tests

### 5.1 Unit-Tests (Vitest, `jsdom`)

**Neu: `src/formats/docx/__tests__/em.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'
import { readDocx } from '../reader'

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/docx')

async function buildDocxWithRunAndStyles(runXml: string, stylesXml: string | null): Promise<Blob> {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', /* wie in tests/e2e/docx.spec.ts::buildSampleDocx, ggf. + styles.xml Override */ '…')
  zip.folder('_rels')!.file('.rels', /* … */ '…')
  zip.folder('docProps')!.file('core.xml', /* … */ '…')
  const word = zip.folder('word')!
  word.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NS}><w:body>` +
      `<w:p><w:r>${runXml}<w:t>Text</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
  )
  if (stylesXml) word.file('styles.xml', stylesXml)
  return new Blob([await zip.generateAsync({ type: 'nodebuffer' })])
}

function firstRun(result: Awaited<ReturnType<typeof readDocx>>) {
  return (result.body as any).content[0].content[0]
}

describe('DOCX reader: w:val on <w:i> (Grenzfall 3.3)', () => {
  it.each([
    ['<w:rPr><w:i/></w:rPr>', true],
    ['<w:rPr><w:i w:val="true"/></w:rPr>', true],
    ['<w:rPr><w:i w:val="1"/></w:rPr>', true],
    ['<w:rPr><w:i w:val="false"/></w:rPr>', false],
    ['<w:rPr><w:i w:val="0"/></w:rPr>', false],
    ['<w:rPr><w:i w:val="FALSE"/></w:rPr>', false], // Groß-/Kleinschreibung, analog Grenzfall 14 in unterstrichen-einfach-code.md
  ])('%s → em mark present: %s', async (runXml, expectEm) => {
    const blob = await buildDocxWithRunAndStyles(runXml, null)
    const result = await readDocx(blob)
    const hasEm = (firstRun(result).marks ?? []).some((m: any) => m.type === 'em')
    expect(hasEm).toBe(expectEm)
  })

  it('reproduces the real-world case in the existing fixture form_footnotes.docx: w:val="0" is not italic', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'form_footnotes.docx'))
    const result = await readDocx(new Blob([buffer]))
    const flatten = (node: any): any[] => [node, ...(node.content ?? []).flatMap(flatten)]
    const run = flatten(result.body).find((n) => n.type === 'text' && n.text?.startsWith('Provide services in Brazil'))
    expect(run).toBeTruthy()
    expect((run.marks ?? []).some((m: any) => m.type === 'em')).toBe(false)
  })
})

describe('DOCX reader: w:rStyle resolution (Grenzfall 3.4)', () => {
  const STYLES_WITH_EMPHASIS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W_NS}>` +
    `<w:style w:type="character" w:styleId="Betont"><w:name w:val="Emphasis"/><w:rPr><w:i/></w:rPr></w:style>` +
    `</w:styles>`

  it('resolves italic via w:rStyle pointing at a character style with <w:i/>', async () => {
    const blob = await buildDocxWithRunAndStyles(
      '<w:rPr><w:rStyle w:val="Betont"/></w:rPr>',
      STYLES_WITH_EMPHASIS,
    )
    const result = await readDocx(blob)
    expect((firstRun(result).marks ?? []).some((m: any) => m.type === 'em')).toBe(true)
  })

  it('direct <w:i w:val="false"/> overrides an inherited-italic rStyle (OOXML cascade: run beats style)', async () => {
    const blob = await buildDocxWithRunAndStyles(
      '<w:rPr><w:rStyle w:val="Betont"/><w:i w:val="false"/></w:rPr>',
      STYLES_WITH_EMPHASIS,
    )
    const result = await readDocx(blob)
    expect((firstRun(result).marks ?? []).some((m: any) => m.type === 'em')).toBe(false)
  })

  it('resolves italic through a w:basedOn chain when the referenced style itself has no direct <w:i/>', async () => {
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W_NS}>` +
      `<w:style w:type="character" w:styleId="Base"><w:rPr><w:i/></w:rPr></w:style>` +
      `<w:style w:type="character" w:styleId="Betont"><w:basedOn w:val="Base"/></w:style>` +
      `</w:styles>`
    const blob = await buildDocxWithRunAndStyles('<w:rPr><w:rStyle w:val="Betont"/></w:rPr>', stylesXml)
    const result = await readDocx(blob)
    expect((firstRun(result).marks ?? []).some((m: any) => m.type === 'em')).toBe(true)
  })
})
```

**Neu: `src/formats/odt/__tests__/em.test.ts`**

```ts
import JSZip from 'jszip'
import { readOdt } from '../reader'

const NS = `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"`

async function buildOdt(contentAutomaticStyles: string, spanMarkup: string, namedStylesInStylesXml = ''): Promise<Blob> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' })
  zip.file(
    'content.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS} office:version="1.3">` +
      `<office:automatic-styles>${contentAutomaticStyles}</office:automatic-styles>` +
      `<office:body><office:text><text:p>${spanMarkup}</text:p></office:text></office:body></office:document-content>`,
  )
  zip.file(
    'styles.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NS} office:version="1.3">` +
      `<office:styles>${namedStylesInStylesXml}</office:styles></office:document-styles>`,
  )
  zip.file(
    'meta.xml',
    `<?xml version="1.0" encoding="UTF-8"?><office:document-meta ${NS} xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.3"><office:meta/></office:document-meta>`,
  )
  zip.folder('META-INF')!.file(
    'manifest.xml',
    `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/></manifest:manifest>`,
  )
  return new Blob([await zip.generateAsync({ type: 'nodebuffer' })])
}

function firstRun(result: Awaited<ReturnType<typeof readOdt>>) {
  return (result.body as any).content[0].content[0]
}

describe('ODT reader: named style / inheritance for italic (Grenzfall 3.5)', () => {
  it('resolves italic from a named style defined only in styles.xml office:styles (not automatic-styles)', async () => {
    const blob = await buildOdt(
      '',
      '<text:span text:style-name="Emphasis">Text</text:span>',
      '<style:style style:name="Emphasis" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>',
    )
    const result = await readOdt(blob)
    expect((firstRun(result).marks ?? []).some((m: any) => m.type === 'em')).toBe(true)
  })

  it('resolves italic inherited purely via style:parent-style-name (automatic style has no own font-style)', async () => {
    const blob = await buildOdt(
      '<style:style style:name="T1" style:family="text" style:parent-style-name="Emphasis"/>',
      '<text:span text:style-name="T1">Text</text:span>',
      '<style:style style:name="Emphasis" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>',
    )
    const result = await readOdt(blob)
    expect((firstRun(result).marks ?? []).some((m: any) => m.type === 'em')).toBe(true)
  })
})

describe('ODT reader: fo:font-style="oblique" (Grenzfall 3.6)', () => {
  it('treats oblique the same as italic (documented simplification)', async () => {
    const blob = await buildOdt(
      '<style:style style:name="T1" style:family="text"><style:text-properties fo:font-style="oblique"/></style:style>',
      '<text:span text:style-name="T1">Text</text:span>',
    )
    const result = await readOdt(blob)
    expect((firstRun(result).marks ?? []).some((m: any) => m.type === 'em')).toBe(true)
  })
})
```

**Neu: `src/formats/shared/editor/__tests__/commands.test.ts`**

Reiner Unit-Test für `isMarkActive`/`toggleInlineMark` ohne Browser — deckt
Grenzfälle 3.1/3.2 auf der kleinstmöglichen Ebene ab (schließt exakt die von
der Anforderung, Zeile 27, kritisierte Lücke „kein testbarer Befehl"):

```ts
import { EditorState } from 'prosemirror-state'
import { wordSchema } from '../../schema'
import { isMarkActive, toggleInlineMark } from '../commands'

function stateWithDoc(content: unknown[]) {
  const doc = wordSchema.nodeFromJSON({ type: 'doc', content })
  return EditorState.create({ doc, schema: wordSchema })
}

describe('isMarkActive', () => {
  it('is true after toggling em at an empty cursor, before anything is typed (Grenzfall 3.1)', () => {
    let state = stateWithDoc([{ type: 'paragraph', content: [{ type: 'text', text: 'Text' }] }])
    const tr = state.tr.setSelection(state.tr.selection.constructor.near(state.doc.resolve(1)))
    state = state.apply(tr)
    toggleInlineMark(wordSchema.marks.em)(state, (t) => (state = state.apply(t)))
    expect(isMarkActive(state, wordSchema.marks.em)).toBe(true)
  })

  it('is false for a selection that is only partially italic (Grenzfall 3.2)', () => {
    const state = stateWithDoc([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'A', marks: [{ type: 'em' }] },
          { type: 'text', text: 'B' },
        ],
      },
    ])
    const sel = { from: 1, to: 3 } // spans both "A" and "B"
    const selected = state.apply(state.tr.setSelection(require('prosemirror-state').TextSelection.create(state.doc, sel.from, sel.to)))
    expect(isMarkActive(selected, wordSchema.marks.em)).toBe(false)
  })

  it('toggling a mixed selection makes it uniformly italic, not uniformly plain (Grenzfall 2.1.1 / 3.2)', () => {
    let state = stateWithDoc([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'A', marks: [{ type: 'em' }] },
          { type: 'text', text: 'B' },
        ],
      },
    ])
    const { TextSelection } = require('prosemirror-state')
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, 3)))
    toggleInlineMark(wordSchema.marks.em)(state, (t) => (state = state.apply(t)))
    expect(state.doc.rangeHasMark(1, 2, wordSchema.marks.em)).toBe(true) // "A" still italic
    expect(state.doc.rangeHasMark(2, 3, wordSchema.marks.em)).toBe(true) // "B" now italic too
  })
})
```

(Im tatsächlichen Implementierungsschritt `require(...)` durch reguläre
`import`-Statements ersetzen — hier inline gehalten, um den Snippet knapp zu
halten.)

### 5.2 E2E-Tests (Playwright)

**Neu: `tests/e2e/kursiv.spec.ts`**

Struktur/Stil analog zu `tests/e2e/docx.spec.ts`/`odt.spec.ts`/
`selection-regression.spec.ts` (gleiche `odtCard`/`docxCard`-Locator-Helfer).
Deckt Abschnitt 2 („Verhalten"), Abschnitt 3 („Grenzfälle") und Abschnitt 5
(„Rundreise") der Anforderung ab:

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

function odtCard(page) { /* wie in selection-regression.spec.ts */ }
function docxCard(page) { /* wie in docx.spec.ts */ }

test.describe('Kursiv — Toolbar & Tastatur', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Toolbar-Klick togglet Kursiv an und aus (Abschnitt 2.1)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Testtext')
    await page.keyboard.press('ControlOrMeta+a')
    const button = page.getByTitle('Kursiv')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(editor.locator('em')).toContainText('Testtext')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await expect(editor.locator('em')).toHaveCount(0)
  })

  test('Strg+I liefert identisches Ergebnis wie Toolbar-Klick (Abschnitt 1, #2)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Testtext')
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('ControlOrMeta+i')
    await expect(editor.locator('em')).toContainText('Testtext')
    await expect(page.getByTitle('Kursiv')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Grenzfall 3.1: Aktiv-Anzeige nach Toggle an leerer Schreibmarke, vor jeder Eingabe', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('abc')
    await page.keyboard.press('Home')
    const button = page.getByTitle('Kursiv')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true') // vor jedem weiteren Tastendruck
    await page.keyboard.type('X')
    await expect(editor.locator('em')).toContainText('X')
  })

  test('Grenzfall 3.2: gemischte Selektion zeigt Button nicht fälschlich aktiv, Klick vereinheitlicht auf kursiv', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('AB')
    // "A" kursiv machen
    await page.keyboard.press('Home')
    await page.keyboard.press('Shift+ArrowRight')
    await page.getByTitle('Kursiv').click()
    // Beide Zeichen selektieren (gemischt: A kursiv, B nicht)
    await page.keyboard.press('Home')
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Shift+ArrowRight')
    const button = page.getByTitle('Kursiv')
    await expect(button).toHaveAttribute('aria-pressed', 'false') // nicht fälschlich "aktiv"
    await button.click()
    await expect(editor.locator('em')).toContainText('AB') // jetzt einheitlich kursiv, nicht entfernt
  })

  test('Kombination mit Fett, Unterstrichen, Farbe gleichzeitig (Abschnitt 2.3)', async ({ page }) => { /* … */ })

  test('Undo/Redo: ein Strg+Z macht genau den Kursiv-Toggle rückgängig (Abschnitt 2.5)', async ({ page }) => { /* … */ })

  test('Copy/Paste innerhalb des Editors erhält Kursiv (Abschnitt 2.6)', async ({ page }) => { /* internes PM-Clipboard, Ctrl+C/Ctrl+V */ })

  test('Paste von außen mit <em>/<i>/style="font-style:italic" wird als Kursiv erkannt (Abschnitt 2.6)', async ({ page }) => {
    // Synthetisches ClipboardEvent per page.evaluate dispatchen (kein echter
    // OS-Clipboard-Zugriff nötig, robuster in CI):
    // const editor = page.locator('.ProseMirror'); await editor.click()
    // await page.evaluate(() => {
    //   const dt = new DataTransfer()
    //   dt.setData('text/html', '<p>Vor <em>Mitte</em> nach</p>')
    //   document.querySelector('.ProseMirror')!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
    // })
    // await expect(editor.locator('em')).toContainText('Mitte')
  })

  test('Geltungsbereich: Überschrift, Liste, Tabellenzelle, hard_break (Abschnitt 2.4)', async ({ page }) => { /* je ein Sub-Assert */ })

  test('Grenzfall 3.8 #2/#3: Kursiv in leerem Absatz bzw. leerer Tabellenzelle, danach tippen', async ({ page }) => { /* … */ })

  test('Grenzfall 3.8 #6: Strg+I bei Fokus außerhalb des Editors wirkt nicht auf den Editor', async ({ page }) => { /* Fokus auf Farbwähler-Input legen, Strg+I, Editor unverändert */ })

  test('visuelle Darstellung: kursiver Text ist tatsächlich schräggestellt (Abschnitt 4)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Schräg')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Kursiv').click()
    const fontStyle = await editor.locator('em').evaluate((el) => getComputedStyle(el).fontStyle)
    expect(fontStyle).toBe('italic')
  })
})

test.describe('Kursiv — Rundreisen (Abschnitt 5.1)', () => {
  test('Szenario 1: DOCX-Eigenrundreise über echte Bedienung', async ({ page }) => { /* … */ })
  test('Szenario 2: ODT-Eigenrundreise über echte Bedienung', async ({ page }) => { /* … */ })
  test('Szenario 3: DOCX-Fremddatei mit <w:i/> unverändert exportiert behält Kursiv exakt an dieser Stelle', async ({ page }) => { /* handgebaute DOCX wie buildSampleDocx, mit <w:i/> in einem Lauf */ })
  test('Szenario 4: ODT-Fremddatei mit fo:font-style="italic" (automatische Formatvorlage) unverändert exportiert behält Kursiv', async ({ page }) => { /* handgebaute ODT wie buildSampleOdt, mit Kursiv-Stil */ })
  test('Szenario 5: DOCX → ODT Cross-Format behält Kursiv (fo:font-style="italic" im Export)', async ({ page }) => { /* … */ })
  test('Szenario 6: ODT → DOCX Cross-Format behält Kursiv (<w:i/> im Export)', async ({ page }) => { /* … */ })
  test('Szenario 7: doppelte Rundreise DOCX → Editor → ODT → Editor → DOCX', async ({ page }) => { /* … */ })
  test('Szenario 8: Fett + Kursiv + Farbe gleichzeitig bleibt über Rundreise erhalten', async ({ page }) => { /* … */ })
  test('Szenario 9: Kursiv in Überschrift/Liste/Tabellenzelle bei Rundreise', async ({ page }) => { /* je einzeln */ })

  test('Szenario 10: unabhängige Prüfung des exportierten DOCX-Kursiv-Laufs gegen Regex/DOMParser ohne readDocx()', async ({ page }) => {
    // wie in tests/e2e/docx.spec.ts bereits für <w:b/> gemacht:
    // expect(documentXml).toMatch(/<w:i\s*\/>/) bzw. kein w:val="false" am selben Lauf
  })
  test('Szenario 11: unabhängige Prüfung des exportierten ODT-Kursiv-Laufs gegen Regex/DOMParser ohne readOdt()', async ({ page }) => {
    // expect(contentXml).toContain('fo:font-style="italic"')
  })
})
```

**Erweiterung: `tests/e2e/selection-regression.spec.ts`** (Grenzfall 3.7, DoD
Punkt 4 — „dauerhaft in der Suite verankert", daher **in derselben Datei**,
nicht in einer separaten, leicht vergessbaren):

```ts
test('same regression with "Kursiv" instead of "Fett" (Grenzfall 3.7)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Kursiv').click()
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
})

test('same regression with "Kursiv" inside a table cell', async ({ page }) => {
  /* Tabellenzellen-Variante, Struktur wie der bestehende Fett-Test */
})

test('same regression with "Kursiv" — repeated cycles stay stable (stress check)', async ({ page }) => {
  /* Stress-Test-Variante, Struktur wie der bestehende Fett-Test */
})
```

---

## 6. Fixture-Inventar (per Skript gegen den vorhandenen Korpus ermittelt)

| Grenzfall | Reales Fixture vorhanden? | Verwendung |
|---|---|---|
| 3.3 (`w:val="false"`/`"0"`) | **Ja** — `tests/fixtures/external/docx/form_footnotes.docx` (Lauf „Provide services in Brazil…"), auch `bug65649.docx` | Direkter Regressionstest gegen die reale Datei (Abschnitt 5.1), zusätzlich synthetische `it.each`-Matrix für alle `ST_OnOff`-Werte |
| 3.4 (`w:rStyle`) | Nein (19 Dateien nutzen `w:rStyle` produktiv, keine davon für Kursiv) | Synthetische DOCX-Datei nötig (Abschnitt 5.1) |
| 3.5 (`style:parent-style-name` / `office:styles`) | Nein (25 Dateien nutzen `style:parent-style-name` auf `family="text"`, keine davon zeigt aktuell verlorenes Kursiv) | Synthetische ODT-Datei nötig (Abschnitt 5.1) |
| 3.6 (`oblique`) | Nein (0 Treffer im Korpus) | Synthetische ODT-Datei (Abschnitt 5.1) |

Empfehlung: Sobald die Reader-Fixes aus Abschnitt 4.2/4.3 umgesetzt sind, lohnt
sich ein erneuter Lauf von `external-fixtures.test.ts` gegen den vollständigen
Korpus (bereits vorhanden, prüft nur „stürzt nicht ab") **plus** eine gezielte
Stichprobenauswertung analog zum hier verwendeten Node-Skript, um zu
bestätigen, dass keine der 19 (`w:rStyle`) bzw. 25 (`parent-style-name`)
Dateien durch den neuen Auflösungscode neue, unerwartete Kursiv-Marks an
Stellen erzeugt, die vorher keine hatten (Regressions-Netz, kein
Pflichtbestandteil dieses Plans, aber empfehlenswerte Zusatzprüfung vor
Statuswechsel auf „verifiziert").

---

## 7. Details zum Fixture-Fund `form_footnotes.docx` (Beleg für Abschnitt 3.4)

Per Node-Skript ermittelt (JSZip, `word/document.xml` entpackt und mit Regex
durchsucht):

```
<w:p><w:pPr><w:pStyle w:val="BodyText"/></w:pPr>
<w:r><w:rPr><w:i w:val="0"/></w:rPr>
<w:t>Provide services in Brazil of a temporary nature, …</w:t></w:r>
```

Mit dem **aktuellen** Reader-Code liest `firstChildNS(rPr, …, 'i')` das
`<w:i>`-Element als vorhanden und pusht bedingungslos `{ type: 'em' }` — der
`w:val="0"`-Wert wird nie gelesen. Der Text erscheint aktuell fälschlich
kursiv im Editor, sobald diese (reale, unveränderte) Datei importiert wird.
Dies ist der stärkste verfügbare Beleg dafür, dass Grenzfall 3.3 der
Anforderung kein theoretisches Risiko, sondern ein **aktiv auslösbarer
Fehler mit einer bereits im Repository vorhandenen Datei** ist.

---

## 8. Bewusst nicht geänderter Code (und warum)

- **`schema.ts` Mark `em`** — `parseDOM` deckt bereits `<em>`, `<i>` und
  `style="font-style: italic"` ab (Anforderung 2.6); `toDOM` erzeugt `<em>`,
  wodurch der Browser-Standardstil (`font-style: italic`) ohne zusätzliches
  CSS greift (Abschnitt 4 der Anforderung, siehe Abschnitt 2 dieses Plans).
  Keine Attribute nötig, keine Verwechslungsgefahr mit anderen Marks.
- **`docx/writer.ts`** — schreibt bereits unbedingt `<w:i/>` bei `em`-Mark,
  unabhängig davon, ob der importierte Text ursprünglich über direkte
  Eigenschaft oder `w:rStyle` kursiv war. Das ist eine bewusste
  Vereinfachung: das PM-Dokumentmodell kennt nur die boolesche `em`-Mark, kein
  „war ursprünglich Formatvorlage"-Bit — der Export ist dadurch immer eine
  direkte Lauf-Eigenschaft, nie eine Formatvorlagen-Referenz. Das erfüllt die
  in Abschnitt 5.1 der Anforderung verlangte **inhaltliche** (nicht
  bytegenaue) Rundreise und ist konsistent mit dem bereits etablierten
  Verhalten für alle anderen Marks in diesem Writer.
- **`odt/writer.ts` / `odt/styleRegistry.ts`** — erzeugt bereits korrekt
  `fo:font-style="italic"` (nie `"oblique"` — das PM-Modell kann diese
  Unterscheidung nicht transportieren, ein importiertes `oblique` wird beim
  Export immer zu `italic`; bewusste, hier dokumentierte Vereinfachung gemäß
  Anforderung 3.6/DoD Punkt 5).
- **`prosemirror-commands`s `toggleMark`/`markApplies`** — Verhalten bei
  `hard_break`-Nachbarschaft (Grenzfall 3.8 #4), Tabellenzellgrenzen
  (`CellSelection.ranges`, Grenzfall 3.8 #3) und Dokumentanfang/-ende
  (Grenzfall 3.8 #1) ist Fremdbibliotheks-Standardverhalten, arbeitet
  generisch über `nodesBetween`/`ranges` und muss nur verifiziert, nicht
  implementiert werden.
- **Geltungsbereich (Anforderung 2.4)** — `em` ist eine gewöhnliche Inline-
  Mark ohne Sonderbehandlung in `paragraph`/`heading`/`list_item`/
  `table_cell`; funktioniert dort bereits identisch, da das Schema keine
  Kontext-Einschränkung für diese Mark definiert. Nur Testabdeckung fehlt.

---

## 9. Offene Abhängigkeiten (nur dokumentieren, kein Code jetzt)

- **`formatierung-loeschen`** (Backlog-Status „fehlt"): muss bei Umsetzung
  `wordSchema.marks.em` mit in ihre Clear-Logik aufnehmen (siehe Anforderung
  Abschnitt 1, „Explizit nicht vorhanden").
- **`einfuegen` (Copy/Paste-Sanitizing, `specs/einfuegen-code.md`):** Diese
  Funktion ist laut dortigem Plan **noch nicht implementiert** — aktuell
  existiert weder `handlePaste` noch `transformPastedHTML`/`clipboardTextParser`
  in `WordEditor.tsx`. Das in Anforderung 2.6 geforderte Verhalten
  („von extern kopierter Text mit `<em>`/`<i>`/`font-style:italic` wird
  erkannt") funktioniert heute ausschließlich über ProseMirrors *eigenes*
  Default-Clipboard-Handling und die bereits vorhandene `parseDOM`-Definition
  in `schema.ts` — nicht über eigenen Code. **Wichtig für die Zukunft:**
  Sobald `einfuegen`s `sanitizePastedHtml`/`sanitizePastedSlice` (siehe
  `einfuegen-code.md` Abschnitt 3.1) gebaut werden, muss sichergestellt sein,
  dass diese Sanitizer-Pipeline `<em>`/`<i>`/`style="font-style: italic"`
  **nicht** herausfiltert — sonst regressiert der in Abschnitt 5.2 dieses
  Plans neu eingeführte Paste-Test stillschweigend. Kein Code jetzt, nur
  Vermerk zur Beachtung bei Umsetzung von `einfuegen`.
- **`fett-req.md` Grenzfall 3.3 / `durchgestrichen-req.md`:** Der in Abschnitt
  4.1 dieses Plans eingeführte Fix (`isMarkActive`/`toggleInlineMark`) behebt
  strukturell dieselbe, dort ebenfalls offene Frage für „Fett"/
  „Durchgestrichen" mit — sobald `fett-code.md`/`durchgestrichen-code.md`
  geschrieben werden, sollten sie auf diesen Plan (Abschnitt 4.1) verweisen,
  statt die Lösung ein zweites Mal zu entwerfen.
- **`w:b`/`w:strike` mit `w:val="false"`:** `onOffVal` (Abschnitt 4.2) wird
  hier nur für `<w:i>` verdrahtet; dieselbe Fehlerklasse besteht strukturell
  auch für `<w:b>`/`<w:strike>`. Kein Code jetzt (außerhalb des
  Geltungsbereichs „Kursiv"), aber beim nächsten Antasten dieser Funktion
  sollte es im selben Zug mit erledigt werden (siehe Abschnitt 4.2, Ende).
- **Track Changes (Phase 3, Anforderung Grenzfall 3.8 #9):** kein Verhalten
  definiert, keine Testpflicht vor Umsetzung.

---

## 10. Unabhängige Parser-Validierung (Rundreise-Szenario 5.1.10/5.1.11 / DoD Punkt 3)

Gleicher zweistufiger Ansatz wie in `unterstrichen-einfach-code.md` Abschnitt 7
begründet (dieses Repo hat keine Python-Toolchain):

1. **Automatisiert:** Playwright-Tests (Abschnitt 5.2, Szenario 10/11) prüfen
   den exportierten XML-String direkt per Regex/`DOMParser`, **ohne**
   `readDocx`/`readOdt` zu verwenden — identisches Muster wie
   `docx.spec.ts`/`odt.spec.ts` bereits für `<w:b/>`/`font-weight="bold"`
   einsetzen.
2. **Manuell, einmalig vor Statuswechsel auf „verifiziert":** eine exportierte
   Test-DOCX/-ODT mit Kursiv-Text einmalig außerhalb dieses Repos mit
   `python-docx` bzw. einem ODF-Validator/LibreOffice öffnen und das Ergebnis
   in `kursiv-req.md` oder einer Folgedatei vermerken. Nicht Teil der
   automatisierten CI-Suite (siehe Begründung in
   `unterstrichen-einfach-code.md` Abschnitt 7).

---

## 11. Abnahme-Mapping (Anforderung Abschnitt 6/7 → Testdatei)

| Anforderung | Abgedeckt durch |
|---|---|
| Grundverhalten, Aktiv-Anzeige, Kombination, Geltungsbereich, Undo/Redo, Copy/Paste (Abschnitt 2) | `tests/e2e/kursiv.spec.ts`, describe „Toolbar & Tastatur" |
| Grenzfall 3.1 (Aktiv-Anzeige nach Toggle ohne Selektion) | `src/formats/shared/editor/__tests__/commands.test.ts` (Unit) + `tests/e2e/kursiv.spec.ts` (E2E) + Fix in Abschnitt 4.1 |
| Grenzfall 3.2 (gemischte Selektion) | dieselben zwei Dateien + Fix in Abschnitt 4.1 |
| Grenzfall 3.3 (`w:val="false"`) | `src/formats/docx/__tests__/em.test.ts`, inkl. Test gegen die reale Fixture `form_footnotes.docx` + Fix in Abschnitt 4.2 |
| Grenzfall 3.4 (`w:rStyle`) | `src/formats/docx/__tests__/em.test.ts` + Fix in Abschnitt 4.2 |
| Grenzfall 3.5 (ODT Formatvorlagen-Vererbung) | `src/formats/odt/__tests__/em.test.ts` + Fix in Abschnitt 4.3 |
| Grenzfall 3.6 (`oblique`) | `src/formats/odt/__tests__/em.test.ts` + Fix in Abschnitt 4.3 |
| Grenzfall 3.7 (Selektions-Sync-Regression) | `tests/e2e/selection-regression.spec.ts`, drei neue Tests |
| Grenzfall 3.8 (#1–#8) | je ein dedizierter Test in `tests/e2e/kursiv.spec.ts` |
| Rundreise-Szenarien 1–9 (Abschnitt 5.1) | `tests/e2e/kursiv.spec.ts`, describe „Rundreisen" |
| Rundreise-Szenarien 10/11 (unabhängige Validierung) | Abschnitt 10 dieses Plans |
| DoD Punkt 1 (Grundverhalten etc. automatisiert grün) | Abschnitt 5.2 |
| DoD Punkt 2 (jeder Grenzfall einzeln beantwortet) | Abschnitt 3 (Bestätigung/Fix) + Abschnitt 5 (Test) je Grenzfall |
| DoD Punkt 3 (alle 11 Rundreise-Szenarien grün) | Abschnitt 5.2 + Abschnitt 10 |
| DoD Punkt 4 (Regressionstest 3.7 dauerhaft verankert) | in `selection-regression.spec.ts`, nicht in separater Datei |
| DoD Punkt 5 (jeder bestätigte Fehler behoben oder dokumentiert) | Abschnitt 3 (Befund) + Abschnitt 4 (Fix) + Abschnitt 8 (bewusste Vereinfachungen, dokumentiert) |
