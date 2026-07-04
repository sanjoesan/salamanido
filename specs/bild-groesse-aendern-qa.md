# Testplan „Bildgröße ändern" — QA-Verifikation

Gegenstück zu `specs/bild-groesse-aendern-req.md` (Anforderung) und
`specs/bild-groesse-aendern-code.md` (Umsetzungsplan). Dieses Dokument legt
fest, **welche Tests** geschrieben werden, **wo** sie liegen, **wie** sie
ausgeführt werden und **wann** ein Punkt als abgehakt gilt. Stil/Aufbau
orientiert sich an `specs/schriftgroesse-waehlen-qa.md` (bislang einziges
vorhandenes `*-qa.md` für einen kompletten Neubau statt einer reinen
Verifikation vorhandener Funktionalität).

Wie bei `fontSize` ist auch `bild-groesse-aendern` laut Anforderung Abschnitt
6/8 und Plan Abschnitt 0 ein **vollständiger UI-Neubau** (Panel, Ziehpunkte,
Commands, NodeView) **plus** die Behebung eines unabhängig davon bestehenden
**Datenverlust-Bugs** in beiden Readern (Anforderung Abschnitt 6.3). Dieser
Testplan ist deshalb gleichzeitig Abnahmekriterium für die Implementierung
(Anforderung Abschnitt 8) — jeder hier definierte Test muss gegen den in
`bild-groesse-aendern-code.md` beschriebenen, tatsächlich gebauten Code grün
sein, bevor der Backlog-Status von „fehlt" auf „vorhanden (verifiziert)"
wechseln darf. Besonders wichtig: **der Reader-Bugfix ohne die neue UI wäre
für sich allein wertlos** und umgekehrt — beide müssen gemeinsam nachgewiesen
werden (Abnahme Abschnitt 8, Punkt 2 der Anforderung).

Zwei Ebenen, die sich ergänzen, aber **keine ersetzen darf**:

1. **Unit-Tests** (Vitest) für die Reader/Writer-Rundreise auf Daten-/
   XML-Ebene sowie für die reinen Umrechnungs-/Clamping-Utilities — schnell,
   präzise, deterministisch, aber blind gegenüber Toolbar, Panel, Ziehpunkten,
   echtem Datei-Dialog und tatsächlicher Bildschirmdarstellung.
2. **Echte Playwright-Browser-Tests** — echter `setInputFiles()`-Upload eines
   Bildes **und** eines Dokuments, echter Klick auf das eingefügte Bild zur
   Selektion, echtes Ziehen der Resize-Handles per `page.mouse.down/move/up`
   (bzw. `dispatchEvent('pointerdown'/'pointermove'/'pointerup')`, siehe
   Abschnitt 2.0), echte Tastatureingabe in den Größenfeldern, echter
   `page.waitForEvent('download')`-Export, Prüfung der **tatsächlich
   heruntergeladenen Datei** per unabhängigem XML-Parsing (nicht nur ein
   interner Aufruf von `readDocx`/`readOdt`/`writeDocx`/`writeOdt`/
   `setImageSize`/`insertImage`).

Ein Test, der nur `readDocx(buffer)`/`setImageSize(state)` direkt aufruft,
zählt **nicht** als Ebene 2, auch wenn er in `tests/e2e/` liegt — Grundregel
identisch zu `schriftgroesse-waehlen-qa.md` Abschnitt 2.

Referenzierte Fixtures (siehe `bild-groesse-aendern-code.md` Abschnitt 7,
Fixture-Inventar — durch tatsächliches Entpacken verifiziert, nicht vermutet):
`tests/fixtures/external/docx/VariousPictures.docx` (5 `wp:extent`-Werte, u. a.
exakt 130×92 px und 192×176 px), `tests/fixtures/external/odt/Seasonal_Fruits2_en.odt`
(5 `draw:frame`/`draw:image`-Paare, `svg:width`/`svg:height` in cm), sowie
`tests/fixtures/external/docx/WithGIF.docx` (ein quadratisches Bild, ergänzend
für einen einfachen Seitenverhältnis-Test).

---

## 0. Ausführung

| Ebene | Befehl | Neue/geänderte Dateien |
|---|---|---|
| Unit | `npm test` (`vitest run`) | siehe Abschnitt 1 |
| Browser/E2E | `npm run test:e2e` (`playwright test`) | siehe Abschnitt 2 |

Beide Suiten müssen grün sein, bevor „Bildgröße ändern" laut Anforderung
Abschnitt 8 als „vollständig verifiziert" gilt. Reihenfolge der Umsetzung:
zuerst der Neubau aus `bild-groesse-aendern-code.md` Abschnitt 3/4 (Schema,
`imageSize.ts`, Commands, NodeView, Panel, Reader-Fix, Writer-Einheit), dann
Unit-Tests, dann E2E-Tests, dann gemeinsamer Lauf beider Suiten gegen den
fertigen Code.

**Reihenfolge-Warnung, spezifisch für dieses Feature:** Anders als bei den
meisten anderen `*-qa.md`-Gegenstücken in diesem Repo ist hier eine
**Zwischen-Rot-Phase Pflicht, kein Zufall**: Testfall 12/13 (Abschnitt 1.3
dieses Plans) müssen **vor** dem Reader-Fix aus `bild-groesse-aendern-code.md`
Abschnitt 3.10/3.11 nachweislich **rot** sein (Bild kommt mit 300×200 px bzw.
6×4 cm statt der echten Größe zurück) und **erst danach** grün — sonst ist
nicht auszuschließen, dass der neue Test versehentlich denselben blinden Fleck
hat wie der bereits vorhandene, irreführende Test in
`docx/__tests__/roundtrip.test.ts:253` (siehe Anforderung Abschnitt 6.3,
letzter Satz).

---

## 1. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

Ziel: jede Rundreise-Behauptung aus Anforderung Abschnitt 5 sowie jeden
Reader-/Utility-Grenzfall aus Abschnitt 4 auf Daten-/XML-Ebene isoliert,
deterministisch und ohne Browser nachweisen — insbesondere den zentralen
Datenverlust-Bug aus Abschnitt 6.3, der unabhängig von jeder UI besteht.
Direkter Aufruf von `readDocx`, `writeDocx`, `readOdt`, `writeOdt`,
`emuToPx`/`pxToEmu`, `parseOdtLengthToPx`, `computeInsertSize`,
`clampImageWidthPx`/`clampImageHeightPx` ist auf dieser Ebene ausdrücklich
erlaubt und richtig — sie wird durch die Playwright-Ebene (Abschnitt 2)
ergänzt, nicht ersetzt.

### 1.1 Neu: `src/formats/shared/__tests__/imageSize.test.ts`

