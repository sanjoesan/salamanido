# Anforderungen: „Manueller Zeilenumbruch (Umschalt+Enter)"

Status: Laut Backlog (`specs/FEATURE-BACKLOG.md`, Slug `zeilenumbruch-manuell`,
Priorität 1, Abschnitt „Sonderelemente/Sonderzeichen") als **„teilweise"** markiert
(„Erzeugt eine neue Zeile innerhalb desselben Absatzes statt eines neuen Absatzes.").
Diese Einstufung gilt explizit als **nicht vertrauenswürdig** und muss vollständig
verifiziert werden — konkret bedeutet das: klären, *warum* der Status nur „teilweise"
und nicht „vorhanden" ist (welcher Teil fehlt, welcher funktioniert nur zufällig/
ungetestet), und anschließend die vollständige Umsetzung gegen die unten stehenden
Anforderungen abnehmen.

Geltungsbereich: ausschließlich die Funktion „Zeilenumbruch innerhalb desselben
Absatzes per Umschalt+Enter erzeugen" (intern `hard_break`) im gemeinsamen
DOCX/ODT-Editor (`src/formats/shared/editor/`, `src/formats/shared/schema.ts`)
sowie deren Serialisierung/Deserialisierung in `src/formats/docx/` und
`src/formats/odt/`. Explizit **kein** Bestandteil dieser Datei: der manuelle
**Seitenumbruch** (Strg+Enter, siehe `specs/seitenumbruch-req.md` — eigenständiges,
laut Befund dort komplett fehlendes Feature) und das allgemeine Einfügen-Verhalten
aus der Zwischenablage (siehe `specs/einfuegen-req.md`), auf dessen Abschnitt 3.3
hier aber inhaltlich Bezug genommen wird, weil beide Features denselben internen
`hard_break`-Node und dieselben Reader/Writer-Pfade berühren.

Wie in `FEATURE-SPEC-DOCX-ODT.md` festgelegt: DOCX und ODT teilen sich denselben
ProseMirror-Editor. Jede Anforderung unten gilt für **beide** Formate, inklusive
Rundreise (Import/Erstellen → Umschalt+Enter → Export → Re-Import → Umbruch **und**
Inhalt bleiben erhalten, unverändert gegenüber dem Ausgangszustand bei reinem
Re-Import ohne jede Eingabe).

---

## 0. Befund aus Code-Recherche (Ausgangslage vor Verifikation)

Diese Spezifikation beruht auf tatsächlicher Durchsicht des Codes, nicht nur auf der
Backlog-Beschreibung. Festgestellt wurde:

1. **Datenmodell vorhanden.** `src/formats/shared/schema.ts` (Zeilen 35–43) definiert
   den Node-Typ `hard_break`: `group: 'inline'`, `inline: true`, `selectable: false`,
   `parseDOM: [{ tag: 'br' }]`, `toDOM` liefert `['br']`. Da `paragraph` und `heading`
   beide `content: 'inline*'` deklarieren (Zeilen 9–31), ist ein `hard_break`
   grundsätzlich in jedem Absatz **und** jeder Überschrift zulässig. Über
   `list_item: { content: 'paragraph block*' }` (Zeile 98–104) und die
   `tableNodes({ cellContent: 'block+' })`-Definition (Zeile 106) ist er transitiv
   auch in Listenpunkten und Tabellenzellen zulässig, da deren Inhalt letztlich wieder
   aus `paragraph`-Nodes besteht.
2. **Kein expliziter Command.** `src/formats/shared/editor/commands.ts` exportiert
   `setAlign`, `setHeading`, `toggleList`, `liftFromList`, `insertImage`,
   `insertTable`, `applyMarkColor`, `clearMarkColor` — aber **keinen**
   `insertHardBreak`-artigen Befehl. Ein `hard_break` wird an keiner Stelle im
   Quellcode aktiv per `state.tr.replaceSelectionWith(...)` o. Ä. erzeugt (Muster,
   das `insertImage`/`insertTable` bereits für andere Inline-/Block-Einfügungen
   verwenden).
3. **Kein Toolbar-Button.** `src/formats/shared/editor/Toolbar.tsx` enthält keinen
   Eintrag für „Zeilenumbruch". Es gibt weder einen sichtbaren Button noch einen
   `title`/`aria-label`, über den ein Test oder eine Nutzerin diese Funktion in der
   Oberfläche überhaupt auffinden könnte.
4. **Kein expliziter Tastatur-Shortcut.** `WordEditor.tsx` (Zeilen 71–80) registriert
   zwei `keymap()`-Plugins: das erste mit `Mod-z`, `Mod-y`, `Mod-Shift-z`,
   `Enter: splitListItem(...)`, `Mod-b`, `Mod-i`, `Mod-u`; das zweite ist
   `keymap(baseKeymap)` aus `prosemirror-commands`. **Keines von beiden enthält einen
   Eintrag für `Shift-Enter`** — auch `baseKeymap` selbst kennt laut eigener
   Dokumentation nur `Enter` (verkettete Absatz-/Listen-Logik) und `Mod-Enter`
   (`exitCode`), keinen `Shift-Enter`-Eintrag (`node_modules/prosemirror-commands/dist/index.js`,
   Zeilen 805–814).
5. **Funktioniert (falls überhaupt) nur als Nebeneffekt nativen Browser-Verhaltens.**
   Da kein registrierter `keymap()`-Handler auf `Shift-Enter` reagiert, wird das
   Tastaturereignis von ProseMirrors `handleKeyDown`-Kette **nicht** abgefangen und
   somit auch nicht per `preventDefault()` unterdrückt. Es fällt an das native
   `contenteditable`-Verhalten des Browsers durch. Moderne Browser (Chromium,
   Firefox) fügen bei Umschalt+Enter in einem `contenteditable`-Element nativ ein
   `<br>`-Element ein (`beforeinput`-Event mit `inputType: "insertLineBreak"`).
   ProseMirrors eigener `beforeinput`-Handler
   (`node_modules/prosemirror-view/dist/index.js`, Zeilen 3906–3929) behandelt aktuell
   ausschließlich einen Chrome-Android-Sonderfall für Backspace — für
   `insertLineBreak` gibt es **keine eigene Verarbeitung**. Die dadurch entstandene
   native DOM-Änderung wird stattdessen über den generischen
   `DOMObserver`/Mutation-Reconciliation-Pfad von ProseMirror interpretiert, der dabei
   zufällig auf die passende `parseDOM`-Regel `{ tag: 'br' }` des `hard_break`-Nodes
   trifft (Punkt 1). **Konsequenz:** Das beobachtbare Verhalten „Umschalt+Enter erzeugt
   eine neue Zeile im selben Absatz" ist mit hoher Wahrscheinlichkeit aktuell nur ein
   **Nebenprodukt** aus (a) nicht blockiertem nativen Browser-Verhalten und (b) einer
   zufällig treffenden `parseDOM`-Regel — nicht das Ergebnis eines bewusst
   implementierten, browserübergreifend abgesicherten Features. Das erklärt exakt den
   Backlog-Status „teilweise": es *sieht* im Idealfall so aus, als würde es
   funktionieren, ohne dass dieses Verhalten je bewusst gebaut oder getestet wurde —
   und ist damit strukturell fragil (jede künftige Änderung, die versehentlich
   `Enter` global mit `preventDefault()` abfängt oder einen dritten `keymap()`-Layer
   ergänzt, kann diesen impliziten Pfad stillschweigend brechen, ohne dass ein
   bestehender Test das bemerken würde — siehe Punkt 8).
6. **DOCX-Schreib-/Lesepfad vorhanden, aber ungenau.**
   - `src/formats/docx/writer.ts` (Zeilen 39–65, insbesondere 58–61): `hard_break` →
     `<w:r><w:br/></w:r>` (kein `w:type`-Attribut). Das entspricht exakt dem Format,
     das echtes Microsoft Word für einen per Umschalt+Enter erzeugten Zeilenumbruch
     selbst schreibt (laut OOXML-Spezifikation ist der Default-Wert von `w:type`
     ohnehin `textWrapping`, also inhaltlich identisch zu einem fehlenden Attribut).
   - `src/formats/docx/reader.ts` (Zeilen 128–133 und 185–189): **jedes** `<w:br>`-Kind
     eines Runs wird unabhängig von einem eventuell vorhandenen `w:type`-Attribut
     identisch als `{ kind: 'break' }` bzw. `hard_break` gelesen. Es gibt **keine
     Fallunterscheidung** nach `w:type="page"` oder `w:type="column"`. Für den
     Normalfall (kein `w:type` oder `w:type="textWrapping"`) ist das korrekt; für
     einen in einer Fremddatei enthaltenen manuellen **Seitenumbruch** oder
     **Spaltenumbruch** würde dieselbe Codezeile ihn fälschlich zu einem einfachen
     `hard_break` degradieren. Das ist in erster Linie das Thema von
     `seitenumbruch-req.md` (dort Abschnitt 3.5), aber relevant für **dieses**
     Feature, weil es die Bedeutung von `hard_break` beim Reimport einer echten
     Word-Datei verwässert, solange `seitenumbruch`/Spaltenumbruch nicht separat
     behandelt werden.
7. **ODT-Schreib-/Lesepfad vorhanden und sauber.**
   - `src/formats/odt/writer.ts` (Zeile 50): `hard_break` → `<text:line-break/>`.
   - `src/formats/odt/reader.ts` (Zeilen 108–109): `text:line-break` → `hard_break`,
     1:1, unabhängig vom Kontext (Absatz, Überschrift, Listenpunkt, Tabellenzelle),
     da die zugrunde liegende `walk`-Funktion generisch über beliebige Kindelemente
     rekursiert. Keine bekannte Fehlinterpretation, kein Sonderfall gefunden.
8. **Unit-Tests existieren, decken aber nicht den echten Eingabeweg ab.**
   `src/formats/docx/__tests__/roundtrip.test.ts` (Zeilen 114–125) und
   `src/formats/odt/__tests__/roundtrip.test.ts` (Zeilen 114–125) prüfen exakt denselben
   Fall („Zeile eins" + `hard_break` + „Zeile zwei"), jeweils Writer → Reader → Writer.
   Diese Tests bauen das ProseMirror-Dokument aber **direkt aus JSON** (`doc([...])`
   mit `{ type: 'hard_break' }` als literalem Objekt) — sie testen die
   Reader/Writer-Korrektheit, nicht den in Punkt 5 beschriebenen tatsächlichen
   Tastatur-Eingabeweg. Die Behauptung in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 15
   („bereits als `hard_break` vorhanden, mit Unit-Tests abgedeckt — hier nur
   E2E-Nachtest nötig") stützt sich ausschließlich auf diese JSON-Konstruktion.
9. **Kein E2E-Test.** In `tests/e2e/lifecycle.spec.ts`, `tests/e2e/odt.spec.ts`,
   `tests/e2e/docx.spec.ts` und `tests/e2e/selection-regression.spec.ts` gibt es
   keinen einzigen Treffer für „Shift+Enter", „hard_break" oder „Zeilenumbruch". Der
   tatsächliche Weg Tastendruck → natives Browser-Verhalten →
   PM-Mutation-Reconciliation → interner `hard_break`-Node → Serialisierung ist also
   **nie** im echten Browser nachgestellt worden.
10. **Kein Sonderverhalten beim Einfügen aus der Zwischenablage.** ProseMirrors
    Standard-Klartext-Parser (`node_modules/prosemirror-view/dist/index.js`,
    `parseFromClipboard`, Zeile 2853: `text.split(/(?:\r\n?|\n)+/)`) zerlegt
    eingefügten mehrzeiligen Klartext an **jedem** Zeilenumbruch in separate
    `<p>`-Absätze — niemals in `hard_break`. Ein extern kopierter, aus mehreren
    Zeilen bestehender Textblock (z. B. eine mehrzeilige Adresse) landet nach
    aktuellem Stand also nie als ein Absatz mit internen Zeilenumbrüchen, sondern
    immer als mehrere Absätze (siehe auch `einfuegen-req.md` Abschnitt 3.3, wo
    dieselbe Beobachtung bereits vermerkt ist). Das ist keine Fehlfunktion **dieses**
    Features, muss aber als bewusste Abgrenzung dokumentiert werden (Abschnitt 3.11).

**Konsequenz:** Anders als bei `seitenumbruch-req.md` (dort: Feature fehlt
nachweislich komplett, kein impliziter Ersatzmechanismus) liegt hier der
gegenteilige Sonderfall vor: ein **impliziter, nie bewusst gebauter, nie getesteter
Fallback-Mechanismus**, der im günstigen Fall (aktuelle Chromium-/Firefox-Version,
kein zukünftiger Enter-`preventDefault()` an anderer Stelle) das gewünschte
Verhalten zufällig erzeugt. Reader/Writer für Export/Import sind vorhanden und laut
Unit-Test korrekt — der Unsicherheitsfaktor liegt vollständig auf der
Eingabe-/Erzeugungsseite. Diese Datei beschreibt den Soll-Zustand, gegen den geprüft
werden muss, ob (a) der native Fallback tatsächlich in allen relevanten Browsern
zuverlässig funktioniert, oder (b) ein expliziter Command + Keymap-Eintrag ergänzt
werden muss, um die Funktion von zufälligem Browserverhalten unabhängig zu machen.

---

## 1. Menüpunkte / Bedienelemente (Soll-Zustand)

| # | Element | Auslösung | Aktueller Stand (Befund) | Soll |
|---|---|---|---|---|
| 1 | Tastenkombination Umschalt+Enter (Shift+Enter) | Tastendruck bei fokussiertem Editor | Kein expliziter `keymap()`-Eintrag; Verhalten hängt vollständig vom nicht abgefangenen nativen Browser-Fallback ab (siehe Abschnitt 0, Punkt 5) | Muss zuverlässig und **browserübergreifend** (mind. Chromium- und Firefox-basiert, siehe `playwright.config.ts`-Projekte) einen `hard_break` erzeugen — bevorzugt über einen **expliziten** Command + Keymap-Eintrag (analog zum Muster `insertImage`/`insertTable` in `commands.ts`) statt sich weiterhin ausschließlich auf den ungetesteten nativen Fallback zu verlassen |
| 2 | Toolbar-Button „Zeilenumbruch einfügen" | Klick auf Toolbar-Icon | **Fehlt komplett** in `Toolbar.tsx` | Nice-to-have, **kein Blocker** — Word/LibreOffice bieten diese Funktion in der Praxis ebenfalls fast ausschließlich über die Tastenkombination an, nicht über einen prominenten Ribbon-Button. Falls ergänzt: eindeutiges, eingebettetes SVG-Icon statt Unicode/Emoji (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1) |
| 3 | Kontextmenü-Eintrag (Rechtsklick im Editor) | Rechtsklick → Eintrag „Zeilenumbruch einfügen" | Fehlt; der Editor hat aktuell ohnehin kein eigenes Kontextmenü (identischer Befund wie in `seitenumbruch-req.md` Abschnitt 1, Zeile 5) | Nice-to-have, kein Blocker |
| 4 | Eintrag in einer künftigen Menüleiste („Einfügen → Umbruch → Zeilenumbruch", wie in echtem Word) | Klick | Nicht anwendbar — App hat aktuell nur eine Toolbar, keine Menüleiste | Falls künftig eine Menüleiste eingeführt wird, dort ebenfalls verfügbar machen; kein Blocker für die aktuelle Umsetzung |
| 5 | Löschen eines vorhandenen Zeilenumbruchs | Cursor unmittelbar davor/danach + Entf/Backspace | Ungetestet; da `hard_break` als `selectable: false` deklariert ist, kann er nicht als eigene Node-Selektion markiert werden — Löschverhalten muss sich wie bei jedem anderen Inline-Atom (vergleichbar einem einzelnen Zeichen) über Backspace/Entf ergeben | Muss zuverlässig in einem Tastendruck den Umbruch entfernen und die beiden umgebenden Textteile im selben Absatz zusammenführen — nicht den ganzen Absatz löschen und nicht Text verschlucken |
| 6 | Sichtbare Unterscheidung „Zeilenumbruch" vs. „Absatzumbruch" im editierten Text (Formatierungszeichen-Anzeige, vgl. Word „¶ ein-/ausblenden") | — (reine Darstellung) | **Fehlt komplett** — die App hat keinerlei Toggle für nicht druckbare Zeichen; ein `hard_break` rendert als einfaches `<br>` ohne jede visuelle Markierung, ist also im WYSIWYG-Editor rein optisch **nicht** von einem neuen Absatz unterscheidbar (kein sichtbarer Unterschied im Zeilenabstand, sofern kein Absatzabstand konfiguriert ist) | Nice-to-have, kein Blocker für dieses Feature — aber als **bekannte Einschränkung explizit zu dokumentieren**, da sie die Verifikation erschwert (ohne dieses Toggle lässt sich „ist das ein Zeilen- oder ein Absatzumbruch" im Editor selbst nur über Rundreise-Export/technische Inspektion zweifelsfrei beantworten, nicht durch bloßes Hinsehen) |
| 7 | Navigationsverhalten (Pfeiltasten überspringen den Umbruch als atomare Einheit; Doppelklick auf angrenzendes Wort selektiert nicht versehentlich über den Umbruch hinweg) | Pfeiltasten, Doppelklick | Ungetestet | Muss sich wie ein normales Inline-Atom verhalten — ein Pfeiltasten-Druck bewegt den Cursor um genau eine Position über den Umbruch hinweg, nicht um zwei oder null |

---

## 2. Geltende Randbedingungen aus der Haupt-Spezifikation

Diese Datei ergänzt, ersetzt aber nicht die Anforderungen aus
`FEATURE-SPEC-DOCX-ODT.md`, insbesondere:

- Abschnitt 15 („Sonderelemente"): „Zeilenumbruch (Umschalt+Enter) vs. Absatzumbruch
  (Enter) — beide müssen bei Rundreise unterscheidbar bleiben (bereits als
  `hard_break` vorhanden, mit Unit-Tests abgedeckt — hier nur E2E-Nachtest nötig)."
  Diese Einschätzung ist laut Abschnitt 0 oben **zu optimistisch**: der E2E-Nachtest
  fehlt nicht nur, sondern der zugrunde liegende Erzeugungsmechanismus selbst wurde
  nie bewusst gebaut oder abgesichert.
- Abschnitt 2 (Selection-Sync-Regressionstest): Ein per nativem
  Browser-Fallback + Mutation-Reconciliation erzeugter `hard_break` ist strukturell
  näher am „unkontrollierten DOM-Mutationspfad" als eine reguläre, per Command
  ausgelöste Transaktion — ein potenzieller **zusätzlicher Verdachtsfall** für den
  in Abschnitt 2 beschriebenen Bug, der bisher an keiner Stelle mit einer
  Umschalt+Enter-Sequenz nachgestellt wurde (siehe Grenzfall 15 unten).
- Abschnitt 18 (Import-Robustheit): Prinzip „kein stiller Datenverlust" gilt auch
  hier — insbesondere in der in Abschnitt 0, Punkt 6 beschriebenen Interaktion mit
  `w:type="page"`/`w:type="column"` in Fremddateien.
- Abschnitt 19 (Export-Robustheit & Rundreise) und Abschnitt 20.4 (kein stiller
  Fehlschlag) gelten uneingeschränkt.
- `seitenumbruch-req.md`: teilt sich Schema-Node-Nachbarschaft (`hard_break` neben
  einem künftigen `page_break`) und DOCX-Reader/Writer-Codepfad (`<w:br>`-Behandlung
  in `reader.ts`/`writer.ts`) — Änderungen an einem der beiden Features dürfen den
  jeweils anderen nicht regressieren (siehe Abschnitt 5.1 unten).
- `einfuegen-req.md` Abschnitt 3.3: legt fest, dass mehrzeiliger, extern
  eingefügter Klartext aktuell als mehrere Absätze und **nicht** als `hard_break`
  ankommt — diese Datei übernimmt diese Festlegung als Abgrenzung (Abschnitt 3.11).

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Grundfall: Umschalt+Enter ohne Selektion (Cursor mitten im Absatz)
- Der Text wird an der Cursor-Position durch einen `hard_break` **getrennt**, beide
  Teile bleiben Bestandteil **desselben** `paragraph`-/`heading`-Nodes — es entsteht
  **kein** neuer Absatz (Abgrenzung zu normalem Enter).
- Der Cursor steht danach unmittelbar **hinter** dem eingefügten Umbruch, bereit zum
  Weitertippen auf der neuen Zeile.
- Visuell erscheint der nachfolgende Text auf einer neuen Zeile innerhalb desselben
  optischen Absatzblocks (kein zusätzlicher Absatzabstand, sofern keiner konfiguriert
  ist — siehe Menüpunkt 6 zur fehlenden visuellen Unterscheidbarkeit).

### 3.2 Umschalt+Enter über eine bestehende Selektion
- Eine vorhandene Selektion wird durch den `hard_break` **ersetzt** (nicht ergänzt) —
  Standardverhalten wie bei anderen Inline-/Block-Einfügungen (vgl. `insertImage`,
  `insertTable` in `commands.ts`).
- Gilt auch, wenn die Selektion sich über mehrere Wörter oder einen ganzen Satz
  erstreckt; der markierte Text verschwindet vollständig und wird durch die neue
  Zeilentrennung ersetzt.

### 3.3 Verhalten am Absatzanfang und -ende
- Umschalt+Enter unmittelbar vor dem ersten Zeichen eines Absatzes: erzeugt eine
  führende leere Zeile innerhalb desselben Absatzes, der eigentliche Text beginnt
  in der zweiten Zeile.
- Umschalt+Enter unmittelbar nach dem letzten Zeichen: erzeugt eine leere Folgezeile
  im selben Absatz, Cursor steht dort bereit zum Weitertippen.
- Beide Fälle dürfen **nicht** automatisch zu einem no-op reduziert oder
  stillschweigend verworfen werden.

### 3.4 Datenmodell-Repräsentation
- Bleibt der bereits vorhandene `hard_break`-Node aus `src/formats/shared/schema.ts`
  (keine neuen Attribute nötig, keine Schema-Änderung erforderlich für dieses
  Feature selbst — im Unterschied zu `seitenumbruch-req.md`, wo ein neuer Node/ein
  neues Attribut erst geschaffen werden muss).
- `selectable: false` bleibt bestehen; der Umbruch wird nie als eigenständige
  Node-Selektion markierbar, sondern verhält sich wie ein atomares Inline-Zeichen
  gegenüber Cursor-Positionierung und -Bewegung.

### 3.5 Export nach DOCX
- Muss weiterhin als `<w:r><w:br/></w:r>` serialisiert werden (kein `w:type`-Attribut,
  entsprechend dem OOXML-Default `textWrapping` und identisch zu dem, was echtes
  Microsoft Word für Umschalt+Enter selbst schreibt).
- Muss von einem eventuell künftig hinzukommenden Seitenumbruch-Export
  (`<w:br w:type="page"/>`, siehe `seitenumbruch-req.md` Abschnitt 3.4) eindeutig
  unterscheidbar bleiben — der Writer darf die beiden Fälle nie verwechseln, auch
  nachdem `page_break`-Unterstützung ergänzt wurde.

### 3.6 Import aus DOCX
- Ein `<w:br/>` bzw. `<w:br w:type="textWrapping"/>` in einer Fremddatei (mit echtem
  Microsoft Word erzeugt) muss zuverlässig als `hard_break` gelesen werden — das ist
  laut Abschnitt 0, Punkt 6 bereits der Fall und muss als Regressionsschutz mit
  einem echten Word-Fixture abgesichert bleiben.
- **Abgrenzungsanforderung (aktuell nicht erfüllt, siehe Abschnitt 0, Punkt 6):**
  `<w:br w:type="page"/>` und `<w:br w:type="column"/>` dürfen **nicht** identisch zu
  einem normalen Zeilenumbruch gelesen werden. Solange `seitenumbruch`/Spaltenumbruch
  nicht separat implementiert sind, ist mindestens zu dokumentieren, dass ein
  Seiten-/Spaltenumbruch in einer Fremddatei aktuell fälschlich zu `hard_break"
  vereinfacht wird — das ist ein bekannter, nicht stillschweigend zu ignorierender
  Nebeneffekt dieses Features, dessen Behebung eng mit `seitenumbruch-req.md`
  verzahnt ist.

### 3.7 Export nach ODT
- Muss weiterhin als `<text:line-break/>` serialisiert werden — identisch zu dem,
  was LibreOffice Writer selbst für Umschalt+Enter erzeugt.

### 3.8 Import aus ODT
- `<text:line-break/>` in einer Fremddatei (mit echtem LibreOffice Writer erzeugt)
  muss zuverlässig als `hard_break` gelesen werden.
- Abgrenzung zu `text:s` (mehrere Leerzeichen) und `text:tab` (Tabulator) — beide
  werden laut Code bereits separat behandelt (`reader.ts` Zeilen 110–115), dürfen
  aber durch künftige Änderungen nicht mit `text:line-break` verwechselt werden.
- Ein eventuell in der Fremddatei vorhandenes `text:soft-page-break` (reiner
  Rendering-Hinweis, kein manueller Umbruch, siehe `seitenumbruch-req.md`
  Abschnitt 3.7) darf **nicht** als `hard_break` fehlinterpretiert werden.

### 3.9 Verhalten in Sonderkontexten
- **In einer Überschrift (`heading`):** funktional identisch zu 3.1 — Überschrift
  bleibt ein einziger `heading`-Node mit interner Zeilentrennung, wird **nicht** zu
  zwei Überschriften oder zu Überschrift+Absatz aufgespalten.
- **In einem Listenpunkt (`list_item`):** Zeilenumbruch bleibt innerhalb desselben
  Listenpunkts, erzeugt **keinen** neuen Listenpunkt und beeinflusst die
  Nummerierung nicht.
- **In einer Tabellenzelle:** Zeilenumbruch bleibt innerhalb desselben Absatzes der
  Zelle, erzeugt keine neue Zelle/Zeile und beschädigt die Tabellenstruktur nicht.
- **In Kopf-/Fußzeile**, sobald diese laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9
  über die UI bedienbar sind: identisches Verhalten zum Haupttext (aktuell nicht
  über UI erreichbar, da Kopf-/Fußzeilen-Editing laut dortigem Befund komplett
  fehlt — kein Blocker für dieses Feature, aber bei Umsetzung von Abschnitt 9 mit
  zu berücksichtigen).

### 3.10 Abgrenzung zum Absatzumbruch (Enter)
- Ein per Umschalt+Enter erzeugter Umbruch muss auch nach einer Export/Reimport-
  Rundreise als `hard_break` erkennbar bleiben und darf sich **nie** in einen neuen
  Absatz verwandeln (und umgekehrt: ein per Enter erzeugter neuer Absatz darf sich
  nie in einen `hard_break` verwandeln). Dies gilt unabhängig davon, dass beide im
  aktuellen Editor optisch schwer unterscheidbar sind (siehe Menüpunkt 6) — die
  interne Repräsentation muss die Unterscheidung dennoch verlustfrei tragen.

### 3.11 Abgrenzung zum Einfügen aus der Zwischenablage
- Wie in Abschnitt 0, Punkt 10 festgestellt, erzeugt aktuelles Einfügen von
  mehrzeiligem Klartext **keine** `hard_break`-Nodes, sondern immer separate
  Absätze. Diese Datei legt fest: das ist als **bewusste, dokumentierte Abgrenzung**
  zu behandeln, kein Fehler dieses Features — eine etwaige Änderung dieses
  Verhaltens (z. B. „einzelne Zeilenumbrüche innerhalb eines zusammenhängenden
  Blocks werden beim Einfügen zu `hard_break`") ist Gegenstand von
  `einfuegen-req.md` Abschnitt 3.3, nicht dieser Datei, muss aber, falls umgesetzt,
  mit denselben Rundreise-Anforderungen (Abschnitt 5 unten) konsistent sein.

### 3.12 Navigation und Selektion
- Pfeiltasten links/rechts bewegen den Cursor um genau eine Position über den
  Umbruch hinweg (wie über ein einzelnes Zeichen).
- Pfeiltasten hoch/runter navigieren zur entsprechenden Position in der
  vorherigen/nächsten sichtbaren Zeile **innerhalb desselben Absatzes**, nicht zum
  nächsten Absatz (Standard-Zeileneditor-Verhalten).
- Doppelklick auf ein Wort unmittelbar vor/nach dem Umbruch selektiert nur dieses
  Wort, nicht versehentlich den Umbruch mit.
- Dreifachklick (Absatzselektion) selektiert den **gesamten** Absatz inklusive
  aller darin enthaltenen `hard_break`-Umbrüche als eine zusammenhängende Selektion.

### 3.13 Undo/Redo
- Einfügen eines Zeilenumbruchs ist **ein einziger Undo-Schritt**.
- Löschen eines Zeilenumbruchs (Backspace/Entf direkt davor/danach) ist ebenfalls
  ein einziger Undo-Schritt und stellt den exakten Zustand vor dem Löschen wieder
  her (insbesondere: der davor/danach stehende Text bleibt exakt erhalten, keine
  Verschmelzung zu einer falschen Reihenfolge).
- Redo stellt den jeweils rückgängig gemachten Zustand identisch wieder her.
- Da die Erzeugung aktuell über den Mutation-Reconciliation-Pfad läuft (Abschnitt 0,
  Punkt 5) statt über eine explizite Transaktion, ist **explizit zu verifizieren**,
  dass daraus kein unerwartetes Undo-Gruppierungsverhalten entsteht (z. B. Umbruch
  und direkt nachfolgend getippter Text fälschlich in einem gemeinsamen
  Undo-Schritt oder umgekehrt ein Umbruch, der sich nicht in einem Schritt rückgängig
  machen lässt).

### 3.14 Rückmeldeverhalten (kein stiller Fehlschlag)
- Kann Umschalt+Enter aus irgendeinem Grund keinen Umbruch erzeugen (z. B. weil ein
  Browser den nativen Fallback nicht wie erwartet ausführt, oder weil ein künftiger
  Codechange versehentlich `Shift-Enter` per `preventDefault()` global blockiert),
  darf das Ergebnis **nicht** ein stiller No-Op sein — mindestens ein Regressionstest
  (siehe Abschnitt 6) muss ein solches Verhalten sofort sichtbar machen, bevor es in
  Produktion gelangt.

---

## 4. Grenzfälle (müssen explizit geprüft werden)

| # | Grenzfall | Erwartetes Verhalten |
|---|---|---|
| 1 | Umschalt+Enter am Absatzanfang (vor jedem Zeichen) | Führende leere Zeile im selben Absatz, siehe 3.3 |
| 2 | Umschalt+Enter am Absatzende | Leere Folgezeile im selben Absatz, siehe 3.3 |
| 3 | Mehrere aufeinanderfolgende Umschalt+Enter ohne Text dazwischen (z. B. dreimal hintereinander) | Erzeugt entsprechend viele leere Zeilen im selben Absatz — darf **nicht** automatisch zusammengefasst oder auf eine einzige reduziert werden |
| 4 | Umschalt+Enter unmittelbar gefolgt von normalem Enter (oder umgekehrt) | Beide Umbruch-Arten müssen in derselben Sequenz korrekt und unterscheidbar nebeneinander entstehen — kein Umschlagen des einen in den anderen Typ |
| 5 | Umschalt+Enter in einem vollständig leeren Absatz (kein Text, keine Selektion) | Erzeugt einen Umbruch im selben (leeren) Absatz, kein Crash, kein stiller No-Op |
| 6 | Umschalt+Enter mitten in einer Überschrift (`heading`) | Bleibt eine einzige Überschrift mit interner Zeilentrennung, siehe 3.9 |
| 7 | Umschalt+Enter in einem Listenpunkt (`list_item`) | Bleibt derselbe Listenpunkt, Nummerierung unverändert, siehe 3.9 |
| 8 | Umschalt+Enter in einer Tabellenzelle | Bleibt in derselben Zelle, Tabellenstruktur unverändert, siehe 3.9 |
| 9 | Umschalt+Enter mit Cursor unmittelbar vor/nach einem Bild (`image`-Node, ebenfalls ein Inline-/Block-Nachbar) | Bild bleibt vollständig erhalten und an seiner Position, Umbruch entsteht auf der jeweils richtigen Seite des Bildes ohne Verschiebung/Duplizierung |
| 10 | Backspace unmittelbar nach einem Zeilenumbruch bzw. Entf unmittelbar davor | Umbruch verschwindet in einem Schritt, Text davor und danach verschmilzt korrekt zu einer durchgehenden Zeile, kein Zeichenverlust |
| 11 | Pfeiltasten (links/rechts, hoch/runter) über einen Zeilenumbruch hinweg | Cursor bewegt sich um genau eine Position/eine sichtbare Zeile, siehe 3.12 |
| 12 | Doppelklick zur Wortauswahl unmittelbar vor/nach dem Umbruch | Selektiert nur das angeklickte Wort, nicht den Umbruch mit, siehe 3.12 |
| 13 | Import einer echten Word-Datei mit sowohl `<w:br/>` (Zeilenumbruch) als auch `<w:br w:type="page"/>`/`<w:br w:type="column"/>` im selben Dokument | Zeilenumbrüche werden korrekt als `hard_break` gelesen; Seiten-/Spaltenumbrüche werden aktuell **fälschlich ebenfalls** als `hard_break` gelesen (bekannte Lücke, siehe 3.6) — muss explizit befundet und nicht stillschweigend als „funktioniert" durchgewunken werden |
| 14 | Import einer echten LibreOffice-Datei mit `<text:line-break/>` unmittelbar gefolgt von einem `text:soft-page-break` im selben Absatz | Zeilenumbruch wird als `hard_break` gelesen, `text:soft-page-break` wird **nicht** als weiterer Umbruch fehlinterpretiert, siehe 3.8 |
| 15 | Selection-Sync-Regressionssequenz mit Umschalt+Enter: Text eingeben → Alles auswählen → Formatierung anwenden (z. B. Fett) → per Klick neu positionieren → Umschalt+Enter → weiter tippen | Beide Zeilen im selben Absatz bleiben erhalten, kein Datenverlust — Pflicht-Regressionstest analog `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2, aber bisher mit keiner Zeilenumbruch-Sequenz nachgestellt (siehe Abschnitt 6) |
| 16 | Cross-Format-Rundreise DOCX → ODT → DOCX bzw. ODT → DOCX → ODT mit mehreren Umbrüchen im selben Absatz | Alle Umbrüche bleiben einzeln, an der richtigen Position und in der richtigen Reihenfolge erhalten, keine kumulative Verschlechterung über beide Konvertierungen hinweg |
| 17 | Sehr viele (z. B. 50+) aufeinanderfolgende Zeilenumbrüche im selben Absatz | UI bleibt bedienbar, kein Einfrieren, Rundreise erhält alle Umbrüche vollständig |
| 18 | Einfügen von mehrzeiligem Klartext aus der Zwischenablage in denselben Absatz, in dem bereits ein `hard_break` steht | Bestätigt die Abgrenzung aus 3.11: eingefügter Text erzeugt zusätzliche Absätze, der bereits vorhandene `hard_break` bleibt davon unberührt an seiner Position |

---

## 5. Rundreise-Anforderung

Zwei getrennte, beide verpflichtende Rundreise-Prüfungen — analog zur Methodik in
`seitenumbruch-req.md` Abschnitt 5 und `einfuegen-req.md` Abschnitt 5.

### 5.1 Baseline-Rundreise (Regressionsschutz — darf durch Verifikationsarbeit an diesem Feature nicht kaputtgehen)
1. Reale DOCX-Datei **ohne** jeden manuellen Zeilenumbruch unverändert hochladen
   (kein Klick, keine Eingabe) → sofort exportieren → erneut importieren → Inhalt
   entspricht inhaltlich dem Original, insbesondere entsteht **kein**
   fälschlicherweise erkannter Zeilenumbruch.
2. Dasselbe mit einer realen ODT-Datei.
3. Reale DOCX-Datei, die **einen echten manuellen Seitenumbruch**
   (`<w:br w:type="page"/>`) enthält (sobald verfügbar, sonst synthetisch als
   XML-Fixture nachgebaut) → nach Import darf dieser laut Abschnitt 3.6/4.13 zwar
   aktuell noch fälschlich als `hard_break` erscheinen, dieses Verhalten muss aber
   **explizit als bekannte, dokumentierte Abweichung** erfasst sein, nicht
   stillschweigend als korrekt durchgehen.
4. Beide Prüfungen aus 1–2 müssen weiterhin grün sein, nachdem an der Erzeugung
   von `hard_break` (Command/Keymap gemäß Abschnitt 1, Zeile 1) etwas geändert
   wurde — kein Nebenwirkungs-Regressionsfehler durch einen neuen expliziten
   `Shift-Enter`-Keymap-Eintrag, der z. B. versehentlich auch normales `Enter`
   beeinflusst.

### 5.2 Feature-Rundreise (Zeilenumbruch selbst)
Für jede der folgenden Situationen: Umschalt+Enter über **echte Tastatureingabe im
Browser** auslösen (nicht per direkt konstruiertem JSON-Fixture) → Dokument als
DOCX exportieren → reimportieren → Umbruch **und** Inhalt bleiben erhalten; **und**
identisch als ODT; **und** zusätzlich Cross-Format (in ein ursprünglich als DOCX
erstelltes/importiertes Dokument einfügen und als ODT exportieren, sowie
umgekehrt):

1. Neues Dokument, ein Absatz mit einem Umschalt+Enter in der Mitte → Umbruch
   bleibt exakt an derselben Stelle, Text davor/danach unverändert, bleibt als
   `hard_break` erkennbar (nicht zu zwei Absätzen degradiert).
2. Dasselbe als ODT-Ursprungsdokument.
3. Cross-Format DOCX → ODT → DOCX und ODT → DOCX → ODT (beide Richtungen).
4. Mehrere Umbrüche im selben Absatz (siehe Grenzfall 3/17) → alle bleiben einzeln
   und in korrekter Reihenfolge erhalten.
5. Umbruch in Kombination mit anderen Strukturen im selben Dokument (Liste,
   Tabelle, Bild, Überschrift, siehe Grenzfälle 6–9) → Rundreise erhält sowohl den
   Umbruch als auch die übrigen Strukturen unverändert (kumulativer
   Verlust-Test, analog `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19, Testfall 3).
6. Import einer **fremden, nicht mit dieser App erzeugten** DOCX-Datei mit einem
   per echtem Microsoft Word erzeugten Zeilenumbruch → wird erkannt (Abschnitt 3.6),
   unverändert exportiert, erneut reimportiert → weiterhin vorhanden.
7. Dasselbe mit einer mit echtem LibreOffice Writer erzeugten ODT-Datei
   (`<text:line-break/>`).
8. Doppelte Rundreise (Format-Wechsel hin und zurück) an einem Dokument, das
   Zeilenumbrüche zusammen mit allen anderen Features aus
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitte 3–14 enthält → kein kumulativer
   Textverlust.

**Abnahmekriterium:** Formatierungs-/Layout-Nuancen bei Cross-Format-Konvertierung
sind wie im Rest der Spezifikation zu dokumentieren und akzeptabel; **das
vollständige Verschwinden eines Umbruchs, seine Umwandlung in einen Absatzumbruch
(oder umgekehrt) oder ein Verlust von Textinhalt ist es nicht** — weder bei 5.1
noch bei 5.2.

---

## 6. Testplan-Hinweise (Unit + E2E, Playwright)

1. **Bereits vorhanden (Unit, ausreichend für Reader/Writer-Korrektheit, aber
   nicht für den Eingabeweg):** `src/formats/docx/__tests__/roundtrip.test.ts` und
   `src/formats/odt/__tests__/roundtrip.test.ts`, jeweils Zeilen 114–125. Bleiben
   als Regressionsschutz für die Serialisierung erhalten.
2. **Fehlt komplett und ist Pflicht — E2E-Test für den echten Eingabeweg:**
   Cursor im Editor setzen (`page.locator('.ProseMirror')`, Muster aus
   `tests/e2e/selection-regression.spec.ts`), Text tippen, `Enter`-Taste **mit**
   Shift-Modifikator auslösen (`page.keyboard.down('Shift')`,
   `page.keyboard.press('Enter')`, `page.keyboard.up('Shift')` bzw. das
   Playwright-Kurzformat `page.keyboard.press('Shift+Enter')`), weiter tippen →
   prüfen, dass (a) `page.locator('.ProseMirror p')` weiterhin genau **einen**
   Absatz zählt (kein neuer `<p>` entstanden) und (b) im DOM ein `<br>` zwischen
   den beiden Textteilen existiert.
3. **Regressionstest-Pflicht (Grenzfall 15):** direkt im Anschluss an Punkt 2 eine
   Selection-Sync-Sequenz nachstellen — Alles auswählen, Fett umschalten, per Klick
   neu positionieren, dann erst Umschalt+Enter, dann weiter tippen — beide
   Zeilenteile müssen erhalten bleiben (Muster aus
   `tests/e2e/selection-regression.spec.ts` direkt übertragbar).
4. **Browserübergreifende Abdeckung:** da Abschnitt 0, Punkt 5 zufolge das
   Verhalten aktuell vom nativen Browser-Fallback abhängt, muss Punkt 2 **in
   mindestens zwei unterschiedlichen Browser-Engines** laufen (z. B. „Desktop
   Chrome" **und** „Desktop Firefox" aus `playwright.config.ts`, falls dort
   konfiguriert), nicht nur in einer einzigen Standard-Projektkonfiguration.
5. **Reale Test-Fixtures:** mindestens eine mit echtem Microsoft Word erzeugte
   DOCX-Datei und eine mit echtem LibreOffice Writer erzeugte ODT-Datei, die
   jeweils einen per Umschalt+Enter erzeugten Zeilenumbruch enthalten, sind ins
   Test-Fixture-Verzeichnis aufzunehmen, falls noch nicht vorhanden (rein
   synthetisches Test-XML deckt reale Word-/LibreOffice-Eigenheiten nicht
   zuverlässig ab, vgl. `einfuegen-req.md` Grenzfall 14).
6. **Explizite Unit-Tests für die `w:type`-Abgrenzung (Grenzfall 13):** ein Test,
   der bestätigt, dass `<w:br w:type="page"/>`/`<w:br w:type="column"/>` beim
   aktuellen Reader-Verhalten identisch zu `<w:br/>` gelesen wird — nicht um dieses
   Verhalten zu bestätigen, sondern um es **sichtbar zu dokumentieren**, bis
   `seitenumbruch-req.md`/eine künftige Spaltenumbruch-Spezifikation eine
   Fallunterscheidung nachrüstet. Dieser Test dient als Frühwarnsystem, falls sich
   das Verhalten unbeabsichtigt durch andere Änderungen ändert.
7. Rundreise-Tests (Abschnitt 5) sind sowohl als Unit-Tests gegen Reader/Writer
   **als auch** als E2E-Test über echte Bedienung (Tastatur-Sequenz → echter
   Datei-Download → echter Re-Upload) zu führen — reine Unit-Tests mit direkt
   konstruierten `ProseMirrorJSON`-Fixtures allein reichen nicht aus, da sie den in
   Abschnitt 0 beschriebenen fragilen Erzeugungsweg gar nicht berühren.

---

## 7. Freigabekriterium für „vorhanden"

Der Backlog-Status von `zeilenumbruch-manuell` darf erst dann als **vorhanden**
(unqualifiziert) gelten, wenn:

- geklärt und dokumentiert ist, ob der native Browser-Fallback (Abschnitt 0,
  Punkt 5) browserübergreifend zuverlässig genug ist, um als Feature-Grundlage zu
  gelten, **oder** ob stattdessen ein expliziter Command + Keymap-Eintrag ergänzt
  wurde (Abschnitt 1, Zeile 1),
- alle Bedienelemente aus Abschnitt 1 tatsächlich funktionieren (mindestens die
  Tastenkombination selbst sowie das zuverlässige Löschen eines Umbruchs),
- alle Testfälle aus Abschnitt 6 automatisiert vorliegen und grün sind,
  einschließlich des bisher komplett fehlenden E2E-Tests für den echten
  Tastatur-Eingabeweg,
- die Grenzfälle aus Abschnitt 4 einzeln befundet sind (funktioniert wie
  spezifiziert / bewusst abweichendes, dokumentiertes Verhalten / repariert) —
  insbesondere Grenzfall 13/14 (Abgrenzung zu Seiten-/Spaltenumbruch bzw.
  Soft-Page-Break),
- Abschnitt 5.1 (Baseline-Rundreise) durch die Verifikationsarbeit an diesem
  Feature nicht gebrochen wurde,
- Abschnitt 5.2 (Feature-Rundreise) für DOCX, ODT und beide
  Cross-Format-Richtungen besteht, inklusive der beiden realen Fixture-Dateien aus
  echtem Word/LibreOffice,
- der Regressionstest aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2
  (Selection-Sync-Bug) explizit mit einer Umschalt+Enter-Sequenz nachgestellt und
  grün ist (Grenzfall 15),
- die bekannte Einschränkung „keine visuelle Unterscheidung Zeilen- vs.
  Absatzumbruch im Editor" (Menüpunkt 6) entweder behoben oder bewusst als
  akzeptierte Einschränkung dokumentiert ist.

Andernfalls bleibt der Status auf **teilweise** und die konkret fehlenden
Teilpunkte sind hier nachzutragen (analog zur Vorgehensweise in
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/21, `seitenumbruch-req.md` Abschnitt 7 und
`einfuegen-req.md` Abschnitt 7).
