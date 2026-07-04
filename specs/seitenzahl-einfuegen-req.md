# Anforderungen: „Seitenzahl einfügen"

Status: Laut Backlog (`specs/FEATURE-BACKLOG.md`, Slug `seitenzahl-einfuegen`, Priorität 1,
Abschnitt „3.7 Kopf- & Fußzeile") als **„fehlt"** markiert
(„Fügt ein automatisch fortlaufendes Seitenzahl-Feld ein."). Diese Einstufung gilt
explizit als **nicht vertrauenswürdig** und muss vollständig verifiziert werden — im
konkreten Fall bedeutet das: bestätigen, dass die Funktion tatsächlich komplett fehlt
(nicht nur ungetestet ist), und anschließend die vollständige Umsetzung gegen die
unten stehenden Anforderungen abnehmen.

Geltungsbereich: ausschließlich die Funktion „ein automatisch fortlaufendes
Seitenzahl-Feld an der Cursor-Position einfügen" im gemeinsamen DOCX/ODT-Editor
(`src/formats/shared/editor/`, `src/formats/shared/schema.ts`,
`src/formats/shared/documentModel.ts`) sowie deren Serialisierung/Deserialisierung in
`src/formats/docx/` und `src/formats/odt/`.

Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben
ProseMirror-Editor. Jede Anforderung unten gilt für **beide** Formate, inklusive
Rundreise (Import → Seitenzahl-Feld einfügen → Export → Re-Import → Feld und Inhalt
bleiben erhalten).

---

## 0. Befund aus Code-Recherche (Ausgangslage vor Verifikation)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des Codes, nicht nur auf der
Backlog-Beschreibung. Festgestellt wurde:

1. **Kein Datenmodell für Felder jeglicher Art.** `src/formats/shared/schema.ts`
   kennt die Node-Typen `doc`, `paragraph`, `heading`, `text`, `hard_break`, `image`,
   `bullet_list`, `ordered_list`, `list_item` sowie die Tabellen-Nodes aus
   `prosemirror-tables`. Es existiert **kein** Node-Typ und **kein** Mark für ein
   dynamisches, sich selbst aktualisierendes Feld (Seitenzahl, Datum, Gesamtseitenzahl
   o. Ä.) — der `text`-Node ist reiner, statischer Zeichentext. Ein
   Seitenzahl-Feld kann in der aktuellen Codebasis nicht einmal im Datenmodell
   ausgedrückt werden, unabhängig von UI/Reader/Writer.
2. **Keine Kopf-/Fußzeilen-Bearbeitung in der UI — nicht einmal Anzeige.**
   `src/formats/shared/editor/WordEditor.tsx` und `src/app/DocumentWorkspace.tsx`
   enthalten **keinen einzigen** Verweis auf `header`/`footer` (verifiziert per
   Volltextsuche). Die einzige ProseMirror-Editor-Instanz der App bearbeitet
   ausschließlich `WordDocumentContent.body`. `header`/`footer`
   (`src/formats/shared/documentModel.ts`, jeweils `ProseMirrorJSON | null`) werden
   zwar von Reader **und** Writer für DOCX (`src/formats/docx/reader.ts` Zeilen
   348–387, `src/formats/docx/writer.ts` Zeilen 228–266) und ODT
   (`src/formats/odt/reader.ts` Zeilen 250–282, `src/formats/odt/writer.ts` Zeilen
   139–195) gelesen und geschrieben, landen aber nirgends in der UI — es gibt
   **keinen Weg**, den Cursor überhaupt in einen Kopf-/Fußzeilenbereich zu setzen,
   geschweige denn dort zu tippen. Dies ist derselbe Befund wie in
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 bereits vermerkt, hier aber konkret durch
   Codedurchsicht bestätigt und für dieses Feature **blockierend**: „Seitenzahl
   einfügen" setzt begrifflich einen Ort voraus, an dem das Feld sitzt (Kopf- oder
   Fußzeile), und dieser Ort existiert in der Bedienoberfläche schlicht nicht.
   Diese Datei behandelt „Seitenzahl einfügen" trotzdem eigenständig (wie im
   Backlog als eigener Slug geführt), macht die Abhängigkeit von den ebenfalls als
   „fehlt"/Priorität 1 geführten Slugs `kopfzeile-bearbeiten` und
   `fusszeile-bearbeiten` aber explizit zur Voraussetzung (siehe Abschnitt 3.1).
3. **Kein Toolbar-Button, kein Command.** `src/formats/shared/editor/Toolbar.tsx`
   (vollständig durchgesehen) hat keinen Eintrag „Seitenzahl", keinen Eintrag
   „Kopfzeile"/„Fußzeile" und keinen Button, der einen Kopf-/Fußzeilenbereich
   überhaupt aktiviert. `src/formats/shared/editor/commands.ts` enthält keinen
   `insertPageNumber`-artigen Befehl.
