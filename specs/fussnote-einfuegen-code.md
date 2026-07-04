# Umsetzungsplan (Code-Ebene): Feature „Fußnote einfügen“

Bezug: `specs/fussnote-einfuegen-req.md` (Anforderung), `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 11/17/18/20,
`FEATURE-BACKLOG.md` Zeile 319 (Abschnitt 5.2). Dieser Plan wurde gegen den tatsächlichen Code-Stand im
Repo (Stand 2026-07-04) verifiziert — inklusive Gegenlesen der installierten `prosemirror-state`/
`prosemirror-view`-Quelltexte (`node_modules/prosemirror-state/dist/index.js`,
`node_modules/prosemirror-view/dist/index.js`) für die tückeligen Low-Level-Fragen (Cursorposition nach
`replaceSelectionWith`, `uiEvent`/`appendedTransaction`-Metadaten) sowie dreier echter Testkorpus-Dateien
(`tests/fixtures/external/docx/footnotes.docx`, `.../table_footnotes.docx`,
`tests/fixtures/external/odt/footnote.odt`) — nicht nur gegen die Beschreibung in der Anforderung.
Abweichungen/Präzisierungen sind unten explizit markiert.

Rollenteilung: Dieses Dokument ist der Bauplan des „Entwicklers“. Es ändert selbst noch keinen Code. Es
beantwortet außerdem alle in der Anforderung offen gelassenen Architektur-/Produktfragen (Abschnitt 2.3,
Abschnitt 1 Zeile 3–4, Grenzfälle 3.6/3.9/3.15/3.17/3.18 u. a.), damit die Umsetzung nicht an ungeklärten
Fragen hängen bleibt (DoD-Punkte 1, 2, 7).

---

## 0. Verifikation des in der Anforderung referenzierten Ist-Stands

Alle in `fussnote-einfuegen-req.md` (Zeilen 41–57) zitierten Fundstellen wurden erneut gegen den Code
gelesen. Ergebnis: **alle Angaben treffen zu.** Zusätzliche, für die Umsetzung relevante Präzisierungen:

| Punkt aus der Anforderung | Präzisierung nach eigener Prüfung |
|---|---|
| `schema.ts:7`, `doc: { content: 'block+' }` | Bestätigt. Für Fußnoten wird dieser Ausdruck auf `'block+ footnotes_area?'` erweitert (siehe Abschnitt 3.1) — rückwärtskompatibel, da `block+` weiterhin ohne den optionalen Zusatzknoten gültig bleibt; keine bestehende Testfixture (`roundtrip.test.ts`, `doc()`-Helper, Zeilen 8–15 in beiden Dateien) muss angepasst werden. |
| `commands.ts:66–86`, Muster `state.tr.replaceSelectionWith(node)` | Bestätigt — und **geprüft, was dieses Muster für einen `inline: true`-Atom-Knoten konkret bewirkt** (Abschnitt 1.3 der Anforderung verlangt genau das für die Referenzmarke): `Transaction.replaceSelectionWith` (`node_modules/prosemirror-state/dist/index.js:609`) ruft `selection.replaceWith(this, node)` auf, was intern `selectionToInsertionEnd(tr, mapFrom, node.isInline ? -1 : 1)` aufruft (Zeile 109/461–472). Für `node.isInline === true` wird `Selection.near(doc.resolve(end), -1)` verwendet — das liefert für eine Position direkt hinter einem gerade eingefügten Inline-Atom (die selbst bereits eine gültige Cursor-Position ist) einen **kollabierten `TextSelection` genau an dieser Stelle**, keine `NodeSelection` um den Atom-Knoten. Das heißt: **`insertFootnote()` muss die Selektion nach dem Einfügen nicht manuell korrigieren** — Anforderung 2.1 („Cursor direkt hinter der Referenzmarke“) ist mit dem bereits etablierten `replaceSelectionWith`-Muster automatisch erfüllt, solange `footnote_reference` als `inline: true` deklariert wird. (Bei `insertImage`/`insertTable`, beide `group: 'block'`, wählt derselbe Code den anderen Zweig — `NodeSelection` um den Block —, was dort ebenfalls das gewünschte, bereits akzeptierte Verhalten ist.) |
| — (nicht in der Anforderung erwähnt, aber entscheidend für Undo-Atomarität, Abschnitt 2.10) | `EditorState.applyTransaction` (`node_modules/prosemirror-state/dist/index.js`, Zeile ~800–812) markiert jede von `appendTransaction` erzeugte Zusatz-Transaktion automatisch mit `tr.setMeta("appendedTransaction", rootTr)` (Zeile 809, geprüft). `prosemirror-history` gruppiert eine so markierte Zusatztransaktion in **denselben** Undo-Schritt wie die sie auslösende Transaktion. Das heißt: Ein `appendTransaction`-Hook, der z. B. beim Löschen eines ganzen Absatzes zusätzlich den verwaisten Fußnotentext entfernt, erzeugt dafür **keinen eigenen** Undo-Schritt — Grenzfall 3.4 und Anforderung 2.10 sind damit ohne zusätzliche Buchführung erfüllt. |
| — (dito, entscheidend für Grenzfall 3.5 „Ausschneiden“) | `prosemirror-view` (`node_modules/prosemirror-view/dist/index.js:3707`) markiert die durch einen echten Browser-„Ausschneiden“-Befehl ausgelöste Lösch-Transaktion explizit mit `tr.setMeta("uiEvent", "cut")`. Das ist ein zuverlässiges, bereits vorhandenes Signal, um „Referenz wurde soeben ausgeschnitten (Text kommt evtl. gleich per Einfügen zurück)“ von „Referenz wurde endgültig gelöscht“ zu unterscheiden — siehe Entscheidung 1.6. |
| `tests/fixtures/external/docx/footnotes.docx`, `.../table_footnotes.docx`, `tests/fixtures/external/odt/footnote.odt` | Diese drei Dateien **existieren bereits im Repo** (Apache-POI- bzw. LibreOffice-Testkorpus, wie in `external-fixtures.test.ts` bereits für andere Merkmale genutzt) und enthalten **echte** Fußnoten — die Anforderung (Abschnitt 5, Testfall 12) verlangt genau solche Dateien, sie müssen also **nicht neu beschafft werden**. Konkret geprüft: `footnotes.docx` → ein `<w:footnoteReference w:id="1"/>` in `document.xml`, referenziertes `<w:footnote w:id="1">` in `footnotes.xml` beginnt mit einem `<w:r>…<w:footnoteRef/></w:r>`-Lauf gefolgt von Text „snoska“; `table_footnotes.docx` → Fußnotenreferenz **innerhalb einer Tabellenzelle** (deckt Grenzfall 3.9 mit einer echten Datei ab, nicht nur synthetisch); `footnote.odt` → enthält **sowohl** ein `<text:note text:note-class="footnote">` **als auch** ein `<text:note text:note-class="endnote">` im selben Dokument — die **exakte** Konstellation aus Grenzfall 3.18, bereits als reale Fixture vorhanden. `styles.xml` dieser ODT-Datei enthält außerdem ein reales `<text:notes-configuration text:note-class="footnote" style:num-format="1" text:start-value="0" text:footnotes-position="page" .../>`-Element, das als exaktes Vorbild für den neu zu schreibenden Export dient (siehe Abschnitt 6.2). |
| `docx/reader.ts:129–140`, `w:footnoteReference` „wird nicht erkannt“ | Bestätigt, und konkretisiert: Der Lauf, der `<w:footnoteReference>` trägt, hat in echten Word-Dateien **kein** `<w:t>`-Kind, sondern nur `<w:rPr>` (meist mit `<w:rStyle w:val="…"/>`, Word-intern z. B. `"a5"`, **nicht** zwingend `"FootnoteReference"` — unser eigener Export erzeugt zwar `"FootnoteReference"` als Style-ID, ein Import darf sich aber **nicht** auf einen bestimmten Style-ID-Namen verlassen, da echte Fremddateien beliebige, dokumentinterne IDs verwenden). Die Erkennung muss daher rein strukturell über das Element `w:footnoteReference` selbst erfolgen, nicht über den referenzierten Formatnamen. |

---

## 1. Architektur-/Produktentscheidungen

### 1.1 Fußnotentext-Speicherort im Datenmodell (Anforderung Abschnitt 1, Zeile 3–4; DoD Punkt 2)

**Entscheidung: Kein neues Feld in `WordDocumentContent` (`documentModel.ts`).** Der Fußnotentext wird
stattdessen als echter ProseMirror-Knoten **innerhalb desselben `body`-Dokuments** gespeichert: ein neuer
Container-Knoten `footnotes_area` (optionales, letztes Kind von `doc`) mit Kind-Knoten `footnote_item`
(einer je Fußnote, mit stabiler `id`). Das ist eine **bewusste Abweichung** von der in der Anforderung
selbst genannten Empfehlung (`footnotes: Record<string, ProseMirrorJSON>` analog zu `header`/`footer`).

Begründung:
1. **Atomares Undo/Redo (Anforderung 2.10) wird dadurch trivial.** Referenzmarke und leerer
   Fußnotentext-Eintrag entstehen in **einer** Transaktion auf **einem** Dokument → automatisch **ein**
   Undo-Schritt, ohne jede Zusatzlogik. Zwei parallele Datenstrukturen (Haupt-Doc + separates
   `footnotes`-Record) mit zwei potenziell unabhängigen Edit-Historien hätten dieses Ziel nur mit
   zusätzlicher, fehleranfälliger Synchronisationslogik erreicht (die Anforderung selbst benennt in
   Abschnitt 2.10 explizit zwei mögliche Architekturen und verlangt Konsistenz mit der 2.3-Entscheidung —
   diese Entscheidung ist die konsistente Wahl für Option (b) aus Abschnitt 1.2 unten).
2. **Automatische Neunummerierung nach Lesereihenfolge (Anforderung 2.2)** fällt praktisch kostenlos ab,
   weil die Reihenfolge der `footnote_reference`-Knoten im `body`-Dokument selbst **bereits** die
   Lesereihenfolge ist (`doc.descendants`) — ein separates `Record<string, …>` hätte eine **eigene**
   Ordnungslogik gebraucht, die gegen die Referenz-Reihenfolge im Haupttext abgeglichen werden müsste.
3. `header`/`footer` sind aktuell selbst **nicht im Editor gerendert** (`WordEditor.tsx:116–132`, von der
   Anforderung selbst als Ist-Stand zitiert) — es gibt also noch **kein** etabliertes Muster im Code für
   „zweiter, synchron gehaltener Sub-Editor“, das man hier hätte wiederverwenden können. Ein neues,
   ungetestetes Muster für einen kritischen Teil dieses Features einzuführen wäre riskanter als die
   Wiederverwendung des bereits vollständig funktionierenden „ein Dokument, ein `EditorView`“-Ansatzes.

Diese Entscheidung beantwortet formal DoD-Punkt 2. `WordDocumentContent` (`documentModel.ts:3–8`) bleibt
**unverändert** — `emptyDocJSON()`/`createBlankWordDocument()` (Zeilen 10–21) brauchen ebenfalls **keine**
Änderung, da ein Dokument ohne Fußnoten schlicht keinen `footnotes_area`-Knoten enthält (durch das `?` im
neuen Schema-Content-Ausdruck weiterhin gültig, siehe Abschnitt 3.1).

### 1.2 Platzierung „am Seitenende“ (Anforderung Abschnitt 2.3, DoD Punkt 1)

**Entscheidung: Option (b)** — ein gesammelter, editierbarer Fußnotenbereich am Ende des Dokuments, nicht
pro (visueller) Seite. Begründung identisch zur eigenen Einschätzung der Anforderung: `pagination.ts`
(Zeilen 33–105) rendert ein einziges fortlaufendes ProseMirror-Dokument mit rein optischen
Abstands-Decorations, ohne separate Pro-Seite-DOM-Container — echte Pro-Seite-Fußnotenbereiche wären ein
grundlegender Umbau der Paginierung, den diese Anforderung laut eigenem Geltungsbereich (Zeile 18–25)
nicht verlangt. Die Anforderung selbst stuft Option (b) für die Rundreise-Pflicht (Abschnitt 4) als
**ausreichend** ein (Zeile 133).

Konkret: `footnotes_area` wird als **optionales letztes Kind von `doc`** modelliert (siehe 3.1). Da
ProseMirror Knoten in Dokumentreihenfolge rendert, erscheint dieser Bereich dadurch automatisch **nach dem
letzten Absatz des Haupttextes**, ohne dass CSS-Positionierungstricks nötig sind — visuell „am Ende des
Dokuments“ im Sinne der Anforderung. Deutlich abgesetzt gestaltet (Trennlinie, kleinere Schrift,
„Fußnoten“-Beschriftung, siehe Abschnitt 5), damit er nicht mit normalem Fließtext verwechselt wird.
**Diese Vereinfachung wird hiermit explizit dokumentiert** (erfüllt den in Zeile 134–135 der Anforderung
verlangten Hinweis): Es gibt **keine** Zuordnung „Fußnote X gehört zu visueller Seite Y“ — alle Fußnoten
eines Dokuments erscheinen in einem einzigen Sammel-Bereich, unabhängig davon, auf welcher berechneten
Seite (`pagination.ts`) sich die zugehörige Referenzmarke befindet. Für Export/Reimport ist das nach
Zeile 129–133 der Anforderung ausdrücklich unschädlich, da DOCX/ODT ohnehin nur die Zuordnung
Referenz-ID → Text erwarten und die tatsächliche Seiten-Platzierung beim Öffnen in Word/LibreOffice von
deren eigener Paginierung übernommen wird.

### 1.3 Interne ID vs. exportierte XML-ID (neu erkannte Notwendigkeit, nicht in der Anforderung explizit benannt, aber Voraussetzung für gültiges XML)

**Entscheidung: zwei getrennte ID-Räume.**
- **Intern** (ProseMirror-Attribut `id` auf `footnote_reference`/`footnote_item`): ein beliebiger,
  dokumentweit eindeutiger String. Beim Import wird der jeweilige Fremdformat-Bezeichner **unverändert
  übernommen** (DOCX: der numerische `w:id`-Wert als String, z. B. `"1"`; ODT: der `text:id`-Wert
  unverändert, z. B. `"ftn0"`). Beim interaktiven Einfügen im Editor wird deterministisch
  `nextFootnoteId(doc)` verwendet (Abschnitt 4.1) — **kein `Math.random()`**, siehe Grenzfall 3.15 und das
  dort explizit referenzierte, bereits bekannte Problem in `odt/writer.ts:109` (`Math.random()` für
  Tabellennamen, dokumentiert in `tabelle-einfuegen-req.md` Abschnitt 4.2 Punkt 6 und im dortigen
  Umsetzungsplan `tabelle-einfuegen-code.md` Abschnitt 5.1 Punkt 2 bereits durch einen Zähler ersetzt —
  dieselbe Lösung wird hier von Anfang an übernommen, nicht wiederholt eingeführt).
- **Export-XML-ID**: **niemals** die interne ID unverändert in `w:id`/`text:id` schreiben, sondern pro
  Exportlauf frisch zugewiesen:
  - DOCX: `w:id` muss laut OOXML-Schema eine Ganzzahl sein (`ST_DecimalNumber`). Eine aus einer
    ODT-Quelle importierte interne ID wie `"ftn0"` wäre als `w:id="ftn0"` **ungültiges XML**. Der
    DOCX-Writer vergibt daher pro Aufruf von `writeDocx()` frische, fortlaufende Ganzzahlen `1..N` (in
    Nummerierungsreihenfolge, siehe Abschnitt 6.4) über eine lokale `Map<internalId, number>` — unabhängig
    vom internen ID-Format.
  - ODT: `text:id` ist vom XML-Typ `ID` (muss der `Name`-Produktion genügen, darf also **nicht** mit einer
    Ziffer beginnen). Eine aus einer DOCX-Quelle importierte interne ID wie `"1"` wäre als `text:id="1"`
    ebenfalls **ungültig**. Der ODT-Writer präfixiert daher jede interne ID beim Export mit `ftn`
    (vorhandenes `ftn`-Präfix wird nicht doppelt angehängt), z. B. `"1"` → `"ftn1"`, `"ftn0"` → `"ftn0"`
    unverändert.

  Diese Trennung macht das Feature robust gegenüber beliebigen internen ID-Formen und ist notwendig, damit
  Cross-Format-Rundreisen (Anforderung 4.3) niemals ungültiges XML erzeugen können.

### 1.4 Sichtbare Nummerierung: Rendering-Technik (Anforderung 2.2)

**Entscheidung:** Die sichtbare Zahl wird **nicht** im Dokument gespeichert (auch nicht implizit über
CSS-Counter, da das die Zahl für Playwright-Textabfragen unsichtbar machen würde, siehe unten), sondern
nach jedem View-Update **direkt als echter DOM-Text** gesetzt — durch Wiederverwendung des in
`pagination.ts` (Zeilen 88–104) bereits etablierten Plugin-`view()`-Musters (`requestAnimationFrame`-
verzögerte Neuberechnung nach jedem Update), nicht durch einen neuen NodeView- oder
Decoration-Spec-Mechanismus. Begründung:
- Eine reine CSS-`counter()`-Lösung (`content: counter(footnote)` über eine `::after`-Pseudo-Regel) wäre
  die einfachste Lösung und wurde erwogen, aber **verworfen**: Pseudo-Element-Inhalt ist über
  `element.textContent`/`page.locator(...).textContent()` in Playwright **nicht** zuverlässig abfragbar
  (nur über `getComputedStyle(el, '::after').content`, was für die in Abschnitt 5 der Anforderung
  geforderten E2E-Tests unpraktikabel wäre — Testfall 1 verlangt ausdrücklich eine „sichtbare hochgestellte
  Zahl ‚1‘“, die ein Test auch tatsächlich lesen können muss).
- Ein NodeView mit manueller Decoration-Spec-Synchronisation wäre die „lehrbuchhafte“ ProseMirror-Lösung,
  ist aber deutlich komplexer als nötig und führt ein im Projekt bisher unbenutztes Muster ein.
- Die direkte DOM-Text-Manipulation nach jedem `view.update()` (identisches Timing/Muster wie
  `pagination.ts`) liefert **echten, abfragbaren Text**, ist einfach zu verstehen/warten und akzeptiert
  denselben (in `pagination.ts` bereits akzeptierten) Ein-Frame-Nachlauf. Sie mutiert nur `textContent`
  bereits vorhandener, von ProseMirror nicht weiter inhaltlich verwalteter `<sup>`/Label-Elemente
  (`footnote_reference` ist ein Atom-Knoten ohne eigenes Content-Modell — ProseMirror parst dessen
  DOM-Inhalt nie zurück in Dokumentinhalt, ein direktes Überschreiben von `textContent` ist daher sicher).

### 1.5 Grenzfall 3.6 — Kopieren einer Referenzmarke (Anforderung: „ungeklärt“, muss entschieden werden)

**Entscheidung: Ein Duplikat (Copy+Paste derselben Referenz im selben Dokument) referenziert denselben,
geteilten Fußnotentext — bewusst einfacher als Word (das eine komplett unabhängige neue Fußnote
erzeugt), aber deterministisch und ohne Sonderbehandlung von Zwischenablage-Inhalten umsetzbar.**
Begründung: ProseMirror übernimmt Knoten-Attribute (also auch `id`) beim Kopieren/Einfügen standardmäßig
unverändert; ohne einen eigenen `transformPasted`-Eingriff bleibt die `id` der eingefügten Kopie identisch
zur Quelle. Ein `transformPasted`-Eingriff, der beim Einfügen automatisch neue IDs vergibt, würde
**gleichzeitig** Grenzfall 3.5 (Ausschneiden+Einfügen **derselben** Referenz an anderer Stelle) zerstören,
da Paste strukturell nicht zwischen „das war ein Cut von vorhin“ und „das war ein Copy“ unterschieden
werden kann (siehe 1.6) — beides läuft über denselben Einfüge-Codepfad. Die einfachere, hier gewählte
Variante behandelt beide Fälle einheitlich und korrekt für den **häufigeren** Fall (Verschieben, Grenzfall
3.5), auf Kosten einer Vereinfachung beim **selteneren** Fall (Duplizieren, Grenzfall 3.6): zwei
Referenzmarken mit derselben `id` zeigen auf **einen** gemeinsamen `footnote_item`-Eintrag; Bearbeiten des
Texts wirkt sich auf beide aus; Löschen **einer** der beiden Referenzen lässt den Eintrag bestehen (da die
verbleibende Referenz ihn weiterhin braucht — siehe „Waisen“-Erkennung in Abschnitt 4.2, die auf
Nichtvorhandensein **jeglicher** Referenz mit dieser ID prüft, nicht auf „genau eine“); erst das Löschen
der **letzten** verbleibenden Referenz mit dieser ID entfernt den Eintrag. **Explizit dokumentierte,
akzeptierte Abweichung von Word** — als Folgearbeit vermerkt (Abschnitt 12).

### 1.6 Grenzfall 3.5 — Ausschneiden + Einfügen an anderer Stelle desselben Dokuments

**Entscheidung: Funktioniert korrekt, ohne Zusatzaufwand für den Normalfall**, weil (a) laut Entscheidung
1.5 die `id` beim Einfügen unverändert erhalten bleibt und (b) die generische
„verwaiste-Fußnote-entfernen“-Logik (Abschnitt 4.2) einen kurzen Gnadenzeitraum für Transaktionen
gewährt, die von einem echten Browser-„Ausschneiden“ stammen (erkennbar über
`tr.getMeta('uiEvent') === 'cut'`, siehe Abschnitt 0 und `prosemirror-view`-Quelltext-Fundstelle). Zwischen
dem Ausschneiden (Referenz verschwindet kurzzeitig aus dem Textfluss) und dem späteren Einfügen (Referenz
mit **derselben** `id` erscheint an neuer Stelle) wird der zugehörige `footnote_item`-Eintrag **nicht**
sofort entfernt, sondern erst, wenn nach einem `cut` **keine** neue passende Referenz mehr auftaucht (auf
der nächsten inhaltlichen Änderung, die nicht selbst wieder ein `cut` ist) — bzw. spätestens beim Export
(siehe Abschnitt 4.3, harte Garantie). Für den weit überwiegenden Praxisfall (Ausschneiden und Einfügen
in derselben Sitzung/demselben Tab) bleibt der Text dadurch vollständig erhalten.

### 1.7 Grenzfall 3.9 (Tabellenzelle) und 3.10 (Listenelement)

**Entscheidung: Beide funktionieren ohne jede Sonderbehandlung im Schema oder in den Commands.**
Begründung: `footnote_reference` wird mit `group: 'inline'` deklariert (siehe 3.1) und ist damit überall
zulässig, wo `content: 'inline*'` gilt — das schließt Absätze innerhalb von Tabellenzellen
(`cellContent: 'block+'`, `schema.ts:106`, ein `block+`-Slot erlaubt `paragraph`, dessen `inline*`
wiederum `footnote_reference` erlaubt) und innerhalb von `list_item` (`content: 'paragraph block*'`,
`schema.ts:99`) automatisch ein. **Real durch die Fixture `table_footnotes.docx` bestätigt** (Abschnitt 0):
Diese Datei enthält bereits eine echte Fußnotenreferenz innerhalb einer Tabellenzelle; sobald
`decodeParagraphRuns`/`runsToInline` (Abschnitt 7.2) erweitert sind, wird sie **automatisch** korrekt
gelesen, weil `parseTable()` (`docx/reader.ts:210–256`) für Zellinhalte dieselbe `paragraphToBlocks()`-
Funktion aufruft wie für den Haupttext (`docx/reader.ts:236–238`) — keine separate Anpassung an
`parseTable` nötig. Die Nummerierung (Abschnitt 4.1/4.2) durchläuft den Dokumentbaum ohnehin per
`doc.descendants`/rekursivem JSON-Walk und findet Referenzen in Zellen/Listenelementen ebenso wie im
Hauptfließtext, in derselben Lesereihenfolge.

### 1.8 Grenzfall 3.17 (Fußnote in Kopf-/Fußzeile)

**Entscheidung: Kein aktiver Block nötig, da Kopf-/Fußzeilen aktuell nicht editierbar sind** (laut
Anforderungs-Ist-Stand-Tabelle, `WordEditor.tsx:116–132`: `doc.header`/`doc.footer` werden im Editor gar
nicht gerendert). Die Absturzfreiheit wird dennoch **defensiv** sichergestellt: Wenn `writeDocx`/`writeOdt`
später doch `header`/`footer`-Inhalt mit einem (z. B. durch einen künftigen Copy-Paste-Bug) enthaltenen
`footnote_reference` serialisieren sollten, greift derselbe Fallback wie bei einer fehlenden Zuordnung
(Grenzfall 3.14, Abschnitt 7.4/9.4): leerer bzw. Platzhalter-Text statt Absturz. Sobald
`kopfzeile-bearbeiten`/`fusszeile-bearbeiten` (eigene, separate Backlog-Einträge) umgesetzt werden, sollte
deren Umsetzungsplan den Fußnoten-Button dort ausblenden — hier nur als Hinweis vermerkt, kein Teil dieser
Umsetzung.

### 1.9 Grenzfall 3.18 (Endnoten in derselben Datei) — jetzt mit realer Fixture belegt

**Entscheidung:** Endnoten werden **strukturell klar getrennt** behandelt, nie als Fußnoten fehlinterpretiert:
- DOCX: nur `w:footnoteReference`/`w:footnoteRef` werden erkannt; `w:endnoteReference`/`word/endnotes.xml`
  werden **nicht** angefasst. Da `decodeParagraphRuns` bereits heute (vor dieser Änderung) jedes
  unbekannte `<w:r>`-Kindelement stillschweigend ignoriert, ändert sich das Verhalten für
  `w:endnoteReference` durch dieses Feature **nicht** — es bleibt der bereits heute bestehende,
  außerhalb des Geltungsbereichs liegende Verlust des sichtbaren Endnotenzeichens (siehe Abschnitt 12,
  Folgearbeit). **Empfohlene kleine Zusatzabsicherung** (kein Blocker, da `endnote-einfuegen` ein eigener
  Backlog-Eintrag ist, aber mit vertretbarem Aufwand sofort miterledigbar, siehe Abschnitt 7.5): ein
  minimaler Klartext-Fallback, der bei Vorhandensein von `word/endnotes.xml` den referenzierten
  Endnotentext als eckige Klammerbemerkung `[Endnote: …]` an der Zitatstelle einfügt, statt ihn ersatzlos
  zu verwerfen — erfüllt den in Grenzfall 3.18 explizit geforderten „mindestens als Klartext-Fallback“.
- ODT: Die reale Fixture `footnote.odt` bestätigt, dass Endnoten in ODF **dasselbe** Element `<text:note>`
  verwenden, unterschieden nur über `text:note-class="endnote"` statt `"footnote"`. Der Reader **muss**
  dieses Attribut prüfen und darf **nur** `"footnote"`-Werte in `footnote_reference`/`footnote_item`
  übersetzen. Für `"endnote"` gilt dieselbe empfohlene Klartext-Fallback-Behandlung wie bei DOCX
  (Abschnitt 9.5).

### 1.10 Beschriftung/Icon des Toolbar-Buttons (Anforderung 2.9, `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1)

