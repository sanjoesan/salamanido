# Umsetzungsplan: „Neues Dokument erstellen"

Gegenstück zu `specs/neues-dokument-req.md`. Jede dort erhobene Behauptung wurde am
tatsächlichen Code (Stand dieses Commits) nachgeprüft — Ergebnis: **alle Befunde aus dem
Anforderungsdokument sind zutreffend**, keiner war ein Fehlalarm. Dieses Dokument legt fest,
was konkret geändert wird, was bewusst *nicht* geändert wird (mit Begründung), und in
welchen Dateien.

Geprüfte Dateien (Ist-Zustand bestätigt): `src/app/FormatPicker.tsx`,
`src/app/DocumentWorkspace.tsx`, `src/App.tsx`, `src/formats/shared/documentModel.ts`,
`src/formats/shared/schema.ts`, `src/formats/shared/editor/WordEditor.tsx`,
`src/formats/shared/editor/Toolbar.tsx`, `src/formats/shared/editor/commands.ts`,
`src/formats/shared/editor/pageLayout.ts`, `src/formats/docx/docx.ts`,
`src/formats/docx/writer.ts`, `src/formats/docx/reader.ts`, `src/formats/docx/styleDefs.ts`,
`src/formats/docx/xmlUtil.ts`, `src/formats/odt/odt.ts`, `src/formats/odt/writer.ts`,
`src/formats/odt/reader.ts`, `src/formats/odt/xmlUtil.ts`, `src/formats/registry.ts`,
`src/formats/types.ts`, `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`,
`tests/e2e/selection-regression.spec.ts`, `tests/e2e/lifecycle.spec.ts`,
`playwright.config.ts`, `src/app/__tests__/FormatPicker.test.tsx`,
`src/app/__tests__/DocumentWorkspace.test.tsx`, `src/formats/docx/__tests__/roundtrip.test.ts`,
`src/formats/odt/__tests__/roundtrip.test.ts`.

---

## 1. Entscheidungen zu den offenen Fragen (Abschnitt 7 des Req-Dokuments)

