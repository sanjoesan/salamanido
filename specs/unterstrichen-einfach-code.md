# Unterstrichen (einfach) — dateigenauer Umsetzungsplan

Gegenstück zu `specs/unterstrichen-einfach-req.md`. Dieses Dokument beschreibt, nach
tatsächlicher Codelektüre **und tatsächlicher Ausführung des Readers gegen reale
Fixture-Dateien** (nicht nur Quelltext-Inspektion), was am bestehenden Code zu ändern
ist, welche Dateien neu angelegt werden, und wie die in der Anforderung geforderte
Verifikation technisch umgesetzt wird.

**Wichtiger Befund vorab:** Die Referenztabelle der Anforderung ist für den
„Happy Path" (eigene Toolbar → eigener Export → eigener Reader) korrekt. Beim
Gegenprüfen mit **echten, bereits im Repo liegenden** Fremddateien (`tests/fixtures/
external/{docx,odt}`) wurden jedoch **zwei bisher nicht dokumentierte, reale
Importfehler** gefunden, die beide direkt die Rundreise-Anforderung (Abschnitt 5,
Testfall 6) gefährden. Diese sind der eigentliche Schwerpunkt dieses Plans, nicht die
in der Anforderungstabelle bereits vermuteten Groß-/Kleinschreibungs-Details.

---

## 0. TL;DR

1. Schema, Toolbar-Button, Keymap sind exakt so vorhanden wie in der Anforderungstabelle
   beschrieben — **keine Änderung nötig**.
2. DOCX-/ODT-Writer erzeugen korrekt `<w:u w:val="single"/>` bzw.
   `style:text-underline-style="solid"` — **keine Änderung nötig**.
3. **Neu gefundener, verifizierter Bug (kritisch, Abschnitt 3.1/3.2):** Der ODT-Reader
   liest Zeichenformatierung (fett/kursiv/**unterstrichen**/durchgestrichen/Farben) nur
   aus `style:family="text"`-Stilen (referenziert über `<text:span>`). Wird
   Zeichenformatierung — wie in echten LibreOffice/OpenOffice-Dokumenten üblich — direkt
   auf einem `style:family="paragraph"`-Stil hinterlegt (kein `<text:span>` im Text),
   geht sie beim Import **komplett verloren** (nicht nur vereinfacht — es wird gar keine
   Mark gesetzt). **Belegt mit vorhandenem Repo-Fixture `Tabelle1.odt`**, das echten
   Fließtext mit dieser Eigenschaft enthält (siehe Abschnitt 3.1 für den exakten
   Testlauf). Strukturell identische Lücke im DOCX-Reader bei stilvererbten
   `<w:rPr>`-Standardwerten aus `styles.xml` (Abschnitt 3.2).
4. **Neu gefundener, verifizierter Bug (Abschnitt 3.3):** Der ODT-Reader kennt das
   Element `<text:a>` (Hyperlink) nicht. Text, der ausschließlich in `<text:a>` liegt,
   wird beim Import **vollständig ignoriert** (nicht nur die Formatierung — der Text
   selbst verschwindet). Belegt mit Repo-Fixture `hyperlinkSpaces.odt`. Für „Unterstrichen
   (einfach)" direkt relevant, weil mehrere vorhandene ODT-Fixtures mit
   `text-underline-style="solid"` genau diesen Fall betreffen (`hyperlinkSpaces.odt`,
   `hyperlinkSpacesNoUnderline.odt`, `hyperlink.odt`, `Hyperlink-AOO401.odt`) und daher
   als Rundreise-Testkandidaten ungeeignet sind, solange dieser Bug besteht.
5. Kleinere, bereits in der Anforderung vermutete Härtungen (Groß-/Kleinschreibung
   `w:val`/`style:text-underline-style`, Registry-Dedup-Key-Reihenfolge) sind ebenfalls
   nötig, aber von geringerer Priorität als Punkt 3/4.
6. Der weit überwiegende Teil des Aufwands sind **neue Testdateien** (E2E + gezielte
   Unit-Tests gegen reale Fixtures) — das war bereits in der Anforderung als Kernlücke
   benannt und bleibt es, wird durch die Befunde in Abschnitt 3.1–3.3 aber um konkrete,
   bereits reproduzierte Fehlerfälle ergänzt, die ohne Test bisher unentdeckt geblieben
   wären.
7. `FEATURE-SPEC-DOCX-ODT.md`, auf das die Anforderung mehrfach verweist (Methodik,
   Abschnitt 2 „Selection-Sync-Bug", Abschnitt 14 „Hyperlink-Default", Abschnitt 19/20.1/21),
   **existiert in diesem Repo nicht** (`specs/` enthält keine solche Datei). Die
   inhaltlichen Referenzen sind, soweit über tatsächlichen Code/Tests nachprüfbar
   (`tests/e2e/selection-regression.spec.ts` existiert und deckt den Selection-Sync-Bug
   tatsächlich ab), plausibel — aber die Datei selbst fehlt. Als Doku-Inkonsistenz
   vermerkt (Abschnitt 3.7), nicht Gegenstand einer Code-Änderung.

---

## 1. Methodik dieser Prüfung

Gelesen wurden alle in der Anforderungstabelle genannten Fundstellen:
`src/formats/shared/schema.ts`, `src/formats/shared/editor/Toolbar.tsx`,
`src/formats/shared/editor/WordEditor.tsx`, `src/formats/shared/editor/commands.ts`,
`src/formats/docx/writer.ts`, `src/formats/docx/reader.ts`,
`src/formats/odt/writer.ts`, `src/formats/odt/reader.ts`,
`src/formats/odt/styleRegistry.ts`, beide `__tests__/roundtrip.test.ts`, beide
`__tests__/external-fixtures.test.ts`, `tests/e2e/*.spec.ts`.

