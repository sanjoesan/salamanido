# Umsetzungsplan: Feature „Bild löschen“

Gegenstück zu `specs/bild-loeschen-req.md`. Dieser Plan beschreibt den **tatsächlich
verifizierten** Code-Stand (Stichtag 2026-07-04, Repo `E:\docs`, Arbeitskopie ohne aktiven
Git-Branch) und die dateigenauen Änderungen, um die Anforderung zu erfüllen. Alle Aussagen
unten sind entweder durch Lesen des tatsächlichen Quellcodes **oder** durch eine reproduzierbare,
tatsächlich ausgeführte Verifikation (siehe Abschnitt 2) belegt — nicht durch Vermutung. Wo die
Req selbst nur einen Verdacht äußert („ungeprüft“, „muss verifiziert werden“), wird hier
entweder der Nachweis erbracht oder explizit als offen markiert.

---

## 0. Kurzfassung der Entscheidung

- **Bestätigt (Req Abschnitt 0 vollständig zutreffend):** Es existiert **kein** eigener
  `deleteImage`-Befehl, **keine** CSS-Regel für `.ProseMirror-selectednode`, **kein**
  Kontext-Toolbar-Button und **kein** einziger Test (weder Unit noch E2E), der ein Bild im
  Editor einfügt oder löscht. „Bild löschen“ funktioniert ausschließlich über
  `prosemirror-commands`s generischen `baseKeymap`-Fallback (`deleteSelection` als erstes
  Glied der `chainCommands`-Ketten für `Delete`/`Backspace`).
- **Neue, in diesem Plan durchgeführte Verifikation (Abschnitt 2):** Per direkt gegen die
  echten, im Repo installierten ProseMirror-Pakete ausgeführten Sonden-Tests (nicht nur
  Quelltext-Lektüre) wurde nachgewiesen, dass dieser generische Mechanismus **bereits jetzt**
  praktisch **alle** strukturellen Grenzfälle aus Req Abschnitt 3 korrekt behandelt: Bild als
  einziges Dokumentelement (automatisches Nachfüllen eines leeren Absatzes durch ProseMirrors
  eigene `Fitter`/`replaceRange`-Logik), Bild am Dokumentanfang/-ende (Cursor landet im
  verbleibenden validen Block), Text vor/nach Bild (bleibt unangetastet, Cursor landet exakt am
  Anfang des Folgeblocks — deckungsgleich mit Req Abschnitt 2.5), Bild in Tabellenzelle/Listenpunkt
  (Struktur bleibt gültig, leerer Ersatzabsatz wird automatisch eingefügt), mehrere/identische
  Bilder (nur die selektierte Node-Instanz verschwindet), Undo/Redo (exakte Attribut-Wiederherstellung),
  sowie die Selektion unmittelbar nach `insertImage` (bereits eine `NodeSelection` auf das neue
  Bild, sofortiges Löschen ohne erneuten Klick funktioniert). **Es besteht daher kein
  funktionaler Zwang, das generische Löschverhalten selbst neu zu implementieren.**
- **Trotzdem zwingend zu beheben (Pflicht-Vorbedingung laut Req DoD Punkt 1):** Es fehlt
  jegliche CSS-Regel für `.ProseMirror-selectednode` — die von `prosemirror-view` gesetzte
  Klasse hat aktuell keinerlei visuelle Wirkung. Ohne sichtbares Feedback ist „Markieren“ im
  Sinne der Backlog-Kurzbeschreibung nicht nachweisbar, selbst wenn das Löschen technisch schon
  funktioniert. **Das ist der einzige Punkt, an dem der Ist-Stand tatsächlich „kaputt“ statt nur
  „ungetestet“ ist.**
- **Architekturentscheidung Toolbar-Button:** Ein neuer, kontextabhängiger Button „Bild löschen“
  wird ergänzt — nicht bloß als „nice to have“, sondern weil eine Recherche im
  `prosemirror-view`-Quellcode (Abschnitt 3.4) zeigt, dass der spezielle Mobile-Workaround für
  `beforeinput`-Events (`deleteContentBackward` auf Chrome/Android) **nur für eine
  `TextSelection` mit `$cursor`** greift, nicht für eine `NodeSelection` auf ein Bild. Auf
  Touch-Geräten ohne physische Entf-Taste ist die Verlässlichkeit von
  Backspace/Delete-Tastendruck auf eine Bild-`NodeSelection` damit strukturell unsicherer als
  bei Text — der Toolbar-Button ist der einzige **tastatur-unabhängige**, sicher antippbare Weg
  und damit Pflicht, um Req Abschnitt 1 Zeile 7 / Grenzfall 20 zu erfüllen, nicht optional wie
  bei einer reinen Text-Operation.
- Ein neuer, schmaler `deleteImage`-Befehl in `commands.ts` wird ergänzt — **nicht** um das
  Löschverhalten zu ändern (er ruft intern exakt dieselbe `tr.deleteSelection()`-Operation auf,
  die `baseKeymap` bereits nutzt), sondern um (a) dem Toolbar-Button eine benannte,
  kontext-geprüfte Funktion zu geben und (b) aus der laut Req Abschnitt 0 kritisierten
  „ungetesteten Nebenwirkung eines Bibliotheks-Fallbacks“ eine benannte, unit-testbare Funktion
  zu machen — ohne das bereits nachweislich korrekte Verhalten zu riskieren.
- Für `src/formats/docx/*` und `src/formats/odt/*` sind **keine** Produktionscode-Änderungen
  nötig (Begründung Abschnitt 3.6) — die ImageCollector-Architektur baut bei jedem Export den
  Bild-Katalog aus dem aktuellen Dokumentbaum neu auf, verwaiste Referenzen sind strukturell
  ausgeschlossen. Das wird hier aber **durch neue Tests bewiesen**, nicht nur behauptet (Req
  Abschnitt 0 verlangt explizit einen echten Test statt einer Ableitung aus der Architektur).
- Neu zu bauen: 1 CSS-Regel, 1 Command-Paar (`isImageSelected`/`deleteImage`) plus 1 SVG-Icon
  in der Toolbar, 1 dokumentierte Kontextmenü-/Bestätigungsdialog-Entscheidung, 4 neue
  Test-Dateien (1 Unit-Test für `commands.ts`, 2 Unit-Tests für Reader/Writer-Verwaisungsprüfung
  DOCX+ODT, 1 umfassende E2E-Suite `image-delete.spec.ts` inkl. Rundreise- und
  Selection-Sync-Regressionstests).

---

## 1. Verifizierter Ist-Stand (Codebelege)

### 1.1 `src/formats/shared/schema.ts` (aktuell 154 Zeilen)
`image`-NodeSpec (Zeilen 45–72): `group: 'block'`, Attribute `src`/`alt`/`width`/`height`,
`draggable: true`, **kein** `selectable`-Feld (Default in ProseMirror: `true`). Zum Vergleich
`hard_break` (Zeile 35–43) setzt explizit `selectable: false`. `list_item` (Zeile 98–104):
`content: 'paragraph block*'` — ein `list_item` kann **niemals** ausschließlich ein Bild ohne
führenden Absatz enthalten, das Schema erzwingt strukturell mindestens einen (ggf. leeren)
Absatz als erstes Kind. `tableNodes({ cellContent: 'block+' })` (Zeile 106): eine Tabellenzelle
verlangt mindestens einen Block, ein Bild allein erfüllt das bereits. `doc: { content: 'block+' }`
(Zeile 7): das Dokument verlangt mindestens einen Block — relevant für Grenzfall 2.