| # | Frage | Entscheidung für dieses Ticket |
|---|---|---|
| 1 | Fokus-Verhalten | **Fix.** `view.focus()` wird ergänzt. „Sofort bearbeitbar ohne Klick" bleibt die gültige Spezifikation. |
| 2 | Seitenformat DOCX-Export | **Fix, aber ohne Datenmodell-Erweiterung.** Es wird ein fixer, mit ODT identischer Wert (A4/2,5 cm) in `w:sectPr` geschrieben — keine Rückwirkung auf `WordDocumentContent`, keine UI zur Konfiguration (siehe Abschnitt 5 „Nicht-Ziele"). |
| 3 | Schrift-Standard | **Kein Produktstandard.** Bleibt implizit (Anwendungsstandard von Word/LibreOffice). Wird nur explizit dokumentiert + regressionsgetestet, damit es keine stille Annahme bleibt. |
| 4 | Titel beim Neuanlegen | **Kein Eingabefeld in diesem Ticket.** Bleibt leer bis zum nächsten Import; gehört inhaltlich zu `dokumenteigenschaften` (separater Backlog-Eintrag, Priorität 2). Nur Round-Trip-Test ergänzt (R6). |
| 5 | „Datei → Neu" im Workspace | **Kein neuer Menüpunkt.** Der Umweg über „← Formate" bleibt das definierte Verhalten; nur der bestehende Bestätigungsdialog-Pfad wird zusätzlich per E2E-Test abgesichert. |
| 6 | Cross-Format-Export (R7) | **Nicht Teil dieses Tickets.** Gehört zu `speichern-unter-format` (Priorität 2). Wird als offen markierter, explizit fehlschlagender Platzhaltertest festgehalten (siehe Abschnitt 4.6), damit kein bestehender Test ihn fälschlich als „bestanden" ausweist. |

---

## 2. Fund­bestätigung (Kurzreferenz mit Zeilennummern)

Alle folgenden Aussagen aus `neues-dokument-req.md` wurden verifiziert:

- `handleCreateNew` hat kein `try/catch` — `src/app/FormatPicker.tsx:28-33`.
- Kein `view.focus()` nach `new EditorView(...)` — `src/formats/shared/editor/WordEditor.tsx:89-101`. Der einzige `.focus()`-Aufruf im Frontend liegt in `src/formats/shared/editor/Toolbar.tsx:26` (`run()`-Helper, nur nach Toolbar-Klick).
- Alle drei bestehenden E2E-Specs rufen `await editor.click()` vor dem Tippen auf:
  `tests/e2e/docx.spec.ts:65`, `tests/e2e/odt.spec.ts:49`,
  `tests/e2e/selection-regression.spec.ts:16` (und weitere Stellen in derselben Datei).
- `createBlankWordDocument()` liefert exakt die im Req-Dokument zitierte Struktur —
  `src/formats/shared/documentModel.ts:10-21`.
- ODT-Export schreibt `fo:margin="2.5cm" fo:page-width="21cm" fo:page-height="29.7cm"`
  fix in `style:page-layout-properties` — `src/formats/odt/writer.ts:145`.
- DOCX-Export schreibt `<w:sectPr>` nur mit optionalen `headerReference`/`footerReference`,
  nie `w:pgSz`/`w:pgMar` — `src/formats/docx/writer.ts:177-182, 231-243`.
- DOCX-Reader liest `w:pgSz`/`w:pgMar` nirgends (nur `headerReference`/`footerReference`
  unter `sectPr` werden ausgelesen) — `src/formats/docx/reader.ts:350-375`.
- `styleDefs.ts` schreibt `<w:docDefaults/>` leer und `Normal`-Stil ohne `w:rPr`/`w:pPr` —
  `src/formats/docx/styleDefs.ts:22-29`. ODT-`Standard`-Stil ebenso ohne
  `style:text-properties` — `src/formats/odt/writer.ts:143`.
- `fileName` vs. `meta.title` sind getrennte Werte, `meta.title` wird beim Erstellen nicht
  gesetzt — `src/formats/docx/docx.ts:16`, `src/formats/odt/odt.ts:16`,
  `src/formats/shared/documentModel.ts:19`.
- `dirty` wird bei jeder `tr.docChanged`-Transaktion unbedingt auf `true` gesetzt, kein
  Vergleich mit Ursprungszustand — `src/app/DocumentWorkspace.tsx:69`.
- `useBeforeUnloadWarning` reagiert nur auf `dirty` — `src/App.tsx:18`,
  `src/lib/useBeforeUnloadWarning.ts`.
- Kein UI-Weg, ein bereits geöffnetes Dokument mit einem anderen Modul zu exportieren —
  `DocumentWorkspace.tsx:21` ruft ausschließlich `module.exportFile` des gebundenen Moduls.
- Playwright-Projekte für Tablet/Mobile existieren bereits (`playwright.config.ts:20-24`:
  `Desktop Chrome`, `Mobile` = Pixel 7, `Tablet` = iPad Mini) — Testfall 12 kann ohne
  Konfigurationsänderung dort laufen.
- Es existiert **keine** XSD-/RelaxNG-Schema-Validierung im Repo (kein `xmllint`/`libxmljs`/
  vergleichbares Devdependency in `package.json`) — R1/R2 („gegen das OOXML-/ODF-Schema
  prüfen") kann aktuell nur strukturell (wohlgeformtes XML + Pflichtelemente/-attribute per
  unabhängigem `DOMParser`/`JSZip`), nicht per echter Schema-Validierung erfüllt werden. Das
  wird unten als bewusste Einschränkung dokumentiert, nicht stillschweigend unterschlagen.

---

## 3. Änderungen — Priorität P0 (Bugfixes)

### 3.1 Fokus nach Dokumenterstellung (Abschnitt 3.3, höchste Priorität)

**Datei:** `src/formats/shared/editor/WordEditor.tsx`

**Ist:** Im Mount-`useEffect` wird `new EditorView(...)` erzeugt, `viewRef.current` gesetzt,
`forceRender` angestoßen — aber nie fokussiert.

**Soll:** Direkt nach `viewRef.current = view` wird `view.focus()` aufgerufen:

```ts
const view = new EditorView(containerRef.current, {
  state,
  dispatchTransaction(tr) { /* unverändert */ },
})
viewRef.current = view
view.focus()               // NEU
forceRender((n) => n + 1)
```

**Reichweite/Seiteneffekt (bewusst):** `WordEditor` ist derselbe Code für Neu-Erstellen
*und* Import (Abschnitt 1 des Req-Dokuments). Der Fix wirkt also identisch für importierte
Dokumente — das ist gewollt (dieselbe „sofort bearbeitbar"-Erwartung gilt dort genauso) und
kein Scope-Creep, weil es ein einziger, gemeinsamer Codepfad ist.

**Bekannte, akzeptierte Grenze (dokumentieren, nicht „fixen"):** `view.focus()` setzt den
Fokus auf das `contenteditable`-Element und macht `page.keyboard.type(...)` (Hardware-
Tastatur-Events) sofort wirksam — das erfüllt Testfall 2. Auf Touch-Geräten holt ein rein
programmatischer `.focus()`-Aufruf ohne vorausgehende Nutzer-Geste in WebKit/Chrome **nicht
zwingend** die virtuelle Bildschirmtastatur ein („kein Software-Keyboard ohne Touch-Geste"
ist eine Plattform-Policy, keine App-Einschränkung). Das ist eine bekannte Grenze, die hier
nicht umgangen werden kann/soll — Playwright-Mobile-Tests nutzen ohnehin synthetische
Keyboard-Events, nicht das reale OS-Keyboard, und sind davon nicht betroffen.

**Betroffene bestehende Tests:** keine Regression erwartet. Alle drei bestehenden E2E-Specs
rufen weiterhin `editor.click()` vor dem Tippen auf — ein Klick auf ein bereits fokussiertes
`contenteditable` ist ein No-Op, kein Fehler. Keine Unit-Testdatei rendert `WordEditor` mit
echtem `EditorView` in jsdom (geprüft: kein Treffer für `WordEditor` unter
`**/__tests__/**` außer über Playwright), also kein jsdom-Fokus-Sonderfall zu befürchten.

### 3.2 Fehlerbehandlung beim Erstellen (Abschnitt 3.8)

**Datei:** `src/app/FormatPicker.tsx`

**Ist:** `handleCreateNew` (Zeile 28-33) hat kein `try/catch`, im Gegensatz zu `handleFile`
(Zeile 14-26), das Import-Fehler in den `role="alert"`-Banner schreibt.

**Soll:**

```ts
function handleCreateNew(module: AnyFormatModule) {
  setError(null)
  try {
    const content = module.createNew()
    const ext = module.extensions[0] ?? ''
    onOpen(module.id, { fileName: `${module.defaultName}${ext}`, content, dirty: false })
  } catch (err) {
    setError(
      `Neues Dokument (${module.label}) konnte nicht erstellt werden: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }
}
```

`module.createNew()` bleibt synchron (`FormatModule.createNew: () => TContent` in
`src/formats/types.ts:26` wird **nicht** geändert — eine hypothetische künftige asynchrone
Vorlagen-Initialisierung ist ausdrücklich nicht Teil dieses Tickets und würde eine eigene
Typ-/API-Änderung samt Ladezustand in der UI erfordern).

### 3.3 DOCX-Export: Seitengröße/-ränder in `w:sectPr` (Abschnitt 3.4, R5, Testfall 6)

**Neue Datei:** `src/formats/shared/pageGeometry.ts`

Single Source of Truth für die feste Seitengeometrie, die aktuell an drei Stellen implizit
dupliziert ist (Bildschirm-CSS in `pageLayout.ts`, ODT-Fixwerte in `writer.ts`, fehlender
DOCX-Wert). Verhindert, dass DOCX/ODT/Bildschirm künftig wieder auseinanderlaufen (das ist
exakt der in Abschnitt 3.2/8 des Req-Dokuments verlangte Konsistenz-Schutz):

```ts
/**
 * Fixe Seitengeometrie für jedes neu erstellte und jedes exportierte Dokument:
 * A4 (210 x 297 mm), 2,5 cm Rand auf allen Seiten. Es gibt aktuell keine
 * Persistenz pro Dokument (kein Feld in `WordDocumentContent`) und keine UI, das zu
 * ändern — siehe specs/neues-dokument-code.md Abschnitt 5 ("Nicht-Ziele") sowie die
 * Backlog-Einträge `papierformat`/`seitenraender`/`seitenausrichtung`.
 *
 * Konsumenten:
 * - shared/editor/pageLayout.ts (Bildschirm-Simulation, in px)
 * - docx/writer.ts (w:pgSz/w:pgMar, in Twips)
 * - odt/writer.ts (style:page-layout-properties, in cm)
 */
export const PAGE_WIDTH_MM = 210
export const PAGE_HEIGHT_MM = 297
export const PAGE_MARGIN_MM = 25

const TWIPS_PER_MM = 1440 / 25.4

/** OOXML misst Seiten-/Randmaße in Twentieths of a Point (1/1440 inch). */
export function mmToTwips(mm: number): number {
  return Math.round(mm * TWIPS_PER_MM)
}
```

Ergibt (nachgerechnet, entspricht den in echten Word-Dokumenten üblichen A4-Werten):
`PAGE_WIDTH_MM` → 11906 Twips, `PAGE_HEIGHT_MM` → 16838 Twips, `PAGE_MARGIN_MM` → 1417
Twips.

**Geänderte Datei:** `src/formats/shared/editor/pageLayout.ts`

Ersetzt die hart kodierten `210`/`297`/`25` durch Import aus `pageGeometry.ts` (rein
kosmetischer Refactor, identische Zahlenwerte, keine Verhaltensänderung):

```ts
import { PAGE_WIDTH_MM, PAGE_HEIGHT_MM, PAGE_MARGIN_MM } from '../pageGeometry'
// ...
export const PAGE_WIDTH_PX = Math.round(PAGE_WIDTH_MM * PX_PER_MM)
export const PAGE_HEIGHT_PX = Math.round(PAGE_HEIGHT_MM * PX_PER_MM)
export const PAGE_MARGIN_PX = Math.round(PAGE_MARGIN_MM * PX_PER_MM)
```

**Neue Datei:** `src/formats/docx/pageSetup.ts`

```ts
import { PAGE_WIDTH_MM, PAGE_HEIGHT_MM, PAGE_MARGIN_MM, mmToTwips } from '../shared/pageGeometry'

/** `<w:pgSz>`/`<w:pgMar>` für die feste A4/2,5cm-Standardgeometrie (siehe pageGeometry.ts). */
export function defaultPageSetupXml(): string {
  const width = mmToTwips(PAGE_WIDTH_MM)
  const height = mmToTwips(PAGE_HEIGHT_MM)
  const margin = mmToTwips(PAGE_MARGIN_MM)
  return (
    `<w:pgSz w:w="${width}" w:h="${height}"/>` +
    `<w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" ` +
    `w:header="708" w:footer="708" w:gutter="0"/>`
  )
}
```

(`w:header`/`w:footer` = 708 Twips ≈ 1,25 cm ist der in echten Word-Exporten übliche
Abstand für Kopf-/Fußzeile zum Seitenrand; rein kosmetisch, da `header`/`footer` bei einem
neuen Dokument ohnehin `null` sind — wird der Vollständigkeit halber mitgeschrieben, damit
ein später hinzugefügter Header/Footer nicht mit Abstand 0 kollidiert.)

**Geänderte Datei:** `src/formats/docx/writer.ts`

In `writeDocx`, nach den bestehenden `if (header)`/`if (footer)`-Blöcken (Zeile 234-243),
die `sectPrExtra` befüllen — Reihenfolge ist in OOXML `CT_SectPr` relevant
(`headerReference`/`footerReference` **vor** `pgSz`/`pgMar`), deshalb Anhängen **nach** den
bestehenden Blöcken, nicht davor:

```ts
if (header) { /* unverändert, setzt headerReference */ }
if (footer) { /* unverändert, setzt footerReference */ }

sectPrExtra += defaultPageSetupXml()   // NEU

documentRels.add(RELATIONSHIP_TYPES.styles, 'styles.xml')
// ...
```

Import: `import { defaultPageSetupXml } from './pageSetup'` ergänzen.

**`src/formats/docx/reader.ts`: keine Änderung nötig.** Der Reader iteriert unter `sectPr`
ausschließlich über `headerReference`/`footerReference` (Zeile 352-353) und ignoriert jedes
andere Kind-Element bereits heute stillschweigend und sicher — ein `<w:pgSz>`/`<w:pgMar>`
zerstört nichts und führt zu keinem Fehler. Das ist bereits durch die Fixture-Testsuite
(`src/formats/docx/__tests__/external-fixtures.test.ts`, >50 reale DOCX-Dateien, von denen
praktisch alle `w:pgSz`/`w:pgMar` enthalten) indirekt abgedeckt.

**Bewusst nicht umgesetzt:** Kein neues Feld in `WordDocumentContent` (`documentModel.ts`)
für Seitengröße/-ränder. Begründung: Es gibt aktuell keine UI, das pro Dokument zu ändern —
ein Feld ohne Bedienelement wäre nur eine Attrappe und würde außerdem alle bestehenden,
literal konstruierten `WordDocumentContent`-Testobjekte in
`src/formats/docx/__tests__/roundtrip.test.ts`, `src/formats/odt/__tests__/roundtrip.test.ts`
und den beiden `__tests__/FormatPicker.test.tsx`/`DocumentWorkspace.test.tsx`-Dateien
anfassen müssen, ohne einen Nutzen für **dieses** Ticket zu stiften. Konfigurierbarkeit ist
Gegenstand der separaten Backlog-Einträge `papierformat`/`seitenraender`/
`seitenausrichtung` (Priorität 2) — siehe Abschnitt 5.

### 3.4 ODT-Export: keine funktionale Änderung, nur Konstanten-Quelle

**Geänderte Datei:** `src/formats/odt/writer.ts`

`buildStylesXml` (Zeile 139-156) ersetzt die hart kodierten String-Literale
`"2.5cm"`/`"21cm"`/`"29.7cm"` durch aus `pageGeometry.ts` abgeleitete Werte, damit DOCX und
ODT nachweisbar aus derselben Quelle stammen (verhindert das im Req-Dokument explizit
befürchtete „künftig unbemerkt auseinanderentwickeln", Abschnitt 3.2):

```ts
import { PAGE_WIDTH_MM, PAGE_HEIGHT_MM, PAGE_MARGIN_MM } from '../shared/pageGeometry'

const mmToCm = (mm: number) => `${(mm / 10).toFixed(1).replace(/\.0$/, '')}cm`
// ...
`<style:page-layout-properties fo:margin="${mmToCm(PAGE_MARGIN_MM)}" fo:page-width="${mmToCm(PAGE_WIDTH_MM)}" fo:page-height="${mmToCm(PAGE_HEIGHT_MM)}"/>`
```

Ergibt identische Strings wie bisher (`"2.5cm"`, `"21cm"`, `"29.7cm"`) — reiner Refactor,
keine Verhaltensänderung, nur Beseitigung der Duplikation.

---

## 4. Tests — neu/angepasst

### 4.1 `src/app/__tests__/FormatPicker.test.tsx`

- **Neu:** „shows an error message when creating a new document fails" — Modul mit
  `createNew: () => { throw new Error('vorlage kaputt') }`, Klick auf „Neu erstellen",
  erwartet `role="alert"` mit Fehlertext (spiegelt den bestehenden Test für `handleFile`,
  Zeile 67-80).
- **Neu:** „clears a previous import error banner when creating a new document"
  (Grenzfall 9) — erst `handleFile` fehlschlagen lassen (Banner sichtbar), dann „Neu
  erstellen" klicken, `role="alert"` darf nicht mehr im DOM sein.
- **Neu:** „rapid double-click on 'Neu erstellen' does not throw or call onOpen with
  inconsistent state" (Grenzfall 2) — zweimal hintereinander klicken (ohne `await` dazwischen),
  `onOpen` wird zweimal mit demselben, korrekten Payload aufgerufen, kein Test-Fehler durch
  unbehandelte Exception.

### 4.2 `src/formats/docx/__tests__/roundtrip.test.ts` (bzw. neue Datei
`src/formats/docx/__tests__/pageSetup.test.ts`)

- **Neu:** „writes A4 page size and 2.5cm margins into every exported document" —
  `writeDocx(doc([paragraph('x')]))`, XML von `word/document.xml` per `DOMParser`
  (unabhängig vom eigenen Reader) parsen, `w:pgSz[@w:w='11906'][@w:h='16838']` und
  `w:pgMar[@w:top='1417']` (etc.) im `w:sectPr` nachweisen.
- **Neu:** „page size XML appears after any header/footer reference" — Dokument mit
  `header`/`footer` gesetzt exportieren, Reihenfolge der Kindelemente in `<w:sectPr>` per
  XML-Kindknoten-Array prüfen (Regressionsschutz für die in 3.3 genannte Schema-Reihenfolge).
- **Neu:** „re-importing an exported blank document still yields exactly one empty
  paragraph, no header/footer" — deckt R1/Testfall 5 auf Unit-Ebene ab (schneller
  Vorab-Check vor dem E2E-Test in 4.5).

### 4.3 `src/formats/odt/__tests__/roundtrip.test.ts`

- **Neu:** „writes the same A4/2.5cm page geometry as DOCX" — Wertegleichheit zwischen den
  aus `writeOdt`/`writeDocx` erzeugten Maßen dokumentieren (in cm bzw. Twips umgerechnet),
  damit ein künftiges Auseinanderlaufen sofort auffällt.

### 4.4 `src/formats/docx/__tests__/styleDefs.test.ts` (neu) und Ergänzung in ODT

- **Neu:** „a blank new document's Normal/Standard style carries no explicit font or size"
  — dokumentiert die in Abschnitt 3.5 beschriebene, bewusst offene Entscheidung als
  Regressionstest (kein `w:rFonts`/`w:sz` in `Normal`, kein `style:text-properties` in
  `Standard`), damit eine künftige Änderung hier eine bewusste Entscheidung erfordert statt
  eines stillen Nebeneffekts.

### 4.5 Neue Datei: `tests/e2e/new-document.spec.ts`

Konsolidiert die Playwright-Testfälle 1–3, 6, 8–14 aus Abschnitt 6 des Req-Dokuments für
**beide** Formate (parametrisiert über `docxCard`/`odtCard`-Helper, analog zu den
bestehenden Spec-Dateien). Läuft automatisch auch in den Projekten `Mobile`/`Tablet` aus
`playwright.config.ts`, da keine Projekt-Filter gesetzt werden (Testfall 12).

Testfälle im Einzelnen:

1. **„types immediately after creating a new document, without any prior click"**
   (Testfall 2, zentraler Regressionstest für Abschnitt 3.1) — nach „Neu erstellen" **ohne**
   `editor.click()` direkt `page.keyboard.type(...)`, danach `expect(editor).toContainText(...)`.
   Muss vor dem Fix aus Abschnitt 3.1 rot sein, danach dauerhaft grün.
2. **„creates a new document via keyboard only (Tab + Enter)"** (Testfall 3, Grenzfall 3) —
   `page.keyboard.press('Tab')` bis der Button fokussiert ist (per `page.locator(...).focus()`
   plus `Enter`-Press als robuste Alternative, falls Tab-Reihenfolge sich ändert), erwartet
   identisches Ergebnis wie Mausklick.
3. **„shows no dirty indicator and no error banner right after creation"** (Testfall 1).
4. **„exports an unmodified new document, and re-import yields the same empty state"**
   (Testfall 4/5, R1/R2) — Export, dann strukturelle Prüfung **ohne** `src/formats/*/reader.ts`:
   - DOCX: `JSZip.loadAsync`, `DOMParser` auf `[Content_Types].xml` und `word/document.xml`,
     Existenzprüfung der Pflichtteile, wohlgeformtes XML (kein `parsererror`).
   - ODT: zusätzlich expliziter Test, dass `mimetype` der **erste** Zip-Eintrag ist **und**
     unkomprimiert vorliegt (`zipEntry.options.compression === 'STORE'` bzw. Prüfung der
     rohen Zip-Local-File-Header-Bytes auf Compression-Method `0`) — R2 verlangt das
     ausdrücklich als *separat* zu verifizieren.
   - Re-Import über die UI (`input[type=file]` mit der heruntergeladenen Datei), Editor zeigt
     wieder einen leeren Absatz.
   - **Bekannte Einschränkung, explizit im Testkommentar vermerkt:** Es wird strukturell
     (Wohlgeformtheit + Pflichtelemente), nicht gegen die vollständige OOXML-/ODF-XSD
     validiert, da kein Schema-Validator als Dependency vorhanden ist (siehe Abschnitt 6).
5. **„exported page size matches the displayed A4 default"** (Testfall 6, R5) — nach dem
   Fix aus 3.3 grün; prüft `w:pgSz`/`w:pgMar` (DOCX) bzw.
   `style:page-layout-properties` (ODT) per unabhängigem Parser gegen die aus
   `pageGeometry.ts` abgeleiteten Werte.
6. **„closing immediately after creation asks no confirmation"** (Testfall 8, Grenzfall 5).
7. **„closing after an edit asks for confirmation; cancel keeps the document open with its
   content intact"** (Testfall 9, Grenzfall 4) — tippt Text, klickt „← Formate", bricht den
   `window.confirm`-Dialog ab (Playwright `page.on('dialog', d => d.dismiss())`), prüft, dass
   der getippte Text weiterhin im Editor sichtbar ist (nicht nur, dass kein Navigationswechsel
   stattfand).
8. **„undo back to empty leaves content empty but dirty indicator remains visible"**
   (Testfall 10, Grenzfall 6) — dokumentiert das akzeptierte Verhalten aus Abschnitt 3.7,
   fixiert es als Erwartung (kein „soll irgendwann behoben werden"-Kommentar ohne Test).
9. **„two consecutive 'create new' cycles leave no leftover content or duplicated
   toolbars"** (Testfall 11, Grenzfall 8) — Dokument 1 erstellen, Text tippen, über
   „← Formate" + Bestätigung schließen, Dokument 2 erstellen, prüft leeren Editor, genau
   eine `[role="toolbar"]`-Instanz, `page.on('console', ...)`/`page.on('pageerror', ...)`
   ohne Treffer während des gesamten Ablaufs.
10. **„exporting with umlauts in a user-renamed file name downloads with the correct name"**
    (Testfall 13) — Dateiname im UI ändern (sofern ein Rename-Weg existiert; falls **nicht**,
    wird das hier als zusätzlicher, dokumentierter Befund vermerkt — siehe Abschnitt 6.1)
    und Downloadnamen prüfen.
11. **„the whole create → type → format → export flow stays free of console errors and
    unhandled rejections"** (Testfall 14) — `page.on('pageerror')`/
    `page.on('console', msg => msg.type() === 'error')`/
    `page.on('crash')` als Assertion über den gesamten Testlauf, nicht nur am Ende.
12. **„export immediately after creation, before any focus/render settles, still reflects
    the empty body"** (Grenzfall 12) — kein `waitForTimeout`, Klick auf „Exportieren" direkt
    nach `getByRole('button', {name:'Neu erstellen'}).click()`, prüft exportierte Datei
    enthält exakt einen leeren Absatz.
13. **`test.fixme` „R7: creates a new document and exports it under the other format
    without losing content"** — bewusst als **fehlschlagend/übersprungen** markiert mit
    Kommentar-Verweis auf Backlog-Eintrag `speichern-unter-format`, damit R7 sichtbar offen
    bleibt (Abschnitt 1, Entscheidung 6) statt stillschweigend zu fehlen.

### 4.6 Mount/Unmount-Hygiene (Grenzfall 8, ergänzend zu 4.5.9)

**Neue Datei:** `src/formats/shared/editor/__tests__/WordEditor.test.tsx`

Unit-Test mit `@testing-library/react` (`render`/`unmount`), der `WordEditor` zweimal
nacheinander mit je einem frischen `createBlankWordDocument()`-Inhalt mountet/unmountet und
prüft:
- `view.destroy()` wird beim Unmount aufgerufen (Spy auf `EditorView.prototype.destroy` oder
  Prüfung, dass `containerRef`-Kind-DOM nach Unmount leer ist).
- Nach dem zweiten Mount enthält `.ProseMirror` **keinen** Text aus dem ersten Zyklus.

Ergänzt (schneller, deterministischer) die reine E2E-Abdeckung aus 4.5.9.

---

## 5. ProseMirror-Schema, Commands, Toolbar — Auswirkungen

**Keine Änderung an `src/formats/shared/schema.ts` oder `src/formats/shared/editor/commands.ts`.**
Begründung: Der gesamte in `neues-dokument-req.md` beschriebene Scope betrifft
Erstellungs-Lifecycle, Fokus, Fehlerbehandlung und Export-Seitenformat — keine dieser
Änderungen berührt Knoten-/Mark-Typen, Attribute oder Editor-Commands. Insbesondere:

- `schriftart-waehlen`/`schriftgroesse-waehlen` (Font-Mark/-Attribut) sind laut Entscheidung
  zu Offener Frage 3 explizit **nicht** Teil dieses Tickets.
- `seitenraender`/`seitenausrichtung`/`papierformat` würden ein neues Dokumentattribut
  (vermutlich am `doc`-Node oder in `WordDocumentContent`) sowie eine Toolbar-/Dialog-UI
  benötigen — laut Entscheidung zu Offener Frage 2 bewusst nicht in diesem Ticket.
- `dokumenteigenschaften` (Titel-Eingabefeld) würde eine neue UI-Komponente (z. B. ein
  Titel-Input in `DocumentWorkspace.tsx`) benötigen — laut Entscheidung zu Offener Frage 4
  bewusst nicht in diesem Ticket.

**Keine Änderung an `src/formats/shared/editor/Toolbar.tsx`.** Die Toolbar bleibt
unverändert; ihr in Abschnitt 2/Punkt 12 des Req-Dokuments beschriebenes „erscheint erst
nach dem ersten Effect-Durchlauf"-Verhalten ist rein eine Frage der React-Render-Reihenfolge
(`{viewRef.current && <Toolbar view={viewRef.current} />}` in `WordEditor.tsx:118`) und wird
durch den `view.focus()`-Fix aus Abschnitt 3.1 nicht verändert — `forceRender` läuft im
selben Effect-Durchlauf wie bisher, nur mit einer zusätzlichen synchronen `focus()`-
Anweisung davor. Der von Grenzfall 11 verlangte Nachweis „kein wahrnehmbarer Zwischenzustand
zwischen Klick und Toolbar" wird über Testfall 4.5.1 (das direkt nach Klick tippt) faktisch
mitgeprüft: Käme die Toolbar merklich verzögert, würde das den Fokus-Test nicht betreffen,
aber ein zusätzlicher expliziter Assert `await expect(page.getByRole('toolbar')).toBeVisible()`
direkt nach dem „Neu erstellen"-Klick wird testfall 4.5.1 vorangestellt, um genau das
separat abzusichern.

---

## 6. Bewusste Einschränkungen / Nicht-Ziele dieses Tickets

1. **Keine echte OOXML-/ODF-Schema-Validierung.** R1/R2 verlangen wörtlich eine Prüfung
   „gegen das OOXML-Schema"/„gegen das ODF-Schema". Es gibt aktuell keinen
   XSD-/RelaxNG-Validator im Projekt. Empfehlung für ein Folge-Ticket: `libxmljs2` oder ein
   WASM-`xmllint` als Dev-Dependency ergänzen und die offiziellen ECMA-376- bzw.
   OASIS-ODF-1.3-Schemata als Testfixtures einbinden. Bis dahin wird R1/R2 in 4.5.4 nur
   strukturell (Wohlgeformtheit, Pflichtteile, korrekte ZIP-Struktur/`mimetype`-Platzierung)
   geprüft — das ist schwächer als „schema-valide", aber strikt stärker als der bisherige
   Zustand (gar keine unabhängige Prüfung).
2. **Kein Dateiname-Rename-UI-Audit.** Testfall 13 setzt voraus, dass der Dateiname nach dem
   Erstellen überhaupt änderbar ist. Beim Code-Review wurde **kein** Eingabefeld für
   `document.fileName` in `DocumentWorkspace.tsx` gefunden (nur reine Anzeige, Zeile 49-51).
   Das ist ein **zusätzlicher Befund**, der im Req-Dokument nicht explizit als Lücke benannt
   war: Testfall 13 kann so, wie im Req-Dokument formuliert („Umlaute im ... geänderten
   Dateinamen"), **nicht** durchgeführt werden, ohne vorher eine Rename-Funktion zu bauen.
   Empfehlung: Testfall 13 vorerst auf den **ursprünglichen** Dateinamen
   (`Unbenanntes Dokument.docx`/`.odt` — kein Umlaut enthalten) umformulieren oder auf ein
   Folge-Ticket verschieben, das `fileName`-Editierbarkeit zum Gegenstand hat. Dieser Plan
   entscheidet sich für Ersteres: Testfall 4.5.10 wird stattdessen mit einer über den
   Datei-Upload-Weg importierten Datei mit Umlaut-Namen durchgeführt (bereits heute
   möglich, siehe `handleFile`, Zeile 18: `fileName: file.name`), um die Umlaut-Kodierung im
   Download-Pfad (`downloadBlob`, `src/lib/download.ts`) trotzdem abzudecken.
3. **Keine Konfigurierbarkeit von Papierformat/Rändern/Ausrichtung.** Siehe Abschnitt 5.
4. **Kein Produkt-Schriftstandard.** Siehe Abschnitt 5 und Entscheidung 3.
5. **Kein Titel-Eingabefeld.** Siehe Entscheidung 4.
6. **Kein Cross-Format-Export.** Siehe Entscheidung 6, R7-Platzhaltertest in 4.5.13.
7. **Kein neuer „Datei → Neu"-Menüpunkt im Workspace.** Siehe Entscheidung 5.

---

## 7. Reihenfolge der Umsetzung (Empfehlung)

1. `src/formats/shared/pageGeometry.ts` anlegen (keine Verhaltensänderung für sich allein).
2. `src/formats/shared/editor/pageLayout.ts` auf `pageGeometry.ts` umstellen + bestehende
   Pagination-/Layout-Tests grün halten (`src/formats/shared/editor/__tests__/pagination.test.ts`
   gegenprüfen, da dort `PAGE_*_PX`-Konstanten importiert werden könnten).
3. `src/formats/docx/pageSetup.ts` anlegen, `src/formats/docx/writer.ts` einbinden, neue
   Unit-Tests aus 4.2 ergänzen — inklusive der Reihenfolge-Prüfung `headerReference` vor
   `pgSz`.
4. `src/formats/odt/writer.ts` auf `pageGeometry.ts` umstellen, Test aus 4.3 ergänzen.
5. `view.focus()` in `src/formats/shared/editor/WordEditor.tsx` ergänzen — danach sofort
   `tests/e2e/new-document.spec.ts`-Testfall 4.5.1 schreiben und lokal gegen den
   **unge­fixten** Stand laufen lassen (muss rot sein), dann den Fix aktivieren (muss grün
   werden) — das ist der im Req-Dokument geforderte Rot→Grün-Nachweis, kein optionaler
   Schritt.
6. `try/catch` in `src/app/FormatPicker.tsx#handleCreateNew` ergänzen, Tests aus 4.1.
7. Verbleibende Tests aus 4.5/4.6 ergänzen (inkl. `test.fixme` für R7).
8. `npm run test` (Vitest) und `npm run test:e2e` (alle drei Playwright-Projekte:
   Desktop Chrome, Mobile, Tablet) vollständig grün, bevor der Backlog-Status für
   `neues-dokument` von „vorhanden" auf „bestätigt vorhanden (mit Einschränkungen, siehe
   Abschnitt 6)" geändert wird.

---

## 8. Rückbezug auf die Testfälle aus `neues-dokument-req.md` Abschnitt 6

| Testfall | Abgedeckt durch |
|---|---|
| 1 | `tests/e2e/new-document.spec.ts` (4.5.3) |
| 2 | `tests/e2e/new-document.spec.ts` (4.5.1) + Fix 3.1 |
| 3 | `tests/e2e/new-document.spec.ts` (4.5.2) |
| 4 | `tests/e2e/new-document.spec.ts` (4.5.4), eingeschränkt siehe Abschnitt 6.1 |
| 5 | `tests/e2e/new-document.spec.ts` (4.5.4) |
| 6 | `tests/e2e/new-document.spec.ts` (4.5.5) + Fix 3.3/3.4 |
| 7 | bereits durch bestehende `docx.spec.ts`/`odt.spec.ts` „creates ... types and bolds ...
    and exports it" abgedeckt — keine Änderung nötig, nur zur Vollständigkeit aufgeführt. |
| 8 | `tests/e2e/new-document.spec.ts` (4.5.6) |
| 9 | `tests/e2e/new-document.spec.ts` (4.5.7) |
| 10 | `tests/e2e/new-document.spec.ts` (4.5.8) |
| 11 | `tests/e2e/new-document.spec.ts` (4.5.9) + `WordEditor.test.tsx` (4.6) |
| 12 | `tests/e2e/new-document.spec.ts` läuft ungefiltert in allen drei
     `playwright.config.ts`-Projekten (Desktop/Mobile/Tablet) |
| 13 | `tests/e2e/new-document.spec.ts` (4.5.10), umformuliert — siehe Abschnitt 6.2 |
| 14 | `tests/e2e/new-document.spec.ts` (4.5.11) |
