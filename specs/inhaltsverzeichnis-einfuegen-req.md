# Anforderungsspezifikation: Feature „Inhaltsverzeichnis einfügen“

Status: **Nicht vertrauenswürdig — vollständige Verifikation ausstehend, Feature laut
Codebasis vollständig unimplementiert.** Laut `specs/FEATURE-BACKLOG.md` Abschnitt 5.1
(„Verzeichnisse“, Zeile 305–313, Slug `inhaltsverzeichnis-einfuegen`, Zeile 309) als
**fehlt** geführt (Priorität 1/essenziell), Beschreibung dort: „Generiert automatisch ein
Verzeichnis aus vorhandenen Überschriften.“ `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 10
(Zeile 235–250) und Abschnitt 17 (Zeile 362) bestätigen unabhängig denselben Befund:
„Laut Plan Teil von Phase 3 — noch nicht begonnen“, Soll-Zustand „siehe Abschnitt 10“.
Anders als bei den meisten anderen Einzeldateien in diesem Ordner (z. B.
`tabelle-einfuegen-req.md`) gibt es hier **keinen** Ist-Code, der überhaupt teilweise
funktioniert oder ausgebaut werden könnte — die Grundlagen-Tabelle unten dokumentiert
deshalb überwiegend **Abwesenheit** relevanter Infrastruktur (keine Feldcodes, keine
Bookmarks/Anker, kein Toc-Node im Schema), nicht bloß fehlende UI-Verdrahtung
bestehender Commands. Diese Datei macht die Anforderung dennoch so detailliert und
einzeln abhakbar, dass ein QA-/Umsetzungs-Agent jeden Punkt über echte
Browser-Bedienung (nicht nur Unit-Tests) nachweisen oder als „gebaut, aber falsch“
widerlegen kann.

Geltungsbereich: Ausschließlich das **Einfügen** eines neuen Inhaltsverzeichnisses
(Toolbar-Auslöser, Options-Dialog zur Ebenentiefe, automatische Generierung aus den zum
Einfügezeitpunkt vorhandenen Überschriften, Platzierung im Dokument, sofortige
Klick-Navigierbarkeit als Mindestanforderung an ein frisch eingefügtes, überhaupt
nutzbares Verzeichnis) für **beide** Formate, DOCX und ODT — sowohl als neu im Editor
erzeugtes Element als auch beim Export und der anschließenden Rundreise (im Editor
erzeugen → unverändert exportieren → erneut importieren → Ergebnis entspricht
inhaltlich dem Original **und** bleibt als Verzeichnis erkennbar, zerfällt nicht in
gewöhnlichen Text). Stil und Gliederung orientieren sich an
`E:\docs\FEATURE-SPEC-DOCX-ODT.md` sowie an `specs/tabelle-einfuegen-req.md` als
Vorlage für den Detaillierungsgrad.

**Ausdrücklich außerhalb des Geltungsbereichs** dieser Datei (eigene, separate
Backlog-Einträge in `FEATURE-BACKLOG.md` Abschnitt 5.1, jeweils Status „fehlt“, dort
einzeln zu verifizieren, sobald gebaut):
- `inhaltsverzeichnis-aktualisieren` (Zeile 310, Priorität 1) — der wiederholte
  Update-Workflow **nachdem** bereits ein Verzeichnis im Dokument existiert und sich
  Überschriften danach geändert/verschoben/gelöscht haben. Diese Datei fordert nur, dass
  überhaupt ein sichtbarer, funktionierender Weg zur Aktualisierung existieren **muss**
  (sonst wäre ein frisch eingefügtes Verzeichnis von Anfang an eine Sackgasse), behandelt
  aber die Detail-Grenzfälle des Aktualisierungsvorgangs selbst (z. B. partielles vs.
  vollständiges Neuberechnen, Verhalten bei manuell nachträglich in den ToC-Text
  eingefügten Änderungen) nicht abschließend.
- `abbildungsverzeichnis` (Zeile 311, Priorität 3), `index-eintrag-markieren` (Zeile 312,
  Priorität 4), `index-einfuegen` (Zeile 313, Priorität 4) — eigenständige
  Verzeichnis-Arten (Abbildungen/Tabellen, Stichwortverzeichnis), nicht Teil dieser Datei.
- `hyperlink-einfuegen`/`hyperlink-bearbeiten`/`hyperlink-entfernen` (Abschnitt 3.5 der
  Backlog-Datei, Status „fehlt“) — allgemeine, vom Nutzer frei setzbare Links sind ein
  eigenes Feature; diese Datei behandelt **nur** die intern vom Verzeichnis selbst
  benötigte Sprung-/Anker-Mechanik, nicht das allgemeine Hyperlink-Feature.
- `seitenzahl-einfuegen` (Abschnitt 3.7 der Backlog-Datei) — eigenständiges Feld-Feature;
  wird hier nur insoweit berührt, als die Frage „zeigt ein ToC-Eintrag eine Seitenzahl“
  direkt von der noch fehlenden Seitenzahl-Feld-Infrastruktur abhängt (siehe Grenzfall 15).
- Die Erzeugung von Überschriften selbst (`absatzformat-dropdown`, bereits **vorhanden**,
  siehe `specs/absatzformat-dropdown-req.md`) — diese Datei setzt voraus, dass
  Überschriften bereits über das bestehende Absatzformat-Dropdown erzeugt werden können,
  und definiert nicht erneut, wie eine Überschrift gesetzt wird.

Referenzierter Ist-Stand des Codes (Grundlage dieser Anforderung, **kein** Nachweis der
Korrektheit — das ist Aufgabe der Verifikation; wo nichts existiert, ist das explizit
vermerkt, weil es selbst ein Befund ist):

| Ort | Inhalt |
|---|---|
| `src/formats/shared/schema.ts:19-31` | `heading`-Node mit `attrs: { level (1-6), align }`, `defining: true`; einzige strukturelle Quelle „vorhandener Überschriften“, aus denen ein Verzeichnis überhaupt generiert werden könnte. **Kein** eigener `toc`-Node existiert im Schema (`schema.ts:6-107` listet alle Nodes vollständig auf) — ein eingefügtes Verzeichnis müsste entweder als neuer Node-Typ ins Schema aufgenommen oder als reine Absatz-/Listenstruktur ohne Sonderstatus abgebildet werden; diese Entscheidung ist aktuell **offen** (siehe Grenzfall 8 und Abschnitt 2.9). |
| `src/formats/shared/editor/Toolbar.tsx` (247 Zeilen gesamt) | Kein Treffer für „Inhaltsverzeichnis“/„TOC“ im gesamten Datei; `currentHeadingLevel()` (Zeile 87-95) und das Absatzformat-`<select>` (Zeile 116-131) sind der einzige bestehende Mechanismus, um Überschriften zu erzeugen bzw. zu erkennen — kann von einer ToC-Generierungslogik zum Auslesen wiederverwendet werden (durchläuft dafür bislang aber nur den lokalen Cursor-Pfad, nicht das gesamte Dokument; eine neue Traversierungsfunktion über `view.state.doc` ist zusätzlich nötig). |
| `src/app/PrivacyModal.tsx` (38 Zeilen) | Einziges im Projekt vorhandene Dialog-/Modal-Muster (Fokus-Falle, Schließen-Mechanismus) — ein Options-Dialog für Ebenentiefe müsste dieses Muster erweitern; es existiert noch kein wiederverwendbares generisches Modal-Grundgerüst, jeder neue Dialog dupliziert bislang das Muster (bereits als Lücke in `tabelle-einfuegen-req.md` dokumentiert). |
| `src/formats/shared/editor/WordEditor.tsx` (134 Zeilen) | Kein `scrollIntoView`/Sprung-Mechanismus irgendeiner Art vorhanden; einziger Spezialmechanismus ist `reconcileSelectionOnClick` (Zeile 42-53) für den Selection-Sync-Bug beim `mouseup`. Eine „Klick auf ToC-Eintrag springt zur Überschrift“-Funktion muss vollständig neu gebaut werden (Cursor-Positionierung **und** sichtbares Scrollen im `overflow-auto`-Container, Zeile 119). |
| `src/formats/shared/editor/pagination.ts` (115 Zeilen) | Seitenumbrüche werden rein **visuell** über ProseMirror-Decorations berechnet (`computePageBreakIndices`, Zeile 12-24; `measureAndBuildDecorations`, Zeile 33-60), abhängig von live gemessenen DOM-Höhen (`getBoundingClientRect()`, Zeile 36) und bei jedem View-Update per `requestAnimationFrame` neu berechnet (Zeile 90-99). Es gibt **keine** exportierte/stabile Funktion, um „auf welcher Seite steht Überschrift X gerade“ nachzuschlagen, und das Ergebnis hängt von Fensterbreite/Zoom ab, nicht von einem gespeicherten Seitenmodell. Direkt relevant für die offene Frage, ob ein ToC-Eintrag im Editor selbst eine (dann zwangsläufig instabile) Seitenzahl anzeigen soll — siehe Grenzfall 15. |
| `src/formats/shared/documentModel.ts:3-8` | `WordDocumentContent { body, header, footer, meta: { title } }` — kein Feld für ToC-Einstellungen (eingeschlossene Ebenen, Position, zuletzt generierter Stand). Ein eingefügtes Verzeichnis müsste vollständig innerhalb von `body` (bzw. potenziell `header`/`footer`, sobald deren UI existiert) als gewöhnlicher Inhalt oder neuer Node-Typ leben. |
| `src/formats/docx/reader.ts:48-75` | `parseStylesXml()`/`headingLevelForStyle()` — liest Überschriften-Ebene **robust** entweder über `w:outlineLvl` in `styles.xml` (Zeile 58-64, deckt auch lokalisierte/benutzerdefinierte Formatvorlagennamen ab, nicht nur „HeadingN“) oder per Regex `^Heading\s?([1-6])$` auf die `w:pStyle`-ID (Zeile 72). Diese Erkennung ist die einzige nutzbare Grundlage, um beim **Import** einer Fremddatei überhaupt Überschriften für ein späteres Verzeichnis korrekt zu identifizieren. |
| `src/formats/docx/writer.ts:106-111`, `src/formats/docx/styleDefs.ts` | Überschriften werden beim Export **immer** mit `w:pStyle="HeadingN"` (`HEADING_STYLE_ID`, `styleDefs.ts:5-7`) und passendem `w:outlineLvl` in `styles.xml` (`styleDefs.ts:9-30`) geschrieben — konsistente, vom eigenen Reader **und** von Word selbst auswertbare Grundlage für eine spätere TOC-Feld-Generierung. |
| **Feldcode-Infrastruktur DOCX** | `grep -rniE "fldChar\|fldSimple\|instrText\|w:field" src/formats/docx` liefert **null Treffer** außerhalb von Testdaten. Es existiert **keinerlei** Mechanismus, um ein Word-„Feld“ (z. B. `<w:fldSimple w:instr=" TOC \o \"1-3\" \h \z \u ">` oder das `w:fldChar`/`w:instrText`-Paar-Muster) zu schreiben oder beim Import zu erkennen — auch nicht für andere Felder wie Seitenzahlen (`seitenzahl-einfuegen`, ebenfalls „fehlt“). Ein „echtes TOC-Feld“ zu exportieren ist damit **keine** Erweiterung einer bestehenden Funktion, sondern eine komplett neue Schreib-/Lese-Fähigkeit. |
| **Bookmark-/Anker-Infrastruktur DOCX & ODT** | `grep -rniE "bookmark" src/formats/docx src/formats/odt` liefert **null Treffer** außerhalb von Testdaten. Die in echten Word-Dokumenten übliche Konvention, TOC-Einträge per `w:hyperlink w:anchor="_TocNNNNNN"` auf ein `w:bookmarkStart`/`w:bookmarkEnd`-Paar um die jeweilige Überschrift verweisen zu lassen, existiert nicht — muss für einen „von Word aktualisierbaren“ Sprungmechanismus im Export neu gebaut werden. |
| **Hyperlink-Infrastruktur** | `grep -rniE "hyperlink" src/formats` liefert **null Treffer** außerhalb von Testdaten — bestätigt den Backlog-Status „fehlt“ für `hyperlink-einfuegen`. Die In-Editor-Klick-Navigation (Abschnitt 2.6 dieser Datei) kann unabhängig davon rein clientseitig funktionieren, ohne die Hyperlink-Mark wiederzuverwenden — der **Export** eines „von Word selbst befolgbaren“ Sprungziels benötigt aber dieselbe Anker-Mechanik wie ein echter Hyperlink. |
| `src/formats/odt/reader.ts:170-175` | Analoge Überschriften-Erkennung für ODT: `text:h`, `text:outline-level`-Attribut, Ausrichtung aus zugehörigem Absatzstil. Ebenso robuste Grundlage wie beim DOCX-Reader. |
| `src/formats/odt/writer.ts:69-74`, `src/formats/odt/styleRegistry.ts:80-92` | Export erzeugt `<text:h text:style-name="HeadingN-align" text:outline-level="N">`; `headingStyleName()`/`headingStyleDefs()` generieren die zugehörigen Absatzstile. Kein Treffer für `text:table-of-content` in `odt/writer.ts` (`blockToOdt()`-`switch`, Zeile 61-111 vollständig durchsucht) — der ODT-Fall müsste als komplett neuer `case` ergänzt werden. |
| `src/formats/odt/reader.ts` | Kein Treffer für `text:table-of-content` im gesamten Reader — eine reale ODT-Datei mit vorhandenem Inhaltsverzeichnis würde dieses Element aktuell nicht erkennen (Fallback-Verhalten unbekannt/ungetestet, siehe Grenzfall 17 und `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18). |

