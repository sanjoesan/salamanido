# Umsetzungsplan (Code-Ebene): Feature „Fußnote einfügen“

Bezug: `specs/fussnote-einfuegen-req.md` (Anforderung), `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 11/17/18/20,
`FEATURE-BACKLOG.md` Zeile 319 (Abschnitt 5.2). Dieser Plan ist der Bauplan des „Entwicklers“; er ändert
selbst noch keinen Code, beantwortet aber alle in der Anforderung offen gelassenen Architektur-/
Produktfragen (Datenmodell, „am Seitenende“, Grenzfälle 4.6/4.9/4.17/4.18 u. a.), damit die Umsetzung nicht
an ungeklärten Fragen hängen bleibt (DoD-Punkte 1, 2, 7).

---

## 0. Verifikationshinweis — was gegenüber dem vorigen Entwurf dieser Datei korrigiert wurde

**Diese Datei wurde am 2026-07-05 vollständig gegen den tatsächlichen Quellcodestand neu verifiziert**
(jede unten genannte Fundstelle wurde in der jeweiligen Datei nachgelesen). Der vorige Entwurf dieses
Code-Plans war — wie schon der frühere Entwurf der Anforderung, siehe `fussnote-einfuegen-req.md`
Abschnitt 0 Punkt 5 — gegen einen **älteren** Codestand geschrieben und trug durchgehend **veraltete
Zeilennummern**. Die Anforderungsdatei (verifiziert 2026-07-04) nennt die korrekten Zeilen; der vorige
Code-Plan widersprach ihr an praktisch jeder Fundstelle. Konkret korrigiert:

1. **Schema-Zeilen waren um ~50–90 Zeilen verschoben.** Tatsächlich: `doc` in `schema.ts` **Zeile 14**
   (nicht 7), `tableNodes(...)`/`cellContent: 'block+'` **Zeile 154** (nicht 106), `list_item`/
   `content: 'block+'` **Zeile 146/147** (nicht 99), `marks` **Zeile 157–196** (nicht 109–148),
   `unsupported_block` **Zeile 92–113**, `wordSchema` **Zeile 198**. (Deckt sich jetzt mit
   `fussnote-einfuegen-req.md` Abschnitt 1.)
2. **Command-Vorbilder:** `insertImage` **Zeile 66–74**, `insertHardBreak` **83–90**, `insertTable`
   **92–102** (der vorige Plan schrieb „66–86“ bzw. „66–102“). `commands.ts` hat 166 Zeilen.
3. **DOCX-Reader — falsch benannte Funktion korrigiert.** Der Lauf-Kind-Loop (`w:t`/`w:br`/`w:drawing`/
   `w:pict`), in den der neue `w:footnoteReference`-Zweig gehört, liegt in **`decodeRunElement`
   (Zeile 170–184, Loop 174–182)** — **nicht** in `decodeParagraphRuns` (das ist nur ein dünner Wrapper
   um `collectRuns`, Zeile 218–222). `RunLike` **Zeile 117–125** (`kind` Zeile 118), `runsToInline`
   **Zeile 282–287**, `readDocx` **Zeile 487–555**, `parseStylesXml` **53–67**, `parseNumberingXml`
   **78–98**, `parseTable` **311–364**. (Der vorige Plan nannte 129–140, 116–122, 185–190, 330–390 usw.)
4. **`runsToInline` benutzt eine Allowlist, keine Denylist.** Aktuell (Zeile 282–287):
   `.filter((r) => r.kind === 'text' || r.kind === 'break')`. Der neue Fußnoten-Fall wird **in diese
   Allowlist aufgenommen** (`|| r.kind === 'footnote'`), nicht — wie im vorigen Plan — durch ein
   `r.kind !== 'image'` ersetzt (das hätte den bereits herausgefilterten `'unsupported'`-Fall verändert).
5. **DOCX-Writer:** `inlineToRuns` **Zeile 41–67**, `blockToDocx` **105–156** (`default: return ''`
   **153–154**), `paragraphPropsXml` **69–72**, `blocksToDocx` **203–205**, `buildContentTypesXml`
   **229–250**, `writeDocx` **252–318** (Header/Footer-`if`-Blöcke **264–273**,
   `documentRels.add(RELATIONSHIP_TYPES.numbering,…)` **278**, `stylesXml` **281**). (Vorher: 39–65,
   94–126, 199–220, 222–279.)
6. **ODT-Writer:** `inlineToOdt` **Zeile 70–83**, `blockToOdt` **85–195** (`default: ''` **192–193**),
   `blocksToOdt` **197–204**, `buildContentXml` **206–214** (automatic-styles-Konkatenation **210**),
   `buildStylesXml` **216–233** (`<office:styles>`-Zeile **220**), `writeOdt` **260–305** (Header/Footer
   **271–272**), `TableNameSequence` **54–60**. (Vorher: 46–59, 61–127, 129–137, 139–156, 183–210.)
   **Zusätzlich korrigiert:** `blockToOdt`/`blocksToOdt` tragen bereits heute die Parameter
   `(node, styles, images, tableNames)`. Der Fußnoten-Kontext ist ein **zusätzlicher** Parameter — der
   `tableNames`-Parameter darf beim Durchreichen in die `<text:note-body>`-Rekursion **nicht** vergessen
   werden (der vorige Plan ließ ihn in der Pseudo-Signatur weg).
7. **ODT-Reader:** `decodeInline` **Zeile 97–172** (die verschachtelte `walk()`-Closure **138–168**,
   Catch-all-`else` **160–167**), `elementToBlocks` **250–324**, `readOfficeTextChildren` **351–355**,
   `readOdt` **357–409** (`bodyBlocks` **366**). (Vorher: 96–116, 79–237, 239–285.)
8. **UI-Verdrahtung:** In `Toolbar.tsx` liegt der Bild-`<label>` bei **Zeile 291–294**, das schließende
   `</div>` der Toolbar bei **295** (nicht 241–244/245). In `WordEditor.tsx` liegt der erste, benutzerdefinierte
   `keymap({…})`-Block bei **Zeile 85–107**, `keymap(baseKeymap)` bei **108**, die Plugin-Liste bei
   **83–114** mit `createPaginationPlugin()` bei **113**; `reconcileSelectionOnClick` **43–50**, der
   `./commands`-Import (`cutSelection, insertHardBreak`) bei **12**.
9b. **`WordEditor.tsx`-Zeilendrift gegenüber dem vorigen Entwurf dieser Datei korrigiert (Re-Verifikation
   2026-07-05).** Der vorige Entwurf trug für `WordEditor.tsx` durchgängig um ~8 Zeilen zu niedrige Nummern
   (keymap-Block „77–99“, `keymap(baseKeymap)` „100“, Plugin-Liste „75–106“, `createPaginationPlugin()` „105“,
   `dispatchTransaction` „117–124“, `onChange`-`body`-Schreiben „121“, `body`-Seed „71–73“). Ursache: Das
   inzwischen umgesetzte Feature „Ausschneiden“ (`Shift-Delete`-Bindung samt Kommentarblock, `WordEditor.tsx`
   86–92 und 101–106) hat alles darunter nach unten geschoben. Der vorige Entwurf **erwähnte** die
   `Shift-Delete`-Bindung bereits (Abschnitt 5.1 Punkt 2), zählte aber die Zeilen nicht neu — genau die
   Drift, gegen die Abschnitt 0 sonst absichert. **Neu geprüfte, verbindliche Werte:** `keymap({…})`-Block
   **85–107** (Kommentar 86–92, `Shift-Delete` 106, schließendes `}),` 107), `keymap(baseKeymap)` **108**,
   Plugin-Array `plugins: [ … ]` **83–114** (`history()` 84, `createPaginationPlugin()` 113, `]` 114),
   `new EditorView(...)`/`dispatchTransaction` **122–133** (`onChange({ ...doc.content, body: … })` bei **129**),
   `bodyNode = wordSchema.nodeFromJSON(doc.content.body)`-Seed bei **79**. Alle Abschnitte 1.1/5.1 unten sind
   auf diese Werte umgestellt.
9. **`index.css`:** Die **letzte** bestehende Regel ist nicht `.page-break-spacer` (Zeile 69–71), sondern
   `.unsupported-block` (**75–81**) samt einer **Dark-Mode-Media-Query** (**83–88**). Neue Regeln werden
   **nach Zeile 88** angehängt. (Die Behauptung des vorigen Plans, `index.css` enthalte „durchgehend keine
   Dark-Mode-Variante“, ist falsch — die Begründung zu den festen Farben ist entsprechend angepasst,
   Abschnitt 6.)

**Unverändert gültige, eigenständig bestätigte Kernpunkte** (in diesem Durchlauf real überprüft, nicht nur
aus der Anforderung übernommen):

- **Feature fehlt vollständig.** Projektweite Suche nach `footnote`/`Fußnote`/`text:note` in `src/` liefert
  genau **einen** Treffer: den Catch-all-Kommentar in `odt/reader.ts` (Zeile 160–167). Kein Schema-Knoten,
  kein Command, kein Button, kein Reader/Writer-Pfad, kein Test.
- **DOCX-Import verliert Fußnoten heute lautlos.** `decodeRunElement` (170–184) kennt nur `w:t`/`w:br`/
  `w:drawing`/`w:pict`; `readDocx` (487–555) öffnet `word/footnotes.xml` nie.
- **ODT-Import verstümmelt Fußnoten heute inline.** Die `walk()`-Catch-all (`odt/reader.ts` 160–167)
  steigt in **jedes** unbekannte Inline-Element hinein (Kommentar nennt ausdrücklich „a footnote’s
  `text:note`“) und mischt Zitatnummer + Fußnotentext als Fließtext in den Wirt-Absatz.
- **Reale Fixtures vorhanden und inhaltlich geprüft** (per `unzip` in diesem Durchlauf):
  - `tests/fixtures/external/docx/footnotes.docx`: `document.xml` enthält `<w:footnoteReference w:id="1"/>`;
    `word/footnotes.xml` enthält die Pflicht-Boilerplate `<w:footnote w:type="separator" w:id="-1">` und
    `<w:footnote w:type="continuationSeparator" w:id="0">` sowie `<w:footnote w:id="1">` mit einem
    `<w:footnoteRef/>`-Lauf gefolgt vom Text **„snoska“**; `[Content_Types].xml` enthält bereits den Override
    `/word/footnotes.xml … wordprocessingml.footnotes+xml`.
  - `tests/fixtures/external/docx/table_footnotes.docx`: Fußnotenreferenz **innerhalb einer Tabellenzelle**
    (deckt Grenzfall 4.9 real ab).
  - `tests/fixtures/external/odt/footnote.odt`: `content.xml` enthält **beides** —
    `<text:note text:id="ftn0" text:note-class="footnote">` (Zitat „1“, Body-Text **„A footnote?“**) **und**
    `<text:note text:id="ftn1" text:note-class="endnote">` (Zitat „i“, Body-Text **„An endnote?“**) — die
    exakte Konstellation aus Grenzfall 4.18. `styles.xml` enthält ein reales
    `<text:notes-configuration text:note-class="footnote" … style:num-format="1" text:start-value="0"
    text:footnotes-position="page" …/>` (Vorbild für den Export, Abschnitt 8.1).
  - `tests/fixtures/external/docx/{Bug54849,bug65649}.docx`, `tests/fixtures/external/odt/excelfileformat.odt`
    existieren ebenfalls (Grenzfälle 4.8/4.18, Stress-/Endnoten-Fälle).

**Hinweis zu Low-Level-ProseMirror-Verhalten:** Die unten getroffenen Aussagen über
`replaceSelectionWith` (Cursor landet hinter einem eingefügten Inline-Atom), über die
`appendedTransaction`-Meta (eine von `appendTransaction` erzeugte Zusatztransaktion landet im **selben**
Undo-Schritt wie ihr Auslöser) und über die `uiEvent: 'cut'`-Meta (prosemirror-view markiert die durch
einen echten Browser-Ausschneidevorgang ausgelöste Lösch-Transaktion) sind **etabliertes, stabiles
ProseMirror-Verhalten** und für dieses Design tragend. Die genaue Zeilennummer im jeweiligen
`node_modules/prosemirror-*`-Build ist versionsabhängig und **während der Umsetzung** gegen die installierte
Version zu bestätigen — die Umsetzung darf sich nicht auf eine hier genannte Bibliotheks-Zeilennummer,
sondern nur auf das dokumentierte Verhalten stützen.

---

## 1. Architektur-/Produktentscheidungen

### 1.1 Fußnotentext-Speicherort im Datenmodell (Anforderung Menüpunkt 4–5; DoD Punkt 2)

**Entscheidung: Kein neues Feld in `WordDocumentContent` (`documentModel.ts` Zeile 3–8).** Der Fußnotentext
wird als echter ProseMirror-Knoten **innerhalb desselben `body`-Dokuments** gespeichert: ein neuer
Container-Knoten `footnotes_area` (optionales, letztes Kind von `doc`) mit Kind-Knoten `footnote_item`
(einer je Fußnote, mit stabiler `id`). Das ist eine **bewusste Abweichung** von der in der Anforderung
selbst als (nicht bindende) Empfehlung genannten Variante `footnotes: Record<string, ProseMirrorJSON>`
analog zu `header`/`footer`.

Begründung:
1. **Atomares Undo/Redo (Anforderung 3.10) wird dadurch trivial.** Referenzmarke und leerer Fußnotentext-
   Eintrag entstehen in **einer** Transaktion auf **einem** Dokument → automatisch **ein** Undo-Schritt,
   ohne jede Zusatzlogik. Zwei parallele Datenstrukturen (Haupt-Doc + separates `footnotes`-Record) hätten
   dieses Ziel nur mit zusätzlicher, fehleranfälliger Synchronisation erreicht.
2. **Automatische Neunummerierung nach Lesereihenfolge (Anforderung 3.2)** fällt praktisch kostenlos ab,
   weil die Reihenfolge der `footnote_reference`-Knoten im `body`-Dokument selbst **bereits** die
   Lesereihenfolge ist (`doc.descendants`). Ein separates Record hätte eine eigene, gegen den Haupttext
   abzugleichende Ordnungslogik gebraucht.
3. `header`/`footer` sind heute selbst **nicht im Editor gerendert** (`WordEditor.tsx`: der `dispatchTransaction`-
   `onChange` schreibt in Zeile 129 nur `body`; nur `body` wird in Zeile 79 geseedet). Es gibt also **kein**
   etabliertes Muster für „zweiter, synchron gehaltener Sub-Editor“, das man hätte wiederverwenden können.
   Das bereits vollständig funktionierende „ein Dokument, ein `EditorView`“-Modell wiederzuverwenden ist
   risikoärmer, als ein neues, ungetestetes Muster für einen kritischen Teil dieses Features einzuführen.

`WordDocumentContent` (`documentModel.ts` 3–8) bleibt **unverändert**; `emptyDocJSON()`/
`createBlankWordDocument()` (10–21) brauchen **keine** Änderung, da ein Dokument ohne Fußnoten schlicht
keinen `footnotes_area`-Knoten enthält (durch das `?` im neuen Content-Ausdruck weiterhin gültig, 3.1).
Weil `dispatchTransaction` (Zeile 122–133, `onChange` in Zeile 129) `body: newState.doc.toJSON()` schreibt, wird der
`footnotes_area`-Knoten automatisch mitgespeichert und exportiert — keine zusätzliche Verdrahtung nötig.

### 1.2 Platzierung „am Seitenende“ (Anforderung 3.3, DoD Punkt 1)

**Entscheidung: Option (b)** — ein gesammelter, editierbarer Fußnotenbereich am Ende des Dokuments, nicht
pro (visueller) Seite. `pagination.ts` (Zeile 33–105) rendert ein einziges fortlaufendes ProseMirror-
Dokument mit rein optischen Abstands-Decorations, ohne Pro-Seite-DOM-Container (Kommentar Zeile 8–10:
single-EditorView-Modell). Echte Pro-Seite-Fußnotenbereiche wären ein grundlegender Paginierungs-Umbau, den
diese Anforderung nicht verlangt; sie stuft Option (b) für die Rundreise-Pflicht ausdrücklich als
**ausreichend** ein (Abschnitt 3.3).

Konkret: `footnotes_area` als **optionales letztes Kind von `doc`** (3.1). Da ProseMirror Knoten in
Dokumentreihenfolge rendert, erscheint der Bereich automatisch **nach dem letzten Absatz des Haupttextes**,
ohne CSS-Positionierungstricks — visuell „am Ende des Dokuments“. Deutlich abgesetzt (Trennlinie, kleinere
Schrift, „Fußnoten“-Überschrift, Abschnitt 6). **Explizit dokumentierte Vereinfachung** (erfüllt den in
Anforderung 3.3 verlangten Hinweis): Es gibt **keine** Zuordnung „Fußnote X gehört zu visueller Seite Y“;
alle Fußnoten stehen in einem Sammel-Bereich, unabhängig von der berechneten Seite ihrer Marke. Für
Export/Reimport ist das unschädlich, da DOCX/ODT ohnehin nur die Zuordnung Referenz-ID → Text speichern und
die Seiten-Platzierung beim Öffnen in Word/LibreOffice deren eigene Paginierung übernimmt.

### 1.3 Interne ID vs. exportierte XML-ID (Voraussetzung für gültiges XML)

**Entscheidung: zwei getrennte ID-Räume.**
- **Intern** (Attribut `id` auf `footnote_reference`/`footnote_item`): beliebiger, dokumentweit eindeutiger
  String. Beim Import wird der Fremdformat-Bezeichner **unverändert** übernommen (DOCX: der numerische
  `w:id`-Wert als String, z. B. `"1"`; ODT: der `text:id`-Wert, z. B. `"ftn0"`). Beim interaktiven Einfügen
  wird deterministisch `nextFootnoteId(doc)` verwendet (Abschnitt 4.1) — **kein `Math.random()`**, siehe
  Grenzfall 4.15 und das etablierte deterministische Muster `TableNameSequence` (`odt/writer.ts` 54–60),
  das dort bereits ein früheres `Math.random()` ersetzt hat.
- **Export-XML-ID:** **niemals** die interne ID unverändert schreiben, sondern pro Exportlauf frisch:
  - DOCX: `w:id` ist laut OOXML-Schema eine Ganzzahl (`ST_DecimalNumber`). Eine aus ODT importierte interne
    ID `"ftn0"` wäre als `w:id="ftn0"` **ungültig**. Der DOCX-Writer vergibt daher pro `writeDocx()`-Aufruf
    frische, fortlaufende Ganzzahlen `1..N` (in Lesereihenfolge) über eine `Map<internalId, number>`.
  - ODT: `text:id` ist vom XML-Typ `ID` (muss der `Name`-Produktion genügen, darf **nicht** mit einer Ziffer
    beginnen). Eine aus DOCX importierte interne ID `"1"` wäre als `text:id="1"` **ungültig**. Der ODT-Writer
    präfixiert daher jede interne ID beim Export mit `ftn` (vorhandenes `ftn`-Präfix nicht doppeln), z. B.
    `"1"` → `"ftn1"`, `"ftn0"` → `"ftn0"`.

  Diese Trennung macht das Feature robust gegen beliebige interne ID-Formen und verhindert, dass eine
  Cross-Format-Rundreise (Anforderung 5.3) je ungültiges XML erzeugt. **Hinweis zur Kollisionsfreiheit:**
  `nextFootnoteId` erzeugt Präfix `new` (`new1`, `new2`, …); da importierte IDs entweder rein numerisch
  (DOCX) oder mit `ftn`/anderem Präfix (ODT) beginnen, kann eine interaktiv erzeugte ID nie mit einer
  importierten kollidieren.

### 1.4 Sichtbare Nummerierung: Rendering-Technik (Anforderung 3.2)

**Entscheidung:** Die sichtbare Zahl wird **nicht** im Dokument gespeichert, sondern nach jedem View-Update
**direkt als echter DOM-Text** gesetzt — durch Wiederverwendung des in `pagination.ts` (Zeile 88–104)
etablierten Plugin-`view()`-Musters (`requestAnimationFrame`-verzögerte Neuberechnung nach jedem Update),
**nicht** durch einen neuen NodeView- oder Decoration-Spec-Mechanismus. Begründung:
- Eine reine CSS-`counter()`-Lösung wäre am einfachsten, wurde aber **verworfen**: Pseudo-Element-Inhalt
  (`content: counter(...)`) ist über `page.locator(...).textContent()` in Playwright **nicht** zuverlässig
  abfragbar (nur über `getComputedStyle(el,'::after').content`), während Anforderung Testfall 1 ausdrücklich
  eine „sichtbare hochgestellte Zahl 1“ verlangt, die ein Test lesen können muss.
- Die direkte DOM-Text-Manipulation nach jedem `view.update()` (identisches Timing/Muster wie
  `pagination.ts`) liefert **echten, abfragbaren** Text. Sie mutiert nur `textContent` bereits vorhandener
  `<sup>`-/Label-Elemente. Das ist sicher, weil `footnote_reference` ein **Atom-Knoten ohne eigenes
  Content-Modell** ist — ProseMirror parst dessen DOM-Inhalt nie in Dokumentinhalt zurück, ein Überschreiben
  von `textContent` kann den Dokumentzustand daher nicht verfälschen.

### 1.5 Grenzfall 4.6 — Kopieren einer Referenzmarke (Anforderung: „ungeklärt“, muss entschieden werden)

**Entscheidung: Ein Duplikat (Copy+Paste derselben Referenz im selben Dokument) referenziert denselben,
geteilten Fußnotentext — bewusst einfacher als Word (das eine unabhängige neue Fußnote erzeugt), aber
deterministisch und ohne Zwischenablage-Sonderbehandlung.** ProseMirror übernimmt Knoten-Attribute (also
`id`) beim Kopieren/Einfügen standardmäßig unverändert; ohne `transformPasted`-Eingriff bleibt die `id` der
Kopie identisch zur Quelle. Ein `transformPasted`, der beim Einfügen neue IDs vergibt, würde **gleichzeitig**
Grenzfall 4.5 (Ausschneiden+Einfügen **derselben** Referenz) zerstören, da Paste strukturell nicht zwischen
„das war ein Cut“ und „das war ein Copy“ unterscheiden kann (1.6) — beides läuft über denselben Codepfad.
Die gewählte Variante behandelt beide einheitlich und korrekt für den **häufigeren** Fall (Verschieben,
4.5), auf Kosten einer Vereinfachung beim **selteneren** (Duplizieren, 4.6): Zwei Marken mit derselben `id`
zeigen auf **einen** `footnote_item`; Löschen **einer** Referenz lässt den Eintrag bestehen (die
„Waisen“-Erkennung in 2.1 prüft auf Nichtvorhandensein **jeglicher** Referenz mit dieser ID). Erst das
Löschen der **letzten** Referenz mit dieser ID entfernt den Eintrag. **Explizit dokumentierte,
akzeptierte Abweichung von Word** (Folgearbeit, Abschnitt 12).

### 1.6 Grenzfall 4.5 — Ausschneiden + Einfügen an anderer Stelle desselben Dokuments

**Entscheidung: Funktioniert korrekt ohne Zusatzaufwand für den Normalfall**, weil (a) die `id` beim
Einfügen erhalten bleibt (1.5) und (b) die „verwaiste-Fußnote-entfernen“-Logik (2.1) einen kurzen
Gnadenzeitraum für Transaktionen gewährt, die von einem echten Browser-Ausschneiden stammen (erkennbar über
`tr.getMeta('uiEvent') === 'cut'`). Zwischen Ausschneiden und späterem Einfügen (Referenz mit **derselben**
`id` erscheint neu) wird der `footnote_item` **nicht** sofort entfernt, sondern erst, wenn nach einem `cut`
**keine** passende Referenz mehr auftaucht (auf der nächsten Änderung, die selbst kein `cut` ist) — bzw.
spätestens beim Export (Abschnitt 7.3/8.2 exportieren nur noch tatsächlich referenzierte Fußnoten). Für den
Praxisfall (Ausschneiden und Einfügen in derselben Sitzung) bleibt der Text vollständig erhalten.

### 1.7 Grenzfall 4.9 (Tabellenzelle) und 4.10 (Listenelement)

**Entscheidung: Beide funktionieren ohne Sonderbehandlung im Schema oder in den Commands.**
`footnote_reference` wird mit `group: 'inline'` deklariert (3.1) und ist damit überall zulässig, wo
`content: 'inline*'` gilt — das schließt Absätze in Tabellenzellen (`cellContent: 'block+'`,
`schema.ts` Zeile 154 → `paragraph` mit `inline*`) und in `list_item` (`content: 'block+'`, Zeile 146–147)
automatisch ein. **Real durch `table_footnotes.docx` bestätigt:** Sobald `decodeRunElement`/`runsToInline`
(Abschnitt 7.4) erweitert sind, wird die Zell-Fußnote **automatisch** korrekt gelesen, weil `parseTable`
(`docx/reader.ts` 311–364) für Zellinhalte dieselbe `paragraphToBlocks`-Funktion aufruft wie für den
Haupttext (Zeile 337–339) — keine Anpassung an `parseTable` nötig. Die Nummerierung/Sync (4.1/4.2)
durchläuft den Baum per `descendants`/rekursivem JSON-Walk und findet Referenzen in Zellen/Listen ebenso.

### 1.8 Grenzfall 4.17 (Fußnote in Kopf-/Fußzeile)

**Entscheidung: Kein aktiver Block nötig**, da Kopf-/Fußzeilen aktuell nicht im Editor editierbar sind
(`WordEditor.tsx` rendert/seedet nur `body`). Absturzfreiheit wird dennoch **defensiv** sichergestellt:
Sollten `writeDocx`/`writeOdt` je `header`/`footer`-Inhalt mit einem `footnote_reference` serialisieren,
greift derselbe Fallback wie bei fehlender Zuordnung (Grenzfall 4.14): `w:id="0"` bzw. leere
`<text:note-body>` statt Absturz (Abschnitt 7.3 Punkt 7 / 8.2 Punkt 6). Sobald
`kopfzeile-/fusszeile-bearbeiten` (eigene Backlog-Einträge) umgesetzt werden, sollte deren Plan den
Fußnoten-Button dort ausblenden — hier nur als Hinweis, kein Teil dieser Umsetzung.

### 1.9 Grenzfall 4.18 (Endnoten in derselben Datei) — mit realer Fixture belegt

**Entscheidung: Endnoten werden strukturell klar getrennt behandelt, nie als Fußnoten fehlinterpretiert.**
- DOCX: nur `w:footnoteReference`/`w:footnoteRef` werden erkannt; `w:endnoteReference`/`word/endnotes.xml`
  bleiben unangetastet. Da `decodeRunElement` heute jedes unbekannte `<w:r>`-Kind stillschweigend ignoriert,
  ändert dieses Feature das Verhalten für `w:endnoteReference` **nicht** — es bleibt der bereits heute
  bestehende, außerhalb des Geltungsbereichs liegende Verlust des sichtbaren Endnotenzeichens.
- ODT: Die Fixture `footnote.odt` bestätigt, dass Endnoten in ODF **dasselbe** Element `<text:note>` mit
  `text:note-class="endnote"` (statt `"footnote"`) verwenden. Der Reader **muss** dieses Attribut prüfen und
  **nur** `"footnote"` in `footnote_reference`/`footnote_item` übersetzen.
- **Empfohlene Zusatzabsicherung (kein Blocker, `endnote-einfuegen` ist eigener Slug):** ein minimaler
  Klartext-Fallback, der Endnotentext als `[Endnote: …]` an der Zitatstelle einfügt statt ihn zu verwerfen —
  erfüllt den in Grenzfall 4.18 geforderten „mindestens als Klartext-Fallback“ (Abschnitt 7.4 Punkt 6 /
  8.3 Punkt 1). Rein textuell, **kein** eigener Schema-Knoten, damit Endnoten und Fußnoten strukturell nicht
  verwechselbar sind.

### 1.10 Beschriftung/Icon des Toolbar-Buttons (Anforderung Menüpunkt 2, 3.9)

**Entscheidung: Reiner Textbutton „Fußnote“, kein Icon/Emoji.** `title`/`aria-label` = „Fußnote einfügen“
(vollständiger, eindeutiger Satz). `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1 fordert Verzicht auf
unzuverlässig rendernde Emoji-Icons; der bestehende Toolbar-Code verstößt an mehreren Stellen dagegen
(`⊞` Zeile 288, `🖼` 292, `🖍` 212, `⌫` 209/229) — ein **vorbestehender**, hier nicht zu behebender Mangel
(Abschnitt 12). Für **dieses neue** Element wird die Anforderung von Anfang an eingehalten: klarer Text statt
mehrdeutigem Symbol, was zugleich die geforderte eindeutige Abgrenzung zu einem künftigen
„Fußzeile bearbeiten“-Button am zuverlässigsten sichert (unterschiedlicher sichtbarer Text **und**
unterschiedliches `aria-label`, kein gemeinsamer Icon-Wortstamm).

