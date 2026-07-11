# Schriftart wählen — dateigenauer Umsetzungsplan

Gegenstück zu `specs/schriftart-waehlen-req.md`. Dieses Dokument beschreibt, nach
tatsächlicher Lektüre des aktuellen Codes (nicht nur der Behauptung im
Anforderungsdokument), was neu gebaut werden muss, welche Dateien geändert bzw. neu
angelegt werden, und wie die Rundreise-/Grenzfall-Verifikation aus Abschnitt 3, 4, 6 und 7
der Anforderung konkret technisch umgesetzt wird.

## 0. TL;DR

Der Code-Audit aus `schriftart-waehlen-req.md` (Zeilen 12–29) ist **vollständig
zutreffend** — es existiert wirklich keine Spur der Funktion, weder im Schema, in der
Toolbar, in den Commands noch in DOCX-/ODT-Reader/Writer. Zusätzlich zu den dort
genannten Fundstellen wurden beim eigenen Audit zwei weitere, in der Anforderung nicht
erwähnte Punkte gefunden (Abschnitt 2.1):

1. `applyMarkColor`/`clearMarkColor` (`commands.ts`, Zeile 90–106) unterstützen **keine**
   „stored mark" an der Schreibmarke bei leerer Selektion (`if (empty) return false`) —
   ein bestehendes, nicht dieser Anforderung zuzurechnendes Verhalten von
   `textColor`/`highlight`. `applyFontFamily`/`clearFontFamily` dürfen dieses Verhalten
   **nicht** kopieren, da Abschnitt 2.2 der Anforderung Stored-Mark-Verhalten für
   Schriftart ausdrücklich verlangt (analog zu Fett/Kursiv über `toggleMark`).
2. Reale DOCX-Fixtures im Repo (`Bug54771a.docx`, `Bug54771b.docx`) referenzieren
   Schriftarten ausschließlich über Theme-Attribute (`w:asciiTheme="majorHAnsi"` statt
   `w:ascii="…"`), ohne dass diese Attribute in `schriftart-waehlen-req.md` erwähnt
   werden. Das ist eine bewusste Nicht-Abdeckung dieses Tickets (siehe Abschnitt 13.1),
   kein Implementierungsfehler.

Diese Funktion wird komplett neu gebaut: eine neue Schema-Mark `fontFamily`, zwei neue
Command-Funktionen plus eine Selektions-Auswertungsfunktion, eine neue Datei für die
kuratierte Schriftartenliste inkl. optionaler Local-Font-Access-Erweiterung, eine neue
Combobox-Komponente in der Toolbar, sowie Lese-/Schreibunterstützung in beiden
Dateiformaten. Der mit Abstand größte Einzelposten ist — wie bei jeder UI-Funktion in
diesem Projekt — die vollständige Grenzfall- und Rundreise-Verifikation aus den
Abschnitten 3, 4 und 6 der Anforderung über echte Playwright-Bedienung, nicht nur
Reader/Writer-Unit-Tests.

---

## 0.1 Re-Verifikation gegen den aktuellen Code-Stand (dieser Durchgang)

Alle in Abschnitt 1 genannten Dateien wurden für diesen Durchgang erneut vollständig gegen
den **aktuellen** Baum gelesen (nicht aus der Erstfassung übernommen). Ergebnis: Architektur
und Design-Entscheidungen dieses Plans (Schema-Mark `fontFamily`, Stored-Mark-Commands,
`fonts.ts`, selbstgebaute Combobox, DOCX-`w:rFonts`, ODT-`office:font-face-decls` mit je einer
`FontFaceRegistry` pro Dokumentteil) sind **weiterhin korrekt und umsetzbar**. Zwei inhaltliche
Korrekturen und mehrere seit der Erstfassung gewanderte Zeilennummern sind unten und in den
betroffenen Abschnitten eingearbeitet.

**Inhaltliche Korrektur 1 (Blocker — in Abschnitt 9.3 eingearbeitet): `blocksToOdt`/`blockToOdt`
haben inzwischen einen vierten Parameter `tableNames: TableNameSequence`.** `odt/writer.ts`
erzeugt in `writeOdt` heute `const tableNames = new TableNameSequence()` (Klasse Zeile 54–60)
und reicht ihn durch jeden `blocksToOdt(...)`-Aufruf (deterministische `table:name`-Vergabe,
siehe Determinismus-Kommentar dort). Der ursprüngliche `writeOdt`-Rewrite in 9.3 ließ dieses
Argument weg — wörtlich übernommen bräche der **Tabellen-Export**. Der korrigierte Code in 9.3
reicht `tableNames` unverändert weiter.

