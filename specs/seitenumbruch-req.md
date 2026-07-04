# Anforderungen: „Seitenumbruch einfügen"

Status: Laut Backlog (`specs/FEATURE-BACKLOG.md`, Slug `seitenumbruch`, Priorität 1,
Abschnitt „3.1 Seiten & Umbrüche") als **„fehlt"** markiert. Diese Einstufung gilt
explizit als **nicht vertrauenswürdig** und muss vollständig verifiziert werden — im
konkreten Fall bedeutet das: bestätigen, dass die Funktion tatsächlich komplett fehlt
(nicht nur ungetestet ist), und anschließend die vollständige Umsetzung gegen die
unten stehenden Anforderungen abnehmen.

Geltungsbereich: ausschließlich die Funktion „manuellen Seitenumbruch an der
Cursor-Position erzwingen" im gemeinsamen DOCX/ODT-Editor
(`src/formats/shared/editor/`, `src/formats/shared/schema.ts`) sowie deren
Serialisierung/Deserialisierung in `src/formats/docx/` und `src/formats/odt/`.

Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben
ProseMirror-Editor. Jede Anforderung unten gilt für **beide** Formate, inklusive
Rundreise (Import → Seitenumbruch einfügen → Export → Re-Import → Umbruch und Inhalt
bleiben erhalten).

---

## 0. Befund aus Code-Recherche (Ausgangslage vor Verifikation)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des Codes, nicht nur auf der
Backlog-Beschreibung. Festgestellt wurde:

1. **Kein Datenmodell.** `src/formats/shared/schema.ts` kennt die Node-Typen `doc`,
   `paragraph`, `heading`, `text`, `hard_break`, `image`, `bullet_list`,
   `ordered_list`, `list_item` sowie die Tabellen-Nodes aus `prosemirror-tables`.
   Es existiert **kein** `page_break`-Node und **kein** Absatz-Attribut (z. B.
   `breakBefore`), das einen erzwungenen Seitenwechsel repräsentieren könnte.
2. **Kein Command.** `src/formats/shared/editor/commands.ts` enthält Commands für
   Ausrichtung, Überschriften, Listen, Bild- und Tabelleneinfügung sowie Farb-Marks —
   aber keinen `insertPageBreak`-artigen Befehl.
3. **Kein Toolbar-Button und kein Tastatur-Shortcut.** `Toolbar.tsx` hat keinen
   Eintrag „Seitenumbruch". `WordEditor.tsx` bindet in seiner `keymap({...})` nur
   `Mod-z`, `Mod-y`, `Mod-Shift-z`, `Enter` (Listen-Split), `Mod-b`, `Mod-i`, `Mod-u`
   sowie `baseKeymap` — **kein** `Mod-Enter`/`Ctrl-Enter`, dem in Word und LibreOffice
   Writer standardmäßig zugeordneten Shortcut für „Seitenumbruch einfügen". Der
   Shortcut ist also frei und aktuell durch nichts blockiert.
4. **Nur automatische, rein visuelle Paginierung vorhanden — kein Bezug zu einem
   Nutzerbefehl.** `src/formats/shared/editor/pagination.ts`
   (`computePageBreakIndices`, `createPaginationPlugin`) berechnet Seitenumbrüche
   ausschließlich aus den **gemessenen DOM-Höhen** der Top-Level-Blöcke zur
   Laufzeit und fügt an den berechneten Stellen ein reines Decoration-Widget
   (`page-break-spacer`) ein. Das ist:
   - nicht im Dokumentinhalt verankert (kein Node im ProseMirror-`doc`),
   - nicht persistent (verschwindet und wird bei jeder Größenänderung neu
     berechnet),
   - nicht das Ergebnis einer Nutzeraktion, sondern ausschließlich des verfügbaren
     Platzes,
   - **übersteht keinen Export/Reimport**, da es nie Teil des serialisierten
     Dokuments war.
   Diese automatische Paginierung ist bereits Gegenstand von
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8 und bleibt von dieser Datei unberührt —
   sie ist aber relevant für Abschnitt 3.8 unten (Zusammenspiel).
5. **Kein DOCX-Schreib-/Lesepfad.** `src/formats/docx/writer.ts` erzeugt für
   `hard_break` ausschließlich `<w:r><w:br/></w:r>` (einfacher Zeilenumbruch ohne
   `w:type`-Attribut). Es gibt keine Fallunterscheidung für `w:type="page"`.
   `src/formats/docx/reader.ts` hat keinerlei Behandlung von `w:br` mit
   `w:type="page"` oder von `w:lastRenderedPageBreak` — ein in einer Fremddatei
   enthaltener manueller Seitenumbruch wird nach aktuellem Code entweder komplett
   ignoriert oder (zu verifizieren) fälschlich wie ein normaler Zeilenumbruch
   behandelt.
6. **Kein ODT-Schreib-/Lesepfad.** `src/formats/odt/writer.ts` kennt nur
   `text:line-break` für `hard_break`; es gibt keine Erzeugung von
   `fo:break-before`/`fo:break-after` auf Absatz-Styles. `src/formats/odt/reader.ts`
   liest `style:master-page-name` nur auf Dokumentebene (erste Seite vs.
   Folgeseiten, siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18), wertet aber kein
   `fo:break-before`/`fo:break-after` auf einzelnen Absatz-Styles und kein
   `text:soft-page-break`-Element aus.
7. **Kein Test.** Es gibt keinen einzigen Treffer für „page-break", „pagebreak",
   „seitenumbruch" außerhalb von `pagination.ts`/`pagination.test.ts` (die, wie in
   Punkt 4 erläutert, ein anderes Feature betreffen) im gesamten `src`- und
   `tests`-Verzeichnis.

