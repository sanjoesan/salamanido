# Umsetzungsplan: Exportieren/Speichern (`speichern-exportieren`)

Bezug: `E:\docs\specs\speichern-exportieren-req.md` (Soll-Zustand),
`E:\docs\FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3/19/20, `E:\docs\specs\FEATURE-BACKLOG.md`
Zeile `speichern-exportieren`.

Diese Datei ist das Ergebnis einer Verifikation des **tatsächlichen** Codestands gegen
die Anforderungsdatei. Ergebnis vorab: Der Backlog-Status „vorhanden" ist **nicht**
haltbar, ohne die unten aufgeführten Fixes und Tests. Die Kernmechanik (Button →
`exportFile()` → `downloadBlob()` → `dirty:false`) ist grundsätzlich richtig gebaut,
aber es gibt konkrete, reproduzierbare Bugs sowie eine erhebliche Testlücke gegenüber
Abschnitt 5 (Rundreise-Pflicht) und Abschnitt 7 (Abnahmekriterium: externe Validierung).

---

## 1. Gefundene Fehler im bestehenden Code (verifiziert, nicht spekulativ)

### 1.1 `src/app/DocumentWorkspace.tsx` — kein Re-Entrancy-Schutz gegen Doppel-Klick

```ts
// Zeilen 17–29, Ist-Zustand
async function handleExport() {
  setExporting(true)
  setExportError(null)
  try {
    const blob = await module.exportFile(document.content, document.fileName)
    downloadBlob(blob, document.fileName)
    onChange({ ...document, dirty: false })
  } catch (err) {
    setExportError(err instanceof Error ? err.message : String(err))
  } finally {
    setExporting(false)
  }
}
```

`disabled={exporting}` schützt nur, **nachdem** React den State-Update committet und neu
gerendert hat. Zwei synchron ausgelöste Klicks (z. B. `anchor.click(); anchor.click()` im
selben Tick, oder ein sehr schneller Doppelklick, wie in Anforderung 2.1 explizit
gefordert: „muss aber auch bei sehr schnellen Doppelklicks/synthetischen Events
standhalten") rufen `handleExport()` zweimal auf, **bevor** das Disabled-Attribut im DOM
aktualisiert ist. Beide Aufrufe laufen dann parallel durch `module.exportFile()` →
`downloadBlob()` → zwei Downloads/zwei `URL.createObjectURL`/`revokeObjectURL`-Zyklen aus
einem einzigen Klick. Das verstößt gegen Anforderung 2.1 und den Testfall in Abschnitt
3.5 zweiter Punkt. Kein bestehender Test deckt das ab (weder RTL noch Playwright).

**Fix:** Ein synchroner Guard (`useRef`, kein State), der **vor** jedem `await` geprüft
und gesetzt wird:

```ts
const exportingRef = useRef(false)
// ...
async function handleExport() {
  if (exportingRef.current) return
  exportingRef.current = true
  setExporting(true)
  // ...
  } finally {
    exportingRef.current = false
    setExporting(false)
  }
}
```

### 1.2 `src/app/DocumentWorkspace.tsx` — Race Condition: Bearbeitung während laufendem Export wird beim Abschluss verworfen

Der Editor bleibt während des Exports voll bedienbar (das ist von Anforderung 3.3 „UI
bleibt reaktionsfähig" so gewollt). `handleExport` schließt aber über das `document`-Prop
**zum Zeitpunkt des Klicks**. Tippt die Nutzerin, während `await module.exportFile(...)`
noch läuft (z. B. bei einem großen Dokument, Richtwert bis zu 5 Sekunden laut Abschnitt
3.3), feuert `WordEditor`s `dispatchTransaction` einen `onChange`-Aufruf mit dem neuen
Inhalt (`dirty: true`) nach oben — `App` rendert `DocumentWorkspace` mit einem neuen
`document`-Objekt neu. Der ursprüngliche, noch laufende `handleExport`-Aufruf besitzt
davon aber nur die **alte** Objektreferenz. Wenn `exportFile` danach auflöst, überschreibt

```ts
onChange({ ...document, dirty: false })
```

den zwischenzeitlich aktualisierten State wieder mit dem **alten** Inhalt plus
`dirty:false` — die während des Exports getippten Zeichen bleiben zwar sichtbar im
ProseMirror-DOM (da `WordEditor` nach dem Mount nie wieder von `document.content`
resynchronisiert, siehe Kommentar in `WordEditor.tsx` Zeile 111f.), aber der
App-State/`document.content`, der beim **nächsten** Export als Quelle dient, ist um genau
diese Zeichen ärmer — und `dirty` ist fälschlich `false`, obwohl der zuletzt tatsächlich
exportierte Stand nicht mehr dem sichtbaren Editor-Zustand entspricht. Das unterläuft
sowohl 2.3 („Der exportierte Inhalt entspricht exakt dem aktuellen Editor-Zustand …") für
den **übernächsten** Export als auch 2.5 (Beforeunload-Warnung schläft fälschlich ein,
obwohl ungesicherte Änderungen existieren) und ist im Kern derselbe Fehlertyp wie der in
Abschnitt 5.3 als „Nicht-Bestehen" gewertete stille Verlust von Text — hier nur zeitlich
verzögert (erst beim übernächsten Export/Schließen sichtbar). Kein bestehender Test
(weder unit noch e2e) deckt Bearbeitung während eines laufenden Exports ab.

**Fix:** `documentRef` führen (Pattern bereits im Code vorhanden, siehe
`WordEditor.tsx` Zeile 58f. `onChangeRef`), Snapshot vor dem Export merken und beim
Abschluss nur dann `dirty:false` setzen, wenn sich der Inhalt seither nicht geändert hat:

```ts
const documentRef = useRef(document)
documentRef.current = document