Reine Utility-Funktionstests (kein DOM/Editor/ProseMirror-State nötig), gegen
`src/formats/shared/imageSize.ts` (Plan Abschnitt 3.1).

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | Clamping nach unten (0/negativ → Mindestwert) | `clampImageWidthPx(0)`, `clampImageWidthPx(-5)` | `1` in beiden Fällen | Grenzfall 4.2 |
| 2 | Clamping nach oben (extrem groß, z. B. 50000 px) | `clampImageWidthPx(50000)` | `≤ IMAGE_SIZE_MAX_WIDTH_PX`, sichtbar kleiner als 50000 | Grenzfall 4.2 |
| 3 | Höhen-Clamping analog zur Breite | `clampImageHeightPx(0)`, `clampImageHeightPx(-1)`, `clampImageHeightPx(999999)` | `1` bzw. `≤ IMAGE_SIZE_MAX_HEIGHT_PX` | Grenzfall 4.2 (Höhen-Achse, nicht nur Breite) |
| 4 | px↔EMU Rundreise ohne Drift bei „glatten" Werten | `emuToPx(pxToEmu(500))`, `emuToPx(pxToEmu(300))` | exakt `500`, `300` | Anforderung 2.6, Grenzfall 4.11 |
| 5 | px↔cm Rundreise innerhalb Sub-Pixel-Toleranz | `Math.round(cmToPx(pxToCm(400)))` | `400` (±1 höchstens) | Anforderung 2.6, Grenzfall 4.11 |
| 6 | Deutsches Komma als Dezimaltrennzeichen | `parseSizeInputCm('12,5')` | `12.5` | Anforderung 2.6 |
| 7 | Nicht-numerische/leere/0/negative Eingabe liefert `null`, wirft nicht | `parseSizeInputCm('abc')`, `('')`, `('0')`, `('-5')`, `('12cm')` | `null` in jedem Fall | Grenzfall 4.1 — insbesondere `'12cm'`, um einen stillen Einheiten-Fallthrough auszuschließen |
| 8 | `parseOdtLengthToPx` deckt `cm`/`mm`/`in`/`px`/`pt` ab | `'12cm'`, `'120mm'`, `'5in'`, `'300px'`, `'72pt'` | jeweils korrekt in px umgerechnet (96 dpi) | Anforderung Abschnitt 3, Punkt 5 |
| 9 | `parseOdtLengthToPx` bei fehlendem/unbekanntem Suffix/`null` | `parseOdtLengthToPx(null)`, `('abc')`, `('12')` (ohne Einheit) | `null`, kein Absturz | Robustheit gegen Fremddatei |
| 10 | `computeInsertSize` skaliert nicht hoch (kleines Icon) | `computeInsertSize(16, 16, 606)` | `{ width: 16, height: 16 }` | Grenzfall 4.14 |
| 11 | `computeInsertSize` skaliert proportional herunter (großes Foto) | `computeInsertSize(4000, 3000, 606)` | `width: 606`, `height` seitenverhältnistreu gerundet | Anforderung 2.4 |
| 12 | `computeInsertSize` bei exakt passender Breite ändert nichts | `computeInsertSize(606, 400, 606)` | `{ width: 606, height: 400 }`, keine Rundungsabweichung durch unnötige Skalierung | Anforderung 2.4 |

### 1.2 Neu: `src/formats/docx/__tests__/imageSize.test.ts`

Reader-Robustheit gegen `wp:extent`-Grenzfälle in Fremddateien, je über eine
minimal per JSZip gebaute `.docx`-Datei mit `<w:drawing>` (Muster
`buildDocxWithDrawing(extentXml)`, analog zu `buildSampleDocx()` in
`tests/e2e/docx.spec.ts`) und `readDocx(blob)`.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | `wp:extent` vorhanden, EMU→px korrekt umgerechnet (Kernregressionstest für Abschnitt 6.3 der Anforderung) | `<wp:extent cx="4762500" cy="2857500"/>` (= 500×300 px bei 96 dpi) | `image`-Node hat `attrs.width === 500`, `attrs.height === 300` — **nicht** `300`/`200` | Anforderung Abschnitt 6.3, Testfall 12 |
| 2 | `wp:extent` fehlt (nicht standardkonforme Fremddatei) | kein `<wp:extent>` im `<wp:inline>` | `attrs.width`/`attrs.height` bleiben `undefined`/`null`, **kein Absturz** | Anforderung Abschnitt 3, Punkt 3 |
| 3 | `wp:extent` mit nicht-numerischem/leerem `cx`/`cy` | `<wp:extent cx="" cy="abc"/>` | `attrs.width`/`attrs.height` bleiben `null`, kein `NaN` im Modell | Robustheit, analog Grenzfall 4.1 |
| 4 | `naturalWidth`/`naturalHeight` werden beim Import auf denselben Wert wie `width`/`height` gesetzt | `wp:extent` entsprechend 500×300 px | `attrs.naturalWidth === 500`, `attrs.naturalHeight === 300` | Anforderung 2.5, offene Frage 3 (Plan Abschnitt 3.3) |
| 5 | Nicht-3:2-Bild wird **nicht** auf den 300×200-Default vereinheitlicht | `wp:extent` entsprechend 130×92 px (Wert aus `VariousPictures.docx`, siehe Fixture-Inventar) | `attrs.width === 130`, `attrs.height === 92` | Bewusst „weit weg" vom alten Default gewählt, damit ein stiller Rückfall sofort auffiele |

### 1.3 Neu: `src/formats/odt/__tests__/imageSize.test.ts`

Analog für ODT, über `buildOdtWithFrame(frameXml)` und `readOdt(blob)`, **plus**
gezielte Assertions gegen die reale Fixture.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | `svg:width`/`svg:height` in `cm` korrekt gelesen (Kernregressionstest) | `svg:width="12cm" svg:height="8cm"` | `attrs.width`/`attrs.height` entsprechen (nach px-Umrechnung) 12×8 cm — **nicht** dem 6×4-cm-Default | Anforderung 5.2.1, Testfall 13 |
| 2 | `mm`/`in`/`pt`-Einheiten werden ebenfalls korrekt gelesen | `svg:width="120mm" svg:height="2in"` | korrekt in px umgerechnet | Anforderung Abschnitt 3, Punkt 5 |
| 3 | `svg:width`/`svg:height` fehlen am `draw:frame` | kein Attribut | `width`/`height` bleiben `null`, kein Absturz | Anforderung Abschnitt 3, Punkt 3 (ODT-Äquivalent) |
| 4 | `naturalWidth`/`naturalHeight` beim Import gleich `width`/`height` | `svg:width="12cm" svg:height="8cm"` | `naturalWidth`/`naturalHeight` entsprechen 12×8 cm in px | Anforderung 2.5 |
| 5 | Reale Fixture `Seasonal_Fruits2_en.odt`: 5 Bilder mit 5 **individuellen** Größen, keines auf denselben Default vereinheitlicht (Grenzfall 4.13) | Datei einlesen | genau 5 `image`-Nodes, alle 5 Wertepaare `width`/`height` paarweise unterschiedlich (aus Fixture-Inventar: ≈192×41, ≈309×206, ≈573×173, ≈206×151, ≈165×172) | Anforderung Grenzfall 4.13, Testfall 17 |

