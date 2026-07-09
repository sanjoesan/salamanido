# Anforderungen: „Seitenumbruch einfügen"

Status: Im Backlog (`specs/FEATURE-BACKLOG.md`, Abschnitt „3.1 Seiten & Umbrüche",
Slug `seitenumbruch`, Priorität 1, Zeile: „Seitenumbruch einfügen — Erzwingt manuell
den Beginn einer neuen Seite. — fehlt") als **„fehlt"** markiert. Diese Einstufung galt
laut Auftrag als **nicht vertrauenswürdig** und wurde für diese Datei durch direkte
Durchsicht des tatsächlichen Codes (Stand 2026-07-04) **verifiziert**: Die Funktion
fehlt vollständig (nicht nur „ungetestet") — siehe Abschnitt 0. Diese Datei beschreibt
folglich den Soll-Zustand einer **komplett neu zu bauenden Funktion** und dient
zugleich als Abnahme-Checkliste.

**Zweite, unabhängige Verifikationsrunde (Stand 2026-07-05):** Alle Befunde aus
Abschnitt 0 wurden für diese Fassung ein zweites Mal, unabhängig von der ersten
Durchsicht, gegen den aktuellen Code nachvollzogen — nicht nur die qualitativen
Aussagen (fehlendes Schema-Element, fehlender Command, freier `Mod-Enter`-Shortcut,
Writer-/Reader-Verhalten), sondern auch die **exakten** in 0.10 genannten Byte-Zählungen
je Fixture-Datei (`grep -o … | wc -l` direkt gegen die entpackten `document.xml`/
`content.xml`-Inhalte). Alle Zahlen stimmten **ohne Abweichung**; keine der in dieser
Datei getroffenen Aussagen musste korrigiert werden. Diese Datei gilt damit als
zweifach verifiziert.

Geltungsbereich: ausschließlich die Funktion „einen manuellen, erzwungenen
Seitenumbruch an der Cursor-Position setzen" im gemeinsamen DOCX/ODT-Editor
(`src/formats/shared/editor/`, `src/formats/shared/schema.ts`) sowie deren
Serialisierung/Deserialisierung in `src/formats/docx/` und `src/formats/odt/`.

**Abgrenzung zu benachbarten Backlog-Einträgen** (nicht Teil dieser Datei, jeweils
eigenständig zu spezifizieren):
- `leere-seite-einfuegen` („Leere Seite einfügen", Prio 3): schiebt eine **ganze
  leere Seite** ein — konzeptionell zwei Seitenumbrüche um einen leeren Bereich, nicht
  identisch mit einem einzelnen erzwungenen Umbruch.
- `abschnittsumbruch` („Abschnittsumbruch nächste Seite/fortlaufend", Prio 3): beginnt
  einen **neuen Abschnitt mit eigenem Seitenlayout** (`w:sectPr` / ODF-Masterpage) —
  ein Seitenumbruch ohne Layout-Wechsel ist davon strikt zu trennen und **darf beim
  Export nicht** als Abschnittsumbruch geschrieben werden.
- `spaltenumbruch` („Spaltenumbruch", Prio 4, ebenfalls in Backlog-Abschnitt „3.1 Seiten
  & Umbrüche"): erzwingt den Sprung in die **nächste Spalte** bei mehrspaltigem Layout —
  ein gänzlich anderer Mechanismus (`w:br w:type="column"` bzw. ODF-Spaltenumbruch) und
  ohnehin nur relevant, sobald mehrspaltiges Layout überhaupt existiert (aktuell nicht
  der Fall). Nicht zu verwechseln, nicht Teil dieser Datei.
- `deckblatt-einfuegen` („Deckblatt einfügen", Prio 4, dieselbe Backlog-Gruppe): fügt
  eine **vorgefertigte Titelseite** samt eigener Formatierung ein — inhaltlich näher an
  einer Dokumentvorlage als an einem reinen Umbruch; eigenständig zu spezifizieren,
  falls priorisiert.

Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben
ProseMirror-Editor. Jede Anforderung unten gilt für **beide** Formate, inklusive
Rundreise (Import → Seitenumbruch einfügen → Export → Re-Import → Umbruch **und**
Inhalt bleiben erhalten).

---

## 0. Befund aus direkter Code-Verifikation (Stand 2026-07-04)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des **aktuellen** Codes, nicht
auf der Backlog-Beschreibung und nicht auf einem älteren Schnappschuss. Alle Aussagen
unten wurden am 2026-07-04 gegen den echten Dateiinhalt geprüft (Zeilenangaben sind mit
diesem Stand-Datum zu verstehen; load-bearend ist jeweils das beschriebene **Verhalten**,
nicht die exakte Zeilennummer). Mehrere Annahmen eines früheren Entwurfs dieser Datei
wurden dabei **korrigiert** — sie sind unten ausdrücklich als solche markiert.

### 0.1 Kein Datenmodell
`src/formats/shared/schema.ts` kennt `doc`, `paragraph` (Z. 16–24), `heading`
(Z. 26–38), `text` (Z. 40), `hard_break` (Z. 42–56), `image` (Z. 58–85),
`unsupported_block` (Z. 92–113), `bullet_list`/`ordered_list`/`list_item` (Z. 115–152)
sowie die Tabellen-Nodes aus `tableNodes(...)` (Z. 154). `paragraph` trägt als Attribut
**nur** `align`, `heading` **nur** `level` + `align`. Es existiert **kein**
`page_break`-Node und **kein** Attribut (z. B. `breakBefore`), das einen erzwungenen
Seitenwechsel repräsentieren könnte.

### 0.2 Kein Command
`src/formats/shared/editor/commands.ts` enthält Commands für Ausrichtung, Überschriften,
Listen, Bild-/Tabelleneinfügung, Farb-Marks, Ausschneiden — aber **keinen**
`insertPageBreak`-artigen Befehl. (`grep -rniE "page_break|insertPageBreak|breakBefore"
src` liefert **null** Treffer im gesamten Quellcode.)

### 0.3 Kein Toolbar-Button, kein belegter Shortcut — *(gegenüber früherem Entwurf aktualisiert)*
`Toolbar.tsx` hat keinen Eintrag „Seitenumbruch". Die `keymap({...})` in
`WordEditor.tsx` (Z. 77–99) bindet zum aktuellen Stand:
`Mod-z`, `Mod-y`, `Mod-Shift-z`, `Enter` (`splitListItem`),
**`Shift-Enter` (`insertHardBreak` — der einfache Zeilenumbruch)**, `Mod-b`, `Mod-i`,
`Mod-u`, **`Shift-Delete` (`cutSelection`)**; `Mod-c`/`Mod-x`/`Mod-v` sind bewusst
**nicht** gebunden; danach `keymap(baseKeymap)` (Z. 100). `Backspace`/`Delete` sind
**nicht** eigens gebunden und laufen in `baseKeymap`.
- **`Mod-Enter` (Windows/Linux Strg+Enter, Mac Cmd+Enter) ist frei** und durch nichts
  blockiert — genau der in Word **und** LibreOffice Writer identische Standard-Shortcut
  für „Seitenumbruch einfügen". Er ist re-verifiziert gegen den aktuellen Code (nicht
  gegen eine ältere Fassung) und steht zur Belegung bereit.
- **Wichtige Abgrenzung:** `Shift-Enter` ist bereits mit dem **Zeilenumbruch**
  (`hard_break`) belegt. Seitenumbruch (Strg+Enter) und Zeilenumbruch (Umschalt+Enter)
  müssen zwei klar verschiedene Aktionen bleiben und dürfen weder in der Bedienung noch
  in der Serialisierung verwechselt werden (siehe 3.11).

### 0.4 Nur automatische, rein visuelle Paginierung — ohne Bezug zu einem Nutzerbefehl
`src/formats/shared/editor/pagination.ts` berechnet Seitenumbrüche ausschließlich aus den
**gemessenen DOM-Höhen** der Top-Level-Blöcke: `computePageBreakIndices(heights,
pageContentHeight)` (Z. 12) nimmt **nur zwei** Argumente, es gibt keinen Parameter für
erzwungene Umbrüche. An den berechneten Stellen wird ein reines Decoration-Widget
(`className = 'page-break-spacer'`, Z. 50) eingefügt. Dieses Widget ist:
- nicht im Dokumentinhalt verankert (kein Node im ProseMirror-`doc`),
- nicht persistent (wird bei jeder Größenänderung neu berechnet),
- nicht das Ergebnis einer Nutzeraktion, sondern ausschließlich des verfügbaren Platzes,
- **übersteht keinen Export/Reimport**, da es nie Teil des serialisierten Dokuments war.

Diese automatische Paginierung ist Gegenstand von `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8
und bleibt von dieser Datei inhaltlich unberührt — sie ist aber für das Zusammenspiel in
Abschnitt 3.8 unten relevant.

### 0.5 DOCX-Writer: kein Seitenumbruch-Pfad
`src/formats/docx/writer.ts` erzeugt für `hard_break` ausschließlich
`<w:r><w:br/></w:r>` (einfacher Zeilenumbruch ohne `w:type`, Z. 60–62). Es gibt keinen
Pfad, der `<w:br w:type="page"/>` schreiben würde.

### 0.6 DOCX-Reader: aktive Fehlinterpretation, nicht bloßes Ignorieren — *(verifiziert und gegenüber früherem Entwurf verschärft)*
Ein früherer Entwurf formulierte vorsichtig „wird entweder ignoriert oder … fälschlich
wie ein Zeilenumbruch behandelt". Der **zweite** Fall ist jetzt verifiziert:
`src/formats/docx/reader.ts` liest **jedes** `<w:br>`-Element — mit **oder ohne**
`w:type="page"` — identisch als `{ kind: 'break' }` (Z. 177–178) und mappt es
anschließend zu `{ type: 'hard_break' }` (Z. 284–285). Ein aus einer echten Word-Datei
importierter manueller Seitenumbruch verschwindet damit nicht nur als *Konzept*, er wird
**stillschweigend zu einem einfachen Zeilenumbruch degradiert** — genau der in 3.5 unten
ausdrücklich verbotene Fall und ein Verstoß gegen `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18
(kein stiller Datenverlust).
`<w:lastRenderedPageBreak/>` dagegen wird **korrekt ignoriert** — allerdings nur, weil die
`if/else if`-Kette keinen Fall dafür hat und der Knoten stillschweigend durchfällt. Das
ist **richtig durch Zufall, nicht durch Absicht** und muss in einen expliziten,
kommentierten, getesteten Fall überführt werden (siehe 3.5, Abschnitt 6), damit es bei
einer künftigen Refaktorierung nicht unbeabsichtigt kaputtgeht.

### 0.7 ODT-Writer: kein Seitenumbruch-Pfad
`src/formats/odt/writer.ts` erzeugt für `hard_break` nur `<text:line-break/>` (Z. 74). Es
gibt nirgends eine Erzeugung von `fo:break-before`/`fo:break-after` auf Absatz-Styles.

### 0.8 ODT-Reader: liest weder `fo:break-before` noch `fo:break-after` — *(verifiziert und gegenüber früherem Entwurf ergänzt)*
`parseAutomaticStyles` (`src/formats/odt/reader.ts` Z. 37 ff.) liest aus den
`style:paragraph-properties` **ausschließlich** `fo:text-align` (Z. 65). **Weder**
`fo:break-before` **noch** `fo:break-after` werden ausgewertet — ein auf einem
Absatz-Style hinterlegter manueller Seitenumbruch geht beim Import also **still verloren**.
`text:soft-page-break` wird bereits heute bewusst verworfen (dokumentierter Kommentar
Z. 291–296): ein reiner Rendering-Hinweis, korrekterweise **kein** manueller Umbruch —
dieses Verhalten muss erhalten bleiben (siehe 3.7).

### 0.9 Kein Test
Kein einziger Treffer für „page-break", „pagebreak", „seitenumbruch", „breakBefore"
außerhalb von `pagination.ts`/`pagination.test.ts` (die, wie in 0.4 erläutert, ein
anderes Feature betreffen) im gesamten `src`- und `tests`-Verzeichnis.

### 0.10 Reale Test-Fixtures sind **bereits vorhanden** — *(Korrektur eines früheren Entwurfs)*
Ein früherer Entwurf dieser Datei behauptete, reale Word-/LibreOffice-Dateien mit
manuellem Seitenumbruch seien „laut Repo-Durchsicht nicht vorhanden" und müssten erst
angelegt werden. Das ist **falsch**. Unter `tests/fixtures/external/{docx,odt}/` liegen
bereits mehrere geeignete reale Dateien; ihr Inhalt wurde für diese Datei per Entpacken
(`unzip -p … | grep`) direkt gegen die tatsächlichen ZIP-Inhalte **gezählt** (nicht aus
Dateinamen erraten):

| Datei | Verifizierter Inhalt | Rolle im Testplan |
|---|---|---|
| `docx/saut_page.docx` | **2×** `<w:br w:type="page"/>` + **1×** einfaches `<w:br/>` (Fließtext), **0×** `lastRenderedPageBreak` | Positiv **und** Negativ in einer Datei: 2 echte Seitenumbrüche erkennen, 1 Zeilenumbruch **nicht** befördern |
| `docx/60329.docx` | **3×** `<w:lastRenderedPageBreak/>`, **85×** einfaches `<w:br/>`, **0×** `w:br[type=page]` | „müssen ignoriert werden" (3× lastRendered) **und** „85 Zeilenumbrüche müssen Zeilenumbrüche bleiben" (Regressionsschutz für die Reader-Änderung aus 3.5) |
| `odt/pagebreaks.odt` | **2×** `fo:break-before="page"`, **1×** `fo:break-after="page"`, **1×** `soft-page-break` | Alle drei ODF-Kodierungen in einer Datei — belegt, dass `fo:break-after` real vorkommt (siehe 3.7) |
| `odt/AB_pageBreakBefore.odt` | **1×** `fo:break-before="page"` (+ 1× beiläufiger `soft-page-break`) | Sauberer `fo:break-before`-Erkennungstest |
| `odt/pageBreakProblem.odt` | gleiche Struktur wie `AB_pageBreakBefore.odt` | zweiter `fo:break-before`-Beleg |
| `odt/no_pagebreak.odt` **und** `odt/35585_-_no_pagebreak.odt` | **1×** `fo:break-before="page"` **innerhalb einer Tabellenzelle** (referenziert aus `<table:table-cell>`) | Reale Evidenz für Grenzfall 4: LibreOffice rendert das selbst **nicht** als Seitenumbruch (Dateiname verweist auf LO-Bug 35585) |
| `odt/text-extract.odt` | **2×** `soft-page-break`, **0×** `fo:break-before`/`fo:break-after` | Sauberer „darf nicht als manueller Umbruch fehlinterpretiert werden"-Test (3.7) |

**Anforderung Abschnitt 6/5 ist damit ohne neue Dateien erfüllbar** — die realen Fixtures
sind vorhanden und im Testplan (Abschnitt 6) und in der Rundreise (Abschnitt 5) namentlich
als Pflicht zu verwenden.

### 0.11 Konsequenz
Anders als bei manchen anderen „fehlt"-Features (wo natives Browser-Verhalten einen
Teilbetrieb ohne eigenen Code ermöglicht) existiert für „Seitenumbruch einfügen"
**kein impliziter Ersatzmechanismus jeglicher Art**, und der einzige vorhandene
Umbruch-Mechanismus (0.4) ist rein visuell und nicht persistent. Der Backlog-Status
„fehlt" ist nach dieser Recherche **zutreffend**. Neu zu bauen sind: Schema-Erweiterung,
Command, Toolbar-Button, Tastatur-Shortcut, DOCX-Writer **und** -Reader (Letzterer
inkl. Behebung der aktiven Degradierung aus 0.6), ODT-Writer **und** -Reader (Letzterer
inkl. `fo:break-before` **und** `fo:break-after`, 0.8), sowie das Zusammenspiel mit der
bestehenden automatischen Paginierung.

---

## 1. Menüpunkte / Bedienelemente (Soll-Zustand)

| # | Element | Auslösung | Aktueller Stand (Befund) | Soll |
|---|---|---|---|---|
| 1 | Toolbar-Button „Seitenumbruch einfügen" | Klick | **Fehlt komplett** in `Toolbar.tsx` | Ergänzen, sinnvoll platziert in der „Einfügen"-Gruppe (neben Tabelle/Bild einfügen). **Eindeutiges, eingebettetes SVG-Icon — kein Unicode-/Emoji-Zeichen** (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1). **Zugänglicher Name** („Seitenumbruch einfügen") per `title` **und** `aria-label` — identisch nutzbar für Screenreader **und** für die E2E-Adressierung (`getByRole('button', { name: … })`). |
| 2 | Tastenkombination **Strg+Enter** (Windows/Linux) bzw. **Cmd+Enter** (Mac) | Tastendruck bei fokussiertem Editor | **Fehlt** (`Mod-Enter` in `WordEditor.tsx` frei, siehe 0.3) | Ergänzen als `Mod-Enter`. Ist der in Word **und** LibreOffice identische Standard-Shortcut. **Nicht** mit `Shift-Enter` (bereits Zeilenumbruch) verwechseln. |
| 3 | Sichtbare Kennzeichnung eines gesetzten manuellen Umbruchs im Editor | — (reine Darstellung) | **Fehlt** — die einzige vorhandene Markierung (`page-break-spacer`, 0.4) ist rein automatisch berechnet und unterscheidet **nicht** zwischen „Seite bricht mangels Platz" und „Nutzerin hat den Umbruch erzwungen" | Ein manueller Umbruch muss **visuell und per DOM-Attribut** von einem automatischen unterscheidbar sein (z. B. andere Linie/Farbe/Label „Seitenumbruch"), damit die Nutzerin ihn wiederfindet, gezielt anklicken und entfernen kann. |
| 4 | Löschen eines gesetzten Seitenumbruchs | Cursor unmittelbar davor/danach + Entf/Backspace | Nicht anwendbar (Funktion existiert nicht) | Wie jedes andere Element mit Entf/Backspace entfernbar; danach fließt nachfolgender Inhalt wieder normal zurück (vorbehaltlich automatischer Paginierung). Als **ein** Undo-Schritt (3.9). |
| 5 | Kontextmenü-Eintrag (Rechtsklick) | Rechtsklick → „Seitenumbruch einfügen" | Fehlt; der Editor hat aktuell ohnehin kein eigenes Kontextmenü | Nice-to-have, **kein Blocker**. |
| 6 | Eintrag in einer künftigen Menüleiste | Klick | Nicht anwendbar — App hat aktuell nur eine Toolbar | Falls künftig eine Menüleiste eingeführt wird, dort ebenfalls anbieten; **kein Blocker**. |

---

## 2. Geltende Randbedingungen aus der Haupt-Spezifikation

Diese Datei ergänzt, ersetzt aber nicht `FEATURE-SPEC-DOCX-ODT.md`, insbesondere:

- **Abschnitt 8** („Seitenlayout & Paginierung"), Testfall 3: „Seitenumbruch manuell
  einfügen → nachfolgender Inhalt beginnt auf neuer Seite, auch nach Export/Reimport."
  — die Kernanforderung, die diese Datei im Detail spezifiziert.
- **Abschnitt 8**, offener Punkt „kein leerer/übergroßer Zwischenraum bei kurzen
  Dokumenten" — strikt zu unterscheiden von einem **gewollten** Leerraum durch einen
  manuellen Umbruch (Grenzfall 8). Diese Unterscheidung ist in der Verifikation explizit
  zu ziehen, damit ein gewollter Umbruch nicht als jener ungeklärte Rendering-Verdacht
  fehlklassifiziert wird.
- **Abschnitt 15** („Sonderelemente"): Manueller Seitenumbruch **vs.** Zeilenumbruch
  (`hard_break`) — beide müssen bei Rundreise unterscheidbar bleiben (siehe 3.11).
- **Abschnitt 17**, Zeile 14: „Seitenumbruch einfügen — fehlt — siehe Abschnitt 8."
- **Abschnitt 18** (Import-Robustheit): „kein stiller Datenverlust bei nicht vollständig
  unterstützten Elementen" gilt hier unmittelbar — der in 0.6/0.8 verifizierte stille
  Verlust ist zu beheben.
- **Abschnitt 19** (Export-Robustheit & Rundreise) und **Abschnitt 20.4** (kein stiller
  Fehlschlag) gelten uneingeschränkt.
- **Abschnitt 2** (Selection-Sync-Bug): Das Einfügen eines Block-Elements an der
  Cursor-Position ist dort als Hauptverdachtsfall genannt; das Einfügen eines
  Seitenumbruchs ist strukturell genau das und muss mit derselben Regressionssequenz
  getestet werden (Grenzfall 7).

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Grundfall: Einfügen an der Cursor-Position (keine Selektion)
- Der Umbruch wird **exakt an der Cursor-Position** eingefügt, nie an zufälliger Stelle.
- Wirkung: Inhalt **vor** der Cursor-Position bleibt auf der aktuellen Seite (soweit
  Platz), Inhalt **ab** der Cursor-Position beginnt auf einer neuen Seite — **unabhängig**
  davon, ob die aktuelle Seite ohnehin schon voll gewesen wäre.
- Steht der Cursor mitten in einem Absatz, wird dieser an der Cursor-Position geteilt
  (wie bei Enter); der zweite Teil beginnt auf der neuen Seite. Verhalten muss dem
  Word-/LibreOffice-Standard (Strg+Enter teilt den Absatz) entsprechen; jede Abweichung
  ist zu dokumentieren.
- Nach dem Einfügen steht der Cursor unmittelbar hinter dem Umbruch auf der neuen Seite,
  bereit zum Weitertippen.

### 3.2 Einfügen über eine bestehende Selektion
- Eine vorhandene Selektion wird durch den Seitenumbruch **ersetzt** (nicht ergänzt) —
  Standardverhalten wie bei anderen Block-Einfügungen (Tabelle, Bild).

### 3.3 Datenmodell-Repräsentation
- Es muss eine neue Repräsentation im gemeinsamen Schema (`schema.ts`) ergänzt werden —
  entweder ein eigener Block-Node (`page_break`) **oder** ein Absatz-/Überschrift-Attribut
  (z. B. `breakBefore: boolean` auf `paragraph`/`heading`). Die Wahl ist Teil der
  Umsetzung, muss aber die Export-Anforderungen 3.4–3.7 **ohne Informationsverlust**
  erfüllen und ist im Code zu dokumentieren.
- **Cross-Format-Asymmetrie** (analog zur bereits dokumentierten `w:pStyle`-vs.-`text:h`-
  Differenz bei Überschriften): DOCX modelliert den manuellen Umbruch als **Inline-Element**
  im Run (`<w:br w:type="page"/>`), ODF als **Absatz-Stilattribut**
  (`fo:break-before="page"` — bzw. real auch `fo:break-after`, siehe 3.7 — auf dem Style
  des betroffenen Absatzes). Egal welche interne Wahl getroffen wird, **eine** der beiden
  Export-Richtungen erfordert eine Umrechnung; diese darf **keinen** stillen Datenverlust
  bei Cross-Format-Export erzeugen (Rundreise, Abschnitt 5). Die getroffene Entscheidung
  und die Umrechnungsrichtung sind in Code-Kommentaren festzuhalten.

### 3.4 Export nach DOCX
- Serialisierung als `<w:br w:type="page"/>` innerhalb eines `<w:r>`.
- Muss eindeutig unterscheidbar bleiben vom einfachen Zeilenumbruch (`<w:r><w:br/></w:r>`
  ohne `w:type`, für `hard_break`) — der Writer darf beide Fälle nicht verwechseln.
- Darf **nicht** als `<w:lastRenderedPageBreak/>` ausgegeben werden (das ist ein von Word
  selbst erzeugter, rein informativer Marker für einen **automatischen** Umbruch — als
  Ausgabeformat hier falsch).
- Darf **nicht** als Abschnittsumbruch (`w:sectPr`) geschrieben werden (Abgrenzung im
  Kopf dieser Datei).

### 3.5 Import aus DOCX
- Eine (z. B. mit echtem Word erzeugte) Datei mit `<w:br w:type="page"/>` muss beim Import
  als **manueller** Seitenumbruch erkannt und in die interne Repräsentation überführt
  werden — **nicht** verworfen und **nicht** zu einem einfachen Zeilenumbruch degradiert.
  Damit wird die in 0.6 verifizierte aktive Fehlinterpretation behoben.
- Ein einfaches `<w:br/>` (ohne `w:type`) muss weiterhin als Zeilenumbruch (`hard_break`)
  gelesen werden — es darf **kein** `<w:br/>` fälschlich zu einem Seitenumbruch befördert
  werden (Regressionsschutz; reale Evidenz: `60329.docx` mit 85 einfachen `<w:br/>`,
  siehe 0.10).
- `<w:lastRenderedPageBreak/>` muss beim Import **explizit und getestet ignoriert**
  werden (kein manueller Umbruch, kein sichtbares Element) — der heute nur zufällig
  richtige Zustand (0.6) ist in einen bewusst kommentierten Fall zu überführen.

### 3.6 Export nach ODT
- Serialisierung als `fo:break-before="page"` im Absatz-Style des betroffenen Absatzes/
  der betroffenen Überschrift — identisch zum Mechanismus, den LibreOffice Writer selbst
  bei eigenem „Seitenumbruch einfügen" (Strg+Enter) erzeugt.
- Der frühere Entwurf antizipierte einen Fallback „Umbruch am Dokumentende, kein
  nachfolgender Absatz → leeren Absatz mit `fo:break-before` anhängen". Ob dieser Fallback
  überhaupt nötig ist, hängt von der Datenmodell-Wahl (3.3) ab: Bei einem Absatz-Attribut,
  das immer auf einem real existierenden Knoten sitzt (Schema erzwingt `doc: 'block+'`, das
  Dokument ist nie leer), entfällt er; bei einem eigenen Block-Node kann er nötig werden.
  Die tatsächlich gewählte Lösung ist zu dokumentieren; ein **stiller Verlust** des
  Umbruchs am Dokumentende ist in **keinem** Fall zulässig (Grenzfall 2).

### 3.7 Import aus ODT — *(gegenüber früherem Entwurf um `fo:break-after` erweitert)*
- Ein Absatz-Style mit `fo:break-before="page"` muss beim Import als manueller
  Seitenumbruch **vor** diesem Absatz erkannt werden.
- **`fo:break-after="page"` muss ebenfalls erkannt werden** und als manueller
  Seitenumbruch **nach** dem betroffenen Absatz (= vor dem folgenden) wirken. Begründung:
  reale LibreOffice-Dateien verwenden beide Varianten — verifiziert in `pagebreaks.odt`
  (0.10), das **2×** `fo:break-before` **und 1×** `fo:break-after` enthält. Würde nur
  `fo:break-before` unterstützt, ginge beim Import dieser realen Datei ein Umbruch still
  verloren (Verstoß gegen `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18).
- `text:soft-page-break` (reiner Rendering-Hinweis, **kein** erzwungener Umbruch) darf
  **nicht** als manueller Umbruch fehlinterpretiert werden. Aktuell wird es bereits
  verworfen (0.8) — dieses Verhalten muss erhalten bleiben und ist explizit zu testen
  (reale Evidenz: `text-extract.odt`, 0.10), da `soft-page-break` und `break-before`
  begrifflich leicht verwechselbar sind.

### 3.8 Zusammenspiel mit der automatischen Paginierung (`pagination.ts`)
- Inhalt nach einem manuellen Umbruch beginnt auf einer neuen Seite, **auch wenn** auf der
  aktuellen Seite noch reichlich Platz wäre — die höhenbasierte Automatik darf den
  manuellen Umbruch nicht wegoptimieren oder ignorieren.
- Nach einem erzwungenen Umbruch muss die Höhenberechnung der Folgeseite **bei null neu
  beginnen** (kombinierter Fall: erzwungener Umbruch **und** danach ein natürlicher
  Überlauf-Umbruch müssen korrekt zusammenwirken — keine doppelten, fehlenden oder falsch
  positionierten Leerseiten).
- Die visuelle Darstellung sollte denselben Seiten-Zwischenraum-Mechanismus nutzen wie die
  Automatik (damit beide Seiten optisch gleichwertig wirken), muss aber intern
  unterscheidbar bleiben (Abschnitt 1, Zeile 3).

### 3.9 Undo/Redo
- Einfügen eines Seitenumbruchs ist **ein** Undo-Schritt.
- Löschen eines Seitenumbruchs (Backspace/Entf direkt davor/danach) ist ebenfalls **ein**
  Undo-Schritt und stellt den exakten Zustand vor dem Löschen wieder her.
- Redo stellt den jeweils rückgängig gemachten Zustand identisch wieder her.

### 3.10 Rückmeldeverhalten (kein stiller Fehlschlag)
- Kann die Aktion aus irgendeinem Grund an der aktuellen Stelle nicht sinnvoll ausgeführt
  werden, muss entweder eine sichtbare Rückmeldung erfolgen **oder** ein definiertes
  Fallback-Verhalten greifen (Grenzfälle 1, 4) — **nie** ein Tastendruck/Klick, der
  ergebnislos bleibt.

### 3.11 Abgrenzung zum Zeilenumbruch und internes Kopieren/Einfügen
- Manueller Seitenumbruch (Strg+Enter) und Zeilenumbruch (`hard_break`, Umschalt+Enter)
  sind zwei **verschiedene** Konzepte und müssen es über die gesamte Rundreise bleiben —
  weder darf ein Seitenumbruch beim Export/Import zu einem Zeilenumbruch werden (der in
  0.6 verifizierte DOCX-Reader-Fehler), noch umgekehrt.
- Wird Inhalt, der einen manuellen Umbruch enthält, **innerhalb** des Editors kopiert und
  wieder eingefügt (ProseMirror serialisiert dabei über `toDOM`/`parseDOM` desselben
  Schemas), darf der Umbruch **nicht** stillschweigend verloren gehen — die interne
  Repräsentation muss auch diesen Weg überstehen (allgemeiner Grundsatz „kein stiller
  Datenverlust").

---

## 4. Grenzfälle (müssen explizit befundet werden)

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 1 | Umbruch am Dokumentanfang (Cursor vor dem ersten Zeichen) | Zu klären und zu dokumentieren: entweder erste leere Seite gefolgt vom Inhalt, oder bewusster No-Op an dieser Stelle. Kein Crash, kein stiller Datenverlust. |
| 2 | Umbruch am Dokumentende (Cursor nach dem letzten Zeichen) | Erzeugt eine neue, leere Folgeseite; bleibt bei Export/Reimport erhalten (Word/LibreOffice zeigen hier ebenfalls eine echte leere Seite). Kein stiller Verlust (vgl. 3.6). |
| 3 | Zwei aufeinanderfolgende Umbrüche ohne Inhalt dazwischen | Erzeugt eine vollständig leere Seite dazwischen; darf **nicht** automatisch zu einem Umbruch zusammengefasst werden (Word-/LibreOffice-Referenz). |
| 4 | Cursor in einer Tabellenzelle | In Word erzeugt Strg+Enter in einer Zelle einen Zeilenumbruch statt eines echten Seitenumbruchs. **Reale Evidenz** stützt eine analoge Entscheidung: `no_pagebreak.odt`/`35585_-_no_pagebreak.odt` (0.10) tragen `fo:break-before` **innerhalb** einer Tabellenzelle, und LibreOffice selbst rendert dort **keinen** Seitenumbruch (LO-Bug 35585). Zu entscheiden und zu dokumentieren, wie diese App verfährt — **darf in keinem Fall die Tabellenstruktur beschädigen, abstürzen oder still fehlschlagen** (3.10). |
| 5 | Cursor in einem Listenpunkt (`list_item`) | Nachfolgender Inhalt muss weiterhin als Teil **derselben** Liste mit lückenloser Nummerierung erkennbar bleiben, auch wenn er auf der neuen Seite beginnt. |
| 6 | Cursor mitten in einer Überschrift (`heading`) | Überschrift wird wie ein Absatz geteilt (3.1); zu prüfen/dokumentieren, ob beide Fragmente den Level behalten oder das zweite zu einem Standardabsatz wird — konsistent mit dem generellen „Enter in einer Überschrift"-Verhalten. |
| 7 | Umbruch einfügen, danach direkt weitertippen bzw. Selektion neu setzen und tippen (Selection-Sync-Regression, `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) | **Pflicht-Testsequenz:** Einfügen darf die interne Selektion nicht in einen inkonsistenten Zustand versetzen — nachfolgendes Tippen darf nichts Falsches löschen/ersetzen. |
| 8 | Kurzes Dokument (z. B. zwei Sätze) mit einem manuellen Umbruch dazwischen | Bewusst ein zweiseitiges Dokument trotz winzigem Textumfang — strikt zu unterscheiden vom „offen/ungeklärt"-Rendering-Verdacht aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8 (dort **ungewollter** Leerraum **ohne** jeden manuellen Umbruch). |
| 9 | Import einer Fremddatei mit **mehreren** manuellen Umbrüchen (z. B. einer pro Kapitel) | Alle Umbrüche bleiben einzeln und an der richtigen Stelle erhalten (nicht nur der erste/letzte). Reale Evidenz: `saut_page.docx` (2×), `pagebreaks.odt` (break-before + break-after). |
| 10 | Cross-Format-Rundreise DOCX → ODT → DOCX mit Umbruch am Dokumentende (Grenzfall 2) | Zu prüfen, ob nach dem Rückweg wieder exakt `<w:br w:type="page"/>` entsteht oder ein zusätzlicher leerer Absatz übrig bleibt (akzeptabel, aber dokumentationspflichtig, **kein** Textverlust). |
| 11 | Löschen des Absatzes unmittelbar nach einem (ODT-seitig als Absatz-Attribut realisierten) Umbruch | Das Umbruch-Attribut darf nicht spurlos mit dem Absatz verschwinden, ohne dass bewusst entschieden wurde, ob der Umbruch erhalten bleibt (an den nun folgenden Absatz wandert) oder mitgelöscht wird — Verhalten festlegen und testen. |
| 12 | Umbruch unmittelbar vor/nach einem Bild oder einer Tabelle (Cursor direkt davor/dahinter) | Bild/Tabelle bleibt vollständig erhalten und landet eindeutig auf der richtigen Seite (je nach Cursor-Position), keine Verschiebung/Duplizierung. |
| 13 | Rückgängig (Strg+Z) direkt nach dem Einfügen | Umbruch verschwindet in **einem** Schritt vollständig, umgebender Text bleibt unverändert (3.9). |
| 14 | Import einer Datei mit **vielen** einfachen Zeilenumbrüchen | **Keiner** davon darf zu einem Seitenumbruch befördert werden (Regressionsschutz für die Reader-Änderung 3.5). Reale Evidenz: `60329.docx`, 85× `<w:br/>` (0.10). |
| 15 | Import einer Datei mit `text:soft-page-break`, aber **ohne** `fo:break-before`/`-after` | Es entsteht **kein** manueller Umbruch (3.7). Reale Evidenz: `text-extract.odt` (0.10). |

---

## 5. Rundreise-Anforderung

Zwei getrennte, beide verpflichtende Rundreise-Prüfungen — analog zur Methodik in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18/19.

### 5.1 Baseline-Rundreise (Regressionsschutz — darf durch die neue Funktion nicht brechen)
1. Reale DOCX-Datei **ohne** manuellen Umbruch unverändert hochladen (kein Klick, keine
   Eingabe) → sofort exportieren → reimportieren → Inhalt inhaltlich identisch, insbesondere
   entsteht **kein** fälschlich erkannter Seitenumbruch (weder aus `<w:lastRenderedPageBreak/>`
   noch aus einfachem `<w:br/>`). Pflicht-Fixture u. a. `60329.docx` (0.10/Grenzfall 14).
2. Dasselbe mit einer realen ODT-Datei — ein vorhandenes `text:soft-page-break` darf **nicht**
   als manueller Umbruch übernommen werden. Pflicht-Fixture `text-extract.odt` (Grenzfall 15).
3. Beide Prüfungen müssen **weiterhin grün** sein, nachdem Schema, Writer und Reader um die
   neue Funktion erweitert wurden (kein neuer Node/kein neues Attribut darf beim reinen
   Reimport unbeteiligter Dateien ungewollt auftauchen).

### 5.2 Feature-Rundreise (Seitenumbruch selbst)
Für jede Situation: Umbruch über Toolbar/Shortcut einfügen → als DOCX exportieren →
reimportieren → Umbruch **und** Inhalt erhalten; **und** identisch als ODT; **und**
zusätzlich Cross-Format (DOCX-Ursprung → ODT-Export sowie umgekehrt):

1. Neues Dokument, zwei Absätze, dazwischen ein manueller Umbruch → Umbruch bleibt exakt an
   der Stelle, Inhalt davor/danach unverändert, Umbruch bleibt als „manueller Umbruch"
   erkennbar (nicht zu Leerzeile/-absatz oder Zeilenumbruch degradiert, vgl. 3.11).
2. Dasselbe als ODT-Ursprungsdokument.
3. Cross-Format DOCX → ODT → DOCX: Umbruch bleibt über beide Konvertierungen erhalten
   (keine kumulative Verschlechterung, vgl. Grenzfall 10).
4. Cross-Format ODT → DOCX → ODT (umgekehrte Richtung).
5. Dokument mit **mehreren** Umbrüchen (z. B. drei Kapitel) → alle bleiben einzeln und an der
   richtigen Stelle erhalten (Grenzfall 9).
6. Umbruch in Kombination mit anderen Strukturen (Liste, Tabelle, Bild, Überschrift direkt
   davor/danach) → Rundreise erhält Umbruch **und** die übrigen Strukturen (kumulativer
   Verlust-Test).
7. Import einer **fremden, mit echtem Microsoft Word erzeugten** DOCX-Datei mit manuellem
   Umbruch → erkannt (3.5), unverändert exportiert, reimportiert → weiterhin vorhanden.
   **Pflicht-Fixture:** `tests/fixtures/external/docx/saut_page.docx` (2× `w:br[type=page]`
   + 1× `<w:br/>`, muss beides korrekt unterscheiden).
8. Dasselbe mit einer **mit echtem LibreOffice Writer erzeugten** ODT-Datei. **Pflicht-
   Fixtures:** `pagebreaks.odt` (`fo:break-before` **und** `fo:break-after`),
   `AB_pageBreakBefore.odt`/`pageBreakProblem.odt` (`fo:break-before`).

**Abnahmekriterium:** Layout-Nuancen bei Cross-Format (z. B. eine leere Ausgleichsseite am
Dokumentende, Grenzfall 2/10) sind zu dokumentieren und akzeptabel; **das vollständige
Verschwinden eines Umbruchs, seine Degradierung zu einem Zeilenumbruch oder ein Textverlust
sind es nicht** — weder in 5.1 noch in 5.2.

---

## 6. Testplan-Hinweise (Unit + E2E, Playwright)

1. **Unit-Tests DOCX-Writer:** interner Umbruch → exakt `<w:br w:type="page"/>` (nicht
   `<w:br/>` ohne Attribut, nicht `<w:lastRenderedPageBreak/>`, nicht `w:sectPr`).
2. **Unit-Tests DOCX-Reader:** (a) `<w:br w:type="page"/>` → interner manueller Umbruch;
   (b) einfaches `<w:br/>` → `hard_break` (Zeilenumbruch, **nicht** befördert);
   (c) `<w:lastRenderedPageBreak/>` → **explizit ignoriert** (kommentierter Fall, 3.5).
   Reale Fixtures `saut_page.docx` und `60329.docx` (0.10) als Pflicht-Eingaben.
3. **Unit-Tests ODT-Writer:** interner Umbruch → `fo:break-before="page"` im Style des
   betroffenen Absatzes.
4. **Unit-Tests ODT-Reader:** (a) `fo:break-before="page"` → manueller Umbruch;
   (b) **`fo:break-after="page"` → manueller Umbruch** (nach dem Absatz, 3.7);
   (c) reines `text:soft-page-break` → **kein** manueller Umbruch. Reale Fixtures
   `pagebreaks.odt`, `AB_pageBreakBefore.odt`, `text-extract.odt` (0.10) als Pflicht-Eingaben.
5. **E2E-Test (Playwright):** Cursor im Editor (`.ProseMirror`) setzen, Toolbar-Button
   „Seitenumbruch einfügen" klicken **bzw.** `ControlOrMeta+Enter` drücken → sichtbare
   zweite Seite / gekennzeichneter Spacer im DOM; danach eingegebener Text landet sichtbar
   auf der neuen Seite. Der Button muss über `getByRole('button', { name: 'Seitenumbruch
   einfügen' })` adressierbar sein (Abschnitt 1, Zeile 1).
6. **Regressionstest-Pflicht (Selection-Sync):** jeder E2E-Test aus Punkt 5 muss unmittelbar
   danach eine Tipp-/Formatierungsaktion ausführen und deren korrektes Ergebnis prüfen
   (Grenzfall 7, `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) — nicht nur den Zustand direkt nach
   dem Einfügen.
7. **Visuelle Unterscheidbarkeit:** mindestens eine DOM-Attribut-Assertion (und/oder ein
   Screenshot-Vergleich) muss zeigen, dass ein manueller Umbruch von einem automatisch
   berechneten unterscheidbar ist (Abschnitt 1 Zeile 3, 3.8).
8. **Rundreise-Tests (Abschnitt 5)** sind sowohl als Unit-Tests gegen Reader/Writer **als
   auch** als E2E-Test über echte Bedienung (Toolbar-Klick/Shortcut → echter Datei-Download
   → echter Re-Upload) zu führen — reine Unit-Tests mit konstruierten JSON-Fixtures allein
   reichen nicht (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21).
9. **Reale Fixtures sind vorhanden** (0.10) und namentlich zu verwenden — es müssen **keine**
   neuen Word-/LibreOffice-Dateien erzeugt werden. Rein synthetisch konstruiertes Test-XML
   allein genügt nicht, um reale Word-/LibreOffice-Eigenheiten abzudecken.

---

## 7. Freigabekriterium für „vorhanden"

Der Backlog-Status von `seitenumbruch` darf erst dann als **vorhanden** (unqualifiziert)
gelten, wenn:

- alle Bedienelemente aus Abschnitt 1 existieren und funktionieren (Toolbar-Button mit
  SVG-Icon und zugänglichem Namen, Strg+Enter/Cmd+Enter, sichtbare + per DOM-Attribut
  prüfbare Kennzeichnung, Löschen als ein Undo-Schritt),
- alle Testfälle aus Abschnitt 6 automatisiert vorliegen und grün sind — **einschließlich**
  der drei DOCX-Reader-Fälle (2a–c), der drei ODT-Reader-Fälle (4a–c, **inkl.
  `fo:break-after`**) und der realen Pflicht-Fixtures aus 0.10,
- die in 0.6/0.8 verifizierten stillen Datenverluste (DOCX-Reader-Degradierung,
  ODT-Reader-Ignoranz von `fo:break-before`/`-after`) nachweislich behoben sind,
- die Grenzfälle aus Abschnitt 4 **einzeln** befundet sind (funktioniert wie spezifiziert /
  bewusst abweichendes, dokumentiertes Verhalten / repariert),
- Abschnitt 5.1 (Baseline-Rundreise) durch die neue Funktion **nicht** gebrochen wurde,
- Abschnitt 5.2 (Feature-Rundreise) für DOCX, ODT und **beide** Cross-Format-Richtungen
  besteht, inklusive der realen Word-/LibreOffice-Fixtures,
- der Selection-Sync-Regressionstest (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) explizit mit
  einer Seitenumbruch-Einfüge-Sequenz nachgestellt und grün ist,
- das Zusammenspiel mit der automatischen Paginierung (3.8) geprüft und dokumentiert ist.

Andernfalls ist der Status auf **teilweise** zu setzen und die konkret fehlenden Teilpunkte
sind hier nachzutragen (analog zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21).

---

## 8. UX-Invarianten-Durchgang (`specs/UX-INVARIANTEN.md` §1)

1. **View-Sync:** `insertPageBreak` endet mit `scrollIntoView()` — der Cursor auf der neuen
   Seite ist nach dem Einfügen sichtbar. **Erfüllt.**
2. **Zustands-Feedback:** Erfolg ist doppelt sichtbar (Marker-Linie „Seitenumbruch" +
   zweite Seite); der Tabellen-/Listen-Fallback zeigt eine sichtbare, selbstauflösende
   Meldung statt eines stillen No-Ops (§3.10). Leerzustand/Fehler: nicht einschlägig
   (keine langlaufende Aktion). **Erfüllt.**
3. **Fokus/Tastatur:** Button aktiviert über `onClick` (Maus, Enter UND Leertaste,
   `onMouseDown` nur Selektionserhalt); `Strg/Cmd+Enter` als Volltastatur-Weg; Marker per
   Klick selektierbar und mit Entf/Backspace löschbar (konsistent zum Bild-Verhalten:
   selektieren → löschen). **Erfüllt.**
4. **Responsiveness:** E2E läuft auf Desktop Chrome, Mobile (Pixel 7) und Tablet (iPad
   Mini); Button-Tap = Klick, Marker-Tap selektiert. **Erfüllt.**
5. **Persistenz (invertiert):** keine neue Persistenz — der Umbruch lebt im Dokument, das
   wie bisher nur im Speicher existiert. **Nicht einschlägig.**
6. **Konsistenz:** Marker-Farben fest (Seiten bleiben auch im Dunkelmodus weiß), Label
   deutsch, Selektionszustand nutzt dasselbe Blau wie Bild-Selektion. **Erfüllt.**

## 9. Journey-Durchgang (`specs/UX-INVARIANTEN.md` §2)

1. Nutzer tippt Kapitel 1, will Kapitel 2 auf neuer Seite → klickt „Umbruch"/Strg+Enter →
   *sieht* die gestrichelte Umbruchlinie + eine neue Seite, Cursor blinkt dort, tippt
   direkt weiter. → §3.1, E2E-Testfall 1/2.
2. Nutzer will den Umbruch wieder loswerden → klickt die Linie (wird blau umrandet),
   drückt Entf → Inhalt fließt zurück, ein Strg+Z holt den Umbruch zurück. → §1.4, E2E.
3. Nutzer drückt Strg+Enter versehentlich in einer Tabellenzelle → statt zerrissener
   Tabelle: Zeilenumbruch + Meldung, warum. → Grenzfall 4, E2E.
4. Nutzer exportiert und öffnet die Datei in Word/LibreOffice → der Umbruch ist dort ein
   echter manueller Seitenumbruch (`w:br type="page"` / `fo:break-before`). → §5.2, E2E +
   Roh-XML-Assertions.
5. Nutzer öffnet eine fremde Word-Datei mit Umbrüchen → sie erscheinen als Marker an den
   richtigen Stellen, nicht als degradierte Zeilenumbrüche. → §3.5, Fixture-Tests.

## 10. Umsetzungsstand (2026-07-09)

Umgesetzt und lokal verifiziert (Unit 694/694 gesamt, davon 45 neue; E2E 11/11 auf
Desktop Chrome, volle Suite über alle Projekte siehe Commit-Nachricht).

**Getroffene Entscheidungen (§3.3 u. a.):**
- **Datenmodell = eigener `page_break`-Block-Atom-Node** (nicht Absatz-Attribut): eine
  einheitliche Repräsentation für alle Positionen, direkt selektier-/löschbar wie ein
  Bild, ein Undo-Schritt. Kodierungs-Asymmetrie liegt in den Writern/Readern.
- **DOCX-Export:** `<w:br w:type="page"/>` als ERSTER Run des Folgeabsatzes (rendert
  identisch zu Words trailing-Run-Kodierung, hält den Folgeblock-Typ rundreisefest);
  vor Tabellen/Listen/Bildern bzw. am Dokumentende ein eigenständiger Break-Absatz, den
  der Reader wieder zu einem nackten `page_break` kollabiert.
- **DOCX-Import:** `w:br[type=page]` an jeder Position (auch mitten im Absatz → Split;
  Überschriften-Teile behalten ihren Level); `lastRenderedPageBreak` jetzt EXPLIZIT und
  kommentiert ignoriert (vorher nur zufällig richtig, §0.6).
- **ODT-Export:** `fo:break-before="page"` als Style-Variante (`Ppara-*-pb`,
  `Heading*-…-pb`); leerer Break-Carrier-Absatz vor Nicht-Absatz-Blöcken/am Ende.
- **ODT-Import:** `fo:break-before` UND `fo:break-after` (§3.7), aber NUR auf
  Top-Level-Absätzen/-Überschriften — in Tabellenzellen wird der Break wie in
  LibreOffice selbst (LO-Bug 35585, reale Fixtures) ignoriert (Grenzfall 4); leere
  Break-Carrier-Absätze kollabieren zum nackten Node (kein Streuner-Leerabsatz,
  Grenzfall 10); `text:soft-page-break` bleibt ignoriert (Grenzfall 15).
- **Grenzfall 1 (Dokumentanfang):** Umbruch vor dem ersten Block = bewusst leere erste
  Seite (Word-Verhalten), kein No-Op.
- **Grenzfälle 4/5 (Tabelle/Liste):** Strg+Enter degradiert zum Zeilenumbruch MIT
  sichtbarer Meldung — Word-analog (Zelle), und die blockbasierte Paginierung kann
  Tabellen/Listen ohnehin nicht über Seiten teilen; importierte In-Zellen-Breaks: DOCX
  behält sie im Modell (kein Datenverlust), ODT ignoriert sie LibreOffice-konform.
- **Grenzfall 11 (Absatz nach Umbruch löschen):** der Umbruch ist ein eigener Node und
  überlebt das Löschen des Folgeabsatzes; Entf/Backspace am Rand selektiert erst den
  Marker (wie bei Bildern), das zweite Entf löscht ihn.
- **§5.2.3/4 Cross-Format:** Die App bietet keinen Cross-Format-Export über die UI an
  (Präzedenz: tabelle-erstellen-loeschen-req §9.3) — Cross-Format ist auf UNIT-Ebene
  über beide Writer/Reader-Ketten abgedeckt (DOCX→ODT→DOCX und umgekehrt), nativ per
  E2E über echten Download/Re-Upload.
- **Paginierung (§3.8):** erzwungene Umbrüche setzen das Höhenbudget zurück und
  komponieren mit natürlichen Überläufen; die B4-Blatt-Mindesthöhe zählt Seiten jetzt
  zusätzlich über die Spacer (ein erzwungener Umbruch bei wenig Inhalt ergab sonst nur
  eine Blatthöhe); manueller Spacer trägt `--manual`-Klasse, der Node selbst die
  sichtbare gestrichelte Linie mit Label (§1.3/§6.7).