### 1.11 Tastenkürzel (Anforderung Menüpunkt 10)

**Entscheidung: Zunächst kein Einfüge-Tastenkürzel** (Anforderung stuft es als „kein Blocker“ ein). Der
Toolbar-Weg gilt als ausreichend und wird so dokumentiert (erfüllt „nicht stillschweigend offenlassen“).
Backspace/Delete werden hingegen sehr wohl belegt — aber nicht zum Einfügen, sondern zum atomaren Löschen
einer Marke samt Text (Abschnitt 4.1 `deleteFootnoteAdjacent`, Anforderung 3.4/3.7).

### 1.12 Explizit nicht Teil dieser Umsetzung

- Fußnoten-Navigation (nächste/vorherige) und Fußnote→Endnote-Konvertierung — eigene Slugs
  (`fussnote-navigation`, `fussnote-zu-endnote`).
- Vollwertige Endnoten-Unterstützung (`endnote-einfuegen`) — nur der Klartext-Fallback aus 1.9.
- Pro-Seite-Fußnotenbereiche (Option (a) aus 3.3) — siehe 1.2.
- Bilder/Tabellen aktiv **in** einen Fußnotentext einfügen (kein UI-Weg) — das Schema **erlaubt** es
  strukturell (`footnote_item.content = 'block+'`), ein versehentliches Hineinkopieren stürzt daher nicht ab
  (Grenzfall 4.11), ohne dass dafür Arbeit nötig ist.

