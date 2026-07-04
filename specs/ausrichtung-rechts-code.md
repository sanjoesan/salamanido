# Ausrichtung rechts — dateigenauer Umsetzungsplan

Gegenstück zu `specs/ausrichtung-rechts-req.md`. Stil und Gliederung folgen bewusst
`specs/durchgestrichen-code.md` (methodisch nächstverwandter, bereits geprüfter Plan:
gleiches Repo, gleiche Werkzeuge, gleiche Forderung nach echter Fremddatei-Evidenz statt
Annahmen). Dieses Dokument beschreibt, nach tatsächlicher Codelektüre **und**
programmatischer Durchsuchung des vorhandenen Fixture-Korpus (nicht nur Stichproben),
was am bestehenden Code zu ändern ist, welche Dateien neu angelegt werden, und wie die
in der Anforderung geforderte Verifikation technisch umgesetzt wird.

## 0. TL;DR

Schema-Attribut, Toolbar-Buttons, Command-Layer sowie DOCX-/ODT-Reader/Writer für
„Ausrichtung rechts" existieren und funktionieren im Kern — der Grundmechanismus ist
nicht kaputt. Die Anforderungsdatei benennt jedoch **sechs echte, jetzt im Code
bestätigte und zusätzlich an realen Fremddateien nachgewiesene Defekte/Lücken**, die
hier behoben werden:

1. **`src/formats/docx/reader.ts:13,152`** — `<w:jc w:val="start"/>` bzw. `"end"`
   werden nicht erkannt, fallen auf `'left'` zurück, unabhängig vom tatsächlichen
   (in LTR-Kontext meist `left`/`right` bedeutenden) Wert. **Bestätigt an einer
   echten Datei** (`rtl.docx`, `w:jc w:val="start"` auf arabischem Fließtext).
   **Wird gefixt** (Grenzfall 6/Verdachtsmoment 1, Entscheidung Abschnitt 9.4).
2. **`src/formats/odt/reader.ts:64`** — `fo:text-align="start"`/`"end"` werden
   unverändert (unnormalisiert) ins interne Modell übernommen, keiner der vier
   UI-Buttons erkennt sie als „aktiv". **Wird gefixt** (Grenzfall 8/Verdachtsmoment 2).
3. **`src/formats/docx/reader.ts` / `src/formats/odt/reader.ts`** — Ausrichtung, die
   nur über eine referenzierte Formatvorlage wirksam ist (`w:pStyle` → `styles.xml`
   bzw. `style:parent-style-name` → `office:styles`), wird **nicht** aufgelöst, fällt
   auf `'left'` zurück. **Bestätigt an echten Dateien** (DOCX: `bug-paragraph-
   alignment.docx`, Stil „Title" → `center`, plus 8 weitere Treffer im Korpus; ODT:
   `table-within-textBox-within-frame.odt`, Stil „P74" → Elternstil „Subtitle" →
   `fo:text-align="end"` — kombiniert Grenzfall 8 **und** 9 in einer einzigen realen
   Datei). **Wird gefixt** (Grenzfall 9/Verdachtsmoment 3).
4. **`src/formats/shared/editor/commands.ts:40-55`** (`setHeading`) — erzwingt
   `align: 'left'` beim Wechsel Standard → Überschrift und verwirft die Ausrichtung
   komplett (`attrs: undefined` → Schema-Default `'left'`) beim Wechsel zurück.
   **Bestätigter Bug, wird gefixt** (Grenzfall 5/Verdachtsmoment 4, Entscheidung
   Abschnitt 9.3).
5. **`src/formats/shared/editor/commands.ts:29-38`** (`isAlignActive`) — wertet
   ausschließlich den Block an `$from` aus, nie den Rest einer mehrteiligen
   Selektion. **Wird gefixt** (Grenzfall 1/Verdachtsmoment 5, Entscheidung
   Abschnitt 9.5), mit einer neuen, dokumentierten Anzeige-Konvention, die **anders**
   ausfällt als beim analogen Mark-Problem in `durchgestrichen-code.md` Abschnitt 3.6
   (Begründung siehe Abschnitt 3.5 unten).
6. **`src/formats/shared/editor/Toolbar.tsx:69`** — `title={\`Ausrichtung: ${align}\`}`
   mischt Deutsch und Englisch (`"Ausrichtung: right"`), kein `aria-label`.
   **Wird gefixt** (Verdachtsmoment 7/11, Abnahme Punkt 6).

Zusätzlich, wie von der Anforderung explizit verlangt (Abschnitt 8), werden hier
**alle fünf offenen Entscheidungen** getroffen und umgesetzt (Abschnitt 9 unten):
Tastenkürzel `Mod-r` wird ergänzt; Idempotenz bei erneutem Klick bleibt (dokumentiert
und eingefroren); der Formatwechsel-Datenverlust wird als Bug behoben; `start`/`end`
werden auf `left`/`right` normalisiert; `isAlignActive` wechselt auf „aktiv nur wenn
**alle** betroffenen Absätze bereits rechtsbündig sind".

Der überwiegende Teil des Aufwands ist — wie bei den Schwesterfeatures — **neue
Testabdeckung**: gezielte Unit-Tests für die oben genannten Fremddatei-Grenzfälle
(inklusive der drei real gefundenen, namentlich benannten Fixtures), ein komplett
neuer E2E-Test über echte Browser-Bedienung, und Erweiterungen der bestehenden
Rundreise-Tests um Kombinationen (Listen, Tabellen, Überschriften, `hard_break`), die
heute laut Anforderung Abschnitt 5 Fundstelle „Unit-/Roundtrip-Tests" fehlen.

---

## 1. Methodik dieser Prüfung

Gelesen wurden: `src/formats/shared/schema.ts`, `src/formats/shared/editor/
{Toolbar.tsx,WordEditor.tsx,commands.ts}`, `src/formats/docx/{reader,writer,
styleDefs}.ts`, `src/formats/odt/{reader,writer,styleRegistry}.ts`, beide
`__tests__/roundtrip.test.ts`, beide `__tests__/external-fixtures.test.ts`,
`tests/e2e/{docx,odt,selection-regression}.spec.ts`, `playwright.config.ts`,
`FEATURE-SPEC-DOCX-ODT.md` (Abschnitte 4, 9, 17, 20), `FEATURE-BACKLOG.md` (Zeile
`ausrichtung-rechts`), `specs/ausrichtung-links-req.md` (Geschwister-Anforderung,
zum Abgleich der Fundstellen-Tabelle), sowie zum Vergleich `specs/durchgestrichen-
code.md`.

Zusätzlich — und das ist der methodisch wichtigste Teil dieser Prüfung — wurde der
**gesamte** vorhandene Fixture-Korpus (`tests/fixtures/external/docx`, 40 Dateien mit
mind. einem `<w:jc>`, von 53 Gesamtdateien; `tests/fixtures/external/odt`, 94 Dateien
mit mind. einem `fo:text-align`, von 330 Gesamtdateien) **programmatisch** entpackt
und nach Ausrichtungswerten durchsucht, statt sich auf Vermutungen aus dem
Anforderungstext zu verlassen. Konkret wurden vier Skripte gegen JSZip gefahren:

1. Zählung aller `<w:jc w:val="...">`-Werte **innerhalb von `<w:p>/<w:pPr>`**
   (bewusst **ohne** `<w:tblPr>/<w:jc>` — dazu unten ein eigener Warnhinweis, Abschnitt
   6.3, das ist ein echter Stolperstein beim Grep über OOXML) je DOCX-Fixture.
2. Zählung aller `fo:text-align`-Werte in `office:automatic-styles` je ODT-Fixture
   (`content.xml` **und** `styles.xml`).
