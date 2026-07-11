# Anforderungsdatei: Feature „Absatzformat-Dropdown (Standard/Überschrift 1–6)“

Status: **Laut Feature-Backlog „vorhanden“ — gilt als nicht vertrauenswürdig, muss
vollständig verifiziert werden**, bevor der Status im Backlog (`FEATURE-BACKLOG.md`,
Abschnitt 2.4 „Formatvorlagen (Styles)“, Slug `absatzformat-dropdown`, Priorität 1)
bestätigt werden darf.

Kurzbeschreibung (Backlog): „Weist dem Absatz eine Formatvorlage aus einer Liste zu.“

Geltungsbereich: Diese Datei konkretisiert für das Einzelfeature „Absatzformat-Dropdown“,
was `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 4 („Absatzformatierung“, Zeile „Formatvorlagen:
Standard, Überschrift 1–6 (mind.), Auswahl über Dropdown“) und Abschnitt 17
(Menü-/Toolbar-Übersicht, Zeile 1 „Absatzformat-Dropdown | vorhanden | siehe Abschnitt 4“)
nur pauschal fordern. Sie gilt für **beide** unterstützten Formate (DOCX und ODT) über
den gemeinsamen ProseMirror-Editor (`src/formats/shared/editor/WordEditor.tsx`,
`src/formats/shared/schema.ts`, Node `heading`), inklusive Rundreise (Datei hochladen →
unverändert exportieren → Ergebnis entspricht inhaltlich dem Original) und inklusive
Cross-Format-Konvertierung.

**Hinweis zu Code-Verweisen:** Alle unten genannten Fundstellen sind zuerst über den
**Symbolnamen** (Funktion/Node/Element) verankert und zusätzlich mit der zum Zeitpunkt
dieser Anforderung gültigen Zeilennummer versehen. Der Code dieses Repos wird pro
Pipeline-Durchlauf neu erzeugt; **Zeilennummern können driften — maßgeblich ist der
Symbolname**, nicht die Zeile.

**Ausdrücklich nicht Teil dieser Datei** (eigene Backlog-Einträge, andere Slugs):
- `formatvorlagen-katalog` (Schnellformate-Galerie) — fehlt komplett, nicht Gegenstand hier.
- `formatvorlage-erstellen` / `zeichenformatvorlage` — fehlen komplett, nicht Gegenstand hier.
- Zeichenformatierung „Fett“ selbst — dafür existiert `fett-req.md`; hier wird nur die
  **Wechselwirkung** zwischen Absatzformat und Fett behandelt (Abschnitt 2.9), nicht die
  Fett-Funktion an sich.
- Ausrichtung, Zeilenabstand, Einzüge als eigenständige Funktionen — eigene Anforderungen
  laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 4; hier wird nur die **Wechselwirkung** mit
  dem Absatzformat-Wechsel behandelt (Abschnitt 2.5), weil genau dort ein konkreter
  Befund vorliegt.
- Kopf-/Fußzeile bearbeiten (`kopfzeile-bearbeiten-req.md`, `fusszeile-bearbeiten-req.md`)
  — eigener Slug. **Für den aktuellen Verifikationsauftrag relevant, weil daraus eine
  Scope-Grenze folgt:** `DocumentWorkspace.tsx`/`docx.ts`/`odt.ts` binden `WordEditor`
  (und damit `Toolbar`/das Absatzformat-Dropdown) ausschließlich an `doc.content.body`;
  Kopf- und Fußzeile werden zwar korrekt gelesen/geschrieben (siehe Abschnitt 0,
  Befund 7), besitzen nach aktuellem Code-Stand aber **keine eigene UI-Bearbeitungsfläche**
  — das Dropdown kann dort also schon strukturell nicht bedient werden, das ist keine
  gesonderte Lücke *dieses* Features. Sollte die parallel laufende Kopf-/Fußzeilen-Arbeit
  eine eigene editierbare Fläche einführen, die ebenfalls `WordEditor`/`Toolbar`
  wiederverwendet, gilt diese Anforderungsdatei automatisch auch dort (gleicher Code-Pfad,
  gleiches Schema) und ist dann um einen entsprechenden Testfall zu ergänzen.

---

## 0. Ist-Stand laut Code-Analyse (Befund vor Verifikation)

Anders als bei mehreren anderen „vorhanden“-Einträgen (z. B. `ausschneiden-req.md`)
existiert hier tatsächlich ein echtes, benanntes, einzeln bedienbares UI-Element — das
Dropdown ist kein bloßes implizites Browser-Verhalten, und es wird — anders als eine
frühere Fassung dieser Anforderung behauptete — bereits **von echten E2E-Tests bedient**
(siehe Befund 10). Die Verifikation muss sich daher weniger auf „existiert die Funktion
überhaupt“ konzentrieren als auf **subtile, im Code nachweisbare Verhaltens-
Inkonsistenzen**, die bei der bisherigen, nur beiläufigen Testabdeckung (Dropdown als
Hilfsschritt für andere Features) nicht auffallen.

| # | Ort (Symbol, aktuelle Zeile) | Inhalt | Befund |
|---|---|---|---|
| 1 | `Toolbar.tsx`, `<select aria-label="Absatzformat">` (Z. 165–180) | Optionen „Standard“ (`value="normal"`) + „Überschrift 1“–„Überschrift 6“ (`value="1"`…`"6"`), `onChange` ruft `run(view, setHeading(value === 'normal' ? null : Number(value)))` | Echtes, natives `<select>`-Element — funktioniert grundsätzlich per Maus, Tastatur und (nativer Browser-Picker) auf Mobile/Tablet. Deckt genau die geforderten Ebenen 1–6 + Standard ab. |
| 2 | `Toolbar.tsx`, `currentHeadingLevel()` (Z. 114–122); Re-Render via `WordEditor.tsx`, `dispatchTransaction` → `forceRender` (Z. 123) | Liest den Node-Typ an `$from` (Tiefe absteigend): `'normal'`, sobald `paragraph` gefunden wird, sonst `String(node.attrs.level)` der `heading` | Zustand wird an **jeder** Transaktion — also auch reinen Selektionsänderungen — neu berechnet und die Toolbar neu gerendert; reagiert korrekt auf Cursorbewegung. **Aber:** Der Rückgabewert wird 1:1 als `value` des `<select>` gesetzt; für einen Heading mit `level > 6` (siehe Befund 6) gibt es **keine** passende `<option>` → das Dropdown zeigt in diesem Fall keinen der Einträge an. |
| 3 | `setHeading` (`commands.ts`, Z. 40–55): `if (!$from.sameParent($to)) return false` | Wirkt nur, wenn Anfang und Ende der Selektion im selben Block liegen | **Stiller No-Op bei Mehrblock-Selektion.** Eine Selektion über mehrere Absätze/Überschriften hinweg lässt `setHeading` `false` zurückgeben (kein Dispatch, keine Meldung) — anders als `setAlign` (`commands.ts`, Z. 13–27), das per `state.doc.nodesBetween(from, to, …)` über **alle** betroffenen Blöcke iteriert. Diese Asymmetrie zwischen Ausrichtung (mehrblockfähig) und Absatzformat (nur ein Block) ist nirgends dokumentiert und widerspricht vermutlich der Nutzererwartung. |
| 4 | `setHeading` (`commands.ts`, Z. 43): `const attrs = level === null ? undefined : { level, align: 'left' }` | Jeder Wechsel setzt `align` hart auf `'left'` | **Verlust der Ausrichtung bei jedem Formatwechsel.** Beim Wechsel zu einer Überschrift wird `align: 'left'` explizit gesetzt; beim Wechsel zurück zu Standard ist `attrs === undefined`, wodurch `setBlockType` den Node-Default verwendet — der laut Schema (`alignAttr`, `schema.ts` Z. 4) ebenfalls `'left'` ist. Eine zuvor zentrierte/rechtsbündige/Blocksatz-Ausrichtung geht dadurch bei **jedem** Absatzformat-Wechsel verloren. Word/LibreOffice behandeln direkte Ausrichtung üblicherweise als vom Formatvorlagenwechsel unabhängige Direktformatierung. |
| 5 | `list_item` (`schema.ts`, Z. 146–152): `content: 'block+'`; `tableNodes({ cellContent: 'block+' })` (Z. 154) | Listenpunkt **und** Tabellenzelle erlauben an **jeder** Position jeden Block-Typ | **Korrektur gegenüber früherer Fassung:** `list_item` ist `block+` (nicht `'paragraph block*'` — die Änderung ist in `schema.ts` mit einem Kommentar zu realen verschachtelten Listen-Fixtures begründet). Daraus folgt: Eine Überschrift lässt sich **an jeder Position innerhalb eines Listenpunkts** erzeugen — auch am ersten Block. Die früher behauptete Inkonsistenz „erster vs. weiterer Absatz“ **existiert nicht mehr**. Offen bleibt die **fachliche** Frage, ob eine Überschrift innerhalb eines Aufzählungspunkts überhaupt erwünscht ist (in Word/LibreOffice unüblich) und ob eine solche Struktur beim DOCX/ODT-Export sauber rundreist — beides ist **ungetestet**. |
| 6 | `heading.attrs.level` (`schema.ts`, Z. 29): `{ default: 1, validate: 'number' }`; DOCX `headingLevelForStyle` = `outlineLvl + 1` (`docx/reader.ts` Z. 69–76); ODT `Number(outline-level) \|\| 1` (`odt/reader.ts` Z. 257) | **Keine** Begrenzung des Levels auf 1–6 an irgendeiner Stelle | **Neuer Befund: Ebenen > 6 aus Importen werden inkonsistent behandelt.** Word kennt Gliederungsebenen bis 9 (`w:outlineLvl` 0–8 → Level 1–9), ODF bis 10. Ein importierter Heading kann daher `level` 7–10 tragen. Folgen: (a) `toDOM` erzeugt `h7`…`h10` (kein gültiges HTML-Heading); (b) das Dropdown kann den Wert nicht anzeigen (Befund 2); (c) **Export/Rundreise divergiert je Format**: DOCX schreibt `<w:pStyle w:val="Heading7"/>` auf eine **nicht definierte** Formatvorlage (`headingStylesXml` definiert nur 1–6), und beim Reimport scheitert `headingLevelForStyle` (Regex `^Heading\s?([1-6])$`, kein `outlineLvl` vorhanden) → der Absatz wird **als Standard importiert = Ebene verloren**. ODT hingegen schreibt zwar ebenfalls eine undefinierte Stilreferenz, erhält die Ebene aber über das direkt gelesene `text:outline-level` → **Ebene bleibt erhalten**. Diese Asymmetrie plus der DOCX-Datenverlust ist unbemerkt und untestet. |
| 7 | `odt/reader.ts`, `parseAutomaticStyles` (Z. 37–78) wird ausschließlich mit `office:automatic-styles` aufgerufen (Content: Z. 363–364; `styles.xml`-Chrome: Z. 373–374); Heading-Ausrichtung: `styles.paragraphAligns.get(styleName) \|\| 'left'` (Z. 259) | **Nirgends** wird `office:styles` (der gemeinsame/benannte Stil-Container in `styles.xml`) ausgewertet | **Ausrichtung (und weitere Absatzeigenschaften) einer Überschrift, die ihre Formatierung über eine benannte, gemeinsame Formatvorlage bezieht, geht beim ODT-Import still verloren** (Fallback `align: 'left'`) — kein Absturz, aber unbemerkter Informationsverlust bei genau der Art von Datei, die reale LibreOffice-/OpenOffice-Nutzer:innen typischerweise erzeugen (Heading-Formatierung liegt dort in `office:styles`, nicht in einer automatischen Instanz-Formatvorlage). **Text und Gliederungsebene** bleiben erhalten, da `text:outline-level` direkt am `<text:h>` gelesen wird (Z. 257). Analog liest der DOCX-Pfad aus Stil-Definitionen nur `w:outlineLvl`, nicht `w:jc` — dort ist der Effekt aber unkritischer, weil unser Writer die Ausrichtung als direktes `w:jc` schreibt (siehe Abschnitt 4). |
| 8 | `docx/reader.ts`, `parseStylesXml` (Z. 53–67) + `headingLevelForStyle` (Z. 69–76) | Erkennung über `w:outlineLvl` in `styles.xml` **oder** Regex `^Heading\s?([1-6])$` (case-insensitive) auf die Style-ID | Robuster als der ODT-Pfad (liest tatsächlich `styles.xml`), **löst aber `w:basedOn`-Vererbung nicht auf**: Eine Formatvorlage, die per `w:basedOn` von „Heading N“ erbt, aber selbst **kein** `w:outlineLvl` deklariert und deren Style-ID nicht dem Regex entspricht (z. B. eine benutzerdefinierte oder lokalisiert benannte Überschrift-Vorlage), wird als Standard-Absatz importiert = Ebene verloren. Ungetestet gegen reale Word-Dateien. |
| 9 | Export: `headingStylesXml` (`docx/styleDefs.ts`, Z. 9–30, `<w:b/>` + `<w:sz>` je Ebene) und `headingStyleDefs` (`odt/styleRegistry.ts`, Z. 84–93, `fo:font-weight="bold"` + `fo:font-size`) | Jede Überschriftenebene bekommt eine feste Formatvorlage mit hinterlegter Schriftgröße **und** Fettdruck auf Stil-Ebene | Deckt sich mit `fett-req.md` Abschnitt 2.5: Eine Überschrift ist immer fett, unabhängig vom `strong`-Mark am Text. Hier zusätzlich relevant, weil ein Wechsel „Überschrift → Standard“ diese **stil-gebundene** Fettung korrekt entfernt (der gesamte Node-Typ und damit die Stilreferenz wechseln), ein reines Fett-Mark-Toggle das aber nicht könnte (siehe Abschnitt 2.9). |
| 10 | `tests/e2e/clipboard.spec.ts:170–194`; `tests/e2e/clipboard-roundtrip.spec.ts` R-1 (Z. 31–82) / R-2 (Z. 84–104); `tests/e2e/docx.spec.ts:108`; `tests/e2e/odt.spec.ts:89` | Vorhandene E2E-Abdeckung | **Korrektur gegenüber früherer Fassung** (die behauptete, „kein einziger Test bedient das Dropdown“): Das Dropdown wird sehr wohl über `page.getByLabel('Absatzformat').selectOption(…)` bedient. `clipboard.spec.ts:174/179` erzeugt per Dropdown eine „Überschrift 2“, wechselt zurück auf „Standard“ und prüft `h2` im Ziel. `clipboard-roundtrip.spec.ts` R-1/R-2 erzeugen per Dropdown „Überschrift 1“, exportieren und prüfen, dass die exportierte DOCX (`/Heading1\|w:pStyle/`, Z. 81) bzw. ODT die Überschrift enthält. `docx.spec.ts:108`/`odt.spec.ts:89` prüfen die Rundreise **vorgefertigter** Überschriften-Dateien. **Damit sind Grundpfad (Erzeugen/Zurücksetzen/Rendern/Export) und Datei-Rundreise für Ebene 1/2 belegt** — was fehlt, ist eine **dedizierte** Abdeckung der Grenzfälle (Befunde 3, 4, 6, 7, 8, 11; Mehrblock; Ausrichtungserhalt; Listen/Tabellen; direkter Ebenenwechsel; Ebenen > 6; Undo/Redo; Mobile/Tablet; Selection-Sync-Regression; sichtbare Darstellung im Editor). |
| 11 | `src/index.css`, `.ProseMirror h1…h6` (Z. 29–37, **nur** `margin`); Tailwind-Preflight über `@import 'tailwindcss'` (Z. 1); zum Vergleich `.ProseMirror th` mit `font-weight: 600` (Z. 60–61) | Überschriften erhalten im Editor **nur** einen Außenabstand (`margin: 0 0 0.6em`), **keine** eigene `font-size` und **kein** `font-weight` | **Neuer Befund: Überschriften sind im Editor optisch kaum von einem Standard-Absatz zu unterscheiden.** Tailwinds Preflight setzt die User-Agent-Größen/-Fettung von `h1`–`h6` auf den Fließtext-Wert zurück, und `index.css` überschreibt nur den `margin`. Ergebnis: Die Auswahl von „Überschrift 1“–„6“ ändert den Node-Typ (und damit korrekt den Export), die **sichtbare** Darstellung im Editor bleibt aber nahezu identisch zum normalen Absatz. Für die Nutzerin wirkt das wie ein „stiller“ Klick ohne Effekt (Verstoß gegen `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20). Korrigiert zugleich die aus `fett-req.md` übernommene Prämisse in 2.9: Überschriften erscheinen im **Editor nicht** fett — Fettdruck ist ausschließlich eine **Export**-Eigenschaft der Stilvorlage „Heading N“ (Befund 9), nicht der Editor-Anzeige. |
| 12 | `setHeading` (`commands.ts` Z. 44–47): `$from.sameParent($to)` + `alignableTypes.has(parent.type.name)`; `AllSelection` (`prosemirror-state`: `$from = doc.resolve(0)`, `$to = doc.resolve(doc.content.size)`) | `Strg+A`/`Cmd+A` bindet in `WordEditor.tsx` über `baseKeymap`s `Mod-a` → `selectAll` und erzeugt eine `AllSelection`, deren `$from`/`$to` **immer** Tiefe 0 haben, Elternknoten = `doc` | **Neuer, per Test direkt verifizierter Befund: „Alles auswählen“ lässt `setHeading` in JEDEM Dokument no-oppen — auch in einem Dokument mit genau einem einzigen Absatz.** Ursache ist nicht die aus Befund 3/Abschnitt 2.3 bekannte Mehrblock-Prüfung (`sameParent` ist hier trivial erfüllt, da `$from` und `$to` beide zu `doc` gehören), sondern dass eine `AllSelection` strukturell **niemals** einen `paragraph`/`heading` als unmittelbaren Elternknoten hat, unabhängig von der Blockanzahl. Direkt gegenprobiert (`vitest`, ad hoc): `setHeading(1)` auf einer `AllSelection` über ein Ein-Absatz-Dokument liefert `false`; `setAlign('center')` auf **derselben** `AllSelection` liefert `true` — der in 2.3 vermutete Gleichlauf mit `setAlign` (`nodesBetween` durchläuft **alle** Nachfahrknoten, unabhängig von deren Tiefe) besteht also schon heute nicht nur für echte Mehrblock-Selektionen, sondern bereits für den denkbar häufigsten Fall „Strg+A drücken, Überschrift wählen“. Zusätzlich betroffen: `currentHeadingLevel()` (`Toolbar.tsx` Z. 116) durchläuft bei einer `AllSelection` wegen `$from.depth === 0` nur die `doc`-Ebene, findet dort weder `'heading'` noch `'paragraph'` und liefert **deterministisch** `'normal'` zurück — das Dropdown zeigt nach Strg+A also immer „Standard“ an, auch wenn der gesamte Selektionsbereich aus lauter Überschriften besteht (eine stärkere, nicht nur „bis zur nächsten Transaktion stale“ Variante der in 2.3 beschriebenen Anzeige-Inkonsistenz). |
| 13 | `setHeading` (`commands.ts` Z. 44–47); `NodeSelection` auf einem block-eigenständigen `image`-Knoten (`schema.ts` Z. 58–85, `group: 'block'`) | Ein markiertes Bild erzeugt eine `NodeSelection`, deren `$from`/`$to` ebenfalls auf Tiefe 0 liegen, Elternknoten `doc` (bzw. `table_cell`, falls das Bild in einer Tabellenzelle steht) | **Neuer, per Test direkt verifizierter Befund:** `alignableTypes.has(...)` ist für `doc`/`table_cell` `false`, also liefert `setHeading` `false`, unabhängig davon, welche Ebene gewählt wird. Dieselbe strukturelle Ursache wie Befund 12; praktisch bedeutet das: Ein Bild markieren und im Dropdown „Überschrift 1“ wählen tut sichtbar nichts — ohne jede Rückmeldung. |

