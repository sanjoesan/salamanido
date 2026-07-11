# Anforderungsspezifikation: Zeichenformatierung „Fett"

Status: **Nicht vertrauenswürdig — vollständige Verifikation ausstehend.** Laut
`specs/FEATURE-BACKLOG.md` (Abschnitt 2.2, Slug `fett`) als **vorhanden** geführt
(Priorität 1/essenziell), Beschreibung dort: „Schaltet Fettdruck auf Selektion bzw.
an der Schreibmarke um." Diese Datei ersetzt die Backlog-Beschreibung nicht, sondern
macht sie so detailliert und einzeln abhakbar, dass ein QA-Agent jeden Punkt über
**echte Browser-Bedienung** (nicht nur Unit-/Command-Ebene) nachweisen oder widerlegen
kann. Stil und Gliederung orientieren sich an `E:\docs\FEATURE-SPEC-DOCX-ODT.md`.

Geltungsbereich: ausschließlich das Zeichenformat „Fett" (ProseMirror-Mark `strong`,
DOCX `<w:b/>`, ODT `fo:font-weight="bold"`). Andere Marks (Kursiv, Unterstrichen,
Durchgestrichen, Farben) sind nur insoweit relevant, wie sie mit Fett kombiniert
auftreten. Gilt für **beide** Formate, DOCX **und** ODT, jeweils beim Import einer
bestehenden Datei **und** beim Export eines im Editor erstellten/bearbeiteten
Dokuments — inklusive Rundreise (Datei hochladen → **unverändert** exportieren →
Ergebnis entspricht inhaltlich dem Original).

---

## 0. Hinweis zur Verifikation dieser Datei

