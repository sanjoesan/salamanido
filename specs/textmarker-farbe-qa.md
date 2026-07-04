# Testplan „Texthervorhebungsfarbe" — QA-Verifikation

Gegenstück zu `specs/textmarker-farbe-req.md` (Anforderung) und
`specs/textmarker-farbe-code.md` (Umsetzungsplan). Legt fest, **welche Tests**
geschrieben werden, **wo** sie liegen, **wie** sie ausgeführt werden und
**wann** ein Punkt als abgehakt gilt. Zwei Ebenen, die sich ergänzen, aber
**keine ersetzen darf**:

1. **Unit-Tests** (Vitest, `jsdom`) für die Reader/Writer-Rundreise auf
   Daten-/XML-Ebene — schnell, präzise, aber blind gegenüber Toolbar,
   Farbwähler-Bedienung, echtem Datei-Dialog und echtem Undo-Stack im Browser.
2. **Echte Playwright-Browser-Tests** — Klicks auf den tatsächlichen
   Farbwähler (`🖍`/`<HighlighterIcon/>`) und „Entfernen"-Button (`⌫`/
   `<EraserIcon/>`), echte Tastatureingabe, echter `setInputFiles()`-Upload,
   echter `page.waitForEvent('download')`-Export, Prüfung der **tatsächlich
   heruntergeladenen Datei** (nicht nur ein interner Aufruf von
   `readDocx`/`readOdt`/`writeDocx`/`writeOdt`/`applyMarkColor`/
   `colorMarkStateFor`).