**Konsequenz für die Bewertung:** Der Backlog-Status „vorhanden“ ist besser gedeckt als
zunächst angenommen — es existiert ein echter, klickbarer UI-Weg, **und** dieser wird für
Ebene 1/2 bereits end-to-end (inkl. Export) bedient. Vor einer belastbaren Bestätigung
des Status müssen jedoch die im Code nachweisbaren, undokumentierten Verhaltensweisen
einzeln geklärt und getestet werden — insbesondere die **Mehrblock-No-Op-Asymmetrie**
(Befund 3) samt ihrer **beiden strukturell verwandten, aber eigenständigen Sonderfälle**
„Alles auswählen“ (Befund 12) und Bild-`NodeSelection` (Befund 13), der
**Ausrichtungsverlust bei jedem Wechsel** (Befund 4), die **fehlende
Ebenen-Begrenzung mit DOCX-Datenverlust** (Befund 6), die beiden **Reader-Lücken**
bei benannten/vererbten Formatvorlagen (Befunde 7, 8) sowie die **fehlende visuelle
Abstufung der Überschriften im Editor** (Befund 11), die den Formatwechsel für die
Nutzerin optisch unsichtbar macht.

---

## 1. Menüpunkte / Bedienelemente — Soll-Zustand

| # | Zugriffsweg | Ist-Zustand | Soll |
|---|---|---|---|
| 1 | Toolbar-Dropdown „Absatzformat“ (`Toolbar.tsx`, `<select>` Z. 165–180), Optionen „Standard“, „Überschrift 1“–„Überschrift 6“ | Vorhanden, natives `<select>`, `aria-label="Absatzformat"` | Muss per Maus, per Tastatur (Tab-Fokus + Pfeiltasten/Buchstaben-Sprung, Standardverhalten von `<select>`) und auf Touch-Geräten über den nativen Options-Picker bedienbar sein; ausgewählter Wert muss dem tatsächlichen Format an der Cursor-Position/Selektion entsprechen (siehe Befund 2). |
| 2 | Anzeige des aktuellen Formats im Dropdown | `currentHeadingLevel()` (`Toolbar.tsx` Z. 114–122), reagiert auf jede Transaktion | Muss sich **sofort** bei jeder Cursorbewegung, jedem Klick oder jeder Tastatur-Navigation aktualisieren, ohne zusätzliche Nutzeraktion; bei gemischter Mehrfachselektion (siehe Grenzfall 3.2), bei einer `AllSelection`/Strg+A (Befund 12 — zeigt deterministisch „Standard“, unabhängig vom tatsächlichen Inhalt) und bei Ebenen > 6 (Befund 6) muss ein definiertes, nicht-widersprüchliches Anzeigeverhalten festgelegt sein (aktuell: bei Ebene > 6 zeigt das `<select>` gar keine Option an). |
| 3 | Tastenkombination zum direkten Setzen einer Ebene (z. B. Strg+Alt+1…6 für „Überschrift 1“–„6“, Strg+Alt+0 für „Standard“, wie in Word/LibreOffice üblich) | **Fehlt komplett** — keine `keymap`-Bindung in `WordEditor.tsx` (Z. 77–99, nur Undo/Redo, Enter/Shift-Enter, Mod-b/i/u, Shift-Delete) | Kein Blocker für „vorhanden“, aber als bewusst fehlende Komfortfunktion zu dokumentieren, nicht stillschweigend zu übergehen (analog zur Dokumentationspflicht aus `ausschneiden-req.md` Abschnitt 1). |
| 4 | Kontextmenü (Rechtsklick) → Absatzformat | Nicht vorhanden (bewusst kein eigenes Kontextmenü, siehe `WordEditor.tsx`-Kommentar zum nativen Browser-Kontextmenü) | Kein Soll-Element für diese Anforderung; als fehlend dokumentieren. |
| 5 | Formatvorlagen-Katalog/Galerie (Schnellformate mit Vorschau) | Fehlt komplett (eigener Backlog-Slug `formatvorlagen-katalog`, Priorität 3) | Nicht Gegenstand dieser Datei — nur zur Abgrenzung erwähnt. |
| 6 | Mobile/Touch: Dropdown-Bedienung über native Options-Auswahl (Android/iOS) | Ungeprüft | Auf den in `playwright.config.ts` konfigurierten Projekten „Mobile“ (Pixel 7) und „Tablet“ (iPad Mini) verifizieren, dass das `<select>` erreichbar und bedienbar bleibt (Toolbar nicht abgeschnitten/verdeckt; sie ist `flex-wrap`, also potenziell mehrzeilig). |
| 7 | Deaktivierter Zustand / Rückmeldung bei nicht anwendbarer Selektion (z. B. Mehrblock-Selektion, `AllSelection`/Strg+A, Bild-`NodeSelection` oder `CellSelection`, bei denen laut Befund 3/12/13 kein Format gesetzt werden kann) | Aktuell **nicht** deaktiviert — Dropdown bleibt bedienbar, die Auswahl wirkt aber wirkungslos (stiller No-Op); der `<select>` kann bis zur nächsten Transaktion sogar den falsch gewählten Wert weiter anzeigen (siehe 2.3) | Verstößt gegen `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 „Kein stiller Fehlschlag“ — zu klären, ob das Dropdown in diesen Fällen deaktiviert werden soll, die Aktion auf alle Blöcke erweitert wird (siehe 2.3) oder eine sichtbare Rückmeldung nötig ist. |

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Grundfunktion (Cursor ohne Selektion)
- Cursor steht in einem beliebigen Absatz/einer Überschrift, keine Selektion aktiv →
  Auswahl einer Option im Dropdown wandelt **genau diesen einen Block** in den gewählten
  Typ um (`paragraph` ↔ `heading` mit gewähltem `level`).
- Wechsel direkt von einer Ebene zur nächsten (z. B. „Überschrift 6“ → „Überschrift 1“ in
  einem einzigen Auswahlschritt) muss ohne Zwischenschritt über „Standard“ funktionieren.
- Der Cursor bleibt nach dem Wechsel im selben Block aktiv, der Editor bleibt sofort
  weiter bedienbar (kein Fokusverlust, kein Reset — konsistent mit `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 1.3). `run()` (`Toolbar.tsx`) ruft nach jedem Kommando `view.focus()`.

