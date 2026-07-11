# Anforderungsspezifikation: Feature „Inhaltsverzeichnis einfügen“

Status: **Kern-Feature fehlt vollständig (bestätigt) — nicht vertrauenswürdig, bis über
echte Browser-Bedienung nachgewiesen.** Der Einfüge-Weg (Toolbar-Button, Options-Dialog,
Generierungs-Command, ToC-Schema-Node, Export als echtes Feld, Klick-Navigation) existiert
im Code **nirgends**. Gleichzeitig ist der Import-Pfad seit der Erst-Erfassung dieser Datei
gewachsen und darf **nicht** mehr pauschal als „keinerlei Feld-/Bookmark-Infrastruktur, null
Treffer“ beschrieben werden (frühere Fassung dieser Datei tat das — die Behauptung ist heute
teilweise falsch, siehe Verifikationsnotiz und Ist-Stand-Tabelle). Laut
`specs/FEATURE-BACKLOG.md` Abschnitt 5.1 („Verzeichnisse“, Slug `inhaltsverzeichnis-einfuegen`,
Zeile 309) als **fehlt** geführt (Priorität 1/essenziell), Beschreibung dort: „Generiert
automatisch ein Verzeichnis aus vorhandenen Überschriften.“ `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 10 und Abschnitt 17 (Zeile 362) bestätigen unabhängig: „Laut Plan Teil von Phase 3
— noch nicht begonnen“.

## Verifikationsnotiz (direkte Code-/Fixture-Durchsicht am 2026-07-05)

Diese Fassung beruht auf einer erneuten, direkten Durchsicht des tatsächlichen Repos
(`E:\docs`, **ein Git-Repo**, Branch `main` — eine frühere Fassung behauptete fälschlich
„kein Git-Repo“, korrigiert) — nicht auf der Übernahme einer früheren Fassung. Geprüft mit
`grep`/Datei-Lektüre **und** mit tatsächlichem Entpacken der ZIP-basierten Fixtures
(`unzip -p … content.xml`/`word/document.xml`), da ein reiner Datei-`grep` in DOCX/ODT
prinzipbedingt **null** Treffer liefert (der Inhalt liegt komprimiert im Zip — eine
naheliegende Fehlerquelle für frühere „0 Treffer“-Aussagen). Alle Zeilennummern der
Ist-Stand-Tabelle wurden bei dieser Durchsicht erneut geöffnet und **direkt bestätigt**
(u. a. `schema.ts:26–38`/`92–113`, `Toolbar.tsx:284`, `docx/reader.ts:53–73`/`69`/`73`/
`194`/`205`/`209–212`/`464`/`473`/`478`, `odt/reader.ts:257`/`276`/`323`,
`odt/writer.ts:97`, `docx/writer.ts:122`, `styleDefs.ts:6`/`16`). Zwei Sach-Fehler der
Vorfassung wurden dabei **korrigiert**: (a) „kein Git-Repo“ (siehe oben); (b) die
Dateigröße von `excelfileformat.odt` (Befund 9): **~356 KB auf der Platte**, nicht „~7,2 MB“
— die ~7,2 MB sind die **entpackte** `content.xml` (7.234.152 Byte), was den Grund für die
Unit-Test-Langsamkeit präziser benennt (Parsen einer 7-MB-XML, nicht Dateigröße).

**Zweite, kritische Gegenprüfung dieser Fassung (ebenfalls 2026-07-05, gegen den unveränderten
Code-Stand — keine der referenzierten Zeilennummern hat sich seit der ersten Durchsicht bewegt,
`git log` auf alle zitierten Dateien geprüft):** Jede Fundstelle der Ist-Stand-Tabelle wurde ein
zweites Mal geöffnet und stimmt exakt (inkl. der Fixture-Zählungen 202/127/genau 3/0). Dabei zwei
echte Mängel der vorliegenden Fassung gefunden und behoben, statt sie unverändert zu übernehmen:
(a) Der Verweis auf das Schwester-Feature nannte zweimal „`inhaltsverzeichnis-aktualisieren-req.md`
Abschnitt 0.6“ — dieser Abschnitt **existiert dort nicht** (die Datei hat 0, 0.1, 0.2, 0.3, dann
1–8; direkt nachgeprüft), gemeint war offensichtlich 0.1 („Vorbedingung A“, exakt der zitierte
Inhalt „wiedererkennbares Element, gespeicherte Tiefen-Konfiguration, echtes Exportfeld“) — an
beiden Stellen korrigiert. (b) Seit der Erst-Erfassung dieser Datei sind „Kopieren“
(`specs/kopieren-req.md`, Commit `d65cde0`) und „Ausschneiden“ (`specs/ausschneiden-req.md`,
Commit `9f8fa03`) als echte, verdrahtete Bedienwege hinzugekommen, die eine Überschrift samt
ihren Attributen kopieren/verschieben können — das war beim ersten Schreiben dieser Datei noch
rein hypothetisch und fehlte entsprechend; jetzt als Grenzfall 22 und Testfall 20 ergänzt.

**Bestätigt abwesend (Feature „fehlt“ trifft zu):**
1. **Kein** `toc`/`toc_entry`-Node im Schema (`schema.ts` vollständig gelesen, Node-Liste:
   `doc`, `paragraph`, `heading`, `text`, `hard_break`, `image`, `unsupported_block`,
   `bullet_list`, `ordered_list`, `list_item`, Tabellen-Nodes — kein ToC-Typ, kein
   ToC-/Feld-Attribut).
2. **Kein** `insertTableOfContents`/`collectHeadings`/`toc`-Command in `commands.ts`
   (`grep -i "toc|table-of-content|insertTableOfContents|collectHeadings"` → 0 Treffer).
3. **Kein** Toolbar-Button „Inhaltsverzeichnis“ (`Toolbar.tsx` — 0 Treffer; `insertTable(2, 2)`
   steht weiterhin **direkt** in `Toolbar.tsx:284`, also existiert nicht einmal der als Vorbild
   genannte Tabellen-Dialog).
4. **Kein** Export-Schreibpfad: `docx/writer.ts` enthält **null** Treffer für
   `bookmark`/`fldChar`/`fldSimple`/`instrText`/`w:sdt`/`table-of-content`; `odt/writer.ts`
   enthält **keinen** `text:table-of-content`-`case` (präziser `grep` → 0 Treffer). Die
   Schreibseite hat also tatsächlich keinerlei Feld-/Bookmark-/ToC-Infrastruktur.

**Korrektur früherer „null Treffer“-Absolutaussagen (Import-Pfad ist gewachsen):**
5. `docx/reader.ts` besitzt in `collectRuns` (`reader.ts:194–216`) inzwischen einen Fallback,
   der in `w:hyperlink`, `w:ins`, `w:smartTag`, **`w:fldSimple`** und **`w:sdt`/`w:sdtContent`**
   hineinsteigt und deren sichtbaren Text erhält (`w:del` wird bewusst übersprungen). Die
   frühere Behauptung „`docx/reader.ts` kennt kein `w:fldSimple`/`w:fldChar`-Handling / 0 Treffer
   `fldSimple`“ ist damit **überholt**. (Der **komplexe** Feld-Form-Dreiklang
   `w:fldChar`/`w:instrText` wird nicht eigens rekonstruiert; die reine Feld-Instruktion taucht
   nicht als Störtext auf, weil `w:instrText` nicht als `w:t` gelesen wird.)
6. `odt/reader.ts` kennt `bookmark`/`bookmark-start`/`bookmark-end` als bekannte, leere Marker
   (`EMPTY_REDLINE_MARKER_NAMES`, `reader.ts:80–90`). Die frühere Behauptung „0 Treffer
   `bookmark` in `src/formats/odt`“ ist damit **überholt**.

**Neu verifizierte Grenzfall-Fakten (waren zuvor als „unbekannt/ungetestet“ geführt):**
7. **ODT-Import eines vorhandenen `text:table-of-content` = derzeit stiller Totalverlust.**
   `odt/reader.ts` `elementToBlocks` behandelt nur `text:p`, `text:h`, `text:section`
   (wird entpackt), `draw:frame`, `text:list`, `table:table`; **alles andere** fällt auf
   `return []` (`reader.ts:323`) und wird **ersatzlos verworfen**. `text:table-of-content`
   trifft keinen dieser Fälle → das komplette Verzeichnis samt Eintragstext verschwindet
   beim Import spurlos. Das **verletzt** `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18 („kein
   stiller Datenverlust; sichtbarer Inhalt darf niemals ersatzlos verschwinden“) — anders
   als `text:section`, das genau deshalb bereits eine Entpack-Behandlung bekommen hat.
