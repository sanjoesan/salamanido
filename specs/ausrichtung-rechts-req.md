# Anforderungsspezifikation: Feature „Ausrichtung rechts“

Status: **Nicht vertrauenswürdig — vollständige Verifikation ausstehend.** Im
`specs/FEATURE-BACKLOG.md` als Zeile geführt: Slug `ausrichtung-rechts`, Titel
„Ausrichtung rechts“, Beschreibung „Richtet den Absatz rechtsbündig aus.“, Status
`vorhanden`, Priorität `1` (Absatzformatierungs-Gruppe). Diese Datei ersetzt die
Backlog-Beschreibung nicht, sondern macht sie so detailliert und einzeln abhakbar, dass
ein QA-Agent jeden Punkt über echte Browser-Bedienung (nicht nur Unit-Tests) nachweisen
oder widerlegen kann.

Geltungsbereich: Ausschließlich die Absatzausrichtung „rechts“ (Attribut `align:
'right'` auf den Node-Typen `paragraph` und `heading` im gemeinsamen
ProseMirror-Schema, `src/formats/shared/schema.ts`). Die drei Geschwister-Werte
`left`/`center`/`justify` sind eigene Backlog-Einträge (`ausrichtung-links`,
`ausrichtung-zentriert`, `ausrichtung-blocksatz`) und nicht Gegenstand dieser Datei,
werden aber dort erwähnt, wo sie zur Abgrenzung nötig sind (das Umschaltverhalten
zwischen den vier Werten ist nur gemeinsam sinnvoll beschreibbar). Gilt für **beide**
Formate, DOCX und ODT, sowohl beim Import einer bestehenden Datei als auch beim Export
eines im Editor erstellten/bearbeiteten Dokuments — inklusive Rundreise (Datei
hochladen → unverändert exportieren → Ergebnis entspricht inhaltlich dem Original).
Stil und Gliederung orientieren sich an `E:\docs\FEATURE-SPEC-DOCX-ODT.md` (dort
Abschnitt 4 „Absatzformatierung“) sowie an den bereits vorliegenden
Einzel-Anforderungsdateien `specs/fett-req.md` und `specs/durchgestrichen-req.md`.

## Hinweis zur Code-Verankerung

Die Fundstellen unten wurden am **2026-07-04** direkt gegen den Quellcode geprüft und
korrigiert (eine frühere Fassung dieser Datei enthielt teils veraltete/falsche
Zeilennummern und zwei sachlich falsche Aussagen — siehe Änderungshinweise in den
betroffenen Abschnitten). Am **2026-07-05** wurde die gesamte Fundstellentabelle ein
zweites, unabhängiges Mal gegen den Quellcode gehalten (`schema.ts`, `commands.ts`,
`Toolbar.tsx`, `WordEditor.tsx`, `docx/reader.ts`, `docx/writer.ts`,
`odt/styleRegistry.ts`) — **alle** Symbol-Anker und alle abgeleiteten Aussagen wurden
dabei bestätigt. In einem **dritten** Durchgang am selben Tag (dieser
Product-Owner-Durchlauf) wurden `schema.ts`, `commands.ts`, `Toolbar.tsx` und
`WordEditor.tsx` erneut direkt gelesen: sämtliche Symbolnamen sind weiterhin **exakt**
zutreffend (`setAlign` mit Ein-Transaktion-pro-Block, `isAlignActive` nur `$from`,
`setHeading` mit erzwungenem `align: 'left'`, `AlignButton` ohne `aria-label` neben
`MarkButton` mit `aria-label`, keine Ausrichtungs-Taste in der Keymap). **Eine**
Zeilennummern-Angabe ist jedoch nachweislich gewandert: der `keymap({…})`-Block in
`WordEditor.tsx` liegt nun bei ~Z. 85–107 (statt 77–99 vom 2026-07-04) — die
betroffenen Tabellenzeilen wurden entsprechend nachgezogen. Das ist der konkrete, in
dieser Datei selbst belegte Beweis dafür, dass die Zeilennummern driften und
**ausschließlich** die Symbolnamen als Anker taugen. Zusätzlich wurde eine sachliche
Ungenauigkeit einer früheren Fassung korrigiert: Grenzfall 4 sprach von einem
„Inline-Bild“; `image` ist im Schema aber ein **Block**-Knoten (`group: 'block'`) und
damit **kein** gültiger Inline-Inhalt eines Absatzes (`content: 'inline*'`) — die
Absatzausrichtung wirkt daher nie auf ein Bild (der zugehörige, neu aufgenommene
Nicht-ausrichtbar-Fall ist jetzt Grenzfall 16/Verdachtsmoment 16). **Anker sind primär die Symbol-/Funktionsnamen; die
Zeilennummern sind nur ein Stand-2026-07-04-Hinweis und können driften.** Die
QA-Verifikation soll sich an den Symbolnamen orientieren, nicht an den Zahlen. Diese
Tabelle ist Grundlage der Anforderung, **kein** Nachweis der Korrektheit — das ist
Aufgabe der Verifikation.

**Vierter Durchgang (2026-07-05, dieser Product-Owner-Verifikationslauf):** Sämtliche
Symbol-Anker (`schema.ts`, `commands.ts`, `Toolbar.tsx`, `WordEditor.tsx`,
`docx/reader.ts`, `docx/writer.ts`, `odt/reader.ts`, `odt/writer.ts`,
`odt/styleRegistry.ts`) wurden erneut einzeln gegen den aktuellen Quellcode geprüft —
**alle** weiterhin exakt zutreffend, inklusive fast aller Zeilennummern. **Eine weitere
Zeilennummer ist seit dem dritten Durchgang gewandert:** `dispatchTransaction` in
`WordEditor.tsx` liegt jetzt bei **Z. 125–132** (nicht mehr Z. 117–124) — verschoben durch
einen zwischenzeitlich eingefügten Kommentarblock zum Rechtsklick-„Ausschneiden“-Verhalten
zwischen `EditorState.create` und `new EditorView` (Folge der seither gelandeten
Ausschneiden-Funktion, siehe `specs/ausschneiden-code.md`); unten korrigiert. Das bestätigt
erneut, dass ausschließlich die Symbolnamen als stabiler Anker taugen.
**Neuer, in den vorherigen Durchgängen nicht erfasster Fund:** Es existiert inzwischen
`tests/e2e/roundtrip-fidelity.spec.ts` — ein **echter** E2E-Rundreisetest (Playwright, realer
Datei-Upload → Export-Download → Reimport über dieselbe UI), der für **beide** Formate
(„DOCX -> DOCX“ und „ODT -> ODT“) unter „Kriterium 4: Absatzausrichtung“ eine
CSS-Assertion `toHaveCSS('text-align', 'center')` prüft — sowohl vor als auch nach dem
Reimport. Das ist der bisher einzige Test, der eine Absatzausrichtung im Kontext eines
**echten** Browser-Uploads/-Exports verifiziert, und relativiert insofern (ohne sie zu
widerlegen) die Aussage „kein E2E-Test prüft Ausrichtung“ in der Fundstellenzeile
„E2E-Tests (Browser)“. Er bleibt aber aus zwei Gründen kein Ersatz für die in Abschnitt 7
geforderten Tests: (a) er prüft **ausschließlich `'center'`** — die zugrunde liegende
Fixture `tests/e2e/fixtures/richDocument.ts` erzeugt weder `<w:jc w:val="right"/>` noch
`fo:text-align="right"` an irgendeiner Stelle (verifiziert per Volltextsuche); (b) er prüft
das **Ergebnis eines Datei-Imports**, nicht das Anklicken eines `AlignButton` in der
Toolbar — die Kernaussage „kein Test klickt einen der vier Ausrichtungs-Buttons im
Browser“ bleibt daher unverändert wahr. Siehe die neue Fundstellenzeile
„E2E-Rundreisetest (Import-Fidelity)“, Verdachtsmoment 6.15 und Testfall 47.

**Fünfter Durchgang (2026-07-05, unabhängiger Product-Owner-Verifikationslauf, neue
Instanz ohne Kenntnis der vorherigen Durchgänge):** Alle Symbol-Anker (`schema.ts` Z. 4/
16–24/26–38, `commands.ts` Z. 8–55, `Toolbar.tsx` Z. 91–111/234–237/165–180,
`WordEditor.tsx` Keymap Z. 85–107 und `dispatchTransaction` Z. 125–132, `docx/reader.ts`
`JC_TO_ALIGN`/`parseStylesXml`/Z. 239–240, `docx/writer.ts` `JC_BY_ALIGN`/
`paragraphPropsXml`, `odt/reader.ts` `paragraphAligns`/`parseAutomaticStyles`,
`odt/writer.ts` `blockToOdt`, `odt/styleRegistry.ts` `PARAGRAPH_ALIGN_STYLE_NAME`/
`paragraphAlignStyleDefs`/`headingStyleName`/`headingStyleDefs`) sowie die beiden
Unit-Test-Fundstellen (`docx/__tests__/roundtrip.test.ts` Z. 47–52/54–59,
`odt/__tests__/roundtrip.test.ts` Z. 49–52/56–61) und der Befund zu
`roundtrip-fidelity.spec.ts` (nur `'center'`, kein `'right'` in `richDocument.ts`) wurden
erneut direkt gegen den aktuellen Quellcode gelesen und **bestätigt** — bis auf die eine,
unten in der Zeile „Toolbar“ korrigierte Zeilennummer (`aria-pressed`: tatsächlich Z. 97,
nicht Z. 100 wie eine frühere Fassung dieser Zeile behauptete) ist **jede** Aussage dieser
Tabelle weiterhin exakt zutreffend, inklusive der Backlog-Zeile in
`specs/FEATURE-BACKLOG.md` (Slug, Titel, Beschreibung, Status `vorhanden`, Priorität `1` —
unverändert). Damit ist diese Datei nach fünf unabhängigen Codeprüfungen (vier vorherige
plus dieser Durchgang) sachlich belastbar; verbleibende offene Punkte sind ausschließlich
die in Abschnitt 6/8 gelisteten Verdachtsmomente und Entscheidungen, nicht die
Faktenbasis selbst.

