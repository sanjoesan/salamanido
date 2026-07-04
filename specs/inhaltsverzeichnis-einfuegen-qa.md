# QA-Testplan: „Inhaltsverzeichnis einfügen"

Rolle dieses Dokuments: Testplan der QA-Instanz, nicht des Dev-Plans selbst. Geprüft gegen
`E:\docs\specs\inhaltsverzeichnis-einfuegen-req.md` (Anforderung, Abschnitte 1–6) und
`E:\docs\specs\inhaltsverzeichnis-einfuegen-code.md` (Umsetzungsplan des Entwicklers, Abschnitte
0–17, Stand 2026-07-04). Zusätzlich **unabhängig** gegen den tatsächlichen Repo-Code und die
tatsächlichen Testfixtures nachvollzogen (nicht blind aus den beiden Vorgänger-Dokumenten
übernommen) — Ergebnis: Beide referenzierten Fundstellen treffen zu, das Feature ist **vollständig
unimplementiert** (`grep -rniE "toc_entry|tocId|'toc'" src` liefert 0 Treffer außerhalb dieser
Spec-Dateien selbst; `Toolbar.tsx` (247 Zeilen), `schema.ts` (153 Zeilen), `commands.ts` (107
Zeilen) enthalten keinerlei Bezug zu einem Inhaltsverzeichnis). Dieser Plan ist deshalb als
**Zielzustand** geschrieben (setzt die Umsetzung gemäß `inhaltsverzeichnis-einfuegen-code.md`
voraus) und dient zugleich als Abnahme-Suite nach jeder Umsetzungs-Iteration.

Zwei verpflichtende, **getrennte** Testebenen, wie vom Auftrag gefordert:

1. **Unit-Tests Reader/Writer-Rundreise** (DOCX + ODT) — Vitest, direkter Aufruf von
   `writeDocx`/`readDocx`/`writeOdt`/`readOdt`, der neuen Commands (`collectHeadings`,
   `insertTableOfContents`, `updateTableOfContentsAt`, `navigateToTocEntry`) und von
   `resolveTocPlaceholders`, ohne Browser.
2. **ECHTE Playwright-Browser-Tests** — echte Klicks (`page.getByRole('button', …).click()`),
   echtes Tippen (`page.keyboard.type`/`.press`), echter Datei-Upload
   (`input.setInputFiles(...)`), echter Download (`page.waitForEvent('download')`) **und**
   anschließende Inspektion der tatsächlich heruntergeladenen Datei (JSZip gegen die reale
   ZIP/XML-Struktur) — **kein** Test in dieser Ebene ruft `insertTableOfContents()`,
   `navigateToTocEntry()` oder eine andere interne Funktion/einen Command-Export direkt auf.

Referenz-Infrastruktur im Repo, gegen die tatsächlichen Dateien verifiziert:
`tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, `tests/e2e/selection-regression.spec.ts`
(Helper `docxCard(page)`/`odtCard(page)`, Muster „echter Download → `download.path()` →
`fs.readFile` → `JSZip.loadAsync` → String-/Regex-Prüfung gegen `word/document.xml` bzw.
`content.xml"`), `src/formats/docx/__tests__/roundtrip.test.ts` und
`.../external-fixtures.test.ts` (Vitest), analog für ODT. Test-Runner: Vitest (Unit) +
Playwright (E2E), beide bereits eingerichtet, keine neue Tooling-Wahl nötig.

---

## 0. Kritische Vorab-Befunde (eigene Gegenprüfung des Umsetzungsplans, vor Testausführung zu klären)

Diese Punkte wurden beim Gegenlesen von `inhaltsverzeichnis-einfuegen-code.md` **zusätzlich** zu
den dort bereits selbst benannten offenen Punkten (Abschnitt 16) gefunden bzw. unabhängig
verifiziert. Sie sind keine Spitzfindigkeiten, sondern bestimmen, welche Testfälle unten als
**scharf formulierte Pflichttests** aufgenommen wurden.

### 0.1 NEU (hier erstmals dokumentiert): ODT-Export vergibt für **jedes** Verzeichnis denselben harten `text:name="TableOfContents1"` — Kollisionsgefahr bei mehreren Verzeichnissen