**Entscheidung: Reiner Textbutton „Fußnote“, kein Icon/Emoji.** `title`/`aria-label` = „Fußnote einfügen“
(vollständiger, eindeutiger Satz, nicht nur das Wort „Fußnote“). Begründung: Abschnitt 20.1 der
Feature-Spec fordert ausdrücklich, auf unzuverlässig rendernde Emoji-Icons zu verzichten (der bestehende
Toolbar-Code verstößt an mehreren Stellen bereits dagegen — ⊞, 🖼, 🖍, ⌫ — das ist ein **vorbestehender**,
nicht Teil dieser Anforderung zu behebender Mangel, siehe Abschnitt 12). Für **dieses neue** Element wird
die Anforderung von Anfang an eingehalten: klarer deutscher Text statt eines mehrdeutigen Symbols, was
gleichzeitig die in Abschnitt 2.9 geforderte eindeutige Abgrenzung zu einem künftigen
„Fußzeile bearbeiten“-Button am zuverlässigsten sicherstellt (unterschiedlicher sichtbarer Text UND
unterschiedliches `aria-label`, kein gemeinsamer Icon-Wortstamm).

### 1.11 Explizit nicht Teil dieser Umsetzung

- Tastenkombination zum Einfügen (Anforderung Zeile 79 — „kein Blocker“).
- Fußnoten-Navigation (nächste/vorherige) und Fußnote-zu-Endnote-Konvertierung — eigene Backlog-Slugs
  (`fussnote-navigation`, `fussnote-zu-endnote`, Zeile 29–31 der Anforderung).
