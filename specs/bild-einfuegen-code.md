# Umsetzungsplan: Feature „Bild aus Datei einfügen"

Gegenstück zu `specs/bild-einfuegen-req.md` (Anforderung). Dieses Dokument ist der
**dateigenaue Entwicklungsplan**: was am bestehenden Code nachweislich falsch/
unvollständig ist (durch eigene Codesichtung **und** durch tatsächliche Testläufe
gegen den echten `wordSchema`/`insertImage`-Code verifiziert, nicht nur aus der
Anforderung übernommen), welche Dateien sich ändern bzw. neu entstehen, und in
welcher Reihenfolge.

**Methodischer Hinweis:** Für Abschnitt 1 wurden mehrere in der Anforderung als
„Verdacht" formulierte Annahmen (insbesondere Abschnitt 3.2/2.8 der Anforderung)
nicht nur durch Lesen des ProseMirror-Bibliothekscodes eingeschätzt, sondern durch
tatsächliche, temporäre Vitest-Testläufe gegen `wordSchema`/`insertImage` (dann
wieder entfernt, nicht Teil dieses Repos) empirisch verifiziert. Wo das der Fall
ist, steht „**empirisch verifiziert**" statt „vermutlich"/„laut Bibliotheksdoku".
Das widerlegt an zwei Stellen sogar die naheliegende Lesart des
Transform-Quellcodes (siehe 1.6/1.7) — ein gutes Beispiel dafür, warum reine
Code-Lektüre bei ProseMirrors Slice-Fitting-Algorithmus nicht ausreicht.

---

## 0. Geltungsbereich und Abgrenzung zu Geschwister-Plänen

`image` (`src/formats/shared/schema.ts:45-72`) ist ein gemeinsamer Schema-Knoten
für **sechs** separate Backlog-Slugs mit eigenen (teils noch nicht geschriebenen)
Anforderungsdateien:

| Slug | Datei | Verhältnis zu diesem Plan |
|---|---|---|
| `bild-einfuegen` | `specs/bild-einfuegen-req.md` | **Dieser Plan.** Einfügen einer Bilddatei per nativer Dateiauswahl an der Cursor-Position, Formatprüfung, sinnvolle Standardgröße beim Einfügen, Rundreise (DOCX+ODT) inkl. Größe, Toolbar-Bedienbarkeit/Icon. |
| `bild-alt-text` | `specs/bild-alt-text-req.md` (noch nicht geschrieben) | Eigener Slug für **nachträglich editierbaren** Alt-Text. Dieser Plan liefert nur den bereits heute vorhandenen automatischen Startwert (`file.name`) ab, rührt ihn nicht an. |
| `bild-groesse-aendern` | `specs/bild-groesse-aendern-req.md` | Eigene, bereits existierende, sehr ausführliche Anforderung für **nachträgliche** Größenänderung (Eingabefeld/Ziehpunkte, `setImageSize`-Command, NodeView). Jene Datei bestätigt in ihrem Abschnitt 6 exakt denselben Ist-Stand wie hier (`insertImage` setzt nie `width`/`height`) und stellt fest: „Das Datenmodell für die Größe existiert bereits vollständig — es fehlt ausschließlich die Bedienung." **Dieser Plan liefert die dafür nötige Grundlage** (siehe 4.4: `insertImage` setzt ab jetzt echte `width`/`height`; siehe 4.8/4.10: Reader lesen die Fremd-Datei-Größe korrekt ein) — baut selbst aber **keine** Ziehpunkte/kein Eingabefeld/keinen `setImageSize`-Command. `bild-groesse-aendern-code.md` (noch nicht geschrieben) kann auf den hier eingeführten `src/formats/shared/units.ts` sowie auf die Tatsache aufsetzen, dass `width`/`height` ab hier für jedes neu eingefügte und jedes aus einer Fremddatei importierte Bild bereits nicht-`null` sind. |
| `bild-zuschneiden` | — (Backlog: fehlt, Priorität 3) | Kein Bezug, kein Code hier berührt. |
| `bild-online` | — (Backlog: fehlt, Priorität 4) | Kein Bezug. |
| `textumbruch-bild`/`bild-position` | — (Backlog: fehlt) | Kein Bezug — `image` bleibt `group: 'block'`, keine freie Verankerung. |
| `bild-loeschen` | `specs/bild-loeschen-req.md` | Eigene, bereits existierende Anforderung für Markieren+Löschen. Deren Abschnitt 0 identifiziert **dieselbe** CSS-Lücke (kein `.ProseMirror-selectednode`-Stil), die auch Abschnitt 4 von `bild-einfuegen-req.md` fordert („Markiertes Bild muss sich visuell erkennbar unterscheiden"). **Dieser Plan behebt die CSS-Regel bereits** (4.6 unten), weil sie eine Ein-Zeilen-Änderung an gemeinsam genutzter Infrastruktur ist und explizit Abschnitt 4 dieser Anforderung zugeordnet ist — `bild-loeschen-code.md` (noch nicht geschrieben) sollte das als bereits erledigt voraussetzen, nicht erneut umsetzen. Alles andere aus `bild-loeschen-req.md` (Lösch-Command-Robustheit, Undo-Verhalten beim Löschen selbst) bleibt dort. |

**Konsequenz für dieses Dokument:** Es deckt vollständig ab, was
`bild-einfuegen-req.md` Abschnitt 1–5 fordert (Einfügen, Formatprüfung, Größe beim
Einfügen, Alt-Text-Startwert, Undo/Redo, Zusammenspiel mit Löschen als
Randbedingung, Geltungsbereich in der Dokumentstruktur) sowie die komplette
Rundreise-Anforderung aus Abschnitt 5. Es liefert **keine** Resize-UI, **keinen**
editierbaren Alt-Text, **kein** Zuschneiden, **keine** Online-Bildsuche, **keine**
freie Verankerung/Textumbruch.

---

## 1. Bestätigter Ist-Stand (eigene Codesichtung + Testläufe)

Alle Befunde aus `bild-einfuegen-req.md` Abschnitt 0 wurden gegen den tatsächlichen
Code erneut geprüft; zusätzlich wurden mehrere in der Anforderung als offene
„Verdachte" markierte Punkte (Abschnitt 3.1, 3.2, 2.8) durch tatsächliche
Testläufe gegen `wordSchema`/`insertImage` geklärt (siehe Kasten oben).

### 1.1 Schema, Command, Toolbar — bestätigt wie in der Anforderung beschrieben

- `src/formats/shared/schema.ts:45-72`: `image`-Node mit `src`/`alt`/`width`/
  `height`, `group: 'block'`, `draggable: true`. **Zusatzbefund, in der
  Anforderung nicht genannt:** `width`/`height` sind die **einzigen** Attribute
  im gesamten Schema **ohne** `validate`-Eintrag (jedes andere Attribut in
  `schema.ts`, z. B. `align`, `level`, `start`, `colspan`, hat `validate:
  'string'|'number'`). Zusätzlich liest `parseDOM`s `getAttrs` (Zeile 62-63)
  `el.getAttribute('width')`/`('height')` — das liefert laut DOM-Spezifikation
  einen **String oder `null`**, keine Zahl, obwohl `attrs.width`/`height` an
  anderer Stelle (DOCX-/ODT-Writer) arithmetisch verwendet werden
  (`Number(node.attrs?.width ?? 300)`, `docx/writer.ts:76`). Funktioniert heute
  nur, weil dort defensiv `Number(...)` aufgerufen wird — ein Inkonsistenz-Fund,
  siehe Fix F0 unten.
- `src/formats/shared/editor/commands.ts:66-74`: `insertImage(src, alt='')`
  erzeugt den Node **ausschließlich** mit `src`/`alt`; `width`/`height` bleiben
  Schema-Default `null`. Bestätigt.
- `src/formats/shared/editor/Toolbar.tsx:241-244`: `<label>` statt `<button>`,
  kein `title`/`aria-label`. Bestätigt.
- `src/formats/shared/editor/Toolbar.tsx:97-108` (`handleImagePick`): keine
  `file.type`-Prüfung, keine Signaturprüfung, keine Größenprüfung, kein
  try/catch um die `FileReader`-Promise, `alt` wird stumpf auf `file.name`
  gesetzt. Bestätigt.

### 1.2 DOCX-Export/-Import — bestätigt, mit einer Ergänzung

- `src/formats/docx/writer.ts:72-92` (`imageParagraphXml`): Fallback `300`/`200`
  px, EMU-Umrechnung `x/96*914400` **inline im Writer dupliziert** (keine
  gemeinsame Funktion mit einem künftigen Reader-seitigen Gegenstück) — genau
  das Risiko, das eine symmetrische Rundreise gefährdet, falls Reader und Writer
  unabhängig voneinander leicht unterschiedliche Rundungsformeln verwenden.
  Bestätigt.
- `src/formats/docx/reader.ts:134-138` (`decodeParagraphRuns`, Fall
  `'drawing'`): liest `r:embed` und `wp:docPr/@name`, **nicht** `wp:extent`.
  Bestätigt — `child.getElementsByTagNameNS(OOXML_NAMESPACES.wp, 'extent')`
  wird an keiner Stelle im Reader aufgerufen (per Grep verifiziert: `grep -rn
  "'extent'" src/formats/docx` liefert **keinen** Treffer).
- **Zusatzbefund:** Die fehlende `wp:extent`-Auswertung betrifft **automatisch
  auch** Bilder in Tabellenzellen (`parseTable`, `docx/reader.ts:236-238`, ruft
  `paragraphToBlocks` pro `<w:tc>`-Absatz auf) und in Kopf-/Fußzeilen
  (`readBodyChildren` wird für Body **und** Header/Footer verwendet,
  `docx/reader.ts:346,363,372`) — der Fix in 4.9 behebt also alle drei
  Kontexte mit **einer** Änderung, keine separate Cell-/Header-Logik nötig.

### 1.3 ODT-Export/-Import — bestätigt, plus ein bislang nicht dokumentierter Zusatzbefund

- `src/formats/odt/writer.ts:112-119` (`blockToOdt`, Fall `'image'`): Fallback
  `6cm`/`4cm`; falls `width`/`height` gesetzt sind, wird **wörtlich**
  `` `${node.attrs.width}px` `` als Wert von `svg:width` geschrieben. Bestätigt.
- **Neufund (nicht in der Anforderung benannt):** `svg:width`/`svg:height` auf
  `draw:frame` sind laut ODF-1.3-Spezifikation vom Datentyp „length" — einer
  positiven Zahl **mit** Einheit aus der festen Menge `{cm, mm, in, pt, pc}`.
  `"px"` gehört **nicht** zu dieser Menge. LibreOffice liest ein
  `"300px"`-`svg:width` in der Praxis vermutlich tolerant ein (nicht in dieser
  Sichtung an echtem LibreOffice verifiziert), aber ein **unabhängiger
  ODF-Schema-Validator** (siehe Anforderung 5.1.12, Abnahmekriterium 4) würde
  diesen Wert mit hoher Wahrscheinlichkeit als ungültig zurückweisen. Das ist
  ein durch eigene Lektüre der ODF-Spezifikation identifizierter, in der
  Anforderungsdatei nicht genannter zusätzlicher Befund — siehe Fix F8.
- **Zweiter Neufund:** DOCX und ODT verwenden heute **unterschiedliche**
  Ersatzgrößen, die sich **nicht** ineinander umrechnen: DOCX fällt auf 300×200
  px zurück (Seitenverhältnis 3:2 = 1,5), ODT auf 6×4 cm (ebenfalls 3:2 = 1,5,
  aber **6 cm ≙ 226,77 px bei 96 dpi, nicht 300 px**). Dasselbe Bild ohne
  gespeicherte Größe würde also – unabhängig vom eigentlichen Bug, dass
  `insertImage` nie eine Größe setzt – bei Export nach DOCX **und** nach ODT in
  zwei **physisch unterschiedlichen** Größen erscheinen. Wird durch Fix F1/F7/F8
  (gemeinsame `DEFAULT_IMAGE_WIDTH_PX`/`_HEIGHT_PX`-Konstante, siehe 4.3) als
  Nebeneffekt behoben.
- `src/formats/odt/reader.ts:144-153` (`paragraphToBlocks`, `draw:frame`-Fall):
  liest `xlink:href` und `draw:name`, **nicht** `svg:width`/`svg:height` am
  `draw:frame`-Element selbst. Bestätigt. Gilt — analog zu 1.2 — automatisch
  auch für Tabellenzellen (`elementToBlocks`, `odt/reader.ts:189-203`, ruft
  rekursiv für Zelleninhalt wieder `elementToBlocks`→`paragraphToBlocks` auf)
  und Kopf-/Fußzeile (`readOdt`, `odt/reader.ts:262,266`).

### 1.4 Fehlende CSS-Selektions-Rückmeldung — bestätigter Zusatzbefund

`src/index.css` enthält **keine** Regel für `.ProseMirror-selectednode`.
ProseMirror-View setzt diese Klasse automatisch auf das DOM-Element eines
Knotens, sobald er per `NodeSelection` (z. B. durch Anklicken, da `image` kein
`selectable: false` hat) markiert ist — **unabhängig** von einer Stylesheet-
Definition. Ohne eigene Regel ist ein selektiertes Bild optisch **nicht** von
einem unselektierten zu unterscheiden. Weder `src/index.css` noch irgendeine
importierte Datei bindet das mitgelieferte `prosemirror-view/style/
prosemirror.css` ein (per Grep verifiziert: kein Treffer für
„ProseMirror-selectednode" oder „prosemirror.css" im gesamten `src`). Das ist
exakt die in Abschnitt 4 (letzter Punkt) von `bild-einfuegen-req.md` geforderte
und in `bild-loeschen-req.md` Abschnitt 0 unabhängig bestätigte Lücke.

### 1.5 `.ProseMirror img { max-width: 100%; height: auto }` existiert bereits

`src/index.css:39-42` enthält bereits genau die in Abschnitt 4 der Anforderung
geforderte CSS-Begrenzung. **Kein Fix nötig**, nur Testabdeckung fehlt (siehe
5.2). Wichtige Erkenntnis für 4.4: `height: auto` überschreibt beim Rendern
zwar das HTML-`height`-Attribut, das ist hier **erwünscht**, nicht schädlich —
solange `width`/`height` im Node das **korrekte Seitenverhältnis** abbilden
(was Fix F1 sicherstellt), ergibt `height: auto` bei einer durch `max-width:
100%` erzwungenen Verkleinerung exakt die proportional korrekte Höhe, statt bei
festem Pixel-`height` zu verzerren. Die beiden Fixes (F1 unten + bestehendes
CSS) ergänzen sich; keiner der beiden macht den anderen überflüssig.

### 1.6 Empirisch verifiziert: Grundfall (Absatz-Teilung, Anforderung 2.1.3/3.2) funktioniert bereits korrekt auf Command-Ebene

Per temporärem Vitest-Testlauf gegen `wordSchema`/`insertImage` (`EditorState`
mit `TextSelection` an definierter Position, `insertImage(...)( state, tr =>
... )` aufgerufen, resultierendes `tr.doc.toJSON()` inspiziert) wurde
**bestätigt**, dass `insertImage` in Kombination mit
`state.tr.replaceSelectionWith(node)` für **alle** in Anforderung 3.2
gelisteten Cursor-Positionen strukturell korrekt arbeitet:

| Fall (Anforderung 3.2) | Ergebnis (empirisch, `wordSchema`) |
|---|---|
| (a) ganz am Anfang eines nicht-leeren Absatzes | Bild wird **vor** den (unverändert vollständigen) Absatz eingefügt, kein leerer Stub-Absatz übrig. |
| (b) ganz am Ende | Bild wird **nach** dem (unverändert vollständigen) Absatz eingefügt. |
| (c) inmitten eines Wortes | Absatz wird an der Cursor-Position geteilt, **beide** Textteile bleiben vollständig und in eigenen Absätzen erhalten (`"Hallo"` / `"Welt"` aus `"HalloWelt"`) — **das ist exakt der von der Nutzerin gemeldete Kernfall, und er tritt auf Command-Ebene nicht als Fehler auf.** |
| (d) inmitten bereits fett/kursiv formatierten Textteils | Beide Textteile behalten ihre Marks (`strong` blieb auf beiden Hälften erhalten); das Bild selbst erhält **keine** der umgebenden Marks (kein `<strong><img></strong>`-Wrapping, empirisch verifiziert — trotz `replaceSelectionWith`s `node.mark(...)`-Aufruf mit `inheritMarks: true`, der Standardeinstellung). |
| (e) in einem komplett leeren Absatz | Der leere Absatz wird durch das Bild **ersetzt** (nicht: Bild + daneben übrig bleibender leerer Absatz) — sauber, kein verwaister leerer Block. |
| (f) unmittelbar vor einem `hard_break` | Absatz wird geteilt, der `hard_break` bleibt korrekt im **zweiten** Teilabsatz erhalten, nicht verloren. |
| Überschrift, Cursor mittig im Text | **Analog zu (c):** Überschrift wird in **zwei** Überschriften-Knoten gleichen Levels geteilt, Bild dazwischen. Kein Crash. *(Widerlegt eine eigene Vor-Analyse dieses Plans, die aus `heading: { defining: true }`, `schema.ts:23`, geschlossen hatte, dass die „Escape"-Logik in `prosemirror-transform`s `replaceRange` hier blockiert würde und ein anderes Verhalten – ggf. No-Op oder Fehler – zu erwarten sei. Der `defining`-Flag beeinflusst nur die *bevorzugte* Zieltiefe für die Slice-Passung, nicht, ob überhaupt eine gültige Zieltiefe gefunden wird; die allgemeine `targetDepths`-Suche in `replaceRange` findet unabhängig davon die Überschrift selbst als gültige, vollständig abgedeckte Zieltiefe. Bewusst als Lehrbeispiel hier dokumentiert: **Codelektüre allein hätte hier zum falschen Schluss geführt — ausschlaggebend war der tatsächliche Testlauf.*)* |
| Überschrift, Cursor am Anfang/Ende | Bild wird **vor**/**nach** die komplette (unveränderte) Überschrift gesetzt — **kein** Teilen, anders als bei Cursor mittig im Text. |
| `list_item` (einzige Absatz-Kind), Cursor am Anfang des Absatzinhalts | **Nicht** wie beim Top-Level-Absatz (dort: Bild vor den ganzen Block) — stattdessen wird der Absatz-Inhalt **innerhalb desselben `list_item`** an dieser Stelle geteilt (ein 1-Zeichen-Stub-Absatz plus Bild plus Rest-Absatz), weil `list_item`s Content-Ausdruck `'paragraph block*'` (`schema.ts:99`) verlangt, dass das **erste** Kind ein `paragraph` bleibt — ProseMirrors Fitting-Algorithmus verletzt das korrekt nie, auch nicht am Anfang. Kein Schema-Crash, keine aus der Liste „ausgestoßene" Bildposition, **kein** Vertauschen zwischen benachbarten Listenpunkten (separat mit zwei `list_item`s getestet). |
| `list_item`, Cursor mittig/am Ende | Analog (c)/(b), Bild bleibt **innerhalb** desselben `list_item`. |
| `table_cell` (einzige Absatz-Kind), Cursor mittig | Analog (c) — Zelle bleibt danach `[paragraph, image, paragraph]`, weiterhin gültig laut `cellContent: 'block+'` (`schema.ts:106`). |

**Konsequenz für diesen Plan:** Es gibt **keinen** Command-seitigen Bug für den
von der Nutzerin gemeldeten Kernfall (Textverlust bei Einfügen inmitten eines
Absatzes). Das schließt **nicht** aus, dass das gemeldete Problem real ist —
es verlagert den wahrscheinlichsten Fehlerort aber weg von
„`replaceSelectionWith`/ProseMirror-Fitting" hin zu einem der folgenden, in
Abschnitt 2 als Fixes behandelten Kandidaten:

1. Das `<label>`-statt-`<button>`-Element hat kein `onMouseDown`+
   `preventDefault()` wie jedes andere Toolbar-Element (`MarkButton`,
   `AlignButton`, Tabellen-Button — vgl. `Toolbar.tsx:49-51,71-73,195-197` etc.)
   — es ist unklar, ob/wie das den Fokus zwischen Klick und Dateiauswahl anders
   behandelt als die übrigen, nachweislich funktionierenden Buttons. Fix F2
   (Umstellung auf `<button>` + `.click()` auf verstecktes Input, siehe 3.2)
   vereinheitlicht das Verhalten mit dem Rest der Toolbar und mit dem bereits
   im Projekt bewährten Muster aus `FormatPicker.tsx:61-89`.
2. Ohne gesetzte `width`/`height` rendert der Browser das `<img>` in
   **Originalgröße** (z. B. mehrere tausend Pixel breit bei einem
   Smartphone-Foto) — das kann den Eindruck von „Text verschwunden" erzeugen,
   wenn der zweite Textteil weit nach unten aus dem sichtbaren Bereich
   verdrängt wird, obwohl er tatsächlich vorhanden ist. Fix F1 (Standardgröße
   beim Einfügen) behebt das strukturell.
3. Eine beschädigte/falsch getypte Datei erzeugt heute ein kaputtes
   `<img>`-Platzhaltersymbol **ohne** Fehlermeldung (bestätigt, Abschnitt 3.3
   der Anforderung) — das könnte in der Nutzer-Wahrnehmung ebenfalls wie „das
   Bild wurde nicht eingefügt, evtl. zusammen mit Text" wirken. Fix F3/F4.

Diese drei Kandidaten sind **nicht gegeneinander exklusiv geprüft** (das
erfordert den in Abschnitt 5.2 geplanten E2E-Test mit echtem
`filechooser`-Flow) — sie werden hier als die durch Codeanalyse
plausibelsten, konkret behebbaren Ursachen behandelt, nicht als
abschließend bewiesen. Der Plan behebt alle drei ohnehin (unabhängig
voneinander begründet), das ist keine unnötige Arbeit auf Verdacht.

### 1.7 Empirisch verifiziert: Selektions-Timing (Anforderung 3.1)

`run(view, command)` (`Toolbar.tsx:23-26`) liest `view.state`/`view.dispatch`
**zum Zeitpunkt des Aufrufs**, nicht zu einem früher zwischengespeicherten
Zeitpunkt — `view` ist die aktuelle `EditorView`-Instanz (Prop, nicht als Kopie
festgehalten), `handleImagePick` ruft `run(view, insertImage(...))` erst
**nach** `await` der Dateilese-Promise auf. Das bedeutet: Der eingefügte
Node landet immer an der Selektion, die **zum Zeitpunkt des tatsächlichen
Einfügens** aktuell ist — nicht an einer beim Klick zwischengespeicherten,
potenziell veralteten Position. Das ist **strukturell bereits das in
Abschnitt 3.1 der Anforderung geforderte Verhalten** (Einfügen an der
Position, die zum Zeitpunkt des `run(...)`-Aufrufs gilt), kein Bug. Das in
`WordEditor.tsx:42-53` dokumentierte, separate Selection-Sync-Problem
(`reconcileSelectionOnClick`, per `mouseup`-Listener **auf `view.dom`**
behoben) greift hier nicht unmittelbar, weil ein Klick auf das
Toolbar-Bedienelement kein `mouseup`-Ereignis **innerhalb** von `view.dom`
auslöst — es bleibt aber ein aus dem Code nicht widerlegbares Restrisiko,
**falls** vor dem Öffnen des Dateidialogs bereits eine veraltete/inkorrekte
Selektion vorlag (z. B. genau die in `WordEditor.tsx` dokumentierte
AllSelection-Situation) — das würde unverändert in die Bild-Einfügung
übernommen. Dafür gibt es keinen neuen Fix in diesem Plan (die
`reconcileSelectionOnClick`-Infrastruktur deckt normale Klicks bereits ab); es
wird stattdessen mit einem Regressionstest analog
`selection-regression.spec.ts` abgesichert (5.2).

---

## 2. Priorisierte Fehler-/Lückenliste

„Muss" = blockierend für die Definition of Done aus `bild-einfuegen-req.md`
Abschnitt 7. „Soll" = empfohlen, nicht blockierend. „Dokumentiert" = bewusst
nicht behoben, siehe Abschnitt 6/7.

| # | Befund | Einstufung | Fix in Abschnitt |
|---|---|---|---|
| F1 | `insertImage` setzt nie `width`/`height` → Editor-Darstellung/Export-Größe divergieren (Grenzfall 3.4) | **Muss** | 3.3/3.4/4.4/4.5 |
| F2 | Toolbar-Element ist `<label>`, kein `<button>`; kein `title`/`aria-label`; Emoji-Icon | **Muss** | 3.2/4.5 |
| F3 | Keine Formatprüfung (MIME/Magic-Number), keine Fehlermeldung, kein try/catch (Grenzfall 3.3) | **Muss** | 3.1/4.2/4.5 |
| F4 | Keine Größenobergrenze/Messung für sehr große Dateien (Grenzfall 3.7) | **Soll** | 4.2/9 |
| F5 | DOCX-Reader liest `wp:extent` nicht → Größe geht bei Fremddatei-Import verloren (Grenzfall 3.5, höchste Priorität laut Anforderung) | **Muss** | 4.9 |
| F6 | ODT-Reader liest `svg:width`/`svg:height` nicht (Grenzfall 3.5) | **Muss** | 4.11 |
| F7 | DOCX-/ODT-Writer verwenden unterschiedliche, undokumentierte Ersatzgrößen bei fehlender Größe (Neufund 1.3) | **Soll** | 4.3/4.8/4.10 |
| F8 | ODT-Writer schreibt `svg:width/height` mit Einheit `px`, die laut ODF-Schema für dieses Attribut ungültig ist (Neufund 1.3) | **Muss** (für Abnahmekriterium 5.1.12) | 4.10 |
| F9 | Keine `.ProseMirror-selectednode`-Stilregel (Abschnitt 4 der Anforderung, Neufund 1.4) | **Muss** | 4.6 |
| F10 | `width`/`height` im Schema ohne `validate`; `parseDOM` liefert Strings statt Zahlen (Neufund 1.1) | **Soll** | 4.1 |
| F11 | Kein Unit-Test für `insertImage` selbst (nur Reader/Writer-Roundtrip mit konstruierten Node-Daten) | **Muss** | 5.1 |
| F12 | Keine E2E-Tests für Bild-Einfügen (Abschnitt 0 der Anforderung, Testmatrix Abschnitt 21 von `FEATURE-SPEC-DOCX-ODT.md`) | **Muss** | 5.2 |
| F13 | Keine Struktur-Assertions für `width`/`height` in bestehenden Roundtrip-Unit-Tests (Abschnitt 0 der Anforderung) | **Muss** | 5.1 |
| F14 | Keine realen Fixture-Dateien mit bekannter Bildgröße im Test-Fixture-Verzeichnis eingebunden (Abnahmekriterium 8) | **Muss** | 5.1/9 |

---

## 3. Kernentscheidungen

### 3.1 Einheitliche interne Größeneinheit: Pixel bei 96 dpi

DOCX arbeitet nativ in EMU (914400/Zoll), ODT nativ in `cm`/`mm`/`in`/`pt`/`pc`.
Der Schema-Knoten (`schema.ts:50-51`) und der bereits vorhandene DOCX-Writer
(`docx/writer.ts:76-80`, Kommentar „96px per inch by convention") legen implizit
bereits **Pixel bei 96 dpi** als interne Einheit nahe — dieselbe Konvention, die
auch `pageLayout.ts:4` (`PX_PER_MM = 96 / 25.4`) für die Seitenmaße verwendet.
Dieser Plan macht das **explizit** und **einheitlich** für beide Formate über
ein neues, gemeinsames Modul `src/formats/shared/units.ts` (4.2), damit Reader
und Writer **dieselbe** Umrechnungsformel verwenden (behebt F7 als Nebeneffekt)
und `bild-groesse-aendern-code.md` später dieselbe Quelle nutzen kann.

### 3.2 Toolbar-Element: `<label>` → `<button>` nach bereits im Projekt bewährtem Muster

Statt eines neuen Interaktionsmusters wird exakt das bereits in
`src/app/FormatPicker.tsx:61-89` produktiv genutzte Muster übernommen: ein
sichtbarer `<button type="button" onClick={() => fileInputRef.current?.click()}>`
plus ein verstecktes `<input type="file" className="hidden" ref={fileInputRef}
onChange={...} />`. Vorteile gegenüber dem aktuellen `<label>`:
- Natives `<button>`-Element ist per Tab fokussierbar und öffnet den
  Dateidialog bei Enter/Leertaste automatisch über den nativen `click`
  (Browser-Standardverhalten für fokussierte Buttons) — **kein** zusätzlicher
  `onKeyDown`-Handler nötig, im Unterschied zu den in
  `aufzaehlungsliste-code.md` Abschnitt 4.3 für **Toggle-Commands**
  benötigten `onKeyDown`-Ergänzungen (dort nötig, weil `onMouseDown` genutzt
  wird, um Fokus/Selektion **nicht** zu verlieren; hier ist Fokusverlust beim
  Öffnen des Dateidialogs ohnehin unvermeidlich, ein einfacher `onClick`
  genügt und ist das für Datei-Buttons gemäß WAI-ARIA übliche Muster).
- `title`/`aria-label="Bild einfügen"` wie jedes andere Toolbar-Element.
- Icon als eingebettetes, generisches SVG (siehe 4.5) statt Unicode-Emoji
  (löst F2/Anforderung Abschnitt 1, Zeile 3, sowie
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1).

### 3.3 Unterstützte Bildformate: explizite Entscheidung

Anforderung 2.3 verlangt eine **explizit festgelegte und dokumentierte**
Formatliste. Entscheidung dieses Plans (zur Freigabe, siehe Abschnitt 9):
**PNG, JPEG, GIF, WebP, BMP** — geprüft per Byte-Signatur
(„Magic Number"), nicht per (fälschbarem, teils leerem) `file.type`. **SVG
bewusst ausgeschlossen** in dieser ersten Umsetzung:
1. SVG ist text-/XML-basiert, keine feste Byte-Signatur — passt nicht in
   dasselbe, einheitliche Signatur-Prüfschema wie die fünf Binärformate
   (bräuchte einen separaten XML-Parse-Pfad).
2. Auch wenn `<img src="data:image/svg+xml...">` laut HTML-Spezifikation
   keine Skriptausführung erlaubt (SVG-als-Bild deaktiviert Scripting), ist der
   zusätzliche Prüfaufwand (wohlgeformtes XML, kein externer Ressourcen-Bezug)
   für eine erste Iteration nicht gerechtfertigt.
3. Nachrüstbar als kleiner, isolierter Folgeschritt, sobald Bedarf besteht,
   ohne diesen Plan zu blockieren.

`src/formats/shared/editor/imageValidation.ts` exportiert die Liste als
benannte Konstante, sodass eine spätere Erweiterung (SVG, weitere Formate) eine
Ein-Datei-Änderung bleibt.

### 3.4 Standardgröße beim Einfügen: intrinsische Auflösung ermitteln, auf Seitenbreite herunterskalieren

Wie in Anforderung 2.4 als „empfohlene, zu bestätigende Zielvorgabe"
beschrieben: nach dem Laden der Data-URL wird ein `Image`-Objekt erzeugt,
`naturalWidth`/`naturalHeight` ausgelesen, und – unter Beibehaltung des
Seitenverhältnisses – auf `PAGE_CONTENT_WIDTH_PX` (bereits vorhandene
Konstante, `pageLayout.ts:13`, aktuell 596 px bei A4/25 mm Rand) herunterskaliert,
**niemals hochskaliert** (ein kleines Icon-Bild bleibt in Originalgröße). Diese
Werte werden **explizit** in `width`/`height` des Node gespeichert (behebt F1).

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/schema.ts` — Fix F10 (kleine Konsistenzkorrektur)

Zeilen 45-72, `image`-NodeSpec:

```ts
image: {
  group: 'block',
  attrs: {
    src: { validate: 'string' },
    alt: { default: '', validate: 'string' },
    width: { default: null, validate: 'number|null' },
    height: { default: null, validate: 'number|null' },
  },
  draggable: true,
  parseDOM: [
    {
      tag: 'img[src]',
      getAttrs: (dom) => {
        const el = dom as HTMLImageElement
        const width = el.getAttribute('width')
        const height = el.getAttribute('height')
        return {
          src: el.getAttribute('src'),
          alt: el.getAttribute('alt') || '',
          width: width ? Number(width) : null,
          height: height ? Number(height) : null,
        }
      },
    },
  ],
  toDOM(node) {
    const { src, alt, width, height } = node.attrs
    return ['img', { src, alt, width, height }]
  },
},
```

`validate: 'number|null'` ist ein von `prosemirror-model` selbst unterstütztes
Format (`node_modules/prosemirror-model/dist/index.js:2294-2301`,
`validateType` splittet den String an `"|"` und vergleicht `typeof`, wobei
`null` als eigener „Typname" behandelt wird — **geprüft**, keine Annahme).
Reine Härtung, kein Verhaltensunterschied für bereits korrekt eingefügte Werte;
verhindert nur künftig, dass ein falsch getypter Wert (z. B. ein String) beim
Parsen von per Zwischenablage eingefügtem `<img>`-HTML unbemerkt durchrutscht.

### 4.2 `src/formats/shared/editor/imageValidation.ts` — NEU

Reines, DOM-freies (bis auf `loadImageDimensions`, siehe unten) Modul, isoliert
unit-testbar:

```ts
export const SUPPORTED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'] as const
export type SupportedImageMimeType = (typeof SUPPORTED_IMAGE_MIME_TYPES)[number]

/** 20 MB — großzügig genug für ein Smartphone-Foto (Anforderung nennt 10-20 MB als Referenzgröße),
 *  klein genug, um eine pathologisch große Datei nicht unbegrenzt in den Speicher zu laden. */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024

const SIGNATURES: Array<{ mime: SupportedImageMimeType; bytes: number[] }> = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  { mime: 'image/bmp', bytes: [0x42, 0x4d] },
]

/** Byte-Signatur ("Magic Number"), nicht `file.type` — das ist clientseitig fälschbar/leer,
 *  siehe bestätigter Befund in bild-einfuegen-req.md Abschnitt 3.3. */
export function sniffImageMimeType(bytes: Uint8Array): SupportedImageMimeType | null {
  for (const sig of SIGNATURES) {
    if (bytes.length >= sig.bytes.length && sig.bytes.every((b, i) => bytes[i] === b)) return sig.mime
  }
  // WebP: RIFF-Container ('RIFF' @0, 'WEBP' @8) — kein festes Präfix wie die anderen Formate.
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const CHUNK = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** Skaliert (nur verkleinernd, nie vergrößernd) unter Beibehaltung des Seitenverhältnisses. */
export function computeDisplaySize(naturalWidth: number, naturalHeight: number, maxWidth: number): { width: number; height: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) return { width: maxWidth, height: Math.round(maxWidth * 0.75) }
  if (naturalWidth <= maxWidth) return { width: Math.round(naturalWidth), height: Math.round(naturalHeight) }
  const scale = maxWidth / naturalWidth
  return { width: Math.round(maxWidth), height: Math.max(1, Math.round(naturalHeight * scale)) }
}

/** Lädt die Bilddaten über ein echtes `Image`-Element, um (a) die intrinsische Auflösung zu
 *  ermitteln und (b) eine zweite, über die Byte-Signatur hinausgehende Dekodier-Prüfung zu
 *  erhalten (fängt z. B. eine Datei ab, deren Kopf zufällig zu einer Signatur passt, deren
 *  Rumpf aber abgeschnitten/beschädigt ist). Unter jsdom nicht sinnvoll testbar, siehe 5.1. */
export function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Bilddatei ist beschädigt oder kann nicht gelesen werden.'))
    img.src = dataUrl
  })
}
```

### 4.3 `src/formats/shared/units.ts` — NEU

Von `docx/writer.ts`, `docx/reader.ts`, `odt/writer.ts`, `odt/reader.ts`
gemeinsam genutzt (behebt F7: **eine** Quelle für Umrechnung + Ersatzgröße
statt zwei unabhängig gepflegter Formeln/Konstanten):

```ts
export const PX_PER_INCH = 96
const CM_PER_INCH = 2.54

