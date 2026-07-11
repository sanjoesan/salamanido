# Anforderungsdatei: Feature „Alles auswählen“ (Select All)

Status: **Laut Feature-Backlog „vorhanden“ — gilt als nicht vertrauenswürdig, muss
vollständig verifiziert werden**, bevor der Status im Backlog (`FEATURE-BACKLOG.md`,
Abschnitt 2.5 „Bearbeiten (Suchen & Navigieren)“, Slug `alles-auswaehlen`, Priorität 1)
bestätigt werden darf.

Kurzbeschreibung (Backlog): „Markiert den gesamten Dokumentinhalt.“

Geltungsbereich: Diese Datei konkretisiert für das Einzelfeature „Alles auswählen“, was
`FEATURE-SPEC-DOCX-ODT.md` (Abschnitt 2, „Text-Grundfunktionen“) nur pauschal als
„Auswahl … per Tastatur (Umschalt+Pfeil, Strg+A)“ fordert. Sie gilt für **beide**
unterstützten Formate (DOCX und ODT) über den gemeinsamen ProseMirror-Editor
(`src/formats/shared/editor/WordEditor.tsx`, `src/formats/shared/schema.ts`), da
„Alles auswählen“ eine reine Editor-Operation ist und sich zwischen den Formaten nicht
unterscheiden darf. „Alles auswählen“ selbst verändert kein Dokument und schreibt keine
Datei — die Rundreise-Relevanz ergibt sich ausschließlich daraus, dass die Funktion in
der Praxis fast immer als **Vorstufe** einer weiteren Aktion verwendet wird (formatieren,
löschen, ersetzen, kopieren) und genau dort bereits ein dokumentierter Fehler gefunden
wurde (siehe Abschnitt 0 und 2.6).

**Hinweis zur Aktualität:** Diese Fassung wurde gegen den **tatsächlichen** Code-Stand
verifiziert, **nachdem** die Schwester-Features „Kopieren“ und „Ausschneiden“ umgesetzt
wurden. Eine ältere Fassung dieser Datei beschrieb einen Ist-Stand aus der Zeit davor
(„einziger Test“, „drei Tests“, „kein Desktop-Safari-Projekt“). Diese Aussagen sind
inzwischen **überholt** und wurden hier korrigiert — wer die Vorfassung kennt, lese
Abschnitt 0 und Abschnitt 8 (Frage 4) neu. Das inhaltliche Kernergebnis bleibt
unverändert: „Alles auswählen“ braucht **keinen** eigenen Anwendungscode, nur eine
belastbare, eigenständige Verifikation.

---

## 0. Ist-Stand laut Code-Analyse (Befund vor Verifikation, am aktuellen Stand geprüft)

Geprüft: `src/formats/shared/editor/WordEditor.tsx`, `src/formats/shared/editor/Toolbar.tsx`,
`src/formats/shared/editor/commands.ts`, `src/formats/shared/editor/__tests__/commands.test.ts`,
`src/formats/shared/schema.ts`, `src/formats/shared/editor/pageLayout.ts`, `src/index.css`,
`src/app/DocumentWorkspace.tsx`, `playwright.config.ts`, `tests/e2e/*.spec.ts` (insbesondere
`selection-regression.spec.ts`, `cut.spec.ts`, `clipboard.spec.ts`, `clipboard-roundtrip.spec.ts`
einzeln gegengezählt, nicht nur per Namensmuster überflogen),
`node_modules/prosemirror-commands`, `node_modules/prosemirror-tables`.

- **Kein eigener projekteigener Code-Pfad für „Alles auswählen“ existiert.** Es gibt
  keinen eigenen `selectAll`-Befehl in `commands.ts` (dort stehen `setAlign`,
  `isAlignActive`, `setHeading`, `toggleList`, `liftFromList`, `insertImage`,
  `insertHardBreak`, `insertTable`, `applyMarkColor`, `clearMarkColor`, `canCut`,
  `cutSelection` — **nichts** mit Select-All-Bezug), keinen Toolbar-Button, keinen
  Menüeintrag, kein eigenes Kontextmenü und keine eigene Tastatur-Bindung. Die
  Funktion „existiert“ ausschließlich, weil `WordEditor.tsx` **nach** der projekteigenen
  `keymap({…})` (die u. a. `Mod-z`/`Mod-y`/`Mod-Shift-z`/`Enter`/`Shift-Enter`/`Mod-b`/
  `Mod-i`/`Mod-u`/`Shift-Delete` bindet, **aber kein** `Mod-a`) zusätzlich die
  Bibliotheks-Keymap `baseKeymap` aus `prosemirror-commands` einbindet
  (`keymap(baseKeymap)`), und `baseKeymap` darin unverändert `"Mod-a": selectAll`
  enthält.
- Die Implementierung von `selectAll` (Bibliothekscode
  `node_modules/prosemirror-commands`) ist denkbar simpel:
  `dispatch(state.tr.setSelection(new AllSelection(state.doc)))` — sie erzeugt eine
  `AllSelection`, die **den gesamten im Editor geladenen `body`-Dokumentbaum** als einen
  einzigen, flachen Bereich von Position 0 bis zum Dokumentende markiert. Sie ist
  **nicht** tabellen- oder listen-bewusst: Innerhalb einer Tabellenzelle erzeugt Strg+A
  **sofort das gesamte Dokument** als Selektion, nicht zuerst die Zelle, dann die
  Tabelle, dann das Dokument, wie es Microsoft Word und LibreOffice Writer im
  Mehrfach-Strg+A-Modell tun (siehe Abschnitt 2.2 und Grenzfall 3). `prosemirror-tables`
  (`tableEditing()`/`columnResizing()`) bindet kein `Mod-a` und überschreibt `selectAll`
  nicht — das „sofort ganzes Dokument“-Verhalten ist damit durch Abwesenheit jeder
  Gegen-Bindung **bestätigt**.
- **Es gibt keinen eigenständigen Test, der „Alles auswählen“ als solches prüft**, wohl
  aber inzwischen mehrere Stellen, die Strg+A/`AllSelection` **als Mittel zum Zweck**
  berühren. Zwei unterschiedliche Suchen liefern zwei unterschiedliche, beide relevante
  Zahlen, gegen den aktuellen Code-Stand erneut nachgezählt: Eine Volltextsuche über
  `src/` und `tests/` nach den **Bezeichnern** `AllSelection`/`select-all`/`selectAll`
  liefert **vier** Dateien (unten 1–4); eine Suche nach der tatsächlich **ausgeführten**
  Tastenkombination (`ControlOrMeta+a`, wie Playwright sie auslöst) liefert **zwei
  weitere** Dateien (unten 5–6), die mit der zwischenzeitlich abgeschlossenen
  Kopieren-Umsetzung hinzugekommen sind und Strg+A rein **operativ** nutzen, ohne den
  Bezeichner `AllSelection` je zu erwähnen. Für die Bewertung „kein eigenständiger Test“
  zählt die zweite, größere Zahl (sechs Dateien) — sie belegt, dass Strg+A im gesamten
  Projekt ausschließlich als **Baustein** anderer Tests vorkommt, nie als deren
  eigentlicher Prüfgegenstand:
  1. `src/formats/shared/editor/WordEditor.tsx` — ein **Kommentar**, der den
     Selection-Sync-Bug (siehe unten und Abschnitt 2.6) beschreibt, kein Handler.
  2. `src/formats/shared/editor/__tests__/commands.test.ts` — **ein echter Unit-Test**
     (`'is true for an AllSelection'`), der `new AllSelection(state.doc)` konstruiert und
     gegen `canCut` prüft; die Datei baut `EditorState.create({ doc, schema: wordSchema })`
     bereits direkt auf. Ein neues Select-All-Unit-File wäre also **nicht** das erste
     seiner Art, sondern folgt einem etablierten Muster.
  3. `tests/e2e/selection-regression.spec.ts` — enthält inzwischen **vier** Tests (nicht
     drei), die Strg+A **nur** als Auslöser eines anderen, bereits bekannten Bugs
     benutzen (Selection-Sync-Bug nach Toolbar-Aktion + Klick, siehe unten). Keiner
     verifiziert, dass „Alles auswählen“ selbst korrekt arbeitet (dass wirklich der
     komplette Inhalt markiert wird, dass es in Tabellen/Listen/mit Bildern funktioniert,
     dass es bei leerem Dokument nicht abstürzt). Die vier Tests:
     (a) `select-all, bold, click to reposition, Enter, and type`;
     (b) `same regression inside a table cell`;
     (c) `repeated select-all + bold + click cycles (stress check)`;
     (d) `select-all, bold, copy, click to reposition, type` — **Kopieren-Variante**,
     mit der Kopieren-Umsetzung hinzugekommen.
  4. `tests/e2e/cut.spec.ts` — nutzt Strg+A ebenfalls als Vorstufe (u. a. der
     **Pflicht-Regressionstest** „Tippen → Strg+A → Strg+X → Klick → Enter → weiter
     tippen“ und eine Rundreise „Strg+A → Strg+X → Export → Reimport = gültige leere
     Datei“). Damit ist ein erheblicher Teil der Nachbar-Abdeckung bereits als
     Nebenprodukt der Ausschneiden-Umsetzung vorhanden (siehe Abschnitt 6, Vorabprüfung).
  5. `tests/e2e/clipboard.spec.ts` — mit der Kopieren-Umsetzung hinzugekommen: **19**
     Tests insgesamt, davon **11** mit `ControlOrMeta+a` als Zwischenschritt (u. a.
     Testfall 2/Grenzfall 1 „Strg+C ohne/nach vorheriger Vollauswahl“, die
     Formatierungs-Kombinationstests aus Abschnitt 2.2 „Fett+Farbe+Hervorhebung“ und
     „Überschrift+Absatz+Liste“). Keiner davon behauptet oder prüft, dass die
     Vollauswahl selbst korrekt/vollständig ist — sie wird vorausgesetzt, um „den
     gesamten Inhalt“ überhaupt kopierbar zu machen.
  6. `tests/e2e/clipboard-roundtrip.spec.ts` — ebenfalls mit Kopieren hinzugekommen,
     **8** Vorkommen von `ControlOrMeta+a`, durchweg als Vorbereitungsschritt für eine
     Datei-Rundreise nach Kopieren/Einfügen (Export/Re-Import), nicht als Prüfung von
     „Alles auswählen“ selbst.

  Die Behauptung „kein eigenständiger Test“ ist damit **nicht** dadurch erklärbar, dass
  Strg+A selten vorkäme — im Gegenteil: über sechs Dateien und weit über 25 Testfälle
  hinweg ist es **allgegenwärtig als Hilfsmittel**, aber in keinem einzigen dieser Fälle
  ist „wird wirklich der gesamte Inhalt markiert, korrekt, robust in Tabellen/Listen,
  performant bei langen Dokumenten“ selbst die geprüfte Aussage. Genau diese Lücke soll
  Abschnitt 6 schließen.