8. **DOCX-Import eines vorhandenen `TOC`-Feldes hängt von der Feld-Form ab:**
   - Sind die Eintragszeilen **direkte `<w:p>`-Body-Kinder** (klassische Feld-Form mit
     `fldChar`/`instrText` innerhalb der Absätze), bleibt ihr sichtbarer Text als gewöhnliche
     Absätze erhalten (Feld-Charakter geht verloren) — Minimum „kein Totalverlust“ ist erfüllt.
   - Ist das Verzeichnis in ein **block-level `<w:sdt>`** eingewickelt (die moderne
     Word-Standardform), wird es **komplett verworfen**: `readBodyChildren` (`reader.ts:464–485`)
     iteriert die Body-Kinder und behandelt **nur** `w:p` und `w:tbl` — ein block-level `<w:sdt>`
     ist keins von beiden und wird übersprungen. Das ist ebenfalls ein stiller Totalverlust und
     verletzt Abschnitt 18. (Der `w:sdt`-Fallback in `collectRuns` greift nur **innerhalb** eines
     Absatzes auf Run-Ebene, nicht für einen block-level-`<w:sdt>`-Rahmen um mehrere Absätze.)

**Fixture-Bestand (direkt geprüft, entzieht Testfall 14 / Grenzfall 16–17 die „vorher zu
klären“-Unschärfe):**
9. `tests/fixtures/external/odt` = 202 Dateien; per entpackender Durchsicht **jeder**
   `content.xml` enthalten **genau drei** ein echtes `text:table-of-content` (verifiziert,
   nicht stichprobenhaft): `test1.odt` (vollständiges, verschachteltes ToC, geeignetste
   Pflicht-Fixture; `content.xml` ~257 KB), `compdocfileformat.odt` (ebenfalls echt;
   Datei ~55 KB, `content.xml` ~363 KB), `excelfileformat.odt` (Datei nur ~356 KB, aber
   **entpackte `content.xml` ~7,2 MB** → langsam zu parsen, daher nur optional — **nicht**
   wegen der Dateigröße, wie eine frühere Fassung fälschlich behauptete). In `test1.odt`
   ist die native ODF-Sprungsyntax **direkt beobachtet**: `xlink:href="#1.Detailed
   Specification|outline"`, `#1.1.Abstract|outline` usw. — rein textbasiert, ohne Bookmark
   (fundiert Element 8 und Grenzfall 21).
10. `tests/fixtures/external/docx` = 127 Dateien; per entpackender Durchsicht **jeder**
    `word/document.xml` enthält **null** ein `TOC`-Feld (0 Treffer auf ein `instrText…TOC`).
    Immerhin **sieben** Dateien enthalten überhaupt ein `w:instrText` (andere Feldarten,
    z. B. `FieldCodes.docx`/`FldSimple.docx`) — diese eignen sich als **Regressions-Baseline**
    für den heutigen Feld-Verflachungs-Pfad des Readers (sie dürfen weiterhin als Text
    erhalten bleiben und **nicht** fälschlich als Verzeichnis erkannt werden). Grenzfall
    16/Testfall 14 (DOCX) kann daher **nicht** gegen eine vorhandene reale Datei **mit ToC**
    geprüft werden — eine synthetisch gebaute Fixture ist Pflicht, eine echte Word-`.docx`
    mit `TOC`-Feld sollte dem Korpus zusätzlich hinzugefügt werden.

Geltungsbereich: Ausschließlich das **Einfügen** eines neuen Inhaltsverzeichnisses
(Toolbar-Auslöser, Options-Dialog zur Ebenentiefe, automatische Generierung aus den zum
Einfügezeitpunkt vorhandenen Überschriften, Platzierung im Dokument, sofortige
Klick-Navigierbarkeit als Mindestanforderung an ein frisch eingefügtes, überhaupt nutzbares
Verzeichnis) für **beide** Formate, DOCX und ODT — sowohl als neu im Editor erzeugtes Element
als auch beim Export und der anschließenden Rundreise (im Editor erzeugen → unverändert
exportieren → erneut importieren → Ergebnis entspricht inhaltlich dem Original **und** bleibt
als Verzeichnis erkennbar, zerfällt nicht in gewöhnlichen Text). **Zusätzlich** deckt diese
Datei die verlustfreie Behandlung eines **bereits importierten** Verzeichnisses ab (Befunde 7/8)
— denn ein Feature „Inhaltsverzeichnis“ darf nicht ausgeliefert werden, während der Import
desselben Elements sichtbaren Inhalt spurlos verschluckt. Stil und Gliederung orientieren sich
an `E:\docs\FEATURE-SPEC-DOCX-ODT.md`.

**Ausdrücklich außerhalb des Geltungsbereichs** dieser Datei (eigene, separate
Backlog-Einträge in `FEATURE-BACKLOG.md` Abschnitt 5.1, jeweils Status „fehlt“):
- `inhaltsverzeichnis-aktualisieren` (Zeile 310, Priorität 1) — der wiederholte
  Update-Workflow, **nachdem** bereits ein Verzeichnis existiert und sich Überschriften geändert
  haben. Diese Datei fordert nur, dass überhaupt ein sichtbarer, funktionierender Weg zur
  Aktualisierung existieren **muss** (sonst wäre ein frisch eingefügtes Verzeichnis von Anfang
  an eine Sackgasse), behandelt aber die Detail-Grenzfälle des Aktualisierungsvorgangs selbst
  nicht abschließend (vollständig spezifiziert in `inhaltsverzeichnis-aktualisieren-req.md`,
  dort Abschnitt 0.1 („Vorbedingung A“ — **korrigiert**: eine frühere Fassung dieser Datei
  verwies hier fälschlich auf „Abschnitt 0.6“, das es in `inhaltsverzeichnis-aktualisieren-req.md`
  nicht gibt, direkt nachgeprüft): die von „einfügen“ zu liefernden Voraussetzungen — wiedererkennbares
  Element, gespeicherte Tiefen-Konfiguration, echtes Exportfeld).
- `abbildungsverzeichnis` (Zeile 311), `index-eintrag-markieren` (Zeile 312),
  `index-einfuegen` (Zeile 313) — eigenständige Verzeichnis-Arten, nicht Teil dieser Datei.
- `hyperlink-einfuegen`/`-bearbeiten`/`-entfernen` (Backlog 3.5) — allgemeine, frei setzbare
  Links sind ein eigenes Feature; diese Datei behandelt **nur** die intern vom Verzeichnis
  selbst benötigte Sprung-/Anker-Mechanik.
