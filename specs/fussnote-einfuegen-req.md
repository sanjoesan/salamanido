# Anforderungen: „Fußnote einfügen“ (DOCX & ODT)

Status: **fehlt — gilt bis zum vollständigen Nachweis als nicht vertrauenswürdig.** Diese
Datei ist die verbindliche Anforderungsgrundlage für die Verifikation des Features
„Fußnote einfügen“ aus `specs/FEATURE-BACKLOG.md` (Slug `fussnote-einfuegen`, Abschnitt 5.2
„Fußnoten & Endnoten“, **Zeile 319**, Priorität 1, Beschreibung wörtlich: „Fügt eine
Referenzmarke im Text mit Erläuterung am Seitenende ein.“). Sie konkretisiert
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 11 (Fußnoten), Abschnitt 17 Zeile 363 (Toolbar-Soll)
und die Testmatrix Abschnitt 21 auf die für dieses eine Feature nötige Detailtiefe: jedes
Bedienelement, jedes Detailverhalten, jeder Grenzfall und die Rundreise-Pflicht (DOCX
**und** ODT — Datei hochladen bzw. im Editor erzeugen → unverändert exportieren → erneut
importieren → Ergebnis entspricht inhaltlich dem Original).

Architektur-Grundprinzip wie im Hauptdokument: DOCX und ODT teilen sich einen gemeinsamen
internen ProseMirror-Editor. Jedes Verhalten unten muss für **beide** Formate gelten, beim
Import einer bestehenden Datei **und** beim Export eines im Editor erzeugten Elements.

**Ausdrücklich außerhalb des Geltungsbereichs** (eigene Backlog-Einträge, alle Status
„fehlt“): `endnote-einfuegen` (Zeile 320, Prio 2 — Erläuterung am Dokumentende statt am
Seitenende), `fussnote-navigation` (Zeile 321, Prio 4 — Schnellsprung zwischen Fußnoten),
`fussnote-zu-endnote` (Zeile 322, Prio 4 — globale Umwandlung), `querverweis-referenzen`
(Zeile 332, Prio 4 — aktualisierbarer Querverweis auf eine Fußnote). Diese Datei berührt
sie nur dort, wo sie unmittelbar beeinflussen, ob eine frisch eingefügte Fußnote nutzbar
ist bzw. real vorkommende Fremddateien beide Arten mischen (Grenzfall 4.18).

---

## 0. Verifikationshinweis — was gegenüber dem vorigen Entwurf korrigiert wurde

**Diese Datei wurde am 2026-07-04 vollständig gegen den aktuellen Quellcodestand neu
verifiziert** (Vorgabe: eine bereits existierende Anforderungsdatei kritisch prüfen und
verbessern, statt Schwächen zu übernehmen). Der vorige Entwurf war gegen einen **älteren**
Codestand geschrieben und an mehreren zentralen Punkten überholt oder schlicht falsch.
Konkret korrigiert:

1. **ODT-Import verliert eine Fußnote NICHT ersatzlos — die Kernaussage des vorigen
   Entwurfs ist falsch.** Der frühere Text behauptete, ein `<text:note>` „verschwindet beim
   Import ersatzlos, inklusive des kompletten Fußnotentexts“. Tatsächlich besitzt
   `decodeInline`s `walk()` in `src/formats/odt/reader.ts` (Zeile 138–168) einen
   **Catch-all-`else`-Zweig** (Zeile 160–167), dessen Kommentar (Zeile 163) *ausdrücklich*
   „a footnote’s `text:note`“ nennt und in **jedes** sonst nicht interpretierte Inline-
   Element hineinsteigt. Folge: Beim Import einer ODT-Fußnote werden sowohl die
   Zitatnummer (`<text:note-citation>`) als auch der komplette Fußnotentext
   (`<text:note-body>`) **als Fließtext in den Wirt-Absatz eingemischt** — kein Datenverlust,
   sondern **Fehlplatzierung/Verstümmelung** (der Fußnotentext landet mitten im Haupttext an
   der Zitatstelle). Das ist ein anderes, für Tests konkret nachprüfbares Fehlerbild als das
   im vorigen Entwurf behauptete. Die eigentliche Aufgabe ist deshalb, dieses
   „Durchreichen“ durch echte `text:note`-Struktur zu **ersetzen**, nicht einen totalen
   Verlust zu verhindern.
