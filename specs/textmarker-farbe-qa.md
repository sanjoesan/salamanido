# Testplan „Texthervorhebungsfarbe" — QA-Verifikation

Gegenstück zu `specs/textmarker-farbe-req.md` (Anforderung) und
`specs/textmarker-farbe-code.md` (Umsetzungsplan). Legt fest, **welche Tests**
geschrieben werden, **wo** sie liegen, **wie** sie deterministisch ausgeführt
werden und **wann** ein Punkt als abgehakt gilt. Zwei Ebenen, die sich ergänzen,
aber **keine ersetzen darf**:

1. **Unit-Tests** (Vitest, `jsdom`) für die Reader/Writer-Rundreise auf
   Daten-/XML-Ebene — schnell, präzise, aber blind gegenüber Toolbar,
   Farbwähler-Bedienung, echtem Datei-Dialog und echtem Undo-Stack im Browser.
2. **Echte Playwright-Browser-Tests** — Klicks auf den tatsächlichen
   Farbwähler (`<HighlighterIcon/>`, `aria-label="Hervorhebungsfarbe"`) und
   „Entfernen"-Button (`<EraserIcon/>`, `aria-label="Hervorhebung entfernen"`),
   echte Tastatureingabe, echter `setInputFiles()`-Upload, echter
   `page.waitForEvent('download')`-Export und Prüfung der **tatsächlich
   heruntergeladenen Datei** (nicht nur ein interner Aufruf von
   `readDocx`/`readOdt`/`writeDocx`/`writeOdt`/`applyMarkColor`/
   `colorMarkStateFor`).