- `seitenzahl-einfuegen` (Backlog 3.7) — eigenständiges Feld-Feature; hier nur insoweit
  berührt, als die Frage „zeigt ein ToC-Eintrag eine Seitenzahl“ von der noch fehlenden
  Seitenzahl-Feld-Infrastruktur abhängt (Grenzfall 15).
- Die Erzeugung von Überschriften selbst (`absatzformat-dropdown`, bereits **vorhanden**) —
  diese Datei setzt voraus, dass Überschriften über das bestehende Absatzformat-Dropdown
  erzeugt werden (`Toolbar.tsx:165–181`, Optionen „Überschrift 1“–„6“).

### Referenzierter Ist-Stand des Codes (Grundlage der Anforderung, **kein** Korrektheitsnachweis)

Zeilennummern Stand 2026-07-05. Fundstellen, die für diese Durchsicht **direkt gelesen** wurden,
sind mit ✓ markiert (bei dieser Fassung wurden **alle** ✓-Zeilen erneut geöffnet und bestätigt);
die übrigen (mit ≈) sind seit einer früheren Durchsicht übernommen und vor der Umsetzung erneut
zu verifizieren, da die Datei nachweislich driftet.

| Ort | Inhalt |
|---|---|
| ✓ `src/formats/shared/schema.ts:26–38` | `heading`-Node, `attrs: { level (1–6), align }`, `defining: true`, **kein** `tocId`/Feld-Attribut. Einzige strukturelle Quelle „vorhandener Überschriften“. **Kein** `toc`/`toc_entry`-Node existiert (Node-Objekt `schema.ts:13–155` vollständig gelesen). Ein eingefügtes Verzeichnis müsste als neuer Node-Typ ins Schema oder als reine Absatz-/Listenstruktur ohne Sonderstatus abgebildet werden — offene Entscheidung (Grenzfall 8/Abschnitt 2.9). |
| ✓ `src/formats/shared/schema.ts:92–113` | **Neu vorhandener** `unsupported_block`-Node (`content: 'block+'`, `attrs: { kind }`) — bereits die etablierte „Fallback statt stillem Drop“-Hülle für nicht interpretierbaren Import-Inhalt (Textbox/Objekt/Chart). **Direkt relevant:** genau dieser Node ist der naheliegende, bereits existierende Behälter, um beim Import ein nicht-rekonstruierbares Verzeichnis (Befund 7/8) verlustfrei aufzunehmen, statt es zu verwerfen. |
| ✓ `src/formats/shared/editor/Toolbar.tsx` | Kein „Inhaltsverzeichnis“/„TOC“-Treffer. `currentHeadingLevel()` (`:114`) und das Absatzformat-`<select>` (`:165–181`) sind der einzige bestehende Mechanismus, um Überschriften zu erzeugen/erkennen — durchläuft aber **nur** den Cursor-Vorfahrenpfad, nicht das gesamte Dokument. Gruppen-Trenner (`w-px h-5 …`) bei `:163/182/189/232/239/275`; eine neue Gruppe „Referenzen“ würde als letzte angehängt. `insertTable(2, 2)` steht direkt bei `:284` (Datei > 284 Zeilen, **nicht** mehr die früher genannten „247“). |
| ✓ `src/formats/shared/editor/commands.ts` | Keine ToC-bezogene Funktion (0 Treffer). Eine neue Volltext-Traversierung über `view.state.doc` (alle `heading`-Knoten in Dokumentreihenfolge) ist zusätzlich nötig — `currentHeadingLevel()` deckt das nicht ab. |
| ≈ `src/app/PrivacyModal.tsx` | Einziges Modal-/Overlay-Muster im Projekt; ein Options-Dialog müsste es als Ausgangspunkt nehmen (Fokus-Falle/Escape/Backdrop-Klick sind **nicht** vorhanden und komplett neu zu bauen). Kein generisches, wiederverwendbares Modal-Grundgerüst existiert. Vor Umsetzung erneut prüfen. |
| ≈ `src/formats/shared/editor/WordEditor.tsx` | Kein `scrollIntoView`/Sprung-Mechanismus; einziger Spezialmechanismus ist `reconcileSelectionOnClick` (`mouseup`-Reconciliation für den Selection-Sync-Bug). Eine „Klick auf ToC-Eintrag springt zur Überschrift“-Funktion (Cursor-Positionierung **und** Scrollen im `overflow-auto`-Container) ist neu zu bauen. Zeilen vor Umsetzung erneut prüfen. |
| ≈ `src/formats/shared/editor/pagination.ts` | Seitenumbrüche werden rein **visuell** über ProseMirror-Decorations aus live gemessenen DOM-Höhen (`getBoundingClientRect`) berechnet, bei jedem View-Update per `requestAnimationFrame` neu. Es gibt **keine** stabile, exportierbare Funktion „auf welcher Seite steht Überschrift X“; das Ergebnis hängt von Fensterbreite/Zoom ab. Direkt relevant für Grenzfall 15 (Seitenzahl in der Editor-Vorschau). |
| ≈ `src/formats/shared/documentModel.ts` | `WordDocumentContent { body, header, footer, meta: { title } }` — kein Feld für ToC-Einstellungen (eingeschlossene Ebenen, Position, letzter Stand). Ein Verzeichnis müsste vollständig innerhalb von `body` (bzw. potenziell `header`/`footer`) leben. |
| ✓ `src/formats/docx/reader.ts:53–73` | `parseStylesXml()`/`headingLevelForStyle()` — liest Überschriften-Ebene robust über `w:outlineLvl` in `styles.xml` (`:60–63`, deckt lokalisierte/benutzerdefinierte Stilnamen ab) **oder** per Regex `^Heading\s?([1-6])$` auf die `w:pStyle`-ID (`:73`). Einzige nutzbare Grundlage, um beim Import Überschriften für ein Verzeichnis zu identifizieren. |
| ✓ `src/formats/docx/reader.ts:194–216` | `collectRuns` steigt in `w:hyperlink`/`w:ins`/`w:smartTag`/`w:fldSimple`/`w:sdt`(→`sdtContent`) hinein und erhält deren Text; `w:del` wird verworfen. **Inline**-Feld-/SDT-Fallback existiert also — die komplexe Feld-Form `w:fldChar`/`w:instrText` wird jedoch **nicht** eigens erkannt/rekonstruiert. |
| ✓ `src/formats/docx/reader.ts:464–485` | `readBodyChildren` iteriert Body-Kinder und behandelt **nur** `w:p` und `w:tbl`. **Block-level `<w:sdt>` wird nicht behandelt** → ein in `<w:sdt>` gewickeltes Word-ToC wird beim Import komplett verworfen (Befund 8, Abschnitt-18-Verletzung). |
| ✓ `src/formats/docx/writer.ts:119–122`, `src/formats/docx/styleDefs.ts:6,16` | Überschriften-Export **immer** mit `w:pStyle="HeadingN"` + `w:outlineLvl` (`styleDefs.ts:16`). Konsistente, vom eigenen Reader **und** von Word auswertbare Grundlage für eine spätere `TOC`-Feld-Generierung. **Kein** Bookmark-/Feld-Schreiben vorhanden. |
| ✓ `src/formats/odt/reader.ts:256–262` | Überschriften-Erkennung für ODT: `text:h`, `text:outline-level`-Attribut, Ausrichtung aus zugehörigem Absatzstil. Robuste Grundlage. |
| ✓ `src/formats/odt/reader.ts:80–90, 323` | `bookmark`/`bookmark-start`/`bookmark-end` als leere Marker bekannt (`:80–90`). `elementToBlocks` endet für **alle** unbehandelten Elemente auf `return []` (`:323`) → `text:table-of-content` wird **ersatzlos verworfen** (Befund 7). `text:section` besitzt bereits eine Entpack-Behandlung (`:276–278`) als Vorbild für die nötige Reparatur. |
| ✓ `src/formats/odt/writer.ts:93–97` | Export erzeugt `<text:h text:style-name="…" text:outline-level="N">`. **Kein** `text:table-of-content`-`case` (präziser `grep` → 0) — der ODT-Fall ist als neuer `case` zu ergänzen. |
| ✓ `tests/fixtures/external/odt/{test1,compdocfileformat,excelfileformat}.odt` | Reale ODT-Dateien **mit** echtem `text:table-of-content` (verifiziert 3 von 202, alle entpackt). `test1.odt` = geeignetste Pflicht-Fixture (nutzt beobachtete `#…|outline`-Navigation); `excelfileformat.odt` nur optional wegen ~7,2 MB **entpackter** `content.xml` (Datei selbst nur ~356 KB). |
| ✓ `tests/fixtures/external/docx` | **Keine** der 127 Dateien enthält ein `TOC`-Feld (alle `word/document.xml` entpackt geprüft); 7 tragen andere `w:instrText`-Felder (Regressions-Baseline für den Verflachungs-Pfad) → synthetische ToC-Fixture Pflicht, reale Word-Datei zusätzlich empfohlen. |

