# Anforderungsdatei: Feature „Bild löschen“

Status: **Laut Feature-Backlog „vorhanden“ — gilt aktuell als nicht vertrauenswürdig, muss
vollständig verifiziert werden**, bevor der Status im Backlog (`FEATURE-BACKLOG.md`,
Abschnitt 3.3 „Bilder & Grafiken“, Slug `bild-loeschen`, Priorität 1) bestätigt werden darf.
„Nicht vertrauenswürdig“ gilt hier in beide Richtungen: Es darf nicht unterstellt werden,
dass „vorhanden“ automatisch falsch ist (ggf. reicht das zugrunde liegende
ProseMirror-Standardverhalten tatsächlich aus), und es darf erst recht nicht angenommen
werden, dass „vorhanden“ zutrifft, ohne dass jeder Punkt dieser Datei einzeln nachgewiesen
wurde.

Kurzbeschreibung (Backlog): „Entfernt ein markiertes Bild samt Anker ohne Nebenwirkungen auf
den Text.“

Geltungsbereich: Diese Datei konkretisiert für das Einzelfeature „Bild löschen“, was
`FEATURE-SPEC-DOCX-ODT.md` (Abschnitt 7, „Bilder“) fordert: „Bild löschen (Markieren + Entf)
ohne Nebenwirkungen auf umgebenden Text“, sowie Testfall 9 dort: „Bild löschen → Rundreise-
Export enthält es korrekt nicht mehr, keine verwaisten Bilddateien im Zip.“ Abschnitt 7
markiert Bilder zudem explizit als „von der Nutzerin explizit als nicht funktionsfähig
gemeldet — höchste Priorität“, und Abschnitt 17, Zeile 7 verlangt für den Bild-Button
insgesamt einen „kompletten Nachweis über echte Bedienung“. Diese Datei gilt für **beide**
unterstützten Formate (DOCX und ODT) über den gemeinsamen ProseMirror-Editor
(`src/formats/shared/editor/WordEditor.tsx`, `src/formats/shared/editor/Toolbar.tsx`,
`src/formats/shared/editor/commands.ts`, `src/formats/shared/schema.ts`), da das Löschen
eines Bildes eine reine Editor-Operation ist und sich zwischen den Formaten nicht
unterscheiden darf — nur Import/Export (`src/formats/docx/reader.ts`+`writer.ts`+
`imageCollector.ts`, `src/formats/odt/reader.ts`+`writer.ts`+`imageCollector.ts`) sind
formatspezifisch.

---

## 0. Ist-Stand laut Code-Analyse (Befund vor Verifikation)

Vor der eigentlichen Anforderung hier der nachvollziehbare Befund, warum der Backlog-Status
„vorhanden“ **nicht** ungeprüft übernommen werden darf:

- In `src/formats/shared/schema.ts` (Zeile 45–72) ist der `image`-Node als `group: 'block'`
  mit Attributen `src`/`alt`/`width`/`height` und `draggable: true` definiert. Es gibt
  **kein** `selectable: false` (anders als z. B. `hard_break`, Zeile 38, das dies explizit
  setzt) — das Bild ist also nach ProseMirror-Standardverhalten als eigenständiger Node per
  Klick als `NodeSelection` selektierbar. Das ist die **einzige** im Repository vorhandene
  Grundlage für „Markieren“ — es gibt keinen eigenen Auswahl-Mechanismus, keine Ziehpunkte,
  keine sichtbare Markierungs-UI.
- In `src/formats/shared/editor/commands.ts` existiert **ausschließlich** `insertImage`
  (Zeile 66–74). Es gibt **keinen** `deleteImage`-Befehl, keine Funktion, die gezielt eine
  `NodeSelection` auf ein Bild prüft oder entfernt, und keinerlei Sonderbehandlung für Bilder
  beim Löschen.
- In `src/formats/shared/editor/Toolbar.tsx` (Zeile 241–244) existiert **ein einziges**
  Bild-bezogenes UI-Element: das Label „🖼 Bild“ mit verstecktem `<input type="file">` zum
  **Einfügen**. Es gibt **keinen** Button „Bild löschen“, keinen Kontext-Werkzeugkasten, der
  erscheint, sobald ein Bild selektiert ist, keine Möglichkeit, Alt-Text oder Größe
  nachträglich zu bearbeiten (Alt-Text wird einmalig beim Einfügen aus `file.name` gesetzt,
  Zeile 107: `insertImage(dataUrl, file.name)` — das deckt sich mit dem separaten
  Backlog-Eintrag `bild-alt-text`, Status „teilweise“, der hier nicht Gegenstand ist, aber
  als Nachbar-Funktion relevant bleibt, siehe Abschnitt 2.4).
- In `src/formats/shared/editor/WordEditor.tsx` (Zeile 71–86) bindet die eigene `keymap({...})`
  ausschließlich `Mod-z`, `Mod-y`, `Mod-Shift-z`, `Enter`, `Mod-b`, `Mod-i`, `Mod-u`. Direkt
  danach folgt `keymap(baseKeymap)` (Zeile 80, aus `prosemirror-commands`) — **das** ist die
  einzige Quelle für die Tasten Entf/Rücktaste. `baseKeymap` verkettet für „Delete“
  `chainCommands(deleteSelection, joinForward, selectNodeForward)` und für „Backspace“
  `chainCommands(deleteSelection, joinBackward, selectNodeBackward)`. `deleteSelection`
  ist eine generische Bibliotheksfunktion, die **jede** nicht-leere Selektion entfernt —
  Text, `NodeSelection` auf ein Bild, `CellSelection`, `AllSelection` — ohne jede
  bildspezifische Logik. „Bild löschen“ ist damit **keine eigenständig implementierte,
  getestete Funktion**, sondern ein Nebenprodukt eines generischen Bibliotheks-Fallbacks.