| Ebene | Fundstelle (Symbol → ca. Zeile) | Befund |
|---|---|---|
| Datenmodell | `schema.ts` → `alignAttr` (Z. 4), `paragraph` (Z. 16–24), `heading` (Z. 26–38) | `alignAttr = { align: { default: 'left', validate: 'string' } }`, angewendet auf `paragraph` (`attrs: alignAttr`) **und** `heading` (`...alignAttr`). `validate: 'string'` erlaubt **jeden** String, nicht nur die vier gültigen Werte `left`/`center`/`right`/`justify` — keine Enum-Absicherung auf Schema-Ebene. |
| Editor-Rendering (Ausgabe) | `schema.ts` → `paragraph.toDOM` (Z. 21–23), `heading.toDOM` (Z. 35–37) | `toDOM` schreibt `{ style: \`text-align: ${node.attrs.align}\` }` direkt durch — ein invalider Wert würde als ungültiges CSS stillschweigend ignoriert (Browser fällt auf `text-align: start` zurück), nicht abgefangen. |
| Editor-Rendering (Eingabe/Paste) | `schema.ts` → `paragraph.parseDOM.getAttrs` (Z. 20), `heading.parseDOM.getAttrs` (Z. 31–34) | `getAttrs` liest `align` aus `(dom).style.textAlign \|\| 'left'`. **Relevant für Einfügen aus der Zwischenablage**: extern kopierter, per Inline-CSS `text-align: right` rechtsbündiger Text wird beim Paste als `align: 'right'` übernommen; ein gepastetes `text-align: end`/`start` landet — wie beim Datei-Import — **unnormalisiert** im Modell (siehe Grenzfälle 8/8a). Bisher nirgends getestet. |
| Befehl (Setzen) | `commands.ts` → `alignableTypes` (Z. 10), `setAlign` (Z. 13–27) | `setAlign(align)` iteriert `state.doc.nodesBetween(from, to, …)` und ruft **innerhalb** des Callbacks `dispatch(state.tr.setNodeAttribute(pos, 'align', align))` auf — d. h. **eine separate Transaktion pro betroffenem `paragraph`/`heading`-Node**, nicht eine gemeinsame Transaktion für die ganze Selektion. `state.tr` liefert bei jedem Zugriff eine **neue**, vom ursprünglichen `state` abgeleitete Transaktion. `alignableTypes = new Set(['paragraph', 'heading'])`. **Konsequenzen siehe Verdachtsmoment 6.12** (Undo-Granularität, Performance, wirkungslose Wiederhol-Transaktionen). |
| Befehl (Zustand) | `commands.ts` → `isAlignActive` (Z. 29–38) | `isAlignActive(state, align)` prüft **nur** den Block an `$from` (Selektionsanfang), läuft die Tiefen von `$from.depth` abwärts, bis der erste `paragraph`/`heading`-Vorfahre gefunden ist. Bei einer Selektion über mehrere Absätze mit unterschiedlicher Ausrichtung zeigt der Button nur den Zustand des **ersten** Absatzes. Da Ausrichtung eine **Block-Eigenschaft** ist (kein Zeichen-Mark), gibt es hier — anders als bei Fett/Durchgestrichen — **keinen** `storedMarks`-Sonderfall an leerer Schreibmarke. |
| Absatzformat-Wechsel | `commands.ts` → `setHeading` (Z. 40–55) | `attrs = level === null ? undefined : { level, align: 'left' }` (Z. 43): Setzen einer Überschrift erzwingt fest `align: 'left'`; Zurücksetzen auf Standard übergibt `attrs = undefined` → neues `paragraph` fällt auf Schema-Default `align: 'left'`. Zusätzlich: `setHeading` bricht bei `!$from.sameParent($to)` ab (Z. 45) — wirkt also **nur auf einen einzelnen Block**, nicht auf eine Mehr-Absatz-Selektion. |
| Toolbar | `Toolbar.tsx` → `AlignButton` (Komponente Z. 91–111), Instanzen (Z. 234–237) | Vier `AlignButton`: `label="⇤"` (links, Z. 234), `"↔"` (zentriert, Z. 235), `"⇥"` (**rechts**, Z. 236), `"≡"` (Blocksatz, Z. 237) — **„rechts“ ist der dritte von vier** (nach links/zentriert, vor Blocksatz). `title={\`Ausrichtung: ${align}\`}` (Z. 96) → rendert wörtlich „Ausrichtung: right“; `aria-pressed={active}` (Stand 2026-07-05 fünfter Durchgang: **Z. 97**, nicht Z. 100 wie eine frühere Fassung dieser Zeile behauptete — das war die einzige im fünften Durchgang gefundene Zeilennummer-Abweichung, hiermit korrigiert); **kein `aria-label`**. Zum Vergleich: `MarkButton` (Fett/Kursiv/…) trägt **sowohl** `title` **als auch** `aria-label={title}` (Z. 74) — `AlignButton` fehlt der `aria-label` also gegenüber dem direkten Nachbarn asymmetrisch. |
| Tastenkürzel | `WordEditor.tsx` → `keymap({…})` (Stand 2026-07-05: Z. 85–107) | Gebunden sind nur `Mod-z`/`Mod-y`/`Mod-Shift-z` (Undo/Redo, Z. 93–95), `Enter` → `splitListItem` (Z. 96), `Shift-Enter` → `insertHardBreak` (Z. 97), `Mod-b`/`Mod-i`/`Mod-u` (Fett/Kursiv/Unterstrichen, Z. 98–100), `Shift-Delete` → Ausschneiden (Z. 106). **Kein Tastenkürzel für Ausrichtung** (Word/LibreOffice-Standard wäre `Strg+R`). |
| Neuer Absatz (Enter) | `WordEditor.tsx` → `Enter` (Z. 96) + `keymap(baseKeymap)` (Z. 108) | `Enter` ist an `splitListItem` gebunden; außerhalb einer Liste greift `baseKeymap` → `splitBlock`. **Ob der durch Enter entstehende Folgeabsatz die `align`-Ausrichtung des geteilten Absatzes erbt, ist zu verifizieren** (Word-Standard: ja). Bisher nicht spezifiziert und nicht getestet — siehe Verhalten 2.11 und Testfall 20. |
| Editor-Re-Render | `WordEditor.tsx` → `dispatchTransaction` (Stand 2026-07-05: Z. 125–132, zuvor Z. 117–124) | Jede Transaktion mit `tr.docChanged` löst `onChange({ …, body: newState.doc.toJSON() })` und ein Force-Render aus. In Verbindung mit dem Ein-Transaktion-pro-Block-Verhalten von `setAlign` (siehe oben) bedeutet das **N Transaktionen → N `onChange`/`toJSON` → N Re-Renders** bei einer Selektion über N Absätze. |
| DOCX-Import | `docx/reader.ts` → `JC_TO_ALIGN` (Z. 14), `paragraphToBlocks` jc-Auswertung (Z. 235–240) | `JC_TO_ALIGN = { left, center, right, both→justify }`; liest `<w:jc w:val="…">` aus `pPr` **des Absatzes selbst** (`jcVal = … ?? 'left'`, `align = JC_TO_ALIGN[jcVal] ?? 'left'`). Fehlt `<w:jc>` oder ist der Wert nicht in der Map (z. B. `start`, `end`, `distribute`, `thaiDistribute`, `mediumKashida`/`highKashida`/`lowKashida`) → Fallback `'left'`, **unabhängig vom eigentlichen Wert**. |
| DOCX-Stil-Vererbung | `docx/reader.ts` → `parseStylesXml` (Z. 53–67) | `parseStylesXml` liest aus `styles.xml` **ausschließlich** `outlineLvl` (Überschriftenebene) — **keine** Auswertung eines `<w:jc>` in einer per `w:pStyle` referenzierten Absatzformatvorlage. Eine Ausrichtung, die nur über die Formatvorlage (nicht direkt am Absatz) wirksam ist, geht beim Import verloren (→ `'left'`). |
| DOCX-Export | `docx/writer.ts` → `JC_BY_ALIGN` (Z. 18), `paragraphPropsXml` (Z. 69–72), Absatz-/Überschrift-Zweig (Z. 113/121) | `JC_BY_ALIGN = { left, center, right, justify→both }`; `paragraphPropsXml` schreibt **immer** explizit `<w:jc w:val="…"/>` in `pPr`, auch für den Default `left` (keine Auslassung). Unbekannter `align`-Wert → Fallback `'left'` (`JC_BY_ALIGN[align] ?? 'left'`). Gilt für Absätze **und** Überschriften (beide über `paragraphPropsXml`). |
| ODT-Import | `odt/reader.ts` → `ParsedStyles.paragraphAligns` (Z. 23–27), `parseAutomaticStyles` (Z. 63–67), Absatz-/Überschrift-Auswertung (Z. 178/259), `readOdt` (Z. 363–364, 373–374) | `paragraphAligns` wird **ausschließlich** aus `office:automatic-styles` befüllt: `parseAutomaticStyles` liest `fo:text-align` aus `style:paragraph-properties` einer `style:style style:family="paragraph"`. Für Absatz/Überschrift gilt `align = (styleName && styles.paragraphAligns.get(styleName)) \|\| 'left'`. **`readOdt` parst nur `office:automatic-styles`** — aus `content.xml` für den Rumpf (Z. 363–364), aus `styles.xml` **nur** für Kopf-/Fußzeile (Z. 373–374). **`office:styles` (benannte/gemeinsame Vorlagen) wird nirgends ausgewertet, und `style:parent-style-name` wird nicht aufgelöst.** Ein `fo:text-align="end"`/`"start"` wird **unnormalisiert** als `align`-Wert übernommen. |
| ODT-Export (Stildefinitionen) | `odt/styleRegistry.ts` → `PARAGRAPH_ALIGN_STYLE_NAME` (Z. 61–66), `paragraphAlignStyleDefs` (Z. 68–75), `headingStyleName` (Z. 80–82), `headingStyleDefs` (Z. 84–93) | **Korrigierte Darstellung ggü. früherer Fassung:** Die vier Absatz-Ausrichtungsstile `Ppara-left/center/right/justify` werden **statisch und unbedingt** (alle vier, immer) ausgegeben, jeder mit `style:parent-style-name="Standard"` und `fo:text-align="…"`. Ebenso werden **alle** 6×4 = 24 Überschriftenstile `Heading{1–6}-{align}` (Name via `headingStyleName(level, align)`) statisch ausgegeben (mit `parent-style-name="Standard"`, `fo:font-weight="bold"`, `fo:font-size`). Es ist also **nicht** „ein Stil pro vorkommendem Wert on demand“ und **nicht** „keine Wiederverwendung/Vererbung“: alle rechtsbündigen Absätze **teilen sich denselben** benannten Stil `Ppara-right`, und die Stile **haben** eine Elternvorlage (`Standard`). |
| ODT-Export (Referenzierung) | `odt/writer.ts` → `blockToOdt` Absatz (Z. 87–92), Überschrift (Z. 93–98), `buildContentXml` (Z. 206–214) | Absatz: `styleName = PARAGRAPH_ALIGN_STYLE_NAME[align] ?? PARAGRAPH_ALIGN_STYLE_NAME.left` → `<text:p text:style-name="Ppara-right">…`. Überschrift: `<text:h text:style-name="Heading{level}-right" text:outline-level="{level}">`. `buildContentXml` bettet `paragraphAlignStyleDefs()` + `headingStyleDefs()` **unbedingt** in `office:automatic-styles` von `content.xml` ein — die Stildefinition ist also **immer** vorhanden, unabhängig davon, ob ein rechtsbündiger Absatz existiert. **→ Verifikation muss die `text:style-name`-Referenz am Element prüfen, nicht bloß die Existenz des Stils** (siehe 4.2.2). |
| Unit-/Roundtrip-Tests | `docx/__tests__/roundtrip.test.ts` (Z. 47–52, 54–59), `odt/__tests__/roundtrip.test.ts` (Z. 49–52, 56–61) | `it.each(['left', 'center', 'right', 'justify'])('preserves "%s" alignment', …)` — Writer→eigener-Reader-Rundreise für **einen einzelnen, isolierten Absatz** je Wert (deckt „rechts“ für Absätze ab). **Der separate `heading`-Ausrichtungstest deckt nur `'center'` ab, nicht `'right'`** (Z. 47–52 bzw. 49–52). Keine Kombination mit Marks/Listen/Tabellenzellen/Kopf-Fußzeilen, keine Fremddateien, keiner der unten genannten Grenzfälle (`start`/`end`, style-vererbte Ausrichtung), kein Mehr-Absatz-Undo. |
| E2E-Tests (Browser) | `tests/e2e/` (u. a. `docx.spec.ts`, `odt.spec.ts`, `selection-regression.spec.ts`) | **Kein Treffer** für den `⇥`-Button/einen `AlignButton`-Klick in irgendeiner E2E-Datei — es existiert **kein** E2E-Test, der einen der vier Ausrichtungs-Buttons im Browser tatsächlich anklickt. `selection-regression.spec.ts` existiert, testet aber den Selektions-Sync-Bug, **nicht** die Ausrichtung. Die Bedienungs-Absicherung ist ausschließlich Writer→eigener-Reader (siehe aber die folgende Zeile für einen davon unabhängigen, neueren Import-Fidelity-Test). |
| E2E-Rundreisetest (Import-Fidelity) | `tests/e2e/roundtrip-fidelity.spec.ts` — „Kriterium 4: Absatzausrichtung“ (Z. 56–58 und Z. 128–129 im Block „DOCX -> DOCX“, Z. 178–179 und Z. 242–243 im Block „ODT -> ODT“); Fixture `tests/e2e/fixtures/richDocument.ts` (Z. 60, 87, 141) | **Neu identifiziert (2026-07-05).** Echter Playwright-Test: reale DOCX-/ODT-Datei per `setInputFiles` hochladen → unverändert exportieren (Download) → dieselbe Datei per UI reimportieren, dabei `toHaveCSS('text-align', 'center')` auf dem Absatz mit Text „kursiv-rot“ geprüft, **je einmal vor und einmal nach dem Reimport, für beide Formate**. Das ist der einzige Test, der Absatzausrichtung über einen **echten Browser-Upload/-Export** verifiziert. Prüft aber **ausschließlich `'center'`** — die Fixture erzeugt an keiner Stelle `w:jc w:val="right"` bzw. `fo:text-align="right"` (per Volltextsuche bestätigt) — und testet einen **Datei-Import**, nicht das Anklicken eines `AlignButton`. |
| Fixture-Tests | `docx/__tests__/external-fixtures.test.ts`, `odt/__tests__/external-fixtures.test.ts` | **Kein Align-Assert.** Reale Fremddateien werden aktuell nicht auf korrekt erkannte Ausrichtung geprüft (die DOCX-Fixture-Suite prüft nur eine Mindest-Textlänge, die ODT-Suite gar keine Ausrichtung). |

