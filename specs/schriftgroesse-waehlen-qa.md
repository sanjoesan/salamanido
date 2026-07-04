# Testplan „Schriftgröße wählen" — QA-Verifikation

Gegenstück zu `specs/schriftgroesse-waehlen-req.md` (Anforderung) und
`specs/schriftgroesse-waehlen-code.md` (Umsetzungsplan). Dieses Dokument legt
fest, **welche Tests** geschrieben werden, **wo** sie liegen, **wie** sie
ausgeführt werden und **wann** ein Punkt als abgehakt gilt.

Anders als bei den meisten anderen `*-qa.md`-Gegenstücken in diesem Repo
(z. B. `kursiv-qa.md`) ist `fontSize` laut Anforderung Abschnitt 7 und Plan
Abschnitt 0 ein **vollständiger Neubau**: Es gibt noch keinen Mark, kein
Toolbar-Element, keinen Reader-/Writer-Code. Dieser Testplan ist deshalb
gleichzeitig **Abnahmekriterium für die Implementierung** (Anforderung
Abschnitt 9, Punkt 1–2) — jeder hier definierte Test muss gegen den in
`schriftgroesse-waehlen-code.md` beschriebenen, tatsächlich gebauten Code grün
sein, bevor der Backlog-Status von „fehlt" auf „vorhanden (verifiziert)"
wechseln darf.

Zwei Ebenen, die sich ergänzen, aber **keine ersetzen darf**:

1. **Unit-Tests** (Vitest) für die Reader/Writer-Rundreise auf Daten-/
   XML-Ebene — schnell, präzise, deterministisch, aber blind gegenüber
   Toolbar/Tastatur/echtem Datei-Dialog.
2. **Echte Playwright-Browser-Tests** — Klicks auf das tatsächliche
   Schriftgrößen-Feld in der Toolbar, echte Tastatureingabe (inkl. Pfeiltasten
   in der Preset-Liste), echter `setInputFiles()`-Upload, echter
   `page.waitForEvent('download')`-Export, Prüfung der **tatsächlich
   heruntergeladenen Datei** (nicht nur ein interner Aufruf von
   `readDocx`/`readOdt`/`writeDocx`/`writeOdt`/`setFontSize`/
   `getFontSizeAtSelection`).

Ein Test, der nur `readDocx(buffer)`/`setFontSize(state)` direkt aufruft,
zählt **nicht** als Ebene 2, auch wenn er in `tests/e2e/` liegt.

Referenzierte Fixtures (siehe `schriftgroesse-waehlen-code.md` Abschnitt 7):
`tests/fixtures/external/docx/bug59058.docx`, `61470.docx`,
`IllustrativeCases.docx`; `tests/fixtures/external/odt/TestTextSelection.odt`,
`tableComplex_DOC_LO41.odt` (nur als Negativ-/Gap-Beleg, siehe 1.3.4),
`bigFont.odt`, `excelfileformat.odt`, `Seasonal_Fruits2_en.odt`.

---

## 0. Ausführung

| Ebene | Befehl | Neue/geänderte Dateien |
|---|---|---|
| Unit | `npm test` (`vitest run`) | siehe Abschnitt 1 |
| Browser/E2E | `npm run test:e2e` (`playwright test`) | siehe Abschnitt 2 |

Beide Suiten müssen grün sein, bevor „Schriftgröße wählen" laut Anforderung
Abschnitt 9 als „vollständig verifiziert" gilt. Reihenfolge der Umsetzung:
zuerst der Neubau aus `schriftgroesse-waehlen-code.md` Abschnitt 4 (Schema,
Commands, Toolbar, Reader, Writer, CSS-Standardgröße), dann Unit-Tests, dann
E2E-Tests, dann gemeinsamer Lauf beider Suiten gegen den fertigen Code.

---

## 1. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

Ziel: jede Rundreise-Behauptung aus Anforderung Abschnitt 5 sowie jeden
Reader-/Utility-Grenzfall aus Abschnitt 4 auf Daten-/XML-Ebene isoliert,
deterministisch und ohne Browser nachweisen. Diese Ebene prüft **Funktionen
direkt** (`readDocx`, `writeDocx`, `readOdt`, `writeOdt`, `roundToHalfPt`,
`clampFontSizePt`, `parseFontSizeInput`) — das ist hier ausdrücklich erlaubt
und richtig, weil sie durch die Playwright-Ebene (Abschnitt 2) ergänzt, nicht
ersetzt wird.

### 1.1 Neu: `src/formats/shared/editor/__tests__/fontSize.test.ts`

Reine Utility-Funktionstests (kein DOM/Editor nötig), gegen
`src/formats/shared/fontSize.ts` (Plan Abschnitt 3.1/4.1).

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | Rundung auf 0,5-pt-Schritte | `13.37`, `13.1`, `13.26`, `10` | `13.5`, `13`, `13.5`, `10` | 4.4, 2.5 |
| 2 | Clamping nach unten (0/negativ → 1 pt) | `0`, `-5` | `1` | 4.2 |
| 3 | Clamping nach oben (>400 pt → 400 pt) | `5000` | `400` | 4.3 |
| 4 | Rundung **und** Clamping kombiniert | `399.8` | `400` | 4.3/4.4 zusammen |
| 5 | Deutsches Komma als Dezimaltrennzeichen | `"12,5"` | `12.5` | 4.5 |
| 6 | Nicht-numerische/leere Eingabe liefert `null`, wirft nicht | `"abc"`, `""`, `"Infinity"`, `"NaN"`, `"13abc"` | `null` in jedem Fall | 4.1 — insbesondere `"13abc"`, um einen stillen `parseFloat`-Fallback auszuschließen |
| 7 | Anzeige-Formatierung | `12` → `"12"`, `13.5` → `"13,5"` | wie angegeben | Element 4 (Anzeige des aktuellen Werts) |
| 8 | Preset-Liste enthält alle geforderten Werte | `FONT_SIZE_PRESETS_PT` | enthält mind. `8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72` | Element 2 (Anforderung Abschnitt 1) |