- **Kritischer Zusatzbefund zur Selektions-Sichtbarkeit:** `prosemirror-view` liefert die
  Selektions-Markierung für Node-Selektionen ausschließlich über die CSS-Klasse
  `.ProseMirror-selectednode` (wird per JS gesetzt, siehe
  `node_modules/prosemirror-view/dist/index.js`, `selectNode()`/`deselectNode()`,
  Zeile ~1489–1501: `this.nodeDOM.classList.add("ProseMirror-selectednode")`). Das dazu
  gehörige Styling (`outline: 2px solid #8cf;`) liefert die Bibliothek **nicht automatisch
  mit**, sondern nur als separates Stylesheet `prosemirror-view/style/prosemirror.css`, das
  die konsumierende Anwendung selbst einbinden muss. Eine Volltextsuche im gesamten
  `src/`-Verzeichnis nach `prosemirror-view/style`, `prosemirror.css` sowie nach
  `ProseMirror-selectednode` liefert **keinen einzigen Treffer** — weder in
  `src/index.css` noch in `src/main.tsx` noch irgendwo sonst. **Konsequenz: Ein per Klick
  markiertes Bild bekommt aktuell nachweislich keinerlei sichtbares Feedback** (kein Rahmen,
  kein Hervorheben) — die Klasse wird zwar im DOM gesetzt, aber es existiert keine
  CSS-Regel dafür. Das ist ein wahrscheinlicher Erklärungsansatz für die Nutzerinnen-Meldung
  „Bild löschen funktioniert nicht“: Es ist von außen nicht erkennbar, ob ein Klick das Bild
  überhaupt selektiert hat, bevor Entf gedrückt wird.
- `src/index.css` enthält zwar `.ProseMirror img { max-width: 100%; height: auto; }`
  (Zeile 39–42), aber keine Regel für den Selektionszustand.
- **ImageCollector-Analyse** (`src/formats/docx/imageCollector.ts`,
  `src/formats/odt/imageCollector.ts`): Der Export läuft nachweislich über
  `blocksToDocx`/`blocksToOdt` (`src/formats/docx/writer.ts` Zeile 173ff.,
  `src/formats/odt/writer.ts` Zeile 125ff.), die **den aktuellen ProseMirror-Dokumentbaum
  rekursiv ablaufen** und je besuchtem `image`-Node `images.add(src)` aufrufen. Ein aus dem
  Dokument gelöschtes Bild wird beim nächsten Export schlicht **nicht mehr besucht** — es
  landet also nach aktuellem Code-Stand konzeptionell korrekt nicht mehr im `[Content_Types].xml`
  + `word/media/`-Ordner (DOCX) bzw. `META-INF/manifest.xml` + `Pictures/`-Ordner (ODT). Das
  ist ein Pluspunkt gegenüber einer naiven Erwartung von Datenverlust-Risiko — **muss aber
  trotzdem durch einen echten Test (Bild einfügen → löschen → exportieren → Zip-Inhalt
  prüfen) verifiziert werden**, da es bisher nirgends geprüft wird (siehe nächster Punkt).
- **Tests:** Eine Volltextsuche nach `image` bzw. `Bild` in `tests/e2e/*.spec.ts` liefert
  **keinen einzigen Treffer** — es existiert kein einziger E2E-Test, der überhaupt ein Bild
  im Browser einfügt, geschweige denn eines löscht. `src/formats/docx/__tests__/roundtrip.test.ts`
  (Abschnitt „DOCX round trip: images“, Zeile 251–276) und das ODT-Äquivalent prüfen nur das
  Erhalten-Bleiben eines **hart konstruierten** Bild-Knotens beim Schreiben/Lesen — es wird
  nirgends eine Löschung simuliert oder geprüft. Es gibt keinen Unit-Test für einen
  `deleteImage`-Befehl (weil er nicht existiert) und keinen Test, der die
  `.ProseMirror-selectednode`-Problematik oben aufdeckt.
- **Verwandte, noch nicht umgesetzte Nachbarfunktionen** (nicht Gegenstand dieser Datei, aber
  mit Wechselwirkung auf „ohne Nebenwirkungen“, siehe Abschnitt 2.4): Bildgröße ändern
  (`bild-groesse-aendern`, Status „fehlt“ laut Backlog) und Alt-Text bearbeiten
  (`bild-alt-text`, Status „teilweise“) — Löschen muss unabhängig davon funktionieren, ob
  `width`/`height` gesetzt sind oder der Alt-Text nachträglich geändert wurde.

**Konsequenz für die Bewertung:** Der Backlog-Status „vorhanden“ stützt sich ausschließlich
auf generisches ProseMirror-Bibliotheksverhalten (`NodeSelection` + `baseKeymap`s
`deleteSelection`) **ohne** eigene Implementierung, **ohne** sichtbares Auswahl-Feedback
(fehlendes CSS) und **ohne** einen einzigen Test. Diese Anforderungsdatei legt fest, was
nachgewiesen — und ggf. nachgebessert — werden muss, damit „vorhanden“ zu Recht bestehen
bleibt.

---

## 1. Menüpunkte / Bedienelemente — Soll-Zustand

Eine ernstzunehmende Textverarbeitung (Word: Bild anklicken → Rahmen mit Ziehpunkten
erscheint → Entf; LibreOffice Writer: identisch, zusätzlich Rechtsklick → „Löschen“) bietet
„Bild löschen“ über mehrere gleichwertige Wege an. Jeder dieser Wege muss einzeln
funktionieren und einzeln getestet werden:

| # | Zugriffsweg | Ist-Zustand | Soll |
|---|---|---|---|
| 1 | Bild per Klick markieren (sichtbarer Auswahlrahmen), dann Entf/Rücktaste | Markierung selbst funktioniert technisch (`NodeSelection` wird gesetzt), **aber ohne jedes sichtbares Feedback** (siehe Abschnitt 0 — fehlendes `.ProseMirror-selectednode`-CSS); Löschen läuft nur über den generischen `baseKeymap`-Fallback | Muss durchgängig funktionieren **und sichtbar** sein: Klick auf ein Bild zeigt einen erkennbaren Auswahlrahmen/-zustand (mind. `prosemirror-view/style/prosemirror.css` einbinden oder ein äquivalentes eigenes Styling für `.ProseMirror-selectednode` ergänzen), danach löscht Entf/Rücktaste das Bild vollständig samt Anker. |
| 2 | Kontextabhängiger Toolbar-Button „Bild löschen“ (erscheint nur, wenn ein Bild selektiert ist) | **fehlt komplett** — es gibt nur den Einfügen-Button „🖼 Bild“ | Sollte ergänzt werden (Referenzverhalten Word/LibreOffice bietet mit dem „Bildformat“-Kontextband auch einen expliziten Lösch-Weg neben Entf), analog zur Tabellen-Werkzeugleiste, die für „Zeile löschen“ gefordert ist. Mindestens ist zu dokumentieren, falls bewusst darauf verzichtet wird, weil Entf/Rücktaste als ausreichend gilt. |
| 3 | Rechtsklick-Kontextmenü auf einem selektierten Bild → „Löschen“/„Bild entfernen“ | Kein eigenes Kontextmenü implementiert (`contextmenu` wird nirgends abgefangen, siehe bereits in `ausschneiden-req.md` Abschnitt 0 dokumentiert); es erscheint nur das native Browser-Kontextmenü (i. d. R. „Bild speichern unter…“ etc., kein Löschen-Bezug zum Dokument) | Muss verifiziert bzw. bewusst entschieden werden: entweder ein eigenes, bild-bewusstes Kontextmenü bauen, oder explizit dokumentieren, dass dieser Weg **nicht** unterstützt wird und „Bild löschen“ ausschließlich über Weg 1 (und ggf. 2) erreichbar ist — kein unklarer Zwischenzustand. |
| 4 | Tastenkombination `Mod-Backspace` (Strg+Rücktaste/Cmd+Rücktaste, „ganzes Wort löschen“) auf einem selektierten Bild | Ungeprüft — `baseKeymap` bindet auch `Mod-Backspace` generisch auf `deleteSelection`-Verkettung | Muss verifiziert werden, dass dies bei einer Bild-`NodeSelection` identisch zu einfachem Backspace wirkt (Bild löschen) und nicht zu unerwartetem Verhalten führt. |
| 5 | Drag-Out/Ziehen des Bildes aus dem Editor-Bereich hinaus (z. B. auf den Desktop) | Ungeprüft — `image`-Node ist `draggable: true` (`schema.ts` Zeile 53), `dropCursor()`-Plugin ist aktiv (`WordEditor.tsx` Zeile 83) | Kein vorgesehener Lösch-Weg (Referenzverhalten Word/LibreOffice: Ziehen innerhalb des Dokuments verschiebt, Ziehen nach außen tut je nach Betriebssystem nichts oder kopiert als Datei) — muss aber verifiziert werden, dass ein **abgebrochener** Drag (z. B. Drop außerhalb eines gültigen Ziels, Esc während des Ziehens) das Bild **nicht** versehentlich löscht (siehe Grenzfall 14). |
| 6 | Bestätigungsdialog vor dem Löschen | Nicht vorhanden | Referenzverhalten (Word/LibreOffice) verlangt **keinen** Bestätigungsdialog — Löschen erfolgt sofort, Rückgängig (Strg+Z) ist das vorgesehene Sicherheitsnetz. Kein Soll-Element, aber explizit zu dokumentieren, damit es nicht versehentlich als fehlende Sicherheitsabfrage nachgerüstet wird. |
| 7 | Mobile/Touch: Bild antippen (Selektion), dann Löschen über Bildschirmtastatur-Entf bzw. eine Symbolleiste | Nicht verifizierbar, solange die Sichtbarkeits-Lücke aus Abschnitt 0 nicht behoben ist — auf Touch-Geräten ohne physische Entf-Taste ist unklar, über welchen Weg überhaupt gelöscht werden kann | Auf den in `playwright.config.ts` konfigurierten Projekten „Mobile“ (Pixel 7) und „Tablet“ (iPad Mini) muss mindestens ein funktionierender Weg existieren, ein Bild auszuwählen und zu löschen — sei es über Weg 2 (Toolbar-Button), der auf Touch-Geräten unabhängig von einer physischen Entf-Taste erreichbar sein muss. |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Aktivierungsbedingungen / Selektierbarkeit
- Ein Klick direkt auf das Bild erzeugt eine `NodeSelection` auf genau diesem `image`-Node
  (kein Text davor/danach wird mitselektiert).
- Der Selektionszustand muss **sichtbar** sein (siehe Abschnitt 0 — aktuell nicht der Fall).
  Ohne sichtbares Feedback ist „Markieren“ im Sinne der Backlog-Kurzbeschreibung faktisch
  nicht nachweisbar, selbst wenn die interne ProseMirror-Selektion korrekt sitzt.
- Tab-Navigation zum Bild (Tastatur-only, ohne Maus) ist zu verifizieren: Kann ein Bild
  überhaupt ohne Maus/Touch erreicht und selektiert werden? Falls nicht, ist das als
  Barrierefreiheits-Lücke zu dokumentieren (Bezug zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7,
  „Alt-Text editierbar (Barrierefreiheit)“).

