# Anforderungen: „Hyperlink einfügen“

Status: Laut `specs/FEATURE-BACKLOG.md` (Zeile 234, Slug `hyperlink-einfuegen`,
Abschnitt „3.5 Links“, Priorität 1/essenziell) als **„fehlt“** markiert.
Beschreibung dort: „Verknüpft markierten Text mit einer URL.“ Diese Einstufung
gilt explizit als **nicht vertrauenswürdig** und muss vollständig verifiziert
werden — konkret heißt das: zunächst bestätigen, dass die Funktion tatsächlich
komplett fehlt (nicht nur ungetestet ist), und anschließend die vollständige
Umsetzung gegen die unten stehenden Anforderungen abnehmen.

Geltungsbereich und Abgrenzung: Diese Datei behandelt in erster Linie den Slug
`hyperlink-einfuegen`. Die Backlog-Nachbareinträge `hyperlink-bearbeiten`
(Zeile 235, „Ändert die Ziel-URL eines bestehenden Links“) und
`hyperlink-entfernen` (Zeile 236, „Löst die Verknüpfung, der Text bleibt
erhalten“) sind eigene Slugs, aber in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 14
sowie Abschnitt 17 Zeile 366 („Link einfügen/bearbeiten/entfernen“) bereits als
**ein** zusammenhängendes UI-Element geführt — ein Werkzeug zum „Link
einfügen“, das keinen Weg bietet, denselben Link wieder zu bearbeiten oder zu
entfernen, wäre für sich genommen nicht abnahmefähig. Diese Datei deckt daher
den vollständigen Lebenszyklus (Einfügen, Bearbeiten, Entfernen) ab, mit Fokus
auf „Einfügen“ als Haupt-Slug. Nicht Teil dieser Anforderung: Textmarken
(`textmarke-einfuegen`), Querverweise (`querverweis-einfuegen`) und interne
Sprungziele innerhalb desselben Dokuments — das sind separate Backlog-Einträge
(Abschnitt 3.5, Zeilen 237–238) mit eigener Anforderungsdatei.

Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben
ProseMirror-Editor (`src/formats/shared/`). Jede Anforderung unten gilt für
**beide** Formate, sowohl beim Import einer bestehenden Datei als auch beim
Export eines im Editor erstellten/bearbeiteten Dokuments — inklusive Rundreise
(Datei hochladen → unverändert exportieren → Ergebnis entspricht inhaltlich dem
Original).

---

## 0. Befund aus Code-Recherche (Ausgangslage vor Verifikation)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des Codes, nicht nur auf
der Backlog-Beschreibung.

1. **Kein Datenmodell.** `src/formats/shared/schema.ts:109-148` definiert die
   Marks `strong`, `em`, `underline`, `strike`, `textColor`, `highlight`. Es
   existiert **kein** `link`-Mark (kein `href`-Attribut, kein `parseDOM` für
   `<a href>`, kein `toDOM`). Ein per Copy&Paste aus einer Webseite
   eingefügter `<a href="...">`-Link wird vom Schema mangels passender Mark-
   Regel beim Einfügen aktuell auf reinen Text ohne jede Verknüpfung reduziert.
2. **Kein Command.** `src/formats/shared/editor/commands.ts` enthält
   `applyMarkColor`/`clearMarkColor` als generisches Muster für Marks mit
   einem Attribut (Farbe) — ein strukturell ähnliches, aber inhaltlich neues
   Command für „Link setzen“/„Link entfernen“ mit Attribut `href` fehlt
   komplett.
3. **Kein Toolbar-Button, kein Dialog, kein Tastatur-Shortcut.**
   `src/formats/shared/editor/Toolbar.tsx:135-244` listet Formatierung,
   Ausrichtung, Listen, Tabelle, Bild — keinen Link-Button. `WordEditor.tsx:71-79`
   bindet `Mod-z/y`, `Enter`, `Mod-b/i/u` — **kein** `Mod-k` (Strg+K/Cmd+K),
   der in Word **und** in praktisch jedem Web-Editor (Google Docs, gängige
   Rich-Text-Toolkits) etablierte Standard-Shortcut für „Link einfügen“. Der
   Shortcut ist also frei und aktuell durch nichts blockiert.
4. **Kritischer Importbefund DOCX — stiller Datenverlust, nicht nur fehlendes
   Feature:** `src/formats/docx/reader.ts`, Funktion `decodeParagraphRuns`
   (Zeile 124-143), liest ausschließlich `childElements(pEl, w, 'r')` —
   also nur `<w:r>`-Elemente, die **direkte** Kinder von `<w:p>` sind. In einer
   mit echtem Microsoft Word erzeugten Datei steht ein Link jedoch so:
   ```xml
   <w:p>
     <w:hyperlink r:id="rId4">
       <w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>Beispieltext</w:t></w:r>
     </w:hyperlink>
   </w:p>
   ```
   Das `<w:r>` ist hier Kind von `<w:hyperlink>`, nicht direktes Kind von
   `<w:p>` — `childElements` (Zeile 15-17) findet es **nicht**. Der komplette
   Lauf inklusive seines sichtbaren Textes wird beim Import stillschweigend
   übersprungen. Das ist keine bloße Format-Lücke, sondern ein **Verstoß gegen
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18** („ein Import darf niemals dazu
   führen, dass sichtbarer Inhalt der Originaldatei ersatzlos verschwindet“) —
   verlinkter Text verschwindet komplett aus dem importierten Dokument, nicht
   nur seine Verlinkung. Muss vor jeder weiteren Arbeit an diesem Feature mit
   einer echten Fixture-Datei nachgewiesen und zusammen mit der neuen Funktion
   behoben werden (Reader muss künftig sowohl direkte `<w:r>`- als auch in
   `<w:hyperlink>` verschachtelte `<w:r>`-Elemente auswerten).
5. **Kritischer Importbefund ODT — analoger stiller Datenverlust:**
   `src/formats/odt/reader.ts`, Funktion `decodeInline`/`walk`
   (Zeile 96-116), erkennt in ihrer `if/else if`-Kette ausschließlich
   `text:span`, `text:line-break`, `text:s` und `text:tab`. Das ODF-Element für
   einen Link, `<text:a xlink:href="...">Beispieltext</text:a>`, fällt in
   keinen dieser Fälle — die Funktion tut für dieses Element **nichts**, geht
   nicht einmal in seine Kind-Knoten hinein. Der von einem Link umschlossene
   Text (der in ODF, anders als bei DOCX, meist zusätzlich noch in einen
   inneren `text:span` mit Zeichen-Formatvorlage gewrappt ist) geht beim Import
   vollständig verloren. Gleiches Prinzip wie Punkt 4: nachzuweisen und im Zuge
   dieses Features zu beheben.