async function handleExport() {
  if (exportingRef.current) return
  exportingRef.current = true
  setExporting(true)
  setExportError(null)
  const snapshot = documentRef.current
  try {
    const blob = await module.exportFile(snapshot.content, snapshot.fileName)
    downloadBlob(blob, snapshot.fileName)
    if (documentRef.current.content === snapshot.content) {
      onChange({ ...documentRef.current, dirty: false })
    }
    // sonst: es wurde während des Exports weiter bearbeitet — dirty bleibt bewusst
    // true, weil der soeben heruntergeladene Stand nicht mehr der aktuelle ist.
  } catch (err) {
    setExportError(err instanceof Error ? err.message : String(err))
  } finally {
    exportingRef.current = false
    setExporting(false)
  }
}
```

### 1.3 `src/formats/docx/writer.ts` — exportiertes DOCX kodiert keine A4-Seite/Standardränder

`buildDocumentXml()` (Zeilen 177–182) schreibt `<w:sectPr>` nur mit optionalen
Header-/Footer-Referenzen, aber **nie** `<w:pgSz>`/`<w:pgMar>`. Anforderung 3.1 verlangt
für den leeren Export „ein leeres, aber gültiges Dokument (Standard-Absatzformat,
A4-Seite)". Ohne explizites `w:pgSz` übernimmt Word beim Öffnen seine
Locale-Default-Seitengröße (in vielen Installationen „Letter", nicht A4) — die Datei
*behauptet* also nicht, A4 zu sein, sie überlässt es dem öffnenden Programm. Das ist
inkonsistent zum ODT-Schreiber, der in `writeOdt()` → `buildStylesXml()` (Zeilen 139–156)
bereits korrekt `fo:page-width="21cm" fo:page-height="29.7cm" fo:margin="2.5cm"` in ein
`style:page-layout` schreibt. Da unser eigener `reader.ts` (DOCX **und** ODT) `pgSz`/
`page-layout` beim Import ohnehin nicht auswertet (die App zeigt immer ihr hartkodiertes
`PAGE_WIDTH_PX`/`PAGE_HEIGHT_PX` aus `pageLayout.ts`), fällt der Unterschied beim eigenen
Reimport nicht auf — genau das Szenario aus Anforderung 2.3 „muss … auch mit einem
unabhängigen Parser/einer unabhängigen Bibliothek geprüft werden", das diesen Bug erst
sichtbar macht.

**Fix:** In `buildDocumentXml`/`writeDocx` `sectPrExtra` um A4-Maße + 2,5-cm-Rand in
Twips ergänzen (Word: 1 mm ≈ 56,693 Twips):

```ts
const A4_SECT_PR =
  '<w:pgSz w:w="11906" w:h="16838"/>' +
  '<w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/>'