### 2.2 Was genau entfernt wird
- Das **gesamte** `image`-Element (Node samt allen Attributen `src`/`alt`/`width`/`height`)
  wird aus dem Dokument entfernt — „samt Anker“ bedeutet hier: Da Bilder im aktuellen Schema
  als eigenständiger Block-Node (nicht als inline-verankertes Objekt mit separatem
  Ankerpunkt wie in Word/LibreOffice) modelliert sind, ist der „Anker“ mit dem Node selbst
  identisch; es darf **kein** Rest-Element (leerer Absatz an der alten Bildposition **außer**
  wenn dieser durch das Schema zwingend erforderlich ist, siehe 2.4) und **keine**
  verwaiste Referenz zurückbleiben.
- Text unmittelbar vor und unmittelbar nach dem Bild bleibt **exakt unverändert** erhalten —
  das ist der zentrale, in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7 explizit als Risiko
  benannte Punkt („kein Überschreiben wie in Abschnitt 2 befürchtet“, in Bezug auf den
  Selection-Sync-Bug).
- Da `image` ein reiner Block-Node ist (kein Inline-Node innerhalb eines Absatzes), entfernt
  das Löschen niemals Zeichen aus einem umgebenden Absatz — die Absätze davor und danach
  bleiben als eigenständige Absätze bestehen, sie werden **nicht** miteinander verschmolzen.

### 2.3 Sichtbares Feedback bei Selektion (Pflicht-Nachbesserung, siehe Abschnitt 0)
- Vor jedem Verifikationsversuch von „Bild löschen“ muss zuerst geprüft/behoben werden, dass
  ein selektiertes Bild optisch erkennbar ist (Rahmen/Outline). Ohne diesen Nachweis ist
  „Markieren“ aus der Backlog-Kurzbeschreibung nicht erfüllt, selbst wenn das anschließende
  Löschen technisch funktioniert.
- Nach dem Löschen darf **keine** Geister-Markierung (z. B. eine an der alten Position
  hängen gebliebene Outline-Klasse an einem Nachbar-Element) zurückbleiben.

### 2.4 Kontext: Bild in Tabellenzelle, Bild in Liste, Bild als einziges Element
- **Bild in einer Tabellenzelle** (zulässig, da `image` zur `group: 'block'` gehört und
  `cellContent: 'block+'` im Schema erlaubt, `schema.ts` Zeile 106): Löschen des Bildes
  entfernt nur das Bild, die Zelle bleibt als gültige, ggf. leere Zelle (mindestens ein
  leerer Absatz) bestehen — die Tabellenstruktur (Zeilen-/Spaltenzahl, `colspan`/`rowspan`)
  bleibt vollständig unverändert.
- **Bild als einziger Inhalt eines Listenpunkts:** Löschen des Bildes darf den Listenpunkt
  nicht automatisch mit entfernen — der (dann leere) Listenpunkt bleibt bestehen, analog zum
  Referenzverhalten von Word/LibreOffice, es sei denn, ein leerer Listenpunkt ist laut
  Schema (`list_item`, Zeile 98–104: `content: 'paragraph block*'`) ohnehin nicht zulässig,
  dann muss ein leerer Absatz automatisch nachgefüllt werden.
- **Bild ist das einzige Element im gesamten Dokument:** Nach dem Löschen muss mindestens ein
  leerer, gültiger Absatz übrig bleiben, damit der Editor weiterhin bedienbar (Cursor aktiv,
  Tippen möglich) bleibt — analog zur Anforderung in `ausschneiden-req.md`, Abschnitt 3,
  Grenzfall 2, und `zeile-loeschen-req.md`, Abschnitt 2.4.
- **Bild mit gesetztem `width`/`height` (nachträglich oder beim Import gesetzt) vs. Bild ohne
  diese Attribute (Standardwert `null`):** Löschen funktioniert unabhängig vom Attributwert
  identisch — kein Sonderverhalten, das an das Vorhandensein von Größenangaben gekoppelt ist.
- **Bild mit bereits editiertem Alt-Text** (sobald Backlog-Item `bild-alt-text` umgesetzt
  ist): Löschen entfernt den Alt-Text zusammen mit dem Bild, ohne separate Nebenwirkung.

### 2.5 Cursor-/Fokuszustand nach dem Löschen
- Nach dem Löschen landet der Cursor als kollabierte `TextSelection` an einer sinnvollen
  Position in unmittelbarer Nähe der ehemaligen Bildposition — bevorzugt am Anfang des
  nachfolgenden Blocks, ersatzweise am Ende des vorhergehenden Blocks, falls kein
  nachfolgender Block existiert.