**Konsequenz:** Der Backlog-Status „vorhanden“ ist für die reine Existenz des
Mechanismus (Button, Command, Reader/Writer-Zeile) zutreffend, aber unbelegt in Bezug
auf echte Browser-Bedienung, Fremddateien mit unüblichen `jc`/`text-align`-Werten,
style-vererbte Ausrichtung, das Zusammenspiel mit Listen/Tabellen/Kopf-Fußzeilen sowie
die tatsächliche Transaktions-/Undo-Granularität. **Insbesondere sind zwei Aussagen
einer früheren Fassung dieser Datei nach der Codeprüfung zu korrigieren:** (a) „rechts“
ist der **dritte**, nicht der vierte Button; (b) das Setzen ist **nicht** garantiert
ein einzelner Undo-Schritt, weil `setAlign` pro Block eine eigene Transaktion
dispatcht. Abschnitt 6 listet die konkreten, aus dem Code abgeleiteten
Verdachtsmomente, die die Verifikation gezielt prüfen muss. Der begleitende
Umsetzungsplan `specs/ausrichtung-rechts-code.md` stuft `setAlign` als „bereits
korrekt“ ein — **diese Einschätzung ist angesichts von Verdachtsmoment 6.12 nicht
ungeprüft zu übernehmen**, sondern eigenständig zu belegen oder zu widerlegen.

---

## 1. Menüpunkte / Bedienelemente (Soll)

| # | Element | Ort | Ist-Verhalten laut Code | Soll-Verhalten |
|---|---|---|---|---|
| 1 | Toolbar-Button „Ausrichtung rechts“ (Glyphe „⇥“) | Formatierungsleiste, Gruppe Absatzausrichtung (**nach** der Farb-Gruppe, **vor** der Listen-Gruppe), **dritter von vier** Buttons — nach „links“/„zentriert“, vor „Blocksatz“ | `AlignButton` mit `align="right"`, `onMouseDown` → `preventDefault()` + `setAlign('right')`; `title="Ausrichtung: right"` (englischer Rohwert im Titel, siehe Verdachtsmoment 6.7) | Klick setzt die Ausrichtung **aller** von der Selektion abgedeckten `paragraph`/`heading`-Blöcke auf rechtsbündig. Muss unabhängig von Maus-Selektion, Tastatur-Selektion, Cursor ohne Selektion oder „Alles auswählen“ funktionieren. |
| 2 | Aktiv-Zustand des Buttons (`aria-pressed`, visuelle Hervorhebung) | derselbe Button | `isAlignActive(state, 'right')` prüft ausschließlich den Block an `$from` (Selektionsanfang) | Muss anzeigen, ob der Absatz an Cursor-Position/Selektionsanfang rechtsbündig ist; aktualisiert sich sofort bei jeder Cursor-Bewegung, auch ohne Klick auf den Button. Verhalten bei einer Selektion über mehrere Absätze mit **gemischter** Ausrichtung muss explizit festgelegt und getestet werden (Grenzfall 3.1, Verdachtsmoment 6.5), nicht nur aus dem Code übernommen. Da Ausrichtung Block-Attribut ist, entfällt der `storedMarks`-Sonderfall an leerer Schreibmarke (Unterschied zu Fett/Durchgestrichen — dort explizit ein Streitpunkt). |
| 3 | Icon/Beschriftung des Buttons | derselbe Button | Unicode-Glyphe „⇥“ (RIGHTWARDS ARROW TO BAR), keine Text-Alternative außer `title` | Muss auf allen Zielsystemen/Browsern eindeutig als „rechtsbündig“ von den drei Nachbar-Glyphen „⇤“/„↔“/„≡“ unterscheidbar sein; entspricht dem in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17 Zeile 4 vermerkten offenen Prüfauftrag zu den Ausrichtungs-Symbolen. **`AlignButton` hat — anders als der unmittelbar benachbarte `MarkButton` (`aria-label={title}`) — kein `aria-label`, nur `title`.** Diese Asymmetrie muss entweder als für Screenreader ausreichend verifiziert oder durch Ergänzung eines `aria-label` behoben werden. |
| 4 | Tooltip/Titel-Attribut | derselbe Button | `title={\`Ausrichtung: ${align}\`}` → „Ausrichtung: right“ | **Muss korrigiert werden** auf durchgängig deutschen Text (z. B. „Ausrichtung: rechts“ oder „Rechtsbündig“). Der aktuelle Zustand mischt Deutsch und Englisch im selben Satz; das gilt als Bug, nicht als akzeptabler Zustand. Betrifft alle vier Ausrichtungs-Buttons (auch links/zentriert/Blocksatz erben denselben Fehler). |
| 5 | Tastenkürzel | Editor, global während Fokus im Dokument | **Nicht vorhanden** (`WordEditor.tsx` bindet nur Undo/Redo/Enter/Shift-Enter/Fett/Kursiv/Unterstrichen/Shift-Delete) | **Muss explizit entschieden und dokumentiert werden** (Offene Entscheidung 8.1) — Word/LibreOffice-Standard ist `Strg+R`. Die Inkonsistenz zu Fett/Kursiv/Unterstrichen (die je ein Kürzel haben) gilt als zu klärender Punkt, nicht als bereits akzeptierter Zielzustand. |
| 6 | Absatzformat-Dropdown (Wechselwirkung) | `Toolbar.tsx` → `select` (Z. 165–180), `commands.ts` → `setHeading` (Z. 40–55) | Wechsel „Standard“ ↔ „Überschrift 1–6“ über `setHeading(level)`; Überschrift setzen erzwingt `align: 'left'`, Zurücksetzen zu Standard übergibt `attrs = undefined` → Default `'left'`. `setHeading` wirkt nur auf einen einzelnen Block (`sameParent`-Guard). | Muss geprüft werden: Wechselt ein bereits **rechtsbündiger** Absatz zu „Überschrift N“ (oder umgekehrt), wird die Ausrichtung laut Code stillschweigend auf „links“ zurückgesetzt. **Potenzieller Bug/unerwünschter Nebeneffekt** — zu verifizieren und bewusst zu entscheiden (Ausrichtung bewusst beibehalten oder Zurücksetzen dokumentiert). Siehe Verhalten 2.5, Verdachtsmoment 6.4. |
| 7 | Kontextmenü/Rechtsklick-Äquivalent | — | Nicht vorhanden | Nicht gefordert (kein Rechtsklick-Kontextmenü im Scope). Falls künftig eingeführt, muss „Ausrichtung rechts“ dort ebenfalls erscheinen. |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Anwenden auf eine bestehende Selektion
- Text markieren (Maus-Ziehen, Doppelklick, Dreifachklick, Umschalt+Pfeil, Strg+A)
  → Klick auf „Ausrichtung rechts“ → **jeder** von der Selektion berührte Absatz bzw.
  jede berührte Überschrift wird rechtsbündig, unabhängig von der Selektionsmethode.
