# Umsetzungsplan „Seitenlayoutansicht (Druckansicht)" — dateigenau, gegen den tatsächlichen Code geprüft

Bezug: `E:\docs\specs\seitenlayout-ansicht-req.md` (Anforderung), `E:\docs\FEATURE-SPEC-DOCX-ODT.md`
(Rahmenbedingungen, Abschnitte 2/8/9/15/18/19/20), `E:\docs\specs\FEATURE-BACKLOG.md` Abschnitt 8.1.
Code-Stand **re-verifiziert am 2026-07-05** in `E:\docs` (Git-Repo, Branch `main`; Datei-Inhalte direkt
gelesen). Zeilenangaben sind **indikativ** — load-bearing ist jeweils der zitierte, exakte Code-String,
gegen den ein Entwickler die Stelle re-verankern muss, nicht die Zeilennummer. Insbesondere
`WordEditor.tsx` ist seit einem früheren Entwurf durch das „Ausschneiden"-Feature
(`cutError`/`setCutError`, `useAutoDismiss`) um ca. 8 Zeilen auf **185 Zeilen** gewachsen; alle
`WordEditor.tsx`-Referenzen unten wurden bei dieser Re-Verifikation auf diesen aktuellen Stand
aktualisiert (frühere Fassungen dieser code.md nannten pre-growth-Zeilen wie 65/95/119–130/122/160–176,
die nicht mehr stimmen).

**WICHTIG — Korrektur eines früheren Entwurfs dieser Datei (analog zur Selbstkorrektur in der
Anforderungsdatei Befund 4):** Ein früherer Entwurf dieser code.md behauptete an mehreren Stellen
(alt: Abschnitt 0.1 Punkt 4, 0.3, 3.6, 3.7, 4.8), (a) der DOCX-Writer schreibe **kein**
`w:pgSz`/`w:pgMar` und eine exportierte Datei falle in Word auf den Locale-Default zurück, (b) der
ODT-Writer setze ein **hartkodiertes String-Literal** `<style:page-layout>`, und (c) die Datei
`tests/e2e/large-document-import.spec.ts` **existiere nicht**. **Alle drei Behauptungen sind gegen den
aktuellen Code überholt und wurden hier korrigiert:** `src/formats/docx/pageSetup.ts` existiert und
liefert `defaultPageSetupXml()`; `src/formats/docx/writer.ts` Zeile 275 hängt es an
(`sectPrExtra += defaultPageSetupXml()`); `src/formats/odt/writer.ts` Zeile 222 leitet die Geometrie
über `mmToCm()` aus `pageGeometry.ts` **ab** (kein Literal); und
`tests/e2e/large-document-import.spec.ts` existiert und misst DOCX- **und** ODT-Import-Performance.
Diese Korrektur ist der wichtigste Einzelbefund der Re-Verifikation und unterstreicht, warum jeder Plan
gegen den **aktuellen** Code laufen muss.

Rolle dieses Dokuments: bestätigt den Codebefund aus `seitenlayout-ansicht-req.md` Abschnitt 0 mit
exakten Zeilenreferenzen und ergänzt eigene Zusatzbefunde (Abschnitt 0), trifft die
Architekturentscheidungen zur Behebung (Abschnitt 1), grenzt explizit ab, was **nicht** Teil dieses
Plans ist (Abschnitt 1.5), und spezifiziert dateigenau Schema-/Commands-Auswirkungen (keine, Abschnitt 2),
die konkreten Code-Änderungen (Abschnitt 3), die Import/Export-Anpassungen für OOXML/DOCX und ODF/ODT
(reine Dokumentations-Kommentare, kein Verhalten, Abschnitt 3.6–3.7), Toolbar-Auswirkungen (keine,
Abschnitt 3.8) sowie Tests (Abschnitt 4), Grenzfall- und Testplan-Mapping (Abschnitte 5–6) und eine
Freigabekriterium-Checkliste (Abschnitt 7).

---

## 0. Bestätigung des Codebefunds aus `seitenlayout-ansicht-req.md` Abschnitt 0 + Zusatzbefunde

### 0.1 Vollständig bestätigt

Gegen den tatsächlichen Dateiinhalt geprüft — alle 14 Befunde aus der Anforderungsdatei sind
**zutreffend**, inklusive der dort zitierten Zeilennummern:

1. Kein Umschalter zwischen Ansichtsmodi. `Toolbar.tsx` (248 Zeilen) hat keinen View-Umschalter;
   `WordEditor.tsx` rendert exakt einen Modus.
2. `pageLayout.ts` (32 Zeilen): `PAGE_WIDTH_PX = 794` (Zeile 7), `PAGE_HEIGHT_PX = 1123` (Zeile 8),
   `PAGE_MARGIN_PX = 94` (Zeile 9), `PAGE_SEPARATOR_PX = 32` (Zeile 11), `PAGE_GAP_PX` (Zeile 16),
   `pageBackgroundStyle()` (Zeilen 23–31) — periodische CSS-`linear-gradient`-Bänderung mit fester
   Pixel-Periode. `pagination.ts` (115 Zeilen): `computePageBreakIndices` (12–25),
   `measureAndBuildDecorations` (33–63) misst reale DOM-Höhen unabhängig davon.
3. `WordEditor.tsx` Zeilen 168–184 (Ist-Stand): **ein** `containerRef`-Div (Zeile 180) in **einem**
   `shadow-lg`-Wrapper (Zeile 178) — kein Schatten pro simulierter Seite.
4. **(KORRIGIERT gegenüber früherem Entwurf — deckt sich jetzt mit Anforderungsdatei Befund 4.)**
   Seitengeometrie wird beim Export **aktiv geschrieben**, aber beim Import **nie gelesen**:
   - `src/formats/docx/pageSetup.ts` (14 Zeilen, neu): `defaultPageSetupXml()` erzeugt
     `<w:pgSz w:w="11906" w:h="16838"/>` und
     `<w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/>`
     — die Werte kommen über `mmToTwips()` aus **denselben** `pageGeometry.ts`-Konstanten wie die
     Bildschirmsimulation (11906/16838 Twips = 210/297 mm = A4; 1417 Twips = 25 mm).
   - `docx/writer.ts` Zeile 275: `sectPrExtra += defaultPageSetupXml()`; `buildDocumentXml`
     (Zeilen 207–211) schreibt `<w:body>${bodyXml}<w:sectPr>${sectPrExtra}</w:sectPr></w:body>`. Der
     DOCX-Export transportiert also **aktiv** A4/25 mm — **nicht** mehr „kein pgSz/pgMar", wie ein
     früherer Entwurf fälschlich behauptete.
   - `odt/writer.ts` Zeile 222: `<style:page-layout style:name="PL1"><style:page-layout-properties
     fo:margin="${mmToCm(PAGE_MARGIN_MM)}" fo:page-width="${mmToCm(PAGE_WIDTH_MM)}"
     fo:page-height="${mmToCm(PAGE_HEIGHT_MM)}"/></style:page-layout>` (Ergebnis:
     `fo:margin="2.5cm" fo:page-width="21cm" fo:page-height="29.7cm"`) — über `mmToCm()` (Zeile 20)
     aus `pageGeometry.ts` **abgeleitet**, **kein** Literal-String. `<style:master-page
     style:name="Standard" style:page-layout-name="PL1">` (Zeile 226) referenziert diese Geometrie.
   - **Die weiterhin gültige Lücke ist die Lese-Seite:** `docx/reader.ts` Zeile 507–512 liest `sectPr`
     **ausschließlich** für `headerReference`/`footerReference`, **kein** `w:pgSz`/`w:pgMar` (per Grep
     über die gesamte Datei bestätigt: null Treffer). `odt/reader.ts` Zeile 375–387 liest
     `style:master-page` **nur** für `style:header`/`style:footer`, **nicht**
     `fo:page-width`/`fo:page-height`/`fo:margin*`.
   - **Konsequenz:** Bildschirm, DOCX-Export und ODT-Export sind **konsistent** auf A4/25 mm (alle drei
     aus `pageGeometry.ts`), aber ein importiertes Dokument mit **abweichendem** Ursprungsformat
     (US Letter/Legal, individuelle Ränder) wird als A4/25 mm angezeigt **und** beim Export **aktiv**
     nach A4/25 mm überschrieben — Seitenformat-Informationsverlust (kein Textverlust), zu
     dokumentieren, bis `seitenraender`/`seitenausrichtung`/`papierformat` gebaut sind.
5. `WordEditor.tsx` seedet den State ausschließlich aus `doc.content.body` (Zeile 79) und rendert nur
   diesen; `header`/`footer` (im Datenmodell vorhanden, `documentModel.ts` `WordDocumentContent.header`/
   `.footer`) werden nirgends dargestellt, bleiben aber beim Speichern erhalten (Zeile 129:
   `onChangeRef.current({ ...doc.content, body: newState.doc.toJSON() })`).
6. Zwei unabhängige Berechnungen: `pageBackgroundStyle()` (feste Periode
   `PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX`) vs. `measureAndBuildDecorations` (reale gemessene Höhen).
   Bestätigt als struktureller Drift — siehe Abschnitt 1.1 für die Root-Cause-Analyse mit konkreten
   Zahlenbeispielen.
7. Kein `window`-`resize`-Listener in `createPaginationPlugin()` (Zeilen 88–104 des Ist-Standes).
8. Kein `onload`-Reflow für Bilder.
9. `PAGE_WIDTH_PX` fest, `WordEditor.tsx` Zeile 174 setzt `width: PAGE_WIDTH_PX` inline (im Wrapper-
   `style`-Objekt Zeilen 173–177).
10. `pageBackgroundStyle()` verwendet Literal `white` (`pageLayout.ts` Zeile 26), Scroll-Container
    `bg-neutral-200 dark:bg-neutral-950` (`WordEditor.tsx` Zeile 171) — kein In-App-Light/Dark-Umschalter.
11. `Toolbar.tsx` bestätigt: kein Zoom, kein Lineal, keine Seitenzahl-Anzeige, keine
    Mehrfach-Seiten-Nebeneinander-Ansicht, kein Formatierungszeichen-Toggle, kein Navigationsbereich.
12. `pagination.test.ts` (51 Zeilen) deckt ausschließlich `computePageBreakIndices`/`computePageCount`
    als reine Arithmetik ab. `tests/e2e/` enthält aktuell **17** `*.spec.ts`-Dateien (verifiziert per
    Verzeichnislisting 2026-07-05: `clipboard-roundtrip`, `clipboard`, `complex-import-fidelity`, `cut`,
    `docx`, `export-error-handling`, `file-open-edge-cases`, `large-document-export`,
    `large-document-import`, `lifecycle`, `network-isolation`, `new-document-qa`, `new-document`, `odt`,
    `roundtrip-fidelity`, `save-export-lifecycle`, `selection-regression`) plus den gemeinsamen
    Test-Harness `fixtures.ts` (mit `docxCard`/`odtCard`) und das `fixtures/`-Verzeichnis — **keine** davon
    hat aktuell Bezug zu Seitenlayout/Paginierung. Neue E2E-Tests dieses Plans (Abschnitt 4.2–4.7/4.9) sind über
    den bestehenden `./fixtures`-Harness (`test`, `docxCard`, `odtCard`) zu schreiben, nicht mit
    hand-gerolltem `page.goto('/')`.