6. **Kein DOCX-Schreibpfad.** `src/formats/docx/writer.ts`, Funktion
   `runPropertiesXml` (Zeile 18-31), kennt nur `strong`/`em`/`underline`/
   `strike`/`textColor`/`highlight`. Ein `link`-Mark würde in der `for`-Schleife
   schlicht keinen der `if`-Zweige treffen und käme **spurlos unter den Tisch**
   — kein `<w:hyperlink>`-Wrapper, keine Relationship, keine Fehlermeldung.
   `inlineToRuns` (Zeile 39-65) gruppiert Textknoten ausschließlich nach
   `JSON.stringify(marks)`-Gleichheit in `<w:r>`-Läufe; es gibt keine Ebene, die
   mehrere Läufe zusätzlich in einen gemeinsamen `<w:hyperlink>`-Wrapper
   zusammenfasst.
7. **Relationship-Infrastruktur ist vorhanden, aber unvollständig für externe
   Links.** `src/formats/docx/relationships.ts` (`RelationshipRegistry`,
   `RELATIONSHIP_TYPES`) wird bereits für Bilder (`image`), Kopf-/Fußzeile
   (`header`/`footer`) verwendet und ist grundsätzlich wiederverwendbar für die
   `r:id`-Referenz eines Links. **Zwei konkrete Lücken:**
   - `RELATIONSHIP_TYPES` (Zeile 34-42) enthält keinen Eintrag für
     `hyperlink` (offizieller Typ:
     `http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink`).
   - Das `Relationship`-Interface (Zeile 1-5) und `serialize()` (Zeile 23-31)
     kennen kein `TargetMode`-Attribut. Alle bisherigen Relationship-Typen
     (Bild, Header/Footer, Styles, Numbering) sind interne Paketpfade und
     brauchen keines. Eine externe URL **muss** aber
     `<Relationship ... TargetMode="External"/>` gesetzt bekommen — fehlt
     dieses Attribut, interpretiert Word das `Target` fälschlich als internen
     Paketpfad, und der Link ist in echtem Word entweder kaputt oder erzeugt
     beim Öffnen eine Reparaturmeldung. Diese Erweiterung ist ein Pflichtteil
     der Umsetzung, keine Nebensächlichkeit.
8. **Kein ODT-Schreibpfad.** `src/formats/odt/writer.ts`, Funktion
   `runPropsFromMarks` (Zeile 25-36) und `inlineToOdt` (Zeile 46-59), kennen
   nur die Marks aus Punkt 6 und wrappen Text ausschließlich in `<text:span
   text:style-name="…">`, niemals in `<text:a xlink:href="…">`. Für ein
   `link`-Mark bräuchte es eine zusätzliche Wrapper-Ebene um den vorhandenen
   `text:span`-Mechanismus herum (ein Link kann gleichzeitig fett, farbig etc.
   sein — beide Elemente müssen koexistieren, siehe 3.13).
9. **Keine Tests.** Keine Datei unter `src/formats/**/__tests__/` oder
   `tests/e2e/*.spec.ts` erwähnt „hyperlink“, „link mark“, `w:hyperlink` oder
   `text:a`. Es existiert aktuell **kein einziger** Test für dieses Feature.
10. **Reale Test-Fixtures für ODT bereits im Repo vorhanden und ungenutzt** —
    ein seltener Glücksfall gegenüber anderen „fehlt“-Features, wo Fixtures
    erst noch beschafft werden müssten:
    `tests/fixtures/external/odt/hyperlink.odt`,
    `hyperlinkSpaces.odt`, `hyperlinkSpacesNoUnderline.odt`,
    `hyperlink_destination.odt`, `Hyperlink-AOO401.odt` (mit echtem Apache
    OpenOffice 4.0.1 erzeugt) und — besonders wertvoll als Grenzfall-Fixture —
    `invalid_simple_overlapping_hyperlinks.odt` (Name legt nahe: überlappende/
    fehlerhafte Link-Strukturen, ein bereits von den Testkorpus-Autoren als
    Sonderfall markiertes Dokument). Für DOCX wurde bei Stichprobe der
    vorhandenen 127 Fixtures unter `tests/fixtures/external/docx/` **kein**
    Dateiname gefunden, der eindeutig auf Hyperlink-Inhalt hindeutet — vor
    Verifikation ist stichprobenartig zu prüfen, welche der Dateien tatsächlich
    `w:hyperlink` enthalten, bzw. sind gezielt zusätzliche DOCX-Fixtures mit
    echten Links zu beschaffen (z. B. aus python-docx- oder Apache-POI-
    Testkorpora).

**Konsequenz:** Der Backlog-Status „fehlt“ ist nach dieser Recherche zutreffend
und sogar noch gravierender als eine reine Funktionslücke — die **vorhandenen**
Reader für beide Formate haben je einen eigenständigen, vom Fehlen dieses
Features unabhängigen Bug, der schon heute sichtbaren Text aus Fremddateien
verschluckt, sobald diese Links enthalten. Diese Datei beschreibt folglich den
Soll-Zustand einer **komplett neu zu bauenden Funktion** (Schema, Command,
Toolbar/Dialog, Tastatur-Shortcut, DOCX-Writer **und** -Reader-Fix, ODT-Writer
**und** -Reader-Fix, Relationship-Erweiterung für DOCX).

---

## 1. Menüpunkte / Bedienelemente (Soll-Zustand)