Zusätzlich — und das ist der Unterschied zur reinen Quelltext-Lektüre — wurden die
vorhandenen Fixture-Korpora (`tests/fixtures/external/docx`, `.../odt`, zusammen >250
reale, nicht selbst erzeugte Dateien aus den Apache-POI- und ODF-Toolkit-Testkorpora)
**tatsächlich entpackt und inhaltlich durchsucht** (Node-Skript mit `jszip`, `w:u`- bzw.
`text-underline-style`-Werte je Datei extrahiert) sowie **`readOdt()` probeweise gegen
zwei konkrete Fixtures ausgeführt** (temporärer Vitest-Testlauf, siehe Abschnitt 3.1/3.3
für die Ausgabe), um die in Anforderungsabschnitt 7 kritisierte Lücke
(„Code-Vorhandensein wurde mit Funktionieren verwechselt") nicht auf dieser Planungsebene
zu wiederholen.

---

## 2. Ist-Zustand nach Codelektüre — Abgleich mit der Anforderungstabelle

| Fundstelle laut Anforderung | Verifiziert im Code | Abweichung? |
|---|---|---|
| `schema.ts` Mark `underline`, `parseDOM: [{tag:'u'}, {style:'text-decoration=underline'}]`, `toDOM → ['u',0]` | Ja, exakt so (Zeilen 122–127) | keine |
| `Toolbar.tsx` `MarkButton` mit `mark="underline"`, `label="U"`, `title="Unterstrichen"`, `glyphClassName="underline"` | Ja, exakt so (Zeile 137) | keine — Titel ist „Unterstrichen", **nicht** „Unterstrichen (einfach)"; entspricht der Forderung in Anforderungsabschnitt 1, den Titel nicht vorzeitig auf „einfach" zu erweitern |
| `WordEditor.tsx` Keymap `'Mod-u': toggleMark(wordSchema.marks.underline)` | Ja (Zeile 78) | keine |
| `docx/writer.ts` `runPropertiesXml` → `<w:u w:val="single"/>`, kein `w:color` | Ja (Zeile 23) | keine |
| `docx/reader.ts` `marksFromRunProperties` → Mark bei `<w:u>` vorhanden **und** `w:val !== 'none'` | Ja (Zeile 104–105) | Groß-/Kleinschreibung nicht normalisiert (Grenzfall 14) **und** kein Zugriff auf stilvererbte Standard-`<w:rPr>` aus `styles.xml` (neu gefunden, Abschnitt 3.2) |
| `odt/styleRegistry.ts` `buildTextStyleXml` → `style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"` | Ja (Zeile 50–54) | keine (Verhalten zu Anforderungsabschnitt 3.8 korrekt) |
| `odt/reader.ts` `parseAutomaticStyles` → Mark bei Attribut vorhanden **und** `!== 'none'` | Ja (Zeile 53–54) | Groß-/Kleinschreibung nicht normalisiert (Grenzfall 14) **und** wird nur für `style:family="text"` ausgewertet — Absatzstil-Ebene komplett ignoriert (neu gefunden, kritisch, Abschnitt 3.1) |
| Unit-Tests Rundreise (konstruierte Daten) | Ja, in beiden `roundtrip.test.ts`, Zeile 57–78 | bestätigt: testet nur den eigenen Writer→Reader-Kreislauf, kann Fremddatei-Lücken (Abschnitt 3.1/3.3) prinzipiell nicht finden |
| E2E-Tests für „underline" | Keine gefunden | bestätigt — `tests/e2e/` enthält weder „underline" noch „Unterstrichen" als String |

Zusätzlich beim Code-Audit gefunden, **nicht** in der Anforderungstabelle erwähnt:

- **`src/formats/odt/reader.ts`, `decodeInline`/`walk` (Zeile 79–120):** Zeichenmarken
  werden ausschließlich über `<text:span style-name=...>` aufgelöst (`marksFor`, Zeile
  82–94). Text, der direkt (ohne `<text:span>`) Kind eines `<text:p>`/`<text:h>` ist,
  wird immer mit `marks: []` aufgerufen (`walk(child, [])`, Zeile 118) — selbst wenn
  `<text:p>` selbst einen `style:family="paragraph"`-Stil referenziert, der eigene
  `<style:text-properties>` (inkl. `text-underline-style`) trägt. Siehe Abschnitt 3.1.
- **`src/formats/odt/reader.ts`, `walk` (Zeile 96–116):** kennt nur `text:span`,
  `text:line-break`, `text:s`, `text:tab` als Element-Fälle; jedes andere Element
  (insbesondere `<text:a>` für Hyperlinks) fällt durch alle Bedingungen und wird
  **stillschweigend ignoriert, inklusive seines gesamten Text-Inhalts** (kein
  generischer Rekursions-Fallback für unbekannte Elemente). Siehe Abschnitt 3.3.
- **`src/formats/docx/reader.ts`, `parseStylesXml`/`HeadingInfo` (Zeile 52–66):** liest
  aus `word/styles.xml` ausschließlich `w:outlineLvl` je Stil (für Überschriften-Level).
  Ein Stil kann in `styles.xml` jedoch direkt unter `<w:style>` ein eigenes `<w:rPr>`
  mit Standard-Zeichenformatierung tragen (z. B. `<w:u w:val="single"/>` für die
  eingebaute Word-Formatvorlage „Title"). Dieses `<w:rPr>` wird nirgends gelesen. Siehe
  Abschnitt 3.2.
- **`src/formats/docx/reader.ts`, `marksFromRunProperties` (Zeile 99–114):** prüft für
  `<w:b>`/`<w:i>`/`<w:strike>` nur, ob das Element **vorhanden** ist, nicht dessen
  `w:val`. Ein reales `<w:b w:val="0"/>` (explizites Ausschalten einer von der
  Formatvorlage geerbten Fettformatierung) würde fälschlich als „fett" gewertet. Nur
  `<w:u>` prüft bereits korrekt gegen `w:val !== 'none'`. **Außerhalb des Scopes dieser
  Anforderung** (betrifft `fett-req.md`/`kursiv-req.md`/`durchgestrichen-req.md`), hier
  nur vermerkt, weil es beim Entwurf der in Abschnitt 3.2 vorgeschlagenen
  Default-Merge-Logik relevant wird (dort wird die Existenz dieses separaten Bugs
  bewusst nicht mitgefixt, um den Scope nicht zu sprengen).
- **`src/formats/odt/styleRegistry.ts`, `TextStyleRegistry.styleNameFor` (Zeile 28–39):**
  Der Dedup-Key ist `JSON.stringify(props)` — abhängig von der Objektschlüssel-
  Reihenfolge, die wiederum von der Iterationsreihenfolge der `marks`-Liste abhängt
  (`runPropsFromMarks` in `odt/writer.ts`, Zeile 25–36). Im **aktuellen** Datenfluss der
  App folgenlos, weil ProseMirror Mark-Arrays beim Erzeugen/Re-Hydrieren immer in
  Schema-Rang-Reihenfolge hält (identisch zur Push-Reihenfolge in
  `marksFromRunProperties`/`marksFor`). Kein aktiv auslösbarer Bug über die UI, aber ein
  Härtungsrisiko (Grenzfall 11). Siehe Abschnitt 3.5.
- **`src/formats/shared/schema.ts`, Node `image` (Zeile 45–72):** ist ein
  **Block**-Node (`group: 'block'`), kein Inline-Node. Grenzfall 5 der Anforderung
  („Selektion, die ein eingefügtes Bild einschließt (inline Node ohne Marks)") ist mit
  diesem Schema so nicht konstruierbar. Siehe Abschnitt 3.6.

---

## 3. Gefundene Defekte / Verbesserungen im bestehenden Code

### 3.1 KRITISCH — ODT-Reader ignoriert Zeichenformatierung auf Absatzstil-Ebene

**Nachweis (tatsächlich ausgeführt, nicht nur gelesen):** `Tabelle1.odt`
(`tests/fixtures/external/odt/Tabelle1.odt`, reales Apache-POI/ODF-Toolkit-Fixture)
enthält u. a. den Absatz `"Gomez bewege sich zu wenig"` fünfmal, jeweils direkt als
Text-Kind eines `<text:p text:style-name="P86">` bzw. `="P92">` — **ohne**
`<text:span>` darum. Die referenzierten automatischen Stile sind
`style:family="paragraph"` und tragen ein eigenes
`<style:text-properties style:text-underline-style="wave" .../>` (P86) bzw.
`fo:font-weight="bold" ... style:text-underline-style="dotted"` (P92):

```xml
<style:style style:family="paragraph" style:name="P86" style:parent-style-name="Normal">
  <style:paragraph-properties fo:line-height="100%" fo:margin-bottom="0in"/>
  <style:text-properties style:text-underline-mode="continuous"
    style:text-underline-style="wave" style:text-underline-type="single"
    style:text-underline-width="auto"/>
</style:style>
...
<text:p text:style-name="P86">Gomez bewege sich zu wenig</text:p>
```

Testlauf gegen den echten `readOdt()` (temporärer Probe-Test, siehe Kommando-Log):
Alle fünf Vorkommen von „Gomez bewege sich zu wenig" kommen im resultierenden
ProseMirror-JSON **ganz ohne `marks`-Schlüssel** heraus — keine `underline`-Mark, aber
auch keine `strong`-Mark trotz `fo:font-weight="bold"` im P92-Stil. Der Grund:
`parseAutomaticStyles` (`odt/reader.ts`, Zeile 42–67) liest `<style:text-properties>`
nur, wenn `family === 'text'` (Zeile 47–61); für `family === 'paragraph'` wird nur
`<style:paragraph-properties>`/`fo:text-align` ausgelesen (Zeile 62–66), die
Geschwister-`<style:text-properties>` desselben Stils wird nie angefasst.
`decodeInline`/`walk` (Zeile 79–120) ruft für jedes direkte Kind eines `<text:p>` immer
`walk(child, [])` auf (Zeile 118) — der eigene Stilname des Absatzes wird dort gar nicht
erst nachgeschlagen.

**Relevanz für „Unterstrichen (einfach)":** In `Tabelle1.odt` sind die konkreten Werte
`wave`/`dotted` (außerhalb des Scopes dieser Anforderung), aber derselbe Codepfad
verschluckt **identisch** eine `style:text-underline-style="solid"`, wenn sie
— was in echten LibreOffice/OpenOffice-Dokumenten ein gängiges Muster ist, z. B. wenn
ein ganzer Absatz auf einmal formatiert wird — auf Absatzstil-Ebene statt über
`<text:span>` gesetzt ist. Das ist kein hypothetischer Fall: Sowohl `hyperlinkSpaces.odt`
als auch `underlineNone.odt` enthalten ebenfalls einen `style:family="paragraph"`-Stil
(„P11") mit `style:text-underline-style="solid"` (dort zwar zusätzlich mit
`<text:span>`-Kindern verschachtelt, siehe Abschnitt 3.3, aber die Existenz des Musters
„Underline-Default auf Paragraph-Stil" ist damit im vorhandenen Korpus mehrfach belegt,
nicht nur bei `wave`/`dotted`).

**Fix — Vorschlag (Größenordnung: mittel, kein Einzeiler):**

1. `parseAutomaticStyles` erweitern: für `family === 'paragraph'` zusätzlich zu
   `paragraphAligns` eine neue `paragraphCharStyles: Map<string, RunStyle>` befüllen,
   mit derselben `<style:text-properties>`-Auswertung, die aktuell nur für
   `family === 'text'` läuft (Bold/Italic/Underline/Strike/Color/Highlight — Auswertung
   in eine wiederverwendbare Funktion `runStyleFromTextProperties(props: Element)`
   auslagern, statt sie zweimal zu duplizieren).
2. `ParsedStyles`-Interface um `paragraphCharStyles: Map<string, RunStyle>` erweitern.
3. In `decodeInline(pEl, styles)`: vor dem Aufruf von `walk(child, [])` den eigenen
   `text:style-name` von `pEl` auflösen und die daraus resultierenden Marks als
   **Basis** an `walk` übergeben: `walk(child, baseMarks)` statt `walk(child, [])`.
   `walk`s Span-Fall bleibt strukturell erhalten, muss aber die Basis-Marks korrekt
   überschreiben können (siehe Punkt 4).
4. **Explicit-Override-Semantik:** Ein `<text:span style-name="X">`, dessen Stil `X`
   `text-underline-style="none"` explizit setzt, muss eine vom Absatzstil geerbte
   Unterstreichung wieder aufheben können — reines Zusammenhängen der bestehenden
   `marksFor`-Arrays (`[...marks, ...marksFor(styleName)]`, Zeile 106) kann das nicht
   (nur Addition, keine Subtraktion, sonst potenziell doppelte `underline`-Marks). Dafür
   muss `RunStyle` von einem reinen `boolean | undefined` auf ein Tri-State-Modell
   umgestellt werden, das „nicht angegeben" von „explizit aus" unterscheidet (z. B.
   `underline?: boolean | 'explicit-off'`), und `marksFor`/eine neue
   `mergeRunStyle(base: RunStyle, own: RunStyle): RunStyle`-Hilfsfunktion muss
   pro Eigenschaft „eigener Wert überschreibt, falls explizit gesetzt, sonst Basiswert"
   anwenden. Dieselbe Tri-State-Erweiterung ist für `text-line-through-style` sinnvoll,
   aber **nicht zwingend Teil dieses Tickets** — nur `underline` muss für „Unterstrichen
   (einfach)" korrekt sein.
5. Analoges gilt für `<text:h>` (Überschriften, `elementToBlocks`, Zeile 170–175) —
   dort wird `decodeInline(el, styles)` ohne Absatzstil-Basis aufgerufen, betrifft
   denselben Fix.

**Testabdeckung:** neue gezielte Assertion gegen `Tabelle1.odt` in
`src/formats/odt/__tests__/underline.test.ts` (Abschnitt 5.1) — bestätigt nach Fix, dass
die fünf „Gomez"-Absätze eine Mark tragen (in diesem konkreten Fixture technisch
`wave`/`dotted`, die laut Anforderung ohnehin auf „einfach" vereinfacht werden dürfen —
Kernpunkt des Tests ist **„irgendeine Mark, nicht keine"**), plus ein zweiter,
handgebauter Minimal-Testfall mit `style:text-underline-style="solid"` exakt auf
Absatzstil-Ebene (um den in-scope-Fall explizit, nicht nur über den zufälligen
`wave`/`dotted`-Wert von `Tabelle1.odt`, zu beweisen).

### 3.2 Strukturell identische Lücke im DOCX-Reader (stilvererbte `<w:rPr>`-Standardwerte)

Word-Formatvorlagen können in `word/styles.xml` direkt unter `<w:style>` ein eigenes
`<w:rPr>` mit Standard-Zeichenformatierung tragen, die alle Läufe erben, welche diese
Formatvorlage referenzieren und selbst keine abweichende `<w:rPr>` je Eigenschaft
setzen. **Mehrere reale, bereits im Repo liegende Word-Dateien tun das nachweislich für
Unterstrichen:**

| Datei | Formatvorlage (`w:styleId`) | Gefundenes `<w:rPr>`-Fragment |
|---|---|---|
| `bookmarks.docx` | `Title` | `<w:rPr><w:b/><w:u w:val="single"/></w:rPr>` |
| `bug65738.docx` | `Title` | `<w:rPr><w:b/><w:bCs/><w:sz .../><w:szCs .../><w:u w:val="single"/></w:rPr>` |
| `headerPic.docx` | `a4` („Title"), `a5` („Subtitle") | je `<w:rPr>...<w:u w:val="single"/></w:rPr>` |
| `bug65649.docx` | `8` („heading 8"), `aff5` („Subtitle"), `220` | je `<w:rPr>...<w:u w:val="single"/></w:rPr>` |
| `bib-…-17459.docx` | `username2` | `<w:rPr>...<w:u w:val="single"/>...</w:rPr>` |

`docx/reader.ts`, `parseStylesXml` (Zeile 52–66) liest aus jedem `<w:style>` aber
ausschließlich `w:outlineLvl`; das dort vorhandene `<w:rPr>` wird nie konsultiert.
`marksFromRunProperties` (Zeile 99–114) wird ausschließlich mit dem `<w:rPr>` **des
Laufs selbst** aufgerufen (`decodeParagraphRuns`, Zeile 124–143). Es gibt keinen
Codepfad, der die referenzierte Formatvorlage aus `styles.xml` konsultiert.

**Einordnung der Nachweisstärke (Ehrlichkeit statt Übertreibung):** Anders als bei
`Tabelle1.odt` (Abschnitt 3.1, wo ein tatsächlicher, nicht-leerer Textlauf nachweislich
die Mark verliert) wurde im vorhandenen Fixture-Korpus **kein** konkreter, nicht-leerer
Lauftext gefunden, der sich *ausschließlich* auf eine dieser Formatvorlagen-Defaults
verlässt (die o. g. Belegstellen traten in den durchsuchten Dateien nur in Kombination
mit leeren Absätzen oder ungenutzten Formatvorlagen-Definitionen auf). Die Lücke ist
aber **strukturell identisch** zu 3.1, betrifft ein Standard-Word-Feature (eingebaute
Formatvorlagen wie „Title"/„Heading 8" mit Underline-Standard sind keine Exotik), und
wird beim nächsten echten Nutzer-Upload, der z. B. die eingebaute Word-Formatvorlage
„Title" mit ihrer Standard-Unterstreichung nutzt (ohne die Unterstreichung zusätzlich
manuell je Lauf zu setzen), denselben Datenverlust reproduzieren wie in 3.1.

**Fix — Vorschlag (analog zu 3.1, kleinerer Blast-Radius wegen fehlender
`w:basedOn`-Kettenauflösung in diesem Minimal-Fix):**

1. `parseStylesXml`/`HeadingInfo` erweitern um `defaultRunPropsByStyleId: Map<string,
   Element | null>` — je `styleId` das direkte `<w:rPr>`-Kind von `<w:style>` (falls
   vorhanden) merken. **Kein** Auflösen der `w:basedOn`-Vererbungskette in diesem
   Schritt (dokumentierte Restlücke, siehe unten).
2. `paragraphToBlocks` (Zeile 146–183): den bereits vorhandenen `styleId` zusätzlich
   nutzen, um `const defaultRPr = headingInfo.defaultRunPropsByStyleId.get(styleId)`
   aufzulösen und an `decodeParagraphRuns`/`marksFromRunProperties` durchzureichen.
3. `marksFromRunProperties` um einen zweiten Parameter `defaultRPr: Element | null`
   erweitern. Für `underline` konkret: hat der Lauf selbst ein `<w:u>`-Element, gilt
   dessen Wert (inkl. `!== 'none'`-Prüfung, Zeile 105); **nur wenn der Lauf gar kein
   `<w:u>` besitzt**, auf `defaultRPr`s `<w:u>` zurückfallen. Dieselbe
   „eigenes Element hat Vorrang, sonst Default"-Regel wird aus Konsistenzgründen für
   `strong`/`em`/`strike`/`color`/`highlight` mitgebaut (dieselbe Funktion wertet sie
   ohnehin gemeinsam aus) — **ihre bekannte `w:val="0"`-Schwäche (siehe Abschnitt 2)
   wird dabei bewusst nicht mitgefixt**, das bleibt Sache der jeweiligen
   Einzel-Anforderung (`fett-req.md` etc.).
4. **Dokumentierte Restlücke:** `w:basedOn`-Ketten (Formatvorlage erbt von
   Formatvorlage) werden nicht aufgelöst — nur die direkt referenzierte Formatvorlage
   wird konsultiert. Für „Title"/„Heading N" (i. d. R. `basedOn="Normal"`, „Normal"
   selbst setzt praktisch nie Underline) ist das ausreichend; ein mehrstufiger
   Vererbungsfall müsste erneut aufgegriffen werden, falls er real auftritt — nicht
   Teil dieses Plans.

**Testabdeckung:** Da im Korpus kein bestätigter Nicht-Leer-Fall vorliegt, **muss** ein
handgebauter Minimal-Test (Formatvorlage mit `<w:rPr><w:u w:val="single"/></w:rPr>` in
`styles.xml`, ein Absatz, der sie referenziert, ein Lauf ohne eigenes `<w:u>`) in
`src/formats/docx/__tests__/underline.test.ts` ergänzt werden, um das Verhalten exakt
zu fixieren (Abschnitt 5.1).

### 3.3 KRITISCH — ODT-Reader ignoriert `<text:a>` (Hyperlink) vollständig

**Nachweis (tatsächlich ausgeführt):** `readOdt()` gegen
`tests/fixtures/external/odt/hyperlinkSpaces.odt` liefert **keinen einzigen**
Text-Knoten im gesamten Dokumentkörper (`ALL runs: []` im Probe-Testlauf), obwohl die
Datei sichtbaren Text enthält:

```xml
<text:p text:style-name="P11">
  <text:a xlink:href="http://www.eins.de" xlink:type="simple">
    <text:span text:style-name="ab92148">Kapitel</text:span>
  </text:a>
  <text:a xlink:href="http://www.eins.de" xlink:type="simple">
    <text:span text:style-name="a30d27d"> <text:s/><text:s/>...</text:span>
  </text:a>
  <text:a xlink:href="http://www.zwei.de" xlink:type="simple">
    <text:span text:style-name="ab92148">10</text:span>
  </text:a>
</text:p>
```

`walk()` in `odt/reader.ts` (Zeile 96–116) prüft nacheinander `text:span`,
`text:line-break`, `text:s`, `text:tab` — `text:a` erfüllt keinen dieser Fälle, die
Funktion kehrt für dieses Element ohne jede Rekursion in seine Kinder zurück. Der
gesamte Text „Kapitel", die Leerzeichen und „10" — inklusive ihrer jeweils über
`<text:span style-name="ab92148"/"a30d27d">` gesetzten `text-underline-style="solid"` —
gehen beim Import ersatzlos verloren.

**Einordnung:** Hyperlinks selbst sind laut Backlog Status „fehlt"
(`hyperlink-einfuegen-req.md`) und explizit **nicht** Gegenstand dieser Anforderung
(Anforderungsabschnitt 3.7 behandelt nur die *künftige* Wechselwirkung). Der hier
gefundene Bug ist aber kein reines „Hyperlink-Rendering fehlt", sondern ein
**Text-/Formatierungsverlust**, der zufällig über Hyperlink-haltige Fixtures entdeckt
wurde. Er ist deshalb hier zu vermerken (Abnahmekriterium DoD Punkt 5: „Kein während
der Verifikation gefundener Fehler bleibt ohne Ticket/Vermerk"), **aber nicht im Rahmen
von „Unterstrichen (einfach)" zu fixen** — ein Fix würde `<text:a>` als (vorerst
formatierungsneutralen) Inline-Container behandeln müssen, was strukturell zum
Hyperlink-Feature gehört und dort mitgeplant werden sollte
(`specs/hyperlink-einfuegen-req.md`, dort als Fund zu ergänzen).

**Konsequenz für diesen Plan:** Die Fixtures `hyperlinkSpaces.odt`,
`hyperlinkSpacesNoUnderline.odt`, `hyperlink.odt`, `Hyperlink-AOO401.odt`,
`hyperlink_destination.odt` sind **so lange ungeeignet** als Rundreise-Testkandidaten
für „Unterstrichen (einfach)", wie dieser Bug besteht — ein Test gegen sie würde entweder
sofort fehlschlagen (und fälschlich als Underline-Bug erscheinen) oder mit „importiert
leer, daher auch keine Underline-Mark, Test grün" einen Placebo-Erfolg vortäuschen.
Abschnitt 6 empfiehlt stattdessen `character-styles.odt` (sauberer `<text:span>`-Fall,
kein Hyperlink) und `UNDERLINE.odt`.

### 3.4 Groß-/Kleinschreibung (Grenzfall 14)

`docx/reader.ts` Zeile 104–105 und `odt/reader.ts` Zeile 53–54 vergleichen `w:val` bzw.
`style:text-underline-style` als exakten Kleinbuchstaben-String gegen `'none'`. Alle
Werte im vorhandenen Fixture-Korpus sind durchgehend Kleinbuchstaben (siehe Abschnitt 6)
— das ist also aktuell **kein** beobachtbarer Bug, aber laut Grenzfall 14 ausdrücklich
zu härten, da der OOXML-/ODF-Schema-Enum zwar Kleinschreibung vorschreibt, doch
fehlerhafte/exotische Exporte (auch von Drittsoftware, die nicht Word/LibreOffice ist)
das nicht garantiert einhalten. Fix (defensiv, keine Verhaltensänderung für konforme
Dateien):

```ts
// docx/reader.ts
const underlineVal = underline?.getAttributeNS(OOXML_NAMESPACES.w, 'val')?.toLowerCase()
if (underline && underlineVal !== 'none') marks.push({ type: 'underline' })
```

```ts
// odt/reader.ts
const underline = props.getAttributeNS(ODF_NAMESPACES.style, 'text-underline-style')?.toLowerCase()
if (underline && underline !== 'none') style.underline = true
```

(Aus Konsistenzgründen im selben Funktionskörper auch bei `text-line-through-style`
anzuwenden — nicht Gegenstand dieser Anforderung, aber selbe Zeile, selbes Commit.)

### 3.5 `TextStyleRegistry` — kanonischer Dedup-Key (Härtung, Grenzfall 11)

`odt/styleRegistry.ts` Zeile 28–39, Dedup-Key ist `JSON.stringify(props)` —
insertionsreihenfolgeabhängig. Fix — Key aus fester Feldreihenfolge:

```ts
styleNameFor(props: RunProps): string | null {
  if (isEmpty(props)) return null
  const key = JSON.stringify([
    props.bold ?? false,
    props.italic ?? false,
    props.underline ?? false,
    props.strike ?? false,
    props.color ?? null,
    props.highlight ?? null,
  ])
  const existing = this.byKey.get(key)
  ...
}
```

### 3.6 Korrektur der Testfall-Annahme — Grenzfall 5 (`image`-Selektion)

`image` ist im Schema (`schema.ts` Zeile 45–72) ein **Block**-Node, kein
`inline`-Node — kann also nicht innerhalb eines Textlaufs stehen. Der in
Anforderungsabschnitt 4 Grenzfall 5 beschriebene Fall („Selektion, die ein eingefügtes
Bild einschließt (inline Node ohne Marks)") ist mit diesem Schema so nicht
konstruierbar. Der tatsächlich testbare Fall: **Selektion, die von Text in einem Absatz
bis in einen direkt benachbarten `image`-Block reicht** (Absatz + nachfolgendes Bild,
beide selektiert über Shift-Klick/Shift-Pfeiltasten über die Blockgrenze hinweg).
`toggleMark`/`markApplies` aus `prosemirror-commands` iterieren generisch über
`nodesBetween` und werten `node.inlineContent` je Node aus — das deckt diesen Fall ohne
Codeänderung ab; nur der **Test** ist entsprechend zu konstruieren (Abschnitt 5.2).

### 3.7 `FEATURE-SPEC-DOCX-ODT.md` referenziert, aber nicht vorhanden (Doku-Inkonsistenz)

`specs/` enthält keine Datei `FEATURE-SPEC-DOCX-ODT.md`, auf die
`unterstrichen-einfach-req.md` mehrfach verweist (Methodik-Absatz, Abschnitt 3.7,
Grenzfall 8, Abschnitt 7, Abschnitt 21). Die konkret überprüfbaren Inhalte (Selection-
Sync-Bug, Bold als Beispiel) sind über tatsächlichen Code (`WordEditor.tsx`,
Kommentar Zeile 18–41) und einen tatsächlich vorhandenen Test
(`tests/e2e/selection-regression.spec.ts`) bestätigt — die Referenz ist also inhaltlich
plausibel, nur die zitierte Datei fehlt im Repo. Keine Code-Änderung hieraus, nur
Vermerk; ggf. bei Gelegenheit an anderer Stelle zu klären, ob die Datei umbenannt wurde
oder ergänzt werden muss.

---

## 4. Dateigenauer Änderungsplan — bestehende Dateien

| # | Datei | Änderung | Typ | Priorität |
|---|---|---|---|---|
| 1 | `src/formats/odt/reader.ts` | `paragraphCharStyles`-Map ergänzen, `decodeInline` mit Absatzstil-Basis-Marks aufrufen, Tri-State-Merge für `underline` (Abschnitt 3.1) | **Fix (kritisch)** | Hoch |
| 2 | `src/formats/docx/reader.ts` | `defaultRunPropsByStyleId`-Map ergänzen, `marksFromRunProperties` um Fallback auf Formatvorlagen-Standard erweitern (Abschnitt 3.2) | **Fix (kritisch)** | Hoch |
| 3 | `src/formats/docx/reader.ts` | `.toLowerCase()`-Normalisierung beim `w:u`/`w:val`-Vergleich (Abschnitt 3.4) | Fix | Mittel |
| 4 | `src/formats/odt/reader.ts` | `.toLowerCase()`-Normalisierung bei `text-underline-style` (und `text-line-through-style`) (Abschnitt 3.4) | Fix | Mittel |
| 5 | `src/formats/odt/styleRegistry.ts` | Kanonischer Dedup-Key in `styleNameFor` (Abschnitt 3.5) | Härtung | Mittel |
| 6 | `src/formats/shared/schema.ts` | **Keine funktionale Änderung.** Optional: Kommentar über der `underline`-Mark, der auf `unterstrichen-doppelt`/Hyperlink-Abhängigkeit verweist (Abschnitt 9) | Doku-Kommentar | Niedrig |
| 7 | `src/formats/shared/editor/Toolbar.tsx` | **Keine Änderung.** `title`/`aria-label`/`aria-pressed`/`onMouseDown` bereits korrekt | — | — |
| 8 | `src/formats/shared/editor/WordEditor.tsx` | **Keine Änderung.** `Mod-u`-Keymap korrekt; `reconcileSelectionOnClick` ist bereits formatneutral, deckt Grenzfall 8 für Unterstrichen ohne Codeänderung ab | — | — |
| 9 | `src/formats/docx/writer.ts` | **Keine funktionale Änderung.** Bewusst kein `w:color` auf `<w:u>` (entspricht Anforderungsabschnitt 3.8) | — | — |
| 10 | `src/formats/odt/writer.ts` | **Keine Änderung** | — | — |

Es wird **keine neue Command-Abstraktion** für Underline in `commands.ts` eingeführt:
Toolbar und Keymap rufen beide direkt `toggleMark(wordSchema.marks.underline)` auf. Das
ist bereits die minimale, korrekte Umsetzung — `toggleMark` implementiert selbst schon
die komplette in Anforderungsabschnitt 3 geforderte Semantik (Toggle, Selektionserhalt,
`storedMarks` an der Schreibmarke).

### 4.1 Skizze der neuen Typen (ODT, zu Punkt 1)

```ts
// odt/reader.ts
interface RunStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean          // bleibt vorerst boolean|undefined für bold/italic/strike/Farben
  underlineExplicitOff?: boolean // NEU: unterscheidet "nicht angegeben" von "explizit none"
  strike?: boolean
  color?: string
  highlight?: string
}

interface ParsedStyles {
  textStyles: Map<string, RunStyle>
  paragraphCharStyles: Map<string, RunStyle>   // NEU
  paragraphAligns: Map<string, string>
  listKinds: Map<string, 'bullet' | 'ordered'>
}

function mergeUnderline(base: RunStyle, own: RunStyle): boolean {
  if (own.underlineExplicitOff) return false
  if (own.underline) return true
  return !!base.underline
}
```

`decodeInline` löst vor dem Rekursionsstart `baseStyle =
styles.paragraphCharStyles.get(pEl.getAttributeNS(text,'style-name'))` auf, übergibt
daraus abgeleitete Marks als `walk(child, baseMarks)`; im `span`-Fall wird statt
reiner Konkatenation `mergeRunStyle(baseStyle, ownStyle)` verwendet, bevor daraus Marks
gebaut werden (Details beim Implementieren zu verfeinern — dieser Plan legt Datenfluss
und Regel fest, nicht die letzte Zeile Code).

### 4.2 Skizze der neuen Typen (DOCX, zu Punkt 2)

```ts
// docx/reader.ts
interface HeadingInfo {
  outlineLvlByStyleId: Map<string, number>
  defaultRunPropsByStyleId: Map<string, Element>   // NEU — <w:rPr> direkt unter <w:style>
}

function marksFromRunProperties(
  rPr: Element | null,
  defaultRPr: Element | null = null,
): Array<{ type: string; attrs?: Record<string, unknown> }> {
  const ownUnderline = rPr && firstChildNS(rPr, OOXML_NAMESPACES.w, 'u')
  const effectiveUnderlineEl = ownUnderline ?? (defaultRPr && firstChildNS(defaultRPr, OOXML_NAMESPACES.w, 'u'))
  const val = effectiveUnderlineEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val')?.toLowerCase()
  // ... restliche Marks unverändert aus rPr (kein Fallback für b/i/strike/color in diesem Ticket)
  if (effectiveUnderlineEl && val !== 'none') marks.push({ type: 'underline' })
}
```

`paragraphToBlocks` reicht `headingInfo.defaultRunPropsByStyleId.get(styleId)` an
`decodeParagraphRuns` → `marksFromRunProperties` durch.

---

## 5. Neue Dateien — Tests

### 5.1 Unit-Tests (Vitest, `jsdom`)

**Neu: `src/formats/docx/__tests__/underline.test.ts`**

```ts
import JSZip from 'jszip'
import { readDocx } from '../reader'

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'

async function buildDocx(documentXmlBody: string, stylesXmlExtra = ''): Promise<Blob> {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', /* wie tests/e2e/docx.spec.ts::buildSampleDocx, + styles.xml-Override */ '...')
  zip.folder('_rels')!.file('.rels', '...')
  zip.folder('docProps')!.file('core.xml', '...')
  zip.folder('word')!.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NS}><w:body>${documentXmlBody}<w:sectPr/></w:body></w:document>`,
  )
  zip.folder('word')!.file(
    'styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W_NS}>${stylesXmlExtra}</w:styles>`,
  )
  return new Blob([await zip.generateAsync({ type: 'nodebuffer' })])
}

describe('DOCX reader: underline w:val fallback (Grenzfall 9/14)', () => {
  it.each([
    ['single', true], ['double', true], ['wave', true], ['dotted', true], ['dash', true],
    ['none', false], ['NONE', false], ['SINGLE', true],
  ])('w:val="%s" (Lauf-eigenes rPr) → underline mark present: %s', async (val, expectUnderline) => {
    const blob = await buildDocx(
      `<w:p><w:r><w:rPr><w:u w:val="${val}"/></w:rPr><w:t>Text</w:t></w:r></w:p>`,
    )
    const result = await readDocx(blob)
    const run = (result.body as any).content[0].content[0]
    expect((run.marks ?? []).some((m: any) => m.type === 'underline')).toBe(expectUnderline)
  })
})

describe('DOCX reader: underline vererbt aus Formatvorlage (Abschnitt 3.2, neu gefundener Bug)', () => {
  it('Lauf ohne eigenes <w:u> erbt Unterstreichung von der referenzierten Formatvorlage', async () => {
    const blob = await buildDocx(
      `<w:p><w:pPr><w:pStyle w:val="TitleTest"/></w:pPr><w:r><w:t>Titeltext</w:t></w:r></w:p>`,
      `<w:style w:type="paragraph" w:styleId="TitleTest"><w:name w:val="TitleTest"/><w:rPr><w:u w:val="single"/></w:rPr></w:style>`,
    )
    const result = await readDocx(blob)
    const run = (result.body as any).content[0].content[0]
    expect((run.marks ?? []).some((m: any) => m.type === 'underline')).toBe(true)
  })

  it('Lauf mit eigenem <w:u w:val="none"/> überschreibt den Formatvorlagen-Default', async () => {
    const blob = await buildDocx(
      `<w:p><w:pPr><w:pStyle w:val="TitleTest"/></w:pPr><w:r><w:rPr><w:u w:val="none"/></w:rPr><w:t>Titeltext</w:t></w:r></w:p>`,
      `<w:style w:type="paragraph" w:styleId="TitleTest"><w:name w:val="TitleTest"/><w:rPr><w:u w:val="single"/></w:rPr></w:style>`,
    )
    const result = await readDocx(blob)
    const run = (result.body as any).content[0].content[0]
    expect((run.marks ?? []).some((m: any) => m.type === 'underline')).toBe(false)
  })
})
```

**Neu: `src/formats/odt/__tests__/underline.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readOdt } from '../reader'

