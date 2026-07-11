# Schriftfarbe — dateigenauer Umsetzungsplan

Gegenstück zu `specs/schriftfarbe-req.md`. Beschreibt, nach **echter, erneut
verifizierter** Codelektüre (nicht Backlog-Angabe, nicht Übernahme aus einem früheren
Entwurf) und nach programmatischer Prüfung des realen Fixture-Bestands
(`tests/fixtures/external/{docx,odt}`), was am bestehenden Code zu ändern ist, welche
Dateien neu angelegt werden und wie die geforderte Verifikation technisch umgesetzt wird.
Es ist zugleich die in `schriftfarbe-req.md` Abschnitt 3.2 / Abnahmekriterium 4 geforderte
**Nachfolgedatei**, die die Entscheidung zum Verhalten bei leerer Selektion explizit
festhält (Abschnitt 3.3).

Alle Zeilenangaben wurden am 2026-07-04 **direkt am aktuellen Quellcode** gegengelesen
(nicht aus `schriftfarbe-req.md` übernommen). Wo eine Angabe verrutschen kann, ist
zusätzlich die tragende Funktion genannt.

## 0. TL;DR

Schema, Toolbar, Befehle sowie DOCX-/ODT-Reader/Writer existieren und decken den Grundfall
(„Selektion markieren → Farbe setzen/entfernen") funktional ab. Die Referenztabelle in
`schriftfarbe-req.md` (Abschnitt 0) ist **inhaltlich korrekt und ihre Zeilenangaben stimmen
mit dem heutigen Code überein** (Abschnitt 2 bestätigt das Zeile für Zeile).

Der Umsetzungsaufwand:

1. **Zwei echte, mit realen Fremddateien nachgewiesene Import-/Export-Bugs**, die über den
   in `schriftfarbe-req.md` gelisteten Ist-Zustand hinausgehen:
   - `docx/writer.ts:27/29` schreibt den Farbwert **unescaped** in ein XML-Attribut — ein
     aus einer korrupten/exotischen Fremddatei importierter Wert mit `"`/`&`/`<` erzeugt
     beim Re-Export **nicht mehr parsbares** DOCX-XML (Abschnitt 3.1).
   - DOCX- **und** ODT-Reader werten Farbe **nur auf Lauf-/Span-Ebene** aus und ignorieren
     **stilvererbte** Farbe (DOCX: Absatzstil-`w:rPr/w:color` inkl. `w:basedOn`-Kette; ODT:
     `style:family="paragraph"` mit `fo:color`). Nachweisbar an im Repo vorhandenen echten
     Fremddateien (`docx/52288.docx`, `odt/text-color-from-paragraph.odt`) → stiller
     Farbverlust beim Import (Abschnitt 3.2).
2. **Eine explizite Entscheidung** zum Verhalten bei leerer Selektion (Abnahmekriterium 4):
   dieser Plan entscheidet **„nachrüsten"** und liefert den mit `prosemirror-commands`'
   eigener `toggleMark`-Implementierung (`node_modules/prosemirror-commands/dist/index.cjs:535`)
   deckungsgleichen Fix (Abschnitt 3.3).
3. **Ein Fix am kontinuierlichen `onChange`-Feuern** von `<input type="color">` während des
   Ziehens im nativen Dialog (Anforderung 3.4 / Grenzfall 16, Abschnitt 3.4).
4. **Der eigentliche Kern**: fehlende E2E-Tests (echte Toolbar-Bedienung) plus gezielte
   Unit-Tests für die Grenzfälle aus Anforderung Abschnitt 4, unter Nutzung der bereits im
   Repo vorhandenen unabhängigen Validatoren (**`mammoth`** für DOCX, **`xmllint-wasm`** +
   offizielles **OASIS-ODF-1.3-RelaxNG-Schema** für ODT — Abschnitt 9).

Zwei Anforderungspunkte (Abschnitt 2 Punkt 1 „reiner Buchstabe A", Punkt 4 „kein
Aktiv-Zustand") bleiben **bewusst ohne Pflicht-Fix**, weil die Anforderung dafür nur
Verifikation/Dokumentation verlangt (Abschnitte 3.5/3.6).

**Nachtrag 2026-07-05 (Abschnitt 0.2):** Eine erneute Prüfung dieses Plans hat jede in
Abschnitt 6 zitierte Fixture-Behauptung per echtem DOM-Baum (nicht Regex) nachvollzogen und
dabei einen Fixture-Fehler gefunden, der bis dahin **jede** Fassung dieses Plans unbemerkt
mitgeführt hatte: `Tika-792.docx` — weiterhin als Rundreise-/Case-Fixture verwendet — kann
laut `schriftfarbe-req.md` Grenzfall 22 (dort bereits verifiziert) gar keine `textColor`-Mark
liefern, und der von der Anforderung selbst vorgeschlagene Ersatz `bug65649.docx` erwies sich
bei genauerer Prüfung ebenfalls als ungeeignet (kein einziger echter Lauf trägt eine
Nicht-Schwarz-Farbe). Ersetzt durch das verifiziert geeignete `TestDocument.docx`. Details,
Belege und alle betroffenen Stellen in Abschnitt 0.2.

---

## 0.1 Korrekturen gegenüber dem vorherigen Entwurf dieser Datei

Dieser Plan ersetzt einen früheren Entwurf, der drei sachliche Fehler enthielt. Sie sind
hier offen dokumentiert, damit die Korrektur nachvollziehbar ist (Anforderung: „kein Fund
ohne Vermerk"):

1. **Falsche/veraltete Zeilenangaben trotz gegenteiliger Behauptung.** Der frühere Entwurf
   behauptete „zu 100 % deckungsgleich mit dem tatsächlichen Code — jede zitierte Zeile
   nachgelesen und bestätigt", zitierte aber durchgehend Zeilen aus einem **älteren**
   Codestand: `schema.ts` „Z. 134–140" (tatsächlich **182–188**), `commands.ts` „Z. 90–106"
   (tatsächlich **104–122**), `Toolbar.tsx` „Z. 142–161" (tatsächlich **191–210**),
   `docx/writer.ts` „Zeile 25" (tatsächlich **27**), `odt/reader.ts` `decodeInline`
   „Z. 79–120" (tatsächlich **97–172**), `marksFor`-Farbe „Z. 91" (tatsächlich **109**).
   Alle Zeilenangaben sind in diesem Plan gegen den heutigen Code korrigiert. (Die
   Zeilenangaben in `schriftfarbe-req.md` selbst sind korrekt — der Fehler lag nur im
   Vorentwurf dieses Code-Plans.)
2. **`coloredParagraph.odt` ist kein `fo:color`-Fixture.** Der Vorentwurf nutzte es als
   „einfachen fo:color-Basisfall" für die ODT-Rundreise (Rundreise-Testfall 6/7,
   Abnahmekriterium 2). Programmatische Prüfung: Die Datei enthält **kein `fo:color`** —
   weder in `content.xml` noch in `styles.xml`. Ihr einziger Span verweist auf einen
   Textstil `a9905fb` **ohne** Farbattribut. Als ODT-Farb-Basisfall verifiziert geeignet
   sind stattdessen u. a. `character-styles.odt` (`fo:color="#ff0000"` auf Span-Ebene in
   `content.xml`), `coloredTable_MSO15.odt`, `hyperlinkSpaces.odt`,
   `feature_attributes_character_MSO15.odt` (Abschnitt 6, korrigiert).
3. **Behauptung „Repo hat keine unabhängige Parser-Toolchain" ist falsch.** Der Vorentwurf
   schrieb, python-docx/ODF-Validator einzubinden sei unverhältnismäßig, und schlug nur
   Regex-Selbstprüfung des eigenen Exports vor. Tatsächlich sind **beide** unabhängigen
   Kanäle bereits im Repo verdrahtet: `mammoth` (unabhängiger DOCX-Parser,
   `docx/__tests__/external-validation.test.ts`) und `xmllint-wasm` gegen das offizielle
   `OpenDocument-v1.3-schema.rng` (`odt/__tests__/external-validation.test.ts`,
   `tests/fixtures/external/odf-schema/`). Abschnitt 9 ist entsprechend neu geschrieben.

---

## 0.2 Korrekturen aus dieser Prüfung (2026-07-05) — Fixture-Verifikation per Byte-Analyse

Dieser Durchlauf hat jede in Abschnitt 6 zitierte Fixture-Behauptung **nicht** per Regex
auf dem rohen Text, sondern per echtem `DOMParser`/`@xmldom/xmldom`-Baum nachvollzogen
(Elterntyp jedes `w:color`-Elements bestimmt, nicht nur „kommt der String irgendwo vor").
Das deckte drei weitere, teils schwerwiegende Korrekturen auf, die die vorherige Fassung
dieser Datei noch nicht hatte:

1. **Schwerwiegend — `Tika-792.docx` wurde in Abschnitt 6/8.3 weiterhin als normale
   Rundreise-Fixture behandelt, obwohl genau dieselbe Datei in `schriftfarbe-req.md`
   Grenzfall 4.22 bereits als **ungeeignet** entlarvt ist.** Diese Datei (der vorherige
   Entwurf dieses Plans) zitierte Tika-792.docx unter „Rundreise 6/7, Grenzfall 4.10
   (Case)" mit der Beschreibung „genau ein `<w:color w:val="FF0000"/>` (Großschreibung)"
   — **ohne** zu erwähnen, dass dieser einzige Beleg in `<w:rPrChange>` steckt (Verlaufsformat
   einer Änderungsverfolgung, nicht die aktuelle Formatierung) und der zugehörige Lauf
   zusätzlich in `<w:moveFrom><w:ins>…</w:ins></w:moveFrom>` verschachtelt ist —
   `moveFrom` fehlt in `collectRuns`' Wrapper-Liste (`docx/reader.ts:207`), der Lauf wird
   beim Import also komplett übersprungen. Ergebnis: **kein** `textColor`-Mark entsteht aus
   dieser Datei, unabhängig von jeder Fix-Maßnahme dieses Plans. Ein anhand dieser Datei
   gebauter Rundreise- oder Case-Test (wie in der vorherigen Fassung von Abschnitt 8.3
   vorgesehen) würde **nicht wegen eines zu behebenden Bugs**, sondern wegen einer
   ungeeigneten Fixture rot laufen. Verifiziert per DOM-Traversal (nicht nur Regex):
   einziger `w:color`-Beleg in der gesamten `document.xml`, Elternkette
   `w:color → w:rPr → w:rPrChange → w:rPr → w:r → w:ins → w:moveFrom`. **Korrektur:**
   Tika-792.docx bleibt ausschließlich der Beleg für Grenzfall 22 (siehe neuer Testfall in
   7.1/8.4) — „Farbe wird korrekt NICHT importiert, weil sie nur Verlauf ist" — und wird aus
   der Rundreise-/Case-Fixture-Rolle entfernt (Abschnitt 6/8.3 unten korrigiert).
2. **`bug65649.docx` — der von `schriftfarbe-req.md` selbst vorgeschlagene Ersatzkandidat
   für Tika-792.docx — ist bei genauer Prüfung ebenfalls ungeeignet, wurde von dieser
   Code-Plan-Datei aber (anders als die Anforderung) auch nie übernommen; hier trotzdem
   dokumentiert, damit niemand ihn beim Umsetzen nachträglich aus der Anforderung
   „nachrüstet".** Per DOM-Traversal aller `w:color`-Elemente in `word/document.xml`
   (5610 Treffer insgesamt): **alle** 2874 Vorkommen, deren Elternkette tatsächlich
   `w:color → w:rPr → w:r` ist (also echte Lauf-/Zeichenformatierung), tragen `w:val="000000"`
   oder `"auto"` — **keine einzige** andere Farbe. Die einzigen nicht-schwarzen Werte
   (`FF0000`×8, `C0C0C0`×3) hängen ausschließlich an `w:color → w:rPr → w:pPr`, also den
   „paragraph mark run properties" (Formatierung des unsichtbaren Absatzendezeichens),
   **nicht** an sichtbarem Lauftext — weder der heutige Reader noch der in Abschnitt 3.2
   vorgeschlagene Stil-Vererbungs-Fix liest `w:pPr/w:rPr` je als Textfarbe. Der von der
   Anforderung zusätzlich behauptete Wert `w:val="0000FF"` kommt in der Datei **nicht ein
   einziges Mal** vor (verifiziert, 0 Treffer). Auch als Hervorhebungs-Beleg ungeeignet:
   alle `w:shd/@w:fill`-Werte in echten Läufen sind `FFFFFF` (Standard/kein Highlight).
   Zusätzlich ist die Datei bereits an anderer Stelle im Repo (`docx/__tests__/
   external-fixtures.test.ts:34–42`, `SKIP_SLOW_UNDER_JSDOM`) als große (~16k Absätze),
   unter jsdom lahme Stress-Fixture bekannt — ungeeignet für einen fokussierten neuen
   Unit-/Rundreisetest auch unabhängig von der Farbfrage.
3. **Echter Ersatz, programmatisch über alle 127 DOCX-Fixtures gesucht (nicht nur die
   beiden genannten Kandidaten):** Ein Skript hat jedes `w:color`-Element per DOM
   klassifiziert (Elterntyp `w:r` vs. `w:pPr`/`w:style`, Ausschluss von `rPrChange`/
   `moveFrom`/`del`-Vorfahren, Ausschluss von Schwarz/`auto`, Prüfung auf nicht-leeren
   Lauftext). Bestes Ergebnis: **`TestDocument.docx`** — klein (`document.xml` 2,5 KB,
   bereits als Fixture für `hyperlink-einfuegen-qa.md` im Repo verankert), enthält
   `<w:r><w:rPr><w:color w:val="800000"/></w:rPr><w:t>RED</w:t></w:r>` und
   `<w:r><w:rPr><w:color w:val="E6FF00"/></w:rPr><w:t>YELLOW</w:t></w:r>` — echte,
   nicht verschachtelte Lauf-Farbe auf lesbarem, kurzem englischen Fließtext, ohne jede
   Abhängigkeit vom Stilvererbungs-Fix (funktioniert bereits mit dem heutigen Reader).
   Wird **primärer** Ersatz für Rundreise-Testfall 1/6/7 (Abschnitt 6/8.3). Zweiter,
   unabhängiger Beleg: **`drawing.docx`** (240 KB, kyrillischer Fließtext, 196 echte
   Lauf-Farben, darunter tatsächlich sowohl `FF0000` als auch `0000FF` — die Werte, die
   die Anforderung fälschlich `bug65649.docx` zuschrieb) als Sekundär-Beleg für Case-
   /Mehrfarben-Grenzfälle, falls eine zweite, unabhängige Datei gewünscht ist.
4. **`spanInheritanceTest.odt` demonstriert entgegen der vorherigen Fassung **nicht**
   Grenzfall 12.** Jeder in der Datei tatsächlich per `<text:span text:style-name="…">`
   referenzierte Stilname (`red`, `green`, `BACKGROUND_YELLOW_red`, `T1`…`T13`,
   `Default_20_Paragraph_20_Font`) ist mit **einer** Ausnahme direkt in `content.xml`s
   eigenen `office:automatic-styles` (`family="text"`) definiert — wird also vom
   **heutigen** Reader bereits korrekt aufgelöst, ist also **kein** Beleg für einen
   `office:styles`-Verlust. Tatsächlicher, bisher nicht dokumentierter (und **nicht**
   Gegenstand dieses Plans) Nebenbefund: `BACKGROUND_YELLOW_red` referenziert seinerseits
   `style:parent-style-name="BACKGROUND_YELLOW"` — `parseAutomaticStyles`/`marksFor`
   lösen diese **Eltern-Kette innerhalb der automatischen Stile** nie auf, ein Span mit
   dieser Referenz bekommt also seine eigene Farbe, aber nicht die vom Eltern-Stil
   vererbte Hervorhebung. Das ist ein eigenständiges, kleineres Vererbungsproblem
   (automatische-Stil-Kaskade), **nicht** dasselbe wie Grenzfall 12 (benannter Stil aus
   `office:styles`) — beide dürfen in Tests nicht verwechselt werden. Für Grenzfall 12
   bleiben `character-styles.odt` (mit Einschränkung, siehe Punkt 5) und
   `text-color-from-paragraph.odt` (Chart12/Standard-Absatz) die einzigen tragfähigen
   Belege.
5. **Präzisierung `character-styles.odt`/`text-color-from-paragraph.odt` für Grenzfall 12.**
   `character-styles.odt`s einziger span-referenzierter Stilname außerhalb der
   automatischen Stile ist `Default_20_Paragraph_20_Font` — verifiziert als **leerer**
   Stil (`<style:style style:name="Default_20_Paragraph_20_Font" … style:family="text"/>`,
   keine `style:text-properties`). Der Test belegt also nur „eine unaufgelöste
   `office:styles`-Referenz ändert nichts kaputt", **nicht** einen sichtbaren Farbverlust
   — als alleiniger Beleg zu schwach. Der tragfähige Beleg für „Farbe geht über
   `office:styles` verloren" bleibt `text-color-from-paragraph.odt`s „Chart12"-Absatz:
   verifiziert referenziert er `text:style-name="Standard"`, und `Standard` ist in
   `styles.xml` als **`style:family="paragraph"`**-Stil innerhalb `<office:styles>`
   definiert (`fo:color="#0084d1"`, direkt nachgelesen) — also präziser eine **benannte
   Absatz-Formatvorlage**, nicht die in Grenzfall 12 wörtlich genannte „benannte
   Zeichenformatvorlage". Der Ausgang (nach dem 3.2-Fix weiterhin unversorgt, da dieser
   nur `family="paragraph"` innerhalb `office:automatic-styles` erweitert, `office:styles`
   nie anfasst) bleibt wie in der Vorfassung beschrieben korrekt vorhergesagt — nur die
   Begründung/Formulierung in 7.2/8.4 ist entsprechend präzisiert, nicht mehr pauschal
   als „Zeichenstil" bezeichnet.

Abschnitt 6, 7.1/7.2, 8.3/8.4 und 12 sind unten entsprechend korrigiert.

---

## 1. Methodik dieser Prüfung

Direkt gelesen und (bei Zeilenangaben) verifiziert: `src/formats/shared/schema.ts`,
`src/formats/shared/editor/{Toolbar,WordEditor,commands}.tsx/.ts`,
`src/formats/docx/{writer,reader}.ts`, `src/formats/odt/{writer,reader,styleRegistry}.ts`,
beide `__tests__/roundtrip.test.ts`, beide `__tests__/external-fixtures.test.ts`, beide
`__tests__/external-validation.test.ts`, `tests/e2e/{clipboard,cut,docx,odt,selection-regression}.spec.ts`,
`package.json` (Dev-Deps `mammoth`, `xmllint-wasm`, `jsdom`) sowie die
`prosemirror-commands`-/`prosemirror-state`-Quelle (`toggleMark` Z. 521/535,
`Transaction.addStoredMark`/`removeStoredMark` Z. 514–520) zur Absicherung des Fixes in
Abschnitt 3.3.

Der Fixture-Bestand unter `tests/fixtures/external/` (127 DOCX-, 202 ODT-Dateien) wurde
programmatisch (Node + `jszip`) entpackt und nach `w:color`/`w:themeColor` bzw.
`fo:color`/Absatzstil-Farbe durchsucht, statt sich auf Dateinamen zu verlassen — das deckte
sowohl die zwei Import-Bugs in Abschnitt 3.2 als auch den Fixture-Fehler in Abschnitt 0.1
Punkt 2 auf. Die exakten Fund-Belege stehen in Abschnitt 6.

Hinweis zu `FEATURE-SPEC-DOCX-ODT.md`: Unter `specs/` existiert keine Datei dieses Namens;
die Querverweise aus `schriftfarbe-req.md` (Abschnitte 2.1, 3, 17, 20.1) konnten daher nicht
gegen eine lokale Quelle geprüft werden. Das ändert nichts an der Gültigkeit der in
`schriftfarbe-req.md` beschriebenen, im Code nachvollziehbaren Zustände; nur vermerkt, damit
der fehlende Querverweis nicht übergangen wird.

---

## 2. Ist-Zustand nach Codelektüre — Abgleich mit der Referenztabelle der Anforderung

Jede Fundstelle wurde am aktuellen Code gegengelesen. Die Zeilenangaben stimmen mit
`schriftfarbe-req.md` Abschnitt 0 überein.

| Fundstelle (Datei · Funktion · Zeilen, verifiziert) | Ist-Zustand | Abweichung? |
|---|---|---|
| `schema.ts` · Mark `textColor` · **182–188** | `attrs.color validate:'string'`; `parseDOM: [{ style:'color', getAttrs:(v)=>({color:v}) }]` (roher CSS-Wert); `toDOM → ['span',{style:\`color: ${…}\`},0]`. `highlight` analog · **189–195** (`background-color`) | keine |
| `Toolbar.tsx` · Textfarbe-Steuerung · **191–210** | Label „A" (`aria-hidden`, Z. 192) + `<input type="color" aria-label="Textfarbe">` mit `onChange` → `applyMarkColor('textColor', …)` (Z. 197), **kein** gebundener `value`; „⌫"-Button `title="Textfarbe entfernen"` (Z. 200–210), `onMouseDown`+`preventDefault` → `clearMarkColor('textColor')` | keine |
| `Toolbar.tsx` · Hervorhebung-Steuerung · **211–230** | strukturidentisch, `aria-label="Hervorhebungsfarbe"`, `title="Hervorhebung entfernen"` | keine (relevant für 2.1 Verwechslungsgefahr) |
| `Toolbar.tsx` · `run()` · **28–31** | ruft nach jedem Befehl `view.focus()` (Z. 30) | keine (relevant für 3.4) |
| `commands.ts` · `applyMarkColor`/`clearMarkColor` · **104–122** | `ColorMarkName='textColor'\|'highlight'` (Z. 104); beide **`if (empty) return false`** (Z. 109 bzw. 118), sonst `tr.addMark`/`tr.removeMark` über `from,to` | keine — Kern von 3.3 |
| `WordEditor.tsx` · Keymap · **77–99** | nur `Mod-z/y/Shift-z`, `Enter`, `Shift-Enter`, `Mod-b/i/u`, `Shift-Delete`; **kein** Farb-Shortcut. `EditorView`-Config **114–125** setzt nur `clipboardTextSerializer` — **kein** `transformPasted`/`handlePaste` | keine |
| `docx/writer.ts` · `runPropertiesXml` · **20–33** | `textColor` → `<w:color w:val="${…replace('#','')}"/>` (**Z. 27**); `highlight` → `<w:shd w:val="clear" w:color="auto" w:fill="${…}"/>` (Z. 28–30). `escapeXml` ist importiert (Z. 3), wird hier **nicht** angewandt | keine — **zusätzlicher Fund 3.1** |
| `docx/reader.ts` · `marksFromRunProperties` · **100–115** | liest `w:color/@w:val`, ignoriert `"auto"`, `#`-Präfix, keine Case-Normalisierung (**Z. 108–110**); `highlight` aus `w:shd/@w:fill` (Z. 111–113) | keine — **Fund 3.2** |
| `docx/reader.ts` · `parseStylesXml` · **53–67** | liest je `<w:style>` **nur** `w:pPr/w:outlineLvl` (Z. 59–64); `w:rPr`/`w:color`/`w:basedOn` der Stildefinition werden **nie** ausgewertet | keine — **Fund 3.2** |
| `odt/styleRegistry.ts` · `isEmpty`/`buildTextStyleXml` · **12–14 / 46–59** | `isEmpty` false sobald `color` gesetzt (Z. 13); `fo:color="${escapeXml(props.color)}"` (**Z. 56**, korrekt escaped); Dedup-Schlüssel `JSON.stringify(props)` (Z. 30) | keine |
| `odt/reader.ts` · `parseAutomaticStyles` · **37–78** | `family="text"` liest `fo:color` (Z. 58–59); `family="paragraph"` liest **nur** `fo:text-align` (Z. 64–66); `office:styles` wird nie gelesen (nur `office:automatic-styles`, `content.xml`-Z. 363 / `styles.xml`-Z. 373 nur Kopf/Fuß) | keine — **Fund 3.2** |
| `odt/reader.ts` · `decodeInline`/`marksFor` · **97–172** | `marksFor` erzeugt `textColor` nur aus `textStyles` (Z. 109); `walk(child, [])` startet mit leeren Marks (Z. 170); Absatzstil-Marks werden nie als Basis übergeben | keine — **Fund 3.2** |
| `odt/writer.ts` · `runPropsFromMarks` · **32–43** | `textColor` → `props.color` (**Z. 39**) | keine |
| `roundtrip.test.ts` (docx **100–115** / odt **102–117**) | „preserves text color and highlight color" — nur `#ff0000`/`#ffff00`, direkt als JSON konstruiert | keine |
| E2E für „textColor"/„Textfarbe" | in `docx/odt/selection-regression.spec.ts` **kein** Treffer (vorhandene Berührung nur in `clipboard.spec.ts`/`cut.spec.ts`, siehe Anforderung 0.1) | keine |
| Aktiv-/Ist-Zustand am Farbwähler | **nicht vorhanden** (kein `value`-Binding, kein `aria-pressed`-Äquivalent zu `MarkButton`, Z. 69) | keine |

Fazit: Die Anforderungstabelle ist vollständig korrekt. Der Rest dieses Plans behandelt die
beim Audit **zusätzlich** gefundenen Bugs (Abschnitt 3), die geforderte Entscheidung
(3.3) und die Testabdeckung (6–9).

---

## 3. Gefundene Defekte / zu treffende Entscheidungen

### 3.1 `docx/writer.ts` — ungeschützter Farbwert im XML-Attribut (Fix)

`runPropertiesXml` (Z. 27 Schriftfarbe, Z. 28–30 Hervorhebung — letztere für
`textmarker-farbe` cross-referenziert, siehe Demarkation `schriftfarbe-req.md` Abschnitt 0):

```ts
if (mark.type === 'textColor') props.push(`<w:color w:val="${String(mark.attrs?.color ?? '').replace('#', '')}"/>`)
if (mark.type === 'highlight') {
  props.push(`<w:shd w:val="clear" w:color="auto" w:fill="${String(mark.attrs?.color ?? '').replace('#', '')}"/>`)
}
```

`escapeXml` ist in der Datei importiert (Z. 3) und wird für Textinhalt (`encodeRunText`,
Z. 37) und `docProps/core.xml` verwendet — **nicht** für diese beiden Attributwerte. Da das
Schema (`validate:'string'`) **jeden** String als `color` zulässt und ein Farbwert
unvalidiert aus Fremddateien in die Mark gelangen kann (DOCX-Import `#${w:val}`,
`reader.ts:110`; ODT-Import roher `fo:color`, `reader.ts:59/109`; Paste über `parseDOM`),
erzeugt ein Wert mit `"`/`&`/`<` beim Export **kaputtes, nicht mehr parsbares** XML — keine
falsche Farbe, sondern eine ungültige Gesamtdatei. Direkt relevant für Rundreise-Testfall 6
(„echte Fremddatei importieren").

**Fix** (`escapeXml` um beide Attributwerte):

```ts
if (mark.type === 'textColor') props.push(`<w:color w:val="${escapeXml(String(mark.attrs?.color ?? '').replace('#', ''))}"/>`)
if (mark.type === 'highlight') {
  props.push(`<w:shd w:val="clear" w:color="auto" w:fill="${escapeXml(String(mark.attrs?.color ?? '').replace('#', ''))}"/>`)
}
```

`escapeXml` beseitigt die **Wohlgeformtheits**-Verletzung. Die davon getrennte Frage der
**OOXML-Schema-Gültigkeit** (`w:val` erlaubt nur sechsstelliges Hex oder `"auto"`, nicht
`red`/`rgb(…)`) gehört zu Grenzfall 4.20 / Anforderung 3.10 und wird dort behandelt
(Normalisierung nach `#rrggbb` beim Import oder Verwerfen vor dem Export) — escapeXml ist
die minimale, sofort korrekte Härtung, keine vollständige Lösung von 3.10.

ODT-seitig besteht das Escaping-Risiko **nicht** (`styleRegistry.ts:56/57` escaped
`props.color`/`props.highlight` bereits).

### 3.2 DOCX- und ODT-Reader — stilvererbte Farbe wird ignoriert (Fix, mit echten Fremddateien nachgewiesen)

Die Anforderung nennt in Grenzfall 12 nur den engen ODT-Fall „benannter Zeichenstil aus
`office:styles`" und verlangt dafür (Abnahmekriterium 5) nur Prüfung + Dokumentation. Der
beim Audit gefundene Fall ist **breiter und stiller**: Farbe, die ein *Absatz*-Stil (nicht
ein Zeichenlauf) definiert, wird von **beiden** Readern übergangen. Nachgewiesen an echten,
im Repo vorhandenen Fremddateien (Belege programmatisch entpackt, siehe Abschnitt 6):

**ODT — `tests/fixtures/external/odt/text-color-from-paragraph.odt`.** Enthält verifiziert:

```xml
<text:p text:style-name="P1">Entire paragraph in red.</text:p>
<style:style style:name="P1" style:family="paragraph" style:parent-style-name="Standard">
  <style:text-properties fo:color="#ff0000"/></style:style>
```

Kein `<text:span>` um den Lauf. `parseAutomaticStyles` liest bei `family==='paragraph'`
**nur** `fo:text-align` (`odt/reader.ts:64–66`); `style:text-properties` eines Absatzstils
wird nie gelesen. `decodeInline` startet jedes `walk()` mit `[]` (Z. 170) und ergänzt Marks
**nur** über `<text:span>` (Z. 146–149). Ergebnis: Dieser rote Absatz importiert **ohne jede
`textColor`-Mark** — sichtbarer, stiller Farbverlust (Farbe = Rot).

**Wichtige Präzisierung zur Fixture (programmatisch nachgeprüft, gegen die
zunächst vermutete „ein einziger roter Absatz"-Lesart):** `text-color-from-paragraph.odt`
ist **kein** Ein-Fall-Fixture, sondern deckt mehrere Szenarien in **einer** Datei ab. Neben
`P1` tragen auch die Absatzstile `P2` und `P5` `fo:color="#ff0000"` und `P4`
`fo:color="#000000"` (jeweils `family="paragraph"`, direkt in `style:text-properties`); es
gibt Absätze **mit** und **ohne** `<text:span>`, leere Absätze mit/ohne explizite
Textfarbe, sowie ganz oben einen Absatz „Normal style is set to text color ‚Chart12'",
dessen Farbe über die **benannte** `office:styles`-Vorlage „Standard" (in `styles.xml`,
enthält `fo:color`) kommt — also **genau Grenzfall 12** (benannter Stil aus `office:styles`,
bewusst **nicht** gefixt). Konsequenz: Nach dem 3.2-Fix erhalten **mehrere** Absätze dieser
Datei eine `textColor`-Mark (P1/P2/P5 rot, P4 schwarz), während der „Chart12"-Absatz
weiterhin **ohne** Mark bleibt. Dieselbe Datei ist damit gleichzeitig **Positiv-Nachweis**
für den Absatzstil-Fix **und** **Fallback-Nachweis** für Grenzfall 12 — der Test muss beides
gezielt an den jeweiligen Absätzen prüfen (siehe 7.2), **nicht** pauschal „alle Textknoten
sind rot" behaupten.

**DOCX — `tests/fixtures/external/docx/52288.docx`.** Enthält verifiziert:

```xml
<w:p><w:pPr><w:pStyle w:val="ChapterNumber"/></w:pPr><w:r><w:t>CHAPTER 1</w:t></w:r></w:p>
<!-- word/styles.xml: -->
<w:style w:type="paragraph" w:styleId="ChapterNumber"><w:basedOn w:val="ChapterName"/>
  <w:rPr><w:color w:val="000000"/></w:rPr></w:style>
```

**Kein** `<w:rPr>` am Lauf. `parseStylesXml` liest aus `<w:style>` **nur** `outlineLvl`
(`docx/reader.ts:59–64`); das `w:rPr/w:color` der Stildefinition wird nie ausgewertet.
`marksFromRunProperties` bekommt nur das (fehlende) Lauf-`rPr` → **keine** `textColor`-Mark.
**Wichtige Nuance:** Die vererbte Farbe ist hier `000000` (Schwarz) — der Fund belegt die
**strukturelle** Lücke (Stil-Farbe wird nicht gelesen), aber **kein visuell** sichtbarer
Verlust (Schwarz auf Weiß). Für einen Test mit sichtbar farbigem Ergebnis muss zusätzlich
eine Datei mit nicht-schwarzer Absatzstil-Farbe verwendet oder handgebaut werden (Abschnitt
7.1). Der DOCX-Fall ist zugleich relevant für Grenzfall 9 (explizites Schwarz vs. keine
Farbe): Nach dem Fix erzeugt „CHAPTER 1" eine explizite `#000000`-Mark.

Beide Wege („ganzen Absatz markieren → Farbe zuweisen") sind Alltagsbedienung in
Word/LibreOffice; beide Programme legen die Farbe dann bevorzugt auf Absatz-/Stilebene ab.
Der Fund bedroht die **verbindliche** Rundreise-Anforderung (Abschnitt 6, Testfall 6) —
aktuell existiert dafür **kein dokumentierter Fallback**, sondern ein unbemerkter Bug.

**Fix-Skizze ODT (`odt/reader.ts`):**

1. `parseAutomaticStyles`: für `family==='paragraph'` zusätzlich zu `fo:text-align` auch
   `style:text-properties` einlesen (dieselbe Extraktion wie für `family==='text'`, Z. 51–61,
   auf eine gemeinsame Hilfsfunktion `extractRunStyle(props): RunStyle` ziehen, statt zu
   duplizieren) in eine neue Map `paragraphRunStyles: Map<string, RunStyle>`.
2. `ParsedStyles` (Z. 23–27) um `paragraphRunStyles` erweitern.
3. `decodeInline(pEl, styles, baseMarks: Mark[] = [])`: `walk()` mit `baseMarks` statt `[]`
   initialisieren (Z. 170).
4. `paragraphToBlocks` (Z. 175) und der Heading-Zweig in `elementToBlocks` (Z. 256–261):
   `styleName` des Absatzes auflösen und `marksFor(styleName, styles.paragraphRunStyles)` als
   `baseMarks` übergeben (`marksFor` um eine zweite Map parametrisieren).
5. Span-Marks überschreiben geerbte Absatz-Marks weiterhin per `mergeMarks` (Z. 125–136,
   „innerster gewinnt") — ODF-Kaskade: näher am Text gewinnt.

**Fix-Skizze DOCX (`docx/reader.ts`):**

1. `parseStylesXml`: zusätzlich eine Map `runColorByStyleId: Map<string, {color?; basedOn?}>`
   aufbauen — pro `<w:style w:type="paragraph">` das eigene `<w:rPr><w:color>` (falls ≠
   `"auto"`) und `w:basedOn/@w:val`.
2. Neue Hilfsfunktion `resolveStyleColor(styleId, map, depth=0): string|null`, die bei
   fehlender eigener Farbe die `basedOn`-Kette hochläuft (Tiefenlimit analog
   `MAX_TABLE_NESTING_DEPTH`, Z. 309, gegen zirkuläre `basedOn` in korrupten Dateien).
3. `paragraphToBlocks` löst `styleId` bereits auf (Z. 236–237) — den
   `resolveStyleColor(styleId, …)`-Wert an `decodeParagraphRuns` → `marksFromRunProperties`
   als `inheritedColor` durchreichen.
4. `marksFromRunProperties(rPr, inheritedColor)`: fehlt am Lauf ein eigenes `<w:color>`
   (bzw. nur `"auto"`), aber `inheritedColor` liegt vor → Mark mit geerbtem Wert setzen; ein
   explizites Lauf-`<w:color>` behält Vorrang.

**Umfang bewusst begrenzt.** Beide Fixes sind **rein additiv beim Import** (mehr Fälle
ergeben `textColor`, nie weniger). **Nicht** enthalten: allgemeine Stil-Kaskaden (`w:rStyle`
am Lauf, mehrstufige ODF-`parent-style-name`-Ketten über `office:styles`) — das wäre ein
eigenständiges Feature („Stilvererbung" für alle Marks) und ist nicht Gegenstand von
`schriftfarbe`; hier wird nur die mit echten Dateien belegte Farb-Verlustquelle geschlossen.
Der `office:styles`-Fall (Grenzfall 12, `text-color-from-paragraph.odt`s „Chart12"/„Standard"-
Absatz und, schwächer, `character-styles.odt`s `Default_20_Paragraph_20_Font`-Verweis —
**nicht** `spanInheritanceTest.odt`, siehe Korrektur 0.2 Punkt 4) bleibt daher **dokumentierter
Fallback**, nicht gefixt (Abschnitt 8.4).

**Regressions-Risiko dieses Fixes (verifiziert, muss beim Umsetzen bestätigt werden).** Der
DOCX-Fix lässt künftig **jeden** Lauf unter einem farbdefinierenden Absatzstil eine
`textColor`-Mark tragen — und Absatzstil-Farbe `000000` ist in Fremddateien häufig
(`61787.docx`, `60329.docx`, `bug57031.docx` u. a. tragen überwiegend `#000000`). Konkret:

- `roundtrip.test.ts` (beide) konstruiert JSON direkt und durchläuft `parseStylesXml` nicht
  mit Stil-Farbe → **bleibt grün** (verifiziert: testet nur eigenen Writer-Output).
- `external-fixtures.test.ts` (beide) prüft **Blockzahl** (`paragraphCount`) und
  `toContain`-Textfragmente, **nicht** Marks (verifiziert: Z. 52–54 u. a.). Marks liegen in
  Textknoten, ändern die Blockzahl nicht → **kein Bruch erwartet**.
- `reader.test.ts` (beide) enthält **keine** Farb-/`textColor`-Assertion (verifiziert per
  Volltextsuche) → **kein Bruch erwartet**.
- **ODT-Symmetrie (verifiziert):** Weder `text-color-from-paragraph.odt` noch `52288.docx`
  werden aktuell **von irgendeinem** Test referenziert (Volltextsuche in `src/`+`tests/` = 0
  Treffer), und `odt/__tests__/external-fixtures.test.ts` enthält **keine** `fo:color`/`color`/
  `marks`-Assertion → der additive ODT-Fix (P1/P2/P5/P4 dieser Datei bekommen künftig Marks)
  bricht **keinen** bestehenden Test. Beim Umsetzen dennoch gegenprüfen, dass die
  Absatzstil-Extraktion **nur** aus `family="paragraph"`-Stilen liest und Span-Marks weiterhin
  per `mergeMarks` gewinnen (näher am Text), damit farbige Spans über andersfarbigen Absätzen
  nicht überschrieben werden.
- Trotzdem **Pflicht**: nach dem Fix die gesamte Vitest-Suite laufen lassen und bestätigen,
  dass keine Snapshot-/Strukturassertion kippt, sowie sicherstellen, dass **nur**
  `pStyle`-referenzierte Absatzstile ausgewertet werden — **nicht** `docDefaults`/`Normal`
  pauschal, damit nicht schlagartig jeder Lauf eines Dokuments explizites Schwarz erhält.

### 3.3 Verhalten bei leerer Selektion (Anforderung 3.2/3.5, Grenzfall 1, Abnahmekriterium 4) — Entscheidung: nachrüsten

Abnahmekriterium 4 verlangt eine **explizite, festgehaltene Entscheidung**. Dieser Plan
entscheidet: **nachrüsten (Variante b)**. Begründung:

- Bei `strong`/`em`/`underline` wirkt Formatierung an der Schreibmarke über „stored marks"
  automatisch auf nachfolgend getippten Text; dieselbe Bedienung mit Schriftfarbe tut heute
  nichts. Diese Inkonsistenz **innerhalb derselben Toolbar** ist ein Bedienfehler-Trigger.
- Der Fix ist nicht invasiv: `Transaction.addStoredMark`/`removeStoredMark`
  (`prosemirror-state/dist/index.cjs:514–520`) sind genau das, was
  `prosemirror-commands`' `toggleMark` intern für den `$cursor`-Fall nutzt
  (`prosemirror-commands/dist/index.cjs:535`:
  `dispatch(state.tr.addStoredMark(markType.create(attrs)))`). `applyMarkColor`/
  `clearMarkColor` übernehmen dieselbe API ohne neue Abhängigkeit.

**Fix in `src/formats/shared/editor/commands.ts` (Z. 106–122):**

```ts
export function applyMarkColor(markName: ColorMarkName, color: string): Command {
  return (state, dispatch) => {
    const { from, to, empty } = state.selection
    const mark = wordSchema.marks[markName].create({ color })
    if (dispatch) dispatch(empty ? state.tr.addStoredMark(mark) : state.tr.addMark(from, to, mark))
    return true
  }
}

export function clearMarkColor(markName: ColorMarkName): Command {
  return (state, dispatch) => {
    const { from, to, empty } = state.selection
    const markType = wordSchema.marks[markName]
    if (dispatch) dispatch(empty ? state.tr.removeStoredMark(markType) : state.tr.removeMark(from, to, markType))
    return true
  }
}
```

Konsequenzen (in den Tests abzudecken):

- **Testfall 3 der Anforderung ändert seinen Soll-Ausgang**: Cursor ohne Selektion, Farbe
  wählen, tippen → neuer Text übernimmt jetzt die Farbe. Grenzfall 1 ist damit **kein
  Ist-Zustand mehr, sondern korrigiertes Soll**. Die Anforderungsdatei bleibt unverändert,
  da sie die Entscheidung ausdrücklich an eine Nachfolgedatei delegiert — **dies ist diese
  Nachfolgedatei**.
- Der „⌫"-Button wirkt bei leerer Selektion nun konsistent auf `storedMarks` (durch denselben
  Fix erledigt). Ein separates `disabled`-Verhalten (Abschnitt 3.5) ist damit **nicht** mehr
  nötig, da kein wirkungsloser Fall mehr existiert.
- `commands.ts` gibt jetzt bei leerer Selektion `true` statt `false` zurück. Der einzige
  Aufrufer ist `run()` (`Toolbar.tsx:28`), das den Rückgabewert **nicht** auswertet — kein
  Nebeneffekt. (Zur Sicherheit beim Umsetzen prüfen, dass kein Test den bisherigen
  `false`-Rückgabewert von `applyMarkColor`/`clearMarkColor` bei leerer Selektion abfragt;
  per Volltextsuche aktuell keiner.)

### 3.4 Kontinuierliches `onChange` + `view.focus()` bei offenem Farbwähler (Anforderung 3.4, Grenzfall 16) — Fix

`Toolbar.tsx:197` bindet `onChange` direkt auf `<input type="color">`; React bildet das auf
das native `input`-Event ab, das in Chromium **fortlaufend während des Ziehens** feuert.
Jeder Zwischenwert löst `run()` (Z. 28–31) aus → `view.dispatch(...)` **und** `view.focus()`
(Z. 30), obwohl der Fokus im nativen Dialog liegen sollte. Folgen: (a) viele
Zwischen-Undo-Schritte für eine Farbwahl; (b) Risiko, dass wiederholter Fokusentzug den
Dialog vorzeitig schließt.

**Fix:** nur auf das native, einmalig beim Bestätigen feuernde `change`-Event reagieren.
React hat dafür keinen eigenen synthetischen Prop-Namen → per `ref` + `addEventListener`.
Da derselbe Bug-Pfad `textColor` **und** `highlight` betrifft (geteilter Code laut
Demarkation), wird die Steuerung in **eine** wiederverwendbare Komponente gezogen, statt
zwei fast identische Blöcke zu pflegen:

```tsx
function ColorMarkControl({
  view, markName, label, title, removeTitle,
}: { view: EditorView; markName: ColorMarkName; label: string; title: string; removeTitle: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const handleChange = (e: Event) => run(view, applyMarkColor(markName, (e.target as HTMLInputElement).value))
    el.addEventListener('change', handleChange)
    return () => el.removeEventListener('change', handleChange)
  }, [view, markName])
  return (
    <>
      <label className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400" title={title}>
        <span aria-hidden>{label}</span>
        <input ref={inputRef} aria-label={title} type="color" className="w-6 h-6 p-0 border-0 bg-transparent" />
      </label>
      <button type="button" title={removeTitle}
        onMouseDown={(e) => { e.preventDefault(); run(view, clearMarkColor(markName)) }}
        className="px-1.5 py-1 text-xs rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500">⌫</button>
    </>
  )
}
```

`Toolbar.tsx` ersetzt die beiden Blöcke (Z. 191–210 Textfarbe, 211–230 Hervorhebung) durch
`<ColorMarkControl view={view} markName="textColor" label="A" title="Textfarbe" removeTitle="Textfarbe entfernen" />`
bzw. `markName="highlight" label="🖍" title="Hervorhebungsfarbe" removeTitle="Hervorhebung entfernen"`.
Der Import von `ChangeEvent` (Z. 1) wird dann nicht mehr für diese Inputs gebraucht;
`useEffect`/`useRef` aus React importieren. `aria-label`/`title` bleiben unverändert, damit
`getByLabel('Textfarbe')` / `getByTitle('Textfarbe entfernen')` und der `pickColor`-Helfer
(`clipboard.spec.ts:39`) weiter greifen (Regressionsschutz für 2.1).

Ob der Dialog je Browser tatsächlich vorzeitig schloss, bleibt Teil der
Browser-Verifikation (Abschnitt 10). Der Fix ist unabhängig vom Prüfergebnis sinnvoll: er
reduziert die ausgelösten Transaktionen auf höchstens eine pro abgeschlossener Farbwahl.

### 3.5 Sichtbares Label „A" (Anforderung Abschnitt 2 Punkt 1) — optional, nicht blockierend

Die Anforderung verlangt hier nur Verifikation/Vergleich, keine Korrektur. Optionaler,
nicht abnahmerelevanter Vorschlag (Word/LibreOffice-Vorbild: farbiger Unterstrich unter „A"):
`<span aria-hidden style={{ borderBottom: \`2px solid ${lastPicked}\` }}>A</span>`, wobei die
Komponente den zuletzt gewählten Wert in `useState` hielte (rein kosmetisch, kein
Selektionsbezug). **Nicht** Teil der Abnahmekriterien, hier nur dokumentiert.

### 3.6 Aktiv-/Ist-Zustands-Anzeige (Anforderung Abschnitt 2 Punkt 4, 3.3) — Ist-Zustand bestätigt, kein Pflicht-Fix

Bestätigt: kein Mechanismus synchronisiert den Farbchip auf die `textColor`/`highlight`-Mark
an `$from` (anders als `MarkButton`s `aria-pressed` via `isInSet`, `Toolbar.tsx:69`). Die
Anforderung verlangt hier keine Korrektur, nur Klärung. **Bewusst nicht behoben**: Ein
`<input type="color">` kann seinen Wert per `value` synchronisieren, hätte aber bei
**gemischter** Selektion (Grenzfall 6) keine sinnvolle einzelne Farbe — „Farbe an `$from`"
wäre dann irreführend. Ein Mischzustands-Symbol wäre ein eigenes UI-Feature außerhalb dieser
Anforderung. Falls künftig verlangt: `useEffect` bei jedem `state`-Wechsel, der
`$from.marks()` prüft und nur im **eindeutigen** Fall den `value` setzt — hier nur als
Ansatzpunkt vermerkt, nicht umzusetzen.

---

## 4. Dateigenauer Änderungsplan — bestehende Dateien

| # | Datei | Änderung | Typ |
|---|---|---|---|
| 1 | `src/formats/shared/editor/commands.ts` | `applyMarkColor`/`clearMarkColor` (Z. 106–122): `addStoredMark`/`removeStoredMark` bei leerer Selektion statt `return false` (3.3) | Fix |
| 2 | `src/formats/shared/editor/Toolbar.tsx` | Neue `ColorMarkControl`-Komponente ersetzt die Blöcke Z. 191–210 (`textColor`) und 211–230 (`highlight`); `change`- statt `input`-Bindung; `useEffect`/`useRef` importieren (3.4) | Fix |
| 3 | `src/formats/docx/writer.ts` | `escapeXml(...)` um den Farbwert in Z. 27 (`w:color`) und Z. 29 (`w:shd/@w:fill`) (3.1) | Fix |
| 4 | `src/formats/docx/reader.ts` | `parseStylesXml` (Z. 53–67) liest zusätzlich `w:rPr/w:color` + `w:basedOn` je Absatzstil; neue `resolveStyleColor`; `decodeParagraphRuns`/`marksFromRunProperties` erhalten geerbte Farbe als Fallback (3.2) | Fix |
| 5 | `src/formats/odt/reader.ts` | `parseAutomaticStyles` (Z. 37–78) liest `style:text-properties` auch aus `family="paragraph"` in neue Map `paragraphRunStyles`; `decodeInline` (Z. 97) erhält `baseMarks`; `paragraphToBlocks`/Heading-Zweig übergeben aufgelöste Absatz-Marks (3.2) | Fix |
| 6 | `src/formats/shared/schema.ts` | **keine Änderung** — Mark-Definition ausreichend | — |
| 7 | `src/formats/odt/writer.ts` | **keine Änderung** | — |
| 8 | `src/formats/odt/styleRegistry.ts` | **keine Änderung** (`isEmpty`/Dedup bereits korrekt für Grenzfall 9/14) | — |
| 9 | `src/formats/shared/editor/WordEditor.tsx` | **keine Änderung** (kein Shortcut gefordert; `reconcileSelectionOnClick` bereits formatneutral) | — |

**Keine neue Datei im Produktivcode.** Der Hauptaufwand liegt in neuen Testdateien
(Abschnitte 7–9).

---

## 5. Bereits korrekt — bewusst nicht geänderter Code

- **`schema.ts`** — `parseDOM`/`toDOM` vollständig für den Anforderungsumfang; kein
  `themeColor`/Palettenbezug nötig (Anforderung Abschnitt 5 schließt das aus).
- **`odt/styleRegistry.ts` `isEmpty` (Z. 12–14)** — `!props.color` ist für `"#000000"`
  falsch (nicht leer) → Grenzfall 9 („explizites Schwarz vs. keine Farbe") strukturell schon
  korrekt; nur der Test fehlt (Abschnitt 7.3).
- **`docx/writer.ts` Hervorhebung** — bewusst `<w:shd w:fill>` statt `<w:highlight>`, um
  freie RGB-Werte zu erlauben (Anforderung 3.7). Für die Schriftfarbe besteht das Problem
  nicht (`w:color` erlaubt beliebiges RGB). **Cross-Note für QA/`textmarker-farbe`:** Der
  unabhängige Parser `mammoth` liest **`w:highlight`** (`body-reader.js:100`), **nicht**
  `w:shd` — er würde die vom Writer erzeugte Hervorhebung also gar nicht als Highlight
  erkennen (relevant nur für `textmarker-farbe`, nicht für diese Anforderung; siehe 9).
- **`CellSelection` (prosemirror-tables)** — `applyMarkColor`/`clearMarkColor` nutzen
  `state.selection.from/to`; `addMark`/`removeMark` erreichen über `nodesBetween` jeden
  Textknoten im Bereich, unabhängig von Zellgrenzen (Grenzfall 3). **Keine Codeänderung**,
  aber echter Bedientest (Abschnitt 8), da `CellSelection.from/.to` sich historisch schon
  abweichend verhielt.
- **`commands.ts` `setHeading` (Z. 40–55)** — nur `tr.setBlockType`, fasst keine Marks an →
  Anforderung 3.9 Punkt 2 erfüllt; nur der Test fehlt.

---

## 6. Fixture-Inventar — reale Dateien (programmatisch verifiziert)

Belege durch Entpacken (`jszip`) ermittelt, nicht aus Dateinamen geraten.

**DOCX** (`word/document.xml`/`word/styles.xml` geprüft, `w:color`-Elternkette per DOM
klassifiziert — siehe Korrektur 0.2):

| Datei | Verifizierter Befund | Eignung |
|---|---|---|
| `TestDocument.docx` | `<w:r><w:rPr><w:color w:val="800000"/></w:rPr><w:t>RED</w:t></w:r>` und `…w:val="E6FF00"…YELLOW…` — echte, direkte Lauf-Farbe auf kurzem, lesbarem Fließtext, kein `basedOn`/Track-Changes-Bezug; bereits als Fixture für `hyperlink-einfuegen-qa.md` im Repo | **Primär**-Fixture Rundreise 1/6/7 und Grenzfall 4.10 (Case) — funktioniert bereits mit dem heutigen Reader, keine Abhängigkeit vom 3.2-Fix |
| `drawing.docx` | 196 echte, nicht verschachtelte Lauf-Farben auf kyrillischem Fließtext, darunter sowohl `FF0000` als auch `0000FF` | Sekundär-/Kontrollbeleg zu `TestDocument.docx` für Mehrfarben-/Case-Grenzfälle |
| ~~`Tika-792.docx`~~ | Einziger `w:color`-Beleg (`FF0000`) steckt in `<w:rPrChange>` (Verlauf, nicht aktuelle Formatierung), zugehöriger Lauf zusätzlich in `<w:moveFrom><w:ins>` — `moveFrom` fehlt in `collectRuns`, Lauf wird beim Import komplett übersprungen. Verifiziert per DOM-Elternkette (Korrektur 0.2 Punkt 1) | **Nicht** als Rundreise-/Case-Fixture verwenden — nur noch Beleg für Grenzfall 22 (7.1, „korrekt NICHT importiert") |
| ~~`bug65649.docx`~~ | Alle 2874 echten Lauf-`w:color` sind `000000`/`auto`; einzige Nicht-Schwarz-Werte (`FF0000`×8, `C0C0C0`×3) hängen an `w:pPr/w:rPr` (Absatzmarken-Formatierung, nicht Lauftext); `w:val="0000FF"` kommt gar nicht vor; `w:shd/@w:fill` überall `FFFFFF`. Zusätzlich bereits als `SKIP_SLOW_UNDER_JSDOM`-Stressdatei bekannt (`external-fixtures.test.ts:34–42`) | **Ungeeignet** trotz Nennung in `schriftfarbe-req.md` — nicht verwenden (Korrektur 0.2 Punkt 2) |
| `SampleDoc.docx` | `<w:color w:val="548DD4" w:themeColor="text2" w:themeTint="99"/>` (Fallback-`val` vorhanden) | Grenzfall 11 — Reader liest `#548DD4`, ignoriert Theme (dokumentierter Fallback) |
| `shapes-with-text.docx` | mehrfach `<w:color w:val="000000" w:themeColor="dark1"/>` | Grenzfall 11, zweite unabhängige Datei |
| `52288.docx` | `ChapterNumber`(basedOn `ChapterName`) mit `w:rPr/w:color="000000"`, **kein** Lauf-`w:color` an „CHAPTER 1" | Primär-Fixture 3.2-DOCX; **Farbe=Schwarz** → belegt Struktur, nicht sichtbaren Verlust (siehe 3.2/7.1) |
| `61787.docx`, `60329.docx`, `bug57031.docx` u. a. | überwiegend `#000000` explizit | Grenzfall 9 an echten Dateien |
| **kein** Fixture | `w:val="auto"` **+** `w:themeColor` (Theme ohne brauchbaren Fallback) — programmatisch über alle 127 DOCX gesucht: **0 Treffer** | Grenzfall 11-Teilfall „kein Fallback" nur **handgebaut** testbar (7.1) |

**ODT** (`content.xml`/`styles.xml` geprüft):

| Datei | Verifizierter Befund | Eignung |
|---|---|---|
| `text-color-from-paragraph.odt` | **Multi-Szenario in einer Datei** (verifiziert): Absatzstile `P1`/`P2`/`P5` (`family="paragraph"`, in `content.xml`s `office:automatic-styles`) mit `fo:color="#ff0000"`, `P4` mit `#000000`, direkt in `style:text-properties`; Absätze mit **und** ohne `<text:span>`; leere Absätze mit/ohne explizite Farbe; zusätzlich ein Absatz „…text color ‚Chart12'" über `text:style-name="Standard"`, wobei `Standard` verifiziert ein **`style:family="paragraph"`**-Stil innerhalb `<office:styles>` in `styles.xml` ist (`fo:color="#0084d1"`) — also eine benannte **Absatz**-Formatvorlage, nicht wörtlich Grenzfall 12s „Zeichenformatvorlage", aber vom selben additiven 3.2-Fix (der nur `office:automatic-styles` erweitert) gleichermaßen unversorgt | Primär-Fixture 3.2-ODT: „Entire paragraph in red." (Absatz `P1`, **ohne** Span, **Rot** → sichtbarer Verlust) — nach Fix Mark auf allen Textknoten dieses Absatzes. Zugleich der **tragfähigste** Grenzfall-12-artige Fallback-Beleg im selben File (der „Chart12"/„Standard"-Absatz bleibt ohne Mark, siehe Korrektur 0.2 Punkt 5). Leere Absätze dürfen nach Fix keine Exception werfen |
| `character-styles.odt` | `content.xml`: Span mit `fo:color="#ff0000"` **und** Verweis `Default_20_Paragraph_20_Font`; verifiziert ist dieser Stil in `styles.xml`/`office:styles` aber **leer** (keine `style:text-properties`) — belegt nur „unaufgelöste Referenz bricht nichts", **nicht** einen sichtbaren Farbverlust (Korrektur 0.2 Punkt 5); `styles.xml`/`office:styles` enthält daneben u. a. `fo:color="#345a8a"` auf anderen, nicht referenzierten Stilen | ODT-**Basisfall** (Span-`fo:color`, vom aktuellen Reader erkannt); als alleiniger Grenzfall-12-Beleg zu schwach — siehe `text-color-from-paragraph.odt` |
| `coloredTable_MSO15.odt` | `fo:color` in Tabellenzellen (`#FF0000`/…) | Grenzfall 3 (Zellgrenze) mit echter Datei |
| `hyperlinkSpaces.odt`, `feature_attributes_character_MSO15.odt`, `ListStyleResolution.odt`, `indentTest.odt` | Span-`fo:color` in `content.xml` (32 ODT-Fixtures insgesamt mit `fo:color` in `content.xml`) | weitere verifizierte Span-Farb-Basisfälle |
| ~~`spanInheritanceTest.odt`~~ | Jeder tatsächlich referenzierte Span-Stilname (`red`, `green`, `BACKGROUND_YELLOW_red`, `T1`…`T13`, `Default_20_Paragraph_20_Font`) ist bis auf eine Ausnahme direkt in `content.xml`s **eigenen** `office:automatic-styles` definiert — wird vom heutigen Reader **bereits korrekt aufgelöst**, ist also **kein** Grenzfall-12-Beleg (Korrektur 0.2 Punkt 4) | **Nicht** für Grenzfall 12 verwenden; separater, hier nicht zu fixender Nebenbefund: `BACKGROUND_YELLOW_red`s `style:parent-style-name`-Kette **innerhalb** der automatischen Stile wird nie aufgelöst (Vererbung der Hervorhebung fehlt) — dokumentieren, nicht beheben |
| ~~`coloredParagraph.odt`~~ | **kein `fo:color`** (Span → Stil `a9905fb` ohne Farbe) | **untauglich** als Farb-Fixture — nicht verwenden (Korrektur 0.1 Punkt 2) |

---

## 7. Neue/erweiterte Unit-Tests (Vitest)

### 7.1 `src/formats/docx/__tests__/textColor.test.ts` (neu)

Reader-Fälle jenseits dessen, was der eigene Writer erzeugt:

- Gegen `TestDocument.docx` (echt, siehe Korrektur 0.2/Abschnitt 6): „RED"/`#800000` und
  „YELLOW"/`#e6ff00` werden je als `textColor`-Mark auf den richtigen Textknoten gelesen,
  **case-insensitiv** verglichen (Anforderung 3.8 — nicht auf exakte Groß-/Kleinschreibung
  testen). Ersetzt die vorherige, fälschlich auf `Tika-792.docx` gestützte Version dieses
  Testfalls (siehe Korrektur 0.2 Punkt 1).
- `w:val="auto"` → keine Mark.
- `w:val="auto" w:themeColor="accent1"` (**handgebaut**, kein Fixture, siehe 6) → keine Mark,
  Standardfarbe (Grenzfall 11, dokumentierter Fallback).
- **Grenzfall 22 (neu, bisher in keiner Fassung dieses Plans getestet):** Gegen `Tika-792.docx`
  — der einzige `w:color`-Beleg der Datei liegt in `<w:rPrChange>` (Verlaufsformat) und ist
  zusätzlich in `<w:moveFrom>` verschachtelt → Test bestätigt **explizit**, dass (a) **keine**
  `textColor`-Mark aus dieser Datei entsteht und (b) der betroffene Lauf („b") mangels
  `moveFrom`-Unterstützung in `collectRuns` komplett fehlt (separat als Import-Vollständigkeits-
  Fund für `datei-oeffnen`/Track-Changes zu melden, hier nur als **bestätigtes, korrektes**
  Nicht-Verhalten für die Farbfrage). Ohne diesen Test bleibt Grenzfall 22 nur behauptet, nicht
  verifiziert.
- Absatzstil mit `w:rPr/w:color`, Lauf ohne eigenes `rPr` → nach 3.2-Fix Mark mit geerbter
  Farbe (gegen `52288.docx`, „CHAPTER 1" → `#000000`; zusätzlich **handgebaute** Datei mit
  nicht-schwarzer Stilfarbe für einen sichtbaren-Verlust-Nachweis).
- Lauf-`w:color` **überschreibt** abweichende Absatzstil-Farbe (Kaskade).
- `w:basedOn`-Kette über zwei Ebenen (A ohne Farbe, `basedOn` B mit Farbe) → Farbe von B.
- **Zirkuläre** `w:basedOn` (A↔B, konstruiert) → kein Stack-Overflow, `resolveStyleColor`
  bricht per Tiefenlimit ab, liefert `null`.
- Wert mit `"`/`&` (simuliert korrupte Datei) → Reader übernimmt ihn (kein Absturz beim
  Lesen); der **Export** desselben Werts wird in `writer-escaping.test.ts` (neu) geprüft:
  nach 3.1-Fix bleibt das XML mit `DOMParser` fehlerfrei parsbar.

### 7.2 `src/formats/odt/__tests__/textColor.test.ts` (neu)

- Gegen `text-color-from-paragraph.odt` (Multi-Szenario, siehe 3.2/6): **gezielt** den Absatz
  „Entire paragraph in red." (`P1`, ohne Span) adressieren — nach 3.2-Fix trägt jeder seiner
  Textknoten `textColor`=`#ff0000` (case-insensitiv). Ergänzend prüfen: die Absätze mit
  Absatzstil `P2`/`P5` werden ebenfalls rot, `P4` schwarz; leere Absätze werden ohne Exception
  verarbeitet. **Nicht** „alle Textknoten sind rot" pauschal behaupten. Im **selben** Test
  (oder einem Schwester-`it`) das **Fehlen** einer Mark am „…text color ‚Chart12'"-Absatz
  belegen — dessen Farbe stammt aus `text:style-name="Standard"`, einer benannten
  **Absatz**-Formatvorlage (`style:family="paragraph"`) in `office:styles` (verifiziert
  `fo:color="#0084d1"` in `styles.xml`, siehe Korrektur 0.2 Punkt 5), und bleibt bewusst
  ungefixt, weil der 3.2-Fix nur `family="paragraph"` **innerhalb** `office:automatic-styles`
  erweitert. Diese Datei ist damit der kompakteste Nachweis für „Absatzstil-Fix greift"
  **und** „`office:styles`-Fall bleibt Fallback" zugleich — der einzige tragfähige Beleg für
  Letzteres in dieser Suite (siehe nächste zwei Punkte).
- Gegen `character-styles.odt`: der Span mit `fo:color="#ff0000"` ergibt (schon heute) eine
  Mark; der `Default_20_Paragraph_20_Font`-Verweis ergibt **keine** Mark. **Einschränkung
  (Korrektur 0.2 Punkt 5):** Dieser referenzierte Stil ist selbst leer (keine
  `style:text-properties` in `office:styles`) — der Test belegt nur „unaufgelöste Referenz
  bricht nichts", **nicht** einen Farbverlust; als alleiniger Grenzfall-12-Beleg nicht
  ausreichend, ergänzend zu `text-color-from-paragraph.odt` zu führen, nicht anstelle davon.
- **Nicht** `spanInheritanceTest.odt` für Grenzfall 12 verwenden (Korrektur 0.2 Punkt 4): jeder
  dort tatsächlich referenzierte Span-Stil ist bereits in `content.xml`s eigenen
  `office:automatic-styles` definiert und wird vom heutigen Reader korrekt aufgelöst — ein
  Test „Farbe kommt an" wäre hier **kein** Fallback-, sondern ein Regressions-Basisfall. Falls
  gewünscht, separat (außerhalb dieser Anforderung) den echten Nebenbefund testen: die
  `style:parent-style-name`-Kette von `BACKGROUND_YELLOW_red` auf `BACKGROUND_YELLOW`
  **innerhalb** der automatischen Stile wird nie aufgelöst, die vererbte Hervorhebung fehlt.
- Konstruiertes ODT: `fo:color="notacolor"` → String unverändert übernommen (Grenzfall 10,
  dokumentierter Fallback: `toDOM` gibt ungültiges CSS weiter, Browser ignoriert still).
- `props.color="#000000"` vs. keine Mark → `styleNameFor` erzeugt zwei verschiedene Stilnamen
  (Grenzfall 9, gegen `isEmpty`).
- Regenbogen-Text (viele Farben, Grenzfall 15) → N Farben ⇒ N Stildefinitionen, kein
  quadratisches Verhalten.

### 7.3 Erweiterung `docx`/`odt` `__tests__/roundtrip.test.ts`

- „explizites `#000000` vs. keine Farbe" (Grenzfall 9/Rundreise 9): erster Lauf
  `textColor:#000000`, zweiter ohne Mark → nach Rundreise strukturell unterscheidbar
  (DOCX: `<w:color w:val="000000"/>` nur am ersten Lauf; ODT: `Tn`-Stil nur am ersten Span).
- „nur Schriftfarbe, keine weiteren Marks" (Grenzfall 14) → keine leeren Stildefinitionen.
- „fett + unterstrichen + Schriftfarbe + Hervorhebungsfarbe" (Rundreise 8) — konstruiert,
  ergänzend zur E2E-Version.

---

## 8. Neue E2E-Tests (Playwright) — Kern der Anforderung

### 8.1 `tests/e2e/schriftfarbe.spec.ts` (neu)

Stil analog `tests/e2e/{docx,odt,selection-regression}.spec.ts` (gleiche Card-/Locator-Helfer
wiederverwenden), Schriftfarbe **immer** über `getByLabel('Textfarbe')` /
`getByTitle('Textfarbe entfernen')` bzw. `pickColor(page,'Textfarbe',…)` ansprechen (2.1).
Deckt Anforderung Abschnitt 7 ab:

- **Testfall 1/2**: markieren, `input[aria-label="Textfarbe"].fill('#ff0000')` (Playwright
  setzt `<input type="color">` direkt per `fill`), Text in `span[style*="color: rgb(255, 0, 0)"]`
  (bzw. berechneter Stil); „⌫" → Mark verschwindet.
- **Testfall 3** (nach 3.3-Fix, **korrigierter** Erwartungswert): Cursor ohne Selektion,
  Farbe, tippen → neuer Text **übernimmt** die Farbe; Testname verweist explizit auf die
  Entscheidung in 3.3.
- **Testfall 4/Grenzfall 6**: gemischte Selektion → Setzen überschreibt einheitlich, keine
  Exception (`page.on('pageerror', …)`).
- **Testfall 5**: Fett + Unterstrichen + Schriftfarbe + Hervorhebungsfarbe gleichzeitig, alle
  vier unabhängig entfernbar.
- **Testfall 7**: Tippen → Farbe A → Farbe B → Entfernen → Tippen, je `Strg+Z`/`Strg+Y`
  schrittweise; Kommentar auf 3.4 (Zwischenschritte höchstens einer pro `fill()`).
- **Grenzfälle je dedizierter Test** (kein Sammeltest): 2 (Absatzgrenze), 3 (Tabellenzelle —
  Tabelle einfügen, beide Zellen selektieren, Farbe, dritte Zelle unberührt), 4 (Leerzeichen),
  5 (Text bis in folgenden `image`-Block — `image` ist Block-Node), 7 (dieselbe Farbe erneut
  → genau ein `<w:color>`/ein `Tn` im Export), 8 (`#ffffff`, kein Absturz, Wert erhalten),
  17 (Undo/Redo), 19 (`expect(editor).toBeFocused()` nach `fill()`).
- **Testfall 11 (⌫-A11y)**: Button hat nicht-leeren Textinhalt und erscheint im
  Accessibility-Tree als Button (die visuelle Glyphen-Lesbarkeit über OS/Browser ist manuell,
  Abschnitt 10).
- **Testfall 13 (Tastatur)**: `Tab` bis Fokus auf dem Farb-Input; Öffnen des nativen Dialogs
  per Enter/Leertaste ist **nicht** automatisierbar (OS-Dialog) → manuell (Abschnitt 10).
- **Testfall 14 (Fokus-Isolation, Regressionsschutz)**: `Strg+C`/`Strg+X` bei fokussiertem
  Textfarbe-Farbwähler lassen den Editor-Inhalt unverändert (sichert `clipboard.spec.ts:368`
  / `cut.spec.ts:348` nach dem 3.4-Refactor ab).

### 8.2 Erweiterung `tests/e2e/selection-regression.spec.ts` (Pflicht, Grenzfall 18/Testfall 6)

Im selben `describe` ergänzen (Abnahmekriterium 3 „dauerhaft verankert"):

```ts
test('same regression with "Schriftfarbe" instead of "Fett" (Grenzfall 18)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.locator('input[aria-label="Textfarbe"]').fill('#ff0000')
  await editor.click(); await page.keyboard.press('End'); await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
  await expect(editor.locator('p', { hasText: 'Hallo, das ist ein Test.' })).toHaveCSS('color', 'rgb(255, 0, 0)')
})
```

### 8.3 Rundreise-E2E (Abschnitt 6 der Anforderung → Abnahmekriterium 2)

Neuer `test.describe`-Block:

- **Rundreise 1/2**: DOCX-/ODT-Eigenrundreise über echte Toolbar-Bedienung (Farbe per
  `fill()`, exportieren via `page.waitForEvent('download')`, re-importieren via `filechooser`,
  Farbe erneut sichtbar).
- **Rundreise 3/4/5**: Cross-Format DOCX→ODT, ODT→DOCX, doppelte Rundreise.
- **Rundreise 6/7 (Pflicht, Abnahmekriterium 2)**: Upload **`TestDocument.docx`** (echt,
  verifiziert `w:val="800000"`/`"E6FF00"` direkt auf `w:r/w:rPr`, siehe Korrektur 0.2/
  Abschnitt 6 — **nicht** `Tika-792.docx`: dessen einziger `w:color`-Beleg steckt in
  `<w:rPrChange>` und wird vom heutigen Reader korrekterweise **nicht** als aktuelle Farbe
  gelesen, siehe 7.1 Grenzfall-22-Test) → Farbe sichtbar → Export → exportiertes
  `word/document.xml` **ohne `readDocx`** per Regex/`DOMParser` auf
  `/<w:color\s+w:val="800000"\s*\/>/` (bzw. `"E6FF00"`) prüfen (Muster wie `docx.spec.ts`).
  Für ODT analog **`character-styles.odt`** (verifizierter Span-`fo:color="#ff0000"`,
  **nicht** `coloredParagraph.odt`) → exportiertes `content.xml` auf
  `style:style … fo:color="#ff0000"`. Ergänzt durch die echte Schema-/Parser-Validierung in
  Abschnitt 9.
- **Rundreise 8**: fett+unterstrichen+farbig plus zweiter Lauf farbig+hervorgehoben, stabil
  über alle Rundreisen.
- **Rundreise 9**: `#000000` explizit vs. keine Farbe (auch über echte Bedienung).

### 8.4 Grenzfälle 11/12 mit echten Fremddateien (Abnahmekriterium 5)

- Grenzfall 11: Upload `SampleDoc.docx` **und** `shapes-with-text.docx` → Editor zeigt die
  `w:val`-RGB-Farbe; Testkommentar: Theme-Zuordnung (`text2`/`dark1`) bewusst nicht
  ausgewertet (Nicht-Ziel).
- Grenzfall 12: Upload `text-color-from-paragraph.odt` **und** `character-styles.odt` → Test
  prüft explizit das **Fehlen** der Mark am „Chart12"/„Standard"-Absatz bzw. am
  `Default_20_Paragraph_20_Font`-Span, Kommentar „bestätigter Fallback, kein Fix in diesem
  Schritt, siehe schriftfarbe-code.md 3.2/0.2". **Nicht** `spanInheritanceTest.odt` verwenden
  — dessen Span-Stile sind bereits über `office:automatic-styles` aufgelöst und daher **kein**
  Grenzfall-12-Beleg (Korrektur 0.2 Punkt 4).

---

## 9. Unabhängige Parser-Validierung (Rundreise-Testfall 7 / Abnahmekriterium 2)

**Korrektur des Vorentwurfs:** Das Repo besitzt bereits zwei vom eigenen Reader unabhängige
Validierungskanäle (Dev-Deps in `package.json`, verdrahtet in beiden
`__tests__/external-validation.test.ts`). Beide sind hier zu **erweitern**, nicht neu
einzuführen:

1. **ODT — `xmllint-wasm` + offizielles OASIS-ODF-1.3-RelaxNG-Schema**
   (`tests/fixtures/external/odf-schema/OpenDocument-v1.3-schema.rng`, validiert
   `office:document-content`/`office:document-styles`). In `odt/__tests__/external-validation.test.ts`
   einen Fall ergänzen: ein Dokument mit `textColor` exportieren und das erzeugte `content.xml`
   gegen das Schema validieren (`expect(result.valid).toBe(true)`). Das ist die von
   Rundreise-Testfall 7 geforderte „unabhängige ODF-Bibliothek/`odfvalidator`" — **stärker**
   als die Regex-Selbstprüfung des Vorentwurfs und ohne neue Toolchain. Aktuell existiert dort
   **kein** Farb-Fall (verifiziert) — genau diese Lücke wird geschlossen.
2. **DOCX — `mammoth`** (unabhängiger DOCX→HTML-Parser, `docx/__tests__/external-validation.test.ts`).
   **Ehrliche Einschränkung (verifiziert):** `mammoth` liest run-`w:highlight`
   (`body-reader.js:100`), **nicht** run-`w:color` (Vordergrundfarbe) — es gibt in mammoth
   keinen `w:color`-Reader. `mammoth` kann daher bestätigen, dass die exportierte Datei von
   einem fremden Parser **fehlerfrei geöffnet** und strukturell erkannt wird (bereits heute im
   U9-Test), **aber nicht** die Schriftfarbe selbst als solche zurückmelden. Konsequenz für
   die DOCX-Farbvalidierung:
   - Automatisiert: (a) `mammoth`-Öffnen des Farbdokuments ohne Fehler (Datei bleibt für einen
     fremden Parser ladbar — deckt exakt das Risiko aus 3.1 ab); (b) direkte, `readDocx`-freie
     `DOMParser`/Regex-Assertion auf `<w:color w:val="…">` im exportierten `document.xml`.
   - Vollständige, unabhängige **Farb-Erkennung** (nicht nur Wohlgeformtheit) für DOCX würde
     python-docx oder ein OOXML-XSD erfordern, das derzeit **nicht** im Repo liegt (die
     ODF-RNG deckt nur ODT ab). Das ist als bewusste, dokumentierte Grenze festzuhalten
     (Abnahmekriterium 2 ist für DOCX über die Kombination a+b erfüllbar; die stärkere
     Schema-Erkennung ist real nur für ODT verfügbar).

Kein `scripts/`-Hilfsskript nötig — beide Kanäle laufen als Vitest.

---

## 10. Manuelle Prüfschritte (nicht automatisierbar, Teil der Abnahme)

1. **„⌫"-Glyph-Rendering** auf ≥ 2 System-/Browser-Kombinationen (z. B. Windows+Chrome,
   Linux+Firefox) — Ergebnis (lesbar / Ersatzzeichen) hier vermerken (Abnahmekriterium 8).
2. **Nativer Farbwähler-Dialog** — öffnet zuverlässig per Klick **und** Tastatur
   (Tab→Enter/Leertaste) in Chromium/Firefox/WebKit; Hex-Direkteingabe im nativen Dialog
   möglich.
3. **Undo-Schrittanzahl** nach dem 3.4-Fix — durch echtes Ziehen im nativen Dialog (nicht
   `fill()`) bestätigen: höchstens ein Undo-Schritt pro abgeschlossener Farbwahl; Dialog
   schließt nicht vorzeitig.
4. Ergebnis von 1–3 fließt in die Statusänderung „vorhanden" → „verifiziert" in
   `specs/FEATURE-BACKLOG.md` ein.

---

## 11. Offene Abhängigkeiten (nur dokumentieren)

- **`formatierung-loeschen`** (Status „fehlt"): muss künftig `wordSchema.marks.textColor` in
  seine Clear-Logik aufnehmen (Anforderung 3.6). Kein Code jetzt.
- **`textmarker-farbe`**: teilt `applyMarkColor`/`clearMarkColor`, die neue
  `ColorMarkControl` (3.4) und den `escapeXml`-Fix (3.1). Bei separater Verifikation auf
  diesen Codestand verweisen. Zusatz aus 5/9: der `<w:shd>`-Export der Hervorhebung wird von
  `mammoth` nicht als Highlight erkannt — dort gesondert zu bewerten.
- **`schriftart-waehlen`/`schriftgroesse-waehlen`** (Status „fehlt"): keine inhaltliche
  Abhängigkeit, nur Nachbar-Toolbar-Gruppe.
- **Allgemeine Stilvererbung** (`w:rStyle`, mehrstufige ODF-`parent-style-name`-Ketten,
  `office:styles`): Der 3.2-Fix deckt nur die Absatzstil-Ebene. Eine vollständige
  Kaskaden-Engine (relevant auch für Fett/Kursiv/Unterstrichen/Hervorhebung) wäre ein eigenes
  Feature — hier nur als Weichenstellung vermerkt.

---

## 12. Abnahme-Mapping (Anforderung → Umsetzung)

| Anforderung | Abgedeckt durch |
|---|---|
| Testfälle 1–14 (Abschnitt 7 der Anforderung) | 8.1 (`schriftfarbe.spec.ts`) |
| Testfall 6/Grenzfall 18 (Selection-Sync) | 8.2 (`selection-regression.spec.ts`) |
| Rundreise 1–9 (Abschnitt 6) | 8.3 |
| Grenzfälle 1–10, 13–19 | 8.1 (je dedizierter Test); leere Selektion = korrigiertes Soll (3.3) |
| Grenzfall 11 (Theme-Farben) | 8.4 (`SampleDoc.docx`/`shapes-with-text.docx`) |
| Grenzfall 12 (office:styles) | 8.4 (`text-color-from-paragraph.odt`/`character-styles.odt`), dokumentierter Fallback — **nicht** `spanInheritanceTest.odt` (Korrektur 0.2 Punkt 4) |
| Grenzfall 22 (`w:rPrChange`, bewusst korrektes Nicht-Verhalten) | 7.1 (`Tika-792.docx`, neuer dedizierter Test — bisher in keiner Fassung dieses Plans getestet) |
| Abnahmekriterium 1 (alle Tests grün) | 7 + 8 |
| Abnahmekriterium 2 (Rundreise 1,2,6,7 mit echten Prüfwerkzeugen) | 8.3 (`TestDocument.docx`, **nicht** `Tika-792.docx` — Korrektur 0.2 Punkt 1) + **9** (ODT: xmllint-wasm/ODF-RNG; DOCX: mammoth-Öffnen + Regex, mit dokumentierter Grenze) |
| Abnahmekriterium 3 (Grenzfall 18 verankert) | 8.2 |
| Abnahmekriterium 4 (Entscheidung leere Selektion) | **3.3 (Entscheidung: nachrüsten)** |
| Abnahmekriterium 5 (Grenzfall 11/12/21/22 mit echten Dateien) | 8.4 + 7.1 |
| Abnahmekriterium 6 (Fremdfarbwert/OOXML-Gültigkeit) | 3.1 (Escaping) + 7.1 (writer-escaping) + 3.10-Verweis; Normalisierungs-Entscheidung dort |
| Abnahmekriterium 7 (Aktiv-Zustand behoben oder dokumentiert) | 3.6 (bewusst dokumentiert) |
| Abnahmekriterium 8 (⌫-Rendering ≥ 2 Systeme) | 10 Punkt 1 (manuell) |
| Abnahmekriterium 9 (kein Fund ohne Vermerk) | 0.1 + 0.2 (Korrekturen) + 3 (Funde) + 11 (offene Abhängigkeiten) |