- Vollwertige Endnoten-Unterstützung (`endnote-einfuegen`, eigener Slug, Priorität 2) — nur der in 1.9
  beschriebene minimale Klartext-Fallback wird miterledigt.
- Pro-Seite-Fußnotenbereiche (Option (a) aus Abschnitt 2.3 der Anforderung) — siehe Entscheidung 1.2.
- Bilder/Tabellen aktiv **in** einen Fußnotentext einfügen (kein UI-Weg dafür) — das Schema **erlaubt**
  es strukturell (siehe 3.2), ein versehentliches Hineinkopieren stürzt daher nicht ab (Grenzfall 3.11),
  ohne dass dafür weitere Arbeit nötig ist.

---

## 2. Neue Dateien

### 2.1 `src/formats/shared/editor/footnoteSync.ts` (neu)
Enthält `createFootnoteSyncPlugin()` — ein `appendTransaction`-Plugin, das nach jeder inhaltlichen
Änderung (a) verwaiste `footnote_item`-Einträge entfernt (Anforderung 2.7, Grenzfall 3.4), (b) fehlende
Einträge für eine vorhandene Referenz ohne Text mit Platzhalter auffüllt (Grenzfall 3.14), (c) die
Reihenfolge der `footnote_item`-Kinder in `footnotes_area` an die Lesereihenfolge der zugehörigen
Referenzen im Haupttext angleicht (Anforderung 2.2/2.6), und (d) den ganzen `footnotes_area`-Knoten
entfernt, sobald keine Referenz mehr existiert.

