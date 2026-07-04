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
wurde (siehe Abschnitt 0).

---

## 0. Ist-Stand laut Code-Analyse (Befund vor Verifikation)

Geprüft: `src/formats/shared/editor/WordEditor.tsx`, `src/formats/shared/editor/Toolbar.tsx`,
`src/formats/shared/editor/commands.ts`, `src/index.css`, `tests/e2e/*.spec.ts`,
`node_modules/prosemirror-commands`, `node_modules/prosemirror-tables`.

- **Kein einziger projekteigener Code-Pfad für „Alles auswählen“ existiert.** Es gibt
  keinen eigenen `selectAll`-Befehl in `commands.ts`, keinen Toolbar-Button, keinen
  Menüeintrag, kein eigenes Kontextmenü und keine eigene Tastatur-Bindung. Die
  Funktion „existiert“ ausschließlich, weil `WordEditor.tsx` die Bibliotheks-Keymap
  `baseKeymap` aus `prosemirror-commands` einbindet (`keymap(baseKeymap)`, Zeile 80),
  und `baseKeymap` darin unverändert `"Mod-a": selectAll` enthält (siehe
  `node_modules/prosemirror-commands/dist/index.js`).
- Die Implementierung von `selectAll` ist denkbar simpel: `dispatch(state.tr.setSelection(new AllSelection(state.doc)))`
  — sie erzeugt eine `AllSelection`, die **den gesamten ProseMirror-Dokumentbaum** (den
  gerade im Editor sichtbaren `body`, siehe unten) als einen einzigen, flachen Bereich
  von Position 0 bis zum Dokumentende markiert. Sie ist **nicht** tabellen- oder
  listen-bewusst: Innerhalb einer Tabellenzelle erzeugt Strg+A **sofort das gesamte
  Dokument** als Selektion, nicht zuerst die Zelle, dann die Tabelle, dann das Dokument,
  wie es Microsoft Word und LibreOffice Writer im Mehrfach-Strg+A-Modell tun (siehe
  Abschnitt 2.2 und Grenzfall 3).