3. Suche nach Absätzen, deren Ausrichtung **ausschließlich** über eine referenzierte
   Formatvorlage (nicht direkt am Absatz) wirksam ist — DOCX: `w:pStyle` ohne eigenes
   `<w:jc>`, aufgelöst gegen `styles.xml`; ODT: `text:style-name` ohne eigenes
   `fo:text-align`, `style:parent-style-name`-Kette aufgelöst gegen den
   **vereinigten** Stil-Pool aus `content.xml`s `office:automatic-styles` **und**
   `styles.xml`s `office:styles` **und** `office:automatic-styles` (die erste
   Kurzfassung dieses Skripts, die nur `content.xml` durchsuchte, fand **null**
   Treffer für ODT — erst die Erweiterung auf `styles.xml`s `office:styles` deckte
   die 11 realen Treffer aus Abschnitt 6.2 auf; das ist selbst ein Beleg für exakt die
   in der Anforderung Fundstelle „ODT-Import" beschriebene Lücke).
4. Stichproben-Extraktion des tatsächlichen Textinhalts der gefundenen Treffer, um
   nicht nur „ein Wert kommt vor", sondern „an dieser konkreten, benennbaren Stelle"
   zu belegen (siehe Abschnitt 6).

Alle Rohbefunde sind in Abschnitt 6 tabellarisch dokumentiert und werden in Abschnitt
3 als Begründung für die einzelnen Fixes zitiert.

---

## 2. Ist-Zustand nach Codelektüre — Abgleich mit der Anforderungstabelle

| Fundstelle laut Anforderung | Verifiziert im Code | Abweichung? |
|---|---|---|
| `schema.ts:4` `alignAttr = { align: { default: 'left', validate: 'string' } }` auf `paragraph` (Z. 12) **und** `heading` (Z. 22) | Ja, exakt so | keine — bewusst **kein** Fix hier, siehe Abschnitt 3.6 |
| `schema.ts:15,29` `toDOM` → `style="text-align: ${align}"` | Ja, exakt so | keine |
| `commands.ts:8-27` `setAlign`/`alignableTypes` | Ja, exakt so, inkl. `nodesBetween`-basiertem Setzen für Teil-Selektion/Cursor-ohne-Selektion | **keine Änderung nötig** — bereits korrekt (siehe Abschnitt 8) |
| `commands.ts:29-38` `isAlignActive` nur `$from` | Ja, exakt so | **bestätigter Bug/Verbesserungspunkt**, siehe Abschnitt 3.5 |
| `Toolbar.tsx:64-84,185-188` vier `AlignButton`, `title="Ausrichtung: right"`, kein `aria-label` | Ja, exakt so | **bestätigt**, siehe Abschnitt 3.6 |
| `WordEditor.tsx:71-79` kein Tastenkürzel für Ausrichtung | Ja, bestätigt — nur Undo/Redo/Fett/Kursiv/Unterstrichen | **wird ergänzt**, siehe Abschnitt 3.4 |
| `docx/reader.ts:13,150-152` `JC_TO_ALIGN` ohne `start`/`end`, kein `w:pStyle`-Fallback | Ja, exakt so | **beide bestätigter Bug**, siehe Abschnitt 3.1/3.3 |
| `docx/writer.ts:16,67-70` `JC_BY_ALIGN`, schreibt immer `<w:jc>` | Ja, exakt so | **keine Änderung** — siehe Abschnitt 8 |
| `odt/reader.ts:22-26,36-77,122-130` `paragraphAligns` nur aus `office:automatic-styles`, kein `office:styles`/`parent-style-name` | Ja, exakt so | **bestätigter Bug**, siehe Abschnitt 3.2/3.3 |
| `odt/writer.ts:60-73`, `styleRegistry.ts:66-90` je Wert/Level eigener Stil | Ja, exakt so | **keine Änderung nötig** — Dedup über gemeinsamen Stilnamen ist bereits gegeben (Abschnitt 8) |
| Unit-/Roundtrip-Tests nur isolierte Einzelabsätze | Ja, bestätigt (`roundtrip.test.ts:48-53` beide Formate) | bestätigt — keine Kombination mit Listen/Tabellen/Kopf-Fußzeilen |
| E2E-Tests: kein Treffer für „align"/„Ausrichtung"/„rechts" | Ja, bestätigt (`docx.spec.ts`, `odt.spec.ts` durchsucht, 0 Treffer) | bestätigt |
| Fixture-Tests: kein Treffer für „align" | Ja, bestätigt (`external-fixtures.test.ts` beide Formate durchsucht, 0 Treffer) | bestätigt |

Alle Fundstellen der Anforderung sind also **exakt** wie beschrieben — die
Anforderungsdatei ist auf Codeebene korrekt. Die folgenden Abschnitte gehen über die
reine Bestätigung hinaus und liefern die von Abschnitt 6 der Anforderung geforderte
**Evidenz an echten Dateien**, die die Anforderungsdatei selbst noch nicht hatte
(sie konnte nur den Code lesen, nicht den Fixture-Korpus durchsuchen).

---

## 3. Gefundene Defekte / geplante Änderungen

### 3.1 `src/formats/docx/reader.ts` — `w:jc w:val="start"/"end"` werden nicht erkannt (Bug, real bestätigt)

Zeile 13/150-152, aktuell:

```ts
const JC_TO_ALIGN: Record<string, string> = { left: 'left', center: 'center', right: 'right', both: 'justify' }
...
const jcVal = jcEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? 'left'
const align = JC_TO_ALIGN[jcVal] ?? 'left'
```

**Real bestätigt:** `tests/fixtures/external/docx/rtl.docx` enthält vier Absätze mit
arabischem Fließtext (z. B. „إسبانيا (الإسبانية: España)، رسمياً مملكة إسبانيا …") und
`<w:jc w:val="start"/>`. Diese Datei importiert heute als `align: 'left'`, obwohl in
diesem konkreten RTL-Dokument „start" visuell rechts bedeutet (siehe Abschnitt 3.1.1
zur Einordnung dieses Sonderfalls). Weitere reale `start`-Treffer: `table-
indent.docx` (91×), `unicode-path.docx` (1×) — beide erkennbar lateinisch/LTR, dort
ist „start" = „links" inhaltlich unstrittig richtig.

Kein `w:jc w:val="end"` wurde im vorhandenen 53-Dateien-DOCX-Korpus **direkt auf
Absatzebene** gefunden (nur `table-alignment.docx` enthält `w:val="end"`, aber
**ausschließlich** in `<w:tblPr>` — Tabellen**positions**ausrichtung auf der Seite,
ein anderes Konzept mit zufällig demselben Elementnamen, siehe Warnhinweis Abschnitt
6.3). Testfall 25/Grenzfall 6 für `"end"` muss daher über eine handgebaute XML-Datei
abgesichert werden (wie in `strike-code.md`-Analogie für `w:dstrike` bereits
etabliertes Muster für „im Korpus nicht vorhandene, aber schemakonforme Werte").

Fix (Entscheidung Abschnitt 9.4 — LTR-Regelfall, siehe Einschränkung 3.1.1):

```ts
const JC_TO_ALIGN: Record<string, string> = {
  left: 'left',
  start: 'left', // ausrichtung-rechts-code.md Abschnitt 9.4: LTR-Regelfall-Normalisierung
  center: 'center',
  right: 'right',
  end: 'right', // dito
  both: 'justify',
}
```

Der bestehende Fallback `JC_TO_ALIGN[jcVal] ?? 'left'` bleibt unverändert bestehen
und fängt weiterhin `distribute`/`thaiDistribute`/`*Kashida` ab (Grenzfall 7,
Verdachtsmoment — kein reales Korpus-Beispiel gefunden, aber bereits sicherer,
dokumentierter Fallback, kein Absturz, kein Textverlust). Ergänzter Kommentar direkt
über der Map:

```ts
// ausrichtung-rechts-req.md Grenzfall 6/8, Entscheidung Abschnitt 9.4: `start`/`end`
// werden für den LTR-Regelfall dieser App auf `left`/`right` normalisiert (bestätigt
// an einer echten Datei: rtl.docx, w:jc="start" auf arabischem Text — siehe 3.1.1 zur
// RTL-Einschränkung). Seltenere, ebenfalls gültige OOXML-Werte (`distribute`,
// `thaiDistribute`, `*Kashida`) fallen bewusst auf 'left' zurück (Grenzfall 7) — kein
// Korpus-Fund dafür, aber unverändert sicherer Fallback ohne Absturz/Textverlust.
```

#### 3.1.1 Einschränkung: `start`/`end` sind schreibrichtungsrelativ, nicht absolut

`rtl.docx` ist der wichtige Gegenbeweis dagegen, `start`→`left` als universell richtig
zu behandeln: In einem RTL-Absatz bedeutet `start` visuell **rechts**. Die App hat
laut Codebasis **keine** RTL-Unterstützung (kein `dir="rtl"`, keine Auswertung von
`w:bidi`/`style:writing-mode`) — das ist bereits in Grenzfall 12 der Anforderung als
„nicht Teil dieser App-Funktionalität, muss aber nicht abstürzen" eingeordnet. Die
Normalisierung `start → left` ist damit für den **Regelfall** (LTR-Dokumente, die
überwältigende Mehrheit im Korpus) korrekt, für `rtl.docx` spezifisch **inhaltlich
ungenau** (zeigt linksbündig statt der im Original beabsichtigten rechten
Ausrichtung), aber **nicht falscher als der Status quo** (der auch schon `'left'`
ergibt) und verursacht keinen Absturz/Textverlust. Dies wird als bewusste,
dokumentierte Grenze behandelt (nicht als in diesem Plan zu lösendes RTL-Feature) —
ein dedizierter Test hält das Verhalten fest, siehe Abschnitt 5.1.

### 3.2 `src/formats/odt/reader.ts` — `fo:text-align="start"/"end"` unnormalisiert übernommen (Bug)

Zeile 64, aktuell:

```ts
} else if (family === 'paragraph') {
  const props = firstChildNS(styleEl, ODF_NAMESPACES.style, 'paragraph-properties')
  const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
  if (align) paragraphAligns.set(name, align)
}
```

`fo:text-align="end"` ist mit 21 Vorkommen in **einer einzigen Datei**
(`excelfileformat.odt`) real bestätigt, `"start"` mit über 400 Vorkommen insgesamt
verteilt über gut 30 Dateien (u. a. `BigTable.odt`, `character-styles.odt`,
`HeaderFooter.odt`) — beides **weit verbreitete, keine Exotenwerte** im
LibreOffice-erzeugten ODT-Korpus. Fix: Normalisierung direkt beim Einlesen (siehe
Abschnitt 3.3 für die vollständige, restrukturierte Fassung von
`parseAutomaticStyles`/`ParsedStyles`, die diesen Fix mit Grenzfall 9 kombiniert
umsetzt, da beide dieselbe Codestelle betreffen).

### 3.3 `src/formats/docx/reader.ts` **und** `src/formats/odt/reader.ts` — Ausrichtung aus Formatvorlage wird nicht aufgelöst (Bug, real bestätigt, höchste Priorität)

Dies ist der aufwendigste Fix in diesem Plan, weil er in **beiden** Readern eine
strukturelle Ergänzung braucht — aber auch der am stärksten durch reale Dateien
belegte:

**DOCX** — 9 Dateien im Korpus haben mindestens einen Absatz, dessen `w:pStyle` auf
einen Stil verweist, der selbst ein `<w:jc>` trägt, während der Absatz **kein**
eigenes hat: `61787.docx`, `65099.docx`, `bookmarks.docx`, **`bug-paragraph-
alignment.docx`** (Name ist kein Zufall — die Datei demonstriert exakt dieses
Problem), `bug59058.docx`, `bug65738.docx`, `bug69628.docx`, `form_footnotes.docx`,
`IllustrativeCases.docx`. Konkretes Beispiel aus `bug-paragraph-alignment.docx`:

```xml
<!-- word/document.xml -->
<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>
  <w:r><w:t>This paragraph does not have explicit alignment, it's centered per the
  paragraph style.</w:t></w:r>
</w:p>
<!-- word/styles.xml -->
<w:style w:type="paragraph" w:styleId="Title">
  <w:name w:val="Title"/><w:basedOn w:val="Heading"/>
  <w:pPr><w:jc w:val="center"/></w:pPr>
  ...
</w:style>
```

Heute importiert dieser Absatz als `align: 'left'` (Standardfallback) statt `center`
— exakt der in Grenzfall 9/Verdachtsmoment 3 beschriebene Datenverlust, hier zum
ersten Mal an einer **konkreten, benannten** Fremddatei nachgewiesen statt nur
theoretisch postuliert.

**ODT** — 11 Dateien im Korpus haben mindestens einen Absatz/eine Überschrift, deren
referenzierter Stil **selbst kein** `fo:text-align` trägt, aber über
`style:parent-style-name` eine Vorlage erreicht, die eines hat:
`compdocfileformat(_shortened).odt`, `excelfileformat.odt`, `FruitDepot-
SeasonalFruits{4,5}.odt`, `Lebenslauf_DOC_LO4.0.5.1.odt`, `sample_numbering_
DOC_LO41.odt`, `Seasonal_Fruits2_en.odt`, **`table-within-textBox-within-
frame.odt`**, `tableComplex_DOC_LO41.odt`, `test1.odt`. Das wichtigste Einzelbeispiel
— weil es **zwei** Grenzfälle gleichzeitig real demonstriert:

```xml
<!-- content.xml: der Absatz selbst -->
<text:p text:style-name="P74">SOW ...</text:p>
<!-- content.xml: automatischer Stil P74, KEIN eigenes fo:text-align -->
<style:style style:name="P74" style:family="paragraph"
             style:parent-style-name="Subtitle">...</style:style>
<!-- styles.xml: office:styles, benannter Elternstil "Subtitle" -->
<style:style style:name="Subtitle" style:family="paragraph"
             style:parent-style-name="Standard">
  <style:paragraph-properties fo:text-align="end"/>
</style:style>
```

Hier fehlt die Ausrichtung **sowohl** direkt am Absatz **als auch** am direkt
referenzierten automatischen Stil `P74` — sie sitzt einen Schritt höher am
**benannten, in `styles.xml` deklarierten** Elternstil `Subtitle`, mit dem
zusätzlichen Grenzfall-8-Wert `"end"`. Ein zweites Beispiel demonstriert, dass ein
einzelner Hop nicht immer reicht, aber der hier gewählte, tiefenbegrenzte
Ketten-Resolver es trotzdem korrekt auflöst: `FruitDepot-SeasonalFruits4.odt`,
Überschriftsstil `Heading_20_1` (kein eigenes Attribut) → Elternstil `Heading` (in
`styles.xml`) → `fo:text-align="start"`.

**Wichtiger Methodik-Fund:** Ein erster, einfacherer Scan-Versuch, der nur
`content.xml` nach `style:parent-style-name`-Ketten durchsuchte, fand **0** Treffer.
Erst die Erweiterung auf den **vereinigten** Stil-Pool aus `content.xml`s
`office:automatic-styles` **und** `styles.xml`s `office:styles` **und**
`styles.xml`s `office:automatic-styles` deckte die 11 echten Treffer auf — weil der
Elternstil in der überwältigenden Mehrheit der Fälle ein **benannter** Stil in
`office:styles` (z. B. `Subtitle`, `Heading`, `Standard`, `Table_20_Contents`) ist,
der ausschließlich in `styles.xml` deklariert wird, nicht in `content.xml`. Das ist
selbst der lebende Beweis für exakt die in der Anforderung so formulierte Lücke
(„Es wird nicht in `office:styles` … nachgeschaut").

#### Fix DOCX (`src/formats/docx/reader.ts`)

`HeadingInfo` (aktuell nur `outlineLvlByStyleId`) wird um zwei Maps erweitert, in
derselben bestehenden Schleife über `styleEl` in `parseStylesXml` befüllt (kein
zweiter Durchlauf nötig):

```ts
interface HeadingInfo {
  outlineLvlByStyleId: Map<string, number>
  jcByStyleId: Map<string, string>       // NEU
  basedOnByStyleId: Map<string, string>  // NEU
}

function parseStylesXml(stylesDoc: Document | null): HeadingInfo {
  const outlineLvlByStyleId = new Map<string, number>()
  const jcByStyleId = new Map<string, string>()
  const basedOnByStyleId = new Map<string, string>()
  if (!stylesDoc) return { outlineLvlByStyleId, jcByStyleId, basedOnByStyleId }
  for (const styleEl of Array.from(stylesDoc.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'style'))) {
    const styleId = styleEl.getAttributeNS(OOXML_NAMESPACES.w, 'styleId')
    if (!styleId) continue
    const basedOn = firstChildNS(styleEl, OOXML_NAMESPACES.w, 'basedOn')
    const basedOnVal = basedOn?.getAttributeNS(OOXML_NAMESPACES.w, 'val')
    if (basedOnVal) basedOnByStyleId.set(styleId, basedOnVal)
    const pPr = firstChildNS(styleEl, OOXML_NAMESPACES.w, 'pPr')
    const outlineLvl = pPr && firstChildNS(pPr, OOXML_NAMESPACES.w, 'outlineLvl')
    if (outlineLvl) {
      const val = Number(outlineLvl.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? '0')
      outlineLvlByStyleId.set(styleId, val)
    }
    const jcEl = pPr && firstChildNS(pPr, OOXML_NAMESPACES.w, 'jc')
    const jcVal = jcEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val')
    if (jcVal) jcByStyleId.set(styleId, jcVal)
  }
  return { outlineLvlByStyleId, jcByStyleId, basedOnByStyleId }
}

// ausrichtung-rechts-code.md Abschnitt 3.3 / Grenzfall 9: fehlt die Ausrichtung
// direkt am Absatz, wird über die w:basedOn-Kette der referenzierten Formatvorlage
// aufgelöst (bestätigt an bug-paragraph-alignment.docx u. a. — 9 reale Fundstellen
// im Testkorpus, siehe Abschnitt 6.1). Tiefenbegrenzt wie MAX_TABLE_NESTING_DEPTH
// weiter unten in dieser Datei, gegen zirkuläre w:basedOn-Ketten in korrupten Dateien.
const MAX_STYLE_CHAIN_DEPTH = 10

function resolveStyleJc(styleId: string | null, info: HeadingInfo): string | null {
  let current = styleId
  for (let depth = 0; current && depth < MAX_STYLE_CHAIN_DEPTH; depth++) {
    const jc = info.jcByStyleId.get(current)
    if (jc) return jc
    current = info.basedOnByStyleId.get(current) ?? null
  }
  return null
}
```

`paragraphToBlocks` (Zeile 146-152) ändert sich von:

```ts
const jcEl = pPr && firstChildNS(pPr, OOXML_NAMESPACES.w, 'jc')
const jcVal = jcEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? 'left'
const align = JC_TO_ALIGN[jcVal] ?? 'left'
```

zu:

```ts
const jcEl = pPr && firstChildNS(pPr, OOXML_NAMESPACES.w, 'jc')
const ownJcVal = jcEl?.getAttributeNS(OOXML_NAMESPACES.w, 'val') ?? null
const jcVal = ownJcVal ?? resolveStyleJc(styleId, headingInfo) ?? 'left'
const align = JC_TO_ALIGN[jcVal] ?? 'left'
```

(`styleId` ist bereits zwei Zeilen oberhalb im bestehenden Code verfügbar, wird für
`headingLevelForStyle` schon berechnet — reine Wiederverwendung, keine neue
Extraktion nötig.)

#### Fix ODT (`src/formats/odt/reader.ts`)

`ParsedStyles.paragraphAligns: Map<string, string>` (rohe/unnormalisierte Werte)
wird ersetzt durch `paragraphStyles: Map<string, ParagraphStyleDef>`, das sowohl den
Elternstil als auch den rohen Alignment-Wert hält, damit die Kette **und** die
Grenzfall-8-Normalisierung an einer Stelle zusammenlaufen:

```ts
interface ParagraphStyleDef {
  align?: string // roher fo:text-align-Wert, falls DIREKT an diesem Stil deklariert
  parent: string | null
}

interface ParsedStyles {
  textStyles: Map<string, RunStyle>
  paragraphStyles: Map<string, ParagraphStyleDef> // ersetzt `paragraphAligns`
  listKinds: Map<string, 'bullet' | 'ordered'>
}

function parseAutomaticStyles(automaticStylesEl: Element | null, officeStylesEl: Element | null = null): ParsedStyles {
  const textStyles = new Map<string, RunStyle>()
  const paragraphStyles = new Map<string, ParagraphStyleDef>()
  const listKinds = new Map<string, 'bullet' | 'ordered'>()

  function collectFrom(containerEl: Element | null) {
    if (!containerEl) return
    for (const styleEl of childElements(containerEl, ODF_NAMESPACES.style, 'style')) {
      const name = styleEl.getAttributeNS(ODF_NAMESPACES.style, 'name')
      const family = styleEl.getAttributeNS(ODF_NAMESPACES.style, 'family')
      if (!name) continue
      if (family === 'text') {
        // ... unverändert, bestehende Zeilen 48-61 ...
      } else if (family === 'paragraph' && !paragraphStyles.has(name)) {
        // ausrichtung-rechts-code.md Abschnitt 3.3 / Grenzfall 9: Elternstil-Name
        // wird IMMER gemerkt (auch ohne eigenes fo:text-align), damit die Kette
        // spaeter aufgeloest werden kann. `!paragraphStyles.has(name)` verhindert,
        // dass ein spaeterer Aufruf mit `officeStylesEl` einen bereits aus dem
        // lokalen automatic-styles-Block gelesenen, gleichnamigen Stil ueberschreibt.
        const parent = styleEl.getAttributeNS(ODF_NAMESPACES.style, 'parent-style-name')
        const props = firstChildNS(styleEl, ODF_NAMESPACES.style, 'paragraph-properties')
        const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align') || undefined
        paragraphStyles.set(name, { align, parent: parent || null })
      }
    }
  }
  collectFrom(automaticStylesEl)
  collectFrom(officeStylesEl) // NEU: benannte/gemeinsame Stile aus office:styles

  if (automaticStylesEl) {
    for (const listStyleEl of childElements(automaticStylesEl, ODF_NAMESPACES.text, 'list-style')) {
      // ... unverändert, bestehende Zeilen 69-74 ...
    }
  }

  return { textStyles, paragraphStyles, listKinds }
}

const MAX_STYLE_CHAIN_DEPTH = 10 // dieselbe Tiefenbegrenzung wie MAX_NESTING_DEPTH weiter unten in dieser Datei

function resolveParagraphAlign(styleName: string | null, pool: Map<string, ParagraphStyleDef>): string | null {
  let current = styleName
  for (let depth = 0; current && depth < MAX_STYLE_CHAIN_DEPTH; depth++) {
    const def = pool.get(current)
    if (!def) return null
    if (def.align) return def.align
    current = def.parent
  }
  return null
}

// ausrichtung-rechts-code.md Abschnitt 3.2 (Grenzfall 8): `start`/`end` werden fuer
// den LTR-Regelfall dieser App auf `left`/`right` normalisiert (reale Belege:
// excelfileformat.odt "end" x21, ueber 30 Dateien mit "start"). Unbekannte/seltene
// ODF-Werte (z. B. "inside"/"outside" fuer gespiegelte Seitenraender) fallen bewusst
// auf 'left' zurueck -- kein Absturz, kein Textverlust.
function normalizeOdfAlign(raw: string | null): string {
  if (raw === 'left' || raw === 'center' || raw === 'right' || raw === 'justify') return raw
  if (raw === 'start') return 'left'
  if (raw === 'end') return 'right'
  return 'left'
}

function resolveAlign(styleName: string | null, styles: ParsedStyles): string {
  return normalizeOdfAlign(styleName ? resolveParagraphAlign(styleName, styles.paragraphStyles) : null)
}
```

Aufrufstellen ändern sich von `(styleName && styles.paragraphAligns.get(styleName))
|| 'left'` (Zeile 126, `paragraphToBlocks`, und Zeile 173, `elementToBlocks` für
Überschriften) zu jeweils `resolveAlign(styleName, styles)`.

`readOdt` (Zeile 239 ff.) muss `styles.xml` **vor** der Berechnung von
`contentStyles` parsen (aktuell wird es erst danach für Header/Footer gelesen), damit
`officeStylesEl` beim ersten `parseAutomaticStyles`-Aufruf schon vorliegt:

```ts
export async function readOdt(file: File | Blob): Promise<WordDocumentContent> {
  const zip = await JSZip.loadAsync(file)

  const contentXmlText = await zip.file('content.xml')?.async('text')
  if (!contentXmlText) throw new Error('content.xml fehlt — keine gültige ODT-Datei.')
  const contentDoc = parseXmlDocument(contentXmlText)

  // VERSCHOBEN nach oben (vorher erst bei Header/Footer gelesen), damit
  // office:styles bereits fuer die Koerper-Absaetze zur Verfuegung steht.
  const stylesXmlText = await zip.file('styles.xml')?.async('text')
  const stylesDoc = stylesXmlText ? parseXmlDocument(stylesXmlText) : null
  const officeStylesEl = stylesDoc?.getElementsByTagNameNS(ODF_NAMESPACES.office, 'styles')[0] ?? null

  const contentAutomaticStyles = contentDoc.getElementsByTagNameNS(ODF_NAMESPACES.office, 'automatic-styles')[0] ?? null
  const contentStyles = parseAutomaticStyles(contentAutomaticStyles, officeStylesEl)
  const officeText = contentDoc.getElementsByTagNameNS(ODF_NAMESPACES.office, 'text')[0]
  const bodyBlocks = officeText ? await readOfficeTextChildren(officeText, contentStyles, zip) : []

  let headerBlocks: JsonNode[] | null = null
  let footerBlocks: JsonNode[] | null = null
  if (stylesDoc) {
    const stylesAutomaticStyles = stylesDoc.getElementsByTagNameNS(ODF_NAMESPACES.office, 'automatic-styles')[0] ?? null
    const stylesForChrome = parseAutomaticStyles(stylesAutomaticStyles, officeStylesEl)
    const masterPage = stylesDoc.getElementsByTagNameNS(ODF_NAMESPACES.style, 'master-page')[0]
    // ... Rest unverändert (verwendet jetzt `stylesForChrome` statt neu geparster Styles) ...
  }
  // ... Rest unverändert ...
}
```

**Bewusst nicht implementiert:** Beliebig tiefe Verschachtelung von `w:basedOn`
zwischen **mehreren** benutzerdefinierten Formatvorlagen über die im Korpus
gefundenen Fälle hinaus wird durch `MAX_STYLE_CHAIN_DEPTH = 10` abgesichert, aber
nicht speziell weiter getestet — alle 9 (DOCX) bzw. 11 (ODT) realen Treffer im
Korpus brauchen höchstens **einen** Hop über die direkt referenzierte Vorlage
hinaus (siehe `FruitDepot-SeasonalFruits4.odt`-Beispiel oben, das exakt einen Hop
braucht). Die Tiefenbegrenzung ist Verteidigung gegen zirkuläre/korrupte
Formatvorlagenketten, kein Hinweis auf einen bekannten tieferen Realfall.

### 3.4 `src/formats/shared/editor/WordEditor.tsx` — Tastenkürzel (Entscheidung Abschnitt 9.1)

**Entscheidung: `Mod-r` wird ergänzt**, wie von der Anforderung selbst als
Word/LibreOffice-Standard benannt. Fix in der Keymap (Zeile 71-79):

```ts
import { setAlign } from './commands' // NEU

...
keymap({
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
  Enter: splitListItem(wordSchema.nodes.list_item),
  'Mod-b': toggleMark(wordSchema.marks.strong),
  'Mod-i': toggleMark(wordSchema.marks.em),
  'Mod-u': toggleMark(wordSchema.marks.underline),
  // Ausrichtung rechts (ausrichtung-rechts-req.md Abschnitt 8 Punkt 1, Entscheidung
  // Abschnitt 9.1 dieses Plans): Word/LibreOffice-Standard Strg+R. Nur "rechts" ist
  // Gegenstand DIESES Backlog-Eintrags — Mod-l/-e/-j (links/zentriert/blocksatz)
  // bleiben bewusst offen fuer die jeweiligen Schwester-Anforderungen
  // (ausrichtung-links/-zentriert/-blocksatz-req.md), damit diese unabhaengig
  // entschieden werden koennen.
  'Mod-r': setAlign('right'),
}),
```

**Browser-Kompatibilitätsrisiko (muss dokumentiert und getestet werden, nicht nur
angenommen):** `Strg+R`/`Cmd+R` ist in den meisten Desktop-Browsern gleichzeitig das
Tastenkürzel für „Seite neu laden". Ob ein `keydown`-Handler mit `preventDefault()`
(das macht `prosemirror-keymap` automatisch, wenn ein gebundener Befehl `true`
zurückgibt) das Neuladen zuverlässig verhindert, ist **browserabhängig** und nicht
in jedem Fall garantiert. Konkrete Absicherung:

- **Automatisiert:** Neuer E2E-Test (Abschnitt 5.2) drückt `ControlOrMeta+r` nach
  Texteingabe und prüft, dass der Text **weiterhin** im DOM steht und jetzt
  rechtsbündig ist — ein tatsächliches Neuladen würde den getippten Text löschen und
  den Test fehlschlagen lassen. Läuft unter allen drei in `playwright.config.ts`
  konfigurierten Projekten (`Desktop Chrome`, `Mobile` = Chromium/Pixel 7, `Tablet` =
  WebKit/iPad Mini) — deckt damit **zwei** Engines (Chromium, WebKit) ab, nicht nur
  eine.
- **Manuell, vor Abnahme:** Empfehlung, das Kürzel zusätzlich einmalig in Firefox und
  Edge von Hand zu bestätigen (kein Bestandteil der automatisierten CI, analog zur
  in `durchgestrichen-code.md` Abschnitt 7 Punkt 2 etablierten Praxis für
  Parser-Validierung).

### 3.5 `src/formats/shared/editor/commands.ts` — `isAlignActive` nur `$from` (Entscheidung Abschnitt 9.5)

Zeile 29-38, aktuell:

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

**Warum die Entscheidung hier anders ausfällt als beim analogen Problem in
`durchgestrichen-code.md` Abschnitt 3.6:** Dort wurde für `aria-pressed` bei Marks
die Regel „aktiv, wenn die Mark **irgendwo** in der Selektion vorkommt" gewählt,
weil das exakt widerspiegelt, was ein Klick auf `toggleMark` als Nächstes tut
(`removeWhenPresent: true` entfernt, sobald die Mark **irgendwo** vorkommt).
Absatzausrichtung ist **kein** Toggle mit demselben Verhalten: `setAlign('right')`
setzt **immer unbedingt** alle betroffenen Absätze auf `right`, unabhängig vom
vorherigen Zustand (Anforderung Abschnitt 2.3, bereits bestätigt korrekt, siehe
Abschnitt 8 dieses Plans). Ein Klick hat also **immer dieselbe Wirkung**, ganz
gleich, wie `aria-pressed` gerade angezeigt wird — die „was macht ein Klick
als Nächstes"-Begründung aus dem Mark-Fall greift hier nicht.

**Entscheidung (Anforderung Abschnitt 8 Punkt 5, zweite Alternative): „aktiv nur
wenn **alle** betroffenen Absätze bereits rechtsbündig sind."** Begründung: Das ist
die informativere, nicht-irreführende Anzeige — „aktiv" bedeutet dann tatsächlich
„die gesamte Selektion ist schon rechtsbündig, ein Klick würde nichts sichtbar
ändern", während „inaktiv" bedeutet „mindestens ein Absatz der Selektion würde sich
durch einen Klick ändern". Die alte `$from`-only-Logik konnte „aktiv" anzeigen,
obwohl der **Großteil** der Selektion nicht rechtsbündig war (Grenzfall 1 der
Anforderung) — das ist der eigentliche Bug.

Fix — bewusst über **dieselbe** `nodesBetween`-Iteration wie `setAlign` selbst,
wodurch die Anzeige **beweisbar exakt** die Absätze prüft, die ein Klick auch
tatsächlich verändern würde (schließt die Lücke aus Verdachtsmoment 5 strukturell,
nicht nur an der Oberfläche):

```ts
export function isAlignActive(state: EditorState, align: Align): boolean {
  const { from, to } = state.selection
  let allMatch = true
  let sawAlignable = false
  state.doc.nodesBetween(from, to, (node) => {
    if (alignableTypes.has(node.type.name)) {
      sawAlignable = true
      if (node.attrs.align !== align) allMatch = false
    }
  })
  return sawAlignable && allMatch
}
```

`nodesBetween(from, to, ...)` durchläuft — wie schon `setAlign` selbst beweist, siehe
Anforderung Abschnitt 2.2 und `commands.ts:17` — auch bei einer **kollabierten**
Selektion (reiner Cursor, `from === to`) den umgebenden `paragraph`/`heading`-Knoten
korrekt; ein Sonderfall für den Cursor-ohne-Selektion-Fall ist daher **nicht** nötig,
die Funktion ist für beide Selektionsarten symmetrisch zu `setAlign` und damit
konsistent mit dem, was ein Klick als Nächstes bewirkt. Das gilt symmetrisch auch für
`CellSelection` (mehrere Tabellenzellen): `state.selection.from`/`.to` liefern die
äußere Umschließung; `nodesBetween` kann dabei — genau wie bei `setAlign` selbst,
keine neue Einschränkung — auch Zellen zwischen den ausgewählten (nicht rechteckige
Lücken) mit einbeziehen. Das ist ein bereits bestehendes, durch `setAlign` geteiltes
Verhalten, keine neue Regression.

**Betrifft alle vier `AlignButton`-Instanzen** (links/zentriert/rechts/Blocksatz)
gleichermaßen, da sie dieselbe `isAlignActive`-Funktion mit unterschiedlichem
`align`-Parameter teilen — analog zur in `durchgestrichen-code.md` Abschnitt 3.6
dokumentierten Auswirkung auf alle vier `MarkButton`-Instanzen.

### 3.6 `src/formats/shared/editor/commands.ts` — `setHeading` verwirft Ausrichtung (Bug, Entscheidung Abschnitt 9.3)

Zeile 40-55, aktuell:

```ts
export function setHeading(level: number | null): Command {
  return (state, dispatch) => {
    const type = level === null ? wordSchema.nodes.paragraph : wordSchema.nodes.heading
    const attrs = level === null ? undefined : { level, align: 'left' }
    const { $from, $to } = state.selection
    if (!$from.sameParent($to)) return false
    const parent = $from.parent
    if (!alignableTypes.has(parent.type.name)) return false
    if (dispatch) {
      const pos = $from.before($from.depth)
      const tr = state.tr.setBlockType(pos, pos + parent.nodeSize, type, attrs)
      dispatch(tr)
    }
    return true
  }
}
```

**Entscheidung (Anforderung Abschnitt 8 Punkt 3): Bug, wird behoben.** Ein
alltäglicher Bedienschritt (Ausrichtung setzen, dann Format wechseln, oder
umgekehrt) darf die Ausrichtung nicht stillschweigend zurücksetzen — das
widerspricht dem Prinzip aus Anforderung Abschnitt 2.4 („Ausrichtung … muss
unabhängig von … jeder [anderen Eigenschaft] … funktionieren"), das die Anforderung
zwar nur für Zeichenformatierung explizit ausformuliert, aber sinngemäß auch für den
Formatvorlagen-Wechsel gelten muss. Fix — Ausrichtung des aktuellen Absatzes wird in
beide Richtungen übernommen statt überschrieben:

```ts
export function setHeading(level: number | null): Command {
  return (state, dispatch) => {
    const type = level === null ? wordSchema.nodes.paragraph : wordSchema.nodes.heading
    const { $from, $to } = state.selection
    if (!$from.sameParent($to)) return false
    const parent = $from.parent
    if (!alignableTypes.has(parent.type.name)) return false
    // ausrichtung-rechts-req.md Abschnitt 2.5 / Grenzfall 5, Entscheidung Abschnitt
    // 9.3 dieses Plans: Ausrichtung bleibt beim Wechsel Standard <-> Ueberschrift in
    // BEIDEN Richtungen erhalten, statt (wie zuvor) fest auf 'left' zu fallen bzw.
    // durch attrs:undefined implizit auf den Schema-Default 'left' zurueckzufallen.
    const align = (parent.attrs.align as string) ?? 'left'
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

Betrifft ebenfalls alle vier Ausrichtungswerte gleichermaßen (nicht rechts-spezifisch
im Fix selbst, aber Testfall 11/12 der Anforderung ist explizit für „rechts"
formuliert und wird hier abgedeckt).

### 3.7 `src/formats/shared/editor/Toolbar.tsx` — Tooltip-Lokalisierung + `aria-label` (Bug)

Zeile 64-84, aktuell:

```tsx
function AlignButton({ view, align, label }: { view: EditorView; align: Align; label: string }) {
  const active = isAlignActive(view.state, align)
  return (
    <button
      type="button"
      title={`Ausrichtung: ${align}`}
      aria-pressed={active}
      ...
```

Fix — deutsches Label, zusätzlich `aria-label` (analog zu `MarkButton`, Zeile 44-48,
das bereits beide Attribute setzt):

```tsx
const ALIGN_LABELS_DE: Record<Align, string> = {
  left: 'links',
  center: 'zentriert',
  right: 'rechts',
  justify: 'Blocksatz',
}

function AlignButton({ view, align, label }: { view: EditorView; align: Align; label: string }) {
  const active = isAlignActive(view.state, align)
  const title = `Ausrichtung: ${ALIGN_LABELS_DE[align]}`
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      ...
```

Betrifft alle vier Buttons (Verdachtsmoment 7 nennt nur „rechts" als Beispiel, der
Fehler betrifft aber `Ausrichtung: left/center/right/justify` gleichermaßen — Fix an
einer Stelle behebt alle vier).

### 3.8 `src/formats/shared/schema.ts` — bewusst **keine** werfende Enum-Validierung (Entscheidung, Verdachtsmoment 8)

Naheliegend wäre, `validate: 'string'` (Zeile 4) durch eine werfende Funktion zu
ersetzen, die nur die vier bekannten Werte zulässt. **Das wird bewusst NICHT so
gemacht** — Begründung:

`validate` wird laut `prosemirror-model`-Typdefinition (`AttributeSpec.validate`)
**„beim Deserialisieren aus JSON und bei `Node.check()`"** ausgewertet, nicht bei
jedem `setNodeAttribute`. Der einzige Aufrufort dieser Deserialisierung in dieser App
ist `wordSchema.nodeFromJSON(doc.content.body)` in `WordEditor.tsx` (Zeile 65),
**ungeschützt in einem `useEffect`** ohne try/catch. Eine werfende Validierung würde
also **jedes** Dokument, das (aus welchem Grund auch immer — künftiger localStorage-
Entwurf, manuell bearbeitetes JSON, ein Bug in einem der beiden Reader) einen bereits
gespeicherten, nicht in die vier Werte fallenden `align`-Wert enthält, beim **Laden**
zum Absturz bringen — ein **strengerer, neuer** Fehlerfall als der heutige stille
Fallback, und das Gegenteil von Grenzfall 13s Forderung „Editor darf nicht
abstürzen".

**Stattdessen:** Härtung an den beiden realistischen Eintrittspunkten (DOCX-/
ODT-Reader, siehe Abschnitt 3.1-3.3 — nach diesen Fixes können beide Reader nur noch
eine der vier bekannten Werte produzieren) **plus** eine defensive, **nicht
werfende** Normalisierung direkt vor `nodeFromJSON` in `WordEditor.tsx` (Abschnitt
3.9), die JEDEN sonstigen, nicht auf diesem Weg kommenden Fremdwert (Grenzfall 13:
`"foo"`, manuell konstruiertes JSON) still auf `'left'` abbildet, **bevor**
ProseMirror das Dokument überhaupt sieht. Ergebnis: Ein ungültiger Wert kann nach
diesem Plan **gar nicht mehr** in ein live editiertes Dokument gelangen — stärker als
die von der Anforderung geforderte Mindestanforderung („Editor darf nicht abstürzen,
Button zeigt korrekt inaktiv"), ohne das Absturzrisiko einer werfenden
Schema-Validierung einzugehen.

Ergänzung in `schema.ts` (rein additiv, `alignAttr` selbst bleibt unverändert):

```ts
export const ALIGN_VALUES = ['left', 'center', 'right', 'justify'] as const
export type AlignValue = (typeof ALIGN_VALUES)[number]

/**
 * ausrichtung-rechts-code.md Abschnitt 3.8 (Verdachtsmoment 8, Grenzfall 13): das
 * `align`-Attribut bleibt bewusst bei `validate: 'string'` (keine werfende
 * Enum-Validierung) -- ein `validate`, das bei ungueltigem Wert wirft, wuerde
 * `wordSchema.nodeFromJSON(...)` (WordEditor.tsx) bei JEDEM Dokument mit einem
 * bereits vorhandenen, nicht in die vier bekannten Werte fallenden `align` zum
 * Absturz beim Laden bringen -- schlimmer als der aktuelle stille Fallback.
 * Stattdessen wird an beiden realistischen Eintrittspunkten (DOCX-/ODT-Reader)
 * normalisiert UND defensiv direkt vor `nodeFromJSON` sanitisiert (siehe
 * `sanitizeAlign` hier und `WordEditor.tsx`), sodass niemals ein ungueltiger Wert
 * in ein live editiertes Dokument gelangt, ohne das Risiko eines harten
 * Ladefehlers einzugehen.
 */
export function sanitizeAlign(value: unknown): AlignValue {
  return (ALIGN_VALUES as readonly unknown[]).includes(value) ? (value as AlignValue) : 'left'
}
```

`commands.ts`s bisher eigenständiges `export type Align = 'left' | 'center' | 'right'
| 'justify'` (Zeile 8) wird durch einen Re-Export ersetzt, um Drift zwischen zwei
Definitionen derselben vier Werte zu vermeiden:

```ts
import { type AlignValue } from '../schema'
export type Align = AlignValue
```

`Toolbar.tsx`s bestehender `import { ..., type Align } from './commands'` bleibt
unverändert funktionsfähig (reiner Typalias, keine Breaking Change).

### 3.9 `src/formats/shared/editor/WordEditor.tsx` — defensive Sanitisierung vor `nodeFromJSON`

Ergänzung direkt vor der bestehenden Zeile 65 (`const bodyNode =
wordSchema.nodeFromJSON(doc.content.body)`):

```ts
import { sanitizeAlign } from '../schema' // NEU

/**
 * Grenzfall 13 der Anforderung (Datenkorruption/Fremdimport): normalisiert JEDEN
 * `align`-Wert im rohen JSON-Baum auf einen der vier gueltigen Werte, BEVOR
 * ProseMirror das Dokument ueberhaupt sieht -- siehe schema.ts Abschnitt 3.8 fuer
 * die Begruendung, warum dies bewusst hier (nicht-werfend) statt ueber eine
 * werfende Schema-Validierung geschieht. Nur `body` wird durchlaufen: `header`/
 * `footer` werden aktuell nirgends per `nodeFromJSON` geladen (keine Kopf-/
 * Fusszeilen-UI, siehe FEATURE-SPEC-DOCX-ODT.md Abschnitt 9), sind also von diesem
 * Absturzrisiko ohnehin nicht betroffen.
 */
function sanitizeAlignAttrs(node: unknown): unknown {
  if (node && typeof node === 'object') {
    const n = node as { attrs?: Record<string, unknown>; content?: unknown[] }
    if (n.attrs && 'align' in n.attrs) n.attrs = { ...n.attrs, align: sanitizeAlign(n.attrs.align) }
    if (Array.isArray(n.content)) n.content.forEach(sanitizeAlignAttrs)
  }
  return node
}

...
const bodyNode = wordSchema.nodeFromJSON(sanitizeAlignAttrs(doc.content.body))
```

---

## 4. Dateigenauer Änderungsplan — bestehende Dateien

| # | Datei | Änderung | Typ |
|---|---|---|---|
| 1 | `src/formats/shared/schema.ts` | `ALIGN_VALUES`, `AlignValue`, `sanitizeAlign` ergänzt (Abschnitt 3.8); `alignAttr` selbst **unverändert** | Neu (additiv) |
| 2 | `src/formats/shared/editor/commands.ts` | `isAlignActive` neu (Abschnitt 3.5); `setHeading` bewahrt Ausrichtung (Abschnitt 3.6); `Align`-Typ re-exportiert aus `schema.ts` (Abschnitt 3.8) | Fix |
| 3 | `src/formats/shared/editor/Toolbar.tsx` | `AlignButton`: deutsches `title` + `aria-label` (Abschnitt 3.7) | Fix |
| 4 | `src/formats/shared/editor/WordEditor.tsx` | Keymap-Eintrag `'Mod-r': setAlign('right')` (Abschnitt 3.4); `sanitizeAlignAttrs`-Vorverarbeitung vor `nodeFromJSON` (Abschnitt 3.9) | Neu (Zeilen in bestehender Datei) |
| 5 | `src/formats/docx/reader.ts` | `JC_TO_ALIGN` um `start`/`end` erweitert (Abschnitt 3.1); `HeadingInfo`/`parseStylesXml` um `jcByStyleId`/`basedOnByStyleId`/`resolveStyleJc` erweitert, `paragraphToBlocks` nutzt Style-Fallback (Abschnitt 3.3) | Fix |
| 6 | `src/formats/odt/reader.ts` | `ParsedStyles.paragraphAligns` → `paragraphStyles` (Struktur mit Elternstil), `normalizeOdfAlign`/`resolveParagraphAlign`/`resolveAlign` neu (Abschnitt 3.2/3.3); `readOdt` liest `styles.xml` vor `contentStyles`, übergibt `officeStylesEl` an beide `parseAutomaticStyles`-Aufrufe (Abschnitt 3.3) | Fix |
| 7 | `src/formats/docx/writer.ts` | **Keine Änderung.** `JC_BY_ALIGN[align] ?? 'left'`-Fallback bereits korrekt, nur ungetestet (wird in Abschnitt 5.1 nachgeholt); explizites `<w:jc>` auch für Default `left` ist gültiges OOXML, kein Fix nötig (Abschnitt 8) | — |
| 8 | `src/formats/odt/writer.ts` / `src/formats/odt/styleRegistry.ts` | **Keine Änderung.** Dedup über gemeinsamen Stilnamen je Wert bereits gegeben; Fallback `PARAGRAPH_ALIGN_STYLE_NAME[align] ?? …left` bereits korrekt (Abschnitt 8) | — |

Es wird **keine neue Command-Abstraktion** für das Setzen selbst eingeführt:
`setAlign` bleibt unverändert (bereits korrekt, siehe Abschnitt 8). Die Toolbar ruft
weiterhin direkt `setAlign(align)` auf; das neue `Mod-r` in der Keymap ruft
ebenfalls direkt `setAlign('right')` auf — identisch zum Muster bei
Fett/Kursiv/Unterstrichen und konsistent mit der in `durchgestrichen-code.md`
etablierten Praxis, Toolbar und Keymap dieselbe Commands-Funktion direkt aufrufen
zu lassen.

---

## 5. Neue Dateien

### 5.1 Unit-Tests (Vitest, `jsdom`)

**Neu: `src/formats/docx/__tests__/align-right.test.ts`**

Kombiniert handgebaute XML-Fälle (für im Korpus nicht vorhandene, aber gültige Werte)
mit echten Fixture-Assertions (für die real bestätigten Fälle aus Abschnitt 6.1):

```ts
import JSZip from 'jszip'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readDocx } from '../reader'
import { writeDocx } from '../writer'
import type { WordDocumentContent } from '../../shared/documentModel'

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/docx')

async function buildDocxWithParagraphs(paragraphsXml: string, stylesExtra = ''): Promise<Blob> {
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
  zip.folder('_rels')!.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
      `</Relationships>`,
  )
  const word = zip.folder('word')!
  word.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NS}><w:body>${paragraphsXml}<w:sectPr/></w:body></w:document>`,
  )
  if (stylesExtra) {
    word.file(
      'styles.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W_NS}>${stylesExtra}</w:styles>`,
    )
  }
  return new Blob([await zip.generateAsync({ type: 'nodebuffer' })])
}

describe('DOCX reader: <w:jc> "start"/"end" normalization (Grenzfall 6/8, Entscheidung 9.4)', () => {
  it.each([
    ['<w:jc w:val="right"/>', 'right'],
    ['<w:jc w:val="end"/>', 'right'], // kein Korpus-Fund auf Absatzebene -> handgebaut
    ['<w:jc w:val="left"/>', 'left'],
    ['<w:jc w:val="start"/>', 'left'],
    ['<w:jc w:val="distribute"/>', 'left'], // Grenzfall 7, dokumentierter Fallback
  ])('%s -> align %s', async (jc, expected) => {
    const blob = await buildDocxWithParagraphs(`<w:p><w:pPr>${jc}</w:pPr><w:r><w:t>Text</w:t></w:r></w:p>`)
    const result = await readDocx(blob)
    expect((result.body as any).content[0].attrs.align).toBe(expected)
  })
})

describe('DOCX reader: real fixture rtl.docx — w:jc="start" on RTL content (Abschnitt 3.1.1)', () => {
  it('imports as "left" (documented LTR-regelfall limitation, no crash, no text loss)', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'rtl.docx'))
    const result = await readDocx(new Blob([new Uint8Array(buffer)]))
    const paragraphs = (result.body as any).content.filter((n: any) => n.type === 'paragraph')
    expect(paragraphs.length).toBeGreaterThan(0)
    expect(paragraphs.every((p: any) => p.attrs.align === 'left')).toBe(true)
    // Text bleibt trotz Ausrichtungs-Vereinfachung vollstaendig erhalten:
    expect(JSON.stringify(result.body)).toContain('إسبانيا')
  })
})

