# Anforderungsspezifikation: Feature „Tabelle löschen"

Status: Entwurf zur Freigabe — bitte prüfen, bevor daran weitergearbeitet oder das
Feature als „fertig" abgehakt wird.

Herkunft/Einordnung: Dieses Dokument konkretisiert Abschnitt 6 („Tabellen") von
`FEATURE-SPEC-DOCX-ODT.md` für den Teilaspekt „Tabelle komplett löschen" (dort als
Stichpunkt „Tabelle komplett löschen." sowie in Abschnitt 17, Zeile 20 als Teil der
Sammelposition „Tabellen-Kontextfunktionen … fehlt komplett in der UI … größte
Einzellücke im gesamten Funktionsumfang" geführt) und ersetzt für dieses Teilfeature
dessen kurzen Stichpunkt durch eine vollständige Anforderung inkl. Grenzfällen und
Rundreise-Pflicht. Es gilt weiterhin: gemeinsamer interner Editor (ProseMirror-Schema
+ Seitenansicht) für DOCX und ODT — jede Anforderung unten muss für **beide** Formate
gelten, sowohl beim Import einer bestehenden Datei als auch beim Export einer im Editor
erstellten/bearbeiteten Datei, inklusive Rundreise (Datei A hochladen → unverändert
exportieren → Ergebnis entspricht inhaltlich A).

Backlog-Status laut Vorgabe (`specs/FEATURE-BACKLOG.md`, Slug `tabelle-loeschen`,
Priorität 1 „essenziell"): **„fehlt" — gilt aktuell als nicht vertrauenswürdig, muss
vollständig verifiziert werden.** Dieses Dokument beschreibt sowohl den Soll-Zustand
als auch (Abschnitt 5) bereits durch Code-Sichtung auffindbare, konkrete Verdachtsmomente,
die die Prüfung gezielt bestätigen oder widerlegen muss. Nach erster Code-Sichtung ist
der Backlog-Status „fehlt" für dieses Feature mit hoher Sicherheit **zutreffend**: Es
existiert weder ein Toolbar-Button noch ein Befehl (`Command`) noch eine
Tastenkombination, um eine komplette Tabelle samt Inhalt zu entfernen (Details siehe
Abschnitt 5). Das unterscheidet dieses Feature vom Nachbar-Feature „Nummerierte Liste",
bei dem zumindest eine Basisfunktion vorhanden war — hier ist die Verifikation zugleich
eine Bau-Aufgabe.

**Abgrenzung:** Diese Spezifikation behandelt ausschließlich das **vollständige**
Entfernen einer Tabelle inklusive ihres gesamten Inhalts (Slug `tabelle-loeschen`).
Die verwandten, aber eigenständigen Backlog-Einträge `zeile-loeschen` (Zeile löschen)
und `spalte-loeschen` (Spalte löschen) sind **nicht** Gegenstand dieses Dokuments und
benötigen eigene Anforderungsdateien — beide sind laut Backlog ebenfalls „fehlt" und
teilen sich mit diesem Feature dieselbe grundsätzliche Beobachtung (keine UI, keine
Commands), werden aber hier nur dort erwähnt, wo eine Abgrenzung zur Klarheit nötig ist
(siehe Abschnitt 2.6).

---

## 1. Menüpunkte / Bedienelemente

| # | Element | Ort | Aktuell laut Code | Soll |
|---|---|---|---|---|
| 1 | Button/Menüpunkt „Tabelle löschen" | Toolbar, Gruppe „Tabelle" (neben dem bestehenden Button „⊞ Tabelle" zum Einfügen) | **existiert nicht.** `src/formats/shared/editor/Toolbar.tsx` enthält ausschließlich einen Einfüge-Button (`insertTable(2, 2)`); kein zweiter Button für Löschen ist vorhanden | Muss neu gebaut werden: sichtbar/aktivierbar sobald der Cursor sich irgendwo innerhalb einer Tabelle befindet (Zustand analog zur bereits vorhandenen `isInTable(view.state)`-Prüfung, die aktuell nur für `aria-pressed` am Einfüge-Button verwendet wird), deaktiviert/ausgeblendet außerhalb einer Tabelle |
| 2 | Kontextmenü (Rechtsklick) mit Eintrag „Tabelle löschen" | Tabellenbereich | **existiert nicht.** Es gibt im gesamten Projekt kein Kontextmenü für Tabellen(-zellen) | Nice-to-have zusätzlich zum Toolbar-Button (siehe Abschnitt 17 der Hauptspezifikation: „Tabellen-Kontextfunktionen … fehlt komplett in der UI"); Toolbar-Button ist die verbindliche Mindestanforderung, Kontextmenü optional |
| 3 | Tastenkombination/Tastaturweg (z. B. gesamte Tabelle als Objekt markieren + Entf/Backspace) | Editor, Keymap | **existiert nicht.** Das Keymap in `WordEditor.tsx` bindet nur `Mod-z/y`, `Enter`, `Mod-b/i/u` plus `baseKeymap`; es gibt keinen Mechanismus, der eine Tabelle als Ganzes selektierbar macht (keine Konvertierung einer vollständigen `CellSelection` in eine `NodeSelection` auf dem Tabellenknoten, kein `deleteTable`-Import aus `prosemirror-tables`) | Muss definiert und gebaut werden — mindestens ein zuverlässiger Weg (Klick auf einen Tabellen-Rahmen-Anfasser o. Ä., „Alles in der Tabelle markieren" gefolgt von einer weiteren Markier-Aktion) sowie eine dokumentierte Festlegung, ob/wie Entf/Backspace darauf reagiert (siehe Abschnitt 2.2) |
| 4 | Bestätigungsdialog vor dem Löschen | — | nicht vorhanden (Feature existiert nicht) | Muss festgelegt werden, ob eine Rückfrage erscheint (Word/LibreOffice fragen bei „Tabelle löschen" i. d. R. **nicht** extra nach, verlassen sich auf Undo) — empfohlen: **keine** blockierende Bestätigung, stattdessen zuverlässiges Undo (Abschnitt 2.4), da ein zusätzlicher Dialog dem in Abschnitt 20 der Hauptspezifikation geforderten Grundsatz „kein stiller Fehlschlag, aber auch kein unnötiger Reibungsverlust" widerspricht |
| 5 | Symbol/Icon des neuen Buttons | Toolbar | — | Nach Abschnitt 20 der Hauptspezifikation: kein Emoji mit Rendering-Risiko, sondern eindeutiges SVG-Icon oder eindeutiger Text wie „⊟ Tabelle löschen"/„Tabelle löschen" (Text ist unkritisch, siehe bereits als unkritisch bewertetes Textlabel „1. Liste" im Nachbar-Feature) |
| 6 | Sichtbarer/aktiver Zustand des Buttons außerhalb einer Tabelle | Toolbar | — | Button muss deaktiviert (oder ausgeblendet) sein, wenn der Cursor nicht in einer Tabelle steht — kein Klick, der wirkungslos bleibt (Grundsatz „kein stiller Fehlschlag" aus Abschnitt 20 der Hauptspezifikation) |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Grundverhalten: Ein Klick entfernt die gesamte Tabelle
- Cursor irgendwo innerhalb einer Tabelle (in einer beliebigen Zelle, unabhängig von
  Zeilen-/Spaltenposition) → Klick auf „Tabelle löschen" entfernt den **kompletten**
  Tabellenknoten samt **allen** Zeilen, Zellen und deren Inhalt (Text, Formatierung,
  Bilder, verschachtelte Listen, verschachtelte Tabellen) aus dem Dokument.
- Es reicht ein einzelner Klick, keine vorherige manuelle Selektion des gesamten
  Tabelleninhalts durch die Nutzerin ist erforderlich (im Unterschied zu z. B. „Zeile
  löschen", das eine Positionierung in der jeweiligen Zeile voraussetzt — hier genügt
  irgendeine Cursor-Position innerhalb der Tabelle).
- Text/Inhalt **vor** und **nach** der Tabelle im Dokument bleibt vollständig und
  unverändert erhalten (kein Nebenwirkungs-Datenverlust im umgebenden Fließtext —
  direkte Analogie zum bereits für Bilder geforderten Verhalten in Abschnitt 7 der
  Hauptspezifikation: „Bild löschen … ohne Nebenwirkungen auf umgebenden Text").

### 2.2 Abgrenzung zu reinem Inhalt-Löschen (Entf/Backspace auf Zellinhalt)
- Markieren von Text **innerhalb** einer oder mehrerer Zellen und Drücken von
  Entf/Backspace darf **nur** den markierten Zellinhalt leeren, **niemals** implizit
  die Tabellenstruktur (Zeilen/Spalten/Zellen selbst) auflösen — das entspricht dem
  Verhalten von Word/LibreOffice, wo das Entfernen sämtlichen Zellinhalts eine leere,
  aber weiterhin vorhandene Tabelle hinterlässt.
- Das vollständige Entfernen der Tabellenstruktur ist **ausschließlich** über die in
  Abschnitt 1 beschriebene explizite Aktion („Tabelle löschen") möglich, nicht als
  Nebeneffekt wiederholten Löschens von Zellinhalten.
- Falls ein Weg vorgesehen wird, die gesamte Tabelle als **ein** Objekt zu markieren
  (z. B. über einen Rahmen-Anfasser, siehe Abschnitt 1, Punkt 3) und darauf Entf/
  Backspace zu drücken, muss dieser Weg **dasselbe** Ergebnis liefern wie der Toolbar-
  Button — beide Wege müssen zum selben, vollständigen Entfernen führen, nicht zu
  unterschiedlichem Verhalten (z. B. „nur Inhalt leeren" bei Taste vs. „Struktur
  entfernen" bei Button). Dieser Punkt muss vor Abnahme ausdrücklich festgelegt und
  konsistent implementiert werden — aktuell (siehe Abschnitt 5) existiert keiner der
  beiden Wege.

### 2.3 Cursor-/Fokus-Verhalten nach dem Löschen
- Nach dem Löschen muss der Cursor an einer sinnvollen, deterministischen Stelle
  landen (üblicherweise: Anfang des Absatzes, der unmittelbar auf die Tabelle folgte,
  bzw. Ende des Absatzes davor, falls kein Nachfolge-Absatz existiert) und der Editor
  muss sofort ohne weiteren Klick weiter bedienbar sein (Tippen funktioniert direkt).
- **Tabelle ist der einzige Inhalt des Dokuments:** Da das Schema für `doc` mindestens
  einen Block verlangt (`content: 'block+'`), muss das Löschen der letzten/einzigen
  Tabelle automatisch einen leeren Standard-Absatz an ihrer Stelle einsetzen, damit ein
  gültiges, weiterhin editierbares Dokument bestehen bleibt — kein leerer/ungültiger
  Dokumentzustand, kein Absturz.
- **Tabelle am Dokumentanfang bzw. -ende** mit vorhandenem umgebendem Inhalt → Cursor-
  Zielregel (siehe oben) muss auch hier greifen, ohne dass Inhalt davor/danach verloren
  geht oder doppelt erscheint.

### 2.4 Undo/Redo
- Strg+Z unmittelbar nach dem Löschen stellt die Tabelle **exakt** wieder her: gleiche
  Anzahl Zeilen/Spalten, gleiche verbundenen Zellen (colspan/rowspan), derselbe
  Zellinhalt inklusive Formatierung (fett/kursiv/Farbe/Ausrichtung), mehrerer Absätze
  pro Zelle sowie enthaltener Bilder/Listen — nicht nur der sichtbare Text.
- Strg+Y/Strg+Umschalt+Z (Redo) direkt danach entfernt die Tabelle erneut vollständig.
- Undo/Redo des Lösch-Vorgangs muss sich korrekt in eine gemischte Sequenz aus Tippen
  und anderen Toolbar-Aktionen einfügen (kein Sonderfall, der die History-Kette
  bricht) — siehe auch den bereits dokumentierten Selection-Sync-Bug aus Abschnitt 2
  der Hauptspezifikation: Tabellen gelten dort explizit als „Hauptverdachtsfall", das
  Löschen einer Tabelle unmittelbar nach einem Klick zur Neupositionierung ist daher
  ein Pflicht-Testszenario (siehe Abschnitt 3, Grenzfall 9).

### 2.5 Verschachtelte Tabellen
- Cursor in einer **inneren** (verschachtelten) Tabelle, die selbst innerhalb einer
  Zelle einer äußeren Tabelle liegt → „Tabelle löschen" entfernt **nur** die innere
  Tabelle; die äußere Tabelle und deren übrige Zellen bleiben vollständig erhalten.
- Cursor in einer Zelle der **äußeren** Tabelle (außerhalb der verschachtelten Tabelle,
  aber in derselben Außentabelle) → „Tabelle löschen" entfernt die äußere Tabelle
  samt allem, was sie enthält, **einschließlich** jeder darin verschachtelten Tabelle
  (erwartetes, dokumentiertes Verhalten — kein separater Rettungsmechanismus für
  verschachtelte Inhalte erforderlich, muss aber nicht stillschweigend crashen).
- Beide Fälle müssen eindeutig unterscheidbar sein (welche der beiden Ebenen „zählt"
  als Ziel der Aktion, abhängig von der genauen Cursor-Position) — diese Regel muss
  vor Abnahme ausdrücklich festgelegt und mit einem Test belegt werden.

### 2.6 Zusammenspiel mit anderen Features (und Abgrenzung)
- Zeile/Spalte löschen (separate, eigenständige Backlog-Einträge `zeile-loeschen` /
  `spalte-loeschen`) sind **keine** Vorstufe oder Sonderfall dieses Features — „Tabelle
  löschen" muss unabhängig davon funktionieren, ob Zeilen-/Spalten-Bearbeitung bereits
  existiert oder nicht.
- Löschen einer Tabelle, die **verbundene Zellen** (colspan/rowspan, per
  Zellen-verbinden-Feature) enthält → keine Sonderbehandlung nötig, die gesamte
  Struktur inklusive Verbindungen verschwindet einfach vollständig.
- Löschen einer Tabelle, die ein **Bild** in einer Zelle enthält → Bild verschwindet
  mit; nach Export darf die exportierte Datei **keine verwaisten Bild-Einträge** (z. B.
  ungenutzte Dateien in `word/media/` bzw. `Pictures/` im ODT-Zip oder verwaiste
  Relationship-Einträge) enthalten (Analogie zur bereits für einfaches Bild-Löschen in
  Abschnitt 7 der Hauptspezifikation geforderten Sauberkeit: „keine verwaisten
  Bilddateien im Zip").
- Löschen einer Tabelle, die eine **Liste** in einer Zelle enthält → Liste verschwindet
  mit der Tabelle, keine Reste (z. B. eine losgelöste Listendefinition ohne Inhalt) im
  exportierten Dokument.
- Cursor-/Selektionszustand nach dem Löschen darf keine „tote" Referenz auf die nicht
  mehr existierende Tabelle behalten (z. B. darf ein nachfolgender Klick auf den vormals
  vorhandenen Tabellen-Löschen-Button, falls er aus irgendeinem Grund noch aktiv
  angezeigt würde, nicht zu einem Fehler/Crash führen — Button-Zustand muss sich sofort
  aktualisieren, siehe Abschnitt 1, Punkt 6).

---

## 3. Grenzfälle

1. **Einzige Tabelle, einziges Dokumentelement:** Neues leeres Dokument, sofort eine
   Tabelle einfügen, sofort wieder löschen, ohne je Text einzugeben → Dokument bleibt
   gültig (mindestens ein leerer Standard-Absatz gemäß Schema-Anforderung `block+`),
   kein Crash, kein leeres/ungültiges Wurzelelement.
2. **Tabelle mit 1×1** (kleinstmögliche Tabelle, eine Zeile, eine Spalte) → Löschen
   funktioniert identisch zu größeren Tabellen.
3. **Sehr große Tabelle** (> 10 Spalten, > 20 Zeilen, siehe reale Fixture
   `tests/fixtures/external/odt/BigTable.odt` bzw. `crazyTable.odt`) → Löschen bleibt
   performant (kein spürbares Einfrieren), Undo stellt die komplette große Struktur
   korrekt wieder her.
4. **Tabelle am Dokumentanfang** (erster Block des Dokuments ist die Tabelle, kein
   Absatz davor) → nach dem Löschen ist der neue erste Block ein normaler, editierbarer
   Absatz; Cursor landet dort, kein Verlust von eventuell danach folgendem Inhalt.
5. **Tabelle am Dokumentende** (letzter Block, kein Absatz danach) → analog zu 4,
   Cursor landet im Absatz davor bzw. in einem neu eingefügten leeren Absatz.
6. **Zwei aufeinanderfolgende Tabellen ohne trennenden Absatz dazwischen** → Löschen
   der ersten (oder zweiten) Tabelle darf die jeweils andere Tabelle nicht mit
   entfernen oder mit ihr verschmelzen; nur die Tabelle, in der der Cursor stand,
   verschwindet.
7. **Verschachtelte Tabelle** (Tabelle in Tabellenzelle, siehe reale Fixtures
   `subTables.odt`, `subTables2.odt`, `subTables3-nested.odt`, `subTables4.odt`,
   `table-within-textBox-within-frame.odt`) → siehe Abschnitt 2.5, beide Richtungen
   (innere vs. äußere Tabelle löschen) einzeln testen.
8. **Tabelle mit bereits zuvor gelöschten/gemergten Spalten** (reale Fixtures
   `table-column-delete-with-merge.odt`, `table-column-delete-with-merge-2-times.odt` —
   diese Dateien enthalten aus einer Fremdanwendung stammende, „unordentliche"
   Spalten-/Merge-Strukturen) → nach Import muss auch eine solche Tabelle vollständig
   und ohne Absturz löschbar sein, trotz ungewöhnlicher `colspan`/`colwidth`-Werte.
9. **Regressionsmuster des Selection-Sync-Bugs (Abschnitt 2 der Hauptspezifikation):**
   Text in einer Tabellenzelle eingeben → per Klick den Cursor in eine andere Zelle
   neu positionieren → sofort „Tabelle löschen" auslösen → Tabelle muss vollständig
   und korrekt entfernt werden, ohne dass eine stale Selektion aus dem vorherigen
   Zellwechsel zu einem falschen Lösch-Ziel oder einem Crash führt. Pflicht-Testfall,
   da Tabellen laut Hauptspezifikation der „Hauptverdachtsfall" für diesen Bug sind.
10. **Löschen unmittelbar nach dem Einfügen** (Tabelle einfügen, kein Klick dazwischen,
    sofort löschen) → funktioniert ebenso zuverlässig wie Löschen einer bereits länger
    bestehenden, bearbeiteten Tabelle.
11. **Mehrfaches Undo/Redo hintereinander** (löschen → Undo → Redo → Undo → …, mehrere
    Zyklen) → Tabelle bleibt bei jedem „Undo"-Schritt bit-genau identisch zum Zustand
    vor dem jeweiligen Löschen, kein schleichender Strukturverlust über mehrere Zyklen.
12. **Tabelle mit Zellinhalt, der selbst mehrere Absätze und gemischte Formatierung
    enthält** (fett, kursiv, unterschiedliche Ausrichtung je Absatz in derselben
    Zelle) → beim Löschen verschwindet alles, beim Undo kommt alles inklusive jeder
    Formatierungsdetails zurück.
13. **Löschen während eines aktiven Bildes/einer aktiven Auswahl außerhalb der
    Tabelle** (z. B. Cursor eigentlich in einem Bild direkt vor der Tabelle, dann
    Klick auf „Tabelle löschen", ohne dass der Cursor je in der Tabelle stand) → Button
    ist in diesem Zustand deaktiviert (siehe Abschnitt 1, Punkt 6), Klick darf **nicht**
    versehentlich die nächstgelegene Tabelle im Dokument löschen.
14. **Tabelle mit Bild in einer Zelle löschen, danach exportieren** → exportierte Datei
    enthält keine verwaisten Bilddateien/Relationship-Einträge mehr (siehe Abschnitt
    2.6); zusätzlich prüfen, dass die ZIP-Struktur insgesamt weiterhin valide bleibt
    (kein kaputtes Archiv durch fehlerhafte Aufräumlogik).
15. **Rundreise mit zwischenzeitlichem Format-Wechsel:** DOCX-Datei mit Tabelle
    importieren, Tabelle im Editor löschen, als ODT exportieren (Cross-Format), diese
    ODT-Datei reimportieren → Tabelle bleibt in allen Schritten korrekt abwesend,
    umgebender Text bleibt über den Formatwechsel hinweg vollständig erhalten.
16. **Reale komplexe Fremddatei mit Tabelle importieren, unverändert exportieren
    (ohne Löschen), erneut importieren, danach erst löschen** → stellt sicher, dass
    das allgemeine Rundreise-Verhalten (Abschnitt 6, Testfall 9 der Hauptspezifikation)
    nicht durch das bloße Vorhandensein der neuen Löschfunktion beeinträchtigt wird,
    bevor sie überhaupt ausgelöst wird (Regressionsschutz für bestehende Tabellen-
    Rundreise).

---

## 4. Rundreise-Anforderung (Pflicht für DOCX **und** ODT)

Für jede der folgenden Kombinationen gilt: **Datei/Zustand A → Tabelle löschen →
unverändert (ohne weitere Bearbeitung) exportieren → Ergebnis erneut importieren →
Tabelle ist nicht mehr vorhanden, aller übriger Inhalt entspricht A minus Tabelle.**
Zusätzlich gilt die allgemeine Rundreise-Grundregel aus der Hauptspezifikation
unverändert für den **umgebenden**, nicht gelöschten Inhalt: „Datei A hochladen →
unverändert exportieren → Ergebnis entspricht inhaltlich A" — das Löschen darf also
ausschließlich die Tabelle selbst betreffen, nichts sonst im Dokument verändern.

### 4.1 Im Editor selbst erzeugte/gelöschte Tabellen
1. Einfache Tabelle (2×2, ohne weiteren Inhalt drumherum außer einem Absatz davor und
   danach) einfügen, sofort löschen → als DOCX exportieren → reimportieren → nur die
   beiden umgebenden Absätze sind vorhanden, keine Tabellenreste im XML.
2. Dasselbe als ODT.
3. Tabelle mit Inhalt (Text, Formatierung, Bild, verschachtelter Liste) befüllen,
   danach löschen → DOCX-Rundreise: weder Tabellen- noch Zellinhalt tauchen im
   reimportierten Dokument wieder auf, umgebender Text unverändert.
4. Dasselbe als ODT-Rundreise.
5. Zwei Tabellen im Dokument, nur eine löschen → Rundreise DOCX und ODT: die
   verbleibende Tabelle bleibt vollständig und unverändert erhalten, nur die gelöschte
   fehlt.
6. Verschachtelte Tabelle: äußere Tabelle löschen (mit innerer Tabelle darin) →
   Rundreise DOCX und ODT: komplette Struktur (äußere und innere Tabelle) fehlt,
   umgebender Inhalt bleibt.
7. Verschachtelte Tabelle: nur die innere Tabelle löschen → Rundreise DOCX und ODT:
   äußere Tabelle bleibt mit ihren übrigen (nicht-verschachtelten) Zellen vollständig
   erhalten, nur der Inhalt der einen betroffenen Zelle verliert die innere Tabelle
   (idealerweise ersetzt durch einen leeren Absatz in dieser Zelle).
8. Cross-Format: im Editor erzeugte, dann gelöschte Tabelle als ODT exportieren,
   reimportieren, als DOCX exportieren, reimportieren (doppelte Rundreise) → Tabelle
   bleibt über beide Konvertierungen hinweg korrekt abwesend, keine „Wiederauferstehung"
   durch einen Konvertierungsfehler.

### 4.2 Import realer Fremddateien, danach Löschen (bereits im Repository vorhandene
Testfixtures unter `tests/fixtures/external/docx/` bzw. `tests/fixtures/external/odt/`)
Diese Dateien müssen für die Verifikation dieses Features verwendet werden (nicht nur
mit selbst konstruierten Minimalbeispielen testen) — jeweils: importieren, die
enthaltene Tabelle löschen, exportieren, reimportieren, prüfen dass die Tabelle fehlt
und aller übriger Inhalt erhalten blieb:

- `tests/fixtures/external/odt/BigTable.odt`, `crazyTable.odt` — große/komplexe
  Tabellen, siehe Grenzfall 3.
- `tests/fixtures/external/odt/subTables.odt`, `subTables2.odt`,
  `subTables3-nested.odt`, `subTables3-onlyOneColumn.odt`, `subTables4.odt`,
  `table-within-textBox-within-frame.odt` — verschachtelte Tabellen, siehe Abschnitt
  2.5 und Grenzfall 7.
- `tests/fixtures/external/odt/table-column-delete-with-merge.odt`,
  `table-column-delete-with-merge-2-times.odt` — ungewöhnliche Merge-/Spaltenstruktur,
  siehe Grenzfall 8.
- `tests/fixtures/external/odt/tableRowDeletionTest.odt`, `tableOps.odt`,
  `tableCoveredContent.odt` — Tabellen mit bereits durch Fremdanwendungen
  vorgenommenen Struktur-Eigenheiten.
- `tests/fixtures/external/odt/OOStyledTable.odt`, `coloredTable_MSO15.odt`,
  `TableFunkyBackground.odt`, `feature_attributes_tables*.odt`,
  `table_1x3_paragraph_background-MSO2013-LO3_6.odt` — Tabellen mit Rahmen-/
  Hintergrund-/Stilformatierung; nach dem Löschen darf keine dieser Stildefinitionen
  als Geisterrest im exportierten Dokument zurückbleiben.
- `tests/fixtures/external/odt/TableWidth.odt`, `tableNotFullWidth.odt` — Tabellen mit
  expliziten Breitenangaben.
- `tests/fixtures/external/odt/simple-table.odt`, `simpleTable.odt`, `simple_table.odt`,
  `simple-table-with-lists.odt`, `listsInTable.odt`, `table.odt`, `table_simple.odt`,
  `TestTextTable.odt`, `doc_heading_table.odt`, `empty4table.odt` — Basisabdeckung,
  jede Datei mindestens ohne Absturz/Textverlust des umgebenden Inhalts löschbar.
- `tests/fixtures/external/docx/TestTableCellAlign.docx`, `TestTableColumns.docx`,
  `deep-table-cell.docx`, `table-alignment.docx`, `table-indent.docx` — DOCX-seitige
  Basis- und Formatierungsabdeckung.
- `tests/fixtures/external/docx/table_footnotes.docx` — Tabelle mit Fußnotenbezug;
  zusätzlich prüfen, dass das Löschen der Tabelle referenzierte Fußnoten sauber
  mit entfernt (bzw. dokumentiert als bekannte Einschränkung behandelt) statt
  verwaiste Fußnoten-Referenzen zu hinterlassen.

**Vorgabe:** Für jede oben genannte Fixture-Datei ist mindestens ein automatisierter
Test erforderlich, der (a) den Import ohne Absturz/Datenverlust prüft, (b) das
Löschen der enthaltenen Tabelle über die tatsächliche Toolbar-Aktion (nicht nur über
direkt am Dokumentmodell konstruierte Testdaten) auslöst, und (c) die Rundreise
(exportieren → reimportieren) auf vollständiges Fehlen der Tabelle bei intaktem
übrigen Inhalt prüft. Bloßes manuelles Anschauen genügt für die Abnahme dieses
Features nicht.

---

## 5. Ist-Stand-Analyse laut Code-Sichtung (Ausgangspunkt der Verifikation)

Diese Beobachtungen stammen aus einer Durchsicht des aktuellen Quellcodes (Stand
dieser Spezifikation) und sind als **zu bestätigende oder zu widerlegende
Verdachtsmomente** zu verstehen — nicht als bereits abgenommene Fehlerliste. Sie sollen
der Verifikation gezielte Ansatzpunkte geben, analog zu Abschnitt 5 der
Nachbar-Spezifikation „Nummerierte Liste" bzw. Abschnitt 17/18 der Hauptspezifikation.

1. **Kein Löschen-Befehl im Datenmodell/Editor vorhanden.**
   `src/formats/shared/editor/commands.ts` exportiert für Tabellen ausschließlich
   `insertTable(rows, cols)`; es gibt keine Funktion `deleteTable`, `removeTable` o. Ä.
   Auch der von `prosemirror-tables` bereitgestellte, fertige `deleteTable`-Befehl wird
   im gesamten Projekt nirgends importiert (die einzigen dortigen Importe sind
   `isInTable` in `commands.ts` sowie `tableEditing`/`columnResizing` als Plugins und
   `tableNodes` fürs Schema in `WordEditor.tsx`/`schema.ts`). **Konsequenz:** Dieses
   Feature ist zu 100 % ungebaut, nicht nur ungetestet.
2. **Kein Toolbar-Button für Löschen.** `src/formats/shared/editor/Toolbar.tsx` enthält
   im Tabellen-Bereich ausschließlich den Einfüge-Button
   (`⊞ Tabelle`, `onMouseDown → insertTable(2, 2)`, mit `aria-pressed={isInTable(...)}`
   als reinem Anzeige-Zustand). Ein zweiter Button zum Löschen fehlt komplett.
3. **Kein Kontextmenü.** Es existiert im gesamten Projekt keinerlei Rechtsklick-
   Kontextmenü für Tabellen oder Zellen.
4. **Keine Tastenkombination.** Das Editor-Keymap in `WordEditor.tsx` bindet nur
   `Mod-z`, `Mod-y`, `Mod-Shift-z`, `Enter` (für Listen-Splitting) sowie `Mod-b/i/u`,
   zusätzlich `baseKeymap` von `prosemirror-commands`. Keiner dieser Einträge behandelt
   eine ganze Tabelle als lösch- oder selektierbares Objekt.
5. **Keine Node-Selektion für ganze Tabellen vorbereitet.** Es gibt keinen Code, der
   eine `CellSelection` (aus `prosemirror-tables`) in eine `NodeSelection` auf dem
   umschließenden `table`-Knoten überführt — ein Klick-Weg „ganze Tabelle als ein
   Objekt markieren" existiert somit auch als Zwischenschritt nicht.
6. **Fallback für „Tabelle ist einziger Dokumentinhalt" nicht vorhanden.** Da es keinen
   Löschmechanismus gibt, existiert erst recht keine Logik, die beim Entfernen des
   letzten verbliebenen Blocks automatisch einen leeren Absatz einsetzt, um die
   Schema-Anforderung `doc: { content: 'block+' }` zu erfüllen (siehe Grenzfall 1) —
   muss beim Bau dieses Features von Grund auf mitgedacht werden.
7. **Kein Aufräumen verwaister Bild-Ressourcen für diesen Fall geprüft.** Die
   Export-Logik (`src/formats/docx/writer.ts`, Funktion `blocksToDocx`/`tableToDocx`
   mit `ImageCollector`) sammelt Bilder durch tatsächliches Durchlaufen des zum
   Exportzeitpunkt aktuellen ProseMirror-Dokuments — ein Bild in einer bereits aus dem
   Dokument entfernten Tabelle würde dadurch strukturell gar nicht erst erfasst. Dieses
   Verhalten **sollte** also bereits „automatisch richtig" sein, sobald die Löschfunktion
   selbst korrekt implementiert ist; es ist aber noch **nicht durch einen Test
   bestätigt**, dass dies für den konkreten Fall „Tabelle mit Bild löschen, dann
   exportieren" tatsächlich zutrifft (siehe Grenzfall 14) — reine Vermutung aus
   Code-Lesen, keine verifizierte Tatsache.
8. **Verschachtelte Tabellen sind laut Schema erlaubt, aber ungetestet für Löschzwecke.**
   `cellContent: 'block+'` in `tableNodes({...})` (siehe `schema.ts`) erlaubt beliebige
   Blockinhalte inklusive weiterer Tabellen in einer Zelle; reale Fixtures mit
   verschachtelten Tabellen liegen bereits vor (`subTables*.odt`), es gibt aber noch
   keinerlei Code (weder Lösch- noch sonstige Sonderbehandlung), der zwischen „innere"
   und „äußere" Tabelle beim Löschen unterscheidet, weil die Grundfunktion insgesamt
   fehlt.
9. **Bestehende automatisierte Tests decken Tabellen nur für Reader/Writer/Einfügen
   ab.** Eine Durchsicht von `src/formats/docx/__tests__/roundtrip.test.ts` und
   `src/formats/odt/__tests__/roundtrip.test.ts` sowie `tests/e2e/` zeigt: Es existiert
   kein einziger Test (weder Unit- noch E2E-Test), der das Löschen einer Tabelle über
   echte Bedienung nachstellt — die einzige tabellenbezogene E2E-Testdatei im
   Projekt (`tests/e2e/selection-regression.spec.ts`) behandelt den allgemeinen
   Selection-Sync-Bug, nicht das Löschen selbst.
10. **Verhältnis zu `zeile-loeschen`/`spalte-loeschen`:** Auch diese beiden
    Nachbarfunktionen sind laut Backlog „fehlt" und teilen denselben Befund (kein
    Command, kein UI). Sie sind nicht Gegenstand dieser Spezifikation, bestätigen aber
    das Gesamtbild aus Abschnitt 17 der Hauptspezifikation: Tabellen-Kontextfunktionen
    fehlen als Gruppe vollständig in der UI.

**Einordnung:** Der Backlog-Status „fehlt" trifft nach dieser Code-Sichtung mit hoher
Sicherheit zu — im Unterschied zu anderen Features in diesem Projekt, bei denen
„Verifikation" vor allem bedeutet, eine vorhandene, aber unsicher wirkende Funktion zu
bestätigen oder zu widerlegen, bedeutet „Verifikation" hier zu großen Teilen: **das
Feature erstmals bauen** und dabei jeden Punkt dieser Spezifikation durch echte
Bedienung im Browser nachweisen, bevor der Backlog-Status auf „vorhanden" geändert
werden darf.

---

## 6. Testfälle (Zusammenfassung, Pflichtumfang)

1. Toolbar-Button „Tabelle löschen" erscheint/aktiviert sich korrekt nur bei Cursor
   innerhalb einer Tabelle, deaktiviert außerhalb (Abschnitt 1).
2. Klick auf den Button entfernt die komplette Tabelle inkl. Inhalt, unabhängig davon,
   in welcher Zelle der Cursor stand (Abschnitt 2.1).
3. Abgrenzung: Entf/Backspace auf markiertem Zellinhalt leert nur den Inhalt, entfernt
   nie implizit die Tabellenstruktur (Abschnitt 2.2).
4. Falls ein tastaturbasierter Weg zum vollständigen Löschen umgesetzt wird: liefert
   dasselbe Ergebnis wie der Toolbar-Button (Abschnitt 2.2).
5. Cursor-Ziel nach dem Löschen ist deterministisch und der Editor bleibt sofort
   bedienbar, inklusive Sonderfall „Tabelle war einziger Dokumentinhalt" (Abschnitt 2.3,
   Grenzfall 1).
6. Undo/Redo stellt Tabelle bit-genau wieder her bzw. entfernt sie erneut, auch über
   mehrere Zyklen (Abschnitt 2.4, Grenzfall 11).
7. Verschachtelte Tabelle: innere und äußere Tabelle je einzeln als Ziel testen
   (Abschnitt 2.5, Grenzfall 7).
8. Zusammenspiel mit Bild-Aufräumen (keine verwaisten Ressourcen im Export) und mit
   Listen in Zellen (Abschnitt 2.6, Grenzfall 14).
9. Regressionstest für den Selection-Sync-Bug im Tabellenkontext unmittelbar vor dem
   Löschen (Abschnitt 2.4, Grenzfall 9) — Pflichttest, da Tabellen als
   Hauptverdachtsfall gelten.
10. Alle Grenzfälle aus Abschnitt 3 (1–16) einzeln als eigener Testfall.
11. Rundreise DOCX **und** ODT für jede im Editor erzeugbare/löschbare Konfiguration
    (Abschnitt 4.1, Punkte 1–8).
12. Import + Löschen + Rundreise für jede reale Fixture-Datei aus Abschnitt 4.2 — kein
    Test gilt als abgeschlossen, solange nicht mindestens diese Dateien einbezogen
    wurden.
13. Validierung des DOCX-Exports einer Datei, die vor dem Export mehrere Tabellen
    unterschiedlicher Komplexität hatte, von denen einige gelöscht wurden, gegen einen
    unabhängigen Parser (nicht nur den projekteigenen Reader), analog Abschnitt 19 der
    Hauptspezifikation.
14. Dasselbe für ODT gegen das ODF-Schema bzw. einen unabhängigen Parser.

---

## 7. Definition of Done

Das Feature „Tabelle löschen" gilt erst dann als verifiziert und vertrauenswürdig,
wenn:

- jeder Punkt aus Abschnitt 2 (gewünschtes Verhalten) über echte Bedienung im Browser
  nachgewiesen ist (nicht nur über konstruierte Testdaten für Reader/Writer),
- jeder Grenzfall aus Abschnitt 3 einen zugeordneten, dauerhaft in der Suite
  verbleibenden Test hat,
- die Rundreise-Anforderung aus Abschnitt 4 für **beide** Formate und **alle** dort
  gelisteten realen Fixture-Dateien nachgewiesen ist,
- zu jedem Verdachtspunkt aus Abschnitt 5 ein eindeutiges Ergebnis vorliegt (bestätigt
  und behoben durch tatsächlichen Bau der fehlenden Funktion / bestätigt und bewusst
  als bekannte Einschränkung dokumentiert / widerlegt) — kein Punkt darf offen bleiben,
- kein Punkt dieser Spezifikation zu einem stillen Fehlschlag führt (siehe Abschnitt 20
  der Hauptspezifikation: jede nicht ausführbare Aktion muss sichtbar zurückmelden,
  statt wirkungslos zu bleiben),
- der Backlog-Eintrag `tabelle-loeschen` in `specs/FEATURE-BACKLOG.md` erst nach
  Erfüllung aller obigen Punkte von „fehlt" auf „vorhanden" geändert wird.