**Inhaltliche Korrektur 2 (Empfehlung — in Abschnitt 8.2 eingearbeitet): `<w:rFonts>` als
_erstes_ Kind von `<w:rPr>` ausgeben.** Im OOXML-Schema `CT_RPr` ist `rFonts` das zweite
Element der Sequenz (direkt nach dem selten genutzten `rStyle`) und muss `w:b`/`w:i`/… vorangehen.
Ein `props.push` am Schleifenende (so der ursprüngliche 8.2-Entwurf) platzierte `rFonts` hinter
`w:shd` und verletzt damit die Schema-Reihenfolge. **Kein harter Blocker:** Der Suite-Validator
ist `mammoth` (`docx/__tests__/external-validation.test.ts`, reihenfolge-tolerant), und der
bestehende Writer gibt ohnehin bereits `w:u` vor `w:strike`/`w:color` aus, ist also schon
reihenfolge-lax. Für Testfall 23 („von einem unabhängigen OOXML-Parser als Schriftart erkannt")
ist die schemakorrekte Erst-Position dennoch die risikoärmere und kostenlose Wahl.

**Gewanderte Zeilennummern (nur Anker-Korrektur, keine inhaltliche Änderung).** Anker sind **per
Symbolname** zu suchen; die folgenden Werte ersetzen die im Fließtext genannten. `styleRegistry.ts`
und `xmlUtil.ts` sind **unverändert** und ihre in der Erstfassung genannten Nummern damit weiterhin
korrekt.

| Symbol / Fundstelle | im Plan zitiert | aktuell (verifiziert) |
|---|---|---|
| `schema.ts` `marks`-Objekt (fontFamily anhängen) | 109–148 | **157–196** (nach `highlight` 195, vor `}` 196) |
| `commands.ts` Datei / `applyMarkColor`+`clearMarkColor` | 108 Z. / 90–106 | **168 Z.** / **106–113 + 115–122**; neue Exporte nach `clearMarkColor` (122), vor `canCut` (124) |
| `Toolbar.tsx` Datei / Absatzformat-`<select>` / erster `MarkButton` / `<option>Standard` | 247 Z. / 116–133 / 135 / 125 | **298 Z.** / **165–180** / **184** / **174** |
| `docx/reader.ts` `marksFromRunProperties` | 99–114 | **100–115** (Einschub vor `return marks`, 114) |
| `docx/writer.ts` `runPropertiesXml` / `inlineToRuns` / Mark-Vergleich | 18–31 / 39–65 / 52 | **20–33** / **41–67** / **54** |
| `odt/reader.ts` `RunStyle` / `parseAutomaticStyles` / `marksFor` / `readOdt` (2 Aufrufe) | 13–20 / 36–77 / 82–94 / 239–285 | **14–21** / **37–78** / **100–112** / **357–409** (Aufrufe 364, 374) |
| `odt/styleRegistry.ts` `RunProps` / `isEmpty` / `TextStyleRegistry` / Dedup-Key / `buildTextStyleXml` | 3–10 / 12–14 / 22–44 / 30 / 46–59 | **unverändert korrekt** |
| `odt/writer.ts` `runPropsFromMarks` / `buildContentXml` / `buildStylesXml` / `writeOdt` / `blocksToOdt` | 25–36 / 129–137 / 139–156 / 183–210 / — | **32–43** / **206–214** / **216–233** / **260–305** / **197–204 (4 Params inkl. `tableNames`)** |
| `odt/xmlUtil.ts` `svg` / `office` / `NAMESPACE_DECLARATIONS` (enthält `svg`) | 18 / 11 / 24 | **unverändert korrekt** |
| `WordEditor.tsx` `forceRender`-Aufrufe / `if (tr.docChanged)` | 60,97,101 / 94 | **70,131,136** / **128**; `Enter: splitListItem` (96) → `baseKeymap`/`splitBlock` |
| `DocumentWorkspace.tsx` `dirty:true` via Editor-`onChange` / `dirty:false` bei Export | 69 | **146** / **84** |

**Zusätzliche Bestätigungen aus diesem Durchgang:**
- `docx/__tests__/styleDefs.test.ts` prüft inzwischen **zusätzlich** zu „`Normal` ohne `w:rFonts`",
  dass `styleDefs.ts` ein **leeres** `<w:docDefaults/>` erzeugt („no product-wide font/size
  standard is enforced") und `Normal` auch kein `w:sz` trägt. Das stützt Design-Entscheidung 1 /
  Anforderung 2.4 zusätzlich — es existiert nachweislich **kein** eingeschleuster Schriftart-Default.
  `styleDefs.ts` bleibt in diesem Ticket **unangetastet**, der Test bleibt grün.
- Fixture `FruitDepot-SeasonalFruits4.odt` real entpackt und geprüft: `office:font-face-decls`
  enthält u. a. `style:name="Arial1" svg:font-family="Arial"`, `style:name="Arial2"
  svg:font-family="Arial"`, `style:name="Tahoma1"` sowie `&apos;`-gequotete Mehrwort-/Nicht-Latein-
  Namen (`&apos;Times New Roman&apos;`, `&apos;ヒラギノ角ゴ Pro W3&apos;`, `&apos;Open Sans Light&apos;`).
  Bestätigt sowohl die Notwendigkeit der `office:font-face-decls`-Auflösung (9.1) als auch das
  `unquoteFontFamily`-Handling (Single-Quote-Dekodierung) und den `svg`-Namespace in
  `NAMESPACE_DECLARATIONS`.
- `Bug54771a.docx` real entpackt: **ausschließlich** `w:asciiTheme="majorHAnsi"` (10×) /
  `"minorHAnsi"` (1×), **kein** literales `w:ascii` → Theme-only, wie in 12.1/13.1 beschrieben.
- `bug57031.docx`: die „eastAsia-only"-Variante `<w:rFonts w:eastAsia="Times New Roman"/>` kommt
  real **~60×** vor (Erstfassung nannte 63) — Zahl korrigiert, Aussage (Grenzfall 3.14 real belegt)
  unverändert; daneben literale `w:ascii="Arial"/"Times New Roman"/"Cambria Math"/"Courier New"`.
- `bug59058.docx`: literale exotische `w:ascii="MinionPro-bold"/"MinionPro-Regular"/"MinionPro-It"/"Times"/"Lucida Sans Unicode"` real vorhanden (Grenzfall 3.5).
- Keine `tests/e2e/font-family.spec.ts` vorhanden (Neuanlage bestätigt); `docxCard`/`odtCard`-Helfer
  liegen in `tests/e2e/fixtures.ts` (39/43), `docx.spec.ts` definiert zusätzlich einen lokalen
  `docxCard` (59) — beim neuen Spec konsistent einen Weg wählen.

---

## 0.2 Kritische Nachprüfung dieses Durchgangs — konkrete Verbesserungen

Zusätzlich zur Anker-/Struktur-Verifikation (0.1) wurde dieser Durchgang genutzt, um den
Plan **kritisch gegen die eigenen Anforderungen** (insbesondere ARIA-Abschnitt 4.6) zu
prüfen. Dabei fielen vier konkrete, mit der bisherigen Fassung noch nicht vollständig
gedeckte Punkte auf; alle sind unten in den betroffenen Code-Snippets (Abschnitt 7.1 und
11.2) bereits eingearbeitet:

1. **`aria-live` für „Keine Schriftart gefunden" fehlte im Snippet (Blocker gegen 4.6).**
   Anforderung 4.6 verlangt den Leer-Treffer-Hinweis ausdrücklich in einer
   `aria-live="polite"`-Region. Der ursprüngliche Combobox-Entwurf gab ihn als schlichtes
   `<li>` **innerhalb** des `role="listbox"` aus — Screenreader hätten das leere
   Filterergebnis nicht angesagt, und ein Nicht-`option`-`<li>` im Listbox verletzt zudem
   die Listbox-Semantik. Korrigiert: eigener `role="status" aria-live="polite"`-Container
   **außerhalb** des `<ul>`, dauerhaft gemountet solange die Liste offen ist (aria-live
   sagt nur Änderungen zuverlässig an, wenn die Region bereits im DOM steht).
2. **`<li>`-Zwischenrolle zwischen `listbox` und `option` (4.6).** `role="listbox"` →
   implizites `listitem` (`<li>`) → `role="option"` schiebt eine fremde `listitem`-Rolle
   dazwischen. Korrigiert: `role="presentation"` auf den `<li>`-Wrappern, damit die
   Optionen direkte Listbox-Kinder im Accessibility-Baum bleiben.
3. **`aria-activedescendant` fehlte (Vervollständigung des Combobox-Patterns, 4.6).** Da
   der Fokus im `<input>` bleibt und die Hervorhebung nur über React-State läuft, braucht
   ein Screenreader `aria-activedescendant` auf dem `role="combobox"`, das auf die `id`
   des hervorgehobenen `role="option"` zeigt — sonst ist der per Pfeiltaste hervorgehobene
   Eintrag für assistive Technik unsichtbar. Korrigiert: stabile `id={`font-opt-${i}`}` je
   Option + `aria-activedescendant` am Input. Der Entfernen-Button trägt jetzt zusätzlich
   zum `title` auch das von 4.6 geforderte `aria-label="Schriftart entfernen"`.
4. **E2E-`getByLabel('Schriftart')` ist nach Punkt 3 nicht mehr eindeutig.** Sobald der
   Entfernen-Button `aria-label="Schriftart entfernen"` trägt, matcht Playwrights
   `getByLabel('Schriftart')` (Teilstring-Default) **beide** Elemente → Strict-Mode-Verstoß.
   Alle E2E-Locator auf das Eingabefeld sind deshalb mit `{ exact: true }` zu qualifizieren
   (`page.getByLabel('Schriftart', { exact: true })`); im Snippet in 11.2 eingearbeitet.

Nachrichtlich (keine Code-Änderung nötig, aber dokumentiert): `parseFirstFontFamily`
(Abschnitt 6) zerteilt den `font-family`-CSS-Wert am ersten Komma. Für einen
Schriftartnamen, der selbst ein Komma enthält (Grenzfall 3.22), liefert der
**parseDOM**-Pfad (reines Clipboard-HTML-Einfügen) dadurch nur den Namensteil vor dem
Komma. Das ist folgenlos für die DOCX/ODT-Rundreise (die den `family`-Attributwert direkt
aus der Mark schreibt/liest, **nicht** über `parseFirstFontFamily`) und für den Export
(dort greift `escapeXml`); es betrifft ausschließlich das nicht-testpflichtige Copy/Paste
(Grenzfall 3.20, in Abschnitt 4 bereits als „kostenlos miterledigt, nicht Testgegenstand"
markiert). Wird Copy/Paste später testpflichtig, ist `parseFirstFontFamily` auf einen
anführungszeichen-/komma-bewussten Parser umzustellen.

---

## 0.3 Erneute Re-Verifikation gegen den aktuellen Code-Stand (dieser Durchgang)

Dieser Durchgang hat **jede** in Abschnitt 1 gelistete Datei erneut vollständig gegen den
tatsächlichen Baum gelesen (nicht die Zahlen aus 0.1/0.2 übernommen) und zusätzlich per
Skript aus den echten Fixture-ZIPs nachgerechnet, statt sich auf die im Plan behaupteten
Zahlen zu verlassen. Ergebnis: **Architektur, Design-Entscheidungen und sämtliche
DOCX/ODT-XML-Strukturvorschläge dieses Plans bleiben unverändert korrekt** — es wurde
keine einzige inhaltliche/technische Unstimmigkeit gefunden. Bestätigt wurden insbesondere:

- `schema.ts` (`marks`-Objekt exakt Zeile 157–196), `commands.ts` (168 Zeilen,
  `applyMarkColor`/`clearMarkColor` exakt Zeile 106–113/115–122), `Toolbar.tsx` (298
  Zeilen, `<select>` exakt 165–180, erster `MarkButton` 184, `<option>Standard` 174),
  `docx/reader.ts` (`marksFromRunProperties` exakt 100–115), `docx/writer.ts`
  (`runPropertiesXml` 20–33, `inlineToRuns` 41–67, Mark-Vergleich Zeile 54), `docx/styleDefs.ts`
  (unverändert, `styleDefs.test.ts` prüft weiterhin sowohl leeres `w:docDefaults` als auch
  „`Normal` ohne `w:rFonts`/`w:sz`"), `odt/reader.ts` (`RunStyle` 14–21,
  `parseAutomaticStyles` 37–78, `marksFor` 100–112, `readOdt`-Aufrufe 364/374),
  `odt/writer.ts` (`runPropsFromMarks` 32–43, `buildContentXml` 206–214, `buildStylesXml`
  216–233, `writeOdt` 260–305, `blocksToOdt` mit 4 Parametern inkl. `tableNames` 197–204),
  `odt/styleRegistry.ts` und `odt/xmlUtil.ts` (beide unverändert) sind **exakt** wie in der
  Anker-Tabelle in 0.1 angegeben — diese Tabelle war bis auf die unten korrigierte
  `WordEditor.tsx`-Zeile weiterhin zutreffend.
- Alle Fixture-Fakten aus Abschnitt 12 wurden per Skript (JSZip, nicht nur Handaufmaß)
  gegengerechnet und sind **exakt** zutreffend: `Bug54771a.docx` enthält ausschließlich
  `w:asciiTheme="majorHAnsi"`/`"minorHAnsi"`, kein literales `w:ascii`; `bug59058.docx`
  enthält literal `w:ascii="MinionPro-bold"/"MinionPro-Regular"/"MinionPro-It"`; die
  „eastAsia-only"-Zeile `<w:rFonts w:eastAsia="Times New Roman"/>` kommt in
  `bug57031.docx` **exakt 60×** vor (nachgerechnet, deckt sich mit der bereits in 0.1
  korrigierten Zahl); `FruitDepot-SeasonalFruits4.odt`s `office:font-face-decls` enthält
  wortgleich `style:name="Arial1"`/`"Arial2"` → `svg:font-family="Arial"`,
  `style:name="Tahoma1"` → `"Tahoma"` sowie die einfach-gequoteten Namen
  `&apos;Times New Roman&apos;`/`&apos;ヒラギノ角ゴ Pro W3&apos;`/`&apos;Open Sans Light&apos;`.
  Alle Testfixtures aus Abschnitt 12 existieren wie referenziert im Repo. `tests/e2e/fixtures.ts`
  exportiert `docxCard`/`odtCard` exakt an Zeile 39/43, `docx.spec.ts` definiert weiterhin
  einen eigenen lokalen `docxCard` an Zeile 59, `tests/e2e/font-family.spec.ts` existiert
  weiterhin nicht (Neuanlage bestätigt), `selection-regression.spec.ts` hat weiterhin genau
  einen `test.describe`-Block, in den der neue Grenzfall-3.15-Test passt. `package.json`,
  `index.css` (`.ProseMirror` ohne `font-family`, `--font-sans` Zeile 4) und die
  Abwesenheit jeglichen Combobox-/`role="listbox"`-Musters im Repo (`grep` → 0 Treffer)
  wurden ebenfalls erneut bestätigt.

**Gefundene, in diesem Durchgang korrigierte Zeilen-Abweichungen (reine
Anker-Korrekturen, keine inhaltliche Änderung an Architektur/Design):**

1. **Die `WordEditor.tsx`-Zeile der Anker-Tabelle in 0.1 war selbst bereits wieder
   veraltet.** Sie nannte „57,123,128 / 120" für `forceRender`/`if (tr.docChanged)` und
   „88" für `Enter: splitListItem`. Tatsächlich (per `grep -n` nachgezählt):
   `forceRender` steht an Zeile 70 (Deklaration), 131 und 136 (Aufrufe); `if
   (tr.docChanged)` an Zeile 128; `Enter: splitListItem(...)` an Zeile 96. Die Tabelle in
   0.1 ist jetzt entsprechend berichtigt — dies ist der einzige Punkt, an dem eine als
   „aktuell (verifiziert)" markierte Zahl selbst nicht mehr stimmte.
2. **Zwei Stellen (Design-Entscheidung 4 in Abschnitt 3, und Abschnitt 13.2) zitierten
   `odt/writer.ts` Zeile 184–195 bzw. 188–195 als Beleg für die `bodyStyles`/
   `chromeStyles`-Trennung bzw. die Header/Footer-Verdrahtung.** Diese Zeilen sind
   tatsächlich `blockToOdt`s `unsupported_block`-Fallzweig (Export-Fallback für nicht
   unterstützte Textfelder/Objekte) — inhaltlich ohne jeden Bezug zu den beiden
   Behauptungen. Die richtigen Fundstellen sind `writeOdt` selbst: `new
   TextStyleRegistry()` für den Body an Zeile 261, für Kopf-/Fußzeile an Zeile 268, sowie
   die `blocksToOdt(...)`-Aufrufe für Body/Header/Footer an Zeile 266/271/272. Beide
   Stellen sind jetzt korrigiert. Die analoge Abschnitt-13.2-Behauptung für
   `docx/writer.ts` (dort „Zeile 234–243" zitiert) war ebenfalls falsch — das ist
   `buildContentTypesXml`s Header/Footer-Content-Type-Override, nicht `writeDocx`s
   `blocksToDocx`-Aufrufe (tatsächlich Zeile 256/265/270) — ebenfalls korrigiert.
3. **Mehrere `Toolbar.tsx`-Prosa-Zitate in Abschnitt 7 waren veraltet:** `run()` wurde als
   „Zeile 23–26" zitiert (tatsächlich 28–31), das Absatzformat-`<select>` im
   Code-Kommentar von Abschnitt 7.2 als „Zeile 116–131" (tatsächlich 165–180 — und stand
   damit im selben Abschnitt im Widerspruch zur unmittelbar davorstehenden, korrekten
   Angabe „aktuell Zeile 165–180"), und das `onMouseDown`/`preventDefault()`-Muster von
   `MarkButton`/`AlignButton` als „Zeile 49–50, 71–72" (tatsächlich 76–77 bzw. 98–99).
   Alle drei sind jetzt korrigiert.
4. Die Audit-Bullet-Liste in Abschnitt 2.1 zitierte `WordEditor.tsx` „Zeile 62–114" für
   den `useEffect`-Block (tatsächlich 76–166) und `MarkButton` „Zeile 41–42" (tatsächlich
   68–69, `const markType = wordSchema.marks[mark]` / `const active = …`) — beide
   korrigiert.

**Einordnung:** Alle vier Punkte sind reine Zeilennummer-Drift durch seitherige,
themenfremde Code-Änderungen (z. B. Ausschneiden-Feature, siehe Commit-Historie),
**keine** Fehler in der vorgeschlagenen Architektur oder den XML-Snippets selbst — die
bereits in 0.1 gegebene Empfehlung, Anker **per Symbolname** statt per nackter
Zeilennummer zu suchen, bleibt der verlässlichere Weg und wird hiermit erneut bekräftigt.
Punkt 2 (verwechselte Fundstelle) ist der einzige Fund, der über reine Zahlendrift
hinausgeht — er hätte eine Umsetzerin tatsächlich zum falschen Code-Abschnitt geführt,
weshalb er hier explizit hervorgehoben ist.

---

## 1. Methodik dieser Prüfung

Gelesen und geprüft (Zeilennummern beziehen sich auf den Stand zum Zeitpunkt dieser
Prüfung): `src/formats/shared/schema.ts`, `src/formats/shared/editor/commands.ts`,
`src/formats/shared/editor/Toolbar.tsx`, `src/formats/shared/editor/WordEditor.tsx`,
`src/formats/shared/editor/pageLayout.ts`, `src/formats/shared/documentModel.ts`,
`src/formats/types.ts`, `src/index.css`, `src/formats/docx/reader.ts`,
`src/formats/docx/writer.ts`, `src/formats/docx/styleDefs.ts`,
`src/formats/docx/xmlUtil.ts`, `src/formats/odt/reader.ts`, `src/formats/odt/writer.ts`,
`src/formats/odt/styleRegistry.ts`, `src/formats/odt/xmlUtil.ts`, beide
`__tests__/roundtrip.test.ts`, beide `__tests__/external-fixtures.test.ts`,
`src/app/DocumentWorkspace.tsx` (Dirty-Flag-Fluss), `tests/e2e/*.spec.ts`,
`package.json` (verfügbare Bibliotheken — **kein** Combobox-/Headless-UI-Paket
vorhanden, die Combobox muss selbst gebaut werden), sowie `FEATURE-SPEC-DOCX-ODT.md`
(Abschnitte 2, 3, 17, 20.4) und `FEATURE-BACKLOG.md` Zeile `schriftart-waehlen`.
Zusätzlich wurden testweise 6 reale DOCX- und 15 reale ODT-Fixtures aus
`tests/fixtures/external/{docx,odt}` entpackt und auf `w:rFonts`/`style:font-name`/
`office:font-face-decls`-Inhalt untersucht (Ergebnisse in Abschnitt 12).

---

## 2. Ist-Zustand nach Codelektüre

### 2.1 Bestätigung der Anforderungs-Tabelle + zusätzliche Funde

| Fundstelle laut Anforderung | Verifiziert | Anmerkung |
|---|---|---|
| `schema.ts` Marks `strong…highlight`, keine `fontFamily`-Mark | Ja (aktuell Zeilen 157–196) | — |
| `Toolbar.tsx` kein Dropdown/Combobox für Schriftart | Ja (aktuell 298 Zeilen, kein Treffer für „font") | Auch **kein** anderes Combobox-Muster im ganzen Repo vorhanden (`grep combobox|role="listbox"` → 0 Treffer) — es gibt keine wiederverwendbare Vorlage, die Komponente muss vollständig neu entworfen werden |
| `commands.ts` keine Funktion für Schriftart | Ja (aktuell 168 Zeilen) | Zusätzlich: `applyMarkColor`/`clearMarkColor` (aktuell Zeile 106–122) geben bei leerer Selektion `false` zurück, statt eine „stored mark" zu setzen — **nicht** als Vorlage für `applyFontFamily`/`clearFontFamily` verwenden (siehe Abschnitt 0) |
| `docx/reader.ts` `marksFromRunProperties` liest kein `w:rFonts` | Ja (aktuell Zeile 100–115) | — |
| `docx/writer.ts` `runPropertiesXml` schreibt kein `w:rFonts` | Ja (aktuell Zeile 20–33) | — |
| `odt/reader.ts` `RunStyle`/`parseAutomaticStyles` ohne `style:font-name` | Ja (aktuell Zeile 14–21, 37–78) | Datei liest auch **kein** `office:font-face-decls` irgendwo — nicht mal das Element wird referenziert |
| `odt/styleRegistry.ts` `RunProps`/`buildTextStyleXml` ohne Schriftart-Feld | Ja (Zeile 3–10, 46–59) | — |

Zusätzlich gefunden, **nicht** in der Anforderungstabelle:

- `src/formats/shared/editor/WordEditor.tsx`, Zeile 76–166 (aktualisiert, siehe 0.1 —
  Erstfassung nannte 62–114): Die `EditorState` wird
  **einmalig** in einem `useEffect` mit leerem Dependency-Array aus `doc.content.body`
  erzeugt; die Toolbar wird bei jeder Transaktion per `forceRender` neu gerendert
  (aktuell Zeile 70/131/136, siehe korrigierte Tabelle in 0.1). Das bedeutet: eine
  Combobox, die `view.state` direkt aus dem
  `view`-Objekt liest (wie `MarkButton`, aktuell Zeile 68–69), zeigt bei jeder
  Cursor-Bewegung/Selektionsänderung automatisch den aktuellen Wert an — **ohne**
  zusätzlichen Subscription-Mechanismus. Das deckt Anforderung 2.3 („Anzeige der
  aktiven Schriftart") strukturell bereits ab, sofern die neue Komponente exakt diesem
  Muster folgt.
- `src/app/DocumentWorkspace.tsx`, Zeile 69: `onChange` setzt `dirty: true` **nur**,
  wenn `WordEditor` es aufruft, und das geschieht nur bei `tr.docChanged`
  (`WordEditor.tsx` Zeile 94). Ein reiner Import (kein `dispatchTransaction`-Aufruf)
  setzt `dirty` nie auf `true`. Damit ist Anforderung 2.4 („kein unnötiges
  Dirty-Flag bei unverändertem Re-Import mit Schriftart-Marks") **strukturell bereits
  durch die bestehende Architektur erfüllt** — es gibt keinen normalisierenden
  Schreibvorgang beim Laden, der eine neue Mark einführen und fälschlich `dirty`
  auslösen könnte. Kein Codeänderungsbedarf hierfür, nur eine Regressionstest-Pflicht
  (siehe Abschnitt 11.3).
- `src/index.css`, Zeile 23–27: `.ProseMirror` setzt keine `font-family` (nur `color`
  und `outline`). Tailwinds `--font-sans`/`--font-mono` (Zeile 4–5) wirken nur über
  Utility-Klassen, nicht global auf `.ProseMirror`. Es gibt also **keine** konkurrierende
  CSS-Basisschriftart, die eine neue `fontFamily`-Mark überschreiben oder mit ihr
  kollidieren könnte.
- `src/formats/docx/writer.ts`, Zeile 39–65 (`inlineToRuns`): Lauf-Zusammenführung
  vergleicht `JSON.stringify(buffer.marks) === JSON.stringify(node.marks)` — **ordnungssensitiv**.
  Im echten App-Datenfluss unkritisch, da ProseMirrors `Mark.addToSet` Marks intern immer
  in fester Rang-Reihenfolge hält (siehe Abschnitt 4). Bei handgeschriebenen
  Unit-Test-Fixtures (die das Schema umgehen) muss die Mark-Reihenfolge in Tests
  konsistent sein — siehe Testkonvention in Abschnitt 11.1.
- `src/formats/odt/styleRegistry.ts`, Zeile 30 (`styleNameFor`): Dedup-Key ist
  `JSON.stringify(props)`, ebenfalls ordnungssensitiv gegenüber der
  Objekt-Insertionsreihenfolge der `RunProps`-Felder. Dieselbe Schwäche wurde bereits in
  `specs/unterstrichen-einfach-code.md` Abschnitt 3.3 als Härtung vorgeschlagen, ist im
  aktuellen Code aber **noch nicht umgesetzt** (verifiziert: Zeile 30 lautet unverändert
  `const key = JSON.stringify(props)`). Da diese Anforderung ein neues `fontFamily`-Feld
  zu `RunProps` hinzufügt, wird der kanonische Key in Abschnitt 8.2 dieses Plans direkt
  mit erledigt, statt auf zwei Tickets zu splitten.

### 2.2 Bibliotheks-/Plattform-Fakten, die den Bau beeinflussen

- `package.json`: React 19, `prosemirror-model` 1.25, `prosemirror-state` 1.4,
  `prosemirror-commands` 1.7 — keine UI-Kit-Abhängigkeit (kein Radix/Headless UI).
  `Transaction.addStoredMark`/`removeStoredMark` (aus `prosemirror-state`) sind
  vorhanden und werden bereits transitiv von `toggleMark` genutzt — direkt nutzbar für
  `applyFontFamily`/`clearFontFamily`.
- `office:font-face-decls`/`style:font-face`/`svg:font-family` benötigen **keine** neue
  Namespace-Deklaration: `src/formats/odt/xmlUtil.ts` deklariert `svg` (Zeile 18) und
  `office` (Zeile 11) bereits und beide sind Teil von `NAMESPACE_DECLARATIONS` (Zeile
  24), das in jede erzeugte ODT-XML-Datei eingebettet wird.
- `window.queryLocalFonts()` (Local Font Access API) wird nirgends im Repo referenziert
  — komplett neu zu implementieren, inkl. Feature-Detection und Caching.

---

## 3. Design-Entscheidungen (vor Implementierung festzulegen, siehe Anforderung 2.4)

| # | Frage | Entscheidung | Begründung |
|---|---|---|---|
| 1 | Basis-/Standardschriftart beim Export (2.4) | **Kein harter Produktstandard.** Text ohne explizite Nutzeraktion bleibt ohne `fontFamily`-Mark; DOCX/ODT-Export schreibt dafür **kein** `w:rFonts`/`style:font-name`. | Verhindert erfundene Schriftart bei unverändertem Re-Export (Rundreise-Kriterium 5/7) und unnötiges `dirty` (2.4). |
| 2 | UI-Anzeige, wenn keine Mark vorhanden ist (2.3) | Combobox zeigt **leeren Eingabewert**, aber mit `placeholder="Standard"` (analog zum `<option value="normal">Standard</option>` des bestehenden Absatzformat-Selects, Zeile 125 in `Toolbar.tsx`). | Erfüllt 2.3 „niemals ein leerer, verwirrender Zustand" **ohne** eine Phantom-Schriftart ins Datenmodell zu schreiben — der Placeholder ist rein visuell, keine Mark. |
| 3 | „Gemischt"-Anzeige (1.8) | Gleicher Mechanismus wie #2, aber `placeholder="Gemischt"`, Eingabewert ebenfalls leer. | Kein zusätzlicher State nötig; UI-seitig identisch zu #2, nur andere Beschriftung — die Unterscheidung „kein Wert" vs. „gemischt" ist rein informativ, keine Anforderung verlangt eine visuell andere Behandlung. |
| 4 | Speicherort der ODT-`office:font-face-decls` | **Getrennt pro Dokumentteil**, analog zur bestehenden `bodyStyles`/`chromeStyles`-Trennung der `TextStyleRegistry` in `writeOdt` (`odt/writer.ts`, aktuell Zeile 261 `new TextStyleRegistry()` für den Body, Zeile 268 für Kopf-/Fußzeile — **nicht** Zeile 184–195, das ist `blockToOdt`s `unsupported_block`-Fallzweig und hat mit dieser Trennung nichts zu tun, Verwechslung in einer früheren Fassung dieses Plans korrigiert): eine `FontFaceRegistry` für `content.xml` (Body), eine zweite für `styles.xml` (Kopf-/Fußzeile). | Automatische Stile sind laut ODF-Spezifikation nicht teil-übergreifend gültig — dieselbe Trennung, die die bestehende `TextStyleRegistry` bereits für Textstile durchsetzt, gilt identisch für Font-Face-Deklarationen. |
| 5 | Caching der Local-Font-Access-Liste (Grenzfall 4.5) | Modul-globaler Cache (`let cachedSystemFonts`) plus In-Flight-Promise-Dedup, **ein** Berechtigungsdialog pro Browser-Tab-Lebensdauer. | Verhindert wiederholte Berechtigungs-Dialoge bei schnellem Öffnen/Schließen (Grenzfall 4.5). |
| 6 | Tastaturkürzel | **Keines** — Anforderung Abschnitt 1, letzter Absatz, schließt das explizit aus. | — |
| 7 | Freitext-Normalisierung (2.7) | Schriftartname wird **unverändert** (kein `trim()`, keine Case-Anpassung) in Mark, CSS und Export übernommen. Einzige Ausnahme: eine rein aus Leerzeichen bestehende Eingabe wird nicht übernommen (kein sinnvoller Schriftartname, keine Anforderung verlangt das explizit, aber Grenzfall „leere Eingabe" ist sonst nicht abgedeckt). | Erfüllt 2.7 wörtlich; die Leerraum-Ausnahme ist eine Robustheits-Ergänzung, kein Normalisierungsverstoß. |

---

## 4. Schema-Änderung — `src/formats/shared/schema.ts`

Neue Mark **am Ende** des `marks`-Objekts (aktuell Zeile 157–196) ergänzen, **nicht** dazwischen
einfügen: ProseMirror weist jeder Mark beim `Schema`-Konstruktor einen `rank` in
Deklarationsreihenfolge zu; `Mark.addToSet` hält Mark-Arrays intern immer in
Rang-Reihenfolge, unabhängig von der Anwendungsreihenfolge im UI (das ist der
Mechanismus, der Anforderung 2.5 „Reihenfolge der Anwendung darf Ergebnis nicht
beeinflussen" bereits kostenlos erfüllt). Ein Einfügen mitten in die bestehende Liste
würde die Ränge aller danach deklarierten Marks verschieben, ohne Beobachtbaren Schaden,
aber unnötig — Anhängen ist der minimal-invasive Weg:

```ts
fontFamily: {
  attrs: { family: { validate: 'string' } },
  parseDOM: [{ style: 'font-family', getAttrs: (value) => ({ family: parseFirstFontFamily(value as string) }) }],
  toDOM(mark) {
    // Kein escapeXml nötig: toDOM liefert eine DOMSerializer-Spec, ProseMirror setzt den
    // Wert über element.setAttribute('style', …) — der Browser übernimmt HTML-Escaping.
    // Nur der CSS-Wert selbst muss syntaktisch gültig bleiben (siehe cssFontFamily).
    return ['span', { style: `font-family: ${cssFontFamily(mark.attrs.family as string)}` }, 0]
  },
},
```

Import am Dateikopf ergänzen: `import { cssFontFamily, parseFirstFontFamily } from './editor/fonts'`.
`schema.ts` liegt in `src/formats/shared/`, `fonts.ts` (Abschnitt 6) in
`src/formats/shared/editor/` — relativer Pfad `./editor/fonts` ist korrekt, keine
Zirkelabhängigkeit (`fonts.ts` importiert seinerseits nichts aus `schema.ts`).

`parseDOM` deckt als Nebeneffekt auch das Einfügen von extern kopiertem HTML mit
`font-family`-Inline-Style über die (bereits existierende) Copy/Paste-Funktionalität ab
— nicht Testgegenstand dieses Tickets, aber kostenlos miterledigt.

---

## 5. Commands — `src/formats/shared/editor/commands.ts`

Drei neue Exporte, nach dem bestehenden `clearMarkColor` (aktuell Zeile 115–122), vor `canCut` (124), ergänzen:

```ts
export function applyFontFamily(family: string): Command {
  return (state, dispatch) => {
    const markType = wordSchema.marks.fontFamily
    const { from, to, empty } = state.selection
    if (dispatch) {
      const mark = markType.create({ family })
      dispatch(empty ? state.tr.addStoredMark(mark) : state.tr.addMark(from, to, mark))
    }
    return true
  }
}

export function clearFontFamily(): Command {
  return (state, dispatch) => {
    const markType = wordSchema.marks.fontFamily
    const { from, to, empty } = state.selection
    if (dispatch) {
      dispatch(empty ? state.tr.removeStoredMark(markType) : state.tr.removeMark(from, to, markType))
    }
    return true
  }
}

export interface ActiveFontFamily {
  /** `null` heißt: keine explizite Mark (Basiswert) oder gemischt — siehe `mixed`. */
  family: string | null
  mixed: boolean
}

/** Liest den an der Schreibmarke/Selektion aktiven Schriftartnamen für die Toolbar-Anzeige (2.3). */
export function getActiveFontFamily(state: EditorState): ActiveFontFamily {
  const markType = wordSchema.marks.fontFamily
  const { from, to, empty, $from } = state.selection
  if (empty) {
    const stored = state.storedMarks ?? $from.marks()
    const mark = markType.isInSet(stored)
    return { family: (mark?.attrs.family as string) ?? null, mixed: false }
  }
  let seen: string | null | undefined
  let mixed = false
  state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return
    const mark = markType.isInSet(node.marks)
    const value = (mark?.attrs.family as string) ?? null
    if (seen === undefined) seen = value
    else if (seen !== value) mixed = true
  })
  return { family: mixed ? null : (seen ?? null), mixed }
}
```

Anders als `applyMarkColor`/`clearMarkColor` (Zeile 90–106) wird bei leerer Selektion
**nicht** `false` zurückgegeben, sondern die Stored-Mark-API verwendet — das ist exakt
das in Anforderung 2.2 geforderte, zu Fett/Kursiv analoge Verhalten (`toggleMark`
verwendet intern denselben Mechanismus, siehe `node_modules/prosemirror-commands`).
Kein bestehender Code wird dafür geändert; die Abweichung vom Farbe-Muster ist
beabsichtigt und wird hier dokumentiert, damit sie bei einer künftigen Prüfung nicht als
Inkonsistenz missverstanden wird — die Farb-Funktionen selbst zu „reparieren" ist nicht
Gegenstand dieses Tickets.

Import-Ergänzung am Dateikopf: `import type { EditorState } from 'prosemirror-state'`
ist über `import type { Command, EditorState } from 'prosemirror-state'` (Zeile 1)
bereits vorhanden (`EditorState` wird schon importiert) — keine neue Abhängigkeit nötig.

---

## 6. Neue Datei — `src/formats/shared/editor/fonts.ts`

```ts
import type { Node as PMNode } from 'prosemirror-model'

/** Cross-Plattform sinnvolle Grundliste (Anforderung 1, Zeile 2) — bewusst statisch, keine Laufzeit-Erkennung. */
export const CURATED_FONTS: readonly string[] = [
  'Arial',
  'Times New Roman',
  'Calibri',
  'Georgia',
  'Verdana',
  'Tahoma',
  'Courier New',
  'Comic Sans MS',
  'Liberation Sans',
  'Liberation Serif',
  'Liberation Mono',
]

const SERIF_HINT = /times|georgia|garamond|cambria|book antiqua|liberation serif|serif/i
const MONO_HINT = /courier|consolas|mono|liberation mono/i

/** Generische CSS-Fallback-Familie passend zur gewählten Schriftart (Anforderung 2.6). */
export function genericFallbackFor(name: string): 'serif' | 'sans-serif' | 'monospace' {
  if (MONO_HINT.test(name)) return 'monospace'
  if (SERIF_HINT.test(name)) return 'serif'
  return 'sans-serif'
}

/** Baut einen syntaktisch gültigen `font-family`-CSS-Wert, korrekt gequotet (Anforderung 2.7). */
export function cssFontFamily(name: string): string {
  const needsQuoting = /[^a-zA-Z0-9-]/.test(name)
  const value = needsQuoting ? `"${name.replace(/"/g, '\\"')}"` : name
  return `${value}, ${genericFallbackFor(name)}`
}

/** Kehrt `cssFontFamily`/geparstes `style="font-family: …"` wieder in den reinen Namen um (für `parseDOM`). */
export function parseFirstFontFamily(value: string): string {
  const first = (value.split(',')[0] ?? '').trim()
  return first.replace(/^["']|["']$/g, '')
}

/** Alle Schriftarten, die im übergebenen Dokument tatsächlich per Mark referenziert werden (Anforderung 1, Zeile 4). */
export function usedFontFamilies(doc: PMNode): string[] {
  const names = new Set<string>()
  doc.descendants((node) => {
    if (!node.isText) return
    for (const mark of node.marks) {
      if (mark.type.name === 'fontFamily') names.add(mark.attrs.family as string)
    }
  })
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'de'))
}

// --- Local Font Access API (progressive Erweiterung, Anforderung 1 Zeile 3, 3.12, 4.5) ---

interface LocalFontLike {
  family: string
}

declare global {
  interface Window {
    queryLocalFonts?: () => Promise<LocalFontLike[]>
  }
}

let cachedSystemFonts: string[] | null = null
let inFlight: Promise<string[]> | null = null

/**
 * Liefert echte Systemschriftarten, falls die Local Font Access API verfügbar ist und
 * die Nutzer:in zustimmt. Ergebnis wird für die Lebensdauer des Tabs gecacht — pro
 * Sitzung höchstens ein Berechtigungsdialog, auch bei wiederholtem Öffnen der Combobox
 * (Grenzfall 3.12/4.5). Bei fehlender API oder verweigerter/fehlgeschlagener
 * Berechtigung: leeres Array, kein Fehler, kein Reject nach außen.
 */
export async function getSystemFonts(): Promise<string[]> {
  if (cachedSystemFonts) return cachedSystemFonts
  if (inFlight) return inFlight
  if (typeof window === 'undefined' || typeof window.queryLocalFonts !== 'function') {
    cachedSystemFonts = []
    return cachedSystemFonts
  }
  inFlight = (async () => {
    try {
      const fonts = await window.queryLocalFonts!()
      const names = Array.from(new Set(fonts.map((f) => f.family))).sort((a, b) => a.localeCompare(b, 'de'))
      cachedSystemFonts = names
      return names
    } catch {
      // Berechtigung verweigert, API wirft, oder sonstiger Fehler — dokumentiertes
      // Fallback-Verhalten (Grenzfall 3.12), kein Fehler in der Konsole des Aufrufers.
      cachedSystemFonts = []
      return []
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

/** Nur für Tests: setzt den Modul-Cache zurück, damit Testfälle sich nicht gegenseitig beeinflussen. */
export function __resetSystemFontsCacheForTests(): void {
  cachedSystemFonts = null
  inFlight = null
}
```

`__resetSystemFontsCacheForTests` ist bewusst exportiert (nicht `@internal`-only), weil
Vitest denselben Modul-Cache über mehrere `it()`-Blöcke hinweg teilt — ohne Reset würde
ein früherer Test mit gemocktem `queryLocalFonts` den Cache für alle folgenden Tests
verfälschen.

---

## 7. Toolbar — neue Combobox-Komponente

### 7.1 Neue Datei — `src/formats/shared/editor/FontFamilyCombobox.tsx`

Da es im Repo **kein** existierendes Combobox-Muster gibt (Abschnitt 2.2), wird eine
minimale, barrierefreie Implementierung ohne externe Abhängigkeit gebaut. Kernstruktur:

```tsx
import { useEffect, useRef, useState } from 'react'
import type { EditorView } from 'prosemirror-view'
import { wordSchema } from '../schema'
import { applyFontFamily, clearFontFamily, getActiveFontFamily } from './commands'
import { CURATED_FONTS, cssFontFamily, getSystemFonts, usedFontFamilies } from './fonts'

const MAX_RENDERED_OPTIONS = 200 // Grenzfall 3.4: Performance bei sehr langen Listen

interface Option {
  name: string
  group: 'used' | 'curated'
}

export function FontFamilyCombobox({ view }: { view: EditorView }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(-1)
  const [systemFonts, setSystemFonts] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const { family, mixed } = getActiveFontFamily(view.state)

  function openList() {
    setQuery(family ?? '')
    setOpen(true)
    setHighlight(-1)
    getSystemFonts().then(setSystemFonts) // gecacht, kein erneuter Dialog (3.12/4.5)
  }

  function commit(name: string) {
    const trimmed = name.trim()
    if (trimmed) {
      applyFontFamily(trimmed)(view.state, view.dispatch)
    }
    view.focus()
    setOpen(false)
    setQuery('')
  }

  function reset() {
    setOpen(false)
    setQuery('')
  }

  const used = usedFontFamilies(view.state.doc)
  const seen = new Set<string>()
  const options: Option[] = []
  for (const name of used) if (!seen.has(name)) { seen.add(name); options.push({ name, group: 'used' }) }
  for (const name of [...CURATED_FONTS, ...systemFonts]) {
    if (!seen.has(name)) { seen.add(name); options.push({ name, group: 'curated' }) }
  }
  const filtered = query
    ? options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    : options
  const visible = filtered.slice(0, MAX_RENDERED_OPTIONS)

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, visible.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, -1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlight >= 0 && visible[highlight]) commit(visible[highlight].name)
      else if (query.trim()) commit(query) // Freitext, Grenzfall 3.10
      else reset()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      reset() // vorheriger Anzeigewert kommt automatisch zurück, da `family` aus view.state gelesen wird
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-label="Schriftart"
        aria-controls="font-family-listbox"
        aria-activedescendant={highlight >= 0 && visible[highlight] ? `font-opt-${highlight}` : undefined}
        placeholder={mixed ? 'Gemischt' : 'Standard'}
        value={open ? query : (family ?? '')}
        onFocus={openList}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(-1) }}
        onKeyDown={onKeyDown}
        onBlur={reset}
        className="w-40 text-sm rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1"
      />
      <button
        type="button"
        title="Schriftart entfernen"
        aria-label="Schriftart entfernen"
        onMouseDown={(e) => { e.preventDefault(); clearFontFamily()(view.state, view.dispatch); view.focus() }}
        className="px-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
      >
        ⌫
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-56">
          {/* aria-live-Region MUSS außerhalb des listbox stehen und dauerhaft (solange offen)
              gemountet sein, damit Screenreader den Leer-Treffer ansagen (Anforderung 4.6). */}
          <div role="status" aria-live="polite" className="sr-only">
            {visible.length === 0 ? 'Keine Schriftart gefunden' : ''}
          </div>
          <ul id="font-family-listbox" role="listbox" aria-label="Schriftart" className="max-h-64 overflow-auto rounded border border-neutral-300 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            {visible.length === 0 && (
              // sichtbarer (nicht-Listbox-)Hinweis; für AT übernimmt die aria-live-Region oben.
              <li role="presentation" className="px-2 py-1 text-sm text-neutral-500 dark:text-neutral-400">Keine Schriftart gefunden</li>
            )}
            {visible.map((opt, i) => (
              // role="presentation" auf dem <li>, damit zwischen role="listbox" und
              // role="option" keine fremde listitem-Rolle steht (Anforderung 4.6).
              <li key={`${opt.group}-${opt.name}`} role="presentation">
                <button
                  type="button"
                  id={`font-opt-${i}`}
                  role="option"
                  aria-selected={i === highlight}
                  style={{ fontFamily: cssFontFamily(opt.name) }}
                  onMouseEnter={() => setHighlight(i)}
                  // preventDefault verhindert den Blur des <input>, bevor onClick feuert —
                  // dasselbe Muster wie bei den bestehenden Toolbar-Buttons (Toolbar.tsx `run()`).
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commit(opt.name)}
                  className={`block w-full truncate px-2 py-1 text-left text-sm ${i === highlight ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}
                >
                  {opt.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

Hinweis zu den Optionen-`id`s: `id={`font-opt-${i}`}` indiziert bewusst über die
**Sichtbarkeits-/Filter-Position** (`i` in `visible`), nicht über den Namen — dieselbe
Größe, auf die sich `highlight` und `aria-activedescendant` (Abschnitt 7.1 Input) beziehen,
sodass die drei Werte immer konsistent bleiben. Da die Combobox pro Editor-Instanz nur
**einmal** in der Toolbar vorkommt, ist ein globaler `id`-Präfix (`font-opt-…`) eindeutig;
käme die Komponente je mehrfach vor, wäre ein `useId()`-Präfix vorzuschalten.

Designentscheidungen, die hier bewusst getroffen wurden (mit Bezug auf die
Grenzfälle/UI-Robustheit aus Anforderung Abschnitt 3/4):

- **Kein separates „Im Dokument verwendet"-Label als eigene `<li>`-Überschrift** in
  diesem ersten Entwurf — die Gruppierung existiert datenseitig (`Option.group`), das
  visuelle Gruppen-Trennzeichen (z. B. ein nicht-interaktives `<li>` mit Text „Im
  Dokument verwendet") ist eine reine Rendering-Ergänzung ohne Auswirkung auf Logik/Tests
  und wird beim Bau ergänzt; hier nur die Datenstruktur (`Option.group`) verbindlich
  festgelegt, damit Tests gegen `role="option"`-Einträge zielen können statt gegen die
  optische Gruppierung.
- **Freitext-Commit bei Enter ohne Highlight** deckt Grenzfall 3.10/3.11 ab: auch wenn
  `visible` leer ist (kein Treffer), bleibt `commit(query)` erreichbar.
- **`onMouseDown` + `preventDefault()` auf Options-Buttons** verhindert, dass der Klick
  in die Liste den `<input>` zuerst blurred (was sonst `reset()` vor `commit()` auslösen
  würde) — dasselbe etablierte Muster wie bei den bestehenden `MarkButton`/`AlignButton`
  (`Toolbar.tsx`, aktuell Zeile 76–77 bzw. 98–99), das den Editor-Fokus bei Klicks außerhalb des
  `contentEditable` bewahrt. Erfüllt Grenzfall 4.3 („Öffnen/Bedienen der Liste darf
  Editor-Fokus/Selektion nicht vor Bestätigung zerstören") ohne zusätzlichen Code: da
  zwischen `openList()` und `commit()` **keine** Transaktion auf `view` dispatcht wird,
  bleibt `view.state.selection` unverändert erhalten, bis der Nutzer tatsächlich
  bestätigt.
- **Kein separater `document`-Click-Listener** für „Klick außerhalb schließt die
  Liste" — der native `onBlur` des `<input>` deckt das ab, weil alle interaktiven
  Elemente *innerhalb* der Liste ihren eigenen Blur via `preventDefault()` unterdrücken
  (siehe oben). Das vermeidet das in Grenzfall 4.5 explizit benannte Risiko doppelt
  registrierter globaler Event-Handler.
- **`MAX_RENDERED_OPTIONS = 200`** ist die pragmatische Antwort auf Grenzfall 3.4 (sehr
  lange Local-Font-Access-Listen): keine Virtualisierungsbibliothek nötig, harte Deckelung
  der gerenderten `<li>`-Elemente reicht für „hunderte" Einträge aus; sollte ein
  QA-Durchlauf mit realer Hardware (>1500 Systemschriften) spürbares Ruckeln zeigen, ist
  eine Windowing-Lösung ein separater Folge-Fix, kein Blocker für dieses Ticket.
- **„⌫"-Glyph des Entfernen-Buttons (Anforderung 4.6):** Der Entwurf nutzt `⌫` identisch zu
  den bestehenden Farb-Entfernen-Buttons (`Toolbar.tsx`, aktuell Zeile 209/229) und trägt
  `title`/`aria-label="Schriftart entfernen"`. Anforderung 4.6 listet dieses Glyph als
  potenziell unzuverlässig (leeres Rechteck/Fragezeichen auf Systemen ohne Glyphenabdeckung);
  dieselbe offene Frage betrifft bereits die Farb-Buttons. Zeigt das QA-Rendering auf mehreren
  Systemen ein Rechteck/Fragezeichen, ist auf ein Inline-SVG umzustellen — Vorlage ist die im
  Repo bereits vorhandene `ScissorsIcon`-Komponente (`Toolbar.tsx`, aktuell Zeile 33–53). Die
  Entscheidung ist konsistent mit den Farb-Buttons zu treffen, nicht als Sonderfall nur für
  Schriftart.

### 7.2 Änderung — `src/formats/shared/editor/Toolbar.tsx`

Einfügeposition: **nach** dem schließenden `</select>` des Absatzformat-Dropdowns und
dessen Trenner (aktuell Zeile 165–180), **vor** der bestehenden `MarkButton`-Zeile
(Zeile 184) — exakt wie in Anforderung Tabelle 1, Zeile 1 verlangt („direkt nach dem
Absatzformat-Dropdown und vor den Fett/Kursiv/…-Buttons"):

```tsx
      <select aria-label="Absatzformat" /* … unverändert, aktuell Zeile 165–180 … */>
        {/* … */}
      </select>

      <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />

      <FontFamilyCombobox view={view} />

      <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />

      <MarkButton view={view} mark="strong" label="F" title="Fett" glyphClassName="font-bold" />
      {/* … unverändert … */}
```

Import-Ergänzung am Dateikopf: `import { FontFamilyCombobox } from './FontFamilyCombobox'`.
Keine sonstigen Änderungen an `Toolbar.tsx` nötig — `run()` (aktuell Zeile 28–31) wird von der
neuen Komponente nicht wiederverwendet, weil die Combobox eigene Fokus-Rückgabe-Logik
braucht (`view.focus()` erst nach `setOpen(false)`, nicht vor dem State-Update).

---

## 8. DOCX — Lese-/Schreibunterstützung

### 8.1 `src/formats/docx/reader.ts` — `marksFromRunProperties` (aktuell Zeile 100–115)

Ergänzung nach der bestehenden `highlight`-Auswertung (vor `return marks`):

```ts
const rFonts = firstChildNS(rPr, OOXML_NAMESPACES.w, 'rFonts')
const family = rFonts?.getAttributeNS(OOXML_NAMESPACES.w, 'ascii') || rFonts?.getAttributeNS(OOXML_NAMESPACES.w, 'hAnsi')
if (family) marks.push({ type: 'fontFamily', attrs: { family } })
```

Genau die in Anforderung 2.8 verlangte Logik: `w:ascii` zuerst, `w:hAnsi` als Fallback.
Ein `<w:rFonts w:eastAsia="…"/>` **ohne** `w:ascii`/`w:hAnsi` (Grenzfall 3.14 — real
vorhanden in `bug57031.docx`, siehe Abschnitt 12.1) ergibt `family === null` → keine
Mark → Text fällt auf den Basiswert zurück, kein Absturz, kein leeres Attribut. Das ist
die in Design-Entscheidung 3.1 festgelegte, dokumentierte Fallback-Semantik.

### 8.2 `src/formats/docx/writer.ts` — `runPropertiesXml` (aktuell Zeile 20–33)

**Reihenfolge beachten:** `<w:rFonts>` ist im OOXML-Schema `CT_RPr` das erste
formatierungsrelevante Kind von `<w:rPr>` (Sequenz `rStyle`, `rFonts`, `b`, `i`, …) und muss
`w:b`/`w:i`/… vorausgehen. Deshalb wird die Schriftart **vor** der bestehenden Marker-Schleife
behandelt, nicht per `props.push` am Schleifenende (das platzierte sie fälschlich hinter
`w:shd`, siehe Korrektur 2 in Abschnitt 0.1):

```ts
function runPropertiesXml(marks: JsonNode['marks']): string {
  const props: string[] = []
  const fontMark = (marks ?? []).find((m) => m.type === 'fontFamily')
  if (fontMark) {
    const family = escapeXml(String(fontMark.attrs?.family ?? ''))
    props.push(`<w:rFonts w:ascii="${family}" w:hAnsi="${family}" w:cs="${family}" w:eastAsia="${family}"/>`)
  }
  for (const mark of marks ?? []) {
    if (mark.type === 'strong') props.push('<w:b/>')
    // … bestehende em/underline/strike/textColor/highlight-Zweige unverändert …
  }
  return props.length ? `<w:rPr>${props.join('')}</w:rPr>` : ''
}
```

`escapeXml` ist in dieser Datei bereits importiert (Zeile 3) und wird hier — anders als
bei `textColor`/`highlight`, deren Werte reine Hex-Codes ohne Sonderzeichen sind — aktiv
gebraucht, weil Schriftartnamen beliebige Zeichen (Anführungszeichen, kaufmännisches Und,
Umlaute) enthalten können (Anforderung 2.7/3.3). Alle vier Attribute erhalten denselben
Namen, wie in Anforderung 2.8 gefordert. Der Suite-Validator `mammoth`
(`docx/__tests__/external-validation.test.ts`) ist reihenfolge-tolerant; die schemakorrekte
Erst-Position ist die risikoärmere Wahl für Testfall 23 (unabhängige OOXML-Erkennung).

`inlineToRuns` (Zeile 39–65) braucht **keine** Änderung: Die Lauf-Zusammenführung
funktioniert markentyp-agnostisch bereits korrekt für ein zusätzliches Mark-Objekt in der
Marks-Liste, solange Marks in konsistenter Reihenfolge ankommen (siehe Abschnitt 2.1,
letzter Punkt — im echten App-Datenfluss garantiert, in Unit-Tests zu beachten).

---

## 9. ODT — Lese-/Schreibunterstützung

Das ist der aufwendigste Teil, weil ODF für Schriftarten eine zweistufige Referenz
verlangt (Textstil → `style:font-name` → `office:font-face-decls` → `svg:font-family`),
während DOCX den Namen direkt im Textlauf trägt.

### 9.1 `src/formats/odt/reader.ts`

**`RunStyle`-Interface** (aktuell Zeile 14–21) um ein Feld erweitern:

```ts
interface RunStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  color?: string
  highlight?: string
  fontFamily?: string
}
```

**Neue Hilfsfunktion**, vor `parseAutomaticStyles` einfügen:

```ts
/** `office:font-face-decls` ist ein direktes Geschwister-Element von `office:automatic-styles`
 *  unter der Dokumentwurzel (nicht darin enthalten) — separat je Dokumentteil zu parsen. */
function parseFontFaceDecls(documentRoot: Element): Map<string, string> {
  const map = new Map<string, string>()
  const declsEl = firstChildNS(documentRoot, ODF_NAMESPACES.office, 'font-face-decls')
  if (!declsEl) return map
  for (const faceEl of childElements(declsEl, ODF_NAMESPACES.style, 'font-face')) {
    const name = faceEl.getAttributeNS(ODF_NAMESPACES.style, 'name')
    const family = faceEl.getAttributeNS(ODF_NAMESPACES.svg, 'font-family')
    if (name && family) map.set(name, unquoteFontFamily(family))
  }
  return map
}

/** ODF/CSS2-Konvention: mehrteilige Namen werden mit einfachen Anführungszeichen umschlossen
 *  (z. B. `svg:font-family="'Times New Roman'"`) — DOMParser hat `&apos;` bereits zu `'` dekodiert. */
function unquoteFontFamily(value: string): string {
  const trimmed = value.trim()
  return trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'") ? trimmed.slice(1, -1) : trimmed
}
```

**`parseAutomaticStyles`** (aktuell Zeile 37–78) bekommt einen zweiten Parameter und liest
zusätzlich `style:font-name`:

```ts
function parseAutomaticStyles(automaticStylesEl: Element | null, fontFaces: Map<string, string>): ParsedStyles {
  // … unverändert bis zur bestehenden highlight-Auswertung …
  const fontNameRef = props.getAttributeNS(ODF_NAMESPACES.style, 'font-name')
  if (fontNameRef) style.fontFamily = fontFaces.get(fontNameRef) ?? fontNameRef // Fallback: Grenzfall 3.13
  // …
}
```

Der `?? fontNameRef`-Fallback ist **exakt** Grenzfall 3.13: fehlt der zugehörige
`office:font-face-decls`-Eintrag (kaputte/vereinfachte Fremddatei), wird der rohe
`style:font-name`-Wert direkt als Anzeigename übernommen — kein Absturz, keine
stillschweigend verlorene Information.

**`decodeInline` → `marksFor`** (aktuell Zeile 100–112) ergänzt:

```ts
if (style.fontFamily) marks.push({ type: 'fontFamily', attrs: { family: style.fontFamily } })
```

**`readOdt`** (aktuell Zeile 357–409): beide Aufrufstellen von `parseAutomaticStyles` bekommen
die zugehörige Font-Face-Map:

```ts
const contentFontFaces = parseFontFaceDecls(contentDoc.documentElement)
const contentStyles = parseAutomaticStyles(contentAutomaticStyles, contentFontFaces)
// …
const stylesFontFaces = parseFontFaceDecls(stylesDoc.documentElement)
const stylesForChrome = parseAutomaticStyles(stylesAutomaticStyles, stylesFontFaces)
```

### 9.2 `src/formats/odt/styleRegistry.ts`

**`RunProps`** (Zeile 3–10) erweitern: `fontFamily?: string`.

**`isEmpty`** (Zeile 12–14) erweitern: `&& !props.fontFamily`.

**Neue Klasse** `FontFaceRegistry`, analog zu `TextStyleRegistry` aber für
`office:font-face-decls`-Einträge, dedupliziert je Registry-Instanz (Design-Entscheidung
3.4 — eine Instanz pro Dokumentteil):

```ts
/**
 * Sammelt `<style:font-face>`-Deklarationen für `office:font-face-decls`, dedupliziert
 * nach Namen. Anforderung 2.9: jede referenzierte Schriftart braucht zwingend sowohl
 * `style:font-name` am Textstil als auch einen eigenen `style:font-face`-Eintrag.
 */
export class FontFaceRegistry {
  private seen = new Set<string>()
  private defs: string[] = []

  declare(name: string): void {
    if (this.seen.has(name)) return
    this.seen.add(name)
    const needsQuoting = /[^a-zA-Z0-9-]/.test(name)
    const svgValue = needsQuoting ? `'${name.replace(/'/g, "\\'")}'` : name
    this.defs.push(`<style:font-face style:name="${escapeXml(name)}" svg:font-family="${escapeXml(svgValue)}"/>`)
  }

  serializeDefs(): string {
    return this.defs.length ? `<office:font-face-decls>${this.defs.join('')}</office:font-face-decls>` : ''
  }
}
```

`style:name` wird bewusst identisch zum tatsächlichen Schriftartnamen gewählt (keine
`T1`/`T2`-artige Kurz-ID wie bei `TextStyleRegistry`) — ODF erlaubt beliebige Zeichen
(inkl. Leerzeichen) in `style:name`-Attributwerten direkt, eine zusätzliche
Indirektionsebene wäre unnötige Komplexität ohne Zugewinn. Das entspricht dem in
Fixture `FruitDepot-SeasonalFruits4.odt` beobachteten Muster echter Word-Exporte, nur
ohne deren Suffix-Kollisionsproblem (`Arial1`, `Arial2` — siehe Abschnitt 12.2), das dort
entsteht, weil Word denselben Namen aus verschiedenen Quell-Substitutionen mehrfach
einträgt; da diese App pro `FontFaceRegistry`-Instanz genau einmal pro eindeutigem Namen
dedupliziert, kann dieses Kollisionsmuster beim eigenen Export nicht auftreten.

**`TextStyleRegistry`** (Zeile 22–44) bekommt einen Konstruktor-Parameter und registriert
die Schriftart bei jedem `styleNameFor`-Aufruf (auch im Cache-Treffer-Fall — zwei
verschiedene `T`-Stile können dieselbe Schriftart referenzieren, siehe Design-Entscheidung
4/Anforderung 2.9 Absatz 2):

```ts
export class TextStyleRegistry {
  private byKey = new Map<string, string>()
  private defs: string[] = []
  private counter = 0

  constructor(private fontFaces: FontFaceRegistry) {}

  styleNameFor(props: RunProps): string | null {
    if (isEmpty(props)) return null
    if (props.fontFamily) this.fontFaces.declare(props.fontFamily)

    // Kanonischer Key statt JSON.stringify(props) (siehe Abschnitt 2.1 — bereits vor
    // dieser Anforderung als Härtungsbedarf erkannt, jetzt inkl. fontFamily miterledigt):
    const key = JSON.stringify([
      props.bold ?? false,
      props.italic ?? false,
      props.underline ?? false,
      props.strike ?? false,
      props.color ?? null,
      props.highlight ?? null,
      props.fontFamily ?? null,
    ])
    const existing = this.byKey.get(key)
    if (existing) return existing

    this.counter += 1
    const name = `T${this.counter}`
    this.byKey.set(key, name)
    this.defs.push(buildTextStyleXml(name, props))
    return name
  }

  serializeDefs(): string {
    return this.defs.join('')
  }
}
```

**`buildTextStyleXml`** (Zeile 46–59) ergänzt:

```ts
if (props.fontFamily) attrs.push(`style:font-name="${escapeXml(props.fontFamily)}"`)
```

### 9.3 `src/formats/odt/writer.ts`

**`runPropsFromMarks`** (aktuell Zeile 32–43) ergänzt:

```ts
if (mark.type === 'fontFamily') props.fontFamily = mark.attrs?.family as string
```

**`buildContentXml`** (aktuell Zeile 206–214) und **`buildStylesXml`** (aktuell Zeile 216–233) bekommen
je einen zusätzlichen `FontFaceRegistry`-Parameter, dessen `serializeDefs()`-Ausgabe
**vor** `<office:automatic-styles>` bzw. **vor** `<office:styles>` eingefügt wird (ODF
verlangt `office:font-face-decls` als erstes optionales Kind-Element der
Dokumentwurzel, vor `office:automatic-styles`):

```ts
function buildContentXml(bodyXml: string, styles: TextStyleRegistry, fontFaces: FontFaceRegistry): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<office:document-content ${NAMESPACE_DECLARATIONS} office:version="1.3">` +
    fontFaces.serializeDefs() +
    `<office:automatic-styles>${paragraphAlignStyleDefs()}${headingStyleDefs()}${listStyleDefs()}${styles.serializeDefs()}</office:automatic-styles>` +
    `<office:body><office:text>${bodyXml}</office:text></office:body>` +
    `</office:document-content>`
  )
}

function buildStylesXml(headerXml: string | null, footerXml: string | null, styles: TextStyleRegistry, fontFaces: FontFaceRegistry): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<office:document-styles ${NAMESPACE_DECLARATIONS} office:version="1.3">` +
    fontFaces.serializeDefs() +
    `<office:styles><style:style style:name="Standard" style:family="paragraph"/></office:styles>` +
    /* … Rest unverändert … */
  )
}
```

**`writeOdt`** (aktuell Zeile 260–305) verdrahtet je eine `FontFaceRegistry`-Instanz pro
Dokumentteil (Design-Entscheidung 3.4). **Wichtig (Korrektur 1 aus 0.1):** `blocksToOdt`/
`blockToOdt` haben inzwischen einen vierten Parameter `tableNames: TableNameSequence`
(Klasse Zeile 54–60) für die deterministische `table:name`-Vergabe — er muss unverändert
durchgereicht werden, sonst bricht der Tabellen-Export:

```ts
export async function writeOdt(doc: WordDocumentContent): Promise<Blob> {
  const bodyFontFaces = new FontFaceRegistry()
  const bodyStyles = new TextStyleRegistry(bodyFontFaces)
  const images = new ImageCollector()
  const tableNames = new TableNameSequence() // bestehend — NICHT entfernen
  const bodyXml = blocksToOdt((doc.body as unknown as JsonNode).content, bodyStyles, images, tableNames)

  const chromeFontFaces = new FontFaceRegistry()
  const chromeStyles = new TextStyleRegistry(chromeFontFaces)
  const header = doc.header as unknown as JsonNode | null
  const footer = doc.footer as unknown as JsonNode | null
  const headerXml = header ? blocksToOdt(header.content, chromeStyles, images, tableNames) : null
  const footerXml = footer ? blocksToOdt(footer.content, chromeStyles, images, tableNames) : null

  const contentXml = buildContentXml(bodyXml, bodyStyles, bodyFontFaces)
  const stylesXml = buildStylesXml(headerXml, footerXml, chromeStyles, chromeFontFaces)
  // … Rest (metaXml, manifest, Zip-Zusammenbau, stampZipEntriesForDeterminism) unverändert …
}
```

Import-Ergänzung am Dateikopf von `writer.ts`: `FontFaceRegistry` zur bestehenden
`import { TextStyleRegistry, …, type RunProps } from './styleRegistry'`-Zeile (Zeile
4–14) hinzufügen.

---

## 10. Zusammenfassende Änderungstabelle

| # | Datei | Änderung | Typ |
|---|---|---|---|
| 1 | `src/formats/shared/schema.ts` | neue Mark `fontFamily` (Abschnitt 4) | Neu |
| 2 | `src/formats/shared/editor/commands.ts` | `applyFontFamily`, `clearFontFamily`, `getActiveFontFamily` (Abschnitt 5) | Neu |
| 3 | `src/formats/shared/editor/fonts.ts` | **neue Datei** (Abschnitt 6) | Neu |
| 4 | `src/formats/shared/editor/FontFamilyCombobox.tsx` | **neue Datei** (Abschnitt 7.1) | Neu |
| 5 | `src/formats/shared/editor/Toolbar.tsx` | Einbindung der Combobox (Abschnitt 7.2) | Fix/Erweiterung |
| 6 | `src/formats/docx/reader.ts` | `w:rFonts` in `marksFromRunProperties` (Abschnitt 8.1) | Neu |
| 7 | `src/formats/docx/writer.ts` | `w:rFonts` in `runPropertiesXml` (Abschnitt 8.2) | Neu |
| 8 | `src/formats/odt/reader.ts` | `office:font-face-decls`-Parsing, `RunStyle.fontFamily` (Abschnitt 9.1) | Neu |
| 9 | `src/formats/odt/styleRegistry.ts` | `FontFaceRegistry`, `RunProps.fontFamily`, kanonischer Dedup-Key (Abschnitt 9.2) | Neu + Härtung |
| 10 | `src/formats/odt/writer.ts` | Verdrahtung `FontFaceRegistry` (Abschnitt 9.3) | Neu |
| 11 | `src/formats/shared/documentModel.ts` | **keine Änderung** — `WordDocumentContent` bleibt unverändert, Marks stecken bereits im `body`/`header`/`footer`-JSON | — |
| 12 | `src/formats/docx/xmlUtil.ts`, `src/formats/odt/xmlUtil.ts` | **keine Änderung** — benötigte Namespaces (`svg`, `office`) bereits vorhanden (Abschnitt 2.2) | — |
| 13 | `src/index.css` | **keine Änderung** — keine konkurrierende Basisschriftart (Abschnitt 2.1) | — |
| 14 | `src/formats/shared/editor/WordEditor.tsx` | **keine Änderung** — kein neues Tastaturkürzel (Design-Entscheidung 3.6), Re-Render-Mechanismus bereits ausreichend (Abschnitt 2.1) | — |

---

## 11. Neue/erweiterte Testdateien

### 11.1 Unit-Tests (Vitest/jsdom)

**Neu: `src/formats/shared/editor/__tests__/fonts.test.ts`**
- `cssFontFamily`/`genericFallbackFor`: Quotierung bei Leerzeichen/Sonderzeichen,
  korrekte generische Fallback-Familie je Namensgruppe (Anforderung 2.6/2.7).
- `parseFirstFontFamily`: rundreisefest zu `cssFontFamily` (`parseFirstFontFamily(cssFontFamily(x)) === x`
  für alle `CURATED_FONTS`-Einträge plus einen Namen mit Umlaut/Sonderzeichen, Grenzfall 3.3).
- `usedFontFamilies`: leeres Dokument → `[]`; mehrere Läufe mit derselben Schriftart →
  ein Eintrag (Dedup); zwei verschiedene Schriftarten → beide, sortiert.
- `getSystemFonts`: mit gemocktem `window.queryLocalFonts` — (a) Erfolg liefert
  deduplizierte, sortierte Namen; (b) `undefined` (API fehlt) → `[]`, kein Reject
  (Grenzfall 3.12); (c) Reject/Exception im Callback → `[]`, kein Reject nach außen; (d)
  zwei aufeinanderfolgende Aufrufe innerhalb desselben „Tabs" rufen `queryLocalFonts`
  nur **einmal** auf (Cache-Test, Grenzfall 4.5) — `__resetSystemFontsCacheForTests()`
  zwischen den `it()`-Blöcken aufrufen.

**Neu: `src/formats/shared/editor/__tests__/commands.test.ts`**
- `applyFontFamily`/`clearFontFamily` auf `EditorState` mit echter/leerer Selektion:
  Mark wird exakt auf `[from, to)` gesetzt (2.1), stored mark bei leerer Selektion (2.2),
  No-Op bei erneuter Anwendung derselben Schriftart erzeugt keine doppelte/verschachtelte
  Mark (Grenzfall 3.9 — hier isoliert auf Transform-Ebene, zusätzlich zum E2E-Nachweis).
- `getActiveFontFamily`: einzelne Schriftart → `{family, mixed:false}`; zwei
  unterschiedliche Schriftarten in einer Selektion → `{family:null, mixed:true}`
  (Grenzfall 3.1); Text ohne Mark → `{family:null, mixed:false}`.

**Neu: `src/formats/docx/__tests__/font-family.test.ts`**
- `w:ascii` vorhanden → Mark mit diesem Namen.
- Nur `w:hAnsi` (kein `w:ascii`) → Fallback greift (2.8).
- Nur `w:eastAsia` (kein `w:ascii`/`w:hAnsi`) → **keine** Mark (Grenzfall 3.14) — Testfall
  direkt gegen die reale Struktur aus `bug57031.docx` nachgebaut (siehe Abschnitt 12.1).
- Schreiben: `w:ascii`/`w:hAnsi`/`w:cs`/`w:eastAsia` immer identisch (2.8), Name mit
  Anführungszeichen/Et-Zeichen korrekt XML-escaped (2.7).
- Kombination `fontFamily` + `strong` + `textColor` auf demselben Lauf → alle drei
  `w:rPr`-Kindelemente vorhanden (2.5, Rundreise-Kriterium 3).

**Neu: `src/formats/odt/__tests__/font-family.test.ts`**
- `style:font-name` + passender `office:font-face-decls`-Eintrag → korrekt aufgelöster
  `svg:font-family`-Wert als Mark.
- `style:font-name` **ohne** passenden `font-face-decls`-Eintrag → Fallback auf rohen
  Namen (Grenzfall 3.13), kein Absturz.
- Mehrteiliger Name in `svg:font-family="'Times New Roman'"` (einfach gequotet) wird
  korrekt entquotet.
- Schreiben: sowohl `style:font-name` am Textstil als auch ein `style:font-face`-Eintrag
  in `office:font-face-decls` vorhanden (2.9, Defekt-Kriterium wörtlich aus der
  Anforderung); zwei Textläufe mit derselben Schriftart, aber unterschiedlichem
  Fett-Status → zwei `T`-Stile, aber **ein** `style:font-face`-Eintrag (Dedup, 2.9 Absatz 2).
- Reale Fixture-Assertion gegen `FruitDepot-SeasonalFruits4.odt` (siehe Abschnitt 12.2):
  `style:name="Arial1"`/`"Arial2"` müssen beide auf `family: "Arial"` auflösen, **nicht**
  auf den rohen Deklarationsnamen — das ist der konkrete Beweis, warum ein direktes
  Verwenden von `style:font-name` ohne Auflösung über `office:font-face-decls` falsch
  wäre.

**Erweiterung: beide `roundtrip.test.ts`**
- Neuer Testfall „preserves font family" analog zu den bestehenden
  Bold/Italic/Underline-Fällen (Zeile 56–78 in beiden Dateien), inkl. eines Namens mit
  Leerzeichen (Grenzfall 3.2) und eines mit Umlaut (Grenzfall 3.3).
- Neuer Testfall „preserves font family combined with bold, color and highlight on the
  same run" (Rundreise-Kriterium 3).
- ODT: neuer Testfall „does not duplicate style:font-face when the same font is used in
  differently-formatted runs" (siehe Abschnitt 9.2 Dedup).

Hinweis zur Testkonvention (siehe Abschnitt 2.1, letzter Punkt): In handgeschriebenen
`marks: […]`-Arrays für Roundtrip-Tests wird `fontFamily` **zuletzt** in der Liste
notiert, in derselben Reihenfolge wie in `schema.ts` deklariert
(`strong, em, underline, strike, textColor, highlight, fontFamily`), damit
`inlineToRuns`s ordnungssensitiver Lauf-Vergleich (`docx/writer.ts` Zeile 52) nicht durch
zufällig unterschiedliche Testautor-Reihenfolge zwei eigentlich identische Läufe fälschlich
als unterschiedlich behandelt.

### 11.2 E2E-Tests (Playwright) — Kernstück der Anforderung (Abschnitt 7, Punkt 2/3)

**Neu: `tests/e2e/font-family.spec.ts`**, Struktur analog zu `docx.spec.ts`/`odt.spec.ts`/
`selection-regression.spec.ts` (gleiche `docxCard`/`odtCard`-Locator-Helfer
wiederverwenden):

```
describe „Schriftart — Toolbar & Tastatur"
  - Testfall 2.1: Selektion + Combobox-Auswahl setzt Mark exakt auf Selektion, Text davor/danach unverändert
  - Testfall 2.2: Schriftart an leerer Schreibmarke wirkt nur auf neu getippten Text (stored mark),
    verschwindet nach Cursorbewegung (Pfeiltaste) an eine andere Stelle
  - Testfall 2.2 Enter-Verhalten: Schriftart an Schreibmarke setzen, Enter, tippen — Ergebnis
    dokumentieren und mit Fett/Kursiv an derselben Stelle vergleichen (identisches Verhalten Pflicht)
  - Testfall 2.3: Cursor in bereits formatierten Text (nach Upload) bewegen → Combobox zeigt
    korrekten Wert; Selektion über zwei Schriftarten → "Gemischt"-Platzhalter (Grenzfall 3.1)
  - Testfall 2.5: Live-Rendering — Editor-DOM enthält tatsächlich `style="font-family: …"` nach Anwenden
  - Testfall 2.6: Filter-Suche, Groß-/Kleinschreibung-unabhängig, live bei jedem Tastendruck
  - Grenzfall 3.7: Undo/Redo einer Schriftartänderung, auch nach mehreren Tippschritten danach
  - Grenzfall 3.8: leeres Dokument, Schriftart an Schreibmarke setzen, tippen → erstes Zeichen hat Schriftart
  - Grenzfall 3.9: dieselbe Schriftart zweimal anwenden → kein Fehler, kein verschachteltes <span>
  - Grenzfall 3.10/3.11: Freitext-Tippfehler wird übernommen; "Keine Schriftart gefunden" bei Filter ohne Treffer,
    Freitext-Commit funktioniert trotzdem
  - Grenzfall 3.6: Schriftart in Tabellenzelle, Listenpunkt, Überschrift (Kopf-/Fußzeile: siehe Abschnitt 13.2 —
    aktuell nicht editierbar, daher nur Struktur-Test über Reader/Writer-Unit-Tests, nicht E2E)
  - Grenzfall 3.15: schnelles Umschalten zwischen zwei Schriftarten mehrfach hintereinander,
    Dokument bleibt intakt (Regressionsmuster wie tests/e2e/selection-regression.spec.ts)
  - Grenzfall 3.16: Schriftart setzen, direkt danach Bild/Tabelle einfügen → kein Crash
  - Grenzfall 4.1: Absatzformat-Dropdown offen + Klick in Font-Combobox → nur eine Liste sichtbar
  - Grenzfall 4.2: Tab-Erreichbarkeit + vollständige Tastaturbedienung (Pfeile, Enter, Escape)
  - Grenzfall 4.4: Blur durch Klick außerhalb ohne Auswahl → keine Änderung, alter Wert zurück

describe „Schriftart — Rundreisen" (Abschnitt 6 der Anforderung, Format-Matrix)
  - Rundreise 1: DOCX mit Fremd-Schriftart hochladen (z. B. drawing.docx/bug59058.docx, siehe 12.1)
    → unverändert exportieren → re-importieren → Kriterien 1–7 (inkl. dirty:false-Check, 2.4)
  - Rundreise 2: ODT mit Fremd-Schriftart hochladen (formen_Legende.odt, siehe 12.2)
    → unverändert exportieren → re-importieren → Kriterien 1–7
  - Rundreise 3: neues Dokument → Schriftart über Toolbar setzen → als DOCX exportieren → re-importieren
    → Kriterien 1–3, 6, 7
  - Rundreise 4: neues Dokument → Schriftart über Toolbar setzen → als ODT exportieren → re-importieren
    → Kriterien 1–3, 6, 7
```

**Erweiterung: `tests/e2e/selection-regression.spec.ts`**

Neuer Testfall im bestehenden `describe`-Block (Grenzfall 3.15 ist im Kern derselbe
Selection-Sync-Regressionsklasse wie die dort bereits vorhandenen Bold-Tests, siehe
`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2):

```ts
test('rapid font-family switching does not corrupt content (Grenzfall 3.15)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Test Absatz.')
  await page.keyboard.press('ControlOrMeta+a')
  // { exact: true } ist Pflicht: der Entfernen-Button trägt aria-label="Schriftart entfernen",
  // ein Teilstring-Match auf "Schriftart" träfe sonst zwei Elemente (Strict-Mode-Verstoß) — siehe 0.2 Punkt 4.
  const fontInput = page.getByLabel('Schriftart', { exact: true })
  for (let i = 0; i < 6; i++) {
    await fontInput.fill(i % 2 === 0 ? 'Arial' : 'Georgia')
    await fontInput.press('Enter')
  }
  await expect(editor).toContainText('Test Absatz.')
})
```

---

## 12. Fixture-Inventar (reale Dateien für Rundreise-/Grenzfall-Tests)

### 12.1 DOCX (`w:rFonts` je Datei via `word/document.xml` geprüft)

| Datei | Befund | Eignung |
|---|---|---|
| `bug57031.docx` | 63 `<w:rFonts w:eastAsia="Times New Roman"/>` **ohne** `w:ascii`/`w:hAnsi`, daneben `w:ascii="Times New Roman"/"Arial"/"Cambria Math"/"Courier New"` an anderer Stelle | **Primär-Fixture für Grenzfall 3.14** (eastAsia-only) und gemischte Schriftarten in einer Datei |
| `bug59058.docx` | `w:ascii` u. a. `"MinionPro-bold"`, `"MinionPro-Regular"` (nicht in kuratierter Liste) | Fremd-/exotische Schriftart, Grenzfall 3.5, Rundreise-Testfall 1 |
| `drawing.docx` | `w:ascii` u. a. `"AGGalleon-Bold"`, `"PragmaticaC-Bold"`, `"Arial"`, `"Verdana"`, `"Times New Roman"` | Mischung kuratiert + exotisch, gut für Kombinationstest |
| `Bug54771a.docx`, `Bug54771b.docx` | **nur** `w:asciiTheme`/`w:eastAsiaTheme`/`w:hAnsiTheme`/`w:cstheme`, kein literales `w:ascii` | Nicht für diese Anforderung nutzbar — siehe Abschnitt 13.1 (bewusst nicht abgedeckter Theme-Fall), aber gut geeignet als Regressionstest „kein Crash, keine Mark" |

### 12.2 ODT (`style:font-name`/`office:font-face-decls` je Datei via `content.xml` geprüft)

| Datei | Befund | Eignung |
|---|---|---|
| `formen_Legende.odt` | `style:font-name` u. a. `"Verdana"`, `"Times New Roman"`, beide mit direktem `office:font-face-decls`-Eintrag | Rundreise-Testfall 2 (mehrere unterschiedliche, kuratierte Schriftarten) |
| `FruitDepot-SeasonalFruits4.odt` | `office:font-face-decls` enthält u. a. `style:name="Arial1" svg:font-family="Arial"`, `style:name="Arial2" svg:font-family="Arial"`, `style:name="Tahoma1" svg:font-family="Tahoma"`, sowie einfach-gequotete Mehrwort-/Nicht-Latein-Namen (`'Times New Roman'`, `'ヒラギノ角ゴ Pro W3'`, `'Open Sans Light'`) | **Konkreter Beweis-Fixture**, warum `style:font-name` über `office:font-face-decls` aufgelöst werden **muss** statt direkt verwendet zu werden — Primär-Fixture für den entsprechenden Unit-Test (Abschnitt 11.1) |
| `compdocfileformat.odt`, `excelfileformat.odt` | Exotische Deklarationsnamen (`Thorndale1`, `StarSymbol`, `SunSerif-Bold`) | Grenzfall 3.5 (Fremd-Schriftart nicht in kuratierter Liste) |
| `character-styles.odt`, `feature_attributes_character_MSO15.odt` | `style:font-name="Courier New"`, einfacher Fall | Rauchtest / einfache Rundreise |

Keine der vorhandenen ODT-Fixtures enthält einen `style:font-name` **ohne** passenden
`office:font-face-decls`-Eintrag (Grenzfall 3.13) — dieser Fall muss, wie bereits bei
vergleichbaren Grenzfällen in `unterstrichen-einfach-code.md` Abschnitt 5.1, über eine
handgebaute Minimal-ODT-Datei im Unit-Test simuliert werden, nicht über einen
Korpus-Fixture.

---

## 13. Bewusst nicht abgedeckte Fälle (zu dokumentieren, nicht stillschweigend offen zu lassen)

### 13.1 DOCX-Themeschriftarten (`w:asciiTheme` etc.)

Reale Word-Exporte referenzieren Absatz-/Zeichenformate häufig über Theme-Slots
(`majorHAnsi`/`minorHAnsi`, aufgelöst über `word/theme/theme1.xml` →
`<a:majorFont><a:latin typeface="…"/>`) statt über einen literalen `w:ascii`-Namen —
beobachtet in `Bug54771a.docx`/`Bug54771b.docx` (Abschnitt 12.1). Weder
`schriftart-waehlen-req.md` noch `FEATURE-SPEC-DOCX-ODT.md` erwähnen Theme-Auflösung.
Diese Anforderung/dieser Plan behandelt Theme-Referenzen **nicht** — sie ergeben nach
Abschnitt 8.1 keine Mark (dokumentiertes Fallback-Verhalten, kein Crash), was für den
Basis-Scope korrekt und sicher ist, aber **keine** vollständige Schriftart-Erkennung für
solche Dateien darstellt. Muss vor Status-Wechsel auf „verifiziert" explizit als bekannte
Einschränkung im Backlog vermerkt werden (analog zur in Anforderung 5.2 verlangten
Dokumentationspflicht für die Font-Embedding-Abgrenzung) — Vorschlag: eigener,
zukünftiger Slug „schriftart-theme-aufloesung" statt stillschweigend unter diesem Ticket
mitzulaufen.

### 13.2 Kopf-/Fußzeilen sind aktuell nicht editierbar

Anforderung Grenzfall 3.6 verlangt Schriftart-Anwendung „in Kopf-/Fußzeile" als
gleichwertigen Fall zu Fließtext/Tabelle/Liste/Überschrift. Der aktuelle Codestand
(Abschnitt 2.1, `WordEditor.tsx`) bietet **keine** editierbare UI für Kopf-/Fußzeilen
(`kopfzeile-bearbeiten`/`fusszeile-bearbeiten` sind eigene, laut Backlog noch „fehlt"
geführte Slugs). Reader/Writer dieser Anforderung behandeln `header`/`footer` dennoch
korrekt (dieselben `blocksToOdt`/`blockToDocx`-Funktionen werden für Body und
Kopf-/Fußzeile verwendet, siehe `docx/writer.ts` `writeDocx`, aktuell Zeile 256/265/270,
`odt/writer.ts` `writeOdt`, aktuell Zeile 266/271–272 — **nicht** Zeile 234–243 bzw.
188–195 wie in einer früheren Fassung dieses Plans fälschlich zitiert: Ersteres ist
`buildContentTypesXml`s Header/Footer-Content-Type-Override, Letzteres `blockToOdt`s
`unsupported_block`-Fallzweig, beides ohne Bezug zur eigentlichen Body/Header/Footer-
Verdrahtung) — die Schriftart-Mark wird also bereits jetzt korrekt in importierten
Kopf-/Fußzeilen erkannt und beim Re-Export erhalten, nur **keine interaktive
Neuanwendung** über die Toolbar ist möglich, weil es dafür noch keine editierbare
Oberfläche gibt. Der E2E-Test für 3.6/Kopf-Fußzeile beschränkt sich daher auf
Reader/Writer-Ebene (import → Mark vorhanden → unveränderter Export → Mark erhalten),
nicht auf interaktives Setzen über die UI. Kein Fix hierfür in diesem Ticket nötig — die
Lücke gehört zu `kopfzeile-bearbeiten`/`fusszeile-bearbeiten`.

### 13.3 Cross-Format-Export (DOCX↔ODT)

Wie in Anforderung Abschnitt 6 („Nachrichtlich, sobald Cross-Format-Export existiert")
explizit als nicht blockierend markiert: `speichern-unter-format` existiert laut Backlog
noch nicht. Kein Code hierfür in diesem Plan.

---

## 14. Offene Abhängigkeiten (nur dokumentieren, kein Code jetzt)

- **`formatierung-loeschen`**: Sobald umgesetzt, muss dessen globale
  „Formatierung löschen"-Logik `wordSchema.marks.fontFamily` mit in ihre Clear-Menge
  aufnehmen (siehe Anforderung Tabelle 1, Zeile 13). Kein Code jetzt, da Zielfunktion
  nicht existiert.
- **`schriftgroesse-waehlen`**: eigener Slug, eigene Mark (`fontSize`) — keine
  Überschneidung mit `fontFamily` im Schema, aber beide werden vermutlich in derselben
  Toolbar-Zeile nebeneinander landen; keine Code-Abhängigkeit jetzt.
- **`schriftart-theme-aufloesung`** (neu vorzuschlagender Slug, siehe Abschnitt 13.1):
  volle Word-Theme-Auflösung (`theme1.xml`) ist nicht Teil dieses Tickets.
- **`speichern-unter-format`**: Cross-Format-Rundreise DOCX↔ODT für Schriftartnamen
  (Word- vs. LibreOffice-Standardsätze, z. B. Calibri vs. Carlito) — siehe Anforderung
  Abschnitt 6, informativer Teil. Kein Code jetzt.

---

## 15. Abnahme-Mapping (Anforderung Abschnitt 3/4/6/7 → Testdatei)

| Anforderung | Abgedeckt durch |
|---|---|
| Abschnitt 1 (Bedienelemente) | `Toolbar.tsx` + `FontFamilyCombobox.tsx` (Abschnitt 7), `tests/e2e/font-family.spec.ts` |
| Abschnitt 2.1–2.9 (Verhalten) | `commands.ts`/`schema.ts` (Abschnitt 4/5) + zugehörige Unit-Tests (11.1) + `font-family.spec.ts` describe „Toolbar & Tastatur" |
| Grenzfälle 3.1, 3.6–3.11, 3.15, 3.16 | `tests/e2e/font-family.spec.ts`, je ein dedizierter Test |
| Grenzfall 3.2, 3.3 (Sonderzeichen/Leerzeichen) | `roundtrip.test.ts` (beide Formate) + `fonts.test.ts` |
| Grenzfall 3.4 (Performance) | `MAX_RENDERED_OPTIONS`-Deckelung (Abschnitt 7.1), manuelle QA-Notiz statt hartem Perf-Test |
| Grenzfall 3.5 (Fremdschriftart erhalten) | `font-family.test.ts` (docx/odt) + Rundreise-Tests mit `bug59058.docx`/`compdocfileformat.odt` |
| Grenzfall 3.12 (API fehlt/verweigert) | `fonts.test.ts` |
| Grenzfall 3.13 (ODT ohne font-face-decl) | `src/formats/odt/__tests__/font-family.test.ts`, handgebaute Minimal-Datei |
| Grenzfall 3.14 (DOCX nur eastAsia) | `src/formats/docx/__tests__/font-family.test.ts` + `bug57031.docx` |
| Grenzfall 3.17, 3.18 | Nachrichtlich dokumentiert (Track Changes/Race Condition — beide außerhalb des aktuellen Funktionsumfangs der App, siehe Anforderung selbst) |
| Abschnitt 4 (UI-Robustheit, 5 Punkte) | `tests/e2e/font-family.spec.ts`, je ein Test pro Punkt |
| Abschnitt 6 (Rundreise-Matrix, 4 Pflichtzellen) | `tests/e2e/font-family.spec.ts` describe „Rundreisen" |
| Abschnitt 7, Punkt 1 (vollständiger Bau) | Abschnitte 4–10 dieses Plans |
| Abschnitt 7, Punkt 2 (echte Browser-Tests je Grenzfall) | Abschnitt 11.2 |
| Abschnitt 7, Punkt 3 (Rundreise-Matrix grün) | Abschnitt 11.2, describe „Rundreisen" |
| Abschnitt 7, Punkt 4 (5.2 im Backlog vermerkt) | Manueller Schritt nach Implementierung — Backlog-Zeile `schriftart-waehlen` in `FEATURE-BACKLOG.md` um Vermerk zu Abschnitt 5.2 (keine Font-Binärdaten) **und** Abschnitt 13.1 (keine Theme-Auflösung) dieses Plans ergänzen |
| Abschnitt 7, Punkt 5 (kein unbeantworteter Fund) | Abschnitt 13 dieses Plans (drei bewusst dokumentierte Einschränkungen) |
