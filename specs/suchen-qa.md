# Testplan „Suchen" — QA-Verifikation (`suchen-qa.md`)

Rolle: QA-Antwort auf `specs/suchen-req.md` (Anforderung) und `specs/suchen-code.md`
(Umsetzungsplan). Dieses Dokument legt **verbindlich** fest, mit welchen konkreten
Tests — auf welcher Ebene, in welcher Datei, mit welchem genauen Ablauf — jeder
Testfall aus der Anforderung nachgewiesen wird, bevor der Backlog-Status von
`suchen`/`suchen-ersetzen` von „fehlt" auf „vorhanden" wechseln darf.

**Grundregel (Anforderung Abschnitt 13, bindend für diesen Plan):** Ein Unit-Test,
der `findMatches`/`replaceAllMatches` direkt gegen ein von Hand gebautes
ProseMirror-Dokument aufruft, beweist **nur** die Logik. Er beweist **nicht**, dass
Strg+F im Browser funktioniert, dass der Toolbar-Button existiert und klickbar ist,
dass beim Tippen im echten Sucheingabefeld etwas sichtbar aufleuchtet, oder dass
eine über die UI hochgeladene Datei nach echtem Exportieren-Klick eine korrekte
Datei auf die Festplatte liefert. Deshalb enthält dieser Plan zwei getrennte,
gleichrangig verbindliche Ebenen:

- **Ebene A — Unit-Tests (Vitest):** Reader/Writer-Rundreise (DOCX **und** ODT) auf
  Objektebene, plus reine Matching-Logik. Schnell, deterministisch, aber **kein**
  Ersatz für Ebene B.
- **Ebene B — echte Playwright-Browser-Tests:** tatsächliche Klicks, tatsächliches
  Tippen über `page.keyboard`, tatsächlicher Datei-Upload über
  `input[type="file"]`, tatsächlicher Export-Klick mit `page.waitForEvent('download')`
  und Prüfung des **heruntergeladenen** Datei-Inhalts (nicht nur eines
  In-Memory-Objekts). Keine Ebene-B-Behauptung darf durch einen internen
  Funktionsaufruf ersetzt werden.

Beide Ebenen zusammen decken alle Testfälle aus `suchen-req.md` Abschnitt 3–12 ab
(Zuordnungstabelle: Abschnitt F dieses Dokuments).

---

## A. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

### A.1 Voraussetzung: reine Matching-/Plugin-Logik — `src/formats/shared/editor/__tests__/search.test.ts` (neu)

Testet `findMatches`, `reconcileActiveIndex` (siehe `suchen-code.md` Abschnitt 3.2)
gegen von Hand gebaute `wordSchema`-Dokumente, **ohne** `EditorView`. Dies ist
**Vorbedingung** für Abschnitt A.2/A.3 (dort wird echte Ersetzungs-Logik über den
Produktionscode-Pfad ausgeführt, nicht neu erfunden), aber **kein** Ersatz für die
Rundreise-Tests.

| ID | Testfall | Zusicherung |
|---|---|---|
| UT-SEARCH-1 | Einfacher Treffer, case-insensitive (Default) | `findMatches(doc, {text:'Wort', caseSensitive:false, wholeWord:false})` liefert genau 1 Treffer für „wort" und „WORT" im Dokument |
| UT-SEARCH-2 | `caseSensitive:true` | Treffer bei „Wort" ≠ Treffer bei „wort", Trefferzahl reduziert sich korrekt |
| UT-SEARCH-3 | Sonderzeichen „ß"/„ä"/„é" | Werden bei `caseSensitive:false` exakt gefunden, **kein** `"ß"→"SS"`-Expansions-Bug (Beweis: Positions-Offsets bleiben 1:1 zur Dokumentlänge) |
| UT-SEARCH-4 | Literal-Matching | `a.b*c` findet `"a.b*c"`, findet **nicht** `"aXbYYYc"` |
| UT-SEARCH-5 | Leerer/Whitespace-only Query | `[]`, kein Fehler (Grenzfall 1/14) |
| UT-SEARCH-6 | Treffer über Formatierungsgrenze (fett/normal) im selben Absatz | genau 1 Eintrag in `matches[]` |
| UT-SEARCH-7 | Treffer würde zwei `paragraph`-Knoten überspannen | 0 Treffer (Absatzgrenze hart) |
| UT-SEARCH-8 | Treffer über `hard_break` im selben Absatz | wird gefunden |
| UT-SEARCH-9 | `wholeWord:true` | „Wort" in „Wortschatz" **nicht** getroffen, isoliertes „Wort" schon |
| UT-SEARCH-10 | Tabellen-Dokument (`table_row`×`table_cell`), Treffer in nicht benachbarten Zellen | Reihenfolge in `matches[]` = zeilenweise links-nach-rechts |
| UT-SEARCH-11 | `reconcileActiveIndex` nach Löschen des aktiven Treffers | nächster verbleibender Treffer wird aktiv; werden alle gelöscht → `-1` |

