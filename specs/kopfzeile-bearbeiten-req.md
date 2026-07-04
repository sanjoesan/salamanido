# Anforderungen: „Kopfzeile bearbeiten"

Status: Laut Backlog (`specs/FEATURE-BACKLOG.md`, Slug `kopfzeile-bearbeiten`, Priorität 1,
Abschnitt „3.7 Kopf- & Fußzeile") als **„fehlt"** markiert. Diese Einstufung gilt
explizit als **nicht vertrauenswürdig** und muss vollständig verifiziert werden — im
konkreten Fall bedeutet das: bestätigen, dass die Funktion tatsächlich komplett fehlt
(nicht nur ungetestet ist), und anschließend die vollständige Umsetzung gegen die
unten stehenden Anforderungen abnehmen.

Geltungsbereich: ausschließlich die Funktion „Kopfzeile über die Editor-UI aktivieren
und befüllen" (Beschreibung laut Backlog: „Aktiviert und befüllt einen eigenen
editierbaren Bereich am oberen Seitenrand.") im gemeinsamen DOCX/ODT-Editor
(`src/formats/shared/editor/`, `src/formats/shared/documentModel.ts`) sowie deren
Serialisierung/Deserialisierung in `src/formats/docx/` und `src/formats/odt/`.

Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben
ProseMirror-Editor. Jede Anforderung unten gilt für **beide** Formate, inklusive
Rundreise (Import → Kopfzeile bearbeiten → Export → Re-Import → Kopfzeileninhalt und
Hauptinhalt bleiben erhalten).

**Abgrenzung zu Nachbar-Slugs:** `specs/FEATURE-BACKLOG.md` Abschnitt 3.7 führt neben
`kopfzeile-bearbeiten` sechs eng verwandte, aber **eigenständige** Slugs:
`fusszeile-bearbeiten`, `seitenzahl-einfuegen`, `erste-seite-anders`,
`gerade-ungerade-anders`, `mit-vorheriger-verknuepfen`, `seitenzahl-format`. Diese
Datei spezifiziert ausschließlich die Kopfzeile. Fußzeile ist spiegelbildlich
dieselbe Funktion für den unteren Seitenrand und braucht einen eigenen,
gleichlautenden Anforderungstext (`fusszeile-bearbeiten-req.md`) — dort **nicht**
erneut ausgeschrieben, aber unten an den Stellen referenziert, an denen beide
Funktionen technisch denselben Mechanismus teilen (z. B. gemeinsamer
„Kopf- und Fußzeile"-Bearbeitungsmodus), damit diese Abhängigkeit bei der Umsetzung
nicht übersehen wird. Seitenzahl-Feld, „Erste Seite anders", „Gerade/ungerade anders"
und „Mit vorheriger verknüpfen" sind ausdrücklich **nicht** Gegenstand der
Freigabe dieser Datei (siehe Abschnitt 3.4 und 3.7 unten), tauchen aber als
Grenzfälle/Anschlussanforderungen auf, weil reale Fremddateien sie bereits enthalten
können und ein Import nicht daran scheitern darf.

---

## 0. Befund aus Code-Recherche (Ausgangslage vor Verifikation)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des Codes, nicht nur auf der
Backlog-Beschreibung. Festgestellt wurde:

1. **Datenmodell existiert bereits.** `src/formats/shared/documentModel.ts` definiert
   `WordDocumentContent` mit `header: ProseMirrorJSON | null` (neben `footer` und
   `body`). `createBlankWordDocument()` setzt `header: null` — ein neues Dokument hat
   also standardmäßig keine Kopfzeile, was konsistent mit „muss erst aktiviert
   werden" ist.
2. **DOCX-Reader/-Writer unterstützen nur genau eine, nicht unterscheidbare
   Kopfzeile.** `src/formats/docx/writer.ts` erzeugt beim Export ausschließlich
   `<w:headerReference w:type="default" r:id="…"/>` — es gibt keinen Code-Pfad für
   `w:type="first"` oder `w:type="even"`. `src/formats/docx/reader.ts` liest beim
   Import den **ersten** `w:headerReference`-Kindknoten des `w:sectPr`
   (`firstChildNS(sectPr, …, 'headerReference')`), **ohne dessen `w:type`-Attribut
   auszuwerten** — enthält eine Fremddatei mehrere Kopfzeilen-Referenzen (z. B.
   „Erste Seite anders"), wird nur eine davon übernommen, welche, hängt von der
   Reihenfolge im XML ab, nicht von einer bewussten Priorisierung.
3. **ODT-Reader/-Writer unterstützen nur genau eine Kopfzeile am ersten
   `style:master-page`-Element.** `src/formats/odt/writer.ts` schreibt immer in
   genau ein `<style:master-page style:name="Standard" …>` mit optionalem
   `<style:header>`. `src/formats/odt/reader.ts` liest
   `stylesDoc.getElementsByTagNameNS(ODF_NAMESPACES.style, 'master-page')[0]` — also
   ebenfalls **das erste** in `styles.xml` gefundene Master-Page-Element, unabhängig
   von seinem Namen oder davon, ob es das für die erste Seite oder für Folgeseiten
   zuständige ist.
4. **Keine Editier-UI vorhanden — kein Teilbefund, sondern vollständige
   Abwesenheit.** `src/formats/shared/editor/WordEditor.tsx` erzeugt **genau eine**
   ProseMirror-`EditorView`, gebunden ausschließlich an `doc.content.body`
   (`wordSchema.nodeFromJSON(doc.content.body)`). Es gibt:
   - keinen zweiten `EditorView` und keinen sonstigen editierbaren DOM-Bereich für
     `header`/`footer`,
   - keinen Toolbar-Button in `src/formats/shared/editor/Toolbar.tsx` („Kopfzeile
     bearbeiten" fehlt in der kompletten Button-Liste),
   - keinen Befehl in `src/formats/shared/editor/commands.ts` (dort existieren
     `setAlign`, `setHeading`, `toggleList`, `liftFromList`, `insertImage`,
     `insertTable`, `applyMarkColor`, `clearMarkColor` — nichts, das eine Kopfzeile
     aktiviert oder deren Inhalt referenziert),
   - keinen Tastatur-Shortcut, kein Doppelklick-Handler auf den oberen Seitenrand
     (`pageBackgroundStyle()`/`PAGE_MARGIN_PX` aus `pageLayout.ts` erzeugen nur ein
     rein visuelles Seiten-Hintergrundmuster, keinerlei Klick-/Doppelklick-Logik).
5. **Kein Seitenzahl-Feld-Typ im Schema.** `src/formats/shared/schema.ts` kennt keine
   Node-/Mark-Definition für ein Feld (kein `fldChar`/`instrText`-Äquivalent, kein
   `text:page-number`-Äquivalent). Eine Kopfzeile könnte nach heutigem Stand also
   ohnehin nur statischen Text/Bilder/Formatierung enthalten, keine automatisch
   aktualisierte Seitenzahl — das betrifft den separaten Slug
   `seitenzahl-einfuegen`, wird hier nicht gelöst, ist aber als Rand- und
   Zukunftsanforderung in Abschnitt 3.7 vermerkt.
6. **Vorhandene automatisierte Tests konstruieren `header` ausschließlich direkt als
   Testdaten, nie über die UI.** `src/formats/docx/__tests__/roundtrip.test.ts` und
   `src/formats/odt/__tests__/roundtrip.test.ts` enthalten je einen Testblock
   („round trip: header, footer, and metadata"), der `header` als fertiges
   ProseMirror-JSON von Hand zusammensetzt (`header: { type: 'doc', content:
   [paragraph('Kopfzeile')] }`) und direkt an Writer/Reader übergibt. Das bestätigt
   exakt die Methodik-Feststellung aus `FEATURE-BACKLOG.md`: Reader/Writer-seitig
   „vorhanden", UI-seitig nicht existent.
7. **Reale Testdateien mit Kopfzeilen liegen bereits im Repo, werden aber von
   keinem einzigen Test referenziert.** Vorhanden:
   `tests/fixtures/external/docx/headerFooter.docx`,
   `tests/fixtures/external/docx/headerPic.docx`,
   `tests/fixtures/external/odt/headerFinal.odt`,
   `tests/fixtures/external/odt/headerFirstPage.odt`,
   `tests/fixtures/external/odt/tabellen_header_DOC_LO4-1-0.odt` (aus den
   offiziellen Apache-POI- bzw. ODF-Toolkit-Testkorpora, siehe
   `tests/fixtures/external/README.md`). Eine Suche nach diesen Dateinamen im
   gesamten Repository liefert **außerhalb des README** keinen einzigen Treffer —
   weder in `tests/e2e/*.spec.ts` noch sonstwo. Die Import-Robustheit von
   Kopfzeilen aus echten Fremddateien ist also aktuell **vollständig ungetestet**,
   obwohl das Testmaterial dafür schon bereitliegt.
8. **Keine E2E-Tests.** `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`,
   `tests/e2e/lifecycle.spec.ts` und `tests/e2e/selection-regression.spec.ts` sind
   die einzigen Playwright-Specs im Repo; keiner davon erwähnt Kopf-/Fußzeile.

**Konsequenz — Unterschied zu einem reinen Test-Gap:** Wie bereits in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 festgehalten, ist der Backlog-Status „fehlt"
nach dieser Recherche **zutreffend für die eigentliche Editierfunktion**, auch wenn
das darunterliegende Datenmodell samt Reader/Writer bereits vollständig für den
„Standard"-Fall (eine Kopfzeile, gleich auf jeder Seite) existiert. Diese Datei
beschreibt folglich den Soll-Zustand einer **komplett neu zu bauenden UI-Funktion**
auf einem bereits vorhandenen Datenmodell-Fundament — nicht Schema-Design von Grund
auf (anders als z. B. bei `seitenumbruch-req.md`, wo auch das Datenmodell fehlte).

---

## 1. Menüpunkte / Bedienelemente (Soll-Zustand)

| # | Element | Auslösung | Aktueller Stand (Befund) | Soll |
|---|---|---|---|---|
| 1 | Toolbar-Button/Menüpunkt „Kopfzeile bearbeiten" | Klick auf Toolbar-Icon | **Fehlt komplett** in `Toolbar.tsx` | Muss ergänzt werden — schaltet den Kopfzeilenbereich sichtbar/aktiv und setzt den Fokus dorthin; sinnvoll in einer eigenen „Einfügen/Layout"-Gruppe platziert, mit eindeutigem, eingebettetem SVG-Icon statt Unicode/Emoji (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1) |
| 2 | Doppelklick in den oberen Seitenrandbereich einer sichtbaren Seite | Doppelklick | **Fehlt** — es existiert kein Klick-Handler auf dem Seitenrand, nur rein visuelles Hintergrundmuster (`pageBackgroundStyle()`) | Muss ergänzt werden — entspricht dem in Word **und** LibreOffice Writer identischen Standardverhalten, direkte Nutzererwartung |
| 3 | Eigener, sichtbar abgegrenzter Kopfzeilen-Bereich am oberen Seitenrand jeder Seite | — (reine Darstellung + Editierbarkeit) | **Fehlt** — `WordEditor.tsx` rendert genau einen `EditorView`, gebunden an `body`; kein zweiter editierbarer Bereich für `header` existiert im DOM | Muss ergänzt werden: eigener editierbarer Bereich (z. B. zweiter `EditorView` mit eigenem, aus `wordSchema` abgeleitetem State für `header`), visuell klar vom Haupttext abgesetzt (z. B. Trennlinie + Beschriftung „Kopfzeile", analog Word) |
| 4 | Bereich/Modus verlassen (zurück zum Haupttext) | Klick in den Haupttext-Bereich; optional Escape-Taste oder Button „Kopf- und Fußzeile schließen" | Nicht anwendbar (Funktion existiert nicht) | Muss zuverlässig funktionieren, Fokus und Selektion müssen danach im Haupttext konsistent sein (siehe Abschnitt 2, Selection-Sync-Bug) |
| 5 | Kopfzeile deaktivieren/vollständig entfernen | Menüpunkt/Button, z. B. „Kopfzeile entfernen" | Nicht anwendbar | Muss ergänzt werden — setzt `header` wieder auf `null`, damit der Export keine leere, aber technisch vorhandene `w:headerReference`/`style:header` erzeugt, wenn die Nutzerin das nicht will (siehe 3.6) |
| 6 | Option „Erste Seite anders" | Checkbox im Kopfzeilen-Kontext | Fehlt — eigener Backlog-Slug `erste-seite-anders`, **nicht** Gegenstand dieser Freigabe | Muss, solange nicht umgesetzt, explizit als nicht unterstützt dokumentiert sein statt stillschweigend zu fehlen (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9) — kein UI-Element darf eine nicht wirkende Funktion vortäuschen |
| 7 | Option „Gerade/ungerade Seiten anders" | Checkbox im Kopfzeilen-Kontext | Fehlt — eigener Backlog-Slug `gerade-ungerade-anders`, **nicht** Gegenstand dieser Freigabe | Wie Zeile 6: explizit dokumentierter Nicht-Support, kein Blocker für diese Datei |
| 8 | Seitenzahl-Feld-Button innerhalb der Kopfzeilen-Bearbeitung | Klick | Fehlt — eigener Backlog-Slug `seitenzahl-einfuegen`, **nicht** Gegenstand dieser Freigabe; im Schema existiert ohnehin kein Feld-Node-Typ (siehe Befund 5) | Nicht Teil dieser Abnahme; die Kopfzeilen-Editor-Architektur darf ein späteres Nachrüsten aber nicht strukturell verbauen (reiner Text-Container wäre zu eng) |
| 9 | Zeichen-/Absatzformatierung innerhalb der Kopfzeile (Fett, Kursiv, Farbe, Ausrichtung) | Dieselbe Toolbar wie im Haupttext | Fehlt indirekt, da der Kopfzeilen-Editor selbst fehlt | Muss funktional identisch zum Haupttext sein, sobald der Kopfzeilen-Editor existiert (siehe 3.2) |

---

## 2. Geltende Randbedingungen aus der Haupt-Spezifikation

Diese Datei ergänzt, ersetzt aber nicht die Anforderungen aus
`FEATURE-SPEC-DOCX-ODT.md`, insbesondere:

- Abschnitt 9 („Kopf- und Fußzeilen"): „Kopfzeile und Fußzeile jeweils eigener
  editierbarer Bereich, unabhängig vom Haupttext… Aktuell laut Plan ‚vorhanden' —
  muss aber über echte UI-Bedienung getestet werden, nicht nur über konstruierte
  Testdaten… das ist eine fehlende Funktion, kein reiner Test-Gap." — das ist die
  Kernanforderung, die diese Datei im Detail spezifiziert (für die Kopfzeilenhälfte).
- Abschnitt 9, Testfall 4 (Seitenzahl-Feld) und die Optionen „erste Seite
  anders"/„gerade-ungerade" sind laut dortigem Text „optional, aber wenn nicht
  unterstützt, muss das explizit dokumentiert sein" — siehe Abschnitt 1, Zeilen 6–8
  dieser Datei.
- Abschnitt 17 (Menü-/Toolbar-Übersicht), Zeile 8: „Kopf-/Fußzeile bearbeiten —
  fehlt komplett in der UI — neu zu bauen, siehe Abschnitt 9."
- Abschnitt 21 (Testmatrix), Zeile „Kopf-/Fußzeile": „vorhanden (Datenmodell) —
  fehlt komplett (keine UI) — offen (reale Fixture-Tests)."
- Abschnitt 2, Regressionstest für den Selection-Sync-Bug: Der Fokuswechsel
  zwischen Haupttext und einem neu hinzukommenden zweiten editierbaren Bereich
  (Kopfzeile) ist strukturell ein Selektions-/Fokuswechsel und damit ein
  Hauptverdachtsfall für dieselbe Fehlerklasse — muss mit einer eigenen
  Regressionssequenz abgesichert werden (siehe Grenzfall 9 unten).
- Abschnitt 7 („Bilder"): gilt sinngemäß auch für Bilder innerhalb der Kopfzeile
  (typischer Anwendungsfall: Firmenlogo in einer Briefvorlage, vgl. Abschnitt 18
  der Haupt-Spezifikation zur bereitgestellten LibreOffice-Briefvorlage).
- Abschnitt 18 (Import-Robustheit): Prinzip „kein stiller Datenverlust" gilt auch
  für Kopfzeilen aus Fremddateien — insbesondere bei mehreren Kopfzeilen-Referenzen
  pro Dokument (siehe Befund 2/3 und Grenzfälle 4/5).
- Abschnitt 19 (Export-Robustheit & Rundreise) und Abschnitt 20.4 (kein stiller
  Fehlschlag) gelten uneingeschränkt.
- `FEATURE-BACKLOG.md` Abschnitt 3.7: die dort gelisteten sechs Nachbar-Slugs
  bleiben separat zu spezifizieren/verifizieren (siehe Geltungsbereich oben).

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Aktivierung der Kopfzeile
- Aktivierbar über **beide** Wege gleichwertig: Toolbar-Button „Kopfzeile
  bearbeiten" **und** Doppelklick in den oberen Seitenrandbereich einer sichtbaren
  Seite (Standardverhalten aus Word/LibreOffice Writer).
- Aktivierung schaltet einen eigenen editierbaren Bereich am oberen Seitenrand
  sichtbar, visuell klar vom Haupttext abgegrenzt (z. B. Trennlinie und/oder
  Beschriftung „Kopfzeile").
- Bei einem Dokument ohne Kopfzeile (`header === null`, z. B. neues Dokument oder
  eine importierte Datei ohne Kopfzeile) erzeugt die erste Aktivierung einen
  leeren, sofort editierbaren Bereich (kein Fehler, kein No-Op).
- Bei einem Dokument mit bereits vorhandener Kopfzeile (z. B. nach Import) zeigt
  die Aktivierung sofort den vorhandenen Inhalt zur Bearbeitung an.
- Nach Aktivierung steht der Cursor automatisch im Kopfzeilenbereich, bereit zum
  Tippen (kein zusätzlicher Klick nötig — analog zur Anforderung „Neues Dokument
  → sofort tippen möglich" aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.1).

### 3.2 Bearbeiten des Inhalts
- Alle Text-Grundfunktionen aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 gelten
  identisch innerhalb der Kopfzeile: Tippen, Löschen, Cursor-Navigation, Auswahl
  (Maus/Doppelklick/Dreifachklick/Tastatur), Ausschneiden/Kopieren/Einfügen,
  Undo/Redo.
- Zeichenformatierung (Fett/Kursiv/Unterstrichen/Durchgestrichen/Schrift-
  /Hervorhebungsfarbe) über **dieselbe** Toolbar wie im Haupttext, wirkt jeweils
  nur auf den Kopfzeileninhalt, nicht auf den Haupttext.
- Absatzausrichtung (links/zentriert/rechts/Blocksatz) funktioniert identisch.
- Bild einfügen (z. B. Firmenlogo) funktioniert identisch zum Haupttext-Mechanismus
  (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7).
- Tabellen und Listen innerhalb der Kopfzeile sind kein Hauptanwendungsfall,
  dürfen aber, falls eingefügt, nicht zu einem Absturz oder zu Datenverlust
  führen — mindestens der reine Text muss bei Rundreise erhalten bleiben
  (Fallback-Prinzip analog `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18).

### 3.3 Seitenübergreifende Wirkung (Standard-Kopfzeile)
- Es gibt genau **einen** Kopfzeileninhalt pro Dokument (`WordDocumentContent.header`),
  der auf **jeder** sichtbar gerenderten Seite identisch angezeigt wird — nicht nur
  auf der ersten Seite (siehe Grenzfall 10).
- Das entspricht der in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 geforderten
  Mindestunterstützung „Standard" (gleiche Kopfzeile auf jeder Seite).
- Eine Bearbeitung wirkt sich unmittelbar auf die Darstellung auf allen Seiten aus
  (kein pro-Seite-Override, kein Auseinanderlaufen mehrerer Kopien desselben
  Inhalts).

### 3.4 „Erste Seite anders" / „Gerade-ungerade" (explizit dokumentierter Nicht-Support)
- Diese Datei fordert **nicht**, dass diese Varianten umgesetzt werden (eigene
  Backlog-Slugs, siehe Geltungsbereich). Gefordert ist stattdessen:
  - Kein UI-Element täuscht eine nicht wirkende Funktion vor (kein stiller
    Fehlschlag, `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4).
  - Importiert die Nutzerin eine Fremddatei, die mehrere Kopfzeilen-Varianten
    enthält (z. B. `w:type="first"` und `w:type="default"` in DOCX, oder mehrere
    Master-Pages in ODT), muss **mindestens eine** Kopfzeile erhalten bleiben —
    kein Totalverlust. Welche der mehreren übernommen wird, ist ausdrücklich zu
    dokumentieren (aktueller Code-Stand: zufällig durch Dokumentreihenfolge
    bestimmt, siehe Befund 2/3 — muss mindestens auf einen bewusst gewählten,
    deterministischen und dokumentierten Fall festgelegt werden, z. B. „bevorzugt
    `w:type=\"default\"`, sonst die erste gefundene").

### 3.5 Verlassen des Kopfzeilenbereichs
- Klick in den Haupttext-Bereich beendet die Kopfzeilen-Bearbeitung und aktiviert
  wieder den Haupttext-Cursor an der geklickten Position (Standardverhalten).
- Der Fokuswechsel darf keine Selektions-Inkonsistenz erzeugen — insbesondere darf
  ein direkt danach ausgelöstes Enter/Tippen nicht versehentlich Kopfzeilen- oder
  Haupttext-Inhalt löschen/ersetzen (siehe Abschnitt 2, Selection-Sync-Bug, und
  Grenzfall 9).

### 3.6 Deaktivieren/Leeren der Kopfzeile
- Den gesamten Kopfzeilentext zu markieren und zu löschen (Entf) darf **nicht**
  automatisch den Kopfzeilenbereich/die Datenmodell-Referenz entfernen — ein
  leerer, aber weiterhin aktivierter Bereich bleibt bestehen (analog Word/
  LibreOffice: eine geleerte Kopfzeile bleibt eine Kopfzeile). Dieses Verhalten
  ist explizit zu dokumentieren, falls bewusst abweichend umgesetzt wird.
- Zusätzlich muss ein expliziter Weg existieren, die Kopfzeile **komplett** zu
  entfernen (`header` zurück auf `null`), damit ein Export keine leere, aber
  technisch vorhandene `w:headerReference`/`style:header` erzeugt, wenn die
  Nutzerin das nicht möchte (siehe Grenzfall 2).

### 3.7 Zusammenspiel mit einem künftigen Seitenzahl-Feld (Verweis, kein Umsetzungsgegenstand)
- Der Backlog-Slug `seitenzahl-einfuegen` wird durch diese Datei **nicht**
  spezifiziert oder umgesetzt. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9, Testfall 4
  verlangt jedoch ein Seitenzahl-Feld als Teil der vollständigen Kopf-/
  Fußzeilen-Abnahme — deshalb hier als **Architektur-Voraussetzung** vermerkt:
  Der neu gebaute Kopfzeilen-Editor darf nicht so eng gefasst sein, dass er nur
  reinen Text/Formatierung erlaubt und ein späteres Nachrüsten eines
  Inline-Feld-Node-Typs (siehe Befund 5) strukturell verbaut.

### 3.8 Datenmodell-Wiederverwendung
- Es wird **kein** neues Datenmodell-Attribut benötigt — `WordDocumentContent.header`
  existiert bereits und wird von DOCX- und ODT-Reader/-Writer bereits im
  „Standard"-Fall korrekt round-getripped (siehe Befund 1–3, sowie die
  bestehenden Tests in `roundtrip.test.ts`). Diese Datei fordert ausschließlich
  den **UI-Zugang** zu diesem bereits vorhandenen Datenmodell-Feld; Reader/Writer
  dürfen zur Erfüllung dieser Anforderungen nicht unnötig verändert werden,
  sofern sie die Rundreise-Anforderung aus Abschnitt 5 bereits erfüllen (was für
  den „Standard"-Fall laut Befund 1–3 bereits zutrifft).

### 3.9 Rückmeldeverhalten (kein stiller Fehlschlag)
- Kann die Aktion aus irgendeinem Grund nicht ausgeführt werden (z. B.
  Doppelklick auf einen Seitenrandbereich, während der Editor noch initialisiert),
  muss entweder eine sichtbare Rückmeldung erfolgen oder ein sinnvoll definiertes
  Fallback greifen — niemals ein Klick/Doppelklick, der ergebnislos bleibt (vgl.
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4).

---

## 4. Grenzfälle (müssen explizit geprüft werden)

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 1 | Kopfzeile aktivieren bei einem brandneuen, leeren Dokument (`header === null`, `body` enthält nur einen leeren Absatz) | Leerer, editierbarer Kopfzeilenbereich entsteht sofort, Editor bleibt stabil, kein Crash. |
| 2 | Zuvor befüllte Kopfzeile komplett deaktivieren/entfernen, danach exportieren | Export enthält keine verwaiste `w:headerReference`/`style:header` mit leerem Inhalt — kein „Geisterelement" (siehe 3.6). |
| 3 | Doppelklick in den oberen Seitenrand, während im Haupttext gerade eine Selektion aktiv ist (z. B. nach „Alles auswählen") | Haupttext-Selektion wird korrekt aufgelöst, kein fälschlicher Übertrag der Selektion in den Kopfzeilenkontext, kein Datenverlust (Selection-Sync-Regressionsfall, siehe Abschnitt 2). |
| 4 | Import einer Fremddatei mit „Erste Seite anders" (zwei unterschiedliche `w:headerReference`-Typen bzw. zwei Master-Pages) | Mindestens eine Kopfzeile bleibt erhalten (kein Totalverlust); welche, ist dokumentiert (siehe 3.4). |
| 5 | Import einer Fremddatei mit gerade/ungerade-Kopfzeilen (`w:type="even"`) | Ebenso mindestens eine Kopfzeile bleibt erhalten, kein Absturz. |
| 6 | Kopfzeile mit eingefügtem Bild (Firmenlogo) — sowohl neu erstellt als auch aus Fremddatei importiert | Bild bleibt bei Rundreise erhalten, identisch zur Bild-Anforderung im Haupttext (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7). |
| 7 | Kopfzeileninhalt überragt die vorgesehene Kopfzeilenzone (mehrere Absätze, große Schrift) | Zu dokumentieren: visuelle Behandlung (abgeschnitten vs. Hauptbereich wird nach unten verdrängt) — darf nicht zu überlappendem, unlesbarem Rendering führen. |
| 8 | Undo direkt nach dem ersten Tippen in einer frisch aktivierten, zuvor `null`-wertigen Kopfzeile | Kein Crash, wenn Undo bis „vor Aktivierung" zurückreicht; Verhalten (Aktivierung selbst separater Undo-Schritt oder nicht) ist festzulegen und zu dokumentieren. |
| 9 | Mehrfacher Fokuswechsel Kopfzeile → Haupttext → Kopfzeile, jeweils gefolgt von Tippen | Kein Bug wie im Selection-Sync-Fall aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 — Pflicht-Regressionstest, analog Grenzfall 7 aus `seitenumbruch-req.md`. |
| 10 | Mehrseitiges Dokument (Inhalt fließt über mehrere sichtbare Seiten) mit aktivierter Kopfzeile | Kopfzeile erscheint identisch auf **jeder** sichtbar gerenderten Seite, nicht nur auf der ersten (siehe 3.3). |
| 11 | Kopfzeile aktiviert, aber nie über einen leeren Absatz hinaus befüllt, danach Export | Kein Crash; definiertes, dokumentiertes Ergebnis (leere, aber technisch vorhandene Kopfzeile vs. beim Export automatisch verworfen — Entscheidung ist zu treffen und festzuhalten). |
| 12 | Kopfzeile mit Formatierung (fett **und** Textfarbe kombiniert) über Cross-Format-Rundreise (DOCX → ODT → DOCX) | Formatierung bleibt erhalten, analog `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 3, Testfall 4/5, angewendet auf Kopfzeileninhalt statt Haupttext. |
| 13 | Reale Fremddatei mit mehreren Abschnitten (`w:sectPr` an mehreren Stellen im Dokument, nicht nur am Body-Ende), von denen manche eine eigene, andere eine „mit vorheriger verknüpfte" Kopfzeile haben | Zu verifizieren, ob der aktuelle Reader (liest laut Befund 2 nur den `w:sectPr` am Ende von `w:body`) Kopfzeilen aus mittleren Abschnitten überhaupt erkennt; mindestens der Text der wirksamen ersten Kopfzeile darf nicht ersatzlos verschwinden, kein Absturz. |
| 14 | Dokument mit Kopfzeile **und** Fußzeile gleichzeitig befüllt, beide mit unterschiedlichem Text | Kopfzeileninhalt und Fußzeileninhalt bleiben unabhängig voneinander korrekt zugeordnet — keine Verwechslung/Vertauschung bei Rundreise. |

---

## 5. Rundreise-Anforderung

Zwei getrennte, beide verpflichtende Rundreise-Prüfungen — analog zur Methodik in
`seitenumbruch-req.md` Abschnitt 5 und `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19.
**Kernanforderung laut Aufgabenstellung: Datei unverändert hochladen → Export →
Re-Import erhält den Inhalt — sowohl für DOCX als auch für ODT.**

### 5.1 Baseline-Rundreise (Regressionsschutz — darf durch UI-Änderungen nicht kaputtgehen)
1. Reale DOCX-Datei **ohne** jede Kopfzeile unverändert hochladen (kein Klick,
   keine Eingabe) → sofort exportieren → erneut importieren → Inhalt entspricht
   inhaltlich dem Original, `header` bleibt `null` (keine fälschlich erzeugte
   leere Kopfzeile).
2. Dasselbe mit einer realen ODT-Datei ohne Kopfzeile.
3. Die bereits im Repo vorhandenen, aber bislang **ungetesteten** Kopfzeilen-
   Fixtures unverändert hochladen → sofort exportieren → erneut importieren →
   Kopfzeilentext bleibt inhaltlich erhalten, ohne dass irgendein Klick im Editor
   erfolgt (reiner Upload-Export-Reimport-Zyklus):
   - `tests/fixtures/external/docx/headerFooter.docx`
   - `tests/fixtures/external/docx/headerPic.docx`
   - `tests/fixtures/external/odt/headerFinal.odt`
   - `tests/fixtures/external/odt/headerFirstPage.odt`
   - `tests/fixtures/external/odt/tabellen_header_DOC_LO4-1-0.odt`

   Diese Prüfung deckt exakt die in der Aufgabenstellung geforderte Rundreise
   ab: „Upload unverändert → Export → Re-Import erhält Inhalt" — und ist laut
   Befund 7 aktuell **komplett ungetestet**, obwohl das Testmaterial bereits
   vorhanden ist.
4. Alle drei Prüfungen müssen weiterhin grün sein, nachdem die neue Kopfzeilen-UI
   ergänzt wurde (die UI-Ergänzung darf am bestehenden Reader/Writer-Verhalten
   nichts verändern, was die Rundreise unbeteiligter Dateien gefährden würde).

### 5.2 Feature-Rundreise (Kopfzeile über die neue UI erstellt/bearbeitet)
Für jede der folgenden Situationen: Kopfzeile über Toolbar-Button/Doppelklick
aktivieren, Inhalt eingeben/bearbeiten → Dokument als DOCX exportieren →
reimportieren → Kopfzeileninhalt **und** Hauptinhalt bleiben erhalten; **und**
identisch als ODT; **und** zusätzlich Cross-Format (in ein ursprünglich als DOCX
erstelltes/importiertes Dokument bearbeiten und als ODT exportieren, sowie
umgekehrt):

1. Neues Dokument → Kopfzeile aktivieren → Text „Firma Mustermann GmbH"
   eingeben → als DOCX exportieren → reimportieren → Text identisch in `header`
   vorhanden, Haupttext unverändert.
2. Dasselbe als ODT-Ursprungsdokument.
3. Cross-Format DOCX → ODT → DOCX: Kopfzeilentext bleibt über beide
   Konvertierungen hinweg erhalten.
4. Cross-Format ODT → DOCX → ODT (umgekehrte Richtung).
5. Kopfzeile mit kombinierter Formatierung (fett **und** Textfarbe) → Rundreise
   erhält die Formatierung, nicht nur den nackten Text.
6. Kopfzeile mit eingefügtem Bild (Firmenlogo) → Rundreise erhält das Bild
   (siehe Grenzfall 6).
7. Dokument mit Kopfzeile **und** Fußzeile gleichzeitig befüllt (unterschiedlicher
   Text) → beide bleiben unabhängig voneinander korrekt erhalten, keine
   Verwechslung (siehe Grenzfall 14).
8. Bereits aus einer Fremddatei importierte Kopfzeile über die UI **ergänzen**
   (zusätzlichen Satz anhängen) und danach exportieren → der ergänzte, nicht nur
   der ursprüngliche Text erscheint nach Reimport.
9. Kopfzeile über die UI komplett entfernen (siehe 3.6) → Export enthält keine
   Kopfzeilen-Referenz mehr, Reimport zeigt `header === null`.

**Abnahmekriterium:** Formatierungs-/Layout-Nuancen bei Cross-Format-Konvertierung
sind wie im Rest der Spezifikation zu dokumentieren und akzeptabel;
**das vollständige Verschwinden von Kopfzeilen- oder Haupttextinhalt ist es
nicht** — weder bei 5.1 noch bei 5.2.

---

## 6. Testplan-Hinweise (Unit + E2E, Playwright)

1. **Bestehende Unit-Tests bleiben Pflichtbestandteil (Regressionsschutz).**
   `src/formats/docx/__tests__/roundtrip.test.ts` und
   `src/formats/odt/__tests__/roundtrip.test.ts` (Testblock „round trip: header,
   footer, and metadata") decken den reinen Reader/Writer-Rundtrip mit direkt
   konstruierten Testdaten ab und müssen grün bleiben — sie ersetzen aber
   **nicht** die unten geforderten UI-/E2E-Tests (vgl. Befund 6).
2. **Neue Fixture-Tests (Baseline-Rundreise 5.1.3):** für jede der fünf bereits
   vorhandenen, bislang ungetesteten Kopfzeilen-Fixtures ein automatisierter
   Test (Unit- oder E2E-Ebene), der Datei importiert → exportiert → reimportiert
   → Kopfzeilentext-Erhalt prüft. Schließt die in Befund 7 festgestellte Lücke.
3. **E2E-Test (Playwright), Aktivierung + Bearbeitung:** Dokument öffnen/neu
   erstellen → Toolbar-Button „Kopfzeile bearbeiten" klicken (bzw. Doppelklick auf
   den oberen Seitenrand) → in den Kopfzeilenbereich tippen → Formatierung
   anwenden (z. B. Fett) → prüfen, dass der Text sichtbar im Kopfzeilenbereich
   erscheint und formatiert dargestellt wird.
4. **E2E-Test, echte Rundreise:** im Anschluss an Punkt 3 echten Export auslösen
   (Datei-Download abfangen, analog Muster in `tests/e2e/docx.spec.ts` bzw.
   `tests/e2e/odt.spec.ts`) → resultierende Datei erneut über den echten
   Upload-Dialog importieren → Kopfzeilentext und Formatierung weiterhin
   sichtbar.
5. **Regressionstest-Pflicht (Selection-Sync):** jeder E2E-Test aus Punkt 3/4
   muss zusätzlich die Sequenz aus Grenzfall 9 abdecken (Fokuswechsel
   Kopfzeile → Haupttext → Kopfzeile, jeweils gefolgt von Tippen) und deren
   korrektes Ergebnis prüfen — analog zur Pflicht-Regressionssequenz aus
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 und `seitenumbruch-req.md` Abschnitt 6,
   Punkt 4.
6. **Visuelle Abgrenzung:** ein Screenshot-Vergleich oder mindestens eine
   DOM-Attribut-Assertion muss zeigen, dass der Kopfzeilenbereich sich sichtbar
   vom Haupttext-Bereich unterscheidet (Abschnitt 1, Zeile 3).
7. **Cross-Format- und Kombinationstests (Abschnitt 5.2, Punkte 3/4/6/7):** sowohl
   als Unit-Test gegen Reader/Writer **als auch** als E2E-Test über echte
   Bedienung (Toolbar-Klick → echter Datei-Download → echter Re-Upload) —
   reine Unit-Tests mit direkt konstruierten ProseMirror-JSON-Fixtures allein
   reichen nicht aus (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21).
8. **Grenzfall-Dokumentation:** für jeden Grenzfall aus Abschnitt 4, der auf ein
   „zu dokumentierendes Verhalten" statt auf ein hartes Soll verweist (Grenzfälle
   4, 5, 7, 8, 11, 13), ist das tatsächlich beobachtete Verhalten nach der
   Umsetzung hier oder in einem begleitenden Test-Kommentar festzuhalten.

---

## 7. Freigabekriterium für „vorhanden"

Der Backlog-Status von `kopfzeile-bearbeiten` darf erst dann als **vorhanden**
(unqualifiziert) gelten, wenn:

- alle Bedienelemente aus Abschnitt 1 tatsächlich existieren und funktionieren
  (Toolbar-Button, Doppelklick-Aktivierung, sichtbar abgegrenzter Bereich,
  Verlassen, Deaktivieren/Entfernen),
- die explizit **nicht** umgesetzten Nachbarfunktionen (Erste Seite anders,
  Gerade/ungerade, Seitenzahl-Feld) als solche dokumentiert sind, statt
  stillschweigend zu fehlen (Abschnitt 1, Zeilen 6–8; Abschnitt 3.4/3.7),
- alle Testfälle aus Abschnitt 6 automatisiert vorliegen und grün sind,
  einschließlich der fünf bisher ungetesteten realen Kopfzeilen-Fixtures,
- die Grenzfälle aus Abschnitt 4 einzeln befundet sind (funktioniert wie
  spezifiziert / bewusst abweichendes, dokumentiertes Verhalten / repariert),
- Abschnitt 5.1 (Baseline-Rundreise, inklusive der fünf realen Fixtures) durch
  die neue Funktion nicht gebrochen wurde,
- Abschnitt 5.2 (Feature-Rundreise) für DOCX, ODT und beide
  Cross-Format-Richtungen besteht,
- der Regressionstest aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2
  (Selection-Sync-Bug) explizit mit einer Kopfzeilen-Fokuswechsel-Sequenz
  nachgestellt und grün ist (Grenzfall 9),
- geklärt ist, ob und wie sich diese Funktion mit `fusszeile-bearbeiten`
  einen gemeinsamen Bearbeitungsmodus teilt (siehe Geltungsbereich), damit beide
  Slugs konsistent und nicht widersprüchlich umgesetzt werden.

Andernfalls ist der Status auf **teilweise** zu setzen und die konkret fehlenden
Teilpunkte sind hier nachzutragen (analog zur Vorgehensweise in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21 und in `seitenumbruch-req.md`
Abschnitt 7).
