# Anforderungen: „Hyperlink einfügen"

Status: Im Backlog (`specs/FEATURE-BACKLOG.md`, Abschnitt „3.5 Links", Zeile 234,
Slug `hyperlink-einfuegen`, Priorität 1/essenziell) als **„fehlt"** markiert.
Beschreibung dort: „Verknüpft markierten Text mit einer URL." Diese Einstufung galt
laut Auftrag als **nicht vertrauenswürdig** und wurde für diese Datei durch direkte
Durchsicht des **aktuellen** Codes (Stand 2026-07-04) **verifiziert**: Die Funktion
fehlt als bedienbares Feature vollständig (Schema-Mark, Command, Toolbar/Dialog,
Shortcut, DOCX-Writer, ODT-Writer sowie die URL-Erfassung in beiden Readern) — siehe
Abschnitt 0. Der Status „fehlt" ist damit zutreffend.

**Re-Verifikation am 2026-07-05 (dieser Durchlauf):** Alle Kernbefunde aus Abschnitt 0
(Schema, Commands, Toolbar, Keymap, beide Reader, beide Writer, Relationships,
Fixture-Bestand) wurden erneut direkt gegen den heutigen Dateiinhalt geprüft —
**einschließlich** der zwischenzeitlich gelandeten Ausschneiden/Kopieren-Features
(`git log`: `9f8fa03`, `d65cde0` u. a.), die `WordEditor.tsx`/`Toolbar.tsx`/
`commands.ts` verändert haben. Ergebnis: **alle inhaltlichen Befunde bleiben
unverändert gültig**, `link` existiert nach wie vor nirgends im Code. Einzige
Korrektur: Die Zeilenangabe zur `keymap({…})` in Abschnitt 0.3 war durch die
inzwischen ergänzte `Shift-Delete`-Bindung um einige Zeilen verschoben und wurde
unten aktualisiert. Zusätzlich neu aufgenommen: eine aus den Commits `0797d13`/
`db61c89` (Fixes für instabile/flaky Selection-Sync-Tests, 2026-07-04) gewonnene, für die
Testimplementierung dieses Features unmittelbar relevante Erkenntnis zu
tastaturgetriebenen Selektionen — siehe Grenzfall 21 und Testplan-Hinweis 8.