---

## 1. Menüpunkte/Bedienelemente

| # | Element | Fundstelle | Anforderung |
|---|---|---|---|
| 1 | Toolbar-Button „Inhaltsverzeichnis einfügen“ | **nicht vorhanden** (`Toolbar.tsx`, 0 Treffer) | Neuer Button in einer eigenen, letzten Gruppe „Referenzen“ (aktuell existiert keine solche Gruppe; die Toolbar ist nach Zeichen-/Absatz-/Listen-/Tabelle-/Bild gegliedert). Klick öffnet **immer zuerst** den Options-Dialog, kein Direkteinfügen ohne Rückfrage. **Icon als eingebettetes SVG**, nicht als Unicode/Emoji (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1). |
| 2 | Options-Dialog „Ebenentiefe wählen“ | **nicht vorhanden** (nur `PrivacyModal.tsx` als Muster) | Auswahl, bis zu welcher Überschriften-Ebene (1–6) Einträge aufgenommen werden; sinnvoller Standard (z. B. „bis Ebene 3“, der Word-/LibreOffice-Default). Bestätigen generiert und fügt ein; Abbrechen/Escape/Klick außerhalb schließt **ohne** Dokumentänderung. Fokus beim Öffnen auf dem ersten Eingabeelement, Fokus-Falle innerhalb des Dialogs. |
| 3 | Generierungslogik „Überschriften sammeln“ | **nicht vorhanden** (`commands.ts`) | Neue Funktion, die `view.state.doc` **vollständig** durchläuft (nicht nur den Cursor-Pfad), alle `heading`-Knoten bis zur gewählten Tiefe in Dokumentreihenfolge sammelt und daraus die Einträge (Text, Ebene, eindeutiges Sprungziel je Überschrift) ableitet. |
| 4 | Darstellung des eingefügten Verzeichnisses | **nicht vorhanden** (kein `toc`-Node) | Visuell klar abgesetzter, zusammenhängender Bereich (z. B. Rahmen/Hintergrund), Einträge nach Heading-Ebene eingerückt. Muss als **eine Einheit** erkennbar sein, nicht als beliebige, einzeln editierbare Absätze, die zufällig wie ein Verzeichnis aussehen. |
| 5 | Klick auf einzelnen ToC-Eintrag | **nicht vorhanden** (`WordEditor.tsx` kennt keinen Sprung-Mechanismus) | Klick scrollt den Editor-Container zur referenzierten Überschrift und setzt den Cursor dorthin; muss auch funktionieren, wenn die Zielüberschrift auf einer anderen visuellen Seite liegt (Zusammenspiel mit `pagination.ts`) und wenn mehrere Überschriften denselben Text tragen (Grenzfall 21). |
| 6 | „Aktualisieren“-Bedienelement am Verzeichnis | **nicht vorhanden** | Mindestens ein sichtbarer, klickbarer Weg, das Verzeichnis nach Überschriften-Änderungen neu zu berechnen, muss existieren (Detail-Ablauf: Slug `inhaltsverzeichnis-aktualisieren`, außerhalb dieser Datei). Die beim Einfügen gewählte Tiefe muss dabei **respektiert**, nicht auf Standard zurückgesetzt werden. |
| 7 | Export als DOCX-Feld (`TOC`-Feldcode) | **nicht vorhanden** (0 Treffer in `docx/writer.ts`) | Neu: Serialisierung als `w:fldSimple` **oder** `w:fldChar`+`w:instrText`-Dreiklang mit `TOC`-Instruktion (z. B. `TOC \o "1-3" \h \z \u`), sodass Word das Feld selbst als aktualisierbares Inhaltsverzeichnis erkennt — nicht als vorab festgeschriebener Text ohne Feld-Charakter. |
| 8 | Sprungziele im Export | teils vorhanden (Erkennung), **kein** Schreiben | **DOCX benötigt Bookmarks:** OOXML kennt keine textbasierte Outline-Navigation; ein von Word verfolgbares Sprungziel braucht `w:bookmarkStart`/`w:bookmarkEnd` um die Überschrift plus `w:hyperlink w:anchor="_Toc…"` im Eintrag (beides neu zu bauen, 0 Treffer im Writer). **ODT benötigt keine Bookmarks:** reale LibreOffice-Verzeichnisse verlinken über die native Fragment-Syntax `#<Überschriftentext>|outline` (in `test1.odt` beobachtet) — direkt auf eine Überschrift dieses Texts, ohne Bookmark. Diese Asymmetrie ist beim Export zu berücksichtigen; die textbasierte ODT-Navigation ist bei **gleichlautenden** Überschriften mehrdeutig (Grenzfall 21). |
| 9 | Export als ODT-Element (`text:table-of-content`) | **nicht vorhanden** (0 Treffer in `odt/writer.ts`) | Neuer `case`: `<text:table-of-content><text:table-of-content-source text:outline-level="N">…</text:table-of-content-source><text:index-body>…</text:index-body></text:table-of-content>`. |
| 10 | Import-Erkennung/-Erhalt eines vorhandenen Verzeichnisses | **verlustbehaftet** (Befund 7/8) | **Pflicht (Abschnitt 18):** sichtbarer Text bleibt erhalten, kein Absturz, **kein stiller Totalverlust**. Aktuell verletzt: ODT-`text:table-of-content` (verworfen) und block-level-`<w:sdt>`-DOCX-ToC (verworfen). Mindestlösung: unbekanntes Verzeichnis in `unsupported_block` aufnehmen oder — wie `text:section` — dessen Eintrags-Absätze entpacken. Idealziel: als echtes Verzeichnis-Element zurückgewinnen. |
| 11 | Tastenkombination zum Einfügen | nicht vorhanden | Kein Blocker; optional ergänzbar, solange der Toolbar-Weg zuverlässig funktioniert. |
| 12 | Kontextmenü (Rechtsklick) | nicht vorhanden (Editor hat kein eigenes Kontextmenü) | Nicht Teil dieser Anforderung, als fehlend dokumentiert. |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Öffnen des Dialogs
- Klick auf den neuen Toolbar-Button öffnet **immer** zuerst den Options-Dialog — kein
  Direkt-Einfügen ohne Rückfrage (damit sich die feste-Voreinstellung-Falle des
  Tabellen-Features — `insertTable(2, 2)` direkt, `Toolbar.tsx:284` — hier nicht wiederholt).
