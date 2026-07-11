# Anforderungsspezifikation: Feature „Ausrichtung Blocksatz"

Status: **Nicht vertrauenswürdig — vollständige Verifikation ausstehend.** Laut
`specs/FEATURE-BACKLOG.md` (Zeile `ausrichtung-blocksatz`, Abschnitt 2.3
„Absatzformatierung") als **vorhanden** geführt (Priorität 1/essenziell), Beschreibung
dort: „Richtet den Absatz im Blocksatz aus." Diese Datei ersetzt die Beschreibung nicht,
sondern macht sie so detailliert und einzeln abhakbar, dass ein QA-Agent jeden Punkt über
echte Browser-Bedienung (nicht nur Unit-Tests) nachweisen oder widerlegen kann.

Geltungsbereich: Das Absatzformat „Blocksatz" (`align: 'justify'` auf den Node-Attributen
`paragraph`/`heading` im gemeinsamen ProseMirror-Schema, `src/formats/shared/schema.ts`).
Blocksatz teilt sich Datenmodell, Befehle (`setAlign`, `isAlignActive`) und UI-Komponente
(`AlignButton`) vollständig mit den drei Geschwister-Ausrichtungen links/zentriert/rechts —
es gibt **keinen** eigenen Code-Pfad nur für Blocksatz. Diese Anforderung ist deshalb nicht
isoliert von den anderen drei Ausrichtungen zu verifizieren; wo ein Fehler alle vier
Ausrichtungen gleichermaßen betrifft (siehe Abschnitt 2.2/2.3), wird das explizit benannt,
aber stets aus der Perspektive „was bedeutet das für Blocksatz" bewertet. Gilt für **beide**
Formate, DOCX und ODT, sowohl beim Import einer bestehenden Datei als auch beim Export eines
im Editor erstellten/bearbeiteten Dokuments — inklusive Rundreise (Datei hochladen →
unverändert exportieren → Ergebnis entspricht inhaltlich dem Original). Stil und Gliederung
orientieren sich an `E:\docs\FEATURE-SPEC-DOCX-ODT.md` sowie an `specs/ausrichtung-links-req.md`
und `specs/ausrichtung-zentriert-req.md`.

**Hinweis zu Fundstellen:** Zeilennummern sind gegen den tatsächlichen Quellcode geprüft
(zuletzt am 2026-07-05 vollständig gegen die aktuelle Quelle nachverifiziert: `schema.ts:4`
`alignAttr`, `schema.ts:16-38` `paragraph`/`heading`, `commands.ts:8/10/13-27/29-38/40-55`
`setAlign`/`isAlignActive`/`setHeading`, `Toolbar.tsx:91-111/234-237` `AlignButton`,
`WordEditor.tsx:85-107` Keymap / `WordEditor.tsx:125-132` `dispatchTransaction` /
`WordEditor.tsx:43` `reconcileSelectionOnClick` (Doc-Kommentar ab Zeile 20),
`docx/reader.ts:14/240` `JC_TO_ALIGN`, `docx/writer.ts:18/70-71` `JC_BY_ALIGN`,
`odt/reader.ts:65` `fo:text-align`, `odt/styleRegistry.ts:61` `PARAGRAPH_ALIGN_STYLE_NAME`,
`odt/writer.ts:89` — alle Symbole unverändert bestätigt; die Keymap- und
`dispatchTransaction`-Fundstellen in `WordEditor.tsx` sind gegenüber einem früheren Entwurf
(damals `77-99`/`117-124`) korrigiert, da das zwischenzeitlich eingebaute Ausschneiden-Feature
die Datei verlängert hat), können aber bei weiterer Codeänderung erneut verrutschen — der
**Symbol-/Funktionsname** (z. B. `setAlign`, `AlignButton`, `JC_TO_ALIGN`, `dispatchTransaction`)
ist der stabile Anker, die Zeilennummer nur ein Hinweis. Der in Abschnitt 0 angegebene
Ist-Stand des Codes ist Grundlage der Anforderung, **kein** Nachweis der Korrektheit — das ist
Aufgabe der Verifikation.

**Zweite Korrekturrunde (2026-07-05, kritische Prüfung eines bestehenden Entwurfs dieser
Datei):** Zusätzlich zur Codelektüre wurden alle in Abschnitt 0.1 genannten externen
Fixture-Dateien direkt per Skript (Node.js + `JSZip`, dieselbe Bibliothek wie
`docx/writer.ts:1`) entpackt und ihr `w:jc`-/`fo:text-align`-Inhalt ausgezählt, nicht nur
die früher schon vorhandenen Behauptungen übernommen. Dabei zwei Abweichungen gefunden und
hier korrigiert: (1) `tests/e2e/*.spec.ts` enthält entgegen einer früheren Fassung dieser
Datei **doch** einen E2E-Ausrichtungstest (`roundtrip-fidelity.spec.ts`, Kriterium 4) — er
ist nur für Blocksatz/Mehrfachabsatz/Button-Klick wirkungslos, siehe Abschnitt 0 unten; die
Geschwisterdateien `ausrichtung-links-req.md`/`ausrichtung-zentriert-req.md` hatten diesen
Test bereits korrekt erfasst, diese Datei nicht. (2) `unicode-path.docx` enthält
nachweislich **ein**, nicht zwei `w:jc val="start"` (per Auszählung aller `word/*.xml`-Teile,
nicht nur `document.xml`, um versteckte Vorkommen in Kopf-/Fußzeilen auszuschließen). Alle
übrigen Fixture-Detailbehauptungen in Abschnitt 0.1 (Textinhalt von
`bug-paragraph-alignment.docx`, `vAlign`-Werte in `TestTableCellAlign.docx`,
`table:align="margins"` in `tabelleAlignMargin.odt`, die exakten `justify`/`center`/`end`-
Zählungen in `feature_attributes_paragraph_MSO2013.odt`, die `w:jc`-Wertemengen in
`table-alignment.docx`/`rtl.docx`/`table-indent.docx`) wurden auf dieselbe Weise
nachgezählt und **bestätigt** — sie werden unverändert übernommen.

**Dritte Prüfrunde (2026-07-05, unabhängige Neulektüre des gesamten Quellcodes gegen
diese Fassung, keine Übernahme der Vorrunden-Behauptungen ohne eigenen Abgleich):**
Alle in Abschnitt 0 zitierten Fundstellen wurden erneut einzeln gegen den aktuellen
Arbeitsbaum gelesen — `schema.ts` (`alignAttr` Z. 4, `paragraph`/`heading` Z. 16–24/26–38),
`commands.ts` (`Align`/`alignableTypes` Z. 8/10, `setAlign` Z. 13–27, `isAlignActive`
Z. 29–38, `setHeading` Z. 40–55), `Toolbar.tsx` (`AlignButton` Z. 91–111, Instanzen
Z. 234–237), `WordEditor.tsx` (Keymap Z. 85–107, `dispatchTransaction` Z. 125–133,
`reconcileSelectionOnClick` Z. 20–50), `docx/reader.ts` (`JC_TO_ALIGN` Z. 14,
`paragraphToBlocks` Z. 229–240, `parseTable`-Zellpfad Z. 311–349), `docx/writer.ts`
(`JC_BY_ALIGN` Z. 18, `paragraphPropsXml` Z. 69–72), `odt/reader.ts` (`parseAutomaticStyles`
Z. 37–78, `paragraphToBlocks` Z. 175–178, `elementToBlocks`-Heading-Zweig Z. 256–261),
`odt/writer.ts` (`blockToOdt` Z. 85–98) und `odt/styleRegistry.ts`
(`PARAGRAPH_ALIGN_STYLE_NAME` Z. 61–66, `paragraphAlignStyleDefs` Z. 68–75,
`headingStyleName`/`headingStyleDefs` Z. 80–93) — **alle** Zeilenangaben und
Verhaltensbehauptungen bestätigt, keine Abweichung gefunden. Zusätzlich wurden alle
in Abschnitt 0.1 genannten Fixture-Pfade (`Bug51170.docx`, `bug59058.docx`, `56392.docx`,
`bug57031.docx`, `bug65649.docx`, `form_footnotes.docx`, `bug-paragraph-alignment.docx`,
`TestTableCellAlign.docx`, `table-alignment.docx`, `rtl.docx`, `table-indent.docx`,
`unicode-path.docx`, `feature_attributes_paragraph_MSO2013.odt`, `Seasonal_Fruits2_en.odt`,
`ListRoundtrip.odt`, `tabelleAlignMargin.odt`) sowie die zitierten Unit-Test-Dateien
(`docx/__tests__/roundtrip.test.ts:54–59` mit `it.each(['left','center','right','justify'])`
über den Einzelabsatz-Helper `paragraph()` Z. 23–25; `odt/__tests__/roundtrip.test.ts`
mit identischem Muster) und der E2E-Beleg (`tests/e2e/roundtrip-fidelity.spec.ts:58/129/
179/243`, viermal `toHaveCSS('text-align', 'center')`, nie `justify`) im Dateisystem
verifiziert — vorhanden, Pfade und Inhalte wie beschrieben. Einzige gefundene, rein
redaktionelle Ungenauigkeit (kein inhaltlicher Fehler): Die Fundstellenliste zu
Abschnitt 0 nennt `odt/reader.ts:94` als eine der drei `\|\| 'left'`-Fallback-Stellen;
Zeile 94 (`emptyParagraph()`) enthält tatsächlich ein hart codiertes `align: 'left'` ohne
das `\|\|`-Muster (das echte `\|\| 'left'`-Fallback-Muster steht nur an Z. 178 und Z. 259) —
im Ergebnis identisches Verhalten (ein leerer Absatz wird immer linksbündig erzeugt),
daher keine Korrektur der nachgelagerten Anforderungen nötig, hier nur zur Präzision
vermerkt.

