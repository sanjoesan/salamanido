# Anforderungen: „Durchgestrichen" (Strikethrough)

Status: **vorhanden, aber nicht vertrauenswürdig — vollständige Verifikation angefordert.**
Diese Datei ist die verbindliche Anforderungsgrundlage für die Verifikation des Features
„Durchgestrichen" aus `specs/FEATURE-BACKLOG.md` (Slug `durchgestrichen`, Abschnitt 2.2
„Zeichenformatierung", Status „vorhanden", Priorität 1; Beschreibung dort: „Schaltet eine
einfache Durchstreichung um."). Sie ergänzt `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 3
(Zeichenformatierung, Zeile „Durchgestrichen: wie Fett") um die für dieses eine Feature
nötige Detailtiefe: jedes Bedienelement, jedes Detailverhalten, jeder Grenzfall und die
Rundreise-Pflicht (DOCX **und** ODT).

Architektur-Grundprinzip bleibt wie im Hauptdokument: DOCX und ODT teilen sich einen
gemeinsamen internen Editor (ProseMirror-Schema, Mark `strike`). Jede Anforderung unten
gilt für **beide** Formate, sofern nicht ausdrücklich anders vermerkt.

**Abgrenzung:** „Doppelt durchgestrichen" ist ein **eigenes** Backlog-Feature
(`durchgestrichen-doppelt`, Status „fehlt", Priorität 4) und **nicht** Teil dieser
Anforderung. Diese Datei betrifft ausschließlich die **einfache** Durchstreichung; der
Umgang mit doppelt durchgestrichenem Fremdmaterial ist hier nur als Import-Grenzfall
(kein Absturz, kein Textverlust) geregelt.

> **Revisionshinweis (diese Fassung).** Diese Datei wurde für den vorliegenden
> Verifikationsdurchlauf nicht nur gelesen, sondern kritisch **gegen den aktuellen
> Codestand und gegen die parallel entstandenen Geschwister-Anforderungen**
> `specs/fett-req.md`, `specs/kursiv-req.md` **und** `specs/unterstrichen-einfach-req.md`
> gegengeprüft — alle vier Zeichenformatierungs-Buttons (F/K/U/S) teilen exakt dieselbe
> `MarkButton`-Komponente und denselben `toggleMark`-Aufruf ohne Optionsargument, weshalb
> eine Entscheidung in einer dieser Dateien die anderen zwingend mitbetrifft. Drei
> substantielle Korrekturen waren nötig, keine ist kosmetisch:
> 1. **Kritischer Widerspruch aufgelöst (Abschnitt 3.3, Grenzfall 5/11/12, neues
>    Risiko 12, höchste Priorität — gleichrangig mit Risiko 11):** Diese Datei verlangte
>    bisher, dass ein Klick auf eine **gemischte** Selektion die Formatierung von der
>    **gesamten** Selektion **entfernt** — das ist exakt das *heutige* `toggleMark`-
>    Verhalten (`removeWhenPresent`-Default `true`), direkt in der installierten
>    Bibliothek verifiziert (`node_modules/prosemirror-commands/dist/index.js:679-699`
>    und `node_modules/prosemirror-model/dist/index.js:1386`, nicht nur aus der
>    `.d.ts`-Doku übernommen). `fett-req.md` (Defekt E) und `kursiv-req.md`
>    (Grenzfall 3.2) haben **denselben** Code an **derselben** Aufrufstelle
>    (`Toolbar.tsx:78`, `WordEditor.tsx:98-100`) unabhängig geprüft und dieses
>    Verhalten als **Defekt** eingestuft, der der Word/LibreOffice-Konvention
>    widerspricht (dort macht der **erste** Klick auf eine gemischte Selektion diese
>    **einheitlich formatiert**, statt sie zu entformatieren) — Fix dort:
>    `removeWhenPresent: false`. Ein unveränderter Abschnitt 3.3 dieser Datei hätte der
>    Fett/Kursiv-Entscheidung **widersprochen** und einen sichtbaren
>    Verhaltensunterschied zwischen benachbarten Toolbar-Buttons verlangt. Korrigiert;
>    die Aktiv-Zustand-Konvention (Grenzfall 11/12, Menüpunkt 2) ist entsprechend auf
>    „Volldeckung" umgestellt (konsistent mit `fett-req.md` Defekt B). **Wichtig:**
>    `specs/durchgestrichen-code.md` Abschnitt 3.6/3.6b wurde vor dieser Korrektur
>    geschrieben und plant versehentlich die jetzt widerrufene „Irgendwo"-Semantik —
>    vor Umsetzung neu abzugleichen.
> 2. **Fixture-Korpus real durchsucht, nicht angenommen (neuer Abschnitt 1.4):** **0
>    von 127** DOCX-Fixtures im Repo enthalten `<w:strike>`/`<w:dstrike>`, aber **3 von
>    202** ODT-Fixtures enthalten echte, vom Originalautor gesetzte Durchstreichung.
>    Abschnitt 5 (Rundreise) und Abnahmekriterium 4 sind entsprechend präzisiert, statt
>    die DOCX-Lücke stillschweigend offenzulassen.
> 3. Kleinere, ausdrücklich als **optional/unverifiziert** gekennzeichnete Ergänzung
>    (Grenzfall 16): `docx/writer.ts` erzeugt `<w:rPr>`-Kindelemente evtl. nicht in der
>    von ECMA-376 vorgeschriebenen Reihenfolge — reine technische Härtung, kein
>    Abnahmekriterium, aus `durchgestrichen-code.md` übernommen und ausdrücklich als
>    von dieser Revision **nicht selbst gegen den Normtext verifiziert** markiert.
>
> **Zusätzliche Revision (dieser Durchlauf).** Sämtliche obigen Aussagen wurden für
> diese Fassung **erneut direkt** gegen den aktuell ausgecheckten Code, die Test-Suite
> und den Fixture-Korpus geprüft (u. a. `schema.ts:176–181`, `Toolbar.tsx:55–89`,
> `WordEditor.tsx:76–134`, `docx/reader.ts:103–107`, `odt/reader.ts:56–108`,
> `styleRegistry.ts:55`, das Fixture-Grepping aus Abschnitt 1.4 inklusive der
> `T11`/`T12`-Stildefinitionen in `character-styles.odt`, sowie die Zeilenangaben zu
> `clipboard-roundtrip.spec.ts`, `docx.spec.ts`, `odt.spec.ts`,
> `fullCoverageDocument.ts` und `roundtrip.test.ts`) — **keine** bestehende Aussage
> musste zurückgenommen werden, alle waren zutreffend. Zwei echte, bislang fehlende
> Ergänzungen wurden vorgenommen:
> 4. **Dritte Geschwister-Anforderung eingearbeitet:** `specs/unterstrichen-einfach-req.md`
>    (Button „U", identische `MarkButton`-Komponente) war bislang nirgends in dieser
>    Datei referenziert, obwohl sie unabhängig **dieselben** Defekte A/B/E bestätigt
>    (dort ebenfalls exakt so benannt) — das ist eine **dritte**, unabhängige
>    Bestätigung des gemeinsamen Komponentendefekts, nicht nur eine zweite. Referenzen
>    dazu sind unten ergänzt (Menüpunkt 1, Grenzfall 15, Risiko 11).
> 5. **Browser-Matrix-Lücke konkretisiert statt nur verlinkt (neue Zeile in 1.1,
>    Testfall 37, Abnahmekriterium 7):** `playwright.config.ts` (direkt verifiziert)
>    schränkt die Projekte „Desktop Firefox (Clipboard)" und „Desktop Safari
>    (Clipboard)" über `testMatch: /clipboard.*\.spec\.ts/` **ausschließlich** auf
>    Kopieren-bezogene Spec-Dateien ein; „Mobile" (Pixel 7, **Chromium**) und „Tablet"
>    (iPad Mini, **WebKit**) laufen dagegen uneingeschränkt in der Vollsuite und tragen
>    keine `permissions: ['clipboard-read', 'clipboard-write']`-Grants (nur „Desktop
>    Chrome" und „Mobile" haben diese). Ein neuer Testfall-37-Test (Tastatur-Aktivierung
>    des „Durchgestrichen"-Buttons) läuft deshalb **nicht automatisch** auf Firefox oder
>    Desktop Safari, nur weil er geschrieben wird — er muss entweder in einer
>    `clipboard.*.spec.ts`-benannten Datei liegen, oder `testMatch`/die Projektliste
>    muss erweitert werden. Bislang stand hier nur ein vager Verweis auf einen
>    „Browser-Matrix-Hinweis" ohne diese konkrete, umsetzungsrelevante Konsequenz.
>    Ergänzend festgehalten: Der bestehende `test.skip(browserName === 'webkit', …)`
>    in der R-7-E2E (Risiko 6/Testfall 28) greift damit **auch** auf dem Tablet-Projekt
>    (WebKit-Engine), nicht nur auf einem hypothetischen eigenständigen „WebKit"-Projekt.

---

## 1. Kontext & Ist-Zustand (verifizierte Codeanalyse)

Der aktuelle Code wurde vor Erstellung dieser Anforderungen **direkt gesichtet** (nicht aus
einem früheren Durchlauf übernommen), damit die Verifikation zielgerichtet an den
tatsächlich vorhandenen Mechanismen ansetzt. Alle Zeilenangaben wurden gegen den aktuellen
Quellstand geprüft; sie können bei künftigen Änderungen driften — im Zweifel gelten die
genannten **Symbolnamen**, nicht die Zeilennummer.

### 1.1 Implementierung (Datenmodell, UI, Import/Export)

| Ebene | Fundstelle (verifiziert) | Befund |
|---|---|---|
| Datenmodell | `src/formats/shared/schema.ts:176–181` (Mark `strike`) | Eigenständige ProseMirror-Mark `strike`. `parseDOM` akzeptiert `<s>`, `<strike>` sowie CSS `text-decoration=line-through`; `toDOM` rendert `['s', 0]` ⇒ `<s>`. |
| Toolbar-Button | `src/formats/shared/editor/Toolbar.tsx:187` | `<MarkButton mark="strike" label="S" title="Durchgestrichen" glyphClassName="line-through" />`. Der Button steht in der Zeichengruppe direkt neben Fett (`:184`), Kursiv (`:185`), Unterstrichen (`:186`). |
| Button-Mechanik | `Toolbar.tsx:55–88` (`MarkButton`) | Aktion via `onMouseDown` + `e.preventDefault()` → `toggleMark(markType)` aus `prosemirror-commands`, danach `view.focus()`. Glyph wird als `<span className="line-through">S</span>` gerendert (`:86`). **Es ist ausschließlich `onMouseDown` gebunden — kein `onClick`, kein `onKeyDown`** (verifiziert: `MarkButton`, `Toolbar.tsx:71–79`, enthält keinen weiteren Event-Handler). Ein natives `<button>` löst bei Tastatur-Aktivierung (Tab-Fokus + Enter/Leertaste) laut HTML-Spezifikation **kein** `mousedown`, sondern ausschließlich ein `click`-Event aus ⇒ der Handler feuert in diesem Fall vermutlich **nicht**. Siehe Risiko 11 — derselbe Befund ist für „Fett" bereits als **Defekt A** in `specs/fett-req.md` Abschnitt 4 dokumentiert, da alle vier Zeichen-Buttons dieselbe `MarkButton`-Komponente teilen. |
| Aktiv-Zustand | `Toolbar.tsx:69` | `active = markType.isInSet(view.state.selection.$from.marks()) !== undefined` — **ausschließlich** aus dem Selektionsanfang `$from.marks()`, **nicht** aus `view.state.storedMarks` und **nicht** aus der gesamten Selektion. `aria-pressed={active}`. |
| Toolbar-Aktualisierung | `src/formats/shared/editor/WordEditor.tsx:117–124` | `dispatchTransaction` ruft nach jeder Transaktion `forceRender(...)` → Toolbar rechnet `active` bei jeder Cursorbewegung neu. |
| Tastenkürzel | `WordEditor.tsx:85–98` (keymap) | Es existieren `Mod-b`/`Mod-i`/`Mod-u` für Fett/Kursiv/Unterstrichen. **Für Durchgestrichen ist kein Tastenkürzel gebunden.** |
| DOCX-Import | `src/formats/docx/reader.ts:107` | `if (firstChildNS(rPr, OOXML_NAMESPACES.w, 'strike')) marks.push({ type: 'strike' })` — prüft nur die **Existenz** von `<w:strike>`, **nicht** dessen `w:val`. Zum Vergleich: die Schwester-Zeile für Unterstrichen (`reader.ts:105–106`) prüft sehr wohl `val !== 'none'`. |
| DOCX-Export | `src/formats/docx/writer.ts:26` | `if (mark.type === 'strike') props.push('<w:strike/>')` — schreibt immer `<w:strike/>` ohne `w:val` (Abwesenheit = aus, Vorhandensein ohne `val` = an). |
| ODT-Import | `src/formats/odt/reader.ts:56–57` (Lesen), `:108` (Mark setzen) | `text-line-through-style` wird aus dem Automatik-Textstil gelesen; `!== 'none'` ⇒ `style.strike = true`. `text-line-through-type` (single/double) wird **ignoriert**. |
| ODT-Export | `src/formats/odt/writer.ts:38` + `src/formats/odt/styleRegistry.ts:55` | Writer setzt `props.strike = true`; StyleRegistry schreibt `style:text-line-through-style="solid" style:text-line-through-type="single"`. |
| Browser-Matrix | `playwright.config.ts:27–54` (verifiziert) | Vollsuite (inkl. `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`) läuft auf **Desktop Chrome**, **Mobile** (Pixel 7, Chromium) und **Tablet** (iPad Mini, **WebKit**). **„Desktop Firefox (Clipboard)"** und **„Desktop Safari (Clipboard)"** sind über `testMatch: /clipboard.*\.spec\.ts/` **ausschließlich** auf Kopieren-Spec-Dateien beschränkt — ein neuer, nicht so benannter Test für „Durchgestrichen" (z. B. Testfall 37) läuft auf diesen beiden Projekten **nicht**, ohne explizite Anpassung. Nur „Desktop Chrome" und „Mobile" erhalten `permissions: ['clipboard-read', 'clipboard-write']`. |

### 1.2 Bestehende Testabdeckung (verifiziert — **nicht** „gar nicht getestet")

Wichtig für die Priorisierung: Für „Durchgestrichen" existiert **mehr** Absicherung als
naiv angenommen. Die folgende Bestandsaufnahme verhindert, dass die QA bereits vorhandene
Tests „neu erfindet", statt die echten Lücken (Abschnitt 6) zu schließen:

| Testart | Fundstelle | Was tatsächlich abgedeckt ist |
|---|---|---|
| DOCX Writer→Reader-Roundtrip (Unit) | `src/formats/docx/__tests__/roundtrip.test.ts:63–84` | Isolierte `strike`-Mark auf eigenem Lauf bleibt erhalten — **nur** Writer↔eigener Reader, nicht gegen Fremdparser, nicht in Kombination. |
| ODT Writer→Reader-Roundtrip (Unit) | `src/formats/odt/__tests__/roundtrip.test.ts:65–84` | dito für ODT. |
| Kombinierte Marks (Unit) | `docx/__tests__/roundtrip.test.ts:86–98` | Ein Kombinationstest existiert, deckt aber **nur** `strong`+`em` ab — **`strike` ist dort nicht enthalten**. |
| DOCX-Import → Render (E2E) | `tests/e2e/docx.spec.ts:302` | Voll-Abdeckungs-Fixture mit `<w:strike/>` (`tests/e2e/fixtures/fullCoverageDocument.ts:119`) → `.ProseMirror s` mit Text „Durchgestrichen" hat Count 1. |
| ODT-Import → Render (E2E) | `tests/e2e/odt.spec.ts:278` | ODT-Fixture mit `text-line-through-style="solid"` (`fullCoverageDocument.ts:177`) → `.ProseMirror s` mit „Durchgestrichen" Count 1. |
| **Echter Button-Klick** (E2E) | `tests/e2e/clipboard-roundtrip.spec.ts:204–211` + `:252–291` (R-7) | Tippt Text, `Strg+A`, klickt **`getByTitle('Durchgestrichen')`**, kopiert, fügt in ein frisches Dokument ein, exportiert DOCX, prüft `<w:strike/>` in `word/document.xml`. **Aber:** DOCX-only, kein Re-Import (nur XML-String-Prüfung), auf WebKit übersprungen (`test.skip`). |
| Unabhängiger Parser DOCX | `src/formats/docx/__tests__/external-validation.test.ts` | Validiert Writer-Ausgabe mit `mammoth` (fremder Parser) — assertiert Heading/`<strong>`/Listen/Tabelle, **aber nicht** die Durchstreichung. |
| Unabhängiger Parser ODT | `src/formats/odt/__tests__/external-validation.test.ts:66` | Das gegen das ODF-Schema geprüfte Voll-Dokument **enthält** einen `strike`-Lauf; eine **gezielte** Assertion auf `text-line-through` (analog zum DOCX-`<strong>`-Fall) fehlt — die Durchstreichung wird also mitvalidiert (Datei muss gültig sein), aber nicht eigens auf Erhalt geprüft. |

### 1.3 Konsequenz

Der Backlog-Status „vorhanden" ist für die reine Existenz **und** eine Grundabsicherung
zutreffend. Nicht belegt sind hingegen: die **Grenzfälle** (v. a. importierte Fremddateien
mit explizit ausgeschalteter/geerbter oder doppelter Durchstreichung), die **Kombination**
mit anderen Marks im selben Lauf, die Funktion **innerhalb von Tabellen/Listen/Überschriften**,
die **Rundreise mit Re-Import** (die vorhandene E2E prüft nur exportiertes XML, liest es
nicht wieder ein), das **ODT-Pendant** zum Button-Klick-E2E, sowie mehrere **UI-Feinheiten**
(Aktiv-Zustand, Icon-Rendering, fehlendes Tastenkürzel). Abschnitt 6 listet die daraus
abgeleiteten konkreten Verdachtsmomente.

### 1.4 Verifizierter Fixture-Korpus (DOCX vs. ODT) — reale Asymmetrie

Für diese Revision wurde der vorhandene externe Testkorpus (`tests/fixtures/external/`)
**programmatisch durchsucht** (nicht angenommen), weil Abschnitt 5 reale Fremddateien
verlangt und deren tatsächliche Verfügbarkeit die Erfüllbarkeit dieser Anforderung direkt
bestimmt:

- **DOCX** (`tests/fixtures/external/docx/`, 127 Dateien): **0** enthalten `<w:strike>`
  oder `<w:dstrike>` in `word/document.xml`. Es existiert also **aktuell kein** realer,
  außerhalb dieser App erzeugter DOCX-Testkandidat mit Durchstreichung im vorhandenen
  Korpus — weder für den Normalfall (Testfall 23) noch für den `w:val="0"`-Grenzfall
  (Testfall 25).
- **ODT** (`tests/fixtures/external/odt/`, 202 Dateien): **3** enthalten echte, vom
  Original-Autor gesetzte Durchstreichung (`text-line-through-style="solid"`):
  `character-styles.odt` (Stil `T11`, `type="single"`, umschließt „Lorem ipsum";
  **zusätzlich** Stil `T12`, `type="double"`, ebenfalls „Lorem ipsum" — deckt Grenzfall 3
  direkt mit echtem Fremdmaterial ab, statt ihn nur synthetisch nachzubilden),
  `feature_attributes_character_MSO15.odt`, `listStyleId.odt`. Mindestens zehn weitere
  Dateien (u. a. `compdocfileformat.odt`, `excelfileformat.odt`, `HeaderFooter.odt`,
  `OOStyledTable.odt`) tragen ausschließlich `="none"` — nutzbar als reale Belege für
  Grenzfall 2 (Testfall 26).

**Konsequenz für Abschnitt 5/Abnahmekriterium 4:** Die ODT-Seite der Rundreise-Anforderung
ist mit echtem, unverändertem Fremdmaterial erfüllbar; die DOCX-Seite **nicht**, solange
kein zusätzlicher Fixture beschafft wird. Das ist **kein** Kriterium, das deswegen
stillschweigend entfällt — siehe die präzisierten Vorgaben in Abschnitt 5, Punkte 1 und 9.

---

## 2. Menüpunkte / Bedienelemente (Soll)

| # | Element | Ort | Soll-Verhalten |
|---|---|---|---|
| 1 | Toolbar-Button „Durchgestrichen" | Formatierungsleiste, Gruppe Zeichenformatierung (neben Fett/Kursiv/Unterstrichen) | Klick schaltet die Mark auf der aktuellen Selektion bzw. an der Schreibmarke um (Toggle). Muss unabhängig von der Selektionsmethode (Maus-Ziehen, Doppel-/Dreifachklick, Umschalt+Pfeil, „Alles auswählen") funktionieren. Auslösung per `onMouseDown`+`preventDefault` (Fokus bleibt im Editor, Selektion geht nicht verloren) ist beizubehalten. **Zusätzlich muss der Button per Tastatur bedienbar sein:** Tab-Fokus auf den Button, danach Enter **oder** Leertaste, muss dieselbe Umschaltung auslösen wie ein Mausklick (Barrierefreiheits-Grundanforderung, WCAG 2.1.1). **Verdacht, noch offen (siehe 4.15/Risiko 11):** Da ausschließlich `onMouseDown` gebunden ist und ein natives `<button>` bei Tastatur-Aktivierung kein `mousedown`, sondern nur `click` auslöst, wirkt der Button vermutlich **nur** per Maus/Touch, nicht per Tastatur — zu verifizieren, nicht zu unterstellen (derselbe Verdacht ist für „Fett" und „Unterstrichen" unabhängig als „Defekt A" bestätigt, siehe `fett-req.md`/`unterstrichen-einfach-req.md` Abschnitt 4 bzw. 5). |
| 2 | Aktiv-Zustand (`aria-pressed`, visuelle Hervorhebung) | derselbe Button | Zeigt an, ob der Text an der relevanten Position bereits durchgestrichen ist, und aktualisiert sich sofort bei Cursorbewegung. **Verbindliche Anzeige-Konvention (festgelegt in dieser Revision, siehe 3.3/4.11/4.12, abgestimmt mit `fett-req.md` Defekt B und `kursiv-req.md` 3.2):** Bei leerer Schreibmarke gilt `storedMarks ?? $from.marks()` (Grenzfall 12). Bei nicht-leerer Selektion gilt „Volldeckung" — aktiv nur, wenn **jede** Textstelle im selektierten Bereich die Mark trägt, **nicht** schon bei irgendeinem Treffer. Diese Konvention ist die logische Kehrseite des in 3.3 korrigierten Toggle-Verhaltens (`removeWhenPresent: false`): „aktiv" zeigt exakt an, dass ein Klick als Nächstes **entfernen** würde; „inaktiv" (auch bei teilweiser Formatierung), dass ein Klick die **gesamte** Selektion einheitlich anwenden würde. Aktuell (`Toolbar.tsx:69`) wird nur `$from.marks()` ausgewertet — weder `storedMarks` noch die restliche Selektion fließen ein; das ist damit ein **bestätigter Defekt**, kein offener Verdacht (siehe Risiko 3/12). |
| 3 | Icon/Beschriftung | derselbe Button | Aktuell reiner Buchstabe „S" mit CSS-Klasse `line-through` auf dem Buchstaben. Muss auf allen Zielsystemen eindeutig von den Nachbar-Buttons (F/K/U) unterscheidbar sein und dem Icon-Rendering-Vorbehalt aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 17/20 genügen (Prüfung auf System ohne besondere Font-/Emoji-Unterstützung; ggf. Umstellung auf verlässliches SVG-Icon). |
| 4 | Tastenkürzel | Editor, global bei Fokus im Dokument | **Muss explizit entschieden und dokumentiert werden** (siehe 3.6). Aktuell keines vorhanden, obwohl Fett/Kursiv/Unterstrichen je eines haben. Diese Inkonsistenz gilt als zu klärender Punkt, nicht als akzeptierter Zielzustand. |
| 5 | Tooltip / `aria-label` | derselbe Button | `title="Durchgestrichen"` und `aria-label="Durchgestrichen"` sind vorhanden (`Toolbar.tsx:73–74`) — müssen per Hover sichtbar und per Screenreader vorgelesen werden. |
| 6 | Kontextmenü/Rechtsklick | — | Kein eigenes Rechtsklick-Kontextmenü im Scope (das native Browser-Kontextmenü bleibt bewusst erreichbar). Falls künftig ein eigenes eingeführt wird, muss „Durchgestrichen" dort ebenfalls erscheinen. |
| 7 | Touch-/Zeigerbedienung (Mobile/Tablet) | derselbe Button | Der Button muss auch per Touch/Pointer bedienbar sein und dasselbe Ergebnis liefern wie per Maus. Der Auslöser ist `onMouseDown`+`preventDefault` (`Toolbar.tsx:76–79`); auf Touch-Geräten entsteht `mousedown` nur als synthetisiertes Folge-Event nach `pointerdown`/`touchstart`, und `preventDefault` auf `mousedown` darf den Tap nicht verschlucken. Bei schmalem Viewport, in dem die Toolbar umbricht/scrollt, muss der Button erreichbar bleiben. Verifikation auf den vorhandenen Mobile-/Tablet-Playwright-Projekten (vgl. `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8, Testfall 5: Kernfunktionen inkl. Zeichenformatierung müssen auf Mobile-Viewport bedienbar bleiben). |

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Anwenden auf eine bestehende Selektion
- Text markieren (Maus, Doppelklick, Dreifachklick, Umschalt+Pfeil, Strg+A) → Klick auf
  „Durchgestrichen" → gesamte Selektion wird sichtbar durchgestrichen dargestellt.
- Ergebnis identisch, unabhängig von der Selektionsmethode.
- Gilt auch für eine Selektion über mehrere Absätze/Listenpunkte/Tabellenzellen hinweg
  (jede betroffene Textstelle erhält die Mark).

### 3.2 Anwenden an der Schreibmarke ohne Selektion
- Cursor ohne Selektion positionieren → „Durchgestrichen" aktivieren → **nachfolgend
  getippter Text** wird durchgestrichen; bereits vorhandener umgebender Text (davor **und**
  danach) bleibt unverändert (ProseMirror `storedMarks`).
- Bewegt sich der Cursor (Pfeiltasten, Mausklick), bevor der Zustand „verbraucht" wurde,
  muss der noch nicht getippte Zustand an der neuen Position neu bewertet werden
  (Standard-`storedMarks`-Verhalten). Dies ist **explizit zu testen**, nicht anzunehmen.
- **Konsistenz-Anforderung:** Solange der `storedMarks`-Zustand aktiv ist, soll der
  Toolbar-Button dies möglichst korrekt anzeigen (siehe 2.2/4.12) — mindestens darf das
  tatsächliche Tippverhalten nicht von der Button-Anzeige abweichen, ohne dass diese
  Abweichung bewusst dokumentiert ist.

### 3.3 Umschalten (Toggle) — Ein und Aus
- Erneuter Klick bei bereits durchgestrichenem Text entfernt die Formatierung vollständig.
- Bei **gemischter** Selektion (teils durchgestrichen, teils normal) muss `toggleMark` sein
  Standardverhalten liefern und dies ist **explizit** zu verifizieren: „Ist **irgendein**
  Zeichen der Selektion bereits durchgestrichen, entfernt der Klick die Formatierung von der
  **gesamten** Selektion; nur wenn **kein** Zeichen durchgestrichen ist, wird sie auf die
  gesamte Selektion angewendet." Nicht bloß annehmen, weil `toggleMark` verwendet wird.

### 3.4 Kombination mit anderen Formaten
- Durchgestrichen muss gleichzeitig mit Fett, Kursiv, Unterstrichen, Schriftfarbe und
  Hervorhebungsfarbe auf **demselben** Textlauf bestehen können, ohne dass sich die Marks
  gegenseitig verdrängen.
- Die Reihenfolge des Anwendens (z. B. erst Fett dann Durchgestrichen vs. umgekehrt) darf
  das Ergebnis nicht verändern.
- Hinweis: Der vorhandene Kombinationstest deckt nur `strong`+`em` ab (siehe 1.2) — die
  Kombination **mit `strike`** ist neu abzusichern.

### 3.5 Visuelle Darstellung
- Im Editor: sichtbare horizontale Linie durch die Textmitte (`<s>`-Rendering), ohne
  Verschiebung der Zeilenhöhe.
- Kombination „unterstrichen **und** durchgestrichen" gleichzeitig: beide Linien müssen
  optisch unterscheidbar bleiben (nicht deckungsgleich/verschmolzen) — expliziter
  Sichtprüfungs-Testfall, sowohl im Editor als auch nach Rundreise.

### 3.6 Tastenkürzel (offene Entscheidung — zu treffen)
- **Verbindlich festzulegen:** Entweder wird ein Tastenkürzel ergänzt (Analogie zu
  `Mod-b`/`Mod-i`/`Mod-u`; gängige Kandidaten `Mod-Shift-x` oder `Mod-Shift-s`, wie in
  mehreren verbreiteten Web-Editoren), oder das Fehlen wird bewusst als Soll-Zustand
  dokumentiert (Word und LibreOffice haben werksseitig ebenfalls keinen globalen
  Standard-Shortcut für einfache Durchstreichung). Diese Datei fordert **keine** vorgegebene
  Antwort, verlangt aber, dass die Entscheidung getroffen, umgesetzt und mit einem
  Test/Codekommentar nachvollziehbar gemacht wird. Der aktuelle Zustand („kommentarlos
  fehlend") ist **nicht** akzeptabel.
- Falls ein Kürzel ergänzt wird: Es darf keines der bestehenden Bindings (`Mod-z`, `Mod-y`,
  `Mod-Shift-z`, `Enter`, `Shift-Enter`, `Mod-b/i/u`, `Shift-Delete`) und keinen nativen
  Clipboard-Pfad (bewusst **nicht** gebundenes `Mod-c/x/v`, siehe `WordEditor.tsx:78–84`)
  überschreiben.

### 3.7 Entfernen der Formatierung
- Toggle-Aus funktioniert identisch zuverlässig wie Toggle-Ein (siehe 3.3).
- Eine globale Funktion „Formatierung löschen" (`formatierung-loeschen`, Status „fehlt")
  existiert noch nicht — bis dahin ist der Toolbar-Button der **einzige** Weg, Durchgestrichen
  zu entfernen. Das muss auch auf **importiertem** Text zuverlässig funktionieren, nicht nur
  auf frisch in derselben Sitzung getipptem Text.

### 3.8 Interaktion mit Listen, Tabellen, Überschriften
- Durchgestrichen muss innerhalb einer Listenzeile (Bullet und nummeriert), innerhalb einer
  Tabellenzelle und innerhalb einer Überschrift (Ebene 1–6) identisch funktionieren wie in
  einem normalen Absatz — keine Sonderbehandlung, kein stiller Ausschluss, keine Nebenwirkung
  auf Nachbarzellen/andere Absätze. (Diese Kontexte sind aktuell **nicht** getestet, siehe 1.2.)

### 3.9 Undo/Redo & Selektions-Stabilität
- Anwenden und Entfernen von Durchgestrichen sind jeweils **einzelne**, undoable Schritte
  (`Strg+Z` macht genau diesen einen Formatwechsel rückgängig, `Strg+Y`/`Strg+Shift+Z`
  wiederholt ihn).
- Die Regressionsgefahr aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 (Selection-Sync-Bug) gilt
  hier ausdrücklich: „Alles auswählen" → Durchgestrichen → Klick-Neupositionierung → Enter →
  weiter tippen darf **keine** Dokumentteile verschlucken. Die vorhandene Absicherung
  (`tests/e2e/selection-regression.spec.ts`) ist auf diese Formatierung zu übertragen bzw.
  als abgedeckt nachzuweisen.

---

## 4. Grenzfälle

1. **DOCX `<w:strike>` mit explizit ausgeschaltetem `w:val`** (`w:val="false"`, `"0"` oder
   `"off"`) — z. B. aus echtem Word, das eine geerbte Formatvorlage lokal wieder ausschaltet.
   Der aktuelle Reader (`docx/reader.ts:107`) prüft nur die **Existenz** des Elements und
   würde eine solche Datei **fälschlich als durchgestrichen** importieren. Der korrekte Test
   ist „Element vorhanden **und** `w:val` ∉ {`false`,`0`,`off`}" (ST_OnOff; Abwesenheit von
   `w:val` = an). **Das Vorbild steht bereits eine Zeile höher:** die Unterstrichen-Behandlung
   (`reader.ts:105–106`) guardt `val !== 'none'`. Muss geprüft und mit hoher Wahrscheinlichkeit
   korrigiert werden. Der Fix muss rückwärtskompatibel bleiben (unser eigener Writer schreibt
   `<w:strike/>` **ohne** `val` → muss weiterhin als „an" gelesen werden).
2. **ODT `style:text-line-through-style="none"` explizit gesetzt** (Gegenstück zu Fall 1):
   Laut Code (`odt/reader.ts:57`, `!== 'none'`) korrekt als „nicht durchgestrichen" behandelt
   — Testfall zur **Bestätigung** nötig (bisher nur durch Codelesen belegt).
3. **Doppelt durchgestrichenes Fremdmaterial — asymmetrisches Ist-Verhalten, zu vereinheitlichen
   und zu dokumentieren:**
   - **DOCX** `<w:dstrike/>` ist ein **anderes** Element als `<w:strike/>`. Der Reader prüft
     nur `<w:strike>`; ein Lauf mit **ausschließlich** `<w:dstrike/>` wird daher als **gar nicht
     durchgestrichen** importiert (Text bleibt, Durchstreichung geht **vollständig verloren**).
   - **ODT** `text-line-through-type="double"` hat weiterhin `text-line-through-style="solid"`
     (≠ `none`) → wird als **einfach** durchgestrichen importiert (Linie bleibt, Verdopplung
     wird verworfen).
   Beide Fälle dürfen **nicht** abstürzen und **keinen Textverlust** verursachen. Da „doppelt
   durchgestrichen" laut Backlog (`durchgestrichen-doppelt`) **nicht** im Umfang liegt, ist ein
   Fallback auf „einfach durchgestrichen" das **gewünschte, konsistente** Zielverhalten für
   **beide** Formate (statt beim DOCX-Fall die Durchstreichung ganz zu verlieren). Diese
   Entscheidung ist umzusetzen oder — falls bewusst anders — ausdrücklich zu dokumentieren.
3a. **Dekorative ODT-Linienstile (`dotted`, `dash`, `long-dash`, `dot-dash`,
    `dot-dot-dash`, `wave` …) — Verallgemeinerung von Fall 3:** Der Reader
    (`odt/reader.ts:57`) wertet **ausschließlich** `!== 'none'` aus; **jeder** von `none`
    verschiedene `text-line-through-style` (und jeder `-type`, `-width`, `-color`) kollabiert
    daher absichtlich auf die **eine, einfache** `strike`-Mark. Das ist der **gleiche
    dokumentierte Fallback** wie für „doppelt" (kein eigenes Schema-Attribut, kein Textverlust,
    kein Absturz). Beim **Export** entsteht wieder `style:text-line-through-style="solid"
    style:text-line-through-type="single"` (`styleRegistry.ts:55`) — der dekorative
    Ursprungsstil ist bei Rundreise also erwartungsgemäß **nicht** erhalten (zu dokumentieren,
    kein Bug). DOCX kennt kein Gegenstück (`<w:strike>` ist rein boolesch, ohne Linienstil),
    weshalb dieser Grenzfall ODT-spezifisch ist.
4. **Leere Selektion / leerer Absatz:** Umschalten ohne jegliche Selektion in einem leeren
   Absatz darf keinen JS-Fehler auslösen; der Zustand muss beim nächsten Tippen sichtbar
   korrekt angewendet werden.
5. **Selektion über eine Formatierungsgrenze hinweg** (z. B. halb fett, halb durchgestrichen,
   halb beides): Ergebnis nach Toggle muss nachvollziehbar und mit 3.3 konsistent sein.
6. **Copy/Paste von extern durchgestrichenem Text** (aus echter Word-Datei oder Webseite mit
   `<s>`/`<strike>`/`text-decoration:line-through`): Die Mark muss beim Einfügen erhalten
   bleiben. Die `parseDOM`-Regeln (`schema.ts:177`) decken alle drei Quellformen ab — Testfall
   mit **echtem Browser-Clipboard** zur Bestätigung nötig (nicht nur synthetisch).
7. **Unterstrichen + Durchgestrichen gleichzeitig** — visuelle Unterscheidbarkeit im Editor
   **und** nach Rundreise-Export/Reimport (siehe 3.5).
8. **Durchgestrichener Text in Kopf-/Fußzeile** — sobald Kopf-/Fußzeile über die UI editierbar
   ist (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9, aktuell fehlende UI-Funktion): Format muss dort
   identisch funktionieren; bis dahin gilt dieser Fall als nicht testbar und ist **explizit** so
   zu vermerken, nicht stillschweigend auszulassen.
9. **Sehr lange Selektion über viele Seiten** — kein spürbares Einfrieren beim Umschalten.
10. **Wiederholtes schnelles Klicken** (Doppel-/Mehrfachklick auf den Button) — darf nicht zu
    inkonsistentem Zwischenzustand führen (z. B. Mark an manchen, nicht an anderen Zeichen).
11. **Nicht-uniforme Mehrfachselektion & Button-Anzeige:** `aria-pressed` wird nur aus
    `$from.marks()` (Selektionsanfang) berechnet (`Toolbar.tsx:69`). Bei einer Selektion, die
    vorne durchgestrichen beginnt, überwiegend aber normal ist, zeigt der Button „aktiv",
    obwohl ein Klick de facto entfernt — und umgekehrt. Verhalten verifizieren und die
    gewünschte Anzeige-Konvention festlegen (z. B. Analogie zu Word/LibreOffice).
12. **Aktiv-Zustand an leerer Schreibmarke (`storedMarks`):** Nach „Durchgestrichen" an leerem
    Cursor ist die Mark in `view.state.storedMarks` vorgemerkt, `$from.marks()` enthält sie
    aber (noch) nicht → der Button zeigt vermutlich **nicht** „aktiv", obwohl das nächste
    getippte Zeichen durchgestrichen wird. Diese Diskrepanz ist zu verifizieren und entweder
    zu beheben (Anzeige aus `storedMarks ?? $from.marks()`) oder bewusst zu dokumentieren.
13. **Track-Changes-Kompatibilität (Zukunftsfall):** Änderungsverfolgung
    (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 13) markiert Löschungen ebenfalls durchgestrichen.
    Sobald sie existiert, darf „Durchgestrichen" als reguläre Formatierung nicht mit der
    Lösch-Markierung verwechselbar sein. Für die aktuelle Verifikation genügt, dass diese
    Abgrenzung **dokumentiert** ist — keine Implementierung nötig.
14. **Touch-/Zeigerbedienung auf Mobile-/Tablet-Viewport:** Der `onMouseDown`+`preventDefault`-
    Auslöser (`Toolbar.tsx:76–79`) ist für Maus-Interaktion ausgelegt. Auf Touch-Geräten muss
    der Button dennoch zuverlässig auslösen (synthetisiertes `mousedown` nach
    `pointerdown`/`touchstart`), ohne dass `preventDefault` den Tap oder die Editor-Selektion
    verschluckt und ohne dass Fokuswechsel/virtuelle Tastatur die „Alles auswählen"-Selektion
    zerstören. Bricht die Toolbar auf schmalem Viewport um oder scrollt sie, muss der Button
    trotzdem erreichbar bleiben (kein Abschneiden ohne Scrollmöglichkeit). Zu verifizieren auf
    den bereits vorhandenen Mobile-/Tablet-Playwright-Projekten (das Repo pflegt aktiv
    Mobile-Project-E2E-Tests), konsistent mit `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8. Dieser
    Fall ist bislang für „Durchgestrichen" **nicht** abgedeckt.
15. **Tastatur-Fokus + Enter/Leertaste (kein Mausklick, kein Touch) — verifiziert als
    konkreter Codebefund, nicht bloß vermutet:** `MarkButton` (`Toolbar.tsx:55–89`) bindet
    **ausschließlich** `onMouseDown`; es existiert **kein** `onClick`- und **kein**
    `onKeyDown`-Handler auf dem `<button>`. Nach HTML-Spezifikation löst ein natives
    `<button>` bei Tastatur-Aktivierung (Enter-Keydown bzw. Leertaste-Keyup, während der
    Button per Tab fokussiert ist) **kein** `mousedown`-Event aus, sondern ausschließlich ein
    synthetisches `click`. Der Umschalt-Handler hängt aber gerade an `mousedown`, nicht an
    `click`. Ein rein tastaturgestützter Nutzer (Tab zum Button, dann Enter/Leertaste, ohne
    Maus/Touch) kann „Durchgestrichen" damit vermutlich **nicht** auslösen — der Editor selbst
    bleibt zwar über `Mod-b`/`Mod-i`/`Mod-u`-Tastenkürzel bedienbar, aber **der Button** wäre
    für diesen Bedienweg funktionslos. Das ist derselbe Codepfad, der in `specs/fett-req.md`
    Abschnitt 4 („Defekt A") für den Nachbar-Button „Fett" und in
    `specs/unterstrichen-einfach-req.md` (ebenfalls „Defekt A") für „Unterstrichen"
    bereits benannt ist — alle vier Buttons teilen exakt dieselbe `MarkButton`-Komponente,
    der Befund ist daher nicht auf „Fett"/„Unterstrichen" beschränkt, sondern dreifach
    unabhängig für dieselbe Codestelle bestätigt. Muss per echtem
    Playwright-`page.keyboard`-Fokuswechsel (nicht `.click()`)
    verifiziert und, falls bestätigt, behoben werden (übliches Muster: Toggle-Logik nach
    `onClick` verlagern, `onMouseDown` behält nur `e.preventDefault()` gegen Fokus-/
    Selektionsverlust bei Maus-Bedienung).

---

## 5. Rundreise-Anforderung (DOCX **und** ODT — Pflichtbestandteil)

Grundprinzip aus `FEATURE-SPEC-DOCX-ODT.md`: „Datei A hochladen → unverändert exportieren →
Ergebnis entspricht inhaltlich A." Für „Durchgestrichen" bedeutet das konkret:

1. **DOCX-Rundreise (Upload unverändert):** Eine reale, **außerhalb** dieser App erzeugte
   DOCX-Datei mit mindestens einer durchgestrichenen Textstelle importieren → **ohne jede
   Bearbeitung** exportieren → **erneut importieren** → die Textstelle ist inhaltlich (Text
   **und** Strike-Zustand) identisch. Die Re-Import-/Re-Render-Prüfung ist Pflicht — eine
   reine XML-String-Prüfung des Exports (wie in der vorhandenen R-7-E2E) genügt **nicht**.
2. **ODT-Rundreise (Upload unverändert):** dasselbe mit einer realen ODT-Datei (idealerweise
   aus echtem LibreOffice Writer, nicht aus dieser App selbst).
3. **Rundreise nach eigener Bearbeitung (DOCX):** neues/importiertes Dokument, Text im Editor
   durchstreichen → DOCX-Export → Reimport → Strike-Zustand und exakter Textinhalt erhalten.
4. **Rundreise nach eigener Bearbeitung (ODT):** dasselbe für ODT.
5. **Cross-Format DOCX → ODT:** DOCX mit durchgestrichenem Text → als ODT exportieren →
   reimportieren → Strike-Zustand erhalten.
6. **Cross-Format ODT → DOCX:** umgekehrt ebenso.
7. **Doppelte Cross-Format-Rundreise DOCX → ODT → DOCX** an einem Dokument mit Durchgestrichen
   **kombiniert** mit Fett/Kursiv/Farbe → **kein** kumulativer Verlust der Strike-Information
   über zwei Konvertierungen hinweg.
8. **Validierung gegen unabhängigen Parser (kein Selbstbetrug):** Der exportierte
   `<w:strike/>` (DOCX) bzw. `style:text-line-through-style="solid"` (ODT) muss zusätzlich
   gegen eine **vom eigenen Reader unabhängige** Prüfung bestätigt werden. Für DOCX ist der
   `mammoth`-Harness bereits vorhanden (`docx/__tests__/external-validation.test.ts`), assertiert
   die Durchstreichung aber noch **nicht** — er ist um eine Strike-Assertion zu **erweitern**.
   Für ODT ist der Strike-Lauf bereits im validierten Dokument enthalten
   (`odt/__tests__/external-validation.test.ts:66`); eine **gezielte** Erhalt-Assertion ist zu
   ergänzen (siehe `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19).
9. **Reale Fremddatei mit „explizit aus"-Encoding:** Mindestens eine reale DOCX-Datei mit
   `<w:strike w:val="0"/>`/`"false"`/`"off"` importieren → Ergebnis muss **nicht** durchgestrichen
   sein (Grenzfall 1) — aktuell vermutlich ein Fehlerfall.
10. **Reale Fremddatei mit doppelter Durchstreichung** (`w:dstrike` bzw. ODT `type="double"`)
    → kein Absturz, kein Textverlust, Fallback „einfach durchgestrichen" für **beide** Formate
    (Grenzfall 3).

---

## 6. Risikoliste / Verdachtsmomente (verifiziert — Priorität für die QA)

Diese Liste benennt die aus der **direkten** Codeanalyse abgeleiteten Punkte, die die QA
gezielt bestätigen oder widerlegen muss. Sie ersetzt nicht Abschnitt 7, sondern lenkt die
Priorität. (Frühere, inzwischen widerlegte Annahmen sind am Ende ausdrücklich als solche
gekennzeichnet, damit sie nicht erneut aufgegriffen werden.)

**Echte, offene Risiken:**

1. **DOCX-Import ignoriert `w:val` von `<w:strike>`** (`docx/reader.ts:107`) — importiert
   explizit ausgeschaltete/geerbte Durchstreichung fälschlich als „an". Das Fix-Muster liegt
   bereits eine Zeile höher (Unterstrichen-Guard `val !== 'none'`). **Höchste Priorität**, da
   reale Word-Dateien diesen Fall erzeugen; vorhandene Tests decken ihn nicht ab, weil der
   eigene Writer ihn nie produziert.
2. **Doppelte Durchstreichung asymmetrisch behandelt** — DOCX `w:dstrike` geht komplett
   verloren, ODT-Doppellinie wird auf einfach reduziert (Grenzfall 3). Verhalten feststellen
   und auf einen konsistenten, dokumentierten Fallback bringen.
3. **Aktiv-Zustand des Buttons unvollständig** — nur aus `$from.marks()`, weder `storedMarks`
   (leere Schreibmarke, Grenzfall 12) noch die restliche Selektion (Grenzfall 11) fließen ein.
4. **Kombination `strike` + andere Marks im selben Lauf ungetestet** — der vorhandene
   Kombinationstest deckt nur `strong`+`em` ab (`roundtrip.test.ts:86–98`).
5. **`strike` in Tabelle/Liste/Überschrift ungetestet** — weder Unit noch E2E prüfen diese
   Kontexte (die Voll-Fixture setzt `strike` nur auf einem eigenen Absatz-Lauf).
6. **Re-Import in der Button-Klick-E2E fehlt** — R-7 (`clipboard-roundtrip.spec.ts`) prüft nur
   exportiertes XML, liest die Datei nicht wieder ein; zudem DOCX-only und auf WebKit
   übersprungen. Ein ODT-Pendant über den Export-Button fehlt ganz.
7. **Unabhängige Parser-Validierung assertiert `strike` (noch) nicht** — DOCX-`mammoth`-Test
   prüft die Durchstreichung nicht; ODT-Test enthält sie im Dokument, prüft sie aber nicht
   gezielt (siehe 1.2 / 5.8).
8. **Kein Tastenkürzel, keine dokumentierte Absicht** — Inkonsistenz zu den drei Nachbar-Buttons.
9. **Icon „S" mit CSS-`line-through`** — Rendering-Risiko gemäß `FEATURE-SPEC-DOCX-ODT.md`
   Abschnitt 17/20; für „S" zusätzlich, da die CSS-Durchstreichung selbst je nach Font/Browser
   abweichen könnte.
10. **Touch-/Mobile-Bedienbarkeit des Buttons ungetestet** — der Auslöser ist `onMouseDown`
    (`Toolbar.tsx:76`); ob er unter Touch/Pointer zuverlässig togglet und `preventDefault` den
    Tap nicht verschluckt, ist für „Durchgestrichen" nicht abgedeckt, obwohl das Repo aktive
    Mobile-/Tablet-E2E-Projekte pflegt und `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8 die
    Bedienbarkeit der Zeichenformatierung auf Mobile-Viewport ausdrücklich fordert (Grenzfall 14).
11. **Höchste Priorität, neu identifiziert — Button vermutlich nicht per Tastatur auslösbar**
    (Grenzfall 15): `MarkButton` bindet ausschließlich `onMouseDown` (`Toolbar.tsx:76–79`), kein
    `onClick`/`onKeyDown`. Ein natives `<button>` feuert bei Tastatur-Aktivierung (Tab-Fokus +
    Enter/Leertaste) laut HTML-Spezifikation kein `mousedown`, sondern nur `click`. Damit ist der
    „Durchgestrichen"-Button vermutlich nur per Maus/Touch bedienbar, nicht rein per Tastatur —
    ein Verstoß gegen die in Menüpunkt 1 (Abschnitt 2) geforderte Tastaturbedienbarkeit und gegen
    WCAG 2.1.1. Derselbe Defekt ist in `specs/fett-req.md` Abschnitt 4 („Defekt A") für den
    baugleichen „Fett"-Button und in `specs/unterstrichen-einfach-req.md` (ebenfalls
    „Defekt A") für „Unterstrichen" bereits dokumentiert (gemeinsame Komponente, damit
    dreifach unabhängig bestätigt) — hier eigens gelistet, weil diese Datei nur
    „Durchgestrichen" zum Gegenstand hat und der Befund unabhängig reproduzierbar/behebbar
    sein muss, auch falls „Fett"/„Unterstrichen" separat bearbeitet werden.

**Bereits widerlegte Annahmen (nicht erneut als Lücke behandeln):**

- ~~„Es gibt keinen E2E-Test, der den Durchgestrichen-Button klickt."~~ **Falsch:** R-7 in
  `clipboard-roundtrip.spec.ts:204–211/252–291` klickt `getByTitle('Durchgestrichen')` real im
  Browser (Lücke ist nur der fehlende Re-Import + ODT-Pendant, siehe Risiko 6).
- ~~„Import wird gar nicht per E2E geprüft."~~ **Falsch:** `docx.spec.ts:302` und
  `odt.spec.ts:278` prüfen das Render von `<s>` aus Voll-Fixtures für beide Formate.
- ~~„Unit-Tests prüfen nur isolierte Einzel-Marks."~~ **Teilweise falsch:** ein
  Kombinationstest existiert, deckt aber `strike` nicht ab (siehe Risiko 4).

---

## 7. Testfälle (Gesamtübersicht — abzuhaken durch den QA-Agenten)

Legende: **[vorh.]** = bereits (mind. teilweise) abgedeckt, Fundstelle in Klammern —
Nachweis/ggf. Erweiterung genügt; **[neu]** = fehlt und ist zu ergänzen.

1. **[vorh. teilw.]** Text markieren (Maus-Ziehen) → „Durchgestrichen" → sichtbar durchgestrichen.
2. **[neu]** Doppelklick (Wort) → Toggle → nur das Wort betroffen.
3. **[neu]** Dreifachklick (Absatz) → Toggle → ganzer Absatz betroffen.
4. **[neu]** „Alles auswählen" (Strg+A) → Toggle → gesamtes Dokument betroffen; **inkl.
   Regressionssequenz** (danach Klick-Neupositionierung + Enter + Tippen → beide entstehenden
   Absätze bleiben erhalten; vgl. `selection-regression.spec.ts`).
5. **[neu]** Cursor ohne Selektion → Toggle an → tippen → nur neuer Text durchgestrichen,
   Text davor **und** danach unverändert.
6. **[neu]** Erneuter Klick (Toggle aus) auf durchgestrichenem Text → Formatierung verschwindet
   vollständig.
7. **[neu]** Gemischte Selektion (teils durchgestrichen, teils nicht) → Klick → einheitliches,
   in 3.3 dokumentiertes Ergebnis.
8. **[neu]** Kombination `strike` + Fett + Kursiv + Schriftfarbe auf **demselben** Lauf → alle
   gleichzeitig sichtbar und rundreisefest.
9. **[neu]** Unterstrichen + Durchgestrichen gleichzeitig → beide Linien optisch unterscheidbar
   (Editor und nach Rundreise).
10. **[neu]** Button zeigt „aktiv", wenn Cursor (ohne Selektion) in durchgestrichenem Text steht.
11. **[neu]** Button-Zustand an leerer Schreibmarke nach Toggle-An (Grenzfall 12) → Anzeige vs.
    tatsächliches Tippverhalten konsistent oder dokumentiert.
12. **[neu]** Button-Zustand bei nicht-uniformer Mehrfachselektion (Grenzfall 11) → Verhalten
    wie festgelegt.
13. **[neu]** Durchstreichen in Bullet- **und** nummerierter Listenzeile → wie normaler Absatz.
14. **[neu]** Durchstreichen in einer Tabellenzelle → identisch, keine Nebenwirkung auf
    Nachbarzellen.
15. **[neu]** Durchstreichen in Überschrift (Ebene 1–6) → identisch.
16. **[neu]** Undo (Strg+Z) direkt nach Anwenden → Formatierung weg, Text bleibt; Redo (Strg+Y)
    → Formatierung zurück.
17. **[neu]** Copy/Paste von durchgestrichenem Text aus externer Quelle (`<s>`/`<strike>`/CSS
    `line-through`) mit **echtem** Browser-Clipboard → Mark bleibt erhalten.
18. **[vorh. teilw.]** DOCX-Rundreise (eigene Bearbeitung): durchstreichen → exportieren →
    **reimportieren** → Strike erhalten. (Writer↔Reader-Unit vorhanden:
    `docx/__tests__/roundtrip.test.ts:63–84`; **Re-Import über echte UI ergänzen**.)
19. **[vorh. teilw.]** ODT-Rundreise (eigene Bearbeitung) analog
    (`odt/__tests__/roundtrip.test.ts:65–84` + UI-Re-Import).
20. **[neu]** Cross-Format DOCX → ODT: Strike erhalten.
21. **[neu]** Cross-Format ODT → DOCX: Strike erhalten.
22. **[neu]** Doppelte Cross-Format-Rundreise (DOCX→ODT→DOCX) mit Strike+Fett+Farbe kombiniert
    → kein Verlust der Strike-Information.
23. **[neu]** Upload realer, **app-fremder** DOCX-Datei mit durchgestrichenem Text (unverändert)
    → Export → Reimport → Text und Strike identisch.
24. **[neu]** Upload realer, **app-fremder** ODT-Datei mit durchgestrichenem Text (unverändert)
    → Export → Reimport → Text und Strike identisch.
25. **[neu]** Upload realer DOCX mit `<w:strike w:val="0"/>`/`"false"`/`"off"` → Import zeigt
    Text als **nicht** durchgestrichen (Grenzfall 1 / Risiko 1).
26. **[neu]** Upload realer ODT mit `style:text-line-through-style="none"` explizit → Import
    zeigt Text als **nicht** durchgestrichen (Grenzfall 2).
27. **[neu]** Upload Fremddatei mit doppelter Durchstreichung (`w:dstrike` bzw. ODT
    `type="double"`) → kein Absturz, kein Textverlust, Fallback „einfach durchgestrichen" für
    **beide** Formate (Grenzfall 3 / Risiko 2).
27a. **[neu]** Upload ODT-Fremddatei mit dekorativem Linienstil (`text-line-through-style`
    = `dotted`/`dash`/`wave` o. ä.) → wird als **einfach** durchgestrichen importiert (kein
    Absturz, kein Textverlust); Export erzeugt wieder `solid`/`single` — dekorativer
    Ursprungsstil geht bei Rundreise erwartungsgemäß verloren (Grenzfall 3a).
28. **[vorh. teilw. — erweitern, nicht neu bauen]** E2E über echte Browser-Bedienung: der
    Button-Klick ist bereits in `clipboard-roundtrip.spec.ts` (R-7) abgedeckt (DOCX-Export,
    XML-Prüfung, WebKit übersprungen). Zu **ergänzen**: (a) Re-Import-/Re-Render-Assertion,
    (b) ein **ODT**-Pendant über den Export-Button, (c) Abdeckung auch außerhalb WebKit-Skip
    dokumentieren.
29. **[neu]** DOCX-Export gegen unabhängigen Parser: `docx/__tests__/external-validation.test.ts`
    (mammoth) um eine Strike-Assertion erweitern.
30. **[vorh. teilw.]** ODT-Export gegen unabhängige Prüfung: Strike-Lauf ist im validierten
    Dokument enthalten (`odt/__tests__/external-validation.test.ts:66`) — **gezielte**
    Erhalt-Assertion für `text-line-through` ergänzen.
31. **[neu]** Icon-Rendering-Test auf System ohne besondere Font-Unterstützung: „S"
    (durchgestrichen) bleibt von „F"/„K"/„U" eindeutig unterscheidbar.
32. **[neu]** Tastenkürzel: entweder das festgelegte Kürzel funktioniert zuverlässig (ohne
    bestehende Bindings zu brechen), oder das bewusste Fehlen ist per Test/Codekommentar
    dokumentiert (3.6) — „stillschweigend fehlend" gilt nicht als erfüllt.
33. **[neu]** Performance: sehr lange Selektion (mehrere Seiten) durchstreichen → UI bleibt
    reaktionsfähig.
34. **[neu]** Schnelles Mehrfachklicken → kein inkonsistenter Zwischenzustand.
35. **[vorh.]** Import-Render aus Voll-Fixture nachweisen: `.ProseMirror s` mit „Durchgestrichen"
    Count 1 (`docx.spec.ts:302`, `odt.spec.ts:278`) bleibt grün.
36. **[neu]** Touch-/Mobile-Bedienung: auf einem Mobile-/Tablet-Playwright-Projekt Text tippen,
    „Alles auswählen", „Durchgestrichen" **per Touch/Tap** auslösen → Text sichtbar
    durchgestrichen, Selektion nicht verloren; Toggle-Aus ebenso (Grenzfall 14; vgl.
    `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 8, Testfall 5).
37. **[neu]** Reine Tastaturbedienung des Buttons (Grenzfall 15 / Risiko 11, höchste Priorität):
    Text tippen und markieren **ohne** Toolbar-Klick, per `page.keyboard.press('Tab')` wiederholt
    zum „Durchgestrichen"-Button fokussieren (nicht `.click()`/`.focus()` per Locator, sondern
    echter Tastatur-Fokuswechsel, damit ein synthetisches Klick-Event nicht versehentlich mit
    verifiziert wird, was gerade widerlegt werden soll), dann `Enter` **und separat** `Leertaste`
    drücken → Formatierung schaltet in **beiden** Fällen um wie bei Mausklick; `aria-pressed`
    aktualisiert sich entsprechend. Ergänzend: derselbe Ablauf **auch auf Firefox und
    Desktop Safari**, da sich Browser in der Emulation von Tastatur-Aktivierung auf
    `<button>` unterscheiden können — **konkrete Voraussetzung, nicht nur Empfehlung**
    (siehe neue Zeile „Browser-Matrix" in 1.1): `playwright.config.ts` bindet die
    Projekte „Desktop Firefox (Clipboard)"/„Desktop Safari (Clipboard)" über
    `testMatch: /clipboard.*\.spec\.ts/` ausschließlich an Dateien, deren Name diesem
    Muster entspricht. Ein Testfall-37-Test in einer anders benannten Datei (z. B.
    `strike.spec.ts`, `character-formatting.spec.ts`) läuft **nicht** automatisch auf
    Firefox/Safari mit — er ist entweder in eine vorhandene `clipboard.*.spec.ts`-Datei
    zu integrieren, oder `testMatch`/die Projektliste ist bewusst zu erweitern
    (Entscheidung und Umsetzung sind Teil dieses Testfalls, nicht optional).

---

## 8. Abnahmekriterien (Definition of Done)

Das Feature „Durchgestrichen" gilt erst dann wieder als „vorhanden" im Sinne von
vertrauenswürdig, wenn:

1. Alle Testfälle aus Abschnitt 7 ausgeführt und ihr Ergebnis dokumentiert sind — die als
   **[vorh.]** markierten inklusive Nachweis, dass sie den jeweiligen Punkt **tatsächlich**
   abdecken (nicht nur namentlich existieren).
2. Jedes **echte** Risiko aus Abschnitt 6 explizit als „bestätigt und behoben", „bestätigt und
   bewusst als Grenzfall dokumentiert" oder „widerlegt" eingestuft ist — insbesondere Risiko 1
   (`w:val`-Ignoranz beim DOCX-Import) und Risiko 2 (Doppelstrich-Fallback).
3. Mindestens ein E2E-Test über echte Browser-Bedienung den Button klickt **und** einen
   **Re-Import** verifiziert — für DOCX **und** ODT (Testfall 28), dauerhaft in der Suite.
4. Die Rundreise-Anforderung aus Abschnitt 5 für DOCX **und** ODT, inklusive Cross-Format und
   inklusive mindestens einer realen (nicht app-eigenen) Testdatei je Format, nachweislich
   erfüllt ist, und die unabhängige Parser-Validierung die Durchstreichung **gezielt**
   assertiert (5.8 / Testfälle 29–30).
5. Die offene Entscheidung zum Tastenkürzel (3.6) getroffen und umgesetzt oder ausdrücklich
   begründet zurückgestellt ist.
6. Der Aktiv-Zustand des Buttons (Grenzfälle 11/12) entweder korrekt `storedMarks`/Selektion
   berücksichtigt oder die gewählte Anzeige-Konvention bewusst dokumentiert ist.
7. Die reine Tastaturbedienung des Buttons (Grenzfall 15 / Risiko 11 / Testfall 37) verifiziert
   und, falls der Verdacht sich bestätigt, behoben ist — Tab-Fokus + Enter/Leertaste muss
   dieselbe Umschaltung auslösen wie ein Mausklick. Dieser Punkt gilt als **eigenständiges**
   Abnahmekriterium und darf nicht implizit über Testfall 1–17 (die alle per `.click()` auslösen)
   als „miterledigt" gelten. Der Nachweis muss auch auf den beiden Nicht-Chromium-Projekten
   erbracht werden (Testfall 37) — das setzt voraus, dass der Test tatsächlich in den Geltungsbereich
   von `testMatch: /clipboard.*\.spec\.ts/` fällt oder dieser bewusst erweitert wurde (siehe 1.1
   „Browser-Matrix"); ein Test, der nur auf Chromium/Mobile läuft, erfüllt dieses Kriterium nicht.
