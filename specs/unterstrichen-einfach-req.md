# Anforderung: Unterstrichen (einfach)

Status: **vorhanden laut Backlog — gilt als nicht vertrauenswürdig, muss vollständig
verifiziert werden.** Diese Datei ist die verbindliche Anforderung, gegen die die
Verifikation (echte Browser-Bedienung + Rundreise-Tests) durchgeführt wird, bevor der
Status auf „verifiziert" gehoben werden darf. Sie ersetzt die Backlog-Beschreibung nicht,
sondern macht sie so detailliert und einzeln abhakbar, dass ein QA-Agent jeden Punkt über
tatsächliche Bedienung (nicht nur Unit-Tests) nachweisen oder widerlegen kann.

Bezug: `specs/FEATURE-BACKLOG.md`, Slug `unterstrichen-einfach` — Titel
„Unterstrichen (einfach)", Beschreibung „Schaltet eine einfache Unterstreichung um.",
Status „vorhanden", Priorität 1 (essenziell/fundamental).

Stil/Methodik orientiert sich an `E:\docs\FEATURE-SPEC-DOCX-ODT.md`: Anforderung in
Fließtext/Listen je Aspekt, danach nummerierte Testfälle, Fokus auf **beide** Formate
(DOCX und ODT) sowie auf die Rundreise (Datei hochladen → unverändert exportieren →
Ergebnis entspricht inhaltlich dem Original; zusätzlich Re-Import und — soweit technisch
möglich — Cross-Format).

Geltungsbereich: ausschließlich das Zeichenformat „Unterstrichen (einfach)"
(ProseMirror-Mark `underline`, DOCX `<w:u w:val="single"/>`, ODT
`style:text-underline-style="solid"`). Andere Marks (Fett, Kursiv, Durchgestrichen,
Farben) sind nur insoweit relevant, wie sie mit Unterstrichen kombiniert auftreten.

---

## 0. Korrekturen gegenüber der vorherigen Fassung dieser Datei

Diese Datei existierte bereits aus einem früheren Durchlauf. Bei der unabhängigen
Gegenprüfung gegen den **tatsächlichen** Code (nicht nur gegen die vorherige Fassung)
haben sich mehrere der dort behaupteten Angaben als **falsch oder veraltet**
herausgestellt. Sie werden hier korrigiert, damit der nächste Bearbeiter nicht erneut auf
die alten Fehlangaben vertraut:

1. **Verschobene Zeilennummer beim Tastenkürzel.** Die alte Fassung nannte das Keymap-
   Binding `Mod-u` in `WordEditor.tsx:92`. **Tatsächlich liegt es bei `WordEditor.tsx:100`**
   (Nachbarn: `Mod-b` bei `:98`, `Mod-i` bei `:99`). Der `WordEditor.tsx` hat oberhalb der
   Keymap einen Kommentarblock erhalten (`:88-92`, Hinweis zu Zwischenablage-Bindings), der
   die Zeilen verschoben hat. Alle Fundstellen dieser Fassung sind neu gegen den aktuellen
   Stand verifiziert.
2. **Cross-Format-Rundreise über die UI ist derzeit unmöglich.** Die alte Fassung forderte
   in Abschnitt 5 E2E-Rundreisen „DOCX → Editor → ODT → …" und eine „doppelte
   Cross-Format-Rundreise" als Browser-Tests. Das Zielformat beim Export ist aber **nicht
   wählbar**: `speichern-unter-format` gilt im Backlog (`FEATURE-BACKLOG.md:59`) als
   **fehlt** (Priorität 2); der Export erfolgt immer im Ursprungsformat. Cross-Format ist
   damit derzeit **nur auf Reader/Writer-Code-Ebene** prüfbar (`readDocx`→`writeOdt` usw.),
   **nicht** als UI-Fluss. Abschnitt 5 ist entsprechend umformuliert.
3. **„python-docx" existiert in diesem Projekt nicht.** Die alte Fassung schlug für die
   unabhängige DOCX-Validierung „python-docx" vor — das ist in diesem reinen JS/TS-Projekt
   nicht vorhanden. Tatsächlich verfügbar sind `mammoth` (`package.json:48`, DevDependency,
   DOCX→HTML, unabhängig vom eigenen Reader) und `xmllint-wasm` (`package.json:54`) samt
   gebündeltem ODF-1.3-RNG-Schema
   (`tests/fixtures/external/odf-schema/OpenDocument-v1.3-schema.rng`). Diese sind für die
   unabhängige Validierung zu verwenden (Abschnitt 9, Testfall 18).
4. **Konkrete Defekte am Bedienelement benannt.** Die alte Fassung beschrieb den Button
   nur neutral. Zwei Eigenschaften der gemeinsamen `MarkButton`-Komponente
   (`Toolbar.tsx:55-89`) sind jedoch mit hoher Wahrscheinlichkeit **fehlerhaft** und gelten
   identisch für den „U"-Button, weil F/K/U/S dieselbe Komponente benutzen: die
   Tastatur-Aktivierbarkeit (nur `onMouseDown`) und der Aktiv-Zustand (ignoriert
   `storedMarks` und die Gesamtselektion). Beide sind jetzt als Defekt A/B in Abschnitt 4
   mit Code-Begründung geführt.
