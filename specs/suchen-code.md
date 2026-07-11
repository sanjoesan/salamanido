# Umsetzungsplan: Feature „Suchen" — Code-Abgleich und geplante Änderungen

Rolle: Entwickler-Antwort auf `specs/suchen-req.md`. Dieses Dokument prüft den
**tatsächlichen** Code-Stand (frisch verifiziert an jeder unten zitierten Datei,
mit heute gültigen Zeilennummern) gegen jede Behauptung der Anforderung und legt
fest, welche Dateien wie geändert bzw. neu angelegt werden. Stil orientiert an
`fett-code.md` / `FEATURE-SPEC-DOCX-ODT.md`. Kein Punkt hier ist bereits
umgesetzt — dies ist der Plan, nicht der Vollzug.

> **Änderungshinweis gegenüber einem früheren Entwurf dieser Datei.** Der frühere
> Entwurf war architektonisch weitgehend richtig (Decoration-Plugin, keine
> Schema-/Reader-/Writer-Änderung, dirty-Sicherheit über Meta-Transaktionen), enthielt
> aber **vier belegbare Fehler**, die hier korrigiert sind:
> 1. **Veraltete Code-Referenzen.** `ToolbarProps` hat heute **drei** Felder
>    (`view`, `cutError`, `setCutError`, `Toolbar.tsx` Zeilen 22–26), nicht nur `view`;
>    die `tr.docChanged`-Weiche steht in `WordEditor.tsx` auf **Zeile 128–130**, nicht
>    „94–96"; `commands.ts` hat **167** Zeilen, nicht 108. Alle Zeilennummern unten sind
>    neu verifiziert.
> 2. **Strg+F-Fokusbereich.** Der frühere Entwurf band `Mod-f` nur in die
>    ProseMirror-Keymap und schränkte die Anforderung dann auf „solange der Editor
>    fokussiert ist" ein — das **widerspricht** `suchen-req.md` Abschnitt 2
>    („Fokus-Klarstellung", Zeilen 150–156: Bindung „auf Ebene der geöffneten
>    Dokumentansicht … **nicht nur** an der `.ProseMirror`-Instanz"). Korrigiert:
>    Strg+F/Escape laufen über einen **Dokument-Ebene-Keydown-Listener** (Abschnitt 2.6/3.6).
> 3. **`hard_break`-Verflachung.** Der frühere Entwurf ersetzte `hard_break` durch ein
>    **Leerzeichen** — das würde einen normalen einzeiligen Suchbegriff fälschlich über
>    den Umbruch hinweg matchen lassen und `suchen-req.md` Abschnitt 3.2 verletzen
>    („ein Treffer endet **spätestens** am `hard_break`"). Das Schema definiert
>    `hard_break` bereits mit `leafText: () => '\n'` (`schema.ts` Zeile 51), daher wird
>    schlicht `node.textContent` benutzt (Abschnitt 2.2).
> 4. **Initiale aktive Fundstelle.** Der frühere Entwurf setzte bei Query-Änderung
>    `activeIndex = 0` — das widerspricht `suchen-req.md` Abschnitt 4 („erster Treffer
>    **an oder nach** der aktuellen Cursorposition … **nicht** konstant ‚1 von …'").
>    Korrigiert in Abschnitt 2.2/3.2 (`firstMatchAtOrAfter`).
>
> **Re-Verifikation (Dev-Zweitprüfung, heutiger Arbeitsbaum).** Seit dem obigen Entwurf ist
> `WordEditor.tsx` durch die zwischenzeitlich gemergten „Ausschneiden"-Commits von 178 auf
> **185 Zeilen** gewachsen; **alle** `WordEditor.tsx`-Zeilennummern in dieser Datei wurden
> daraufhin frisch gegen den Arbeitsbaum abgeglichen (`tr.docChanged`-Weiche jetzt
> **128–130**, Plugin-Array **83–114**, `keymap` **85–107**, Mount-`useEffect` **76–166**,
> `view.focus()` **135**, `body`-Bindung **79**, Toolbar-Aufruf **170**, `history()` **84**,
> `onChangeRef` **68–69**). Die Referenzen auf `Toolbar.tsx`, `commands.ts`,
> `DocumentWorkspace.tsx`, `schema.ts`, `App.tsx`, `index.css`, `documentModel.ts`,
> `PrivacyBanner.tsx`, `FormatPicker.tsx`, `playwright.config.ts` und die Reader/Writer
> wurden erneut geprüft und stimmen — bis auf drei Zeilenzahl-/Off-by-one-Korrekturen:
> `commands.ts` **167** (nicht 168), `Toolbar.tsx` **297** (nicht 298), `odt/reader.ts:61`
> (nicht 60). Unten sind diese Korrekturen bereits eingearbeitet.

> **Dritte Prüfung (unabhängige Dev-Zweitprüfung gegen Commit `c9eb367`, „Install Firefox in
> CI for the new clipboard browser-matrix project").** Jede in diesem Dokument zitierte
> Zeile/Datei wurde erneut einzeln nachgeschlagen (`Toolbar.tsx` 297 Zeilen, `commands.ts`
> 167 Zeilen, `WordEditor.tsx` 185 Zeilen, `schema.ts` 201 Zeilen, `DocumentWorkspace.tsx`
> 150 Zeilen, `documentModel.ts` 21 Zeilen, `index.css` 88 Zeilen, `playwright.config.ts`
> 55 Zeilen; `App.tsx` liegt unter `src/App.tsx`, nicht `src/app/App.tsx` — der Pfad wird
> in dieser Datei nirgends anders behauptet, nur zur Klarstellung). **Alle** zitierten
> Zeilennummern und Codeaussagen stimmen exakt (u. a. `ToolbarProps` 22–26/Signatur 113,
> `ScissorsIcon` 33–53, `MarkButton`-`onMouseDown` 76–79, Buchstaben-/Emoji-Buttons 184–187/
> 192/212, Bild-Gruppe 291–294, `commands.ts` Zeile 1/4/104, `WordEditor.tsx` Plugin-Array
> 83–114/`keymap` 85–107/`tr.docChanged`-Weiche 128–130/`view.focus()` 135/`body`-Bindung 79/
> Toolbar-Aufruf 170/`onChangeRef` 68–69, `schema.ts` `text` Zeile 40/`image`-Gruppe Zeile 59/
> `hard_break.leafText` Zeile 51/`highlight` 189–195/`textColor` 182–188, `documentModel.ts`
> 5–6/14–21, `App.tsx` Zeile 20/29–53/39, `DocumentWorkspace.tsx` Zeile 98/118–120/146,
> `PrivacyBanner.tsx` Zeile 4, `FormatPicker.tsx` `handleFile`/`handleCreateNew`,
> `playwright.config.ts` Projekte 27–54, `index.css` Zeilen 26/69–71/75–88,
> `docx/reader.ts:113`, `docx/writer.ts:28`, `odt/reader.ts:61/110`, `odt/writer.ts:40`,
> `odt/styleRegistry.ts:57`, sowie der Roundtrip-Test „preserves text color and highlight
> color" in beiden `roundtrip.test.ts`). Bestätigt außerdem: kein `search`/`Suchen`/`Mod-f`-
> Treffer irgendwo in `src/`, kein `src/formats/shared/editor/search.ts`/`SearchBar.tsx`,
> kein `tests/e2e/search*.spec.ts` — der Ist-Stand „vollständig zu bauen" ist unverändert
> zutreffend. Ein echter **Fehler** (direkter Widerspruch zur Anforderung) und drei
> **Präzisierungen** wurden bei dieser Prüfung zusätzlich identifiziert und unten an Ort
> und Stelle eingearbeitet (nicht nur hier vermerkt):
> 0. **Fehler (kein Präzisierungsfall): Toggle-Optionen als `<input type="checkbox">"
>    geplant.** Abschnitt 3.3 (frühere Fassung) sah für „Groß-/Kleinschreibung beachten"
>    und „Nur ganzes Wort" ein natives `<input type="checkbox">` vor. Das widerspricht
>    `suchen-req.md` Abschnitt 2 („UI-Konsistenz der Toggle-Optionen") **wörtlich und mit
>    Code-Beleg**: Die Anforderung zitiert explizit `MarkButton`, die Ausrichtungs-Buttons
>    und den „Tabelle"-Button in `Toolbar.tsx` als etabliertes Muster — alle drei zeigen
>    ihren Zustand über `aria-pressed` an einem `<button>` (verifiziert: `Toolbar.tsx`
>    Zeilen 75/97/281), **nicht** über eine Checkbox — und verlangt in Testfall 7 exakt
>    dieses Muster für die beiden neuen Toggles. Korrigiert in Abschnitt 3.3.
> 1. **`view.focus()` läuft bereits automatisch bei jedem Mount** (`WordEditor.tsx` Zeile
>    135, im selben synchronen Mount-Effekt wie die `EditorView`-Erzeugung) — das
>    Szenario „Fokus liegt nach dem Import noch nicht im Editor" (Grenzfall 17) tritt in
>    der heutigen App **nicht von selbst** ein, weil der Editor sich unmittelbar nach dem
>    Mounten selbst fokussiert. Das entwertet die Architekturentscheidung „Dokument-Ebene-
>    Listener statt PM-Keymap" **nicht** (sie bleibt laut Anforderung Pflicht und ist die
>    robustere Wahl), macht aber den zugehörigen E2E-Test wirkungslos, wenn er nicht
>    **aktiv** den Fokus aus dem Editor herausbewegt, bevor Strg+F gedrückt wird — sonst
>    würde der Test auch mit einer (anforderungswidrigen) reinen PM-Keymap-Bindung grün
>    sein und nichts über den Dokument-Ebene-Pfad beweisen. Korrektur in Abschnitt 2.6 und
>    Testfall 7.2/15.
> 2. **Undebounced Voll-Scan bei jeder Dokumentänderung, nicht nur bei Sucheingabe.** Der
>    200-ms-Debounce in `SearchBar.tsx` (Abschnitt 3.3) greift ausschließlich für Änderungen
>    am Sucheingabefeld. `createSearchPlugin()`s `apply()` (Abschnitt 3.2) ruft `findMatches`
>    dagegen bei **jeder** Transaktion mit `tr.docChanged === true` synchron und undebounced
>    auf — also bei jedem einzelnen Tastendruck **im Dokument selbst**, solange die Suche
>    offen ist (das ist kein Bug, sondern von `suchen-req.md` Abschnitt 7 verlangt: „wird
>    die Trefferliste automatisch neu berechnet"; ProseMirror-Plugin-`apply()` ist
>    zwangsläufig synchron, ein Debounce wäre dort nicht ohne Architekturbruch möglich).
>    Für Grenzfall 16 (großes Dokument, hunderte Treffer) heißt das: die Kosten sind ein
>    einzelner linearer `doc.descendants`-Scan pro Tastendruck im Dokument — bei realistischen
>    Dokumentgrößen (einige zehntausend Zeichen) im Millisekundenbereich, explizit als
>    akzeptierter Kompromiss dokumentiert (nicht stillschweigend übersehen). Sollte ein
>    Performance-Test später Ruckeln zeigen, ist eine spätere Optimierung (z. B. Rescan nur
>    des von `tr.mapping` betroffenen Teilbaums) ein separater, hier bewusst nicht
>    vorgezogener Schritt.
> 3. **IME-Kompositions-State ohne Verdrahtung im Codebeispiel.** Der Codeausschnitt in
>    Abschnitt 3.3 deklariert `const [composing, setComposing] = useState(false)` und nutzt
>    ihn im Debounce-Effekt, zeigt aber nirgends, **wo** `setComposing` aufgerufen wird. Ohne
>    `onCompositionStart`/`onCompositionEnd` am `<input>` bliebe `composing` für immer `false`
>    — Grenzfall 20 wäre nicht erfüllt. Ergänzt als explizite Detailentscheidung in
>    Abschnitt 3.3.

---

## 0. Kurzfassung / Kernbefunde

1. **Der Ist-Stand aus `suchen-req.md` Abschnitt 0 ist zutreffend, neu verifiziert:**
   In `Toolbar.tsx` (297 Zeilen) existiert kein Suchen-Button; in `commands.ts`
   (167 Zeilen) keine Such-Logik; in `WordEditor.tsx` (185 Zeilen) kein Such-Plugin
   und keine `Mod-f`-Bindung. Eine Volltextsuche über `src/` nach
   `search|Suchen|Mod-f` liefert **null** Treffer. `schema.ts` enthält `highlight`
   (Zeilen 189–195) und `textColor` (182–188). Der Backlog-Status „fehlt" ist korrekt —
   vollständige Neuentwicklung.
2. **Kein Schema-Fix nötig.** Für „Suchen" (Abschnitt 1–8 der Anforderung) ist **keine
   einzige Änderung** an `schema.ts` erforderlich — die Hervorhebung läuft ausschließlich
   über `Decoration`/`DecorationSet` in einem neuen Plugin, außerhalb des Dokumentmodells
   (Abschnitt 2). Der bereits vorhandene `hard_break.leafText: () => '\n'` (Zeile 51)
   wird **genutzt**, nicht verändert.
3. **Kein DOCX-/ODT-Reader-/Writer-Fix nötig** — weder für „Suchen" noch „Suchen &
   Ersetzen". Decorations erreichen `doc.toJSON()` nie (Abschnitt 2.4), und „Ersetzen"
   erzeugt ausschließlich schema-konformen Standard-Inhalt (Text + bereits existierende
   Marks) — exakt das, was normales Tippen erzeugt. Verifiziert: `highlight` wird real
   round-trip-exportiert (`docx/reader.ts:113`, `docx/writer.ts:28`, `odt/reader.ts:61/110`,
   `odt/writer.ts:40`, `odt/styleRegistry.ts:57` — es gibt sogar bereits einen Roundtrip-Test
   „preserves text color and highlight color" in beiden `roundtrip.test.ts`). Was Abschnitt 12
   der Anforderung verlangt, ist **neue Testabdeckung**, kein Produktionscode in `src/formats/docx|odt`.
4. **Zwei Anforderungspunkte sind mit dem heutigen Code nur eingeschränkt erfüllbar und
   werden explizit als Scope-Grenze dokumentiert, nicht stillschweigend übergangen:**
   - **Kopf-/Fußzeilensuche (Abschnitt 8).** `WordEditor.tsx` rendert genau **eine**
     `EditorView`, gebunden an `doc.content.body` (Zeile 79). `documentModel.ts` (Zeilen 5–6,
     14–21) belegt: `header`/`footer` existieren nur als Datenfelder, `createBlankWordDocument()`
     setzt beide auf `null`; es gibt keinen editierbaren Kopf-/Fußzeilen-`EditorView`. Bis
     `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` existieren, ist Testfall 4 aus Abschnitt 8
     **nicht anwendbar** (nicht „durchgefallen"). Siehe Abschnitt 5.
   - **Strg+F auf Touch-Geräten (Abschnitt 11, Grenzfall 21).** Die Playwright-Projekte
     „Mobile" (Pixel 7) und „Tablet" (iPad Mini) sind **Touch**-Geräte ohne physische
     Strg-Taste. Dort wird die Suche über den **Toolbar-Button** verifiziert, nicht über das
     Tastenkürzel (Abschnitt 7.2, Anmerkung).
5. **Fünf bei der Planung entschiedene, in der Anforderung nicht ausformulierte Fragen**
   (jede unten begründet, keine offen gelassen):
   - `hard_break` beim Volltext-Abgleich = `\n` via vorhandenem `leafText`, ohne die
     Absatzgrenze aufzuweichen (Abschnitt 2.2).
   - Groß-/Kleinschreibung-Ignorieren ausschließlich über `.toLowerCase()`, nie
     `.toUpperCase()` (JS-Falle `"ß".toUpperCase() === "SS"`, Abschnitt 2.2).
   - Initiale aktive Fundstelle = erster Treffer an/nach dem Cursor (Abschnitt 2.2/3.2).
   - „Alle ersetzen" beweisbar schleifensicher über Vorne-weg-Snapshot + Ersetzen von
     hinten nach vorne (Abschnitt 3.4).
   - Die aktive Fundstelle ist während offener Suche **bewusst keine** echte
     ProseMirror-Selektion (nur Plugin-State + Decoration) — die echte Selektion wird erst
     beim Schließen genau **einmal** gesetzt; das reduziert die Berührung mit dem
     Selection-Sync-Bug auf eine einzige testbare Stelle (Abschnitt 2.5).

---

## 1. Verifikation der in der Anforderung zitierten Fundstellen (heutige Zeilennummern)

| Fundstelle | Ergebnis der Prüfung (heute) |
|---|---|
| `Toolbar.tsx` — kein Suchen-Button | **Bestätigt.** 297 Zeilen. **Korrektur zum früheren Entwurf:** `ToolbarProps` ist **nicht** `{ view }`, sondern `{ view, cutError, setCutError }` (Zeilen 22–26); Signatur `export function Toolbar({ view, cutError, setCutError }` (Zeile 113). Buttons nutzen `onMouseDown`+`preventDefault` (z. B. `MarkButton` Zeilen 76–79). Aufruf in `WordEditor.tsx` Zeile 170: `<Toolbar view={…} cutError={cutError} setCutError={setCutError} />`. |
| `commands.ts` — keine Such-Logik | **Bestätigt.** 167 Zeilen: `setAlign`, `isAlignActive`, `setHeading`, `toggleList`, `liftFromList`, `insertImage`, `insertHardBreak`, `insertTable`, `applyMarkColor`/`clearMarkColor` (`ColorMarkName` Zeile 104), `canCut`, `cutSelection`. Nichts zu Suche/Ersetzen. Importe (Zeile 1): nur `Command, EditorState` aus `prosemirror-state` — für Ersetzen kommt `Transaction` dazu (Abschnitt 3.4). |
| `WordEditor.tsx` — Plugin-Liste, kein Such-Plugin | **Bestätigt.** Plugin-Array Zeilen 83–114: `history()`, `keymap({ … })` (Zeilen 85–107, bindet `Mod-z/y/Shift-z`, `Enter`, `Shift-Enter`, `Mod-b/i/u`, `Shift-Delete`), `keymap(baseKeymap)`, `columnResizing()`, `tableEditing()`, `dropCursor()`, `gapCursor()`, `createPaginationPlugin()`. Kein Such-Plugin. Mount-`useEffect` mit leerem Dep-Array Zeilen 76–166; `view.focus()` Zeile 135. |
| **⚠ dirty-Kopplung** (`suchen-req.md` Abschnitt 0) | **Bestätigt und exakt lokalisiert.** `WordEditor.tsx` Zeilen 128–130: `if (tr.docChanged) { onChangeRef.current({ ...doc.content, body: newState.doc.toJSON() }) }`. `DocumentWorkspace.tsx` Zeile 146: `onChange={(content) => onChange({ ...document, content, dirty: true })}`. `App.tsx` Zeile 39 reicht das an `setActive` weiter, `useBeforeUnloadWarning(active?.document.dirty …)` (Zeile 20) und `handleClose`-`window.confirm` (`DocumentWorkspace.tsx` Zeile 98) hängen daran. **Folge:** Nur `tr.docChanged`-Transaktionen dürfen entstehen, wenn `dirty` wirklich soll — reine Suche muss `docChanged === false` halten (Abschnitt 2.4/6). |
| `schema.ts` — `highlight` persistent/exportiert | **Bestätigt**, Zeilen 189–195 (`attrs.color`, `toDOM → span[style="background-color: …"]`). Zusätzlich verifiziert: real importiert/exportiert (siehe Abschnitt 0, Punkt 3). `hard_break` (Zeilen 42–56) trägt `leafText: () => '\n'` (Zeile 51); `text` ist `group: 'inline'` (Zeile 40); `image` ist `group: 'block'` (Zeile 59) — also **nie** inline in einem Textblock. |
| `WordEditor.tsx` bindet nur `body` | **Bestätigt**, Zeile 79 (`wordSchema.nodeFromJSON(doc.content.body)`). Gegenprüfung `documentModel.ts` 5–6/14–21. |
| Dokumentwechsel-Architektur (für Abschnitt 7) | **Neu geprüft, wichtig:** Ein Dokument wird ausschließlich über `FormatPicker` geöffnet/erstellt (`FormatPicker.tsx` `handleFile`/`handleCreateNew` → `onOpen`), und `FormatPicker` ist in `App.tsx` (Zeilen 29–53) **nur** sichtbar, wenn `active === null`. Ein Wechsel/Import erzwingt also erst `onClose → setActive(null)`, was `DocumentWorkspace`+`WordEditor` **komplett unmountet** (EditorView + Plugins zerstört), bevor ein neues Dokument einen frischen `WordEditor` mountet. **Kein** In-Place-Dokumenttausch (kein `key`-Remount, kein Prop-Resync — `useEffect` Dep-Array leer). Konsequenz für Grenzfall 13: siehe Abschnitt 2.7. |
| `tests/e2e/selection-regression.spec.ts` | Vorhanden; kein Test erwähnt Suche. Wird **nicht** verändert; Such-Regression kommt in `tests/e2e/search.spec.ts` (Abschnitt 7.3). |
| `playwright.config.ts` Projekte | **Bestätigt**, Zeilen 27–54: „Desktop Chrome", „Mobile" (Pixel 7), „Tablet" (iPad Mini), plus „Desktop Safari (Clipboard)"/„Desktop Firefox (Clipboard)" (nur `clipboard*.spec.ts`). `baseURL` `/salamanido/`. Mobile/Tablet sind Touch → Abschnitt 7.2. |
| `PrivacyBanner` als `role="status"`-Vorbild | **Bestätigt**, `PrivacyBanner.tsx` Zeile 4 (`role="status"`). Trefferzähler übernimmt dieses Muster (Abschnitt 3.3). |
| `index.css` | **Bestätigt** als einzige CSS-Datei (via `main.tsx` `import './index.css'`). `.ProseMirror` Zeilen 23–27 (Textfarbe fest `#111827` → die „Seite" ist **immer hell**, auch im Dark-Mode-Chrome), `.page-break-spacer` Zeile 69, `.unsupported-block` + `@media (prefers-color-scheme: dark)` Zeilen 75–88 (Muster für neue Plain-CSS-Klassen). |

**Ergebnis:** Alle Ist-Stand-Behauptungen der Anforderung sind korrekt; die
Code-Referenzen des früheren Entwurfs waren teils veraltet und sind oben berichtigt.

---

## 2. Architektur-Entscheidungen (verbindlich für Abschnitt 3)

### 2.1 Wo der Suchzustand lebt

Zwei bewusst getrennte Anteile:

- **Plugin-State (ProseMirror, in `search.ts`):** Suchbegriff + Optionen
  (`caseSensitive`, `wholeWord`), die daraus berechnete Trefferliste
  (`{ from, to }[]` in Dokumentkoordinaten) und `activeIndex`. Lebt im `EditorState`,
  genau wie die Pagination-Decorations. Einzige Quelle der Wahrheit für „was ist
  markiert". `SearchBar.tsx`/`Toolbar.tsx` lesen sie über
  `searchPluginKey.getState(view.state)` bei jedem Render — dasselbe Muster, mit dem
  `Toolbar.tsx` heute schon direkt `view.state` liest (kein Redux/Context).
- **UI-State (React, in `WordEditor.tsx`/`SearchBar.tsx`):** nur `searchOpen`,
  `openToken`, `prefill` sowie die Ersetzen-Formularfelder — reine Anzeige-/Formularzustände.

### 2.2 Wie Treffer gefunden werden (literal, keine Regex-Injection, Absatzgrenze hart, `hard_break` = `\n`)

`findMatches(doc, query)` in `search.ts` scannt **jeden Textblock unabhängig**
(`node.isTextblock` — trifft `paragraph`/`heading`; `list_item`, `table_cell`,
`unsupported_block` sind selbst keine Textblöcke, werden aber von `doc.descendants`
durchlaufen, sodass ihre inneren Textblöcke erfasst werden). Das liefert die in
Abschnitt 3/8 geforderten Eigenschaften ohne Sonderfälle:

- **Kein** Treffer über Absatz-/Überschriftsgrenze (jeder Textblock separat) —
  Abschnitt 3 Testfall 9, Grenzfall 5.
- Korrekte Dokumentreihenfolge inkl. Tabellenzellen zeilenweise, weil `descendants`
  in exakter Kindreihenfolge läuft (Struktur `table → table_row+ → table_cell+`) —
  Abschnitt 8 Testfall 3, keine eigene Sortierung nötig.
- Treffer über eine **Formatierungsgrenze** (halb fett) = **ein** Eintrag in `matches[]`,
  weil auf dem **Klartext** des Textblocks gearbeitet wird — Abschnitt 3 Testfall 8.

**Klartext eines Textblocks = `node.textContent`** (nicht eine handgebaute Verflachung).
Grund: Das Schema definiert `hard_break.leafText: () => '\n'` (`schema.ts` Zeile 51),
deshalb liefert `paragraph.textContent`/`heading.textContent` bereits `…text…\n…text…`,
mit **genau einer** Position pro `hard_break`. Damit gilt:

- **Offset 1:1 zur Dokumentposition:** jedes Textzeichen und jeder `hard_break` belegt
  exakt eine PM-Position; Zeichenindex `i` im `textContent` eines Textblocks an
  Startposition `pos` entspricht Dokumentposition `pos + 1 + i`. Ein Treffer wird als
  `{ from: pos + 1 + idx, to: pos + 1 + idx + needle.length }` eingetragen.
- **`hard_break` wird als `\n` repräsentiert (nicht als Leerzeichen).** Das ist die
  Korrektur gegenüber dem früheren Entwurf: Da das einzeilige Suchfeld **nie** ein `\n`
  enthalten kann, überspannt ein normaler Suchbegriff einen Umbruch **nicht** — „ein
  Treffer endet spätestens am `hard_break`" (`suchen-req.md` Abschnitt 3.2) ist damit
  strukturell erfüllt, ohne dass „a b" fälschlich „a⏎b" träfe. Für Whole-Word zählt
  `\n` korrekt als Wortgrenze (`isWordChar('\n') === false`). *(Testfall 10, Grenzfall 8.)*

**Literal-Matching statt Regex:** Der Kernabgleich nutzt ausschließlich
`String.prototype.indexOf` auf dem (ggf. kleingeschriebenen) Klartext — der Suchbegriff
wird **niemals** in `new RegExp(userInput)` eingesetzt. „Ganzes Wort" prüft nur je ein
**einzelnes Nachbarzeichen** gegen ein festes, nicht vom Nutzer beeinflusstes Muster
`/[\p{L}\p{N}_]/u` (Unicode-Klasse: schließt ä/ö/ü/ß/é korrekt als Wortzeichen ein,
umgeht die ASCII-`\b`-Falle). Erfüllt Abschnitt 3 Testfall 4 (`a.b*c` literal) und
Testfall 11 (Umlaut-Wortgrenze) **durch Konstruktion**. Entscheidung/Dokumentation:
Ziffern = Wortzeichen, Bindestrich = Grenze (`\p{L}\p{N}_`), wie in `suchen-req.md`
Abschnitt 3.2 vorgeschlagen.

**Groß-/Kleinschreibung-Falle:** Für case-insensitive **niemals** `.toUpperCase()` — in
JS gilt `"ß".toUpperCase() === "SS"` (2 Zeichen), was Offsets verschöbe und „STRASSE"
fälschlich „Straße" treffen ließe. Es wird ausschließlich `.toLowerCase()` verwendet
(`"ß".toLowerCase() === "ß"`, längenerhaltend im relevanten Latin-/Deutsch-Bereich).
Erfüllt Abschnitt 3 Testfall 3. *(Annahme, dokumentiert: `.toLowerCase()` ist im
Feature-Scope — Latin/Deutsch, diakritik-sensitiv — längenerhaltend; exotische
Sonderfälle wie `İ` sind außerhalb des Scopes, Abschnitt 10.)*

**Initiale aktive Fundstelle = Cursor-basiert (Korrektur):** Bei einer **Query-Änderung**
wird `activeIndex` auf den **ersten Treffer mit `from >= selection.from`** gesetzt, sonst
(kein Treffer nach dem Cursor) auf `0` (Wrap). Das erfüllt `suchen-req.md` Abschnitt 4
(„erster Treffer an/nach der Cursorposition … nicht konstant ‚1 von …'", Testfall 6). Der
Cursor ist zur Query-Meta-Transaktion unverändert verfügbar als `tr.selection.from`.

### 2.3 Leere/Whitespace-only Sucheingabe (Grenzfall 14)

Leere **und** rein-aus-Leerzeichen bestehende Eingaben werden identisch behandelt:
`findMatches` gibt sofort `[]` zurück (Kriterium `query.text.trim() === ''`) — **keine**
Highlight-Flut über jedes Leerzeichen. Bewusst gewählte der beiden erlaubten Optionen
(`suchen-req.md` Abschnitt 11, Grenzfall 14). Ein Suchbegriff mit **inneren/flankierenden**
Leerzeichen, der nicht *ausschließlich* aus Leerzeichen besteht (z. B. `" the "`), bleibt
vollständig literal wirksam — nur das reine „getrimmt leer"-Kriterium entscheidet.

### 2.4 Warum keine Export-/dirty-Änderung nötig ist (Architektur-Beweis)

`WordEditor.tsx` Zeilen 128–130 reichen Dokumentinhalt **ausschließlich** bei
`tr.docChanged` an `onChange` (→ `dirty: true`, → Export). Eine reine Suche (Query-Meta,
Navigation, aktive-Treffer-Wechsel, `closeSearch`-Selektion) ändert `state.doc` **nie** —
nur den Plugin-Anteil des `state` bzw. die Selektion, beides mit `tr.docChanged === false`.
Zusätzlich enthält `doc.toJSON()` per ProseMirror-Architektur **niemals** Decorations
(die werden nur zur Laufzeit über `plugin.props.decorations(state)` ans `EditorView`
geliefert, getrennt vom `Node`-Baum). Damit sind Abschnitt 6 Testfälle 1–4 **beweisbar
durch Architektur** erfüllt — ein Bug, der Decorations in `doc.toJSON()` einschleust, wäre
ohne Umgehung des gesamten State-Mechanismus nicht möglich.

**Konkrete Regel für die Umsetzung:** Alle Such-Transaktionen setzen ihren Zustand über
`tr.setMeta(searchPluginKey, …)` und/oder `tr.setSelection(…)`; **keine** davon ruft
`tr.insert/replace/delete/addMark` o. Ä. auf. `closeSearch` (Abschnitt 3.2) darf nur
`setMeta` + optional `setSelection` enthalten — `setSelection` allein setzt `docChanged`
nicht.

### 2.5 Warum die aktive Fundstelle während offener Suche keine echte Selektion ist

Bewusste Entscheidung, um die Berührungsfläche mit dem Selection-Sync-Bug
(`WordEditor.tsx` `reconcileSelectionOnClick`, Zeilen 43–50, Kommentar 20–42;
`tests/e2e/selection-regression.spec.ts`) auf **eine** Stelle zu reduzieren:

- **Während offener Suche** wird `state.selection` von der Suche **nicht angefasst**.
  Aktive Fundstelle = `activeIndex` im Plugin-State + Decoration-Klasse
  `search-match-active`. Scrollen erfolgt per DOM (`element.scrollIntoView()`), **nicht**
  `tr.scrollIntoView()` (das würde die Selektion an die Fundstelle voraussetzen). Fokus
  bleibt im Suchfeld; es entsteht kein `view.focus()`-Zwang während des Tippens/Navigierens.
- **Erst beim Schließen** (Escape/X) wird — genau einmal — `state.selection` synchron
  (`tr.setSelection(TextSelection.create(...))`) auf den zuletzt aktiven Treffer gesetzt und
  `view.focus()` gerufen. **Der** kritische Berührungspunkt aus `suchen-req.md` Abschnitt 5;
  dedizierter Regressionstest Pflicht (Abschnitt 7.3).

### 2.6 Strg+F/Escape auf Workspace-Ebene (Korrektur, verbindlich)

`suchen-req.md` Abschnitt 2, „Fokus-Klarstellung" (Zeilen 150–156) verlangt ausdrücklich,
dass Strg+F **unsere** Suche öffnet, sobald ein Dokument offen ist — **auch** wenn der
Fokus nicht im ProseMirror-Editor liegt (Grenzfall 11/17) — und dass die Bindung „auf
Ebene der geöffneten Dokumentansicht … nicht nur an der `.ProseMirror`-Instanz" sitzt.

Eine reine ProseMirror-Keymap (`Mod-f` im Plugin) feuert **nur**, wenn `.ProseMirror`
Fokus hat — sie erfüllt die Anforderung also **nicht** (das war der Fehler des früheren
Entwurfs). Deshalb:

- **Ein `keydown`-Listener auf Dokument-Ebene**, registriert/aufgeräumt im Lebenszyklus
  von `WordEditor` (das genau dann existiert, wenn ein Dokument offen ist — Abschnitt 1,
  Dokumentwechsel-Architektur). Er wird in der **Capture-Phase** installiert, damit er die
  native Browser-Suche zuverlässig vor ProseMirror/Browser abfängt.
- **Strg+F/Cmd+F:** `preventDefault()` + `openSearch()` — es sei denn, der Fokus liegt in
  einem echten Formular-Eingabefeld **außerhalb** des Editors **und** außerhalb der
  Suchleiste (z. B. Farbwert-`input`, Absatzformat-`select` in `Toolbar.tsx`); dann gilt
  das native Verhalten dieses Feldes (`suchen-req.md` Abschnitt 2, Ausnahme). Liegt der
  Fokus im Suchfeld selbst, ist `openSearch()` idempotent und re-fokussiert/selektiert
  (Grenzfall „bereits offen + erneut Strg+F").
- **Escape:** schließt die Suche, wenn `searchOpen` — egal ob der Fokus im Suchfeld **oder**
  (weil zwischendurch weitergetippt wurde) im Editor liegt. Sonst wird Escape nicht
  angetastet (kein `preventDefault`, an andere Handler durchgereicht).
- **Kein Eintrag in der ProseMirror-Keymap.** Das umgeht zugleich die in `suchen-req.md`
  Abschnitt 0 gewarnte Empfindlichkeit der Custom-Keymap gegenüber den bewusst nicht
  gebundenen Zwischenablage-Kürzeln (`Mod-c/x/v`) — die Keymap in `WordEditor.tsx`
  (Zeilen 85–107) bleibt **unverändert**.

Fokus-Routing bei fokussiertem Suchfeld (`suchen-req.md` Abschnitt 2): Da das Suchfeld ein
gewöhnliches `<input>` **außerhalb** von `.ProseMirror` ist, sieht die ProseMirror-Keymap
Tastendrücke im Feld ohnehin nie — `Mod-b/i/u` lösen dort keine Dokumentformatierung aus
und getippte Zeichen erscheinen nicht im Dokument (Testfall 4 durch Konstruktion erfüllt).

**⚠ Wichtig für den Test, nicht nur für die Implementierung (dritte Prüfung, s. o.):**
`WordEditor.tsx` ruft `view.focus()` bereits **synchron im selben Mount-Effekt**, der die
`EditorView` erzeugt (Zeile 135) — der Editor hat also, sobald ein Dokument offen ist,
so gut wie immer bereits von selbst den Fokus, **bevor** der Nutzer irgendwo geklickt hat.
Das im Anforderungstext genannte Beispiel „Fokus noch auf einem Toolbar-Element direkt
nach dem Import" tritt dadurch in der heutigen App **nicht organisch** ein. Das macht den
Dokument-Ebene-Listener nicht überflüssig (er bleibt die einzige Umsetzung, die dem
Wortlaut „nicht nur an der `.ProseMirror`-Instanz" gerecht wird, und deckt z. B. auch den
Fall ab, dass ein Nutzer bewusst auf ein Toolbar-Element klickt, bevor er Strg+F drückt),
aber es bedeutet: **der E2E-Test für Grenzfall 17 muss den Fokus aktiv aus dem Editor
herausbewegen** (z. B. `await page.getByTitle('Fett').focus()` oder ein Klick auf einen
anderen Toolbar-Button), **bevor** Strg+F gedrückt wird — sonst testet er unbeabsichtigt
nur den (ohnehin fokussierten) Editor-Fall und würde selbst mit einer anforderungswidrigen
reinen PM-Keymap-Bindung grün sein, ohne den Dokument-Ebene-Pfad je zu durchlaufen. Siehe
die entsprechend präzisierte Testbeschreibung in Abschnitt 7.2, Punkt 15.

### 2.7 Dokumentwechsel/Import bei offener Suche (Grenzfall 13) — reale Architektur

Wie in Abschnitt 1 belegt, führt jeder Dokumentwechsel/Import/„Neu erstellen" **zwingend**
durch `active === null` (→ `FormatPicker`), d. h. `WordEditor` **unmountet vollständig**:
EditorView, Such-Plugin und die React-Zustände (`searchOpen`, Trefferliste) werden zerstört,
der Dokument-Ebene-Keydown-Listener (Abschnitt 2.6) wird abgemeldet. Danach mountet ein
frischer `WordEditor` mit Plugin-`init` im Leerzustand gegen das **neue** `doc`.

**Folge:** „Geister-Highlights" oder in den alten Baum weitergereichte Positionen
(→ Crash) sind in der heutigen Architektur **strukturell unmöglich** — nicht, weil die Suche
etwas Cleveres tut, sondern weil nichts vom alten Dokument überlebt. Grenzfall 13 ist damit
erfüllt; der E2E-Test (Abschnitt 7.2, Punkte 15–16) weist es **verhaltensseitig** nach
(kein Crash, keine Alt-Treffer), ohne sich auf ein internes Reset zu verlassen.

**Zukunftssicherung (Vermerk, keine heutige Arbeit):** Sollte ein späterer Refactor einen
**In-Place**-Dokumenttausch einführen (z. B. `key`-basiertes Remounten oder ein
Prop-Resync im `useEffect`), gilt: Ein `key`-Remount ist unproblematisch (frisches Plugin).
Ein Prop-Resync **ohne** Remount müsste das Such-Plugin explizit zurücksetzen (Query leeren,
Decorations verwerfen), bevor der neue `doc` in denselben `EditorState` gelangt — sonst
entstünde exakt die von `suchen-req.md` Abschnitt 7 befürchtete Lage. `findMatches` ist
darum als **reine Funktion über einen einzelnen `PMNode`** entworfen (Abschnitt 3.2), nicht
an „das eine `body`-Dokument" gekoppelt.

---

## 3. Dateigenauer Umsetzungsplan

### 3.1 `src/formats/shared/schema.ts` — **keine Änderung**

Siehe Abschnitt 2.2/2.4. `highlight` (189–195) und `hard_break.leafText` (51) bleiben
exakt; kein neuer Mark-/Node-Typ für Suche.

### 3.2 Neue Datei: `src/formats/shared/editor/search.ts`

Typen, reines Matching, Plugin und Dispatch-Helfer (Logik/UI getrennt, analog
`commands.ts`/`Toolbar.tsx`).

```ts
import type { Node as PMNode } from 'prosemirror-model'
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from 'prosemirror-state'
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view'

export interface SearchQuery {
  text: string
  caseSensitive: boolean
  wholeWord: boolean
}
export interface SearchMatch {
  from: number
  to: number
}
export interface SearchPluginState {
  query: SearchQuery
  matches: SearchMatch[]
  activeIndex: number // -1 wenn keine Treffer
}
interface SearchMeta {
  query?: SearchQuery
  activeIndex?: number
}

export const emptySearchQuery: SearchQuery = { text: '', caseSensitive: false, wholeWord: false }

const isWordChar = (ch: string | undefined) => !!ch && /[\p{L}\p{N}_]/u.test(ch)

/** Reine, von ProseMirror-State unabhängige Trefferberechnung — direkt unit-testbar.
 *  Klartext je Textblock = node.textContent (hard_break → '\n' via schema leafText),
 *  Offsets 1:1 zur Dokumentposition. Siehe suchen-code.md Abschnitt 2.2. */
export function findMatches(doc: PMNode, query: SearchQuery): SearchMatch[] {
  if (query.text.trim() === '') return []
  const needle = query.text
  const foldedNeedle = query.caseSensitive ? needle : needle.toLowerCase()
  const matches: SearchMatch[] = []

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    const text = node.textContent
    const haystack = query.caseSensitive ? text : text.toLowerCase()
    let searchFrom = 0
    for (;;) {
      const idx = haystack.indexOf(foldedNeedle, searchFrom)
      if (idx === -1) break
      const before = text[idx - 1]
      const after = text[idx + needle.length]
      if (!query.wholeWord || (!isWordChar(before) && !isWordChar(after))) {
        matches.push({ from: pos + 1 + idx, to: pos + 1 + idx + needle.length })
      }
      searchFrom = idx + needle.length // nicht überlappend (suchen-req.md Abschnitt 3.1)
    }
    return false // Inline-Inhalt nicht weiter durchsteigen
  })
  return matches
}

/** Initiale aktive Fundstelle: erster Treffer an/nach dem Cursor, sonst Wrap auf 0.
 *  Erfüllt suchen-req.md Abschnitt 4 (Korrektur ggü. früherem „immer 0"). */
function firstMatchAtOrAfter(matches: SearchMatch[], pos: number): number {
  if (matches.length === 0) return -1
  const idx = matches.findIndex((m) => m.from >= pos)
  return idx === -1 ? 0 : idx
}

/** Hält die aktive Markierung nach einer Doc-Änderung nahe der bisherigen Stelle. */
function reconcileActiveIndex(
  prevMatches: SearchMatch[],
  prevActiveIndex: number,
  mapping: Transaction['mapping'],
  nextMatches: SearchMatch[],
): number {
  if (nextMatches.length === 0) return -1
  const prevActive = prevMatches[prevActiveIndex]
  if (!prevActive) return 0
  const mappedFrom = mapping.map(prevActive.from, -1)
  const idx = nextMatches.findIndex((m) => m.to > mappedFrom)
  return idx === -1 ? nextMatches.length - 1 : idx
}

export const searchPluginKey = new PluginKey<SearchPluginState>('search')

export function createSearchPlugin(): Plugin {
  return new Plugin({
    key: searchPluginKey,
    state: {
      init: (): SearchPluginState => ({ query: emptySearchQuery, matches: [], activeIndex: -1 }),
      apply(tr, prev): SearchPluginState {
        const meta = tr.getMeta(searchPluginKey) as SearchMeta | undefined
        let { query, matches, activeIndex } = prev
        const queryChanged = meta?.query !== undefined
        if (queryChanged) query = meta!.query!
        if (tr.docChanged || queryChanged) {
          const next = findMatches(tr.doc, query)
          activeIndex = queryChanged
            ? firstMatchAtOrAfter(next, tr.selection.from)
            : reconcileActiveIndex(matches, activeIndex, tr.mapping, next)
          matches = next
        }
        if (meta?.activeIndex !== undefined) activeIndex = meta.activeIndex
        return { query, matches, activeIndex }
      },
    },
    props: {
      decorations(state) {
        const s = searchPluginKey.getState(state)
        if (!s || s.matches.length === 0) return DecorationSet.empty
        return DecorationSet.create(
          state.doc,
          s.matches.map((m, i) =>
            Decoration.inline(m.from, m.to, {
              class: i === s.activeIndex ? 'search-match search-match-active' : 'search-match',
            }),
          ),
        )
      },
    },
  })
}

export function getSearchState(state: EditorState): SearchPluginState {
  return searchPluginKey.getState(state) ?? { query: emptySearchQuery, matches: [], activeIndex: -1 }
}

export function setSearchQuery(view: EditorView, query: SearchQuery) {
  view.dispatch(view.state.tr.setMeta(searchPluginKey, { query }))
}

export function stepSearch(view: EditorView, direction: 1 | -1) {
  const s = getSearchState(view.state)
  if (s.matches.length === 0) return
  const activeIndex = (s.activeIndex + direction + s.matches.length) % s.matches.length
  view.dispatch(view.state.tr.setMeta(searchPluginKey, { activeIndex }))
}

/** Schließt die Suche: Decorations verschwinden spurlos (Query leeren); einziger
 *  Berührungspunkt mit der echten Selektion (suchen-code.md Abschnitt 2.5): Cursor
 *  synchron auf den zuletzt aktiven Treffer, dann Fokus zurück in den Editor.
 *  Enthält nur setMeta + optional setSelection → tr.docChanged bleibt false. */
export function closeSearch(view: EditorView) {
  const s = getSearchState(view.state)
  const active = s.activeIndex >= 0 ? s.matches[s.activeIndex] : null
  let tr = view.state.tr.setMeta(searchPluginKey, { query: emptySearchQuery })
  if (active) tr = tr.setSelection(TextSelection.create(tr.doc, active.from, active.to))
  view.dispatch(tr)
  view.focus()
}
```

Anmerkungen: `firstMatchAtOrAfter` nutzt `tr.selection.from` — die Query-Meta-Transaktion
ändert die Selektion nicht, also ist das der aktuelle Cursor. `closeSearch` setzt bewusst
**keine** eigene Undo-Grenze und ändert `doc` nicht (Abschnitt 2.4).

### 3.3 Neue Datei: `src/formats/shared/editor/SearchBar.tsx`

React-Komponente nach dem `Toolbar.tsx`-Muster (liest `view.state` direkt, keine
Dokument-Kopie). Der Wurzelknoten trägt `data-search-bar` (vom Keydown-Listener aus
Abschnitt 2.6 benötigt) und eine stabile `id` (für `aria-controls` des Toolbar-Buttons).

```tsx
interface SearchBarProps {
  view: EditorView
  openToken: number       // erhöht sich bei jedem Öffnen/Re-Fokussieren
  prefill: string | null  // nicht-null nur beim Übergang geschlossen→offen
  onClose: () => void
}

export function SearchBar({ view, openToken, prefill, onClose }: SearchBarProps) {
  const [text, setText] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [mode, setMode] = useState<'search' | 'replace'>('search')
  const [replacement, setReplacement] = useState('')
  const [composing, setComposing] = useState(false) // IME (Grenzfall 20)
  const inputRef = useRef<HTMLInputElement>(null)

  // Öffnen/Re-Fokussieren: fokussieren + Text selektieren; Text nur bei prefill !== null
  // überschreiben (erhält Trefferliste/Optionen bei „bereits offen + Strg+F").
  useEffect(() => {
    if (prefill !== null) setText(prefill)
    inputRef.current?.focus()
    inputRef.current?.select()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openToken])

  // Live-Suche mit Debounce (suchen-req.md Abschnitt 3.1: 150–250 ms erlaubt); nicht
  // während einer laufenden IME-Komposition (auf compositionend warten, Grenzfall 20).
  useEffect(() => {
    if (composing) return
    const id = setTimeout(() => setSearchQuery(view, { text, caseSensitive, wholeWord }), 200)
    return () => clearTimeout(id)
  }, [view, text, caseSensitive, wholeWord, composing])

  const { matches, activeIndex } = getSearchState(view.state)

  // Aktiven Treffer ins Bild scrollen — DOM-Zugriff statt tr.scrollIntoView(),
  // da state.selection bewusst unangetastet bleibt (Abschnitt 2.5).
  useEffect(() => {
    if (activeIndex < 0) return
    view.dom.querySelector('.search-match-active')?.scrollIntoView({ block: 'center' })
  }, [view, activeIndex, matches.length])

  function onFieldKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); stepSearch(view, e.shiftKey ? -1 : 1) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); stepSearch(view, 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); stepSearch(view, -1) }
    // Escape und Strg+F werden vom Dokument-Ebene-Listener behandelt (Abschnitt 2.6).
  }
  // … Rendering siehe unten
}
```

Verbindliche Detailentscheidungen (nicht der späteren Umsetzung überlassen):

- **Trefferzähler, drei Zustände** (nicht zwei): (a) `text === ''` → **kein** Zähler bzw.
  „–" (kein „0 von 0", `suchen-req.md` Abschnitt 3.1); (b) `text !== '' && matches.length === 0`
  → „Keine Treffer"; (c) sonst „`{activeIndex + 1}` von `{matches.length}`". Der
  Zähler-Container ist `role="status" aria-live="polite"` (Muster `PrivacyBanner`,
  `suchen-req.md` Abschnitt 4).
- **Keine Fehlerfärbung** des Feldes bei „Keine Treffer" (Abschnitt 3.1) — nur der
  Zählertext ändert sich.
- **Navigation** über Vor/Zurück-Buttons (eigene inline-SVG-Pfeile, `aria-label`
  „Vorheriger Treffer"/„Nächster Treffer", `title` ebenso) **und** Enter/Umschalt+Enter/
  Pfeiltasten im Feld. Wrap-Around kommt aus `stepSearch` (Modulo).
- **Toggles „Groß-/Kleinschreibung beachten" und „Nur ganzes Wort" — korrigiert (dritte
  Prüfung, s. o.): kein `<input type="checkbox">`, sondern `<button type="button"
  aria-pressed={caseSensitive}>`/`aria-pressed={wholeWord}` im selben Muster wie
  `MarkButton`/`AlignButton`/der „Tabelle"-Button (`Toolbar.tsx` Zeilen 75/97/281:
  `aria-pressed={active}` an einem `<button>`, **kein** natives Formularelement).** Der
  vorherige Entwurf dieser Datei widersprach hier direkt `suchen-req.md` Abschnitt 2
  („UI-Konsistenz der Toggle-Optionen", explizit belegt an `MarkButton`/Ausrichtungs-
  Buttons/„Tabelle"-Button: „zeigen ihren aktiven Zustand einheitlich über `aria-pressed`
  an einem `<button>`, **nicht** über ein natives `<input type=\"checkbox\">`" — sowie
  Testfall 7 „Zustand wird über `aria-pressed` angezeigt"). `default aus` (`caseSensitive`/
  `wholeWord` beide `false`) bleibt unverändert; nur das Bedienelement wechselt von
  Checkbox+Label auf Button+`aria-pressed`(+`title`, analog `MarkButton`).
- **Schließen-Button (X)** mit `aria-label="Suche schließen"`/`title` ruft
  `closeSearch(view)` + `onClose()`.
- **IME-Komposition (Grenzfall 20) — Verdrahtung ergänzt (dritte Prüfung, s. o.):** Der
  Codeausschnitt oben deklariert `composing`/`setComposing`, verdrahtet aber keine
  Event-Handler dafür. Das Sucheingabefeld erhält deshalb explizit
  `onCompositionStart={() => setComposing(true)}` und
  `onCompositionEnd={() => setComposing(false)}`; ohne diese zwei Zeilen bliebe `composing`
  dauerhaft `false` und der Debounce-Effekt (oben) würde **nie** pausieren — Grenzfall 20
  wäre dann nicht erfüllt, obwohl der State dafür schon vorhanden aussieht.
- **Ersetzen** (Abschnitt 4): Modus-Umschalter „Suchen ↔ Suchen & Ersetzen"; im
  Ersetzen-Modus ein zweites Feld „Ersetzen durch" + Buttons „Ersetzen"/„Alle ersetzen".
  Nach „Ersetzen"/„Alle ersetzen" bleibt der Fokus **im Suchfeld** (kein `view.focus()`),
  damit fortlaufend ersetzt werden kann; die aktive Markierung rückt automatisch nach
  (Abschnitt 4).

### 3.4 `src/formats/shared/editor/commands.ts` — ergänzt (nur für Abschnitt 9, „Ersetzen")

Für reines „Suchen" (Abschnitt 1–8): **keine** Änderung an `commands.ts`. Für „Ersetzen"
werden ergänzt (neuer Import: `import type { Transaction } from 'prosemirror-state'` — aktuell
importiert Zeile 1 nur `Command, EditorState`; `wordSchema` ist bereits importiert, Zeile 4):

```ts
import type { SearchMatch } from './search'

/** Formatierung an der Startposition des Treffers (idiomatisch via resolve): der Ersatz
 *  übernimmt die Marks des ersten Match-Zeichens, auch wenn er länger ist als das Original
 *  (suchen-req.md Abschnitt 9, „länger als das Original"). Match-Länge ist stets >= 1,
 *  daher ist from+1 eine gültige Innenposition. */
function replaceRange(tr: Transaction, from: number, to: number, replacement: string): Transaction {
  if (replacement === '') return tr.delete(from, to) // leeres „Ersetzen durch" = Löschen (gültig)
  const marks = tr.doc.resolve(from + 1).marks()
  return tr.replaceWith(from, to, wordSchema.text(replacement, marks))
}

/** Ersetzt genau den übergebenen (aktiven) Treffer — eine Transaktion = ein Undo-Schritt. */
export function replaceActiveMatch(match: SearchMatch, replacement: string): Command {
  return (state, dispatch) => {
    if (dispatch) dispatch(replaceRange(state.tr, match.from, match.to, replacement))
    return true
  }
}

/** Ersetzt alle übergebenen Treffer in EINER Transaktion (= ein Undo-Schritt). Von hinten
 *  nach vorne: da alle from/to aus dem UNVERÄNDERTEN Dokument stammen und nie neu gescannt
 *  werden, bleiben die Koordinaten der noch nicht verarbeiteten (weiter vorne liegenden)
 *  Treffer während der ganzen Schleife gültig — kein Zwischen-Mapping nötig, beweisbar
 *  schleifensicher auch wenn der Ersatz den Suchbegriff enthält (Katze→Katzenbaby):
 *  matches steht vor dem ersten Ersetzen fest (Abschnitt 9, Testfälle 6/7). */
export function replaceAllMatches(matches: SearchMatch[], replacement: string): Command {
  return (state, dispatch) => {
    if (matches.length === 0) return false
    if (dispatch) {
      let tr = state.tr
      for (let i = matches.length - 1; i >= 0; i--) {
        tr = replaceRange(tr, matches[i].from, matches[i].to, replacement)
      }
      dispatch(tr)
    }
    return true
  }
}
```

**Bewusst kein Sonderfall „Ersatz enthält Suchbegriff":** Nach „Alle ersetzen" berechnet
`search.ts`s `apply` (Abschnitt 3.2) die Trefferliste über den normalen
`tr.docChanged`-Pfad gegen das neue Dokument neu. Enthält der Ersatz den Suchbegriff als
Teilstring, zeigt der Zähler danach korrekt diese **neuen, echten** Treffer — literales
Suchverhalten, kein Bug. Abschnitt 9 verlangt nur „keine Endlosschleife" + „jeder
ursprüngliche Treffer genau einmal ersetzt" (beides erfüllt), **nicht** dass der Zähler
danach zwingend „Keine Treffer" zeigt. Hier festgehalten, damit es nicht fälschlich als
Bug „repariert" wird.

`replaceActiveMatch`: nach dem Dispatch berechnet `apply` `matches`/`activeIndex` über
`reconcileActiveIndex` neu — die aktive Markierung rückt automatisch zum nächsten
verbleibenden Treffer (Abschnitt 9, „springt danach zum nächsten"), **ohne** eigene
Sonderlogik, derselbe Mechanismus wie „Bearbeitung während offener Suche".

### 3.5 `src/formats/shared/editor/Toolbar.tsx` — geändert

**Props ergänzen** (heutiger Stand `{ view, cutError, setCutError }`, Zeilen 22–26 — die
beiden neuen Felder kommen **hinzu**, ersetzen nichts):

```tsx
interface ToolbarProps {
  view: EditorView
  cutError: string | null
  setCutError: (message: string | null) => void
  searchOpen: boolean
  onOpenSearch: () => void      // öffnet/fokussiert (kein Toggle, s. u.)
}
```

Neuer Button in einer eigenen Gruppe am Ende der Toolbar (nach der „Bild"-Gruppe, aktuell
Zeilen 291–294), **mit `onClick`** (nicht `onMouseDown` wie die übrigen Buttons): Der
Such-Button soll bewusst den Fokus aus dem Editor nehmen und in das Suchfeld übergeben;
zudem ist `onClick` tastaturzugänglich (Tab + Enter/Space), während das
`onMouseDown`+`preventDefault`-Muster der Formatier-Buttons Fokus behält und Enter/Space
nicht auslöst. `aria-expanded`/`aria-controls` (statt `aria-pressed`) beschreiben korrekt
eine ein-/ausblendbare Region. Der Button **öffnet/fokussiert** nur (Toggle-Schließen ist
Aufgabe von X/Escape, `suchen-req.md` Abschnitt 2, Punkt 1 vs. 9).

```tsx
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  )
}
```

(Inline-SVG-Lupe im gleichen Stil wie `ScissorsIcon` in `Toolbar.tsx` Zeilen 33–53 —
`stroke="currentColor"`, `aria-hidden`, `focusable="false"`; **kein** Unicode/Emoji, gemäß
`suchen-req.md` Abschnitt 2 und dem Icon-Rendering-Risiko aus `FEATURE-SPEC-DOCX-ODT.md`
Abschnitt 20.)

```tsx
<button
  type="button"
  title="Suchen (Strg+F)"
  aria-label="Suchen"
  aria-expanded={searchOpen}
  aria-controls="search-bar"
  onClick={() => onOpenSearch()}
  className={/* Aktiv/Inaktiv-Muster wie AlignButton, abhängig von searchOpen */}
>
  <SearchIcon />
</button>
```

### 3.6 `src/formats/shared/editor/WordEditor.tsx` — geändert

1. **Plugin-Registrierung** in der `plugins`-Liste (nach `createPaginationPlugin()`,
   aktuell Zeile 113) — `createSearchPlugin` importieren aus `./search`:
   ```ts
   createPaginationPlugin(),
   createSearchPlugin(),
   ```
   Registrierung erfolgt im vorhandenen, **einmalig** laufenden Mount-`useEffect`
   (Zeilen 76–166, leeres Dep-Array) — dieselbe Garantie, die heute `createPaginationPlugin()`
   vor Doppelregistrierung schützt. Öffnen/Schließen der Suchleiste schaltet nur
   React-UI-Sichtbarkeit + den `query`-Anteil des Plugin-States, **nie** die Plugin-Liste —
   damit ist Grenzfall 19 (mehrfaches schnelles Strg+F/Escape, kein doppeltes Plugin, kein
   Decoration-Leak) strukturell erfüllt. **Die Keymap (Zeilen 85–107) bleibt unverändert**
   (Abschnitt 2.6).
2. **Neuer lokaler State + Refs:**
   ```ts
   const [searchOpen, setSearchOpen] = useState(false)
   const [openToken, setOpenToken] = useState(0)
   const [prefill, setPrefill] = useState<string | null>(null)
   const searchOpenRef = useRef(searchOpen); searchOpenRef.current = searchOpen
   ```
3. **Öffnen-Funktion** (idempotent; nutzt Refs, weil sie auch aus dem Keydown-Listener
   aufgerufen wird — Muster wie `onChangeRef`, `WordEditor.tsx` Zeilen 68–69):
   ```ts
   const openSearch = useCallback(() => {
     const view = viewRef.current
     if (!view) return
     if (!searchOpenRef.current) {
       const { from, to, empty, $from, $to } = view.state.selection
       const singleBlock = $from.sameParent($to) // mehrabsätzige Selektion NICHT vorbelegen
       setPrefill(!empty && singleBlock ? view.state.doc.textBetween(from, to, '') : '')
       setSearchOpen(true)
     } else {
       setPrefill(null) // bereits offen: Text/Trefferliste bleiben, nur Fokus/Select
     }
     setOpenToken((t) => t + 1)
   }, [])
   const openSearchRef = useRef(openSearch); openSearchRef.current = openSearch
   ```
   Vorbelegung nur bei **einzeiliger** (Ein-Textblock-)Selektion, `suchen-req.md`
   Abschnitt 2, Punkt 3.
4. **Dokument-Ebene-Keydown-Listener** (eigener `useEffect`, Capture-Phase; Abschnitt 2.6):
   ```ts
   useEffect(() => {
     const isNativeFindField = (el: Element | null, view: EditorView) => {
       if (!el) return false
       const tag = el.tagName
       if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') return false
       if (view.dom.contains(el)) return false          // im Editor
       if (el.closest('[data-search-bar]')) return false // in unserer Suchleiste
       return true                                       // echtes Feld außerhalb → nativ
     }
     const onKeyDown = (e: KeyboardEvent) => {
       const view = viewRef.current
       if (!view) return
       const findKey = (e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'f' || e.key === 'F')
       if (findKey) {
         if (isNativeFindField(document.activeElement, view)) return // Ausnahme: natives Verhalten
         e.preventDefault()
         openSearchRef.current()
       } else if (e.key === 'Escape' && searchOpenRef.current) {
         e.preventDefault()
         closeSearch(view)
         setSearchOpen(false)
       }
     }
     document.addEventListener('keydown', onKeyDown, true)
     return () => document.removeEventListener('keydown', onKeyDown, true)
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [])
   ```
   Registriert genau, solange `WordEditor` gemountet ist (= Dokument offen, Abschnitt 2.7).
5. **Rendering** — Toolbar-Aufruf ergänzen und Suchleiste als eigene Zeile einfügen
   (aktuell Zeile 170 / vor dem scrollbaren Seitenbereich Zeile 171):
   ```tsx
   {viewRef.current && (
     <Toolbar
       view={viewRef.current}
       cutError={cutError}
       setCutError={setCutError}
       searchOpen={searchOpen}
       onOpenSearch={openSearch}
     />
   )}
   {viewRef.current && searchOpen && (
     <SearchBar
       view={viewRef.current}
       openToken={openToken}
       prefill={prefill}
       onClose={() => setSearchOpen(false)}
     />
   )}
   ```
   Eigene Zeile (kein Overlay) — vermeidet Kollision mit dem Paginierungs-Hintergrund
   (`pageBackgroundStyle()`) und der einzigen scrollbaren Fläche; Fokus-Trick unnötig
   (Abschnitt 2.5). Neue Importe: `useCallback` (aus `react`), `SearchBar`, `createSearchPlugin`,
   `closeSearch`.

### 3.7 `src/index.css` — geändert

Neue Regeln nach `.page-break-spacer` (Zeile 69–71), Plain-CSS wie `.unsupported-block`
(Zeilen 75–88) — die Klassen werden zur Laufzeit von `Decoration.inline` erzeugt und stehen
nicht im JSX, würden von Tailwinds Content-Scanner also nicht gefunden. Die „Seite" ist
**immer hell** (`.ProseMirror { color: #111827 }`, Zeile 26), daher werden die Farben für
einen hellen Hintergrund abgestimmt:

```css
/* Such-Overlay: halbtransparent, damit darunterliegende Zeichenformatierung UND eine
   echte Textmarker-Hintergrundfarbe (highlight-Mark) sichtbar bleiben (Anforderung
   Abschnitt 4). */
.search-match {
  background-color: rgba(250, 204, 21, 0.40); /* gelb, transparent */
  border-radius: 2px;
}
/* Aktiver Treffer: zusätzlich NICHT nur farblich unterschieden (Ring + Fettung),
   Rücksicht auf Farbfehlsichtigkeit (Anforderung Abschnitt 4). */
.search-match-active {
  background-color: rgba(249, 115, 22, 0.45); /* orange, transparent */
  outline: 2px solid #ea580c;
  outline-offset: 0;
  font-weight: 600;
}
```

Transparenz (statt deckendem Hintergrund) ist der Mechanismus für „darf bestehende
Formatierung/Textmarker nicht verdecken" (Abschnitt 4): unabhängig davon, ob der
Decoration-`<span>` innerhalb oder außerhalb des `highlight`-Mark-`<span>` liegt, mischen
sich beide Hintergründe per Alpha-Blending. Die `outline` des aktiven Treffers unterscheidet
ihn zugleich sichtbar von einer flächigen Textmarker-Gelbfärbung. *(Ein Dark-Mode-`@media`-
Override ist optional und bewusst weggelassen, weil die Seitenfläche nicht mit dem
Chrome-Theme umschaltet.)*

### 3.8 `src/formats/docx/{reader,writer}.ts`, `src/formats/odt/{reader,writer}.ts` — **keine Änderung**

Siehe Abschnitt 0 Punkt 3 und Abschnitt 2.4. Weder reine Suche noch „Ersetzen" brauchen
hier Produktionscode — „Ersetzen" erzeugt nur Standard-Inhalt (`wordSchema.text(replacement,
marks)`). Was fehlt, ist **Testabdeckung** (Abschnitt 7.4–7.6).

---

## 4. Zuordnung: Abschnitt 9 der Anforderung (Suchen & Ersetzen)

| Anforderung (Abschnitt 9) | Umsetzung |
|---|---|
| Zweites Feld „Ersetzen durch", nur im Ersetzen-Modus | `SearchBar.tsx` `mode` (Abschnitt 3.3) |
| „Ersetzen" (einzeln), danach zum nächsten Treffer | `replaceActiveMatch(matches[activeIndex], replacement)` (3.4); `apply`+`reconcileActiveIndex` rücken die aktive Markierung nach — keine Sonderlogik |
| „Alle ersetzen" | `replaceAllMatches` (3.4), eine Transaktion |
| Formatierung der Ersetzungsposition übernehmen, auch bei längerem Text | `tr.doc.resolve(from + 1).marks()` + `wordSchema.text(replacement, marks)` (3.4) |
| Genau ein Undo-Schritt je Aktion | Je genau **eine** dispatchte Transaktion; `history()` (registriert, `WordEditor.tsx` Zeile 84, keine Änderung) erzeugt einen Eintrag pro Transaktion |
| „Ersetzen durch" leer → Löschen | `replaceRange`: `if (replacement === '') return tr.delete(from, to)` (3.4) |
| Ersetzen ist doc-verändernd, darf `dirty: true` setzen | Beabsichtigt: `replace*` erzeugt `tr.docChanged` → `onChange` → `dirty: true` (Gegensatz zur reinen Suche) |
| Kein Endlosschleifen-Risiko (Katze→Katzenbaby) | Vorne-weg-Snapshot + Ersetzen von hinten nach vorne (3.4) |
| Rundreise DOCX/ODT + Cross-Format | Keine Reader/Writer-Änderung (3.8); neue Tests 7.4–7.6 |

---

## 5. Abschnitt 8 (Kopf-/Fußzeile) — Scope-Einschränkung, explizit dokumentiert

Wie in Abschnitt 0/1 belegt, existiert **kein** editierbarer Kopf-/Fußzeilenbereich
(`kopfzeile-bearbeiten`/`fusszeile-bearbeiten` laut `FEATURE-BACKLOG.md` „fehlt";
`WordEditor.tsx` bindet nur `body`, Zeile 79). Konsequenzen:

- Testfall 4 aus Abschnitt 8 (Suchbegriff nur in der Fußzeile) ist **derzeit nicht
  durchführbar** und wird im Testplan (Abschnitt 7.2) **explizit zurückgestellt**, nicht als
  fehlgeschlagen markiert. Das darf den Backlog-Status von `suchen` nicht blockieren, da es
  eine Abhängigkeit zu einem separaten „fehlt"-Feature ist.
- Testfälle 1–3 aus Abschnitt 8 (Tabellenzellen, Listen) sind **heute** vollständig
  umsetzbar und Pflichtumfang — sie fallen automatisch aus der Baum-Traversierung
  (Abschnitt 2.2).
- Vorbereitung: `findMatches` und `createSearchPlugin` sind bewusst pro `EditorView`/`PMNode`
  entworfen; sobald ein zweiter (Kopf-/Fußzeilen-)`EditorView` existiert, kann derselbe
  Plugin dort unverändert mitregistriert werden. Nachzuholen sind dann die Cross-View-
  Navigationsreihenfolge „Kopfzeile → Haupttext → Fußzeile" und Testfall 4 — Backlog-Vermerk.

---

## 6. Grenzfälle aus Abschnitt 11 — Zuordnung zur Lösung

| # | Grenzfall | Geplante Lösung |
|---|---|---|
| 1 | Leere Eingabe | `findMatches` early-return `[]` (2.3) |
| 2 | Nur-Leerzeichen | Wie leer, `trim()`-Kriterium (2.3) |
| 3 | Kein Treffer | Zähler-Zustand (b) in `SearchBar.tsx` (3.3) |
| 4 | Regex-Metazeichen literal | `indexOf`, nie `new RegExp(userInput)` (2.2) |
| 5 | Nicht überlappend („aa" in „aaaa" = 2) | `searchFrom = idx + needle.length` (3.2) |
| 6 | Formatierungsgrenze = ein Treffer | `node.textContent` je Textblock (2.2) |
| 7 | Absatzgrenze = kein Treffer | Jeder Textblock separat (2.2) |
| 8 | `hard_break` im Absatz | `\n` via `leafText`; normaler Suchbegriff endet am Umbruch (2.2) |
| 9 | Whole-Word mit Umlauten/ß | `/[\p{L}\p{N}_]/u`, keine ASCII-`\b`-Falle (2.2) |
| 10 | Selection-Sync beim Schließen | `closeSearch` synchron `setSelection` (2.5/3.2), Test 7.3 |
| 11 | dirty bleibt false | Nur Meta-/Selektions-Transaktionen, `docChanged === false` (2.4) |
| 12 | Doc-Änderung während Suche | `apply`-Zweig `tr.docChanged` + `reconcileActiveIndex` (3.2) |
| 13 | Dokumentwechsel/Import bei offener Suche | Voller Unmount des `WordEditor` (2.7), Test 7.2/15–16 |
| 14 | Tabellen/Listengrenzen | `descendants`-Reihenfolge (2.2) |
| 15 | Export/Re-Import während/nach Suche | Architektur-Garantie (2.4), Test 7.4/7.6 |
| 16 | Großes Dokument, häufiger Begriff | Debounce 200 ms für Sucheingaben (3.3); `findMatches` = ein linearer Scan. **Präzisierung (dritte Prüfung, Einleitung):** Tastendrücke **im Dokument selbst** bei offener Suche lösen in `apply()` (3.2) einen undebouncten Voll-Rescan pro Transaktion aus (von `suchen-req.md` Abschnitt 7 so verlangt) — akzeptierter Kompromiss, da ProseMirror-`apply()` synchron sein muss |
| 17 | Suche direkt nach Import (Editor nicht angeklickt) | Dokument-Ebene-Keydown-Listener (2.6), Test 7.2/15 |
| 18 | Suche nach „Neu erstellen" (leerer Editor) | `findMatches` gegen leeren Absatz → `[]`, kein Sonderfall |
| 19 | Mehrfaches Öffnen/Schließen | Plugin einmalig registriert, nur UI/Query wechseln (3.6/1) |
| 20 | IME-Komposition im Suchfeld | `composing`-Guard + `compositionend`, Debounce pausiert (3.3) |
| 21 | Mobile/Tablet | Toolbar-Button (Touch, kein Strg+F); Test 7.2 auf „Mobile"/„Tablet" |

---

## 7. Testplan

### 7.1 Neu: `src/formats/shared/editor/__tests__/search.test.ts` (Vitest)

Reine Logik gegen manuell gebaute `wordSchema`-Dokumente (`findMatches`) plus Plugin-Verhalten
über `EditorState.create({ plugins: [createSearchPlugin()] })` + `setMeta` (für
cursor-basierte Initial-Aktivierung und `reconcileActiveIndex` braucht es eine echte Selektion):

1. Einfacher Treffer, case-insensitiv per Default.
2. `caseSensitive: true` reduziert Treffer bei gemischter Schreibung.
3. „ß"/„ä"/„é" gefunden auch bei `caseSensitive: false`; Gegenprobe: „ss" findet **nicht**
   „ß", „u" findet **nicht** „ü" (Beweis: keine `.toUpperCase()`-Falle).
4. `a.b*c` literal in `"a.b*c"`; **nicht** in `"aXbYYYc"`.
5. „aa" in „aaaa" → genau **2** (nicht überlappend).
6. Leerer/Nur-Leerzeichen-Query → `[]` (Grenzfälle 1/2).
7. Treffer über zwei Marks (fett/normal) im selben Absatz → **1** Eintrag.
8. Treffer über zwei `paragraph` → **0** (nicht zusammengezogen).
9. `hard_break` im Absatz: „a\nb"-Struktur — Suche „a" und „b" je gefunden; Suche „a b"
   (mit Leerzeichen) findet **nicht** über den Umbruch (belegt `\n`-statt-Leerzeichen-Design).
10. `wholeWord: true` — „Straße" in „Straße" ja, in „Hauptstraße" nein; „über" vs. „überall"
    (Umlaut-Wortgrenze).
11. Tabelle (`table_row` × `table_cell`), Treffer in nicht benachbarten Zellen →
    Reihenfolge in `matches[]` zeilenweise links-nach-rechts.
12. Initiale aktive Fundstelle: Selektion vor dem 2. von 3 Treffern → `activeIndex === 1`
    (nicht 0); Selektion hinter dem letzten → Wrap auf 0 (Abschnitt 2.2, Abschnitt 4).
13. `reconcileActiveIndex`: aktiven Treffer löschen → nächster verbleibender wird aktiv;
    alle löschen → `-1`.
14. Ersetzungslogik: `replaceAllMatches` „x"→„xxxxx" an mehreren Stellen → alle korrekt,
    keiner übersprungen/doppelt; „Katze"→„Katzenbaby" → jeder ursprüngliche Treffer genau
    einmal (Positionsverschiebung/Schleifensicherheit).

### 7.2 Neu: `tests/e2e/search.spec.ts` (Playwright)

Echte Bedienung (`suchen-req.md` Abschnitt 13), für **DOCX und ODT** (parametrisiert nach
dem Muster `docx.spec.ts`/`odt.spec.ts`):

1. Strg+F → Suchleiste auf, Eingabefeld sofort fokussiert, **keine** native Browser-Suche.
2. Toolbar-Button `getByTitle('Suchen')` → dieselbe Suchleiste.
3. Tippen ohne Button-Klick → Highlights erscheinen (`.search-match`-Count).
4. Vor dem Öffnen ein Wort per Doppelklick markieren → Feld vorbelegt.
5. Groß-/Klein-Toggle ändert Trefferzahl bei gemischter Schreibung.
6. „Keine Treffer" ohne Absturz; `page.on('pageerror')`/`console`-Assertion.
7. Nächster/Vorheriger mit Wrap-Around an beiden Enden (Pfeiltasten **und** Enter/Umschalt+Enter).
8. Aktiver Treffer trägt `search-match-active` (DOM-Klassenprüfung, kein Screenshot).
9. Mehrseitiges Dokument (genug Absätze für `createPaginationPlugin`, vgl. `pagination.test.ts`),
   Treffer auf „Seite 2" aktivieren → Scrollposition ändert sich.
10. Treffer in `highlight`-markiertem Text (Toolbar-Hervorhebungsfarbe setzen, dann suchen)
    → beide Hervorhebungen gleichzeitig sichtbar; Mark-Attribute im Modell vor/nach Suche
    identisch.
11. **Cursor-basierte Initial-Aktivierung:** Cursor mitten ins Dokument setzen, Begriff mit
    Treffern davor tippen → Zähler zeigt Index > 1 (nicht „1 von …").
12. Bearbeitung während offener Suche: aktiven Treffer per Backspace löschen → Zähler live
    reduziert, aktive Markierung rückt nach, kein Crash. Neuen Text tippen, der einen Treffer
    erzeugt → Zähler live erhöht.
13. **dirty bleibt false:** Datei importieren (kein „ungespeichert"), Suchsitzung (öffnen,
    tippen, navigieren, Toggles, schließen) → kein „● ungespeichert" (`DocumentWorkspace.tsx`
    Zeilen 118–120); danach „← Formate" löst **keine** `window.confirm`-Rückfrage aus.
14. Mehrfaches schnelles Strg+F/Escape (10×) → normaler Endzustand, keine wachsende
    `.search-match`-Zahl bei identischer Suche (Grenzfall 19).
15. Suche unmittelbar nach Upload, **ohne** Klick in den Editor (Grenzfall 11/17). **Korrektur
    (dritte Prüfung, s. o., Abschnitt 2.6):** Da `WordEditor.tsx` den Editor bereits beim
    Mounten selbst fokussiert (Zeile 135), muss der Test den Fokus **aktiv** wegbewegen, bevor
    Strg+F gedrückt wird (z. B. `await page.getByTitle('Fett').focus()` bzw. einen anderen
    Toolbar-Button fokussieren) — sonst prüft er nur den ohnehin fokussierten Editor-Fall und
    beweist den Dokument-Ebene-Listener nicht.
16. Suche unmittelbar nach „Neu erstellen" (leerer Editor, Grenzfall 18).
17. Ersetzen-Flow: „Ersetzen" (einzeln) reduziert um 1; „Alle ersetzen" bei 5 → „Keine
    Treffer" für den alten Begriff; Strg+Z macht „Alle ersetzen" in **einem** Schritt
    rückgängig; „Ersetzen durch" leer + „Alle ersetzen" entfernt Fundstellen, umgebender
    Text unangetastet.

**Anmerkung Touch-Projekte:** Auf „Mobile" (Pixel 7) und „Tablet" (iPad Mini) gibt es kein
physisches Strg+F. Dort werden die Punkte 2/3/6/7/8 über den **Toolbar-Button** und
Tap/On-Screen-Eingabe verifiziert (Grenzfall 21: erreichbar/bedienbar, Feld erhält Fokus,
Zähler sichtbar, Bildschirmtastatur verdeckt die Leiste nicht dauerhaft). Punkte, die Strg+F
voraussetzen (1, 14, 15), laufen nur auf „Desktop Chrome".

### 7.3 Pflicht-Regressionstest: Selection-Sync beim Schließen

Neuer Test **in** `tests/e2e/search.spec.ts` (nicht in `selection-regression.spec.ts` selbst,
das nur die Toolbar-Klick-Sequenz testet — aber im selben Geist, `suchen-req.md` Abschnitt 5
Testfall 5 / Abschnitt 11 Grenzfall 10):

```ts
test('closing search places a real selection at the last active match, ready to type', async ({ page }) => {
  // Dokument mit bekanntem Text, Strg+F, nach mittigem Wort suchen, zum Treffer navigieren,
  // Escape, SOFORT tippen → neuer Text erscheint an der Fundstelle, ersetzt NICHT den ganzen
  // Inhalt (kein künstlicher Timing-Workaround, weil closeSearch die Selektion synchron als
  // PM-Transaktion setzt — Abschnitt 2.5/3.2).
})
```

### 7.4 / 7.5 Ergänzung `src/formats/docx/__tests__/roundtrip.test.ts` und `.../odt/__tests__/roundtrip.test.ts`

Neuer Block „search & replace produces normal, round-trippable content":

- Baut über `EditorState.create` + `createSearchPlugin()` + `findMatches` +
  `replaceAllMatches` (echter Produktionspfad aus `commands.ts`, nicht handgeschriebenes
  Ersetzungs-JSON) einen Durchlauf gegen ein Dokument mit Zeichenformatierung + Liste +
  Tabelle. `writeDocx`/`writeOdt` → `readDocx`/`readOdt` → Ersatztext an richtiger Stelle,
  übernommene Formatierung, unveränderte übrige Teile (Abschnitt 9 Testfälle 3/6, Abschnitt 12
  Testfälle 3/4).
- Kontrolltest: Suchsitzung **ohne** Ersetzen (nur `findMatches`, keine Transaktion) →
  exportierter Inhalt identisch zu einem Kontrollexport ohne Suche (Abschnitt 12 Testfall 1/2,
  Abschnitt 6 Testfall 1). Nutzt die bereits vorhandene „preserves text color and highlight
  color"-Fixture-Struktur als Ausgangspunkt.

### 7.6 E2E-Rundreise (Abschnitt 12) — neue Datei `tests/e2e/search-roundtrip.spec.ts`

(empfohlen, um `docx.spec.ts`/`odt.spec.ts` nicht zu überladen):

1. Reale DOCX mit Formatierung/Liste/Tabelle hochladen → Suchsitzung **ohne** Ersetzen →
   Export → Re-Import → Inhalt == Original. 2. Dasselbe für ODT. 3. DOCX → Suchen & Ersetzen
   (inkl. Tabellenzelle) → Export DOCX → Re-Import → korrekt. 4. Dasselbe für ODT.
5. ODT → Ersetzen → Export **als DOCX** (Cross-Format) → Re-Import → korrekt. 6. DOCX →
   Ersetzen → Export **als ODT** → Re-Import → korrekt.

---

## 8. Zuordnung zu den Abnahmekriterien (Abschnitt 15)

| DoD-Punkt | Abdeckung |
|---|---|
| 1. Strg+F **und** Toolbar-Button, dieselbe Leiste, auch direkt nach Import, native Suche unterdrückt | 2.6/3.5/3.6, Test 7.2/1–2/15 |
| 2. Live-Suche, Literal, Groß-/Klein, Unicode-Whole-Word, diakritik-sensitiv, nicht überlappend | 2.2/2.3/3.2/3.3, Test 7.1/7.2 |
| 3. Alle Treffer markiert, aktiver nicht nur farblich, Cursor-basierte Initial-Aktivierung, Navigation+Wrap, Zähler als Live-Region | 3.2/3.3/3.7, Test 7.2/7–8/11 |
| 4. Flüchtige Decoration, kein Undo-/Export-/**dirty**-Einfluss | 2.4, Test 7.2/13, 7.4/7.5 |
| 5. Selection-Sync-Regressionstest, synchrone PM-Selektion | 2.5/3.2, Test 7.3 |
| 6. Dokumentwechsel bei offener Suche ohne Geister-Highlights/Crash | 2.7, Test 7.2/15–16 |
| 7. Rundreise DOCX **und** ODT (reine Suche) | 3.8, Test 7.4–7.6/1–2 |
| 8. Alle Grenzfälle Abschnitt 11 inkl. Mobile/Tablet + IME | Abschnitt 6, Test 7.1/7.2 |
| 9. (für `suchen-ersetzen`) Ersetzen inkl. Positionsverschiebung + Rundreise | 3.4/4, Test 7.1/14, 7.2/17, 7.4–7.6/3–6 |

**Über die Anforderung hinaus dokumentiert:** Abschnitt 8 Testfall 4 (Kopf-/Fußzeile) bleibt
bis `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` **zurückgestellt** (Abschnitt 5) — blockiert
den Backlog-Status von `suchen` nicht.

---

## 9. Reihenfolge der Umsetzung (Vorschlag)

1. `search.ts` (3.2) + `search.test.ts` (7.1) — reine Logik zuerst, schnellste Feedback-Schleife.
2. Plugin-Registrierung in `WordEditor.tsx` (3.6/1) ohne UI — Decorations im laufenden Editor
   per Dev-Tools-Dispatch verifizieren.
3. `SearchBar.tsx` (3.3) + Dokument-Ebene-Keydown (3.6/4) + `Toolbar.tsx`-Button (3.5) +
   restliche `WordEditor.tsx`-Verdrahtung (3.6/2–5) + `index.css` (3.7) — sichtbares reines „Suchen".
4. `tests/e2e/search.spec.ts` Grundfunktionen (7.2/1–16, ohne Ersetzen) + Pflicht-Regressionstest
   (7.3) — Kernfunktion unabhängig abnehmbar (`suchen-req.md` Zeilen 283–286).
5. `commands.ts`-Ergänzung (3.4) + Ersetzen-UI in `SearchBar.tsx` + Test 7.2/17.
6. Rundreise-Tests 7.4/7.5/7.6.
7. Backlog-Status `suchen` → „vorhanden" erst nach Schritt 4, `suchen-ersetzen` erst nach
   Schritt 6 — jeweils nur bei komplett grünen Tests (Abschnitt 15, Schlussabsatz). Vorher
   gilt weiterhin CI-Grün selbst prüfen (nicht annehmen).
