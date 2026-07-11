# Unterstrichen (einfach) — dateigenauer Umsetzungsplan

Gegenstück zu `specs/unterstrichen-einfach-req.md`. Dieses Dokument beschreibt — nach
tatsächlicher Codelektüre **und tatsächlichem Ausführen der Reader gegen reale
Fixture-Dateien** (nicht nur Quelltext-Inspektion) — was am bestehenden Code zu ändern
ist, welche Dateien neu anzulegen sind, und wie die in der Anforderung geforderte
Verifikation technisch umgesetzt wird.

> **Revisionshinweis (wichtig).** Diese Fassung ist eine **kritische Überarbeitung** eines
> älteren Entwurfs. Der ältere Entwurf war gegen einen **veralteten Stand von
> `src/formats/odt/reader.ts`** geschrieben: seine Zeilennummern lagen durchgängig ~48
> Zeilen daneben, und seine zentrale „kritische" Behauptung (Bug „`<text:a>` wird komplett
> ignoriert, Text verschwindet") ist im **heutigen** Code **nachweislich falsch** — der
> Reader hat inzwischen einen generischen Rekursions-Fallback, und es existieren bereits
> grüne Tests, die genau das belegen (Details unten in 3.5). Außerdem behauptete der
> Entwurf, `FEATURE-SPEC-DOCX-ODT.md` existiere nicht im Repo — sie existiert
> (`E:\docs\FEATURE-SPEC-DOCX-ODT.md`, Repo-Wurzel, nicht `specs/`). Beide Fehler sind
> hier korrigiert. Alle Fundstellen wurden **erneut** direkt gegen den aktuellen Code
> geprüft (Zeilennummern in Abschnitt 2), zwei Reader-Bugs wurden durch **echtes Ausführen**
> reproduziert bzw. widerlegt (Abschnitt 1.1).

> **Revisionshinweis 2 (diese Fassung — kritische Gegenprüfung).** Die vorige Fassung
> (oben) wurde **unabhängig nachvollzogen**, nicht nur gelesen: alle in 1.1 behaupteten
> Probe-Läufe (`Tabelle1.odt`, `bookmarks.docx`, `bug65649.docx`, `52449.docx`) wurden
> erneut per temporärem Vitest-Probe-Test gegen den aktuellen Code ausgeführt und
> reproduzieren **dieselben Kernzahlen**: alle 6 Textvorkommen von „Gomez bewege sich zu
> wenig" in `Tabelle1.odt` kommen ohne `marks` heraus (davon 5 die eigentlichen
> Bug-3.1-Zeugen in den Tabellenzellen mit Stilen P83/P86/P89/P92/P95 — ein sechstes,
> unabhängiges Vorkommen im Fließtext ist schlicht unformatiert und kein Bug-Beleg); bei
> `bookmarks.docx` 0 von 4, bei `bug65649.docx` 0 von 14101, bei `52449.docx` 9 von 41
> Textläufen unterstrichen — die Kernbefunde 3.1/3.2 sind damit doppelt bestätigt.
> Zusätzlich neu ermittelt: `Tabelle1.odt` enthält neben den in der Vorfassung genannten
> P83 (`solid`, zugleich `type="double"`)/P86 (`wave`)/P92 (`dotted`+`bold`) noch **P89**
> (`solid`, `width="bold"` — ein zweiter, unabhängiger Solid-Zeuge auf Absatzstil-Ebene) und
> **P95** (kein Underline — dient als Negativ-Kontrolle). Zusätzlich alle referenzierten
> Zeilennummern in Abschnitt 2 gegen den
> aktuellen Code erneut Zeile für Zeile verglichen (keine Abweichung gefunden). Dabei kamen
> vier weitere, in dieser Fassung neu behobene Mängel zutage:
> 1. **Durchgängig verschobene Abschnittsverweise auf die Anforderung.** Zahlreiche
>    Verweise der Form „Req 3.X" meinten inhaltlich nachweislich Anforderungsabschnitt
>    **4.X** (`Gewünschtes Verhalten im Detail` hat die Unterabschnitte 4.1–4.11 — Abschnitt
>    3 ist nur eine Bedienelement-Tabelle ohne Dezimal-Unterabschnitte), und Verweise der
>    Form „Req 5.X" meinten **Abschnitt 7** (Rundreise-Anforderung) bzw. **Testfall X aus
>    Abschnitt 9** — Abschnitt 5 hat nur die Defekte A–D, keine nummerierten
>    Unterabschnitte. Vermutlich Rest einer älteren Gliederung der Anforderungsdatei, vor
>    Einfügen zusätzlicher Abschnitte stehengeblieben. Alle Fundstellen wurden anhand ihres
>    **Inhalts** (nicht der Zahl) gegen den heutigen `unterstrichen-einfach-req.md` neu
>    zugeordnet und unten korrigiert (u. a. Zeilen zu Farbe/4.8, Paste/4.6,
>    Formatierung-löschen/4.10, Hyperlinks/4.11, Eigenrundreise/7.1.1+7.2.1,
>    Fremddatei-Nachweis/7.4, kombinierte Marks im Run/7.1.3, unabhängige
>    Validierung/Testfall 18).
> 2. **„Testfall 8" statt „Testfall 9" für den Selection-Sync-Regressionstest.** Die
>    Anforderung nummeriert den Pflichttest zu Grenzfall 8 in Abschnitt 9 eindeutig als
>    **Testfall 9** (zwischen Testfall 8 „Fett+Unterstrichen+Farbe" und Testfall 10
>    „Undo/Redo"). Diese Fassung des Plans hatte ihn zweimal (Abschnitt 5.2 und die
>    Abnahme-Mapping-Tabelle) fälschlich „Testfall 8" genannt — der ohnehin schon für die
>    Fett+Farbe-Kombination vergeben ist — und ihn zugleich in der Testfall-Aufzählung
>    „Toolbar & Tastatur" komplett übersprungen (die Liste sprang von TF8 direkt zu TF10).
>    Beides korrigiert, TF9 jetzt explizit aufgeführt.
> 3. **Der `isMarkActive`-Codevorschlag (Fix 3.9/Defekt B) ist für Grenzfall 3
>    (Tabellen-Zellauswahl) selbst fehlerhaft — durch echten ProseMirror-Lauf bewiesen.**
>    Der Entwurf prüfte den Bereichsfall über `state.doc.nodesBetween(state.selection.from,
>    state.selection.to, …)`. Für eine `CellSelection` (mehrere markierte Tabellenzellen)
>    liefern `.from`/`.to` **nicht** die Grenzen der gesamten markierten Zellrechteckfläche,
>    sondern nur die des `head`-Zelle-Bereichs — durch einen konstruierten Vitest-Probe-Test
>    (2×2-Tabelle, nur die Kopf-Zelle der Auswahl unterstrichen, drei andere Zellen der
>    4-Zellen-Auswahl nicht) **empirisch bestätigt**: Der Entwurfscode meldet fälschlich
>    `active = true`, obwohl nur 1 von 4 markierten Zellen unterstrichen ist — ein direkter
>    Verstoß gegen Req 4.4 („keine Anzeige im Widerspruch zum tatsächlichen
>    Toggle-Ergebnis"), weil `toggleMark` (das intern korrekt über
>    `state.selection.ranges` iteriert, siehe unten) in genau diesem Zustand Unterstrichen
>    **hinzufügen** würde. Der Codevorschlag in 3.9 ist unten entsprechend korrigiert (Iteration
>    über `state.selection.ranges` statt `.from`/`.to`).
> 4. **Grenzfall 16 (zusammengesetzter Paste-Wert) verliert nicht nur Unterstrichen, sondern
>    gleichzeitig auch Durchgestrichen** — durch echten `DOMParser.fromSchema(wordSchema)`-Lauf
>    gegen `<span style="text-decoration: underline line-through">` bestätigt: Ergebnis
>    `marks: []` (keines von beiden), während `text-decoration: underline` allein korrekt
>    `marks: ["underline"]` liefert. Ursache liegt in `prosemirror-model`s
>    `matchStyle`/`readStyles` (Exakt-Wert-Vergleich pro CSS-Eigenschaft, kein
>    Teilstring-/Token-Vergleich) und betrifft `underline` **und** `strike` symmetrisch, weil
>    beide Marks dieselbe Regelform `text-decoration=<wert>` verwenden (`schema.ts:171`/`:177`).
>    Bisher nur als „Unterstrichen geht verloren" dokumentiert — unten präzisiert, mit
>    Querverweis auf `specs/durchgestrichen-code.md` (dort ist derselbe Fall aus der
>    Gegenrichtung relevant).
>
> Nicht bestätigt hat sich hingegen eine eigene Vermutung während dieser Prüfung, dass
> `TextStyleRegistry`s `JSON.stringify(props)`-Dedup-Schlüssel (3.4) über eingefügtes HTML mit
> vertauschter Tag-Verschachtelung (`<u><strong>…</strong></u>` vs. `<strong><u>…</u></strong>`)
> heute schon eine falsche Mark-Reihenfolge und damit unterschiedliche Schlüssel erzeugen
> könnte: ein gezielter Probe-Test zeigt, dass **beide** Verschachtelungen dieselbe,
> Rang-sortierte Mark-Reihenfolge `[strong, underline]` ergeben, weil `Mark.setFrom` (von
> `prosemirror-model`, aufgerufen aus `Schema.text()` bei **jeder** Textknoten-Erzeugung,
> auch aus `Node.fromJSON`) Marks unabhängig von Einfüge-/Verschachtelungsreihenfolge
> zwingend nach `type.rank` sortiert. 3.4 bleibt daher wie schon zuvor eingeordnet — reine
> Härtung ohne heute bekannten Auslöser —, jetzt aber mit einem härteren Beleg als zuvor
> (nicht nur „im aktuellen Datenfluss folgenlos" behauptet, sondern die Systemgarantie
> benannt, die das erzwingt).

---

## 0. TL;DR

1. **Schema, Keymap, DOCX-/ODT-Writer, DOCX-/ODT-Happy-Path-Import sind korrekt vorhanden —
   kein Produktivcode-Fix für den „Datenpfad-Normalfall" nötig.** Der Export/Reimport-Pfad
   „Nutzer markiert Text, klickt U, exportiert, reimportiert" funktioniert in beiden
   Formaten; die ODT-Happy-Path-Erkennung (`<text:span>` mit Text-Stil) und der
   DOCX-Lauf-eigene `<w:u w:val="single"/>` wurden **durch Ausführung** bestätigt
   (Abschnitt 1.1). **Ausgenommen der Toolbar-Button** — dessen zwei UI-Defekte (Punkt 8)
   sind Produktivcode-Fixes.
