# QA-Testplan: „Seitenumbruch einfügen"

Rolle dieses Dokuments: Testplan der QA-Instanz, nicht des Dev-Plans selbst. Geprüft gegen
`E:\docs\specs\seitenumbruch-req.md` (Soll-Zustand, Grenzfälle, Rundreise-Anforderung) und
`E:\docs\specs\seitenumbruch-code.md` (Umsetzungsplan, Stand 2026-07-04). Zusätzlich gegen den
tatsächlichen Repo-Code verifiziert: Feature ist **noch nicht implementiert** (`grep -r
"insertPageBreak|breakBefore|pm-page-break" src` liefert keinen Treffer) — dieser Plan ist also
vor/während der Umsetzung zu schreiben und nach Implementierung 1:1 auszuführen, nicht blind auf
den im Code-Plan bereits vorgeschlagenen Testfällen (Abschnitt 14 dort) zu vertrauen, sondern
diese zu verifizieren, zu ergänzen und wo nötig zu widerlegen.

Zwei verpflichtende, **getrennte** Testebenen, wie vom Auftrag gefordert:

1. **Unit-Tests Reader/Writer-Rundreise** (DOCX + ODT) — Vitest, direkter Aufruf von
   `writeDocx`/`readDocx`/`writeOdt`/`readOdt` und der neuen Commands, ohne Browser.
2. **ECHTE Playwright-Browser-Tests** — echte Klicks, echtes Tippen über `page.keyboard`,
   echter Datei-Upload über `input.setInputFiles(...)`, echter Download über
   `page.waitForEvent('download')` **und anschließende Inspektion der heruntergeladenen Datei**
   (JSZip gegen die reale ZIP/XML-Struktur) — **nicht** nur Aufrufe interner
   TypeScript-Funktionen innerhalb eines Browser-Kontexts.

Als **dritte, querschnittliche** Pflichtvorgabe (vom Auftrag ausdrücklich verlangt) gilt für die
gesamte E2E-Ebene **Determinismus**: keine Race-Conditions durch zu schnelle Tastatureingaben,
Selektions-Sync stets abgewartet. Dieses Repo hat diesen Fehlerkanal real und wiederholt getroffen;
Abschnitt 0.3 belegt ihn, Abschnitt 2.1.1 macht die Gegenmaßnahmen verbindlich, und Abschnitt 4
führt Determinismus als eigenes Abnahme-Gate.