---

## 2. Neue Dateien

### 2.1 `src/formats/shared/editor/footnoteSync.ts` (neu)
Enthält `createFootnoteSyncPlugin()` — ein `appendTransaction`-Plugin, das nach jeder inhaltlichen Änderung
(a) verwaiste `footnote_item`-Einträge entfernt (Anforderung 3.7, Grenzfall 4.4), (b) fehlende Einträge für
eine vorhandene Referenz mit Platzhalter auffüllt (Grenzfall 4.14), (c) die Reihenfolge der `footnote_item`-
Kinder an die Lesereihenfolge der Referenzen angleicht (Anforderung 3.2/3.6), und (d) den `footnotes_area`-
Knoten entfernt, sobald keine Referenz mehr existiert. Weil eine `appendTransaction`-Zusatztransaktion
automatisch die `appendedTransaction`-Meta trägt, landet ihre Wirkung im **selben** Undo-Schritt wie die
auslösende Bearbeitung (Anforderung 3.10, Grenzfall 4.4) — ohne eigene Buchführung.

```ts
import { Plugin } from 'prosemirror-state'
import type { Node as PMNode } from 'prosemirror-model'
import { wordSchema } from '../schema'
import { FOOTNOTE_PLACEHOLDER_TEXT } from '../footnotes' // zentral in shared/footnotes.ts definiert (2.3)

/** Lesereihenfolge-IDs jeder footnote_reference im doc, OHNE den footnotes_area selbst
 *  (jedes oberste Kind wird tief durchlaufen, damit auch in Tabellenzellen/Listen
 *  verschachtelte Referenzen gefunden werden — siehe table_footnotes.docx). */
function collectReferenceIds(doc: PMNode): string[] {
  const ids: string[] = []
  doc.forEach((child) => {
    if (child.type.name === 'footnotes_area') return
    child.descendants((node) => {
      if (node.type.name === 'footnote_reference') ids.push(String(node.attrs.id))
    })
  })
  return ids
}

/** Entscheidung 1.5: eine doppelt kopierte Referenz zählt einmal (erste Fundstelle). */
function firstOccurrenceOrder(ids: string[]): string[] {
  return [...new Set(ids)]
}

export function createFootnoteSyncPlugin(): Plugin {
  return new Plugin({
    appendTransaction(trs, _old, newState) {
      if (!trs.some((tr) => tr.docChanged)) return null
      const isCut = trs.some((tr) => tr.getMeta('uiEvent') === 'cut') // Entscheidung 1.6

      const targetIds = firstOccurrenceOrder(collectReferenceIds(newState.doc))
      const area = newState.doc.lastChild?.type.name === 'footnotes_area' ? newState.doc.lastChild : null
      const currentIds = area
        ? Array.from({ length: area.childCount }, (_, i) => String(area.child(i).attrs.id))
        : []

      if (targetIds.length === 0) {
        if (!area || isCut) return null // nichts zu tun bzw. Gnadenzeitraum: nächste Nicht-cut-Änderung erneut prüfen
        const pos = newState.doc.content.size - area.nodeSize
        return newState.tr.delete(pos, pos + area.nodeSize)
      }

      if (JSON.stringify(currentIds) === JSON.stringify(targetIds)) return null // bereits synchron (Perf, Grenzfall 4.8)

      const missingIds = targetIds.filter((id) => !currentIds.includes(id))
      if (isCut && missingIds.length === 0) return null // reines Entfernen mitten im cut -> Gnadenzeitraum

      const byId = new Map(
        area ? Array.from({ length: area.childCount }, (_, i) => [String(area.child(i).attrs.id), area.child(i)] as const) : [],
      )
      const children = targetIds.map((id) => {
        const existing = byId.get(id)
        if (existing) return existing
        const placeholder = wordSchema.nodes.paragraph.createAndFill(null, wordSchema.text(FOOTNOTE_PLACEHOLDER_TEXT))!
        return wordSchema.nodes.footnote_item.create({ id }, placeholder)
      })
      const newArea = wordSchema.nodes.footnotes_area.create(null, children)

      if (area) {
        const pos = newState.doc.content.size - area.nodeSize
        return newState.tr.replaceWith(pos, pos + area.nodeSize, newArea)
      }
      return newState.tr.insert(newState.doc.content.size, newArea)
    },
  })
}
```
Die Positions-Arithmetik (`doc.content.size - area.nodeSize` als Startposition des letzten Kindes) ist
während der Umsetzung durch einen dedizierten Unit-Test abzusichern (Abschnitt 10.1). Das Anhängen des
`footnotes_area` als letztes Kind ist durch den Schema-Content-Ausdruck `'block+ footnotes_area?'`
garantiert wohlgeformt.

### 2.2 `src/formats/shared/editor/footnoteDisplay.ts` (neu)
Reine Darstellungs-/Navigationslogik, kein Dokumentzustand. Setzt nach jedem View-Update die sichtbaren
Nummern als echten DOM-Text (1.4) und behandelt Klicks für die Navigation (Anforderung 3.8).