- Der einzige bestehende Test, der Strg+A überhaupt anfasst, ist
  `tests/e2e/selection-regression.spec.ts`. Er verwendet „Alles auswählen“ jedoch nur
  als **Mittel zum Zweck**, um einen anderen, bereits bekannten Bug zu reproduzieren
  (Selection-Sync-Bug nach Toolbar-Aktion + Klick, siehe `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 2/20.2) — er verifiziert an keiner Stelle, dass „Alles auswählen“ selbst
  korrekt arbeitet (z. B. dass wirklich der komplette Inhalt markiert wird, dass es in
  Tabellen/Listen/mit Bildern funktioniert, dass es bei leerem Dokument nicht abstürzt).
  Eine Suche nach „select-all“, „selectAll“, „AllSelection“ außerhalb dieses einen
  Kommentar-/Testkontexts liefert keinen weiteren Treffer im Repository.
- **Kein eigenes visuelles Selektions-Styling:** `src/index.css` enthält keine
  `::selection`-Regel und keine Anpassung für `.ProseMirror-selectednode` o. Ä. Die
  Selektionsdarstellung nach Strg+A ist vollständig dem Browser-Standard überlassen —
  ungeprüft, ob sie im Light- **und** Dark-Mode-Seitenhintergrund (siehe
  `pageBackgroundStyle()`) ausreichend Kontrast bietet.
- **Kopf-/Fußzeile, Fußnoten, Kommentare existieren nicht als eigene editierbare
  ProseMirror-Instanz** (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitte 9/11/12 sowie
  `documentModel.ts`, in dem `header`/`footer` zwar als Datenfelder existieren, aber
  `WordEditor.tsx` ausschließlich `doc.content.body` in seine `EditorView` lädt).
  „Alles auswählen“ kann sich damit aktuell **nur auf den Hauptdokumenttext beziehen**
  — das ist kein Fehler von „Alles auswählen“, sondern eine Konsequenz fehlender
  Bereiche, muss aber als Scope-Grenze explizit dokumentiert werden (siehe Abschnitt 3,
  Grenzfall 13).
- Die Toolbar-Aktiv-Anzeige (`MarkButton` in `Toolbar.tsx`) berechnet den „gedrückt“-
  Zustand über `view.state.selection.$from.marks()` — bei einer `AllSelection` ist
  `$from` als Anker auf Dokumentposition 0 aufgelöst. Bei einem Dokument mit
  **uneinheitlicher** Formatierung (z. B. nur der erste Absatz ist bereits fett, der
  Rest nicht) zeigt die Toolbar nach Strg+A also den Formatierungszustand **nur des
  allerersten Zeichens**, nicht einen korrekten „gemischt“-Zustand — ein bekanntes,
  bisher nicht spezifiziertes Verhalten, das in Abschnitt 2.5 als zu klärender Punkt
  aufgenommen wird.

**Konsequenz für die Bewertung:** Nach der im Backlog selbst definierten Methodik ist
der Status „vorhanden“ auch hier mindestens fragwürdig: Es gibt **keinen eigenen
Code-Pfad**, **keinen entdeckbaren UI-Weg außer der Tastenkombination**, **keinen
gezielten Test der Funktion selbst** (nur ihre Nutzung als Trigger für einen anderen
Bug) und eine **nicht mit Word/LibreOffice übereinstimmende Tabellen-Semantik**. Diese
Anforderungsdatei legt fest, was erfüllt sein muss, damit „vorhanden“ tatsächlich
zutrifft.

---

## 1. Menüpunkte / Bedienelemente — Soll-Zustand

| # | Zugriffsweg | Ist-Zustand | Soll |
|---|---|---|---|
| 1 | Tastenkombination Strg+A (Windows/Linux) | ProseMirror-`baseKeymap`-Default, funktioniert vermutlich, **nicht gezielt getestet** | Muss mit eigenem, dauerhaftem E2E-Test verifiziert werden (nicht nur als Trigger für den Selection-Sync-Bug mitgetestet). |
| 2 | Tastenkombination Cmd+A (macOS) | Identischer `baseKeymap`-Eintrag (`Mod-a` bindet sich browser-/OS-abhängig auf Strg bzw. Cmd) | Muss identisch zu Strg+A funktionieren; falls CI/Testumgebung kein echtes macOS abdeckt, als offenen Punkt dokumentieren (analog `kopieren-req.md` Abschnitt 1). |
| 3 | Rechtsklick-Kontextmenü → „Alles auswählen“ (natives Browser-Menü) | Kein eigenes Kontextmenü implementiert, kein `contextmenu`-`preventDefault()` im Projekt gefunden — natives Menü sollte also erreichbar sein | Muss verifiziert werden: Rechtsklick im Editor zeigt das native Kontextmenü mit funktionierendem „Alles auswählen“-Eintrag (Chromium-Browser bieten diesen Eintrag üblicherweise auf `contenteditable`-Flächen an). |
| 4 | Toolbar-Button „Alles auswählen“ | **fehlt komplett** | Nicht zwingend erforderlich für „vorhanden“-Status (Word/LibreOffice bieten dies primär über Tastenkombination + Menü an, seltener als eigener Toolbar-Button), aber zu entscheiden: entweder ergänzen oder in dieser Spezifikation explizit als „bewusst nicht vorhanden, native Wege reichen“ dokumentieren — siehe Abschnitt 8, offene Frage 1. |
| 5 | Anwendungs-Menü „Bearbeiten → Alles auswählen“ | Existiert nicht — Salamanido hat keine eigene Menüleiste, nur die Toolbar | Kein Soll-Element (Menüleiste ist nicht Teil des Produkts), aber diese Abwesenheit ist hier explizit zu dokumentieren, damit sie nicht als vergessene Lücke missverstanden wird (analog `ausschneiden-req.md` Abschnitt 1, Punkt 5). |
| 6 | Dreifach-/Vierfachklick zur schrittweisen Ausweitung der Selektion (Wort → Absatz → Dokument), wie in manchen Textverarbeitungen | Nicht implementiert; Dreifachklick markiert laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 nur den Absatz (ProseMirror-Standard) | Kein Soll-Verhalten für „Alles auswählen“ selbst — wird hier nur zur Abgrenzung erwähnt, damit klar ist, dass „ganzes Dokument markieren“ ausschließlich über Strg+A/Kontextmenü erfolgt, nicht über wiederholte Klicks. |
| 7 | Mobile/Touch: „Alles auswählen“ im systemeigenen Textauswahl-Popup (Android/iOS) | Nicht verifiziert | Auf den in `playwright.config.ts` konfigurierten Projekten „Mobile“ (Pixel 7) und „Tablet“ (iPad Mini) mindestens rudimentär prüfen: Text per Touch selektierbar, „Alles auswählen“ aus dem Popup verfügbar und führt zu vollständiger Dokumentselektion. |
| 8 | Programmatischer Aufruf durch die Anwendung selbst (z. B. beim Öffnen eines Dialogs automatisch den gesamten Text vormarkieren) | Nicht vorhanden, nicht vorgesehen | Bewusst **kein** Soll-Verhalten — „Alles auswählen“ wird ausschließlich durch explizite Nutzer:innen-Aktion ausgelöst, nie automatisch durch die App selbst. |

**Testfälle**
1. Strg+A im Editor mit vorhandenem Inhalt → gesamter sichtbarer Text ist optisch als
   markiert erkennbar (Selektionshintergrund über alle Absätze hinweg).
2. Cmd+A auf macOS analog (falls Testumgebung es zulässt; sonst als offenen Punkt
   dokumentieren, siehe Abschnitt 8).
3. Rechtsklick → Kontextmenü öffnet sich, „Alles auswählen“ ist vorhanden und
   funktioniert identisch zu Strg+A.
4. Tablet-/Mobile-Viewport: Text per Touch selektieren, „Alles auswählen“ aus dem
   nativen Auswahl-Popup verwenden → gesamter Inhalt markiert.
5. Für Punkt 4 der Tabelle: Entscheidung treffen und in dieser Datei nachtragen
   (Toolbar-Button ja/nein), keine kommentarlose Lücke.

---

## 2. Gewünschtes Verhalten im Detail

### 2.1 Aktivierungsbedingungen
- „Alles auswählen“ ist **immer** auslösbar, unabhängig vom aktuellen Selektions-
  oder Cursorzustand: bei leerem Cursor, bei bestehender Teilselektion, bei bereits
  aktiver `AllSelection` (erneutes Strg+A ist ein No-Op — bleibt bei vollständiger
  Selektion, siehe Grenzfall 2), innerhalb einer Tabellenzelle, innerhalb einer Liste,
  direkt nach dem Einfügen eines Bildes.
- Es gibt **keinen** deaktivierten Zustand (im Gegensatz zu Ausschneiden/Kopieren, die
  bei leerer Selektion sinnvollerweise inaktiv sind) — „Alles auswählen“ funktioniert
  auch dann, wenn das Dokument komplett leer ist (Grenzfall 1).

### 2.2 Was genau markiert wird
- Der gesamte Inhalt des aktuell im Editor geladenen `body`-Dokumentbaums: alle
  Absätze, Überschriften, Listen (inkl. aller Ebenen), Tabellen (inkl. aller Zeilen/
  Spalten/verbundenen Zellen mit ihrem gesamten Zellinhalt), Bilder, `hard_break`-
  Zeilenumbrüche, Tab-Zeichen — nichts wird ausgeklammert.
- **Tabellen-Sonderfall (zu klärendes Soll-Verhalten):** Die aktuelle Implementierung
  (`AllSelection`) markiert bei einem Strg+A **innerhalb einer Tabellenzelle sofort
  das gesamte Dokument**, nicht zunächst nur die Zelle oder nur die Tabelle. Word und
  LibreOffice Writer kennen ein gestuftes Verhalten (1. Strg+A: Zelle, 2. Strg+A:
  Tabelle, 3. Strg+A: Dokument). Diese Spezifikation legt fest: **Für Salamanido ist
  das gestufte Verhalten kein Blocker-Anforderung** — es muss aber explizit
  entschieden und dokumentiert werden, ob (a) das aktuelle „sofort alles“-Verhalten
  als bewusstes, abweichendes Soll übernommen wird, oder (b) das gestufte
  Word/LibreOffice-Verhalten nachgebaut werden soll. Bis zur Entscheidung gilt (a) als
  vorläufiges Soll, da es dem aktuellen Ist-Zustand entspricht und keinen
  zusätzlichen Code erfordert — siehe Abschnitt 8, offene Frage 2.
- **Kopf-/Fußzeile, Fußnoten, Kommentare:** Da diese laut `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitte 9/11/12 aktuell keine eigene, gleichzeitig mit dem Haupttext aktive
  ProseMirror-Instanz besitzen, bezieht sich „Alles auswählen“ ausschließlich auf den
  Hauptdokumenttext. Sobald diese Bereiche eine eigene editierbare Instanz erhalten,
  ist explizit festzulegen, ob ein in der Kopf-/Fußzeile ausgelöstes Strg+A nur die
  Kopf-/Fußzeile selbst markiert (wahrscheinlich korrektes Verhalten, analog zu
  Word/LibreOffice, wo Kopf-/Fußzeile ein eigener Editier-Kontext ist) oder ob es den
  Haupttext mit einschließt (nicht erwünscht) — als Nachtrag vorzumerken.

### 2.3 Sichtbare Darstellung der Selektion
- Die Selektion muss über das **gesamte** Dokument hinweg optisch klar erkennbar sein
  — auch über mehrere Seiten hinweg (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8,
  mehrseitige Anzeige), über Tabellenzellen hinweg, und als sichtbarer Rahmen/
  Hervorhebung um ein vollständig mitmarkiertes Bild (`NodeSelection`-artige
  Darstellung innerhalb der `AllSelection`).
- Da kein eigenes `::selection`-Styling existiert (siehe Abschnitt 0), muss verifiziert
  werden, dass der **Browser-Standard-Selektionshintergrund** sowohl im Light- als
  auch im Dark-Mode-Seitenhintergrund (`pageBackgroundStyle()`) ausreichend Kontrast
  zum Lesen bietet — kein Fall, in dem markierter Text unlesbar wird (z. B. weißer
  Text auf hellblauem Standard-Selektionshintergrund im Dark Mode).
- Auf sehr langen Dokumenten (mehrere Bildschirmhöhen) muss nach Strg+A erkennbar
  sein, dass **wirklich das gesamte** Dokument markiert ist, nicht nur der sichtbare
  Ausschnitt (z. B. durch Scrollen prüfen, dass die Markierung bis zum Dokumentende
  reicht).

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
  oder letzten betroffenen Block.
- **Zu klärender Punkt (Toolbar-Zustandsanzeige):** Steht nach Strg+A der
  Formatierungszustand in einem Dokument mit **uneinheitlicher** Formatierung (z. B.
  nur ein Absatz ist bereits fett) an, zeigt die Toolbar aktuell den Zustand nur des
  allerersten Zeichens (`$from.marks()` bei Position 0, siehe Abschnitt 0) statt eines
  korrekten „gemischt“-/„teilweise aktiv“-Zustands. Diese Spezifikation fordert: Diese
  Diskrepanz muss entweder behoben werden (z. B. Prüfung, ob die Formatierung über die
  **gesamte** Selektion hinweg konsistent ist, sonst Anzeige als „nicht eindeutig
  aktiv“, analog zu Word/LibreOffice) oder als bewusst akzeptierte Einschränkung mit
  Begründung dokumentiert werden — siehe Abschnitt 8, offene Frage 3.

### 2.6 Interaktion mit dem bekannten Selection-Sync-Bug
- `FEATURE-SPEC-DOCX-ODT.md` (Abschnitt 2 und 20) beschreibt einen bereits gefundenen
  Fehler: Nach einer Toolbar-Aktion auf eine `AllSelection`, gefolgt von einem Klick
  zur Neupositionierung, blieb die interne ProseMirror-Selektion veraltet auf der
  `AllSelection` stehen, sodass nachfolgende Eingaben (Enter, Tippen) ungewollt den
  gesamten Inhalt ersetzten. Der Fix (`reconcileSelectionOnClick` in
  `WordEditor.tsx`, `mouseup`-Handler) ist vorhanden und durch
  `tests/e2e/selection-regression.spec.ts` abgedeckt.
- **„Alles auswählen“ ist die auslösende Bedingung dieses Bugs** — jede Änderung an der
  `selectAll`-Bindung, der Toolbar oder der `mouseup`-Reconciliation muss zwingend
  gegen die drei bestehenden Tests in `selection-regression.spec.ts` regressionsgetestet
  werden (Basissequenz, Tabellen-Variante, Stress-Test mit vier Wiederholungen). Diese
  Datei übernimmt diese drei Tests als **Pflichtbestandteil** der Verifikation von
  „Alles auswählen“, ergänzt sie aber um Tests, die **„Alles auswählen“ selbst** statt
  nur die Folgeaktion prüfen (siehe Abschnitt 6).
- Zusätzlich zu prüfen: Alles auswählen → **Ausschneiden/Kopieren** (statt Formatierung)
  → Klick zur Neupositionierung → Enter → weiter tippen — bislang nur mit „Fett“ als
  Zwischenschritt getestet, nicht mit Zwischenablage-Aktionen, die laut
  `kopieren-req.md`/`ausschneiden-req.md` ebenfalls potenzielle Auslöser derselben
  Bug-Klasse sind.

---

## 3. Grenzfälle

1. **Leeres Dokument:** Strg+A auf einem komplett leeren Dokument (ein einzelner
   leerer Absatz) → keine Fehlermeldung, keine Konsolen-Exception, Editor bleibt
   bedienbar; die resultierende `AllSelection` über ein leeres Dokument darf keine
   nachfolgende Aktion (z. B. Tippen) zum Absturz bringen.
2. **Wiederholtes Strg+A:** Erneutes Strg+A, während bereits eine `AllSelection`
   aktiv ist → bleibt idempotent bei vollständiger Selektion, keine Fehler, keine
   sichtbare Änderung.
3. **Cursor innerhalb einer Tabellenzelle:** Strg+A markiert (laut aktuellem Ist-
   Zustand, siehe Abschnitt 2.2) sofort das **gesamte** Dokument inkl. der gesamten
   Tabelle, nicht nur die Zelle. Muss als bewusstes Soll bestätigt oder gegen das
   gestufte Word/LibreOffice-Verhalten ausgetauscht werden (siehe Abschnitt 8,
   offene Frage 2) — in jedem Fall darf das Ergebnis nicht strukturell inkonsistent
   sein (keine kaputte Tabelle nach nachfolgender Aktion).
4. **Dokument, das ausschließlich aus einem einzelnen Bild besteht** (kein Text):
   Strg+A markiert das Bild als Teil der `AllSelection`; eine anschließende
   Formatierungsaktion (z. B. Ausrichtung) darf nicht abstürzen, auch wenn sie auf
   ein Bild „wirkungslos“ angewendet wird.
5. **Strg+A unmittelbar gefolgt von Tippen:** Ersetzt den kompletten Inhalt durch das
   neu Getippte — das ist **gewolltes** Standardverhalten (wie in jeder
   Textverarbeitung), kein Bug; muss aber durch einen expliziten Test bestätigt sein,
   damit es nicht mit dem Selection-Sync-Bug (Abschnitt 2.6) verwechselt wird, bei dem
   genau dieses Verhalten **ungewollt** nach einem Klick auftrat.
6. **Strg+A unmittelbar gefolgt von Entf/Backspace:** Löscht den gesamten Inhalt,
   Editor bleibt in einem gültigen Zustand (mindestens ein leerer Absatz, weiterhin
   tippbar) — analog zur `AllSelection`-Anforderung aus `ausschneiden-req.md`
   Abschnitt 3, Punkt 2.
7. **Strg+A, danach Toolbar-Aktion, danach Klick zur Neupositionierung, danach
   Enter/Tippen (Pflicht-Regressionstest):** Siehe Abschnitt 2.6 — beide
   ursprünglichen Textteile müssen erhalten bleiben, keine unbeabsichtigte
   Komplettlöschung/-ersetzung.
8. **Strg+A, danach Undo:** Da „Alles auswählen“ selbst **keine** Dokumentänderung
   ist, darf es **keinen** eigenen Eintrag in der Undo-Historie erzeugen. Strg+Z nach
   reinem Strg+A (ohne nachfolgende inhaltliche Aktion) muss auf die zuletzt
   tatsächlich inhaltliche Änderung wirken, nicht auf „Auswahl rückgängig machen“.
9. **Strg+A während einer aktiven IME-Komposition** (z. B. ostasiatische
   Eingabemethoden mit noch nicht bestätigtem Text): kein Abbruch der Komposition in
   einem inkonsistenten Zwischenzustand, keine korrupte Selektion.
10. **Fokus liegt nicht im Editor** (z. B. Cursor gerade in einem Toolbar-Eingabefeld
    wie dem Farbwähler-Input oder im Datei-Upload-Dialog): Ein systemweites Strg+A
    darf **nicht** versehentlich Editor-Inhalt markieren, wenn der Editor gar nicht
    fokussiert ist — stattdessen greift das native Verhalten des tatsächlich
    fokussierten Elements (z. B. Textauswahl im Farbwert-Feld, falls dieses Text
    enthält).
11. **Sehr großes/langes Dokument** (mehrere Seiten, viele Bilder/Tabellen): Strg+A
    muss in vertretbarer Zeit abschließen, UI darf nicht spürbar einfrieren, auch beim
    anschließenden Scrollen durch die vollständig markierte Strecke.
12. **Strg+A, danach Kopieren/Ausschneiden:** Ergebnis muss dem in `kopieren-req.md`
    Abschnitt 2.1 geforderten „Strg+A → Kopieren“-Fall entsprechen (gesamter Inhalt
    landet vollständig und mit korrekter Formatierung in der Zwischenablage) bzw. dem
    in `ausschneiden-req.md` Abschnitt 2.2 beschriebenen `AllSelection`-Ausschneide-
    Verhalten (gesamtes Dokument wird geleert, Editor bleibt gültig).
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
    siehe `createPaginationPlugin()`): Die Selektion darf durch eine reine
    Layout-Neuberechnung nicht verloren gehen oder in einen inkonsistenten Zustand
    geraten.