const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/odt')

async function loadFixture(name: string) {
  return readOdt(new Blob([readFileSync(join(FIXTURES_DIR, name))]))
}

function underlinedRuns(node: any): string[] {
  const out: string[] = []
  const visit = (n: any) => {
    if (n.type === 'text' && (n.marks ?? []).some((m: any) => m.type === 'underline')) out.push(n.text)
    n.content?.forEach(visit)
  }
  visit(node)
  return out
}

describe('ODT reader: real-world underline fixtures (odftoolkit corpus)', () => {
  it('UNDERLINE.odt: recognizes solid underline via <text:span>, not none', async () => {
    const doc = await loadFixture('UNDERLINE.odt')
    expect(underlinedRuns(doc.body).length).toBeGreaterThan(0)
  })

  it('character-styles.odt: "Lorem ipsum" (T3-Stil, solid+italic) trägt underline-Mark', async () => {
    const doc = await loadFixture('character-styles.odt')
    expect(underlinedRuns(doc.body)).toContain('Lorem ipsum')
  })

  it('InvalidUnderlineAttribute.odt: nicht-standardkonformer Wert ("ImSoInvalid") fällt auf underline zurück (Grenzfall 10/14, dokumentierter Fallback)', async () => {
    const doc = await loadFixture('InvalidUnderlineAttribute.odt')
    expect(underlinedRuns(doc.body).length).toBeGreaterThan(0)
  })
})