export function pxToEmu(px: number): number {
  return Math.round((px / PX_PER_INCH) * 914400)
}
export function emuToPx(emu: number): number {
  return Math.round((emu / 914400) * PX_PER_INCH)
}
export function pxToCm(px: number): number {
  return (px / PX_PER_INCH) * CM_PER_INCH
}

const UNIT_TO_INCH: Record<string, number> = { in: 1, cm: 1 / CM_PER_INCH, mm: 1 / 25.4, pt: 1 / 72, pc: 1 / 6, px: 1 / PX_PER_INCH }

/** Parst einen ODF-Längenwert (`svg:width`/`svg:height`, z. B. "6cm", "1in", "28.35pt")
 *  in Pixel bei 96dpi. Gibt `null` zurück bei fehlendem/nicht parsbarem Wert (defensiv
 *  gegenüber realen Fremddateien mit unerwartetem Format) statt zu werfen. */
export function parseOdfLength(value: string | null | undefined): number | null {
  if (!value) return null
  const match = /^(-?[0-9]*\.?[0-9]+)(cm|mm|in|pt|pc|px)$/.exec(value.trim())
  if (!match) return null
  const [, num, unit] = match
  const inches = Number(num) * UNIT_TO_INCH[unit]
  if (!Number.isFinite(inches) || inches <= 0) return null
  return Math.round(inches * PX_PER_INCH)
}