| # | Element | Auslösung | Ist-Zustand (Befund) | Soll |
|---|---|---|---|---|
| 1 | Toolbar-Button „Link einfügen“ | Klick auf Toolbar-Icon | **Fehlt komplett** in `Toolbar.tsx` | Ergänzen, sinnvoll platziert (z. B. in eigener Gruppe nahe Tabelle/Bild, analog zu Word „Einfügen → Link“); eindeutig erkennbares, eingebettetes SVG-Icon — kein Unicode-/Emoji-Zeichen (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1, dort bereits als Problemquelle für andere Buttons dokumentiert) |
| 2 | Tastenkombination Strg+K (Windows/Linux) bzw. Cmd+K (Mac) | Tastendruck bei fokussiertem Editor, Selektion vorhanden | **Fehlt** (kein `Mod-k`-Eintrag in `WordEditor.tsx`s `keymap({...})`) | Ergänzen — Standard-Shortcut in Word, LibreOffice Writer und praktisch jedem Web-Rich-Text-Editor, entspricht direkter Nutzererwartung |
| 3 | Eingabedialog/-popover für die Ziel-URL | Nach Klick auf Button oder Strg+K | Nicht anwendbar (Funktion existiert nicht) | Mindestens ein Eingabefeld für die URL, mit „Übernehmen“ (Enter) und „Abbrechen“ (Escape); nice-to-have: zusätzliches Feld für den Anzeigetext bei leerer Selektion (siehe 3.2) |
| 4 | Vorbelegung des Dialogs mit der bestehenden URL, wenn der Cursor bereits in einem Link steht | Klick auf Button/Strg+K während Cursor in vorhandenem Link | Nicht anwendbar | Muss die aktuell hinterlegte URL vorausfüllen (Bearbeiten-Fall, `hyperlink-bearbeiten`), nicht einen leeren Dialog öffnen |
| 5 | „Link entfernen“ | Button/Menüpunkt, aktiv wenn Cursor in einem Link steht | Nicht anwendbar (`hyperlink-entfernen`) | Entfernt ausschließlich das `link`-Mark, Text bleibt vollständig und unverändert erhalten |
| 6 | Visuelle Standarddarstellung im Editor | — (reine Darstellung) | Nicht anwendbar | Blau und unterstrichen als Default-Erscheinungsbild (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 14: „Visuelle Standarddarstellung (unterstrichen, farbig)“), unabhängig davon ob zusätzlich `textColor`/`underline`-Marks gesetzt sind (siehe 3.8) |
| 7 | Aktiver-Zustand-Anzeige des Toolbar-Buttons | — | Nicht anwendbar | Analog zu `MarkButton`s `aria-pressed` (`Toolbar.tsx:42-48`): Button muss erkennbar „aktiv“ wirken, wenn der Cursor in einem bestehenden Link steht |
| 8 | Tooltip mit Ziel-URL beim Hover über einen Link im Editor | Mauszeiger über verlinktem Text | Nicht anwendbar | Sinnvoll, damit die Nutzerin das Ziel prüfen kann, ohne zu klicken (`title`-Attribut oder gleichwertig) |
| 9 | Klickverhalten auf einen Link **innerhalb** des Editors | Klick/Strg+Klick auf verlinkten Text während der Bearbeitung | Nicht anwendbar | Muss geklärt und dokumentiert werden (siehe 3.9): reiner Klick darf die Bearbeitung nicht durch Navigation zu einer fremden Seite unterbrechen; Strg+Klick zum Öffnen in neuem Tab ist der in Word/Google Docs übliche Kompromiss |
| 10 | Kontextmenü-Eintrag (Rechtsklick) | Rechtsklick auf Selektion bzw. bestehenden Link | Fehlt; Editor hat aktuell ohnehin kein eigenes Kontextmenü | Nice-to-have, **kein Blocker** für die Freigabe dieser Funktion (analog zu anderen Features, z. B. `seitenumbruch-req.md` Abschnitt 1, Zeile 5) |
| 11 | Eintrag in einer künftigen klassischen Menüleiste | Klick | Nicht anwendbar — App hat aktuell nur eine Toolbar | Falls künftig eine Menüleiste eingeführt wird (`FEATURE-BACKLOG.md` Abschnitt 3.5), dort ebenfalls verfügbar machen; kein Blocker für die aktuelle Umsetzung |

---

## 2. Geltende Randbedingungen aus der Haupt-Spezifikation

Diese Datei ergänzt, ersetzt aber nicht die Anforderungen aus
`FEATURE-SPEC-DOCX-ODT.md`, insbesondere:

- Abschnitt 14 („Hyperlinks“): „Link zu markiertem Text hinzufügen
  (URL-Eingabe). Link-Ziel bearbeiten, Link entfernen (Text bleibt). Visuelle
  Standarddarstellung (unterstrichen, farbig).“ sowie deren vier dort
  genannten Testfälle — das ist die Kernanforderung, die diese Datei im Detail
  spezifiziert.
- Abschnitt 17 (Menü-/Toolbar-Übersicht), Zeile 366: „Link
  einfügen/bearbeiten/entfernen — fehlt — siehe Abschnitt 14.“
- Abschnitt 18 (Import-Robustheit): Prinzip „kein stiller Datenverlust bei
  nicht vollständig unterstützten Elementen“ — hier durch die Befunde 0.4 und
  0.5 bereits **konkret verletzt**, nicht nur theoretisch relevant.
- Abschnitt 19 (Export-Robustheit & Rundreise) und Abschnitt 20.4 (kein
  stiller Fehlschlag) gelten uneingeschränkt.
- Abschnitt 2, Regressionstest für den Selection-Sync-Bug: Öffnen eines
  Dialogs/Popovers über einer Selektion und anschließendes Anwenden eines
  Marks ist strukturell verwandt mit dem dort beschriebenen Fehlerbild
  (Toolbar-Aktion auf Selektion, danach Klick zur Neupositionierung) — muss
  mit derselben Regressionssequenz getestet werden (siehe Grenzfall 4.14).
- Abschnitt 20.1 (Icon-Rendering): gilt für das neue Link-Icon identisch wie
  für alle anderen Toolbar-Symbole.
- Abschnitt 21 (Testmatrix): Hyperlinks sind dort bereits als „fehlt“ in
  allen drei Spalten (Unit, E2E, reale Fixtures) geführt — nach Umsetzung
  dieses Features müssen alle drei Spalten grün werden.

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Grundfall: Link auf bestehende Selektion anwenden
- Ist mindestens ein Zeichen markiert und wird eine gültige URL bestätigt, so
  erhält die **gesamte** Selektion ein `link`-Mark mit Attribut `href`
  (analog zum Muster `addMark(from, to, …)` bei `applyMarkColor`,
  `commands.ts:90-97`).
- War die Selektion zuvor bereits (teilweise) verlinkt, wird die alte
  URL vollständig durch die neue ersetzt (kein Verschachteln zweier Links auf
  demselben Text — `link` muss sich selbst ausschließen, ProseMirror-Default
  für gleichnamige Marks ohne explizites `excludes`, siehe 3.13).