```ts
import { Plugin } from 'prosemirror-state'

export function createFootnoteDisplayPlugin(): Plugin {
  return new Plugin({
    view(view) {
      const recompute = () => {
        view.dom.querySelectorAll<HTMLElement>('sup.footnote-ref').forEach((el, i) => {
          el.textContent = String(i + 1)
        })
        view.dom.querySelectorAll<HTMLElement>('.footnote-item-number').forEach((el, i) => {
          el.textContent = `${i + 1}.`
        })
      }
      const raf = requestAnimationFrame(recompute)
      return {
        update: () => requestAnimationFrame(recompute),
        destroy: () => cancelAnimationFrame(raf),
      }
    },
    props: {
      handleClickOn(view, _pos, _node, _nodePos, event) {
        const target = event.target as HTMLElement
        const ref = target.closest('sup.footnote-ref') as HTMLElement | null
        if (ref) {
          const id = ref.getAttribute('data-footnote-id')
          const item = id && view.dom.querySelector(`.footnote-item[data-footnote-id="${id}"]`)
          item?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return false // ProseMirror setzt trotzdem seine übliche NodeSelection auf den Atom
        }
        const back = target.closest('.footnote-item-backlink') as HTMLElement | null
        if (back) {
          const id = back.getAttribute('data-footnote-id')
          const refEl = id && view.dom.querySelector(`sup.footnote-ref[data-footnote-id="${id}"]`)
          refEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return true
        }
        return false
      },
    },
  })
}
```
Deckt Anforderung 3.8/Menüpunkt 9 **inklusive** Rückwärtsnavigation ab (kein „bewusst nicht umgesetzt“
nötig — beide Richtungen kosten nur ein `closest()` + `scrollIntoView()`). Die Reihenfolge, in der
`querySelectorAll` die `sup.footnote-ref` liefert, entspricht der DOM-/Lesereihenfolge; da der
`footnotes_area` **hinter** dem Haupttext liegt, kommen die `.footnote-item-number` in derselben
Reihenfolge — beide werden konsistent 1..N nummeriert.

### 2.3 `src/formats/shared/footnotes.ts` (neu)
JSON-basierte Hilfsfunktionen, **von `docx/writer.ts`, `docx/reader.ts` und `odt/writer.ts` gemeinsam
genutzt**. Bewusste Abweichung vom sonst üblichen „Utility pro Format dupliziert“-Muster (z. B.
`docx/xmlUtil.ts` vs. `odt/xmlUtil.ts`): Lesereihenfolge-Nummerierung und Fußnotenbereich-Suche müssen über
beide Formate **hinweg identisch** funktionieren, sonst bricht die Cross-Format-Rundreise (Anforderung 5.3)
an einer feinen Abweichung zwischen zwei dupliziert gepflegten Implementierungen.

Diese Datei liegt in der **Format-Schicht** (`src/formats/shared/`) und wird von den Readern/Writern
importiert; sie darf **nicht** ihrerseits die Editor-Schicht (`shared/editor/*`) importieren. Deshalb ist
hier auch der Platzhalter-Wortlaut zentral definiert (statt in `footnoteSync.ts`), damit die Reader ihn
importieren können, ohne die Editor-Schicht in ihren Modulgraphen zu ziehen (Layering; siehe 7.4/8.3):

```ts
export const FOOTNOTE_PLACEHOLDER_TEXT = '[fehlender Fußnotentext]' // Wortlaut aus Anforderung, Grenzfall 4.14

interface JsonNodeLike {
  type: string
  attrs?: Record<string, unknown>
  content?: JsonNodeLike[]
}

/** Findet den abschließenden footnotes_area-Knoten im obersten content-Array eines body, falls vorhanden. */
export function findFootnotesArea(bodyContent: JsonNodeLike[] | undefined): JsonNodeLike | null {
  const last = bodyContent?.[bodyContent.length - 1]
  return last?.type === 'footnotes_area' ? last : null
}

/** Tiefer Walk: footnote_reference-IDs in Lesereihenfolge, rekursiv in Tabellenzellen/Listen,
 *  NICHT in den footnotes_area selbst. Erste Fundstelle gewinnt bei doppelter ID (Entscheidung 1.5). */
export function footnoteReadingOrderIds(bodyContent: JsonNodeLike[] | undefined): string[] {
  const ids: string[] = []
  const walk = (nodes: JsonNodeLike[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.type === 'footnotes_area') continue
      if (node.type === 'footnote_reference' && node.attrs?.id != null) ids.push(String(node.attrs.id))
      walk(node.content)
    }
  }
  walk(bodyContent)
  return [...new Set(ids)]
}

/** Inhalt (content-Array) eines footnote_item per id im footnotes_area; Fallback: ein leerer Absatz. */
export function footnoteItemContent(area: JsonNodeLike | null, id: string): JsonNodeLike[] {
  const item = area?.content?.find((n) => n.type === 'footnote_item' && String(n.attrs?.id) === id)
  return item?.content ?? [{ type: 'paragraph', attrs: { align: 'left' }, content: [] }]
}
```

---

## 3. Geänderte Dateien — Schema (`src/formats/shared/schema.ts`)

### 3.1 Neue Knoten und Content-Ausdruck
1. **Zeile 14**, `doc: { content: 'block+' }` wird zu:
   ```ts
   doc: { content: 'block+ footnotes_area?' },
   ```
   Rückwärtskompatibel: `block+` bleibt ohne den optionalen Zusatzknoten gültig; kein bestehendes
   `roundtrip.test.ts`-`doc()`-Fixture muss angepasst werden.
2. Drei neue Node-Specs, im `nodes`-Objekt **vor der `...tableNodes(...)`-Zeile (Zeile 154)** eingefügt
   (Reihenfolge im Objekt ist unkritisch, aber vor `tableNodes` gut lesbar):
   ```ts
   footnote_reference: {
     inline: true,
     group: 'inline',
     atom: true,
     selectable: true,
     attrs: { id: { validate: 'string' } },
     parseDOM: [
       {
         tag: 'sup.footnote-ref',
         getAttrs: (dom) => ({ id: (dom as HTMLElement).getAttribute('data-footnote-id') || '' }),
       },
     ],
     toDOM(node) {
       return ['sup', { class: 'footnote-ref', 'data-footnote-id': node.attrs.id, contenteditable: 'false' }]
     },
   },

   footnote_item: {
     content: 'block+',
     attrs: { id: { validate: 'string' } },
     parseDOM: [
       {
         tag: 'div.footnote-item',
         getAttrs: (dom) => ({ id: (dom as HTMLElement).getAttribute('data-footnote-id') || '' }),
       },
     ],
     toDOM(node) {
       return [
         'div',
         { class: 'footnote-item', 'data-footnote-id': node.attrs.id },
         ['span', { class: 'footnote-item-number', contenteditable: 'false' }],
         ['button', { type: 'button', class: 'footnote-item-backlink', 'data-footnote-id': node.attrs.id, contenteditable: 'false', 'aria-label': 'Zur Referenzstelle springen' }, '↑'],
         ['div', { class: 'footnote-item-body' }, 0],
       ]
     },
   },

   footnotes_area: {
     content: 'footnote_item*',
     parseDOM: [{ tag: 'div.footnote-area' }],
     toDOM() {
       return ['div', { class: 'footnote-area', contenteditable: 'false' }, ['div', { class: 'footnote-area-heading', contenteditable: 'false' }, 'Fußnoten'], ['div', { class: 'footnote-area-list' }, 0]]
     },
   },
   ```
   **Wichtig (real im Browser zu verifizieren):** `footnotes_area`s `toDOM` trägt `contenteditable: 'false'`
   auf dem **äußeren** `div` (verhindert Tippen zwischen `footnote_item`s), während das **innere**
   `footnote-area-list`-`div` (die Content-Hole `0`) den editierbaren `footnote_item`-Inhalt trägt.
   Verschachteltes editierbares Content-Hole innerhalb eines `contenteditable="false"`-Vorfahren ist ein
   Standardmuster für „Chrome um editierbaren Inhalt“, muss aber **im echten Browser** bestätigt werden
   (nicht nur in jsdom-Unit-Tests), da Browser die Editierbarkeit verschachtelter Bereiche im Detail
   unterschiedlich behandeln. Analog trägt `footnote_item`s `footnote-item-number`-`span` und der
   `footnote-item-backlink`-`button` je `contenteditable="false"`, nur das `footnote-item-body`-`div` ist
   editierbar.
3. **Keine Änderung an `marks` (Zeile 157–196) nötig** — der Inhalt eines `footnote_item`
   (`paragraph`/`heading`/…) erbt automatisch alle bestehenden Marks (Anforderung 3.5), da dieselben
   Block-Knotentypen wiederverwendet werden.

### 3.2 Auswirkung auf bestehende Tests / `assertLoadableDocument`
- `roundtrip.test.ts`s `doc()`-Helper erzeugt weiterhin gültige Dokumente ohne `footnotes_area` — durch
  `footnotes_area?` zulässig. **Keine Anpassung nötig.**
- `assertLoadableDocument` (`src/formats/shared/validateDocument.ts`) prüft, dass ein Dokument gegen das
  `wordSchema` `check()`-bar ist. Da die neuen Knoten Teil des Schemas werden und Reader/Writer nur
  wohlgeformte `footnotes_area`/`footnote_item`/`footnote_reference`-Strukturen erzeugen, bleibt jede
  importierte/erzeugte Struktur gültig. **Während der Umsetzung ist zu prüfen**, ob `assertLoadableDocument`
  eine harte Erwartungsliste erlaubter Knotentypen führt, die um die drei neuen Typen ergänzt werden muss.

---

## 4. Geänderte Dateien — Commands (`src/formats/shared/editor/commands.ts`)

1. Neue Importe: `NodeSelection` aus `prosemirror-state` (zusätzlich zu `Command`/`EditorState`, Zeile 1);
   `Node as PMNode` aus `prosemirror-model`.
2. Neue Hilfsfunktion (deterministisch, kein `Math.random()` — Entscheidung 1.3, Grenzfall 4.15):
   ```ts
   function nextFootnoteId(doc: PMNode): string {
     const existing = new Set<string>()
     doc.descendants((node) => {
       if (node.type.name === 'footnote_reference' || node.type.name === 'footnote_item') {
         existing.add(String(node.attrs.id))
       }
     })
     let n = 1
     while (existing.has(`new${n}`)) n++
     return `new${n}`
   }
   ```
3. **Neu:** `insertFootnote(): Command`, nach dem Muster von `insertImage` (Zeile 66–74)/`insertTable`
   (92–102) — ohne manuelle Selektionskorrektur (siehe Abschnitt 0, Low-Level-Hinweis zu
   `replaceSelectionWith` für Inline-Atome):
   ```ts
   export function insertFootnote(): Command {
     return (state, dispatch) => {
       const { footnote_reference, footnote_item, footnotes_area, paragraph } = wordSchema.nodes
       if (!dispatch) return true

       const id = nextFootnoteId(state.doc)
       const tr = state.tr.replaceSelectionWith(footnote_reference.create({ id }))
       // Inline-Atom: replaceSelectionWith hinterlässt bereits einen kollabierten Cursor
       // direkt hinter der Marke (Anforderung 3.1) — keine weitere setSelection nötig.

       const newItem = footnote_item.create({ id }, paragraph.createAndFill()!)
       const last = tr.doc.lastChild
       if (last && last.type === footnotes_area) {
         // als letztes Kind in den bestehenden Bereich einhängen (vor dessen schließender Grenze)
         const areaEnd = tr.doc.content.size
         tr.insert(areaEnd - 1, newItem)
       } else {
         tr.insert(tr.doc.content.size, footnotes_area.create(null, [newItem]))
       }

       dispatch(tr.scrollIntoView())
       return true
     }
   }
   ```
   Referenzmarke **und** leerer Fußnotentext-Eintrag entstehen auf **derselben** Transaktion → ein einziger
   Undo-Schritt (Anforderung 3.10), ohne Zutun von `footnoteSyncPlugin`. (`footnoteSyncPlugin` bleibt danach
   ein No-Op, weil `currentIds === targetIds`.)