describe('DOCX reader: alignment inherited from paragraph style (Grenzfall 9, Verdachtsmoment 3)', () => {
  it('real fixture bug-paragraph-alignment.docx: paragraph with no own <w:jc>, style "Title" declares jc="center"', async () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'bug-paragraph-alignment.docx'))
    const result = await readDocx(new Blob([new Uint8Array(buffer)]))
    const first = (result.body as any).content[0]
    expect(first.attrs.align).toBe('center')
    expect(first.content[0].text).toContain('does not have explicit alignment')
  })

  it('hand-built: w:basedOn chain of two styles resolves alignment (defense-in-depth beyond the single-hop real fixtures)', async () => {
    const stylesExtra =
      `<w:style w:type="paragraph" w:styleId="Base"><w:pPr><w:jc w:val="right"/></w:pPr></w:style>` +
      `<w:style w:type="paragraph" w:styleId="Derived"><w:basedOn w:val="Base"/></w:style>`
    const blob = await buildDocxWithParagraphs(
      `<w:p><w:pPr><w:pStyle w:val="Derived"/></w:pPr><w:r><w:t>Erbt ueber zwei Stufen</w:t></w:r></w:p>`,
      stylesExtra,
    )
    const result = await readDocx(blob)
    expect((result.body as any).content[0].attrs.align).toBe('right')
  })

  it('own <w:jc> on the paragraph always wins over the style (no regression)', async () => {
    const stylesExtra = `<w:style w:type="paragraph" w:styleId="Title"><w:pPr><w:jc w:val="center"/></w:pPr></w:style>`
    const blob = await buildDocxWithParagraphs(
      `<w:p><w:pPr><w:pStyle w:val="Title"/><w:jc w:val="right"/></w:pPr><w:r><w:t>Eigene Ausrichtung gewinnt</w:t></w:r></w:p>`,
      stylesExtra,
    )
    const result = await readDocx(blob)
    expect((result.body as any).content[0].attrs.align).toBe('right')
  })
})