```ts
import { Plugin } from 'prosemirror-state'
import type { Node as PMNode } from 'prosemirror-model'
import { wordSchema } from '../schema'

export const FOOTNOTE_PLACEHOLDER_TEXT = '[fehlender Fußnotentext]' // Wortlaut aus Anforderung, Grenzfall 3.14

/** Reading-order ids of every footnote_reference in `doc`, EXCLUDING the collected
 *  footnotes_area itself (walked separately, deeply, per top-level child so that
 *  references nested in table cells / list items — see table_footnotes.docx — are found). */
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

function firstOccurrenceOrder(ids: string[]): string[] {
  return [...new Set(ids)] // Entscheidung 1.5: eine doppelt kopierte Referenz zählt einmal, an ihrer ersten Fundstelle
}

export function createFootnoteSyncPlugin(): Plugin {
  return new Plugin({
    appendTransaction(trs, _old, newState) {
      if (!trs.some((tr) => tr.docChanged)) return null
      const isCut = trs.some((tr) => tr.getMeta('uiEvent') === 'cut') // Entscheidung 1.6

      const targetIds = firstOccurrenceOrder(collectReferenceIds(newState.doc))
      const area = newState.doc.lastChild?.type.name === 'footnotes_area' ? newState.doc.lastChild : null
      const currentIds = area ? Array.from({ length: area.childCount }, (_, i) => String(area.child(i).attrs.id)) : []

      if (targetIds.length === 0) {
        if (!area || isCut) return null // nothing to do, or: grace period, re-check next non-cut change
        const pos = newState.doc.content.size - area.nodeSize
        return newState.tr.delete(pos, pos + area.nodeSize)
      }

      if (JSON.stringify(currentIds) === JSON.stringify(targetIds)) return null // already in sync (perf, Grenzfall 3.8)

      const missingIds = targetIds.filter((id) => !currentIds.includes(id))
      if (isCut && missingIds.length === 0) return null // pure removal mid-cut -> grace period, don't rebuild yet

      const byId = new Map(area ? Array.from({ length: area.childCount }, (_, i) => [String(area.child(i).attrs.id), area.child(i)] as const) : [])
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
Hinweis: Die exakte Positions-Arithmetik (`newState.doc.content.size - area.nodeSize` als Startposition
des letzten Kindknotens) folgt demselben, bereits im Projekt für `insertRowAtEndAndFocusFirstCell`
verwendeten Muster (`tabelle-einfuegen-code.md` Abschnitt 3.1, Punkt 4) und ist während der Umsetzung
durch einen dedizierten Unit-Test abzusichern (Abschnitt 10.1).

### 2.2 `src/formats/shared/editor/footnoteDisplay.ts` (neu)
Enthält `createFootnoteDisplayPlugin()` — reine Darstellungs-/Navigationslogik, kein Dokumentzustand.
Setzt nach jedem View-Update die sichtbaren Nummern als echten DOM-Text (Entscheidung 1.4) und behandelt
Klicks für die optionale Navigation (Anforderung 2.8, Punkt 7).

```ts
import { Plugin } from 'prosemirror-state'