/** Gemeinsamer Ersatzwert für beide Formate — behebt den in Abschnitt 1.3 dokumentierten
 *  Neufund (DOCX 300×200px vs. ODT 6×4cm waren zwei unterschiedliche, nicht ineinander
 *  umrechenbare Ersatzgrößen). Nur relevant für Nodes, die (aus welchem Grund auch immer,
 *  z. B. ein sehr alter, vor diesem Fix erzeugter Dokumentzustand) weiterhin width/height
 *  `null` haben — ab diesem Plan setzt insertImage/der Reader immer echte Werte. */
export const DEFAULT_IMAGE_WIDTH_PX = 300
export const DEFAULT_IMAGE_HEIGHT_PX = 200
```

### 4.4 `src/formats/shared/editor/commands.ts` — Fix F1

Zeilen 66-74:

```ts
export interface InsertImageOptions {
  alt?: string
  width?: number | null
  height?: number | null
}

export function insertImage(src: string, options: InsertImageOptions = {}): Command {
  return (state, dispatch) => {
    const node = wordSchema.nodes.image.create({
      src,
      alt: options.alt ?? '',
      width: options.width ?? null,
      height: options.height ?? null,
    })
    if (dispatch) {
      dispatch(state.tr.replaceSelectionWith(node))
    }
    return true
  }
}
```

Bewusst **kein** Options-Objekt-Default-Merge mit `null` vs. `undefined`
verwechselt: `options.width ?? null` erlaubt weiterhin den expliziten Aufruf
`insertImage(src)` ohne Maße (z. B. für einen künftigen
Zwischenablage-/Drag&Drop-Pfad außerhalb dieses Plans), verhält sich dann exakt
wie heute. Der einzige Aufrufer im Repo (`Toolbar.tsx:107`, siehe 4.5) wird auf
die neue Signatur umgestellt.

Der Mechanismus selbst (`state.tr.replaceSelectionWith(node)`) bleibt
unverändert — Abschnitt 1.6 hat empirisch bestätigt, dass er für alle
relevanten Cursor-Positionen bereits korrekt arbeitet.

### 4.5 `src/formats/shared/editor/Toolbar.tsx` — Fix F2, F3

Ersetzt `handleImagePick` (Zeilen 97-108) und den Bild-Kontrolleintrag (Zeilen
241-244):

```tsx
import { useRef, useState } from 'react'
import {
  MAX_IMAGE_BYTES,
  SUPPORTED_IMAGE_MIME_TYPES,
  arrayBufferToBase64,
  computeDisplaySize,
  loadImageDimensions,
  sniffImageMimeType,
} from './imageValidation'
import { PAGE_CONTENT_WIDTH_PX } from './pageLayout'