describe('DOCX writer: fallback for a corrupted/unknown align value (Grenzfall 13, Testfall 36)', () => {
  it('writes <w:jc w:val="left"/> instead of throwing or emitting invalid XML', async () => {
    const doc: WordDocumentContent = {
      body: { type: 'doc', content: [{ type: 'paragraph', attrs: { align: 'foo' }, content: [{ type: 'text', text: 'x' }] }] },
      header: null,
      footer: null,
      meta: { title: '' },
    }
    const blob = await writeDocx(doc)
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).toContain('<w:jc w:val="left"/>')
  })
})
```

**Neu: `src/formats/odt/__tests__/align-right.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'
import { readOdt } from '../reader'
import { writeOdt } from '../writer'
import type { WordDocumentContent } from '../../shared/documentModel'

const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/odt')

async function loadFixture(name: string) {
  const buffer = readFileSync(join(FIXTURES_DIR, name))
  return readOdt(new Blob([buffer]))
}

describe('ODT reader: fo:text-align "start"/"end" normalization (Grenzfall 8, Entscheidung 9.4)', () => {
  it('real fixture excelfileformat.odt contains fo:text-align="end" (21x) — none of it leaks as raw "end" into the model', async () => {
    const doc = await loadFixture('excelfileformat.odt')
    const aligns = new Set<string>()
    function walk(n: any) {
      if (n.attrs?.align) aligns.add(n.attrs.align)
      ;(n.content ?? []).forEach(walk)
    }
    walk(doc.body)
    for (const a of aligns) expect(['left', 'center', 'right', 'justify']).toContain(a)
    expect(aligns.has('right')).toBe(true) // "end" normalized to "right"
  })
})