2. **Der weitaus größte Teil des Aufwands sind neue Tests** (E2E + gezielte Unit-Tests
   gegen reale Fixtures). Das war bereits in der Anforderung als Kernlücke benannt
   (Abschnitt 6/7) und bleibt der Schwerpunkt. Die vorhandenen Unterstrichen-E2E-Tests
   sind inhaltlich unzureichend (nur Substring `'<w:u '`, kein ODT-Export-Test, kein
   Tastatur-Test, kein Toggle-aus-/Mischselektions-/Aktiv-Zustands-Test).
3. **Verifizierter Import-Bug (real, reproduziert — Abschnitt 3.1):** Der ODT-Reader liest
   Zeichenformatierung nur aus `style:family="text"`-Stilen. Ist die Unterstreichung — wie
   in realen LibreOffice/OpenOffice-Dokumenten üblich — direkt auf einem
   `style:family="paragraph"`-Stil hinterlegt (Text ohne umschließendes `<text:span>`),
   geht sie beim Import **komplett verloren**. Belegt durch **echten `readOdt()`-Lauf**
   gegen `Tabelle1.odt`: fünf reale Fließtext-Absätze („Gomez bewege sich zu wenig")
   kommen mit `marks = null` heraus, obwohl ihre Absatzstile (P83 **`solid`**, P86 `wave`,
   P92 `dotted`+bold) Unterstreichung tragen. **P83 nutzt `text-underline-style="solid"`
   — also den exakt in-scope-Wert dieser Anforderung**, nicht bloß die out-of-scope-Werte
   `wave`/`dotted`. Empfohlener Fix in Abschnitt 3.1.
4. **Strukturell identische Lücke im DOCX-Reader (Abschnitt 3.2):** Ein `<w:rPr>` direkt
   unter `<w:style>` in `word/styles.xml` (Standard-Zeichenformatierung einer
   Formatvorlage, z. B. „Title" mit Standard-Unterstreichung) wird nie gelesen. **Ehrlich
   eingeordnet:** im vorhandenen Korpus gibt es die Struktur (`bookmarks.docx` → Stil
   „Title" mit `<w:u w:val="single"/>` — verifiziert), aber **keinen** nicht-leeren
   Lauftext, der sich *ausschließlich* darauf verlässt (Import von `bookmarks.docx`/
   `bug65649.docx` ergibt 0 unterstrichene Läufe — verifiziert). Fix daher empfohlen +
   handgebauter Minimaltest, aber niedrigere Dringlichkeit als 3.1.
5. **Kleinere Härtungen** (Groß-/Kleinschreibung `w:val`/`text-underline-style`,
   kanonischer Dedup-Key der `TextStyleRegistry`) sind laut Grenzfall 14/11 sinnvoll, aber
   niedrigprior — im Korpus tritt aktuell kein auslösender Fall auf (verifiziert).
6. **Korrektur des Vorentwurfs:** Der ODT-Reader ignoriert `<text:a>` **nicht** — Text in
   Hyperlinks überlebt den Import (generischer Fallback, Abschnitt 3.5), belegt durch
   bereits grüne Tests (`odt/__tests__/external-fixtures.test.ts`, Block „U-4"). Der
   *tatsächliche* Grund, warum Unterstreichung in den Hyperlink-Fixtures verloren geht, ist
   **nicht** `<text:a>`, sondern unaufgelöste `style:parent-style-name`-Vererbung (der
   benannte Stil „Hyperlink" mit `text-underline-style="solid"` liegt in `styles.xml`
   `<office:styles>`, das der Body-Reader gar nicht lädt) **plus** dieselbe
   Absatzstil-Lücke aus 3.1. Beides ist außerhalb des Scopes, aber korrekt dokumentiert
   statt als „text:a-Bug" fehldiagnostiziert.
7. **Kein neuer Toggle-Command in `commands.ts`.** Toolbar und Keymap rufen beide direkt
   `toggleMark(wordSchema.marks.underline)`; das implementiert die gesamte in
   Anforderungsabschnitt 3 geforderte **Command**-Semantik (Toggle, Selektionserhalt,
   `storedMarks`) bereits. (Neu hinzu kommt lediglich ein reiner Query-Helfer `isMarkActive`
   für die Button-Anzeige, Punkt 8 — kein Toggle-Command.)
8. **Zwei bestätigte UI-Defekte am Toolbar-Button (Req Defekt A/B, „hoch") — Produktivcode-Fix
   nötig, entgegen der Vorfassung dieses Dokuments.** (A/3.8) Der Button ist nur an
   `onMouseDown` gebunden und daher **per Tastatur nicht auslösbar** (Enter/Space feuern nur
   `click`). (B/3.9) `active` liest `$from.marks()` und ignoriert damit `storedMarks` (Button
   bleibt nach Toggle an leerer Schreibmarke fälschlich inaktiv) **und** die Gesamtselektion
   (falsche Anzeige bei gemischter Selektion — **und, empirisch nachgewiesen, auch bei
   mehrzelligen Tabellenauswahlen, Grenzfall 3**: eine naive Bereichsprüfung über
   `.from`/`.to` sieht bei einer `CellSelection` nur die `head`-Zelle, nicht alle markierten
   Zellen). Beide sind durch Codelektüre **und** durch echtes Ausführen bestätigt, treffen
   die gemeinsame `MarkButton` (F/K/U/S) und müssen laut DoD Punkt 2 behoben + mit
   Regressionstest abgesichert werden. Fixes klein und lokal (Abschnitt 3.8/3.9);
   In-Repo-Präzedenz `isAlignActive` existiert.

---

## 1. Methodik dieser Prüfung

Gelesen wurden alle in der Anforderungstabelle genannten Fundstellen im **aktuellen** Code:
`src/formats/shared/schema.ts`, `src/formats/shared/editor/Toolbar.tsx`,
`src/formats/shared/editor/WordEditor.tsx`, `src/formats/docx/writer.ts`,
`src/formats/docx/reader.ts`, `src/formats/docx/xmlUtil.ts`, `src/formats/odt/writer.ts`,
`src/formats/odt/reader.ts`, `src/formats/odt/styleRegistry.ts`, `src/formats/odt/xmlUtil.ts`,
beide `__tests__/roundtrip.test.ts`, beide `__tests__/external-fixtures.test.ts`, beide
`__tests__/external-validation.test.ts`, die relevanten `tests/e2e/*.spec.ts`.

### 1.1 Tatsächlich ausgeführte Verifikation (Beleg statt Annahme)

Um den in Anforderungsabschnitt 7 kritisierten Fehler („Code-Vorhandensein = Funktionieren
angenommen") nicht auf Planungsebene zu wiederholen, wurden temporäre Vitest-Probe-Tests
(jsdom, echter `readOdt()`/`readDocx()`, danach wieder gelöscht) gegen reale Fixtures
gefahren. Ergebnisse (Zahlen = tatsächliche Ausgabe):

| Fixture | Lauf | Ergebnis | Schlussfolgerung |
|---|---|---|---|
| `Tabelle1.odt` | `readOdt()` | „Gomez bewege sich zu wenig" kommt **6×** im Dokument vor, **alle 6 ohne `marks`**; davon 5 die Tabellenzellen-Absätze mit Stilen P83/P86/P89/P92/P95 (Bug-Zeugen bzw. P95 als Negativ-Kontrolle), 1 unabhängiges, korrekt unformatiertes Fließtext-Vorkommen; nur 2 andere Läufe im Dokument (via `<text:span>`) unterstrichen | **Bug 3.1 real** — Absatzstil-Unterstreichung geht verloren |
| `character-styles.odt` | `readOdt()` | „Lorem ipsum" trägt `underline` (Stil T3, `family=text`, `solid`+italic) | Happy-Path ODT **funktioniert** → sauberer Rundreise-Kandidat |
| `UNDERLINE.odt` | `readOdt()` | 1 Lauf „underline", unterstrichen | Happy-Path ODT ok |
| `InvalidUnderlineAttribute.odt` | `readOdt()` | Wert `ImSoInvalid` (≠`none`) → Lauf „underline" **unterstrichen** | Grenzfall 10/14-Fallback **bereits erfüllt** |
| `underlineNone.odt` | `readOdt()` | `text-underline-style="none"` → 0 unterstrichene Läufe | korrektes Negativ-Verhalten |
| `hyperlinkSpaces.odt` | `readOdt()` | 12 Läufe inkl. „Kapitel"; **0 unterstrichen** | Text **überlebt** (widerlegt Vorentwurf-Bug „text:a ignoriert"); Underline verloren wg. `parent-style-name`/Absatzstil (3.5) |
| `52449.docx` | `readDocx()` | 41 Läufe, **9 unterstrichen** („Vedr", „Ans", „ættelse", …) | reale Word-Datei mit Lauf-eigenem `<w:u w:val="single"/>` → **funktioniert**, valider DOCX-Rundreise-Kandidat |
| `bookmarks.docx` / `bug65649.docx` | `readDocx()` | 0 unterstrichene Läufe, obwohl Stil „Title"/„heading 8" ein `<w:rPr><w:u w:val="single"/>` trägt | Bug 3.2 strukturell vorhanden, aber **kein** nicht-leerer Korpus-Zeuge |

Zusätzlich wurden die relevanten Fixture-`content.xml`/`styles.xml`/`document.xml` direkt
entpackt und die Stildefinitionen extrahiert (Belege in Abschnitt 3.1/3.2/3.5).

---

## 2. Ist-Zustand nach Codelektüre — Fundstellen im AKTUELLEN Code

Alle Zeilennummern gegen den heutigen Stand geprüft (der Vorentwurf war hier durchgängig
veraltet). Diese Tabelle deckt sich mit der (neueren, ebenfalls re-verifizierten)
Referenztabelle in `unterstrichen-einfach-req.md` Abschnitt 0.

| Ebene | Datei:Zeile (verifiziert) | Inhalt | Änderung? |
|---|---|---|---|
| Schema-Mark | `src/formats/shared/schema.ts:170-175` | `underline`: `parseDOM:[{tag:'u'},{style:'text-decoration=underline'}]`, `toDOM → ['u',0]` | **keine** |
| Toolbar-Button | `src/formats/shared/editor/Toolbar.tsx:186` | `<MarkButton mark="underline" label="U" title="Unterstrichen" glyphClassName="underline" />`; Reihenfolge F(184)/K(185)/U(186)/S(187) | **keine** |
| Button-Aktiv-Logik | `Toolbar.tsx:69` | `active = markType.isInSet(view.state.selection.$from.marks()) !== undefined` — liest **nur** `$from`, ignoriert `state.storedMarks` und die Gesamtselektion | **Fix 3.9 (Defekt B)** |
| Button-Mechanik | `Toolbar.tsx:76-79` (`onMouseDown`+`preventDefault`→`run(view, toggleMark)`, **kein `onClick`/`onKeyDown`**), `28-31` (`run` mit `view.focus()` Z. 30), Glyph `86` | Selektionserhalt (Grenzfall 15) korrekt, aber per Tastatur (Tab+Enter/Space) **nicht auslösbar** | **Fix 3.8 (Defekt A)** |
| Tastenkürzel | `src/formats/shared/editor/WordEditor.tsx:100` | `'Mod-u': toggleMark(wordSchema.marks.underline)` (Nachbarn `Mod-b`:98/`Mod-i`:99); **korrigiert ggü. der Vorfassung dieses Dokuments, die fälschlich `:92` nannte** — der Kommentarblock oberhalb der Keymap (`:86-92`, Zwischenablage-Hinweis) hat die Zeile nach unten geschoben; deckt sich mit Req Abschnitt 0.1 | **keine** |
| Selection-Sync (Grenzfall 8) | `WordEditor.tsx:43-50` (`reconcileSelectionOnClick`), Kommentar `20-42` | **formatneutral** — deckt Grenzfall 8 für Unterstrichen ohne Codeänderung ab | **keine** |
| DOCX-Export | `src/formats/docx/writer.ts:25` (in `runPropertiesXml` `20-33`) | `mark.type==='underline'` → `<w:u w:val="single"/>`, ohne `w:color` | **keine** (Req 4.8) |
| DOCX-Import | `src/formats/docx/reader.ts:105-106` (in `marksFromRunProperties` `100-115`) | `firstChildNS(rPr,w,'u')` **und** `getAttributeNS(w,'val') !== 'none'` → Mark | Härtung 3.3 + Fix 3.2 |
| DOCX-Stil-Parsing | `docx/reader.ts:53-67` (`parseStylesXml`), Interface `HeadingInfo` `49-51` | liest je Stil **nur** `w:outlineLvl`; ein `<w:rPr>` unter `<w:style>` wird nie gelesen | Fix 3.2 |
| ODT-Export (Mark→Props) | `src/formats/odt/writer.ts:37` (in `runPropsFromMarks` `32-43`) | `underline` → `props.underline = true` | **keine** |
| ODT-Export (Props→XML) | `src/formats/odt/styleRegistry.ts:50-53` (in `buildTextStyleXml` `46-59`) | `style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"` | **keine** (Req 4.8) |
| ODT-Export (Dedup) | `styleRegistry.ts:12-14` (`isEmpty`), `28-39` (`styleNameFor`, Key `JSON.stringify(props)` Z. 30, Zähler `34-35`) | `isEmpty` berücksichtigt `underline`; T1/T2/… je Kombination | Härtung 3.4 |
| ODT-Import (Stil→Style) | `src/formats/odt/reader.ts:54-55` (in `parseAutomaticStyles` `37-78`, Text-Zweig `48-62`) | `text-underline-style` vorhanden **und** `!== 'none'` → `style.underline=true`; **nur für `family==='text'`** | Fix 3.1 + Härtung 3.3 |
| ODT-Import (Style→Mark) | `odt/reader.ts:107` (in `marksFor` `100-112`) | `style.underline` → Mark `underline` | (durch 3.1 mitbetroffen) |
| ODT-Import (Inline-Walk) | `odt/reader.ts:138-168` (`walk`), Span-Fall `146-149`, generischer Fallback `160-167`, `decodeInline`-Start `walk(child, [])` Z. `170` | Absatz-eigener Stil wird **nicht** als Basis herangezogen | Fix 3.1 |
| Unit-Test Rundreise DOCX | `src/formats/docx/__tests__/roundtrip.test.ts:63` | „preserves bold, italic, underline, and strikethrough independently" (konstruiertes JSON) | erweitern (5.1) |
| Unit-Test Rundreise ODT | `src/formats/odt/__tests__/roundtrip.test.ts:65` | analog (Underline-Assertion Z. 83) | erweitern (5.1) |
| ODF-Schema-Validierung | `src/formats/odt/__tests__/external-validation.test.ts:64` | ODT-Run mit `underline` gegen ODF-Schema validiert | vorhanden |
| **DOCX-Schema-Validierung** | `src/formats/docx/__tests__/external-validation.test.ts` — **kein** `w:u`/underline-Fall | verifiziert: kein Treffer | **ergänzen** (5.1) |
| E2E Export (DOCX) | `tests/e2e/clipboard-roundtrip.spec.ts:195-201` | klickt „Unterstrichen", prüft nur Substring `'<w:u '` | **verschärfen** (5.2) |
| E2E Import (DOCX/ODT) | `tests/e2e/docx.spec.ts:301`, `tests/e2e/odt.spec.ts:277` | `.ProseMirror u` „Unterstrichen" Count 1 (hand-erzeugte Fixture) | ergänzen um Rundreise (5.2) |
| E2E-Fixture | `tests/e2e/fixtures/fullCoverageDocument.ts:118` (DOCX `<w:u w:val="single"/>`), `:176` (ODT-Stil `Underline`, `family=text`), `:213` (`<text:span text:style-name="Underline">`) | Basis der Import-E2E-Tests | — |

### 2.1 Zusätzliche Befunde beim Code-Audit (nicht in der Anforderungstabelle)

- **`odt/reader.ts` `parseAutomaticStyles` (37-78):** wertet `<style:text-properties>` nur
  im `family==='text'`-Zweig aus (48-62); der `family==='paragraph'`-Zweig (63-67) liest
  ausschließlich `fo:text-align`. → Wurzel von 3.1.
- **`odt/reader.ts` `readOdt` (357-408):** parst `<office:automatic-styles>` aus
  `content.xml` für den Body (363-364) und aus `styles.xml` **nur für Kopf-/Fußzeile**
  (370-388). Der Container `<office:styles>` (benannte Stile wie „Standard", „Hyperlink")
  wird **nie** gelesen, und `style:parent-style-name` wird **nirgends** aufgelöst. → Wurzel
  der (out-of-scope) Underline-Verluste in Hyperlink-Fixtures (3.5).
- **`docx/reader.ts` `marksFromRunProperties` (100-115):** prüft für `<w:b>`/`<w:i>`/
  `<w:strike>` nur **Existenz** des Elements, nicht `w:val`. Ein reales `<w:b w:val="0"/>`
  würde fälschlich als fett gewertet. **Außerhalb des Scopes** (betrifft `fett`/`kursiv`/
  `durchgestrichen`) — nur `<w:u>` prüft bereits korrekt `!== 'none'`. Hier vermerkt, weil
  der 3.2-Fix denselben Funktionskörper berührt und diese Schwäche **bewusst nicht**
  mitfixt.
- **`schema.ts` `image` (58-85):** ist ein **Block**-Node (`group:'block'`), kein
  Inline-Node. Grenzfall 5 der Anforderung ist so nicht als „inline Node ohne Marks"
  konstruierbar → Testfall-Korrektur 3.6.

---

## 3. Gefundene Defekte / Verbesserungen im bestehenden Code

Reihenfolge nach Aufwand/Kern-Relevanz (hardest/core first): 3.1 und 3.2 sind die
substanziellen Reader-Fixes; 3.3/3.4 sind Härtungen; **3.8 und 3.9 sind die zwei durch
Codelektüre bestätigten UI-Defekte** (Req Defekt A/B, jeweils „hoch") an der gemeinsamen
`MarkButton`-Komponente — kleiner als die Reader-Fixes, aber echte Verhaltensbugs, nicht nur
„zu verifizieren"; 3.5/3.6/3.7 sind Korrekturen/Vermerke.

### 3.1 REAL (reproduziert) — ODT-Reader verliert Zeichenformatierung auf Absatzstil-Ebene

**Nachweis (echter `readOdt()`-Lauf, nicht nur gelesen).** In
`tests/fixtures/external/odt/Tabelle1.odt` steht „Gomez bewege sich zu wenig" fünfmal in
eigenen Tabellenzellen-Absätzen `<text:p text:style-name="P83|P86|P89|P92|P95">` — **ohne**
umschließendes `<text:span>` (ein sechstes Vorkommen im Fließtext, unter einem anderen,
unbeteiligten Absatzstil, ist zum Vergleich korrekt unformatiert und kein Bug-Beleg). Die
fünf referenzierten Stile sind `style:family="paragraph"` und tragen ihre
Zeichenformatierung in einer Geschwister-`<style:text-properties>` (verifiziert per
Entpacken der `content.xml`):

```xml
<style:style style:family="paragraph" style:name="P83" style:parent-style-name="Normal">
  <style:paragraph-properties .../>
  <style:text-properties style:text-underline-style="solid"
    style:text-underline-type="double" style:text-underline-width="auto"/>
</style:style>
<!-- P86: style="wave"; P89: style="solid" width="bold"; P92: fo:font-weight="bold" +
     style="dotted"; P95: keine style:text-properties (kein Underline — Negativkontrolle) -->
<text:p text:style-name="P83">Gomez bewege sich zu wenig</text:p>
```

Der `readOdt()`-Lauf liefert für alle fünf betroffenen „Gomez"-Absätze (P83/P86/P89/P92)
**keine `marks`** — weder `underline` noch (bei P92) `strong`; P95 hat korrekterweise
ebenfalls keine `marks` (dort ist auch nichts zu verlieren). Ursache im Code:
- `parseAutomaticStyles` (`odt/reader.ts:48-62`) liest `<style:text-properties>` nur, wenn
  `family==='text'`; für `family==='paragraph'` (63-67) nur `fo:text-align`.
- `decodeInline` ruft für jedes direkte Kind eines `<text:p>` `walk(child, [])` auf
  (`odt/reader.ts:170`) — der eigene Stilname des Absatzes wird nicht nachgeschlagen.

**In-Scope-Relevanz:** P83 verwendet `text-underline-style="solid"` — den **exakt
in-scope-Wert** dieser Anforderung. Es ist also kein reiner `wave`/`dotted`-Edge-Case,
sondern echter, stiller Verlust einer *einfachen* Unterstreichung in einer realen Datei.
Das Muster „Underline-Default auf Absatzstil" tritt im Korpus mehrfach auf (z. B. P11 in
`hyperlinkSpaces.odt`/`underlineNone.odt` mit `text-underline-style="solid"`, verifiziert).

**Fix (Größenordnung mittel, kein Einzeiler) — `src/formats/odt/reader.ts`:**

1. Auswertung von `<style:text-properties>` in eine wiederverwendbare Funktion
   `runStyleFromTextProperties(props: Element): RunStyle` auslagern (Body aus dem heutigen
   `family==='text'`-Zweig 52-61), damit sie **nicht dupliziert** wird.
2. `parseAutomaticStyles`: für `family==='paragraph'` zusätzlich zur
   `paragraphAligns`-Map eine neue `paragraphCharStyles: Map<string, RunStyle>` befüllen
   (falls eine Geschwister-`<style:text-properties>` existiert).
3. `ParsedStyles`-Interface (23-27) um `paragraphCharStyles: Map<string, RunStyle>`
   erweitern.
4. In `decodeInline(pEl, styles)` **und** im `<text:h>`-Zweig von `elementToBlocks`
   (256-262): den eigenen `text:style-name` des Absatzes/der Überschrift auflösen, die
   daraus abgeleiteten Marks als **Basis** übergeben — `walk(child, baseMarks)` statt
   `walk(child, [])`.
5. **Explicit-Override-Semantik.** Ein `<text:span>`, dessen Text-Stil
   `text-underline-style="none"` setzt, muss eine vom Absatzstil geerbte Unterstreichung
   wieder aufheben können. Der heutige `walk`/`mergeMarks`-Pfad (125-136) kann nur
   **addieren** (innerer Mark ersetzt gleichnamigen äußeren), nicht „explizit aus"
   abbilden. Deshalb `RunStyle.underline` von `boolean|undefined` auf ein Tri-State-Modell
   erweitern, das „nicht angegeben" von „explizit `none`" unterscheidet (z. B. zusätzliches
   Flag `underlineExplicitOff?: boolean`), und die Marks des Absatz-Basisstils mit denen
   des Spans über eine kleine `mergeRunStyle(base, own)`-Regel „eigener Wert gewinnt, falls
   explizit gesetzt, sonst Basiswert" kombinieren, **bevor** daraus Marks gebaut werden.
   Dieselbe Tri-State-Erweiterung für `text-line-through-style` ist konsistent, aber
   **nicht zwingend Teil dieses Tickets** — nur `underline` muss hier korrekt sein.

**Scope-Ehrlichkeit.** Der Fix ist strukturell **mark-übergreifend** (er reaktiviert auch
bold/italic/strike/Farbe auf Absatzstil-Ebene), nicht underline-spezifisch. Das ist
erwünscht (kein Sonderpfad nur für Underline), muss aber im Commit-Text so benannt werden.
Der **primär geforderte** Rundreise-/Fremddatei-Nachweis (Req 7.4) ist bereits **ohne**
diesen Fix erfüllbar, weil der saubere `<text:span>`-Fall (`character-styles.odt`)
funktioniert (verifiziert). 3.1 schließt den *realen Rest-Datenverlust* und ist deshalb
empfohlen, nicht bloß „nice to have".

**Test:** `src/formats/odt/__tests__/underline.test.ts` (5.1): Assertion gegen
`Tabelle1.odt` (die fünf „Gomez"-Absätze tragen nach Fix **≥1 Mark** — Kern ist „irgendeine
Mark statt keine", der konkrete Wave/Dotted/Solid-Wert wird laut Anforderung ohnehin auf
„einfach" vereinfacht) **plus** ein handgebauter Minimalfall mit
`text-underline-style="solid"` exakt auf Absatzstil-Ebene.

### 3.2 Strukturell identisch im DOCX-Reader — stilvererbte `<w:rPr>`-Standardwerte

Word-Formatvorlagen können in `word/styles.xml` direkt unter `<w:style>` ein `<w:rPr>` mit
Standard-Zeichenformatierung tragen, die alle Läufe erben, welche die Formatvorlage
referenzieren und selbst kein abweichendes Element setzen. Verifiziert im Korpus:

| Datei | `w:styleId` | `<w:rPr>`-Fragment |
|---|---|---|
| `bookmarks.docx` | `Title` | `<w:rPr>…<w:u w:val="single"/></w:rPr>` (verifiziert per Entpacken) |
| `bug65649.docx` | `heading 8`, „Subtitle" u. a. | je `<w:rPr>…<w:u w:val="single"/></w:rPr>` |

`parseStylesXml` (`docx/reader.ts:53-67`) liest je Stil nur `w:outlineLvl`;
`marksFromRunProperties` (100-115) wird ausschließlich mit dem `<w:rPr>` **des Laufs**
aufgerufen (`decodeRunElement:171-172`). Kein Codepfad konsultiert die Formatvorlage.

**Nachweisstärke — ehrlich.** Anders als bei `Tabelle1.odt` wurde im Korpus **kein**
nicht-leerer Lauftext gefunden, der sich *ausschließlich* auf einen solchen Default
verlässt: `readDocx('bookmarks.docx')`/`readDocx('bug65649.docx')` liefern **0**
unterstrichene Läufe (verifiziert) — die Title-/Heading-Defaults treffen dort nur leere
Absätze oder ungenutzte Definitionen. Die Lücke ist **strukturell** real und betrifft ein
Standard-Word-Feature, wird aber erst beim nächsten Nutzer-Upload einer eingebauten
Formatvorlage mit Underline-Default (ohne zusätzliches Lauf-`<w:u>`) beobachtbar.

**Fix (analog 3.1, kleinerer Blast-Radius) — `src/formats/docx/reader.ts`:**

1. `HeadingInfo` (49-51) um `defaultRunPropsByStyleId: Map<string, Element>` erweitern;
   `parseStylesXml` merkt je `styleId` das direkte `<w:rPr>`-Kind von `<w:style>`.
2. `paragraphToBlocks` (229-280): den bereits ermittelten `styleId` (237) nutzen, um
   `headingInfo.defaultRunPropsByStyleId.get(styleId)` an `decodeParagraphRuns` →
   `decodeRunElement` → `marksFromRunProperties` durchzureichen.
3. `marksFromRunProperties(rPr, defaultRPr = null)`: **nur wenn** der Lauf selbst kein
   `<w:u>` besitzt, auf `defaultRPr`s `<w:u>` zurückfallen (Lauf-eigenes Element hat
   Vorrang, inkl. `!== 'none'`-Prüfung — so überschreibt `<w:u w:val="none"/>` am Lauf den
   Formatvorlagen-Default). Die `w:val="0"`-Schwäche bei `b/i/strike` (2.1) wird **bewusst
   nicht** mitgefixt.
4. **Dokumentierte Restlücke:** `w:basedOn`-Ketten werden nicht aufgelöst — nur die direkt
   referenzierte Formatvorlage. Für „Title"/„Heading N" (i. d. R. `basedOn="Normal"`, das
   selbst kaum je Underline setzt) ausreichend; mehrstufige Vererbung wäre ein Folge-Ticket.

**Test:** handgebauter Minimaltest in `src/formats/docx/__tests__/underline.test.ts` (5.1):
`styles.xml` mit `<w:style w:styleId="TitleTest"><w:rPr><w:u w:val="single"/></w:rPr></w:style>`,
ein Absatz mit `<w:pStyle w:val="TitleTest"/>` und ein Lauf **ohne** eigenes `<w:u>` →
erwartet `underline`; zweiter Fall mit Lauf-eigenem `<w:u w:val="none"/>` → erwartet **kein**
`underline`.

### 3.3 Groß-/Kleinschreibung normalisieren (Grenzfall 14) — Härtung

`docx/reader.ts:105-106` und `odt/reader.ts:54-55` vergleichen `w:val` bzw.
`style:text-underline-style` als exakten Kleinbuchstaben-String gegen `'none'`. Im gesamten
Korpus sind alle Werte kleingeschrieben (verifiziert) — **kein** beobachtbarer Bug, aber
laut Grenzfall 14 defensiv zu härten (fehlerhafte Drittexporte). Keine Verhaltensänderung
für konforme Dateien:

```ts
// docx/reader.ts (105-106)
const underlineVal = underline?.getAttributeNS(OOXML_NAMESPACES.w, 'val')?.toLowerCase()
if (underline && underlineVal !== 'none') marks.push({ type: 'underline' })
```
```ts
// odt/reader.ts (54-55)
const underline = props.getAttributeNS(ODF_NAMESPACES.style, 'text-underline-style')?.toLowerCase()
if (underline && underline !== 'none') style.underline = true
```

(Aus Konsistenz im selben Funktionskörper auch bei `text-line-through-style` — selbe Zeile,
selbes Commit, nicht Gegenstand dieser Anforderung.)

### 3.4 `TextStyleRegistry` — kanonischer Dedup-Key (Grenzfall 11) — Härtung

`styleRegistry.ts:30`, Key `JSON.stringify(props)` ist objektschlüssel-reihenfolgeabhängig.
Im **aktuellen** Datenfluss nachweislich **folgenlos** — nicht nur behauptet, sondern durch
einen eigenen Probe-Test gegen `prosemirror-model` bestätigt: `Mark.setFrom()` (aufgerufen aus
`Schema.text()` bei **jeder** Textknoten-Erzeugung, auch aus `Node.fromJSON` beim Laden des
Editor-Zustands) sortiert Marks zwingend nach `type.rank`, unabhängig davon, in welcher
Reihenfolge sie erzeugt oder — z. B. beim Einfügen von HTML mit vertauschter
Tag-Verschachtelung wie `<u><strong>…</strong></u>` — durch `DOMParser.fromSchema` addiert
wurden (ein gezielter Test mit vertauschter Verschachtelung ergab in beiden Richtungen
identisch `[strong, underline]`). Die Push-Reihenfolge in `runPropsFromMarks` folgt also nicht
zufällig der Schema-Rang-Reihenfolge, sondern **kann gar nicht anders**, weil ProseMirror das
Mark-Array vor Erreichen von `runPropsFromMarks` bereits kanonisch sortiert hat. Härtung bleibt
trotzdem sinnvoll gegen künftige Aufrufer, die Marks ggf. ohne den Umweg über einen echten
ProseMirror-Knoten direkt als loses Array übergeben. Fix — Key aus fester Feldreihenfolge:

```ts
const key = JSON.stringify([
  props.bold ?? false, props.italic ?? false, props.underline ?? false,
  props.strike ?? false, props.color ?? null, props.highlight ?? null,
])
```

### 3.5 KORREKTUR des Vorentwurfs — `<text:a>` wird NICHT ignoriert

Der Vorentwurf behauptete einen „kritischen Bug": `<text:a>` (Hyperlink) werde vom
ODT-Reader komplett übersprungen, sein Text verschwinde beim Import. **Das ist im heutigen
Code falsch** und wurde durch Ausführung widerlegt:

- `walk()` (`odt/reader.ts:138-168`) hat einen **generischen Rekursions-Fallback**
  (160-167): jedes nicht speziell behandelte Inline-Element (u. a. `<text:a>`) wird in
  seine Kinder hinein weiterverfolgt. `readOdt('hyperlinkSpaces.odt')` liefert 12 Läufe
  inkl. „Kapitel" (verifiziert) — kein Textverlust.
- Es existieren bereits **grüne Tests**, die das belegen:
  `src/formats/odt/__tests__/external-fixtures.test.ts`, Block „U-4" (78-127):
  `Hyperlink-AOO401.odt` → „Hello World!", `hyperlink.odt`/`hyperlink_destination.odt` →
  „abc".

**Warum in diesen Fixtures dennoch keine Unterstreichung ankommt** (korrekte Diagnose): Die
Spans in `hyperlinkSpaces.odt` (`ab92148`, `a30d27d`) haben **leere**
`<style:text-properties/>` und erben via `style:parent-style-name="Hyperlink"`. Der benannte
Stil „Hyperlink" liegt in `styles.xml` `<office:styles>` und trägt dort
`fo:color="#0080C0" style:text-underline-style="solid"` (verifiziert). Der Reader (a) lädt
`<office:styles>` für den Body gar nicht (nur `content.xml`-Automatikstile + `styles.xml`
nur für Kopf-/Fußzeile, `readOdt:363-388`) und (b) löst `style:parent-style-name`
**nirgends** auf. Zusätzlich greift dieselbe Absatzstil-Lücke aus 3.1 (Stil P11).

**Einordnung/Konsequenz:**
- Der Text-Erhalt ist bereits korrekt und getestet — **hier nichts zu tun**.
- Die fehlende `parent-style-name`-/`<office:styles>`-Auflösung ist ein **realer, aber
  eigenständiger** Import-Härtungspunkt, der **außerhalb** von „Unterstrichen (einfach)"
  liegt (er betrifft alle Zeichenmarks gleichermaßen und hängt an Hyperlink-/Named-Style-
  Infrastruktur). Als Vermerk in Abschnitt 9 aufgenommen (DoD Punkt 9: kein Fund ohne
  Ticket), **nicht** in diesem Ticket gefixt.
- Für Rundreise-Tests dieser Anforderung sind die Hyperlink-Fixtures deshalb **weiterhin
  ungeeignet** (ihre Unterstreichung würde erst nach der out-of-scope-Vererbungsauflösung
  ankommen) — aber aus dem **korrekten** Grund, nicht wegen „Textverlust". Kandidaten:
  `character-styles.odt`, `UNDERLINE.odt` (beide verifiziert sauber).

### 3.6 Testfall-Korrektur — Grenzfall 5 (`image`-Selektion)

`image` ist Block-Node (`schema.ts:58-85`), kann nicht innerhalb eines Textlaufs stehen.
Der als „inline Node ohne Marks" beschriebene Grenzfall 5 ist so nicht konstruierbar.
Testbar ist stattdessen: **Selektion von Text bis in einen benachbarten `image`-Block**
(Absatz + Folge-Bild, per Shift über die Blockgrenze). `toggleMark`/`markApplies`
(prosemirror-commands) iterieren generisch über `nodesBetween` und werten `inlineContent`
je Node aus — ohne Codeänderung korrekt; nur der **Test** ist entsprechend zu bauen (5.2).

### 3.7 KORREKTUR des Vorentwurfs — `FEATURE-SPEC-DOCX-ODT.md` existiert

Der Vorentwurf behauptete, die vielfach referenzierte `FEATURE-SPEC-DOCX-ODT.md` fehle im
Repo. **Sie existiert:** `E:\docs\FEATURE-SPEC-DOCX-ODT.md` (Repo-Wurzel, ~31 KB). Der
Vorentwurf hatte nur in `specs/` gesucht. `unterstrichen-einfach-req.md` referenziert sie
korrekt als `E:\docs\FEATURE-SPEC-DOCX-ODT.md`. Auch `tests/e2e/selection-regression.spec.ts`
existiert (deckt den Selection-Sync-Bug ab, aktuell mit „Fett" als Auslöser). **Keine
Doku-Inkonsistenz, keine Code-Konsequenz** — nur Korrektur des falschen Vorbefunds.

### 3.8 Defekt A (Req Abschnitt 5, „hoch") — BESTÄTIGT: Toolbar-Button per Tastatur nicht auslösbar

**Durch Codelektüre bestätigt (kein reiner Verdacht mehr).** `MarkButton`
(`Toolbar.tsx:55-89`) verdrahtet den Toggle ausschließlich über `onMouseDown` (76-79). Ein
natives `<button>` feuert bei Tastatur-Aktivierung (Tab-Fokus → Enter/Leertaste) **kein**
`mousedown`, sondern nur `click`. Der Handler läuft bei Tastaturbedienung also nie → der
„U"-Button (und mit ihm F/K/S, gemeinsame Komponente) ist per Tastatur **nicht** bedienbar.
Strg+U wirkt weiterhin, aber über einen **anderen** Pfad (Keymap, `WordEditor.tsx:100`);
Req-Bedienelement 1 fordert ausdrücklich Maus **und** Tastatur am Button selbst — Verstoß
gegen Barrierefreiheit und Anforderung.

**Fix — `src/formats/shared/editor/Toolbar.tsx` (`MarkButton`):** Toggle nach `onClick`
verschieben; `onMouseDown` behält **nur** `preventDefault()`:

```tsx
onMouseDown={(e) => e.preventDefault()}          // Selektion/Fokus beim Mausklick erhalten
onClick={() => run(view, toggleMark(markType))}  // feuert bei Maus-Klick UND Tastatur (Enter/Space)
```

- **Mausklick:** `mousedown`→`preventDefault()` (Editor behält Fokus/Selektion), danach
  `click`→Toggle→`view.focus()` (`run`, Z. 30). Selektionserhalt (Grenzfall 15) unverändert.
- **Tastatur:** Tab-Fokus + Enter/Space → `click`→Toggle. Kein `mousedown` nötig; da der
  Button beim Tastaturweg ohnehin schon fokussiert ist, ist kein `preventDefault` gebraucht.
- **Grenzfall 6** (schnelles Doppel-Toggle): `onClick` feuert genau einmal pro Klick →
  deterministisch, kein Doppel-Toggle durch Event-Bubbling.

**Scope-Ehrlichkeit.** Der Fix betrifft die **gemeinsame** `MarkButton` → F/K/U/S profitieren
zusammen (erwünscht, kein Sonderpfad nur für U). `AlignButton` (`Toolbar.tsx:91-111`) hat
exakt dasselbe `onMouseDown`-only-Muster (98-101) und damit denselben Defekt, ist aber
**out of scope** (Ausrichtung) — hier nur vermerkt (analog zur `w:val="0"`-Notiz in 2.1),
im selben Zug mitfixbar.

**Test:** neuer Test in `tests/e2e/underline.spec.ts` (Req Testfall 4): Button fokussieren
(`button.focus()` bzw. wiederholt `Tab`), dann `Enter` und **separat** `Space` → Toggle wirkt
(`.ProseMirror u`, `aria-pressed` kippt). Vor dem Fix rot, nach dem Fix grün (DoD Punkt 2:
behoben **und** mit Regressionstest abgesichert).

### 3.9 Defekt B (Req Abschnitt 5, „hoch") — BESTÄTIGT: Aktiv-Zustand ignoriert `storedMarks` und Gesamtselektion

**Durch Codelektüre bestätigt.** `active` (`Toolbar.tsx:69`) =
`markType.isInSet(view.state.selection.$from.marks()) !== undefined`. Zwei Fehler:

1. `$from.marks()` enthält **nicht** `state.storedMarks`. Nach „Unterstrichen an leerer
   Schreibmarke aktivieren" (`toggleMark` setzt `storedMarks=[underline]`) bleibt der Button
   `aria-pressed="false"`, bis das erste Zeichen getippt ist → Widerspruch zu Req 4.3.
2. Geprüft wird nur `$from` (Selektionsanfang), nicht die **gesamte** Selektion. Bei
   gemischter Selektion zeigt `aria-pressed` je nach Startposition falsch an, potenziell im
   Widerspruch zum tatsächlichen Toggle-Ergebnis → Req 4.4.

**Fix — `src/formats/shared/editor/Toolbar.tsx`:** Hilfsfunktion einführen, `active` darüber
berechnen (`active = isMarkActive(view.state, markType)`):

```ts
function isMarkActive(state: EditorState, markType: MarkType): boolean {
  const { empty, $from, ranges } = state.selection
  if (empty) return markType.isInSet(state.storedMarks || $from.marks()) !== undefined
  // "durchgehend": aktiv nur, wenn JEDE Textstelle im Bereich die Mark trägt (Req 4.4) —
  // deckt sich mit dem toggleMark-Ergebnis (2. Klick entfernt nur bei Voll-Abdeckung).
  //
  // WICHTIG: über state.selection.ranges iterieren, NICHT nur über .from/.to. Für eine
  // normale TextSelection ist das gleichwertig (ranges enthält genau ein Element, das
  // .from/.to entspricht). Für eine CellSelection (mehrzellige Tabellenauswahl,
  // prosemirror-tables) liefern .from/.to jedoch NUR den Bereich der head-Zelle, nicht
  // die gesamte markierte Zellrechteckfläche — durch echten ProseMirror-Lauf verifiziert
  // (Grenzfall 3): eine Fassung dieser Funktion, die nur nodesBetween(from, to) prüft,
  // meldet an einer 2×2-CellSelection "aktiv", obwohl nur die head-Zelle (1 von 4
  // markierten Zellen) die Mark trägt — ein direkter Widerspruch zu Req 4.4 und zum
  // tatsächlichen Verhalten von toggleMark, das selbst korrekt über `ranges` iteriert
  // (prosemirror-commands, markApplies/toggleMark). ranges deckt beide Fälle einheitlich ab.
  let sawText = false
  let allMarked = true
  for (const { $from: rFrom, $to: rTo } of ranges) {
    state.doc.nodesBetween(rFrom.pos, rTo.pos, (node) => {
      if (node.isText) {
        sawText = true
        if (!markType.isInSet(node.marks)) allMarked = false
      }
    })
  }
  return sawText && allMarked
}
```

- **Empty-Fall** liest `storedMarks` zuerst → Button sofort aktiv nach Toggle an leerer
  Schreibmarke (behebt Fehler 1, Req 4.2/4.3).
- **Range-Fall** nutzt „every"-Semantik über `state.selection.ranges` statt `$from` (behebt
  Fehler 2, Req 4.4, **und** macht das Ergebnis für `CellSelection` korrekt — siehe
  Revisionshinweis 2 Punkt 3: eine frühere Fassung dieses Vorschlags nutzte hier
  fälschlich nur `.from`/`.to` und wurde durch einen konstruierten Vitest-Probe-Test
  widerlegt). Bewusst **nicht** `doc.rangeHasMark(from, to, type)` (das wäre „any" und
  widerspräche dem Toggle-Ergebnis bei gemischter Selektion — bei „teils unterstrichen"
  wirkt der erste Klick als „Anwenden", der Button darf also **nicht** aktiv aussehen).

**In-Repo-Präzedenz (bislang im Dokument übersehen):** `AlignButton` nutzt bereits
`isAlignActive(view.state, align)` (`Toolbar.tsx:92`, aus `./commands`). Ein zustands-basierter
Aktiv-Helfer ist also etabliertes Muster — `isMarkActive(state, type)` fügt sich konsistent
ein und sollte, wie `isAlignActive`, nach `src/formats/shared/editor/commands.ts` ausgelagert
und dort unit-getestet werden. `EditorState`/`MarkType`-Importe (`prosemirror-state`/
`prosemirror-model`) ergänzen.

**Scope:** gemeinsame `MarkButton` → gilt für F/K/U/S.

**Test:** Req Testfall 5 (nach Strg+U an leerer Schreibmarke `aria-pressed="true"` **vor** dem
Tippen), Testfall 6 (Pfeil in unterstrichenen Text → sofort aktiv) und Testfall 7 (gemischte
Selektion → `aria-pressed` vor Klick nicht fälschlich aktiv) in `tests/e2e/underline.spec.ts`;
**zusätzlich zwingend ein dedizierter Grenzfall-3-Test** (mehrzellige Tabellenauswahl, in der
gezielt **nicht** die zuletzt/"head" markierte Zelle, sondern eine andere Zelle der Auswahl
unterstrichen ist) — ohne diesen Test bliebe die in Revisionshinweis 2 (Punkt 3) belegte
`from`/`to`-Falle unentdeckt, da Testfall 7 (Mischselektion) typischerweise nur einen
einzelnen Textlauf, keine `CellSelection`, konstruiert; optional Unit-Test für `isMarkActive`
analog `isAlignActive`, inkl. eines Falls mit `CellSelection` (jsdom, ohne echten Browser).

---

## 4. Dateigenauer Änderungsplan — bestehende Dateien

| # | Datei | Änderung | Typ | Priorität |
|---|---|---|---|---|
| 1 | `src/formats/odt/reader.ts` | `paragraphCharStyles`-Map + `runStyleFromTextProperties()` auslagern; `decodeInline`/`<text:h>` mit Absatzstil-Basis-Marks; Tri-State-Merge für `underline` (3.1) | **Fix (real)** | Hoch |
| 2 | `src/formats/docx/reader.ts` | `defaultRunPropsByStyleId`-Map in `parseStylesXml`/`HeadingInfo`; `marksFromRunProperties(rPr, defaultRPr)` mit Underline-Fallback; Durchreichen in `paragraphToBlocks`/`decodeRunElement` (3.2) | **Fix (strukturell)** | Hoch |
| 3 | `src/formats/docx/reader.ts` | `.toLowerCase()` beim `w:u`/`w:val`-Vergleich (3.3) | Härtung | Mittel |
| 4 | `src/formats/odt/reader.ts` | `.toLowerCase()` bei `text-underline-style` (und `text-line-through-style`) (3.3) | Härtung | Mittel |
| 5 | `src/formats/odt/styleRegistry.ts` | Kanonischer Dedup-Key in `styleNameFor` (3.4) | Härtung | Niedrig |
| 6 | `src/formats/shared/schema.ts` | **Keine funktionale Änderung.** Optional: Kommentar über `underline`-Mark (Verweis `unterstrichen-doppelt`/Hyperlink-Abhängigkeit, Abschnitt 9) | Doku | Niedrig |
| 7 | `src/formats/shared/editor/Toolbar.tsx` (`MarkButton`) | **Fix (Defekt A, 3.8):** Toggle von `onMouseDown` → `onClick`, `onMouseDown` behält nur `preventDefault()` (Tastatur-Bedienbarkeit). **Fix (Defekt B, 3.9):** `active` via neuem `isMarkActive(state, type)` statt `$from.marks()` (deckt `storedMarks` + Gesamtselektion). Beides betrifft F/K/U/S gemeinsam | **Fix (UI)** | Hoch |
| 7a | `src/formats/shared/editor/commands.ts` | `isMarkActive(state, markType)` auslagern (Präzedenz `isAlignActive`), damit unit-testbar (3.9) | Fix (UI) | Hoch |
| 8 | `src/formats/shared/editor/WordEditor.tsx` | **Keine Änderung** (`Mod-u` + `reconcileSelectionOnClick` formatneutral) | — | — |
| 9 | `src/formats/docx/writer.ts` | **Keine Änderung** (bewusst kein `w:color`, Req 4.8) | — | — |
| 10 | `src/formats/odt/writer.ts` / `styleRegistry.ts` (buildTextStyleXml) | **Keine funktionale Änderung** (Req 4.8) | — | — |

**Kein neuer Command** in `commands.ts` — `toggleMark(wordSchema.marks.underline)` genügt.

### 4.1 Typ-Skizze ODT (zu Punkt 1)

```ts
// odt/reader.ts
interface RunStyle {
  bold?: boolean; italic?: boolean
  underline?: boolean            // "an" (bold/italic/strike/Farbe bleiben boolean|undefined)
  underlineExplicitOff?: boolean // NEU: unterscheidet "nicht angegeben" von "explizit none"
  strike?: boolean; color?: string; highlight?: string
}
interface ParsedStyles {
  textStyles: Map<string, RunStyle>
  paragraphCharStyles: Map<string, RunStyle>   // NEU: Zeichen-Props von family="paragraph"-Stilen
  paragraphAligns: Map<string, string>
  listKinds: Map<string, 'bullet' | 'ordered'>
}
function runStyleFromTextProperties(props: Element): RunStyle { /* Body aus 52-61, + explicit-off */ }
function mergeUnderline(base: RunStyle, own: RunStyle): boolean {
  if (own.underlineExplicitOff) return false
  if (own.underline) return true
  return !!base.underline
}
```
`decodeInline`/`<text:h>` lösen `styles.paragraphCharStyles.get(pEl.style-name)` als
Basis auf und übergeben abgeleitete Marks an `walk(child, baseMarks)`; der Span-Fall
kombiniert Basis + eigenen Stil über die Merge-Regel, bevor Marks gebaut werden.

### 4.2 Typ-Skizze DOCX (zu Punkt 2)

```ts
// docx/reader.ts
interface HeadingInfo {
  outlineLvlByStyleId: Map<string, number>
  defaultRunPropsByStyleId: Map<string, Element>   // NEU: <w:rPr> direkt unter <w:style>
}
function marksFromRunProperties(rPr: Element | null, defaultRPr: Element | null = null) {
  const ownU = rPr && firstChildNS(rPr, OOXML_NAMESPACES.w, 'u')
  const effU = ownU ?? (defaultRPr && firstChildNS(defaultRPr, OOXML_NAMESPACES.w, 'u'))
  const val = effU?.getAttributeNS(OOXML_NAMESPACES.w, 'val')?.toLowerCase()
  if (effU && val !== 'none') marks.push({ type: 'underline' })
  // b/i/strike/color/highlight unverändert aus rPr (kein Default-Fallback in diesem Ticket)
}
```

---

## 5. Neue Dateien / Testerweiterungen

### 5.1 Unit-Tests (Vitest, jsdom)

**Neu: `src/formats/docx/__tests__/underline.test.ts`** — deckt Grenzfall 9/14 (Fremdwerte
`w:val`, inkl. Groß-/Kleinschreibung) und den 3.2-Fix (Formatvorlagen-Default) ab. Hilfs-Zip
analog `tests/e2e/fixtures/fullCoverageDocument.ts` bzw. den bestehenden Reader-Tests.

```ts
describe('DOCX reader: underline w:val (Grenzfall 9/14)', () => {
  it.each([
    ['single', true], ['double', true], ['wave', true], ['dotted', true], ['dash', true],
    ['none', false], ['NONE', false], ['SINGLE', true],
  ])('w:val="%s" → underline mark = %s', async (val, expected) => { /* Lauf-eigenes rPr */ })
})
describe('DOCX reader: underline aus Formatvorlage (3.2)', () => {
  it('Lauf ohne eigenes <w:u> erbt Underline von referenzierter Formatvorlage', async () => { /* styles.xml TitleTest */ })
  it('Lauf-eigenes <w:u w:val="none"/> überschreibt Formatvorlagen-Default', async () => { /* … */ })
})
describe('DOCX reader: farbige Unterstreichung, w:color ignoriert (Grenzfall 17)', () => {
  // <w:u w:val="single" w:color="FF0000"/> — bisher in keinem Test dieses Repos abgedeckt
  // (Grep über docx/__tests__ und tests/e2e/fixtures liefert keinen Treffer für w:color am
  // <w:u>-Element) und in der Anforderung (4.8/Grenzfall 17) als bewusster, zu bestätigender
  // Fidelitätsverlust beschrieben: Unterstrichen bleibt erhalten, die Linienfarbe nicht,
  // weil die `underline`-Mark strukturell gar kein Farb-Attribut besitzt (schema.ts:170-175
  // hat keine `attrs`) — kein Absturz, kein Textverlust, aber auch keine Möglichkeit, die
  // Farbe verlustfrei zu transportieren, selbst wenn man wollte.
  it('w:color am <w:u> hat keinen Einfluss auf die underline-Mark (Wert wird ignoriert)', async () => {
    /* rPr mit <w:u w:val="single" w:color="FF0000"/> → marks enthält { type: 'underline' }
       ohne jedes Farb-Attribut; zusätzlich Kontrollfall ohne w:color liefert identisches
       Ergebnis, um zu belegen, dass der Parameter tatsächlich keine Rolle spielt. */
  })
})
```

**Neu: `src/formats/odt/__tests__/underline.test.ts`** — reale Fixtures + 3.1-Regression.

```ts
describe('ODT reader: reale Underline-Fixtures', () => {
  it('UNDERLINE.odt: solid underline erkannt', ...)              // verifiziert grün ohne Fix
  it('character-styles.odt: "Lorem ipsum" trägt underline', ...) // verifiziert grün ohne Fix
  it('InvalidUnderlineAttribute.odt: nicht-konformer Wert → Fallback underline', ...) // Grenzfall 10/14
  // Grenzfall 10, zweiter Teil (bisher nicht separat getestet): text-underline-type/-width/
  // -color am selben Element werden komplett ignoriert (reader.ts:54-55 wertet
  // ausschließlich text-underline-style aus) — das ist richtig (keine eigenständige
  // Linienfarbe/-dicke wird transportiert, Req 4.8-Analogon), muss aber als Verhalten
  // festgehalten werden statt stillschweigend zu funktionieren.
  it('text-underline-type="double"/text-underline-width/-color werden ignoriert, nur -style zählt', ...)
})
describe('ODT reader: Absatzstil-Ebene (3.1)', () => {
  it('Tabelle1.odt: "Gomez bewege sich zu wenig" trägt nach Fix ≥1 Mark', ...) // rot vor Fix, grün nach Fix
  it('Minimalfall: <text:p style-name> ohne <text:span>, Stil hat solid underline auf Absatzstil-Ebene', ...)
})
```

**Erweiterung: `src/formats/odt/__tests__/roundtrip.test.ts`** — Grenzfall 11 (3.4):
gleiche Markkombination in unterschiedlicher Array-Reihenfolge erzeugt **einen** `T…`-Stil.

**Erweiterung: `src/formats/docx/__tests__/external-validation.test.ts`** — fehlendes
DOCX-Schema-Validierungs-Pendant zu `odt/__tests__/external-validation.test.ts:64`: ein
DOCX mit `underline`-Run exportieren und gegen das OOXML-Schema (bereits genutztes
`xmllint-wasm`) validieren (DoD Punkt 3 / Req Testfall 18).

### 5.2 E2E-Tests (Playwright)

**Neu: `tests/e2e/underline.spec.ts`** — Kernstück. Stil analog `docx.spec.ts`/`odt.spec.ts`/
`selection-regression.spec.ts` (gleiche `odtCard`/`docxCard`-Helfer, echter Upload via
`filechooser`, echter Download via `page.waitForEvent('download')`).

Abschnitt „Toolbar & Tastatur" (Req Abschnitt 9, Testfälle 1–10; Testfall-Nummern hier an
die **Req** angeglichen — die frühere Fassung nummerierte abweichend und referenzierte
versehentlich Code-Abschnitte 3.x statt Req 4.x):
- TF1+2: Klick auf „Unterstrichen" togglet an (`aria-pressed="true"`, `.ProseMirror u`
  enthält den Text) und wieder aus (`aria-pressed="false"`, `u`-Count 0).
- TF3: **Strg+U** (`ControlOrMeta+u`) liefert identisches Ergebnis (aktuell in **keinem**
  E2E-Test abgedeckt).
- TF4 (**Defekt A / 3.8**): Button per **Tastatur** — `button.focus()` bzw. `Tab`, dann
  `Enter` und **separat** `Space` → Toggle wirkt. Vor dem Fix rot.
- TF5 (**Defekt B / 3.9**): Cursor ohne Selektion, Strg+U → **vor** dem Tippen bereits
  `aria-pressed="true"` (storedMarks), danach getippter Text unterstrichen, umgebender Text
  unverändert (Req 4.2/4.3).
- TF6 (**Defekt B / 3.9**): Cursor per Pfeiltasten in bereits unterstrichenen Text (keine
  neue Aktion) → Button sofort aktiv (Req 4.3).
- TF7 (**Defekt B / 3.9**): gemischte Selektion (teils unterstrichen) → `aria-pressed`
  **vor** dem Klick nicht fälschlich aktiv, Toggle-Verhalten gemäß Req 4.4; zusätzlich
  reine-Leerzeichen-Selektion (Grenzfall 4) → keine JS-Exception, konsistenter Zustand.
- TF8: Fett + Unterstrichen + Schriftfarbe gleichzeitig sichtbar und unabhängig entfernbar
  (Req 4.5).
- **TF9 (Grenzfall 8, Pflichttest) lebt bewusst nicht hier**, sondern dauerhaft in
  `tests/e2e/selection-regression.spec.ts` (siehe unten) — im bestehenden `describe`, damit er
  nicht in einer separaten, leicht vergessbaren Datei isoliert wird. Nur zur Vollständigkeit
  der Testfall-Zählung hier vermerkt, damit die Lücke zwischen TF8 und TF10 nicht wie ein
  vergessener Test aussieht.
- TF10: Undo/Redo über Sequenz Tippen → an → aus → Tippen, jeder Schritt einzeln (Req 4.9).
- Grenzfälle 1/2/3/5(korrigiert 3.6)/6/7/15: je ein dedizierter Test. **Grenzfall 3**
  (Tabellen-Zellauswahl) ist hier nicht nur „ein Test unter vielen" — er ist der einzige
  Nachweis, dass die neue `isMarkActive`-Bereichslogik (3.9) tatsächlich über
  `state.selection.ranges` und nicht nur über `.from`/`.to` geht (siehe Revisionshinweis 2,
  Punkt 3): Test baut bewusst eine Tabelle, in der **nicht** die `head`-Zelle der Auswahl,
  sondern eine andere markierte Zelle unterstrichen ist, und prüft `aria-pressed` sowie das
  tatsächliche Toggle-Ergebnis gegeneinander.
- **Neu, bisher in keiner Fassung dieses Plans geplant:** Req 4.7 (Verhältnis zu
  Überschriften) als eigener Test — Text in einer `heading`-Node markieren, Unterstrichen
  umschalten → im Editor sichtbar (kein Stil überlagert es weg), Export nach DOCX **und**
  ODT enthält die Mark als reine Lauf-Formatierung (nicht als Teil von `HEADING_STYLE_ID`
  bzw. `headingStyleDefs()`), Rundreise erhält sie, die Überschriften-Formatvorlage selbst
  bleibt unverändert (kein zusätzliches `<w:u>`/`text-underline-style` auf Stil-Ebene). Ohne
  diesen Test bliebe der in Req 4.7 explizit verlangte Klärungspunkt (DoD 6) unbeantwortet.

Abschnitt „Rundreisen" (Req 7): DOCX-Eigenrundreise, ODT-Eigenrundreise (**fehlt heute
komplett**), Cross-Format DOCX→ODT und ODT→DOCX, doppelte Cross-Format-Rundreise; Export
verschärft auf `/<w:u\s+w:val="single"\s*\/>/` bzw.
`style:text-underline-style="solid"` **am richtigen Run**; kombiniert fett+farbig+
unterstrichen bleibt in einem `<w:r>` erhalten (Req 7.1.3).

**Verschärfen: `tests/e2e/clipboard-roundtrip.spec.ts:201`** — `expectedXml: '<w:u '` →
`w:val="single"` (Testfall 11), plus Prüfung, dass kein anderer Run fälschlich betroffen ist.

**Erweiterung: `tests/e2e/selection-regression.spec.ts`** — neuer Test im bestehenden
`describe` mit „Unterstrichen" statt „Fett" als Auslöser (Grenzfall 8 / **Testfall 9** — nicht
Testfall 8, der ist bereits für „Fett + Unterstrichen + Schriftfarbe" vergeben, siehe
Revisionshinweis 2, Punkt 2; dauerhaft in der Suite verankert, nicht in einer separaten leicht
vergessbaren Datei).

**Erweiterung: Paste (Req 4.6 / Grenzfall 16)** — `<u>`-HTML und
`text-decoration: underline` → als Unterstrichen erkannt; `text-decoration: underline
line-through` → dokumentiertes Ergebnis nachweisen: **verifiziert geht dabei nicht nur
Unterstrichen, sondern zugleich auch Durchgestrichen verloren** (`marks: []` statt
`marks: ['underline']`/`['strike']`), weil sowohl `schema.ts:171` (`underline`) als auch
`schema.ts:177` (`strike`) exakt `text-decoration=<einzelwert>` matchen und
`prosemirror-model`s `matchStyle` einen reinen Exakt-Wert-Vergleich macht (kein
Teilstring-/Token-Vergleich über die einzelnen space-separierten `text-decoration`-Werte).
Test muss **beide** Marks als abwesend prüfen, nicht nur `underline` — sonst wird die
tatsächliche Tragweite des dokumentierten Fallbacks unterschätzt. Cross-Ref:
`specs/durchgestrichen-code.md` sollte denselben Fall aus Sicht von „Durchgestrichen"
gegenspiegeln, falls dort bisher nur „Unterstrichen geht verloren" vermerkt ist.

---

## 6. Fixture-Inventar — verifizierte Werte (nicht nur Dateinamen)

Ermittelt durch tatsächliches Entpacken von `tests/fixtures/external/{docx,odt}` (202 ODT,
127 DOCX) und Extraktion der `w:u`- bzw. `text-underline-style`-Werte, ergänzt um echte
`readDocx()`/`readOdt()`-Läufe (Abschnitt 1.1).

**DOCX:**
- `w:val="single"` (Lauf-eigen, nicht-leerer Text): **`52449.docx`** — verifiziert 9
  unterstrichene Läufe („Vedr", „Ans", „ættelse", …). **Empfohlener „echte Fremddatei"-
  Rundreise-Kandidat (Req 7.4 / Testfall 18, DOCX).**
- Formatvorlagen-Default `<w:u w:val="single"/>` in `styles.xml`: `bookmarks.docx` („Title"),
  `bug65649.docx` („heading 8"/„Subtitle") — **importieren heute 0 unterstrichene Läufe**
  (verifiziert), taugen erst **nach** dem 3.2-Fix als Regressionsfixtures, nicht als
  alleinige Testquelle davor.
- Kein `double`/`wave`/`dotted`/`dash` im DOCX-Korpus → Grenzfall 9 über handgebautes XML
  (5.1).

**ODT:**
- `solid` sauber via `<text:span>` (`family="text"`): **`character-styles.odt`** („Lorem
  ipsum", solid+italic — verifiziert grün), `UNDERLINE.odt` (solid **und** none). **Empfohlene
  Rundreise-Kandidaten (Req 7.4, ODT).**
- `solid`/`wave`/`dotted` auf **Absatzstil-Ebene** (`family="paragraph"`, betrifft 3.1):
  `Tabelle1.odt` — verifiziert fünf betroffene Absatzstile: **P83** (`solid`, zusätzlich
  `type="double"` — für den Import bleibt nur `style` maßgeblich, s. Abschnitt 2 der
  Anforderung, also weiterhin der **exakte in-scope-Fall** „einfach"), **P86** (`wave`),
  **P89** (`solid`, `width="bold"` — zweiter, unabhängiger Solid-Zeuge auf Absatzstil-Ebene),
  **P92** (`dotted` + `font-weight:bold`), **P95** (kein Underline — dient als Negativ-Kontrolle,
  da „Gomez"-Text hier NICHT unterstrichen werden darf) — **Primär-Regressionsfixture für
  3.1**, P11 in `hyperlinkSpaces.odt`/`underlineNone.odt`.
- `ImSoInvalid` (nicht-konform): `InvalidUnderlineAttribute.odt` — **Primärtest Grenzfall
  10/14** (Fallback bereits erfüllt, verifiziert).
- `none`: `underlineNone.odt` (verifiziert 0 unterstrichen), u. a.
- **Hyperlink-Fixtures NICHT als Underline-Rundreise-Kandidaten** (`hyperlinkSpaces.odt`,
  `hyperlink.odt`, `Hyperlink-AOO401.odt`, `hyperlink_destination.odt`,
  `hyperlinkSpacesNoUnderline.odt`) — Grund: Underline via unaufgelöster
  `parent-style-name`-Vererbung (3.5), **nicht** Textverlust (Text überlebt, ist getestet).

---

## 7. Unabhängige Parser-Validierung (Req Testfall 18 / DoD Punkt 3)

Repo ist reines TypeScript/Vite, aber **`xmllint-wasm` ist bereits Dev-Dependency** und wird
in `*/external-validation.test.ts` genutzt. Zweistufig:
1. **Automatisiert:** Playwright-Export-Tests (5.2) prüfen den exportierten XML-String per
   Regex **ohne** `readDocx`/`readOdt` (`/<w:u\s+w:val="single"\s*\/>/` bzw.
   `style:text-underline-style="solid"`) — unabhängig vom eigenen Reader. Ergänzend
   Schema-Validierung des DOCX-Exports via `xmllint-wasm` (neuer Test 5.1), als Pendant zum
   vorhandenen ODT-Validierungstest.
2. **Manuell, einmalig vor Statuswechsel:** exportierte DOCX mit `python-docx` bzw. ODT mit
   LibreOffice öffnen und Ergebnis in `unterstrichen-einfach-req.md` (oder Nachfolgedatei)
   vermerken. **Bewusst nicht** in CI (keine Python-Laufzeit einführen).

---

## 8. Bewusst nicht geänderter Code (und warum)

- **`schema.ts` Mark-Definition** — deckt genau „einfach" ab, keine Varianten-Attribute,
  keine Verwechslung mit `unterstrichen-doppelt` auf Datenebene.
- **`Toolbar.tsx` — nur Glyph/Label bleibt:** bewusst weiter CSS-„U"
  (`<span className="underline">U</span>`, Z. 86), **kein** SVG (DoD Punkt 7: Beibehaltung
  dokumentiert; SVG-Präzedenz `ScissorsIcon` existiert, erst bei „Unterstrichen (doppelt)"
  zur Abgrenzung nötig). Der `preventDefault()`-Selektionserhalt (Grenzfall 15) bleibt durch
  den 3.8-Fix erhalten. **Achtung — nicht mehr „unverändert":** Der Toggle-Handler
  (`onMouseDown`→`onClick`, 3.8) und die `active`-Logik (`isMarkActive`, 3.9) **werden**
  geändert; siehe Abschnitt 3.8/3.9 und Tabelle 4.
- **`WordEditor.tsx`** — `reconcileSelectionOnClick` ist generisch/formatneutral →
  Grenzfall 8 bereits durch Code abgedeckt, nur Test (+ Regressionstest-Erweiterung) fehlt.
- **`docx/writer.ts` / `odt/writer.ts` / `buildTextStyleXml`** — Req 4.8 (keine explizite
  Linienfarbe; Linie folgt Textfarbe) bereits korrekt. Writer erzeugen **nie**
  Absatzstil-Ebene oder `<text:a>` — 3.1/3.5 sind reine **Import**-Themen für Fremddateien
  und berühren die Eigenrundreise (Req 7.1.1/7.2.1) nicht.
- **`prosemirror-commands` `toggleMark`** — Mischselektion (Req 4.4), leere Selektion/
  `storedMarks` (Req 4.2), `CellSelection`-`ranges` (Grenzfall 3, **aber**: nur `toggleMark`
  selbst iteriert bereits korrekt über `state.selection.ranges` — der **Anzeige**-Helfer
  `isMarkActive` musste dafür in 3.9 erst extra korrigiert werden, siehe Revisionshinweis 2
  Punkt 3; ohne diese Korrektur wäre die Anzeige, nicht das Toggle, für Tabellenauswahlen
  falsch gewesen): Fremdbibliotheks-Standardverhalten für das Toggle selbst, nur zu
  **verifizieren**, nicht zu implementieren.

---

## 9. Offene Abhängigkeiten (nur dokumentieren, kein Code jetzt)

- **`formatierung-loeschen`** (Status „fehlt"): muss künftig `wordSchema.marks.underline`
  in seine Clear-Logik aufnehmen (Req 4.10).
- **Hyperlinks** (Status „fehlt"): (a) Entscheidung, ob Link-Default-Unterstreichung
  dieselbe `underline`-Mark wiederverwendet (Interferenz mit „U"-Button) oder rein via
  CSS/`toDOM` (Req 4.11); (b) **`style:parent-style-name`-/`<office:styles>`-Auflösung im
  ODT-Reader** (3.5) — heute nicht aufgelöst, wodurch Underline aus benannten Stilen wie
  „Hyperlink" verloren geht; bei Hyperlink-Umsetzung mitzufixen. Vermerk in
  `specs/hyperlink-einfuegen-req.md` empfohlen.
- **`unterstrichen-doppelt`**: sobald umgesetzt, Entscheidung neue Mark vs. `style`-Attribut
  auf `underline`; dann Reader/Writer (3.1/3.2) erneut anfassen, um
  `wave`/`double`/`dotted`/`dash` differenziert statt (wie hier bewusst) auf „einfach"
  vereinfacht zu behandeln.
- **`w:val="0"`/`"false"`-Schwäche bei `<w:b>`/`<w:i>`/`<w:strike>`** (2.1): betrifft
  `fett`/`kursiv`/`durchgestrichen`, nicht diese Anforderung — Vermerk, damit es bei den
  Nachbar-Anforderungen nicht übersehen wird.

---

## 10. Abnahme-Mapping (Req Abschnitt 5/6/7/9/10 → Testartefakt)

Trotz des Titels („6/8" in einer Vorfassung) deckt die Tabelle tatsächlich breiter ab: die
Defekte aus Abschnitt 5, die Grenzfälle aus Abschnitt 6, die Rundreise-Anforderung aus
Abschnitt 7, die Testfälle aus Abschnitt 9 und die Abnahmekriterien (DoD) aus Abschnitt 10 —
Abschnitt 8 selbst („Warum die vorhandenen Tests nicht genügen") ist reine Begründung ohne
eigene abzuhakende Punkte und taucht hier nur indirekt über Defekt C/D auf.

| Anforderung | Abgedeckt durch |
|---|---|
| Testfälle 1–10 (Req Abschnitt 9) | `tests/e2e/underline.spec.ts`, „Toolbar & Tastatur" |
| **Defekt A** (Button-Tastaturbedienung) | Fix 3.8 + `tests/e2e/underline.spec.ts` Tastatur-Aktivierungstest (Req Testfall 4) |
| **Defekt B** (Aktiv-Zustand: `storedMarks` + Gesamtselektion, **inkl. `CellSelection`-Korrektur**) | Fix 3.9 (`ranges`-basiert, nicht `.from`/`.to`) + E2E Testfall 5/6/7 + dedizierter Grenzfall-3-Test (+ optional `isMarkActive`-Unit-Test inkl. `CellSelection`-Fall) |
| **Defekt C** (schwache Export-Assertion) | verschärfte `clipboard-roundtrip.spec.ts` (5.2, Testfall 11) + `underline.spec.ts`-Export (`w:val="single"` am richtigen Run) |
| **Defekt D** (fehlende DOCX-Schema-Validierung) | neuer Fall in `docx/__tests__/external-validation.test.ts` (`xmllint-wasm`, 5.1) |
| Testfall 9 / Grenzfall 8 (Selection-Sync) | `tests/e2e/selection-regression.spec.ts`, neuer „Unterstrichen"-Test |
| Rundreise 1–8 (Req 7) | `tests/e2e/underline.spec.ts`, „Rundreisen" (echter Upload/Download) |
| Grenzfälle 1–8, 12, 13, 15 | `tests/e2e/underline.spec.ts`, je dedizierter Test (Grenzfall 3 zusätzlich als Regressionstest für die `isMarkActive`-`CellSelection`-Korrektur, siehe Defekt B) |
| Grenzfall 9 (DOCX Fremdwerte) | `src/formats/docx/__tests__/underline.test.ts` (`it.each`) |
| Grenzfall 10 (ODT Fremdwerte) | `src/formats/odt/__tests__/underline.test.ts` (`InvalidUnderlineAttribute.odt`) |
| Grenzfall 11 (Stilnamen-Kollision) | `odt/__tests__/roundtrip.test.ts` neuer Test + Fix 3.4 |
| Grenzfall 14 (Groß-/Kleinschreibung) | beide `underline.test.ts` (`it.each`) + Fix 3.3 |
| Grenzfall 16 (zusammengesetzter Paste-Wert) | Paste-Test (5.2) — dokumentierter Verlust **beider** Marks (Underline **und** Strike, verifiziert), nicht nur Underline |
| Grenzfall 17 (DOCX-Import farbiger Unterstreichung, `w:color`) | `docx/__tests__/underline.test.ts`, neuer Fall (5.1) — **fehlte bisher komplett in diesem Plan**, obwohl DoD 5 ihn namentlich verlangt |
| **Real (3.1) — ODT Absatzstil-Ebene** | `Tabelle1.odt`-Test + Minimalfall, Fix 3.1/4.1 |
| **Strukturell (3.2) — DOCX Formatvorlagen-Default** | handgebauter Test, Fix 3.2/4.2 |
| Korrektur (3.5) — `<text:a>` NICHT ignoriert | bereits grün: `odt/__tests__/external-fixtures.test.ts` „U-4" |
| DoD 1 (alle Testfälle automatisiert + grün) | Abschnitt 5.1/5.2 zusammen (Unit- + E2E-Suite) |
| DoD 2 (vier Defekte behoben/dokumentiert, insbes. C verschärft + Testfall 12 ergänzt) | Fix 3.8/3.9 (Defekt A/B) + verschärfte Assertion (Defekt C) + neuer ODT-Export-Test (Defekt C/Testfall 12, Abschnitt 5.2) + DOCX-Schema-Test (Defekt D, DoD 3) |
| DoD 3 (unabhängiger Parser / DOCX-Schema-Validierung) | `docx/__tests__/external-validation.test.ts` (neu, `xmllint-wasm`) + `52449.docx`/`character-styles.odt` |
| DoD 4 (Regressionstest verankert) | `selection-regression.spec.ts` |
| DoD 5 (Fallback dokumentiert, insbes. Grenzfälle 9/10/14/16/17) | Abschnitte 3.1/3.3/6 + Testkommentare + neuer Grenzfall-17-Test (s. o.) |
| DoD 6 (offene Klärungspunkte 4.2/4.6/4.7 beantwortet) | 4.2: Abschnitt 5.2 (storedMark-Toggle ohne Tippen erzeugt keine Transaktion, kein Undo-Schritt — Fremdbibliotheksverhalten, nur zu bestätigen); 4.6: Paste-Test + diese Fassung (beide Marks betroffen); 4.7: Grenzfall-Test „Unterstrichen in Überschrift" (Abschnitt 5.2/Grenzfälle) |
| DoD 7 (Icon-Rendering-Risiko bewertet) | Abschnitt 8 — bewusst CSS-„U" beibehalten, SVG-Präzedenz vermerkt |
| DoD 8 (Cross-Format-Einschränkung bleibt sichtbar) | Abschnitt 9 (`speichern-unter-format`-Abhängigkeit) + Req Abschnitt 0.2/7.3 unverändert referenziert |
| DoD 9 (kein Fund ohne Vermerk) | 2.1 (Audit) + 3.1/3.2 (Fixes) + 3.5 (`parent-style-name`) + 9 (Abhängigkeiten) |