describe('ODT reader: Absatzstil-Ebene (Abschnitt 3.1, neu gefundener Bug)', () => {
  it('Tabelle1.odt: "Gomez bewege sich zu wenig" (P86/P92, Underline nur auf Absatzstil-Ebene) trägt nach Fix mindestens eine Mark', async () => {
    const doc = await loadFixture('Tabelle1.odt')
    const all: any[] = []
    const visit = (n: any) => { if (n.type === 'text') all.push(n); n.content?.forEach(visit) }
    visit(doc.body as any)
    const gomez = all.filter((n) => n.text === 'Gomez bewege sich zu wenig')
    expect(gomez.length).toBeGreaterThan(0)
    for (const run of gomez) expect(run.marks?.length ?? 0).toBeGreaterThan(0)
  })

  it('handgebauter Minimalfall: reines <text:p style-name> ohne <text:span>, Stil hat solid underline auf Absatzstil-Ebene', async () => {
    // ODT analog tests/e2e/odt.spec.ts::buildSampleOdt bauen, aber mit
    // <style:style style:name="Ppara" style:family="paragraph">
    //   <style:text-properties style:text-underline-style="solid" .../>
    // </style:style>
    // <text:p text:style-name="Ppara">Direkter Text ohne Span</text:p>
    // Erwartung: underline-Mark vorhanden.
  })
})
```

**Erweiterung: `src/formats/odt/__tests__/roundtrip.test.ts`**

Neuer Testfall für Grenzfall 11 (Härtung aus Abschnitt 3.5):

```ts
it('does not create duplicate automatic text styles when the same mark combination arrives in different array order', async () => {
  const original = doc([
    {
      type: 'paragraph', attrs: { align: 'left' },
      content: [
        { type: 'text', text: 'A', marks: [{ type: 'strong' }, { type: 'underline' }] },
        { type: 'text', text: 'B', marks: [{ type: 'underline' }, { type: 'strong' }] },
      ],
    },
  ])
  const blob = await writeOdt(original)
  const zip = await JSZip.loadAsync(blob)
  const contentXml = await zip.file('content.xml')!.async('text')
  const styleDefCount = (contentXml.match(/<style:style style:name="T\d+"/g) ?? []).length
  expect(styleDefCount).toBe(1)
})
```

### 5.2 E2E-Tests (Playwright)

**Neu: `tests/e2e/underline.spec.ts`** — Kernstück dieser Anforderung, Stil analog zu
`tests/e2e/docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts` (gleiche
`odtCard`/`docxCard`-Locator-Helfer wiederverwenden). Deckt Anforderungsabschnitt 6
(„Testfälle") und Abschnitt 4 („Grenzfälle") ab:

```ts
test.describe('Unterstrichen (einfach) — Toolbar & Tastatur', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Testfall 1+2: Toolbar-Klick togglet Unterstreichung an und aus', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Testtext')
    await page.keyboard.press('ControlOrMeta+a')
    const button = page.getByTitle('Unterstrichen')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(editor.locator('u')).toContainText('Testtext')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await expect(editor.locator('u')).toHaveCount(0)
  })

  test('Testfall 3: Strg+U liefert identisches Ergebnis wie Toolbar-Klick', async ({ page }) => { /* ... */ })
  test('Testfall 4: Toggle an der Schreibmarke wirkt nur auf neu getippten Text', async ({ page }) => { /* ... */ })
  test('Testfall 5: Button zeigt aktiven Zustand beim Verschieben des Cursors per Pfeiltasten', async ({ page }) => { /* ... */ })
  test('Testfall 6 / Grenzfall 4: gemischte und reine Leerzeichen-Selektion', async ({ page }) => { /* ... */ })
  test('Testfall 7: Fett + Unterstrichen + Schriftfarbe gleichzeitig, unabhängig entfernbar', async ({ page }) => { /* ... */ })
  test('Testfall 9: Undo/Redo über Tippen → an → aus → Tippen', async ({ page }) => { /* ... */ })

  test('Grenzfall 1: Toggle direkt vor/nach hard_break wirft keinen Fehler', async ({ page }) => { /* Shift+Enter, Cursor davor/danach, Strg+U */ })
  test('Grenzfall 2: Selektion über Absatzgrenze hinweg unterstreicht beide Absätze vollständig', async ({ page }) => { /* ... */ })
  test('Grenzfall 3: Selektion über Tabellenzellgrenze hinweg (CellSelection)', async ({ page }) => { /* ... */ })
  test('Grenzfall 5 (korrigiert, siehe Abschnitt 3.6): Selektion von Text bis in einen benachbarten Bild-Block', async ({ page }) => { /* ... */ })
  test('Grenzfall 6: zwei schnell aufeinanderfolgende Strg+U → deterministisch "aus"', async ({ page }) => { /* ... */ })
  test('Grenzfall 7: Undo/Redo nach Formatierungssequenz fett→unterstrichen→unterstrichen-aus', async ({ page }) => { /* ... */ })
  test('Grenzfall 15: Fokus bleibt nach Toolbar-Klick im Editor erhalten', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Fokustest')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Unterstrichen').click()
    await expect(editor).toBeFocused()
  })
})

