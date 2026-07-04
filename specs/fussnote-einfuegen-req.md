# Anforderungsspezifikation: Feature „Fußnote einfügen“

Status: **Nicht vertrauenswürdig — vollständige Verifikation ausstehend.** Laut
`specs/FEATURE-BACKLOG.md` Abschnitt 5.2 (Zeile 319, Slug `fussnote-einfuegen`) als
**fehlend** geführt (Priorität 1/essenziell), Beschreibung dort: „Fügt eine
Referenzmarke im Text mit Erläuterung am Seitenende ein.“ `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 11 und Abschnitt 17 (Zeile 363) sowie die Testmatrix in Abschnitt 21
bestätigen unabhängig denselben Befund: „Laut Plan Teil von Phase 3 — noch nicht
begonnen“, sowohl Unit- als auch E2E-Spalte tragen dort „fehlt“. Diese Datei ersetzt
diese Beschreibungen nicht, sondern macht sie so detailliert und einzeln abhakbar,
dass ein QA-Agent jeden Punkt über echte Browser-Bedienung (nicht nur Unit-Tests)
nachweisen oder widerlegen kann. Anders als bei den bisherigen `*-req.md`-Dateien
für bereits ansatzweise vorhandene Funktionen (z. B. `tabelle-einfuegen-req.md`)
existiert hier **keinerlei** Vorarbeit — weder UI noch Command noch Schema-Knoten
noch Reader/Writer-Unterstützung. Diese Anforderung beschreibt daher ein vollständig
neu zu bauendes Feature, nicht die Nachbesserung eines bestehenden.

Geltungsbereich: Ausschließlich das **Einfügen** einer neuen Fußnote (Toolbar-
Auslöser, Referenzmarke im Fließtext, automatische fortlaufende Nummerierung,
editierbarer Fußnotentext, Löschen mit Renumbering) für **beide** Formate, DOCX
und ODT — sowohl als neu im Editor erzeugtes Element als auch beim Export und der
anschließenden Rundreise (Datei hochladen bzw. im Editor erzeugen → unverändert
exportieren → erneut importieren → Ergebnis entspricht inhaltlich dem Original).
Stil und Gliederung orientieren sich an `E:\docs\FEATURE-SPEC-DOCX-ODT.md` und
`E:\docs\specs\tabelle-einfuegen-req.md`.

**Ausdrücklich außerhalb des Geltungsbereichs** dieser Datei (eigene, separate
Backlog-Einträge in `FEATURE-BACKLOG.md` Abschnitt 5.2, jeweils Status „fehlt“):
`endnote-einfuegen` (Zeile 320, Priorität 2 — Erläuterung am Dokumentende statt am
Seitenende), `fussnote-navigation` (Zeile 321, Priorität 4 — Schnellsprung zwischen
Fußnoten), `fussnote-zu-endnote` (Zeile 322, Priorität 4 — globale Umwandlung).
Diese Datei behandelt sie **nur** dort, wo sie unmittelbar berühren, ob eine frisch
eingefügte Fußnote überhaupt sinnvoll nutzbar ist — nicht als eigenständig zu
verifizierende Funktionen.

Referenzierter Ist-Stand des Codes (Grundlage dieser Anforderung, **kein** Nachweis
der Korrektheit — das ist Aufgabe der Verifikation; da das Feature komplett fehlt,
dokumentiert diese Tabelle überwiegend **Abwesenheit** an den Stellen, an denen ein
analoges bestehendes Feature als Muster dienen könnte):

| Ort | Inhalt |
|---|---|
| `src/formats/shared/editor/Toolbar.tsx:110-247` | Kein Button, kein Menüpunkt, keine Erwähnung von „Fußnote“ im gesamten Toolbar-Code; letzte vorhandene Elemente sind „⊞ Tabelle“ (Zeile 228-239) und „🖼 Bild“ (Zeile 241-244) — ein Fußnoten-Auslöser fehlt komplett |
| `src/formats/shared/editor/commands.ts:1-107` | Kein `insertFootnote`/`insertFootnoteReference`-Command; vorhandene Commands (`insertImage` Zeile 66-74, `insertTable` Zeile 76-86) zeigen das im Projekt etablierte Muster (`state.tr.replaceSelectionWith(node)` bzw. `dispatch`-Aufruf), an dem sich ein neuer Fußnoten-Command orientieren kann |
| `src/formats/shared/schema.ts:6-107` | ProseMirror-Knoten sind ausschließlich `doc`, `paragraph`, `heading`, `text`, `hard_break`, `image`, `bullet_list`, `ordered_list`, `list_item` sowie die Tabellen-Knoten aus `prosemirror-tables` (Zeile 106) — **kein** Knotentyp für eine Fußnoten-Referenzmarke oder einen Fußnotentext existiert; Marks (Zeile 109-148) enthalten ebenfalls nichts Fußnoten-Bezogenes. Es muss zuerst eine Schema-Entscheidung getroffen werden (siehe Abschnitt 1, Zeile 3 der Bedienelemente-Tabelle) |
| `src/formats/shared/documentModel.ts:3-8` | `WordDocumentContent` kennt nur `body`, `header`, `footer`, `meta.title` — **kein** Feld für Fußnoteninhalte. Das bereits etablierte Muster für „Inhalt außerhalb des Haupttextflusses“ sind `header`/`footer` als eigene, optionale `ProseMirrorJSON`-Dokumente; ein analoges Feld (z. B. `footnotes: Record<string, ProseMirrorJSON>`, indiziert nach einer stabilen Fußnoten-ID) liegt nahe, ist aber aktuell **nicht vorhanden** |
| `src/formats/docx/relationships.ts:33-41` | `RELATIONSHIP_TYPES` enthält `officeDocument`, `styles`, `numbering`, `header`, `footer`, `image`, `coreProperties` — **kein** Eintrag für den offiziellen OOXML-Beziehungstyp `.../relationships/footnotes`, der für einen `word/footnotes.xml`-Part zwingend nötig wäre |
| `src/formats/docx/writer.ts:199-220` (`buildContentTypesXml`) | Erzeugt Overrides nur für `document.xml`, `styles.xml`, `numbering.xml`, `core.xml` sowie bedingt `header1.xml`/`footer1.xml` — **kein** Override für `/word/footnotes.xml` vorbereitet |
| `src/formats/docx/writer.ts:39-65` (`inlineToRuns`), `:94-126` (`blockToDocx`) | Kennen nur die Node-Typen `text`, `hard_break`, `paragraph`, `heading`, `bullet_list`/`ordered_list`, `table`, `image`; jeder unbekannte Inline-Node fällt beim `for`-Loop in `inlineToRuns` (Zeile 50-62) stillschweigend durch (keine Erzeugung, aber auch kein Fehler) und jeder unbekannte Block-Node liefert über den `default`-Zweig in `blockToDocx` (Zeile 123-124) `''` zurück — **sobald** ein Fußnoten-Node im Schema existiert, muss dieser Reader/Writer-Pfad explizit erweitert werden, sonst verschwindet frisch im Editor eingefügter Fußnoteninhalt beim Export lautlos |
| `src/formats/docx/writer.ts:222-279` (`writeDocx`) | Baut aktuell keinen `word/footnotes.xml`-Part und registriert keine Fußnoten-Relationship — muss vollständig neu ergänzt werden (Part, Content-Types-Override, Relationship, `FootnoteReference`-Zeichenformatvorlage und `Fußnotentext`-Absatzformatvorlage analog zu `HEADING_STYLE_ID` in `src/formats/docx/styleDefs.ts:5-7`) |
| `src/formats/docx/reader.ts:124-143` (`decodeParagraphRuns`), `:330-390` (`readDocx`) | Der `for`-Loop über Kind-Elemente eines `<w:r>` (Zeile 129-140) erkennt ausschließlich `w:t`, `w:br`, `w:drawing` — ein `<w:footnoteReference>` wird **nicht erkannt und komplett verworfen** (auch die sichtbare hochgestellte Nummer im Fließtext geht verloren, nicht nur der Fußnotentext); `readDocx` öffnet zudem nirgends `word/footnotes.xml` aus dem Zip — eine reale DOCX-Datei mit Fußnoten verliert diese beim Import aktuell **vollständig und lautlos**, ein direkter Verstoß gegen die in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18 geforderte Garantie „kein stiller Datenverlust“ |
| `src/formats/odt/writer.ts:61-123` (`blockToOdt`), `:46-59` (`inlineToOdt`) | Kennen die Fälle `paragraph`, `heading`, `bullet_list`/`ordered_list`, `table`, `image` — kein Fall für einen Fußnoten-Node, der zu `<text:note>`/`<text:note-citation>`/`<text:note-body>` serialisiert; `buildStylesXml` (Zeile 139-156) schreibt zudem keine `<text:notes-configuration>` in `styles.xml`, die in echten ODT-Dateien das Nummernformat/Startwert der Fußnoten festlegt |
| `src/formats/odt/reader.ts:79-120` (`decodeInline`), `:164-206` (`elementToBlocks`) | `decodeInline`s `walk()`-Funktion (Zeile 96-116) erkennt nur `text:span`, `text:line-break`, `text:s`, `text:tab` — ein `<text:note>` ist in ODF ein Kind-Element **innerhalb** eines `text:p` an der Zitatstelle, wird hier also weder als Sonderfall noch als Fließtext erfasst und verschwindet beim Import ersatzlos, inklusive des kompletten Fußnotentexts (der in `<text:note-body>` liegt, also nicht einmal als Stray-Text im Hauptabsatz landet wie es z. B. bei manchen anderen unbekannten Elementen der Fall sein kann, siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18) |
| `src/formats/shared/editor/pagination.ts:33-105` (`measureAndBuildDecorations`, `createPaginationPlugin`) | Die aktuelle Paginierung ist rein **visuell**: Sie misst die Höhe jedes obersten Blockelements eines einzigen fortlaufenden ProseMirror-Dokuments und fügt bei Bedarf eine reine Abstands-Dekoration (`div.page-break-spacer`, Zeile 49-54) ein — es gibt **keine** separaten Pro-Seite-Container und **keinen** Begriff eines „Seitenendes“ mit eigenem Fußzeilen-/Fußnotenbereich im DOM. Die in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 11 wörtlich geforderte „Erläuterung am Seitenende“ passt architektonisch nicht bruchlos auf dieses Modell — siehe Abschnitt 2.3 dieser Datei, **offene Architekturfrage**, muss vor Umsetzung geklärt werden |
| `src/formats/shared/editor/WordEditor.tsx:116-132` | Der Editor rendert im DOM ausschließlich den Hauptinhalt (`containerRef`); `doc.header`/`doc.footer` (aus `documentModel.ts`) werden hier **überhaupt nicht** angezeigt oder editierbar gemacht — laut `FEATURE-BACKLOG.md` Zeile 250-251 sind `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` selbst als „fehlt“ geführt. Ein editierbarer Fußnotenbereich „am Seitenende“ setzt entweder eine eigene neue UI-Lösung voraus oder müsste (fälschlicherweise) mit der ebenfalls noch ungebauten Fußzeilen-UI verwechselt werden — Begriffsverwechslung „Fußzeile“ vs. „Fußnote“ ist ein konkretes Risiko, siehe Abschnitt 2.9 |
| `src/formats/docx/styleDefs.ts:1-49`, `src/formats/odt/styleRegistry.ts:1-101` | Zeigen das im Projekt etablierte Muster für neue Formatvorlagen (`HEADING_STYLE_ID`, `headingStylesXml()` bzw. `TextStyleRegistry`, `headingStyleDefs()`) — als Vorlage für die neu zu schreibende `FootnoteReference`-Zeichenformatvorlage (DOCX) bzw. das Fußnoten-Textformat (ODT) heranzuziehen |
| `tests/e2e/` (Verzeichnis) | Kein einziger vorhandener Test mit „footnote“/„Fußnote“ im Namen oder Inhalt (projektweite Suche liefert für `footnote`/`Footnote`/`fussnote`/`Fußnote` außerhalb dieser Spezifikationsdateien und des Backlogs keinen einzigen Treffer in `src/`) |

---

## 1. Menüpunkte/Bedienelemente

| # | Element | Fundstelle | Ist-Verhalten laut Code | Anforderung |
|---|---|---|---|---|
| 1 | Toolbar-Button „Fußnote einfügen“ | **nicht vorhanden** (`Toolbar.tsx:110-247` enthält keinen solchen Button) | — | Neuer Button in der Toolbar (Vorschlag: Gruppe nach „🖼 Bild“, analog zum bestehenden Muster in `Toolbar.tsx:228-244`), `title`/`aria-label` „Fußnote einfügen“ — **muss** sich sowohl im sichtbaren Text als auch im Screenreader-Label eindeutig von einem künftigen „Fußzeile bearbeiten“-Button unterscheiden (Verwechslungsgefahr, siehe Ist-Stand-Tabelle und Abschnitt 2.9); Icon darf laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 kein unzuverlässig rendertes Emoji sein, sondern ein eingebettetes SVG oder ein eindeutiges Textkürzel |
| 2 | Command `insertFootnote()` | **nicht vorhanden** in `commands.ts` | — | Neuer Command nach dem Muster von `insertImage`/`insertTable` (`commands.ts:66-86`): erzeugt eine neue, stabile Fußnoten-ID, fügt an der Cursor-Position bzw. anstelle der Selektion einen Fußnoten-Referenzknoten ein und legt einen leeren, editierbaren Fußnotentext-Eintrag für diese ID an |
| 3 | Schema-Erweiterung (Referenzmarke) | **nicht vorhanden** in `schema.ts` | — | Neuer Inline-Node (Arbeitsname `footnote_reference`): `inline: true`, `atom: true` (nicht direkt mit Zeichen befüllbar, wird als Ganzes selektiert/gelöscht), `selectable: true`, Attribut mindestens `id` (stabiler, dokumentweit eindeutiger Bezeichner, unabhängig von der sichtbaren, sich bei Einfügen/Löschen ändernden fortlaufenden Nummer); Darstellung als hochgestellte Zahl im `toDOM` |
| 4 | Schema-/Datenmodell-Entscheidung (Fußnotentext-Speicherort) | **nicht vorhanden**, offene Designfrage | — | Zu entscheiden und hier nachzutragen: Fußnotentext als eigenes Feld in `WordDocumentContent` (`documentModel.ts:3-8`), analog `header`/`footer`, z. B. `footnotes: Record<string, ProseMirrorJSON>`, oder als Attribut direkt am `footnote_reference`-Node. Empfehlung (nicht bindend, muss vor Umsetzung bestätigt werden): eigenes Feld analog `header`/`footer`, da Fußnotentext selbst mehrere Absätze und Formatierung enthalten kann (Abschnitt 11 der `FEATURE-SPEC-DOCX-ODT.md`), was ein reines Attribut nicht sauber abbildet |
| 5 | Fortlaufende Nummerierung an der Referenzmarke | **nicht vorhanden** | — | Sichtbare Zahl an jeder Referenzmarke wird **berechnet**, nicht in der ID gespeichert — bestimmt durch die Position der Referenz im Dokument-Fließtext in Leserichtung (oben nach unten), damit Einfügen/Löschen automatisch zu korrekter Neuberechnung führt (siehe Abschnitt 2.2, 2.6, 2.7) |
| 6 | Editierbarer Fußnotentext-Bereich „am Seitenende“ | **nicht vorhanden**; architektonisch ungeklärt, siehe Ist-Stand-Tabelle (`pagination.ts`) | — | Muss gebaut werden; exakte Platzierung („am Ende jeder einzelnen Seite“ im strengen Word/LibreOffice-Sinn vs. „in einem gesammelten Bereich am Ende des sichtbaren Dokuments/der letzten Seite“) ist eine **offene, vor Abnahme zu klärende Architekturfrage** (siehe Abschnitt 2.3) — unabhängig vom Ergebnis muss der Bereich editierbar sein und Formatierung (Fett etc.) erlauben |
| 7 | Klick auf Referenzmarke → Sprung zum zugehörigen Fußnotentext | **nicht vorhanden** | — | Nice-to-have, aber aus der Beschreibung „Erläuterung am Seitenende“ sinnvoll erwartet: Klick auf die hochgestellte Zahl im Fließtext scrollt/springt zum zugehörigen Fußnotentext-Eintrag; kein Blocker für die Abnahme, aber zu dokumentieren, falls nicht umgesetzt |
| 8 | Löschen einer Fußnote (Referenzmarke via Entf/Backspace entfernen) | **nicht vorhanden** | — | Löschen der Referenzmarke im Fließtext entfernt sowohl die Marke als auch den zugehörigen Fußnotentext-Eintrag (kein verwaister Eintrag); nachfolgende Fußnoten werden automatisch neu nummeriert (siehe Abschnitt 2.7) |
| 9 | Formatierung innerhalb des Fußnotentexts (Fett/Kursiv/etc.) | **nicht vorhanden**, abhängig von Punkt 6 | — | Sobald der Fußnotentext-Bereich existiert, muss er dieselbe Zeichenformatierung wie der Haupttext unterstützen (Wiederverwendung der bestehenden Marks aus `schema.ts:109-148`), analog zur Anforderung an Kopf-/Fußzeilen in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9, Testfall 5 |
| 10 | DOCX-Export: `word/footnotes.xml`, Relationship, Content-Types-Override | **nicht vorhanden** (`relationships.ts:33-41`, `docx/writer.ts:199-279`) | — | Neuer Part `word/footnotes.xml` mit `<w:footnote w:type="separator" w:id="-1"/>` und `<w:footnote w:type="continuationSeparator" w:id="0"/>` (von Word erwartete Pflichteinträge) sowie je Fußnote einem `<w:footnote w:id="N">`-Eintrag; neuer Relationship-Typ `.../relationships/footnotes` in `RELATIONSHIP_TYPES`; Content-Types-Override für `/word/footnotes.xml`; im Fließtext ein `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="N"/></w:r>` an der Cursor-Position |
| 11 | DOCX-Import: `<w:footnoteReference>` erkennen, `word/footnotes.xml` einlesen | **nicht vorhanden** (`docx/reader.ts:124-143,330-390`) | — | `decodeParagraphRuns` muss `w:footnoteReference` als eigenen Run-Typ erkennen (Attribut `w:id` auslesen); `readDocx` muss zusätzlich `word/footnotes.xml` aus dem Zip laden, parsen und über die IDs den zugehörigen Text den Referenzmarken zuordnen |
| 12 | ODT-Export: `<text:note>`/`<text:note-citation>`/`<text:note-body>`, `<text:notes-configuration>` | **nicht vorhanden** (`odt/writer.ts:61-156`) | — | Neuer Fall in `blockToOdt`/`inlineToOdt` für die Referenzmarke, der inline im Absatz an der Zitatstelle ein vollständiges `<text:note text:id="..." text:note-class="footnote"><text:note-citation>N</text:note-citation><text:note-body>...</text:note-body></text:note>`-Element erzeugt; zusätzlich `<text:notes-configuration text:note-class="footnote" style:num-format="1" .../>` in `styles.xml` (`buildStylesXml`) |
| 13 | ODT-Import: `<text:note>` erkennen | **nicht vorhanden** (`odt/reader.ts:79-120,164-206`) | — | `decodeInline`/`elementToBlocks` müssen `text:note` als eigenen Sonderfall behandeln (analog zur bestehenden Sonderbehandlung von `draw:frame` für Bilder in `odt/reader.ts:144-153`), `text:note-citation` als sichtbare Nummer, `text:note-body` als eigenständigen, dem Fußnotentext-Modell zugeordneten Inhalt |
| 14 | Undo/Redo für Einfügen/Löschen/Bearbeiten einer Fußnote | Abhängig von Punkt 2-9, aktuell nicht verifizierbar | — | Einfügen einer Fußnote ist ein einzelner Undo-Schritt (Referenzmarke **und** leerer Fußnotentext-Eintrag entstehen atomar); Löschen ebenso; Bearbeiten des Fußnotentexts läuft über die normale ProseMirror-History des jeweiligen Teil-Editors |
| 15 | Tastenkombination zum Einfügen | nicht vorhanden | — | Kein Blocker; falls gewünscht, optional ergänzbar, aber mindestens der Toolbar-Weg muss zuverlässig funktionieren (analog `tabelle-einfuegen-req.md` Abschnitt 1, Zeile 5) |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Einfügen an der Cursor-Position
- Klick auf „Fußnote einfügen“ fügt an der aktuellen Cursor-Position bzw. anstelle
  der aktuellen Selektion eine Referenzmarke ein (kein Dialog nötig — im Gegensatz
  zu „Tabelle einfügen“ gibt es keine Größen-/Mengenwahl zu treffen).
- Ist Text markiert, wird dieser durch die Referenzmarke ersetzt (analog zum bereits
  für Tabellen/Bilder dokumentierten Standardverhalten „Selektion wird durch
  eingefügtes Element ersetzt“) — muss als gewolltes, dokumentiertes Verhalten
  bestätigt werden, nicht als unerwarteter Textverlust wahrgenommen werden.
- Unmittelbar nach dem Einfügen befindet sich der Cursor sinnvollerweise direkt
  hinter der neu eingefügten Referenzmarke im Fließtext (nicht im neuen
  Fußnotentext-Bereich) — weiteres Tippen setzt den Hauptsatz fort, in dem die
  Fußnote steht.

### 2.2 Automatische fortlaufende Nummerierung
- Die an der Referenzmarke sichtbare Zahl entspricht der Position der Fußnote in
  Lesereihenfolge des Dokuments (erste Fußnote im Text = „1“, zweite = „2“, usw.),
  unabhängig von der internen, stabilen ID des Knotens.
- Diese Berechnung muss bei **jeder** Dokumentänderung, die die Reihenfolge der
  Referenzmarken beeinflusst (Einfügen einer neuen Fußnote vor einer bestehenden,
  Löschen einer Fußnote, Verschieben von Text samt Referenzmarke z. B. durch
  Ausschneiden/Einfügen), automatisch neu erfolgen — die sichtbare Zahl ist ein
  reines Anzeige-Derivat, niemals eine im Dokument gespeicherte, von Hand zu
  pflegende Zahl.
- Word/LibreOffice nummerieren pro Abschnitt bzw. fortlaufend über das ganze
  Dokument (abhängig von den Notes-Konfigurationseinstellungen); für dieses
  Projekt gilt als Minimalanforderung: **eine** fortlaufende Nummerierung über das
  gesamte Dokument, beginnend bei 1. Ein Zurücksetzen pro Seite/Abschnitt ist kein
  Blocker, aber explizit als nicht unterstützt zu dokumentieren, falls nicht gebaut.

### 2.3 Fußnotentext-Bereich „am Seitenende“ (offene Architekturfrage)
- Die Backlog-Beschreibung fordert wörtlich „Erläuterung am Seitenende“. Die
  aktuelle Paginierung (`pagination.ts:33-105`) rendert das gesamte Dokument als
  **einen** fortlaufenden ProseMirror-Editor mit rein optischen Abstands-Widgets
  zwischen Seiten — es gibt keine separaten Pro-Seite-DOM-Container, in die ein
  „echter“, physikalisch an die jeweilige Seite gebundener Fußnotenbereich
  eingehängt werden könnte, ohne die Paginierungs-Architektur grundlegend
  umzubauen.
- **Muss vor Umsetzung geklärt und hier nachgetragen werden:** Wird (a) die
  Paginierung so erweitert, dass jede berechnete Seite tatsächlich einen eigenen
  Fußnotenbereich am unteren Rand erhält (großer Umbau, entspricht dem Word/
  LibreOffice-Vorbild am genauesten), oder (b) wird — als pragmatischere
  Zwischenlösung — **ein** gesammelter, editierbarer Fußnotenbereich am Ende des
  Dokuments/der letzten sichtbaren Seite dargestellt (unabhängig davon, auf
  welcher visuellen Seite sich die jeweilige Referenzmarke befindet)?
- Unabhängig vom Ergebnis dieser Klärung gilt für den Export: DOCX/ODT erwarten
  ohnehin nur die **Zuordnung** Referenz-ID → Fußnotentext, die tatsächliche
  Platzierung „am Fuß der richtigen Seite“ übernimmt beim Öffnen in Word/
  LibreOffice ohnehin deren eigene Paginierung — das heißt, Lösung (b) ist für die
  Rundreise-Anforderung aus Abschnitt 4 **ausreichend**, auch wenn sie im eigenen
  Editor visuell vereinfacht ist. Diese Vereinfachung ist explizit zu dokumentieren,
  falls sie gewählt wird, nicht stillschweigend als „erledigt“ zu behandeln.

### 2.4 Darstellung und Verhalten der Referenzmarke im Fließtext
- Referenzmarke wird als hochgestellte Zahl direkt im Fließtext dargestellt, ohne
  umgebenden Text zu verschieben/zu zerreißen.
- Die Referenzmarke ist ein atomarer Bestandteil (`atom: true`, siehe Abschnitt 1,
  Zeile 3): Cursor-Navigation mit den Pfeiltasten überspringt sie als Ganzes (ein
  Tastendruck), sie kann nicht durch Tippen „von innen“ auseinandergerissen werden.
- Ein einzelnes Entf/Backspace direkt vor/hinter der Marke entfernt die komplette
  Referenzmarke samt zugehörigem Fußnotentext-Eintrag in einem Schritt (siehe
  Abschnitt 2.7), nicht nur ein „unsichtbares Zeichen“ der Marke.
- Markieren mit Umschalt+Pfeil/Maus über eine Referenzmarke hinweg schließt diese
  vollständig in die Selektion ein (kein halbes Markieren einer atomaren Einheit).

### 2.5 Formatierung innerhalb des Fußnotentexts
- Der Fußnotentext-Bereich unterstützt dieselben Zeichenformate wie der Haupttext
  (Fett, Kursiv, Unterstrichen, Durchgestrichen, Farben — `schema.ts:109-148`).
- Mehrere Absätze innerhalb eines einzelnen Fußnotentexts sind zulässig (analog zur
  bereits für Tabellenzellen geforderten Mehrabsatz-Fähigkeit,
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6).
- Ob Bilder/Tabellen innerhalb eines Fußnotentexts unterstützt werden müssen, ist
  **nicht** Teil dieser Anforderung (Word/LibreOffice erlauben das grundsätzlich,
  gilt hier aber als Priorität-3/4-Erweiterung, kein Blocker für die Abnahme
  dieser Datei) — muss aber mindestens nicht zum Absturz führen, falls versehentlich
  versucht (siehe Grenzfall 3.11).

### 2.6 Zweite Fußnote vor einer bestehenden einfügen
- Wird eine neue Fußnote an einer Textstelle **vor** einer bereits existierenden
  eingefügt, muss die sichtbare Nummerierung aller betroffenen Referenzmarken
  automatisch aktualisiert werden: die neue Fußnote erhält Nummer 1 (bzw. die
  korrekte Position in der Lesereihenfolge), die vormals erste Fußnote rückt auf
  Nummer 2 usw. — konsistent mit `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 11,
  Testfall 2.