- Der Editor bleibt in jedem Fall fokussiert und sofort weiter bedienbar (Tippen funktioniert
  ohne weiteren Klick), konsistent mit `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3 („kein
  Reset, kein Verlust des Fokus“) und dem in Abschnitt 7 dort explizit geforderten Testfall
  2 („Nach Bild-Einfügen: Editor bleibt normal weiter bedienbar“) — das gilt spiegelbildlich
  auch nach dem Löschen.

### 2.6 Undo/Redo-Verhalten
- „Bild löschen“ erzeugt **einen** Undo-Schritt. Strg+Z stellt das Bild mit **exakt** denselben
  Attributen (`src`, `alt`, `width`, `height`) an der ursprünglichen Position wieder her —
  keine Neucodierung/Kompression der `data:`-URL, kein Qualitätsverlust.
- Redo (Strg+Y bzw. Strg+Umschalt+Z) nach einem Undo entfernt das Bild erneut identisch.
- Das Löschen darf sich in der Undo-Historie **nicht** mit einer unmittelbar vorausgehenden,
  unabhängigen Aktion verschmelzen (z. B. Tippen von Text direkt vor dem Bild — beides muss
  separat rückgängig machbar bleiben).

### 2.7 Interaktion mit dem bekannten Selection-Sync-Bug
- `FEATURE-SPEC-DOCX-ODT.md` (Abschnitt 2 und 20) beschreibt einen bereits gefundenen
  Fehler: Nach einer Toolbar-Aktion auf eine Selektion, gefolgt von einem Klick zur
  Neupositionierung, blieb die interne ProseMirror-Selektion veraltet stehen, sodass
  nachfolgende Eingaben ungewollt den gesamten Inhalt ersetzten oder löschten. Der Fix dafür
  (`reconcileSelectionOnClick` in `WordEditor.tsx`, `mouseup`-Handler, Zeile 42–53) reagiert
  auf „DOM zeigt kollabierten Cursor, Modell hält noch nicht-leere Selektion“ — eine
  `NodeSelection` auf ein Bild ist eine **nicht-leere** Selektion und damit ein direkter
  Anwendungsfall dieser Reconciliation-Logik.
- **„Bild löschen“ ist ein zusätzlicher Verdachtsfall**, weil ein Klick auf das Bild eine
  `NodeSelection` erzeugt und ein anschließender Klick an anderer Stelle im Dokument (z. B.
  in den Text danach) exakt die Bedingung auslöst, die `reconcileSelectionOnClick` behandeln
  soll. Pflicht-Testsequenz (siehe Testfälle unten): Text vor und nach einem Bild eingeben →
  Bild anklicken (Selektion) → an anderer Stelle im Text klicken (Neupositionierung) →
  Enter → weiter tippen → Dokument darf nicht korrumpiert werden, Text vor und nach dem Bild
  bleibt vollständig erhalten.

### 2.8 Kein stiller Fehlschlag / keine verwaisten Ressourcen
- Jeder Versuch, „Bild löschen“ auszulösen, ohne dass ein Bild tatsächlich selektiert ist
  (z. B. Entf mit Cursor im normalen Fließtext), darf **nicht** versehentlich benachbarten
  Text löschen — Entf/Rücktaste ohne Bild-`NodeSelection` folgt dem normalen Text-Löschverhalten,
  nicht der Bild-Löschlogik.
- Nach dem Löschen und einem anschließenden Export darf im DOCX-/ODT-Zip-Container **keine**
  verwaiste Bilddatei zurückbleiben (siehe Abschnitt 0, ImageCollector-Analyse — muss
  praktisch nachgewiesen, nicht nur aus dem Code abgeleitet werden).
- Schlägt das Löschen aus einem unerwarteten Grund fehl (z. B. ungewöhnlicher Dokumentzustand
  nach Import einer Fremddatei), darf **kein** Teilzustand entstehen (Bild optisch weg, aber
  Attribut-Reste im Dokumentmodell, oder umgekehrt) — entweder vollständiger Erfolg oder
  unveränderter Ausgangszustand plus sichtbarer Hinweis (`FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 20, Punkt 4).

---

## 3. Grenzfälle

1. **Text unmittelbar vor und nach dem Bild, Bild löschen:** Beide Textteile bleiben exakt
   erhalten (expliziter Test für das in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7 als Risiko
   benannte Verhalten).
2. **Bild ist das einzige Element im Dokument:** Nach dem Löschen bleibt mindestens ein
   leerer, gültiger Absatz übrig, Editor bleibt bedienbar (siehe 2.4).
3. **Bild direkt am Dokumentanfang:** Löschen darf `gapCursor` (`WordEditor.tsx` Zeile 84,
   `prosemirror-gapcursor`) nicht in einen inkonsistenten Zustand bringen — Cursor landet
   danach in einem gültigen Block am Dokumentanfang.
4. **Bild direkt am Dokumentende:** analog, Cursor landet in einem gültigen Block am
   Dokumentende.
5. **Mehrere Bilder im selben Dokument, mittleres Bild löschen:** Nur das markierte Bild
   verschwindet, die übrigen Bilder bleiben unverändert an ihrer Position und unterscheidbar
   (kein Verwechslungsrisiko, siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7, Testfall 6).
6. **Zwei Bilder mit identischem Bildinhalt (gleiche `data:`-URL), eines löschen:** Nur die
   eine referenzierte Node-Instanz verschwindet; sollte die `ImageCollector`-Dedupe-Logik
   (`fileNameByDataUrl`, siehe `imageCollector.ts` beider Formate) beide auf dieselbe
   Zieldatei abbilden, muss das verbleibende Bild nach Export/Reimport weiterhin korrekt
   referenziert sein — kein Verlust der zweiten Instanz.
7. **Bild in einer Tabellenzelle löschen:** Nur das Bild verschwindet, Zelle bleibt gültig
   (mind. leerer Absatz), Tabellenstruktur unverändert (siehe 2.4).
8. **Bild als einziger Inhalt eines Listenpunkts löschen:** Listenpunkt bleibt (leer)
   bestehen bzw. wird automatisch mit einem leeren Absatz gefüllt, Nummerierung der übrigen
   Listenpunkte bleibt unverändert.
9. **Verschachtelte Tabelle mit Bild in einer Zelle der inneren Tabelle:** Löschen darf nicht
   abstürzen, äußere und innere Tabellenstruktur bleiben konsistent (Analogie zu
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6, Testfall 8).
10. **Sehr großes Bild (mehrere MB, `data:`-URL entsprechend lang) löschen:** UI bleibt
    reaktionsfähig, kein spürbares Einfrieren, kein Speicherfehler in der Konsole.
11. **Bild löschen, danach sofort Undo:** Stellt das Bild mit exakt identischen Attributen
    (`src`, `alt`, `width`, `height`) an der ursprünglichen Position wieder her.
12. **Löschen, Undo, danach Redo:** Entfernt das Bild erneut identisch zum ersten Löschvorgang.
13. **Pflicht-Regressionstest für den Selection-Sync-Bug** (siehe 2.7): Text vor/nach Bild →
    Bild selektieren → Klick zur Neupositionierung im Text → Enter → weiter tippen →
    Dokument bleibt konsistent, keine unbeabsichtigte Komplett-Löschung/-Ersetzung.
