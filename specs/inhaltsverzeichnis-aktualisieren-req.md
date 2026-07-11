# Anforderungen: „Inhaltsverzeichnis aktualisieren"

Status: **Nicht vertrauenswürdig — vollständige Verifikation ausstehend.** Laut
`specs/FEATURE-BACKLOG.md` Abschnitt 5.1 („Verzeichnisse", Zeile 310, Slug
`inhaltsverzeichnis-aktualisieren`, Status **fehlt**, Priorität **1/essenziell**) mit der
Beschreibung „Berechnet das Verzeichnis nach Überschriften-Änderungen neu." Diese
Einstufung gilt ausdrücklich als nicht vertrauenswürdig: sie ist durch tatsächliche
Code-Durchsicht zu bestätigen (nicht nur „ungetestet", sondern real abwesend — siehe
Abschnitt 0) und die anschließende Umsetzung ist Punkt für Punkt gegen die unten
stehenden Anforderungen abzunehmen.

Geltungsbereich: ausschließlich die Funktion „ein **bereits im Dokument vorhandenes**
Inhaltsverzeichnis nach Überschriften-Änderungen neu berechnen" im gemeinsamen
DOCX/ODT-Editor (`src/formats/shared/editor/`, `src/formats/shared/schema.ts`) sowie
deren Serialisierung/Deserialisierung in `src/formats/docx/` und `src/formats/odt/`.
Wie in `FEATURE-SPEC-DOCX-ODT.md` (Architektur-Grundprinzip, Zeile 9–13) festgelegt:
DOCX und ODT teilen sich denselben ProseMirror-Editor. Jede Anforderung unten gilt für
**beide** Formate, inklusive Rundreise (Upload unverändert → Export → Re-Import erhält
Inhalt).