### 1.2 Neu: `src/formats/docx/__tests__/fontSize.test.ts`

Reader-Robustheit gegen Fremddatei-Grenzfälle, je über eine minimal per JSZip
gebaute `.docx`-Datei (Muster `buildDocxWithRun(runXml)`, analog zu
`buildSampleDocx()` in `tests/e2e/docx.spec.ts`) und `readDocx(blob)`.

| # | Testfall | Eingabe (`w:rPr`) | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | Preset-Wert | `<w:sz w:val="24"/>` | `fontSize`-Mark mit `pt: 12` | Basisfall |
| 2 | Nicht-Preset-Wert | `<w:sz w:val="26"/>` | `pt: 13`, **keine** Rundung auf einen Preset-Wert | 4.12 |
| 3 | Halbpunkt-Wert | `<w:sz w:val="27"/>` | `pt: 13.5` | 4.16 |
| 4 | Fehlendes `w:sz` | kein `w:sz`-Element im Lauf | **kein** `fontSize`-Mark gesetzt | Anforderung Abschnitt 3, Punkt 3 |
| 5 | Nicht-numerisches `w:val` | `<w:sz w:val="abc"/>` | **kein** `fontSize`-Mark, kein Absturz, kein `NaN` im Modell | 4.1, Plan Abschnitt 2 Fund 2 |
| 6 | `w:val="0"` bzw. negativ (technisch ungültig, aber denkbar in Fremddatei) | `<w:sz w:val="0"/>` | **kein** `fontSize`-Mark (nicht `pt: 0`) | Robustheit, analog 4.2 auf Reader-Seite |
| 7 | Wert außerhalb 1–400 pt bleibt beim reinen Import **ungeclampt** | `<w:sz w:val="1000"/>` | `pt: 500`, **nicht** auf 400 gekappt | Plan Abschnitt 3.2 — zentrale Architekturentscheidung, eigener Test, weil ein Regressionsrisiko („Clamping versehentlich auch im Reader") sonst unbemerkt Rundreisen verletzen würde |
| 8 | Kombination mit `w:b`/`w:color` im selben Lauf | `<w:sz w:val="28"/><w:b/><w:color w:val="FF0000"/>` | alle drei Marks gleichzeitig vorhanden, keiner verdrängt einen anderen | Anforderung 5.1, Zeile 5 |

### 1.3 Neu: `src/formats/odt/__tests__/fontSize.test.ts`

Analog für ODT, über `buildOdt(automaticStylesXml, spanMarkup)` und
`readOdt(blob)`, **plus** gezielte Assertions gegen echte Fixtures.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | Preset-Wert | `fo:font-size="14pt"` | `pt: 14` | Basisfall |
| 2 | Nicht-Preset-Wert | `fo:font-size="13pt"` | `pt: 13` | 4.12 |
| 3 | Dezimalwert exakt auf 0,5-Schritt | `fo:font-size="10.5pt"` | `pt: 10.5`, unverändert | 4.16 |
| 4 | Dezimalwert **außerhalb** des 0,5-Schritts (ODT erlaubt beliebige Dezimalstellen) | `fo:font-size="13.37pt"` | `pt: 13.5` (gerundet — **funktional relevant** bei ODT, nicht nur defensiv, Plan Abschnitt 4.8) | 4.4, 2.5 |
| 5 | Fehlendes `fo:font-size` | kein Attribut im referenzierten Text-Stil | **kein** `fontSize`-Mark | Anforderung Abschnitt 3, Punkt 5 |
| 6 | Reale Fixture `TestTextSelection.odt`, Stil `T10` (13 pt) | Datei einlesen, den über `T10` formatierten Lauf im resultierenden Dokumentbaum suchen | Lauf trägt `fontSize`-Mark mit exakt `pt: 13` | 4.12, bestätigt an echter, unveränderter Drittdatei |
| 7 | Reale Fixture `bigFont.odt` (72 pt, Preset-Wert) | Datei einlesen | passender Lauf trägt `fontSize`-Mark mit `pt: 72` | Positivtest gegen echte Datei |
| 8 | Dokumentierter Gap: `tableComplex_DOC_LO41.odt`, Stil `P2` (`style:family="paragraph"`, `fo:font-size="21.5pt"`, **kein** `text:span`) | Datei einlesen | Der betroffene Absatztext trägt **keinen** `fontSize`-Mark — bewusst dokumentiertes, vorbestehendes Reader-Verhalten (Plan Abschnitt 2, Fund 3), **kein** Regressions-Fail, sondern ein Beleg-Test, der verhindert, dass dieser Gap künftig fälschlich als „neuer Bug von `schriftgroesse-waehlen`" missverstanden wird |

### 1.4 Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts` und `src/formats/odt/__tests__/roundtrip.test.ts`

Neue `describe`-Blöcke „font size", analog zu den bestehenden Blöcken für
Textformatierung. Deckt Anforderung Abschnitt 5.1 auf reiner Daten-Ebene ab
(ergänzt die E2E-Rundreisen in Abschnitt 2.5, ersetzt sie nicht):

| # | Testfall | Erwartung |
|---|---|---|
| 1 | Preset-Größe (14 pt) übersteht Export → Reimport | `pt: 14` unverändert am selben Textlauf |
| 2 | Nicht-Preset-Größe (13 pt) übersteht Export → Reimport | `pt: 13` unverändert, keine Rundung auf einen Preset-Wert |
| 3 | Halbpunkt-Größe (10,5 pt) übersteht Export → Reimport | `pt: 10.5` exakt, kein Rundungsverlust (4.16) |
| 4 | Schriftgröße + Fett + Textfarbe auf demselben Lauf | alle drei Marks nach Reimport gemeinsam vorhanden (5.1, Zeile 5) |
| 5 | Explizite Größe auf einem Textlauf **innerhalb** einer Überschrift (Level 1, implizit 24 pt), Lauf selbst z. B. 30 pt | nach Reimport: dieser Lauf trägt weiterhin explizit `pt: 30`, der Rest der Überschrift bleibt **ohne** Mark (implizit 24 pt) — 2.4, 4.7, 5.1 Zeile 6 |

### 1.5 Regressionstest: ODT-Stil-Dedublizierung mit `fontSize` als 7. Feld

**Erweiterung `src/formats/odt/__tests__/roundtrip.test.ts`** (oder eigener
Block in `styleRegistry`-nahen Tests) — deckt den in
`schriftgroesse-waehlen-code.md` Abschnitt 2 (Fund 1) / Abschnitt 4.9
beschriebenen, vorbestehenden `JSON.stringify(props)`-Ordnungs-Bug ab, der mit
dem neuen `fontSize`-Feld ein höheres Kollisionsrisiko bekommt:

```ts
it('does not create duplicate automatic text styles when the same bold+fontSize combination arrives in different mark-array order', async () => {
  const original = doc([
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'A', marks: [{ type: 'strong' }, { type: 'fontSize', attrs: { pt: 14 } }] },
        { type: 'text', text: 'B', marks: [{ type: 'fontSize', attrs: { pt: 14 } }, { type: 'strong' }] },
      ],
    },
  ])
  const blob = await writeOdt(original)
  const zip = await JSZip.loadAsync(blob)
  const contentXml = await zip.file('content.xml')!.async('text')
  const styleDefCount = (contentXml.match(/<style:style style:name="T\d+"/g) ?? []).length
  expect(styleDefCount).toBe(1)
})
```

Muss **vor** dem Fix aus Plan Abschnitt 4.10 rot sein (zwei Style-Defs statt
einer), danach grün — als eigenständiger Beleg, dass der Fix wirkt, nicht nur
als nachträgliche Behauptung.

### 1.6 Validierung gegen unabhängigen Parser

Da dieses Repo keine Python-Toolchain besitzt, erfolgt die unabhängige
Validierung zweistufig (analog `kursiv-qa.md` Abschnitt 1.5):

1. **Automatisiert, Teil der E2E-Suite:** Prüfung des exportierten
   XML-Strings per Regex/`DOMParser`, **ohne** den eigenen `readDocx`/`readOdt`
   zu benutzen — umgesetzt in Abschnitt 2.6, Szenarien „unabhängige
   Validierung".
2. **Manuell, einmalig vor Statuswechsel auf „verifiziert":** eine exportierte
   Test-DOCX/-ODT mit mehreren unterschiedlichen Schriftgrößen (inkl. 13 pt
   und 10,5 pt) außerhalb dieses Repos in Word bzw. LibreOffice öffnen,
   Schriftgrad-Feld an den jeweiligen Textstellen ablesen, Übereinstimmung in
   dieser Datei oder einer Folgedatei vermerken. Kein Bestandteil der
   automatisierten CI-Suite, aber Pflicht-Checkliste-Punkt vor Abnahme (siehe
   Abschnitt 4).

---

## 2. Echte Playwright-Browser-Tests

**Grundregel dieser Ebene:** Jeder Test bedient die Anwendung ausschließlich
so, wie eine Person es täte — `page.getByLabel('Schriftgröße')` bzw.
`page.getByTitle('Schriftgröße (in Punkt)')` für Klicks/Eingaben,
`page.keyboard.type(...)`/`.press(...)` für Tastatur, `input.setInputFiles(...)`
für Uploads, `page.waitForEvent('download')` + Lesen der heruntergeladenen
Datei vom Datenträger für Exporte. **Kein Test in diesem Abschnitt darf**
`readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`setFontSize`/`clearFontSize`/
`getFontSizeAtSelection` direkt importieren oder aufrufen — das wäre Ebene 1,
nicht Ebene 2. Wo eine Datei hochgeladen werden muss, wird sie unabhängig vom
Reader/Writer dieses Projekts per JSZip von Hand gebaut (Muster
`buildSampleDocx()`/`buildSampleOdt()` aus `tests/e2e/docx.spec.ts`/
`odt.spec.ts`) — das stellt sicher, dass ein Rundreisen-Test nicht zufällig
nur beweist, dass Writer und Reader sich gegenseitig kompensieren.

### 2.0 Neue Datei: `tests/e2e/font-size.spec.ts`

Struktur/Locator-Helfer identisch zu den bestehenden Dateien:

```ts
function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

function fontSizeInput(page: import('@playwright/test').Page) {
  return page.getByLabel('Schriftgröße')
}
```

`beforeEach`: `page.goto('/')` → Privacy-Banner „Verstanden" wegklicken →
je nach Testfall `docxCard`/`odtCard` „Neu erstellen" klicken (analog zu
`selection-regression.spec.ts`).

**Hinweis zur Preset-Auswahl per Klick:** Ein natives `<input list>` erlaubt
in Playwright keinen direkten `option.click()` wie bei einem eigenen
Dropdown-Markup. Umsetzung des „Preset-Klick"-Testschritts:
`fontSizeInput(page).click()` → `fontSizeInput(page).fill('24')` →
`fontSizeInput(page).press('Enter')`, **zusätzlich** ein dedizierter Test, der
die datalist-Option über Tastatur erreicht (`ArrowDown` in der geöffneten
Liste, dann `Enter`) — deckt Element 5 der Anforderung (Pfeiltasten-Navigation)
unabhängig von der Klick-Interaktion ab, die laut `schriftgroesse-waehlen-code.md`
Abschnitt 3.4 auf einem Chromium-spezifischen `insertReplacementText`-Verhalten
beruht und deshalb **explizit selbst verifiziert** werden muss, nicht als
gegeben angenommen werden darf.

### 2.1 Toolbar & Tastatur — Grundverhalten (Anforderung Abschnitt 1, Testfälle 1–3)

| # | Testfall | Schritte (echte Bedienung) | Assertion |
|---|---|---|---|
| 1 | Feld ist sichtbar und per Tab erreichbar | Editor fokussieren, wiederholt `keyboard.press('Tab')`, bis das Schriftgrößenfeld den Fokus hat (oder direkt `fontSizeInput(page).focus()` gefolgt von Prüfung der Tab-Reihenfolge relativ zu den Nachbar-Buttons) | `fontSizeInput(page)` ist sichtbar, `toBeFocused()` nach Erreichen per Tab |
| 2 | Preset-Wert per Klick/Eintippen anwenden, Fokus kehrt zurück | Text tippen, markieren, `fontSizeInput(page).click()` → `.fill('24')` → `.press('Enter')` | `editor` enthält Element mit `style` `font-size: 24pt` um den markierten Text; `editor` (`.ProseMirror`) hat nach Bestätigung wieder den Fokus, nicht das Eingabefeld |
| 3 | Preset über Pfeiltasten + Enter in der geöffneten Liste | Feld fokussieren, `ArrowDown` (öffnet/navigiert Datalist), `Enter` | resultierender Wert im Feld entspricht einem der Preset-Werte, angewendet auf die Selektion |
| 4 | Freitext + Enter wendet Größe an, Rundung greift (4.4) | Feld fokussieren, `.fill('13,37')`, `Enter` | Feld zeigt danach `13,5`; DOM-Style `font-size: 13.5pt` an der Selektion |
| 5 | Escape verwirft Freitext ohne Anwendung (Element 3) | Feld fokussieren, vorhandenen Wert notieren, `.fill('99')`, `Escape` | Feld zeigt wieder den vorherigen Wert; Selektion im Editor unverändert (kein `99pt` im DOM) |
| 6 | Anzeige aktualisiert sich bei Cursor-Bewegung (Element 4) | Zwei Textstellen mit unterschiedlicher Größe erzeugen, Cursor abwechselnd in beide setzen | Feldwert ändert sich synchron mit der Cursor-Position, ohne zusätzliche Interaktion mit dem Feld selbst |

### 2.2 Größe ohne Selektion — Stored-Mark-Verhalten (Anforderung 2.2, Testfall 4, kritisch)

**Kritisch**, weil dies laut Anforderung 2.2 der bewusste, explizit geforderte
**Unterschied** zu `applyMarkColor`/`clearMarkColor` ist (die bei leerer
Selektion nichts bewirken) — dieser Abschnitt ist die zentrale Regressionslinie
gegen ein versehentliches „Rückfall auf das falsche Vorbild".

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Größe an leerer Schreibmarke setzen wirkt **nur** auf neu getippten Text | Text „ABC" tippen, Cursor mit `Home` an den Anfang (keine Selektion), Schriftgröße auf `24` setzen, dann `X` tippen | „X" liegt in einem Element mit `font-size: 24pt`, „ABC" bleibt unverändert (kein `24pt`-Style darum) |
| 2 | Umgebender, bereits vorhandener Text bleibt unberührt | Fortsetzung von Testfall 1 | expliziter Nicht-Test: `ABC`-Textknoten hat weiterhin keinen `fontSize`-Style/Mark |
| 3 | Zweite Formatierungsaktion direkt danach ohne erneutes Markieren möglich (2.1.3) | Nach Anwenden einer Größe auf eine Selektion sofort `getByTitle('Fett').click()`, ohne erneut zu markieren | derselbe Text ist jetzt sowohl `font-size` als auch `strong`/`fett` |

### 2.3 Gemischte Selektion (Anforderung 2.3, Testfall 5, Grenzfall 4.6/4.7)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Selektion mit zwei unterschiedlichen Größen zeigt „gemischt" | Zwei Textteile mit unterschiedlicher Größe erzeugen, beide gemeinsam markieren | `fontSizeInput(page)` hat leeren Wert (Platzhalter sichtbar), **nicht** die Größe des ersten Teils |
| 2 | Neue Größe auf gemischter Selektion vereinheitlicht den gesamten Bereich | Fortsetzung: neue Größe `18` eingeben, Enter | **beide** vormals unterschiedlich großen Textteile tragen jetzt `font-size: 18pt` |
| 3 | Gemischte Selektion über Tabellenzellgrenzen hinweg (4.6) | Tabelle einfügen, zwei Zellen mit unterschiedlicher Größe befüllen, beide Zellen als Zellselektion markieren (Shift-Klick über Zellgrenze oder analoges Muster aus `selection-regression.spec.ts`) | Feld zeigt „gemischt"; neue Größe vereinheitlicht beide Zellen |
| 4 | Selektion über Überschrift **und** Fließtext gemeinsam (4.7) | Überschrift + folgenden Absatz gemeinsam markieren (unterschiedliche implizite/explizite Größe) | Feld zeigt „gemischt"; neue Größe wird auf **beide** Anteile als direkte Formatierung angewendet |

### 2.4 Formatvorlagen-Zusammenspiel (Anforderung 2.4, Testfall 6)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Explizite Größe auf Textlauf **innerhalb** einer Überschrift übersteuert sichtbar die Vorlagen-Größe | Überschrift 1 erzeugen, einen Teilbereich des Überschriftentexts markieren, Größe `36` setzen | markierter Teilbereich hat `font-size: 36pt`; restlicher Überschriftentext ohne diesen Style (bleibt bei der impliziten Vorlagen-Größe, sichtbar an unverändertem `getComputedStyle`) |
| 2 | Formatvorlagen-Wechsel lässt zuvor gesetzten expliziten Mark unangetastet | Fortsetzung: Absatzformat des gesamten Absatzes von „Überschrift 1" auf „Standard" wechseln | der zuvor explizit auf `36pt` gesetzte Teilbereich behält `font-size: 36pt`, obwohl sich die implizite Größe des restlichen (jetzt „Standard"-)Texts geändert hat |

### 2.5 Ungültige Eingaben und Grenzfälle (Anforderung Testfälle 7–8, Grenzfälle 4.1–4.5, 4.8–4.9, 4.14–4.15)

| # | Testfall | Schritte | Assertion | Grenzfall |
|---|---|---|---|---|
| 1 | Nicht-numerischer Wert wird verworfen | Feld fokussieren, `.fill('abc')`, `Enter` | Feld zeigt wieder den vorherigen gültigen Wert; kein Absturz, kein `NaN` im DOM-Style | 4.1 |
| 2 | Leeres Feld bei Enter wird verworfen | Feld leeren, `Enter` | vorheriger Wert bleibt sicht-/wirksam | 4.1 |
| 3 | Eingabe `0` springt auf 1 pt | `.fill('0')`, `Enter` | Feld zeigt `1`, DOM-Style `font-size: 1pt` auf der Selektion, **nicht** `0pt` | 4.2 |
| 4 | Negativer Wert springt auf 1 pt | `.fill('-5')`, `Enter` | wie oben | 4.2 |
| 5 | Wert über 400 wird auf 400 gekappt | `.fill('5000')`, `Enter` | Feld zeigt `400`, DOM-Style `font-size: 400pt` | 4.3 |
| 6 | Deutsches Komma wird akzeptiert | `.fill('12,5')`, `Enter` | Feld zeigt `12,5`, DOM-Style `font-size: 12.5pt` | 4.5 |
| 7 | Anwenden auf Bild/leere Tabellenzelle ohne Text | Bild einfügen, Bild-Node selektieren (bzw. leere Zelle), Schriftgröße im Feld ändern | keine Exception im Browser (`page.on('pageerror')` bleibt leer), Bild/Zelle unverändert im DOM | 4.8 |
| 8 | Einfügen von extern kopiertem Text mit `font-size`-Style | Synthetisches `ClipboardEvent` mit `text/html`-Payload `<span style="font-size: 22px">Text</span>` per `page.evaluate` auf den Editor dispatchen | eingefügter Text hat `font-size` entsprechend 22 px → 16,5 pt (22 × 72⁄96) im Feld/DOM, **nicht** auf einen Zufallswert normalisiert | 4.9 |
| 9 | Wert außerhalb des Bereichs beim Einfügen wird geclamped | `ClipboardEvent`-Payload mit `style="font-size: 600pt"` | eingefügter Text zeigt `font-size: 400pt` (geclampt), kein Absturz | 4.3/4.9 kombiniert |
| 10 | Zwei schnelle Größenänderungen hintereinander sind deterministisch | Preset-Klick auf `24` unmittelbar gefolgt (ohne Warten auf Commit) von Freitext `18` + Enter | am Ende genau **ein** Wert (`18pt`) auf der Selektion, kein widersprüchlicher Zwischenzustand im Dokumentmodell | 4.14 |
| 11 | Sehr lange Selektion bleibt performant | Langes, mehrseitiges Dokument erzeugen (z. B. per wiederholtem `keyboard.type`/`page.evaluate`-Befüllung + abschließender echter Tastatureingabe), `ControlOrMeta+a`, neue Größe setzen | Anwendung erfolgt innerhalb eines definierten Zeitbudgets (z. B. `expect(...).toHaveAttribute(..., { timeout: 3000 })`), UI bleibt danach reaktionsfähig (z. B. weiterer Klick funktioniert) | 4.15 |

### 2.6 Rundreisen — vollständige Matrix aus Anforderung Abschnitt 5.1

Jedes Szenario prüft die **heruntergeladene Datei**
(`download.path()` → `fs.readFile` → `JSZip.loadAsync` → Ziel-XML-Datei aus
dem Zip lesen), nicht nur, dass der Editor nach Re-Import „irgendwie richtig
aussieht".

| # | Szenario | Ablauf | Assertion an heruntergeladener Datei |
|---|---|---|---|
| 1 | DOCX-Eigenrundreise | Neu erstellen → tippen → Teil markieren → Größe `18` setzen → Export → Re-Import (neue Seite/`setInputFiles` mit der gerade heruntergeladenen Datei) | Text bleibt exakt an dieser Stelle `18pt`; `word/document.xml` der Re-Export-Runde enthält `<w:sz w:val="36"/>` exakt für den erwarteten Lauf |
| 2 | ODT-Eigenrundreise | wie 1, aber ODT | `content.xml` enthält `fo:font-size="18pt"` am erwarteten Lauf |
| 3 | DOCX-Fremddatei „unverändert" (Testfall 12) | per JSZip gebaute `.docx` mit mehreren Läufen unterschiedlicher `w:sz`, u. a. Nicht-Preset (`w:val="26"` = 13 pt) und Halbpunkt (`w:val="17"` = 8,5 pt), analog zu `bug59058.docx`/`61470.docx` — hochladen → **ohne Änderung** sofort exportieren | exportiertes `word/document.xml`: jede der ursprünglichen Größen bleibt an ihrem ursprünglichen Lauf erhalten, exakt (kein Rundungsdrift, keine Vertauschung zwischen Läufen) |
| 4 | ODT-Fremddatei „unverändert" (Testfall 12) | analog, `.odt` mit mehreren `fo:font-size`-Werten inkl. Nicht-Preset (13 pt) — Muster `TestTextSelection.odt`-Stil `T10` | exportiertes `content.xml`: jede Größe erhalten, an ihrer ursprünglichen Textstelle |
| 5 | Kombination Größe + Fett + Farbe, DOCX (Testfall 13) | Text mit allen drei Eigenschaften erzeugen, Export → Re-Import | alle drei Eigenschaften am selben Lauf erhalten, `<w:sz .../>`, `<w:b/>`, `<w:color .../>` gemeinsam im XML |
| 6 | Kombination Größe + Fett + Farbe, ODT (Testfall 13) | analog | `fo:font-size`, `fo:font-weight="bold"`, `fo:color` gemeinsam im selben `style:style`-Eintrag |
| 7 | Größe in Überschrift übersteuert Vorlage, DOCX (Testfall 6, 2.4) | Überschrift 1 mit einem Teilbereich `36pt` erzeugen → Export → Re-Import | im XML: der Teilbereich hat eigenes `<w:rPr><w:sz w:val="72"/></w:rPr>`, der Rest der Überschrift referenziert weiterhin nur `heading 1`-Formatvorlage ohne eigenes `w:sz` |
| 8 | Größe in Überschrift übersteuert Vorlage, ODT (Testfall 6, 2.4) | analog | Teilbereich mit eigenem `text:span`-Stil (`fo:font-size="36pt"`), Rest referenziert weiterhin nur die `HeadingN`-Formatvorlage |
| 9 | Halbpunkt-Wert übersteht DOCX-Eigenrundreise (4.16) | Größe `10,5` setzen → Export → Re-Import → Feld zeigt weiterhin `10,5` | `<w:sz w:val="21"/>` im Export (21 Halbpunkte = 10,5 pt exakt) |
| 10 | Halbpunkt-Wert übersteht ODT-Eigenrundreise (4.16) | analog | `fo:font-size="10.5pt"` im Export |
| 11 | Unabhängige DOCX-Validierung | exportierte Datei laden, `word/document.xml` **per Regex/`DOMParser`, nicht per `readDocx`** prüfen | `<w:sz w:val="…"/>` vorhanden mit erwartetem Wert, kein widersprüchlicher zweiter `w:sz` am selben Lauf |
| 12 | Unabhängige ODT-Validierung | analog | `fo:font-size="…pt"` per Regex/`DOMParser` bestätigt |

Ergänzend (nachrichtlich, nicht blockierend laut Anforderung 5.1 letzte
Zeile): Cross-Format-Export DOCX → ODT sobald `speichern-unter-format`
verfügbar ist — bis dahin `test.skip(...)` mit Kommentar, kein
stillschweigendes Fehlen.

### 2.7 Mindestabdeckung der Testdatei(en) (Anforderung 5.2)

Mindestens eine Testdatei je Format in Abschnitt 2.6 muss zusätzlich zur
dortigen Mindestabdeckung folgende Fälle **in derselben Datei** kombinieren
(nicht über mehrere kleine Dateien verteilt, damit ein einzelner Test die
volle Breite gleichzeitig beweist):

- Mindestens drei unterschiedliche, nicht dem App-Standard (11 pt)
  entsprechende Schriftgrößen im selben Dokument (z. B. 9, 14, 24 pt).
- Mindestens ein Halbpunkt-Wert (z. B. 10,5 pt).
- Mindestens ein Wert außerhalb der Preset-Dropdown-Liste (z. B. 13 pt).
- Mindestens eine Überschrift mit einem Textlauf, der eine von der
  Vorlagen-Größe abweichende, explizite Größe trägt.

Da `schriftgroesse-waehlen-code.md` Abschnitt 7 für den letzten Punkt
**keine** passende reale Fixture im vorhandenen Korpus findet, wird dieser
Fall über eine **handgebaute** Test-XML abgedeckt (analog `buildSampleDocx`/
`buildSampleOdt`), nicht über einen Korpus-Fund — dies ist hier bewusst
vermerkt, damit die Mindestabdeckung nicht stillschweigend an diesem einen
Punkt lückenhaft bleibt.

### 2.8 Undo/Redo (Anforderung Testfall 9, Grenzfall 4.10)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Ein Strg+Z macht genau die Größenänderung rückgängig | Text tippen → markieren → Größe `24` setzen → `keyboard.press('ControlOrMeta+z')` | kein `font-size: 24pt` mehr im DOM, getippter Text bleibt vollständig erhalten (Strg+Z hat **nicht** das Tippen mit rückgängig gemacht) |
| 2 | Redo stellt die Größe wieder her | Fortsetzung: `keyboard.press('ControlOrMeta+y')` (bzw. `ControlOrMeta+Shift+z`) | `font-size: 24pt` wieder vorhanden |
| 3 | Größenänderung über Toolbar zählt als ein Undo-Schritt, auch bei mehreren Selektionsbereichen (Tabellenzellen) | Zwei Zellen selektieren, Größe setzen, ein `Strg+Z` | beide Zellen verlieren die neue Größe gemeinsam in einem Schritt, nicht nacheinander in zwei Schritten |

### 2.9 Selektions-Sync-Regression mit Schriftgröße (Grenzfall 4.11, Pflicht)

**Erweiterung der bestehenden Datei** `tests/e2e/selection-regression.spec.ts`
(nicht neue, separate Datei — analog zur bereits vorhandenen Kursiv-Variante
in diesem Repo). Exakt dasselbe Testmuster wie die bestehenden
Fett-/Kursiv-Varianten, aber mit dem Schriftgrößenfeld statt `getByTitle('Fett')`:

```ts
test('same regression with font-size instead of bold (Grenzfall 4.11)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByLabel('Schriftgröße').fill('24')
  await page.getByLabel('Schriftgröße').press('Enter')
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
})
```

Assertion identisch zum Vorbild: beide Absätze bleiben vollständig erhalten,
keine gelöschten/ersetzten Inhalte, `<p>`-Anzahl stimmt — keine versehentliche
Löschung/Ersetzung des Dokumentinhalts durch die Größenänderungs-Aktion.

### 2.10 WYSIWYG-Check / offene Frage 3.4 (Testfall 16)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | In-App-Darstellung ohne jede Interaktion mit dem Schriftgrößenfeld entspricht dem definierten App-Standard | Neues Dokument, Text tippen, **ohne** das Schriftgrößenfeld je zu berühren | `getComputedStyle(paragraph).fontSize` ergibt `"14.6667px"` (11 pt bei 96 dpi, exakt gerechnet: 11 × 96 ⁄ 72), konsistent für DOCX- **und** ODT-Karte |
| 2 | Export ohne Interaktion enthält denselben Standard, aber **keinen** expliziten Mark am Text | Fortsetzung: exportieren | DOCX: `word/styles.xml`/`document.xml` enthält `<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/>…`, aber der getippte Textlauf selbst hat **kein** eigenes `<w:sz>`; ODT: `styles.xml`/`content.xml`, `Standard`-Stil hat `fo:font-size="11pt"`, referenzierender Text hat **keinen** eigenen `text:span` mit `fo:font-size` |
| 3 | Sobald das Schriftgrößenfeld einmal benutzt wurde, hat **nur** der betroffene Text einen expliziten Mark | Auf einen Teilbereich Größe `18` anwenden | nur dieser Teilbereich hat `font-size: 18pt` im DOM/Export; unberührter Text bleibt beim reinen CSS-/Vorlagen-Standard ohne Mark |

Deckt die in Anforderung Abschnitt 3.4 dokumentierte, laut
`schriftgroesse-waehlen-code.md` Abschnitt 3.3 mit **11 pt** beantwortete
offene Frage messtechnisch ab. Schlägt dieser Test fehl (z. B. weil CSS und
Export-Default auseinanderlaufen), ist das ein Befund gegen Abnahmekriterium
Anforderung Abschnitt 9, Punkt 4 — kein optionaler Zusatztest.

---

## 3. Zuordnung Anforderung → Test (Abnahme-Mapping)

| Anforderungs-Abschnitt / Grenzfall | Testebene(n) | Datei(en) |
|---|---|---|
| Abschnitt 1 (Bedienelemente, Element 1–5) | E2E | `font-size.spec.ts` §2.0/2.1 |
| 2.1 (Anwenden auf Selektion) | E2E | `font-size.spec.ts` §2.1 #2–4 |
| 2.2 (Anwenden ohne Selektion, Stored-Mark) | E2E | `font-size.spec.ts` §2.2 |
| 2.3 (Anzeige bei uneinheitlicher Selektion) | E2E | `font-size.spec.ts` §2.3 |
| 2.4 (Formatvorlagen-Zusammenspiel) | E2E | `font-size.spec.ts` §2.4 |
| 2.5 (Werte/Einheit/Rundung) | Unit + E2E | `fontSize.test.ts` (shared) #1, `font-size.spec.ts` §2.1 #4, §2.5 |
| 3.4 (offene Standardgrößen-Frage) | E2E | `font-size.spec.ts` §2.10 |
| 4.1 (nicht-numerisch) | Unit + E2E | `fontSize.test.ts` (shared) #6, `font-size.spec.ts` §2.5 #1–2 |
| 4.2 (0/negativ) | Unit + E2E | `fontSize.test.ts` (shared) #2, `font-size.spec.ts` §2.5 #3–4 |
| 4.3 (>400 pt) | Unit + E2E | `fontSize.test.ts` (shared) #3, `font-size.spec.ts` §2.5 #5 |
| 4.4 (Rundung 0,5 pt) | Unit + E2E | `fontSize.test.ts` (shared) #1/#4, `font-size.spec.ts` §2.1 #4 |
| 4.5 (deutsches Komma) | Unit + E2E | `fontSize.test.ts` (shared) #5, `font-size.spec.ts` §2.5 #6 |
| 4.6 (Tabellen-Mehrfachselektion) | E2E | `font-size.spec.ts` §2.3 #3 |
| 4.7 (Überschrift + Fließtext gemischt) | E2E | `font-size.spec.ts` §2.3 #4, §2.4 |
| 4.8 (Bild/leere Zelle) | E2E | `font-size.spec.ts` §2.5 #7 |
| 4.9 (Paste mit `font-size`) | E2E | `font-size.spec.ts` §2.5 #8–9 |
| 4.10 (Undo/Redo) | E2E | `font-size.spec.ts` §2.8 |
| 4.11 (Selection-Sync-Regression) | E2E | `selection-regression.spec.ts` (erweitert) |
| 4.12 (Nicht-Preset-Fremdwert) | Unit + E2E | `docx/__tests__/fontSize.test.ts` #2/#7, `odt/__tests__/fontSize.test.ts` #2/#6, `font-size.spec.ts` §2.6 #3–4 |
| 4.13 (Kopf-/Fußzeile) | nachrichtlich, kein Test jetzt | — (Anforderung selbst: kein Blocker) |
| 4.14 (Race Condition) | E2E | `font-size.spec.ts` §2.5 #10 |
| 4.15 (Performance, langes Dokument) | E2E | `font-size.spec.ts` §2.5 #11 |
| 4.16 (Cross-Format Halbpunkt) | Unit + E2E | `roundtrip.test.ts` (beide Formate) #3, `font-size.spec.ts` §2.6 #9–10 |
| Abschnitt 5.1 (vollständige Rundreise-Matrix) | Unit + E2E | `roundtrip.test.ts` (beide Formate) §1.4, `font-size.spec.ts` §2.6 |
| Abschnitt 5.2 (Mindestabdeckung Testdateien) | E2E | `font-size.spec.ts` §2.7 |
| Testfälle 1–16 (Anforderung Abschnitt 8) | Unit + E2E | siehe jeweilige Zeile oben; Testfall-Nummern sind 1:1 in §2.1–2.10 referenziert |
| Plan-Fund 1 (ODT-Dedup-Key-Ordnung) | Unit | `roundtrip.test.ts` (ODT) §1.5 |
| Plan-Fund 2 (`NaN` nicht schema-seitig abgefangen) | Unit | `docx/__tests__/fontSize.test.ts` #5, `fontSize.test.ts` (shared) #6 |
| Plan-Fund 3 (ODT Absatzformat-Ebene, vorbestehender Gap) | Unit (Beleg, kein Fail erwartet) | `odt/__tests__/fontSize.test.ts` #8 |
| Plan Abschnitt 3.2 (Reader rundet, clampt aber nicht) | Unit | `docx/__tests__/fontSize.test.ts` #7 |

---

## 4. Abnahme-Checkliste (vor Statuswechsel „verifiziert")

- [ ] `npm test` grün, inkl. aller neuen Dateien aus Abschnitt 1 (`fontSize.test.ts`
      in `shared/editor/__tests__`, `docx/__tests__`, `odt/__tests__`, sowie
      erweiterte `roundtrip.test.ts` in beiden Formaten).
- [ ] `npm run test:e2e` grün, inkl. `font-size.spec.ts` und der Erweiterung
      von `selection-regression.spec.ts`.
- [ ] Jeder Testfall aus Anforderung Abschnitt 8 (1–16) und jeder Grenzfall
      aus Abschnitt 4 (4.1–4.16, mit Ausnahme von 4.13, laut Anforderung
      selbst nachrichtlich) hat mindestens einen grünen, dauerhaft in der
      Suite verbleibenden Test.
- [ ] Die vollständige Rundreise-Matrix aus Anforderung Abschnitt 5.1 ist für
      DOCX **und** ODT grün, inklusive der beiden unabhängigen
      XML-Validierungen (Abschnitt 2.6 #11–12 dieses Plans).
- [ ] Die Mindestabdeckung aus Anforderung Abschnitt 5.2 ist in mindestens
      einer Testdatei je Format tatsächlich erfüllt (nicht nur behauptet) —
      per Review der in Abschnitt 2.7 referenzierten Test-Fixtures bestätigt.
- [ ] Die offene Frage aus Anforderung Abschnitt 3.4 ist beantwortet (11 pt,
      siehe `schriftgroesse-waehlen-code.md` Abschnitt 3.3) und der
      WYSIWYG-Beleg dafür (Abschnitt 2.10 dieses Plans) ist grün.
- [ ] Manuelle Einmalvalidierung einer exportierten Test-Datei mit mehreren
      unterschiedlichen Schriftgrößen (inkl. 13 pt und 10,5 pt) gegen Word/
      LibreOffice durchgeführt und in dieser Datei oder einer Folgedatei
      vermerkt (Abschnitt 1.6).
- [ ] Kein Test in `font-size.spec.ts` bzw. der Erweiterung von
      `selection-regression.spec.ts` ruft `readDocx`/`writeDocx`/`readOdt`/
      `writeOdt`/`setFontSize`/`clearFontSize`/`getFontSizeAtSelection` direkt
      auf — stichprobenartig per Review bestätigt.
- [ ] Für jeden in `schriftgroesse-waehlen-code.md` Abschnitt 2 dokumentierten
      Zusatzfund (ODT-Dedup-Key-Ordnung, `NaN`-Schutz außerhalb des Schemas,
      ODT-Absatzformat-Ebene-Gap) liegt entweder ein Fix mit grünem
      Regressionstest vor, oder das Verhalten ist bewusst als bekannte,
      vorbestehende Einschränkung dokumentiert (kein stiller Fehlschlag,
      analog `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4).
- [ ] Grenzfall 4.13 (Kopf-/Fußzeile) bleibt als offener, nachrichtlicher
      Punkt sichtbar vermerkt (kein stillschweigendes Fehlen), bis
      `kopfzeile-bearbeiten`/`fusszeile-bearbeiten` existieren.