13. Kein `@media print`, kein `window.print()` im gesamten Quellcode.
14. `pagination.ts` Zeile 93: `view.dispatch(view.state.tr.setMeta(paginationKey, next))` — reine
    Meta-Transaktion, `tr.docChanged` bleibt `false`, `WordEditor.tsx` Zeile 94 prüft `tr.docChanged`
    vor dem `onChange`-Aufruf. Korrekt, aber **nicht** durch einen Test abgesichert (`paginationKey`
    ist zudem nicht exportiert, siehe 0.4).

### 0.2 Zusatzbefund A: `.page-break-spacer` hat in der Praxis **keinerlei** visuelles Signal

`src/index.css` Zeilen 69–71:

```css
.page-break-spacer {
  width: 100%;
}
```

Das ist die **einzige** CSS-Regel für diese Klasse — keine Hintergrundfarbe, kein Rahmen, kein
Schatten. Die Höhe wird zwar per Inline-Style von `pagination.ts` gesetzt (Zeile 51:
`spacer.style.height = ...`), aber visuell ist der Spacer komplett unsichtbar; die gesamte optische
„Seitentrennung" hängt ausschließlich am unabhängig berechneten `pageBackgroundStyle()`. Das ist
konkreter Beleg für Befund 2/3 aus der Anforderungsdatei (Ein-Schatten-für-den-Stapel,
Streifen-statt-Blätter-Risiko) — nicht nur besteht das Risiko einer Zwei-Berechnungen-Diskrepanz, das
zweite System (der Spacer) trägt aktuell **überhaupt nichts** zur sichtbaren Seitenoptik bei.

### 0.3 Zusatzbefund B (KORRIGIERT): der Performance-Test existiert bereits — offen ist nur der Paginierungs-Bezug