- Dialog erscheint sichtbar über/neben dem Editor, blockiert die übrige Bedienung nicht
  dauerhaft (Escape/Klick außerhalb schließt), Muster ausgehend von `PrivacyModal.tsx`.
- Fokus liegt beim Öffnen auf dem ersten Eingabeelement (Ebenentiefe).

### 2.2 Auswahl der Ebenentiefe
- Auswahl, bis zu welcher Heading-Ebene (1–6) Einträge aufgenommen werden; sinnvoller
  Standardwert vorbelegt (z. B. „bis Ebene 3“).
- Bestätigen ruft die Generierungsfunktion mit der gewählten Tiefe auf und fügt das Ergebnis
  an der Cursor-Position ein; Abbrechen ändert nichts, Cursor-Position/Selektion bleiben exakt
  erhalten.
- Die gewählte Tiefe wird **am eingefügten Verzeichnis gespeichert** (Voraussetzung des
  Schwester-Features, `inhaltsverzeichnis-aktualisieren-req.md` Abschnitt 0.1, „Vorbedingung A“
  — **korrigiert**, nicht Abschnitt 0.6 wie in einer früheren Fassung dieser Datei): eine spätere
  Aktualisierung muss sie respektieren, nicht auf Standard zurücksetzen.

### 2.3 Generierung aus vorhandenen Überschriften
- Die Generierung durchläuft das **gesamte** Dokument (`view.state.doc`) in Dokumentreihenfolge,
  nicht nur den sichtbaren Ausschnitt oder den Cursor-Pfad.
- Für jede `heading`-Node mit `level` ≤ gewählter Tiefe entsteht ein Eintrag: **reiner
  Textinhalt** der Überschrift (fette/kursive/farbige Zeichenformatierung der Überschrift wird
  **nicht** in den Eintrag übernommen — reine Textübernahme ist gewollt und hier ausdrücklich
  als Sollverhalten dokumentiert, nicht als zufälliges Nebenprodukt), Einrückung entsprechend
  `level`, Sprungziel = die **konkrete** Überschrift (nicht bloß deren Text — siehe Grenzfall 21).
- Ein `hard_break` innerhalb einer Überschrift wird beim Zusammenbau des Eintragstexts zu einem
  einzelnen Leerzeichen (kein mehrzeiliger Eintrag, kein Verlust).
- Enthält das Dokument **keine** Überschrift bis zur gewählten Tiefe, wird trotzdem ein sichtbares
  Verzeichnis-Element mit Hinweistext („Keine Überschriften gefunden“ o. Ä.) eingefügt statt eines
  stillen No-Ops (Grenzfall 2).
- Die Reihenfolge entspricht exakt der Dokumentreihenfolge der Überschriften, unabhängig von der
  Ebene (kein Umsortieren nach Ebene).

### 2.4 Platzierung im Dokument
- Einfügung an der Cursor-Position bzw. anstelle der aktuellen Selektion (markierter Text wird
  ersetzt — Standardverhalten für Block-Einfügungen in diesem Editor).
- Nach dem Einfügen befindet sich der Cursor in einem definierten, sinnvollen Zustand (z. B.
  unmittelbar nach dem Verzeichnis), nicht in einem undefinierten Zustand oder — falls das
  Verzeichnis als nicht durchtippbar konzipiert wird — innerhalb eines geschützten Bereichs.

### 2.5 Darstellung direkt nach dem Einfügen
- Visuell klar als zusammenhängender, besonderer Bereich erkennbar, nicht als beliebige
  Absatzfolge. Kennzeichnung als „automatisch generiert“ ist empfohlen (verhindert die
  Fehldeutung späterer Überschreibungen als Datenverlust, vgl.
  `inhaltsverzeichnis-aktualisieren-req.md` Abschnitt 3.6).
- Einträge zeigen mindestens: Überschriftentext, Einrückung nach Ebene. Ob zusätzlich eine
  Seitenzahl angezeigt wird, ist **offen** (Grenzfall 15 — `pagination.ts` liefert keine stabile,
  exportierbare Seiten-Zuordnung).

### 2.6 Klick-Navigation
- Klick auf einen Eintrag scrollt den Viewport so, dass die referenzierte Überschrift sichtbar
  wird, und setzt den Cursor an deren Anfang.
- Funktioniert dokumentweit, unabhängig von den rein visuellen Seitenumbrüchen aus
  `pagination.ts` (nicht nur „innerhalb derselben Seite“).
- Das Sprungziel identifiziert die **konkrete** Überschrift, nicht nur deren Text: bei mehreren
  gleichlautenden Überschriften muss der Klick zur **eigenen** Instanz springen, nicht zur ersten
  Fundstelle (Grenzfall 21). Rein textbasierte Zuordnung (analog zur ODT-`|outline`-Navigation)
  ist dafür **unzureichend** und darf nicht die alleinige interne Grundlage sein.
- Muss mit `reconcileSelectionOnClick` (`WordEditor.tsx`, `mouseup`) zusammenspielen, ohne den
  Selection-Sync-Bug (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) auszulösen — ein Klick auf einen
  ToC-Eintrag ist selbst ein Mausklick im Editor-DOM und damit ein Verdachtsfall (Grenzfall 18).

### 2.7 Undo/Redo
- Einfügen ist ein einzelner, eigenständiger Undo-Schritt.
- Undo direkt danach entfernt das komplette Verzeichnis und stellt den vorherigen Zustand
  (Cursor, umgebender Text) exakt wieder her; Redo stellt es inklusive aller Einträge wieder her.

### 2.8 Zusammenspiel mit dem Aktualisieren-Mechanismus
- Direkt nach dem Einfügen muss klar sein, **wie** das Verzeichnis später aktualisiert werden
  kann (sichtbares Bedienelement, Abschnitt 1 Nr. 6).
- Solange keine Aktualisierung ausgelöst wurde, bleibt ein eingefügtes Verzeichnis unverändert,
  auch wenn sich Überschriften ändern — dieses bewusste „Einfrieren bis zur expliziten
  Aktualisierung“ ist Sollverhalten (entspricht echten TOC-Feldern), kein Bug (Grenzfall 12).

### 2.9 Editierbarkeit des eingefügten Verzeichnisses
- **Offene Entscheidung, vor Abnahme zu treffen und hier nachzutragen:** direkt durchtippbar
  (wie Absatztext, Risiko: manuelle Änderungen werden bei der nächsten Aktualisierung
  überschrieben) **oder** gegen direkte Eingabe geschützt (wie ein Word-Feld). Unabhängig vom
  Ergebnis: kein Editor-Absturz, kein inkonsistenter Dokumentzustand beim Versuch, hineinzutippen.
- Ein Umsetzungsvorschlag liegt in `specs/inhaltsverzeichnis-einfuegen-code.md` vor (geschützter,
  atomarer `toc_entry`-Leaf-Node) und ist bei Abnahme zu bestätigen oder zu verwerfen — diese
  Datei schreibt die Umsetzung **nicht** vor.

### 2.10 Sonderpositionen beim Einfügen
- Verzeichnis direkt am Dokumentanfang → Dokument bleibt vollständig weiter editierbar (Cursor
  davor/danach positionierbar).
- Einfügen mit Cursor innerhalb einer Tabellenzelle oder eines Listenelements → Verhalten muss
  definiert und getestet sein (Verzeichnis unterbricht die Struktur vs. wird eingebettet), kein
  zufälliges Schema-Ergebnis, kein Absturz (Grenzfall 8).

---

## 3. Grenzfälle