// sectPrExtra = headerRef + footerRef + A4_SECT_PR  (Reihenfolge gemäß CT_SectPr-Schema:
// Referenzen vor pgSz/pgMar)
```

### 1.4 `src/formats/odt/writer.ts` — Tabellen-Spaltenanzahl ignoriert `colspan` der ersten Zeile

```ts
// Zeile 88, Ist-Zustand
const colCount = rows[0]?.content?.length ?? 1
```

Das zählt die **Anzahl der Zellknoten** der ersten Zeile, nicht die Summe ihrer
`colspan`-Werte. Enthält die erste Zeile eine verbundene Zelle (`colspan > 1` — genau der
in Abschnitt 5.2 geforderte Fall „Tabelle … mit mind. einer formatierten Zelle" plus die
in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 6 geforderten Merge-Tests), wird zu wenig
`<table:table-column/>` deklariert. Der DOCX-Schreiber macht es in `tableToDocx()`
(`writer.ts` Zeile 130) bereits richtig:

```ts
const colCount = (rows[0]?.content ?? []).reduce((sum, cell) => sum + Number(cell.attrs?.colspan ?? 1), 0) || 1
```

**Fix:** Dieselbe `reduce`-Berechnung im ODT-Schreiber übernehmen.

### 1.5 `src/formats/odt/writer.ts` — fehlende `<table:covered-table-cell/>`-Platzhalter

Der Tabellen-Zweig von `blockToOdt` (Zeilen 86–111) erzeugt pro Zeile nur die
tatsächlichen `<table:table-cell>`-Elemente, ohne für horizontal (`colspan`) **und**
vertikal (`rowspan`) überdeckte Rasterpositionen `<table:covered-table-cell/>`
einzufügen. Nach OASIS ODF 1.3 §9.1.1 muss jede Tabellenzeile exakt so viele
`table:table-cell`/`table:covered-table-cell`-Elemente enthalten wie
`table:table-column`-Spalten deklariert sind — anders als bei OOXML, wo `w:gridSpan`
allein genügt. Die aktuelle Ausgabe hat also für jede Tabelle mit horizontalem *oder*
vertikalem Merge zu wenige Zellen pro Zeile. Das fällt beim eigenen `readOdt()`
(`childElements(rowEl, ODF_NAMESPACES.table, 'table-cell')`, filtert ohnehin nur echte
Zellen) nicht auf — der existierende Unit-Test
`src/formats/odt/__tests__/roundtrip.test.ts` „preserves merged cells (colspan/rowspan)"
(Zeilen 194–209) besteht deshalb trotz dieses Fehlers, weil er nur gegen den **eigenen**
Reader prüft. Das ist exakt das in Anforderung 2.3/Abschnitt 19 der Feature-Spec
beschriebene Risiko „Schreib- und Lesefehler gleichen sich gegenseitig aus". Eine externe
Validierung (siehe Abschnitt 3 unten) deckt dies auf; reale ODF-Anwendungen
(LibreOffice/AOO) werden die Zeilen entweder reparieren (Datenverlust/Verschiebung von
Zellinhalten) oder als beschädigt zurückweisen.

**Fix:** Analog zur bestehenden `pending`-Logik in `docx/writer.ts::tableToDocx`
(Zeilen 133–165) einen Belegungs-Tracker über die Spalten führen und pro Zeile:
1. nach jeder Zelle `(colspan - 1)` `<table:covered-table-cell/>` einfügen (horizontale
   Überdeckung, *innerhalb* derselben Zeile — das ist der ODF-spezifische Unterschied
   zu OOXML),
2. für Zellen mit `rowspan > 1` die betroffenen Folgezeilen vormerken und dort an der
   passenden Spaltenposition ebenfalls `<table:covered-table-cell/>` statt einer echten
   Zelle einfügen.

### 1.6 Performance/Größe (Anforderung 3.3) — Export komprimiert nicht

`zip.generateAsync({ type: 'blob', mimeType: '...' })` wird in beiden Schreibern ohne
`compression: 'DEFLATE'` aufgerufen (`docx/writer.ts` Zeile 275–278,
`odt/writer.ts` Zeile 209) — JSZips Default ist unkomprimiertes „STORE". Bei Dokumenten
mit vielen eingebetteten Bildern (Anforderung 3.3, Richtwert < 5 s) führt das zu
unnötig großen Downloads. **Kein Korrektheitsfehler**, aber leicht zu beheben und für den
Performance-Testfall (Abschnitt 6, Testfall 13) relevant.

**Fix:** `compression: 'DEFLATE'` bei beiden `generateAsync()`-Aufrufen ergänzen. In
`odt/writer.ts` bleibt der `mimetype`-Eintrag (Zeile 200) explizit von der globalen
Einstellung ausgenommen (`{ compression: 'STORE' }` ist dort bereits pro Datei gesetzt
und muss laut ODF-Spezifikation zwingend unkomprimiert und als erster Zip-Eintrag
bleiben — das ist bereits korrekt und nicht anzufassen).

### 1.7 Dokumentations-/Test-Inkonsistenz: verweister Testverweis

`src/formats/docx/__tests__/external-fixtures.test.ts` Zeile 38f. behauptet, die für
jsdom zu langsame Datei `bug65649.docx` sei „Covered instead by
`tests/e2e/large-document-import.spec.ts`". Diese Datei **existiert nicht** im Repo
(geprüft: `tests/e2e/` enthält nur `docx.spec.ts`, `odt.spec.ts`, `lifecycle.spec.ts`,
`selection-regression.spec.ts`). Das ist genau das Muster, das dieser gesamte
Verifikationsauftrag adressieren soll: eine Behauptung über vorhandene Testabdeckung, die
nicht zutrifft. Direkt relevant für Anforderung 3.3 (Performance bei großen Dokumenten),
da damit **keine** E2E-Messung der Ladezeit/Reaktionsfähigkeit bei großen Dokumenten
existiert — weder für Import noch für Export.

**Fix:** Entweder den Kommentar korrigieren (Datei existiert nicht, ersatzlos) oder die
Datei tatsächlich anlegen (siehe Abschnitt 4.4 unten, wird für den Export-Performance-Test
ohnehin gebraucht).

---

## 2. Nicht betroffene Bereiche (zur Abgrenzung, keine Änderung nötig)

- **`src/formats/shared/schema.ts` / `commands.ts` / `Toolbar.tsx`**: Für
  `speichern-exportieren` selbst sind **keine** Schema-, Command- oder
  Toolbar-Änderungen erforderlich. Die Anforderungsdatei fordert explizit **keinen**
  neuen Menüpunkt, kein Tastaturkürzel, keinen Dateinamen-Dialog (Abschnitt 1, letzter
  Absatz; Abschnitt 3.2 letzter Punkt). Das vorhandene Schema deckt bereits alle für die
  Pflicht-Mindestabdeckung aus Abschnitt 5.2 nötigen Konstrukte ab (Marks `strong`,
  `em`, `underline`, `strike`, `textColor`, `highlight`; Nodes `heading` (1–6),
  `bullet_list`/`ordered_list`, Tabellen-Nodes aus `prosemirror-tables`, `image`) — das
  Problem liegt ausschließlich in der Serialisierung (`writer.ts`), nicht im
  Editor-Datenmodell.
- **`src/lib/download.ts`**: Verhalten (`createObjectURL` → Klick → `remove()` →
  `revokeObjectURL()`, synchron in dieser Reihenfolge) entspricht Anforderung 2.2
  vollständig; kein Änderungsbedarf. Das sofortige `revokeObjectURL()` nach `click()`
  ist das in evergreen Browsern (Chromium, Firefox, Safari ≥ 14) etablierte sichere
  Muster und wird über Playwright (Chrome + WebKit, siehe `playwright.config.ts`)
  bereits abgedeckt.
- **`src/lib/useBeforeUnloadWarning.ts`**: Logik ist korrekt (Effect an
  `hasUnsavedWork` gekoppelt, sauberer Cleanup). Lücke liegt ausschließlich bei den
  **Tests** (siehe 4.2), nicht bei der Implementierung.
- **`src/formats/docx/docx.ts` / `src/formats/odt/odt.ts` / `src/formats/types.ts`**:
  `exportFile`-Bindung und Interface sind korrekt und bedürfen keiner Anpassung.

---

## 3. Externe Validierung (Abnahmekriterium Abschnitt 7 / Anforderung 2.3)

Aktuell prüft **keine** Test-Ebene die geschriebenen Dateien mit einem Werkzeug außerhalb
des Projekt-eigenen Reader/Writer-Codes. `roundtrip.test.ts` (DOCX **und** ODT) ruft
`writeX()` gefolgt von `readX()` auf — dieselbe Codebasis prüft sich selbst. Die
Playwright-Tests entpacken nur mit `JSZip` (derselben Bibliothek, die auch der Schreiber
verwendet) und suchen Teilstrings — keine Struktur-/Schema-Prüfung.

Vorschlag (zwei ergänzende, unabhängige Kanäle, beide rein npm-basiert und ohne
Server-Dienst, damit sie zum „alles läuft im Browser/CI ohne Fremd-Server"-Prinzip
passen):

1. **DOCX**: neue Dev-Dependency `mammoth` (unabhängiger DOCX→HTML/Text-Konverter, hat
   keinerlei Code-Bezug zu `src/formats/docx`). Neue Datei
   `src/formats/docx/__tests__/external-validation.test.ts`: `writeDocx(...)` aufrufen,
   das Ergebnis-Blob durch `mammoth.convertToHtml({ buffer })` schicken, und prüfen, dass
   Überschriften (`<h1>`), Fettschrift (`<strong>`) und der erwartete Text im
   HTML-Ergebnis auftauchen — unabhängig vom eigenen `reader.ts`.
2. **ODT**: kein vergleichbar etabliertes, gepflegtes reines JS-Gegenstück gefunden.
   Empfehlung: XSD-/RelaxNG-Schemaprüfung von `content.xml`/`styles.xml`/`manifest.xml`
   gegen das offizielle OASIS-ODF-1.3-Schema mit einer WASM-basierten Bibliothek (z. B.
   `xmllint-wasm`), neue Datei
   `src/formats/odt/__tests__/external-validation.test.ts`. Dieser Kanal hätte den in
   1.5 beschriebenen `covered-table-cell`-Fehler zuverlässig als Schema-Verstoß
   aufgedeckt. Alternativ/ergänzend (schwerer, aber am nächsten an „echte
   ODF-Anwendung"): in der CI (`.github/workflows/ci.yml`) einen optionalen Job-Schritt
   `sudo apt-get install -y libreoffice-writer` + `soffice --headless --convert-to txt
   <exportierte.odt>` ergänzen und den erzeugten Text auf die erwarteten Inhalte prüfen.
   Dieser Schritt sollte lokal übersprungen werden (Existenz von `soffice` prüfen),
   in CI aber verpflichtend laufen, damit Abschnitt 7 „mindestens eine Validierung …
   außerhalb des projekteigenen Reader/Writer-Codes" nachweislich erfüllt ist.

Kein CI-Änderungsbedarf für Variante 1 (mammoth) und die XSD-Variante von Variante 2 —
beide laufen über `npm run test` (Vitest), das die CI bereits ausführt
(`.github/workflows/ci.yml` Zeile 24). Nur die optionale LibreOffice-CLI-Variante würde
einen neuen Schritt in `ci.yml` benötigen.

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 Zu ändernde Dateien (Bugfixes)

| Datei | Änderung |
|---|---|
| `src/app/DocumentWorkspace.tsx` | `handleExport` um `exportingRef`-Re-Entrancy-Guard (1.1) und `documentRef`-Snapshot-Vergleich vor dem `dirty:false`-Reset (1.2) ergänzen. Keine Änderung an JSX/Toolbar nötig. |
| `src/formats/docx/writer.ts` | `buildDocumentXml`/`writeDocx`: `w:pgSz`/`w:pgMar` (A4, 2,5 cm Rand) in `sectPrExtra` ergänzen (1.3). `zip.generateAsync(...)`: `compression: 'DEFLATE'` ergänzen (1.6). |
| `src/formats/odt/writer.ts` | Tabellen-Zweig in `blockToOdt`: `colCount`-Berechnung auf `colspan`-Summe umstellen (1.4); `<table:covered-table-cell/>`-Platzhalter für horizontale und vertikale Merges einfügen (1.5). `zip.generateAsync(...)`: `compression: 'DEFLATE'` ergänzen, `mimetype`-Eintrag bleibt unangetastet bei `STORE` (1.6). |
| `src/formats/docx/__tests__/external-fixtures.test.ts` | Kommentar zu `bug65649.docx`/„large-document-import.spec.ts" korrigieren, sobald 4.4 entschieden ist (Datei anlegen oder Verweis entfernen) (1.7). |

### 4.2 Neue/erweiterte Unit-Tests (Vitest, RTL)

| Datei | Inhalt |
|---|---|
| `src/app/__tests__/DocumentWorkspace.test.tsx` (erweitern) | Neue Fälle: (a) zwei synchron ausgelöste Klicks (`fireEvent.click` zweimal ohne `await` dazwischen) → `exportFile` genau einmal aufgerufen; (b) während eines noch laufenden `exportFile` (über eine steuerbare Promise simuliert) wird `onChange` mit neuem Inhalt aufgerufen → nach Auflösung darf `onChange(..., { dirty: false })` **nicht** mit dem veralteten Inhalt erfolgen; (c) Fehlerfall jetzt mit `document={{ ...baseDoc, dirty: true }}` starten und `onChange`-Spy prüfen, dass er nie mit `dirty:false` aufgerufen wurde, plus Button nach `finally` wieder `disabled=false`/Label „Exportieren"; (d) „● ungespeichert"-Anzeige erscheint bei `dirty:true` und verschwindet nach erfolgreichem Export; (e) Dateiname mit Umlauten/Sonderzeichen wird 1:1 an `downloadBlob` weitergereicht (`vi.mock('../../lib/download')`); (f) `module.exportFile` wirft **synchron** (keine Promise) → Fehleranzeige statt unbehandelter Exception. |
| `src/lib/__tests__/useBeforeUnloadWarning.test.ts` (neu) | `renderHook` aus `@testing-library/react`: bei `hasUnsavedWork=true` löst ein dispatchtes `beforeunload`-Event `preventDefault()`/`returnValue` aus; nach Rerender mit `false` löst ein weiteres Event das **nicht** mehr aus; Cleanup entfernt den Listener beim Unmount (`removeEventListener`-Spy). |
| `src/formats/odt/__tests__/roundtrip.test.ts` (erweitern) | Testfall „preserves merged cells" um eine Prüfung auf die tatsächliche `content.xml`-Struktur ergänzen (Anzahl `table:table-cell` + `table:covered-table-cell` pro Zeile == deklarierte Spaltenzahl), nicht nur auf das über `readOdt` zurückgelesene Modell — sonst verdeckt der eigene Reader den Fehler aus 1.5 weiterhin. |
| `src/formats/docx/__tests__/roundtrip.test.ts` (erweitern) | Neuer Test: leeres Dokument (`createBlankWordDocument()`) → `writeDocx` → generierte `document.xml` enthält `<w:pgSz w:w="11906" w:h="16838"/>`. |
| `src/formats/docx/__tests__/external-validation.test.ts` (neu) | Siehe Abschnitt 3, Variante 1 (mammoth). |
| `src/formats/odt/__tests__/external-validation.test.ts` (neu) | Siehe Abschnitt 3, Variante 2 (XSD/xmllint-wasm). |

### 4.3 Neue/erweiterte E2E-Tests (Playwright)

| Datei | Inhalt |
|---|---|
| `tests/e2e/save-export-lifecycle.spec.ts` (neu, formatübergreifend über `docxCard`/`odtCard`-artige Helper, parametrisiert über beide Module) | Deckt die in Abschnitt 5.4 der Anforderungsdatei benannte Lücke: (1) „● ungespeichert" verschwindet unmittelbar nach Export, erscheint nach nächster Änderung wieder (Testfall 6); (2) Beforeunload-Warnung aktiv bei `dirty:true`, inaktiv direkt nach Export, wieder aktiv nach erneuter Änderung — Prüfung über `page.evaluate` mit einem manuell dispatchten `beforeunload`-Event und Auslesen von `event.defaultPrevented`, oder alternativ `page.on('dialog')`-Substitut je nach Playwright-Fähigkeiten für dieses Event (Testfall 7); (3) Export → sofort weitertippen ohne Klick in den Editor → Zeichen erscheinen an der Cursor-Position (Abschnitt 2.4 Testfall); (4) „← Formate" nach Export ohne Rückfrage vs. vorher mit Rückfrage (Testfall 15); (5) zwei aufeinanderfolgende Exporte ohne Zwischenänderung → beide heruntergeladenen Dateien inhaltlich identisch (ZIP-Einträge vergleichen, `docProps/core.xml`/ODT-`meta.xml` ggf. von String-Vergleich ausnehmen, falls dort ein Zeitstempel steht — aktuell schreibt keiner der beiden Writer ein Änderungsdatum, das sollte im Test explizit dokumentiert/geprüft werden) (Testfall 11); (6) zehnfacher Export im selben Tab ohne Reload → kein Fehler, `page.evaluate` prüft grob auf keine wachsende Anzahl offener Object-URLs/keine Exception in der Konsole (`page.on('pageerror')`) (Testfall 14); (7) Export eines Dokuments mit Umlauten/Sonderzeichen im Dateinamen → `download.suggestedFilename()` entspricht exakt dem Originalnamen (Testfall 10); (8) leeres, unverändertes neues Dokument je Format exportieren → Reimport zeigt leeres, aber valides Dokument (Testfälle 1/2); (9) erzwungener Serialisierungsfehler via `page.route`/`page.addInitScript`-Mock von `module.exportFile` (oder pragmatischer: über eine test-only Injektion, die eine kaputte `content`-Struktur an den Editor liefert) → sichtbare Fehlermeldung, Button wieder bedienbar, `dirty` bleibt `true` (Testfall 12). |
| `tests/e2e/docx.spec.ts` (erweitern) | Neuer Test „round trip with full 5.2 minimum coverage": lädt eine neu zu erstellende Fixture-Datei (siehe 4.4) mit gemischter Zeichenformatierung (fett/kursiv/unterstrichen/durchgestrichen/Farbe/Hervorhebung), Überschrift, Bullet- **und** nummerierter Liste, einer Tabelle mit mehreren Zeilen/Spalten inkl. **einer verbundenen und einer formatierten Zelle**, einem eingebetteten Bild sowie Umlauten im Fließtext **und** im Dateinamen → unverändert exportieren → erneut importieren → Inhalt über die tatsächlich gerenderte Editor-DOM (nicht nur XML-Substring) prüfen: Text, `<strong>`/`<em>`/`<u>`/`<s>`, Listentyp (`ul`/`ol`), Tabellenzeilen/-spalten inkl. Merge, Bild `src`, Dateiname im Download exakt wie hochgeladen. |
| `tests/e2e/odt.spec.ts` (erweitern) | Analoger Test wie oben, für ODT. |
| `tests/e2e/large-document-import.spec.ts` **oder** `tests/e2e/large-document.spec.ts` (neu) | Löst die Inkonsistenz aus 1.7 auf: reales Fixture mit vielen Bildern/großer Tabelle importieren **und** unverändert exportieren, jeweils Zeitmessung (`Date.now()` um die Interaktion), Grenzwert Import < 3 s (Feature-Spec 1.2) und Export < 5 s (diese Anforderungsdatei, Abschnitt 3.3), UI bleibt reaktionsfähig (z. B. ein Toolbar-Element bleibt während des Exports klickbar/nicht eingefroren geprüft über eine parallele, unabhängige Interaktion), kein `pageerror`/Crash. |

### 4.4 Neue Test-Fixtures

Für die Mindestabdeckung aus Abschnitt 5.2 existiert aktuell **keine** einzelne Datei
unter `tests/fixtures/external/{docx,odt}` (POI-/AOO-Testkorpus), die garantiert *alle*
geforderten Elemente in Kombination enthält (Formatierungs-Mix, Überschrift, beide
Listentypen, Tabelle mit Merge, Bild, Sonderzeichen). Statt eine der vorhandenen
Fremddateien danach zu durchsuchen, wird — analog zum bereits etablierten Muster
`buildSampleDocx()`/`buildSampleOdt()` in `tests/e2e/docx.spec.ts`/`odt.spec.ts` — je eine
neue, projekteigene, minimal-aber-vollständige Testdatei per Hand (`JSZip`) gebaut:

- `tests/e2e/fixtures/roundtrip-coverage.docx` (oder als Inline-Builder-Funktion,
  konsistent mit dem bestehenden Stil) — enthält exakt die in Abschnitt 5.2 aufgezählten
  Elemente plus Umlaute in Text und im späteren Upload-Dateinamen
  (`Bewerbung Müller (Entwurf).docx`, siehe Anforderung 3.2).
- `tests/e2e/fixtures/roundtrip-coverage.odt` — identisches Pendant für ODT.

Diese Dateien (bzw. Builder-Funktionen) werden von den unter 4.3 genannten neuen Tests
in `docx.spec.ts`/`odt.spec.ts` referenziert.

---

## 5. Zuordnung: Anforderungs-Testfälle (Abschnitt 6) → Abdeckung nach Umsetzung

| # | Testfall | Abdeckung nach diesem Plan |
|---|---|---|
| 1–2 | Leeres Dokument (DOCX/ODT) exportieren, Reimport | `save-export-lifecycle.spec.ts` (neu) |
| 3–4 | Echter Download, valides ZIP mit OOXML-/ODF-Struktur | bereits in `docx.spec.ts`/`odt.spec.ts` vorhanden, ergänzt um Schema-/Struktur-Check aus Abschnitt 3 |
| 5 | Weitertippen nach Export ohne Klick | `save-export-lifecycle.spec.ts` (neu) |
| 6 | „● ungespeichert" nach Export weg/nach Edit wieder da | `save-export-lifecycle.spec.ts` (neu) + `DocumentWorkspace.test.tsx` (RTL-Ebene) |
| 7 | Beforeunload nach Export inaktiv/nach Edit wieder aktiv | `save-export-lifecycle.spec.ts` (neu) + `useBeforeUnloadWarning.test.ts` (neu, isoliert) |
| 8–9 | DOCX-/ODT-Rundreise mit Mindestabdeckung 5.2 | `docx.spec.ts`/`odt.spec.ts` neue „full 5.2 coverage"-Tests (4.3/4.4) — **setzt Fixes 1.3–1.5 voraus**, sonst schlägt der Merge-Zellen-Teil fehl bzw. die Datei ist nicht extern valide |
| 10 | Sonderzeichen im Dateinamen | `save-export-lifecycle.spec.ts` (neu) |
| 11 | Zwei Exporte ohne Änderung → identisch | `save-export-lifecycle.spec.ts` (neu) |
| 12 | Erzwungener Fehler → sichtbare Meldung, Button/State korrekt | `DocumentWorkspace.test.tsx` (erweitert) + `save-export-lifecycle.spec.ts` (E2E-Variante) |
| 13 | Großes Dokument, Zeitbudget, kein Crash | `large-document(-import).spec.ts` (neu, löst 1.7 auf) |
| 14 | 10× Export ohne Reload, kein Leak | `save-export-lifecycle.spec.ts` (neu) |
| 15 | „← Formate" nach Export ohne Rückfrage | `save-export-lifecycle.spec.ts` (neu) + bereits teilweise in `DocumentWorkspace.test.tsx` (Rückfrage bei `dirty:true`/nicht bei `false` — Kombination mit vorherigem Export fehlt noch) |

Abnahmekriterium Abschnitt 7, dritter Punkt (externe Validierung) wird durch Abschnitt 3
dieses Plans (`external-validation.test.ts` für DOCX via `mammoth`, für ODT via
XSD-Schema bzw. optionalem LibreOffice-CI-Schritt) erfüllt — **erst nachdem** die Bugs
1.3–1.5 behoben sind, da diese sonst von der externen Validierung zuverlässig als Fehler
aufgedeckt würden.

---

## 6. Reihenfolge der Umsetzung (Empfehlung)

1. Bugfixes 1.1–1.6 (DocumentWorkspace.tsx, beide `writer.ts`) — kleine, isolierte Diffs,
   keine Schema-/UI-Änderung, geringes Regressionsrisiko.
2. Bestehende Unit-Tests erweitern (4.2), insbesondere die ODT-Tabellen-Struktur-Prüfung,
   die die Fixes 1.4/1.5 unmittelbar absichert.
3. Externe Validierung (Abschnitt 3) einführen — bestätigt 1.3–1.5 unabhängig vom
   eigenen Reader.
4. Neue Fixtures (4.4) bauen, dann die neuen/erweiterten E2E-Rundreise-Tests (4.3).
5. `save-export-lifecycle.spec.ts` für die Button-/State-/Lifecycle-Anforderungen aus
   Abschnitt 2 der Anforderungsdatei.
6. `large-document(-import).spec.ts` zur Auflösung von 1.7 und Absicherung von
   Abschnitt 3.3.
7. Erst danach den Backlog-Status von „nicht vertrauenswürdig" auf „vorhanden
   (verifiziert)" ändern — gemäß Abnahmekriterium in Abschnitt 7 der Anforderungsdatei.