4. **Neu:** `deleteFootnoteAdjacent(dir: 1 | -1): Command` — deckt Anforderung 3.4 („ein einzelnes
   Entf/Backspace entfernt die komplette Marke“) sowie den Fall ab, dass die Marke bereits als
   `NodeSelection` selektiert ist (z. B. nach einem Klick):
   ```ts
   export function deleteFootnoteAdjacent(dir: 1 | -1): Command {
     return (state, dispatch) => {
       const { selection } = state
       const refType = wordSchema.nodes.footnote_reference
       let from: number, to: number

       if (selection instanceof NodeSelection && selection.node.type === refType) {
         from = selection.from
         to = selection.to
       } else if (selection.empty) {
         const { $from } = selection
         const target = dir === -1 ? $from.nodeBefore : $from.nodeAfter
         if (!target || target.type !== refType) return false
         from = dir === -1 ? $from.pos - target.nodeSize : $from.pos
         to = from + target.nodeSize
       } else {
         return false
       }
       if (!dispatch) return true
       dispatch(state.tr.delete(from, to))
       // Der zugehörige footnote_item wird NICHT hier entfernt, sondern von
       // createFootnoteSyncPlugin() im SELBEN Undo-Schritt aufgeräumt (appendedTransaction-Meta).
       return true
     }
   }
   ```
   Die generische Absatz-/Ganzdokument-Löschung (Grenzfall 4.4, Dreifachklick+Entf, Alles-auswählen+Entf)
   läuft **nicht** über diesen Command (solche Selektionen sind weder leer noch eine `NodeSelection` auf der
   Marke), sondern über `baseKeymap`s generisches `deleteSelection`; das Aufräumen des dann verwaisten
   `footnote_item` übernimmt `createFootnoteSyncPlugin` — ebenfalls im selben Undo-Schritt.
5. Beide neuen Funktionen exportieren.

---

## 5. Geänderte Dateien — Editor-Verdrahtung

### 5.1 `src/formats/shared/editor/WordEditor.tsx`
1. Importe ergänzen: `deleteFootnoteAdjacent` aus `./commands` (bestehender Import Zeile 12);
   `createFootnoteSyncPlugin` aus `./footnoteSync`; `createFootnoteDisplayPlugin` aus `./footnoteDisplay`.
2. Im benutzerdefinierten `keymap({…})`-Block (**Zeile 85–107**, **vor** `keymap(baseKeymap)` in Zeile 108)
   zwei Einträge ergänzen, damit sie das generische „ein Druck selektiert den Atom, ein zweiter löscht ihn“-
   Verhalten von `baseKeymap` gezielt für `footnote_reference` überschreiben. Konkret im selben Objektliteral
   neben den vorhandenen `Mod-z/y`/`Enter`/`Shift-Enter`/`Mod-b/i/u`/`Shift-Delete`-Einträgen:
   ```ts
   Backspace: deleteFootnoteAdjacent(-1),
   Delete: deleteFootnoteAdjacent(1),
   ```
   Achtung: Die vorhandene Kommentarpassage (Zeile 86–92) warnt davor, `Mod-c/x/v` versehentlich zu binden —
   `Backspace`/`Delete` sind davon nicht betroffen und für den nativen Clipboard-Pfad irrelevant.
3. Plugin-Liste (**Zeile 83–114**) um zwei Einträge ergänzen, **nach** `createPaginationPlugin()`
   (Zeile 113, direkt vor dem schließenden `]` in Zeile 114):
   ```ts
   createPaginationPlugin(),
   createFootnoteSyncPlugin(),
   createFootnoteDisplayPlugin(),
   ```
   Reihenfolge unkritisch (kein Dekorations-/Keymap-Konflikt mit den bestehenden Plugins). Weil
   `dispatchTransaction` (Zeile 122–133) bei `tr.docChanged` `onChange({ ...doc.content, body: … })` (Zeile 129) aufruft
   und `createFootnoteSyncPlugin` seine Aufräum-Transaktion via `appendTransaction` an dieselbe Änderung
   anhängt, ist der persistierte `body` immer bereits fußnoten-konsistent.

### 5.2 `src/formats/shared/editor/Toolbar.tsx`
1. Import ergänzen: `insertFootnote` in den bestehenden `./commands`-Import (Zeile 6–20).
2. Neuer Button, direkt nach dem Bild-`<label>` (**Zeile 291–294**), als letztes Element vor dem
   schließenden `</div>` der Toolbar (**Zeile 295**):
   ```tsx
   <button
     type="button"
     title="Fußnote einfügen"
     aria-label="Fußnote einfügen"
     onMouseDown={(e) => {
       e.preventDefault()
       run(view, insertFootnote())
     }}
     className="px-2 py-1 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
   >
     Fußnote
   </button>
   ```
   Reines `onMouseDown` + `preventDefault()`-Muster wie jeder andere bestehende Button (`run()` ist die
   lokale Helferfunktion Zeile 28–31), kein Dialog, kein Promise-Zwischenschritt — **keine** strukturelle
   Doppelauslösungsgefahr (Grenzfall 4.16). Ein echter Doppelklick löst legitim **zwei** Aufrufe (= zwei
   Fußnoten) aus; zu vermeiden wäre nur, dass ein **einzelner** Klick zwei Aufrufe erzeugt — das kann bei
   diesem Muster nicht passieren, ist per E2E-Test abzusichern (Abschnitt 10.2).

---

## 6. CSS (`src/index.css`)

Neue Regeln **nach der letzten bestehenden Regel** ergänzen — das ist die
`@media (prefers-color-scheme: dark)`-Query für `.unsupported-block` (endet **Zeile 88**), **nicht**
`.page-break-spacer` (69–71):
```css
.footnote-ref {
  cursor: pointer;
  color: #1d4ed8;
}

.footnote-area {
  margin-top: 2em;
  padding-top: 0.6em;
  border-top: 1px solid #9ca3af;
  font-size: 0.85em;
  color: #374151;
}

.footnote-area-heading {
  font-weight: 600;
  margin-bottom: 0.4em;
}

.footnote-item {
  display: flex;
  gap: 0.4em;
  margin-bottom: 0.3em;
}

.footnote-item-number {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
}

.footnote-item-backlink {
  flex: 0 0 auto;
  border: none;
  background: none;
  cursor: pointer;
  color: #1d4ed8;
  padding: 0;
  font: inherit;
}

.footnote-item-body {
  flex: 1 1 auto;
}

.footnote-item-body p {
  margin: 0;
}
```
Feste Farben ohne eigene Dark-Mode-Query: Der **Editor-Malfläche** (`.ProseMirror`, Zeile 22–27 mit fester
`color: #111827`) ist bewusst als „weißes Papier“ unabhängig vom App-Farbschema gestaltet, und die
Fußnoten-Elemente liegen **innerhalb** dieser Fläche. (Die eine bestehende Dark-Mode-Query in `index.css`
betrifft `.unsupported-block`, einen dezenten Rahmen/Hintergrund; ein Farbwechsel des Fußnotentexts wäre auf
dem stets weißen Papier eher störend.) Falls die Malfläche später doch ein Dark-„Papier“ bekommt, sind diese
Regeln zusammen mit `.ProseMirror` anzupassen — als bewusste, dokumentierte Vereinfachung vermerkt.

---

## 7. DOCX-Export & -Import (`src/formats/docx/`)

### 7.1 `src/formats/docx/relationships.ts`
`RELATIONSHIP_TYPES` (**Zeile 34–42**) um einen Eintrag ergänzen:
```ts
footnotes: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes',
```