- Die interne, stabile ID der bereits vorhandenen Fußnote (und damit ihr
  gespeicherter Text) bleibt dabei unverändert — nur die abgeleitete Anzeigezahl
  ändert sich.

### 2.7 Fußnote löschen
- Löschen der Referenzmarke im Fließtext entfernt automatisch auch den
  zugehörigen Fußnotentext-Eintrag — kein verwaister, weiterhin sichtbarer oder im
  Datenmodell verbleibender Fußnotentext ohne Referenz.
- Alle nachfolgenden Fußnoten rücken in der sichtbaren Nummerierung automatisch
  nach (aus „2, 3, 4“ wird nach Löschen von Nummer 1 automatisch „1, 2, 3“) —
  konsistent mit `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 11, Testfall 3.
- Löschen des **gesamten Absatzes**, der eine Referenzmarke enthält (z. B. über
  Dreifachklick + Entf), muss ebenfalls zur korrekten Entfernung der zugehörigen
  Fußnote führen, nicht zu einer verwaisten Fußnote ohne Referenz im Text (siehe
  Grenzfall 3.4).

### 2.8 Navigation zwischen Referenzmarke und Fußnotentext
- Nice-to-have (siehe Abschnitt 1, Zeile 7): Klick auf die Referenzmarke im
  Fließtext springt/scrollt zum zugehörigen Fußnotentext-Eintrag.
- Falls umgesetzt: umgekehrte Navigation (Klick/Symbol im Fußnotentext zurück zur
  Referenzstelle im Fließtext) ist ebenfalls wünschenswert, aber kein Blocker.
- Falls **nicht** umgesetzt, muss das hier als bewusste Auslassung dokumentiert
  werden (kein stiller Fehlschlag eines scheinbar klickbaren Elements).

### 2.9 Begriffliche Abgrenzung „Fußnote“ vs. „Fußzeile“
- Da im Deutschen „Fußnote“ (Referenzmarke + Erläuterung, Gegenstand dieser Datei)
  und „Fußzeile“ (wiederkehrender Bereich am unteren Seitenrand, Gegenstand von
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 bzw. Backlog-Slug `fusszeile-bearbeiten`)
  leicht verwechselt werden können und **beide** aktuell in der UI nicht existieren,
  muss beim Bau des Toolbar-Buttons (Abschnitt 1, Zeile 1) explizit auf eindeutige
  Beschriftung geachtet werden — Titel, `aria-label` und ggf. Icon dürfen nicht
  denselben Wortstamm/dasselbe Symbol wie ein künftiger Fußzeilen-Button verwenden.
- Kein funktionaler Zusammenhang zwischen beiden Features ist erforderlich (eine
  Fußnote muss nicht in der — ohnehin noch nicht gebauten — Fußzeile erscheinen).

### 2.10 Undo/Redo
- Einfügen einer Fußnote (Referenzmarke + leerer Fußnotentext-Eintrag) ist ein
  einzelner, atomarer Undo-Schritt.
- Löschen einer Fußnote ist ebenfalls ein einzelner Undo-Schritt, der sowohl
  Referenzmarke als auch Fußnotentext-Eintrag wiederherstellt.
- Tippen im Fußnotentext-Bereich selbst folgt der normalen, feingranularen
  ProseMirror-History dieses Teil-Editors (falls als eigenständiger Sub-Editor
  umgesetzt) bzw. des Haupteditors (falls als Teil desselben Dokuments
  umgesetzt) — welche der beiden Architekturen gewählt wird, ist Teil der in
  Abschnitt 2.3 offenen Frage und muss konsistent zur dortigen Entscheidung sein.

---

## 3. Grenzfälle

1. **Einfügen bei aktiver Textselektion:** Markierter Text wird durch die
   Referenzmarke ersetzt (kein Zusammenführen) — muss als gewolltes, dokumentiertes
   Verhalten bestätigt werden (analog Grenzfall 3.5 in `tabelle-einfuegen-req.md`).
2. **Zwei Fußnoten im selben Absatz:** Beide erhalten unabhängige, korrekt
   aufeinanderfolgende Nummern; Löschen einer der beiden nummeriert die andere
   korrekt neu.
3. **Fußnote direkt am Dokumentanfang bzw. -ende einfügen:** Referenzmarke wird an
   erster/letzter Stelle im Fließtext eingefügt, Dokument bleibt weiterhin
   vollständig editierbar (Cursor kann davor/danach positioniert werden).
4. **Löschen des kompletten Absatzes, der eine Referenzmarke enthält** (z. B.
   Dreifachklick + Entf, oder „Alles auswählen“ + Entf): zugehöriger
   Fußnotentext-Eintrag muss ebenfalls entfernt werden — keine verwaiste Fußnote
   im Datenmodell oder in der Anzeige.
5. **Ausschneiden von Text mit Referenzmarke und Einfügen an anderer Stelle
   desselben Dokuments:** Nummerierung muss sich nach dem Verschieben korrekt an
   die neue Position in der Lesereihenfolge anpassen.
6. **Kopieren einer Referenzmarke und Einfügen als Duplikat im selben Dokument:**
   Zu klären, ob eine neue, unabhängige Fußnote mit eigenem (ggf. leerem oder
   kopiertem) Text entsteht, oder ob beide Referenzmarken auf denselben
   Fußnotentext zeigen würden (Word erzeugt bei Kopieren einer Fußnotenreferenz
   eine **neue**, unabhängige Fußnote) — Ergebnis dieser Klärung muss hier
   nachgetragen werden, aktuell **ungeklärt**.
7. **Undo direkt nach Einfügen, gefolgt von erneutem Tippen:** Fußnote einfügen →
   Undo → weiter tippen an der wiederhergestellten Cursor-Position → darf nicht zu
   Inhaltsverlust führen (Kombination analog zu Grenzfall 12 in
   `tabelle-einfuegen-req.md`).
8. **Sehr viele Fußnoten im selben Dokument (z. B. 100+):** UI muss reaktionsfähig
   bleiben, insbesondere die Neuberechnung der Nummerierung bei jeder Änderung
   (Abschnitt 2.2) darf nicht spürbar blockieren; Export/Re-Import bleibt in
   vertretbarer Zeit (< 3 Sekunden bei realistischer Menge, analog zum allgemeinen
   Anspruch aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.2).
9. **Fußnote in einer Tabellenzelle einfügen:** Da Tabellenzellen `block+`-Inhalt
   zulassen (`schema.ts:106`), ist unklar, ob eine Fußnoten-Referenzmarke dort
   überhaupt sinnvoll platziert werden kann und ob der zugehörige Fußnotentext
   weiterhin korrekt „am Seitenende“ (bzw. gemäß der Entscheidung aus 2.3)
   erscheint — muss geprüft und dokumentiert werden, mindestens kein Absturz.
10. **Fußnote in einem Listenelement einfügen:** Analog zu Grenzfall 3.8 in
    `tabelle-einfuegen-req.md` — muss funktionieren, ohne die Liste zu zerstören.
11. **Fußnotentext enthält eine Tabelle oder ein Bild** (falls versehentlich über
    Copy-Paste eingefügt, siehe Abschnitt 2.5): darf nicht zum Absturz des
    Fußnotentext-Editors führen, auch wenn dieser Fall nicht offiziell unterstützt
    wird.
12. **Leerer Fußnotentext:** Fußnote einfügen, aber keinen Text eintippen, danach
    exportieren → muss zu einem validen, wenn auch leeren `<w:footnote>`- bzw.
    `<text:note-body>`-Element führen, kein leeres/fehlerhaftes XML, kein Crash.
13. **Fußnotentext mit mehreren Absätzen, davon einer mit Zeilenumbruch
    (`hard_break`):** Muss bei Rundreise erhalten bleiben, analog zur bestehenden
    `hard_break`-Anforderung aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 15.
14. **Import einer Fremddatei mit defekter/inkonsistenter Fußnoten-Referenz**
    (z. B. `<w:footnoteReference w:id="7"/>` im Text, aber kein `<w:footnote
    w:id="7">` in `word/footnotes.xml`, oder umgekehrt ein `<text:note>` ohne
    `text:note-body`): Import darf nicht abstürzen; sinnvoller Fallback (z. B.
    Referenz ignorieren oder mit Platzhaltertext „[fehlender Fußnotentext]“
    ersetzen) statt unbehandelter Exception.
15. **Zwei Fußnoten mit zufällig kollidierender ID** (analog zum bereits bekannten
    `Math.random()`-Namenskollisionsrisiko bei ODT-Tabellen, `odt/writer.ts:109`,
    dokumentiert in `tabelle-einfuegen-req.md` Abschnitt 4.2, Punkt 6): Die
    ID-Vergabe für neue Fußnoten muss deterministisch eindeutig sein (z. B.
    fortlaufender Zähler statt Zufallszahl), um dasselbe Risiko von vornherein zu
    vermeiden.
16. **Mehrfaches schnelles Klicken auf „Fußnote einfügen“:** Kein doppeltes
    Einfügen durch Event-Bubbling oder doppelte Handler-Aufrufe (analog zu
    Grenzfall 3.11 in `tabelle-einfuegen-req.md`).
17. **Fußnote in Kopf-/Fußzeile einfügen** (sobald `kopfzeile-bearbeiten`/
    `fusszeile-bearbeiten` gebaut sind): In Word/LibreOffice nicht sinnvoll
    möglich/nicht vorgesehen — muss in diesem Projekt zumindest nicht zum Absturz
    führen, falls der Fußnoten-Button dort ebenfalls sichtbar ist; im Zweifel:
    Button in Kopf-/Fußzeilen-Kontext deaktivieren/ausblenden, sobald diese
    Bereiche existieren.
18. **Rundreise mit einer Datei, die sowohl Fußnoten als auch Endnoten enthält**
    (Endnoten sind laut Abgrenzung nicht Teil dieser Datei, aber real vorkommende
    Fremddateien haben oft beides): Fußnoten müssen korrekt erhalten bleiben,
    Endnoten dürfen dabei nicht fälschlich als Fußnoten interpretiert werden und
    nicht zu Datenverlust führen (mindestens als Klartext-Fallback erhalten, siehe
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18).

---

## 4. Rundreise-Anforderung (Pflicht für Abnahme)

Für **jeden** der folgenden Fälle gilt: Fußnote(n) im Editor erzeugen bzw. per
Upload importieren → **unverändert** exportieren → erneut importieren → Anzahl,
Reihenfolge, Nummerierung und Textinhalt jeder Fußnote sind inhaltlich exakt
erhalten.

### 4.1 DOCX
1. Über den neuen Toolbar-Button eine Fußnote an einer Textstelle einfügen, Text
   „Testfußnote eins“ eingeben, als DOCX exportieren → mit einem unabhängigen
   Parser (z. B. python-docx oder direktes Parsen von `word/document.xml` und
   `word/footnotes.xml`) verifizieren: `document.xml` enthält genau ein
   `<w:footnoteReference w:id="…"/>` an der richtigen Stelle, `footnotes.xml`
   enthält den passenden `<w:footnote w:id="…">`-Eintrag mit dem eingegebenen Text.
2. Dieselbe Datei erneut importieren → im Editor sichtbar dieselbe Referenzmarke
   an derselben Textstelle mit korrekter Nummer 1, Fußnotentext identisch.
3. Zwei Fußnoten in korrekter Reihenfolge einfügen, exportieren, reimportieren →
   beide Fußnoten in korrekter Reihenfolge und mit korrektem Text erhalten.
4. Vorhandene, mit diesem Editor unverändert (ohne jede Bearbeitung) importierte
   fremde DOCX-Datei mit echten Fußnoten (z. B. aus einem Open-Source-Testkorpus
   wie python-docx-Testfixtures) → unverändert exportieren → erneut importieren →
   Fußnotentexte und Reihenfolge identisch (kein Verlust, siehe Ist-Stand-Tabelle,
   `docx/reader.ts:124-143,330-390`).
5. Fußnotentext mit Formatierung (z. B. kursiv) → bleibt bei Rundreise erhalten.
6. Cross-Format: ODT mit Fußnote importieren → als DOCX exportieren → Fußnote
   bleibt inhaltlich erhalten (Nummerierung darf sich an das DOCX-Zielformat
   anpassen, Text und Existenz der Fußnote nicht verloren gehen).

### 4.2 ODT
1. Über den neuen Toolbar-Button eine Fußnote einfügen, Text eingeben, als ODT
   exportieren → `content.xml` enthält an der richtigen Stelle ein vollständiges
   `<text:note text:note-class="footnote">`-Element mit korrektem
   `<text:note-citation>` und `<text:note-body>`.
2. Dieselbe Datei erneut importieren → identische Referenzmarke, Nummer und
   Fußnotentext.
3. Zwei Fußnoten → Rundreise erhält Reihenfolge und Nummerierung.
4. Vorhandene, mit diesem Editor unverändert importierte fremde ODT-Datei mit
   echten Fußnoten → unverändert exportieren → erneut importieren → Fußnotentexte
   identisch (kein Verlust, siehe Ist-Stand-Tabelle, `odt/reader.ts:79-120,164-206`).
5. Fußnotentext mit Formatierung → bleibt bei Rundreise erhalten.
6. Cross-Format: DOCX mit Fußnote importieren → als ODT exportieren → Fußnote
   bleibt inhaltlich erhalten.

### 4.3 Doppelte Rundreise / Cross-Format hin und zurück
1. DOCX mit Fußnote → Editor → Export als ODT → erneuter Import → Export zurück
   als DOCX → Fußnotentext und -existenz nach zwei Formatkonvertierungen weiterhin
   identisch zum Original (exakte Nummerierungsdarstellung/Formatvorlagen-Feinheiten
   dürfen sich dabei ändern, **Textverlust jedoch nicht**).
2. Dieselbe Prüfung mit Startpunkt ODT.

---

## 5. Testfälle für die Verifikation (E2E, echte Bedienung im Browser)

Aktuell existiert laut Projektsuche **kein einziger** Test mit Fußnoten-Bezug
(siehe Ist-Stand-Tabelle, letzte Zeile) — alle folgenden Testfälle müssen neu
geschrieben werden, nachdem die zugehörige Funktion gebaut wurde:

1. Klick auf „Fußnote einfügen“ → sichtbare hochgestellte Zahl „1“ erscheint an der
   Cursor-Position im Fließtext, ein editierbarer Fußnotentext-Bereich wird
   sichtbar (muss zuerst gebaut werden, aktuell **nicht vorhanden**).
2. In den neu erschienenen Fußnotentext-Bereich klicken und Text eintippen →
   Text erscheint dort, nicht im Hauptdokument.
3. Zweite Fußnote **vor** der ersten einfügen → Nummerierung beider aktualisiert
   sich korrekt (siehe Abschnitt 2.6).
4. Fußnote löschen (Referenzmarke markieren + Entf) → Referenzmarke und
   zugehöriger Fußnotentext verschwinden, nachfolgende Nummern rücken nach (siehe
   Abschnitt 2.7).
5. Undo direkt nach Fußnoten-Einfügen → Referenzmarke und Fußnotentext-Bereich
   verschwinden vollständig, Text davor/danach unverändert.
6. Redo stellt Referenzmarke und (leeren) Fußnotentext-Bereich wieder her.
7. Formatierung (z. B. Fett) im Fußnotentext anwenden → sichtbar korrekt
   dargestellt.
8. Cursor-Navigation mit Pfeiltasten über eine Referenzmarke hinweg → wird als
   atomare Einheit in einem Schritt übersprungen, nicht zeichenweise durchquert.
9. Vollständiger Rundreisetest DOCX (4.1) über echten Datei-Upload
   (`filechooser`) und echten Download-Abfangmechanismus
   (`page.waitForEvent('download')`), inklusive Validierung über einen
   unabhängigen Parser.
10. Vollständiger Rundreisetest ODT (4.2) ebenso.
11. Cross-Format-Rundreise (4.3) einmal DOCX→ODT→DOCX, einmal ODT→DOCX→ODT.
12. Reale komplexe Fremddatei mit mehreren echten Fußnoten (DOCX und ODT je
    mindestens ein Beispiel aus einem vertrauenswürdigen Open-Source-Testkorpus)
    importieren, unverändert exportieren, erneut importieren → alle
    Fußnotentexte identisch, keine verwaisten oder fehlenden Einträge.
13. Löschen des gesamten Absatzes, der eine Referenzmarke enthält (Grenzfall 3.4)
    → zugehöriger Fußnotentext verschwindet ebenfalls, kein verwaister Eintrag im
    reimportierten Dokument.
14. Sehr viele Fußnoten (z. B. 50) in einem Dokument einfügen → UI bleibt
    bedienbar, Nummerierung bleibt durchgehend korrekt, Export/Import bleibt in
    vertretbarer Zeit (Grenzfall 3.8).
15. Klick auf Referenzmarke springt zum Fußnotentext, falls Punkt „Navigation“
    (Abschnitt 1, Zeile 7) umgesetzt wurde — andernfalls Test entsprechend als
    „bewusst nicht umgesetzt, dokumentiert“ markieren statt stillschweigend
    auszulassen.

---

## 6. Abnahmekriterien (Definition of Done)

Der Status „fehlt“ für „Fußnote einfügen“ darf erst dann auf „verifiziert“
geändert werden, wenn:

1. Die offene Architekturfrage aus Abschnitt 2.3 (Fußnotentext „am Seitenende“ vs.
   gesammelter Bereich am Dokumentende) explizit entschieden und das Ergebnis hier
   nachgetragen wurde.
2. Die offene Datenmodell-Frage aus Abschnitt 1, Zeile 3-4 (Schema-Knoten für die
   Referenzmarke, Speicherort des Fußnotentexts in `WordDocumentContent`)
   entschieden, umgesetzt und dokumentiert ist.
3. Toolbar-Button, Command und editierbarer Fußnotentext-Bereich gebaut, verdrahtet
   und über die Testfälle 1-8 aus Abschnitt 5 nachgewiesen sind.
4. Automatische Nummerierung (Einfügen, Löschen, Verschieben) über die Testfälle
   3-6 aus Abschnitt 5 sowie Grenzfälle 2, 5, 6 aus Abschnitt 3 nachgewiesen ist.
5. DOCX-Export/-Import (`word/footnotes.xml`, Relationship, Content-Types,
   `<w:footnoteReference>`) und ODT-Export/-Import (`<text:note>`,
   `<text:notes-configuration>`) vollständig implementiert und über die
   Rundreise-Anforderungen aus Abschnitt 4.1/4.2 durch einen unabhängigen Parser
   bzw. erneuten Import bestätigt sind.
6. Die Cross-Format-Rundreise aus Abschnitt 4.3 in beide Richtungen ohne
   Textverlust nachgewiesen ist.
7. Alle Grenzfälle aus Abschnitt 3 einzeln geprüft und deren tatsächliches
   Verhalten dokumentiert ist (auch wenn das Ergebnis „bewusst so gewollt,
   dokumentiert“ statt „vollständig unterstützt“ lautet) — insbesondere die als
   „ungeklärt“ markierten Punkte 6 (Kopierverhalten) und 9 (Fußnote in
   Tabellenzelle).
8. Die begriffliche Abgrenzung „Fußnote“ vs. „Fußzeile“ aus Abschnitt 2.9 in der
   tatsächlichen UI-Beschriftung nachweislich eindeutig umgesetzt ist.
9. Reale Fremddateien mit echten Fußnoten (mindestens je ein DOCX- und ein
   ODT-Beispiel aus einem vertrauenswürdigen Open-Source-Testkorpus) verlustfrei
   importiert und reexportiert werden können (Testfall 12 aus Abschnitt 5).
10. Alle Testfälle aus Abschnitt 5 tatsächlich ausgeführt wurden (echte
    Browser-Interaktion, nicht nur Unit-/Command-Ebene) und grün sind.

Erst nach Erfüllung aller zehn Punkte darf der Backlog-Status von „fehlt“ auf
„verifiziert“ geändert werden.