- War die Selektion **gemischt** (teils verlinkt mit unterschiedlichen Zielen,
  teils nicht) → definiertes Ergebnis (gesamte Selektion erhält einheitlich
  die neue URL) muss mit Testfall nachgewiesen werden.
- Die Aktion ist ein einzelner Undo-Schritt.

### 3.2 Kein Text markiert (nur Cursor)
- Anders als bei Fett/Kursiv gibt es bei einem Link ohne Text nichts, das
  verlinkt werden könnte. Zu spezifizieren und zu entscheiden (im Unterschied
  zu `textmarker-farbe-req.md` Abschnitt 2.2, wo ein reiner No-Op als
  fachlich vertretbar dokumentiert wurde): entweder
  (a) der Button/Shortcut ist bei leerer Selektion deaktiviert bzw. zeigt eine
  sichtbare Rückmeldung („bitte zuerst Text markieren“), oder
  (b) der Dialog bietet zusätzlich ein Eingabefeld für einen Anzeigetext, der
  bei Bestätigung als neuer, bereits verlinkter Text an der Cursor-Position
  eingefügt wird (Word-/Browser-übliches Verhalten beim „Link einfügen“ ohne
  vorherige Selektion).
- In jedem Fall gilt: kein stiller No-Op ohne jede Rückmeldung
  (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 Punkt 4).

### 3.3 URL-Eingabe: Validierung und Normalisierung
- Leeres Feld/Abbrechen (Escape) darf keine Änderung vornehmen.
- Eine eingegebene URL ohne Protokoll (z. B. `beispiel.de`) — zu klären, ob
  automatisch `https://` vorangestellt wird (Word/Google-Docs-übliches
  Verhalten) oder der Rohwert unverändert übernommen wird; Entscheidung ist zu
  dokumentieren, nicht nur implizit im Code zu treffen.
- `mailto:`- und `tel:`-Schemata müssen als gültige Ziele akzeptiert werden
  (reale Anwendungsfälle: E-Mail-/Telefonlinks in Dokumenten).
- **Sicherheitsrelevanter Grenzfall:** ein `javascript:`-Schema als Ziel-URL
  darf nicht unverändert übernommen werden, da es beim Rendern im Editor
  (`toDOM` erzeugt vermutlich ein `<a href="…">`) sowie potenziell in
  exportierten/reimportierten Dateien zu einem XSS-Vektor werden kann — muss
  gefiltert/abgelehnt oder zumindest neutralisiert werden (siehe Grenzfall
  4.9).
- Relative Pfade (z. B. `../andere-datei.docx`) sind laut Backlog-Beschreibung
  („mit einer URL“) nicht explizit gefordert, dürfen aber, falls eingegeben,
  nicht zum Absturz führen — mindestens als Rohtext im `href`-Attribut
  übernehmen und dokumentieren, dass eine Auflösung relativer Ziele nicht
  unterstützt wird.

### 3.4 Bearbeiten eines bestehenden Links
- Steht der Cursor (auch ohne Selektion) innerhalb eines bereits verlinkten
  Textbereichs und wird der Button/Strg+K erneut ausgelöst, öffnet sich der
  Dialog mit der **aktuell hinterlegten URL vorausgefüllt** (Bedienelement 4).
- Bestätigen mit neuer URL ersetzt das `href`-Attribut auf dem **gesamten**
  zusammenhängenden verlinkten Textbereich (nicht nur ab der Cursor-Position),
  auch wenn zuvor keine explizite Selektion vorgenommen wurde — die Grenzen
  des bestehenden Marks bestimmen den Wirkungsbereich.

### 3.5 Entfernen eines Links
- Entfernt ausschließlich das `link`-Mark aus dem betroffenen Bereich
  (analog `removeMark`, `commands.ts:99-106`); alle anderen Marks (fett,
  Farbe, Hervorhebung, …) auf demselben Text bleiben unverändert erhalten.
- Ohne Selektion, aber mit Cursor in einem Link: entfernt den Link für den
  **gesamten** zusammenhängenden verlinkten Bereich (wie 3.4).
- Text selbst bleibt in jedem Fall unverändert (`FEATURE-BACKLOG.md` Zeile
  236: „der Text bleibt erhalten“).

### 3.6 Visuelle Standarddarstellung
- Default: blau und unterstrichen, wie in `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 14 gefordert und wie es dem etablierten Nutzererwartungsbild aus
  Word/LibreOffice/Browsern entspricht.
- Zu klären: wird diese Optik direkt im `toDOM` des `link`-Marks als
  Inline-Style erzwungen (z. B. `color: #0563C1; text-decoration: underline`,
  angelehnt an Words Standard-Zeichenformatvorlage „Hyperlink“), oder über
  eine CSS-Klasse im Editor-Stylesheet? Muss dokumentiert werden, insbesondere
  im Hinblick auf 3.8 (Zusammenspiel mit explizit gesetzten Marks).

### 3.7 Aktiver-Zustand des Toolbar-Buttons
- Analog zu `MarkButton` (`Toolbar.tsx:28-62`, `aria-pressed`): der
  Link-Button muss erkennbar „gedrückt“/aktiv erscheinen, wenn `$from.marks()`
  ein `link`-Mark enthält.

### 3.8 Kombination mit anderen Zeichenformaten
- Ein Link lässt sich gleichzeitig mit Fett, Kursiv, Unterstrichen,
  Durchgestrichen, Schriftfarbe und Hervorhebungsfarbe auf denselben Textlauf
  anwenden; keines der anderen Marks darf beim Setzen/Ändern/Entfernen des
  Links entfernt oder verändert werden (Marks sind in ProseMirror unabhängig
  voneinander ohne explizites `excludes` zwischen ihnen).
- Konkret zu klären: Wenn zusätzlich explizit eine eigene `textColor` gesetzt
  ist (z. B. Nutzerin färbt den Linktext rot) — gewinnt die Default-Link-Optik
  (blau) oder die explizite `textColor` (rot)? Muss eindeutig definiert und
  getestet werden (Vorschlag angelehnt an Word/CSS-Kaskadenlogik: eine
  explizit gesetzte `textColor` überschreibt die implizite Link-Farbe
  optisch, das `href`-Attribut selbst bleibt davon unberührt).