### 1.4 Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts`

Der bestehende, laut Anforderung Abschnitt 6.3/Plan Abschnitt 2 als „False
Confidence"-Test identifizierte Bild-Test (Zeile 253-259: setzt `width:100,
height:80` im Eingabe-Objekt, prüft aber nur `type`/`src`) bekommt echte
Größen-Assertions **ergänzt** (nicht ersetzt, damit die bisherigen Prüfungen
erhalten bleiben):

| # | Testfall | Erwartung | Deckt |
|---|---|---|---|
| 1 | Bestehender Test + neue Zeilen `expect(image.attrs.width).toBe(100)` / `.toBe(80)` | Bild-Node nach Rundreise hat exakt `width: 100, height: 80` | Anforderung Abschnitt 8, Punkt 7 (irreführenden Test korrigieren) |
| 2 | **Neu:** Bild mit vom Default (300×200) abweichender, nicht-3:2-Größe übersteht reine Rundreise ohne jede Bearbeitung | `attrs: { width: 500, height: 300 }` rein, Rundreise, danach `width: 500, height: 300` | Anforderung Abschnitt 6.3 zentraler Befund, Testfall 12 |
| 3 | **Neu:** Zwei Bilder mit identischem `src`, unterschiedlicher Größe bleiben unabhängig erhalten | `{src: X, width:100,height:80}`, `{src: X, width:300,height:240}` im selben Dokument | nach Rundreise: erstes Bild weiterhin `100×80`, zweites weiterhin `300×240`, **eine** eingebettete Mediendatei | Grenzfall 4.8, Testfall 19 |

### 1.5 Erweiterung: `src/formats/odt/__tests__/roundtrip.test.ts`

Analog — der bestehende Test (Zeile 213-221) setzt `width`/`height` im
Eingabe-Objekt bislang nicht einmal:

| # | Testfall | Erwartung | Deckt |
|---|---|---|---|
| 1 | Bestehender Test + `width`/`height` im Eingabe-Objekt ergänzt + neue Assertions | Bild-Node nach Rundreise hat die eingegebene Größe (innerhalb Sub-Pixel-Toleranz durch px→cm→px) | Anforderung Abschnitt 8, Punkt 7 |
| 2 | **Neu:** px→cm→px-Rundreise bleibt innerhalb Sub-Pixel-Toleranz, kein sichtbarer Größenverlust | `width: 400, height: 300` → Export → Reimport | `Math.abs(width - 400) <= 1`, `Math.abs(height - 300) <= 1` | Anforderung 2.6, Grenzfall 4.11, Testfall 13 |
| 3 | **Neu:** dieselbe Rundreise **zwei Mal hintereinander** zeigt **keinen kumulativen** Drift | Export → Reimport → Export → Reimport, Ausgangswert `400×300` | Ergebnis nach zwei Zyklen weiterhin `400×300` ±1 px, **nicht** sichtbar kleiner als nach dem ersten Zyklus | Grenzfall 4.11 — ausdrücklich der Unterschied zwischen „einmalig tolerierbar" und „kumulativ nicht tolerierbar" |

### 1.6 Cross-Format-Rundreise auf Daten-Ebene (ergänzt die E2E-Matrix, ersetzt sie nicht)

Neuer `describe`-Block, sinnvollerweise in einer neuen Datei
`src/formats/shared/__tests__/imageSize-crossformat.test.ts`, die beide
Reader/Writer importiert (kein Zugriff auf Playwright/Browser nötig, da beide
Formate reine Funktionen sind):

| # | Testfall | Ablauf | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | DOCX → ODT | `image`-Node mit `width:500,height:300` → `writeOdt` → `readOdt` | Ergebnis `width`/`height` ±1 px von 500×300 | Anforderung 5.1.6 |
| 2 | ODT → DOCX | `image`-Node mit `width:500,height:300` → `writeDocx` → `readDocx` | Ergebnis `width`/`height` ±1 px von 500×300 | Anforderung 5.2.6 |
| 3 | Doppel-Rundreise DOCX→ODT→DOCX ohne kumulativen Drift | zwei Konvertierungszyklen hintereinander | Endergebnis weiterhin ±1 px von 500×300, nicht schrittweise kleiner werdend | Anforderung 5.3.1, Grenzfall 4.11 |
| 4 | Doppel-Rundreise ODT→DOCX→ODT ohne kumulativen Drift | analog | wie oben | Anforderung 5.3.2 |

### 1.7 Validierung gegen unabhängigen Parser

Da dieses Repo keine Python-Toolchain besitzt, erfolgt die unabhängige
Validierung zweistufig (analog `schriftgroesse-waehlen-qa.md` Abschnitt 1.6,
`kursiv-qa.md` Abschnitt 1.5):

1. **Automatisiert, Teil der E2E-Suite:** Prüfung des exportierten
   `word/document.xml`/`content.xml` per Regex/`DOMParser`, **ohne** den
   eigenen `readDocx`/`readOdt` zu benutzen — umgesetzt in Abschnitt 2.5
   dieses Plans.
2. **Manuell, einmalig vor Statuswechsel auf „verifiziert":** eine exportierte
   Test-DOCX/-ODT mit mehreren unterschiedlich großen Bildern (inkl. einer
   nicht seitenverhältnistreu über einen Seitengriff verzerrten Größe)
   außerhalb dieses Repos in Word bzw. LibreOffice öffnen, Bildgröße per
   Rechtsklick → Größe/Position ablesen, Übereinstimmung in dieser Datei oder
   einer Folgedatei vermerken. Kein Bestandteil der automatisierten
   CI-Suite, aber Pflicht-Checkliste-Punkt vor Abnahme (siehe Abschnitt 4),
   direkt relevant für die in Grenzfall 4.10 offene ODF-`px`-Suffix-Frage.

---

## 2. Echte Playwright-Browser-Tests

**Grundregel dieser Ebene:** Jeder Test bedient die Anwendung ausschließlich
so, wie eine Person es täte — echtes Hochladen einer Bilddatei über
`input[type=file]`/`setInputFiles`, echter Klick auf das eingefügte `<img>`
zur Selektion, echte Größenfeld-Eingabe über `page.getByLabel(...)`/
`.fill()`/`.press('Enter')`, echtes Ziehen der Resize-Handles über
Maus-/Pointer-Events, `page.waitForEvent('download')` + Lesen der
heruntergeladenen Datei vom Datenträger für Exporte. **Kein Test in diesem
Abschnitt darf** `readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`setImageSize`/
`insertImage`/`resetImageToNaturalSize` direkt importieren oder aufrufen —
das wäre Ebene 1, nicht Ebene 2. Wo ein Dokument hochgeladen werden muss, wird
es unabhängig vom Reader/Writer dieses Projekts per JSZip von Hand gebaut
(Muster `buildSampleDocx()`/`buildSampleOdt()` aus `tests/e2e/docx.spec.ts`/
`odt.spec.ts`), wo ein **Bild** hochgeladen werden muss, wird eine winzige,
echte PNG-Bilddatei (z. B. 1×1 oder 4×3 px Test-PNG als `Buffer`, nicht als
Data-URL-String) über `setInputFiles` eingespielt — das stellt sicher, dass
ein Rundreisen-Test nicht zufällig nur beweist, dass Writer und Reader dieses
Projekts sich gegenseitig kompensieren.