1. **Dialog abbrechen:** Escape/„Abbrechen“/Klick außerhalb → kein Verzeichnis eingefügt,
   Cursor-Position und Selektion exakt wie vor dem Öffnen.
2. **Keine Überschrift im Dokument:** Einfügen führt zu einem sichtbaren, sinnvollen Ergebnis
   (leeres Verzeichnis mit Hinweistext o. Ä.), nicht zu stillem No-Op, JS-Fehler oder einem
   nicht als Verzeichnis erkennbaren Absatz.
3. **Genau eine einzige Überschrift:** Verzeichnis mit genau einem Eintrag; Klick springt korrekt.
4. **Sehr viele Überschriften (z. B. 200):** UI bleibt reaktionsfähig beim Generieren **und** beim
   späteren Scrollen/Klicken.
5. **Sehr langer Überschriftentext (im Editor mehrzeilig):** Darstellung im Eintrag definiert
   (Umbruch oder Kürzung mit „…“), darf das übrige Layout nicht sprengen.
6. **Überschrift mit Inline-Formatierung (fett/farbig/Link):** Der Eintrag übernimmt die reine
   Textdarstellung (Abschnitt 2.3), konsistent und dokumentiert, nicht zufällig je nach
   Formatierungsart unterschiedlich.
7. **Sprünge in der Ebenen-Hierarchie** (z. B. Überschrift 1 direkt gefolgt von Überschrift 4):
   Einrückung folgt der **tatsächlichen** Ebene (vier Stufen trotz übersprungener Zwischenebenen),
   nicht künstlich normalisiert — sofern nicht dokumentiert abweichend.
8. **Einfügen mit Cursor in Tabellenzelle/Listenelement:** Verhalten (Unterbrechung vs. Einbettung)
   definiert und getestet, kein Absturz.
9. **Mehrfaches Einfügen mehrerer Verzeichnisse im selben Dokument:** muss möglich sein (oder
   bewusst verhindert, mit sichtbarer Rückmeldung); falls erlaubt, funktionieren beide unabhängig
   (nicht kollidierende Sprungziele/Anker beim Export).
10. **Einfügen bei aktiver Selektion:** markierter Text wird ersetzt (kein Zusammenführen) — als
    Sollverhalten bestätigt.
11. **Undo direkt nach Einfügen, dann weiter tippen:** kein Inhaltsverlust (Kombination mit dem
    Selection-Sync-Muster, Abschnitt 2 der Hauptspezifikation).
12. **Überschrift nachträglich gelöscht/umbenannt ohne Aktualisieren:** Verzeichnis bleibt
    unverändert (veraltet) — Sollverhalten, kein Bug (Abschnitt 2.8).
13. **Klick auf Eintrag, dessen Überschrift inzwischen gelöscht wurde:** definiertes, nicht
    abstürzendes Verhalten (kein Sprung, sichtbare Rückmeldung statt stillem No-Op).
14. **Überschriftentext mit Sonderzeichen/Umlauten/Emoji:** korrekt und unverändert im Eintrag
    sowie nach Export/Reimport — inklusive XML-Escaping des Textes in Feld-/Bookmark-Namen bzw.
    im ODT-`|outline`-Fragment (Anführungszeichen, `&`, `<`, `|` u. Ä. dürfen die Serialisierung
    nicht brechen).
15. **Seitenzahl-Anzeige im Eintrag — offene Frage:** `pagination.ts` berechnet Seitenumbrüche
    nur visuell/viewport-abhängig, ohne stabile, exportierbare Seiten-Zuordnung → **ungeklärt**,
    ob/wie ein Eintrag in der Editor-Vorschau eine nicht bei jeder Fenstergröße wechselnde
    Seitenzahl anzeigt. Für den **Export** unkritisch (Word/LibreOffice berechnen die Seitenzahl
    beim Öffnen/Aktualisieren selbst). Vor Abnahme entscheiden und hier nachtragen.
16. **Import einer Fremddatei mit vorhandenem DOCX-`TOC`-Feld — verifiziertes Ist-Verhalten
    (Befund 8):** Klassische Feld-Form (Eintrags-`<w:p>` als Body-Kinder) → sichtbarer Text bleibt
    als gewöhnliche Absätze erhalten (Feld-Charakter verloren). **Block-level-`<w:sdt>`-Form
    (moderne Word-Standardform)** → derzeit **komplett verworfen** (`readBodyChildren:464–485`
    behandelt nur `w:p`/`w:tbl`), also stiller Totalverlust → **muss behoben werden** (Body-Iteration
    in block-level `<w:sdt>`/`sdtContent` hineinsteigen lassen, analog zum Inline-Fallback in
    `collectRuns`, oder `unsupported_block` verwenden). Minimum: kein stiller Totalverlust
    (Abschnitt 18). Kein reales DOCX-TOC-Fixture im Korpus (Befund 10) → synthetische Fixture in
    beiden Formen bauen.
17. **Import einer Fremddatei mit vorhandenem ODT-`text:table-of-content` — verifiziertes
    Ist-Verhalten (Befund 7):** derzeit **ersatzlos verworfen** (`elementToBlocks` → `return []`,
    `reader.ts:323`), also stiller Totalverlust → **muss behoben werden** (Eintrags-Absätze aus
    `text:index-body` entpacken — wie bei `text:section` — oder `unsupported_block` verwenden).
    Pflicht-Fixtures vorhanden: `test1.odt`, `compdocfileformat.odt`.
18. **Selection-Sync-Bug-Verdachtsfall beim Klick auf einen ToC-Eintrag:** ein Klick im
    Editor-DOM ist grundsätzlich Auslöser des Bugs aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2
    (analog zum Klickwechsel zwischen Tabellenzellen). Per Regressionstest abzusichern: Text
    tippen → Alles auswählen → Formatierung anwenden → auf ToC-Eintrag klicken → weiter tippen →
    kein Datenverlust.
19. **Verzeichnis in Kopf-/Fußzeile:** da deren UI aktuell komplett fehlt (`FEATURE-SPEC-DOCX-ODT.md`
    Abschnitt 9), praktisch nicht auslösbar; sobald die UI existiert, ist zu klären, ob ein
    Verzeichnis dort sinnvoll ist oder der Button dort deaktiviert sein soll.
20. **Überschrift ohne jeden Text (leerer Absatz mit Überschriften-Formatvorlage):** definiertes,
    dokumentiertes Verhalten — entweder als leerer Eintrag geführt oder bewusst ausgelassen —
    konsistent mit Word/LibreOffice oder mit begründeter, dokumentierter Abweichung; kein Absturz,
    kein leerer Eintrag ohne Sprungziel, der beim Klick fehlschlägt. (Angleichung an
    `inhaltsverzeichnis-aktualisieren-req.md` Grenzfall 7.)
21. **Mehrere Überschriften mit identischem Text** (z. B. „Einleitung“ auf verschiedenen
    Ebenen/Positionen): Alle erscheinen als **getrennte** Einträge; Klick-Navigation und die
    beim Export erzeugten Anker referenzieren jeweils die **eigene, korrekte** Instanz, nicht
    immer die erste Fundstelle. **Besondere Schärfe für ODT:** die native `#<Text>|outline`-Navigation
    realer LibreOffice-Verzeichnisse ist rein textbasiert und damit bei gleichlautenden
    Überschriften **mehrdeutig** — der Export muss dies bewusst behandeln (z. B. akzeptierte,
    dokumentierte Einschränkung „springt zur ersten gleichlautenden Überschrift“, oder ein
    eindeutigeres ODF-Sprungziel), darf es aber nicht stillschweigend falsch machen. Für DOCX
    ist Eindeutigkeit über id-basierte Bookmarks (`_Toc…`) herstellbar. (Angleichung an
    `inhaltsverzeichnis-aktualisieren-req.md` Grenzfall 8.)