Ein Test, der nur `readDocx(buffer)`/`writeOdt(doc)`/`applyMarkColor(...)`
direkt aufruft, zählt **nicht** als Ebene 2, auch wenn er in `tests/e2e/`
liegt. Beide Ebenen sind laut `textmarker-farbe-req.md` Abschnitt 6 (DoD-Punkt
1: „echte Browser-Interaktion, nicht nur Unit-/Command-Ebene") Pflicht für die
Abnahme.

> **Revisionshinweis (dieser Durchlauf — was ggü. der Vorfassung dieses
> QA-Plans korrigiert wurde).** Die Vorfassung war inhaltlich breit, aber an
> mehreren lasttragenden Stellen gegen einen **veralteten** Codeplan
> geschrieben und hätte so grüne Tests gegen roten Code (oder umgekehrt)
> erzeugt. Konkret korrigiert:
> 1. **„Writer wirft bei ungültiger Farbe" ist falsch.** `textmarker-farbe-code.md`
>    §4.8b/§4.10/§5.6 wurde ausdrücklich **von Throw auf anmutiges Weglassen**
>    (graceful degradation) revidiert: eine ungültige Farbe wird **weggelassen**,
>    Run/Text bleiben erhalten, das XML bleibt valide, **kein** Throw. Die
>    Vorfassung (Testfälle §1.2 #15/#16, §1.3 #9) erwartete einen Throw und wäre
>    gegen den tatsächlich gebauten Code **rot** gewesen. Korrigiert.
> 2. **Eigener `setNativeColor`-Helper entfernt.** Die Vorfassung erfand einen
>    Helper (`el.value = v` + nur `change`), der (a) Anforderung §5/Codeplan §6.1
>    („den vorhandenen `pickColor`-Helper **wiederverwenden**, nicht neu
>    erfinden") widerspricht und (b) für Reacts controlled Input **unsichtbar**
>    ist (Reacts value-Tracker fängt den Property-Setter ab). Ersetzt durch den
>    real existierenden `pickColor` aus `tests/e2e/clipboard.spec.ts:34-47`
>    (prototypischer Setter + `input`+`change`).
> 3. **Determinismus/Selektions-Sync fehlte komplett.** Der Auftrag verlangt
>    ausdrücklich race-freie Tests. Der Plan nutzt jetzt durchgängig den bereits
>    im Repo etablierten `settle(page)`-Helfer (= `page.waitForTimeout(50)`, s.
>    `selection-regression.spec.ts`, `cut.spec.ts`, `clipboard.spec.ts`) nach
>    jeder asynchronen Caret-/Selektionsänderung. Neuer Abschnitt 2.0.1.
> 4. **Firefox-Abdeckung war unter der realen `playwright.config.ts` nicht
>    erreichbar.** Die Firefox-/WebKit-Desktop-Projekte matchen dort nur
>    `/clipboard.*\.spec\.ts/`; eine neue `highlight.spec.ts` liefe **nur** auf
>    Desktop Chrome + Mobile (Chromium) + Tablet (WebKit). Der Plan schreibt
>    jetzt die nötige Config-Erweiterung vor (Abschnitt 2.0.2).
> 5. **Fehlende Grenzfälle ergänzt:** 3.14 (ODT `office:styles`/benannte
>    Zeichenformatvorlagen, DoD 9), 3.16 (Groß-/Kleinschreibung + Style-Dedup),
>    3.17 (CT_RPr-Kindelement-Reihenfolge + strikte Schema-Prüfung, DoD 8). Die
>    kombinierten Marks-Tests enthalten jetzt **Unterstrichen**, weil erst `u`
>    die Reihenfolgeverletzung aus 3.17 auslöst.
> 6. **Grenzfall-Nummern richtiggestellt** (Vorfassung labelte „wiederholtes
>    Entfernen" als 3.14 — es ist 3.15) und das DoD-Mapping auf **alle 10**
>    Punkte erweitert (Vorfassung: nur 1-8).
> 7. **`coloredParagraph.odt` korrigiert** gemäß Codeplan §6.1.10: dessen
>    `fo:background-color="#92D050"` sitzt an einem `family="text"`-Stil → es ist
>    eine **echte** Zeichen-Hervorhebung (`#92d050`), **kein** „Absatzhintergrund,
>    nicht verwechseln"-Fall. Der echte Grenzfall 3.13 (Absatzhintergrund) wird
>    über eine **synthetische** Datei geprüft (§1.3 #12).

> **Zweite Re-Verifikation / Synchronisation mit der aktuellen Anforderung
> (dieser Durchlauf).** Alle im Plan genannten Repo-Fundstellen erneut einzeln
> gegen den Ist-Stand gelesen — die `pickColor`-/`settle`-/`watchForConsoleErrors`-
> Helfer (`clipboard.spec.ts:30-47`), das Download-Lesemuster
> (`docx.spec.ts:79-88`), `buildSampleDocx()` (`docx.spec.ts:16`), die
> `playwright.config.ts`-Projektmatrix (Firefox/WebKit-Desktop matchen **nur**
> `clipboard.*\.spec\.ts`) und die aktuellen Toolbar-`aria-label`
> (`Hervorhebungsfarbe`/`Hervorhebung entfernen`) sind **bestätigt korrekt**.
> **Kern-Korrektur dieses Durchlaufs:** Die Vorfassung dieses QA-Plans war — wie
> zuvor schon die Code-Vorfassung — gegen eine **ältere** Fassung von
> `textmarker-farbe-req.md` geschrieben (Grenzfälle nur 3.1-3.17, DoD nur 1-10,
> „15 E2E-Testfälle"). Die Anforderung wurde seitdem um **3.18** (ungewollte
> schwarze Hervorhebung durch den ungebundenen Chip), **3.19** (fehlendes
> XML-Escaping von `w:fill` → *nicht wohlgeformtes* DOCX) und **3.20**
> (alternatives ODT-Attribut `style:text-background-color`) sowie die zugehörigen
> Abnahmekriterien **DoD 11-13** erweitert; ihre E2E-Liste in Abschnitt 5 umfasst
> jetzt **18** statt 15 Fälle. Diese Punkte fehlten hier **vollständig**. Ergänzt:
> Unit-Test §1.3 #15 (3.20, synthetisch), E2E §2.2 #8 (3.18 `#000000`-Guard),
> E2E §2.5 #7 (3.19 Wohlgeformtheit nach präpariertem Paste), E2E §2.8 #7 (3.20
> reale, fixture-abhängige Prüfung); Mapping (Abschnitt 3) auf Grenzfälle **1-20**
> und **DoD 1-13** korrigiert; Checkliste (Abschnitt 4) um **DoD 11-13** ergänzt.
> Der Code-Plan deckte 3.18-3.20/DoD 11-13 bereits ab (`textmarker-farbe-code.md`
> §3.6/§4.8b/§4.9c, §6.1.15/§6.4/§6.7, §7 „alle 13 Punkte") — dieser QA-Plan zieht
> nun nach, statt hinter dem Code-Plan zurückzubleiben.

Referenzierte reale Fixtures (alle bereits im Repo vorhanden, **kein**
künstliches Beispiel nötig):
`tests/fixtures/external/docx/bug57031.docx` (`<w:highlight w:val="lightGray"/>` +
zusätzlich nahezu weiße `<w:shd>`-Schattierungen, siehe Codeplan §4.7),
`tests/fixtures/external/docx/bug65649.docx` (`<w:highlight>` mit
`yellow`/`green`/`cyan`),
`tests/fixtures/external/odt/lostBackground.odt`,
`tests/fixtures/external/odt/coloredParagraph.odt`,
`tests/fixtures/external/odt/character-styles.odt`,
`tests/fixtures/external/odt/TableFunkyBackground.odt`,
`tests/fixtures/external/odt/text-color-from-paragraph.odt`,
`tests/fixtures/external/odt/sameLocationSpansUsingMultipleTemplateStyles_BOLD-Outer-ITALIC-Inner-Text-Yellow.odt`.

Dieser Plan geht davon aus, dass die in `textmarker-farbe-code.md` Abschnitt 4
beschriebenen Fixes (Zustandsanzeige, natives `change`-Ereignis statt Reacts
`onChange`, `<w:highlight>`-Import, `escapeXml`+`safeHex`-Weglassen, CT_RPr-
Reihenfolge, ODT-Absatzstil-Lücke A, `office:styles`-Lücke C, Dedup-Härtung B,
SVG-Icons) **vor** dem finalen grünen Lauf dieser Suite umgesetzt sind (siehe
`textmarker-farbe-code.md` Abschnitt 8, Reihenfolge der Umsetzung). Tests, die
bewusst aktuelles, noch **nicht** behobenes Verhalten dokumentieren (z. B. der
kritische Verlust aus Grenzfall 3.7 **vor** dem Fix), sind als solche markiert
und dienen als Vorher/Nachher-Beleg, nicht als Dauerzustand.

---

## 0. Ausführung

| Ebene | Befehl | Neue/geänderte Dateien |
|---|---|---|
| Unit | `npm test` (`vitest run`, `environment: 'jsdom'`) | Abschnitt 1 |
| Browser/E2E | `npm run test:e2e` (`playwright test`) | Abschnitt 2 |

Beide Suiten müssen grün sein, bevor „Texthervorhebungsfarbe" laut DoD
(Anforderung Abschnitt 6) als „verifiziert" gilt. Empfohlene Reihenfolge:
zuerst die Fixes aus `textmarker-farbe-code.md` Abschnitt 4/8 umsetzen (sonst
schlagen mehrere hier verlangte Tests erwartungsgemäß fehl), **je Fix sofort**
den zugehörigen Unit-Test ergänzen (Codeplan §8 sieht das explizit vor, deckt
sich mit der Repo-Vorgabe „nach jeder abgeschlossenen Akzeptanz committen"),
danach die E2E-Suite, danach gemeinsamer Lauf beider Suiten gegen den
vollständig gefixten Code.

---

## 1. Unit-Tests: Reader/Writer-Rundreise (DOCX + ODT)

Ziel: jede Rundreise-Behauptung aus Anforderung Abschnitt 4 sowie jeder
Reader-/Writer-Grenzfall aus Abschnitt 3 auf Daten-/XML-Ebene isoliert,
deterministisch und ohne Browser nachweisen. Diese Ebene prüft **Funktionen
direkt** (`readDocx`, `writeDocx`, `readOdt`, `writeOdt`, `normalizeCssColor`,
`colorMarkStateFor`) — das ist hier ausdrücklich erlaubt und richtig, weil sie
durch die Playwright-Ebene (Abschnitt 2) **ergänzt, nicht ersetzt** wird.

**Unabhängigkeits-Regel für Rundreisen (Codeplan §7 DoD 2):** wo eine Rundreise
den **Export** prüft, wird das erzeugte `word/document.xml`/`content.xml` per
`DOMParser`/gezieltem Attribut-Zugriff geprüft — **nicht** durch erneutes
`readDocx`/`readOdt` desselben Projekts, damit sich Schreib-/Lesefehler nicht
gegenseitig ausgleichen. Wo eine Rundreise den **Import** prüft, wird die
Eingabedatei entweder per JSZip von Hand gebaut oder aus `tests/fixtures/external/`
genommen — **niemals** eine mit dem eigenen Writer erzeugte Datei.

### 1.1 Bestehende Abdeckung (Referenz, laut Auftrag nicht vertrauenswürdig)

`src/formats/docx/__tests__/roundtrip.test.ts:100-117` und
`src/formats/odt/__tests__/roundtrip.test.ts:102-119` („preserves text color
and highlight color") decken `highlight` bereits in Kombination mit
`textColor` ab (`color: '#ffff00'`), aber ausschließlich über direkt
konstruiertes `ProseMirrorJSON`, nicht über echte Reader-Eingabe (XML) oder
echte Editor-Bedienung. Bleiben unverändert bestehen, werden durch die neuen
Dateien unten **ergänzt**, nicht dupliziert. Zählen weiterhin **nicht** als
Nachweis für Abnahmekriterium 1 der Anforderung (das verlangt echte
Browser-Interaktion).

### 1.2 Neu: `src/formats/docx/__tests__/highlight.test.ts`

Reader-/Writer-Rundreise und -Grenzfälle für DOCX, je über eine minimal per
JSZip gebaute `.docx`-Datei (Muster: `buildDocxWithRun(rPrXml, text)`, analog zu
`buildSampleDocx()` in `tests/e2e/docx.spec.ts:16`) und `readDocx(blob)` bzw.
`writeDocx(doc)`. Export-Assertions gehen über `DOMParser`, nicht über den
eigenen Reader.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | `<w:shd>` wird gelesen (Basisfall) | `<w:rPr><w:shd w:val="clear" w:color="auto" w:fill="FFFF00"/></w:rPr>` | `highlight`-Mark `color: '#ffff00'` (kanonisch klein) | `docx/reader.ts:100-115` |
| 2 | `<w:shd w:fill="auto">` erzeugt **kein** Mark | wie oben, `w:fill="auto"` | kein `highlight`-Mark | bestehende Ausschlussregel |
| 3 | `<w:highlight w:val="lightGray"/>` **ohne** `<w:shd>` wird gelesen | `<w:rPr><w:highlight w:val="lightGray"/></w:rPr>` | `highlight`-Mark `#c0c0c0` | Fix §4.6/4.7, behebt Grenzfall 3.7 |
| 4 | `<w:highlight w:val="none"/>` erzeugt **kein** Mark | wie oben | kein `highlight`-Mark | `hexFromWordHighlightName('none') === null` |
| 5 | `<w:shd>` **und** `<w:highlight>` gleichzeitig, unterschiedliche Werte | `<w:shd w:fill="00FF00"/><w:highlight w:val="yellow"/>` | `<w:shd>` gewinnt (`#00ff00`) | Vorrangregel §4.7 |
| 6 | Reale Fixture `bug57031.docx` | Datei einlesen | **Anwesenheit** einer `highlight`-Mark mit `#c0c0c0` (nicht „genau eine" — die Datei trägt zusätzlich nahezu weiße `<w:shd>`-Schattierungen, Caveat §4.7) | Grenzfall 3.7/4.1.5, echte Drittdatei |
| 7 | Reale Fixture `bug65649.docx` | Datei einlesen (erwartete Hex-Werte vorab per Skript aus dem Fixture ermittelt und hier fest verankert: `yellow→#ffff00`, `green→#00ff00`, `cyan→#00ffff`) | `highlight`-Marks mit den erwarteten Hex-Werten vorhanden | zweite unabhängige Belegdatei |
| 8 | Export: `highlight` → `<w:shd>` ohne `<w:highlight>` (Standardexport) | PM-Doc mit `highlight` `#ffff00` → `writeDocx` | erzeugtes `word/document.xml` per `DOMParser`: genau ein `<w:shd w:val="clear" w:color="auto" w:fill="ffff00"/>`, **kein** `<w:highlight>` (sofern die optionale Palettenrückrichtung §4.8a **nicht** greift, d. h. Farbe **nicht** in der 16-Werte-Palette) | Anforderung 4.1.1, Grenzfall 3.8 |
| 9 | Optionale `<w:highlight>`-Palettenrückrichtung (nur falls §4.8a aktiv) | Farbe exakt `#ffff00` (Palettenwert) | zusätzlich `<w:highlight w:val="yellow"/>` **an korrekter CT_RPr-Position** (zwischen `color` und `u`) | optionaler Teil §3.3/4.8a |
| 10 | Export enthält **kein** `<w:shd>` nach Entfernen | Mark entfernt → Export | kein `<w:shd>` für betroffenen Run | Anforderung 4.1.4 |
| 11 | **CT_RPr-Reihenfolge / Grenzfall 3.17 (kritisch, DoD 8):** Hervorhebung + **Unterstrichen** + Schriftfarbe + Durchgestrichen auf **einem** Run, echte `state.tr.addMark`-Sequenz über `wordSchema` | vier Marks auf einem Textknoten → `writeDocx` | **ein** `<w:r>`; die Kind-Local-Names von `<w:rPr>` in Dokumentreihenfolge sind eine **Teilfolge** der kanonischen `CT_RPr`-Ordnung `[b, i, strike, color, highlight, u, shd]` (konkret hier: `strike, color, u, shd`); explizit geprüft, dass `u` **nach** `strike`/`color` und `shd` **zuletzt** steht — plus „strikte" Ordnungsprüfung gemäß §1.7 | Grenzfall 3.17/DoD 8, Anforderung 4.1.3 |
| 12 | Kombination Hervorhebung + Fett + Schriftfarbe (ohne `u`) auf einem Run | drei Marks auf einem Textknoten (`tr.addMark`) | ein `<w:r>` mit `<w:b/>`, `<w:color/>`, `<w:shd/>` gemeinsam, kein Aufsplitten | Anforderung 4.1.3, 2.4 |
| 13 | Reihenfolge-Unabhängigkeit beim Anwenden | Test A: erst Farbe dann Fett; Test B: erst Fett dann Farbe (`tr.addMark`) | identisches `<w:rPr>` in beiden Fällen | Anforderung 2.4 |
| 14 | Hervorhebung über `hard_break` hinweg | Wort mit `hard_break` in der Mitte, beide Seiten hervorgehoben | Export erhält Hervorhebung auf beiden Seiten des Umbruchs | Anforderung 4.1.6 |
| 15 | Cross-Format ODT→DOCX | mit `readOdt` gelesenes Dokument mit `highlight`-Mark → `writeDocx` | `<w:shd>` mit korrektem Hex im Export | Anforderung 4.1.7 |
| 16 | **Ungültiger Farbwert an `writeDocx` (revidiert: Weglassen, NICHT Throw)** | PM-Doc mit `highlight` `color: 'yellow'` (Nicht-Hex, umgeht die `parseDOM`-Normalisierung, z. B. direkt konstruiertes JSON) | `writeDocx` **wirft nicht**; erzeugtes `word/document.xml` ist per `DOMParser` parsebar, Run/Text erhalten, aber **kein** `<w:shd>`/`w:fill` für diesen Run (Farbe anmutig weggelassen, `safeHex → null`) | Grenzfall 3.9, Fehler 1, §4.8b |
| 17 | **XML-Injection-Regressionstest (revidiert)** | `color: '#ff0000"><w:sz w:val="999"/><w:shd w:fill="'` bzw. Werte mit `"`/`<`/`&` an `writeDocx` | **kein** Throw, **kein** strukturell kaputtes XML: erzeugtes `word/document.xml` bleibt per `DOMParser` parsebar; der ungültige Wert erzeugt **kein** rohes Markup (via `safeHex`-Weglassen; `escapeXml` als zweite Verteidigungslinie) | Fehler 1, §2.1/4.8b |
| 18 | Reihenfolge-unabhängiger Merge (Lücke B) | zwei benachbarte Textknoten, identische Markkombination, Marks als `[highlight, textColor]` vs. `[textColor, highlight]` (`Node.fromJSON`) | genau **ein** `<w:r>` im Export (nicht zwei), Regressionstest `marksKey`-Fix | Lücke B, §2.4/4.8c |
| 19 | **Groß-/Kleinschreibung (Grenzfall 3.16)** | Fixture-artige Eingabe mit `w:fill="FFFF00"` (groß) | Reader liefert `#ffff00` (klein); Rundreise/Vergleich case-insensitiv; keine fälschliche „Abweichung" | Grenzfall 3.16 |
| 20 | Leerer Listenpunkt/leere Tabellenzelle mit Hervorhebung entfernt | Mark auf leerem Textknoten gesetzt/entfernt | kein leerer `<w:r>` ohne Inhalt im Export, kein Absturz | Grenzfall 3.10 |

### 1.3 Neu: `src/formats/odt/__tests__/highlight.test.ts`

Analog für ODT, über `buildOdt(automaticStylesXml, bodyXml)` (JSZip von Hand,
Muster `buildSampleOdt()`) und `readOdt(blob)`/`writeOdt(doc)`. Export-Assertions
per `DOMParser` auf `content.xml`, nicht über den eigenen Reader.

| # | Testfall | Eingabe | Erwartung | Deckt |
|---|---|---|---|---|
| 1 | `fo:background-color` in `style:family="text"` wird gelesen | Automatikstil mit `fo:background-color="#ffff00"`, referenziert von `text:span` | `highlight`-Mark `#ffff00` | `odt/reader.ts:37-78,110` |
| 2 | Export erzeugt `fo:background-color` in `style:text-properties`, referenziert via `text:style-name` | PM-Doc mit `highlight` → `writeOdt` | `content.xml` enthält passenden Automatikstil samt `text:span` | Anforderung 4.2.1 |
| 3 | Zwei Textläufe, identische Farbe (sonst keine Marks) | zwei Textknoten, gleiche Farbe | `TextStyleRegistry` erzeugt **eine** gemeinsame Stildefinition, nicht zwei | Anforderung 4.2.3 |
| 4 | Hervorhebung + Fett kombiniert | ein Textknoten mit beiden Marks | eine gemeinsame Stildefinition mit beiden Eigenschaften | Anforderung 4.2.4 |
| 5 | Hervorhebung entfernt | Export nach Entfernen | kein Stil mit `fo:background-color` mehr referenziert | Anforderung 4.2.5 |
| 6 | Cross-Format DOCX→ODT | mit `readDocx` gelesenes Dokument (`<w:shd>`-Ursprung) → `writeOdt` | Farbe exakt erhalten | Anforderung 4.2.6 |
| 7 | Reihenfolge-Unabhängigkeit der Dedup-Schlüssel (Lücke B) | zwei Läufe mit `[highlight, textColor]` vs. `[textColor, highlight]` als Mark-Array-Reihenfolge | **eine** gemeinsame Stildefinition (nicht zwei), Regressionstest `styleNameFor`-Fix | Lücke B, §2.4/4.11 |
| 8 | `highlight` `#ffffff` (Weiß) rundreist als explizit gesetzte Farbe | Weiß-Mark, kein anderer Text hervorgehoben | nach Export+Re-Import weiterhin `highlight` `#ffffff`, unterscheidbar von Text **ganz ohne** Mark | Grenzfall 3.6 |
| 9 | **Ungültiger Farbwert an `writeOdt` (revidiert: Weglassen, NICHT Throw)** | `color: 'yellow'` statt Hex | `writeOdt` **wirft nicht**; `content.xml` valide, Text erhalten, aber **kein** `fo:background-color` für diesen Lauf (Farbe weggelassen, `safeHex → null`) | §4.10 |
| 10 | **Lücke A (Regressionstest):** `style:family="paragraph"`-Stil mit `style:text-properties fo:background-color`, referenziert von `<text:p>` mit **direktem, nicht span-verpacktem, sichtbarem Text** | synthetisches `content.xml` (JSZip von Hand; `writeOdt` erzeugt diesen ODF-Fall selbst nie, siehe Codeplan §6.4) | `highlight`-Mark auf dem direkten Absatztext gesetzt | §2.3/4.9a, architektonische Lücke |
| 11 | **Lücke C / Grenzfall 3.14 (DoD 9):** Hervorhebung über eine **benannte Zeichenformatvorlage** in `office:styles` (statt `office:automatic-styles`) | synthetisches `content.xml`/`styles.xml` mit `office:styles`-Textstil, referenziert von `text:span` | `highlight`-Mark gesetzt (nach Fix §4.9b) | Grenzfall 3.14/DoD 9 |
| 12 | **Absatz-Hintergrund NICHT als Zeichen-Hervorhebung (Grenzfall 3.13)** | synthetisches `content.xml` mit `fo:background-color` **nur** auf `style:paragraph-properties`, **nicht** auf `style:text-properties` | **kein** `highlight`-Mark auf dem Text | Grenzfall 3.13 |
| 13 | Regressionstest `lostBackground.odt` (dokumentiert **bereits korrektes** Verhalten) | Fixture einlesen | exakt 4 `highlight`-Marks an „Dienstag"/„Rot Und BOLD"/„Text"/„pfff" mit `#ffff00`/`#ff0000`/`#ffc000`/`#ffc000` (case-insensitiv); die 8 verwaisten, unreferenzierten `background-color`-Automatikstile erzeugen **keine** zusätzlichen Marks | §2.3, Schutz gegen naiven „alle Stile mit `background-color`"-Refactor |
| 14 | `coloredParagraph.odt` — **echte** Zeichen-Hervorhebung (korrigiert) | Fixture einlesen | `highlight`-Mark `#92d050` vorhanden (die `fo:background-color` sitzt an einem `family="text"`-Stil — **kein** Absatzhintergrund-Verwechslungsfall, Codeplan §6.1.10) | §2.3-Klarstellung |
| 15 | **Alternatives Attribut `style:text-background-color` (Grenzfall 3.20, DoD 13)** | synthetisches `content.xml`: `family="text"`-Automatikstil mit `style:text-background-color="#ffff00"` (statt `fo:background-color`), referenziert von `text:span`; zusätzlich Gegenprobe `style:text-background-color="transparent"` | Reader liefert `highlight`-Mark `#ffff00` (nach Fix §4.9c); der `transparent`-Wert erzeugt **kein** Mark (nicht als Farbe `"transparent"` durchgereicht) | Grenzfall 3.20/DoD 13, Fix §4.9c |

### 1.4 Neu: `src/formats/shared/__tests__/color.test.ts`

Unit-Tests für `normalizeCssColor` (Codeplan §4.1), reiner Funktionsaufruf,
kein Editor/DOM außer dem internen jsdom-Probe-Element. Erwartete Ergebnisse
sind in Codeplan §0 direkt am jsdom-Build belegt.

| # | Eingabe | Erwartung |
|---|---|---|
| 1 | `#ffff00`, `#FFFF00` | `'#ffff00'` (kanonisch klein) |
| 2 | `#ff0` (3-stellig) | `'#ffff00'` |
| 3 | `yellow`, `rebeccapurple` (benannte CSS-Farben) | `'#ffff00'` / `'#663399'` |
| 4 | `rgb(255, 255, 0)` | `'#ffff00'` |
| 5 | `rgba(255, 0, 0, 0.5)` | `'#ff0000'` (Alpha auf deckend normalisiert, **nicht** `null`) |
| 6 | `rgba(255, 0, 0, 0)` | `null` (voll transparent → keine Hervorhebung) |
| 7 | `transparent` | `null` |
| 8 | `hsl(120, 100%, 50%)` | `'#00ff00'` |
| 9 | `"not-a-color"`, `""`, `"42"` | `null` (kein Absturz) |
| 10 | `"javascript:alert(1)"` bzw. Werte mit `"`/`<`/`&` | `null` oder reines Hex ohne Metazeichen — **niemals** der Rohwert unverändert durchgereicht (schützt Grenzfall 3.9 an der Wurzel) |

### 1.5 Neu/ergänzt: `src/formats/shared/editor/__tests__/commands.test.ts`

Reiner Zustands-Unit-Test (kein DOM/Browser) für `colorMarkStateFor`
(Codeplan §4.3). Ergänzt, ersetzt aber nicht die Browser-Bestätigung derselben
Fälle in Abschnitt 2.2, da erst Ebene 2 beweist, dass der tatsächlich
gerenderte Farbwähler sich entsprechend verhält.

| # | Testfall | Erwartung |
|---|---|---|
| 1 | Leere Selektion (Cursor), keine Hervorhebung an `$from` | `{ kind: 'none' }` |
| 2 | Leere Selektion, `$from` in hervorgehobenem Text | `{ kind: 'set', color: '#…' }` mit korrektem Wert |
| 3 | Durchgehend einheitlich hervorgehobene Selektion | `{ kind: 'set', color: '#…' }` |
| 4 | Gemischte Selektion: Teil A Farbe X, Teil B Farbe Y | `{ kind: 'mixed' }` |
| 5 | Gemischt: Teil A Farbe X, Teil B **keine** Hervorhebung | `{ kind: 'mixed' }` (nicht fälschlich `'set'` durch reine Randprüfung) — Grenzfall 3.2 |
| 6 | Selektion über einen `image`-Knoten (Text-Bild-Text, teils hervorgehoben) | definiertes Ergebnis (`mixed`/`set`), **kein** Absturz beim `nodesBetween`-Lauf über einen Nicht-Text-Knoten | Grenzfall 3.3 auf Command-Ebene |
| 7 | `applyMarkColor`/`clearMarkColor` bei leerer Selektion | `false` (unverändertes Verhalten, Codeplan §3.2, bewusst beibehalten) |

### 1.6 „Strikte" OOXML-Prüfung ohne XSD-Validator (Grenzfall 3.17 / DoD 8)

Im Repo existiert **kein** XSD-/OOXML-Schema-Validator und keine Python-Toolchain
(`package.json` enthält keine `xsd`/`ooxml`/`validate`-Abhängigkeit). „Strikte
Schema-Validierung" wird deshalb **deterministisch und selbstständig** so
umgesetzt:

1. **Primär (Teil der automatisierten Suite):** exportiertes `word/document.xml`
   per `DOMParser` parsen, je `<w:rPr>` die Kind-Local-Names in Dokumentreihenfolge
   auslesen und assertieren, dass sie eine **Teilfolge** der kanonischen
   `CT_RPr`-Ordnung `[b, i, strike, color, highlight, u, shd]` bilden (ein
   Element darf fehlen, aber die relative Reihenfolge muss stimmen). Genau diese
   Reihenfolge fordert `CT_RPr`; die Vorfassung des Codes gab `u` **vor**
   `strike`/`color` aus (Verletzung), der Fix §4.8a stellt sie her. Diese
   Teilfolgen-Assertion ist die verbindliche CI-Gate.
2. **Optional/verschärfend (nur falls gewünscht, nicht CI-Pflicht):** eine
   vendored ECMA-376-Transitional-`CT_RPr`-Teilschema-Datei + ein reiner
   JS-Validator (z. B. `libxmljs2` als **dev**-Dependency) gegen das exportierte
   XML. Wird nur ergänzt, falls die Teilfolgen-Assertion als unzureichend
   bewertet wird; ansonsten als bewusst nicht eingeführte Schwergewichts-
   Abhängigkeit dokumentiert.

### 1.7 Unabhängige Validierung + einmalige Handprüfung (Rundreise 4.1/4.2, DoD 2/4)

1. **Automatisiert:** exportierte XML-Strings per `DOMParser`/Attribut-Zugriff
   prüfen, **ohne** `readDocx`/`readOdt` desselben Projekts (§1.2 #8/#11/#16/#17,
   §1.3 #2, sowie die E2E-Downloads §2.6 #13/#14).
2. **Manuell, einmalig vor Statuswechsel auf „verifiziert":**
   - Eine exportierte Test-DOCX mit Hervorhebungsfarbe außerhalb dieses Repos
     mit `python-docx` (`run.font.highlight_color` **und** Rohzugriff auf `w:shd`)
     **und** in echtem Microsoft Word öffnen: zeigt Word das native „Text
     hervorheben"-Werkzeug als **aktiv**? (Erwartet: **nein** bei reinem
     `<w:shd>`-Export; **ja**, falls die optionale `<w:highlight>`-Rückrichtung
     §4.8a die Palettenfarbe traf.) Ergebnis in `textmarker-farbe-req.md`
     Grenzfall 3.8 nachtragen.
   - Eine exportierte Test-ODT mit LibreOffice öffnen, „Zeichenhintergrund"
     bestätigt sichtbar.
   - Kein CI-Bestandteil, aber Pflicht-Checkliste-Punkt (Abschnitt 4, DoD 4).

---

## 2. Echte Playwright-Browser-Tests

**Grundregel dieser Ebene:** Jeder Test bedient die Anwendung ausschließlich so,
wie eine Person es täte — `page.getByLabel(...)`/`getByTitle(...)` `.click()`,
`page.keyboard.type(...)`/`.press(...)`, den vorhandenen `pickColor`-Helper für
das native `<input type="color">`, `input.setInputFiles(...)` für Uploads,
`page.waitForEvent('download')` + Lesen der heruntergeladenen Datei vom
Datenträger für Exporte. **Kein Test in diesem Abschnitt darf**
`readDocx`/`writeDocx`/`readOdt`/`writeOdt`/`applyMarkColor`/`clearMarkColor`/
`colorMarkStateFor`/`normalizeCssColor` direkt importieren oder aufrufen — das
wäre Ebene 1. Upload-Eingaben werden entweder (a) unabhängig vom Reader/Writer
per JSZip von Hand gebaut (`buildSampleDocx()`/`buildSampleOdt()`) oder (b) als
reale Fixture aus `tests/fixtures/external/` genommen — **niemals** eine mit dem
eigenen Writer erzeugte Datei als Upload-Eingabe eines Rundreisetests.

### 2.0 Neue Datei: `tests/e2e/highlight.spec.ts`

Helfer **wiederverwenden statt neu erfinden** (Anforderung §5, Codeplan §6.1) —
alle drei existieren bereits in `tests/e2e/clipboard.spec.ts` bzw.
`selection-regression.spec.ts`:

```ts
// aus clipboard.spec.ts:34-47 — setzt den Wert über den prototypischen Setter,
// damit Reacts value-Tracker die Änderung sieht, und feuert input+change (nach
// dem Toolbar-Fix §4.4 hängt ein nativer change-Listener; input+change deckt
// beide Welten deterministisch ab):
async function pickColor(page: Page, label: string, hex: string) { /* … */ }

// aus clipboard.spec.ts:14-21 — sammelt pageerror/console-error für „kein
// stiller Fehlschlag"-Assertions:
function watchForConsoleErrors(page: Page) { /* … return assertNone */ }

function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
```

`beforeEach`: `page.goto('/')` → „Verstanden"-Banner wegklicken
(`getByRole('button', { name: /verstanden/i }).click()`) → je nach Testfall
`odtCard`/`docxCard` „Neu erstellen" klicken (identisch zu
`selection-regression.spec.ts`). Download-Lesemuster identisch zu
`docx.spec.ts:79-88`: `const download = await page.waitForEvent('download')` →
`await download.path()` → `fs.readFile(path)` → `JSZip.loadAsync(buffer)` →
`zip.file('word/document.xml').async('text')`.

#### 2.0.1 Determinismus / Selektions-Sync (Pflicht — Auftragsvorgabe „keine Race-Conditions")

ProseMirror erfährt eine **native, tastaturgetriebene** Caret-/Selektions-
bewegung (`Ctrl+A`, Pfeiltasten, `Home`/`End`, Klick-Neupositionierung) nur über
das **asynchrone** `selectionchange`-Ereignis des Browsers. Eine Playwright-
`press()`/`type()`-Folge ohne Pause kann diesem Nachziehen **vorauslaufen** und
noch auf der alten Selektion agieren. Das ist im Repo eine **bereits
dokumentierte, real geflakte** Rennbedingung (siehe die jüngsten Commits zu
`selection-regression.spec.ts`/`cut.spec.ts` und die „Mobile-Projekt"-Flakes).
Daher gilt für **jeden** Test dieses Abschnitts verbindlich:

- Den etablierten `settle(page)`-Helfer verwenden:
  `async function settle(page) { await page.waitForTimeout(50) }` (wortgleich zu
  `clipboard.spec.ts:37`, `cut.spec.ts`, `selection-regression.spec.ts`).
- **Nach** jeder asynchronen Selektions-/Caret-Änderung und **vor** der nächsten
  Aktion `await settle(page)` einfügen — insbesondere zwischen
  `keyboard.press('ControlOrMeta+a')`/`Shift+…`/`Home`/`End`/Klick und dem
  darauf folgenden `pickColor`/`.click()`/`keyboard.press`.
- Gemischte/partielle Selektionen **deterministisch** aufbauen: markieren
  (`Shift`+Pfeil oder Doppelklick), `await settle(page)`, **dann** die Farbe
  anwenden — nie im selben Mikrotask verketten.
- Ausschließlich **web-first, auto-retriedende** Assertions nutzen
  (`await expect(loc).toHaveCSS('background-color', 'rgb(255, 255, 0)')`,
  `toBeDisabled()`, `toHaveCount(n)`, `expect.poll(...)`) statt DOM einmalig via
  `evaluate` zu lesen — sie warten selbst auf den eingeschwungenen Zustand.
- Exporte immer über `page.waitForEvent('download')` **vor** dem Klick auf
  „Exportieren" registrieren (Promise zuerst anlegen, dann klicken — Muster
  `docx.spec.ts:79-81`), nie per fester Wartezeit auf die Datei pollen.
- `pickColor` feuert genau **ein** `change` → genau **eine** Transaktion; für den
  Event-Granularitäts-Test (§2.4 #3) werden mehrere `input` + **ein** `change`
  bewusst manuell gefeuert. Kein Test verlässt sich auf OS-natives „Ziehen" im
  Farbrad (in Playwright nicht simulierbar).

#### 2.0.2 Browser-Matrix / notwendige `playwright.config.ts`-Erweiterung

Stand `playwright.config.ts`: Projekte `Desktop Chrome`, `Mobile` (Pixel 7,
Chromium/Touch), `Tablet` (iPad Mini, **WebKit**) laufen alle Specs; `Desktop
Safari (Clipboard)` und `Desktop Firefox (Clipboard)` matchen **nur**
`/clipboard.*\.spec\.ts/`. Eine neue `highlight.spec.ts` liefe damit **nur** auf
Chromium (Desktop + Mobile) und WebKit (Tablet) — **nicht** auf Firefox. Der in
Anforderung 2.8 / Grenzfall 3.11 geforderte **browserübergreifende** Event-
Granularitäts-Nachweis (Chromium **und** Firefox) ist so **nicht** erreichbar.

**Vorgeschriebene Config-Änderung** (Teil dieses Testplans): ein Firefox-Projekt
ergänzen, das die Highlight-Spec matcht — z. B.

```ts
{ name: 'Desktop Firefox (Highlight)', testMatch: /highlight.*\.spec\.ts/, use: { ...devices['Desktop Firefox'] } },
```

WebKit-Desktop-Abdeckung ist für Nicht-Clipboard-Verhalten über `Tablet` (iPad
Mini) bereits gegeben; ein separates `Desktop Safari (Highlight)`-Projekt ist
optional. Der Event-Granularitäts-Test §2.4 #3 wird über
`test.describe`/`test` so geschrieben, dass er auf **allen** Projekten läuft, in
denen die Datei matcht (mind. Chromium + Firefox). Alternativ zulässig: den
reinen Event-Granularitäts-Test in `clipboard.spec.ts` beheimaten (läuft dort
bereits auf Chromium+Firefox+WebKit) — dann ist die Config-Änderung nicht nötig,
aber der Test lebt getrennt vom Rest. Die Datei-getrennte Variante mit
Config-Erweiterung ist die bevorzugte.

### 2.1 Farbwähler & „Entfernen"-Button — Grundverhalten (Anforderung Abschnitt 1, 2.1, 2.6)

| # | Testfall | Schritte (echte Bedienung, mit `settle`) | Assertion |
|---|---|---|---|
| 1 | Farbe auf Selektion anwenden | `editor.click()` → `keyboard.type('Testtext')` → `ControlOrMeta+a` → `settle` → `pickColor(page, 'Hervorhebungsfarbe', '#ffff00')` | `editor.locator('span[style*="background-color"]')` mit Text „Testtext" hat `toHaveCSS('background-color', 'rgb(255, 255, 0)')` |
| 2 | „Entfernen" entfernt die Hervorhebung | Fortsetzung #1: `getByLabel('Hervorhebung entfernen').click()` | `background-color` verschwindet aus dem DOM des Textbereichs, Text „Testtext" bleibt vollständig |
| 3 | Bestehende andere Farbe wird **ersetzt**, nicht kombiniert | Text mit `#ff0000` hervorheben, `settle`, dieselbe Selektion mit `#00ff00` | nur `#00ff00` (rgb(0,255,0)) im DOM, **kein** Rest `#ff0000`; genau **eine** Hervorhebungsspanne über den Text |
| 4 | Erneutes Setzen derselben Farbe verursacht keinen Fehler | Farbe zweimal identisch setzen (`settle` dazwischen) | kein Crash (`watchForConsoleErrors`), `background-color` unverändert; optional: ein einzelnes `Strg+Z` genügt (kein Leer-Undo-Schritt) — Grenzfall 3.5 |
| 5 | Accessible Name/Tooltip eindeutig | — | `getByLabel('Hervorhebungsfarbe')` und `getByLabel('Hervorhebung entfernen')` treffen genau die richtigen Elemente (Bedienelement 1/2) |

### 2.2 Zustandsanzeige & leere/gemischte Selektion (Bedienelement 1/5, Grenzfall 3.1/3.2, kritisch)

Deckt Codeplan §4.3/4.4 (`colorMarkStateFor`, deaktivierte Controls, `#000000`-
Guard) und damit DoD 5/6 **und DoD 11** (Grenzfall 3.18, #8-9) der Anforderung.
Selektionen deterministisch aufbauen (§2.0.1).

| # | Testfall | Schritte | Assertion | Grenzfall |
|---|---|---|---|---|
| 1 | Beide Controls ohne Selektion deaktiviert | Text tippen, `settle`, Cursor ohne Auswahl setzen (Klick, kein Shift), `settle` | `getByLabel('Hervorhebungsfarbe')` **und** `getByLabel('Hervorhebung entfernen')` `toBeDisabled()`; `title` enthält Hinweis „bitte zuerst Text markieren" | 3.1, DoD 6 |
| 2 | Bedienung im deaktivierten Zustand ist echter No-Op | `watchForConsoleErrors` aktiv; Versuch, das deaktivierte Element per `{ force: true }` zu bedienen | Editor-Inhalt unverändert (`toContainText`), **keine** Konsolen-/JS-Fehler | 3.1 |
| 3 | Einheitliche Hervorhebung zeigt die tatsächliche Farbe | Text mit `#ffff00` hervorheben, `settle`, denselben Bereich erneut selektieren, `settle` | Farbwähler-`value` bzw. Swatch entspricht `#ffff00` (nicht Standard-Schwarz, nicht vorheriger Zufallswert) | Bedienelement 1 |
| 4 | Selektion ganz ohne Hervorhebung zeigt „keine" | unformatierten Text selektieren, `settle` | erkennbarer „keine Hervorhebung"-Zustand (Swatch `transparent`, kein irreführender Vorgabewert) | Bedienelement 1 |
| 5 | Gemischte Selektion (halb `#ffff00`, halb keine) zeigt „gemischt" | Teiltext hervorheben, `settle`, Gesamtselektion über beide Teile, `settle` | erkennbarer „gemischt"-Zustand (`title` enthält „gemischt"), **nicht** fälschlich die Farbe eines Teils | 3.2 |
| 6 | Neue Farbe auf gemischte Selektion vereinheitlicht | Fortsetzung #5: `pickColor(..., '#00ff00')` | **gesamte** vormals gemischte Selektion einheitlich `#00ff00`, kein Rest der alten Farbe/des unformatierten Teils | 3.2, Anforderung 2.1 |
| 7 | Cursorbewegung aktualisiert die Anzeige live | Cursor von hervorgehobenem in nicht-hervorgehobenen Text bewegen (Pfeiltasten), `settle` | Swatch/`value` wechselt entsprechend, ohne Neuladen | Abschnitt 2.3 |
| 8 | **Ungewollte schwarze Hervorhebung — `#000000`-Guard (Grenzfall 3.18, DoD 11, kritisch)** | unformatierten Text markieren, `settle`, Chip auf den Panel-Default `#000000` „bestätigen" — d. h. `pickColor(page, 'Hervorhebungsfarbe', '#000000')` auf einer Selektion **ohne** bestehende Hervorhebung | **kein** `background-color` im DOM (der `change`-Guard §3.6/4.4 unterdrückt das versehentliche Schwarz); kein deckender schwarzer Balken, `watchForConsoleErrors` leer | 3.18, DoD 11 |
| 9 | **Gegenprobe: bewusstes Schwarz bleibt echte Mark (Grenzfall 3.6/3.18)** | Text erst mit `#ffff00` hervorheben, `settle`, dieselbe Selektion, `pickColor(..., '#000000')` (Recolor bei **bestehender** Hervorhebung) | `background-color` = `rgb(0, 0, 0)` **wird** gesetzt (bewusst gewähltes Schwarz auf bereits hervorgehobenem Text ist eine gewollte Mark, konsistent mit „Weiß ≠ keine Hervorhebung") | 3.6/3.18 |

### 2.3 Kombination mit anderen Zeichenformaten (Anforderung 2.4, 2.5, Grenzfall 3.3/3.17)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Hervorhebung + Fett + Schriftfarbe + **Unterstrichen** gleichzeitig | Text tippen, `ControlOrMeta+a`, `settle`, `getByTitle('Fett').click()`, `getByTitle('Unterstrichen').click()`, Schriftfarbe via `pickColor(page,'Textfarbe',…)`, Hervorhebung via `pickColor(page,'Hervorhebungsfarbe',…)` (je `settle`) | alle vier Formate gleichzeitig im DOM (`strong`, `u`/underline, Inline-`color`, Inline-`background-color`); keines verdrängt ein anderes (Grundlage des DOCX-CT_RPr-Reihenfolge-Rundreisetests §2.6 #3a) |
| 2 | Reihenfolge der Anwendung irrelevant | Test A: erst Schriftfarbe dann Hervorhebung; Test B: umgekehrt (je `settle`) | identisches Endergebnis (DOM-Styles) in beiden Fällen |
| 3 | Kontrastfall dokumentiert, kein Absturz | Schriftfarbe und Hervorhebungsfarbe auf identischen Hex (`#000000`) | kein Fehler, Text bleibt im DOM (nur optisch unlesbar) — akzeptierter UX-Grenzfall, kein Test-Fail | Grenzfall 3.4/3.12 |
| 4 | Selektion über Bild-/Tabellengrenze | Bild einfügen, Text davor/danach + Bild per `ControlOrMeta+a` mitselektieren, `settle`, Hervorhebung anwenden | kein Absturz (`watchForConsoleErrors`), Hervorhebung nur auf textuellen Inline-Inhalten, Bild unverändert | Grenzfall 3.3 |

### 2.4 Undo/Redo & Event-Granularität des Farbwählers (Anforderung 2.8, Grenzfall 3.11, kritisch)

Läuft auf **mindestens** Chromium- und Firefox-Projekt (siehe §2.0.2 —
Config-Erweiterung Pflicht), da das zugrundeliegende `input`-Verhalten laut
Codeplan §2.2 browserabhängig ist.

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Ein Strg+Z macht die komplette Farbanwendung rückgängig | Text markieren, `settle`, Farbe setzen, `settle`, `ControlOrMeta+z` | `background-color` vollständig verschwunden, Text bleibt (nicht nur Teilanwendung rückgängig) |
| 2 | Redo stellt die Farbe wieder her | Fortsetzung: `ControlOrMeta+y` bzw. `ControlOrMeta+Shift+z` | `background-color` wieder vorhanden, exakt derselbe Hex |
| 3 | Mehrere `input` + ein `change` → genau **ein** Undo-Schritt | `input.evaluate(el => { for (const v of ['#ff0000','#00ff00','#0000ff']) { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; s.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})) } el.dispatchEvent(new Event('change',{bubbles:true})) })` → `settle` | genau **ein** `ControlOrMeta+z` entfernt die komplette Hervorhebung (keine Kette mehrerer Undo-Schritte) — Regressionstest Fehler 2 (§2.2/4.4), auf Chromium **und** Firefox grün |
| 4 | Gemischte Sequenz Tippen + mehrere Toolbar-Aktionen | Tippen, `settle`, Fett, `settle`, Tippen, `settle`, Hervorhebung, `settle`; dann je ein `Strg+Z` | jeder Undo-Schritt entfernt genau die zuletzt angewendete Einzeländerung |

### 2.5 Zwischenablage / Fremd-HTML mit ungültigen Farbwerten (Anforderung 2.7, Grenzfall 3.9)

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | Intern kopierter hervorgehobener Text behält Farbe | hervorgehobenen Text markieren, `settle`, `ControlOrMeta+c`, Cursor woanders, `settle`, `ControlOrMeta+v` | eingefügter Text hat dieselbe `background-color` (auf Chromium mit erteilter Clipboard-Permission; Firefox/WebKit über nativen Key-Roundtrip, Muster `clipboard.spec.ts`) |
| 2 | Externes HTML mit `background-color: yellow` | synthetisches `paste`-Event mit `text/html`-Payload via `page.evaluate`+`DataTransfer` auf den Editor dispatchen | eingefügter Text `toHaveCSS('background-color', 'rgb(255, 255, 0)')` (kanonisch normalisiert, **nicht** der Rohstring „yellow") |
| 3 | Externes HTML mit `background-color: rgba(255,0,0,0.4)` | wie #2 | eingefügter Text zeigt **deckendes** `rgb(255, 0, 0)` (Alpha normalisiert) |
| 4 | Externes HTML mit `background-color: transparent` bzw. ohne Hintergrund | wie #2 | **kein** `highlight`-Mark/keine `background-color` am eingefügten Text (Grenzfall 3.9: `transparent` darf nicht als Farbwert landen) |
| 5 | **Nach Einfügen von #2/#3: DOCX-Export bleibt gültiges XML** | Export, Download lesen | heruntergeladenes `word/document.xml` per `DOMParser` parsebar; `w:fill` matcht `^[0-9a-f]{6}$` — bestätigt, dass die Normalisierung beim **Einfügen** vor dem Export greift und **kein** ungültiges OOXML entsteht |
| 6 | **Interner Copy/Paste-Normalisierungspfad (Grenzfall 3.9, kritisch)** | Text im Editor mit `#00ff00` hervorheben, kopieren, in **neues** Dokument einfügen (Browser kann beim Zurücklesen `#00ff00` → `rgb(0,255,0)` normalisieren), dann DOCX exportieren | exportiertes `w:fill` ist gültiges Hex `^[0-9a-f]{6}$` (kein `w:fill="rgb(0, 255, 0)"`) — belegt, dass der reale interne Pfad kein ungültiges OOXML erzeugt |
| 7 | **Nicht-wohlgeformtes DOCX durch präparierten Farbwert (Grenzfall 3.19, DoD 12, kritisch)** | synthetisches `paste`-Event mit `text/html`, dessen `background-color` XML-Metazeichen enthält (z. B. `background-color: #ff0000"><w:sz w:val="999"/><w:shd w:fill="` bzw. Werte mit `"`/`<`/`&`), auf den Editor dispatchen; danach DOCX exportieren, Download lesen | heruntergeladenes `word/document.xml` ist mit einem **strikten** XML-Parser (`DOMParser`, kein `<parsererror>`) **wohlgeformt** parsebar; der Rohwert erzeugt **kein** freies Markup und **kein** `w:fill` mit Metazeichen (Zusammenspiel `normalizeCssColor` beim Einfügen + `safeHex`-Weglassen + `escapeXml` beim Export, §2.1/4.2/4.8b). Stärkere Fehlerklasse als #2 (dort nur Schema-, hier Wohlgeformtheits-Prüfung) | 3.19, DoD 12 |

### 2.6 Rundreise — alle Pflichtszenarien aus Anforderung Abschnitt 4

Jedes Szenario prüft die **heruntergeladene Datei** (`download.path()` →
`fs.readFile` → `JSZip.loadAsync` → Ziel-XML), nicht nur, dass der Editor nach
Re-Import „irgendwie richtig aussieht". Download-Promise **vor** dem
Export-Klick registrieren (§2.0.1).

| # | Szenario | Ablauf | Assertion an heruntergeladener Datei |
|---|---|---|---|
| 1 | DOCX-Eigenrundreise, Basisfall | Neu → tippen → `ControlOrMeta+a` → `settle` → `#ffff00` → Export → Re-Import (`setInputFiles` mit heruntergeladener Datei) | `word/document.xml` enthält exakt `<w:shd w:val="clear" w:color="auto" w:fill="ffff00"/>` im `w:rPr` des betroffenen Runs, kein anderer Run betroffen; Re-Import zeigt die Stelle weiter hervorgehoben | 4.1.1/4.1.2 |
| 2 | ODT-Eigenrundreise | wie 1, aber ODT | `content.xml` enthält Automatik-Text-Stil mit `fo:background-color="#ffff00"`, referenziert via `text:style-name`; Re-Import bestätigt Farbe | 4.2.1/4.2.2 |
| 3 | Hervorhebung + Fett + Schriftfarbe bei DOCX-Rundreise | alle drei setzen (§2.3 #1 ohne `u`), Export, Re-Import | alle drei am **selben** Run erhalten, nicht auf getrennte Runs aufgeteilt | 4.1.3 |
| 3a | **CT_RPr-Reihenfolge über echte Bedienung (Grenzfall 3.17/DoD 8)** | Hervorhebung + **Unterstrichen** + Schriftfarbe + Durchgestrichen (§2.3 #1), Export | `word/document.xml`: **ein** `<w:r>`; `<w:rPr>`-Kinder in Reihenfolge Teilfolge von `[b,i,strike,color,highlight,u,shd]` (konkret `strike,color,u,shd`), geprüft per §1.6-Assertion | 3.17/DoD 8 |
| 4 | Hervorhebung entfernt, dann exportiert | Farbe setzen, `settle`, entfernen, exportieren | kein `<w:shd>` mehr für diesen Run | 4.1.4 |
| 5 | Hervorhebung über `hard_break` | Wort mit `Shift+Enter` in der Mitte, `settle`, ganzes Wort hervorheben, exportieren, Re-Import | Hervorhebung auf beiden Seiten des Umbruchs erhalten | 4.1.6 |
| 6 | Cross-Format ODT→DOCX | ODT mit Hervorhebung (per JSZip von Hand gebaut) hochladen → als DOCX exportieren | `<w:shd>` mit korrektem Hex im Export | 4.1.7 |
| 7 | Zwei Textläufe, gleiche Farbe, ODT-Export | zwei getrennte, gleich gefärbte Stellen | `content.xml`: **eine** gemeinsame Stildefinition (Zählen der `style:style` mit `fo:background-color` == 1), nicht zwei | 4.2.3 |
| 8 | Hervorhebung + Fett bei ODT-Export | kombiniert | eine gemeinsame Stildefinition mit beiden Eigenschaften | 4.2.4 |
| 9 | Hervorhebung entfernt bei ODT-Export | setzen, entfernen, exportieren | kein referenzierter Stil mit `fo:background-color` mehr | 4.2.5 |
| 10 | Cross-Format DOCX→ODT | DOCX mit `<w:shd>` (von Hand gebaut) hochladen → als ODT exportieren | Farbe erhalten in `content.xml` | 4.2.6 |
| 11 | Doppelte Rundreise DOCX→ODT→DOCX | Upload DOCX → Export ODT → Re-Import ODT → Export DOCX | Farbe nach zwei Konvertierungen an exakt derselben Stelle, gleicher Hex (case-insensitiv) | 4.3.1 |
| 12 | Doppelte Rundreise ODT→DOCX→ODT | analog, Startpunkt ODT | wie oben | 4.3.2 |
| 13 | Unabhängige DOCX-Validierung | Datei aus #1 laden, `word/document.xml` **per Regex/`DOMParser`, nicht per `readDocx`** | `w:fill="ffff00"` am erwarteten `<w:shd>`/`<w:r>` | 4.1.1, DoD 2 |
| 14 | Unabhängige ODT-Validierung | analog | `fo:background-color="#ffff00"` per Regex/`DOMParser` | 4.2.1, DoD 2 |
| 15 | **Groß-/Kleinschreibung (Grenzfall 3.16)** | von Hand gebaute DOCX mit `w:fill="FFFF00"` (groß) hochladen → als ODT exportieren → als DOCX zurück | Vergleiche case-insensitiv; keine fälschliche „Abweichung", **keine** doppelten `T…`-/`<w:shd>`-Definitionen durch reinen Groß-/Klein-Unterschied | 3.16 |

### 2.7 Kritischer Importtest: reale native `<w:highlight>`-Hervorhebung (Grenzfall 3.7, kritisch)

Deckt den in der Anforderung als „kritisch" markierten Verdacht, Abnahme-
kriterium 3 (zwingende Bestätigung/Widerlegung) und Fix §4.6/4.7.

| # | Testfall | Schritte | Assertion |
|---|---|---|---|
| 1 | `bug57031.docx` (`<w:highlight w:val="lightGray"/>`) hochladen | `setInputFiles('tests/fixtures/external/docx/bug57031.docx')` in der DOCX-Karte | betroffener Textbereich: `toHaveCSS('background-color', 'rgb(192, 192, 192)')` (`#c0c0c0`). **Vor** Fix §4.7 erwartungsgemäß rot (dokumentiert den Verlust), **nach** Fix grün. Assertion prüft **Anwesenheit** von `#c0c0c0`, nicht „genau eine Hervorhebung" (Caveat §4.7: zusätzliche nahezu weiße `<w:shd>`) |
| 2 | `bug65649.docx` (`<w:highlight>` `yellow`/`green`/`cyan`) hochladen | wie oben | die erwarteten Hervorhebungen (`#ffff00`/`#00ff00`/`#00ffff`) sichtbar |
| 3 | Unverändert re-exportieren nach Import `bug57031.docx` | Import → sofort exportieren | exportiertes `word/document.xml` enthält `<w:shd … w:fill="c0c0c0"/>` für dieselbe Stelle (App-eigener `<w:shd>`-Exportweg, unabhängig vom nativen `<w:highlight>`-Ursprung) |
| 4 | Ergebnis dokumentieren | — | Ergebnis (bestätigt/widerlegt, vor/nach Fix) in `textmarker-farbe-req.md` Grenzfall 3.7 nachtragen (manuell, Abschnitt 4) |

### 2.8 Reale ODT-Fixtures (Anforderung 4.2.7)

Farbwerte vorab am realen Fixture ermittelt und im Test **fest verankert**
(nicht „irgendeine Farbe").

| # | Fixture | Assertion |
|---|---|---|
| 1 | `lostBackground.odt` (vorrangig) | genau 4 sichtbare Hervorhebungen an „Dienstag"/„Rot Und BOLD"/„Text"/„pfff" (`#ffff00`/`#ff0000`/`#ffc000`/`#ffc000`), per `getComputedStyle` bestätigt — **kein** zusätzlicher/unsichtbarer Verlust (Name für dieses Feature irreführend, §2.3, Testfall verankert Regressionsschutz) |
| 2 | `coloredParagraph.odt` | **echte** Zeichen-Hervorhebung `#92d050` sichtbar (korrigiert ggü. Vorfassung: `family="text"`-Stil, **kein** Absatzhintergrund-Verwechslungsfall, §6.1.10) |
| 3 | `character-styles.odt` | erwartete Hervorhebung(en) laut vorab durchgeführter Inhaltsprüfung sichtbar (falls die Farbe nur über `office:styles`/benannte Zeichenformatvorlage vergeben ist, greift Fix §4.9b — sonst dokumentierte Restlücke) |
| 4 | `TableFunkyBackground.odt` | Hervorhebung in Tabellenzelle(n) sichtbar, kein Absturz beim Import von Tabellen mit Hintergrund |
| 5 | `text-color-from-paragraph.odt` | Ergebnis geprüft/dokumentiert: enthält die Datei nur `fo:color` (Schriftfarbe) ohne `fo:background-color`, wird **fälschlich keine** Hervorhebung erzeugt |
| 6 | `sameLocationSpansUsingMultipleTemplateStyles_…-Text-Yellow.odt` | Hervorhebung „Yellow" korrekt am verschachtelten Span erhalten, unabhängig von der Bold/Italic-Verschachtelung |
| 7 | **Reale Datei über `style:text-background-color` (Grenzfall 3.20, DoD 13)** | **vor** Testerstellung durch Entpacken von `content.xml` bestätigen, welches Attribut die Datei tatsächlich verwendet; nur eine Fixture aufnehmen, deren Zeichen-Hervorhebung **nachweislich** über `style:text-background-color` (bzw. ein `loext:`-Attribut) statt `fo:background-color` serialisiert ist | Hervorhebung nach Import im Editor-DOM sichtbar (nach Fix §4.9c). Solange **keine** solche Repo-Fixture bestätigt ist, deckt der synthetische Unit-Test §1.3 #15 den Reader-Zweig ab, und diese reale-Datei-Prüfung bleibt als dokumentierter, fixture-abhängiger Rest geführt (Codeplan §6.7) — Verlust andernfalls dokumentieren | 3.20, DoD 13 |

### 2.9 Weitere Grenzfälle (Anforderung Abschnitt 3, Rest)

| # | Fall | Test | Grenzfall |
|---|---|---|---|
| 1 | Wiederholtes Entfernen ohne vorheriges Setzen | unformatierten Text markieren, `settle`, „Entfernen" klicken → kein Fehler, kein leerer Undo-Schritt (per anschließendem `Strg+Z` geprüft, der nichts Sichtbares rückgängig macht) | 3.15 |
| 2 | Entfernen in leerem Listenpunkt/leerer Tabellenzelle | Liste/Tabelle einfügen, leeren Punkt/Zelle fokussieren, Hervorhebung setzen und entfernen ohne Text davor/danach | kein Rendering-Fehler, kein Crash (`watchForConsoleErrors`) | 3.10 |
| 3 | Kontrastfall Hervorhebung = Schriftfarbe | siehe §2.3 #3 | dokumentiert, kein Test-Fail | 3.4/3.12 |

### 2.10 Icon-Rendering (Bedienelement 4, DoD 10)

| # | Testfall | Assertion |
|---|---|---|
| 1 | Icons als SVG gerendert (nach Fix §4.4) | `getByLabel('Hervorhebungsfarbe')`-Umgebung enthält `<svg>` (`HighlighterIcon`), „Entfernen"-Button enthält `<svg>` (`EraserIcon`) — **kein** reines Unicode-Emoji als einziger visueller Träger |
| 2 | Vor dem Fix (Referenzzustand, einmalig dokumentieren) | Rendering auf einem System ohne Standard-Emoji-Schrift (Font-Override) bewerten; Ergebnis einmalig in `textmarker-farbe-req.md` Bedienelement 4 nachtragen |
| 3 | `aria-label`/`title` trotz SVG korrekt | `getByLabel('Hervorhebungsfarbe')`/`getByLabel('Hervorhebung entfernen')` treffen weiterhin eindeutig |

### 2.11 Design-Entscheidungs-Sichtprüfungen (Anforderung Abschnitt 5, Punkt 14)

Kein klassischer Pass/Fail-Test, sondern dokumentierte Entscheidung mit
begleitendem Regressionstest:

| # | Punkt | Nachweis |
|---|---|---|
| 1 | Grenzfall 3.8 (`w:shd` statt `w:highlight`) | §1.2 #8 (kein `<w:highlight>` im Standardexport) + §1.7 manuelle Word-Prüfung; als bewusster Kompromiss in `textmarker-farbe-req.md`/`-code.md` dokumentiert (§3.3/5) |
| 2 | Abschnitt 2.3 (Zustandsanzeige) | §2.2 dieses Plans (als „nachgerüstet", nicht „bewusst fehlend" nachgewiesen) |

---

## 3. Zuordnung Anforderung → Test (Abnahme-Mapping)

Grenzfall-Nummerierung gemäß `textmarker-farbe-req.md` Abschnitt 3 (1-20).

| Anforderungs-Abschnitt / Grenzfall | Testebene(n) | Datei(en) |
|---|---|---|
| 1 (Bedienelemente 1-7) | Unit + E2E | `commands.test.ts` §1.5, `highlight.spec.ts` §2.1/2.2/2.10 |
| 2.1 (Anwenden auf Selektion) | E2E | §2.1, §2.2 #6 |
| 2.2 (kein Caret-Mode, No-Op-Feedback) | E2E | §2.2 #1-2 |
| 2.3 (Zustandsanzeige) | Unit + E2E | `commands.test.ts` §1.5, §2.2 #3-7 |
| 2.4 (Kombination mit anderen Marks) | Unit + E2E | `docx/highlight.test.ts` #11-13, §2.3 |
| 2.5 (Kontrast Schrift-/Hervorhebungsfarbe) | E2E | §2.3 #3 |
| 2.6 (Entfernen, Weiß-Sonderfall) | Unit + E2E | `odt/highlight.test.ts` #8, §2.1 #2 |
| 2.7 (Zwischenablage) | E2E | §2.5 |
| 2.8 (Undo/Redo, Event-Granularität) | E2E (Chromium+Firefox, §2.0.2) | §2.4 |
| 3.1 (leere Selektion) | Unit + E2E | `commands.test.ts` #1/#7, §2.2 #1-2 |
| 3.2 (gemischte Selektion) | Unit + E2E | `commands.test.ts` #4-5, §2.2 #5-6 |
| 3.3 (Bild-/Tabellengrenze) | Unit + E2E | `commands.test.ts` #6, §2.3 #4 |
| 3.4/3.12 (Kontrastproblem) | E2E | §2.3 #3 (dokumentiert) |
| 3.5 (erneutes Setzen derselben Farbe) | E2E | §2.1 #4 |
| 3.6 (Weiß ≠ keine Hervorhebung) | Unit | `odt/highlight.test.ts` #8 |
| 3.7 (natives `<w:highlight>`, kritisch) | Unit + E2E | `docx/highlight.test.ts` #3,6,7; §2.7 |
| 3.8 (`w:shd`-Kompromiss) | Unit + manuell | `docx/highlight.test.ts` #8; §1.7/2.11 #1 |
| 3.9 (ungültige Fremdfarbwerte + interner rgb()-Pfad) | Unit + E2E | `color.test.ts`; `docx/highlight.test.ts` #16-17; §2.5 #2-6 |
| 3.10 (leerer Listenpunkt/Zelle) | Unit + E2E | `docx/highlight.test.ts` #20; §2.9 #2 |
| 3.11 (schnelles Ziehen im Farbwähler) | E2E (Chromium+Firefox) | §2.4 #3 |
| 3.13 (ODT Absatz- vs. Zeichenhintergrund) | Unit | `odt/highlight.test.ts` #12 |
| 3.14 (ODT `office:styles`/benannte Zeichenformatvorlage, DoD 9) | Unit | `odt/highlight.test.ts` #11 |
| 3.15 (wiederholtes Entfernen ohne Setzen) | E2E | §2.9 #1 |
| 3.16 (Groß-/Kleinschreibung, Style-Dedup) | Unit + E2E | `docx/highlight.test.ts` #19; §2.6 #15 |
| 3.17 (CT_RPr-Kindelement-Reihenfolge, DoD 8) | Unit + E2E | `docx/highlight.test.ts` #11 (+ §1.6); §2.6 #3a |
| 3.18 (ungewollte schwarze Hervorhebung, DoD 11) | E2E | `highlight.spec.ts` §2.2 #8-9 |
| 3.19 (nicht-escaptes `w:fill` → nicht-wohlgeformtes DOCX, DoD 12) | Unit + E2E | `docx/highlight.test.ts` #17 (+ `color.test.ts` #10); §2.5 #7 |
| 3.20 (ODT `style:text-background-color`, DoD 13) | Unit + E2E | `odt/highlight.test.ts` #15; §2.8 #7 (fixture-abhängig) |
| 4.1 (DOCX-Rundreise 1-7) | Unit + E2E | `docx/highlight.test.ts`; §2.6 #1,3,3a-6,11,13 |
| 4.2 (ODT-Rundreise 1-7) | Unit + E2E | `odt/highlight.test.ts`; §2.6 #2,7-10,12,14; §2.8 |
| 4.3 (doppelte Rundreise) | E2E | §2.6 #11-12 |
| 5 (alle 18 E2E-Testfälle der Anforderung) | E2E | vollständig auf `highlight.spec.ts` §2.1-2.11 abgebildet |
| 6 (DoD 1-13) | Unit + E2E + manuell | Abschnitt 4 dieses Plans |

---

## 4. Abnahme-Checkliste (vor Statuswechsel „vorhanden (nicht vertrauenswürdig)" → „verifiziert")

DoD-Punkte 1-13 gemäß `textmarker-farbe-req.md` Abschnitt 6.

- [ ] **(DoD 1)** `npm test` grün, inkl. `docx/__tests__/highlight.test.ts`,
      `odt/__tests__/highlight.test.ts`, `shared/__tests__/color.test.ts`,
      `shared/editor/__tests__/commands.test.ts` (neu/ergänzt).
- [ ] **(DoD 1)** `npm run test:e2e` grün, inkl. `tests/e2e/highlight.spec.ts`,
      auf **mindestens Chromium und Firefox** — Firefox-Projekt in
      `playwright.config.ts` gemäß §2.0.2 ergänzt (sonst läuft die Spec **nicht**
      auf Firefox).
- [ ] **(DoD 1)** Kein Test in `highlight.spec.ts` ruft `readDocx`/`writeDocx`/
      `readOdt`/`writeOdt`/`applyMarkColor`/`clearMarkColor`/`colorMarkStateFor`/
      `normalizeCssColor` direkt auf — per Review bestätigt.
- [ ] **(DoD 1)** `highlight.spec.ts` nutzt durchgängig `settle(page)` nach
      asynchronen Selektions-/Caret-Änderungen und web-first Assertions — keine
      Race-Conditions durch zu schnelle Tastatureingaben (§2.0.1).
- [ ] **(DoD 2)** Alle Rundreisen (4.1.1-4.1.7, 4.2.1-4.2.7, 4.3.1-4.3.3) grün,
      inkl. der unabhängigen XML-Validierungen (§2.6 #13-14) — geprüft per
      `DOMParser`/Regex, **nicht** per eigenem Reader.
- [ ] **(DoD 3, kritisch)** Grenzfall 3.7 (natives `<w:highlight>` beim Import)
      mit `bug57031.docx` **und** `bug65649.docx` bestätigt oder widerlegt,
      Ergebnis in `textmarker-farbe-req.md` nachgetragen (§2.7).
- [ ] **(DoD 4)** `w:shd`-statt-`w:highlight`-Kompromiss (3.8) als bewusste
      Design-Entscheidung dokumentiert, inkl. einmaliger manueller Verifikation
      in echtem Microsoft Word (§1.7/2.11 #1).
- [ ] **(DoD 5)** Zustandsanzeige (2.3, Bedienelement 1/5) nachgerüstet und mit
      grünen Tests belegt (§2.2) **oder** als bewusst fehlend dokumentiert.
- [ ] **(DoD 6)** Rückmeldung bei leerer Selektion (3.1) behoben (deaktivierte
      Controls, §2.2 #1-2) **oder** als bewusst gewolltes Verhalten dokumentiert.
- [ ] **(DoD 7)** Ungültige/untypische Fremdfarbwerte (3.9) geklärt:
      `normalizeCssColor`-Unit-Tests grün **und** E2E-Nachweis, dass weder über
      Fremd-HTML noch über den **internen** rgb()-Normalisierungspfad ungültiges
      OOXML entsteht (§1.4, §2.5 #5-6); Writer **lässt** ungültige Farbe **weg**
      (kein Throw, §1.2 #16-17, §1.3 #9).
- [ ] **(DoD 8)** OOXML-Kindelement-Reihenfolge (3.17) gegen die kanonische
      `CT_RPr`-Ordnung geprüft (Teilfolgen-Assertion §1.6), mit **Unterstrichen**
      im kombinierten Run (§1.2 #11, §2.6 #3a) — Ergebnis dokumentiert.
- [ ] **(DoD 9)** ODT-Import über benannte Zeichenformatvorlagen (`office:styles`,
      3.14) geprüft (§1.3 #11) und Fallback (mehrstufige Parent-Chain als bekannte
      Restlücke) dokumentiert.
- [ ] **(DoD 10)** Icon-Rendering-Risiko (Bedienelement 4) bewertet: auf SVG
      umgestellt und nachgewiesen (§2.10 #1/#3) **oder** bewusst beibehalten mit
      dokumentiertem Restrisiko.
- [ ] **(DoD 11)** Ungebundener Farbchip / **ungewollte schwarze Hervorhebung**
      (Grenzfall 3.18) geprüft: Chip spiegelt die Selektionsfarbe **und** ein
      „Panel-Default `#000000` ohne bewusste Auswahl bestätigen" auf **nicht**
      hervorgehobenem Text erzeugt **keine** Mark (`change`-Guard, §3.6/4.4),
      belegt durch §2.2 #8 (Guard greift) und §2.2 #9 (bewusstes Schwarz auf
      bereits hervorgehobenem Text bleibt echte Mark) **oder** als bewusstes
      Verhalten dokumentiert.
- [ ] **(DoD 12)** Fehlende **XML-Escapung von `w:fill`** (Grenzfall 3.19)
      geprüft: über einen präparierten Fremdfarbwert (`"`/`<`/`&`) entsteht **kein**
      nicht-wohlgeformtes DOCX — exportiertes `word/document.xml` per striktem
      `DOMParser` wohlgeformt (§2.5 #7, §1.2 #17); `escapeXml`+`safeHex`-Weglassen
      nachgerüstet, Ergebnis dokumentiert.
- [ ] **(DoD 13)** ODT-Import über das **alternative Attribut**
      `style:text-background-color` (Grenzfall 3.20) geprüft: synthetischer
      Reader-Test grün (§1.3 #15); reale LibreOffice-Fixture — sofern durch
      Entpacken von `content.xml` bestätigt — aufgenommen (§2.8 #7), sonst
      fixture-abhängiger Rest samt Fallback dokumentiert.
- [ ] Für jeden in `textmarker-farbe-code.md` Abschnitt 2 zusätzlich gefundenen
      Fehler (fehlendes XML-Escaping, Event-Granularität, ODT-Absatzstil-Lücke A,
      Reihenfolge-Abhängigkeit Lücke B, CT_RPr-Reihenfolge, `office:styles`-Lücke
      C) liegt ein Fix mit grünem Regressionstest vor (`docx/highlight.test.ts`
      #11/#16-18, `odt/highlight.test.ts` #7/#9-11, §2.4 #3).
- [ ] Manuelle Einmalvalidierung einer exportierten Test-DOCX/-ODT gegen
      `python-docx`/echtes Word bzw. LibreOffice durchgeführt und vermerkt (§1.7).