1. **Zeilennummern sind Wegweiser, kein Vertrag.** Alle Code-Fundstellen unten sind
   gegen den **aktuellen** Stand des Repos (nach dem gemergten Feature „Ausschneiden"/Cut)
   frisch verifiziert. Sie driften jedoch bei jedem Merge, der oberhalb liegende Zeilen
   einfügt — der Cut-Merge hat z. B. `WordEditor.tsx` um rund acht Zeilen nach unten
   geschoben. Wer diese Datei nutzt, **verifiziert die Fundstelle per Symbolname/`grep`
   neu** (`toggleMark(...strong)`, `isInSet`, `firstChildNS(rPr, w, 'b')`, …) statt sich
   blind auf die Zeilenzahl zu verlassen. Der Code-Anhang liegt in
   `specs/fett-code.md`.
2. **Unabhängige Validierer sind vorhanden** (für Abschnitt 6.4): `mammoth`
   (`package.json` DevDependency, DOCX→HTML, unabhängig vom eigenen Reader) und
   `xmllint-wasm` samt gebündeltem ODF-1.3-RelaxNG-Schema
   (`tests/fixtures/external/odf-schema/OpenDocument-v1.3-schema.rng`). „python-docx"
   o. Ä. existiert in diesem reinen JS/TS-Projekt **nicht** und darf nicht als
   Validierer eingeplant werden.
3. **Cross-Format über die UI ist derzeit unmöglich.** Das Zielformat beim Export ist
   nicht wählbar (`speichern-unter-format` im Backlog = **fehlt**, Prio 2); es wird immer
   im Ursprungsformat exportiert. Cross-Format-Rundreise ist damit **nur** auf
   Reader/Writer-Code-Ebene prüfbar (`readDocx`→`writeOdt` usw.), nicht als
   E2E-Browser-Fluss (siehe Abschnitt 6.3). Jede E2E-Formulierung „DOCX öffnen → als ODT
   exportieren" ist bis dahin nicht umsetzbar.
4. **Alle vorhandenen Fett-Tests gelten laut Auftrag als nicht vertrauenswürdig.** Ihr
   Grün-Zustand ist **nicht** als Nachweis zu übernehmen; sie sind in Abschnitt 7 als
   „vorhanden, aber unzureichend" gelistet und erneut kritisch zu prüfen.
5. **Neu in dieser PO-Prüfrunde direkt gegen den installierten Bibliothekscode
   verifiziert (siehe Defekt E, Abschnitt 4).** Frühere Fassungen dieser Datei — und
   darauf aufbauend `fett-code.md`/`fett-qa.md` — übernahmen ungeprüft die verbreitete
   Annahme „Standard-`toggleMark`-Verhalten bei gemischter Selektion = erster Klick
   fettet alles". Ein direkter Blick in die tatsächlich installierte Abhängigkeit
   (`prosemirror-commands@1.7.1`, siehe `package.json`) zeigt das **Gegenteil**: Beide
   Aufrufstellen im Code (`Toolbar.tsx:78`, `WordEditor.tsx:98`) rufen
   `toggleMark(markType)` **ohne** drittes Options-Argument auf, wodurch bei
   gemischter Selektion der **erste** Klick die Fettung aus der **gesamten**
   Selektion entfernt (nicht setzt). Das ist kein bloßer Verdacht, sondern am
   öffentlich dokumentierten Verhalten der Bibliothek nachvollzogen. Dev/QA müssen
   ihre Dokumente entsprechend korrigieren, sobald sie diese Fassung erneut lesen.
   Ebenfalls neu ergänzt: Touch als dritte Bedienmodalität (Bedienelement 1),
   Mehrzell-`CellSelection` als eigener Grenzfall (5.15) und die Pflicht zu
   mindestens einem echten `filechooser`-Rundreise-Test je Format (Testfall 7.10).
6. **Neu in dieser PO-Prüfrunde ergänzt: bisher komplett fehlender Abgleich mit den
   vorhandenen Vitest-Unit-Tests** (Abschnitt 1, neuer Absatz „Weitere Fett-berührende
   Unit-Tests"; Abschnitt 6.3/6.4/7 entsprechend nachgezogen). Frühere Fassungen dieser
   Datei bewerteten die Rundreise- und Validierungslage ausschließlich anhand der
   E2E-Suite und ließen die parallel existierende Reader/Writer-Ebene (`*/roundtrip.test.ts`,
   `*/external-validation.test.ts`, `cross-format-clipboard-content.test.ts`)
   unerwähnt — mit der Folge, dass Abschnitt 6.3/6.4 Arbeit als „neu zu schreiben"
   auswiesen, die für einen Teilaspekt (DOCX-Einzel-Fett gegen `mammoth`, ODT-Struktur
   gegen das ODF-Schema) bereits **vorhanden** ist, während ein anderer, naheliegender
   Aspekt (Fett-Mark-Erhalt bei Cross-Format-Konvertierung) trotz eines existierenden,
   thematisch einschlägigen Tests tatsächlich **komplett ungeprüft** bleibt, weil dieser
   Test nur reinen Text, nicht aber Marks vergleicht — direkt am Testcode nachvollzogen,
   siehe die entsprechenden Abschnitte.
7. **Neueste PO-Prüfrunde (dieser Durchlauf): jede einzelne Code-Fundstelle dieser Datei
   erneut gegen den aktuellen Arbeitsstand nachgeschlagen** (`Toolbar.tsx`, `WordEditor.tsx`,
   `schema.ts`, `docx/reader.ts`, `docx/writer.ts`, `docx/styleDefs.ts`, `odt/reader.ts`,
   `odt/writer.ts`, `odt/styleRegistry.ts`, `index.css`, `commands.ts`, `playwright.config.ts`,
   `App.test.tsx`, sowie alle zitierten `*.spec.ts`/`*.test.ts`-Zeilennummern in
   `tests/e2e/` und `src/formats/*/__tests__/`). **Ergebnis: keine einzige Abweichung
   gefunden** — inklusive der installierten `prosemirror-commands@1.7.1`-Quelle selbst
   (`node_modules/prosemirror-commands/dist/index.js:679-712`), die Defekt E Zeile für
   Zeile bestätigt (`removeWhenPresent = (options && options.removeWhenPresent) !== false`,
   `add = !ranges.some(r => state.doc.rangeHasMark(...))`). Diese Fassung übernimmt daher
   alle Vorbefunde unverändert und ergänzt nur echte, bisher fehlende Punkte: die
   ARIA-`toolbar`-Rollen-Frage (Bedienelement 1, neuer Absatz) und die bewusste
   Datenschutz-/Architekturentscheidung „kein Autosave" als Klarstellung zu 3.2/8.3
   (Grenzfall 16). Alle Zeilenangaben in dieser Datei sind damit Stand des Reviews
   **frisch**, nicht nur „wahrscheinlich noch aktuell".

---

## 1. Verifizierter Ist-Stand (Basis dieser Anforderung, **kein** Korrektheitsnachweis)

Fundstellen ohne Pfad liegen in `src/formats/shared/editor/` (`Toolbar.tsx`,
`WordEditor.tsx`, `commands.ts`); Schema in `src/formats/shared/`; Reader/Writer in
`src/formats/docx/` bzw. `src/formats/odt/`.

| Ebene | Datei / Fundstelle | Tatsächlicher Inhalt |
|---|---|---|
| Schema (Mark) | `shared/schema.ts:158-163` | Mark `strong`; `parseDOM` = `<strong>`, `<b>` sowie `{ style: 'font-weight', getAttrs: v => /^(bold\|[5-9]\d{2,})$/.test(v) && null }`; `toDOM` = `['strong', 0]` (rendert `<strong>`) |
| Toolbar-Button | `Toolbar.tsx:184` | `<MarkButton mark="strong" label="F" title="Fett" glyphClassName="font-bold" />` — sichtbarer Glyph ist der Buchstabe „F" (CSS-fett), `aria-label`/`title` = „Fett" |
| Button-Komponente | `Toolbar.tsx:55-89` | generisch für F/K/U/S; rendert `<button aria-pressed={active} aria-label={title}>` |
| Auslöser (Maus) | `Toolbar.tsx:76-79` | **nur** `onMouseDown` (mit `e.preventDefault()` gegen Fokus-/Selektionsverlust), dann `run(view, toggleMark(markType))`. **Kein `onClick`, kein `onKeyDown`** |
| Toggle-Semantik bei gemischter Selektion | `Toolbar.tsx:78`, `WordEditor.tsx:98` (Aufruf ohne Options-Argument); Verhalten laut `prosemirror-commands@1.7.1`-API (`node_modules/prosemirror-commands/dist/index.d.ts`, `toggleMark`) | Kein drittes Argument an beiden Aufrufstellen → `removeWhenPresent` bleibt am Default `true` („the mark is removed (`true`, the default) or added (`false`)"). Kombiniert mit `Doc.rangeHasMark` (meldet „vorhanden" schon bei **irgendeinem** Treffer im Bereich, verifiziert in `prosemirror-model`) entfernt der **erste** Klick auf eine gemischte Selektion die Fettung aus der **gesamten** Selektion, statt sie zu setzen — Gegenteil der verbreiteten Annahme. **Verifiziert, kein Verdacht** → Defekt E |
| Aktiv-Zustand | `Toolbar.tsx:69` | `markType.isInSet(view.state.selection.$from.marks()) !== undefined` — prüft nur `$from`, **ohne** `state.storedMarks` |
| Aktiv-Optik | `Toolbar.tsx:80-84` | dunkler Hintergrund (Light) / heller (Dark), wenn `active` |
| Tastenkürzel | `WordEditor.tsx:98` | `'Mod-b': toggleMark(wordSchema.marks.strong)` (Strg+B / Cmd+B) — **unabhängig vom Button**, direkt in der Keymap |
| Undo/Redo-Keymap | `WordEditor.tsx:93-95` | `'Mod-z': undo`, `'Mod-y': redo`, `'Mod-Shift-z': redo` |
| Transaktions-Dispatch | `WordEditor.tsx:125-132` | `dispatchTransaction`; `onChange` wird **nur** bei `tr.docChanged` ausgelöst (`:128-130`), danach immer `forceRender` (`:131`) für die Toolbar-Neubewertung |
| Selektions-Reconciliation | `WordEditor.tsx:43-50` (Fkt.), Listener `:143-155` | Mouseup-Korrektur der Modell-Selektion nach Toolbar-Aktion + Klick (der Fix zum bekannten Selection-Sync-Bug, siehe 5.13) |
| DOCX-Import | `docx/reader.ts:103` | `if (firstChildNS(rPr, w, 'b')) marks.push({ type: 'strong' })` — prüft nur **Existenz** von `<w:b>`, **ignoriert `@w:val`** (zum Kontrast: Unterstrichen in `reader.ts:105-106` prüft korrekt `val !== 'none'`) |
| DOCX Stil-Auflösung | `docx/reader.ts:53-67` | `parseStylesXml` liest **nur** `outlineLvl` (Überschriftenebene) aus `styles.xml`; **keine** Auswertung von `<w:b/>` in einer Zeichen-/Absatz-Formatvorlage, **kein** `w:rStyle` |
| DOCX-Export | `docx/writer.ts:23` | `if (mark.type === 'strong') props.push('<w:b/>')` in `<w:rPr>` |
| DOCX Run-Zusammenführung | `docx/writer.ts:52-59` | benachbarte Textknoten mit **identischer** Markkombination (`JSON.stringify`-Vergleich) werden zu **einem** `<w:r>` verschmolzen |
| DOCX Heading-Bold (Stil) | `docx/styleDefs.ts:17` | `headingStylesXml()` deklariert `<w:rPr><w:b/><w:sz …/></w:rPr>` je „Heading1–6" — Fettung auf **Stil-Ebene**, unabhängig vom Run-Mark |
| ODT-Import | `odt/reader.ts:52` + `:105` | `if (props.getAttributeNS(fo, 'font-weight') === 'bold') style.bold = true` (exakt der Literal-String `bold`); `marksFor` → `{ type: 'strong' }` |
| ODT Stil-Quelle | `odt/reader.ts:37,43-59` | `parseAutomaticStyles` liest **ausschließlich** `office:automatic-styles` (Body aus `content.xml`, Kopf-/Fußzeile aus `styles.xml`); **kein** `office:styles` (benannte Stile), **kein** `style:parent-style-name` |
| ODT-Export | `odt/writer.ts:35,77-78` | `strong` → `props.bold`; `inlineToOdt` umschließt den Textlauf in `<text:span text:style-name="…">` |
| ODT Stil-XML | `odt/styleRegistry.ts:48` | `props.bold` → `fo:font-weight="bold" style:font-weight-asian="bold" style:font-weight-complex="bold"` in einer automatischen Text-Formatvorlage |
| ODT Dedup | `odt/styleRegistry.ts:22-44` | `TextStyleRegistry` dedupliziert Markkombinationen (`JSON.stringify`-Schlüssel) zu `T1`, `T2`, … |
| ODT Heading-Bold (Stil) | `odt/styleRegistry.ts:89` | `headingStyleDefs()` deklariert `fo:font-weight="bold"` je Überschrift-Stil, unabhängig vom Run-Mark |
| Editor-CSS | `src/index.css:29-37,58-61` | **Keine** `font-weight`-Regel für `.ProseMirror h1`–`h6` (nur `margin`); einzige `font-weight`-Regel ist `.ProseMirror th { font-weight: 600 }` |
| E2E DOCX | `tests/e2e/docx.spec.ts:69,108,253,299` | „types and bolds text" (Klick auf „Fett"), Rundreise-Test, Voll-Coverage-Rundreise (`strong`-Assertion `:299`) — Assertions nur per **String-`contains`** auf `<w:b/>` |
| E2E ODT | `tests/e2e/odt.spec.ts:53,89,229,275` | analog, Assertion `font-weight="bold"` per String-`contains` (`strong`-Assertion `:275`) |
| Regression | `tests/e2e/selection-regression.spec.ts:14,43,61,88` | 4 Tests, **alle** mit „Fett" (`getByTitle('Fett').click()`) als auslösendem Schritt |
| Browser-Matrix | `playwright.config.ts` | Vollsuite (inkl. docx/odt/selection-regression) läuft auf **Desktop Chrome**, **Mobile (Pixel 7, Chromium)**, **Tablet (iPad Mini, WebKit)**; **Firefox** und **Desktop Safari** sind **nur** auf `clipboard.*.spec.ts` beschränkt |

Weitere Fett-berührende E2E-Tests aus dem Clipboard-/Cut-Feature (lösen „Fett" **real
über die Toolbar** aus, gehören daher zur Bestandsaufnahme und zur kritischen
Neubewertung): `clipboard.spec.ts` (Fett+Farbe+Hervorhebung nach Kopieren/Einfügen;
Teilselektion exakt an der Fett/Nicht-Fett-Grenze — berührt Grenzfall 5.2, **nicht**
5.6 wie eine frühere Fassung dieser Datei fälschlich verwies; 5.6 betrifft die
numerische `font-weight`-Schwelle beim Einfügen, ein anderer Sachverhalt),
`clipboard-roundtrip.spec.ts` (Fett → ODT `fo:font-weight="bold"`), `cut.spec.ts` (Fett
+ Ausschneiden; „Fett bleibt ein separater Undo-Schritt" — berührt 3.7),
`new-document.spec.ts` und `roundtrip-fidelity.spec.ts` (Fett-Rundreise). Ihre Existenz
senkt den Neuschreibaufwand für Kombination (3.4), Undo (3.7) und die Fett/Nicht-Fett-
Grenze (5.2), ersetzt die kritische Prüfung aber nicht.

**Weitere Fett-berührende Unit-Tests (Vitest, Reader/Writer-Ebene, kein Browser) —
in früheren Fassungen dieser Datei nicht erwähnt, frisch verifiziert:**
- `src/formats/docx/__tests__/roundtrip.test.ts:63-84` „preserves bold, italic,
  underline, and strikethrough independently" und `:86-98` „preserves combined marks
  on the same run" (fett+kursiv) — Code-Ebene, **eigener** Reader gegen **eigenen**
  Writer (`readDocx(writeDocx(...))`), deckt 6.1.3 strukturell bereits ab, ersetzt aber
  keinen unabhängigen Validierer.
- `src/formats/odt/__tests__/roundtrip.test.ts` — analoges Muster für ODT (`readOdt(writeOdt(...))`).
- `src/formats/docx/__tests__/external-validation.test.ts:19-78` — exportiert ein
  Dokument mit **einem** fetten Wort („fettem") und lässt es von **mammoth** (unabhängig
  vom eigenen Reader) einlesen; Assertion `expect(html).toContain('<strong>fettem</strong>')`
  (Zeile 72). Das deckt einen **Teil** von Abschnitt 6.4 (DOCX) bereits ab — aber nur den
  Einzel-Mark-Fall, **nicht** die in Testfall 7.7 geforderte Kombination
  Fett+Kursiv+Unterstrichen in einem `<w:r>`. Als Vorlage zum Erweitern geeignet, nicht
  als vollständiger Nachweis zu verwechseln.
- `src/formats/odt/__tests__/external-validation.test.ts:44-130` — exportiert ein
  Dokument mit einer fetten, verbundenen Tabellenzelle („Verbunden und fett") und
  validiert `content.xml`/`styles.xml` gegen das offizielle OASIS-ODF-1.3-RelaxNG-Schema
  (`xmllint-wasm`). **Wichtige Einschränkung, direkt am Testcode verifiziert:** Die
  Assertions prüfen ausschließlich `contentResult.valid`/`stylesResult.valid`
  (Schema-Konformität) — an **keiner** Stelle wird geprüft, dass die konkrete Textstelle
  „Verbunden und fett" tatsächlich `fo:font-weight="bold"` trägt. Ein hypothetischer
  Schreibfehler, der die Fett-Eigenschaft beim Export verliert, das Dokument aber
  weiterhin schema-valide lässt (z. B. leere `style:text-properties`), würde von diesem
  Test **nicht** erkannt. Deckt einen Teil von Abschnitt 6.4 (ODT, Struktur) ab, ist aber
  **kein** Nachweis, dass Fett selbst korrekt geschrieben wurde — Testfall 7.8 muss diese
  fehlende Inhaltsassertion ergänzen, nicht nur eine neue Schema-Validierung aufsetzen.
- `src/formats/shared/__tests__/cross-format-clipboard-content.test.ts:20-50` — einziger
  existierender **Cross-Format**-Code-Test (`readDocx(writeDocx(x))` vs.
  `readOdt(writeOdt(x))`) an einem Dokument mit einem fetten Wort. **Verifizierte, für
  Abschnitt 6.3 zentrale Lücke:** Die einzige Assertion (`extractText(...)`, Zeile 14-18)
  vergleicht **ausschließlich den reinen Textinhalt** rekursiv über alle Knoten — Marks
  werden beim Textzusammenbau gar nicht erst gelesen. Das Fett-Mark selbst wird an
  **keiner** Stelle dieses Tests verglichen. Testfall 6.3.1 dieser Spezifikation
  (Fett-Marks nach Cross-Format-Doppelkonvertierung vergleichen) hat damit trotz eines
  oberflächlich passenden, existierenden Tests **keinerlei** tatsächliche Abdeckung —
  eine frühere Fassung dieser Datei behandelte diesen Punkt lediglich als „noch zu
  schreiben", ohne zu bemerken, dass ein gleichnamig aussehender Test bereits existiert
  und fälschlich Sicherheit suggerieren könnte.

---

## 2. Bedienelemente / Menüpunkte

| # | Element | Fundstelle | Ist-Verhalten | Anforderung |
|---|---|---|---|---|
| 1 | Toolbar-Button „F" | `Toolbar.tsx:184` | Toggle über `onMouseDown`; `aria-label`/`title` = „Fett"; sichtbarer Glyph „F" mit `font-bold` | Muss per **Maus, Tastatur** (Tab-Fokus auf den Button + Enter/Leertaste) **und Touch** auslösbar sein — Touch ist keine Kür: Das verpflichtende Vollsuite-Projekt **Mobile (Pixel 7, Chromium)** bedient den Button auf echten Geräten ausschließlich per Tap, nicht per Maus (Abschnitt 1, Zeile „Browser-Matrix"). **Verdacht: Tastatur-Aktivierung des Buttons funktioniert derzeit nicht** — siehe Defekt A |
| 2 | Tastenkombination Strg+B / Cmd+B | `WordEditor.tsx:98` | `toggleMark(strong)` in der Keymap, wirkt solange der Editor fokussiert ist | Muss in allen tatsächlich getesteten Browsern wirken und die Browser-eigene Belegung (z. B. Firefox: Lesezeichen-Sidebar) unterdrücken, solange der Editor fokussiert ist. **Aktuell in keinem Test per Tastatur ausgelöst** und nie auf Firefox getestet (Matrix, Abschnitt 1) |
| 3 | Aktiv-Anzeige des Buttons | `Toolbar.tsx:69,75` | `aria-pressed={active}`, `active` nur aus `$from.marks()` | Muss den tatsächlichen Fett-Zustand an Schreibmarke/Selektion widerspiegeln — inkl. „vorgemerktes" Fett (`storedMarks`) und gemischter Selektion. **Verdacht: beide Fälle falsch** — siehe Defekt B |
| 4 | Icon-Darstellung | `Toolbar.tsx:86,184` | reiner Buchstabe „F" mit `font-bold`, kein SVG | Muss auf Systemen ohne Standard-Systemschriftart eindeutig als „Fett"-Schalter erkennbar bleiben. Geringeres Risiko als die Emoji-Glyphen (🖍/⊞/🖼), aber gemäß `FEATURE-SPEC` §20.1 zu **bewerten**. SVG-Präzedenz existiert bereits (`ScissorsIcon`, `Toolbar.tsx:33-53`) |
| 5 | Kontextmenü-Eintrag „Fett" | — | nicht vorhanden | Kein eigener Kontextmenü-Eintrag; nicht Teil dieser Anforderung, aber als bewusst fehlend dokumentiert. Kein „Formatierung löschen" (Backlog `formatierung-loeschen` = fehlt) — Fett lässt sich nur über erneutes Toggle entfernen |

**Neu, verifiziert — ARIA-`toolbar`-Rolle vs. tatsächliches Tastaturmuster:** Der
umschließende Container trägt `role="toolbar"` (`Toolbar.tsx:139`). Nach dem
WAI-ARIA-Toolbar-Muster impliziert das eigentlich **einen** Tab-Stopp für die gesamte
Toolbar mit Pfeiltasten-Navigation zwischen den Buttons („roving tabindex"). Verifiziert:
Weder `onKeyDown` noch `tabIndex` kommen in `Toolbar.tsx` vor — es gibt **kein**
Roving-Tabindex-Muster. Jeder Button (inkl. „Fett") ist stattdessen ein **eigener**,
normaler Tab-Stopp in der nativen Dokumentreihenfolge. **Konsequenz für Testfall 7.3 und
Bedienelement 1:** Der korrekte, zu testende Tastaturpfad zum „Fett"-Button ist
wiederholtes **Tab** (nicht Pfeiltasten) bis zum Fokus, danach Enter/Leertaste. Das ist
für sich genommen bedienbar (sofern Defekt A behoben wird) und blockiert die Abnahme von
„Fett" **nicht** — die Lücke zum vollen ARIA-Toolbar-Muster (Pfeiltasten-Navigation
*innerhalb* der Toolbar) betrifft alle Toolbar-Buttons gleichermaßen, ist also kein
Fett-spezifischer Defekt, sondern ein angrenzender, fürs Backlog zu vermerkender Befund
(entweder `role="toolbar"` entfernen, da das Muster nicht implementiert ist, oder das
Muster nachrüsten). Für die Abnahme von „Fett" genügt der verifizierte Tab-pro-Button-Pfad.

---

## 3. Gewünschtes Verhalten im Detail

### 3.1 Toggle auf bestehender Selektion
- Mindestens ein Zeichen markiert, **kein** Teil davon fett → gesamte Selektion wird
  fett.
- Gesamte Selektion bereits fett → Fett wird für die gesamte Selektion entfernt
  (echtes Toggle, kein reines „Setzen").
- Gemischte Selektion (teils fett, teils nicht) → **verifiziertes, aber falsches
  Ist-Verhalten:** Beide Aufrufstellen (`Toolbar.tsx:78`, `WordEditor.tsx:98`) rufen
  `toggleMark(markType)` **ohne** drittes Options-Argument auf. In der installierten
  `prosemirror-commands@1.7.1` bedeutet das `removeWhenPresent: true` (Default,
  öffentliche API-Doku: „the mark is removed (`true`, the default) or added
  (`false`)"), und `Doc.rangeHasMark` meldet bereits „vorhanden", sobald
  **irgendein** Zeichen im Bereich das Mark trägt. Ergebnis: Der **erste** Klick auf
  eine gemischte Selektion **entfernt** die Fettung aus der **gesamten** Selektion
  (statt sie zu setzen) — das **Gegenteil** der in einer früheren Fassung dieser
  Datei behaupteten „Standard-Verhalten"-Beschreibung und das Gegenteil der üblichen
  Word-/LibreOffice-Konvention. **Geforderte Soll-Anforderung (PO-Entscheidung):**
  Der erste Klick auf eine gemischte Selektion setzt die **gesamte** Selektion auf
  fett (Konsistenz mit Word-/LibreOffice-Muskelgedächtnis); erst ein zweiter Klick
  auf die jetzt vollständig fette Selektion entfernt sie wieder. Fundstelle, Beleg
  und minimaler Fix (`removeWhenPresent: false` an beiden Aufrufstellen) in
  **Defekt E**. Bis zum Fix ist dieses Verhalten aktiv **falsch**, nicht bloß „zu
  erwarten und zu testen" — siehe Grenzfall 5.3.
- Die gesamte Fett-Anwendung auf die Selektion ist **ein einzelner** Undo-Schritt
  (ein Strg+Z macht sie komplett rückgängig, nicht Zeichen für Zeichen).

### 3.2 Toggle an der Schreibmarke (keine Selektion)
- Cursor ohne Selektion, „Fett" aktiviert → ProseMirror setzt `state.storedMarks`
  = `[strong]`; der **nächste** getippte Text ist fett, umgebender Text links/rechts
  bleibt unverändert.
- Erneutes Umschalten vor dem nächsten Tastendruck → Zustand kippt zurück. Ein reines
  Umschalten des vorgemerkten Marks (ohne Dokumentänderung) soll **keinen** eigenen
  Undo-Schritt erzeugen: Die Transaktion ändert das Dokument nicht, `tr.docChanged` ist
  `false`, `dispatchTransaction` (`WordEditor.tsx:125-132`) löst also kein `onChange`
  aus. Zu bestätigen ist, dass auch `prosemirror-history` sie nicht als eigenen Schritt
  führt.
- Schreibmarke unmittelbar an einer Fett-Grenze → Grenzfall 5.2.

### 3.3 Anzeige des aktiven Zustands
Der Button soll gedrückt (`aria-pressed="true"`, abgesetzter Hintergrund) erscheinen,
wenn:
- die Schreibmarke (ohne Selektion) in bereits fettem Text steht, **oder**
- ein an der leeren Schreibmarke **vorgemerktes** Fett-Mark aktiv ist (nächstes
  Getipptes wird fett), **oder**
- eine Selektion **durchgehend** fett ist.

Bei gemischter Selektion darf der Button **keinen** einheitlichen „aktiv"-Zustand
vortäuschen, der der Realität widerspricht. Die aktuelle Implementierung
(`$from.marks()`, `Toolbar.tsx:69`) erfüllt Punkt 2 und den gemischten Fall **nicht** —
siehe Defekt B. Der Zustand muss sich ohne Zusatzaktion sofort bei jeder Cursor-/
Selektionsänderung aktualisieren (die Neubewertung erfolgt über `forceRender` in
`WordEditor.tsx:131`, das nach **jeder** Transaktion läuft).

### 3.4 Kombination mit anderen Zeichenformaten
- Fett muss gleichzeitig mit Kursiv, Unterstrichen, Durchgestrichen, Schriftfarbe und
  Hervorhebungsfarbe auf demselben Textlauf möglich sein; das Umschalten von Fett darf
  keines der anderen aktiven Marks verändern oder entfernen.
- Die Anwendungsreihenfolge (z. B. erst Farbe, dann Fett, oder umgekehrt) darf das
  Endergebnis nicht beeinflussen. Beim DOCX-Export müssen alle Marks in **einem**
  `<w:r>`/`<w:rPr>` landen (die Run-Zusammenführung `docx/writer.ts:52-59` setzt
  identische Markkombinationen voraus — die Mark-**Reihenfolge** im Array darf daher das
  Ergebnis nicht in getrennte Runs zerlegen; explizit zu prüfen).

### 3.5 Interaktion mit Überschriften
Zu klärender Sachverhalt und die daraus folgenden, zu verifizierenden Fragen:

1. **Editor-Darstellung.** Es gibt keine CSS-Regel, die `.ProseMirror h1`–`h6` fett
   macht (`src/index.css:29-37` setzt nur `margin`). Das Projekt nutzt Tailwind v4
   (`@import 'tailwindcss'` in `index.css:1`); dessen Preflight setzt `h1`–`h6` auf
   `font-weight: inherit` (→ 400) und `strong { font-weight: bolder }` (relativ zu 400 =
   700). Das `strong`-Mark rendert als `<strong>`. **Wahrscheinliche Folge, die per
   `getComputedStyle` zu bestätigen ist:**
   - Eine Überschrift **ohne** `strong`-Mark erscheint im Editor **nicht** fett
     (Gewicht 400) — vermutlich **unbeabsichtigt**, da der DOCX-/ODT-Export
     Überschriften sehr wohl fett macht (Stil-Ebene, `docx/styleDefs.ts:17` /
     `odt/styleRegistry.ts:89`). Editor-Optik und Export-Optik laufen also auseinander
     (siehe Defekt D).
   - Ein Fett-Toggle **innerhalb** einer Überschrift ist damit optisch **sehr wohl
     wirksam** (die betroffenen Wörter springen auf 700).
2. **Export-Redundanz.** Da Überschriften bereits auf **Stil-Ebene** fett sind, ist
   ein zusätzlich auf Überschriftentext gesetztes `strong`-Mark im Export
   **redundant** (Stil- UND Run-Ebene „bold"), aber nicht falsch. Ein **entferntes**
   `strong`-Mark hebt die Stil-Ebene **nicht** auf — die Überschrift bleibt in
   Word/LibreOffice fett. Wer ein einzelnes Wort innerhalb einer Überschrift bewusst
   **nicht**-fett darstellen möchte, kann das derzeit über das `strong`-Mark **nicht**
   erreichen (dafür wäre ein expliziter „Bold-aus"-Override auf Run-Ebene nötig, den
   weder DOCX-Writer noch ODT-Writer schreiben). Dieses Verhalten ist zu **entscheiden
   und zu dokumentieren** (Abnahmekriterium 4).

### 3.6 Zwischenablage / Kopieren & Einfügen
- Fetten Text innerhalb des Editors kopieren und einfügen → Fett-Mark bleibt erhalten.
- Von extern eingefügter, fett formatierter Text (`<strong>`, `<b>` oder
  `font-weight: bold`/numerisch ≥ 500) wird gemäß `schema.ts:159` als `strong` erkannt
  und fett dargestellt. Grenzen und Ausnahmen der Erkennung → Grenzfall 5.6.

### 3.7 Undo/Redo
- Fett per Toolbar oder Strg+B erzeugt einen einzelnen, eigenständigen Undo-Schritt
  (Keymap `Mod-z`/`Mod-y`/`Mod-Shift-z`, `WordEditor.tsx:93-95`).
- Undo direkt nach „Fett" stellt exakt den vorherigen Zustand her (kein Nebeneffekt auf
  Textinhalt oder andere Marks); Redo stellt die Fett-Anwendung wieder her.
- Funktioniert in gemischten Sequenzen (Tippen → Fett an → Tippen → Fett aus → Undo
  mehrfach) in korrekter, umgekehrter Reihenfolge.

---

## 4. Verifizierte / vermutete Defekte

Die folgenden fünf Punkte wurden aus dem **tatsächlichen Code** abgeleitet. Jeder braucht
einen eigenen Test, der das beobachtete Ist-Verhalten festhält (bestätigt **oder**
widerlegt). A–D sind bewusst als „Verdacht mit konkreter Code-Begründung" formuliert,
nicht als bereits erwiesener Bug — **Ausnahme: Defekt E**, der direkt am Quellcode der
tatsächlich installierten Abhängigkeit nachvollzogen und damit bereits als real
bestätigt gilt, nicht nur vermutet.

### Defekt A (hoch): Toolbar-Button per Tastatur nicht auslösbar
`Toolbar.tsx:76-79` verdrahtet ausschließlich `onMouseDown`. Ein natives `<button>`
feuert bei Tastatur-Aktivierung (Tab-Fokus + Enter/Leertaste) **kein** `mousedown`,
sondern nur `click`. **Erwartung:** Tab zum „F"-Button, Enter/Leertaste → Fett schaltet
um. **Vermutetes Ist:** nichts passiert. (Strg+B wirkt weiterhin, weil es über die
Keymap läuft, `WordEditor.tsx:98` — der **Button** bleibt aber tastaturunbedienbar,
ein Barrierefreiheits- und Anforderungsverstoß, Bedienelement 1.) Übliche Behebung:
Toggle nach `onClick` verschieben, `onMouseDown` behält nur `preventDefault()`.

### Defekt B (hoch): Aktiv-Zustand ignoriert `storedMarks` und die Gesamtselektion
`Toolbar.tsx:69` = `markType.isInSet(view.state.selection.$from.marks())`.
`$from.marks()` berücksichtigt **nicht** `state.storedMarks`. **Erwartung:** nach „Fett
an leerer Schreibmarke aktivieren" zeigt der Button sofort `aria-pressed="true"`.
**Vermutetes Ist:** Button bleibt `false`, bis das erste Zeichen getippt ist. Zusätzlich
prüft die Zeile nur `$from` (Selektionsanfang), nicht die **gesamte** Selektion — bei
halb fetter Selektion kann `aria-pressed` je nach Startposition falsch `true`/`false`
anzeigen. Übliche Behebung: Hilfsfunktion `isMarkActive(state, type)`, die bei leerer
Selektion `state.storedMarks || $from.marks()` prüft und bei nicht-leerer Selektion nur
dann aktiv meldet, wenn **jede** Textstelle im Bereich das Mark trägt. (Muster:
`isAlignActive` in `commands.ts` zeigt, dass Toolbar-Aktivzustände eigentlich als
testbare Command-Helfer vorliegen sollten — der Mark-Aktivzustand tut das noch nicht.)

### Defekt C (hoch): DOCX-Import ignoriert `@w:val` an `<w:b>`
`docx/reader.ts:103` prüft nur die **Existenz** von `<w:b>`. Nach ECMA-376 bedeutet
`<w:b/>` (ohne `@val`) „an", aber `<w:b w:val="0"/>`, `="false"` oder `="off"` bedeuten
explizit „aus" — Word schreibt genau das, um eine von einer Formatvorlage geerbte
Fettung (z. B. in einer Überschrift) für einen einzelnen Lauf gezielt abzuschalten.
**Erwartung:** ein Lauf mit `<w:rPr><w:b w:val="0"/></w:rPr>` erscheint **nicht** fett.
**Vermutetes Ist:** wird fälschlich fett. Die Inkonsistenz ist im selben Code belegt:
Unterstrichen zwei Zeilen darunter (`reader.ts:105-106`) wertet `val !== 'none'` korrekt
aus. (Dasselbe Muster ohne `@val`-Prüfung besteht auch bei `<w:i>`/`<w:strike>` —
außerhalb des Fett-Umfangs, aber als verwandter Befund fürs Backlog vermerkt.)

### Defekt D (mittel, blockiert Beantwortung von 3.5): Überschriften im Editor nicht fett
Siehe 3.5: keine CSS-Fettung für `.ProseMirror h1`–`h6`, Tailwind-Preflight setzt Gewicht
auf `inherit` (400). **Erwartung** (aus Nutzersicht / Konsistenz mit dem Export):
Überschriften erscheinen im Editor fett. **Vermutetes Ist:** Überschriften erscheinen mit
Normalgewicht; nur explizit mit `strong` markierte Teile sind fett. Empfohlene Behebung:
`.ProseMirror h1`–`h6 { font-weight: 700 }` (oder gestaffelt) in `index.css`, damit
Editor- und Export-Optik übereinstimmen. **Dieser Punkt muss per `getComputedStyle`
verifiziert werden, bevor 3.5 abschließend beantwortet werden kann.**

### Defekt E (hoch, neu — direkt am Bibliothekscode verifiziert, kein Verdacht): Gemischte Selektion wird beim ersten Klick entfettet statt gefettet

**Fundstelle:** Aufrufstellen `Toolbar.tsx:78` (`run(view, toggleMark(markType))`) und
`WordEditor.tsx:98` (`'Mod-b': toggleMark(wordSchema.marks.strong)`) — beide **ohne**
drittes Options-Argument. Verhalten der tatsächlich installierten Abhängigkeit
`prosemirror-commands@1.7.1` (siehe `package.json`), öffentlich dokumentiert an der
`toggleMark`-Signatur (`node_modules/prosemirror-commands/dist/index.d.ts`):

> „Controls whether, when part of the selected range has the mark already and part
> doesn't, the mark is removed (`true`, the default) or added (`false`)."

Der Default `removeWhenPresent: true` kombiniert mit `Doc.rangeHasMark` (meldet
„vorhanden", sobald **irgendein** Zeichen im Bereich das Mark trägt, nicht erst bei
vollständiger Abdeckung — verifiziert in `node_modules/prosemirror-model`, Methode
`rangeHasMark`) ergibt für eine **gemischte** Selektion (teils fett, teils nicht):
`add = !ranges.some(rangeHasMark) = !true = false` → der erste Klick **entfernt** die
Fettung aus der **gesamten** Selektion. Das ist das **Gegenteil** der in Word,
LibreOffice und — fälschlich — in einer früheren Fassung dieser Datei angenommenen
Konvention „erster Klick auf gemischte Selektion fettet alles". **Bestätigt durch
direktes Lesen des Bibliothekscodes**, nicht nur vermutet wie A–D.

**Auswirkung:** Jede Selektion, die eine Fett/Nicht-Fett-Grenze überspannt (z. B. ein
Satz, in dem nur ein Wort bereits fett ist, komplett markiert und „Fett" geklickt),
verhält sich für Nutzer:innen kontraintuitiv — die Erwartung „jetzt wird alles fett"
wird enttäuscht, stattdessen verschwindet die vorhandene Fettung. Betrifft auch jede
Mehrzell-`CellSelection` (siehe Grenzfall 5.15), da `toggleMark` intern über
`state.selection.ranges` iteriert und `removeWhenPresent` dort identisch wirkt.

**Geforderte Korrektur:** `{ removeWhenPresent: false }` als drittes Argument an
beiden Aufrufstellen ergänzen. Damit gilt (verifiziert am `else`-Zweig derselben
Funktion): „entfernen" nur, wenn **jeder** Textabschnitt der Selektion das Mark
bereits vollständig trägt (`ranges.every(...)`-Vollabdeckung); in jedem anderen Fall
(gemischt **oder** komplett ohne Mark) wird gesetzt — deckungsgleich mit
Word/LibreOffice und mit der in 3.1/5.3 geforderten Soll-Beschreibung.

**Regressionstest (Pflicht):** Zwei Wörter, nur das erste fett, beide selektieren,
„Fett" klicken → **beide** danach fett (nicht: beide danach nicht-fett). Erst ein
zweiter Klick auf die jetzt komplett fette Selektion entfernt sie wieder.

---

## 5. Grenzfälle

1. **Leeres Dokument / leerer Absatz:** „Fett" mit Cursor im leeren Absatz → kein
   Absturz; setzt nur das vorgemerkte Mark.
2. **Cursor an einer Formatgrenze:** Schreibmarke unmittelbar vor dem ersten bzw. nach
   dem letzten Zeichen eines fetten Laufs (ohne Selektion) → eindeutig festlegen und
   per Test belegen, ob der Button-Zustand dem links- oder rechtsseitigen Zeichen folgt
   (ProseMirror-Regel: `$from.marks()` = „Marks vor dem Cursor, außer am Absatzanfang").
3. **Gemischte Selektion:** teils fett, teils nicht → **Soll:** erster Klick fettet die
   **gesamte** Selektion. **Verifiziertes Ist (Defekt E):** erster Klick entfernt
   stattdessen die Fettung aus der gesamten Selektion, weil beide `toggleMark`-
   Aufrufstellen ohne das Options-Argument `{ removeWhenPresent: false }` auskommen
   (Library-Default ist `true`) — bis zum Fix ist dieser Grenzfall **aktiv rot**,
   kein bloßer Verdacht. Zusätzlich zu prüfen: `aria-pressed` **vor** dem Klick
   zeigt nicht fälschlich „aktiv" (Defekt B).
4. **Fett + Überschrift:** siehe 3.5 / Defekt D — Editor-Rendering per `getComputedStyle`
   klären; Export-Redundanz dokumentieren.
5. **Fett über Bild-/Tabellengrenze:** Selektion, die Text, ein `image` und/oder
   Tabellenzellen umfasst (z. B. Strg+A über gemischten Inhalt) → kein Absturz; Fett
   wirkt nur auf inline-Text, Bilder/Tabellenstruktur bleiben unverändert.
6. **Extern eingefügter Text mit numerischem `font-weight`:** Die Regex
   `/^(bold|[5-9]\d{2,})$/` (`schema.ts:159`) erkennt `bold` sowie 3-(und mehr-)stellige
   Werte mit führender 5–9, also **500–999** (und technisch 5000+; für gültige
   Gewichte irrelevant). **Nicht** erkannt: `100`–`499`, `400`, `normal`, die
   Schlüsselwörter `bolder`/`lighter` sowie `1000`. Grenze exakt bei 500 mit Test belegen
   (`font-weight: 499` vs. `500`); `bolder` (nicht fett) als bewusste Einschränkung
   dokumentieren oder beheben.
7. **DOCX-Import, expliziter Bold-aus-Override:** `<w:b w:val="0"/>`/`"false"`/`"off"`
   → darf **nicht** fett sein (Defekt C). Mindest-Fixture analog zu `buildSampleDocx()`
   (`docx.spec.ts`) mit einem solchen Lauf.
8. **DOCX-Import, Fett nur über Zeichenformatvorlage (`w:rStyle`):** Ein Lauf mit
   `<w:rStyle w:val="…"/>`, dessen referenzierte Zeichenformatvorlage in `styles.xml`
   `<w:b/>` deklariert (ggf. über `w:basedOn` vererbt), wird derzeit **nicht** als fett
   erkannt (`docx/reader.ts:53-67,100-115` lösen `w:rStyle` nicht auf) → **stiller
   Datenverlust**, den `FEATURE-SPEC` §18 verbietet. Fixture mit `styles.xml`-
   Zeichenvorlage + `w:rStyle`-Verweis; Text muss nach Import fett erscheinen.
9. **ODT-Import, Fett nur über benannte/vererbte Formatvorlage:** `parseAutomaticStyles`
   (`odt/reader.ts:37`) liest nur `office:automatic-styles`, nie `office:styles`, und
   wertet `style:parent-style-name` nirgends aus. Fett über eine benannte
   Zeichenvorlage („Strong Emphasis") oder rein über den Elternstil geht beim Import
   verloren. Fixtures für beide Fälle; Text muss fett erscheinen.
10. **ODT-Import, numerisches/oblique `font-weight`:** `reader.ts:52` erkennt exakt den
    Literal `bold`. ODF erlaubt auch numerische Werte (`fo:font-weight="700"`). Eine
    Fremddatei mit `700` verliert die Fettung → klären, ob numerische Werte ≥ 700 (bzw.
    ≥ 500) als fett gelten sollen (Asymmetrie zur HTML-Einfüge-Erkennung in
    `schema.ts:159`, die numerisch erkennt), sonst als Einschränkung dokumentieren.
11. **Fett in leerem Listenpunkt / leerer Tabellenzelle:** Umschalten ohne Text davor/
    danach → kein Rendering-Fehler; Export erzeugt keinen leeren `<w:r>`/`<text:span>`
    ohne Inhalt (`storedMarks` erreichen den Writer nicht, da nicht Teil von
    `doc.toJSON()` — struktureller Nachweis statt Behauptung).
12. **Wiederholtes schnelles Umschalten (Doppelklick-Tempo)** auf denselben Button →
    kein doppeltes Toggle durch Event-Bubbling/doppelte Handler (besonders nach dem
    `onClick`-Fix aus Defekt A relevant).
13. **Fett als Auslöser des Selection-Sync-Bugs:** Alles auswählen → Fett an → per Klick
    neu positionieren → Enter → weiter tippen. `selection-regression.spec.ts:14,43,61,88`
    deckt genau das mit „Fett" ab (vier Tests: einfache Sequenz, Tabellenzelle, Stress,
    Kopieren-Variante). Diese Tests müssen als Teil der Verifikation von „Fett"
    weiterhin bestehen (siehe 8.5).
14. **Zusammenspiel mit noch nicht existierender Änderungsverfolgung** (Backlog 7.3 =
    fehlt): aktuell kein Verhalten definiert; nur als künftige Wechselwirkung vermerkt,
    keine Testpflicht vor Umsetzung.
15. **Mehrzell-Selektion (`CellSelection`) statt Textselektion:** Über mehrere ganze
    Tabellenzellen hinweg gezogen (Mausklick+Ziehen über Zellgrenzen, **nicht**
    Strg+A) erzeugt `prosemirror-tables` eine `CellSelection` mit einer eigenen
    `ranges`-Liste (eine pro erfasster Zelle, verifiziert am `CellSelection`-
    Konstruktor). `toggleMark` selbst iteriert korrekt über **alle** `ranges` (die
    Fett-Anwendung erreicht jede erfasste Zelle, nicht nur die erste — inklusive der
    Defekt-E-Korrektur, die ebenfalls über `ranges` läuft). **Zu verifizieren, sobald
    Defekt B behoben wird:** Ein naiver Aktiv-Zustand, der nur `selection.from`/
    `selection.to` statt aller `ranges` abfragt, sieht bei einer `CellSelection`
    **nur die erste** Zelle — `from`/`to` einer `CellSelection` sind laut
    Konstruktor die Grenzen von `ranges[0]`, nicht der Gesamtselektion. Anforderung:
    `aria-pressed` muss bei einer Mehrzell-`CellSelection` den Zustand über **alle**
    erfassten Zellen widerspiegeln, nicht nur die erste. Eigener Testfall nötig
    (mehrere Zellen anlegen, eine fett, eine nicht, per Ziehen über die Zellgrenze
    auswählen, Button-Zustand **und** Toggle-Ergebnis prüfen).
16. **Kein Autosave/keine Persistenz — bewusste Produktentscheidung, kein Grenzfall im
    Sinne eines zu behebenden Defekts:** Die App speichert nachweislich nichts
    client-seitig (`src/App.test.tsx:17-24` „never touches localStorage or
    sessionStorage", verifiziert `window.localStorage.length === 0` nach Bedienung;
    ergänzend die im UI sichtbare Zusicherung „nichts wird gespeichert",
    `App.test.tsx:13`). **Klarstellung für diese Spezifikation:** Ein Fett-Zustand
    (gesetztes Mark oder vorgemerktes `storedMarks`) muss **nicht** einen
    Seiten-Reload/Tab-Schließen überdauern — das zu fordern widerspräche der
    App-weiten Datenschutz-Architektur. Testfälle, die „Fett bleibt nach F5 erhalten"
    prüfen würden, sind **nicht** Teil der Abnahme; nur die Dokument-Session im
    Speicher (bis zum expliziten Export) muss Fett konsistent halten.

---

## 6. Rundreise-Anforderung (Pflicht für Abnahme)

Grundprinzip: Datei mit Fett hochladen (bzw. im Editor erzeugen) → **unverändert**
exportieren → erneut importieren → Fett ist inhaltlich exakt erhalten (dieselbe
Textstelle, kein Verlust, keine zusätzliche/fehlende Fettung anderswo).

### 6.1 DOCX
1. DOCX mit einem fetten Wort importieren → im Editor fett → unverändert als DOCX
   exportieren → erneut importieren → Wort weiterhin fett, restlicher Text nicht.
2. Im Editor tippen, per „Fett" formatieren, als DOCX exportieren → mit **unabhängigem
   Parser** (mammoth bzw. direktes Parsen von `word/document.xml` per JSZip+DOMParser)
   verifizieren, dass genau `<w:b/>` im `<w:rPr>` des betroffenen Runs steht und kein
   anderer Run fälschlich betroffen ist. (Die bestehenden E2E-Tests prüfen nur
   `contains('<w:b/>')` — das genügt hierfür nicht, siehe 7.)
3. Fett + Kursiv + Unterstrichen gleichzeitig auf demselben Lauf → Rundreise erhält alle
   drei Marks gemeinsam in **einem** `<w:r>` (Run-Zusammenführung `docx/writer.ts:52-59`),
   nicht auf getrennte Runs aufgeteilt oder mit Nachbartext vermischt.
4. Fett-Umschaltung „aus" → Export enthält für den Run **kein** `<w:b/>` mehr; Rundreise
   bestätigt „nicht mehr fett".
5. Fetter Text, der einen `hard_break` (Umschalt+Enter) einschließt → Fettung bleibt
   beiderseits des Umbruchs erhalten (der Writer flusht am `hard_break` und öffnet danach
   einen neuen `<w:r>` mit denselben Marks, `docx/writer.ts:60-63`).
6. Reale, komplexe Fremddatei mit Fett über **Direktformatierung** → Fettung bleibt
   sichtbar erhalten oder wird zumindest nicht durch Textverlust verschluckt.
7. Fremddatei mit Fett über **Zeichenformatvorlage** (`w:rStyle`) → siehe Grenzfall 5.8:
   Fettung muss erhalten bleiben (aktuell vermuteter Verlust).

### 6.2 ODT
1. ODT mit einem fetten Wort (`text:span` → automatische Formatvorlage mit
   `fo:font-weight="bold"`) importieren → fett → unverändert exportieren → reimportieren
   → weiterhin fett.
2. Im Editor tippen, „Fett", als ODT exportieren → `content.xml` enthält eine
   automatische Text-Formatvorlage mit `fo:font-weight="bold"` (`style:family="text"`),
   referenziert über `text:style-name` am betroffenen `text:span`.
3. Zwei Textläufe mit **identischer** Markkombination (beide nur fett) → `TextStyleRegistry`
   (`odt/styleRegistry.ts:22-44`) erzeugt **eine** gemeinsame Definition (`T1`), nicht
   zwei; Rundreise bestätigt, dass beide fett bleiben.
4. Fett + Hervorhebungsfarbe kombiniert → eine gemeinsame Stildefinition mit beiden
   Eigenschaften, nicht zwei sich überschreibende `text:span`-Ebenen.
5. Fett-Umschaltung „aus" → Export enthält für den Lauf keine
   `fo:font-weight="bold"`-Referenz mehr (weder eigener noch geerbter Stil).
6. Reale Fremddatei mit Fett über eine **benannte** Formatvorlage in `office:styles`
   bzw. per `style:parent-style-name` vererbt → siehe Grenzfall 5.9: Fettung muss
   erhalten bleiben (aktuell vermuteter Verlust).

### 6.3 Cross-Format (derzeit nur Code-Ebene)
Ein UI-Fluss „DOCX öffnen → als ODT exportieren" existiert **nicht**
(`speichern-unter-format` = fehlt, Abschnitt 0.3). Cross-Format ist daher **nur** über
direkte Reader/Writer-Verkettung zu prüfen und darf **nicht** als E2E-Browser-Test
formuliert werden, solange das Zielformat nicht wählbar ist:
1. `readDocx(writeDocx(doc))` erzeugt das Ausgangs-JSON, dann `readOdt(writeOdt(sameJson))`
   — Fett-Marks an derselben Textposition nach beiden Konvertierungen vergleichen (und
   umgekehrt mit Startpunkt ODT). **Verifizierter Status: aktuell null Abdeckung.** Der
   einzige existierende Cross-Format-Test
   (`shared/__tests__/cross-format-clipboard-content.test.ts`, siehe Abschnitt 1) prüft
   für ein fettes Wort nur die extrahierte Textzeichenkette, nie das Mark selbst — ein
   Writer-/Reader-Fehler, der Fett bei genau dieser Konvertierung verliert, XML aber
   sonst korrekt erzeugt, würde dort **nicht** auffallen. Dieser Testfall ist entweder
   als neuer, eigenständiger Test zu schreiben oder als zusätzliche Mark-Assertion in
   den bestehenden Test zu integrieren — beides ist zulässig, Hauptsache die Lücke
   schließt sich nachweisbar.
2. Sollte `speichern-unter-format` später umgesetzt werden, sind die entsprechenden
   E2E-Rundreisen (DOCX→ODT→DOCX und ODT→DOCX→ODT) hier nachzurüsten.

### 6.4 Unabhängige Validierung (gegen sich gegenseitig aufhebende Reader/Writer-Fehler)
Für mindestens je einen DOCX- und ODT-Export mit Fett zusätzlich zum eigenen Reader:
- DOCX: mit `mammoth` einlesen und prüfen, dass der Ziel-Textlauf als fett erkannt wird,
  **oder** `word/document.xml` gegen die OOXML-Struktur validieren. **Teilweise bereits
  vorhanden:** `docx/__tests__/external-validation.test.ts` tut genau das für ein
  einzelnes fettes Wort (`toContain('<strong>fettem</strong>')`) — für die Abnahme fehlt
  noch die Kombination mit Kursiv/Unterstrichen (Testfall 7.7).
- ODT: `content.xml` mit `xmllint-wasm` gegen
  `tests/fixtures/external/odf-schema/OpenDocument-v1.3-schema.rng` validieren
  (valide + `fo:font-weight="bold"` vorhanden). **Teilweise bereits vorhanden, aber mit
  einer verifizierten Lücke:** `odt/__tests__/external-validation.test.ts` validiert ein
  Dokument mit fetter, verbundener Tabellenzelle gegen exakt dieses Schema — prüft dabei
  aber nur `valid === true` (reine Schema-Konformität), **nicht** ob im erzeugten XML für
  diese Textstelle tatsächlich `fo:font-weight="bold"` steht. Für die Abnahme muss diese
  Inhaltsassertion ergänzt werden (Testfall 7.8), sonst bleibt unbewiesen, dass Fett
  selbst korrekt geschrieben wurde, nur dass irgendein schema-valides Dokument entstand.

---

## 7. Testfälle für die Verifikation (E2E, echte Browser-Bedienung)

**Bereits vorhanden, aber laut Auftrag NICHT vertrauenswürdig** (erneut prüfen, als
unzureichend markieren, erweitern — nicht deren Grün-Zustand übernehmen):
- `docx.spec.ts:69` „types and bolds text" — nur **Maus-Klick**, Assertion nur
  `contains('<w:b/>')` (kein unabhängiger Parser, kein `aria-pressed`).
- `docx.spec.ts:108` Rundreise — dito.
- `docx.spec.ts:253` / `:299` Voll-Coverage-Rundreise `strong` — prüft Import-Rendering,
  nicht die Bedienung.
- `odt.spec.ts:53,89,229,275` — analog, Assertion `contains('font-weight="bold"')`.
- `selection-regression.spec.ts:14,43,61,88` — Fett als Auslöser (Pflicht, siehe 8.5).

**Neu zu schreiben / zu ergänzen** (deckt Abschnitte 3–6 ab, die bisher fehlen):
1. „Fett"-Button per echtem Playwright-Klick auf eine Selektion → sichtbar
   `font-weight: 700` (`getComputedStyle`) **und** `aria-pressed="true"`.
2. Dieselbe Aktion per `page.keyboard.press('ControlOrMeta+b')` statt Klick.
3. **Tastatur-Fokus-Pfad** (Defekt A): `button.focus()` bzw. wiederholt `Tab`, dann
   `Enter` und separat `Space` → Toggle wirkt (aktuell vermutlich rot — dann Defekt A
   beheben, Test grün nachziehen).
4. Fett ohne Selektion aktivieren, tippen → neuer Text fett, Nachbartext nicht; **und**
   Button zeigt sofort nach Aktivierung (vor dem Tippen) `aria-pressed="true"`
   (Defekt B).
5. Fett auf vollständig fette Selektion → entfernt, `aria-pressed` → `false`.
6. Gemischte Selektion (halb fett): Ergebnis gemäß 5.3/Defekt E (nach Fix: **beide**
   Wörter fett, nicht keins — vor dem Fix ist das Gegenteil zu erwarten und als rot zu
   dokumentieren); `aria-pressed` **vor** dem Klick `false` (Defekt B).
7. Fett+Kursiv+Unterstrichen kombiniert, DOCX-Export → **unabhängiger Parser** (mammoth
   bzw. JSZip+DOMParser) prüft alle drei Elemente in **einem** `<w:r>` (6.1.3).
8. Gleicher kombinierter Test für ODT (`content.xml`, ein `text:span` mit einer
   Stildefinition, die alle drei Eigenschaften trägt; ODF-Schema-Validierung 6.4).
9. Undo direkt nach Fett (Klick, dann Strg+Z) → Formatierung weg, Text bleibt; Redo
   stellt sie wieder her.
10. Vollständige Rundreise je Format über **echten** Datei-Upload und **echten**
    Download (`page.waitForEvent('download')`), nicht nur interne Reader/Writer-
    Aufrufe. **Verifizierte Lücke:** Alle heutigen Fett-berührenden Upload-Stellen
    (`docx.spec.ts`, `odt.spec.ts` u. a.) rufen `input.setInputFiles(...)` **direkt**
    auf dem versteckten `<input type="file">` auf und umgehen damit den sichtbaren
    „Datei hochladen"-Button und dessen Klick-Handler vollständig — der reale
    `filechooser`-Event-Pfad wird für „Fett" **nirgends** ausgeführt (ein
    `waitForEvent('filechooser')`-Muster existiert im Repo nur in
    `file-open-edge-cases.spec.ts`, dort nicht fett-bezogen). Für **mindestens
    einen** Rundreise-Test je Format (DOCX **und** ODT) ist deshalb der echte
    Klickpfad Pflicht: `page.waitForEvent('filechooser')` + Klick auf „Datei
    hochladen" statt direktem `setInputFiles`. Die schnelleren `setInputFiles`-Tests
    bleiben für die übrigen Fälle zulässig und ergänzend bestehen.
11. Import-Fixtures für Defekt C (`<w:b w:val="0"/>`, Grenzfall 5.7), Grenzfall 5.8
    (`w:rStyle`), 5.9 (ODT `office:styles`/`parent-style-name`), 5.10 (numerisches
    `font-weight`).
12. 500er-Grenze (5.6): HTML mit `font-weight: 499` vs. `500` einfügen → 499 nicht fett,
    500 fett; zusätzlich `bolder` → dokumentiertes Ergebnis.
13. `getComputedStyle` auf eine `h1` im Editor (Defekt D / 3.5): Ergebnis hier
    nachtragen; Editor- vs. Export-Fettung abgleichen.
14. Cross-Format nur als Unit-/Code-Test (6.3), **nicht** als E2E, solange
    `speichern-unter-format` fehlt.
15. **Browser-Matrix:** Test 2 (Strg+B) zusätzlich auf einem Nicht-Chromium-Projekt
    absichern — aktuell laufen docx/odt-Tests nur auf Chromium (Desktop/Mobile) und
    WebKit (Tablet), **nie auf Firefox** (`playwright.config.ts` beschränkt Firefox auf
    `clipboard.*`). Entweder die Fett-Tastatur auf Firefox mit abdecken oder die
    Nichtabdeckung bewusst dokumentieren.

---

## 8. Abnahmekriterien (Definition of Done)

Der Status „vorhanden" für „Fett" darf erst wieder als **vertrauenswürdig** gelten,
wenn:

1. Alle Testfälle aus Abschnitt 7 tatsächlich ausgeführt (echte Browser-Interaktion,
   nicht nur Unit-/Command-Ebene) und grün sind.
2. Alle Rundreise-Anforderungen aus Abschnitt 6 (DOCX, ODT, Cross-Format auf Code-Ebene)
   durch **erneuten Import** und durch **mindestens einen unabhängigen Validierer**
   (mammoth / xmllint-wasm gegen das ODF-RNG, Abschnitt 6.4) bestätigt sind.
3. Alle Grenzfälle aus Abschnitt 5 einzeln geprüft und ihr tatsächliches Verhalten
   dokumentiert ist (auch „bewusst so gewollt, dokumentiert" ist ein zulässiges
   Ergebnis — Hauptsache nicht mehr unbekannt).
4. Die fünf Defekte A–E aus Abschnitt 4 je einzeln entweder **behoben und mit
   Regressionstest abgesichert** oder als **bewusst akzeptierte Einschränkung
   dokumentiert** sind — kein Punkt bleibt offen. Insbesondere ist die Frage aus 3.5
   (Fett in Überschriften, nach Klärung von Defekt D) explizit beantwortet und das
   Ergebnis hier nachgetragen. Defekt E gilt bereits durch direkte
   Bibliothekscode-Prüfung als real bestätigt (kein „Verdacht") und ist daher
   zwingend zu beheben, nicht nur zu dokumentieren.
5. Der Selection-Sync-Regressionstest (`selection-regression.spec.ts`, alle vier Fett-
   Tests) dauerhaft Teil der Suite bleibt und mit „Fett" als auslösendem Schritt
   weiterhin besteht.
6. Das Icon-Rendering-Risiko (Bedienelement 4 / `FEATURE-SPEC` §20.1) bewertet ist
   (bewusst als CSS-„F" beibehalten oder auf SVG umgestellt, Präzedenz `ScissorsIcon`).
7. Die Cross-Format-Einschränkung (Abschnitt 0.3/6.3) im Backlog sichtbar bleibt, bis
   `speichern-unter-format` umgesetzt ist — „Fett" gilt auch ohne UI-Cross-Format als
   abnahmefähig, sofern die Code-Ebenen-Rundreise (6.3.1) grün ist.

Erst nach Erfüllung aller sieben Punkte darf der Backlog-Status von „vorhanden (nicht
vertrauenswürdig)" auf „verifiziert" geändert werden.