- **Kein eigenes visuelles Selektions-Styling:** `src/index.css` enthält keine
  `::selection`-Regel und keine Anpassung für `.ProseMirror-selectednode` o. Ä. (das
  Standard-ProseMirror-CSS aus `prosemirror-view/style/*` bzw. `prosemirror-tables/style/*`
  wird nirgends importiert). Die Selektionsdarstellung nach Strg+A ist vollständig dem
  Browser-Standard überlassen. Die editierbare Seite selbst ist laut `pageLayout.ts`
  (`pageBackgroundStyle()`) **fest hell** und die Textfarbe fest dunkel
  (`.ProseMirror { color: #111827 }`) — **unabhängig** vom App-Theme; nur die Chrome *um*
  die Seite folgt dem Light-/Dark-Theme (`bg-neutral-200 dark:bg-neutral-950`). Das
  Risiko eines unlesbaren Selektionshintergrunds im Dark Mode ist damit gering; der
  visuelle Kontrast-Check (Abschnitt 2.3; Abschnitt 6, Testfall 14) bleibt dennoch
  Pflicht — Bestätigung statt Annahme.
- **Kopf-/Fußzeile, Fußnoten, Kommentare existieren nicht als eigene editierbare
  ProseMirror-Instanz** (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitte 9/11/12; in
  `documentModel.ts` existieren `header`/`footer` zwar als Datenfelder, aber
  `WordEditor.tsx` lädt ausschließlich `doc.content.body` in seine `EditorView`).
  „Alles auswählen“ kann sich damit aktuell **nur auf den Hauptdokumenttext beziehen**
  — das ist kein Fehler von „Alles auswählen“, sondern eine Konsequenz fehlender
  Bereiche, muss aber als Scope-Grenze explizit dokumentiert werden (siehe Abschnitt 3,
  Grenzfall 13).
- Die Toolbar-Aktiv-Anzeige (`MarkButton` in `Toolbar.tsx`) berechnet den „gedrückt“-
  Zustand über `markType.isInSet(view.state.selection.$from.marks())` — bei einer
  `AllSelection` ist `$from` als Anker auf Dokumentposition 0 aufgelöst. Bei einem
  Dokument mit **uneinheitlicher** Formatierung (z. B. nur der erste Absatz ist bereits
  fett, der Rest nicht) zeigt die Toolbar nach Strg+A also den Formatierungszustand
  **nur des allerersten Zeichens**, nicht einen korrekten „gemischt“-Zustand — ein
  bekanntes Verhalten, das laut Entscheidung zu Frage 3 (Abschnitt 8) **nicht** „Alles
  auswählen“ gehört, sondern den Formatierungs-Tickets (`fett`/`kursiv`/`durchgestrichen`/
  `unterstrichen-einfach`); „Alles auswählen“ trägt dazu nur einen
  `AllSelection`-Regressionstest bei (siehe Abschnitt 2.5).
- Der bereits gefundene **Selection-Sync-Bug** ist gefixt: `reconcileSelectionOnClick`
  (in `WordEditor.tsx`, `mousedown`/`mouseup`-Handler mit Klick-/Drag-Schwellwert) sorgt
  dafür, dass ein Klick zur Neupositionierung die Modell-Selektion auf die neue
  Cursor-Position zusammenfaltet. „Alles auswählen“ ist die **auslösende Bedingung**
  dieses Bugs (siehe Abschnitt 2.6).

**Konsequenz für die Bewertung:** Nach der im Backlog selbst definierten Methodik ist
der Status „vorhanden“ auch hier mindestens fragwürdig: Es gibt **keinen eigenen
Code-Pfad**, **keinen entdeckbaren UI-Weg außer der Tastenkombination**, **keinen
gezielten Test der Funktion selbst** (nur ihre Nutzung als Trigger für andere Features/
Bugs) und eine **nicht mit Word/LibreOffice übereinstimmende Tabellen-Semantik**. Diese
Anforderungsdatei legt fest, was erfüllt sein muss, damit „vorhanden“ tatsächlich
zutrifft.

---

## 1. Menüpunkte / Bedienelemente — Soll-Zustand