const SUPPORTED_FORMATS_LABEL = 'PNG, JPEG, GIF, WebP, BMP'

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

// innerhalb Toolbar(...):
const fileInputRef = useRef<HTMLInputElement>(null)
const [imageError, setImageError] = useState<string | null>(null)

async function handleImagePick(event: ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  setImageError(null)

  try {
    if (file.size === 0) throw new Error('Die ausgewählte Datei ist leer.')
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`Datei ist zu groß (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximal ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`)
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const mime = sniffImageMimeType(bytes)
    if (!mime || !SUPPORTED_IMAGE_MIME_TYPES.includes(mime)) {
      throw new Error(`Nicht unterstütztes oder beschädigtes Bildformat. Unterstützt: ${SUPPORTED_FORMATS_LABEL}.`)
    }

    const dataUrl = `data:${mime};base64,${arrayBufferToBase64(bytes.buffer)}`
    const { width: naturalWidth, height: naturalHeight } = await loadImageDimensions(dataUrl)
    const { width, height } = computeDisplaySize(naturalWidth, naturalHeight, PAGE_CONTENT_WIDTH_PX)

    run(view, insertImage(dataUrl, { alt: file.name, width, height }))
  } catch (err) {
    setImageError(err instanceof Error ? err.message : String(err))
  }
}
```

JSX (ersetzt das `<label>` am Ende der Toolbar, Zeilen 241-244):

```tsx
<button
  type="button"
  title="Bild einfügen"
  aria-label="Bild einfügen"
  onClick={() => fileInputRef.current?.click()}
  className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center gap-1"
>
  <ImageIcon />
  <span>Bild</span>
</button>
<input
  ref={fileInputRef}
  type="file"
  accept={SUPPORTED_IMAGE_MIME_TYPES.join(',')}
  className="hidden"
  onChange={handleImagePick}
/>
```

Und, direkt unter dem `<div role="toolbar">`-Wrapper (`Toolbar` gibt dafür
statt eines einzelnen `<div>` ein Fragment zurück):

```tsx
return (
  <>
    <div role="toolbar" aria-label="Textformatierung" className="...">
      {/* ... unverändert ... */}
    </div>
    {imageError && (
      <div role="alert" className="px-2 py-1 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950 border-b border-neutral-200 dark:border-neutral-800">
        {imageError}
      </div>
    )}
  </>
)
```

Design-Entscheidungen, die dabei bewusst getroffen wurden:
- **Kein try/catch-loses `FileReader`-Promise mehr:** `file.arrayBuffer()`
  liefert ein natives Promise, das der bereits vorhandene `try`/`catch` direkt
  abdeckt — behebt den bestätigten Befund „unbehandelte Promise-Ablehnung"
  (Abschnitt 0/3.3 der Anforderung) strukturell, ohne eigene Fehlerbehandlung
  um `FileReader` herum nachzurüsten.
- **`file.type` wird nicht mehr verwendet:** Die MIME-Angabe für die Data-URL
  kommt ausschließlich aus `sniffImageMimeType` (Byte-Signatur), stärker als
  jeder Abgleich mit dem (fälschbaren/leeren) `file.type`.
- **Fehlerbanner-Stil orientiert sich an bereits etablierten Mustern im
  Projekt** (`role="alert"` + rote Fläche wie `FormatPicker.tsx:42-49`;
  kompakte Inline-Variante wie `DocumentWorkspace.tsx:57`) — es wird
  **keine neue Toast-/Benachrichtigungs-Infrastruktur** eingeführt (im
  Projekt nicht vorhanden, siehe bereits in `aufzaehlungsliste-code.md`
  Abschnitt 4.2 dokumentierten Grep-Befund „kein Treffer für
  toast/snackbar/notification/aria-live").
- **`ImageIcon` bewusst als generisches Rahmen+Sonne+Berg-Piktogramm**
  (Standard-„Bild"-Glyphe), rein aus primitiven SVG-Formen (`rect`, `circle`,
  `path`) beschrieben — kein Fremd-Icon-Set eingebunden (Projekt hat aktuell
  keine Icon-Bibliothek als Abhängigkeit, per `package.json`-Sichtung
  bestätigt), keine neue Abhängigkeit nötig.
- **`onKeyDown` nicht nötig** (siehe Abschnitt 3.2 — natives Button-Verhalten
  genügt für Enter/Leertaste).

### 4.6 `src/index.css` — Fix F9

Ergänzung nach Zeile 42 (`.ProseMirror img`-Regel):

```css
.ProseMirror-selectednode {
  outline: 2px solid #2563eb;
  outline-offset: 1px;
}
```

Wirkt ausschließlich auf `NodeSelection`-Ziele — im aktuellen Schema praktisch
nur auf `image` (kein anderer Node-Typ ist ähnlich als eigenständiges, per
Klick selektierbares Blatt gedacht; Tabellenzellen-Selektion läuft über
`CellSelection`/eigene Dekorationen aus `prosemirror-tables`, nicht über diese
Klasse). Farbwert orientiert sich an einer neutralen Akzentfarbe, unabhängig
von Light/Dark-Theme ausreichend kontrastreich (keine feste
Light/Dark-Fallunterscheidung nötig, da Outline-Farbe nicht mit dem
Seitenhintergrund verschmilzt).

### 4.7 `src/formats/shared/editor/WordEditor.tsx` — keine Änderung

Kein neuer `nodeViews`-Eintrag (bewusst nicht Gegenstand dieses Plans, siehe
Abschnitt 0 — Ziehpunkte/Resize-NodeView gehören zu `bild-groesse-aendern`).
`dropCursor()`/`gapCursor()` (Zeilen 9-10, 83-84) bleiben unverändert; die in
Anforderung Abschnitt 0 letzte Zeile dokumentierte Lücke (kein eigener
`handleDrop`/`handlePaste` für Drag&Drop/Zwischenablage-Bilder) bleibt
**bewusst außerhalb des Geltungsbereichs** dieses Plans, exakt wie in der
Anforderung selbst als „nicht Gegenstand dieser Datei" markiert — hier nur
noch einmal explizit bestätigt, nicht implementiert.

### 4.8 `src/formats/docx/writer.ts` — Fix F1 (Nutzung), F7

`imageParagraphXml` (Zeilen 72-92):

```ts
import { pxToEmu, DEFAULT_IMAGE_WIDTH_PX, DEFAULT_IMAGE_HEIGHT_PX } from '../shared/units'

function imageParagraphXml(node: JsonNode, images: ImageCollector, rels: RelationshipRegistry): string {
  const src = String(node.attrs?.src ?? '')
  const fileName = images.add(src)
  const relId = rels.add(RELATIONSHIP_TYPES.image, `media/${fileName.split('/').pop()}`)
  const widthPx = Number(node.attrs?.width ?? DEFAULT_IMAGE_WIDTH_PX)
  const heightPx = Number(node.attrs?.height ?? DEFAULT_IMAGE_HEIGHT_PX)
  const cx = pxToEmu(widthPx)
  const cy = pxToEmu(heightPx)
  // ... Rest unverändert (alt, XML-Aufbau) ...
}
```

Kein struktureller Unterschied zur bisherigen Formel (`Math.round((px/96)*
914400)` ist exakt `pxToEmu`), nur zentralisiert — reine DRY-Maßnahme, die die
Symmetrie mit dem neuen `emuToPx` im Reader (4.9) garantiert.

### 4.9 `src/formats/docx/reader.ts` — Fix F5

Erweitert `RunLike` (Zeile 116-122) um `imageWidthPx`/`imageHeightPx`, liest
`wp:extent` in `decodeParagraphRuns` (Zeilen 124-143):

```ts
import { emuToPx } from '../shared/units'

interface RunLike {
  kind: 'text' | 'break' | 'image'
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  imageRelId?: string
  imageAlt?: string
  imageWidthPx?: number | null
  imageHeightPx?: number | null
}