### 7.2 `src/formats/docx/styleDefs.ts`
Neue Konstanten + Funktion, sowie **minimal-invasive Signaturänderung** von `headingStylesXml()`
(**Zeile 9–30**, optionaler Parameter):
```ts
export const FOOTNOTE_REFERENCE_STYLE_ID = 'FootnoteReference'
export const FOOTNOTE_TEXT_STYLE_ID = 'FootnoteText'

export function footnoteStyleDefsXml(): string {
  return (
    `<w:style w:type="character" w:styleId="${FOOTNOTE_REFERENCE_STYLE_ID}">` +
    `<w:name w:val="footnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>` +
    `<w:style w:type="paragraph" w:styleId="${FOOTNOTE_TEXT_STYLE_ID}">` +
    `<w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="20"/></w:rPr></w:style>`
  )
}
```
`headingStylesXml()` bekommt einen optionalen Parameter, dessen Inhalt vor `</w:styles>` (Zeile 27–28)
eingefügt wird:
```ts
export function headingStylesXml(extraStylesXml = ''): string {
  const styles = /* unverändert (Zeile 10–21) */
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:styles ${WORD_NAMESPACE_DECLARATIONS}>` +
    `<w:docDefaults/>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>` +
    styles +
    extraStylesXml +
    `</w:styles>`
  )
}
```
Der bestehende Aufrufer `writeDocx` (`docx/writer.ts` Zeile 281, `headingStylesXml()`) ruft die Funktion
ohne Argument auf; das bleibt dank Default gültig, wird aber in 7.3 auf `headingStylesXml(footnoteStyleDefsXml())`
umgestellt.

### 7.3 `src/formats/docx/writer.ts`
1. Neue Importe: `FOOTNOTE_REFERENCE_STYLE_ID`, `FOOTNOTE_TEXT_STYLE_ID`, `footnoteStyleDefsXml` aus
   `./styleDefs` (bestehender Import Zeile 6); `findFootnotesArea`, `footnoteReadingOrderIds`,
   `footnoteItemContent` aus `../shared/footnotes`.
2. `inlineToRuns()` (**Zeile 41–67**) erhält einen zusätzlichen Parameter `xmlIds: Map<string, number>` und
   einen neuen Zweig in der `for`-Schleife (nach dem `hard_break`-Zweig, Zeile 60–63):
   ```ts
   function inlineToRuns(nodes: JsonNode[] | undefined, xmlIds: Map<string, number>): string {
     // ... buffer/flush unverändert (Zeile 43–50) ...
     for (const node of nodes) {
       if (node.type === 'text') { /* unverändert */ }
       else if (node.type === 'hard_break') { /* unverändert */ }
       else if (node.type === 'footnote_reference') {
         flush()
         const xmlId = xmlIds.get(String(node.attrs?.id ?? '')) ?? 0
         runs.push(
           `<w:r><w:rPr><w:rStyle w:val="${FOOTNOTE_REFERENCE_STYLE_ID}"/></w:rPr><w:footnoteReference w:id="${xmlId}"/></w:r>`,
         )
       }
     }
     flush()
     return runs.join('')
   }
   ```
   **Mechanische Folgeänderung:** Jeder Aufrufer von `inlineToRuns` reicht die `xmlIds`-Map durch. Betroffen:
   `blockToDocx` (`paragraph`-Fall Zeile 117, `heading`-Fall 123), das dazu selbst einen `xmlIds`-Parameter
   bekommt; `tableToDocx` (ruft `blockToDocx` Zeile 189) und `blocksToDocx` (Zeile 203–205) bekommen ihn
   ebenfalls und schleifen ihn durch — analog zu den bereits durchgereichten `images`/`rels`. Die Map wird
   einmal pro `writeDocx()` gebaut (Punkt 7).
3. `blockToDocx()` (**Zeile 105–156**): expliziter neuer `case 'footnotes_area': return ''` **vor** dem
   `default: return ''` (Zeile 153–154). Der Bereich wird nicht als Fließtext-Absatz serialisiert, sondern
   separat in `footnotes.xml` (Punkt 7). Bewusst **explizit** (nicht dem `default` überlassen), um klar zu
   machen, dass das Verschwinden aus dem Fließtext **gewollt** ist.
4. Neue Funktion `footnoteItemToDocx()` (rendert einen `footnote_item` für `footnotes.xml`, inkl. des
   Word-typischen `<w:footnoteRef/>`-Laufs am Anfang des ersten Absatzes — bestätigt durch `footnotes.docx`,
   Abschnitt 0):
   ```ts
   function footnoteItemToDocx(content: JsonNode[], images: ImageCollector, rels: RelationshipRegistry, xmlIds: Map<string, number>): string {
     const [first, ...rest] = content.length ? content : [{ type: 'paragraph', attrs: { align: 'left' }, content: [] }]
     const align = (first.attrs?.align as string) ?? 'left'
     const styleTag = `<w:pStyle w:val="${FOOTNOTE_TEXT_STYLE_ID}"/>`
     const refRun = `<w:r><w:rPr><w:rStyle w:val="${FOOTNOTE_REFERENCE_STYLE_ID}"/></w:rPr><w:footnoteRef/></w:r>`
     const firstXml = `<w:p>${paragraphPropsXml(align, styleTag)}${refRun}${inlineToRuns(first.content, xmlIds)}</w:p>`
     // Folgeabsätze über das bestehende blockToDocx (Normal-Stil); FootnoteText auf JEDEN Absatz
     // ist rein kosmetisch (Abschnitt 12), kein Datenverlust.
     const restXml = rest.map((p) => blockToDocx(p, images, rels, null, xmlIds)).join('')
     return firstXml + restXml
   }
   ```
   Nutzt das bestehende `paragraphPropsXml(align, extra)` (Zeile 69–72). `blockToDocx` bekommt hier den
   fünften Parameter `xmlIds` (Punkt 2).
5. Neue Funktion `footnotesXml()`:
   ```ts
   function footnotesXml(items: Array<{ xmlId: number; content: JsonNode[] }>, images: ImageCollector, rels: RelationshipRegistry, xmlIds: Map<string, number>): string {
     const boilerplate =
       `<w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>` +
       `<w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>`
     const entries = items
       .map((item) => `<w:footnote w:id="${item.xmlId}">${footnoteItemToDocx(item.content, images, rels, xmlIds)}</w:footnote>`)
       .join('')
     return (
       `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
       `<w:footnotes ${WORD_NAMESPACE_DECLARATIONS}>${boilerplate}${entries}</w:footnotes>`
     )
   }
   ```
   `w:id="-1"`/`"0"` (separator/continuationSeparator) sind die von Word erwarteten Pflicht-Boilerplate-
   Einträge — real in `footnotes.docx` bestätigt (Abschnitt 0). Nutzt `WORD_NAMESPACE_DECLARATIONS`
   (bestehender Import Zeile 3).
6. `buildContentTypesXml()` (**Zeile 229–250**): neuer Parameter `hasFootnotes: boolean`, neue bedingte
   Zeile im `overrides`-Array (Zeile 233–240, analog zu `hasHeader`/`hasFooter`):
   ```ts
   hasFootnotes ? `<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>` : '',
   ```
7. `writeDocx()` (**Zeile 252–318**):
   - **Vor** dem `bodyXml`-Aufbau (Zeile 256):
     ```ts
     const bodyContent = (doc.body as unknown as { content: JsonNode[] }).content
     const footnotesArea = findFootnotesArea(bodyContent)
     const readingOrderIds = footnoteReadingOrderIds(bodyContent)
     const xmlIds = new Map(readingOrderIds.map((id, i) => [id, i + 1])) // Entscheidung 1.3: frische w:id in Lesereihenfolge
     ```
   - `blocksToDocx(bodyContent, images, documentRels)` (Zeile 256) bekommt `xmlIds` als weiteres Argument;
     die Header/Footer-`blocksToDocx`-Aufrufe (Zeile 265/270) bekommen eine **leere** Map `new Map()`
     (Entscheidung 1.8 — dort landet `?? 0`, kein Absturz; Pfad in der Praxis unerreichbar, da Kopf-/Fußzeile
     nicht editierbar).
   - Nach `documentRels.add(RELATIONSHIP_TYPES.numbering, 'numbering.xml')` (**Zeile 278**):
     ```ts
     if (readingOrderIds.length > 0) documentRels.add(RELATIONSHIP_TYPES.footnotes, 'footnotes.xml')
     ```
   - `stylesXml`-Aufbau (**Zeile 281**) von `headingStylesXml()` auf `headingStylesXml(footnoteStyleDefsXml())`
     umstellen.
   - Nach den bestehenden `if (headerXml)`/`if (footerXml)`-`wordFolder.file(...)`-Zeilen (**297–298**):
     ```ts
     if (readingOrderIds.length > 0) {
       const items = readingOrderIds.map((id) => ({ xmlId: xmlIds.get(id)!, content: footnoteItemContent(footnotesArea, id) }))
       wordFolder.file('footnotes.xml', footnotesXml(items, images, documentRels, xmlIds))
     }
     ```
   - `buildContentTypesXml(!!header, !!footer, images.all())` (**Zeile 290**) bekommt das vierte Argument
     `readingOrderIds.length > 0`.
   Das abschließende `stampZipEntriesForDeterminism(zip)` (Zeile 311) läuft unverändert nach allen
   `zip.file()`-Aufrufen — die neue `footnotes.xml` wird also automatisch determinismus-gestempelt.

### 7.4 `src/formats/docx/reader.ts`
1. `RunLike` (**Zeile 117–125**) um einen Fall erweitern: `kind: 'text' | 'break' | 'image' | 'unsupported'
   | 'footnote'`, neues optionales Feld `footnoteId?: string`.
2. **`decodeRunElement()` (Zeile 170–184)** — hier, **nicht** in `decodeParagraphRuns`: im `for`-Loop über
   `rEl.children` (Zeile 174–182) einen neuen Zweig ergänzen (nach dem `w:drawing`/`w:pict`-Zweig, Zeile
   179–181):
   ```ts
   } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'footnoteReference') {
     out.push({ kind: 'footnote', footnoteId: child.getAttributeNS(OOXML_NAMESPACES.w, 'id') ?? '' })
   }
   ```
   `<w:footnoteRef/>` (der Auto-Nummern-Marker **innerhalb** von `footnotes.xml`) wird hier **nicht**
   gesondert behandelt — es kommt im Haupt-`document.xml` gar nicht vor, und beim Parsen von `footnotes.xml`
   (Punkt 4) wird es durch `decodeRunElement` ohnehin ignoriert (kein `w:t`/`w:br`/`w:drawing`), sodass die
   von uns berechnete Nummer (1.4) nicht mit einer im Quelldokument eingefrorenen Zahl kollidiert.
3. `runsToInline()` (**Zeile 282–287**): den Fußnoten-Fall in die **bestehende Allowlist** aufnehmen (nicht
   die Allowlist durch eine Denylist ersetzen):
   ```ts
   function runsToInline(runs: RunLike[]): JsonNode[] {
     return runs
       .filter((r) => r.kind === 'text' || r.kind === 'break' || r.kind === 'footnote')
       .map((r) => {
         if (r.kind === 'break') return { type: 'hard_break' }
         if (r.kind === 'footnote') return { type: 'footnote_reference', attrs: { id: r.footnoteId ?? '' } }
         return { type: 'text', text: r.text ?? '', marks: r.marks }
       })
       .filter((n) => n.type !== 'text' || (n as { text?: string }).text)
   }
   ```
   Kein Eingriff an `paragraphToBlocks`s `hasBlockRun`-Prüfung (Zeile 244, `r.kind === 'image' ||
   r.kind === 'unsupported'`) nötig: Eine Fußnote ist **inline**, soll den Absatz **nicht** in Blöcke
   aufspalten und fließt korrekt durch die `!hasBlockRun`-Zweig-`runsToInline`-Behandlung (Zeile 246–255).
4. Neue Funktion `parseFootnotesXml()`, parallel zu `parseStylesXml`/`parseNumberingXml` (Zeile 53–98):
   ```ts
   function parseFootnotesXml(footnotesDoc: Document | null, headingInfo: HeadingInfo, imageRels: Map<string, string>): Map<string, JsonNode[]> {
     const byId = new Map<string, JsonNode[]>()
     if (!footnotesDoc) return byId
     for (const el of Array.from(footnotesDoc.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'footnote'))) {
       const id = el.getAttributeNS(OOXML_NAMESPACES.w, 'id')
       const type = el.getAttributeNS(OOXML_NAMESPACES.w, 'type')
       if (!id || type === 'separator' || type === 'continuationSeparator') continue // Boilerplate überspringen
       const blocks = childElements(el, OOXML_NAMESPACES.w, 'p').flatMap((p) => paragraphToBlocks(p, headingInfo, imageRels))
       byId.set(id, blocks.length ? blocks : [{ type: 'paragraph', attrs: { align: 'left' }, content: [] }])
     }
     return byId
   }
   ```
   Nutzt die bestehenden Helfer `childElements` (Zeile 16–18) und `paragraphToBlocks` (Zeile 229–280); der
   `<w:footnoteRef/>`-Lauf im ersten Absatz wird von `decodeRunElement` automatisch ignoriert (Punkt 2), der
   sichtbare Fußnotentext bleibt erhalten.
5. `readDocx()` (**Zeile 487–555**):
   - Nach dem Einlesen von `numberingXmlText`/`kindByNumId` (Zeile 498–499):
     ```ts
     const footnotesXmlText = await zip.file('word/footnotes.xml')?.async('text')
     const footnotesById = parseFootnotesXml(footnotesXmlText ? parseXmlDocument(footnotesXmlText) : null, headingInfo, documentRels)
     ```
   - Nach dem Aufbau von `bodyBlocks` (**Zeile 503**) den `footnotes_area`-Knoten anhängen; die tatsächlich
     im Text referenzierten IDs in Lesereihenfolge kommen aus `footnoteReadingOrderIds` (aus
     `../shared/footnotes`, angewandt auf die bereits als JSON vorliegenden `bodyBlocks`):
     ```ts
     const referencedIds = footnoteReadingOrderIds(bodyBlocks)
     if (referencedIds.length > 0) {
       bodyBlocks.push({
         type: 'footnotes_area',
         content: referencedIds.map((id) => ({
           type: 'footnote_item',
           attrs: { id },
           // Grenzfall 4.14: Referenz ohne passenden footnotes.xml-Eintrag -> Platzhalter statt Absturz.
           content: footnotesById.get(id) ?? [{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: FOOTNOTE_PLACEHOLDER_TEXT }] }],
         })),
       })
     }
     ```
     `bodyBlocks` wird in Zeile 548 in `body: { type: 'doc', content: bodyBlocks.length ? bodyBlocks : … }`
     eingesetzt — der angehängte `footnotes_area` fährt dort automatisch mit. Wichtig: Das Anhängen muss
     **vor** dem `assertLoadableDocument(result)`-Aufruf (Zeile 553) geschehen (was bei „nach Zeile 503“
     der Fall ist). `FOOTNOTE_PLACEHOLDER_TEXT` aus `../shared/footnotes` importieren (Reader dürfen nicht
     aus der Editor-Schicht importieren; gleicher Wortlaut wie im Live-Editor, siehe 2.3).
6. **Empfohlene Endnoten-Zusatzabsicherung** (Entscheidung 1.9, kein Blocker): analog optional
   `word/endnotes.xml` laden, `w:endnoteReference` in `decodeRunElement` erkennen und als reinen Text-Run
   `[Endnote: <Text>]` (kein Fußnotenknoten) einfügen, damit Endnoten und Fußnoten strukturell nicht
   verwechselt werden (Grenzfall 4.18).

---

## 8. ODT-Export & -Import (`src/formats/odt/`)

### 8.1 `src/formats/odt/styleRegistry.ts`
Neue Konstante + Funktionen, analog zu `headingStyleDefs()` (**Zeile 84–93**):
```ts
export const FOOTNOTE_PARAGRAPH_STYLE_NAME = 'Footnote'