### 1.2 `src/formats/shared/editor/commands.ts` (aktuell 108 Zeilen)
Exportiert `setAlign`, `isAlignActive`, `setHeading`, `toggleList`, `liftFromList`,
`insertImage` (Zeile 66–74), `insertTable`, `applyMarkColor`, `clearMarkColor`. Kein
`deleteImage`, kein `isImageSelected`, keine `NodeSelection`-Prüfung. `insertImage` erzeugt den
Node per `wordSchema.nodes.image.create({ src, alt })` und dispatcht
`state.tr.replaceSelectionWith(node)` — **keine** eigene Nachbehandlung der resultierenden
Selektion (siehe Abschnitt 2.6 zur tatsächlichen Auswirkung).

### 1.3 `src/formats/shared/editor/Toolbar.tsx` (aktuell 247 Zeilen)
Einziges bild-bezogenes Element: das `<label>` mit `🖼 Bild` + verstecktem
`<input type="file" accept="image/*">` (Zeile 241–244), das `handleImagePick` (Zeile 97–108)
auslöst, welches `insertImage(dataUrl, file.name)` aufruft. Kein Lösch-Button, kein
kontextabhängiges Element, keine Bedingung auf `view.state.selection`. Der `run()`-Helper
(Zeile 23–26) hat die Signatur `(view, command: (state, dispatch) => boolean)` — reicht
aktuell **keinen** `view`-Parameter an die Befehlsfunktion durch (anders als der in
`specs/ausschneiden-code.md` §3.2 vorgeschlagene Umbau für Cut — für `deleteImage` wird das
auch **nicht** gebraucht, siehe Abschnitt 3.3 unten).

### 1.4 `src/formats/shared/editor/WordEditor.tsx` (aktuell 133 Zeilen)
`keymap({...})` (Zeile 71–79) bindet ausschließlich `Mod-z`, `Mod-y`, `Mod-Shift-z`, `Enter`,
`Mod-b`, `Mod-i`, `Mod-u`. **Kein** eigener `Delete`/`Backspace`/`Mod-Backspace`-Eintrag. Direkt
danach `keymap(baseKeymap)` (Zeile 80, aus `prosemirror-commands`). Kein
`contextmenu`-Listener, kein `handleDOMEvents`-Prop — das native Browser-Kontextmenü ist
unangetastet erreichbar (identischer Befund wie in `specs/ausschneiden-code.md` §1.3, dort
bereits für „Ausschneiden“ dokumentiert; gilt hier identisch für „Bild löschen“). `dropCursor()`
(Zeile 83) und `gapCursor()` (Zeile 84) sind aktiv, aber ohne zugehöriges Stylesheet (siehe
1.5). `reconcileSelectionOnClick` (Zeile 42–53) reagiert auf „DOM zeigt kollabierten Cursor,
Modell hält noch nicht-leere Selektion“ — eine Bild-`NodeSelection` ist eine solche nicht-leere
Selektion, also ein direkter Anwendungsfall dieser Logik (siehe Grenzfall 13/Abschnitt 2.7 der
Req).

### 1.5 `src/index.css` (aktuell 72 Zeilen)
Enthält `.ProseMirror img { max-width: 100%; height: auto; }` (Zeile 39–42), aber **keine**
Regel für `.ProseMirror-selectednode`, `.ProseMirror-gapcursor` oder
`.ProseMirror-hideselection`. `src/main.tsx` importiert ausschließlich `./index.css` — kein
Import von `prosemirror-view/style/prosemirror.css`, `prosemirror-gapcursor/style/gapcursor.css`
oder `prosemirror-tables/style/tables.css` irgendwo im Repo (verifiziert per Volltextsuche über
`src/`, keine Treffer außer dieser Feststellung selbst).

**Bibliotheks-Beleg** (`node_modules/prosemirror-view/style/prosemirror.css`):
```css
.ProseMirror-selectednode {
  outline: 2px solid #8cf;
}
li.ProseMirror-selectednode {
  outline: none;
}
li.ProseMirror-selectednode:after {
  content: "";
  position: absolute;
  left: -32px; right: -2px; top: -2px; bottom: -2px;
  border: 2px solid #8cf;
  pointer-events: none;
}
```
Das Stylesheet enthält daneben weitere, für dieses Repo nicht notwendige bzw. bereits anders
gehandhabte Regeln (`white-space: pre-wrap`/`break-spaces` auf `.ProseMirror`,
`.ProseMirror-hideselection`, `img.ProseMirror-separator` für den internen Cursor-Trick bei
Bild-Nachbarschaft). Entscheidung dazu in Abschnitt 3.1.

### 1.6 ImageCollector- und Writer-Architektur (DOCX + ODT)
`src/formats/docx/imageCollector.ts` und `src/formats/odt/imageCollector.ts`: identischer
Aufbau, je eine `ImageCollector`-Klasse mit `add(dataUrl): string`, die per
`fileNameByDataUrl`-`Map` dedupliziert und fortlaufende Dateinamen (`imageN.ext` bzw.
`Pictures/imageN.ext`) vergibt. `src/formats/docx/writer.ts` (`writeDocx`, Zeile 222 ff.) und
`src/formats/odt/writer.ts` (`writeOdt`, Zeile 183 ff.) erzeugen **bei jedem Aufruf** eine neue
`ImageCollector`-Instanz und füllen sie **ausschließlich** durch rekursives Ablaufen des
aktuell übergebenen `doc.body`/`header`/`footer`-JSON (`blocksToDocx`/`blocksToOdt` →
`blockToDocx`/`blockToOdt` → Fall `'image'` → `images.add(src)`). Es gibt **keinen**
sitzungsübergreifenden bzw. gecachten Bild-Zustand. `buildContentTypesXml` (docx, Zeile 199)
und `buildManifestXml` (odt, Zeile 167) iterieren ausschließlich über `images.all()` — ein aus
dem ProseMirror-Dokument entferntes Bild wird beim nächsten Export **nicht mehr besucht** und
taucht daher weder in `[Content_Types].xml`/`word/media/` noch in
`META-INF/manifest.xml`/`Pictures/` auf. Reader-seitig (`src/formats/docx/reader.ts` Zeile
72 ff., `src/formats/odt/reader.ts` Zeile 122 ff., jeweils `resolveImageSources`) werden
Bild-Referenzen ausschließlich aus dem tatsächlich geparsten XML-Baum aufgelöst — kein
zusätzlicher, vom Baum unabhängiger Zustand, der veralten könnte.

### 1.7 Tests — Bestandsaufnahme
`tests/e2e/*.spec.ts` (`lifecycle.spec.ts`, `odt.spec.ts`, `docx.spec.ts`,
`selection-regression.spec.ts`): keine Volltextsuchtreffer für `image`/`Bild`/`img`. Kein
E2E-Test fügt ein Bild ein oder löscht eines. `src/formats/shared/editor/__tests__/`: nur
`pagination.test.ts` — **kein** `commands.test.ts` existiert. `src/formats/docx/__tests__/
roundtrip.test.ts` (Zeile 251–276) und `src/formats/odt/__tests__/roundtrip.test.ts`
(Zeile 212–246): je zwei Tests unter „round trip: images“, die ausschließlich das
Erhalten-Bleiben eines hart konstruierten Bild-Knotens prüfen — keine Löschung, keine
Zip-Inhalts-Prüfung auf verwaiste Dateien. `src/formats/{docx,odt}/__tests__/
external-fixtures.test.ts` prüft nur, dass reale Fixture-Dateien ohne Absturz importiert
werden — keine Bild-spezifische Assertion. Fixtures vorhanden und geeignet:
`tests/fixtures/external/docx/VariousPictures.docx`,
`tests/fixtures/external/odt/{images,odt-images-linked,feature_images}.odt` u. a.

---

## 2. Durchgeführte Verifikation des generischen `baseKeymap`-Verhaltens