test.describe('Unterstrichen (einfach) — Rundreisen', () => {
  test('Rundreise 1: DOCX-Eigenrundreise über echte Bedienung', async ({ page }) => { /* ... */ })
  test('Rundreise 2: ODT-Eigenrundreise über echte Bedienung', async ({ page }) => { /* ... */ })
  test('Rundreise 3: DOCX → ODT Cross-Format (Upload 52449.docx, als ODT exportieren, reimportieren)', async ({ page }) => { /* ... */ })
  test('Rundreise 4: ODT → DOCX Cross-Format (Upload character-styles.odt, als DOCX exportieren, reimportieren)', async ({ page }) => { /* ... */ })
  test('Rundreise 5: doppelte Cross-Format-Rundreise DOCX→ODT→DOCX', async ({ page }) => { /* ... */ })

  test('Rundreise 6+7 DOCX: reale Word-Datei (52449.docx) importieren, Export enthält w:val="single" (String-Prüfung, unabhängig vom eigenen Reader)', async ({ page }) => {
    // Upload 52449.docx, assert editor.locator('u') vorhanden, Export, unzip,
    // expect(documentXml).toMatch(/<w:u\s+w:val="single"\s*\/>/) — NICHT über readDocx() geprüft.
  })
  test('Rundreise 6+7 ODT: reale LibreOffice/OpenOffice-Datei (character-styles.odt) importieren, Export enthält style:text-underline-style="solid"', async ({ page }) => { /* ... */ })

  test('Rundreise 8: kombiniert fett + farbig + unterstrichen bleibt über alle obigen Rundreisen erhalten', async ({ page }) => { /* ... */ })
})
```

**Erweiterung: `tests/e2e/selection-regression.spec.ts`** — neuer Testfall im
bestehenden `describe`-Block (Grenzfall 8/Testfall 8 „dauerhaft in der Suite verankert"
— deshalb hier, nicht in einer separaten, leicht vergessbaren Datei):

```ts
test('same regression with "Unterstrichen" instead of "Fett" (Grenzfall 8 / Testfall 8)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Unterstrichen').click()
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