---

## 1. Menüpunkte/Bedienelemente

| # | Element | Fundstelle | Ist-Verhalten laut Code | Anforderung |
|---|---|---|---|---|
| 1 | Toolbar-Button „Inhaltsverzeichnis einfügen“ | **nicht vorhanden** (kein Treffer in `Toolbar.tsx`) | — | Neuer Button in der Toolbar (eigene Gruppe „Referenzen“, da aktuell keine solche Gruppe existiert — die Toolbar ist bislang rein nach Zeichen-/Absatzformatierung/Listen/Tabelle/Bild gegliedert, Zeile 110-246), analog im Aufbau zu „⊞ Tabelle" (Zeile 228-239); Klick öffnet **immer zuerst** den Options-Dialog, kein Direkteinfügen ohne Rückfrage. |
| 2 | Options-Dialog „Ebenentiefe wählen“ | **nicht vorhanden** (kein Dialog-Code außer `PrivacyModal.tsx`) | — | Auswahl, bis zu welcher Überschriften-Ebene Einträge aufgenommen werden (z. B. Zahlenfeld/Dropdown 1-6, sinnvoller Standard z. B. „bis Ebene 3"); Bestätigen-Button generiert und fügt ein; Abbrechen/Escape/Klick außerhalb schließt ohne Dokumentänderung, analog zum in `tabelle-einfuegen-req.md` Abschnitt 2.1 geforderten Muster. |
| 3 | Generierungslogik „Überschriften sammeln“ | **nicht vorhanden**, kein Äquivalent in `commands.ts` | — | Neue Funktion, die `view.state.doc` vollständig durchläuft (nicht nur den Cursor-Pfad wie `currentHeadingLevel()`, `Toolbar.tsx:87-95`), alle `heading`-Knoten bis zur gewählten Tiefe in Dokumentreihenfolge sammelt und daraus die Verzeichnis-Einträge (Text, Ebene, Sprungziel) ableitet. |
| 4 | Darstellung des eingefügten Verzeichnisses im Dokument | **nicht vorhanden** (kein `toc`-Node im Schema, `schema.ts:6-107`) | — | Visuell klar abgesetzter Bereich (z. B. grauer Hintergrund/Rahmen, analog zur „Feld"-Schattierung in Word), Einträge entsprechend ihrer Heading-Ebene eingerückt dargestellt; muss als zusammenhängende Einheit erkennbar sein, nicht als beliebige, einzeln editierbare Absätze, die zufällig wie ein Verzeichnis aussehen. |
| 5 | Klick auf einzelnen ToC-Eintrag | **nicht vorhanden** (`WordEditor.tsx` enthält keinerlei Scroll-/Sprung-Mechanismus) | — | Klick scrollt den Editor-Container (`overflow-auto`, `WordEditor.tsx:119`) zur referenzierten Überschrift und platziert den Cursor dort; muss auch funktionieren, wenn die Zielüberschrift auf einer anderen visuellen Seite liegt (Zusammenspiel mit `pagination.ts`). |
| 6 | „Aktualisieren"-Bedienelement am eingefügten Verzeichnis | **nicht vorhanden** | — | Mindestens ein sichtbarer, klickbarer Weg, das Verzeichnis nach Überschriften-Änderungen neu zu berechnen, muss existieren (Detailanforderungen an den Ablauf selbst: siehe separater Slug `inhaltsverzeichnis-aktualisieren`, außerhalb des Geltungsbereichs dieser Datei). |
| 7 | Export als DOCX-Feld (`TOC`-Feldcode) | **nicht vorhanden**, keinerlei Feldcode-Infrastruktur im gesamten Projekt (0 Treffer `fldChar`/`fldSimple`/`instrText` in `src/formats/docx`) | — | Muss vollständig neu gebaut werden: Serialisierung als `w:fldSimple`/`w:fldChar`+`w:instrText`-Paar mit `TOC`-Instruktion (z. B. `TOC \o "1-3" \h \z \u`), sodass Word das Feld selbst als aktualisierbares Inhaltsverzeichnis erkennt — nicht als vorab festgeschriebener Text ohne Feld-Charakter. |
| 8 | Export als ODT-Element (`text:table-of-content`) | **nicht vorhanden** (`odt/writer.ts` `blockToOdt()`-`switch`, Zeile 61-111, kennt keinen entsprechenden `case`) | — | Neuer `case` mit `<text:table-of-content><text:table-of-content-source>…</text:table-of-content-source><text:index-body>…</text:index-body></text:table-of-content>`. |
| 9 | Bookmarks/Anker um Überschriften (DOCX) | **nicht vorhanden** (0 Treffer `bookmark` in `src/formats/docx`) | — | Muss neu gebaut werden, sobald der Export-Weg feststeht (siehe Grenzfall 8) — nötig, damit sowohl die eigene Reimport-Logik als auch Word selbst jeden ToC-Eintrag einer konkreten Überschrift zuordnen können. |
| 10 | Import-Erkennung eines bereits vorhandenen TOC-Feldes/-Elements | **nicht vorhanden** in beiden Readern (`docx/reader.ts`, `odt/reader.ts`) | — | Mindestens Fallback-Verhalten aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18: sichtbarer Text bleibt erhalten, kein Absturz, kein stiller Totalverlust — siehe Grenzfälle 16/17. |
| 11 | Tastenkombination zum Einfügen | nicht vorhanden | — | Kein Blocker; optional ergänzbar, solange der Toolbar-Weg zuverlässig funktioniert. |
| 12 | Kontextmenü (Rechtsklick) „Inhaltsverzeichnis einfügen" | nicht vorhanden | — | Kein Kontextmenü-Eintrag vorhanden; nicht Teil dieser Anforderung, aber als fehlend zu dokumentieren. |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Öffnen des Dialogs
- Klick auf den neuen Toolbar-Button „Inhaltsverzeichnis einfügen" öffnet **immer**
  zuerst den Options-Dialog — kein Direkt-Einfügen ohne Rückfrage (analog zur
  Forderung in `tabelle-einfuegen-req.md` Abschnitt 2.1, damit die feste-Voreinstellung-
  Falle aus dem Tabellen-Feature sich hier nicht wiederholt).
- Dialog erscheint sichtbar über/neben dem Editor, blockiert die übrige Bedienung
  nicht dauerhaft (Escape/Klick außerhalb schließt ihn), analog zum bestehenden Muster
  in `PrivacyModal.tsx`.
- Fokus liegt beim Öffnen auf dem ersten Eingabeelement (Ebenentiefe).

### 2.2 Auswahl der Ebenentiefe
- Mindestens eine Auswahl, bis zu welcher Heading-Ebene (1-6) Einträge aufgenommen
  werden; sinnvoller Standardwert vorbelegt (z. B. „bis Ebene 3", der in Word/
  LibreOffice übliche Standard).
- Bestätigen ruft die neue Generierungsfunktion mit der gewählten Tiefe auf und fügt
  das Ergebnis an der Cursor-Position ein; Abbrechen ändert nichts am Dokument,
  Cursor-Position/Selektion bleiben exakt erhalten.

### 2.3 Generierung aus vorhandenen Überschriften
- Die Generierung durchläuft das **gesamte** Dokument (`view.state.doc`) in
  Dokumentreihenfolge, nicht nur den sichtbaren Ausschnitt oder den Cursor-Pfad.
- Für jede `heading`-Node mit `level` ≤ gewählter Tiefe wird ein Eintrag erzeugt:
  sichtbarer Text (Klartext der Überschrift, ohne dass fette/kursive/farbige
  Zeichenformatierung der Überschrift selbst zwingend in den ToC-Eintrag übernommen
  werden muss — reine Textübernahme ist ausreichend und muss explizit als
  gewolltes, dokumentiertes Verhalten festgehalten werden, nicht als zufälliges
  Nebenprodukt), Einrückung entsprechend `level`, Sprungziel = Position der
  Überschrift zum Generierungszeitpunkt.
- Enthält das Dokument **keine** Überschrift bis zur gewählten Tiefe, wird trotzdem
  ein (leeres oder mit Hinweistext „Keine Überschriften gefunden" versehenes)
  Verzeichnis-Element eingefügt statt eines stillen No-Ops — siehe Grenzfall 2.
- Die Reihenfolge im Verzeichnis entspricht exakt der Reihenfolge der Überschriften
  im Dokument, unabhängig von der jeweiligen Ebene (kein Umsortieren nach Ebene).

### 2.4 Platzierung im Dokument
- Das Verzeichnis wird an der aktuellen Cursor-Position bzw. anstelle der aktuellen
  Selektion eingefügt (ist Text markiert, wird dieser ersetzt — analog zum in
  `tabelle-einfuegen-req.md` Abschnitt 2.3 dokumentierten Standardverhalten für
  Block-Einfügungen in diesem Editor).
- Nach dem Einfügen befindet sich der Cursor in einem sinnvollen Zustand (z. B.
  unmittelbar nach dem eingefügten Verzeichnis), nicht in einem undefinierten Zustand
  oder innerhalb des Verzeichnis-Elements selbst, falls dieses als nicht direkt
  durchtippbar konzipiert wird (siehe Grenzfall 8/Abschnitt 2.9 zur Frage der
  Editierbarkeit).

### 2.5 Darstellung direkt nach dem Einfügen
- Visuell klar als zusammenhängender, besonderer Bereich erkennbar (z. B. grauer
  Hintergrund analog zur Feld-Schattierung in Word bei aktivierter Feldschattierung),
  nicht als beliebige Absatzfolge, die zufällig wie ein Verzeichnis aussieht.
- Einträge zeigen mindestens: Überschriftentext, Einrückung nach Ebene. Ob zusätzlich
  eine Seitenzahl angezeigt wird, ist **offen** und muss vor Abnahme entschieden und
  dokumentiert werden (siehe Grenzfall 15 — `pagination.ts` liefert aktuell keine
  stabile, exportierbare Seiten-Zuordnung).

### 2.6 Klick-Navigation
- Klick auf einen Eintrag scrollt den Editor-Viewport so, dass die referenzierte
  Überschrift sichtbar wird, und setzt den Cursor an den Anfang dieser Überschrift.
- Muss unabhängig davon funktionieren, ob die Zielüberschrift aktuell oberhalb,
  unterhalb oder weit außerhalb des sichtbaren Bereichs liegt, und unabhängig von
  den rein visuellen Seitenumbrüchen aus `pagination.ts` (Sprung funktioniert
  dokumentweit, nicht nur „innerhalb derselben visuellen Seite").
- Muss mit der Selektions-Synchronisation aus `WordEditor.tsx` (`reconcileSelectionOnClick`,
  Zeile 42-53) zusammenspielen, ohne den Selection-Sync-Bug (`FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 2) auszulösen — ein Klick auf einen ToC-Eintrag ist selbst ein Mausklick im
  Editor-DOM und damit ein potenzieller neuer Verdachtsfall (siehe Grenzfall 18).

### 2.7 Undo/Redo
- Einfügen des Verzeichnisses ist ein einzelner, eigenständiger Undo-Schritt.
- Undo direkt nach dem Einfügen entfernt das komplette Verzeichnis wieder und stellt
  den vorherigen Dokumentzustand (Cursor-Position, umgebender Text) exakt wieder her.
- Redo stellt das eingefügte Verzeichnis inklusive aller Einträge erneut her.

### 2.8 Zusammenspiel mit dem Aktualisieren-Mechanismus
- Direkt nach dem Einfügen muss der Nutzerin sofort klar sein, **wie** das Verzeichnis
  später aktualisiert werden kann (sichtbares Bedienelement, siehe Abschnitt 1, Zeile 6)
  — auch wenn der detaillierte Ablauf der eigentlichen Aktualisierung selbst außerhalb
  des Geltungsbereichs dieser Datei liegt (separater Slug `inhaltsverzeichnis-aktualisieren`).
- Solange keine Aktualisierung ausgelöst wurde, bleibt ein einmal eingefügtes
  Verzeichnis unverändert bestehen, auch wenn sich Überschriften danach ändern — dieses
  bewusste „Einfrieren bis zur expliziten Aktualisierung" muss als gewolltes Verhalten
  dokumentiert sein (entspricht dem Verhalten echter TOC-Felder in Word/LibreOffice),
  nicht als Bug fehlinterpretiert werden.

### 2.9 Editierbarkeit des eingefügten Verzeichnisses
- **Offene Entscheidung, vor Abnahme zu treffen und hier nachzutragen:** Soll der
  Text innerhalb eines eingefügten Verzeichnisses direkt durch Tippen editierbar sein
  (wie gewöhnlicher Absatztext, mit dem Risiko, dass manuelle Änderungen bei der
  nächsten Aktualisierung kommentarlos überschrieben werden), oder soll der Bereich
  gegen direkte Texteingabe geschützt sein (wie ein „Feld" in Word, das erst nach
  bewusstem Aufheben der Feld-Verknüpfung frei editierbar wird)? Unabhängig vom
  Ergebnis: Es darf zu keinem Editor-Absturz oder inkonsistenten Dokumentzustand
  kommen, wenn versucht wird, in das Verzeichnis hineinzutippen.

### 2.10 Sonderpositionen beim Einfügen
- Verzeichnis direkt am Dokumentanfang einfügen → Dokument bleibt danach vollständig
  weiter editierbar (Cursor kann davor/danach positioniert werden), analog zur
  Anforderung aus `tabelle-einfuegen-req.md` Abschnitt 2.8.
- Einfügen mit Cursor innerhalb einer bestehenden Tabellenzelle oder eines
  Listenelements → Verhalten muss definiert und getestet werden (Verzeichnis
  unterbricht die Struktur vs. wird eingebettet), nicht zufälliges Schema-Ergebnis
  (siehe Grenzfall 9, analog zur offenen Frage in `tabelle-einfuegen-req.md`
  Abschnitt 2.8/Grenzfall 7-8).

---

## 3. Grenzfälle

1. **Dialog abbrechen:** Escape/„Abbrechen"/Klick außerhalb → kein Verzeichnis wird
   eingefügt, Cursor-Position und Selektion bleiben exakt wie vor dem Öffnen erhalten.
2. **Keine Überschrift im Dokument vorhanden:** Einfügen führt zu einem sichtbaren,
   sinnvollen Ergebnis (leeres Verzeichnis mit Hinweistext oder vergleichbar), nicht
   zu einem stillen No-Op, einem JS-Fehler oder einem leeren, aber nicht als
   Verzeichnis erkennbaren Absatz.
3. **Genau eine einzige Überschrift vorhanden:** Verzeichnis mit genau einem Eintrag,
   Klick darauf springt korrekt zu dieser einen Überschrift.
4. **Sehr viele Überschriften (z. B. 200):** UI bleibt reaktionsfähig (kein
   Einfrieren) sowohl beim Generieren als auch beim späteren Scrollen/Klicken im
   Verzeichnis.
5. **Sehr langer Überschriftentext (mehrzeilig im Editor):** Darstellung im
   Verzeichnis-Eintrag muss definiert sein (Umbruch, Kürzung mit „…" o. Ä.), darf
   nicht das Layout des restlichen Dokuments sprengen.
6. **Überschrift mit Inline-Formatierung (fett/farbig/Link) im Text:** Zu klären, ob
   der ToC-Eintrag die reine Textdarstellung übernimmt (empfohlen, siehe Abschnitt
   2.3) oder die Formatierung mitkopiert — Ergebnis muss konsistent und dokumentiert
   sein, nicht zufällig je nach Formatierungsart unterschiedlich.
7. **Sprünge in der Ebenen-Hierarchie** (z. B. Überschrift 1 direkt gefolgt von
   Überschrift 4, ohne 2/3 dazwischen): Einrückung im Verzeichnis muss der
   tatsächlichen Ebene folgen (z. B. vier Einrückungsstufen trotz übersprungener
   Zwischenebenen), nicht künstlich auf lückenlose Ebenen normalisiert werden, ohne
   dass dies dokumentiert ist.
8. **Einfügen mit Cursor innerhalb einer bestehenden Tabellenzelle oder eines
   Listenelements:** Verhalten (Unterbrechung der Struktur vs. Einbettung) muss
   definiert und getestet werden, analog zur offenen Frage bei verschachtelten
   Tabellen in `tabelle-einfuegen-req.md` Grenzfall 7-8; darf zu keinem Absturz führen.
9. **Mehrfaches Einfügen mehrerer Inhaltsverzeichnisse im selben Dokument:** Muss
   möglich sein (oder bewusst verhindert werden, mit sichtbarer Rückmeldung) — kein
   stiller Fehlschlag beim zweiten Einfügeversuch; falls erlaubt, müssen beide
   Verzeichnisse unabhängig voneinander funktionieren (jeweils eigene, nicht
   kollidierende Sprungziele/Anker beim Export).
10. **Einfügen bei aktiver Textselektion:** Markierter Text wird durch das
    Verzeichnis ersetzt (kein Zusammenführen) — muss als gewolltes, dokumentiertes
    Verhalten bestätigt sein.
11. **Undo direkt nach Einfügen, gefolgt von weiterem Tippen:** Darf nicht zu
    Inhaltsverlust führen (Kombination Grenzfall 11 mit dem Selection-Sync-Bug-Muster
    aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2).
12. **Überschrift nachträglich gelöscht/umbenannt, ohne dass „Aktualisieren"
    ausgelöst wurde:** Das bestehende Verzeichnis bleibt unverändert (veraltet)
    bestehen — muss als erwartetes Verhalten dokumentiert sein, nicht als Bug
    gemeldet werden (siehe Abschnitt 2.8).
13. **Klick auf einen ToC-Eintrag, dessen referenzierte Überschrift inzwischen
    gelöscht wurde** (Verzeichnis nicht aktualisiert, Ziel existiert nicht mehr):
    Definiertes, nicht abstürzendes Fehlerverhalten (z. B. kein Sprung, sichtbare
    Rückmeldung statt stillem No-Op) muss festgelegt werden.
14. **Überschriftentext mit Sonderzeichen/Umlauten/Emoji:** Wird korrekt und
    unverändert im Verzeichnis-Eintrag sowie nach Export/Reimport übernommen.
15. **Seitenzahl-Anzeige im Verzeichnis-Eintrag — offene Frage:** Da `pagination.ts`
    (Zeile 12-99) Seitenumbrüche ausschließlich visuell und viewport-abhängig
    berechnet, ohne stabile, exportierbare Seiten-Zuordnung pro Knoten, ist aktuell
    **ungeklärt**, ob/wie ein ToC-Eintrag im Editor selbst eine Seitenzahl anzeigen
    kann, die nicht bei jeder Fenstergrößenänderung wechselt. Für den **Export**
    ist das unkritisch, da ein echtes DOCX/ODT-TOC-Feld die Seitenzahl ohnehin von
    Word/LibreOffice selbst beim Öffnen/Aktualisieren neu berechnen lässt — die
    Frage betrifft ausschließlich die In-App-Voransicht. Muss vor Abnahme entschieden
    und das Ergebnis hier nachgetragen werden.
16. **Import einer Fremddatei mit bereits vorhandenem DOCX-TOC-Feld:** `docx/reader.ts`
    kennt aktuell **kein** `w:fldSimple`/`w:fldChar`-Handling (siehe Grundlagen-Tabelle)
    — zu verifizieren, was tatsächlich passiert (Text der Feld-Instruktion sichtbar als
    Störtext? Komplett übersprungen? Absturz?). Mindestanforderung laut
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18: kein stiller Totalverlust des sichtbaren
    ToC-Texts, kein Absturz — auch wenn der Feld-Charakter dabei zunächst verloren geht.
17. **Import einer Fremddatei mit bereits vorhandenem ODT-`text:table-of-content`:**
    Analog zu Grenzfall 16, `odt/reader.ts` kennt dieses Element aktuell nicht.
18. **Selection-Sync-Bug-Verdachtsfall beim Klick auf einen ToC-Eintrag:** Ein Klick
    innerhalb des Editor-DOM ist grundsätzlich ein Auslöser für den in
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 dokumentierten Bug (analog zum bereits als
    „Hauptverdachtsfall" eingestuften Klickwechsel zwischen Tabellenzellen,
    `tabelle-einfuegen-req.md` Abschnitt 2.7) — muss mit derselben Sorgfalt wie dort
    per Regressionstest abgesichert werden: Text tippen → Alles auswählen →
    Formatierung anwenden → auf ToC-Eintrag klicken → weiter tippen → kein
    Datenverlust.
19. **Verzeichnis innerhalb von Kopf-/Fußzeile einfügen:** Da Kopf-/Fußzeile-Bearbeitung
    laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 und `FEATURE-BACKLOG.md`
    (`kopfzeile-bearbeiten`/`fusszeile-bearbeiten`) aktuell **komplett ohne UI**
    ist, kann dieser Fall in der Praxis derzeit nicht auftreten; sobald diese UI
    gebaut wird, muss nachträglich geklärt werden, ob ein Verzeichnis dort überhaupt
    sinnvoll ist oder der Einfüge-Button in diesem Kontext deaktiviert sein soll.

---

## 4. Rundreise-Anforderung (Pflicht für Abnahme)

Für **jeden** der folgenden Fälle gilt: Dokument mit mehreren Überschriften
unterschiedlicher Ebene und einem daraus generierten Inhaltsverzeichnis im Editor
erzeugen bzw. per Upload importieren → **unverändert** exportieren → erneut
importieren → das Verzeichnis bleibt inhaltlich (Einträge, Ebenen, Reihenfolge) **und**
als Verzeichnis-Element erkennbar erhalten — zerfällt nicht in gewöhnlichen,
unstrukturierten Text.

### 4.1 DOCX
1. Dokument mit 5 Überschriften unterschiedlicher Ebene anlegen, Verzeichnis über den
   neuen Dialog einfügen, als DOCX exportieren → mit einem unabhängigen Parser (z. B.
   python-docx oder direktes Parsen von `word/document.xml`) verifizieren: Das
   Verzeichnis ist als `TOC`-Feldcode serialisiert (`w:fldSimple`- oder
   `w:fldChar`/`w:instrText`-Muster mit `TOC`-Instruktion), **nicht** als reiner,
   vorab festgeschriebener Absatztext ohne Bezug zu den echten Überschriften.
2. Dieselbe Datei erneut importieren → im Editor weiterhin als Verzeichnis-Element
   erkannt (Reader erkennt das `TOC`-Feld und wandelt es zurück in das interne
   Verzeichnis-Element, nicht in gewöhnliche Absätze).
3. In einer echten Word-Installation (falls verfügbar) geöffnet: „Felder
   aktualisieren"/F9 berechnet das Verzeichnis korrekt aus den tatsächlichen
   Überschriften des Dokuments neu — Nachweis, dass es sich um ein echtes,
   Word-seitig aktualisierbares Feld handelt.
4. Reale, mit diesem Editor unverändert importierte Fremddatei mit bereits
   vorhandenem TOC-Feld (Grenzfall 16) → unverändert exportieren → erneut
   importieren → sichtbarer Text bleibt erhalten, kein zusätzlicher Datenverlust
   gegenüber dem bereits beim Import entstandenen (dort dokumentierten) Zustand.
5. Cross-Format-Verhalten: siehe 4.3.

### 4.2 ODT
1. Dasselbe Testdokument wie 4.1.1 als ODT exportieren → `content.xml` enthält ein
   `<text:table-of-content>`-Element mit `<text:table-of-content-source>` und
   `<text:index-body>` mit den korrekten Einträgen, nicht nur eine flache
   `<text:p>`-Liste.
2. Dieselbe Datei erneut importieren → weiterhin als Verzeichnis-Element erkannt.
3. In einer echten LibreOffice-Installation (falls verfügbar) geöffnet: „Verzeichnis
   aktualisieren" (F9) berechnet aus den echten Überschriften neu.
4. Reale ODT-Fremddatei mit vorhandenem `text:table-of-content` importieren
   (Grenzfall 17) → unverändert exportieren, erneut importieren → sichtbarer Text
   bleibt erhalten.

### 4.3 Doppelte Rundreise / Cross-Format hin und zurück
1. DOCX mit Verzeichnis → Editor → Export als ODT → erneuter Import → Export zurück
   als DOCX → das Verzeichnis bleibt nach zwei Formatkonvertierungen weiterhin als
   solches erkennbar, Einträge (Text, Ebene, Reihenfolge) bleiben inhaltlich
   identisch zum Original (exakte Feld-Syntax darf sich dabei unterscheiden und ist
   zu dokumentieren, **Inhalts-/Struktur-Verlust jedoch nicht**).
2. Dieselbe Prüfung mit Startpunkt ODT.

---

## 5. Testfälle für die Verifikation (E2E, echte Bedienung im Browser)

Bereits in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 10 grob vorformulierte Testfälle
(dort ohne Code-Grundlage, hier konkretisiert und erweitert):

1. Dokument mit 5 Überschriften unterschiedlicher Ebene anlegen (über das bestehende
   Absatzformat-Dropdown, `Toolbar.tsx:116-131`) → Verzeichnis einfügen → alle 5
   Einträge erscheinen mit korrekter Einrückung nach Ebene und in korrekter
   Reihenfolge.
2. Klick auf den neuen Toolbar-Button → Options-Dialog öffnet sich sichtbar (muss
   zuerst gebaut werden, aktuell **nicht vorhanden** — Test kann erst nach Umsetzung
   des Dialogs geschrieben werden).
3. Dialog mit Standard-Ebenentiefe direkt bestätigen (ohne Änderung) → sinnvolles
   Standardverzeichnis wird eingefügt.
4. Dialog öffnen, Escape drücken → kein Element im DOM verändert, Editor-Fokus/
   Cursor-Position unverändert.
5. Verzeichnis einfügen ohne vorhandene Überschriften im Dokument → sichtbares,
   definiertes Ergebnis statt stillem No-Op (Grenzfall 2).
6. Überschrift nachträglich umbenennen/hinzufügen, „Aktualisieren" auslösen →
   Verzeichnis spiegelt die Änderung wider (Mindestnachweis für die
   Grund-Aktualisierbarkeit, Detailtiefe bei `inhaltsverzeichnis-aktualisieren`).
7. Klick auf einen ToC-Eintrag → Editor scrollt sichtbar zur referenzierten
   Überschrift, Cursor steht dort.
8. Klick auf einen ToC-Eintrag, dessen Zielüberschrift außerhalb des aktuell
   sichtbaren Bereichs bzw. auf einer anderen visuellen Seite liegt (Zusammenspiel
   mit `pagination.ts`) → Sprung funktioniert trotzdem zuverlässig.
9. Undo direkt nach Verzeichnis-Einfügen → Verzeichnis verschwindet vollständig,
   Text davor/danach unverändert; Redo stellt es wieder her.
10. Regressionstest analog zum Selection-Sync-Bug-Muster: Text eingeben → Alles
    auswählen → Formatierung anwenden → auf ToC-Eintrag klicken → weiter tippen →
    kein Inhaltsverlust (Grenzfall 18) — als dauerhafter Bestandteil der Suite
    anzulegen, analog zu `selection-regression.spec.ts`.
11. Vollständiger Rundreisetest DOCX (Abschnitt 4.1) über echten Datei-Upload
    (`filechooser`) und echten Download-Abfangmechanismus
    (`page.waitForEvent('download')`), inklusive Validierung über einen
    unabhängigen Parser auf tatsächlichen TOC-Feldcode.
12. Vollständiger Rundreisetest ODT (Abschnitt 4.2) ebenso, inklusive Validierung
    auf tatsächliches `<text:table-of-content>`-Element.
13. Cross-Format-Rundreise (Abschnitt 4.3) einmal DOCX→ODT→DOCX, einmal
    ODT→DOCX→ODT.
14. Import einer der bereitgestellten realen Fremddateien mit vermutetem
    vorhandenem TOC-Feld (falls im Testkorpus aus `tests/fixtures/external/docx`/
    `tests/fixtures/external/odt` vorhanden — vor der Umsetzung zu prüfen, welche
    Fixtures tatsächlich ein TOC enthalten) → kein Absturz, sichtbarer Text bleibt
    lesbar erhalten (Grenzfall 16/17).
15. Sehr viele Überschriften (z. B. 200, per Skript generiertes Testdokument) →
    Einfügen, Scrollen, Klicken im Verzeichnis bleibt performant (Grenzfall 4).
16. Überschrift mit Sonderzeichen/Umlauten → korrekt im ToC-Eintrag sowie nach
    Rundreise übernommen (Grenzfall 14).
17. Mehrfaches Einfügen von zwei Verzeichnissen im selben Dokument → beide bleiben
    unabhängig funktionsfähig, keine Kollision der Sprungziele (Grenzfall 9).

---

## 6. Abnahmekriterien (Definition of Done)

Der Status „fehlt" für „Inhaltsverzeichnis einfügen" darf erst dann auf „verifiziert"
geändert werden, wenn:

1. Toolbar-Button und Options-Dialog (Ebenentiefe) gebaut, verdrahtet und über die
   Testfälle 2-4 aus Abschnitt 5 nachgewiesen sind.
2. Die Generierungslogik (vollständige Dokument-Traversierung, korrekte Einrückung,
   korrekte Reihenfolge, Verhalten ohne vorhandene Überschriften) über Testfall 1 und
   5 aus Abschnitt 5 nachgewiesen ist.
3. Klick-Navigation inklusive Zusammenspiel mit den visuellen Seitenumbrüchen aus
   `pagination.ts` gebaut und über Testfall 7-8 nachgewiesen ist.
4. Mindestens ein sichtbares Aktualisieren-Bedienelement existiert und über
   Testfall 6 nachgewiesen ist (Detailtiefe bleibt beim separaten Slug
   `inhaltsverzeichnis-aktualisieren`).
5. Der DOCX-Export tatsächlich einen von einer unabhängigen Bibliothek als
   TOC-Feldcode erkennbaren Inhalt erzeugt (nicht nur eigener Reader), nachgewiesen
   über Testfall 11, idealerweise zusätzlich in einer echten Word-Installation
   (Abschnitt 4.1, Punkt 3).
6. Der ODT-Export tatsächlich ein `<text:table-of-content>`-Element erzeugt,
   nachgewiesen über Testfall 12, idealerweise zusätzlich in einer echten
   LibreOffice-Installation (Abschnitt 4.2, Punkt 3).
7. Reimport beider Formate erkennt das eingefügte Element weiterhin als Verzeichnis,
   nicht als zerfallenen Text (Abschnitt 4.1 Punkt 2, Abschnitt 4.2 Punkt 2).
8. Cross-Format-Rundreise ohne Verlust des Verzeichnis-Charakters bzw. der
   Eintrags-Inhalte nachgewiesen (Abschnitt 4.3, Testfall 13).
9. Alle Grenzfälle aus Abschnitt 3 einzeln geprüft und deren tatsächliches Verhalten
   dokumentiert ist — auch wenn das Ergebnis „bewusst so gewollt, dokumentiert"
   statt „Bug, behoben" lautet.
10. Die drei offenen Entscheidungsfragen explizit beantwortet und hier nachgetragen
    wurden:
    - Node-Modellierung im Schema (neuer `toc`-Node vs. reine Absatzstruktur,
      siehe Grundlagen-Tabelle/Schema-Zeile).
    - Editierbarkeit des eingefügten Verzeichnisses (Grenzfall/Abschnitt 2.9).
    - Seitenzahl-Anzeige im Editor (Grenzfall 15).
11. Import-Fallback-Verhalten für bereits vorhandene TOC-Felder/-Elemente in
    Fremddateien verifiziert ist, ohne stillen Datenverlust (Grenzfall 16/17,
    Testfall 14).
12. Der Regressionstest für den Selection-Sync-Bug-Verdachtsfall bei ToC-Klicks
    (Grenzfall 18, Testfall 10) dauerhaft Teil der Testsuite bleibt und besteht.

Erst nach Erfüllung aller zwölf Punkte darf der Backlog-Status von „fehlt" auf
„verifiziert" geändert werden.