Die Req verlangt in Abschnitt 0 explizit, „vorhanden“ nicht ungeprüft zu übernehmen, aber auch
nicht zu unterstellen, dass es automatisch falsch ist. Um das zu klären, wurden reproduzierbare
Sonden-Tests **direkt gegen die im Repo installierten Pakete** (`prosemirror-state`,
`prosemirror-commands`, `prosemirror-history`, tatsächliches `wordSchema` aus `schema.ts`,
tatsächliche `insertImage`-Funktion aus `commands.ts`) unter Vitest ausgeführt (jsdom-Umgebung
laut `vite.config.ts`, reine Datenmodell-Operationen ohne DOM-Rendering — für die
Sichtbarkeits-/Interaktions-Fragen aus Abschnitt 0/2.3 bleibt eine echte Playwright-Verifikation
weiterhin Pflicht, siehe Abschnitt 7.2). Die Sonde wurde danach wieder entfernt (kein
Bestandteil dieses Plans als Datei) — die Ergebnisse werden hier als Beleg zitiert, die dauerhaft
im Repo verbleibenden Tests sind separat in Abschnitt 7 spezifiziert.

**Ergebnisse (alle 12 Sonden-Fälle liefen ohne Exception durch):**

| Szenario | Ergebnis |
|---|---|
| Bild ist einziger Dokumentinhalt, `Delete` auf `NodeSelection` | Dokument wird automatisch zu `[{type: paragraph, content: []}]` aufgefüllt (ProseMirrors `Fitter`/`replaceRange`, kein eigener Code nötig); resultierende Selektion: `TextSelection` in diesem Absatz. **Bestätigt Grenzfall 2 bereits ohne Zusatzcode.** |
| Bild am Dokumentanfang, Absatz „After“ danach | Nach Löschen bleibt genau `[paragraph("After")]`, Cursor kollabiert an Position 1 (Anfang des Texts). **Bestätigt Grenzfall 3.** |
| Absatz „Before“, Bild am Dokumentende | Nach Löschen bleibt `[paragraph("Before")]`, Cursor an Position 7 (Ende von „Before“). **Bestätigt Grenzfall 4.** |
| Absatz „Before“, Bild, Absatz „After“ — `Delete` **und** getrennt `Backspace` auf derselben `NodeSelection` | Identisches Ergebnis für beide Tasten: beide Absätze bleiben vollständig und unverändert erhalten, Cursor landet exakt am **Anfang des Folgeabsatzes** (Position 9 = erstes Zeichen von „After“). **Bestätigt Grenzfall 1 sowie exakt die in Req Abschnitt 2.5 geforderte Cursor-Policy „bevorzugt am Anfang des nachfolgenden Blocks“ — für beide Tasten identisch, weil `deleteSelection` in beiden `chainCommands`-Ketten das erste, bei nicht-leerer Selektion greifende Glied ist.** |
| Bild als einziger Inhalt eines Listenpunkts — **mit** dem schema-erzwungenen führenden leeren Absatz (`list_item.content = 'paragraph block*'` lässt kein Bild ohne Absatz zu) | Nach Löschen bleibt der Listenpunkt mit genau einem leeren Absatz bestehen, die Liste selbst bleibt erhalten. **Bestätigt Grenzfall 8 — und zeigt zugleich, dass „Bild als einziger Listenpunkt-Inhalt ohne Absatz“ laut Schema real gar nicht erreichbar ist, weil `insertImage`s `replaceSelectionWith` bei einer Cursor-Position in einem leeren Listenabsatz das Bild als Geschwister-Block neben den (leeren) Absatz setzt, nicht anstelle davon.** |
| Bild als einziger Inhalt einer Tabellenzelle (`cellContent: 'block+'`, kein Absatz-Zwang) | Nach Löschen wird die Zelle automatisch mit einem leeren Absatz aufgefüllt (`createAndFill`-Mechanik), zweite Zelle und Zeilenstruktur unverändert. **Bestätigt Grenzfall 7.** |
| Drei Bilder, mittleres per `NodeSelection` löschen | Erstes und drittes Bild bleiben unverändert und in Reihenfolge erhalten. **Bestätigt Grenzfall 5.** |
| Zwei Bilder mit identischer `data:`-URL, erstes löschen | Verbleibendes zweites Bild bleibt mit seinen eigenen Attributen (`alt`) erhalten — die Löschung wirkt exakt auf die referenzierte Node-Instanz, nicht auf den Wert. **Bestätigt Grenzfall 6 auf Editor-Ebene** (die Export-seitige Dedupe-Konsequenz wird separat in Abschnitt 7.3 getestet). |
| Selektion unmittelbar nach `insertImage(...)` | Die von `insertImage` dispatchte Transaktion enthält bereits eine `NodeSelection`, deren `.node` exakt der neu eingefügte Bild-Node ist (ProseMirrors `replaceSelectionWith` wählt automatisch den frisch eingefügten Node, wenn er nicht inline ist). Ein direkt darauf ausgeführtes `Delete` entfernt das Bild ohne erneuten Klick. **Bestätigt Grenzfall 16 — kein Zusatzcode nötig.** |
| Undo/Redo-Rundreise (`prosemirror-history`) auf ein Bild mit `width: 123, height: 45, alt: 'RoundtripAlt'` | Nach Löschen → Undo: Bild erscheint mit **exakt** denselben vier Attributen an der ursprünglichen Position zwischen den beiden Textabsätzen. Nach anschließendem Redo: identisch zum ersten Löschergebnis. **Bestätigt Grenzfall 11/12 sowie Req Abschnitt 2.6.** |
| `Object.keys(baseKeymap)` | Enthält `Mod-Backspace` und `Shift-Backspace` als **reine Aliase** auf dieselbe `chainCommands(deleteSelection, joinBackward, selectNodeBackward)`-Kette wie `Backspace` — `prosemirror-commands` implementiert **keine** eigene „Wort-weise löschen“-Logik, das Verhalten auf einer Bild-`NodeSelection` ist damit *per Bibliotheks-Quellcode* identisch zu einfachem Backspace. **Beantwortet Req Zugriffsweg 4 abschließend, ohne dass ein Browser nötig wäre, um das zu erraten.** |

**Zusätzlicher Bibliotheks-Beleg zu Drag-Abbruch (Grenzfall 14, Req Zugriffsweg 5):**
`node_modules/prosemirror-view/dist/index.js`, `handlers.dragstart` (ca. Zeile 3780–3810) baut
ausschließlich einen In-Memory-`view.dragging`-Slice und `dataTransfer`-Payload auf — es wird
**keine** Transaktion dispatcht und nichts aus dem Dokument entfernt. Das eigentliche Entfernen
der Quelle (bei „move“-Semantik) geschieht ausschließlich in `handleDrop` (ca. Zeile 3827 ff.),
die **nur** bei einem tatsächlichen `drop`-Event mit einer über `view.posAtCoords` auflösbaren
Position innerhalb der Editor-DOM ausgeführt wird. Ein Drop außerhalb des Editors oder ein
abgebrochener Drag (Esc) löst gar kein `drop`-Event auf `view.dom` aus → keine Transaktion, das
Dokument bleibt strukturell unverändert. **Grenzfall 14 ist damit durch Bibliotheks-Architektur
bereits sicher — ein E2E-Test (Abschnitt 7.2) verifiziert das zusätzlich am echten Browser statt
es nur zu unterstellen.**

**Wichtiger Gegen-Beleg zur Mobile-Zuverlässigkeit (Req Zugriffsweg 7/Grenzfall 20):**
`handlers.beforeinput` (`prosemirror-view/dist/index.js`, ca. Zeile 3906–3925) enthält einen
gezielten Workaround für einen Chrome-Android-Bug, bei dem Backspace nach einem
nicht-editierbaren Node fehlschlägt — dieser Pfad prüft aber `let { $cursor } = view.state.selection`
und wirkt nur, wenn ein `$cursor` existiert. Eine `NodeSelection` (Bild) hat **kein** `$cursor`
(nur `TextSelection` hat dieses Feld) — der Workaround greift für eine Bild-Selektion also
**nicht**. Das ist der konkrete, im Bibliotheks-Quellcode nachweisbare Grund, warum sich dieser
Plan (Abschnitt 3.3) für einen **Pflicht**-Toolbar-Button statt eines rein optionalen entscheidet.