- Die Selektion muss **nicht** den ganzen Absatz umfassen — bereits eine Teil-Selektion
  innerhalb eines Absatzes genügt, damit der **gesamte** umgebende Absatz rechtsbündig
  wird (Absatzausrichtung ist eine Block-, keine Zeichen-Eigenschaft; entspricht der
  Implementierung über `state.doc.nodesBetween`, muss aber mit Testfall bestätigt werden).
- Erstreckt sich die Selektion über **mehrere** Absätze/Überschriften (auch über
  Listenpunkte und Tabellenzellen hinweg, sofern diese `paragraph`/`heading`-Nodes
  enthalten): **alle** davon werden rechtsbündig, nicht nur der erste oder letzte.

### 2.2 Anwenden ohne Textselektion (nur Cursor im Absatz)
- Cursor ohne Selektion irgendwo im Absatz positionieren → Klick auf „Ausrichtung rechts“
  → der **gesamte umgebende Absatz** wird rechtsbündig (nicht nur ab Cursor-Position, da
  Ausrichtung eine Absatzeigenschaft ist).
- Gilt auch für einen leeren Absatz (kein Text) — Umschalten darf keinen JS-Fehler
  auslösen, und der Zustand muss beim späteren Eintippen sichtbar bereits rechtsbündig
  sein. Weil `align` sofort als Block-Attribut gesetzt wird (nicht als vorgemerkter
  `storedMark`), zeigt der Button den rechtsbündigen Zustand unmittelbar korrekt an.

### 2.3 Umschalten zwischen den vier Ausrichtungswerten
- „Ausrichtung rechts“ ist **kein** reines Toggle wie bei Zeichen-Marks (Fett etc.),
  sondern setzt den Absatz auf genau den Wert `right` — ein linksbündiger, zentrierter
  oder Blocksatz-Absatz wird durch Klick auf „rechts“ zu rechtsbündig, unabhängig vom
  vorherigen Wert.
- **Zu klären (Offene Entscheidung 8.2):** Erneuter Klick auf „Ausrichtung rechts“,
  während der Absatz bereits rechtsbündig ist. Aktuelles Codeverhalten: **idempotent im
  Ergebnis, aber nicht wirkungsfrei** — `setAlign` ruft `setNodeAttribute` ohne
  Gleichheitsprüfung auf und erzeugt daher auch beim Setzen desselben Werts eine
  Transaktion (bei Mehrfachselektion: eine **je** betroffenem Block, siehe 2.10 und
  Verdachtsmoment 6.12). Festzulegen ist, ob (a) dieser „Leerlauf-Klick“ so bleibt,
  (b) durch einen Vorher-Vergleich unterdrückt wird, oder (c) auf „links“
  zurückschaltet (wie in manchen Editoren). Ergebnis mit Testfall fixieren.

### 2.4 Kombination mit Zeichenformatierung
- Rechtsbündige Absatzausrichtung muss unabhängig von und gleichzeitig mit jeder
  Zeichenformatierung (Fett, Kursiv, Unterstrichen, Durchgestrichen, Schriftfarbe,
  Hervorhebung) funktionieren — das Setzen der Ausrichtung darf keine Zeichen-Marks
  verändern oder entfernen, und umgekehrt.

### 2.5 Interaktion mit Absatzformat-Wechsel (Standard ↔ Überschrift)
- Ein rechtsbündiger **Standard-Absatz**, der über das Dropdown zu „Überschrift N“
  wechselt: laut Code weist `setHeading` beim Setzen einer Überschrift **immer**
  `align: 'left'` zu — die vorher gesetzte rechtsbündige Ausrichtung geht dabei
  **verloren**. **Muss verifiziert werden und ist mit hoher Wahrscheinlichkeit ein Bug**
  (Verdachtsmoment 6.4) — zu klären, ob gewollt oder zu beheben.
- Umgekehrt: Eine rechtsbündige **Überschrift**, die zurück zu „Standard“ wechselt
  (`setHeading(null)`) — `attrs` wird `undefined` übergeben, das neue `paragraph` fällt
  auf den Schema-Default `align: 'left'` zurück. Auch hier geht die rechtsbündige
  Ausrichtung verloren. **Ebenfalls zu verifizieren und als Bug oder bewusstes Verhalten
  zu dokumentieren.**
- Hinweis: `setHeading` wirkt wegen des `sameParent`-Guards nur auf **einen** Block. Ein
  Formatwechsel über eine Mehr-Absatz-Selektion ist ohnehin ein No-op (der Befehl gibt
  `false` zurück) — auch dieses Verhalten ist zu bestätigen, damit die Ausrichtungs-Frage
  nicht mit einem generellen Dropdown-Fehler vermischt wird.

### 2.6 Interaktion mit Listen
- Ein Listenpunkt (Bullet oder nummeriert) muss ebenso rechtsbündig ausrichtbar sein wie
  ein normaler Absatz — der Listentext richtet sich rechtsbündig innerhalb der
  verfügbaren Zeilenbreite aus, das Aufzählungszeichen/die Nummer bleibt an ihrer
  vorgesehenen Position (Verhalten mit echtem Listen-Layout in Word/LibreOffice
  abgleichen; rechtsbündige Listen sind ungewöhnlich, aber technisch zulässig).

### 2.7 Interaktion mit Tabellen
- Eine Tabellenzelle mit rechtsbündigem Absatzinhalt: Ausrichtung gilt nur innerhalb der
  Zellbreite, keine Nebenwirkung auf Nachbarzellen oder die Tabellenstruktur. Da
  `nodesBetween` in Zellen absteigt, richtet eine Selektion über eine Tabelle die
  Absätze **in den Zellen** rechtsbündig aus — zu verifizieren, dass dies gewollt und
  konsistent geschieht.

### 2.8 Interaktion mit Kopf-/Fußzeilen
- Sobald Kopf-/Fußzeile über die UI editierbar ist (laut `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 9 aktuell **fehlende** UI-Funktion, nur Datenmodell-seitig vorhanden): die
  rechtsbündige Ausrichtung muss dort identisch funktionieren (Kopf-/Fußzeilen-Blöcke
  sind ebenfalls `paragraph`/`heading`-Nodes und damit technisch kompatibel). Bis eine UI
  existiert, gilt dieser Fall als nicht end-to-end testbar und ist entsprechend zu
  vermerken, nicht stillschweigend auszulassen. Reader/Writer verarbeiten
  Header/Footer-Blöcke bereits (`docx/reader.ts`/`odt/reader.ts` lesen sie, die Writer
  schreiben sie) — die **Rundreise** einer rechtsbündigen Kopf-/Fußzeile lässt sich schon
  jetzt auf Datenmodell-Ebene prüfen.

### 2.9 Visuelle Darstellung im Editor
- Im Editor: Absatzinhalt ist am rechten Rand der Textspalte/Seite ausgerichtet, linker
  Rand entsprechend „ausgefranst“ (kein Blocksatz-Verhalten).
- Bei mehrzeiligem, rechtsbündigem Absatz: **jede** Zeile ist einzeln rechtsbündig
  (Standard-CSS-Verhalten von `text-align: right`), nicht nur die letzte/erste Zeile.
- **In der Seitenansicht (Paginierung, `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8, umgesetzt
  über `createPaginationPlugin` in `WordEditor.tsx`):** Der rechte Rand des Absatzes richtet
  sich am **rechten Textrand der Seite** (Satzspiegel/Seitenrand) aus, nicht an einer davon
  abweichenden Editor-/Container-Breite. Läuft ein rechtsbündiger Absatz über einen
  Seitenumbruch, bleibt die Rechtsbündigkeit auf **beiden** Seiten konsistent. **Zu
  verifizieren**, da der Paginierungs-Pfad die Editor-Darstellung eigenständig umbricht und
  hierfür bisher kein Test existiert (siehe Testfall 46).

### 2.10 Undo/Redo
- **Korrigierte Aussage ggü. früherer Fassung:** Das Setzen von „Ausrichtung rechts“ ist
  **nicht per Konstruktion** ein einzelner Undo-Schritt. `setAlign` dispatcht **eine
  Transaktion je betroffenem Block** (siehe Fundstelle „Befehl (Setzen)“ und
  Verdachtsmoment 6.12). Dass ein einzelnes Strg+Z bei einer Mehr-Absatz-Selektion
  dennoch **alle** Absätze gemeinsam zurücknimmt, hängt an der zeitbasierten Gruppierung
  von `prosemirror-history` (`newGroupDelay`, Standard 500 ms) und ist daher zu
  **verifizieren**, nicht zu behaupten. **Soll-Verhalten:** Ein Strg+Z stellt die
  gesamte Ausrichtungsänderung der Selektion in einem Schritt wieder her; falls das nur
  timing-bedingt gilt, ist die saubere Lösung eine gemeinsame Transaktion (Offene
  Entscheidung 8.6).
- Undo stellt exakt die vorherige Ausrichtung wieder her — **nicht** pauschal „links“,
  sondern den tatsächlichen Vorwert (zentriert, Blocksatz oder links).
- Redo stellt die rechtsbündige Ausrichtung erneut her.
- Funktioniert auch in gemischten Sequenzen (Tippen → rechtsbündig → zentriert → mehrfach
  Undo) in korrekter, umgekehrter Reihenfolge.

### 2.11 Neuer Absatz nach Enter erbt die Ausrichtung (zu verifizieren)
- **Neu aufgenommen:** Setzt die Nutzerin einen Absatz rechtsbündig und drückt Enter, muss
  der neu entstehende Folgeabsatz **ebenfalls rechtsbündig** sein (Word/LibreOffice-
  Standard: die Ausrichtung wird auf den Folgeabsatz vererbt). Enter läuft über
  `splitListItem` (in Listen) bzw. `baseKeymap`→`splitBlock` (sonst). Ob `splitBlock` das
  `align`-Attribut auf den zweiten Teil überträgt, ist **explizit zu verifizieren** und
  als Soll festzuschreiben; bisher weder spezifiziert noch getestet. Gleiches gilt sinngemäß
  für „am Absatzende Enter drücken“ (leerer Folgeabsatz muss rechtsbündig starten).