5. **Falschbehauptung zum Toggle-Verhalten bei gemischter Selektion richtiggestellt —
   direkt am installierten Bibliothekscode nachgewiesen, nicht bloß vermutet.** Die
   vorherige Fassung behauptete in Abschnitt 4.4, das „Standardverhalten von
   `prosemirror-commands` `toggleMark`" sei: „Solange nicht der gesamte Bereich die Mark
   trägt, wirkt der erste Klick als „Anwenden"". Das ist **nachweislich falsch** und exakt
   das **Gegenteil** des tatsächlichen Verhaltens. Beide Aufrufstellen
   (`Toolbar.tsx:78`, `WordEditor.tsx:100`) rufen `toggleMark(markType)` **ohne** drittes
   Options-Argument auf. Ein direkter Blick in die tatsächlich installierte Abhängigkeit
   (`prosemirror-commands@1.7.1`, `node_modules/prosemirror-commands/dist/index.cjs:521-543`,
   verifiziert für diese Fassung) zeigt: `removeWhenPresent` bleibt am Default `true`, und
   `add = !ranges.some(r => state.doc.rangeHasMark(r.$from.pos, r.$to.pos, markType))` —
   `rangeHasMark` ist ein **Existenz**-Test („kommt die Mark **irgendwo** im Bereich vor"),
   kein „gilt für den **gesamten** Bereich"-Test. Bei einer **gemischten** Selektion
   (teils unterstrichen, teils nicht) liefert `rangeHasMark` also `true` →
   `add = false` → der **erste** Klick **entfernt** die Unterstreichung aus der
   **gesamten** Selektion, statt sie zu setzen. Dieselbe Feststellung wurde unabhängig
   für „Fett" bereits als **Defekt E** in `specs/fett-req.md` (Abschnitt 4) getroffen —
   dort mit identischem Codepfad (gemeinsame `MarkButton`-Komponente, identisches
   `toggleMark`-Aufrufmuster ohne Optionsargument). `specs/durchgestrichen-req.md`
   Abschnitt 3.3 und `specs/kursiv-req.md` Abschnitt 2.1/Grenzfall 3.2 beschreiben das
   korrekte (entfernende) Verhalten bereits richtig — **nur diese Datei** hatte es in der
   Vorfassung falsch herum stehen. Abschnitt 4.4 ist unten vollständig neu gefasst, ein
   neuer **Defekt E** in Abschnitt 5 ergänzt (dort als **bestätigt**, nicht als „Verdacht"
   geführt, da direkt am Bibliothekscode nachvollzogen) und alle abhängigen Stellen
   (Grenzfall 18, Testfall 7, Abnahmekriterium 2) entsprechend aktualisiert.
6. **Zwei real bestätigte, bisher in dieser Datei komplett fehlende Import-Bugs ergänzt
   (Defekte F und G) — abgeglichen mit `specs/unterstrichen-einfach-code.md` (Dev-Audit)
   und `specs/unterstrichen-einfach-qa.md`, aber nicht ungeprüft übernommen: beide Befunde
   wurden für diese Fassung unabhängig erneut direkt gegen den Code (`odt/reader.ts:37-78`,
   `docx/reader.ts:53-67`) und gegen die tatsächlichen Fixture-Bytes nachvollzogen
   (`tests/fixtures/external/odt/Tabelle1.odt`, `.../docx/bookmarks.docx`,
   `.../docx/bug65649.docx` — Entpacken + Regex-Suche gegen `content.xml`/`styles.xml`,
   Ergebnisse siehe Abschnitt 1).** Der frühere Entwurf dieser Anforderung kannte nur die
   **Lauf-/Span-eigene** Unterstreichung (`<w:u>` am Lauf, `<text:span>` mit Textstil) und
   deckte damit den in realen Word-/LibreOffice-Dateien ebenfalls verbreiteten Fall
   **„Unterstreichung als Standard-Zeichenformat einer Absatz-/Formatvorlage, ohne
   Lauf-/Span-eigenes Element"** nicht ab — das ist eine echte Lücke, kein bloßer
   Formulierungsmangel, und wird hier nachgetragen (neue Zeilen in Abschnitt 1, neue
   Defekte F/G in Abschnitt 5, neue Grenzfälle 18–20 in Abschnitt 6, neue Testfälle 19–23
   in Abschnitt 9, aktualisierte DoD-Punkte in Abschnitt 10). Zusätzlich wurde die
   CellSelection-spezifische Zuspitzung von Defekt B (Abschnitt 5) übernommen, weil sie
   laut Dev-Audit durch einen echten ProseMirror-Probe-Lauf **empirisch bestätigt** ist
   (nicht nur postuliert) und Grenzfall 3 direkt betrifft.
7. **Für diese Fassung neu gegen den Code verifiziert — zwei Stellen dieser Datei
   überschätzten die tatsächliche Testabdeckung, korrigiert (kein neuer Defekt, aber
   sicherheitsrelevante Präzisierung, weil eine Überschätzung hier genau das Risiko birgt,
   das Abschnitt 0 dieser Datei selbst anprangert — ungeprüfte Übernahme):**
   - **Cross-Format-Unit-Test deckt Unterstrichen nicht ab, auch nicht ansatzweise —
     bisher nirgends in dieser Datei erwähnt.** `src/formats/shared/__tests__/
     cross-format-clipboard-content.test.ts` (Zeilen 14–50, für diese Fassung selbst
     gelesen) ist der **einzige** existierende Cross-Format-Code-Test im Repo
     (`readDocx(writeDocx(x))` vs. `readOdt(writeOdt(x))`). Er verwendet ausschließlich ein
     **fettes** Wort (`marks: [{ type: 'strong' }]`, Zeile 30) und vergleicht laut
     `extractText()` (Zeilen 14–18) **ausschließlich den reinen Textinhalt**, nie Marks.
     Für „Unterstrichen" existiert damit **keinerlei** Cross-Format-Testabdeckung — weder
     am Text (dieser Test enthält kein unterstrichenes Wort) noch am Mark (dieser Test
     vergleicht ohnehin nie Marks, für keinen Mark-Typ). Testfall 7.3.1/Testfall 14 dieser
     Datei bezeichnen das zwar korrekt als „neu zu schreiben", aber ohne den Hinweis, dass
     ein gleichnamig aussehender Test bereits existiert und beim flüchtigen Lesen fälschlich
     Sicherheit suggerieren könnte — exakt dieselbe, unabhängig getroffene Feststellung wie
     in `specs/fett-req.md` Abschnitt 0 Punkt 6 für „Fett". Abschnitt 1 (neue Zeile),
     Abschnitt 7.3 und Testfall 14 sind entsprechend präzisiert.
   - **ODT-Schema-Validierungstest prüft nicht, dass die Unterstreichung selbst korrekt
     geschrieben wurde — nur, dass irgendein schema-valides Dokument entstand.**
     `odt/__tests__/external-validation.test.ts` (Zeile 64: unterstrichener Lauf im
     validierten Dokument enthalten) assertiert laut direkter Prüfung des Testcodes
     (Zeilen 118–130) **ausschließlich** `contentResult.valid`/`stylesResult.valid`
     (reine RelaxNG-Schema-Konformität) — an **keiner** Stelle wird geprüft, dass die
     konkrete Textstelle „unterstrichen" tatsächlich
     `style:text-underline-style="solid"` trägt. Ein hypothetischer Schreibfehler, der die
     Unterstreichung beim Export verliert (z. B. leere `style:text-properties`), das
     Dokument aber weiterhin schema-valide lässt, würde von diesem Test **nicht** erkannt.
     Die vorherige Fassung dieser Datei (Abschnitt 1-Tabelle, Defekt D, Testfall 18) stellte
     diesen Test unpräzise als bereits hinreichenden Nachweis dar („deckt die ODT-Seite
     bereits ab und ist beizubehalten") — richtig ist: **beibehalten, aber um eine gezielte
     Inhaltsassertion ergänzen**, exakt die in `fett-req.md` Testfall 7.8 für „Fett" bereits
     geforderte Korrektur, hier erstmals auf „Unterstrichen" übertragen. Abschnitt 1,
     Defekt D und Testfall 18 sind entsprechend präzisiert.

---

## 1. Verifizierter Ist-Stand (Basis dieser Anforderung, **kein** Korrektheitsnachweis)

Alle Fundstellen wurden für diese Fassung direkt im Repo geprüft und mit Zeilennummern
belegt. Das ist die Ausgangsbasis, **nicht** der Nachweis der Korrektheit — der ist Aufgabe
der Verifikation.

| Ebene | Fundstelle (verifiziert) | Inhalt |
|---|---|---|
| Schema (Mark-Definition) | `src/formats/shared/schema.ts:170-175` | Mark `underline`, `parseDOM: [{ tag: 'u' }, { style: 'text-decoration=underline' }]`, `toDOM() → ['u', 0]` |
| Toolbar-Button | `src/formats/shared/editor/Toolbar.tsx:186` | `<MarkButton mark="underline" label="U" title="Unterstrichen" glyphClassName="underline" />`; Reihenfolge F(184)/K(185)/**U(186)**/S(187) |
| Button-Komponente | `src/formats/shared/editor/Toolbar.tsx:55-89` | generisch für F/K/U/S; `active = markType.isInSet(view.state.selection.$from.marks()) !== undefined` (Z. 69); `<button aria-pressed={active} aria-label={title} title={title}>`; Auslöser **nur** `onMouseDown` mit `e.preventDefault()` → `run(view, toggleMark(markType))` (Z. 76-79); **kein `onClick`/`onKeyDown`**; `run` ruft danach `view.focus()` (Z. 30); Glyph = `<span className="underline">U</span>` (Z. 86, CSS-Klasse unterstreicht den Button-Text selbst) |
| Tastenkürzel | `src/formats/shared/editor/WordEditor.tsx:100` | Keymap-Eintrag `'Mod-u': toggleMark(wordSchema.marks.underline)` (Strg+U / Cmd+U), **unabhängig vom Button**; Nachbarn `Mod-b`(:98)/`Mod-i`(:99) |
| DOCX-Export | `src/formats/docx/writer.ts:25` (in `runPropertiesXml`, Z. 20-33) | `mark.type === 'underline'` → `props.push('<w:u w:val="single"/>')`, **ohne** `w:color` |
| DOCX Run-Zusammenführung | `src/formats/docx/writer.ts:52-59` | benachbarte Textknoten mit **identischer** Markkombination (`JSON.stringify`-Vergleich) werden zu **einem** `<w:r>` verschmolzen |
| DOCX-Import | `src/formats/docx/reader.ts:105-106` (in `marksFromRunProperties`, Z. 100-115) | `firstChildNS(rPr, w, 'u')` vorhanden **und** `getAttributeNS(w,'val') !== 'none'` → Mark `underline` (korrekte `@val`-Prüfung; zum Kontrast prüft `<w:b>` in Z. 103 nur Existenz) |
| ODT-Export (Schritt 1: Mark→Props) | `src/formats/odt/writer.ts:37` (in `runPropsFromMarks`, Z. 32-43) | `mark.type === 'underline'` → `props.underline = true` |
| ODT-Export (Schritt 2: Props→XML) | `src/formats/odt/styleRegistry.ts:50-53` (in `buildTextStyleXml`, Z. 46-59) | `props.underline` → `style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"` |
| ODT-Export (Dedup + „leer") | `src/formats/odt/styleRegistry.ts:12-14` (`isEmpty`) und `:22-44` (`TextStyleRegistry`) | `isEmpty` berücksichtigt `underline`; gleiche Markkombination → **ein** Stil `T1`/`T2`/… (Zähler Z. 34-35) |
| ODT-Import | `src/formats/odt/reader.ts:54-55` | `getAttributeNS(style,'text-underline-style')` vorhanden **und** `!== 'none'` → `style.underline = true`; später Mark `underline` |
| ODT-Import — **Absatzstil-Lücke** | `src/formats/odt/reader.ts:37-78` (`parseAutomaticStyles`), Zweig `family === 'paragraph'` (Z. 63-67) | Für Absatz-Formatvorlagen wird **ausschließlich** `fo:text-align` gelesen; eine eigene `<style:text-properties>` desselben Stils (u. a. `style:text-underline-style`) wird **nicht** ausgewertet und nirgends an `decodeInline`/`elementToBlocks` durchgereicht → Absatztext **ohne** umschließendes `<text:span>`, dessen Unterstreichung direkt am Absatzstil hängt, verliert die Formatierung beim Import vollständig. Siehe **Defekt F** |
| DOCX-Import — **Formatvorlagen-Default-Lücke** | `src/formats/docx/reader.ts:53-67` (`parseStylesXml`), Interface `HeadingInfo` (Z. 49-51) | Liest je `w:styleId` **ausschließlich** `w:outlineLvl`; ein `<w:rPr>` direkt unter `<w:style>` (Standard-Zeichenformatierung der Formatvorlage, die alle sie referenzierenden Läufe ohne eigenes Element erben) wird nie geparst und nie an `marksFromRunProperties` durchgereicht → ein Lauf, der sich ausschließlich auf einen Formatvorlagen-Underline-Default verlässt, verliert die Unterstreichung beim Import. Siehe **Defekt G** |
| Unit-Test Rundreise DOCX | `src/formats/docx/__tests__/roundtrip.test.ts:63` | „preserves bold, italic, underline, and strikethrough independently" — **konstruiertes** ProseMirror-JSON (`:71`/`:81` prüfen die `underline`-Mark), Reader/Writer isoliert |
| Unit-Test Rundreise ODT | `src/formats/odt/__tests__/roundtrip.test.ts` | analoger Test mit konstruiertem JSON |
| Unit-Test ODF-Schema-Validierung | `src/formats/odt/__tests__/external-validation.test.ts:64` (Doc-Aufbau) / `:118-130` (Assertions) | ODT-Dokument mit `underline`-Run wird gegen das ODF-Schema validiert; **Assertions prüfen aber ausschließlich `contentResult.valid`/`stylesResult.valid` (reine Schema-Konformität) — an keiner Stelle wird geprüft, dass die konkrete Textstelle tatsächlich `style:text-underline-style="solid"` trägt** (Abschnitt 0, Punkt 7). **Ein DOCX-Äquivalent für Unterstrichen fehlt** zusätzlich komplett (Grep in `docx/__tests__/external-validation.test.ts` liefert **keinen** Treffer für `underline`/`w:u`) |
| Unit-Test Cross-Format (einziger im Repo) | `src/formats/shared/__tests__/cross-format-clipboard-content.test.ts:14-50` | `readDocx(writeDocx(x))` vs. `readOdt(writeOdt(x))` an einem Dokument mit **einem fetten** Wort (`marks: [{ type: 'strong' }]`, Z. 30); Vergleich ausschließlich über `extractText()` (Z. 14-18), das **nur reinen Text** zusammenbaut, **nie Marks**. Für „Unterstrichen" ergibt sich daraus **doppelte Nichtabdeckung**: kein unterstrichenes Wort im Testdokument **und** ohnehin kein Mark-Vergleich für irgendeinen Mark-Typ (Abschnitt 0, Punkt 7) |
| E2E-Test (UI-Export DOCX) | `tests/e2e/clipboard-roundtrip.spec.ts:195-201` (Testfall-Definition) + `:252-291` (tatsächlicher Testlauf, „R-7") | Fall `name: 'Unterstrichen'`: tippt Text (`:197`), `ControlOrMeta+a` (`:198`), `getByTitle('Unterstrichen').click()` (`:199`). **Der tatsächliche Testlauf ist mehr als „klicken + exportieren"** (frühere Fassung dieser Zeile unterschlug das): Im neuen Dokument wird danach zusätzlich **kopiert** (`ControlOrMeta+c`), **in ein zweites, frisches Dokument eingefügt** (`ControlOrMeta+v`, `:274`) und **erst dieses zweite** Dokument als DOCX exportiert — testet also Toolbar-Klick **und** Zwischenablage-Rundreise **und** Export in einem Zug. Die Export-Assertion selbst prüft aber weiterhin nur **Substring `'<w:u '`** (`:201`/`:285`), nicht `w:val="single"` am richtigen Run (Defekt C bleibt bestehen). Läuft laut `testMatch` (`playwright.config.ts`) auch auf **Desktop Firefox (Clipboard)** (nur für `browserName === 'webkit'` per `test.skip` übersprungen, `:264`) — der Toolbar-Klick auf „Unterstrichen" **inklusive Kopieren/Einfügen** ist damit, anders als eine unpräzise Lesart der Browser-Matrix-Zeile unten nahelegen könnte, **auf Firefox real getestet**; **nur** die Tastenkombination **Strg+U** selbst wird in keinem Test auf Firefox ausgelöst (siehe Browser-Matrix-Zeile) |
| E2E-Test (UI-Import DOCX) | `tests/e2e/docx.spec.ts:301` | prüft nach Import der Fixture `.ProseMirror u` mit Text „Unterstrichen" → Count 1 |
| E2E-Test (UI-Import ODT) | `tests/e2e/odt.spec.ts:277` | analog für ODT |
| E2E-Fixture | `tests/e2e/fixtures/fullCoverageDocument.ts:118` (DOCX `<w:u w:val="single"/>`), `:176` (ODT-Stil `Underline` mit `text-underline-style="solid"` `text-underline-type="single"`), `:213` (`<text:span text:style-name="Underline">`) | Hand-erzeugte Testdatei; Basis der beiden Import-E2E-Tests |
| Selection-Regression | `tests/e2e/selection-regression.spec.ts:20,52,68,94` | 4 Tests, **alle** mit „Fett" (`getByTitle('Fett').click()`) als auslösendem Schritt — **kein** Test mit „Unterstrichen" als Auslöser (siehe Grenzfall 8) |
| Browser-Matrix | `playwright.config.ts` | Vollsuite (inkl. `docx.spec.ts`/`odt.spec.ts`/`selection-regression.spec.ts`) läuft auf Desktop Chrome, Mobile (Chromium) und Tablet (WebKit); **Firefox** und **Desktop Safari** sind **nur** auf `clipboard.*.spec.ts` beschränkt. Da `clipboard-roundtrip.spec.ts` selbst zu dieser Dateigruppe gehört, läuft der **Toolbar-Klick** auf „Unterstrichen" (inkl. Kopieren/Einfügen, siehe Zeile oben) **sehr wohl** auf Desktop Firefox — **präzise formuliert** bleibt nur die **Tastenkombination Strg+U** derzeit **nie** auf Firefox getestet (kein Test ruft dort `page.keyboard.press('ControlOrMeta+u')` auf), ebenso wenig der reine **Import** (`docx.spec.ts`/`odt.spec.ts` laufen nie auf Firefox) |

**Unabhängige Validierer im Projekt vorhanden** (für Abschnitt 9, Testfall 18): `mammoth`
(`package.json:48`, DOCX-Parser unabhängig vom eigenen Reader), `xmllint-wasm`
(`package.json:54`) + `tests/fixtures/external/odf-schema/OpenDocument-v1.3-schema.rng`
(RelaxNG-Validierung für ODT).

**Fixture-Beleg für die beiden neuen Zeilen (Absatzstil-/Formatvorlagen-Lücke), für diese
Fassung selbst durch Entpacken nachvollzogen, nicht nur aus `code.md`/`qa.md` übernommen:**
- `tests/fixtures/external/odt/Tabelle1.odt`: `content.xml` enthält fünf
  `style:family="paragraph"`-Stile `P83`/`P86`/`P89`/`P92`/`P95`, deren Text „Gomez bewege
  sich zu wenig" **ohne** `<text:span>` direkt im `<text:p style-name="…">` steht. `P83` und
  `P89` tragen `style:text-underline-style="solid"` — den **exakten in-scope-Wert** dieser
  Anforderung (nicht nur die ohnehin-out-of-scope-Werte `wave`/`dotted` von P86/P92); `P95`
  hat gar keine `<style:text-properties>` (Negativkontrolle). Der Text kommt **6×** im
  Dokument vor (verifiziert per Substring-Zählung).
- `tests/fixtures/external/docx/bookmarks.docx`: `word/styles.xml` enthält
  `<w:style w:styleId="Title">…<w:u w:val="single"/>…`.
- `tests/fixtures/external/docx/bug65649.docx`: `word/styles.xml` enthält **neun**
  Formatvorlagen mit `<w:u w:val="single"/>` (u. a. Stile „8", „80", „aff", „aff1", „aff5",
  „aff6", „220", „affffb") **und** eine mit explizitem `<w:u w:val="none"/>` (Stil
  „nounder1" — Negativkontrolle).
- Für beide DOCX-Fixtures gilt (siehe Abschnitt 5, Defekt G): Der bestehende Korpus enthält
  **keinen** nicht-leeren Lauftext, der sich *ausschließlich* auf einen dieser Defaults
  verlässt — die Lücke ist strukturell real, aber im aktuellen Korpus nicht an echtem
  sichtbarem Textverlust beobachtbar (anders als bei `Tabelle1.odt`, wo der Verlust an
  echtem, sichtbarem Fließtext auftritt).

**Korrektur gegenüber vorigem Entwurf:** Es ist **falsch**, dass „keine E2E-Tests"
existieren. Die oben gelisteten E2E-Tests berühren Unterstrichen bereits. Sie gelten laut
Auftrag jedoch als **nicht vertrauenswürdig** und sind zudem **inhaltlich unzureichend**
(siehe Abschnitt 8): Der einzige UI-getriebene Export-Test prüft nur den Substring
`'<w:u '` (nicht `w:val="single"`, nicht die richtige Textstelle), es gibt keinen
UI-getriebenen ODT-Export-Test für Unterstrichen, keinen Tastatur-Test (Strg+U), keinen
Toggle-aus-, Mischselektions-, Aktiv-Zustands-Test und kein DOCX-Schema-Validierungspendant
zum vorhandenen ODT-Test.

---

## 2. Ziel

Nutzer:innen können markierten Text mit einer einfachen, durchgezogenen
Unterstreichungslinie versehen und diese Formatierung ebenso wieder entfernen — sowohl
über die Toolbar als auch über die Tastatur — konsistent in Editor-Anzeige, DOCX-Export
und ODT-Export. Die Formatierung bleibt bei jeder Rundreise (Import → Export,
Export → Re-Import, Cross-Format auf Code-Ebene) vollständig und an exakt der richtigen
Textstelle erhalten.

**Explizit nicht Gegenstand** dieser Anforderung (jeweils eigener Backlog-Eintrag,
Status „fehlt"):
- `unterstrichen-doppelt` — doppelte Unterstreichungslinie.
- `unterstrichen-nur-woerter` — Unterstreichung, die Leerzeichen zwischen Wörtern
  ausspart.

Diese beiden dürfen durch die Umsetzung/Verifikation von „einfach" nicht versehentlich
als mit abgedeckt vorgetäuscht werden. Die Verifikation muss ausdrücklich bestätigen,
dass **nur** die einfache Variante angeboten wird. Konkret: Der Export schreibt für
„einfach" fest `w:val="single"` bzw. `text-underline-style="solid"` (kein Stil-Parameter),
und der Import bildet **jeden** Nicht-`none`-Stilwert auf „einfach" ab (siehe Grenzfälle
9/10) — es existiert also codeseitig gar keine Unterscheidung zwischen
einfach/doppelt/gewellt. Das ist zu dokumentieren, nicht als „drei Varianten funktionieren"
misszuverstehen.

---

## 3. Bedienelemente / Menüpunkte

| # | Bedienelement | Ort / Fundstelle | Ist-Zustand (zu verifizieren) | Soll |
|---|---|---|---|---|
| 1 | Toolbar-Button „U" | Zeichenformatierungs-Gruppe, zwischen „K" (Kursiv) und „S" (Durchgestrichen), `Toolbar.tsx:186` | Toggle über **nur** `onMouseDown`+`preventDefault` (Selektion geht beim Maus-Klick nicht verloren), danach `view.focus()`; `title`/`aria-label` = „Unterstrichen"; `aria-pressed` je nach Zustand an `$from` | Muss per **Maus und Tastatur** (Tab-Fokus + Enter/Leertaste) toggeln; Fokus/Selektion bleiben erhalten. **Verdacht: Tastatur-Aktivierung des Buttons funktioniert nicht** — siehe Defekt A |
| 2 | Tastenkombination Strg+U (bzw. Cmd+U auf macOS) | global im Editor, `WordEditor.tsx:100` (`Mod-u`) | Vorhanden, wirkt solange der Editor fokussiert ist, **unabhängig vom Button** | Muss identisches Verhalten wie der Toolbar-Button auslösen, auch ohne vorherige Toolbar-Nutzung, und nicht mit einer Browser-eigenen Tastenkombination kollidieren. **Aktuell in keinem E2E-Test per Tastatur ausgelöst** und nie auf Firefox getestet (Matrix) |
| 3 | Visueller Aktiv-Zustand des Buttons | `Toolbar.tsx:69,75,80-84` | `aria-pressed={active}` + CSS-Klassenwechsel (dunkler Hintergrund); `active` folgt **nur** `markType.isInSet($from.marks())`, **ohne** `state.storedMarks` und ohne Prüfung der gesamten Selektion | Muss korrekt anzeigen, ob an Cursor-Position/Selektion Unterstrichen aktiv ist — inkl. „vorgemerktem" Mark und gemischter Selektion. **Verdacht: beide Fälle falsch** — siehe Defekt B |
| 4 | Icon/Label „U" | `Toolbar.tsx:86`, `<span className="underline">U</span>` | Reines Buchstaben-Label „U", per CSS-Klasse `underline` selbst unterstrichen dargestellt; kein SVG-Icon | Muss unabhängig von Systemschriftart eindeutig als „Unterstrichen"-Symbol erkennbar sein (vgl. `FEATURE-SPEC-DOCX-ODT.md` §20.1). SVG-Präzedenz existiert bereits (`ScissorsIcon`, `Toolbar.tsx:33-53`). Sobald „Unterstrichen (doppelt)" ergänzt wird, muss das einfache „U" davon eindeutig unterscheidbar bleiben |
| 5 | Kontextmenü (Rechtsklick) | nicht vorhanden | — | Kein Soll-Bestandteil dieser Anforderung; nur dokumentieren, dass „Unterstrichen" dort fehlt, falls generell ein Kontextmenü existiert. Ein „Formatierung löschen" existiert nicht (Backlog `formatierung-loeschen` = fehlt) — Unterstrichen lässt sich nur über erneutes Toggle entfernen |

---

## 4. Gewünschtes Verhalten im Detail

### 4.1 Toggle auf bestehender Selektion
- Ist mindestens ein Zeichen markiert und **nicht** die gesamte Selektion bereits
  unterstrichen → gesamte Selektion wird unterstrichen dargestellt, Button zeigt aktiven
  Zustand.
- Ist die gesamte Selektion bereits unterstrichen → erneuter Klick/Strg+U entfernt die
  Unterstreichung vollständig, Button zeigt inaktiven Zustand (echtes Toggle, kein reines
  „Setzen").
- Die Selektion selbst darf durch die Aktion nicht verändert werden (Auswahlgrenzen
  bleiben erhalten, damit direkt eine weitere Formatierung angewendet werden kann).
- Die Anwendung/Entfernung ist **ein einzelner Undo-Schritt** (ein Strg+Z macht die
  gesamte Unterstreichungs-Aktion auf der Selektion rückgängig, nicht Zeichen für
  Zeichen).

### 4.2 Toggle an der Schreibmarke (keine Selektion)
- Cursor ohne Selektion in normalem Text platzieren → Strg+U/Button klicken → nachfolgend
  getippter Text erscheint unterstrichen, bereits vorhandener Text davor/danach bleibt
  unverändert (ProseMirror `state.storedMarks = [underline]`).
- Erneutes Umschalten an derselben Stelle vor dem nächsten Tastendruck hebt die
  „gemerkte" Formatierung wieder auf (Standard-`storedMarks`-Verhalten über `toggleMark`).
  Ein reines Umschalten des gespeicherten Marks ohne nachfolgende Eingabe soll **keinen**
  eigenen Undo-Schritt und keinen sichtbaren Dokumentsprung erzeugen (die Transaktion
  ändert das Dokument nicht). Tatsächliches Verhalten ist zu verifizieren und zu
  dokumentieren.

### 4.3 Anzeige des aktiven Zustands
Der Button soll gedrückt (`aria-pressed="true"`, abgesetzter Hintergrund) erscheinen, wenn:
- der Cursor (ohne Selektion) in bereits unterstrichenem Text steht, **oder**
- an der leeren Schreibmarke ein **vorgemerktes** `underline`-Mark aktiv ist (nächstes
  Getipptes wird unterstrichen), **oder**
- eine Selektion **durchgehend** unterstrichen ist.

Der Zustand muss sich ohne Zusatzaktion sofort bei jeder Cursor-/Selektionsänderung
aktualisieren (Pfeiltasten oder Mausklick). Die aktuelle Implementierung (`$from.marks()`)
erfüllt den `storedMarks`-Fall und den gemischten Fall **nicht** — siehe Defekt B.

### 4.4 Gemischte Selektion (teilweise unterstrichen, teilweise nicht)
- **Verifiziertes, aber falsches Ist-Verhalten (Defekt E, siehe Abschnitt 5):** Enthält die
  Selektion sowohl unterstrichenen als auch nicht-unterstrichenen Text, rufen beide
  Aufrufstellen (`Toolbar.tsx:78`, `WordEditor.tsx:100`) `toggleMark(markType)` **ohne**
  drittes Options-Argument auf. In der installierten `prosemirror-commands@1.7.1` bedeutet
  das `removeWhenPresent: true` (Default), und `Doc.rangeHasMark` meldet bereits
  „vorhanden", sobald **irgendein** Zeichen im Bereich das Mark trägt (kein „gilt für den
  gesamten Bereich"-Test). Ergebnis: Der **erste** Klick auf eine gemischte Selektion
  **entfernt** die Unterstreichung aus der **gesamten** Selektion (statt sie zu setzen) —
  das **Gegenteil** der in Word/LibreOffice üblichen Konvention und das Gegenteil dessen,
  was eine frühere Fassung dieser Datei fälschlich als „Standardverhalten" behauptete
  (siehe Abschnitt 0, Punkt 5). Erst ein zweiter Klick auf die jetzt komplett
  nicht-unterstrichene Selektion wendet die Unterstreichung wieder auf den gesamten Bereich
  an. Es gibt **keinen** Drittzustand „teilweise".
- **Geforderte Soll-Anforderung (PO-Entscheidung):** Der erste Klick auf eine gemischte
  Selektion soll stattdessen die **gesamte** Selektion unterstreichen (Konsistenz mit
  Word-/LibreOffice-Muskelgedächtnis und mit der ursprünglichen Absicht der Vorfassung
  dieser Datei); erst ein zweiter Klick auf die nun vollständig unterstrichene Selektion
  entfernt sie wieder. Bis zum Fix ist das aktuelle Verhalten **aktiv falsch**, nicht bloß
  „zu erwarten und zu testen" — siehe Grenzfall 18 und Defekt E (Abschnitt 5) für Fundstelle,
  Beleg und minimalen Fix (`removeWhenPresent: false` an beiden Aufrufstellen).
- Der Button-Aktiv-Zustand richtet sich laut Implementierung (`Toolbar.tsx:69`) nach der
  Formatierung **am Selektionsanfang** (`$from.marks()`), nicht nach der gesamten
  Selektion → bei gemischter Selektion kann `aria-pressed` je nach Startposition falsch
  `true`/`false` anzeigen (Defekt B). Mindestanforderung: keine Anzeige, die im Widerspruch
  zum tatsächlichen (korrigierten) Toggle-Ergebnis steht.

### 4.5 Kombination mit anderen Zeichenformaten
- Unterstrichen muss unabhängig und gleichzeitig mit Fett (`strong`), Kursiv (`em`),
  Durchgestrichen (`strike`), Schriftfarbe (`textColor`) und Hervorhebungsfarbe
  (`highlight`) auf demselben Textlauf anwendbar sein.
- Das Umschalten von Unterstrichen darf keines der anderen gleichzeitig aktiven Marks
  entfernen oder verändern; die Reihenfolge des Anwendens darf zu keinem unterschiedlichen
  Endergebnis führen.
- Im DOCX-Export erscheinen alle Marks als getrennte Kind-Elemente **eines** `<w:rPr>`
  (`writer.ts:20-33`), und benachbarte Läufe mit identischer Markkombination werden zu
  **einem** `<w:r>` verschmolzen (`writer.ts:52-59`) — die Mark-**Reihenfolge** im Array
  darf das Ergebnis daher nicht zerlegen (explizit prüfen). Im ODT-Export landen alle
  Marks als gemeinsame Attribute **einer** Stildefinition (`buildTextStyleXml`,
  `styleRegistry.ts:46-59`). Beides muss die Kombination verlustfrei transportieren.

### 4.6 Zwischenablage / Kopieren & Einfügen
- Kopieren von unterstrichenem Text innerhalb des Editors und Einfügen an anderer Stelle
  behält die `underline`-Mark.
- Einfügen von extern kopiertem Text wird über `parseDOM` (`schema.ts:171`) erkannt, wenn
  er als `<u>`-Element **oder** mit Inline-Stil `text-decoration: underline` vorliegt.
- **Grenzfall zusammengesetzter `text-decoration`-Wert:** Die Parse-Regel matcht den
  Stilwert exakt gleich `underline` (`{ style: 'text-decoration=underline' }`). Kopierter
  Text, der Unterstreichung **und** Durchstreichung in einem zusammengesetzten Wert
  kombiniert (z. B. `text-decoration: underline line-through`), wird von dieser Regel
  **nicht** getroffen — die Unterstreichung ginge beim Einfügen verloren. Dieses Verhalten
  ist zu verifizieren und entweder als bewusster, dokumentierter Fallback zu bestätigen
  oder als Fehler zu erfassen (kein stiller Verlust ohne Vermerk).

### 4.7 Verhältnis zu Absatzformaten / Überschriften
- Anders als „Fett" ist Unterstrichen **kein** Bestandteil einer Absatz-/Überschriften-
  Formatvorlage: Weder der DOCX-Heading-Stil (`docx/styleDefs.ts`) noch der ODT-
  Überschriften-Stil (`odt/styleRegistry.ts`) deklarieren `w:u`/`text-underline-style` auf
  Stil-Ebene. Folge:
  - Das Umschalten von Unterstrichen innerhalb einer Überschrift ist im Editor **sichtbar**
    (keine Stil-Überlagerung) und wird als reine Run-Ebenen-Mark exportiert.
  - Es entsteht **keine** Redundanz/Doppel-Auszeichnung und keine „unsichtbare Wirkung".
    Zu verifizieren: Unterstrichen in einer Überschrift ist im Editor sichtbar, wird nach
    DOCX/ODT exportiert und übersteht die Rundreise, ohne die Überschriften-Formatvorlage
    zu beeinträchtigen.

### 4.8 Farbe der Unterstreichungslinie
- Die Implementierung setzt **keine eigene Linienfarbe**: DOCX schreibt
  `<w:u w:val="single"/>` ohne `w:color` (→ Word interpretiert „automatisch", i. d. R.
  Textfarbe); ODT schreibt `style:text-underline-color="font-color"` (Linie folgt explizit
  der Textfarbe).
- Anforderung: Verifizieren, dass beide Verhaltensweisen in einer echten Zielanwendung
  bzw. einem unabhängigen Prüf-Parser zum selben sichtbaren Ergebnis führen (Linie in
  Textfarbe), insbesondere wenn zusätzlich eine explizite Schriftfarbe (`textColor`)
  gesetzt ist (siehe 4.5).
- Eine eigenständige, von der Textfarbe abweichende Unterstreichungsfarbe ist **nicht**
  Teil dieser Anforderung (kein entsprechendes Bedienelement vorhanden/gefordert).
- **Import-Richtung (bisher undokumentiert):** Reale Word-Dateien schreiben häufig eine
  von der Textfarbe abweichende Linienfarbe direkt am Element, z. B.
  `<w:u w:val="single" w:color="FF0000"/>`. Der DOCX-Import (`reader.ts:105-106`) liest
  **ausschließlich** `@w:val` und **ignoriert `@w:color` vollständig**; der Writer
  (`writer.ts:25`) schreibt seinerseits nie ein `w:color`. Folge: Eine farbige
  Unterstreichung wird korrekt als (einfache) Unterstreichung importiert, aber die
  **Linienfarbe geht verloren** und folgt nach der Rundreise wieder der Textfarbe.
  Das ist der DOCX-Gegenpart zur ODT-Beobachtung in Grenzfall 10 (dort werden
  `text-underline-color`/`-width` beim Import ignoriert). Zu bestätigen als bewusster,
  dokumentierter Fidelitätsverlust (kein Textverlust, kein Absturz) — siehe Grenzfall 17.

### 4.9 Undo/Redo
- Anwenden/Entfernen von Unterstrichen erzeugt einen einzelnen, eigenständigen
  Undo-Schritt (siehe 4.1). Strg+Z stellt exakt den vorherigen Zustand wieder her (nicht
  nur visuell, auch im Dokumentmodell), Strg+Y bzw. Strg+Umschalt+Z stellt die Aktion
  erneut her (Keymap `WordEditor.tsx:93-95`).
- Muss auch in gemischten Sequenzen (Tippen → Unterstrichen an → Tippen → Unterstrichen
  aus → mehrfach Undo) in korrekter, umgekehrter Reihenfolge funktionieren, auch über
  andere Formatierungsaktionen (Fett, Kursiv) hinweg.

### 4.10 „Formatierung löschen" (Zielfunktion aktuell Status „fehlt")
- Sobald `formatierung-loeschen` umgesetzt ist, muss diese Funktion auch die
  Unterstreichung zuverlässig entfernen. Bis dahin keine Anforderung an diese Kombination,
  aber im Test explizit als „nicht anwendbar, da Zielfunktion fehlt" vermerken, nicht
  stillschweigend auslassen.

### 4.11 Zusammenspiel mit Hyperlinks (Backlog-Status „fehlt")
- Sobald Hyperlinks umgesetzt sind: Die Standard-Darstellung von Links ist laut
  `FEATURE-SPEC-DOCX-ODT.md` §14 ebenfalls „unterstrichen". Zu klären und zu dokumentieren,
  sobald relevant: separate visuelle Default-Darstellung des Link-Elements oder Setzen der
  `underline`-Mark (mit Folgefrage, ob sich die Unterstreichung eines Links über den
  „U"-Button unabhängig ein-/ausschalten lässt). Für die aktuelle Verifikation ohne
  Hyperlink-Funktion nicht relevant, aber als zukünftige Abhängigkeit vermerkt.

---

## 5. Verifizierte / vermutete Defekte

Die folgenden Punkte wurden aus dem **tatsächlichen Code** abgeleitet. Jeder braucht einen
eigenen Test, der das beobachtete Ist-Verhalten festhält (bestätigt **oder** widerlegt).
A–D sind bewusst als „Verdacht mit konkreter Code-Begründung" formuliert, nicht als bereits
erwiesener Bug — **Ausnahme: Defekte E, F und G**, die direkt am Quellcode bzw. an echten
Programmläufen gegen reale Fixtures nachvollzogen und damit bereits als real bestätigt
gelten, nicht nur vermutet: Defekt E direkt am Quellcode der tatsächlich installierten
Abhängigkeit (`prosemirror-commands@1.7.1`), Defekt F durch einen echten `readOdt()`-Lauf
gegen `tests/fixtures/external/odt/Tabelle1.odt` (sichtbarer Datenverlust an realem
Fließtext), Defekt G strukturell am Reader-Code **und** an zwei realen DOCX-Fixtures
belegt, wenn auch ohne nicht-leeren Korpus-Textzeugen für den konkreten Verlust (siehe dort).

### Defekt A (hoch): Toolbar-Button per Tastatur nicht auslösbar
`Toolbar.tsx:76-79` verdrahtet ausschließlich `onMouseDown`. Ein natives `<button>` feuert
bei Tastatur-Aktivierung (Tab-Fokus + Enter/Leertaste) **kein** `mousedown`, sondern nur
`click`. **Erwartung:** Tab zum „U"-Button, Enter/Leertaste → Unterstrichen schaltet um.
**Vermutetes Ist:** nichts passiert. (Strg+U wirkt weiterhin, weil es über die Keymap läuft,
`WordEditor.tsx:100` — der **Button** bleibt aber tastaturunbedienbar, ein
Barrierefreiheits- und Anforderungsverstoß, Bedienelement 1.) Betrifft die gemeinsame
`MarkButton`-Komponente, also F/K/U/S gleichermaßen. Übliche Behebung: Toggle nach `onClick`
verschieben, `onMouseDown` behält nur `preventDefault()`.

### Defekt B (hoch): Aktiv-Zustand ignoriert `storedMarks` und die Gesamtselektion
`Toolbar.tsx:69` = `markType.isInSet(view.state.selection.$from.marks())`. `$from.marks()`
berücksichtigt **nicht** `state.storedMarks`. **Erwartung:** nach „Unterstrichen an leerer
Schreibmarke aktivieren" zeigt der Button sofort `aria-pressed="true"`. **Vermutetes Ist:**
Button bleibt `false`, bis das erste Zeichen getippt ist (4.2/4.3). Zusätzlich prüft die
Zeile nur `$from` (Selektionsanfang), nicht die **gesamte** Selektion — bei gemischter
Selektion kann `aria-pressed` je nach Startposition falsch anzeigen (4.4). Betrifft
ebenfalls die gemeinsame `MarkButton`-Komponente. Übliche Behebung: Hilfsfunktion
`isMarkActive(state, type)`, die bei leerer Selektion `state.storedMarks || $from.marks()`
prüft und bei nicht-leerer Selektion nur dann aktiv meldet, wenn **jede** Textstelle im
Bereich das Mark trägt.

**Zuspitzung für Mehrzell-Tabellenauswahl (empirisch bestätigt, nicht nur vermutet):** Ein
naheliegender Fix-Ansatz für den Bereichs-Fall — `state.doc.nodesBetween(state.selection.from,
state.selection.to, …)` — ist für eine `CellSelection` (mehrere markierte Tabellenzellen,
`prosemirror-tables`) selbst **falsch**: `.from`/`.to` einer `CellSelection` liefern **nicht**
die Grenzen der gesamten markierten Zellrechteckfläche, sondern nur die des **Kopf**-Zelle-
Bereichs. Ein gezielter Probe-Lauf (2×2-Tabelle, nur die Kopf-Zelle der 4-Zellen-Auswahl
unterstrichen) zeigt: dieser naive Ansatz meldet fälschlich `active = true`, obwohl nur 1 von
4 markierten Zellen unterstrichen ist — ein direkter Verstoß gegen 4.4 („keine Anzeige im
Widerspruch zum tatsächlichen Toggle-Ergebnis"), weil `toggleMark` selbst korrekt über
`state.selection.ranges` iteriert (mehrere `SelectionRange`s, einer je markierter Zelle) und
bei dieser Auswahl tatsächlich **hinzufügen** würde. Der Fix muss daher über
`state.selection.ranges` iterieren, nicht über `.from`/`.to` — für eine normale
`TextSelection` gleichwertig (genau eine Range), für `CellSelection` aber entscheidend
unterschiedlich. Betrifft direkt Grenzfall 3 und Testfall 19 unten.

### Defekt F (hoch, neu — real reproduziert, kein Verdacht): ODT-Reader verliert Zeichenformatierung inkl. Unterstrichen auf reiner Absatzstil-Ebene
`parseAutomaticStyles` (`odt/reader.ts:37-78`) wertet `<style:text-properties>` **nur** im
Zweig `family === 'text'` aus (Z. 48-62); der Zweig `family === 'paragraph'` (Z. 63-67) liest
ausschließlich `fo:text-align` und ignoriert eine eigene, geschwisterliche
`<style:text-properties>` desselben Absatzstils vollständig. `decodeInline` (Aufruf
`walk(child, [])` je direktem Kind eines `<text:p>`) zieht den **eigenen** Stilnamen des
Absatzes nirgends als Formatierungs-Basis heran.

**Real reproduziert (nicht nur am Code abgeleitet) — für diese Fassung selbst nachvollzogen:**
`tests/fixtures/external/odt/Tabelle1.odt` enthält den Text „Gomez bewege sich zu wenig" fünf
Mal in eigenen Tabellenzellen-Absätzen, jeweils **ohne** `<text:span>`, mit den
Absatz-Formatvorlagen `P83`/`P86`/`P89`/`P92`/`P95` (verifiziert per Entpacken, siehe
Abschnitt 1). `P83` **und `P89`** tragen `style:text-underline-style="solid"` — den exakten
in-scope-Wert dieser Anforderung, nicht nur die ohnehin-out-of-scope-Werte `wave`(`P86`)/
`dotted`+bold(`P92`); `P95` hat keine `<style:text-properties>` (Negativkontrolle, korrekt
unformatiert). Ein `readOdt()`-Lauf gegen diese Datei liefert für alle vier betroffenen
Absätze (P83/P86/P89/P92) **keine `marks`** — die Unterstreichung (bei P83/P89 die exakt
„einfache" Variante dieser Anforderung) geht beim Import **vollständig und still** verloren,
ohne jede Fehlermeldung. Das ist ein **echter, dokumentierter Datenverlust an realem
Fließtext** in einer bereits im Repo vorhandenen Fremddatei — keine konstruierte
Rand-Bedingung.

**Scope-Hinweis:** Der Fix ist naturgemäß mark-übergreifend (er betrifft strukturell auch
Fett/Kursiv/Durchgestrichen/Farbe auf Absatzstil-Ebene), nicht nur Unterstrichen — das ist
gewünscht (kein Sonderpfad nur für „U"), muss aber im Umsetzungscommit klar benannt sein.
Zusätzliche Komplikation, die ein Fix beachten muss: Ein `<text:span>` mit explizit
`text-underline-style="none"` muss eine vom Absatzstil geerbte Unterstreichung wieder
aufheben können (reines Hinzufügen der Absatzstil-Marks als Basis reicht nicht, ein
„explizit aus"-Zustand muss von „nicht angegeben" unterscheidbar bleiben). Siehe Grenzfall 18
und Testfall 19.

### Defekt G (mittel, neu — strukturell real, aber ohne nicht-leeren Korpus-Textzeugen): DOCX-Reader ignoriert Formatvorlagen-Default-`<w:rPr>`
`parseStylesXml` (`docx/reader.ts:53-67`) liest je `w:styleId` ausschließlich `w:outlineLvl`
(für Überschriften-Erkennung). Ein `<w:rPr>` **direkt unter** `<w:style>` — die
Standard-Zeichenformatierung, die jeder Lauf erbt, der diese Formatvorlage referenziert und
selbst kein abweichendes Element setzt — wird nie gelesen und nie an `marksFromRunProperties`
(`reader.ts:100-115`) durchgereicht. Ein Lauf ohne eigenes `<w:u>`, dessen `<w:pStyle>` aber
auf eine Formatvorlage mit Underline-Default verweist, verliert die Unterstreichung beim
Import.

**Nachweisstärke ehrlich eingeordnet (Unterschied zu Defekt F):** `tests/fixtures/external/
docx/bookmarks.docx` (Stil „Title" mit `<w:u w:val="single"/>`) und `.../bug65649.docx`
(neun Stile mit `<w:u w:val="single"/>`, davon einer „nounder1" explizit `w:val="none"` als
Negativkontrolle — alle verifiziert per Entpacken, siehe Abschnitt 1) belegen, dass die
Struktur in **realen** Word-Dateien vorkommt. Im vorhandenen Korpus verlässt sich jedoch
**kein nicht-leerer Lauftext** ausschließlich auf einen dieser Defaults — die betroffenen
Formatvorlagen treffen dort nur leere Absätze oder ungenutzte Definitionen, ein
`readDocx()`-Lauf gegen beide Dateien liefert 0 unterstrichene Läufe unabhängig vom Bug. Die
Lücke ist damit **strukturell real und ein Standard-Word-Feature**, aber (anders als Defekt F)
im aktuellen Korpus nicht an sichtbarem Textverlust beobachtbar — sie wird erst beim
nächsten Upload einer Datei mit tatsächlich genutztem Underline-Formatvorlagen-Default ohne
Lauf-eigenes `<w:u>` beobachtbar. Dokumentierte Restlücke, die ein Fix nicht lösen muss:
`w:basedOn`-Vererbungsketten werden nicht aufgelöst, nur die direkt referenzierte
Formatvorlage. Siehe Grenzfall 19 und Testfall 20.

### Defekt C (mittel): DOCX-Export-Test prüft zu schwach (kein echter Korrektheitsnachweis)
`clipboard-roundtrip.spec.ts:201` prüft nur den Substring `'<w:u '`. Ein falsches `w:val`
(z. B. versehentlich `double`), eine Zuordnung zum **falschen** Run oder ein zusätzlicher,
fälschlich unterstrichener Run würden von dieser Assertion **nicht** erkannt. Die Assertion
ist auf `w:u w:val="single"` **am richtigen Run** zu verschärfen (Testfall 11), zusätzlich
zu einer unabhängigen Parser-Prüfung (Abschnitt 9, Testfall 18).

### Defekt D (mittel): Kein DOCX-Schema-/Parser-Validierungspendant für Unterstrichen
Für ODT existiert ein unabhängiger Schema-Validierungstest mit Unterstrichen
(`external-validation.test.ts:64`). Ein **DOCX-Äquivalent fehlt komplett** (Grep ohne
Treffer). Solange der Export nur mit dem **eigenen** Reader gegengelesen wird, können sich
Schreib- und Lesefehler gegenseitig „unsichtbar" ausgleichen (`FEATURE-SPEC` §19). Ein
DOCX-Validierungstest über `mammoth`/direktes XML-Parsen ist zu ergänzen.

---

## 6. Grenzfälle

1. **Leere Selektion an Absatz-/Zeilengrenze:** Cursor direkt vor/nach einem
   Zeilenumbruch (`hard_break`) oder am Absatzanfang/-ende → Toggle darf keinen JS-Fehler
   auslösen und muss sich korrekt auf nachfolgend getippten Text auswirken.
2. **Selektion über mehrere Absätze hinweg:** Markierung, die einen Absatzwechsel
   einschließt → Unterstreichung wird auf alle enthaltenen Textläufe beider Absätze
   angewendet, keine Elemente ausgelassen, der Absatzwechsel selbst nicht beschädigt.
3. **Selektion über eine Tabellen-Zellgrenze hinweg:** Markierung über mehrere
   Tabellenzellen (sofern die Editor-Auswahl das zulässt) → Unterstreichung wird konsistent
   in allen betroffenen Zellen angewendet, kein Crash, keine Vermischung mit Nachbarzellen.
4. **Rein aus Leerzeichen/Tabs bestehende Selektion:** Toggle funktioniert technisch (Mark
   wird gesetzt), auch wenn optisch kaum sichtbar — kein Sonderfall, der die Aktion
   verweigert.
5. **Selektion, die ein Inline-Bild einschließt (Node ohne Marks):** Toggle darf nicht
   abstürzen; auf das Bild selbst hat die Mark keine Wirkung, auf im selben Bereich
   enthaltenen Text schon.
6. **Wiederholtes schnelles Toggle (Doppelklick-/Doppeltasten-Timing):** Zwei schnell
   aufeinanderfolgende Strg+U bzw. Klicks auf dieselbe Selektion → Endzustand
   deterministisch (an/aus/an/aus), kein doppeltes Toggle durch Event-Bubbling oder
   doppelte Handler-Aufrufe (besonders nach einem etwaigen `onClick`-Fix aus Defekt A
   relevant).
7. **Rückgängig/Wiederholen über gemischte Sequenz:** siehe 4.9 — schrittweise korrekt,
   auch nach „fett → unterstrichen → unterstrichen aus".
8. **Selection-Sync-Bug mit „Unterstrichen" als Auslöser** (vgl.
   `FEATURE-SPEC-DOCX-ODT.md` §2 und `tests/e2e/selection-regression.spec.ts`, dessen vier
   Tests aktuell **nur „Fett"** als Auslöser verwenden, `:20,52,68,94`): Alles auswählen →
   Unterstrichen anwenden → per Klick neu positionieren → Enter → weitertippen. **Beide**
   entstehenden Absätze müssen erhalten bleiben UND ihre jeweils korrekte
   Unterstreichungs-Formatierung behalten. Da §2 den Bug bewusst formatunabhängig
   beschreibt, ist der Regressionstest um „Unterstrichen" als Auslöser zu erweitern.
9. **DOCX-Import mit `w:val` ungleich `single`/`none`** (z. B. `double`, `thick`, `wave`,
   `dotted`, `dash`, `dotDash`, sowie der MS-spezifische Wert `words` = „nur Wörter" —
   reale Word-Dateien nutzen diese häufig): Der Reader behandelt jeden Wert ungleich `none`
   als einfache Unterstreichung (`reader.ts:106`). Eine Datei mit doppelter, dicker oder
   gewellter Unterstreichung wird beim Import optisch auf „einfach" vereinfacht;
   insbesondere `w:val="double"` und `w:val="words"` werden **nicht** als die separaten
   Backlog-Features `unterstrichen-doppelt`/`unterstrichen-nur-woerter` erkannt, sondern auf
   „einfach" abgebildet (vgl. Abschnitt 2). Anforderung: als bewusster, dokumentierter
   Fallback bestätigen (kein Textverlust, aber Verlust des Stil-Details) — mit echter
   Testdatei (`w:val="double"` bzw. `"wave"`) verifizieren.
10. **ODT-Import mit `style:text-underline-style` ungleich `solid`** (z. B. `dash`,
    `dotted`, `wave`): Analog zu 9 — der Reader prüft nur „vorhanden und `!== 'none'`"
    (`reader.ts:55`). Gleiches Fallback verifizieren und dokumentieren. Ergänzend zu
    prüfen: Der Reader wertet ausschließlich `text-underline-style` aus; abweichende
    Zusatz-Attribute wie `text-underline-type="single"` (so in der Fixture,
    `fullCoverageDocument.ts:176`) oder `text-underline-width`/`-color` (so im eigenen
    Writer) werden beim Import ignoriert, was korrekt ist, aber getestet gehören muss.
11. **ODT-Stilnamen-Kollision bei vielen Formatkombinationen:** `TextStyleRegistry`
    (`styleRegistry.ts:22-44`) vergibt automatische Namen `T1`, `T2`, … je gesehener
    Markkombination. Bei einem Dokument mit vielen unterschiedlichen Kombinationen inkl.
    Unterstrichen ist zu verifizieren, dass keine Verwechslung auftritt und die
    Unterstreichung exakt der richtigen Textstelle zugeordnet bleibt.
12. **Dokument mit ausschließlich Unterstrichen (keine weitere Formatierung):** `isEmpty`
    (`styleRegistry.ts:12-14`) berücksichtigt `underline`, darf für „nur Unterstrichen"
    also **nicht** `true` liefern → es muss eine valide Stildefinition entstehen, aber
    keine unnötigen leeren Style-Definitionen. Explizit mit genau dieser Ein-Mark-Kombination
    testen, nicht nur in Verbindung mit anderen Marks.
13. **Sehr lange durchgehend unterstrichene Abschnitte (mehrere Seiten):** kein
    Performance-Einbruch bei Rendern/Export/Import.
14. **Groß-/Kleinschreibung und Namespace-Präfixe bei Fremddateien:** Import stützt sich
    auf `getAttributeNS` mit festem Namespace und exakten Kleinbuchstaben-Vergleich
    (`!== 'none'`). Zu prüfen, ob reale Fremddateien den Wert tatsächlich so liefern und
    ob abweichende Präfixe/Schreibweisen nicht zu stillem Fehlschlag führen.
15. **Fokus-Erhalt nach Klick auf den Toolbar-Button:** `onMouseDown`+`preventDefault`
    (`Toolbar.tsx:76-77`) und anschließendes `view.focus()` (`Toolbar.tsx:30`) sollen
    Fokus/Selektion erhalten. Zu verifizieren: Nach dem Klick bleibt der Editor fokussiert
    und die ursprüngliche Selektion sichtbar aktiv (kein Cursor-Sprung).
16. **Zusammengesetzter `text-decoration`-Einfügewert:** siehe 4.6 — Paste von
    `text-decoration: underline line-through` verliert derzeit die Unterstreichung; als
    Fallback bestätigen oder als Fehler erfassen.
17. **DOCX-Import einer farbigen Unterstreichung (`w:color` am `<w:u>`):** Fremddatei mit
    `<w:u w:val="single" w:color="FF0000"/>` (bzw. `w:themeColor`) → der Reader
    (`reader.ts:105-106`) wertet nur `@w:val` aus und ignoriert `@w:color`; die
    Unterstreichung wird korrekt gesetzt, ihre eigenständige Linienfarbe geht jedoch
    verloren und folgt nach Re-Export wieder der Textfarbe (siehe 4.8). Als bewusster,
    dokumentierter Fidelitätsverlust bestätigen — mit echter Word-Testdatei, die eine von
    der Textfarbe abweichende Unterstreichungsfarbe trägt, verifizieren (kein Textverlust,
    kein Absturz, Unterstreichung als solche erhalten). DOCX-Gegenpart zu Grenzfall 10
    (ODT `text-underline-color`/`-width` werden analog ignoriert).

---

## 7. Rundreise-Anforderung (verbindlich)

Grundprinzip: Text mit Unterstreichung hochladen (bzw. im Editor erzeugen) →
**unverändert** exportieren → Ergebnis erneut importieren → Unterstreichung ist an exakt
derselben Textstelle weiterhin vorhanden, kein sonstiger Inhaltsverlust, keine
zusätzliche/fehlende Unterstreichung an anderer Stelle.

### 7.1 DOCX (UI-getrieben)
1. **Eigenrundreise:** Im Editor Text eingeben, per UI unterstreichen, als DOCX
   exportieren, exportierte Datei erneut importieren → Unterstreichung erhalten. Über
   echten Datei-Upload (`setInputFiles`/`filechooser`) und echten Download
   (`page.waitForEvent('download')`), nicht nur über intern aufgerufene Reader/Writer.
2. **Import einer Fremddatei → Export → Re-Import:** DOCX mit einfach unterstrichenem Wort
   importieren, unverändert als DOCX exportieren, erneut importieren → Wort weiterhin
   unterstrichen, restlicher Text nicht.
3. **Kombinierte Marks:** Text, der gleichzeitig fett, farbig **und** unterstrichen ist →
   alle drei Merkmale bleiben nach der Rundreise gemeinsam in **einem** `<w:r>` erhalten
   (Run-Zusammenführung `writer.ts:52-59`), nicht auf getrennte Runs aufgespalten, nicht
   mit Nachbartext vermischt.

### 7.2 ODT (UI-getrieben)
1. **Eigenrundreise:** dasselbe für ODT (dieser UI-getriebene Export-Test **fehlt
   aktuell** — siehe Abschnitt 1/8). `content.xml` enthält eine automatische
   Text-Formatvorlage mit `style:text-underline-style="solid"`, referenziert über
   `text:style-name` am betroffenen `text:span`.
2. **Import einer Fremddatei → Export → Re-Import** analog zu 7.1.2.
3. **Dedup:** Zwei Textläufe mit identischer Markkombination (beide nur unterstrichen) →
   `TextStyleRegistry` (`styleRegistry.ts:22-44`) erzeugt **eine** gemeinsame Definition
   (`T1`), nicht zwei; Rundreise bestätigt, dass beide unterstrichen bleiben.

### 7.3 Cross-Format (derzeit nur Code-Ebene)
Ein UI-Fluss „DOCX öffnen → als ODT exportieren" existiert **nicht**
(`speichern-unter-format` = fehlt, `FEATURE-BACKLOG.md:59`, Abschnitt 0.2). Cross-Format ist
daher **nur** über direkte Reader/Writer-Verkettung zu prüfen und darf **nicht** als
E2E-Browser-Test formuliert werden, solange das Zielformat nicht wählbar ist:
1. `readDocx(writeDocx(doc))` erzeugt das Ausgangs-JSON, dann `readOdt(writeOdt(sameJson))`
   — `underline`-Marks an derselben Textposition nach beiden Konvertierungen vergleichen
   (und umgekehrt mit Startpunkt ODT). Auch die **doppelte** Verkettung (DOCX → ODT → DOCX
   auf Code-Ebene) darf keinen kumulativen Verlust erzeugen (`FEATURE-SPEC` §19).
   **Verifizierter Status: aktuell null Abdeckung, trotz oberflächlich passenden
   Testnamens.** Der einzige existierende Cross-Format-Test
   (`shared/__tests__/cross-format-clipboard-content.test.ts`, siehe Abschnitt 1) prüft nur
   ein **fettes** Wort und vergleicht ausschließlich den extrahierten Textinhalt, nie Marks
   — für „Unterstrichen" also weder am Text noch am Mark abgedeckt. Dieser Testfall ist
   entweder als neuer, eigenständiger Test zu schreiben oder als zusätzliche
   Mark-Assertion in den bestehenden Test zu integrieren (analog zu `fett-req.md`
   Abschnitt 6.3.1) — Hauptsache die Lücke schließt sich nachweisbar.
2. Sollte `speichern-unter-format` später umgesetzt werden, sind die entsprechenden
   E2E-Rundreisen (DOCX→ODT→DOCX und ODT→DOCX→ODT) hier nachzurüsten.

### 7.4 Echte Fremddateien
Mindestens eine reale, mit Microsoft Word erzeugte DOCX-Datei und mindestens eine reale,
mit LibreOffice Writer erzeugte ODT-Datei mit einfach unterstrichenem Text importieren →
Unterstreichung korrekt erkannt (nicht nur gegen selbst erzeugte Dateien, die Schreib- und
Lesefehler gegenseitig verdecken könnten).

---

## 8. Warum die vorhandenen Tests nicht genügen (Abgrenzung)

Die bestehenden Unit-Tests „preserves bold, italic, underline, and strikethrough
independently" (`docx/__tests__/roundtrip.test.ts:63` und das ODT-Pendant) konstruieren das
ProseMirror-JSON direkt und prüfen nur Reader/Writer isoliert. Der einzige UI-getriebene
Export-Test (`clipboard-roundtrip.spec.ts:201`) prüft nur, ob **irgendwo** im DOCX-XML der
Substring `'<w:u '` vorkommt. Die beiden Import-E2E-Tests (`docx.spec.ts:301`,
`odt.spec.ts:277`) prüfen nur die Anzeige einer **selbst erzeugten** Fixture. Zusammen
belegen sie **nicht**, dass:
- die Tastenkombination Strg+U im echten Browser-Editor funktioniert (nirgends getestet),
- der Toolbar-Button per Tastatur bedienbar ist (Defekt A),
- Toggle-aus, Mischselektion und der Aktiv-Zustand des Buttons korrekt sind (Defekt B),
- der Export tatsächlich `w:val="single"` am **richtigen** Run erzeugt (Defekt C — die
  Substring-Prüfung würde auch bei falscher Zuordnung oder abweichendem `w:val` teils
  bestehen),
- ein UI-getriebener **ODT**-Export Unterstrichen korrekt schreibt (kein solcher Test),
- eine reale Fremddatei (nicht selbst erzeugt) korrekt gelesen wird,
- das DOCX-Ergebnis einer unabhängigen Schema-/Parser-Validierung standhält (Defekt D — nur
  für ODT existiert ein Ansatz, `external-validation.test.ts:64`, der zudem selbst nur
  Schema-Konformität prüft, nicht die konkrete Unterstreichung, siehe Abschnitt 0 Punkt 7),
- eine Cross-Format-Konvertierung Unterstrichen als Mark erhält (der einzige existierende
  Cross-Format-Test deckt weder das Wort noch irgendeinen Mark-Typ dafür ab, Abschnitt 0
  Punkt 7).

Diese Punkte sind der eigentliche Kern der geforderten Verifikation und müssen durch neue
oder erweiterte E2E-/Validierungs-Tests geschlossen werden, bevor der Backlog-Status von
„vorhanden" auf „verifiziert" geändert werden darf.

---

## 9. Testfälle für die Verifikation (E2E, echte Browser-Bedienung — Pflicht)

**Bereits vorhanden, aber laut Auftrag NICHT vertrauenswürdig und inhaltlich unzureichend**
(erneut prüfen, als unzureichend markieren, erweitern — nicht deren Grün-Zustand
übernehmen):
- `tests/e2e/clipboard-roundtrip.spec.ts:195-201` — UI-Klick auf „Unterstrichen", prüft nur
  Substring `'<w:u '` im DOCX-Export.
- `tests/e2e/docx.spec.ts:301` / `tests/e2e/odt.spec.ts:277` — prüfen nur den **Import** der
  hand-erzeugten Fixture (`.ProseMirror u` vorhanden), keine vollständige UI-getriebene
  Rundreise.
- `src/formats/docx/__tests__/roundtrip.test.ts:63` / ODT-Pendant — Unit-Tests mit
  konstruiertem JSON.

**Neu zu schreiben / zu ergänzen** (deckt Abschnitte 4–7 ab):
1. Text eingeben, markieren, Toolbar-Button „U" per echtem Playwright-Klick → Text sichtbar
   unterstrichen (`.ProseMirror u`), `aria-pressed="true"`.
2. Dieselbe Markierung, erneut klicken → Unterstreichung verschwindet, `aria-pressed="false"`.
3. Dieselbe Aktion per Tastenkombination **Strg+U** (`page.keyboard.press('ControlOrMeta+u')`)
   statt Klick — identisches Ergebnis (dieser Tastatur-Pfad ist aktuell in keinem E2E-Test
   abgedeckt).
4. **Tastatur-Fokus-Pfad** (Defekt A): `button.focus()` bzw. wiederholt `Tab`, dann `Enter`
   und separat `Space` → Toggle wirkt (aktuell vermutlich rot — dann Defekt A beheben, Test
   grün nachziehen).
5. Cursor ohne Selektion setzen, Strg+U, dann tippen → neuer Text unterstrichen, umgebender
   Text unverändert; **und** Button zeigt sofort nach Aktivierung (vor dem Tippen)
   `aria-pressed="true"` (Defekt B / 4.2/4.3).
6. Cursor per Pfeiltasten in bereits unterstrichenen Text bewegen (keine neue Aktion) →
   Button sofort aktiv (4.3).
7. Gemischte Selektion (teils unterstrichen, teils nicht) formatieren → Verhalten gemäß 4.4;
   `aria-pressed` **vor** dem Klick nicht fälschlich „aktiv" (Defekt B), keine JS-Exception.
8. Kombination Fett + Unterstrichen + Schriftfarbe auf demselben Textlauf → alle drei
   gleichzeitig sichtbar und unabhängig wieder entfernbar (4.5).
9. Regressionstest Selection-Sync-Bug mit „Unterstrichen" als Auslöser (Grenzfall 8) —
   Pflichttest, dauerhaft in der Suite.
10. Undo/Redo über Sequenz Tippen → Unterstrichen an → Unterstrichen aus → erneut Tippen —
    jeder Schritt einzeln korrekt (4.9).
11. **UI-getriebener DOCX-Export**, Assertion verschärfen (Defekt C): exportiertes XML
    enthält `w:u w:val="single"` **am richtigen Run** (nicht bloß Substring `'<w:u '`), und
    kein anderer Run ist fälschlich betroffen — zusätzlich unabhängige Parser-Prüfung
    (mammoth bzw. JSZip+DOMParser), siehe Testfall 18/Defekt D.
12. **UI-getriebener ODT-Export** für Unterstrichen (fehlt komplett): `content.xml` enthält
    eine automatische Text-Formatvorlage mit `style:text-underline-style="solid"`,
    referenziert über `text:style-name` am betroffenen `text:span`.
13. Rundreise-Testfälle aus Abschnitt 7.1/7.2/7.4, jeweils als eigener automatisierter Test
    über echten Upload/Download.
14. Cross-Format (7.3) **nur** als Unit-/Code-Test (`readDocx`/`writeOdt`-Verkettung),
    **nicht** als E2E, solange `speichern-unter-format` fehlt.
15. Grenzfälle 1–17 aus Abschnitt 6 — jeweils mindestens ein gezielter Test, kein Sammeltest,
    der Einzelergebnisse verschleiert. Insbesondere 9/10 (abweichende Stilwerte per echter
    Fixture), 16 (zusammengesetzter Paste-Wert) und 17 (farbige Unterstreichung `w:color` beim
    DOCX-Import — Linienfarbe geht verloren, Unterstreichung bleibt).
16. Paste-Test (4.6): Einfügen von `<u>`-HTML sowie `text-decoration: underline` → als
    Unterstrichen erkannt; Einfügen von `text-decoration: underline line-through` →
    dokumentiertes Ergebnis (aktuell voraussichtlich Verlust der Unterstreichung) nachweisen.
17. **Browser-Matrix:** Testfall 3 (Strg+U) zusätzlich auf einem Nicht-Chromium-Projekt
    absichern — aktuell laufen docx/odt-Tests nur auf Chromium (Desktop/Mobile) und WebKit
    (Tablet), **nie auf Firefox** (`playwright.config.ts` beschränkt Firefox auf
    `clipboard.*`). Entweder die Unterstrichen-Tastatur auf Firefox mit abdecken oder die
    Nichtabdeckung bewusst dokumentieren.
18. **Unabhängige Validierung** (ergänzt/verschärft Testfall 11 und 12, schließt Defekt
    C/D): Für mindestens je einen DOCX- und ODT-Export mit Unterstrichen zusätzlich zum
    eigenen Reader prüfen —
    - DOCX: mit `mammoth` einlesen bzw. `word/document.xml` direkt parsen und
      sicherstellen, dass genau `<w:u w:val="single"/>` im `<w:rPr>` des betroffenen Runs
      steht und kein anderer Run fälschlich betroffen ist.
    - ODT: `content.xml` mit `xmllint-wasm` gegen
      `tests/fixtures/external/odf-schema/OpenDocument-v1.3-schema.rng` validieren (valide
      + `style:text-underline-style="solid"` vorhanden). Der bestehende Test
      `external-validation.test.ts:64` deckt die reine Schema-Validität der ODT-Seite
      bereits ab und ist beizubehalten — **er prüft aber nachweislich nur
      `contentResult.valid`/`stylesResult.valid` (Zeilen 118-130), nicht ob die
      unterstrichene Textstelle tatsächlich `style:text-underline-style="solid"` trägt**
      (Abschnitt 0, Punkt 7). Diese fehlende Inhaltsassertion ist zu **ergänzen** (analog zu
      `fett-req.md` Testfall 7.8), nicht nur der Test „beizubehalten"; das DOCX-Pendant
      fehlt zusätzlich komplett und ist neu zu schreiben.

---

## 10. Abnahmekriterien (Definition of Done)

Der Status darf erst als „verifiziert" gelten, wenn **alle** folgenden Punkte erfüllt sind:

1. Alle Testfälle aus Abschnitt 9 sind als automatisierte Tests vorhanden und grün (echte
   Browser-Interaktion, nicht nur Unit-/Command-Ebene).
2. Alle **sieben** Defekte A–G aus Abschnitt 5 (nicht nur vier — A/B/C/D als Verdacht,
   E/F/G bereits real bestätigt) sind je einzeln entweder **behoben und mit
   Regressionstest abgesichert** oder als **bewusst akzeptierte Einschränkung dokumentiert**
   — kein Punkt bleibt offen. Insbesondere ist die schwache Export-Assertion (Defekt C) auf
   `w:u w:val="single"` am richtigen Run verschärft und der fehlende UI-getriebene
   ODT-Export-Test (Testfall 12) ergänzt.
3. Mindestens die Rundreise-Anforderungen 7.1.1, 7.2.1, 7.3.1 und 7.4 sind mit echten, nicht
   selbst erzeugten Prüfwerkzeugen bestanden; das fehlende DOCX-Schema-/Parser-
   Validierungspendant zu `external-validation.test.ts:64` (Defekt D) ist ergänzt
   (`mammoth`/direktes XML-Parsen), **und** die vorhandene ODT-Schema-Validierung ist um
   eine gezielte Inhaltsassertion (`style:text-underline-style="solid"` an der konkreten
   Textstelle, nicht nur `contentResult.valid`) erweitert (Abschnitt 0 Punkt 7). Der einzige
   Cross-Format-Code-Test des Repos deckt Unterstrichen bislang in keiner Form ab und ist
   entsprechend zu ergänzen.
4. Der Regressionstest aus Grenzfall 8 (Selection-Sync mit „Unterstrichen" als Auslöser) ist
   dauerhaft in der Testsuite verankert.
5. Die Grenzfälle 9, 10, 14, 16 und 17 (Fremddateien mit abweichenden Stilwerten,
   Namespace-/Schreibweisen, zusammengesetzter Paste-Wert, farbige Unterstreichung mit
   `w:color` beim DOCX-Import) sind geprüft und ihr Fallback-Verhalten ist in dieser Datei
   oder einer Nachfolgedatei explizit dokumentiert (nicht offen gelassen).
6. Die offenen Klärungspunkte aus 4.2 (storedMark-Undo), 4.6 (Paste-Shorthand) und 4.7
   (Unterstrichen in Überschriften) sind beantwortet und das Ergebnis hier nachgetragen.
7. Das Icon-Rendering-Risiko aus Abschnitt 3, Zeile 4, ist bewertet (bewusst als CSS-„U"
   beibehalten oder auf SVG umgestellt, Präzedenz `ScissorsIcon`), insbesondere im Hinblick
   auf spätere Abgrenzung zu „Unterstrichen (doppelt)".
8. Die Cross-Format-Einschränkung (Abschnitt 0.2/7.3) bleibt im Backlog sichtbar, bis
   `speichern-unter-format` umgesetzt ist — „Unterstrichen (einfach)" gilt auch ohne
   UI-Cross-Format als abnahmefähig, sofern die Code-Ebenen-Rundreise (7.3.1) grün ist.
9. Kein während der Verifikation gefundener Fehler bleibt ohne Ticket/Vermerk zurück.