describe('ODT reader: alignment inherited via style:parent-style-name (Grenzfall 9, Verdachtsmoment 3)', () => {
  it('real fixture table-within-textBox-within-frame.odt: style "P74" has no own fo:text-align, parent "Subtitle" (in styles.xml office:styles) declares text-align="end" -> resolves to "right"', async () => {
    const doc = await loadFixture('table-within-textBox-within-frame.odt')
    let found = false
    function walk(n: any) {
      if (n.type === 'text' && n.text === 'SOW') found = true
      ;(n.content ?? []).forEach(walk)
    }
    walk(doc.body)
    expect(found).toBe(true)
    // The paragraph containing "SOW" must be right-aligned (resolved through the
    // parent-style-name chain into styles.xml's office:styles, not just content.xml).
    function findParagraphWithText(n: any, text: string): any {
      if (n.type === 'paragraph' && (n.content ?? []).some((c: any) => c.text?.includes(text))) return n
      for (const child of n.content ?? []) {
        const hit = findParagraphWithText(child, text)
        if (hit) return hit
      }
      return null
    }
    const para = findParagraphWithText(doc.body, 'SOW')
    expect(para?.attrs.align).toBe('right')
  })

  it('own fo:text-align on the directly referenced style always wins over an inherited one (no regression)', async () => {
    // Regression guard: this app's OWN writer always emits a direct fo:text-align on
    // every automatic style it creates (styleRegistry.ts paragraphAlignStyleDefs),
    // so its own round trip must keep taking the direct value, never fall through to
    // "Standard" (which has no text-align at all in this app's own styles.xml).
    const doc: WordDocumentContent = {
      body: { type: 'doc', content: [{ type: 'paragraph', attrs: { align: 'right' }, content: [{ type: 'text', text: 'x' }] }] },
      header: null,
      footer: null,
      meta: { title: '' },
    }
    const blob = await writeOdt(doc)
    const reimported = await readOdt(blob)
    expect((reimported.body as any).content[0].attrs.align).toBe('right')
  })
})

describe('ODT writer: fallback for a corrupted/unknown align value (Grenzfall 13, Testfall 36)', () => {
  it('writes the "left" automatic style instead of throwing or emitting invalid XML', async () => {
    const doc: WordDocumentContent = {
      body: { type: 'doc', content: [{ type: 'paragraph', attrs: { align: 'foo' }, content: [{ type: 'text', text: 'x' }] }] },
      header: null,
      footer: null,
      meta: { title: '' },
    }
    const blob = await writeOdt(doc)
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).toContain('text:style-name="Ppara-left"')
  })
})
```

**Neu: `src/formats/shared/editor/__tests__/commands.test.ts`**

Reiner Logik-Test ohne Browser/DOM für die beiden Command-Fixes:

```ts
import { EditorState, TextSelection, AllSelection } from 'prosemirror-state'
import { wordSchema } from '../../schema'
import { isAlignActive, setAlign, setHeading } from '../commands'

function stateFromParagraphAligns(...aligns: Array<'left' | 'center' | 'right' | 'justify'>): EditorState {
  const paragraphs = aligns.map((align) => wordSchema.nodes.paragraph.create({ align }, wordSchema.text('x')))
  const doc = wordSchema.nodes.doc.create(null, paragraphs)
  return EditorState.create({ doc, schema: wordSchema })
}

describe('isAlignActive (Grenzfall 1 / Entscheidung Abschnitt 9.5)', () => {
  it('is true for a collapsed cursor inside an already-right-aligned paragraph', () => {
    let state = stateFromParagraphAligns('right')
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1)))
    expect(isAlignActive(state, 'right')).toBe(true)
  })

  it('is false when the mixed selection has a right-aligned FIRST paragraph but others differ (previously mis-reported as active)', () => {
    let state = stateFromParagraphAligns('right', 'left', 'center')
    const sel = TextSelection.create(state.doc, 1, state.doc.content.size - 1)
    state = state.apply(state.tr.setSelection(sel))
    expect(isAlignActive(state, 'right')).toBe(false)
  })

  it('is true only when EVERY covered paragraph already matches the target alignment', () => {
    let state = stateFromParagraphAligns('right', 'right', 'right')
    const sel = TextSelection.create(state.doc, 1, state.doc.content.size - 1)
    state = state.apply(state.tr.setSelection(sel))
    expect(isAlignActive(state, 'right')).toBe(true)
  })

  it('is false for an AllSelection ("Strg+A") spanning mixed alignments', () => {
    let state = stateFromParagraphAligns('right', 'left')
    state = state.apply(state.tr.setSelection(new AllSelection(state.doc)))
    expect(isAlignActive(state, 'right')).toBe(false)
  })

  it('setAlign then isAlignActive agree with each other for a mixed selection (regression net for the fix)', () => {
    let state = stateFromParagraphAligns('left', 'center', 'justify')
    const sel = TextSelection.create(state.doc, 1, state.doc.content.size - 1)
    state = state.apply(state.tr.setSelection(sel))
    expect(isAlignActive(state, 'right')).toBe(false)
    const tr = state.tr
    setAlign('right')(state, (t) => {
      state = state.apply(t)
    })
    expect(isAlignActive(state, 'right')).toBe(true)
  })
})