4. **Kein DOCX-Feld-Parsing — verifizierter, konkreter Datenverlust-/Korruptionsfall.**
   `decodeParagraphRuns()` in `src/formats/docx/reader.ts` (Zeilen 124–143) iteriert
   ausschließlich über direkte `<w:r>`-Kindelemente eines `<w:p>` und behandelt darin
   nur `w:t` (Text), `w:br` (Zeilenumbruch) und `w:drawing` (Bild) — jedes andere
   Element wird stillschweigend übersprungen. Für ein von echtem Microsoft Word
   erzeugtes Seitenzahl-Feld ergeben sich daraus zwei konkret nachvollziehbare,
   unterschiedliche Fehlverhalten je nach XML-Encoding:
   - **`w:fldSimple`-Form** (`<w:p><w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p>`):
     Der innere `<w:r>` ist **kein direktes Kind** von `<w:p>` (sondern von
     `w:fldSimple`), wird also von `decodeParagraphRuns()` gar nicht erst gefunden.
     Ergebnis: **vollständiger, stiller Verlust** des angezeigten Zwischenwerts.
   - **`w:fldChar`-Quadruple-Form** (die von Word in der Praxis weitaus häufiger
     erzeugte Form: `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`):
     Die `w:fldChar`- und `w:instrText`-Kinder matchen keinen der drei behandelten
     Fälle und werden übersprungen (unkritisch für sich), aber der
     `<w:r><w:t>1</w:t></w:r>`-Run (der reine Cache-/Anzeigewert zwischen
     `separate` und `end`) **matcht die `w:t`-Bedingung** und wird als **normaler,
     hartkodierter Text „1"** gelesen. Ergebnis: **fehlerhafte Herabstufung** eines
     echten, aktualisierbaren Feldes zu eingefrorenem, falschem Text — schlimmer
     als reiner Verlust, da unauffällig plausibel aussehend.