| # | Zugriffsweg | Ist-Zustand | Soll |
|---|---|---|---|
| 1 | Tastenkombination Strg+A (Windows/Linux) | ProseMirror-`baseKeymap`-Default, funktioniert vermutlich, **nicht gezielt getestet** | Muss mit eigenem, dauerhaftem E2E-Test verifiziert werden (nicht nur als Trigger für den Selection-Sync-Bug mitgetestet). |
| 2 | Tastenkombination Cmd+A (macOS) | Identischer `baseKeymap`-Eintrag (`Mod-a` bindet sich browser-/OS-abhängig auf Strg bzw. Cmd) | Muss identisch zu Strg+A funktionieren; der WebKit-`selectAll`-Codepfad ist über das bestehende Desktop-Safari-Projekt konkret testbar (siehe Abschnitt 8, Frage 4), ein physisches macOS bleibt außerhalb des CI-Scopes. |
| 3 | Rechtsklick-Kontextmenü → „Alles auswählen“ (natives Browser-Menü) | Kein eigenes Kontextmenü implementiert, **kein** `contextmenu`-`preventDefault()` im Anwendungscode (die einzige `contextmenu`-Fundstelle ist ein Kommentar in `WordEditor.tsx`, der die bewusste Abwesenheit dokumentiert) — natives Menü sollte also erreichbar sein | Muss verifiziert werden, dass **kein** App-Handler das native Kontextmenü unterdrückt (Regressionssicherung, siehe Grenzfall 16). Ob das native Menü überhaupt einen „Alles auswählen“-Eintrag zeigt, ist **browser-/OS-/versionsabhängig und nicht garantiert**; fehlt er, ist das eine akzeptierte Browser-Einschränkung, **kein** Produktfehler — der Pflichtweg bleibt die Tastenkombination (Zeile 1). |
| 4 | Toolbar-Button „Alles auswählen“ | **fehlt komplett** | **Entschieden: bewusst nicht vorhanden** — die nativen Wege (Tastenkombination + Kontextmenü) reichen; Word/LibreOffice bieten die Funktion ebenfalls primär so an, nicht als eigenes Toolbar-Icon. Begründung siehe Abschnitt 8, Frage 1. |
| 5 | Anwendungs-Menü „Bearbeiten → Alles auswählen“ | Existiert nicht — Salamanido hat keine eigene Menüleiste, nur die Toolbar | Kein Soll-Element (Menüleiste ist nicht Teil des Produkts), aber diese Abwesenheit ist hier explizit zu dokumentieren, damit sie nicht als vergessene Lücke missverstanden wird (analog `ausschneiden-req.md`). |
| 6 | Dreifach-/Vierfachklick zur schrittweisen Ausweitung der Selektion (Wort → Absatz → Dokument), wie in manchen Textverarbeitungen | Nicht implementiert; Dreifachklick markiert laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 nur den Absatz (ProseMirror-Standard) | Kein Soll-Verhalten für „Alles auswählen“ selbst — wird hier nur zur Abgrenzung erwähnt, damit klar ist, dass „ganzes Dokument markieren“ ausschließlich über Strg+A/Kontextmenü erfolgt, nicht über wiederholte Klicks. |
| 7 | Mobile/Touch: „Alles auswählen“ im systemeigenen Textauswahl-Popup (Android/iOS) | Nicht verifiziert | Auf den in `playwright.config.ts` konfigurierten Projekten „Mobile“ (Pixel 7) und „Tablet“ (iPad Mini) mindestens rudimentär prüfen: Der **zugrunde liegende Mechanismus** (`ControlOrMeta+a` → vollständige Dokumentselektion) funktioniert; das native OS-Auswahl-Popup selbst ist Browser-/OS-Chrome und mit Playwright nicht anklickbar — das ist dokumentiert, nicht als Lücke zu werten (analog `cut.spec.ts`). |
| 8 | Programmatischer Aufruf durch die Anwendung selbst (z. B. beim Öffnen eines Dialogs automatisch den gesamten Text vormarkieren) | Nicht vorhanden, nicht vorgesehen | Bewusst **kein** Soll-Verhalten — „Alles auswählen“ wird ausschließlich durch explizite Nutzer:innen-Aktion ausgelöst, nie automatisch durch die App selbst. |

**Testfälle**
1. Strg+A im Editor mit vorhandenem Inhalt → gesamter sichtbarer Text ist optisch als
   markiert erkennbar (Selektionshintergrund über alle Absätze hinweg); indirekt
   nachweisbar durch anschließendes Löschen (Editor komplett leer).
2. Cmd+A auf Desktop-WebKit (über das Desktop-Safari-Projekt, siehe Abschnitt 8,
   Frage 4) analog; „echtes physisches macOS/Cmd+A“ als dokumentierten Rest-offenen
   Punkt führen, nicht stillschweigend als erledigt markieren.
3. Rechtsklick → natives Kontextmenü öffnet sich (kein `defaultPrevented`); falls ein
   „Alles auswählen“-Eintrag vorhanden ist, funktioniert er identisch zu Strg+A.
4. Tablet-/Mobile-Viewport: `ControlOrMeta+a` → gesamter Inhalt markiert; Popup-Grenze
   dokumentiert.
5. Für Punkt 4 der Tabelle ist die Entscheidung getroffen und nachgetragen (kein
   eigener Button, Abschnitt 8, Frage 1) — keine kommentarlose Lücke.

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Aktivierungsbedingungen
- „Alles auswählen“ ist **immer** auslösbar, unabhängig vom aktuellen Selektions-
  oder Cursorzustand: bei leerem Cursor, bei bestehender Teilselektion, bei bereits
  aktiver `AllSelection` (erneutes Strg+A ist ein No-Op — bleibt bei vollständiger
  Selektion, siehe Grenzfall 2), innerhalb einer Tabellenzelle, innerhalb einer Liste,
  direkt nach dem Einfügen eines Bildes.
- Es gibt **keinen** deaktivierten Zustand (im Gegensatz zu Ausschneiden/Kopieren, die
  bei leerer Selektion sinnvollerweise inaktiv sind — vgl. `disabled={!canCut(view.state)}`
  am Ausschneiden-Button) — „Alles auswählen“ funktioniert auch dann, wenn das Dokument
  komplett leer ist (Grenzfall 1).

### 2.2 Was genau markiert wird
- Der gesamte Inhalt des aktuell im Editor geladenen `body`-Dokumentbaums: alle
  Absätze, Überschriften, Listen (inkl. aller Ebenen), Tabellen (inkl. aller Zeilen/
  Spalten/verbundenen Zellen mit ihrem gesamten Zellinhalt), Bilder, `hard_break`-
  Zeilenumbrüche, Tab-Zeichen — nichts wird ausgeklammert.
- **Tabellen-Sonderfall (entschiedenes Soll-Verhalten):** Die aktuelle Implementierung
  (`AllSelection`) markiert bei einem Strg+A **innerhalb einer Tabellenzelle sofort
  das gesamte Dokument**, nicht zunächst nur die Zelle oder nur die Tabelle. Word und
  LibreOffice Writer kennen ein gestuftes Verhalten (1. Strg+A: Zelle, 2. Strg+A:
  Tabelle, 3. Strg+A: Dokument). **Entschieden (Abschnitt 8, Frage 2): (a)** — das
  „sofort gesamtes Dokument“-Verhalten ist das endgültige Soll (entspricht dem
  Ist-Zustand, kein Zusatzcode), weil ein gestuftes Verhalten der Idempotenz-Anforderung
  aus Grenzfall 2 widerspräche und einen eigenen Zustandsautomaten erforderte.
- **Kopf-/Fußzeile, Fußnoten, Kommentare:** Da diese laut `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitte 9/11/12 aktuell keine eigene, gleichzeitig mit dem Haupttext aktive
  ProseMirror-Instanz besitzen, bezieht sich „Alles auswählen“ ausschließlich auf den
  Hauptdokumenttext. Sobald diese Bereiche eine eigene editierbare Instanz erhalten,
  ist explizit festzulegen, ob ein in der Kopf-/Fußzeile ausgelöstes Strg+A nur die
  Kopf-/Fußzeile selbst markiert (wahrscheinlich korrektes Verhalten, analog zu
  Word/LibreOffice, wo Kopf-/Fußzeile ein eigener Editier-Kontext ist) oder ob es den
  Haupttext mit einschließt (nicht erwünscht) — als Nachtrag vorzumerken (Grenzfall 13).

### 2.3 Sichtbare Darstellung der Selektion
- Die Selektion muss über das **gesamte** Dokument hinweg optisch klar erkennbar sein
  — auch über mehrere Seiten hinweg (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8,
  mehrseitige Anzeige), über Tabellenzellen hinweg, und als sichtbare Hervorhebung eines
  vollständig mitmarkierten Bildes innerhalb der `AllSelection` (Anmerkung: Da kein
  Standard-ProseMirror-CSS eingebunden ist, hat `.ProseMirror-selectednode` keine
  visuelle Wirkung — ein per Einzelklick als eigene `NodeSelection` markiertes Bild
  bekäme also keine Rahmen-Hervorhebung; das betrifft aber **Einzelklick-Bildauswahl**
  und gehört den Bild-Tickets, nicht „Alles auswählen“, weil eine `AllSelection` das
  Bild als Teil des Range mit dem nativen Selektionshintergrund erfasst).
- Da kein eigenes `::selection`-Styling existiert (siehe Abschnitt 0), muss verifiziert
  werden, dass der **Browser-Standard-Selektionshintergrund** ausreichend Kontrast
  zum Lesen bietet — kein Fall, in dem markierter Text unlesbar wird. Die editierbare
  Seite ist laut `pageLayout.ts` **fest hell** und die Textfarbe fest dunkel
  (`#111827`) — unabhängig vom App-Theme; nur die Chrome *um* die Seite wechselt mit
  Light/Dark. Das Risiko eines unlesbaren Selektionshintergrunds ist damit gering; der
  visuelle Kontrast-Check (Abschnitt 6, Testfall 14) bleibt aber Pflicht und ist in
  **beiden** Theme-Einstellungen durchzuführen (Annahme bestätigen, nicht voraussetzen).