### 2.12 Einfügen von extern kopiertem, rechtsbündigem Inhalt (zu verifizieren)
- **Neu aufgenommen:** Wird rechtsbündiger Text aus einer externen Quelle (Webseite,
  Word/LibreOffice über die Zwischenablage) eingefügt, liest ProseMirror die Ausrichtung
  über `paragraph.parseDOM.getAttrs` aus `style.textAlign`. Erwartung: Ein per Inline-CSS
  `text-align: right` rechtsbündiger Absatz wird als `align: 'right'` übernommen. **Zu
  prüfen**, weil (a) externe Quellen die Ausrichtung häufig über CSS-Klassen statt Inline-
  Style transportieren (dann geht sie verloren) und (b) ein Inline-`text-align: end`/`start`
  — wie beim Datei-Import — **unnormalisiert** ins Modell gelangt (Grenzfall 8a). Mindest-
  Soll: kein Datenverlust am Text, dokumentiertes Verhalten bei nicht übernommener
  Ausrichtung.

---

## 3. Grenzfälle

1. **Selektion über mehrere Absätze mit unterschiedlicher Ausgangsausrichtung** (z. B.
   erster Absatz links, zweiter bereits rechtsbündig, dritter zentriert) → Klick auf
   „Ausrichtung rechts“ muss **alle drei** einheitlich auf rechtsbündig setzen.
   `isAlignActive` (Button-Zustand) zeigt laut Code nur den Zustand des **ersten**
   Absatzes (`$from`) — muss verifiziert werden, ob das irreführend ist, wenn nur der
   erste Absatz bereits rechtsbündig ist, die übrigen nicht, und der Button dennoch
   „aktiv“ zeigt.
2. **Selektion, die einen Absatz nur am äußersten Rand berührt** (Selektion endet exakt
   an der Grenze zum nächsten Absatz) → zu prüfen, ob der nächste Absatz durch
   `nodesBetween` fälschlich mit erfasst wird oder korrekt ausgeschlossen bleibt
   (Grenzverhalten von ProseMirror-Positionen).
3. **Cursor in einer leeren Überschrift ohne Text** → Umschalten auf rechtsbündig darf
   nicht abstürzen, muss beim späteren Eintippen sichtbar wirksam sein.
4. **Rechtsbündiger Absatz mit `hard_break`** (Zeilenumbruch via Umschalt+Enter) → Ausrichtung
   gilt für den **gesamten** Absatzinhalt inklusive **beider** Seiten des Umbruchs, keine
   Sonderbehandlung. **Korrektur ggü. früherer Fassung:** Hier war zusätzlich von einem
   „Inline-Bild“ die Rede — das ist schema-technisch unmöglich: `image` ist im
   ProseMirror-Schema ein **Block**-Knoten (`group: 'block'`), Absätze haben
   `content: 'inline*'`; ein Bild kann also nie *innerhalb* eines Absatzes stehen, nur als
   eigener Block daneben. Ein Bild trägt **kein** `align`-Attribut und ist selbst nicht
   ausrichtbar (→ neuer Grenzfall 16); ein an ein Bild angrenzender Absatz wird unabhängig
   davon rechtsbündig ausgerichtet.
5. **Absatzformat-Wechsel Standard → Überschrift bei bereits rechtsbündigem Absatz**
   (siehe 2.5) → vermutlicher Datenverlust der Ausrichtung, muss bestätigt/widerlegt und
   als Bug oder bewusstes Verhalten festgelegt werden.
6. **Import einer DOCX-Datei mit `<w:jc w:val="end"/>`** (in modernen, bidi-fähigen
   Word-Dokumenten alternative Schreibweise zu `right` im LTR-Kontext; ebenso
   `w:val="start"` als Alternative zu `left`): `JC_TO_ALIGN` kennt nur
   `left`/`center`/`right`/`both` — `end` fällt auf `'left'` zurück, obwohl der
   **inhaltliche** Sinn in einem LTR-Dokument „rechtsbündig“ wäre. **Muss geprüft und ggf.
   korrigiert werden** (mindestens für den Regelfall LTR sollte `end` wie `right` behandelt
   werden, oder das Weglassen ist bewusst zu begründen).
7. **Import einer DOCX-Datei mit `<w:jc w:val="distribute"/>` oder
   `"thaiDistribute"`/`"highKashida"`/`"lowKashida"`/`"mediumKashida"`** (seltene, aber
   laut OOXML-Schema gültige Werte) → fällt ebenfalls stillschweigend auf `'left'` zurück.
   Muss mindestens **keinen Absturz** verursachen und als bewusster Fallback dokumentiert
   werden (Textinhalt darf nicht verloren gehen).
8. **Import einer ODT-Datei mit `fo:text-align="end"`** (ODF-Pendant zu Fall 6) →
   `paragraphAligns` speichert den Rohwert `"end"` unverändert als `align`-Attribut — der
   Wert entspricht **keinem** der vier von `AlignButton`/`isAlignActive` erkannten Werte.
   Folge: Button zeigt für **keine** Option „aktiv“, obwohl der Absatz visuell (CSS
   `text-align: end` ≈ `right` in LTR) rechtsbündig aussehen kann. **Muss geprüft und
   normalisiert werden** (`end`/`start` → `right`/`left`, zumindest LTR-Regelfall).
8a. **Einfügen von HTML mit `text-align: end`/`start` aus der Zwischenablage** (Paste-
   Pendant zu Fall 8) → `paragraph.parseDOM.getAttrs` übernimmt `style.textAlign`
   unverändert, mit demselben Normalisierungsproblem. Dieselbe Normalisierungsentscheidung
   wie beim Import muss auch für den Paste-Pfad gelten (Offene Entscheidung 8.4).
9. **Absatz, dessen Ausrichtung nur über eine geerbte Formatvorlage** (`w:pStyle` in DOCX
   bzw. `style:parent-style-name`/`office:styles` in ODT) **wirksam ist, nicht über direkte
   Formatierung am Absatz** → laut Codeanalyse wird diese Vererbung **nicht** aufgelöst; der
   Import fällt in beiden Formaten auf `'left'` zurück, selbst wenn die referenzierte
   Vorlage `right` deklariert. **Muss mit einer realen Fremddatei geprüft werden** (analog
   zum in `specs/fett-req.md` dokumentierten Muster „Fett nur über benannte/vererbte
   Formatvorlage“, dort Grenzfall 9).
10. **Sehr lange Selektion über viele Seiten/Absätze** → wegen des Ein-Transaktion-pro-Block-
    Verhaltens von `setAlign` entstehen bei N Absätzen **N Transaktionen, N `onChange`/
    `toJSON`-Aufrufe und N Re-Renders** (siehe Verdachtsmoment 6.12). **Anforderung:** kein
    spürbares Einfrieren der UI; falls messbar problematisch, ist auf eine gemeinsame
    Transaktion umzustellen (Offene Entscheidung 8.6).
11. **Wiederholtes schnelles Klicken** auf den Button → kein inkonsistenter
    Zwischenzustand (manche Absätze rechtsbündig, andere nicht) durch Race Condition oder
    das Zusammenspiel mehrerer per Block dispatchter Transaktionen mit den Force-Renders.
12. **Rechtsbündiger Text kombiniert mit RTL-Sprachinhalt** (arabisch/hebräisch) — das
    Zusammenspiel von tatsächlicher Schreibrichtung und expliziter `align: right`-Einstellung
    ist nicht Teil dieser App (keine RTL-Unterstützung in der Codebasis erkennbar) und muss
    mindestens **nicht abstürzen**; volle RTL-Korrektheit ist kein Blocker, aber es darf kein
    Datenverlust entstehen.
13. **Ungültiger `align`-Wert durch Fremdimport/Datenkorruption** (z. B. `"foo"`, das wegen
    `validate: 'string'` ohne Enum-Prüfung ins Schema gelangt) → Editor darf nicht
    abstürzen; `isAlignActive` gibt für alle vier bekannten Werte `false` zurück (Button
    „keiner aktiv“); `toDOM` schreibt `text-align: foo`, was der Browser als ungültiges CSS
    ignoriert (Fallback auf Standardausrichtung), ohne Fehler; Export muss einen sinnvollen
    Fallback schreiben (`JC_BY_ALIGN[align] ?? 'left'` bzw.
    `PARAGRAPH_ALIGN_STYLE_NAME[align] ?? PARAGRAPH_ALIGN_STYLE_NAME.left`), nicht mit
    korruptem XML enden.
14. **Rechtsbündiger Absatz als geretteter Inhalt in einem `unsupported_block`** (z. B.
    Textbox aus einer Fremddatei) → beim Export wird `unsupported_block` in einfache Blöcke
    entpackt; die Ausrichtung des enthaltenen Absatzes sollte dabei erhalten bleiben. Kein
    Blocker, aber auf keinen Textverlust zu prüfen.
15. **Track-Changes-Kompatibilität (Zukunftsfall):** Änderungsverfolgung ist laut
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13 noch nicht begonnen. Für die aktuelle
    Verifikation reicht die Feststellung, dass eine Ausrichtungsänderung künftig als eigene
    Art „Formatierungsänderung“ nachverfolgbar sein müsste — keine Implementierung nötig,
    nur Dokumentation der Abgrenzung.