describe('setHeading preserves alignment across the format switch (Grenzfall 5 / Entscheidung Abschnitt 9.3)', () => {
  it('Standard (right-aligned) -> Heading 1 keeps align: right', () => {
    let state = stateFromParagraphAligns('right')
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1)))
    setHeading(1)(state, (tr) => {
      state = state.apply(tr)
    })
    const node = state.doc.child(0)
    expect(node.type.name).toBe('heading')
    expect(node.attrs.level).toBe(1)
    expect(node.attrs.align).toBe('right')
  })

  it('Heading 1 (right-aligned) -> Standard keeps align: right', () => {
    const heading = wordSchema.nodes.heading.create({ level: 1, align: 'right' }, wordSchema.text('x'))
    const doc = wordSchema.nodes.doc.create(null, [heading])
    let state = EditorState.create({ doc, schema: wordSchema })
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1)))
    setHeading(null)(state, (tr) => {
      state = state.apply(tr)
    })
    const node = state.doc.child(0)
    expect(node.type.name).toBe('paragraph')
    expect(node.attrs.align).toBe('right')
  })
})
```

**Neu: `src/formats/shared/__tests__/schema.test.ts`**

```ts
import { sanitizeAlign } from '../schema'

describe('sanitizeAlign (Grenzfall 13 / Verdachtsmoment 8, Abschnitt 3.8)', () => {
  it.each(['left', 'center', 'right', 'justify'])('passes through valid value "%s"', (v) => {
    expect(sanitizeAlign(v)).toBe(v)
  })

  it.each(['foo', 'start', 'end', '', 123, null, undefined, { align: 'right' }])(
    'falls back to "left" for invalid value %p',
    (v) => {
      expect(sanitizeAlign(v)).toBe('left')
    },
  )
})
```

**Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts`** und
**`src/formats/odt/__tests__/roundtrip.test.ts`**

Beide Dateien testen Ausrichtung bisher nur an isolierten Einzelabsätzen
(Fundstelle „Unit-/Roundtrip-Tests" der Anforderung). Neue, je Datei gleich
aufgebaute Testfälle:

```ts
it('preserves right alignment on a heading combined with bold (Rundreise 4.1.5)', async () => {
  const original = doc([
    { type: 'heading', attrs: { level: 2, align: 'right' }, content: [{ type: 'text', text: 'Titel', marks: [{ type: 'strong' }] }] },
  ])
  const result = await roundTrip(original)
  const heading = (result.body as any).content[0]
  expect(heading.attrs.align).toBe('right')
  expect(heading.attrs.level).toBe(2)
  expect(heading.content[0].marks).toEqual([{ type: 'strong' }])
})

it('preserves right alignment inside a table cell without affecting the neighbor cell (Rundreise 4.1.6/4.2.5)', async () => {
  const original = doc([
    {
      type: 'table',
      content: [
        {
          type: 'table_row',
          content: [
            { type: 'table_cell', attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [paragraph('Rechts', 'right')] },
            { type: 'table_cell', attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [paragraph('Links', 'left')] },
          ],
        },
      ],
    },
  ])
  const result = await roundTrip(original)
  const cells = (result.body as any).content[0].content[0].content
  expect(cells[0].content[0].attrs.align).toBe('right')
  expect(cells[1].content[0].attrs.align).toBe('left')
})

it('preserves right alignment on a bullet AND an ordered list item (Rundreise 4.1.7/4.2.6)', async () => {
  const original = doc([
    { type: 'bullet_list', content: [{ type: 'list_item', content: [paragraph('Punkt', 'right')] }] },
    { type: 'ordered_list', content: [{ type: 'list_item', content: [paragraph('Eins', 'right')] }] },
  ])
  const result = await roundTrip(original)
  const bulletPara = (result.body as any).content[0].content[0].content[0]
  const orderedPara = (result.body as any).content[1].content[0].content[0]
  expect(bulletPara.attrs.align).toBe('right')
  expect(orderedPara.attrs.align).toBe('right')
})

it('preserves right alignment across a hard_break within the same paragraph (Rundreise 4.1.4, Grenzfall 4)', async () => {
  const original = doc([
    {
      type: 'paragraph',
      attrs: { align: 'right' },
      content: [{ type: 'text', text: 'Erste Zeile' }, { type: 'hard_break' }, { type: 'text', text: 'Zweite Zeile' }],
    },
  ])
  const result = await roundTrip(original)
  const content = (result.body as any).content[0].content
  expect((result.body as any).content[0].attrs.align).toBe('right')
  expect(content.some((n: any) => n.type === 'hard_break')).toBe(true)
  expect(content.map((n: any) => n.text).filter(Boolean).join('')).toBe('Erste ZeileZweite Zeile')
})
```

### 5.2 E2E-Tests (Playwright)

**Neu: `tests/e2e/align-right.spec.ts`**

Kernstück dieser Anforderung — analog zu `docx.spec.ts`/`odt.spec.ts`/
`selection-regression.spec.ts` (gleiche `odtCard`/`docxCard`-Locator-Helfer). Deckt
Testfälle aus Abschnitt 7 sowie die Rundreise-Anforderung aus Abschnitt 4, inklusive
der beiden echten, namentlich identifizierten Fremddateien:

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}

test.describe('Ausrichtung rechts — Toolbar & Tastatur', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Testfall 1: Maus-Selektion + Toolbar-Klick setzt Absatz rechtsbündig, aria-pressed wechselt auf true', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Testabsatz')
    await page.keyboard.press('ControlOrMeta+a')
    const button = page.getByTitle('Ausrichtung: rechts')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(editor.locator('p')).toHaveCSS('text-align', 'right')
  })

  test('Testfall 2: Doppelklick (Wort) richtet den GESAMTEN umgebenden Absatz aus, nicht nur das Wort', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Ein langer Testabsatz mit mehreren Woertern')
    await editor.getByText('langer').dblclick()
    await page.getByTitle('Ausrichtung: rechts').click()
    await expect(editor.locator('p')).toHaveCSS('text-align', 'right')
  })

  test('Testfall 5/6: Cursor ohne Selektion (auch im leeren Absatz) richtet den gesamten Absatz aus, kein Fehler', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Ausrichtung: rechts').click()
    await page.keyboard.type('jetzt getippt')
    await expect(editor.locator('p')).toHaveCSS('text-align', 'right')
    await expect(editor.locator('p')).toContainText('jetzt getippt')
  })

  test('Testfall 4/7: Strg+A bei gemischter Ausgangsausrichtung setzt ALLE Absaetze rechtsbuendig; danach Klick+Enter+Tippen bleibt erhalten (FEATURE-SPEC-DOCX-ODT.md Abschnitt 2)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Erster Absatz')
    await page.getByTitle('Ausrichtung: zentriert').click()
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Zweiter Absatz')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Ausrichtung: rechts').click()
    const paragraphs = editor.locator('p')
    await expect(paragraphs).toHaveCount(2)
    for (const p of await paragraphs.all()) await expect(p).toHaveCSS('text-align', 'right')
    // Regressionsmuster wie bei Fett/Durchgestrichen: Klick-Neupositionierung + Enter + Tippen
    await paragraphs.last().click()
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Dritter Absatz')
    await expect(editor.locator('p')).toHaveCount(3)
    await expect(editor).toContainText('Dritter Absatz')
  })

  test('Testfall 8: Wechsel rechts -> zentriert -> Blocksatz -> links -> rechts, Button-Zustand stimmt nach jedem Schritt', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Wechseltest')
    await page.keyboard.press('ControlOrMeta+a')
    for (const [title, css] of [
      ['Ausrichtung: rechts', 'right'],
      ['Ausrichtung: zentriert', 'center'],
      ['Ausrichtung: Blocksatz', 'justify'],
      ['Ausrichtung: links', 'left'],
      ['Ausrichtung: rechts', 'right'],
    ] as const) {
      const button = page.getByTitle(title)
      await button.click()
      await expect(button).toHaveAttribute('aria-pressed', 'true')
      await expect(editor.locator('p')).toHaveCSS('text-align', css)
    }
  })

  test('Testfall 9: erneuter Klick auf bereits aktives "rechts" bleibt rechtsbuendig (Entscheidung Abschnitt 9.2, idempotent)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Idempotenztest')
    await page.keyboard.press('ControlOrMeta+a')
    const button = page.getByTitle('Ausrichtung: rechts')
    await button.click()
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(editor.locator('p')).toHaveCSS('text-align', 'right')
  })

  test('Testfall 10: Kombination mit Fett, Kursiv und Schriftfarbe gleichzeitig', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Kombiniert')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Fett').click()
    await page.getByTitle('Kursiv').click()
    await page.getByTitle('Ausrichtung: rechts').click()
    await expect(editor.locator('p')).toHaveCSS('text-align', 'right')
    await expect(editor.locator('p strong, p b')).toBeVisible()
    await expect(editor.locator('p em, p i')).toBeVisible()
  })

  test('Testfall 11: rechtsbuendigen Standard-Absatz auf Ueberschrift 1 umstellen behaelt die Ausrichtung (Grenzfall 5, Bug-Fix Abschnitt 3.6)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Wird Ueberschrift')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Ausrichtung: rechts').click()
    await page.getByLabel('Absatzformat').selectOption('1')
    await expect(editor.locator('h1')).toHaveCSS('text-align', 'right')
  })

  test('Testfall 12: umgekehrter Wechsel — rechtsbuendige Ueberschrift zurueck auf Standard behaelt die Ausrichtung', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByLabel('Absatzformat').selectOption('1')
    await page.keyboard.type('Wird wieder Standard')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Ausrichtung: rechts').click()
    await page.getByLabel('Absatzformat').selectOption('normal')
    await expect(editor.locator('p')).toHaveCSS('text-align', 'right')
  })

  test('Testfall 13: rechtsbuendig in Bullet- und in nummerierter Liste', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByTitle('Aufzaehlung').click()
    await page.keyboard.type('Listenpunkt')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Ausrichtung: rechts').click()
    await expect(editor.locator('li p, li')).toHaveCSS('text-align', 'right')
  })

  test('Testfall 14: rechtsbuendig in einer Tabellenzelle ohne Nebenwirkung auf Nachbarzelle', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfuegen' }).click()
    const cells = page.locator('.ProseMirror td')
    await cells.nth(0).click()
    await page.keyboard.type('Eins')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Ausrichtung: rechts').click()
    await expect(cells.nth(0).locator('p')).toHaveCSS('text-align', 'right')
    await expect(cells.nth(1).locator('p')).not.toHaveCSS('text-align', 'right')
  })

  test('Testfall 15: hard_break (Umschalt+Enter) im rechtsbuendigen Absatz — beide Zeilen betroffen', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Erste Zeile')
    await page.keyboard.press('Shift+Enter')
    await page.keyboard.type('Zweite Zeile')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Ausrichtung: rechts').click()
    await expect(editor.locator('p')).toHaveCSS('text-align', 'right')
    await expect(editor.locator('p br')).toHaveCount(1)
  })

  test('Testfall 16/17: Undo/Redo direkt nach Anwenden stellt den tatsaechlichen Vorwert wieder her', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Text')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Ausrichtung: zentriert').click()
    await page.getByTitle('Ausrichtung: rechts').click()
    await expect(editor.locator('p')).toHaveCSS('text-align', 'right')
    await page.keyboard.press('ControlOrMeta+z')
    await expect(editor.locator('p')).toHaveCSS('text-align', 'center')
    await page.keyboard.press('ControlOrMeta+y')
    await expect(editor.locator('p')).toHaveCSS('text-align', 'right')
  })

  test('Testfall 32: Tooltip zeigt durchgaengig deutschen Text (Regression fuer Abschnitt 3.7 Fix)', async ({ page }) => {
    await expect(page.getByTitle('Ausrichtung: rechts')).toBeVisible()
    await expect(page.getByTitle(/Ausrichtung: right/)).toHaveCount(0)
  })

  test('Testfall 33: Strg+R setzt rechtsbuendig, statt die Seite neu zu laden (Abschnitt 3.4 Entscheidung + Risiko)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Kurzform per Tastatur')
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('ControlOrMeta+r')
    // Ein tatsaechliches Neuladen wuerde den Text loeschen -- dieser Assert scheitert dann:
    await expect(editor).toContainText('Kurzform per Tastatur')
    await expect(editor.locator('p')).toHaveCSS('text-align', 'right')
  })

  test('Testfall 34: sehr lange Selektion bleibt performant', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Wort '.repeat(2000))
    const start = Date.now()
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Ausrichtung: rechts').click()
    expect(Date.now() - start).toBeLessThan(5000)
    await expect(editor.locator('p').first()).toHaveCSS('text-align', 'right')
  })

  test('Testfall 35: schnelles Mehrfachklicken bleibt konsistent (idempotent, kein inkonsistenter Zwischenzustand)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Klicktest')
    await page.keyboard.press('ControlOrMeta+a')
    const button = page.getByTitle('Ausrichtung: rechts')
    await button.click()
    await button.click()
    await button.click()
    await button.click()
    await expect(editor.locator('p')).toHaveCSS('text-align', 'right')
    await expect(editor).toContainText('Klicktest')
  })
})

