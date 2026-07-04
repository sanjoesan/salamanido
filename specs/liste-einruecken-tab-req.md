# Anforderungsspezifikation: „Listenebene per Tab ändern" (`liste-einruecken-tab`)

Status: Laut Backlog (`specs/FEATURE-BACKLOG.md`, Abschnitt „2.6 Listen", Zeile
`liste-einruecken-tab`, Titel „Listenebene per Tab ändern", Beschreibung „Tab/
Umschalt+Tab verschiebt einen Listenpunkt eine Ebene tiefer/höher.", Priorität
**1 – essenziell**) als **„fehlt"** geführt. Gemäß Aufgabenstellung gilt auch dieser
Status als **nicht vertrauenswürdig** und muss vollständig verifiziert werden — in
beide Richtungen: Es muss geprüft werden, dass wirklich **nichts** vorhanden ist (kein
UI-Fragment, kein Datenmodell-Rest, der „fehlt" fälschlich zu „teilweise" machen
würde), **und** es muss anschließend gegen genau diese Spezifikation gebaut und
abgenommen werden. Diese Datei ist die verbindliche Anforderung, gegen die diese
Verifikation (Code-Audit + echte Browser-Bedienung + Rundreise-Tests) durchgeführt
wird, bevor der Backlog-Status auf „verifiziert" gehoben werden darf.