16. **Selektion ohne jeden ausrichtbaren Block** (z. B. ein einzelnes, per Klick als
    `NodeSelection` markiertes Bild — `image` ist ein Block-Knoten, siehe Grenzfall 4 — am
    Dokumentanfang, oder eine Auswahl, die ausschließlich einen nicht-`paragraph`/`heading`-
    Block trifft) → `setAlign` findet in `nodesBetween` keinen ausrichtbaren Knoten,
    `applicable` bleibt `false`, der Befehl gibt `false` zurück und der Button-Klick ist ein
    **No-op**. **Muss mit `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4 („kein stiller
    Fehlschlag“) abgeglichen werden:** Entweder wird der Button in diesem Kontext sichtbar
    deaktiviert (`disabled`), oder das No-op ist bewusst als akzeptabel dokumentiert. Ein
    wortlos wirkungsloser Klick gilt **nicht** als erfüllt. Mindestanforderung: kein Absturz,
    kein Datenverlust am umgebenden Inhalt.

---

## 4. Rundreise-Anforderung (DOCX **und** ODT — Pflichtbestandteil)

Grundprinzip aus `FEATURE-SPEC-DOCX-ODT.md`: „Datei A hochladen → unverändert exportieren
→ Ergebnis entspricht inhaltlich A.“ Für „Ausrichtung rechts“ konkret:

### 4.1 DOCX
1. **Upload unverändert:** Eine reale, außerhalb dieser App erzeugte DOCX-Datei mit
   mindestens einem rechtsbündigen Absatz importieren → **ohne jede Bearbeitung** sofort
   wieder exportieren → erneut importieren → der rechtsbündige Absatz ist inhaltlich (Text
   **und** `align: 'right'`) identisch zum Ausgangszustand.
2. **Rundreise nach eigener Bearbeitung:** Neues oder importiertes Dokument, im Editor einen
   Absatz rechtsbündig setzen → als DOCX exportieren → reimportieren → Ausrichtung und
   exakter Textinhalt bleiben erhalten.
3. Export nach DOCX validieren gegen einen vom eigenen Reader **unabhängigen** Parser (z. B.
   python-docx oder direktes Parsen von `word/document.xml`/OOXML-Schemaprüfung) →
   `<w:jc w:val="right"/>` korrekt im `pPr` des betroffenen Absatzes, kein anderer Absatz
   fälschlich mitbetroffen.
4. Rechtsbündiger Absatz mit `hard_break` (Zeilenumbruch) darin → Ausrichtung bleibt für den
   ganzen Absatz inkl. beider Seiten des Umbruchs erhalten.
5. **Rechtsbündige Überschrift (Ebene 1–6)** → Rundreise erhält sowohl `align: 'right'` als
   auch das korrekte Heading-Level gemeinsam. **Achtung:** Der bestehende Unit-Test deckt
   Überschriften-Ausrichtung nur für `'center'` ab — die `'right'`-Überschrift ist neu
   nachzuweisen (Verdachtsmoment 6.11).
6. Rechtsbündiger Absatz in einer Tabellenzelle → Rundreise erhält Zuordnung zur richtigen
   Zelle, keine Nebenwirkung auf Nachbarzellen.
7. Rechtsbündiger Listenpunkt (Bullet **und** nummeriert) → Rundreise erhält sowohl
   Ausrichtung als auch Listenzugehörigkeit/Nummerierung.
8. Reale, komplexe Fremddatei (nicht mit diesem Editor erzeugt, z. B. aus einem
   Open-Source-Testkorpus) mit mindestens einem rechtsbündigen Absatz importieren →
   Ausrichtung bleibt sichtbar erhalten, kein Textverlust.
9. Reale Fremddatei mit `<w:jc w:val="end"/>` (Grenzfall 6) → Ergebnis nach Import muss dem
   in Offene Entscheidung 8.4 festgelegten Verhalten entsprechen (idealerweise „rechts“ im
   LTR-Kontext).

### 4.2 ODT
1. **Upload unverändert:** Eine reale ODT-Datei (idealerweise aus echtem LibreOffice Writer,
   nicht nur aus dieser App) mit mindestens einem rechtsbündigen Absatz importieren →
   **ohne jede Bearbeitung** sofort wieder exportieren → erneut importieren → Ausrichtung
   und Textinhalt identisch zum Ausgangszustand.
2. **Rundreise nach eigener Bearbeitung:** Im Editor einen Absatz rechtsbündig setzen, als
   ODT exportieren → der betroffene `<text:p>` **referenziert** `text:style-name="Ppara-right"`,
   und dieser Stil trägt `fo:text-align="right"` (`style:family="paragraph"`,
   `parent-style-name="Standard"`). **Verifikation muss die `text:style-name`-Referenz am
   Element prüfen**, nicht nur die Existenz der Stildefinition — letztere ist statisch
   **immer** vorhanden (auch ohne rechtsbündigen Absatz), ein Existenz-Check würde also
   trivial und falsch-positiv bestehen (Verdachtsmoment 6.13).
3. Zwei unterschiedliche rechtsbündige Absätze im selben Dokument → **beide** referenzieren
   **denselben** Stil `Ppara-right` (Wiederverwendung ist inhärent, es wird kein zweiter
   Ausrichtungsstil erzeugt); Rundreise bestätigt, dass beide weiterhin rechtsbündig sind.
4. **Rechtsbündige Überschrift (Ebene 1–6)** → Stil `Heading{level}-right` korrekt
   referenziert und beim Reimport wieder als rechtsbündige Überschrift des richtigen Levels
   erkannt (Level aus `text:outline-level`, Ausrichtung aus dem Stil).
5. Rechtsbündiger Absatz in einer Tabellenzelle → Rundreise erhält Zuordnung.
6. Rechtsbündiger Listenpunkt (Bullet **und** nummeriert) → Rundreise erhält Ausrichtung und
   Listenstruktur gemeinsam.
7. Reale, komplexe Fremddatei (z. B. aus einem Open-Source-ODT-Testkorpus) mit mindestens
   einem rechtsbündigen Absatz importieren → Ausrichtung sichtbar erhalten.
8. Reale Fremddatei mit `fo:text-align="end"` (Grenzfall 8) → Ergebnis nach Import muss dem
   in Offene Entscheidung 8.4 festgelegten Verhalten entsprechen.
9. Export nach ODT validieren gegen einen unabhängigen Parser/das ODF-Schema →
   `fo:text-align="right"` im referenzierten Stil vorhanden und korrekt zugeordnet.

### 4.3 Cross-Format-Rundreise
1. DOCX mit rechtsbündigem Absatz importieren → als ODT exportieren → Ausrichtung bleibt
   erhalten (`fo:text-align="right"` korrekt aus dem internen `align: 'right'` erzeugt,
   unabhängig vom Ursprungsformat).
2. ODT mit rechtsbündigem Absatz importieren → als DOCX exportieren → Ausrichtung bleibt
   erhalten (`<w:jc w:val="right"/>`).
3. **Doppelte Cross-Format-Rundreise** (DOCX → ODT → DOCX) an einem Dokument mit
   rechtsbündigem Absatz **kombiniert** mit Fett/Kursiv/Farbe und innerhalb einer
   Überschrift → kein kumulativer Verlust der Ausrichtungsinformation über zwei
   Konvertierungen.
4. Dieselbe Prüfung mit Startpunkt ODT (ODT → DOCX → ODT).

---

## 5. Menü-/Toolbar-Zusammenhang (Bezug zu FEATURE-SPEC-DOCX-ODT.md)

Entspricht Zeile 4 der Tabelle in Abschnitt 17 des Hauptdokuments: „Ausrichtung
(links/zentriert/rechts/Blocksatz) — vorhanden, Pfeil-/Linien-Symbole — Rendering auf
mehreren Systemen/Browsern verifizieren.“ Diese Anforderungsdatei löst diesen offenen
Prüfauftrag für den Teilaspekt „rechts“ auf: die Testfälle zum Icon-Rendering
(Abschnitt 7) decken das Risiko ab. Zusätzlich relevant: `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 20.1 (Icon-Rendering allgemein) und Abschnitt 2 (Selektions-Regressionstest),
auf den Testfall 4 verweist.

---

## 6. Bekannte Verdachtsmomente aus der Codeanalyse (Risikoliste für die Verifikation)

Konkrete, aus dem Quellcode abgeleitete Verdachtspunkte, die die QA-Verifikation
**gezielt** widerlegen oder bestätigen muss. Sie ersetzen nicht die Testabdeckung aus
Abschnitt 7, sondern lenken die Priorität.

1. **DOCX-Import ignoriert `w:val="end"`/`"start"`/`"distribute"` bei `<w:jc>`** — potenzieller
   Bug bei echten Fremddateien mit diesen gültigen OOXML-Werten. Bisherige Tests decken das
   nicht ab, da der eigene Writer diese Werte nie erzeugt.
2. **ODT-Import übernimmt `fo:text-align="end"`/`"start"` unnormalisiert** — der Wert landet
   unverändert im Modell und wird von keinem der vier UI-Buttons als „aktiv“ erkannt, obwohl
   visuell ggf. äquivalent zu rechts/links. Gilt gleichermaßen für den Paste-Pfad (`parseDOM`).
3. **Keine Vererbung von Ausrichtung aus Formatvorlagen** (`office:styles`/
   `style:parent-style-name` in ODT; `w:pStyle`→`styles.xml` in DOCX) — Absätze, die
   Ausrichtung nur indirekt über eine Vorlage erhalten, werden beim Import auf `'left'`
   reduziert (Grenzfall 9; analog zu `fett-req.md` Grenzfall 9 für Fett-über-Formatvorlage).
4. **`setHeading` erzwingt `align: 'left'` beim Setzen einer Überschrift und verwirft die
   Ausrichtung (`attrs = undefined` → Default `'left'`) beim Zurücksetzen zu Standard** — ein
   rechtsbündiger Absatz verliert seine Ausrichtung bei **jedem** Wechsel des
   Absatzformat-Dropdowns in beide Richtungen. **Hohe Priorität**, da alltäglicher
   Bedienschritt.
5. **`isAlignActive` wertet nur `$from` aus, nicht die gesamte Selektion** — bei einer
   Mehrfachselektion mit gemischter Ausrichtung zeigt der Button ggf. ein irreführendes Bild
   (analog zu `durchgestrichen-req.md` Grenzfall 11 für Marks). Anders als bei Marks gibt es
   hier **keinen** `storedMarks`-Sonderfall (Block-Attribut).
6. **Kein Tastenkürzel** (`Strg+R`-Äquivalent fehlt) — Inkonsistenz zu den drei
   zeichenformatierenden Nachbar-Funktionen mit Kürzel; ungeklärt, ob gewollt.
7. **Tooltip-Text mischt Deutsch und Englisch** (`title="Ausrichtung: right"`) — sichtbarer,
   leicht behebbarer Lokalisierungsfehler; betrifft alle vier Ausrichtungs-Buttons.
8. **Kein Enum/keine Validierung des `align`-Attributs im Schema** (`validate: 'string'`) —
   theoretisch kann jeder String als Ausrichtung ins Dokument gelangen (fehlerhafter
   Import-Pfad, manuell konstruiertes JSON, gepastetes CSS), ohne dass das Schema es
   verhindert; Export-Fallback (`?? 'left'`) ist vorhanden, aber ungetestet.
9. **Kein E2E-Test über echte Toolbar-Bedienung** — anders als „Fett“ existiert für keinen der
   vier Ausrichtungs-Buttons ein Test, der den Button tatsächlich im Browser klickt.
10. **Keine Fixture-Tests mit realen Fremddateien** — weder die DOCX- noch die ODT-
    Fixture-Suite prüft aktuell irgendeine Ausrichtung.