14. **Bild per Drag anfassen, dann Drop außerhalb eines gültigen Ziels oder Esc während des
    Ziehens:** Bild bleibt unverändert an der ursprünglichen Position bestehen — ein
    abgebrochener Drag darf **nicht** als Löschung interpretiert werden (siehe Abschnitt 1,
    Zeile 5).
15. **Versuch, Entf/Rücktaste ohne Bild-Selektion auszulösen** (Cursor im normalen
    Fließtext, kein Bild markiert): Es wird ganz normal Text gelöscht, kein Bild wird
    fälschlich entfernt, kein Fehler in der Konsole.
16. **Bild unmittelbar nach dem Einfügen löschen** (ohne zwischenzeitlichen Klick woanders,
    Selektion bleibt vom Einfügen her aktiv): Funktioniert identisch zu einer über einen
    späteren Klick hergestellten Selektion.
17. **Reale komplexe Fremddatei mit mehreren, unterschiedlich großen Bildern importieren**
    (Analogie zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7, Testfall 8), eines davon löschen:
    Genau das erwartete Bild verschwindet, alle anderen bleiben unverändert sichtbar.
18. **Bild löschen, danach ein neues Bild an derselben Stelle einfügen:** Neues Bild
    ersetzt korrekt die Position, keine Vermischung mit Attributen/Daten des gelöschten
    Bildes (z. B. kein versehentlich wiederverwendeter `alt`-Text).
19. **Track-Changes-Abhängigkeit (zukünftig, Phase 3, aktuell nicht umgesetzt):** Sobald
    Änderungsverfolgung existiert (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13), muss „Bild
    löschen“ bei aktiver Aufzeichnung als Löschung markiert werden, statt das Bild sofort
    endgültig zu entfernen. Für den aktuellen Verifikationsauftrag ist das **nicht** im
    Scope, aber hier als bekannte künftige Abhängigkeit dokumentiert.
20. **Mobile/Touch:** Bild auf „Mobile“ (Pixel 7) und „Tablet“ (iPad Mini) laut
    `playwright.config.ts` antippen und löschen — mindestens ein funktionierender Weg muss
    auf beiden Projekten nachweisbar sein, unabhängig von einer physischen Entf-Taste.

---

## 4. Rundreise-Anforderung (DOCX und ODT)

### 4.1 Baseline (Voraussetzung, damit Rundreisen zu „Bild löschen“ überhaupt
aussagekräftig sind)
Wie in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3 gefordert: Datei A (DOCX) mit mindestens
einem eingebetteten Bild **unverändert hochladen und ohne jede Änderung wieder
exportieren, danach erneut importieren** → Ergebnis entspricht inhaltlich A (Bild an
gleicher Position, identische Bilddaten, kein Qualitätsverlust — teilweise bereits durch
`roundtrip.test.ts` in `src/formats/docx/__tests__/` und `src/formats/odt/__tests__/` mit
direkt konstruierten Daten abgedeckt, hier zusätzlich über eine reale/importierte Datei zu
verifizieren, z. B. `tests/fixtures/external/docx/VariousPictures.docx` oder
`tests/fixtures/external/odt/images.odt`/`odt-images-linked.odt`/`feature_images.odt`).
Ebenso für ODT. Diese Baseline muss grün sein, damit ein späterer Rundreise-Fehler eindeutig
dem Löschen zugeordnet werden kann und nicht mit einem allgemeinen Bild-Reader/Writer-Fehler
verwechselt wird.

### 4.2 „Bild löschen“-spezifische Rundreise — Testfälle
1. DOCX-Datei mit einem Bild importieren → Bild im Editor löschen → Ergebnis als DOCX
   exportieren → reimportieren → Bild fehlt vollständig, umgebender Text ist unverändert und
   vollständig vorhanden, `[Content_Types].xml` enthält **keinen** Bild-Extension-Eintrag
   mehr (sofern es das einzige Bild war), `word/media/` bzw. das entsprechende
   Beziehungs-XML (`word/_rels/document.xml.rels`) enthält **keine** verwaiste
   `Relationship` mehr auf eine nicht mehr existierende Bilddatei.
2. Dieselbe Sequenz für eine ODT-Datei (Import → Bild löschen → Export als ODT → Reimport,
   `META-INF/manifest.xml` enthält **keinen** Eintrag mehr für die gelöschte Datei im
   `Pictures/`-Ordner, keine verwaiste Datei im Zip).
3. Mehrere Bilder importieren, nur eines löschen → Export → Reimport → genau das erwartete
   Bild fehlt, alle anderen bleiben unverändert und korrekt zugeordnet (kein
   Verwechslungsrisiko, siehe Grenzfall 5/6).
4. Bild in einer Tabellenzelle löschen → Export → Reimport → Zelle bleibt gültig (leer oder
   mit verbliebenem Textinhalt), Tabellenstruktur (Zeilen-/Spaltenzahl, `colspan`/`rowspan`)
   bleibt vollständig konsistent (Analogie zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7,
   Testfall 7, kombiniert mit dem Löschfall).
5. Bild löschen, danach Undo, danach Export (Bild ist durch Undo wiederhergestellt) →
   Reimport → Bild ist **weiterhin vorhanden** — bestätigt, dass Undo den Export-Zustand
   korrekt beeinflusst und nicht nur die Anzeige.
6. Alle Bilder eines Dokuments nacheinander löschen → Export → Reimport → Ergebnis enthält
   keinerlei Bild-Referenzen mehr, restlicher Textinhalt bleibt vollständig erhalten, Datei
   bleibt valide (kein leerer/kaputter Media-Ordner-Verweis).
7. Cross-Format: ODT mit Bild importieren → Bild löschen → als DOCX exportieren →
   reimportieren → Bild bleibt korrekt entfernt, kein Wiederauftauchen durch die
   Formatkonvertierung.