**Wichtige Korrektur gegenüber einem früheren Entwurf dieser Datei:** Ein früherer
Entwurf behauptete, die vorhandenen Reader würden beim Import den **sichtbaren Text**
verlinkter Stellen stillschweigend verschlucken (angeblicher kritischer Datenverlust,
Verstoß gegen `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18). Das ist gegen den heutigen Code
**nicht mehr wahr** und wird unten richtiggestellt: Beide Reader bewahren den Linktext
bereits zuverlässig (im Zuge der Import-Robustheit aus `datei-oeffnen-req.md` §3.13
umgesetzt und durch bestehende Tests abgesichert). Die tatsächliche, engere Lücke ist:
Die **Ziel-URL** (`href`) wird nirgends erfasst oder geschrieben — ein Link geht beim
Import auf reinen Text zurück, und im Editor lässt sich gar kein Link erzeugen. Es ist
also eine echte, vollständige **Funktionslücke**, aber **kein Datenverlust-Bug**. Diese
Unterscheidung ist load-bearing für die Priorisierung und die Testauswahl und darf nicht
wieder verwischt werden.

Geltungsbereich und Abgrenzung: Diese Datei behandelt in erster Linie den Slug
`hyperlink-einfuegen`. Die Backlog-Nachbareinträge `hyperlink-bearbeiten`
(Zeile 235, „Ändert die Ziel-URL eines bestehenden Links", Prio 2) und
`hyperlink-entfernen` (Zeile 236, „Löst die Verknüpfung, der Text bleibt erhalten",
Prio 2) sind eigene Slugs, aber in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 14 sowie
Abschnitt 17 Zeile 366 („Link einfügen/bearbeiten/entfernen") bereits als **ein**
zusammenhängendes UI-Element geführt — ein Werkzeug zum „Link einfügen", das keinen Weg
bietet, denselben Link wieder zu bearbeiten oder zu entfernen, wäre für sich genommen
nicht abnahmefähig. Diese Datei deckt daher den vollständigen Lebenszyklus (Einfügen,
Bearbeiten, Entfernen) ab, mit Fokus auf „Einfügen" als Haupt-Slug. **Nicht** Teil
dieser Anforderung: interne Sprungziele/Textmarken und Querverweise innerhalb desselben
Dokuments (separate Backlog-Einträge in Abschnitt 3.5 mit eigener Anforderungsdatei);
für sie gilt hier nur die Mindestforderung „kein Textverlust" (siehe 3.13/Grenzfall 17).

Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben
ProseMirror-Editor (`src/formats/shared/`). Jede Anforderung unten gilt für **beide**
Formate, sowohl beim Import einer bestehenden Datei als auch beim Export eines im Editor
erstellten/bearbeiteten Dokuments — inklusive Rundreise (Datei hochladen → unverändert
exportieren → Ergebnis entspricht inhaltlich dem Original).

---

## 0. Befund aus direkter Code-Verifikation (Stand 2026-07-04)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des **aktuellen** Codes, nicht
auf der Backlog-Beschreibung und nicht auf einem älteren Schnappschuss. Alle Aussagen
unten wurden am 2026-07-04 gegen den echten Dateiinhalt geprüft. **Load-bearing ist
jeweils das beschriebene Verhalten, nicht die exakte Zeilennummer** — Zeilenangaben
dienen nur der schnellen Auffindbarkeit und können nach weiteren Änderungen abweichen.
Mehrere Annahmen eines früheren Entwurfs wurden dabei **korrigiert** und sind unten
ausdrücklich als solche markiert.

### 0.1 Kein `link`-Mark im Schema — bestätigt
`src/formats/shared/schema.ts` definiert im Marks-Block (Z. 157–196) genau sechs Marks:
`strong` (158–163), `em` (164–169), `underline` (170–175), `strike` (176–181),
`textColor` (182–188), `highlight` (189–195). Es existiert **kein** `link`-Mark
(kein `href`-Attribut, keine `parseDOM`-Regel für `a[href]`, kein entsprechendes
`toDOM`). Folge: Ein per Copy&Paste aus einer Webseite eingefügter `<a href="…">`-Link
wird mangels passender Mark-Regel auf reinen Text ohne Verknüpfung reduziert.

### 0.2 Kein Command — bestätigt
`src/formats/shared/editor/commands.ts` enthält `applyMarkColor` (Z. 106–113) und
`clearMarkColor` (Z. 115–122) als generisches Muster für Marks mit **einem** Attribut
(Farbe) — strukturell die nächste Verwandtschaft für ein „Link setzen"/„Link
entfernen"-Command mit Attribut `href`, aber ein solcher Command fehlt komplett.
`applyMarkColor` verlangt eine nicht-leere Selektion (`if (empty) return false`) — für
Links ist dieses Verhalten bewusst zu überdenken (siehe 3.2).

### 0.3 Kein Toolbar-Button, kein belegter Shortcut — bestätigt
`src/formats/shared/editor/Toolbar.tsx` listet Ausschneiden, Absatzformat-Dropdown,
F/K/U/S (`MarkButton`, Z. 55–89), Text-/Hervorhebungsfarbe inkl. „Entfernen"-Buttons,
Ausrichtung, Listen, Tabelle (⊞, Z. 277–289) und Bild (🖼, Z. 291–294) — **keinen**
Link-Button. Die `keymap({…})` in `WordEditor.tsx` (Z. 85–107, Zeilenangabe am
2026-07-05 aktualisiert — durch die zwischenzeitlich ergänzte `Shift-Delete`-Bindung
fürs Ausschneiden gegenüber einem früheren Entwurf verschoben) bindet `Mod-z/y`,
`Mod-Shift-z`, `Enter`, `Shift-Enter`, `Mod-b/i/u` (Z. 98–100) und `Shift-Delete` —
**kein** `Mod-k` (Strg+K/Cmd+K), der in Word, LibreOffice Writer und praktisch jedem
Web-Rich-Text-Editor etablierte Standard-Shortcut für „Link einfügen". Der Shortcut ist
frei und aktuell durch nichts blockiert. **Hinweis für die Umsetzung:** Der Kommentar in
`WordEditor.tsx` (Z. 86–92) warnt ausdrücklich davor, dass jede neue Keymap-Bindung
geprüft werden muss, um nicht versehentlich `Mod-c/x/v` zu verschlucken — `Mod-k`
kollidiert damit nicht.

### 0.4 DOCX-Reader: Linktext bleibt erhalten, aber `href` wird verworfen — *(gegenüber früherem Entwurf korrigiert)*
**Korrektur:** Die frühere Behauptung, `decodeParagraphRuns` lese nur direkte
`<w:r>`-Kinder von `<w:p>` und verliere dadurch den in `<w:hyperlink>` verschachtelten
Text stillschweigend, ist gegen den aktuellen Code **falsch**. `src/formats/docx/reader.ts`
besitzt heute die Funktion `collectRuns` (Z. 194–216), die gezielt in Wrapper-Elemente
absteigt, in denen echte Word-Dateien Runs verpacken — u. a. **`<w:hyperlink>`**
(Z. 207: `child.localName === 'ins' || child.localName === 'hyperlink' ||
child.localName === 'smartTag'` → rekursiver `collectRuns`), außerdem `<w:sdt>`
(Z. 209–211) und `<w:fldSimple>` (Z. 212–213); ein `<w:del>` (getrackte Löschung) wird
bewusst übersprungen (Z. 205–206). Der Linktext überlebt den Import also vollständig.

Die **tatsächliche** Lücke: `collectRuns` wertet das `r:id`-Attribut des `<w:hyperlink>`
**nicht** aus, und `marksFromRunProperties` (Z. 100–115) erzeugt kein `link`-Mark. Das
Ziel (`href`) wird damit beim Import verworfen — der zuvor verlinkte Text erscheint als
gewöhnlicher, unverlinkter Text. Die Relationship-Auflösung existiert bereits
(`readRelationships`, Z. 24–35, wird für Bilder/Kopf-/Fußzeile genutzt und liefert eine
typneutrale `Map<Id → Target>`); für Links muss ihr Ergebnis lediglich **zusätzlich**
konsultiert werden. Nachweis des Ist-Zustands: `src/formats/docx/__tests__/reader.test.ts`
(`describe … U-6`, Z. 46–113) belegt bereits, dass `<w:hyperlink r:id="rId2"><w:r>
<w:t>hier</w:t></w:r></w:hyperlink>` den Text „hier" behält — prüft aber **nicht** das
Ziel/`href`, weil es dafür noch keinen Mechanismus gibt.

### 0.5 ODT-Reader: Linktext bleibt erhalten, aber `href` wird verworfen — *(gegenüber früherem Entwurf korrigiert)*
**Korrektur:** Die frühere Behauptung, `decodeInline`s `walk` erkenne `text:a` nicht und
verliere dessen Text, ist gegen den aktuellen Code **falsch**. `src/formats/odt/reader.ts`
`walk` (Z. 138–168) behandelt zwar `text:span`, `text:line-break`, `text:s`, `text:tab`
und Redline-/Bookmark-Marker explizit, fängt aber **jedes andere** Inline-Element in
einem `else`-Zweig (Z. 160–167) ab, der ausdrücklich in dessen Kind-Knoten absteigt
(`for (const child …) walk(child, marks)`) — im Kommentar namentlich für „hyperlink
`text:a`" dokumentiert. Der von `<text:a>` umschlossene Text bleibt damit erhalten;
ein innerer `text:span` mit Zeichenformatvorlage wird über den regulären `span`-Zweig
korrekt weiterverarbeitet, sodass auch die kombinierte Formatierung überlebt.

Die **tatsächliche** Lücke: Das `xlink:href`-Attribut von `<text:a>` wird nicht
ausgewertet, es entsteht kein `link`-Mark. Nachweis des Ist-Zustands:
`src/formats/odt/__tests__/external-fixtures.test.ts` (`describe … U-4`, Z. 78–96) belegt
mit den realen Fixtures `Hyperlink-AOO401.odt` (Linktext „Hello World!") sowie
`hyperlink.odt`/`hyperlink_destination.odt`, dass der Text überlebt — prüft aber nicht
die Ziel-URL.

### 0.6 Kein DOCX-Schreibpfad — bestätigt
`src/formats/docx/writer.ts` `runPropertiesXml` (Z. 20–33) kennt nur die sechs Marks aus
0.1; ein `link`-Mark träfe keinen `if`-Zweig und käme **spurlos** unter den Tisch (kein
`<w:hyperlink>`-Wrapper, keine Relationship, keine Fehlermeldung). `inlineToRuns`
(Z. 41–67) gruppiert Textknoten ausschließlich nach `JSON.stringify(marks)`-Gleichheit in
`<w:r>`-Läufe; es gibt keine Ebene, die mehrere Läufe zusätzlich in einen gemeinsamen
`<w:hyperlink>`-Wrapper zusammenfasst.

### 0.7 Relationship-Infrastruktur vorhanden, aber für externe Links unvollständig — bestätigt
`src/formats/docx/relationships.ts` (`RelationshipRegistry`, `add()` Z. 12–17,
`serialize()` Z. 23–31; `RELATIONSHIP_TYPES` Z. 34–42) wird bereits für Bilder, Kopf-/
Fußzeile, Styles, Numbering genutzt und ist grundsätzlich wiederverwendbar für die
`r:id`-Referenz eines Links. **Drei konkrete Lücken bleiben Pflichtteil der Umsetzung:**
- `RELATIONSHIP_TYPES` enthält keinen Eintrag `hyperlink` (offizieller Typ:
  `http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink`).
- Das `Relationship`-Interface (Z. 1–5: `id`, `type`, `target`) und `serialize()`
  kennen **kein** `TargetMode`. Alle bisherigen Typen sind interne Paketpfade und
  brauchen keines. Eine externe URL **muss** `<Relationship … TargetMode="External"/>`
  bekommen — fehlt das Attribut, interpretiert Word das `Target` als internen Paketpfad,
  und der Link ist entweder kaputt oder erzeugt beim Öffnen eine Reparaturmeldung.
- **`serialize()` escaped `Target` heute überhaupt nicht** (Z. 25 wörtlich:
  `` `…Target="${rel.target}"/>` ``, direkt verifiziert 2026-07-05). Bisher folgenlos, weil
  alle bestehenden Ziele generierte, XML-metazeichenfreie Paketpfade sind. Eine externe URL
  kann jedoch `&`, `"`, `<` enthalten — die in 5.1.1 vorgeschriebene Test-URL
  `https://example.com/pfad?x=1&y=2` trägt bereits ein rohes `&`. Ohne `escapeXml` auf
  `rel.target` erzeugt der Export **nicht parsebares** `document.xml.rels`, und der
  **allererste** Rundreise-Test scheitert. Dieser Fix ist Pflichtteil der Umsetzung, nicht
  nur ein Grenzfall (verschärft Grenzfall 6 zu einer harten Vorbedingung).

### 0.8 Kein ODT-Schreibpfad — bestätigt
`src/formats/odt/writer.ts` `runPropsFromMarks` (Z. 32–43) und `inlineToOdt` (Z. 70–83)
kennen nur die Marks aus 0.1 und wrappen Text ausschließlich in
`<text:span text:style-name="…">`, niemals in `<text:a xlink:href="…">`. Für ein
`link`-Mark bräuchte es eine zusätzliche Wrapper-Ebene **um** den vorhandenen
`text:span`-Mechanismus herum (ein Link kann gleichzeitig fett/farbig sein — beide
Elemente müssen koexistieren, siehe 3.14). **Positiv:** Der `xlink`-Namespace ist
bereits deklariert (`src/formats/odt/xmlUtil.ts`: `ODF_NAMESPACES.xlink` Z. 17, in
`NAMESPACE_DECLARATIONS` Z. 24 enthalten und heute schon für `draw:image` genutzt) —
für `<text:a>` ist **keine** neue Namespace-Deklaration nötig.

### 0.9 Testlage — *(gegenüber früherem Entwurf korrigiert)*
**Korrektur:** Die frühere Behauptung „kein einziger Test für dieses Feature" ist
unpräzise. Es existieren bereits Tests, die aber ausschließlich den **Text-Erhalt** von
Links absichern (Teil der Import-Robustheit), nicht die Verlinkung selbst:
- `src/formats/docx/__tests__/reader.test.ts` U-6 (Z. 46–113) — synthetische
  `<w:hyperlink>`-Strukturen, Text überlebt (auch verschachtelt hyperlink→ins→sdt).
- `src/formats/docx/__tests__/external-fixtures.test.ts` U-3 (Z. 127) — Feld-/Hyperlink-/
  Bookmark-Inhalt wird nicht stillschweigend verworfen.
- `src/formats/odt/__tests__/external-fixtures.test.ts` U-4 (Z. 78–96) — reale
  ODT-Fixtures, Linktext überlebt.
- `tests/e2e/complex-import-fidelity.spec.ts` E-3.13a (Z. 16–35).

**Es fehlen** vollständig: Tests für `href`-Erfassung beim Import, für das `link`-Mark,
für Command/Toolbar/Shortcut/Dialog, für den DOCX-/ODT-Schreibpfad, für `TargetMode`,
für die Rundreise der Ziel-URL sowie für die Cross-Format-Rundreise. Diese sind mit der
Funktion zu erstellen.

### 0.10 Fixtures — *(ODT bestätigt, DOCX-Annahme eines früheren Entwurfs richtiggestellt am 2026-07-05)*
Für ODT liegen sechs reale, ungenutzte Link-Fixtures im Repo (seltener Glücksfall):
`tests/fixtures/external/odt/` mit `hyperlink.odt`, `hyperlinkSpaces.odt`,
`hyperlinkSpacesNoUnderline.odt`, `hyperlink_destination.odt`, `Hyperlink-AOO401.odt`
(mit echtem Apache OpenOffice 4.0.1 erzeugt) und — besonders wertvoll als Grenzfall —
`invalid_simple_overlapping_hyperlinks.odt` (überlappende/fehlerhafte Link-Strukturen).
**Wichtige Präzisierung:** `hyperlink_destination.odt` enthält entgegen seines Namens
**kein** `<text:a>` (direkt verifiziert 2026-07-05: `grep -c 'text:a ' → 0`) — es ist ein
Sprung*ziel*-Dokument ohne Link-Quelle und liefert für den Import-Pfad **keinen**
URL-Testwert; es bleibt reiner Crash-/Text-Erhalt-Test (siehe 5.2.5). Echte `<text:a>`-
Link-Quellen sind also nur die vier übrigen `hyperlink*`-Fixtures plus die Overlapping-Datei.

**Korrektur DOCX (2026-07-05, gegenüber einem früheren Entwurf dieser Datei):** Die frühere
Annahme, im DOCX-Bestand (`tests/fixtures/external/docx/`, 127 Dateien) existiere **keine**
belastbare Hyperlink-Fixture und eine solche müsse extern (python-docx/Apache-POI) beschafft
werden, ist durch direkte Inhaltsprüfung **widerlegt**. `unzip -p <datei> word/document.xml
| grep w:hyperlink` über alle 127 Dateien findet **12** mit echtem `<w:hyperlink>`:
`56392`, `58618`, `61991`, `TestDocument`, `WordWithAttachments`, `bug59058`, `bug65649`,
`bug65738`, `delins`, `drawing`, `rtl`, `smarttag-snippet` (jeweils `.docx`). Eine externe
Beschaffung ist damit **nicht** nötig. Besonders wertvoll (alle Werte am 2026-07-05 direkt
im ZIP verifiziert):
- **`bug65738.docx`** deckt beide Zweige aus 3.13/Grenzfall 15+17 in *einer* Datei ab:
  externe Links (`r:id="rId7"`–`rId10`, über die Relationship-Map aufzulösen) **und** interne
  Sprünge (`<w:hyperlink w:anchor="OnMainHeading">` / `"OnLevel3"` **ohne** `r:id`).
- **`56392.docx`** enthält einen `mailto:`-Link (`Target="mailto:klienti@livetelecom.cz"`,
  `TargetMode="External"`) und referenziert für den Linktext die Zeichenformatvorlage
  `<w:rStyle w:val="Internetovodkaz"/>` — **empirischer Beleg**, dass reale Word-Dateien die
  Link-Optik über eine Character-Style-Referenz führen (stützt die Design-Entscheidung in
  3.12) und dass `mailto:` nicht mit `https://` präfigiert werden darf (Grenzfall 7).
- **`rtl.docx`** enthält eine Unicode-/RTL-URL
  (`Target="https://ar.wikipedia.org/wiki/اللغة_الإسبانية"`, External) — Grenzfall 5/6.
- **`bug59058.docx`** und **`delins.docx`** enthalten **Feldcode-Hyperlinks**
  (`<w:fldChar>`-Sequenz mit `HYPERLINK`-Instruktion, im ZIP verifiziert) — die reale
  Fixture-Grundlage für Grenzfall 18 / 3.13, ebenfalls ohne externe Beschaffung. Die frühere
  Aussage, `WithTabs.docx` (E2E-Test E-3.13a) enthalte gar keinen Hyperlink, bleibt zwar
  zutreffend, ist aber irrelevant — belastbare Fixtures liegen anderswo im selben Verzeichnis.

**Konsequenz:** „fehlt" ist korrekt. Zu bauen sind: `link`-Mark (Schema inkl. `a[href]`-
`parseDOM` und `toDOM`), Command (setzen/bearbeiten/entfernen), Toolbar-Button + Dialog +
`Mod-k`, DOCX-Writer (+ Relationship-Typ + `TargetMode`), DOCX-Reader-`href`-Erfassung,
ODT-Writer (`<text:a>`), ODT-Reader-`href`-Erfassung — jeweils mit Tests. Ein
Datenverlust-Bug ist **nicht** zu beheben, weil der Text bereits erhalten bleibt.