11. **Überschriften-Ausrichtung `right` unit-technisch ungetestet** — der `it.each`-Rundreisetest
    deckt `right` nur für **Absätze** ab; der separate Überschriften-Ausrichtungstest prüft
    nur `'center'`. Die `right`-Überschrift (DOCX **und** ODT) ist nachzurüsten.
12. **`setAlign` dispatcht eine Transaktion pro Block, nicht eine für die Selektion** —
    `dispatch(state.tr.setNodeAttribute(pos, …))` steht **innerhalb** des `nodesBetween`-
    Callbacks. Zu verifizierende Folgen: (a) **Undo-Granularität** — ein einzelnes Strg+Z nimmt
    alle Absätze nur dank der 500-ms-Zeitgruppierung von `prosemirror-history` gemeinsam
    zurück, nicht per Konstruktion; (b) **Performance** — N Absätze ⇒ N Transaktionen, N
    `onChange`/`toJSON`, N Re-Renders (Grenzfall 10); (c) **wirkungslose Wiederhol-
    Transaktionen** — `setNodeAttribute` prüft keine Gleichheit, ein Klick auf bereits
    rechtsbündige Blöcke erzeugt trotzdem je Block eine Transaktion (Grenzfall 11, 2.3); (d)
    **Positions-Stabilität** — da nur Attribute geändert werden, bleiben die `pos`-Werte über
    die Dispatches gültig (kein Korruptionsrisiko erwartet, aber zu bestätigen). Die im
    Umsetzungsplan `ausrichtung-rechts-code.md` getroffene Einordnung „setAlign bereits
    korrekt“ ist an diesen vier Punkten zu messen, nicht ungeprüft zu übernehmen.
13. **ODT-Ausrichtungsstile werden statisch, nicht bedarfsabhängig erzeugt** — `Ppara-*` und
    alle 24 `Heading{level}-{align}` stehen **immer** in `content.xml`. Eine Verifikation, die
    nur die **Existenz** eines Stils mit `fo:text-align="right"` prüft, besteht daher auch für
    ein Dokument **ohne** rechtsbündigen Absatz und ist wertlos. Prüfen ist die
    **`text:style-name`-Referenz am `<text:p>`/`<text:h>`** (4.2.2).
14. **`AlignButton` ohne `aria-label`** — nur `title`, während der Nachbar `MarkButton`
    zusätzlich `aria-label={title}` trägt. Zu verifizieren, ob der `title` als
    Accessible-Name für Screenreader genügt, oder ob ein `aria-label` zu ergänzen ist.
15. **Enter-Vererbung der Ausrichtung ungeprüft** — ob ein per Enter entstehender Folgeabsatz
    die Ausrichtung erbt, hängt am Verhalten von `splitBlock`/`splitListItem` und ist weder
    spezifiziert noch getestet (Verhalten 2.11).
16. **`setAlign` gibt bei nicht-ausrichtbarer Selektion `false` zurück → stiller No-op** —
    `return applicable` (`commands.ts`) ist `false`, wenn `nodesBetween` keinen
    `paragraph`/`heading` trifft (z. B. `NodeSelection` auf ein Bild). Da der
    Toolbar-`AlignButton` weder einen `disabled`-Zustand noch eine sichtbare Rückmeldung hat,
    tut ein Klick dann wortlos nichts — potenzieller Verstoß gegen
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4 (Grenzfall 16). Zu entscheiden: Button
    kontextabhängig deaktivieren oder No-op bewusst dokumentieren.
17. **Einziger echter E2E-Rundreisetest für Ausrichtung deckt nur `'center'` ab** —
    `tests/e2e/roundtrip-fidelity.spec.ts` prüft „Kriterium 4“ (Absatzausrichtung) über einen
    realen Upload→Export→Reimport-Zyklus für DOCX **und** ODT, aber ausschließlich mit einem
    zentrierten Absatz (Fixture `tests/e2e/fixtures/richDocument.ts` enthält kein `right`).
    Diese Lücke betrifft **zusätzlich zu** der bereits bekannten Lücke „kein Button-Klick-Test“
    (Verdachtsmoment 6.9): selbst der reine Import-Fidelity-Nachweis über einen echten Browser
    ist für „rechts“ noch nicht erbracht. Am naheliegendsten zu schließen, indem die Fixture um
    einen zweiten, rechtsbündigen Absatz ergänzt und eine entsprechende Assertion
    hinzugefügt wird (Testfall 47).

---

## 7. Testfälle (Gesamtübersicht — abzuhaken durch den QA-Agenten)

1. Text markieren (Maus-Ziehen) → „Ausrichtung rechts“ → Absatz sichtbar rechtsbündig,
   `aria-pressed` wechselt auf `true`.
2. Text markieren (Doppelklick = Wort) → der **gesamte** umgebende Absatz wird rechtsbündig,
   nicht nur das Wort.
3. Text markieren (Dreifachklick = Absatz) → Absatz rechtsbündig.
4. „Alles auswählen“ (Strg+A) bei mehreren Absätzen unterschiedlicher Ausgangsausrichtung →
   **alle** Absätze rechtsbündig, inkl. Regressionstest gemäß `FEATURE-SPEC-DOCX-ODT.md`
   Abschnitt 2 (danach Klick-Neupositionierung + Enter + Tippen → beide entstehenden Absätze
   bleiben erhalten und rechtsbündig).
5. Cursor ohne Selektion im Absatz → gesamter Absatz wird rechtsbündig (nicht nur ab
   Cursor-Position).
6. Cursor in leerem Absatz → kein Fehler, beim Eintippen sichtbar rechtsbündig, Button sofort
   „aktiv“.
7. Selektion über mehrere Absätze mit gemischter Ausgangsausrichtung → nach Klick alle
   einheitlich rechtsbündig; Button-Zustand vor und nach Klick gemäß Verdachtsmoment 6.5
   dokumentiert bewertet.
8. Wechsel „rechts“ → „zentriert“ → „Blocksatz“ → „links“ → zurück „rechts“ → jeder Wechsel
   korrekt und sofort sichtbar, Button-Zustand nach jedem Schritt stimmig.
9. Erneuter Klick auf „Ausrichtung rechts“, während bereits rechtsbündig → Ergebnis gemäß der
   in 2.3/8.2 festgelegten Entscheidung; prüfen, ob dabei eine (bzw. je Block eine)
   wirkungslose Transaktion in der Undo-Historie entsteht.
10. Kombination mit Fett **und** Kursiv **und** Schriftfarbe im rechtsbündigen Absatz → alle
    Formate gleichzeitig sichtbar, keine gegenseitige Störung.
11. Absatzformat-Wechsel: rechtsbündigen Standard-Absatz auf „Überschrift 1“ umstellen →
    prüfen, ob Ausrichtung erhalten bleibt oder auf „links“ zurückspringt (Verdachtsmoment
    6.4) — Ergebnis dokumentieren, ggf. als Bug melden und beheben.
12. Umgekehrter Wechsel: rechtsbündige Überschrift zurück auf „Standard“ → gleiche Prüfung.
13. Rechtsbündigkeit in Bullet-Liste und nummerierter Liste → identisch zu normalem Absatz,
    Nummerierung/Aufzählungszeichen unverändert an ihrer Position.
14. Rechtsbündigkeit in einer Tabellenzelle → identisch, keine Nebenwirkung auf Nachbarzellen.
15. Rechtsbündiger Absatz mit `hard_break` (Umschalt+Enter) → Ausrichtung gilt für beide
    Zeilen des Absatzes.
16. Undo (Strg+Z) direkt nach Anwenden → **tatsächlicher** Vorwert (nicht pauschal „links“)
    wird wiederhergestellt.
17. Redo (Strg+Y) danach → Rechtsbündigkeit kommt zurück.
18. **Mehr-Absatz-Undo:** „Ausrichtung rechts“ auf eine Selektion über ≥ 3 Absätze anwenden →
    **ein** Strg+Z nimmt die Ausrichtung **aller** Absätze gemeinsam zurück (nicht Absatz für
    Absatz). Dieser Test belegt/widerlegt die Undo-Granularität aus Verdachtsmoment 6.12; bei
    Absatz-für-Absatz-Undo ist der Befehl auf eine gemeinsame Transaktion umzustellen.
19. **Idempotenz-/Leerlauf-Klick:** „Ausrichtung rechts“ zweimal hintereinander auf denselben
    Absatz → Ergebnis unverändert rechtsbündig; Verhalten der Undo-Historie gemäß 2.3
    dokumentiert.
20. **Enter erbt Ausrichtung:** In einem rechtsbündigen Absatz Enter drücken und weitertippen →
    der neue Absatz ist ebenfalls rechtsbündig (Verhalten 2.11); Gegentest in einem
    linksbündigen Absatz (neuer Absatz linksbündig).
21. **Einfügen extern kopierten rechtsbündigen Texts** (aus Webseite/Office) → Verhalten gemäß
    2.12 dokumentiert: Ausrichtung übernommen (bei Inline-`text-align: right`) bzw. bewusst
    nicht übernommen, in jedem Fall kein Textverlust; `end`/`start` gemäß 8.4 behandelt.
22. DOCX-Rundreise: neues Dokument, Absatz rechtsbündig setzen, exportieren, reimportieren →
    Ausrichtung erhalten (4.1.2).
23. ODT-Rundreise: dasselbe für ODT, inkl. Prüfung der `text:style-name="Ppara-right"`-Referenz
    am Element (4.2.2).
24. **Rechtsbündige Überschrift-Rundreise** (DOCX **und** ODT), Ebene 1 und Ebene 3 → `align:
    'right'` **und** Level gemeinsam erhalten (schließt die Lücke aus Verdachtsmoment 6.11 —
    bisher nur `center` getestet).
25. Cross-Format DOCX → ODT: Ausrichtung erhalten (4.3.1).
26. Cross-Format ODT → DOCX: Ausrichtung erhalten (4.3.2).
27. Doppelte Cross-Format-Rundreise (DOCX→ODT→DOCX) mit rechtsbündiger Überschrift + Fett +
    Farbe → kein Verlust der Ausrichtungsinformation (4.3.3).
28. Upload einer realen, außerhalb der App erzeugten DOCX-Datei mit rechtsbündigem Absatz
    (unverändert) → Export → Reimport → Text und Ausrichtung identisch zum Original (4.1.1).
29. Upload einer realen, außerhalb der App erzeugten ODT-Datei mit rechtsbündigem Absatz
    (unverändert) → Export → Reimport → Text und Ausrichtung identisch zum Original (4.2.1).