## 6. Fixture-Inventar — tatsächlich verifizierte Werte (nicht nur Dateinamen)

Ermittelt durch tatsächliches Entpacken aller Dateien in
`tests/fixtures/external/{docx,odt}` und Auswertung der `w:u`- bzw.
`text-underline-style`-Attribute (Node-Skript mit `jszip`, vollständiger Lauf über den
gesamten Korpus, nicht nur Stichproben).

**DOCX** (`w:val`-Wert je Datei, `word/document.xml`):

| `w:val` | Dateien |
|---|---|
| `single` | `52449.docx`, `57312.docx`, `61991.docx`, `bug57031.docx`, `bug65649.docx`, `checkboxes.docx`, `delins.docx`, `form_footnotes.docx` |
| `none` | `55733.docx`, `61787.docx`, `bookmarks.docx`, `bug69628.docx` |

→ **kein** Fixture mit `double`/`wave`/`dotted`/`dash` im Korpus vorhanden — Grenzfall 9
muss über eine handgebaute XML-Datei getestet werden (Abschnitt 5.1).
→ **Empfohlener „echte Fremddatei"-Kandidat (Rundreise-Testfall 6/7): `52449.docx`** —
verifiziert: enthält echte, nicht-leere Lauftexte mit **eigenem** `<w:r><w:rPr><w:u
w:val="single"/></w:rPr><w:t>...</w:t></w:r>` (z. B. „Vedr", „Ans", „ættelse", „«Navn»"),
hängt also **nicht** von der in Abschnitt 3.2 gefundenen Formatvorlagen-Lücke ab. `52449.docx`,
`bookmarks.docx`, `headerPic.docx` und `bug65649.docx` enthalten zusätzlich
Formatvorlagen (`Title`, `heading 8`, …) mit stilvererbtem `<w:u w:val="single"/>` — diese
eignen sich, sobald der Fix aus Abschnitt 3.2 umgesetzt ist, zusätzlich als
Regressionstest, sind aber vor dem Fix als alleinige Testquelle ungeeignet.