---

## 3. Zielarchitektur und Entscheidungen

### 3.1 CSS für `.ProseMirror-selectednode` — eigene Regel statt Fremd-Stylesheet-Import
**Entscheidung:** Eine eigene, knappe CSS-Regel in `src/index.css` statt Import von
`prosemirror-view/style/prosemirror.css`.

**Begründung:** Das Fremd-Stylesheet bringt zusätzliche, hier nicht benötigte bzw. bereits
anders gehandhabte Regeln mit (`white-space: pre-wrap`/`break-spaces` auf `.ProseMirror` selbst,
`.ProseMirror-hideselection`, den `li`-Marker-Umgehungstrick, `img.ProseMirror-separator` für
den internen Gapcursor-Platzhalter). Ein Komplett-Import würde Kaskaden-Kontrolle aus der Hand
geben und könnte mit den bereits in `index.css` vorhandenen `.ProseMirror`-Regeln (Zeile 23–27,
39–42) interagieren, ohne dass ein Mehrwert für **dieses** Feature entsteht. Die einzige laut
Req/DoD tatsächlich geforderte Regel ist `.ProseMirror-selectednode` selbst — die wird 1:1 aus
der Bibliothek übernommen (siehe 1.5), aber isoliert und mit Light/Dark-Bewusstsein (dieses Repo
nutzt ausschließlich `@media (prefers-color-scheme: dark)`-basiertes Tailwind-Dark-Mode ohne
`data-theme`/Klassen-Toggle — verifiziert: keine Datei im Repo setzt `data-theme` oder toggelt
eine `dark`-Klasse).

Bewusst **nicht** übernommen: die `li.ProseMirror-selectednode`-Sonderregel (betrifft die
Selektion eines ganzen Listenpunkts als Node, nicht die eines Bildes darin — außerhalb des
Scopes dieses Features).

### 3.2 `deleteImage`/`isImageSelected` — dünner, benannter Wrapper statt Neuimplementierung
**Entscheidung:** Kein Rebinding von `Delete`/`Backspace`/`Mod-Backspace` in der eigenen
`keymap({...})` — die bereits durch Abschnitt 2 belegte Korrektheit von `baseKeymap` bliebe
sonst ohne Nutzen riskiert. Stattdessen zwei neue, kleine, unit-testbare Funktionen für den
Toolbar-Button (und für zukünftige Wiederverwendung, z. B. ein Kontextmenü, falls später doch
gewünscht):

```ts
export function isImageSelected(state: EditorState): boolean {
  return state.selection instanceof NodeSelection && state.selection.node.type === wordSchema.nodes.image
}

/**
 * Löscht ein per Klick/Tab selektiertes Bild. Ruft bewusst dieselbe
 * `tr.deleteSelection()`-Operation auf, die `baseKeymap`s `Delete`/`Backspace` für eine
 * Bild-`NodeSelection` bereits nutzen (siehe specs/bild-loeschen-code.md Abschnitt 2) —
 * kein Verhaltensunterschied zur Tastatur, nur ein benannter, kontext-geprüfter
 * Einstiegspunkt für den Toolbar-Button (Req Abschnitt 1, Zugriffsweg 2) und für Unit-Tests.
 */
export function deleteImage(): Command {
  return (state, dispatch) => {
    if (!isImageSelected(state)) return false
    if (dispatch) dispatch(state.tr.deleteSelection())
    return true
  }
}
```

`run()` in `Toolbar.tsx` braucht **keine** Signaturänderung (anders als beim Cut-Feature) — die
Funktion passt exakt in `(state, dispatch) => boolean`.

### 3.3 Toolbar-Button „Bild löschen“ — Pflicht, nicht optional
Siehe Begründung in Abschnitt 2 (Mobile-`beforeinput`-Workaround greift nicht für
`NodeSelection`). Kontextabhängig gerendert (nur sichtbar, wenn `isImageSelected(view.state)`),
mit SVG-Icon statt Emoji (folgt der bereits in `FEATURE-SPEC-DOCX-ODT.md` §20.1 dokumentierten
Icon-Anforderung sowie dem in `specs/ausschneiden-code.md` §3.2 etablierten Muster für neue
Toolbar-Icons in diesem Repo — das bestehende `🖼 Bild`-Label bleibt unverändert, das ist nicht
Gegenstand dieses Plans).

### 3.4 Kontextmenü — bewusst nativ belassen (dokumentierte Entscheidung, Req Zugriffsweg 3)
Kein eigener `contextmenu`-Listener, keine `preventDefault()`. Identische Begründung wie in
`specs/ausschneiden-code.md` §4, Zeile „Kontextmenü“: Rechtsklick auf ein Bild zeigt weiterhin
das native Browser-Menü (z. B. „Bild speichern unter…“), das keinen Dokument-Löschbezug hat.
„Bild löschen“ ist damit **ausschließlich** über Weg 1 (Klick + Entf/Rücktaste) und Weg 2
(Toolbar-Button) erreichbar — das ist eine bewusste, hier dokumentierte Entscheidung, kein
unklarer Zwischenzustand (erfüllt Req Abschnitt 1 Zeile 3 / DoD Punkt 3).

### 3.5 Bestätigungsdialog — bewusst nicht vorhanden (dokumentierte Entscheidung, Req Zugriffsweg 6)
Kein Bestätigungsdialog vor dem Löschen. Referenzverhalten Word/LibreOffice verlangt ebenfalls
keinen — Strg+Z ist das vorgesehene Sicherheitsnetz (durch Abschnitt 2 als exakt
attributerhaltend nachgewiesen). Explizit dokumentiert, damit dies nicht versehentlich als
fehlende Sicherheitsabfrage nachgerüstet wird (Req DoD Punkt 3).

### 3.6 `src/formats/docx/*`, `src/formats/odt/*` — keine Produktionscode-Änderung
Begründung: Abschnitt 1.6 (ImageCollector-Architektur baut bei jedem Export aus dem aktuellen
Dokumentbaum neu auf, kein sitzungsübergreifender Zustand). Es werden **ausschließlich neue
Tests** ergänzt (Abschnitt 7.3), die genau das beweisen, was Req Abschnitt 0 als „muss noch
durch einen echten Test verifiziert werden“ einstuft — keine Annahme ohne Beleg.

### 3.7 `schema.ts` — optionale, verhaltensneutrale Klarstellung (empfohlen, nicht zwingend)
Der `image`-NodeSpec (Zeile 45–72) verlässt sich auf den impliziten ProseMirror-Default
`selectable: true`. Empfehlung: `selectable: true` explizit ergänzen, analog zur bereits im
selben Schema vorhandenen Konvention bei `hard_break` (Zeile 38: `selectable: false`), damit die
Absicht „dieser Node ist bewusst selektierbar“ im Code sichtbar und nicht nur implizit durch
Abwesenheit eines Feldes ist. **Reine Dokumentations-Änderung ohne Verhaltensunterschied** (der
Default ist bereits `true`) — kein Blocker, kann auch weggelassen werden.

```ts
image: {
  group: 'block',
  selectable: true, // Grundlage für Klick-Markierung + Entf/Rücktaste, siehe specs/bild-loeschen-code.md
  attrs: { ... },
  ...
},
```

---

## 4. Dateigenaue Änderungen

### 4.1 `src/index.css` (ändern)
Ergänzen nach der bestehenden `.ProseMirror img`-Regel (nach Zeile 42):