---

## 1. Menüpunkte / Bedienelemente (Soll-Zustand)

| # | Element | Auslösung | Ist-Zustand (verifiziert) | Soll |
|---|---|---|---|---|
| 1 | Toolbar-Button „Link einfügen" | Klick auf Toolbar-Icon | **Fehlt** in `Toolbar.tsx` | Ergänzen, sinnvoll platziert (eigene Gruppe nahe Tabelle/Bild, analog Word „Einfügen → Link"); eindeutig erkennbares, eingebettetes SVG-Icon — kein Unicode-/Emoji-Zeichen (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1; die bestehenden Emoji-Buttons 🖼/⊞/🖍 sind dort bereits als Problemquelle benannt, das neue Icon soll dem `ScissorsIcon`-SVG-Muster in `Toolbar.tsx` Z. 33–53 folgen) |
| 2 | Tastenkombination Strg+K / Cmd+K | Tastendruck bei fokussiertem Editor | **Fehlt** (kein `Mod-k` in der `keymap`, `WordEditor.tsx` Z. 77–99) | Ergänzen — Standard-Shortcut; kollidiert nicht mit den bewusst nicht gebundenen `Mod-c/x/v` (Warnung Z. 78–84) |
| 3 | Eingabedialog/-popover für die Ziel-URL | Nach Klick auf Button oder Strg+K | Nicht vorhanden | Mindestens ein URL-Eingabefeld mit „Übernehmen" (Enter) und „Abbrechen" (Escape); bei leerer Selektion zusätzlich ein Feld für den Anzeigetext (siehe 3.2) |
| 4 | Vorbelegung mit bestehender URL, wenn der Cursor in einem Link steht | Button/Strg+K bei Cursor in vorhandenem Link | Nicht vorhanden | Aktuell hinterlegte URL vorausfüllen (Bearbeiten-Fall `hyperlink-bearbeiten`), keinen leeren Dialog öffnen |
| 5 | „Link entfernen" | Button/Menüpunkt, aktiv bei Cursor in einem Link | Nicht vorhanden (`hyperlink-entfernen`) | Entfernt ausschließlich das `link`-Mark, Text bleibt vollständig erhalten |
| 6 | Visuelle Standarddarstellung im Editor | reine Darstellung | Nicht vorhanden | Blau + unterstrichen als Default (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 14), unabhängig von zusätzlich gesetzten `textColor`/`underline`-Marks (siehe 3.8) |
| 7 | Aktiver-Zustand des Toolbar-Buttons | — | Nicht vorhanden | Analog `MarkButton`s `aria-pressed` (`Toolbar.tsx` Z. 75): Button „aktiv", wenn der Cursor in einem Link steht |
| 8 | Tooltip mit Ziel-URL beim Hover über einen Link | Mauszeiger über verlinktem Text | Nicht vorhanden | `title`-Attribut o. Ä., damit das Ziel ohne Klick prüfbar ist |
| 9 | Klickverhalten auf einen Link **innerhalb** des Editors | Klick/Strg+Klick auf verlinkten Text | Nicht definiert | Reiner Klick darf **nicht** navigieren (siehe 3.9 und Zusammenspiel mit `reconcileSelectionOnClick`, `WordEditor.tsx` Z. 43–50); Strg/Cmd+Klick öffnet in neuem Tab |
| 10 | Kontextmenü-Eintrag (Rechtsklick) | Rechtsklick auf Selektion/Link | Fehlt; der Editor hat bewusst kein eigenes Kontextmenü (`WordEditor.tsx` Z. 109–113) | Nice-to-have, **kein Blocker** (analog `seitenumbruch-req.md` Abschnitt 1) |
| 11 | Eintrag in einer künftigen Menüleiste | Klick | Nicht anwendbar — nur Toolbar vorhanden | Falls je eine Menüleiste kommt, dort ebenfalls anbieten; kein Blocker |