Ein früherer Entwurf behauptete, `tests/e2e/large-document-import.spec.ts` **existiere nicht**. **Das
ist überholt:** die Datei existiert und misst bereits die Import-Performance zweier realer
Groß-Fixtures — DOCX (`bug65649.docx`, ~12 MB, ~16 000 Absätze) **und** ODT (`brokenList.odt`, 2,4 MB,
~20 000 automatische Styles) — jeweils mit „Tab nicht eingefroren"-Beweis (`page.evaluate`) und einer
harten 15-s-Obergrenze. Anforderungsdatei Abschnitt 3.7 („Performance bei langen Dokumenten … unter
realistischer Dokumentgröße") ist damit auf der **Import**-Ebene bereits abgedeckt. **Offen bleibt nur
der Paginierungs-spezifische Aspekt:** dass nach dem Import eines mehrseitigen Groß-Dokuments die
`rAF`-Neumessung/`computePageBreakIndices`-Neuberechnung nicht zu spürbarem Tipp-Lag führt und
`data-page-count` einen plausiblen Wert > 1 trägt. Dieser Plan **erweitert** die bestehende Datei um
genau diese Zusatz-Assertion (Abschnitt 4.8) statt eine neue anzulegen.

### 0.4 Zusatzbefund C: `paginationKey` ist modul-privat — blockiert die von Abschnitt 5.1/6 der
Anforderungsdatei verlangte Rundreise-Regressionstest

`pagination.ts` Zeile 31: `const paginationKey = new PluginKey<DecorationSet>('pagination')` — **nicht
exportiert**. Der in Anforderung Abschnitt 5.1 Punkt 3 / Abschnitt 6 Punkt 2 geforderte Unit-Test
(„eine Transaktion, die ausschließlich `tr.setMeta(paginationKey, …)` setzt, muss
`tr.docChanged === false` ergeben") kann ohne Zugriff auf **denselben** `PluginKey`-Objektinstanz nicht
geschrieben werden (`tr.getMeta`/`setMeta` sind identitätsbasiert über die Key-Instanz, ein neu
erzeugter zweiter `PluginKey('pagination')` mit gleichem String-Namen ist **nicht** derselbe Schlüssel
— geprüft gegen `node_modules/prosemirror-state/dist/index.js`, `PluginKey.get`/`getState` matchen
über Objektidentität, nicht über den String). Muss exportiert werden (Abschnitt 3.2).

### 0.5 Zusatzbefund D: Schnittstelle zu `specs/seitenumbruch-code.md` (paralleler Plan, **noch nicht
umgesetzt**)

`specs/seitenumbruch-code.md` plant für denselben `pagination.ts` (dort Abschnitt 7) eine Erweiterung
um `forcedBreakIndices` (dritter Parameter von `computePageBreakIndices`), eine Erweiterung der
Decoration-`key`s um `-manual`/`-auto` und eine Korrektur von `sameDecorationSet`. **Verifiziert: noch
nicht umgesetzt** — `schema.ts` hat kein `breakBefore`-Attribut, `commands.ts` kein
`insertPageBreak`. Dieser Plan hier modifiziert **dieselben** Funktionen (`measureAndBuildDecorations`,
`sameDecorationSet`, das Plugin-State-Shape) aus einem anderen Grund (Filler/Seitenzahl statt
manueller Umbrüche). Damit beide Pläne unabhängig von der Umsetzungsreihenfolge zusammenpassen, ist
dieser Plan bewusst so entworfen, dass er **orthogonal** zum anderen bleibt (siehe Abschnitt 1.4) —
wer auch immer zuletzt landet, muss nur die in 1.4 benannten drei Berührungspunkte manuell mergen,
nicht die Architektur neu entwerfen.

### 0.6 Zusatzbefund E (KRITISCH, neu in dieser Re-Verifikation): die Höhenmessung misst `view.dom.children` **inklusive der bereits gerenderten Spacer-Widgets**

`pagination.ts` Zeile 35 (Ist-Stand): `const children = Array.from(dom.children)` mit `dom = view.dom`
(das contenteditable `.ProseMirror`-Content-Element). ProseMirror rendert Block-Widget-Decorations —
und genau das sind die `page-break-spacer`-Divs (`Decoration.widget(offset, …, { side: -1 })` an einer
Top-Level-Position, Zeilen 46–57 Ist-Stand) — als **direkte Geschwister** der Block-DOM-Knoten, also als
eigene Einträge in `view.dom.children`.

- Beim **ersten** Messlauf (Init-`rAF`, `state.init` liefert `DecorationSet.empty`) ist das unkritisch:
  `children` enthält nur echte Blöcke.
- Sobald aber der erste Durchlauf Spacer eingefügt hat, enthält **jeder folgende** `update`-getriggerte
  Messlauf die Spacer als **zusätzliche** `children`-Einträge.

Daraus folgen zwei Fehler ab dem zweiten Durchlauf:
1. **Index-Versatz.** `computePageBreakIndices(heights, …)` liefert Indizes in die (jetzt
   spacer-**enthaltende**) `children`-Reihenfolge, während die Decoration-Platzierung über
   `view.state.doc.forEach((_node, offset, index) => …)` (Zeile 43 Ist-Stand) gegen den
   **Dokument-Knoten**-Index `index` matcht. Widgets sind **keine** Dokument-Knoten und zählen dort nicht
   mit — die beiden Indexräume laufen also auseinander, sobald ein Spacer im DOM steht.
2. **Verfälschte Höhensummen.** Die ~`PAGE_GAP_PX` (220px, plus künftig der Filler aus 1.1) hohen
   Spacer-Einträge fließen als Pseudo-„Blöcke" in `heights` ein und verschieben `computePageBreakIndices`/
   `computePageCount` **und** das in Abschnitt 3.2 neu eingeführte `computeFillerBeforeBreaks`.

Das ist eine **plausible, bislang weder in der Anforderungsdatei (Befund 6 nennt nur die Unabhängigkeit
Hintergrundraster vs. Spacer) noch in einem früheren Entwurf dieser code.md benannte Mit-Ursache** des
beobachteten Drifts: nicht nur „zwei unabhängige Berechnungen", sondern eine echte **Fehlmessung** nach
dem ersten Durchlauf. Dass das bestehende `pagination.test.ts` das nicht aufdeckt, ist erwartbar — es
testet ausschließlich reine Arithmetik, **nie** das DOM-Zusammenspiel (genau die in Befund 12 beklagte
Testlücke).

**Status:** aus dem Code hergeleitet, **in-Browser noch zu bestätigen**. **Der Fix ist jedoch unabhängig
vom Bestätigungsergebnis gefahrlos** und wird deshalb defensiv in Abschnitt 3.2 mitgebaut: vor dem Messen
alle `.page-break-spacer` aus `children` herausfiltern. Führt ProseMirror die Spacer (wie erwartet) als
`view.dom.children`, behebt der Filter den Index-Versatz **strukturell** — jeder Messlauf misst dann
wieder nur echte Blöcke und ist **idempotent** zum ersten. Führt ProseMirror sie wider Erwarten nicht als
direkte Kinder, ist der Filter ein folgenloser No-op. **Dieser Filter ist Voraussetzung dafür, dass der
Filler-Fix aus Abschnitt 1.1 überhaupt gegen korrekte `heights` rechnet** — ohne ihn füllte
`computeFillerBeforeBreaks` gegen verfälschte Höhen auf und würde den Drift eher verschlimmern als
beheben. Verifikationshaken: neuer E2E-Assert, dass die Spacer-Anzahl nach mehreren `update`-Zyklen
stabil bleibt (Abschnitt 4.2, Konsistenz `pageCount === spacerCount + 1` auch nach fortgesetztem Tippen).

---

## 1. Architekturentscheidungen

### 1.1 Root-Cause-Fix für Befund 6: dynamischer Füll-Abstand statt Nachjustieren

**Entscheidung:** Der zwischen zwei Seiten eingefügte Spacer bekommt **zusätzlich** zu seiner
bisherigen festen Höhe (`PAGE_GAP_PX`) einen dynamisch berechneten „Filler" in Pixeln, der die
tatsächlich gerenderte Inhaltshöhe der *endenden* Seite exakt auf `PAGE_CONTENT_HEIGHT_PX` auffüllt,
**bevor** der eigentliche Rand/Lücken-Abstand beginnt.

**Begründung — konkretes Zahlenbeispiel gegen den tatsächlichen Algorithmus:** Bei
`heights = [290, 290]`, `pageContentHeight = 300` liefert `computePageBreakIndices` (Zeilen 12–25,
unverändert) einen Umbruch bei Index 1 (290 ≤ 300, kein Overflow bei Block 0; bei Block 1:
`cumulative(290) + height(290) = 580 > 300` → Umbruch). Die tatsächlich gerenderte Inhaltshöhe der
ersten Seite ist damit **290px**, nicht 300px — der Spacer wird nach 290px statt nach den vom
periodischen `pageBackgroundStyle()` angenommenen 300px eingefügt. Ergebnis: **10px Versatz nach der
ersten Seite**, der sich mit jeder weiteren Seite akkumulieren kann (exakt der in Befund 6
beschriebene Mechanismus, hier erstmals mit einem durchgerechneten Beispiel belegt statt nur
qualitativ beschrieben).

Die **richtige** Lösung ist nicht, das Hintergrundraster nachträglich an die (drifted) Spacer-Position
anzupassen (das würde nur das Symptom kaschieren, wo die Seite optisch endet, nicht dass eine reale
Word-/LibreOffice-Seite **immer** exakt `PAGE_HEIGHT_PX` hoch ist, unabhängig davon, wie viel Inhalt
sie trägt). Stattdessen wird der fehlende Rest **in den Dokumentenfluss selbst** eingefügt: ein
Spacer mit Höhe `PAGE_GAP_PX + filler`, wobei `filler = max(0, PAGE_CONTENT_HEIGHT_PX - cumulative)`
(`cumulative` ist exakt der Wert, den `computePageBreakIndices` im Moment des Umbruchs bereits
intern führt). Für das Beispiel oben: `filler = 300 - 290 = 10`. Damit reicht Seite 1 im DOM exakt bis
`PAGE_MARGIN_PX + PAGE_CONTENT_HEIGHT_PX` — danach folgt ohne Rest exakt `PAGE_GAP_PX` an
Rand/Lücke/Rand. Das eliminiert die Zwei-unabhängige-Berechnungen-Problematik **strukturell**, nicht
kosmetisch: die Seiten-Hintergrund-Ebene (Abschnitt 1.2) muss den realen Inhalt nicht mehr „einholen",
weil der reale Inhalt jetzt selbst auf die exakt erwartete Höhe gebracht wird.

**Verifikation der Rückwärtskompatibilität:** Für den Exakt-Passt-Fall (`heights=[100,100,100,150]`,
`pageContentHeight=300`, Umbruch bei Index 3 laut bestehendem Test `pagination.test.ts` Zeile 8–10)
ist `cumulative` beim Umbruch bereits `300` → `filler = max(0, 300-300) = 0` — **kein** zusätzlicher
Filler, Verhalten bytegleich zum Ist-Zustand für diesen Fall. Nur wenn eine Seite **nicht** exakt
gefüllt ist, wird jetzt korrekterweise aufgefüllt.

**Harte Abhängigkeit von Zusatzbefund E (Abschnitt 0.6):** Dieser Filler-Fix rechnet nur dann korrekt,
wenn `heights` **ausschließlich** echte Blockhöhen enthält. Solange die Messung `view.dom.children`
inklusive der bereits gerenderten `.page-break-spacer`-Widgets liest, füllt `computeFillerBeforeBreaks`
gegen verfälschte Höhen auf und verschlimmert den Drift. Der in Abschnitt 3.2c ergänzte Klassen-Filter ist
deshalb **kein optionaler Zusatz, sondern Bestandteil** dieses Root-Cause-Fixes.

### 1.2 Periodisches CSS-Hintergrundraster ersetzen durch deterministische Pro-Seite-„Blatt"-Elemente

**Entscheidung:** `pageBackgroundStyle()` (`pageLayout.ts` Zeilen 22–30) wird ersatzlos entfernt und
durch eine neue Komponente `PageSheets` ersetzt, die **eine feste Anzahl** (`pageCount`, aus der
Paginierung abgeleitet) absolut positionierter `<div>`-„Blätter" rendert — jedes mit eigenem
`box-shadow` (löst Befund/Element 2: „ein Schatten pro Seite" statt „ein Schatten für den ganzen
Stapel").

**Warum das nicht driften kann (Beweisskizze mit den echten Konstanten):** Mit
`PAGE_MARGIN_PX = 94`, `PAGE_CONTENT_HEIGHT_PX = 935`, `PAGE_HEIGHT_PX = 1123`,
`PAGE_SEPARATOR_PX = 32` gilt bereits heute (unverändert, `pageLayout.ts` Zeile 12):
`PAGE_HEIGHT_PX = PAGE_CONTENT_HEIGHT_PX + 2·PAGE_MARGIN_PX` (935 + 188 = 1123 ✓). Mit dem
Filler-Fix aus 1.1 ist der reale DOM-Abstand vom Beginn einer Seite bis zum Beginn der nächsten
**exakt** `PAGE_MARGIN_PX + PAGE_CONTENT_HEIGHT_PX + PAGE_GAP_PX` = `94 + 935 + 220 = 1249`. Das
„Blatt"-Raster positioniert Seite *i* bei `i · (PAGE_HEIGHT_PX + PAGE_SEPARATOR_PX)` =
`i · 1155`. Seite 2 beginnt danach im Content-Fluss bei `1249` — das entspricht exakt
`PAGE_PERIOD_PX(1155) + PAGE_MARGIN_PX(94) = 1249` (die 94px sind der Innenabstand vom Blattrand bis
zum Textbeginn, identisch auf jeder Seite). **Beide Systeme sind jetzt reine Funktionen derselben vier
Konstanten** — es gibt keinen dritten, unabhängig gemessenen Freiheitsgrad mehr, der auseinanderlaufen
könnte. Durchgerechnet für Seite 3 (i=2): Blattanfang `2·1155=2310`; Content-Fluss:
`1249 + 935 + 220 = 2404 = 2310 + 94` ✓ — kein akkumulierender Versatz, exakt und für beliebig viele
Seiten, weil jede Seite dieselbe arithmetische Wiederholung ist (Induktion über *i*).

**Warum keine „skalierte Seite" nötig ist, um das zu erreichen:** Die Blatt-Elemente sind rein
dekorativ (`aria-hidden`, `pointer-events: none`), tragen selbst keine Inhalts-Messung — sie liegen
außerhalb von `view.dom` und beeinflussen `getBoundingClientRect()`-Messungen der ProseMirror-Blöcke
nicht.

**Bonus-Nebeneffekt (nicht explizit gefordert, aber „günstig mitgenommen"):** Weil jede Seite jetzt
eine deterministische Fixhöhe hat, zeigt auch die **letzte** Seite bei kurzem Restinhalt die volle
Blattfläche (weißer Hintergrund + Schatten bis zur vollen `PAGE_HEIGHT_PX`), statt abrupt nach dem
letzten Absatz aufzuhören — das ist das tatsächliche Referenzverhalten von Word/LibreOffice-Druckvorschau
(eine fast leere letzte Seite wird trotzdem als volle Seite gezeichnet) und ergibt sich hier ohne
zusätzlichen „Trailing-Filler"-Mechanismus im Content-Fluss, weil die Blatt-Ebene unabhängig von der
tatsächlichen Content-Höhe auf ihre volle, vorab berechnete Höhe gezeichnet wird (Beweis: die
Blatt-Elemente hängen nur von `pageCount`, nicht von den tatsächlichen `heights` ab).

### 1.3 Resize-Listener: **beheben**, nicht nur dokumentieren

**Entscheidung:** `createPaginationPlugin()` bekommt einen `window`-`resize`-Listener, der `recompute()`
per `requestAnimationFrame`-Koaleszierung auslöst (identisches Muster zum bereits vorhandenen
`update`-Hook, Zeilen 98–100 des Ist-Standes) — kein separater Debounce-Mechanismus nötig, ein
zweiter `rAF`-Handle reicht (Abbruch eines noch ausstehenden vor dem nächsten Resize-Event).

**Begründung gegen die Alternative „nur dokumentieren, dass Paginierung nach Resize einfriert":**
Auch wenn `PAGE_WIDTH_PX` fest ist und ein reines Fenster-Resize bei aktuell fixer Seitenbreite keinen
Zeilenumbruch innerhalb eines Blocks auslöst (der Inhalt ist in einem `overflow-auto`-Container mit
fixer Innenbreite, reflowt nicht mit der Fensterbreite), bleibt ein bekanntes Browser-Randproblem:
Änderungen der Browser-Zoomstufe (`Strg` `+`/`-`) können bei bestimmten Zoomstufen durch
Sub-Pixel-Rundung der Schriftmetriken minimale Höhenverschiebungen einzelner Textzeilen verursachen
(ein dokumentiertes Rendering-Detail verschiedener Browser-Engines, nicht spezifisch für diesen Code)
— diese Fälle lösen ebenfalls ein `resize`-Event aus. Der Fix ist mit ca. 10 Zeilen extrem billig
(`recompute()` existiert schon, `sameDecorationSet`/Zustandsvergleich verhindert bereits unnötige
Dispatches, siehe Zeilen 91–92 Ist-Stand) und macht die Paginierung robust gegen genau diesen
Grenzfall, statt ihn nur als bekannte Lücke zu vermerken. Zusätzlich zukunftssicher: sobald
`zoom-seitenbreite`/`zoom-stufe` (Backlog, Priorität 2) oder eine responsive Seitenbreite gebaut
werden, ist der Listener bereits vorhanden und muss nicht nachgerüstet werden.

### 1.4 Schnittstelle zu `specs/seitenumbruch-code.md` — drei konkrete Berührungspunkte

Da beide Pläne `pagination.ts` verändern und keiner der beiden bereits umgesetzt ist (Zusatzbefund D),
hält dieser Abschnitt exakt fest, wie sie zusammenpassen, unabhängig von der Reihenfolge:

1. **`computePageBreakIndices`-Signatur:** Dieser Plan lässt die Funktion **unverändert** (2 Argumente,
   Zeilen 12–25 Ist-Stand bleiben so bestehen). `seitenumbruch-code.md` Abschnitt 7.1 erweitert sie um
   einen dritten, optionalen `forcedBreakIndices`-Parameter mit Default `new Set()`. Beide Pläne sind
   kompatibel: welcher auch immer zuerst landet, der andere baut auf der jeweils aktuellen Signatur
   auf (bei diesem Plan: ruft die (dann evtl. 3-arg-fähige) Funktion weiterhin mit den ihm bekannten
   Argumenten auf und reicht `forcedBreakIndices` unverändert durch, falls vorhanden).
2. **Neue Funktion `computeFillerBeforeBreaks(heights, pageContentHeight, breakIndices)`** (dieser
   Plan, Abschnitt 3.2): nimmt die bereits berechneten `breakIndices` als drittes Argument entgegen,
   unabhängig davon, ob diese aus dem 2-Parameter- oder dem (künftigen) 3-Parameter-Aufruf von
   `computePageBreakIndices` stammen — die Filler-Berechnung ist eine reine Nachverarbeitung der
   Bruchpositionen, ihr ist es gleichgültig, ob ein Bruch natürlich oder erzwungen war.
3. **`measureAndBuildDecorations`/Plugin-State-Shape/`sameDecorationSet`:** Hier **muss** manuell
   gemergt werden, wer auch immer zuletzt landet — beide Pläne ändern dieselbe Funktion aus
   unterschiedlichen Gründen (dieser: dynamische Spacer-Höhe + `pageCount` im State;
   `seitenumbruch-code.md`: `isManual`-Flag + erweiterter `key`). Der kombinierte Zustand ist
   `{ decorations: DecorationSet; pageCount: number }` (dieser Plan) — `isManual`/erweiterter `key`
   bleiben Eigenschaften **innerhalb** der einzelnen `Decoration.widget`-Aufrufe und sind davon
   unberührt, solange beim Merge beide Änderungen (dynamische Höhe **und** `isManual`-Klasse) in
   derselben Widget-Fabrik-Funktion landen. Dieser Plan schreibt die Widget-Fabrik so, dass eine
   künftige Ergänzung um `isManual`/erweiterten `key` eine lokale, additive Änderung bleibt (siehe
   Codeblock in Abschnitt 3.2).

### 1.5 Explizit **nicht** Teil dieses Plans (mit Codehinweisen statt stillem Verzicht)

In Übereinstimmung mit dem „Geltungsbereich"-Absatz der Anforderungsdatei:

- **Seitenformat/-ränder aus dem Dokument lesen** (Backlog-Slugs `seitenraender`, `seitenausrichtung`,
  `papierformat` — bislang nicht einmal als `*-req.md` angelegt, bestätigt per Verzeichnis-Suche).
  Stattdessen: Dokumentations-Kommentare an den betroffenen Stellen in `docx/writer.ts`, `docx/reader.ts`,
  `odt/writer.ts`, `odt/reader.ts` (Abschnitt 3.6–3.7) sowie in `pageLayout.ts` selbst, die explizit
  festhalten, dass A4/25 mm eine hartkodierte Annahme ist, keine gelesene Eigenschaft — erfüllt
  Anforderung 3.1 („muss explizit dokumentiert sein, dass diese Maße hartkodierte Annahmen sind").
- **Kopf-/Fußzeilen-Anzeige in der Seitenansicht** (cross-referenziert auf
  `specs/kopfzeile-bearbeiten-req.md` / `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 9 — dort fehlt bereits der
  UI-Weg, eine Kopf-/Fußzeile überhaupt zu erstellen, das ist die Voraussetzung, bevor eine Anzeige in
  der Seitenansicht sinnvoll wäre). Stattdessen: ein Dokumentations-Kommentar in `WordEditor.tsx` an der
  Stelle, an der `doc.content.body` gerendert wird (Zeile 65 Ist-Stand), der explizit referenziert,
  dass `header`/`footer` bewusst (noch) nicht gerendert werden.
- **View-Umschalter** (Weblayout/Entwurf/Gliederung/Lesemodus — alle Backlog-Status „fehlt"). Stattdessen:
  ein `data-view-mode="page-layout"`-Attribut auf dem äußeren Seiten-Wrapper (Abschnitt 3.4) plus ein
  Kopf-Kommentar in `WordEditor.tsx`, der den aktuellen Modus eindeutig als „Seitenlayoutansicht" benennt
  — erfüllt Anforderung/Element 1 („mindestens intern eindeutig dokumentiert").
- **Zoom, Lineal, Formatierungszeichen-Toggle, Navigationsbereich, Mehrere-Seiten-nebeneinander** —
  alle Backlog-Status „fehlt", explizit als Cross-Referenz ohne Blocker-Charakter markiert
  (Anforderungsdatei Element 7/8, Zeilen 203–204). Keine Änderung.
- **Drucken/PDF-Export** — separates Feature, kein `@media print`/`window.print()` wird hier ergänzt.

### 1.6 Mobile/Tablet: horizontales Scrollen bleibt akzeptiertes Verhalten

**Entscheidung:** Kein Code-Änderung am Viewport-Verhalten selbst (`overflow-auto` bleibt); die
geforderte Klärung (Anforderung 3.5/Grenzfall 5) erfolgt ausschließlich durch neue, tatsächlich
ausgeführte Playwright-Tests auf den bestehenden Projekten `Tablet`/`Mobile` (Abschnitt 4.4), die das
Ist-Verhalten verifizieren und dokumentieren, statt es nur zu behaupten.

**Geprüfte und verworfene Alternative — „Scale-to-fit" per CSS-`transform: scale()`:** Ein
`ResizeObserver` auf dem Scroll-Container könnte einen Skalierungsfaktor
`min(1, verfügbare Breite / PAGE_WIDTH_PX)` berechnen und per `transform: scale(...)` auf den
Seiten-Wrapper anwenden. **Verworfen**, weil `getBoundingClientRect()` (von `measureAndBuildDecorations`
verwendet, Zeile 36 Ist-Stand) Höhen im **visuellen, bereits transformierten** Koordinatenraum
zurückgibt — ein CSS-`transform` auf einem Vorfahren von `view.dom` würde jede gemessene Höhe um
denselben Faktor stauchen, während `PAGE_CONTENT_HEIGHT_PX` (die Vergleichsgröße in
`computePageBreakIndices`) ein unskalierter Pixel-Wert bliebe — die Umbruchberechnung würde auf einem
schmalen Viewport plötzlich mit falsch skalierten Höhen gegen eine unskalierte Grenze rechnen und
systematisch zu viele/zu wenige Seiten annehmen. Eine korrekte Umsetzung müsste den Skalierungsfaktor
zusätzlich in jede Höhenmessung einrechnen — das ist eine substanzielle, in der Anforderungsdatei nicht
verlangte Erweiterung („Beides ist denkbar", Anforderung 3.5) und wird hier bewusst nicht mitgebaut, um
das bestehende, im Kern korrekte Messverfahren nicht mit einer neuen Fehlerklasse zu belasten. Kann als
eigenständiges, künftiges Ticket behandelt werden, falls die Verifikation (Abschnitt 4.4) ein
tatsächliches Bedienbarkeitsproblem zutage fördert.

### 1.7 Dark/Light: weißer Seiten-Hintergrund bleibt bewusst hartkodiert

**Entscheidung:** Keine Code-Änderung — der weiße Hintergrund der `PageSheets`-Elemente (Abschnitt 3.3)
bleibt Literal `white`, unabhängig vom `prefers-color-scheme`. Bestätigt als bewusste, dokumentierte
Entscheidung (Anforderung 3.6: Papier bleibt weiß, wie in Word/LibreOffice) durch einen Code-Kommentar
an Ort und Stelle (Abschnitt 3.3) plus einen neuen Screenshot-Test in beiden Farbschemata
(Abschnitt 4.5) — vorher war das nur stillschweigend so, ohne Beleg, dass es beabsichtigt ist.

---

## 2. Schema-/Commands-Änderungen

**Keine.** Diese Funktion ist reine View-Ebene (Anforderungsdatei, Geltungsbereich-Absatz: „die
visuelle Darstellung des Editors … umgesetzt in `pageLayout.ts`/`pagination.ts`"). `wordSchema`
(`src/formats/shared/schema.ts`, 154 Zeilen) und `commands.ts` (108 Zeilen) werden von diesem Plan
nicht berührt — im Unterschied zu `specs/seitenumbruch-code.md`, das (für ein anderes Feature) ein
neues `breakBefore`-Attribut auf `paragraph`/`heading` einführt. Die beiden Pläne sind, wie in
Abschnitt 1.4 dargelegt, unabhängig kombinierbar.

---

## 3. Dateigenaue Änderungen

### 3.1 `src/formats/shared/editor/pageLayout.ts`

Entfernen: `pageBackgroundStyle()` (Zeilen 23–31, Ist-Stand) samt dem nun ungenutzten
`import type { CSSProperties } from 'react'` (Zeile 1) — ersetzt durch die in Abschnitt 3.3
beschriebenen deterministischen Pro-Seite-Helfer. Neuer Inhalt (Konstanten aus Zeilen 4–16 bleiben
unverändert bestehen):

```ts
/** Distance from the top of one simulated page to the top of the next. */
export const PAGE_PERIOD_PX = PAGE_HEIGHT_PX + PAGE_SEPARATOR_PX

/** Top offset (px) of the `index`-th simulated page within the page stack. */
export function pageSheetTopPx(index: number): number {
  return index * PAGE_PERIOD_PX
}

/** Total height (px) of the page stack for a given page count — always an exact multiple
 * of full A4 sheets plus the visual gaps between them, regardless of how much real content
 * the last page holds (see seitenlayout-ansicht-code.md Abschnitt 1.2). */
export function totalStackHeightPx(pageCount: number): number {
  return pageCount * PAGE_HEIGHT_PX + Math.max(0, pageCount - 1) * PAGE_SEPARATOR_PX
}
```

Zusätzlich ein Dokumentations-Kommentar oberhalb der bestehenden Konstanten (Anforderung 3.1 / Abschnitt
1.5):

```ts
/**
 * A4 page geometry at 96 CSS px/inch (1mm = 96/25.4 px), used to simulate real pages on screen.
 *
 * IMPORTANT: these are hardcoded assumptions, not values read from the imported document.
 * Neither the DOCX reader (`src/formats/docx/reader.ts`) nor the ODT reader
 * (`src/formats/odt/reader.ts`) currently parses `w:pgSz`/`w:pgMar` or
 * `fo:page-width`/`fo:page-height`/`fo:margin*` — every document is shown as A4/25mm
 * regardless of its actual page setup. Correct today because no page-format/margin feature
 * exists yet (backlog slugs `seitenraender`, `seitenausrichtung`, `papierformat` — all
 * "fehlt"); once one of those lands, this module must switch to per-document geometry
 * instead of these constants. See specs/seitenlayout-ansicht-req.md Abschnitt 3.1.
 */
```

### 3.2 `src/formats/shared/editor/pagination.ts`

**a) `paginationKey` exportieren und Zustandsform erweitern** (behebt Zusatzbefund C, ermöglicht den
Rundreise-Regressionstest):

```ts
export interface PaginationState {
  decorations: DecorationSet
  pageCount: number
}

export const paginationKey = new PluginKey<PaginationState>('pagination')
```

**b) Neue Funktion `computeFillerBeforeBreaks`** (reine Arithmetik, direkt unter
`computePageBreakIndices`, Zeile 25 Ist-Stand):

```ts
/**
 * For each entry in `breakIndices` (in the same order), how many px of blank filler must be
 * inserted directly before the normal inter-page gap so the ending page's rendered content
 * reaches exactly `pageContentHeight` — matching a real, fixed-height A4 sheet regardless of
 * how much actual content that page holds. Root-cause fix for the background/spacer drift
 * described in seitenlayout-ansicht-code.md Abschnitt 1.1: mirrors the exact `cumulative`
 * bookkeeping `computePageBreakIndices` already performs, so the two can never disagree.
 */
export function computeFillerBeforeBreaks(
  heights: number[],
  pageContentHeight: number,
  breakIndices: number[],
): number[] {
  if (pageContentHeight <= 0) return breakIndices.map(() => 0)
  const fillers: number[] = []
  let cumulative = 0
  let nextBreak = 0
  for (let i = 0; i < heights.length; i++) {
    if (nextBreak < breakIndices.length && breakIndices[nextBreak] === i) {
      fillers.push(Math.max(0, pageContentHeight - cumulative))
      cumulative = 0
      nextBreak++
    }
    cumulative += heights[i]
  }
  return fillers
}
```

**c) `measureAndBuildDecorations` → `buildPaginationState`, liefert jetzt `PaginationState`** (ersetzt
Zeilen 33–63 Ist-Stand):

```ts
function buildPaginationState(view: EditorView): PaginationState {
  const dom = view.dom
  // Zusatzbefund E (Abschnitt 0.6): exclude already-rendered spacer widgets from the
  // measurement. ProseMirror renders block widget decorations as direct children of view.dom,
  // so on every recompute AFTER the first, `dom.children` would otherwise contain the
  // `.page-break-spacer` divs and (a) inflate the height sums and (b) desync the DOM-child index
  // used by computePageBreakIndices from the document-node index used for placement below.
  // Filtering by the class makes each recompute measure only real blocks and idempotent to the
  // first pass — and is a harmless no-op should PM ever not surface widgets as direct children.
  const children = (Array.from(dom.children) as HTMLElement[]).filter(
    (el) => !el.classList.contains('page-break-spacer'),
  )
  const heights = children.map((el) => el.getBoundingClientRect().height)
  const breakIndices = computePageBreakIndices(heights, PAGE_CONTENT_HEIGHT_PX)
  const pageCount = computePageCount(heights, PAGE_CONTENT_HEIGHT_PX)

  if (breakIndices.length === 0) {
    return { decorations: DecorationSet.empty, pageCount }
  }

  const fillers = computeFillerBeforeBreaks(heights, PAGE_CONTENT_HEIGHT_PX, breakIndices)
  const fillerByIndex = new Map(breakIndices.map((idx, i) => [idx, fillers[i]]))
  const decorations: Decoration[] = []
  view.state.doc.forEach((_node, offset, index) => {
    const filler = fillerByIndex.get(index)
    if (filler === undefined) return
    decorations.push(
      Decoration.widget(
        offset,
        () => {
          const spacer = document.createElement('div')
          spacer.className = 'page-break-spacer'
          spacer.style.height = `${PAGE_GAP_PX + filler}px`
          spacer.setAttribute('aria-hidden', 'true')
          spacer.setAttribute('contenteditable', 'false')
          return spacer
        },
        // NOTE for specs/seitenumbruch-code.md Abschnitt 7.2: if/when manual page breaks
        // land, extend this factory with an `isManual` class/key suffix here — additive,
        // does not require touching the filler logic above.
        { side: -1, key: `page-break-${index}` },
      ),
    )
  })

  return { decorations: DecorationSet.create(view.state.doc, decorations), pageCount }
}
```

**d) `createPaginationPlugin()`** — Zustandszugriff, Vergleich und Resize-Listener (ersetzt Zeilen
72–105 Ist-Stand):

```ts
export function createPaginationPlugin(): Plugin {
  return new Plugin({
    key: paginationKey,
    state: {
      init: () => ({ decorations: DecorationSet.empty, pageCount: 1 }),
      apply(tr, old) {
        const next = tr.getMeta(paginationKey) as PaginationState | undefined
        if (next) return next
        return { decorations: old.decorations.map(tr.mapping, tr.doc), pageCount: old.pageCount }
      },
    },
    props: {
      decorations(state) {
        return paginationKey.getState(state)?.decorations
      },
    },
    view(view) {
      const recompute = () => {
        const next = buildPaginationState(view)
        const current = paginationKey.getState(view.state)
        if (current && current.pageCount === next.pageCount && sameDecorationSet(current.decorations, next.decorations)) {
          return
        }
        view.dispatch(view.state.tr.setMeta(paginationKey, next))
      }
      const raf = requestAnimationFrame(recompute)

      // Grenzfall 8 (seitenlayout-ansicht-req.md): recompute on window resize, coalesced via
      // rAF like the existing `update` hook — cheap (guarded by the comparison above) and
      // closes a real, if narrow, drift window (sub-pixel font-metric differences at some
      // browser zoom levels) rather than leaving pagination frozen until the next edit.
      let resizeRaf: number | null = null
      const onResize = () => {
        if (resizeRaf !== null) cancelAnimationFrame(resizeRaf)
        resizeRaf = requestAnimationFrame(recompute)
      }
      window.addEventListener('resize', onResize)

      return {
        update: () => {
          requestAnimationFrame(recompute)
        },
        destroy: () => {
          cancelAnimationFrame(raf)
          if (resizeRaf !== null) cancelAnimationFrame(resizeRaf)
          window.removeEventListener('resize', onResize)
        },
      }
    },
  })
}

/** Convenience accessor for callers outside the plugin (WordEditor, tests). */
export function getPageCount(state: EditorState): number {
  return paginationKey.getState(state)?.pageCount ?? 1
}
```

`sameDecorationSet` (Zeilen 107–115 Ist-Stand) bleibt **unverändert** (Signatur weiterhin
`(a: DecorationSet, b: DecorationSet) => boolean`) — wird jetzt mit `.decorations`-Teilobjekten
aufgerufen, `pageCount` wird separat verglichen (siehe `recompute` oben).

**Import-Ergänzung:** `EditorState` aus `prosemirror-state` (für `getPageCount`s Signatur).

### 3.3 `src/formats/shared/editor/PageSheets.tsx` — neu

```tsx
import { PAGE_HEIGHT_PX, PAGE_WIDTH_PX, pageSheetTopPx } from './pageLayout'

/**
 * Decorative, non-interactive "sheet" backgrounds — one per simulated page, each with its
 * own shadow (element 2, seitenlayout-ansicht-req.md: "mehrere getrennte Blätter", nicht ein
 * Schatten für den ganzen Stapel). Positions are a pure function of `count` alone (not of
 * measured content height) — see seitenlayout-ansicht-code.md Abschnitt 1.2 for why this
 * can never drift out of sync with the real content flow.
 *
 * Hardcoded white background, unaffected by dark mode — deliberate: paper stays white in
 * Word/LibreOffice regardless of app theme (seitenlayout-ansicht-req.md Abschnitt 3.6).
 */
export function PageSheets({ count }: { count: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="absolute left-0 shadow-lg bg-white"
          style={{ top: pageSheetTopPx(index), width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX, zIndex: 0 }}
        >
          <span className="absolute bottom-1 right-2 text-[10px] leading-none text-neutral-400 select-none">
            Seite {index + 1} von {count}
          </span>
        </div>
      ))}
    </div>
  )
}
```

Erfüllt zugleich Element 6 der Anforderungsdatei („Seitenzahl-/Gesamtseitenzahl-Anzeige … empfohlen,
kein Blocker") praktisch kostenlos, da `pageCount` für die Blattpositionierung ohnehin vorliegt.

### 3.4 `src/formats/shared/editor/WordEditor.tsx`

**Imports** (ersetzt Zeilen 14–15 Ist-Stand):

```ts
import { createPaginationPlugin, paginationKey } from './pagination'
import { PAGE_WIDTH_PX, PAGE_MARGIN_PX, totalStackHeightPx } from './pageLayout'
import { PageSheets } from './PageSheets'
```

(`pageBackgroundStyle` entfällt, siehe 3.1; `paginationKey` wird durch 3.2a exportierbar.)

**Seitenzahl-Ableitung** — neue Zeile vor dem `return` (analog zum bestehenden Muster
`viewRef.current && <Toolbar .../>`, Zeile 170 Ist-Stand):

```ts
const pageCount = viewRef.current ? paginationKey.getState(viewRef.current.state)?.pageCount ?? 1 : 1
```

**Render-Block** (ersetzt Zeilen 168–184 Ist-Stand). **Wichtig:** der bestehende `Toolbar`-Aufruf
übergibt inzwischen `cutError` **und** `setCutError` (Ist-Stand Zeile 170:
`{viewRef.current && <Toolbar view={viewRef.current} cutError={cutError} setCutError={setCutError} />}`)
— diese Props **dürfen nicht** verloren gehen (sie tragen die „Ausschneiden"-Fehleranzeige, siehe
`specs/ausschneiden-code.md`). Der bestehende `cutError`-State (Zeile 71) und der `useAutoDismiss`-Aufruf
(Zeile 74, Funktion Zeilen 57–63 Ist-Stand) bleiben unverändert:

```tsx
return (
  <div className="flex flex-col h-full">
    {viewRef.current && (
      <Toolbar view={viewRef.current} cutError={cutError} setCutError={setCutError} />
    )}
    {/* Single, hard-wired rendering mode, internally named "Seitenlayoutansicht" — no
        Weblayout/Entwurf/Gliederung/Lesemodus alternative exists yet (all "fehlt" in
        FEATURE-BACKLOG.md 8.1). `data-view-mode` gives tests and any future switcher UI a
        stable, explicit hook instead of this being an undocumented, de-facto default. See
        specs/seitenlayout-ansicht-req.md Element 1. */}
    <div
      data-view-mode="page-layout"
      data-page-count={pageCount}
      className="flex-1 overflow-auto bg-neutral-200 dark:bg-neutral-950 flex justify-center py-8"
    >
      <div style={{ width: PAGE_WIDTH_PX, height: totalStackHeightPx(pageCount), position: 'relative' }}>
        <PageSheets count={pageCount} />
        <div style={{ position: 'relative', zIndex: 1, padding: `${PAGE_MARGIN_PX}px` }}>
          {/* header/footer intentionally not rendered here — no UI exists yet to create
              them (FEATURE-SPEC-DOCX-ODT.md Abschnitt 9 / specs/kopfzeile-bearbeiten-req.md);
              content is preserved unedited on save (see dispatchTransaction, Zeile 129
              Ist-Stand: `{ ...doc.content, body: newState.doc.toJSON() }`), but stays invisible
              in this view until that feature lands. Known, documented gap — not a silent
              omission (seitenlayout-ansicht-req.md Element 5). */}
          <div ref={containerRef} className="word-editor-surface outline-none" />
        </div>
      </div>
    </div>
  </div>
)
```

Keine Änderung an `plugins: [...]` (Zeilen 83–114 Ist-Stand, `createPaginationPlugin()` bleibt
eingehängt, Zeile 113), an `dispatchTransaction` (Zeilen 125–132, `if (tr.docChanged)`-Guard Zeile 128
unverändert) oder an `reconcileSelectionOnClick` (Zeilen 43–50) — alle drei bleiben durch diesen Plan
unberührt, da rein additiv auf der Darstellungsebene. **Hinweis:** `pageCount` wird bei jedem
`forceRender` (bereits vorhanden, ausgelöst u. a. am Ende von `dispatchTransaction`, Zeile 131
Ist-Stand) neu aus dem Plugin-State gelesen — es ist kein zusätzlicher Re-Render-Mechanismus nötig,
weil jede den Umbruch verändernde Paginierungs-Transaktion ohnehin über `dispatchTransaction` läuft und
dort `forceRender` auslöst.

### 3.5 `src/index.css`

Keine zwingende Änderung — die neue Optik entsteht vollständig über Tailwind-Utility-Klassen in
`PageSheets.tsx` (`shadow-lg`, `bg-white`) und Inline-Styles. `.page-break-spacer` (Zeilen 69–71
Ist-Stand) bleibt unverändert (Höhe weiterhin per Inline-Style gesetzt, jetzt inklusive Filler).

### 3.6 `src/formats/docx/writer.ts` / `src/formats/docx/reader.ts` / `src/formats/docx/pageSetup.ts`

**Keine Verhaltensänderung** — nur Dokumentations-Kommentare (Anforderung 3.1, Abschnitt 1.5). Die
Kommentare müssen den **tatsächlichen** (korrigierten) Sachverhalt festhalten: Geometrie wird
**geschrieben**, aber **nicht gelesen** — nicht den überholten „wird nie geschrieben"-Stand.

`writer.ts`, direkt oberhalb von `sectPrExtra += defaultPageSetupXml()` (Zeile 275 Ist-Stand):

```ts
// NOTE: `<w:pgSz>`/`<w:pgMar>` are ACTIVELY written here from the fixed pageGeometry.ts
// constants (A4/25mm) via defaultPageSetupXml() — screen simulation, DOCX and ODT export are
// therefore consistent. But this geometry is fixed, not read from the document: docx/reader.ts
// never parses an incoming w:pgSz/w:pgMar (see below), so a non-A4 source is normalized to
// A4/25mm on both display and re-export. See specs/seitenlayout-ansicht-req.md Befund 4 /
// specs/FEATURE-BACKLOG.md `papierformat`/`seitenraender` (currently "fehlt").
```

`pageSetup.ts` trägt bereits einen kurzen Kommentar; er ist um den Hinweis „fixe Annahme, nicht aus dem
Dokument gelesen — Reader parst pgSz/pgMar nicht" zu ergänzen (analog zum obigen).

`reader.ts`, direkt oberhalb der `sectPr`-Auswertung (Zeile 507 Ist-Stand):

```ts
// NOTE: only headerReference/footerReference are read from sectPr here — w:pgSz/w:pgMar are
// NOT parsed, so an imported document's actual page size/margins are silently discarded and
// the export (docx/pageSetup.ts) re-writes the fixed A4/25mm geometry regardless. Page-format
// information loss (not text loss). See specs/seitenlayout-ansicht-req.md Befund 4.
```

### 3.7 `src/formats/odt/writer.ts` / `src/formats/odt/reader.ts`

`writer.ts`, direkt oberhalb der `style:page-layout` in `buildStylesXml` (Zeile 222 Ist-Stand):

```ts
// NOTE: fo:margin/fo:page-width/fo:page-height are DERIVED from pageGeometry.ts via mmToCm()
// (not a hardcoded literal), giving A4/25mm consistent with the DOCX export and the screen
// simulation. But this geometry is fixed, not read from the document: odt/reader.ts never
// parses fo:page-*/fo:margin* (see below). See specs/seitenlayout-ansicht-req.md Befund 4 /
// specs/FEATURE-BACKLOG.md `papierformat`/`seitenraender` (currently "fehlt").
```

`reader.ts`, direkt oberhalb der `masterPage`-Auswertung (Zeile 375 Ist-Stand):

```ts
// NOTE: only style:header/style:footer are read from the referenced style:master-page here —
// the associated style:page-layout's fo:page-width/fo:page-height/fo:margin* are NOT parsed,
// so an imported document's actual page format is silently discarded and the export re-writes
// the fixed A4/25mm geometry regardless. See specs/seitenlayout-ansicht-req.md Befund 4.
```

### 3.8 `src/formats/shared/editor/Toolbar.tsx`

**Keine Änderung.** Kein Zoom-Regler, kein View-Umschalter, keine Seitenzahl-Anzeige wird hier
ergänzt (Seitenzahl-Anzeige sitzt bewusst auf dem simulierten Blatt selbst, `PageSheets.tsx` — näher
an der Word-/LibreOffice-Referenz, wo die Seitenzahl in der Statusleiste, nicht der
Formatierungs-Toolbar, erscheint; eine Statusleiste existiert hier nicht und wird nicht neu gebaut, da
außerhalb des Geltungsbereichs).

### 3.9 `src/formats/shared/schema.ts`, `src/formats/shared/documentModel.ts`, `src/formats/shared/editor/commands.ts`

**Keine Änderung** — siehe Abschnitt 2.

---

## 4. Tests

### 4.1 `src/formats/shared/editor/__tests__/pagination.test.ts` — Ergänzungen

Bestehende 10 Tests (Zeilen 3–51 Ist-Stand) bleiben unverändert (Regressionsschutz, wie in
Anforderung Abschnitt 6 Punkt 1 verlangt). Neu:

```ts
import { computeFillerBeforeBreaks, paginationKey } from '../pagination'
import { EditorState } from 'prosemirror-state'
import { DecorationSet } from 'prosemirror-view'
import { wordSchema } from '../../schema'

describe('computeFillerBeforeBreaks', () => {
  it('needs no filler when a page is filled exactly', () => {
    expect(computeFillerBeforeBreaks([100, 100, 100, 150], 300, [3])).toEqual([0])
  })

  it('fills the gap left by an underfull page (Befund 6 regression)', () => {
    expect(computeFillerBeforeBreaks([290, 290], 300, [1])).toEqual([10])
  })

  it('computes independent fillers for multiple pages', () => {
    // computePageBreakIndices([200,200,200,200], 300) === [1, 2, 3] (bestehender Test,
    // pagination.test.ts Zeile 14) — je Seite trägt genau ein 200er-Block, es fehlen je 100px:
    expect(computeFillerBeforeBreaks([200, 200, 200, 200], 300, [1, 2, 3])).toEqual([100, 100, 100])
  })

  it('returns zeros for a non-positive page height without crashing (Anforderung 3.10)', () => {
    expect(computeFillerBeforeBreaks([100, 100], 0, [1])).toEqual([0])
  })

  it('returns an empty array when there are no breaks', () => {
    expect(computeFillerBeforeBreaks([100], 300, [])).toEqual([])
  })
})

describe('pagination meta transactions never mark the document changed (Rundreise-Absicherung, Abschnitt 5.1 Punkt 3)', () => {
  it('tr.docChanged is false for a transaction that only sets pagination meta', () => {
    const state = EditorState.create({ schema: wordSchema })
    const tr = state.tr.setMeta(paginationKey, {
      decorations: DecorationSet.empty,
      pageCount: 3,
    })
    expect(tr.docChanged).toBe(false)
  })
})
```

Der zweite Testblock ist erst durch den Export von `paginationKey` (Abschnitt 3.2a) überhaupt
schreibbar — behebt Zusatzbefund C und erfüllt Anforderung Abschnitt 5.1 Punkt 3 / Abschnitt 6
Punkt 2 als echten, automatisierten Test statt nur „durch Code-Lektüre plausibel".

### 4.2 `tests/e2e/page-layout.spec.ts` — neu

DOM-/Struktur-Tests (Anforderung Abschnitt 6 Punkt 3):

```ts
import { test, expect } from '@playwright/test'

test.describe('Seitenlayoutansicht — Struktur', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
  })

  test('markiert den aktuellen Modus eindeutig als Seitenlayoutansicht', async ({ page }) => {
    await page.getByRole('button', { name: 'Neu erstellen' }).first().click()
    await expect(page.locator('[data-view-mode="page-layout"]')).toHaveAttribute('data-page-count', '1')
  })

  test('mehrseitiges Dokument erzeugt mindestens zwei Seitentrenner in korrekter Reihenfolge', async ({ page }) => {
    await page.getByRole('button', { name: 'Neu erstellen' }).first().click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    for (let i = 0; i < 80; i++) {
      await page.keyboard.type(`Absatz Nummer ${i} mit ausreichend Text, um mehrere Seiten zu füllen. `)
      await page.keyboard.press('Enter')
    }
    await expect(page.locator('.page-break-spacer')).toHaveCount(await expectedSpacerCount(page))
    await expect(page.locator('[data-view-mode="page-layout"]')).toHaveAttribute(
      'data-page-count',
      String((await page.locator('.page-break-spacer').count()) + 1),
    )

    // Zusatzbefund E (0.6/3.2c): the recompute must be idempotent — a further edit must not
    // let spacer widgets (which ProseMirror renders into view.dom.children) inflate the next
    // measurement. Type more, then assert the invariant pageCount === spacerCount + 1 still holds
    // and the count only grew monotonically (no oscillation / phantom spacers).
    const spacersBefore = await page.locator('.page-break-spacer').count()
    for (let i = 0; i < 20; i++) {
      await page.keyboard.type(`Weiterer Absatz ${i}. `)
      await page.keyboard.press('Enter')
    }
    const spacersAfter = await page.locator('.page-break-spacer').count()
    expect(spacersAfter).toBeGreaterThanOrEqual(spacersBefore)
    await expect(page.locator('[data-view-mode="page-layout"]')).toHaveAttribute(
      'data-page-count',
      String(spacersAfter + 1),
    )
  })
})