22. **Kopieren/Ausschneiden einer Überschrift und Einfügen an anderer Stelle im selben oder in
    einem zweiten Dokument** — seit der Erst-Erfassung dieser Datei sind „Kopieren“
    (`specs/kopieren-req.md`, strukturierter Zwischenablage-Serialisierer, direkt verifiziert:
    Commit `d65cde0`) und „Ausschneiden“ (`specs/ausschneiden-req.md`, Commit `9f8fa03`) als echte
    Funktionen hinzugekommen — beide kopieren/verschieben ProseMirror-Knoten **inklusive** ihrer
    Attribute, also **inklusive** eines etwaigen internen Sprungziel-Attributs der Überschrift
    (unabhängig davon, wie die in Abschnitt 2.9 offene Node-Modellierungsfrage beantwortet wird).
    Kopieren einer Überschrift, die bereits Ziel eines ToC-Eintrags ist, und Einfügen an anderer
    Stelle darf **keine** doppelt vergebene Sprungziel-Kennung erzeugen — sonst zeigen zwei
    ToC-Einträge auf dieselbe interne Kennung, oder ein DOCX-Export erzeugt zwei `w:bookmarkStart`
    mit identischem Namen (in Word **ungültig**/nicht mehr eindeutig auswertbar). Nach dem Einfügen
    der Kopie muss die neue Instanz **eigenständig** identifizierbar sein (neue Kennung), auch wenn
    Text und Ebene identisch zum Original sind — dieselbe Anforderung wie Grenzfall 21, hier aber
    über einen inzwischen real existierenden Bedienweg auslösbar, nicht nur hypothetisch. Ebenso zu
    prüfen: Ausschneiden einer Überschrift mit ToC-Eintrag und Wiedereinfügen an anderer Stelle
    im selben Dokument verhält sich wie „Grenzfall 12 zurückgenommen, dann Position geändert“ (kein
    Datenverlust, Sprungziel folgt der verschobenen Überschrift, keine doppelte Kennung).

---

## 4. Rundreise-Anforderung (Pflicht für Abnahme)

Für **jeden** Fall gilt: Dokument mit mehreren Überschriften unterschiedlicher Ebene und einem
daraus generierten (bzw. importierten) Inhaltsverzeichnis → **unverändert** exportieren → erneut
importieren → das Verzeichnis bleibt inhaltlich (Einträge, Ebenen, Reihenfolge) **und** als
Verzeichnis-Element erkennbar erhalten — zerfällt nicht in gewöhnlichen, unstrukturierten Text
und verschwindet nicht (auch nicht teilweise).

### 4.1 DOCX
1. Dokument mit 5 Überschriften unterschiedlicher Ebene anlegen, Verzeichnis über den neuen
   Dialog einfügen, als DOCX exportieren → mit einem **unabhängigen** Parser (python-docx oder
   direktes Parsen von `word/document.xml`) verifizieren: als `TOC`-Feldcode serialisiert
   (`w:fldSimple`- oder `w:fldChar`/`w:instrText`-Muster), **nicht** als reiner Absatztext ohne
   Feld-Charakter; Überschriften tragen `w:bookmarkStart`/`w:bookmarkEnd`, Einträge verweisen per
   `w:hyperlink w:anchor`.
2. Dieselbe Datei erneut importieren → weiterhin als Verzeichnis-Element erkannt (nicht als
   gewöhnliche Absätze).
3. In echtem Word (falls verfügbar): „Felder aktualisieren“/F9 berechnet das Verzeichnis aus den
   tatsächlichen Überschriften neu — Nachweis eines echten, Word-seitig aktualisierbaren Feldes.
4. **Import-Erhalt (Grenzfall 16):** Da **kein** reales DOCX-TOC-Fixture im Korpus existiert
   (Befund 10), eine synthetische Fixture in **beiden** Formen bauen — (a) klassisches
   Feld-Tripel mit Eintrags-`<w:p>` als Body-Kinder, (b) block-level-`<w:sdt>`-Wrapper — jeweils
   importieren → unverändert exportieren → reimportieren → sichtbarer Eintragstext bleibt in
   **beiden** Formen erhalten (aktuell verliert Form (b) alles, Befund 8: muss grün werden).
   Zusätzlich empfohlen: eine echte, mit Word erzeugte `.docx` mit `TOC`-Feld dem Korpus
   hinzufügen.
5. Cross-Format: siehe 4.3.

### 4.2 ODT
1. Dasselbe Testdokument wie 4.1.1 als ODT exportieren → `content.xml` enthält ein
   `<text:table-of-content>` mit `<text:table-of-content-source>` und befülltem
   `<text:index-body>`, nicht nur eine flache `<text:p>`-Liste.
2. Dieselbe Datei erneut importieren → weiterhin als Verzeichnis-Element erkannt.
3. In echtem LibreOffice (falls verfügbar): „Verzeichnis aktualisieren“ (F9) berechnet aus den
   echten Überschriften neu.
4. **Import-Erhalt (Grenzfall 17):** die realen Fixtures `test1.odt` und `compdocfileformat.odt`
   importieren → unverändert exportieren → reimportieren → sichtbarer Eintragstext bleibt erhalten
   (aktuell wird das gesamte `text:table-of-content` verworfen, Befund 7: muss grün werden).
   `excelfileformat.odt` nur optional (entpackte `content.xml` ~7,2 MB, langsam zu parsen).

### 4.3 Doppelte Rundreise / Cross-Format
1. DOCX mit Verzeichnis → Editor → Export als ODT → Reimport → Export zurück als DOCX → das
   Verzeichnis bleibt nach zwei Konvertierungen als solches erkennbar, Einträge (Text, Ebene,
   Reihenfolge) inhaltlich identisch (exakte Feld-Syntax darf sich unterscheiden und ist zu
   dokumentieren; **Inhalts-/Struktur-Verlust nicht**).
2. Dieselbe Prüfung mit Startpunkt ODT.

---

## 5. Testfälle für die Verifikation

Konkretisierung und Erweiterung der in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 10 grob
vorformulierten Testfälle. **E2E** = echte Browser-Bedienung (Playwright, echter
`filechooser`-Upload / abgefangener Download), **U** = Unit-Ebene (Reader/Writer, Datenmodell).

1. (E2E) 5 Überschriften unterschiedlicher Ebene über das Absatzformat-Dropdown anlegen →
   Verzeichnis einfügen → alle 5 Einträge mit korrekter Einrückung nach Ebene und in korrekter
   Reihenfolge.
2. (E2E) Klick auf den Toolbar-Button → Options-Dialog öffnet sichtbar.
3. (E2E) Dialog mit Standard-Tiefe direkt bestätigen → sinnvolles Standardverzeichnis eingefügt.
4. (E2E) Dialog öffnen, Escape → kein DOM verändert, Editor-Fokus/Cursor unverändert (Grenzfall 1).
5. (E2E) Einfügen ohne vorhandene Überschriften → sichtbares, definiertes Ergebnis statt No-Op
   (Grenzfall 2).
6. (E2E) Überschrift umbenennen/hinzufügen, „Aktualisieren“ → Verzeichnis spiegelt Änderung
   (Mindestnachweis; Detailtiefe bei `inhaltsverzeichnis-aktualisieren`).
7. (E2E) Klick auf Eintrag → Editor scrollt sichtbar zur Überschrift, Cursor steht dort.
8. (E2E) Klick auf Eintrag, dessen Ziel außerhalb des sichtbaren Bereichs / auf anderer visueller
   Seite liegt → Sprung funktioniert zuverlässig.