Ein Test, der nur `readDocx(buffer)`/`writeOdt(doc)`/`applyMarkColor(...)`
direkt aufruft, zählt **nicht** als Ebene 2, auch wenn er in `tests/e2e/`
liegt. Beide Ebenen sind laut `textmarker-farbe-req.md` Abschnitt 6 (DoD-Punkt
1: „echte Browser-Interaktion, nicht nur Unit-/Command-Ebene") Pflicht für die
Abnahme.

Referenzierte reale Fixtures (alle bereits im Repo vorhanden, **kein**
künstliches Beispiel nötig):
`tests/fixtures/external/docx/bug57031.docx` (`<w:highlight w:val="lightGray"/>`),
`tests/fixtures/external/docx/bug65649.docx` (weiterer `<w:highlight>`-Fall),
`tests/fixtures/external/odt/lostBackground.odt`,
`tests/fixtures/external/odt/coloredParagraph.odt`,
`tests/fixtures/external/odt/character-styles.odt`,
`tests/fixtures/external/odt/TableFunkyBackground.odt`,
`tests/fixtures/external/odt/text-color-from-paragraph.odt`,
`tests/fixtures/external/odt/sameLocationSpansUsingMultipleTemplateStyles_BOLD-Outer-ITALIC-Inner-Text-Yellow.odt`.

Dieser Plan geht davon aus, dass die in `textmarker-farbe-code.md` Abschnitt 4
beschriebenen Fixes (Zustandsanzeige, `change`-Event statt `onChange`,
`<w:highlight>`-Import, `escapeXml`-Fix, ODT-Absatzstil-Lücke, Dedup-Härtung,
SVG-Icons) **vor** dem finalen grünen Lauf dieser Suite umgesetzt sind (siehe
`textmarker-farbe-code.md` Abschnitt 8, Reihenfolge der Umsetzung). Tests, die
bewusst aktuelles, noch nicht behobenes Verhalten dokumentieren (z. B. der
kritische Verlust in Grenzfall 3.7 vor dem Fix), sind als solche markiert und
dienen als Vorher/Nachher-Beleg, nicht als Dauerzustand.

---

## 0. Ausführung

| Ebene | Befehl | Neue/geänderte Dateien |
|---|---|---|
| Unit | `npm test` (`vitest run`) | siehe Abschnitt 1 |
| Browser/E2E | `npm run test:e2e` (`playwright test`, mind. Chromium- **und** Firefox-Projekt für die Event-Granularität-Tests) | siehe Abschnitt 2 |

Beide Suiten müssen grün sein, bevor „Texthervorhebungsfarbe" laut DoD
(Anforderung Abschnitt 6) als „verifiziert" gilt. Empfohlene Reihenfolge:
zuerst die Fixes aus `textmarker-farbe-code.md` Abschnitt 4/8 umsetzen (sonst
schlagen mehrere hier verlangte Tests erwartungsgemäß fehl), parallel dazu
die zugehörigen Unit-Tests je Fix ergänzen (Abschnitt 8 des Codeplans sieht
das explizit so vor), danach die E2E-Suite, danach gemeinsamer Lauf beider
Suiten gegen den vollständig gefixten Code.

---

## 1. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

Ziel: jede Rundreise-Behauptung aus Anforderung Abschnitt 4 sowie jeder
Reader-/Writer-Grenzfall aus Abschnitt 3 auf Daten-/XML-Ebene isoliert,
deterministisch und ohne Browser nachweisen. Diese Ebene prüft **Funktionen
direkt** (`readDocx`, `writeDocx`, `readOdt`, `writeOdt`, `normalizeCssColor`,
`colorMarkStateFor`) — das ist hier ausdrücklich erlaubt und richtig, weil sie
durch die Playwright-Ebene (Abschnitt 2) ergänzt, nicht ersetzt wird.

### 1.1 Bestehende Abdeckung (Referenz, laut Auftrag nicht vertrauenswürdig)

`src/formats/docx/__tests__/roundtrip.test.ts:94-109` und
`src/formats/odt/__tests__/roundtrip.test.ts:94-109` („preserves text color
and highlight color") decken `highlight` bereits in Kombination mit
`textColor` ab, aber ausschließlich über direkt konstruiertes
`ProseMirrorJSON`, nicht über echte Reader-Eingabe (XML) oder echte
Editor-Bedienung. Bleiben unverändert bestehen, werden durch die neuen
Dateien unten **ergänzt**, nicht dupliziert. Zählen weiterhin **nicht** als
Nachweis für Abnahmekriterium 1 der Anforderung (das verlangt echte
Browser-Interaktion).

### 1.2 Neu: `src/formats/docx/__tests__/highlight.test.ts`

Reader-/Writer-Rundreise und -Grenzfälle für DOCX, je über eine minimal per
JSZip gebaute `.docx`-Datei (Muster: `buildDocxWithRun(runXml)`, analog zu
`buildSampleDocx()` in `tests/e2e/docx.spec.ts`) und `readDocx(blob)` bzw.
`writeDocx(doc)`.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | `<w:shd>` wird gelesen (Basisfall) | `<w:rPr><w:shd w:val="clear" w:color="auto" w:fill="FFFF00"/></w:rPr>` | `highlight`-Mark mit `color: '#ffff00'` | Ist-Stand-Tabelle Zeile `docx/reader.ts:99-114` |
| 2 | `<w:shd w:fill="auto">` erzeugt **kein** Mark | wie oben, `w:fill="auto"` | kein `highlight`-Mark | bestehende Ausschlussregel |
| 3 | `<w:highlight w:val="lightGray"/>` **ohne** `<w:shd>` wird gelesen | `<w:rPr><w:highlight w:val="lightGray"/></w:rPr>` | `highlight`-Mark mit `color: '#c0c0c0'` | Code-Fix 4.6/4.7, behebt kritischen Verdacht Grenzfall 3.7 |
| 4 | `<w:highlight w:val="none"/>` erzeugt **kein** Mark | wie oben | kein `highlight`-Mark | `hexFromWordHighlightName` behandelt `'none'` als „keine Hervorhebung" |
| 5 | `<w:shd>` **und** `<w:highlight>` gleichzeitig auf demselben Run, unterschiedliche Werte | `<w:shd w:fill="00FF00"/><w:highlight w:val="yellow"/>` | `<w:shd>` gewinnt (`#00ff00`) | Vorrangregel Code-Abschnitt 4.7 |
| 6 | Regressionstest gegen reale Fixture `bug57031.docx` | Datei einlesen, betroffenen Lauf im resultierenden Dokumentbaum suchen | Lauf trägt `highlight`-Mark mit `#c0c0c0` | Grenzfall 3.7/4.1.5, echte unveränderte Drittdatei |
| 7 | Regressionstest gegen reale Fixture `bug65649.docx` | wie oben (Wert vorab per Skript aus dem Fixture ermittelt und hier fest verankert) | `highlight`-Mark mit erwartetem Hex-Wert vorhanden | zweite unabhängige Belegdatei |
| 8 | Export: `highlight` → exakt `<w:shd w:val="clear" w:color="auto" w:fill="ffff00"/>`, kein `<w:highlight>` (Minimalumfang) | PM-Doc mit `highlight`-Mark `#ffff00` → `writeDocx` | erzeugtes `word/document.xml` per `DOMParser` geprüft: genau ein `<w:shd .../>`, **kein** `<w:highlight>`, sofern die optionale Rückrichtung aus Code-Abschnitt 4.7 nicht aktiviert ist | Anforderung 4.1.1, Grenzfall 3.8 als Design-Entscheidung |
| 9 | Falls Code-Abschnitt 4.7 optionale `<w:highlight>`-Rückrichtung aktiviert wird | Farbe exakt `#ffff00` (Palettenwert) | zusätzlich `<w:highlight w:val="yellow"/>` vorhanden | optionaler Teil, nur falls umgesetzt |
| 10 | Export enthält **kein** `<w:shd>` mehr nach Entfernen | Mark entfernt → Export | kein `<w:shd>` für betroffenen Run | Anforderung 4.1.4 |
| 11 | Hervorhebung + Fett + Schriftfarbe gemeinsam auf einem Run | drei Marks auf einem Textknoten, echte `state.tr.addMark`-Sequenz (nicht nur JSON) über `wordSchema` | ein `<w:r>` mit `<w:b/>`, `<w:color .../>`, `<w:shd .../>` gemeinsam, kein Aufsplitten in mehrere Runs | Anforderung 4.1.3 |
| 12 | Reihenfolge-Unabhängigkeit beim Anwenden | Test A: erst Farbe dann Fett; Test B: erst Fett dann Farbe (`state.tr.addMark`) | identisches `<w:rPr>` in beiden Fällen | Anforderung 2.4 |
| 13 | Hervorhebung über `hard_break` hinweg | Wort mit `hard_break` in der Mitte, beide Seiten hervorgehoben | Export erhält Hervorhebung auf beiden Seiten des Umbruchs | Anforderung 4.1.6 |
| 14 | Cross-Format ODT→DOCX | mit `readOdt` gelesenes Dokument mit `highlight`-Mark → `writeDocx` | `<w:shd>` mit korrektem Hex im Export | Anforderung 4.1.7 |
| 15 | Ungültiger/nicht-normalisierter Farbwert an `writeDocx` (simuliert Bug in vorgelagertem Code, z. B. `'yellow'` statt `'#ffff00'`) | PM-Doc mit `highlight`-Mark `color: 'yellow'` | `writeDocx` wirft strukturierten Fehler (`normalizedHex`), **kein** stillschweigend ungültiges `w:fill` | Grenzfall 3.9, Code-Fehler 1 behoben (Abschnitt 4.8) |
| 16 | XML-Injection-Regressionstest (Fehler 1) | `color: '#ff0000"><w:sz w:val="999"/><w:shd w:fill="'` (bzw. Werte mit `"`, `<`, `&`) an `writeDocx` | wirft Fehler statt strukturell kaputtes XML zu erzeugen; **falls** die Implementierung stattdessen escaped statt wirft, zusätzlich prüfen: erzeugtes XML bleibt per `DOMParser` parsebar und enthält den Wert escaped, nicht roh | Code-Abschnitt 2.1/4.8 |
| 17 | Zwei benachbarte Runs mit identischer Markkombination, aber Marks in unterschiedlicher Array-Reihenfolge konstruiert | `Node.fromJSON` mit `[highlight, textColor]` vs. `[textColor, highlight]` auf Nachbarknoten | genau **ein** `<w:r>` im Export (nicht zwei), Regressionstest für `marksKey`-Fix | Code-Lücke B, Abschnitt 2.4/4.8 |
| 18 | Leerer Listenpunkt/leere Tabellenzelle mit Hervorhebung entfernt | Mark auf leerem Textknoten gesetzt/entfernt | kein leerer `<w:r>` ohne Inhalt im Export, kein Absturz | Grenzfall 3.10 |

### 1.3 Neu: `src/formats/odt/__tests__/highlight.test.ts`

Analog für ODT, über `buildOdt(automaticStylesXml, spanMarkup)` und
`readOdt(blob)`/`writeOdt(doc)`.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | `fo:background-color` in `style:family="text"` wird gelesen | automatische Formatvorlage mit `fo:background-color="#ffff00"`, referenziert von `text:span` | `highlight`-Mark `#ffff00` | Ist-Stand `odt/reader.ts:47-61,92` |
| 2 | Export erzeugt `fo:background-color` in `style:text-properties`, referenziert über `text:style-name` | PM-Doc mit `highlight`-Mark → `writeOdt` | `content.xml` enthält passende automatische Formatvorlage samt `text:span` | Anforderung 4.2.1 |
| 3 | Zwei Textläufe mit identischer Hervorhebungsfarbe (sonst keine weiteren Marks) | zwei Textknoten, gleiche Farbe | `TextStyleRegistry` erzeugt **eine** gemeinsame Stildefinition, nicht zwei | Anforderung 4.2.3 |
| 4 | Hervorhebung + Fett kombiniert | ein Textknoten mit beiden Marks | eine gemeinsame Stildefinition mit beiden Eigenschaften | Anforderung 4.2.4 |
| 5 | Hervorhebung entfernt | Export nach Entfernen | kein Stil mit `fo:background-color` mehr referenziert | Anforderung 4.2.5 |
| 6 | Cross-Format DOCX→ODT | mit `readDocx` gelesenes Dokument (`<w:shd>`-Ursprung) → `writeOdt` | Farbe bleibt exakt erhalten | Anforderung 4.2.6 |
| 7 | Reihenfolge-Unabhängigkeit der Dedup-Schlüssel (Lücke B) | zwei Läufe mit `[highlight, textColor]` vs. `[textColor, highlight]` als Mark-Array-Reihenfolge | eine gemeinsame Stildefinition (nicht zwei), Regressionstest für `styleNameFor`-Fix | Code-Lücke B, Abschnitt 2.4/4.11 |
| 8 | `highlight` mit `color: '#ffffff'` (Weiß) rundreist als explizit gesetzte Farbe | Mark mit Weiß, kein anderer Text hervorgehoben | nach Export+Re-Import weiterhin `highlight`-Mark `#ffffff` vorhanden, unterscheidbar von Text ganz ohne Mark | Grenzfall 3.6 |
| 9 | Ungültiger Farbwert an `writeOdt` (simuliert Bug in vorgelagertem Code) | `color: 'yellow'` statt Hex | wirft strukturierten Fehler (`assertValidHex`) statt stillschweigend ungültiges `fo:background-color` zu schreiben | Code-Abschnitt 4.10 |
| 10 | **Lücke A (Regressionstest):** `style:family="paragraph"`-Stil mit `style:text-properties fo:background-color="…"`, referenziert von `<text:p>` mit **direktem, nicht span-verpacktem, sichtbarem Text** | synthetisches `content.xml` direkt als String konstruiert (per JSZip von Hand gebaut, analog zu `buildSampleOdt()`/`buildOdt()`-Mustern — `writeOdt` erzeugt diesen ODF-Fall selbst nie, siehe Codeplan Abschnitt 6.4) | `highlight`-Mark auf dem direkten Absatztext gesetzt | Code-Abschnitt 2.3/4.9, architektonische Lücke, bisher durch keine der 57 Fixtures mit sichtbarem Text abgedeckt |
| 11 | Regressionstest `lostBackground.odt` (dokumentiert **bereits korrektes** Verhalten, kein Verlust für dieses Feature) | Fixture einlesen | exakt 4 `highlight`-Marks an den Texten „Dienstag", „Rot Und BOLD", „Text", „pfff" mit Hex `#ffff00`, `#ff0000`, `#ffc000`, `#ffc000`; die 8 verwaisten, unreferenzierten Automatikstile erzeugen **keine** zusätzlichen Marks | Code-Abschnitt 2.3, Regressionsschutz gegen einen künftigen naiven „alle Stile mit `background-color`"-Refactor |
| 12 | Absatz-Hintergrund (`style:paragraph-properties`) wird **nicht** fälschlich als Zeichen-Hervorhebung gelesen | synthetisches `content.xml` mit `fo:background-color` **nur** auf `style:paragraph-properties`, nicht auf `style:text-properties` | **kein** `highlight`-Mark auf dem Text | Grenzfall 3.13 |

### 1.4 Neu: `src/formats/shared/__tests__/color.test.ts`

Unit-Tests für `normalizeCssColor` (Code-Abschnitt 4.1), reiner
Funktionsaufruf, kein Editor/DOM außer dem internen jsdom-Probe-Element.

| # | Eingabe | Erwartung |
|---|---|---|
| 1 | `#ffff00`, `#FFFF00` | `'#ffff00'` (kanonisch klein) |
| 2 | `#ff0` (3-stellig) | `'#ffff00'` |
| 3 | `yellow`, `rebeccapurple` (benannte CSS-Farben) | korrektes kanonisches Hex |
| 4 | `rgb(255, 255, 0)` | `'#ffff00'` |
| 5 | `rgba(255, 0, 0, 0.5)` | `'#ff0000'` (Alpha auf deckend normalisiert, nicht `null`) |
| 6 | `rgba(255, 0, 0, 0)` | `null` (voll transparent → keine Hervorhebung) |
| 7 | `transparent` | `null` |
| 8 | `hsl(60, 100%, 50%)` | `'#ffff00'` (oder äquivalentes Gelb) |
| 9 | `"not-a-color"`, `""`, `"42"` | `null` (kein Absturz) |
| 10 | `"javascript:alert(1)"` bzw. Werte mit `"`/`<`/`&` | `null` oder ein reines Hex ohne Metazeichen — **niemals** der Rohwert unverändert durchgereicht (schützt Grenzfall 3.9 an der Wurzel) |

### 1.5 Neu/ergänzt: `src/formats/shared/editor/__tests__/commands.test.ts`

Reiner Zustands-Unit-Test (kein DOM/Browser) für `colorMarkStateFor`
(Code-Abschnitt 4.3). Ergänzt, ersetzt aber nicht die Browser-Bestätigung
derselben Fälle in Abschnitt 2.2 dieses Plans, da erst Ebene 2 beweist, dass
der tatsächlich gerenderte Farbwähler sich entsprechend verhält.

| # | Testfall | Erwartung |
|---|---|---|
| 1 | Leere Selektion (Cursor), keine Hervorhebung an `$from` | `{ kind: 'none' }` |
| 2 | Leere Selektion, `$from` liegt in hervorgehobenem Text | `{ kind: 'set', color: '#…' }` mit korrektem Wert |
| 3 | Durchgehend einheitlich hervorgehobene Selektion | `{ kind: 'set', color: '#…' }` |
| 4 | Gemischte Selektion: Teil A Farbe X, Teil B Farbe Y | `{ kind: 'mixed' }` |
| 5 | Gemischte Selektion: Teil A Farbe X, Teil B **keine** Hervorhebung | `{ kind: 'mixed' }` (nicht fälschlich `'set'` durch reine Randprüfung) — Grenzfall 3.2 |
| 6 | Selektion über einen `image`-Knoten hinweg (Text-Bild-Text, teils hervorgehoben) | liefert ein definiertes Ergebnis (`mixed` oder `set`, je nach Textanteilen), **kein** Absturz beim `nodesBetween`-Lauf über einen Nicht-Text-Knoten | Grenzfall 3.3 auf Command-Ebene |
| 7 | `applyMarkColor`/`clearMarkColor` bei leerer Selektion | `false` (unverändertes Verhalten, siehe Code-Abschnitt 3.2 — **keine** Regression, bewusst beibehalten) |

### 1.6 Validierung gegen unabhängigen Parser (Rundreise-Szenario 4.1/4.2)

Da dieses Repo keine Python-Toolchain besitzt, erfolgt die unabhängige
Validierung zweistufig (analog `specs/kursiv-qa.md` Abschnitt 1.5):

1. **Automatisiert, Teil der Unit-/E2E-Suite:** Prüfung des exportierten
   XML-Strings per `DOMParser`/gezieltem Attribut-Zugriff, **ohne** dabei
   `readDocx`/`readOdt` desselben Projekts zu benutzen (verhindert sich
   gegenseitig ausgleichende Schreib-/Lesefehler). Umgesetzt in Abschnitt 1.2
   Testfall 8 (DOCX) sowie in den E2E-Szenarien aus Abschnitt 2.6/2.7 dieses
   Plans, da dort die real heruntergeladene Datei vorliegt.
2. **Manuell, einmalig vor Statuswechsel auf „verifiziert":**
   - eine exportierte Test-DOCX mit gesetzter Hervorhebungsfarbe außerhalb
     dieses Repos mit `python-docx` (`run.font.highlight_color` **und**
     Rohzugriff auf `w:shd`) sowie in echtem Microsoft Word öffnen und
     prüfen, ob das native „Text hervorheben"-Werkzeug als aktiv angezeigt
     wird (erwartet: **nein**, siehe Grenzfall 3.8) — Ergebnis in
     `textmarker-farbe-req.md` Grenzfall 3.8 nachtragen.
   - dieselbe Datei mit dem in Abschnitt 1.2 Testfall 9 beschriebenen
     optionalen `<w:highlight>`-Rückrichtungs-Feature (falls umgesetzt) erneut
     prüfen — Ergebnis: Word zeigt „Text hervorheben" jetzt als aktiv an.
   - eine exportierte Test-ODT mit LibreOffice öffnen, „Zeichenhintergrund"
     bestätigt sichtbar.
   - Kein Bestandteil der automatisierten CI-Suite, aber Pflicht-Checkliste-
     Punkt vor Abnahme (Abschnitt 4 dieses Plans, deckt DoD-Punkt 4).

---

## 2. Echte Playwright-Browser-Tests

**Grundregel dieser Ebene:** Jeder Test bedient die Anwendung ausschließlich
so, wie eine Person es täte — `page.getByTitle(...)`/`getByLabel(...)`
`.click()`, `page.keyboard.type(...)`/`.press(...)`, `locator.evaluate(...)` +
`dispatchEvent(new Event('change'/'input', ...))` für das native
`<input type="color">` (echtes Ziehen im OS-Farbrad ist in Playwright nicht
simulierbar — das Setzen von `element.value` + Dispatch des jeweiligen
DOM-Events ist die dafür etablierte, dennoch „echte" Browser-Bedienung, weil
sie exakt den Pfad durchläuft, den der native Farbwähler auch nimmt),
`input.setInputFiles(...)` für Uploads, `page.waitForEvent('download')` +
Lesen der heruntergeladenen Datei vom Datenträger für Exporte. **Kein Test in
diesem Abschnitt darf** `readDocx`/`writeDocx`/`readOdt`/`writeOdt`/
`applyMarkColor`/`clearMarkColor`/`colorMarkStateFor`/`normalizeCssColor`
direkt importieren oder aufrufen — das wäre Ebene 1, nicht Ebene 2. Wo eine
Datei hochgeladen werden muss, wird sie entweder (a) unabhängig vom
Reader/Writer dieses Projekts per JSZip von Hand gebaut (Muster
`buildSampleDocx()`/`buildSampleOdt()` aus `tests/e2e/docx.spec.ts`/
`odt.spec.ts`), oder (b) eine reale externe Fixture aus
`tests/fixtures/external/` verwendet — niemals eine mit dem eigenen Writer
erzeugte Datei als Upload-Eingabe für einen Rundreisetest, das würde
Schreib-/Lesefehler gegenseitig kompensieren lassen.

### 2.0 Neue Datei: `tests/e2e/highlight.spec.ts`

Struktur/Locator-Helfer identisch zu den bestehenden Dateien:

```ts
function docxCard(page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
async function setNativeColor(input: Locator, hex: string) {
  await input.evaluate((el: HTMLInputElement, v: string) => {
    el.value = v
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, hex)
}
```

`beforeEach`: `page.goto('/')` → Privacy-Banner „Verstanden" wegklicken →
je nach Testfall `odtCard`/`docxCard` „Neu erstellen" klicken (analog zu
`selection-regression.spec.ts`).

### 2.1 Farbwähler & „Entfernen"-Button — Grundverhalten (Anforderung Abschnitt 1, 2.1, 2.6)

| # | Testfall | Schritte (echte Bedienung) | Assertion |
|---|---|---|---|
| 1 | Farbe auf Selektion anwenden | `keyboard.type('Testtext')` → `ControlOrMeta+a` → `setNativeColor(getByLabel('Hervorhebungsfarbe'), '#ffff00')` | `editor.locator('span, mark')` mit Text „Testtext" hat `background-color: rgb(255, 255, 0)` (per `toHaveCSS`) |
| 2 | „Entfernen" klickt entfernt die Hervorhebung | Fortsetzung von #1: `getByLabel('Hervorhebung entfernen').click()` | `background-color` verschwindet aus dem DOM des Textbereichs, Text „Testtext" bleibt vollständig erhalten |
| 3 | Bestehende, andere Farbe wird durch neue ersetzt (nicht kombiniert) | Text mit `#ff0000` hervorheben, dieselbe Selektion erneut mit `#00ff00` einfärben | nur `#00ff00` im DOM, kein Rest von `#ff0000` |
| 4 | Erneutes Setzen derselben Farbe verursacht keinen Fehler | Farbe zweimal identisch setzen | kein Crash, `background-color` unverändert `#ffff00`; optional: kein zusätzlicher Undo-Schritt (per anschließendem einzelnen `Strg+Z` geprüft) |
| 5 | Accessible Name/Tooltip vorhanden | — | `getByLabel('Hervorhebungsfarbe')` und `getByLabel('Hervorhebung entfernen')` referenzieren eindeutig die richtigen Elemente (Bedienelement 1/2) |

### 2.2 Zustandsanzeige & leere/gemischte Selektion (Bedienelement 1/5, Grenzfall 3.1/3.2, kritisch)

Deckt Code-Abschnitt 4.3/4.4 (`colorMarkStateFor`, deaktivierte Controls) und
damit DoD-Punkt 5/6 der Anforderung.

| # | Testfall | Schritte | Assertion | Grenzfall/Bedienelement |
|---|---|---|---|---|
| 1 | Farbwähler und „Entfernen" ohne Selektion sind sichtbar deaktiviert | Cursor ohne Selektion positionieren (kein Shift) | `getByLabel('Hervorhebungsfarbe')` **und** `getByLabel('Hervorhebung entfernen')` haben `disabled`, `title`-Attribut enthält einen Hinweis wie „bitte zuerst Text markieren" | 3.1, Bedienelement 1/2, DoD 6 |
| 2 | Klick/Bedienung im deaktivierten Zustand ist ein echter No-Op, kein Crash | Versuch, das deaktivierte Element per `force: true` zu bedienen | Editor-Inhalt unverändert, keine Konsolenfehler (`page.on('console')`/`page.on('pageerror')` überwacht) | 3.1 |
| 3 | Selektion mit einheitlicher Hervorhebung zeigt die tatsächliche Farbe | Text mit `#ffff00` hervorheben, denselben Bereich erneut selektieren | Farbwähler-Swatch/`value` entspricht `#ffff00` (nicht Standard-Schwarz, nicht vorheriger Zufallswert) | Bedienelement 1, Abschnitt 2.3 |
| 4 | Selektion ganz ohne Hervorhebung zeigt „keine" | unformatierten Text selektieren | Swatch zeigt erkennbaren „keine Hervorhebung"-Zustand (kein `background`, kein irreführender Vorgabewert) | Bedienelement 1, Abschnitt 2.3 |
| 5 | Gemischte Selektion (halb `#ffff00`, halb keine Hervorhebung) zeigt „gemischt" | Teiltext hervorheben, dann Gesamtselektion über beide Teile | erkennbarer „gemischt"-Zustand (`title`/`aria-disabled`/eigene visuelle Kennzeichnung enthält „gemischt" o. Ä.), **nicht** fälschlich Farbe des einen oder anderen Teils | 3.2, Abschnitt 2.3 |
| 6 | Anwenden einer neuen Farbe auf gemischte Selektion vereinheitlicht | Fortsetzung von #5: `setNativeColor(..., '#00ff00')` | **gesamte** vormals gemischte Selektion ist jetzt einheitlich `#00ff00`, kein Rest der alten Farbe/des unformatierten Teils | 3.2, Anforderung 2.1 |
| 7 | Cursorbewegung aktualisiert die Anzeige live | Cursor von hervorgehobenem in nicht-hervorgehobenen Text bewegen (Pfeiltasten) | Swatch/`value` wechselt entsprechend, ohne Neuladen der Seite | Abschnitt 2.3 |

### 2.3 Kombination mit anderen Zeichenformaten (Anforderung 2.4, 2.5)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Hervorhebung + Fett + Schriftfarbe gleichzeitig | Text tippen, markieren, `getByTitle('Fett')` klicken, Schriftfarbe setzen, Hervorhebungsfarbe setzen | alle drei Formate gleichzeitig im DOM (`strong`, Inline-`color`, Inline-`background-color`), keines verdrängt ein anderes |
| 2 | Reihenfolge der Anwendung ist irrelevant | Test A: erst Schriftfarbe dann Hervorhebung; Test B: umgekehrt | identisches Endergebnis (DOM-Struktur/Styles) in beiden Fällen |
| 3 | Kontrastfall dokumentiert, kein Absturz | Schriftfarbe und Hervorhebungsfarbe auf identischen Hex-Wert setzen (z. B. beide `#000000`) | kein Fehler, Text bleibt im DOM vorhanden (nur optisch unlesbar) — Ergebnis als akzeptierter UX-Grenzfall dokumentiert, kein Test-Fail | Grenzfall 3.4/3.12, Abschnitt 2.5 |
| 4 | Selektion über Bild-/Tabellengrenze hinweg | Bild einfügen, Text davor/danach + Bild per `ControlOrMeta+a` oder Shift-Klick mitselektieren, Hervorhebungsfarbe anwenden | kein Absturz, Hervorhebung nur auf textuellen Inline-Inhalten, Bild bleibt unverändert | Grenzfall 3.3 |

### 2.4 Undo/Redo & Event-Granularität des Farbwählers (Anforderung 2.8, Grenzfall 3.11, kritisch)

Läuft auf **mindestens** Chromium- und Firefox-Projekt der Playwright-Config
(`--project=chromium --project=firefox` bzw. äquivalente Matrix), da das
zugrundeliegende Browserverhalten laut Code-Abschnitt 2.2 unterschiedlich ist.

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Ein Strg+Z macht die komplette Farbanwendung rückgängig | Text markieren → Farbe setzen → `ControlOrMeta+z` | `background-color` vollständig verschwunden, Text bleibt erhalten (nicht nur eine Teilanwendung rückgängig gemacht) |
| 2 | Redo stellt die Farbe wieder her | Fortsetzung: `ControlOrMeta+y`/`ControlOrMeta+Shift+z` | `background-color` wieder vorhanden, exakt derselbe Hex-Wert |
| 3 | Mehrere simulierte Zwischen-`input`-Events + ein abschließendes `change` erzeugen genau **einen** Undo-Schritt | `input.evaluate(el => { for (const v of ['#ff0000','#00ff00','#0000ff']) { el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})) } el.value = '#0000ff'; el.dispatchEvent(new Event('change', {bubbles:true})) })` | genau **ein** `ControlOrMeta+z` entfernt die komplette Hervorhebung (nicht nur den letzten Zwischenwert, keine Kette mehrerer Undo-Schritte nötig) — Regressionstest für Code-Fehler 2 (Abschnitt 2.2/4.4) |
| 4 | Gemischte Sequenz Tippen + mehrere Toolbar-Aktionen | Tippen, Fett, Tippen, Hervorhebung, je ein `Strg+Z` pro Schritt | jeder Undo-Schritt entfernt genau die zuletzt angewendete Einzeländerung |

### 2.5 Zwischenablage / Fremd-HTML mit ungültigen Farbwerten (Anforderung 2.7, Grenzfall 3.9)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Intern kopierter hervorgehobener Text behält Farbe | hervorgehobenen Text markieren, `ControlOrMeta+c`, Cursor woanders hin, `ControlOrMeta+v` | eingefügter Text hat dieselbe `background-color` |
| 2 | Externes HTML mit `background-color: yellow` (CSS-Farbname) | synthetisches `ClipboardEvent`/`paste`-Event mit `text/html`-Payload per `page.evaluate` auf den Editor dispatchen | eingefügter Text zeigt `background-color: rgb(255, 255, 0)` im DOM (kanonisch normalisiert, nicht der Rohstring „yellow") |
| 3 | Externes HTML mit `background-color: rgba(255,0,0,0.4)` | wie oben | eingefügter Text zeigt deckendes `rgb(255, 0, 0)` (Alpha normalisiert) |
| 4 | Externes HTML mit `background-color: transparent` bzw. ganz ohne Hintergrund | wie oben | **kein** `highlight`-Mark/keine `background-color` am eingefügten Text |
| 5 | Nach Einfügen von Fall 2/3: DOCX-Export bleibt gültiges XML | Export-Button klicken, Datei herunterladen | heruntergeladenes `word/document.xml` per `DOMParser` parsebar, `w:fill`-Attribut entspricht `^[0-9a-f]{6}$` (Regex-Prüfung) — bestätigt, dass die Normalisierung beim Einfügen bereits vor dem Export greift |

### 2.6 Rundreise — alle Pflichtszenarien aus Anforderung Abschnitt 4

Jedes Szenario prüft die **heruntergeladene Datei**
(`download.path()` → `fs.readFile` → `JSZip.loadAsync` → Ziel-XML aus dem Zip
lesen), nicht nur, dass der Editor nach Re-Import „irgendwie richtig aussieht".

| # | Szenario | Ablauf | Assertion an heruntergeladener Datei |
|---|---|---|---|
| 1 | DOCX-Eigenrundreise, Basisfall | Neu erstellen → tippen → markieren → Hervorhebungsfarbe `#ffff00` → Export → Re-Import (neue Seite/`setInputFiles` mit heruntergeladener Datei) | `word/document.xml` enthält exakt `<w:shd w:val="clear" w:color="auto" w:fill="ffff00"/>` im `w:rPr` des betroffenen Runs, kein anderer Run betroffen; nach Re-Import zeigt der Editor dieselbe Stelle weiterhin hervorgehoben | Anforderung 4.1.1/4.1.2 |
| 2 | ODT-Eigenrundreise | wie 1, aber ODT | `content.xml` enthält automatische Text-Formatvorlage mit `fo:background-color="…"`, referenziert über `text:style-name`; Re-Import bestätigt Farbe | Anforderung 4.2.1/4.2.2 |
| 3 | Hervorhebung + Fett + Schriftfarbe bei DOCX-Rundreise | alle drei setzen, Export, Re-Import | alle drei am selben Run erhalten, nicht auf getrennte Runs aufgeteilt | Anforderung 4.1.3 |
| 4 | Hervorhebung entfernt, dann exportiert | Farbe setzen, wieder entfernen, exportieren | kein `<w:shd>` mehr für diesen Run | Anforderung 4.1.4 |
| 5 | Hervorhebung über `hard_break` | Wort mit Umschalt+Enter in der Mitte, ganzes Wort hervorheben, exportieren, Re-Import | Hervorhebung auf beiden Seiten des Umbruchs erhalten | Anforderung 4.1.6 |
| 6 | Cross-Format ODT→DOCX | ODT mit Hervorhebung hochladen → als DOCX exportieren | `<w:shd>` mit korrektem Hex im Export | Anforderung 4.1.7 |
| 7 | Zwei Textläufe mit derselben Farbe bei ODT-Export | zwei getrennte, gleich gefärbte Textstellen | `content.xml` enthält **eine** gemeinsame Stildefinition (Prüfung per Zählen der `style:style`-Elemente mit `fo:background-color`), nicht zwei | Anforderung 4.2.3 |
| 8 | Hervorhebung + Fett bei ODT-Export | kombiniert | eine gemeinsame Stildefinition mit beiden Eigenschaften | Anforderung 4.2.4 |
| 9 | Hervorhebung entfernt bei ODT-Export | Farbe setzen, entfernen, exportieren | kein referenzierter Stil mit `fo:background-color` mehr | Anforderung 4.2.5 |
| 10 | Cross-Format DOCX→ODT | DOCX mit Hervorhebung (`<w:shd>`) hochladen → als ODT exportieren | Farbe bleibt erhalten in `content.xml` | Anforderung 4.2.6 |
| 11 | Doppelte Rundreise DOCX→ODT→DOCX | Upload DOCX → Export ODT → Re-Import ODT → Export DOCX | Farbe nach zwei Konvertierungen an exakt derselben Textstelle, gleicher Hex-Wert | Anforderung 4.3.1 |
| 12 | Doppelte Rundreise ODT→DOCX→ODT | analog, Startpunkt ODT | wie oben | Anforderung 4.3.2 |
| 13 | Unabhängige DOCX-Validierung | Datei aus Szenario 1 laden, `word/document.xml` **per Regex/`DOMParser`, nicht per `readDocx`** prüfen | `<w:shd\s+[^>]*w:fill="ffff00"[^>]*\/>` vorhanden, exakt am erwarteten `<w:r>` | Anforderung 4.1.1, unabhängiger Parser (DoD-Punkt 2) |
| 14 | Unabhängige ODT-Validierung | analog | `fo:background-color="#ffff00"` per Regex/`DOMParser` bestätigt | Anforderung 4.2.1, DoD-Punkt 2 |

### 2.7 Kritischer Importtest: reale, mit Word/LibreOffice erzeugte Hervorhebung (Grenzfall 3.7, kritisch)

Deckt den in der Anforderung als „kritisch" markierten Verdacht sowie
Abnahmekriterium 3 (zwingende Bestätigung/Widerlegung vor Abnahme) und
Code-Fix 4.6/4.7.

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | `bug57031.docx` hochladen (reale, native `<w:highlight w:val="lightGray"/>`) | `setInputFiles('tests/fixtures/external/docx/bug57031.docx')` in der DOCX-Karte | betroffener Textbereich zeigt im Editor `getComputedStyle(...).backgroundColor === 'rgb(192, 192, 192)'` (`#c0c0c0`) — **vor** dem Fix aus Code-Abschnitt 4.7 schlägt dieser Test erwartungsgemäß fehl (dokumentiert den Verlust), **nach** dem Fix grün |
| 2 | `bug65649.docx` hochladen | wie oben | analoge Assertion für den dort enthaltenen `<w:highlight>`-Wert |
| 3 | Unverändert re-exportieren nach Import von `bug57031.docx` | Import → sofort exportieren ohne Änderung | exportiertes `word/document.xml` enthält weiterhin `<w:shd w:fill="c0c0c0">` für dieselbe Stelle (App-eigener `<w:shd>`-Exportweg, unabhängig vom nativen `<w:highlight>`-Ursprung) |
| 4 | Ergebnis dokumentieren | — | Ergebnis (bestätigt/widerlegt, vor/nach Fix) wird in `textmarker-farbe-req.md` Grenzfall 3.7 nachgetragen (manueller Dokumentationsschritt, siehe Abschnitt 4 dieses Plans) |

### 2.8 Reale ODT-Fixtures (Anforderung 4.2.7)

| # | Fixture | Schritte | Assertion |
|---|---|---|---|
| 1 | `lostBackground.odt` (vorrangig) | hochladen | genau 4 sichtbare Hervorhebungen im Editor an den Texten „Dienstag", „Rot Und BOLD", „Text", „pfff", per `getComputedStyle` bestätigt — **kein** zusätzlicher, unsichtbarer Verlust (Name ist für dieses Feature irreführend, siehe Code-Abschnitt 2.3, aber Testfall verankert das als Regressionsschutz) |
| 2 | `coloredParagraph.odt` | hochladen | mindestens eine sichtbare Hervorhebung vorhanden (Farbwert vorab am realen Fixture ermittelt und hier fest verankert, nicht nur „irgendeine Farbe") |
| 3 | `character-styles.odt` | hochladen | erwartete Hervorhebung(en) laut vorab durchgeführter Inhaltsprüfung sichtbar |
| 4 | `TableFunkyBackground.odt` | hochladen | Hervorhebung in Tabellenzelle(n) sichtbar, kein Absturz beim Import von Tabellen mit Hintergrund |
| 5 | `text-color-from-paragraph.odt` | hochladen | Ergebnis geprüft und dokumentiert: falls diese Datei nur `fo:color` (Schriftfarbe) auf Absatzebene enthält, ohne `fo:background-color`, ist das **kein** Fall für dieses Feature — Testfall stellt sicher, dass fälschlich **keine** Hervorhebung erzeugt wird, wo keine im Original vorhanden war |
| 6 | `sameLocationSpansUsingMultipleTemplateStyles_BOLD-Outer-ITALIC-Inner-Text-Yellow.odt` | hochladen | Hervorhebung „Yellow" korrekt am verschachtelten Span erhalten, unabhängig von der Bold/Italic-Verschachtelung |

### 2.9 Weitere Grenzfälle (Anforderung Abschnitt 3, Rest)

| # | Fall | Test |
|---|---|---|
| 1 | Wiederholtes Entfernen ohne vorheriges Setzen | unformatierten Text markieren, „Entfernen" klicken → kein Fehler, kein leerer Undo-Schritt (per anschließendem `Strg+Z`, der etwas anderes/nichts Sichtbares rückgängig macht, geprüft) | Grenzfall 3.14 |
| 2 | Entfernen in leerem Listenpunkt/leerer Tabellenzelle | Liste/Tabelle einfügen, leeren Punkt/Zelle fokussieren, Hervorhebung setzen und entfernen ohne Text davor/danach | kein Rendering-Fehler, kein Crash | Grenzfall 3.10 |
| 3 | Kontrastfall Hervorhebung = Schriftfarbe | siehe 2.3 #3 | dokumentiert, kein Test-Fail |

### 2.10 Icon-Rendering (Bedienelement 4, Grenzfall/DoD-Punkt 8)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Icons sind als SVG gerendert (nach Fix aus Code-Abschnitt 4.4) | — | `getByLabel('Hervorhebungsfarbe').locator('..').locator('svg')` bzw. äquivalenter Locator für `EraserIcon`/`HighlighterIcon` vorhanden — **kein** reines Unicode-Emoji-Textknoten mehr als einziger visueller Träger |
| 2 | Vor dem Fix (Referenz-/Ausgangszustand, einmalig dokumentieren, kein Dauertest) | Rendering-Snapshot auf einem System ohne Standard-Emoji-Schriftart (z. B. per `page.emulateMedia`/Font-Override oder manuell) | Ergebnis (erkennbar/nicht erkennbar) einmalig in `textmarker-farbe-req.md` Bedienelement 4 nachgetragen, bevor der Fix als vollzogen gilt |
| 3 | `aria-label`/`title` weiterhin korrekt trotz SVG | — | Screenreader-Namen unverändert korrekt (`getByLabel(...)` funktioniert weiterhin) |

### 2.11 Design-Entscheidungs-Sichtprüfungen (Anforderung Abschnitt 5, Punkt 13/14)

Kein klassischer Pass/Fail-Test, sondern eine dokumentierte Entscheidung mit
begleitendem Regressionstest:

| # | Punkt | Nachweis |
|---|---|---|
| 1 | Grenzfall 3.8 (`w:shd` statt `w:highlight`) | Abschnitt 1.2 Testfall 8 (kein `<w:highlight>` im Standardexport) + Abschnitt 1.6 manuelle Word-Prüfung; Entscheidung in `textmarker-farbe-req.md`/`-code.md` bereits als bewusster Kompromiss dokumentiert (Code-Abschnitt 3.3/5) |
| 2 | Abschnitt 2.3 (Zustandsanzeige) | Abschnitt 2.2 dieses Plans (vollständig als „nachgerüstet", nicht „bewusst fehlend" nachgewiesen) |

---

## 3. Zuordnung Anforderung → Test (Abnahme-Mapping)

| Anforderungs-Abschnitt | Testebene(n) | Datei(en) |
|---|---|---|
| 1 (Bedienelemente 1-7) | Unit + E2E | `commands.test.ts` §1.5, `highlight.spec.ts` §2.1/2.2/2.10 |
| 2.1 (Anwenden auf Selektion) | E2E | `highlight.spec.ts` §2.1, §2.2 #6 |
| 2.2 (kein Caret-Mode, No-Op-Feedback) | E2E | `highlight.spec.ts` §2.2 #1-2 |
| 2.3 (Zustandsanzeige) | Unit + E2E | `commands.test.ts` §1.5, `highlight.spec.ts` §2.2 #3-7 |
| 2.4 (Kombination mit anderen Marks) | Unit + E2E | `docx/highlight.test.ts` #11-12, `highlight.spec.ts` §2.3 |
| 2.5 (Kontrast Schrift-/Hervorhebungsfarbe) | E2E | `highlight.spec.ts` §2.3 #3 |
| 2.6 (Entfernen, Weiß-Sonderfall) | Unit + E2E | `odt/highlight.test.ts` #8, `highlight.spec.ts` §2.1 #2 |
| 2.7 (Zwischenablage) | E2E | `highlight.spec.ts` §2.5 |
| 2.8 (Undo/Redo, Event-Granularität) | E2E (Chromium+Firefox) | `highlight.spec.ts` §2.4 |
| 3.1 (leere Selektion) | Unit + E2E | `commands.test.ts` #1/#7, `highlight.spec.ts` §2.2 #1-2 |
| 3.2 (gemischte Selektion) | Unit + E2E | `commands.test.ts` #4-5, `highlight.spec.ts` §2.2 #5-6 |
| 3.3 (Bild-/Tabellengrenze) | Unit + E2E | `commands.test.ts` #6, `highlight.spec.ts` §2.3 #4 |
| 3.4/3.12 (Kontrastproblem) | E2E | `highlight.spec.ts` §2.3 #3, dokumentiert |
| 3.5 (erneutes Setzen derselben Farbe) | E2E | `highlight.spec.ts` §2.1 #4 |
| 3.6 (Weiß ≠ keine Hervorhebung) | Unit | `odt/highlight.test.ts` #8 |
| 3.7 (natives `<w:highlight>` beim Import, kritisch) | Unit + E2E | `docx/highlight.test.ts` #3,6,7; `highlight.spec.ts` §2.7 |
| 3.8 (`w:shd`-Kompromiss) | Unit + manuell | `docx/highlight.test.ts` #8; `qa.md` §1.6/2.11 |
| 3.9 (ungültige Fremdfarbwerte) | Unit + E2E | `color.test.ts`; `docx/highlight.test.ts` #15-16; `highlight.spec.ts` §2.5 |
| 3.10 (leerer Listenpunkt/Zelle) | Unit + E2E | `docx/highlight.test.ts` #18; `highlight.spec.ts` §2.9 #2 |
| 3.11 (schnelles Ziehen im Farbwähler) | E2E | `highlight.spec.ts` §2.4 #3 |
| 3.13 (ODT Absatz- vs. Zeichenhintergrund) | Unit | `odt/highlight.test.ts` #12 |
| 3.14 (wiederholtes Entfernen ohne Setzen) | E2E | `highlight.spec.ts` §2.9 #1 |
| 4.1 (DOCX-Rundreise 1-7) | Unit + E2E | `docx/highlight.test.ts`; `highlight.spec.ts` §2.6 #1,3-6,11,13 |
| 4.2 (ODT-Rundreise 1-7) | Unit + E2E | `odt/highlight.test.ts`; `highlight.spec.ts` §2.6 #2,7-10,12,14; §2.8 |
| 4.3 (doppelte Rundreise) | E2E | `highlight.spec.ts` §2.6 #11-12 |
| 5 (alle 14 E2E-Testfälle der Anforderung) | E2E | vollständig auf `highlight.spec.ts` §2.1-2.11 abgebildet, siehe Zeilen oben |
| 6 (DoD 1-8) | Unit + E2E + manuell | Abschnitt 4 dieses Plans |

---

## 4. Abnahme-Checkliste (vor Statuswechsel „vorhanden (nicht vertrauenswürdig)" → „verifiziert")

- [ ] `npm test` grün, inkl. `docx/__tests__/highlight.test.ts`,
      `odt/__tests__/highlight.test.ts`, `shared/__tests__/color.test.ts`,
      `shared/editor/__tests__/commands.test.ts` (neu/ergänzt).
- [ ] `npm run test:e2e` grün, inkl. `tests/e2e/highlight.spec.ts`, auf
      mindestens Chromium- **und** Firefox-Projekt (Pflicht für Abschnitt 2.4,
      Event-Granularität).
- [ ] Kein Test in `highlight.spec.ts` ruft `readDocx`/`writeDocx`/`readOdt`/
      `writeOdt`/`applyMarkColor`/`clearMarkColor`/`colorMarkStateFor`/
      `normalizeCssColor` direkt auf — stichprobenartig per Review bestätigt.
- [ ] Jeder Grenzfall aus Anforderung Abschnitt 3 (3.1-3.14) hat mindestens
      einen grünen Test, der ihn entweder als „bestätigt funktionsfähig" oder
      als „Fehler behoben, mit Regressionstest" schließt.
- [ ] Alle Rundreise-Anforderungen aus Abschnitt 4 (4.1.1-4.1.7, 4.2.1-4.2.7,
      4.3.1-4.3.3) grün, inklusive der beiden unabhängigen XML-Validierungen
      (Abschnitt 2.6 #13-14 dieses Plans).
- [ ] **Kritischer Punkt (Abnahmekriterium 3 der Anforderung):** Grenzfall 3.7
      (natives `<w:highlight>` beim Import) ist mit `bug57031.docx` **und**
      `bug65649.docx` bestätigt oder widerlegt, Ergebnis in
      `textmarker-farbe-req.md` nachgetragen (Abschnitt 2.7 dieses Plans).
- [ ] Grenzfall 3.8 (`w:shd`-statt-`w:highlight`-Kompromiss) ist als bewusste
      Design-Entscheidung dokumentiert, inklusive einmaliger manueller
      Verifikation in echtem Microsoft Word (Abschnitt 1.6/2.11 #1).
- [ ] Zustandsanzeige (Abschnitt 2.3, Bedienelement 1/5) ist entweder
      nachgerüstet und mit grünen Tests belegt (Abschnitt 2.2 dieses Plans)
      oder ausdrücklich als bewusst nicht vorhanden dokumentiert.
- [ ] Rückmeldung bei leerer Selektion (Grenzfall 3.1) ist entweder behoben
      (deaktivierte Steuerelemente, Abschnitt 2.2 #1-2) oder als bewusst so
      gewolltes Verhalten dokumentiert.
- [ ] Umgang mit ungültigen/untypischen Fremdfarbwerten (Grenzfall 3.9) ist
      geklärt: `normalizeCssColor`-Unit-Tests grün **und** E2E-Nachweis, dass
      daraus kein ungültiges OOXML entstehen kann (Abschnitt 1.4, 2.5 #5).
- [ ] Icon-Rendering-Risiko (Bedienelement 4) bewertet: entweder auf SVG
      umgestellt und nachgewiesen (Abschnitt 2.10 #1/#3) oder bewusst
      beibehalten mit dokumentiertem Restrisiko.
- [ ] Für jeden in `textmarker-farbe-code.md` Abschnitt 2 benannten,
      zusätzlich gefundenen Fehler (fehlendes XML-Escaping, Event-Granularität
      des Farbwählers, ODT-Absatzstil-Lücke A, Reihenfolge-Abhängigkeit
      Lücke B) liegt ein Fix mit grünem Regressionstest vor — Zuordnung siehe
      Abschnitt 3 dieses Plans (Zeilen 2.1/2.2/3.9/3.10/3.13 sowie
      `docx/highlight.test.ts` #15-17, `odt/highlight.test.ts` #7/9/10).
- [ ] Manuelle Einmalvalidierung einer exportierten Test-DOCX/-ODT mit
      Hervorhebungsfarbe gegen `python-docx`/echtes Microsoft Word bzw.
      LibreOffice durchgeführt und Ergebnis vermerkt (Abschnitt 1.6).
</content>