async function expectedSpacerCount(page: import('@playwright/test').Page): Promise<number> {
  return page.locator('.page-break-spacer').count()
}
```

(Die zweite Assertion ist bewusst selbstreferenziell auf die gemessene Spacer-Anzahl statt eines
Literal-Werts, weil die exakte Zeichen-zu-Seiten-Umrechnung von Schriftgröße/Zeilenhöhe im
Test-Browser abhängt — der Test prüft die **Konsistenz** `pageCount === spacerCount + 1`, nicht eine
konkrete Zahl; das deckt sich mit Anforderung Testplan Punkt 3 „Anzahl … stimmt mit einer aus den
gemessenen Höhen erwarteten Seitenzahl überein".)

### 4.3 Screenshot-Regressionstests — `tests/e2e/page-layout-screenshots.spec.ts` — neu

Erfüllt Anforderung Abschnitt 6 Punkte 4–5 (kurzes Dokument, langes Dokument über ≥ 4 Seiten):

```ts
import { test, expect } from '@playwright/test'

test.describe('Seitenlayoutansicht — Screenshot-Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await page.getByRole('button', { name: 'Neu erstellen' }).first().click()
  })

  test('kurzes Dokument: kein unerwarteter Leerraum über dem Text', async ({ page }) => {
    await page.locator('.ProseMirror').click()
    await page.keyboard.type('Ein kurzer Absatz.')
    await expect(page.locator('[data-view-mode="page-layout"]')).toHaveScreenshot('short-document-top.png', {
      clip: { x: 0, y: 0, width: 900, height: 300 },
    })
  })

  test('langes Dokument: Übergänge Seite 1/2 und Seite 3/4 zeigen keinen kumulativen Versatz', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    for (let i = 0; i < 220; i++) {
      await page.keyboard.type(`Zeile ${i} mit genug Text, um zuverlässig mehrere Seiten zu füllen. `)
      await page.keyboard.press('Enter')
    }
    await expect(page.locator('[data-page-count]')).not.toHaveAttribute('data-page-count', '1')
    const spacers = page.locator('.page-break-spacer')
    await expect(spacers.nth(0)).toBeVisible()
    await spacers.nth(0).scrollIntoViewIfNeeded()
    await expect(page).toHaveScreenshot('long-document-page-1-2-boundary.png')
    if ((await spacers.count()) >= 3) {
      await spacers.nth(2).scrollIntoViewIfNeeded()
      await expect(page).toHaveScreenshot('long-document-page-3-4-boundary.png')
    }
  })
})
```

### 4.4 Viewport-Tests (Tablet/Mobile) — `tests/e2e/page-layout-viewport.spec.ts` — neu

Erfüllt Anforderung Abschnitt 6 Punkt 6 / Grenzfall 5, läuft auf den bestehenden
`playwright.config.ts`-Projekten `Tablet`/`Mobile` (Zeilen 19–23 Ist-Stand):

```ts
import { test, expect } from '@playwright/test'