### A.2 `src/formats/docx/__tests__/roundtrip.test.ts` — neuer Testblock „search & replace"

Folgt exakt dem bestehenden Datei-Muster (`doc()`/`paragraph()`-Helfer,
`roundTrip()` über `writeDocx`→`readDocx`, siehe Zeilen 1–24 der Datei). **Neu**
ist, dass der Ersetzungs-Schritt nicht als vorgefertigtes Ziel-JSON geschrieben,
sondern über den **echten Produktionscode-Pfad** erzeugt wird: ein `EditorState`
wird mit `createSearchPlugin()` aufgebaut, `findMatches`/`replaceAllMatches`
(`src/formats/shared/editor/search.ts`, `commands.ts`) werden als Transaktion
dispatcht, und **erst das resultierende `state.doc.toJSON()`** wird an `writeDocx`
übergeben. Das testet zusätzlich, dass der Ersetzungscode selbst schema-konformen
Output erzeugt — nicht nur, dass Reader/Writer mit von Hand geschriebenem JSON
klarkommen.

| ID | Testfall | Ablauf | Zusicherung |
|---|---|---|---|
| UT-DOCX-RT-1 | Reine Suche ohne Ersetzen verändert den Export nicht (Anforderung Abschnitt 12, Testfall 1; Abschnitt 6, Testfall 1) | Fixture-Dokument mit Überschrift, fett/kursiv/farbigem Text, `bullet_list`, `table` (2×2, siehe bestehende Helfer in Zeilen 139–190) → `writeDocx` einmal **direkt** (Kontrollexport), einmal **nachdem** eine komplette Such-Sitzion auf einem `EditorState` durchgeführt wurde (`setSearchQuery`, `stepSearch` mehrfach, dann Query zurücksetzen wie `closeSearch`, aber **ohne** je eine `docChanged`-Transaktion zu dispatchen) → `writeDocx(state.doc.toJSON())` | Beide exportierten Blobs sind beim Re-Import (`readDocx`) inhaltlich identisch (`toEqual` auf dem gesamten `result.body`); insbesondere: kein `w:highlight`, keine sonstige Spur der Suche im re-importierten `highlight`-Mark-Attribut (Diff auf allen Marks, nicht nur auf Text) |
| UT-DOCX-RT-2 | „Alle ersetzen" auf Fixture mit Formatierung/Liste/Tabelle (Abschnitt 9, Testfall 6; Abschnitt 12, Testfall 3) | Fixture wie oben, Suchbegriff kommt im Fließtext (halb fett), in einem `list_item` und in einer `table_cell` vor → `replaceAllMatches` über echten Command-Aufruf → `roundTrip()` | Re-importiertes Dokument: ersetzter Text an allen drei Stellen korrekt vorhanden, **inklusive** übernommener Formatierung (fett bleibt fett am Ersetzungsort), nicht betroffene Liste-/Tabellenzellen-Inhalte unverändert |
| UT-DOCX-RT-3 | Ersetzungstext länger als Original, Formatierungsgrenze (Abschnitt 9, Grenzfall „länger als Original") | Treffer beginnt in fett formatiertem Textlauf, Ersetzungstext ist 3× so lang wie der Suchbegriff | Gesamter neu eingefügte Text trägt die Formatierung der **Startposition** des Treffers (nicht der alten Endposition) |
| UT-DOCX-RT-4 | „Ersetzen durch" leer → Löschen (Abschnitt 9, Testfall 5) | `replaceAllMatches(matches, '')` | Alle Fundstellen entfernt, unmittelbar umgebender Text (Nachbarwörter im selben Absatz) unverändert |
| UT-DOCX-RT-5 | Schleifensicherheit „Katze"→„Katzenbaby" (Abschnitt 9, Testfall 8) | Dokument mit 3 Vorkommen von „Katze", Ersetzungstext „Katzenbaby" | Ersetzung terminiert (kein Timeout/Endlosschleife), genau 3 Ersetzungen wurden vorgenommen (nicht mehr, auch wenn „Katze" jetzt als Teilstring in „Katzenbaby" erneut vorkäme) |
| UT-DOCX-RT-6 | Ein Undo-Schritt für „Alle ersetzen" (Abschnitt 9, Testfall 4) | `replaceAllMatches` dispatcht eine Transaktion in einen `EditorState` mit `history()`-Plugin → `undo(state, dispatch)` einmal aufrufen | Nach einem einzigen Undo-Aufruf sind **alle** ursprünglichen Vorkommen wiederhergestellt (Prüfung über `state.doc.toJSON()` vor Undo vs. nach Undo — muss dem Ausgangszustand entsprechen) |

### A.3 `src/formats/odt/__tests__/roundtrip.test.ts` — spiegelbildlicher Testblock

Identische Tabelle wie A.2, IDs `UT-ODT-RT-1` … `UT-ODT-RT-6`, gegen
`writeOdt`/`readOdt`. Zusätzlich:

| ID | Testfall | Zusicherung |
|---|---|---|
| UT-ODT-RT-7 | `highlight`-Mark bleibt bei reiner Suche unangetastet (ODT-spezifisch: `fo:background-color`) | Re-importiertes Dokument: `highlight`-Mark-Attribute (Farbwert) vor/nach Such-Sitzung exakt identisch, kein zusätzliches `fo:background-color` durch die Suche eingefügt |

### A.4 Cross-Format-Rundreise (Anforderung Abschnitt 12, Testfälle 5–6) — neue Datei `src/formats/shared/__tests__/search-cross-format-roundtrip.test.ts`

| ID | Testfall | Ablauf |
|---|---|---|
| UT-XFMT-1 | DOCX importieren → Suchen & Ersetzen → als ODT exportieren → wieder importieren → als DOCX zurück-exportieren | `readDocx(fixture)` → Ersetzung über echten Command-Pfad → `writeOdt(...)` → `readOdt(...)` → `writeDocx(...)` → `readDocx(...)` → ersetzter Text an korrekter Stelle in allen Zwischenschritten vorhanden, kein Textverlust (Formatierungsverlust bei Cross-Format ist laut Referenzdokument akzeptabel und wird hier **nicht** als Fehlschlag gewertet, Textverlust hingegen schon) |
| UT-XFMT-2 | ODT importieren → Suchen & Ersetzen → als DOCX exportieren → Re-Import | spiegelbildlich |

---

## B. Echte Playwright-Browser-Tests (Ebene B — verbindlich, keine Ausnahme)

### B.0 Konventionen (aus bestehenden Suiten übernommen, siehe `tests/e2e/docx.spec.ts`, `odt.spec.ts`, `selection-regression.spec.ts`)

- Karten-Locator: `docxCard(page)` / `odtCard(page)` — `page.locator('div.rounded-lg', { has: page.getByRole('heading', {...}) })`.
- Datei-Upload: **echter** `<input type="file">` über `input.setInputFiles({ name, mimeType, buffer })` — kein direkter Aufruf von `readDocx`/`readOdt` in der Testdatei.
- Export: **echter** Klick auf `page.getByRole('button', { name: 'Exportieren' })`, kombiniert mit `page.waitForEvent('download')`, danach `download.path()` + `fs.readFile` + `JSZip.loadAsync` auf den **tatsächlich heruntergeladenen Bytes** — nicht auf einem In-Memory-`Blob` aus der Anwendung.
- Editor-Locator: `page.locator('.ProseMirror')`.
- Konsolen-/Seitenfehler-Überwachung: `page.on('pageerror', ...)` und `page.on('console', msg => msg.type() === 'error' ...)` werden in jedem neuen Test aus B.1 registriert und am Ende via `expect(errors).toHaveLength(0)` geprüft (Anforderung Abschnitt 3, Testfall 5/6: „keine Konsolen-Exception").
- Neue Selektoren, die die Umsetzung (`suchen-code.md` Abschnitt 3.3/3.5) bereitstellen muss, damit diese Tests überhaupt schreibbar sind: Toolbar-Button `page.getByTitle('Suchen (Strg+F)')` bzw. `getByRole('button', { name: 'Suchen' })`; Sucheingabefeld `page.getByPlaceholder(/suchen/i)` oder `page.getByRole('textbox', { name: /suchen/i })`; Trefferzähler `page.getByTestId('search-match-count')` (Testautoren-Empfehlung: `data-testid` ergänzen, da der Text „x von y" sonst schwer robust zu matchen ist); Treffer-Decorations `.search-match` / `.search-match-active` (bereits in `suchen-code.md` Abschnitt 3.7 festgelegte CSS-Klassen).

### B.1 Neue Datei `tests/e2e/search.spec.ts`

Parametrisiert bzw. dupliziert für **beide** Karten (DOCX und ODT), analog zum
bestehenden `docx.spec.ts`/`odt.spec.ts`-Muster. Jeder Test beginnt mit
`page.goto('/')`, Privacy-Banner wegklicken (`getByRole('button', { name: /verstanden/i })`),
Karte „Neu erstellen" oder Upload einer Fixture, dann `editor.click()` bevor
getippt wird (außer bei den Tests, die explizit *ohne* vorherigen Klick prüfen,
B1-15/16).

| ID | Testfall (Bezug Anforderung) | Playwright-Ablauf (konkret) |
|---|---|---|
| PW-1 | Strg+F öffnet Suchleiste, Fokus im Feld (Abschnitt 2, Punkt 2) | `editor.click()`; `page.keyboard.type('Hallo Welt')`; `page.keyboard.press('ControlOrMeta+f')`; `expect(searchInput).toBeFocused()`; Assertion, dass die native Browser-Suchleiste **nicht** erscheint (kein zusätzlicher Test möglich außer: Seite bleibt unverändert scrollbar, keine `beforeunload`-Dialoge) |
| PW-2 | Toolbar-Button öffnet dieselbe Suchleiste (Abschnitt 2, Punkt 1; DoD 1) | `page.getByRole('button', { name: 'Suchen' }).click()`; `expect(searchInput).toBeVisible()` und `toBeFocused()` |
| PW-3 | Tippen ohne Klick auf „Suchen"-Button → Live-Hervorhebung (Abschnitt 3, Testfall 1) | Suchleiste offen, `searchInput.type('Welt')` **ohne** weitere Buttons zu klicken; `await expect(page.locator('.search-match')).toHaveCount(1)` (mit `expect.poll`/eingebautem Retry wegen Debounce 200 ms) |
| PW-4 | Textselektion vor dem Öffnen befüllt das Suchfeld vor (Bedienelement 3) | `editor.dblclick()` auf einem Wort (Doppelklick selektiert Wort); `page.keyboard.press('ControlOrMeta+f')`; `expect(searchInput).toHaveValue(<das Wort>)` |
| PW-5 | Grenzfall „Suchleiste bereits offen + erneut Strg+F" (Abschnitt 2, Grenzfall) | Suchleiste offen, Text „abc" eingetippt, Fokus per Klick zurück in den Editor gesetzt, dann erneut `ControlOrMeta+f` → `expect(searchInput).toHaveValue('abc')` (nicht zurückgesetzt) **und** `toBeFocused()` |
| PW-6 | Case-Toggle ändert Trefferzahl (Abschnitt 3, Testfall 2) | Dokument mit „Wort" und „wort" gemischt; Toggle „Groß-/Kleinschreibung" per `page.getByRole('checkbox', { name: /Groß-\/Kleinschreibung/i }).check()`; Trefferzahl vor/nach Vergleich über `.search-match`-Count |
| PW-7 | Sonderzeichen ß/ä/é (Abschnitt 3, Testfall 3) | Dokument mit „Straße" eintippen, nach „ß" suchen → mind. 1 Treffer; Kontrolle: Suche nach „ss" findet **nicht** dieselbe Stelle |
| PW-8 | Literal-Matching `a.b*c` (Abschnitt 3, Testfall 4) | Zwei Absätze eintippen: `a.b*c` und `aXbYYYc`; Suche nach `a.b*c` → genau 1 Treffer (nicht 2) |
| PW-9 | Leeres Suchfeld → keine Hervorhebung, kein Fehler (Grenzfall 1) | Suchfeld leeren (`fill('')`); `expect(page.locator('.search-match')).toHaveCount(0)`; `expect(pageErrors).toHaveLength(0)` |
| PW-10 | Kein Treffer → „Keine Treffer" (Grenzfall 2) | Suche nach frei erfundener Zeichenkette → Zähler-Element zeigt „Keine Treffer"; `expect(searchInput).not.toHaveClass(/error/)` (keine Fehlerfarbe) |
| PW-11 | Formatierungsgrenze = ein Treffer (Abschnitt 3, Testfall 7) | Text „Wort" eintippen, erste Hälfte fett markieren (Selektion + Fett-Button), danach danach suchen → `.search-match` Count = 1 |
| PW-12 | Absatzgrenze = kein Treffer (Abschnitt 3, Testfall 8) | Zwei Absätze „Satz eins" / „endeteil" per Enter getrennt eintippen, so dass „einsende" nur durch Verbindung über die Absatzgrenze entstünde → Suche nach „einsende" → 0 Treffer |
| PW-13 | `hard_break` trennt nicht (Abschnitt 3, Testfall 9) | Text „Zeile eins", `Shift+Enter`, „Zeile zwei" im selben Absatz; Suche nach einem Begriff, der über den Zeilenumbruch reicht (z. B. flankierende Zeichen beider Zeilen mit Leerzeichen-Ersatz gemäß Umsetzungsplan Abschnitt 2.2) → als Treffer erkannt |
| PW-14 | Alle Treffer gleichzeitig markiert (Abschnitt 4, Testfall 1) | Dokument mit 3 Vorkommen desselben Wortes → `.search-match` Count = 3 |
| PW-15 | Aktiver Treffer optisch unterscheidbar (Abschnitt 4, Testfall 2) | `.search-match-active` Count = 1, DOM-Klassenprüfung; zusätzlich `getComputedStyle`-Check, dass sich `outline`/`font-weight` vom übrigen `.search-match` unterscheiden (nicht nur Farbton, siehe Kontrastanforderung) |
| PW-16 | Scroll zu Treffer auf „Seite 2" (Abschnitt 4, Testfall 3) | Mehrseitiges Fixture-Dokument (genug Absätze für 2 Paginierungs-Seiten, siehe `pagination.test.ts`-Fixture-Größen) hochladen; Navigation zu einem Treffer auf Seite 2 → Scroll-Offset des Editor-Containers (`scrollTop`) vor/nach Navigation unterscheidet sich signifikant; `.search-match-active` ist via `expect(locator).toBeInViewport()` sichtbar |
| PW-17 | Koexistenz mit `highlight`-Mark (Abschnitt 4, Testfall 4) | Text markieren, Toolbar-Hervorhebungsfarbe setzen, danach danach suchen → `.search-match`-Klasse **und** die vom `highlight`-Mark gesetzte Hintergrundfarbe beide im berechneten Stil vorhanden (`getComputedStyle` zeigt gemischte/überlagerte Farbe, nicht reines Suchgelb) |
| PW-18 | Navigation vorwärts in Dokumentreihenfolge (Abschnitt 5, Testfall 1) | 3 Treffer, `Enter` dreimal drücken → `.search-match-active` wandert in der erwarteten Reihenfolge (Text-Inhalt der jeweils aktiven Decoration geprüft über Position/Index) |
| PW-19 | Wrap-Around vorwärts (Abschnitt 5, Testfall 2) | Am letzten Treffer `Enter` → aktiver Treffer ist wieder der erste |
| PW-20 | Wrap-Around rückwärts (Abschnitt 5, Testfall 3) | Am ersten Treffer `Shift+Enter` → aktiver Treffer ist der letzte |
| PW-21 | Pfeiltasten als Alternative zu Enter/Shift+Enter (Bedienelemente 4/5) | Klick auf „Nächster"/„Vorheriger"-Button (Pfeil-Icons) bewirkt dieselbe Navigation wie Enter/Shift+Enter |
| PW-22 | **Pflicht-Regressionstest Selection-Sync** (Abschnitt 5, Testfall 4+5; Grenzfall 6) | Siehe eigener Abschnitt B.2 unten — hier nur referenziert, Test lebt in derselben Datei |
| PW-23 | Suche über Tabellenzellen hinweg (Abschnitt 8, Testfall 1+4) | Tabelle einfügen (`getByRole('button', {name:'Tabelle einfügen'})`), Suchbegriff in zwei nicht benachbarte Zellen tippen, dazu denselben Begriff auch im Haupttext → `.search-match` Count = 3, Navigation zwischen allen dreien funktioniert in Zellreihenfolge |
| PW-24 | Suche über Listenelement (Abschnitt 8, Testfall 2) | Liste einfügen, Suchbegriff in einem `list_item` → gefunden, Listenstruktur (`ul`/`li`-Struktur im DOM) bleibt unverändert nach Öffnen/Schließen der Suche |
| PW-25 | Bearbeitung während offener Suche: aktiven Treffer löschen (Abschnitt 7, Testfall 3; Grenzfall) | 3 Treffer, aktiven Treffer per `Backspace`-Sequenz im Haupttext löschen → Zähler aktualisiert sich auf 2 automatisch, aktive Markierung wandert zum nächsten verbleibenden Treffer, `pageErrors` bleibt leer |
| PW-26 | Neuer Treffer entsteht während offener Suche (Abschnitt 7, Testfall 2) | Suche offen, neuen Text eintippen, der einen weiteren Treffer erzeugt → Zähler erhöht sich live, `.search-match` Count steigt |
| PW-27 | Mehrfaches schnelles Öffnen/Schließen (Grenzfall 13) | Schleife: 10× `ControlOrMeta+f` gefolgt von `Escape`; danach ein letztes Mal öffnen und denselben Suchbegriff eingeben → `.search-match` Count entspricht exakt der erwarteten Trefferzahl (kein kumulierter Anstieg durch Mehrfach-Decorations/doppelt registrierte Plugins) |
| PW-28 | Nur-Leerzeichen-Suchbegriff (Grenzfall 14) | `searchInput.fill('   ')` → entweder „Keine Hervorhebung" (Count 0) oder dokumentiertes Leerzeichen-Treffer-Verhalten — Test prüft explizit das in `suchen-code.md` Abschnitt 2.3 festgelegte Verhalten (Count 0, gleich wie leere Eingabe), **kein** stiller Absturz |
| PW-29 | Suche unmittelbar nach Datei-Upload, ohne vorherigen Editor-Klick (Grenzfall 11) | `input.setInputFiles(...)` (Fixture-DOCX/ODT) → **sofort** `page.keyboard.press('ControlOrMeta+f')` ohne vorherigen `editor.click()` → Suchleiste öffnet sich, Suche funktioniert |
| PW-30 | Suche unmittelbar nach „Neues Dokument" (Grenzfall 12) | „Neu erstellen" klicken → sofort Strg+F → beliebigen Suchbegriff eintippen → Zähler zeigt „Keine Treffer", **kein** Fehler bei leerem `doc` |
| PW-31 | Groß/Klein- und „Nur ganzes Wort"-Checkbox Standardwerte (Abschnitt 2, Punkte 7/8) | Beim ersten Öffnen: beide Checkboxen `not.toBeChecked()` (Default aus) |
| PW-32 | Escape schließt Suchleiste und entfernt alle Hervorhebungen spurlos (Bedienelement 9) | Suche mit Treffern offen, `Escape` drücken → `.search-match` Count = 0, Suchleisten-Container `not.toBeVisible()` |

### B.2 Pflicht-Regressionstest: Selection-Sync beim Schließen der Suche

Dieser Test ist laut Anforderung (Abschnitt 5, Testfall 4+5; Abschnitt 11,
Grenzfall 6; Abschnitt 15, DoD-Punkt 5) **nicht verhandelbar** und muss dauerhaft
in der Suite bleiben, analog zu `tests/e2e/selection-regression.spec.ts`.

```ts
test('closing search places a real selection at the last active match, ready to type', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()

  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Anfang MARKER Ende des Absatzes.')

  await page.keyboard.press('ControlOrMeta+f')
  await page.getByRole('textbox', { name: /suchen/i }).fill('MARKER')
  await expect(page.locator('.search-match')).toHaveCount(1)

  await page.keyboard.press('Escape')
  // Suchleiste ist geschlossen, keine Hervorhebung mehr sichtbar:
  await expect(page.locator('.search-match')).toHaveCount(0)

  // Kritischer Nachweis: sofortiges Tippen fügt Text an der Fundstelle ein —
  // NICHT am Dokumentanfang/-ende, und ersetzt nicht den gesamten Inhalt
  // (siehe suchen-code.md Abschnitt 2.5, "einziger Berührungspunkt mit dem
  // Selection-Sync-Bug").
  await page.keyboard.type('XYZ')

  await expect(editor).toContainText('Anfang MARKERXYZ Ende des Absatzes.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(1) // kein Absatz verloren/dupliziert
})
```

Dieselbe Sequenz wird **zusätzlich** für den Fall wiederholt, in dem der Treffer
per Navigation (`Enter`) erst zu einem anderen als dem ersten Treffer bewegt wurde
(mind. 3 Treffer, zweiten aktivieren, schließen, tippen) — stellt sicher, dass
nicht zufällig nur der Default-Fall (erster/aktiver Treffer = einziger Treffer)
funktioniert.

### B.3 Neue Datei `tests/e2e/search-roundtrip.spec.ts` (Anforderung Abschnitt 12, vollständig — echte Datei-Ebene, nicht nur Objektebene)

Jeder Test lädt eine **reale Fixture-Datei** über den echten `<input type="file">`,
bedient die Suchleiste über echte Tastatur-/Mausinteraktion, klickt danach auf
„Exportieren", wartet auf das `download`-Event, liest die **tatsächlich
heruntergeladene Datei** von der Festplatte, entpackt sie mit `JSZip` und prüft
den XML-Inhalt — und lädt diese heruntergeladene Datei **erneut über den echten
Upload-Input** hoch, um den Re-Import ebenfalls über die UI (nicht über
`readDocx`/`readOdt` im Testcode) zu verifizieren.

| ID | Testfall (Bezug) | Ablauf |
|---|---|---|
| PW-RT-1 | DOCX, reine Suche ohne Ersetzen, Rundreise (Abschnitt 12, Testfall 1) | Fixture-DOCX mit Formatierung + Liste + Tabelle hochladen (`docxCard(page).locator('input[type="file"]').setInputFiles(...)`) → Strg+F → Suchbegriff eintippen, der in Fließtext, Liste **und** Tabelle vorkommt → mehrfach `Enter` (durch alle Treffer navigieren, inkl. Tabellenzelle) → Case-Toggle einmal an-/ausschalten → `Escape` → **ohne** weitere Änderung „Exportieren" klicken → `download.path()` lesen → `JSZip` → `word/document.xml`-Text muss exakt dieselben Textinhalte enthalten wie vor dem Hochladen (String-Vergleich der reinen Textknoten, Vergleich gegen eine Referenzexport-Fixture ohne Such-Sitzung) → **zusätzlich**: heruntergeladene Datei erneut über `input[type="file"]` hochladen → Editor zeigt exakt denselben Inhalt wie beim ersten Upload |
| PW-RT-2 | ODT-Äquivalent zu PW-RT-1 (Abschnitt 12, Testfall 2) | Wie PW-RT-1, aber ODT-Fixture, `odtCard`, Prüfung auf `content.xml` |
| PW-RT-3 | DOCX, Suchen & Ersetzen an mehreren Stellen inkl. Tabellenzelle, Rundreise (Abschnitt 12, Testfall 3) | Fixture hochladen → Strg+F → Umschalter „Suchen & Ersetzen" klicken → Suchbegriff + Ersetzungstext eintippen → „Alle ersetzen" klicken (echter Button-Klick) → Editor zeigt ersetzten Text sofort (`expect(editor).toContainText(...)`) → „Exportieren" → Download lesen → `JSZip` → `word/document.xml` enthält den **neuen** Text an der erwarteten Stelle (inkl. innerhalb der Tabellenzelle: XML-Suche nach `<w:tbl>`-Block, der den neuen Text enthält), **nicht** mehr den alten Suchbegriff außer dort, wo er nicht Ziel der Ersetzung war → heruntergeladene Datei erneut hochladen → Editor zeigt den ersetzten Inhalt korrekt |
| PW-RT-4 | ODT-Äquivalent zu PW-RT-3 (Abschnitt 12, Testfall 4) | Wie PW-RT-3, ODT/`content.xml` |
| PW-RT-5 | Cross-Format: ODT hochladen → Suchen & Ersetzen → Export **als DOCX** → Re-Import (Abschnitt 12, Testfall 5) | ODT-Fixture hochladen → Ersetzen-Flow wie PW-RT-3 → falls die UI Formatwechsel beim Export unterstützt: Export als DOCX auswählen, sonst Hinweis/Blocker vermerken (siehe Abschnitt E) → heruntergeladene `.docx` erneut hochladen (auf der DOCX-Karte) → ersetzter Text korrekt vorhanden |
| PW-RT-6 | Cross-Format: DOCX → Suchen & Ersetzen → Export als ODT → Re-Import (Abschnitt 12, Testfall 6) | Spiegelbildlich zu PW-RT-5 |
| PW-RT-7 | „Ersetzen durch" leer über echte UI (Abschnitt 9, Testfall 5) | Ersetzen-Modus, Ersetzungsfeld leer lassen, „Alle ersetzen" klicken → Editor zeigt Fundstellen entfernt, umgebender Text unangetastet → Export/Re-Import bestätigt das Fehlen der alten Textstellen dauerhaft |
| PW-RT-8 | Einzelnes „Ersetzen" (nicht „Alle ersetzen") über echte UI (Abschnitt 9, Testfall 1) | Bei 5 Treffern: „Ersetzen"-Button einmal klicken → Zähler reduziert sich auf 4 verbleibende Treffer für den alten Suchbegriff, Editor-Inhalt zeigt genau eine ersetzte Stelle |
| PW-RT-9 | Strg+Z nach „Alle ersetzen" über echte UI (Abschnitt 9, Testfall 4) | „Alle ersetzen" bei 5 Treffern → `page.keyboard.press('ControlOrMeta+z')` einmal → Editor zeigt alle 5 Originaltexte wieder vollständig her |

---

## C. Performance-Testfall (Grenzfall 10)

| ID | Testfall | Ablauf |
|---|---|---|
| PW-PERF-1 | Großes Dokument, häufiger Suchbegriff, UI bleibt reaktionsfähig | Reale komplexe Fixture-Datei (mehrere hundert Absätze, z. B. `tests/fixtures/external/odt/bible_short.odt` oder gleichwertige DOCX-Fixture) hochladen → Suche nach häufigem Wort (z. B. „der"/„die"/„das", zweistellige bis dreistellige Trefferzahl erwartet) → Zeit von Tastendruck des letzten Zeichens bis sichtbarer Hervorhebung wird gemessen (`performance.now()` im Browser-Kontext via `page.evaluate`, gestartet beim letzten `keyboard.press`) → Assertion: Update erscheint innerhalb von 3 Sekunden (Referenzwert aus `FEATURE-SPEC-DOCX-ODT.md`); zusätzlich manuelle/visuelle Kontrolle, dass die Eingabe selbst (Zeichen erscheinen im Feld) nicht spürbar verzögert wirkt (kein Blockieren des Main-Threads länger als die Debounce-Zeit) |

---

## D. Zuordnung Ebene A / Ebene B zu den Pflicht-Grenzfällen (Anforderung Abschnitt 11)

| # | Grenzfall | Ebene A (Unit) | Ebene B (Playwright) |
|---|---|---|---|
| 1 | Leere Sucheingabe | UT-SEARCH-5 | PW-9 |
| 2 | Kein Treffer | — | PW-10 |
| 3 | Regex-Metazeichen literal | UT-SEARCH-4 | PW-8 |
| 4 | Formatierungsgrenze = ein Treffer | UT-SEARCH-6 | PW-11 |
| 5 | Absatzgrenze = kein Treffer | UT-SEARCH-7 | PW-12 |
| 6 | Selection-Sync beim Schließen | — | PW-22 (B.2, Pflicht) |
| 7 | Dokumentänderung während offener Suche | UT-SEARCH-11 | PW-25, PW-26 |
| 8 | Tabellen-/Listengrenzen | UT-SEARCH-10 | PW-23, PW-24 |
| 9 | Export/Re-Import während/nach Suche | UT-DOCX-RT-1, UT-ODT-RT-1/7 | PW-RT-1, PW-RT-2 |
| 10 | Großes Dokument, häufiger Begriff | — | PW-PERF-1 |
| 11 | Suche direkt nach Import | — | PW-29 |
| 12 | Suche direkt nach „Neues Dokument" | — | PW-30 |
| 13 | Mehrfaches schnelles Öffnen/Schließen | — | PW-27 |
| 14 | Nur-Leerzeichen-Suchbegriff | UT-SEARCH-5 | PW-28 |

---

## E. Bekannte Einschränkung — nicht Teil dieses Testplans

Testfall 3 aus Anforderung Abschnitt 8 („Suchbegriff nur in der Fußzeile
vorhanden, Sprung aus dem Haupttext heraus") ist laut `suchen-code.md` Abschnitt 5
**aktuell nicht durchführbar**, da kein editierbarer Kopf-/Fußzeilenbereich
existiert (`kopfzeile-bearbeiten`/`fusszeile-bearbeiten` sind laut Backlog
weiterhin „fehlt"). Dieser Testfall wird hier **nicht** als „nicht bestanden"
geführt, sondern als **zurückgestellt** vermerkt und muss nachgeholt werden,
sobald Kopf-/Fußzeilen editierbar sind — siehe dortigen Abschnitt für die
Begründung. Er blockiert den Backlog-Status von `suchen` nicht.

Ebenso hängt die Durchführbarkeit von PW-RT-5/PW-RT-6 (Cross-Format-Export über
die UI) davon ab, dass die Export-Schaltfläche tatsächlich eine Formatwahl
anbietet (DOCX-Karte exportiert nach DOCX, ODT-Karte nach ODT, laut aktuellem
Code-Stand kein Cross-Format-Export-Button in der UI). Sollte die UI aktuell
**keinen** Cross-Format-Export anbieten, werden PW-RT-5/PW-RT-6 durch die
Objektebene-Tests UT-XFMT-1/UT-XFMT-2 (Abschnitt A.4) abgedeckt und die
Playwright-Variante wird nachgezogen, sobald ein entsprechender UI-Pfad
existiert — auch dies ist ein dokumentierter Blocker, keine stillschweigende
Lücke.

---

## F. Definition of Done — Abnahme-Checkliste (Bezug Anforderung Abschnitt 15)

Der Backlog-Status von `suchen` darf erst auf „vorhanden" wechseln, wenn **alle**
folgenden Zeilen grün sind:

| DoD-Punkt (Anforderung Abschnitt 15) | Nachweis-IDs |
|---|---|
| 1. Strg+F **und** Toolbar-Button öffnen dieselbe Suchleiste | PW-1, PW-2 |
| 2. Live-Suche, Literal-Matching, Case-Toggle, Zähler | UT-SEARCH-1..5, PW-3, PW-6, PW-8, PW-9, PW-10 |
| 3. Alle Treffer markiert, aktiver Treffer unterscheidbar, Navigation mit Wrap-Around | PW-14, PW-15, PW-18, PW-19, PW-20, PW-21 |
| 4. Flüchtige Decoration, kein Undo-/Export-Einfluss | UT-DOCX-RT-1, UT-ODT-RT-1/7, PW-RT-1, PW-RT-2, PW-32 |
| 5. Selection-Sync-Regressionstest beim Schließen, dauerhaft in Suite | PW-22 (B.2) |
| 6. Rundreise DOCX **und** ODT (reine Suche) | UT-DOCX-RT-1, UT-ODT-RT-1, PW-RT-1, PW-RT-2 |
| 7. Alle Grenzfälle aus Abschnitt 11 einzeln getestet | Abschnitt D dieser Datei |
| 8. Suchen & Ersetzen inkl. eigener Rundreise | UT-DOCX-RT-2..6, UT-ODT-RT-2..6, UT-XFMT-1/2, PW-RT-3..9 |

Der Backlog-Status von `suchen-ersetzen` darf zusätzlich erst dann auf
„vorhanden" wechseln, wenn DoD-Punkt 8 vollständig grün ist (inkl. der
Cross-Format-Fälle PW-RT-5/PW-RT-6 bzw. deren dokumentierten Ersatz UT-XFMT-1/2,
siehe Abschnitt E).