**Abgrenzung zum Schwester-Feature.** Das Erzeugen eines Inhaltsverzeichnisses aus dem
Nichts ist ein **eigener** Backlog-Eintrag (`inhaltsverzeichnis-einfuegen`,
`FEATURE-BACKLOG.md` Zeile 309, ebenfalls Priorität 1, ebenfalls „fehlt"). Für dieses
Schwester-Feature existiert bereits eine ausgearbeitete, am 2026-07-04 gegen den Code
re-verifizierte Anforderungsdatei, `specs/inhaltsverzeichnis-einfuegen-req.md` — diese
Datei hier setzt sie voraus und verweist auf sie, statt ihre Inhalte zu wiederholen.
Konkret regelt „einfügen" den Options-Dialog (Ebenentiefe), die Erstgenerierung, die
Platzierung, die Klick-Navigation und die drei dort noch **offenen**
Grundsatzentscheidungen (Node-Modellierung im Schema, Editierbarkeit des Verzeichnisses,
Seitenzahl-Anzeige im Editor — siehe `inhaltsverzeichnis-einfuegen-req.md` Abschnitt 2.9,
Grenzfall 15 sowie die Abnahmeliste Abschnitt 6, Punkt 12). „einfügen" verweist für den
**Ablauf** der wiederholten Aktualisierung ausdrücklich auf diese Datei
(`inhaltsverzeichnis-einfuegen-req.md` Abschnitt 2.8 und Geltungsbereich-Abgrenzung).
Beide Dateien sind komplementär und dürfen sich nicht widersprechen; wo eine
Grundsatzentscheidung dort getroffen wird, gilt sie hier unverändert. **Die Befunde 5–8
unten wurden gegen den aktuellen Code direkt nachgeprüft und decken sich mit den Befunden
7/8 der Schwester-Datei; eine frühere Fassung dieser Datei war hier ungenau (siehe die
Korrekturhinweise in Abschnitt 0).**

---

## 0. Befund aus Code-Recherche (Ausgangslage vor Verifikation)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des Codes am Stand dieses
Repos, nicht nur auf der Backlog-Beschreibung. Alle Zeilennummern sind als Anker zum
Zeitpunkt der Erstellung zu verstehen und bei der Umsetzung erneut zu prüfen.

**Re-Verifikationsnotiz (2026-07-05).** Diese Fassung wurde erneut direkt gegen den
Code geprüft, nicht nur aus einer Vorfassung übernommen. Bestätigt (u. a. per
`grep`/Datei-Lektüre und Entpacken der ZIP-basierten ODT-Fixtures): Node-Liste in
`schema.ts` (`heading` :26, `unsupported_block` :92, kein `toc`-Node), `commands.ts`
(`setHeading` :40, `canCut` :126, `cutSelection` :149, kein ToC-Command),
`Toolbar.tsx` (`insertTable(2, 2)` weiterhin direkt bei :284, kein „Inhaltsverzeichnis"-
Treffer), `WordEditor.tsx` (`keymap({…})` exakt Zeilen 85–108, endet mit
`keymap(baseKeymap)` bei :108, **kein** `F9`-Eintrag), `docx/reader.ts`
(`readBodyChildren` exakt Zeilen 464–485, `w:p`-Zweig :473, `w:tbl`-Zweig :478, **kein**
`w:sdt`-Zweig; `collectRuns` exakt Zeilen 194–216, mit `w:fldSimple`/`w:sdt`-Fallback,
aber **ohne** `w:fldChar`/`w:instrText`-Rekonstruktion), `docx/writer.ts` (0 Treffer für
`fldChar`/`fldSimple`/`instrText`/`w:sdt`/`bookmark`/`dirty`/`table-of-content`),
`odt/reader.ts` (`elementToBlocks` :250, `EMPTY_REDLINE_MARKER_NAMES` :80,
unbehandelte Elemente fallen auf `return []` bei :323), `odt/writer.ts` (`blockToOdt`
:85, `text:h`-Erzeugung :97, 0 Treffer für `text:table-of-content`),
`specs/FEATURE-BACKLOG.md` Zeilen 309/310 (Slugs, Status „fehlt", Priorität 1
unverändert), Fixture-Korpus (`tests/fixtures/external/odt` weiterhin 202 Dateien,
`tests/fixtures/external/docx` weiterhin 127 Dateien, **kein** `TOC \o`-Treffer in
irgendeinem `word/document.xml`) sowie die exakten Datei-/`content.xml`-Größen aus
Befund 11 (`test1.odt` 474.500 Byte/`content.xml` 263.100 Byte, `compdocfileformat.odt`
56.730 Byte/372.241 Byte, `excelfileformat.odt` 356.107 Byte/7.234.152 Byte — jeweils
byte-genau bestätigt). **Neu seit der letzten Durchsicht:** Der ODT-Korpus enthält
inzwischen zusätzlich `compdocfileformat_shortened.odt` (29.854 Byte,
`content.xml` ~36 KB) — direkt geprüft: **kein** `text:table-of-content` enthalten (0
Treffer), also für dieses Feature **nicht** als ToC-Fixture nutzbar; sie ändert nichts
an Befund 11 und ist vermutlich für ein anderes Feature/einen anderen Performance-Test
gedacht. Keine der übrigen Feststellungen dieser Datei musste aufgrund dieser
Re-Verifikation korrigiert werden.

| # | Befund | Fundstelle | Bedeutung für „aktualisieren" |
|---|---|---|---|
| 1 | **Kein ToC-/Feld-Node im Schema.** Die Node-Typen sind `doc`, `paragraph`, `heading` (`attrs: level 1–6 + align`, `defining: true`), `text`, `hard_break`, `image`, `unsupported_block` (`attrs: kind`, Inhalt `block+`), `bullet_list`, `ordered_list`, `list_item` (Inhalt `block+`) sowie die `tableNodes({...})` aus `prosemirror-tables`. Marks: `strong`, `em`, `underline`, `strike`, `textColor`, `highlight`. | `src/formats/shared/schema.ts:14–154` (`heading` ab :26, `unsupported_block` ab :92, `tableNodes` :154) | Es gibt weder einen `table_of_contents`/`toc`-Node noch ein Attribut, das einen Absatz als „automatisch generierten ToC-Eintrag" markiert. Ein Verzeichnis, das „aktualisieren" ansteuern könnte, existiert im Datenmodell nicht. **Der bereits vorhandene `unsupported_block`-Node (`content: 'block+'`, `attrs: { kind }`) ist explizit zu berücksichtigen** (siehe Befund 5–7): er ist der bestehende Mechanismus, um nicht interpretierbare Fremdinhalte sichtbar zu erhalten — ein importiertes ToC-Feld landet dort aber **derzeit nicht** (es wird stattdessen entweder zu normalem Text verflacht oder ganz verworfen, Befund 5/7). |
| 2 | **Überschriften selbst sind solide unterstützt** — die tragfähige Grundlage. `heading`-Nodes tragen `level` (1–6); Import/Export runden über `w:pStyle="HeadingN"`/`w:outlineLvl` bzw. `text:outline-level`. | DOCX: `docx/reader.ts` (`parseStylesXml`/`headingLevelForStyle`), `docx/styleDefs.ts` (`HeadingN` + `w:outlineLvl`); ODT: `odt/reader.ts:257` (`text:h`, `outline-level`), `odt/writer.ts:93` (`<text:h … text:outline-level>`) | Ein ToC müsste „nur" diese vorhandenen Daten auslesen — es fehlt aber jeglicher Code, der das tut. Roundtrip-Tests für Überschriften existieren bereits (`docx/__tests__/roundtrip.test.ts`, `odt/__tests__/roundtrip.test.ts`) und bilden den Regressionsschutz. |
| 3 | **Kein Command.** Die Commands sind `setAlign`, `isAlignActive`, `setHeading` (nimmt `level` **oder** `null`), `toggleList`, `liftFromList`, `insertImage`, `insertHardBreak`, `insertTable`, `applyMarkColor`, `clearMarkColor`, `canCut`, `cutSelection`. | `commands.ts` (`setHeading` :40, `insertTable` :92, `cutSelection` :149) | Kein `insertTableOfContents`/`updateTableOfContents`, keine Funktion, die das gesamte `doc` nach `heading`-Nodes durchläuft. Positiv: `setHeading(level \| null)` (Zeile 40) ist genau der Umschalt-Mechanismus (Überschrift ↔ Absatz, Ebenenwechsel), dessen Ergebnis „aktualisieren" erfassen muss (Abschnitt 3.3). |
| 4 | **Kein Bedienelement.** Kein Treffer für „Inhaltsverzeichnis"/„TOC" in der Toolbar; keine „Referenzen"-Gruppe. Die Toolbar ist nach Zeichen-/Absatzformat/Listen/Tabelle/Bild gegliedert; als Vorlage für einen neuen Block-Button dient „Tabelle einfügen" (`insertTable(2, 2)` steht direkt im Klick-Handler). Kein Kontextmenü im Editor. | `shared/editor/Toolbar.tsx` | Weder Einfüge- noch Aktualisieren-Steuerelement existiert. Die Zeichenformat-Buttons nutzen reine Buchstaben-Labels („F/K/U/S") — ein neuer Button muss ein eindeutiges, eingebettetes SVG-Icon erhalten (kein Unicode/Emoji, `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1). |
| 5 | **DOCX-Import zerstört den Feld-Charakter — auf zweierlei, je nach Feld-Form verschiedene Weise.** (a) **Klassische Feld-Form** (Eintragszeilen sind direkte `<w:p>`-Body-Kinder mit `w:fldChar`/`w:instrText` innerhalb der Absätze): `readBodyChildren` (`reader.ts:464–485`) behandelt Body-Kinder **nur** für `w:p` (:473) und `w:tbl` (:478); die Absätze überleben also als gewöhnliche Absätze. Auf Run-Ebene steigt `collectRuns` (`reader.ts:194–216`) in `w:ins`, `w:hyperlink`, `w:smartTag`, `w:sdt`(→`w:sdtContent`) und `w:fldSimple` hinab und übernimmt deren sichtbaren Text; `w:del` wird verworfen; **`w:instrText` wird nicht als `w:t` gelesen** (die Feld-Instruktion `TOC \o …` taucht also nicht als Störtext auf, geht aber verloren). Ergebnis: sichtbarer Eintragstext bleibt als linksbündige Absätze (mit „TOC N"-Stil, **nicht** „HeadingN" — also nicht einmal als Überschriften erkannt), Feld-Charakter verloren. (b) **Block-level `<w:sdt>`-Form** (die moderne Word-Standardform, in die Word ein ToC standardmäßig wickelt): `readBodyChildren` behandelt einen block-level `<w:sdt>` **gar nicht** (weder `w:p` noch `w:tbl`) → das **komplette Verzeichnis wird still verworfen** (Totalverlust). Der `w:sdt`-Fallback in `collectRuns` greift nur **innerhalb** eines Absatzes, nicht für einen block-level-Rahmen um mehrere Absätze. | `reader.ts:464–485` (Body-Iteration), `reader.ts:194–216` (Run-Fallback); Tests `docx/__tests__/reader.test.ts` (sdt-/fldSimple-Text bleibt sichtbar) | **Kernbefund und Korrektur gegenüber der Vorfassung dieser Datei** (die nur den Verflachungs-Fall (a) kannte). Fall (b) — der **häufigste** reale Word-Fall — ist ein stiller **Totalverlust** und verletzt `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18. Nach dem Import gibt es in beiden Fällen nichts mehr, was „aktualisieren" als Verzeichnis wiedererkennen könnte. Siehe Vorbedingung B (0.2). |
| 6 | **DOCX-Writer hat keinerlei Feld-/ToC-/Bookmark-Ausgabe.** Projektweite Suche nach `fldChar`/`fldSimple`/`instrText`/`w:sdt`/`bookmark`/`dirty`/`table-of-content` im Writer liefert **null** Treffer (direkt verifiziert). | `docx/writer.ts` | Der Baustein „aktualisierbares, aus Dokumentzustand berechnetes Feld" fehlt komplett — dieselbe fehlende Grundlage betrifft auch das Seitenzahl-Feld (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9). „aktualisieren" kann nur etwas aktualisieren, wenn dieser Schreibpfad zuvor gebaut wurde. |
| 7 | **ODT-Import verwirft ein vorhandenes `text:table-of-content` ersatzlos — verifizierter stiller Totalverlust.** `elementToBlocks` (`reader.ts:250–323`) behandelt nur `text:p`, `text:h`, `text:section` (wird per Entpacken durchgereicht, :277), `draw:frame`, `text:list`, `table:table`; **jedes** andere Block-Element fällt auf `return []` (`reader.ts:323`) und wird verworfen. `text:table-of-content` trifft keinen dieser Fälle → das gesamte Verzeichnis samt `text:index-body`-Eintragstext verschwindet spurlos. `bookmark`/`bookmark-start`/`bookmark-end` (und `change*`) sind separat als leere Marker bekannt (`EMPTY_REDLINE_MARKER_NAMES`, :80–90). | `odt/reader.ts:250–323` (insb. `return []` :323); `text:section`-Entpacken :277 als Vorbild | **Korrektur gegenüber der Vorfassung dieser Datei**, die das Schicksal als „ungetestet und undefiniert" führte. Es ist **verifiziert**: kompletter, stiller Datenverlust — verletzt `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18 (deckt sich mit Befund 7 der Schwester-Datei). Grenzfall 12 ist damit kein offener, sondern ein bereits befundeter, zu behebender Zustand. |
| 8 | **ODT-Writer erzeugt kein `text:table-of-content`/`text:index-body`.** Kein Treffer im `blockToOdt()`-Pfad (`writer.ts:85–203`). | `odt/writer.ts` | Wie Befund 6 für ODT: der ODT-Schreibpfad muss als neuer `case` in `blockToOdt` neu gebaut werden. |
| 9 | **Kein Tastatur-Shortcut, kein `F9`.** Die `keymap({...})` (`WordEditor.tsx:85`) bindet `Mod-z` (undo, :93), `Mod-y`/`Mod-Shift-z` (redo), `Enter` (`splitListItem`), `Shift-Enter` (`insertHardBreak`, :97), `Mod-b`/`Mod-i`/`Mod-u` (Marks) und darunter `baseKeymap` (:108). | `WordEditor.tsx:85–108` | `F9` (in Word/LibreOffice der Standard für „Feld aktualisieren") ist weder gebunden noch abgefangen. Ebenfalls hier: `reconcileSelectionOnClick` (Selection-Sync-Fix, :43/:152; `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) — relevant, weil jeder Klick auf ein Steuerelement/Verzeichnis ein neuer Verdachtsfall ist (Grenzfall 9). |
| 10 | **Paginierung ist rein visuell und viewport-abhängig.** `computePageBreakIndices(heights, pageContentHeight)` (`pagination.ts:12`) und `computePageCount(...)` (`:27`, = `breakIndices.length + 1`) berechnen Seitenumbrüche aus live gemessenen DOM-Höhen und legen Decoration-Widgets in die Anzeige, nicht in den Dokumentinhalt. | `pagination.ts:12–27` | Grundsätzlich ableitbar, auf welcher Editor-Seite eine Überschrift aktuell steht (Zählen der `breakIndices` unterhalb ihres Top-Level-Index, +1) — es gibt aber **keinen** exportierten Nachschlag „Seite von Überschrift X", und die Werte hängen von Fensterbreite/Zoom ab und stimmen nicht mit der Paginierung von Word/LibreOffice überein. Siehe Abschnitt 3.7. |
| 11 | **Kein Test, kein synthetischer Fixture — aber reale ODT-Fixtures existieren bereits (Korrektur!).** Kein Treffer für „toc"/„table-of-content"/„Inhaltsverzeichnis"/„tableOfContents" im gesamten `src`. **Direkt nachgeprüft (ausgepackt, nicht nur `grep` über die ZIP-Binärdatei):** Der ODT-Fixture-Korpus (`tests/fixtures/external/odt`, 202 Dateien) enthält **drei** Dateien mit echtem `text:table-of-content` — `test1.odt`, `compdocfileformat.odt`, `excelfileformat.odt`. Der DOCX-Korpus (`tests/fixtures/external/docx`, 127 Dateien) enthält **keine** Datei mit einem `TOC`-Feld (auch `FieldCodes.docx` besitzt `w:instrText`, aber **keine** `TOC`-Instruktion und **kein** `w:sdt`; `FldSimple.docx`, `bookmarks.docx`, `heading123.docx` je ohne ToC). | `src/**`; ausgepackte `tests/fixtures/external/{odt,docx}/**` | **Korrektur gegenüber der Vorfassung**, die pauschal „keine Datei mit einem echten Inhaltsverzeichnis" behauptete (das galt nur für DOCX; die ODT-Stichprobe war unvollständig). Konsequenz: **Für ODT muss keine neue Fixture beschafft werden** — `test1.odt` (vollständiges, verschachteltes ToC) ist die geeignetste Pflicht-Fixture, `compdocfileformat.odt` eine zweite, `excelfileformat.odt` (~7 MB) nur optional. **Für DOCX ist eine synthetische Fixture Pflicht** (in beiden Feld-Formen aus Befund 5), zusätzlich empfohlen eine echte, mit Microsoft Word erzeugte `.docx` mit `TOC`-Feld. |

### 0.1 Vorbedingung A — Schwester-Feature „Inhaltsverzeichnis einfügen"

Damit „aktualisieren" gegen ein **in der App selbst erzeugtes** Verzeichnis end-to-end
verifizierbar ist, muss „einfügen" (siehe `inhaltsverzeichnis-einfuegen-req.md`)
mindestens Folgendes liefern — unabhängig davon, welches Datenmodell dort gewählt wird
(eigener Node, Attribut-Marker auf einer Absatzgruppe, oder Editor-Zustand außerhalb des
Docs):

- Eine im Dokument **wiedererkennbare** Markierung „hier beginnt/endet ein
  Inhaltsverzeichnis", die „aktualisieren" ansteuern kann, ohne den Inhalt zu raten.
- Eine gespeicherte, beim Einfügen gewählte **Konfiguration** (mindestens: maximale
  Ebene/Tiefe), die „aktualisieren" **respektieren** und nicht auf einen Standardwert
  zurücksetzen darf (Abschnitt 3.5, Grenzfall 5).
- Export als echtes Feld gemäß `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 10 (`w:sdt`/Feld-
  Tripel für DOCX, `text:table-of-content` für ODT).

### 0.2 Vorbedingung B — Import muss ein vorhandenes Verzeichnis als Feld erkennen

**Neu und zwingend, folgt direkt aus Befund 5/7.** Im aktuellen Zustand zerstört bereits
der **Import** den Feld-Charakter eines echten Word-/LibreOffice-Verzeichnisses:

- **ODT:** ein `text:table-of-content` wird **komplett verworfen** (`elementToBlocks` →
  `return []`, `reader.ts:323`) — stiller Totalverlust (Befund 7).
- **DOCX klassische Feld-Form:** der sichtbare Eintragstext bleibt als gewöhnliche
  „TOC N"-Absätze erhalten, aber der Feld-Charakter geht verloren; die Absätze werden
  nicht einmal als Überschriften erkannt (Befund 5a).
- **DOCX block-level `<w:sdt>`-Form** (moderne Word-Standardform): das **komplette
  Verzeichnis wird verworfen** (`readBodyChildren` behandelt nur `w:p`/`w:tbl`,
  `reader.ts:464–485`) — stiller Totalverlust (Befund 5b).

Solange das so bleibt, ist eine Gleichbehandlung „hausgemachtes vs. importiertes
Verzeichnis" **faktisch unmöglich** — es gibt nach dem Import (ODT und DOCX-`w:sdt`)
schlicht kein Verzeichnis-Element mehr, und im DOCX-Klassik-Fall nur formlosen Absatztext.
Daher gilt als harte Anforderung: Der Reader muss ein eingehendes ToC-Feld (DOCX: `w:sdt`
mit ToC-Kennzeichnung bzw. das `w:fldChar`/`w:instrText`-Tripel mit `TOC`-Instruktion;
ODT: `text:table-of-content`) **als Verzeichnis erkennen** und in das interne
Verzeichnis-Element überführen (Feld-Charakter erhalten). **Mindestlösung** (untere
Schranke, verletzt Abschnitt 18 nicht mehr): den nicht rekonstruierbaren Verzeichnisblock
in `unsupported_block` aufnehmen bzw. — wie bei `text:section` (`odt/reader.ts:277`) — die
Eintrags-Absätze aus `text:index-body`/`sdtContent` **entpacken**, statt zu verwerfen.
**Idealziel:** als echtes, aktualisierbares Verzeichnis-Element zurückgewinnen. Wird die
Erkennung nicht mindestens auf der Mindestlösung-Stufe gebaut, ist der Import-Pfad
(Abschnitt 5.2 Punkte 7–8, Abschnitt 5.1 Punkte 3–4) nicht erfüllbar und der Status darf
**nicht** auf „vorhanden" gesetzt werden (Abschnitt 8).

### 0.3 Konsequenz für die Verifikationsreihenfolge

Bis Vorbedingung A umgesetzt ist, lässt sich „aktualisieren" nicht gegen eine über die
App selbst erzeugte Datei prüfen. Bis Vorbedingung B umgesetzt ist, lässt es sich nicht
gegen eine echte Word-/LibreOffice-Fremddatei prüfen (das Feld überlebt den Import
nicht bzw. wird verworfen). Diese Datei schließt beide Lücken nicht selbst — sie benennt
sie, damit sie bei der Umsetzungsreihenfolge nicht übersehen werden. Die Kernarbeit
(Feld-Infrastruktur in Reader **und** Writer für beide Formate + die formatunabhängige
Aktualisierungslogik) ist zuerst zu leisten; die reinen Bedien-Feinheiten (F9,
Rückmeldungstexte) sind nachgelagert.

---

## 1. Menüpunkte / Bedienelemente (Soll-Zustand)

| # | Element | Auslösung | Aktueller Stand (Befund) | Soll |
|---|---|---|---|---|
| 1 | Steuerelement „Inhaltsverzeichnis aktualisieren" | Klick, sichtbar sobald der Cursor innerhalb eines ToC-Bereichs steht (Toolbar-Button und/oder Overlay am Verzeichnis) | **Fehlt komplett** (kein Toolbar-Eintrag, kein Overlay, kein Kontextmenü — Befund 4) | Muss ergänzt werden — mindestens ein Button/Overlay, sobald der Cursor im ToC-Bereich steht, mit eindeutigem, eingebettetem SVG-Icon (kein Unicode/Emoji, `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1). |
| 2 | Tastenkombination **F9** | Tastendruck bei Cursor innerhalb eines ToC-Bereichs (Word-/LibreOffice-Standard „Feld aktualisieren") | **Fehlt** (kein `F9` in der `keymap` — Befund 9) | Soll ergänzt werden — direkte Nutzererwartung aus beiden Referenzanwendungen; darf `baseKeymap` nicht stören. |
| 3 | Rechtsklick-Kontextmenü „Felder aktualisieren" auf dem ToC | Rechtsklick auf ein ToC-Element | Fehlt; der Editor hat aktuell überhaupt kein eigenes Kontextmenü | **Nice-to-have, kein Blocker**, sofern Element 1 zuverlässig funktioniert. |
| 4 | Sichtbare Rückmeldung nach dem Klick | — (reine Rückmeldung) | Fehlt (Funktion existiert nicht) | Muss vorhanden sein: mindestens eine kurze visuelle Bestätigung, dass aktualisiert wurde (bzw. dass nichts zu aktualisieren war) — „kein stiller Fehlschlag" (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4). |
| 5 | Auswahl „Nur Seitenzahlen" vs. „Gesamtes Verzeichnis" | Erscheint in Word beim Aktualisieren-Auslösen | Nicht vorhanden | **Offene Entscheidung** (Abschnitt 7): entweder Word-Parität mit Dialog nachbilden, oder bewusst nur eine einzige „Aktualisieren"-Aktion (immer beides), die Abweichung dann dokumentieren. |
| 6 | Automatische Aktualisierung beim Export | — (implizit) | Nicht vorhanden | **Muss vorhanden sein**: unabhängig von einem manuellen Klick darf eine exportierte Datei **niemals** ein Verzeichnis enthalten, das von den zum Exportzeitpunkt tatsächlich vorhandenen Überschriften abweicht (Abschnitt 3.2, Punkt 2). |
| 7 | Eintrag in einer künftigen Menüleiste („Referenzen"-Gruppe) | Klick | Nicht anwendbar — App hat nur eine Toolbar, keine Menüleiste | Falls später eine Menüleiste/„Referenzen"-Gruppe eingeführt wird, dort ebenfalls anbieten; **kein Blocker**. |

---

## 2. Geltende Randbedingungen aus der Haupt-Spezifikation

Diese Datei ergänzt `FEATURE-SPEC-DOCX-ODT.md`, ersetzt sie nicht. Insbesondere gelten:

- **Abschnitt 10, Testfall 2** („Überschrift nachträglich umbenennen/hinzufügen →
  ‚Aktualisieren' spiegelt Änderung wider") — die Kernanforderung, die diese Datei im
  Detail spezifiziert.
- **Abschnitt 10, Testfall 6** („Rundreise: ToC exportieren, reimportieren → weiterhin
  als ToC erkannt, nicht als normaler Text zerfallen") — gilt nach **jeder**
  Aktualisierung, nicht nur im Ausgangszustand.
- **Abschnitt 17, Zeile 9** („Inhaltsverzeichnis einfügen/aktualisieren — fehlt").
- **Abschnitt 18 (Import-Robustheit)** — Prinzip „kein stiller Datenverlust": ein in
  einer Fremddatei enthaltenes ToC-Feld darf beim Import nicht ersatzlos verschwinden.
  Der aktuelle Reader verletzt das nachweislich (Befund 5b/7: Totalverlust bei
  block-level-`w:sdt`-DOCX und bei ODT-`text:table-of-content`) — genau das adressiert
  Vorbedingung B.
- **Abschnitt 19 (Export-Robustheit & Rundreise)** und **Abschnitt 20.4 (kein stiller
  Fehlschlag)** gelten uneingeschränkt.
- **Abschnitt 2 (Selection-Sync-Regression)** — Klick auf ein Aktualisieren-Steuerelement
  gefolgt von einem Neupositionierungs-Klick ist strukturell derselbe Verdachtsfall und
  ist mit derselben Regressionssequenz abzusichern (Grenzfall 9).
- **Abschnitt 4, Testfälle 2/3 (Absatzformat)** — der Wechsel Überschrift ↔ Standardabsatz
  über `setHeading` ist der Haupttrigger, den „aktualisieren" nachvollziehen muss
  (Abschnitt 3.3).

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Ausgangslage
„Aktualisieren" setzt voraus, dass im Dokument (mindestens) ein
Inhaltsverzeichnis-Element existiert — entweder durch „einfügen" in dieser App erzeugt
(Vorbedingung A) **oder** als aus einer Fremddatei importiertes, vom Reader wieder als
Feld erkanntes Verzeichnis (Vorbedingung B). Sind beide Vorbedingungen erfüllt, müssen
beide Ursprungsarten von „aktualisieren" **gleich** behandelt werden — kein
funktionaler Unterschied „hausgemacht vs. importiert". Solange Vorbedingung B nicht
umgesetzt ist, liegt nach dem Import **kein** aktualisierbares Verzeichnis-Element mehr
vor (Befund 5/7: verworfen bzw. zu formlosem Absatztext verflacht); dieser Zustand ist
kein akzeptables Endergebnis, sondern der zu behebende Ausgangspunkt.

### 3.2 Auslöser der Aktualisierung
Drei voneinander unabhängige Auslöser, alle zu unterstützen:

1. **Manuell** — Klick auf Button/Overlay/Kontextmenü (Abschnitt 1, Elemente 1/3) bzw.
   `F9` bei Cursor im ToC-Bereich.
2. **Implizit beim Export** — unmittelbar vor dem Serialisieren nach DOCX/ODT wird das
   Verzeichnis in jedem Fall mit dem tatsächlichen aktuellen Überschriften-Zustand
   abgeglichen, **unabhängig** davon, ob zwischenzeitlich manuell aktualisiert wurde.
   Begründung: Ein Export darf nie ein sichtbar veraltetes Verzeichnis enthalten — das
   wäre ein stiller Konsistenzfehler, den die Nutzerin nach dem Verlassen der App nicht
   mehr beheben kann. **Abgrenzung:** Dieser implizite Abgleich betrifft ausschließlich
   das **Aktualisieren eines vorhandenen** Verzeichnisses. Er darf **niemals** ein
   Verzeichnis „aus dem Nichts" erzeugen, wenn keines vorhanden ist (Regressionsschutz,
   Abschnitt 5.1, Punkte 1–2).
3. **Bewusst NICHT bei jedem Tastenanschlag** — eine Aktualisierung pro Tastendruck in
   einer Überschrift wäre performanceschädlich (Grenzfall 6) und ließe unfertig getippte
   Überschriften sofort (ggf. flackernd) erscheinen. Eine optionale „live"-Aktualisierung
   mit sinnvollem Debounce ist **zulässig, aber kein Muss**; verpflichtend sind nur die
   Auslöser 1 und 2.

### 3.3 Erkennung von Überschriften-Änderungen
„Aktualisieren" muss seit der letzten Berechnung erfassen:

- **Neue Überschrift** (an beliebiger Position) → neuer Eintrag an der richtigen Stelle.
- **Gelöschte Überschrift** → Eintrag verschwindet, keine „Geister-Einträge".
- **Umbenannte Überschrift** → Eintragstext ändert sich zeichengenau (inkl. Umlauten,
  Sonderzeichen, Emoji).
- **Geänderte Ebene** (z. B. Überschrift 2 → 1 über das Absatzformat-Dropdown/`setHeading`)
  → Eintrag wandert auf die andere Einrückungsebene.
- **Geänderte Reihenfolge** (Ausschneiden/Einfügen o. Ä.) → Verzeichnis folgt der
  **tatsächlichen Dokumentreihenfolge** (Auftreten im `doc`), nicht einer früher
  berechneten Reihenfolge.
- **Überschrift → Standardabsatz** (`setHeading(null)`) → Eintrag verschwindet vollständig.
- **Standardabsatz → Überschrift** (`setHeading(level)`) → neuer Eintrag.

Die Sammlung muss das **gesamte** `doc` durchlaufen (analog zur Anforderung an „einfügen",
`inhaltsverzeichnis-einfuegen-req.md` Abschnitt 2.3), nicht nur den Cursor-Vorfahrenpfad,
den `currentHeadingLevel()` (`Toolbar.tsx`) abdeckt.

### 3.4 Aktualisierungsumfang
Bei jeder Aktualisierung werden — sofern kein Auswahldialog (Element 5) angeboten wird —
**beide** Aspekte gemeinsam neu berechnet: (1) Struktur/Text/Ebene der Einträge (3.3) und
(2) Seitenzahlen (3.7). Wird der Dialog „Nur Seitenzahlen" vs. „Gesamtes Verzeichnis"
angeboten (Word-Parität), muss „Nur Seitenzahlen" Struktur/Reihenfolge/Text der Einträge
unangetastet lassen, selbst wenn zwischenzeitlich Überschriften geändert wurden — das ist
in Word bewusst so und **kein** Fehler dieser App.

### 3.5 Einträge-Tiefe / Filterung
Die beim Einfügen (Vorbedingung A) gewählte maximale Ebene wird bei jeder Aktualisierung
**respektiert**, nicht zurückgesetzt:

- Konfigurierte Tiefe „bis Ebene 3" → eine nachträglich hinzugefügte Ebene-4-Überschrift
  nimmt **nicht** teil.
- Wird eine bislang außerhalb liegende Überschrift auf eine eingeschlossene Ebene
  **hochgestuft** (z. B. Ebene 4 → 2), erscheint sie ab der nächsten Aktualisierung.
- Die konfigurierte Tiefe selbst ändert „aktualisieren" **nicht** (dafür gibt es, falls
  vorhanden, eine separate Einstellung, nicht Teil dieser Datei).

### 3.6 Formatierung der Einträge
- Einrückung entspricht der Überschriften-Ebene (Ebene 1 am wenigsten eingerückt),
  konsistent mit den eingebauten ToC-Formatvorlagen von Word/LibreOffice.
- **Word-/LibreOffice-Parität, zu dokumentieren:** Wird der Text eines ToC-Eintrags
  direkt im Verzeichnis manuell überschrieben (ohne die Überschrift zu ändern),
  **überschreibt** die nächste Aktualisierung diese manuelle Änderung kommentarlos mit
  dem aus der Überschrift neu berechneten Text — exakt wie in Word/LibreOffice. Dieses
  Verhalten ist beizubehalten (**kein** Bug), muss aber in der UI erkennbar gemacht
  werden (deutliche Kennzeichnung des Bereichs als „automatisch generiert; direkt hier
  eingegebene Änderungen gehen beim Aktualisieren verloren"), damit es nicht als
  überraschender Datenverlust erlebt wird (Grenzfall 13). Ob der Klartext der Überschrift
  genügt oder Inline-Formatierung mitkopiert wird, ist konsistent zu
  `inhaltsverzeichnis-einfuegen-req.md` (Abschnitt 2.3: reine Textübernahme als
  Sollverhalten) zu halten. Ein `hard_break` innerhalb einer Überschrift wird dabei zu
  einem einzelnen Leerzeichen (kein mehrzeiliger Eintrag), ebenfalls konsistent zu
  „einfügen" Abschnitt 2.3.

### 3.7 Seitenzahlen in Einträgen
- **Beim Export als echtes Feld** (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 10): Die
  tatsächliche Seitenzahl berechnet — wie bei jedem echten Word-`TOC`-Feld/ODF-
  `text:table-of-content` — letztlich die **Zielanwendung** beim Öffnen/Drucken.
  Salamanido muss also keine perfekte Seitenzahl vorausberechnen; es genügt ein
  gültiges, aktualisierbares Feld mit plausiblem, zuletzt berechnetem Platzhalterwert als
  gecachtem Anzeigetext.
- **In der eigenen Editor-Vorschau:** `computePageCount`/`computePageBreakIndices`
  (Befund 10) **können** genutzt werden, um jeder Überschrift eine editor-interne
  Näherungs-Seitenzahl zuzuordnen (Zählen der `breakIndices` unterhalb ihres
  Top-Level-Index, +1). Diese Zahl ist **explizit als Näherung der eigenen Anzeige** zu
  behandeln, nicht als Garantie, dass Word/LibreOffice dieselbe Zahl zeigt (andere
  Schriftmetrik/Randberechnung, viewport-/zoomabhängig). Diese Differenz ist zu
  dokumentieren, **nicht** als Bug zu werten — vorausgesetzt, das exportierte Feld ist
  ein echtes, neu berechenbares Feld und nicht hartkodierter Text (das wäre ein Bug,
  Abschnitt 10 der Hauptspez).
- Überschriften, die strukturell nicht auf Dokument-Top-Level liegen (laut Schema
  möglich: `list_item` hat `block+`, Tabellenzellen `block+` — Befund 1), sind ein
  dokumentierter Grenzfall der Seitenzahl-Näherung (Grenzfall 4); mindestens darf ein
  solcher Fall die Berechnung nicht zum Absturz bringen.

### 3.8 Zusammenspiel mit der Klick-Navigation und den Ankern
Die Klick-Navigation selbst gehört zu „einfügen"; „aktualisieren" darf aber bestehende
Navigations-/Sprung-Anker nicht verwaisen lassen. Zu beachten ist die **Format-Asymmetrie**
(dokumentiert in `inhaltsverzeichnis-einfuegen-req.md` Abschnitt 1, Nr. 8): DOCX benötigt
`w:bookmarkStart`/`w:bookmarkEnd` + `w:hyperlink w:anchor="_Toc…"`; reale
LibreOffice-Verzeichnisse verlinken über die native, **textbasierte** Fragment-Syntax
`#<Überschriftentext>|outline` (in `test1.odt` beobachtet), ohne Bookmark.

- Umbenennen → DOCX-Anker (id-basiert) bleibt auf **derselben** Überschrift (Text ändert
  sich, Ziel nicht). Beim textbasierten ODT-Sprungziel ändert sich das Fragment mit dem
  Text mit — das ist die native ODF-Mechanik und in Kauf zu nehmen.
- Löschen → Eintrag inkl. Anker vollständig entfernt, kein toter Verweis.
- Verschieben → Anker folgt der Überschrift an ihre neue Position.
- Zwei Überschriften mit identischem Text referenzieren jeweils die **eigene** Instanz,
  nicht immer die erste Fundstelle (Grenzfall 8). Für DOCX über eindeutige `_Toc…`-Ids
  herstellbar; die textbasierte ODT-`|outline`-Navigation ist bei gleichlautenden
  Überschriften **mehrdeutig** — die Einschränkung ist zu dokumentieren, darf aber nicht
  stillschweigend zu falschem Sprungverhalten führen.

### 3.9 Feld-Charakter beim Export
- Nach einer Aktualisierung bleibt das Verzeichnis beim Export **ein echtes Feld** (DOCX:
  `w:sdt`/Feld-Tripel mit `w:instrText`; ODT: `text:table-of-content` mit
  `text:table-of-content-source`). Die Aktualisierung ersetzt nur den gecachten
  Anzeigetext zwischen den Feld-Markern (DOCX) bzw. den Inhalt von `text:index-body`
  (ODT), **nicht** die Feld-Definition.
- Für DOCX ist zu entscheiden und zu dokumentieren, ob `w:dirty` am `w:fldChar` gesetzt
  wird (signalisiert Word, das Feld beim nächsten Öffnen selbst neu zu berechnen); beide
  Varianten sind akzeptabel, solange die Wahl dokumentiert ist (Abschnitt 7).

### 3.10 Undo/Redo
- Eine **manuelle** Aktualisierung ist **ein einziger** Undo-Schritt; Redo stellt den
  aktualisierten Zustand identisch wieder her.
- Undo einer Aktualisierung darf **nicht** die zugrunde liegenden Überschriften-Änderungen
  rückgängig machen — nur die Verzeichnis-Neuberechnung wird zurückgenommen, der übrige
  Dokumentinhalt bleibt unberührt.
- Die **implizite** Export-Aktualisierung (3.2, Punkt 2) darf den sichtbaren
  Editor-Zustand/Undo-Stack nicht in einen überraschenden Zustand versetzen; ihr genaues
  Undo-Verhalten ist zu definieren (Abschnitt 7).

### 3.11 Rückmeldeverhalten (kein stiller Fehlschlag)
- Klick auf „Aktualisieren", während **kein** Verzeichnis vorhanden ist: sichtbare
  Rückmeldung statt wirkungslosem Klick — entweder Hinweis („Kein Inhaltsverzeichnis im
  Dokument gefunden") oder, falls so spezifiziert, automatisches Anlegen an der
  Cursor-Position. Die Wahl ist festzulegen und zu dokumentieren (Abschnitt 7).
- Enthält das Dokument nach der Aktualisierung **keine** einschließbare Überschrift mehr,
  wird das Verzeichnis sichtbar als leer dargestellt (z. B. Platzhalter „Keine
  Überschriften gefunden") statt den alten (jetzt falschen) Stand zu behalten oder
  ersatzlos zu verschwinden.

---

## 4. Grenzfälle (müssen explizit geprüft werden)

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 1 | Aktualisieren bei einem Dokument ganz ohne Überschriften | Verzeichnis wird sichtbar leer/mit Platzhalter dargestellt; kein Absturz; kein stiller Verbleib des alten Inhalts (3.11). |
| 2 | Aktualisieren, obwohl gar kein ToC-Element vorhanden ist | Sichtbare Rückmeldung statt wirkungslosem Klick (3.11). |
| 3 | Zwei (oder mehr) unabhängige Verzeichnisse im selben Dokument | Jedes für sich aktualisierbar; Aktualisieren des einen verändert das andere **nicht** (Text/Struktur/Anker). |
| 4 | Überschrift innerhalb einer Tabellenzelle oder eines Listenpunkts (laut Schema möglich, 3.7) | Definiertes, dokumentiertes Verhalten (einschließen mit ggf. ungenauer Seitenzahl-Näherung **oder** bewusst ausschließen) — in jedem Fall kein Crash. |
| 5 | Konfigurierte Tiefe „bis Ebene 3", nachträglich Ebene-5-Überschrift ergänzt | Ebene-5-Überschrift bleibt außerhalb; die konfigurierte Tiefe bleibt „3" (3.5). |
| 6 | Sehr viele Überschriften (z. B. 200 in langem Dokument) | Aktualisierung bleibt in vertretbarer Zeit; UI bleibt reaktionsfähig (kein Einfrieren), vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.2. |
| 7 | Überschrift ohne Text (leerer Absatz mit Überschriften-Formatvorlage) | Definiertes, dokumentiertes Verhalten (leerer Eintrag **oder** bewusst ausgelassen), konsistent mit der Zielanwendung bzw. explizit begründete Abweichung; konsistent zu `inhaltsverzeichnis-einfuegen-req.md` Grenzfall 20. |
| 8 | Mehrere Überschriften mit identischem Text | Getrennte Einträge; Anker/Navigation referenzieren die jeweils **eigene** Instanz, nicht die erste Fundstelle (3.8). ODT-`|outline`-Mehrdeutigkeit dokumentieren (konsistent zu `inhaltsverzeichnis-einfuegen-req.md` Grenzfall 21). |
| 9 | Klick „Aktualisieren" → danach Klick zum Neupositionieren des Cursors im Haupttext (Selection-Sync-Regression, Hauptspez Abschnitt 2) | **Pflicht-Testsequenz:** Aktualisieren darf die interne Selektion nicht inkonsistent machen; nachfolgendes Tippen darf nichts Falsches löschen/ersetzen. |
| 10 | Aktualisieren, während der Cursor mitten in einer gerade bearbeiteten Überschrift steht | Definiertes Verhalten (aktueller Zwischenstand wird übernommen **oder** Fokuswechsel wird abgewartet), konsistent und nicht zufällig vom Tastentiming abhängig (Abschnitt 7). |
| 11 | Strg+Z einer Überschriften-Umbenennung, danach „Aktualisieren" | Verzeichnis spiegelt den **tatsächlichen** (durch Undo zurückgesetzten) Text, nicht einen zwischengespeicherten Stand vor dem Undo. |
| 12 | Import einer echten Word-DOCX/LibreOffice-ODT mit vorhandenem ToC-Feld, danach Überschrift ändern + „Aktualisieren" | Setzt Vorbedingung B voraus. **Ohne** sie ist der Ist-Zustand ein **verifizierter Verlust** (Befund 5/7): ODT und DOCX-`w:sdt` → komplett verworfen, DOCX-Klassik → formloser Absatztext ohne Feld-Charakter. Es existiert dann kein aktualisierbares Verzeichnis; dieser Zustand ist zu verifizieren und als zu behebende Lücke zu dokumentieren, nicht als „funktioniert". **Mit** Vorbedingung B: identisch zu einem in Salamanido erzeugten Verzeichnis (3.1). |
| 13 | Nutzerin überschreibt einen Eintragstext manuell und klickt danach „Aktualisieren" | Manuelle Änderung geht verloren, Eintrag wird aus der Überschrift neu berechnet — bewusstes, dokumentiertes Word-Parität-Verhalten (3.6); UI muss den Bereich vorher erkennbar als automatisch generiert kennzeichnen. |
| 14 | Ebenensprung (Ebene-1-Überschrift direkt gefolgt von Ebene-4, ohne 2/3 dazwischen) | Einrückung folgt der jeweiligen Ebene (Ebene 4 stärker eingerückt); **keine** künstlichen Zwischenebenen-Einträge erzeugt. |
| 15 | Löschen einer Überschrift, die zuvor Sprungziel war, dann „Aktualisieren" | Eintrag inkl. Anker verschwindet vollständig; kein toter Verweis, kein Absturz bei einem evtl. noch gecachten Sprungziel. |
| 16 | Überschriftentext mit Sonderzeichen/Umlauten/Emoji/`&`/`<`/`"`/`|` | Zeichengenau im Eintrag übernommen; XML-Escaping bricht weder DOCX-Bookmark-Namen/-Feldsyntax noch das ODT-`|outline`-Fragment (konsistent zu `inhaltsverzeichnis-einfuegen-req.md` Grenzfall 14). |

---

## 5. Rundreise-Anforderung

Zwei getrennte, beide verpflichtende Prüfungen — Methodik analog `seitenumbruch-req.md`
Abschnitt 5 und `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19.

### 5.1 Baseline-Rundreise (Regressionsschutz — darf durch die neue Funktion nicht brechen)
1. Reale DOCX-Datei **ohne** jedes Verzeichnis unverändert hochladen (kein Klick, keine
   Eingabe) → sofort exportieren → erneut importieren → inhaltlich identisch;
   insbesondere entsteht **kein** Verzeichnis „aus dem Nichts" (kein versehentliches
   Anlegen beim impliziten Export-Abgleich, 3.2 Punkt 2).
2. Dasselbe mit einer realen ODT-Datei.
3. Reale DOCX mit echtem Word-ToC-Feld unverändert hochladen (kein „Aktualisieren") →
   exportieren → reimportieren → das Verzeichnis bleibt inhaltlich **und als Feld** (nicht
   als degradierter Text/verworfen) erhalten. **Achtung:** Dieser Punkt ist erst nach
   Vorbedingung B erfüllbar; solange der Reader das Feld verflacht (Befund 5a) bzw.
   verwirft (Befund 5b), ist er der zu behebende Ausgangszustand, nicht die Abnahme.
   Fixture-Hinweis: Im DOCX-Korpus existiert **keine** reale ToC-Datei (Befund 11) — eine
   ist zu beschaffen bzw. synthetisch zu bauen (5.2 Punkt 7 / Abschnitt 6 Punkt 8).
4. Dasselbe mit realer LibreOffice-ODT mit vorhandenem `text:table-of-content`.
   Fixture-Hinweis: **bereits vorhanden** — `test1.odt` (Pflicht), `compdocfileformat.odt`
   (zweite), `excelfileformat.odt` (~7 MB, optional). Es muss **keine** neue ODT-Fixture
   beschafft werden.
5. Alle vier Prüfungen bleiben grün, nachdem Schema/Writer/Reader um die neue Funktion
   erweitert wurden (kein neuer Node/kein neues Attribut taucht beim reinen Reimport
   unbeteiligter Dateien ungewollt auf).

### 5.2 Feature-Rundreise (Aktualisieren selbst)
Je Situation: Überschriften ändern → Verzeichnis über Toolbar/`F9`/Export-Trigger
aktualisieren → als DOCX exportieren → reimportieren → aktualisierter Inhalt **und** die
geänderten Überschriften bleiben erhalten; **und** identisch als ODT; **und** zusätzlich
Cross-Format:

1. Vorhandenes Verzeichnis (aus „einfügen" oder importiert) → Überschrift umbenennen →
   aktualisieren → Export DOCX → Reimport → Verzeichnis zeigt den neuen Text, bleibt als
   echtes, aktualisierbares Feld erkennbar (Hauptspez Abschnitt 10, Testfall 6).
2. Dasselbe als ODT.
3. Neue Überschrift hinzufügen → aktualisieren → Rundreise erhält den neuen Eintrag an
   der richtigen Position (DOCX und ODT).
4. Überschrift löschen → aktualisieren → Rundreise zeigt den verkürzten Bestand (DOCX und
   ODT).
5. Cross-Format DOCX → ODT → DOCX: aktualisiertes Verzeichnis bleibt über beide
   Konvertierungen als echtes Feld mit korrektem Inhalt erhalten (keine kumulative
   Verschlechterung).
6. Cross-Format ODT → DOCX → ODT (Gegenrichtung).
7. **Import einer echten Word-DOCX** mit vorhandenem ToC-Feld und mehreren Überschriften
   → in Salamanido eine Überschrift umbenennen und eine hinzufügen → „Aktualisieren" →
   Export → Reimport → Verzeichnis spiegelt beide Änderungen, bleibt als Feld erkennbar.
   (Setzt Vorbedingung B voraus. Fixture ist neu zu beschaffen/synthetisch zu bauen —
   Befund 11.)
8. Dasselbe mit echter LibreOffice-ODT — **Fixture bereits im Korpus** (`test1.odt`,
   `compdocfileformat.odt`).
9. Dokument mit zwei unabhängigen Verzeichnissen (Grenzfall 3) → nur eines aktualisieren →
   Rundreise bestätigt, dass nur dieses verändert wurde.

**Abnahmekriterium:** Formatierungs-/Layout-Nuancen und leichte Abweichungen der intern
berechneten Seitenzahl-Näherung (3.7) bei Cross-Format sind zu dokumentieren und
akzeptabel; **das Verschwinden eines Verzeichnisses, eines Eintrags, des Feld-Charakters
oder von Überschriften-Text ist es nicht** — weder bei 5.1 noch bei 5.2.

---

## 6. Testplan-Hinweise (Unit + E2E, Playwright)

1. **Unit DOCX (Writer):** internes ToC-Element + Überschriften-Satz → gültige
   `w:sdt`/Feld-Tripel-Struktur mit korrektem `w:instrText` (`TOC \o "1-<Tiefe>" \h \z \u`
   o. ä.) und korrektem Anzeigetext zwischen den Feld-Markern.
2. **Unit DOCX (Reader — Vorbedingung B):** XML mit vorhandenem TOC-Feld → Reader erzeugt
   das interne Verzeichnis-Element mit korrekt erkannten Einträgen (nicht nur verflachten
   Absätzen, nicht verworfen). **Beide Feld-Formen abdecken:** (a) klassisches Feld-Tripel
   mit Eintrags-`<w:p>` als Body-Kinder, (b) block-level `<w:sdt>`-Wrapper. Ergänzend ein
   bewusster Negativ-/Regressionstest, der die heutigen Verlust-Pfade (Befund 5a
   Verflachung, Befund 5b Totalverlust) dokumentiert, bis B umgesetzt ist.
3. **Unit ODT (Writer/Reader):** analog — Writer erzeugt `text:table-of-content` mit
   `text:table-of-content-source` (korrekte `text:outline-level`-Obergrenze) und
   befülltem `text:index-body`; Reader erkennt ein vorhandenes `text:table-of-content`
   (Vorbedingung B) und verwirft es **nicht** mehr (heute: `return []`, `reader.ts:323` —
   Befund 7). Testfixtures **real vorhanden**: `test1.odt`, `compdocfileformat.odt`.
4. **Unit „Aktualisieren"-Logik (formatunabhängig):** ProseMirror-`doc` mit `heading`-Set
   und veraltetem ToC-Element → Aufruf der Aktualisierungsfunktion → resultierendes Element
   enthält exakt die aktuellen Überschriften in Dokumentreihenfolge mit korrekten Ebenen —
   rein auf Datenmodell-Ebene, unabhängig von Reader/Writer (analog zur Trennung in
   `src/formats/shared/__tests__`).
5. **E2E (Playwright):** Dokument mit vorhandenem Verzeichnis öffnen, eine Überschrift per
   Toolbar/Tippen ändern, „Aktualisieren"-Button klicken bzw. `F9` → im DOM sichtbarer
   Verzeichnistext ändert sich entsprechend.
6. **Regressionstest-Pflicht (Selection-Sync):** jeder E2E-Test aus Punkt 5 führt direkt
   danach eine Tipp-/Formatierungsaktion im Haupttext aus und prüft deren korrektes
   Ergebnis (Grenzfall 9, Hauptspez Abschnitt 2) — nicht nur den Zustand direkt nach dem
   Klick.
7. **Export-Trigger-Test:** Dokument mit absichtlich veraltetem Verzeichnis (Überschrift
   nach der letzten manuellen Aktualisierung geändert) **ohne** vorherigen Klick
   exportieren → exportierte Datei enthält dennoch den aktuellen Stand (3.2, Punkt 2).
   Eigener Testfall, da dieser Auslöser leicht vergessen wird.
8. **Reale Test-Fixtures:** Für **ODT bereits vorhanden** (`test1.odt`,
   `compdocfileformat.odt` — Befund 11), direkt zu nutzen; keine Neubeschaffung nötig. Für
   **DOCX neu anzulegen**, da der Korpus **keine** ToC-Datei enthält (Befund 11): eine
   synthetische Fixture in **beiden** Feld-Formen (klassisch **und** block-level `w:sdt`),
   zusätzlich empfohlen eine echte, mit Microsoft Word erzeugte `.docx` mit `TOC`-Feld.
   Rein synthetisch konstruiertes XML allein deckt reale Eigenheiten (exaktes
   `w:instrText`-Format, verschachtelte `w:sdt`-Struktur, „TOC N"-Absatzstile) nur
   teilweise ab (Prinzip wie `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18).
9. **Rundreise-Tests (Abschnitt 5):** sowohl als Unit-Tests gegen Reader/Writer **als
   auch** als E2E über echte Bedienung (Toolbar/`F9` → echter Datei-Download via
   `page.waitForEvent('download')` → echter Re-Upload via `filechooser`). Reine
   Unit-Tests mit direkt konstruierten JSON-Fixtures reichen nicht aus (Hauptspez
   Abschnitt 17/21).

---

## 7. Offene Entscheidungen (vor Abnahme zu beantworten und hier nachzutragen)

Diese Punkte sind bewusst offen; jeder ist vor der Freigabe zu entscheiden, umzusetzen
und das Ergebnis **hier** zu dokumentieren (nicht stillschweigend implizit zu lassen):

1. **Datenmodell des Verzeichnisses** — eigener `toc`-Node im Schema vs. Attribut-Marker
   auf einer Absatzgruppe vs. Editor-Zustand außerhalb des Docs. Diese Entscheidung wird
   gemeinsam mit „einfügen" getroffen (`inhaltsverzeichnis-einfuegen-req.md` Abschnitt 2.9
   sowie Abnahmeliste Abschnitt 6, Punkt 12) und gilt hier unverändert.
2. **Umfang der Aktualisierung** — ein einziger „Aktualisieren"-Befehl (immer Struktur +
   Seitenzahlen) vs. Word-Dialog „Nur Seitenzahlen / Gesamtes Verzeichnis" (Element 5,
   3.4).
3. **`w:dirty` beim DOCX-Export** — setzen oder nicht (3.9), mit Begründung.
4. **Verhalten ohne vorhandenes Verzeichnis** — Hinweis anzeigen vs. neues Verzeichnis
   automatisch anlegen (3.11, Grenzfall 2).
5. **Aktualisieren bei Cursor in einer laufenden Überschrift** — Zwischenstand übernehmen
   vs. Fokuswechsel abwarten (Grenzfall 10).
6. **Undo-Verhalten der impliziten Export-Aktualisierung** (3.10).
7. **Einschluss/Ausschluss von Überschriften in Tabellenzellen/Listenpunkten** und deren
   Seitenzahl-Näherung (3.7, Grenzfall 4).
8. **Mindestlösung vs. Idealziel für Vorbedingung B** — reicht zur Freigabe das
   verlustfreie Erhalten (Entpacken/`unsupported_block`) oder ist die vollständige
   Rückgewinnung als aktualisierbares Feld verlangt (0.2)?

---

## 8. Freigabekriterium für „vorhanden" (Definition of Done)

Der Backlog-Status von `inhaltsverzeichnis-aktualisieren` darf erst dann als **vorhanden**
(unqualifiziert) gelten, wenn:

- **Vorbedingung A** (Schwester-Feature „einfügen" liefert wiedererkennbares Element +
  gespeicherte Konfiguration + echtes Export-Feld, 0.1) erfüllt ist **oder** die
  Verifikation ausdrücklich und protokolliert auf importierte Fremddateien beschränkt
  wurde;
- **Vorbedingung B** (Reader erkennt ein vorhandenes ToC-Feld/-Element und erhält seinen
  Feld-Charakter — mindestens verlustfrei, 0.2) erfüllt ist — andernfalls sind die
  Import-Pfade (5.1 Punkte 3–4, 5.2 Punkte 7–8) nachweislich nicht erfüllbar und der
  Status bleibt **teilweise**; insbesondere sind die heute verifizierten Totalverluste
  (ODT-`text:table-of-content`, block-level-`w:sdt`-DOCX — Befund 5b/7) behoben;
- alle Bedienelemente aus Abschnitt 1 existieren und funktionieren (mindestens
  Button/Overlay, `F9`, sichtbare Rückmeldung, Export-Trigger);
- alle Testfälle aus Abschnitt 6 automatisiert vorliegen und grün sind, inklusive der
  neu anzulegenden DOCX-Fixture (beide Feld-Formen) und unter Nutzung der bereits
  vorhandenen ODT-Fixtures (`test1.odt`, `compdocfileformat.odt` — Punkt 8);
- die Grenzfälle aus Abschnitt 4 einzeln befundet sind (funktioniert wie spezifiziert /
  bewusst abweichendes, dokumentiertes Verhalten / repariert);
- Abschnitt 5.1 (Baseline) durch die neue Funktion nicht gebrochen wurde und Abschnitt 5.2
  (Feature) für DOCX, ODT und beide Cross-Format-Richtungen besteht;
- der Selection-Sync-Regressionstest (Hauptspez Abschnitt 2) mit einer Aktualisieren-Klick-
  Sequenz nachgestellt und grün ist (Grenzfall 9);
- **alle offenen Entscheidungen aus Abschnitt 7 beantwortet und hier nachgetragen** sind.

Andernfalls ist der Status auf **teilweise** zu setzen und die konkret fehlenden
Teilpunkte sind hier nachzutragen (analog `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21 und
`seitenumbruch-req.md` Abschnitt 7).