// innerhalb decodeParagraphRuns, Fall 'drawing' (bisher Zeilen 134-139):
} else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'drawing') {
  const blip = child.getElementsByTagNameNS(OOXML_NAMESPACES.a, 'blip')[0]
  const relId = blip?.getAttributeNS(OOXML_NAMESPACES.r, 'embed') ?? undefined
  const docPr = child.getElementsByTagNameNS(OOXML_NAMESPACES.wp, 'docPr')[0]
  const extent = child.getElementsByTagNameNS(OOXML_NAMESPACES.wp, 'extent')[0]
  const cx = extent ? Number(extent.getAttribute('cx')) : NaN
  const cy = extent ? Number(extent.getAttribute('cy')) : NaN
  runs.push({
    kind: 'image',
    imageRelId: relId,
    imageAlt: docPr?.getAttribute('name') ?? '',
    imageWidthPx: Number.isFinite(cx) && cx > 0 ? emuToPx(cx) : null,
    imageHeightPx: Number.isFinite(cy) && cy > 0 ? emuToPx(cy) : null,
  })
}
```

Und in `paragraphToBlocks` (Zeile 176, Bild-Block-Konstruktion):

```ts
blocks.push({
  type: 'image',
  attrs: { src: target ?? '', alt: run.imageAlt ?? '', width: run.imageWidthPx ?? null, height: run.imageHeightPx ?? null },
})
```

Da `paragraphToBlocks` bereits generisch von `readBodyChildren` (Body **und**
Header/Footer, Zeilen 346/363/372) **und** von `parseTable` (Tabellenzellen,
Zeilen 236-238) aufgerufen wird, ist damit **Grenzfall/Rundreise-Szenario 8**
(Bild in Tabellenzelle, Listenpunkt, Kopf-/Fußzeile) für DOCX **ohne weitere
Codeänderung** an dieser Stelle abgedeckt — nur noch mit Tests abzusichern
(5.1).

### 4.10 `src/formats/odt/writer.ts` — Fix F7, F8

`blockToOdt`, Fall `'image'` (Zeilen 112-119):

```ts
import { pxToCm, DEFAULT_IMAGE_WIDTH_PX, DEFAULT_IMAGE_HEIGHT_PX } from '../shared/units'

case 'image': {
  const src = String(node.attrs?.src ?? '')
  const fileName = images.add(src)
  const widthPx = Number(node.attrs?.width ?? DEFAULT_IMAGE_WIDTH_PX)
  const heightPx = Number(node.attrs?.height ?? DEFAULT_IMAGE_HEIGHT_PX)
  const width = `${pxToCm(widthPx).toFixed(2)}cm`
  const height = `${pxToCm(heightPx).toFixed(2)}cm`
  const alt = escapeXml(String(node.attrs?.alt ?? ''))
  return `<text:p><draw:frame draw:name="${alt || 'Image'}" svg:width="${width}" svg:height="${height}" text:anchor-type="as-char"><draw:image xlink:href="${fileName}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame></text:p>`
}
```

Behebt F8 (`px` war kein gültiges ODF-Längenmaß für `svg:width`/`svg:height`)
und F7 (Ersatzgröße jetzt dieselbe 300×200-px-Basis wie DOCX, nur in `cm`
ausgedrückt: `300px ≙ 7.94cm`, `200px ≙ 5.29cm` statt der bisherigen,
unabhängig gewählten `6cm`/`4cm`).

### 4.11 `src/formats/odt/reader.ts` — Fix F6

`paragraphToBlocks`, `draw:frame`-Fall (Zeilen 144-153):

```ts
import { parseOdfLength } from '../shared/units'