8. Cross-Format umgekehrt: DOCX mit Bild importieren → Bild löschen → als ODT exportieren →
   reimportieren.
9. Doppelte Rundreise (Formatwechsel hin und zurück) an einem Dokument, in dem zuvor ein
   Bild gelöscht wurde: DOCX → Editor (Bild löschen) → ODT → Editor → DOCX → Bild bleibt
   nach zwei Konvertierungen weiterhin korrekt entfernt, keine „Wiederauferstehung“ aus
   einem zwischenzeitlich nicht bereinigten Zustand.
10. Reale komplexe Fremddatei mit mehreren, unterschiedlich großen Bildern importieren
    (z. B. `tests/fixtures/external/docx/VariousPictures.docx`), ein mittleres Bild löschen
    → Export → Reimport → genau das erwartete Bild fehlt, alle anderen bleiben sichtbar und
    unverzerrt.

---

## 5. Menü-/Bedienelement-Übersicht (Soll-Zustand, kompakt)

| # | Element | Aktueller Zustand | Soll |
|---|---|---|---|
| 1 | Sichtbares Auswahl-Feedback für ein selektiertes Bild (`.ProseMirror-selectednode`-Styling) | **fehlt** — Klasse wird von `prosemirror-view` gesetzt, aber keine CSS-Regel dafür vorhanden (siehe Abschnitt 0) | `prosemirror-view/style/prosemirror.css` einbinden oder äquivalentes eigenes Styling ergänzen — Pflicht-Voraussetzung, bevor „Markieren“ überhaupt nachweisbar getestet werden kann |
| 2 | Entf/Rücktaste löscht selektiertes Bild | funktioniert nur implizit über `baseKeymap`s generischen `deleteSelection`-Fallback, kein eigener Befehl, kein Test | über alle Zielprojekte aus `playwright.config.ts` verifizieren; bei Bedarf eigenen `deleteImage`-Befehl in `commands.ts` ergänzen, falls generisches Verhalten in einem Grenzfall nicht ausreicht |
| 3 | Dedizierter Toolbar-Button „Bild löschen“ (kontextabhängig, nur bei Bild-Selektion sichtbar) | fehlt komplett | optional ergänzen oder bewusst als „nicht unterstützt, Entf reicht“ dokumentieren, siehe Abschnitt 1, Zeile 2 |
| 4 | Kontextmenü-Eintrag | ungeprüftes Browser-Standardverhalten, kein Dokumentbezug | verifizieren oder Entscheidung dokumentieren, siehe Abschnitt 1, Zeile 3 |
| 5 | Verwaiste-Ressourcen-Prüfung im Export (Zip-Container) | konzeptionell durch `ImageCollector`-Architektur abgedeckt (Neuaufbau bei jedem Export aus dem aktuellen Doc-Baum), aber **nie durch einen echten Lösch-Test verifiziert** | eigener Test: Bild einfügen → löschen → exportieren → Zip-Inhalt (`[Content_Types].xml`/`manifest.xml` + Media-Ordner) enthält keine verwaiste Datei mehr, siehe Abschnitt 4.2 |
| 6 | Mobile/Touch-Zugriff auf „Bild löschen“ | ungeprüft | auf „Mobile“/„Tablet“-Playwright-Projekten mindestens ein funktionierender Weg |
| 7 | Dauerhafter Regressionstest Selection-Sync-Bug × Bild löschen | fehlt | Pflichttest gemäß Abschnitt 2.7/3.13 |
| 8 | Abgebrochener Drag löscht nicht versehentlich | ungeprüft | eigener Test, siehe Grenzfall 14 |

---

## 6. Testfälle (Zusammenfassung, E2E-Fokus)

Analog zum Playwright-Aufbau in `tests/e2e/selection-regression.spec.ts` (echte
Browser-Interaktion über `page.keyboard`, `.ProseMirror`-Locator, echter
`filechooser`-Flow zum Bild-Einfügen wie in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 7,
Testfall 1 gefordert — keine isolierten Command-Aufrufe):

1. Bild über Toolbar einfügen (echter `filechooser`-Flow) → Bild anklicken → sichtbarer
   Auswahlrahmen erscheint (Pflicht-Vorbedingung, siehe Abschnitt 0/5, Zeile 1) → Entf
   drücken → Bild verschwindet vollständig aus dem Dokument.
2. Text vor und nach dem Bild eingeben, Bild löschen → beide Textteile bleiben exakt
   erhalten (expliziter Test für das in der Feature-Spec beschriebene Risiko).
3. Bild einfügen, löschen, danach Rückgängig (Strg+Z) → Bild erscheint mit identischen
   Attributen an der ursprünglichen Position wieder, Text unverändert.
4. Strg+Z, danach Strg+Y (Redo) → Bild wird erneut identisch entfernt.
5. Mehrere Bilder einfügen, ein mittleres per Klick selektieren und löschen → nur dieses
   Bild verschwindet, die anderen bleiben unverändert und unterscheidbar.
6. Bild in eine Tabellenzelle einfügen, dort löschen → nur das Bild verschwindet, Zelle und
   Tabellenstruktur bleiben unverändert.
7. Regressionstest (Pflicht, dauerhaft in der Suite): Text vor/nach Bild eingeben → Bild
   selektieren → Klick zur Neupositionierung im Text → Enter → weiter tippen → Dokument
   bleibt korrekt, keine unbeabsichtigte Löschung/Ersetzung (siehe Abschnitt 2.7/3.13).
8. Entf-Taste ohne jede Bild-Selektion (Cursor im normalen Fließtext) → nur normaler
   Text wird gelöscht, kein Bild betroffen, keine Konsole-Exception.
