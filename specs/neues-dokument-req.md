# Anforderungen: „Neues Dokument erstellen"

Status: Entwurf zur Verifikation — Backlog-Status „vorhanden" gilt als **nicht
vertrauenswürdig** und muss durch echte Browser-Bedienung (nicht nur Datenmodell-Tests)
vollständig neu geprüft werden, bevor der Status im Backlog bestätigt werden darf.

Geltungsbereich: Diese Datei vertieft ausschließlich den Backlog-Eintrag `neues-dokument`
(„Legt ein leeres Dokument mit Standardformat an, sofort bearbeitbar.", Priorität 1) aus
`specs/FEATURE-BACKLOG.md` sowie Abschnitt 1.1 aus `FEATURE-SPEC-DOCX-ODT.md`. Alle dort
bereits definierten allgemeinen Anforderungen (Zeichen-/Absatzformatierung, Tabellen,
Bilder usw.) gelten unverändert fort und werden hier nicht wiederholt — referenziert wird
nur, wo das neu erstellte Dokument eine Besonderheit gegenüber einem importierten Dokument
aufweist.

Methodik: Jede Aussage unten wurde am tatsächlichen Quellcode verifiziert (Dateipfade
sind angegeben). Wo der Code ein Verhalten nahelegt, das der bisherigen Spezifikation
widerspricht oder das schlicht nicht getestet ist, ist das explizit als **Befund**
markiert — das sind die Stellen, die der QA-Agent zuerst verifizieren muss.

---

## 1. Ausgangslage (Ist-Code, mit Fundstellen)

Ein neues Dokument entsteht ausschließlich über den Button „Neu erstellen" auf der
Format-Auswahlseite (`src/app/FormatPicker.tsx`, `handleCreateNew`). Es gibt **keinen**
weiteren Einstiegspunkt (kein Tastenkürzel, kein Menüpunkt „Datei → Neu" innerhalb eines
bereits geöffneten Dokuments, kein „Neues Fenster").

Ablauf laut Code:
1. `module.createNew()` liefert `createBlankWordDocument()`
   (`src/formats/shared/documentModel.ts`) — identisch für DOCX und ODT.
2. Das Ergebnis ist:
   ```ts
   {
     body: { type: 'doc', content: [{ type: 'paragraph', attrs: { align: 'left' } }] },
     header: null,
     footer: null,
     meta: { title: '' },
   }
   ```
3. `onOpen(module.id, { fileName: '<defaultName><ext>', content, dirty: false })` wird
   aufgerufen — Dateiname `Unbenanntes Dokument.docx` bzw. `Unbenanntes Dokument.odt`
   (`src/formats/docx/docx.ts`, `src/formats/odt/odt.ts`).
4. `App.tsx` schaltet auf `DocumentWorkspace`, das `WordEditor` mit diesem Inhalt
   initialisiert (identischer Editor-Code für DOCX und ODT,
   `src/formats/shared/editor/WordEditor.tsx`).

Damit ist „Neues Dokument erstellen" technisch keine eigene Funktion, sondern derselbe
Editor-/Workspace-Code wie beim Import — mit der Ausnahme, dass die Startdaten aus
`createBlankWordDocument()` statt aus einem Reader kommen. Jede Anforderung, die für den
Datei-Lifecycle allgemein gilt (Abschnitt 1.2/1.3 in `FEATURE-SPEC-DOCX-ODT.md`), gilt
daher automatisch auch hier — außer explizit anders vermerkt.

---

## 2. Bedienelemente (vollständige Aufzählung)

| # | Element | Fundstelle | Beschreibung Ist-Zustand |
|---|---|---|---|
| 1 | Button „Neu erstellen" auf der DOCX-Karte | `FormatPicker.tsx` (eine Karte pro `module`) | Ruft `createNew()` für `docxModule` auf, öffnet sofort den Workspace. |
| 2 | Button „Neu erstellen" auf der ODT-Karte | `FormatPicker.tsx` | Identisch für `odtModule`. |
| 3 | Button „Datei hochladen" (danebenliegend, nicht Teil dieses Features) | `FormatPicker.tsx` | Zur Abgrenzung erwähnt: löst `<input type="file">` aus, **nicht** denselben Codepfad wie „Neu erstellen". |
| 4 | Fehler-Banner (`role="alert"`) auf der Format-Auswahlseite | `FormatPicker.tsx` | Wird aktuell **nur** von `handleFile` (Importfehler) gesetzt. `handleCreateNew` hat **kein** `try/catch` und keinen Weg, hier eine Meldung zu erzeugen (siehe Abschnitt 3.8). |
| 5 | Zurück-Link „← Formate" in der Workspace-Kopfzeile | `DocumentWorkspace.tsx` | Schließt das aktuelle (neue) Dokument, fragt nach bei `dirty === true`. |
| 6 | Dateiname-Anzeige in der Kopfzeile | `DocumentWorkspace.tsx` | Zeigt `document.fileName`, initial `Unbenanntes Dokument.docx`/`.odt`. |
| 7 | „● ungespeichert"-Indikator | `DocumentWorkspace.tsx` | Nur sichtbar, wenn `document.dirty === true`; direkt nach Erstellung `false` → **nicht sichtbar**. |
| 8 | Button „Exportieren" | `DocumentWorkspace.tsx` | Ruft `module.exportFile(content, fileName)` des **gebundenen** Moduls auf — kein Formatwechsel möglich (siehe Abschnitt 4). |
| 9 | Exportfehler-Text neben dem Export-Button | `DocumentWorkspace.tsx` | Wird bei Fehlschlag von `exportFile` gesetzt. |
| 10 | Editor-Seitenfläche (simulierte A4-Seite) | `WordEditor.tsx`, `pageLayout.ts` | Feste Breite `PAGE_WIDTH_PX`, Padding `PAGE_MARGIN_PX` (25 mm) — reine Bildschirmdarstellung, siehe Abschnitt 3.4. |
| 11 | ProseMirror-Editorfläche (`.word-editor-surface`, `contenteditable`) | `WordEditor.tsx` | Wird im `useEffect` beim ersten Mount erzeugt; **kein** programmatischer Fokusaufruf (siehe Abschnitt 3.3). |
| 12 | Toolbar | `Toolbar.tsx`, gerendert über `WordEditor.tsx` | Erscheint erst, sobald `viewRef.current` gesetzt ist (zweiter Render-Durchlauf) — im ersten Render (vor dem Effect) fehlt sie noch; in der Praxis nicht wahrnehmbar, aber es gibt keinen expliziten Platzhalter/Skeleton dafür. |

**Explizit fehlende Bedienelemente**, die man bei „Neues Dokument erstellen" in einer
ernstzunehmenden Textverarbeitung erwarten würde (siehe `FEATURE-BACKLOG.md` Abschnitt 1):
- Kein Menüpunkt „Datei → Neu" *innerhalb* eines geöffneten Dokuments (nur über den Umweg
  „← Formate" → Bestätigungsdialog bei ungespeicherten Änderungen → Format-Auswahlseite).
- Keine Auswahl von Papierformat/Ausrichtung/Rändern beim Erstellen (`seitenraender`,
  `seitenausrichtung`, `papierformat` — laut Backlog alle „fehlt").
- Keine Eingabemöglichkeit für den Dokumenttitel beim Erstellen (`dokumenteigenschaften`
  laut Backlog „teilweise" — siehe Abschnitt 3.6).
- Keine Formatvorlagen-/Dokumentvorlagen-Auswahl (nur ein einziges, festes Leerformat).

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Auslösen der Aktion

- Klick auf „Neu erstellen" (Maus) **und** Aktivierung per Tastatur (Tab bis zum Button,
  Enter/Leertaste) müssen identisch funktionieren — **Befund: bisher nicht getestet**,
  weder Unit- noch E2E-Test aktiviert den Button per Tastatur.
- Ein Doppelklick auf „Neu erstellen" darf nicht zwei parallele Dokumentzustände oder
  einen inkonsistenten `active`-State erzeugen (React `setState` zweimal hintereinander
  mit demselben Modul ist unkritisch, aber bisher nicht regressionsgetestet).
- Die Aktion muss ohne spürbare Verzögerung wirken (`createBlankWordDocument()` ist
  synchron und trivial — Performance ist hier kein Risiko, im Gegensatz zum Import
  großer Dateien).

### 3.2 Dokumentzustand direkt nach Erstellung

- `body`: genau **ein** leerer Absatz, Ausrichtung `left`. Kein Text, keine Überschrift,
  keine Liste, keine Tabelle.
- `header`/`footer`: `null` — es existiert also **keine** Kopf-/Fußzeile im neuen
  Dokument (konsistent mit `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9: die Funktion, eine
  Kopf-/Fußzeile über die UI überhaupt anzulegen, fehlt ohnehin komplett).
- `meta.title`: leerer String (siehe Abschnitt 3.6 zur Abgrenzung von `fileName`).
- Diese vier Werte müssen für DOCX und ODT **identisch** sein (aktuell durch dieselbe
  Fabrikfunktion `createBlankWordDocument()` sichergestellt — ein Regressionstest muss
  verhindern, dass sich das durch künftige Formatspezifika unbemerkt auseinanderentwickelt).

### 3.3 Fokus & Cursor

**Anforderung** (laut Backlog-Beschreibung „sofort bearbeitbar"): Nach dem Klick auf
„Neu erstellen" muss der Text-Cursor sichtbar blinkend im Dokument stehen und die Tastatur
muss ohne weiteren Klick direkt Text in den Editor schreiben.

**Befund (hohe Priorität, vermutlich nicht erfüllt):**
- Im Mount-Effect von `WordEditor.tsx` wird `new EditorView(...)` erzeugt, aber an keiner
  Stelle `view.focus()` aufgerufen. Der einzige Aufruf von `.focus()` im gesamten
  Frontend-Code liegt in `src/formats/shared/editor/Toolbar.tsx:25` und wird nur nach
  einem Toolbar-Klick ausgeführt, um den Fokus **zurück** in den Editor zu holen — nicht
  beim initialen Erzeugen des Dokuments.
- Alle drei bestehenden Playwright-E2E-Tests, die ein neues Dokument anlegen
  (`tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`,
  `tests/e2e/selection-regression.spec.ts`), rufen nach „Neu erstellen" explizit
  `await editor.click()` auf, **bevor** getippt wird. Das ist ein starkes Indiz dafür,
  dass ohne diesen Klick nicht getippt werden kann — die bestehenden Tests kaschieren das
  Problem, statt es zu prüfen.
- **Verifikationsschritt (Pflicht):** ein Test muss nach „Neu erstellen" **ohne** jeden
  weiteren Klick direkt `page.keyboard.type(...)` aufrufen und prüfen, dass der Text im
  Dokument ankommt. Schlägt das fehl, ist dies ein zu behebender Bug (fehlender
  `view.focus()`-Aufruf direkt nach `new EditorView(...)`), keine Formalität.

### 3.4 Seitenlayout-Default (A4, Standardränder)

- Bildschirmdarstellung: A4 (`PAGE_WIDTH_PX`/`PAGE_HEIGHT_PX`, 210×297 mm) mit 25 mm
  Rand auf allen Seiten (`pageLayout.ts`). Das ist rein CSS/Layout für die Bildschirm-
  Simulation und **nicht** an ein tatsächliches Dokumentattribut gebunden — es gibt aktuell
  keine Möglichkeit (und keinen Speicherort im Datenmodell `WordDocumentContent`), Rand
  oder Seitengröße pro Dokument zu variieren.
- **Befund (Rundreise-Lücke, siehe auch Abschnitt 4): ODT und DOCX verhalten sich beim
  Export unterschiedlich:**
  - ODT (`src/formats/odt/writer.ts`, `buildStylesXml`) schreibt explizit
    `<style:page-layout-properties fo:margin="2.5cm" fo:page-width="21cm"
    fo:page-height="29.7cm"/>` — der exportierte Wert (2,5 cm) stimmt mit der
    Bildschirmanzeige (25 mm) überein.
  - DOCX (`src/formats/docx/writer.ts`, `buildDocumentXml`) schreibt lediglich ein
    **leeres** `<w:sectPr>` (nur ggf. mit `headerReference`/`footerReference`) — **weder
    `<w:pgSz>` noch `<w:pgMar>` werden je geschrieben**, unabhängig davon, ob das Dokument
    neu erstellt oder importiert wurde. Eine in Word geöffnete Export-Datei fällt damit
    auf Words eigene Standard-Seitengröße/-ränder zurück (typischerweise Letter in
    einer US-Installation, nicht zwingend A4/25 mm), was von der im Editor angezeigten
    Seite abweichen kann.
  - Der DOCX-Reader (`src/formats/docx/reader.ts`) liest `w:pgSz`/`w:pgMar` ebenfalls
    nicht — das Seitenlayout ist für DOCX also weder beim Import noch beim Export an
    reale Dokumentdaten gekoppelt, sondern ausschließlich eine feste UI-Konstante.
- **Anforderung zur Behebung:** Das für ein neues Dokument angezeigte Seitenformat (A4,
  Standardränder — Vorschlag: 2,5 cm allseitig, konsistent mit dem bereits für ODT
  verwendeten Wert) muss beim DOCX-Export als `w:pgSz`/`w:pgMar` in `w:sectPr`
  geschrieben und beim Import wieder gelesen werden, damit Anzeige, Export und Re-Import
  für beide Formate konsistent sind. Bis das umgesetzt ist, gilt Abschnitt 8 aus
  `FEATURE-SPEC-DOCX-ODT.md" („Seitenlayout & Paginierung") für DOCX als **nicht belastbar
  verifiziert**.

### 3.5 Zeichen-/Absatzformat-Default („Standardformat")

- Das ProseMirror-Schema (`src/formats/shared/schema.ts`) kennt **keine** Schriftart-
  oder Schriftgrößen-Attribute (weder als Mark noch als Absatzattribut) — konsistent mit
  Backlog-Einträgen `schriftart-waehlen`/`schriftgroesse-waehlen` = „fehlt". Ein neues
  Dokument hat also keinen explizit gesetzten Font/Size, weder im Editor noch im Export.
- DOCX-Export: `styleDefs.ts` schreibt `<w:docDefaults/>` **leer** und definiert den
  Absatzstil `Normal` ohne jede Schrift-Eigenschaft. Word wählt beim Öffnen also seine
  eigene Anwendungs-Standardschrift.
- ODT-Export: `writer.ts` definiert den Stil `Standard` (`style:family="paragraph"`)
  ebenfalls ohne `style:text-properties` — LibreOffice/andere ODF-Konsumenten wählen ihre
  eigene Standardschrift.
- **Anforderung:** Dieses Verhalten ist an sich zulässig (viele reale Word-Dokumente
  verlassen sich auf `docDefaults`), muss aber **explizit als gewolltes Verhalten
  dokumentiert** sein, statt stillschweigend zu bestehen — insbesondere, damit ein
  Rundreise-Test nicht fälschlich einen "Schriftverlust" moniert, wo real gar keine
  Schrift gesetzt war. Sollte künftig `schriftart-waehlen`/`schriftgroesse-waehlen`
  umgesetzt werden, muss ein neues Dokument weiterhin ohne erzwungene Schriftwahl
  startbar bleiben (Standard = Anwendungsstandard der Zielanwendung), es sei denn, es
  wird bewusst ein Produkt-Standard (z. B. „Calibri 11pt“ / „Liberation Serif 12pt“)
  festgelegt — diese Entscheidung ist aktuell **nicht getroffen** und muss nachgeholt
  werden (siehe Abschnitt 7).

### 3.6 Dateiname vs. Dokumenttitel

- `fileName` (sichtbar in der Workspace-Kopfzeile, verwendet als Downloadname) und
  `meta.title` (das interne `dc:title`/`meta:title`-Metadatum in der Exportdatei) sind
  **zwei getrennte Werte**, die bei einem neuen Dokument **auseinanderfallen**:
  `fileName = "Unbenanntes Dokument.docx"`, `meta.title = ""` (leer).
- **Anforderung:** Das muss so bleiben (Dateiname ist ein Downloadartefakt, Titel ist
  Dokumentmetadatum), aber es fehlt aktuell jede UI, `meta.title` beim Neuanlegen zu
  setzen (Backlog `dokumenteigenschaften`: „teilweise" — nur beim Import gelesen/beim
  Export geschrieben, im Editor selbst nicht einstellbar). Für ein neues Dokument bedeutet
  das: der Titel bleibt bis zum nächsten Import zwingend leer. Das muss entweder als
  akzeptierter Zustand dokumentiert oder durch ein Eingabefeld behoben werden (siehe
  `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 16).

### 3.7 Dirty-Flag & Lifecycle

- Direkt nach Erstellung: `dirty: false`. Schließen (`← Formate`) fragt in diesem Zustand
  **nicht** nach Bestätigung — korrektes Verhalten, da noch keine Änderung existiert.
- Sobald eine Transaktion mit `tr.docChanged === true` durch den Editor läuft, setzt
  `WordEditor.tsx` **immer** `dirty: true` in `DocumentWorkspace.tsx` — unabhängig davon,
  ob der resultierende Inhalt inhaltlich wieder dem Ursprungszustand entspricht.
- **Grenzfall/Befund:** Tippen, dann vollständig per Rückgängig (`Strg+Z`) bis zum leeren
  Ausgangszustand zurückkehren → Inhalt ist wieder exakt der leere Absatz von der
  Erstellung, **aber** `dirty` bleibt `true` (einmal gesetzte Transaktionen werden nicht
  rückwirkend als „wieder sauber“ erkannt). Das ist technisch nachvollziehbar (kein Deep-
  Equality-Check gegen den Ursprungszustand), sollte aber bewusst als akzeptiertes
  Verhalten festgehalten werden, da es sonst wie ein Bug wirkt, wenn Nutzer:innen nach
  vollständigem Rückgängig weiterhin „● ungespeichert“ sehen.
- `useBeforeUnloadWarning(active?.document.dirty ?? false)` (`App.tsx`) verhindert
  versehentlichen Tab-Schluss/Reload nur, wenn `dirty === true` — für ein frisch erstelltes,
  unverändertes Dokument entsteht also korrekterweise **keine** Warnung.

### 3.8 Fehlerbehandlung beim Erstellen

- Der Import-Pfad (`handleFile`) hat vollständige Fehlerbehandlung (`try/catch` +
  sichtbarer `role="alert"`-Banner, siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.2).
- Der Erstell-Pfad (`handleCreateNew`) hat **kein** `try/catch`. Da
  `createBlankWordDocument()` aktuell eine triviale, garantiert erfolgreiche Funktion ist,
  hat das im Ist-Zustand keine sichtbare Auswirkung — es verstößt aber gegen die generelle
  Anforderung „kein stiller Fehlschlag“ (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4): sollte
  `createNew()` in Zukunft z. B. um eine asynchrone Vorlagen-Initialisierung erweitert
  werden, gäbe es aktuell keinen Mechanismus, einen Fehlschlag dem Menschen sichtbar zu
  machen. **Anforderung:** `handleCreateNew` analog zu `handleFile` mit Fehlerbehandlung
  absichern, auch wenn der Erfolgsfall heute der einzig mögliche ist.

---

## 4. Rundreise-Anforderung (DOCX **und** ODT)

Grundregel (siehe `FEATURE-SPEC-DOCX-ODT.md`, Architektur-Grundprinzip): Jede Aussage zu
„Neues Dokument erstellen“ muss für **beide** Formate unabhängig nachgewiesen werden — ein
nur für ein Format bestandener Test gilt als **nicht** erfüllt.

**R1 — Leeres Dokument, unverändert exportiert, danach re-importiert (DOCX):**
Neues DOCX-Dokument erstellen → ohne jede Änderung exportieren → resultierende Datei mit
einem **externen/unabhängigen** Parser prüfen (nicht nur `src/formats/docx/reader.ts`) →
Datei muss ein valides, minimales `.docx`-Package sein (gültiges ZIP, gültiges
`[Content_Types].xml`, gültiges `word/document.xml` gegen das OOXML-Schema) und beim
Re-Import in Salamanido wieder als leeres Dokument (ein leerer Absatz, keine
Kopf-/Fußzeile) erscheinen.

**R2 — Dasselbe für ODT:**
Analog gegen das ODF-Schema prüfen (`content.xml`, `styles.xml`, `meta.xml`,
`mimetype`-Eintrag an erster, unkomprimierter Stelle im ZIP — **muss zusätzlich separat
verifiziert werden**, da ein falsch platzierter/komprimierter `mimetype`-Eintrag ein sonst
korrektes ODT für strenge Reader unbrauchbar macht).

**R3 — Leeres Dokument + minimaler Inhalt, Rundreise DOCX:**
Neues DOCX-Dokument erstellen → einen Satz Text eintippen, einmal formatieren (z. B. fett)
→ exportieren → re-importieren → Text, Formatierung und Absatzstruktur exakt erhalten.

**R4 — Dasselbe für ODT.**

**R5 — Seitenformat-Rundreise (siehe Befund in Abschnitt 3.4):**
Neues Dokument erstellen (beide Formate) → unverändert exportieren → in einem
unabhängigen Werkzeug (z. B. LibreOffice, falls verfügbar, sonst Schema-/XML-Inspektion)
prüfen, dass Seitengröße A4 und die dokumentierten Standardränder tatsächlich in der
Datei stehen. **Für DOCX ist das nach aktuellem Code-Stand nicht der Fall (Abschnitt
3.4) — dieser Testfall muss also zunächst rot sein und dient als Nachweis für den zu
behebenden Bug, nicht als sofort grüner Regressionstest.**

**R6 — Titel-Rundreise:**
Leeres neues Dokument (Titel leer) exportieren → re-importieren → Titel bleibt leer
(kein Platzhaltertext wie `undefined`/`null`/„Unbenanntes Dokument“ wird fälschlich als
Titel-Metadatum in die Datei geschrieben — Abgrenzung zu `fileName`, siehe Abschnitt 3.6).

**R7 — Cross-Format-Hinweis (aktuell nicht anwendbar, aber zu dokumentieren):**
Die ursprüngliche Anforderung „Exportierbar als DOCX **und** als ODT (Formatwahl beim
Export, nicht nur beim Import)“ aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.1 ist für ein
neu erstelltes Dokument **aktuell nicht erfüllt**: Das über „Neu erstellen“ auf der
DOCX-Karte angelegte Dokument ist fest an `docxModule.exportFile` gebunden
(`DocumentWorkspace.tsx` → `module.exportFile`); es gibt keinen UI-Weg, dasselbe neu
erstellte Dokument stattdessen als ODT zu exportieren, ohne es zu schließen und über die
ODT-Karte neu zu beginnen (wodurch der bereits eingegebene Inhalt verloren ginge). Das
deckt sich mit dem Backlog-Eintrag `speichern-unter-format` = „fehlt“. **Bis diese
Funktion existiert, gilt R7 als offener Punkt, kein bestehender Test darf ihn als
„bestanden“ ausweisen.**

**R8 — Doppelte Rundreise (Format-Wechsel hin und zurück), sobald R7 umgesetzt ist:**
Neues Dokument (gleich welches Ursprungsformat) mit Inhalt füllen → als anderes Format
exportieren → re-importieren → zurück ins Ursprungsformat exportieren → Inhalt bleibt
über beide Konvertierungen hinweg identisch (Formatierungsverluste bei Cross-Format sind
laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19 akzeptabel und zu dokumentieren, Textverlust
nicht).

---

## 5. Grenzfälle

1. **Kein Fokus ohne Klick** (siehe 3.3) — höchste Priorität, siehe oben.
2. **Rasches Doppelklicken** auf „Neu erstellen“ — darf nicht zu zwei konkurrierenden
   aktiven Dokumenten oder einer React-Warnung/Exception führen.
3. **Tastatur-only-Bedienung**: Button „Neu erstellen“ erreichbar und auslösbar per
   Tab + Enter/Leertaste, ohne Maus.
4. **Neues Dokument erstellen, während bereits ein anderes (ungespeichertes) Dokument
   geöffnet ist**: Da „Neu erstellen“ nur auf der Format-Auswahlseite existiert, muss der
   Weg dorthin zwingend über „← Formate“ führen — inklusive Bestätigungsdialog bei
   `dirty === true`. Zu prüfen: Abbrechen des Dialogs lässt das ursprüngliche Dokument
   unverändert geöffnet (kein Datenverlust, kein Zwischenzustand ohne aktives Dokument).
5. **Sofortiges Schließen ohne jede Änderung**: Neues Dokument erstellen → sofort „←
   Formate“ → **kein** Bestätigungsdialog (da `dirty === false`) — das ist gewolltes
   Verhalten, kein Bug, aber ein Pflicht-Regressionstest, damit ein künftiger Fix für
   Abschnitt 3.7 (Dirty-Nach-Undo) diesen Fall nicht versehentlich mit-verschärft.
6. **Tippen, dann vollständiges Rückgängig bis zum leeren Ausgangszustand** (siehe 3.7):
   `dirty` bleibt `true`. Muss als bewusst akzeptiertes Verhalten festgehalten oder
   behoben werden — nicht stillschweigend unklar bleiben.
7. **Export eines komplett unveränderten neuen Dokuments** (kein einziger Tastenanschlag)
   muss trotzdem einen funktionierenden Download auslösen und eine valide Datei erzeugen
   (nicht nur bei Dokumenten mit Inhalt getestet).
8. **Zwei „Neu erstellen“-Vorgänge nacheinander** (Dokument 1 erstellen, ohne Export
   schließen — mit Bestätigung —, Dokument 2 erstellen): Dokument 2 darf keine Reste von
   Dokument 1 enthalten (z. B. über verschleppten ProseMirror-View-State, falls der
   `EditorView` nicht sauber zerstört wird — `WordEditor.tsx` ruft `view.destroy()` im
   Effect-Cleanup auf, das muss über einen echten Mount/Unmount-Zyklus verifiziert werden).
9. **Erstellen eines neuen Dokuments unmittelbar nach einer fehlgeschlagenen
   Datei-Import-Aktion** (Fehlerbanner sichtbar): „Neu erstellen“ muss den Fehlerbanner
   zurücksetzen (`setError(null)` steht bereits in `handleCreateNew` — verifizieren, dass
   das auch tatsächlich sichtbar greift und nicht durch einen Re-Render-Zeitpunkt-Bug
   kurz aufblitzt).
10. **Bildschirmgröße/Viewport**: „Neu erstellen“ und die resultierende leere Seite müssen
    auch auf Tablet-/Mobile-Viewports bedienbar und die Seite sofort sichtbar sein (Bezug
    zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8, Testfall 4/5), nicht nur auf Desktop-Breite.
11. **Reihenfolge der Bereitstellung**: Die Toolbar erscheint erst nach dem ersten
    Effect-Durchlauf (Abschnitt 2, Punkt 12) — zu prüfen, dass zwischen dem Klick auf
    „Neu erstellen“ und dem Erscheinen der Toolbar kein wahrnehmbarer, funktionsloser
    Zwischenzustand entsteht (z. B. Seite sichtbar, aber Toolbar-Buttons noch nicht da,
    während man versucht, sofort zu formatieren).
12. **Sehr schnelle Export-Aktion direkt nach Erstellung**: Klick auf „Exportieren“, bevor
    der Editor überhaupt gerendert/fokussiert wurde — darf nicht zu einem Zustand führen,
    in dem `document.content.body` noch nicht dem tatsächlich angezeigten (leeren)
    Zustand entspricht.

---

## 6. Testfälle (Pflicht-Regressionssuite)

Alle Testfälle sind **je Format** (DOCX und ODT) auszuführen, sofern nicht anders
vermerkt. Wo sinnvoll, per echter Playwright-Browserbedienung (nicht nur Aufruf von
`createNew()`/`exportFile()` im Unit-Test), da genau dieser Bedienweg bisher am
wenigsten geprüft ist (siehe Abschnitt 3.3).

1. Klick auf „Neu erstellen“ → Workspace erscheint, Dateiname `Unbenanntes
   Dokument.docx`/`.odt`, kein „● ungespeichert“ sichtbar, kein Fehlerbanner.
2. **Ohne jeden weiteren Klick** direkt nach Punkt 1 auf der Tastatur tippen → Text
   erscheint im Dokument (Pflichttest für den Befund aus Abschnitt 3.3 — muss zuerst rot
   sein, bis `view.focus()` ergänzt wurde, dann dauerhaft grün bleiben).
3. „Neu erstellen“ per Tastatur (Tab, Enter) statt Mausklick auslösen → identisches
   Ergebnis wie Testfall 1.
4. Neues Dokument ohne jede Änderung exportieren → Export-Datei mit unabhängigem
   Parser/Schema-Validator prüfen (nicht dem eigenen Reader) → valide, minimal, leer.
5. Re-Import derselben, unverändert exportierten Datei → wieder genau ein leerer Absatz,
   `header`/`footer` weiterhin `null`, `meta.title` weiterhin leer.
6. Neues Dokument, Seitenformat der Exportdatei gegen die im Editor angezeigte A4-Größe
   und die Standardränder prüfen (siehe R5 in Abschnitt 4 — für DOCX aktuell erwartbar
   **rot**, dient als Nachweis für den Bug aus Abschnitt 3.4).
7. Neues Dokument, Text eingeben, fett formatieren, exportieren, re-importieren → Text
   und Formatierung erhalten (Basis-Rundreise mit Inhalt, ergänzt R3/R4 aus Abschnitt 4).
8. „← Formate“ direkt nach Erstellung ohne jede Änderung → kein Bestätigungsdialog.
9. „← Formate“ nach mindestens einer Änderung → Bestätigungsdialog erscheint; Abbrechen
   lässt das Dokument unverändert offen; Bestätigen kehrt zur Format-Auswahl zurück.
10. Text eingeben, dann per `Strg+Z` vollständig bis zum leeren Ausgangszustand
    zurückgehen → Inhalt ist wieder leer; Testfall dokumentiert (nicht zwingend behebt)
    den Dirty-Flag-Grenzfall aus Abschnitt 3.7/Grenzfall 6.
11. Zwei aufeinanderfolgende „Neu erstellen“-Vorgänge (mit Schließen dazwischen) →
    zweites Dokument enthält keine Textreste, keine doppelten Toolbar-Instanzen, keine
    Konsolenfehler.
12. Reale Fenstergrößen: „Neu erstellen“ und sofortiges Tippen auf Tablet- und
    Mobile-Viewport (bestehende Playwright-Projekte nutzen) → Seite bedienbar, Toolbar
    erreichbar.
13. Export einer Datei mit Umlauten im (nachträglich vom Nutzer geänderten) Dateinamen,
    ausgehend von einem neu erstellten Dokument → Download-Dateiname korrekt, keine
    Zeichenverstümmelung (Bezug zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.2, Testfall 4,
    hier für den Neu-erstellen-Pfad statt Import-Pfad nachgezogen).
14. Konsole bleibt während des gesamten Ablaufs (Erstellen → Tippen → Formatieren →
    Exportieren) frei von unbehandelten Exceptions/`unhandledrejection`.

---

## 7. Offene Fragen / Klärungsbedarf (vor Abnahme zu entscheiden)

1. **Fokus-Verhalten (Abschnitt 3.3):** Wird der fehlende `view.focus()`-Aufruf als Bug
   akzeptiert und behoben, oder gilt „ein Klick ins Dokument nach dem Erstellen“ als
   akzeptables Verhalten? Falls letzteres: die Backlog-/Spec-Formulierung „sofort
   bearbeitbar ohne weitere Klicks“ muss dann korrigiert werden, statt weiter falsch im
   Status „vorhanden“ zu stehen.
2. **Seitenformat im DOCX-Export (Abschnitt 3.4):** Wird `w:pgSz`/`w:pgMar` ergänzt (Fix),
   oder wird das Fehlen als bewusste Vereinfachung dokumentiert (Risiko: abweichendes
   Layout beim Öffnen in Word)? Diese Entscheidung ist Voraussetzung für Testfall 6.
3. **Schrift-Standard (Abschnitt 3.5):** Bleibt der Font-Default implizit
   (Anwendungsstandard der Zielsoftware), oder wird ein Produktstandard (z. B. konkrete
   Schriftart/-größe) im Schema und in `docDefaults`/`Standard`-Stil festgeschrieben?
4. **Titel beim Neuanlegen (Abschnitt 3.6):** Soll es ein Eingabefeld geben, um
   `meta.title` bereits beim Erstellen zu setzen, oder bleibt der Titel bis zum nächsten
   Export/Import-Zyklus bewusst leer?
5. **„Datei → Neu“ innerhalb eines geöffneten Dokuments:** Ist der aktuelle Umweg über
   „← Formate“ (mit Bestätigungsdialog) das gewünschte Verhalten, oder wird ein direkter
   Menüpunkt im Workspace selbst erwartet (näher am Verhalten von Word/LibreOffice, die
   „Neu“ ohne Verlassen der aktuellen Ansicht anbieten, meist in einem neuen Fenster/Tab)?
6. **Cross-Format-Export (R7, Abschnitt 4):** Priorität für `speichern-unter-format"
   klären — ohne diese Funktion bleibt „Exportierbar als DOCX und als ODT“ aus der
   ursprünglichen Formulierung in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.1 für ein
   einzelnes neu erstelltes Dokument uneingelöst.

---

## 8. Zusammenfassung: Statuskorrektur-Vorschlag

| Teilaspekt | Backlog-Status (bisher) | Nach dieser Prüfung |
|---|---|---|
| Leeres Dokument mit Standard-Absatzformat anlegen | vorhanden | **bestätigt vorhanden** (Abschnitt 3.2) |
| Sofort bearbeitbar ohne weiteren Klick | vorhanden | **unverifiziert / vermutlich nicht erfüllt** — fehlender `view.focus()` (Abschnitt 3.3) |
| A4-Seite mit Standardrändern | vorhanden | **teilweise** — nur Bildschirmanzeige, bei DOCX-Export nicht persistiert (Abschnitt 3.4) |
| Exportierbar als DOCX und ODT (leer, valide) | vorhanden | **unverifiziert** — kein Test gegen unabhängigen Parser (Abschnitt 4, R1/R2) |
| Formatwahl beim Export unabhängig vom Ursprungsformat | (separater Eintrag `speichern-unter-format`: fehlt) | **bestätigt fehlend** für neu erstellte Dokumente (Abschnitt 4, R7) |
| Dokumenttitel beim Neuanlegen setzbar | (separater Eintrag `dokumenteigenschaften`: teilweise) | **bestätigt fehlend** (Abschnitt 3.6) |
| Fehlerbehandlung beim Erstellen (kein stiller Fehlschlag) | — (bisher nicht separat erfasst) | **Lücke identifiziert** — kein `try/catch` im Erstell-Pfad (Abschnitt 3.8) |

**Fazit:** Der Kern der Funktion (leeres, editierbares Dokument mit Standard-Absatz)
existiert und ist plausibel korrekt. Die als selbstverständlich mitgemeinte Zusatz-
Anforderung „sofort bearbeitbar ohne Klick“ ist nach Code-Lage **wahrscheinlich nicht**
erfüllt und muss vorrangig per echtem Browsertest verifiziert werden. Das Seitenformat ist
nur für ODT tatsächlich rundreisefest, für DOCX ausschließlich eine Bildschirm-Simulation
ohne Entsprechung in der Exportdatei. Der Gesamtstatus „vorhanden“ ist daher **nicht ohne
Einschränkung** haltbar, bis die in Abschnitt 7 aufgeführten Punkte entschieden und die
Testfälle aus Abschnitt 6 grün sind.