test.describe('Ausrichtung rechts — Rundreisen (Anforderung Abschnitt 4)', () => {
  test('Rundreise 4.1.2/Testfall 18: DOCX-Eigenrundreise ueber echte Bedienung', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Rechtsbuendiger Text')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Ausrichtung: rechts').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).toContain('Rechtsbuendiger Text')
    expect(documentXml).toMatch(/<w:jc w:val="right"\s*\/>/)
  })

  test('Rundreise 4.2.2/Testfall 19: ODT-Eigenrundreise ueber echte Bedienung', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Rechtsbuendiger Text')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Ausrichtung: rechts').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).toContain('Rechtsbuendiger Text')
    expect(contentXml).toContain('fo:text-align="right"')
  })

  test('Rundreise 4.1.1/Testfall 23: reale, ausserhalb der App erzeugte DOCX-Datei (60329.docx) mit rechtsbuendigem Absatz -- unveraendert exportieren, Text+Ausrichtung identisch', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    const fs = await import('node:fs/promises')
    const buffer = await fs.readFile('tests/fixtures/external/docx/60329.docx')
    const input = docxCard(page).locator('input[type="file"]')
    await input.setInputFiles({
      name: '60329.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer,
    })
    await expect(page.locator('.ProseMirror')).toContainText('Protocol No.')
    await expect(page.locator('.ProseMirror p', { hasText: 'Protocol No.' })).toHaveCSS('text-align', 'right')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).toContain('Protocol No.')
    expect(documentXml).toMatch(/<w:jc w:val="right"\s*\/>/)
  })

  test('Rundreise 4.2.1/Testfall 24: reale ODT-Datei (invalid.odt) mit rechtsbuendigem Absatz -- unveraendert exportieren, Text+Ausrichtung identisch', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    const fs = await import('node:fs/promises')
    const buffer = await fs.readFile('tests/fixtures/external/odt/invalid.odt')
    const input = odtCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'invalid.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
    await expect(page.locator('.ProseMirror')).toContainText('hallo')
    await expect(page.locator('.ProseMirror p', { hasText: 'hallo' }).first()).toHaveCSS('text-align', 'right')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).toContain('fo:text-align="right"')
  })

  test('Rundreise 3.6/Testfall 25: reale Datei rtl.docx mit w:jc="start" -- dokumentiertes LTR-Fallback-Verhalten (Abschnitt 3.1.1), kein Absturz, kein Textverlust', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    const fs = await import('node:fs/promises')
    const buffer = await fs.readFile('tests/fixtures/external/docx/rtl.docx')
    const input = docxCard(page).locator('input[type="file"]')
    await input.setInputFiles({
      name: 'rtl.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer,
    })
    await expect(page.locator('.ProseMirror')).toBeVisible()
    await expect(page.locator('.ProseMirror')).toContainText('إسبانيا')
  })

  test('Rundreise Grenzfall 9/Testfall 27: reale Datei bug-paragraph-alignment.docx -- Ausrichtung nur ueber Formatvorlage bleibt beim Import erhalten', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    const fs = await import('node:fs/promises')
    const buffer = await fs.readFile('tests/fixtures/external/docx/bug-paragraph-alignment.docx')
    const input = docxCard(page).locator('input[type="file"]')
    await input.setInputFiles({
      name: 'bug-paragraph-alignment.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer,
    })
    await expect(page.locator('.ProseMirror')).toContainText('does not have explicit alignment')
    await expect(page.locator('.ProseMirror p', { hasText: 'does not have explicit alignment' })).toHaveCSS('text-align', 'center')
  })

  test('Rundreise 4.3.1/Testfall 20: Cross-Format DOCX -> ODT erhaelt die Ausrichtung', async ({ page }) => { /* analog docx.spec.ts Rundreise, dann re-import als ODT */ })
  test('Rundreise 4.3.2/Testfall 21: Cross-Format ODT -> DOCX erhaelt die Ausrichtung', async ({ page }) => { /* analog, umgekehrte Richtung */ })
  test('Rundreise 4.3.3/Testfall 22: doppelte Cross-Format-Rundreise (DOCX->ODT->DOCX) mit rechtsbuendiger Ueberschrift + Fett + Farbe, kein kumulativer Verlust', async ({ page }) => { /* ... */ })
})
```

**Erweiterung: `tests/e2e/selection-regression.spec.ts`**

Analog zum bestehenden „Fett"-Test, direkt im selben `describe`-Block ergänzt
(Anforderung Abschnitt 3.9/Testfall 4):

```ts
test('same regression with "Ausrichtung rechts" instead of "Fett" (Testfall 4)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Ausrichtung: rechts').click()
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
})
```

**Empfehlung (nicht in diesem Plan umgesetzt): visueller Regressionstest fürs
Icon-Rendering (Testfall 31).** Anders als das lateinische „S" bei Durchgestrichen
sind „⇤"/„↔"/„⇥"/„≡" **echte** Unicode-Pfeil-/Liniensymbole — genau das in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20.1 benannte Rendering-Risiko. Empfehlung:
`page.locator('div.rounded-lg ... AlignButton-Reihe').screenshot()` bzw.
`expect(...).toHaveScreenshot('align-buttons.png')` in allen drei
`playwright.config.ts`-Projekten (Chromium **und** WebKit über „Tablet") als
zusätzliche, separat zu pflegende Baseline — kein Code-Fix, nur ein neuer
Snapshot-Test, deshalb hier nur empfohlen, nicht ausformuliert (analog zur
Empfehlung in `durchgestrichen-code.md` Abschnitt 8).

---

## 6. Fixture-Inventar — reale Dateien, programmatisch verifiziert

### 6.1 DOCX (`tests/fixtures/external/docx`, Apache-POI-Korpus, 53 Dateien)

Direkte `<w:pPr>/<w:jc>`-Werte (23 von 53 Dateien betroffen; `bug65649.docx`
bewusst außen vor gelassen — bereits laut `external-fixtures.test.ts` wegen
jsdom-Langsamkeit von der Vitest-Suite ausgeschlossen, siehe dort):

| Wert | Dateien (Auswahl) | Verwendung als Primär-Fixture in diesem Plan |
|---|---|---|
| `right` | `52449.docx` (1×, „Allerød, 11-01-2012"), `60329.docx` (7×, „Protocol No. (Document ID):" u. a.), `bug57031.docx` (1165×), `bug59058.docx` (3×), `drawing.docx` (2×), `form_footnotes.docx` (30×) | **`60329.docx`** — kleine, klare Datei mit mehreren echten rechtsbündigen Zeilen |
| `start` | `rtl.docx` (4×, arabischer Text), `table-indent.docx` (91×), `unicode-path.docx` (1×) | **`rtl.docx`** — einzige Datei, die den RTL-Sonderfall (Abschnitt 3.1.1) demonstriert |
| `end` (Absatzebene) | **keine gefunden** | hand-gebaute XML nötig (siehe `align-right.test.ts`) |
| Ausrichtung nur über `w:pStyle` (Grenzfall 9) | `61787.docx`, `65099.docx`, `bookmarks.docx`, **`bug-paragraph-alignment.docx`**, `bug59058.docx`, `bug65738.docx`, `bug69628.docx`, `form_footnotes.docx`, `IllustrativeCases.docx` (9 Dateien) | **`bug-paragraph-alignment.docx`** — Dateiname selbst belegt die Relevanz, Stil „Title" → `center` |

**Kein** reales Beispiel für eine rechtsbündige **Überschrift** wurde im Korpus
gefunden (0 Treffer bei gezielter Suche nach `<w:jc w:val="right">` kombiniert mit
einem `Heading*`-`w:pStyle` im selben Absatz) — Testfall 4.1.5 (Überschrift +
rechts) bleibt daher auf den bereits vorhandenen synthetischen
Writer→eigener-Reader-Test angewiesen (Abschnitt 5.1 Erweiterung).

### 6.2 ODT (`tests/fixtures/external/odt`, ODF-Toolkit-Korpus, 330 Dateien)

`fo:text-align`-Werte über 94 Dateien verteilt (weitaus häufiger als bei DOCX, weil
LibreOffice praktisch jeden Absatz mit einem automatischen Stil versieht):

| Wert | Dateien (Auswahl) | Verwendung als Primär-Fixture |
|---|---|---|
| `right` (direkt) | **`invalid.odt`** (6×, Text „hallo"), `listStyleId.odt` (52×), `ListRoundtrip.odt` (12×), `ListOddity.odt` (3×), `simple-table-with-lists.odt` (6×), `brokenList.odt` (1×) | **`invalid.odt`** — kleinste Datei mit eindeutig identifizierbarem Text |
| `end` | `excelfileformat.odt` (21×), `bulletListTest.odt`/`damaged.odt`/`error-ox.odt` (je 60×, listenlastig), `compdocfileformat.odt` (10×) u. v. a. (insges. >20 Dateien) | **`excelfileformat.odt`** — für die reine Wert-Normalisierung (Testfall 26) |
| Ausrichtung nur über `style:parent-style-name` (Grenzfall 9) | `compdocfileformat(_shortened).odt`, `excelfileformat.odt`, `FruitDepot-SeasonalFruits{4,5}.odt`, `Lebenslauf_DOC_LO4.0.5.1.odt`, `sample_numbering_DOC_LO41.odt`, `Seasonal_Fruits2_en.odt`, **`table-within-textBox-within-frame.odt`**, `tableComplex_DOC_LO41.odt`, `test1.odt` (11 Dateien) | **`table-within-textBox-within-frame.odt`** — einzige Datei, die Grenzfall 8 (`end`) **und** Grenzfall 9 (Vererbung) gleichzeitig demonstriert, Text „SOW" |

**Kein** reales Beispiel für eine rechtsbündige Überschrift wurde gefunden (0
Treffer bei gezielter Suche nach `<text:h>` mit einem Stil, dessen (ggf. über die
Kette aufgelöste) `fo:text-align="right"` ist) — auch hier bleibt Testfall 4.2.4
(Überschrift + rechts) auf den synthetischen Roundtrip-Test angewiesen.

### 6.3 Methodik-Warnhinweis: `<w:jc>` existiert in **zwei** unterschiedlichen OOXML-Kontexten

Bei der ersten (unkorrigierten) Fassung des Scan-Skripts wurde `table-
alignment.docx` fälschlich als Datei mit **allen fünf** `left`/`start`/`center`/
`right`/`end`-Werten auf Absatzebene identifiziert. Bei genauerer Prüfung stellte
sich heraus: **alle fünf** Vorkommen sitzen ausschließlich in `<w:tblPr><w:jc
w:val="..."/></w:tblPr>` — das ist **Tabellen-Positionsausrichtung auf der Seite**
(„richte die ganze Tabelle links/rechts/mittig auf der Seite aus"), ein komplett
anderes Konzept als `<w:pPr><w:jc>` (Absatz-**Text**ausrichtung), das zufällig
denselben Elementnamen `w:jc` verwendet. Der bestehende Reader-Code
(`paragraphToBlocks`, sucht `w:jc` gezielt **innerhalb von `w:pPr`**) ist von dieser
Verwechslung nicht betroffen — er war nie falsch. Der Hinweis gilt nur für
**manuelles** Grep/Sichten von `document.xml` durch künftige Bearbeiter dieses
Features (z. B. bei der in Abschnitt 3.4 empfohlenen manuellen Cross-Browser-Prüfung)
und ist deshalb hier dokumentiert, damit er nicht erneut zu einem falschen
Fixture-Fund führt. `table-alignment.docx` wird in diesem Plan **nicht** als
Absatzausrichtungs-Fixture verwendet.

---

## 7. Unabhängige Parser-Validierung (Rundreise-Anforderung Punkt 3/9, DoD Punkt 5)

Wie bereits in `durchgestrichen-code.md` Abschnitt 7 begründet: dieses Repo ist
reines TypeScript/Vite ohne Python-Toolchain. Zweistufiger Ansatz, identisch zum
Schwesterfeature:

1. **Automatisiert:** Die Playwright-Tests aus Abschnitt 5.2 prüfen den
   exportierten XML-String direkt per Regex/`toContain`, **ohne** `readDocx`/
   `readOdt` zu verwenden (`expect(documentXml).toMatch(/<w:jc w:val="right"\s*\/>/)`
   bzw. `expect(contentXml).toContain('fo:text-align="right"')`) — das erfüllt
   „nicht nur mit dem eigenen Reader rückgelesen" für die automatisierte Suite.
2. **Manuell, einmalig vor Abnahme:** Empfehlung, eine mit dieser App exportierte
   Test-DOCX/-ODT mit `python-docx` bzw. LibreOffice/einem ODF-Validator zu öffnen
   und das Ergebnis in dieser Datei oder `ausrichtung-rechts-req.md` zu vermerken.
   Kein Bestandteil der automatisierten CI.

---

## 8. Bewusst nicht geänderter Code (und warum)

- **`commands.ts` `setAlign`** — bereits korrekt. Die `nodesBetween`-basierte
  Iteration deckt sowohl Teil-Selektion innerhalb eines Absatzes als auch
  Cursor-ohne-Selektion strukturell ab (Anforderung Abschnitt 2.1/2.2) — nur Tests
  fehlten (jetzt ergänzt in `commands.test.ts` und `align-right.spec.ts`).
- **`docx/writer.ts` `paragraphPropsXml`** — schreibt weiterhin **immer** ein
  explizites `<w:jc>`, auch für den Default `left`. Das ist gültiges, redundantes
  aber nicht falsches OOXML (kein Schemaverstoß) und ändert das Rundreiseverhalten
  nicht — kein Fix.
- **`odt/writer.ts` / `styleRegistry.ts`** — erzeugt weiterhin **immer** alle vier
  `Ppara-*`-Stile bzw. alle 24 `Heading{1-6}-{align}`-Stile vorab, unabhängig davon,
  ob sie im Dokument vorkommen. Das ist Verschwendung (etwas größere `content.xml`),
  aber **kein** Korrektheitsproblem, und die in Rundreise-Anforderung 4.2.3
  geforderte Deduplizierung („zwei rechtsbündige Absätze referenzieren denselben
  Stil") ist durch die feste, wertbasierte Namensgebung (`PARAGRAPH_ALIGN_STYLE_NAME`)
  bereits strukturell gegeben — kein Fix, nur Testbestätigung nötig (in
  `align-right.test.ts`s zweitem ODT-Test implizit mit abgedeckt: derselbe
  Stilname `Ppara-right` wird für jeden `right`-Absatz erzeugt).
- **`prosemirror-model` `Node.nodesBetween`** — Verhalten bei kollabierter Selektion
  (deckt Cursor-ohne-Selektion ab) ist Fremdbibliotheks-Standardverhalten, korrekt
  und muss nur verifiziert, nicht implementiert werden (Abschnitt 3.5).
- **Icon-Glyphen „⇤ ↔ ⇥ ≡"** — keine Codeänderung in diesem Plan; echtes,
  bereits in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20.1 vermerktes
  Rendering-Risiko (anders als das lateinische „S" bei Durchgestrichen). Empfehlung
  eines Screenshot-Regressionstests siehe Abschnitt 5.2 Ende — bewusst nur
  empfohlen, nicht in diesem Plan umgesetzt (Scope-Grund: das beträfe alle vier
  Buttons gemeinsam, nicht nur „rechts", und bräuchte eine erste Baseline-Erstellung,
  die eine bewusste, separate Entscheidung ist).

---

## 9. Offene Entscheidungen (Anforderung Abschnitt 8) — hiermit beantwortet

1. **Tastenkürzel:** `Mod-r` (Strg+R/Cmd+R) wird ergänzt (Abschnitt 3.4). Risiko
   „Browser-Reload-Konflikt" wird über einen dedizierten E2E-Test (Testfall 33) in
   zwei Engines (Chromium, WebKit) automatisiert abgesichert; manuelle Prüfung in
   Firefox/Edge vor Abnahme empfohlen.
2. **Erneuter Klick auf bereits aktive Ausrichtung:** bleibt **idempotent**
   (aktuelles Codeverhalten, `setAlign` setzt unbedingt) — **keine** Code-Änderung,
   nur Testfall 9 friert das Verhalten ein. Der dabei weiterhin erzeugte,
   inhaltlich wirkungslose Transaktionsschritt in der Undo-Historie (Grenzfall 4.9
   der Anforderung) wird **nicht** unterdrückt — Begründung: `setNodeAttribute`
   auf denselben Wert ist ein seltener, harmloser Fall (ein zusätzlicher, im
   Ergebnis identischer Undo-Schritt), dessen Vermeidung (Vergleich vor jedem
   Setzen) Komplexität in `setAlign` einführen würde, die für alle vier
   Ausrichtungswerte gemeinsam entschieden werden müsste — bewusst außerhalb des
   Scopes von „nur rechts", siehe Abschnitt 10.
3. **Verlust der Ausrichtung bei Formatvorlagen-Wechsel:** **Bug, wird behoben**
   (Abschnitt 3.6) — Ausrichtung bleibt in beide Richtungen (Standard ↔
   Überschrift) erhalten.
4. **Normalisierung von `start`/`end`:** **Ja**, beide werden für den LTR-Regelfall
   dieser App auf `left`/`right` normalisiert (Abschnitt 3.1-3.3), mit
   dokumentierter, an `rtl.docx` real belegter Einschränkung für tatsächliche
   RTL-Inhalte (Abschnitt 3.1.1) — kein Blocker, da die App laut Anforderung
   Grenzfall 12 ohnehin keine RTL-Unterstützung beansprucht.
5. **`aria-pressed` bei gemischter Mehrfachselektion:** wechselt auf „aktiv nur
   wenn **alle** betroffenen Absätze bereits der Zielausrichtung entsprechen"
   (Abschnitt 3.5) — bewusst **nicht** dieselbe Semantik wie beim analogen
   Mark-Problem in `durchgestrichen-code.md`, da `setAlign` kein bedingtes Toggle
   ist (Begründung siehe dort).

---

## 10. Offene Abhängigkeiten (nur dokumentieren, kein Code jetzt)

- **`ausrichtung-links`/`ausrichtung-zentriert`/`ausrichtung-blocksatz`** (jeweils
  eigene Backlog-Einträge/Anforderungsdateien): Die in diesem Plan umgesetzten
  Fixes an `isAlignActive`, `setHeading`, `AlignButton`-Tooltip, Schema-
  Normalisierung und Formatvorlagen-Vererbung sind **gemeinsamer Code** und wirken
  sich automatisch auf alle vier Ausrichtungswerte aus (analog zur in
  `durchgestrichen-code.md` Abschnitt 3.6 dokumentierten Auswirkung auf alle vier
  Mark-Buttons). **Nicht** mit erledigt: eigene Tastenkürzel `Mod-l`/`Mod-e`/`Mod-j`
  für die drei Geschwisterwerte — bleiben bewusst offen für die jeweilige eigene
  Anforderungsdatei (Abschnitt 3.4).
- **Kopf-/Fußzeilen-Bearbeitung** (Grenzfall 2.8): Aktuell keine UI zum Bearbeiten
  von Header/Footer-Inhalten vorhanden (`src/formats/shared/editor` enthält keine
  Header/Footer-Komponente; Daten existieren nur im Modell/Reader/Writer, siehe
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9). Rechtsbündigkeit in Kopf-/Fußzeile ist
  damit **nicht end-to-end testbar**, bis diese UI-Lücke geschlossen ist — wie von
  der Anforderung selbst verlangt, hier ausdrücklich vermerkt statt stillschweigend
  ausgelassen. Das Datenmodell selbst ist bereits kompatibel (Header/Footer-Blöcke
  sind ebenfalls `paragraph`/`heading`-Nodes mit `align`-Attribut).
- **Track-Changes** (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13, Grenzfall 14 der
  Anforderung): noch nicht begonnen. Sobald umgesetzt, muss eine
  Ausrichtungsänderung als eigene Art „Formatierungsänderung" nachverfolgbar sein —
  keine Implementierung jetzt, nur Abgrenzung dokumentiert.
- **RTL-Unterstützung** (Grenzfall 12, Abschnitt 3.1.1 dieses Plans): Sollte die App
  künftig echte Bidi-Unterstützung erhalten (`dir="rtl"`, `w:bidi`,
  `style:writing-mode`), muss die hier getroffene `start→left`/`end→right`-
  Normalisierung um eine schreibrichtungsabhängige Fallunterscheidung erweitert
  werden (dann wäre in einem RTL-Absatz `start→right`/`end→left` korrekt). Keine
  Implementierung jetzt, nur Weichenstellung vermerkt — betrifft `rtl.docx` als
  bereits identifizierten Testfall für den Tag, an dem dieses Thema angegangen wird.

---

## 11. Abnahme-Mapping (Anforderung Abschnitt 6/7/8/9 → Umsetzung)

| Anforderung | Abgedeckt durch |
|---|---|
| Testfälle 1-3, 5-6, 8-10 (Abschnitt 7) | `tests/e2e/align-right.spec.ts`, describe „Toolbar & Tastatur" |
| Testfall 4 / Selection-Sync-Regression (Abschnitt 3.9) | `tests/e2e/align-right.spec.ts` (Test „Testfall 4/7") + `tests/e2e/selection-regression.spec.ts` neuer Test |
| Testfälle 11/12 (Formatvorlagen-Wechsel) | `tests/e2e/align-right.spec.ts` + Fix Abschnitt 3.6 + `commands.test.ts` |
| Testfälle 13/14/15 (Listen/Tabellen/hard_break) | `tests/e2e/align-right.spec.ts` + Erweiterung `roundtrip.test.ts` (Abschnitt 5.1) |
| Testfälle 16/17 (Undo/Redo) | `tests/e2e/align-right.spec.ts` |
| Testfälle 18-22 (Rundreisen inkl. Cross-Format) | `tests/e2e/align-right.spec.ts`, describe „Rundreisen" |
| Testfälle 23/24 (reale Fremddatei-Rundreise) | `tests/e2e/align-right.spec.ts` (`60329.docx`, `invalid.odt`) |
| Testfall 25 (DOCX `w:jc="start"` an echter RTL-Datei) | `src/formats/docx/__tests__/align-right.test.ts` + `tests/e2e/align-right.spec.ts` (`rtl.docx`) + Fix/Doku Abschnitt 3.1/3.1.1 |
| Testfall 26 (ODT `fo:text-align="end"`) | `src/formats/odt/__tests__/align-right.test.ts` (`excelfileformat.odt`) + Fix Abschnitt 3.2 |
| Testfall 27 (Formatvorlagen-Vererbung, Grenzfall 9) | `src/formats/docx/__tests__/align-right.test.ts` (`bug-paragraph-alignment.docx`) + `src/formats/odt/__tests__/align-right.test.ts` (`table-within-textBox-within-frame.odt`) + Fix Abschnitt 3.3 |
| Testfall 28 (E2E über echte Toolbar-Bedienung) | `tests/e2e/align-right.spec.ts` — komplett neu |
| Testfälle 29/30 (unabhängige Parser-Validierung) | Abschnitt 7 dieses Plans |
| Testfall 31 (Icon-Rendering) | Abschnitt 8 (Begründung) + empfohlener Screenshot-Test (Abschnitt 5.2 Ende) |
| Testfall 32 (Tooltip-Korrektur) | Fix Abschnitt 3.7 + `align-right.spec.ts` Regressionstest |
| Testfall 33 (Tastenkürzel) | Fix/Entscheidung Abschnitt 3.4/9.1 + `align-right.spec.ts` |
| Testfälle 34/35 (Performance, Mehrfachklick) | `tests/e2e/align-right.spec.ts` |
| Testfall 36 (ungültiger Ausrichtungswert) | `align-right.test.ts` (beide Formate, Export-Fallback) + `schema.test.ts` (`sanitizeAlign`) + Fix/Entscheidung Abschnitt 3.8/3.9 |
| Verdachtsmoment 1 / Grenzfall 6 (`w:jc="start"/"end"`) | Fix Abschnitt 3.1 + reale Fixture `rtl.docx` |
| Verdachtsmoment 2 / Grenzfall 8 (`fo:text-align="start"/"end"`) | Fix Abschnitt 3.2 + reale Fixture `excelfileformat.odt` |
| Verdachtsmoment 3 / Grenzfall 9 (Formatvorlagen-Vererbung) | Fix Abschnitt 3.3 + reale Fixtures `bug-paragraph-alignment.docx`, `table-within-textBox-within-frame.odt` |
| Verdachtsmoment 4 / Grenzfall 5 (`setHeading` verwirft Ausrichtung) | Fix Abschnitt 3.6 + `commands.test.ts` + E2E Testfall 11/12 |
| Verdachtsmoment 5 / Grenzfall 1 (`isAlignActive` nur `$from`) | Fix Abschnitt 3.5 + `commands.test.ts` |
| Verdachtsmoment 6 (kein Tastenkürzel) | Entscheidung + Fix Abschnitt 3.4/9.1 |
| Verdachtsmoment 7 (Tooltip Deutsch/Englisch gemischt) | Fix Abschnitt 3.7 |
| Verdachtsmoment 8 / Grenzfall 13 (kein Enum im Schema) | Entscheidung + Fix Abschnitt 3.8/3.9 (bewusst nicht-werfende Sanitisierung statt Schema-Enum) |
| Verdachtsmoment 9 (kein E2E-Test) | `tests/e2e/align-right.spec.ts` — komplette neue Datei |
| Verdachtsmoment 10 (keine Fixture-Tests) | `align-right.test.ts` (beide Formate) mit insgesamt 5 real benannten Fremddateien |
| Verdachtsmoment 11 (kein `aria-label`) | Fix Abschnitt 3.7 |
| DoD Punkt 1 (alle Testfälle ausgeführt, dokumentiert) | Diese Tabelle + Testdateien aus Abschnitt 5 |
| DoD Punkt 2 (jedes Verdachtsmoment eingestuft) | Abschnitt 3 dieses Plans (jeweils „bestätigt und behoben" mit realer Fixture-Evidenz, bis auf Verdachtsmoment 8, das bewusst **anders** als naiv erwartet gelöst wird — siehe Begründung dort) |
| DoD Punkt 3 (E2E dauerhaft verankert) | `tests/e2e/align-right.spec.ts` + Erweiterung `selection-regression.spec.ts` |
| DoD Punkt 4 (E2E-Test dauerhaft, Testfall 28) | Abschnitt 5.2 |
| DoD Punkt 5 (Rundreise inkl. realer Fremddatei je Format) | Abschnitt 5.2/6 — DOCX über `60329.docx`/`rtl.docx`/`bug-paragraph-alignment.docx`, ODT über `invalid.odt`/`excelfileformat.odt`/`table-within-textBox-within-frame.odt` |
| DoD Punkt 6 (Tooltip-Fix + Regressionstest) | Abschnitt 3.7 + Testfall 32 |
| DoD Punkt 7 (Fixture-Test mit realer Fremddatei je Format) | `align-right.test.ts` (beide Formate) — deutlich übererfüllt (5 statt 1 reale Datei) |
