# Kursiv — dateigenauer Umsetzungsplan

Gegenstück zu `specs/kursiv-req.md`. Dieses Dokument beschreibt, nach tatsächlicher
Codelektüre (inkl. Lektüre der installierten `prosemirror-commands`/`prosemirror-model`-
Pakete in `node_modules` und Stichproben gegen die real vorhandenen Fixture-Korpora unter
`tests/fixtures/external/{docx,odt}`), was am bestehenden Code zu ändern ist, welche
Dateien neu angelegt bzw. erweitert werden, und wie die in der Anforderung geforderte
Verifikation technisch umgesetzt wird.

**Stand aller Code-Referenzen: 2026-07-05, direkt gegen `E:\docs\src` verifiziert —
inklusive der durch das „Ausschneiden"-Feature (Commits `9f8fa03`/`db61c89`) erneut
verschobenen `WordEditor.tsx`-Keymap-Zeilen (siehe Abschnitt 0, Punkt 1).**

---

## 0. Korrekturvermerk gegenüber der Vorfassung

Diese Datei ist eine **kritisch überarbeitete Neufassung** einer früheren `kursiv-code.md`.
Die Vorfassung war in ihrer *technischen Analyse* überwiegend korrekt (die gefundenen
Defekte bestehen real, siehe Abschnitt 3), litt aber an denselben Schwächen, die
`kursiv-req.md` bereits für die alte Anforderungsfassung korrigiert hat, plus zwei
zusätzlichen. Alle vier wurden hier behoben:

1. **Sämtliche Zeilenangaben der Vorfassung waren veraltet — und die
   `WordEditor.tsx`-Keymap-Zeilen sind seither ein zweites Mal verschoben worden.** Die
   erste Korrektur (Ur-Vorfassung → vorherige Fassung) betraf: `em`-Mark „Zeile 116–121"
   → **164–169**; Toolbar-Button „Zeile 136" → **185**; Aktiv-Zustand „Zeile 42" → **69**;
   DOCX-Reader „Zeile 103" → **104**; ODT-Reader „Zeile 52" → **53**; ODT-Writer „Zeile 29"
   → **36**. Diese sechs sind am 2026-07-05 erneut gegengeprüft und **weiterhin gültig**.
   **Neu in dieser Fassung:** Das inzwischen eingezogene „Ausschneiden"-Feature (Commits
   `9f8fa03`/`db61c89`) hat den gesamten `keymap`-Block in `WordEditor.tsx` nach unten
   geschoben — die von der vorherigen Fassung dort noch getragenen Zeilen sind damit
   selbst veraltet. Real gilt jetzt: `Mod-b`/`Mod-i`/`Mod-u` **nicht** „90–92" (und schon
   gar nicht „77"), sondern **98/99/100**; `forceRender` **nicht** „123", sondern **131**;
   `dispatchTransaction` **125–132** (`tr.docChanged`→`onChange` **128–130**); der
   Copy/Paste-Kommentar **86–92**; `reconcileSelectionOnClick` **43–50**, die
   Mousedown-/Mouseup-Listener **143–155**. Alle Fundstellen unten sind auf diese
   verifizierten Ist-Zeilen korrigiert; das deckt sich exakt mit `kursiv-req.md` Abschnitt 0
   Punkt 1. (Die Reader-/Writer-/Schema-Zeilen liegen **vor** dem Keymap-Block und sind von
   der Verschiebung nicht betroffen.)
2. **Die zentrale Testbestandsaufnahme der Vorfassung war sachlich falsch.** Sie
   behauptete „E2E-Test für Kursiv: **Keine gefunden**". Tatsächlich existiert
   **substanzielle** Kursiv-E2E-Abdeckung (verifiziert: `clipboard-roundtrip.spec.ts:186/190`
   klickt real `getByTitle('Kursiv')` und prüft `<w:i/>`; `docx.spec.ts:300` /
   `odt.spec.ts:276` prüfen `.ProseMirror em` „Kursiv" aus Import;
   `roundtrip-fidelity.spec.ts:54/126/176` prüft `em` „kursiv-rot" über eine vollständige
   Rundreise). Der real vorhandene Bestand ist in Abschnitt 5.0 korrekt katalogisiert; die
   neuen Tests sind entsprechend **enger auf die real verbliebenen Lücken** gefasst, statt
   Abdeckung „von null" aufzubauen.
3. **Die Vorfassung wollte `src/formats/shared/editor/__tests__/commands.test.ts` neu
   anlegen** — diese Datei **existiert bereits** (deckt `canCut`/`cutSelection` ab). Sie
   wird **erweitert**, nicht überschrieben (Abschnitt 5.1).