Bezug:
- `specs/FEATURE-BACKLOG.md`, Zeile 158 (Slug `liste-einruecken-tab`), sowie die
  benachbarten, eng verwandten aber **separaten** Slugs Zeile 157 (`mehrstufige-liste`,
  Status ebenfalls „fehlt", Priorität 2) und Zeilen 154–156 (`aufzaehlungsliste`,
  `nummerierte-liste`, `liste-aufheben`, jeweils Status „vorhanden").
- `E:\docs\FEATURE-SPEC-DOCX-ODT.md` Abschnitt 5 (Listen), Testfall 3 („Mehrstufige
  Liste … aktuell **nicht getestet, vermutlich nicht implementiert** — muss geprüft
  werden") und Testfall 4 („Tab/Umschalt+Tab ändert Ebene korrekt und aktualisiert die
  Nummerierung sichtbar"); Abschnitt 15, Testfall 3 (Abgrenzung Tab **außerhalb** einer
  Liste); Abschnitt 21 (Testmatrix), Zeile „Listen | teilweise (flach) | fehlt | offen".
- Stil/Methodik orientiert sich an `FEATURE-SPEC-DOCX-ODT.md` sowie an den bereits
  vorliegenden Einzel-Anforderungsdateien `specs/schriftart-waehlen-req.md` (Vorlage für
  eine als „fehlt" geführte, komplett neu zu bauende Funktion) und
  `specs/ausrichtung-links-req.md` (Vorlage für Detailtiefe bei Grenzfällen und
  Rundreise-Matrix).

## Code-Audit zum Zeitpunkt dieser Anforderungsdefinition (Befund)

Der Status „fehlt" ist für die **Tastenbedienung** zutreffend — es existiert keine
Tab-/Umschalt+Tab-Bindung irgendwo im Editor. Die zugrunde liegende Schema-Struktur ist
jedoch bereits **teilweise** nestingfähig, und für ODT existiert sogar bereits ein
generischer Lese-/Schreib-Rekursionspfad, der Verschachtelung strukturell abbilden
*könnte* — nur eben nirgends über die UI erzeugbar ist und für DOCX beim Export aktiv
zerstört wird. Im Einzelnen:

| Ebene | Fundstelle | Befund |
|---|---|---|
| Tastaturbindung | `src/formats/shared/editor/WordEditor.tsx:71-80` (Keymap) | Nur `Enter: splitListItem(...)`, `Mod-z`/`Mod-y`/`Mod-Shift-z`, `Mod-b`/`Mod-i`/`Mod-u` gebunden. **Kein** `Tab`/`Shift-Tab`-Eintrag. `keymap(baseKeymap)` (Zeile 80, `prosemirror-commands`) bindet ebenfalls kein `Tab`. Ein Tab-Tastendruck im Editor wird von ProseMirror also nicht abgefangen (kein `preventDefault`) — zu verifizieren, aber nach Stand des Codes zu erwarten: der Browser behandelt es als normale Fokus-Navigation und der Fokus verlässt das `contenteditable`-Element in Richtung des nächsten fokussierbaren DOM-Elements (z. B. den ersten Toolbar-Button oder das Browser-Chrome), statt irgendeine Editor-Aktion auszulösen. |
| Commands-Modul | `src/formats/shared/editor/commands.ts:1-4` (Imports), `:62-64` (`liftFromList`) | Importiert nur `wrapInList, liftListItem` aus `prosemirror-schema-list`. **`sinkListItem` wird nirgends importiert oder verwendet.** Es existiert also aktuell **keine** Funktion, die einen Listenpunkt tiefer einrücken (verschachteln) könnte — nur `liftFromList()` (Ausrücken/Entfernen) ist vorhanden. |
| Toolbar | `src/formats/shared/editor/Toolbar.tsx:214-224` | Ein einziger listenbezogener „Ausrücken"-Button vorhanden: `title="Liste aufheben"`, ruft `liftFromList()` auf, Label „⇧ Liste". Es gibt **keinen** Button „Einzug erhöhen"/„Einzug verringern" für Listenpunkte und keinerlei sichtbaren Hinweis auf die Tastenkombination Tab/Umschalt+Tab (kein `title`, das etwa „Tab" erwähnt). |
| Schema | `src/formats/shared/schema.ts:98-104` (`list_item`) | `content: 'paragraph block*'` — strukturell bereits **nestingfähig**: ein `bullet_list`/`ordered_list`-Knoten (beide Gruppe `block`, `schema.ts:74-96`) darf als weiteres Kind eines `list_item` stehen. Das ist exakt das von `prosemirror-schema-list` erwartete Verschachtelungsmuster. Die Schema-Definition selbst ist also **kein** Hindernis — die Lücke liegt ausschließlich im fehlenden Befehl/der fehlenden Tastenbindung sowie in Reader/Writer (siehe unten). |
| `prosemirror-schema-list`-Semantik (Bibliothek, `node_modules/prosemirror-schema-list/dist/index.js:265-287` für `sinkListItem`, `:206-260` für `liftListItem`) | — | `sinkListItem`: verschachtelt den/die Listenpunkt(e) der Selektion **unter den unmittelbar vorherigen Geschwister-Punkt**; gibt `false` zurück (No-Op), wenn der erste Punkt einer Liste betroffen ist (`startIndex == 0`, Zeile 271-273) — es gibt dann keinen vorherigen Punkt, unter den eingerückt werden könnte. `liftListItem`: prüft, ob der Punkt bereits **innerhalb** einer verschachtelten Unterliste steckt (`$from.node(range.depth - 1).type == itemType`, Zeile 214) — falls ja, wird nur **eine** Ebene ausgerückt (`liftToOuterList`); falls **nein** (Punkt liegt auf der obersten Ebene), wird der gesamte betroffene Bereich **komplett aus der Liste entfernt** und zu normalen Absätzen (`liftOutOfList`, Zeile 238-260) — **das ist exakt das heutige Verhalten des Buttons „Liste aufheben"**, weil aktuell ohnehin nie eine verschachtelte Struktur existiert. |
| DOCX-Import | `src/formats/docx/reader.ts:192-201` (`listMarkerFor`), `:258-283` (`groupLists`) | Liest ausschließlich `w:numId` aus `w:pPr/w:numPr`. **`w:ilvl` (Einzugsebene) wird nirgends gelesen.** `groupLists` reiht alle Absätze mit derselben `numId` **flach** in eine einzige `bullet_list`/`ordered_list` mit lauter gleichrangigen `list_item`-Kindern ein — unabhängig davon, welche Einzugsebene die Originaldatei pro Absatz trägt. Eine reale, mehrstufige Fremddatei (z. B. `tests/fixtures/external/docx/ComplexNumberedLists.docx`, bereits im Repo vorhanden) verliert die Ebenen-Information also **bereits beim Import** vollständig. |
| DOCX-Numbering-Definition | `src/formats/docx/styleDefs.ts:32-46` (`numberingXml`) | `w:abstractNum` für Bullet **und** für Ordered definiert jeweils nur **ein einziges** `<w:lvl w:ilvl="0">` (Zeilen 41-42). Für `w:ilvl` 1–8 existiert **keine** Definition — selbst wenn eine Datei mit `w:ilvl="1"` geschrieben würde, fehlte Word das dazugehörige Format (Symbol/Einzug) für diese Ebene. |
| DOCX-Export | `src/formats/docx/writer.ts:94-126`, insbesondere `:112-118` (Fall `bullet_list`/`ordered_list`) | Schreibt für **jeden** Absatz in einer Liste hart `<w:ilvl w:val="0"/>` (Zeile 103, Parameter `listNumId` wird nur für „welche `numId`", nicht für die Ebene verwendet). Enthält ein `list_item` verschachtelt eine weitere `bullet_list`/`ordered_list` (also genau die vom Schema erlaubte, durch `sinkListItem` erzeugbare Struktur), rekursiert `blockToDocx` erneut in den `bullet_list`/`ordered_list`-Fall (Zeile 112-118) und **berechnet dort die `numId` neu allein aus dem Knotentyp** (Zeile 114) — der von außen übergebene `listNumId`-Parameter der äußeren Ebene wird dabei verworfen. Ergebnis: Ein verschachtelter Listenpunkt landet im exportierten DOCX als ganz normaler Absatz **derselben** Nummerierung und **derselben** Ebene 0 wie die oberste Ebene — die Verschachtelung wird beim Export **vollständig und stillschweigend flachgelegt**. Dies ist über reines Lesen des Codes bereits als konkreter Defekt nachweisbar, nicht nur eine Vermutung. |
| ODT-Import | `src/formats/odt/reader.ts:164-187` (`elementToBlocks`), insbesondere `:179-187` (Fall `text:list`) | Rekursiert **generisch**: Für jedes Kind eines `text:list-item` wird erneut `elementToBlocks` aufgerufen (Zeile 184) — steht dort ein weiteres `text:list`-Element, entsteht dadurch bereits heute eine korrekt verschachtelte `bullet_list`/`ordered_list`-JSON-Struktur. Dieser Pfad ist **nicht** durch einen expliziten Test abgesichert (siehe unten), funktioniert nach Code-Lage aber strukturell bereits für den **Import** einer bereits mehrstufigen ODT-Fremddatei (z. B. `tests/fixtures/external/odt/listLevel10.odt`, `simpleList3.odt`, bereits im Repo vorhanden). |
| ODT-Export | `src/formats/odt/writer.ts:61-85`, insbesondere Fall `bullet_list`/`ordered_list` (Zeile 75-85) | Ebenfalls generisch rekursiv: Ein verschachtelter `bullet_list`/`ordered_list`-Knoten innerhalb eines `item.content` erzeugt beim Rekursionsaufruf (`blockToOdt`, Zeile 80) korrekt ein weiteres `<text:list>`-Element **innerhalb** des `<text:list-item>` — das ist strukturell das laut ODF-Spezifikation korrekte Muster für verschachtelte Listen. Die **Struktur** wird also nicht zerstört. |
| ODT-Listenstil-Definition | `src/formats/odt/styleRegistry.ts:95-102` (`listStyleDefs`) | `BULLET_LIST_STYLE_NAME`/`ORDERED_LIST_STYLE_NAME` deklarieren jeweils nur **eine** `text:list-level-style-bullet`/`-number` mit `text:level="1"` (Zeile 100-101). Für `text:level="2"` und höher ist **kein** Aufzählungszeichen/Einzug definiert — welches Verhalten LibreOffice/Word für eine referenzierte, aber auf einer undefinierten Ebene stehende Liste zeigen, ist **nicht im Code erkennbar** und muss mit einer echten Zielanwendung geprüft werden (siehe Grenzfall 10). |
| Editor-CSS | `src/index.css:63-67` | `.ProseMirror ul, .ProseMirror ol { padding-left: 1.4em; margin: 0 0 0.6em; }` — eine einzige, ebenenunabhängige Regel. Es gibt **keine** explizite Regel für unterschiedliche Aufzählungszeichen/Einzüge je Verschachtelungstiefe; die Darstellung verschachtelter Listen hängt aktuell vollständig vom User-Agent-Stylesheet des jeweiligen Browsers ab (typischerweise: Kreis/Scheibe/Quadrat-Wechsel bei `ul`, eigener bei 1 neu beginnender Zähler je verschachtelter `ol` ohne Word-typisches „1.1"-Verbundformat) — zu verifizieren und zu dokumentieren, ob das für dieses Feature ausreichend ist oder ob es (gekoppelt an `mehrstufige-liste`) explizit gesetzt werden muss. |
| Unit-Tests | `src/formats/docx/__tests__/roundtrip.test.ts:135-159`, `src/formats/odt/__tests__/roundtrip.test.ts:135-159` | Je zwei Tests: „preserves bullet lists with multiple items" und „preserves ordered lists distinctly from bullet lists" — **beide ausschließlich flach** (ein `bullet_list`/`ordered_list` mit direkten `list_item`-Kindern ohne jede Verschachtelung). Kein einziger Test mit verschachtelter Liste in beiden Dateien. |
| E2E-Tests | `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, `tests/e2e/lifecycle.spec.ts`, `tests/e2e/selection-regression.spec.ts` | **Kein einziger Treffer** für „Liste"/„Tab"/„Aufzählung"/„Nummerierte" in Bezug auf Tastenbedienung — es existiert keinerlei E2E-Abdeckung für Listen überhaupt, geschweige denn für Tab/Umschalt+Tab. |
| Reale Fixtures bereits vorhanden | `tests/fixtures/external/docx/ComplexNumberedLists.docx`; `tests/fixtures/external/odt/listLevel10.odt`, `simpleList3.odt`, `liste2.odt`, `ListOddity.odt`, `ListStyleResolution.odt` u. a. | Diese Dateien werden von `src/formats/docx/__tests__/external-fixtures.test.ts` bzw. `.../odt/__tests__/external-fixtures.test.ts` bislang nur generisch auf „Import stürzt nicht ab" geprüft (siehe dortige Schleife über `readdirSync`), **nicht** auf korrekt erhaltene Verschachtelungsebenen. Genau diese Dateien sind die naheliegenden Kandidaten für die unten geforderten Rundreise-Tests mit echten mehrstufigen Fremddateien. |

**Zusammenfassung des Befunds:** „fehlt" ist für die eigentliche Bedienfunktion (Tab/
Umschalt+Tab) korrekt. Zusätzlich zur reinen Tastaturbindung müssen für ein
vollständig funktionierendes Feature drei bislang unabhängig fehlende Teile zusammen
gebaut werden: (1) die Tastenbindung + der `sinkListItem`-Befehl selbst, (2) die
DOCX-Ebenen-Erhaltung bei Import **und** Export (aktuell beidseitig kaputt/fehlend),
(3) die ODT-Listenstil-Definitionen für Ebene 2 und höher (Struktur ist bereits da,
Darstellung/Formatierung der tieferen Ebenen fehlt). Ein Bau, der nur (1) umsetzt, ohne
(2) und (3) zu beheben, würde zwar Tab/Umschalt+Tab im Editor sichtbar funktionieren
lassen, aber die damit erzeugte Struktur bei jedem Export/Reimport wieder verlieren —
und wäre damit trotzdem **nicht** abnahmefähig, weil die in dieser Datei verbindlich
geforderte Rundreise (Abschnitt 5) fehlschlagen würde.

---

## 1. Ziel

Nutzer:innen können den/die aktuell selektierten Listenpunkt(e) einer Aufzählungs-
oder nummerierten Liste per **Tab**-Taste eine Ebene tiefer verschachteln und per
**Umschalt+Tab** eine Ebene höher zurückstufen (bzw. bei der obersten Ebene ganz aus
der Liste herausnehmen) — konsistent in Editor-Darstellung, DOCX-Export und
ODT-Export, und die erreichte Ebene bleibt bei jeder Rundreise (Import → Export,
Export → Re-Import, Cross-Format) vollständig erhalten.

### Explizit nicht (alleiniger) Gegenstand dieser Anforderung
Folgende, im Backlog separat geführte, eng verwandte Punkte werden hier **nur so weit
mitbehandelt, wie sie zwingende Voraussetzung** für ein rundreisefähiges Tab/
Umschalt+Tab sind — sie sind aber jeweils eigene Slugs mit eigenem Vollständigkeits-
anspruch:
- `mehrstufige-liste` (Backlog Zeile 157, Status „fehlt", Priorität 2): „Verschachtelte
  Gliederungsebenen mit **unterschiedlichem Symbol/Nummernformat je Ebene**" — also die
  optische Ausgestaltung (z. B. •, ○, ▪ je Ebene bzw. „1.", „a)", „i." bei nummerierten
  Listen). Diese Datei fordert nur, dass eine Ebenenänderung **strukturell** korrekt
  erfolgt und **rundreisefähig** ist; ein Word/LibreOffice-typisches, pro Ebene
  unterschiedliches Symbolschema ist **nicht** Abnahmekriterium dieser Datei, sofern
  die tieferen Ebenen zumindest sichtbar **irgendein** Aufzählungs-/Nummerierungs-
  merkmal zeigen, das sie optisch von der Elternebene unterscheidet (siehe Grenzfall 8
  und 10 sowie Abschnitt 3.9).
- `nummerierung-fortsetzen-neustarten` (Backlog Zeile 159, Status „teilweise"): Wie
  eine neue Liste an eine vorherige anschließt oder neu bei 1 beginnt — unabhängig von
  der Einzugsebene.
- `eigene-aufzaehlungszeichen` / `eigenes-nummernformat` (Backlog Zeilen 160-161,
  Status „fehlt"): Frei wählbare/definierbare Symbole bzw. Zahlenformate.
- `einzugsebene-erhoehen` / `einzugsebene-verringern` (Backlog Zeilen 123-124, Bereich
  „2.4 Absatzformat", **nicht** „2.6 Listen", Status „fehlt"): Das sind allgemeine
  **Absatz-Einzug**-Funktionen (Einzug in cm/Punkt an normalen Fließtext-Absätzen, kein
  Listenkontext) — nicht identisch mit der listenspezifischen Ebenen-Änderung dieser
  Datei, auch wenn dieselbe physische Taste (Tab) in Word/LibreOffice **außerhalb**
  einer Liste konventionell einen Tabstopp einfügt statt einen Absatz einzurücken.
  Beide Funktionen dürfen sich nicht gegenseitig überschreiben (siehe Abschnitt 2,
  Zeile 6, und Grenzfall 17).
- `tabulator-zeichen` (Backlog Zeile 281, Bereich „Sonderelemente", Status
  „teilweise"): Das Verhalten der Tab-Taste **außerhalb** eines Listenkontexts
  (Einfügen eines Tabstopp-Sprungs). Diese Datei fordert nur die **Abgrenzung** dazu
  (Tab darf im Listenkontext nicht versehentlich ein Tab-Zeichen einfügen und
  außerhalb eines Listenkontexts darf die neue Listen-Tab-Logik nicht versehentlich
  greifen), nicht die vollständige Spezifikation der Tabstopp-Funktion selbst.

Da alle vier oben genannten „Listen"-Slugs (`aufzaehlungsliste`, `nummerierte-liste`,
`liste-aufheben`, `liste-einruecken-tab`) auf **denselben** zugrunde liegenden
Schema-Knoten (`bullet_list`/`ordered_list`/`list_item`) arbeiten, ist auch hier (wie
in `ausrichtung-links-req.md` methodisch begründet) die Ebenenänderung **nicht**
vollständig isoliert von den bereits vorhandenen Listenfunktionen zu verifizieren — die
Testfälle unten prüfen deshalb bewusst auch das Zusammenspiel mit Erzeugen (Bullet/
Nummeriert), Aufheben und Enter/Split.

---

## 2. Menüpunkte / Bedienelemente

| # | Bedienelement | Ort | Ist-Zustand (zu verifizieren) | Soll |
|---|---|---|---|---|
| 1 | Tastenkombination **Tab** im Listenkontext | Globale Editor-Keymap, `WordEditor.tsx` | **Nicht vorhanden.** Keine `Tab`-Bindung in der Keymap; `sinkListItem` wird im gesamten Projekt nirgends importiert (siehe Code-Audit). Nach Code-Lage zu erwarten (im Browser zu verifizieren): Tab verlässt den Editor-Fokus, statt eine Editor-Aktion auszulösen. | Neuer Keymap-Eintrag `Tab: <indent-command>`, der (a) im Listenkontext den/die selektierten Listenpunkt(e) per `sinkListItem(wordSchema.nodes.list_item)` eine Ebene tiefer verschachtelt und **`true`** zurückgibt (Event wird damit von ProseMirror konsumiert, kein Fokuswechsel), und (b) außerhalb eines Listenkontexts das bestehende/zu bauende Tabstopp-Verhalten **unverändert** durchlässt (Command gibt `false` zurück, `keymap` reicht die Taste an die nächste Bindung bzw. das Standardverhalten weiter, siehe `tabulator-zeichen`, Abgrenzung Abschnitt 1). |
| 2 | Tastenkombination **Umschalt+Tab** im Listenkontext | Globale Editor-Keymap, `WordEditor.tsx` | **Nicht vorhanden.** Keine `Shift-Tab`-Bindung. | Neuer Keymap-Eintrag `'Shift-Tab': <outdent-command>`, der `liftListItem(wordSchema.nodes.list_item)` aufruft — bei einem verschachtelten Punkt (Ebene ≥ 2) wird genau eine Ebene ausgerückt; bei einem Punkt der obersten Ebene (Ebene 1) wird der Punkt komplett aus der Liste entfernt (identisches Verhalten zum bestehenden Button „Liste aufheben", siehe Zeile 3 unten und Abschnitt 3.5-3.6). |
| 3 | Bestehender Toolbar-Button „⇧ Liste" / „Liste aufheben" | Toolbar, Listen-Gruppe (`Toolbar.tsx:214-224`) | Vorhanden, ruft `liftFromList()` → `liftListItem(list_item)` auf. Da aktuell nie eine verschachtelte Struktur existieren kann, entfernt dieser Button **immer** die komplette Liste (Ebene 1-Verhalten von `liftListItem`, siehe Code-Audit). | **Bleibt unverändert bestehen** als Maus-/Klick-Alternative. Nach Einbau von Tab/Umschalt+Tab ist zu verifizieren, dass sich Button und `Shift-Tab` bei einem Punkt der Ebene 1 **identisch** verhalten (beide entfernen die Liste komplett) und bei einem Punkt der Ebene ≥ 2 **unterschiedlich** — der Button hat aktuell keinen Ebenen-Begriff, `Shift-Tab` schon (rückt nur eine Ebene aus). Zu klären, ob der Button nach diesem Ausbau ebenfalls in ein „nur eine Ebene ausrücken" umgewandelt werden soll oder ob er bewusst als „komplett entfernen, egal welche Ebene" bestehen bleibt (Empfehlung: bestehen lassen, da bereits ein etablierter, separat benannter Button existiert — siehe Grenzfall 18). |
| 4 | Neuer Toolbar-Button „Einzug erhöhen" (Listenebene) | Vorschlag: Toolbar, direkt vor dem bestehenden „⇧ Liste"-Button | **Nicht vorhanden.** | Empfohlene, aber nicht zwingende Ergänzung: Maus-/Touch-/Screenreader-Alternative zu Tab, ruft denselben `sinkListItem`-Befehl auf. Notwendig, weil das Abfangen von Tab im Editor die native Tastatur-Fokus-Navigation aus dem Dokument heraus blockiert (siehe Grenzfall 15 — „Tab-Trap"-Risiko für reine Tastaturnutzer:innen ohne Maus). Falls dieser Button bewusst nicht gebaut wird, muss das als dokumentierte Einschränkung festgehalten werden (siehe Abnahmekriterien), nicht stillschweigend fehlen. |
| 5 | Tab **außerhalb** eines Listenkontexts (normaler Absatz/Überschrift/Tabellenzelle ohne Liste) | — | Aktuell identisch zu Zeile 1 (keine Bindung, vermutlich Fokus-Verlust). | Muss laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 15, Testfall 3 unverändert bleiben bzw. gemäß `tabulator-zeichen` (separater Slug) funktionieren — diese Datei verlangt nur, dass die neue Tab-Bindung diesen Fall **nicht** versehentlich als Listenkontext fehlinterpretiert (siehe Grenzfall 4 und 17). |
| 6 | Tab, während Cursor in einer Tabellenzelle steht (mit `prosemirror-tables`, `tableEditing()`, `WordEditor.tsx:82`) | Tabellen-Navigation (Backlog `tabelle-navigation`, Bereich „Tabellen") | `prosemirror-tables`s `tableEditing()`-Plugin bindet standardmäßig **keine** eigene Tab-Keymap-Taste selbst (die im `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 geforderte Zellen-Tab-Navigation ist laut Backlog ebenfalls noch nicht gebaut) — aktuell also kein Konflikt, da beide Funktionen fehlen. | Sobald **beide** Funktionen (Zellen-Tab-Navigation **und** Listen-Tab-Einzug) existieren, muss die Rangfolge definiert sein für den Sonderfall „Liste **innerhalb** einer Tabellenzelle" (siehe Grenzfall 5) — für diese Datei genügt es, den Konflikt zu **dokumentieren** und mit einem Test zu belegen, welche der beiden Funktionen aktuell (mit dem hier gebauten Stand) tatsächlich greift. |
| 7 | Sichtbarer Hinweis auf die Tastenkombination (Tooltip/Titel) | Bestehender Button „Liste aufheben" bzw. ein neuer „Einzug erhöhen"-Button | Kein `title`, der Tab/Umschalt+Tab erwähnt. | `title`/`aria-label` sollten die Tastenkombination nennen (z. B. „Einzug erhöhen (Tab)"), analog zur in `ausrichtung-links-req.md` Grenzfall 16 aufgeworfenen Frage nach konsistenten `aria-label`s. |
| 8 | Kontextmenü (Rechtsklick) | — | Nicht vorhanden (Kontextmenü existiert projektweit nicht). | Kein Soll-Bestandteil dieser Anforderung. |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Tab bei einem Listenpunkt mit vorhandenem vorherigen Geschwister-Punkt
Steht der Cursor (ohne Selektion) in einem Listenpunkt, der **nicht** der erste Punkt
seiner (Unter-)Liste ist, verschachtelt Tab diesen Punkt unter den unmittelbar
vorherigen Geschwister-Punkt (`sinkListItem`-Semantik, siehe Code-Audit) — der
vorherige Punkt wird dadurch zum „Elternpunkt" auf der jetzt höheren Ebene, der
aktuelle Punkt rutscht eine Ebene tiefer in eine neu entstehende bzw. bestehende
Unterliste desselben Listentyps (Bullet bleibt Bullet, Nummeriert bleibt Nummeriert,
sofern kein bewusster Typwechsel je Ebene erfolgt, siehe Grenzfall 7).

### 3.2 Tab beim allerersten Punkt einer Liste
Der erste Punkt einer (Unter-)Liste hat keinen vorherigen Geschwister-Punkt, unter den
er verschachtelt werden könnte. Tab muss in diesem Fall **sichtbar nichts tun**
(No-Op) — insbesondere darf der Fokus **nicht** aus dem Editor herausspringen (Regres-
sionsschutz gegen das heutige, unerwünschte Default-Verhalten, siehe Code-Audit und
Grenzfall 1). Das Command muss `false` zurückgeben, damit `keymap` ggf. an eine
tiefer liegende Bindung durchreicht, **aber** die Editor-Ebene selbst muss das
Tab-Event dennoch als „im Listenkontext behandelt, nur wirkungslos" betrachten, nicht
als „außerhalb einer Liste" (siehe Abgrenzung Abschnitt 2, Zeile 1).

### 3.3 Cursor mitten im Text eines Listenpunkts (nicht nur am Zeilenanfang)
Im Unterschied zu manchen anderen Editoren muss Tab **unabhängig von der genauen
Cursor-Position innerhalb des Listenpunkt-Texts** wirken (Listen-Ebene ist eine
Block-, keine Zeicheneigenschaft, analog zur Ausrichtung, vgl.
`ausrichtung-links-req.md` Abschnitt 3.1) — es ist **nicht** erforderlich, dass der
Cursor exakt am Anfang des Listenpunkts steht, damit Tab den Punkt verschachtelt. Zu
verifizieren, ob dieses Verhalten so gewünscht ist (Word/LibreOffice verhalten sich
hier normalerweise übereinstimmend: Tab wirkt überall im Punkt, außer der Cursor
befindet sich exakt am Anfang **und** es ist der allererste Punkt einer neuen Zeile
direkt nach Enter — ein Sonderfall, der wegen der reinen Blockebenen-Semantik von
ProseMirker hier vermutlich nicht anders behandelt wird, siehe Grenzfall 13).

### 3.4 Selektion über mehrere Listenpunkte
Eine Selektion, die zwei oder mehr Listenpunkte (teilweise) einschließt, verschiebt
laut `sinkListItem`/`liftListItem`-Implementierung **alle** davon erfassten Punkte
gemeinsam eine Ebene (`range` wird über `$from.blockRange($to, …)` bestimmt, siehe
Code-Audit) — analog zur `nodesBetween`-Logik von `setAlign`
(`ausrichtung-links-req.md` Abschnitt 3.2), nur über eine ProseMirror-eigene
`NodeRange`-Berechnung statt eigenem Code.

### 3.5 Umschalt+Tab bei einem Punkt der obersten Ebene (Ebene 1)
Analog zum bestehenden Button „Liste aufheben": Der/die betroffenen Punkte verlassen
die Liste **komplett** und werden zu normalen Absätzen — Text und ggf. vorhandene
Zeichenformatierung (Fett, Farbe, …) im Punkt bleiben vollständig erhalten, nur das
Aufzählungszeichen/die Nummerierung verschwindet. Dieses Verhalten muss **identisch**
zum bereits vorhandenen `liftFromList()`-Pfad sein, da beide denselben
`liftListItem`-Code aufrufen (siehe Zeile 3 der Tabelle in Abschnitt 2).

### 3.6 Umschalt+Tab bei einem verschachtelten Punkt (Ebene ≥ 2)
Der Punkt wird **nur eine** Ebene höher gestuft (wird Geschwister der Elternebene),
bleibt aber Teil der Liste — im Unterschied zu 3.5 verschwindet das Aufzählungs-
zeichen/die Nummerierung **nicht**, es ändert sich höchstens dessen optische
Darstellung (siehe Abschnitt 3.9/3.10).

### 3.7 Zusammenspiel mit Enter (`splitListItem`)
Ein neuer Listenpunkt, der per Enter am Ende eines bestehenden Punkts entsteht
(`Enter: splitListItem(wordSchema.nodes.list_item)`, `WordEditor.tsx:75`), erbt nach
ProseMirror-Standardverhalten dieselbe Verschachtelungstiefe wie der Punkt, aus dem er
per Enter entstanden ist. Tab/Umschalt+Tab müssen auf einem so neu entstandenen Punkt
unmittelbar genauso funktionieren wie auf einem „ursprünglichen" Punkt (kein
Sonderfall, der nur bei per Import entstandenen Listen greift).

### 3.8 Undo/Redo
Jede tatsächlich wirksame Tab-/Umschalt+Tab-Aktion erzeugt genau einen eigenen
Undo-Schritt. Eine wirkungslose Tab-Aktion (siehe 3.2) darf **keinen** leeren
Undo-Schritt erzeugen (Unterschied zum in `ausrichtung-links-req.md` Abschnitt 3.9
offen gelassenen Fall bei „Links", da `sinkListItem`/`liftListItem` bei `false` gar
keine Transaktion dispatchen, im Gegensatz zu `setAlign`, das auch bei einem bereits
passenden Wert eine Transaktion erzeugt — zu bestätigen, dass dieser Unterschied
tatsächlich so besteht).

### 3.9 Sichtbare Darstellung je Ebene (Editor-Rendering)
- **Aufzählungsliste:** Ohne explizite CSS-Regel je Ebene (siehe Code-Audit,
  `index.css:63-67`) verwendet der Browser sein eigenes User-Agent-Stylesheet für
  verschachtelte `<ul>`-Elemente — typischerweise ein optischer Wechsel des
  Aufzählungszeichens je Verschachtelungstiefe. Zu verifizieren und hier zu
  dokumentieren, ob das für den Basis-Scope dieser Datei als „sichtbar unterscheidbar"
  genügt, oder ob ein explizites, Word/LibreOffice-typisches Symbolschema (das aber
  Gegenstand von `mehrstufige-liste` ist, siehe Abschnitt 1) schon hier zwingend
  nachgezogen werden muss, damit Tab überhaupt einen sichtbar erkennbaren Effekt hat.
- **Nummerierte Liste:** Eine verschachtelte `<ol>` beginnt ohne explizite CSS-
  Counter-Kette browserseitig bei einer **eigenen** Zählung ab „1." statt eines
  Word-typischen Verbundformats („1.1", „1.2"). Ebenfalls zu verifizieren und zu
  dokumentieren — Mindestanforderung dieser Datei: die tiefere Ebene muss **irgendeine**
  von der Elternebene unterscheidbare Nummerierung zeigen (und sei es „1., 2., 3." auf
  jeder Ebene erneut beginnend), nicht zwingend das vollständige Word-Verbundformat.

### 3.10 Aktualisierung nach jeder Aktion
Sowohl die sichtbare Einrückung (CSS `padding-left`, ggf. zusätzlich pro Ebene) als
auch das Aufzählungszeichen/die Nummerierung müssen **unmittelbar** nach Tab/
Umschalt+Tab aktualisiert dargestellt werden — deckt sich mit der bereits in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 5, Testfall 4 geforderten Prüfung.

### 3.11 Fokus-/Selektionserhalt
Nach Tab/Umschalt+Tab bleibt der Fokus im Editor, die Cursor-Position/Selektion
bleibt inhaltlich am selben Text (auch wenn sich die absolute Dokumentposition durch
die Strukturänderung verschiebt) — kein Sprung an den Anfang/das Ende des Dokuments
oder des Listenpunkts.

### 3.12 Zusammenspiel mit Zeichenformatierung
Fett/Kursiv/Farbe usw. innerhalb des Listenpunkt-Texts bleiben von einer
Ebenenänderung vollständig unberührt (analog zu `ausrichtung-links-req.md`
Abschnitt 3.8, hier auf die Listen-Ebene statt auf Absatz-Ausrichtung übertragen).

### 3.13 Rundreise-Grundprinzip (Übersicht, Details in Abschnitt 5)
Eine im Editor per Tab erzeugte Verschachtelungstiefe muss beim Export nach DOCX
**und** nach ODT als eine vom Reader wieder korrekt erkennbare, gleich tiefe
Verschachtelung zurückkommen — das ist der eigentliche Kern dieser Anforderung, nicht
nur das sichtbare Editor-Verhalten der Taste selbst (siehe Code-Audit: Editor-seitiges
Funktionieren allein reicht nicht, wenn Export/Reimport die Struktur zerstören).

---

## 4. Grenzfälle

1. **Erster Punkt einer (Unter-)Liste, Tab gedrückt:** No-Op, Fokus bleibt im Editor
   (siehe 3.2) — kritischer Regressionstest, da das heutige Fehlen jeder Tab-Bindung
   vermutlich zum Herausspringen des Fokus aus dem Editor führt; nach dem Fix darf das
   nicht mehr passieren, **auch nicht** in diesem No-Op-Fall.
2. **Sehr tiefe Verschachtelung (wiederholtes Tab auf denselben Punkt):** OOXML
   definiert `w:ilvl` konventionell für die Werte 0–8 (9 Ebenen), Word begrenzt die
   UI ebenso; ODF-Werkzeuge folgen üblicherweise einer ähnlichen Konvention. Zu klären
   und hier festzuhalten: Wird eine Obergrenze von 9 Ebenen technisch erzwungen
   (Tab bei Ebene 9 wird zum No-Op) oder bleibt es softwareseitig unbegrenzt (mit dem
   Risiko, beim DOCX-Export eine Ebene zu erzeugen, für die `numberingXml()`
   (`styleDefs.ts:37-46`) kein `w:lvl` kennt, siehe Grenzfall 9)?
3. **Umschalt+Tab auf einen Punkt der Ebene 1, der nachfolgende, tiefer eingerückte
   Punkte (Kinder) besitzt:** Zu klären und mit Testfall zu belegen, was mit den
   Kind-Punkten geschieht, wenn ihr Elternpunkt die Liste verlässt — bleiben sie als
   eigene, jetzt oberste Unterliste bestehen, oder werden sie automatisch mit
   ausgerückt? Nach `liftOutOfList`-Semantik (Code-Audit) werden alle im
   `range` erfassten Punkte gemeinsam behandelt — ein einzelner Klick/Cursor ohne
   explizite Mehrfachselektion betrifft normalerweise nur den einen Punkt, dessen
   Kinder blieben dann strukturell als eigene, direkt der zuvor gemeinsamen Elternliste
   angehängte Unterliste zurück; mit einem echten Testfall zu bestätigen, nicht nur
   anzunehmen.
4. **Tab bei einer Selektion, die sowohl Listenpunkte als auch normale (Nicht-Listen-)
   Absätze umfasst:** `sinkListItem`/`liftListItem` finden über `$from.blockRange`
   nur einen Bereich, dessen umschließender Elternknoten ein `list_item` als erstes
   Kind hat (siehe Code-Audit) — bei einer gemischten Selektion ist zu verifizieren,
   ob die Funktion dann `false` zurückgibt (kein Effekt auf irgendetwas) oder nur den
   Listen-Teilbereich erfasst; Ergebnis konkret mit einem Testfall zu dokumentieren.
5. **Liste innerhalb einer Tabellenzelle** (reale Fixture `simple-table-with-lists.odt`,
   `listsInTable.odt` bereits im Repo vorhanden), Cursor in einem solchen Listenpunkt,
   Tab gedrückt: Sobald künftig auch eine Zellen-Tab-Navigation existiert (Backlog,
   Bereich Tabellen, aktuell „fehlt"), ist die Rangfolge zu klären — für den aktuellen
   Baustand (Zellen-Tab-Navigation existiert noch nicht) muss verifiziert werden, dass
   die neue Listen-Tab-Logik in diesem Fall trotzdem korrekt nur die Listen-Ebene
   ändert, nicht versehentlich in die nächste Zelle springt oder umgekehrt.
6. **Bild als einziger Inhalt eines Listenpunkts, Tab gedrückt:** Muss trotzdem wirken,
   da die Listen-Ebene eine Blockeigenschaft des `list_item` ist, unabhängig vom
   Inline-Inhalt (analog zu `ausrichtung-links-req.md` Grenzfall 6).
7. **Gemischte Listentypen über Ebenen hinweg** (z. B. Bullet-Liste auf Ebene 1, nach
   Tab soll Ebene 2 eine **nummerierte** Unterliste sein — in Word über einen
   separaten Mechanismus wählbar): Schema-technisch ist ein `ordered_list`-Knoten als
   Kind eines `bullet_list`-`list_item` erlaubt (beide Gruppe `block`,
   `schema.ts:74-96`), `sinkListItem` selbst erzeugt aber immer eine Unterliste **vom
   selben Typ** wie die aktuelle Liste (`parent.type.create(...)`, Bibliothekscode,
   siehe Code-Audit) — ein Typwechsel je Ebene ist damit **nicht automatisch**
   Bestandteil von reinem Tab/Umschalt+Tab und explizit **außerhalb des Scopes**
   dieser Datei (gehört ggf. zu `mehrstufige-liste`). Hier nur zu verifizieren: Erzeugt
   Tab verlässlich eine Unterliste **desselben** Typs wie die Elternliste, ohne
   Datenverlust oder Absturz, auch wenn eine reale Fremddatei mit **echt gemischten**
   Ebenentypen importiert wird (siehe Grenzfall 8).
8. **Reale Fremddatei mit bereits mehrstufiger Liste importieren**
   (`tests/fixtures/external/docx/ComplexNumberedLists.docx`,
   `tests/fixtures/external/odt/listLevel10.odt`, `simpleList3.odt`, bereits im Repo
   vorhanden) → nach aktuellem Code-Stand (siehe Code-Audit) verliert der
   **DOCX**-Import die Ebenen bereits beim ersten Einlesen vollständig (flache Liste),
   der **ODT**-Import erhält die Struktur nach Code-Lage voraussichtlich, ist aber
   nicht getestet. Beides ist vor Abnahme dieser Anforderung mit der jeweiligen realen
   Datei zu verifizieren und das Ergebnis hier nachzutragen — die DOCX-Import-Lücke
   **muss behoben werden**, da sonst weder „unverändert re-exportieren" (Abschnitt 5)
   noch „danach mit Tab weiterbearbeiten" auf einer echten mehrstufigen Fremddatei
   funktionieren kann.
9. **DOCX-Export einer im Editor per Tab erzeugten verschachtelten Liste:** Nach
   aktuellem Code-Stand (siehe Code-Audit, `writer.ts:112-118`) wird die
   Verschachtelung beim Schreiben vollständig flachgelegt (immer `w:ilvl="0"`,
   gleiche `numId` wie die oberste Ebene) — **muss behoben werden**, inklusive
   Ergänzung der fehlenden `w:lvl`-Definitionen für Ebene 1–8 in `numberingXml()`
   (`styleDefs.ts:37-46`, aktuell nur Ebene 0 definiert).
10. **ODT-Export einer verschachtelten Liste:** Die XML-**Struktur** entsteht nach
    Code-Lage bereits korrekt (verschachteltes `<text:list>` im `<text:list-item>`),
    aber die referenzierten Listenstile (`listStyleDefs()`, `styleRegistry.ts:95-102`)
    definieren nur `text:level="1"` — mit einer echten Zielanwendung
    (LibreOffice/Word) zu verifizieren, wie ein `text:list-style` ohne Eintrag für
    `text:level="2"` und höher tatsächlich dargestellt wird (denkbare Ausprägungen:
    Fallback auf Ebene-1-Stil, implementierungsabhängiger Default, oder gar kein
    sichtbares Aufzählungszeichen) — Ergebnis hier zu dokumentieren; **mindestens** für
    die in dieser Datei geforderte Basis-Rundreise (Abschnitt 5) muss die Ebene nach
    Reimport strukturell als Ebene 2 erkennbar sein, auch wenn ihre visuelle
    Ausgestaltung noch der von `mehrstufige-liste` zu liefernden Verfeinerung bedarf.
11. **Undo/Redo einer einzelnen Tab-Aktion:** Ein Schritt macht genau eine
    Ebenenänderung rückgängig; Redo stellt sie wieder her.
12. **Schnelle Tab-Tab-Tab-Folge** (mehrfach hintereinander auf denselben Punkt, sofern
    durch genügend vorherige Geschwister-Punkte gedeckt): Jede Ebenenstufe einzeln per
    Undo rückgängig machbar, kein Zusammenfassen mehrerer Tab-Drücke zu einem
    History-Eintrag.
13. **Tab unmittelbar nach Enter** (neuer, leerer Punkt gerade erst per Enter am Ende
    des vorherigen Punkts entstanden): Muss genauso funktionieren wie bei einem
    „alten" Punkt (siehe 3.7) — insbesondere kein Sonderfall, der Tab bei einem ganz
    frisch erzeugten leeren Punkt anders (oder gar nicht) behandelt.
14. **Zusammenspiel mit dem bekannten Selection-Sync-Bug** (`FEATURE-SPEC-DOCX-ODT.md`
    Abschnitt 2): Alles auswählen → Fett anwenden → per Klick neu positionieren →
    Tab drücken → weitertippen — zu verifizieren, ob derselbe Bug-Pfad auch mit Tab
    als anschließender Aktion reproduzierbar ist (analog zur in
    `ausrichtung-links-req.md` Grenzfall 14 geforderten Prüfung, hier auf Tab
    übertragen).
15. **Tab-Trap-Risiko für reine Tastaturnutzer:innen (Barrierefreiheit):** Sobald Tab
    im Editor abgefangen wird, kann eine Nutzer:in ohne Maus den Editor nicht mehr per
    Tab verlassen (z. B. um zur Toolbar oder aus dem Dokument heraus zu navigieren),
    solange sich der Cursor in einem Listenpunkt befindet — ein bekannter Kompromiss,
    den Word/LibreOffice/Google Docs auf dieselbe Weise eingehen (dort i. d. R. über
    Esc oder eine andere Navigationstaste umgangen). Muss als **bewusste, dokumentierte
    Einschränkung** festgehalten werden, nicht als übersehene Lücke — und macht einen
    Maus-/Screenreader-Alternativweg (siehe Abschnitt 2, Zeile 4) zu einer harten
    Notwendigkeit, nicht nur einer Empfehlung, sofern kein anderer Fluchtweg aus dem
    Editor existiert.
16. **Sehr lange, tief verschachtelte Liste** (viele Punkte, mehrere Ebenen,
    Stresstest): Kein spürbares Einfrieren der UI bei wiederholter Tab-Betätigung,
    kein Performance-Einbruch beim Export/Import einer solchen Datei.
17. **Tab außerhalb jedes Listenkontexts** (normaler Absatz): Muss unverändert zum
    heutigen bzw. dem im Rahmen von `tabulator-zeichen` zu bauenden Verhalten bleiben
    — die neue Listen-Tab-Logik darf hier **nicht** greifen (Command muss den
    Nicht-Listen-Fall zuverlässig erkennen und `false` zurückgeben, damit `keymap` an
    die nächste Bindung durchreicht), siehe Abschnitt 2, Zeile 5 und
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 15, Testfall 3.
18. **Verhältnis Button „Liste aufheben" zu Umschalt+Tab bei Ebene ≥ 2:** Zu
    entscheiden und zu dokumentieren, ob der Button weiterhin „komplett entfernen,
    unabhängig von der Ebene" bedeutet (aktuelles, unverändertes Verhalten, siehe
    Abschnitt 2, Zeile 3) oder ob er künftig ebenfalls „nur eine Ebene ausrücken" wird
    und dadurch bei einem verschachtelten Punkt nicht mehr der einzige Weg wäre, eine
    Liste in einem Schritt komplett zu verlassen — jede Entscheidung ist zulässig,
    solange sie hier nachvollziehbar begründet und mit einem Testfall belegt ist.

---

## 5. Rundreise-Anforderung (verbindlich)

Für **jede** der folgenden Kombinationen gilt der in der Aufgabenstellung geforderte
Grundsatz: Datei (bzw. im Editor erzeugter Inhalt) mit einer per Tab/Umschalt+Tab
erzeugten bzw. bereits vorhandenen mehrstufigen Liste **unverändert** exportieren →
Ergebnis erneut importieren → Ebenen, Text und Listentyp (Bullet/Nummeriert) sind an
exakt derselben Stelle weiterhin identisch vorhanden — kein sonstiger Inhaltsverlust.

### 5.1 DOCX

1. **Eigenrundreise, im Editor erzeugte 2-stufige Liste:** Bullet-Liste mit 3 Punkten
   anlegen, zweiten Punkt per Tab eine Ebene tiefer verschachteln → als DOCX
   exportieren → erneut importieren → Punkt 2 erscheint weiterhin als verschachtelter
   Unterpunkt von Punkt 1 (nicht als gleichrangiger dritter Punkt), Text aller drei
   Punkte unverändert.
2. **Eigenrundreise, 3-stufig, gemischt Bullet/Nummeriert:** Je eine Bullet- und eine
   nummerierte Liste mit mindestens 3 Ebenen anlegen, exportieren, reimportieren →
   jede Ebene bleibt dem richtigen Listentyp und der richtigen Tiefe zugeordnet.
3. **Zurückstufen (Umschalt+Tab) vor dem Export:** Punkt auf Ebene 3 anlegen, einmal
   per Umschalt+Tab auf Ebene 2 zurückstufen, exportieren, reimportieren → Ebene 2
   bleibt erhalten (nicht wieder Ebene 3, nicht versehentlich Ebene 1).
4. **Reale, komplexe Fremddatei mit bereits mehrstufiger Liste**
   (`tests/fixtures/external/docx/ComplexNumberedLists.docx`) importieren →
   unverändert exportieren → erneut importieren → alle ursprünglichen Ebenen bleiben
   über beide Zyklen hinweg erhalten. **Voraussetzung:** Die in Grenzfall 8 geforderte
   Behebung des DOCX-Import-Ebenenverlusts muss vorab umgesetzt sein, sonst ist
   bereits der erste Import verlustbehaftet und der Test kann nicht bestehen.
5. **Cross-Format:** Im Editor erzeugte mehrstufige Liste als ODT exportieren, dann
   als DOCX weiterexportieren (bzw. ODT-Fremddatei mit mehrstufiger Liste importieren
   → als DOCX exportieren) → Ebenen bleiben über den Formatwechsel erhalten.
6. **Weitere reale Fremddateien** aus dem bereits vorhandenen Fixture-Bestand mit
   Verdacht auf mehrstufige Listen (z. B. weitere Dateien aus dem Apache-POI-Testkorpus
   unter `tests/fixtures/external/docx`) probeweise importieren/exportieren, um die
   Behebung aus Grenzfall 8/9 nicht nur an einer einzigen Datei zu verifizieren.

### 5.2 ODT

1. **Eigenrundreise, im Editor erzeugte 2-stufige Liste:** Wie 5.1.1, aber als ODT
   exportiert/reimportiert.
2. **Eigenrundreise, 3-stufig, gemischt Bullet/Nummeriert:** Wie 5.1.2, ODT-Variante.
3. **Zurückstufen vor dem Export:** Wie 5.1.3, ODT-Variante.
4. **Reale, komplexe Fremddatei mit bereits mehrstufiger Liste**
   (`tests/fixtures/external/odt/listLevel10.odt`, `simpleList3.odt`, `liste2.odt`)
   importieren → unverändert exportieren → erneut importieren → Ebenen bleiben
   erhalten. Nach Code-Audit ist der ODT-Lese-/Schreibpfad für die reine
   XML-**Struktur** bereits vorbereitet — dieser Testfall ist der entscheidende
   Nachweis, ob das tatsächlich zutrifft oder ob ein bislang unbekannter Fehler in der
   generischen Rekursion die Ebenen doch verliert.
5. **Cross-Format:** DOCX-Fremddatei mit mehrstufiger Liste (nach Behebung von
   Grenzfall 8/9) importieren → als ODT exportieren → Ebenen bleiben erhalten.
6. **Sichtprüfung tieferer Ebenen mit echter Zielanwendung** (LibreOffice, sofern
   verfügbar, sonst ein unabhängiger ODF-Parser/-Validator): Ergebnis von Grenzfall 10
   (undefinierter `text:list-style` für Ebene 2+) konkret mit der reimportierten Datei
   dokumentieren.

### 5.3 Doppelte Rundreise / Cross-Format hin und zurück

1. DOCX mit einer im Editor per Tab erzeugten 3-stufigen Liste → Export als ODT →
   erneuter Import → Export zurück als DOCX → alle drei Ebenen bleiben nach zwei
   Formatkonvertierungen an exakt derselben Textstelle erhalten.
2. Dieselbe Prüfung mit Startpunkt ODT.

---

## 6. Testfälle (Zusammenfassung, E2E über echte Browser-Bedienung — Pflicht)

Da aktuell **keinerlei** Test (weder Unit- noch E2E-Test) Tab/Umschalt+Tab oder
verschachtelte Listen prüft (siehe Code-Audit), sind sämtliche folgenden Testfälle
**neu** zu schreiben:

1. Bullet-Liste mit 3 Punkten im Editor anlegen, echten Playwright-`Tab`-Tastendruck
   auf Punkt 2 auslösen → Punkt 2 im DOM sichtbar als verschachtelter Unterpunkt
   (verschachteltes `<ul>` innerhalb des `<li>` von Punkt 1), Fokus bleibt im Editor.
2. Tab auf den allerersten Punkt einer Liste → keine sichtbare Änderung, Fokus bleibt
   im Editor (kein Herausspringen) — Regressionstest gegen das heutige
   Default-Verhalten (Grenzfall 1).
3. Umschalt+Tab auf einen Ebene-2-Punkt → Punkt wird Ebene 1, bleibt Teil der Liste
   (Grenzfall/Abschnitt 3.6).
4. Umschalt+Tab auf einen Ebene-1-Punkt → Punkt verlässt die Liste komplett, wird zu
   normalem Absatz, Text bleibt erhalten (Abschnitt 3.5) — Ergebnis identisch zu einem
   Klick auf den bestehenden Button „Liste aufheben" auf demselben Punkt.
5. Enter am Ende eines Ebene-2-Punkts, danach Tab auf den neu entstandenen Punkt →
   funktioniert wie bei einem „alten" Punkt (Grenzfall 13).
6. Undo direkt nach einer Tab-Aktion → Ebene wird zurückgesetzt; Redo stellt die
   Verschachtelung wieder her (Grenzfall 11).
7. Mehrfaches Tab in schneller Folge → jede Stufe einzeln per Undo rückgängig machbar
   (Grenzfall 12).
8. Regressionstest analog `selection-regression.spec.ts`, aber mit Tab als
   auslösendem Schritt nach Fett+Klick-Neupositionierung (Grenzfall 14).
9. Import der realen Fixture `tests/fixtures/external/docx/ComplexNumberedLists.docx`
   → Ebenen wie in der Originaldatei sichtbar erhalten (nach Behebung von Grenzfall 8).
10. Import der realen Fixtures `tests/fixtures/external/odt/listLevel10.odt` und
    `simpleList3.odt` → Ebenen sichtbar erhalten.
11. Vollständige Rundreisetests je Format (Abschnitt 5.1/5.2), ausgeführt über echten
    Datei-Upload (`filechooser`) und echten Download-Abfangmechanismus
    (`page.waitForEvent('download')`), nicht nur über intern aufgerufene
    Reader/Writer-Funktionen.
12. Cross-Format-Rundreise (Abschnitt 5.3) einmal DOCX→ODT→DOCX, einmal ODT→DOCX→ODT.
13. Tab außerhalb eines Listenkontexts (normaler Absatz) → Verhalten unverändert zu
    `tabulator-zeichen`, keine versehentliche Listen-Einrückung (Grenzfall 17).
14. Liste innerhalb einer Tabellenzelle (`listsInTable.odt` bzw. eine im Editor
    angelegte Tabelle mit Listen-Inhalt in einer Zelle), Tab gedrückt → Ergebnis gemäß
    Grenzfall 5 dokumentiert.
15. Selektion über mehrere Listenpunkte, Tab gedrückt → alle erfassten Punkte
    gemeinsam eine Ebene tiefer (Abschnitt 3.4).
16. Gemischte Selektion (Listenpunkte + normaler Absatz), Tab gedrückt → Ergebnis
    gemäß Grenzfall 4 dokumentiert.
17. Sichtprüfung/Screenshot-Vergleich: Aussehen einer mehrstufigen Liste im Editor
    entspricht optisch dem Aussehen nach Export → Re-Import derselben Datei.
18. Unabhängige Validierung: exportierte DOCX-Datei mit mehrstufiger Liste gegen einen
    unabhängigen Parser (z. B. python-docx, Prüfung auf korrekte `w:ilvl`-Werte je
    Absatz) sowie die exportierte ODT-Datei gegen einen unabhängigen
    ODF-Parser/Validator (Prüfung auf korrekt verschachtelte `text:list`-Elemente).

---

## 7. Abnahmekriterien (Definition of Done)

Der Status darf erst als „verifiziert" gelten, wenn **alle** folgenden Punkte erfüllt
sind:

1. Tab/Umschalt+Tab sind im Editor als echte, per Tastatur auslösbare Aktionen gebaut
   (`sinkListItem`/`liftListItem` in der Keymap gebunden), inklusive korrektem
   No-Op-Verhalten ohne Fokusverlust (Grenzfall 1) und korrekter Abgrenzung zu
   Nicht-Listen-Kontexten (Grenzfall 17).
2. Der DOCX-Import liest `w:ilvl` aus und bildet die Verschachtelungstiefe korrekt in
   die interne `bullet_list`/`ordered_list`/`list_item`-Struktur ab (Behebung des in
   Grenzfall 8 beschriebenen Datenverlusts).
3. Der DOCX-Export schreibt für jede tatsächliche Verschachtelungstiefe das korrekte
   `w:ilvl` **und** `numberingXml()` definiert die dafür nötigen `w:lvl`-Einträge für
   mindestens so viele Ebenen, wie die Anwendung zulässt (Behebung von Grenzfall 9).
4. Der ODT-Export/-Import ist für mindestens 2–3 Verschachtelungsebenen mit einer
   echten Zielanwendung oder einem unabhängigen ODF-Validator geprüft; das Ergebnis
   von Grenzfall 10 (Darstellung undefinierter Ebenen) ist dokumentiert — entweder als
   ausreichend bestätigt oder mit den dafür nötigen zusätzlichen
   `text:list-level-style-*`-Einträgen in `listStyleDefs()` behoben.
5. Alle Testfälle aus Abschnitt 6 sind als automatisierte Tests (E2E, echte
   Browser-Bedienung) vorhanden und grün.
6. Die vollständige Rundreise-Matrix aus Abschnitt 5 (5.1, 5.2, 5.3) ist für DOCX
   **und** ODT bestanden, inklusive mindestens der bereits im Repo vorhandenen realen
   Fixtures (`ComplexNumberedLists.docx`, `listLevel10.odt`, `simpleList3.odt`).
7. Jeder in Abschnitt 4 dokumentierte Grenzfall ist einzeln geprüft und das
   tatsächliche Verhalten festgehalten — insbesondere Grenzfall 15 (Tab-Trap/
   Barrierefreiheit) ist entweder durch einen zusätzlichen Maus-Bedienweg entschärft
   oder bewusst als dokumentierte Einschränkung akzeptiert, nicht unentschieden offen
   gelassen.
8. Die Abgrenzung zu `mehrstufige-liste` (unterschiedliches Symbol-/Nummernformat je
   Ebene, Abschnitt 1) ist im Backlog vermerkt — diese Datei liefert die strukturelle,
   rundreisefähige Ebenenänderung; die vollständige optische Ausgestaltung bleibt
   bewusst dem separaten Slug vorbehalten, sofern hier nicht ohnehin mitgelöst.
9. Kein während der Verifikation oder Umsetzung gefundener Fehler bleibt ohne
   Ticket/Vermerk zurück.