- Auf sehr langen Dokumenten (mehrere Bildschirmhöhen) muss nach Strg+A erkennbar
  sein, dass **wirklich das gesamte** Dokument markiert ist, nicht nur der sichtbare
  Ausschnitt (z. B. durch Scrollen prüfen, dass die Markierung bis zum Dokumentende
  reicht, oder indirekt durch anschließendes vollständiges Löschen).

### 2.4 Cursor-/Fokuszustand nach „Alles auswählen“
- Der Editor bleibt fokussiert; die Selektion ist eine echte `AllSelection`, kein
  kollabierter Cursor.
- Unmittelbar folgende Eingabe muss sich konsistent verhalten (siehe 2.6): Tippen
  ersetzt den gesamten markierten Inhalt durch das neu Getippte (Standard-Editor-
  Konvention), Entf/Backspace löscht den gesamten Inhalt, Pfeiltasten kollabieren die
  Selektion an den jeweiligen Rand (Anfang bei Pfeil-links/Pos1, Ende bei
  Pfeil-rechts/Ende), ohne Fehler oder unerwartete Sprünge.

### 2.5 Zusammenspiel mit Formatierungs-Toolbar
- Eine Formatierungsaktion (Fett, Kursiv, Ausrichtung, Formatvorlage, Farbe usw.) auf
  eine `AllSelection` muss auf **jeden** Textlauf/Absatz im gesamten Dokument wirken,
  auch über Absatz-, Listen- und Tabellenzellgrenzen hinweg — nicht nur auf den ersten
  oder letzten betroffenen Block. (`setAlign` etwa iteriert `nodesBetween` über den
  ganzen Selektionsbereich und überspringt Bilder wirkungslos, ohne zu werfen.)
- **Zu klärender Punkt (Toolbar-Zustandsanzeige):** Steht nach Strg+A der
  Formatierungszustand in einem Dokument mit **uneinheitlicher** Formatierung (z. B.
  nur ein Absatz ist bereits fett) an, zeigt die Toolbar aktuell den Zustand nur des
  allerersten Zeichens (`$from.marks()` bei Position 0, siehe Abschnitt 0) statt eines
  korrekten „gemischt“-/„teilweise aktiv“-Zustands. **Entscheidung (Abschnitt 8, Frage 3):**
  Diese Diskrepanz gehört **nicht** zu „Alles auswählen“, sondern ist ein querschnittliches
  Toolbar-Thema der Tickets `fett`/`kursiv`/`durchgestrichen`/`unterstrichen-einfach`
  (dieselbe Zeile in `Toolbar.tsx`, die nur `$from.marks()` auswertet). „Alles auswählen“
  trägt dazu ausschließlich einen Regressionstest bei, der sicherstellt, dass die dortige
  Korrektur auch für eine echte `AllSelection` (nicht nur eine partielle `TextSelection`)
  greift — es ist also ein tatsächlicher Fix an anderer Stelle, keine hier akzeptierte
  Einschränkung.

### 2.6 Interaktion mit dem bekannten Selection-Sync-Bug
- `FEATURE-SPEC-DOCX-ODT.md` (Abschnitt 2 und 20) beschreibt einen bereits gefundenen
  Fehler: Nach einer Toolbar-Aktion auf eine `AllSelection`, gefolgt von einem Klick
  zur Neupositionierung, blieb die interne ProseMirror-Selektion veraltet auf der
  `AllSelection` stehen, sodass nachfolgende Eingaben (Enter, Tippen) ungewollt den
  gesamten Inhalt ersetzten. Der Fix (`reconcileSelectionOnClick` in `WordEditor.tsx`,
  `mousedown`/`mouseup`-Handler mit Drag-Schwellwert) ist vorhanden.
- **„Alles auswählen“ ist die auslösende Bedingung dieses Bugs** — jede Änderung an der
  `selectAll`-Bindung, der Toolbar oder der `mouseup`-Reconciliation muss zwingend
  gegen die bestehenden Regressionstests laufen. Der Bug ist bereits mehrfach abgedeckt:
  - `tests/e2e/selection-regression.spec.ts` — **vier** Tests (Basissequenz,
    Tabellen-Variante, Stress-Test mit vier Wiederholungen, **Kopieren-Variante**
    `select-all, bold, copy, …`).
  - `tests/e2e/cut.spec.ts` — der **Pflicht-Regressionstest** mit **Ausschneiden**
    (Strg+X) als Zwischenschritt (Tippen → Strg+A → Strg+X → Klick → Enter → weiter
    tippen).
  Diese Tests sind **Pflichtbestandteil** und müssen grün bleiben; „Alles auswählen“
  ergänzt sie **nicht** durch Duplikate, sondern durch Tests, die **„Alles auswählen“
  selbst** statt nur die Folgeaktion prüfen (siehe Abschnitt 6).
- **Verbleibende, noch nicht literal abgedeckte Variante:** „Strg+A → Kopieren **ohne**
  vorheriges Fett → Klick → Enter → tippen“ (prüft, dass Kopieren die Selektion **ganz
  ohne** dazwischenliegende dokumentändernde Transaktion nicht perturbiert). Das ist ein
  Near-Duplicate der bereits vorhandenen Kopieren-Variante (mit Fett) und der
  Ausschneiden-Pflichtvariante; nur anzulegen, falls literale Wortlautdeckung gefordert
  wird — sonst als „durch die vorhandenen vier + `cut.spec.ts` abgedeckt“ zu
  dokumentieren, nicht kommentarlos zu überspringen.

### 2.7 Barrierefreiheit / Wahrnehmbarkeit
- „Alles auswählen“ nutzt die native ProseMirror-/`contenteditable`-Selektion; ob und wie
  assistive Technologien (Screenreader) die entstandene Vollselektion ansagen, hängt von
  Browser und Hilfsmittel ab und wird nicht gesondert instrumentiert. Das ist eine bewusst
  akzeptierte Einschränkung, solange keine konkrete Barriere gemeldet wird — hier
  dokumentiert, nicht stillschweigend übergangen.
- Die Selektion darf **nicht ausschließlich** über Farbe erkennbar sein; da ihre
  Darstellung dem Browser-Standard überlassen ist (Abschnitt 2.3), ist im visuellen
  Kontrast-Check (Abschnitt 6, Testfall 14) mitzuprüfen, dass markierter Text lesbar bleibt.
- Wird Frage 1 (Abschnitt 8) je zugunsten eines eigenen Bedienelements revidiert, muss
  dieses ein aussagekräftiges `aria-label` („Alles auswählen“) tragen und per Tastatur
  fokussier- und auslösbar sein (analog zu den bestehenden Toolbar-Buttons, die alle
  `aria-label`/`aria-pressed` setzen).

---

## 3. Grenzfälle

1. **Leeres Dokument:** Strg+A auf einem komplett leeren Dokument (ein einzelner
   leerer Absatz) → keine Fehlermeldung, keine Konsolen-Exception, Editor bleibt
   bedienbar; die resultierende `AllSelection` über ein leeres Dokument darf keine
   nachfolgende Aktion (z. B. Tippen) zum Absturz bringen.
2. **Wiederholtes Strg+A:** Erneutes Strg+A, während bereits eine `AllSelection`
   aktiv ist → bleibt idempotent bei vollständiger Selektion (`AllSelection.eq` liefert
   `true` gegen eine andere `AllSelection`), keine Fehler, keine sichtbare Änderung.
3. **Cursor innerhalb einer Tabellenzelle:** Strg+A markiert sofort das **gesamte**
   Dokument inkl. der gesamten Tabelle, nicht nur die Zelle. Dieses „sofort ganzes
   Dokument“-Verhalten ist als bewusstes Soll bestätigt (Abschnitt 8, Frage 2,
   Entscheidung (a)); das gestufte Word/LibreOffice-Verhalten wird **nicht** nachgebaut.
   In jedem Fall darf das Ergebnis nicht strukturell inkonsistent sein (keine kaputte
   Tabelle nach nachfolgender Aktion) — durch `AllSelection.replace` in Kombination mit
   dem Schema-Constraint `doc: 'block+'` strukturell bereits garantiert.
4. **Dokument, das ausschließlich aus einem einzelnen Bild besteht** (kein Text):
   Strg+A markiert das Bild als Teil der `AllSelection`; eine anschließende
   Formatierungsaktion (z. B. Ausrichtung) darf nicht abstürzen, auch wenn sie auf
   ein Bild „wirkungslos“ angewendet wird (`setAlign` liefert dann `false`, ohne zu
   werfen).