export function footnoteParagraphStyleDef(): string {
  return (
    `<style:style style:name="${FOOTNOTE_PARAGRAPH_STYLE_NAME}" style:family="paragraph" style:parent-style-name="Standard">` +
    `<style:text-properties fo:font-size="10pt"/></style:style>`
  )
}

export function notesConfigurationXml(): string {
  // Attributnamen 1:1 aus der realen Fixture tests/fixtures/external/odt/footnote.odt (styles.xml), Abschnitt 0.
  return (
    `<text:notes-configuration text:note-class="footnote" style:num-format="1" ` +
    `text:start-value="0" text:footnotes-position="page"/>`
  )
}
```

### 8.2 `src/formats/odt/writer.ts`
1. Neue Importe: `FOOTNOTE_PARAGRAPH_STYLE_NAME`, `footnoteParagraphStyleDef`, `notesConfigurationXml` aus
   `./styleRegistry` (bestehender Import Zeile 4–14); `findFootnotesArea`, `footnoteReadingOrderIds`,
   `footnoteItemContent` aus `../shared/footnotes`.
2. Ein gemeinsamer Kontexttyp und Durchreichung des zusätzlichen Parameters. **Wichtig:** `blockToOdt`/
   `blocksToOdt` tragen bereits `(node, styles, images, tableNames)` — der Fußnoten-Kontext kommt als
   **fünfter** Parameter hinzu, `tableNames` darf beim Durchreichen nicht verloren gehen.
   ```ts
   interface FootnoteCtx { area: JsonNode | null; numbers: Map<string, number> }
   ```
   `inlineToOdt()` (**Zeile 70–83**) bekommt `footnotes: FootnoteCtx` und einen neuen Fall:
   ```ts
   function inlineToOdt(nodes: JsonNode[] | undefined, styles: TextStyleRegistry, images: ImageCollector, tableNames: TableNameSequence, footnotes: FootnoteCtx): string {
     if (!nodes) return ''
     return nodes
       .map((node) => {
         if (node.type === 'hard_break') return '<text:line-break/>'
         if (node.type === 'footnote_reference') {
           const id = String(node.attrs?.id ?? '')
           const xmlId = `ftn${id.replace(/^ftn/, '')}` // Entscheidung 1.3: text:id darf nicht mit Ziffer beginnen
           const number = footnotes.numbers.get(id) ?? ''
           const bodyContent = footnoteItemContent(footnotes.area, id)
           const bodyXml = blocksToOdt(bodyContent, styles, images, tableNames, footnotes) // rekursiv: mehrere Absätze/Formate (Anforderung 3.5)
           return (
             `<text:note text:id="${xmlId}" text:note-class="footnote">` +
             `<text:note-citation>${number}</text:note-citation>` +
             `<text:note-body>${bodyXml}</text:note-body>` +
             `</text:note>`
           )
         }
         if (node.type === 'text') { /* unverändert (Zeile 75–79) */ }
         return ''
       })
       .join('')
   }
   ```
   **Mechanische Folgeänderung:** `blockToOdt` (Zeile 85–195) und `blocksToOdt` (Zeile 197–204) bekommen den
   `footnotes`-Parameter zusätzlich zu `tableNames` und reichen ihn an alle rekursiven Aufrufe durch (Listen-
   Zeile 104, Tabellen-Zeile 155, `unsupported_block`-Zeile 191, `paragraph`/`heading`-`inlineToOdt`-Aufrufe
   Zeile 90/96). Die `inlineToOdt`-Aufrufe in `blockToOdt` (Zeile 90, 96) reichen jetzt `tableNames` **und**
   `footnotes` mit.
3. `blockToOdt()`: expliziter neuer `case 'footnotes_area': return ''` **vor** dem `default: ''` (Zeile
   192–193). Der Bereich wird nicht als eigener Absatz serialisiert — jede Fußnote wird stattdessen **inline
   an ihrer Zitatstelle** über den `footnote_reference`-Fall in `inlineToOdt` ausgegeben (struktureller
   Unterschied zu DOCX, das einen separaten Part referenziert — beide Wege liefern aus **demselben**
   internen Modell ein für das jeweilige Format natives Ergebnis).
4. `buildStylesXml()` (**Zeile 216–233**): `notesConfigurationXml()` als weiteres Kind von `<office:styles>`
   ergänzen (die `<office:styles>`-Zeile ist **220**):
   ```ts
   `<office:styles><style:style style:name="Standard" style:family="paragraph"/>${notesConfigurationXml()}</office:styles>`
   ```
5. `buildContentXml()` (**Zeile 206–214**): `footnoteParagraphStyleDef()` in die
   `<office:automatic-styles>`-Konkatenation (**Zeile 210**) aufnehmen, damit Fußnotentext-Absätze optional
   `text:style-name="Footnote"` referenzieren können (rein kosmetisch; der `bodyXml` innerhalb von
   `<text:note-body>` läuft weiterhin über denselben `blockToOdt`-Pfad wie normale Absätze).
6. `writeOdt()` (**Zeile 260–305**): vor dem `bodyXml`-Aufbau (Zeile 266):
   ```ts
   const bodyContentArr = (doc.body as unknown as JsonNode).content
   const footnotesArea = findFootnotesArea(bodyContentArr)
   const readingOrderIds = footnoteReadingOrderIds(bodyContentArr)
   const footnoteCtx: FootnoteCtx = { area: footnotesArea, numbers: new Map(readingOrderIds.map((id, i) => [id, i + 1])) }
   const bodyXml = blocksToOdt(bodyContentArr, bodyStyles, images, tableNames, footnoteCtx)
   ```
   Die Header/Footer-`blocksToOdt`-Aufrufe (**Zeile 271–272**) bekommen einen **leeren** Kontext
   `{ area: null, numbers: new Map() }` (Entscheidung 1.8 — kein Absturz; eine dort versehentlich gelandete
   Referenz erzeugte eine gültige, aber leere `<text:note-body>`).
   `buildContentXml(bodyXml, bodyStyles)` (Zeile 274) bleibt strukturell unverändert (der Fußnoten-Inhalt
   steckt bereits inline im `bodyXml`).

### 8.3 `src/formats/odt/reader.ts`
1. `decodeInline()`s `walk()`-Closure (**Zeile 138–168**) bekommt einen neuen Zweig **vor** der Catch-all-
   `else` (Zeile 160–167). `walk` hat über die Closure Zugriff auf `styles` (Parameter von `decodeInline`,
   Zeile 97) und auf `result`. Zusätzlich muss ein Sammel-Array `footnotesOut` erreichbar sein — es wird als
   zusätzlicher Parameter durch die Aufrufkette gereicht (siehe Punkt 3):
   ```ts
   } else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'note') {
     const noteClass = el.getAttributeNS(ODF_NAMESPACES.text, 'note-class')
     const id = el.getAttributeNS(ODF_NAMESPACES.text, 'id') ?? `auto-${footnotesOut.length}`
     if (noteClass === 'footnote') {
       const noteBody = firstChildNS(el, ODF_NAMESPACES.text, 'note-body')
       const content = noteBody
         ? Array.from(noteBody.children).flatMap((c) => elementToBlocks(c, styles))
         : [{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: FOOTNOTE_PLACEHOLDER_TEXT }] }] // Grenzfall 4.14
       footnotesOut.push({ id, content })
       result.push({ type: 'footnote_reference', attrs: { id } })
     }
     // noteClass === 'endnote' (oder anderer Wert): bewusst NICHT als Fußnote (Grenzfall 4.18);
     // empfohlene Zusatzabsicherung analog 7.4 Punkt 6: Klartext-Fallback [Endnote: …] statt Verwerfen.
   }
   ```
   Nutzt die bestehenden Helfer `firstChildNS` (Zeile 33–35) und `elementToBlocks` (Zeile 250–324; als
   Funktionsdeklaration hoisted, daher aus `walk` heraus aufrufbar). `<text:note-citation>` wird bewusst
   **nicht** gelesen — die Anzeigenummer ist ein abgeleiteter Wert (1.4), keine gespeicherte Zahl.
2. **Threading von `footnotesOut`:** ein mutierbares `Array<{ id: string; content: JsonNode[] }>` wird durch
   die Aufrufkette gereicht, analog zum bereits durchgereichten `styles`. Betroffene Signaturen:
   `decodeInline(pEl, styles)` → `decodeInline(pEl, styles, footnotesOut)`; `paragraphToBlocks` (Zeile
   175–213, ruft `decodeInline` Zeile 181/197); `elementToBlocks` (Zeile 250–324, ruft `paragraphToBlocks`
   Zeile 254, `decodeInline` im `h`-Fall Zeile 260, sich selbst rekursiv in Listen/Tabellen/Sections);
   `readOfficeTextChildren` (Zeile 351–355). Ein Heading (`text:h`) kann ebenfalls eine Fußnote enthalten,
   daher muss auch der `h`-Zweig `footnotesOut` an `decodeInline` reichen. (Das ist die mechanisch
   aufwendigste Änderung dieses Plans; als eigener, klar abgegrenzter Umsetzungsschritt zu behandeln.)
3. `readOdt()` (**Zeile 357–409**): ein `footnotesOut`-Array anlegen und an `readOfficeTextChildren`
   (Zeile 366) durchreichen; nach dem Aufbau von `bodyBlocks` (**Zeile 366**), **vor**
   `assertLoadableDocument` (Zeile 407):
   ```ts
   if (footnotesOut.length > 0) {
     bodyBlocks.push({
       type: 'footnotes_area',
       content: footnotesOut.map(({ id, content }) => ({ type: 'footnote_item', attrs: { id }, content })),
     })
   }
   ```
   `footnotesOut` steht bereits in Lesereihenfolge (Sammlung während eines einzigen Links-nach-rechts-
   Durchlaufs) — anders als beim DOCX-Reader ist hier **keine** zusätzliche `footnoteReadingOrderIds`-
   Sortierung nötig, da ODF Fußnoten inline an der Zitatstelle trägt. **Wichtig:** Nur der `body`-Durchlauf
   (`officeText`) speist `footnotesOut`; Header/Footer (Zeile 380/384) verwenden einen eigenen, verworfenen
   `footnotesOut` (Kopf-/Fußzeilen-Fußnoten werden nicht in den Haupt-`footnotes_area` gemischt — Grenzfall
   4.17).
4. `FOOTNOTE_PLACEHOLDER_TEXT` aus `../shared/footnotes` importieren (Reader dürfen nicht aus der
   Editor-Schicht importieren, siehe 2.3).

---

## 9. Auflösung aller Grenzfälle aus der Anforderung (Abschnitt 4)

| # | Grenzfall | Auflösung |
|---|---|---|
| 1 | Einfügen bei aktiver Selektion | `replaceSelectionWith` ersetzt die Selektion durch die Marke — identisch zu `insertImage`/`insertTable`. |
| 2 | Zwei Fußnoten im selben Absatz | Je eigene `id`; Sync/Nummerierung arbeitet unabhängig von Absatzgrenzen (2.1). |
| 3 | Fußnote am Dokumentanfang/-ende | Keine Sonderbehandlung — normaler Inline-Knoten. |
| 4 | Ganzen Absatz mit Marke löschen | `createFootnoteSyncPlugin` entfernt den verwaisten Eintrag via `appendTransaction`, im selben Undo-Schritt (2.1). |
| 5 | Ausschneiden + Einfügen anderswo | `id` bleibt erhalten, `uiEvent==='cut'`-Gnadenzeitraum verhindert vorzeitiges Löschen (1.6). |
| 6 | Kopieren als Duplikat | Bewusste Vereinfachung: geteilter Text statt unabhängiger Kopie (1.5), dokumentiert. |
| 7 | Undo direkt nach Einfügen, dann tippen | Ein Undo-Schritt entfernt Marke+Eintrag (atomare Transaktion, 4.1); Weitertippen an wiederhergestellter Position. |
| 8 | 100+ Fußnoten, Performance | Sync-Plugin bricht per Gleichheitsvergleich früh ab (2.1); Display-Plugin mutiert nur `textContent`, kein Re-Parsing. |
| 9 | Fußnote in Tabellenzelle | Ohne Zusatzcode (1.7), real durch `table_footnotes.docx` belegt. |
| 10 | Fußnote in Listenelement | Ohne Zusatzcode (1.7). |
| 11 | Tabelle/Bild im Fußnotentext | Schema erlaubt es (`footnote_item.content='block+'`), kein Absturz. |
| 12 | Leerer Fußnotentext | `paragraph.createAndFill()!` → gültiger leerer Absatz; Export erzeugt valides leeres `<w:footnote>`/`<text:note-body>`. |
| 13 | Mehrere Absätze + `hard_break` | `block+` erlaubt mehrere Absätze; `hard_break` über bestehende `inlineToRuns`/`inlineToOdt`-Fälle. |
| 14 | Defekte/inkonsistente Referenz | Platzhalter `[fehlender Fußnotentext]` statt Absturz (2.1, 7.4 Punkt 5, 8.3 Punkt 1). |
| 15 | Kollidierende IDs | Deterministischer Zähler `nextFootnoteId()` mit `new`-Präfix, kein `Math.random()` (4.1, 1.3). |
| 16 | Mehrfaches schnelles Klicken | Kein Dialog/Promise, jeder Klick = ein legitimer Aufruf (5.2). |
| 17 | Fußnote in Kopf-/Fußzeile | Kein aktiver Block nötig (nicht editierbar), defensiver Fallback verhindert Absturz (1.8). |
| 18 | Fußnoten UND Endnoten gemischt | Strukturelle Trennung (`w:footnoteReference` vs. `w:endnoteReference`; `note-class="footnote"` vs. `"endnote"`), real durch `footnote.odt` belegt (1.9). |
| 19 | Ist-Zustand-Regression | Nach dem Bau beweist ein Test, dass ODT nicht mehr inline verstümmelt (8.3 ersetzt die Catch-all) und DOCX nicht mehr verliert (7.4). |

---

## 10. Tests

### 10.1 Unit-/Komponententests

| Datei | Änderung |
|---|---|
| `src/formats/shared/editor/__tests__/footnotes.test.ts` (**neu**) | `insertFootnote()`: fügt Marke + leeren Eintrag in **einer** Transaktion ein, Cursor landet direkt hinter der Marke (`state.selection.empty === true`, Position exakt geprüft); zweimaliger Aufruf → zwei verschiedene `new`-IDs. `nextFootnoteId()`: `"new1"` bei leerem Doc, überspringt vorhandene `newN` deterministisch (zweifacher Aufruf mit gleichem Eingabedoc → gleiches Ergebnis); kollidiert nie mit rein numerischen/`ftn`-IDs. `deleteFootnoteAdjacent()`: Backspace hinter der Marke bzw. Delete davor bzw. `NodeSelection`+Delete entfernt sie in einem Schritt; ohne angrenzende Marke → `false`. `createFootnoteSyncPlugin()`: Löschen des Absatzes mit der Marke entfernt den `footnote_item` in derselben Transaktionsgruppe; Umsortierung bei vertauschter Referenzreihenfolge; ein `uiEvent:'cut'`-markierter Löschvorgang entfernt den Eintrag **nicht** sofort; letzter Eintrag weg → `footnotes_area` verschwindet. |
| Schema-Assertions (in `footnotes.test.ts`) | `wordSchema.nodes.doc` akzeptiert ein Doc mit `footnotes_area` als letztem Kind **und** eines ganz ohne; `footnote_reference` ist `atom`/`selectable`/`inline`; `footnote_item.content` akzeptiert mehrere Absätze mit Marks. |
| `src/formats/docx/__tests__/roundtrip.test.ts` | Neuer `describe('DOCX round trip: footnotes')`: einzelne Fußnote → `document.xml` hat `<w:footnoteReference w:id="1"/>`, `word/footnotes.xml` hat passenden `<w:footnote w:id="1">` inkl. `<w:footnoteRef/>`; zwei Fußnoten → `w:id` `1`/`2` in Textreihenfolge; kursiver Fußnotentext bleibt erhalten; leerer Fußnotentext → valides leeres `<w:footnote>`; Fußnote in synthetischer Tabellenzelle bleibt erhalten. Content-Types-Override + Relationship vorhanden. |
| `src/formats/odt/__tests__/roundtrip.test.ts` | Analog: `<text:note text:note-class="footnote">` mit `<text:note-citation>`/`<text:note-body>`; `<text:notes-configuration>` in `styles.xml`; `text:id` nie mit Ziffer beginnend; zwei Fußnoten behalten Reihenfolge; Formatierung erhalten. Cross-Format `writeOdt(await readDocx(...))` und `writeDocx(await readOdt(...))` je ein Test (Anforderung 5.1.6/5.2.6). |
| `src/formats/docx/__tests__/external-fixtures.test.ts` | Gezielter Test (außerhalb der generischen Schleife): `footnotes.docx` → genau eine Fußnote mit Text „snoska“ im `footnotes_area`; `table_footnotes.docx` → Fußnote in Tabellenzelle gefunden (Grenzfall 4.9); beide reexportieren+reimportieren → Text inhaltlich identisch. |
| `src/formats/odt/__tests__/external-fixtures.test.ts` | Gezielter Test: `footnote.odt` → genau **eine** Fußnote (Endnote nicht mitgezählt, Grenzfall 4.18) mit Text „A footnote?“; reexport+reimport → Text erhalten; Regressionsnachweis, dass „A footnote?“ **nicht** inline im Wirt-Absatz landet (ersetzt das heutige Catch-all-Verhalten, Grenzfall 4.19). |

Hinweis: Die Reader-/Writer-Tests dürfen sich nicht gegenseitig „unsichtbar“ ausgleichen — der DOCX-Export
wird zusätzlich gegen einen vom eigenen Reader **unabhängigen** Pfad geprüft (direktes `JSZip`-Auslesen von
`document.xml`/`footnotes.xml` + XML-String-Assertions), der ODT-Export gegen die bestehende
`external-validation.test.ts`-Struktur (`<text:note>` + `<text:notes-configuration>`), Anforderung 5.4.

### 10.2 E2E-Tests (Playwright, `tests/e2e/`)

**Neue Datei `tests/e2e/footnote-insert.spec.ts`** — Anforderung Testfälle 1–9, 23, Grenzfälle 4.8/4.16:

| Testfall | Testname (Vorschlag) |
|---|---|
| 1 | „clicking ‚Fußnote‘ shows a superscript ‚1‘ and an editable footnote area“ |
| 2 | „typing into the footnote area puts the text there, not in the main document“ |
| 3 | „inserting a second footnote before the first renumbers both correctly“ |
| 4 | „deleting a footnote reference removes it and its text, renumbering the rest“ |
| 5 | „Ctrl+Z right after inserting removes both reference and area; Ctrl+Shift+Z restores both“ |
| 7 | „bold applied inside the footnote area renders and round-trips“ |
| 8 | „arrow-key navigation skips the reference as a single atomic step“ |
| 9 | „selection-sync: after inserting, click elsewhere, Enter, keep typing — no content lost“ |
| 4.8 | „inserting 50 footnotes keeps the UI responsive and numbering correct“ |
| 4.16 | „two fast real clicks insert exactly two footnotes, not one and not three“ |
| 23 | „the button's accessible name is ‚Fußnote einfügen‘, distinct from any footer control“ |
| 25 | „clicking a reference mark scrolls to its footnote item (navigation implemented, not a dead click)“ |

**Neue Datei `tests/e2e/footnote-roundtrip.spec.ts`** — Anforderung Abschnitt 5, Testfälle 10–18, im Stil
von `tests/e2e/docx.spec.ts`/`odt.spec.ts` (`setInputFiles`/`filechooser` für Upload,
`page.waitForEvent('download')` + `JSZip.loadAsync` für den unabhängigen Parser):
- DOCX: Fußnote „Testfußnote eins“ einfügen → exportieren → `document.xml` hat genau ein
  `<w:footnoteReference w:id="…"/>`, `word/footnotes.xml` den passenden `<w:footnote>` mit dem Text
  (5.1.1); reimportieren → Marke, Nummer „1“, Text identisch (5.1.2); zwei Fußnoten (5.1.3); echte Fixture
  `footnotes.docx` hochladen → unverändert exportieren → reimportieren → Text „snoska“ erhalten (5.1.4);
  Formatierung (5.1.5); Cross-Format ODT→DOCX mit `footnote.odt` (5.1.6).
- ODT: analog (5.2.1–5.2.6), inkl. Hochladen von `footnote.odt` und Prüfung, dass nach Reexport **genau
  eine** Fußnote (nicht die miteingelesene Endnote) vorhanden ist.
- Cross-Format doppelt (5.3): DOCX→Editor→ODT-Export→Reimport→DOCX-Export → Text erhalten; dasselbe mit
  Startpunkt ODT.
- Performance (Testfall 18): `excelfileformat.odt` (183 Fußnoten) importieren → unverändert exportieren →
  reimportieren → UI reaktionsfähig, Nummerierung durchgehend korrekt, < 3 s.

---

## 11. Rückzumeldende Ergebnisse in `fussnote-einfuegen-req.md` (DoD-Punkte 1, 2, 6, 7)

Nach Umsetzung sind folgende, in der Anforderung als offen markierte Punkte mit dem **Ergebnis** dieses
Plans nachzutragen:
- Abschnitt 3.3 / DoD 1: Entscheidung (b) — gesammelter Bereich am Dokumentende (1.2).
- Menüpunkt 4–5 / DoD 2: Kein neues `WordDocumentContent`-Feld; `footnotes_area`-Knoten im `body`-Dokument
  selbst (1.1).
- Grenzfall 4.6: geteilter Fußnotentext bei Kopieren (nicht Words unabhängige Kopie) (1.5).
- Grenzfall 4.9: funktioniert, real durch `table_footnotes.docx` belegt (1.7).
- Menüpunkt 10: kein Einfüge-Tastenkürzel; Toolbar-Weg ausreichend (1.11).
- Grenzfälle 4.18/4.19: Endnoten strukturell getrennt; heutiges Inline-Verstümmeln (ODT) und stiller
  Verlust (DOCX) durch echte `text:note`/`footnotes.xml`-Struktur ersetzt (1.9, 7.4, 8.3).

---

## 12. Explizit nicht Teil dieser Umsetzung / Folgearbeit

- Vollständige Endnoten-Unterstützung (`endnote-einfuegen`) — nur der minimale Klartext-Fallback aus 1.9.
- Words Verhalten bei Grenzfall 4.6 (unabhängige Kopie statt geteilter Text) — erfordert einen sorgfältig
  gegen 4.5 abgegrenzten `transformPasted`-Eingriff (1.5/1.6).
- `FootnoteText`-Absatzformat auf **jeden** Absatz eines mehrabsätzigen DOCX-Fußnotentexts (aktuell nur der
  erste, 7.3 Punkt 4) — rein kosmetisch, kein Datenverlust.
- Vorbestehende Emoji-Icon-Verwendung im übrigen Toolbar-Code (`⊞`, `🖼`, `🖍`, `⌫`) — außerhalb des
  Geltungsbereichs; Entscheidung 1.10 folgt bewusst **nicht** diesem Muster.
- Pro-Seite-Fußnotenbereiche (Option (a) aus 3.3) — nur relevant, falls ein künftiges Feature echte
  Pro-Seite-Container in `pagination.ts` einführt; dieser Plan wäre dann zu überarbeiten.