### 2.2 Anwendung auf eine Selektion innerhalb eines einzelnen Blocks
- Ist die gesamte Selektion innerhalb **eines** Absatzes/einer Überschrift (`$from` und
  `$to` haben denselben Elternknoten, `$from.sameParent($to)`), wird dieser eine Block
  umgewandelt — unabhängig davon, wie viel Text markiert ist.

### 2.3 Anwendung auf eine Selektion über mehrere Blöcke hinweg
- **Aktuell (Befund 3):** Eine Selektion, die mehr als einen Absatz/eine Überschrift
  umfasst, führt zu einem stillen No-Op — `setHeading` gibt `false` zurück, ohne
  Dispatch, ohne sichtbare Fehlermeldung.
- **Zustandsanzeige-Detail:** Bei einem No-Op entsteht **keine** Transaktion, daher auch
  **kein** `forceRender` (`WordEditor.tsx` Z. 123) — die React-kontrollierte `value` des
  `<select>` (`value={currentHeadingLevel()}`) wird also nicht sofort neu abgeglichen.
  Der native Select kann daher den fälschlich gewählten Wert **bis zur nächsten
  Transaktion** (z. B. dem nächsten Cursor-Klick) sichtbar behalten und springt erst
  dann auf den tatsächlichen, unveränderten Zustand zurück. Das ist selbst ein kleiner
  UI-Konsistenzmangel und muss mit einem Testfall belegt werden.