---

## 0. Ist-Stand des Codes (gegen die aktuelle Quelle geprüft)

| Ort | Inhalt |
|---|---|
| `src/formats/shared/schema.ts:4` | `alignAttr = { align: { default: 'left', validate: 'string' } }` — **kein Enum**, jeder String wird akzeptiert |
| `src/formats/shared/schema.ts:16-24` | Node `paragraph`: Attribut `align`, `parseDOM` liest `dom.style.textAlign \|\| 'left'` (nur **inline** `style`-Attribut, keine CSS-Klassen/Stylesheet-Regeln), `toDOM` rendert `text-align: ${align}` |
| `src/formats/shared/schema.ts:26-38` | Node `heading` (Ebene 1–6): identisches `align`-Attribut/Verhalten |
| `src/formats/shared/editor/commands.ts:8` | `export type Align = 'left' \| 'center' \| 'right' \| 'justify'` |
| `src/formats/shared/editor/commands.ts:10` | `alignableTypes = new Set(['paragraph', 'heading'])` |
| `src/formats/shared/editor/commands.ts:13-27` | `setAlign(align)`: iteriert per `state.doc.nodesBetween(from, to, …)` über **alle** treffenden Blöcke im rohen `from`/`to`-Intervall der Selektion und ruft für **jeden einzelnen** `dispatch(state.tr.setNodeAttribute(pos, 'align', align))` auf — `state` ist die ursprüngliche, unveränderte Closure-Variable; `state.tr` erzeugt bei jedem Aufruf eine **neue**, aber immer vom selben Ausgangsdokument abgeleitete Transaction (Zeile 21). Iteriert **nicht** über `state.selection.ranges` (relevant für Grenzfall 3.4) |
| `src/formats/shared/editor/commands.ts:29-38` | `isAlignActive(state, align)`: prüft nur den nächsten alignierbaren Vorfahren von `$from` (dem Selektionsanfang), nicht die gesamte Selektion |
| `src/formats/shared/editor/commands.ts:40-55` | `setHeading(level)`: setzt beim Wechsel zu einer Überschrift `align` **hart auf `'left'`** (Zeile 43: `{ level, align: 'left' }`), unabhängig vom vorherigen Ausrichtungswert; beim Wechsel zurück zu „Standard" (`level === null`) werden `attrs: undefined` übergeben → Schema-Default `align: 'left'` greift ebenfalls. Verweigert Mehrfachblock-Selektion (`!$from.sameParent($to)` → `return false`) |
| `src/formats/shared/editor/Toolbar.tsx:91-111` | `AlignButton`: Button hat `title={"Ausrichtung: " + align}` (interner englischer Bezeichner, z. B. `justify`, kein deutsches Wort) und `aria-pressed`, aber **kein** `aria-label` (im Unterschied zu `MarkButton`, Zeile 55-89, das `title` **und** `aria-label` setzt); der sichtbare Inhalt ist das reine Glyphen-`label` |
| `src/formats/shared/editor/Toolbar.tsx:234-237` | Die vier `AlignButton`-Instanzen mit reinen Unicode-Glyphen: links `⇤`, zentriert `↔`, rechts `⇥`, **Blocksatz `≡`** — kein SVG, kein sichtbarer deutscher Text |
| `src/formats/shared/editor/WordEditor.tsx:85-107` | Tastatur-Keymap: `Mod-z/y/Shift-z`, `Enter`, `Shift-Enter`, `Mod-b/i/u`, `Shift-Delete` — **keine** Tastenkombination für irgendeine Ausrichtung (in Word/LibreOffice üblich: Strg+L/E/R/J) |
| `src/formats/shared/editor/WordEditor.tsx:125-132` | `dispatchTransaction(tr) { const newState = view.state.apply(tr); view.updateState(newState); … }` — wendet `tr` immer auf das **aktuelle** `view.state` an; siehe Abschnitt 2.2 für die Konsequenz in Kombination mit `commands.ts:21` |
| `src/formats/shared/editor/WordEditor.tsx:20-50` | `reconcileSelectionOnClick` + Doc-Kommentar: `AllSelection` (z. B. nach Strg+A) ist bereits als bekanntes Sonder-Selektionsobjekt behandelt (relevant für Grenzfall 3.3/3.12 — der Selection-Sync-Bug aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) |
| `src/formats/docx/reader.ts:14` | `JC_TO_ALIGN = { left: 'left', center: 'center', right: 'right', both: 'justify' }` — deckt nur diese vier `w:jc`-Werte ab (`both` ist Words Blocksatz-Wert) |
| `src/formats/docx/reader.ts:238-240` | `paragraphToBlocks` liest `w:jc` **ausschließlich** aus dem direkten `w:pPr` des Absatzes; fehlender/unbekannter Wert → stiller Fallback `?? 'left'`; **keine** Auswertung eines style-seitig über `w:pStyle` ererbten `w:jc` |
| `src/formats/docx/reader.ts:229,338` | **Korrigierte Fundstelle** (ein früherer Entwurf nannte hier fälschlich `229,475` — Zeile 475 ist `readBodyChildren`, der Fließtext-Pfad, **nicht** der Zellen-Pfad; es gibt zudem keine eigene Funktion namens `readTableCell`, die Zellenverarbeitung liegt inline in `parseTable`, Zeile 311-344). Tabellenzellen-Absätze durchlaufen an Zeile 338 (`parseTable`, innerhalb der Zeilen-Schleife) dieselbe `paragraphToBlocks`-Funktion (Definition Zeile 229) wie der Fließtext-Aufruf in `readBodyChildren` (Zeile 475) — Blocksatz in Zellen ist technisch derselbe Code-Pfad wie im Fließtext |
| `src/formats/docx/writer.ts:18` | `JC_BY_ALIGN = { left: 'left', center: 'center', right: 'right', justify: 'both' }` |
| `src/formats/docx/writer.ts:69-71` | `paragraphPropsXml`: schreibt **immer** ein explizites `<w:jc w:val="…"/>` (auch für den Default „links"); unbekannter `align`-Wert → stiller Fallback `?? 'left'` |
| `src/formats/odt/reader.ts:65-66` | `parseAutomaticStyles`: liest `fo:text-align` **roh** aus `style:paragraph-properties` und übernimmt den String unverändert in `paragraphAligns` (keine Normalisierung von ODF-Werten wie `start`/`end` auf `left`/`right`) |
| `src/formats/odt/reader.ts:94,178,259` | Fehlt eine passende Stildefinition → Fallback `\|\| 'left'` (leerer Absatz, Fließtext-Absatz, Überschrift) |
| `src/formats/odt/writer.ts` + `styleRegistry.ts:61-66` | `PARAGRAPH_ALIGN_STYLE_NAME[align] ?? …left` — jeder nicht exakt passende Wert (z. B. `start`, `end`, `inherit`) fällt beim Export still auf `left` zurück |
| `src/formats/odt/styleRegistry.ts:61-93` | Feste Stildefinitionen `Ppara-justify`/`Heading{1-6}-justify` mit `fo:text-align="justify"` und `style:parent-style-name="Standard"`; Gegenstücke für links/rechts nutzen literal `"left"`/`"right"`, **nicht** die ODF-alternativen `"start"`/`"end"` |
| `src/formats/docx/__tests__/roundtrip.test.ts:54-59` | `it.each(['left','center','right','justify'])('preserves "%s" alignment')` — konstruiert dabei über den Helper `paragraph(text, align)` (Zeile 23-25) **immer nur ein einzelnes** Absatz-JSON-Objekt, testet also **nie** eine Mehrfach-Absatz-Selektion; Heading-Ausrichtung nur mit `center` getestet (Zeile 47-51), **kein** dedizierter Justify-Heading-Test |
| `src/formats/odt/__tests__/roundtrip.test.ts` | Analoger Test für ODT, dieselbe Einschränkung (Einzelabsatz) |
| `src/formats/docx/__tests__/external-fixtures.test.ts` | Prüft für reale Fremddateien nur „importiert ohne Absturz" — **keine** Aussage über korrekt erkannte Ausrichtung |
| `tests/e2e/roundtrip-fidelity.spec.ts:56-58,128-129,178-179,242-243` | **Korrektur gegenüber einem früheren Entwurf, der hier fälschlich „kein einziger E2E-Test" behauptete** — es gibt genau **einen** E2E-Ausrichtungstest, „Kriterium 4" der `datei-oeffnen-req.md`-§6-Rundreise-Fidelity-Matrix (DOCX→DOCX und ODT→ODT). Er prüft ausschließlich `center` (`toHaveCSS('text-align', 'center')`), auf einem beim Fixture-Aufbau bereits **vorkonstruierten** Absatz (`tests/e2e/fixtures/richDocument.ts:141`, ODT-Stil `Centered`/DOCX-Äquivalent), **niemals** über einen echten Klick auf einen Ausrichtungs-Button (`setAlign` wird in keinem E2E-Test aufgerufen) und **niemals** mit `justify`. Für Blocksatz speziell, für Mehrfachabsatz-Selektion und für den Bedien-Pfad „Button-Klick → Wirkung" bleibt die Lücke bei echter Browser-Bedienung dieses Features vollständig bestehen. Die Datei prüft zusätzlich global `expect(errors, …).toEqual([])` (Zeile 135, Playwright-`errors`-Fixture) — nützlich als Vorlage für den Absturz-Nachweis in Testfall 5.1, deckt dessen Mehrfachabsatz-Szenario aber nicht ab. |

### 0.1 Fixture-Realität (durch direkte XML-Inspektion verifiziert — Korrektur gegenüber früheren Entwürfen)

> **Wichtige Richtigstellung.** Ein früherer Entwurf dieser Anforderung führte
> `bug-paragraph-alignment.docx`, `table-alignment.docx`, `TestTableCellAlign.docx` und
> `tabelleAlignMargin.odt` pauschal als „Blocksatz-/Ausrichtungs-Fixtures" und verlangte,
> deren Blocksatz-Absätze auf Rundreise zu prüfen. Eine **direkte Inspektion der
> entpackten XML** (durchgeführt für diese Fassung) zeigt: das war teilweise schlicht
> falsch. Zwei der vier Dateien enthalten **überhaupt keine** horizontale
> Absatzausrichtung, und **keine** der vier enthält Blocksatz (`both`/`justify`). Ein
> Testfall, der dort Blocksatz sucht, kann nur „grün ohne Aussage" oder falsch-negativ
> sein. Die korrekten Fundstellen sind unten aufgeführt und in Abschnitt 4/5 verwendet.

| Fixture | Tatsächlicher Inhalt (verifiziert) | Rolle für dieses Feature |
|---|---|---|
| `tests/fixtures/external/docx/bug-paragraph-alignment.docx` | Absatz 1: **kein** direktes `w:jc`, Ausrichtung `center` nur über die Formatvorlage (`w:jc val="center"` in `styles.xml`); Absatz 2: direktes `w:jc val="left"`, das die Formatvorlage überschreibt. Selbst-dokumentierender Lauftext: „…centered per the paragraph style." / „…explicit left alignment, overriding the alignment in the paragraph style." **Kein Blocksatz.** | **Grenzfall 3.10** (style-seitig ererbte Ausrichtung) — **nicht** ein Blocksatz-Rundreise-Fixture |
| `tests/fixtures/external/docx/TestTableCellAlign.docx` | **Kein** `w:jc`. Nur `w:vAlign` (`center`, `bottom`) — **vertikale** Zellausrichtung, ein separates, nicht implementiertes Feature. | **Nicht** für horizontale Ausrichtung/Blocksatz verwendbar; nur als Negativ-Beleg |
| `tests/fixtures/external/odt/tabelleAlignMargin.odt` | **Kein** `fo:text-align`. Nur `table:align="margins"` — horizontale **Tabellenposition** auf der Seite, keine Absatzausrichtung. | **Nicht** für Absatz-Blocksatz verwendbar |
| `tests/fixtures/external/docx/table-alignment.docx` | `w:jc`-Werte `left`, `right`, `center`, **`start`**, **`end`** (je 1×) — **kein** `both`. | **Grenzfälle 3.8/3.9** (`start`/`end`), **nicht** Blocksatz |
| `tests/fixtures/external/docx/rtl.docx` | 4× `w:jc val="start"` (RTL-Dokument) | **Grenzfall 3.9** (`start`, LTR-Näherung inhaltlich falsch für RTL) |
| `tests/fixtures/external/docx/table-indent.docx`, `unicode-path.docx` | `w:jc val="start"` (98× bzw. 1×) | **Grenzfall 3.9** (`start`) |
| **DOCX mit echtem Blocksatz** (`w:jc val="both"`): u. a. `Bug51170.docx`, `bug59058.docx`, `56392.docx`, `bug57031.docx`, `bug65649.docx`, `form_footnotes.docx` | Enthalten real `<w:jc w:val="both"/>` | **Blocksatz-Rundreise DOCX** (Abschnitt 4.1) |
| **ODT mit echtem Blocksatz** (`fo:text-align="justify"`): u. a. `feature_attributes_paragraph_MSO2013.odt`, `Seasonal_Fruits2_en.odt`, `ListRoundtrip.odt`, `test1.odt` | Enthalten real `fo:text-align="justify"`; `feature_attributes_paragraph_MSO2013.odt` enthält in **derselben** Datei `center` (2×), `end` (2×) **und** `justify` (2×) | **Blocksatz-Rundreise ODT** (Abschnitt 4.2) + gemischtes Ausrichtungs-Fixture inkl. `end`-Grenzfall |

---

## 1. Bedienelemente

| # | Element | Fundstelle | Ist-Verhalten laut Code | Anforderung |
|---|---|---|---|---|
| 1 | Toolbar-Button „≡" (Blocksatz) | `Toolbar.tsx:237`, `<AlignButton view={view} align="justify" label="≡" />` | Ruft `setAlign('justify')` auf, `onMouseDown` mit `preventDefault()`, danach `view.focus()` | Muss per Maus **und** Tastatur (Tab-Fokus + Enter/Space) auslösbar sein; Klick darf nie eine unbehandelte Exception werfen (siehe 2.2) und muss den Editor-Fokus/die Selektion erhalten |
| 2 | Tastenkombination | nicht vorhanden (`WordEditor.tsx:85-107` enthält keinen Ausrichtungs-Eintrag) | — | In Word/LibreOffice ist Strg+J Standard für Blocksatz — aktuell **komplett fehlend**. Zu entscheiden, ob als Lücke zu schließen. **Achtung:** Strg+J ist in Chrome/Edge (Windows/Linux) für die Downloads-Ablage browser-reserviert und erreicht die Seite nie; ein naives „Strg+J ergänzen" wäre ein **stiller Fehlschlag** (Verstoß gegen `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 Punkt 4). Falls ein Kürzel ergänzt wird, muss es nachweislich beim Nutzer ankommen; falls bewusst keines, explizit dokumentieren |
| 3 | Icon-Rendering des Buttons | `Toolbar.tsx:237`, reines Unicode-Zeichen `≡` | Kein SVG, keine sichtbare Textbeschriftung | Laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1 **namentlich** als Risiko-Icon gelistet (`≡`) — auf Systemen ohne verlässliche Unicode-Glyphen-Darstellung eindeutig prüfen; Toolbar-weite SVG-Umstellung ist dort ein eigenes Vorhaben |
| 4 | `aria-label`/Screenreader-Name | `Toolbar.tsx:91-111` | Button hat **kein** `aria-label`; da sichtbarer Text-Inhalt (`≡`) vorhanden ist, ist der zugängliche Name laut WAI-ARIA-Accessible-Name-Berechnung das Glyphen-Zeichen **selbst** — `title` („Ausrichtung: justify") wird nur als Fallback herangezogen, **wenn kein** Text-Inhalt vorhanden ist, greift hier also **nicht** | Screenreader (NVDA/VoiceOver) kündigen den Button vermutlich mit dem Unicode-Zeichennamen von „≡" an, nicht mit „Blocksatz" — mit echtem Screenreader prüfen und ggf. durch `aria-label="Blocksatz"` beheben (konsistent zu `MarkButton`) |
| 5 | Aktiver Zustand des Buttons | `Toolbar.tsx:92`, `isAlignActive(view.state, 'justify')` (`commands.ts:29-38`), prüft nur `$from` | Zeigt „gedrückt" nur für den Block, in dem der Selektionsanfang steht | Verhalten bei Selektion über mehrere Absätze mit unterschiedlicher Ausrichtung muss eindeutig spezifiziert werden (siehe 2.4/Grenzfall 3.5) |
| 6 | Absatzformat-Dropdown (Wechselwirkung) | `Toolbar.tsx:165-180` (Heading-Dropdown), `commands.ts:40-55` (`setHeading`) | Setzt beim Wechsel zu/von einer Überschrift `align` hart auf `'left'` | Muss geklärt/dokumentiert werden, ob dieses Zurücksetzen gewollt ist (siehe 2.6) — betrifft Blocksatz direkt: ein zuvor im Blocksatz stehender Absatz wird beim Wechsel zu „Überschrift 1" **kommentarlos** linksbündig |
| 7 | Kontextmenü (Rechtsklick) | nicht vorhanden (bewusst kein eigenes Kontextmenü, `WordEditor.tsx:117-121`; **korrigierte Zeilenangabe** — ein früherer Entwurf nannte hier `109-113`, das zeigt auf den `EditorView`-Konstruktoraufruf, nicht auf den erläuternden Kommentar) | — | Kein Kontextmenü-Eintrag „Blocksatz"; nicht Teil dieser Anforderung, aber als fehlend zu dokumentieren |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Anwenden auf einen einzelnen Absatz/eine Überschrift
- Cursor ohne Selektion in einem Absatz, „Blocksatz" geklickt → genau dieser Absatz erhält
  `align: 'justify'`, sichtbar an gleichmäßig ausgerichtetem linkem **und** rechtem Textrand
  (bis auf die letzte Zeile, browserüblich linksbündig).
- Selektion vollständig innerhalb eines einzelnen Absatzes (auch nur ein Wort markiert)
  → wirkt auf den **gesamten** umschließenden Absatz, nicht nur auf die Selektion (Absatz-,
  kein Zeichenformat), unabhängig von der Cursor-Position im Absatz.
- Gilt identisch für eine Überschrift (Ebene 1–6).
- Die Aktion erzeugt für den Fall „genau ein betroffener Block" einen einzelnen,
  eigenständigen Undo-Schritt.

### 2.2 Anwenden auf eine Selektion über mehrere Absätze/Überschriften — kritischer Verdachtsfall (Absturz)

> **Durch Codelektüre bestätigter Verdacht auf einen schwerwiegenden Laufzeitfehler**
> (analog zum dokumentierten Selection-Sync-Bug in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2)
> — **muss** noch im echten Browser/E2E nachgewiesen werden, bevor er als endgültig
> bestätigt gilt (die Analyse erfolgte durch Quelltext-Lesen, nicht durch einen
> Browser-Lauf):
>
> `setAlign` (`commands.ts:13-27`) ruft für **jeden** in der Selektion gefundenen
> alignierbaren Block `dispatch(state.tr.setNodeAttribute(pos, 'align', align))` auf, wobei
> `state` über die gesamte Schleife hinweg die **ursprüngliche**, unveränderte
> `EditorState`-Instanz bleibt. `WordEditor.tsx:125-132` implementiert `dispatchTransaction`
> als `view.state.apply(tr)` — angewandt auf das zu diesem Zeitpunkt **aktuelle**
> `view.state`. Nach dem ersten `dispatch()` hat sich `view.state.doc` bereits geändert
> (erster Block ist justiert); die zweite Transaction wurde aber weiterhin aus dem **alten**
> `state` gebaut. `EditorState.apply()` verlangt, dass `tr.before` mit dem Dokument
> übereinstimmt, auf das angewendet wird, und wirft **`RangeError: "Applying a mismatched
> transaction"`**, sobald sich beide unterscheiden — was ab dem **zweiten** betroffenen
> Block der Fall ist. Der erste Block ist zu diesem Zeitpunkt bereits auf `justify` gesetzt,
> alle weiteren bleiben unverändert, und die Exception ist **unbehandelt** (kein `try`/`catch`
> in `Toolbar.tsx`s `run()`, keine React-Error-Boundary im `src`-Baum).
>
> **Praktische Konsequenz, falls im Browser bestätigt:** Der mit Abstand häufigste
> Anwendungsfall — „Strg+A (Alles auswählen, laut Backlog `alles-auswaehlen` bereits
> „vorhanden"), dann Blocksatz klicken" — sowie jede Mehrfachabsatz-Selektion (auch eine
> markierte mehrzeilige Liste oder mehrere markierte Tabellenzellen) würde **nur den ersten
> betroffenen Block** justieren und danach ohne sichtbare Rückmeldung fehlschlagen — ein
> direkter Verstoß gegen „Kein stiller Fehlschlag" (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20
> Punkt 4). Das erklärt, warum der Status „vorhanden" vermutlich nur über Einzelabsatz-Tests
> vergeben wurde: Weder die Unit-Tests (`roundtrip.test.ts`, immer ein einzelner Absatz) noch
> E2E-Tests (keine vorhanden) decken je mehr als einen Absatz gleichzeitig ab.
>
> **Dies ist der wichtigste Einzelpunkt dieser Anforderungsdatei** und muss zuerst
> verifiziert werden (Testfall 5.1).

Soll-Verhalten: Anwenden von „Blocksatz" auf eine Selektion über N Absätze/Überschriften
setzt **alle** N Blöcke in einem einzigen, atomaren Vorgang (**ein** Undo-Schritt) auf
`justify`, ohne Exception, unabhängig von N (2, 20, 200 — inklusive Blöcke in Listenpunkten
und Tabellenzellen).

### 2.3 Zweiter, davon unabhängiger Verdacht: falscher Wirkungsbereich bei Zellauswahl (stiller Korrektheitsfehler)

Auch **nach** Behebung von 2.2 (Absturz) bliebe ein **zweiter, eigenständiger** Fehler
denkbar, der schwerer wiegt, weil er **nicht abstürzt** und daher leicht unbemerkt bleibt:
`setAlign` iteriert über das rohe Intervall `{ from, to } = state.selection`
(`commands.ts:15,17`), **nicht** über `state.selection.ranges`. Bei einer nicht
zusammenhängenden `CellSelection` aus `prosemirror-tables` (z. B. „nur die mittlere Spalte
einer 3-spaltigen Tabelle über zwei Zeilen markiert") liegt zwischen `from` und `to` in der
flachen Dokumentreihenfolge auch eine **nicht** markierte Zelle. `nodesBetween(from, to, …)`
erfasst deren Absatz mit und würde ihn ebenfalls justieren.

**Soll-Verhalten:** Blocksatz wirkt **ausschließlich** auf die tatsächlich selektierten
Zellen/Blöcke, nie auf dazwischenliegende, nicht markierte Zellen. Zu verifizieren mit einer
gezielten, nicht-rechteckigen Zellauswahl (Testfall 5.6, Grenzfall 3.4). Diese Anforderung
ist bewusst getrennt von 2.2, weil ein Fix, der nur den Absturz behebt (z. B. „eine
Transaction, mehrere `setNodeAttribute`"), diesen Wirkungsbereichs-Fehler **nicht**
automatisch mitbehebt.

### 2.4 Anzeige des aktiven Zustands
- Button zeigt `aria-pressed="true"` und optisch „gedrückt", wenn der Block an `$from`
  `align: 'justify'` hat. Zustand aktualisiert sich sofort bei jeder Cursor-/Selektions-
  änderung, auch ohne Klick auf den Button.
- Bei einer Selektion über mehrere Blöcke mit **unterschiedlicher** Ausrichtung zeigt der
  Button aktuell ausschließlich den Zustand des **ersten** Blocks (`$from`). Das gewünschte
  Anzeigeverhalten bei gemischter Selektion **muss festgelegt und begründet werden**
  (Word/LibreOffice-Konvention: bei gemischter Ausrichtung ist **kein** Ausrichtungs-Button
  gedrückt). Da Ausrichtung ein exklusiver 4-Werte-Zustand ist (kein Mehrfach-Zustand wie bei
  Marks), darf nie mehr als einer der vier Buttons gleichzeitig gedrückt erscheinen — siehe
  Grenzfall 3.5.

### 2.5 Kein Toggle-Charakter (Unterschied zu Zeichenformaten)
- Im Gegensatz zu Fett/Kursiv/Unterstrichen/Durchgestrichen (echte Toggle-Marks) ist
  Ausrichtung ein exklusiver 4-Werte-Zustand **ohne „Aus"**. Erneutes Klicken auf „Blocksatz",
  während der Absatz bereits im Blocksatz ist, bewirkt **keine** sichtbare Änderung; um
  Blocksatz „aufzuheben", muss aktiv eine der drei anderen Ausrichtungen gewählt werden.
- Die vier Ausrichtungs-Buttons verhalten sich wie eine Radio-Gruppe: zu jedem Zeitpunkt hat
  jeder Absatz genau einen der vier Werte.
- **Zu klären und zu dokumentieren:** Erzeugt ein Klick auf „Blocksatz" bei bereits
  justiertem Absatz trotzdem einen (wirkungslosen) Undo-Schritt? `commands.ts:21` ruft
  `setNodeAttribute` unabhängig vom vorherigen Wert auf — vermutlich entsteht eine leere,
  aber vorhandene Transaktion. Ein unnötiger Undo-Schritt ist ein Nice-to-have-Mangel (kein
  Blocker), das tatsächliche Verhalten ist aber festzustellen (Grenzfall 3.11).

### 2.6 Zusammenspiel mit dem Absatzformat-Dropdown (Formatvorlagen)
- `setHeading()` (`commands.ts:40-55`) setzt beim Umwandeln eines Absatzes in eine Überschrift
  `align` **hart auf `'left'`** (Zeile 43), unabhängig vom vorherigen Wert. Ein Absatz im
  Blocksatz verliert diesen beim Wechsel zu „Überschrift 1"–„6" **ohne Rückmeldung**.
- Ebenso beim Zurückwechseln von einer Überschrift zu „Standard" (`level === null`):
  `attrs: undefined` → Schema-Default `align: 'left'` greift, eine auf der Überschrift
  gesetzte Blocksatz-Ausrichtung geht verloren.
- **Zu entscheiden und explizit zu dokumentieren:** Soll dieses Zurücksetzen so bleiben (jede
  Formatvorlagen-Änderung setzt die Ausrichtung bewusst zurück), oder soll eine **manuell**
  gesetzte Ausrichtung den Formatvorlagenwechsel überleben (Word/LibreOffice-Erwartung: direkte
  Formatierung überlebt einen Formatvorlagenwechsel)? Diese Entscheidung überschneidet sich mit
  `specs/absatzformat-dropdown-req.md` und muss dort **konsistent** getroffen werden, nicht
  zweimal unabhängig. Aktuell verliert das Modell die Information ersatzlos.

### 2.7 Zusammenspiel mit Listen und Tabellenzellen
- Absätze innerhalb eines Listenpunkts (`list_item > paragraph`) und einer Tabellenzelle
  (`table_cell > paragraph`) sind laut `alignableTypes` (`commands.ts:10`) genauso alignierbar
  wie normale Absätze — Blocksatz muss dort funktionieren wie im Fließtext, unabhängig je
  Zelle/Punkt, ohne Nebenwirkung auf Nachbarzellen (auch bei über `colspan`/`rowspan`
  verbundenen Zellen).
- Bei einem justierten Listenpunkt wird nur der **Textinhalt** verteilt; das
  Aufzählungszeichen/die Nummer bleibt an seiner Position (zu bestätigen, nicht anzunehmen).
- Eine Selektion über mehrere Listenpunkte oder mehrere Tabellenzellen ist zugleich ein Fall
  von 2.2 (Absturz, mehrere Blöcke) **und** ggf. 2.3 (falscher Wirkungsbereich bei
  nicht-rechteckiger Zellauswahl).

### 2.8 Zwischenablage / Einfügen von extern kopiertem Text
- Extern kopiertes HTML mit **inline** `style="text-align: justify"` auf einem `<p>`-Element
  wird als `align: 'justify'` erkannt (`schema.ts:20`, liest `dom.style.textAlign`).
- Extern kopiertes HTML, dessen Blocksatz **ausschließlich** über eine CSS-Klasse plus
  externes/eingebettetes Stylesheet zugewiesen ist (kein Inline-`style`), wird **nicht**
  erkannt, da `dom.style` nur das Inline-`style`-Attribut abbildet, keine kaskadierten Werte —
  Grenzfall 3.7.
- Kopieren von Blocksatz-Text innerhalb des Editors und Einfügen an anderer Stelle: zu
  verifizieren, ob die Ausrichtung des Ziel-Absatzes greift oder die eingefügte Absatzstruktur
  inklusive `align` übernommen wird (je nachdem, ob ganze Absätze oder nur Inline-Inhalt
  eingefügt werden).

### 2.9 Undo/Redo
- Einzelblock-Fall (2.1): Undo direkt nach „Blocksatz" stellt die vorherige Ausrichtung wieder
  her, Redo stellt Blocksatz erneut her.
- Mehrblock-Fall (2.2): **nach Behebung** muss ein einzelnes Undo alle im selben Klick
  geänderten Blöcke gemeinsam zurücksetzen (ein Schritt, nicht N Schritte). Aktuell nicht
  prüfbar, da der Vorgang mutmaßlich vorher mit einer Exception abbricht.

### 2.10 Kombination mit Zeichenformaten und anderen Absatzeigenschaften
- Blocksatz lässt sich unabhängig von Fett/Kursiv/Unterstrichen/Durchgestrichen/Farben auf
  denselben Absatz anwenden; keines der Zeichenformate (Marks) darf durch das Setzen der
  Ausrichtung (Node-Attribut) verändert werden — unterschiedliche Attribut-Ebenen.
- Weitere Absatzeigenschaften (Zeilenabstand, Einzüge) sind laut `FEATURE-BACKLOG.md`
  Abschnitt 2.3 alle „fehlt" — eine Wechselwirkung damit ist aktuell nicht testbar, als
  zukünftige Erweiterung vermerkt.

---

## 3. Grenzfälle

1. **Leerer Absatz/leeres Dokument:** „Blocksatz" auf einen leeren Absatz → darf nicht
   abstürzen, setzt `align: 'justify'` auf den einzigen Absatz; visuell keine Änderung (kein
   Text zum Verteilen). Danach getippter Text muss justiert erscheinen.
2. **Selektion über exakt zwei Absätze:** kleinstmöglicher Fall von 2.2 — als allererstes
   einzeln nachstellen (zwei Absätze markieren, „Blocksatz" klicken).
3. **„Alles auswählen" (Strg+A), dann „Blocksatz":** vermutlich häufigster realer Ablauf —
   direkte Instanz von 2.2 mit einer `AllSelection` (`WordEditor.tsx:20-50` zeigt, dass
   `AllSelection`s bereits als Sonderfall behandelt werden müssen).
4. **Nicht-rechteckige Zellauswahl (`CellSelection`):** z. B. 3×3-Tabelle, nur die mittlere
   Spalte über zwei Zeilen markiert → nach Behebung von 2.2 prüfen (Grenzfall zu 2.3), ob nur
   die markierten Zellen justiert werden oder auch die dazwischenliegende, **nicht** markierte
   Zelle 3 der ersten Zeile (stiller Wirkungsbereichs-Fehler). Kritischer Test, da der Code
   keine `CellSelection`-Sonderbehandlung enthält.
5. **Gemischte Selektion (teils Blocksatz, teils andere Ausrichtung):** Button-Zustand zeigt
   aktuell nur `$from` — festzulegen, ob akzeptabel oder ob „kein Button gedrückt" erwartet
   wird; unabhängig davon darf das Anwenden nicht zu inkonsistentem Ergebnis führen (manche
   Blöcke justiert, andere nicht) — siehe 2.2.
6. **Selektion aus Text und Bild (und reine Bild-Selektion):** Bild-Node ist nicht in
   `alignableTypes` und hat kein `align` — darf nicht abstürzen; Blocksatz wirkt nur auf
   Absatz-/Überschrift-Nodes. Enthält die Selektion **ausschließlich** ein Bild
   (`NodeSelection` auf genau ein Bild), findet `setAlign` keinen alignierbaren Block,
   `applicable` bleibt `false`, der Klick tut sichtbar **nichts** — ebenfalls ein „stiller
   Fehlschlag" ohne Rückmeldung, unabhängig von 2.2.
7. **Fremdwert im `align`-Attribut nach externem Paste — inkl. rein klassenbasierter (nicht
   inline) Formatierung:** `schema.ts:4` deklariert `validate: 'string'` ohne Enum; eingefügtes
   HTML mit `style="text-align: start"`, `"end"`, `"match-parent"` oder `"inherit"` übernimmt den
   Literalwert unverändert. Keiner der vier Buttons zeigt dann aktiv (`isAlignActive` vergleicht
   exakt gegen `left/center/right/justify`), obwohl der Absatz visuell plausibel aussehen kann;
   beim Export fällt der Wert still auf „links" zurück. Umgekehrt wird Blocksatz, der im
   eingefügten HTML **nur** über eine CSS-Klasse/ein Stylesheet (kein Inline-`style`) gesetzt
   ist, gar nicht erst erkannt (`schema.ts:20` liest nur `dom.style.textAlign`) und geht als
   normaler linksbündiger Absatz verloren. Beide Fälle gezielt mit Einfüge-Test verifizieren und
   das Fallback-Verhalten dokumentieren (Blocksatz + Überschrift-Wechselwirkung siehe 2.6).
8. **ODT-Import mit `fo:text-align="start"`/`"end"`** (ODF-übliche, bidi-neutrale Werte, real
   z. B. in `feature_attributes_paragraph_MSO2013.odt` mit `end`, `start` korpusweit verbreitet):
   Reader übernimmt den Rohwert (`odt/reader.ts:65-66`), Toolbar zeigt keinen Zustand aktiv,
   Re-Export normalisiert still auf `"left"`. Für Blocksatz selbst unkritisch (ODF nutzt für
   Blocksatz durchgehend `"justify"`), aber relevant für die Nachbarabsätze in gemischten
   Test-Dateien und damit für die korrekte Beurteilung der Rundreise-Tests.
9. **DOCX-Import mit `w:jc val="start"`/`"end"`/`"distribute"`/`"thaiDistribute"`:** `JC_TO_ALIGN`
   (`docx/reader.ts:14`) kennt nur `left/center/right/both`; jeder andere Wert fällt still auf
   `'left'` (Zeile 240). Real belegt: `rtl.docx` (4× `start`), `table-alignment.docx`
   (`start`+`end`), `table-indent.docx` (98× `start`), `unicode-path.docx` (1× `start`). Für
   Blocksatz konkret ist nur `both` relevant (daher für dieses Feature theoretisch), aber als
   generelle Lücke der Ausrichtungs-Erkennung zu dokumentieren; `start` auf `left` abzubilden
   ist inhaltlich falsch für ein RTL-Dokument wie `rtl.docx`.
10. **`w:jc`/`fo:text-align` nur auf Formatvorlagen-Ebene (Style), nicht direkt am Absatz:**
    Reader liest ausschließlich die direkte Absatz-Formatierung (`docx/reader.ts:238-240`).
    **Real belegt** durch `bug-paragraph-alignment.docx`: Absatz 1 ist nur über die
    Formatvorlage (`w:jc val="center"` in `styles.xml`) zentriert und wird derzeit fälschlich
    als `left` gelesen; Absatz 2 hat direktes `w:jc val="left"` und wird korrekt gelesen. Für
    Blocksatz: eine Datei, die Blocksatz nur über eine geerbte Formatvorlage setzt, würde als
    „links" importiert. Style-Vererbung ist **nicht** zwingend Teil dieser Anforderung (siehe
    4.1.10), aber die **direkte** Formatierung darf nie verloren gehen. Mit dieser realen Datei
    einzufrieren.
11. **Wiederholtes/schnelles Mehrfachklicken auf denselben Button:** kein doppeltes Anwenden,
    keine unnötig aufgeblähte Undo-Historie (hängt mit 2.5 zusammen).
12. **Blocksatz in Kombination mit dem bekannten Selection-Sync-Bug** (`FEATURE-SPEC-DOCX-ODT.md`
    Abschnitt 2, `tests/e2e/selection-regression.spec.ts`): Alles auswählen → Blocksatz (löst
    laut 2.2 vermutlich schon selbst eine Exception aus) → per Klick neu positionieren → Enter →
    weiter tippen — prüfen, ob die Kombination beider Fälle den Dokumentinhalt zusätzlich
    gefährdet; beide entstehenden Absätze müssen erhalten bleiben.
13. **Sehr lange Selektion (mehrseitiges Dokument, hunderte Absätze):** nach Behebung von 2.2
    prüfen, ob die Anwendung performant bleibt und nicht einfriert.
14. **Blocksatz auf einen Absatz mit einem einzigen, sehr langen Wort ohne Leerzeichen**
    (z. B. eine URL): Browser-Rendering von `text-align: justify` ohne Umbruchmöglichkeiten →
    darf nicht zu über die Seite hinausragendem, beim Export verlorenem Text führen (rein
    visuelle Prüfung, kein Datenverlust erwartet, aber zu verifizieren).

---

## 4. Rundreise-Anforderung (Pflicht für Abnahme)

Für **jeden** Fall gilt: Datei mit Blocksatz-Formatierung hochladen (bzw. im Editor erzeugen)
→ **unverändert** exportieren → erneut importieren → die Blocksatz-Ausrichtung ist inhaltlich
exakt erhalten (an derselben Textstelle, kein Verlust, keine fälschliche zusätzliche
Blocksatz-Zuweisung an anderer Stelle). Es sind **echte** Fixtures mit tatsächlichem Blocksatz
zu verwenden (siehe Abschnitt 0.1) — nicht die früher fälschlich benannten Nicht-Blocksatz-Dateien.

### 4.1 DOCX
1. Einfache DOCX-Datei mit einem Absatz im Blocksatz (`<w:jc w:val="both"/>`) importieren → im
   Editor sichtbar im Blocksatz → unverändert als DOCX exportieren → erneut importieren → Absatz
   weiterhin im Blocksatz, übrige Absätze weiterhin nicht.
2. Im Editor neuen Text eingeben (mehrere Sätze, damit Blocksatz sichtbar wirkt), mit
   Toolbar-Button „Blocksatz" formatieren, als DOCX exportieren → mit einem **unabhängigen**
   Parser (z. B. python-docx oder direktes Parsen von `word/document.xml`) verifizieren, dass
   exakt `<w:jc w:val="both"/>` im `w:pPr` des betroffenen Absatzes steht.
3. Mehrere aufeinanderfolgende Absätze markieren, Blocksatz anwenden (**abhängig vom Ausgang von
   Testfall 5.1** — falls 2.2 zutrifft, erst nach dessen Behebung sinnvoll) → Rundreise erhält
   Blocksatz auf **allen** markierten Absätzen, nicht nur dem ersten.
4. Blocksatz + Fett + Schriftfarbe gleichzeitig auf denselben Absatz/Textlauf → Rundreise erhält
   alle Eigenschaften gemeinsam.
5. Überschrift (Ebene 1–6) im Blocksatz → Rundreise erhält Überschriften-Level **und**
   Blocksatz-Ausrichtung gemeinsam (`w:pStyle` **und** `w:jc` im selben `w:pPr`). (Anmerkung:
   der bestehende Heading-Unit-Test deckt nur `center` ab, nicht `justify` — hier zu ergänzen.)
6. Blocksatz-Absatz innerhalb einer Tabellenzelle → Rundreise erhält die Ausrichtung
   zellenspezifisch, andere Zellen unberührt.
7. Blocksatz-Absatz mit einem Zeilenumbruch (`hard_break`) → Ausrichtung gilt weiterhin für den
   gesamten Absatz über den Umbruch hinweg.
8. Cross-Format: ODT mit Blocksatz-Absatz importieren → als DOCX exportieren → Blocksatz bleibt
   erhalten (`<w:jc w:val="both"/>` wird aus dem internen `align: 'justify'` erzeugt).
9. **Reale Fremddatei mit echtem Blocksatz** (`w:jc val="both"`), z. B. `Bug51170.docx`,
   `bug59058.docx` oder `56392.docx` — verifiziert enthalten `<w:jc w:val="both"/>` — importieren,
   unverändert exportieren, erneut importieren → Ausrichtung an jeder ursprünglich
   blocksatz-formatierten Stelle erhalten. *(Ersetzt die frühere, falsche Nennung von
   `bug-paragraph-alignment.docx`, das keinen Blocksatz enthält.)*
10. Absatz, dessen Blocksatz **nur** über eine geerbte Formatvorlage gesetzt ist (Grenzfall 3.10,
    Muster real belegt durch `bug-paragraph-alignment.docx` mit `center`) → Rundreise muss
    mindestens den direkt gesetzten Wert erhalten; Style-Vererbung ist nicht zwingend Teil dieser
    Anforderung, aber das tatsächliche Verhalten (Verlust der nur style-seitigen Ausrichtung) ist
    zu dokumentieren, nicht stillschweigend hinzunehmen.

### 4.2 ODT
1. Einfache ODT-Datei mit einem Absatz im Blocksatz (`fo:text-align="justify"` in der
   referenzierten `style:style`) importieren → im Editor sichtbar im Blocksatz → unverändert als
   ODT exportieren → erneut importieren → Absatz weiterhin im Blocksatz.
2. Im Editor neuen Text eingeben, „Blocksatz" formatieren, als ODT exportieren →
   `content.xml`/`styles.xml` enthält eine `style:style style:family="paragraph"` mit
   `fo:text-align="justify"` (Stilname `Ppara-justify`, `styleRegistry.ts:61-66`), referenziert
   über `text:style-name` auf dem betroffenen `text:p`.
3. Zwei unterschiedliche Absätze, beide im Blocksatz → beide referenzieren nach Rundreise
   denselben (oder einen inhaltlich gleichwertigen) Blocksatz-Stil, nicht zwei widersprüchliche
   Definitionen.
4. Mehrere aufeinanderfolgende Absätze markieren, Blocksatz anwenden (**abhängig von Testfall
   5.1**, siehe 4.1.3) → Rundreise erhält Blocksatz auf allen markierten Absätzen.
5. Überschrift im Blocksatz → Rundreise erhält Level **und** Ausrichtung gemeinsam
   (`headingStyleName(level, 'justify')`, `styleRegistry.ts:80-93`).
6. Blocksatz-Absatz innerhalb einer Tabellenzelle → Rundreise erhält die Ausrichtung
   zellenspezifisch.
7. Cross-Format: DOCX mit Blocksatz-Absatz importieren → als ODT exportieren → Blocksatz bleibt
   erhalten.
8. **Reale Fremddatei mit echtem Blocksatz** (`fo:text-align="justify"`), z. B.
   `feature_attributes_paragraph_MSO2013.odt` (verifiziert: enthält `justify` **und** `center`
   **und** `end` in derselben Datei), `Seasonal_Fruits2_en.odt` oder `ListRoundtrip.odt`
   importieren → die justierten Absätze bleiben nach Rundreise erhalten; mindestens kein
   Textverlust. Zusätzlich: der in derselben Datei enthaltene `end`-Absatz belegt Grenzfall 3.8
   im Rundreise-Kontext. *(Ersetzt die frühere, falsche Nennung von `tabelleAlignMargin.odt`,
   das keine Absatzausrichtung enthält.)*

### 4.3 Doppelte Rundreise / Cross-Format hin und zurück
1. DOCX mit Blocksatz-Absatz → Editor → Export als ODT → erneuter Import → Export zurück als DOCX
   → Blocksatz nach zwei Formatkonvertierungen weiterhin an exakt derselben Textstelle.
2. Dieselbe Prüfung mit Startpunkt ODT.
3. Dokument mit **allen vier** Ausrichtungen auf unterschiedlichen Absätzen
   (links/zentriert/rechts/Blocksatz) → doppelte Rundreise erhält für jeden Absatz exakt seine
   ursprüngliche Ausrichtung, keine Vermischung zwischen Absätzen.

---

## 5. Testfälle für die Verifikation (E2E, echte Bedienung im Browser)

Bereits vorhandene, laut Auftrag **nicht als vertrauenswürdig geltende** Tests:
- `src/formats/docx/__tests__/roundtrip.test.ts:54-59` „preserves justify alignment"
  — Unit-Test, **Einzelabsatz**, konstruierte ProseMirror-JSON-Daten über den eigenen
  Reader/Writer, keine echte Bedienung.
- `src/formats/odt/__tests__/roundtrip.test.ts` analog.
- `external-fixtures.test.ts` (nur „importiert ohne Absturz", keine Ausrichtungsprüfung).
- `tests/e2e/roundtrip-fidelity.spec.ts` „Kriterium 4" — **einziger bereits vorhandener
  E2E-Test**, der überhaupt echte Browser-Bedienung nutzt; prüft aber nur `center` an einem
  vorkonstruierten Absatz (Fixture-Import, kein Button-Klick), nie `justify`/Blocksatz und
  nie eine Mehrfachabsatz-Selektion (siehe Abschnitt 0). Deckt für dieses Feature also nur
  „Blocksatz-Wert überlebt Rundreise, falls er schon vor dem Import gesetzt war" **nicht**
  ab — dafür wäre `justify` statt `center` im Fixture nötig.

Zusätzlich zu schreibende Testfälle — **Testfall 1 hat oberste Priorität**, da von seinem
Ausgang abhängt, ob die übrigen Mehrfachabsatz-Tests überhaupt durchführbar sind:

1. **Kernverdacht Absturz (2.2):** Mindestens drei Absätze anlegen, über alle drei selektieren
   (sowie separat per Strg+A), „Blocksatz" klicken → erwartet: alle drei im Blocksatz, **kein**
   unbehandelter Fehler in der Browser-Konsole (mit derselben Playwright-`errors`-Fixture wie
   in `tests/e2e/roundtrip-fidelity.spec.ts:135`, `expect(errors, errors.join('\n')).toEqual([])`
   — dort aber nur für den Absturzfreiheits-Nachweis der Rundreise genutzt, nicht für
   Mehrfachabsatz-Formatierung), Undo stellt den Zustand aller drei in **einem**
   Schritt wieder her. Bei Abweichung: exaktes Fehlerbild (welche Absätze geändert, welche
   Konsolenfehler) dokumentieren.
2. Toolbar-Button „Blocksatz" per echtem Playwright-Klick (nicht nur Command-Aufruf) auf einen
   einzelnen Absatz → sichtbar `text-align: justify` im DOM, `aria-pressed` wechselt auf `true`.
3. Cursor ohne Selektion in einem Absatz, „Blocksatz" → gesamter umschließender Absatz justiert.
4. „Links"/„Zentriert"/„Rechts" auf einen justierten Absatz → Blocksatz wird korrekt durch die
   neue Ausrichtung ersetzt (nie zwei gleichzeitig aktiv).
5. Formatvorlage von „Standard" zu „Überschrift 1" wechseln, während der Absatz im Blocksatz
   steht → Ergebnis (verliert Blocksatz ja/nein) dokumentieren und mit 2.6 abgleichen.
6. **Wirkungsbereich (2.3):** 3×3-Tabelle, nur die mittlere Spalte über zwei Zeilen markieren,
   „Blocksatz" anwenden → nur die markierten Zellen justiert, die dazwischenliegende nicht
   markierte Zelle **unverändert** (Grenzfall 3.4) — kritischer Test.
7. Blocksatz auf einen einzelnen Listenpunkt und auf eine einzelne Tabellenzelle → funktioniert
   wie auf einen normalen Absatz; bei der Liste bleibt das Aufzählungszeichen an seiner Position.
8. Blocksatz auf eine Selektion aus Text und Bild → kein Absturz, nur Textblöcke betroffen.
9. Blocksatz auf eine Selektion, die **ausschließlich** ein Bild markiert (`NodeSelection`) →
   Klick bewirkt sichtbar nichts, kein Fehler (Grenzfall 3.6).
10. Einfügen von extern kopiertem HTML mit `style="text-align: justify"` → wird als Blocksatz
    erkannt (2.8).
11. Einfügen von extern kopiertem HTML mit klassenbasierter (nicht inline) Blocksatz-Formatierung
    → erwartetes Fallback (vermutlich Verlust) nachweisen und dokumentieren (Grenzfall 3.7).
12. Undo/Redo direkt nach Blocksatz auf einen einzelnen Absatz; separat: Undo-Verhalten bei
    wiederholtem Klick auf bereits justierten Absatz (2.5/Grenzfall 3.11).
13. Vollständiger Rundreisetest je Format (4.1/4.2) über echten Datei-Upload (`filechooser`) und
    echten Download-Abfangmechanismus (`page.waitForEvent('download')`), nicht nur über intern
    aufgerufene Reader/Writer.
14. Cross-Format-Rundreise (4.3) einmal DOCX→ODT→DOCX, einmal ODT→DOCX→ODT, mit allen vier
    Ausrichtungen gemeinsam in einem Dokument.
15. Export nach DOCX bzw. ODT gegen einen **vom eigenen Reader unabhängigen** Parser validieren
    (`<w:jc w:val="both"/>` bzw. `fo:text-align="justify"`), damit sich Schreib- und Lesefehler
    nicht gegenseitig „unsichtbar" ausgleichen (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19).
16. Screenreader-Stichprobe (NVDA oder VoiceOver) auf den Blocksatz-Button → welcher Name wird
    tatsächlich angekündigt (Bedienelement Nr. 4)?
17. Import der **korrekten** Fixtures mit gezielter Prüfung der resultierenden `align`-Attribute:
    - Blocksatz erwartet: `Bug51170.docx`/`bug59058.docx` (DOCX), `feature_attributes_paragraph_MSO2013.odt`
      (ODT) → betroffene Absätze müssen `align: 'justify'` ergeben.
    - `start`/`end` erwartet: `rtl.docx`, `table-alignment.docx`, `table-indent.docx` (DOCX),
      `feature_attributes_paragraph_MSO2013.odt` (`end`, ODT) → tatsächliches Verhalten (Fallback
      auf links, Button-Zustand) dokumentieren (Grenzfälle 3.8/3.9).
    - Style-Vererbung: `bug-paragraph-alignment.docx` → Absatz 1 (nur Style-`center`) wird
      derzeit als `left` gelesen, Absatz 2 (direktes `left`) korrekt; beides mit Test einfrieren
      (Grenzfall 3.10). **`TestTableCellAlign.docx` und `tabelleAlignMargin.odt` sind hierfür
      ungeeignet** (nur vertikale Zellausrichtung bzw. Tabellenposition, keine Absatzausrichtung)
      und werden ausdrücklich nicht mehr als Ausrichtungs-Fixtures verwendet.
18. Regressionstest analog `selection-regression.spec.ts`, aber mit „Blocksatz" als auslösendem
    Formatierungsschritt (Grenzfall 3.12).

---

## 6. Abnahmekriterien (Definition of Done)

Der Status „vorhanden" für „Ausrichtung Blocksatz" darf erst dann wieder als vertrauenswürdig
gelten, wenn:

1. Der Kernverdacht aus 2.2 (Mehrfachabsatz-Selektion wirft eine unbehandelte Exception und
   justiert nur den ersten Block) im echten Browser nachgestellt und entweder widerlegt oder
   behoben wurde — inklusive eines dauerhaften Regressionstests, der exakt dieses Szenario
   abdeckt (Testfall 5.1).
2. Der zweite, davon unabhängige Verdacht aus 2.3 (nicht-rechteckige Zellauswahl justiert
   dazwischenliegende, nicht markierte Zellen mit) geprüft und entweder widerlegt oder behoben
   ist (Testfall 5.6) — nicht mit dem Absturz aus 2.2 vermengt, sondern eigenständig belegt.
3. Alle übrigen Testfälle aus Abschnitt 5 tatsächlich ausgeführt wurden (echte
   Browser-Interaktion, nicht nur Unit-/Command-Ebene) und grün sind.
4. Alle Rundreise-Anforderungen aus Abschnitt 4 (DOCX, ODT, Cross-Format) durch einen
   **unabhängigen** Parser bzw. erneuten Import bestätigt sind — insbesondere die
   Mehrfachabsatz-Rundreise (4.1.3/4.2.4) und die Verwendung **echter** Blocksatz-Fixtures
   (Abschnitt 0.1) statt der früher fälschlich benannten Dateien.
5. Alle Grenzfälle aus Abschnitt 3 einzeln geprüft und deren tatsächliches Verhalten
   dokumentiert ist.
6. Die offenen Entscheidungen explizit getroffen und hier nachgetragen wurden:
   Toggle-/Undo-Verhalten bei wiederholtem Klick (2.5), Zurücksetzen der Ausrichtung beim
   Formatvorlagenwechsel (2.6, **konsistent** mit `absatzformat-dropdown-req.md`),
   Anzeigeverhalten bei gemischter Selektion (2.4), und die Tastenkombinations-Frage inkl. der
   Browser-Reservierung von Strg+J (Bedienelement Nr. 2) — jeweils „bewusst so" oder „wird
   geändert", nie stillschweigend offen.
7. Das `aria-label`-Defizit und das Icon-Rendering-Risiko (Bedienelemente Nr. 3/4) bewertet
   wurden (bewusst beibehalten oder behoben).

Erst nach Erfüllung aller sieben Punkte darf der Backlog-Status von „vorhanden (nicht
vertrauenswürdig)" auf „verifiziert" geändert werden.