30. Upload einer realen DOCX-Datei mit `<w:jc w:val="end"/>` → Import-Ergebnis prüfen und mit
    der in 8.4 verlangten Entscheidung abgleichen (Verdachtsmoment 6.1).
31. Upload einer realen ODT-Datei mit `fo:text-align="end"` → Import-Ergebnis prüfen und mit
    der in 8.4 verlangten Entscheidung abgleichen (Verdachtsmoment 6.2).
32. Upload einer realen Fremddatei, deren rechtsbündige Ausrichtung nur über eine referenzierte
    Formatvorlage (nicht direkt am Absatz) definiert ist → prüfen, ob die Ausrichtung erhalten
    bleibt oder verloren geht (Grenzfall 9, Verdachtsmoment 6.3).
33. **E2E-Test über echte Browser-Bedienung** (Playwright, analog zu `docx.spec.ts` für „Fett“):
    Button `page.getByTitle('Ausrichtung: right')` (bzw. nach Tooltip-Fix der korrigierte
    deutsche Titel) anklicken, Text eingeben/markieren, `text-align: right` im DOM prüfen —
    **muss neu ergänzt werden** (Verdachtsmoment 6.9).
34. Export nach DOCX gegen einen vom eigenen Reader unabhängigen Parser (python-docx/OOXML-
    Schema) validieren → `<w:jc w:val="right"/>` korrekt vorhanden.
35. Export nach ODT gegen einen unabhängigen Parser/das ODF-Schema validieren →
    `fo:text-align="right"` im referenzierten Stil korrekt vorhanden.
36. Icon-Rendering-Test auf einem System ohne besondere Font-/Unicode-Unterstützung: Glyphe „⇥“
    bleibt von „⇤“/„↔“/„≡“ eindeutig unterscheidbar (Verdachtsmoment 6.14 bzw. Abschnitt 5).
37. Barrierefreiheit: prüfen, ob der Button ohne `aria-label` (nur `title`) für einen
    Screenreader einen sinnvollen Accessible-Name hat; sonst `aria-label` ergänzen
    (Verdachtsmoment 6.14).
38. Tooltip-Korrektur verifizieren: `title` zeigt durchgängig deutschen Text (kein „Ausrichtung:
    right“ mehr); Regressionstest nach dem Fix.
39. Tastenkürzel-Test: entweder das festgelegte Kürzel (z. B. Strg+R) funktioniert zuverlässig,
    oder das bewusste Fehlen ist dokumentiert und durch Test/Kommentar im Code nachvollziehbar
    (Offene Entscheidung 8.1) — „stillschweigend fehlend“ gilt nicht als erfüllt.
40. Performance/Stabilität: „Ausrichtung rechts“ auf eine sehr lange Selektion (mehrere Seiten,
    viele Absätze) → UI bleibt reaktionsfähig, kein spürbares Einfrieren trotz N Transaktionen
    (Grenzfall 10, Verdachtsmoment 6.12).
41. Schnelles Mehrfachklicken auf den Button innerhalb kurzer Zeit → kein inkonsistenter
    Zwischenzustand zwischen den betroffenen Absätzen (Grenzfall 11).
42. Import einer Fremddatei mit ungültigem/unerwartetem Ausrichtungswert (z. B.
    `w:jc w:val="distribute"`) → kein Absturz, kein Textverlust, Fallback-Verhalten
    dokumentiert (Grenzfall 7).
43. Ungültiger `align`-Wert im Modell (z. B. „foo“, Grenzfall 13) → kein Absturz; Button „keiner
    aktiv“; Export schreibt Fallback `left`/`both` statt korruptem XML.
44. **Selektion ohne ausrichtbaren Block:** Ein Bild als `NodeSelection` markieren (Klick auf
    das Bild) → „Ausrichtung rechts“ klicken → kein Absturz, kein Verlust des Bildes/umgebenden
    Texts; Ergebnis entspricht der zu Grenzfall 16 / `FEATURE-SPEC-DOCX-ODT.md` 20.4
    getroffenen Entscheidung (Button deaktiviert **oder** dokumentiertes No-op) — ein wortlos
    wirkungsloser Klick gilt nicht als erfüllt.
45. **Absatz neben einem Bild:** Absatz über bzw. unter dem Bild rechtsbündig setzen → **nur**
    der Absatz wird rechtsbündig, das Bild bleibt unverändert; Rundreise (DOCX **und** ODT)
    erhält beide korrekt (bestätigt zugleich, dass `image` als eigener Block, nicht als
    Absatzinhalt behandelt wird — Grenzfall 4).
46. **Rechtsbündigkeit in der Seitenansicht:** Rechtsbündigen Absatz in ein Dokument mit
    Seitenumbruch setzen bzw. über die Seitengrenze laufen lassen → Absatz ist visuell am
    **rechten Satzspiegel** ausgerichtet und auf beiden Seiten konsistent (Verhalten 2.9,
    Paginierung) — bisher ungetestet.
47. **Echten E2E-Rundreisetest um „rechts“ ergänzen (schließt Verdachtsmoment 6.15):**
    `tests/e2e/roundtrip-fidelity.spec.ts` bzw. dessen Fixture `richDocument.ts` um einen
    zweiten, rechtsbündigen Absatz (DOCX: `<w:jc w:val="right"/>`; ODT: ein weiterer
    automatischer Absatzstil mit `fo:text-align="right"`) erweitern und je eine
    `toHaveCSS('text-align', 'right')`-Assertion vor **und** nach dem Reimport ergänzen —
    analog zum bestehenden `'center'`-Nachweis, für **beide** Formate (DOCX -> DOCX und
    ODT -> ODT).

---

## 8. Offene Entscheidungen (müssen vor Abnahme getroffen und hier nachgetragen werden)

1. **Tastenkürzel** (Menüpunkt 1.5): Wird `Strg+R` (oder ein anderes Kürzel) ergänzt, oder wird
   das Fehlen bewusst dokumentiert?
2. **Verhalten bei erneutem Klick auf bereits aktive Ausrichtung** (2.3): idempotent belassen,
   Leerlauf-Transaktion unterdrücken (Vorher-Vergleich) oder Rückstellung auf „links“?
3. **Verlust der Ausrichtung bei Absatzformat-Wechsel** (2.5, Verdachtsmoment 6.4): Bug, der
   behoben werden muss, oder bewusst gewolltes Verhalten (dann mit Begründung dokumentieren)?
4. **Normalisierung von `start`/`end`** (Grenzfälle 6, 8, 8a): Werden diese beim Import **und**
   beim Paste auf `left`/`right` abgebildet (LTR-Regelfall), oder bleibt es bei „nur die vier
   expliziten Werte“ mit dokumentiertem Informationsverlust? Import- und Paste-Pfad müssen
   dieselbe Entscheidung teilen.
5. **`aria-pressed`/Button-Zustand bei gemischter Mehrfachselektion** (Verdachtsmoment 6.5):
   „Zustand von `$from`“ belassen oder auf „aktiv nur, wenn **alle** betroffenen Absätze
   rechtsbündig sind“ umstellen?
6. **Ein-Transaktion-vs-N-Transaktionen in `setAlign`** (Verdachtsmoment 6.12): Bleibt es bei
   einer Transaktion pro Block (Undo-Zusammenhalt nur über Zeitgruppierung) oder wird auf eine
   **gemeinsame** Transaktion für die ganze Selektion umgestellt (robusteres Undo, weniger
   Re-Renders)? Empfehlung der PO: gemeinsame Transaktion, sofern Testfall 18 die Fragilität
   bestätigt.

Diese sechs Punkte sind für die Abnahme (Abschnitt 9) zwingend zu beantworten — ein „aktuell
so, unkommentiert“ gilt nicht als ausreichend.

---

## 9. Abnahmekriterien (Definition of Done)

Das Feature „Ausrichtung rechts“ gilt erst dann wieder als „vorhanden“ im Sinne von
vertrauenswürdig, wenn:

1. Alle Testfälle aus Abschnitt 7 tatsächlich ausgeführt wurden (nicht nur die vorhandenen
   Writer→eigener-Reader-Unit-Tests aus `roundtrip.test.ts`) und deren Ergebnis dokumentiert
   ist.
2. Jedes Verdachtsmoment aus Abschnitt 6 explizit als „bestätigt und behoben“, „bestätigt und
   bewusst als Grenzfall dokumentiert“ oder „widerlegt“ eingestuft wurde — keines bleibt
   unkommentiert offen. Insbesondere ist Verdachtsmoment 6.12 (Transaktions-/Undo-Granularität)
   empirisch belegt, nicht aus dem Umsetzungsplan („bereits korrekt“) übernommen.
3. Alle sechs offenen Entscheidungen aus Abschnitt 8 getroffen, umgesetzt (falls ein Code-Fix
   nötig ist) und das Ergebnis in dieser Datei nachgetragen wurde.
4. Mindestens ein E2E-Test über echte Browser-Bedienung (Playwright) für den „Ausrichtung
   rechts“-Button dauerhaft in der Testsuite verankert ist (Testfall 33), inklusive des
   Mehr-Absatz-Undo-Tests (Testfall 18) **und** der Ergänzung des bestehenden
   Import-Fidelity-Rundreisetests `tests/e2e/roundtrip-fidelity.spec.ts` um eine
   `'right'`-Assertion für DOCX **und** ODT (Testfall 47, schließt Verdachtsmoment 6.15 — der
   bisherige Test deckt dort nur `'center'` ab).
5. Die Rundreise-Anforderung aus Abschnitt 4 für DOCX **und** ODT, inklusive Cross-Format,
   inklusive **rechtsbündiger Überschrift** (Testfall 24, schließt die `center`-only-Lücke) und
   inklusive mindestens einer realen (nicht app-eigenen) Testdatei je Format, nachweislich
   erfüllt ist. Der ODT-Nachweis prüft die `text:style-name`-Referenz am Element, nicht nur die
   Stil-Existenz.
6. Der Tooltip-Lokalisierungsfehler (Verdachtsmoment 6.7) behoben und mit einem
   Regressionstest abgesichert ist.
7. Mindestens ein Fixture-Test mit einer realen Fremddatei, die einen rechtsbündigen Absatz
   enthält, für **beide** Formate existiert und dauerhaft in der Suite bleibt (aktuell nicht
   vorhanden, Verdachtsmoment 6.10).

Erst nach Erfüllung aller sieben Punkte darf der Backlog-Status von „vorhanden (nicht
vertrauenswürdig)“ auf „verifiziert“ geändert werden.