2. **DOCX-Import ist der wirkliche Totalverlust-Fall — präzisiert.** `<w:footnoteReference>`
   liegt als Kind eines `<w:r>` und wird in `decodeRunElement` (`docx/reader.ts` Zeile
   170–184) nicht erkannt (dort nur `w:t`, `w:br`, `w:drawing`/`w:pict`) → Marke verworfen;
   der Fußnotentext liegt im Part `word/footnotes.xml`, den `readDocx` (Zeile 487–555)
   **gar nicht öffnet** → Text vollständig und lautlos verloren. Das ist ein direkter
   Verstoß gegen `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18 („kein stiller Datenverlust“).
3. **Die ID-Vergabe-Warnung ist überholt.** Der vorige Entwurf (Grenzfall 15) warnte vor
   `Math.random()`-Kollisionen unter Verweis auf `odt/writer.ts:109`. Dort steht heute kein
   `Math.random()` mehr, sondern die deterministische `TableNameSequence` (`odt/writer.ts`
   Zeile 54–60). Diese Klasse ist das **etablierte Muster**, dem die Fußnoten-ID-Vergabe
   folgen muss (fortlaufender Zähler, dokumentweit eindeutig), nicht ein zu vermeidender
   Zufallszahlen-Ansatz.
4. **Das Projekt hat inzwischen ein `unsupported_block`-Fallbackmuster** (`schema.ts` Zeile
   92–113; Reader/Writer-Behandlung in `docx/reader.ts` 270–273, `docx/writer.ts` 145–152,
   `odt/reader.ts` 232–248, `odt/writer.ts` 184–191). Der vorige Entwurf kannte es nicht. Es
   ist der projektweit etablierte Weg, „nicht voll unterstützten“ Inhalt sichtbar zu
   erhalten, statt ihn zu verwerfen (§18), und kommt als **Zwischen-Repräsentation** für
   importierten Fußnotentext in Frage, falls die volle Fußnoten-Architektur (Abschnitt 3.3)
   zunächst zurückgestellt wird.
5. **Alle Code-Referenzen des vorigen Entwurfs waren zeilenmäßig veraltet** (z. B.
   `insertTable` tatsächlich `commands.ts` Zeile **92–102**, nicht 76–86; Tabellen-Nodes
   `schema.ts` Zeile **154**, nicht 106; Marks `schema.ts` Zeile **157–196**, nicht 109–148;
   Toolbar-Ende Zeile **277–294**, nicht 228–244). Alle Referenzen unten sind neu geprüft
   und zusätzlich mit **Symbolnamen** versehen, gegen die bei Zeilendrift nachgeschlagen
   werden kann.
6. **Die reale-Fixture-Frage ist beantwortet, nicht mehr offen.** Der vorige Entwurf verwies
   vage auf „ein vertrauenswürdiges Open-Source-Testkorpus, z. B. python-docx“. Ein Scan
   **aller** 127 DOCX- und 202 ODT-Fixtures unter `tests/fixtures/external/` (per `jszip`,
   Skript im Scratchpad ausgeführt) liefert konkrete, benannte Fußnoten-Dateien, die
   **bereits im Repo liegen** (Apache-POI- bzw. odftoolkit-Korpus, permissiv lizenziert,
   siehe `tests/fixtures/external/README.md`) — siehe Abschnitt 5. Es muss **keine**
   zusätzliche Datei beschafft werden.

**Unabhängige Re-Verifikation am 2026-07-05.** Alle Code-Fundstellen aus Abschnitt 1 wurden
erneut gegen den aktuellen Stand gelesen (Catch-all-`else` `odt/reader.ts` 160–167;
`decodeRunElement` `docx/reader.ts` 170–184 ohne `w:footnoteReference`; `hard_break`/`image`/
`unsupported_block` `schema.ts` 42–113; `insertImage`/`insertHardBreak`/`insertTable`
`commands.ts` 66–102; `TableNameSequence` `odt/writer.ts` 54–60) — **alle bestätigt.** Die in
den Abschnitten 4/5 genannten Fußnotenzahlen wurden **einzeln per `jszip` gegen die realen
Fixture-Bytes nachgezählt** und stimmen exakt: `footnotes.docx` = 1 (`<w:footnoteReference>`
**und** `<w:footnote>`-Body), `bug65649.docx` = 6, `table_footnotes.docx` = 1 (die Referenz
liegt **nachweislich innerhalb** eines `<w:tbl>` → Grenzfall 4.9 belegt), `Bug54849.docx` =
1 Fußnote + 1 Endnote, `footnote.odt`/`DUMMY.odt`/`evilDoc.odt` = je 1 Fußnote + 1 Endnote,
`HeaderFooter.odt` = 1 Fußnote (zzgl. Kopf/Fußzeile), `excelfileformat.odt` = **183**
Fußnoten. **Zusätzlich verifiziert:** `endnotes.docx` (0 Fußnoten, 1 Endnote) und
`boilerplate.odt` (0 Fußnoten, 1 Endnote) sind **reine Endnoten-Fixtures** — damit die
schärfste Negativkontrolle für Grenzfall 4.18 (siehe dort). Diese Datei ist damit als
Anforderungsgrundlage vertrauenswürdig; der Backlog-Status „fehlt“ betrifft die
**Implementierung**, nicht die Belastbarkeit dieser Spezifikation.

**Zweiter, unabhängiger Verifikationsdurchgang (2026-07-05, eigenes `jszip`-Skript gegen
die realen Fixture-Bytes ausgeführt, nicht aus dem vorigen Durchgang übernommen).** Alle
oben genannten Fußnoten-/Endnotenzahlen wurden **erneut und ergebnisgleich** nachgezählt
(`footnotes.docx`=1, `bug65649.docx`=6, `table_footnotes.docx`=1, `Bug54849.docx`=1+1,
`endnotes.docx`=0+1, `footnote.odt`/`DUMMY.odt`/`evilDoc.odt`=je 1+1, `HeaderFooter.odt`=1
Fußnote **und** per Byte-Check bestätigt vorhandenem `<style:header>`/`<style:footer>` in
`styles.xml`, `excelfileformat.odt`=183, `boilerplate.odt`=0+1); die Referenz in
`table_footnotes.docx` liegt per direkter Offset-Prüfung (`<w:footnoteReference>` liegt
hinter einem geöffneten, noch nicht geschlossenen `<w:tbl>`) nachweislich innerhalb der
Tabelle. Zusätzlich wurden dabei **zwei weitere, bisher nicht benannte Lücken** gefunden und
unten eingearbeitet (nicht nur bestätigt, sondern **neu**, gegenüber dem vorigen Durchgang):

1. **`text:note-class` wird beim ODT-Import nirgends ausgewertet.** Der Catch-all-`else` in
   `odt/reader.ts`s `walk()` (Zeile 160–167) behandelt `text:note` unabhängig vom Attribut
   `text:note-class="footnote"` **oder** `"endnote"` identisch (steigt in beide gleichermaßen
   ab). Die reale Unterscheidung Fußnote/Endnote in Grenzfall 4.18 ist also nicht nur ein
   Rundreise-Risiko, sondern **im heutigen Code buchstäblich nicht vorhanden** — bei der
   Umsetzung muss `decodeInline`/`walk` `text:note-class` **explizit** abfragen, sonst landet
   eine Endnote unbemerkt im neuen Fußnoten-Datenmodell. Ergänzt in Menüpunkt 14 und
   Grenzfall 4.18.
2. **DOCX-Endnoten teilen exakt dasselbe Schicksal wie Fußnoten, nicht nur analog.** Eine
   projektweite Suche nach `endnoteReference`/`endnote` in `src/formats/docx/` und
   `src/formats/odt/` liefert **keinen einzigen Treffer** — `<w:endnoteReference>` ist in
   `decodeRunElement` (Zeile 170–184) ebenso unbekannt wie `<w:footnoteReference>` und wird
   über denselben fehlenden `else`-Zweig lautlos verworfen; es gibt keinen separaten,
   bereits vorhandenen Endnoten-Pfad, der versehentlich mit dem neuen Fußnoten-Code
   kollidieren könnte. Wichtig für Grenzfall 4.18: Der Klartext-Fallback für Endnoten
   in `Bug54849.docx` ist ebenfalls **komplett neu zu bauen**, nicht bloß „mindestens zu
   erhalten“.

Diese Datei bleibt damit **auch nach zweifacher unabhängiger Prüfung** eine belastbare
Anforderungsgrundlage.

**Unverändert gültige Kernaussage:** Der Backlog-Status „fehlt“ trifft vollständig zu — es
existiert weder Toolbar-Button noch Command noch Schema-Knoten noch Reader/Writer-Pfad für
echte Fußnoten. Anders als z. B. bei „Zellen verbinden“ gibt es hier **keinen** bereits
getesteten Persistenz-Unterbau; das Feature ist von Grund auf neu zu bauen. Die einzige
vorhandene „Behandlung“ ist das oben beschriebene, unerwünschte ODT-Durchreichen und der
DOCX-Totalverlust — beides ist zu ersetzen.

---

## 1. Kontext & Ist-Zustand (Codeanalyse, gegen aktuellen Stand geprüft)

Da das Feature komplett fehlt, dokumentiert diese Tabelle überwiegend **Abwesenheit** plus
das jeweils analoge, bereits existierende Muster, an dem sich die Umsetzung orientieren
kann.

| Ebene | Fundstelle (Symbol · aktuelle Zeile) | Befund |
|---|---|---|
| Toolbar | `src/formats/shared/editor/Toolbar.tsx` (297 Zeilen) · letzte Elemente „⊞ Tabelle“ (Zeile 277–289) und „🖼 Bild“-`<label>` (Zeile 291–294) | **Kein** Fußnoten-Button/-Menüpunkt. Positiv-Vorbild für einen neuen Button: `MarkButton` (Zeile 55–89) setzt `title` **und** `aria-label` **und** `aria-pressed`. Negativ-Vorbild: `AlignButton` (Zeile 91–111) setzt nur `title`. SVG-Icon-Vorbild statt Emoji: `ScissorsIcon` (Zeile 33–53). |
| Command | `src/formats/shared/editor/commands.ts` (166 Zeilen) | **Kein** `insertFootnote`. Etabliertes Einfüge-Muster: `insertImage` (Zeile 66–74), `insertHardBreak` (Zeile 83–90), `insertTable` (Zeile 92–102) — alle via `state.tr.replaceSelectionWith(node)` bzw. `dispatch`. |
| Schema (Referenzmarke) | `src/formats/shared/schema.ts` · `nodes` (ab Zeile 13), `wordSchema` (Zeile 198) | Knoten sind nur `doc`, `paragraph`, `heading`, `text`, `hard_break`, `image`, `unsupported_block` (Zeile 92–113), `bullet_list`, `ordered_list`, `list_item` sowie `tableNodes(...)` (Zeile 154). **Kein** Fußnoten-Knoten. Leaf-Inline-Vorbild für eine atomare Referenzmarke: `hard_break` (`inline: true`, `selectable: false`, `leafText`, Zeile 42–56); atomarer Block-Vorbild: `image` (Zeile 58–85). Marks (Zeile 157–196) enthalten nichts Fußnoten-Bezogenes. |
| Datenmodell (Fußnotentext) | `src/formats/shared/documentModel.ts` · `WordDocumentContent` (Zeile 3–8) | Kennt nur `body`, `header`, `footer`, `meta.title`. **Kein** Feld für Fußnoteninhalte. Etabliertes Muster für „Inhalt außerhalb des Haupttextflusses“ sind `header`/`footer` als eigene, optionale `ProseMirrorJSON`-Dokumente — ein analoges Feld (z. B. `footnotes: Record<string, ProseMirrorJSON>`, indiziert nach stabiler Fußnoten-ID) liegt nahe, ist aber **nicht vorhanden**. |
| Editor-Shell / Seitenende | `src/formats/shared/editor/WordEditor.tsx` (177 Zeilen) · `body`-Seed (Zeile 71), `containerRef`-Render (Zeile 172), `onChange` nur `body` (Zeile 121) | Der Editor rendert **ausschließlich** den Hauptinhalt in **einer** `EditorView`. `doc.header`/`doc.footer` werden weder geseedet noch angezeigt/editierbar gemacht (die Features `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` sind selbst Status „fehlt“). Es gibt keinen editierbaren Bereich „am Seitenende“. Keymap (Zeile 77–99): `Enter`=`splitListItem`, `Shift-Enter`=`insertHardBreak`, `Mod-b/i/u`, `Mod-z/y` — **keine** Fußnoten-Bindung. |
| Paginierung (Seitenende!) | `src/formats/shared/editor/pagination.ts` (116 Zeilen) · `measureAndBuildDecorations` (Zeile 33–63), `createPaginationPlugin` (Zeile 72–105) | Rein **visuell**: misst die Höhe jedes obersten Blocks des **einen** fortlaufenden Dokuments und fügt bei Bedarf ein reines Abstands-Widget (`div.page-break-spacer`, Zeile 49–54) ein. **Keine** Pro-Seite-DOM-Container, **kein** DOM-Begriff „Seitenende“. Der Kommentar (Zeile 8–10) hält ausdrücklich fest, dass echtes Aufteilen innerhalb eines Blocks „ProseMirror’s single-EditorView model doesn’t support“. Die wörtlich geforderte „Erläuterung am Seitenende“ passt **nicht** bruchlos auf dieses Modell — **offene Architekturfrage**, siehe Abschnitt 3.3. |
| DOCX-Import (Marke) | `src/formats/docx/reader.ts` · `decodeRunElement` (Zeile 170–184), `RunLike`-Union (Zeile 118) | Der `<w:r>`-Kind-Loop erkennt nur `w:t` (Zeile 175), `w:br` (177), `w:drawing`/`w:pict` (179). `<w:footnoteReference>` wird **nicht erkannt und verworfen** (auch die sichtbare Nummer). Für einen neuen Run-Typ muss die `RunLike`-Union erweitert werden. |
| DOCX-Import (Text) | `src/formats/docx/reader.ts` · `readDocx` (Zeile 487–555), `collectRuns` (Zeile 194–216) | `readDocx` öffnet `document.xml`, `styles.xml`, `numbering.xml`, Rels, Header/Footer via `sectPr` (Zeile 507–532), `core.xml` — **nie** `word/footnotes.xml`. `collectRuns` steigt in `w:ins`/`w:hyperlink`/`w:smartTag`/`w:sdt`/`w:fldSimple` ab und überspringt `w:del`, hat aber **keinen** Pfad zu Fußnoten. → Fußnotentext beim DOCX-Import **vollständig verloren**. |
| DOCX-Export | `src/formats/docx/writer.ts` · `inlineToRuns` (Zeile 41–67), `blockToDocx` (Zeile 105–156, `default: return ''` Zeile 153–154), `buildContentTypesXml` (Zeile 229–250), `writeDocx` (Zeile 252–318) | Kennt keinen Fußnoten-Node; unbekannte Inline-Nodes fallen in `inlineToRuns` **lautlos** durch, unbekannte Blocks liefern `''`. Kein `word/footnotes.xml`-Part, kein Content-Types-Override dafür. **Template** für die Ergänzung: der Header/Footer-Pfad in `writeDocx` (Zeile 264–273: Part bauen → Relationship `add` → `sectPr`-Referenz) plus die bedingten Overrides (Zeile 238–239). |
| DOCX-Relationships/Styles | `src/formats/docx/relationships.ts` · `RELATIONSHIP_TYPES` (Zeile 34–42); `src/formats/docx/styleDefs.ts` · `HEADING_STYLE_ID`/`headingStylesXml` (Zeile 5–30) | `RELATIONSHIP_TYPES` hat `officeDocument`, `styles`, `numbering`, `header`, `footer`, `image`, `coreProperties` — **kein** `.../relationships/footnotes`. `headingStylesXml` (Normal-Default + Heading1–6) ist das Muster für eine neue `FootnoteReference`-Zeichen- und `FootnoteText`-Absatzformatvorlage. |
| ODT-Import | `src/formats/odt/reader.ts` · `decodeInline`/`walk` (Zeile 138–168), Catch-all `else` (Zeile 160–167) | `walk` behandelt `text:span`/`line-break`/`text:s`/`text:tab`/Redline-Marker; **jedes** andere Inline-Element (Kommentar Zeile 163 nennt „a footnote’s `text:note`“) wird **durchgereicht** → `text:note-citation`- und `text:note-body`-Text landen inline im Wirt-Absatz (Verstümmelung, kein Verlust — siehe Abschnitt 0, Punkt 1). `elementToBlocks` (Zeile 250–324) sieht `text:note` nie, da Fußnoten inline in `text:p` stehen. |
| ODT-Export | `src/formats/odt/writer.ts` · `inlineToOdt` (Zeile 70–83), `blockToOdt` (Zeile 85–195, `default: ''` Zeile 192–193), `buildStylesXml` (Zeile 216–233), `TableNameSequence` (Zeile 54–60) | Kein Fall für einen Fußnoten-Node; keine `<text:note>`/`<text:note-citation>`/`<text:note-body>`-Serialisierung; keine `<text:notes-configuration>` in `styles.xml`. `TableNameSequence` ist das deterministische ID-Muster (siehe Abschnitt 0, Punkt 3). `TextStyleRegistry`/`headingStyleDefs` in `styleRegistry.ts` (Zeile 22–103) ist das Muster für eine Fußnoten-Textformatvorlage. |
| Tests | `tests/e2e/` (21 Spezifikationsdateien), `src/**` | Projektweite Suche nach `footnote`/`Fußnote`/`fussnote`/`text:note` in `src/` liefert **genau einen** Treffer — den Kommentar in `odt/reader.ts:163`. **Kein** Test mit Fußnoten-Bezug in `tests/`. Alle Testfälle aus Abschnitt 7 sind neu zu schreiben. |

**Konsequenz:** Fußnoten sind ein vollständig neu zu bauendes Feature (Schema, Command,
UI, DOCX- und ODT-Reader/Writer). Der Import-Ist-Zustand ist nicht „nichts“, sondern
**aktiv falsch** (ODT verstümmelt inline, DOCX verliert lautlos) und muss ersetzt werden.

---

## 2. Menüpunkte / Bedienelemente (Soll)

| # | Element | Ort / Vorbild | Soll-Verhalten |
|---|---|---|---|
| 1 | Toolbar-Button „Fußnote einfügen“ | neue Gruppe nach „🖼 Bild“ (`Toolbar.tsx` Zeile 291–294) | **Muss neu gebaut werden.** Klick löst `insertFootnote()` an der Cursor-Position aus. **Kein** Dialog nötig (anders als „Tabelle einfügen“ gibt es keine Größenwahl). `title` **und** `aria-label` „Fußnote einfügen“ nach dem `MarkButton`-Muster (Zeile 71–75), **nicht** dem `AlignButton`-Negativbeispiel. |
| 2 | Icon/Beschriftung | derselbe Button; `ScissorsIcon` (Zeile 33–53) | Eindeutig als „Fußnote“ erkennbar, bevorzugt eingebettetes **SVG** oder eindeutiges Textkürzel — **kein** unzuverlässig renderndes Emoji (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1). Muss sich **sichtbar von einem künftigen „Fußzeile bearbeiten“-Button unterscheiden** (Begriffsverwechslung, Abschnitt 3.9). |
| 3 | Command `insertFootnote()` | `commands.ts`, Muster `insertImage`/`insertTable` (Zeile 66–102) | Erzeugt eine neue, **deterministisch eindeutige** Fußnoten-ID (Muster `TableNameSequence`, `odt/writer.ts` 54–60 — **kein** `Math.random`), fügt an der Cursor-/Selektionsposition die Referenzmarke ein und legt einen leeren, editierbaren Fußnotentext-Eintrag für diese ID an — **atomar** (ein Undo-Schritt, Abschnitt 3.10). |
| 4 | Schema-Knoten Referenzmarke (`footnote_reference`) | `schema.ts`, Leaf-Vorbild `hard_break` (Zeile 42–56) | Neuer Inline-Node: `inline: true`, `atom: true` (als Ganzes selektiert/gelöscht, nicht „von innen“ zerreißbar), `selectable: true`, Attribut mindestens `id` (stabil, dokumentweit eindeutig, **unabhängig** von der sichtbaren fortlaufenden Nummer). `toDOM` als hochgestellte Zahl. |
| 5 | Datenmodell-Entscheidung Fußnotentext | `documentModel.ts` (Zeile 3–8), Muster `header`/`footer` | **Zu entscheiden und hier nachzutragen:** eigenes Feld in `WordDocumentContent` (z. B. `footnotes: Record<id, ProseMirrorJSON>`) analog `header`/`footer`, **oder** Attribut direkt am Node. Empfehlung (nicht bindend): eigenes Feld — Fußnotentext kann mehrere Absätze und Formatierung enthalten (Punkt 9), was ein reines Attribut nicht sauber abbildet. |
| 6 | Fortlaufende Nummerierung | berechnetes Anzeige-Derivat, nicht gespeichert | Sichtbare Zahl = Position der Referenz in Lesereihenfolge (oben→unten), bei **jeder** die Reihenfolge ändernden Bearbeitung neu berechnet (Abschnitt 3.2/3.6/3.7). Nie eine im Dokument gespeicherte, von Hand gepflegte Zahl. |
| 7 | Editierbarer Fußnotentext-Bereich | neu; abhängig von Architekturentscheidung 3.3 | Muss editierbar sein und dieselbe Zeichenformatierung wie der Haupttext erlauben (Wiederverwendung der Marks aus `schema.ts` 157–196), analog Kopf-/Fußzeilen-Anforderung `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 Testfall 5. |
| 8 | Löschen einer Fußnote | Entf/Backspace auf die (atomare) Marke | Entfernt Marke **und** zugehörigen Fußnotentext-Eintrag in einem Schritt (kein verwaister Eintrag); nachfolgende Fußnoten werden automatisch neu nummeriert (Abschnitt 3.7). |
| 9 | Klick auf Marke → Sprung zum Fußnotentext | nice-to-have | Aus „Erläuterung am Seitenende“ sinnvoll erwartet, **kein** Abnahme-Blocker. Falls **nicht** umgesetzt: als bewusste Auslassung dokumentieren, kein scheinbar klickbares, wirkungsloses Element (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4). |
| 10 | Tastenkürzel | Keymap `WordEditor.tsx` 77–99 | Kein Blocker; Word nutzt `Strg+Alt+F`, LibreOffice ebenfalls konfigurierbar. Bewusst entscheiden, ob eines ergänzt wird oder der Toolbar-Weg als ausreichend dokumentiert wird — nicht stillschweigend offenlassen. |
| 11 | DOCX-Export-Bausteine | `writer.ts`/`relationships.ts`/`styleDefs.ts` | Neuer Part `word/footnotes.xml` (mit den von Word erwarteten Pflichteinträgen `<w:footnote w:type="separator" w:id="-1"/>` und `<w:footnote w:type="continuationSeparator" w:id="0"/>` plus je Fußnote `<w:footnote w:id="N">`); neuer `RELATIONSHIP_TYPES.footnotes`; Content-Types-Override `/word/footnotes.xml`; im Fließtext `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="N"/></w:r>`. |
| 12 | DOCX-Import-Bausteine | `reader.ts` | `decodeRunElement` erkennt `w:footnoteReference` (liest `w:id`); `readDocx` lädt zusätzlich `word/footnotes.xml`, parst es und ordnet Text über die IDs den Marken zu. |
| 13 | ODT-Export-Bausteine | `writer.ts` | Neuer Fall in `blockToOdt`/`inlineToOdt`: inline `<text:note text:id="..." text:note-class="footnote"><text:note-citation>N</text:note-citation><text:note-body>…</text:note-body></text:note>`; zusätzlich `<text:notes-configuration text:note-class="footnote" style:num-format="1" …/>` in `styles.xml` (`buildStylesXml`). |
| 14 | ODT-Import-Bausteine | `reader.ts` | `walk`/`decodeInline` behandeln `text:note` als **eigenen Sonderfall** (statt Durchreichen, Abschnitt 0 Punkt 1): `text:note-citation` als Nummer, `text:note-body` als eigenständigen, dem Fußnotentext-Modell zugeordneten Inhalt. **Muss zwingend das Attribut `text:note-class` auswerten** (`"footnote"` vs. `"endnote"`) — der heutige Catch-all behandelt beide Werte identisch (Abschnitt 0, zweiter Verifikationsdurchgang, Punkt 1); ohne explizite Fallunterscheidung landet eine Endnote unbemerkt im neuen Fußnoten-Modell. |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Einfügen an der Cursor-Position
- Klick auf „Fußnote einfügen“ fügt an der Cursor-Position bzw. anstelle der Selektion eine
  Referenzmarke ein (kein Dialog).
- Ist Text markiert, wird er durch die Marke **ersetzt** (etabliertes Verhalten „Selektion
  wird durch eingefügtes Element ersetzt“, `replaceSelectionWith`) — als gewolltes,
  dokumentiertes Verhalten zu bestätigen, nicht als unerwarteter Textverlust.
- Direkt nach dem Einfügen steht der Cursor **hinter** der neuen Marke im Fließtext (nicht
  im Fußnotentext-Bereich); Weitertippen setzt den Hauptsatz fort.

### 3.2 Automatische fortlaufende Nummerierung
- Sichtbare Zahl = Position in Lesereihenfolge (1, 2, 3, …), unabhängig von der stabilen ID.
- Neuberechnung bei **jeder** die Reihenfolge ändernden Bearbeitung (Einfügen davor,
  Löschen, Verschieben via Ausschneiden/Einfügen). Die Zahl ist reines Anzeige-Derivat.
- Minimalanforderung: **eine** fortlaufende Nummerierung über das ganze Dokument, beginnend
  bei 1. Zurücksetzen pro Seite/Abschnitt ist kein Blocker, aber als „nicht unterstützt“ zu
  dokumentieren, falls nicht gebaut.

### 3.3 Fußnotentext-Bereich „am Seitenende“ (offene Architekturfrage — vor Umsetzung klären)
- Die Backlog-Beschreibung fordert wörtlich „Erläuterung am Seitenende“. Die aktuelle
  Paginierung (`pagination.ts` 33–105) rendert das gesamte Dokument als **einen**
  fortlaufenden Editor mit rein optischen Abstands-Widgets; es gibt keine Pro-Seite-DOM-
  Container, an die ein physikalisch seitengebundener Fußnotenbereich angehängt werden
  könnte, ohne die Paginierung grundlegend umzubauen (Kommentar `pagination.ts` 8–10:
  single-EditorView-Modell).
- **Zu entscheiden und hier nachzutragen:** (a) Paginierung so erweitern, dass jede
  berechnete Seite einen echten Fußnotenbereich am unteren Rand erhält (großer Umbau, am
  nächsten am Word/LibreOffice-Vorbild), **oder** (b) pragmatisch **ein** gesammelter,
  editierbarer Fußnotenbereich am Ende des Dokuments/der letzten Seite (unabhängig davon,
  auf welcher visuellen Seite die Marke steht).
- **Für den Export ist die visuelle Platzierung irrelevant:** DOCX/ODT speichern nur die
  Zuordnung Referenz-ID → Fußnotentext; die tatsächliche Fuß-der-Seite-Platzierung übernimmt
  Word/LibreOffice beim Öffnen selbst. Lösung (b) ist damit für die Rundreise (Abschnitt 5)
  **ausreichend**, muss aber, falls gewählt, ausdrücklich als visuelle Vereinfachung
  dokumentiert werden — nicht stillschweigend als „erledigt“ behandelt.

### 3.4 Referenzmarke im Fließtext
- Hochgestellte Zahl, ohne umgebenden Text zu zerreißen.
- Atomar (`atom: true`): Pfeiltasten überspringen sie in **einem** Schritt; nicht „von
  innen“ zerreißbar; Umschalt+Pfeil/Maus schließt sie ganz ein (kein halbes Markieren).
- Ein einzelnes Entf/Backspace an der Marke entfernt Marke **und** Fußnotentext (Abschnitt
  3.7), nicht nur ein unsichtbares Zeichen.

### 3.5 Formatierung innerhalb des Fußnotentexts
- Dieselben Zeichenformate wie im Haupttext (`schema.ts` 157–196: Fett, Kursiv,
  Unterstrichen, Durchgestrichen, Farben).
- Mehrere Absätze pro Fußnotentext zulässig (analog Mehrabsatz-Zellen,
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6).
- Bilder/Tabellen im Fußnotentext sind **nicht** Teil dieser Anforderung (Prio-3/4), dürfen
  aber nicht zum Absturz führen, falls versehentlich per Copy-Paste eingefügt (Grenzfall
  4.11).

### 3.6 Zweite Fußnote vor einer bestehenden einfügen
- Neue Fußnote **vor** einer bestehenden → alle betroffenen Marken werden automatisch
  neu nummeriert (neue = 1 bzw. korrekte Position, vormals erste = 2 usw.), konsistent mit
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 11 Testfall 2.
- Die stabile ID der bestehenden Fußnote (und damit ihr Text) bleibt unverändert; nur die
  abgeleitete Anzeigezahl ändert sich.

### 3.7 Fußnote löschen
- Löschen der Marke entfernt automatisch den Fußnotentext-Eintrag — **kein** verwaister
  Eintrag im Modell oder in der Anzeige.
- Nachfolgende Fußnoten rücken sichtbar nach (aus „2, 3, 4“ wird „1, 2, 3“), konsistent mit
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 11 Testfall 3.
- Löschen des **ganzen Absatzes** mit einer Marke (Dreifachklick+Entf, „Alles auswählen“+
  Entf) entfernt die zugehörige Fußnote ebenfalls (Grenzfall 4.4).

### 3.8 Navigation Marke ↔ Fußnotentext
- Nice-to-have (Menüpunkt 9): Klick auf die Marke springt/scrollt zum Fußnotentext; optional
  Rücksprung. Falls nicht umgesetzt: als bewusste Auslassung dokumentieren, kein
  wirkungsloses klickbares Element.

### 3.9 Begriffliche Abgrenzung „Fußnote“ vs. „Fußzeile“
- „Fußnote“ (Referenzmarke + Erläuterung, Gegenstand dieser Datei) und „Fußzeile“
  (wiederkehrender Bereich am unteren Seitenrand, `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 /
  Slug `fusszeile-bearbeiten`) sind leicht verwechselbar und **beide** in der UI noch nicht
  vorhanden. Beim Bau des Buttons (Menüpunkt 1) auf eindeutige Beschriftung/`aria-label`/
  Icon achten — nicht denselben Wortstamm/dasselbe Symbol wie ein künftiger Fußzeilen-Button.
- Kein funktionaler Zusammenhang nötig (eine Fußnote muss nicht in der Fußzeile erscheinen).
  Reale Beleg-Fixture, die beides mischt: `HeaderFooter.odt` (Fußnote **und** Kopf/Fußzeile).

### 3.10 Undo/Redo
- Einfügen (Marke + leerer Fußnotentext) = **ein** atomarer Undo-Schritt; Redo stellt beides
  wieder her.
- Löschen = ein Undo-Schritt, der Marke **und** Fußnotentext wiederherstellt.
- Tippen im Fußnotentext folgt der normalen ProseMirror-History (des Sub-Editors bzw.
  Haupteditors, je nach Architektur 3.3) — konsistent zur dortigen Entscheidung.

---

## 4. Grenzfälle

1. **Einfügen bei aktiver Selektion:** markierter Text wird durch die Marke ersetzt (kein
   Zusammenführen) — als gewolltes Verhalten bestätigen.
2. **Zwei Fußnoten im selben Absatz:** unabhängige, korrekt aufeinanderfolgende Nummern;
   Löschen einer nummeriert die andere korrekt neu.
3. **Fußnote am Dokumentanfang/-ende:** Marke an erster/letzter Stelle, Dokument bleibt
   davor/danach editierbar.
4. **Ganzen Absatz mit Marke löschen** (Dreifachklick+Entf, „Alles auswählen“+Entf):
   zugehöriger Fußnotentext wird ebenfalls entfernt — keine verwaiste Fußnote.
5. **Text mit Marke ausschneiden und woanders einfügen:** Nummerierung passt sich an die
   neue Leseposition an.
6. **Marke kopieren und als Duplikat einfügen:** **Zu klären und nachzutragen** — Word
   erzeugt beim Kopieren einer Fußnotenreferenz eine **neue, unabhängige** Fußnote (eigener,
   ggf. kopierter Text). Aktuell **ungeklärt**; Ergebnis dokumentieren. Keinesfalls dürfen
   zwei Marken unbemerkt denselben Text-Eintrag teilen und beim Löschen der einen den Text
   der anderen mitreißen.
7. **Undo direkt nach Einfügen, dann weiter tippen:** kein Inhaltsverlust an der
   wiederhergestellten Cursor-Position.
8. **Sehr viele Fußnoten (100+):** UI bleibt reaktionsfähig, Neuberechnung der Nummerierung
   blockiert nicht spürbar; Export/Re-Import < 3 s (analog `FEATURE-SPEC-DOCX-ODT.md`
   Abschnitt 1.2). Reale Stress-Fixture vorhanden: `excelfileformat.odt` (**183** Fußnoten).
9. **Fußnote in einer Tabellenzelle:** Zellen erlauben `block+` (`schema.ts` 154) — prüfen,
   ob Marke dort sinnvoll platzierbar ist und der Fußnotentext gemäß 3.3 erscheint;
   mindestens kein Absturz. Reale Fixture: `table_footnotes.docx` (Fußnote in Tabelle).
10. **Fußnote in einem Listenelement:** muss funktionieren, ohne die Liste zu zerstören.
11. **Fußnotentext enthält versehentlich Tabelle/Bild** (Copy-Paste, 3.5): kein Absturz,
    auch wenn offiziell nicht unterstützt. Fallback ggf. via `unsupported_block` (Abschnitt
    0 Punkt 4).
12. **Leerer Fußnotentext:** einfügen, nichts tippen, exportieren → valides, wenn auch leeres
    `<w:footnote>` bzw. `<text:note-body>` (kein fehlerhaftes XML, kein Crash). Für ODT
    konkret: `<text:note-body>` muss dabei mindestens einen leeren `<text:p/>`-Kindknoten
    enthalten (analog dem leeren Dokument, `emptyDocJSON()` in `documentModel.ts` Zeile
    10–12, das ebenfalls nie ganz ohne Absatz auskommt) — ein wirklich leeres
    `<text:note-body></text:note-body>` ohne jeden Absatz ist von manchen ODF-Validatoren/
    LibreOffice-Versionen als inhaltlich unvollständig zurückgewiesen worden; „leer“ heißt
    hier „ein Absatz ohne Text“, nicht „kein Absatz“.
13. **Fußnotentext mit mehreren Absätzen und `hard_break`:** bleibt bei Rundreise erhalten
    (analog `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 15).
14. **Import mit defekter/inkonsistenter Referenz** (z. B. `<w:footnoteReference w:id="7"/>`
    ohne passenden `<w:footnote w:id="7">`, oder `<text:note>` ohne `<text:note-body>`):
    kein Absturz; sinnvoller Fallback (Referenz ignorieren oder Platzhalter „[fehlender
    Fußnotentext]“).
15. **Deterministische ID-Vergabe:** neue Fußnoten-IDs über einen fortlaufenden Zähler
    (Muster `TableNameSequence`, `odt/writer.ts` 54–60), **nicht** `Math.random` — damit
    zwei Exporte desselben Dokuments byte-/inhaltsgleich bleiben
    (`speichern-exportieren-qa.md` Testfall 11) und IDs nicht kollidieren.
16. **Mehrfaches schnelles Klicken auf den Button:** kein doppeltes Einfügen durch
    Event-Bubbling/doppelte Handler.
17. **Fußnote in Kopf-/Fußzeile** (sobald `kopfzeile-/fusszeile-bearbeiten` existieren): in
    Word/LibreOffice nicht vorgesehen — hier mindestens kein Absturz; im Zweifel Button in
    diesem Kontext deaktivieren/ausblenden.
18. **Rundreise einer Datei mit Fußnoten UND Endnoten:** reale Fremddateien haben oft beides
    (`Bug54849.docx`: 1 Fußnote + 1 Endnote; `footnote.odt`, `DUMMY.odt`, `evilDoc.odt`: je
    1+1). Fußnoten müssen korrekt erhalten bleiben; Endnoten dürfen **nicht** fälschlich als
    Fußnoten interpretiert werden und mindestens als Klartext-Fallback erhalten bleiben
    (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18). Endnoten-Vollunterstützung ist eigenes
    Backlog-Item (`endnote-einfuegen`). **Schärfste Negativkontrolle** (2026-07-05 per `jszip`
    nachgezählt, im zweiten Verifikationsdurchgang unabhängig reproduziert): `endnotes.docx`
    (DOCX, **0 Fußnoten**, 1 Endnote) und `boilerplate.odt` (ODT, **0 Fußnoten**, 1 Endnote)
    enthalten überhaupt keine Fußnote — nach Import/Rundreise darf hier **keine** Fußnote
    entstehen und keine hochgestellte Marke erscheinen; jede auftauchende „Fußnote 1“ ist ein
    bewiesener Fehlklassifizierungs-Defekt. **Konkrete Ursache, warum diese Verwechslung ohne
    Gegenmaßnahme tatsächlich passieren würde** (Abschnitt 0, zweiter Verifikationsdurchgang):
    für ODT prüft der heutige Catch-all in `walk()` das Attribut `text:note-class` überhaupt
    nicht — `"footnote"` und `"endnote"` durchlaufen exakt denselben Code; für DOCX gibt es
    schlicht **keinen** vorhandenen Endnoten-Pfad (`endnoteReference` kommt im gesamten
    `src/formats/` nirgends vor) — der Klartext-Fallback für Endnoten ist komplett neu zu
    bauen, nicht bereits vorhanden und nur „zu erhalten“.
19. **Ist-Zustand-Regression absichern:** Vor dem Bau festhalten, dass eine importierte
    ODT-Fußnote heute **inline verstümmelt** und eine DOCX-Fußnote **verloren** wird
    (Abschnitt 0). Nach dem Bau muss ein Test beweisen, dass genau dieses Fehlverhalten durch
    echte `text:note`/`footnotes.xml`-Struktur ersetzt wurde.
20. **Touch-Viewport (Mobile/Tablet):** Bislang **nicht** in dieser Datei berücksichtigt,
    obwohl für andere, bereits verifizierte Features (`kopieren-req.md` Abschnitt 3 Zeile 98,
    `einfuegen-req.md` Abschnitt 1 Zeile 155) inzwischen fester Bestandteil der Anforderung
    ist. `playwright.config.ts` definiert `Mobile` (`devices['Pixel 7']`, Chromium,
    Clipboard-Rechte gesetzt) und `Tablet` (`devices['iPad Mini']`, WebKit, **ohne**
    Clipboard-Rechte). Tippen auf den neuen Toolbar-Button unter Touch-Emulation muss die
    Fußnote genauso einfügen wie ein Maus-Klick; der Fußnotentext-Bereich muss mit dem
    virtuellen Keyboard erreichbar/editierbar bleiben. Native betriebssystemeigene
    Kontextmenü-Interaktionen (falls für Menüpunkt 9 „Sprung zum Fußnotentext“ relevant) sind
    wie bei den genannten Schwesterdateien eine **dokumentierte Automatisierungsgrenze**,
    keine stillschweigende Lücke.

---

## 5. Rundreise-Anforderung (DOCX **und** ODT — Pflichtbestandteil)

Grundprinzip: „Datei A hochladen → unverändert exportieren → Ergebnis entspricht inhaltlich
A.“ Für **jeden** Fall gilt: Anzahl, Reihenfolge, Nummerierung und Textinhalt jeder Fußnote
bleiben inhaltlich exakt erhalten. Alle genannten Fixtures liegen **bereits** unter
`tests/fixtures/external/` (Apache-POI- bzw. odftoolkit-Korpus, permissiv, siehe README) —
nichts muss beschafft werden.

### 5.1 DOCX
1. **Eigene Bearbeitung:** über den neuen Button eine Fußnote einfügen, Text „Testfußnote
   eins“ eingeben, als DOCX exportieren → mit **unabhängigem** Parser (python-docx oder
   direktes XML-Parsen) verifizieren: `document.xml` enthält genau ein
   `<w:footnoteReference w:id="…"/>` an der richtigen Stelle, `word/footnotes.xml` den
   passenden `<w:footnote w:id="…">` mit dem Text.
2. Dieselbe Datei reimportieren → dieselbe Marke an derselben Stelle, Nummer 1, Text
   identisch.
3. Zwei Fußnoten in korrekter Reihenfolge → Rundreise erhält Reihenfolge, Nummern, Texte.
4. **Reale Datei, unverändert:** `footnotes.docx` (1 Fußnote) unverändert hochladen →
   sofort exportieren → reimportieren → Fußnotentext und Position identisch. (Reicher
   Ersatz-/Zusatzkandidat: `bug65649.docx` mit **6** Fußnoten.)
5. Fußnotentext mit Formatierung (z. B. kursiv) → bleibt erhalten.
6. **Cross-Format ODT→DOCX:** `footnote.odt` importieren → als DOCX exportieren → Fußnote
   inhaltlich erhalten (Nummerierungsdarstellung darf sich anpassen, Text/Existenz nicht).

### 5.2 ODT
1. **Eigene Bearbeitung:** Fußnote einfügen, Text eingeben, als ODT exportieren →
   `content.xml` enthält an der richtigen Stelle ein vollständiges
   `<text:note text:note-class="footnote">` mit `<text:note-citation>` und
   `<text:note-body>`; `styles.xml` enthält eine `<text:notes-configuration>`.
2. Dieselbe Datei reimportieren → identische Marke, Nummer, Text.
3. Zwei Fußnoten → Rundreise erhält Reihenfolge/Nummerierung.
4. **Reale Datei, unverändert:** `footnote.odt` (1 Fußnote + 1 Endnote) unverändert →
   Export → Reimport → Fußnotentext identisch, **und** die Endnote wird nicht fälschlich zur
   Fußnote (Grenzfall 4.18). Dies löst zugleich das heutige Inline-Verstümmelungs-Verhalten
   ab (Abschnitt 0 Punkt 1). Stress-Zusatz: `excelfileformat.odt` (183 Fußnoten,
   Grenzfall 4.8).
5. Fußnotentext mit Formatierung → bleibt erhalten.
6. **Cross-Format DOCX→ODT:** `footnotes.docx` importieren → als ODT exportieren → Fußnote
   inhaltlich erhalten.

### 5.3 Doppelte / Cross-Format-Rundreise
1. DOCX mit Fußnote → Editor → Export ODT → Reimport → Export zurück DOCX → Fußnotentext
   und -existenz nach zwei Konvertierungen identisch (Nummerierungs-/Formatvorlagen-
   Feinheiten dürfen sich ändern, **Textverlust nicht**).
2. Dasselbe mit Startpunkt ODT.

### 5.4 Unabhängige Validierung
- Export nach DOCX gegen einen vom eigenen Reader **unabhängigen** Parser/Schema prüfen
  (`<w:footnoteReference>` + `word/footnotes.xml` + Content-Types-Override + Relationship);
  Export nach ODT gegen ODF-Schema/`odt/__tests__/external-validation.test.ts`-Muster
  (`<text:note>`-Struktur + `<text:notes-configuration>`) — damit sich Schreib- und
  Lesefehler nicht gegenseitig „unsichtbar“ ausgleichen (`FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 19).

**Abnahmemaßstab:** Formatierungsverluste bei Cross-Format sind zu dokumentieren und
akzeptabel; **Struktur- oder Textverlust einer Fußnote ist es nicht.**

---

## 6. Bekannte Verdachtsmomente / Risikoliste (gegen aktuellen Code geprüft)

Reihenfolge = grobe Priorität. Jeder Punkt ist von der QA als „bestätigt und behoben“,
„bestätigt und bewusst dokumentiert“ oder „widerlegt“ einzustufen.

1. **Komplettes Fehlen von Schema, Command und UI.** Kein Node, kein `insertFootnote`, kein
   Button (Abschnitt 1). Gewichtigster Befund — von Grund auf zu bauen. **Status: offen.**
2. **„Am Seitenende“ passt nicht auf die Ein-EditorView-Paginierung.** `pagination.ts`
   (Kommentar 8–10) unterstützt kein Aufteilen innerhalb eines Blocks / keine Pro-Seite-
   Bereiche. Architekturentscheidung 3.3 muss **vor** der Umsetzung fallen. **Status: offen
   (Architektur-Blocker).**
3. **DOCX-Import verliert Fußnoten lautlos.** `decodeRunElement` verwirft
   `w:footnoteReference`, `readDocx` öffnet `word/footnotes.xml` nie (§18-Verstoß). Muss
   ersetzt werden. **Status: offen (aktiver Defekt).**
4. **ODT-Import verstümmelt Fußnoten inline** statt sie zu strukturieren (Catch-all
   `walk`-`else`, `odt/reader.ts` 160–167). Muss durch echte `text:note`-Behandlung ersetzt
   werden; Regressionsnachweis gemäß Grenzfall 4.19. **Status: offen (aktiver Defekt).**
5. **Nummerierung als gespeicherter statt abgeleiteter Wert.** Falls die Nummer im Node
   gespeichert würde, driftet sie bei Einfügen/Löschen/Verschieben. Muss reines Anzeige-
   Derivat sein (3.2). **Status: offen (Designvorgabe).**
6. **Verwaister Fußnotentext bei Löschen/Kopieren.** Löschen der Marke muss den Text-Eintrag
   mitnehmen (3.7); Kopieren muss eine unabhängige Fußnote erzeugen, nicht zwei Marken auf
   einen Eintrag zeigen lassen (Grenzfall 4.6, **ungeklärt**). **Status: offen.**
7. **ID-Kollision/Nichtdeterminismus.** ID-Vergabe muss deterministisch-eindeutig sein
   (`TableNameSequence`-Muster), sonst brechen Byte-Gleichheit (Testfall 11) und
   Referenzzuordnung. **Status: offen (Muster vorhanden, nur anzuwenden).**
8. **Selektion nach dem Einfügen.** Cursor muss sinnvoll hinter der Marke landen (3.1);
   Wechsel zwischen Haupt- und Fußnotentext-Bereich darf nicht die Selection-Sync-Regression
   (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2, `reconcileSelectionOnClick` `WordEditor.tsx`
   43–50) auslösen. **Status: offen.**
9. **Begriffsverwechslung Fußnote/Fußzeile** in Beschriftung/Icon (3.9). **Status: offen.**
10. **Endnoten in Fremddateien** werden fälschlich als Fußnoten interpretiert oder gehen
    verloren (Grenzfall 4.18; Fixtures `Bug54849.docx`, `footnote.odt`, `boilerplate.odt`,
    `endnotes.docx`). **Status: offen.** Konkretisiert (zweiter Verifikationsdurchgang,
    Abschnitt 0): `text:note-class` wird beim ODT-Import heute gar nicht geprüft
    (`footnote`/`endnote` identisch behandelt), und für DOCX existiert **kein**
    `endnoteReference`-Pfad irgendwo im Code — beide Fallback-Mechanismen sind komplett neu
    zu bauen, nicht bloß zu erhalten.
11. **Touch-Bedienung (Mobile/Tablet) bisher nicht betrachtet.** Anders als bei bereits
    verifizierten Features (`kopieren-req.md`, `einfuegen-req.md`) fehlte in dieser Datei
    bislang jede Aussage zu den Playwright-Projekten `Mobile`/`Tablet` — nachgetragen als
    Grenzfall 4.20/Testfall 26. **Status: offen (Test-Gap, kein bekannter Code-Defekt).**

---

## 7. Testfälle (Gesamtübersicht — abzuhaken durch die QA)

Legende: **[N]** = neu zu bauen/schreiben (Kern der Abnahme); **[R]** = reale Fixture aus
dem Repo. Alle Testfälle sind neu — es existiert bisher kein einziger Fußnoten-Test
(Abschnitt 1, letzte Zeile).

1. **[N]** Klick auf „Fußnote einfügen“ → hochgestellte „1“ an der Cursor-Position, ein
   editierbarer Fußnotentext-Bereich erscheint (muss zuerst gebaut werden).
2. **[N]** In den Fußnotentext-Bereich klicken und tippen → Text erscheint dort, nicht im
   Hauptdokument.
3. **[N]** Zweite Fußnote **vor** der ersten → beide Nummern aktualisieren sich korrekt
   (3.6).
4. **[N]** Fußnote löschen (Marke + Entf) → Marke und Text verschwinden, nachfolgende Nummern
   rücken nach (3.7).
5. **[N]** Ganzen Absatz mit Marke löschen → zugehöriger Fußnotentext ebenfalls weg, kein
   verwaister Eintrag im reimportierten Dokument (Grenzfall 4.4).
6. **[N]** Undo direkt nach Einfügen → Marke und Bereich verschwinden vollständig, Text
   davor/danach unverändert; Redo stellt beides wieder her (3.10).
7. **[N]** Formatierung (Fett/Kursiv) im Fußnotentext → sichtbar korrekt, bleibt bei
   Rundreise erhalten (3.5).
8. **[N]** Pfeiltasten über die Marke → als atomare Einheit in einem Schritt übersprungen,
   nicht zeichenweise (3.4).
9. **[N]** Selection-Sync: nach Einfügen/Wechsel in den Fußnotentext per Klick außerhalb neu
   positionieren → Enter → weiter tippen → kein Dokumentinhalt geht verloren (Verdachtsmoment
   8).
10. **[N]** DOCX-Rundreise eigene Bearbeitung (5.1.1–5.1.3) über echten Upload
    (`filechooser`) und Download (`page.waitForEvent('download')`) inkl. unabhängigem Parser
    (5.4).
11. **[N]** ODT-Rundreise eigene Bearbeitung (5.2.1–5.2.3) inkl. `<text:notes-configuration>`
    und unabhängiger ODF-Validierung (5.4).
12. **[R]** `footnotes.docx` unverändert → Export → Reimport → Fußnotentext/Position
    identisch (5.1.4); Zusatz `bug65649.docx` (6 Fußnoten).
13. **[R]** `footnote.odt` unverändert → Export → Reimport → Fußnotentext identisch, Endnote
    nicht zur Fußnote verfälscht (5.2.4, Grenzfall 4.18); löst zugleich das heutige
    Inline-Verstümmelungs-Verhalten ab (Regressionsnachweis Grenzfall 4.19).
14. **[R]** `table_footnotes.docx` → Fußnote in Tabellenzelle importieren/rundreisen → kein
    Absturz, Zuordnung erhalten (Grenzfall 4.9).
15. **[R]** `Bug54849.docx` (Fußnote + Endnote) → Fußnote erhalten, Endnote mindestens als
    Klartext, kein Verlust (Grenzfall 4.18). **Negativkontrolle:** `endnotes.docx` und
    `boilerplate.odt` (je 0 Fußnoten, 1 Endnote) → Import/Rundreise erzeugt **keine** Fußnote
    und keine hochgestellte Marke (Fehlklassifizierung ausgeschlossen, Grenzfall 4.18).
16. **[N]** Cross-Format DOCX→ODT und ODT→DOCX (5.1.6/5.2.6) → Fußnote inhaltlich erhalten.
17. **[N]** Doppelte Cross-Format-Rundreise (5.3) → kein kumulativer Textverlust.
18. **[R]** Performance: `excelfileformat.odt` (183 Fußnoten) importieren, unverändert
    exportieren, reimportieren → UI reaktionsfähig, Nummerierung durchgehend korrekt,
    < 3 s (Grenzfall 4.8).
19. **[N]** Leerer Fußnotentext → Export → valides, leeres `<w:footnote>`/`<text:note-body>`,
    kein Crash (Grenzfall 4.12).
20. **[N]** Import mit defekter Referenz (fehlender Text/fehlende Marke) → kein Absturz,
    Fallback greift (Grenzfall 4.14).
21. **[N]** Zwei aufeinanderfolgende Exporte desselben Fußnoten-Dokuments sind byte-/
    inhaltsgleich → deterministische ID-Vergabe (Grenzfall 4.15, Verdachtsmoment 7).
22. **[N]** Kopieren einer Marke → geklärtes, dokumentiertes Verhalten (neue unabhängige
    Fußnote), kein geteilter Text-Eintrag (Grenzfall 4.6).
23. **[N]** Icon-/Beschriftungstest: „Fußnote“ eindeutig und von „Fußzeile“ unterscheidbar,
    auf System ohne Emoji-Font erkennbar (Menüpunkt 2, 3.9).
24. **[N]** Tastenkürzel-Test (falls eingeführt) bzw. Dokumentationstest (falls bewusst
    zurückgestellt) gemäß Menüpunkt 10.
25. **[N]** Klick auf Marke springt zum Fußnotentext, falls Navigation (Menüpunkt 9)
    umgesetzt — sonst als „bewusst nicht umgesetzt, dokumentiert“ markieren, kein
    wirkungsloser Klick.
26. **[N]** Touch-Viewport (Grenzfall 4.20): Fußnote-Button auf `Mobile`- **und**
    `Tablet`-Playwright-Projekt antippen → Marke wird eingefügt, Fußnotentext-Bereich per
    virtuellem Keyboard editierbar, konsistent mit dem in `kopieren-req.md`/`einfuegen-req.md`
    etablierten Touch-Testmuster.

---

## 8. Abnahmekriterien (Definition of Done)

„Fußnote einfügen“ gilt erst dann als „verifiziert“ (nicht mehr „fehlt“), wenn:

1. Die Architekturfrage aus 3.3 (Fußnotentext „am Seitenende“ vs. gesammelter Bereich)
   explizit entschieden und das Ergebnis hier nachgetragen ist.
2. Die Datenmodell-/Schema-Entscheidung aus Menüpunkt 4–5 (Referenzmarken-Node,
   Speicherort des Fußnotentexts) getroffen, umgesetzt und dokumentiert ist.
3. Toolbar-Button, `insertFootnote`-Command und editierbarer Fußnotentext-Bereich gebaut,
   verdrahtet und über die Testfälle 1–9 nachgewiesen sind.
4. Die automatische Nummerierung (Einfügen, Löschen, Verschieben) über Testfälle 3–5 sowie
   Grenzfälle 4.2/4.5 nachgewiesen ist und nachweislich ein **abgeleiteter**, kein
   gespeicherter Wert ist (Verdachtsmoment 5).
5. DOCX-Export/-Import (`word/footnotes.xml`, Relationship, Content-Types,
   `<w:footnoteReference>`) und ODT-Export/-Import (`<text:note>`,
   `<text:notes-configuration>`) vollständig umgesetzt und über Abschnitt 5.1/5.2 durch
   **unabhängigen** Parser bzw. Reimport bestätigt sind (Testfälle 10–13).
6. Der Ersatz der heutigen Fehlverhalten nachgewiesen ist: DOCX verliert Fußnoten nicht mehr
   (Verdachtsmoment 3), ODT verstümmelt sie nicht mehr inline (Verdachtsmoment 4,
   Grenzfall 4.19).
7. Cross-Format- und doppelte Rundreise (5.3, Testfälle 16–17) ohne Textverlust nachgewiesen
   sind.
8. Alle Grenzfälle aus Abschnitt 4 einzeln geprüft und ihr tatsächliches Verhalten
   dokumentiert ist — insbesondere die als **ungeklärt** markierten 4.6 (Kopieren) und 4.9
   (Fußnote in Tabellenzelle) sowie 4.18 (Fußnoten+Endnoten gemischt).
9. Deterministische ID-Vergabe (Grenzfall 4.15) und die begriffliche Abgrenzung
   Fußnote/Fußzeile (3.9) nachweislich umgesetzt sind.
10. Reale Fußnoten-Fixtures aus dem Repo (mindestens `footnotes.docx` **und** `footnote.odt`,
    plus je eine Grenzfall-Fixture aus `table_footnotes.docx`/`Bug54849.docx`/
    `excelfileformat.odt`) verlustfrei rundreisen (Testfälle 12–15, 18).
11. Alle Testfälle aus Abschnitt 7 tatsächlich über **echte** Browser-Interaktion (nicht nur
    Unit-/Command-Ebene) ausgeführt und grün sind; mindestens die E2E-Rundreisen (Testfälle
    10–13) sind dauerhaft in der Suite verankert.
12. Touch-Bedienung auf `Mobile`- und `Tablet`-Projekt (Grenzfall 4.20, Testfall 26)
    nachgewiesen ist, konsistent mit der bei anderen bereits verifizierten Features
    (`kopieren-req.md`, `einfuegen-req.md`) etablierten Anforderung.

Solange nicht alle zwölf Punkte erfüllt sind, bleibt der Backlog-Status auf „fehlt“; ein
Wechsel auf „teilweise“ ist zulässig, sobald Einfügen + Nummerierung + Rundreise für **ein**
Format über die echte UI nachgewiesen sind, mit ausdrücklicher Nennung der noch offenen
Punkte hier.