- **Zu klären/verifizieren (zentrale offene Design-Frage):** Ist der Ein-Block-No-Op so
  gewollt, oder wird — wie bei der Ausrichtung (`setAlign`, die per `nodesBetween` **alle**
  Blöcke erfasst) — erwartet, dass **alle** von der Selektion erfassten Blöcke auf einmal
  umgewandelt werden? Diese Asymmetrie zwischen zwei strukturell fast identischen
  Absatzformatierungs-Aktionen ist der wichtigste zu entscheidende Punkt dieser
  Anforderung und muss vor Abnahme entschieden und dokumentiert werden. (Empfehlung des PO:
  an `setAlign` angleichen — Mehrblock-Umwandlung ist das in Textverarbeitungen erwartete
  Verhalten.)
- **Verschärfung durch Befund 12/13 (per Test verifiziert, nicht nur vermutet):** Die
  Asymmetrie zu `setAlign` beschränkt sich nicht auf echte Mehrblock-Selektionen. Direkt
  gegengeprüft: `setAlign('center')` auf einer `AllSelection` (Strg+A) über ein
  **Ein-Absatz-Dokument** liefert `true` (wirkt), `setHeading(1)` auf derselben Selektion
  liefert `false` (No-Op) — obwohl `sameParent` hier trivial erfüllt ist (beide Enden
  liegen auf `doc`). Der No-Op trifft also schon den denkbar häufigsten und harmlosesten
  Fall „Strg+A drücken, dann eine Überschriftenebene wählen“, nicht nur eine bewusste
  Mehrfach-Absatz-Auswahl per Maus-Drag. Dasselbe gilt für eine `NodeSelection` auf einem
  eingefügten Bild (Befund 13). Das ist ein zusätzliches, eigenständiges Argument für die
  PO-Empfehlung oben: Ein Umbau auf `nodesBetween` (wie bei `setAlign`) würde Befund 3
  **und** Befund 12/13 in einem Schritt beheben, weil `nodesBetween` unabhängig von der
  Tiefe/dem unmittelbaren Elternknoten der Selektionsgrenzen über alle im Bereich
  liegenden Nachfahrknoten iteriert.

### 2.4 Wechsel zurück zu „Standard“
- Auswahl von „Standard“ auf einer Überschrift wandelt den Node-Typ zurück zu `paragraph`
  — es genügt **nicht**, nur visuell wie ein Standard-Absatz auszusehen; der tatsächliche
  Node-Typ muss wechseln (prüfbar über `node.type.name` im Editor-State bzw. über das
  exportierte Element: `<w:p>` ohne `w:pStyle` bzw. `<text:p>` statt `<text:h>`, siehe
  Abschnitt 4).

### 2.5 Erhalt der Ausrichtung beim Formatwechsel
- **Aktuell (Befund 4):** Jeder Wechsel des Absatzformats (in beide Richtungen) setzt
  `align` effektiv auf `'left'` (explizit bei Wechsel zu Überschrift; über den
  Node-Default bei Wechsel zu Standard).
- **Zu klären/verifizieren:** Muss eine zuvor gesetzte Ausrichtung (zentriert/rechts/
  Blocksatz) den Formatwechsel überleben (so wie es Direktformatierung in Word/
  LibreOffice üblicherweise tut), oder ist der Reset auf „links“ bewusstes,
  dokumentiertes Verhalten? Bis zur Klärung gilt dieses Verhalten als **unverifizierter,
  wahrscheinlicher Fehler**, nicht als bestätigtes Feature. (Empfehlung des PO: Ausrichtung
  erhalten — `setHeading` soll das vorhandene `align`-Attribut des Blocks übernehmen statt
  hart `'left'` zu setzen.)

### 2.6 Verhalten in Listen
- **Aktuell (Befund 5, korrigiert):** Weil `list_item` das Content-Modell `block+` hat,
  kann eine Überschrift an **jeder** Position innerhalb eines Listenpunkts erzeugt werden
  — auch am ersten (und einzigen) Block. Es gibt **keine** Inkonsistenz „erster vs.
  weiterer Absatz“ mehr (frühere Fassung dieser Anforderung war hier falsch).
- **Zu klären:** Ist eine Überschrift innerhalb eines Aufzählungs-/Nummerierungspunkts
  überhaupt ein erwünschter Anwendungsfall (in Word/LibreOffice normalerweise nicht
  vorgesehen — dort würde man zuerst die Liste aufheben)? Falls **nicht** erwünscht, wäre
  eine bewusste, sichtbare Verweigerung sinnvoller als die aktuelle stillschweigende
  Erlaubnis. Falls erwünscht, muss der **Export/Reimport** einer Überschrift innerhalb
  eines Listenpunkts als Rundreise-Testfall abgesichert werden (ODT: `<text:h>` innerhalb
  `<text:list-item>`; DOCX: Zusammenspiel `w:pStyle="HeadingN"` mit `w:numPr`) — beides
  aktuell ungetestet.

### 2.7 Verhalten in Tabellenzellen
- Innerhalb einer Tabellenzelle (`table_cell`-Content `block+`, `schema.ts` Z. 154)
  funktioniert die Umwandlung an **jeder** Position (jeder Absatz kann zu jeder
  Überschriftenebene und zurück werden) — analog zu Listen (2.6).
- Eine `CellSelection` über **mehrere** Tabellenzellen führt zu einem stillen No-Op
  (unterschiedliche Elternknoten je Zelle, `sameParent` ist `false`) — konsistent mit dem
  Mehrblock-Verhalten aus 2.3; muss ebenso dokumentiert und mit einem Testfall
  abgesichert werden.

### 2.8 Zeilenumbruch/Enter-Verhalten innerhalb einer Überschrift
- Der `heading`-Node ist im Schema als `defining: true` markiert (`schema.ts` Z. 30) —
  das beeinflusst sowohl das Aufteilen per Enter als auch das Einfügen/Ersetzen beim
  Einfügen aus der Zwischenablage.
- Drücken von „Enter“ am **Ende** einer Überschrift soll einen **neuen Standard-Absatz**
  erzeugen (nicht automatisch eine weitere Überschrift derselben Ebene) — das in
  Word/LibreOffice übliche Verhalten. Es ergibt sich aus `baseKeymap`s `Enter`
  (`prosemirror-commands`, `splitBlock`/`defaultBlockAt`) in Verbindung mit der
  Node-Reihenfolge in `schema.ts` (`paragraph` vor `heading`). **Ungetestet** — und die
  vorhandenen Tests belegen es **nicht**, da `clipboard-roundtrip.spec.ts`/`clipboard.spec.ts`
  nach dem Enter jeweils **explizit** `selectOption('normal')` aufrufen, sich also nicht
  auf das Auto-Verhalten verlassen. Muss mit einem eigenen Testfall nachgewiesen werden.
- Drücken von „Enter“ **innerhalb** (nicht am Ende) einer Überschrift soll den Text in
  zwei Überschriften **derselben Ebene** aufteilen — ebenfalls ungetestet.
- Innerhalb eines Listenpunkts greift zuerst die eigene `Enter`-Bindung (`WordEditor.tsx`
  Z. 88, `splitListItem`), bevor der `baseKeymap`-Fallback (Z. 100) zum Zug kommt —
  Wechselwirkung mit einer Überschrift innerhalb eines Listenpunkts (siehe 2.6) gesondert
  prüfen.