9. (E2E) Undo direkt nach Einfügen → Verzeichnis verschwindet vollständig, Text davor/danach
   unverändert; Redo stellt wieder her.
10. (E2E) **Selection-Sync-Regressionstest** (Grenzfall 18): Text eingeben → Alles auswählen →
    Formatierung → auf ToC-Eintrag klicken → weiter tippen → kein Inhaltsverlust. Dauerhaft in der
    Suite, analog zu `selection-regression.spec.ts`.
11. (E2E) Vollständige DOCX-Rundreise (Abschnitt 4.1) über echten Upload/Download inkl. Validierung
    auf tatsächlichen `TOC`-Feldcode durch einen unabhängigen Parser.
12. (E2E) Vollständige ODT-Rundreise (Abschnitt 4.2) inkl. Validierung auf tatsächliches
    `<text:table-of-content>`.
13. (E2E) Cross-Format (Abschnitt 4.3): einmal DOCX→ODT→DOCX, einmal ODT→DOCX→ODT.
14. (E2E/U) **Import vorhandener Verzeichnisse — konkret bestückt:** ODT gegen `test1.odt` und
    `compdocfileformat.odt` (real vorhanden); DOCX gegen zwei **synthetisch** gebaute Fixtures
    (klassisches Feld-Tripel **und** block-level-`<w:sdt>`) sowie — falls beschafft — eine echte
    Word-`.docx`. In allen Fällen: kein Absturz, sichtbarer Eintragstext bleibt lesbar erhalten
    (Grenzfall 16/17 — behebt die aktuell verifizierten Totalverluste).
15. (E2E) Sehr viele Überschriften (z. B. 200, skriptgeneriert) → Einfügen/Scrollen/Klicken bleibt
    performant (Grenzfall 4).
16. (E2E/U) Überschrift mit Sonderzeichen/Umlauten/Emoji → korrekt im Eintrag und nach Rundreise;
    Text bricht die Serialisierung von Bookmark-Namen/`|outline`-Fragment nicht (Grenzfall 14).
17. (E2E) Zwei Verzeichnisse im selben Dokument → beide unabhängig funktionsfähig, keine Kollision
    der Sprungziele (Grenzfall 9).
18. (U) **Reader/Writer-Symmetrie je Format:** internes ToC-Element → Writer erzeugt gültiges
    Feld/Element → Reader liest es zurück in das erwartete interne Element (beide Richtungen, rein
    auf Datenmodell-Ebene, unabhängig vom Editor). Zusätzlich: gleichlautende Überschriften
    erzeugen eindeutige DOCX-Bookmark-Ids (Grenzfall 21).
19. (E2E/U) **Baseline-Regressionsschutz (kein Leck):** eine unbeteiligte Datei **ohne**
    Verzeichnis unverändert importieren → exportieren → reimportieren → es entsteht **kein**
    Verzeichnis „aus dem Nichts“, und der neue `toc`-Node/das neue Attribut taucht nirgends
    ungewollt auf (analog `inhaltsverzeichnis-aktualisieren-req.md` Abschnitt 5.1).
20. (E2E) **Kopieren/Ausschneiden einer Überschrift mit ToC-Eintrag** (Grenzfall 22, über die
    inzwischen echten Bedienwege aus `kopieren-req.md`/`ausschneiden-req.md`): Überschrift mit
    vorhandenem ToC-Eintrag kopieren → an anderer Stelle einfügen → beide Instanzen erscheinen als
    getrennte, unabhängig navigierbare Einträge, keine doppelt vergebene Sprungziel-Kennung, keine
    doppelten `w:bookmarkStart`-Namen im DOCX-Export. Dieselbe Überschrift stattdessen ausschneiden
    und andernorts wieder einfügen → Sprungziel folgt der neuen Position, kein Datenverlust.

---

## 6. Abnahmekriterien (Definition of Done)

Der Status „fehlt“ darf erst auf „verifiziert“ geändert werden, wenn:

1. Toolbar-Button (SVG-Icon) und Options-Dialog (Ebenentiefe, Fokus-Falle/Escape/Backdrop)
   gebaut, verdrahtet und über Testfälle 2–4 nachgewiesen sind.
2. Die Generierungslogik (vollständige Dokument-Traversierung, korrekte Einrückung/Reihenfolge,
   Verhalten ohne Überschriften, gespeicherte Tiefe) über Testfälle 1 und 5 nachgewiesen ist.
3. Klick-Navigation inkl. Zusammenspiel mit `pagination.ts` **und** korrekter Instanz-Zuordnung
   bei gleichlautenden Überschriften über Testfälle 7–8 und Grenzfall 21 nachgewiesen ist.
4. Mindestens ein sichtbares Aktualisieren-Bedienelement existiert, die gespeicherte Tiefe
   respektiert und über Testfall 6 nachgewiesen ist.
5. Der DOCX-Export einen von einer unabhängigen Bibliothek als `TOC`-Feldcode (inkl. Bookmarks)
   erkennbaren Inhalt erzeugt (Testfall 11), idealerweise zusätzlich in echtem Word (4.1.3).
6. Der ODT-Export ein `<text:table-of-content>` erzeugt (Testfall 12), idealerweise zusätzlich in
   echtem LibreOffice (4.2.3).
7. Reimport beider Formate das Element weiterhin als Verzeichnis erkennt (4.1.2 / 4.2.2).
8. Cross-Format-Rundreise ohne Verlust von Verzeichnis-Charakter bzw. Eintrags-Inhalten
   nachgewiesen ist (4.3, Testfall 13).
9. **Die beiden aktuell verifizierten Import-Totalverluste behoben sind:** ODT-`text:table-of-content`
   (Befund 7) und block-level-`<w:sdt>`-DOCX-ToC (Befund 8) verschlucken keinen sichtbaren Text
   mehr — Minimum via `unsupported_block`/Entpacken, nachgewiesen über Testfall 14 gegen die
   genannten realen bzw. synthetischen Fixtures.
10. **Baseline-Regressionsschutz grün:** unbeteiligte Dateien erzeugen weder beim Reimport noch
    beim Export ein Verzeichnis „aus dem Nichts“ (Testfall 19).
11. Alle Grenzfälle aus Abschnitt 3 einzeln geprüft und ihr tatsächliches Verhalten dokumentiert
    sind — auch wenn das Ergebnis „bewusst so gewollt, dokumentiert“ statt „Bug, behoben“ lautet;
    insbesondere die neu ergänzten Grenzfälle 20 (leere Überschrift), 21 (gleichlautende
    Überschriften, ODT-`|outline`-Mehrdeutigkeit) und 22 (Kopieren/Ausschneiden einer Überschrift
    mit ToC-Eintrag über die inzwischen echten Bedienwege aus `kopieren-req.md`/
    `ausschneiden-req.md`, Testfall 20).
12. Die drei offenen Entscheidungsfragen explizit beantwortet und hier nachgetragen sind:
    Node-Modellierung im Schema (neuer `toc`-Node vs. reine Absatzstruktur), Editierbarkeit
    (Abschnitt 2.9), Seitenzahl-Anzeige in der Editor-Vorschau (Grenzfall 15). Der Vorschlag in
    `inhaltsverzeichnis-einfuegen-code.md` ist zu ratifizieren oder zu verwerfen, nicht
    stillschweigend zu übernehmen.
13. Der Selection-Sync-Regressionstest (Grenzfall 18, Testfall 10) dauerhaft Teil der Suite bleibt
    und besteht.

Erst nach Erfüllung aller Punkte darf der Backlog-Status von „fehlt“ auf „verifiziert“ geändert
werden.