### 2.0 Neue Datei: `tests/e2e/image-resize.spec.ts`

Struktur/Locator-Helfer identisch zu den bestehenden Dateien:

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'
import fs from 'node:fs/promises'

function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

/** Winzige, echte 4x3-px-PNG-Testdatei — unabhängig von jeder Data-URL im Editor selbst. */
const TEST_PNG_4X3 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAYAAABWKLW/AAAAEklEQVQI12P8z8BQz0AEYBxVSAAAX8gBme3EQwUAAAAASUVORK5CYII=',
  'base64',
)

async function insertTestImage(page: import('@playwright/test').Page) {
  await page.locator('.ProseMirror').click()
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /🖼\s*Bild/ }).click()
  const chooser = await fileChooserPromise
  await chooser.setFiles({ name: 'test.png', mimeType: 'image/png', buffer: TEST_PNG_4X3 })
  return page.locator('.ProseMirror img')
}

async function dragHandle(
  page: import('@playwright/test').Page,
  handleSelector: string,
  dx: number,
  dy: number,
  steps = 5,
) {
  const handle = page.locator(handleSelector)
  const box = (await handle.boundingBox())!
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(startX + (dx * i) / steps, startY + (dy * i) / steps)
  }
  await page.mouse.up()
}
```

**Wichtiger Hinweis zum Dateiauswahl-Flow:** Der bestehende
„🖼 Bild"-Button in `Toolbar.tsx` löst ein natives `<input type="file">` per
Klick aus (kein eigener Dialog) — der korrekte Playwright-Weg ist entweder
`page.waitForEvent('filechooser')` **oder** direktes `setInputFiles` auf dem
`input[type=file]`-Locator, analog zum bereits etablierten Muster in
`docx.spec.ts`/`odt.spec.ts` für Dokument-Uploads. Vor dem ersten Testlauf
**verifizieren**, welcher der beiden Wege für den Bild-Input tatsächlich
zuverlässig funktioniert (der `input`-Locator ist ggf. `hidden`, dann ist
`setInputFiles` direkt auf dem Locator der robustere Weg, ohne auf einen
`filechooser`-Event angewiesen zu sein) — **kein** Blocker für den Testplan
selbst, aber vor der ersten Implementierung dieser Datei festzulegen und hier
nachzutragen.

`beforeEach`: `page.goto('/')` → Privacy-Banner „Verstanden" wegklicken →
je nach Testfall `docxCard`/`odtCard` „Neu erstellen" klicken (analog zu
`selection-regression.spec.ts`).

### 2.1 Panel-Sichtbarkeit und Grundinteraktion (Testfälle 1-3, Element 1-3)

| # | Testfall | Schritte (echte Bedienung) | Assertion |
|---|---|---|---|
| 1 | Panel erscheint erst nach Klick auf ein Bild | Bild einfügen (`insertTestImage`), **ohne** es anzuklicken prüfen, dann Bild anklicken | `page.getByLabel('Bildbreite in Zentimetern')` zunächst nicht sichtbar/nicht vorhanden, nach Klick auf `img` sichtbar |
| 2 | Klick daneben lässt Panel wieder verschwinden | Fortsetzung: Bild ist selektiert, dann in normalen Fließtext danach klicken | Breitenfeld nicht mehr sichtbar |
| 3 | Klick auf ein zweites, anderes Bild wechselt das Panel auf dessen Werte | Zwei unterschiedlich große Bilder einfügen, beide nacheinander anklicken | angezeigte Breite/Höhe ändert sich passend zum jeweils selektierten Bild |
| 4 | Breitenfeld ändern + Enter ändert bei aktivem Lock auch die Höhe proportional (Testfall 2) | Bild einfügen/selektieren, `page.getByLabel('Bildbreite in Zentimetern').fill('10')` → `Enter` | `img`-Element hat danach `style.width` entsprechend 10 cm (px), `style.height` proportional zum ursprünglichen Seitenverhältnis mitgeändert |
| 5 | Lock deaktivieren, nur Breite ändern → Höhe bleibt unverändert (Testfall 3, bewusst verzerrt) | Checkbox „Seitenverhältnis beibehalten" abwählen, Breite ändern, Enter | `style.height` identisch zum Wert vor der Änderung, `style.width` geändert — Bild sichtbar gestaucht/gestreckt |
| 6 | Enter **und** Blur bestätigen gleichermaßen (Anforderung 2.2.1) | Höhe ändern, **ohne** Enter das Feld per `Tab`/Klick woanders verlassen | Änderung ist trotzdem übernommen (kein „Übernehmen"-Button nötig) |
| 7 | Fokus/Selektion bleiben nach Anwenden erhalten (Anforderung 2.2.4) | Größe ändern, direkt danach `Entf`/`Backspace` drücken, **ohne** erneut zu klicken | Bild wird gelöscht — belegt, dass die `NodeSelection` nach der Größenänderung noch aktiv war |

### 2.2 Ziehpunkte (Testfälle 4-5, Grenzfall 4.3, Element 4-5)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Eckgriff ändert Breite **und** Höhe proportional, unabhängig vom Lock-Zustand | Lock **deaktivieren** (!), Bild selektieren, `dragHandle(page, '.image-resize-handle-se', 40, 30)` | beide Dimensionen haben sich geändert, **Seitenverhältnis bleibt erhalten** trotz deaktiviertem Lock (Anforderung 2.3.1 — Eckgriffe ignorieren die Checkbox) |
| 2 | Seitengriff ändert nur eine Dimension | `dragHandle(page, '.image-resize-handle-e', 40, 0)` | Breite geändert, Höhe **exakt unverändert** — insbesondere: kein durch `height: auto`/CSS verzerrtes Höhenverhalten (Anforderung Abschnitt 3, Punkt 7 / Grenzfall 4.9, Plan Abschnitt 2 „Fund 1") |
| 3 | Live-Vorschau: Panel-Felder aktualisieren sich synchron während des Ziehens, nicht erst nach `mouseup` | Während laufender `dragHandle`-Sequenz (Zwischenschritt, vor `mouse.up()`) den aktuellen Feldwert lesen | Feldwert entspricht der aktuellen Zwischengröße, nicht dem Wert vor Beginn des Ziehens |
| 4 | Ziehen über den gegenüberliegenden Rand hinaus kollabiert nicht (Grenzfall 4.3) | Eckgriff um ein Vielfaches der ursprünglichen Bildgröße in Richtung des gegenüberliegenden Rands ziehen | Bild bleibt bei einer positiven Mindestgröße (≥ 1 px), kein negativer/invertierter Wert, Geste „friert" nicht ein (weitere `mousemove` wirken noch) |
| 5 | Extremwerte werden während des Ziehens laufend geclamped, nicht erst am Ende | Sehr weit über die Obergrenze hinausziehen (z. B. 3000 px Differenz) | Bild wächst bis zur konfigurierten Obergrenze und bleibt dort, keine Editor-/Seiten-Sprengung |

### 2.3 Ungültige/extreme Eingaben im Panel (Testfall 6, Grenzfall 4.1/4.2)

| # | Testfall | Schritte | Assertion | Grenzfall |
|---|---|---|---|---|
| 1 | Nicht-numerischer Text wird verworfen | Breitenfeld `.fill('abc')`, `Enter` | Feld/Bild zeigen wieder den vorherigen gültigen Wert, kein Absturz, `page.on('pageerror')` bleibt leer | 4.1 |
| 2 | Leeres Feld bei Enter wird verworfen | Feld leeren, `Enter` | vorheriger Wert bleibt bestehen | 4.1 |
| 3 | `0` wird auf den Mindestwert angehoben, nicht auf 0×0 kollabierend | `.fill('0')`, `Enter` | Feld/Bild zeigen die Mindestgröße (> 0), Bild bleibt sichtbar/selektierbar | 4.2 |
| 4 | Negativer Wert wird auf den Mindestwert angehoben | `.fill('-5')`, `Enter` | wie oben | 4.2 |
| 5 | Extrem großer Wert (z. B. `50000`) wird auf die Obergrenze gekappt | `.fill('50000')`, `Enter` | Feldwert und tatsächliche Bildgröße zeigen übereinstimmend die konfigurierte Obergrenze, **keine** Diskrepanz zwischen Feld und sichtbarer Größe | 4.2 |
| 6 | Deutsches Komma wird akzeptiert | `.fill('12,5')`, `Enter` | Feld zeigt `12,5`, Bild entsprechend 12,5 cm breit | Anforderung 2.6 |

### 2.4 Undo/Redo (Testfall 7-8, Grenzfall 4.7, Anforderung 2.7)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Eingabefeld-Größenänderung ist genau ein Undo-Schritt | Größe per Feld ändern → `ControlOrMeta+z` | Bild zeigt exakt die vorherige Größe, nicht eine Zwischengröße |
| 2 | Redo stellt die geänderte Größe wieder her | Fortsetzung: `ControlOrMeta+y`/`ControlOrMeta+Shift+z` | Bild zeigt wieder die per Feld gesetzte Größe |
| 3 | Eine **gesamte Ziehgeste** mit mehreren Zwischenschritten ist genau ein Undo-Schritt (Grenzfall 4.7, kritisch) | `dragHandle` mit `steps: 10` (10 `mousemove`-Ereignisse) → **ein einziges** `ControlOrMeta+z` | Bild zeigt exakt die Größe **vor Beginn** der gesamten Ziehgeste, nicht die Größe nach dem vorletzten Zwischenschritt — belegt, dass Zwischenschritte keine eigenen Undo-Einträge erzeugen |
| 4 | Undo in gemischter Sequenz (Bild einfügen → Größe ändern → Text davor tippen) funktioniert in umgekehrter Reihenfolge | Bild einfügen, Größe ändern, vor das Bild klicken und Text tippen, dann zwei Mal `ControlOrMeta+z` | erstes Undo entfernt den getippten Text, zweites Undo macht die Größenänderung rückgängig — Reihenfolge exakt umgekehrt zur Aktion (Anforderung 2.7) |

### 2.5 Reset auf Originalgröße (Testfall 9-10, Grenzfall 4.4, Element 6)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Reset-Button ist deaktiviert, solange keine Änderung erfolgt ist | Bild einfügen, selektieren, **ohne** jede Größenänderung | Button „Auf Originalgröße zurücksetzen" hat `disabled`-Zustand | Grenzfall 4.4 |
| 2 | Nach einer Größenänderung stellt der Button exakt die Einfüge-/Importgröße wieder her | Größe per Feld **und** separat per Ziehpunkt ändern, dann Button klicken | Bild hat exakt die Größe von vor jeder Änderung (Pixel-genau, nicht nur „ähnlich") |
| 3 | Reset-Button ist nach einem Import ohne bekannte Originalgröße deaktiviert (offene Frage 3, Abschnitt 3.3 des Plans) | DOCX-Fremddatei **ohne** `wp:extent` hochladen (per JSZip gebaut) | Button bleibt deaktiviert, da `naturalWidth`/`naturalHeight` `null` sind |

### 2.6 Rundreisen — vollständige Matrix aus Anforderung Abschnitt 5

Jedes Szenario prüft die **heruntergeladene Datei**
(`download.path()` → `fs.readFile` → `JSZip.loadAsync` → Ziel-XML-Datei aus
dem Zip lesen) und/oder den erneut importierten Editor-Zustand, nicht nur,
dass der Editor nach Re-Import „irgendwie richtig aussieht".

| # | Szenario | Ablauf | Assertion an heruntergeladener Datei/Reimport |
|---|---|---|---|
| 1 | DOCX-Fremddatei „unverändert" — **der zentrale Regressionstest gegen Abschnitt 6.3** (5.1.1, Testfall 11/12) | Per JSZip gebaute `.docx` mit `<wp:extent cx="4762500" cy="2857500"/>` (500×300 px) hochladen, **ohne jede Bearbeitung** sofort exportieren, exportierte Datei erneut hochladen | exportiertes `word/document.xml` enthält `<wp:extent cx="4762500" cy="2857500"/>` exakt — **nicht** `2857500`/`1905000` (300×200-Default); reimportiertes Bild zeigt im Editor sichtbar 500×300 px |
| 2 | DOCX-Eigenrundreise mit Panel-gesetzter Größe (5.1.2/5.1.3) | Bild über Toolbar einfügen → Breite/Höhe über Panel auf 640×480 px setzen (über cm-Umrechnung entsprechend eingeben) → Export → erneuter Import | `word/document.xml`: `<wp:extent>` entspricht exakt der in EMU umgerechneten 640×480-px-Zielgröße (unabhängige Regex-/`DOMParser`-Prüfung, nicht `readDocx`); nach Reimport identische Breite/Höhe im Editor |
| 3 | DOCX-Ziehpunkt-Rundreise (5.1.4) | Bild einfügen, Größe **über Ziehpunkte** (nicht Feld) ändern → Export → Reimport | Größe nach Reimport exakt wie nach dem Ziehen, nicht wie vor dem Ziehen |
| 4 | DOCX reale Mehrbild-Fremddatei (5.1.5, Testfall 17) | `VariousPictures.docx` hochladen, unverändert exportieren, reimportieren | alle 5 Bilder behalten ihre individuelle, aus dem Fixture-Inventar bekannte Größe (u. a. exakt 130×92 px und 192×176 px), **keine** Vereinheitlichung auf einen Default |
| 5 | ODT-Fremddatei „unverändert" (5.2.1, Testfall 13) | Per JSZip gebaute `.odt` mit `svg:width="12cm" svg:height="8cm"` hochladen, unverändert exportieren, reimportieren | exportiertes `content.xml` enthält `svg:width`/`svg:height` entsprechend 12×8 cm (±1 px Toleranz) — **nicht** `6cm`/`4cm`; reimportiertes Bild zeigt 12×8 cm |
| 6 | ODT-Eigenrundreise mit Panel-gesetzter Größe (5.2.2/5.2.3) | Bild einfügen, Panel-Größe setzen, Export → Reimport | `content.xml` enthält `<draw:frame>` mit `svg:width`/`svg:height` entsprechend der eingegebenen Größe, in `cm` (Einheit gemäß Plan Abschnitt 3.3, offene Frage 2) |
| 7 | ODT-Ziehpunkt-Rundreise (5.2.4) | analog zu #3, ODT | Größe nach Reimport exakt wie nach dem Ziehen |
| 8 | ODT reale Mehrbild-Fremddatei (5.2.5, Testfall 17) | `Seasonal_Fruits2_en.odt` hochladen, unverändert exportieren, reimportieren | alle 5 Bilder behalten ihre individuelle Größe |
| 9 | Cross-Format DOCX→ODT→DOCX ohne kumulativen Drift (5.3.1, Testfall 16) | DOCX mit bekannter Bildgröße importieren → als ODT exportieren → reimportieren → als DOCX exportieren | Größe nach zwei Konvertierungen weiterhin innerhalb Sub-Pixel-Toleranz zum Original, **kein** sichtbar kleiner werdendes Bild |
| 10 | Cross-Format ODT→DOCX→ODT ohne kumulativen Drift (5.3.2) | analog, Startpunkt ODT | wie oben |
| 11 | Cross-Format mit bewusst verzerrter (Seitengriff-)Größe (5.3.3) | Bild über Seitengriff nicht-seitenverhältnistreu verzerren → Doppel-Rundreise wie #9 oder #10 | die **verzerrte** Größe (nicht das ursprüngliche Seitenverhältnis) bleibt über beide Konvertierungen erhalten |
| 12 | Zwei Bilder mit identischem `src`, unterschiedlicher Größe (Grenzfall 4.8, Testfall 19) | Dasselbe Bild zweimal einfügen, eine Kopie über das Panel vergrößern, exportieren, reimportieren | beide Bilder behalten ihre jeweils individuelle Größe; im Export existiert nur **eine** eingebettete Bilddatei (Medien-Ordner enthält keine Duplikate) |

### 2.7 Unabhängige XML-Validierung (Testfall 11, Abnahme Punkt 4)

| # | Szenario | Prüfmethode |
|---|---|---|
| 1 | DOCX-Export | heruntergeladene Datei laden, `word/document.xml` **per Regex/`DOMParser`, nicht per `readDocx`** auf `<wp:extent cx="…" cy="…">` mit dem erwarteten Wert prüfen |
| 2 | ODT-Export | analog, `content.xml` per Regex/`DOMParser` auf `<draw:frame svg:width="…" svg:height="…">` prüfen |

### 2.8 Grenzfälle: Tabellenzelle, kleines Icon, defekte Datei (Testfall 18/20, Grenzfall 4.6/4.14/4.15)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Bild in einer Tabellenzelle verhält sich identisch zu einem Bild im Haupttext (Grenzfall 4.6, Testfall 18) | Tabelle einfügen, in eine Zelle klicken, Bild einfügen, Panel/Ziehpunkte benutzen | Panel erscheint, Größenänderung funktioniert identisch zum Haupttext-Fall |
| 2 | Einfüge-Standardgröße in einer schmalen Zelle orientiert sich an der Zellbreite, nicht der Seitenbreite | Großes Testbild (breiter als eine typische Zelle) in eine Tabellenzelle einfügen | eingefügte Breite ≤ tatsächliche Zellbreite zum Einfügezeitpunkt (per `getBoundingClientRect()` verglichen), nicht die volle Seitenbreite |
| 3 | Sehr kleines Icon (16×16 px) wird beim Einfügen **nicht** hochskaliert (Grenzfall 4.14, Testfall 20) | 16×16-px-Test-PNG hochladen | eingefügtes `img` hat `naturalWidth`/`naturalHeight`-Attribute bzw. sichtbare Größe von exakt 16×16 px, nicht künstlich vergrößert |
| 4 | Defekte/leere Bilddatei zeigt sichtbare Fehlermeldung statt Absturz (Grenzfall 4.15) | Eine `.png`-umbenannte Textdatei (kein gültiges Bildformat) hochladen | sichtbare Fehlermeldung im UI (analog zum in `DocumentWorkspace.tsx` etablierten Fehler-Muster), **kein** unbehandelter Absturz, `page.on('pageerror')` bleibt leer, kein `image`-Node mit leerem/kaputtem `src` im Dokument |

### 2.9 Selektions-Sync-Regression mit Bild-Resize (Testfall 14, Grenzfall 4.12, Pflicht)

**Erweiterung der bestehenden Datei** `tests/e2e/selection-regression.spec.ts`
(nicht neue, separate Datei — analog zum bereits etablierten Muster für
Fett/Kursiv/Schriftgröße in diesem Repo), neuer Test im bestehenden
`describe`-Block:

```ts
test('image NodeSelection survives a resize drag, then click-to-reposition + typing loses nothing (2.8, Grenzfall 4.12)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Vorher. ')
  await insertTestImage(page)
  await page.locator('.ProseMirror img').click()
  await dragHandle(page, '.image-resize-handle-se', 20, 15)
  await editor.locator('p').first().click()
  await page.keyboard.press('End')
  await page.keyboard.type(' Nachher.')
  await expect(editor).toContainText('Vorher.')
  await expect(editor).toContainText('Nachher.')
})
```

Assertion analog zum Vorbild: beide Textteile bleiben vollständig erhalten,
keine gelöschten/ersetzten Inhalte durch das Zusammenspiel von
Bild-`NodeSelection`, Resize-Geste (die selbst `pointerdown`/`pointerup` auf
dem Editor auslöst) und der bestehenden Mouseup-Reconciliation-Logik.

### 2.10 Bewusst dokumentierte, nicht blockierende Grenzfälle

| Grenzfall | Umgang laut Anforderung | Testabdeckung dieses Plans |
|---|---|---|
| 4.5 (Mehrfachselektion mehrerer Bilder) | Zu klären, ob überhaupt möglich | Ein E2E-Test prüft **nur**, dass `ControlOrMeta+a`/Shift-Klick über zwei Bilder hinweg **keine** gleichzeitige Mehrfach-`NodeSelection` erzeugt (ProseMirror-Standardverhalten); kein dedizierter Testfall in Anforderung Abschnitt 7 gefordert, daher hier nur als Beleg-Test, kein Blocker |
| 4.9 (Modellwert vs. CSS-Deckelung) | Modellwert gilt als Wahrheit (Plan Abschnitt 3.3, offene Frage 4) | Test 2.2 #2 dieses Plans (Seitengriff-Höhe bleibt exakt, nicht durch `height: auto` überschrieben) ist der praktische Beleg für diese Entscheidung |
| 4.10 (ODF-`px`-Interoperabilität) | Entschieden: Export nach `cm` (Plan Abschnitt 3.3, offene Frage 2) | Test 2.6 #5/#6 (Export enthält `cm`, nicht `px`), zusätzlich manuelle Einmalvalidierung gegen LibreOffice (Abschnitt 1.7, Punkt 2) |

---

## 3. Zuordnung Anforderung → Test (Abnahme-Mapping)

| Anforderungs-Abschnitt / Testfall / Grenzfall | Testebene(n) | Datei(en) |
|---|---|---|
| Abschnitt 1, Element 1-8 (Bedienelemente) | E2E | `image-resize.spec.ts` §2.1, §2.2 |
| 2.1 (Bild auswählen/deselektieren) | E2E | `image-resize.spec.ts` §2.1 #1-3 |
| 2.2 (Größenänderung per Eingabefeld) | E2E | `image-resize.spec.ts` §2.1 #4-7 |
| 2.3 (Größenänderung per Ziehpunkte) | E2E | `image-resize.spec.ts` §2.2 |
| 2.4 (Standardgröße beim Einfügen) | Unit + E2E | `imageSize.test.ts` (shared) #10-12, `image-resize.spec.ts` §2.8 #2-3 |
| 2.5 (Zurücksetzen auf Originalgröße) | E2E | `image-resize.spec.ts` §2.5 |
| 2.6 (Einheiten/Umrechnung) | Unit + E2E | `imageSize.test.ts` (shared) #4-9, `image-resize.spec.ts` §2.3 #6, §2.6 |
| 2.7 (Undo/Redo) | E2E | `image-resize.spec.ts` §2.4 |
| 2.8 (Selection-Sync-Zusammenspiel) | E2E | `selection-regression.spec.ts` (erweitert), §2.9 |
| Testfall 1-3 (Panel/Eingabefeld) | E2E | `image-resize.spec.ts` §2.1 |
| Testfall 4-5 (Ziehpunkte) | E2E | `image-resize.spec.ts` §2.2 #1-2 |
| Testfall 6 (ungültige Eingabe) | Unit + E2E | `imageSize.test.ts` (shared) #7, `image-resize.spec.ts` §2.3 |
| Testfall 7-8 (Undo/Redo, Ziehgeste als ein Schritt) | E2E | `image-resize.spec.ts` §2.4 |
| Testfall 9-10 (Reset auf Originalgröße) | E2E | `image-resize.spec.ts` §2.5 |
| Testfall 11 (DOCX-Rundreise, unabhängiger Parser) | E2E | `image-resize.spec.ts` §2.6 #1-4, §2.7 #1 |
| Testfall 12 (Reader-Bug-Regression DOCX) | Unit + E2E | `docx/__tests__/imageSize.test.ts` #1/#5, `docx/__tests__/roundtrip.test.ts` (erweitert), `image-resize.spec.ts` §2.6 #1 |
| Testfall 13 (Reader-Bug-Regression ODT) | Unit + E2E | `odt/__tests__/imageSize.test.ts` #1, `odt/__tests__/roundtrip.test.ts` (erweitert), `image-resize.spec.ts` §2.6 #5 |
| Testfall 14 (Selection-Sync-Zusammenspiel) | E2E | `selection-regression.spec.ts` §2.9 |
| Testfall 15 (ODT-Rundreise vollständig) | E2E | `image-resize.spec.ts` §2.6 #5-8 |
| Testfall 16 (Cross-Format-Rundreise) | Unit + E2E | `imageSize-crossformat.test.ts` §1.6, `image-resize.spec.ts` §2.6 #9-11 |
| Testfall 17 (reale Mehrbild-Fremddatei) | Unit + E2E | `docx/__tests__/imageSize.test.ts` #5, `odt/__tests__/imageSize.test.ts` #5, `image-resize.spec.ts` §2.6 #4/#8 |
| Testfall 18 (Bild in Tabellenzelle) | E2E | `image-resize.spec.ts` §2.8 #1-2 |
| Testfall 19 (identisches `src`, unterschiedliche Größe) | Unit + E2E | `docx/__tests__/roundtrip.test.ts` §1.4 #3, `image-resize.spec.ts` §2.6 #12 |
| Testfall 20 (kleines Icon) | Unit + E2E | `imageSize.test.ts` (shared) #10, `image-resize.spec.ts` §2.8 #3 |
| Grenzfall 4.1 (ungültige Eingabe) | Unit + E2E | `imageSize.test.ts` (shared) #7, `image-resize.spec.ts` §2.3 #1-2 |
| Grenzfall 4.2 (Extremwerte) | Unit + E2E | `imageSize.test.ts` (shared) #1-3, `image-resize.spec.ts` §2.3 #3-5 |
| Grenzfall 4.3 (Ecke über Rand hinausziehen) | E2E | `image-resize.spec.ts` §2.2 #4-5 |
| Grenzfall 4.4 (Reset ohne bekannte Originalgröße) | E2E | `image-resize.spec.ts` §2.5 #1/#3 |
| Grenzfall 4.5 (Mehrfachselektion) | E2E (Beleg, kein Blocker) | `image-resize.spec.ts` §2.10 |
| Grenzfall 4.6 (Tabellenzelle) | E2E | `image-resize.spec.ts` §2.8 #1-2 |
| Grenzfall 4.7 (kein Undo pro Mausbewegung) | E2E | `image-resize.spec.ts` §2.4 #3 |
| Grenzfall 4.8 (identisches `src`) | Unit + E2E | `docx/__tests__/roundtrip.test.ts` §1.4 #3, `image-resize.spec.ts` §2.6 #12 |
| Grenzfall 4.9 (CSS-Deckelung vs. Modellwert) | E2E | `image-resize.spec.ts` §2.2 #2, §2.10 |
| Grenzfall 4.10 (ODF-Einheiten-Interop) | E2E + manuell | `image-resize.spec.ts` §2.6 #5-6, Abschnitt 1.7 Punkt 2 |
| Grenzfall 4.11 (kumulativer Rundungsdrift) | Unit + E2E | `imageSize.test.ts` (shared) #4-5, `odt/__tests__/roundtrip.test.ts` §1.5 #2-3, `image-resize.spec.ts` §2.6 #9-11 |
| Grenzfall 4.12 (Selection-Sync + Resize) | E2E | `selection-regression.spec.ts` §2.9 |
| Grenzfall 4.13 (reale Mehrbild-Fremddatei) | Unit + E2E | `docx/__tests__/imageSize.test.ts` #5, `odt/__tests__/imageSize.test.ts` #5 |
| Grenzfall 4.14 (kleines Icon) | Unit + E2E | `imageSize.test.ts` (shared) #10, `image-resize.spec.ts` §2.8 #3 |
| Grenzfall 4.15 (defekte Bilddatei) | E2E | `image-resize.spec.ts` §2.8 #4 |
| Abschnitt 5 (vollständige Rundreise-Matrix) | Unit + E2E | `roundtrip.test.ts` (beide Formate, erweitert), `imageSize-crossformat.test.ts`, `image-resize.spec.ts` §2.6 |
| Abschnitt 6.3 (Reader-Datenverlust-Bug) | Unit + E2E | §1.2/#1/#5, §1.3/#1/#5, §1.4/#2, §1.5/#1, `image-resize.spec.ts` §2.6 #1/#5 — **muss vor Fix rot, danach grün sein** (siehe Abschnitt 0, Reihenfolge-Warnung) |
| Abschnitt 6.4 (vier offene Fragen) | dokumentiert in `bild-groesse-aendern-code.md` Abschnitt 3.3, hier per Test belegt | §2.2 #2 (Frage 4), §2.6 #5-6 (Frage 2), §2.5 #3 (Frage 3), Panel-Anzeige in cm (Frage 1) |
| DoD Punkt 7 (irreführende Tests korrigiert) | Unit | §1.4, §1.5 |
| DoD Punkt 8 (kein Fund ohne Vermerk) | — | Abschnitt 2.10 dieses Plans, Abnahme-Checkliste Abschnitt 4 |

---

## 4. Abnahme-Checkliste (vor Statuswechsel „verifiziert")

- [ ] `npm test` grün, inkl. aller neuen Dateien aus Abschnitt 1
      (`imageSize.test.ts` in `shared/__tests__`, `docx/__tests__`,
      `odt/__tests__`, `imageSize-crossformat.test.ts`, sowie erweiterte
      `roundtrip.test.ts` in beiden Formaten).
- [ ] `npm run test:e2e` grün, inkl. `image-resize.spec.ts` und der
      Erweiterung von `selection-regression.spec.ts`.
- [ ] **Vor** dem Reader-Fix wurde mindestens einmal nachweislich
      dokumentiert, dass die Testfälle 12/13 (Abschnitt 1.2 #1, 1.3 #1)
      **rot** waren (300×200 px bzw. 6×4 cm statt der echten Größe) — als
      Beleg, dass der Test den Bug tatsächlich erkennt, bevor er als
      Regressionsschutz zählt (Abschnitt 0, Reihenfolge-Warnung).
- [ ] Jeder Testfall aus Anforderung Abschnitt 7 (1-20) und jeder Grenzfall
      aus Abschnitt 4 (4.1-4.15) hat mindestens einen grünen, dauerhaft in
      der Suite verbleibenden Test (siehe Abnahme-Mapping Abschnitt 3).
- [ ] Die vollständige Rundreise-Matrix aus Anforderung Abschnitt 5 (5.1,
      5.2, 5.3) ist für DOCX **und** ODT grün, inklusive der beiden
      unabhängigen XML-Validierungen (Abschnitt 2.7 dieses Plans).
- [ ] Beide realen Mehrbild-Fixtures (`VariousPictures.docx`,
      `Seasonal_Fruits2_en.odt`) sind tatsächlich in der Suite referenziert
      und liefern die im Fixture-Inventar (`bild-groesse-aendern-code.md`
      Abschnitt 7) dokumentierten Werte — per Review bestätigt, nicht nur
      behauptet.
- [ ] Alle vier offenen Fragen aus Anforderung Abschnitt 6.4 sind sowohl in
      `bild-groesse-aendern-code.md` Abschnitt 3.3 explizit beantwortet als
      auch durch mindestens einen grünen Test messtechnisch belegt (siehe
      Abnahme-Mapping, Zeile „Abschnitt 6.4").
- [ ] Manuelle Einmalvalidierung einer exportierten Test-Datei mit mehreren
      unterschiedlich großen Bildern (inkl. einer über einen Seitengriff
      bewusst verzerrten Größe) gegen Word/LibreOffice durchgeführt und in
      dieser Datei oder einer Folgedatei vermerkt (Abschnitt 1.7, Punkt 2),
      insbesondere zur ODF-`cm`-vs.-`px`-Frage aus Grenzfall 4.10.
- [ ] Kein Test in `image-resize.spec.ts` bzw. der Erweiterung von
      `selection-regression.spec.ts` ruft `readDocx`/`writeDocx`/`readOdt`/
      `writeOdt`/`setImageSize`/`insertImage`/`resetImageToNaturalSize`
      direkt auf — stichprobenartig per Review bestätigt.
- [ ] Für jeden in `bild-groesse-aendern-code.md` Abschnitt 2 dokumentierten
      Zusatzfund (CSS-Spezifität/Inline-Style-Fix, `draggable`-Konflikt mit
      Ziehpunkten, unveränderte Writer-Fallbacks, korrekter
      `imageCollector`) liegt entweder ein Fix mit grünem Regressionstest vor
      (Fund 1/2), oder das bereits korrekte Verhalten ist durch einen
      Beleg-Test bestätigt (Fund 3/4) — kein stiller Fehlschlag, analog
      `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.4.
- [ ] Grenzfall 4.5 (Mehrfachselektion mehrerer Bilder) bleibt als bewusst
      nachrichtlicher, nicht blockierender Punkt sichtbar vermerkt
      (Abschnitt 2.10), kein stillschweigendes Fehlen einer Prüfung.