Der im Code-Plan gezeigte `blockToOdt()`-Fall `'toc'` (Abschnitt 12.1) erzeugt das Wurzelelement
wörtlich als
```xml
<text:table-of-content text:style-name="Sect1" text:name="TableOfContents1" text:protected="false">
```
— `text:name` ist ein **fest kodierter String**, nicht aus einem Zähler/der `toc`-Node-Identität
abgeleitet. Die Anforderung verlangt in Grenzfall 9 (Zeile 236–240) ausdrücklich: „Mehrfaches
Einfügen mehrerer Inhaltsverzeichnisse im selben Dokument … falls erlaubt, müssen beide
Verzeichnisse unabhängig voneinander funktionieren (jeweils eigene, nicht kollidierende
Sprungziele/Anker beim Export)". Die Entscheidung 1.9 des Code-Plans selbst sagt „erlaubt, keine
Sperre" voraus — mit dem oben zitierten Snippet würden **zwei** exportierte
`<text:table-of-content>`-Elemente im selben `content.xml` denselben `text:name` tragen. Das ist
strukturell dieselbe Fehlerklasse wie der bereits in `tabelle-einfuegen-code.md` Abschnitt 5.1
Punkt 2 gefundene und dort behobene `Math.random()`-Tabellennamen-Bug in `odt/writer.ts:109` — nur
diesmal am Verzeichnis-Element statt an der Tabelle, und diesmal nicht einmal zufallsbasiert
(also **garantiert**, nicht nur „unwahrscheinlich", kollidierend). Ob LibreOffice bei doppeltem
`text:name` beim Öffnen/F9-Update abstürzt, nur das erste Element aktualisiert oder beide falsch
zusammenführt, ist ungetestet — in jedem Fall ein Verstoß gegen „unabhängig voneinander
funktionieren".

**Konsequenz:** Pflichttest `UT-ODT-TOC-NAME-COLLISION` (Abschnitt 3.6 unten) — vor jeder
Abnahme zu beheben (z. B. per Zähler/`BookmarkAllocator`-analogem Muster, wie es der Code-Plan
selbst für DOCX-Bookmark-Ids in Abschnitt 9.1 bereits korrekt vorsieht, hier aber am ODT-Pendant
schlicht vergessen wurde).

### 0.2 DOCX-Reader: Kein gefundener `fldChar end` verwirft still konsumierten Text (vom Plan selbst als Restrisiko benannt, hier zum Pflichttest geschärft)

Abschnitt 10.2 des Code-Plans benennt selbst: „Wird bis zum Ende von `bodyEl.children` **kein**
`end` gefunden (korrupte/unerwartete Datei) … die konsumierten Absätze sind dann zwar verloren
(seltener Grenzfall einer kaputten Datei), aber es gibt **keinen** Absturz". Das ist ein
bewusst in Kauf genommener, aber **echter** Datenverlust-Pfad — bei einer Datei mit einem
`fldChar begin`+`TOC`-`instrText`, aber ohne (z. B. durch einen früheren, fehlerhaften
Konverter) erhaltenem `fldChar end`, verschwindet **jeder** nachfolgende Absatz bis Dateiende
kommentarlos, nicht nur der Feld-Cache. Da laut Zusatzbefund B (Abschnitt 0.3 unten,
unabhängig erneut bestätigt) **kein** reales Fixture mit echtem TOC-Feld existiert, kann dieser
Pfad **nur** über eine gezielt kaputt gebaute synthetische Datei geprüft werden — ohne einen
solchen Test bliebe dieser Datenverlust-Pfad bis zur ersten echten Nutzer-Fremddatei unentdeckt.

**Konsequenz:** Pflichttest `UT-DOCX-TOC-NO-END-MARKER` (Abschnitt 3.4 unten).

### 0.3 Frisch (re-)importiertes TOC-Feld wird beim Einlesen sofort aus den **aktuellen** Überschriften neu berechnet, nicht aus dem eingebetteten Cache übernommen — Spannungsverhältnis zu Grenzfall 12 „eingefroren bis Aktualisieren"

`resolveTocPlaceholders()` (Abschnitt 11 des Code-Plans) baut die Einträge eines gefundenen
`toc`-Platzhalters **immer** aus den tatsächlich im (neu geparsten) Dokument vorhandenen
`heading`-Knoten neu auf, gefiltert nach `maxLevel` — unabhängig davon, was im ursprünglichen
Feld-Cache (die zwischen `separate` und `end` gespeicherten `<w:p>`-Absätze bzw. bei ODT die
`<text:index-body>`-Absätze) tatsächlich stand. Das ist beim **Einfügen im Editor** unproblematisch
(dort gibt es noch keinen abweichenden Cache). Beim **Import einer echten Fremddatei**, deren
Feld-Cache aus einem früheren Word/LibreOffice-Speicherstand stammt und die seitdem **außerhalb**
dieser App bearbeitet wurde (Überschrift umbenannt/verschoben, ohne dass „Felder aktualisieren"
in Word ausgeführt wurde), führt das dazu, dass diese App beim bloßen Importieren bereits
**automatisch** die „richtigen", aktuellen Einträge anzeigt — nicht die im Feld eingefrorenen,
veralteten. Das widerspricht dem in Abschnitt 2.8 der Anforderung und Grenzfall 12 geforderten
Verhalten „bleibt unverändert bestehen, auch wenn sich Überschriften danach geändert haben, bis
Aktualisieren ausgelöst wird" — zumindest für den Spezialfall **Import**, wo dieses „Einfrieren"
faktisch übersprungen wird. Das muss **vor** Abnahme als bewusste, dokumentierte Entscheidung
festgehalten werden (vermutlich akzeptabel — „Import berechnet automatisch aktuell" ist kein
Bug im eigentlichen Sinne, aber eine **andere** Semantik als „genau das importieren, was im Feld
stand" und widerspricht dem Wortlaut von Grenzfall 12, wenn man ihn auf Import anwendet), nicht
stillschweigend übergangen werden.

**Konsequenz:** Pflichttest `UT-DOCX-TOC-STALE-CACHE-ON-IMPORT` / `UT-ODT-TOC-STALE-CACHE-ON-IMPORT`
(Abschnitt 3.4/3.6 unten) — dokumentiert das **tatsächliche** Verhalten, keine Annahme.

### 0.4 TOC-Feld-Erkennung/Ebenentiefen-Parsing deckt nur die `\o "N-M"`-Gliederungsschalter-Form ab — die ebenfalls verbreitete `\t "Formatname,Ebene,…"`-Form (formatvorlagenbasiertes TOC) bleibt ungetestet/unerkannt

`tocMaxLevelFromInstr()` (Abschnitt 10.2) parst ausschließlich `\o\s*"(\d)-(\d)"`. Echte,
in Word erzeugte Inhaltsverzeichnisse verwenden häufig **stattdessen** (insbesondere bei
„Benutzerdefiniertes Inhaltsverzeichnis" mit individuellen Formatvorlagen) die Form
`TOC \t "Formatname1,1,Formatname2,2" \h \z \u` ohne jeden `\o`-Schalter. Ob ein solches Feld
überhaupt als „ist ein TOC-Feld" erkannt wird (die Erkennung selbst hängt vermutlich an einer
Prüfung, ob `instrText` den Teilstring „TOC" enthält, was hier zuträfe) und welchen `maxLevel`
es dann bekäme (der Regex träfe nicht, Fallback auf `3` laut Code), ist **ungetestet** — und
kann mangels eines einzigen realen Fixtures mit echtem TOC-Feld im gesamten Korpus (unabhängig
erneut bestätigt, Abschnitt 0.6 unten) **nicht** gegen eine reale Datei verifiziert werden. Das
ist ein **zusätzlicher**, über die bereits im Code-Plan (Abschnitt 16.1) benannte Lücke
hinausgehender blinder Fleck, der **nicht** stillschweigend als „wird schon passen" akzeptiert
werden darf.

**Konsequenz:** Zusätzliche synthetische Fixture mit `\t`-Schalter-Form bauen
(`UT-DOCX-TOC-STYLE-BASED-FIELD`, Abschnitt 3.4 unten) — das tatsächliche Verhalten (erkannt mit
Fallback-Tiefe 3 vs. komplett ignoriert/als Fließtext behandelt) wird dokumentiert, nicht
vorausgesetzt.

### 0.5 ODT-Href-Kodierung (`encodeURIComponent` vs. reines `escapeXml`) — vom Dev-Plan selbst offen gelassen, hier mit eigenem Fixture-Abgleich präzisiert

Abschnitt 12.1 des Code-Plans benennt die Unsicherheit bereits selbst („muss während der
Umsetzung gegen LibreOffice-Verhalten verifiziert werden"). Eigener Abgleich des tatsächlichen
`test1.odt`-Inhalts (`text:index-body`, per `JSZip` direkt aus dem Zip gelesen, siehe Abschnitt
0.6) bestätigt exakt das im Code-Plan selbst zitierte Format:
```xml
<text:a xlink:type="simple" xlink:href="#1.Detailed Specification|outline">
```
— **unkodierte** Leerzeichen direkt im `href`-Attributwert (kein `%20`, kein `&#32;`). Ein
`encodeURIComponent`-basierter Export würde stattdessen `#1.Detailed%20Specification|outline`
erzeugen — ein **anderes** Format als das real von LibreOffice selbst erzeugte. Da diese App
ihre eigenen Hrefs beim Reimport ohnehin nicht auswertet (Abschnitt 13.1 des Code-Plans, bewusst
so entschieden), schadet das der **eigenen** Rundreise-Fähigkeit nicht — wirkt sich aber auf die
Klickbarkeit **innerhalb von LibreOffice selbst** nach Export aus, was Teil der Anforderung ist
(Abschnitt 4.2 Punkt 3: „In einer echten LibreOffice-Installation … Verzeichnis aktualisieren").

**Konsequenz:** Pflicht-Unit-Test, der den exportierten `href`-Wert für einen Überschriftentext
mit Leerzeichen/Umlaut exakt gegen das reale, unkodierte `test1.odt`-Format prüft (nicht gegen
eine angenommene Kodierung) — siehe `UT-ODT-TOC-HREF-FORMAT` (Abschnitt 3.6).

### 0.6 Eigene Fixture-Gegenprüfung (unabhängig vom Code-Plan nachvollzogen, Stand 2026-07-04)

Eigener, vollständiger Sweep aller Testfixtures (nicht aus dem Code-Plan übernommen, per
`JSZip` direkt gegen jede Datei ausgeführt):

| Prüfung | Eigenes Ergebnis | Deckt sich mit Code-Plan? |
|---|---|---|
| `instrText`-Treffer mit „TOC" in allen 127 `tests/fixtures/external/docx/*.docx` (11 Dateien defekt/nicht ladbar, als solche übersprungen) | **0 Treffer** | Ja, bestätigt Zusatzbefund B exakt |
| `w:bookmarkStart`-Namen mit „toc" (case-insensitiv) in denselben 127 Dateien | **1 Treffer**: `65099.docx` enthält zwei echte, von Word erzeugte Bookmarks `_Toc45266674`/`_Toc47012377` um eine Überschrift („Acronyms", Formatvorlage `EdfTitre3`) — **ohne** dass irgendwo im selben Dokument ein zugehöriges TOC-Feld existiert (vermutlich ein Verzeichnis, das im Original einmal existierte und später gelöscht wurde, während die Bookmarks zurückblieben) | **Neu, nicht im Code-Plan erwähnt** — brauchbare Zusatz-Fixture für den Bookmark-Erkennungs-Teiltest (Abschnitt 10.1 des Code-Plans), aber **kein** Ersatz für ein vollständiges Feld-Fixture |
| `table-of-content`-Treffer in allen 202 `tests/fixtures/external/odt/*.odt` | **exakt 3 Treffer**: `test1.odt`, `compdocfileformat.odt`, `excelfileformat.odt` | Ja, bestätigt Zusatzbefund A exakt |

**Konsequenz:** `65099.docx` wird als **zusätzliche** Fixture in `UT-DOCX-TOC-ORPHANED-BOOKMARKS`
(Abschnitt 3.5) aufgenommen — prüft, dass die Bookmark-Erkennung (Abschnitt 10.1 des Code-Plans)
auch **ohne** begleitendes Feld nicht abstürzt und keine Phantom-UI erzeugt (z. B. darf der Import
dieser Datei **keinen** `toc`-Knoten im Dokument erzeugen, obwohl zwei Überschriften eine `tocId`
bekommen — das ist korrektes Verhalten laut Architektur, aber explizit zu bestätigen, kein
impliziter Nebeneffekt).

### 0.7 Cross-Format-E2E weiterhin nicht ausführbar (bereits aus `seitenumbruch-qa.md` bekannte App-Einschränkung, hier erneut bestätigt)

Erneut gegen `src/app/DocumentWorkspace.tsx` und `src/app/FormatPicker.tsx` geprüft: Die App
bietet weiterhin **keine** Format-Konvertierungsfunktion („Als ODT exportieren" aus einem
DOCX-Dokument heraus o. ä.) — jede Karte ist starr an ihr eigenes Format gebunden. Anforderung
Abschnitt 4.3 (Doppelte Rundreise/Cross-Format) ist deshalb mit der App **in ihrem aktuellen
Funktionsumfang** nicht als echter Browser-E2E-Test durchführbar; das ist unabhängig vom
Inhaltsverzeichnis-Feature und wird — wie bereits bei `seitenumbruch-qa.md` Abschnitt 0.2 — als
Unit-Ebene-Pflichttest (Abschnitt 3.7 unten) plus dokumentierte, **nicht** stillschweigend
ausgelassene E2E-Lücke (Abschnitt 4.9 unten) geführt.

---

## 1. Ausführungsumgebung

| Ebene | Befehl | Bemerkung |
|---|---|---|
| Unit-/Komponententests | `npm run test` (`vitest run`) | jsdom-Umgebung |
| E2E (echter Browser) | `npm run test:e2e` (`playwright test`) | `webServer` startet Build + Preview, drei Projekte (`Desktop Chrome`, `Mobile`, `Tablet`) laufen standardmäßig, wie bei allen bestehenden Specs |
| E2E UI-Debug | `npm run test:e2e:ui` | zur manuellen Fehlersuche |

Gemeinsame Konventionen (aus bestehenden Specs übernommen):
- Jeder E2E-Test beginnt mit `page.goto('/')` +
  `page.getByRole('button', { name: /verstanden/i }).click()` (schließt `PrivacyModal`).
- Format-Karten: `page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })`
  bzw. `'OpenDocument Text (.odt)'`.
- Neues Dokument: `<Karte>.getByRole('button', { name: 'Neu erstellen' }).click()`.
- Datei-Upload: `<Karte>.locator('input[type="file"]')` + `setInputFiles({ name, mimeType, buffer })`.
- Export/Download: `const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportieren' }).click(); const download = await downloadPromise; const buf = await fs.readFile((await download.path())!)`.
- **Unabhängiger Parser**: `JSZip.loadAsync(buffer)` + rohes XML-String-/Regex-Parsen (kein
  python-docx nötig) — für **Zählungen** (`<w:bookmarkStart`, `<text:table-of-content`) wird
  `(xml.match(/…/g) ?? []).length` verwendet, nicht `toContain`.

Neue, feature-spezifische Selektoren/Hilfsfunktionen (aus `inhaltsverzeichnis-einfuegen-code.md`
Abschnitt 5/6/7/8 abgeleitet — bei Umsetzung gegen die tatsächlich gebauten `aria-label`/Klassen
zu verifizieren, nicht blind zu übernehmen):

```ts
async function openInsertTocDialog(page: Page) {
  await page.locator('.ProseMirror').click()
  await page.getByRole('button', { name: 'Inhaltsverzeichnis einfügen' }).click()
  return page.getByRole('dialog', { name: /inhaltsverzeichnis/i })
}
async function insertTocViaDialog(page: Page, maxLevel?: number) {
  const dialog = await openInsertTocDialog(page)
  if (maxLevel) await dialog.getByLabel(/ebenentiefe/i).selectOption(String(maxLevel))
  await dialog.getByRole('button', { name: 'Einfügen' }).click()
}
const tocContainer = (page: Page) => page.locator('.ProseMirror .pm-toc')
const tocEntries = (page: Page) => page.locator('.ProseMirror .pm-toc-entry')
const tocRefreshButton = (page: Page) => tocContainer(page).getByRole('button', { name: 'Aktualisieren' })
```

---

## 2. Ausgangslage zum Zeitpunkt der Testplan-Erstellung (2026-07-04)

Eigenständig gegen den Code verifiziert (deckt sich mit `inhaltsverzeichnis-einfuegen-code.md`
Abschnitt 0):

| Datei | Ist-Zustand jetzt |
|---|---|
| `src/formats/shared/schema.ts` (153 Zeilen) | Kein `toc`/`toc_entry`-Node, `heading` hat kein `tocId`-Attribut. |
| `src/formats/shared/editor/Toolbar.tsx` (247 Zeilen) | Kein „Inhaltsverzeichnis"/„TOC"-Bezug, keine Gruppe „Referenzen"; letztes Element ist der Bild-Upload (Zeile 241–244). |
| `src/formats/shared/editor/commands.ts` (107 Zeilen) | Keine `collectHeadings`/`insertTableOfContents`/`updateTableOfContentsAt`/`navigateToTocEntry`. |
| `src/formats/shared/editor/WordEditor.tsx` (133 Zeilen) | Kein `tocPlugin`/Klick-Navigations-Mechanismus. |
| `src/formats/shared/editor/InsertTocDialog.tsx`, `tocConfig.ts`, `tocPlugin.ts`, `tocJson.ts` | **Existieren nicht.** |
| `src/formats/docx/writer.ts`/`reader.ts` | Kein Feldcode-/Bookmark-Handling. |
| `src/formats/odt/writer.ts`/`reader.ts` | Kein `text:table-of-content`-Handling. |
| `tests/fixtures/external/docx/*` | 0 von 127 Dateien enthält ein echtes TOC-Feld; 1 Datei (`65099.docx`) enthält orphane `_Toc…`-Bookmarks ohne Feld (eigener Fund, Abschnitt 0.6). |
| `tests/fixtures/external/odt/*` | 3 von 202 Dateien (`test1.odt`, `compdocfileformat.odt`, `excelfileformat.odt`) enthalten ein echtes `<text:table-of-content>`. |

**Konsequenz:** Alle Testfälle in diesem Plan sind gegen den heutigen Code **zwangsläufig rot**
bzw. nicht ausführbar — das ist erwartet. Dieser Plan ist die Ziel-/Abnahme-Suite, die nach jeder
Umsetzungs-Iteration erneut vollständig ausgeführt wird.

---

## 3. Abschnitt A — Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT) und Editor-Commands

### 3.1 Neu: `src/formats/shared/editor/__tests__/tocCommands.test.ts`

| ID | Testfall | Erwartung |
|---|---|---|
| UT-CMD-01 | `collectHeadings(doc)` — leeres Dokument | `[]` |
| UT-CMD-02 | `collectHeadings(doc)` — 5 Überschriften unterschiedlicher Ebene, dazwischen Fließtext | 5 `HeadingRef`s **exakt in Dokumentreihenfolge**, `level`/`text` korrekt, unabhängig von der Ebenenfolge (Grenzfall 6/7 — auch bei Sprüngen 1→4 keine Normalisierung) |
| UT-CMD-03 | `collectHeadings(doc)` — Überschrift **verschachtelt** in `list_item`/Tabellenzelle | Wird trotzdem gefunden (volle `doc.descendants`-Traversierung, nicht nur Top-Level) |
| UT-CMD-04 | `insertTableOfContents(3)` — 5 Überschriften Ebene 1–5 | Erzeugter `toc`-Node enthält genau 3 Einträge (Ebene 1–3), in Dokumentreihenfolge; Ebene 4/5 fehlen |
| UT-CMD-05 | `insertTableOfContents(3)` — **keine** Überschrift im Dokument | `toc`-Node mit `content: []` wird trotzdem erzeugt (Grenzfall 2) — **kein** `false`-Rückgabewert, **kein** No-Op |
| UT-CMD-06 | `insertTableOfContents(3)` vergibt `tocId` an **jede** Überschrift bis Ebene 6, nicht nur bis `maxLevel` | Nach Aufruf: auch eine Ebene-5-Überschrift (oberhalb von `maxLevel=3`) trägt eine `tocId` (Entscheidung 1.4 des Code-Plans, Vorgriff auf `inhaltsverzeichnis-aktualisieren`) |
| UT-CMD-07 | `insertTableOfContents` ruft **kein zweites Mal** eine bereits vorhandene `tocId` neu zu | Zweiter Aufruf (zweites Verzeichnis, Grenzfall 9) verändert die `tocId` bereits erfasster Überschriften **nicht** |
| UT-CMD-08 | `generateUniqueTocId` bei **erzwungener** `Math.random()`-Kollision (Mock: erste zwei Aufrufe liefern denselben Wert) | Liefert dennoch zwei **unterschiedliche** Ids (Retry-Schleife greift) — Regressionstest gegen exakt das in `odt/writer.ts:109` bereits einmal aufgetretene Kollisionsmuster, hier **präventiv** statt reaktiv geprüft |
| UT-CMD-09 | `insertTableOfContents` mit aktiver Selektion | Selektion wird ersetzt (Grenzfall 10), nicht zusätzlich zum eingefügten Verzeichnis erhalten |
| UT-CMD-10 | `insertTableOfContents` mit Cursor in `list_item`/Tabellenzelle | Kein Crash; `toc`-Node wird strukturell eingebettet, ohne die Liste/Tabelle zu splitten (Entscheidung 1.10) — **muss** das tatsächliche Ergebnis-JSON prüfen, nicht nur „kein Fehler" |
| UT-CMD-11 | **Ein einziger Undo-Schritt**: `insertTableOfContents(3)` einmal aufrufen (mit `history()`-Plugin im Test-Setup), dann genau ein `undo()` | Dokument entspricht exakt dem Zustand vor dem Einfügen — inklusive der in derselben Transaktion vergebenen `tocId`-Attribute auf Überschriften (Anforderung 2.7) |
| UT-CMD-12 | `updateTableOfContentsAt(pos)` — Überschrift nachträglich umbenannt | Neu berechnete Einträge spiegeln den geänderten Text wider (Testfall 6 der Anforderung) |
| UT-CMD-13 | `updateTableOfContentsAt(pos)` — Überschrift nachträglich **hinzugefügt** unterhalb `maxLevel` | Erscheint nach `updateTableOfContentsAt` als neuer Eintrag |
| UT-CMD-14 | `updateTableOfContentsAt(pos)` respektiert die beim Einfügen gewählte `maxLevel` | `maxLevel` des Knotens bleibt nach dem Aufruf unverändert (Entscheidung 1.11/DoD Punkt 4) |
| UT-CMD-15 | `updateTableOfContentsAt(pos)` mit `pos`, das **keinen** `toc`-Knoten (mehr) referenziert | Gibt `false` zurück, `dispatch` wird **nicht** aufgerufen — kein Crash |
| UT-CMD-16 | `navigateToTocEntry(view, tocId)` — Ziel existiert | Liefert `true`; Selektion liegt nachweislich am Anfang der referenzierten Überschrift (nicht nur „irgendwo im Dokument") |
| UT-CMD-17 | `navigateToTocEntry(view, tocId)` — Ziel-Überschrift wurde gelöscht (Grenzfall 13) | Liefert `false`; **keine** Selektionsänderung, **kein** Crash |
| UT-CMD-18 | 200 generierte Überschriften (per Skript) → `collectHeadings`/`insertTableOfContents` | Läuft in vertretbarer Zeit durch (z. B. `< 200ms` in der Testumgebung als grobe Guard-Assertion), erzeugt exakt 200 Einträge in korrekter Reihenfolge (Grenzfall 4) |
| UT-CMD-19 | Überschriftentext mit Umlauten/Emoji/Sonderzeichen (`Größe & Öffnung 🎉`) | `collectHeadings`/erzeugter Eintrag übernimmt den Text **unverändert**, `hard_break` innerhalb der Überschrift wird zu einem einzelnen Leerzeichen (Entscheidung 1.7) |

### 3.2 Neu: `src/formats/shared/__tests__/tocJson.test.ts`

| ID | Testfall | Erwartung |
|---|---|---|
| UT-JSON-01 | `resolveTocPlaceholders(blocks)` — `toc`-Platzhalter steht **vor** allen referenzierten Überschriften im Baum | Einträge werden trotzdem korrekt aus den (später im Baum liegenden) Überschriften gebaut |
| UT-JSON-02 | `toc`-Platzhalter steht **nach** den Überschriften | Analog korrekt |
| UT-JSON-03 | Überschriften verschachtelt in Liste/Tabelle | Werden gefunden (rekursiver `visit`) |
| UT-JSON-04 | Zwei `toc`-Platzhalter mit **unterschiedlichem** `maxLevel` im selben Baum | Bekommen unabhängige, jeweils korrekt gefilterte Entry-Listen |
| UT-JSON-05 | `toc`-Platzhalter vorhanden, **keine** Überschrift im Baum, aber `fallbackCachedTextByTocIndex` enthält Text für diesen Index | Einträge werden aus dem Fallback-Text gebaut, `tocId: null` je Eintrag (klickbar-inaktiv) |
| UT-JSON-06 | **Kein** `toc`-Platzhalter irgendwo im Baum | Funktion kehrt sofort zurück (`containsTocPlaceholder` false) — **keine** `tocId` wird auf vorhandenen Überschriften vergeben (wichtig: ein plain importiertes Dokument ohne Verzeichnis bekommt **keine** stillen `tocId`-Attribute) |
| UT-JSON-07 | Überschrift hat **bereits** eine `tocId` (z. B. weil sie bereits einmal referenziert wurde) | Wird **nicht** überschrieben, bleibt exakt erhalten |

### 3.3 Schema-Test (Erweiterung/neu `src/formats/shared/__tests__/schema.test.ts`)

| ID | Testfall | Erwartung |
|---|---|---|
| UT-SCHEMA-01 | `wordSchema.nodes.toc`/`toc_entry` existieren | `toc.spec.content === 'toc_entry*'`, `toc_entry.spec.atom === true`, `toc_entry.spec.selectable === false` |
| UT-SCHEMA-02 | Versuch, eine `insertText`-Transaktion **innerhalb** eines `toc_entry`-Knotens anzuwenden (Position mitten im Knoten) | Transaktion wird von ProseMirrors eigener Validierung abgelehnt bzw. verändert den `toc_entry`-Knoten **nicht** — direkter Nachweis für Entscheidung 1.2 („kein neuer Zusatzcode nötig, ergibt sich aus dem Content-Model"), **nicht** nur angenommen |
| UT-SCHEMA-03 | `heading`-Node mit `tocId: 'h123'` → `toJSON()` → `nodeFromJSON()` | `tocId` bleibt über die JSON-Rundreise erhalten |
| UT-SCHEMA-04 | `heading`-Node **ohne** `tocId` (frisch getippt) → `toJSON()` | Attribut ist `null` (Default), kein Crash bei fehlendem Attribut in Alt-Dokumenten (Abwärtskompatibilität zu vor der Umsetzung importierten/gespeicherten Zwischenständen) |

### 3.4 DOCX-Rundreise — Erweiterung `src/formats/docx/__tests__/roundtrip.test.ts`, neuer `describe('DOCX round trip: table of contents', …)`

| ID | Testfall | Erwartung |
|---|---|---|
| UT-DOCX-RT-01 | 5 Überschriften Ebene 1–3 + `insertTableOfContents(3)`-Ergebnis als Fixture → `writeDocx` → rohes `word/document.xml` | Enthält `<w:instrText>` mit `TOC \o "1-3"` (bzw. äquivalent), je referenzierter Überschrift ein `<w:bookmarkStart w:name="_Toc…">`/`<w:bookmarkEnd>`-Paar, je Eintrag ein `<w:hyperlink w:anchor="_Toc…">` |
| UT-DOCX-RT-02 | Ergebnis aus UT-DOCX-RT-01 → `readDocx` | Enthält wieder einen `toc`-Knoten mit denselben 5 Einträgen (Text/Ebene/Reihenfolge identisch zum Original), referenzierte Überschriften tragen dieselben `tocId`s wie ihre Bookmarks |
| **UT-DOCX-RT-HEADING-TEXT-WITH-BOOKMARK** *(Pflicht, siehe Risiko-Klasse „Text neben Bookmark im selben Absatz")* | Überschrift **mit** eigenem, längerem Text **und** referenzierter `tocId` (⇒ Bookmark-Wrapping laut Abschnitt 9.2 des Code-Plans, `<w:bookmarkStart>…Runs…<w:bookmarkEnd>` **innerhalb** desselben `<w:p>`) → Rundreise | Der **vollständige** Überschriftentext bleibt erhalten — **nicht** nur der Teil vor/nach dem Bookmark-Tag-Paar. Analog zur in `seitenumbruch-qa.md` Abschnitt 0.1 bereits einmal aufgedeckten Fehlerklasse „Text neben einem eingefügten Marker-Tag im selben Absatz geht beim Reimport verloren" — hier am neuen Bookmark-Mechanismus geprüft, nicht angenommen |
| UT-DOCX-RT-03 | `toc` mit `content: []` (keine Überschrift im Dokument, Grenzfall 2) → Rundreise | Bleibt als leerer `toc`-Knoten mit dem Hinweistext-Absatz „Keine Überschriften gefunden" im Cache-Bereich erhalten, **kein** Crash, **kein** stiller Verlust des `toc`-Charakters |
| UT-DOCX-RT-04 | Ebenen-Sprung (Überschrift Ebene 1 direkt gefolgt von Ebene 4, `maxLevel=6`) → Rundreise | Eintrags-Ebene bleibt exakt `4`, keine Normalisierung auf `2` (Grenzfall 7) |
| UT-DOCX-RT-05 | Überschriftentext mit Umlauten/Emoji (`Kapitel Ö & 🎉`) → Rundreise | Text unverändert in Eintrag **und** im referenzierten Heading (Grenzfall 14) |
| UT-DOCX-RT-06 | **Zwei** unabhängige `toc`-Knoten im selben Dokument, unterschiedliche Überschriften-Teilmengen referenziert → Rundreise | Beide Verzeichnisse bleiben nach Reimport unabhängig funktionsfähig — insbesondere **keine** kollidierenden `w:bookmarkStart w:id`/`w:name`-Werte im exportierten XML (Grenzfall 9) |
| UT-DOCX-RT-07 | Baseline-Gegenprobe: Dokument mit Überschriften, aber **ohne** jedes `toc` | Kein Knoten im Ergebnis ist vom Typ `toc`, keine Überschrift bekommt eine `tocId` — reine Heading-Rundreise bleibt exakt wie vor der Umsetzung |
| **UT-DOCX-TOC-NO-END-MARKER** *(Pflicht, Abschnitt 0.2)* | Synthetisch gebautes DOCX: `<w:p>` mit `fldChar begin` + `instrText" TOC \o \"1-3\" ..."` + `fldChar separate`, gefolgt von zwei Cache-Absätzen mit sichtbarem Text, **ohne** dass irgendwo im restlichen Dokument ein `fldChar end` folgt (bis Dateiende) | Dokumentiert das **tatsächliche** Verhalten: kein Absturz, keine Endlosschleife (Mindestanforderung); **explizit** protokollieren, ob die beiden Cache-Absätze tatsächlich verloren gehen (wie vom Code-Plan selbst prognostiziert) — falls ja, ist das **im Abnahmeprotokoll** als bewusst akzeptierte Einschränkung festzuhalten, nicht als „besteht" ohne Kommentar |
| **UT-DOCX-TOC-STYLE-BASED-FIELD** *(Pflicht, Abschnitt 0.4)* | Synthetisch gebautes DOCX mit `instrText" TOC \t \"Überschrift 1,1,Überschrift 2,2\" \h \z \u "` (kein `\o`-Schalter) | Dokumentiert das **tatsächliche** Verhalten (als TOC erkannt mit Fallback-`maxLevel=3`? Komplett ignoriert/als Fließtext behandelt?) — Ergebnis wird im Abnahmeprotokoll festgehalten, nicht als „unwahrscheinlicher Fall, ignorieren" übergangen |
| **UT-DOCX-TOC-STALE-CACHE-ON-IMPORT** *(Pflicht, Abschnitt 0.3)* | Synthetisch gebautes DOCX: TOC-Feld mit Cache-Eintrag „Altes Kapitel" (referenziert eine Bookmark, die um eine Überschrift liegt, deren **tatsächlicher** Text im Dokument inzwischen „Neues Kapitel" lautet — simuliert externe Bearbeitung ohne Word-F9) → `readDocx` | Dokumentiert, **ob** der resultierende `toc`-Knoten „Altes Kapitel" (eingefroren, wie Grenzfall 12 nahelegt) oder „Neues Kapitel" (live neu berechnet, wie `resolveTocPlaceholders` tatsächlich tut) zeigt — das Ergebnis ist in `inhaltsverzeichnis-einfuegen-req.md` als explizite, bewusste Antwort auf diese Grauzone nachzutragen |

### 3.5 DOCX-Reader — reale Fremddatei-Fixtures (neu: `src/formats/docx/__tests__/toc.test.ts`)

| ID | Fixture | Testfall | Erwartung |
|---|---|---|---|
| **UT-DOCX-TOC-ORPHANED-BOOKMARKS** | `65099.docx` (eigener Fund, Abschnitt 0.6 — **nicht** im Code-Plan erwähnt) | `readDocx(buffer)` | Kein Crash; die Überschrift „Acronyms" bekommt eine `tocId` (aus dem Bookmark `_Toc45266674` bzw. `_Toc47012377` abgeleitet, Abschnitt 10.1); das Dokument enthält **keinen** `toc`-Knoten (da kein Feld vorhanden ist) — **explizit** zu verifizieren, dass aus zwei verwaisten Bookmarks **kein** Phantom-Verzeichnis „erfunden" wird |
| UT-DOCX-TOC-IGNORE-NONTOC-FIELDS | `FieldCodes.docx` (`AUTHOR`/`CREATEDATE`-Felder), `FldSimple.docx` (`FILENAME`-Feld) | `readDocx(buffer)` | Beide Dateien werden **nicht** als TOC-haltig erkannt (kein `toc`-Knoten im Ergebnis) — Regressionsschutz gegen eine zu breite „irgendein Feld = TOC"-Erkennung |
| UT-DOCX-TOC-SYNTH-01 (siehe 15.3 Code-Plan) | `buildDocxWithTocField()` — von Hand mit `JSZip` gebaut, unabhängig vom eigenen Writer, exaktes Feld-Quadrupel + Bookmark um eine echte Überschrift | `readDocx(buffer)` | Ergebnis enthält einen `toc`-Knoten mit dem korrekten Eintrag; verifiziert den **Lese**-Pfad unabhängig vom **Schreib**-Pfad (beide dürfen sich nicht gegenseitig unsichtbar kompensieren, wie in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19 gefordert) |

### 3.6 ODT-Rundreise — Erweiterung `src/formats/odt/__tests__/roundtrip.test.ts`, neuer `describe('ODT round trip: table of contents', …)`

| ID | Testfall | Erwartung |
|---|---|---|
| UT-ODT-RT-01 | 5 Überschriften Ebene 1–3 + `insertTableOfContents(3)` → `writeOdt` → rohes `content.xml` | Enthält `<text:table-of-content>` mit `<text:table-of-content-source text:outline-level="3">` (3 `text:table-of-content-entry-template`s) und `<text:index-body>` mit den 5 korrekten `<text:p>`-Einträgen — **nicht** nur eine flache `<text:p>`-Liste |
| UT-ODT-RT-02 | Ergebnis aus UT-ODT-RT-01 → `readOdt` | Enthält wieder einen `toc`-Knoten mit denselben 5 Einträgen |
| **UT-ODT-TOC-NAME-COLLISION** *(Pflicht, Abschnitt 0.1 — Kern-Defektnachweis)* | **Zwei** unabhängige `toc`-Knoten im selben Dokument (unterschiedliche Überschriften-Teilmengen, Grenzfall 9) → `writeOdt` → rohes `content.xml` | `[...contentXml.matchAll(/<text:table-of-content[^>]*text:name="([^"]+)"/g)].map(m => m[1])` liefert **zwei unterschiedliche** Namen — **vor** einem Fix schlägt dieser Test fehl, weil beide `"TableOfContents1"` lauten (siehe Abschnitt 0.1); **dieser Test muss vor Freigabe grün sein**, unabhängig davon, was sonst grün ist |
| UT-ODT-RT-03 | `toc` mit `content: []` → Rundreise | `<text:index-body>` enthält den Hinweistext-Absatz „Keine Überschriften gefunden", bleibt als `toc`-Knoten erkennbar |
| UT-ODT-RT-04 | Ebenen-Sprung (Ebene 1 → Ebene 4) → Rundreise | Eintrags-Ebene bleibt exakt `4` |
| UT-ODT-RT-05 | Sonderzeichen/Emoji im Überschriftentext → Rundreise | Unverändert erhalten (Grenzfall 14) |
| **UT-ODT-TOC-HREF-FORMAT** *(Pflicht, Abschnitt 0.5)* | Überschrift „Größe & Öffnung" (Leerzeichen + Umlaut + Et-Zeichen) → `writeOdt` | Exportierter `xlink:href`-Wert wird **exakt** gegen das reale, in `test1.odt` beobachtete, **unkodierte** Format geprüft (`#Größe & Öffnung|outline` bzw. das per `escapeXml` XML-sichere Äquivalent) — **nicht** gegen eine angenommene `encodeURIComponent`-Kodierung; falls die Umsetzung `encodeURIComponent` verwendet, muss dieser Test das explizit als Abweichung vom real beobachteten LibreOffice-Format aufzeigen, nicht stillschweigend grün werden |
| UT-ODT-TOC-REAL-FIXTURE-01 | `test1.odt` (real, 263 KB, verschachtelte Kapitel 1/1.1/1.2/…) → `readOdt` | `doc.body.content` enthält mindestens einen `{ type: 'toc' }`-Knoten mit **mehreren** Einträgen — **nicht** in Fließtext zerfallen (Grenzfall 17, DoD Punkt 11); Eintragstexte stimmen mit den tatsächlich im Dokument vorhandenen Überschriften überein (Stichprobe: „Detailed Specification" o. ä. aus dem im Code-Plan zitierten Ausschnitt) |
| UT-ODT-TOC-REAL-FIXTURE-02 | `compdocfileformat.odt` (real, aus Excel-Export) → `readOdt` | Analog: `toc`-Knoten erkannt, kein Crash |
| **UT-ODT-TOC-STALE-CACHE-ON-IMPORT** *(Pflicht, Abschnitt 0.3, ODT-Pendant)* | Synthetisches ODT: `<text:table-of-content>` mit Cache-Eintrag „Altes Kapitel", tatsächliche Überschrift im Dokument lautet „Neues Kapitel" | Analog zu `UT-DOCX-TOC-STALE-CACHE-ON-IMPORT` — dokumentiertes tatsächliches Verhalten, nicht angenommen |

### 3.7 Cross-Format-Kette auf Unit-Ebene (neu: `src/formats/shared/__tests__/toc-crossformat.test.ts`)

Einzig heute technisch mögliche Prüfung von Anforderung Abschnitt 4.3 (siehe Abschnitt 0.7 oben):

| ID | Testfall | Erwartung |
|---|---|---|
| UT-XFMT-TOC-01 | Dokument mit 5 Überschriften + `toc` → `writeDocx` → `readDocx` → `writeOdt` → `readOdt` | `toc`-Charakter, Einträge (Text/Ebene/Reihenfolge) bleiben über zwei Formatwechsel erhalten (Anforderung 4.3.1) |
| UT-XFMT-TOC-02 | Umgekehrte Kette: `writeOdt` → `readOdt` → `writeDocx` → `readDocx` | Analog (Anforderung 4.3.2) |
| UT-XFMT-TOC-03 | Ebenen-Sprünge **und** Sonderzeichen kombiniert, durch beide Ketten geschickt | Beides bleibt gleichzeitig erhalten (kumulativer Verlust-Test) |

### 3.8 Baseline-Regression (Anforderung Abschnitt 4, DoD)

| ID | Testfall | Erwartung |
|---|---|---|
| UT-BASE-01 | Alle **bestehenden** Tests in `docx/__tests__/roundtrip.test.ts`, `docx/__tests__/external-fixtures.test.ts`, `odt/__tests__/roundtrip.test.ts`, `odt/__tests__/external-fixtures.test.ts` (insbesondere Heading-bezogene Fälle) | Bleiben nach der Schema-Erweiterung (`tocId`-Attribut auf `heading`) unverändert grün |
| UT-BASE-02 | `npm run build` (`tsc -b`) | Läuft fehlerfrei durch, insbesondere nach den Signaturänderungen an `paragraphToBlocks`/`elementToBlocks`/`blockToDocx`/`blockToOdt` |
| UT-BASE-03 | Bestehender Test „recognizes real headings via `outlineLvl`/Regex-Fallback" (DOCX-Reader) | Bleibt unverändert grün — die neue Bookmark-Erkennung darf die bestehende Heading-Level-Erkennung nicht verändern |

---

## 4. Abschnitt B — ECHTE Playwright-Browser-Tests

Alle Tests in diesem Abschnitt verwenden **ausschließlich** echte Nutzerinteraktion. Kein Test
ruft `insertTableOfContents()`, `navigateToTocEntry()`, `updateTableOfContentsAt()` oder eine
andere interne Funktion/einen Command-Export direkt auf.

### 4.0 Pflichtergänzung: `tests/e2e/selection-regression.spec.ts` (Grenzfall 18, Testfall 10 der Anforderung)

Neuer Test **direkt** im bestehenden `describe`-Block dieser Datei (analog zum bereits etablierten
Muster für Tabellen/Seitenumbrüche), **nicht** nur isoliert in einer neuen Datei:

```ts
test('page break… ' /* Platzhaltername, siehe unten */ , async ({ page }) => {})

test('ToC insert + reselect + click entry + type — no data loss (Grenzfall 18)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Kapitel eins')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Text danach.')

  // Überschrift setzen, damit ein Verzeichnis überhaupt einen Eintrag bekommt
  await page.keyboard.press('Home')
  await page.keyboard.down('Shift')
  await page.keyboard.press('End')
  await page.keyboard.up('Shift')
  // (Zeile „Kapitel eins" markiert — Absatzformat auf Überschrift 1 setzen)
  await page.getByLabel('Absatzformat').selectOption('1')

  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.press('Enter')
  await insertTocViaDialog(page)

  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()

  // Reproduziert exakt den bekannten Selection-Sync-Bug-Auslöser: Klick auf einen ToC-Eintrag
  // ist selbst ein Mausklick im Editor-DOM.
  await tocEntries(page).first().click()
  await page.keyboard.type(' Weiterer Text.')

  await expect(editor).toContainText('Kapitel eins')
  await expect(editor).toContainText('Text danach.')
  await expect(editor).toContainText('Weiterer Text.')
})
```
**Abnahmekriterium:** Dieser Test bleibt dauerhafter Bestandteil der Suite (Anforderung Testfall
10, DoD Punkt 12) — nicht nur einmalig ausgeführt.

### 4.1 Dialog-Grundverhalten (Testfälle 2–4 der Anforderung, Grenzfall 1)

| ID | Testname | Kernschritte | Assertion |
|---|---|---|---|
| E2E-DIALOG-01 | `clicking the toolbar button opens the level-depth dialog` | `openInsertTocDialog(page)` | `dialog` sichtbar; `<select>`-Element hat den Fokus (Anforderung 2.1, „Fokus auf dem ersten Eingabeelement") |
| E2E-DIALOG-02 | `default depth selection is 3` | Dialog öffnen | `dialog.getByLabel(/ebenentiefe/i)` zeigt Wert `'3'` (`DEFAULT_TOC_LEVEL`) |
| E2E-DIALOG-03 | `confirming with default depth inserts a ToC filtering level 4+` | 5 Überschriften Ebene 1–5 anlegen → Dialog öffnen → sofort „Einfügen" | `tocEntries(page)` hat Anzahl `4` (Ebene 1–4? **nein** — Standard ist 3, also Ebene 1–3 → Anzahl `3`); exakte erwartete Anzahl wird bei Testerstellung gegen die tatsächlich gewählte `DEFAULT_TOC_LEVEL`-Konstante abgeglichen |
| E2E-DIALOG-04 | `pressing Escape closes the dialog without any document change` | Editor-Cursor an bekannte Position setzen (Text tippen, `Home`), Dialog öffnen, `Escape` | Dialog verschwindet aus dem DOM; `.pm-toc` existiert **nicht**; Cursor-Position unverändert (erneut tippen, prüfen dass neuer Text an erwarteter Stelle landet) |
| E2E-DIALOG-05 | `clicking outside the dialog (backdrop) closes it without inserting` | Dialog öffnen, Klick auf `page.locator('body')` außerhalb der Dialog-Box | Dialog verschwindet, kein `.pm-toc` im DOM |
| E2E-DIALOG-06 | `selecting a non-default depth and confirming inserts a ToC with that depth` | Dialog öffnen, `selectOption('2')`, „Einfügen" | `tocEntries(page)` enthält **nur** Ebene-1/2-Einträge (bei 5 Testüberschriften Ebene 1–5: Anzahl `2`) |

### 4.2 Generierung, Darstellung, Einrückung (Testfall 1, Grenzfall 2/3/5/6/7)

| ID | Testname | Kernschritte | Assertion |
|---|---|---|---|
| E2E-GEN-01 | `5 headings of different levels → ToC shows all 5 entries, correctly indented, in document order` | 5 Überschriften Ebene 1/2/3/1/2 (bewusst nicht monoton) über das Absatzformat-Dropdown anlegen → `insertTocViaDialog(page, 6)` | `tocEntries(page)` hat Anzahl `5`; Reihenfolge der `textContent`s entspricht der Tippreihenfolge (**nicht** nach Ebene sortiert); jeder Eintrag trägt `class` `pm-toc-level-N` passend zur tatsächlichen Heading-Ebene |
| E2E-GEN-02 | `inserting with no headings shows the placeholder` | Neues leeres Dokument → `insertTocViaDialog(page)` | `tocContainer(page)` sichtbar, `tocEntries(page)` Anzahl `0`, CSS-`:empty::after`-Platzhaltertext „Keine Überschriften gefunden" sichtbar (per `getComputedStyle`/visuelle Prüfung oder, falls stattdessen ein echter Eintrags-DOM-Knoten mit diesem Text gerendert wird, `tocContainer(page)` enthält diesen Text) — **kein** stiller No-Op (Grenzfall 2) |
| E2E-GEN-03 | `exactly one heading → ToC has exactly one entry, clickable` | 1 Überschrift → Verzeichnis einfügen → Eintrag anklicken | Genau 1 Eintrag; Klick springt korrekt zur einzigen Überschrift (Grenzfall 3) |
| E2E-GEN-04 | `heading level jump (1 → 4) is not normalized` | Überschrift Ebene 1, direkt gefolgt von Ebene 4 → Verzeichnis mit `maxLevel=6` | Zweiter Eintrag trägt `pm-toc-level-4` (vier Einrückungsstufen), **nicht** `pm-toc-level-2` (Grenzfall 7) |
| E2E-GEN-05 | `very long heading text does not break layout` | Überschrift mit sehr langem Text (z. B. 300 Zeichen) → Verzeichnis einfügen | Eintrag bleibt einzeilig (`white-space: nowrap`/Ellipsis, per `boundingBox()`-Breite ≤ Container-Breite geprüft), `title`-Attribut enthält den vollständigen Text (Tooltip, Grenzfall 5) |
| E2E-GEN-06 | `200 generated headings — insert, scroll, click remain responsive` | Skriptgeneriertes Dokument mit 200 Überschriften hochladen (synthetische Fixture) → Verzeichnis einfügen | `tocEntries(page)` Anzahl `200` innerhalb vertretbarer Zeit (`< 5s` grobe Guard-Assertion); Klick auf einen Eintrag in der Mitte der Liste springt weiterhin korrekt (Grenzfall 4) |
| E2E-GEN-07 | `heading with special characters/umlauts/emoji is preserved` | Überschrift „Größe & Öffnung 🎉" → Verzeichnis einfügen | Eintrag zeigt den Text unverändert |

### 4.3 Klick-Navigation (Testfälle 7–8 der Anforderung)

| ID | Testname | Kernschritte | Assertion |
|---|---|---|---|
| E2E-NAV-01 | `clicking a ToC entry scrolls to and places the cursor at the referenced heading` | Mehrseitiges Dokument (viel Füll-Text zwischen Überschriften) → Verzeichnis einfügen → Klick auf einen Eintrag, dessen Ziel **außerhalb** des aktuell sichtbaren Bereichs liegt | Zielüberschrift ist nach dem Klick sichtbar (`toBeInViewport()`); Cursor-Position lässt sich indirekt verifizieren, indem direkt danach getippt wird und der neue Text **unmittelbar an/nach dieser Überschrift** erscheint, nicht an anderer Stelle |
| E2E-NAV-02 | `jump works across a visual page break (pagination.ts)` | Dokument mit genug Inhalt, dass die Zielüberschrift auf einer **anderen visuellen Seite** liegt (`.page-break-spacer` zwischen Ausgangs- und Zielposition) → Klick auf Eintrag | Sprung funktioniert trotzdem zuverlässig (Testfall 8, Anforderung 2.6) |
| E2E-NAV-03 | `clicking an entry whose heading was deleted shows a visible flash, does not navigate, does not crash` | Verzeichnis einfügen → referenzierte Überschrift danach vollständig löschen (Text markieren + Entf, dann Absatzformat zurück auf „Standard" oder Absatz löschen) → Eintrag anklicken | `navigateToTocEntry`-Fehlschlag sichtbar gemacht (`.pm-toc-entry--missing`-Klasse/Flash-Animation kurzzeitig vorhanden, per `toHaveClass`-Polling), **kein** Sprung, **kein** Konsolenfehler (Grenzfall 13) |

### 4.4 Aktualisieren-Bedienelement (Testfall 6 der Anforderung)

| ID | Testname | Kernschritte | Assertion |
|---|---|---|---|
| E2E-REFRESH-01 | `renaming a heading and clicking "Aktualisieren" updates the ToC entry text` | Überschrift „Alt" → Verzeichnis einfügen → Überschrift zu „Neu" umbenennen → `tocRefreshButton(page).click()` | Eintrag zeigt danach „Neu", nicht mehr „Alt" |
| E2E-REFRESH-02 | `heading change alone (without clicking refresh) does NOT change the ToC entry` | Wie oben, aber **ohne** den Refresh-Button zu klicken | Eintrag zeigt weiterhin „Alt" — bestätigt das gewollte „Einfrieren bis Aktualisieren" (Abschnitt 2.8/Grenzfall 12) als tatsächliches Verhalten, nicht nur als Doku-Behauptung |
| E2E-REFRESH-03 | `adding a new heading below the ToC and clicking "Aktualisieren" adds a new entry` | Nach Verzeichnis-Einfügen eine weitere Überschrift unterhalb hinzufügen → Refresh klicken | Neuer Eintrag erscheint zusätzlich |

### 4.5 Undo/Redo (Testfall 9 der Anforderung, Grenzfall 11)

| ID | Testname | Kernschritte | Assertion |
|---|---|---|---|
| E2E-UNDO-01 | `Ctrl+Z right after inserting removes the whole ToC` | Text tippen → Verzeichnis einfügen → `ControlOrMeta+z` | `.pm-toc` verschwindet vollständig; Text davor/danach unverändert |
| E2E-UNDO-02 | `Redo restores the ToC with all entries` | Nach E2E-UNDO-01: `ControlOrMeta+Shift+z` | `.pm-toc` erscheint erneut mit derselben Eintragsanzahl |
| E2E-UNDO-03 | `Undo after insert, then typing at the restored cursor position does not lose content` | Text „Davor. " tippen → Verzeichnis einfügen → Undo → weitertippen „Danach." | `.ProseMirror` enthält „Davor. Danach." zusammenhängend, `.pm-toc` Anzahl `0` (Grenzfall 11) |

### 4.6 Sonderpositionen/Grenzfälle im Editor (Grenzfall 1/8/9/10)

| ID | Testname | Kernschritte | Assertion |
|---|---|---|---|
| E2E-EDGE-01 | `inserting at the very start of the document` | Neues leeres Dokument, sofort Verzeichnis einfügen (ohne vorherige Eingabe) | Kein Crash; Cursor kann danach positioniert und weitergetippt werden (Abschnitt 2.10) |
| E2E-EDGE-02 | `inserting while text is selected replaces the selection` | Text tippen, `ControlOrMeta+a`, Verzeichnis einfügen | Ursprünglicher Text ist weg, `.pm-toc` vorhanden (Grenzfall 10) |
| E2E-EDGE-03 | `inserting with the cursor inside a table cell embeds the ToC, does not break the table` | Tabelle einfügen, in Zelle klicken, Verzeichnis einfügen | Tabellenstruktur bleibt vollständig (`.ProseMirror table` weiterhin mit unveränderter Zellenanzahl vorhanden); `.pm-toc` liegt nachweislich **innerhalb** der Zelle (DOM-Verschachtelung geprüft), kein Absturz (Grenzfall 8, Entscheidung 1.10) |
| E2E-EDGE-04 | `inserting with the cursor inside a list item embeds the ToC without breaking the list` | Aufzählung erzeugen, Cursor in einem Punkt, Verzeichnis einfügen | Liste bleibt **ein** `<ul>` (nicht gesplittet); `.pm-toc` liegt innerhalb desselben `<li>` |
| E2E-EDGE-05 | `inserting two ToCs in the same document — both remain independently clickable` | Zwei Überschriften-Gruppen mit dazwischenliegendem zweiten Verzeichnis anlegen (Grenzfall 9) | `page.locator('.pm-toc')` Anzahl `2`; Klick auf einen Eintrag im **ersten** Verzeichnis springt korrekt, Klick auf einen Eintrag im **zweiten** ebenso — keine Vertauschung/Kollision der Sprungziele |
| E2E-EDGE-06 | `typing into a ToC does not corrupt the document or crash the editor` | Verzeichnis einfügen → Klick **zwischen** zwei Einträgen (nicht auf einen Eintrag, sondern in den Zwischenraum/Header-Bereich) → versuchen zu tippen | Kein Editor-Absturz, kein inkonsistenter Zustand (leere weiße Seite, hängende Interaktion) — Ergebnis (Tipp-Versuch wird ignoriert oder landet außerhalb des `toc`-Knotens) wird protokolliert (Abschnitt 2.9) |

### 4.7 Datei-Rundreise DOCX — echter Upload/Export (Anforderung 4.1, Testfall 11)

Neue Datei `tests/e2e/toc-roundtrip.spec.ts`:

```ts
test('DOCX: ToC via dialog round-trips through real export/re-import, verified with an independent parser', async ({ page }) => {
  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()

  const headings = ['Einleitung', 'Hauptteil', 'Unterkapitel', 'Schluss', 'Anhang']
  for (const [i, text] of headings.entries()) {
    await page.keyboard.type(text)
    await page.keyboard.press('Home')
    await page.keyboard.down('Shift'); await page.keyboard.press('End'); await page.keyboard.up('Shift')
    await page.getByLabel('Absatzformat').selectOption(String((i % 3) + 1))
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
  }

  await insertTocViaDialog(page, 3)
  await expect(tocEntries(page)).toHaveCount(5)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const buffer = await fs.readFile((await download.path())!)

  // Unabhängiger Parser: JSZip + rohes XML, KEIN Aufruf app-eigener reader.ts-Funktionen
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buffer)
  const documentXml = await zip.file('word/document.xml')!.async('text')

  expect(documentXml).toMatch(/<w:instrText[^>]*>[^<]*TOC[^<]*<\/w:instrText>/)
  expect((documentXml.match(/<w:bookmarkStart\b/g) ?? []).length).toBeGreaterThanOrEqual(5)
  for (const text of headings) expect(documentXml).toContain(text)

  // Re-Import (Anforderung 4.1.2):
  await page.reload()
  await page.getByRole('button', { name: /verstanden/i }).click()
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({ name: 'export.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
  await expect(tocContainer(page)).toBeVisible()
  await expect(tocEntries(page)).toHaveCount(5)
})
```

| ID | Testfall | Kernprüfung |
|---|---|---|
| E2E-RT-DOCX-01 | wie oben | echte `<w:instrText>` mit TOC, echte `<w:bookmarkStart>`-Anzahl ≥ 5, alle Überschriftentexte im XML, Re-Upload zeigt weiterhin `.pm-toc` mit 5 Einträgen |
| E2E-RT-DOCX-02 | Zwei Verzeichnisse im selben Dokument → Export → rohes XML | `[...documentXml.matchAll(/<w:bookmarkStart[^>]*w:name="([^"]+)"/g)].map(m=>m[1])` enthält **keine** Duplikate (Grenzfall 9, echte Datei-Ebene) |
| **E2E-RT-DOCX-MALFORMED** | Synthetisch gebaute, defekte DOCX (kein `fldChar end`, siehe UT-DOCX-TOC-NO-END-MARKER) **über echten Upload** hochladen | Kein Absturz der App (keine weiße Seite, keine Konsolenfehler), dokumentiertes Verhalten wie im Unit-Test — hier zusätzlich über den echten Upload-Pfad bestätigt, nicht nur auf Funktionsebene |

### 4.8 Datei-Rundreise ODT — echter Upload/Export (Anforderung 4.2, Testfall 12)

| ID | Testname | Kernschritte | Assertion |
|---|---|---|---|
| E2E-RT-ODT-01 | `ODT: ToC via dialog round-trips through real export/re-import` | Analog E2E-RT-DOCX-01, ODT-Karte | Exportiertes `content.xml` enthält `<text:table-of-content>` mit `<text:table-of-content-source>`/`<text:index-body>`; Re-Upload zeigt `.pm-toc` mit korrekter Eintragsanzahl |
| **E2E-RT-ODT-NAME-COLLISION** | Zwei Verzeichnisse im selben Dokument → Export | `[...contentXml.matchAll(/<text:table-of-content[^>]*text:name="([^"]+)"/g)].map(m=>m[1])` enthält **zwei unterschiedliche** Werte — echte Datei-Ebene-Bestätigung des Kern-Befunds aus Abschnitt 0.1 |
| E2E-RT-ODT-REAL-FIXTURE | Reale Fixture `test1.odt` **über echten Upload** hochladen | `.pm-toc` sichtbar im Editor, `tocEntries(page)` Anzahl > 0, kein Absturz (Grenzfall 17, Testfall 14 — ODT-Teil) |
| E2E-RT-DOCX-ORPHANED-FIXTURE | Reale Fixture `65099.docx` **über echten Upload** hochladen (eigener Fund, Abschnitt 0.6) | Editor zeigt die Überschrift „Acronyms" normal an, **kein** `.pm-toc` im DOM (da kein tatsächliches Feld vorhanden ist), kein Absturz — Testfall 14, DOCX-Teil, **präziser** als der im Code-Plan selbst vorgesehene rein synthetische Ersatz |

### 4.9 Cross-Format E2E (dokumentierte Lücke, siehe Abschnitt 0.7)

Kein Testfall dieser Ebene für Anforderung Abschnitt 4.3/Testfall 13 möglich, solange die App
keine Format-Konvertierungsfunktion anbietet (bereits aus `seitenumbruch-qa.md` bekannte,
unabhängige App-Einschränkung). Wird in der Abnahme als offener Punkt geführt (Abschnitt 3.7
oben deckt die Anforderung stattdessen vollständig auf Unit-Ebene ab), **nicht** stillschweigend
als „erledigt" markiert.

### 4.10 Baseline-E2E-Regression

| ID | Testfall | Erwartung |
|---|---|---|
| E2E-BASE-01 | Alle bestehenden Tests in `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, `tests/e2e/selection-regression.spec.ts`, `tests/e2e/lifecycle.spec.ts` | Bleiben nach Einführung des Features unverändert grün — insbesondere darf die neue Toolbar-Gruppe „Referenzen" keine bestehenden `getByTitle`/`getByRole`-Selektoren verdecken oder umbenennen |

---

## 5. Traceability-Matrix (Anforderung ↔ Testfall)

| Anforderungsteil | Abgedeckt durch |
|---|---|
| §1 Zeile 85 (Toolbar-Button, Gruppe „Referenzen") | E2E-DIALOG-01 |
| §1 Zeile 86 (Options-Dialog Ebenentiefe) | E2E-DIALOG-01–06 |
| §1 Zeile 87 (Generierungslogik, volle Traversierung) | UT-CMD-01–08, E2E-GEN-01 |
| §1 Zeile 88 (visuell abgesetzte Darstellung) | E2E-GEN-01/02/04/05 |
| §1 Zeile 89 (Klick-Navigation) | UT-CMD-16/17, E2E-NAV-01–03 |
| §1 Zeile 90 (Aktualisieren-Bedienelement) | UT-CMD-12–14, E2E-REFRESH-01–03 |
| §1 Zeile 91 (DOCX-Feldexport) | UT-DOCX-RT-01/02, E2E-RT-DOCX-01 |
| §1 Zeile 92 (ODT-Element-Export) | UT-ODT-RT-01/02, E2E-RT-ODT-01 |
| §1 Zeile 93 (Bookmarks DOCX) | UT-DOCX-RT-01, E2E-RT-DOCX-01 |
| §1 Zeile 94 (Import-Erkennung vorhandenes Feld) | UT-DOCX-TOC-SYNTH-01, UT-ODT-TOC-REAL-FIXTURE-01/02, E2E-RT-ODT-REAL-FIXTURE |
| §2.1/2.2 (Dialogverhalten) | E2E-DIALOG-01–06 |
| §2.3 (volle Traversierung, Grenzfall 2, Reihenfolge) | UT-CMD-01–05, E2E-GEN-01/02 |
| §2.4 (Platzierung/Cursor nach Einfügen) | UT-CMD-09/10, E2E-EDGE-01/02 |
| §2.5 (visuelle Darstellung, Seitenzahl offen → keine) | E2E-GEN-01, Entscheidung 1.3 (dokumentiert, kein Test nötig) |
| §2.6 (Klick-Navigation inkl. Pagination-Zusammenspiel) | UT-CMD-16/17, E2E-NAV-01/02 |
| §2.7 (Undo/Redo) | UT-CMD-11, E2E-UNDO-01–03 |
| §2.8 (Einfrieren bis Aktualisieren) | E2E-REFRESH-02, UT-DOCX/ODT-TOC-STALE-CACHE-ON-IMPORT (Abschnitt 0.3) |
| §2.9 (Editierbarkeit geschützt) | UT-SCHEMA-02, E2E-EDGE-06 |
| §2.10 (Sonderpositionen: Dokumentanfang, Listen/Tabellen) | E2E-EDGE-01/03/04 |
| Grenzfall 1 (Abbrechen) | E2E-DIALOG-04/05 |
| Grenzfall 2 (keine Überschrift) | UT-CMD-05, E2E-GEN-02 |
| Grenzfall 3 (genau eine Überschrift) | E2E-GEN-03 |
| Grenzfall 4 (200 Überschriften) | UT-CMD-18, E2E-GEN-06 |
| Grenzfall 5 (sehr langer Text) | E2E-GEN-05 |
| Grenzfall 6 (Inline-Formatierung → reine Textübernahme) | UT-CMD-19 (Entscheidung 1.7) |
| Grenzfall 7 (Ebenen-Sprünge) | UT-DOCX-RT-04, E2E-GEN-04 |
| Grenzfall 8 (Tabellenzelle/Listenelement) | UT-CMD-10, E2E-EDGE-03/04 |
| Grenzfall 9 (mehrfaches Einfügen) | UT-DOCX-RT-06, **UT-ODT-TOC-NAME-COLLISION**, E2E-EDGE-05, E2E-RT-DOCX-02, E2E-RT-ODT-NAME-COLLISION |
| Grenzfall 10 (Einfügen bei Selektion) | UT-CMD-09, E2E-EDGE-02 |
| Grenzfall 11 (Undo + weiter tippen) | E2E-UNDO-03 |
| Grenzfall 12 (veraltet bis Aktualisieren) | E2E-REFRESH-02, Abschnitt 0.3 |
| Grenzfall 13 (Klick auf gelöschtes Ziel) | UT-CMD-17, E2E-NAV-03 |
| Grenzfall 14 (Sonderzeichen/Emoji) | UT-CMD-19, UT-DOCX/ODT-RT-05, E2E-GEN-07 |
| Grenzfall 15 (Seitenzahl — Entscheidung: keine) | Kein Test nötig, Entscheidung 1.3 dokumentiert |
| Grenzfall 16 (Import DOCX-Fremddatei mit TOC) | UT-DOCX-TOC-SYNTH-01, **UT-DOCX-TOC-ORPHANED-BOOKMARKS**, **UT-DOCX-TOC-NO-END-MARKER**, E2E-RT-DOCX-MALFORMED, E2E-RT-DOCX-ORPHANED-FIXTURE |
| Grenzfall 17 (Import ODT-Fremddatei mit TOC) | UT-ODT-TOC-REAL-FIXTURE-01/02, E2E-RT-ODT-REAL-FIXTURE |
| Grenzfall 18 (Selection-Sync-Regression) | E2E-Pflichttest in `selection-regression.spec.ts` (Abschnitt 4.0) |
| Grenzfall 19 (Kopf-/Fußzeile) | Nicht erreichbar, keine UI — dokumentierte Nicht-Anwendbarkeit (wie Anforderung selbst festhält) |
| §4.1 DOCX-Rundreise (1–5) | UT-DOCX-RT-*, E2E-RT-DOCX-01/02 |
| §4.2 ODT-Rundreise (1–4) | UT-ODT-RT-*, E2E-RT-ODT-01 |
| §4.3 Cross-Format | UT-XFMT-TOC-01/02/03 (Unit); **E2E nicht ausführbar, siehe Abschnitt 0.7/4.9** |
| §5 Testfälle 1–17 | Abschnitte 4.1–4.8 (siehe Kopfzeile je Unterabschnitt) |
| §6 DoD Punkt 1–12 | Abschnitt 6 unten |

---

## 6. Abnahmekriterien dieses Testplans (DoD-Rückverfolgung, Anforderung Abschnitt 6)

Der Status „fehlt" darf aus QA-Sicht erst auf „verifiziert" geändert werden, wenn:

- [ ] **UT-ODT-TOC-NAME-COLLISION** und **E2E-RT-ODT-NAME-COLLISION** grün sind (Abschnitt 0.1)
      — bei Rot ist der ODT-Writer (`blockToOdt`-Fall `'toc'`) vor jeder weiteren Abnahme zu
      korrigieren, unabhängig davon, was sonst grün ist.
- [ ] **UT-DOCX-RT-HEADING-TEXT-WITH-BOOKMARK** grün ist — Textverlust neben einem
      Bookmark-Tag-Paar im selben Absatz wäre ein Kernrundreise-Defekt.
- [ ] DoD Punkt 1 (Dialog): E2E-DIALOG-01–06.
- [ ] DoD Punkt 2 (Generierungslogik): UT-CMD-01–08, E2E-GEN-01/02.
- [ ] DoD Punkt 3 (Klick-Navigation + Pagination-Zusammenspiel): UT-CMD-16/17, E2E-NAV-01–03.
- [ ] DoD Punkt 4 (Aktualisieren-Bedienelement): UT-CMD-12–14, E2E-REFRESH-01–03.
- [ ] DoD Punkt 5 (DOCX-Feldexport, unabhängig geprüft): E2E-RT-DOCX-01 (echter Download +
      `JSZip`), idealerweise zusätzlich echte Word-Installation (außerhalb dieses Testplans,
      manuell zu vermerken).
- [ ] DoD Punkt 6 (ODT-Element-Export): E2E-RT-ODT-01, idealerweise zusätzlich echte
      LibreOffice-Installation.
- [ ] DoD Punkt 7 (Reimport beider Formate erkennt weiterhin Verzeichnis): E2E-RT-DOCX-01/E2E-RT-ODT-01
      (Re-Upload-Teil).
- [ ] DoD Punkt 8 (Cross-Format-Rundreise ohne Verlust): UT-XFMT-TOC-01/02 — **auf Unit-Ebene**,
      E2E-Gegenstück dokumentiert nicht ausführbar (Abschnitt 0.7/4.9), mit PO/Dev abzustimmen.
- [ ] DoD Punkt 9 (alle Grenzfälle einzeln befundet): Traceability-Matrix Abschnitt 5, Zeile
      „Grenzfall 1–19" — jede Zeile im Abnahmeprotokoll (Abschnitt 7 unten) einzeln mit
      Ergebnis „funktioniert / bewusst abweichend + dokumentiert / repariert" einzutragen.
- [ ] DoD Punkt 10 (drei offene Architekturfragen beantwortet): Bereits durch Entscheidungen
      1.1/1.2/1.3 im Code-Plan beantwortet — QA bestätigt per UT-SCHEMA-01/02 (Node-Modell +
      Editierbarkeit) und Prüfung, dass keine Seitenzahl im Editor angezeigt wird (E2E-GEN-01,
      negative Sichtprüfung), dass die Antworten **tatsächlich** in
      `inhaltsverzeichnis-einfuegen-req.md` Abschnitt 6 DoD Punkt 10 nachgetragen wurden.
- [ ] DoD Punkt 11 (Import-Fallback ohne stillen Datenverlust): **UT-DOCX-TOC-NO-END-MARKER**
      (Abschnitt 0.2), UT-ODT-TOC-REAL-FIXTURE-01/02, E2E-RT-DOCX-ORPHANED-FIXTURE — inklusive
      der beiden **zusätzlichen**, hier erstmals dokumentierten offenen Fragen aus Abschnitt
      0.3/0.4 (veralteter Cache bei Import, `\t`-Style-basierte Felder), die vor „verifiziert"
      explizit beantwortet und in der Anforderung nachgetragen sein müssen.
- [ ] DoD Punkt 12 (Selection-Sync-Regressionstest dauerhaft Teil der Suite): Abschnitt 4.0,
      **verankert in `selection-regression.spec.ts`**, nicht nur in einer separaten Datei.
- [ ] Baseline-Regression (UT-BASE-01–03, E2E-BASE-01) vollständig grün.

Andernfalls: Status „teilweise", mit Verweis auf die konkret offenen Punkte aus dieser Liste.

---

## 7. Abnahmeprotokoll-Vorlage

Für jeden Testfall aus Abschnitt 3/4 wird bei tatsächlicher Ausführung festgehalten:

| Testfall-ID | Ergebnis (Pass/Fail/Blocked) | Datum | Ausgeführt gegen Commit/Version | Bei Fail: Fundstelle im Code | Bemerkung |
|---|---|---|---|---|---|
| … | … | … | … | … | … |

Zusätzlich, **zwingend** vor Status-Änderung „fehlt" → „verifiziert":
- Explizite schriftliche Antwort auf Abschnitt 0.3 (veralteter Feld-Cache bei Import vs.
  „eingefroren bis Aktualisieren") — Ergebnis in `inhaltsverzeichnis-einfuegen-req.md` Grenzfall
  12 nachtragen.
- Explizite schriftliche Antwort auf Abschnitt 0.4 (`\t`-Style-basierte TOC-Felder) — Ergebnis
  in `inhaltsverzeichnis-einfuegen-req.md` Grenzfall 16 nachtragen.
- Bestätigung, dass `tests/e2e/selection-regression.spec.ts` nach Ergänzung (Abschnitt 4.0)
  weiterhin alle **vorherigen** Tests unverändert enthält (Diff-Review, nicht nur „Datei ist
  grün").

---

## 8. Baseline-Lauf (vor Umsetzung, Stand 2026-07-04)

Da die Umsetzung zum Zeitpunkt der Testplan-Erstellung **noch nicht** erfolgt ist (Abschnitt 2),
gilt für einen Testlauf gegen den heutigen Code:

| Testgruppe | Erwartetes Ergebnis heute | Grund |
|---|---|---|
| Abschnitt 3 (alle neuen Unit-Test-Dateien) | Kann nicht ausgeführt werden — keine der referenzierten Dateien/Funktionen existiert | Vollständig unimplementiert (Abschnitt 2) |
| Abschnitt 4.0 (Regressionstest-Ergänzung) | Kann nicht ausgeführt werden — kein Toolbar-Button, kein `.pm-toc` | s. o. |
| Abschnitt 4.1–4.8 (alle E2E) | Kann nicht ausgeführt werden — `getByRole('button', { name: 'Inhaltsverzeichnis einfügen' })` findet nichts | s. o. |
| Bestehende Baseline-Tests (`docx.spec.ts`, `odt.spec.ts`, bestehende `roundtrip.test.ts`-Fälle, `selection-regression.spec.ts` in seiner heutigen, unveränderten Form) | Grün | Unverändert, unabhängig von diesem Feature |

Dieser Abschnitt dient als **Nullmessung**: Nach jeder Umsetzungs-Iteration wird derselbe
vollständige Lauf wiederholt und das Ergebnis in Abschnitt 7 protokolliert, bis alle Punkte aus
`inhaltsverzeichnis-einfuegen-req.md` Abschnitt 6 (Abnahmekriterien) erfüllt und grün sind.