**ODT** (`style:text-underline-style`-Wert je Datei, `content.xml`, vollständiger Korpus-Scan):

| Wert | Dateien (Auswahl, gesamt: 27× solid, 20× none, je 1× wave/dotted/ImSoInvalid) |
|---|---|
| `solid` (family=text, sauber über `<text:span>`) | `character-styles.odt`, `UNDERLINE.odt`, `fields.odt`, `TestStyleSelection.odt`, `navigationtest.odt`, u. a. |
| `solid` (family=paragraph, **Absatzstil-Ebene**, betrifft Abschnitt 3.1) | `hyperlinkSpaces.odt`, `underlineNone.odt` (Stil „P11") |
| `wave`/`dotted` (family=paragraph, **Absatzstil-Ebene ohne `<text:span>`**, betrifft Abschnitt 3.1) | `Tabelle1.odt` (Stile „P86"/„P92", direkt auf echtem Fließtext „Gomez bewege sich zu wenig") |
| `ImSoInvalid` (nicht-standardkonform) | `InvalidUnderlineAttribute.odt` |
| `none` | `UNDERLINE.odt`, `underlineNone.odt`, `InvalidUnderlineAttribute.odt`, u. a. |

→ **Empfohlener „echte Fremddatei"-Kandidat (Rundreise-Testfall 6/7):
`character-styles.odt`** — verifiziert: `<text:span style-name="T3">Lorem ipsum</text:span>`
mit `T3` = `style:family="text"`, `text-underline-style="solid"` + `fo:font-style="italic"`,
sauber über Span, **nicht** von Abschnitt 3.1/3.3 betroffen, importiert schon mit dem
heutigen Code korrekt (verifiziert). `UNDERLINE.odt` ist eine gute Zweitwahl (enthält
sowohl `solid` als auch `none`, ebenfalls über Spans).
→ **`Tabelle1.odt` ist der Primär-Regressionstest für den Fix aus Abschnitt 3.1**
(einziges Fixture mit echtem, mehrfach vorkommendem Fließtext auf reiner
Absatzstil-Ebene).
→ **`InvalidUnderlineAttribute.odt` ist der Primär-Test für Grenzfall 10/14.**
→ **Hyperlink-haltige Fixtures (`hyperlinkSpaces.odt`, `hyperlinkSpacesNoUnderline.odt`,
`hyperlink.odt`, `Hyperlink-AOO401.odt`, `hyperlink_destination.odt`) explizit NICHT als
Rundreise-Kandidaten verwenden**, solange der Bug aus Abschnitt 3.3 offen ist (siehe
dort).

---

## 7. Unabhängige Parser-Validierung (Rundreise-Testfall 7 / DoD Punkt 2)

Dieses Repo ist reines TypeScript/Vite ohne Python-Toolchain. Zweistufiger Ansatz:

1. **Automatisiert, im bestehenden Stack:** Die Playwright-Tests aus Abschnitt 5.2
   prüfen den exportierten XML-String direkt per Regex, **ohne** `readDocx`/`readOdt`
   zu verwenden — dasselbe Muster, das `docx.spec.ts`/`odt.spec.ts` bereits für
   `<w:b/>`/`font-weight="bold"` einsetzen. Für Unterstrichen:
   `expect(documentXml).toMatch(/<w:u\s+w:val="single"\s*\/>/)` bzw.
   `expect(contentXml).toContain('style:text-underline-style="solid"')`.
2. **Manuell, einmalig vor Status-Wechsel auf „verifiziert" (DoD Punkt 2):** Einmalig
   außerhalb dieses Repos eine exportierte Test-DOCX/-ODT mit `python-docx`
   (`pip install python-docx`) bzw. einem ODF-Validator (LibreOffice selbst reicht)
   öffnen und das Ergebnis als Vermerk in `unterstrichen-einfach-req.md` oder einer
   Nachfolgedatei festhalten. Bewusst **kein** Bestandteil der automatisierten
   CI-Suite (keine Python-Laufzeit in CI einführen, nur für einen Statusnachweis).

---

## 8. Bewusst nicht geänderter Code (und warum)

- **`schema.ts` Mark-Definition** — bereits korrekt, deckt genau „einfach"
  unterstrichen ab, keine Varianten-Attribute, keine Verwechslungsgefahr mit
  `unterstrichen-doppelt` auf Datenebene.
- **`Toolbar.tsx`** — `onMouseDown` + `preventDefault()` bereits vorhanden (Grenzfall 15
  bereits im Code erfüllt, nur Test fehlt), `aria-pressed` bereits korrekt reaktiv über
  `markType.isInSet($from.marks())`.
- **`WordEditor.tsx`** — `reconcileSelectionOnClick` ist bereits generisch für alle
  Marks (nicht bold-spezifisch), Grenzfall 8 ist damit bereits durch bestehenden Code
  abgedeckt, es fehlt nur der Test.
- **`docx/writer.ts`/`odt/writer.ts`** — Verhalten zu Anforderungsabschnitt 3.8 (keine
  explizite Linienfarbe, Linie folgt Textfarbe) ist bereits korrekt umgesetzt. Die
  Writer erzeugen selbst **nie** Absatzstil-Ebene-Formatierung oder `<text:a>` —
  Abschnitt 3.1/3.3 sind reine **Import**-Lücken für Fremddateien, betreffen die
  Eigenrundreise (Rundreise-Testfall 1/2) nicht.
- **`prosemirror-commands` `toggleMark`** — Verhalten bei gemischter Selektion
  (Anforderungsabschnitt 3.4), bei leerer Selektion/`storedMarks` (Abschnitt 3.2), bei
  mehreren `ranges` einer `CellSelection` (Grenzfall 3) ist Fremdbibliotheks-
  Standardverhalten, korrekt und muss nur verifiziert, nicht implementiert werden.

---

## 9. Offene Abhängigkeiten (nur dokumentieren, kein Code jetzt)

- **`formatierung-loeschen`** (Backlog-Status „fehlt"): muss künftig
  `wordSchema.marks.underline` mit in ihre Clear-Logik aufnehmen (Anforderung 3.6).
- **Hyperlinks** (Backlog-Status „fehlt"): zwei offene Fragen für die künftige
  Umsetzung — (a) ob Link-Standard-Unterstreichung dieselbe `underline`-Mark wiederverwendet
  (Interferenzrisiko mit dem „U"-Button) oder rein visuell via CSS/`toDOM` erfolgt
  (Anforderung 3.7); (b) der in Abschnitt 3.3 dieses Plans gefundene Bug (`<text:a>`
  wird beim ODT-Import komplett ignoriert, Textverlust) **muss** bei Umsetzung von
  Hyperlinks gefixt werden — hier vermerkt, damit es nicht übersehen wird
  (`specs/hyperlink-einfuegen-req.md` sollte diesen Fund aufnehmen).
- **`unterstrichen-doppelt`**: sobald umgesetzt, muss entschieden werden, ob eine neue
  Mark (`underlineDouble`) oder ein `style`-Attribut auf der bestehenden `underline`-Mark
  verwendet wird. Sobald das feststeht, müssten Reader/Writer aus Abschnitt 3.1/3.2
  dieses Plans ohnehin erneut angefasst werden, um `wave`/`double`/`dotted`/`dash`
  differenziert zu behandeln statt sie (wie nach dem hier vorgeschlagenen Fix weiterhin
  bewusst) auf „einfach" zu vereinfachen.
- **`w:val="0"`/`"false"`-Schwäche bei `<w:b>`/`<w:i>`/`<w:strike>`** (Abschnitt 2,
  gefunden als Nebenprodukt der Analyse für Abschnitt 3.2): betrifft
  `fett-req.md`/`kursiv-req.md`/`durchgestrichen-req.md`, nicht diese Anforderung — hier
  nur vermerkt, damit es bei der Bearbeitung dieser Nachbar-Anforderungen nicht
  übersehen wird.
- **`FEATURE-SPEC-DOCX-ODT.md` fehlt im Repo** (Abschnitt 3.7) — zu klären, ob die
  Datei nachgeliefert werden muss oder die Referenzen in den `-req.md`-Dateien angepasst
  werden sollten. Keine Code-Konsequenz.

---

## 10. Abnahme-Mapping (Anforderung Abschnitt 6/8 → Testdatei)

| Anforderung | Abgedeckt durch |
|---|---|
| Testfälle 1–9 (Abschnitt 6) | `tests/e2e/underline.spec.ts`, describe „Toolbar & Tastatur" |
| Testfall 8 / Grenzfall 8 (Selection-Sync-Regression) | `tests/e2e/selection-regression.spec.ts`, neuer Test |
| Rundreise-Testfälle 1–8 (Abschnitt 5) | `tests/e2e/underline.spec.ts`, describe „Rundreisen" |
| Grenzfälle 1–8, 12, 13, 15 | `tests/e2e/underline.spec.ts`, je ein dedizierter Test |
| Grenzfall 9 (DOCX `w:val` Fremdwerte) | `src/formats/docx/__tests__/underline.test.ts` |
| Grenzfall 10 (ODT `text-underline-style` Fremdwerte) | `src/formats/odt/__tests__/underline.test.ts` (inkl. `InvalidUnderlineAttribute.odt`) |
| Grenzfall 11 (Stilnamen-Kollision) | `src/formats/odt/__tests__/roundtrip.test.ts`, neuer Test + Fix Abschnitt 3.5 |
| Grenzfall 14 (Groß-/Kleinschreibung) | beide `underline.test.ts`, `it.each` + Fix Abschnitt 3.4 |
| **Neu gefunden — Absatzstil-Ebene ignoriert (Abschnitt 3.1/3.2)** | `Tabelle1.odt`-Test + handgebaute Minimalfälle in beiden `underline.test.ts`, Fix Abschnitt 3.1/3.2/4.1/4.2 |
| **Neu gefunden — `<text:a>` wird komplett ignoriert (Abschnitt 3.3)** | dokumentiert, **nicht** hier gefixt — Vermerk in Abschnitt 9, Ticket bei `hyperlink-einfuegen-req.md` |
| DoD Punkt 2 (unabhängiger Parser, reale Fremddatei) | Abschnitt 7 (automatisiert via Regex + einmaliger manueller Schritt), reale Kandidaten: `52449.docx` (DOCX), `character-styles.odt` (ODT) |
| DoD Punkt 3 (Regressionstest dauerhaft verankert) | Test liegt in `selection-regression.spec.ts`, nicht in leicht vergessbarer Extra-Datei |
| DoD Punkt 4 (Fallback-Verhalten dokumentiert) | Abschnitt 6 dieses Plans + Testkommentare in `underline.test.ts` |
| DoD Punkt 5 (kein Fund ohne Vermerk) | Abschnitt 2 (Codeaudit) + Abschnitt 3.1–3.3 (neue Bugs) + Abschnitt 9 (offene Abhängigkeiten) |