### 3.9 Klickverhalten innerhalb des Editors
- Ein einfacher Klick auf verlinkten Text **während der Bearbeitung** darf
  **nicht** zur Navigation auf die Ziel-URL führen — sonst wäre der Text nie
  mehr normal editierbar/anklickbar, um den Cursor dort zu platzieren
  (kollidiert außerdem mit dem Selection-Sync-Mechanismus aus
  `WordEditor.tsx:42-53`).
- Strg+Klick (bzw. Cmd+Klick auf Mac) öffnet die Ziel-URL in einem neuen
  Tab/Fenster — etabliertes Verhalten aus Word und Google Docs, das die
  Nutzererwartung trifft, ohne die normale Bearbeitung zu stören. Muss
  explizit implementiert und getestet werden, sonst bleibt anderweitig gar
  keine Möglichkeit, einen Link testweise zu öffnen.

### 3.10 Zwischenablage / Kopieren & Einfügen
- Kopieren von verlinktem Text innerhalb des Editors und Einfügen an anderer
  Stelle behält das `link`-Mark samt `href`.
- Einfügen von extern kopiertem `<a href="…">…</a>`-HTML (z. B. aus einer
  Webseite oder E-Mail) muss als `link`-Mark mit korrektem `href` erkannt
  werden — dafür ist in `schema.ts` eine `parseDOM`-Regel für `a[href]`
  nötig, die aktuell **nicht existiert** (siehe 0.1). Ohne diese Regel würde
  ein eingefügter Link stillschweigend zu unverlinktem Text degradiert
  (ähnliches Muster wie der in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2,
  Testfall 4 geforderte generelle Umgang mit eingefügtem Fremd-HTML).
- Einfügen von reinem, unformatiertem Text, der wie eine URL aussieht (z. B.
  `https://beispiel.de` per Tastatur eingetippt oder aus Klartext eingefügt),
  **muss nicht** automatisch in einen klickbaren Link umgewandelt werden
  (Word-AutoFormat-Verhalten) — das ist ein eigenständiges, optionales
  Komfort-Feature (Autolink) und **kein Blocker** für diese Anforderung,
  sollte aber, falls nicht umgesetzt, bewusst als Lücke dokumentiert werden
  statt als stillschweigend fehlend zu gelten.

### 3.11 Undo/Redo
- Einfügen, Bearbeiten und Entfernen eines Links sind jeweils **ein**
  einzelner, eigenständiger Undo-Schritt.
- Redo stellt den jeweils rückgängig gemachten Zustand (inklusive exaktem
  `href`-Wert) identisch wieder her.

### 3.12 Export nach DOCX
- Ein zusammenhängender, verlinkter Textbereich wird als
  `<w:hyperlink r:id="rIdN">` um einen oder mehrere `<w:r>`-Läufe herum
  serialisiert (mehrere Läufe, falls der Bereich zusätzlich intern nach
  anderen Marks — z. B. teilweise fett — aufgeteilt werden muss, siehe
  `inlineToRuns`-Gruppierungslogik).
- Für jeden Link wird über die vorhandene `RelationshipRegistry`
  (`docx/relationships.ts`) ein neuer Relationship-Eintrag mit Typ
  `RELATIONSHIP_TYPES.hyperlink` (neu zu ergänzen) und
  **`TargetMode="External"`** (neu zu ergänzendes Feld, siehe Befund 0.7)
  erzeugt; `Target` ist die rohe URL, keine Paketpfad-Auflösung.
- Zu entscheiden und zu dokumentieren (analog zur `w:shd`-vs.-`w:highlight`-
  Entscheidung in `textmarker-farbe-req.md` Grenzfall 3.8): wird die
  Standardoptik (blau/unterstrichen) über eine referenzierte
  Zeichenformatvorlage `<w:rStyle w:val="Hyperlink"/>` erzeugt (dafür müsste
  `styleDefs.ts` um einen entsprechenden Style ergänzt werden — aktuell nur
  `Heading1`–`6` und `Normal` vorhanden, `styleDefs.ts:1-30`) oder direkt als
  Inline-`w:rPr` (`<w:color w:val="0563C1"/><w:u w:val="single"/>`)? Beide
  Varianten sind gültiges OOXML; die Wahl beeinflusst, ob echtes Word den Text
  als „mit der Formatvorlage *Hyperlink*“ erkennt.
- Mehrere unmittelbar aufeinanderfolgende Links mit **unterschiedlichen**
  Zielen dürfen nicht versehentlich zu einem gemeinsamen `<w:hyperlink>`
  zusammengefasst werden.

### 3.13 Import aus DOCX
- **Muss den unter Befund 0.4 beschriebenen Bug beheben:** `<w:hyperlink>`
  muss im Reader als eigener Container erkannt werden, dessen `<w:r>`-Kinder
  in `decodeParagraphRuns` mit ausgewertet werden — inklusive
  Text-**und** Marks-Erhalt, plus Ergänzung des `link`-Marks mit `href`,
  aufgelöst aus dem `r:id`-Attribut über die bereits vorhandene
  `readRelationships`-Funktion (`reader.ts:23-34`, wird bereits für Bilder
  und Kopf-/Fußzeile verwendet, muss hier zusätzlich für
  `word/_rels/document.xml.rels`-Einträge vom Typ `hyperlink` ausgewertet
  werden — die Funktion selbst ist typneutral und muss nicht geändert werden,
  nur ihr Ergebnis zusätzlich für Links konsultiert werden).
- Ein `<w:hyperlink>` **ohne** `r:id`, aber mit `w:anchor`-Attribut (interner
  Sprung zu einer Textmarke im selben Dokument) ist **nicht Teil dieser
  Anforderung** (siehe Geltungsbereich) — muss aber mindestens so behandelt
  werden, dass der Text nicht verloren geht (z. B. als unverlinkter Text
  importiert, mit dokumentierter bewusster Einschränkung), nicht stillschweigend
  wie in Befund 0.4 komplett wegfallen.

### 3.14 Export nach ODT
- Ein zusammenhängender, verlinkter Textbereich wird als
  `<text:a xlink:href="…" xlink:type="simple">…</text:a>` serialisiert,
  gemäß dem bereits für Bilder verwendeten `xlink`-Namespace
  (`ODF_NAMESPACES.xlink`, `odt/xmlUtil.ts:17`, bereits Teil von
  `NAMESPACE_DECLARATIONS` — keine neue Namespace-Deklaration nötig).