test.describe('Seitenlayoutansicht auf schmalen Viewports', () => {
  test('Toolbar erreichbar, Kernfunktionen bedienbar (Tippen, Fett, Export)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await page.getByRole('button', { name: 'Neu erstellen' }).first().click()

    await expect(page.getByTitle('Fett')).toBeVisible()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Mobiler Test')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Fett').click()
    await expect(editor).toContainText('Mobiler Test')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    await downloadPromise
  })
})
```

Ergebnis (horizontales Scrollen der festen 794px-Seite auf `Tablet`/`Mobile`, Toolbar bleibt oberhalb
des Scroll-Containers und damit unabhängig von der Seitenbreite erreichbar) wird nach Testlauf hier
nachgetragen (Abschnitt 7).

### 4.5 Farbschema-Test — `tests/e2e/page-layout-color-scheme.spec.ts` — neu

Erfüllt Anforderung Abschnitt 6 Punkt 7 / Grenzfall 6:

```ts
import { test, expect } from '@playwright/test'

for (const scheme of ['light', 'dark'] as const) {
  test(`Seiten-Hintergrund bleibt weiß bei prefers-color-scheme: ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await page.getByRole('button', { name: 'Neu erstellen' }).first().click()
    await page.locator('.ProseMirror').click()
    await page.keyboard.type('Test')
    await expect(page).toHaveScreenshot(`page-background-${scheme}.png`)
  })
}
```

### 4.6 Resize-Test — `tests/e2e/page-layout-resize.spec.ts` — neu

Erfüllt Anforderung Abschnitt 6 Punkt 9 / Grenzfall 8 (jetzt als **behoben** getestet, siehe
Entscheidung 1.3, nicht nur dokumentiert):

```ts
import { test, expect } from '@playwright/test'

test('Paginierung bleibt nach Fenster-Resize ohne weitere Bearbeitung konsistent', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /verstanden/i }).click()
  await page.getByRole('button', { name: 'Neu erstellen' }).first().click()
  await page.setViewportSize({ width: 1200, height: 900 })

  const editor = page.locator('.ProseMirror')
  await editor.click()
  for (let i = 0; i < 100; i++) {
    await page.keyboard.type(`Absatz ${i} mit ausreichend Text zum Füllen mehrerer Seiten. `)
    await page.keyboard.press('Enter')
  }
  const pageCountBefore = await page.locator('[data-view-mode="page-layout"]').getAttribute('data-page-count')

  await page.setViewportSize({ width: 800, height: 600 })
  await page.waitForTimeout(300) // rAF-Koaleszierung des Resize-Listeners abwarten

  const pageCountAfter = await page.locator('[data-view-mode="page-layout"]').getAttribute('data-page-count')
  expect(pageCountAfter).toBe(pageCountBefore) // fixe Seitenbreite reflowt nicht mit der Fensterbreite
  await expect(page.locator('.page-break-spacer').first()).toBeVisible() // kein "Geister"-Zustand, Listener lief ohne Fehler
})
```

### 4.7 Selection-Sync an einer automatischen Umbruchstelle — Ergänzung in
`tests/e2e/selection-regression.spec.ts`

Erfüllt Anforderung Abschnitt 6 Punkt 8 / Grenzfall 9 (analog zu den bestehenden drei Tests in dieser
Datei, Zeilen 14–71 Ist-Stand):

```ts
test('Tippen direkt an einer automatisch berechneten Umbruchstelle verliert/vertauscht keinen Text', async ({
  page,
}) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  for (let i = 0; i < 60; i++) {
    await page.keyboard.type(`Zeile ${i} mit ausreichend Text, um einen Seitenumbruch zu erzwingen. `)
    await page.keyboard.press('Enter')
  }
  await expect(page.locator('.page-break-spacer').first()).toBeVisible()

  // Cursor ans Ende des letzten Absatzes vor dem ersten Spacer setzen (side: -1 Widget).
  await page.keyboard.press('ControlOrMeta+Home')
  await page.keyboard.type('EINFUEGUNG-VORNE ')
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type(' EINFUEGUNG-HINTEN')

  await expect(editor).toContainText('EINFUEGUNG-VORNE')
  await expect(editor).toContainText('EINFUEGUNG-HINTEN')
  await expect(editor).toContainText('Zeile 0')
  await expect(editor).toContainText('Zeile 59')
})
```

### 4.8 Performance-Test mit realem, großem Dokument — `tests/e2e/large-document-import.spec.ts` — **erweitern** (existiert bereits)

**Korrektur zu Zusatzbefund B:** die Datei existiert bereits und misst DOCX- (`bug65649.docx`) **und**
ODT-Import-Performance (`brokenList.odt`) über den `./fixtures`-Harness (`docxCard`/`odtCard`) mit
15-s-Obergrenze und „Tab nicht eingefroren"-Beweis. Nicht neu anlegen. **Ergänzen** um genau die
Paginierungs-spezifische Assertion, die Anforderung 3.7 über den reinen Import hinaus verlangt (der
Editor bleibt nach dem Import eines mehrseitigen Groß-Dokuments tippbar, `data-page-count > 1`):

```ts
// Ergänzung im bestehenden bug65649.docx-Test, NACH dem Import-Timing-Block:
// Paginierung des mehrseitigen Groß-Dokuments greift und der Editor bleibt reaktionsfähig
// (Anforderung 3.7: kein spürbares Einfrieren durch rAF-Neumessung).
await expect
  .poll(async () =>
    Number(await page.locator('[data-view-mode="page-layout"]').getAttribute('data-page-count')),
  )
  .toBeGreaterThan(1)
await page.locator('.ProseMirror').click()
await page.keyboard.type('X')
await expect(page.locator('.ProseMirror')).toContainText('X')
```

Alle E2E-Snippets dieses Abschnitts (4.2–4.9) sind über den bestehenden `./fixtures`-Harness zu
schreiben (`import { test, expect, docxCard, odtCard } from './fixtures'`), der Banner-Dismiss und
Karten-Lokalisierung bereits kapselt — die hier gezeigten `page.goto('/')`/„verstanden"-Sequenzen sind
nur illustrativ und beim Implementieren durch die vorhandenen Fixtures zu ersetzen (siehe 0.1 Punkt 12).

### 4.9 Export-Geometrie-Pin-Test — `src/formats/docx/__tests__` / `src/formats/odt/__tests__` — neu

**Neu und wichtig** (Anforderung Abschnitt 5.1 Punkt 4 / Testplan Punkt 10): pinnt das in Befund 4
korrigierte, aktuell korrekte Export-Verhalten fest, damit ein späterer Umbau auf dokumentabgeleitete
Geometrie nicht unbemerkt die Standardgeometrie oder ihre Konsistenz mit der Bildschirmsimulation
verliert. Als Unit-Test gegen den Writer (schneller, deterministischer als E2E):

```ts
// DOCX (src/formats/docx/__tests__/page-setup.test.ts) — genau ein w:pgSz (A4) + ein w:pgMar (25mm):
it('exportiert genau ein w:pgSz (A4) und ein w:pgMar (25mm)', async () => {
  const blob = await writeDocx(minimalDoc()) // vorhandenes Writer-Muster der übrigen docx-Tests
  const documentXml = await (await JSZip.loadAsync(blob)).file('word/document.xml')!.async('text')
  expect(documentXml.match(/<w:pgSz\b/g)).toHaveLength(1)
  expect(documentXml).toContain('w:w="11906"')
  expect(documentXml).toContain('w:h="16838"')
  expect(documentXml.match(/<w:pgMar\b/g)).toHaveLength(1)
  expect(documentXml).toContain('w:top="1417"')
})

// ODT (src/formats/odt/__tests__/page-setup.test.ts) — genau ein style:page-layout mit A4-cm-Werten:
it('exportiert genau ein style:page-layout mit fo:page-width=21cm/29.7cm/2.5cm', async () => {
  const stylesXml = await (await JSZip.loadAsync(await writeOdt(minimalDoc()))).file('styles.xml')!.async('text')
  expect(stylesXml.match(/<style:page-layout\b/g)).toHaveLength(1)
  expect(stylesXml).toContain('fo:page-width="21cm"')
  expect(stylesXml).toContain('fo:page-height="29.7cm"')
  expect(stylesXml).toContain('fo:margin="2.5cm"')
})
```

(Die genauen Writer-Aufruf-/Fixture-Helfer sind aus den bestehenden `docx`/`odt`-`__tests__`-Dateien zu
übernehmen — Muster existiert bereits; dieser Plan legt nur die zwei Assertion-Blöcke fest.)

### 4.10 Baseline-/Feature-Rundreise (Anforderung Abschnitt 5.1/5.2)

Kein neuer Mechanismus nötig — bestehende `tests/e2e/docx.spec.ts`/`odt.spec.ts`-Rundreise-Tests
(Muster: Upload → Export → ZIP-Inhalt prüfen, über den `./fixtures`-Harness mit `docxCard`/`odtCard`)
werden um zwei reale, mehrseitige Fixtures ergänzt: `tests/fixtures/external/docx/saut_page.docx` und
`tests/fixtures/external/odt/pagebreaks.odt` (Eignung vor Verwendung im Repo bestätigen, siehe
Anforderungsdatei Testplan Punkt 12 / `specs/seitenumbruch-code.md` Abschnitt 0.3). Neuer Testfall in
`tests/e2e/docx.spec.ts`:

```ts
test('reale mehrseitige DOCX-Datei: Rundreise ohne Paginierungs-Artefakte im Export', async ({ page }) => {
  const buffer = readFileSync(join(__dirname, '../fixtures/external/docx/saut_page.docx'))
  const input = docxCard(page).locator('input[type="file"]')
  await input.setInputFiles({
    name: 'saut_page.docx',
    mimeType: DOCX_MIME,
    buffer,
  })
  await expect(page.locator('.ProseMirror')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const fs = await import('node:fs/promises')
  const exportedBuffer = await fs.readFile((await download.path())!)
  const zip = await JSZip.loadAsync(exportedBuffer)
  const documentXml = await zip.file('word/document.xml')!.async('text')

  expect(documentXml).not.toContain('page-break-spacer')
  expect(documentXml).not.toContain('pagination')
})
```

(analog für ODT mit `pagebreaks.odt` in `tests/e2e/odt.spec.ts`, Prüfung gegen `content.xml`).

---

## 5. Grenzfall-Mapping (Anforderungsdatei Abschnitt 4)

| # | Grenzfall | Status nach diesem Plan |
|---|---|---|
| 1 | Kurzes Dokument | Verifiziert per Screenshot-Test 4.3; durch Filler-Fix (1.1) strukturell korrekt (kein Leerraum-Bug), da kurze Dokumente ohnehin nie einen Break überschreiten. |
| 2 | Sehr langes Dokument (> 5 Seiten) | Behoben durch 1.1/1.2 (kein akkumulierender Versatz, siehe Induktionsbeweis 1.2) **plus** den Spacer-Mess-Filter aus 0.6/3.2c (ohne den rechnete der Filler ab Seite 2 gegen verfälschte Höhen); verifiziert per Screenshot-Test 4.3 (Seite 1/2 **und** 3/4) und Konsistenz-Assert 4.2 (Spacer-Anzahl stabil nach mehreren `update`-Zyklen). |
| 3 | Bild höher als eine Seite | Unverändert bewusstes Verhalten (Überlauf statt Splitting), bereits im Code kommentiert (`pagination.ts` Zeilen 8–10 Ist-Stand) — durch diesen Plan nicht angetastet, bleibt bestätigt akzeptiert. |
| 4 | Große Tabelle über Seitengrenze | Wie 3 — bewusste, bestehende Einschränkung, unverändert. |
| 5 | Schmaler Viewport (Tablet/Mobile) | Verifiziert per Test 4.4; Entscheidung 1.6 (horizontales Scrollen bleibt, Scale-to-fit bewusst verworfen). |
| 6 | Farbschema-Wechsel | Verifiziert per Test 4.5; Entscheidung 1.7 (weiß bleibt hartkodiert, bestätigt als Referenzverhalten). |
| 7 | Asynchron nachladendes Bild | Unverändert nicht behoben (kein `onload`-Reflow) — aus Anforderungsdatei Abschnitt 0 Punkt 8 unverändert übernommen; außerhalb des Kern-Scopes dieses Plans (kein expliziter Testfall in Abschnitt 6 der Anforderungsdatei dafür), als bekannte Restlücke hier vermerkt. |
| 8 | Fenster-Resize ohne Bearbeitung | **Behoben** durch 1.3 (Resize-Listener), verifiziert per Test 4.6. |
| 9 | Tippen an automatischer Umbruchstelle | Verifiziert per Test 4.7 (Erweiterung `selection-regression.spec.ts`). |
| 10 | Undo nach seitenauslösender Aktion | Durch bestehenden `prosemirror-history`-Mechanismus + `update`-Hook (Zeile 98 Ist-Stand, unverändert) bereits korrekt — Filler/`pageCount` werden bei jedem `update` neu berechnet, kein Sonderfall nötig; abgedeckt implizit durch Test 4.2 (Neuberechnung bei jeder Transaktion). |
| 11 | Ganz leeres Dokument | `computePageBreakIndices([], …) = []`, `pageCount = 1` (bestehende Tests, Zeilen 28–29/48–50 Ist-Stand) — `totalStackHeightPx(1) = PAGE_HEIGHT_PX`, ein einzelnes Blatt, verifiziert per Test 4.2 erster Fall. |
| 12 | Abweichendes Ursprungsformat (US Letter etc.) | Unverändert außerhalb des Scopes (Entscheidung 1.5) — jetzt mit Code-Kommentaren an allen vier Lese-/Schreibstellen dokumentiert (3.6/3.7) statt nur in der Anforderungsdatei. |
| 13 | Dokument mit vorhandener Kopf-/Fußzeile | Unverändert außerhalb des Scopes (Entscheidung 1.5) — jetzt mit Code-Kommentar in `WordEditor.tsx` dokumentiert (3.4). |
| 14 | Manueller Seitenumbruch trifft auf automatische Paginierung | Siehe Abschnitt 1.4 (Schnittstelle zu `seitenumbruch-code.md`) — kein Duplikat, dort spezifiziert. |
| 15 | Unverändert hochladen/exportieren/reimportieren | Verifiziert per Test 4.10 (Rundreise ohne Paginierungs-Artefakte im Export) und 4.1 (docChanged-Regressionstest); Export-Geometrie zusätzlich per 4.9 gepinnt. |

---

## 6. Testplan-Mapping (Anforderungsdatei Abschnitt 6)

| # | Anforderung (Abschnitt 6 der Req) | Umgesetzt in |
|---|---|---|
| 1 | Bestehende Unit-Tests erhalten | `pagination.test.ts` Zeilen 3–51 Ist-Stand unverändert |
| 2 | docChanged-Regressionstest | Abschnitt 4.1, zweiter Block (erfordert Export aus 3.2a) |
| 3 | E2E, mehrseitiges Dokument, Spacer-Anzahl | Abschnitt 4.2 |
| 4 | Screenshot, kurzes Dokument | Abschnitt 4.3, erster Test |
| 5 | Screenshot, langes Dokument, Seite 1/2 **und** 3/4 | Abschnitt 4.3, zweiter Test |
| 6 | Viewport-Tests Tablet/Mobile | Abschnitt 4.4 |
| 7 | Farbschema-Test | Abschnitt 4.5 |
| 8 | Selection-Sync-Regression an Umbruchstelle | Abschnitt 4.7 |
| 9 | Resize-Test | Abschnitt 4.6 |
| 10 | **Export-Geometrie-Test** (sichert Befund 4 ab: genau ein `w:pgSz`/`w:pgMar` bzw. `style:page-layout`) | Abschnitt 4.9 (neu) |
| 11 | Rundreise als Unit **und** E2E | Abschnitte 4.1 (Unit) + 4.10 (E2E) |
| 12 | Reale Fixtures + Performance (`bug65649.docx`, `saut_page.docx`, `pagebreaks.odt`) | Abschnitt 4.8 (Perf, **erweitert** bestehende Datei) + 4.10 (Rundreise) — Fixture-Eignung vor Verwendung bestätigen |

---

## 7. Freigabekriterium-Checkliste (Anforderungsdatei Abschnitt 7)

- [ ] Alle Bedienelemente aus Abschnitt 1 der Anforderungsdatei existieren wie spezifiziert —
      Elemente 1 (`data-view-mode`, 3.4), 2 (`PageSheets`, 3.3), 3 (Doku-Kommentare, 3.1/3.6/3.7),
      4 (Filler-Fix, 3.2), 6 (Seitenzahl-Badge, 3.3) sind mit diesem Plan umgesetzt; Elemente 7/8/9/10
      bleiben wie in Abschnitt 1.5/1.6 begründet unverändert bzw. nur verifiziert/dokumentiert.
- [ ] Alle Testfälle aus Abschnitt 6 automatisiert und grün — siehe Mapping-Tabelle Abschnitt 6 oben;
      **nach Implementierung** durch tatsächlichen Testlauf zu bestätigen (dieser Plan legt die Tests
      an, führt sie nicht aus).
- [ ] Grenzfälle aus Abschnitt 4 einzeln befundet — siehe Tabelle Abschnitt 5 oben.
- [ ] Abschnitt 5.1 (Baseline-Rundreise) — Abschnitt 4.1 (docChanged) + 4.10 (reale Fixtures ohne
      Artefakte im Export) + 4.9 (Export-Geometrie-Pin, Req 5.1 Punkt 4).
- [ ] Abschnitt 5.2 (Feature-Rundreise DOCX/ODT/Cross-Format) — Cross-Format-Test (Punkt 6 der
      Anforderungsdatei Abschnitt 5.2) ist mit den bestehenden Cross-Format-Mustern in
      `docx.spec.ts`/`odt.spec.ts` (Import Format A → Export Format B → Reimport) analog zu Abschnitt
      4.10 zu ergänzen — hier nicht separat ausformuliert, da strukturell identisch zu 4.10 nur mit
      Formatwechsel.
- [ ] Selection-Sync-Regression aus `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 2 an einer automatischen
      Umbruchstelle — Abschnitt 4.7.
- [ ] Bekannte, dokumentationspflichtige Lücken einzeln behoben oder bewusst dokumentiert:
      Kopf-/Fußzeilen-Anzeige (dokumentiert, 3.4/1.5), hartkodiertes A4/25mm (dokumentiert,
      3.1/3.6/3.7/1.5), Resize-Listener (**behoben**, 1.3/3.2d), Tablet-/Mobile-Verhalten
      (dokumentiert + verifiziert, 1.6/4.4).
- [ ] Zusatzbefund E — Höhenmessung inklusive Spacer-Widgets (Index-Versatz + verfälschte Höhen) —
      **behoben** durch den Klassen-Filter in 3.2c und in-Browser über den Idempotenz-Assert 4.2
      bestätigt; ohne diesen Filter ist der Filler-Fix aus 1.1 nicht korrekt.

Nach Umsetzung und grünem Testlauf ist der Backlog-Status von `seitenlayout-ansicht`
(`specs/FEATURE-BACKLOG.md` Zeile 395) von „vorhanden" (unverifiziert) auf „vorhanden" (verifiziert,
mit den in Abschnitt 1.5 benannten, bewusst dokumentierten Einschränkungen) zu aktualisieren — nicht
auf „teilweise", da alle in Abschnitt 7 der Anforderungsdatei genannten Kriterien mit diesem Plan
adressiert sind (behoben **oder** explizit als bewusste, dokumentierte Einschränkung festgehalten,
keines bleibt stillschweigend offen).