---

## 2. Geltende Randbedingungen aus der Haupt-Spezifikation

Diese Datei ergänzt, ersetzt aber nicht die Anforderungen aus
`FEATURE-SPEC-DOCX-ODT.md`, insbesondere:

- **Abschnitt 14 („Hyperlinks")**: „Link zu markiertem Text hinzufügen (URL-Eingabe).
  Link-Ziel bearbeiten, Link entfernen (Text bleibt). Visuelle Standarddarstellung
  (unterstrichen, farbig)." samt den dort genannten vier Testfällen — die
  Kernanforderung, die diese Datei im Detail ausarbeitet.
- **Abschnitt 17** (Menü-/Toolbar-Übersicht), Zeile 366: „Link
  einfügen/bearbeiten/entfernen — fehlt — siehe Abschnitt 14."
- **Abschnitt 18** (Import-Robustheit): „kein stiller Datenverlust bei nicht
  vollständig unterstützten Elementen". **Zur Klarstellung:** Dieser Grundsatz ist beim
  Linktext bereits erfüllt (siehe 0.4/0.5) — der frühere, hier gestrichene Vorwurf einer
  konkreten Verletzung war unzutreffend. Neu gilt der Grundsatz aber für die **Ziel-URL**
  und für Sonderformen (Feldcode-Hyperlinks, interne Sprünge, überlappende Links): auch
  hier darf im schlimmsten Fall höchstens die Verlinkung vereinfacht werden, nie der
  sichtbare Text verschwinden.
- **Abschnitt 19** (Export-Robustheit & Rundreise) und **Abschnitt 20.4** (kein stiller
  Fehlschlag) gelten uneingeschränkt.
- **Abschnitt 2** (Selection-Sync-Regressionsbug): Das Öffnen eines Dialogs/Popovers über
  einer Selektion mit anschließendem Anwenden eines Marks ist strukturell verwandt mit
  dem dort beschriebenen Fehlerbild; der `reconcileSelectionOnClick`-Mechanismus
  (`WordEditor.tsx` Z. 43–50) ist direkt betroffen. Muss mit derselben Regressionssequenz
  getestet werden (Grenzfall 4.14).
- **Abschnitt 20.1** (Icon-Rendering): gilt für das neue Link-Icon identisch.
- **Abschnitt 21** (Testmatrix): Hyperlinks sind dort in allen drei Spalten (Unit, E2E,
  reale Fixtures) als „fehlt" geführt — nach Umsetzung müssen alle drei grün werden,
  wobei die bereits vorhandenen Text-Erhalt-Tests aus 0.9 zu Ziel-URL-Tests erweitert
  (nicht ersetzt) werden.

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Grundfall: Link auf bestehende Selektion anwenden
- Ist mindestens ein Zeichen markiert und wird eine gültige URL bestätigt, erhält die
  **gesamte** Selektion ein `link`-Mark mit Attribut `href` (analog `addMark(from, to, …)`
  in `applyMarkColor`, `commands.ts` Z. 110).
- War die Selektion zuvor (teilweise) verlinkt, ersetzt die neue URL die alte vollständig
  (kein Verschachteln zweier Links auf demselben Text — das `link`-Mark muss sich selbst
  ausschließen; ProseMirror-Default für gleichnamige Marks ohne explizites `excludes`,
  siehe 3.13).
- War die Selektion **gemischt** (teils andere Links, teils unverlinkt): definiertes
  Ergebnis = gesamte Selektion erhält einheitlich die neue URL; mit Testfall nachweisen.
- Die Aktion ist ein einzelner Undo-Schritt.

### 3.2 Kein Text markiert (nur Cursor)
- Anders als bei Fett/Kursiv gibt es ohne Text nichts zu verlinken. `applyMarkColor`
  liefert für diesen Fall heute `return false` (No-Op) — für Links ist das zu wenig. Zu
  entscheiden und zu dokumentieren:
  - (a) Button/Shortcut ist bei leerer Selektion deaktiviert **oder** zeigt sichtbare
    Rückmeldung („bitte zuerst Text markieren"), **oder**
  - (b) der Dialog bietet zusätzlich ein Anzeigetext-Feld, dessen Inhalt bei Bestätigung
    als neuer, bereits verlinkter Text an der Cursor-Position eingefügt wird
    (Word-/Browser-übliches Verhalten).
- In jedem Fall: **kein** stiller No-Op ohne Rückmeldung (`FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 20 Punkt 4).

### 3.3 URL-Eingabe: Validierung und Normalisierung
- Leeres Feld / Abbrechen (Escape) darf keine Änderung vornehmen (keine `href=""`).
- URL ohne Protokoll (z. B. `beispiel.de`): zu klären, ob automatisch `https://`
  vorangestellt wird (Word-/Google-Docs-Verhalten) oder der Rohwert übernommen wird —
  Entscheidung dokumentieren, nicht implizit im Code lassen.
- `mailto:`- und `tel:`-Schemata müssen als gültige Ziele akzeptiert werden.
- **Sicherheitsrelevanter Grenzfall:** Ein `javascript:`-Schema darf nicht unverändert
  als klickbares `href` übernommen werden (XSS-Vektor über `toDOM`s `<a href="…">` bzw.
  über Export/Reimport). Muss gefiltert/abgelehnt/neutralisiert werden (Grenzfall 4.9).
  Gleiches gilt sinngemäß für `data:`-URLs.
- Relative Pfade (`../datei.docx`) sind laut Backlog nicht gefordert, dürfen aber, falls
  eingegeben, nicht zum Absturz führen — mindestens als Rohtext im `href` übernehmen und
  dokumentieren, dass eine Auflösung relativer Ziele nicht unterstützt wird.

### 3.4 Bearbeiten eines bestehenden Links
- Steht der Cursor (auch ohne Selektion) innerhalb eines verlinkten Bereichs und wird
  Button/Strg+K erneut ausgelöst, öffnet sich der Dialog mit der **aktuell hinterlegten
  URL vorausgefüllt** (Bedienelement 4).
- Bestätigen mit neuer URL ersetzt das `href`-Attribut auf dem **gesamten**
  zusammenhängenden verlinkten Bereich (die Mark-Grenzen bestimmen den Wirkungsbereich,
  nicht die Cursor-Position), auch ohne explizite Selektion.

### 3.5 Entfernen eines Links
- Entfernt ausschließlich das `link`-Mark (analog `removeMark`, vgl. `clearMarkColor`,
  `commands.ts` Z. 119); alle anderen Marks (fett, Farbe, Hervorhebung, …) auf demselben
  Text bleiben unverändert.
- Ohne Selektion, aber mit Cursor in einem Link: entfernt den Link für den **gesamten**
  zusammenhängenden Bereich (wie 3.4).
- Der Text selbst bleibt in jedem Fall unverändert (`FEATURE-BACKLOG.md` Zeile 236).

### 3.6 Visuelle Standarddarstellung
- Default: blau + unterstrichen (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 14).
- Zu klären und zu dokumentieren: wird die Optik direkt im `toDOM` des `link`-Marks als
  Inline-Style erzwungen (z. B. `color:#0563C1; text-decoration:underline`, angelehnt an
  Words Zeichenformatvorlage „Hyperlink") oder über eine CSS-Klasse im Editor-Stylesheet?
  Relevant für 3.8 (Zusammenspiel mit explizit gesetzten Marks).

### 3.7 Aktiver-Zustand des Toolbar-Buttons
- Analog `MarkButton` (`Toolbar.tsx` Z. 69/75, `markType.isInSet(...)` → `aria-pressed`):
  Der Link-Button muss „aktiv" erscheinen, wenn `$from.marks()` ein `link`-Mark enthält.

### 3.8 Kombination mit anderen Zeichenformaten
- Ein Link lässt sich gleichzeitig mit Fett, Kursiv, Unterstrichen, Durchgestrichen,
  Schriftfarbe und Hervorhebung auf denselben Textlauf anwenden; keines der anderen Marks
  darf beim Setzen/Ändern/Entfernen des Links verändert werden (Marks sind in ProseMirror
  ohne explizites `excludes` unabhängig).
- Zu klären und zu testen: Wenn zusätzlich eine explizite `textColor` gesetzt ist (z. B.
  Linktext rot gefärbt) — gewinnt die Default-Link-Optik (blau) oder die explizite
  `textColor` (rot)? Vorschlag (Word-/CSS-Kaskadenlogik): eine explizit gesetzte
  `textColor` überschreibt die implizite Link-Farbe optisch; das `href` bleibt unberührt.

### 3.9 Klickverhalten innerhalb des Editors
- Ein einfacher Klick auf verlinkten Text **während der Bearbeitung** darf **nicht**
  navigieren — sonst wäre der Text nie mehr zum Cursor-Setzen anklickbar. Zu beachten:
  `reconcileSelectionOnClick` (`WordEditor.tsx` Z. 43–50) kollabiert bei einem einfachen
  Klick (ohne Drag) die Selektion auf die Klickposition; das neue Link-Verhalten muss
  damit verträglich sein und darf es nicht aushebeln.
- Strg+Klick (Cmd+Klick auf Mac) öffnet die Ziel-URL in neuem Tab/Fenster (Word-/Google-
  Docs-Verhalten). Muss explizit implementiert/getestet werden, sonst gibt es gar keine
  Möglichkeit, einen Link testweise zu öffnen.

### 3.10 Zwischenablage / Kopieren & Einfügen
- Kopieren von verlinktem Text innerhalb des Editors und Einfügen an anderer Stelle behält
  `link` samt `href`.
- Einfügen von extern kopiertem `<a href="…">…</a>`-HTML (Webseite/E-Mail) muss als
  `link`-Mark mit korrektem `href` erkannt werden — dafür ist eine `parseDOM`-Regel für
  `a[href]` im Schema nötig, die aktuell **fehlt** (0.1). Ohne sie wird ein eingefügter
  Link stillschweigend zu unverlinktem Text degradiert (dasselbe Muster wie
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2, Testfall 4 zu Fremd-HTML).
- Einfügen von reinem Text, der wie eine URL aussieht (`https://beispiel.de` getippt oder
  als Klartext eingefügt), **muss nicht** automatisch verlinkt werden (Autolink ist ein
  optionales Komfort-Feature, **kein Blocker**) — falls nicht umgesetzt, bewusst als Lücke
  dokumentieren statt stillschweigend fehlen lassen.

### 3.11 Undo/Redo
- Einfügen, Bearbeiten und Entfernen sind jeweils **ein** eigenständiger Undo-Schritt.
- Redo stellt den rückgängig gemachten Zustand inkl. exaktem `href` identisch wieder her.

### 3.12 Export nach DOCX
- Ein zusammenhängender verlinkter Bereich wird als `<w:hyperlink r:id="rIdN">` um einen
  oder mehrere `<w:r>`-Läufe serialisiert (mehrere Läufe, falls der Bereich intern nach
  weiteren Marks aufgeteilt werden muss — vgl. `inlineToRuns`-Gruppierung, `writer.ts`
  Z. 41–67; diese braucht eine zusätzliche, den Läufen übergeordnete Wrapper-Ebene).
- Für jeden Link ein neuer Eintrag über die `RelationshipRegistry` mit Typ
  `RELATIONSHIP_TYPES.hyperlink` (**neu**, 0.7) und **`TargetMode="External"`** (**neu**,
  0.7); `Target` = rohe URL, keine Paketpfad-Auflösung.
- Zu entscheiden und zu dokumentieren (analog zur `w:shd`-vs.-`w:highlight`-Entscheidung
  in `textmarker-farbe-req.md`): Wird die Standardoptik über eine referenzierte
  Zeichenformatvorlage `<w:rStyle w:val="Hyperlink"/>` erzeugt (dann muss `styleDefs.ts`
  um einen **Character-Style** ergänzt werden — dort existieren aktuell **nur**
  Paragraph-Styles `Normal` + `Heading1`–`6`, keine Zeichenformatvorlage) oder direkt als
  Inline-`w:rPr` (`<w:color w:val="0563C1"/><w:u w:val="single"/>`)? Beide sind gültiges
  OOXML.
- Mehrere unmittelbar aufeinanderfolgende Links mit **unterschiedlichen** Zielen dürfen
  nicht zu einem gemeinsamen `<w:hyperlink>` zusammengefasst werden.

### 3.13 Import aus DOCX
- **Muss den `href` erfassen** (0.4): Beim Abstieg in `<w:hyperlink>` (`collectRuns`
  Z. 194–216) ist das `r:id`-Attribut zu lesen, über die vorhandene `readRelationships`-
  Map (Z. 24–35) zur Ziel-URL aufzulösen und als `link`-Mark auf die enthaltenen Läufe zu
  legen — Text und übrige Marks bleiben wie bisher erhalten. `readRelationships` selbst ist
  typneutral und muss nicht geändert werden; nur ihr Ergebnis ist zusätzlich für Links zu
  konsultieren.
- **Feldcode-Hyperlinks** (neu, Import-Robustheit): Word kann Links auch als komplexes
  Feld schreiben — `<w:fldSimple w:instr='HYPERLINK "https://…"'>…</w:fldSimple>` oder als
  `<w:fldChar>`-Sequenz mit `<w:instrText> HYPERLINK "https://…" </w:instrText>`. Der
  Reader steigt in `fldSimple` heute bereits ab (Text überlebt, 0.4), wertet die
  `HYPERLINK`-Instruktion aber nicht aus. **Mindestanforderung:** kein Textverlust (bereits
  erfüllt); **wünschenswert:** die URL aus der Instruktion parsen und als `link`-Mark
  setzen. Falls nur die Mindestanforderung umgesetzt wird, ist die Lücke bewusst zu
  dokumentieren (nicht stillschweigend). Reale Fixtures für genau diesen Fall liegen bereits
  im Repo (`bug59058.docx`, `delins.docx`, 0.10) — keine synthetische Konstruktion nötig.
- Ein `<w:hyperlink>` **ohne** `r:id`, aber mit `w:anchor` (interner Sprung zu einer
  Textmarke) ist **außerhalb** des Geltungsbereichs — der Text darf jedoch nicht verloren
  gehen (heute schon erfüllt, da `collectRuns` unabhängig vom `r:id` absteigt); als
  unverlinkter Text importieren, mit dokumentierter bewusster Einschränkung. Reale Fixture
  vorhanden: `bug65738.docx` (`w:anchor="OnMainHeading"`/`"OnLevel3"`, 0.10).

### 3.14 Export nach ODT
- Ein zusammenhängender verlinkter Bereich wird als
  `<text:a xlink:href="…" xlink:type="simple">…</text:a>` serialisiert; der `xlink`-
  Namespace ist bereits deklariert (0.8), keine neue Deklaration nötig.
- **Pflicht, nicht optional (verschärft Grenzfall 6 analog zu 0.7/3.12):** Der
  `xlink:href`-Wert **muss** mit der bereits vorhandenen `escapeXml`-Funktion
  (`src/formats/odt/xmlUtil.ts` Z. 1–8, dort schon für `dc:title` und Bild-`alt`
  genutzt) escaped werden, bevor er in das Attribut geschrieben wird. Anders als beim
  DOCX-Relationship-`Target` (eigene `.rels`-Datei, 0.7) landet die URL hier direkt
  inline im `content.xml`-Attributwert — ein rohes `&` oder `"` in der Test-URL
  `https://example.com/pfad?x=1&y=2` (5.1.1) erzeugt sonst ebenso zuverlässig
  ungültiges XML wie beim DOCX-Pfad, nur eine Datei früher im Export.
- Innerhalb des `<text:a>` muss der bestehende `text:span`/`TextStyleRegistry`-Mechanismus
  (`inlineToOdt` Z. 70–83, `styleRegistry.ts`) für gleichzeitig gesetzte Marks unverändert
  weiterarbeiten — `<text:a>` ist eine Wrapper-Ebene **um**, nicht **statt** des
  `text:span`.
- Zu entscheiden und zu dokumentieren (analog 3.12): referenziert der Link zusätzlich eine
  Zeichenformatvorlage „Internet Link" (LibreOffice-Konvention, Style-Name
  `Internet_20_Link`) für die Standardoptik, oder wird Blau/Unterstrichen direkt über die
  `TextStyleRegistry` als gewöhnliche Zeicheneigenschaft mitgeführt?

### 3.15 Import aus ODT
- **Muss den `href` erfassen** (0.5): Der `else`-Zweig in `walk` (`reader.ts` Z. 160–167)
  ist für `text:a` (Namespace `ODF_NAMESPACES.text`) so zu erweitern, dass er (a) aus
  `xlink:href` ein `link`-Mark erzeugt **und** (b) weiterhin in die Kind-Knoten absteigt
  (Rekursion wie bisher), damit ein innerer `text:span` mit eigener Formatierung erhalten
  bleibt. Der Text-Erhalt selbst ist bereits gegeben und darf nicht regressieren.
- Realer Grenzfall `invalid_simple_overlapping_hyperlinks.odt` (0.10): verschachtelte
  `<text:a>` (empirisch: äußeres `href="http://www.heise.de"`, inneres `href="www.mopo.de"`
  um dasselbe Wort) dürfen nicht abstürzen; mindestens der Text bleibt erhalten.
  **Definiert:** je Zeichen entsteht **genau ein** `link`-Mark (das äußerste `<text:a>`
  gewinnt deterministisch); es darf **nie** ein zweites `link`-Mark auf denselben Textknoten
  gelegt werden (ein ProseMirror-`marks`-Array mit zwei gleichnamigen Marks ergibt einen
  inkonsistenten Knoten — `Mark.setFrom` dedupliziert **nicht**, hier ist ein expliziter
  Guard nötig). Vereinfachung der Verlinkung ist zulässig (Fallback-Prinzip,
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 18), Textverlust nicht.

### 3.16 Kein stiller Fehlschlag
- Jede Aktion (setzen/bearbeiten/entfernen), die nicht ausgeführt werden kann (leere
  Selektion ohne definierten Fallback, ungültige/leere URL), muss sichtbare Rückmeldung
  erzeugen — nie ein Klick/Shortcut ohne Wirkung (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20
  Punkt 4). Ein bestehendes Muster ist der `cutError`-Mechanismus in `WordEditor.tsx`
  (Z. 58–66, auto-abklingende sichtbare Meldung).

---

## 4. Grenzfälle (müssen explizit geprüft werden)

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 1 | Leere Selektion (nur Cursor), Link-Aktion ausgelöst | Siehe 3.2: definiertes Verhalten (Deaktivierung/Rückmeldung oder Dialog mit Anzeigetext-Feld), kein stiller No-Op. |
| 2 | Gemischte Selektion (teils andere Links, teils unverlinkt) | Gesamte Selektion erhält einheitlich die neue URL (3.1); mit Testfall nachweisen. |
| 3 | Selektion über eine Bild-/Tabellengrenze hinweg (z. B. Strg+A); **sowie** eine reine `NodeSelection` auf einem Bild (Bild einmal angeklickt, kein Text markiert) oder eine `CellSelection` über mehrere Tabellenzellen hinweg | Kein Absturz; `link` wird nur auf textuelle Inline-Inhalte angewendet, nicht auf Bilder/Blockelemente. Eine reine `NodeSelection`/`CellSelection` enthält keinen linkfähigen Inline-Bereich und ist daher wie die leere Selektion in 3.2 zu behandeln (deaktivierter Button/Rückmeldung statt stillem No-Op) — mit Testfall nachweisen, da `state.selection.empty` bei einer `NodeSelection`/`CellSelection` `false` ist und ein naiver `!empty`-Check (analog `applyMarkColor`, `commands.ts` Z. 108–109) hier fälschlich „anwendbar" ergäbe. |
| 4 | Leeres URL-Feld bestätigt | Keine Änderung, keine `href=""`, kein Absturz. |
| 5 | Sehr lange URL (> 2000 Zeichen, z. B. signierter Cloud-Link) | Vollständig ohne Kürzung gespeichert und bei Rundreise erhalten; kein Crash. |
| 6 | URL mit Sonderzeichen (Leerzeichen, Umlaute, `&`, `"`, `<`) | Beim DOCX-/ODT-Export korrekt XML-escaped (`escapeXml`, in beiden Writern vorhanden), sonst ungültiges Export-XML. Besonders `&` in Query-Strings (`?x=1&y=2`). |
| 7 | `mailto:`- bzw. `tel:`-Ziel | Wie jede andere URL behandelt (3.3), bleibt bei Rundreise erhalten, nicht fälschlich mit `https://` präfigiert. |
| 8 | Zwei unmittelbar aufeinanderfolgende Links mit unterschiedlichen Zielen | Bleiben zwei getrennte `<w:hyperlink>`- bzw. `<text:a>`-Elemente, werden nicht zusammengefasst (3.12). |
| 9 | `javascript:`- oder `data:`-Schema als Ziel-URL | Siehe 3.3: darf nicht als klickbares `href` im Editor-DOM landen (XSS); filtern/escapen/ablehnen — Ergebnis dokumentieren. |
| 10 | Link über einen `hard_break` hinweg (Umschalt+Enter innerhalb des Links) | Link bleibt auf beiden Seiten erhalten, zerfällt bei Rundreise nicht in zwei Links. **Achtung (vorbestehender, hyperlink-unabhängiger Bug):** In beiden Readern **und** Writern trägt ein `hard_break` heute **keine** Marks — ohne Fix landet er als linkloser Lauf zwischen zwei verlinkten Läufen und unterbricht die Verlinkung. Das Mitschreiben/-lesen der Marks am `hard_break` ist für diesen Grenzfall daher Pflicht. |
| 11 | Link in einer Tabellenzelle | Rundreise erhält Zuordnung zur richtigen Zelle, kein Übergreifen auf Nachbarzellen. |
| 12 | Link, der eine komplette Überschrift (`heading`) umfasst | Link bleibt, Überschriften-Level unverändert; Node-Level und Inline-`link`-Mark sind unabhängig. |
| 13 | Entfernen des Links in leerem Listenpunkt/leerer Zelle | Kein Rendering-Fehler, kein leerer `<w:r>`/`<text:span>` ohne Inhalt. |
| 14 | **Selection-Sync-Regressionssequenz** (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2, `WordEditor.tsx` Z. 43–50): Text markieren → Link-Dialog öffnen und bestätigen → per Klick neu positionieren → weiter tippen | Pflicht: Das Öffnen/Schließen des Dialogs über einer Selektion darf die ProseMirror-Selektion nicht inkonsistent machen; nachfolgendes Tippen löscht/ersetzt nichts Falsches. |
| 15 | Import einer echten, mit Word erzeugten DOCX mit `<w:hyperlink r:id>` | Text bleibt (heute schon) **und** Ziel-URL wird erfasst (neu, 0.4/3.13). Reale Fixtures liegen vor (0.10): u. a. `56392.docx` (`mailto:`), `rtl.docx` (Unicode-/RTL-URL), `bug65738.docx` (`rId7`–`rId10`) — keine externe Beschaffung nötig. |
| 16 | Import `invalid_simple_overlapping_hyperlinks.odt` (verschachtelte `<text:a>`) | Kein Absturz, Text mindestens vollständig (3.15). **Zusätzlich:** deterministisch **genau ein** `link`-Mark pro Zeichen (äußerstes `<text:a>` gewinnt), niemals zwei `link`-Marks im selben `marks`-Array. |
| 17 | Import mit internem Sprungziel (`w:anchor` bzw. ODF-Textmarken-Verweis) | Außerhalb des Geltungsbereichs, aber Text darf nicht verloren gehen (heute erfüllt); bewusste, dokumentierte Einschränkung statt stiller Datenverlust. Reale Fixture vorhanden: `bug65738.docx` (`w:anchor="OnMainHeading"`/`"OnLevel3"` **ohne** `r:id`, neben den externen `r:id`-Links). |
| 18 | Import DOCX mit **Feldcode-Hyperlink** (`fldChar`-Sequenz mit `HYPERLINK`-`instrText` bzw. `fldSimple`) | Text bleibt (heute erfüllt); URL-Erfassung wünschenswert, sonst dokumentierte Lücke (3.13). Reale Fixtures vorhanden: `bug59058.docx`, `delins.docx` (0.10). |
| 19 | Cross-Format: ODT mit Link (`hyperlink.odt`) importieren → als DOCX exportieren | Link bleibt, wird korrekt als `<w:hyperlink>` + externe Relationship erzeugt, unabhängig vom Ursprungsformat. |
| 20 | Doppelklick auf verlinkten Text (Wort-Selektion, bestehende Grundfunktion) | Funktioniert weiter normal, wird durch 3.9 nicht beeinträchtigt, löst keine Navigation aus. |
| 21 | **E2E-Testfalle (neu, 2026-07-05):** Text per Tastatur selektieren (z. B. Umschalt+Pfeil) und **unmittelbar danach** Strg/Cmd+K drücken bzw. auf den Link-Button klicken | Muss die tatsächlich beabsichtigte Selektion treffen, nicht eine kurzzeitig veraltete. Empirisch belegtes, editor-weites (nicht linkspezifisches) Muster: ProseMirror erfährt eine rein tastaturgetriebene Selektionsänderung erst über das asynchrone `selectionchange`-Event des Browsers; ein unmittelbar folgender Befehl kann diesem Sync vorauslaufen und auf der veralteten (kürzeren) Selektion wirken. Bereits zweimal genau in dieser Form aufgetreten und behoben: `tests/e2e/selection-regression.spec.ts` (Commit `0797d13`, Kommentar dort erklärt den Mechanismus im Detail) und `tests/e2e/cut.spec.ts` (Commit `db61c89`, ~50–65 % Flakiness auf dem Mobile-Projekt vor dem Fix). **Jeder** E2E-Test aus Testplan-Punkt 4/9, der eine Tastatur- statt Maus-Selektion vor Mod-k/Klick verwendet, muss nach der Selektionserweiterung dieselbe kurze Wartezeit einbauen wie diese beiden bestehenden Specs — sonst droht dieselbe, bereits zweimal beobachtete Flakiness auch hier. Eine reine Maus-Selektion (Klick+Ziehen) ist von dieser Falle nicht betroffen. |

---

## 5. Rundreise-Anforderung (Pflicht für Abnahme)

Für **jeden** Fall gilt: Datei mit Hyperlink hochladen (bzw. im Editor erzeugen) →
**unverändert** exportieren → erneut importieren → Link ist inhaltlich exakt erhalten
(gleiche Textstelle, gleiche Ziel-URL, kein Verlust, kein zusätzlicher/fehlender Link) —
und der reine Text darf ohnehin nie verloren gehen (bereits abgesichert, 0.4/0.5, darf
nicht regressieren).

### 5.1 DOCX
1. Im Editor Text markieren, Link mit Ziel-URL (z. B. `https://example.com/pfad?x=1&y=2`)
   setzen, als DOCX exportieren → mit unabhängigem Parser (python-docx oder direktes
   Parsen von `word/document.xml` + `word/_rels/document.xml.rels`) verifizieren:
   - `word/document.xml` enthält `<w:hyperlink r:id="rIdN">` um genau die erwarteten
     Runs, kein anderer Text ist mitbetroffen.
   - `word/_rels/document.xml.rels` enthält für `rIdN` einen Eintrag mit
     `Type=".../hyperlink"`, `Target="https://example.com/pfad?x=1&y=2"` **und**
     `TargetMode="External"` (0.7 — expliziter Test, da das Fehlen dieses Attributs der
     naheliegendste Implementierungsfehler ist).
2. Dieselbe Datei erneut importieren → URL exakt an derselben Textstelle, restlicher Text
   unverlinkt.
3. Link + Fett + Schriftfarbe gleichzeitig auf denselben Lauf → Rundreise erhält alle
   drei gemeinsam, nicht versehentlich auf getrennte Läufe/Wrapper aufgeteilt.
4. Link entfernt → Export enthält für den Bereich **kein** `<w:hyperlink>` mehr und
   **keinen** verwaisten Relationship-Eintrag ohne Referenz im `document.xml`.
5. **Kritischer Import-Test (0.4 / Grenzfall 15):** die realen, **im Repo bereits
   vorhandenen** DOCX-Fixtures mit echtem `<w:hyperlink>` (0.10) importieren — mindestens
   `56392.docx` (`mailto:`), `rtl.docx` (Unicode-URL) und `bug65738.docx` (externe
   `r:id`-Links **und** interne `w:anchor`-Sprünge) → Linktext **und** Ziel-URL vollständig
   erhalten, interne Sprünge als unverlinkter Text ohne Absturz. Zusätzlich Feldcode-Fall
   (`bug59058.docx`/`delins.docx`, Grenzfall 18). Keine externe Fixture-Beschaffung nötig.
6. Link, der einen `hard_break` einschließt → auf beiden Seiten erhalten (Grenzfall 10).
7. Cross-Format: ODT mit Link importieren → als DOCX exportieren → URL erhalten, korrekt
   als `<w:hyperlink>` + externe Relationship.

### 5.2 ODT
1. Im Editor Text markieren, Link setzen, als ODT exportieren → `content.xml` enthält
   `<text:a xlink:href="…" xlink:type="simple">…</text:a>` um genau den Text, mit
   erhaltenem inneren `text:span`, falls Zusatzformatierung vorhanden.
2. Dieselbe Datei erneut importieren → URL exakt erhalten.
3. Link entfernt → Export enthält kein `<text:a>` mehr; verbleibender `text:span` (falls
   andere Marks) bleibt korrekt.
4. Cross-Format: DOCX mit Link importieren → als ODT exportieren → URL erhalten.
5. **Kritischer Import-Test (0.5):** die vier realen `<text:a>`-Link-Fixtures
   `hyperlink.odt`, `hyperlinkSpaces.odt`, `hyperlinkSpacesNoUnderline.odt` und
   `Hyperlink-AOO401.odt` importieren → in jeder bleiben Linktext **und** Ziel-URL
   erhalten. (Text ist heute schon erhalten, 0.9; die Ziel-URL ist der neue, zu
   erfüllende Teil.) **Nicht** in diesem Set: `hyperlink_destination.odt` — es enthält
   trotz des Namens **kein** `<text:a>` (verifiziert, 0.10), ist ein Sprung*ziel*-Dokument
   ohne Link-Quelle und liefert daher keinen URL-Testwert; es bleibt reiner Crash-/
   Text-Erhalt-Test (Punkt 6).
6. Fixtures `invalid_simple_overlapping_hyperlinks.odt` (Grenzfall 16) und
   `hyperlink_destination.odt` (Sprungziel ohne `<text:a>`, 0.10) → jeweils kein Absturz,
   Text vollständig lesbar; bei der Overlapping-Datei zusätzlich genau ein `link`-Mark pro
   Zeichen (3.15).

### 5.3 Doppelte Rundreise / Cross-Format hin und zurück
1. DOCX mit Link → Editor → Export als ODT → erneuter Import → Export zurück als DOCX →
   Link nach zwei Konvertierungen weiterhin an exakt derselben Textstelle mit derselben
   URL.
2. Dieselbe Prüfung mit Startpunkt ODT.
3. Dokument mit mehreren verschiedenen Links (drei URLs an drei Stellen) → nach doppelter
   Rundreise bleibt jede URL korrekt der richtigen Textstelle zugeordnet (keine
   Vertauschung).

**Abnahmekriterium:** Style-Nuancen bei Cross-Format-Konvertierung (Zeichenformatvorlage
„Hyperlink"/„Internet Link" vs. direktes Inline-Styling, 3.12/3.14) sind zu dokumentieren
und akzeptabel; **das Verschwinden eines Links, seiner Ziel-URL oder seines Textinhalts
ist es nicht.**

---

## 6. Testplan-Hinweise (Unit + E2E, Playwright)

1. **Reader-`href`-Tests erweitern (nicht ersetzen):** Die bestehenden Text-Erhalt-Tests
   (0.9: docx `reader.test.ts` U-6, odt `external-fixtures.test.ts` U-4) bleiben als
   Regressionsschutz und werden je Format um eine Assertion auf das erzeugte `link`-Mark
   mit korrektem `href` ergänzt (DOCX aus `r:id`+Relationship aufgelöst, ODT aus
   `xlink:href`).
2. **Unit-Tests DOCX Writer:** gegebener interner `link`-Mark → Writer erzeugt
   `<w:hyperlink r:id="…">` um die richtigen Läufe **plus** einen
   `TargetMode="External"`-Relationship-Eintrag; Gegenrichtung über den Reader.
3. **Unit-Tests ODT:** analog für `<text:a xlink:href="…">`, inkl. Fall mit innerem
   `text:span` (kombinierte Formatierung überlebt).
4. **E2E (Playwright):** Text im Editor markieren (`.ProseMirror`), Toolbar-Button „Link
   einfügen" klicken bzw. `ControlOrMeta+K` drücken, URL eingeben, bestätigen → Link
   sichtbar im DOM (`a[href]` o. Ä.), Tooltip zeigt die URL.
5. „Link entfernen" per echtem Klick → `href`/Link-Markup verschwindet aus dem DOM, Text
   bleibt.
6. „Link bearbeiten" → Dialog zeigt bestehende URL vorausgefüllt, neue URL wird
   übernommen.
7. Undo direkt nach Link-Setzen → Link weg, Text bleibt; Redo stellt ihn wieder her.
8. **Selection-Sync-Regressionspflicht:** Jeder E2E-Test aus Punkt 4 führt direkt danach
   eine Tipp-/Formatierungsaktion aus und prüft deren korrektes Ergebnis (Grenzfall 14,
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2). **Zusätzlich (Grenzfall 21, neu 2026-07-05):**
   Erfolgt die Selektion vor Mod-k/Klick per Tastatur (Umschalt+Pfeil) statt per Maus, ist
   nach der Selektionserweiterung/dem Loslassen von Umschalt dieselbe kurze Wartezeit
   einzubauen wie in `tests/e2e/selection-regression.spec.ts` (Commit `0797d13`) und
   `tests/e2e/cut.spec.ts` (Commit `db61c89`) — sonst kann Mod-k/der Klick auf einer
   veralteten, kürzeren Selektion feuern (asynchrones `selectionchange`), bevor
   ProseMirror die per Tastatur erweiterte Selektion übernommen hat.
9. Vollständiger Rundreisetest je Format (5.1/5.2) über echten Datei-Upload
   (`filechooser`) und echten Download (`page.waitForEvent('download')`), nicht nur über
   intern aufgerufene Reader/Writer.
10. **Reale Fixture-Tests:** die vier ODT-`<text:a>`-Link-Fixtures + die Overlapping-Fixture
    + `hyperlink_destination.odt` (Crash-Test, 0.10) einzeln importieren, Ergebnis (Text
    vollständig? URL korrekt? Absturz?) dokumentieren. Für DOCX **ebenso mit den bereits im
    Repo vorhandenen** Fixtures (0.10) — **keine externe Beschaffung nötig**: mindestens
    `56392.docx` (`mailto:` + `w:rStyle`), `rtl.docx` (Unicode-URL), `bug65738.docx` (extern
    `r:id` **und** intern `w:anchor`) sowie für den Feldcode-Fall `bug59058.docx`/`delins.docx`
    (3.13).
11. **Sicherheitstest (Grenzfall 9):** eingegebene/eingefügte `javascript:`- bzw.
    `data:`-URL führt nicht zu ausführbarem Code im DOM/Export.
12. **Cross-Format-Doppel-Rundreise** (5.3) einmal DOCX→ODT→DOCX, einmal ODT→DOCX→ODT.

---

## 7. Freigabekriterium für „vorhanden"

Der Backlog-Status von `hyperlink-einfuegen` (sowie sinngemäß `hyperlink-bearbeiten` und
`hyperlink-entfernen`) darf erst als **vorhanden** gelten, wenn:

- alle Bedienelemente aus Abschnitt 1 existieren und funktionieren (Toolbar-Button mit
  SVG-Icon, `Mod-k`-Shortcut, Dialog, Vorbelegung beim Bearbeiten, „Entfernen", aktiver
  Zustand, Tooltip, definiertes Klickverhalten),
- **die URL-Erfassung beim Import** für beide Formate umgesetzt ist (DOCX `r:id`→
  Relationship→`link`-Mark, ODT `xlink:href`→`link`-Mark, 0.4/0.5/3.13/3.15) — der
  Text-Erhalt darf dabei **nicht** regressieren (bestehende Tests aus 0.9 bleiben grün),
- die neuen `RELATIONSHIP_TYPES.hyperlink`- und `TargetMode="External"`-Erweiterungen in
  `docx/relationships.ts` umgesetzt und mit einem unabhängigen Parser verifiziert sind,
- der DOCX- und der ODT-Schreibpfad (`<w:hyperlink>` bzw. `<text:a>`) inklusive
  Koexistenz mit anderen Marks umgesetzt sind (0.6/0.8/3.12/3.14),
- alle Testfälle aus Abschnitt 6 automatisiert vorliegen und grün sind,
- alle Grenzfälle aus Abschnitt 4 einzeln befundet sind (funktioniert wie spezifiziert /
  bewusst abweichendes, dokumentiertes Verhalten / repariert),
- Abschnitt 5 (Rundreise: DOCX, ODT, Cross-Format, doppelt) vollständig besteht,
  inklusive der vier realen ODT-`<text:a>`-Fixtures **und** der im Repo bereits vorhandenen
  DOCX-Link-Fixtures aus 0.10 (`56392`, `rtl`, `bug65738` sowie Feldcode `bug59058`/`delins`)
  — keine externe Fixture-Beschaffung als Freigabevoraussetzung,
- der Selection-Sync-Regressionstest (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2) explizit mit
  einer Link-Einfüge-Sequenz nachgestellt und grün ist,
- die Design-Entscheidungen aus 3.6/3.12/3.14 (Zeichenformatvorlage vs. Inline-Styling)
  sowie 3.3 (Protokoll-Normalisierung) getroffen und dokumentiert sind,
- der `javascript:`/`data:`-Sicherheitsgrenzfall (4.9) geklärt und abgesichert ist,
- der Umgang mit Feldcode-Hyperlinks und internen Sprungzielen (3.13/Grenzfälle 17/18)
  entweder umgesetzt oder als bewusste, dokumentierte Einschränkung festgehalten ist.

Andernfalls ist der Status auf **teilweise** zu setzen und die konkret fehlenden
Teilpunkte sind hier nachzutragen (analog `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21 und
`seitenumbruch-req.md` Abschnitt 7).

---

## 9. Umsetzungsstand (2026-07-11)

**Vollständig umgesetzt** in vier Scheiben: `9a84fa4` (link-Mark + ODT-Pfad), `d576c5f`
(Relationship-Härtung: Target-Escaping — latenter Korruptions-Bug —, TargetMode="External",
hyperlink-Rel-Typ), `bf3516d` (DOCX-Import inkl. realer Fixture bug65738.docx), `813a664`
(DOCX-Export) und diese UI-Scheibe. Verifiziert: Unit 733/733; E2E `hyperlink.spec.ts`
11 Testfälle grün auf Desktop Chrome, Mobile und Tablet (Rundreisen DOCX+ODT über echten
Download/Re-Upload inkl. Roh-XML-Assertions).

**Getroffene Entscheidungen (je „zu klären" aus §1/§3):**
- **§3.2 → Variante (b):** Bei leerem Cursor bietet der Dialog ein Pflichtfeld
  „Anzeigetext"; der bestätigte Text wird bereits verlinkt eingefügt (Word-/Docs-üblich).
  Kein stiller No-Op: leere/abgelehnte Eingaben erzeugen sichtbare Dialog-Fehlermeldungen.
- **§3.3 Normalisierung:** ohne Schema → `https://` vorangestellt; `mailto:`/`tel:`
  unverändert; `javascript:`/`data:`/`vbscript:` (auch mit Whitespace verschleiert)
  werden mit sichtbarer Meldung ABGELEHNT; relative Pfade/Anker werden roh übernommen
  (Auflösung nicht unterstützt, crasht nie). Implementierung `normalizeLinkHref`.
- **§1 #5 Entfernen:** lebt als „Link entfernen"-Button IM Dialog (der Link-Button ist
  der eine Einstieg für Einfügen/Bearbeiten/Entfernen) — kein separater Toolbar-Button.
- **§3.6 Optik:** über Editor-Stylesheet (`.ProseMirror a`, Word-Blau #0563C1 +
  unterstrichen), NICHT im toDOM erzwungen; §3.8: explizite `textColor` gewinnt optisch
  (Inline-Style des inneren span schlägt die Kaskade), `href` unberührt.
- **§3.9 Klick:** einfacher Klick setzt nur den Cursor (kompatibel mit der
  Klick-Reparatur); Strg/Cmd+Klick öffnet das Ziel in neuem Tab mit
  `noopener,noreferrer`.
- **§3.12 DOCX-Optik:** referenzierte Zeichenvorlage `<w:rStyle w:val="Hyperlink"/>`
  (Character-Style in styles.xml) statt direkter `w:color`/`w:u`-Werte — der Reader
  liest so beim Reimport keine künstlichen textColor/underline-Marks zurück
  (Rundreisen-Treue); direkte Formatierung gewinnt in Word über die Vorlage (§3.8).
- **§3.10 Autolink** (getippte URL automatisch verlinken): bewusst NICHT umgesetzt —
  optionales Komfort-Feature laut req, als Lücke dokumentiert.
- **§1 #7 Aktiv-Zustand:** über `isMarkActive` (Ganz-Range-Semantik wie alle
  Mark-Buttons — strenger als das in §3.7 geforderte `$from.marks()`-Minimum).

**Grenzfall 10 (Link über hard_break)** bleibt als vorbestehender, hyperlink-unabhängiger
Befund offen: hard_break trägt in Readern/Writern keine Marks — ein Link über einen
Zeilenumbruch hinweg zerfällt bei der Rundreise in zwei Links gleichen Ziels (kein Text-,
kein Zielverlust). Eigenes Arbeitspaket.