- Innerhalb des `<text:a>` muss der bestehende `text:span`/`TextStyleRegistry`-
  Mechanismus (`styleRegistry.ts`) für andere gleichzeitig gesetzte Marks
  (fett, Farbe, …) unverändert weiterfunktionieren — das `<text:a>` ist eine
  zusätzliche Wrapper-Ebene **um**, nicht **statt** des bestehenden
  `text:span`.
- Zu entscheiden und zu dokumentieren, analog zu 3.12: referenziert der Link
  zusätzlich eine Zeichenformatvorlage „Internet Link“
  (ODF-übliche Konvention, von LibreOffice beim eigenen „Hyperlink einfügen“
  als Style-Name `Internet_20_Link` erzeugt) für die Standardoptik, oder wird
  Blau/Unterstrichen direkt über `TextStyleRegistry` als gewöhnliche
  Zeichen-Formateigenschaft mitgeführt?

### 3.15 Import aus ODT
- **Muss den unter Befund 0.5 beschriebenen Bug beheben:** `decodeInline`s
  `walk`-Funktion (`odt/reader.ts:96-116`) muss um einen Fall für
  `text:a` (Namespace `ODF_NAMESPACES.text`) ergänzt werden, der
  (a) das `link`-Mark mit `href` aus `xlink:href` erzeugt **und**
  (b) weiterhin in die Kind-Knoten hineingeht (Rekursion wie im
  `text:span`-Fall), damit ein innerer `text:span` mit eigener
  Zeichenformatierung nicht zusätzlich verloren geht.