Referenz-Infrastruktur im Repo, gegen die tatsächlichen Dateien verifiziert (nicht aus dem
Code-Plan übernommen): `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`,
`tests/e2e/selection-regression.spec.ts` (Helper `docxCard(page)`/`odtCard(page)`, Muster
„echter Download → `download.path()` → `fs.readFile` → `JSZip.loadAsync` → String-Prüfung gegen
`word/document.xml`"), `src/formats/docx/__tests__/roundtrip.test.ts` und
`.../external-fixtures.test.ts` (Vitest, `describe`/`it`), analog für ODT. Test-Runner:
Vitest (Unit) + Playwright (E2E) — beide bereits im Repo eingerichtet, keine neue Tooling-Wahl
nötig.

---

## 0. Kritische Vorab-Befunde am Umsetzungsplan (vor Testausführung zu klären)

Diese zwei Punkte wurden beim Gegenlesen von `seitenumbruch-code.md` gefunden und **müssen**
vor bzw. während der Implementierung berücksichtigt werden — sie sind keine Spitzfindigkeiten,
sondern beeinflussen direkt, welche Testfälle in Abschnitt 3/4 unten als **Pflicht,
scharf formuliert** aufgenommen wurden.

### 0.1 Verdacht auf Datenverlust-Bug in der geplanten `paragraphToBlocks` (DOCX-Reader, code.md Abschnitt 9.3)

Der im Code-Plan gezeigte Pseudocode (Abschnitt 9.3) verliert nach eigener Durchrechnung
**stillschweigend den Textinhalt genau des Absatzes, der den Umbruch trägt**, sobald der
`w:type="page"`-Run **nicht** der letzte, sondern (wie beim eigenen DOCX-**Export** dieser App
laut Abschnitt 8 des Code-Plans!) der **erste** Run des Absatzes ist:

- Der geplante Writer (Abschnitt 8) erzeugt für einen Absatz mit `breakBefore: true` und Inhalt
  „Hallo" genau ein `<w:p>`: `<w:p>…<w:r><w:br w:type="page"/></w:r><w:r><w:t>Hallo</w:t></w:r></w:p>`
  — der Umbruch-Run steht **vor** dem eigentlichen Text, **in demselben** `<w:p>`.
- Durchgerechnet gegen den geplanten `paragraphToBlocks` (Abschnitt 9.3): Run 1 (`pageBreak`)
  löst `flush()` auf leerem Puffer aus (kein Effekt außer Reset) und setzt danach
  `pendingBreakBefore = true`. Run 2 (`text: "Hallo"`) landet nur im Zwischenpuffer `buffer`.
  Am Schleifenende gilt `endsWithPageBreak = pendingBreakBefore = true` — **weil dieser Wert
  nie zurückgesetzt wurde, obwohl `buffer` nicht leer ist**. Wegen `if (!endsWithPageBreak)
  flush()` wird der finale `flush()` **übersprungen** — der Text „Hallo" erscheint in **keinem**
  zurückgegebenen Block. `blocks` ist leer, `endsWithPageBreak: true` wird nach außen gemeldet,
  als hätte der Absatz nur aus dem Umbruch bestanden.
- Das ist exakt der **Normalfall** von Anforderung 3.1/Grenzfall 7: Nutzerin tippt „AAABBB",
  setzt den Cursor zwischen „AAA"/„BBB", drückt Strg+Enter → zwei Absätze „AAA" und „BBB",
  „BBB" trägt `breakBefore: true` und weiteren eigenen Text. Beim Export/Reimport genau dieses
  Absatzes ginge „BBB" nach dieser Durchrechnung vollständig verloren — ein direkter Verstoß
  gegen die Rundreise-Anforderung (Abschnitt 5.2 der Req-Datei: „Inhalt davor/danach
  unverändert").
- Der im Code-Plan selbst referenzierte reale Beleg (`saut_page.docx`, Zusatzbefund 0.3) hat den
  Umbruch-Run **als letzten** Run des Absatzes — dort tritt der Bug **nicht** auf (siehe
  Durchrechnung unten in 3.4), weshalb er beim alleinigen Testen gegen diese eine Fixture
  **unentdeckt** bliebe.

**Konsequenz für diesen Testplan:** Abschnitt 3.3 unten enthält einen expliziten, hart
formulierten Pflicht-Testfall (`UT-DOCX-RT-BREAK-OWN-TEXT`) genau für diese Konstellation
(Umbruch-Run **vor** Text **im selben** Absatz). Dieser Test ist **vor** allen anderen
DOCX-Rundreise-Tests zu schreiben und auszuführen; schlägt er fehl, ist das Feature **nicht**
abnahmefähig, unabhängig davon, ob die im Code-Plan Abschnitt 14.1 selbst vorgeschlagenen Tests
grün sind (diese prüfen laut dortigem Wortlaut nur, dass „`breakBefore` exakt erhalten bleibt",
nicht explizit, dass der **Text des tragenden Absatzes selbst** erhalten bleibt).

### 0.2 Cross-Format-Anforderung (Req-Abschnitt 5.2, Punkte 3/4) ist mit der aktuellen App-UI nicht per echtem Browser-Test ausführbar

Geprüft gegen `src/app/DocumentWorkspace.tsx`, `src/app/FormatPicker.tsx` und
`src/formats/registry.ts`: Die App bietet **keine** Format-Konvertierungsfunktion. Jede
„Karte" (DOCX/ODT) ist starr an ihr eigenes `FormatModule` gebunden — `handleExport()` ruft
ausschließlich `module.exportFile(...)` des Moduls auf, in dem das Dokument geöffnet wurde;
es gibt keinen Format-Umschalter, keinen „Export als…"-Dialog, und ein Hochladen einer
`.docx`-Datei in die ODT-Karte (oder umgekehrt) ist über den Datei-Input dieser Karte technisch
zwar nicht durch das `accept`-Attribut verhindert, würde aber am `readOdt`/`readDocx`-Parser
scheitern (ODF- vs. OOXML-ZIP-Struktur), da keine Format-Erkennung/-Umwandlung dazwischenliegt.

**Konsequenz:** Req-Abschnitt 5.2 Punkte 3/4 („Cross-Format DOCX → ODT → DOCX" und umgekehrt)
sowie Grenzfall 10 sind mit der App **in ihrem aktuellen Funktionsumfang** nicht als echter
Browser-E2E-Test (Upload/Klick/Download in der jeweils anderen Karte) durchführbar — das ist
kein Lücke dieses Testplans, sondern eine Lücke der App selbst, unabhängig vom
Seitenumbruch-Feature. Zwei Optionen, mit PO/Dev vor Abnahme zu klären (siehe Abschnitt 6):

- (a) Cross-Format-Anforderung wird ausschließlich auf **Unit-Ebene** abgeprüft, indem
  `writeDocx`/`readDocx`/`writeOdt`/`readOdt` direkt und nacheinander in einer Testdatei
  aufgerufen werden (Abschnitt 3.7 unten) — das ist die einzig **heute** technisch mögliche
  Prüfung und wird in diesem Plan als Pflichttest geführt.
- (b) Falls eine echte browserseitige Cross-Format-Prüfung verlangt wird, ist zuerst eine
  eigene, von diesem Ticket unabhängige Funktion „Als anderes Format exportieren"
  nachzuliefern — außerhalb des Geltungsbereichs von `seitenumbruch-req.md`.

Dieser Testplan verfolgt (a) und markiert das E2E-Gegenstück explizit als **nicht ausführbar,
dokumentierte Lücke** (Abschnitt 2.11), nicht als stillschweigend ausgelassen.

### 0.3 Determinismus ist in diesem Repo ein bekanntes, hartes Problem — nicht optional

Der Auftrag verlangt ausdrücklich **deterministische** Tests ohne Race-Conditions durch zu
schnelle Tastatureingaben und mit abgewartetem Selektions-Sync. Das ist hier **keine**
theoretische Vorsichtsmaßnahme: Das Repo hat einen real reproduzierten, bereits mehrfach
geflakten Fehlerkanal, den jede neue E2E-Datei erneut trifft, wenn sie ihn ignoriert. Belege,
direkt im Repo verifiziert (nicht aus dem Code-Plan übernommen):

- `tests/e2e/selection-regression.spec.ts:26–35` dokumentiert wortwörtlich: „ProseMirror only
  learns a native, keyboard-driven caret move (like the `End` above) via the browser's
  **asynchronous** `selectionchange` event. Firing `Enter` immediately after … can race ahead of
  that catch-up and still act on the pre-`End` position." Mitigation dort: `await
  page.waitForTimeout(50)` **zwischen** dem Caret-Move und der nächsten mutierenden Taste.
- `tests/e2e/cut.spec.ts:60–74` dokumentiert dieselbe Klasse zweifach: (a) ein „rapid, zero-delay
  loop of individual `Shift+ArrowRight` keydowns immediately followed by `Strg+X`" schnitt real
  „between 1 and 11 characters" statt der vollen Selektion → Mitigation `delay: 20` pro Taste
  **plus** `waitForTimeout(50)` vor dem Schnitt; (b) `Home` traf auf schmalem Viewport durch
  Zeilenumbruch die falsche Position → Mitigation `ControlOrMeta+Home`.
- Git-Historie (`git log`): „Fix flaky Mobile-project cut.spec.ts failures: **same
  async-selection-sync race** as selection-regression.spec.ts" und „give async selection sync
  time before the next keystroke". Also bereits **produktiv aufgetreten**, nicht hypothetisch.
- `playwright.config.ts:27–36`: die **drei Default-Projekte** `Desktop Chrome`, `Mobile`
  (`Pixel 7`) und `Tablet` (`iPad Mini` → **WebKit**) laufen **jede** Spec (außer den
  clipboard-only-Specs). Jeder E2E-Test unten läuft also dreifach auf drei Viewports/Engines —
  ein auf Chromium/Desktop grüner, aber nicht viewport-robuster Test ist **nicht** abnahmefähig.

**Konsequenz für diesen Testplan:** Abschnitt 2.1.1 formuliert die daraus abgeleiteten
**verbindlichen** Determinismus-Regeln, und die Code-Skizzen in 2.6/2.8 wurden gegenüber einer
naiven Fassung **korrigiert** (die ursprüngliche 2.6-Skizze feuerte `Enter` unmittelbar nach
`End` — genau der oben belegte Bug). Ein E2E-Test, der diese Regeln verletzt, gilt als **nicht
bestanden**, auch wenn er lokal einmal grün war.

---

## 1. Testebene 1 — Unit-Tests Reader/Writer-Rundreise (DOCX + ODT)

Ausführung: `npm run test` (Vitest, jsdom). Ziel: Schema/Commands-Korrektheit und
Reader/Writer-Symmetrie **ohne** Browser, inklusive der realen Fixture-Dateien, die laut
Code-Plan Abschnitt 0.3 bereits im Repo liegen.

### 1.1 `src/formats/shared/editor/__tests__/commands.test.ts` (neu)

| ID | Testfall | Erwartung |
|---|---|---|
| UT-CMD-01 | `insertPageBreak()` mit Cursor mitten in einem Absatz „AAABBB" (Cursor zwischen AAA/BBB) | Ergebnis: zwei `paragraph`-Knoten „AAA" (kein `breakBefore`) und „BBB" (`breakBefore: true`); Dokumentinhalt sonst unverändert |
| UT-CMD-02 | `insertPageBreak()` mit aktiver Selektion (nicht leer) | Selektion wird ersetzt (verschwindet), nicht nur ergänzt — vgl. Anforderung 3.2 |
| UT-CMD-03 | `insertPageBreak()` am Dokumentanfang (Cursor vor erstem Zeichen) | Führt zu einem Split an Position 0: leerer erster Absatz, gefolgter Original-Absatz trägt `breakBefore: true`. Kein Crash, kein No-Op (Grenzfall 1) |
| UT-CMD-04 | `insertPageBreak()` am Dokumentende | Neuer leerer Folge-Absatz mit `breakBefore: true` (Grenzfall 2) |
| UT-CMD-05 | `insertPageBreak()` mit Cursor in einem `list_item` | Split bleibt innerhalb **derselben** Liste (kein zweites Top-Level-`bullet_list`/`ordered_list`); neues `list_item` trägt den Absatz mit `breakBefore: true`; Listentyp/`kind` unverändert (Grenzfall 5) |
| UT-CMD-06 | `insertPageBreak()` mit Cursor mitten in einer `heading` | Zweiter Teil bleibt `heading` desselben `level` (Grenzfall 6, „mittendrin") |
| UT-CMD-07 | `insertPageBreak()` am Ende einer `heading` | Zweiter Teil wird `paragraph` (Parität zu generischem `Enter`-Verhalten, Grenzfall 6, „am Ende") |
| UT-CMD-08 | `insertPageBreak()` mit Cursor in einer Tabellenzelle | **Kein** Absturz, **keine** beschädigte Tabellenstruktur; erzeugtes Ergebnis ist dokumentiert entweder `hard_break`-Fallback oder anderes bewusst festgelegtes Verhalten (laut Code-Plan: `hard_break`-Fallback) — Test schreibt das **tatsächlich gewählte** Verhalten fest, nicht das im Plan vermutete (Grenzfall 4) |
| UT-CMD-09 | `insertPageBreak()` mit GapCursor direkt neben einem Bild (kein umgebender Absatz) | Kein stiller Fehlschlag (Anforderung 3.10): entweder Fallback-Absatz mit `breakBefore: true` oder alternative, aber **sichtbare** Wirkung — Bild bleibt unverändert/unverschoben (Grenzfall 12) |
| UT-CMD-10 | **Ein einziger Undo-Schritt**: `insertPageBreak()` einmal aufrufen, dann genau ein `undo()` | Dokument entspricht exakt dem Zustand vor dem Einfügen (Text, Selektion-Marker, keine Restspuren) — Anforderung 3.9/Grenzfall 13 |
| UT-CMD-11 | `removePageBreakBackward()`/`removePageBreakForward()` direkt an der Umbruch-Grenze | `breakBefore` verschwindet, Nachbarblöcke werden zusammengeführt, ein einziger Undo-Schritt stellt exakten Vorzustand wieder her |
| UT-CMD-12 | `removePageBreakBackward()`/`-Forward()` **nicht** exakt an der Grenze (z. B. Cursor mitten im Text) | Gibt `false` zurück / hat **keine** Wirkung auf `breakBefore` — muss transparent an `baseKeymap`s Standard-Backspace/Delete durchgereicht werden, ohne dieses Standardverhalten zu brechen |
| UT-CMD-13 | `removePageBreakBackward()` am Dokumentanfang, kein Vorgänger zum Zusammenführen vorhanden | Kein Crash; Attribut wird entfernt, auch wenn kein Join möglich ist |

### 1.2 `src/formats/shared/editor/__tests__/pagination.test.ts` (Erweiterung)

Bestehende 8 Tests (parameterlos, ohne drittes Argument) **müssen unverändert grün bleiben**
(Baseline, siehe 1.8). Neue Fälle für die erweiterte Signatur
`computePageBreakIndices(heights, pageContentHeight, forcedBreakIndices)`:

| ID | Testfall | Erwartung |
|---|---|---|
| UT-PAG-01 | `computePageBreakIndices([100,100,100], 1000, new Set([2]))` | `[2]` — erzwungener Bruch, obwohl reichlich Platz (Anforderung 3.8) |
| UT-PAG-02 | `computePageBreakIndices([100,100], 1000, new Set([0]))` | `[]` — Index 0 wird nie erzwungen (nichts geht davor) |
| UT-PAG-03 | `computePageBreakIndices([100,100,250], 300, new Set([1]))` | `[1]` — `cumulative` startet nach dem erzwungenen Bruch bei 0, kein zusätzlicher natürlicher Bruch für `[100,250]` |
| UT-PAG-04 | `computePageBreakIndices([100,100,200,200], 300, new Set([1]))` | `[1, 3]` — erzwungener **und** nachfolgender natürlicher Überlauf-Bruch korrekt kombiniert (Anforderung 3.8, „Kombination … muss korrekt zusammenwirken") |
| UT-PAG-05 | Zwei direkt benachbarte erzwungene Indizes (`new Set([1,2])` bei drei kurzen Blöcken) | Beide Brüche bleiben erhalten, **keine** automatische Zusammenlegung (Grenzfall 3) |
| UT-PAG-06 | `forcedBreakIndicesFrom(doc)` (falls separat exportiert/testbar) mit `breakBefore` auf einem verschachtelten `list_item`-Kind | Liefert **keinen** Top-Level-Index dafür (bewusste Einschränkung Abschnitt 7.4 des Code-Plans) — Test hält das **explizit** fest, nicht nur implizit |
| UT-PAG-07 | `sameDecorationSet`-Äquivalent: an identischer Position wechselt nur `isManual` von `false`→`true` (automatischer Bruch existierte schon, Absatz bekommt zusätzlich `breakBefore: true`) | Muss als **Änderung** erkannt werden (neue Decoration wird gebaut), nicht als „keine Änderung" — deckt den im Code-Plan selbst als Risiko benannten Vergleichsfehler ab (Abschnitt 7.3) |

### 1.3 DOCX-Export — Unit-Test gegen `writeDocx` direkt

| ID | Testfall | Erwartung |
|---|---|---|
| UT-DOCX-W-01 | `paragraph`/`heading` mit `breakBefore: true` | XML enthält exakt `<w:br w:type="page"/>` **innerhalb eines eigenen** `<w:r>`, an keiner Stelle `<w:br/>` ohne `w:type` für diesen Fall |
| UT-DOCX-W-02 | Gleichzeitig ein `hard_break` **und** ein `breakBefore`-Absatz im selben Dokument | Beide Fälle bleiben unterscheidbar im XML (`<w:br/>` vs. `<w:br w:type="page"/>`), keine Verwechslung |
| UT-DOCX-W-03 | An keiner Stelle des erzeugten XML | `<w:lastRenderedPageBreak` kommt im Output **nirgends** vor (Anforderung 3.4, negative Assertion) |

### 1.4 DOCX-Rundreise (Erweiterung `src/formats/docx/__tests__/roundtrip.test.ts`)

| ID | Testfall | Erwartung |
|---|---|---|
| **UT-DOCX-RT-BREAK-OWN-TEXT** *(Pflicht, siehe 0.1)* | Absatz **mit eigenem Textinhalt** UND `breakBefore: true` (z. B. `{type:'paragraph', attrs:{align:'left', breakBefore:true}, content:[{type:'text', text:'Seite zwei beginnt hier'}]}`), umgeben von einem vorangehenden Absatz ohne Umbruch → `writeDocx` → `readDocx` | Nach Reimport: **beide** Absätze vorhanden, insbesondere der Text „Seite zwei beginnt hier" ist **nicht verloren gegangen**, `breakBefore` bleibt `true` auf genau diesem Absatz. **Dieser Test deckt den in Abschnitt 0.1 vermuteten Bug auf und muss vor Freigabe grün sein** |
| UT-DOCX-RT-01 | Zwei Absätze „Vor" / „Nach", `breakBefore: true` auf „Nach" → Rundreise | Beide Texte erhalten, Umbruch exakt zwischen den beiden, nicht verschoben |
| UT-DOCX-RT-02 | `breakBefore: true` auf einer `heading` mit eigenem Text | Analog zu `UT-DOCX-RT-BREAK-OWN-TEXT`, für `heading` statt `paragraph` |
| UT-DOCX-RT-03 | Umbruch am Dokumentende (letzter Block hat `breakBefore: true`, leerer Inhalt) → Rundreise | Bleibt als eigener, leerer, `breakBefore: true`-tragender Absatz erhalten (kein stiller Verlust, Grenzfall 2) |
| UT-DOCX-RT-04 | Drei „Kapitel"-Absätze, je durch einen Umbruch getrennt → Rundreise | Alle drei Umbrüche einzeln und an der richtigen Stelle wiedergefunden (Grenzfall 9) |
| UT-DOCX-RT-05 | Umbruch unmittelbar vor einem `image`-Block (kein Text dazwischen) → Rundreise | Bild bleibt vollständig erhalten, `breakBefore` landet auf dem richtigen Knoten (Bild selbst oder synthetischem Vorgänger-Absatz je nach gewählter Architektur) — Grenzfall 12 |
| UT-DOCX-RT-06 | Baseline-Gegenprobe: Dokument **ohne** jeden `breakBefore` → Rundreise | Kein Knoten im Ergebnis trägt `breakBefore: true` (kein ungewollt „erfundener" Umbruch) |

### 1.5 DOCX — reale Fremddatei-Fixtures (neu: `src/formats/docx/__tests__/pagebreak.test.ts`)

Verifiziert gegen die tatsächlich im Repo vorhandenen Dateien
(`tests/fixtures/external/docx/`):

| ID | Fixture | Testfall | Erwartung |
|---|---|---|---|
| UT-DOCX-FIX-01 | `saut_page.docx` | `readDocx(buffer)` | Ergebnis enthält an den erwarteten Stellen `breakBefore: true` (2 echte `<w:br w:type="page"/>`, jeweils als **letzter** Run ihres Absatzes); der eingebettete einfache `<w:br/>` mitten in „BLA<w:br/>BLA" bleibt als `hard_break` erhalten, **kein** `breakBefore` daraus |
| UT-DOCX-FIX-02 | `60329.docx` | `readDocx(buffer)` | **Kein** Knoten im Ergebnis hat `breakBefore: true` — die 3 enthaltenen `<w:lastRenderedPageBreak/>` werden vollständig ignoriert (Anforderung 3.5, „muss ignoriert werden") |
| UT-DOCX-FIX-03 | `saut_page.docx` | Reimport → `writeDocx` → erneut `readDocx` (volle Rundreise mit Fremddatei) | Beide `breakBefore`-Stellen und aller umgebender Text bleiben über zwei Zyklen erhalten (Req 5.2 Punkt 7) |

### 1.6 ODT-Export — Unit-Test gegen `writeOdt`/`styleRegistry` direkt

| ID | Testfall | Erwartung |
|---|---|---|
| UT-ODT-W-01 | `paragraph`/`heading` mit `breakBefore: true` | Erzeugter Style des **eigenen** Absatzes trägt `fo:break-before="page"`; Style-Definition ist im `<office:automatic-styles>`-Block vorhanden und tatsächlich referenziert (`text:style-name`) |
| UT-ODT-W-02 | Kombination `align` × `breakBefore` (z. B. `center` + `true`) | Beide Eigenschaften bleiben gleichzeitig im selben Style erhalten (kein Überschreiben) |

### 1.7 ODT-Rundreise (Erweiterung `src/formats/odt/__tests__/roundtrip.test.ts`)

| ID | Testfall | Erwartung |
|---|---|---|
| UT-ODT-RT-01 | Absatz mit `breakBefore: true` **und** eigenem Text → Rundreise | Text **und** Attribut bleiben erhalten (ODT-Architektur nach Code-Plan 1.1 sollte diesen Fall unproblematisch handhaben, da kein Inline-Split nötig ist — trotzdem **explizit** verifizieren, nicht nur analog zu DOCX annehmen) |
| UT-ODT-RT-02 | Synthetisches XML mit `fo:break-after="page"` auf einem Style, der von Absatz A referenziert wird, gefolgt von Absatz B (analog `pagebreaks.odt`s `P3`) → `readOdt` | `breakBefore: true` landet auf dem **nächsten** Absatz (B), nicht auf A selbst (Zusatzbefund C/Abschnitt 12.2/12.4 des Code-Plans) |
| UT-ODT-RT-03 | **Wichtig:** nach `readOdt` mit `fo:break-after`-Fall | Das zurückgegebene `WordDocumentContent`/JSON enthält an **keiner** Stelle das interne Hilfsattribut `breakAfterHint` — sonst wirft `wordSchema.nodeFromJSON` beim Laden im Editor eine Exception (vom Code-Plan selbst als Risiko benannt, Abschnitt 12.4) |
| UT-ODT-RT-04 | `fo:break-after="page"` als **letztes** Element im Dokument (kein nachfolgender Absatz) → `readOdt` | Ein synthetischer, leerer Absatz mit `breakBefore: true` wird angehängt — kein stiller Verlust (analog Grenzfall 2, ODT-seitig) |
| UT-ODT-RT-05 | Zwei aufeinanderfolgende Umbrüche (zwei leere Absätze mit je `breakBefore: true`) → Rundreise | Beide bleiben erhalten, keine Zusammenlegung (Grenzfall 3) |

### 1.8 ODT — reale Fremddatei-Fixtures (neu: `src/formats/odt/__tests__/pagebreak.test.ts`)

Verifiziert gegen die tatsächlich im Repo vorhandenen Dateien
(`tests/fixtures/external/odt/`):

| ID | Fixture | Testfall | Erwartung |
|---|---|---|---|
| UT-ODT-FIX-01 | `pagebreaks.odt` | `readOdt(buffer)` | `P1`/`P2` (`fo:break-before`) **und** `P3` (`fo:break-after`) ergeben zusammen die korrekt verschobene Abfolge von `breakBefore: true`-Knoten (Zusatzbefund C) |
| UT-ODT-FIX-02 | `AB_pageBreakBefore.odt` | `readOdt(buffer)` | Absatz „B" trägt `breakBefore: true`, Absatz „A" nicht; beide Texte vorhanden |
| UT-ODT-FIX-03 | `pageBreakProblem.odt` | `readOdt(buffer)` | Gleiches erwartetes Ergebnis wie `AB_pageBreakBefore.odt` (Struktur laut Code-Plan identisch) |
| UT-ODT-FIX-04 | `no_pagebreak.odt` **und** `35585_-_no_pagebreak.odt` | `readOdt(buffer)` | `breakBefore: true` wird auf dem **verschachtelten** Tabellenzellen-Absatz gelesen (kein Datenverlust) — **und** separat per E2E/Pagination-Unit-Test bestätigt, dass daraus **kein** zusätzlicher Top-Level-Seiten-Spacer entsteht (Grenzfall 4, Zusatzbefund D) |
| UT-ODT-FIX-05 | `text-extract.odt` | `readOdt(buffer)` | **Kein** Knoten im Ergebnis hat `breakBefore: true` — das enthaltene `text:soft-page-break` wird **nicht** fehlinterpretiert (Anforderung 3.7) |

### 1.9 Cross-Format-Kette auf Unit-Ebene (neu: `src/formats/shared/__tests__/pagebreak-crossformat.test.ts`)

Deckt Req-Abschnitt 5.2 Punkte 3/4 und Grenzfall 10 ab, siehe Begründung in Abschnitt 0.2 —
**einzige heute technisch mögliche Prüfung** dieser Anforderung, direkte Verkettung von
Reader/Writer beider Formate in einem Testprozess (kein Browser nötig):

| ID | Testfall | Erwartung |
|---|---|---|
| UT-XFMT-01 | Neues Dokument (zwei Absätze, Umbruch dazwischen) → `writeDocx` → `readDocx` → `writeOdt` → `readOdt` | Umbruch **und** beide Textinhalte bleiben über beide Formatwechsel erhalten (Req 5.2.3) |
| UT-XFMT-02 | Umgekehrte Kette: → `writeOdt` → `readOdt` → `writeDocx` → `readDocx` | Analog (Req 5.2.4) |
| UT-XFMT-03 | Umbruch am Dokumentende, Kette DOCX→ODT→DOCX | Prüft Grenzfall 10 explizit: entweder exakt `<w:br w:type="page"/>` am Ende oder ein zusätzlicher leerer Absatz (beides laut Anforderung akzeptabel) — **kein** Textverlust, **kein** vollständiges Verschwinden des Umbruchs; Ergebnis wird dokumentiert, welcher der beiden Fälle tatsächlich eintritt |

### 1.10 Baseline-Regression (Anforderung 5.1)

| ID | Testfall | Erwartung |
|---|---|---|
| UT-BASE-01 | Alle **bestehenden** Tests in `docx/__tests__/roundtrip.test.ts`, `docx/__tests__/external-fixtures.test.ts`, `odt/__tests__/roundtrip.test.ts`, `odt/__tests__/external-fixtures.test.ts`, `shared/editor/__tests__/pagination.test.ts` | Bleiben nach allen Änderungen **unverändert grün**, insbesondere die Fixtures `60329.docx` und `text-extract.odt` erzeugen weiterhin **keinen** `breakBefore` |
| UT-BASE-02 | `npm run build` (`tsc -b`, `noUnusedLocals`/`noUnusedParameters: true`) | Läuft fehlerfrei durch — insbesondere nach Signaturänderungen an `paragraphToBlocks`/`elementToBlocks`/`parseTable`, deren Aufrufstellen synchron angepasst sein müssen |

---

## 2. Testebene 2 — ECHTE Playwright-Browser-Tests

### 2.1 Testgrundsatz (verbindlich für alle Tests dieser Ebene)

Jeder Test in diesem Abschnitt **muss** ausschließlich über öffentlich sichtbare
Browser-Interaktion laufen:

- Klicks über `page.getByRole('button', {...})` / `page.getByTitle(...)`,
- Tastatureingaben über `page.keyboard.type(...)` / `page.keyboard.press(...)`,
- Datei-Uploads über `input.setInputFiles({...})` auf das reale `<input type="file">`,
- Downloads über `page.waitForEvent('download')` + `download.path()` + tatsächliches
  Einlesen der Datei von der Festplatte (`fs.readFile`) + `JSZip.loadAsync(...)` gegen die
  **reale** ZIP/XML-Struktur — genau wie in `tests/e2e/docx.spec.ts:70–83` bereits etabliert.

**Nicht zulässig** für diese Ebene: `page.evaluate(() => insertPageBreak()(...))`, direkte
Imports von `commands.ts`/`writer.ts` innerhalb eines E2E-Specs, oder jede andere Umgehung der
echten UI. Diese Ebene existiert genau deshalb, weil Unit-Tests (Ebene 1) die
Editor-Verdrahtung (Toolbar-Button tatsächlich vorhanden und klickbar, Keymap tatsächlich
gebunden, DOM tatsächlich mit den richtigen Klassen gerendert, Datei tatsächlich
herunterladbar) nicht abdecken.

#### 2.1.1 Determinismus-Regeln (verbindlich für jeden Test dieser Ebene)

Abgeleitet aus 0.3, direkt aus dem bestehenden Repo-Muster übernommen (nicht neu erfunden).
**Jeder** Test in Abschnitt 2.x muss sie einhalten; ein Verstoß ist ein QA-Fehlschlag, kein
Stilfrage.

1. **Selektions-Sync abwarten (Kern-Regel).** Nach **jeder** nativen, tastatur- oder
   maus­getriebenen **Caret-Bewegung** (`End`, `Home`, `ControlOrMeta+Home`, `ArrowLeft/Right/
   Up/Down`, oder ein `editor.click()`/Zell-Klick, der den Cursor umsetzt), die von einer
   **darauf folgenden, positions­abhängigen mutierenden Taste** (`Enter`, `ControlOrMeta+Enter`
   = Seitenumbruch, `Backspace`, `Delete`, `type(...)`) gefolgt wird, **genau ein**
   `await page.waitForTimeout(50)` einschieben — identisch zu `selection-regression.spec.ts:34`
   und `cut.spec.ts:74`. Ohne diese Pause kann die mutierende Taste auf der **veralteten**
   Cursor-/Selektionsposition wirken (belegt in 0.3). Die Pause ist **nur** an genau diesen
   Übergängen nötig, nicht pauschal vor jeder Taste — das erste `editor.click()` + sofortiges
   `type(...)` (nichts Veraltetes vorhanden) bleibt bewusst ohne Pause (Muster `docx.spec.ts:74`).
2. **Der Seitenumbruch-Command selbst ist synchron.** `insertPageBreak` läuft als reguläre
   ProseMirror-Transaktion über `dispatchTransaction` und setzt den Cursor selbst — direkt
   **nach** `ControlOrMeta+Enter` darf ohne Pause weitergetippt werden (kein nativer Caret-Move
   dazwischen). Die Pause aus Regel 1 gilt für den **Klick/Pfeil-danach**, nicht für das
   Command selbst. Das ist genau der Punkt, den der Selection-Sync-Regressionstest (2.6) prüfen
   muss: Einfügen selbst darf keinen inkonsistenten Zustand hinterlassen.
3. **Selektion per Tastatur, nicht per Pixel-Maus-Drag.** Bereichs­selektionen über
   `ControlOrMeta+a` oder `ControlOrMeta+Home` + Schleife aus `Shift+ArrowRight`/`ArrowLeft`
   mit **`{ delay: 20 }` pro Taste** (Muster `cut.spec.ts:70`, `clipboard.spec.ts:349`). **Kein**
   Fixed-Pixel-`mouse.move/down/up`-Drag: er ist über die drei Viewport-Projekte (Desktop/Mobile/
   Tablet) unzuverlässig, weil die Seitenbreite fix ist und Text unterschiedlich umbricht
   (verifiziert dokumentiert in `cut.spec.ts:60–67`).
4. **Viewport-robuste Navigation.** Für „an den Dokumentanfang": **`ControlOrMeta+Home`**, nicht
   `Home` (das auf dem schmalen Mobile/Tablet-Viewport nur an den Anfang der aktuellen **visuellen
   Zeile** springt — belegt in `cut.spec.ts:60–67`). Für „ans Ende": `ControlOrMeta+End`.
5. **Auto-Waiting statt fester Sleeps für DOM-Zustände.** Auf gerenderte Ergebnisse **nur** mit
   web-first-Assertions warten (`await expect(locator).toHaveCount(n)` / `.toContainText(...)` /
   `.toBeVisible()`), die Playwright bis zum Timeout retryt. Feste `waitForTimeout` sind
   **ausschließlich** für den Selektions-Sync-Übergang aus Regel 1 zulässig, nirgends sonst
   („warte bis Spacer da ist" → `toHaveCount`, nicht `waitForTimeout`).
6. **Kein stiller JS-Fehler (Anforderung 3.10).** Jeder Test registriert den bereits etablierten
   `watchForConsoleErrors(page)`-Helfer (`cut.spec.ts:16–26`: `page.on('pageerror')` +
   `console`-Typ `error`) und ruft die zurückgegebene Assertion am Testende auf. Ein Klick/
   Tastendruck, der visuell „nichts tut", aber eine Exception in die Konsole wirft, ist ein
   Verstoß gegen „nie ein ergebnisloser Tastendruck/Klick" und muss so **auffliegen**, nicht
   durchrutschen.
7. **Re-Upload nach Export beachtet den Lifecycle-Guard.** Das Dokument-Workspace zeigt bei
   ungespeicherten Änderungen `● ungespeichert` (`DocumentWorkspace.tsx:119`) und armiert eine
   `beforeunload`-Warnung; ein `page.reload()` auf einem **dirty** Dokument löst einen
   Bestätigungsdialog aus (siehe `save-export-lifecycle.spec.ts`, Testfall 15). Ein Export macht
   das Dokument **clean** (Indikator verschwindet), erst **danach** ist `reload()` dialogfrei. Der
   Re-Upload-Fluss (2.8) muss deshalb entweder (a) **nach** dem Export erst
   `await expect(page.getByText('● ungespeichert')).toHaveCount(0)` abwarten und dann neu laden,
   **oder** (b) vorsorglich `page.on('dialog', (d) => d.accept())` registrieren. Sonst hängt/
   flakt der Reload projektabhängig.

### 2.2 Wiederverwendete Infrastruktur (bereits im Repo vorhanden, verifiziert)

```ts
function docxCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}
function odtCard(page: Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}

// Regel 6 (2.1.1): identisch aus cut.spec.ts:16–26 übernommen — für die neue Datei mit
// exportieren/importieren (nicht duplizieren, in fixtures/ auslagern, sobald zweiter Nutzer
// existiert). Fängt „stille" JS-Fehler, die ein Klick/Tastendruck sonst unsichtbar auslöst.
function watchForConsoleErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(String(err)))
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  return () => expect(errors, `Unerwartete Konsolen-/JS-Fehler: ${errors.join('\n')}`).toEqual([])
}
```

Gemeinsamer `beforeEach`: `page.goto('/')` → Datenschutz-Banner wegklicken
(`page.getByRole('button', { name: /verstanden/i }).click()`) → Karte öffnen
(`docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()` bzw. `odtCard(...)`).

Neue Datei: `tests/e2e/seitenumbruch.spec.ts` (Aufbau analog `selection-regression.spec.ts`).
Zusätzlich: ein Testfall wird **direkt** in den bestehenden `describe`-Block von
`tests/e2e/selection-regression.spec.ts` aufgenommen (siehe 2.6), nicht nur isoliert in der
neuen Datei geführt.

### 2.3 Grundfunktion — Einfügen per Toolbar-Klick und Tastenkürzel

| ID | Testfall (echte Bedienung) | Prüfung |
|---|---|---|
| E2E-INSERT-01 | Editor öffnen (`Neu erstellen`, DOCX-Karte) → Klick in `.ProseMirror` → `page.keyboard.type('Erster Teil')` → Klick auf Toolbar-Button `getByTitle('Seitenumbruch einfügen')` (bzw. `getByRole('button', {name: 'Seitenumbruch einfügen'})`) | Im DOM erscheint ein `.page-break-spacer--manual`-Element **und** der nachfolgende Absatz trägt die CSS-Klasse `pm-page-break-before` (`page.locator('.ProseMirror .pm-page-break-before')` sichtbar) |
| E2E-INSERT-02 | Gleicher Ablauf, aber Auslösung über `page.keyboard.press('ControlOrMeta+Enter')` statt Toolbar-Klick | Identisches DOM-Ergebnis wie E2E-INSERT-01 — beide Auslösewege müssen zum selben sichtbaren Zustand führen |
| E2E-INSERT-03 | Nach E2E-INSERT-01/02: `page.keyboard.type('Zweiter Teil')` | „Zweiter Teil" erscheint sichtbar **unterhalb** des Spacer/Labels (per `boundingBox()`-Vergleich der Y-Koordinaten von Spacer und neuem Text, oder DOM-Reihenfolge-Prüfung) — Testplan-Punkt 3 der Anforderung |
| E2E-INSERT-04 | Vorherige Textselektion vorhanden (`ControlOrMeta+a`), dann Umbruch einfügen | Selektierter Text ist **ersetzt** (verschwunden), nicht zusätzlich zum Umbruch erhalten (Anforderung 3.2) |
| E2E-INSERT-05 | ODT-Karte, identischer Ablauf wie E2E-INSERT-01/02/03 | Identisches Ergebnis auf der ODT-Karte (Feature ist formatunabhängig im selben Editor) |

**Determinismus-Hinweis zu 2.3 (Regel 1/2, 2.1.1):** In E2E-INSERT-01/02/03 gibt es zwischen
`type(...)`, dem synchronen `insertPageBreak` und dem folgenden `type(...)` **keinen** nativen
Caret-Move → **keine** `waitForTimeout` nötig und keine einfügen (überflüssige Sleeps sind
ebenfalls unerwünscht). E2E-INSERT-04 nutzt `ControlOrMeta+a` (synchron gesetzte `AllSelection`)
direkt vor dem Einfügen — ebenfalls pausenfrei korrekt. Die Pause aus Regel 1 wird erst dort
relevant, wo ein Klick/Pfeil/`End` **vor** einer mutierenden Taste steht (2.5/2.6/2.7).

### 2.4 Visuelle Unterscheidbarkeit automatisch vs. manuell (Testplan-Punkt 6 der Anforderung)

| ID | Testfall | Prüfung |
|---|---|---|
| E2E-VISUAL-01 | Kurzes Dokument mit reichlich Freiraum (definitiv **kein** automatischer Höhen-Überlauf-Umbruch zu erwarten) + genau einem manuell eingefügten Umbruch | DOM enthält **genau ein** `.page-break-spacer--manual`-Element und **kein** einfaches `.page-break-spacer` ohne diesen Modifikator; zusätzlich Daten-Attribut-Assertion: `[data-manual-page-break="true"]` vorhanden (zweites, von der CSS-Klasse unabhängiges Signal, Code-Plan Abschnitt 6.1/7.2) |
| E2E-VISUAL-02 | Sehr langes Dokument (viel Text, mehrere automatische Überlauf-Umbrüche zu erwarten) **ohne** jeden manuellen Umbruch | Alle vorhandenen `.page-break-spacer`-Elemente tragen **nicht** die Klasse `--manual` und **nicht** `[data-manual-page-break="true"]` |
| E2E-VISUAL-03 | Kombination: langes Dokument mit automatischen Umbrüchen **und** zusätzlich einem manuellen Umbruch dazwischen | Beide Umbruch-Arten sind im DOM gleichzeitig vorhanden und über die Klasse/das Attribut eindeutig unterscheidbar (Anforderung 3.8, „Zusammenspiel … korrekt") |

**Determinismus-/Projekt-Hinweis zu 2.4:** Die **Anzahl automatischer** Überlauf-Umbrüche hängt
von gemessenen DOM-Höhen ab und variiert über die drei Projekte (`Desktop Chrome`/`Mobile`/
`Tablet` mit unterschiedlichen Viewports/Zeilenumbrüchen, `playwright.config.ts:34–36`).
Assertions in E2E-VISUAL-02/03 daher **count-agnostisch** formulieren: „**kein** Element trägt
`--manual`/`[data-manual-page-break="true"]`" bzw. „**genau ein** `--manual` existiert", **nicht**
„es gibt genau N automatische Spacer". Für E2E-VISUAL-01 gilt umgekehrt: der manuelle Umbruch ist
höhenunabhängig (er entsteht aus `breakBefore`, nicht aus Überlauf) → seine `toHaveCount(1)` ist
über alle drei Projekte stabil.

### 2.5 Löschen + Undo/Redo (echte Bedienung)

| ID | Testfall | Prüfung |
|---|---|---|
| E2E-DELETE-01 | Umbruch einfügen (E2E-INSERT-01) → Cursor an den **Anfang** des Umbruch-Absatzes navigieren (`ControlOrMeta+Home` bzw. Pfeil an die Grenze, Regel 4) → **`await page.waitForTimeout(50)` (Regel 1)** → `page.keyboard.press('Backspace')` | `.pm-page-break-before`/`.page-break-spacer--manual` verschwindet aus dem DOM; Text davor/danach bleibt inhaltlich unverändert. Die Pause ist Pflicht: `Backspace` ist positions­abhängig und würde sonst evtl. auf der veralteten Position wirken (Regel 1) |
| E2E-DELETE-02 | Nach E2E-DELETE-01: `page.keyboard.press('ControlOrMeta+z')` | Umbruch **und** ursprünglicher Zustand sind in **einem** Schritt wiederhergestellt (Grenzfall 13); erneutes Redo (`ControlOrMeta+y` **oder** `ControlOrMeta+Shift+z` — beide sind laut Keymap gebunden) stellt den gelöschten Zustand identisch wieder her |
| E2E-DELETE-03 | Backspace/Delete an einer Position, die **nicht** exakt an der Umbruch-Grenze liegt (z. B. mitten im Text nach dem Umbruch; nach dem Repositionieren wieder **Regel 1** beachten) | Normales Zeichen-Löschverhalten, `breakBefore` bleibt unangetastet — keine Regression am Standard-Backspace/Delete |

### 2.6 Pflicht-Regressionstest Selection-Sync (Grenzfall 7, verpflichtend in `selection-regression.spec.ts`)

Identische Technik wie die bestehenden drei Tests in dieser Datei
(`ControlOrMeta+a` → Fett → Neu-Klick → weitertippen), erweitert um die
Seitenumbruch-Einfüge-Sequenz:

```ts
test('page break insert + reselect + type — selection stays consistent', async ({ page }) => {
  const assertNoConsoleErrors = watchForConsoleErrors(page) // Regel 6 (2.1.1)
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Erster Absatz.')
  // ControlOrMeta+Enter (insertPageBreak) ist eine synchrone PM-Transaktion, die den Cursor
  // selbst setzt — direkt danach tippen ist bewusst ohne Pause korrekt (Regel 2).
  await page.keyboard.press('ControlOrMeta+Enter')
  await page.keyboard.type('Zweiter Absatz.')

  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Fett').click()

  // Reproduziert exakt den bekannten Selection-Sync-Bug-Auslöser: erneuter Klick in den
  // jetzt fett markierten, noch selektierten Text, dann eine native Caret-Bewegung.
  await editor.click()
  await page.keyboard.press('End')
  // PFLICHT (Regel 1 / 0.3): der native `End`-Caret-Move wird nur asynchron über
  // `selectionchange` in ProseMirrors Modell nachgezogen; das folgende `Enter` darf nicht
  // vorausrasen. IDENTISCH zu selection-regression.spec.ts:34. Fehlte in der naiven Fassung
  // dieser Skizze — genau der in 0.3 belegte Bug.
  await page.waitForTimeout(50)
  await page.keyboard.press('Enter')
  await page.keyboard.type('Dritter Absatz.')

  await expect(editor).toContainText('Erster Absatz.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(editor).toContainText('Dritter Absatz.')
  await expect(page.locator('.ProseMirror .pm-page-break-before')).toHaveCount(1)
  assertNoConsoleErrors()
})
```

Muss **zusätzlich** zur neuen Datei `seitenumbruch.spec.ts` direkt im bestehenden
`describe`-Block von `selection-regression.spec.ts` verankert werden (Code-Plan Abschnitt
14.4) — sonst verliert die Regressionssuite diesen Fall bei künftigen Refactorings aus dem
Blick.

### 2.7 Grenzfälle im Editor (echte Bedienung)

| ID | Testfall | Prüfung |
|---|---|---|
| E2E-EDGE-01 | Cursor ganz am Dokumentanfang (`Home`, dann zusätzlich `ControlOrMeta+Home` falls nötig) → Umbruch einfügen | Dokumentiertes Verhalten (leere erste Seite ODER bewusster No-Op laut finaler Design-Entscheidung) tritt tatsächlich ein, kein Crash, Originaltext bleibt vollständig sichtbar (Grenzfall 1) |
| E2E-EDGE-02 | Cursor ganz am Dokumentende → Umbruch einfügen | Neue leere Folgeseite sichtbar (`.page-break-spacer--manual` erscheint als letztes Element) (Grenzfall 2) |
| E2E-EDGE-03 | Zwei Umbrüche direkt hintereinander ohne Text dazwischen | Zwei separate `.page-break-spacer--manual`-Elemente, keine Zusammenlegung (Grenzfall 3) |
| E2E-EDGE-04 | Tabelle einfügen (`getByRole('button', {name: 'Tabelle einfügen'})`), Cursor in eine Zelle, Umbruch-Shortcut drücken | Tabellenstruktur bleibt vollständig intakt (`page.locator('.ProseMirror table')` weiterhin vorhanden, Zellenanzahl unverändert), kein Absturz, dokumentiertes Fallback-Verhalten tritt ein (Grenzfall 4) |
| E2E-EDGE-05 | Liste einfügen, Cursor in einem Listenpunkt, Umbruch einfügen, danach weiteren Listenpunkt hinzufügen | Nummerierung bleibt fortlaufend über den Umbruch hinweg (z. B. „1., 2., 3." nicht „1., 1., 2.") — `page.locator('.ProseMirror li')`-Reihenfolge/Text prüfen (Grenzfall 5) |
| E2E-EDGE-06 | Überschrift eingeben, Cursor mittendrin, Umbruch einfügen | Beide Fragmente bleiben als `h1`-`h6`-Element erkennbar (laut dokumentierter Entscheidung, Grenzfall 6) |
| E2E-EDGE-07 | Bild einfügen, Cursor direkt davor **und** separat direkt danach, jeweils Umbruch einfügen | Bild bleibt exakt einmal im DOM vorhanden (keine Duplizierung), landet je nach Cursor-Position eindeutig auf der Seite davor/danach (Grenzfall 12) |
| E2E-EDGE-08 | Drei „Kapitel"-Absätze, je durch einen manuellen Umbruch getrennt | Alle drei `.page-break-spacer--manual`-Elemente einzeln vorhanden, in der richtigen Reihenfolge (Grenzfall 9) |

**Determinismus-Hinweis zu 2.7 (Regel 1/3/4):** In E2E-EDGE-01/04/05/06/07 wird der Cursor vor
dem Umbruch **in** eine Zelle/einen Listenpunkt/eine Überschrift/neben ein Bild gesetzt (Klick
oder Pfeil = nativer Caret-Move). Zwischen diesem Positionieren und dem auslösenden
`ControlOrMeta+Enter` **muss** ein `await page.waitForTimeout(50)` stehen (Regel 1), sonst kann der
Umbruch am falschen Ort landen. Zellauswahl über `page.locator('.ProseMirror td').nth(i).click()`
(Muster `selection-regression.spec.ts:48–49`), nicht über Pixelkoordinaten (Regel 3). Für
E2E-EDGE-01 („Dokumentanfang") `ControlOrMeta+Home` statt `Home` (Regel 4).

### 2.8 Datei-Rundreise über echten Download + echten Re-Upload (Req-Abschnitt 5.2, Punkte 1/2)

**DOCX:**

```ts
test('page break survives a real export + re-upload round trip (DOCX)', async ({ page }) => {
  const assertNoConsoleErrors = watchForConsoleErrors(page) // Regel 6 (2.1.1)
  // Sicherheitsnetz gegen den beforeunload-Guard beim späteren reload() (Regel 7): falls das
  // Dokument wider Erwarten noch dirty wäre, den Bestätigungsdialog automatisch akzeptieren,
  // statt den Test hängen zu lassen.
  page.on('dialog', (d) => void d.accept())

  await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Vor dem Umbruch.')
  // insertPageBreak ist synchron (Regel 2) — direkt danach tippen ist korrekt.
  await page.keyboard.press('ControlOrMeta+Enter')
  await page.keyboard.type('Nach dem Umbruch.')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const downloadedPath = await download.path()
  expect(downloadedPath).toBeTruthy()

  const fs = await import('node:fs/promises')
  const exportedBuffer = await fs.readFile(downloadedPath!)
  const zip = await JSZip.loadAsync(exportedBuffer)
  const documentXml = await zip.file('word/document.xml')!.async('text')

  // Echte Prüfung der heruntergeladenen Datei, nicht nur des DOM:
  expect(documentXml).toContain('<w:br w:type="page"/>')
  expect(documentXml).not.toContain('<w:lastRenderedPageBreak')
  expect(documentXml).toContain('Vor dem Umbruch.')
  expect(documentXml).toContain('Nach dem Umbruch.')

  // Regel 7: der Export hat das Dokument clean gemacht — erst DAS abwarten, dann ist reload()
  // deterministisch dialogfrei (save-export-lifecycle.spec.ts, Testfall 15).
  await expect(page.getByText('● ungespeichert')).toHaveCount(0)

  // Echter Re-Upload derselben Datei in eine frische Sitzung:
  await page.reload()
  await page.getByRole('button', { name: /verstanden/i }).click()
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({
    name: 'umbruch.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: exportedBuffer,
  })

  await expect(page.locator('.ProseMirror')).toContainText('Vor dem Umbruch.')
  await expect(page.locator('.ProseMirror')).toContainText('Nach dem Umbruch.')
  await expect(page.locator('.ProseMirror .pm-page-break-before')).toHaveCount(1)
  assertNoConsoleErrors()
})
```

| ID | Testfall | Kernprüfung |
|---|---|---|
| E2E-RT-DOCX-01 | wie oben | `<w:br w:type="page"/>` in der echten heruntergeladenen Datei, beide Texte, Re-Upload zeigt Umbruch + Texte |
| E2E-RT-ODT-01 | identischer Ablauf auf der ODT-Karte | Heruntergeladene `.odt`-Datei (per `JSZip` gegen `content.xml`) enthält `fo:break-before="page"` im referenzierten Style; Re-Upload zeigt Umbruch + Texte |
| E2E-RT-DOCX-02 | Drei Kapitel-Absätze mit je einem Umbruch → Export → Re-Upload | Alle drei Umbrüche und alle drei Texte bleiben nach echtem Re-Upload einzeln erhalten (Grenzfall 9, Req 5.2.5) |
| E2E-RT-DOCX-03 | Umbruch in Kombination mit Tabelle/Bild/Liste im selben Dokument → Export → Re-Upload | Kumulativer Verlust-Test: Umbruch **und** alle übrigen Strukturen (Tabellenzellen, Bild-`src`, Listenpunkte) bleiben gleichzeitig erhalten (Req 5.2.6) |
| E2E-RT-BASELINE-DOCX | Reale DOCX-Datei **ohne** jeden manuellen Umbruch hochladen → sofort exportieren → Datei-Inhalt prüfen | **Kein** `<w:br w:type="page"/>` im Export, obwohl ggf. `<w:lastRenderedPageBreak/>` im Original enthalten war (Req 5.1.1, Baseline) |
| E2E-RT-BASELINE-ODT | Reale ODT-Datei **ohne** jeden manuellen Umbruch (aber mit `text:soft-page-break`) hochladen → sofort exportieren → Datei-Inhalt prüfen | **Kein** `fo:break-before`/`fo:break-after` im Export (Req 5.1.2, Baseline) |

### 2.9 Import echter Fremddateien + Re-Export + Re-Import (Req 5.2, Punkte 7/8)

| ID | Testfall (`input.setInputFiles` mit echter Datei vom Datenträger) | Prüfung |
|---|---|---|
| E2E-IMPORT-01 | `tests/fixtures/external/docx/saut_page.docx` in DOCX-Karte hochladen | Editor zeigt an den erwarteten Stellen sichtbar `.pm-page-break-before`-markierte Absätze; einfacher `<w:br/>` bleibt als Zeilenumbruch ohne diese Markierung |
| E2E-IMPORT-02 | Direkt im Anschluss an E2E-IMPORT-01: Exportieren → Re-Upload der exportierten Datei | Umbrüche weiterhin sichtbar nach zweitem Zyklus (Req 5.2.7) |
| E2E-IMPORT-03 | `tests/fixtures/external/docx/60329.docx` hochladen | Editor zeigt **keinen** `.pm-page-break-before`-Absatz (nur `lastRenderedPageBreak`, korrekt ignoriert) |
| E2E-IMPORT-04 | `tests/fixtures/external/odt/pagebreaks.odt` in ODT-Karte hochladen | Editor zeigt Umbrüche für `P1`/`P2` (`break-before`) **und** korrekt verschobenen Umbruch für `P3` (`break-after`) |
| E2E-IMPORT-05 | Direkt im Anschluss an E2E-IMPORT-04: Exportieren → Re-Upload | Alle Umbrüche bleiben erhalten (Req 5.2.8) |
| E2E-IMPORT-06 | `tests/fixtures/external/odt/text-extract.odt` hochladen | Editor zeigt **keine** `.pm-page-break-before`-Markierung (nur `text:soft-page-break`, korrekt ignoriert) |
| E2E-IMPORT-07 | `tests/fixtures/external/odt/no_pagebreak.odt` hochladen | Tabellenzellen-Inhalt vollständig sichtbar, **kein** zusätzlicher Top-Level-Seiten-Spacer (Grenzfall 4/Zusatzbefund D) — bewusst dokumentierte Einschränkung, kein Bug |

### 2.10 Baseline-E2E-Regression (Anforderung 5.1)

| ID | Testfall | Erwartung |
|---|---|---|
| E2E-BASE-01 | Alle **bestehenden** Tests in `tests/e2e/docx.spec.ts`, `tests/e2e/odt.spec.ts`, `tests/e2e/selection-regression.spec.ts`, `tests/e2e/lifecycle.spec.ts` | Bleiben nach Einführung des Features unverändert grün — insbesondere darf der neue `Mod-Enter`-Keymap-Eintrag **keine** bestehende Tastenkombination (`Mod-z`, `Mod-y`, `Enter` in Listen, `Mod-b/i/u`) stören |

### 2.11 Cross-Format E2E (dokumentierte Lücke, siehe Abschnitt 0.2)

Kein Testfall dieser Ebene für Req 5.2 Punkte 3/4 möglich, solange die App keine
Format-Konvertierungsfunktion anbietet. Wird in der Abnahme (Abschnitt 4) als offener Punkt
geführt, nicht stillschweigend als „erledigt" markiert.

---

## 3. Traceability-Matrix (Anforderung → Testfall)

| Anforderungsteil | Abgedeckt durch |
|---|---|
| Abschnitt 1 (Bedienelemente: Toolbar, Shortcut, Kennzeichnung, Löschen) | E2E-INSERT-01/02, E2E-VISUAL-01/02/03, E2E-DELETE-01/02/03 |
| 3.1/3.2 (Grundfall, Selektion) | UT-CMD-01/02, E2E-INSERT-01/04 |
| 3.3 (Datenmodell) | UT-DOCX-W-01/02/03, UT-ODT-W-01/02 |
| 3.4/3.5 (DOCX Export/Import) | UT-DOCX-W-*, UT-DOCX-RT-*, UT-DOCX-FIX-01/02 |
| 3.6/3.7 (ODT Export/Import) | UT-ODT-W-*, UT-ODT-RT-*, UT-ODT-FIX-* |
| 3.8 (Zusammenspiel Paginierung) | UT-PAG-01–07, E2E-VISUAL-03 |
| 3.9 (Undo/Redo) | UT-CMD-10/11, E2E-DELETE-02 |
| 3.10 (kein stiller Fehlschlag) | UT-CMD-08/09, E2E-EDGE-04/07 |
| Grenzfall 1–13 | UT-CMD-03/04/05/06/07/08/09, UT-PAG-05/06, E2E-EDGE-01–08, UT-ODT-FIX-04 |
| Req 5.1 (Baseline-Rundreise) | UT-BASE-01, E2E-RT-BASELINE-DOCX/ODT, E2E-BASE-01 |
| Req 5.2 Punkte 1/2 (Feature-Rundreise DOCX/ODT) | UT-DOCX-RT-*, UT-ODT-RT-*, E2E-RT-DOCX-01, E2E-RT-ODT-01 |
| Req 5.2 Punkte 3/4 (Cross-Format) | UT-XFMT-01/02/03 (Unit); **E2E nicht ausführbar, siehe 0.2/2.11** |
| Req 5.2 Punkt 5 (mehrere Umbrüche) | UT-DOCX-RT-04, E2E-RT-DOCX-02, E2E-EDGE-08 |
| Req 5.2 Punkt 6 (Kombination mit anderen Strukturen) | E2E-RT-DOCX-03 |
| Req 5.2 Punkte 7/8 (reale Fremddateien) | UT-DOCX-FIX-*, UT-ODT-FIX-*, E2E-IMPORT-01–07 |
| Selection-Sync-Regression (Grenzfall 7) | E2E-REGRESSION (Abschnitt 2.6, zusätzlich in `selection-regression.spec.ts` verankert) |
| Testplan-Hinweise Abschnitt 6, Punkt 7 (Unit **und** E2E für Rundreise) | Beide Ebenen jeweils oben geführt, keine der beiden ersetzt die andere |
| Auftrag: **deterministische** Tests (kein Race durch zu schnelle Tastatur, Selektions-Sync abwarten) | Abschnitt 0.3 (Befund) + 2.1.1 (Regeln 1–7) + korrigierte Skizzen 2.6/2.8 + Determinismus-Hinweise zu 2.3/2.4/2.5/2.7 + Abnahme-Gate in Abschnitt 4 |

---

## 4. Abnahmekriterien dieses Testplans

Der Status „vorhanden" (Req-Abschnitt 7) darf aus QA-Sicht erst vergeben werden, wenn:

- [ ] **UT-DOCX-RT-BREAK-OWN-TEXT** grün ist (Abschnitt 0.1) — bei Rot ist der DOCX-Reader
      (`paragraphToBlocks`, Code-Plan Abschnitt 9.3) vor jeder weiteren Abnahme zu korrigieren,
      unabhängig davon, was sonst grün ist.
- [ ] Alle Unit-Tests aus Abschnitt 1 (inkl. neuer Dateien `commands.test.ts`,
      `docx/pagebreak.test.ts`, `odt/pagebreak.test.ts`,
      `shared/pagebreak-crossformat.test.ts`) grün.
- [ ] Alle Playwright-Tests aus Abschnitt 2 grün — insbesondere die Datei-Rundreise-Tests
      2.8/2.9, die tatsächlich heruntergeladene/hochgeladene Dateien prüfen, nicht nur
      DOM-Zustand.
- [ ] Baseline-Regression (1.10, 2.10) vollständig grün — insbesondere `60329.docx` und
      `text-extract.odt` erzeugen weiterhin keinen `breakBefore`.
- [ ] Cross-Format-Anforderung (Req 5.2.3/5.2.4) ist mindestens auf Unit-Ebene (UT-XFMT-*)
      grün; die fehlende E2E-Abdeckung (Abschnitt 0.2/2.11) ist mit PO/Dev **explizit**
      besprochen und der Status entsprechend als „teilweise (App-seitige Cross-Format-UI fehlt,
      unabhängig vom Seitenumbruch-Feature)" dokumentiert, falls dort keine Einigung erzielt
      wird.
- [ ] Alle 13 Grenzfälle aus Req-Abschnitt 4 sind einzeln mit Testergebnis befundet
      (funktioniert / bewusst abweichend + dokumentiert / repariert), nicht pauschal
      „erledigt".
- [ ] **Determinismus (Abschnitt 0.3/2.1.1) eingehalten und belegt:** jeder neue E2E-Test hält
      Regeln 1–7 ein — kein nativer Caret-Move (`End`/`Home`/Pfeil/Klick) unmittelbar vor einer
      mutierenden Taste **ohne** den `waitForTimeout(50)`-Sync; kein Fixed-Pixel-Maus-Drag; keine
      festen Sleeps außer für den Selektions-Sync-Übergang; `watchForConsoleErrors` aktiv; der
      Re-Upload-Fluss beachtet den Lifecycle-Guard. Nachweis: die gesamte Suite läuft auf
      **allen drei** Default-Projekten (`Desktop Chrome`/`Mobile`/`Tablet`) **grün, ohne
      Retry-Abhängigkeit** — ein Test, der nur mit `retries: 1` grün wird, gilt als flaky und
      **nicht** bestanden.
- [ ] Selection-Sync-Regressionstest (2.6) ist **zusätzlich** dauerhaft in
      `tests/e2e/selection-regression.spec.ts` verankert (Code-Plan 14.4), nicht nur in
      `seitenumbruch.spec.ts`.

Andernfalls: Status „teilweise", mit Verweis auf die konkret offenen Punkte aus dieser Liste
— analog zur in `seitenumbruch-req.md` Abschnitt 7 festgelegten Vorgehensweise.