for (const child of Array.from(pEl.childNodes)) {
  if (child.nodeType === child.ELEMENT_NODE && (child as Element).localName === 'frame' && (child as Element).namespaceURI === ODF_NAMESPACES.draw) {
    flushText()
    const frameEl = child as Element
    const imageEl = firstChildNS(frameEl, ODF_NAMESPACES.draw, 'image')
    const href = imageEl?.getAttributeNS(ODF_NAMESPACES.xlink, 'href') ?? ''
    const width = parseOdfLength(frameEl.getAttributeNS(ODF_NAMESPACES.svg, 'width'))
    const height = parseOdfLength(frameEl.getAttributeNS(ODF_NAMESPACES.svg, 'height'))
    blocks.push({
      type: 'image',
      attrs: { src: href, alt: frameEl.getAttributeNS(ODF_NAMESPACES.draw, 'name') ?? '', width, height },
    })
  } else {
    textBuffer.push(child)
  }
}
```

`ODF_NAMESPACES.svg` ist bereits definiert (`odt/xmlUtil.ts:18`,
`urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0`) — dieselbe URI, die
`NAMESPACE_DECLARATIONS` (`odt/xmlUtil.ts:24`) beim **Schreiben** unter dem
Präfix `svg:` deklariert und die auch echte LibreOffice-Dateien für dieses
Attribut verwenden; keine neue Namespace-Registrierung nötig.

Wie beim DOCX-Reader gilt: `paragraphToBlocks` wird bereits generisch von
`elementToBlocks` (Tabellenzellen, Listenpunkte — Zeilen 189-203, 179-187) und
von `readOdt` für Kopf-/Fußzeile (Zeilen 262, 266) verwendet — Rundreise-
Szenario 8 ist damit für ODT ebenfalls ohne separate Cell-/List-/Header-Logik
abgedeckt.

---

## 5. Tests

### 5.1 Unit-Tests (Vitest)

**NEU: `src/formats/shared/editor/__tests__/commands.test.ts`** (behebt F11 —
sichert die in Abschnitt 1.6 empirisch ermittelten Befunde dauerhaft als
Regressionstests, statt sie nur in diesem Plan zu dokumentieren):
1. Cursor inmitten eines Absatzes → zwei Absätze mit vollständigem Text davor/
   danach, Bild dazwischen (der zentrale gemeldete Fall, Anforderung 3.2/2.1.3).
2. Cursor am Anfang/Ende eines nicht-leeren Absatzes → Bild vor/nach dem
   unveränderten Absatz, kein leerer Stub.
3. Cursor in einem leeren Absatz → Bild ersetzt ihn vollständig.
4. Cursor inmitten fett-formatierten Texts → beide Textteile behalten
   `strong`, Bild-Node erhält **keine** geerbte Mark.
5. Cursor unmittelbar vor einem `hard_break` → `hard_break` bleibt im zweiten
   Teilabsatz erhalten.
6. Cursor inmitten einer Überschrift → Überschrift wird in zwei
   gleichrangige Überschriften geteilt (dokumentiert das aktuelle, als korrekt
   akzeptierte Verhalten, siehe Offene Entscheidung 9.3).
7. Cursor am Anfang/Ende einer Überschrift → Bild vor/nach der unveränderten
   Überschrift.
8. Cursor am Anfang/Ende/inmitten des (einzigen) Absatzes eines `list_item` →
   Bild bleibt strukturell **innerhalb** desselben `list_item`, führendes
   `paragraph`-Kind bleibt erhalten (auch am Anfang: 1-Zeichen-Stub statt
   Verstoß gegen `'paragraph block*'`), keine Vermischung mit einem
   benachbarten zweiten `list_item`.
9. Cursor inmitten des Absatzes einer `table_cell` → Zelle bleibt gültig
   (`block+`), Bild zwischen zwei Absätzen.
10. Bestehende Selektion (nicht-leer) beim Einfügen → wird ersetzt, nicht
    ergänzt (Anforderung 2.2).
11. `insertImage(src)` ohne Options-Objekt → `width`/`height` bleiben `null`
    (Abwärtskompatibilität der neuen Signatur).

**NEU: `src/formats/shared/editor/__tests__/imageValidation.test.ts`** (F3/F4):
1. `sniffImageMimeType`: je ein gültiges Byte-Präfix für PNG/JPEG/GIF87a/
   GIF89a/WebP/BMP → korrekt erkannt; leerer/zu kurzer/zufälliger Byte-Puffer
   → `null`.
2. `computeDisplaySize`: Bild kleiner als `maxWidth` → unverändert; Bild
   breiter → herunterskaliert, Seitenverhältnis erhalten (Toleranz durch
   Rundung); 0×0-Eingabe (sollte real nie vorkommen) → sinnvoller
   Fallback statt Division durch 0/NaN.
3. `arrayBufferToBase64`: Rundreise-Test gegen `atob`/bekannten Base64-String,
   inkl. eines Puffers > 0x8000 Bytes (deckt den Chunking-Pfad ab, der
   `String.fromCharCode(...)`-Stack-Overflow bei großen Arrays vermeidet).
4. `MAX_IMAGE_BYTES`/`SUPPORTED_IMAGE_MIME_TYPES`: reine Konstanten-Snapshot-
   Tests, die eine versehentliche stille Änderung der dokumentierten
   Formatliste/Obergrenze sofort sichtbar machen.
5. **Nicht abgedeckt hier, bewusst:** `loadImageDimensions` (echte
   Bilddekodierung) — jsdom dekodiert keine echten Bilddaten (bereits im
   Projekt etabliertes, dokumentiertes Muster, vgl. `SKIP_SLOW_UNDER_JSDOM` in
   `docx/__tests__/external-fixtures.test.ts:40`/`odt/__tests__/
   external-fixtures.test.ts:17` für eine andere jsdom-Grenze) — wird
   ausschließlich per E2E (5.2) mit echten Testbild-Dateien abgesichert.

**NEU: `src/formats/shared/units.test.ts`** (Grundlage für F5/F6/F7/F8):
1. `pxToEmu`/`emuToPx` sind zueinander inverse Rundreisen (im Rahmen der
   Rundungsgenauigkeit).
2. `pxToCm` gegen bekannte Referenzwerte (`96px = 2.54cm`, `300px ≈ 7.94cm`).
3. `parseOdfLength`: `"6cm"`, `"1in"`, `"28.35pt"`, `"120mm"`, `"300px"` →
   korrekte px-Werte; `""`, `null`, `"abc"`, `"-5cm"` → `null` (defensiv gegen
   reale Fremddateien mit unerwartetem/fehlerhaftem Wert).

**`src/formats/docx/__tests__/roundtrip.test.ts`** (behebt F13, Ergänzungen zum
bestehenden „DOCX round trip: images"-Block, Zeilen 251-276):
1. Bestehender erster Test (Zeile 252-259) wird um
   `expect(image.attrs.width).toBe(100)` / `expect(image.attrs.height).toBe(80)`
   ergänzt — **muss vor** Fix F1/F5 rot sein (Eingabe hat bereits `width:
   100, height: 80`, Assertion fehlte bisher komplett).
2. **Neu:** Bild ohne `width`/`height` im Eingabe-Node → Export/Reimport
   ergibt die gemeinsame Ersatzgröße `DEFAULT_IMAGE_WIDTH_PX`/
   `DEFAULT_IMAGE_HEIGHT_PX` (300/200), nicht `null` (da der Writer beim
   Fehlen jetzt aktiv einen Wert schreibt, den der Reader zurückliest — anders
   als heute, wo `null` bleibt, weil der Reader `wp:extent` nie liest).
3. **Neu, deckt F5:** handgebautes DOCX-XML mit einem `wp:extent
   cx="1828800" cy="1143000"` (2×1,25 Zoll = 192×120 px) → Reader liefert
   exakt `width: 192, height: 120` — muss **vor** Fix F5 rot sein.
4. **Neu:** Bild in Tabellenzelle (`table_cell.content = [image mit width/
   height]`) → Rundreise erhält Größe (deckt Rundreise-Szenario 8 auf
   Unit-Ebene ab, da laut Anforderung Abschnitt 0 bisher **nicht einmal**
   diese Grundstruktur getestet war).
5. **Neu:** Bild in Kopf-/Fußzeile mit Größe → Rundreise erhält sie.
6. **Neu:** zwei unterschiedliche Bilder (verschiedene Data-URLs) an
   unterschiedlichen Positionen mit unterschiedlicher Größe → beide bleiben
   unterscheidbar mit je eigener Größe (Rundreise-Szenario 9).
7. **Neu:** zweimaliges Einfügen **derselben** Data-URL an unterschiedlichen
   Positionen → beide Vorkommen bleiben erhalten, `ImageCollector` dedupliziert
   nur die Zip-Mediendatei, nicht die Dokumentposition (verifiziert Grenzfall
   3.6 — bereits vorhandenes `imageCollector.ts`-Verhalten, nur bisher
   ungetestet).

**`src/formats/odt/__tests__/roundtrip.test.ts`** (Ergänzungen analog zum
bestehenden „ODT round trip: images"-Block, Zeilen 212-245):
1. Analog Punkt 1-2/4-7 oben, ODT-Äquivalent.
2. **Neu, deckt F6:** handgebautes ODT-`content.xml` mit
   `<draw:frame svg:width="5cm" svg:height="3cm">` → Reader liefert
   `width`/`height` in px (5cm ≈ 189px, 3cm ≈ 113px, mit Rundungstoleranz) —
   muss **vor** Fix F6 rot sein.
3. **Neu, deckt F8:** exportiertes `content.xml` enthält **keine**
   `svg:width="...px"`-Zeichenkette mehr (Regex-Assertion gegen den
   generierten XML-String) — hält den behobenen Neufund als Regressionstest
   fest.

**`src/formats/docx/__tests__/external-fixtures.test.ts` /
`src/formats/odt/__tests__/external-fixtures.test.ts`** (F14, Teilabdeckung —
siehe auch Abschnitt 9 zu fehlenden, mit bekannter Größe versehenen
Fixture-Dateien): Ergänzung um eine **strukturelle** Prüfung zusätzlich zur
bestehenden „importiert ohne Absturz"-Prüfung: für Fixtures, die laut
Dateiname/POI-/ODF-Toolkit-Dokumentation Bilder enthalten (z. B. `ContentType-
IsCaseInsensitive.docx`, `docx4j-example.docx` bzw. ODT-Äquivalente – exakte,
tatsächlich bildhaltige Namen erst nach Sichtung der 127/202 Fixture-Dateien
final auszuwählen, siehe Abschnitt 9), mindestens: gefundene `image`-Knoten
haben `width`/`height` **nicht** `null` (kein Rückfall auf den früheren
Nur-`src`-Zustand).

### 5.2 Neu: `tests/e2e/images.spec.ts` (behebt F12)

Folgt den bestehenden Konventionen aus `tests/e2e/docx.spec.ts`/`odt.spec.ts`/
`selection-regression.spec.ts` (`docxCard`/`odtCard`-Locator-Helfer, `page.
getByRole('button', ...)`-Selektoren, `input[type="file"].setInputFiles(...)`
für den echten `filechooser`-Flow analog zu `docx.spec.ts:85-97`,
`page.waitForEvent('download')` + `JSZip` für Export-Prüfung). Deckt **beide**
Formate über echten Datei-Upload/-Download ab. Testbilder: mehrere kleine,
fest eingebettete PNG/JPEG-Fixtures mit **bekanntem, nicht-3:2-Seitenverhältnis**
(z. B. 40×40 px quadratisch, 160×90 px 16:9) direkt als Buffer im Testcode
(analog `buildSampleDocx()` in `docx.spec.ts:7-48`, keine zusätzlichen
Binärdateien im Repo nötig für die synthetischen Fälle). Mindestens:

1. **Grundfall (höchste Priorität, Anforderung 3.2/2.1.3):** Editor fokussieren,
   Text eingeben, Cursor mitten im Text platzieren (`page.keyboard.press`-
   Sequenz oder `evaluate` auf die DOM-Selektion), Klick auf „Bild einfügen",
   `input[type="file"].setInputFiles(...)` mit Test-PNG → Bild sichtbar im
   DOM (`page.locator('.ProseMirror img')`), **beide** Textteile davor/danach
   unverändert vorhanden.
2. **Undo (Anforderung 2.6):** direkt im Anschluss an 1 → `Strg+Z` → Bild
   verschwindet, ursprünglicher, **wieder zusammengeführter** Absatz exakt wie
   vor der Einfügung (ein Absatz, nicht zwei leere).
3. **Redo:** danach `Strg+Y`/`Strg+Umschalt+Z` → Bild inkl. Attribute
   identisch wieder da.
4. **Formatprüfung (Anforderung 3.3/2.3):** `.txt`-Datei mit Endung `.png`
   umbenannt (oder MIME-Typ `text/plain` mit `setInputFiles`) auswählen →
   `role="alert"`-Fehlermeldung sichtbar, **kein** `<img>` im DOM eingefügt,
   keine Konsolen-Fehler durch unbehandelte Promise-Ablehnung
   (`page.on('pageerror', ...)`-Assertion).
5. **Abbrechen des Dialogs:** `setInputFiles([])`/kein Datei-Event → keine
   Änderung am Dokument (Anforderung 2.3, expliziter Test für den bereits
   korrekten `if (!file) return`-Pfad).
6. **Toolbar-Bedienbarkeit (Anforderung Abschnitt 1):** Button per `Tab`
   fokussieren (nicht klicken), Enter/Leertaste drücken → Dateidialog-Event
   (`page.on('filechooser', ...)`) wird ausgelöst; `title`/`aria-label`
   per `page.getByRole('button', { name: 'Bild einfügen' })` auffindbar.
7. **Bestehende Selektion wird ersetzt (Anforderung 2.2):** Text markieren,
   Bild einfügen → markierter Text ist weg, Bild an seiner Stelle.
8. **Größe/Seitenverhältnis (Grenzfall 3.4):** 16:9-Testbild einfügen → export-
   tieren (DOCX **und** ODT) → mit `JSZip` das exportierte `wp:extent`
   (`cx`/`cy`) bzw. `svg:width`/`svg:height` auslesen, Seitenverhältnis gegen
   das Quellbild prüfen (Toleranz durch Rundung) — direkter Nachweis, dass
   **keine** Verzerrung auftritt.
9. **Rundreise DOCX/ODT (Anforderung 5.1.1/5.1.2):** Bild einfügen → echten
   Download auslösen → Datei erneut über echten Upload-Weg importieren →
   Bild weiterhin an derselben Stelle sichtbar, unverzerrt.
10. **Selektions-Regression, Bild als dritte Aktion (Anforderung 3.1/6.7):**
    neue Erweiterung von `selection-regression.spec.ts` (oder eigener Block
    hier, mit identischem Muster wie die bestehenden zwei Tests dort): Text
    eingeben → Bild einfügen → Klick zur Neupositionierung → Enter → weiter
    tippen → nichts geht verloren.
11. **Geltungsbereich Dokumentstruktur (Anforderung 2.8):** Bild in Tabellen-
    zelle einfügen (Tabelle einfügen → in Zelle klicken → Bild einfügen) →
    Zelle bleibt bedienbar, Text davor/danach in derselben Zelle möglich;
    Bild in Listenpunkt einfügen (analog) → Liste bleibt intakt (kein
    Abbruch der Aufzählung).
12. **Bild am Dokumentanfang/-ende (Grenzfall 3.8):** leeres neues Dokument,
    Cursor im einzigen leeren Absatz, Bild einfügen → Editor bleibt bedienbar,
    Text davor/danach eingebbar.
13. **Mehrfaches schnelles Einfügen (Grenzfall 3.10):** drei verschiedene
    Testbilder nacheinander ohne Zwischenklick auf den Editor einfügen →
    alle drei an unterschiedlichen, korrekten Positionen.
14. **Großdatei (Grenzfall 3.7, Testplan-Hinweis 10):** ein bewusst nahe an
    `MAX_IMAGE_BYTES` liegendes, aber gültiges Testbild (mehrere MB) einfügen,
    Zeit bis zur sichtbaren Darstellung messen und protokollieren
    (`console.log` im Test, kein hartes Zeitlimit als Assertion, um Flakiness
    auf CI-Runnern zu vermeiden), UI bleibt währenddessen bedienbar (z. B.
    Toolbar weiterhin klickbar direkt danach getestet).

### 5.3 Reale Fixture-Dateien (Anforderung Abschnitt 6.9, Abnahmekriterium 8)

Wie in `bild-einfuegen-req.md` Abschnitt 0 (letzte Zeile) selbst vermerkt:
`tests/fixtures/external/README.md` erwähnt Bilder in den vorhandenen
127 DOCX-/202 ODT-Fixtures aus `apache/poi`/`tdf/odftoolkit`, aber es ist
**nicht verifiziert**, welche konkreten Dateien tatsächlich Bilder mit
bekannter, von den Ersatzwerten abweichender Größe enthalten. Vor Abschluss
dieses Plans muss das per Sichtung der `word/media/`- bzw. `Pictures/`-Ordner
in den bereits vorhandenen Fixture-Zip-Dateien geklärt werden (kein Netzwerk-
zugriff nötig — die Dateien liegen bereits lokal in
`tests/fixtures/external/{docx,odt}/`). Diese Sichtung ist **nicht** Teil
dieses Plans (reine Bestandsaufnahme, kein Code), wird aber als Voraussetzung
für 5.1 (`external-fixtures.test.ts`-Ergänzung) und Abnahmekriterium 8
festgehalten — siehe Offene Entscheidung 9.5. Zusätzlich (Anforderung
Testplan-Hinweis 9) werden mindestens je eine mit echtem Microsoft Word bzw.
LibreOffice Writer neu erzeugte Datei mit einem bewusst auf eine unübliche
Größe (z. B. 5×5 cm) gesetzten Bild benötigt, falls die vorhandenen Korpora
keine geeignete Datei enthalten — das erfordert einen manuellen Schritt
außerhalb dieses automatisiert geplanten Codes.

---

## 6. Bewusste Nicht-Umsetzung

Folgende, in `bild-einfuegen-req.md` erwähnte oder naheliegende Punkte werden
**nicht** in diesem Plan umgesetzt:

1. **Resize-Ziehpunkte/Eingabefeld, `setImageSize`-Command, NodeView.** Eigener
   Slug `bild-groesse-aendern` (siehe Abschnitt 0). Dieser Plan liefert nur die
   Voraussetzung (echte `width`/`height` ab Einfügen/Import).
2. **Editierbarer Alt-Text nach dem Einfügen.** Eigener Slug `bild-alt-text`.
3. **Zuschneiden, Online-Bilder, Textumbruch/freie Verankerung.** Eigene,
   separate Slugs, laut Backlog alle „fehlt", nicht Gegenstand dieser Datei.
4. **Drag & Drop / Zwischenablage-Bild-Einfügen (Screenshot, Strg+V roher
   Bilddaten).** Explizit von der Anforderung selbst als „bewusst außerhalb
   des Geltungsbereichs dieser Datei" markiert (Abschnitt 0, letzte Zeile).
   `dropCursor()` bleibt rein visuell, kein eigener `handleDrop`/`handlePaste`.
5. **Kontextmenü-Eintrag.** Kein Kontextmenü im Projekt vorhanden
   (projektweite Lücke, nicht feature-spezifisch, wie bereits in
   `aufzaehlungsliste-code.md` Abschnitt 7 für Listen festgestellt).
6. **SVG als unterstütztes Format.** Bewusste Entscheidung, siehe 3.3 — als
   kleiner Folgeschritt nachrüstbar, nicht Teil dieser Umsetzung.
7. **Verhalten „Bild in Überschrift" aktiv unterbinden/umleiten.** Anforderung
   2.8 fragt, ob das „überhaupt sinnvoll zugelassen werden soll". Dieser Plan
   lässt das empirisch bestätigte, schema-konforme Verhalten (Überschrift wird
   bei Cursor mittig im Text in zwei Überschriften geteilt) **unverändert** —
   siehe Offene Entscheidung 9.3 zur ausdrücklichen Bestätigung/Ablehnung
   dieser Entscheidung vor Freigabe.

---

## 7. Bewusst nicht behobene, aber dokumentierte Punkte

- **Restrisiko aus Abschnitt 1.7:** Falls **vor** dem Öffnen des Datei-Dialogs
  bereits eine inkorrekte/veraltete `view.state.selection` vorlag (unabhängig
  vom Bild-Feature, z. B. die in `WordEditor.tsx:18-41` beschriebene
  AllSelection-Situation), übernimmt die Bild-Einfügung diese unverändert.
  Kein neuer Fix hier (die bestehende `reconcileSelectionOnClick`-
  Infrastruktur deckt normale Klicks bereits ab) — abgesichert durch
  Regressionstest 5.2 Punkt 10, nicht durch zusätzlichen Produktionscode.
- **Kein hartes Verhalten für „Bild in Überschrift" definiert** — siehe
  Abschnitt 6, Punkt 7.
- **Reale Fixture-Sichtung noch offen** — siehe 5.3, Offene Entscheidung 9.5.

---

## 8. Phasenplan

1. **Phase A (Fundament, formatunabhängig):** 4.1 (`schema.ts`), 4.2
   (`imageValidation.ts`), 4.3 (`units.ts`), 4.4 (`commands.ts`) — inkl. Unit-
   Tests aus 5.1 für `commands.test.ts`, `imageValidation.test.ts`,
   `units.test.ts`. Kleinster, größenteils formatunabhängiger Schritt zuerst.
2. **Phase B (Toolbar/UI):** 4.5 (`Toolbar.tsx`), 4.6 (`index.css`) — macht
   das Feature im Browser überhaupt über den echten `filechooser`-Flow
   bedienbar/beobachtbar, Voraussetzung für Phase D.
3. **Phase C (DOCX/ODT Reader+Writer):** 4.8-4.11 — mit den Roundtrip-Tests
   aus 5.1, insbesondere den vor dem jeweiligen Fix nachweislich roten
   Regressionstests für F5/F6/F8.
4. **Phase D (E2E):** 5.2 (`tests/e2e/images.spec.ts`), abhängig von A-C.
5. **Phase E (Fixtures/Dokumentation):** 5.3 (Sichtung realer Fixtures),
   Backlog-Status-Aktualisierung, Übergabe-Notizen an
   `bild-groesse-aendern-code.md`/`bild-alt-text-code.md`/
   `bild-loeschen-code.md` gemäß Abschnitt 0, sobald diese existieren.

---

## 9. Offene Entscheidungen zur Freigabe vor Umsetzungsbeginn

1. **Unterstützte Formatliste (3.3):** Bestätigung, dass PNG/JPEG/GIF/WebP/BMP
   genügen und SVG bewusst in dieser Iteration ausgeschlossen bleibt.
2. **`MAX_IMAGE_BYTES = 20 MB` (F4):** Bestätigung des Werts oder Vorgabe eines
   anderen; alternativ Entscheidung, ob überhaupt eine harte Obergrenze
   gewünscht ist oder nur eine Beobachtung/Protokollierung der Ladezeit
   (Anforderung selbst lässt das offen: „zu klären, ob eine Obergrenze
   sinnvoll ist").
3. **Verhalten „Bild in Überschrift" (Abschnitt 6, Punkt 7):** Bestätigung,
   dass das empirisch beobachtete, schema-korrekte Aufteilen der Überschrift
   in zwei gleichrangige Überschriften das gewünschte Verhalten ist (Word/
   LibreOffice-Referenzverhalten hierzu wurde in dieser Codesichtung nicht
   unabhängig verifiziert — falls ein anderes Verhalten gewünscht ist, z. B.
   Bild automatisch aus der Überschrift heraus vor/nach sie verschieben,
   müsste `insertImage` um eine gezielte Sonderbehandlung für
   `$from.parent.type.name === 'heading'` ergänzt werden — nicht in diesem
   Plan enthalten, da die Anforderung selbst dies als offene Frage formuliert).
4. **Standard-Maximalbreite beim Einfügen:** Bestätigung, dass
   `PAGE_CONTENT_WIDTH_PX` (aktuell 596 px, aus `pageLayout.ts`) die richtige
   Bezugsgröße ist (statt z. B. eines kleineren, fest gewählten Werts).
5. **Reale Fixture-Dateien (5.3):** Freigabe, dass die Sichtung der
   vorhandenen 127/202 Fixture-Zips auf tatsächlich bildhaltige, größenmäßig
   geeignete Dateien vor Abschluss von Phase C/E durchgeführt wird, sowie
   Klärung, ob zusätzlich manuell mit echtem Word/LibreOffice erzeugte
   Dateien beschafft werden (Testplan-Hinweis 9 der Anforderung) oder ob die
   vorhandenen Korpora ausreichen.
6. **Icon-Design (`ImageIcon`, 4.5):** Die in diesem Plan skizzierte
   Platzhalter-SVG (Rahmen+Sonne+Berg) ist ein generischer Vorschlag: falls
   ein bestehendes Icon-System/Designsystem für spätere Icons eingeführt
   werden soll, sollte das **vor** Umsetzung dieses Plans entschieden werden,
   um die Icons der übrigen Toolbar-Elemente (aktuell durchgehend
   Unicode-Glyphen, siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1) nicht in
   einem separaten Folge-Refactor ein zweites Mal anfassen zu müssen.