```css
/* Sichtbares Auswahl-Feedback für eine NodeSelection (aktuell nur per Klick auf ein
   Bild erreichbar, da `hard_break` `selectable: false` setzt und keine andere
   Node-Art im normalen Bedienfluss als NodeSelection selektiert wird). Die Klasse
   wird von prosemirror-view selbst gesetzt (`selectNode()`/`deselectNode()`), bringt
   aber ohne dieses Repo-eigene Stylesheet keinerlei CSS mit — siehe
   specs/bild-loeschen-code.md Abschnitt 1.5/3.1. Farbwert entspricht dem Bibliotheks-
   Default (`prosemirror-view/style/prosemirror.css`), hier bewusst separat gepflegt
   statt das ganze Fremd-Stylesheet zu importieren. */
.ProseMirror-selectednode {
  outline: 2px solid #3b82f6;
  outline-offset: 1px;
}

@media (prefers-color-scheme: dark) {
  .ProseMirror-selectednode {
    outline-color: #60a5fa;
  }
}
```

### 4.2 `src/formats/shared/schema.ts` (optional, siehe 3.7)
Ein-Zeilen-Ergänzung `selectable: true,` im `image`-NodeSpec. Kein Pflichtbestandteil.

### 4.3 `src/formats/shared/editor/commands.ts` (ändern)
Import-Ergänzung am Dateianfang: `NodeSelection` aus `'prosemirror-state'` (bereits `EditorState`
importiert, `Command` bereits importiert via `type Command`? — aktuell **nicht** importiert,
siehe Zeile 1: nur `Command, EditorState` als Typen aus `'prosemirror-state'`; `NodeSelection`
muss als Wert (nicht nur Typ) zusätzlich importiert werden, da `instanceof` zur Laufzeit einen
echten Konstruktor braucht):

```ts
import type { Command, EditorState } from 'prosemirror-state'
import { NodeSelection } from 'prosemirror-state'
```

Neue Funktionen ans Dateiende anhängen (nach `clearMarkColor`, Zeile 106):

```ts
export function isImageSelected(state: EditorState): boolean {
  return state.selection instanceof NodeSelection && state.selection.node.type === wordSchema.nodes.image
}

/**
 * Löscht ein per Klick/Tastatur selektiertes Bild. Nutzt bewusst dieselbe
 * `tr.deleteSelection()`-Operation, die `baseKeymap`s `Delete`/`Backspace` bereits für
 * jede Bild-`NodeSelection` verwenden (siehe specs/bild-loeschen-code.md Abschnitt 2) —
 * kein neues Löschverhalten, nur ein benannter, kontext-geprüfter Einstiegspunkt für den
 * Toolbar-Button (Req Abschnitt 1, Zugriffsweg 2) und für Unit-Tests.
 */
export function deleteImage(): Command {
  return (state, dispatch) => {
    if (!isImageSelected(state)) return false
    if (dispatch) dispatch(state.tr.deleteSelection())
    return true
  }
}
```

### 4.4 `src/formats/shared/editor/Toolbar.tsx` (ändern)

1. **Neue Imports**: `isImageSelected`, `deleteImage` aus `./commands`.
2. **Neue Icon-Komponente** (SVG statt Emoji, siehe Begründung 3.3):

```tsx
function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}
```

3. **Neuer, kontextabhängiger Button** — direkt nach dem bestehenden `🖼 Bild`-`<label>`-Block
   (Zeile 241–244), nur gerendert, wenn ein Bild aktuell selektiert ist:

```tsx
{isImageSelected(view.state) && (
  <button
    type="button"
    title="Bild löschen"
    aria-label="Bild löschen"
    onMouseDown={(e) => {
      e.preventDefault()
      run(view, deleteImage())
    }}
    className="px-2 py-1 rounded text-sm border border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
  >
    <TrashIcon />
  </button>
)}
```

Kein Umbau von `run()` nötig (siehe 3.2). Die Sichtbarkeit aktualisiert sich automatisch bei
jeder Selektionsänderung, weil `WordEditor.tsx`s `dispatchTransaction` bei **jeder** Transaktion
`forceRender` aufruft (Zeile 97) und `Toolbar` damit bei jedem Klick/jeder Tastatureingabe neu
mit dem aktuellen `view.state` gerendert wird — keine zusätzliche Zustandsverwaltung nötig.

### 4.5 `src/formats/shared/editor/WordEditor.tsx` (minimal ändern — nur Kommentar)
Kein funktionaler Eingriff (siehe 3.2: `Delete`/`Backspace`/`Mod-Backspace` bleiben
unverändert `baseKeymap`-gesteuert). Ergänzt wird lediglich ein dokumentierender Kommentar
oberhalb der `EditorView`-Konstruktion, analog zu `specs/ausschneiden-code.md` §3.3.4, der die
in Abschnitt 3.4/3.5 getroffenen Entscheidungen im Code selbst nachvollziehbar macht:

```ts
// Bild löschen: Delete/Backspace/Mod-Backspace laufen bewusst weiterhin über den
// generischen baseKeymap-Fallback (deleteSelection) — siehe specs/bild-loeschen-code.md
// Abschnitt 2 für die Verifikation, dass das für alle Grenzfälle bereits korrekt ist.
// Rechtsklick "Bild löschen": bewusst kein eigenes Kontextmenü, natives Browser-Menü
// bleibt erreichbar (Entscheidung siehe specs/bild-loeschen-req.md Abschnitt 1, Zeile 3,
// Begründung specs/bild-loeschen-code.md Abschnitt 3.4).
```

### 4.6 `src/formats/docx/*`, `src/formats/odt/*` — keine Änderung
Begründung Abschnitt 3.6. Nur neue Tests (Abschnitt 7.3).

---

## 5. Zugriffswege — finaler Soll-Zustand (Req Abschnitt 1/5)