export function createFootnoteDisplayPlugin(): Plugin {
  return new Plugin({
    view(view) {
      const recompute = () => {
        const refs = Array.from(view.dom.querySelectorAll<HTMLElement>('sup.footnote-ref'))
        refs.forEach((el, i) => {
          el.textContent = String(i + 1)
        })
        const items = Array.from(view.dom.querySelectorAll<HTMLElement>('.footnote-item-number'))
        items.forEach((el, i) => {
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
          return false // return false: ProseMirror still sets its own NodeSelection on the atom as usual
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
Deckt Anforderung Punkt 7/Abschnitt 2.8 **inklusive** Rückwärtsnavigation ab (kein „bewusst nicht
umgesetzt“ nötig — die Kosten sind gering, da beide Richtungen nur ein `closest()` + `scrollIntoView()`
brauchen).

### 2.3 `src/formats/shared/footnotes.ts` (neu)
JSON-basierte Hilfsfunktionen, die **von `docx/writer.ts` UND `odt/writer.ts` gemeinsam genutzt** werden.
Das ist eine bewusste Abweichung vom sonst im Projekt üblichen Muster „kleine Utility-Klasse pro Format
dupliziert“ (z. B. `docx/imageCollector.ts` vs. `odt/imageCollector.ts`, `docx/xmlUtil.ts` vs.
`odt/xmlUtil.ts`): Diese Logik (Lesereihenfolge-Nummerierung, Fußnotenbereich finden) muss über beide
Formate **hinweg identisch** funktionieren, damit die Cross-Format-Rundreise (Anforderung 4.3) nicht durch
eine feine Verhaltensabweichung zwischen zwei eigentlich dupliziert gepflegten Implementierungen bricht —
anders als bei den einfachen, stabilen Einzeilern in `xmlUtil.ts`, bei denen dieses Risiko praktisch
nicht besteht.

```ts
interface JsonNodeLike {
  type: string
  attrs?: Record<string, unknown>
  content?: JsonNodeLike[]
}

/** Finds the trailing `footnotes_area` node in a body's top-level content array, if present. */
export function findFootnotesArea(bodyContent: JsonNodeLike[] | undefined): JsonNodeLike | null {
  const last = bodyContent?.[bodyContent.length - 1]
  return last?.type === 'footnotes_area' ? last : null
}

/** Deep walk collecting footnote_reference ids in reading order, recursing into table
 *  cells/rows and list items (NOT into footnotes_area itself). First occurrence wins for a
 *  duplicated id (Entscheidung 1.5). */
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

/** Looks up a footnote_item's own content array by id inside a footnotes_area node. */
export function footnoteItemContent(area: JsonNodeLike | null, id: string): JsonNodeLike[] {
  const item = area?.content?.find((n) => n.type === 'footnote_item' && String(n.attrs?.id) === id)
  return item?.content ?? [{ type: 'paragraph', attrs: { align: 'left' }, content: [] }]
}
```

---

## 3. Geänderte Dateien — Schema

### 3.1 `src/formats/shared/schema.ts`
1. Zeile 7, `doc: { content: 'block+' }` wird zu:
   ```ts
   doc: { content: 'block+ footnotes_area?' },
   ```
2. Drei neue Node-Specs, direkt vor der schließenden Klammer des `nodes`-Objekts (nach den
   Tabellen-Knoten, Zeile 106) eingefügt:
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
   Wichtig: `footnotes_area`s eigenes `toDOM` trägt `contenteditable: 'false'` auf dem **äußeren** `div`
   (verhindert Tippen zwischen den `footnote_item`s, z. B. vor dem ersten oder nach dem letzten Eintrag),
   während das **innere** `footnote-area-list`-`div` (das „Loch“, `0`) den normalen editierbaren Inhalt
   der `footnote_item`-Kinder trägt — ein `contenteditable="false"`-Elternelement mit einem `["div", 0]`-
   Kind als tatsächliches Ziel für die ProseMirror-Content-Hole ist ein Standardmuster für „Chrome um
   editierbaren Inhalt herum“ und **muss während der Umsetzung geprüft werden**, ob ProseMirror das
   `contenteditable="false"` auf einem Vorfahren des Content-Holes tatsächlich zulässt, ohne die
   Editierbarkeit der Kinder zu blockieren (Browser behandeln verschachteltes
   `contenteditable="true"` innerhalb `contenteditable="false"` normalerweise korrekt, dies ist aber ein
   Punkt, der real im Browser verifiziert werden muss, nicht nur in jsdom-Unit-Tests).
3. Keine Änderung an `marks` (Zeile 109–148) nötig — `footnote_item`s Inhalt (`paragraph`/`heading`/
   etc.) erbt automatisch alle bestehenden Marks (Anforderung 2.5), da dieselben Block-Knotentypen
   wiederverwendet werden.

### 3.2 Auswirkung auf bestehende Tests
`roundtrip.test.ts`s `doc()`-Helper (beide Formate, Zeilen 8–15) erzeugt weiterhin gültige Dokumente ohne
`footnotes_area` — `block+ footnotes_area?` lässt das zu. **Keine Anpassung nötig.**

---

## 4. Geänderte Dateien — Commands

### 4.1 `src/formats/shared/editor/commands.ts`
1. Neue Importe: `NodeSelection` aus `prosemirror-state` (zusätzlich zu `Command`/`EditorState`, bereits
   importiert Zeile 1); `Node as PMNode` aus `prosemirror-model`.
2. Neue Hilfsfunktion (deterministisch, kein `Math.random()` — Entscheidung 1.3, Grenzfall 3.15):
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
3. **Neu:** `insertFootnote(): Command`, nach dem Muster von `insertImage`/`insertTable` (Zeile 66–86),
   aber ohne manuelle Selektionskorrektur nötig (siehe Abschnitt 0, Zeile zu `replaceSelectionWith`):
   ```ts
   export function insertFootnote(): Command {
     return (state, dispatch) => {
       const { footnote_reference, footnote_item, footnotes_area, paragraph } = wordSchema.nodes
       if (!dispatch) return true

       const id = nextFootnoteId(state.doc)
       const refNode = footnote_reference.create({ id })
       const tr = state.tr.replaceSelectionWith(refNode)
       // Inline-Atom: replaceSelectionWith lässt bereits einen kollabierten Cursor direkt
       // dahinter zurück (verifiziert, siehe Abschnitt 0) — keine weitere setSelection nötig.

       const newItem = footnote_item.create({ id }, paragraph.createAndFill()!)
       const last = tr.doc.lastChild
       if (last && last.type === footnotes_area) {
         const areaStart = tr.doc.content.size - last.nodeSize
         tr.insert(areaStart + last.nodeSize - 1, newItem) // append as last child of the existing area
       } else {
         tr.insert(tr.doc.content.size, footnotes_area.create(null, [newItem]))
       }

       dispatch(tr.scrollIntoView())
       return true
     }
   }
   ```
   Referenzmarke **und** leerer Fußnotentext-Eintrag entstehen auf **derselben** Transaktion → ein
   einziger Undo-Schritt (Anforderung 2.10), ohne Zutun von `footnoteSyncPlugin`.
4. **Neu:** `deleteFootnoteAdjacent(dir: 1 | -1): Command` — deckt Anforderung 2.4 („ein einzelnes
   Entf/Backspace … entfernt die komplette Referenzmarke samt Fußnotentext in einem Schritt“) sowie den
   Fall ab, dass die Referenzmarke bereits als `NodeSelection` selektiert ist (z. B. nach einem Klick):
   ```ts
   export function deleteFootnoteAdjacent(dir: 1 | -1): Command {
     return (state, dispatch) => {
       const { selection } = state
       const footnoteRefType = wordSchema.nodes.footnote_reference
       let from: number, to: number

       if (selection instanceof NodeSelection && selection.node.type === footnoteRefType) {
         from = selection.from
         to = selection.to
       } else if (selection.empty) {
         const { $from } = selection
         const target = dir === -1 ? $from.nodeBefore : $from.nodeAfter
         if (!target || target.type !== footnoteRefType) return false
         from = dir === -1 ? $from.pos - target.nodeSize : $from.pos
         to = from + target.nodeSize
       } else {
         return false
       }
       if (!dispatch) return true
       dispatch(state.tr.delete(from, to))
       // Das zugehörige footnote_item wird NICHT hier direkt entfernt, sondern von
       // createFootnoteSyncPlugin()s appendTransaction-Hook im SELBEN Undo-Schritt ergänzt
       // (siehe Abschnitt 0, "appendedTransaction"-Meta) — vermeidet doppelte Lösch-Logik.
       return true
     }
   }
   ```
   Die generische Absatz-/Ganzdokument-Löschung (Grenzfall 3.4, Dreifachklick+Entf, Alles-auswählen+Entf)
   läuft **nicht** über diesen Command (diese Selektionen sind weder eine leere Selektion noch eine
   `NodeSelection` auf genau der Referenzmarke), sondern über `baseKeymap`s generische
   `deleteSelection` — die anschließende Aufräumarbeit übernimmt in **diesem** Fall
   `createFootnoteSyncPlugin` (Abschnitt 2.1), ebenfalls im selben Undo-Schritt dank
   `appendedTransaction`-Meta.
5. Export beider neuer Funktionen ergänzen.

---

## 5. Geänderte Dateien — Editor-Verdrahtung

### 5.1 `src/formats/shared/editor/WordEditor.tsx`
1. Importe ergänzen: `deleteFootnoteAdjacent` aus `./commands`; `createFootnoteSyncPlugin` aus
   `./footnoteSync`; `createFootnoteDisplayPlugin` aus `./footnoteDisplay`.
2. Im ersten `keymap({...})`-Block (Zeilen 71–79) zwei Einträge ergänzen — **vor** `keymap(baseKeymap)`
   (Zeile 80), damit sie dessen generisches, „ein Druck selektiert den Atom, ein zweiter löscht ihn“-
   Verhalten für Backspace/Delete gezielt für `footnote_reference` überschreiben:
   ```ts
   keymap({
     'Mod-z': undo,
     'Mod-y': redo,
     'Mod-Shift-z': redo,
     Enter: splitListItem(wordSchema.nodes.list_item),
     'Mod-b': toggleMark(wordSchema.marks.strong),
     'Mod-i': toggleMark(wordSchema.marks.em),
     'Mod-u': toggleMark(wordSchema.marks.underline),
     Backspace: deleteFootnoteAdjacent(-1),
     Delete: deleteFootnoteAdjacent(1),
   }),
   ```
3. Plugin-Liste (Zeilen 81–85) um zwei Einträge ergänzen, **nach** `createPaginationPlugin()`:
   ```ts
   columnResizing(),
   tableEditing(),
   dropCursor(),
   gapCursor(),
   createPaginationPlugin(),
   createFootnoteSyncPlugin(),
   createFootnoteDisplayPlugin(),
   ```
   Reihenfolge unkritisch (kein Dekorations-/Keymap-Konflikt mit den bestehenden Plugins), aber nach
   `createPaginationPlugin()` platziert, weil beide neuen Plugins konzeptionell in dieselbe Kategorie
   „Zusatzverhalten am bestehenden Dokument“ fallen.

### 5.2 `src/formats/shared/editor/Toolbar.tsx`
1. Import ergänzen: `insertFootnote` aus `./commands`.
2. Neuer Button, direkt nach dem Bild-Button (Zeilen 241–244), als letztes Element vor dem schließenden
   `</div>` (Zeile 245):
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
   Reines `onMouseDown` + `preventDefault()`-Muster wie jeder andere bestehende Toolbar-Button (kein
   Dialog, kein Promise-Zwischenschritt) — **keine** strukturelle Doppelauslösungsgefahr durch schnelles
   Doppelklicken (Grenzfall 3.16): Ein echter, zweifacher physischer Klick löst legitim **zwei** separate
   `insertFootnote()`-Aufrufe aus (= zwei Fußnoten, gewolltes Verhalten), nicht ein einzelner Klick zwei
   Aufrufe (das wäre der eigentlich zu vermeidende Bug) — durch einen dedizierten E2E-Test
   nachzuweisen (Abschnitt 10.2, Testfall „Doppelklick erzeugt genau zwei Fußnoten, nicht drei“).

---

## 6. CSS

### 6.1 `src/index.css`
Neue Regeln, nach der letzten bestehenden Regel (`.page-break-spacer`, Zeile 69–71) ergänzt:
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
Bewusst als einfache, feste Farben (kein Dark-Mode-Media-Query) — konsistent mit dem Rest von
`index.css`, das die Editor-Oberfläche durchgehend als „weißes Papier“ unabhängig vom App-Farbschema
gestaltet (`.ProseMirror { color: #111827; }`, Zeile 26, ebenfalls ohne Dark-Mode-Variante).

---

## 7. DOCX-Export (`src/formats/docx/`)

### 7.1 `src/formats/docx/relationships.ts`
`RELATIONSHIP_TYPES` (Zeile 34–42) um einen Eintrag ergänzen:
```ts
footnotes: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes',
```

### 7.2 `src/formats/docx/styleDefs.ts`
Neue Konstanten und eine neue Funktion, sowie **Signaturänderung** von `headingStylesXml()` (minimal-invasiv,
ein optionaler Parameter):
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
`headingStylesXml()` (Zeile 9–30) bekommt einen optionalen Parameter, dessen Inhalt vor dem schließenden
`</w:styles>` eingefügt wird:
```ts
export function headingStylesXml(extraStylesXml = ''): string {
  const styles = /* unverändert */
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

### 7.3 `src/formats/docx/writer.ts`
1. Neue Importe: `FOOTNOTE_REFERENCE_STYLE_ID`, `FOOTNOTE_TEXT_STYLE_ID`, `footnoteStyleDefsXml` aus
   `./styleDefs`; `findFootnotesArea`, `footnoteReadingOrderIds` aus `../shared/footnotes`.
2. `inlineToRuns()` (Zeile 39–65): neuer Zweig in der `for`-Schleife (nach der `hard_break`-Behandlung,
   Zeile 58–61), erhält die aktuell laufende Nummer über einen zusätzlichen Parameter
   `xmlIdByInternalId: Map<string, number>`:
   ```ts
   function inlineToRuns(nodes: JsonNode[] | undefined, xmlIdByInternalId: Map<string, number>): string {
     // ... buffer/flush unverändert ...
     for (const node of nodes) {
       if (node.type === 'text') { /* unverändert */ }
       else if (node.type === 'hard_break') { /* unverändert */ }
       else if (node.type === 'footnote_reference') {
         flush()
         const xmlId = xmlIdByInternalId.get(String(node.attrs?.id ?? '')) ?? 0
         runs.push(
           `<w:r><w:rPr><w:rStyle w:val="${FOOTNOTE_REFERENCE_STYLE_ID}"/></w:rPr><w:footnoteReference w:id="${xmlId}"/></w:r>`,
         )
       }
     }
     flush()
     return runs.join('')
   }
   ```
   **Wichtig:** Jeder bestehende Aufrufer von `inlineToRuns` (u. a. `blockToDocx`s `paragraph`-/
   `heading`-Fälle, Zeile 104/110) muss die neue `xmlIdByInternalId`-Map durchreichen — diese Map wird
   einmal pro `writeDocx()`-Aufruf gebaut (Punkt 5 unten) und über sämtliche Aufrufe von `blockToDocx`/
   `blocksToDocx`/`tableToDocx` als zusätzlicher Parameter durchgeschleift (analog zu `images`/`rels`,
   die bereits heute durchgereicht werden).
3. `blockToDocx()` (Zeile 94–126): expliziter neuer `case 'footnotes_area': return ''` (der Bereich wird
   **nicht** als normaler Absatz im Fließtext serialisiert, sondern separat in `footnotes.xml`, siehe
   Punkt 5) — bewusst **explizit**, nicht dem bestehenden `default`-Zweig (Zeile 123–124) überlassen, um
   unmissverständlich zu machen, dass das Verschwinden aus dem Fließtext hier **gewollt** ist, nicht ein
   vergessener Fall (genau das Risiko, das die Anforderung selbst für den bisherigen `default`-Zweig
   anmahnt, Zeile 49).
4. Neue Funktion `footnoteItemToDocx()` (rendert den Inhalt eines `footnote_item` für `footnotes.xml`,
   inkl. des Word-typischen `<w:footnoteRef/>`-Laufs am Anfang des ersten Absatzes):
   ```ts
   function footnoteItemToDocx(content: JsonNode[], images: ImageCollector, rels: RelationshipRegistry, xmlIds: Map<string, number>): string {
     const [first, ...rest] = content.length ? content : [{ type: 'paragraph', attrs: { align: 'left' }, content: [] }]
     const align = (first.attrs?.align as string) ?? 'left'
     const styleTag = `<w:pStyle w:val="${FOOTNOTE_TEXT_STYLE_ID}"/>`
     const refRun = `<w:r><w:rPr><w:rStyle w:val="${FOOTNOTE_REFERENCE_STYLE_ID}"/></w:rPr><w:footnoteRef/></w:r>`
     const firstXml = `<w:p>${paragraphPropsXml(align, styleTag)}${refRun}${inlineToRuns(first.content, xmlIds)}</w:p>`
     // Nachfolgende Absätze bewusst über das bestehende blockToDocx (Normal-Stil) serialisiert — eine
     // vollständige eigene FootnoteText-Stilzuweisung für JEDEN Absatz ist eine rein kosmetische
     // Verfeinerung, siehe Abschnitt 12 (Folgearbeit), kein Datenverlust, falls unterlassen.
     const restXml = rest.map((p) => blockToDocx(p, images, rels, null, xmlIds)).join('')
     return firstXml + restXml
   }
   ```
   (`blockToDocx`s Signatur bekommt entsprechend ebenfalls den zusätzlichen `xmlIds`-Parameter, um ihn an
   `inlineToRuns` weiterzureichen — mechanische Änderung an allen Aufrufstellen.)
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
   `w:id="-1"`/`"0"` sind laut OOXML-Konvention Pflichteinträge, die Word beim Öffnen erwartet (bestätigt
   durch die reale Fixture `footnotes.docx`, siehe Abschnitt 0) — ohne sie öffnet Word die Datei zwar
   i. d. R. noch, meldet aber unter Umständen einen Reparaturhinweis.
6. `buildContentTypesXml()` (Zeile 199–220): neuer Parameter `hasFootnotes: boolean`, neue bedingte Zeile:
   ```ts
   hasFootnotes ? `<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>` : '',
   ```
7. `writeDocx()` (Zeile 222–279): vor dem Aufbau von `bodyXml`,
   ```ts
   const footnotesArea = findFootnotesArea((doc.body as unknown as { content: JsonNode[] }).content)
   const readingOrderIds = footnoteReadingOrderIds((doc.body as unknown as { content: JsonNode[] }).content)
   const xmlIds = new Map(readingOrderIds.map((id, i) => [id, i + 1])) // Entscheidung 1.3: frische fortlaufende w:id, unabhängig vom internen Format
   ```
   `bodyXml`/`headerXml`/`footerXml`-Aufrufe erhalten `xmlIds` als zusätzlichen Parameter (für Header/
   Footer i. d. R. eine leere Map, siehe Abschnitt 1.8 — defensiv, kein Absturz, falls doch eine Referenz
   dort auftaucht: `xmlIdByInternalId.get(id) ?? 0` liefert dann `w:id="0"`, was zwar semantisch falsch
   wäre, aber **nicht crasht**; da Kopf-/Fußzeilen aktuell nicht editierbar sind, ist dieser Pfad in der
   Praxis unerreichbar).

   Nach dem bestehenden `documentRels.add(RELATIONSHIP_TYPES.numbering, …)` (Zeile 246):
   ```ts
   if (footnotesArea && readingOrderIds.length > 0) {
     documentRels.add(RELATIONSHIP_TYPES.footnotes, 'footnotes.xml')
   }
   ```
   Nach `stylesXml`-Aufbau (Zeile 249):
   ```ts
   const stylesXml = headingStylesXml(footnoteStyleDefsXml())
   ```
   Nach dem `zip`-Aufbau (Zeile 257 ff.), analog zum bestehenden `if (headerXml) …`/`if (footerXml) …`-
   Muster (Zeile 265–266):
   ```ts
   if (readingOrderIds.length > 0) {
     const items = readingOrderIds.map((id) => ({
       xmlId: xmlIds.get(id)!,
       content: footnoteItemContent(footnotesArea, id), // aus ../shared/footnotes
     }))
     wordFolder.file('footnotes.xml', footnotesXml(items, images, documentRels, xmlIds))
   }
   ```
   `buildContentTypesXml(...)`-Aufruf (Zeile 258) bekommt zusätzliches Argument
   `readingOrderIds.length > 0`.

### 7.4 `src/formats/docx/reader.ts`
1. `RunLike`-Interface (Zeile 116–122) um einen Fall erweitert: `kind: 'text' | 'break' | 'image' |
   'footnote'`, neues optionales Feld `footnoteId?: string`.
2. `decodeParagraphRuns()` (Zeile 124–143): im inneren `for`-Loop über `rEl.children` (Zeile 129–140)
   zwei neue Zweige, **vor** dem bestehenden `else if (… === 'drawing')`:
   ```ts
   } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'footnoteReference') {
     runs.push({ kind: 'footnote', footnoteId: child.getAttributeNS(OOXML_NAMESPACES.w, 'id') ?? '' })
   } else if (child.namespaceURI === OOXML_NAMESPACES.w && child.localName === 'footnoteRef') {
     // Der auto-nummerierte Marker INNERHALB von footnotes.xml selbst (anders als
     // footnoteReference im Haupttext!) — trägt keinen eigenen Text, wird beim Einlesen
     // von footnotes.xml (Punkt 5 unten) bewusst übersprungen, damit die von uns selbst
     // berechnete Nummer (Abschnitt 1.4) nicht mit der im Quelldokument eingefrorenen
     // Zahl doppelt im Fußnotentext auftaucht.
     continue
   }
   ```
   (Hinweis zur zweiten Ergänzung: `continue` innerhalb eines `for…of` über `Array.from(rEl.children)` ist
   syntaktisch korrekt und überspringt nur diesen einen Kindknoten, ohne den restlichen Lauf zu
   verwerfen — falls derselbe Lauf zusätzlich noch echten Text enthält, wie in der Fixture
   `footnotes.docx` nicht der Fall, aber strukturell möglich, bleibt dieser erhalten.)
3. `runsToInline()` (Zeile 185–190): `kind === 'image'` bleibt weiterhin gefiltert, `kind === 'footnote'`
   wird **neu** abgebildet:
   ```ts
   function runsToInline(runs: RunLike[]): JsonNode[] {
     return runs
       .filter((r) => r.kind !== 'image')
       .map((r) => {
         if (r.kind === 'break') return { type: 'hard_break' }
         if (r.kind === 'footnote') return { type: 'footnote_reference', attrs: { id: r.footnoteId ?? '' } }
         return { type: 'text', text: r.text ?? '', marks: r.marks }
       })
       .filter((n) => n.type !== 'text' || (n as { text?: string }).text)
   }
   ```
4. Neue Funktion `parseFootnotesXml()`, parallel zu `parseStylesXml`/`parseNumberingXml` (Zeile 52–97):
   ```ts
   function parseFootnotesXml(footnotesDoc: Document | null, headingInfo: HeadingInfo, imageRels: Map<string, string>): Map<string, JsonNode[]> {
     const byId = new Map<string, JsonNode[]>()
     if (!footnotesDoc) return byId
     for (const el of Array.from(footnotesDoc.getElementsByTagNameNS(OOXML_NAMESPACES.w, 'footnote'))) {
       const id = el.getAttributeNS(OOXML_NAMESPACES.w, 'id')
       const type = el.getAttributeNS(OOXML_NAMESPACES.w, 'type')
       if (!id || type === 'separator' || type === 'continuationSeparator') continue // Boilerplate-Einträge überspringen
       const blocks = childElements(el, OOXML_NAMESPACES.w, 'p').flatMap((p) => paragraphToBlocks(p, headingInfo, imageRels))
       byId.set(id, blocks.length ? blocks : [{ type: 'paragraph', attrs: { align: 'left' }, content: [] }])
     }
     return byId
   }
   ```
5. `readDocx()` (Zeile 330–390): nach dem Einlesen von `numberingXmlText` (Zeile 341–342):
   ```ts
   const footnotesXmlText = await zip.file('word/footnotes.xml')?.async('text')
   const footnotesById = parseFootnotesXml(footnotesXmlText ? parseXmlDocument(footnotesXmlText) : null, headingInfo, documentRels)
   ```
   Nach dem Aufbau von `bodyBlocks` (Zeile 346): die tatsächlich im Text referenzierten IDs in
   Lesereihenfolge ermitteln (Wiederverwendung von `footnoteReadingOrderIds` aus
   `../shared/footnotes` — hier auf die bereits als JSON vorliegenden `bodyBlocks` angewendet) und daraus
   den `footnotes_area`-Knoten bauen:
   ```ts
   const referencedIds = footnoteReadingOrderIds(bodyBlocks)
   if (referencedIds.length > 0) {
     const items = referencedIds.map((id) => ({
       type: 'footnote_item',
       attrs: { id },
       // Grenzfall 3.14: Referenz vorhanden, aber footnotes.xml hat keinen passenden Eintrag
       // (defekte/inkonsistente Fremddatei) -> Platzhaltertext statt Absturz/leerem Knoten.
       content: footnotesById.get(id) ?? [{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: FOOTNOTE_PLACEHOLDER_TEXT }] }],
     }))
     bodyBlocks.push({ type: 'footnotes_area', content: items })
   }
   ```
   (`FOOTNOTE_PLACEHOLDER_TEXT` aus `../shared/editor/footnoteSync` importiert — derselbe Wortlaut wie im
   Live-Editor-Plugin, damit ein importiertes und ein interaktiv entstandenes Platzhalter-Fußnote optisch
   nicht unterscheidbar sind.)
6. **Empfohlene Endnoten-Zusatzabsicherung** (Entscheidung 1.9, kein Blocker): analog `word/footnotes.xml`
   optional `word/endnotes.xml` laden, `w:endnoteReference`-Vorkommen in `decodeParagraphRuns` erkennen
   und als reinen Text-Run `[Endnote: <extrahierter Text>]` statt eines Fußnotenknotens einfügen — **kein**
   eigener Schema-Knotentyp, rein textuelle Klartext-Einbettung, damit Endnoten und Fußnoten strukturell
   nicht verwechselt werden können (Grenzfall 3.18).

---

## 8. ODT-Export (`src/formats/odt/`)

### 8.1 `src/formats/odt/styleRegistry.ts`
Neue Konstante + Funktion, analog zu `headingStyleDefs()` (Zeile 84–93):
```ts
export const FOOTNOTE_PARAGRAPH_STYLE_NAME = 'Footnote'

export function footnoteParagraphStyleDef(): string {
  return (
    `<style:style style:name="${FOOTNOTE_PARAGRAPH_STYLE_NAME}" style:family="paragraph" style:parent-style-name="Standard">` +
    `<style:text-properties fo:font-size="10pt"/></style:style>`
  )
}

export function notesConfigurationXml(): string {
  // Attribut-Reihenfolge/-Namen 1:1 aus der realen Fixture tests/fixtures/external/odt/footnote.odt
  // (styles.xml) übernommen, siehe Abschnitt 0.
  return (
    `<text:notes-configuration text:note-class="footnote" style:num-format="1" ` +
    `text:start-value="0" text:footnotes-position="page"/>`
  )
}
```

### 8.2 `src/formats/odt/writer.ts`
1. Neue Importe: `FOOTNOTE_PARAGRAPH_STYLE_NAME`, `notesConfigurationXml` aus `./styleRegistry`;
   `findFootnotesArea`, `footnoteReadingOrderIds`, `footnoteItemContent` aus `../shared/footnotes`.
2. `inlineToOdt()` (Zeile 46–59) bekommt einen zusätzlichen Parameter `footnotes: { area: JsonNode | null; numbers: Map<string, number> }`
   und einen neuen Fall:
   ```ts
   function inlineToOdt(nodes: JsonNode[] | undefined, styles: TextStyleRegistry, images: ImageCollector, footnotes: FootnoteCtx): string {
     if (!nodes) return ''
     return nodes
       .map((node) => {
         if (node.type === 'hard_break') return '<text:line-break/>'
         if (node.type === 'footnote_reference') {
           const id = String(node.attrs?.id ?? '')
           const xmlId = `ftn${id.replace(/^ftn/, '')}` // Entscheidung 1.3: text:id darf nicht mit einer Ziffer beginnen
           const number = footnotes.numbers.get(id) ?? ''
           const bodyContent = footnoteItemContent(footnotes.area, id)
           const bodyXml = blocksToOdt(bodyContent, styles, images, footnotes) // rekursiv — erlaubt mehrere Absätze/Formate, siehe Anforderung 2.5
           return (
             `<text:note text:id="${xmlId}" text:note-class="footnote">` +
             `<text:note-citation>${number}</text:note-citation>` +
             `<text:note-body>${bodyXml}</text:note-body>` +
             `</text:note>`
           )
         }
         if (node.type === 'text') { /* unverändert */ }
         return ''
       })
       .join('')
   }
   ```
   `blockToOdt`/`blocksToOdt` (Zeile 61–127) bekommen denselben zusätzlichen `footnotes`-Parameter,
   durchgereicht an alle rekursiven Aufrufe (Tabellenzellen, Listeneinträge) — mechanische Änderung.
3. `blockToOdt()`: expliziter neuer `case 'footnotes_area': return ''` (der Bereich wird **nicht** als
   eigener Absatz serialisiert — jede einzelne Fußnote wird stattdessen **inline an ihrer Zitatstelle**
   über den `footnote_reference`-Fall in `inlineToOdt` ausgegeben; das ist der grundlegende strukturelle
   Unterschied zu DOCX, das einen separaten Part referenziert — beide Wege liefern aus **demselben**
   internen Schema-Modell ein für das jeweilige Format natives Ergebnis).
4. `buildContentXml()` (Zeile 129–137): unverändert in der Struktur, aber `bodyXml` wird nun mit dem
   `footnotes`-Kontext berechnet (siehe Punkt 5).
5. `buildStylesXml()` (Zeile 139–156): `notesConfigurationXml()` als weiteres Kind von
   `<office:styles>` ergänzen (Zeile 143):
   ```ts
   `<office:styles><style:style style:name="Standard" style:family="paragraph"/>${notesConfigurationXml()}</office:styles>`
   ```
6. `writeOdt()` (Zeile 183–210): vor `blocksToOdt(...)` für den Hauptinhalt:
   ```ts
   const bodyContentArr = (doc.body as unknown as JsonNode).content
   const footnotesArea = findFootnotesArea(bodyContentArr)
   const readingOrderIds = footnoteReadingOrderIds(bodyContentArr)
   const footnoteNumbers = new Map(readingOrderIds.map((id, i) => [id, i + 1]))
   const footnoteCtx = { area: footnotesArea, numbers: footnoteNumbers }
   const bodyXml = blocksToOdt(bodyContentArr, bodyStyles, images, footnoteCtx)
   ```
   Für `headerXml`/`footerXml` (Zeile 191–192) wird ein **leerer** Kontext `{ area: null, numbers: new Map() }`
   übergeben (Entscheidung 1.8 — defensiv, kein Absturz, falls dort doch einmal eine Referenz landet: die
   ODT-Ausgabe hätte dann eine gültige, aber leere `<text:note-body>`).
7. `footnoteParagraphStyleDef()` in `buildContentXml()`s `office:automatic-styles`-Konkatenation (Zeile
   133) ergänzen, damit Fußnotentext-Absätze optional `text:style-name="Footnote"` referenzieren können
   (kleine, rein kosmetische Ergänzung — der generierte `bodyXml` innerhalb von `<text:note-body>`
   verwendet weiterhin denselben `blockToOdt`-Pfad wie normale Absätze, kann also optional die neue Style
   referenzieren, ist aber nicht zwingend Voraussetzung für Korrektheit).

### 8.3 `src/formats/odt/reader.ts`
1. `decodeInline()`s `walk()`-Funktion (Zeile 96–116) bekommt einen neuen Zweig, sowie einen zusätzlichen
   Parameter `footnotesOut: Array<{ id: string; content: JsonNode[] }>` (mutierter Sammel-Array, analog
   zum bereits bestehenden Closure-Zugriff auf `result`):
   ```ts
   } else if (el.namespaceURI === ODF_NAMESPACES.text && el.localName === 'note') {
     const noteClass = el.getAttributeNS(ODF_NAMESPACES.text, 'note-class')
     const id = el.getAttributeNS(ODF_NAMESPACES.text, 'id') ?? `auto-${footnotesOut.length}`
     if (noteClass === 'footnote') {
       const noteBody = firstChildNS(el, ODF_NAMESPACES.text, 'note-body')
       const content = noteBody
         ? Array.from(noteBody.children).flatMap((c) => elementToBlocks(c, styles))
         : [{ type: 'paragraph', attrs: { align: 'left' }, content: [{ type: 'text', text: FOOTNOTE_PLACEHOLDER_TEXT }] }] // Grenzfall 3.14
       footnotesOut.push({ id, content })
       result.push({ type: 'footnote_reference', attrs: { id } })
     }
     // noteClass === 'endnote' (oder jeder andere Wert): bewusst NICHT als Fußnote interpretiert
     // (Grenzfall 3.18) — empfohlene Zusatzabsicherung analog Abschnitt 7.4 Punkt 6: Klartext-
     // Fallback `[Endnote: …]` statt ersatzlosem Verwerfen, kein Blocker für diese Anforderung.
   }
   ```
   `decodeInline()`, `paragraphToBlocks()`, `elementToBlocks()`, `readOfficeTextChildren()` (Zeile 79–237)
   müssen `footnotesOut` als zusätzlichen Parameter durchreichen (mechanische Änderung entlang der
   bestehenden Aufrufkette, analog zu `styles`/`zip`, die bereits heute durchgereicht werden).
2. `readOdt()` (Zeile 239–285): nach dem Aufbau von `bodyBlocks` (Zeile 248):
   ```ts
   if (footnotesOut.length > 0) {
     bodyBlocks.push({
       type: 'footnotes_area',
       content: footnotesOut.map(({ id, content }) => ({ type: 'footnote_item', attrs: { id }, content })),
     })
   }
   ```
   Reihenfolge von `footnotesOut` entspricht bereits der Lesereihenfolge (die Sammlung erfolgt während
   eines einzigen linken-nach-rechts-Durchlaufs durch `decodeInline`/`elementToBlocks`) — anders als beim
   DOCX-Reader ist hier **keine** zusätzliche Sortierung nach `footnoteReadingOrderIds` nötig, da ODF
   Fußnoten inline an ihrer Zitatstelle im XML selbst trägt (kein indirekter Verweis auf einen separaten
   Part wie bei DOCX).

---

## 9. Zusammenfassung: Auflösung aller Grenzfälle aus der Anforderung (Abschnitt 3)

| # | Grenzfall | Auflösung in diesem Plan |
|---|---|---|
| 1 | Einfügen bei aktiver Selektion | `replaceSelectionWith` ersetzt die Selektion durch die Referenzmarke — Standardverhalten, identisch zu `insertImage`/`insertTable`. |
| 2 | Zwei Fußnoten im selben Absatz | Jede erhält eine eigene `id`; Nummerierung/Reorder-Plugin arbeitet unabhängig von Absatzgrenzen (Abschnitt 2.1/2.2). |
| 3 | Fußnote am Dokumentanfang/-ende | Keine Sonderbehandlung nötig — `footnote_reference` ist ein normaler Inline-Knoten. |
| 4 | Ganzen Absatz mit Referenzmarke löschen | `createFootnoteSyncPlugin` entfernt den verwaisten Eintrag via `appendTransaction`, im selben Undo-Schritt (Abschnitt 2.1, Abschnitt 0). |
| 5 | Ausschneiden + Einfügen an anderer Stelle | `id` bleibt erhalten, `uiEvent==='cut'`-Gnadenzeitraum verhindert vorzeitiges Löschen (Entscheidung 1.6). |
| 6 | Kopieren als Duplikat | Bewusste Vereinfachung: geteilter Fußnotentext statt unabhängiger Kopie (Entscheidung 1.5), dokumentiert. |
| 7 | Undo direkt nach Einfügen, dann weiter tippen | Ein Undo-Schritt entfernt Referenz+Eintrag vollständig (atomare Transaktion, Abschnitt 4.1 Punkt 3); nachfolgendes Tippen operiert auf der wiederhergestellten, unveränderten Cursor-Position. |
| 8 | 100+ Fußnoten, Performance | `createFootnoteSyncPlugin` bricht per Gleichheitsvergleich früh ab, wenn nichts zu tun ist (Abschnitt 2.1); `createFootnoteDisplayPlugin` mutiert nur `textContent`, kein Re-Parsing. |
| 9 | Fußnote in Tabellenzelle | Funktioniert ohne Zusatzcode (Entscheidung 1.7), real durch `table_footnotes.docx`-Fixture verifizierbar. |
| 10 | Fußnote in Listenelement | Funktioniert ohne Zusatzcode (Entscheidung 1.7). |
| 11 | Tabelle/Bild im Fußnotentext | Schema erlaubt es bereits (`footnote_item.content = 'block+'`), kein Absturz. |
| 12 | Leerer Fußnotentext | `paragraph.createAndFill()!` erzeugt einen gültigen leeren Absatz; DOCX-/ODT-Export erzeugen dafür ein valides, leeres `<w:footnote>`/`<text:note-body>`. |
| 13 | Mehrere Absätze mit `hard_break` | `footnote_item.content = 'block+'` erlaubt mehrere Absätze; `hard_break` wird durch bestehende `inlineToRuns`/`inlineToOdt`-Fälle unverändert mitverarbeitet. |
| 14 | Defekte/inkonsistente Fremddatei-Referenz | Platzhaltertext `[fehlender Fußnotentext]` statt Absturz (Abschnitt 2.1, Abschnitt 7.4 Punkt 5, Abschnitt 8.3 Punkt 1). |
| 15 | Kollidierende IDs | Deterministischer Zähler `nextFootnoteId()`, kein `Math.random()` (Abschnitt 4.1 Punkt 2, Entscheidung 1.3). |
| 16 | Mehrfaches schnelles Klicken | Kein Dialog/Promise-Zwischenschritt, jeder Klick = ein legitimer, unabhängiger Aufruf (Abschnitt 5.2). |
| 17 | Fußnote in Kopf-/Fußzeile | Kein aktiver Block nötig (Kopf-/Fußzeile nicht editierbar), defensiver Fallback verhindert Absturz (Entscheidung 1.8). |
| 18 | Datei mit Fußnoten UND Endnoten | Strukturelle Trennung über Element-/Attributart (`w:footnoteReference` vs. `w:endnoteReference`; `text:note-class="footnote"` vs. `"endnote"`), real durch `footnote.odt`-Fixture verifizierbar (Entscheidung 1.9). |

---

## 10. Tests

### 10.1 Unit-/Komponententests

| Datei | Änderung |
|---|---|
| `src/formats/shared/editor/__tests__/footnotes.test.ts` (**neu**) | `insertFootnote()`: fügt Referenz + leeren Eintrag in einer Transaktion ein, Cursor landet direkt hinter der Referenz (`state.selection.empty === true`, Position exakt geprüft); zweimaliges Aufrufen erzeugt zwei verschiedene IDs. `nextFootnoteId()`: liefert `"new1"` bei leerem Dokument, überspringt bereits vorhandene `newN`-IDs deterministisch (kein Zufall — Test ruft die Funktion zweimal mit demselben Eingabedokument auf und erwartet **dasselbe** Ergebnis). `deleteFootnoteAdjacent()`: Backspace direkt hinter der Referenz entfernt sie in einem Schritt; Delete direkt davor ebenso; `NodeSelection` auf der Referenz + Delete entfernt sie ebenso; Aufruf ohne angrenzende Referenz liefert `false`. `createFootnoteSyncPlugin()`: Löschen des Absatzes mit der Referenz entfernt den zugehörigen `footnote_item` in derselben Transaktionsgruppe (`state.doc.lastChild` nach dem Löschen entweder `undefined`/kein `footnotes_area` mehr, oder ohne den betroffenen Eintrag); zwei Referenzen mit vertauschter Text-Reihenfolge werden nach einer Transaktion, die die erste vor die zweite verschiebt, in `footnotes_area` umsortiert; ein `tr.setMeta('uiEvent','cut')`-markierter Löschvorgang entfernt den Eintrag **nicht** sofort. |
| `src/formats/shared/schema.test.ts` (falls eine allgemeine Schema-Testdatei existiert, sonst neuer Abschnitt in `footnotes.test.ts`) | `wordSchema.nodes.doc` akzeptiert ein Dokument mit `footnotes_area` als letztem Kind und eines ganz ohne; `footnote_reference` ist `atom`/`selectable`/`inline`. |
| `src/formats/docx/__tests__/roundtrip.test.ts` | Neuer `describe('DOCX round trip: footnotes', …)`-Block: einzelne Fußnote mit Text → `word/footnotes.xml` enthält passenden `<w:footnote w:id="1">`-Eintrag, `document.xml` enthält `<w:footnoteReference w:id="1"/>`; zwei Fußnoten in Text-Reihenfolge → `xmlId`s `1`/`2` in derselben Reihenfolge; Fußnotentext mit Kursiv-Formatierung bleibt erhalten; leerer Fußnotentext exportiert ein valides, leeres `<w:footnote>`; Fußnote in einer Tabellenzelle (synthetisches JSON, nicht nur die externe Fixture) bleibt erhalten. |
| `src/formats/odt/__tests__/roundtrip.test.ts` | Analog: `<text:note text:note-class="footnote">` mit korrektem `<text:note-citation>`/`<text:note-body>`; zwei Fußnoten behalten Reihenfolge; Formatierung bleibt erhalten; Cross-Format DOCX→ODT (Anforderung 4.1 Punkt 6) und ODT→DOCX (4.2 Punkt 6) als jeweils ein Test: `writeOdt(await readDocx(...))`-artige Verkettung. |
| `src/formats/docx/__tests__/external-fixtures.test.ts` | Neuer, gezielter (nicht Teil der generischen Schleife) Test: `footnotes.docx` importieren → genau eine Fußnote mit Text „snoska“ im `footnotes_area`; `table_footnotes.docx` importieren → Fußnote wird gefunden, unabhängig davon, dass sie in einer Tabellenzelle sitzt (Grenzfall 3.9 real belegt); beide Dateien reexportieren und reimportieren → Fußnotentext bleibt inhaltlich identisch (Testfall 12 der Anforderung). |
| `src/formats/odt/__tests__/external-fixtures.test.ts` | Neuer, gezielter Test: `footnote.odt` importieren → genau **eine** Fußnote (nicht zwei — die Endnote darf nicht mitgezählt werden, Grenzfall 3.18 real belegt) mit Text „A footnote?“; reexportieren und reimportieren → Fußnotentext bleibt erhalten. |

### 10.2 E2E-Tests (Playwright, `tests/e2e/`)

**Neue Datei `tests/e2e/footnote-insert.spec.ts`** — deckt Anforderung Abschnitt 5, Testfälle 1–8, 14, 16:

| Testfall (Abschnitt 5 der Anforderung) | Testname (Vorschlag) |
|---|---|
| 1 | „clicking ‚Fußnote einfügen‘ shows a superscript ‚1‘ and an editable footnote area“ |
| 2 | „typing into the footnote area puts the text there, not in the main document“ |
| 3 | „inserting a second footnote before the first renumbers both correctly“ |
| 4 | „deleting a footnote reference removes it and its text, renumbering the rest“ |
| 5 | „Ctrl+Z right after inserting removes both the reference and the footnote area“ |
| 6 | „Ctrl+Shift+Z restores the (empty) footnote after an undo“ |
| 7 | „bold applied inside the footnote area renders correctly“ |
| 8 | „arrow-key navigation skips over the reference as a single atomic step“ |
| 14 (Grenzfall 3.8) | „inserting 50 footnotes keeps the UI responsive and numbering correct“ |
| 16 (Grenzfall 3.16) | „two fast real clicks insert exactly two footnotes, not one and not three“ |
| — (2.9) | „the button's accessible name is ‚Fußnote einfügen‘, distinct from any footer-editing control“ |

**Neue Datei `tests/e2e/footnote-roundtrip.spec.ts`** — deckt Abschnitt 4 (Rundreise) und Abschnitt 5,
Testfälle 9–13, 15, im selben Stil wie `tests/e2e/docx.spec.ts`
(`page.waitForEvent('download')`, `JSZip.loadAsync`, direkte XML-String-Prüfung als „unabhängiger
Parser“):
- DOCX: Fußnote „Testfußnote eins“ einfügen, exportieren → `word/document.xml` enthält genau ein
  `<w:footnoteReference w:id="…"/>`, `word/footnotes.xml` enthält den passenden `<w:footnote w:id="…">`
  mit dem eingegebenen Text (4.1.1); reimportieren → identische Referenzmarke mit Nummer „1“ (4.1.2); zwei
  Fußnoten (4.1.3); **echte** Fremddatei `footnotes.docx` per `setInputFiles` hochladen → unverändert
  exportieren → reimportieren → Text „snoska“ weiterhin vorhanden (4.1.4, entspricht Testfall 12 über
  echte Bedienung statt nur Unit-Ebene); Formatierung (4.1.5); Cross-Format ODT→DOCX (4.1.6).
- ODT: analog (4.2.1–4.2.6), inklusive Hochladen der echten Fixture `footnote.odt` und Prüfung, dass nach
  Reexport **weiterhin genau eine** Fußnote (nicht die miteingelesene Endnote) vorhanden ist.
- Cross-Format doppelt (4.3): DOCX→Editor→ODT-Export→Reimport→DOCX-Export, Text bleibt erhalten; dieselbe
  Prüfung mit Startpunkt ODT.
- Testfall 15 (Klick auf Referenzmarke): Klick auf `sup.footnote-ref` scrollt sichtbar zum zugehörigen
  `.footnote-item` (Sichtbarkeits-/Position-Check statt reiner Funktionsaufruf, da tatsächlich umgesetzt,
  siehe Abschnitt 2.2 — **kein** „bewusst nicht umgesetzt“-Vermerk nötig).

---

## 11. Rückzumeldende Ergebnisse in `fussnote-einfuegen-req.md` (DoD-Punkte 1, 6, 7)

Nach Umsetzung sind folgende, in der Anforderung als offen markierte Punkte mit dem **Ergebnis** dieses
Plans in der Anforderungsdatei nachzutragen (DoD verlangt „hier nachgetragen“):
- Abschnitt 2.3: Entscheidung (b) — gesammelter Bereich am Dokumentende, siehe Entscheidung 1.2 oben.
- Abschnitt 1, Zeile 3–4: Kein neues `WordDocumentContent`-Feld; `footnotes_area`-Knoten im `body`-Dokument
  selbst, siehe Entscheidung 1.1.
- Grenzfall 3.6: geteilter Fußnotentext bei Kopieren (nicht Words unabhängige Kopie), siehe Entscheidung 1.5.
- Grenzfall 3.9: funktioniert, real durch `table_footnotes.docx` verifiziert, siehe Entscheidung 1.7.

---

## 12. Explizit nicht Teil dieser Umsetzung / Folgearbeit

- Vollständige Endnoten-Unterstützung (`endnote-einfuegen`) — nur der minimale Klartext-Fallback aus
  Entscheidung 1.9 wird miterledigt.
- Words Verhalten bei Grenzfall 3.6 (unabhängige Kopie statt geteilter Text) — als Nice-to-have für eine
  spätere Iteration vermerkt; würde einen `transformPasted`-Eingriff erfordern, der sorgfältig gegen
  Grenzfall 3.5 abgegrenzt werden müsste (siehe Entscheidung 1.5/1.6).
- `FootnoteText`-Absatzformat auf **jeden** Absatz eines mehrabsätzigen Fußnotentexts in DOCX anwenden
  (aktuell nur auf den ersten Absatz, siehe Abschnitt 7.3 Punkt 4) — rein kosmetisch, kein Datenverlust.
- Die vorbestehende, nicht durch diese Anforderung verursachte Emoji-Icon-Verwendung im übrigen
  Toolbar-Code (⊞, 🖼, 🖍, ⌫ — Abschnitt 20.1 der Feature-Spec) — außerhalb des Geltungsbereichs dieser
  Datei, hier nur zur Vollständigkeit erwähnt, da Entscheidung 1.10 bewusst **nicht** demselben Muster
  folgt.
- Pro-Seite-Fußnotenbereiche (Option (a) aus Anforderung 2.3) — nur relevant, falls ein künftiges Feature
  echte Pro-Seite-Container in `pagination.ts` einführt; dieser Plan müsste dann überarbeitet werden.
