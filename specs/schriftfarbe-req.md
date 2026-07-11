# Anforderung: Schriftfarbe

Status: **vorhanden laut Backlog — gilt als nicht vertrauenswürdig, muss vollständig
verifiziert werden.** Diese Datei ist die verbindliche Anforderung, gegen die die
Verifikation (echte Browser-Bedienung + Rundreise-Tests) durchgeführt wird, bevor der
Status auf „verifiziert" gehoben werden darf.

Bezug: `specs/FEATURE-BACKLOG.md` Zeile 101, Slug `schriftfarbe` — Titel „Schriftfarbe",
Beschreibung „Freie Farbwahl für die Zeichenfarbe der Selektion.", Status „vorhanden",
Priorität 1 (essenziell/fundamental). Ergänzend `FEATURE-SPEC-DOCX-ODT.md`
(im Repo-Wurzelverzeichnis `E:\docs\`, **nicht** unter `specs/`) Abschnitt 3
(Tabellenzeile „Schriftfarbe — Freie Farbwahl (Farbwähler), Farbe bleibt nach
Formatwechsel erhalten") sowie Abschnitt 17 Zeile 356 („Textfarbe / Hervorhebung +
‚Entfernen'-Buttons — vorhanden — funktional prüfen, ‚Entfernen'-Symbol (⌫) ebenfalls
auf Rendering prüfen").

Stil/Methodik dieser Datei orientiert sich an `FEATURE-SPEC-DOCX-ODT.md`: Anforderung in
Fließtext/Listen je Aspekt, danach nummerierte Testfälle, Fokus auf **beide** Formate
(DOCX und ODT) sowie auf die Rundreise (Upload unverändert → Export → Re-Import erhält
Inhalt).

> **Product-Owner-Review (dieser Durchlauf).** Alle in Abschnitt 0 genannten Fundstellen
> wurden erneut einzeln gegen den aktuellen Quellcode gelesen (`schema.ts`, `Toolbar.tsx`,
> `commands.ts`, `WordEditor.tsx`, DOCX-/ODT-Reader/Writer, `styleRegistry.ts`) sowie gegen
> die zitierten E2E-Tests (`clipboard.spec.ts`, `cut.spec.ts`) und Unit-Test-Zeilen
> (`docx/__tests__/roundtrip.test.ts:100`, `odt/__tests__/roundtrip.test.ts:102`) und den
> Backlog-Eintrag (`FEATURE-BACKLOG.md:101`) — **alle bestätigt korrekt**, einschließlich
> der sehr genauen Behauptung zu `52288.docx` (Stil `ChapterNumber` →
> `w:basedOn="ChapterName"`, `w:rPr/w:color w:val="000000"`, Lauf „CHAPTER 1" ohne eigenes
> `w:color`), die durch Entpacken der Datei Byte für Byte nachvollzogen wurde.
>
> **Eine substanzielle Korrektur** gegenüber der Vorfassung: Der in Abschnitt 6, Testfall 6
> als „verifizierter Kandidat" gelistete `Tika-792.docx` ist **ungeeignet**, die Behauptung
> war falsch. Die Datei enthält zwar den String `w:val="FF0000"`, aber nicht als aktuelle
> Formatierung eines Laufs — der einzige `w:color`-Beleg in der gesamten `document.xml`
> steckt in `<w:rPrChange>` (Word zeichnet dort die **vorherige** Formatierung vor einer
> nachverfolgten Änderung auf, nicht die aktuelle). Der betroffene Lauf ist zudem in
> `<w:moveFrom><w:ins>…</w:ins></w:moveFrom>` verschachtelt, und `w:moveFrom` fehlt in der
> von `collectRuns` (`docx/reader.ts:194–215`) erkannten Liste der zu durchquerenden
> Wrapper-Elemente — der Lauf wird beim Import komplett übersprungen, unabhängig von der
> Farbfrage. Neuer Grenzfall 4.22 dokumentiert diesen Fund im Detail und benennt einen
> tatsächlich geeigneten Ersatzkandidaten (`bug65649.docx` — mehrere direkte, nicht
> verschachtelte `w:color`-Werte auf lesbarem Fließtext; dieselbe Datei, die
> `specs/textmarker-farbe-req.md` bereits für echte `w:highlight`-Werte verifiziert). Alle
> übrigen Rundreise-Fixture-Referenzen in Abschnitt 6 (ODT-Liste, `52288.docx`) wurden
> erneut geprüft und sind weiterhin korrekt.
>
> **Zweite Korrektur** (kleiner, aber real): Die Ist-Stand-Tabelle in Abschnitt 0 verwies
> beim Fund zu `parseStylesXml`/stilvererbter DOCX-Farbe bereits vor dieser Überarbeitung
> auf „Grenzfall 22" — zu diesem Zeitpunkt gab es in Abschnitt 4 aber nur 21 Grenzfälle, und
> derselbe Fund ist dort korrekt als **Grenzfall 21** ausformuliert. Der Tabellenverweis war
> also von Anfang an ein Zahlendreher auf einen nicht existierenden Eintrag, jetzt auf
> „Grenzfall 21" korrigiert — unabhängig vom neu hinzugekommenen (davon inhaltlich
> verschiedenen) Grenzfall 22 zu `w:rPrChange`.
>
> **Erneute Prüfung (2026-07-05, nächster Durchlauf).** Alle Quellcode-Fundstellen aus
> Abschnitt 0 wurden erneut Zeile für Zeile gegen den aktuellen Stand von `main` gelesen —
> inklusive der zwischenzeitlich gelandeten Commits zur Ausschneiden-Funktion
> (`9f8fa03`…`29cbc80`, siehe `git log`). **Ergebnis: alle inhaltlichen Behauptungen
> weiterhin korrekt** (Mark-Definition, Toolbar-Markup, Befehle, DOCX-/ODT-Reader/Writer,
> Style-Registry, alle zitierten E2E-/Unit-Test-Zeilen und alle genannten Fixture-Dateien —
> Existenz aller neun ODT- und drei DOCX-Fixtures aus Abschnitt 6 direkt im Dateisystem
> gegengeprüft). Zwei Zeilenangaben in der Tabelle waren jedoch stumpf veraltet: Der
> Ausschneiden-Commit `9f8fa03` fügt vor der Keymap einen mehrzeiligen erklärenden
> Kommentar ein und hat dadurch alles ab der Keymap-Definition um genau 8 Zeilen nach unten
> verschoben — betrifft die Zeilen „Tastenkürzel" und „Einfügen aus Zwischenablage" unten
> (jetzt korrigiert), inhaltlich ändert das nichts. **Neuer, bisher nicht dokumentierter
> Fund:** `playwright.config.ts` beschränkt die Projekte „Desktop Safari (Clipboard)" und
> „Desktop Firefox (Clipboard)" per `testMatch: /clipboard.*\.spec\.ts/` ausdrücklich auf
> Dateien mit diesem Namensmuster. Jede andere Testdatei — auch ein künftiger dedizierter
> Test für diese Anforderung, sofern nicht `clipboard.spec.ts` selbst erweitert wird — läuft
> automatisch nur auf „Desktop Chrome"/„Mobile" (beide Chromium) und „Tablet" (WebKit, aber
> Touch-emuliert). Die in 3.4 geforderte Prüfung auf allen drei Engines entsteht also
> **nicht von selbst**; siehe neuer Grenzfall 4.23 sowie Ergänzungen in 3.4 und Abschnitt 9.
>
> **Product-Owner-Review (dieser Durchlauf, 2026-07-05).** Erneut sämtliche zitierten
> Fundstellen direkt gegen den aktuellen Arbeitsstand gelesen (`schema.ts:157-196`,
> `Toolbar.tsx:1-240`, `commands.ts:104-122`, `WordEditor.tsx:75-145`, `docx/reader.ts:1-115`,
> `docx/writer.ts:1-40`, `odt/styleRegistry.ts:1-65`, `playwright.config.ts`,
> `clipboard.spec.ts:34-47,148-168,368-380`, `cut.spec.ts:348-361`) sowie die Existenz aller
> in Abschnitt 6 benannten Fixture-Dateien (`52288.docx`, `bug65649.docx`, `Tika-792.docx`,
> alle neun ODT-Dateien) direkt im Dateisystem — **jede einzelne Behauptung erneut bestätigt,
> keine Korrektur nötig.** Eine bisher **fehlende** Klarstellung wurde ergänzt: `git status`
> zu Beginn dieses Durchlaufs zeigt praktisch das gesamte `specs/`-Verzeichnis als geändert
> (parallele Bearbeitung durch andere Rollen/Instanzen an anderen Feature-Dateien) —
> unabhängig davon bleibt der für **diese** Datei relevante Befund: `specs/FEATURE-BACKLOG.md`
> Zeile 59 führt `speichern-unter-format` („Zielformat beim Export wählen, Cross-Format") nach
> wie vor mit Status **„fehlt"**, und das ist am Code nachvollzogen, nicht nur am Backlog
> abgelesen — `src/app/DocumentWorkspace.tsx` ruft ausnahmslos `module.exportFile(...)` auf
> (Zeile 81, das `module` ist exakt das beim Öffnen/Anlegen verwendete Format-Modul), und
> `src/formats/docx/docx.ts`/`src/formats/odt/odt.ts` definieren `exportFile` jeweils fest
> auf `writeDocx`/`writeOdt` — es gibt **keinen** UI-Weg, ein geöffnetes DOCX als ODT (oder
> umgekehrt) zu exportieren; `src/formats/registry.ts` bestätigt zusätzlich, dass nur genau
> zwei Format-Module überhaupt existieren. Frühere Fassungen dieser Datei formulierten
> Abschnitt 6, Testfälle 3–5 („DOCX importieren, als ODT exportieren" u. ä.) unkommentiert so,
> als wäre das ein normaler Browser-Ablauf — das ist es **nicht**, exakt derselbe, bereits an
> `specs/fett-req.md` Abschnitt 0 Punkt 3 dokumentierte Befund gilt hier unverändert. Korrigiert
> in Abschnitt 6 (Testfälle 3–5), Abschnitt 7 (Testfall 9) und Abschnitt 9 (Abnahmekriterium 2).

Geltungsbereich: ausschließlich das Zeichenformat „Schriftfarbe" (Mark `textColor` im
gemeinsamen ProseMirror-Schema). Das strukturell fast identische, aber inhaltlich andere
Feature „Texthervorhebungsfarbe/Textmarker" (Mark `highlight`, Hintergrundfarbe) ist
Gegenstand von `specs/textmarker-farbe-req.md` und wird dort separat verifiziert, obwohl
beide dieselbe generische Infrastruktur teilen (`applyMarkColor`/`clearMarkColor`,
`ColorMarkName`, identisches Toolbar-Layout). Diese Datei behandelt die
Hervorhebungsfarbe nur dort, wo sie mit der Schriftfarbe **kombiniert** wird
(Abschnitt 3.7) oder wo ein Fund aus dieser Datei identisch auf `textmarker-farbe`
zutrifft (dann als Querverweis vermerkt, nicht doppelt ausformuliert).

---

## 0. Vorgefundener Implementierungsstand (Referenz, **kein** Ersatz für echtes Testen)

Alle Zeilenangaben wurden am 2026-07-04 direkt am Quellcode geprüft; sie können bei
späteren Änderungen verrutschen — deshalb ist jeweils zusätzlich die tragende Funktion
genannt. Code-Vorhandensein wurde in der Projektvorgeschichte wiederholt mit
„funktioniert" verwechselt (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17); diese Tabelle
ist der Ausgangspunkt der Verifikation, nicht ihr Ergebnis.

| Ebene | Fundstelle (Datei · Funktion · Zeilen) | Ist-Zustand |
|---|---|---|
| Schema (Mark-Definition) | `src/formats/shared/schema.ts` · Mark `textColor` · Z. 182–188 | `attrs: { color: { validate: 'string' } }` (nur „ist ein String", keine Formatprüfung); `parseDOM: [{ style: 'color', getAttrs: (value) => ({ color: value }) }]` (übernimmt **jeden** CSS-`color`-Wert roh); `toDOM(mark) → ['span', { style: \`color: ${mark.attrs.color}\` }, 0]` |
| Toolbar-Bedienelement (Farbwähler) | `src/formats/shared/editor/Toolbar.tsx` · Z. 191–199 | `<label title="Textfarbe">` mit sichtbarem `<span aria-hidden>A</span>` + `<input aria-label="Textfarbe" type="color">`, `onChange={(e) => run(view, applyMarkColor('textColor', e.target.value))}`. **Kein gebundener `value`** — das Feld zeigt nie die an der Selektion tatsächlich vorhandene Farbe |
| Toolbar-Bedienelement („Entfernen") | `src/formats/shared/editor/Toolbar.tsx` · Z. 200–210 | Separater `<button title="Textfarbe entfernen">` mit Unicode-Glyph „⌫" (kein `aria-label`, kein SVG); `onMouseDown` mit `e.preventDefault()` (erhält die Selektion) → `clearMarkColor('textColor')` |
| Fokus-Rückholung nach Befehl | `src/formats/shared/editor/Toolbar.tsx` · `run()` · Z. 28–31 | Jeder Toolbar-Befehl ruft nach Ausführung `view.focus()` — relevant für das Verhalten während des offenen nativen Farbwähler-Dialogs, siehe Abschnitt 3.4 |
| Befehle | `src/formats/shared/editor/commands.ts` · `applyMarkColor`/`clearMarkColor` · Z. 104–122 | `ColorMarkName = 'textColor' \| 'highlight'`; `applyMarkColor` setzt per `tr.addMark(from, to, …)`, `clearMarkColor` entfernt per `tr.removeMark(from, to, …)`; **beide brechen mit `return false` ab, wenn `state.selection.empty` ist** (Z. 109 bzw. 118) |
| Tastenkürzel | `src/formats/shared/editor/WordEditor.tsx` · Keymap · Z. 85–107 (Stand 2026-07-05; durch den zwischenzeitlichen Ausschneiden-Commit `9f8fa03` um 8 Zeilen verschoben, vormals Z. 77–99) | **Keins.** Keymap bindet nur `Mod-z/y/Shift-z` (Undo/Redo), `Enter`/`Shift-Enter`, `Mod-b/i/u` und `Shift-Delete` — kein Eintrag für Schriftfarbe |
| Einfügen aus Zwischenablage | `src/formats/shared/editor/WordEditor.tsx` · `EditorView`-Konfiguration · Z. 122–133 (Stand 2026-07-05; dieselbe Verschiebung wie oben, vormals Z. 114–125) | **Keine** `transformPasted`/`handlePaste`/`clipboardParser`-Überschreibung; nur `clipboardTextSerializer` (für die Kopier-Serialisierung) ist gesetzt. Eingefügtes HTML wird daher über die Schema-`parseDOM`-Regeln geparst → ein Inline-`color:`-Stil wird zu einer `textColor`-Mark mit dem **rohen** CSS-Wert (siehe Abschnitt 3.10) |
| DOCX-Export | `src/formats/docx/writer.ts` · `runPropertiesXml` · Z. 27 | `mark.type === 'textColor'` → `<w:color w:val="${String(mark.attrs?.color ?? '').replace('#','')}"/>`. `.replace('#','')` entfernt nur das **erste** „#"; keine weitere Validierung/Normalisierung. **`escapeXml` ist in der Datei importiert (Z. 3) und wird für Textinhalt (Z. 37), Bild-Alt-Text (Z. 83) und `dc:title` (Z. 224) verwendet — aber NICHT für diesen Attributwert.** Ein Farbwert mit `"`/`&`/`<` (aus Import/Paste, siehe unten) erzeugt daher nicht wohlgeformtes DOCX (Grenzfall 21) |
| DOCX-Import | `src/formats/docx/reader.ts` · `marksFromRunProperties` · Z. 108–110 | Liest `<w:color w:val="…">` **nur auf Lauf-Ebene** (`w:r/w:rPr`), ignoriert Wert `"auto"`, stellt sonst `#` voran (`#${colorVal}`) und übernimmt den Rest **unverändert** (keine Groß-/Kleinschreibungs-Normalisierung, keine Auswertung von `w:themeColor`) |
| DOCX-Import (Stilfarbe) | `src/formats/docx/reader.ts` · `parseStylesXml` · ~Z. 53–67 | Liest je `<w:style>` **nur** `w:pPr/w:outlineLvl`; das `w:rPr/w:color` einer Absatz-Stildefinition und die `w:basedOn`-Kette werden **nie** ausgewertet → auf Stilebene eingefärbte Absätze verlieren beim Import ihre Farbe (Grenzfall 21, belegt an `52288.docx`) |
| ODT-Export (Mark→Prop) | `src/formats/odt/writer.ts` · `runPropsFromMarks` · Z. 39 | `mark.type === 'textColor'` → `props.color = mark.attrs?.color` |
| ODT-Export (Prop→XML) | `src/formats/odt/styleRegistry.ts` · `buildTextStyleXml` · Z. 56 | `fo:color="${escapeXml(props.color)}"` als Attribut eines automatischen `style:style` (Familie „text"). `isEmpty()` (Z. 12–14) behandelt jeden gesetzten `color`-String als „nicht leer"; Dedup-Schlüssel ist `JSON.stringify(props)` (Z. 30) |
| ODT-Import | `src/formats/odt/reader.ts` · `parseAutomaticStyles` (Z. 58–59) / `marksFor` (Z. 109) | Liest `fo:color` aus `style:text-properties` von Styles der Familie „text" und erzeugt daraus die `textColor`-Mark. Gelesen wird ausschließlich `office:automatic-styles` — aus `content.xml` (→ Fließtext, Z. 363–364) und aus `styles.xml` (→ **nur** Kopf-/Fußzeile, Z. 373–388). **`office:styles` (benannte/gemeinsame Zeichenformatvorlagen) wird nirgends ausgewertet** |
| Groß-/Kleinschreibung | `src/formats/**` (Volltextsuche) | Für Farbwerte findet **keine** Normalisierung statt. Die einzigen zwei `.toLowerCase()`-Aufrufe im Reader-Code (`docx/reader.ts:451`, `odt/reader.ts:338`) betreffen **Bilddatei-Endungen**, nicht Farben |
| Unit-Tests (Rundreise, konstruierte Testdaten) | `src/formats/docx/__tests__/roundtrip.test.ts:100`, `src/formats/odt/__tests__/roundtrip.test.ts:102` | Testfall „preserves text color and highlight color" — prüft ausschließlich `#ff0000` (Schriftfarbe) und `#ffff00` (Hervorhebung), **direkt als ProseMirror-JSON konstruiert**, nicht über die UI erzeugt |
| Aktiv-/Ist-Zustand in der Toolbar | — | **Nicht vorhanden.** Anders als `strong`/`em`/`underline`/`strike` (`MarkButton` mit `aria-pressed` je nach `markType.isInSet(...)`, `Toolbar.tsx:69/75`) hat der Farbwähler keine Rückmeldung, welche Farbe an Cursor/Selektion aktiv ist; der native Farbchip zeigt nur die zuletzt manuell gewählte Sitzungsfarbe |

### 0.1 E2E-Ist-Stand — Korrektur eines früheren Fehlbefunds

Eine frühere Fassung dieser Anforderung behauptete, es gebe **keinen** E2E-Test, der die
Schriftfarbe berührt („`tests/e2e/` enthält keinen Treffer für „textColor"/„Textfarbe""). **Das
ist falsch.** Tatsächlich vorhanden (per Volltextsuche verifiziert):

| Fundstelle | Was der Test heute wirklich tut |
|---|---|
| `tests/e2e/clipboard.spec.ts:34–47` · Helfer `pickColor(page, label, hex)` | Setzt einen `<input type="color">` React-kompatibel (über den nativen `value`-Setter + `input`/`change`-Event), sodass `applyMarkColor` wie bei echter Nutzerbedienung ausgelöst wird. **Wiederverwendbarer Baustein** für alle neuen Schriftfarb-E2E-Tests |
| `tests/e2e/clipboard.spec.ts:148–168` · „Fett + Farbe + Hervorhebung kombiniert bleiben nach Kopieren/Einfügen erhalten" | Tippt Text, `Strg+A`, klickt „Fett", `pickColor('Textfarbe', '#ff0000')`, `pickColor('Hervorhebungsfarbe', '#00ff00')`, kopiert, fügt ein → erwartet, dass der eingefügte Lauf weiterhin `strong span span` (Fett + beide Farben) trägt. Deckt **Kombination + Kopieren/Einfügen** ab, **nicht** Export-Rundreise oder Entfernen |
| `tests/e2e/clipboard.spec.ts:368–380` · „Fokus-Isolation: Strg+C bei fokussiertem Textfarbe-Farbwähler" | Fokussiert `getByLabel('Textfarbe')`, `Strg+C` → Editor-Inhalt unverändert, keine Konsolenfehler |
| `tests/e2e/cut.spec.ts:348–361` · „Grenzfall 14: Fokus im Textfarbe-Farbwähler — Strg+X" | Fokussiert den Textfarbe-Farbwähler, `Strg+X` → Editor-Inhalt unverändert |

**Korrekt beschriebene Lücke** (das eigentliche Ziel dieser Anforderung): Es fehlt bislang
ein **dedizierter** E2E-Test, der (a) Schriftfarbe über die Toolbar auf eine Selektion
anwendet und die gerenderte Farbe im DOM prüft, (b) sie über den „⌫"-Button wieder
entfernt und die Entfernung prüft, und (c) die Schriftfarbe über **echten Datei-Export
und Re-Import** (DOCX **und** ODT) rundreist — statt nur über konstruiertes JSON
(Unit-Test) oder nur im Kopieren/Einfügen-Kontext. Ebenso fehlen E2E-Tests für die
Grenzfälle „leere Selektion", „gemischte Selektion", „explizites Schwarz vs. keine Farbe"
und „Fremddatei-Import".

---

## 1. Ziel

Nutzer:innen können markiertem Text eine frei wählbare Zeichenfarbe (Schriftfarbe)
zuweisen und diese ebenso wieder entfernen — konsistent in Editor-Anzeige, DOCX-Export
und ODT-Export — und die Farbe bleibt bei jeder Rundreise (Import → Export,
Export → Re-Import, Cross-Format) exakt erhalten, inklusive Kombination mit anderen
Zeichenformaten (fett, kursiv, unterstrichen, durchgestrichen, Hervorhebungsfarbe).

Explizit **nicht** Gegenstand dieser Anforderung (separate Backlog-Einträge bzw.
Abschnitt 5):
- `textmarker-farbe` (Hervorhebungsfarbe/Textmarker) — eigene Anforderung, teilt Code-Pfade,
  wird separat verifiziert; hier nur bei Kombination (3.7) berücksichtigt.
- `formatierung-loeschen` (Status `fehlt`) — sobald umgesetzt, muss diese Funktion auch die
  Schriftfarbe zurücksetzen; bis dahin keine Anforderung an diese Kombination (siehe 3.6).
- `schriftart-waehlen`/`schriftgroesse-waehlen` (Status `fehlt`) — keine inhaltliche
  Abhängigkeit zur Schriftfarbe, nur benachbarte Toolbar-Gruppe.
- Automatische Kontrast-/Lesbarkeitsprüfung — nicht gefordert (Grenzfall in 4.8).
- Design-/Theme-Farbpaletten (Word-„Designfarben", ODF-„Theme") — nicht gefordert; es wird
  ausschließlich mit expliziten RGB-Hex-Werten gearbeitet (siehe Abschnitt 5).

---

## 2. Menüpunkte / Bedienelemente

| # | Bedienelement | Ort | Ist-Zustand (zu verifizieren) | Soll |
|---|---|---|---|---|
| 1 | Sichtbares Label „A" | Zeichenformatierungs-Gruppe der Toolbar, direkt hinter dem Trenner nach „Durchgestrichen" (`Toolbar.tsx:191`) | Reiner Buchstabe „A" (`aria-hidden`), keine Farbunterlegung/kein Icon, das auf „Schriftfarbe" hindeutet; einzige semantische Kennzeichnung ist `title="Textfarbe"` am umgebenden `<label>` und `aria-label="Textfarbe"` am Input | Muss für sehende Nutzer:innen unmissverständlich als „Schriftfarbe" erkennbar sein — prüfen, ob ein reiner Buchstabe genügt (Vergleich mit Word/LibreOffice: „A" mit farbigem Unterstrich als Vorschau der zuletzt gewählten Farbe) |
| 2 | Farbwähler (`<input type="color">`) | Direkt neben Label „A" (`Toolbar.tsx:193–198`) | Natives Browser-Farbwahl-Widget, `aria-label="Textfarbe"`, `onChange` → `applyMarkColor('textColor', e.target.value)`. Kein gebundener `value` (startet immer beim Browser-Standard, i. d. R. `#000000`) | Klick öffnet den systemeigenen Farbwähler; nach Bestätigung wird die Farbe auf die aktuelle Selektion angewendet (Abschnitt 3) |
| 3 | „Entfernen"-Button („⌫") | Direkt nach dem Farbwähler (`Toolbar.tsx:200–210`) | `title="Textfarbe entfernen"`, kein `aria-label`; Inhalt ist der Unicode-Glyph „⌫" selbst; `onMouseDown`+`preventDefault` → `clearMarkColor('textColor')` | Entfernt die `textColor`-Mark der Selektion vollständig. **Rendering von „⌫" ist laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 Punkt 1 (Icon-Rendering — „⌫" dort ausdrücklich aufgeführt) als potenziell unzuverlässig gelistet** (leeres Rechteck/Fragezeichen auf Systemen ohne passende Glyphen) — auf mehreren Systemen/Browsern prüfen |
| 4 | Aktiv-/Ist-Zustands-Anzeige | — | **Nicht vorhanden** (kein gebundener `value`, kein `aria-pressed`-Äquivalent). Der native Farbchip zeigt nur die zuletzt in dieser Sitzung manuell gewählte Farbe, unabhängig vom Selektionsinhalt | Klären und dokumentieren, ob bewusste Design-Entscheidung (dann festhalten) oder zu schließende Lücke (z. B. Chip lädt beim Cursorwechsel die Farbe an `$from`). Bis dahin: **kein Soll-Verhalten unterstellen, nur Ist-Zustand verifizieren** |
| 5 | Tastenkombination | — | Nicht vorhanden (kein Keymap-Eintrag, `WordEditor.tsx:77–99`) | Kein Soll-Bestandteil (nicht im Backlog gefordert; Word/LibreOffice haben ebenfalls keinen Standard-Shortcut für freie Farbwahl) — nur dokumentieren |
| 6 | Kontextmenü (Rechtsklick) | — | Nicht vorhanden (kein eigenes Kontextmenü, `WordEditor.tsx:109–113`) | Kein Soll-Bestandteil — nur dokumentieren |
| 7 | Farbpalette/Swatches/„Zuletzt verwendet"/Hex-Direkteingabe | — | Nicht vorhanden — ausschließlich das native `<input type="color">`-Widget | Kein Soll-Bestandteil (Abschnitt 5) — dokumentieren, dass Aussehen/Bedienung vollständig vom Browser/Betriebssystem abhängen (Chrome/Firefox/Safari/Edge × Windows/macOS/Linux) |

### 2.1 Verwechslungsgefahr in der Toolbar und in Tests (wichtig für QA)

Die Toolbar enthält **zwei nahezu identische** Bedienelement-Paare direkt nacheinander:
Schriftfarbe (`aria-label="Textfarbe"`, Entfernen-Button `title="Textfarbe entfernen"`,
`Toolbar.tsx:191–210`) und **unmittelbar danach** Hervorhebungsfarbe
(`aria-label="Hervorhebungsfarbe"`, `title="Hervorhebung entfernen"`, `Toolbar.tsx:211–230`).
Beide sind `<input type="color">` bzw. ein „⌫"-Button und unterscheiden sich **nur** durch
`aria-label`/`title`. E2E-Tests müssen die Schriftfarbe zwingend über
`getByLabel('Textfarbe')` bzw. `getByTitle('Textfarbe entfernen')` ansprechen, sonst treffen
sie versehentlich den Textmarker. Der vorhandene Helfer `pickColor(page, 'Textfarbe', …)`
(`clipboard.spec.ts:39`) macht das bereits korrekt und ist zu übernehmen.

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Anwenden auf bestehende Selektion
- Text markieren → Farbwähler öffnen (Klick auf das Eingabefeld) → Farbe im nativen
  Dialog bestätigen → gesamte Selektion wird in der gewählten Farbe dargestellt
  (`tr.addMark(from, to, …)`).
- Die Selektion selbst darf durch die Aktion nicht verändert werden (Auswahlgrenzen
  bleiben erhalten, damit direkt eine weitere Formatierung angewendet werden kann).
- Erneutes Öffnen des Farbwählers auf derselben Selektion und Wahl einer anderen Farbe →
  vorherige Farbe wird vollständig durch die neue ersetzt. ProseMirror schließt
  gleichnamige Marks standardmäßig gegenseitig aus; `textColor` hat kein explizites
  `excludes` (`schema.ts:182–188`), greift also der Default „schließt sich selbst aus".
  Ergebnis: **keine** zwei gleichzeitigen `textColor`-Marks, kein Mischen — mit Testfall
  zu bestätigen, nicht nur anzunehmen.

### 3.2 Anwenden ohne Selektion (an der Schreibmarke) — bekannte Abweichung von den Bool-Marks
- **Ist-Implementierung:** `applyMarkColor` prüft `state.selection.empty` und gibt bei
  leerer Selektion sofort `false` zurück, **ohne** eine Transaktion zu dispatchen
  (`commands.ts:109`). Steht der Cursor ohne Selektion im Text und wird eine Farbe
  bestätigt, passiert **nichts** — kein Fehler, aber auch keine Wirkung, und die Farbe
  wird **nicht** wie bei Fett/Kursiv/Unterstrichen (die über `toggleMark`/„stored marks"
  auch ohne Selektion für nachfolgend getippten Text wirken) für neuen Text gemerkt.
- Das ist ein **Verstoß gegen „kein stiller Fehlschlag"** (`FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 20 Punkt 4): Der native Dialog öffnet sich zwar sichtbar, seine Bestätigung
  bleibt aber wirkungslos — für Nutzer:innen nicht von einem Bug unterscheidbar.
- **Anforderung an die Verifikation:** Erst als Ist-Zustand bestätigen (Cursor ohne
  Selektion, Farbe wählen, tippen → neuer Text bleibt in Vorgabefarbe). Dann mit
  Auftraggeber/Backlog klären, ob
  (a) akzeptabler, zu dokumentierender Fallback — dann muss der „Entfernen"-Button
  konsistent ebenso reagieren (siehe 3.5) und beides in der UI klar kommuniziert werden
  (z. B. Steuerelemente `disabled` bei leerer Selektion statt stillem No-Op), oder
  (b) nachzurüsten (analog zu Fett/Kursiv über „stored marks", sodass neu getippter Text
  ab der Schreibmarke die Farbe annimmt).
  Bis zur Klärung gilt der Ist-Zustand als das zu testende Verhalten, **muss aber in jedem
  Testlauf explizit dokumentiert werden**, nicht stillschweigend übergangen.

### 3.3 Anzeige des aktiven Zustands — bekannte Lücke
- Es existiert kein Mechanismus, der den Farbchip (oder ein anderes Toolbar-Element) auf
  die tatsächliche Farbe der Selektion/Cursor-Position setzt. Bewegt sich der Cursor durch
  farbigen Text, bleibt der Chip auf dem zuletzt manuell gewählten Wert stehen.
- Zu verifizieren: Führt das zu Fehlbedienung (Nutzer:in nimmt an, der markierte Text habe
  die im Chip gezeigte Farbe)? Ergebnis dokumentieren, unabhängig von einer Korrektur
  (siehe Abschnitt 2, Punkt 4).

### 3.4 Die Farbwahl-UI selbst (natives Browser-Widget)
- Die Auswahl erfolgt ausschließlich über das native `<input type="color">` des jeweiligen
  Browsers/Betriebssystems — keine eigene, plattformunabhängige Komponente.
- Zu verifizieren auf den Ziel-Browsern (Chromium, Firefox, WebKit — vgl.
  `playwright.config.ts`): Öffnet der Dialog zuverlässig per Klick/Tastatur
  (Enter/Leertaste bei Fokus per Tab)? Lässt sich ein beliebiger Hex-Wert eingeben
  (browserabhängig, i. d. R. über ein Hex-Feld im nativen Dialog)?
- **Kontinuierliches `onChange` während des Ziehens:** React bindet `onChange` an das native
  `input`-Event. Für `<input type="color">` feuern manche Browser (v. a. Chrome) `input`
  fortlaufend, während der Regler im geöffneten Dialog gezogen wird — nicht nur einmal beim
  Schließen. `applyMarkColor` würde dann während **eines** Auswahlvorgangs vielfach mit
  wechselndem Zwischenwert aufgerufen und könnte viele Undo-Schritte statt eines einzigen
  erzeugen. **Zu verifizieren:** Wie viele Undo-Schritte entstehen pro Auswahlvorgang im
  Zielbrowser, und ist ein einzelnes Strg+Z danach noch sinnvoll nachvollziehbar?
- **`view.focus()` bei offenem Dialog:** Der `run()`-Helfer (`Toolbar.tsx:28–31`) ruft nach
  jedem Befehl `view.focus()`. Feuert `onChange` mehrfach, während der native Dialog noch
  offen ist, wird `view.focus()` entsprechend mehrfach aufgerufen, obwohl der Fokus im
  Dialog liegen sollte. **Zu verifizieren:** Schließt der Dialog dadurch vorzeitig
  (Fokusentzug kann in manchen Browsern Popups schließen)?
- Positiver Ist-Befund als Absicherung: `clipboard.spec.ts:368` und `cut.spec.ts:348` zeigen
  bereits, dass ein fokussierter Textfarbe-Farbwähler bei `Strg+C`/`Strg+X` den
  Editor-Inhalt nicht verändert und keine Exception wirft — dieses Verhalten muss erhalten
  bleiben (Regression vermeiden).
- **Testinfrastruktur-Falle (siehe Grenzfall 4.23):** Die Mehrbrowser-Prüfung dieses
  Abschnitts entsteht nicht automatisch. `playwright.config.ts` führt Firefox und
  Desktop-Safari nur für Dateien aus, deren Name auf `clipboard*.spec.ts` passt; ein neuer,
  eigenständig benannter Test für Schriftfarbe liefe ohne bewusste Gegenmaßnahme nur auf
  Chromium (Desktop + Mobile) und WebKit-Tablet (Touch-emuliert, kein Desktop-Verhalten).

### 3.4.1 Verzahnung mit textmarker-farbe

Da Farbwähler und „Entfernen"-Button für Schriftfarbe und Hervorhebungsfarbe identisch
aufgebaut sind (Abschnitt 2.1) und dieselbe Testinfrastruktur-Einschränkung betreffen, sollte
die Entscheidung aus Grenzfall 4.23 einmal getroffen und für beide Anforderungen
(`schriftfarbe-req.md` und `specs/textmarker-farbe-req.md`) gemeinsam umgesetzt werden, statt
sie unabhängig doppelt zu lösen.

### 3.5 Entfernen der Farbe
- „⌫"-Button auf einer Selektion mit gesetzter Schriftfarbe → Mark `textColor` wird
  vollständig entfernt (`tr.removeMark`), Text kehrt zur automatischen/geerbten Farbe
  zurück (typischerweise Schwarz, abhängig vom Basis-/Absatzformat).
- Wie in 3.2: `clearMarkColor` bricht bei leerer Selektion mit `return false` ab
  (`commands.ts:117`) — „Entfernen" ohne Markierung tut nichts (gleiches Muster, gleiche
  Anforderung an sichtbare Rückmeldung).
- Entfernen auf einer Selektion **ohne** Schriftfarbe → `removeMark` ist ein No-Op, darf
  keinen Fehler und keinen leeren Undo-Schritt provozieren.
- Entfernen auf einer **gemischten** Selektion (teils farbig, teils nicht) → `removeMark`
  entfernt die Mark überall dort, wo sie vorkommt, lässt den Rest unverändert. Es gibt kein
  Toggle-Konzept wie bei den Bool-Marks, sondern getrennte „Setzen"/„Entfernen"-Aktionen
  (siehe Grenzfall in 4.6).

### 3.6 Kombination mit anderen Zeichenformaten
- Schriftfarbe muss unabhängig und gleichzeitig mit Fett, Kursiv, Unterstrichen,
  Durchgestrichen und Hervorhebungsfarbe auf demselben Textlauf anwendbar sein. Für keine
  dieser Marks ist ein `excludes` gegen `textColor` definiert (`schema.ts`), sie sind also
  in ProseMirror voneinander unabhängig.
- Entfernen der Schriftfarbe darf die anderen Formatierungen nicht beeinflussen und
  umgekehrt (jede Mark einzeln setz-/entfernbar). Reihenfolge des Anwendens darf das
  Endergebnis nicht verändern.
- Sobald `formatierung-loeschen` (Status `fehlt`) umgesetzt ist, muss diese Funktion auch
  die Schriftfarbe zuverlässig entfernen. Bis dahin: keine Anforderung an diese
  Kombination, im Test als „nicht anwendbar, da Zielfunktion fehlt" vermerken.

### 3.7 Zusammenspiel mit Hervorhebungsfarbe (`textmarker-farbe`)
- `textColor` (Vordergrund) und `highlight` (Hintergrund) sind technisch unabhängige Marks
  (`ColorMarkName = 'textColor' | 'highlight'`, `commands.ts:104`) über getrennte
  Toolbar-Elemente — beide gleichzeitig auf demselben Textlauf anwendbar (z. B. roter Text
  auf gelbem Hintergrund).
- Zu verifizieren: Setzt das Anwenden der einen Farbe versehentlich die andere zurück? Laut
  Code (separates `addMark` je Markname) sollte das nicht passieren — über echte Bedienung
  zu bestätigen, nicht nur per Code-Lektüre. Der vorhandene Test
  „Fett + Farbe + Hervorhebung kombiniert" (`clipboard.spec.ts:148`) belegt bereits, dass
  beide Farben **plus** Fett gemeinsam einen Kopiervorgang überstehen; die Export-Rundreise
  dieser Kombination ist zusätzlich in Abschnitt 6.8 gefordert.
- Kontext (damit bei gemeinsamer Prüfung keine Verwechslung entsteht): Die
  Hervorhebungsfarbe nutzt im DOCX-Export bewusst `<w:shd w:val="clear" w:color="auto"
  w:fill="RRGGBB"/>` (Schattierung) statt Words auf eine feste Palette begrenztes
  `<w:highlight>` — das erlaubt freie RGB-Werte. Für die **Schriftfarbe** besteht dieses
  Problem nicht, da `<w:color w:val="…"/>` in OOXML bereits beliebige RGB-Werte vorsieht.

### 3.8 Exakte Farbwerterhaltung bei Rundreise
- Die im UI gewählte Farbe stammt aus `<input type="color">` und liegt laut
  HTML-Spezifikation stets als sechsstelliger, **kleingeschriebener** Hex-Code (`#rrggbb`,
  ohne Alphakanal) vor.
- DOCX-Export schreibt den Wert ohne „#" in `w:val` (z. B. `w:val="ff0000"`), DOCX-Import
  stellt beim Einlesen wieder „#" voran. **Keine** Seite normalisiert die
  Groß-/Kleinschreibung (die einzigen `.toLowerCase()`-Aufrufe im Reader betreffen
  Bilddatei-Endungen, siehe Abschnitt 0).
- **Grenzfall Fremddateien:** Mit Word erzeugte Dateien schreiben `w:val` häufig in
  Großbuchstaben (`w:val="FF0000"`). Diese Schreibweise bleibt nach Import erhalten
  (`#FF0000`) und unterscheidet sich als **String** von einer über die eigene UI gewählten
  Farbe (`#ff0000`) — visuell identisch (CSS-Farbwerte sind case-insensitiv), aber bei
  strikten Rundreise-Tests mit exakter String-Gleichheit fälschlich als „Abweichung"
  wertbar. Testfälle müssen case-insensitiv bzw. nach Normalisierung vergleichen, nicht per
  reinem String-Diff.
- ODT-Export/-Import übernimmt `fo:color` als String; beim Export wird nur XML-escaped
  (`escapeXml`, `styleRegistry.ts:56`), **keine Farbformat-Validierung**. Ein Import-Wert,
  der kein gültiger `#rrggbb`-Hex-String ist, landet unverändert im `style`-Attribut des
  `<span>` (`toDOM`) — der Browser ignoriert ungültige CSS-Farbwerte dann still (Text
  erscheint in der geerbten Farbe). Mit mindestens einem gezielten Testfall
  (ungültiger/exotischer Wert in einer Testdatei) prüfen und das Fallback dokumentieren.

### 3.9 „Farbe bleibt nach Formatwechsel erhalten" (Formulierung aus `FEATURE-SPEC-DOCX-ODT.md`)
Zu klären, was mit „Formatwechsel" gemeint ist; mindestens folgende Lesarten prüfen und das
Ergebnis hier festhalten:
1. Wechsel des Dateiformats (DOCX ↔ ODT) — abgedeckt durch die Rundreise (Abschnitt 6).
2. Wechsel des Absatzformats (Standard → Überschrift 1 und zurück) auf farbigem Textlauf —
   verifizieren, dass `setHeading` (`commands.ts:40–55`, ändert nur den Blocktyp via
   `setBlockType`, nicht die Inline-Marks) die `textColor`-Mark nicht antastet.
3. Ein-/Ausschalten anderer Zeichenformate (Fett an/aus) auf demselben Textlauf —
   verifizieren, dass ein `toggleMark` für `strong`/`em`/… die `textColor`-Mark nicht
   mitentfernt (ProseMirrors `toggleMark` wirkt nur auf die eigene Mark-Art).

### 3.10 Einfügen von extern kopiertem, farbigem Text (Zwischenablage) — bisher nicht spezifiziert
- Der Editor setzt **keine** `transformPasted`/`handlePaste`/`clipboardParser`-Überschreibung
  (`WordEditor.tsx:114–125`); eingefügtes HTML wird über die Schema-`parseDOM`-Regeln
  interpretiert. Die Regel `{ style: 'color', getAttrs: (value) => ({ color: value }) }`
  (`schema.ts:184`) erzeugt daher aus einem Inline-`color:`-Stil (z. B. aus einer Webseite
  oder einer echten Word/Writer-HTML-Zwischenablage) eine `textColor`-Mark mit dem **rohen,
  ungeprüften** CSS-Wert — das kann ein Hex-Code (`#ff0000`), aber auch ein CSS-Farbname
  (`red`), `rgb(255,0,0)`, `rgba(...)` oder `hsl(...)` sein.
- **Erwünschtes Grundverhalten:** Farbiger Text, der aus einer externen Quelle eingefügt
  wird, soll seine Farbe im Editor sichtbar behalten (kein stiller Verlust). Kopieren/
  Einfügen **innerhalb** des Editors bewahrt die Farbe bereits nachweislich
  (`clipboard.spec.ts:148`, eingefügter Lauf trägt weiterhin `span`-Farbe).
- **Zu verifizierendes Risiko (Export-Gültigkeit):** Ein nicht-Hex-Wert überlebt den Import
  in die Mark, aber der DOCX-Export verarbeitet ihn nur mit `.replace('#','')`
  (`writer.ts:27`) und schreibt ihn direkt in `w:val`. Ein Wert wie `red` oder
  `rgb(255,0,0)` erzeugt damit ein laut OOXML-Schema **ungültiges** `<w:color w:val="red"/>`
  bzw. `<w:color w:val="rgb(255,0,0)"/>` (zulässig sind nur sechsstelliges Hex oder
  `"auto"`). Der ODT-Export (`fo:color="red"`) ist ebenfalls nicht ODF-konform (auch dort
  ist `fo:color` als `#rrggbb` definiert), wird von LibreOffice aber toleranter behandelt.
  **Muss geprüft werden**, ob (a) eine Normalisierung/Validierung vor dem Export existiert
  (laut Codelage aktuell **nein**) und (b) dieser Pfad tatsächlich ungültiges OOXML
  erzeugt — dann als Fund festhalten (Normalisierung nach `#rrggbb` beim Import oder vor dem
  Export nachrüsten) oder bewusst als dokumentierte Einschränkung akzeptieren.
- Einfügen von Text ganz **ohne** `color:`-Stil erzeugt erwartungsgemäß **keine**
  `textColor`-Mark.

---

## 4. Grenzfälle

1. **Cursor ohne Selektion (Schreibmarke):** Setzen **und** Entfernen haben laut Code keine
   Wirkung (kein JS-Fehler, keine Rückmeldung). Als Ist-Zustand bestätigen und explizit
   dokumentieren (siehe 3.2/3.5).
2. **Selektion über mehrere Absätze:** Farbe wird auf alle enthaltenen Textläufe beider
   Absätze angewendet, keine Elemente ausgelassen, Absatzwechsel bleibt unbeschädigt.
3. **Selektion über eine Tabellen-Zellgrenze:** Farbe wird konsistent in allen betroffenen
   Zellen gesetzt, kein Crash, keine Vermischung mit Nachbarzellen.
4. **Rein aus Leerzeichen bestehende Selektion:** Mark wird technisch gesetzt (optisch kaum
   sichtbar); kein Sonderfall, der die Aktion verweigert.
5. **Selektion, die ein eingefügtes Bild einschließt (Block-Node ohne Marks):** Aktion darf
   nicht abstürzen; auf das Bild selbst hat die Mark keine Wirkung, auf enthaltenen Text
   schon.
6. **Gemischte Selektion (teils farbig — ggf. unterschiedlich —, teils ohne Farbe):** Kein
   Toggle-Konzept. Setzen überschreibt die gesamte Selektion einheitlich mit der neuen Farbe
   (`addMark` über den ganzen Bereich), unabhängig vom Vorzustand; Entfernen (`removeMark`)
   entfernt die Mark überall. Kein „gemischt"-Zwischenzustand, keine Rückfrage — verifizieren
   und dokumentieren.
7. **Erneutes Anwenden derselben Farbe:** Keine doppelten `textColor`-Marks, kein Fehler,
   Ergebnis identisch; klären, ob ein „leerer" Undo-Schritt entsteht (soll vermieden werden).
8. **Schriftfarbe ≈ Hintergrund-/Hervorhebungsfarbe (z. B. Weiß auf Weiß):** Text faktisch
   unsichtbar. Kein automatischer Kontrast-Hinweis vorhanden und laut Abschnitt 1 nicht
   gefordert — nur verifizieren, dass die App nicht abstürzt und die Farbe korrekt
   gespeichert/exportiert wird (Datenintegrität unabhängig von Lesbarkeit).
9. **Explizit gesetztes Schwarz (`#000000`) vs. keine Farbe gesetzt:** Optisch identisch
   (Standardtextfarbe ist ebenfalls Schwarz), muss aber strukturell unterscheidbar bleiben —
   ein Dokument mit expliziter `textColor`-Mark `#000000` darf beim Export nicht mit einem
   ohne jede Farbmarkierung verwechselt werden (eigene Style-Definition in ODT via
   `TextStyleRegistry` bzw. eigenes `<w:color>` in DOCX). Beachte: Da der Farbwähler ohne
   `value`-Bindung standardmäßig `#000000` zeigt, kann ein Bestätigen „ohne bewusste Wahl"
   ungewollt explizites Schwarz setzen — auch das ist zu prüfen. Mit gezieltem Testfall
   sicherstellen, dass „#000000 explizit" bei Rundreise als eigene Mark erhalten bleibt.
10. **Farbwert mit Alphakanal oder ungültigem/exotischem Format aus Fremddateien:** Reader
    übernehmen jeden String unvalidiert (`reader.ts` docx/odt); Verhalten bei ungültigen
    Werten (Text in geerbter Farbe statt Fehlermeldung) mit echter Testdatei prüfen und als
    bewussten Fallback dokumentieren.
11. **Word-Theme-Farben (`w:themeColor` statt/zusätzlich zu `w:val`):** Echte Word-Dateien
    können Zeichenfarbe über einen Theme-Verweis setzen
    (`<w:color w:val="auto" w:themeColor="accent1"/>`). Der Reader wertet ausschließlich
    `w:val` aus und ignoriert `w:themeColor`; bei `w:val="auto"` entsteht **gar keine**
    `textColor`-Mark, obwohl die Datei in Word/LibreOffice eine sichtbare Theme-Farbe zeigt.
    Mit echter Word-Datei prüfen und Fallback (Farbe geht verloren, Text bleibt in
    Standardfarbe lesbar) dokumentieren.
12. **ODT-Import: Farbe über benannte/gemeinsame Zeichenformatvorlage (`office:styles`) statt
    automatische (`office:automatic-styles`):** Der Reader liest Textstile ausschließlich aus
    `office:automatic-styles` (`content.xml` → Fließtext; `styles.xml` → nur Kopf-/Fußzeile).
    `office:styles` (benannte Zeichenstile) wird nirgends ausgewertet, und `style:parent-style-name`
    (Vererbung von einem übergeordneten Stil) wird nicht aufgelöst. Wird Schriftfarbe in einer
    echten LibreOffice-Datei über einen benannten Zeichenstil vergeben, geht sie beim Import
    vermutlich verloren (kein Absturz, aber stiller Formatierungsverlust). Mit echter
    Testdatei prüfen — konkrete Kandidaten siehe Abschnitt 6, Fixtures.
13. **Cross-Format-Rundreise / Namens-Dedup:** ODT-Export erzeugt automatische Textstilnamen
    (`T1`, `T2`, …) über `TextStyleRegistry` je Merkmalskombination (Dedup-Schlüssel
    `JSON.stringify(props)`, `styleRegistry.ts:30`, inkl. exaktem Farbwert). Verifizieren,
    dass bei vielen Farbwerten keine Kollision/Fehlzuordnung auftritt. Zusatzbefund:
    Farbwerte, die sich nur in Groß-/Kleinschreibung unterscheiden (`#FF0000` vs. `#ff0000`),
    ergeben wegen reinen String-Vergleichs zwei separate, optisch identische Stildefinitionen
    — keine Fehlfunktion, aber unnötige Style-Vervielfachung, die farbenreiche Dateien
    aufbläht.
14. **Datei ohne jede Formatierung, nur Schriftfarbe gesetzt:** Export darf keine unnötigen
    leeren Style-Definitionen erzeugen und muss valide bleiben (`isEmpty()`,
    `styleRegistry.ts:12–14` — mit genau der Kombination „nur Schriftfarbe" testen, nicht nur
    in Kombination mit anderen Marks).
15. **Sehr viele unterschiedliche Farbwerte (Regenbogen-Text, Wort für Wort andere Farbe):**
    Kein Performance-Einbruch bei Rendern/Export/Import, keine Style-Explosion, die die Datei
    unbrauchbar macht.
16. **Kontinuierliches `onChange` und `view.focus()` bei offenem Farbwähler:** Siehe 3.4 —
    prüfen, ob (a) der native Dialog vorzeitig schließt oder (b) unnötig viele Undo-Schritte
    entstehen.
17. **Rückgängig/Wiederholen:** Strg+Z nach Farbwahl macht die Formatierung exakt rückgängig
    (auch im Modell, nicht nur visuell); Strg+Y/Strg+Umschalt+Z stellt sie wieder her. Auch
    nach einer Sequenz (Farbe setzen → andere Farbe → entfernen) schrittweise korrekt — unter
    Berücksichtigung von Grenzfall 16 (evtl. mehr Zwischenschritte als erwartet).
18. **Kombiniert mit dem Selection-Sync-Bug** (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2, Fix
    `reconcileSelectionOnClick` in `WordEditor.tsx:43–50`): Alles auswählen → Schriftfarbe
    anwenden → per Klick neu positionieren → Enter → weitertippen — beide entstehenden Absätze
    müssen erhalten bleiben UND ihre korrekte Farbe behalten. Da Abschnitt 2 „Fett" als
    Beispiel nennt, prüfen, ob der Bug-Pfad auch mit „Schriftfarbe" reproduzierbar ist.
19. **Fokus-Erhalt nach Bedienung:** Nach Abschluss der Farbwahl (Dialog geschlossen) bleibt
    der Editor fokussiert und die ursprüngliche Selektion sichtbar aktiv (kein Cursorsprung) —
    unter Vorbehalt von Grenzfall 16.
20. **Einfügen von extern kopiertem Text mit nicht-Hex-Farbwert (CSS-Farbname / `rgb()` /
    `rgba()` / `hsl()`):** Siehe 3.10. Prüfen: (a) Farbe im Editor sichtbar erhalten? (b)
    Erzeugt der anschließende DOCX-Export ungültiges `w:val` (bzw. ODT nicht-konformes
    `fo:color`)? (c) Bleibt der Export trotzdem in Word/LibreOffice ladbar, oder verweigert
    ein strenger Parser/Validator die Datei? Ergebnis als Fund oder als dokumentierte
    Einschränkung festhalten.
21. **DOCX-Import: Schriftfarbe ausschließlich über einen Absatz-/Zeichenstil definiert
    (`w:style/w:rPr/w:color`, inkl. `w:basedOn`-Vererbungskette), kein `w:color` am Lauf
    selbst:** Das DOCX-Gegenstück zu Grenzfall 12 und die symmetrische zweite Hälfte des in
    Abschnitt 0 (Tabellenzeile „DOCX-Import (Stilfarbe)") genannten Befunds. `parseStylesXml`
    (`reader.ts:53–67`) wertet je `<w:style>` heute **nur** `w:pPr/w:outlineLvl` aus; das
    `w:rPr/w:color` einer Stildefinition und die `w:basedOn`-Kette werden nie aufgelöst.
    `marksFromRunProperties` (`reader.ts:100–115`) sieht nur das Lauf-`rPr`. Ein Absatz, dessen
    Farbe **allein** aus dem referenzierten Absatzstil stammt (Alltagsbedienung in Word:
    „ganzen Absatz markieren → Farbe zuweisen" — Word legt die Farbe dann bevorzugt auf
    Stilebene ab), importiert daher **ohne jede `textColor`-Mark** → stiller Formatverlust,
    der die verbindliche Rundreise (Abschnitt 6, Testfall 6) bedroht. Belegt an
    `tests/fixtures/external/docx/52288.docx` (Stil `ChapterNumber` → `w:basedOn="ChapterName"`,
    `w:rPr/w:color="000000"`, Lauf „CHAPTER 1" ohne eigenes `w:color`). **Wichtige Nuance:** In
    dieser konkreten Datei ist die Stilfarbe Schwarz — der Verlust ist strukturell nachweisbar,
    aber nicht sichtbar (Schwarz auf Weiß); für einen sichtbaren-Verlust-Nachweis zusätzlich
    eine Datei mit nicht-schwarzer Absatzstil-Farbe verwenden oder handbauen. Mit echter
    Testdatei prüfen; Fallback dokumentieren (kein Absturz, Text bleibt in Standardfarbe lesbar)
    — und zirkuläre `w:basedOn`-Ketten aus korrupten Dateien dürfen bei einer etwaigen
    Nachbesserung keine Endlosschleife auslösen (Tiefenlimit).
22. **DOCX mit Track-Changes-Formatverlauf (`w:rPrChange`) statt aktueller Farbe:** Word
    zeichnet bei aktivierter Änderungsverfolgung die **vorherige** Formatierung eines Laufs
    vor einer Formatänderung in `<w:rPrChange>` auf — verschachtelt innerhalb des aktuellen
    `w:rPr`, nicht als dessen Ersatz. `marksFromRunProperties` (`reader.ts:100–115`) liest
    über `firstChildNS`/`childElements` (`reader.ts:16–22`) ausschließlich **direkte**
    Kind-Elemente von `w:rPr` (Filter auf `el.children`) — eine nur in `w:rPrChange`
    verschachtelte `w:color` wird also nicht gefunden. **Das ist strukturell richtig**
    (`w:rPrChange` dokumentiert Historie, nicht den aktuellen Zustand; Änderungsverfolgung
    selbst ist laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13 ohnehin „noch nicht begonnen")
    und muss mit einem gezielten Testfall als bewusst korrektes Verhalten **bestätigt**
    werden, nicht nur angenommen. Belegt an `tests/fixtures/external/docx/Tika-792.docx`:
    ihr einziger `w:color`-Beleg in der gesamten `document.xml` (`w:val="FF0000"`) liegt
    exakt in einem solchen `w:rPrChange`; der zugehörige Lauf ist zusätzlich in
    `<w:moveFrom><w:ins>…<w:r>…</w:r></w:ins></w:moveFrom>` verschachtelt. `collectRuns`
    (`docx/reader.ts:194–215`) erkennt als zu durchquerende Wrapper nur
    `r`/`del`/`ins`/`hyperlink`/`smartTag`/`sdt`/`fldSimple` — **`moveFrom` fehlt in dieser
    Liste** —, wodurch dieser eine Lauf beim Import komplett entfällt (Textverlust,
    unabhängig von der Farbfrage; als eigener Fund außerhalb dieser Anforderung an
    `datei-oeffnen`/Import-Robustheit zu melden, hier nur als Beleg dafür, warum die Datei
    für einen Schriftfarbe-Rundreisetest ungeeignet ist — siehe Korrektur in Abschnitt 6).
    Als tatsächlich geeigneter Ersatzkandidat mit echter, unverschachtelter Lauf-Farbe wurde
    `bug65649.docx` verifiziert (u. a. `w:val="FF0000"`/`"0000FF"` direkt in `w:r/w:rPr` auf
    lesbarem Fließtext, mehrfach, keine `rPrChange`-Verschachtelung) — dieselbe Datei, die
    `specs/textmarker-farbe-req.md` bereits für echte `w:highlight`-Werte verifiziert, trägt
    damit nachweislich **beide** Marks real und eignet sich zusätzlich für einen
    kombinierten Schriftfarbe+Hervorhebung-Fremddatei-Test (siehe Abschnitt 3.7,
    Rundreise-Testfall 8).

---

## 5. Nicht-Ziele / bewusste Abgrenzung

Folgende, in vollwertigen Textverarbeitungen übliche Zusatzfunktionen sind **nicht**
Gegenstand dieser Anforderung und dürfen bei der Verifikation nicht als fehlend
„mitgezählt" werden, solange sie nicht separat im Backlog geführt werden:

- Eigene, plattformunabhängige Farbwähler-Komponente mit Palette/Swatches (statt nativem
  `<input type="color">`).
- Hex-Wert direkt als Text eingeben, ohne den nativen Dialog zu öffnen.
- Liste „zuletzt verwendeter Farben" oder Design-/Theme-Farbpaletten.
- Automatische Kontrastprüfung/-warnung.
- Farbverläufe, Transparenz/Alphakanal.
- Auswertung von Word-„Designfarben" (Theme Colors) beim Import (Grenzfall 4.11 — dort nur
  als zu dokumentierender Fallback, nicht als zu bauende Funktion).
- Auflösung benannter ODT-Zeichenstile aus `office:styles` (Grenzfall 4.12 — als Fund zu
  dokumentieren; ob nachzurüsten, entscheidet der Leiter separat).

---

## 6. Rundreise-Anforderung (verbindlich)

Für **jede** folgende Kombination gilt: Datei mit farbigem Text hochladen (bzw. im Editor
erzeugen) → **unverändert** exportieren → erneut importieren → die Schriftfarbe ist an
exakt derselben Textstelle mit exakt demselben (case-insensitiv verglichenen) Farbwert
weiterhin vorhanden, kein sonstiger Inhaltsverlust, keine zusätzliche/fehlende Farbe an
anderer Stelle.

1. **DOCX-Eigenrundreise:** Im Editor Text eingeben, Schriftfarbe setzen, als DOCX
   exportieren, erneut importieren → Farbe exakt an der richtigen Textstelle. (Unit-Test mit
   konstruierten Daten vorhanden — hier zusätzlich über echte Toolbar-Bedienung im Browser,
   siehe Abschnitt 8.)
2. **ODT-Eigenrundreise:** dasselbe für ODT.
3. **Cross-Format DOCX → ODT:** DOCX mit farbigem Text importieren, als ODT exportieren,
   Ergebnis importieren → Farbe erhalten. **Verifizierte Einschränkung (kein bloßer
   Verdacht):** Ein UI-Weg dafür existiert derzeit **nicht**. `speichern-unter-format`
   (Zielformat beim Export wählen, `FEATURE-BACKLOG.md:59`) hat Status „fehlt" —
   `DocumentWorkspace.tsx:81` ruft ausnahmslos `module.exportFile(...)` auf, wobei `module`
   fest das beim Öffnen/Anlegen verwendete Format-Modul ist (`docx/docx.ts`/`odt/odt.ts`
   definieren `exportFile` jeweils unveränderlich auf `writeDocx`/`writeOdt`). Dieser
   Testfall ist deshalb **nur auf Code-Ebene** prüfbar (`readDocx(...)` gefolgt von
   `writeOdt(...)` auf demselben JSON, analog `specs/fett-req.md` Abschnitt 6.3), **nicht**
   als E2E-Browser-Test mit echtem Upload+Export — bis `speichern-unter-format` umgesetzt
   ist.
4. **Cross-Format ODT → DOCX:** umgekehrt. Dieselbe Einschränkung wie Testfall 3 (nur
   Code-Ebene, kein UI-Weg vorhanden).
5. **Doppelte Cross-Format-Rundreise:** DOCX → Editor → ODT → Editor → DOCX → Editor → Farbe
   auch nach zweifachem Formatwechsel vollständig erhalten (kein kumulativer Verlust, vgl.
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19). Ebenfalls nur auf Code-Ebene möglich (dieselbe
   Einschränkung wie Testfall 3/4) — als verkettete `readDocx`/`writeOdt`/`readOdt`/`writeDocx`-
   Aufrufe an einem einzigen ProseMirror-JSON.
6. **Echte Fremddateien (nicht mit dem eigenen Editor erzeugt):** Mindestens eine reale, mit
   Microsoft Word erzeugte DOCX-Datei und mindestens eine reale, mit LibreOffice Writer
   erzeugte ODT-Datei mit farbigem Text importieren → Farbe korrekt erkannt bzw.
   Fallback-Verhalten dokumentiert. Konkret bereits im Repo vorhandene ODT-Fixtures
   (`tests/fixtures/external/odt/`), vorrangig für die Grenzfälle 4.11/4.12:
   - `text-color-from-paragraph.odt` — Name legt nahe: Zeichenfarbe stammt aus einer
     Absatz-/Vorlagen-Ebene statt aus direktem Span-Stil → direkter Prüffall für Grenzfall
     4.12 (geht die Farbe verloren?).
   - `character-styles.odt`, `CharacterParagraphFormat.odt`,
     `CharacterParagraphFormat_MSO15.odt`, `TestStyleStyleAttribute.odt`,
     `feature_attributes_character_MSO15.odt` — benannte Zeichenstile (Grenzfall 4.12).
   - `coloredParagraph.odt`, `coloredTable_MSO15.odt` — direkt eingefärbter Inhalt.
   - `sameLocationSpansUsingMultipleTemplateStyles_BOLD-Outer-ITALIC-Inner-Text-Yellow.odt` —
     verschachtelte Spans mehrerer Vorlagenstile inkl. Textfarbe (Kombination + Merge, vgl.
     `odt/reader.ts` `mergeMarks`).
   Für DOCX (`tests/fixtures/external/docx/`, ca. 127 Dateien) vor dem Test stichprobenartig
   ermitteln, welche Fixtures tatsächlich `<w:color w:val="…">` (nicht `"auto"`, nicht nur
   `w:themeColor`, nicht nur innerhalb eines `w:rPrChange` — siehe Grenzfall 4.22) auf
   Run-Ebene enthalten, und mindestens eine davon verwenden (verifizierter Kandidat:
   `bug65649.docx` — mehrere direkte `w:r/w:rPr/w:color`-Werte auf lesbarem Fließtext, u. a.
   `w:val="FF0000"`/`"0000FF"`, ohne `w:rPrChange`-Verschachtelung; zugleich Case-Grenzfall
   4.10, und, in Kombination mit den in `specs/textmarker-farbe-req.md` an derselben Datei
   verifizierten `w:highlight`-Werten, direkter Kandidat für Rundreise-Testfall 8.
   **Nicht** verwenden: `Tika-792.docx` — ihr einziger `w:color`-Beleg liegt in einem
   `w:rPrChange` und ist keine aktuelle Formatierung, siehe Grenzfall 4.22 für den
   vollständig dokumentierten Fund). Für Grenzfall 4.21 (stilvererbte Farbe) zusätzlich
   `52288.docx` heranziehen, bei der die Farbe ausschließlich im Absatzstil
   (`w:rPr/w:color` + `w:basedOn`-Kette), nicht am Lauf steht.
7. **Validierung des exportierten XML gegen unabhängigen Parser:** Exportierte DOCX-Datei mit
   farbigem Text mit einer unabhängigen Bibliothek (z. B. python-docx) öffnen und prüfen,
   dass `w:color` als Zeichenfarbe erkannt wird (nicht nur mit dem eigenen Reader
   rückgelesen — sonst können sich Schreib-/Lesefehler gegenseitig „unsichtbar"
   ausgleichen). Analog ODT gegen eine unabhängige ODF-Bibliothek/`odfvalidator`.
8. **Kombinierte Rundreise mit anderen Formaten:** Ein Textlauf gleichzeitig fett +
   unterstrichen + farbig, plus ein zweiter Textlauf mit Schriftfarbe **und**
   Hervorhebungsfarbe → alle Merkmale bleiben nach jeder obigen Rundreise gemeinsam korrekt
   erhalten (kein Aufsplitten in getrennte Runs, keine verlorene Mark).
9. **Explizites Schwarz (`#000000`) vs. keine Farbe:** Rundreise eines Dokuments mit einem
   Textlauf mit expliziter Mark `#000000` und einem zweiten ganz ohne Farbmarkierung → beide
   bleiben nach Export/Re-Import strukturell unterscheidbar (siehe Grenzfall 4.9).
10. **Eingefügter Fremdfarbwert (Grenzfall 4.20):** Text mit nicht-Hex-Farbe (z. B. `red`)
    aus externem HTML einfügen, dann exportieren → prüfen, ob der Export gültig bleibt bzw.
    das Fallback dokumentiert ist; die doppelte Rundreise darf nicht zu stillschweigend
    unterschiedlichen Farbwerten in DOCX vs. ODT führen.

---

## 7. Testfälle (Zusammenfassung, E2E über echte Browser-Bedienung — Pflicht)

1. Text eingeben, markieren, `pickColor('Textfarbe', …)` → Text sichtbar in der gewählten
   Farbe (`<span style="color: …">` im DOM des markierten Bereichs).
2. Dieselbe Markierung, `getByTitle('Textfarbe entfernen')` klicken → Farbe verschwindet aus
   dem DOM, restlicher Text unverändert.
3. Cursor ohne Selektion, Farbe wählen, dann tippen → dokumentiertes Ist-Verhalten aus 3.2
   bestätigen (kein Effekt auf neu getippten Text); dasselbe für „Entfernen" ohne Selektion.
4. Gemischte Selektion (teils/unterschiedlich farbig, teils ohne) formatieren → Verhalten
   entspricht Grenzfall 4.6, keine JS-Exception.
5. Kombination Fett + Unterstrichen + Schriftfarbe + Hervorhebungsfarbe auf demselben
   Textlauf → alle vier gleichzeitig sichtbar und unabhängig wieder entfernbar (aufbauend auf
   `clipboard.spec.ts:148`, aber mit Fokus auf gleichzeitige Sichtbarkeit + Einzel-Entfernen).
6. Regressionstest Selection-Sync-Bug mit „Schriftfarbe" statt „Fett" (Grenzfall 4.18) —
   Pflichttest, dauerhaft in der Suite (analog `tests/e2e/selection-regression.spec.ts`).
7. Undo/Redo über Sequenz Tippen → Farbe A → Farbe B → entfernen → erneut Tippen — jeder
   Schritt einzeln korrekt rückgängig/wiederherstellbar; Anzahl der tatsächlich entstehenden
   Undo-Schritte dokumentieren (Grenzfall 4.16).
8. Einfügen von externem HTML mit nicht-Hex-`color:` (Grenzfall 4.20 / Abschnitt 3.10) →
   Farbe im Editor sichtbar; anschließender DOCX-Export auf `w:val`-Gültigkeit prüfen
   (OOXML-Schema bzw. unabhängiger Parser).
9. Rundreise-Testfälle 1, 2, 6, 7, 9, 10 aus Abschnitt 6, jeweils als eigener automatisierter
   Test, über echten Datei-Upload (`filechooser`) und echten Download-Abfangmechanismus
   (`page.waitForEvent('download')`) — nicht nur über intern aufgerufene Reader/Writer.
   **Testfälle 3–5 (Cross-Format) sind ausgenommen**, solange `speichern-unter-format` fehlt
   (siehe Abschnitt 6, Testfall 3) — sie werden stattdessen als Code-Ebenen-Tests
   (`readDocx`/`writeOdt`-Verkettung) verlangt, nicht als E2E-Browser-Test; ein E2E-Test, der
   versucht „DOCX hochladen, als ODT exportieren" über die tatsächliche UI nachzustellen,
   ist mit dem aktuellen Funktionsumfang nicht umsetzbar und darf nicht als offene Aufgabe
   für **diese** Anforderung missverstanden werden.
10. Grenzfälle 1–22 aus Abschnitt 4 — je mindestens ein gezielter Test, kein Sammeltest, der
    Einzelergebnisse verschleiert.
11. Sichtprüfung/Screenshot-Vergleich: Aussehen der Schriftfarbe im Editor entspricht optisch
    dem Aussehen nach Re-Import derselben Datei.
12. Rendering-Prüfung des „⌫"-Glyphen auf mindestens zwei Betriebssystem-/Browser-Kombinationen
    (Abschnitt 2 Punkt 3, `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 Punkt 1).
13. Tastatur-Bedienbarkeit: Farbwähler und „Entfernen"-Button je per Tab erreichbar,
    Farbwähler per Enter/Leertaste öffenbar (kein reiner Maus-Weg).
14. Fokus-Isolation nicht brechen: `Strg+C`/`Strg+X` bei fokussiertem Textfarbe-Farbwähler
    lassen den Editor-Inhalt unverändert (Regressionsabsicherung von `clipboard.spec.ts:368`
    und `cut.spec.ts:348`).

---

## 8. Abgrenzung: vorhandener Nachweis vs. geforderter Nachweis

**Vorhanden, aber laut Auftrag nicht ausreichend:**
- Unit-Test „preserves text color and highlight color" (`docx/__tests__/roundtrip.test.ts:100`,
  `odt/__tests__/roundtrip.test.ts:102`) — konstruiert ProseMirror-JSON direkt, prüft nur
  Reader/Writer isoliert mit einem einzigen Farbwert (`#ff0000`).
- E2E „Fett + Farbe + Hervorhebung kombiniert bleiben nach Kopieren/Einfügen erhalten"
  (`clipboard.spec.ts:148`) — belegt Anwenden **und** Kombination **und** Kopier-Überleben
  über echte Toolbar-Bedienung, aber **nicht** Export-Rundreise und **nicht** Entfernen.
- E2E-Fokus-Isolationstests (`clipboard.spec.ts:368`, `cut.spec.ts:348`).

Diese beweisen zusammen **nicht**, dass:
- die Schriftfarbe über echte Toolbar-Bedienung eine DOCX-/ODT-**Export-Rundreise** übersteht
  (getrennt für beide Formate),
- der „⌫"-Button die Farbe zuverlässig entfernt und sein Glyph im Browser lesbar erscheint,
- das Verhalten bei **leerer Selektion** (3.2/3.5) tatsächlich so eintritt,
- Groß-/Kleinschreibungs-Unterschiede und Fremddateien (Theme-Farben, benannte ODT-Stile)
  unkritisch bleiben bzw. ihr Fallback dokumentiert ist,
- eingefügte nicht-Hex-Fremdfarben nicht zu ungültigem Export führen.

Diese Punkte sind der Kern der geforderten Verifikation und müssen durch neue/erweiterte
E2E-Tests geschlossen werden (Playwright, unter Wiederverwendung des `pickColor`-Helfers und
analog zu den Toolbar-Tests in `tests/e2e/docx.spec.ts`/`odt.spec.ts`), bevor der
Backlog-Status von „vorhanden" auf „verifiziert" geändert werden darf.

---

## 9. Abnahmekriterien (Definition of Done)

Der Status darf erst als „verifiziert" gelten, wenn **alle** folgenden Punkte erfüllt sind:

1. Alle Testfälle aus Abschnitt 7 sind als automatisierte Tests vorhanden und grün — inkl.
   je eines dedizierten DOCX- und ODT-Export-Rundreisetests über echte Toolbar-Bedienung
   (schließt die in Abschnitt 0.1 benannte Lücke).
2. Mindestens die Rundreise-Testfälle 1, 2, 6 und 7 aus Abschnitt 6 sind mit echten, nicht
   selbst erzeugten Prüfwerkzeugen (unabhängiger Parser bzw. reale Fremddatei) bestanden.
   Testfälle 3–5 (Cross-Format) sind bewusst **nicht** in dieser Liste, weil dafür laut
   `FEATURE-BACKLOG.md:59` (`speichern-unter-format` = „fehlt") und direkt am Code bestätigt
   (`DocumentWorkspace.tsx:81`, `docx/docx.ts`/`odt/odt.ts`) schlicht kein UI-Weg existiert —
   sie bleiben bis dahin auf Code-Ebene (Abschnitt 6, Testfall 3) erforderlich, nicht als
   Voraussetzung für den E2E-Abnahmestatus dieser Anforderung.
3. Der Regressionstest aus Grenzfall 4.18 ist dauerhaft in der Testsuite verankert.
4. Das Verhalten bei leerer Selektion (3.2/3.5, Grenzfall 4.1) ist bestätigt, dokumentiert und
   mit Auftraggeber/Backlog abgeglichen (akzeptabel oder nachzubessern) — die Entscheidung ist
   explizit in dieser oder einer Nachfolgedatei festzuhalten, nicht offen zu lassen.
5. Grenzfälle 4.11, 4.12, 4.21 und 4.22 (Word-Theme-Farben; stilvererbte Farbe in ODT über
   benannte/Absatz-Zeichenstile **und** in DOCX über Absatzstil-`w:rPr/w:color` samt
   `w:basedOn`-Kette; Track-Changes-`w:rPrChange` statt aktueller Farbe; u. a.
   `text-color-from-paragraph.odt` / `character-styles.odt` / `52288.docx` /
   `bug65649.docx`) sind mit echten Fremddateien geprüft und das Fallback-Verhalten ist
   dokumentiert.
6. Das Zwischenablage-/Fremdfarbwert-Verhalten (Abschnitt 3.10, Grenzfall 4.20) ist geklärt —
   insbesondere, ob eingefügte nicht-Hex-Farben ungültiges OOXML/ODF erzeugen können; falls ja,
   ist entschieden und dokumentiert, ob eine Normalisierung nachgerüstet oder der Fall bewusst
   akzeptiert wird.
7. Die fehlende Aktiv-/Ist-Zustandsanzeige (Abschnitt 2 Punkt 4, 3.3) ist entweder behoben oder
   als bewusst nicht vorhandenes Verhalten dokumentiert.
8. Die Rendering-Prüfung des „⌫"-Glyphen (Testfall 12) ist auf mindestens zwei Systemen
   durchgeführt und das Ergebnis dokumentiert.
9. Kein während der Verifikation gefundener Fehler bleibt ohne Ticket/Vermerk zurück.