4. **Die Vorfassung listete Cross-Format-Rundreisen (DOCX→ODT, ODT→DOCX) als reguläre,
   sofort lauffähige E2E-Tests** (Szenarien 5/6/7). Cross-Format-Export ist über die UI
   **derzeit nicht möglich** (`DocumentWorkspace.handleExport`, Zeile 68/81, ruft immer
   `module.exportFile` des Ursprungsformats; kein Formatwähler) und in
   `roundtrip-fidelity.spec.ts` bewusst `test.skip` („blocked on backlog slug
   `speichern-unter-format`"). Diese Szenarien sind hier als **blockiert** markiert; an
   ihre Stelle tritt eine schon jetzt mögliche **Writer-Ebene-Vorabsicherung** (Abschnitt
   5.3), exakt wie `kursiv-req.md` Abschnitt 5.3 es vorsieht.
5. **Diese Fassung behebt vier weitere, bei der erneuten Verifikation am 2026-07-05
   gefundene Mängel der Vorfassung, statt sie fortzuschreiben:**
   (a) Die Vorfassung **verschluckte Grenzfall 3.8 der Anforderung vollständig** — den
   Verdacht, dass der Kursiv-Button per Tastatur (Tab-Fokus + Enter/Leertaste) gar nicht
   bedienbar ist, weil `MarkButton` den Toggle ausschließlich über `onMouseDown`
   verdrahtet. Weder ein Fix noch ein Test noch eine bewusste Zurückstellung war
   enthalten, obwohl `kursiv-req.md` Abschnitt 7 (DoD Punkt 1 und 2) genau das verbindlich
   verlangt. Diese Fassung ergänzt Abschnitt 3.8 (Defekt), die Fix-Erweiterung in 4.1
   und einen E2E-Test in 5.2. (b) An drei Stellen (jetzige Abschnitte 5.2 und 8) verwies
   die Vorfassung fälschlich auf „Grenzfall 3.8 #1/#3/#4/#6/#10“ für Fälle wie
   Dokumentanfang, `hard_break`-Nachbarschaft oder Tabellenzellgrenzen — das sind
   tatsächlich nummerierte Zeilen der **Tabelle in Abschnitt 3.9** („Weitere Grenzfälle“),
   nicht Grenzfall 3.8 (der keine Unterpunkte hat). Exakt dieselbe Verwechslung, die
   `kursiv-req.md` Abschnitt 0 Punkt 2 bereits für die *vorletzte* Anforderungsfassung
   korrigiert hatte — hier trotzdem erneut unterlaufen und jetzt behoben (alle Referenzen
   auf „3.9 #n“ korrigiert). (c) Die Kollisionswarnung in Abschnitt 9 nannte nur die
   abweichende `isMarkActive`-Signatur gegenüber `specs/fett-code.md`, verschwieg aber
   zwei weitere, real vorhandene Kollisionen an denselben Dateien: dass `fett-code.md`
   (nach dessen eigenem „Defekt A"-Nachtrag) den Toggle ebenfalls von `onMouseDown` auf
   `onClick` verlagert (kompatibel mit dem hier in 4.1 ergänzten Fix, aber unbenannt), und
   — gewichtiger — dass `fett-code.md` (nach dessen „Defekt E"-Nachtrag) die
   `removeWhenPresent: false`-Korrektur **inline** an vier Aufrufstellen einfügt, statt wie
   dieser Plan einen gemeinsamen `toggleInlineMark`-Befehl anzulegen — ein echter
   Diff-Konflikt an `Toolbar.tsx` **und** `WordEditor.tsx`, der in der Vorfassung komplett
   fehlte. Abschnitt 9 benennt jetzt alle drei Kollisionsachsen. (d) Der Fixture-Beleg zu
   Grenzfall
   3.3 behauptete „3 Vorkommen von `<w:i w:val=\"0\"/>`“ in `form_footnotes.docx` — ein
   erneuter Zähllauf (JSZip + `@xmldom/xmldom`, `getElementsByTagNameNS`) ergibt **25**
   Vorkommen, nicht 3; die Zahl war schlicht falsch gezählt, der Befund selbst (Reader
   importiert diesen Lauf fälschlich als kursiv) bleibt unverändert korrekt.

---

## 1. TL;DR

Der Ist-Stand für „Kursiv" ist **nicht** nur lückenhaft getestet, sondern enthält
**mehrere echte, durch Quellcode- und Fixture-Lektüre bestätigte Funktionsfehler** — nicht
nur „Verdachtsfälle":

1. **Bestätigt (Anzeige):** Die Aktiv-Anzeige des Toolbar-Buttons (`Toolbar.tsx:69`)
   ignoriert `state.storedMarks` **und** prüft bei einer Selektion nur `$from` statt der
   gesamten Selektion — beides bestätigt durch Lektüre des installierten
   `prosemirror-commands@1.7.1`, dessen `toggleMark` selbst intern exakt das Muster
   (`state.storedMarks || $cursor.marks()` bzw. `rangeHasMark`) verwendet, das der
   Toolbar-Code nicht nachbildet.
2. **Bestätigt (echter Funktionsfehler, nicht nur Anzeige):** Alle Toggle-Aufrufe
   (`Toolbar.tsx:78`, `WordEditor.tsx:98-100`) verwenden `toggleMark(markType)` **ohne**
   Optionen, d. h. mit der Bibliotheks-Voreinstellung `removeWhenPresent: true`. Bei einer
   **gemischten** Selektion entfernt das die Formatierung, sobald sie irgendwo im Bereich
   vorkommt — das Gegenteil von Anforderung 2.1.1 („sofern nicht bereits **einheitlich**
   kursiv") und der Word/LibreOffice-Konvention. `removeWhenPresent` existiert in der
   installierten Version (verifiziert: 2 Treffer in
   `node_modules/prosemirror-commands/dist/index.js`), der Fix ist also anwendbar.
3. **Bestätigt an einer echten, unveränderten Datei aus dem Repo-Fixture-Korpus:**
   `tests/fixtures/external/docx/form_footnotes.docx` enthält real `<w:i w:val="0"/>`
   (verifiziert: **25** Vorkommen, u. a. der Lauf „Provide services in Brazil…") und wird
   vom aktuellen Reader (`docx/reader.ts:104`) fälschlich als kursiv importiert. Grenzfall
   3.3 der Anforderung ist damit reproduzierbar, nicht theoretisch. Zweite Datei mit
   demselben Muster: `bug65649.docx` (4 Vorkommen). (Korpus-Gesamtgröße: **127**
   DOCX-Fixtures; genau **2** davon enthalten `<w:i w:val="0|false"/>`.)
4. **Bestätigt (Code-Pfad fehlt):** `w:rStyle` (Zeichenformatvorlagen-Verweis) und ODT
   `office:styles`/`style:parent-style-name` (benannte Stile + Vererbung) werden vom
   jeweiligen Reader **nicht** ausgewertet — der Code-Pfad fehlt komplett. Häufigkeit im
   Korpus: **19 von 127** DOCX-Fixtures nutzen `w:rStyle` produktiv; **59 der 202**
   ODT-Fixtures nutzen `style:parent-style-name` auf `style:family="text"`.
5. **Bestätigt (einfacher Fix):** `oblique` wird ODT-seitig nicht als Kursiv erkannt
   (`odt/reader.ts:53`, exakter `=== 'italic'`-Vergleich). Im Korpus **0 Treffer** für
   `font-style="oblique"` — real selten, laut ODF aber gültig.
6. **Bestätigt (Bedien-/Barrierefreiheitsdefekt, generisches DOM-Verhalten):** Der
   Kursiv-Button verdrahtet den Toggle ausschließlich über `onMouseDown`
   (`Toolbar.tsx:76-79`). Ein natives `<button>` feuert bei Tastatur-Aktivierung
   (Tab-Fokus + Enter/Leertaste) laut HTML-Spezifikation ausschließlich ein `click`-,
   **kein** `mousedown`-Event — der Button ist also nachweislich nicht per Tastatur
   bedienbar (Abschnitt 3.8 unten). Identischer Defekt, identische Komponente wie
   „Defekt A" in `specs/fett-req.md`/`specs/fett-code.md`.

Der Umsetzungsaufwand gliedert sich in:

- **Ein gemeinsamer Fix in `commands.ts` + `Toolbar.tsx` + `WordEditor.tsx`** (neue,
  generische, isoliert testbare Funktionen `isMarkActive`/`toggleInlineMark`, plus
  Verlagerung des Toggle-Aufrufs von `onMouseDown` auf `onClick`), der die Punkte 1+2+6
  behebt (Abschnitt 4.1).
- **Ein Reader-Fix in `docx/reader.ts`** (`w:val`-Auswertung nach OOXML `ST_OnOff`-
  Konvention) plus **neue Auflösung von `w:rStyle`/`w:basedOn`** gegen `word/styles.xml`
  (Abschnitt 4.2).
- **Ein Reader-Umbau in `odt/reader.ts`** (Zusammenführen von `office:automatic-styles`
  **und** `office:styles` aus `content.xml` **und** `styles.xml`, plus Auflösung von
  `style:parent-style-name`), inklusive `oblique` (Abschnitt 4.3).
- **Keine Änderung** an `schema.ts`, `docx/writer.ts`, `odt/writer.ts`,
  `odt/styleRegistry.ts`, `index.css` — die Export-Seite und die Editor-Darstellung sind
  bereits korrekt (Abschnitt 8).
- **Der größere Teil des Aufwands ist neue/erweiterte Testabdeckung**, aufgesetzt auf den
  bereits vorhandenen Bestand (Abschnitt 5).

---

## 2. Methodik dieser Prüfung

Direkt gelesen und gegen den Ist-Code abgeglichen: `src/formats/shared/schema.ts`,
`src/formats/shared/editor/{Toolbar,WordEditor}.tsx`,
`src/formats/shared/editor/commands.ts`, `src/formats/docx/{writer,reader}.ts`,
`src/formats/odt/{writer,reader,styleRegistry}.ts`, `src/index.css`,
`src/formats/shared/editor/__tests__/commands.test.ts`, sowie die real vorhandenen
E2E-Specs (`tests/e2e/clipboard-roundtrip.spec.ts`, `docx.spec.ts`, `odt.spec.ts`,
`roundtrip-fidelity.spec.ts`, `selection-regression.spec.ts`) und die
`__tests__/external-validation.test.ts` beider Formate. Zusätzlich `src/app/
DocumentWorkspace.tsx` (Cross-Format-Blocker, Abschnitt 5.3) sowie — für die
Kollisionswarnung in Abschnitt 9 — `specs/fett-req.md` und `specs/fett-code.md` (beide
Stand 2026-07-05, inkl. deren jeweiligem „Defekt A"/„Defekt E"-Nachtrag).

Über die reine Codelektüre hinaus verifiziert:

- **Installierte `prosemirror-commands`-Version = 1.7.1**, `removeWhenPresent` als
  öffentliche `toggleMark`-Option vorhanden (Grundlage des Fixes in Abschnitt 4.1); der
  interne `$cursor`/`storedMarks`- und `rangeHasMark`/`nodesBetween`-Vergleich in
  `node_modules/prosemirror-commands/dist/index.js:679-712` direkt gelesen (nicht nur aus
  der `.d.ts`-Doku übernommen) — Grundlage sowohl für `isMarkActive` als auch für die
  Wahl von `removeWhenPresent: false` in `toggleInlineMark` (Abschnitt 4.1).
- **Fixture-Korpus-Auswertung** (Node-Skript, JSZip + `@xmldom/xmldom`, exakte
  `getElementsByTagNameNS`-Zählung statt Substring-Suche): DOCX 127 Dateien (`w:rStyle` in
  19; `<w:i w:val="0|false"/>` in genau zwei — `form_footnotes.docx` mit **25**
  Vorkommen, `bug65649.docx` mit **4**), ODT 202 Dateien (`font-style="oblique"` in 0;
  `style:parent-style-name` auf einem `style:family="text"`-Element in **59**). Ergebnisse
  in Abschnitt 6.
- **Generisches DOM-/HTML-Verhalten** (kein Fixture, kein Repo-Code): ein natives
  `<button>` feuert bei Tastatur-Aktivierung (Enter/Leertaste bei vorhandenem Fokus)
  `click`, aber **kein** `mousedown` — Grundlage von Grenzfall 3.8 (Abschnitt 3.8).

---

## 3. Gefundene Defekte — mit Quellcode-/Fixture-Beleg

### 3.1 Aktiv-Anzeige ignoriert `storedMarks` — CONFIRMED

`Toolbar.tsx:69` (in `MarkButton`, Zeilen 55–89):

```ts
const active = markType.isInSet(view.state.selection.$from.marks()) !== undefined
```

`prosemirror-commands@1.7.1` verwendet in `toggleMark` für exakt dieselbe Frage
(Zweig „leere Selektion / Cursor") das Muster `state.storedMarks || $cursor.marks()`, um
zu entscheiden, ob die Marke gesetzt oder entfernt wird. Der Toolbar-Code bildet das
`state.storedMarks || …` **nicht** nach. Damit ist der in Anforderung 3.1 geäußerte
Verdacht bestätigt: Nach Toggle an leerer Schreibmarke zeigt der Button weiterhin
„inaktiv", bis das erste Zeichen getippt wurde — obwohl `state.storedMarks` bereits
korrekt gesetzt ist. `WordEditor.tsx:131` (`forceRender` bei jeder Transaktion) sorgt zwar
für ein Re-Render, ändert aber nichts an der falschen **Datenquelle** der Prüfung.

### 3.2 Aktiv-Anzeige bei gemischter Selektion nur `$from` — CONFIRMED

Gleiche Zeile 69: bei nicht-leerer Selektion wird ausschließlich `$from.marks()`
ausgewertet, nicht der gesamte Bereich (kein `rangeHasMark`/„every"-Test). Bestätigt: Bei
„AB" mit „A" kursiv, „B" nicht, zeigt der Button nach Selektion beider Zeichen fälschlich
„aktiv" (Zustand von „A"), obwohl die Selektion gemischt ist — exakt wie in der
Anforderung vermutet.

### 3.3 `toggleMark`-Voreinstellung widerspricht Anforderung 2.1.1 — CONFIRMED (echter Funktionsfehler)

Dieser Fund beantwortet die in Anforderung 3.2 offen gelassene Frage („was soll bei
gemischter Selektion passieren") technisch: `toggleMark(markType)` — aktuell **ohne**
drittes Options-Argument aufgerufen (`Toolbar.tsx:78`, `WordEditor.tsx:98-100`) — nutzt die
Bibliotheks-Voreinstellung `removeWhenPresent: true`. Mit dieser Voreinstellung gilt: Ist
die Marke **irgendwo** im selektierten Bereich vorhanden, wird sie für die **gesamte**
Selektion entfernt. Für „AB" (A kursiv, B nicht) würde ein Toggle also **A** die
Kursivierung **entziehen**, statt — wie Anforderung 2.1.1 verlangt — **B** ebenfalls
kursiv zu machen. Die alternative Einstellung `removeWhenPresent: false` implementiert
genau die geforderte Word/LibreOffice-Semantik: „nur entfernen, wenn *jeder* Knoten im
Bereich die Marke bereits trägt; sonst für den gesamten Bereich setzen".

**Das ist ein echter, aus der Anforderung direkt ableitbarer Bugfix, keine optionale
Politur.** Er betrifft aktuell **alle vier** Mark-Buttons (`strong`/`em`/`underline`/
`strike`) gleichermaßen, da `MarkButton` eine gemeinsame Komponente ist (Abschnitt 4.1
erläutert, warum diese Mitwirkung beabsichtigt und unproblematisch ist).

### 3.4 DOCX-Import: `<w:i w:val="false|0"/>` fehlinterpretiert — CONFIRMED anhand echter Fixture

`docx/reader.ts:104` (in `marksFromRunProperties`, Zeilen 100–115):

```ts
if (firstChildNS(rPr, OOXML_NAMESPACES.w, 'i')) marks.push({ type: 'em' })
```

prüft nur die **Existenz** von `<w:i>`, nie dessen `w:val`. **Auffälliger Beleg für die
Inkonsistenz:** die direkt folgende Unterstrichen-Prüfung (Zeile 105–106) wertet sehr wohl
`getAttributeNS(w,'val') !== 'none'` aus — Kursiv (und ebenso Fett, Zeile 103) tut das
nicht.

Verifiziert gegen den vorhandenen Korpus (JSZip, `word/document.xml`):
`tests/fixtures/external/docx/form_footnotes.docx` enthält real (nicht konstruiert) den
Lauf

```xml
<w:p><w:pPr><w:pStyle w:val="BodyText"/></w:pPr>
<w:r><w:rPr><w:i w:val="0"/></w:rPr>
<w:t>Provide services in Brazil of a temporary nature, …</w:t></w:r></w:p>
```

(**25** Vorkommen von `<w:i w:val="0"/>` in dieser Datei bestätigt, ausgezählt per
`getElementsByTagNameNS`). Mit dem aktuellen Reader wird dieser Text als kursiv
importiert (`marks: [{ type: 'em' }]`), obwohl `w:val="0"` laut OOXML `ST_OnOff` explizit
„aus" bedeutet. `bug65649.docx` enthält denselben Musterfall (4 Vorkommen). Ein
Regressionstest kann direkt gegen diese realen Dateien geschrieben werden — ganz ohne
synthetisches Fixture (Abschnitt 5.1).

### 3.5 DOCX-Import: `w:rStyle` nicht aufgelöst — CONFIRMED (Code-Pfad fehlt)

`marksFromRunProperties` (Zeilen 100–115) liest ausschließlich direkte Kind-Elemente von
`w:rPr`. Es gibt **keinen** Aufruf von `firstChildNS(rPr, …, 'rStyle')` im gesamten Reader
(bestätigt per Volltextsuche). `parseStylesXml` (Zeilen 53–67) liest aus `styles.xml`
**ausschließlich** `w:pPr > w:outlineLvl` (für Überschriften-Erkennung) — es gibt keinen
Code-Pfad, der `w:type="character"`-Formatvorlagen überhaupt einliest.

Häufigkeit im Korpus: **19 von 127** DOCX-Fixtures referenzieren `<w:rStyle w:val="…">`
produktiv (für Hyperlink-/Kommentar-/andere Zeichenstile). Keine davon transportiert
aktuell Kursiv über die Formatvorlage — der *konkrete* Datenverlust an Kursiv ist im
Korpus also (noch) nicht direkt belegbar, **der fehlende Code-Pfad selbst ist es**. Für den
in Anforderung 3.4 geforderten Testfall ist daher ein **handgebautes** Fixture nötig
(Abschnitt 5.1).

### 3.6 ODT-Import: nur `office:automatic-styles`, keine `office:styles`/`parent-style-name`-Auflösung — CONFIRMED (Code-Pfad fehlt)

`parseAutomaticStyles` (`odt/reader.ts:37-78`) durchsucht ausschließlich das an sie
übergebene `office:automatic-styles`-Element; `readOdt` (Zeilen 357–409) ruft sie nur mit
`contentDoc`s `automatic-styles` (Zeile 363–364) bzw. — für Kopf-/Fußzeile — `stylesDoc`s
`automatic-styles` (Zeile 373–374) auf. **Niemals** mit `office:styles` (benannte
Formatvorlagen). `style:parent-style-name` wird an **keiner** Stelle gelesen (bestätigt per
Volltextsuche). Ein `text:style-name`, das auf eine benannte Zeichenformatvorlage in
`office:styles` verweist, ergibt `textStyles.get(name) → undefined` → `marksFor` liefert
`[]` (Zeile 103) → Kursiv geht verloren.

Häufigkeit: **59 der 202** ODT-Fixtures nutzen `style:parent-style-name` auf einem
`style:family="text"`-Element (u. a. `CharacterParagraphFormat_MSO15.odt`,
`coloredTable_MSO15.odt`, `feature_fields.odt`, `hyperlinkSpaces.odt`). Kein Fixture zeigt
aktuell konkret verlorenes Kursiv über diesen Pfad, aber der Code-Pfad fehlt nachweislich
für ein in der Praxis verbreitetes Muster. Für den in Anforderung 3.5 geforderten Testfall
ist ein **handgebautes** Fixture nötig (Abschnitt 5.1).

*Abgrenzung (wichtig):* Kursiv über eine **automatische** Formatvorlage (Definition in
`office:automatic-styles`) funktioniert bereits und ist E2E abgedeckt (`odt.spec.ts:276`
nutzt `text:style-name="Italic"`). Dieser Grenzfall betrifft **nur** benannte Stile und die
Vererbungskette.

### 3.7 ODT-Import: `fo:font-style="oblique"` nicht erkannt — CONFIRMED (kein Korpus-Fixture)

`odt/reader.ts:53`: exakter Stringvergleich `=== 'italic'`. Korpus: **0 Treffer** für
`font-style="oblique"` — real selten, laut ODF aber gültig. Entscheidung gemäß Anforderung
3.6: **ja, als Kursiv behandeln** (vertretbare Vereinfachung; das PM-Schema hat keine Mark,
die zwischen „italic" und „oblique" unterscheidet — ein importiertes `oblique` würde beim
Export ohnehin immer als `italic` zurückgeschrieben; bewusste, hier dokumentierte
Vereinfachung, siehe Abschnitt 8). Dieselbe Wurzel betrifft den Schema-`parseDOM`-Matcher
`font-style=italic` (Paste, Anforderung 2.6) — siehe Abschnitt 8 zur bewussten
Nicht-Änderung von `schema.ts`.

### 3.8 Kursiv-Button nicht per Tastatur bedienbar — CONFIRMED (generisches DOM-Verhalten)

`MarkButton` (`Toolbar.tsx:55-89`) verdrahtet den Toggle ausschließlich über `onMouseDown`
(Zeilen 76-79):

```ts
onMouseDown={(e) => {
  e.preventDefault()
  run(view, toggleMark(markType))
}}
```

Es gibt **kein** `onClick` und **kein** `onKeyDown` an diesem `<button>`. Das ist kein
bloßer Verdacht, sondern folgt zwingend aus dem HTML-/DOM-Standardverhalten eines nativen
`<button type="button">`: Eine Maus-Interaktion feuert `mousedown` → `mouseup` → `click`;
eine Tastatur-Aktivierung (Tab-Fokus, dann Enter **oder** Leertaste) feuert dagegen
ausschließlich `keydown`/`keyup` und — synthetisch vom Browser erzeugt — **`click`**,
**niemals** `mousedown`. Ein Button, der seine gesamte Aktion an `onMouseDown` hängt, bleibt
bei Tastatur-Aktivierung also zwangsläufig wirkungslos. Strg+I bleibt davon unberührt (läuft
über die separate Keymap, `WordEditor.tsx:99`) — betroffen ist ausschließlich der **Button
selbst**, exakt wie in Anforderung Grenzfall 3.8 vermutet.

Identischer Defekt, identische Komponente wie „Defekt A" in `specs/fett-req.md` /
`specs/fett-code.md` Abschnitt 4.2 (dort bereits mit demselben Fix — Verlagerung auf
`onClick` — geplant; siehe Abschnitt 9 zur Koordinierung zwischen beiden Plänen).

**Anforderung (Fix, Abschnitt 4.1):** `onMouseDown` beschränkt sich künftig auf
`e.preventDefault()` (verhindert weiterhin Fokus-/Selektionsverlust beim Mausklick); der
eigentliche Toggle wandert nach `onClick`, das für Maus **und** Tastatur gleichermaßen
feuert.

---

## 4. Dateigenauer Änderungsplan — bestehende Dateien

| # | Datei | Änderung | Typ |
|---|---|---|---|
| 1 | `src/formats/shared/editor/commands.ts` | Neu: `isMarkActive(state, markType)` und `toggleInlineMark(markType, attrs?)` (Abschnitt 4.1) | Fix + neue testbare API |
| 2 | `src/formats/shared/editor/Toolbar.tsx` | `MarkButton` (Zeile 68–78) nutzt `isMarkActive`/`toggleInlineMark` statt `markType.isInSet($from.marks())`/`toggleMark`; Toggle-Aufruf von `onMouseDown` nach `onClick` verlagert (`onMouseDown` behält nur `preventDefault()`, Abschnitt 3.8); `toggleMark`-Import entfernen | Fix |
| 3 | `src/formats/shared/editor/WordEditor.tsx` | Zeilen 98–100 (`Mod-b`/`Mod-i`/`Mod-u`) nutzen `toggleInlineMark` statt `toggleMark`; übriger Keymap-Block (Copy/Paste-Kommentar, `Shift-Enter`, `Shift-Delete`) unverändert; `toggleMark`-Import prüfen/entfernen | Fix |
| 4 | `src/formats/docx/reader.ts` | `onOffVal`-Helfer (ST_OnOff); `parseCharacterStyleItalic` gegen `word/styles.xml` (inkl. `w:basedOn`); `HeadingInfo` um `italicByCharStyleId` erweitern; `marksFromRunProperties` liest `w:val` **und** löst `w:rStyle` auf (Abschnitt 4.2) | Fix + neues Feature |
| 5 | `src/formats/odt/reader.ts` | `parseTextStyleDefs`/`resolveTextStyle` (containerunabhängig); Zusammenführen `content.xml`+`styles.xml`, automatisch **und** benannt; `style:parent-style-name`-Kette; `oblique` zusätzlich zu `italic` (Abschnitt 4.3) | Fix + neues Feature |
| 6 | `src/formats/shared/schema.ts` | **Keine Änderung** (Abschnitt 8) | — |
| 7 | `src/formats/docx/writer.ts` | **Keine Änderung** (Abschnitt 8) | — |
| 8 | `src/formats/odt/writer.ts` / `styleRegistry.ts` | **Keine Änderung** (Abschnitt 8) | — |
| 9 | `src/index.css` | **Keine Änderung** (Abschnitt 8) | — |

### 4.1 `commands.ts` — `isMarkActive` / `toggleInlineMark`; `Toolbar.tsx` — `onClick` statt `onMouseDown` (Grenzfälle 3.1/3.2/3.8)

Neu am Ende von `commands.ts` (die Datei hat bislang **keine** Mark-Hilfsfunktion — genau
die von Anforderung Abschnitt 0 kritisierte Lücke „kein eigener, isoliert testbarer Befehl
… anders als `setAlign`/`setHeading`/`toggleList`"):

```ts
import type { Command, EditorState } from 'prosemirror-state'
import type { MarkType } from 'prosemirror-model'
import { toggleMark as pmToggleMark } from 'prosemirror-commands'
// … bestehende Imports (wrapInList, liftListItem, isInTable, wordSchema) unverändert …

/**
 * Toggles `markType` the way Word/LibreOffice do: if the current selection does *not*
 * uniformly carry the mark, the whole selection is switched ON; only when it is already
 * uniform does the toggle switch it OFF. This is `prosemirror-commands`' `toggleMark` with
 * `removeWhenPresent: false` — the library default (`removeWhenPresent: true`, used by
 * every call site in this repo before this fix) instead removes the mark as soon as it is
 * found *anywhere* in the selection, silently contradicting requirement 2.1.1 ("… sofern
 * nicht bereits (einheitlich) kursiv") for a genuinely mixed selection. For an empty
 * selection (caret only) the option has no effect — it behaves exactly like a bare
 * `toggleMark`.
 */
export function toggleInlineMark(markType: MarkType, attrs: Record<string, unknown> | null = null): Command {
  return pmToggleMark(markType, attrs, { removeWhenPresent: false })
}

/**
 * Whether `markType` should render as "active" for the current selection.
 *
 * - Empty selection: mirrors exactly what `toggleMark` checks internally
 *   (`state.storedMarks || $from.marks()`), so a toggle at the bare caret is reflected
 *   immediately, *before* any text is typed (fixes Grenzfall 3.1).
 * - Range selection: true only if *every* non-whitespace inline node across *every*
 *   selection range already carries the mark (the "uniform" test `toggleMark` uses
 *   internally for `removeWhenPresent: false`, which prosemirror-commands does not export,
 *   so it is reimplemented here). A mixed selection reports `false`, never a false
 *   "active" (fixes Grenzfall 3.2). Iterating `state.selection.ranges` (not just
 *   `$from`/`$to`) also makes this correct for a `CellSelection` spanning table cells.
 */
export function isMarkActive(state: EditorState, markType: MarkType): boolean {
  const { $from, empty } = state.selection
  if (empty) return !!markType.isInSet(state.storedMarks || $from.marks())

  return state.selection.ranges.every(({ $from: rFrom, $to: rTo }) => {
    let uniform = true
    state.doc.nodesBetween(rFrom.pos, rTo.pos, (node, pos, parent) => {
      if (!uniform || !node.isInline) return
      // Ignore whitespace-only text at the range edges — Word/LibreOffice do not let a
      // leading/trailing space flip the button to "not active".
      const localFrom = Math.max(0, rFrom.pos - pos)
      const localTo = Math.min(node.nodeSize, rTo.pos - pos)
      const isWhitespaceOnly = node.isText && /^\s*$/.test(node.textBetween(localFrom, localTo))
      if (!isWhitespaceOnly && parent?.type.allowsMarkType(markType) && !markType.isInSet(node.marks)) {
        uniform = false
      }
    })
    return uniform
  })
}
```

**`Toolbar.tsx`** — `MarkButton` (Zeilen 55–89) ändert sich an drei Stellen: den
Aktiv-Zustand (Grenzfälle 3.1/3.2), **und** den Event-Handler, der den Toggle auslöst
(Grenzfall 3.8 — ein natives `<button>` feuert bei Tastatur-Aktivierung `click`, nicht
`mousedown`; siehe Abschnitt 3.8). Der Toggle wandert deshalb nach `onClick`; `onMouseDown`
bleibt nur für `preventDefault()` erhalten (verhindert weiterhin, dass der Mausklick selbst
den Editor-Fokus/die Selektion verwirft, *bevor* `onClick` feuert):

```ts
// oben: import { toggleMark } from 'prosemirror-commands'  ENTFERNEN (nicht mehr direkt genutzt)
import { isMarkActive, toggleInlineMark /* , … bestehende … */ } from './commands'

// in MarkButton:
const active = isMarkActive(view.state, markType)            // war: markType.isInSet(view.state.selection.$from.marks()) !== undefined  (Zeile 69)
// …
onMouseDown={(e) => {
  e.preventDefault()                                          // NUR NOCH preventDefault (Fokus-/Selektionsschutz)
}}
onClick={() => {
  run(view, toggleInlineMark(markType))                       // NEU: Toggle jetzt hier (feuert für Maus UND Tastatur)
}}
```

`onClick` feuert für einen Maus-Klick nach `mousedown`/`mouseup` **und** für Tastatur-
Aktivierung (Enter/Leertaste bei fokussiertem Button) — in beiden Fällen genau **einmal**,
sodass kein doppeltes Toggle entsteht (deckt zugleich Grenzfall 3.9 #9 „Doppelklick" ab:
ein regulärer Doppelklick löst zwei `click`-Events und damit ein doppeltes, sich
gegenseitig aufhebendes Toggle aus — identisch zum bereits bestehenden Verhalten vor diesem
Fix, da `onMouseDown` ebenfalls bei jedem der zwei `mousedown`-Events gefeuert hätte; keine
Regression). `run` (`Toolbar.tsx:28-31`) fokussiert den View im Anschluss ohnehin wieder.

**`WordEditor.tsx`** — nur die drei Mark-Bindings (Zeilen 98–100) ändern, der umgebende
`keymap({ … })`-Block (Copy/Paste-Kommentar Zeile 86–92, `Enter` Zeile 96 / `Shift-Enter`
Zeile 97 / `Shift-Delete` Zeile 106) bleibt unverändert:

```ts
import { cutSelection, insertHardBreak, toggleInlineMark } from './commands'
// import { baseKeymap, toggleMark } from 'prosemirror-commands'  →  nur noch baseKeymap importieren

'Mod-b': toggleInlineMark(wordSchema.marks.strong),   // war: toggleMark(wordSchema.marks.strong)
'Mod-i': toggleInlineMark(wordSchema.marks.em),       // war: toggleMark(wordSchema.marks.em)
'Mod-u': toggleInlineMark(wordSchema.marks.underline),// war: toggleMark(wordSchema.marks.underline)
```

Damit reagieren Klick (Toolbar) und Tastenkürzel garantiert **identisch** (Anforderung
2.1.2).

**Bewusste Auswirkung auf andere Marks:** Da `MarkButton` und die `keymap`-Einträge nicht
pro Mark spezialisiert sind, ändert dieser Fix das Verhalten von „Fett" (`strong`),
„Unterstrichen" (`underline`), „Durchgestrichen" (`strike`, nur Button) identisch mit —
sowohl die Toggle-/Aktiv-Semantik (Grenzfälle 3.1/3.2) **als auch** die Tastatur-
Bedienbarkeit des Buttons selbst (`onClick` statt `onMouseDown`, Grenzfall 3.8). Das ist
beabsichtigt (Anforderung 2.1.3 verlangt genau diese Symmetrie) und unproblematisch, weil
weder `fett-code.md` noch `durchgestrichen-code.md`/`unterstrichen-einfach-code.md` eine
dem widersprechende, bereits abgenommene Toggle-Semantik festgeschrieben haben. Die
**Testabdeckung** dieses Plans bezieht sich dennoch ausschließlich auf Kursiv, wie von
`kursiv-req.md` gefordert (Abschnitt 9). `strike` besitzt weiterhin **kein** Tastenkürzel —
unverändert, außerhalb des Geltungsbereichs.

### 4.2 `docx/reader.ts`

**Neuer Helfer** (OOXML `ST_OnOff`: fehlendes `w:val` bzw. `"true"`/`"1"`/`"on"` = an;
`"false"`/`"0"`/`"off"` = aus; unbekannte Werte fallen lenient auf „an" zurück — konsistent
mit dem bereits etablierten Umgang mit Fremddateien, z. B. `headingLevelForStyle`s
Regex-Fallback, Zeile 73):

```ts
function onOffVal(el: Element | null): boolean | undefined {
  if (!el) return undefined
  const raw = el.getAttributeNS(OOXML_NAMESPACES.w, 'val')
  if (raw === null) return true // bare <w:i/> = on
  const v = raw.toLowerCase()
  if (v === 'false' || v === '0' || v === 'off') return false
  return true // 'true' | '1' | 'on' | unrecognized (documented lenient fallback)
}
```

**Zeichenformatvorlagen-Auflösung** (neu; parst dieselbe `stylesDoc`, die bereits für
`parseStylesXml` geparst wird — kein zusätzliches `zip.file(...)`-Lesen). Die Auflösung der
`w:basedOn`-Kette erfolgt einmalig beim Parsen; das Ergebnis ist eine flache
`Map<styleId, boolean>` nur für Stile mit definitivem Kursiv-Wert:

```ts
interface RawCharStyle { basedOn: string | null; italic: boolean | undefined }
const MAX_STYLE_CHAIN_DEPTH = 25 // gleicher Schutz wie MAX_TABLE_NESTING_DEPTH weiter unten

function parseCharacterStyleItalic(stylesDoc: Document | null): Map<string, boolean> {
  const raw = new Map<string, RawCharStyle>()
  if (stylesDoc) {
    for (const styleEl of Array.from(stylesDoc.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'style'))) {
      if (styleEl.getAttributeNS(OOXML_NAMESPACES.w, 'type') !== 'character') continue
      const id = styleEl.getAttributeNS(OOXML_NAMESPACES.w, 'styleId')
      if (!id) continue
      const rPr = firstChildNS(styleEl, OOXML_NAMESPACES.w, 'rPr')
      const basedOnEl = firstChildNS(styleEl, OOXML_NAMESPACES.w, 'basedOn')
      raw.set(id, {
        basedOn: basedOnEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? null,
        italic: onOffVal(rPr && firstChildNS(rPr, OOXML_NAMESPACES.w, 'i')),
      })
    }
  }
  const resolved = new Map<string, boolean>()
  const walk = (id: string, seen: Set<string>): boolean | undefined => {
    if (seen.has(id) || seen.size >= MAX_STYLE_CHAIN_DEPTH) return undefined
    seen.add(id)
    const def = raw.get(id)
    if (!def) return undefined
    if (def.italic !== undefined) return def.italic
    return def.basedOn ? walk(def.basedOn, seen) : undefined
  }
  for (const id of raw.keys()) {
    const v = walk(id, new Set())
    if (v !== undefined) resolved.set(id, v)
  }
  return resolved
}
```

**Einbindung über die bereits durchgereichte `HeadingInfo`-Struktur** — das ist der
minimal-invasive Weg: `HeadingInfo` (Zeilen 49–51) wird durch die gesamte Aufrufkette
(`decodeDrawingOrPict` → `decodeRunElement` → `collectRuns` → `decodeParagraphRuns` →
`paragraphToBlocks` → `parseTable`/`readBodyChildren`) **schon jetzt** gereicht. Statt einen
neuen Parameter durch alle diese Signaturen zu fädeln, wird die Map dort mitgeführt:

```ts
interface HeadingInfo {
  outlineLvlByStyleId: Map<string, number>
  italicByCharStyleId: Map<string, boolean> // neu
}
```

`parseStylesXml` (Zeilen 53–67) füllt zusätzlich `italicByCharStyleId`
(`= parseCharacterStyleItalic(stylesDoc)`), sodass **nur diese eine Funktion** die neue Map
erzeugt und alle bestehenden Aufrufer unverändert bleiben. `readDocx` (Zeilen 495–496)
parst `stylesDoc` bereits — dieselbe Instanz wird an beide Auswertungen übergeben.

`marksFromRunProperties` (Zeilen 100–115) erhält `headingInfo` als zusätzliches Argument;
**der einzige zu ändernde Aufrufer ist `decodeRunElement` (Zeile 172)**, der `headingInfo`
bereits in Reichweite hat. Direkte `<w:i>`-Eigenschaft gewinnt immer über eine
`w:rStyle`-Referenz (OOXML-Kaskade: Lauf-Ebene schlägt Formatvorlage):

```ts
function marksFromRunProperties(
  rPr: Element | null,
  headingInfo: HeadingInfo,
): Array<{ type: string; attrs?: Record<string, unknown> }> {
  if (!rPr) return []
  const marks: Array<{ type: string; attrs?: Record<string, unknown> }> = []
  if (firstChildNS(rPr, OOXML_NAMESPACES.w, 'b')) marks.push({ type: 'strong' })

  const rStyleId = firstChildNS(rPr, OOXML_NAMESPACES.w, 'rStyle')?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? null
  const directItalic = onOffVal(firstChildNS(rPr, OOXML_NAMESPACES.w, 'i'))
  const italic = directItalic !== undefined
    ? directItalic
    : (rStyleId ? headingInfo.italicByCharStyleId.get(rStyleId) : undefined)
  if (italic) marks.push({ type: 'em' })

  // … underline (Zeile 105-106) / strike / textColor / highlight unverändert …
  return marks
}
```

**Empfehlung (im selben Commit, keine gesonderte Ticketpflicht):** `onOffVal` behebt
dieselbe Fehlerklasse auch für `<w:b>` (Zeile 103) und `<w:strike>` (Zeile 107). Da
`onOffVal` durch diesen Plan ohnehin neu entsteht, sollte es konsistent auch dort
eingesetzt werden, um nicht „behoben für `i`, unbehoben für `b`/`strike`" im selben
Funktionskörper zu hinterlassen (Abschnitt 9).

### 4.3 `odt/reader.ts`

Der `family === 'text'`-Zweig von `parseAutomaticStyles` (Zeilen 48–62) wird in eine
wiederverwendbare, **containerunabhängige** Funktion herausgezogen (identisch für ein
`office:automatic-styles`- **und** ein `office:styles`-Element). `parseAutomaticStyles`
bleibt für `paragraphAligns` und `listKinds` erhalten (außerhalb des Geltungsbereichs
dieser Anforderung) — nur der Text-Stil-Teil wird ersetzt:

```ts
interface RawTextStyleDef { parent: string | null; own: RunStyle }

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
      if (fontStyle === 'italic' || fontStyle === 'oblique') own.italic = true // Grenzfall 3.7
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

const MAX_STYLE_CHAIN_DEPTH = 25 // gleicher Schutz wie MAX_NESTING_DEPTH weiter unten

/** Walks style:parent-style-name from `name` to the root, then applies properties
 *  root-first so the most specific (leaf) style wins. */
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

`readOdt` (Zeilen 357–409) führt Definitionen aus **allen** relevanten Containern zusammen,
**bevor** die Vererbungskette aufgelöst wird (wichtig: eine automatische Formatvorlage aus
`content.xml` kann per `style:parent-style-name` auf eine **benannte** aus `styles.xml`
verweisen — die Zusammenführung muss also *vor* der Auflösung passieren):

```ts
// content.xml
const contentAutomaticStyles = contentDoc.getElementsByTagNameNS(ODF_NAMESPACES.office, 'automatic-styles')[0] ?? null
const contentOfficeStyles    = contentDoc.getElementsByTagNameNS(ODF_NAMESPACES.office, 'styles')[0] ?? null // selten, spec-legal
// styles.xml (bereits weiter unten für Kopf-/Fußzeile geladen — hier hochziehen)
const stylesDoc = stylesXmlText ? parseXmlDocument(stylesXmlText) : null
const namedOfficeStyles      = stylesDoc?.getElementsByTagNameNS(ODF_NAMESPACES.office, 'styles')[0] ?? null

// Reihenfolge = Präzedenz: dokument-lokale (automatische) Stile überschreiben gleichnamige
// benannte. In der Praxis kollidieren die Namensräume nicht (automatisch "T1" vs. benannt
// "Emphasis"), aber falls doch, gewinnt die spezifischere automatische Definition.
const textStyleDefs = new Map<string, RawTextStyleDef>()
for (const container of [namedOfficeStyles, contentOfficeStyles, contentAutomaticStyles]) {
  for (const [name, def] of parseTextStyleDefs(container)) textStyleDefs.set(name, def)
}
const resolvedTextStyles = new Map<string, RunStyle>()
for (const name of textStyleDefs.keys()) resolvedTextStyles.set(name, resolveTextStyle(name, textStyleDefs))

// paragraphAligns / listKinds weiterhin aus parseAutomaticStyles(contentAutomaticStyles);
// nur dessen textStyles-Map wird durch resolvedTextStyles ersetzt:
const base = parseAutomaticStyles(contentAutomaticStyles)
const contentStyles: ParsedStyles = { ...base, textStyles: resolvedTextStyles }
```

`decodeInline`s `marksFor` (Zeilen 100–112) bleibt **unverändert** — es erhält weiterhin
ein bereits vollständig aufgelöstes `RunStyle` je Name, jetzt aus dem zusammengeführten,
vererbungsaufgelösten `resolvedTextStyles`. Für Kopf-/Fußzeile (`stylesForChrome`, Zeile
374) gilt dieselbe Zusammenführung symmetrisch, sobald Kopf-/Fußzeilen laut Anforderung 2.4
UI-bedienbar werden.

*Bewusst nicht behandelt:* ODFs `style:default-style` (Dokument-Standardwerte für eine
Familie) — kein Fixture nutzt es für Kursiv, und die Vererbung über `parent-style-name`
deckt die realen Fälle ab; als dokumentierte Vereinfachung ausgeklammert.

---

## 5. Tests — Bestand, Lücken, neue Dateien

### 5.0 Bereits vorhandene, verifizierte Kursiv-Abdeckung (NICHT neu bauen)

| Ebene | Fundstelle | Was geprüft wird |
|---|---|---|
| Unit-Rundreise DOCX | `docx/__tests__/roundtrip.test.ts` | `em` allein + `[strong, em]`, positionstreu |
| Unit-Rundreise ODT | `odt/__tests__/roundtrip.test.ts` | analog |
| Unabhängige ODF-Validierung inkl. `em` | `odt/__tests__/external-validation.test.ts:62` | Dokument mit `em` „kursiv" gegen OASIS-ODF-1.3-RelaxNG (xmllint-wasm) |
| E2E: echter Button-Klick | `clipboard-roundtrip.spec.ts:186/190` | `getByTitle('Kursiv').click()` → Export → `<w:i/>` |
| E2E: Import + Rendering DOCX | `docx.spec.ts:300` | `.ProseMirror em` „Kursiv" = 1 |
| E2E: Import + Rendering ODT | `odt.spec.ts:276` | `.ProseMirror em` „Kursiv" = 1 (automatischer Stil `Italic`) |
| E2E: Rundreise DOCX→DOCX / ODT→ODT | `roundtrip-fidelity.spec.ts:54/126/176` | `em` „kursiv-rot" (+Farbe+Ausrichtung) vor/nach Zyklus |

Die neuen Tests unten füllen **ausschließlich** die daraus real verbleibenden Lücken.

### 5.1 Unit-Tests (Vitest, jsdom)

**Neu: `src/formats/docx/__tests__/em.test.ts`** — Grenzfälle 3.4 (`w:val`) und 3.5
(`w:rStyle`). (Alternativ in das bestehende `docx/__tests__/reader.test.ts` integrierbar;
eine eigene Datei hält den Kursiv-Bezug auffindbar.)

- `it.each`-Matrix über `<w:i/>`, `w:val="true|1"` → `em` gesetzt; `w:val="false|0|FALSE"`
  → **nicht** gesetzt (Groß-/Kleinschreibung mit abdecken).
- **Regressionstest gegen die reale Fixture** `form_footnotes.docx`: der Lauf „Provide
  services in Brazil…" darf nach Import **nicht** `em` tragen (belegt 3.4 an echter Datei,
  kein synthetisches Fixture nötig).
- Handgebaute DOCX (JSZip, Muster wie `buildSampleDocx` in `docx.spec.ts`) mit
  `word/styles.xml`, das eine `w:type="character"`-Formatvorlage „Betont" mit `<w:i/>`
  definiert, und einem Lauf `<w:rPr><w:rStyle w:val="Betont"/></w:rPr>` → nach Import
  `em` gesetzt.
- Kaskadentest: `<w:rStyle w:val="Betont"/><w:i w:val="false"/>` → **nicht** kursiv
  (Lauf-Ebene schlägt Formatvorlage).
- `w:basedOn`-Kette: „Betont" ohne eigenes `<w:i/>`, aber `w:basedOn="Base"` und „Base" mit
  `<w:i/>` → nach Import `em` gesetzt.

**Neu: `src/formats/odt/__tests__/em.test.ts`** — Grenzfälle 3.6 und 3.7.

- Benannte Formatvorlage nur in `styles.xml` `office:styles` (`fo:font-style="italic"`),
  referenziert per `text:style-name` → `em` gesetzt.
- Reine Vererbung: automatische `T1` mit `style:parent-style-name="Emphasis"` (ohne eigenes
  `font-style`), „Emphasis" in `office:styles` kursiv → `em` gesetzt.
- `fo:font-style="oblique"` → `em` gesetzt (dokumentierte Vereinfachung).

**Erweiterung (NICHT neu): `src/formats/shared/editor/__tests__/commands.test.ts`** — die
Datei existiert bereits (deckt `canCut`/`cutSelection` ab). Zwei neue `describe`-Blöcke für
`isMarkActive`/`toggleInlineMark`, ohne Browser, auf kleinstmöglicher Ebene:

- `isMarkActive` nach `toggleInlineMark(em)` an leerem Cursor = `true` **vor** jeder
  Eingabe (Grenzfall 3.1).
- `isMarkActive` bei Selektion über „A"(kursiv)+„B"(nicht) = `false` (Grenzfall 3.2).
- `toggleInlineMark(em)` auf dieser gemischten Selektion → **beide** Zeichen kursiv (nicht
  beide entfernt): `doc.rangeHasMark(1,2,em)` **und** `rangeHasMark(2,3,em)` = `true`
  (belegt den Fix zu 3.3). `TextSelection` regulär importieren (kein `require`).

### 5.2 E2E-Tests (Playwright)

**Neu: `tests/e2e/kursiv.spec.ts`** — Struktur/Locator-Helfer analog zu `docx.spec.ts`/
`odt.spec.ts`/`selection-regression.spec.ts`. Fokus auf die in 5.0 **nicht** abgedeckten
Fälle:

- **Strg+I per echtem Tastendruck** (`page.keyboard.press('ControlOrMeta+i')`) →
  identisches Ergebnis wie Button-Klick (DoD Punkt 1 verlangt ausdrücklich den echten
  Tastendruck; kein bestehender Test drückt `Mod-i`).
- **`aria-pressed` nach Toggle an leerer Schreibmarke, vor dem ersten Zeichen** (Grenzfall
  3.1) — `Home` → `getByTitle('Kursiv').click()` → `toHaveAttribute('aria-pressed','true')`
  **vor** jedem weiteren Tastendruck.
- **`aria-pressed` bei gemischter Selektion** (Grenzfall 3.2) — „A" kursiv, dann „AB"
  selektieren → `aria-pressed='false'`; anschließend Klick → beide kursiv (nicht entfernt),
  belegt 3.3 auch E2E.
- **Kombination** Fett+Kursiv+Farbe nacheinander über echte Bedienung (Anforderung 2.3 /
  Rundreise 5.1.5) — der `roundtrip-fidelity`-Bestand deckt Farbe+Kursiv aus **Import** ab,
  nicht drei nacheinander per UI gesetzte Marks.
- **Undo/Redo**: ein `Mod-z` macht genau den Kursiv-Toggle rückgängig (Anforderung 2.5).
- **Copy/Paste innerhalb** des Editors erhält Kursiv (Anforderung 2.6).
- **Paste von extern**: synthetisches `ClipboardEvent` mit `text/html`
  `<em>`/`<i>`/`style="font-style:italic"` per `page.evaluate` → als `em` erkannt
  (Anforderung 2.6; Abhängigkeit zu `einfuegen` beachten, Abschnitt 9).
- **Geltungsbereich** (Anforderung 2.4): je ein Sub-Assert für Überschrift, Listenpunkt,
  Tabellenzelle, Text vor/nach `hard_break`.
- **Grenzfall 3.8 (Button per Tastatur bedienbar):** `getByTitle('Kursiv').focus()` (bzw.
  wiederholtes `Tab` vom Dokumentanfang) → `page.keyboard.press('Enter')` → Kursiv schaltet
  um (`aria-pressed` wechselt); danach erneut fokussieren → `page.keyboard.press('Space' /
  ' ')` → Kursiv schaltet zurück. Beide Tasten separat testen (Enter **und** Leertaste
  aktivieren native Buttons unterschiedlich zuverlässig je nach Browser-Engine).
- **Grenzfälle 3.9 #2/#3/#6**: leerer Absatz bzw. leere Tabellenzelle + danach tippen
  (Stored Mark greift, kein Übergriff auf Nachbarzellen); Strg+I bei Fokus auf einem
  anderen Steuerelement (Farbwähler-Input) wirkt **nicht** auf den Editor.
- **Visuelle Darstellung** (Anforderung 4): `getComputedStyle(em).fontStyle === 'italic'`
  (hält zugleich fest, dass kein CSS-Reset die Browser-Kursivierung neutralisiert).

**Rundreise über echte Bedienung (Anforderung 5.1)** — als eigener `describe`-Block in
derselben Datei:

- Szenario 1/2: DOCX- bzw. ODT-Eigenrundreise (Neu → tippen → Teil kursiv → Export →
  Re-Import → nur dieser Teil kursiv). Ergänzt den `clipboard-roundtrip`-Bestand um den
  **Re-Import**.
- Szenario 3/4: reine Kursiv-Fremddatei (handgebaute DOCX mit `<w:i/>` bzw. ODT mit
  automatischem `fo:font-style="italic"`) unverändert exportieren → Kursiv exakt an
  derselben Stelle, kein anderer Text gewinnt/verliert Kursiv.
- Szenario 6: Kursiv in Überschrift/Liste/Tabellenzelle bei Rundreise, je einzeln.

**Unabhängige Validierung des Exports (Anforderung 5.2)**:

- **DOCX-Lücke schließen:** `docx/__tests__/external-validation.test.ts` prüft aktuell nur
  `strong` (Zeile 30/72, `<strong>fettem</strong>`). Um einen `em`-Lauf erweitern → im
  exportierten `word/document.xml` steht `<w:i/>` im korrekten `w:rPr` (Regex/DOMParser,
  **ohne** `readDocx`). Das ist die von DoD Punkt 5 geforderte Ergänzung.
- **ODT bereits vorhanden** (`odt/__tests__/external-validation.test.ts:62`) — erhalten,
  nicht duplizieren.

**Erweiterung: `tests/e2e/selection-regression.spec.ts`** (Grenzfall 3.7, DoD Punkt 6) —
die Datei nutzt aktuell **ausschließlich** `getByTitle('Fett')` (verifiziert: Zeilen
20/52/68/94). Drei neue Tests, identisch zu den bestehenden Fett-Varianten (einfache
Sequenz, Tabellenzellen-Variante, Mehr-Zyklen-Variante), aber mit `getByTitle('Kursiv')` —
bewusst **in derselben Datei**, damit sie dauerhaft in der Suite verankert sind, nicht in
einer separat vergessbaren.

### 5.3 Cross-Format — blockiert; Writer-Ebene-Vorabsicherung jetzt möglich

Cross-Format-Export über die UI ist **blockiert** (`DocumentWorkspace.handleExport`,
Zeile 68/81, exportiert immer im Ursprungsformat; die E2E-Cross-Format-Tests in
`roundtrip-fidelity.spec.ts` sind bewusst `test.skip`, „blocked on backlog slug
`speichern-unter-format`"). Die Anforderungs-Szenarien 9–11 (Abschnitt 5.3 der Anforderung)
sind daher **nicht** sofort abnahmerelevant und werden **nicht** als lauffähige E2E-Tests
angelegt.

Da beide Writer (`writeDocx`/`writeOdt`) dasselbe interne Modell (`WordDocumentContent`)
verarbeiten, ist eine Cross-Format-**Vorabsicherung auf Unit-/Writer-Ebene** schon jetzt
möglich und wird als optionaler Test empfohlen (kein Blocker für den Status
„vertrauenswürdig vorhanden"):

- **Neu (optional): `src/formats/shared/__tests__/em-cross-format.test.ts`** — ein Modell
  mit `em` → `writeOdt` → `readOdt` **und** → `writeDocx` → `readDocx`; in beiden Zweigen
  bleibt genau dieser Lauf kursiv. Das sichert die Modell-Ebene ab, bevor der UI-Weg
  (`speichern-unter-format`) existiert; der E2E-Nachweis bleibt bis dahin blockiert.

---

## 6. Fixture-Inventar (per Skript gegen den vorhandenen Korpus, zuletzt erneut ausgezählt am 2026-07-05)

| Grenzfall | Reales Fixture? | Verwendung |
|---|---|---|
| 3.4 (`w:val="false"/"0"`) | **Ja** — `form_footnotes.docx` (**25**× `<w:i w:val="0"/>`, u. a. Lauf „Provide services in Brazil…"), auch `bug65649.docx` (**4**×). Genau **2 von 127** DOCX-Fixtures. | Direkter Regressionstest gegen die reale Datei + synthetische `it.each`-Matrix (5.1) |
| 3.5 (`w:rStyle`) | Nein für Kursiv (aber **19 von 127** nutzen `w:rStyle` produktiv) | Handgebaute DOCX (5.1) |
| 3.6 (`office:styles`/`parent-style-name`) | Nein für Kursiv (aber **59 der 202** ODT-Fixtures haben ein `style:family="text"`-Element mit `style:parent-style-name`, u. a. `CharacterParagraphFormat_MSO15.odt`, `coloredTable_MSO15.odt`, `feature_fields.odt`, `hyperlinkSpaces.odt`) | Handgebaute ODT (5.1) |
| 3.7 (`oblique`) | Nein (**0** Treffer im Korpus) | Handgebaute ODT (5.1) |

Empfehlung: Nach Umsetzung der Reader-Fixes einmal die bestehenden
`{docx,odt}/__tests__/external-fixtures.test.ts` (prüfen nur „stürzt nicht ab") über den
vollen Korpus laufen lassen und stichprobenartig bestätigen, dass die neue
Auflösungs-Logik **keine** neuen, unerwarteten `em`-Marks an Stellen erzeugt, die vorher
keine hatten (Regressions-Netz; empfehlenswerte Zusatzprüfung vor Statuswechsel).

---

## 7. Details zum Fixture-Fund `form_footnotes.docx` (Beleg für 3.4)

Per Node-Skript (JSZip, `word/document.xml` entpackt): die Datei enthält real

```xml
<w:r><w:rPr><w:i w:val="0"/></w:rPr>
<w:t>Provide services in Brazil of a temporary nature, …</w:t></w:r>
```

(**25** Vorkommen von `<w:i w:val="0"/>` bestätigt). Der aktuelle Reader
(`docx/reader.ts:104`) liest `<w:i>` als vorhanden und pusht bedingungslos `{ type: 'em' }`
— `w:val="0"` wird nie gelesen. Der Text erscheint fälschlich kursiv, sobald diese
unveränderte Drittdatei importiert wird: der stärkste verfügbare Beleg, dass Grenzfall 3.3
der Anforderung ein **aktiv auslösbarer Fehler mit einer bereits im Repo liegenden Datei**
ist.

---

## 8. Bewusst nicht geänderter Code (und warum)

- **`schema.ts` Mark `em` (Zeilen 164–169)** — `parseDOM` deckt `<em>`, `<i>` und
  `style="font-style: italic"` ab (Anforderung 2.6); `toDOM → ['em', 0]` erzeugt `<em>`,
  wodurch der Browser-Standardstil (`font-style: italic`) ohne zusätzliches CSS greift.
  *Bewusste Grenze:* Der Style-Matcher `font-style=italic` greift nur bei exakt `italic`,
  nicht bei `oblique` beim Paste (dieselbe Wurzel wie 3.7). Da `oblique` real extrem selten
  ist (0 im Korpus) und der Reader-Fix in 4.3 den Datei-Import-Pfad abdeckt, wird der
  Paste-Pfad hier **nicht** erweitert — dokumentierte Vereinfachung, kein stiller
  Fehlschlag. (Falls später gewünscht: `{ style: 'font-style', getAttrs: v => /^(italic|oblique)$/.test(v as string) && null }`.)
- **`docx/writer.ts:24`** — schreibt bereits unbedingt `<w:i/>` bei `em`-Mark, unabhängig
  davon, ob der Text ursprünglich direkt oder über `w:rStyle` kursiv war. Das PM-Modell
  kennt nur die boolesche `em`-Mark; der Export ist damit immer eine direkte
  Lauf-Eigenschaft, nie eine Formatvorlagen-Referenz. Erfüllt die **inhaltliche** (nicht
  bytegenaue) Rundreise (Anforderung 5.1) und ist konsistent mit allen anderen Marks.
- **`odt/writer.ts:36` / `styleRegistry.ts:49`** — erzeugt bereits korrekt
  `fo:font-style="italic"` (nie `"oblique"`; ein importiertes `oblique` wird beim Export zu
  `italic`, bewusste Vereinfachung gemäß 3.7).
- **`index.css` (89 Zeilen)** — enthält **keine** Regel für `em`/`font-style` und **keinen**
  globalen Reset, der die `<em>`-Standarddarstellung neutralisiert; auch Tailwinds Preflight
  (`@import 'tailwindcss'`) setzt `font-style` nicht zurück. Kursivdarstellung kommt aus dem
  Browser-Standard. Keine Änderung nötig; der E2E-`getComputedStyle`-Test (5.2) hält diese
  stillschweigende Abhängigkeit von Tailwind-Interna einmal automatisiert fest.
- **`prosemirror-commands`/`prosemirror-model`-Standardverhalten** — Verhalten bei
  `hard_break`-Nachbarschaft (3.9 #4), Tabellenzellgrenzen (`CellSelection.ranges`, 3.9 #3)
  und Dokumentanfang/-ende (3.9 #1) ist generisch über `nodesBetween`/`ranges` und wird nur
  **verifiziert**, nicht neu implementiert (`isMarkActive` iteriert bereits über
  `selection.ranges`, deckt die CellSelection also mit ab).

---

## 9. Offene Abhängigkeiten (nur dokumentieren, kein Code jetzt)

- **`einfuegen` (Copy/Paste-Sanitizing):** Das in Anforderung 2.6 geforderte
  „extern-Paste erkennt `<em>`/`<i>`/`font-style:italic`" funktioniert heute allein über
  ProseMirrors Default-Clipboard-Handling und die `parseDOM`-Definition in `schema.ts:165`.
  Sobald eine Sanitizer-Pipeline für Paste eingeführt wird, muss sie `<em>`/`<i>`/
  `style="font-style: italic"` **durchlassen**, sonst regressiert der Paste-Test aus 5.2
  stillschweigend.
- **`fett`/`durchgestrichen`:** Der Fix in 4.1 (`isMarkActive`/`toggleInlineMark`, plus
  `onClick` statt `onMouseDown`) behebt strukturell dieselbe Toggle-/Aktiv-/
  Tastatur-Bedienbarkeits-Frage für „Fett"/„Unterstrichen"/„Durchgestrichen" mit. Deren
  Code-Pläne sollten auf diesen Abschnitt verweisen, statt die Lösung erneut zu entwerfen.
  Testabdeckung dafür ist **nicht** Gegenstand dieses Plans. **Kollisionswarnung
  (verifiziert, 2026-07-05, drei — nicht nur eine — divergierende Stellen):**
  `specs/fett-code.md` (Abschnitte 4.1/4.2/4.3, Stand nach dessen eigenem „Defekt E"-
  Nachtrag) ändert **dieselben drei Dateien** an **denselben Zeilen**, aber mit
  abweichender Code-Form:
  1. **`isMarkActive`** (`commands.ts`): dort `state.storedMarks ?? $from.marks()` und
     eine einfachere `nodesBetween`-Schleife ohne `selection.ranges`; hier
     `state.storedMarks || $from.marks()` — das Muster, das `prosemirror-commands`'
     `toggleMark` selbst nutzt (verifiziert, `node_modules/prosemirror-commands/dist/
     index.js:689`) — plus Iteration über `selection.ranges` für `CellSelection`.
  2. **Der `onMouseDown`→`onClick`-Umzug in `Toolbar.tsx`** (Grenzfall 3.8/Defekt A): beide
     Pläne bewegen den Toggle-Aufruf identisch von `onMouseDown` nach `onClick` — **das ist
     kompatibel**, solange nur *eine* Fassung tatsächlich landet.
  3. **Die Behebung der `removeWhenPresent`-Voreinstellung** (Grenzfall 3.2/3.3 hier,
     „Defekt E" in `fett-code.md`): **dieser Plan** führt dafür den benannten, isoliert
     testbaren Befehl `toggleInlineMark` in `commands.ts` ein und ruft ihn sowohl in
     `Toolbar.tsx` als auch in `WordEditor.tsx` (`Mod-b`/`Mod-i`/`Mod-u`) auf.
     `specs/fett-code.md` Abschnitt 4.2/4.3 (verifiziert) verdrahtet **stattdessen** das
     dritte Options-Argument **inline** an jeder Aufrufstelle
     (`onClick={() => run(view, toggleMark(markType, null, { removeWhenPresent: false }))}`
     bzw. `'Mod-b': toggleMark(wordSchema.marks.strong, null, { removeWhenPresent: false })`
     usw.) — **ohne** einen gemeinsamen Befehl anzulegen. Beide Varianten erzeugen
     **identisches Laufzeitverhalten** (beide landen letztlich bei
     `toggleMark(markType, attrs, { removeWhenPresent: false })`), sind aber als Diff
     **nicht** kompatibel: Wenn `fett-code.md` zuerst landet, existiert `toggleInlineMark`
     nicht, und dieser Plan muss seine Aufrufstellen auf das inline-Options-Argument
     umstellen (bzw. `toggleInlineMark` alternativ als dünnen Wrapper *über* dem dann schon
     vorhandenen Aufrufmuster ergänzen). Landet dieser Plan zuerst, muss `fett-code.md`
     stattdessen `toggleInlineMark` importieren, statt das Options-Argument erneut inline
     zu wiederholen.

  **Empfehlung dieses Plans (keine Bindungswirkung für `fett-code.md`):** den benannten
  Befehl `toggleInlineMark` verwenden, nicht das Options-Argument an vier Aufrufstellen
  duplizieren — das deckt sich mit der in `kursiv-req.md` Abschnitt 0 kritisierten Lücke
  „kein eigener, isoliert testbarer Befehl … anders als `setAlign`/`setHeading`/
  `toggleList`" und vermeidet, dieselbe Korrektur viermal wortgleich zu wiederholen. Wer
  zuerst committet, entscheidet de facto; der zweite Plan **verweist** nur noch auf die
  gelandete Fassung und passt seine eigenen Datei-/Zeilenreferenzen sowie seine Tests
  daran an, statt die Funktion/Options-Verdrahtung ein zweites Mal zu definieren.
- **`w:b`/`w:strike` mit `w:val="false"`:** Dieselbe Fehlerklasse wie 3.4 besteht
  strukturell auch für Fett/Durchgestrichen. `onOffVal` entsteht in 4.2 ohnehin — im selben
  Commit mitverdrahten (Abschnitt 4.2, Ende).
- **`formatierung-loeschen` (Backlog „fehlt"):** muss `wordSchema.marks.em` in seine
  Clear-Logik aufnehmen.
- **`speichern-unter-format` (Cross-Format-Export):** entblockt die Anforderungs-Szenarien
  9–11 und die `test.skip`-Cross-Format-Tests (Abschnitt 5.3).
- **Track Changes (Phase 3, Grenzfall 3.9 #11):** kein Verhalten definiert, keine
  Testpflicht vor Umsetzung.

---

## 10. Abnahme-Mapping (Anforderung Abschnitt 7 „Definition of Done" → Umsetzung)

| DoD-Punkt (Anforderung §7) | Abgedeckt durch |
|---|---|
| **1** — Abschnitt 2 automatisiert grün, **inkl. Strg+I per echtem Tastendruck und Tastatur-Bedienung des Buttons selbst (3.8)** | `tests/e2e/kursiv.spec.ts` (Strg+I-Test, Tab+Enter/Space-Test, Kombination, Undo/Redo, Copy/Paste, Geltungsbereich) + Fix 4.1 |
| **2** — jeder Grenzfall 3.x einzeln beantwortet (Fix oder dokumentiert) | 3.1/3.2/3.3 → Fix 4.1 + Unit (5.1) + E2E (5.2); 3.4 → Fix 4.2 + Unit inkl. reale Fixture; 3.5 → Fix 4.2 + Unit; 3.6 → Fix 4.3 + Unit; 3.7 → Fix 4.3 + Unit; **3.8 → Fix 4.1 (`onClick` statt `onMouseDown`) + E2E (5.2)**; Paste-`oblique` bewusst dokumentiert (Abschnitt 8) |
| **3** — `aria-pressed` in „Cursor in kursiv", „Toggle leere Schreibmarke" (3.1), „gemischte Selektion" (3.2) | `commands.test.ts` (Unit) + `kursiv.spec.ts` (E2E) |
| **4** — Pflicht-Rundreise 5.1 (gleiches Format, DOCX **und** ODT, inkl. Kombination/Struktur) grün | `kursiv.spec.ts` describe „Rundreisen" (Szenarien 1–6) |
| **5** — unabhängige Validierung ODT (vorhanden, erhalten) **und** DOCX (`em`-Lauf ergänzt) | ODT `external-validation.test.ts:62` (erhalten) + DOCX `external-validation.test.ts` (um `em` erweitert, 5.2) |
| **6** — Selektions-Sync-Regressionstest mit Kursiv dauerhaft in der Suite | 3 neue Tests in `selection-regression.spec.ts` (5.2) |
| **7** — „K"-Glyph-Erkennbarkeitsrisiko bewertet und Ergebnis nachgetragen | Bewertung unten; visueller `getComputedStyle`-Test (5.2) sichert die Kursivdarstellung ab |

**Zu DoD Punkt 7 (K-Glyph):** Der sichtbare Glyph ist der Buchstabe „K" mit CSS-Klasse
`italic` (`Toolbar.tsx:185`), kein SVG/Emoji — vom Emoji-Rendering-Risiko also nicht
betroffen. Ein kursives „K" ist in manchen Systemschriften nur schwer von einem aufrechten
„K" zu unterscheiden. **Empfehlung dieses Plans:** „K" beibehalten (konsistent mit „F"/„U"/
„S"), aber die Erkennbarkeit im aktiven Zustand (`aria-pressed=true`, dunkler/heller
Hintergrund, `Toolbar.tsx:80-84`) in **beiden** Farbschemata visuell abnehmen; der
Aktiv-Zustand — nicht der Glyph-Neigungswinkel — ist das primäre Unterscheidungsmerkmal.
Das Ergebnis dieser Abnahme ist nach der visuellen Prüfung in `kursiv-req.md` (oder einer
QA-Folgedatei) nachzutragen; erst dann ist DoD Punkt 7 erfüllt.

**Nicht Teil dieser Abnahme (nachgelagert, blockiert):** Cross-Format-Szenarien 9–11
(Anforderung 5.3) — erst nach `speichern-unter-format`. Die optionale
Writer-Ebene-Vorabsicherung (5.3) darf vorher geschrieben werden, ist aber kein Blocker.