5. **Strg+A unmittelbar gefolgt von Tippen:** Ersetzt den kompletten Inhalt durch das
   neu Getippte — das ist **gewolltes** Standardverhalten (wie in jeder
   Textverarbeitung), kein Bug; muss aber durch einen expliziten Test bestätigt sein,
   damit es nicht mit dem Selection-Sync-Bug (Abschnitt 2.6) verwechselt wird, bei dem
   genau dieses Verhalten **ungewollt** nach einem Klick auftrat.
6. **Strg+A unmittelbar gefolgt von Entf/Backspace:** Löscht den gesamten Inhalt,
   Editor bleibt in einem gültigen Zustand (mindestens ein leerer Absatz, weiterhin
   tippbar; `AllSelection.replace` + `doc: 'block+'` garantieren das) — analog zur
   `AllSelection`-Anforderung aus `ausschneiden-req.md`.
7. **Strg+A, danach Toolbar-Aktion, danach Klick zur Neupositionierung, danach
   Enter/Tippen (Pflicht-Regressionstest):** Siehe Abschnitt 2.6 — beide
   ursprünglichen Textteile müssen erhalten bleiben, keine unbeabsichtigte
   Komplettlöschung/-ersetzung. Bereits abgedeckt durch `selection-regression.spec.ts`
   (4 Tests) und `cut.spec.ts` (Ausschneiden-Pflichtvariante).
8. **Strg+A, danach Undo:** Da „Alles auswählen“ selbst **keine** Dokumentänderung
   ist, darf es **keinen** eigenen Eintrag in der Undo-Historie erzeugen. Strukturell
   erzwungen: `selectAll`s Transaktion hat `tr.steps.length === 0`, `prosemirror-history`
   verwirft solche Transaktionen (`if (tr.steps.length == 0) return history`). Strg+Z
   nach reinem Strg+A (ohne nachfolgende inhaltliche Aktion) muss also auf die zuletzt
   tatsächlich inhaltliche Änderung wirken, nicht auf „Auswahl rückgängig machen“.
9. **Strg+A während einer aktiven IME-Komposition** (z. B. ostasiatische
   Eingabemethoden mit noch nicht bestätigtem Text): kein Abbruch der Komposition in
   einem inkonsistenten Zwischenzustand, keine korrupte Selektion (Verhalten
   browserabhängig, nur per Test annäherbar).
10. **Fokus liegt nicht im Editor** (z. B. Cursor gerade in einem Toolbar-Eingabefeld
    wie dem Farbwähler-`<input type=color>` oder im Datei-Upload-Dialog): Ein systemweites
    Strg+A darf **nicht** versehentlich Editor-Inhalt markieren, wenn der Editor gar nicht
    fokussiert ist — die Keymap ist nur auf `view.dom` registriert, sodass stattdessen das
    native Verhalten des tatsächlich fokussierten Elements greift.
11. **Sehr großes/langes Dokument** (mehrere Seiten, viele Bilder/Tabellen): Strg+A
    muss in vertretbarer Zeit abschließen (`AllSelection`-Konstruktion ist O(1) — zwei
    `resolve`), UI darf nicht spürbar einfrieren, auch beim anschließenden Scrollen durch
    die vollständig markierte Strecke.
12. **Strg+A, danach Kopieren/Ausschneiden:** Ergebnis muss dem in `kopieren-req.md`
    geforderten „Strg+A → Kopieren“-Fall entsprechen (gesamter Inhalt landet vollständig
    und mit korrekter Formatierung in der Zwischenablage) bzw. dem in `ausschneiden-req.md`
    beschriebenen `AllSelection`-Ausschneide-Verhalten (gesamtes Dokument wird geleert,
    Editor bleibt gültig). Beide Basisfälle sind über `clipboard*.spec.ts`/`cut.spec.ts`
    bereits abgedeckt.
13. **Kopf-/Fußzeile/Fußnoten/Kommentare (zukünftig, sobald implementiert):** Sobald
    diese Bereiche gemäß `FEATURE-SPEC-DOCX-ODT.md` Abschnitte 9/11/12 eine eigene
    editierbare ProseMirror-Instanz erhalten, muss explizit festgelegt werden, ob ein
    dort ausgelöstes Strg+A sich auf den jeweiligen Bereich beschränkt oder den
    Haupttext einschließt (siehe Abschnitt 2.2) — für den aktuellen
    Verifikationsauftrag **nicht** im Scope, aber hier als bekannte künftige
    Abhängigkeit dokumentiert.
14. **Track-Changes-Abhängigkeit (zukünftig, Phase 3, aktuell nicht umgesetzt):**
    Sobald Änderungsverfolgung existiert (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13),
    muss geklärt werden, ob eine `AllSelection` bereits als Einfügung/Löschung
    markierte Bereiche mit einschließt und wie sich eine anschließende Aktion (z. B.
    „Alles auswählen“ + „Alle Änderungen annehmen“) dazu verhält — für den aktuellen
    Auftrag nicht im Scope, hier nur als Vormerkung.
15. **Mehrfach-Strg+A ohne Zwischenaktion, gefolgt von Browser-Zoom oder
    Fenstergrößenänderung** (Layout-Neuberechnung durch die Seitenansicht/Pagination,
    `createPaginationPlugin()`): Die Selektion darf durch eine reine Layout-Neuberechnung
    nicht verloren gehen oder in einen inkonsistenten Zustand geraten (das Plugin reagiert
    auf Layout, nicht auf die Selektion).
16. **Rechtsklick-Kontextmenü wird durch kein globales Event-Handling der App
    verdeckt** (aktuell kein globaler `contextmenu`-`preventDefault`-Handler — nur ein
    dokumentierender Kommentar; als Dauerzustand regressionssichern, analog
    `kopieren-req.md`/`ausschneiden-req.md`).
17. **Datenschutz:** „Alles auswählen“ selbst überträgt keine Daten (siehe
    README-Datenschutzprinzip: kein Server, kein `localStorage`/`IndexedDB`) — es gibt
    keinen Grund, dies gesondert zu prüfen, solange keine eigene Logging-/
    Telemetrie-Funktion für Selektionsereignisse existiert; als Code-Review-Punkt
    vermerkt, falls künftig Interaktionstelemetrie eingeführt wird.

---

## 4. Rundreise-Anforderung (DOCX **und** ODT)

„Alles auswählen“ selbst schreibt keine Datei — die Rundreise-Anforderung bezieht sich
darauf, dass **eine mit „Alles auswählen“ als Zwischenschritt durchgeführte Aktion**
(formatieren, löschen, ersetzen, kopieren/einfügen) beim anschließenden Export/Re-Import
zu demselben Ergebnis führt wie dieselbe Aktion ohne den Umweg über Strg+A. Das ist
strukturell gegeben, weil Strg+A ausschließlich die **Selektion** ändert, nie den
Dokumentbaum — Reader/Writer (`src/formats/docx/*`, `src/formats/odt/*`) sehen exakt
dasselbe ProseMirror-Dokument. Die Rundreisen sind dennoch zu **beweisen**, nicht nur zu
behaupten.

Für **beide** Formate (DOCX und ODT) und für **beide** Import-Richtungen (Datei war
ursprünglich DOCX, Datei war ursprünglich ODT) gilt:

### 4.1 Baseline (Voraussetzung, damit „Alles auswählen“-Rundreisen aussagekräftig sind)
1. Datei A (DOCX oder ODT) hochladen → **unverändert** (ohne jede Strg+A-Aktion)
   exportieren → Re-Import → Inhalt entspricht exakt A. *(Allgemeine
   Rundreise-Anforderung aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3/19 — als
   Ausgangs-Invariante bestätigen.)*

### 4.2 „Alles auswählen“-spezifische Rundreise — Testfälle
1. Datei A (DOCX) importieren bzw. neu erstellen → mehrere Absätze → Strg+A →
   einheitliche Formatierung (z. B. Fett) anwenden → als DOCX exportieren → Re-Import →
   **jeder** Absatz/Textlauf im gesamten Dokument trägt die Formatierung, keiner wurde
   übersprungen (insbesondere **erster und letzter** Block, Tabellenzellinhalte,
   Listenpunkte). Dies ist die **select-all-eigene Kernrundreise** — Ausschneiden testet
   nur Lösch-Rundreisen, nicht „Formatierung über alles“.
2. Dieselbe Sequenz für ODT (Strg+A → Formatierung → Export als ODT → Reimport;
   `fo:font-weight="bold"` bzw. das entsprechende Auto-Style).