- Realer Grenzfall aus vorhandener Fixture `invalid_simple_overlapping_
  hyperlinks.odt` (siehe Befund 0.10): sich überlappende/verschachtelte
  Link-Strukturen dürfen nicht zum Absturz führen; mindestens der Text muss
  erhalten bleiben, auch wenn die exakte Verlinkung in diesem Sonderfall
  vereinfacht wird (Fallback-Prinzip aus `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 18).

### 3.16 Kein stiller Fehlschlag
- Jede Aktion (Link setzen, bearbeiten, entfernen), die aus irgendeinem Grund
  nicht ausgeführt werden kann (z. B. leere Selektion ohne definierten
  Fallback, ungültige/leere URL), muss eine sichtbare Rückmeldung erzeugen —
  nie ein Klick/Shortcut, der ergebnislos bleibt
  (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 Punkt 4).

---

## 4. Grenzfälle (müssen explizit geprüft werden)

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 1 | Leere Selektion (nur Cursor), Link-Aktion ausgelöst | Siehe 3.2: definiertes Verhalten (Deaktivierung/Rückmeldung oder Dialog mit Anzeigetext-Feld), kein stiller No-Op. |
| 2 | Gemischte Selektion (teils unterschiedliche bestehende Links, teils unverlinkt) | Gesamte Selektion erhält einheitlich die neu eingegebene URL (siehe 3.1); mit Testfall nachzuweisen. |
| 3 | Selektion über eine Bild-/Tabellengrenze hinweg (z. B. Strg+A über gemischten Inhalt) | Darf nicht abstürzen; Link wird nur auf textuelle Inline-Inhalte angewendet, nicht auf Bilder/Blockelemente. |
| 4 | Leeres URL-Feld bestätigt | Keine Änderung am Dokument, keine leere `href=""`, kein Absturz. |
| 5 | Sehr lange URL (z. B. > 2000 Zeichen, etwa ein signierter Cloud-Storage-Link) | Muss vollständig ohne Kürzung gespeichert und bei Rundreise erhalten bleiben; kein Crash im Reader/Writer bei ungewöhnlicher Länge. |
| 6 | URL mit Sonderzeichen (Leerzeichen, Umlaute, `&`, Anführungszeichen) | Muss beim DOCX-/ODT-Export korrekt XML-escaped werden (`escapeXml`, bereits vorhandene Utility in beiden Writern), sonst ungültiges Export-XML. |
| 7 | `mailto:`- bzw. `tel:`-Ziel | Wird wie jede andere URL behandelt (siehe 3.3), bleibt bei Rundreise als solches erhalten, nicht fälschlich mit `https://` präfigiert. |
| 8 | Zwei unmittelbar aufeinanderfolgende Links mit unterschiedlichen Zielen, ohne Text dazwischen | Bleiben als zwei getrennte `<w:hyperlink>`- bzw. `<text:a>`-Elemente erhalten, werden nicht zu einem zusammengefasst (siehe 3.12). |
| 9 | `javascript:`-Schema als Ziel-URL (versehentlich oder absichtlich eingegeben/eingefügt) | Siehe 3.3: darf nicht unverändert als klickbares `href` im Editor-DOM landen (XSS-Risiko); muss gefiltert, escaped oder abgelehnt werden — Ergebnis dieser Entscheidung ist hier zu dokumentieren. |
| 10 | Link über einen `hard_break` hinweg (z. B. „Zeile1⏎Zeile2“ komplett verlinkt, Umschalt+Enter innerhalb) | Link bleibt auf beiden Seiten des Umbruchs erhalten, bei Rundreise nicht in zwei getrennte Links zerfallen. |
| 11 | Link in einer Tabellenzelle | Rundreise erhält Zuordnung zur richtigen Zelle; kein Übergreifen auf Nachbarzellen. |
| 12 | Link, der eine komplette Überschrift (`heading`) umfasst | Bleibt als Link erhalten, Überschriften-Level bleibt unverändert; beide Marks (Level-Attribut auf dem Node, `link`-Mark auf dem Inline-Content) sind unabhängig voneinander. |
| 13 | Entfernen des Links in einem leeren Listenpunkt/leerer Tabellenzelle | Darf keinen Rendering-Fehler oder leeren `<w:r>`/`<text:span>` ohne Inhalt erzeugen. |
| 14 | **Selection-Sync-Regressionssequenz** (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 und `WordEditor.tsx:18-53`): Text markieren → Link-Dialog öffnen und bestätigen → per Klick neu positionieren → weiter tippen | Pflicht-Testsequenz: das Öffnen/Schließen eines Dialogs über einer Selektion darf die interne ProseMirror-Selektion nicht in einen inkonsistenten Zustand versetzen; nachfolgendes Tippen darf nichts Falsches löschen/ersetzen. |
| 15 | Import einer echten, mit Microsoft Word erzeugten DOCX-Datei mit Hyperlink | **Kritischer Regressionstest für Befund 0.4** — Text und Link müssen nach Behebung des Bugs vollständig erhalten bleiben, nicht nur teilweise. |
| 16 | Import der vorhandenen Fixture `invalid_simple_overlapping_hyperlinks.odt` | Siehe 3.15 — kein Absturz, mindestens Textinhalt vollständig vorhanden. |
| 17 | Import einer Datei mit internem Sprungziel (`w:anchor` statt `r:id` bzw. ODF-Textmarken-Verweis) | Außerhalb des Geltungsbereichs (siehe Kopfbereich), aber: Text darf nicht verloren gehen, auch wenn die Verlinkung selbst nicht nachgebildet wird — bewusste, dokumentierte Einschränkung statt stiller Datenverlust. |
| 18 | Cross-Format: ODT-Datei mit Link (z. B. `hyperlink.odt`) importieren → als DOCX exportieren | Link bleibt erhalten, wird korrekt als `<w:hyperlink>` mit externer Relationship erzeugt, unabhängig vom Ursprungsformat. |
| 19 | Doppelklick auf verlinkten Text zur Wort-Selektion (bereits bestehende Editor-Grundfunktion, `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) | Muss weiterhin normal funktionieren und darf durch das neue Klickverhalten (3.9) nicht beeinträchtigt werden — Doppelklick selektiert das Wort, löst keine Navigation aus. |

---

## 5. Rundreise-Anforderung (Pflicht für Abnahme)

Für **jeden** der folgenden Fälle gilt: Datei mit Hyperlink hochladen (bzw. im
Editor erzeugen) → **unverändert** exportieren → erneut importieren → Link ist
inhaltlich exakt erhalten (gleiche Textstelle, gleiche Ziel-URL, kein Verlust,
kein zusätzlicher/fehlender Link an anderer Stelle) — und, spezifisch für
dieses Feature, **auch der reine Text darf nicht verloren gehen** (siehe
Befunde 0.4/0.5).

### 5.1 DOCX
1. Im Editor Text markieren, Link mit Ziel-URL (z. B.
   `https://example.com/pfad?x=1&y=2`) setzen, als DOCX exportieren → mit
   einem unabhängigen Parser (z. B. python-docx oder direktes Parsen von
   `word/document.xml` + `word/_rels/document.xml.rels`) verifizieren:
   - `word/document.xml` enthält `<w:hyperlink r:id="rIdN">` um genau den
     erwarteten Run/die erwarteten Runs, kein anderer Text ist fälschlich
     mitbetroffen.
   - `word/_rels/document.xml.rels` enthält für `rIdN` einen Eintrag mit
     `Type=".../hyperlink"`, `Target="https://example.com/pfad?x=1&y=2"`
     **und** `TargetMode="External"` (siehe Befund 0.7 — expliziter Test, da
     das Fehlen dieses Attributs der naheliegendste Implementierungsfehler
     ist).
2. Dieselbe Datei erneut importieren → URL exakt an derselben Textstelle
   wiederhergestellt, restlicher Text weiterhin unverlinkt.
3. Link + Fett + Schriftfarbe gleichzeitig auf denselben Textlauf → Rundreise
   erhält alle drei Merkmale gemeinsam, nicht versehentlich auf getrennte
   Läufe/Hyperlink-Wrapper aufgeteilt.
4. Link entfernt (vormals verlinkter Text wird wieder normal) → Export enthält
   für diesen Bereich **kein** `<w:hyperlink>` mehr und **keinen** verwaisten
   Relationship-Eintrag ohne zugehörige Referenz im `document.xml`.
5. **Kritischer Test (Befund 0.4 / Grenzfall 4.15):** reale, mit echtem
   Microsoft Word erzeugte DOCX-Datei mit `<w:hyperlink>` importieren →
   sowohl Linktext als auch Ziel-URL bleiben vollständig erhalten.
6. Link, der einen `hard_break` einschließt → bleibt auf beiden Seiten des
   Umbruchs erhalten (Grenzfall 4.10).
7. Cross-Format: ODT mit Link importieren → als DOCX exportieren → URL bleibt
   erhalten, wird korrekt als `<w:hyperlink>` + externe Relationship erzeugt.

### 5.2 ODT
1. Im Editor Text markieren, Link setzen, als ODT exportieren → `content.xml`
   enthält `<text:a xlink:href="…" xlink:type="simple">…</text:a>` um genau
   den betroffenen Text, mit erhaltenem inneren `text:span`, falls zusätzliche
   Zeichenformatierung vorhanden ist.
2. Dieselbe Datei erneut importieren → URL exakt erhalten.
3. Link entfernt → Export enthält für diesen Textlauf kein `<text:a>` mehr,
   verbleibender `text:span` (falls andere Marks vorhanden) bleibt korrekt
   bestehen.
4. Cross-Format: DOCX mit Link (aus diesem Editor als `<w:hyperlink>` erzeugt)
   importieren → als ODT exportieren → URL bleibt erhalten.
5. **Kritischer Test (Befund 0.5):** vorhandene reale Fixtures
   `tests/fixtures/external/odt/hyperlink.odt`, `hyperlinkSpaces.odt`,
   `hyperlinkSpacesNoUnderline.odt`, `hyperlink_destination.odt` und
   `Hyperlink-AOO401.odt` importieren → in jeder Datei bleiben sowohl
   Linktext als auch Ziel-URL vollständig erhalten (aktuell, vor Behebung des
   Bugs, mit hoher Wahrscheinlichkeit **nicht** der Fall — Ergebnis ist hier
   nach Verifikation nachzutragen).
6. Fixture `invalid_simple_overlapping_hyperlinks.odt` (Grenzfall 4.16) →
   kein Absturz, Text mindestens vollständig lesbar erhalten.

### 5.3 Doppelte Rundreise / Cross-Format hin und zurück
1. DOCX mit Link → Editor → Export als ODT → erneuter Import → Export zurück
   als DOCX → Link nach zwei Formatkonvertierungen weiterhin an exakt
   derselben Textstelle und mit derselben URL vorhanden.
2. Dieselbe Prüfung mit Startpunkt ODT.
3. Dokument mit mehreren unterschiedlichen Links (z. B. drei verschiedene
   URLs an drei Textstellen) → nach doppelter Rundreise bleibt jede einzelne
   URL korrekt der richtigen Textstelle zugeordnet (keine Vertauschung).

**Abnahmekriterium:** Formatierungs-/Style-Nuancen bei Cross-Format-
Konvertierung (z. B. ob eine Zeichenformatvorlage „Hyperlink“/„Internet Link“
referenziert wird oder direktes Inline-Styling, siehe 3.12/3.14) sind zu
dokumentieren und akzeptabel; **das vollständige Verschwinden eines Links,
seiner Ziel-URL oder — noch kritischer — seines Textinhalts ist es nicht.**

---

## 6. Testplan-Hinweise (Unit + E2E, Playwright)

1. **Regressionstest zuerst (vor jeder neuen Funktionalität):** ein Unit-Test
   je Format, der mit einer minimalen, direkt aus einer echten Word-/
   LibreOffice-Datei entnommenen `<w:hyperlink>`- bzw. `<text:a>`-Struktur
   beweist, dass der jeweilige Reader aktuell (vor der Behebung) Text verliert
   — dieser Test dokumentiert Befund 0.4/0.5 reproduzierbar und dient danach
   als dauerhafter Regressionsschutz gegen ein Wiederauftreten.
2. **Unit-Tests DOCX:** gegebener interner `link`-Mark mit `href` → Writer
   erzeugt exakt `<w:hyperlink r:id="…">` um den/die richtigen Run(s), sowie
   einen `TargetMode="External"`-Relationship-Eintrag; umgekehrt: gegebenes
   XML mit `<w:hyperlink>` (inkl. verschachteltem `<w:r>`) → Reader erzeugt
   den erwarteten internen `link`-Mark mit korrektem `href`, aufgelöst über
   die Relationship-Map.
3. **Unit-Tests ODT:** analog für `<text:a xlink:href="…">`, inklusive Test
   mit zusätzlichem inneren `text:span` (kombinierte Formatierung).
4. **E2E-Test (Playwright):** Text im Editor markieren
   (`page.locator('.ProseMirror')`), Toolbar-Button „Link einfügen“ klicken
   bzw. `ControlOrMeta+K` drücken, URL in den Dialog eingeben, bestätigen →
   verlinkter Text sichtbar im DOM (`a[href]` oder äquivalent), Tooltip/Titel
   zeigt die URL.
5. „Link entfernen“ per echtem Klick → `href`/Link-Markup verschwindet aus
   dem DOM, Text bleibt unverändert.
6. „Link bearbeiten“ (Dialog erneut öffnen bei Cursor in bestehendem Link) →
   Dialog zeigt die vorhandene URL vorausgefüllt, neue URL wird korrekt
   übernommen.
7. Undo direkt nach Link-Setzen → Link verschwindet, Text bleibt; Redo stellt
   ihn wieder her.
8. **Regressionstest-Pflicht:** jeder E2E-Test aus Punkt 4 muss direkt im
   Anschluss eine Tipp- oder Formatierungsaktion ausführen und deren
   korrektes Ergebnis prüfen (Selection-Sync-Regressionsschutz, siehe
   Grenzfall 4.14 und `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2).
9. Vollständiger Rundreisetest je Format (Abschnitt 5.1/5.2) über echten
   Datei-Upload (`filechooser`) und echten Download-Abfangmechanismus
   (`page.waitForEvent('download')`), nicht nur über intern aufgerufene
   Reader/Writer-Funktionen.
10. **Reale Fixture-Tests:** alle sechs vorhandenen ODT-Fixtures aus Befund
    0.10 einzeln importieren und das Ergebnis (Text vollständig? Link
    korrekt? Absturz?) dokumentieren; für DOCX gezielt mindestens 2–3 externe
    Testdateien mit `w:hyperlink` beschaffen (aktuell im vorhandenen
    DOCX-Fixture-Bestand nicht eindeutig identifiziert, siehe Befund 0.10) und
    ebenso prüfen.
11. Sicherheitstest für Grenzfall 4.9 (`javascript:`-URL): eingegebene oder
    eingefügte `javascript:`-URL führt nicht zu ausführbarem Code im
    DOM/Export.
12. Cross-Format-Doppel-Rundreise (Abschnitt 5.3) einmal DOCX→ODT→DOCX,
    einmal ODT→DOCX→ODT.

---

## 7. Freigabekriterium für „vorhanden“

Der Backlog-Status von `hyperlink-einfuegen` (sowie sinngemäß
`hyperlink-bearbeiten` und `hyperlink-entfernen`) darf erst dann als
**vorhanden** gelten, wenn:

- alle Bedienelemente aus Abschnitt 1 tatsächlich existieren und
  funktionieren (Toolbar-Button, Shortcut, Dialog, Vorbelegung beim
  Bearbeiten, „Entfernen“, aktiver Zustand, Tooltip, definiertes
  Klickverhalten),
- **die beiden kritischen Reader-Bugs aus Befund 0.4 (DOCX) und 0.5 (ODT)
  nachweislich behoben sind** — dies ist eine Grundvoraussetzung, nicht nur
  ein „Nice-to-have“, da sie bereits heute zu stillem Textverlust in echten
  Fremddateien führen können,
- die neue `RELATIONSHIP_TYPES.hyperlink`- und `TargetMode="External"`-
  Erweiterung in `docx/relationships.ts` umgesetzt und mit einem
  unabhängigen Parser verifiziert ist,
- alle Testfälle aus Abschnitt 6 automatisiert vorliegen und grün sind,
- alle Grenzfälle aus Abschnitt 4 einzeln befundet sind (funktioniert wie
  spezifiziert / bewusst abweichendes, dokumentiertes Verhalten / repariert),
- Abschnitt 5 (Rundreise: DOCX, ODT, Cross-Format, doppelte Rundreise)
  vollständig besteht, inklusive der bereits vorhandenen sechs realen
  ODT-Fixtures,
- der Regressionstest aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2
  (Selection-Sync-Bug) explizit mit einer Link-Einfüge-Sequenz nachgestellt
  und grün ist,
- die Design-Entscheidungen aus 3.12/3.14 (Zeichenformatvorlage vs. direktes
  Inline-Styling für die Standardoptik) getroffen und dokumentiert sind,
- der Umgang mit dem `javascript:`-Sicherheitsgrenzfall (4.9) geklärt und
  abgesichert ist.

Andernfalls ist der Status auf **teilweise** zu setzen und die konkret
fehlenden Teilpunkte sind hier nachzutragen (analog zur Vorgehensweise in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21 und in `seitenumbruch-req.md`
Abschnitt 7).