### 2.9 Interaktion mit Zeichenformatierung („Fett“)
- **Korrektur gegenüber einer früheren Fassung** (die aus `fett-req.md` Abschnitt 2.5 die
  Annahme übernahm, Überschriften seien im Editor „bereits über CSS fett“): Das trifft im
  **Editor nicht zu** (Befund 11). `src/index.css` setzt für `.ProseMirror h1…h6` nur
  `margin`, und Tailwinds Preflight neutralisiert die Browser-Standardfettung — im Editor
  ist eine Überschrift also **nicht** fett dargestellt. Fettdruck ist ausschließlich eine
  **Export**-Eigenschaft der Stilvorlage „Heading N“ (Befund 9).
- Für den Rückwechsel „Überschrift → Standard“ folgt daraus: Ein zuvor separat auf dem
  Text gesetztes `strong`-Mark bleibt beim Node-Typwechsel unangetastet. Im **Editor**
  erscheint der Text dann genau so fett, wie es das Mark vorgibt (die Überschrift war
  ohnehin nicht optisch fett — die früher beschriebene „unerwartete“ Fettung entsteht im
  Editor also gar nicht). Im **Export** entfällt die stilgebundene Heading-Fettung korrekt
  (der Absatz referenziert nun „Normal“/„Standard“ statt „Heading N“, Befund 9); ein
  separat gesetztes `strong`-Mark bleibt dagegen als direkte Zeichenformatierung erhalten
  und wird weiterhin als `<w:b/>` bzw. `fo:font-weight="bold"` am Textlauf exportiert.
- **Zu prüfen:** genau dieser Unterschied — stilgebundene Heading-Fettung (verschwindet
  beim Rückwechsel) vs. Mark-Fettung (bleibt erhalten) — mit je einem Testfall für Editor-
  Darstellung und Export.

### 2.10 Undo/Redo
- Ein Formatwechsel per Dropdown erzeugt einen einzelnen, eigenständigen Undo-Schritt
  (`history()`-Plugin, `Mod-z`/`Mod-y`/`Mod-Shift-z`).
- Undo stellt exakt den vorherigen Node-Typ (**und**, sofern Abschnitt 2.5 zugunsten von
  „erhalten“ entschieden wird, die vorherige Ausrichtung) wieder her.
- Redo stellt den Formatwechsel erneut her.
- Mehrere aufeinanderfolgende Formatwechsel (z. B. Standard → Überschrift 1 → Überschrift
  3 → Standard) müssen einzeln, in korrekter Reihenfolge rückgängig machbar sein.

### 2.11 Sichtbare Darstellung des gewählten Formats im Editor
- Die Auswahl einer Überschriftenebene muss im Editor **sichtbar** wirken: Der Absatz muss
  sich als Überschrift von normalem Fließtext unterscheiden — in Word/LibreOffice üblich
  über gestaffelte, mit der Ebene abnehmende Schriftgröße (und i. d. R. Fettung), sodass
  bereits ohne Blick auf das Dropdown erkennbar ist, welche Ebene aktiv ist.
- **Aktuell (Befund 11):** `src/index.css` definiert für `.ProseMirror h1…h6` **nur**
  `margin` (Z. 29–37), keine `font-size` und kein `font-weight`; Tailwinds Preflight setzt
  zusätzlich die User-Agent-Größen/-Fettung von `h1`–`h6` auf den Fließtext-Wert zurück.
  Folge: Der Formatwechsel ändert den Node-Typ (und damit den Export) korrekt, die
  **sichtbare** Darstellung im Editor bleibt aber nahezu identisch zum Standard-Absatz.
