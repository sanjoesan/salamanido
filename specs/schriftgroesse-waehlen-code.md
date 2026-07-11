# Schriftgröße wählen — dateigenauer Umsetzungsplan

Gegenstück zu `specs/schriftgroesse-waehlen-req.md` (**2. Fassung**). Dieses Dokument
beschreibt, nach tatsächlicher Codelektüre (nicht nur Backlog-/Anforderungsangabe), was am
bestehenden Code zu ändern ist, welche Dateien neu angelegt werden, und wie die in der
Anforderung geforderte Verifikation technisch umgesetzt wird. Alle Zeilenangaben wurden am
aktuellen Quellstand (Stand dieser Überarbeitung) **direkt nachgeschlagen** und gegenüber
der ersten Fassung dieses Plans korrigiert (die Quelldateien wurden zwischenzeitlich
editiert, wodurch die alten Zeilennummern verschoben waren).

## 0. TL;DR und Reconciliation gegenüber der 1. Fassung

Der Befund aus Abschnitt 7 der Anforderung ist **korrekt und wurde durch erneute
Codelektüre bestätigt**: Es existiert kein `fontSize`-Mark, kein Toolbar-Element, kein
Reader-/Writer-Code für Lauf-Schriftgrößen. Dies ist ein **echter Neubau**.

**Diese Fassung setzt den Reconciliation-Hinweis aus Anforderung Abschnitt 5 und
Abnahmekriterium 9.4 vollständig um.** Die erste Fassung dieses Plans wurde gegen die
**erste** Fassung der Anforderung geschrieben und enthielt drei Aussagen, die mit der
**überarbeiteten** Anforderung nicht mehr vereinbar sind. Sie werden hier korrigiert:

1. **Import bewahrt jetzt EXAKT — kein Runden, kein Clampen (zentrale Korrektur).** Die
   1. Fassung rundete importierte `w:sz`/`fo:font-size`-Werte über `roundToHalfPt` auf das
   0,5-pt-Raster (mit der damaligen Begründung „einheitliche Rundung gegen
   Cross-Format-Drift"). Anforderung 2.5/5 (2. Fassung) verlangt ausdrücklich das
   **Gegenteil**: importierte Werte werden unverändert erhalten, damit die verbindliche
   verlustfreie ODT-Rundreise (z. B. 10,3 pt → Export → Reimport = 10,3 pt) hält.
   `roundToHalfPt`/`clampFontSizePt` gelten ab jetzt **ausschließlich** für vom
   Bedienelement/Preset/Paste **neu gesetzte** Werte. Siehe Abschnitt 3.2 — das ist die
   wichtigste inhaltliche Änderung dieses Plans.
2. **Feldanzeige trennt „unformatierter Fließtext" von „gemischt".** Die 1. Fassung ließ
   `getFontSizeAtSelection` für gewöhnlichen Fließtext ohne Mark `null` zurückgeben und
   zeigte damit ein **leeres** Feld — was Anforderung 2.3/Element 4 (2. Fassung) jetzt
   explizit verbietet („statt eines verwirrend leeren Felds"). Korrigiert: unformatierter
   Fließtext zeigt den **App-Standard als Zahl** (11), das leere Feld/`—` ist strikt dem
   echten „gemischt"-Zustand (und dem textlosen Fall 4.8) vorbehalten. Siehe Abschnitt 3.5.
3. **Escape-vs-Blur-Race im Bedienelement behoben.** Der Combobox-Entwurf der 1. Fassung
   hätte bei Escape trotzdem committet (React-`setState` ist asynchron, der `onBlur`-Closure
   sähe das alte `editing===true`). Korrigiert über ein `editingRef` (Abschnitt 3.4).

Der Plan im Übrigen:

4. führt eine neue, von Schema, Commands, Toolbar und beiden Readern gemeinsam genutzte
   Utility-Datei `src/formats/shared/fontSize.ts` ein (Presets, Rundung, Clamping,
   Freitext-Parsing, App-Standard-Konstante) — damit dieselbe Logik nicht viermal
   dupliziert wird;
5. behebt einen **vorbestehenden, in `specs/unterstrichen-einfach-code.md` bereits
   benannten, aber nie umgesetzten** Ordnungs-Bug: `odt/styleRegistry.ts`
   `styleNameFor()` dedupliziert über `JSON.stringify(props)` mit
   einfügereihenfolge-abhängigem Schlüssel — Anforderung 3, Punkt 6 verlangt hier
   ausdrücklich einen reihenfolgestabilen Schlüssel (Abschnitt 4.10);
6. dokumentiert eine **schema-seitige Lücke**: `validate: 'number'` in `prosemirror-model`
   akzeptiert `NaN` (`typeof NaN === 'number'`). Die „kein stiller NaN"-Zusage (4.1/4.17)
   wird deshalb vollständig in Reader/`parseDOM`/Toolbar abgesichert, nicht im Schema
   (Abschnitt 3.7);
7. beantwortet die offene Frage 3.4 (App-Standardgröße) mit **11 pt als reinem UI-/CSS-Wert**
   (Feldanzeige-Fallback + `.ProseMirror`-CSS) und schreibt ihn — korrigiert gegenüber den
   früheren Fassungen dieses Plans — **bewusst NICHT** in `w:docDefaults`/den ODT-`Standard`-Stil,
   weil das zwei bereits grüne Tripwire-Tests bräche und die ausgelieferte Entscheidung „Kein
   Produktstandard" aus `neues-dokument-code.md` umkehren würde (Abschnitt 2 Fund 4, Abschnitt 3.3);
8. hält fest, dass die geforderte **exakte, ungerundete ODT-Rundreise (10,3 pt)** durch
   **keine** reale Fixture im Bestand nachweisbar ist (Scan über alle 202 ODT-Fixtures:
   einzige Nicht-Ganzzahl-Werte sind 17,5/21,5 pt, beide auf dem 0,5-Raster **und** auf
   `family="paragraph"`) — dafür ist ein **synthetisches** Fixture nötig (Abschnitt 6/7).
9. **korrigiert das DOCX-Fixture-Inventar in Abschnitt 7 selbst** (per direktem
   Regex-Scan der entpackten `word/document.xml` gegengeprüft, nicht aus der vorigen Fassung
   übernommen): Die vorige Fassung behauptete fälschlich, `bug59058.docx`s `w:sz`-Werte `27`
   und `33` lägen ausschließlich in `<w:pPr><w:rPr>` (Absatzmarke) und seien keine gültigen
   Teststellen — tatsächlich tragen beide zusätzlich **echte** `<w:r><w:rPr>`-Läufe mit
   sichtbarem Text (10× bzw. 1×), die Fixture ist damit reichhaltiger als bisher
   dokumentiert. Umgekehrt wurde `61470.docx` bisher fälschlich als „Alternativkandidat"
   geführt, obwohl seine einzigen `w:sz`-Werte entweder nur in einer textlosen
   Absatzmarke oder verschachtelt in einem vom Reader nicht aufgelösten `<w:ruby>`-Konstrukt
   liegen — diese Datei ist als Rundreise-Nachweis **nicht** verwendbar und wurde verworfen.
   Siehe Abschnitt 7 für die Details und die Verifikationsmethode.

---

## 1. Methodik dieser Prüfung

Direkt gelesen (vollständig, nicht nur überflogen): `src/formats/shared/schema.ts`,
`src/formats/shared/editor/commands.ts`, `src/formats/shared/editor/Toolbar.tsx`,
`src/formats/shared/editor/WordEditor.tsx`, `src/formats/docx/reader.ts`,
`src/formats/docx/writer.ts`, `src/formats/docx/styleDefs.ts`, `src/formats/odt/reader.ts`,
`src/formats/odt/writer.ts`, `src/formats/odt/styleRegistry.ts`, `src/index.css`, sowie zur
Test-Grundierung `src/formats/docx/__tests__/roundtrip.test.ts`,
`src/formats/odt/__tests__/roundtrip.test.ts`,
`src/formats/shared/editor/__tests__/commands.test.ts` und die Verzeichnisstruktur unter
`tests/e2e/` und den `__tests__`-Ordnern.

Zusätzlich wurde der reale Fixture-Bestand unter `tests/fixtures/external/{docx,odt}`
(127 DOCX, 202 ODT) **per Skript entpackt und durchsucht** (`unzip -p … | grep` auf
`w:sz`/`fo:font-size`), nicht vermutet — Ergebnis in Abschnitt 7. Der App-Standardwert und
das Re-Render-Verhalten der Toolbar wurden am Code verifiziert:
`WordEditor.tsx` ruft in `dispatchTransaction` (Zeile 125–132) bei **jeder** Transaktion
`forceRender((n) => n + 1)` auf (Zeile 131, außerhalb des `if (tr.docChanged)`-Zweigs
Zeile 128) — also auch bei reinen Selektionsänderungen. Damit
aktualisiert sich das neue Feld „bei jeder Cursor-Bewegung", genau wie das bestehende
Absatzformat-Dropdown (Anforderung Element 4). Das ist die Grundlage dafür, dass
`getFontSizeAtSelection(view.state)` im Toolbar-Render frisch ausgewertet wird.

---

## 2. Ist-Zustand nach Codelektüre — Abgleich mit der Anforderung

Bestätigt alle Aussagen aus Anforderung Abschnitt 7 (Zeilenangaben am **aktuellen** Stand):

| Fundstelle | Ist-Zustand | Deckt sich mit Anforderung? |
|---|---|---|
| `schema.ts` Zeile 157–196 | Marks `strong, em, underline, strike, textColor, highlight`; `textColor` 182–188, `highlight` 189–195; **kein** `fontSize` | Ja |
| `commands.ts` Zeile 106–122 | `applyMarkColor`/`clearMarkColor` geben bei `empty` Selektion `false` zurück; kein Äquivalent für Größe | Ja |
| `Toolbar.tsx` Zeile 184–187 | Fett/Kursiv/Unterstrichen/Durchgestrichen als `MarkButton`; **kein** Element für Schriftgröße/-art; `run()` 28–31 ruft `view.focus()`; `currentHeadingLevel()` 114–122 als Vorbild für Selektions-Ableitung | Ja |
| `docx/reader.ts` Zeile 100–115 | `marksFromRunProperties` liest `w:b/i/u/strike/color/shd`, **kein** `w:sz` | Ja |
| `docx/writer.ts` Zeile 20–33 | `runPropertiesXml` schreibt kein `w:sz` für Läufe | Ja |
| `docx/styleDefs.ts` Zeile 3, 25 | `HEADING_FONT_SIZES` (Halbpunkte) nur für `Heading N`-Formatvorlagen; `<w:docDefaults/>` (Zeile 25) **leer** | Ja |
| `odt/reader.ts` Zeile 14–21, 48–62 | `RunStyle`/`parseAutomaticStyles` (`family="text"`) liest Gewicht/Stil/Unterstreichung/Durchstreichung/Farbe/Hintergrund, **kein** `fo:font-size`; `family="paragraph"`-Zweig 63–67 liest **nur** `fo:text-align` | Ja |
| `odt/writer.ts` Zeile 32–43, 220 | `runPropsFromMarks` kennt kein `fontSize`-Feld; `buildStylesXml` definiert `Standard` (Zeile 220) **ohne** `style:text-properties` | Ja |
| `odt/styleRegistry.ts` Zeile 3–10, 30, 46–59, 77 | `RunProps` ohne `fontSize`; Dedup-Key `JSON.stringify(props)` (Zeile 30); `buildTextStyleXml` 46–59; `HEADING_FONT_SIZES` (pt) Zeile 77 nur für Überschriften | Ja |
| `index.css` Zeile 23–27 | `.ProseMirror` ohne explizite `font-size` (nur `outline`, `min-height`, `color`) | Ja |

Zusätzlich beim Audit gefunden (nicht in der Anforderungstabelle, Fix bzw. Abgrenzung
jeweils vermerkt):

1. **`odt/styleRegistry.ts` `styleNameFor` (Zeile 28–39), Dedup-Key (Zeile 30):**
   `const key = JSON.stringify(props)` — von der Objekt-Einfügereihenfolge abhängig.
   `runPropsFromMarks` (`odt/writer.ts` Zeile 32–43) befüllt `props` in **einer Schleife
   über `node.marks`**, d. h. die Einfügereihenfolge folgt der Reihenfolge des Mark-Arrays.
   Aus dem Editor kommen Marks zwar in kanonischer Schema-Rangfolge (kein Problem), aber
   handgebaute/direkt an `writeOdt` gereichte JSON-Dokumente (u. a. die Rundreise-Unit-Tests)
   können die Marks in abweichender Reihenfolge liefern → zwei identische Prop-Mengen
   erhielten zwei verschiedene `T`-Namen (doppelte, redundante Stil-Definitionen). Mit dem
   siebten Feld `fontSize` wächst die Angriffsfläche; Anforderung 3 Punkt 6 verlangt einen
   **reihenfolgestabilen** Schlüssel ausdrücklich. Fix in Abschnitt 4.10.
2. **`prosemirror-model`, `validate: 'number'`:** prüft nur `typeof value === 'number'`;
   `typeof NaN === 'number'` ist `true`. Ein Schema-Attribut `pt` mit `validate: 'number'`
   würde also einen `NaN`-Wert **nicht** ablehnen. Grenzfall 4.1/4.17 („kein stiller NaN")
   kann sich deshalb **nicht** auf das Schema verlassen — Absicherung in
   Reader/`parseDOM`/Toolbar (Abschnitt 3.7).
3. **Vorbestehender ODT-Reader-Gap (nicht Teil dieser Anforderung, dokumentiert zur
   Abgrenzung):** `parseAutomaticStyles` liest bei `family === 'paragraph'` **nur**
   `fo:text-align` (Zeile 63–67). Zeichenformatierung (Fett/Farbe **und** künftig Größe),
   die eine reale LibreOffice-Datei direkt in den `style:text-properties` einer
   **paragraph**-Formatvorlage ablegt (statt über einen `text:span`), geht dort schon
   **heute** für die bereits vorhandenen Marks verloren. Konkretes Beispiel im Bestand:
   `tableComplex_DOC_LO41.odt` trägt seine einzigen Nicht-Ganzzahl-Größen (21,5/17,5 pt)
   genau auf dieser Absatzformat-Ebene. Wird hier **nicht** behoben (Scope-Erweiterung auf
   alle Zeichenformate wäre nötig), ist aber der Grund, warum für Testfall 4.12/5.2 ein
   Fixture mit `family="text"`-Größe (z. B. `TestTextSelection.odt`) gewählt werden muss,
   nicht `tableComplex`.
4. **BLOCKER-FUND (in der 1./2. Fassung dieses Plans übersehen): die 11-pt-Export-Defaults
   aus 3.3 brechen zwei bereits grüne, absichtlich als Stolperdraht angelegte Tests und
   kehren eine ausgelieferte Produktentscheidung um.** Verifiziert am Quellstand:
   - `src/formats/docx/__tests__/styleDefs.test.ts` Zeile 11:
     `expect(xml).toMatch(/<w:docDefaults\s*\/>/)` erwartet ein **leeres**
     `<w:docDefaults/>` (Kommentar Zeile 10: „no product-wide font/size standard is
     enforced"), Zeile 19 zusätzlich: `Normal` trägt **kein** `w:sz`. Der ursprüngliche
     3.3/4.7-Vorschlag (`<w:docDefaults>…<w:sz w:val="22"/>…`) lässt genau diese Zusicherung
     **fehlschlagen**.
   - `src/formats/odt/__tests__/roundtrip.test.ts` Zeile 426:
     `expect(stylesXml).toMatch(/<style:style style:name="Standard" style:family="paragraph"\s*\/>/)`
     erwartet den `Standard`-Stil **selbstschließend/ohne** `style:text-properties`-Kind. Der
     ursprüngliche 3.3/4.9-Vorschlag (`…><style:text-properties fo:font-size="11pt"/></…>`)
     lässt auch diesen Test **fehlschlagen**.
   - Beide Tests sind **kein** Zufall: `specs/neues-dokument-code.md` Entscheidung 3
     („Schrift-Standard | **Kein Produktstandard.** Bleibt implizit … Wird nur explizit
     dokumentiert + regressionsgetestet, damit es keine stille Annahme bleibt", Zeile 31;
     Ist-Beleg Zeile 55–56; Test-Absicht Zeile 320–323: „damit eine künftige Änderung hier
     eine **bewusste Entscheidung** erfordert statt einer stillen Annahme"). Die 11-pt-Wahl
     ist außerdem **inkonsistent** mit dem Schwester-Plan
     `specs/schriftart-waehlen-code.md` Design-Entscheidung 1 („**Kein harter
     Produktstandard.**"). Konsequenz: 3.3 ist **neu gefasst** (siehe unten) — der
     App-Standard wirkt als **reiner UI-/CSS-Wert**, **nicht** als Export-Default; die
     11-pt-in-Export-Variante bleibt nur als ausdrücklich gekennzeichnete, teurere
     Alternative mit Pflicht zu Test-/Spec-Update + PO-Freigabe erhalten.

---

## 3. Architekturentscheidungen (vor dem dateigenauen Plan)

### 3.1 Neue Datei `src/formats/shared/fontSize.ts`

Presets, Wertebereich, Rundung, Freitext-Parsing und der App-Standard werden an mehreren
Stellen gebraucht (Schema-`parseDOM`, `commands.ts`, Toolbar) — als **eine** gemeinsame,
reine Utility-Datei (keine ProseMirror-Abhängigkeit, liegt in `shared/`, importierbar von
`docx/`/`odt/` ohne Zirkularität — exakt das bestehende Muster von `../shared/documentModel`):

```ts
// src/formats/shared/fontSize.ts
export const FONT_SIZE_MIN_PT = 1
export const FONT_SIZE_MAX_PT = 400
export const FONT_SIZE_STEP_PT = 0.5
/** App-Standard-Schriftgröße (Auflösung der offenen Frage 3.4, siehe Abschnitt 3.3).
 *  Zahlen-Quelle für die Feldanzeige-Fallback-Größe (reiner UI-Wert) und den Editor-CSS-Wert
 *  in `.ProseMirror` (dort per Hand als `11pt` gespiegelt, da CSS diese Konstante nicht
 *  importieren kann). BEWUSST NICHT in `w:docDefaults`/ODT-`Standard` gespiegelt — der Export
 *  bleibt default-frei (Abschnitt 3.3/Fund 4, `neues-dokument-code.md` Entscheidung 3). */
export const FONT_SIZE_DEFAULT_PT = 11
export const FONT_SIZE_PRESETS_PT = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72]

/**
 * Rundet auf den nächsten 0,5-pt-Schritt. NUR über clampFontSizePt (unten) für vom
 * Bedienelement/Preset/Paste NEU gesetzte Werte verwendet — NIEMALS auf importierte
 * Datei-Werte (siehe Anforderung 2.5, 2. Fassung: importierte Werte werden EXAKT erhalten;
 * siehe Abschnitt 3.2 dieses Plans).
 */
export function roundToHalfPt(pt: number): number {
  return Math.round(pt / FONT_SIZE_STEP_PT) * FONT_SIZE_STEP_PT
}

/**
 * Rundet UND begrenzt auf [1, 400] pt. Bewusst NUR für Werte, die die App selbst neu
 * setzt (Toolbar-Commit, Preset-Klick, Paste-Import via parseDOM, Grenzfall 4.9) —
 * NICHT für unverändert aus DOCX/ODT gelesene Werte (Abschnitt 3.2).
 */
export function clampFontSizePt(pt: number): number {
  return Math.min(FONT_SIZE_MAX_PT, Math.max(FONT_SIZE_MIN_PT, roundToHalfPt(pt)))
}

/**
 * Parst Freitext aus dem Schriftgrößenfeld. Akzeptiert deutsches Komma (Grenzfall 4.5).
 * Liefert `null` für alles, was keine positive Dezimalzahl ist (Grenzfall 4.1/4.2:
 * "abc", "", "0", "-5", "Infinity", "NaN", "1.2.3" → null → Feld springt auf letzten
 * gültigen Wert zurück). Kein parseFloat-/Number()-Fallback, der "12abc" oder das
 * String-Literal "Infinity" durchließe.
 */
export function parseFontSizeInput(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) && value > 0 ? value : null
}

/** Zeigt ganze Zahlen ohne Nachkommastelle, halbe Punkte mit deutschem Komma ("13,5"). */
export function formatFontSizePt(pt: number): string {
  return Number.isInteger(pt) ? String(pt) : String(pt).replace('.', ',')
}
```

Hinweis zur `parseFontSizeInput`-Regel: „0" und negative Eingaben liefern `null` und
lassen damit den **zuletzt gültigen** Wert stehen — das ist eine der beiden von
Anforderung 4.2 ausdrücklich erlaubten Varianten („springt auf den zuletzt gültigen Wert
**bzw.** auf 1 pt"). Werte oberhalb 400 werden dagegen geparst und anschließend von
`clampFontSizePt` sichtbar auf 400 gekappt (4.3).

### 3.2 Import bewahrt EXAKT — Rundung/Clamping nur für neu gesetzte Werte (Kernregel)

Dies ist die zentrale Auflösung des Reconciliation-Hinweises (Anforderung Abschnitt 5).
Zwei getrennte Wege:

- **Datei-Import (`docx/reader.ts`, `odt/reader.ts`): EXAKT, kein Runden, kein Clampen.**
  - DOCX `w:sz` ist ganzzahlig in Halbpunkten → `pt = wert / 2` ist von Natur aus auf dem
    0,5-Raster; „exakt" ist trivial erfüllt. **Kein** `roundToHalfPt`, **kein**
    `clampFontSizePt`.
  - ODT `fo:font-size` darf beliebige Dezimalen tragen (z. B. „10.3pt"): der Wert wird
    **unverändert** als `10.3` übernommen und beim unveränderten Re-Export wieder als
    „10.3pt" geschrieben. **Kein** Runden auf 10,5, **kein** Clampen.
  - Ein importierter Wert oberhalb 400 pt (real möglich, im Bestand nicht vorhanden) bleibt
    beim reinen Rundreise-Export erhalten; das 400-Clamping greift erst bei eigener
    Neueingabe (Word-Verhalten, Anforderung 2.5/4.12).
- **Neu gesetzte Werte (Toolbar-Commit, Preset, Paste via `parseDOM`): runden + clampen.**
  Anforderung 4.2/4.3/4.4/4.9 fordert das ausdrücklich, und die Schreibseite (DOCX `w:sz`
  = ganzzahlige Halbpunkte) profitiert davon, dass ein **neu** gewählter Wert auf dem
  0,5-Raster liegt.

Konsequenzen pro Stelle (verbindlich):

| Stelle | Rundung | Clamping | Begründung |
|---|---|---|---|
| `docx/reader.ts` | nein | nein | exakt, Anforderung 2.5/5 |
| `odt/reader.ts` | **nein** (Korrektur ggü. 1. Fassung) | nein | exakt, verlustfreie 10,3-pt-Rundreise |
| `schema.ts` `parseDOM` (Paste) | ja (`clampFontSizePt`) | ja | Grenzfall 4.9 |
| Toolbar-Commit | ja (`clampFontSizePt`) | ja | Anforderung 4.2–4.4 |
| `commands.ts` `setFontSize` | ja (`clampFontSizePt`, Verteidigungslinie) | ja | falls je aus anderem Kontext aufgerufen; ändert **nichts** an bereits im Dokument liegenden Werten |
| `docx/writer.ts` | `Math.round(pt*2)` (exakt für alle 0,5-Werte) | **nein** | durchgereichter >400-Wert muss unverändert herauskommen |
| `odt/writer.ts` | nein (`${pt}pt` wörtlich) | **nein** | exakt, auch 10,3 pt |

Zur DOCX-Writer-Rundung `Math.round(pt*2)`: für alle gültigen DOCX-Werte (ganzzahlige
Halbpunkte → `pt = k/2`) ist `Math.round(k/2*2) = k` **exakt**. Für einen aus ODT
importierten Nicht-0,5-Wert (10,3 pt), der als DOCX **cross-format** exportiert würde,
wäre das Ergebnis notwendig verlustbehaftet (21 Halbpunkte = 10,5 pt) — Cross-Format ist
laut Anforderung 5.1 (letzte Zeile) aber ausdrücklich nur **nachrichtlich** und nicht Teil
des verbindlichen Basis-Scopes; die reine ODT→ODT-Rundreise für 10,3 pt bleibt exakt.

### 3.3 Auflösung der offenen Frage 3.4 (App-Standardgröße): **11 pt, aber NUR als UI-/CSS-Wert — NICHT als Export-Default** (korrigiert)

Entscheidung dieses Plans (Anforderung 3.4 verlangt eine): Der App-Standard ist **11 pt**
(Word-Standard) und wird für die **Feldanzeige** und die **WYSIWYG-Editoroptik** verankert,
aber **bewusst NICHT in `w:docDefaults` bzw. den ODT-`Standard`-Stil geschrieben**. Damit
bleibt die Feature-Verifikation grün, ohne die in Fund 4 (Abschnitt 2) belegte, bereits
ausgelieferte und regressionsgetestete Produktentscheidung „Kein Produktstandard"
(`neues-dokument-code.md` Entscheidung 3) umzukehren. Diese Variante ist genau die in
Anforderung 3.4 ausdrücklich als zulässig genannte zweite Option („kein Mark ⇒
Zielanwendungs-Standard, nicht durch uns festgelegt") und ist konsistent mit dem
Schwester-Plan `schriftart-waehlen-code.md` (Design-Entscheidung 1).

- `src/index.css`, `.ProseMirror` (Zeile 23–27): `font-size: 11pt;` ergänzen. Bewusst die
  CSS-Einheit `pt` (Browser normieren `pt` per CSS-Spezifikation exakt auf 96 dpi:
  11 pt = 14,6667 px) — das macht Testfall 16 (WYSIWYG) messtechnisch exakt nachprüfbar
  (`getComputedStyle(...).fontSize === "14.6667px"`), ohne manuelle px-Umrechnung. **Rein
  Editor-Rendering, kein Test bewacht diese Regel, kein Einfluss auf den Export.**
- Die Feldanzeige nutzt `FONT_SIZE_DEFAULT_PT` (= 11) als **reinen UI-Fallback**
  (Abschnitt 3.5), sodass unformatierter Fließtext „11" statt eines leeren Felds zeigt
  (Anforderung 2.3/Element 4) — **ohne** dass dafür je ein `fontSize`-Mark oder ein
  Export-Default entsteht.
- `src/formats/docx/styleDefs.ts` `<w:docDefaults/>` (Zeile 25) bleibt **leer**;
  `src/formats/odt/writer.ts` `buildStylesXml` (Zeile 220) lässt `Standard`
  **selbstschließend/ohne** `style:text-properties`. Beide bestehenden Tripwire-Tests
  (Fund 4) bleiben damit grün, und die Rundreise-Zusage „kein erfundener Default beim
  unveränderten Re-Export" (Anforderung 3.4 letzter Satz, Abschnitt 5) hält bitgenau.
- **Dokumentierte Folge (bewusst, wie in Anforderung 3.4 für diese Variante benannt):** Ein
  im Editor als „11 pt" (kein Mark) angezeigter Fließtext öffnet in Word mit dessen
  Default (i. d. R. Calibri 11 pt = deckungsgleich) und in LibreOffice mit dessen Default
  (oft 12 pt = geringe optische Abweichung). Das ist der ausdrücklich akzeptierte Preis der
  Nicht-Festlegungs-Variante und **kein** durch dieses Ticket neu eingeführter Fehler.

**Alternative (nur mit ausdrücklicher PO-/Lead-Freigabe, NICHT der Default-Pfad dieses
Plans):** Sollen die 11 pt tatsächlich hart in den Export (`w:docDefaults` `w:sz=22` +
ODT-`Standard` `fo:font-size="11pt"`) — was die WYSIWYG-Treue in LibreOffice erhöht — dann
ist das eine **bewusste Umkehr** der Entscheidung aus `neues-dokument-code.md` und erfordert
zwingend, **im selben Commit**: (a) Anpassen von
`src/formats/docx/__tests__/styleDefs.test.ts` (Zeile 11) und
`src/formats/odt/__tests__/roundtrip.test.ts` (Zeile 426), (b) Nachziehen von
`neues-dokument-code.md` Entscheidung 3 / Abschnitt 5, (c) Abgleich mit
`schriftart-waehlen-code.md` Design-Entscheidung 1 (sonst driften Größe und Schriftart
auseinander). Ohne diese drei Schritte färbt die Variante CI rot — deshalb ist sie hier
**nicht** der empfohlene Weg.

**Konsistenz-Hinweis Überschriften (empfohlene, nicht blockierende Folge-Ergänzung):** Da
`.ProseMirror` neu auf 11 pt basiert und die Überschriften `h1`–`h6` im Editor ihre Größe
aktuell **nur** aus dem em-basierten Browser-Default beziehen (kein explizites
`font-size` in `index.css`), weicht die **optische** Editor-Größe einer Überschrift von
der Zahl ab, die das Feld gemäß Anforderung 2.4 dafür anzeigt (24/20/18/16/14/13 pt).
Dieser Versatz besteht **schon heute** (vor dieser Anforderung) und ist kein durch
Schriftgröße neu eingeführter Fehler; das Feld soll laut 2.4 bewusst die **Vorlagen**-Größe
zeigen. Empfehlung für einen Folge-Commit (nicht Teil des harten Scopes): explizite
`.ProseMirror h1..h6 { font-size: …pt }`-Regeln mit denselben 24/20/18/16/14/13 pt setzen,
damit In-App-Optik, Feldanzeige und Export für Überschriften ebenfalls übereinstimmen.

### 3.4 Kombiniertes Bedienelement: natives `<input list>` + Escape-sicherer Commit

Anforderung Element 5 erlaubt ausdrücklich „natives `<input list="…">`/Datalist" — das
wird gewählt, weil der Browser Pfeiltasten-Navigation und Enter-Übernahme kostenlos
mitbringt. Zwei Feinheiten:

**(a) Preset-Klick vs. Freitext unterscheiden.** Ein natives `<input list>` löst für
„Vorschlag angeklickt" und „Zeichen getippt" **dasselbe** `input`-Event aus. Chromium
(und damit alle in `playwright.config.ts` konfigurierten, Chromium-basierten Test-Targets)
setzt bei Auswahl eines Datalist-Vorschlags `InputEvent.inputType` auf
`"insertReplacementText"` (statt `"insertText"`). Daran wird der sofortige Preset-Commit
erkannt (Anforderung Element 2: sofort ohne Bestätigung), während Freitext erst bei
Enter/Blur committet (Element 3). **Dokumentiertes Restrisiko:** ändert sich dieses
Chromium-Verhalten oder weicht ein Nicht-Test-Browser (Firefox/Safari) ab, bleibt der
`onBlur`-Commit als Rückfallebene — der Preset würde dann erst beim Fokuswechsel wirksam
(kein Datenverlust, nur UX-Abweichung von Element 2). Falls beim Implementieren ein echter
Playwright-Lauf das als zu fragil zeigt: Fallback auf selbstgebautes Dropdown-Markup
(`<ul>` mit `onMouseDown`+`preventDefault()` pro Eintrag, wie die bestehenden
Toolbar-Buttons) — mehr Code, aber ereignis-eindeutig.

**(b) Escape darf NICHT committen (Korrektur ggü. 1. Fassung).** `setEditing(false)` ist
asynchron; ein `onBlur`-Closure, der nur die State-Variable `editing` prüft, sähe beim
durch `view.focus()` ausgelösten Blur noch `true` und würde die verworfene Eingabe doch
anwenden. Deshalb wird der Commit-on-Blur über ein **`editingRef`** (synchron gesetzt)
gesteuert:

```tsx
function FontSizeControl({ view }: { view: EditorView }) {
  const current = getFontSizeAtSelection(view.state) // Zahl (uniform) | null (gemischt/textlos)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const editingRef = useRef(false) // synchron, damit onBlur nicht am asynchronen State hängt

  const setEditingBoth = (v: boolean) => {
    editingRef.current = v
    setEditing(v)
  }
  const displayValue = editing ? draft : current === null ? '' : formatFontSizePt(current)

  function commit(rawValue: string) {
    setEditingBoth(false) // zuerst: verhindert Doppel-Commit durch nachfolgenden Blur
    const parsed = parseFontSizeInput(rawValue)
    if (parsed === null) return // 4.1/4.2: verwerfen; Anzeige springt sichtbar auf letzten gültigen Wert (4.19)
    run(view, setFontSize(clampFontSizePt(parsed))) // 4.3/4.4: Clamp+Rundung sichtbar; run() → view.focus()
  }

  return (
    <>
      <input
        aria-label="Schriftgröße"
        title="Schriftgröße (in Punkt)"
        list="font-size-presets"
        placeholder="—"
        value={displayValue}
        className="w-14 text-sm rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-1 py-1"
        onFocus={() => {
          setDraft(current === null ? '' : formatFontSizePt(current))
          setEditingBoth(true)
        }}
        onChange={(e) => {
          setDraft(e.target.value)
          const native = e.nativeEvent as InputEvent
          if (native.inputType === 'insertReplacementText') commit(e.target.value) // Preset-Klick (a)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit(draft)
          } else if (e.key === 'Escape') {
            e.preventDefault()
            setEditingBoth(false) // editingRef sofort false → der folgende Blur committet NICHT
            view.focus()          // stellt den vorher angezeigten Wert wieder her (displayValue = current)
          }
        }}
        onBlur={() => {
          if (editingRef.current) commit(draft)
        }}
      />
      <datalist id="font-size-presets">
        {FONT_SIZE_PRESETS_PT.map((pt) => (
          <option key={pt} value={formatFontSizePt(pt)} />
        ))}
      </datalist>
    </>
  )
}
```

Escape-Ablauf jetzt korrekt: `setEditingBoth(false)` setzt `editingRef.current = false`
**synchron** → `view.focus()` löst Blur aus → `onBlur` sieht `editingRef.current === false`
→ **kein** Commit → `displayValue` fällt auf `current` zurück (verworfen). Normaler Blur
(Klick in den Editor) lässt `editingRef.current === true` → Commit (Anforderung Element 3
„Fokusverlust"). Preset/Enter setzen den Ref vorab false → kein Doppel-Commit.

### 3.5 `getFontSizeAtSelection` — Anzeige inkl. „gemischt" und Default-Fallback

Neue Funktion in `commands.ts`, Vorbild `currentHeadingLevel()` (Anforderung Element 4),
aber über die **gesamte** Selektion (alle `selection.ranges`, nicht nur `$from`) und mit
Einbezug impliziter Überschriften-Größen **und** des App-Standards:

```ts
import { FONT_SIZE_DEFAULT_PT } from '../fontSize'
import type { Node as PMNode, ResolvedPos } from 'prosemirror-model'

const HEADING_FONT_SIZES_PT: Record<number, number> = { 1: 24, 2: 20, 3: 18, 4: 16, 5: 14, 6: 13 }

function headingSizeAt($pos: ResolvedPos): number | null {
  for (let depth = $pos.depth; depth >= 0; depth--) {
    const node = $pos.node(depth)
    if (node.type.name === 'heading') return HEADING_FONT_SIZES_PT[node.attrs.level as number] ?? null
    if (node.type.name === 'paragraph') return null
  }
  return null
}

/** Effektive Größe eines Textlaufs: expliziter Mark → sonst Überschriften-Vorlagengröße →
 *  sonst App-Standard. Liefert für Text IMMER eine Zahl (nie null) — das trennt
 *  "unformatierter Fließtext = 11" (2.3/Element 4, 2. Fassung) sauber vom "gemischt"-Fall. */
function effectiveFontSizePt(node: PMNode, $pos: ResolvedPos): number {
  const mark = wordSchema.marks.fontSize.isInSet(node.marks)
  if (mark) return mark.attrs.pt as number
  return headingSizeAt($pos) ?? FONT_SIZE_DEFAULT_PT
}

class MixedFontSizeSignal {} // Sentinel für Early-Exit (Grenzfall 4.15 Performance)

/**
 * Rückgabe: konkrete Zahl bei EINHEITLICHER Selektion/Schreibmarke (inkl. reinem
 * Fließtext → FONT_SIZE_DEFAULT_PT). `null` NUR für (a) echt gemischte Selektion (2.3)
 * oder (b) Selektion ohne jeden Textlauf (Bild/leere Zelle, Grenzfall 4.8) — beide zeigen
 * UI-seitig den Platzhalter "—".
 */
export function getFontSizeAtSelection(state: EditorState): number | null {
  const { selection } = state
  if (selection.empty) {
    const marks = state.storedMarks || selection.$from.marks()
    const mark = wordSchema.marks.fontSize.isInSet(marks)
    if (mark) return mark.attrs.pt as number
    return headingSizeAt(selection.$from) ?? FONT_SIZE_DEFAULT_PT
  }
  try {
    let seen: number | 'unset' = 'unset'
    for (const range of selection.ranges) {
      state.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, pos) => {
        if (!node.isText) return
        const value = effectiveFontSizePt(node, state.doc.resolve(pos))
        if (seen === 'unset') seen = value
        else if (seen !== value) throw new MixedFontSizeSignal()
      })
    }
    return seen === 'unset' ? null : seen // 'unset' = kein Textlauf gesehen → Platzhalter (4.8)
  } catch (err) {
    if (err instanceof MixedFontSizeSignal) return null
    throw err
  }
}
```

Was die Anforderung direkt fordert und hier abgedeckt ist:

- **Reiner Fließtext zeigt 11, nicht leer** (Korrektur ggü. 1. Fassung): `effectiveFontSizePt`
  fällt auf `FONT_SIZE_DEFAULT_PT` zurück, nie auf `null`. Damit ist `null` **exklusiv**
  „gemischt" (2.3) oder „textlos" (4.8) — genau die in der 2. Fassung geforderte Trennung.
- **Vergleich über EXAKTE pt-Werte, ohne Vor-Runden** (2.3): da der Reader jetzt exakt
  bewahrt, liegt z. B. 10,3 pt unverfälscht im Mark; `seen !== value` erkennt 10,3 neben
  10,5 korrekt als „gemischt". (Unter der alten Rundungslogik wären beide fälschlich 10,5
  gewesen — ein weiterer Grund für die Reconciliation aus 3.2.)
- **Alle `selection.ranges`** statt nur `from`/`to`: nötig für Tabellen-`CellSelection`
  (Grenzfall 4.6) — pro selektierter Zelle ein Range; `from`/`to` allein bezöge bei
  nicht-rechteckigen Selektionen Zwischeninhalt fälschlich ein. Bewusste Verbesserung
  gegenüber `applyMarkColor` (die nur `from`/`to` nutzen und laut Anforderung **kein**
  Vorbild sind).
- **Sentinel-Early-Exit** (4.15): `nodesBetween` hat keinen Geschwister-übergreifenden
  Abbruch (ein `false`-Return bricht nur den Abstieg ab). Die Exception beendet die
  Zählung beim ersten Widerspruch, statt ein „Alles auswählen"-Dokument komplett
  durchzuzählen.

Die `HEADING_FONT_SIZES_PT`-Tabelle dupliziert die Zahlen aus `odt/styleRegistry.ts` (pt)
bzw. `docx/styleDefs.ts` (Halbpunkte). Optionale, **nicht** blockierende Aufräum-Empfehlung:
auf eine gemeinsame `shared/headingFontSizes.ts`-Konstante konsolidieren (drei Quellen für
dieselben sechs Zahlen). Kein Blocker.

### 3.6 Commands `setFontSize`/`clearFontSize` — leere Selektion MUSS wirken

Anforderung 2.2/3 Punkt 2 verlangt das **Gegenteil** von `applyMarkColor`/`clearMarkColor`
(die bei leerer Selektion `false` liefern). Vorbild ist `toggleMark` aus
`prosemirror-commands` (`addStoredMark`/`removeStoredMark` bei Cursor-Selektion):

```ts
export function setFontSize(pt: number): Command {
  const clamped = clampFontSizePt(pt) // Verteidigungslinie (3.2); Toolbar clamped bereits selbst
  return (state, dispatch) => {
    const mark = wordSchema.marks.fontSize.create({ pt: clamped })
    if (dispatch) {
      let tr = state.tr
      if (state.selection.empty) {
        tr = tr.removeStoredMark(wordSchema.marks.fontSize).addStoredMark(mark)
      } else {
        for (const range of state.selection.ranges) tr = tr.addMark(range.$from.pos, range.$to.pos, mark)
      }
      dispatch(tr)
    }
    return true // bewusst IMMER true (Unterschied zu applyMarkColor, Anforderung 2.2) — im Code kommentieren
  }
}

export function clearFontSize(): Command {
  return (state, dispatch) => {
    if (dispatch) {
      let tr = state.tr
      if (state.selection.empty) {
        tr = tr.removeStoredMark(wordSchema.marks.fontSize)
      } else {
        for (const range of state.selection.ranges) tr = tr.removeMark(range.$from.pos, range.$to.pos, wordSchema.marks.fontSize)
      }
      dispatch(tr)
    }
    return true
  }
}
```

Alle Ranges in **einer** Transaktion → genau **ein** Undo-Schritt, auch bei
Tabellen-Zellselektion und sehr langer Selektion (4.10/4.15). Der bewusste
`return true`-Unterschied zu `applyMarkColor` ist im Code mit Verweis auf Anforderung 2.2
zu kommentieren, damit ein künftiger Refactor die Verhalten nicht versehentlich angleicht.
`applyMarkColor`/`clearMarkColor` bleiben **unverändert** (Verhaltensänderung an
Textfarbe/Hervorhebung gehört nicht in diese Anforderung).

### 3.7 Schema-Mark `fontSize`

```ts
// Ergänzung in src/formats/shared/schema.ts, im marks-Record nach highlight (Zeile 195):
fontSize: {
  attrs: { pt: { validate: 'number' } },
  parseDOM: [
    {
      style: 'font-size',
      getAttrs: (value) => {
        const match = /^([\d.]+)(pt|px)$/.exec(String(value).trim())
        if (!match) return false
        const raw = Number(match[1])
        const pt = match[2] === 'px' ? (raw * 72) / 96 : raw
        if (!Number.isFinite(pt) || pt <= 0) return false // NaN/±Infinity/0/negativ → kein Mark (Fund 2, 4.17)
        return { pt: clampFontSizePt(pt) } // Paste = neu gesetzter Wert → clampen (4.9/4.3)
      },
    },
  ],
  toDOM(mark) {
    return ['span', { style: `font-size: ${mark.attrs.pt}pt` }, 0]
  },
},
```

`schema.ts` importiert dafür `clampFontSizePt` aus `./fontSize`. Deckt Grenzfall 4.9 ab
(Copy&Paste mit `font-size`, `px` **und** `pt`, da Browser-Clipboard meist `px`,
Word-Clipboard meist `pt` liefert). Die `NaN`/`<=0`-Absicherung liegt bewusst in
`getAttrs`, nicht im Schema-`validate` (Fund 2). `paragraph`/`heading`/`list_item`/
`table_cell` erlauben bereits implizit alle Marks (keine `marks`-Einschränkung in den
NodeSpecs), genau wie bei `textColor`/`highlight`.

---

## 4. Dateigenauer Änderungsplan

### 4.1 Neu: `src/formats/shared/fontSize.ts`
Vollständiger Inhalt in Abschnitt 3.1. Reines TS-Utility ohne ProseMirror-Import.

### 4.2 `src/formats/shared/schema.ts`
Neuer Mark `fontSize` (Abschnitt 3.7), eingefügt nach `highlight` (nach Zeile 195, vor der
schließenden `}` des `marks`-Records in Zeile 196). Neuer Import am Dateikopf:
`import { clampFontSizePt } from './fontSize'`. Kein Node betroffen.

### 4.3 `src/formats/shared/editor/commands.ts`
Neu: `setFontSize` / `clearFontSize` (3.6), `getFontSizeAtSelection` (3.5). Neue Importe:
`clampFontSizePt, FONT_SIZE_DEFAULT_PT` aus `../fontSize`; `type { Node as PMNode,
ResolvedPos } from 'prosemirror-model'`. `wordSchema` ist bereits importiert (Zeile 4).
Einfügen nach `clearMarkColor` (nach Zeile 122). `applyMarkColor`/`clearMarkColor`/
`ColorMarkName` (Zeile 104–122) bleiben **unverändert**.

### 4.4 `src/formats/shared/editor/Toolbar.tsx`
Neue Komponente `FontSizeControl` (lokal, analog zu `MarkButton`/`AlignButton`), Code in
3.4. Import-Änderungen:
- Zeile 1 erweitern: `import { useRef, useState, type ChangeEvent } from 'react'`
  (aktuell wird nur `type { ChangeEvent }` importiert — `useState`/`useRef` fehlen noch).
- Aus `./commands` zusätzlich: `setFontSize, getFontSizeAtSelection` (und optional
  `clearFontSize`, s. u.).
- Neu aus `../fontSize`: `FONT_SIZE_PRESETS_PT, parseFontSizeInput, clampFontSizePt,
  formatFontSizePt`.

Einbindung in `Toolbar()`: unmittelbar vor der Fett/Kursiv/…-Gruppe (aktuell Zeile
182 der Divider, 184–187 die `MarkButton`s). Eine neue Divider-/Gruppen-Struktur mit
Kommentar auf die künftige Schriftart-Auswahl (`schriftart-waehlen`) links davon:

```tsx
<div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />
{/* Platz für künftige Schriftart-Auswahl (schriftart-waehlen) links von der Größe */}
<FontSizeControl view={view} />
<div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />
<MarkButton view={view} mark="strong" label="F" title="Fett" glyphClassName="font-bold" />
```

Bewusst **kein** separater „Schriftgröße entfernen"-Button (Anforderung Abschnitt 1 listet
keinen; anders als bei Textfarbe/Hervorhebung). `clearFontSize()` wird trotzdem exportiert,
damit die künftige `formatierung-loeschen`-Funktion es programmatisch nutzen kann.

### 4.5 `src/formats/docx/reader.ts`
`marksFromRunProperties` (Zeile 100–115), neuer Zweig **vor** `return marks` (nach der
`shd`/`highlight`-Behandlung Zeile 111–113):

```ts
const sz = firstChildNS(rPr, OOXML_NAMESPACES.w, 'sz')
const szVal = sz?.getAttributeNS(OOXML_NAMESPACES.w, 'val')
const szNum = szVal ? Number(szVal) : NaN
if (Number.isFinite(szNum) && szNum > 0) {
  marks.push({ type: 'fontSize', attrs: { pt: szNum / 2 } }) // EXAKT, kein Runden/Clampen (3.2)
}
```

**Kein** Import aus `fontSize.ts` nötig (bewusst weder `roundToHalfPt` noch
`clampFontSizePt`). `Number.isFinite && > 0` fängt fehlendes/leeres/nicht-numerisches
`w:val` sowie `w:val="0"`/negativ ab (4.17), bevor je ein `NaN` in den Mark gelangt (Fund 2).

### 4.6 `src/formats/docx/writer.ts`
`runPropertiesXml` (Zeile 20–33), neuer Zweig **vor** `return` (nach der `highlight`-Zeile
28–30):

```ts
if (mark.type === 'fontSize') {
  const halfPoints = Math.max(1, Math.round(Number(mark.attrs?.pt ?? 0) * 2)) // exakt für 0,5-Werte; KEIN Upper-Clamp
  props.push(`<w:sz w:val="${halfPoints}"/><w:szCs w:val="${halfPoints}"/>`)
}
```

`w:szCs` zusätzlich (Complex-Script-Konsistenz, Anforderung 3 Punkt 4). Der bestehende
Run-Merge in `inlineToRuns` (`JSON.stringify(buffer.marks) === JSON.stringify(node.marks)`,
Zeile 54) funktioniert mit `fontSize` unverändert: Läufe gleicher Größe werden
zusammengefasst, unterschiedliche Größen bleiben getrennte Läufe (ProseMirror liefert Marks
in stabiler Schema-Rangfolge, der Stringify-Vergleich ist damit deterministisch).

### 4.7 `src/formats/docx/styleDefs.ts`
**Keine Änderung (korrigiert, Abschnitt 3.3/Fund 4).** `headingStylesXml()` (Zeile 9–30)
bleibt vollständig unverändert: `HEADING_FONT_SIZES` als Vorlagen-Default (Anforderung 2.4)
und `<w:docDefaults/>` (Zeile 25) **leer**. Die frühere Fassung befüllte hier
`<w:docDefaults>` mit `w:sz=22` — das lässt `docx/__tests__/styleDefs.test.ts` Zeile 11
fehlschlagen und ist gestrichen. Der App-Standard 11 pt wirkt nur UI-/CSS-seitig (4.11/3.5).
Nur falls die PO die 11-pt-in-Export-Alternative (3.3) freigibt: `<w:docDefaults/>` →
`<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>`
**und** `styleDefs.test.ts` Zeile 11 mitziehen.

### 4.8 `src/formats/odt/reader.ts`
- `RunStyle`-Interface (Zeile 14–21): `fontSize?: number` ergänzen (nach `highlight?`
  Zeile 20).
- `parseAutomaticStyles`, `family === 'text'`-Zweig (Zeile 48–62), **vor**
  `textStyles.set(name, style)` (Zeile 62):

```ts
const fontSizeAttr = props.getAttributeNS(ODF_NAMESPACES.fo, 'font-size')
const fontSizeMatch = fontSizeAttr && /^([\d.]+)pt$/.exec(fontSizeAttr.trim())
if (fontSizeMatch) {
  const v = Number(fontSizeMatch[1])
  if (Number.isFinite(v) && v > 0) style.fontSize = v // EXAKT, KEIN roundToHalfPt (Korrektur ggü. 1. Fassung, 3.2)
}
```

- `marksFor` (nested in `decodeInline`, Zeile 100–112), **vor** `return marks` (Zeile 111):
  `if (style.fontSize !== undefined) marks.push({ type: 'fontSize', attrs: { pt: style.fontSize } })`.

**Bewusst kein** `roundToHalfPt`/`clampFontSizePt`. Nur reine `Xpt`-Werte werden übernommen;
Prozent-/cm-/unlesbare Werte matchen die Regex nicht bzw. scheitern an `isFinite && > 0` →
**kein** Mark, Text bleibt erhalten (4.17/4.18). Kein neuer Import aus `fontSize.ts`.

### 4.9 `src/formats/odt/writer.ts`
- `runPropsFromMarks` (Zeile 32–43), nach der `highlight`-Zeile (Zeile 40):
  `if (mark.type === 'fontSize') props.fontSize = mark.attrs?.pt as number`.
- `buildStylesXml` (Zeile 216–233): **keine Änderung (korrigiert, Abschnitt 3.3/Fund 4).**
  Der `Standard`-Stil (Zeile 220) bleibt selbstschließend/**ohne** `style:text-properties` —
  die frühere Fassung fügte hier `fo:font-size="11pt"` ein und ließ damit
  `odt/__tests__/roundtrip.test.ts` Zeile 426 fehlschlagen. Nur falls die PO die
  11-pt-in-Export-Alternative (3.3) freigibt: `Standard` um
  `<style:text-properties fo:font-size="11pt"/>` ergänzen **und** `roundtrip.test.ts`
  Zeile 426 mitziehen.

### 4.10 `src/formats/odt/styleRegistry.ts`
- `RunProps` (Zeile 3–10): `fontSize?: number` ergänzen.
- `isEmpty` (Zeile 12–14): `props.fontSize === undefined` in die Und-Verknüpfung aufnehmen
  (`=== undefined` statt Falsy, da theoretisch kein 0-Wert vorkommt, aber sauber explizit):
  ```ts
  return !props.bold && !props.italic && !props.underline && !props.strike && !props.color && !props.highlight && props.fontSize === undefined
  ```
- `styleNameFor` (Zeile 28–39): **Fix des Dedup-Bugs (Fund 1)** — reihenfolgestabiler
  Schlüssel über ein kanonisches Array statt `JSON.stringify(props)` (Zeile 30):
  ```ts
  const key = JSON.stringify([
    props.bold ?? false, props.italic ?? false, props.underline ?? false,
    props.strike ?? false, props.color ?? null, props.highlight ?? null, props.fontSize ?? null,
  ])
  ```
  Feste Positionen → identische Prop-Mengen ergeben identische Schlüssel (keine
  Doppel-Definitionen), verschiedene Mengen verschiedene Schlüssel (keine Fehlkollision) —
  Anforderung 3 Punkt 6 erfüllt.
- `buildTextStyleXml` (Zeile 46–59): vor dem `return` ergänzen
  `if (props.fontSize !== undefined) attrs.push(\`fo:font-size="${props.fontSize}pt"\`)`.
  `${props.fontSize}` schreibt den Wert **wörtlich** (10,3 → „10.3pt") → exakter ODT-Export.
- `HEADING_FONT_SIZES`/`headingStyleDefs()` (Zeile 77–93) bleiben **unverändert**.

### 4.11 `src/index.css`
`.ProseMirror`-Regel (Zeile 23–27): `font-size: 11pt;` ergänzen (Abschnitt 3.3). Optionale
Heading-Regeln siehe 3.3-Hinweis (nicht blockierend).

---

## 5. Bewusst NICHT geänderter Code

- `WordEditor.tsx` — **keine Änderung nötig.** `reconcileSelectionOnClick` (Zeile 43–50)
  ist formatneutral → Grenzfall 4.11 ohne Codeänderung abgedeckt (nur E2E-Test fehlt,
  Abschnitt 6). Keine neue Keymap-Bindung — Anforderung Element 1 nennt ausdrücklich
  **keine** Tastenkombination als Scope. Der `forceRender((n) => n + 1)`-Aufruf im
  `dispatchTransaction` (Zeile 125–132, `forceRender` Zeile 131, außerhalb des
  `if (tr.docChanged)`-Zweigs Zeile 128) sorgt bereits für die Feld-Aktualisierung bei
  **jeder** Transaktion inkl. reiner Selektionsänderung.
- `applyMarkColor`/`clearMarkColor` in `commands.ts` — unverändert (4.3).
- `headingStylesXml()`/`HEADING_FONT_SIZES` in beiden Formaten — **vollständig unverändert**
  (Korrektur ggü. früheren Fassungen, Abschnitt 3.3/Fund 4): Weder `docDefaults` (DOCX) noch
  der `Standard`-Stil (ODT) bekommen einen App-Default; der 11-pt-Standard wirkt rein
  UI-/CSS-seitig (4.11/3.5).
- `docx/relationships.ts`, beide `imageCollector.ts`, beide `xmlUtil.ts`,
  `pageSetup.ts`/`pageGeometry.ts` — kein Bezug zu Zeichenformatierung.

---

## 6. Neue/erweiterte Testdateien

### 6.1 Unit-Tests (Vitest)

**Neu: `src/formats/shared/__tests__/fontSize.test.ts`** (Utility-Ebene, kein DOM):
```ts
import { roundToHalfPt, clampFontSizePt, parseFontSizeInput, formatFontSizePt } from '../fontSize'
// roundToHalfPt: [13.37→13.5], [13.1→13], [13.26→13.5], [10→10]
// clampFontSizePt: 0→1, -5→1 (4.2); 5000→400 (4.3); 399.8→400 (Runden+Clampen)
// parseFontSizeInput: "12,5"→12.5 (4.5); "abc"/""/"0"/"-5"/"Infinity"/"NaN"/"1.2.3"→null (4.1/4.2)
// formatFontSizePt: 12→"12"; 13.5→"13,5"
```

**Neu: `src/formats/docx/__tests__/fontSize.test.ts`** (Reader-Robustheit, `buildDocxWithRun`-
Helfer analog `specs/unterstrichen-einfach-code.md`):
```ts
// w:sz val="24" → pt 12 (Preset)
// w:sz val="26" → pt 13 (Nicht-Preset, 4.12: NICHT auf Preset gerundet)
// w:sz val="27" → pt 13.5 (Halbpunkt)
// fehlendes w:sz → KEIN fontSize-Mark
// w:sz val="abc" / "0" / "-2" → KEIN Mark, kein Crash, kein NaN (4.17, Fund 2)
// w:sz val="1000" → pt 500, NICHT auf 400 geclamped (3.2 — reiner Import bewahrt exakt)
```

**Neu: `src/formats/odt/__tests__/fontSize.test.ts`** (Reader + echte Fixtures aus Abschnitt 7):
```ts
// synthetisches content.xml: family="text"-Stil fo:font-size="10.3pt" → pt EXAKT 10.3 (KEIN 10.5!) — Kernnachweis 2.5
// fo:font-size="120%"  → KEIN Mark (4.18)
// fo:font-size="0.5cm" → KEIN Mark (4.18)
// fo:font-size="0pt"/"-3pt" → KEIN Mark (4.17)
// echte Fixture TestTextSelection.odt: Stil T10 (13pt, family="text") am erwarteten text:span (4.12)
// echte Fixture bigFont.odt: 72pt (Preset) am Textlauf
```

**Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts`** und
**`src/formats/odt/__tests__/roundtrip.test.ts`** — neuer `describe`-Block „font size" (die
Helfer `doc()`, `paragraph(text, align, marks)`, `roundTrip()` sind in beiden Dateien
bereits vorhanden und direkt wiederverwendbar):
```ts
// preserves preset size 14pt
// preserves non-preset size 13pt (4.12)
// preserves half-point size 10.5pt (4.16)
// ODT NUR: preserves an off-grid decimal 10.3pt EXACTLY (kein 10.5) — verbindlicher Nachweis 2.5/5.1
// preserves fontSize + strong + textColor auf demselben Lauf (5.1 Zeile 5)
// preserves expliziten fontSize-Mark (z. B. 30pt) auf einem Lauf INNERHALB heading level 1;
//   Rest der Überschrift ohne Mark bleibt (implizit 24pt) — 2.4/5.1 Zeile 6
```

**Erweiterung: `src/formats/odt/__tests__/roundtrip.test.ts`** — Regressionstest für den
Dedup-Key-Fix (4.10), mit `fontSize` als zusätzlichem Feld:
```ts
it('erzeugt keinen doppelten automatischen Textstil bei gleicher strong+fontSize-Kombination in unterschiedlicher Mark-Reihenfolge', async () => {
  // Lauf A marks:[strong, fontSize:14], Lauf B marks:[fontSize:14, strong] im selben Absatz
  // → content.xml enthält genau EINE <style:style style:name="T…"> für diese Kombination
})
```

### 6.2 E2E-Tests (Playwright)

**Neu: `tests/e2e/font-size.spec.ts`** — Struktur analog `tests/e2e/docx.spec.ts`/`odt.spec.ts`/
`selection-regression.spec.ts` (bestehende Card-/Fixture-Helfer aus `tests/e2e/fixtures.ts`
wiederverwenden). Zwei `describe`-Blöcke:

*Toolbar & Tastatur:*
1. Feld sichtbar, per Tab erreichbar, `getByLabel('Schriftgröße')` vorhanden (Testfall 1/4.19)
2. Preset-Klick wendet sofort an, `font-size: 24pt` im DOM, Fokus zurück im Editor (2.1.3)
3. Freitext „13,37" + Enter → sichtbar „13,5" (Rundung 4.4)
4. Größe ohne Selektion → nur neu getippter Text bekommt sie, umgebender Text unverändert (2.2)
5. Gemischte Selektion → leeres Feld/„—"; neue Größe vereinheitlicht (2.3/4.6); **und**:
   uniforme Fließtext-Selektion → Feld zeigt „11" (nicht leer) — Nachweis der 2.-Fassung-Korrektur
6. Größe in Überschrift übersteuert sichtbar die Vorlagen-Größe, Rest unverändert (2.4/4.7)
7. Ungültig „abc"→alter Wert; „0"→zurück; „5000"→400 (4.1–4.3), sichtbare Rückmeldung (4.19)
8. Deutsches Komma „12,5" akzeptiert (4.5)
9. Undo/Redo als ein Schritt (4.10)
- Escape verwirft Freitext ohne Anwendung (Element 3) — deckt gezielt den Ref-Fix aus 3.4 ab
- Anwenden auf Bild/leere Zelle → keine Exception, Feld zeigt „—" (4.8)
- Paste `<span style="font-size: 22px">…</span>` → ~16,5 pt übernommen (px→pt, 4.9)
- Zwei schnelle Änderungen → letzter Wert gewinnt deterministisch (4.14)
- „Alles auswählen" + Größe bleibt performant, Undo als ein Schritt (4.15)

*Rundreisen (Anforderung Abschnitt 5):*
- DOCX: Editor-Text mit expliziter Größe → Export → Reimport (exakt)
- ODT: dito
- reale DOCX-Fixture (Abschnitt 7) mit mehreren Lauf-Größen inkl. Nicht-Preset
- reale ODT-Fixture (Abschnitt 7) mit mehreren Lauf-Größen inkl. Nicht-Preset
- Kombination Größe+Fett+Farbe, DOCX **und** ODT
- Größe auf Lauf innerhalb Überschrift, DOCX **und** ODT
- Testfall 16/WYSIWYG (korrigiert, Abschnitt 3.3/Fund 4): ohne Interaktion
  `getComputedStyle('.ProseMirror').fontSize === "14.6667px"` (11 pt via CSS) UND der Export
  enthält **weder** einen `w:docDefaults`-`w:sz` (DOCX — `<w:docDefaults/>` bleibt leer)
  **noch** ein `fo:font-size` im `Standard`-Stil (ODT — selbstschließend) **noch** irgendeinen
  Lauf-`fontSize`-Mark/`w:sz`/`fo:font-size` (3.4 letzter Satz: kein erfundener Default). Die
  bestehenden Tripwire-Tests `docx/__tests__/styleDefs.test.ts` Zeile 11 und
  `odt/__tests__/roundtrip.test.ts` Zeile 426 bleiben unverändert grün.

**Erweiterung: `tests/e2e/selection-regression.spec.ts`** — neuer Test wie der bestehende
„Fett"-Regressionstest, aber mit Schriftgröße statt Fett (Grenzfall 4.11): Alles auswählen
→ `getByLabel('Schriftgröße').fill('24')` + Enter → Klick zum Neupositionieren → Enter →
Dokumentinhalt (beide Absätze) intakt, keine Löschung/Ersetzung.

---

## 7. Fixture-Inventar — reale Rundreise-Testkandidaten (Anforderung 5.2)

Ermittelt per Skript (`unzip -p … | grep` über **alle** Dateien in
`tests/fixtures/external/{docx,odt}`), nicht durch Vermutung.

**DOCX** (`w:sz` **im Lauf-Kontext** `<w:r><w:rPr>`, verifiziert per XML-Dump):

| Datei | Lauf-`w:sz` (Halbpunkte → pt) | Eignung |
|---|---|---|
| `bug59058.docx` | `26`=13 pt (**Nicht-Preset**, 4.12); `17`=8,5 pt, `19`=9,5 pt, `27`=13,5 pt und `33`=16,5 pt (**Halbpunkte**, 4.16) | **Primärkandidat** Rundreise 3/12 — Nicht-Preset **und** mehrere Halbpunkt-Werte in einer Datei, alle fünf in echten `<w:r><w:rPr>` mit sichtbarem `<w:t>`-Text verifiziert (siehe Korrektur unten) |
| `IllustrativeCases.docx` | `16`=8, `18`=9, `22`=11, `24`=12 pt | Alternativ — mehrere unterschiedliche Größen (5.2 „mind. drei"); `22`=11 ist der App-Standard (~319×) |
| `61470.docx` | **nicht verwendbar** (siehe Korrektur unten) | Verworfen |

**Korrektur dieser Prüfung (per Skript direkt gegengelesen, nicht aus einer früheren Fassung
übernommen — die vorige Fassung dieses Plans lag hier falsch):**

- **`bug59058.docx`, `w:sz val="27"`/`"33"`:** Die vorige Fassung behauptete, beide Werte
  lägen ausschließlich in **Absatzmarken**-`<w:pPr><w:rPr>` (Pilcrow) und seien deshalb keine
  gültigen Teststellen. Eine direkte Skript-Prüfung (Regex-Scan über alle `<w:r>…</w:r>`- und
  `<w:pPr>…</w:pPr>`-Blöcke von `word/document.xml`, getrennt nach „mit nicht-leerem
  `<w:t>`-Text im selben Lauf" vs. „nur in `<w:pPr><w:rPr>`") widerlegt das: `27` (13,5 pt)
  trägt **10** echte `<w:r><w:rPr>`-Läufe mit sichtbarem Text (u. a. „Review Article"), `33`
  (16,5 pt) **1** solchen Lauf (der Artikeltitel „Plasma Levels of Polychlorinated
  Biphenyls…"). Beide Werte kommen zusätzlich **auch** in `<w:pPr><w:rPr>` vor (das war der
  Teil, den die vorige Fassung korrekt sah) — aber eben **nicht nur** dort. Der Reader liest
  ohnehin bewusst nur `<w:r><w:rPr>` (nicht `<w:pPr><w:rPr>`, korrekt so, siehe 4.5), sodass
  diese fünfte/sechste Fundstelle die Fixture **stärkt** statt schwächt: `bug59058.docx`
  deckt mit `17/19/26/27/33` (8,5/9,5/13/13,5/16,5 pt) fünf statt drei verifizierte
  Lauf-Halbpunktwerte auf sichtbarem Text ab, `26` bleibt zusätzlich der Nicht-Preset-Beleg
  für 4.12.
- **`61470.docx` ist entgegen der vorigen Fassung NICHT als Fixture geeignet** und wird
  hiermit verworfen, statt die Falschangabe weiterzutragen: Von den drei behaupteten Werten
  liegt `16` (8 pt) ausschließlich im `<w:pPr><w:rPr>` der letzten, textlosen
  Absatzmarke — kein sichtbarer Lauf. `22` (11 pt) und `11` (5,5 pt) liegen zwar in echten
  `<w:r><w:rPr>`-Elementen, aber **verschachtelt innerhalb von `<w:ruby>`** (japanische
  Furigana-Anmerkung: `<w:r><w:ruby><w:rt><w:r>…とうきょう…</w:r></w:rt><w:rubyBase><w:r>…
  東京…</w:r></w:rubyBase></w:ruby></w:r>`). `decodeRunElement` (`docx/reader.ts`) iteriert
  nur über die **direkten** Kinder eines `<w:r>` und kennt nur `w:t`/`w:br`/`w:drawing`/
  `w:pict` — ein `w:ruby`-Kind wird nicht erkannt, die tiefer verschachtelten `<w:r>` in
  `<w:rt>`/`<w:rubyBase>` werden vom Reader **nie erreicht** (der sichtbare Text „東京" geht
  bereits heute, unabhängig von dieser Anforderung, beim Import verloren — vorbestehender,
  hier nicht zu behebender Gap). Diese Fixture würde also gar keinen `fontSize`-Mark
  erzeugen und ist als Rundreise-Nachweis ungeeignet.

Der Primärkandidat `bug59058.docx` und der Alternativkandidat `IllustrativeCases.docx`
bleiben davon unberührt und ausreichend für 5.2 („mind. drei unterschiedliche Größen" sowie
„mind. ein Halbpunkt-Wert" sind mit `bug59058.docx` allein bereits übererfüllt).

**ODT** (`fo:font-size` auf `style:family="text"`, über `text:span` referenziert, verifiziert):

| Datei | `family="text"`-Größen | Eignung |
|---|---|---|
| `TestTextSelection.odt` | Stil `T10`=13 pt und `T21/T22`=15 pt (**Nicht-Preset**); außerdem 8/18/20 pt | **Primärkandidat** 4.12/5.2 — mehrere unterschiedliche, `family="text"`-Größen inkl. Nicht-Preset |
| `bigFont.odt` | 72 pt (Preset), `family="text"` | Einfacher Positivtest |
| `excelfileformat.odt` / `Seasonal_Fruits2_en.odt` | 4–36 pt, mehrere Werte | Alternativ für „mind. drei Größen" |
| `tableComplex_DOC_LO41.odt` | 21,5 / 17,5 pt | **NICHT verwendbar** — auf `family="paragraph"` (Stil `P2`), vorbestehender Reader-Gap (Abschnitt 2, Fund 3) |

**Kritische Lücke (verifiziert per Vollscan):** Über **alle 202** ODT-Fixtures sind die
**einzigen** Nicht-Ganzzahl-Werte 17,5 und 21,5 pt — beide auf dem 0,5-Raster **und** nur
auf `family="paragraph"`. Es existiert **keine** reale ODT-Fixture mit einem
**off-grid** (Nicht-0,5-)Wert auf Lauf-Ebene. Anforderung 5.2 fordert aber ausdrücklich
„mindestens ein ODT-Wert außerhalb des 0,5-pt-Rasters (z. B. 10,3 pt)". → **Ein
synthetisches Fixture ist zwingend**: entweder ein handgebautes `content.xml` mit einem
`family="text"`-Stil `fo:font-size="10.3pt"` als Unit-Test-Konstante (bevorzugt, siehe
`odt/__tests__/fontSize.test.ts` in 6.1 und der ODT-Rundreise-Test 10,3 pt in 6.1), oder
eine eingecheckte `tests/fixtures/…/fontsize-10_3pt.odt`. Dieses Fixture ist der
verbindliche Nachweis der exakten, ungerundeten ODT-Rundreise (2.5/5.1/DoD 9.3).

Für „mindestens eine Überschrift mit Lauf abweichender expliziter Größe" (2.4/4.7) wurde
**keine** passende reale Fixture gefunden → ebenfalls handgebaut (analog `buildSampleDocx`/
`buildSampleOdt` in den E2E-Specs), wie in `specs/unterstrichen-einfach-code.md` Abschnitt
5.1 für Nicht-Standard-Werte bereits vorgemacht.

---

## 8. Abnahme-Mapping (Anforderung Abschnitt 8/9 → Testartefakt)

| Anforderung | Abgedeckt durch |
|---|---|
| Testfälle 1–9 (Abschnitt 8) | `tests/e2e/font-size.spec.ts`, „Toolbar & Tastatur" |
| Rundreise 10–15 | `font-size.spec.ts` „Rundreisen" + beide `roundtrip.test.ts` (isoliert, ohne Browser) |
| 4.1–4.5 (Eingabevalidierung) | `shared/__tests__/fontSize.test.ts` + E2E 7/8 |
| 4.6 (Tabellen-Mehrfachselektion) | E2E 5; `selection.ranges` in 3.5/3.6 |
| 4.7 (Überschrift+Fließtext) | E2E 6; Rundreise-Test „heading override" |
| 4.8 (Bild/leere Zelle → „—") | E2E dediziert; `null`-Zweig in 3.5 |
| 4.9 (Paste px/pt) | E2E dediziert; `schema.ts` `parseDOM` (3.7) |
| 4.10/4.11 (Undo, Selection-Sync) | E2E 9; `selection-regression.spec.ts` neuer Test |
| 4.12 (Nicht-Preset-Fremdwert) | `docx`/`odt` `fontSize.test.ts` (Fixtures Abschnitt 7) |
| 4.13 (Kopf-/Fußzeile) | nachrichtlich, kein Blocker (UI existiert noch nicht) |
| 4.14 (Race) | E2E dediziert |
| 4.15 (Performance) | E2E dediziert; Sentinel-Early-Exit (3.5) |
| 4.16 (Halbpunkt-Rundreise) | beide `roundtrip.test.ts`; E2E Rundreise 3/4 |
| **4.16 exakt off-grid (10,3 pt ODT)** | `odt/__tests__/fontSize.test.ts` + ODT-`roundtrip.test.ts` (synthetisch, Abschnitt 7) |
| 4.17/4.18 (fehlerhaft/relativ) | `docx`/`odt` `fontSize.test.ts` |
| 4.19 (Bedienelement-Robustheit) | E2E 1/7; Ref-Fix (3.4) |
| 5.1 (Rundreise-Matrix) | `font-size.spec.ts` „Rundreisen" + beide `roundtrip.test.ts` |
| 5.2 (Mindestabdeckung) | Abschnitt 7 (reale Fixtures) + synthetisches 10,3-pt-Fixture + handgebautes Überschrift+Override |
| DoD 9.4 (Reconciliation 2.5/Reader-exakt) | Abschnitt 0 + 3.2 + 4.5/4.8 dieses Plans |
| DoD 9.5 (App-Standard beantwortet) | 11 pt **als UI-/CSS-Wert, NICHT als Export-Default** (Abschnitt 3.3 korrigiert, Fund 4) + WYSIWYG-E2E; bewahrt `neues-dokument-code.md`-Entscheidung 3 + beide Tripwire-Tests |
| DoD 9.6 (kein Fund ohne Vermerk) | Abschnitt 2 (Zusatzfunde) + Abschnitt 5 (bewusst unverändert) |

---

## 9. Offene Abhängigkeiten (nur dokumentieren, kein Code jetzt)

- **`schriftart-waehlen`**: UI-Platz links von `FontSizeControl` (Kommentar in 4.4 markiert
  die Stelle).
- **`schrift-vergroessern`/`schrift-verkleinern`**: müssen laut Anforderung Abschnitt 6
  denselben `fontSize`-Mark und `setFontSize`/`clampFontSizePt` wiederverwenden
  (Inkrement auf `getFontSizeAtSelection()`-Wert, dann durch `clampFontSizePt`).
- **`formatierung-loeschen`**: soll `clearFontSize()` (bereits exportiert, 3.6/4.3) in ihre
  Clear-Logik aufnehmen.
- **`kopfzeile-bearbeiten`/`fusszeile-bearbeiten`** (4.13): Schriftgröße funktioniert dort
  automatisch identisch (gleicher `wordSchema`, bereichsunabhängige Commands), dedizierter
  E2E-Test erst sinnvoll, sobald die Editier-UI existiert.
- **Optionale Konsolidierung** `HEADING_FONT_SIZES` (DOCX-Halbpunkte / ODT-Punkte /
  UI-Punkte) auf eine gemeinsame Konstante (3.5/4.7/4.10) — kein Blocker.
- **Optionale Heading-CSS-Angleichung** (3.3-Hinweis): explizite `.ProseMirror h1..h6`-
  Größen für vollständige WYSIWYG-Konsistenz der Überschriften — kein Blocker.