16. **Rechtsklick-Kontextmenü wird durch kein globales Event-Handling der App
    verdeckt** (aktuell kein globaler `contextmenu`-Handler vorhanden — als
    Dauerzustand regressionssichern, analog `kopieren-req.md` Abschnitt 1, Testfall 4).
17. **Datenschutz:** „Alles auswählen“ selbst überträgt keine Daten (siehe
    README-Datenschutzprinzip: kein Server, kein `localStorage`/`IndexedDB`) — es gibt
    aber keinen Grund, dies gesondert zu prüfen, solange keine eigene Logging-/
    Telemetrie-Funktion für Selektionsereignisse existiert; als Code-Review-Punkt
    vermerkt, falls künftig Interaktionstelemetrie eingeführt wird.

---

## 4. Rundreise-Anforderung (DOCX **und** ODT)

„Alles auswählen“ selbst schreibt keine Datei — die Rundreise-Anforderung bezieht sich
darauf, dass **eine mit „Alles auswählen“ als Zwischenschritt durchgeführte Aktion**
(formatieren, löschen, ersetzen, kopieren/einfügen) beim anschließenden Export/Re-Import
zu demselben Ergebnis führt wie dieselbe Aktion ohne den Umweg über Strg+A.

Für **beide** Formate (DOCX und ODT) und für **beide** Import-Richtungen (Datei war
ursprünglich DOCX, Datei war ursprünglich ODT) gilt:

### 4.1 Baseline (Voraussetzung, damit „Alles auswählen“-Rundreisen aussagekräftig sind)
1. Datei A (DOCX oder ODT) hochladen → **unverändert** (ohne jede Strg+A-Aktion)
   exportieren → Re-Import → Inhalt entspricht exakt A. *(Allgemeine
   Rundreise-Anforderung aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3/19 — muss durch
   das bloße Vorhandensein der `baseKeymap`-Bindung für „Alles auswählen“ nicht neu
   bewiesen, aber als Ausgangs-Invariante bestätigt werden.)*

### 4.2 „Alles auswählen“-spezifische Rundreise — Testfälle
1. Datei A (DOCX) importieren → Strg+A → einheitliche Formatierung (z. B. Fett)
   anwenden → als DOCX exportieren → Re-Import → **jeder** Absatz/Textlauf im
   gesamten Dokument trägt die Formatierung, keiner wurde übersprungen (insbesondere
   erster und letzter Block, Tabellenzellinhalte, Listenpunkte).
2. Dieselbe Sequenz für eine ODT-Datei (Import → Strg+A → Formatierung → Export als
   ODT → Reimport).
3. Datei A importieren → Strg+A → Entf/Ausschneiden (kompletter Inhalt gelöscht) →
   als DOCX **und** als ODT exportieren → Re-Import → Ergebnis ist jeweils eine
   valide, leere Datei (analog `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.1, Testfall 2,
   und `ausschneiden-req.md` Abschnitt 4.2, Testfall 10).
4. Datei A importieren → Strg+A → Kopieren → in ein **neues, leeres** Dokument
   einfügen → dieses neue Dokument als DOCX **und** als ODT exportieren → Re-Import →
   vollständige Struktur (Formatierung, Listen, Tabellen, Bilder) bleibt erhalten
   (analog `kopieren-req.md` Abschnitt 4, Testfall 3/4).
5. Datei mit Tabelle importieren → Cursor in eine Zelle setzen → Strg+A (markiert
   laut Ist-Zustand das gesamte Dokument, siehe Abschnitt 2.2/3.3) → Formatierung
   anwenden → exportieren → reimportieren → Tabellenstruktur bleibt vollständig
   konsistent (keine verlorenen Zeilen/Spalten/`colspan`/`rowspan`), Formatierung
   liegt auch innerhalb der Zellen korrekt vor.
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
   Enter → weiter tippen (Selection-Sync-Pflichttest, siehe Abschnitt 2.6) →
   **danach zusätzlich** als DOCX **und** ODT exportieren → reimportieren → beide
   Absätze aus dem Regressionstest sind unabhängig vom nachfolgenden Export/Import
   weiterhin beide vorhanden (bislang nur im laufenden Editor-Zustand geprüft, nicht
   über eine anschließende Datei-Rundreise).

---

## 5. Menü-/Bedienelement-Übersicht (Soll-Zustand, kompakt)

| # | Element | Aktueller Zustand | Soll |
|---|---|---|---|
| 1 | Strg+A / Cmd+A | funktioniert über `prosemirror-commands`-`baseKeymap`-Default, **nur indirekt getestet** (als Trigger für einen anderen Bug) | eigener, dauerhafter E2E-Test, der „Alles auswählen“ selbst prüft (siehe Abschnitt 6) |
| 2 | Natives Rechtsklick-Kontextmenü „Alles auswählen“ | funktioniert vermutlich, **ungetestet** | verifizieren, dass kein App-Handler es unterdrückt |
| 3 | Toolbar-Button „Alles auswählen“ | fehlt | Entscheidung dokumentieren (siehe Abschnitt 1, Punkt 4, und Abschnitt 8, offene Frage 1) |
| 4 | Mobile/Touch-Auswahlpopup „Alles auswählen“ | ungetestet | auf „Mobile“/„Tablet“-Playwright-Projekten mindestens rudimentär prüfen |
| 5 | Tabellen-Sonderverhalten (sofortiges Markieren des ganzen Dokuments statt gestuft Zelle→Tabelle→Dokument) | Ist-Zustand ist „sofort ganzes Dokument“ (ProseMirror-Default) | Als bewusstes Soll bestätigen oder gestuftes Verhalten nachbauen — Entscheidung dokumentieren (Abschnitt 8, offene Frage 2) |
| 6 | Toolbar-Zustandsanzeige bei uneinheitlicher Formatierung nach Strg+A | zeigt nur den Zustand des allerersten Zeichens | Entweder auf korrekten „gemischt“-Zustand erweitern oder Einschränkung dokumentieren (Abschnitt 8, offene Frage 3) |
| 7 | Dauerhafter Regressionstest Selection-Sync-Bug × Alles auswählen | vorhanden (`selection-regression.spec.ts`, 3 Tests) | bleibt Pflichtbestandteil; wird um „Alles auswählen selbst“-Tests ergänzt (nicht ersetzt) |
| 8 | Eigenständiger Test für „Alles auswählen“ (unabhängig vom Selection-Sync-Bug) | **fehlt komplett** | muss neu geschrieben werden, siehe Abschnitt 6 |

---

## 6. Testfälle (Zusammenfassung, E2E-Fokus)

Analog zum Playwright-Aufbau in `tests/e2e/selection-regression.spec.ts` (echte
Browser-Interaktion über `page.keyboard`, `.ProseMirror`-Locator, `getByTitle`/
`getByRole`, keine isolierten Command-Aufrufe):

1. Mehrzeiligen/mehrabsätzigen Text eingeben, Strg+A → gesamter Text ist markiert
   (verifizierbar z. B. durch anschließendes Löschen: Entf → Editor komplett leer).
2. Strg+A auf leerem Dokument → keine Konsolen-Exception, Editor bleibt bedienbar.
3. Strg+A zweimal hintereinander ohne Zwischenaktion → weiterhin vollständige
   Selektion, keine Fehler.
4. Dokument mit Tabelle: Cursor in eine Zelle setzen, Strg+A, danach Entf → **gesamtes**
   Dokument (nicht nur die Zelle) ist geleert — bestätigt/widerlegt den in Abschnitt
   2.2/3.3 beschriebenen Ist-Zustand und macht die zu treffende Entscheidung sichtbar.
5. Dokument mit Bild: Strg+A, danach Ausrichtung „zentriert“ anwenden → kein Absturz,
   Text (falls vorhanden) wird zentriert, Bild bleibt unversehrt.
6. Strg+A, danach Tippen → gesamter vorheriger Inhalt wird durch den neuen Text
   ersetzt (gewolltes Verhalten, siehe Grenzfall 5).
7. Strg+A, danach Strg+Z (ohne nachfolgende inhaltliche Aktion) → Undo wirkt auf die
   letzte tatsächliche Inhaltsänderung, nicht auf „Auswahl rückgängig machen“
   (Grenzfall 8).
8. **Pflicht-Regressionstest (bereits vorhanden, muss grün bleiben):** die drei
   bestehenden Tests aus `selection-regression.spec.ts` unverändert weiterlaufen
   lassen (Basissequenz, Tabellen-Variante, Stress-Test).
9. Erweiterung des Regressionstests um Ausschneiden/Kopieren statt Fett als
   Zwischenschritt (siehe Abschnitt 2.6, letzter Punkt).
10. Strg+A → Export nach DOCX → Reimport → siehe Abschnitt 4.2, Testfall 1.
11. Strg+A → Export nach ODT → Reimport → siehe Abschnitt 4.2, Testfall 2.
12. Strg+A auf allen drei in `playwright.config.ts` konfigurierten Projekten
    (Desktop Chrome, Mobile/Pixel 7, Tablet/iPad Mini) → Kernverhalten (Punkte 1–3)
    funktioniert auf jedem Projekt.
13. Sehr langes Dokument (mehrere Bildschirmhöhen Text, per Testskript erzeugt):
    Strg+A → Markierung reicht nachweislich bis zum Dokumentende (z. B. Scroll-Test
    oder Prüfung über anschließendes vollständiges Löschen), Zeitmessung bestätigt
    keine spürbare Verzögerung.
14. Visueller Kontrast-Check der Selektionsdarstellung in Light- **und** Dark-Mode
    (Screenshot-Vergleich, siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8 zur
    generellen Anforderung an visuelle Verifikation).

---

## 7. Testmatrix — Zusammenfassung

| Bereich | Unit-Test | E2E-Test | Rundreise-Test (DOCX/ODT) |
|---|---|---|---|
| Basis-Verhalten (gesamter Inhalt markiert, leeres Dokument, Idempotenz) | fehlt | **fehlt komplett — muss neu gebaut werden** | n/a |
| Strg+A / Cmd+A als Tastenkombination | fehlt | fehlt (nur indirekt über Selection-Sync-Test genutzt) | n/a |
| Tabellen-Sonderverhalten (Zelle vs. gesamtes Dokument) | fehlt | fehlt | fehlt |
| Bild in der Selektion | fehlt | fehlt | fehlt |
| Toolbar-Zustandsanzeige bei uneinheitlicher Formatierung | fehlt | fehlt | n/a |
| Undo-Neutralität von „Alles auswählen“ | fehlt | fehlt | n/a |
| Selection-Sync-Regressionstest × Alles auswählen | **vorhanden (3 Tests)** | vorhanden, aber deckt nur Fett+Klick+Enter ab, nicht Ausschneiden/Kopieren als Zwischenschritt | n/a |
| Cross-Format-Rundreise nach Strg+A + Aktion | n/a | fehlt | fehlt |
| Mobile/Tablet-Verhalten | n/a | fehlt | n/a |
| Visueller Kontrast der Selektion (Light/Dark) | n/a | fehlt | n/a |
| Performance auf langen Dokumenten | n/a | fehlt | n/a |

**Fazit:** Der Backlog-Status „vorhanden“ stützt sich ausschließlich auf implizites
`prosemirror-commands`-Standardverhalten (`baseKeymap`-Eintrag `Mod-a`) und wird
bislang nur indirekt getestet — als Trigger für einen anderen, unabhängigen Bug
(Selection-Sync), nicht als eigenständig verifizierte Funktion. Es gibt außerdem einen
konkreten, bisher nicht dokumentierten Verhaltensunterschied zu Word/LibreOffice bei
Tabellen (kein gestuftes Zelle→Tabelle→Dokument-Verhalten). Bevor der Status auf
„verifiziert“ gesetzt werden darf, müssen mindestens die Testfälle aus den Abschnitten
1–6 als echte, im Browser laufende Playwright-Tests existieren und die offenen Fragen
aus Abschnitt 8 beantwortet sein.

---

## 8. Offene Fragen / Abnahmekriterien (Definition of Done)

1. Wird ein sichtbarer Toolbar-Button für „Alles auswählen“ ergänzt, oder bleibt es bei
   ausschließlich nativen Wegen (Tastenkombination + Kontextmenü)? Muss vor
   Testimplementierung entschieden und hier nachgetragen werden.
2. Wird das aktuelle „sofort gesamtes Dokument“-Verhalten innerhalb von Tabellen als
   Soll übernommen, oder soll das gestufte Word/LibreOffice-Verhalten
   (Zelle → Tabelle → Dokument bei mehrfachem Strg+A) nachgebaut werden? Entscheidung
   ist bindend für Abschnitt 3, Grenzfall 3, und Abschnitt 6, Testfall 4.
3. Wird die Toolbar-Zustandsanzeige bei uneinheitlicher Formatierung nach Strg+A auf
   einen korrekten „gemischt“-Zustand erweitert, oder bleibt die aktuelle
   Vereinfachung (Zustand des ersten Zeichens) bewusst bestehen? Entscheidung ist in
   Abschnitt 2.5 nachzutragen.
4. Ist Safari/WebKit bzw. macOS (Cmd+A) Teil der unterstützten Test-/Browsermatrix?
   Falls ja, gesonderte Verifikation notwendig.
5. Diese Spezifikation gilt erst als erfüllt, wenn:
   - jeder Testfall aus Abschnitt 1, 3 und 6 als automatisierter, dauerhaft in der
     Suite verbleibender Test existiert und grün ist,
   - die drei bestehenden Selection-Sync-Regressionstests weiterhin grün sind **und**
     um die Ausschneiden/Kopieren-Variante aus Abschnitt 2.6 ergänzt wurden,
   - die Rundreise-Anforderung aus Abschnitt 4 für **beide** Formate (DOCX und ODT)
     und **beide** Konvertierungsrichtungen nachgewiesen ist,
   - der visuelle Kontrast-Check aus Abschnitt 6, Testfall 14 durchgeführt und
     dokumentiert ist,
   - die offenen Fragen 1–4 dieses Abschnitts beantwortet und die Antworten in diese
     Datei nachgetragen sind.
   Erst dann darf der Backlog-Eintrag `alles-auswaehlen` von „nicht vertrauenswürdig“
   auf „verifiziert“ wechseln.