- **Zu klären/verifizieren (Design-Frage):** Das widerspricht `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 20 („kein stiller Fehlschlag“ — ein Klick, der scheinbar nichts tut). Bis zur
  Klärung gilt die fehlende visuelle Abstufung als **wahrscheinlicher Darstellungsfehler**,
  nicht als bewusstes Design. (Empfehlung des PO: `h1`–`h6` im Editor mit gestaffelter
  Schriftgröße/-stärke versehen, abgestimmt mit den Export-Schriftgrößen aus
  `HEADING_FONT_SIZES` [`docx/styleDefs.ts`, `odt/styleRegistry.ts`] und mit der
  Seitenansicht, damit Editor-Anzeige und Export nicht optisch auseinanderlaufen.)
- **Abgrenzung:** Ob Überschriften im Editor zusätzlich **fett** dargestellt werden, berührt
  auch `fett-*` (Befund 9/11); die hier geforderte **Unterscheidbarkeit** ist davon
  unabhängig und mindestens über die Schriftgröße zu erfüllen.

---

## 3. Grenzfälle

1. **Leerer Absatz/leeres Dokument:** Formatwechsel auf einen leeren Absatz (nur Cursor,
   kein Text) → funktioniert ohne Absturz, Cursor bleibt aktiv.
2. **Selektion über mehrere Absätze hinweg:** siehe 2.3 — stiller No-Op; Dropdown kann den
   falsch gewählten Wert bis zur nächsten Transaktion anzeigen. Muss mit einem Testfall
   nachgewiesen und die Design-Entscheidung (2.3) hier nachgetragen werden.
3. **Selektion, die einen Absatz und eine Überschrift gemeinsam umfasst** (unterschiedliche
   Node-Typen **und** unterschiedliche Elternknoten) → gleicher stiller No-Op wie
   Grenzfall 2; zusätzlich verifizieren, dass die Zustandsanzeige des Dropdowns in diesem
   Moment kein widersprüchliches/zufälliges Ergebnis zeigt.
4. **Cursor im (einzigen) Absatz eines Listenpunkts:** Formatwechsel zu einer Überschrift
   **funktioniert** (Content-Modell `block+`, siehe Befund 5/2.6) — es ist zu entscheiden,
   ob das erwünscht ist, und der Export/Reimport dieser Struktur zu prüfen.
5. **Cursor in einem zweiten/weiteren Block desselben Listenpunkts:** Formatwechsel
   funktioniert ebenfalls — **konsistent** mit Grenzfall 4 (keine Inkonsistenz mehr).
6. **Cursor in einer Tabellenzelle:** Formatwechsel funktioniert an jeder Position
   innerhalb der Zelle (siehe 2.7).
7. **`CellSelection` über mehrere Tabellenzellen:** stiller No-Op (siehe 2.7).
8. **Ausrichtung vor dem Formatwechsel:** Absatz zunächst zentrieren, danach „Überschrift
   1“ wählen → Ausrichtung springt aktuell auf „links“ (Befund 4) — Pflicht-Testfall, bis
   zur Klärung von 2.5 als potenzieller Fehler zu behandeln.
9. **Sofortiger Rückwechsel:** Überschrift 1 setzen, unmittelbar danach „Standard“ wählen
   → eine Ausrichtung, die vor dem allerersten Wechsel bestand, ist nach zwei Wechseln
   nachweislich verloren (kumulativer Effekt von Befund 4), nicht nur nach einem.
10. **Direkter Ebenenwechsel ohne Zwischenschritt** (Überschrift 2 → Überschrift 5 in einem
    Klick): funktioniert in einem Schritt, kein Zwischenzustand „Standard“ sichtbar/nötig.
11. **Import einer Überschrift mit Ebene > 6** (Befund 6): DOCX-Datei mit „Heading 7“
    (`w:outlineLvl` 6) bzw. ODT mit `text:outline-level="7"` importieren → im Editor
    entsteht ein `heading` mit `level` 7 (`h7` im DOM; Dropdown zeigt keine Option).
    Anschließend **unverändert exportieren und reimportieren**: DOCX verliert die Ebene
    (wird Standard-Absatz), ODT behält sie. Pflicht-Testfall; zusätzlich ist zu
    entscheiden, ob Ebenen > 6 beim Import auf 6 **geklemmt/normalisiert** werden sollen
    (dann einheitlich, verlustfrei rundreisend) oder ausdrücklich als „nur bis Ebene 6
    unterstützt“ dokumentiert werden.
12. **Enter am Ende einer Überschrift:** siehe 2.8 — neuer Block soll „Standard“ werden.
13. **Enter mitten in einer Überschrift:** siehe 2.8 — beide Hälften bleiben Überschriften
    derselben Ebene.
14. **Fett-Mark auf Überschriftentext, danach Rückwechsel zu Standard:** siehe 2.9/Befund 11
    — im Editor ist die Überschrift ohnehin nicht optisch fett; ein separat gesetztes
    `strong`-Mark bleibt beim Node-Typwechsel erhalten und wirkt in Editor **und** Export
    weiter als Fettung. Zu prüfen ist der Unterschied zwischen (verschwindender)
    stilgebundener Heading-Fettung und (bleibender) Mark-Fettung, nicht ein „unerwartetes“
    Fettwerden.
15. **Regressionsrisiko Selection-Sync-Bug** (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2/20;
    `tests/e2e/selection-regression.spec.ts`): Text eingeben → Format auf „Überschrift 1“
    setzen → per Klick neu positionieren → Enter → weiter tippen → Dokument darf nicht
    korrumpiert werden. Der Absatzformat-Wechsel ist wie „Fett“ eine Toolbar-Transaktion
    auf eine (ggf. leere) Selektion und daher ein plausibler weiterer Auslöser für eine
    Variante dieses Bugs — bisher nur mit „Fett“ als Auslöser getestet, nicht mit dem
    Absatzformat-Wechsel.
16. **Reale Fremddatei (ODT) mit Überschriften über eine gemeinsame/benannte Formatvorlage**
    (`office:styles`, nicht `office:automatic-styles`): Level und Text bleiben erhalten
    (`text:outline-level` am Element), die **Ausrichtung** der Überschrift geht jedoch nach
    aktuellem Stand still verloren (Befund 7) — Pflicht-Testfall mit einer realen,
    außerhalb dieses Editors erzeugten ODT-Datei.
17. **Reale Fremddatei (DOCX) mit Überschriften-Formatvorlage ohne eigenes `w:outlineLvl`,
    nur per `w:basedOn` von „Heading N“ geerbt** (Befund 8): zu prüfen, ob
    `headingLevelForStyle` diesen Fall erkennt oder der Absatz fälschlich als „Standard“
    importiert wird.
18. **Sehr viele aufeinanderfolgende Formatwechsel in kurzer Zeit** (z. B. per Pfeiltasten
    im geöffneten Dropdown schnell durchgeschaltet): kein doppeltes/verzögertes Dispatch,
    keine veraltete Zustandsanzeige.
19. **Track-Changes-Abhängigkeit (zukünftig, Phase 3, aktuell nicht umgesetzt):** Sobald
    Änderungsverfolgung existiert, muss ein Absatzformat-Wechsel bei aktiver Aufzeichnung
    als nachverfolgbare Änderung markiert werden. Für den aktuellen Verifikationsauftrag
    **nicht** im Scope, hier nur als künftige Abhängigkeit vermerkt.
20. **Sichtbare Wirkung des Formatwechsels** (2.11/Befund 11): Nach Auswahl von „Überschrift
    1“ muss der Absatz im Editor optisch als Überschrift erkennbar sein (mindestens messbar
    größere Schrift als der umgebende Standard-Absatz). Aktuell ist die Darstellung nahezu
    unverändert — Pflicht-Testfall (Prüfung der berechneten `font-size`/`font-weight` des
    gerenderten `h1`-Elements gegen ein benachbartes `<p>`, ergänzt um einen
    Screenshot-Vergleich); bis zur Klärung von 2.11 als potenzieller Darstellungsfehler zu
    behandeln.
21. **„Alles auswählen“ (Strg+A/Cmd+A) in einem Dokument mit genau einem Absatz, danach
    Überschriftenebene wählen** (Befund 12, per Test verifiziert): `setHeading` liefert
    `false` — stiller No-Op trotz eines strukturell trivialen, aus Nutzersicht
    „einfachsten möglichen“ Falls (ein einziger Block, komplett markiert). Dropdown zeigt
    dabei deterministisch „Standard“ an, unabhängig vom tatsächlichen Inhalt der Selektion
    (nicht nur „stale bis zur nächsten Transaktion“ wie in 2.3 allgemein beschrieben,
    sondern ein eigener, reproduzierbarer Anzeigefehler). Pflicht-Testfall, da dies über
    die native Tastenkombination `Strg+A`/`Cmd+A` jederzeit unbeabsichtigt auslösbar ist.
22. **Bild markieren (`NodeSelection`), danach Überschriftenebene wählen** (Befund 13, per
    Test verifiziert): `setHeading` liefert `false` — stiller No-Op, keine Rückmeldung,
    gleiche strukturelle Ursache wie Grenzfall 21 (Elternknoten der Selektionsgrenzen ist
    `doc`/`table_cell`, nie `paragraph`/`heading`).

---

## 4. Rundreise-Anforderung (DOCX und ODT)

Für **jeden** der folgenden Fälle gilt: Datei mit Überschriften/Absätzen hochladen (bzw.
per Dropdown im Editor erzeugen) → **unverändert** exportieren → erneut importieren →
Absatzformat (Node-Typ **und** Ebene) ist inhaltlich exakt erhalten. Der Text darf nie
verloren gehen; Formatierungsdetails (insb. Ausrichtung) sind gemäß den offenen Punkten
2.5/Befund 4 zu behandeln — das erwartete Ergebnis ist nach Klärung hier einzutragen und
in jedem Fall durch einen Test zu belegen.

### 4.1 DOCX
1. Einfache DOCX-Datei mit „Heading 1“- und „Heading 2“-Formatvorlage importieren → im
   Editor als `heading`-Node mit korrektem `level` → unverändert als DOCX exportieren →
   erneut importieren → Level und Text identisch. (Grundpfad bereits durch
   `docx.spec.ts:108` für „Heading 1“ abgedeckt; um Ebene 2–6 erweitern.)
2. Im Editor neuen Absatz eingeben, per Dropdown auf „Überschrift 3“ setzen, als DOCX
   exportieren → mit unabhängigem Parser (python-docx oder direktes Parsen von
   `word/document.xml`) verifizieren, dass im `w:pPr` exakt `<w:pStyle w:val="Heading3"/>`
   steht (`docx/writer.ts` Z. 122, `HEADING_STYLE_ID`).
3. Per Dropdown von „Überschrift 3“ zurück auf „Standard“ wechseln, exportieren → der
   betroffene Absatz enthält **kein** `<w:pStyle>` mehr (plain `<w:p><w:pPr><w:jc …/></w:pPr>`,
   `docx/writer.ts` Z. 117).
4. Ebenenwechsel „Überschrift 2“ → „Überschrift 5“ in einem Schritt, exportieren → Export
   referenziert ausschließlich `Heading5`, keine Reste von `Heading2`.
5. Absatz zentrieren, danach per Dropdown zu „Überschrift 1“ wechseln, exportieren,
   reimportieren → prüfen, ob `<w:jc w:val="center"/>` erhalten bleibt oder auf `left`
   zurückfällt (Grenzfall 8/Befund 4). **Hinweis:** Reader/Writer erhalten `w:jc` korrekt;
   der Verlust entsteht bereits **im Editor** durch `setHeading` (align→left). Ergebnis
   nach Klärung von 2.5 hier nachtragen.
6. **Ebene > 6 (Befund 6/Grenzfall 11):** DOCX mit „Heading 7“ importieren → unverändert
   als DOCX exportieren → reimportieren → dokumentieren, dass die Ebene aktuell **verloren
   geht** (Absatz wird Standard), bzw. nach Klemmung/Normalisierung auf 6 verlustfrei
   bleibt.
7. Cross-Format: ODT mit Überschriften importieren → als DOCX exportieren → Level und Text
   bleiben erhalten.
8. Reale, komplexe Fremddatei (Open-Source-Testkorpus, nicht mit diesem Editor erzeugt) mit
   mehrstufigen Überschriften importieren → mindestens Text und erkennbare Gliederungsebene
   bleiben erhalten (siehe Grenzfall 17 zur Vererbung über `w:basedOn`).

### 4.2 ODT
1. Einfache ODT-Datei mit `<text:h text:outline-level="1">` und `…="2">` importieren → im
   Editor als `heading`-Node mit korrektem `level` → unverändert als ODT exportieren →
   reimportieren → Level und Text identisch. (Grundpfad durch `odt.spec.ts:89` abgedeckt;
   um Ebene 2–6 erweitern.)
2. Im Editor neuen Absatz eingeben, per Dropdown auf „Überschrift 4“ setzen, als ODT
   exportieren → `content.xml` enthält `<text:h text:style-name="Heading4-<align>"
   text:outline-level="4">` (`odt/writer.ts` Z. 97, `headingStyleName`), und die Stildefinition
   „Heading4-<align>“ liegt in `office:automatic-styles` von `content.xml`
   (`buildContentXml`/`headingStyleDefs`, Z. 210) — dadurch reist auch die Ausrichtung über
   den **eigenen** Reader zurück (`office:automatic-styles` wird gelesen).
3. Per Dropdown zurück auf „Standard“ wechseln, exportieren → Export enthält `<text:p>`
   (mit Ausrichtungs-Stil `Ppara-<align>`) statt `<text:h>`, **kein** `outline-level`-Attribut
   mehr (`odt/writer.ts` Z. 91).
4. Ebenenwechsel in einem Schritt (analog 4.1.4), exportieren → nur die neue Ebene ist im
   Export referenziert.
5. Absatz zentrieren, danach per Dropdown zu „Überschrift 1“ wechseln, exportieren,
   reimportieren → analog 4.1.5; der Ausrichtungsverlust entsteht auch hier im Editor
   (Befund 4), nicht im ODT-Pfad. Ergebnis nach Klärung hier nachtragen.
6. **Ebene > 6 (Befund 6):** ODT mit `text:outline-level="7"` importieren → exportieren →
   reimportieren → hier bleibt die Ebene erhalten (direktes `outline-level`), auch wenn die
   Stilreferenz undefiniert ist; als Kontrast zu 4.1.6 belegen.
7. Cross-Format: DOCX mit Überschriften importieren → als ODT exportieren → Level und Text
   bleiben erhalten.
8. **Pflicht-Testfall für Befund 7:** Reale, mit LibreOffice/OpenOffice erzeugte ODT-Datei,
   deren Überschriften-Formatierung über die gemeinsame `office:styles`-Formatvorlage
   („Heading 1“ o. ä.) statt über eine automatische Instanz-Formatvorlage bezogen wird,
   importieren → Text und Gliederungsebene müssen erhalten bleiben; zusätzlich verifizieren,
   dass/ob die **Ausrichtung** dabei verloren geht, und diesen Befund als bestätigt oder
   widerlegt hier nachtragen.

### 4.3 Doppelte Rundreise / Cross-Format hin und zurück
1. DOCX mit Überschriften unterschiedlicher Ebenen → Editor → Export als ODT → erneuter
   Import → Export zurück als DOCX → Level und Text bleiben nach zwei Formatkonvertierungen
   identisch.
2. Dieselbe Prüfung mit Startpunkt ODT.
3. Im Editor erzeugter Formatwechsel (Standard → Überschrift → Standard, Grenzfall 9)
   gefolgt von Cross-Format-Export/Reimport → Ergebnis entspricht dem tatsächlichen
   Nach-Wechsel-Zustand (inkl. der ggf. verlorenen Ausrichtung, sofern Befund 4 nicht
   behoben wird — dann muss das erwartete Ergebnis exakt den Verlust widerspiegeln, kein
   „unerwartetes“ Wiederauftauchen der alten Ausrichtung durch einen Konvertierungs-Zufall).

---

## 5. Testfälle für die Verifikation (E2E, echte Bedienung im Browser)

**Bereits vorhandene, den Dropdown tatsächlich bedienende Tests** (Grundpfad Ebene 1/2,
aber **nicht** die Grenzfälle dieser Anforderung):
- `tests/e2e/clipboard.spec.ts:170–194` — „Überschrift 2“ per `selectOption('2')` erzeugen,
  auf „Standard“ zurück, `h2` im Ziel prüfen.
- `tests/e2e/clipboard-roundtrip.spec.ts` R-1 (DOCX, Z. 31–82) / R-2 (ODT, Z. 84–104) —
  „Überschrift 1“ per Dropdown erzeugen, exportieren, `Heading1`/`w:pStyle` (DOCX) bzw. ODT
  prüfen.
- `tests/e2e/docx.spec.ts:108` / `tests/e2e/odt.spec.ts:89` — Rundreise **vorgefertigter**
  Überschriften-Dateien (unverändert exportieren erhält Heading/Text/Fett).

**Zusätzlich zu schreibende Testfälle** (durchgehend über
`page.getByLabel('Absatzformat')` / `page.locator('select[aria-label="Absatzformat"]')`
und `selectOption`, echter `filechooser`-Upload und `page.waitForEvent('download')`, nicht
über direkte Command-Aufrufe):

1. Cursor in einen neu getippten Absatz, „Überschrift 1“ wählen → Text als `<h1>` im DOM,
   Dropdown zeigt „Überschrift 1“.
2. Direkt danach „Überschrift 4“ wählen (ohne Zwischenschritt „Standard“) → `<h4>`.
3. „Standard“ wählen → wieder `<p>`.
4. Mehrere Absätze markieren (Maus-Drag über zwei Zeilen), „Überschrift 2“ wählen →
   Ergebnis gemäß der in 2.3 getroffenen Entscheidung nachweisen (entweder werden **beide**
   Absätze Überschriften, oder nachweislich **keiner**); im No-Op-Fall zusätzlich prüfen,
   dass der `<select>` nach der nächsten Cursorbewegung wieder den echten Zustand zeigt.
5. Cursor in den (einzigen) Absatz eines Listenpunkts, „Überschrift 1“ wählen → Ergebnis
   gemäß Grenzfall 4 nachweisen (aktuell: funktioniert — `<h1>` innerhalb `<li>`); danach
   ODT/DOCX-Export/Reimport dieser Struktur prüfen.
6. Cursor in einen **zweiten** Block desselben Listenpunkts (falls per UI erzeugbar),
   „Überschrift 1“ wählen → funktioniert ebenfalls (Grenzfall 5); Konsistenz mit Test 5
   festhalten.
7. Cursor in eine Tabellenzelle, „Überschrift 2“ wählen → Zelle zeigt `<h2>`, restliche
   Tabelle unverändert.
8. Mehrere Tabellenzellen markieren (`CellSelection`), Format wählen → No-Op gemäß 2.7.
9. Absatz zentrieren (Ausrichtungs-Button), danach „Überschrift 1“ wählen → Ausrichtung im
   DOM prüfen (2.5/Grenzfall 8), Ergebnis dokumentieren.
10. Enter am Ende einer Überschrift, weiter tippen → neuer Absatz ist `<p>`, keine weitere
    Überschrift (2.8) — bewusst **ohne** manuelles `selectOption('normal')`, um genau das
    Auto-Verhalten zu prüfen.
11. Enter mitten in einer Überschrift → beide Hälften bleiben `<hN>` derselben Ebene.
12. Undo direkt nach einem Formatwechsel → vorheriger Node-Typ (und ggf. Ausrichtung) wird
    wiederhergestellt; Redo stellt den Wechsel erneut her; danach eine Kette aus mehreren
    Wechseln einzeln zurücknehmen (2.10).
13. **Ebene > 6 (Grenzfall 11/Befund 6):** DOCX-Fixture mit „Heading 7“ importieren →
    `h7` im DOM, Dropdown ohne aktive Option → exportieren/reimportieren → DOCX-Verlust
    dokumentieren; ODT-Variante mit `text:outline-level="7"` als Kontrast (Ebene bleibt).
14. **Selection-Sync-Regression mit Absatzformat als Auslöser** (Grenzfall 15): analog
    `selection-regression.spec.ts`, aber Auslöser ist „Überschrift 1“ statt „Fett“:
    Tippen → Format setzen → Klick zur Neupositionierung → Enter → weiter tippen → beide
    Absätze bleiben erhalten. Als Pflichttest dauerhaft in die Suite.
15. Vollständige Rundreise je Format (4.1/4.2), inklusive Ebene 3–6, über echten
    Upload/Download.
16. Cross-Format-Rundreise (4.3): einmal DOCX→ODT→DOCX, einmal ODT→DOCX→ODT.
17. Reale Fremddatei-Tests (4.1.8/4.2.8): ODT mit `office:styles`-Überschrift (Befund 7);
    DOCX mit `w:basedOn`-vererbter Überschrift ohne eigenes `w:outlineLvl` (Befund 8).
18. Dropdown-Bedienung auf allen drei `playwright.config.ts`-Kernprojekten (Desktop Chrome,
    Mobile/Pixel 7, Tablet/iPad Mini) → Kernfunktion (Test 1–3) auf jedem Projekt.
19. **Sichtbare Darstellung (Grenzfall 20/Befund 11):** Neuen Absatz eingeben, „Überschrift
    1“ wählen → über `getComputedStyle` die effektiv gerenderte `font-size` (und
    `font-weight`) des `h1`-Elements gegen die eines benachbarten `<p>` prüfen — muss sich
    messbar unterscheiden; zusätzlich ein Screenshot-Vergleich auf mindestens einem
    Desktop-Projekt. Ergebnis der Design-Frage 2.11 hier nachtragen.
20. **„Alles auswählen“ + Überschrift (Grenzfall 21/Befund 12):** Neues Dokument mit genau
    einem Absatz, Text eingeben, `Strg+A`/`Cmd+A` drücken, „Überschrift 1“ wählen →
    Ergebnis gemäß der in 2.3 getroffenen Design-Entscheidung nachweisen (entweder wird der
    einzige Absatz zur Überschrift, oder nachweislich nicht); zusätzlich prüfen, dass das
    Dropdown währenddessen nicht fälschlich „Standard“ anzeigt, falls die Entscheidung
    zugunsten „wirkt“ ausfällt. Ergänzend: derselbe Ablauf mit einem Bild statt Text
    (`NodeSelection`, Grenzfall 22/Befund 13).

---

## 6. Testmatrix — Zusammenfassung

| Bereich | Unit-Test (Reader/Writer) | E2E-Test (echte Dropdown-Bedienung) | Rundreise-Test (DOCX/ODT) |
|---|---|---|---|
| Grundfunktion Standard ↔ Überschrift 1/2 (Cursor, ein Block) | teilweise (vorgefertigte Daten) | **vorhanden** (`clipboard.spec.ts`, `clipboard-roundtrip.spec.ts`) | vorhanden für Ebene 1 (`docx/odt.spec.ts`), fehlt für Ebene 3–6 |
| Überschrift 3–6 (Cursor, ein Block) | fehlt | fehlt | fehlt |
| Direkter Ebenenwechsel ohne Zwischenschritt | fehlt | fehlt | fehlt |
| Mehrfachselektion über mehrere Absätze (Befund 3) | fehlt | fehlt | n/a |
| `AllSelection`/Strg+A (Befund 12) und Bild-`NodeSelection` (Befund 13) | **fehlt als dauerhafter Testfall** — Befund nur durch eine einmalige, nicht in der Suite verbliebene Ad-hoc-Verifikation (`vitest`) durch den PO belegt | fehlt | n/a |
| Verhalten in Listen / Tabellenzellen (einzeln vs. `CellSelection`) | fehlt | fehlt | fehlt (Heading-in-Liste-Rundreise) |
| Erhalt/Verlust der Ausrichtung beim Formatwechsel (Befund 4) | fehlt | fehlt | fehlt |
| Ebene > 6 aus Import, DOCX-Verlust vs. ODT-Erhalt (Befund 6) | fehlt | fehlt | **fehlt — Datenverlust-Risiko** |
| Enter-Verhalten am Ende/innerhalb einer Überschrift | fehlt | fehlt | n/a |
| Interaktion mit Fett-Mark beim Rückwechsel | fehlt | fehlt | fehlt |
| Undo/Redo nach Formatwechsel | fehlt | fehlt | n/a |
| Selection-Sync-Regression × Absatzformat | n/a | **fehlt, muss Pflicht werden** | n/a |
| Reale Fremddatei mit gemeinsamer/benannter Formatvorlage (ODT `office:styles`, Befund 7) | fehlt | fehlt | fehlt |
| Reale Fremddatei mit vererbter Formatvorlage ohne eigenes `outlineLvl` (DOCX `w:basedOn`, Befund 8) | fehlt | fehlt | fehlt |
| Cross-Format-Rundreise nach Formatwechsel | n/a | fehlt | fehlt |
| Mobile/Tablet-Bedienung des Dropdowns | n/a | fehlt | n/a |
| Sichtbare Darstellung der Überschrift im Editor (Befund 11) | n/a | **fehlt — wirkt für Nutzerin wie „stiller Klick“** | n/a |

**Fazit:** Der Backlog-Status „vorhanden“ ruht auf einer realen, klickbaren `<select>`-UI,
deren **Grundpfad (Ebene 1/2 erzeugen, auf Standard zurück, rendern, DOCX/ODT exportieren)
bereits end-to-end getestet ist**. Die frühere Behauptung, „kein Test bediene das Dropdown“,
war falsch und ist korrigiert. Weiterhin **ungeprüft** (durch keinen dauerhaften Testfall in
der Suite abgesichert) sind jedoch alle in Abschnitt 0 belegten Verhaltens-Besonderheiten —
insbesondere die Mehrblock-No-Op-Asymmetrie (3) samt ihrer beiden per Ad-hoc-Verifikation
bereits bestätigten Sonderfälle „Alles auswählen“ (12) und Bild-`NodeSelection` (13), der
Ausrichtungsverlust bei jedem Wechsel (4), die fehlende Ebenen-Begrenzung mit
DOCX-Rundreise-Datenverlust (6), die beiden Reader-Lücken (7, 8) und die fehlende visuelle
Abstufung der Überschriften im Editor (11) — sowie die Ebenen 3–6 über den echten UI-Weg.

---

## 7. Abnahmekriterien (Definition of Done)

Der Status „vorhanden“ für „Absatzformat-Dropdown“ darf erst dann wieder als
vertrauenswürdig gelten, wenn:

1. Alle Testfälle aus Abschnitt 5 tatsächlich ausgeführt wurden (echte Dropdown-Bedienung
   im Browser, nicht nur Command-/Datenmodell-Ebene) und grün sind — inklusive der Ebenen
   3–6, die bisher gar nicht über die UI getestet sind.
2. Alle Rundreise-Anforderungen aus Abschnitt 4 (DOCX, ODT, Cross-Format) durch einen
   unabhängigen Parser bzw. durch erneuten Import bestätigt sind.
3. Die zentrale offene Design-Frage aus 2.3/Grenzfall 2 (Verhalten bei Mehrblock-Selektion
   — an `setAlign` angleichen oder bewusst auf einen Block beschränkt) explizit entschieden
   und das Ergebnis hier nachgetragen wurde — **einschließlich** der beiden strukturell
   verwandten, aber eigenständig zu testenden Sonderfälle „Alles auswählen“/`AllSelection`
   (Grenzfall 21/Befund 12) und Bild-`NodeSelection` (Grenzfall 22/Befund 13): Eine
   Entscheidung, die nur „Mehrblock-Selektion per Maus-Drag“ abdeckt, aber Strg+A und
   Bild-Selektion unbehandelt lässt, gilt nicht als vollständig.
4. Die offene Frage aus 2.5/Grenzfall 8–9 (Erhalt oder Verlust der Ausrichtung beim
   Formatwechsel) explizit entschieden und das Ergebnis hier nachgetragen wurde.
5. Das Verhalten von Überschriften **innerhalb von Listenpunkten/Tabellenzellen** (2.6/2.7,
   Grenzfälle 4–7) bewusst entschieden ist (erlaubt inkl. sauberer Rundreise, oder sichtbar
   verweigert statt stillschweigend erlaubt) und mit Testfällen belegt wurde.
6. Der **Umgang mit Ebenen > 6** (Befund 6/Grenzfall 11) entschieden ist — entweder Klemmung/
   Normalisierung auf 1–6 beim Import (dann verlustfreie, formatunabhängige Rundreise) oder
   ausdrückliche, dokumentierte Beschränkung „nur Ebene 1–6“ — und der aktuelle
   DOCX-Rundreise-Datenverlust damit beseitigt **oder** als bekannte Einschränkung
   festgehalten ist.
7. Der ODT-Importbefund zu `office:styles` (Befund 7; Grenzfall 16; Testfall 4.2.8) und der
   DOCX-`w:basedOn`-Befund (Befund 8; Grenzfall 17) an je mindestens einer realen Fremddatei
   nachvollzogen und das Ergebnis (behoben oder bewusst als bekannte Einschränkung
   dokumentiert) hier nachgetragen wurde.
8. Der Regressionstest für den Selection-Sync-Bug in Kombination mit dem Absatzformat-
   Wechsel (Grenzfall 15/Testfall 14) geschrieben, grün und dauerhaft Teil der Suite ist.
9. Kein Testfall stillen Datenverlust zeigt (Ausrichtung, Text, Ebene oder Formatzustand
   verschwindet ohne sichtbare Rückmeldung) oder eine JS-Exception in der Konsole erzeugt,
   die nicht bereits in Abschnitt 3 als bekannter, zu klärender Punkt geführt wird.
10. Die Design-Frage aus 2.11/Grenzfall 20 (**sichtbare Darstellung** der Überschriften im
    Editor, Befund 11) entschieden ist — entweder werden `h1`–`h6` im Editor visuell
    abgestuft dargestellt (mindestens messbar größere Schrift) und das per Testfall 19
    belegt, oder die fehlende Abstufung ist als bewusste, dokumentierte Einschränkung
    festgehalten (nicht stillschweigend belassen), da sie den Formatwechsel sonst für die
    Nutzerin optisch unsichtbar macht.
11. Der Backlog-Eintrag `absatzformat-dropdown` wird erst dann weiterhin als „vorhanden“
    geführt, wenn Punkte 1–10 erfüllt sind; andernfalls ist der Status auf „teilweise“ zu
    korrigieren und die verbleibenden Punkte (voraussichtlich: Design-Entscheidung
    Mehrblock-Selektion **inklusive** ihrer `AllSelection`-/Bild-`NodeSelection`-Sonderfälle
    (Befund 12/13), Ausrichtungs-Erhalt, Ebenen-Begrenzung > 6 mit DOCX-Verlust,
    ODT-`office:styles`- und DOCX-`w:basedOn`-Lücken, sichtbare Editor-Darstellung der
    Überschriften) als eigene Nachfolge-Aufgaben zu erfassen.