| # | Zugriffsweg | Entscheidung | Code-Ort |
|---|---|---|---|
| 1 | Klick markieren (sichtbar) + Entf/Rücktaste | CSS-Fix macht Markierung sichtbar; Löschen bleibt generischer `baseKeymap`-Pfad, durch Abschnitt 2 verifiziert korrekt | `index.css` §4.1, keine Änderung an `WordEditor.tsx`-Keymap |
| 2 | Kontextabhängiger Toolbar-Button | **Neu bauen**, Pflicht wegen Mobile-Unsicherheit (Abschnitt 2/3.3) | `Toolbar.tsx` §4.4, `commands.ts` §4.3 |
| 3 | Rechtsklick-Kontextmenü | **Bewusst nativ belassen**, dokumentiert | `WordEditor.tsx` §4.5 (Kommentar) |
| 4 | Mod-Backspace | **Bereits identisch zu Backspace** (Bibliotheks-Alias, Abschnitt 2), nur testen | kein Code, Test in §7.2 |
| 5 | Drag-Out/Abbruch | **Strukturell sicher** durch `prosemirror-view`-Architektur (Abschnitt 2), nur testen | kein Code, Test in §7.2 |
| 6 | Bestätigungsdialog | **Bewusst nicht vorhanden**, dokumentiert | keine Änderung, dokumentiert in §3.5 |
| 7 | Mobile/Touch | Toolbar-Button (#2) ist der verlässliche Weg; Tastatur-Weg zusätzlich, aber mit dokumentiertem Risiko (Abschnitt 2) | `Toolbar.tsx`, Test in §7.2 auf allen 3 Playwright-Projekten |

---

## 6. Grenzfälle-Mapping (Req Abschnitt 3, vollständig)

| # | Grenzfall | Status nach Abschnitt 2 | Verbleibender Test-Bedarf |
|---|---|---|---|
| 1 | Text vor/nach Bild bleibt erhalten | **Verifiziert** (Sonde) | E2E-Wiederholung am echten DOM (§7.2 Testfall 2) |
| 2 | Bild einziges Element → leerer Absatz bleibt | **Verifiziert** (Sonde) | E2E-Bestätigung + Editierbarkeits-Check (§7.2) |
| 3 | Bild am Dokumentanfang | **Verifiziert** (Sonde) | E2E (§7.2 Grenzfalltest) |
| 4 | Bild am Dokumentende | **Verifiziert** (Sonde) | E2E (§7.2 Grenzfalltest) |
| 5 | Mehrere Bilder, mittleres löschen | **Verifiziert** (Sonde) | E2E mit echten Dateien (§7.2 Testfall 5) |
| 6 | Identische `data:`-URLs, eines löschen | **Verifiziert auf Editor-Ebene** (Sonde) | Export-Dedupe-Test (§7.3, DOCX+ODT) |
| 7 | Bild in Tabellenzelle | **Verifiziert** (Sonde) | E2E (§7.2 Testfall 6) + Export-Roundtrip (§7.3) |
| 8 | Bild als einziger Listenpunkt-Inhalt | **Verifiziert** (Sonde, inkl. Schema-Zwang) | E2E-Bestätigung (§7.2) |
| 9 | Verschachtelte Tabelle mit Bild | **Nicht separat sondiert** (strukturell gleicher Mechanismus, aber Tiefe nicht getestet) | **Pflicht-E2E-Test** (§7.2 Zusatztest) |
| 10 | Sehr großes Bild | Reine Performance-Frage, kein Logik-Risiko | E2E-Sanity-Test mit großer Base64-Nutzlast (§7.2) |
| 11 | Löschen + Undo | **Verifiziert** (Sonde, exakte Attribut-Wiederherstellung) | E2E-Bestätigung (§7.2 Testfall 3) |
| 12 | Undo + Redo | **Verifiziert** (Sonde) | E2E-Bestätigung (§7.2 Testfall 4) |
| 13 | Selection-Sync-Regression × Bild löschen | **Nicht sondiert** (braucht echtes DOM/Klick-Choreographie, `reconcileSelectionOnClick` ist DOM-getrieben) | **Pflicht-E2E-Test** (§7.2 Testfall 7) |
| 14 | Abgebrochener Drag löscht nicht | **Strukturell belegt** (Bibliotheks-Quellcode, Abschnitt 2) | E2E-Sanity-Test (§7.2 Testfall 9) |
| 15 | Entf ohne Bild-Selektion | Trivial, aber Pflicht laut DoD | E2E-Test (§7.2 Testfall 8) |
| 16 | Bild direkt nach Einfügen löschen | **Verifiziert** (Sonde) | E2E-Bestätigung (§7.2) |
| 17 | Reale Fremddatei, ein Bild löschen | Kann nur mit echter Datei/echtem Browser geprüft werden | **Pflicht-E2E-Test** mit `VariousPictures.docx`/`images.odt` (§7.2 Testfall 12, §7.3) |
| 18 | Löschen, dann neues Bild einfügen | Trivial durch `insertImage`s frischen `.create()`-Aufruf (keine gemeinsame mutable Attributquelle) | Kein Extra-Test zwingend, aber in §7.2 als Zusatztest aufgenommen |
| 19 | Track-Changes-Abhängigkeit | **Explizit außerhalb des Scopes** (Phase 3 nicht gebaut) | keiner |
| 20 | Mobile/Touch | Toolbar-Button ist Pflichtweg (Abschnitt 2/3.3) | E2E auf allen 3 Playwright-Projekten (§7.2) |

---

## 7. Tests

### 7.1 Neu: `src/formats/shared/editor/__tests__/commands.test.ts`
Erste Unit-Tests für `commands.ts` überhaupt. Deckt die neuen Funktionen sowie die in
Abschnitt 2 sondierten, jetzt dauerhaft im Repo abzusichernden Fakten ab:

- `isImageSelected(state)`: `false` bei kollabierter `TextSelection`; `false` bei
  `TextSelection` mit Range; `true` bei `NodeSelection` auf ein `image`; `false` bei
  `NodeSelection` auf einen anderen Node-Typ (z. B. `table`, falls konstruierbar, sonst
  `paragraph` über `NodeSelection.create` an geeigneter Position).
- `deleteImage()(state, dispatch)`: `false` und **kein** Dispatch, wenn keine
  Bild-`NodeSelection` vorliegt (Guard, entspricht Req Grenzfall 15/DoD Punkt 8 auf
  Befehlsebene). `true` und korrekt geleerte/aufgefüllte Struktur bei vorhandener
  Bild-`NodeSelection` (Fälle: einziges Dokumentelement → Ersatzabsatz; Text davor/danach
  bleibt; Tabellenzelle; Listenpunkt).
- `deleteImage()(state, undefined)`: reine Verfügbarkeitsabfrage, `true` zurück ohne
  Seiteneffekt (kein `dispatch`-Aufruf möglich, da `dispatch` `undefined` ist — Guard
  `if (dispatch)` verhindert das).
- Undo/Redo-Attributerhalt: `history()`-Plugin + `deleteImage` + `undo`/`redo` aus
  `prosemirror-history` → Bild mit `src`/`alt`/`width`/`height` exakt wiederhergestellt.
- Regressionsschutz für Abschnitt 2: `Mod-Backspace`/`Backspace` auf einer Bild-`NodeSelection`
  über `baseKeymap` liefern identisches Ergebnis (dokumentiert die Bibliotheks-Alias-Erkenntnis
  dauerhaft als Test statt nur als einmalige Sonde).

### 7.2 Neu: `tests/e2e/image-delete.spec.ts`
Nach dem Vorbild von `tests/e2e/selection-regression.spec.ts` und `docx.spec.ts`/`odt.spec.ts`
(echter `filechooser`/`setInputFiles`-Flow, `.ProseMirror`-Locator, `page.getByTitle`/
`getByRole`). Läuft automatisch auf allen 3 `playwright.config.ts`-Projekten (Desktop
Chrome/Mobile/Tablet). Hilfsfunktion am Dateianfang:

```ts
function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
async function insertTinyImage(page: Page) {
  const fileInput = page.locator('input[type="file"][accept="image/*"]')
  await fileInput.setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: TINY_PNG_BUFFER })
}
```

(`TINY_PNG_BUFFER` = `Buffer.from(TINY_PNG_BASE64, 'base64')`, gleicher 1×1-PNG wie in den
Unit-Tests, damit alle Ebenen dieselbe Test-Nutzlast teilen.)

Testfälle (Nummerierung folgt Req Abschnitt 6, DOCX-Karte als primäres Beispiel, ODT-Karte für
die format-spezifischen Rundreise-Fälle in §7.3 mitverwendet):

1. **Pflicht-Vorbedingung (DoD Punkt 1):** Bild einfügen → Bild anklicken → assert
   `image.locator` hat Klasse `ProseMirror-selectednode` **und** berechneter Stil
   (`toHaveCSS('outline-style', 'solid')`, `outline-width` ≠ `'0px'`) zeigt tatsächlich einen
   sichtbaren Rahmen — **nicht nur** die Klasse prüfen, sonst wird exakt die in Req Abschnitt 0
   beschriebene Lücke (Klasse gesetzt, aber unsichtbar) nicht aufgedeckt. Danach `Delete` →
   Bild verschwindet (`page.locator('.ProseMirror img')` Anzahl 0).
2. Text vor und nach dem Bild eingeben, Bild löschen → beide Textteile bleiben exakt erhalten.
3. Bild einfügen, löschen, `Strg+Z` → Bild erscheint mit identischen Attributen (Alt-Text,
   sofern zuvor gesetzt) an ursprünglicher Position, Text unverändert.
4. `Strg+Z`, danach `Strg+Y` → Bild wird erneut identisch entfernt.
5. Mehrere Bilder einfügen, mittleres per Klick löschen → nur dieses verschwindet, die anderen
   bleiben unverändert und unterscheidbar (unterschiedliche Testbilder mit unterschiedlicher
   Größe/Farbe verwenden, damit „unterscheidbar“ nicht nur behauptet, sondern per
   Screenshot-Locator-`src`-Vergleich geprüft wird).
6. Bild in eine Tabellenzelle einfügen, dort löschen → nur Bild verschwindet, Zelle/Tabelle
   unverändert (`page.locator('.ProseMirror td').count()` vorher/nachher gleich).
7. **Pflicht-Regressionstest** (Req Abschnitt 2.7/3.13, dauerhaft in der Suite): Text vor/nach
   Bild eingeben → Bild anklicken (Selektion) → Klick zur Neupositionierung im Text → `Enter`
   → weiter tippen → Dokument bleibt korrekt, kein Datenverlust (analog zum bestehenden Muster
   in `selection-regression.spec.ts`, hier mit einer Bild-`NodeSelection` als auslösendem
   Zustand statt einer `AllSelection`).
8. `Delete`-Taste ohne jede Bild-Selektion (Cursor im normalen Fließtext) → nur normaler Text
   wird gelöscht, kein Bild betroffen, keine Konsolen-Exception (Helper wie in
   `specs/ausschneiden-code.md` §6.2 vorgeschlagen: `page.on('pageerror', ...)` +
   `console`-Fehler sammeln und am Testende assertieren).
9. Bild per `page.mouse` anfassen (`dragstart` auslösen), dann `Esc` bzw. Drop außerhalb des
   `.ProseMirror`-Elements → Bild bleibt unverändert bestehen (`page.locator('.ProseMirror img')`
   Anzahl unverändert, `src`-Attribut unverändert).
10. Toolbar-Button „Bild löschen“: unsichtbar/nicht vorhanden ohne Bild-Selektion
    (`await expect(page.getByTitle('Bild löschen')).toHaveCount(0)`), erscheint nach Klick auf
    ein Bild, Klick darauf löscht identisch zu Weg 1.
11. `Mod-Backspace` auf einer Bild-`NodeSelection` → identisches Ergebnis zu einfachem
    Backspace (bestätigt Abschnitt 2 am echten Browser statt nur an der Bibliothek).
12. Reale Fixture-Datei (`tests/fixtures/external/docx/VariousPictures.docx`) importieren,
    eines der mehreren Bilder per Klick + Entf löschen → alle übrigen Bilder bleiben sichtbar
    unverändert (Bild-Anzahl vorher `N`, nachher `N-1`, verbleibende `src`-Werte identisch zu
    vorher außer dem gelöschten).
13. Sehr großes Bild (mehrere MB Base64-Nutzlast, z. B. programmatisch generiertes großes PNG)
    einfügen und löschen → kein Timeout, keine Konsolen-Exception, UI bleibt responsiv
    (`page.waitForFunction` mit großzügigem Timeout statt Default).
14. **Pflicht-Zusatztest, Grenzfall 9:** Tabelle einfügen, in eine Zelle klicken, dort erneut
    „Tabelle einfügen“ klicken (verschachtelt), in eine Zelle der inneren Tabelle klicken, Bild
    einfügen, Bild anklicken, löschen → kein Absturz, äußere und innere Tabellenstruktur
    (Zeilen-/Spaltenzahl beider Ebenen) bleibt unverändert.
15. Bild löschen, danach an derselben Stelle ein **neues** Bild einfügen → neues Bild ersetzt
    korrekt die Position, kein wiederverwendeter Alt-Text/keine wiederverwendeten Attribute des
    gelöschten Bildes (unterschiedliche Testdateien mit unterschiedlichem `alt`/Dateinamen
    verwenden).
16. Wird durch die Playwright-Projekt-Matrix automatisch auf „Mobile“ (Pixel 7) und „Tablet“
    (iPad Mini) mitausgeführt (Testfälle 1, 2, 7, 10); zusätzlich ein expliziter Kommentar im
    Testfile (analog zu `specs/ausschneiden-code.md` §6.2 Testfall 13), der festhält: Playwrights
    Geräte-Projekte emulieren Viewport/User-Agent/Touch-Fähigkeit auf derselben Browser-Engine,
    **nicht** die tatsächliche On-Screen-Tastatur eines physischen Geräts — `page.keyboard.press`
    erzeugt auf allen 3 Projekten dasselbe synthetische Tastatur-Event. Die in Abschnitt 2
    dokumentierte Mobile-Unsicherheit (Chrome-Android-`beforeinput`-Workaround greift nicht bei
    `NodeSelection`) bleibt daher ein **auf echten Geräten** zu verifizierendes Restrisiko — der
    Toolbar-Button (Testfall 10) ist der einzige Weg, der hier tatsächlich end-to-end als
    tap-basiert (nicht tastatur-abhängig) nachgewiesen wird, und genau deshalb in Abschnitt 3.3
    zur Pflicht erklärt statt nur empfohlen.

### 7.3 Neu: `src/formats/docx/__tests__/image-deletion.test.ts` und
`src/formats/odt/__tests__/image-deletion.test.ts`
Reader/Writer-Ebene (kein Editor/Browser nötig) — verifiziert direkt am erzeugten Zip
(`JSZip.loadAsync`), dass eine bereits „gelöscht“ vorliegende Dokumentstruktur (d. h. ein
`WordDocumentContent`, bei dem der `image`-Knoten schlicht nicht mehr im JSON enthalten ist —
exakt der Zustand, den der Editor nach einer Löschung produziert, siehe §7.1) beim Export
**keine** Bild-Spuren mehr hinterlässt. Ergänzt die in §7.2 geprüfte Editor-seitige Löschung um
die formatspezifische Zip-Ebene, ohne beides zu vermischen (zwei unabhängige Schichten, siehe
Req Abschnitt 0 letzter Punkt).

**DOCX** (`image-deletion.test.ts`):
1. Dokument mit Bild zwischen zwei Absätzen exportieren → Zip enthält `word/media/image1.png`,
   `[Content_Types].xml` enthält `image/png`. Dasselbe Dokument **ohne** den Bild-Knoten
   exportieren → `[Content_Types].xml` enthält **keinen** `image/*`-Eintrag mehr,
   `zip.file(/word\/media\//)` liefert ein leeres Array, `word/_rels/document.xml.rels` enthält
   **keine** `Relationship` auf `media/`. Reimport (`readDocx`) des zweiten Zips → kein
   `image`-Knoten im Ergebnis, beide Textabsätze vollständig vorhanden (deckt Req Abschnitt 4.2
   Testfall 1 auf Reader/Writer-Ebene ab).
2. Zwei Bilder mit identischer `data:`-URL, nur eines im JSON entfernt (simuliert Löschen des
   einen) → verbleibendes Bild bleibt korrekt referenziert (`alt`, Base64-Inhalt identisch),
   Media-Ordner enthält weiterhin genau eine Datei (Dedupe-Konsequenz, Req Grenzfall 6).
3. Alle Bilder eines mehrbildrigen Dokuments entfernt → `images.all()` liefert leeres Array,
   `[Content_Types].xml` hat keine Bild-`Default`-Einträge, restlicher Textinhalt bleibt exakt
   erhalten (Req Abschnitt 4.2 Testfall 6).
4. Bild in einer Tabellenzelle entfernt (Zelle bleibt mit leerem Absatz) → exportierte
   `<w:tbl>`-Struktur (Zeilen-/Spaltenzahl, `gridSpan`) bleibt unverändert, keine verwaiste
   Medien-Referenz (Req Abschnitt 4.2 Testfall 4).

**ODT** (`image-deletion.test.ts`): identische vier Fälle, geprüft gegen
`META-INF/manifest.xml` (kein `<manifest:file-entry>` mit `Pictures/imageN.*` mehr) und
Abwesenheit der Datei selbst im Zip (`zip.file('Pictures/imageN.png')` → `null`) statt
`[Content_Types].xml`/`word/media/` (Req Abschnitt 4.2 Testfall 2).

### 7.4 E2E-Rundreise (ergänzt in `tests/e2e/image-delete.spec.ts`, Req Abschnitt 4.2)
Analog zum bestehenden Muster in `docx.spec.ts`/`odt.spec.ts` (Upload/„Neu erstellen“ →
Bild einfügen → löschen → „Exportieren“ → `page.waitForEvent('download')` → mit `JSZip` den
heruntergeladenen Inhalt prüfen → erneut über den Datei-Input hochladen, um den Reimport zu
verifizieren):

1. DOCX: Neues Dokument, Bild einfügen, löschen, exportieren → Zip-Prüfung (siehe §7.3, jetzt
   aber end-to-end durch die echte UI erzeugt, nicht nur durch direkten `writeDocx`-Aufruf) →
   heruntergeladene Datei erneut hochladen → Editor zeigt kein Bild, Text vollständig.
2. Dieselbe Sequenz für ODT.
3. Mehrere Bilder, eines löschen → Export → Reimport → korrektes Bild fehlt, Rest unverändert.
4. Bild in Tabellenzelle löschen → Export → Reimport → Zelle/Tabelle bleibt gültig.
5. Bild löschen → Undo → Export → Reimport → Bild ist **weiterhin vorhanden** (bestätigt, dass
   Undo den Exportzustand tatsächlich beeinflusst, nicht nur die Anzeige — Req Abschnitt 4.2
   Testfall 5).
6. Alle Bilder nacheinander löschen → Export → Reimport → keine Bild-Referenzen mehr, Text
   vollständig, Datei bleibt valide.
7. Cross-Format: ODT mit Bild importieren (`buildSampleOdt`-artige Hilfsfunktion oder echte
   Fixture) → Bild löschen → als DOCX exportieren → reimportieren → Bild bleibt entfernt.
8. Cross-Format umgekehrt: DOCX → Bild löschen → als ODT exportieren → reimportieren.
9. Doppelte Rundreise (DOCX → Editor/Löschen → ODT → Editor → DOCX) → Bild bleibt nach zwei
   Konvertierungen entfernt.
10. Reale Fixture (`VariousPictures.docx`) importieren, ein mittleres Bild löschen → Export →
    Reimport → genau das erwartete Bild fehlt, alle anderen bleiben unverzerrt sichtbar (Req
    Abschnitt 4.2 Testfall 10).

**Hinweis zur Testinfrastruktur:** wie in `specs/ausschneiden-code.md` §6.3 vermerkt, sind
`buildSampleDocx()`/`buildSampleOdt()` aktuell lokal in `docx.spec.ts`/`odt.spec.ts` dupliziert.
Für die Cross-Format-Fälle (7./8./9.) hier entweder erneut duplizieren (konsistent mit dem
bisherigen Stil) oder gemeinsam mit dem in `ausschneiden-code.md` vorgeschlagenen Auslagern nach
`tests/e2e/fixtures/buildSampleDocuments.ts` zusammenlegen, falls dieses zu dem Zeitpunkt bereits
existiert — sonst unabhängig in `image-delete.spec.ts` neu aufbauen, um diesen Plan nicht von der
Umsetzungsreihenfolge des Cut-Features abhängig zu machen.

---

## 8. Abnahmekriterien — Abgleich mit Req Abschnitt 8

1. **Sichtbares Auswahl-Feedback** → §4.1 (CSS), Pflicht-Test §7.2 Testfall 1 prüft tatsächliche
   berechnete Stile, nicht nur die Klasse.
2. **Entf/Rücktaste entfernt Bild samt Anker, kein Nebeneffekt auf Text** → durch Abschnitt 2
   bereits am echten Bibliothekscode verifiziert, zusätzlich E2E in §7.2 Testfall 2.
3. **Jeder Zugriffsweg dokumentiert** → §5.
4. **Sonderfälle einzeln getestet** (einziges Element, Tabellenzelle, Liste) → §6, §7.2
   Testfälle 6/8, §7.1.
5. **Alle Grenzfälle abgedeckt oder begründet ausgenommen** → §6 vollständige Tabelle.
6. **Pflicht-Regressionstest Selection-Sync × Bild löschen** → §7.2 Testfall 7, dauerhaft in
   `tests/e2e/image-delete.spec.ts`.
7. **Alle Rundreise-Testfälle DOCX+ODT grün, inkl. Verwaiste-Ressourcen-Prüfung** → §7.3
   (Reader/Writer-Ebene) + §7.4 (echte UI-Ende-zu-Ende-Ebene) — zwei sich ergänzende, nicht
   redundante Schichten.
8. **Kein stiller Datenverlust, keine Konsolen-Exception** → Konsole-Helper in §7.2, Undo-Test
   in §7.1/§7.2/§7.3 Testfall 5.
9. **Backlog-Status-Korrektur:** Nach Umsetzung dieses Plans **und** grünen Tests aus §7 kann
   der Backlog-Eintrag `bild-loeschen` (`specs/FEATURE-BACKLOG.md` Zeile 215) weiterhin
   „vorhanden“ bleiben. Wird nur ein Teil umgesetzt — insbesondere wenn die CSS-Regel aus §4.1
   fehlt oder die Pflicht-Tests aus §7.2 (Testfälle 1, 7, 14) nicht grün sind — ist der Status
   auf „teilweise“ zu korrigieren, mit den fehlenden Teilen als eigene Nachfolge-Punkte. Das ist
   eine Entscheidung für nach der Umsetzung, nicht Teil dieses Plans.

---

## 9. Offene Risiken / künftige Abhängigkeiten

- **Mobile-Tastatur-Restrisiko** (Abschnitt 2, letzter Beleg): Der Chrome-Android-Workaround in
  `prosemirror-view` greift nachweislich nicht für eine Bild-`NodeSelection`. Playwrights
  Geräte-Projekte emulieren nur Viewport/UA/Touch, nicht die reale On-Screen-Tastatur-Pipeline
  eines physischen Geräts (siehe §7.2 Testfall 16) — das verbleibt ein durch **echte
  Geräte-QA** zu schließendes Restrisiko, strukturell durch den Pflicht-Toolbar-Button (§3.3,
  §4.4) bereits abgesichert, aber nicht per Playwright vollständig beweisbar.
- **Icon-Inkonsistenz bestehen lassen:** Der neue „Bild löschen“-Button nutzt ein SVG-Icon, der
  bestehende „🖼 Bild“-Einfügen-Button bleibt Emoji-basiert — das ist eine bewusste
  Scope-Entscheidung dieses Plans (nur die neue Funktion, keine Icon-Überarbeitung des gesamten
  Toolbars), aber ein sichtbarer Stilbruch, der in einer künftigen, dedizierten
  Icon-Überarbeitung mit adressiert werden sollte.
- **Track-Changes-Abhängigkeit** (Req Grenzfall 19): Sobald Phase 3
  (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13) Änderungsverfolgung einführt, muss `deleteImage`
  (und der generische `baseKeymap`-Pfad!) um eine Prüfung „ist Aufzeichnung aktiv?“ erweitert
  werden, die eine Bild-Löschung als Änderung markiert statt sie sofort auszuführen — betrifft
  dann auch den bislang unveränderten `Delete`/`Backspace`-Pfad und lässt sich nicht mehr allein
  in `deleteImage()` lösen. Nicht Teil dieses Plans, hier nur nachvollziehbar referenziert.
- **Cross-Format-Test-Hilfsfunktionen-Duplikation:** siehe Hinweis am Ende von §7.4 — abhängig
  vom Umsetzungsstand des Cut-Features (`specs/ausschneiden-code.md`), ggf. gemeinsam auslagern.
- **`bild-groesse-aendern`/`bild-alt-text`-Wechselwirkung:** Sobald Bildgröße/Alt-Text-Bearbeitung
  eigene UI bekommen (aktuell laut Backlog „fehlt“ bzw. „teilweise“), sollte der in §7.2
  Testfall 10 vorgesehene Toolbar-Kontextbereich um diese Funktionen erweitert werden, ohne den
  hier gebauten „Bild löschen“-Button zu verdrängen — beide sollten nebeneinander sichtbar sein,
  wenn ein Bild selektiert ist. Kein Handlungsbedarf jetzt, nur als Platzierungs-Hinweis für
  spätere Umsetzung festgehalten.
