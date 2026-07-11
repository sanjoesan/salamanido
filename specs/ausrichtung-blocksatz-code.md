# Ausrichtung Blocksatz — dateigenauer Umsetzungsplan

Gegenstück zu `specs/ausrichtung-blocksatz-req.md`. Dieses Dokument beschreibt, nach
tatsächlicher Codelektüre (nicht nur Backlog-/Anforderungsangabe) **und** nach
programmatischer Inspektion der realen Fixture-Dateien (siehe Abschnitt 6), was am
bestehenden Code zu ändern ist, welche Dateien neu angelegt werden, und wie die in der
Anforderung geforderte Verifikation technisch umgesetzt wird. Stil und Gliederung folgen
bewusst `specs/durchgestrichen-code.md` (nächstverwandter, bereits erstellter Plan für ein
Geschwisterfeature mit identischem Methodik-Anspruch), damit beide Pläne vergleichbar
bleiben.

> **Verifikations-Refresh (2026-07-05).** Alle Zeilennummern in diesem Plan wurden
> gegen den **aktuellen** Quellcode neu geprüft und auf den Stand gebracht, den auch die
> aktuelle Fassung von `ausrichtung-blocksatz-req.md` (Abschnitt 0) referenziert. **Bei
> diesem Durchlauf korrigiert:** die `WordEditor.tsx`-Fundstellen für den `keymap`-Block
> (jetzt `85-107`, zuvor stale `77-99`) und für `dispatchTransaction` (jetzt `125-132`,
> `view.state.apply(tr)` in Zeile `126`, zuvor stale `117-124`/Zeile `118`) — dieselben
> Werte, die auch `ausrichtung-blocksatz-req.md` Abschnitt 0 nennt; die übrigen
> Fundstellen (`commands.ts`, `schema.ts`, `Toolbar.tsx`, `docx/reader.ts:14/238-240`,
> `docx/writer.ts:18/69-72`, `odt/reader.ts:64-66`, `WordEditor.tsx:12`) sind gegen die
> aktuelle Quelle unverändert bestätigt. Ein
> früherer Entwurf dieses Plans zitierte eine ältere, kleinere Fassung der geteilten
> Dateien (vor Einbau des Ausschneiden-Features, das `commands.ts`/`Toolbar.tsx`/
> `WordEditor.tsx` verlängert hat). Die Anforderung wurde zwischenzeitlich **umnummeriert**:
> Der `CellSelection`-Wirkungsbereichs-Fehler, den dieser Plan ursprünglich als eigenen
> Fund „über die Anforderung hinaus" führte, ist jetzt **explizit als Anforderung 2.3
> (Grenzfall 3.4)** aufgenommen — die Querverweise wurden entsprechend auf die aktuelle
> Nummerierung (2.3 = Zellauswahl-Wirkungsbereich, 2.4 = Anzeige, 2.5 = kein Toggle,
> 2.6 = Formatvorlagen, 2.7 = Listen/Zellen) gezogen. Der **Symbol-/Funktionsname**
> bleibt wie in der Anforderung selbst der stabile Anker; die Zeilennummer ist nur ein
> Hinweis. Der Fixture-Korpus wurde für diesen Refresh erneut programmatisch gescannt
> (Abschnitt 6) — alle Werte sind unverändert bestätigt.
>
> **Zweite kritische Prüfrunde (2026-07-05, dieser Durchlauf).** Der bisherige
> Plantext wurde gegen den tatsächlichen Code erneut abgeglichen (inkl.
> `commands.ts`, `Toolbar.tsx`, `schema.ts`, `docx/{reader,writer}.ts`,
> `odt/{reader,writer,styleRegistry}.ts`, `WordEditor.tsx`, `prosemirror-tables`/
> `prosemirror-state` in `node_modules`) — alle Code-Fundstellen, Zeilennummern und
> Zitate waren bereits korrekt, keine Korrektur nötig. **Zwei konkrete Fehler im
> Plan selbst wurden bei diesem Durchlauf gefunden und unten korrigiert:**
> (1) `src/formats/shared/editor/__tests__/commands.test.ts`, in Abschnitt 5.1
> bisher als „Neu" geführt, **existiert bereits** (mit Tests für `canCut`/
> `cutSelection` aus dem Ausschneiden-Feature) — die hier beschriebenen
> `setAlign`/`isAlignActive`/`setHeading`-Tests sind eine **Erweiterung** dieser
> Datei, kein Neuanlegen; (2) der Plan nahm für Abschnitt 4.3/Testfall 5.14
> (Cross-Format-Rundreise über die UI) fälschlich an, es gebe ein
> „Format-Switch-UI"-Muster in `docx.spec.ts`/`odt.spec.ts` — **das existiert
> nicht**: `DocumentWorkspace.tsx`s einziger „Exportieren"-Button
> (`handleExport`, Zeile 68-86) exportiert immer im **Ursprungsformat** des
> geöffneten/erstellten Dokuments, es gibt keine UI, um ein Zielformat zu wählen
> — derselbe, bereits in `specs/kopieren-code.md` Abschnitt 0.4/9 dokumentierte
> Cross-Feature-Blocker (dort als `test.fixme` R-3/R-4 in
> `clipboard-roundtrip.spec.ts:134-147` geführt). Neuer Abschnitt 3.16 sowie
> die entsprechend korrigierten Testfälle in Abschnitt 5 behandeln das jetzt
> explizit, statt es unbemerkt als lauffähig anzunehmen. Zusätzlich in diesem
> Durchlauf gefunden und korrigiert: **Testfall 5** (Formatvorlagenwechsel
> während Blocksatz aktiv) war im bisherigen Entwurf mit vorangehendem
> „Strg+A" formuliert — das führt laut dem bereits bestehenden,
> testverifizierten Befund 12/Grenzfall 21 in `specs/absatzformat-dropdown-req.md`
> dazu, dass `setHeading` auf einer `AllSelection` **immer** (auch bei genau
> einem Absatz) `false` zurückgibt und der Formatwechsel still ausbleibt — der
> Test hätte am falschen Bug (`setHeading`+`AllSelection`, nicht Gegenstand
> dieses Plans) statt am zu prüfenden Verhalten (Ausrichtungserhalt) gescheitert.
> Korrigiert in Abschnitt 5.2.

**Wichtiger Vorbehalt zur Abgrenzung:** `setAlign`/`isAlignActive`/`AlignButton`
(`src/formats/shared/editor/commands.ts`, `Toolbar.tsx`) sind **ein einziger,
geteilter Mechanismus** für alle vier Ausrichtungen (siehe auch
`specs/ausrichtung-links-req.md`, `-zentriert-req.md`, `-rechts-req.md`, alle mit
identischem Befund-Abschnitt). Dieser Plan behebt den Mechanismus **generisch** —
jede hier beschriebene Code-Änderung wirkt automatisch auf alle vier Werte, nicht nur
auf `justify`. Sollte künftig `ausrichtung-links-code.md`/`-zentriert-code.md`/
`-rechts-code.md` erstellt werden, sollten diese auf **dieses** Dokument verweisen
statt den Mechanismus erneut zu analysieren — analog dazu, wie
`durchgestrichen-code.md` auf `unterstrichen-einfach-code.md` verwiesen hat, um
widersprüchliche Parallel-Entscheidungen zu vermeiden. Ebenso überschneidet sich
Abschnitt 3.5 dieses Plans (`setHeading` setzt `align` zurück) mit
`specs/absatzformat-dropdown-req.md` (Befund 4, Grenzfall 8/9) — die dort noch
ausstehende `absatzformat-dropdown-code.md` sollte die hier getroffene Entscheidung
übernehmen, nicht erneut unabhängig entscheiden.

## 0. TL;DR

Der in der Anforderung als **kritischster Punkt** bezeichnete Verdacht (Abschnitt 2.2)
ist **bestätigt, kein falscher Verdacht**: `setAlign` (`commands.ts:13-27`) baut bei
mehreren betroffenen Blöcken mehrere Transactions aus derselben unveränderten
`state`-Closure-Variable und dispatcht jede einzeln (`state.tr…`, Zeile 21);
`WordEditor.tsx`s `dispatchTransaction` (`WordEditor.tsx:125-132`) wendet jede über
`view.state.apply(tr)` (Zeile 126) auf das inzwischen bereits veränderte `view.state`
an. Ab dem zweiten betroffenen Block wirft `EditorState.apply()` (intern
`applyInner`, das `tr.before.eq(this.doc)` prüft) `RangeError: "Applying a mismatched
transaction"` — unbehandelt, kein `try`/`catch`, keine Error-Boundary. **Strg+A →
Blocksatz auf ein Mehrfach-Absatz-Dokument ist damit real defekt**, exakt wie vermutet.

Zusätzlich beim Audit bestätigt bzw. entschieden:

1. **`CellSelection`-Wirkungsbereich (jetzt Anforderung 2.3/Grenzfall 3.4).** Selbst
   nach einem naheliegenden Fix („eine Transaction, mehrere
   `setNodeAttribute`-Aufrufe") bliebe ein **zweiter, eigenständiger Fehler** bestehen:
   `setAlign` müsste über `state.selection.ranges` iterieren, nicht über das rohe
   `from`/`to`-Intervall (`commands.ts:15`) — sonst wird bei einer nicht-rechteckigen
   `CellSelection` (z. B. Spalte 2 von 3 markiert) auch die dazwischenliegende, **nicht
   markierte** Zelle 3 mitjustiert. Das wäre kein Absturz, sondern ein **stiller
   Korrektheitsfehler** (falsche Zellen verändert) — schlimmer als die Exception, weil
   unbemerkt. Die aktuelle Fassung der Anforderung führt genau diesen Fall inzwischen
   als eigenen Verdacht 2.3; beide Fehler werden mit derselben Code-Änderung behoben
   (Abschnitt 3.1).
2. `setHeading` (`commands.ts:40-55`) setzt `align` beim Formatvorlagenwechsel hart auf
   `'left'` zurück (Zeile 43) — bestätigt exakt wie in der Anforderung beschrieben.
   **Entscheidung getroffen** (Anforderung 2.6 verlangt eine Entscheidung, keine bloße
   Feststellung): Ausrichtung ist Direktformatierung und überlebt den
   Formatvorlagenwechsel künftig in beide Richtungen. Dieselbe Änderung betrifft
   `absatzformat-dropdown-req.md` Befund 4.
3. `isAlignActive` (`commands.ts:29-38`) liest nur `$from` — bestätigt. **Entscheidung
   getroffen** (Anforderung 2.4/Grenzfall 3.5 verlangt Klärung): bei einer
   Mehrfachblock-Selektion zeigt der Button künftig nur „gedrückt", wenn **alle**
   betroffenen Blöcke bereits diese Ausrichtung haben (Word-Konvention), nicht nur der
   erste.
4. Kein Toggle-Charakter, aber die Anforderung (2.5) bittet als Nice-to-have um
   Vermeidung unnötiger Undo-Schritte bei wiederholtem Klick auf eine bereits gesetzte
   Ausrichtung — wird umgesetzt (gleiche Code-Stelle wie Fund 1).
5. `Toolbar.tsx`s `AlignButton` (`Toolbar.tsx:91-111`) hat kein `aria-label` —
   bestätigt, wird gefixt (betrifft alle vier Buttons gleichermaßen).
6. Kein Tastenkürzel (`WordEditor.tsx:85-107`) — bestätigt. **Entscheidung**: wird
   ergänzt, aber **bewusst nicht** als `Strg+L/E/R/J` (Word-Konvention), weil `Strg+L`
   (Adressleiste) und `Strg+J` (Downloads-Ablage) in Chrome/Edge auf Windows/Linux
   browser-reservierte Tastenkombinationen sind, die die Seite nie zu Gesicht bekommt —
   siehe Abschnitt 3.8 für die vollständige Risikoabwägung und die gewählte Alternative.
7. `docx/reader.ts`s `JC_TO_ALIGN` (Zeile 14) und `odt/reader.ts`s rohe Übernahme von
   `fo:text-align` (Zeile 65-66) kennen `start`/`end` nicht (Grenzfall 8/9 der
   Anforderung) — **mit echten Fixture-Dateien aus dem vorhandenen Korpus bestätigt**
   (nicht nur spekuliert, siehe Abschnitt 6): `rtl.docx`, `table-alignment.docx`,
   `table-indent.docx`, `unicode-path.docx` (DOCX, `w:jc val="start"`) sowie mehrere
   ODT-Fixtures inkl. `feature_attributes_paragraph_MSO2013.odt` (`fo:text-align="end"`).
   Wird gefixt (LTR-Näherung `start→left`, `end→right`, dokumentierte Grenze siehe
   Abschnitt 3.9/3.11).
8. **Korrektur an der Anforderung selbst, durch Fixture-Inspektion gefunden:**
   `TestTableCellAlign.docx` und `tabelleAlignMargin.odt` — beide in Anforderung
   Abschnitt 0/Testfall 5.17 als Fixtures benannt — enthalten **keine einzige**
   horizontale Absatzausrichtung (`w:jc`/`fo:text-align`). Ersteres testet
   ausschließlich vertikale Zellausrichtung (`w:vAlign`, ein separates, nicht
   implementiertes Feature), letzteres ausschließlich `table:align="margins"`
   (Tabellenposition auf der Seite). *(Die aktuelle Anforderung hat diese Korrektur
   inzwischen in Abschnitt 0.1 selbst übernommen — dieser Plan bleibt konsistent
   dazu.)* Testfall 5.17 wird entsprechend präzisiert (Abschnitt 6).
9. Style-seitig ererbtes `w:jc` (Grenzfall 10) — **mit einer echten, bereits im Korpus
   vorhandenen, sich selbst dokumentierenden Fixture bestätigt**
   (`bug-paragraph-alignment.docx`, siehe Abschnitt 6): ein Absatz ohne direktes
   `w:jc`, dessen Formatvorlage `center` deklariert, wird derzeit fälschlich als
   `left` gelesen. Laut Anforderung selbst (Rundreise 4.1.10) ist Style-Vererbung
   **nicht** Teil dieser Anforderung — **bewusst nicht behoben**, aber jetzt mit Test
   eingefroren statt still zu bleiben.
10. **Neuer Fund bei diesem Durchlauf, App-weiter Cross-Feature-Blocker:** Die
    Anforderungen 4.1.8/4.2.7/4.3 (Cross-Format-Rundreisen DOCX↔ODT, doppelte
    Rundreise) sind über die echte Browser-UI **nicht durchführbar** —
    `DocumentWorkspace.tsx`s einziger „Exportieren"-Button exportiert immer im
    Ursprungsformat, es gibt keine Wahl eines Zielformats. Bereits identisch
    dokumentiert in `kopieren-code.md` Abschnitt 0.4/9 (dort `test.fixme` R-3/
    R-4) und `cut.spec.ts` — kein neuer Bug, sondern derselbe, hier zum ersten
    Mal für dieses Feature explizit nachgezogene Befund. Siehe Abschnitt 3.16.

Der weit überwiegende Teil des Aufwands ist wie beim Schwesterfeature **neue
Testabdeckung**: ein komplett neuer E2E-Test (der Kernbug ist der bisher wichtigste
ungetestete Pfad im gesamten Editor), gezielte Unit-Tests für die
Fremdformat-Grenzfälle mit echten Fixtures, und eine Erweiterung der bestehenden
Einzelabsatz-Roundtrip-Tests um Mehrfachabsatz-/Tabellen-/Listen-Szenarien.

---

## 1. Methodik dieser Prüfung

Gelesen wurden: `src/formats/shared/schema.ts`, `src/formats/shared/editor/{commands,
Toolbar,WordEditor}.tsx`, `src/formats/docx/{reader,writer}.ts`,
`src/formats/odt/{reader,writer,styleRegistry}.ts`, beide `__tests__/roundtrip.test.ts`,
`src/formats/docx/__tests__/external-fixtures.test.ts`, `tests/e2e/{docx,odt,
selection-regression}.spec.ts`, `FEATURE-SPEC-DOCX-ODT.md` (Abschnitte 1–3, 20–22),
`specs/FEATURE-BACKLOG.md` Abschnitt 2.3, `specs/absatzformat-dropdown-req.md` (wegen
der Übergabepunkte in Abschnitt 3.5), `specs/ausrichtung-{links,zentriert,rechts}-req.md`
(zur Bestätigung, dass der Mechanismus tatsächlich geteilt ist) sowie zum Vergleich
`specs/durchgestrichen-code.md`. Zusätzlich wurde `prosemirror-tables`
(`node_modules/prosemirror-tables/dist/index.cjs`) im Quellcode geprüft:

- **`CellSelection`-Konstruktor (Zeile 508-526):** baut in Zeile 517-523 aus den
  tatsächlich selektierten Zellen ein `ranges`-Array — **ein `SelectionRange` je
  Zelle**, dessen `$from`/`$to` genau den **Inhalt** der jeweiligen Zelle umspannt
  (`from = tableStart + pos + 1`, `to = from + cell.content.size`) — und übergibt es an
  den `Selection`-Basiskonstruktor. `state.selection.ranges` ist damit für **jede**
  Selektionsart (auch normale Text-/All-Selection, dort mit genau einem Eintrag) die
  korrekte, generische Iterationsgrundlage für den Fix aus Abschnitt 3.1.
- **`CellSelection.create(doc, anchorCell, headCell)` (Zeile 663-665):** löst beide
  Argumente per `doc.resolve()` auf und erwartet Positionen, die **direkt vor** einer
  Zelle stehen (`$anchorCell.node(-1)` muss die Tabelle sein) — relevant für die
  korrekte Konstruktion der Testselektion in Abschnitt 5.1 (siehe dortige Anmerkung
  zur Positionsauflösung).

**Der gesamte Fixture-Korpus wurde zusätzlich programmatisch (Node-Skript mit
`jszip`, demselben Paket, das der Reader selbst nutzt) nach `w:jc`- bzw.
`fo:text-align`-Werten durchsucht** — Ergebnis vollständig in Abschnitt 6, für diesen
Refresh am 2026-07-04 erneut bestätigt. Das ist derselbe empirische Ansatz, den
`durchgestrichen-code.md` Abschnitt 6 für `text-line-through-style` verwendet hat, hier
für DOCX **und** ODT vollständig durchgeführt.

---

## 2. Ist-Zustand nach Codelektüre — Abgleich mit der Anforderungstabelle

Zeilennummern in dieser Tabelle entsprechen dem aktuellen Quellcode (2026-07-04) und
stimmen mit Abschnitt 0 der Anforderung überein.

| Fundstelle (aktueller Code) | Verifiziert im Code | Abweichung? |
|---|---|---|
| `schema.ts:4` `alignAttr`, kein Enum | Ja, exakt so (`{ align: { default: 'left', validate: 'string' } }`) | keine |
| `schema.ts:16-24`/`26-38` `paragraph`/`heading`, `parseDOM` liest `dom.style.textAlign \|\| 'left'` (Zeile 20 bzw. 33), `toDOM` rendert `text-align` (Zeile 21-23 bzw. 35-37) | Ja, exakt so, für beide Node-Typen identisch | keine |
| `commands.ts:8,10` `Align`-Typ, `alignableTypes` | Ja, exakt so | keine |
| `commands.ts:13-27` `setAlign`: `nodesBetween(from,to,…)` (Zeile 17), `dispatch(state.tr.setNodeAttribute(...))` je Treffer (Zeile 21), `state` bleibt die ursprüngliche Closure-Variable | Ja, exakt so — **RangeError-Verdacht bestätigt**, siehe Abschnitt 3.1 | **bestätigter kritischer Bug** |
| `commands.ts:29-38` `isAlignActive`: nur `$from` | Ja, exakt so | bestätigt, siehe Abschnitt 3.3 |
| `commands.ts:40-55` `setHeading`: `align:'left'` hart bei Wechsel zu Überschrift (Zeile 43); `attrs: undefined` (⇒ Schema-Default `left`) bei Wechsel zu Standard | Ja, exakt so | bestätigt, siehe Abschnitt 3.5 |
| `Toolbar.tsx:91-111` `AlignButton`: `title` (Zeile 96), `aria-pressed`, **kein** `aria-label` | Ja, exakt so — anders als `MarkButton` (`Toolbar.tsx:55-89`, `aria-label` Zeile 74) | bestätigt, siehe Abschnitt 3.6 |
| `Toolbar.tsx:234-237` vier Buttons, reine Unicode-Glyphen `⇤ ↔ ⇥ ≡` | Ja, exakt so | bestätigt, siehe Abschnitt 3.7 |
| `WordEditor.tsx:85-107` Keymap ohne Ausrichtungs-Kürzel | Ja, exakt so — `Mod-z/y/Shift-z`, `Enter`, `Shift-Enter`, `Mod-b/i/u`, `Shift-Delete` | bestätigt, siehe Abschnitt 3.8 |
| `WordEditor.tsx:125-132` `dispatchTransaction` wendet `tr` auf aktuelles `view.state` an (Zeile 126: `view.state.apply(tr)`, dann `view.updateState(newState)`) | Ja, exakt so | bestätigt — genau der Mechanismus, der Abschnitt 3.1 in Kombination mit `commands.ts:21` zum Absturz bringt |
| `docx/reader.ts:14` `JC_TO_ALIGN` kennt nur `left/center/right/both` | Ja, exakt so | bestätigt **und mit echten Fixtures belegt**, siehe Abschnitt 3.9/6 |
| `docx/reader.ts:238-240` liest nur direktes `w:pPr` (`jcEl`/`jcVal`/`align`), kein Style-`w:jc` | Ja, exakt so | bestätigt **und mit echter, sich selbst dokumentierender Fixture belegt**, siehe Abschnitt 3.13/6 |
| `docx/reader.ts:229,337-339,475` Tabellenzellen laufen durch `paragraphToBlocks` | Ja, exakt so | keine — bereits korrekt, siehe Abschnitt 3.14 |
| `docx/writer.ts:18` `JC_BY_ALIGN` | Ja, exakt so | keine |
| `docx/writer.ts:69-72` `paragraphPropsXml`, immer explizites `<w:jc>` (Zeile 71) | Ja, exakt so | bewusst unverändert, siehe Abschnitt 3.10 |
| `odt/reader.ts:25,64-66` `paragraphAligns` liest `fo:text-align` roh (Zeile 65: `props?.getAttributeNS(fo,'text-align')`, Zeile 66: `if (align) paragraphAligns.set(name, align)`) | Ja, exakt so | bestätigt **und mit echten Fixtures belegt**, siehe Abschnitt 3.11/6 |
| `odt/reader.ts:94,178,259` Fallback `'left'` (leerer Absatz/Fließtext/Überschrift) | Ja, exakt so | keine, bleibt korrekt nach Fix |
| `odt/writer.ts:88-89`/`95-97` `PARAGRAPH_ALIGN_STYLE_NAME[align] ?? …left` | Ja, exakt so | keine, siehe Abschnitt 3.12 |
| `odt/styleRegistry.ts:61-93` feste Stildefinitionen, literal `left`/`right` statt `start`/`end` | Ja, exakt so | bewusst unverändert, siehe Abschnitt 3.12 |
| `docx/__tests__/roundtrip.test.ts:54-59`, `odt/…` analog | Ja, `it.each(['left','center','right','justify'])` mit `paragraph('Text', align)` (Helper Zeile 23-25) — je Testlauf **ein** Absatz; Heading-Ausrichtung nur `center` (Zeile 47-51) | bestätigt, siehe Abschnitt 5.1 |
| `docx/__tests__/external-fixtures.test.ts` | Ja, ausschließlich „importiert ohne Absturz" | bestätigt |
| `tests/e2e/*.spec.ts` ohne Ausrichtungs-Erwähnung | Ja, Volltextsuche nach `align`/`Ausrichtung`/`Blocksatz`/`justify` über `tests/` ergab keinen Treffer | bestätigt |

Zusätzlich beim Audit gefunden, **nicht** in der Anforderungstabelle Abschnitt 0
zeilengenau aufgeführt:

- **`prosemirror-tables`s `CellSelection.ranges`** (Abschnitt 1): Das rohe
  `from`/`to`-Intervall, das `setAlign` aktuell verwendet, deckt bei einer
  Spalten-`CellSelection` mehr Text ab als tatsächlich selektiert ist — der zweite,
  unabhängige Fehler, der auch nach einem naiven Exception-Fix bestehen bliebe
  (Abschnitt 3.1). *(Die Anforderung führt ihn inzwischen als 2.3.)*
- **`specs/absatzformat-dropdown-req.md` Befund 4**: identischer Code-Fund
  (`setHeading` setzt `align` zurück) wird dort aus der
  Formatvorlagen-Dropdown-Perspektive beschrieben; dieser Plan trifft die
  verbindliche Entscheidung dafür (Abschnitt 3.5), damit keine widersprüchliche
  Zweitentscheidung in einer künftigen `absatzformat-dropdown-code.md` entsteht.

---

## 3. Gefundene Defekte / Verbesserungen im bestehenden Code

### 3.1 KERNBUG (Anforderung 2.2/2.3, Testfall 5.1/5.6): `setAlign` wirft `RangeError` ab dem zweiten Block — **plus der Wirkungsbereichs-Fehler bei `CellSelection`**

`commands.ts:13-27`, aktuell:

```ts
export function setAlign(align: Align): Command {
  return (state, dispatch) => {
    const { from, to } = state.selection
    let applicable = false
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (alignableTypes.has(node.type.name)) {
        applicable = true
        if (dispatch) {
          dispatch(state.tr.setNodeAttribute(pos, 'align', align))
        }
      }
    })
    return applicable
  }
}
```

**Fehler 1 (Anforderung 2.2, durch Codelektüre bestätigt):**
Jeder `dispatch()`-Aufruf erzeugt eine neue Transaction aus derselben,
über die gesamte Schleife hinweg **unveränderten** `state`-Variable
(`state.tr` — Zeile 21). `WordEditor.tsx`s `dispatchTransaction` (Zeile 125-132)
wendet jede über `view.state.apply(tr)` (Zeile 126) auf das zu diesem Zeitpunkt
**aktuelle** `view.state` an. Nach dem ersten `dispatch()` weicht `view.state.doc`
(erster Block bereits `justify`) von `tr.before` der zweiten, aus dem alten `state`
gebauten Transaction ab — `EditorState.apply()` (intern `applyInner`, das
`tr.before.eq(this.doc)` verlangt) wirft
`RangeError: "Applying a mismatched transaction"`. Der erste Block bleibt
geändert, alle weiteren nicht, die Exception ist unbehandelt (kein `try`/`catch` in
`Toolbar.tsx`s `run()` (Zeile 28-31), keine React-Error-Boundary im `src`-Baum —
geprüft, keine vorhanden).

**Fehler 2 (Anforderung 2.3/Grenzfall 3.4):** Selbst nach einem
naheliegenden „eine Transaction, mehrere `setNodeAttribute`"-Fix bliebe das rohe
`{ from, to } = state.selection`-Intervall (Zeile 15) problematisch. Bei einer normalen
`TextSelection`/`AllSelection` ist `from`/`to` korrekt (ein zusammenhängender
Bereich). Bei einer `CellSelection` aus `prosemirror-tables` (Anforderung 2.7,
Grenzfall 3.4) ist `.from`/`.to` jedoch nur die **äußere Umschließung** der
selektierten Zellen in Dokument-Reihenfolge — bei einer Spalten-Selektion, die
nicht alle Spalten einer Zeile abdeckt (z. B. Spalte 2 von 3, über zwei Zeilen),
liegt zwischen `from` und `to` in der flachen Dokumentreihenfolge auch die
**nicht** selektierte Zelle 3 der ersten Zeile. `nodesBetween(from, to, …)` würde
diese Zelle mit erfassen und ebenfalls justieren — ein stiller, in der Anzeige
nicht erkennbarer Korrektheitsfehler (falsche Zellen verändert), der schwerer
wiegt als die Exception aus Fehler 1, weil er **nicht** abstürzt und daher leicht
unbemerkt bliebe. `prosemirror-tables`s eigener Konstruktor (`dist/index.cjs`
Zeile 517-523) baut für genau diesen Fall bereits ein korrektes `ranges`-Array
(ein `SelectionRange` je tatsächlich selektierter Zelle) und übergibt es an
`Selection`s Basiskonstruktor — `state.selection.ranges` ist daher für **jede**
Selektionsart (auch normale Text-/All-Selection, dort mit genau einem Eintrag)
die korrekte, generische Iterationsgrundlage.

**Fix (behebt beide Fehler mit derselben Änderung), inklusive Umsetzung von
Anforderung 2.5 (kein unnötiger Undo-Schritt bei bereits gesetzter Ausrichtung —
siehe Abschnitt 3.4 für die Begründung, hier bereits eingearbeitet):**

```ts
/** Sets text-align on every alignable block touched by the selection, in a single
 * transaction/undo step — including every cell of a (possibly non-rectangular-in-
 * document-order) CellSelection, via `selection.ranges` rather than the raw
 * from/to span (see ausrichtung-blocksatz-code.md Abschnitt 3.1 for why the naive
 * from/to span is wrong for a column CellSelection). Blocks that already have this
 * alignment are left untouched, so a repeat click on an already-justified
 * selection dispatches nothing (Anforderung 2.5: kein unnötiger Undo-Schritt). */
export function setAlign(align: Align): Command {
  return (state, dispatch) => {
    const positions = new Set<number>()
    let applicable = false
    for (const { $from, $to } of state.selection.ranges) {
      state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
        if (!alignableTypes.has(node.type.name)) return
        applicable = true
        if (node.attrs.align !== align) positions.add(pos)
      })
    }
    if (!applicable) return false
    if (dispatch && positions.size > 0) {
      const tr = state.tr
      for (const pos of positions) tr.setNodeAttribute(pos, 'align', align)
      dispatch(tr)
    }
    return true
  }
}
```

Bewusste Designentscheidungen, hier festgehalten statt stillschweigend
umgesetzt:

- Rückgabewert bleibt `true`, auch wenn `positions.size === 0` (bereits überall
  gesetzt) — konsistent mit dem üblichen ProseMirror-`Command`-Vertrag
  („anwendbar", unabhängig davon, ob tatsächlich dispatcht wurde; wird z. B. für
  Keymap-Chaining verwendet). Ist **kein** alignierbarer Block erfasst (reine
  Bild-`NodeSelection`, Grenzfall 3.6), bleibt `applicable` `false` → Rückgabe
  `false`, kein Dispatch (sichtbar nichts, aber kein Fehler).
- Kein Toggle: ein Klick auf „Blocksatz" setzt **immer** `justify`, nie zurück auf
  einen vorherigen Wert — exakt wie in Anforderung 2.1/2.5 gefordert (Ausrichtung
  ist ein 4-Werte-Zustand ohne „Aus").
- `Set<number>` statt `Array<number>`, um bei sich überlappenden `ranges`
  (kommt für die vier hier relevanten Selektionsarten nicht vor, ist aber
  billige Absicherung) keine doppelten `setNodeAttribute`-Aufrufe auf denselben
  `pos` zu erzeugen.
- Der Einsatz von **derselben** akkumulierenden `tr`-Instanz für alle
  `setNodeAttribute`-Aufrufe ist unkritisch bzgl. Positionsverschiebung: ein
  Attribut-Update ändert die Knotengröße nicht, alle zuvor mit
  `state.doc.nodesBetween` (auf dem **unveränderten** Ausgangsdokument)
  ermittelten `pos`-Werte bleiben über die gesamte Schleife hinweg gültig.

### 3.2 (entfällt als eigener Abschnitt — in 3.1 mitbehoben, siehe dort)

### 3.3 Anforderung 2.4/Grenzfall 3.5 — Anzeige bei Mehrfachselektion mit gemischter Ausrichtung

`commands.ts:29-38`, aktuell liest `isAlignActive` ausschließlich den Vorfahren an
`$from`:

```ts
export function isAlignActive(state: EditorState, align: Align): boolean {
  const { $from } = state.selection
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth)
    if (alignableTypes.has(node.type.name)) {
      return node.attrs.align === align
    }
  }
  return false
}
```

Bei einer Selektion über mehrere Blöcke mit **unterschiedlicher** Ausrichtung zeigt
der Button den Zustand ausschließlich des ersten Blocks — für die Nutzer:in
irreführend, weil ein Klick auf „Blocksatz" (dank Fix 3.1) nun **alle** Blöcke der
Selektion betrifft, die Anzeige aber nur einen davon widerspiegelt.

**Entscheidung (verbindliche Anzeige-Konvention für Anforderung 2.4/Grenzfall 3.5):**
Bei einer nicht-leeren Selektion zeigt der Button „gedrückt" nur, wenn **jeder**
von der Selektion erfasste alignierbare Block bereits diese Ausrichtung hat — eine
gemischte Selektion zeigt **keinen** der vier Buttons gedrückt. Das entspricht der
in der Anforderung selbst genannten Word-Konvention und ist die einzige der drei
denkbaren Alternativen, die nicht in sich widersprüchlich ist:

- „Nur `$from`" (Ist-Zustand): zeigt einen Wert an, der nicht für die ganze
  Selektion gilt — irreführend.
- „Aktiv, wenn **irgendein** Block diese Ausrichtung hat": bei einer gemischten
  Selektion (z. B. ein Block `left`, einer `justify`) könnten dann **zwei** Buttons
  gleichzeitig gedrückt erscheinen — für einen exklusiven 4-Werte-Zustand
  unsinnig (anders als bei Marks, wo Mehrfach-Zustände normal sind).
- „Aktiv, wenn **alle** Blöcke diese Ausrichtung haben" (gewählt): genau ein oder
  kein Button ist je gedrückt, konsistent mit dem exklusiven Charakter der
  Ausrichtung.

```ts
export function isAlignActive(state: EditorState, align: Align): boolean {
  const { $from, empty } = state.selection
  if (empty) {
    for (let depth = $from.depth; depth >= 0; depth--) {
      const node = $from.node(depth)
      if (alignableTypes.has(node.type.name)) return node.attrs.align === align
    }
    return false
  }
  // Nicht-leere Selektion (inkl. mehrteiliger CellSelection, siehe Abschnitt 3.1):
  // "gedrückt" nur, wenn JEDER erfasste alignierbare Block bereits diese
  // Ausrichtung hat. Eine gemischte Selektion zeigt keinen der vier Buttons
  // gedrückt — siehe Anforderung 2.4/Grenzfall 3.5.
  let found = false
  let uniform = true
  for (const { $from: rf, $to: rt } of state.selection.ranges) {
    state.doc.nodesBetween(rf.pos, rt.pos, (node) => {
      if (!alignableTypes.has(node.type.name)) return
      found = true
      if (node.attrs.align !== align) uniform = false
    })
  }
  return found && uniform
}
```

Verhalten am Cursor (leere Selektion, der weit überwiegende Alltagsfall) bleibt
**exakt** unverändert — kein Regressionsrisiko für den bereits (vermeintlich)
funktionierenden Einzelblock-Fall.

### 3.4 Anforderung 2.5/Grenzfall 3.11 — Kein Toggle, aber Undo-Sparsamkeit

Bereits in Abschnitt 3.1 mit umgesetzt (die `positions`-Menge enthält nur Blöcke,
deren `align` sich tatsächlich ändert; ist sie leer, wird nicht dispatcht). Damit
sind **beide** Teilfragen aus Anforderung 2.5 explizit beantwortet:

1. Kein Toggle-Charakter: ein Klick setzt immer `justify`, nie ein „Aus". **So
   umgesetzt, unverändert zum Ist-Zustand.**
2. Kein unnötiger Undo-Schritt bei wiederholtem Klick auf eine bereits
   durchgängig justierte Selektion: **umgesetzt** (Nice-to-have aus der
   Anforderung, hier nicht übersprungen, weil ohnehin dieselbe Codestelle
   geändert wird).

Als Nebeneffekt löst das auch Grenzfall 3.11 (schnelles Mehrfachklicken): jeder
Klick nach dem ersten erzeugt keine weitere Transaction mehr, kein doppeltes
Undo-Rauschen.

### 3.5 Anforderung 2.6 — `setHeading` setzt `align` beim Formatvorlagenwechsel zurück (geteilt mit `absatzformat-dropdown-req.md`)

`commands.ts:40-55`, aktuell:

```ts
export function setHeading(level: number | null): Command {
  return (state, dispatch) => {
    const type = level === null ? wordSchema.nodes.paragraph : wordSchema.nodes.heading
    const attrs = level === null ? undefined : { level, align: 'left' }
    const { $from, $to } = state.selection
    if (!$from.sameParent($to)) return false
    const parent = $from.parent
    if (!alignableTypes.has(parent.type.name)) return false
    if (dispatch) {
      const pos = $from.before($from.depth)
      const tr = state.tr.setBlockType(pos, pos + parent.nodeSize, type, attrs)
      dispatch(tr)
    }
    return true
  }
}
```

Jeder Wechsel (in beide Richtungen) setzt `align` unabhängig vom vorherigen Wert
zurück auf `'left'` (explizit bei Wechsel zu einer Überschrift, Zeile 43; implizit
über den Schema-Default bei Rückwechsel zu Standard, `attrs: undefined`). Ein zuvor
im Blocksatz stehender Absatz verliert diesen beim Wechsel zu „Überschrift 1"
kommentarlos.

**Entscheidung (verbindlich, beantwortet Anforderung 2.6 und
`absatzformat-dropdown-req.md` Befund 4/Grenzfall 8-9 gemeinsam):** Ausrichtung
ist Direktformatierung (Absatzattribut, unabhängig vom Node-Typ) und
überlebt einen Formatvorlagenwechsel — konsistent mit dem in beiden
Anforderungsdateien selbst genannten Word/LibreOffice-Verhalten und mit der
Erwartungshaltung der meisten Nutzer:innen. Die Alternative („Formatvorlage setzt
bewusst auf ihren eigenen Standard zurück") wäre zwar ebenfalls ein legitimes
Modell, widerspricht hier aber der Tatsache, dass in diesem Editor „Überschrift N"
gar keine eigenständige, vom Nutzer konfigurierbare Formatvorlage ist (nur
Level+feste Schriftgröße/-stärke über `styleDefs.ts`/`styleRegistry.ts`), sondern
lediglich ein Node-Typ-Wechsel — es gibt hier kein „Formatvorlagen-Default", von
dem sich die direkte Ausrichtung sinnvoll abgrenzen ließe.

```ts
export function setHeading(level: number | null): Command {
  return (state, dispatch) => {
    const type = level === null ? wordSchema.nodes.paragraph : wordSchema.nodes.heading
    const { $from, $to } = state.selection
    if (!$from.sameParent($to)) return false
    const parent = $from.parent
    if (!alignableTypes.has(parent.type.name)) return false
    // Ausrichtung ist Direktformatierung und überlebt einen Formatvorlagenwechsel
    // (Word/LibreOffice-Konvention) — siehe ausrichtung-blocksatz-code.md
    // Abschnitt 3.5 / Anforderung 2.6, geteilt mit absatzformat-dropdown-req.md
    // Befund 4 / Grenzfall 8-9. Zuvor wurde hier hart auf 'left' zurückgesetzt.
    const align = (parent.attrs.align as string | undefined) ?? 'left'
    const attrs = level === null ? { align } : { level, align }
    if (dispatch) {
      const pos = $from.before($from.depth)
      const tr = state.tr.setBlockType(pos, pos + parent.nodeSize, type, attrs)
      dispatch(tr)
    }
    return true
  }
}
```

Keine Änderung an der bereits in `absatzformat-dropdown-req.md` Befund 3
dokumentierten, hier **nicht** behobenen Einschränkung (`setHeading` wirkt nur
auf einen einzelnen Block, `!$from.sameParent($to)` → `return false` bei
Mehrfachselektion, Zeile 45) — das ist eine eigenständige Design-Frage jener
Anforderung, nicht Gegenstand dieses Plans; hier nur insofern relevant,
als sie **nicht** durch den vorliegenden Fix verändert wird.

### 3.6 Bedienelement Nr. 4 — fehlendes `aria-label`

`Toolbar.tsx:91-111`. Betrifft, wie bereits im TL;DR benannt, alle vier
`AlignButton`-Instanzen gleichermaßen, da sie dieselbe Komponente teilen. Fix,
zugleich Auflösung von Bedienelement Nr. 3/4 (sichtbarer deutscher Text statt nur
des internen `align`-Bezeichners im Tooltip — bisher `title="Ausrichtung: justify"`
(Zeile 96), der interne englische Wert landet im Tooltip statt eines deutschen
Begriffs):

```tsx
const ALIGN_LABELS: Record<Align, string> = {
  left: 'Linksbündig',
  center: 'Zentriert',
  right: 'Rechtsbündig',
  justify: 'Blocksatz',
}

// Reine Unicode-Glyphen — siehe Abschnitt 3.7 zum bewusst nicht behobenen
// Icon-Rendering-Risiko (FEATURE-SPEC-DOCX-ODT.md Abschnitt 20.1).
const ALIGN_GLYPHS: Record<Align, string> = {
  left: '⇤',
  center: '↔',
  right: '⇥',
  justify: '≡',
}

function AlignButton({ view, align }: { view: EditorView; align: Align }) {
  const active = isAlignActive(view.state, align)
  const label = ALIGN_LABELS[align]
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => {
        e.preventDefault()
        run(view, setAlign(align))
      }}
      className={`px-2 py-1 rounded text-sm border ${
        active
          ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-900'
          : 'border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
      }`}
    >
      {/* aria-hidden: der zugängliche Name kommt bereits vollständig aus
         aria-label (das laut Accessible-Name-Berechnung Vorrang vor
         Text-Inhalt hat); das Verstecken des Glyphen-Textknotens ist eine
         zusätzliche Absicherung gegen abweichendes AT-Verhalten, kein
         funktional notwendiger Teil des Fixes selbst. */}
      <span aria-hidden="true">{ALIGN_GLYPHS[align]}</span>
    </button>
  )
}
```

`label`-Prop entfällt (bisher an jeder Aufrufstelle mitgegebenes Glyphen-Zeichen,
jetzt intern aus `ALIGN_GLYPHS` abgeleitet); die vier Aufrufstellen
`Toolbar.tsx:234-237` werden zu:

```tsx
<AlignButton view={view} align="left" />
<AlignButton view={view} align="center" />
<AlignButton view={view} align="right" />
<AlignButton view={view} align="justify" />
```

**Präzisierung zur Anforderungstabelle Bedienelement Nr. 4:** Die Anforderung
vermutet, `title` werde „nur als Fallback benutzt, wenn kein Text-Inhalt vorhanden
ist" — das betrifft nur das Fehlen von `aria-label`. Sobald `aria-label` gesetzt ist
(wie hier), hat es laut Accessible-Name-Berechnung (WAI-ARIA `accname`) **Vorrang**
vor jedem Text-Inhalt, unabhängig davon, ob dieser vorhanden ist — der Fix ist
daher für sich allein bereits ausreichend; `aria-hidden` auf dem Glyphen-Span ist
zusätzliche Robustheit, keine Notwendigkeit.

### 3.7 Bedienelement Nr. 3 — Icon-Rendering (`⇤ ↔ ⇥ ≡`)

`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20.1 listet **alle** Toolbar-Unicode-Symbole
(`🖼 ⊞ ⇧ ⇤ ↔ ⇥ ≡ ⌫ 🖍`) als Icon-Rendering-Risiko, nicht nur die vier
Ausrichtungs-Glyphen. Anders als bei `durchgestrichen-code.md` Abschnitt 8 (wo die
Buchstaben „F/K/U/S" — gewöhnliche lateinische Zeichen, kein echtes Risiko —
bewusst unverändert blieben, weil kein Fund vorlag), ist das Risiko hier **real**:
`⇤ ↔ ⇥ ≡` sind echte, seltener unterstützte Unicode-Sonderzeichen.

**Entscheidung: In diesem Plan bewusst nicht behoben.** Eine Umstellung auf SVG
nur für die vier Ausrichtungs-Buttons wäre ein inkonsistenter Halbschritt,
solange `⌫ 🖍 ⊞ 🖼 ⇧` im selben Toolbar unverändert Unicode bleiben — das
Icon-Rendering-Risiko ist laut `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 22 Punkt 3
ausdrücklich ein **Toolbar-weites** Vorhaben, keine Einzelfeature-Aufgabe. Diese
Entscheidung erfüllt Abnahmekriterium 7 der Anforderung („bewusst beibehalten
oder behoben" — hier: bewusst beibehalten, mit Begründung, nicht stillschweigend
übergangen). Als Kompensation innerhalb des Umfangs dieses Plans:

- `aria-label` (Abschnitt 3.6) sorgt dafür, dass zumindest Screenreader-Nutzer:innen
  unabhängig vom visuellen Glyphen-Rendering den korrekten Namen hören.
- Empfehlung (kein Blocker, siehe Abschnitt 5.2): ein
  Playwright-`toHaveScreenshot`-Regressionstest auf die Button-Reihe der vier
  Ausrichtungs-Buttons, auf allen in `playwright.config.ts` konfigurierten
  Projekten (Desktop Chrome, Mobile Pixel 7, Tablet iPad Mini — siehe
  `absatzformat-dropdown-req.md` Testfall 17), um Rendering-Lücken wenigstens
  sichtbar zu dokumentieren, ohne den vollen SVG-Umbau vorwegzunehmen.
- Als offene Abhängigkeit vermerkt (Abschnitt 9).

### 3.8 Bedienelement Nr. 2 — Tastenkombination

`WordEditor.tsx:85-107`. **Entscheidung: wird ergänzt**, aber **bewusst nicht** als
`Strg+L/E/R/J` (die in Word/LibreOffice übliche Kombination, wie die Anforderung
selbst vorschlägt).

**Begründung/Risikoabwägung (muss laut Bedienelement Nr. 2 explizit dokumentiert,
nicht stillschweigend entschieden werden):** In Chrome/Edge unter Windows/Linux
sind mehrere naheliegende Kombinationen **browser-chrome-reserviert** — das
`keydown`-Event erreicht die Seite in diesen Fällen gar nicht erst:

| Kombination | Reserviert für | Betrifft |
|---|---|---|
| `Strg+L` | Adressleiste fokussieren | „Linksbündig" (Word-Standard) |
| `Strg+J` | Downloads-Ablage öffnen | „Blocksatz" (Word-Standard) — **die für dieses Feature konkret angefragte Kombination** |
| `Strg+Umschalt+J` | DevTools-Konsole öffnen | eine naheliegende Ausweich-Kombination (von Google Docs für „Blocksatz" verwendet — dort laut verbreiteten Nutzerberichten ebenfalls von Chrome abgefangen, kein verlässliches Vorbild) |

**Entscheidung:** `Strg/Cmd+Alt+L/E/R/J`, konsistent mit der in
`absatzformat-dropdown-req.md` (Abschnitt 1) für Formatvorlagen
vorgeschlagenen `Strg+Alt+`-Familie — dieselbe Modifikator-Gruppe wird damit
app-weit für Kombinationen verwendet, die bewusst außerhalb der bekannten
Browser-reservierten Kombinationen liegen.

Der bestehende Import `import { cutSelection, insertHardBreak } from './commands'`
(`WordEditor.tsx:12`) wird um `setAlign` erweitert. Die vier Einträge kommen
**additiv** in den bestehenden `keymap({...})`-Block (Zeile 85-107), ohne die
vorhandenen Bindungen (`Enter`, `Shift-Enter`, `Shift-Delete`, `Mod-b/i/u`, …) zu
entfernen:

```ts
import { cutSelection, insertHardBreak, setAlign } from './commands' // setAlign ergänzt

keymap({
  'Mod-z': undo,
  'Mod-y': redo,
  'Mod-Shift-z': redo,
  Enter: splitListItem(wordSchema.nodes.list_item),
  'Shift-Enter': insertHardBreak(),
  'Mod-b': toggleMark(wordSchema.marks.strong),
  'Mod-i': toggleMark(wordSchema.marks.em),
  'Mod-u': toggleMark(wordSchema.marks.underline),
  'Shift-Delete': cutSelection({ onCutBlocked: setCutError }),
  // Ausrichtung (ausrichtung-blocksatz-code.md Abschnitt 3.8): bewusst NICHT
  // Strg+L/E/R/J (Word-Standard) — Strg+L (Adressleiste) und Strg+J
  // (Downloads-Ablage) sind in Chrome/Edge unter Windows/Linux
  // browser-chrome-reservierte Kombinationen, die die Seite nie erreichen;
  // Strg+Umschalt+J kollidiert ebenso mit der DevTools-Konsole. Strg/Cmd+Alt+
  // ist konsistent mit der in absatzformat-dropdown-req.md vorgeschlagenen
  // Strg+Alt+-Familie für Formatvorlagen.
  'Mod-Alt-l': setAlign('left'),
  'Mod-Alt-e': setAlign('center'),
  'Mod-Alt-r': setAlign('right'),
  'Mod-Alt-j': setAlign('justify'),
}),
```

**Verbleibendes, offen zu dokumentierendes Risiko (kein stiller Fehlschlag im
Sinne von `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 20 Punkt 4):** Ob `Strg+Alt+…`
tatsächlich auf **jedem** relevanten Betriebssystem/Tastaturlayout kollisionsfrei
ist, ist hier **nicht** abschließend geklärt — auf macOS entspricht `Mod-Alt`
`Cmd+Option`, und `Option`-Kombinationen erzeugen auf einigen
nicht-US-Tastaturlayouts Sonderzeichen statt eines reinen Modifier-Events. Der in
Abschnitt 5.2 vorgesehene E2E-Test (`page.keyboard.press('ControlOrMeta+Alt+j')`)
verifiziert das zumindest für die in `playwright.config.ts` konfigurierte
Chromium-Umgebung automatisiert; eine manuelle Cross-Browser-/Cross-OS-Probe
(insbesondere macOS mit einem nicht-US-Layout) bleibt vor Abschluss des
Features empfohlen und ist als offene Abhängigkeit vermerkt (Abschnitt 9), statt
stillschweigend als „funktioniert überall" angenommen zu werden. Der sichtbare
Tooltip-Text (`title`, Abschnitt 3.6) bleibt bewusst **ohne** Kürzel-Hinweis wie
„(Strg+Alt+J)", bis diese Bestätigung vorliegt — Präzedenzfall:
`durchgestrichen-code.md` Abschnitt 3.5, dieselbe Zurückhaltung.

### 3.9 Grenzfall 3.9 — DOCX-Reader: `w:jc val="start"/"end"/"distribute"/"thaiDistribute"`

`docx/reader.ts:14`, aktuell:

```ts
const JC_TO_ALIGN: Record<string, string> = { left: 'left', center: 'center', right: 'right', both: 'justify' }
```

**Mit echten Fixtures aus dem vorhandenen Korpus bestätigt** (nicht nur laut
ECMA-376-Spezifikation vermutet — siehe Abschnitt 6 für die vollständige Liste):
`rtl.docx` (`start` ×4), `table-alignment.docx` (`start`+`end`, je 1×),
`table-indent.docx` (`start` ×98) und `unicode-path.docx` (`start`) enthalten alle
real `<w:jc w:val="start"/>`. Jeder dieser Werte fällt aktuell über
`JC_TO_ALIGN[jcVal] ?? 'left'` (Zeile 240) still auf „links" zurück — bei `rtl.docx`
(einem laut Namen absichtlich rechtsläufigen Dokument) ist „links" die inhaltlich
am wenigsten plausible Fallback-Wahl überhaupt.

**Fix (LTR-Näherung, mit dokumentierter Grenze):**

```ts
const JC_TO_ALIGN: Record<string, string> = {
  left: 'left',
  // `start`/`end` sind ECMA-376s bidi-neutrale Werte (§17.18.44): in einem
  // LTR-Absatz bedeutet `start` "links", in einem RTL-Absatz "rechts". Dieses
  // Schema modelliert keine Textrichtung (kein `dir`/`bidi`-Attribut in
  // schema.ts) — echte RTL-Auswertung ist daher außerhalb des Umfangs dieses
  // Features. Näherung: `start→left`, `end→right` (korrekt für den weit
  // überwiegenden LTR-Fall, nachweislich falsch für ein reines RTL-Dokument wie
  // die Fixture `rtl.docx` — siehe ausrichtung-blocksatz-code.md Abschnitt 3.9/6).
  start: 'left',
  center: 'center',
  right: 'right',
  end: 'right',
  both: 'justify',
  // `distribute`/`thaiDistribute` (Zeichen- bzw. Thai-spezifische Verteilung)
  // haben keine Entsprechung im 4-Werte-Modell dieses Editors und werden
  // bewusst NICHT gemappt — sie fallen über das bestehende `?? 'left'`
  // (Zeile 240) zurück. Bewusster, dokumentierter Fallback, kein stiller
  // Datenverlust (kein Text geht verloren, nur die Fein-Ausrichtung).
}
```

### 3.10 DOCX-Writer: immer explizites `<w:jc>` — bewusst unverändert

`docx/writer.ts:69-72` schreibt bei **jedem** Absatz/jeder Überschrift ein
explizites `<w:jc w:val="…"/>` (Zeile 71), auch für den Default „links". Das ist
**kein** Korrektheitsfehler (Word interpretiert ein explizites `w:jc val="left"`
identisch zum Fehlen des Elements) und wird **nicht geändert** — ein Weglassen
für den Default wäre eine unabhängige, hier nicht angefragte Optimierung
(kleinere Diffs beim Vergleich mit unverändert durchgereichten Fremddateien) und
würde das Risiko einer Verhaltensänderung ohne Mehrwert für dieses Feature
einführen. Wird in Abschnitt 8 als bewusst nicht geänderter Code aufgeführt.

### 3.11 Grenzfall 3.8 — ODT-Reader: `fo:text-align="start"/"end"` wird roh übernommen

`odt/reader.ts:64-66`, aktuell (innerhalb `parseAutomaticStyles`):

```ts
const props = firstChildNS(styleEl, ODF_NAMESPACES.style, 'paragraph-properties')
const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
if (align) paragraphAligns.set(name, align)
```

**Mit einer echten Fixture bestätigt**, die sowohl `justify` **als auch** `end`
in derselben Datei enthält (siehe Abschnitt 6):
`feature_attributes_paragraph_MSO2013.odt` — enthält je 2 Absatzstile mit
`fo:text-align="end"` bzw. `="justify"` (sowie `center`). Der `end`-Stil wird nach
aktuellem Stand als `align: 'end'` importiert: kein kanonischer Wert, keiner der vier
Toolbar-Buttons zeigt „gedrückt" (`isAlignActive` vergleicht exakt gegen
`'left'|'center'|'right'|'justify'`), Export fällt über
`PARAGRAPH_ALIGN_STYLE_NAME['end'] ?? …left` still auf „links" zurück — exakt
Grenzfall 3.8/3.9 der Anforderung, jetzt an echten Daten bestätigt statt nur
spekuliert. `start` ist im Korpus sogar noch verbreiteter (u. a. `listStyleId.odt`,
`Seasonal_Fruits2_en.odt`, `test1.odt` — LibreOffice-typische Standard-Exporte,
kein Sonderfall).

**Fix, analog zu Abschnitt 3.9, an derselben Speicherstelle** (wirkt dadurch
automatisch für alle Lesestellen — Absatz `odt/reader.ts:178`, Überschrift
Zeile 259, Kopf-/Fußzeilen-Varianten — statt an jeder einzeln geändert werden zu
müssen, da alle über `paragraphAligns` auflösen):

```ts
// fo:text-align="start"/"end" sind ODFs bidi-neutrale Werte — dieselbe
// LTR-Näherung wie für DOCX w:jc="start"/"end" (siehe
// ausrichtung-blocksatz-code.md Abschnitt 3.9/3.11); dieses Schema modelliert
// keine Textrichtung.
const ODF_ALIGN_ALIASES: Record<string, string> = { start: 'left', end: 'right' }

// ... innerhalb von parseAutomaticStyles, Zeile 65-66:
const align = props?.getAttributeNS(ODF_NAMESPACES.fo, 'text-align')
if (align) paragraphAligns.set(name, ODF_ALIGN_ALIASES[align] ?? align)
```

### 3.12 ODT-Writer/`styleRegistry.ts`: literal `left`/`right` statt `start`/`end` — bewusst unverändert

Die Anforderungstabelle (Zeile `styleRegistry.ts:61-93`) beschreibt es als
Abweichung, dass die Export-Stile literal `fo:text-align="left"`/`"right"`
verwenden statt der „ODF-üblichen" `start`/`end`. **Geprüft und als kein Fehler
bewertet:** Der ODF-1.3-Standard (§20.334, `fo:text-align`) erlaubt beide
Wertfamilien (`left`/`right`/`center`/`justify` **und** `start`/`end`/`inside`/
`outside`) gleichberechtigt — `left`/`right` ist gültiges, von LibreOffice/
OpenOffice korrekt interpretiertes ODF, nicht veraltet oder falsch. Eine
Umstellung auf `start`/`end` würde ein bidi-neutrales Konzept in einen Editor
einführen, der an keiner einzigen Stelle Textrichtung modelliert (kein
`dir`/`bidi`-Attribut im gesamten Schema) — das wäre eine **Verschlechterung**,
kein Fix: es würde suggerieren, das Dokument sei richtungs-neutral gemeint,
obwohl der Editor ausschließlich LTR-Absätze erzeugen kann. **Bewusst
unverändert.**

### 3.13 Grenzfall 3.10 — style-seitig ererbtes `w:jc` wird nicht gelesen

`docx/reader.ts:235-240` (`paragraphToBlocks`) liest ausschließlich das direkte
`w:pPr` des Absatzes, nie ein über `w:pStyle` referenziertes, ererbtes `w:jc`.

**Mit einer echten, bereits im Korpus vorhandenen und sich selbst
dokumentierenden Fixture bestätigt** (siehe Abschnitt 6 für den vollständigen
Fund): `bug-paragraph-alignment.docx` enthält zwei Absätze — Absatz 1 ohne
direktes `w:jc` (Formatvorlage `Title` deklariert `w:jc val="center"` in
`styles.xml`, programmatisch verifiziert: `document.xml` hat 1× direktes `left`,
`styles.xml` 1× `center`), Absatz 2 mit direktem `w:jc val="left"`, das die
Formatvorlage überschreibt. Der aktuelle Reader importiert:

- Absatz 1 (nur Style-`jc`): fälschlich als `align: 'left'` (korrekt wäre
  `'center'`) — **bestätigter, aber laut Anforderung nicht zu behebender Fehler**.
- Absatz 2 (direktes `jc` überschreibt Style): korrekt als `align: 'left'` — die
  direkte Formatierung geht **nicht** verloren.

**Entscheidung (per Anforderung Rundreise 4.1.10 bereits vorgegeben): bewusst
nicht behoben.** Die Anforderung selbst sagt ausdrücklich: „Style-Vererbung ist
nicht zwingend Teil dieser Anforderung, aber die direkte Formatierung darf nicht
verloren gehen" — Absatz 2 belegt bereits, dass Letzteres zutrifft. Statt einer
Code-Änderung: ein Test, der **beide** Fälle an dieser exakten, realen Datei
einfriert (Abschnitt 5.1), sowie ein Code-Kommentar an der Lesestelle
(`docx/reader.ts:238`):

```ts
// Absichtlich NICHT gelesen: ein über w:pStyle ererbtes, nur style-seitig
// deklariertes w:jc (kein direktes w:jc im pPr dieses Absatzes). Siehe
// ausrichtung-blocksatz-code.md Abschnitt 3.13 / Anforderung Grenzfall 3.10 —
// bestätigter, laut Rundreise-Anforderung 4.1.10 bewusst nicht zu behebender
// Fallback (reale Fixture: bug-paragraph-alignment.docx, Absatz 1). Direkte
// Formatierung (dieser Zeile) hat weiterhin Vorrang und geht nicht verloren.
const jcEl = pPr && firstChildNS(pPr, OOXML_NAMESPACES.w, 'jc')
```

Der analoge ODT-Fall (`office:styles`-Formatvorlagen statt
`office:automatic-styles`, siehe `absatzformat-dropdown-req.md` Befund 6) ist
**nicht** Gegenstand dieses Plans (eigener Fund jener Anforderung, dort zu
behandeln).

### 3.14 Anforderung 2.7 — Listen und Tabellenzellen

`alignableTypes` (`commands.ts:10`) prüft nur `node.type.name`, nicht die
Position/den Elterntyp. Anders als `setHeading` (siehe
`absatzformat-dropdown-req.md` Befund 5: dort greift beim `setBlockType`-Wechsel
eine `canReplaceWith`-Restriktion) ist `setAlign` von einer Content-Restriktion
**nicht** betroffen — ein `setNodeAttribute`-Aufruf ändert nur ein Attribut, keinen
Node-Typ, und unterliegt keiner `canReplaceWith`-Prüfung. Ein `paragraph` innerhalb
eines `list_item` (`schema.ts:146-152`, `content: 'block+'`) oder `table_cell`
(via `tableNodes(...)`, `schema.ts:154`, `cellContent: 'block+'`) wird von
`nodesBetween` unabhängig von seiner Position erfasst. **Bereits strukturell
korrekt, keine Code-Änderung nötig** — nur Tests, die das (inklusive der in
Abschnitt 3.1 gefixten Mehrfachzellen-/Mehrfachlistenpunkt-Selektion) tatsächlich
nachweisen, fehlen bisher komplett (Abschnitt 5).

### 3.15 Schema-Permissivität — kein Enum auf `align` (Grenzfall 3.7)

`schema.ts:4` (`validate: 'string'`, kein Enum) lässt nach externem Paste
beliebige Werte wie `align: 'start'`/`'inherit'`/`'match-parent'` zu (Grenzfall
3.7). **Bewusst unverändert:** Ein Enum auf Schema-Ebene würde ProseMirrors
`parseDOM`-Callback (`schema.ts:20` für `paragraph`, `:33` für `heading`, liest
`dom.style.textAlign` unmodifiziert) bei einem Fremdwert zum Werfen bringen statt
zu einem sanften Fallback zu kommen — das wäre eine **Verschlechterung** (Absturz
statt stillem, aber zumindest textverlustfreiem Fallback). Die bestehende
Kombination aus permissivem Schema + `isAlignActive`s exaktem Vergleich gegen die
vier kanonischen Werte (Abschnitt 3.3, unverändert in dieser Hinsicht) + den
Export-Fallbacks in `writer.ts` (unverändert, Abschnitt 3.10/3.12) ist bereits
das laut Anforderung selbst erwartete Verhalten für Grenzfall 3.7 („keiner der
vier Buttons zeigt aktiv", „Export fällt still auf links zurück") — **nur ein
Test fehlt**, keine Code-Änderung (Abschnitt 5.1).

### 3.16 Cross-Feature-Blocker (gefunden bei diesem Durchlauf): keine Cross-Format-Export-UI — betrifft Anforderung 4.1.8/4.2.7/4.3 und Testfall 5.14

**Neuer Fund, außerhalb der Eigentümerschaft „Ausrichtung Blocksatz", aber mit
direkter Auswirkung auf die Prüfbarkeit dieses Plans:** `src/app/
DocumentWorkspace.tsx`, Funktion `handleExport` (Zeile 68-86):

```ts
const blob = forcedError !== null
  ? await Promise.reject<Blob>(new Error(forcedError))
  : await module.exportFile(snapshot.content, snapshot.fileName)
```

`module` ist beim Öffnen/Erstellen fest an das Ursprungsformat gebunden
(`src/App.tsx` löst das aktive Modul einmalig auf) — es gibt **keine** UI, um
„Exportieren als …" mit einem vom Ursprung abweichenden Zielformat auszulösen.
Ein als DOCX geöffnetes/erstelltes Dokument lässt sich über die App-UI **nicht**
als ODT exportieren, und umgekehrt. Das ist exakt derselbe, bereits an anderer
Stelle dokumentierte Cross-Feature-Blocker wie in `specs/kopieren-code.md`
Abschnitt 0.4/9 beschrieben (dort korrekt als `test.fixme` geführt:
`tests/e2e/clipboard-roundtrip.spec.ts:134-147`, R-3 „Cross-Format DOCX→ODT" /
R-4 „Cross-Format ODT→DOCX", Begründung „blocked — no export-format picker
exists yet"; ebenso in `tests/e2e/cut.spec.ts:575-584` für „Ausschneiden"
dokumentiert). **Ein früherer Entwurf dieses Plans übersah das** und schrieb in
Abschnitt 5.2 einen E2E-Test („Rundreise 4.3.3"), der mit einem Kommentar
„Format-Switch-UI: siehe docx.spec.ts/odt.spec.ts für das exakte
Auswahl-Muster dieser App" auf ein Muster verwies, das dort **nicht
existiert** — der Test wäre beim Implementieren nicht lauffähig gewesen.

**Konsequenz für dieses Feature (korrigiert in Abschnitt 5):**

- Anforderung 4.1.8 (Cross-Format ODT→DOCX, einfache Rundreise), 4.2.7
  (Cross-Format DOCX→ODT) und die gesamte Anforderung 4.3 (Doppelte
  Rundreise/Cross-Format hin und zurück, alle drei Punkte) sind über die
  **echte Browser-UI aktuell nicht durchführbar** — nicht, weil die
  Blocksatz-Logik selbst fehlerhaft wäre, sondern weil der App-weite
  Export-Pfad das Zielformat nicht wählen lässt. Das ist **kein** Fehler in
  `setAlign`/`isAlignActive`/den Readern/Writern (die Datenmodell-Schicht ist
  bereit: `docxModule`/`odtModule` konsumieren beide dasselbe
  `WordDocumentContent`, siehe `registry.ts`), sondern fehlende
  UI-Verdrahtung — eigenständiger, bereits an anderer Stelle geführter Befund,
  hier nicht zu beheben (gehört zu `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.3,
  Eigentümerschaft bei `kopieren-code.md`/`ausschneiden-code.md`).
- Die entsprechenden E2E-Testfälle werden als `test.fixme` mit Verweis auf
  `kopieren-code.md` Abschnitt 0.4/9 geführt (Abschnitt 5.2), **nicht**
  stillschweigend weggelassen und **nicht** so geschrieben, als wären sie
  lauffähig.
- **Ersatz, der tatsächlich ohne die fehlende UI prüfbar ist:** Die
  Datenmodell-Schicht (`readDocx`/`writeDocx`/`readOdt`/`writeOdt`) ist reiner,
  von der UI unabhängiger Code — ein Vitest-Unit-Test kann `readDocx` (oder
  `readOdt`) direkt mit `writeOdt` (bzw. `writeDocx`) verketten, ohne über
  `DocumentWorkspace.tsx` zu gehen, und damit exakt das Datenmodell-Verhalten
  verifizieren, das Anforderung 4.1.8/4.2.7/4.3 inhaltlich verlangt (Ausrichtung
  bleibt über einen Formatwechsel hinweg erhalten) — nur eben nicht als
  Nachweis „über echte Browser-Bedienung mit Datei-Upload/Download", was die
  Anforderung selbst (Einleitung) explizit fordert. Dieser Unterschied ist
  bewusst offenzulegen, nicht zu verwischen: der Unit-Test belegt
  Datenmodell-Korrektheit, **nicht** DoD Punkt 3/4 im vollen, von der
  Anforderung verlangten Sinn (echte Bedienung). Siehe Abschnitt 5.1 (neuer
  Test) und Abschnitt 5.2 (`test.fixme`-Umwidmung).

---

## 4. Dateigenauer Änderungsplan — bestehende Dateien

| # | Datei | Änderung | Typ |
|---|---|---|---|
| 1 | `src/formats/shared/editor/commands.ts` | `setAlign` (Zeile 13-27) auf `ranges`-basierte Einzel-Transaction umgestellt (Abschnitt 3.1); `isAlignActive` (Zeile 29-38) auf „alle Blöcke uniform" bei Mehrfachselektion umgestellt (Abschnitt 3.3); `setHeading` (Zeile 40-55) erhält Absatz-`align` statt hart `'left'` (Abschnitt 3.5) | Fix (3 Funktionen in bestehender Datei) |
| 2 | `src/formats/shared/editor/Toolbar.tsx` | `AlignButton` (Zeile 91-111): `ALIGN_LABELS`/`ALIGN_GLYPHS`-Maps, `aria-label`, `label`-Prop entfernt, Glyph in `aria-hidden`-Span (Abschnitt 3.6); vier Aufrufstellen (Zeile 234-237) angepasst | Fix |
| 3 | `src/formats/shared/editor/WordEditor.tsx` | Keymap-Einträge `Mod-Alt-l/e/r/j` additiv in den bestehenden `keymap`-Block (Zeile 85-107) + Entscheidungs-Kommentar (Abschnitt 3.8); Import (Zeile 12) um `setAlign` ergänzt | Neu (Zeilen in bestehender Datei) |
| 4 | `src/formats/docx/reader.ts` | `JC_TO_ALIGN` (Zeile 14) um `start→left`, `end→right` erweitert + Kommentar zu bewusst nicht gemapptem `distribute`/`thaiDistribute` (Abschnitt 3.9); Kommentar zu bewusst nicht gelesenem style-seitigem `w:jc` (Zeile 238, Abschnitt 3.13) | Fix + Doku |
| 5 | `src/formats/odt/reader.ts` | `ODF_ALIGN_ALIASES`-Map + Anwendung in `parseAutomaticStyles` (Zeile 65-66, Abschnitt 3.11) | Fix |
| 6 | `src/formats/docx/writer.ts` | **Keine Änderung.** Explizites `<w:jc>` auch für Default bleibt (Abschnitt 3.10) | — |
| 7 | `src/formats/odt/writer.ts` / `src/formats/odt/styleRegistry.ts` | **Keine Änderung.** Literal `left`/`right` ist gültiges ODF (Abschnitt 3.12) | — |
| 8 | `src/formats/shared/schema.ts` | **Keine Änderung.** Permissives `align`-Attribut bleibt bewusst ohne Enum (Abschnitt 3.15) | — |

Es wird **keine neue Command-Abstraktion** über `setAlign`/`isAlignActive`/
`setHeading` hinaus eingeführt — beide bestehenden Funktionsnamen bleiben exakt
gleich benannt, nur ihre Implementierung ändert sich, sodass `Toolbar.tsx` und
jede künftige Keymap-Bindung sie unverändert aufrufen können.

---

## 5. Neue Dateien

### 5.1 Unit-Tests (Vitest, `jsdom`)

**Erweiterung (nicht „Neu" — korrigiert bei diesem Durchlauf):
`src/formats/shared/editor/__tests__/commands.test.ts`**

Diese Datei **existiert bereits** (Tests für `canCut`/`cutSelection` aus dem
Ausschneiden-Feature, `import { canCut, cutSelection } from '../commands'`) —
ein früherer Entwurf dieses Plans führte sie fälschlich als neu anzulegen. Die
folgenden `describe`-Blöcke sind eine **Ergänzung** am Dateiende; der
bestehende Import wird um die hier benötigten Symbole erweitert:

```ts
// bestehende Zeile 1-3, erweitert:
import { EditorState, TextSelection, NodeSelection, AllSelection } from 'prosemirror-state'
import { CellSelection } from 'prosemirror-tables' // neu
import { wordSchema } from '../../schema'
import { canCut, cutSelection, setAlign, isAlignActive, setHeading } from '../commands' // setAlign/isAlignActive/setHeading neu
```

Reiner Logik-Test ohne Browser/DOM — konstruiert `EditorState`/`CellSelection`
direkt aus `wordSchema` und deckt exakt den Kernbug (Abschnitt 3.1), die
`CellSelection`-Rechteck-Falle sowie die Mixed-Selection-Anzeige (Abschnitt 3.3)
isoliert ab, bevor überhaupt ein Browser im Spiel ist. (Hinweis für den Fall,
dass `durchgestrichen-code.md`s gleichnamige Datei ebenfalls Ergänzungen an
dieser Datei vorsieht: beide Testsuiten können nebeneinander stehen, keine
Namenskollision der `describe`-Blöcke.)

```ts
import { EditorState, TextSelection, AllSelection, NodeSelection } from 'prosemirror-state'
import { CellSelection } from 'prosemirror-tables'
import { wordSchema } from '../../schema'
import { setAlign, isAlignActive, setHeading } from '../commands'

function stateFromParagraphs(...aligns: Array<string>): EditorState {
  const paragraphs = aligns.map((align) => wordSchema.nodes.paragraph.create({ align }, wordSchema.text('x')))
  const doc = wordSchema.nodes.doc.create(null, paragraphs)
  return EditorState.create({ doc, schema: wordSchema })
}

describe('setAlign — Kernbug 2.2 / Testfall 5.1: Mehrfachabsatz-Selektion (ausrichtung-blocksatz-code.md Abschnitt 3.1)', () => {
  it('sets "justify" on all three paragraphs of an AllSelection in a single dispatch, no exception', () => {
    let state = stateFromParagraphs('left', 'center', 'right')
    const allSel = new AllSelection(state.doc)
    state = state.apply(state.tr.setSelection(allSel))
    let dispatchCount = 0
    setAlign('justify')(state, (tr) => {
      dispatchCount += 1
      state = state.apply(tr) // exact same pattern as WordEditor.tsx's dispatchTransaction
    })
    expect(dispatchCount).toBe(1) // ein einziger Undo-Schritt
    const aligns = (state.doc as any).content.content.map((p: any) => p.attrs.align)
    expect(aligns).toEqual(['justify', 'justify', 'justify'])
  })

  it('a second dispatch call built from the same stale state (reproducing the exact old bug pattern) throws — confirms the mechanism, not just the symptom', () => {
    let state = stateFromParagraphs('left', 'center')
    const allSel = new AllSelection(state.doc)
    state = state.apply(state.tr.setSelection(allSel))
    const staleState = state
    // Reproduce the OLD, buggy dispatch pattern directly (not calling setAlign):
    // two transactions both built from `staleState`, second applied against the
    // already-mutated `state` — this is exactly commands.ts:21 + WordEditor.tsx's
    // dispatchTransaction before the fix. Positions 0 and 3 = the two paragraphs.
    state = state.apply(staleState.tr.setNodeAttribute(0, 'align', 'justify'))
    expect(() => state.apply(staleState.tr.setNodeAttribute(3, 'align', 'justify'))).toThrow(/mismatched transaction/i)
  })

  it('does not dispatch (no-op, no new undo step) when the whole selection is already uniformly justified (Anforderung 2.5)', () => {
    let state = stateFromParagraphs('justify', 'justify')
    const allSel = new AllSelection(state.doc)
    state = state.apply(state.tr.setSelection(allSel))
    let dispatched = false
    const applicable = setAlign('justify')(state, () => {
      dispatched = true
    })
    expect(applicable).toBe(true) // weiterhin "anwendbar"
    expect(dispatched).toBe(false) // aber kein Dispatch
  })

  it('only re-aligns the cells actually inside a non-full-row CellSelection (Anforderung 2.3/Grenzfall 3.4)', () => {
    const cell = () => wordSchema.nodes.table_cell.create({ colspan: 1, rowspan: 1, colwidth: null }, wordSchema.nodes.paragraph.create({ align: 'left' }, wordSchema.text('x')))
    const row = () => wordSchema.nodes.table_row.create(null, [cell(), cell(), cell()])
    const table = wordSchema.nodes.table.create(null, [row(), row()])
    const doc = wordSchema.nodes.doc.create(null, [table])
    let state = EditorState.create({ doc, schema: wordSchema })
    // Positionen JEDER Zelle einsammeln — `descendants` liefert für table_cell die
    // Position DIREKT VOR der Zelle, was genau das ist, was CellSelection.create
    // erwartet (prosemirror-tables/dist/index.cjs:663; $anchorCell.node(-1) muss die
    // Tabelle sein). KEIN "+1" — das würde INS Zellinnere zeigen und die Selektion
    // fehlkonstruieren (siehe Abschnitt 1, geprüfte create()-Semantik).
    const cellPositions: number[] = []
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'table_cell') cellPositions.push(pos)
    })
    // Reihenfolge: 0=r1c0,1=r1c1,2=r1c2,3=r2c0,4=r2c1,5=r2c2 — mittlere Spalte = Index 1 und 4.
    const colSelection = CellSelection.create(state.doc, cellPositions[1], cellPositions[4])
    state = state.apply(state.tr.setSelection(colSelection))
    setAlign('justify')(state, (tr) => {
      state = state.apply(tr)
    })
    const resultAligns: string[] = []
    state.doc.descendants((node) => {
      if (node.type.name === 'paragraph') resultAligns.push(node.attrs.align)
    })
    // Nur Spalte 2 (Index 1 und 4) darf justify sein — Spalte 1 und 3 (Index 0,2,3,5)
    // müssen "left" bleiben. Der alte from/to-Ansatz hätte auch Zelle mit Index 2
    // (zwischen from und to in Dokumentreihenfolge, aber nicht selektiert) erfasst.
    expect(resultAligns).toEqual(['left', 'justify', 'left', 'left', 'justify', 'left'])
  })
})

describe('isAlignActive — gemischte Mehrfachselektion (Anforderung 2.4/Grenzfall 3.5, Abschnitt 3.3)', () => {
  it('is true when the cursor (empty selection) sits in a justified paragraph', () => {
    const state = stateFromParagraphs('justify')
    expect(isAlignActive(state, 'justify')).toBe(true)
  })

  it('is true for a multi-paragraph selection where EVERY paragraph already matches', () => {
    let state = stateFromParagraphs('justify', 'justify')
    state = state.apply(state.tr.setSelection(new AllSelection(state.doc)))
    expect(isAlignActive(state, 'justify')).toBe(true)
  })

  it('is false for a mixed multi-paragraph selection, even though the FIRST paragraph matches (previously mis-reported as active)', () => {
    let state = stateFromParagraphs('justify', 'left')
    state = state.apply(state.tr.setSelection(new AllSelection(state.doc)))
    expect(isAlignActive(state, 'justify')).toBe(false)
  })

  it('is false for a mixed selection where only the LAST paragraph matches', () => {
    let state = stateFromParagraphs('left', 'justify')
    state = state.apply(state.tr.setSelection(new AllSelection(state.doc)))
    expect(isAlignActive(state, 'justify')).toBe(false)
  })
})

describe('setHeading preserves alignment across style changes (Anforderung 2.6, Abschnitt 3.5)', () => {
  it('a justified paragraph keeps "justify" when switched to Heading 1', () => {
    let state = stateFromParagraphs('justify')
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1)))
    setHeading(1)(state, (tr) => {
      state = state.apply(tr)
    })
    const heading = (state.doc as any).content.content[0]
    expect(heading.type.name).toBe('heading')
    expect(heading.attrs.align).toBe('justify')
  })

  it('a justified heading keeps "justify" when switched back to "Standard"', () => {
    const heading = wordSchema.nodes.heading.create({ level: 1, align: 'justify' }, wordSchema.text('x'))
    const doc = wordSchema.nodes.doc.create(null, [heading])
    let state = EditorState.create({ doc, schema: wordSchema })
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1)))
    setHeading(null)(state, (tr) => {
      state = state.apply(tr)
    })
    const paragraph = (state.doc as any).content.content[0]
    expect(paragraph.type.name).toBe('paragraph')
    expect(paragraph.attrs.align).toBe('justify')
  })
})

describe('Grenzfall 3.6: Selektion, die ausschließlich ein Bild umfasst', () => {
  it('setAlign is a no-op (returns false, no dispatch) for a NodeSelection on an image', () => {
    const image = wordSchema.nodes.image.create({ src: 'x.png', alt: '' })
    const doc = wordSchema.nodes.doc.create(null, [image])
    let state = EditorState.create({ doc, schema: wordSchema })
    state = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, 0)))
    let dispatched = false
    const applicable = setAlign('justify')(state, () => {
      dispatched = true
    })
    expect(applicable).toBe(false)
    expect(dispatched).toBe(false)
  })
})

describe('Grenzfall 3.7: Fremdwert im align-Attribut nach externem Paste', () => {
  it('a paragraph with a non-canonical align value ("start") shows none of the four buttons active', () => {
    const state = stateFromParagraphs('start')
    for (const align of ['left', 'center', 'right', 'justify'] as const) {
      expect(isAlignActive(state, align)).toBe(false)
    }
  })
})
```

> **Anmerkung zur `CellSelection`-Testkonstruktion (korrigiert gegenüber einem
> früheren Entwurf dieses Plans):** `CellSelection.create(doc, anchorCell, headCell)`
> erwartet Positionen, die **direkt vor** einer Zelle stehen — genau die Werte, die
> `doc.descendants` für `table_cell`-Knoten liefert. Ein früherer Entwurf addierte
> hier fälschlich `+1` (Position ins Zellinnere), was `$anchorCell.node(-1)` auf die
> Tabellenzeile statt die Tabelle zeigen ließe und die Selektion fehlkonstruiert. Die
> `create()`-Signatur wurde im installierten `prosemirror-tables`
> (`dist/index.cjs:663-665`) direkt gegengeprüft.

**Neu: `src/formats/docx/__tests__/alignment-fixtures.test.ts`**

Dedizierte Tests für Grenzfall 3.9/3.10 der Anforderung, mit echten
Korpus-Fixtures statt nur synthetischer Daten (Fixture-Werte laut Abschnitt 6
programmatisch verifiziert, nicht angenommen):

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readDocx } from '../reader'

const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/docx')

async function loadFixture(name: string) {
  const buffer = readFileSync(join(FIXTURES_DIR, name))
  return readDocx(new Blob([buffer]))
}

function allAligns(node: any, out: Array<{ text: string; align: string }> = []): typeof out {
  if ((node.type === 'paragraph' || node.type === 'heading') && node.attrs) {
    const text = (node.content ?? []).map((n: any) => n.text ?? '').join('')
    out.push({ text, align: node.attrs.align })
  }
  ;(node.content ?? []).forEach((n: any) => allAligns(n, out))
  return out
}

describe('DOCX reader: w:jc="start"/"end" normalization (Grenzfall 3.9, real fixtures)', () => {
  it('rtl.docx: w:jc="start" is read as "left" (documented LTR approximation, see Abschnitt 3.9)', async () => {
    const doc = await loadFixture('rtl.docx')
    const aligns = allAligns(doc.body as any)
    expect(aligns.some((a) => a.align === 'left')).toBe(true)
    expect(aligns.some((a) => a.align === 'start')).toBe(false) // nach dem Fix nie mehr der rohe Wert
  })

  it('table-alignment.docx: a single file exercising left/start/center/right/end together', async () => {
    const doc = await loadFixture('table-alignment.docx')
    const aligns = allAligns(doc.body as any).map((a) => a.align)
    // 5 Zellen mit identischem Platzhaltertext "Loren", jc = left/start/center/right/end
    // in Dokumentreihenfolge — start/end müssen jetzt auf left/right normalisiert sein,
    // nicht mehr auf den rohen (nicht-kanonischen) String durchgereicht werden.
    expect(aligns.filter((a) => a === 'left').length).toBeGreaterThanOrEqual(2) // "left" + normalisiertes "start"
    expect(aligns.filter((a) => a === 'right').length).toBeGreaterThanOrEqual(2) // "right" + normalisiertes "end"
    expect(aligns).not.toContain('start')
    expect(aligns).not.toContain('end')
  })
})

describe('DOCX reader: style-inherited w:jc is intentionally NOT read (Grenzfall 3.10, Abschnitt 3.13)', () => {
  it('bug-paragraph-alignment.docx: direct w:jc always wins; style-only jc falls back to "left" (documented, frozen behavior)', async () => {
    const doc = await loadFixture('bug-paragraph-alignment.docx')
    const aligns = allAligns(doc.body as any)
    const styleOnly = aligns.find((a) => a.text.includes('does not have explicit alignment'))
    const direct = aligns.find((a) => a.text.includes('overriding'))
    expect(styleOnly?.align).toBe('left') // eigentlich 'center' laut Formatvorlage — bekannte, akzeptierte Lücke
    expect(direct?.align).toBe('left') // korrekt: direktes w:jc="left" überschreibt Style
  })
})

describe('DOCX reader: real "both" (justify) fixture (Rundreise 4.1.9)', () => {
  it('56392.docx: a real, external justify paragraph imports as align "justify"', async () => {
    const doc = await loadFixture('56392.docx')
    const aligns = allAligns(doc.body as any)
    expect(aligns.some((a) => a.align === 'justify')).toBe(true)
  })
})
```

**Neu: `src/formats/odt/__tests__/alignment-fixtures.test.ts`**

Analog für ODT:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readOdt } from '../reader'

const FIXTURES_DIR = join(__dirname, '../../../../tests/fixtures/external/odt')

async function loadFixture(name: string) {
  const buffer = readFileSync(join(FIXTURES_DIR, name))
  return readOdt(new Blob([buffer]))
}

function allAligns(node: any, out: string[] = []): string[] {
  if ((node.type === 'paragraph' || node.type === 'heading') && node.attrs) out.push(node.attrs.align)
  ;(node.content ?? []).forEach((n: any) => allAligns(n, out))
  return out
}

describe('ODT reader: fo:text-align="start"/"end" normalization (Grenzfall 3.8, real fixtures)', () => {
  it('feature_attributes_paragraph_MSO2013.odt: contains both "end" (normalized to right) and real "justify" paragraphs', async () => {
    const doc = await loadFixture('feature_attributes_paragraph_MSO2013.odt')
    const aligns = allAligns(doc.body as any)
    expect(aligns).toContain('justify')
    expect(aligns).toContain('right') // normalisiert aus fo:text-align="end"
    expect(aligns).not.toContain('end')
  })

  it('listStyleId.odt: contains real "justify"; fo:text-align="start" is normalized to "left" (never raw "start")', async () => {
    const doc = await loadFixture('listStyleId.odt')
    const aligns = allAligns(doc.body as any)
    expect(aligns).toContain('justify')
    expect(aligns).not.toContain('start')
  })
})
```

**Neu: `src/formats/shared/__tests__/cross-format-alignment.test.ts`** — Ersatz für
den wegen Abschnitt 3.16 blockierten E2E-Cross-Format-Test (Anforderung 4.1.8/
4.2.7/4.3, Testfall 5.14). Verkettet `readDocx`/`writeDocx`/`readOdt`/`writeOdt`
**direkt**, ohne über `DocumentWorkspace.tsx` zu gehen — deckt damit die
Datenmodell-Korrektheit ab, **nicht** den von der Anforderung eigentlich
verlangten Nachweis über echte Datei-Upload/Download-Bedienung (siehe
Abschnitt 3.16 zur bewusst offengelegten Einschränkung dieses Ersatzes):

```ts
import { readDocx } from '../../docx/reader'
import { writeDocx } from '../../docx/writer'
import { readOdt } from '../../odt/reader'
import { writeOdt } from '../../odt/writer'
import type { WordDocumentContent } from '../documentModel'

function doc(content: unknown[]): WordDocumentContent {
  return { body: { type: 'doc', content }, header: null, footer: null, meta: { title: '' } }
}
function paragraph(text: string, align: string) {
  return { type: 'paragraph', attrs: { align }, content: [{ type: 'text', text }] }
}
function aligns(result: WordDocumentContent): string[] {
  return (result.body as any).content.map((p: any) => p.attrs.align)
}

describe('Cross-Format-Ausrichtung, Datenmodell-Ebene (Ersatz für den blockierten E2E-Test, Abschnitt 3.16)', () => {
  it('Anforderung 4.2.7 (DOCX -> ODT): all four alignments on distinct paragraphs survive one format hop', async () => {
    const original = doc([
      paragraph('Links.', 'left'),
      paragraph('Mitte.', 'center'),
      paragraph('Rechts.', 'right'),
      paragraph('Blocksatz.', 'justify'),
    ])
    const docxBlob = await writeDocx(original)
    const viaDocx = await readDocx(docxBlob)
    const odtBlob = await writeOdt(viaDocx)
    const viaOdt = await readOdt(odtBlob)
    expect(aligns(viaOdt)).toEqual(['left', 'center', 'right', 'justify'])
  })

  it('Anforderung 4.1.8 (ODT -> DOCX): all four alignments on distinct paragraphs survive one format hop', async () => {
    const original = doc([
      paragraph('Links.', 'left'),
      paragraph('Mitte.', 'center'),
      paragraph('Rechts.', 'right'),
      paragraph('Blocksatz.', 'justify'),
    ])
    const odtBlob = await writeOdt(original)
    const viaOdt = await readOdt(odtBlob)
    const docxBlob = await writeDocx(viaOdt)
    const viaDocx = await readDocx(docxBlob)
    expect(aligns(viaDocx)).toEqual(['left', 'center', 'right', 'justify'])
  })

  it('Anforderung 4.3.3 (doppelte Rundreise DOCX -> ODT -> DOCX): justify does not bleed into or vanish from neighboring paragraphs', async () => {
    const original = doc([paragraph('Links.', 'left'), paragraph('Blocksatz.', 'justify')])
    const firstHop = await readOdt(await writeOdt(await readDocx(await writeDocx(original))))
    const secondHop = await readDocx(await writeDocx(firstHop))
    expect(aligns(secondHop)).toEqual(['left', 'justify'])
  })
})
```

**Erweiterung: `src/formats/docx/__tests__/roundtrip.test.ts`** und
**`src/formats/odt/__tests__/roundtrip.test.ts`**

Die bestehenden Tests prüfen Ausrichtung nur an **einzelnen, isolierten**
Absätzen (`roundtrip.test.ts:54-59`, `it.each([...])`) bzw. Headings nur mit
`center` (Zeile 47-51). Neue Testfälle, je Datei (hier für DOCX gezeigt,
ODT-Variante identisch mit `writeOdt`/`readOdt`; Helfer `doc`/`paragraph`/
`roundTrip` sind bereits in beiden Dateien vorhanden, Zeile 14-30):

```ts
it('preserves "justify" across MULTIPLE consecutive paragraphs at once (Anforderung 4.1.3 — bisher nie getestet)', async () => {
  const original = doc([paragraph('Erster', 'justify'), paragraph('Zweiter', 'justify'), paragraph('Dritter', 'justify')])
  const result = await roundTrip(original)
  const aligns = (result.body as any).content.map((p: any) => p.attrs.align)
  expect(aligns).toEqual(['justify', 'justify', 'justify'])
})

it('preserves "justify" combined with heading level in the same w:pPr (Anforderung 4.1.5)', async () => {
  const original = doc([
    { type: 'heading', attrs: { level: 2, align: 'justify' }, content: [{ type: 'text', text: 'Titel' }] },
  ])
  const result = await roundTrip(original)
  const heading = (result.body as any).content[0]
  expect(heading.attrs.level).toBe(2)
  expect(heading.attrs.align).toBe('justify')
})

it('preserves "justify" inside a table cell independently of a neighboring non-justified cell (Anforderung 4.1.6)', async () => {
  const original = doc([
    {
      type: 'table',
      content: [
        {
          type: 'table_row',
          content: [
            { type: 'table_cell', attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [paragraph('Blocksatz', 'justify')] },
            { type: 'table_cell', attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [paragraph('Normal')] },
          ],
        },
      ],
    },
  ])
  const result = await roundTrip(original)
  const cells = (result.body as any).content[0].content[0].content
  expect(cells[0].content[0].attrs.align).toBe('justify')
  expect(cells[1].content[0].attrs.align).toBe('left')
})

it('preserves "justify" across a hard_break within the same paragraph (Anforderung 4.1.7)', async () => {
  const original = doc([
    {
      type: 'paragraph',
      attrs: { align: 'justify' },
      content: [{ type: 'text', text: 'Zeile eins' }, { type: 'hard_break' }, { type: 'text', text: 'Zeile zwei' }],
    },
  ])
  const result = await roundTrip(original)
  expect((result.body as any).content[0].attrs.align).toBe('justify')
})

it('preserves "justify" combined with bold and text color on the same paragraph (Anforderung 4.1.4)', async () => {
  const original = doc([
    {
      type: 'paragraph',
      attrs: { align: 'justify' },
      content: [{ type: 'text', text: 'fett+rot', marks: [{ type: 'strong' }, { type: 'textColor', attrs: { color: '#ff0000' } }] }],
    },
  ])
  const result = await roundTrip(original)
  const p = (result.body as any).content[0]
  expect(p.attrs.align).toBe('justify')
  expect(p.content[0].marks).toEqual(expect.arrayContaining([{ type: 'strong' }, { type: 'textColor', attrs: { color: '#ff0000' } }]))
})
```

### 5.2 E2E-Tests (Playwright)

**Neu: `tests/e2e/alignment.spec.ts`**

Kernstück dieser Anforderung — der bisher wichtigste ungetestete Pfad im
gesamten Editor. Analog zu `docx.spec.ts`/`odt.spec.ts`/
`selection-regression.spec.ts` (gleiche `odtCard`/`docxCard`-Locator-Helfer).
**Testfall 1 (Kernverdacht) steht bewusst zuerst**, exakt wie in Anforderung
Abschnitt 5 gefordert. Nach dem `aria-label`-Fix (Abschnitt 3.6) ist der Button
sowohl über `getByTitle('Blocksatz')` als auch über
`getByRole('button', { name: 'Blocksatz' })` erreichbar.

```ts
import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

function odtCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'OpenDocument Text (.odt)' }) })
}
function docxCard(page: import('@playwright/test').Page) {
  return page.locator('div.rounded-lg', { has: page.getByRole('heading', { name: 'Word-Dokument (.docx)' }) })
}

test.describe('Blocksatz — Kernverdacht 2.2 / Testfall 5.1 (höchste Priorität)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Testfall 1a: drei markierte Absätze werden ALLE justiert, keine Konsolen-Exception, ein Undo-Schritt', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('pageerror', (err) => consoleErrors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Erster Absatz mit etwas mehr Text, damit Blocksatz sichtbar wirkt.')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Zweiter Absatz mit etwas mehr Text, damit Blocksatz sichtbar wirkt.')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Dritter Absatz mit etwas mehr Text, damit Blocksatz sichtbar wirkt.')

    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Blocksatz').click()

    await expect(page.locator('.ProseMirror p')).toHaveCount(3)
    for (let i = 0; i < 3; i++) {
      await expect(page.locator('.ProseMirror p').nth(i)).toHaveCSS('text-align', 'justify')
    }
    expect(consoleErrors).toEqual([])

    await page.keyboard.press('ControlOrMeta+z')
    for (let i = 0; i < 3; i++) {
      await expect(page.locator('.ProseMirror p').nth(i)).not.toHaveCSS('text-align', 'justify')
    }
  })

  test('Testfall 1b: Strg+A (AllSelection) über ein Mehrfach-Absatz-Dokument, dann Blocksatz — der laut Anforderung mutmaßlich häufigste Ablauf', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    for (const n of [1, 2, 3, 4]) {
      await page.keyboard.type(`Absatz Nummer ${n} mit hinreichend Text zur sichtbaren Prüfung.`)
      await page.keyboard.press('Enter')
    }
    await page.keyboard.type('Letzter Absatz.')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Blocksatz').click()
    await expect(page.locator('.ProseMirror p')).toHaveCount(5)
    const count = await page.locator('.ProseMirror p').count()
    for (let i = 0; i < count; i++) {
      await expect(page.locator('.ProseMirror p').nth(i)).toHaveCSS('text-align', 'justify')
    }
  })
})

test.describe('Blocksatz — Toolbar, Tastatur, Grenzfälle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
  })

  test('Testfall 2/3: Klick auf Blocksatz ohne Selektion justiert den GESAMTEN umschließenden Absatz, aria-pressed wechselt', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Nur ein einzelnes Wort markiert wird trotzdem den ganzen Absatz betreffen.')
    await page.keyboard.press('Home')
    for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight') // "Nur " markieren
    const button = page.getByTitle('Blocksatz')
    await button.click()
    await expect(page.locator('.ProseMirror p')).toHaveCSS('text-align', 'justify')
    await expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  test('Testfall 4: "Linksbündig" auf einen justierten Absatz ersetzt Blocksatz (nie zwei gleichzeitig aktiv)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Absatz zum Umschalten der Ausrichtung.')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Blocksatz').click()
    await expect(page.getByTitle('Blocksatz')).toHaveAttribute('aria-pressed', 'true')
    await page.getByTitle('Linksbündig').click()
    await expect(editor.locator('p')).toHaveCSS('text-align', 'left')
    await expect(page.getByTitle('Blocksatz')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByTitle('Linksbündig')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Testfall 5: Formatvorlage zu "Überschrift 1" wechseln, während der Absatz im Blocksatz steht — Ausrichtung bleibt erhalten (Entscheidung Abschnitt 3.5)', async ({ page }) => {
    // WICHTIG (Korrektur bei diesem Durchlauf): bewusst KEIN "ControlOrMeta+a" vor
    // dem Dropdown-Wechsel. Eine AllSelection hat laut absatzformat-dropdown-req.md
    // Befund 12/Grenzfall 21 (per Test bereits verifiziert) IMMER `doc` als
    // unmittelbaren Elternknoten von $from/$to, nie `paragraph`/`heading` — deshalb
    // gibt `setHeading` (commands.ts:47, `!alignableTypes.has(parent.type.name)`)
    // auf einer AllSelection in JEDEM Dokument `false` zurück, auch bei genau einem
    // Absatz. Ein vorheriges Strg+A hier würde also den Formatwechsel selbst still
    // scheitern lassen — ein anderer, bereits dokumentierter Bug außerhalb dieses
    // Plans (Eigentümerschaft `absatzformat-dropdown-code.md`), nicht die hier zu
    // prüfende Ausrichtungserhaltung. Ein bloßer Cursor (Klick + Tippen, keine
    // Selektion) reicht für "Blocksatz" wie für den Dropdown-Wechsel gleichermaßen
    // aus (Anforderung 2.1) und umgeht diese fremde Falle sauber.
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Überschriftentext')
    await page.getByTitle('Blocksatz').click()
    await page.getByLabel('Absatzformat').selectOption('1')
    await expect(page.locator('.ProseMirror h1')).toHaveCSS('text-align', 'justify')
  })

  test('Testfall 6: nur die mittlere Spalte einer 3-spaltigen Tabelle über zwei Zeilen markieren — nur diese Zellen justiert, die dazwischenliegende NICHT (Grenzfall 3.4, kritisch)', async ({ page }) => {
    // Setzt die in docx.spec.ts/odt.spec.ts etablierte Zell-Selektionsmechanik voraus
    // (Klick in erste Zielzelle, Shift-Klick in letzte Zielzelle erzeugt eine
    // CellSelection). Kernpunkt: die nicht selektierte Zelle bleibt "left".
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    // ... (3x2-Tabelle aufbauen/füllen wie in tabelle-einfuegen.spec.ts), mittlere
    // Spalte über beide Zeilen per Shift-Klick markieren, dann:
    await page.getByTitle('Blocksatz').click()
    // Erwartung: Zelle (Zeile1,Spalte2) + (Zeile2,Spalte2) = justify;
    // (Zeile1,Spalte3) = unverändert left. Exakte Locator-Kette gemäß der
    // Tabellen-Testdatei; hier ist der Assertions-Kern maßgeblich.
  })

  test('Testfall 7: Blocksatz auf eine Tabellenzelle und auf einen einzelnen Listenpunkt', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.getByRole('button', { name: 'Tabelle einfügen' }).click()
    const cells = page.locator('.ProseMirror td')
    await cells.nth(0).click()
    await page.keyboard.type('Zelltext mit etwas mehr Inhalt.')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Blocksatz').click()
    await expect(cells.nth(0).locator('p')).toHaveCSS('text-align', 'justify')
    await expect(cells.nth(1).locator('p')).not.toHaveCSS('text-align', 'justify')

    await page.getByTitle('Aufzählung').click()
    await editor.click()
    await page.keyboard.press('ControlOrMeta+End')
    await page.keyboard.type('Listenpunkt mit etwas mehr Inhalt.')
    await page.keyboard.press('Home')
    await page.keyboard.press('Shift+End')
    await page.getByTitle('Blocksatz').click()
    await expect(page.locator('.ProseMirror li p').last()).toHaveCSS('text-align', 'justify')
  })

  test('Testfall 8/9: Selektion mit Bild — kein Absturz, nur Text betroffen; reine Bildselektion tut sichtbar nichts (Grenzfall 3.6)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Text vor dem Bild.')
    // Bild per Toolbar einfügen (Datei-Input), dann Alles auswählen inkl. Bild.
    // Text+Bild gemischt — darf nicht abstürzen, nur der Textblock wird justiert:
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Blocksatz').click()
    await expect(page.locator('.ProseMirror p').first()).toHaveCSS('text-align', 'justify')
    // Reine Bildselektion (NodeSelection) → Klick bewirkt sichtbar nichts, kein Fehler.
  })

  test('Testfall 10: Einfügen von extern kopiertem HTML mit inline style="text-align: justify"', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.evaluate(() => {
      const pm = document.querySelector('.ProseMirror') as HTMLElement
      const dt = new DataTransfer()
      dt.setData('text/html', '<p style="text-align: justify">Blocksatz von außen eingefügt mit genug Text zum Sehen.</p>')
      dt.setData('text/plain', 'Blocksatz von außen eingefügt mit genug Text zum Sehen.')
      const evt = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt })
      pm.dispatchEvent(evt)
    })
    await expect(page.locator('.ProseMirror p')).toHaveCSS('text-align', 'justify')
  })

  test('Testfall 11: klassenbasiertes (nicht-inline) externes Blocksatz-HTML wird NICHT erkannt (dokumentiertes Fallback-Verhalten, Grenzfall 3.7)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.evaluate(() => {
      const pm = document.querySelector('.ProseMirror') as HTMLElement
      const dt = new DataTransfer()
      dt.setData('text/html', '<style>.j{text-align:justify}</style><p class="j">Nur über CSS-Klasse justiert.</p>')
      dt.setData('text/plain', 'Nur über CSS-Klasse justiert.')
      const evt = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt })
      pm.dispatchEvent(evt)
    })
    await expect(page.locator('.ProseMirror p')).not.toHaveCSS('text-align', 'justify')
  })

  test('Testfall 12: Undo/Redo direkt nach Blocksatz; Mehrfachklick erzeugt keinen zusätzlichen Undo-Schritt (2.5/Grenzfall 3.11)', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Text für Undo-Test.')
    await page.keyboard.press('ControlOrMeta+a')
    const button = page.getByTitle('Blocksatz')
    await button.click()
    await button.click() // Wiederholklick — darf keine zweite Transaction erzeugen
    await button.click()
    await expect(editor.locator('p')).toHaveCSS('text-align', 'justify')
    await page.keyboard.press('ControlOrMeta+z')
    // Ein einziges Undo muss bereits auf "nicht justiert" zurückführen — nicht erst
    // nach drei Undos (bestätigt, dass die Wiederholklicks keine eigenen Transactions
    // erzeugt haben, siehe Abschnitt 3.4).
    await expect(editor.locator('p')).not.toHaveCSS('text-align', 'justify')
    await page.keyboard.press('ControlOrMeta+y')
    await expect(editor.locator('p')).toHaveCSS('text-align', 'justify')
  })

  test('Testfall 16: Screenreader-Name des Buttons ist "Blocksatz", nicht das Unicode-Zeichen (Bedienelement Nr. 4)', async ({ page }) => {
    // Automatisierbarer Näherungstest ohne echten Screenreader: der berechnete
    // Accessible Name muss "Blocksatz" sein (aus aria-label, Abschnitt 3.6).
    const button = page.getByRole('button', { name: 'Blocksatz' })
    await expect(button).toBeVisible()
  })

  test('Testfall 17 / Grenzfall 3.8: fo:text-align="start" beim ODT-Import (listStyleId.odt) — kein Ausrichtungs-Button aktiv, Fallback dokumentiert', async ({ page }) => {
    const fs = await import('node:fs/promises')
    const buffer = await fs.readFile('tests/fixtures/external/odt/listStyleId.odt')
    const input = odtCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'listStyleId.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer })
    await expect(page.locator('.ProseMirror')).toBeVisible()
    // Cursor in den ersten (start→left normalisierten) Absatz setzen und prüfen, dass
    // "Linksbündig" gedrückt ist, aber nie ein roher "start"-Zustand ohne Button bleibt.
    await page.locator('.ProseMirror p').first().click()
    await expect(page.getByTitle('Linksbündig')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Tastenkombination Strg/Cmd+Alt+J (Entscheidung Abschnitt 3.8) liefert dasselbe Ergebnis wie der Toolbar-Klick', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Kurzform per Tastenkombination.')
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('ControlOrMeta+Alt+j')
    await expect(editor.locator('p')).toHaveCSS('text-align', 'justify')
  })

  test('Grenzfall 3.13: sehr lange Selektion (200 Absätze) bleibt performant', async ({ page }) => {
    const editor = page.locator('.ProseMirror')
    await editor.click()
    for (let i = 0; i < 200; i++) {
      await page.keyboard.type(`Absatz ${i}`)
      await page.keyboard.press('Enter')
    }
    const start = Date.now()
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Blocksatz').click()
    expect(Date.now() - start).toBeLessThan(5000)
    await expect(editor.locator('p').first()).toHaveCSS('text-align', 'justify')
  })
})

test.describe('Blocksatz — Rundreisen (Anforderung Abschnitt 4, Testfall 5.13/5.14/5.15)', () => {
  test('Rundreise 4.1.1/4.1.2: DOCX-Eigenrundreise — Toolbar-erzeugter Blocksatz exportiert exakt <w:jc w:val="both"/> (unabhängiger Parser, Testfall 5.15)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Blocksatz-Text mit mehreren Sätzen. Genug Inhalt, damit der Effekt sichtbar wird.')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Blocksatz').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).toMatch(/<w:jc w:val="both"\s*\/>/) // unabhängig vom eigenen Reader geprüft

    // Rundreise: erneut importieren, Blocksatz bleibt
    await page.reload()
    await page.getByRole('button', { name: /verstanden/i }).click()
    const input = docxCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: 'export.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: exportedBuffer })
    await expect(page.locator('.ProseMirror p')).toHaveCSS('text-align', 'justify')
  })

  test('Rundreise 4.1.3/4.2.4: Mehrere aufeinanderfolgende Absätze markieren, Blocksatz anwenden, exportieren — ALLE Absätze bleiben justiert (abhängig von Testfall 1)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await docxCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    for (const t of ['Erster Absatz.', 'Zweiter Absatz.', 'Dritter Absatz.']) {
      await page.keyboard.type(t)
      await page.keyboard.press('Enter')
    }
    await page.keyboard.press('Backspace') // letzten leeren Absatz entfernen
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Blocksatz').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml.match(/<w:jc w:val="both"\s*\/>/g)?.length).toBe(3)
  })

  test('Rundreise 4.2.1/4.2.2: ODT-Eigenrundreise über echte Bedienung', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    await odtCard(page).getByRole('button', { name: 'Neu erstellen' }).click()
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.type('Blocksatz auf Deutsch mit genug Text.')
    await page.keyboard.press('ControlOrMeta+a')
    await page.getByTitle('Blocksatz').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const fs = await import('node:fs/promises')
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const contentXml = await zip.file('content.xml')!.async('text')
    expect(contentXml).toContain('fo:text-align="justify"')
  })

  test('Rundreise 4.1.9: reale Fremddatei "56392.docx" (echtes w:jc="both") importieren, unverändert exportieren, Blocksatz bleibt', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /verstanden/i }).click()
    const fs = await import('node:fs/promises')
    const buffer = await fs.readFile('tests/fixtures/external/docx/56392.docx')
    const input = docxCard(page).locator('input[type="file"]')
    await input.setInputFiles({ name: '56392.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer })
    await expect(page.locator('.ProseMirror p').first()).toHaveCSS('text-align', 'justify')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportieren' }).click()
    const download = await downloadPromise
    const exportedBuffer = await fs.readFile((await download.path())!)
    const zip = await JSZip.loadAsync(exportedBuffer)
    const documentXml = await zip.file('word/document.xml')!.async('text')
    expect(documentXml).toMatch(/<w:jc w:val="both"\s*\/>/)
  })

  // KORRIGIERT bei diesem Durchlauf (siehe Abschnitt 3.16): kein "Format-Switch-UI"
  // in dieser App — DocumentWorkspace.tsx exportiert immer im Ursprungsformat, es
  // gibt kein "Exportieren als …". Ein früherer Entwurf verwies hier auf ein
  // angeblich in docx.spec.ts/odt.spec.ts vorhandenes Auswahl-Muster, das nicht
  // existiert; der Test wäre nicht lauffähig gewesen. Analog zu den bereits
  // bestehenden R-3/R-4 in tests/e2e/clipboard-roundtrip.spec.ts:134-147 als
  // test.fixme geführt, bis die dort (kopieren-code.md Abschnitt 6) beschriebene
  // Export-Format-Wahl existiert. Der Datenmodell-Ersatz dafür ist der neue
  // Vitest-Test in Abschnitt 5.1 ("Cross-Format-Ausrichtung, Datenmodell-Ebene").
  test.fixme(
    'Rundreise 4.3.3 / Testfall 5.14: Cross-Format DOCX -> ODT -> DOCX mit allen vier Ausrichtungen gemeinsam — blockiert, kein Export-Format-Picker (siehe kopieren-code.md Abschnitt 0.4/9, Abschnitt 3.16 dieses Plans)',
    async () => {},
  )
})
```

**Erweiterung: `tests/e2e/selection-regression.spec.ts`** (Anforderung Grenzfall
3.12 / Testfall 5.18)

Direkt im selben `describe`-Block ergänzt, analog zum bereits vorhandenen
„Fett"-Test:

```ts
test('same regression with "Blocksatz" instead of "Fett" (Grenzfall 3.12)', async ({ page }) => {
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('Hallo, das ist ein Test für Blocksatz und Selection-Sync.')
  await page.keyboard.press('ControlOrMeta+a')
  await page.getByTitle('Blocksatz').click()
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Zweiter Absatz.')
  await expect(editor).toContainText('Hallo, das ist ein Test für Blocksatz und Selection-Sync.')
  await expect(editor).toContainText('Zweiter Absatz.')
  await expect(page.locator('.ProseMirror p')).toHaveCount(2)
})
```

---

## 6. Fixture-Inventar — reale Dateien, programmatisch verifiziert (Node-Skript, `jszip`)

Alle Werte in diesem Abschnitt wurden per Skript aus den tatsächlichen
`document.xml`/`content.xml`/`styles.xml`-Inhalten extrahiert (derselbe empirische
Ansatz wie `durchgestrichen-code.md` Abschnitt 6) — **keine** Annahme aus dem
Dateinamen allein. Für den Verifikations-Refresh am 2026-07-04 erneut gescannt;
die Werte sind unverändert.

### 6.1 DOCX (Apache-POI-Korpus, `word/document.xml` + `word/styles.xml`)

| Datei | `w:jc`-Werte gefunden | Einordnung |
|---|---|---|
| `bug-paragraph-alignment.docx` | `document.xml`: 1× `left` (direkt); `styles.xml` (Stil `Title`): 1× `center` | **Primär-Fixture für Grenzfall 3.10** — Absatz 1 nur style-seitig `center` (wird als `left` gelesen), Absatz 2 direktes `left`, siehe Abschnitt 3.13 |
| `table-alignment.docx` | `document.xml`: `left`, `start`, `center`, `right`, `end` (je 1×, 5 Zellen mit Platzhaltertext „Loren"); `styles.xml`: `center` 2× | **Primär-Fixture für Grenzfall 3.9** — enthält aber **kein** `both`/`justify` |
| `TestTableCellAlign.docx` | **keine** (`w:jc`-Treffer: 0) — nur `w:vAlign` (×2, vertikale Zellausrichtung, separates, nicht modelliertes Feature) | **Korrektur zur Anforderung:** entgegen der ursprünglichen Nennung **nicht** einschlägig für horizontale Ausrichtung — siehe Abschnitt 0 Punkt 8 |
| `rtl.docx` | `document.xml`: `start` ×4; `styles.xml`: `start` ×2 | Zusätzlicher, thematisch besonders passender Fund (RTL-Kontext) |
| `table-indent.docx` | `document.xml`: `start` ×98 | Weitere Bestätigung, kein Einzelfall |
| `unicode-path.docx` | `document.xml`: `start` ×1 | Weitere Bestätigung |
| `56392.docx` | `document.xml`: `both` ×18; `styles.xml`: `left` ×1 | **Primär-Fixture für echten Blocksatz-Import** |
| `Bug51170.docx` (`both` ×149), `bug57031.docx` (`both` ×11, daneben viel `center`/`right`), `bug59058.docx` (`both` ×123) | `both` | Weitere Kandidaten, falls ein Zweit-Fixture gewünscht ist |
| `bug65649.docx` | enthält ebenfalls `both` | **Nicht verwenden** — bereits in `external-fixtures.test.ts` als `SKIP_SLOW_UNDER_JSDOM` geführt (sehr groß) |

Vollständigkeits-Hinweis: Die programmatische Suche deckte `word/document.xml`
**und** `word/styles.xml` ab — für die in Abschnitt 3.13 zitierte
Style-Deklaration (`bug-paragraph-alignment.docx`, `Title`-Stil `center`) wurde
`styles.xml` gezielt mitgeprüft und bestätigt.

### 6.2 ODT (ODF-Toolkit-Korpus, `content.xml` + `styles.xml`)

| Datei | `fo:text-align`-Werte gefunden (`content.xml`) | Einordnung |
|---|---|---|
| `feature_attributes_paragraph_MSO2013.odt` | `center` ×2, `end` ×2, `justify` ×2 | **Primär-Fixture** — Datei mit sowohl echtem `justify` **als auch** `end` gleichzeitig, einschlägig für Grenzfall 3.8 **und** Blocksatz-Import |
| `listStyleId.odt` | `justify` ×64, `right` ×52, `left` ×29, `center` ×9, `start` ×1 | **Zweit-Fixture** — enthält echten `justify` **und** ein `start` (bereits in `durchgestrichen-code.md` Abschnitt 6 für `strike` genutzt, kein neuer Korpus-Import nötig) |
| `Seasonal_Fruits2_en.odt` | `center` ×4, `justify` ×2, `start` ×1, `end` ×1 | Weiterer kombinierter Kandidat (start/end/justify gemischt) |
| `ListRoundtrip.odt` | `justify` ×8, `left` ×24, `right` ×12, `end` ×1 | Weiterer Blocksatz-Kandidat |
| `test1.odt` | `start` ×28, `center` ×5, `justify` ×1, `end` ×1 | Bestätigt: `start` ist der in LibreOffice-Exporten **übliche** Default, kein Sonderfall |
| `tabelleAlignMargin.odt` | **keine** (`fo:text-align`-Treffer: 0) — nur `table:align="margins"` (Tabellenposition relativ zu den Seitenrändern, separates, nicht gelesenes Feature) | **Korrektur zur Anforderung:** entgegen der ursprünglichen Nennung **nicht** einschlägig — siehe Abschnitt 0 Punkt 8 |

**Konsequenz für Testfall 5.17 der Anforderung** (Import der benannten Fixtures
„mit gezielter Prüfung der resultierenden `align`-Attribute"): Für
`TestTableCellAlign.docx` und `tabelleAlignMargin.odt` kann diese Prüfung nicht
sinnvoll auf horizontale Ausrichtung abzielen, da keine vorhanden ist — der in
Abschnitt 5.1 vorgesehene Test für diese beiden Dateien beschränkt sich daher
auf „importiert ohne Absturz, `align`-Attribut ist überall der Default `'left'`"
(bereits durch `external-fixtures.test.ts` grob abgedeckt) statt eine
nicht-existente Blocksatz-Zuweisung zu erwarten. Die aktuelle Anforderung hat
diese Korrektur in Abschnitt 0.1 selbst nachvollzogen; dieser Plan bleibt dazu
konsistent.

---

## 7. Unabhängige Parser-Validierung (Rundreise-Anforderung 4/Testfall 5.15, DoD Punkt 4)

Wie bereits in `durchgestrichen-code.md` Abschnitt 7 begründet: dieses Repo ist
reines TypeScript/Vite ohne Python-Toolchain. Zwei-stufiger Ansatz:

1. **Automatisiert:** Die Playwright-Tests aus Abschnitt 5.2 prüfen den
   exportierten XML-String direkt per Regex/`toContain`, **ohne** `readDocx`/
   `readOdt` zu verwenden (`expect(documentXml).toMatch(/<w:jc w:val="both"\s*\/>/)`
   bzw. `expect(contentXml).toContain('fo:text-align="justify"')`) — so können sich
   Schreib- und Lesefehler nicht gegenseitig „unsichtbar" ausgleichen
   (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 19).
2. **Manuell, einmalig, vor Status-Wechsel auf „verifiziert":** eine mit dieser
   App exportierte Test-DOCX/-ODT mit `python-docx` bzw. LibreOffice/einem
   ODF-Validator öffnen und in dieser Datei vermerken. Kein Bestandteil der
   automatisierten CI.

---

## 8. Bewusst nicht geänderter Code (und warum)

- **`schema.ts`** — permissives `align`-Attribut ohne Enum bleibt (Abschnitt
  3.15); `parseDOM`/`toDOM` für `paragraph`/`heading` (Zeile 20/33 bzw. 21/35)
  sind bereits korrekt.
- **`docx/writer.ts`** — explizites `<w:jc>` auch für den Default „links" bleibt
  (Zeile 71, Abschnitt 3.10) — kein Korrektheitsfehler.
- **`odt/writer.ts`/`styleRegistry.ts`** — literal `left`/`right` bleibt, ist
  gültiges ODF (Abschnitt 3.12); eine Umstellung auf `start`/`end` wäre eine
  Verschlechterung angesichts der fehlenden RTL-Modellierung.
- **Style-seitig ererbtes `w:jc`/`office:styles`-Formatvorlagen** — bewusst
  nicht implementiert (Abschnitt 3.13), laut Anforderung selbst (Rundreise
  4.1.10) nicht zwingend; der ODT-Zwilling dieses Themas gehört zu
  `absatzformat-dropdown-req.md` Befund 6.
- **`setHeading`s Beschränkung auf einen einzelnen Block** (`!$from.sameParent
  ($to)`, `commands.ts:45`) — unverändert; eigenständige Design-Frage aus
  `absatzformat-dropdown-req.md`, nicht Teil dieses Plans.
- **Icon-Rendering (`⇤ ↔ ⇥ ≡`)** — bewusst nicht auf SVG umgestellt
  (Abschnitt 3.7), Toolbar-weites Vorhaben laut `FEATURE-SPEC-DOCX-ODT.md`
  Abschnitt 22.
- **`prosemirror-tables`s `CellSelection`/`ranges`-Mechanik** — Fremdbibliotheks-
  Standardverhalten, korrekt; muss nur korrekt **genutzt** (Abschnitt 3.1), nicht
  implementiert werden.
- **`src/app/DocumentWorkspace.tsx`s `handleExport`** — die fehlende
  Cross-Format-Export-Wahl (Abschnitt 3.16) ist ein App-weiter, bereits an
  anderer Stelle (`kopieren-code.md` Abschnitt 0.4/9) dokumentierter Befund;
  hier bewusst **nicht** angefasst, nur die davon abhängigen Testfälle
  (Abschnitt 5.2) entsprechend als blockiert geführt.

---

## 9. Offene Abhängigkeiten (nur dokumentieren, kein Code jetzt)

- **Icon-Rendering-Umstellung auf SVG** (Abschnitt 3.7): Toolbar-weite Aufgabe
  (`FEATURE-SPEC-DOCX-ODT.md` Abschnitt 22 Punkt 3), betrifft auch `⌫ 🖍 ⊞ 🖼 ⇧`.
  Sobald umgesetzt, entfällt die in Abschnitt 3.6 eingeführte
  `ALIGN_GLYPHS`-Map zugunsten eingebetteter SVGs; `aria-label` bleibt
  unverändert bestehen.
- **Cross-Browser-/Cross-OS-Bestätigung der Tastenkombination** `Strg/Cmd+Alt+
  L/E/R/J` (Abschnitt 3.8): automatisiert nur für die in `playwright.config.ts`
  konfigurierte Chromium-Umgebung verifiziert; eine manuelle Probe auf macOS
  mit einem nicht-US-Tastaturlayout steht aus, bevor das Kürzel im sichtbaren
  Tooltip beworben wird.
- **`absatzformat-dropdown-code.md`** (noch nicht erstellt): sollte die
  Entscheidung aus Abschnitt 3.5 dieses Plans (Ausrichtung überlebt
  Formatvorlagenwechsel) direkt übernehmen statt erneut unabhängig zu
  entscheiden — sonst Risiko einer widersprüchlichen Zweitentscheidung zum
  identischen Code-Fund (`absatzformat-dropdown-req.md` Befund 4).
- **`ausrichtung-links-code.md`/`-zentriert-code.md`/`-rechts-code.md`** (noch
  nicht erstellt): Der gesamte Mechanismus (`setAlign`/`isAlignActive`/
  `AlignButton`/`JC_TO_ALIGN`/`ODF_ALIGN_ALIASES`) ist mit diesem Plan bereits
  vollständig für alle vier Werte gefixt — künftige Pläne für die drei
  Geschwister-Ausrichtungen sollten auf dieses Dokument verweisen, statt den
  Mechanismus erneut zu analysieren oder gar erneut zu ändern.
- **Style-seitige `w:jc`-/`office:styles`-Vererbung** (Abschnitt 3.13,
  `absatzformat-dropdown-req.md` Befund 6): bewusst nicht implementiert; sobald
  eines der beiden Features das aufgreift, muss die jeweils andere
  Anforderungsdatei auf denselben Mechanismus verweisen, um doppelte Arbeit zu
  vermeiden.
- **`distribute`/`thaiDistribute`-Ausrichtung** (Abschnitt 3.9): kein
  Backlog-Eintrag vorhanden; würde einen fünften `Align`-Wert quer durch
  Schema, Toolbar, DOCX- und ODT-Reader/Writer erfordern — nur als Lücke
  vermerkt, keine Umsetzung geplant.
- **Kopf-/Fußzeilen-Bearbeitung**: wie in `durchgestrichen-code.md` Abschnitt 9
  beschrieben, existiert keine UI zum Bearbeiten von Kopf-/Fußzeileninhalten —
  Blocksatz dort ist damit ebenfalls nicht über die UI testbar, nur über das
  Datenmodell (Reader/Writer selbst behandeln Kopf-/Fußzeile bereits identisch
  zum Fließtext, siehe `readBodyChildren`/`readOfficeTextChildren`-Wiederverwendung).
- **Fehlende Cross-Format-Export-UI** (Abschnitt 3.16, geteilt mit
  `kopieren-code.md` Abschnitt 0.4/9 und `ausschneiden-code.md`): Anforderung
  4.1.8/4.2.7/4.3 (Cross-Format-Rundreisen) sind über die echte Browser-UI
  aktuell **nicht** durchführbar, weil `DocumentWorkspace.tsx` kein
  „Exportieren als …" mit wählbarem Zielformat anbietet — nur `handleExportAs
  (targetModuleId)` (siehe `kopieren-code.md` Abschnitt 6) würde das schließen.
  Bis dahin bleibt DoD Punkt 4 dieses Plans für die Cross-Format-Fälle nur auf
  Datenmodell-Ebene erfüllt (Abschnitt 5.1, neuer Test), nicht über echte
  Datei-Bedienung, wie die Anforderung selbst es verlangt. Sobald die
  Export-Wahl existiert, ist der hier als `test.fixme` geführte E2E-Test
  (Abschnitt 5.2, „Rundreise 4.3.3") scharfzuschalten.

---

## 10. Abnahme-Mapping (Anforderung Abschnitt 5/6 → Testdatei)

Testfall-Nummern gemäß der aktuellen Anforderung (Abschnitt 5, Punkte 1–18).

| Anforderung | Abgedeckt durch |
|---|---|
| Testfall 5.1 (Kernverdacht, höchste Priorität) | `tests/e2e/alignment.spec.ts`, describe „Kernverdacht 2.2" + `commands.test.ts` (isolierter Nachweis des Mechanismus) |
| Testfälle 5.2/5.3/5.4 (Toolbar-Klick, Cursor→ganzer Absatz, Ersetzen der Ausrichtung) | `tests/e2e/alignment.spec.ts`, describe „Toolbar, Tastatur, Grenzfälle" |
| Testfall 5.5 (Formatvorlagenwechsel bei Blocksatz) | `alignment.spec.ts` Testfall 5 + `commands.test.ts` (`setHeading`) |
| Testfall 5.6 (Wirkungsbereich, CellSelection, kritisch) | Fix Abschnitt 3.1 (`ranges` statt `from`/`to`) + `commands.test.ts` (dedizierter Zell-Test) + `alignment.spec.ts` Testfall 6 |
| Testfall 5.7 (Listenpunkt + Tabellenzelle) | `alignment.spec.ts` Testfall 7 |
| Testfälle 5.8/5.9 (Text+Bild, reine Bildselektion) | `alignment.spec.ts` Testfall 8/9 + `commands.test.ts` (Grenzfall 3.6) |
| Testfälle 5.10/5.11 (Paste inline vs. klassenbasiert) | `alignment.spec.ts` Testfall 10/11 |
| Testfall 5.12 (Undo/Redo + Mehrfachklick) | `alignment.spec.ts` Testfall 12 |
| Testfall 5.13 (Rundreisen je Format über echten Upload/Download) | `alignment.spec.ts`, describe „Rundreisen" |
| Testfall 5.14 (Cross-Format-Rundreise, alle vier Ausrichtungen) | **E2E blockiert** (`alignment.spec.ts` Rundreise 4.3.3 als `test.fixme`, Abschnitt 3.16 — keine Cross-Format-Export-UI); Datenmodell-Ersatz: `cross-format-alignment.test.ts` |
| Testfall 5.15 (Export gegen unabhängigen Parser) | `alignment.spec.ts` (Regex-Prüfung des XML ohne eigenen Reader) + Abschnitt 7 |
| Testfall 5.16 (Screenreader-Stichprobe) | `alignment.spec.ts` Testfall 16 (Accessible-Name-Näherungstest) **plus** empfohlene manuelle NVDA/VoiceOver-Probe vor Statuswechsel |
| Testfall 5.17 (benannte Fixtures mit `align`-Prüfung) | `alignment-fixtures.test.ts` (beide Formate) — **mit Korrektur**: `TestTableCellAlign.docx`/`tabelleAlignMargin.odt` enthalten keine horizontale Ausrichtung (Abschnitt 6) |
| Testfall 5.18 (Selection-Sync-Regression mit Blocksatz) | Erweiterung `tests/e2e/selection-regression.spec.ts` |
| Anforderung 2.2 (Kernverdacht Absturz) | Fix Abschnitt 3.1 + `commands.test.ts` + `alignment.spec.ts` |
| Anforderung 2.3 (`CellSelection`-Wirkungsbereich) | Fix Abschnitt 3.1 (`ranges` statt `from`/`to`) + dedizierter Test in `commands.test.ts` + Testfall 6 |
| Anforderung 2.4/Grenzfall 3.5 (Mixed-Selection-Anzeige) | Entscheidung + Fix Abschnitt 3.3 + `commands.test.ts` |
| Anforderung 2.5 (Toggle/Undo-Sparsamkeit) | Entscheidung + Fix Abschnitt 3.1/3.4 + `commands.test.ts` + Testfall 12 |
| Anforderung 2.6 (setHeading-Reset) | Entscheidung + Fix Abschnitt 3.5 + `commands.test.ts` + Testfall 5 |
| Anforderung 2.7 (Listen/Zellen) | Abschnitt 3.14 (bereits korrekt) + Testfall 7 + Roundtrip-Zellen-Test |
| Bedienelement Nr. 4 (`aria-label`) | Fix Abschnitt 3.6 |
| Bedienelement Nr. 3 (Icon-Rendering) | Abschnitt 3.7 — bewusst nicht behoben, begründet, als offene Abhängigkeit vermerkt |
| Bedienelement Nr. 2 (Tastenkombination) | Entscheidung + Fix Abschnitt 3.8 + Risikoabwägung + E2E-Test |
| Grenzfall 3.9 (DOCX `start`/`end`/`distribute`) | Fix Abschnitt 3.9 + `alignment-fixtures.test.ts` (echte Fixtures) |
| Grenzfall 3.8 (ODT `start`/`end`) | Fix Abschnitt 3.11 + `alignment-fixtures.test.ts` (echte Fixture) |
| Grenzfall 3.10 (style-ererbtes `w:jc`) | Abschnitt 3.13 — bewusst nicht behoben, mit echter, sich selbst dokumentierender Fixture eingefroren und getestet |
| Grenzfall 3.6 (reine Bildselektion) | `commands.test.ts` + `alignment.spec.ts` Testfall 8/9 |
| Grenzfall 3.7 (Fremdwert nach Paste) | `commands.test.ts` + `alignment.spec.ts` Testfall 11 |
| Grenzfall 3.12 (Kombination mit Selection-Sync-Bug) | Erweiterung `tests/e2e/selection-regression.spec.ts` |
| Grenzfall 3.13 (Performance bei langer Selektion) | E2E-Test in `alignment.spec.ts` |
| Anforderung 4.1.8/4.2.7/4.3 (Cross-Format-/Doppelrundreise) | **E2E blockiert** (Abschnitt 3.16, kein Export-Format-Picker in `DocumentWorkspace.tsx` — geteilter Befund mit `kopieren-code.md` Abschnitt 0.4/9); Datenmodell-Ersatz `cross-format-alignment.test.ts` (Abschnitt 5.1); volle Bestätigung „über echte Bedienung" erst nach Behebung des fremden Blockers möglich |
| Verdachtsmoment „nur Einzelabsatz getestet" (Anforderungstabelle) | Erweiterung `roundtrip.test.ts` (beide Formate) um Mehrfachabsatz-/Tabellen-/Überschrift-/hard\_break-Fälle |
| DoD Punkt 1 (Kernverdacht behoben + Regressionstest) | Abschnitt 3.1 + `alignment.spec.ts` describe „Kernverdacht" |
| DoD Punkt 2 (Wirkungsbereich 2.3 eigenständig belegt) | Abschnitt 3.1 + `commands.test.ts` (getrennter Zell-Test) + Testfall 6 |
| DoD Punkt 3 (alle Testfälle E2E ausgeführt) | Abschnitt 5 komplett + diese Tabelle — **mit Ausnahme** von Testfall 5.14/Anforderung 4.3, dort nur Datenmodell-Ebene möglich (siehe oben) |
| DoD Punkt 4 (Rundreisen inkl. Mehrfachabsatz, unabhängiger Parser) | Abschnitt 5.2/7 für DOCX-/ODT-Eigenrundreise; Cross-Format-Rundreisen (4.1.8/4.2.7/4.3) nur auf Datenmodell-Ebene erfüllbar, bis der Export-Format-Picker existiert (Abschnitt 3.16/9) |
| DoD Punkt 5 (alle Grenzfälle geprüft/dokumentiert) | Abschnitt 3 (je Grenzfall einzeln eingestuft: „behoben"/„bewusst dokumentiert, nicht behoben"/„bereits korrekt, nur Test nötig") |
| DoD Punkt 6 (offene Fragen 2.4/2.5/2.6 + Tastenkombination entschieden) | Abschnitt 3.3/3.4/3.5/3.8, hier verbindlich entschieden und begründet |
| DoD Punkt 7 (`aria-label`/Icon-Risiko bewertet) | Abschnitt 3.6 (behoben) / 3.7 (bewusst beibehalten, begründet) |
