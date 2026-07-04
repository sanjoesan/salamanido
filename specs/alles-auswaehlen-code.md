# Umsetzungsplan „Alles auswählen“ — dateigenau, gegen den tatsächlichen Code geprüft

Bezug: `E:\docs\specs\alles-auswaehlen-req.md` (Anforderung), `E:\docs\FEATURE-SPEC-DOCX-ODT.md`
(Referenzkonventionen), Code-Stand geprüft am 2026-07-04 in `E:\docs` (kein Git-Repo,
Dateistand = Arbeitskopie). Geprüfte Dateien/Pakete: `src/formats/shared/editor/WordEditor.tsx`,
`src/formats/shared/editor/Toolbar.tsx`, `src/formats/shared/editor/commands.ts`,
`src/formats/shared/schema.ts`, `src/formats/shared/documentModel.ts`, `src/index.css`,
`src/formats/shared/editor/pageLayout.ts`, `src/app/DocumentWorkspace.tsx`, `src/App.tsx`,
`playwright.config.ts`, `package.json`, `tests/e2e/selection-regression.spec.ts`,
`tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, `node_modules/prosemirror-commands/dist/index.js`,
`node_modules/prosemirror-state/dist/index.js`, `node_modules/prosemirror-history/dist/index.js`,
`node_modules/prosemirror-tables/dist/index.js`, `node_modules/playwright-core` (Device-Definitionen).

Rolle dieses Dokuments: Es beantwortet, was am **bestehenden Code** falsch/unvollständig ist,
und legt fest, welche Dateien geändert bzw. neu angelegt werden. Vorweggenommenes Ergebnis,
weil es die Struktur des gesamten Plans bestimmt: **„Alles auswählen“ selbst benötigt keine
einzige Zeile neuen Anwendungscodes.** Jede in `alles-auswaehlen-req.md` beschriebene
Anforderung ist entweder bereits durch `prosemirror-commands`/`prosemirror-state`/
`prosemirror-history`/`prosemirror-tables` strukturell garantiert (mit Bibliotheks-Quellcode
belegt, Abschnitt 2), oder sie ist keine Lücke von „Alles auswählen“, sondern gehört einem
anderen, bereits existierenden Ticket/einer bereits existierenden Datei (Abschnitt 3). Der
tatsächliche Umsetzungsauftrag dieses Plans ist damit fast ausschließlich **Testinfrastruktur**
(Abschnitt 4/9) plus das **Beantworten der vier offenen Fragen** aus Abschnitt 8 der Anforderung
(Abschnitt 1).

---

## 0. Kurzfassung des Codebefunds

Die Bestandsaufnahme in `alles-auswaehlen-req.md` Abschnitt 0 ist zutreffend und wurde
unabhängig nachvollzogen:

- **Kein eigener Code-Pfad.** Verifiziert per Volltextsuche über `src/`:
  ```
  grep -rn "select-all|selectAll|AllSelection" src/
  → keine Treffer außerhalb von Kommentaren (WordEditor.tsx, Zeile 20)
  ```
  `commands.ts` exportiert `setAlign`, `isAlignActive`, `setHeading`, `toggleList`,
  `liftFromList`, `insertImage`, `insertTable`, `applyMarkColor`, `clearMarkColor` — nichts
  mit Selektions-Bezug. `Toolbar.tsx` hat keinen „Alles auswählen“-Button. `WordEditor.tsx`
  bindet `keymap(baseKeymap)` (Zeile 80) **nach** der eigenen `keymap({...})` (Zeilen 71–79,
  die selbst kein `Mod-a` enthält) — `baseKeymap`s `"Mod-a": selectAll` ist also der einzige
  Grund, warum Strg+A überhaupt funktioniert.
- **`selectAll` ist Bibliothekscode**, nicht Projektcode
  (`node_modules/prosemirror-commands/dist/index.js:489-492`):
  ```js
  const selectAll = (state, dispatch) => {
      if (dispatch) dispatch(state.tr.setSelection(new AllSelection(state.doc)));
      return true;
  };
  ```
- **Kein gestuftes Tabellenverhalten.** Bestätigt durch Gegenprobe in
  `node_modules/prosemirror-tables/dist/index.js`: keine `Mod-a`-Bindung, kein
  `selectAll`-Override, keine interne Keymap-Registrierung für Zell-/Tabellen-Ebenen-Selektion.
  `tableEditing()` (registriert in `WordEditor.tsx:82`) ändert daran nichts — es bindet nur
  Zellnavigations-/Lösch-Tasten, nie `Mod-a`. Der Ist-Zustand „sofort ganzes Dokument“ ist
  also nicht nur „vermutlich so“, sondern durch Abwesenheit jeder Gegen-Bindung **bestätigt**.
- **Kein `contextmenu`-Handler.** `grep -rn "contextmenu" src/` liefert **keinen** Treffer
  (identischer Befund wie in `kopieren-code.md` Abschnitt 3.5 und `ausschneiden-code.md`
  Abschnitt 1.3 für dieselbe Codebasis).
- **Kein eigenes `::selection`-Styling.** `src/index.css` (72 Zeilen, vollständig gelesen)
  enthält keine `::selection`-Regel.
- **Nur ein indirekter Test.** `tests/e2e/selection-regression.spec.ts` (3 Tests) nutzt
  Strg+A ausschließlich als Trigger für den Selection-Sync-Bug, nie als eigenständig
  geprüfte Funktion.

**Zusätzlich, über die Anforderungsdatei hinausgehend, neu gefundene bzw. präzisierte Punkte**
(analog zum Vorgehen in `kopieren-code.md`/`ausschneiden-code.md`, die ebenfalls über die
jeweilige `-req.md`-Bestandsaufnahme hinaus eigene Funde ergänzt haben):

1. **`AllSelection` überschreibt nichts außer `replace`/`toJSON`/`map`/`eq`/`getBookmark`**
   (`node_modules/prosemirror-state/dist/index.js:408-434`) — `ranges`, `from`, `to`, `$from`,
   `$to`, `empty`, `content()` sind die generischen Implementierungen der Basisklasse
   `Selection` (Zeilen 9-70). Das ist der Beleg dafür, dass **jeder** Fix, der an anderer
   Stelle über `state.selection.ranges`/`from`/`to` (statt `$from` allein) geht, automatisch
   auch für `AllSelection` korrekt arbeitet — relevant für Abschnitt 1, Frage 3 unten.
2. **Undo-Neutralität ist strukturell erzwungen, nicht nur wahrscheinlich.**
   `node_modules/prosemirror-history/dist/index.js`, Funktion `applyTransaction`:
   ```js
   if (tr.steps.length == 0) { return history; }
   ```
   `selectAll`s Transaktion (`state.tr.setSelection(...)`) hat **keine** `Step`s (eine reine
   Selektionsänderung erzeugt nie einen `Step`) — `prosemirror-history` verwirft sie also,
   bevor sie überhaupt in Erwägung gezogen wird, unabhängig von jeder Undo-Gruppierungslogik
   weiter unten in derselben Funktion. Das beweist Grenzfall 8 der Anforderung
   mathematisch, nicht nur empirisch.
3. **`AllSelection.replace` garantiert ein gültiges Restdokument.**
   ```js
   replace(tr, content = Slice.empty) {
       if (content == Slice.empty) {
           tr.delete(0, tr.doc.content.size);
           let sel = Selection.atStart(tr.doc);
           if (!sel.eq(tr.selection)) tr.setSelection(sel);
       } else { super.replace(tr, content); }
   }
   ```
   In Kombination mit `doc: { content: 'block+' }` (`src/formats/shared/schema.ts:7`) kann
   `tr.delete(0, size)` nie zu einem leeren/ungültigen Dokument führen — ProseMirrors
   Transform-Fit-Logik ergänzt beim Löschen des gesamten Inhalts automatisch einen leeren
   Absatz. Das ist derselbe Mechanismus, den `ausschneiden-code.md` Abschnitt 1.4 für
   Strg+X/Strg+A bereits (dort beiläufig) dokumentiert; hier wird er als **die** tragende
   Garantie für Grenzfall 1/6 der vorliegenden Anforderung explizit gemacht.
4. **Die editierbare „Seite“ ist unabhängig vom App-Farbschema immer hell.** `pageLayout.ts`,
   `pageBackgroundStyle()`: `backgroundImage: linear-gradient(to bottom, white 0, white
   ${PAGE_CONTENT_HEIGHT_PX}px, …)` — der Seiteninhalt selbst ist **fest** weiß (nur die
   Chrome *um* die Seiten herum, `bg-neutral-200 dark:bg-neutral-950` in `WordEditor.tsx:119`,
   wechselt mit dem Theme). Zusätzlich setzt `.ProseMirror { color: #111827 }`
   (`src/index.css:26`) eine **feste** dunkle Textfarbe, ebenfalls unabhängig vom Theme. Der
   in Anforderung 2.3 befürchtete Fall „heller/unlesbarer Browser-Standard-Selektionshintergrund
   im Dark Mode“ betrifft also mutmaßlich **nie** die eigentliche Editierfläche — Dark Mode
   ändert nur die Chrome außerhalb der Seite, nie die Seite selbst. Das reduziert das Risiko
   aus Abschnitt 2.3/Testfall 14 der Anforderung erheblich, ersetzt aber **nicht** den dort
   geforderten visuellen Verifikationsschritt (Abschnitt 9.5 unten).
5. **Tangentialer, aber nicht blockierender Fund: keinerlei Standard-ProseMirror-CSS ist
   eingebunden.** `src/main.tsx` importiert nur `./index.css`; kein Import von
   `prosemirror-view/style/prosemirror.css`, `prosemirror-tables/style/tables.css` oder
   `prosemirror-gapcursor/style/gapcursor.css` existiert irgendwo im Repo (Volltextsuche ohne
   Treffer). Das bedeutet, die Klasse `.ProseMirror-selectednode` (die ProseMirror intern bei
   jeder echten `NodeSelection`, z. B. Einzelklick auf ein Bild, per JS auf das DOM-Element
   setzt) hat **keinerlei** visuelle Wirkung, weil die zugehörige Default-Regel
   (`outline: 2px solid #8cf`) nirgends definiert ist. **Für „Alles auswählen“ selbst ist das
   kein Blocker**, weil eine `AllSelection` kein Bild als eigene `NodeSelection` einbettet —
   ein von einer `AllSelection` eingeschlossenes Bild bekommt ausschließlich die native
   Browser-Range-Hervorhebung (kein `.ProseMirror-selectednode`). Es ist aber ein real
   existierender, bisher unentdeckter Darstellungsfehler, der **Einzelklick auf ein Bild**
   betrifft (eigene `NodeSelection`, dort *würde* die Klasse gesetzt, aber nichts anzeigen).
   Das gehört inhaltlich zu `bild-einfuegen-req.md`/`bild-groesse-aendern-req.md`, nicht zu
   diesem Ticket — wird hier nur vermerkt, damit es nicht verloren geht (siehe Abschnitt 13).
6. **Frage 3 der Anforderung überschneidet sich mit vier bereits existierenden
   Schwester-Plänen.** Siehe Abschnitt 3.2 — wichtig genug, um hier vorab erwähnt zu werden:
   `fett-code.md`, `kursiv-code.md`, `durchgestrichen-code.md` und
   `unterstrichen-einfach-code.md` beschreiben **alle vier unabhängig voneinander** dieselbe
   Diagnose (`MarkButton` wertet nur `$from.marks()` aus) und schlagen **jeweils eine eigene**
   `isMarkActive`-Hilfsfunktion in derselben Datei (`commands.ts`) vor — mit **unterschiedlichen
   Implementierungsdetails** (z. B. `kursiv-code.md` prüft zusätzlich `state.selection.ranges`
   für `CellSelection`-Fälle, `fett-code.md`s Version tut das nicht). Da noch keiner dieser
   vier Pläne umgesetzt ist (verifiziert: `commands.ts` enthält aktuell keine `isMarkActive`-
   Funktion, `Toolbar.tsx` ruft weiterhin `toggleMark` direkt auf), ist dies ein
   **Koordinationsrisiko zwischen vier Tickets**, kein Fehler dieses Plans — dieser Plan
   dupliziert die Implementierung bewusst **nicht** (siehe Entscheidung zu Frage 3 in
   Abschnitt 1).
7. **Der aus `kopieren-code.md`/`ausschneiden-code.md` bekannte Cross-Format-Export-Blocker
   besteht unverändert fort.** `src/app/DocumentWorkspace.tsx::handleExport` (Zeilen 17–29)
   exportiert weiterhin ausschließlich in das Ursprungsformat (`module.exportFile(...)`, wobei
   `module` beim Öffnen fest gebunden wird, `src/App.tsx:20`). Es gibt weiterhin keinen
   „Exportieren als …“-Weg. Das blockiert die Cross-Format-Testfälle 6/7/8 aus
   `alles-auswaehlen-req.md` Abschnitt 4.2 genauso, wie es dort bereits für Kopieren/
   Ausschneiden dokumentiert ist (Abschnitt 3.3 unten).

---

## 1. Entscheidungen zu den offenen Fragen (`alles-auswaehlen-req.md` Abschnitt 8)

Diese Antworten sind so formuliert, dass sie **wörtlich** in `alles-auswaehlen-req.md`
Abschnitt 8 nachgetragen werden können, sobald dieser Plan freigegeben ist.

### Frage 1: Eigener Toolbar-Button für „Alles auswählen“?

**Entscheidung: Nein.** Begründung, konsistent mit der bereits getroffenen Entscheidung für
„Kopieren“ (`kopieren-code.md` Abschnitt 1, Frage 1) und im Unterschied zur Entscheidung für
„Ausschneiden“ (`ausschneiden-code.md`, das **einen** Button bekommt):

- Ein Toolbar-Button für Ausschneiden ist gerechtfertigt, weil er einen **deaktivierten
  Zustand** (keine Selektion) sinnvoll sichtbar macht und weil Ausschneiden eine
  **destruktive** Aktion ist, für die ein zusätzlicher, entdeckbarer Zugriffsweg einen realen
  Nutzen hat (Anforderung `ausschneiden-req.md` Abschnitt 1). „Alles auswählen“ hat laut
  `alles-auswaehlen-req.md` Abschnitt 2.1 explizit **keinen** deaktivierten Zustand — ein
  Button wäre demnach **immer** aktiv, was keinen Mehrwert gegenüber der bereits
  vorhandenen, universellen Tastenkombination bietet.
- Word und LibreOffice bieten „Alles auswählen“ selbst primär über Tastenkombination +
  Menü/Kontextmenü an, nicht über einen prominenten Symbolleisten-Button (in Word ist es ein
  Menüpunkt unter „Bearbeiten“/„Auswählen“ im Home-Ribbon, kein Einzel-Icon) — dieses Produkt
  hat kein Ribbon-Menüsystem, in das ein solcher Menüpunkt passen würde (Abschnitt 1, Punkt 5
  der Anforderung, bereits so entschieden).
- Ein neuer Button würde denselben `AllSelection`-Code auslösen, den Strg+A bereits auslöst —
  kein neuer Zustand, kein neues Feedback, nur ein redundanter Klickweg mit zusätzlichem
  Wartungsaufwand (Icon, i18n, Fokus-Handling).

Konsequenz für den Code: **keine Änderung an `Toolbar.tsx`** für „Alles auswählen“ selbst.

### Frage 2: Sofort-ganzes-Dokument- vs. gestuftes Tabellenverhalten?

**Entscheidung: (a) — das aktuelle „sofort gesamtes Dokument“-Verhalten wird als bewusstes,
endgültiges Soll übernommen.** Begründung:

- Kein zusätzlicher Code nötig (siehe Abschnitt 0, Fund 2) — das entspricht der von der
  Anforderung selbst vorgeschlagenen Vorzugsoption „(a) … da es dem aktuellen Ist-Zustand
  entspricht und keinen zusätzlichen Code erfordert“.
- Ein gestuftes Zelle→Tabelle→Dokument-Verhalten (wie Word/LibreOffice) würde **zusätzlichen,
  nicht triviale zustandsbehafteten Code** erfordern: die Bibliothek `selectAll` ist zustandslos
  (jeder Aufruf erzeugt unabhängig eine neue `AllSelection`), ein gestuftes Verhalten bräuchte
  ein eigenes Plugin, das sich merkt, „auf welcher Stufe“ die letzte Strg+A-Betätigung war,
  und das bei jeder Cursorbewegung/jedem Klick zurückgesetzt werden müsste. Das widerspricht
  zusätzlich der **wörtlichen Anforderung aus Grenzfall 2**: „Wiederholtes Strg+A … bleibt
  idempotent bei vollständiger Selektion, keine sichtbare Änderung“ — genau das Gegenteil
  einer gestuften Ebenen-Weiterschaltung. Beide Anforderungen (Grenzfall 2 **und** ein
  gestuftes Tabellenverhalten) gleichzeitig zu erfüllen, würde bedeuten, den Ebenen-Zustand nur
  zu erhöhen, solange man sich **noch nicht** auf der Dokument-Ebene befindet, und ab da
  strikt idempotent zu bleiben — lösbar, aber ein eigenständiges Feature mit eigenem
  Zustandsautomaten, keine kleine Ergänzung.
- Strukturell bereits sicher (Abschnitt 0, Fund 3): Auch aus einer Tabellenzelle heraus
  erzeugt Strg+A → Entf ein valides Restdokument, keine kaputte Tabellenstruktur — die in
  Grenzfall 3 geforderte Mindestanforderung („darf nicht strukturell inkonsistent sein“) ist
  bereits erfüllt, unabhängig von der gestuft/sofort-Entscheidung.
- Konsequenz: **kein neuer Code**, nur eine dokumentierte Entscheidung plus Test, der exakt
  dieses Verhalten (Zelle → sofort ganzes Dokument, danach valide leer nach Entf) als Soll
  festschreibt (Abschnitt 9, Testfall analog Req-Testfall 4).

### Frage 3: Toolbar-Zustandsanzeige bei uneinheitlicher Formatierung nach Strg+A?

**Entscheidung: Wird nicht von diesem Ticket behoben — ist bereits Gegenstand von vier
anderen, unabhängigen Plänen.** Siehe Abschnitt 0, Fund 6, und Abschnitt 3.2 unten für die
Details. Zusammengefasst:

- `fett-code.md`, `kursiv-code.md`, `durchgestrichen-code.md` und
  `unterstrichen-einfach-code.md` planen bereits **je eine eigene** Korrektur derselben
  Zeile `Toolbar.tsx:42` (`markType.isInSet(view.state.selection.$from.marks())`), weil jede
  dieser vier Anforderungen dieselbe Diagnose unabhängig gemacht hat.
- Dieser Plan führt **keine fünfte, wiederum leicht abweichende** Implementierung ein — das
  würde das bereits bestehende Koordinationsrisiko (vier fast identische, aber nicht
  identische Fixes für dieselbe Zeile) nur verschärfen.
- Der einzige genuine Beitrag von „Alles auswählen“ zu diesem Thema: sobald **einer** der vier
  Pläne gelandet ist, muss ein Regressionstest bestätigen, dass die Korrektur auch für eine
  echte `AllSelection` (nicht nur für eine gewöhnliche `TextSelection` über einen Teilbereich)
  korrekt greift. Das ist durch Abschnitt 0, Fund 1 bereits **strukturell vorhergesagt**
  (`AllSelection` überschreibt `ranges`/`from`/`to`/`$from` nicht, jede auf diesen Feldern
  basierende Korrektur funktioniert automatisch auch bei `AllSelection`) — aber „vorhergesagt“
  ist nicht „bewiesen“, deshalb Pflicht-Test in Abschnitt 9.3.
- Diese Entscheidung ist in `alles-auswaehlen-req.md` Abschnitt 8, Frage 3 als „ausgelagert an
  `fett-code.md`/`kursiv-code.md`/`durchgestrichen-code.md`/`unterstrichen-einfach-code.md`,
  hier nur mit AllSelection-Regressionstest nachgezogen“ nachzutragen, **nicht** als „bewusst
  akzeptierte Einschränkung“ — es ist ein tatsächlicher Fix, nur nicht von diesem Ticket.

### Frage 4: Ist Safari/WebKit bzw. macOS (Cmd+A) Teil der Testmatrix?

**Entscheidung: Teilweise — kein neues Playwright-Projekt speziell für dieses Ticket,
Wiederverwendung/Koordination mit dem bereits andernorts geplanten WebKit-Projekt.**
Befund (`playwright.config.ts`, Zeilen 19–23, unverändert seit `kopieren-code.md`s Prüfung):

```ts
projects: [
  { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
  { name: 'Mobile', use: { ...devices['Pixel 7'] } },
  { name: 'Tablet', use: { ...devices['iPad Mini'] } },
]
```

Erneut geprüft (`node -e "require('playwright-core').devices['iPad Mini'].defaultBrowserType"`):
`iPad Mini` → **`webkit`**, `Pixel 7`/`Desktop Chrome` → `chromium`. Das bestätigt exakt den
in `kopieren-code.md` Abschnitt 1, Frage 2 dokumentierten Befund erneut. Für „Alles auswählen“
folgt daraus:

- Die neuen Testdateien (Abschnitt 4.2) laufen **ohne Sonderkonfiguration** automatisch auch
  auf dem `Tablet`-Projekt (WebKit-Engine) — das deckt die WebKit-Code-Pfad-Ausführung von
  `selectAll`/`AllSelection` bereits ab, allerdings über `page.keyboard.press('ControlOrMeta+a')`
  auf einem **touch-emulierten** Gerät, nicht als echter macOS-Desktop-Test mit einer echten
  Cmd-Taste.
- `kopieren-code.md` Abschnitt 1, Frage 2 plant bereits ein **neues, eigenes** Projekt
  `Desktop Safari (Clipboard)` (WebKit, Desktop-Viewport, gescoped über `testMatch` auf
  `clipboard*.spec.ts`) — das existiert im heutigen `playwright.config.ts` **noch nicht**
  (verifiziert: nur die drei oben gezeigten Projekte sind vorhanden; weder `kopieren-code.md`
  noch `ausschneiden-code.md` sind bereits umgesetzt).
- **Empfehlung statt eigenem drittem/viertem WebKit-Projekt:** Sobald das `Desktop Safari
  (Clipboard)`-Projekt aus `kopieren-code.md` real angelegt wird, dessen `testMatch`-Regex um
  die neuen `select-all*.spec.ts`-Dateien erweitern (z. B. `/(clipboard|select-all).*\.spec\.ts/`),
  statt ein drittes, fast identisches WebKit-Projekt anzulegen. Das vermeidet unnötig
  wachsende CI-Laufzeit durch mehrere Desktop-Safari-Projekte mit demselben Gerät.
- Solange dieses Safari-Projekt noch nicht existiert, bleibt „echtes macOS/Cmd+A“ ein
  **offener Punkt** (wie in `alles-auswaehlen-req.md` Abschnitt 1, Zeile 91 bereits selbst als
  zulässig vorgesehen) — hier explizit **nicht** stillschweigend als erledigt markiert.

---

## 2. Verifizierte Anforderungs-Codebelege (Bibliotheks-Ebene)

Gegen `node_modules/prosemirror-*` geprüft, damit jede Anforderung aus `alles-auswaehlen-req.md`
Abschnitt 2/3 nicht nur angenommen, sondern belegt ist:

| Anforderung (`alles-auswaehlen-req.md`) | Codebeleg | Ergebnis |
|---|---|---|
| 2.1 Immer auslösbar, kein deaktivierter Zustand | `selectAll` prüft keinerlei Vorbedingung außer `dispatch` vorhanden (`prosemirror-commands/dist/index.js:489-492`) | **Bereits erfüllt**, kein Code nötig, nur Test |
| 2.2 Markiert wirklich den gesamten Baum (Absätze, Listen, Tabellen, Bilder, `hard_break`) | `AllSelection`-Konstruktor: `super(doc.resolve(0), doc.resolve(doc.content.size))` — deckt strukturell **jede** Position ab, unabhängig vom Node-Typ | **Bereits erfüllt**, kein Code nötig, nur Test |
| 2.4 Pfeiltasten kollabieren an den Rand | `AllSelection` ist eine normale `Selection`-Unterklasse; ProseMirrors Standard-Cursorbewegungslogik (`prosemirror-commands`, `selectNodeBackward`/Basisverhalten der `EditorView`) behandelt sie wie jede Range-Selektion — kein Sonderfall im Projekt-Code nötig | **Bereits erfüllt**, kein Code nötig, nur Test |
| 3 Grenzfall 1/6 (leeres Dokument, Entf danach) | `AllSelection.replace` + `doc: 'block+'` (Abschnitt 0, Fund 3) | **Bereits erfüllt**, kein Code nötig, nur Test |
| 3 Grenzfall 2 (Idempotenz) | `AllSelection.eq(other) { return other instanceof AllSelection }` (`prosemirror-state/dist/index.js:432`) — zwei `AllSelection`-Instanzen sind immer „gleich“ | **Bereits erfüllt**, kein Code nötig, nur Test |
| 3 Grenzfall 3 (Tabellenzelle) | Abschnitt 0, Fund/Frage 2 | **Bereits erfüllt (als Soll (a) bestätigt)**, kein Code nötig, nur Test |
| 3 Grenzfall 4 (Bild in Selektion, Ausrichtung danach) | `setAlign` (`commands.ts:13-27`) iteriert via `state.doc.nodesBetween(from, to, …)` und wendet nur auf `alignableTypes = {paragraph, heading}` an — `image` wird stillschweigend übersprungen, kein Fehler möglich | **Bereits erfüllt**, kein Code nötig, nur Test |
| 3 Grenzfall 8 (Undo-Neutralität) | Abschnitt 0, Fund 2 (`tr.steps.length == 0`) | **Bereits erfüllt (strukturell bewiesen)**, kein Code nötig, nur Test |
| 3 Grenzfall 9 (IME-Komposition) | ProseMirror-View verarbeitet `compositionstart`/`compositionupdate`/`compositionend` intern (`prosemirror-view`, `composition.ts`-Logik) unabhängig von der aktuellen Selektionsart; `Mod-a` ist eine reine Keydown-Bindung, die während einer aktiven Komposition vom Browser typischerweise gar nicht als normales `keydown` weitergereicht wird (IME fängt die Taste ab) | Vermutlich bereits erfüllt, **aber Verhalten browserabhängig** — nur per Test verifizierbar, kein Code-Fix im Projekt möglich/nötig |
| 3 Grenzfall 10 (Fokus außerhalb des Editors) | `prosemirror-keymap`s `keydownHandler` wird über `EditorProps.handleKeyDown` **nur** für Events registriert, die auf `view.dom` (dem `contenteditable`-Element) auftreffen; ein Toolbar-`<input type="color">` ist ein eigenes, nicht verschachteltes DOM-Element außerhalb von `view.dom` | **Bereits erfüllt (strukturell)**, kein Code nötig, nur Test |
| 3 Grenzfall 11 (großes Dokument, Performance) | Keine Custom-Logik im Selektionspfad — `AllSelection` ist O(1) im Konstruktor (zwei `resolve`-Aufrufe); keine dokumentweite Traversierung beim Erzeugen der Selektion selbst | **Bereits erfüllt**, kein Code nötig, nur Test (Zeitmessung) |
| 3 Grenzfall 12 (Kopieren/Ausschneiden danach) | Siehe `kopieren-code.md`/`ausschneiden-code.md` — beide bereits eigenständig verifiziert, hier nur die Verkettung mit vorangehendem Strg+A zu testen | Kein neuer Code, nur Verkettungs-Test |
| 3 Grenzfall 16 (kein globaler `contextmenu`-Handler) | Abschnitt 0 (Grep ohne Treffer) | **Bereits erfüllt**, Regressionstest hält das fest |

---

## 3. Was tatsächlich fehlt bzw. wem es gehört

### 3.1 Kernlücke dieses Tickets: kein eigenständiger Test

Das ist die einzige **echte** Lücke, die „Alles auswählen“ selbst gehört (keine Bibliotheks-
Garantie kann einen fehlenden Test ersetzen): Es existiert kein Test, der behauptet und
verifiziert „Strg+A markiert wirklich alles“, unabhängig vom Selection-Sync-Bug. Abschnitt 4/9
liefert die neuen Dateien dafür.

### 3.2 Frage-3-Überschneidung — Detail

Vergleich der vier bereits vorhandenen, unabhängigen Diagnosen derselben Zeile
`Toolbar.tsx:42`:

| Datei | Vorgeschlagener Funktionsname | Deckt `CellSelection`/`ranges` ab? | Bereits umgesetzt? |
|---|---|---|---|
| `fett-code.md` §4.1 | `isMarkActive(state, markType)` (iteriert `state.doc.nodesBetween(from, to, …)`, nutzt nur `from`/`to` der **Hauptrange**) | Nein (nutzt `from`/`to`, nicht `ranges`) | Nein |
| `kursiv-code.md` §4.1 | `isMarkActive(state, markType)` **und** `toggleInlineMark(markType, attrs?)` (iteriert `state.selection.ranges`, inkl. `removeWhenPresent:false`-Fix für `toggleMark` selbst) | Ja | Nein |
| `durchgestrichen-code.md` §3.6 | Eigene Variante (Pro-Range-Definition äquivalent zu `toggleMark`s `removeWhenPresent:true`-Zweig, nicht `:false`) | Teilweise (anderes Zielverhalten) | Nein |
| `unterstrichen-einfach-code.md` | Verweist auf dasselbe Muster, keine eigene Funktion vorgeschlagen | — | Nein |

Alle vier Pläne ändern dieselbe Zeile in `Toolbar.tsx` und potenziell dieselbe neue Funktion
in `commands.ts` — mit **unterschiedlichem** Umfang (`ranges` vs. `from`/`to`) und
**unterschiedlichem** Toggle-Zielverhalten (`removeWhenPresent` an/aus). Das ist außerhalb des
Geltungsbereichs von „Alles auswählen“, aber relevant genug, um hier dokumentiert zu werden,
damit die vier Tickets nicht überraschend gegeneinander arbeiten. **Empfehlung an das
Backlog (nicht Teil dieses Plans):** eines der vier Tickets (vorzugsweise `kursiv-code.md`,
weil es als einziges bereits `ranges`-basiert **und** das Toggle-Verhalten selbst behandelt)
als kanonische Quelle für `isMarkActive`/`toggleInlineMark` bestimmen, die anderen drei
referenzieren statt duplizieren.

### 3.3 Geerbter Cross-Format-Export-Blocker

Identisch zu `kopieren-code.md` Abschnitt 3.4 / `ausschneiden-code.md` Abschnitt 3.5, hier
erneut verifiziert (Abschnitt 0, Fund 7). Betrifft `alles-auswaehlen-req.md` Abschnitt 4.2,
Testfälle 6 („DOCX war Ursprung → als ODT exportieren“), 7 (umgekehrt) und 8 („doppelte
Rundreise“ mit Formatwechsel). Diese drei Testfälle werden in Abschnitt 9.2 unten als
`test.fixme(...)` mit Verweis auf denselben, bereits an anderer Stelle gemeldeten Blocker
markiert — **kein** erneuter Fix-Vorschlag hier, um keine dritte, konkurrierende
Lösungsbeschreibung für dasselbe Problem zu erzeugen (siehe bereits
`kopieren-code.md` Abschnitt 3.4 für den vorgeschlagenen Minimal-Patch).

### 3.4 Bereits korrekt, nur zu bestätigen: `.ProseMirror-selectednode` betrifft „Alles auswählen“ nicht

Siehe Abschnitt 0, Fund 5. Kein Code-Fix in diesem Ticket. Wird in Abschnitt 13 als
weiterzumeldender Fund an ein Bild-Ticket vermerkt.

---

## 4. Datei-für-Datei-Umsetzungsplan

### 4.1 Geänderte Dateien

| Datei | Änderung | Abschnitt |
|---|---|---|
| `specs/alles-auswaehlen-req.md` | Abschnitt 8 um die vier Entscheidungen aus Abschnitt 1 dieses Plans ergänzen (wörtlich übernehmbar) | 1 |

**Das ist die einzige inhaltliche Änderung an bestehendem Anwendungscode/-konfiguration.**
Explizit **NICHT** geändert (und warum):

- `src/formats/shared/editor/commands.ts` — keine neue Selektionslogik nötig (Abschnitt 2);
  die einzige mit „Alles auswählen“ überschneidende Änderungsidee (`isMarkActive`) gehört den
  vier in Abschnitt 3.2 genannten Tickets, nicht diesem.
- `src/formats/shared/editor/Toolbar.tsx` — keine Änderung (Entscheidung Frage 1, Abschnitt 1).
- `src/formats/shared/editor/WordEditor.tsx` — keine Änderung. Insbesondere wird **keine**
  eigene `Mod-a`-Bindung in die projekteigene `keymap({...})` (Zeilen 71–79) vorgezogen — sie
  würde exakt dasselbe tun wie `baseKeymap`s vorhandener Eintrag und nur eine zweite
  Quelle der Wahrheit für dasselbe Verhalten schaffen. Empfehlung: einen Kommentar direkt
  über `keymap(baseKeymap)` (Zeile 80) ergänzen, der festhält, dass Strg+A/Cmd+A bewusst über
  diesen Bibliotheks-Default läuft und wo die Verifikation dazu liegt:
  ```ts
  // "Mod-a" (Alles auswählen) kommt bewusst aus prosemirror-commands' baseKeymap
  // (selectAll → AllSelection), keine eigene Bindung hier. Verifiziert in
  // specs/alles-auswaehlen-code.md; Tests in tests/e2e/select-all.spec.ts.
  keymap(baseKeymap),
  ```
  Das ist eine reine Kommentar-Ergänzung (keine Verhaltensänderung), optional, aber empfohlen,
  damit ein künftiger Bearbeiter nicht versehentlich denkt, Strg+A sei ungetestet/unbeabsichtigt.
- `src/formats/shared/schema.ts` — keine Änderung. Kein neuer Node-/Mark-Typ wird für „Alles
  auswählen“ benötigt.
- `src/index.css` — keine Änderung. Kein eigenes `::selection`-Styling wird ergänzt: Es gibt
  aktuell keinen belegten Kontrast-Fehler (Abschnitt 0, Fund 4), und ein Eingriff ohne
  konkreten Befund wäre unbegründeter Scope-Creep. Wird der Visualtest in Abschnitt 9.5
  einen tatsächlichen Kontrastfehler aufdecken, ist das ein **neuer, separat zu behandelnder
  Fund** (siehe Abschnitt 13), keine vorab angenommene Änderung.
- `src/app/DocumentWorkspace.tsx` — keine Änderung durch dieses Ticket (Cross-Format-Export
  ist ein fremder Blocker, Abschnitt 3.3).
- `src/formats/docx/*`, `src/formats/odt/*` — keine Änderung (Abschnitt 7).
- `playwright.config.ts` — keine zwingende Änderung (Abschnitt 1, Frage 4; optionale
  spätere Koordination mit dem WebKit-Projekt aus `kopieren-code.md`).

### 4.2 Neue Dateien

| Datei | Zweck |
|---|---|
| `tests/e2e/select-all.spec.ts` | Neue Haupt-E2E-Suite: Abschnitt 1/2/3 (Basisverhalten, Grenzfälle 1/2/3/4/6/9/10/11) und Abschnitt 6, Testfälle 1–3, 5–8, 12–14 aus `alles-auswaehlen-req.md` |
| `tests/e2e/select-all-roundtrip.spec.ts` | Abschnitt 4 aus `alles-auswaehlen-req.md`: Rundreise-Testfälle 1–5, 9 aktiv; 6–8 als `test.fixme(...)`, Verweis auf Abschnitt 3.3 |
| `src/formats/shared/editor/__tests__/select-all.test.ts` | Vitest-Unit-Tests (jsdom, kein echter Browser nötig): direkte `AllSelection`/`Transaction`-Prüfungen für die in Abschnitt 2 tabellierten Bibliotheksgarantien (schnelle, deterministische Absicherung zusätzlich zur E2E-Ebene) |

Erweiterte (nicht neu angelegte) Datei:

| Datei | Änderung | Zweck |
|---|---|---|
| `tests/e2e/selection-regression.spec.ts` | 2 neue Tests **ergänzt** (bestehende 3 Tests bleiben unverändert) | Abschnitt 2.6 letzter Punkt der Anforderung: Ausschneiden/Kopieren statt Fett als Zwischenschritt |

---

## 5. ProseMirror-Schema/Commands — Detailplan

**Ergebnis: keine Änderung.** Weder `wordSchema` (`schema.ts`) noch `commands.ts` benötigen
neue Nodes, Marks oder Befehle für „Alles auswählen“. Die Funktion besteht vollständig aus
der bereits eingebundenen `baseKeymap`-Bindung; ein projekteigener `selectAllCommand`-Wrapper
würde keinen zusätzlichen Nutzen bieten (kein zusätzlicher Zustand, keine zusätzliche
Fehlerbehandlung nötig — `selectAll` kann strukturell nicht fehlschlagen, siehe Abschnitt 2,
Zeile 1 der Tabelle) und stattdessen nur eine zweite Quelle der Wahrheit neben `baseKeymap`
schaffen, die bei künftigen ProseMirror-Updates auseinanderlaufen könnte.

**Einzige Ausnahme, falls Frage 2 in einer späteren Iteration von (a) auf (b) revidiert
werden sollte** (gestuftes Zelle→Tabelle→Dokument-Verhalten): Das würde einen neuen,
zustandsbehafteten Befehl (z. B. `stagedSelectAll(): Command`, der per `tr.setMeta` die
zuletzt erreichte Stufe trägt) sowie eine eigene `Mod-a`-Bindung in der projekteigenen
`keymap({...})` **vor** `keymap(baseKeymap)` erfordern (Priorität nach Registrierungsreihenfolge
in `WordEditor.tsx`). Das ist hier **nicht** Teil des Umsetzungsauftrags (Frage 2 wurde in
Abschnitt 1 auf (a) entschieden) — nur als Hinweis für eine mögliche künftige Revision notiert.

---

## 6. Toolbar-Änderungen

**Keine.** Siehe Entscheidung zu Frage 1 (Abschnitt 1) und Frage 3 (Abschnitt 1/3.2).
`Toolbar.tsx` wird durch dieses Ticket an keiner Stelle verändert. Sollte die
Produktentscheidung zu Frage 1 in der Freigabe umgekehrt werden (Button doch gewünscht), wäre
der Ansatz: neuer Button analog zu den bestehenden Formatierungs-Buttons,
`onMouseDown` → `e.preventDefault(); run(view, selectAll)` (Import von `selectAll` aus
`prosemirror-commands`, kein eigener Wrapper nötig, da der Befehl bereits genau das gewünschte
Verhalten hat), ohne eigenen „aktiv“-Zustand (es gibt laut Anforderung 2.1 keinen
deaktivierten Zustand). Dieser Absatz ist reine Handlungsoption, **nicht** Teil des aktuellen
Umsetzungsplans.

---

## 7. Import/Export-Anpassungen OOXML (DOCX) und ODF (ODT)

**Ergebnis der Prüfung: Keine Änderungen nötig.** Begründung: „Alles auswählen“ schreibt
selbst keine Datei (`alles-auswaehlen-req.md`, einleitender Satz von Abschnitt 4). Die
Rundreise-Anforderung bezieht sich ausschließlich darauf, dass eine **mit** Strg+A als
Zwischenschritt durchgeführte Aktion (Formatieren/Löschen/Kopieren-Einfügen) beim
Export/Re-Import zum selben Ergebnis führt wie ohne den Strg+A-Umweg. Das ist strukturell
bereits gegeben, weil Strg+A ausschließlich die **Selektion** ändert, niemals den
Dokumentbaum selbst — Reader/Writer sehen nach einer per `AllSelection` durchgeführten
Formatierungs-/Löschaktion exakt dasselbe ProseMirror-Dokument, das sie auch sähen, wenn
dieselbe Aktion über eine manuelle Mehrfach-Selektion jedes einzelnen Absatzes erreicht worden
wäre.

Konkret geprüft (identische Belege wie in `kopieren-code.md` Abschnitt 7, hier erneut für
„Alles auswählen“ nachvollzogen):

| Merkmal | DOCX Reader/Writer | ODT Reader/Writer | Bewertung |
|---|---|---|---|
| Formatierung über gesamtes Dokument (Fett/Kursiv/…) je Lauf | Reader/Writer verarbeiten jeden Absatz/Lauf unabhängig, kein „erster/letzter Block“-Sonderfall (`docx/reader.ts`/`writer.ts` iterieren generisch über `body.content`) | Analog (`odt/reader.ts`/`writer.ts`) | **Vollständig**, kein Änderungsbedarf |
| `colspan`/`rowspan` bleibt nach Strg+A+Formatierung erhalten | `writer.ts:130,154-164` (`w:gridSpan`, `w:vMerge`), `reader.ts:223-250` — unverändert seit `kopieren-code.md`-Prüfung | `writer.ts:94-98` (`table:number-columns-spanned`/`-rows-spanned`), `reader.ts:193-197` — unverändert | **Vollständig**, kein Änderungsbedarf |
| Vollständige Löschung (Strg+A → Entf) exportiert als valide leere Datei | Schema-Constraint `doc: 'block+'` garantiert mindestens einen leeren Absatz im Restdokument (Abschnitt 0, Fund 3); Writer verarbeitet einen einzelnen leeren Absatz wie jeden anderen | Analog | **Vollständig**, kein Änderungsbedarf |
| Bilder innerhalb einer `AllSelection`-Formatierung bleiben unverändert | `setAlign` überspringt `image`-Knoten wirkungslos (Abschnitt 2); `imageCollector.ts` verarbeitet jede `image`-Node unabhängig von vorangegangenen Selektionsoperationen | Analog `odt/imageCollector.ts` | **Vollständig**, kein Änderungsbedarf |

**Einziger Blocker, der Import/Export indirekt betrifft:** der in Abschnitt 3.3 beschriebene,
bereits andernorts gemeldete Cross-Format-Export-Blocker — liegt nicht an Reader/Writer selbst
(die sind cross-format-fähig), sondern an der fehlenden UI in `DocumentWorkspace.tsx`.

---

## 8. Playwright-Konfiguration

**Kein neues Projekt zwingend erforderlich für dieses Ticket.** Die neuen Testdateien laufen
automatisch auf allen drei bestehenden Projekten (`Desktop Chrome`, `Mobile`, `Tablet`), da die
Projekt-Matrix in `playwright.config.ts` pro Testdatei greift, ohne Sonderregistrierung.
Siehe Abschnitt 1, Frage 4 für die Empfehlung, ein künftiges `Desktop Safari`-Projekt (falls
`kopieren-code.md`/`ausschneiden-code.md` es zuerst anlegen) um die `select-all*.spec.ts`-Dateien
zu erweitern, statt ein eigenes anzulegen.

Für den Mobile-/Tablet-Testfall 12 der Anforderung (Touch-Auswahlpopup) gilt dieselbe
Einschränkung wie in `ausschneiden-code.md` Abschnitt 6.2, Testfall 13 bereits dokumentiert:
Playwright kann das native OS-Auswahl-Popup selbst nicht anklicken (es ist Browser-/OS-Chrome,
kein Teil des DOM). Der Test verifiziert stattdessen den zugrunde liegenden Mechanismus
(`ControlOrMeta+a` funktioniert auf `Mobile`/`Tablet` identisch zu `Desktop Chrome`, da alle
über denselben `baseKeymap`-Pfad laufen) und dokumentiert die Popup-Interaktion selbst als
„durch Bibliotheksverhalten abgeleitet, nicht Ende-zu-Ende auf echtem Gerät verifiziert“ — exakt
die in Abnahmekriterium/DoD-Logik bereits etablierte, zulässige Ausnahmeform.

---

## 9. Testplan im Detail

### 9.1 `tests/e2e/select-all.spec.ts` (neu)

Nach dem Vorbild von `selection-regression.spec.ts` (echte Browser-Interaktion,
`.ProseMirror`-Locator, `getByRole`/`getByTitle`, `odtCard`-Helper für „Neu erstellen“).

1. **Basisverhalten (Req-Testfall 1/6.1):** Mehrere Absätze eintippen → `ControlOrMeta+a` →
   `Delete` → `.ProseMirror p` Anzahl = 1 und leer (indirekter Nachweis „wirklich alles
   markiert“, wie in Req Abschnitt 6, Testfall 1 vorgeschlagen).
2. **Leeres Dokument (Grenzfall 1/6.2):** Frisch erstelltes Dokument (nur ein leerer Absatz),
   `ControlOrMeta+a` → kein `pageerror`-Event (Helper wie in `ausschneiden-code.md` §6.2
   eingeführt, hier für diese Datei übernommen/dupliziert, siehe Hinweis unten), danach
   weiterhin tippbar (Text eingeben, sichtbar prüfen).
3. **Idempotenz (Grenzfall 2/6.3):** Zweimal `ControlOrMeta+a` ohne Zwischenaktion → danach
   `Delete` → weiterhin vollständige Löschung, keine Exception, kein doppelter Effekt.
4. **Tabellenzelle (Grenzfall 3/6.4, Frage 2 = (a)):** Tabelle einfügen, Text in zwei Zellen
   eintippen, Cursor in eine Zelle setzen, `ControlOrMeta+a` → `Delete` → **gesamtes**
   Dokument (inkl. der ganzen Tabelle) ist geleert, `.ProseMirror table` Anzahl = 0,
   `.ProseMirror p` Anzahl = 1 (leer) — bestätigt die in Abschnitt 1 getroffene Entscheidung
   als tatsächliches Verhalten, nicht nur als Annahme.
5. **Bild in der Selektion (Grenzfall 4/6.5):** Bild einfügen (über den bestehenden
   „🖼 Bild“-Button mit einer kleinen Test-PNG als Data-URL, analog zum Muster in
   `docx.spec.ts`/`odt.spec.ts`), Text davor/danach eintippen, `ControlOrMeta+a` →
   Ausrichtung „zentriert“ per Toolbar anwenden → kein `pageerror`, Text ist zentriert
   (`getComputedStyle`/Locator-Attribut-Check auf `text-align: center`), `.ProseMirror img`
   Anzahl unverändert (Bild bleibt unversehrt, siehe Abschnitt 2 Zeile 4).
6. **Tippen ersetzt alles (Grenzfall 5/6.6):** Text eingeben → `ControlOrMeta+a` → neuen Text
   tippen → alter Text vollständig weg, nur neuer Text vorhanden, **genau ein** Absatz.
7. **Undo-Neutralität (Grenzfall 8/6.7):** Text „A“ eintippen → Text „B“ eintippen (zweite,
   separate Eingabe/Absatz) → `ControlOrMeta+a` (reine Selektion, keine Folgeaktion) →
   `ControlOrMeta+z` → Ergebnis entspricht dem Zustand **vor** der letzten inhaltlichen
   Änderung (nicht „Auswahl aufgehoben, aber Inhalt unverändert“ als eigener Schritt) —
   konkret: der zuletzt getippte Blockinhalt wird rückgängig gemacht, nicht „nichts passiert“.
8. **IME-Komposition (Grenzfall 9):** `element.dispatchEvent(new CompositionEvent('compositionstart'))`
   während eines aktiven Kompositionszustands `ControlOrMeta+a` auslösen → keine
   `pageerror`-Exception, Editor bleibt in einem konsistenten Zustand (Composition wird vom
   Test danach sauber mit `compositionend` beendet, um keinen hängenden Testzustand zu
   hinterlassen). Dokumentierter Hinweis im Test: Diese Simulation bildet reale IME-Eingabe
   nur näherungsweise nach (echte OS-IME-Interaktion ist mit Playwright nicht auslösbar) —
   analog zur bereits an anderer Stelle akzeptierten Einschränkung für Mobile-Popups.
9. **Fokus außerhalb des Editors (Grenzfall 10):** Fokus in das Textfarbe-`<input type="color">`
   der Toolbar setzen (`page.getByLabel('Textfarbe').focus()`), `ControlOrMeta+a` drücken →
   `.ProseMirror`-Inhalt bleibt unverändert (kein Editor-weiter Select-All-Effekt).
10. **Performance/langes Dokument (Grenzfall 11/6.13):** Per Testskript ca. 300 Absätze
    programmatisch eintippen (`page.keyboard.type` in einer Schleife oder — schneller —
    über wiederholtes `Enter`+kurzer Text), `ControlOrMeta+a` → Zeitmessung
    (`performance.now()` vor/nach `page.keyboard.press`) bestätigt < definierter Schwellenwert
    (z. B. 500 ms), danach `Delete` → `.ProseMirror p` Anzahl = 1 (Nachweis: wirklich bis zum
    Dokumentende erfasst, nicht nur der sichtbare Ausschnitt).
11. **Kontextmenü erreichbar (Req-Testfall 3/Grenzfall 16):**
    ```ts
    const prevented = await editor.evaluate((el) => {
      const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
      el.dispatchEvent(ev)
      return ev.defaultPrevented
    })
    expect(prevented).toBe(false)
    ```
    (identisches Muster wie in `kopieren-code.md` Abschnitt 9 für den analogen Testfall).
12. **Matrix-Testfall (Req-Testfall 12):** Testfälle 1–3 laufen automatisch auf allen drei
    Playwright-Projekten (keine Sonderbehandlung nötig, siehe Abschnitt 8); ergänzender
    Kommentar im Testfile zur Mobile-Popup-Einschränkung (siehe Abschnitt 8).
13. **Cursor-Kollaps nach Strg+A (Abschnitt 2.4):** Mehrere Absätze eintippen,
    `ControlOrMeta+a`, `ArrowLeft` → Cursor am Dokumentanfang (nächster getippter Buchstabe
    erscheint vor dem bisherigen ersten Zeichen); separat: `ControlOrMeta+a`, `ArrowRight` →
    Cursor am Dokumentende (nächster getippter Buchstabe hängt an).

**Hinweis zur Testinfrastruktur:** Der `pageerror`/Konsolen-Fehler-Sammel-Helper wurde bereits
in `ausschneiden-code.md` Abschnitt 6.2 als „erste Einführung dieses Musters“ geplant. Da zum
Zeitpunkt dieser Prüfung weder `ausschneiden-code.md` noch dieser Plan umgesetzt sind, wird
hier empfohlen, den Helper **einmalig** in eine gemeinsame Datei auszulagern (z. B.
`tests/e2e/helpers/consoleErrors.ts`) und aus beiden Spezifikationsdateien zu importieren,
statt ihn zweimal unabhängig zu implementieren — sollte `ausschneiden-code.md` zuerst
umgesetzt werden, übernimmt `select-all.spec.ts` einfach den dort bereits ausgelagerten Helper.

### 9.2 `tests/e2e/select-all-roundtrip.spec.ts` (neu)

Analog zum bestehenden Muster in `docx.spec.ts`/`odt.spec.ts` (Upload/Neu erstellen →
editieren → „Exportieren“ → `page.waitForEvent('download')` → mit `JSZip` den Inhalt der
heruntergeladenen Datei prüfen). Deckt `alles-auswaehlen-req.md` Abschnitt 4.2 ab:

1. **Testfall 1 (DOCX):** Neues Dokument → mehrere Absätze eintippen → `ControlOrMeta+a` →
   „Fett“ per Toolbar → Exportieren → `document.xml` aus dem Zip lesen → **jeder** `<w:r>`
   trägt `<w:b/>` (erster **und** letzter Absatz explizit geprüft, nicht nur ein Absatz).
2. **Testfall 2 (ODT):** Dieselbe Sequenz, `content.xml`, `fo:font-weight="bold"` bzw.
   entsprechendes Automatik-Style-Attribut aus `styleRegistry.ts`.
3. **Testfall 3 (vollständige Löschung, beide Formate):** `ControlOrMeta+a` → `Delete` →
   Exportieren als DOCX **und** als (separat) ODT → Re-Import beider → jeweils eine valide
   Datei mit einem leeren Absatz, kein Parserfehler.
4. **Testfall 4 (Kopieren in neues Dokument):** `ControlOrMeta+a` → `ControlOrMeta+c` →
   zweites, leeres Dokument öffnen (`odtCard`/`docxCard` „Neu erstellen“ ein zweites Mal) →
   einfügen → Struktur (Formatierung/Listen/Tabellen/Bilder) bleibt erhalten → Export/
   Re-Import beider Formate. Nutzt für den Zwischenablage-Zugriff denselben
   `context.grantPermissions(['clipboard-read','clipboard-write'])`-Mechanismus wie
   `kopieren-code.md` Abschnitt 8, nur auf `Desktop Chrome` verlässlich (dort dokumentiert).
5. **Testfall 5 (Tabelle):** Tabelle mit Inhalt importieren/erzeugen → Cursor in Zelle →
   `ControlOrMeta+a` → Fett → Export/Re-Import → Zeilen-/Spaltenzahl unverändert,
   `colspan`/`rowspan` (falls vorhanden) unverändert, Formatierung auch innerhalb der Zellen
   vorhanden.
6. **Testfall 6 (Cross-Format DOCX→ODT):**
   ```ts
   test.fixme(
     true,
     'Blockiert durch fehlende Cross-Format-Export-UI, siehe kopieren-code.md §3.4 / ' +
       'ausschneiden-code.md §3.5 / alles-auswaehlen-code.md §3.3 (derselbe Blocker).',
   )
   ```
7. **Testfall 7 (Cross-Format ODT→DOCX):** Wie 6, `test.fixme(...)`.
8. **Testfall 8 (doppelte Rundreise mit Formatwechsel):** Wie 6, `test.fixme(...)` — hängt
   ebenfalls am selben Blocker.
9. **Testfall 9 (Regressionskette + Export):** Sequenz aus `selection-regression.spec.ts`
   Test 1 (Strg+A → Fett → Klick → Enter → Tippen) **zusätzlich** gefolgt von Export als
   DOCX **und** ODT → Re-Import → beide Absätze aus der Regressionssequenz sind in **beiden**
   Formaten weiterhin vorhanden. Das ist der einzige Testfall, der die bestehende
   Selection-Sync-Fixdatei mit einer echten Datei-Rundreise verkettet (bisher nur im
   laufenden Editor-Zustand geprüft, siehe Anforderung Abschnitt 4.2, Testfall 9).

### 9.3 `tests/e2e/selection-regression.spec.ts` (erweitert, bestehende 3 Tests unverändert)

Neue Tests, exakt nach dem Muster der drei vorhandenen (`odtCard`-Helper, `.ProseMirror`-
Locator), aber mit Ausschneiden bzw. Kopieren statt Fett als auslösendem Zwischenschritt
(Anforderung Abschnitt 2.6, letzter Punkt):

4. **„select-all, cut, click to reposition, Enter, and type — no unintended full wipe“:**
   Text „Hallo, das ist ein Test.“ eintippen → `ControlOrMeta+a` → `ControlOrMeta+x` (nativer
   Cut-Pfad, funktioniert bereits ohne jede Anwendungscode-Änderung, siehe
   `ausschneiden-code.md` Abschnitt 1.4) → Editor ist leer → Klick in den leeren Editor →
   `Enter` (no-op auf leerem Absatz, erlaubt) → tippen „Zweiter Absatz.“ → **nur** „Zweiter
   Absatz.“ ist vorhanden, kein Rest des ausgeschnittenen Textes taucht wieder auf, keine
   Exception. Diese Variante prüft dieselbe Reconciliation wie die bestehenden drei Tests,
   aber mit einer Transaktion, die **den Dokumentinhalt tatsächlich ändert** (im Unterschied
   zu Fett, das nur eine Mark hinzufügt) — deckt damit einen strukturell anderen Codepfad in
   `reconcileSelectionOnClick`/`dispatchTransaction` ab, den die bestehenden drei Tests nicht
   berühren.
5. **„select-all, copy, click to reposition, Enter, and type — both paragraphs must
   survive“:** Text „Hallo, das ist ein Test.“ eintippen → `ControlOrMeta+a` →
   `ControlOrMeta+c` (nativer Copy-Pfad — löst laut `kopieren-code.md` Abschnitt 2 **nie**
   `view.dispatch` aus, die `AllSelection` bleibt im Modell exakt so bestehen wie vor dem
   Kopieren) → Klick zur Neupositionierung → `End` → `Enter` → tippen „Zweiter Absatz.“ →
   **beide** Absätze vorhanden (Text nach Kopieren unverändert + neuer Absatz), analog zu den
   bestehenden drei Tests. Diese Variante ist wichtig, weil Kopieren die interne Selektion
   **überhaupt nicht** verändert (kein `dispatch`-Aufruf) — sie prüft also, dass
   `reconcileSelectionOnClick` (das an `mouseup`, nicht an `dispatchTransaction` hängt) auch
   dann korrekt eingreift, wenn zwischen Strg+A und dem Klick **keine einzige** Transaktion
   stattgefunden hat, nicht nur nach einer formatierenden Transaktion wie Fett.

### 9.4 `src/formats/shared/editor/__tests__/select-all.test.ts` (neu, Vitest/jsdom)

Erste Unit-Test-Datei, die `EditorState.create({ doc, schema: wordSchema, plugins: [history()] })`
direkt aufbaut (bisher kein bestehendes Muster im Repo, siehe Abschnitt 0 — analog zur „ersten
Einführung“ von `commands.test.ts` in `ausschneiden-code.md` Abschnitt 6.1). Deckt die
Bibliotheksgarantien aus Abschnitt 2 ohne echten Browser/EditorView ab:

- `new AllSelection(doc)` über `emptyDocJSON()` wirft nicht, `selection.empty === true` nur
  wenn `doc.content.size === 0` (Nachweis für Grenzfall 1's Ausgangslage).
- `state.tr.setSelection(new AllSelection(state.doc))` hat `tr.steps.length === 0` und
  `tr.docChanged === false` (direkter, browserunabhängiger Beweis für Grenzfall 8/Fund 2).
- Für ein Dokument mit drei Absätzen: `new AllSelection(doc).replace(tr, Slice.empty)`
  (bzw. äquivalent über `deleteSelection`-artige Logik) resultiert in einem Dokument mit
  genau einem leeren Absatz (Nachweis für Grenzfall 1/6/Fund 3), nie in einem Fehler/leerem
  `doc.content`.
- Für ein Dokument, das ausschließlich aus einer `image`-Node besteht: `AllSelection` über
  dieses Dokument lässt sich konstruieren, `setAlign('center')(state, dispatch)` liefert
  `false` (kein anwendbarer Block gefunden) **ohne** zu werfen (Nachweis für Grenzfall 4).
- `new AllSelection(doc).eq(new AllSelection(doc))` ist `true` für zwei unabhängig erzeugte
  Instanzen über denselben `doc` (Nachweis für Grenzfall 2/Idempotenz auf State-Ebene, nicht
  nur per E2E-Beobachtung).

### 9.5 Visueller Kontrast-Check (Req-Testfall 14)

Neu in `select-all.spec.ts` (Abschnitt 9.1) ergänzt, nicht als eigene Datei: Playwright-
Screenshot-Vergleich der `.ProseMirror`-Fläche nach `ControlOrMeta+a` in zwei Durchläufen
(`page.emulateMedia({ colorScheme: 'light' })` und `'dark'`), jeweils
`expect(editorLocator).toHaveScreenshot('select-all-<scheme>.png')`. Erwartung gemäß
Abschnitt 0, Fund 4 (Seite ist immer weiß/Text immer dunkel, unabhängig vom Schema): **beide
Screenshots sollten sich kaum/gar nicht unterscheiden**, weil die editierbare Fläche selbst
nicht auf Dark Mode reagiert — das ist der erwartete, dokumentierte Ausgang dieses Tests
(kein Kontrastfehler zu erwarten), muss aber trotzdem einmal echt beobachtet und die
Baseline-Screenshots müssen bewusst committet/geprüft werden (nicht blind akzeptiert), bevor
der Test als dauerhafter Regressionsschutz gilt.

---

## 10. Grenzfälle-Mapping (`alles-auswaehlen-req.md` Abschnitt 3, vollständig)

| # | Grenzfall | Lösung/Beleg | Test |
|---|---|---|---|
| 1 | Leeres Dokument | `AllSelection` + `doc: 'block+'` (Fund 3) | §9.1 Testfall 2 |
| 2 | Wiederholtes Strg+A | `AllSelection.eq` (Abschnitt 2) | §9.1 Testfall 3, §9.4 |
| 3 | Cursor in Tabellenzelle | Frage 2 = (a), strukturell konsistent (Fund 3) | §9.1 Testfall 4 |
| 4 | Nur-Bild-Dokument | `setAlign` überspringt `image` wirkungslos | §9.1 Testfall 5, §9.4 |
| 5 | Strg+A → Tippen | Standard-Replace-Verhalten, keine Codeänderung | §9.1 Testfall 6 |
| 6 | Strg+A → Entf/Backspace | `AllSelection.replace` (Fund 3) | §9.1 Testfall 1 |
| 7 | Regressionstest-Pflichtfall | Bestehender Fix `reconcileSelectionOnClick`, unverändert | `selection-regression.spec.ts` (3 bestehende + 2 neue Tests, §9.3) |
| 8 | Strg+A → Undo | `tr.steps.length === 0` (Fund 2) | §9.1 Testfall 7, §9.4 |
| 9 | IME-Komposition | Browser-/View-natives Verhalten, keine Codeänderung | §9.1 Testfall 8 |
| 10 | Fokus außerhalb Editor | `prosemirror-keymap` bindet nur auf `view.dom` | §9.1 Testfall 9 |
| 11 | Sehr großes Dokument | `AllSelection`-Konstruktion ist O(1) | §9.1 Testfall 10 |
| 12 | Strg+A → Kopieren/Ausschneiden | Siehe `kopieren-code.md`/`ausschneiden-code.md`, hier nur Verkettung | §9.3 (neue Tests 4/5), §9.2 |
| 13 | Kopf-/Fußzeile/Fußnoten/Kommentare | Existieren nicht als eigene Editor-Instanz (`WordEditor.tsx` lädt nur `doc.content.body`) — außerhalb des Scopes, nur dokumentiert | keiner (zukünftige Abhängigkeit, siehe §13) |
| 14 | Track-Changes-Abhängigkeit | Noch nicht implementiert (Phase 3) — außerhalb des Scopes | keiner (zukünftige Abhängigkeit) |
| 15 | Mehrfach-Strg+A + Zoom/Resize | `createPaginationPlugin()` reagiert auf Layout, nicht auf Selektion; `AllSelection` bleibt bei reiner Neuberechnung ohne Doc-Änderung unangetastet | §9.1 Testfall 10 (implizit, da Performance-Test auch scrollt); optional eigener Zusatztest, falls Kapazität vorhanden |
| 16 | Kein globaler `contextmenu`-Handler | Bestätigt per Grep (Abschnitt 0) | §9.1 Testfall 11 |
| 17 | Datenschutz | Keine Selektions-Telemetrie vorhanden, kein Handlungsbedarf | kein Test nötig (siehe `no-clipboard-logging.test.ts`-Muster aus `kopieren-code.md` als generischer Schutz, falls künftig ergänzt) |

---

## 11. Reihenfolge der Umsetzung

1. `src/formats/shared/editor/__tests__/select-all.test.ts` — schnellste, risikoärmste
   Absicherung zuerst (reine State-/Transform-Prüfungen, kein Browser nötig).
2. `tests/e2e/select-all.spec.ts` — Kernanforderung dieses Tickets (Abschnitt 9.1).
3. `tests/e2e/selection-regression.spec.ts` — zwei neue Tests ergänzen (Abschnitt 9.3); dabei
   **zwingend** die drei bestehenden Tests unverändert lassen und weiterhin grün laufen
   lassen (Pflichtbestandteil laut Anforderung Abschnitt 2.6).
4. `tests/e2e/select-all-roundtrip.spec.ts` — Rundreise-Tests, mit `test.fixme(...)` für die
   drei cross-format-blockierten Fälle (Abschnitt 9.2, Testfälle 6–8).
5. `specs/alles-auswaehlen-req.md` Abschnitt 8 — die vier Entscheidungen aus Abschnitt 1 dieses
   Plans nachtragen, Status **erst nach** grünem Lauf aller Tests aus Schritt 1–4 von „nicht
   vertrauenswürdig“ auf „verifiziert“ heben.
6. Optional (keine Pflicht für dieses Ticket): Kommentar-Ergänzung in `WordEditor.tsx` über
   `keymap(baseKeymap)` (Abschnitt 4.1).

---

## 12. Abnahmekriterien — Abgleich mit `alles-auswaehlen-req.md` Abschnitt 8, Punkt 5

- **„Jeder Testfall aus Abschnitt 1, 3 und 6 als automatisierter, dauerhaft in der Suite
  verbleibender Test existiert und grün ist“** → Abschnitt 9.1/9.4 dieses Plans, Mapping in
  Abschnitt 10.
- **„Die drei bestehenden Selection-Sync-Regressionstests weiterhin grün sind und um die
  Ausschneiden/Kopieren-Variante ergänzt wurden“** → Abschnitt 9.3, Schritt 3 in Abschnitt 11
  garantiert, dass die drei Bestandstests unangetastet bleiben.
- **„Rundreise-Anforderung aus Abschnitt 4 für beide Formate und beide
  Konvertierungsrichtungen nachgewiesen“** → Teilweise: Testfälle 1–5, 9 vollständig
  umsetzbar (Abschnitt 9.2); Testfälle 6–8 (Cross-Format) bleiben **blockiert**, bis der in
  Abschnitt 3.3 referenzierte, fremde Blocker gelöst ist — das ist kein Widerspruch zu diesem
  Plan, sondern eine korrekt dokumentierte Abhängigkeit (analog zu `kopieren-code.md`/
  `ausschneiden-code.md`, die denselben Blocker für ihre jeweiligen Cross-Format-Testfälle
  ebenfalls offen lassen mussten).
- **„Visueller Kontrast-Check durchgeführt und dokumentiert“** → Abschnitt 9.5; erwarteter
  Ausgang bereits durch Codeanalyse (Fund 4) vorhergesagt, muss aber trotzdem einmal real
  beobachtet werden, bevor der Screenshot-Test als Baseline gilt.
- **„Offene Fragen 1–4 beantwortet und in die Datei nachgetragen“** → Abschnitt 1 dieses
  Plans, wörtlich übernehmbar.

---

## 13. Was noch offen bleibt (zurück an `alles-auswaehlen-req.md`/das Backlog zu melden)

- **Frage-3-Koordinationsrisiko (Abschnitt 3.2):** Vier unabhängige Pläne
  (`fett-code.md`, `kursiv-code.md`, `durchgestrichen-code.md`, `unterstrichen-einfach-code.md`)
  ändern potenziell dieselbe neue Funktion in `commands.ts`/dieselbe Zeile in `Toolbar.tsx`
  mit unterschiedlichen Implementierungsdetails. Empfehlung: einen dieser vier Pläne als
  kanonisch bestimmen, bevor mit der Umsetzung eines davon begonnen wird.
- **Cross-Format-Export-UI fehlt weiterhin** (Abschnitt 3.3) — bereits in `kopieren-code.md`
  Abschnitt 3.4 und `ausschneiden-code.md` Abschnitt 3.5 gemeldet, hier zum dritten Mal
  bestätigt unverändert vorgefunden. Blockiert drei Testfälle dieses Tickets zusätzlich zu
  den bereits dort gemeldeten.
- **Fehlendes Default-ProseMirror-CSS** (`.ProseMirror-selectednode` u. Ä., Abschnitt 0,
  Fund 5) — kein Blocker für „Alles auswählen“, aber ein real existierender, bisher
  unentdeckter Darstellungsfehler bei Einzelklick-Bildauswahl. Gehört zu
  `bild-einfuegen-req.md`/`bild-groesse-aendern-req.md`, hier nur zur Kenntnisnahme vermerkt.
- **Kopf-/Fußzeile/Fußnote/Kommentar** (Grenzfall 13) bleibt wie im Anforderungsdokument selbst
  vermerkt zurückgestellt — keine eigene Editor-Instanz vorhanden (`WordEditor.tsx` lädt
  ausschließlich `doc.content.body`).
- **Track-Changes-Abhängigkeit** (Grenzfall 14) — Phase 3, noch nicht umgesetzt, keine Aktion
  in diesem Ticket.
- **Echtes macOS/Cmd+A** bleibt ein offener Punkt, solange kein `Desktop Safari`-Playwright-
  Projekt existiert (Abschnitt 1, Frage 4) — nicht stillschweigend als erledigt zu betrachten.