3. Datei A → Strg+A → **Entf** (Entf-Taste, nicht Strg+X — das ist die
   select-all-eigene Variante gegenüber der bereits vorhandenen Strg+X-Rundreise in
   `cut.spec.ts`) → als DOCX **und** als ODT exportieren → Re-Import → Ergebnis ist
   jeweils eine valide Datei mit einem leeren Absatz (analog `FEATURE-SPEC-DOCX-ODT.md`
   Abschnitt 1.1, Testfall 2).
4. Datei A → Strg+A → Kopieren → in ein **neues, leeres** Dokument einfügen → dieses
   neue Dokument als DOCX **und** als ODT exportieren → Re-Import → vollständige
   Struktur (Formatierung, Listen, Tabellen, Bilder) bleibt erhalten (analog
   `kopieren-req.md`). Clipboard-Rechte sind für `Desktop Chrome`/`Mobile` projektweit
   gewährt (`permissions: ['clipboard-read','clipboard-write']`), verlässlich nur auf
   Chromium.
5. Datei mit Tabelle → Cursor in eine Zelle → Strg+A (markiert das gesamte Dokument,
   siehe Abschnitt 2.2 und Grenzfall 3) → Formatierung anwenden → exportieren →
   reimportieren → Tabellenstruktur bleibt vollständig konsistent (keine verlorenen
   Zeilen/Spalten/`colspan`/`rowspan`), Formatierung liegt auch innerhalb der Zellen
   korrekt vor.