9. Bild per Drag anfassen und Drop außerhalb eines gültigen Ziels/Esc während des Ziehens →
   Bild bleibt unverändert bestehen (siehe Grenzfall 14).
10. „Bild löschen“ → Export nach DOCX → Reimport → siehe Abschnitt 4.2, Testfall 1
    (inkl. Zip-Inhalt-Prüfung auf verwaiste Dateien).
11. „Bild löschen“ → Export nach ODT → Reimport → siehe Abschnitt 4.2, Testfall 2.
12. Reale komplexe Fixture-Datei mit mehreren Bildern importieren (z. B.
    `tests/fixtures/external/docx/VariousPictures.docx`), eines per Toolbar-Klick + Entf
    löschen → alle übrigen Bilder bleiben sichtbar unverändert.
13. „Bild löschen“ auf allen drei in `playwright.config.ts` konfigurierten Projekten
    (Desktop Chrome, Mobile/Pixel 7, Tablet/iPad Mini) → Kernverhalten (Punkte 1, 2, 7)
    funktioniert auf jedem Projekt.

---

## 7. Testmatrix — Zusammenfassung

| Bereich | Unit-Test | E2E-Test | Rundreise-Test (DOCX/ODT) |
|---|---|---|---|
| Sichtbares Auswahl-Feedback (`.ProseMirror-selectednode`-CSS) | n/a | **fehlt, Pflicht-Vorbedingung** | n/a |
| Basis-Löschen (ein Bild, Klick + Entf) | fehlt | fehlt — muss neu gebaut werden | fehlt |
| Text vor/nach Bild bleibt erhalten | fehlt | fehlt | n/a |
| Mehrere Bilder, gezieltes Löschen eines einzelnen | fehlt | fehlt | fehlt |
| Bild in Tabellenzelle löschen | fehlt | fehlt | fehlt |
| Bild in Liste löschen | fehlt | fehlt | fehlt |
| Undo/Redo nach Bild löschen | fehlt | fehlt | n/a |
| Verwaiste-Ressourcen-Prüfung im Zip nach Löschen | fehlt (nur konzeptionell durch Architektur plausibel) | fehlt | fehlt |
| Selection-Sync-Regressionstest × Bild löschen | fehlt | **Pflicht, fehlt aktuell** | n/a |
| Abgebrochener Drag löscht nicht versehentlich | fehlt | fehlt | n/a |
| Cross-Format-Rundreise nach Bild löschen | n/a | fehlt | fehlt |
| Mobile/Tablet-Verhalten | n/a | fehlt | n/a |

**Fazit:** Der Backlog-Status „vorhanden“ stützt sich ausschließlich auf generisches
ProseMirror-Bibliotheksverhalten (`NodeSelection` + `baseKeymap`s `deleteSelection`) ohne
eigene Implementierung — und das bereits vorgelagerte „Markieren“ ist mangels eingebundenem
`.ProseMirror-selectednode`-CSS aktuell nicht einmal sichtbar. Es existiert kein einziger
Test, der Bild-Einfügen oder -Löschen im Browser prüft. Bevor der Status auf „vorhanden“
bestätigt werden darf, müssen mindestens die Pflicht-Testfälle aus Abschnitt 6
(insbesondere Punkt 1, der die CSS-Lücke aufdeckt, und Punkt 7, der
Selection-Sync-Regressionstest) grün sein und die Rundreise-Anforderungen aus Abschnitt 4
für beide Formate nachgewiesen werden.

---

## 8. Abnahmekriterien (Definition of Done)

1. Ein selektiertes Bild ist im Editor sichtbar erkennbar (Auswahlrahmen/-Outline) —
   entweder durch Einbinden von `prosemirror-view/style/prosemirror.css` oder ein
   äquivalentes eigenes Styling für `.ProseMirror-selectednode` (Abschnitt 0/5, Zeile 1).
   Ohne diesen Nachweis gilt „Markieren“ als nicht erfüllt.
2. Entf/Rücktaste auf einem selektierten Bild entfernt es zuverlässig samt Anker, ohne
   Nebenwirkung auf Text davor/danach (Abschnitt 2.2, Grenzfall 1).
3. Für jeden weiteren Zugriffsweg aus Abschnitt 1 ist dokumentiert, ob er unterstützt wird —
   kein unklarer Zwischenzustand.
4. Die Sonderfälle „Bild als einziges Dokumentelement“, „Bild in Tabellenzelle“, „Bild in
   Liste“ (Abschnitt 2.4, Grenzfälle 2/7/8) sind je durch einen eigenen Test nachgewiesen.
5. Alle Grenzfälle aus Abschnitt 3 sind einzeln durch einen Test abgedeckt oder als bewusst
   nicht unterstützt mit Begründung dokumentiert.
6. Der Pflicht-Regressionstest für den Selection-Sync-Bug in Kombination mit „Bild löschen“
   (Abschnitt 2.7/3.13/6.7) ist geschrieben, grün und dauerhaft Teil der Suite.
7. Alle Rundreise-Testfälle aus Abschnitt 4.2 sind für DOCX **und** ODT grün, inklusive der
   expliziten Prüfung auf verwaiste Bilddateien im Zip-Container (Testfälle 1/2/6).
8. Kein Testfall zeigt stillen Datenverlust (Text neben dem Bild verschwindet, oder ein
   Bild verschwindet ohne nachvollziehbare Undo-Möglichkeit) oder eine JS-Exception in der
   Konsole.
9. Der Backlog-Eintrag `bild-loeschen` wird erst dann weiterhin als „vorhanden“ geführt,
   wenn Punkte 1–8 erfüllt sind; andernfalls ist der Status auf „teilweise“ zu korrigieren
   (voraussichtlich wegen der fehlenden CSS-Einbindung und der fehlenden Tests) und die
   fehlenden Teile sind als eigene Nachfolge-Aufgaben zu erfassen.