5. **Kein ODT-Feld-Parsing — verifizierter Datenverlust.** Die `walk()`-Funktion in
   `src/formats/odt/reader.ts` (Zeilen 96–116) behandelt ausschließlich
   `text:span`, `text:line-break`, `text:s` und `text:tab`; es gibt **keinen**
   abschließenden Fallback-Zweig, der unbekannte Elemente wenigstens auf ihren
   Textinhalt reduziert. Ein `<text:page-number>1</text:page-number>`-Element (von
   LibreOffice Writer per „Einfügen → Kopf- und Fußzeile → Seitenzahl" erzeugt) wird
   dadurch **komplett übersprungen** — der eingebettete Cache-Wert „1" geht
   ersatzlos verloren, ohne dass überhaupt ein Text-Fragment übrig bleibt (anders
   als beim DOCX-Fall oben, wo wenigstens fälschlich statischer Text entsteht).
   `text:page-count` (Gesamtseitenzahl, ein verwandtes, aber semantisch anderes
   Feld) ist ebenso unbekannt und trifft dasselbe Schicksal.
6. **Keine Schreibunterstützung.** `inlineToRuns()` in `src/formats/docx/writer.ts`
   (Zeilen 39 ff.) kennt nur die Fälle `text` und `hard_break` (sowie an anderer
   Stelle `image`); es gibt keinen Fall, der ein Feld-Node in `w:fldSimple` oder ein
   `w:fldChar`-Quadruple übersetzt. Der analoge Renderpfad in
   `src/formats/odt/writer.ts` (`blocksToOdt`) kennt ebenso keinen Fall für
   `text:page-number`.
7. **Kein Test.** Es gibt keinen einzigen Treffer für „fldsimple", „fldchar",
   „instrtext", „text:page-number", „text:page-count" oder „pagenumber" (Groß-/
   Kleinschreibung ignoriert) im gesamten `src`- und `tests`-Verzeichnis
   (verifiziert per Volltextsuche).

**Konsequenz:** Der Backlog-Status „fehlt" ist nach dieser Recherche zutreffend —
und zwar in einer besonders strengen Form: Es fehlt nicht nur die Einfüge-Funktion
selbst, sondern auch ihre notwendige Voraussetzung (bedienbare Kopf-/Fußzeile), ihr
Datenmodell, ihr Schreibpfad **und** ihr Lesepfad ist für real erzeugte Fremddateien
nachweislich fehlerhaft (stiller Verlust bzw. stille Verfälschung zu Text, siehe
Punkt 4/5). Diese Datei beschreibt folglich den Soll-Zustand einer **komplett neu zu
bauenden Funktion mit einer expliziten, ebenfalls noch fehlenden Abhängigkeit**.

---

## 1. Menüpunkte / Bedienelemente (Soll-Zustand)

| # | Element | Auslösung | Aktueller Stand (Befund) | Soll |
|---|---|---|---|---|
| 1 | Toolbar-Button „Seitenzahl einfügen" | Klick auf Toolbar-Icon, während Cursor/Fokus in einem Kopf- oder Fußzeilenbereich steht | **Fehlt komplett** in `Toolbar.tsx`; es gibt aktuell nicht einmal einen Kopf-/Fußzeilenbereich, in dem der Cursor stehen könnte | Muss ergänzt werden — sinnvollerweise in einer eigenen, kontextabhängigen Werkzeugleiste, die nur sichtbar/aktiv ist, wenn der Fokus in Kopf- oder Fußzeile liegt (analog zur „Tabellen-Kontext"-Idee aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17, Zeile 20); eindeutiges, eingebettetes SVG-Icon, kein Unicode-/Emoji-Zeichen |
| 2 | Bequemer Einstieg aus der Haupt-Toolbar heraus (analog Word „Einfügen → Kopf- und Fußzeile → Seitenzahl"), auch wenn noch keine Fußzeile aktiv ist | Klick | Nicht anwendbar — es existiert keine Fußzeilen-Aktivierung überhaupt | Nice-to-have, **kein Blocker**: falls umgesetzt, muss der Klick automatisch eine Standard-Fußzeile aktivieren (Abhängigkeit zu `fusszeile-bearbeiten`) und das Feld dort einfügen; andernfalls muss der Button so lange sichtbar deaktiviert bleiben, bis eine Kopf-/Fußzeile aktiv ist — niemals ein wirkungsloser Klick (siehe Abschnitt 3.15) |
| 3 | Positionswahl (links/mittig/rechts) für die neu eingefügte Seitenzahl | Auswahl (z. B. Dropdown neben dem Button) oder einfach Wiederverwendung der bestehenden Ausrichtungs-Buttons auf dem Absatz, der das Feld enthält | Nicht anwendbar | Kein zwingend neuer Mechanismus nötig — die bereits vorhandene Absatz-Ausrichtung (`AlignButton`, siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 4) auf den Kopf-/Fußzeilen-Absatz reicht aus; eine dedizierte Schnellauswahl ist nice-to-have |
| 4 | Sichtbare Kennzeichnung eines eingefügten Seitenzahl-Felds im Editor (Feldschattierung) | — (reine Darstellung) | **Fehlt** — es gibt keine visuelle Unterscheidung zwischen einem echten, dynamischen Feld und getipptem Text | Muss visuell erkennbar sein (z. B. dezent grauer Hintergrund, analog der in Word per Strg+F9 sichtbaren Feldschattierung), damit die Nutzerin ein Feld von umgebendem, editierbarem Text unterscheiden kann |
| 5 | Löschen eines eingefügten Seitenzahl-Felds | Cursor davor/danach + Entf/Backspace, oder Markieren des Feldes als Ganzes | Nicht anwendbar (Funktion existiert nicht) | Muss als atomare Einheit löschbar sein (wie ein `image`-Node heute schon `selectable: true` ist) — niemals in ein korruptes Text-Fragment zerfallen |
| 6 | Kontextmenü-Eintrag (Rechtsklick im Kopf-/Fußzeilenbereich) | Rechtsklick → Eintrag „Seitenzahl einfügen" | Fehlt; der Editor hat aktuell ohnehin kein eigenes Kontextmenü | Nice-to-have, **kein Blocker** für die Freigabe dieser Funktion |
| 7 | Formatierung des Feldes über die bestehende Zeichenformat-Toolbar (fett, Farbe, …) | Anwenden der bestehenden Toolbar-Buttons, während das Feld selbst oder umgebender Text markiert ist | Nicht anwendbar | Muss identisch zu normalem Text funktionieren (siehe Abschnitt 3.11) |
| 8 | Eintrag „Seitenzahl formatieren/Startwert" (Format 1,2,3 vs. i,ii,iii, Startzahl) | — | Fehlt; separater Backlog-Slug `seitenzahl-format` (Priorität 3) | **Explizit außerhalb dieses Tickets** (siehe Abschnitt 8, Non-Goals) — nicht mit diesem Feature verwechseln |
| 9 | Eintrag „Seite X von Y" (Gesamtseitenzahl, `NUMPAGES`/`text:page-count`) | — | Fehlt; **kein eigener Backlog-Slug vorhanden** | **Explizit außerhalb dieses Tickets** (siehe Abschnitt 8, Non-Goals); darf beim Import aber nicht mit der einfachen Seitenzahl verwechselt werden (siehe Grenzfall 11) |
| 10 | Voraussetzung „Kopfzeile bearbeiten" / „Fußzeile bearbeiten" | — | Fehlt komplett (separate Backlog-Slugs `kopfzeile-bearbeiten`, `fusszeile-bearbeiten`, beide Priorität 1, beide ebenfalls ohne jede UI, siehe Abschnitt 0 Punkt 2) | **Harte Abhängigkeit** dieses Tickets — ohne bedienbaren Kopf-/Fußzeilenbereich kann „Seitenzahl einfügen" nicht sinnvoll verifiziert/E2E-getestet werden (siehe Abschnitt 3.1 und Abschnitt 6, Punkt 6) |

---

## 2. Geltende Randbedingungen aus der Haupt-Spezifikation

Diese Datei ergänzt, ersetzt aber nicht die Anforderungen aus
`FEATURE-SPEC-DOCX-ODT.md`, insbesondere:

- Abschnitt 9 („Kopf- und Fußzeilen"): „Seitenzahl als Feld einfügbar (aktualisiert
  sich mit tatsächlicher Seitenzahl beim Export, mindestens als korrektes
  Word/ODF-Feld, das die Zielanwendung selbst berechnet)." — das ist die
  Kernanforderung, die diese Datei im Detail spezifiziert. Dort auch bereits
  vermerkt: „es gibt noch keinen UI-Weg, eine Kopf-/Fußzeile über den Editor selbst
  zu erstellen/bearbeiten — das ist eine fehlende Funktion, kein reiner
  Test-Gap" — durch Abschnitt 0 dieser Datei konkret bestätigt.
- Abschnitt 17 (Menü-/Toolbar-Übersicht), Zeile 8: „Kopf-/Fußzeile bearbeiten —
  fehlt komplett in der UI — neu zu bauen, siehe Abschnitt 9."
- Abschnitt 18 (Import-Robustheit): Prinzip „kein stiller Datenverlust bei nicht
  vollständig unterstützten Elementen" — durch Abschnitt 0, Punkte 4 und 5 dieser
  Datei bereits **konkret als verletzt nachgewiesen** (nicht nur theoretisch
  denkbar).
- Abschnitt 19 (Export-Robustheit & Rundreise) und Abschnitt 20.4 (kein stiller
  Fehlschlag) gelten uneingeschränkt.
- Abschnitt 2, Regressionstest für den Selection-Sync-Bug: das Einfügen eines
  Inline-Elements an der Cursor-Position ist laut dortiger Beschreibung ein
  Hauptverdachtsfall — ein Seitenzahl-Feld ist strukturell eine Inline-Einfügung,
  muss also mit derselben Regressionssequenz getestet werden (siehe Grenzfall 5
  unten), sobald ein Kopf-/Fußzeilen-Editierbereich existiert.
- Abschnitt 16 (Dokumentmetadaten) als methodisches Vorbild: dort wurde ebenfalls
  festgestellt, dass ein laut Datenmodell „vorhandenes" Feld (Titel) in der UI gar
  nicht setzbar ist — dieselbe Kategorie von Lücke wie hier (Datenmodell/Reader/
  Writer vs. tatsächlich bedienbare Funktion).

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Voraussetzung: bedienbarer Kopf-/Fußzeilenbereich (Abhängigkeit)
- Diese Funktion setzt voraus, dass ein Kopf- und/oder Fußzeilenbereich im Editor
  existiert, aktivierbar ist und einen eigenen, fokussierbaren Editierbereich
  (eigene ProseMirror-Instanz oder eigener Teilbaum mit eigenem Cursor) bereitstellt
  — das ist Gegenstand der separaten, ebenfalls als „fehlt" geführten Tickets
  `kopfzeile-bearbeiten` und `fusszeile-bearbeiten`.
- Diese Spezifikation legt für die Umsetzung von „Seitenzahl einfügen" den
  minimalen Vertrag fest, den jene Abhängigkeit erfüllen muss: ein aktiver,
  fokussierter Absatz-Kontext innerhalb von `header`/`footer`, in den ein
  Inline-Node eingefügt werden kann, sowie eine Möglichkeit für die Toolbar,
  zuverlässig zu erkennen, ob der aktuelle Fokus in einem solchen Bereich liegt
  (für die Sichtbarkeit/Aktivierung des Buttons aus Abschnitt 1, Zeile 1).
- Diese Datei baut diesen Editierbereich **nicht** selbst — sie verlangt aber
  ausdrücklich, dass „Seitenzahl einfügen" nicht als „vorhanden" gilt, solange
  diese Voraussetzung fehlt (siehe Abschnitt 7).

### 3.2 Grundfall: Einfügen an der Cursor-Position (keine Selektion)
- Das Seitenzahl-Feld wird **exakt an der Cursor-Position** innerhalb des Kopf-
  oder Fußzeilenabsatzes eingefügt, nicht an einer zufälligen Stelle.
- Nach dem Einfügen steht der Cursor unmittelbar nach dem Feld, bereit zum
  Weitertippen (z. B. um „Seite " davor und " von …" danach zu tippen).

### 3.3 Einfügen über eine bestehende Selektion
- Eine vorhandene Selektion innerhalb des Kopf-/Fußzeilenbereichs wird durch das
  Feld **ersetzt** (nicht ergänzt) — Standardverhalten wie bei anderen
  Inline-/Block-Einfügungen (vgl. Bild-Einfügen in
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7).

### 3.4 Datenmodell-Repräsentation
- Es muss ein neuer Inline-Node im gemeinsamen Schema
  (`src/formats/shared/schema.ts`) ergänzt werden (z. B. `page_number_field`),
  analog zur bestehenden `image`-Node-Definition, aber **inline** statt Block
  (`group: 'inline', inline: true, atom: true, selectable: true`).
- Der Node darf **keinen editierbaren, direkt eintippbaren Ziffern-Inhalt**
  besitzen — die angezeigte Zahl ist ein berechneter Anzeigewert, kein vom
  Datenmodell aus editierbarer Text. Ein Attribut für einen optionalen, rein
  kosmetischen Cache-/Vorschauwert (z. B. `cachedValue: string`) ist zulässig, darf
  aber beim internen Re-Export niemals als maßgeblicher, fest eingefrorener Wert
  behandelt werden (siehe 3.6/3.7).
- Der Node muss Marks tragen können (fett, kursiv, Farbe, perspektivisch
  Schriftart/-größe) — das ist gegenüber den bestehenden Inline-Atomen (`image` ist
  ein Block-Node ohne Marks, `hard_break` trägt ebenfalls keine Marks) **neues
  Terrain** im Schema und muss bei der Umsetzung bewusst berücksichtigt werden.

### 3.5 Export nach DOCX
- Muss als echtes, in Word selbst aktualisierbares Feld serialisiert werden — zwei
  gleichermaßen zulässige OOXML-Formen kommen infrage:
  - `<w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple>`
    (einfacher, aber seltener von echtem Word erzeugt), oder
  - das vollständige `w:fldChar`-Quadruple
    (`begin`/`instrText PAGE`/`separate`/`<w:t>1</w:t>`/`end`), das die von echtem
    Word in der Praxis überwiegend erzeugte Form ist (siehe Abschnitt 0, Punkt 4).
  - Eine dieser Formen ist bewusst zu wählen und in Code-Kommentaren zu
    begründen; **beide** müssen aber beim **Import** korrekt erkannt werden
    (Abschnitt 3.6), unabhängig davon, welche Form beim Export gewählt wird.
- Der eingebettete Cache-/Anzeigewert (z. B. „1") dient ausschließlich als
  Fallback-Darstellung für Betrachter, die Felder nicht selbst neu berechnen
  (z. B. bestimmte PDF-Exportpfade) — er darf nicht mit der tatsächlichen,
  von Word beim Öffnen live berechneten Seitenzahl verwechselt werden und muss
  in Word als **aktualisierbares Feld** (F9) erkennbar bleiben, nicht als
  eingefrorener Text.

### 3.6 Import aus DOCX
- Beide in 3.5 genannten OOXML-Formen (`w:fldSimple` **und** das
  `w:fldChar`-Quadruple) müssen erkannt und in den internen Feld-Node überführt
  werden — nicht nur eine der beiden Formen.
- Der Feldcode-Text (`w:instr` bzw. `w:instrText`) muss tolerant gegenüber
  Whitespace und gängigen Word-Schaltern ausgewertet werden, z. B.
  ` PAGE `, `PAGE \* MERGEFORMAT`, `PAGE \* Arabic`, `PAGE \* ROMAN` — erkannt wird
  in jedem Fall „es handelt sich um ein PAGE-Feld"; die Schalter selbst dürfen
  nicht als sichtbarer Text im Dokument landen.
- **Explizit zu beheben (verifizierter Bestandsfehler aus Abschnitt 0, Punkt 4):**
  Der `<w:t>`-Run zwischen `separate` und `end` darf nicht mehr als gewöhnlicher,
  permanenter Text gelesen werden — er ist Teil des Feldes und muss als solcher
  erkannt werden, nicht als eigenständiger Textlauf.
- Ebenso zu beheben: die `w:fldSimple`-Form darf nicht mehr zu vollständigem
  Datenverlust führen, weil ihr innerer `<w:r>` kein direktes Kind des
  `<w:p>`-Elements ist.

### 3.7 Export nach ODT
- Muss als `<text:page-number>N</text:page-number>` innerhalb des
  Kopf-/Fußzeilenabsatzes serialisiert werden — identisch zu dem Element, das
  LibreOffice Writer selbst bei „Einfügen → Kopf- und Fußzeile → Seitenzahl"
  erzeugt. `N` ist auch hier nur ein Cache-/Vorschauwert (siehe 3.5).
- Aktive Marks auf dem Feld werden wie bei normalem Text in einen umschließenden
  `<text:span>` übersetzt.

### 3.8 Import aus ODT
- Ein `<text:page-number>`-Element muss erkannt und in den internen Feld-Node
  überführt werden — **explizit zu beheben** (verifizierter Bestandsfehler aus
  Abschnitt 0, Punkt 5): aktuell wird das Element komplett übersprungen,
  samt seines Cache-Werts.
- `<text:page-count>` (Gesamtseitenzahl) ist ein **eigenständiges, anderes** Feld
  (siehe Abschnitt 8, Non-Goals) und darf **nicht** mit `<text:page-number>`
  verwechselt bzw. auf denselben internen Node abgebildet werden — eine
  Verwechslung würde ein Dokument erzeugen, das dauerhaft die Gesamtseitenzahl
  statt der laufenden Seitenzahl anzeigt.

### 3.9 Anzeige im Live-Editor (WYSIWYG)
- Da `header`/`footer` aktuell als **ein einziges, geteiltes Template** für alle
  simulierten Seiten modelliert sind (kein Reader/Writer-Konzept „je Seite eine
  eigene Kopf-/Fußzeile-Instanz", siehe `documentModel.ts`), kann der Editor selbst
  im Regelfall keine „echte", pro Simulationsseite unterschiedliche Zahl im
  laufenden Bearbeitungsmodus anzeigen.
- **Mindestanforderung (Pflicht):** Das Feld muss im Editor visuell eindeutig als
  Feld erkennbar sein (siehe Abschnitt 1, Zeile 4) und einen plausiblen
  Platzhalterwert zeigen (z. B. „1"), damit die Nutzerin sieht, dass an dieser
  Stelle etwas Dynamisches sitzt.
- **Offener, zu dokumentierender Punkt (kein Blocker für Abnahme, aber explizit
  festzuhalten, analog zum offenen Punkt in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt
  8):** ob der Live-Editor über mehrere simulierte Seiten hinweg tatsächlich
  hochzählende Werte (1, 2, 3, …) anzeigt, hängt vom künftigen Ausbau der
  Kopf-/Fußzeilen-Darstellung ab und ist getrennt von der zwingenden Anforderung
  zu behandeln, dass der **Export** in Word/LibreOffice korrekt und dynamisch
  hochzählt (siehe Abschnitt 3.5/3.7 — das berechnet ohnehin die Zielanwendung
  selbst, nicht unsere App).

### 3.10 Formatierbarkeit
- Zeichenformatierung (fett, kursiv, unterstrichen, durchgestrichen, Farbe,
  perspektivisch Schriftart/-größe) muss auf das Feld genauso anwendbar sein wie
  auf normalen Text in Kopf-/Fußzeile — sowohl durch Markieren des Feldes selbst
  als auch durch Formatieren an der Cursor-Position unmittelbar davor, gefolgt vom
  Einfügen.

### 3.11 Löschen
- Das Feld wird wie ein atomares Inline-Element behandelt: Markieren (Klick oder
  Tastatur) + Entf/Backspace entfernt es vollständig in einem Schritt. Es darf zu
  keinem Zeitpunkt in ein korruptes Text-Fragment (z. B. sichtbarer Rest-Text wie
  „PAGE" oder eine hartkodierte Ziffer) zerfallen.
- Backspace/Entf mit dem Cursor unmittelbar davor/danach löscht ausschließlich das
  Feld als Ganzes, nicht zusätzlich benachbarten Text.

### 3.12 Kopieren/Einfügen
- Kopieren des Feldes (innerhalb desselben oder in einen anderen
  Kopf-/Fußzeilenbereich) und erneutes Einfügen erzeugt wieder ein **lebendiges**
  Feld, keinen hartkodierten Text-Schnappschuss.

### 3.13 Undo/Redo
- Einfügen des Feldes ist **ein einziger Undo-Schritt**.
- Löschen des Feldes ist ebenfalls ein einziger Undo-Schritt und stellt den
  exakten Zustand davor wieder her.
- Redo stellt den jeweils rückgängig gemachten Zustand identisch wieder her.

### 3.14 Zusammenspiel mit der automatischen Paginierung (`pagination.ts`)
- Die automatische, rein DOM-höhen-basierte Paginierung
  (`src/formats/shared/editor/pagination.ts`, siehe auch
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8 und `seitenumbruch-req.md` Abschnitt 3.8)
  betrifft ausschließlich den Hauptinhalt (`body`). Das Zusammenspiel mit einem in
  Kopf-/Fußzeile eingefügten Seitenzahl-Feld ist zu klären und zu dokumentieren,
  sobald ein Kopf-/Fußzeilen-Editierbereich existiert — insbesondere, ob/wie die
  Kopf-/Fußzeile auf jeder simulierten Seite im Editor überhaupt sichtbar
  wiederholt wird (aktuell: gar nicht, siehe Abschnitt 0, Punkt 2).

### 3.15 Rückmeldeverhalten (kein stiller Fehlschlag)
- Wird der Toolbar-Button betätigt, während der Fokus **nicht** in einem
  Kopf-/Fußzeilenbereich liegt (z. B. im Haupttext), und ist keine
  Auto-Aktivierungs-Convenience (Abschnitt 1, Zeile 2) umgesetzt, muss der Button
  sichtbar deaktiviert sein und/oder eine erklärende Rückmeldung liefern (Tooltip/
  Hinweistext) — niemals ein Klick, der ergebnislos bleibt.

---

## 4. Grenzfälle (müssen explizit geprüft werden)

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 1 | Versuch, ein Seitenzahl-Feld im Haupttext (`body`, außerhalb jeder Kopf-/Fußzeile) einzufügen | Zu klären und zu dokumentieren: entweder generell nicht möglich (Button dort inaktiv, siehe 3.15) oder — wie in echtem Word über „Einfügen → Feld → PAGE" auch im Fließtext möglich — bewusst erlaubt; in jedem Fall konsistent dokumentiertes, kein zufälliges Verhalten. |
| 2 | Klick auf „Seitenzahl einfügen", obwohl noch **kein** Kopf-/Fußzeilenbereich aktiv ist (`header`/`footer === null`) | Muss entweder automatisch einen Standardbereich anlegen (Abhängigkeit zu `kopfzeile-bearbeiten`/`fusszeile-bearbeiten`) oder der Button bleibt bis zur manuellen Aktivierung deaktiviert — kein Crash, keine stille Nichtwirkung. |
| 3 | Mehrere Seitenzahl-Felder im selben Kopf-/Fußzeilenabsatz (z. B. versehentlich zweimal eingefügt) | Beide bleiben unabhängig erhalten, keine automatische Deduplizierung, kein Crash. |
| 4 | Feld unmittelbar neben Text ohne Leerzeichen (z. B. „Seite" + Feld + „.") | Text und Feld bleiben als getrennte, korrekt nebeneinanderstehende Einheiten erhalten, kein Verschmelzen zu einem einzigen Textlauf. |
| 5 | Feld einfügen, danach direkt weitertippen bzw. Selektion neu setzen und tippen (Selection-Sync-Regressionsfall aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) | Pflicht-Testsequenz, sobald ein Kopf-/Fußzeilen-Editierbereich existiert: Einfügen des Feldes darf die interne Selektion nicht in einen inkonsistenten Zustand versetzen. |
| 6 | Löschen einzelnes Zeichen direkt am Rand des Feldes (Backspace/Entf) | Feld wird als Ganzes gelöscht (atomar), nicht in ein korruptes Teilfragment zerlegt (siehe 3.11). |
| 7 | Kopieren des Feldes, Einfügen an anderer Stelle (selber oder anderer Kopf-/Fußzeilenbereich) | Bleibt lebendiges Feld, keine Umwandlung in hartkodierten Text (siehe 3.12). |
| 8 | Import einer mit echtem Microsoft Word erzeugten DOCX-Datei mit PAGE-Feld über die `w:fldChar`-Quadruple-Syntax inkl. Schalter `\* MERGEFORMAT` | Wird als Seitenzahl-Feld erkannt, Schaltertext nicht als sichtbarer Text durchgereicht; **aktuell bekannter, konkret verifizierter Fehler:** wird zu statischem Text „1" (siehe Abschnitt 0, Punkt 4) — muss behoben werden. |
| 9 | Import einer mit echtem Microsoft Word erzeugten DOCX-Datei mit PAGE-Feld über die `w:fldSimple`-Syntax | Wird ebenfalls erkannt; **aktuell bekannter, konkret verifizierter Fehler:** Inhalt geht komplett verloren, da der verschachtelte `<w:r>` kein direktes Kind von `<w:p>` ist (siehe Abschnitt 0, Punkt 4). |
| 10 | Import einer mit echtem LibreOffice Writer erzeugten ODT-Datei mit `<text:page-number>` | Wird erkannt; **aktuell bekannter, konkret verifizierter Fehler:** wird komplett stillschweigend übersprungen, samt Cache-Wert (siehe Abschnitt 0, Punkt 5). |
| 11 | Import einer ODT-Datei mit `<text:page-count>` (Gesamtseitenzahl, verwandtes, aber anderes Feld, siehe Non-Goals in Abschnitt 8) | Darf **nicht** fälschlich als Seitenzahl-Feld interpretiert werden; definiertes Fallback nötig (mindestens Textinhalt erhalten), das keinen stillen Datenverlust erzeugt, aber auch keine falsche Feldbedeutung vortäuscht. |
| 12 | Cross-Format-Rundreise DOCX → ODT → DOCX bzw. ODT → DOCX → ODT | Feld bleibt über beide Konvertierungen hinweg als aktualisierbares Feld erhalten — kein Abrutschen zu statischem Text, keine kumulative Verschlechterung. |
| 13 | Rückgängig machen (Strg+Z) direkt nach dem Einfügen des Feldes | Feld verschwindet vollständig in einem Schritt, umgebender Text bleibt unverändert (siehe 3.13). |
| 14 | Formatierung (fett, Farbe) auf das Feld anwenden, danach Rundreise | Formatierung bleibt erhalten, Feld bleibt Feld (siehe 3.10). |
| 15 | Feld mit Cursor unmittelbar davor, Enter drücken (neuer Absatz innerhalb der Kopf-/Fußzeile) | Feld bleibt vollständig im ursprünglichen Absatz erhalten, kein Duplizieren, kein Verschwinden. |
| 16 | Dokument mit sehr vielen simulierten Seiten (automatische Paginierung erzeugt z. B. > 20 Seiten) | Beim Öffnen der exportierten Datei in Word/LibreOffice zeigt jede Seite die jeweils korrekte, unterschiedliche Zahl (das berechnet die Zielanwendung selbst); die Darstellung im Salamanido-eigenen Live-Editor selbst ist gemäß 3.9 ein separat dokumentierter, nicht blockierender Punkt. |

---

## 5. Rundreise-Anforderung

Zwei getrennte, beide verpflichtende Rundreise-Prüfungen — analog zur Methodik in
`seitenumbruch-req.md` Abschnitt 5 und `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19.

### 5.1 Baseline-Rundreise (Regressionsschutz — darf durch die neue Funktion nicht kaputtgehen)
1. Reale, mit echtem Microsoft Word erzeugte DOCX-Datei, die bereits ein
   PAGE-Feld in Kopf- oder Fußzeile enthält, unverändert hochladen (kein Klick,
   keine Eingabe) → sofort exportieren → erneut importieren → das Feld bleibt als
   **aktualisierbares Feld** erhalten. Dies ist zugleich der zentrale
   Regressionsbeweis dafür, dass der in Abschnitt 0, Punkt 4 verifizierte Bug
   (Herabstufung zu statischem Text bzw. Totalverlust) tatsächlich behoben wurde.
2. Dasselbe mit einer realen, mit echtem LibreOffice Writer erzeugten ODT-Datei
   mit `<text:page-number>` (Regressionsbeweis für den in Abschnitt 0, Punkt 5
   verifizierten Bug).
3. Reale Datei **ohne** jedes Seitenzahl-Feld unverändert hochladen → exportieren
   → reimportieren → es darf **kein** Feld neu erfunden/hinzugefügt werden.
4. Alle drei Prüfungen müssen weiterhin grün sein, nachdem Schema, Writer und
   Reader um die neue Funktion erweitert wurden.

### 5.2 Feature-Rundreise (Seitenzahl-Feld selbst)
Für jede der folgenden Situationen: Seitenzahl-Feld über Toolbar in einen aktiven
Kopf-/Fußzeilenbereich einfügen → Dokument als DOCX exportieren → reimportieren →
Feld **und** Inhalt bleiben erhalten; **und** identisch als ODT; **und** zusätzlich
Cross-Format (in ein ursprünglich als DOCX erstelltes/importiertes Dokument
einfügen und als ODT exportieren, sowie umgekehrt):

1. Neues Dokument, Fußzeile aktivieren, Seitenzahl-Feld einfügen → Feld bleibt als
   Feld erkennbar (nicht zu Leerzeichen/statischem Text degradiert), Inhalt davor/
   danach unverändert.
2. Dasselbe in der Kopfzeile.
3. Dasselbe als ODT-Ursprungsdokument (Kopf- **und** Fußzeile).
4. Cross-Format DOCX → ODT → DOCX: Feld bleibt über beide Konvertierungen hinweg
   als echtes, aktualisierbares Feld erhalten.
5. Cross-Format ODT → DOCX → ODT (umgekehrte Richtung).
6. Feld kombiniert mit Text und Zeichenformatierung in derselben Fußzeile (z. B.
   „Seite " + fett formatiertes Feld + „.") → Rundreise erhält sowohl Text,
   Formatierung als auch Feld unverändert.
7. Import einer **fremden, nicht mit dieser App erzeugten** DOCX-Datei mit
   PAGE-Feld (mit echtem Microsoft Word erzeugt, beide Encodings aus Abschnitt
   3.5/3.6 einzeln geprüft) → Feld wird erkannt, unverändert exportiert, erneut
   reimportiert → weiterhin als Feld vorhanden.
8. Dasselbe mit einer mit echtem LibreOffice Writer erzeugten ODT-Datei
   (`<text:page-number>`).

**Abnahmekriterium:** Formatierungs-/Layout-Nuancen bei Cross-Format-Konvertierung
sind wie im Rest der Spezifikation zu dokumentieren und akzeptabel; **das
vollständige Verschwinden des Feldes, seine Herabstufung zu hartkodiertem Text
oder der Verlust von umgebendem Textinhalt ist es nicht** — weder bei 5.1 noch
bei 5.2.

---

## 6. Testplan-Hinweise (Unit + E2E, Playwright)

1. **Unit-Tests DOCX:** gegebener interner Feld-Node → Writer erzeugt die gewählte
   Form (`w:fldSimple` oder `w:fldChar`-Quadruple) korrekt; umgekehrt: **beide**
   legalen XML-Formen als Eingabe → Reader erzeugt jeweils den erwarteten internen
   Feld-Node, inklusive eines Tests mit Schaltern (`\* MERGEFORMAT` u. Ä.);
   zusätzlich ein expliziter Regressionstest, der belegt, dass der `<w:t>`-Run
   zwischen `separate` und `end` **nicht** mehr als eigenständiger, statischer
   Text gelesen wird (direkte Absicherung von Abschnitt 0, Punkt 4).
2. **Unit-Tests ODT:** gegebener interner Feld-Node → Writer erzeugt
   `<text:page-number>`; umgekehrt: gegebenes ODT-XML mit diesem Element → Reader
   erzeugt den erwarteten internen Feld-Node (direkte Absicherung von Abschnitt 0,
   Punkt 5); zusätzlich ein Test, der bestätigt, dass `<text:page-count>` **nicht**
   als Seitenzahl-Feld interpretiert wird.
3. **E2E-Test (Playwright):** sobald ein Kopf-/Fußzeilen-Editierbereich existiert —
   Cursor in Fußzeile setzen, Toolbar-Button „Seitenzahl einfügen" klicken → im DOM
   erscheint ein sichtbares, optisch als Feld erkennbares Element; Dokument
   exportieren (echter Download), erneut hochladen (echter Re-Upload) → Feld
   weiterhin vorhanden.
4. **Regressionstest-Pflicht:** jeder E2E-Test aus Punkt 3 muss direkt im
   Anschluss eine Tipp- oder Formatierungsaktion ausführen und deren korrektes
   Ergebnis prüfen (Selection-Sync-Regressionsschutz, siehe Grenzfall 5).
5. **Reale Test-Fixtures:** mindestens eine mit echtem Microsoft Word erzeugte
   DOCX-Datei mit PAGE-Feld (nach Möglichkeit in **beiden** Encodings aus
   Abschnitt 3.5/3.6, notfalls zwei getrennte Dateien) sowie eine mit echtem
   LibreOffice Writer erzeugte ODT-Datei mit `<text:page-number>` sind in
   `tests/fixtures/external/docx` bzw. `tests/fixtures/external/odt` aufzunehmen
   — laut aktueller Repo-Durchsicht dort nicht vorhanden. Rein synthetisch
   konstruiertes Test-XML reicht nicht aus, um reale Word-/LibreOffice-Eigenheiten
   (insbesondere die `w:fldChar`-Quadruple-Form) abzudecken.
6. **Blocker-Hinweis:** die E2E-Tests aus Punkt 3/4 können erst grün werden,
   nachdem `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` einen echten,
   fokussierbaren Editier-Einstiegspunkt in der UI bereitstellen (siehe Abschnitt
   0, Punkt 2, und Abschnitt 3.1). Bis dahin sind ausschließlich die Unit-Tests
   aus Punkt 1/2 gegen Reader/Writer möglich und auch schon aussagekräftig genug,
   um den in Abschnitt 0 verifizierten Bestandsfehler zu beheben.
7. Rundreise-Tests (Abschnitt 5) sind sowohl als Unit-Tests gegen Reader/Writer
   **als auch** — sobald 3.1 erfüllt ist — als E2E-Test über echte Bedienung
   (Toolbar-Klick → echter Datei-Download → echter Re-Upload) zu führen; reine
   Unit-Tests mit direkt konstruierten ProseMirror-JSON-Fixtures allein reichen
   nicht aus (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21).

---

## 7. Freigabekriterium für „vorhanden"

Der Backlog-Status von `seitenzahl-einfuegen` darf erst dann als **vorhanden**
(unqualifiziert) gelten, wenn:

- die Abhängigkeit aus Abschnitt 3.1 (bedienbarer Kopf-/Fußzeilenbereich) erfüllt
  ist — d. h. `kopfzeile-bearbeiten` und/oder `fusszeile-bearbeiten` mindestens so
  weit umgesetzt sind, dass ein Feld dort tatsächlich per UI eingefügt werden
  kann,
- alle Bedienelemente aus Abschnitt 1 tatsächlich existieren und funktionieren
  (Toolbar-Button, Feldschattierung, Löschen, Formatierbarkeit),
- alle Testfälle aus Abschnitt 6 automatisiert vorliegen und grün sind,
  einschließlich der beiden expliziten Regressionstests für die in Abschnitt 0
  verifizierten Bestandsfehler (statische Herabstufung bei DOCX,
  vollständiger Verlust bei ODT und bei der `w:fldSimple`-Form),
- die Grenzfälle aus Abschnitt 4 einzeln befundet sind (funktioniert wie
  spezifiziert / bewusst abweichendes, dokumentiertes Verhalten / repariert),
- Abschnitt 5.1 (Baseline-Rundreise) durch die neue Funktion nicht gebrochen
  wurde,
- Abschnitt 5.2 (Feature-Rundreise) für DOCX, ODT und beide
  Cross-Format-Richtungen besteht, inklusive der realen Fixture-Dateien aus
  echtem Word/LibreOffice,
- der Regressionstest aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2
  (Selection-Sync-Bug) explizit mit einer Seitenzahl-Feld-Einfüge-Sequenz
  nachgestellt und grün ist.

Andernfalls ist der Status auf **teilweise** zu setzen und die konkret fehlenden
Teilpunkte sind hier nachzutragen (analog zur Vorgehensweise in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21 und in `seitenumbruch-req.md`
Abschnitt 7).

---

## 8. Non-Goals (bewusst außerhalb dieses Tickets)

- **Seitenzahlformat/Startwert** (arabisch/römisch/Buchstaben, Startzahl
  festlegen) — eigener Backlog-Slug `seitenzahl-format`, Priorität 3. Diese Datei
  verlangt nur ein einfaches, unformatiertes PAGE-Feld mit Standardformat.
- **„Seite X von Y" (Gesamtseitenzahl, `NUMPAGES`/`text:page-count`)** — kein
  eigener Backlog-Slug vorhanden; wird von dieser Spezifikation nicht verlangt,
  muss beim Import aber sauber von der einfachen Seitenzahl unterschieden werden
  (siehe Grenzfall 11), damit ein künftiges, separates Ticket dafür nicht durch
  eine falsche Vorfestlegung in dieser Umsetzung blockiert wird.
- **„Erste Seite anders" / „Gerade/ungerade Seiten anders"** — eigene
  Backlog-Slugs (`erste-seite-anders`, `gerade-ungerade-anders`), Priorität 3/4;
  betreffen unterschiedliche Kopf-/Fußzeilen-Inhalte je nach Seite, nicht das
  Seitenzahl-Feld selbst.
- **Bau von `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` selbst** — diese Datei
  spezifiziert nur den minimalen Vertrag, den jene Funktion erfüllen muss
  (Abschnitt 3.1), baut sie aber nicht; sie sind eigene Backlog-Einträge mit
  eigenem Abnahmekriterium.