6. Cross-Format: Datei A war DOCX → Strg+A → Formatierung/Löschen/Kopieren-Einfügen
   → als ODT exportieren → reimportieren → Inhalt bleibt konsistent
   (Formatierungsverluste durch Cross-Format-Konvertierung sind gemäß
   `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19 zu dokumentieren, Textverlust nicht).
7. Cross-Format umgekehrt: Datei A war ODT → Strg+A → Aktion → Ziel-Export DOCX.
8. Doppelte Rundreise (Format-Wechsel hin und zurück) an einem Dokument, an dem
   zuvor via „Alles auswählen“ eine Aktion durchgeführt wurde: DOCX → Editor
   (Strg+A + Aktion) → ODT → Editor → DOCX → Inhalt bleibt nach zwei Konvertierungen
   weiterhin identisch zum erwarteten Zustand.
9. Regressionstest-Verkettung: Strg+A → Formatierung → Klick zur Neupositionierung →
   Enter → weiter tippen (Selection-Sync-Pflichtsequenz, siehe Abschnitt 2.6) →
   **danach zusätzlich** als DOCX **und** ODT exportieren → reimportieren → beide
   Absätze aus dem Regressionstest sind unabhängig vom nachfolgenden Export/Import
   weiterhin beide vorhanden (bislang nur im laufenden Editor-Zustand geprüft, nicht
   über eine anschließende Datei-Rundreise).

### 4.3 Bekannte Abhängigkeit: Cross-Format-Export (blockiert Testfälle 6–8)
Die Testfälle 6, 7 und 8 aus 4.2 setzen voraus, dass eine Datei **unabhängig vom
Ursprungsformat** sowohl als DOCX als auch als ODT exportiert werden kann (Cross-Format-Export,
gefordert in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3). Dieser „Exportieren als …“-Weg
existiert im aktuellen Stand **nicht**: `src/app/DocumentWorkspace.tsx::handleExport` ruft
ausschließlich `module.exportFile(snapshot.content, snapshot.fileName)` im beim Öffnen
gebundenen **Ursprungsformat** auf. Die Cross-Format-Rundreisen für „Alles auswählen“ sind
damit **nicht durch „Alles auswählen“ selbst blockiert**, sondern durch diese fehlende,
produktweite Export-Fähigkeit (derselbe Blocker wie bei Kopieren/Ausschneiden).
Konsequenz: Die Testfälle 4.2 #6/#7/#8 sind als `test.fixme` mit Verweis auf diesen Blocker zu
führen (nicht kommentarlos zu überspringen). Ergänzend — wie es `cut.spec.ts` bereits
vorlebt — ist je ein **Same-Format**-Ersatztest (z. B. ODT → Strg+A → Aktion → als ODT
exportieren) plus der reine Reader/Writer-Anteil (Cross-Format-Konvertierung ohne UI) über
Unit-Tests abzusichern, sodass die Konvertierungslogik trotz UI-Blocker nachgewiesen bleibt.
Sobald der Cross-Format-Export existiert, sind #6/#7/#8 zu aktivieren. Diese Abhängigkeit ist
explizit dokumentiert, damit ein Fehlschlag nicht fälschlich „Alles auswählen“ zugeschrieben
wird.

---

## 5. Menü-/Bedienelement-Übersicht (Soll-Zustand, kompakt)

| # | Element | Aktueller Zustand | Soll |
|---|---|---|---|
| 1 | Strg+A / Cmd+A | funktioniert über `prosemirror-commands`-`baseKeymap`-Default, **nur indirekt getestet** (als Trigger für andere Features/Bugs) | eigener, dauerhafter E2E-Test, der „Alles auswählen“ selbst prüft (siehe Abschnitt 6) |
| 2 | Natives Rechtsklick-Kontextmenü „Alles auswählen“ | funktioniert vermutlich, **ungetestet**; kein App-Handler unterdrückt es | verifizieren, dass kein `contextmenu`-`preventDefault` es unterdrückt (Regressionssicherung) |
| 3 | Toolbar-Button „Alles auswählen“ | fehlt | **Entschieden: kein eigener Button** — native Wege (Tastenkombination/Kontextmenü) genügen (Abschnitt 8, Frage 1) |
| 4 | Mobile/Touch-Auswahlpopup „Alles auswählen“ | ungetestet | auf „Mobile“/„Tablet“-Playwright-Projekten den zugrunde liegenden Mechanismus prüfen; Popup-Grenze dokumentieren |
| 5 | Tabellen-Sonderverhalten (sofort ganzes Dokument statt gestuft Zelle→Tabelle→Dokument) | Ist-Zustand „sofort ganzes Dokument“ (ProseMirror-Default) | **Entschieden: (a) sofort ganzes Dokument** als endgültiges Soll (Abschnitt 8, Frage 2) |
| 6 | Toolbar-Zustandsanzeige bei uneinheitlicher Formatierung nach Strg+A | zeigt nur den Zustand des allerersten Zeichens (`$from.marks()`) | **Nicht dieses Ticket:** Zuständigkeit der Formatierungs-Tickets; „Alles auswählen“ liefert nur einen `AllSelection`-Regressionstest (Abschnitt 8, Frage 3) |
| 7 | Dauerhafter Regressionstest Selection-Sync-Bug × Alles auswählen | vorhanden: `selection-regression.spec.ts` (**4 Tests**) + `cut.spec.ts` (Ausschneiden-Pflichtvariante) | bleibt Pflichtbestandteil; wird um „Alles auswählen selbst“-Tests ergänzt (nicht ersetzt) |
| 8 | Eigenständiger Test für „Alles auswählen“ (unabhängig vom Selection-Sync-Bug) | **fehlt komplett** | muss neu geschrieben werden, siehe Abschnitt 6 |

---

## 6. Testfälle (Zusammenfassung, E2E-Fokus)

**Vorabprüfung (Pflicht vor dem Schreiben neuer Tests):** Ein erheblicher Teil der
geforderten Verifikation ist seit der Kopieren-/Ausschneiden-Umsetzung bereits als
Nebenprodukt vorhanden. **Vor** dem Anlegen jedes neuen Tests ist gegenzuprüfen, ob er
nicht schon durch `cut.spec.ts`, `clipboard.spec.ts`, `clipboard-roundtrip.spec.ts` oder
`selection-regression.spec.ts` abgedeckt ist, um Duplikate zu vermeiden.

| Anforderung | Bereits abgedeckt durch | Verbleibende select-all-eigene Lücke |
|---|---|---|
| Grenzfall 7: Strg+A → **Ausschneiden** → Klick → Enter → tippen | `cut.spec.ts` (Pflicht-Regressionstest) | **keine** — nicht duplizieren |
| Grenzfall 7: Strg+A → **Kopieren** → Klick → Enter → tippen | `selection-regression.spec.ts` Test 4 (`…, bold, copy, …`) | nur „Kopieren **ohne** vorheriges Fett“ literal offen (marginal, Abschnitt 2.6) |
| Grenzfall 6 / §4.2 #3: Strg+A → Löschen → valider leerer Zustand + Export | `cut.spec.ts` (Strg+X-Variante + leere-Datei-Rundreise) | nur die **Entf-Taste** (statt Strg+X) als Auslöser |
| Grenzfall 10: Fokus im Farbwähler, systemweites Strg+X/A ändert Editor nicht | `cut.spec.ts` (Farbwähler-Fokus, Strg+X) | **Strg+A**-Analogon (Testfall 9 unten) |
| Grenzfall 12: Strg+A → Kopieren/Ausschneiden (Basis) | `clipboard*.spec.ts`/`cut.spec.ts` | Verkettung mit Datei-Rundreise (§4.2 #4/#9) |
| §4.2 #1/#2: Strg+A → **Formatierung über alles** → Export | — | **vollständig offen** (Kern, Testfälle 10/11 unten) |
| §1/§6: „Strg+A markiert wirklich **alles**“ als eigenständige Behauptung | — (überall nur Trigger) | **vollständig offen** (Kern, Testfall 1 unten) |

Neue Tests analog zum Playwright-Aufbau in `selection-regression.spec.ts`/`cut.spec.ts`
(echte Browser-Interaktion über `page.keyboard`, `.ProseMirror`-Locator, `odtCard`-Helper,
`watchForConsoleErrors`, der `settle`/`waitForTimeout(50)`-Umgang mit dem asynchronen
`selectionchange`-Rennen — keine isolierten Command-Aufrufe):

1. Mehrzeiligen/mehrabsätzigen Text eingeben, Strg+A → gesamter Text ist markiert
   (verifizierbar z. B. durch anschließendes `Delete` → genau ein leerer Absatz).
2. Strg+A auf leerem Dokument → keine Konsolen-/`pageerror`-Exception, Editor bleibt
   bedienbar.
3. Strg+A zweimal hintereinander ohne Zwischenaktion → weiterhin vollständige
   Selektion, keine Fehler (Idempotenz).
4. Dokument mit Tabelle: Cursor in eine Zelle, Strg+A, danach `Delete` → **gesamtes**
   Dokument (nicht nur die Zelle) ist geleert (`.ProseMirror table` = 0,
   `.ProseMirror p` = 1) — bestätigt das in Abschnitt 2.2/Grenzfall 3 als Soll (a)
   entschiedene Verhalten (Abgrenzung zu `cut.spec.ts`, wo Strg+X **ohne** Strg+A nur die
   Zelle leert).
5. Dokument mit Bild (über den `🖼 Bild`-Button eingefügt): Strg+A, danach Ausrichtung
   „zentriert“ per Toolbar → kein `pageerror`, Text (falls vorhanden) wird zentriert,
   `.ProseMirror img` unversehrt.
6. Strg+A, danach Tippen → gesamter vorheriger Inhalt wird durch den neuen Text
   ersetzt (gewolltes Verhalten, siehe Grenzfall 5).
7. Strg+A, danach Strg+Z (ohne nachfolgende inhaltliche Aktion) → Undo wirkt auf die
   letzte tatsächliche Inhaltsänderung, nicht auf „Auswahl rückgängig machen“
   (Grenzfall 8). Prüft die Undo-**Neutralität** von Strg+A selbst.
8. IME-Komposition: `compositionstart` dispatchen, dann Strg+A, sauber mit
   `compositionend` beenden → kein `pageerror` (Grenzfall 9; nähert reale IME nur an).
9. Fokus außerhalb des Editors (Farbwähler-`<input type=color>` fokussiert) → Strg+A →
   `.ProseMirror`-Inhalt unverändert (Grenzfall 10; Strg+A-Analogon zur bereits
   vorhandenen Strg+X-Prüfung in `cut.spec.ts`).
10. Strg+A → Fett über alles → Export nach DOCX → **jeder** `<w:r>` trägt `<w:b/>`,
    erster und letzter Absatz explizit geprüft (§4.2 #1).
11. Wie 10, aber Export nach ODT (§4.2 #2).
12. Strg+A auf allen ohne Sonderkonfiguration laufenden Projekten (`Desktop Chrome`,
    `Mobile`/Pixel 7, `Tablet`/iPad Mini) → Kernverhalten (Punkte 1–3) funktioniert auf
    jedem Projekt; nach der `testMatch`-Erweiterung (Abschnitt 8, Frage 4) zusätzlich auf
    `Desktop Safari`/`Desktop Firefox`.
13. Sehr langes Dokument (mehrere Bildschirmhöhen, per Testskript erzeugt, z. B. ~300
    Absätze): Strg+A mit `performance.now()`-Messung unter einem Schwellenwert; Markierung
    reicht nachweislich bis zum Dokumentende (`Delete` → `.ProseMirror p` = 1).
14. Visueller Kontrast-Check der Selektionsdarstellung in Light- **und** Dark-Mode
    (`emulateMedia({ colorScheme })` + `toHaveScreenshot`). Erwartung (Abschnitt 0/2.3):
    beide Screenshots nahezu identisch, weil die Editierfläche nicht auf Dark Mode
    reagiert — Baseline bewusst prüfen und committen, nicht blind akzeptieren.
15. Kontextmenü erreichbar: `contextmenu`-Event dispatchen →
    `expect(ev.defaultPrevented).toBe(false)` (Grenzfall 16 / Abschnitt 1, Testfall 3).
16. Cursor-Kollaps (Abschnitt 2.4): Strg+A, `ArrowLeft` → Cursor am Anfang; separat
    `ArrowRight` → Cursor am Ende (jeweils über den nächsten getippten Buchstaben geprüft).

Ergänzend zur E2E-Ebene sind die Bibliotheksgarantien browserunabhängig als **Vitest-Unit-
Tests** abzusichern (dem bestehenden Muster aus `commands.test.ts` folgend, das bereits
`EditorState.create({ doc, schema: wordSchema })` aufbaut und `AllSelection` testet):
`new AllSelection(doc)` wirft nicht; `tr.setSelection(new AllSelection(doc))` hat
`tr.steps.length === 0`/`tr.docChanged === false` (Grenzfall 8); Löschen über die
`AllSelection` ergibt genau einen leeren Absatz (Grenzfall 1/6); `setAlign('center')` auf
einem Nur-Bild-Dokument liefert `false` ohne zu werfen (Grenzfall 4);
`new AllSelection(doc).eq(new AllSelection(doc)) === true` (Grenzfall 2).

---

## 7. Testmatrix — Zusammenfassung

| Bereich | Unit-Test | E2E-Test | Rundreise-Test (DOCX/ODT) |
|---|---|---|---|
| Basis-Verhalten (gesamter Inhalt markiert, leeres Dokument, Idempotenz) | fehlt (Muster aus `commands.test.ts` vorhanden) | **fehlt komplett — muss neu gebaut werden** | n/a |
| Strg+A / Cmd+A als Tastenkombination | fehlt | fehlt (nur indirekt über Selection-Sync-/Clipboard-Tests genutzt) | n/a |
| Tabellen-Sonderverhalten (Zelle vs. gesamtes Dokument) | fehlt | fehlt | fehlt |
| Bild in der Selektion | teils (`commands.test.ts` Nur-Bild-`canCut`) | fehlt | fehlt |
| Toolbar-Zustandsanzeige bei uneinheitlicher Formatierung | fehlt | fehlt (gehört Formatierungs-Tickets) | n/a |
| Undo-Neutralität von „Alles auswählen“ | fehlt | fehlt | n/a |
| Selection-Sync-Regression × Alles auswählen | **`commands.test.ts` (AllSelection × canCut)** | **vorhanden: `selection-regression.spec.ts` (4 Tests) + `cut.spec.ts` (Ausschneiden-Pflicht)** | n/a |
| Formatierung über alles → Rundreise | fehlt | fehlt | **fehlt (Kernlücke)** |
| Cross-Format-Rundreise nach Strg+A + Aktion | teils (Reader/Writer) | fehlt (durch Export-Blocker, §4.3) | fehlt |
| Mobile/Tablet-Verhalten | n/a | fehlt | n/a |
| Visueller Kontrast der Selektion (Light/Dark) | n/a | fehlt | n/a |
| Performance auf langen Dokumenten | n/a | fehlt | n/a |

**Fazit:** Der Backlog-Status „vorhanden“ stützt sich ausschließlich auf implizites
`prosemirror-commands`-Standardverhalten (`baseKeymap`-Eintrag `Mod-a`) und wird
bislang nur indirekt getestet — als Trigger für andere Features/Bugs (Selection-Sync,
Kopieren, Ausschneiden), nicht als eigenständig verifizierte Funktion. Es gibt außerdem
einen konkreten, dokumentierten Verhaltensunterschied zu Word/LibreOffice bei Tabellen
(kein gestuftes Zelle→Tabelle→Dokument-Verhalten). Bevor der Status auf „verifiziert“
gesetzt werden darf, müssen mindestens die Testfälle aus den Abschnitten 1, 3 und 6 als
echte, im Browser laufende Playwright-Tests existieren (bzw. die bereits vorhandene
Abdeckung nachweislich abdecken) und die in Abschnitt 8 getroffenen Entscheidungen
(Frage 1–4) umgesetzt bzw. bestätigt sein.

---

## 8. Entscheidungen zu den (vormals offenen) Fragen und Abnahmekriterien (Definition of Done)

Die vier ursprünglich offenen Punkte wurden in der PO-/Dev-Abstimmung entschieden
(Begründungen deckungsgleich mit `alles-auswaehlen-code.md` und übernommen im QA-Plan
`alles-auswaehlen-qa.md`). Die Entscheidungen sind **bindend** für die Umsetzungs- und
Testarbeit; der Backlog-Status bleibt bis zum Abschluss der Verifikation (Punkt 5) dennoch
„nicht vertrauenswürdig“.

1. **Frage:** Wird ein sichtbarer Toolbar-Button für „Alles auswählen“ ergänzt, oder bleibt es
   bei ausschließlich nativen Wegen (Tastenkombination + Kontextmenü)?
   **Entscheidung: Nein, kein eigener Button.** „Alles auswählen“ hat laut Abschnitt 2.1
   bewusst keinen deaktivierten Zustand — ein Button wäre immer aktiv und böte keinen
   zusätzlichen Zustand/kein zusätzliches Feedback gegenüber der universellen
   Tastenkombination. Word/LibreOffice bieten die Funktion primär über Tastenkombination +
   (Kontext-)Menü an, nicht als eigenes Symbolleisten-Icon; Salamanido hat keine Menüleiste
   (Abschnitt 1, Punkt 5). Konsistent mit der Entscheidung für „Kopieren“, abweichend von
   „Ausschneiden“ (das wegen seines deaktivierten, destruktiven Charakters einen Button
   erhält — sichtbar als `disabled={!canCut(view.state)}` in `Toolbar.tsx`). Konsequenz:
   keine Änderung an `Toolbar.tsx`. Bei späterer Umkehr gilt Abschnitt 1, Punkt 4 (Button
   ohne „aktiv“-Zustand, SVG-Icon, `aria-label`).
2. **Frage:** Wird das „sofort gesamtes Dokument“-Verhalten innerhalb von Tabellen als Soll
   übernommen, oder das gestufte Word/LibreOffice-Verhalten (Zelle → Tabelle → Dokument bei
   mehrfachem Strg+A) nachgebaut?
   **Entscheidung: (a) — „sofort gesamtes Dokument“ ist das endgültige Soll.** Es entspricht
   dem ProseMirror-Standard, erfordert keinen Zusatzcode und ist mit Grenzfall 2 (Idempotenz
   wiederholter Strg+A) vereinbar; ein gestuftes Verhalten würde ihr widersprechen und einen
   eigenen, zustandsbehafteten Automaten erfordern. Bindend für Abschnitt 3, Grenzfall 3, und
   Abschnitt 6, Testfall 4.
3. **Frage:** Wird die Toolbar-Zustandsanzeige bei uneinheitlicher Formatierung nach Strg+A auf
   einen korrekten „gemischt“-Zustand erweitert, oder bleibt die Vereinfachung (Zustand des
   ersten Zeichens) bestehen?
   **Entscheidung: Nicht Bestandteil dieses Features.** Ursache ist die Zeile in `Toolbar.tsx`
   (`markType.isInSet(view.state.selection.$from.marks())` in `MarkButton`), die nur `$from`
   auswertet — ein querschnittliches Thema der Tickets
   `fett`/`kursiv`/`durchgestrichen`/`unterstrichen-einfach`. „Alles auswählen“ fügt keine
   fünfte, abweichende Implementierung hinzu, sondern nur einen Regressionstest: Sobald eines
   dieser Tickets landet, muss die Korrektur nachweislich auch für eine echte `AllSelection`
   (nicht nur `TextSelection`) greifen. `AllSelection` erbt `ranges`/`from`/`to` aus der
   Basisklasse, sodass jede über `ranges`/`from`/`to` (statt allein `$from`) gebaute Korrektur
   automatisch auch für die Vollselektion greift. Damit ist dies **kein** „bewusst
   akzeptierter Mangel“, sondern ein Fix außerhalb dieses Tickets. Nachgetragen in
   Abschnitt 2.5.
4. **Frage:** Ist Safari/WebKit bzw. macOS (Cmd+A) Teil der Test-/Browsermatrix?
   **Entscheidung: Konkret umsetzbar (aktualisiert gegenüber der Vorfassung).** Die
   Vorfassung stufte dies als „offen, bis ein Desktop-Safari-Projekt existiert“ ein. Dieses
   Projekt **existiert inzwischen**: `playwright.config.ts` enthält `Desktop Safari (Clipboard)`
   **und** `Desktop Firefox (Clipboard)`, beide gescoped auf `testMatch: /clipboard.*\.spec\.ts/`.
   Sie erfassen `select-all*.spec.ts` daher **noch nicht** automatisch. Empfohlene konkrete
   Änderung: die `testMatch`-Regex **beider** Clipboard-Projekte auf
   `/(clipboard|select-all).*\.spec\.ts/` erweitern (kein neues Projekt anlegen — das
   verdoppelte CI-Laufzeit für dasselbe Gerät). Dann läuft der Tastatur-Kern von
   `select-all.spec.ts` (Strg/Cmd+A, Idempotenz, Tippen-ersetzt-alles) zusätzlich auf echtem
   **Desktop**-WebKit und Desktop-Firefox — nicht mehr nur touch-emuliert über `Tablet` (iPad
   Mini → WebKit). Damit ist „macOS/Cmd+A“ so weit abgedeckt, wie es in dieser Umgebung möglich
   ist; ein **physischer** Apple-Rechner bleibt außerhalb des CI-Scopes und ist als
   dokumentierter Rest-offener Punkt zu führen, nicht stillschweigend als erledigt zu markieren
   (Abschnitt 1, Testfall 2). Wird die `testMatch`-Erweiterung nicht gewünscht, bleibt „echtes
   Desktop-macOS/Cmd+A“ vollständig offen.
5. Diese Spezifikation gilt erst als erfüllt, wenn:
   - jeder Testfall aus Abschnitt 1, 3 und 6 als automatisierter, dauerhaft in der
     Suite verbleibender Test existiert und grün ist — **soweit nicht bereits** durch
     `cut.spec.ts`/`clipboard*.spec.ts`/`selection-regression.spec.ts` abgedeckt (Abschnitt 6,
     Vorabprüfung); vorhandene Abdeckung ist zu **referenzieren**, nicht zu duplizieren,
     die Lücke (Basisverhalten + Formatier-Rundreise) ist neu zu bauen,
   - die vier bestehenden Selection-Sync-Regressionstests **und** der Ausschneiden-
     Pflichtregressionstest in `cut.spec.ts` weiterhin grün sind (die literale „Kopieren-ohne-
     Fett“-Ergänzung aus Abschnitt 2.6 ist optional),
   - die Rundreise-Anforderung aus Abschnitt 4 für **beide** Formate (DOCX und ODT)
     und **beide** Konvertierungsrichtungen nachgewiesen ist, soweit nicht durch die in
     Abschnitt 4.3 dokumentierte Cross-Format-Export-Abhängigkeit blockiert (blockierte
     Fälle als `test.fixme` mit Blocker-Verweis + Same-Format-Ersatz/Unit-Test, nicht
     kommentarlos übersprungen),
   - der visuelle Kontrast-Check aus Abschnitt 6, Testfall 14 in Light- **und** Dark-Mode
     durchgeführt und dokumentiert ist,
   - die Entscheidungen zu Frage 1–4 (oben) unverändert umgesetzt sind bzw. eine Abweichung
     ausdrücklich neu freigegeben wurde (Frage 4 insbesondere: `testMatch`-Erweiterung oder
     dokumentierter offener Punkt).
   Erst dann darf der Backlog-Eintrag `alles-auswaehlen` von „nicht vertrauenswürdig“
   auf „verifiziert“ wechseln.