**Konsequenz — Unterschied zu anderen als „fehlt" markierten Features:** Anders als
z. B. bei „Einfügen" (`einfuegen-req.md`), wo natives Browser-Verhalten zumindest
einen Teilbetrieb ohne eigenen Code ermöglicht, existiert für „Seitenumbruch
einfügen" **kein impliziter Ersatzmechanismus jeglicher Art**. Der Backlog-Status
„fehlt" ist nach dieser Recherche zutreffend. Diese Datei beschreibt folglich den
Soll-Zustand einer **komplett neu zu bauenden Funktion**: Schema-Erweiterung,
Command, Toolbar-Button, Tastatur-Shortcut, DOCX-Writer **und** -Reader, ODT-Writer
**und** -Reader, sowie deren Zusammenspiel mit der bestehenden automatischen
Paginierung.

---

## 1. Menüpunkte / Bedienelemente (Soll-Zustand)

| # | Element | Auslösung | Aktueller Stand (Befund) | Soll |
|---|---|---|---|---|
| 1 | Toolbar-Button „Seitenumbruch einfügen" | Klick auf Toolbar-Icon | **Fehlt komplett** in `Toolbar.tsx` | Muss ergänzt werden, sinnvoll platziert in der „Einfügen"-Gruppe der Toolbar (neben Tabelle/Bild einfügen), mit eindeutigem, eingebettetem SVG-Icon — kein Unicode-/Emoji-Zeichen (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1, dort bereits als Problemquelle für andere Buttons dokumentiert) |
| 2 | Tastenkombination Strg+Enter (Windows/Linux) bzw. Cmd+Enter (Mac) | Tastendruck bei fokussiertem Editor | **Fehlt** (kein `Mod-Enter`-Eintrag in der `keymap({...})` von `WordEditor.tsx`) | Muss ergänzt werden — ist der in Word **und** LibreOffice Writer identische Standard-Shortcut, entspricht also direkter Nutzererwartung |
| 3 | Sichtbare Kennzeichnung eines bereits eingefügten manuellen Seitenumbruchs im Editor | — (reine Darstellung) | **Fehlt** — die einzige vorhandene visuelle Umbruch-Markierung (`page-break-spacer` aus `pagination.ts`) ist rein automatisch berechnet und unterscheidet nicht zwischen „hier bricht die Seite, weil kein Platz mehr war" und „hier bricht die Seite, weil die Nutzerin das erzwungen hat" | Muss visuell **und** funktional unterscheidbar sein (z. B. andere Linienart/Farbe/Label „Seitenumbruch"), damit die Nutzerin einen manuellen Umbruch wiederfindet, gezielt anklicken und wieder entfernen kann |
| 4 | Löschen eines gesetzten Seitenumbruchs | Cursor unmittelbar davor/danach + Entf/Backspace | Nicht anwendbar (Funktion existiert nicht) | Muss wie jedes andere Inline-/Block-Element mit Entf/Backspace entfernbar sein; danach fließt nachfolgender Inhalt wieder normal in die vorherige Seite zurück (vorbehaltlich automatischer Paginierung) |
| 5 | Kontextmenü-Eintrag (Rechtsklick im Editor) | Rechtsklick → Eintrag „Seitenumbruch einfügen" | Fehlt; der Editor hat aktuell ohnehin kein eigenes Kontextmenü | Nice-to-have, **kein Blocker** für die Freigabe dieser Funktion |
| 6 | Eintrag in einer künftigen Menüleiste (falls die App über die reine Toolbar hinaus eine klassische Menüstruktur „Datei/Start/Einfügen/…" bekommt, vgl. `FEATURE-BACKLOG.md` Abschnitt 3.1) | Klick | Nicht anwendbar — App hat aktuell nur eine Toolbar, keine Menüleiste | Falls künftig eine Menüleiste eingeführt wird, dort ebenfalls verfügbar machen; kein Blocker für die aktuelle Umsetzung |

---

## 2. Geltende Randbedingungen aus der Haupt-Spezifikation

Diese Datei ergänzt, ersetzt aber nicht die Anforderungen aus
`FEATURE-SPEC-DOCX-ODT.md`, insbesondere:

- Abschnitt 8 („Seitenlayout & Paginierung"), Testfall 3: „Seitenumbruch manuell
  einfügen → nachfolgender Inhalt beginnt auf neuer Seite, auch nach
  Export/Reimport." — das ist die Kernanforderung, die diese Datei im Detail
  spezifiziert.
- Abschnitt 8, offener Punkt „Kein leerer/übergroßer Zwischenraum bei kurzen
  Dokumenten" — strikt zu unterscheiden von einem **gewollten** zusätzlichen
  Leerraum durch einen manuellen Umbruch (siehe Grenzfall 8 unten); diese
  Unterscheidung muss in der Verifikation explizit gezogen werden, damit ein
  gewollter manueller Umbruch nicht versehentlich als derselbe ungeklärte
  Rendering-Fehler fehlklassifiziert wird.
- Abschnitt 15 („Sonderelemente"): „Manueller Seitenumbruch (siehe Abschnitt 8)."
- Abschnitt 17 (Menü-/Toolbar-Übersicht), Zeile 14: „Seitenumbruch einfügen —
  fehlt — siehe Abschnitt 8."
- Abschnitt 18 (Import-Robustheit): Prinzip „kein stiller Datenverlust bei nicht
  vollständig unterstützten Elementen" gilt sinngemäß auch hier — ein in einer
  Fremddatei enthaltener manueller Seitenumbruch darf beim Import nicht
  ersatzlos verschwinden.
- Abschnitt 19 (Export-Robustheit & Rundreise) und Abschnitt 20.4 (kein stiller
  Fehlschlag) gelten uneingeschränkt.
- Abschnitt 2, Regressionstest für den Selection-Sync-Bug: das Einfügen eines
  Block-Elements an der Cursor-Position ist laut dortiger Beschreibung ein
  Hauptverdachtsfall — ein Seitenumbruch-Einfügen ist strukturell genau das
  (Block-Einfügung), muss also mit derselben Regressionssequenz getestet werden
  (siehe Grenzfall 7 unten).

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Grundfall: Einfügen an der Cursor-Position (keine Selektion)
- Der Seitenumbruch wird **exakt an der Cursor-Position** eingefügt, nicht an
  einer zufälligen Stelle im Dokument.
- Wirkung: Aller Inhalt **vor** der Cursor-Position bleibt auf der aktuellen Seite
  (soweit dort Platz ist), aller Inhalt **ab** der Cursor-Position beginnt auf
  einer neuen Seite — unabhängig davon, ob die aktuelle Seite ohnehin bereits voll
  gewesen wäre.
- Steht der Cursor inmitten eines Absatzes, wird dieser an der Cursor-Position
  geteilt (wie bei Enter); der zweite Teil beginnt auf der neuen Seite. Dieses
  Verhalten muss dem etablierten Word-/LibreOffice-Verhalten entsprechen (Strg+Enter
  teilt den Absatz und platziert den Umbruch zwischen den beiden Teilen) und ist
  explizit zu dokumentieren, falls davon abgewichen wird.
- Nach dem Einfügen steht der Cursor unmittelbar nach dem Umbruch auf der neuen
  Seite, bereit zum Weitertippen.

### 3.2 Einfügen über eine bestehende Selektion
- Eine vorhandene Selektion wird durch den Seitenumbruch **ersetzt** (nicht
  ergänzt) — Standardverhalten wie bei anderen Block-Einfügungen (z. B. Tabelle,
  Bild).

### 3.3 Datenmodell-Repräsentation
- Es muss eine neue Repräsentation im gemeinsamen Schema
  (`src/formats/shared/schema.ts`) ergänzt werden — entweder als eigener
  Block-Node (z. B. `page_break`) oder als Absatz-/Überschrift-Attribut (z. B.
  `breakBefore: boolean` auf `paragraph`/`heading`). Die konkrete Wahl ist Teil der
  Umsetzung, muss aber die Export-Anforderungen aus 3.4–3.7 erfüllen können, ohne
  Informationsverlust zu erzeugen.
- **Zu beachtende Cross-Format-Asymmetrie** (analog zu der in
  `FEATURE-SPEC-DOCX-ODT.md` bereits für Überschriften-Stile dokumentierten
  Differenz zwischen `w:pStyle` und `text:h`): DOCX repräsentiert einen manuellen
  Seitenumbruch als **Inline-Element** innerhalb eines Runs
  (`<w:br w:type="page"/>`), während ODF ihn als **Absatz-Stilattribut**
  (`fo:break-before="page"` auf dem Style des nachfolgenden Absatzes) modelliert.
  - Ein eigener Block-Node bildet das DOCX-Modell direkter ab, erfordert beim
    ODT-Export eine Umrechnung („nächster Absatz erhält `fo:break-before`").
  - Ein Absatz-Attribut bildet das ODT-Modell direkter ab, erfordert beim
    DOCX-Export das Einfügen eines synthetischen `<w:br w:type="page"/>` (z. B. als
    zusätzlicher Run am Anfang des Absatzes oder als eigener vorangestellter
    Absatz).
  Diese Entscheidung ist bewusst zu treffen und in Code-Kommentaren/Doku
  festzuhalten — sie darf nicht zu stillem Datenverlust bei Cross-Format-Export
  führen (siehe Rundreise-Anforderung, Abschnitt 5).

### 3.4 Export nach DOCX
- Muss als `<w:br w:type="page"/>` innerhalb eines `<w:r>` serialisiert werden.
- Muss eindeutig unterscheidbar vom bereits vorhandenen einfachen Zeilenumbruch
  (`<w:r><w:br/></w:r>`, ohne `w:type`, für `hard_break`) bleiben — der
  DOCX-Writer darf die beiden Fälle nicht verwechseln.
- Darf **nicht** als `<w:lastRenderedPageBreak/>` ausgegeben werden — dieses
  Element ist ein von Word selbst erzeugter, rein informativer Marker für einen
  automatischen (nicht manuellen) Umbruch und ist als Ausgabeformat hier falsch.

### 3.5 Import aus DOCX
- Eine Fremddatei (z. B. mit echtem Microsoft Word erzeugt), die
  `<w:br w:type="page"/>` enthält, muss beim Import als manueller Seitenumbruch
  erkannt und in die interne Repräsentation überführt werden — nicht verworfen
  und nicht stillschweigend zu einem einfachen Zeilenumbruch vereinfacht (sonst
  Informationsverlust, Verstoß gegen das Prinzip aus
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18).
- `<w:lastRenderedPageBreak/>` muss, falls in einer Fremddatei vorhanden, beim
  Import **ignoriert** werden (kein manueller Umbruch, kein sichtbares Element,
  keine Fehlinterpretation) — explizit mit einem Test abzusichern, da eine
  Verwechslung hier naheliegt.

### 3.6 Export nach ODT
- Muss als `fo:break-before="page"` im Absatz-Style des unmittelbar
  nachfolgenden Absatzes/der nachfolgenden Überschrift serialisiert werden —
  identisch zu dem Mechanismus, den LibreOffice Writer selbst beim eigenen
  „Seitenumbruch einfügen" (Strg+Enter) erzeugt.
- Steht der Umbruch am Dokumentende (kein nachfolgender Absatz vorhanden), ist
  ein definierter Fallback nötig (z. B. Anhängen eines leeren Absatzes mit
  `fo:break-before="page"`) — darf nicht zu stillem Verlust des Umbruchs führen,
  gilt aber als dokumentationspflichtiger Grenzfall (siehe Abschnitt 4,
  Grenzfall 2).

### 3.7 Import aus ODT
- Ein Absatz mit `fo:break-before="page"` (direkt im Absatz-Style oder über
  einen per Style-Vererbung wirksamen Wert) muss beim Import erkannt und in die
  interne Repräsentation überführt werden.
- `text:soft-page-break` (ein reiner Rendering-Hinweis für die Paginierung, **kein**
  erzwungener Umbruch) darf **nicht** als manueller Seitenumbruch fehlinterpretiert
  werden — klare Abgrenzung erforderlich und explizit zu testen, da beide
  Konzepte in der ODF-Spezifikation leicht verwechselbar benannt sind.

### 3.8 Zusammenspiel mit der automatischen Paginierung (`pagination.ts`)
- Die bestehende automatische Paginierung berechnet Seitenumbrüche rein aus
  gemessenen DOM-Höhen (`computePageBreakIndices`), unabhängig vom
  Dokumentinhalt. Ein manueller Seitenumbruch muss in dieses Bild integriert
  werden: Inhalt nach einem manuellen Umbruch beginnt auf einer neuen Seite,
  **auch wenn** auf der aktuellen Seite noch reichlich Platz wäre — die
  automatische Berechnung darf den manuellen Umbruch nicht wegoptimieren oder
  ignorieren.
- Die visuelle Darstellung eines manuellen Umbruchs sollte nach Möglichkeit
  denselben Decoration-Mechanismus nutzen wie die automatische Paginierung
  (damit beide Seiten optisch als gleichwertige „Seiten" erscheinen), muss
  intern aber unterscheidbar bleiben (siehe Abschnitt 1, Zeile 3).
- Kombination beider Mechanismen auf derselben Seite (z. B. der Inhalt vor dem
  manuellen Umbruch ist selbst schon länger als eine volle Seite) muss korrekt
  zusammenwirken — keine doppelten, fehlenden oder falsch positionierten
  Leerseiten.

### 3.9 Undo/Redo
- Einfügen eines Seitenumbruchs ist **ein einziger Undo-Schritt**.
- Löschen eines Seitenumbruchs (Backspace/Entf direkt davor/danach) ist ebenfalls
  ein einziger Undo-Schritt und stellt den exakten Zustand vor dem Löschen wieder
  her.
- Redo stellt den jeweils rückgängig gemachten Zustand identisch wieder her.

### 3.10 Rückmeldeverhalten (kein stiller Fehlschlag)
- Kann die Aktion aus irgendeinem Grund nicht ausgeführt werden (z. B. Cursor in
  einem Kontext, der einen Block-Einschub an dieser Stelle nicht sinnvoll erlaubt),
  muss entweder eine sichtbare Rückmeldung erfolgen oder ein sinnvoll definiertes
  Fallback-Verhalten greifen (siehe Grenzfälle 4 und 6) — niemals ein Tastendruck/
  Klick, der ergebnislos bleibt.

---

## 4. Grenzfälle (müssen explizit geprüft werden)

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 1 | Seitenumbruch am Dokumentanfang (Cursor vor dem ersten Zeichen) | Zu klären und zu dokumentieren: entweder entsteht eine erste leere Seite gefolgt vom Inhalt, oder die Aktion ist an dieser Stelle ein bewusster No-Op, da es keine vorherige Seite gibt, die „beendet" werden müsste. Kein Crash, kein stiller Datenverlust. |
| 2 | Seitenumbruch am Dokumentende (Cursor nach dem letzten Zeichen) | Erzeugt eine neue, leere Folgeseite; bleibt bei Export/Reimport erhalten (Word/LibreOffice zeigen hier ebenfalls eine tatsächliche leere Seite). |
| 3 | Zwei aufeinanderfolgende Seitenumbrüche ohne Inhalt dazwischen | Erzeugt eine vollständig leere Seite dazwischen; darf **nicht** automatisch zu einem einzigen Umbruch zusammengefasst werden (Word-/LibreOffice-Referenzverhalten). |
| 4 | Seitenumbruch mit Cursor innerhalb einer Tabellenzelle | In Word führt Strg+Enter innerhalb einer Zelle zu einem Zeilenumbruch statt zu einem echten Seitenumbruch. Zu entscheiden und explizit zu dokumentieren, ob diese App das identisch handhabt oder den Umbruch anders behandelt/verweigert — darf in keinem Fall die Tabellenstruktur beschädigen oder zum Absturz führen. |
| 5 | Seitenumbruch mit Cursor in einem Listenpunkt (`list_item`) | Nachfolgender Inhalt muss weiterhin als Teil derselben Liste mit fortlaufender Nummerierung erkennbar bleiben, auch wenn er auf der neuen Seite beginnt. |
| 6 | Seitenumbruch mit Cursor mitten in einer Überschrift (`heading`) | Überschrift wird wie ein Absatz geteilt (siehe 3.1); zu prüfen und zu dokumentieren, ob beide Fragmente denselben Überschriften-Level behalten oder das zweite Fragment zu einem normalen Absatz wird — muss konsistent mit dem generellen „Enter in einer Überschrift"-Verhalten sein. |
| 7 | Seitenumbruch einfügen, danach direkt weitertippen bzw. Selektion neu setzen und tippen (Selection-Sync-Regressionsfall aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) | Pflicht-Testsequenz: Einfügen des Umbruchs darf die interne Selektion nicht in einen inkonsistenten Zustand versetzen — nachfolgendes Tippen darf nichts Falsches löschen/ersetzen. |
| 8 | Kurzes Dokument (z. B. zwei Sätze) mit einem einzigen manuellen Seitenumbruch dazwischen | Ergebnis ist bewusst ein zweiseitiges Dokument trotz winzigem Textumfang — strikt zu unterscheiden vom in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8 als „offen/ungeklärt" markierten Rendering-Verdacht (dort geht es um **ungewollten** Leerraum ohne jeden manuellen Umbruch). |
| 9 | Import einer Fremddatei mit mehreren manuellen Seitenumbrüchen (z. B. ein Umbruch pro Kapitel) | Alle Umbrüche bleiben einzeln und an der richtigen Stelle erhalten, nicht nur der erste oder letzte. |
| 10 | Cross-Format-Rundreise DOCX → ODT → DOCX mit einem Umbruch am Dokumentende (siehe Grenzfall 2) | Zu prüfen, ob der ODT-seitige Fallback (Abschnitt 3.6) beim Zurückkonvertieren nach DOCX wieder exakt `<w:br w:type="page"/>` ergibt oder ob ein zusätzlicher leerer Absatz übrig bleibt (akzeptabel, aber dokumentationspflichtig, kein Textverlust). |
| 11 | Löschen des Absatzes, der unmittelbar auf einen (ODT-seitig als Absatz-Attribut realisierten) Umbruch folgt | Das `fo:break-before`-Attribut darf nicht spurlos mit dem gesamten Absatz verschwinden, ohne dass bewusst entschieden wurde, ob der Umbruch dabei erhalten bleiben soll (an den nun folgenden Absatz wandert) oder mitgelöscht wird — Verhalten ist festzulegen und zu testen. |
| 12 | Seitenumbruch unmittelbar vor/nach einem Bild oder einer Tabelle (Cursor direkt davor/dahinter, kein Text dazwischen) | Bild/Tabelle bleibt vollständig erhalten und landet eindeutig auf der richtigen Seite (davor oder danach, je nach Cursor-Position), keine Verschiebung/Duplizierung. |
| 13 | Rückgängig machen (Strg+Z) direkt nach dem Einfügen des Umbruchs | Umbruch verschwindet vollständig in einem Schritt, umgebender Text bleibt unverändert (siehe 3.9). |

---

## 5. Rundreise-Anforderung

Zwei getrennte, beide verpflichtende Rundreise-Prüfungen — analog zur Methodik in
`einfuegen-req.md` Abschnitt 5 und `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19.

### 5.1 Baseline-Rundreise (Regressionsschutz — darf durch die neue Funktion nicht kaputtgehen)
1. Reale DOCX-Datei **ohne** jeden manuellen Seitenumbruch unverändert hochladen
   (kein Klick, keine Eingabe) → sofort exportieren → erneut importieren → Inhalt
   entspricht inhaltlich dem Original, insbesondere entsteht **kein**
   fälschlicherweise erkannter Seitenumbruch (z. B. durch versehentliche
   Fehlinterpretation von `<w:lastRenderedPageBreak/>`, siehe Grenzfall/Abschnitt
   3.5).
2. Dasselbe mit einer realen ODT-Datei — insbesondere darf ein vorhandenes
   `text:soft-page-break` nicht fälschlich als manueller Umbruch übernommen
   werden (Abschnitt 3.7).
3. Beide Prüfungen müssen weiterhin grün sein, nachdem Schema, Writer und Reader
   um die neue Funktion erweitert wurden (kein neuer Node-Typ/kein neues Attribut
   darf beim reinen Reimport unbeteiligter Dateien ungewollt auftauchen).

### 5.2 Feature-Rundreise (Seitenumbruch selbst)
Für jede der folgenden Situationen: Seitenumbruch über Toolbar/Shortcut einfügen →
Dokument als DOCX exportieren → reimportieren → Umbruch **und** Inhalt bleiben
erhalten; **und** identisch als ODT; **und** zusätzlich Cross-Format (in ein
ursprünglich als DOCX erstelltes/importiertes Dokument einfügen und als ODT
exportieren, sowie umgekehrt):

1. Neues Dokument, zwei Absätze, dazwischen ein manueller Seitenumbruch → Umbruch
   bleibt exakt an derselben Stelle, Inhalt davor/danach unverändert, Umbruch
   bleibt als „manueller Seitenumbruch" erkennbar (nicht als Leerzeile/-absatz
   degradiert).
2. Dasselbe als ODT-Ursprungsdokument.
3. Cross-Format DOCX → ODT → DOCX: Umbruch bleibt über beide Konvertierungen
   hinweg als `<w:br w:type="page"/>` bzw. äquivalente Zwischenrepräsentation
   erhalten (keine kumulative Verschlechterung, vgl. Grenzfall 10).
4. Cross-Format ODT → DOCX → ODT (umgekehrte Richtung).
5. Dokument mit mehreren Umbrüchen (z. B. drei Kapitel, je durch einen Umbruch
   getrennt) → alle bleiben nach Rundreise einzeln und an der richtigen Stelle
   erhalten (vgl. Grenzfall 9).
6. Umbruch in Kombination mit anderen Strukturen im selben Dokument (Liste,
   Tabelle, Bild, Überschrift unmittelbar vor/nach dem Umbruch) → Rundreise
   erhält sowohl den Umbruch als auch die übrigen Strukturen unverändert
   (kumulativer Verlust-Test, analog `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19,
   Testfall 3).
7. Import einer **fremden, nicht mit dieser App erzeugten** DOCX-Datei mit
   manuellem Seitenumbruch (mit echtem Microsoft Word erzeugt) → Umbruch wird
   erkannt (Abschnitt 3.5), unverändert exportiert, erneut reimportiert →
   weiterhin vorhanden.
8. Dasselbe mit einer mit echtem LibreOffice Writer erzeugten ODT-Datei
   (`fo:break-before="page"`).

**Abnahmekriterium:** Formatierungs-/Layout-Nuancen bei Cross-Format-Konvertierung
(z. B. ob eine leere Ausgleichsseite am Dokumentende entsteht, siehe Grenzfall 2/10)
sind wie im Rest der Spezifikation zu dokumentieren und akzeptabel;
**das vollständige Verschwinden eines Umbruchs oder von Textinhalt ist es nicht** —
weder bei 5.1 noch bei 5.2.

---

## 6. Testplan-Hinweise (Unit + E2E, Playwright)

1. **Unit-Tests DOCX:** gegebener interner Umbruch-Knoten/-Attribut →
   Writer erzeugt exakt `<w:br w:type="page"/>` (nicht `<w:br/>` ohne Attribut,
   nicht `<w:lastRenderedPageBreak/>`); umgekehrt: gegebenes XML mit
   `<w:br w:type="page"/>` → Reader erzeugt den erwarteten internen Knoten;
   zusätzlich ein Test, der bestätigt, dass `<w:lastRenderedPageBreak/>` beim
   Import **ignoriert** wird (Abschnitt 3.5).
2. **Unit-Tests ODT:** gegebener interner Umbruch → Writer erzeugt
   `fo:break-before="page"` im Style des nachfolgenden Absatzes; umgekehrt:
   gegebenes ODT-XML mit diesem Attribut → Reader erzeugt den erwarteten internen
   Zustand; zusätzlich ein Test, der bestätigt, dass ein reines
   `text:soft-page-break` **nicht** als manueller Umbruch interpretiert wird
   (Abschnitt 3.7).
3. **E2E-Test (Playwright):** Cursor im Editor setzen (`page.locator('.ProseMirror')`),
   Toolbar-Button „Seitenumbruch einfügen" klicken bzw. `ControlOrMeta+Enter`
   drücken → prüfen, dass eine sichtbare zweite Seite/ein Spacer-Element im DOM
   erscheint und nachfolgend eingegebener Text sichtbar auf der neuen Seite
   (unterhalb des Spacers) landet.
4. **Regressionstest-Pflicht:** jeder E2E-Test aus Punkt 3 muss direkt im
   Anschluss eine Tipp- oder Formatierungsaktion ausführen und deren korrektes
   Ergebnis prüfen (Selection-Sync-Regressionsschutz, siehe Grenzfall 7 und
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) — nicht nur den unmittelbaren Zustand
   nach dem Einfügen selbst.
5. **Reale Test-Fixtures:** mindestens eine mit echtem Microsoft Word erzeugte
   DOCX-Datei und eine mit echtem LibreOffice Writer erzeugte ODT-Datei, die
   jeweils einen manuellen Seitenumbruch enthalten, sind ins
   Test-Fixture-Verzeichnis aufzunehmen (laut aktueller Repo-Durchsicht nicht
   vorhanden) — rein synthetisch konstruiertes Test-XML reicht nicht aus, um
   reale Word-/LibreOffice-Eigenheiten abzudecken (analoges Prinzip wie in
   `einfuegen-req.md` Grenzfall 14 und `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18).
6. **Visuelle Unterscheidbarkeit:** ein Screenshot-Vergleich oder mindestens eine
   DOM-Attribut-Assertion muss zeigen, dass ein manueller Umbruch sich von einem
   automatisch berechneten Umbruch unterscheiden lässt (Abschnitt 1, Zeile 3;
   Abschnitt 3.8).
7. Rundreise-Tests (Abschnitt 5) sind sowohl als Unit-Tests gegen Reader/Writer
   **als auch** als E2E-Test über echte Bedienung (Toolbar-Klick/Shortcut →
   echter Datei-Download → echter Re-Upload) zu führen — reine Unit-Tests mit
   direkt konstruierten ProseMirror-JSON-Fixtures allein reichen nicht aus (vgl.
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21).

---

## 7. Freigabekriterium für „vorhanden"

Der Backlog-Status von `seitenumbruch` darf erst dann als **vorhanden**
(unqualifiziert) gelten, wenn:

- alle Bedienelemente aus Abschnitt 1 tatsächlich existieren und funktionieren
  (Toolbar-Button, Tastenkombination, sichtbare Kennzeichnung, Löschen),
- alle Testfälle aus Abschnitt 6 automatisiert vorliegen und grün sind,
- die Grenzfälle aus Abschnitt 4 einzeln befundet sind (funktioniert wie
  spezifiziert / bewusst abweichendes, dokumentiertes Verhalten / repariert),
- Abschnitt 5.1 (Baseline-Rundreise) durch die neue Funktion nicht gebrochen
  wurde,
- Abschnitt 5.2 (Feature-Rundreise) für DOCX, ODT und beide
  Cross-Format-Richtungen besteht, inklusive der beiden realen Fixture-Dateien
  aus echtem Word/LibreOffice,
- der Regressionstest aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2
  (Selection-Sync-Bug) explizit mit einer Seitenumbruch-Einfüge-Sequenz
  nachgestellt und grün ist,
- das Zusammenspiel mit der automatischen Paginierung (Abschnitt 3.8) geprüft
  und dokumentiert ist.

Andernfalls ist der Status auf **teilweise** zu setzen und die konkret fehlenden
Teilpunkte sind hier nachzutragen (analog zur Vorgehensweise in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21 und in `einfuegen-req.md` Abschnitt 7).
