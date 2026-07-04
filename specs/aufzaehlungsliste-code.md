# Umsetzungsplan: Feature „Aufzählungsliste (Bullet)"

Gegenstück zu `specs/aufzaehlungsliste-req.md` (Anforderung). Dieses Dokument ist der
**dateigenaue Entwicklungsplan**: was am bestehenden Code nachweislich falsch/
unvollständig ist (durch eigene Codesichtung verifiziert, nicht nur aus der
Anforderung übernommen), welche Dateien sich ändern bzw. neu entstehen, und in
welcher Reihenfolge. Alle Datei:Zeile-Angaben wurden gegen den tatsächlichen
Quellcode geprüft (Stand dieses Plans); abweichende/nicht reproduzierbare
Verdachtsmomente aus der Anforderung sind unten explizit als solche markiert.

---

## 0. Geltungsbereich und Abgrenzung zu Geschwister-Plänen

`bullet_list`/`ordered_list`/`list_item` (`src/formats/shared/schema.ts:74-104`) sind
ein gemeinsamer Schema-Knoten für **vier** separate Backlog-Slugs mit eigenen
Anforderungsdateien:

| Slug | Datei | Verhältnis zu diesem Plan |
|---|---|---|
| `aufzaehlungsliste` | `specs/aufzaehlungsliste-req.md` | **Dieser Plan.** Erzeugen/Umschalten von Bullet-Listen, aktiver/deaktivierter Button-Zustand, ODT-Bullet-Fallback-Bug, DOCX-Listentrennungs-Bug, Basis-Rundreise beider Formate, E2E-Grundabdeckung für Listen (aktuell **keine** vorhanden). |
| `nummerierte-liste` | `specs/nummerierte-liste-req.md` | Geschwister-Feature, **kein eigener Codeplan bislang vorhanden**. Teilt `commands.ts`/`Toolbar.tsx`. Die hier unter 3./4.2 geplante Reparatur von `toggleList` wirkt **identisch** auf „1. Liste" — das wird unten explizit gekennzeichnet, keine Doppelarbeit vorgesehen. |
| `liste-aufheben` | `specs/liste-aufheben-req.md` | Eigene, ausführliche Anforderung für den „⇧ Liste"-Button selbst (kein Codeplan bislang vorhanden). Dieser Plan übernimmt **nur** die in Abschnitt 3.10/DoD von `aufzaehlungsliste-req.md` geforderte `disabled`-Rückmeldung (siehe 4.3), **nicht** die dort im Detail behandelte mehrstufige Lift-Semantik. |
| `liste-einruecken-tab` | `specs/liste-einruecken-tab-req.md` | Eigene, sehr ausführliche Anforderung (18 Grenzfälle, eigene Rundreise-Matrix für 9 Ebenen) für Tab/Umschalt+Tab, `sinkListItem`, DOCX-`w:ilvl`-Erhaltung über Import **und** Export, ODT-Ebenen-Stildefinitionen. **Wird hier bewusst NICHT implementiert** — Begründung und Übergabe in Abschnitt 6. |

**Konsequenz für dieses Dokument:** Es deckt vollständig ab, was in
`aufzaehlungsliste-req.md` Abschnitt 1–5 als spezifisch für das *Erzeugen/
Umschalten einer einstufigen Bullet-Liste* beschrieben ist, plus die für dieses
Feature bereits heute (auch ohne Tab-Funktion) über ODT-Import erreichbare
Mehrstufigkeit (Lesbarkeit/Robustheit, nicht Bedienbarkeit). Es liefert **keine**
Tab/Umschalt+Tab-Tastenbindung — das wird in Abschnitt 6 begründet und an
`liste-einruecken-tab-code.md` übergeben.

---

## 1. Bestätigter Ist-Stand (eigene Codesichtung)

Alle 11 Verdachtsmomente aus `aufzaehlungsliste-req.md` Abschnitt 5 wurden gegen den
tatsächlichen Code geprüft:

| # | Verdacht | Ergebnis der Prüfung |
|---|---|---|
| 1 | Kein Ein-/Ausrücken implementiert | **Bestätigt.** `WordEditor.tsx:71-79` bindet nur `Enter`/`Mod-z`/`Mod-y`/`Mod-Shift-z`/`Mod-b`/`Mod-i`/`Mod-u`. Kein `Tab`/`Shift-Tab`. `grep -r sinkListItem src` (außerhalb `node_modules`) liefert **keinen** Treffer. `baseKeymap` aus `prosemirror-commands` bindet ebenfalls kein `Tab` (verifiziert per Node-Repl: `Object.keys(baseKeymap)` → `['Enter','Mod-Enter','Backspace','Mod-Backspace','Shift-Backspace','Delete','Mod-Delete','Mod-a']`). Tab wird also aktuell **nicht** abgefangen → Browser-Standardverhalten (Fokuswechsel) ist zu erwarten. |
| 2 | DOCX-Export ignoriert Verschachtelungsebenen | **Bestätigt.** `docx/writer.ts:112-118`: `bullet_list`/`ordered_list` rekursiert per `flatMap` über `item.content`; jeder Aufruf von `blockToDocx(child, …, numId)` setzt in Zeile 103 hart `<w:ilvl w:val="0"/>`. Ein verschachtelter `bullet_list`-Knoten als weiteres Kind eines `list_item` würde beim rekursiven Aufruf erneut in den `bullet_list`-Fall laufen und **dieselbe** `BULLET_NUM_ID`/`ilvl=0` erhalten wie die Elternebene → vollständige Abflachung zu gleichrangigen Punkten derselben Liste. |
| 3 | DOCX-Import liest `w:ilvl` nicht | **Bestätigt.** `listMarkerFor` (`docx/reader.ts:196-201`) liest ausschließlich `w:numId`, keinerlei Zugriff auf `w:ilvl` im gesamten Reader. |
| 4 | Feste globale Listen-ID/-Stil ohne Bullet-Konsequenz | **Bestätigt, mit einer wichtigen Ergänzung.** `BULLET_NUM_ID=1` (`docx/styleDefs.ts:34`) ist nicht nur „global fix, aber ohne optische Konsequenz" — es hat eine **strukturelle** Konsequenz: siehe neuer Befund unten (1a). |
| 5 | Kein eigenes Bullet-Zeichen wählbar | **Bestätigt.** `schema.ts:74-81` (`bullet_list`) hat kein Attribut. `docx/styleDefs.ts:41` und `odt/styleRegistry.ts:100` codieren `•` fest. |
| 6 | Kein Symbolwechsel je Ebene | **Bestätigt.** Je nur eine `w:lvl`/`text:list-level-style-bullet`-Definition. |
| 7 | `toggleList` kein echtes Toggle | **Bestätigt und im Bibliothekscode nachvollzogen** (`node_modules/prosemirror-schema-list/dist/index.js:92-111`, `prosemirror-schema-list@1.5.1`): `wrapRangeInList` behandelt „Cursor am Anfang eines Nicht-Erst-Punkts" als `doJoin=true`-Pfad (Zeilen 94-104, potenzielle Verschachtelung) und „Cursor im allerersten Punkt" als striktes `return false` (Zeilen 96-98, „Don't do anything if this is the top of the list"). `commands.ts:57-60` ruft ausnahmslos `wrapInList` auf, keine Prüfung auf bereits vorhandenen Listentyp. |
| 8 | ODT-Fallback auf „bullet" | **Bestätigt, Ursache genauer lokalisiert.** `elementToBlocks` (`odt/reader.ts:181`) nutzt `|| 'bullet'`. Ursache: `listKinds` wird ausschließlich aus `parseAutomaticStyles(contentAutomaticStyles)` befüllt (`readOdt`, `odt/reader.ts:245-246`); `styles.xml` wird zwar eingelesen (`odt/reader.ts:252-270`), aber dessen `listKinds` (`stylesForChrome.listKinds`) wird **nur** für Kopf-/Fußzeilen verwendet, **nicht** mit `contentStyles.listKinds` zusammengeführt. Ein in `styles.xml` (egal ob `office:styles` oder dessen `office:automatic-styles`) definierter, von `content.xml` nur referenzierter Listenstil ist für den **Dokumentkörper** damit grundsätzlich unauffindbar → Fallback `'bullet'` greift immer, unabhängig vom tatsächlichen Typ. |
| 9 | Kein aktiver Button-Zustand | **Bestätigt.** `Toolbar.tsx:192-224`: alle drei Listen-Buttons ohne `aria-pressed`, im Gegensatz zu `MarkButton` (Zeile 48) und `AlignButton` (Zeile 70). |
| 10 | Tests decken nur den einfachen Fall ab | **Bestätigt.** `docx/__tests__/roundtrip.test.ts:135-171` hat den Trennungs-Test (Zeile 161-170), `odt/__tests__/roundtrip.test.ts:135-160` hat **kein** Äquivalent. Beide `external-fixtures.test.ts`-Dateien (`docx/__tests__/external-fixtures.test.ts:74-85`, `odt/__tests__/external-fixtures.test.ts:43-54`) prüfen ausschließlich „wirft keinen Fehler", keine Strukturprüfung. |
| 11 | Keine Listen-E2E-Tests | **Bestätigt.** `tests/e2e/{docx,odt,lifecycle,selection-regression}.spec.ts` enthalten keinen Treffer für „list"/„Liste"/„bullet" (per Grep bestätigt). |

### 1a. Zusätzliche, durch diese Sichtung neu gefundene Befunde (nicht in der Anforderung benannt)

1. **DOCX: Zwei benachbarte, nicht durch Absatz getrennte Bullet-Listen verschmelzen beim Reimport tatsächlich zu einer** (Grenzfall 3.12 der Anforderung — Verdacht **bestätigt**, mit exakter Ursache). `groupLists` (`docx/reader.ts:258-283`) flusht eine Liste nur bei `numId`-Wechsel oder einem Nicht-Listen-Block (Zeile 273: `if (currentNumId !== null && currentNumId !== marker.numId) flush()`). Da **jede** Bullet-Liste beim Export dieselbe feste `BULLET_NUM_ID=1` erhält (`docx/writer.ts:114`, `docx/styleDefs.ts:34`), sind zwei unmittelbar aufeinanderfolgende, eigentlich getrennte Bullet-Listen beim Reimport durch nichts zu unterscheiden — sie werden zu **einer** Liste zusammengefasst. Das ist ein echter Datenverlust (Listenzahl, nicht nur Formatierung) und direkt durch Abschnitt 4.1 Punkt 5 der Anforderung geforderte Rundreise abgedeckt.
2. **DOCX: `parseNumberingXml` wählt den „ersten Kind-`<w:lvl>` in Dokumentreihenfolge", nicht gezielt `w:ilvl="0"`.** `docx/reader.ts:83`: `const lvl = firstChildNS(abstractEl, OOXML_NAMESPACES.w, 'lvl')` — `firstChildNS` liefert `childElements(...)[0]`, also den XML-ersten `<w:lvl>`, unabhängig von dessen `w:ilvl`-Wert. Für die konkret in der Anforderung (Abschnitt 4.2, referenziert als vermeintlicher Beleg für „Abschnitt 5 Punkt 7") genannte Datei `NumberingWithOutOfOrderId.docx` **tritt der Fehler nicht auf** (per direkter ZIP/XML-Prüfung verifiziert: die Datei hat genau ein `abstractNum` mit `abstractNumId="1"`, dessen erstes `<w:lvl>` bereits `w:ilvl="0"` mit `w:numFmt="bullet"` ist; ihre einzige `<w:p>` liegt auf `ilvl="0"`) — der Dateiname bezieht sich auf eine ungewöhnliche numId/abstractNumId-Nummerierung (beide „1", nicht bei 0 beginnend), nicht auf eine `w:lvl`-Reihenfolge. Der referenzierte Anforderungs-Abschnitt „5, Punkt 7" ist zudem in der Anforderungsdatei tatsächlich „`toggleList` kein echtes Toggle", **nicht** „falsche Bullet/Nummeriert-Erkennung" — dieser Querverweis in der Anforderung ist also intern inkonsistent/fehlbeschriftet. Der Code-Befund selbst (dokumentenreihenfolge- statt attributbasierte Auswahl) ist trotzdem real und ein **latentes** Risiko für andere, hypothetische Dateien mit uneinheitlicher `w:lvl`-Reihenfolge — wird unten als Härtung mit niedriger Priorität eingeplant, nicht als „durch diese Datei nachgewiesener aktiver Bug".
3. **`Numbering.docx` und `NumberingWOverrides.docx` enthalten tatsächlich Bullet-Ebenen** (per Auszählung der `w:numFmt`-Werte in `word/numbering.xml` verifiziert: `Numbering.docx` → `{bullet: 9, decimal: 18, lowerLetter: 9, lowerRoman: 9, custom: 1}`; `NumberingWOverrides.docx` → u. a. `{bullet: 35, decimal: 262, …}`), **`ComplexNumberedLists.docx` dagegen nicht** (`{decimal: 18, lowerLetter: 18, lowerRoman: 18}`, kein `bullet`-Format). Für die Bullet-Verifikation (Abschnitt 4.2 der Anforderung) sind also `Numbering.docx`, `NumberingWOverrides.docx` und `NumberingWithOutOfOrderId.docx` relevant, `ComplexNumberedLists.docx` **nicht** (das ist reines Nummerierungs-Testmaterial, gehört zu `nummerierte-liste-req.md`).
4. **DOCX: Ein bild-einziger Listenpunkt wird beim Import faktisch aus der Liste „ausgestoßen", statt einen Schema-Crash zu riskieren.** `readBodyChildren` (`docx/reader.ts:319`): `items.push({ marker: block.type === 'paragraph' ? marker : { numId: null }, block })` — für einen `<w:p>`, der (z. B. weil er nur eine Bild-Drawing-Run ohne Text enthält) zu einem `image`-Block statt einem `paragraph`-Block wird, wird die Liste-Zugehörigkeit (`marker.numId`) verworfen. Ergebnis: Das Bild erscheint als eigenständiger Block **außerhalb** der Liste, die Liste wird an dieser Stelle in zwei separate `bullet_list`-Knoten gespalten. Kein Crash, kein Textverlust, aber eine stillschweigende Strukturänderung (das Bild „verlässt" optisch die Liste). Für `imageWithinList.odt` (ODT-Fixture aus Abschnitt 4.2) betrifft das die **ODT**-Seite direkt (siehe 2b/Fix 6 unten); für DOCX ist kein Fixture mit genau diesem Muster im Korpus bekannt, daher hier nur als **dokumentierter, nicht behobener Fund** festgehalten (Test empfohlen, siehe Abschnitt 5.1).
5. **ODT: `list_item` ohne führenden Absatz ist tatsächlich konstruierbar, nicht nur theoretisch.** Sowohl bei einem `text:list-item`, dessen einziges Kind ein verschachteltes `text:list` ist (Grenzfall 3.7 der Anforderung), als auch bei einem `text:list-item`, dessen `text:p` **nur** einen `draw:frame` ohne vorausgehenden Text enthält (Grenzfall 3.9 — `paragraphToBlocks`, `odt/reader.ts:144-154`: `flushText()` pusht nur bei nicht-leerem `textBuffer`, ein `draw:frame` als allererstes Kind erzeugt daher `blocks = [image, …]` **ohne führenden `paragraph`**), entsteht ein `list_item.content`, dessen erstes Element **kein** `paragraph` ist. Das widerspricht dem Schema (`list_item: { content: 'paragraph block*' }`, `schema.ts:99`) und würde bei `wordSchema.nodeFromJSON(...)` (`WordEditor.tsx:65`) eine Schema-Validierungs-Exception auslösen — mit dem in `FEATURE-SPEC-DOCX-ODT.md` Abschnitt 1.2 ausdrücklich ausgeschlossenen Ergebnis „leere weiße Seite ohne verständliche Fehlermeldung". Muss vor Produktivsetzung behoben werden (siehe Fix 6).

---

## 2. Priorisierte Fehler-/Lückenliste (Umsetzungsgegenstand dieses Plans)

„Muss" = blockierend für die Definition of Done aus `aufzaehlungsliste-req.md`
Abschnitt 7. „Soll" = empfohlen, nicht blockierend. „Dokumentiert" = bewusst nicht
behoben, aber nachweislich als Einschränkung festgehalten (zulässig laut Abschnitt 7
der Anforderung für einzelne Verdachtsmomente).

| # | Befund | Einstufung | Fix in Abschnitt |
|---|---|---|---|
| F1 | `toggleList` kein echtes Toggle (Verdacht 7, Grenzfall 3.2–3.4, Anforderung 2.6) | **Muss** | 4.2 |
| F2 | Kein `aria-pressed`/aktiver Zustand (Verdacht 9) | **Muss** | 4.3 |
| F3 | Kein sichtbares Feedback bei No-Op (Grenzfall 3.5, 3.10; DoD nennt beide explizit) | **Muss** | 4.2/4.3 |
| F4 | Tastatur-Aktivierung (Enter/Leertaste) am Button funktioniert nicht (Abschnitt 1 Zeile 8) | **Muss** | 4.3 |
| F5 | ODT: Listenstil-Fallback auf „bullet" bei Referenz auf `styles.xml` (Verdacht 8, Grenzfall 3.13) | **Muss** | 4.8 |
| F6 | ODT: `list_item` ohne führenden Absatz kann Schema-Crash auslösen (Grenzfall 3.7, 3.9, Neufund 1a.5) | **Muss** | 4.8 |
| F7 | DOCX: zwei benachbarte Bullet-Listen ohne Trennabsatz verschmelzen beim Reimport (Grenzfall 3.12, Neufund 1a.1) | **Muss** | 4.6/4.7 |
| F8 | DOCX: `w:lvl`-Auswahl nach Dokumentreihenfolge statt `w:ilvl="0"` (Neufund 1a.2, latent) | **Soll** | 4.5 |
| F9 | Fehlende Struktur-Tests für reale Fixtures (Verdacht 10, Abschnitt 4.2 der Anforderung) | **Muss** | 5.1 |
| F10 | Keine Listen-E2E-Tests (Verdacht 11) | **Muss** | 5.2 |
| F11 | DOCX: Verschachtelung wird bei Export flachgelegt (Verdacht 2/3) | **Dokumentiert** (Fix bei `liste-einruecken-tab`) | 6 |
| F12 | Kein Tab/Umschalt+Tab (Verdacht 1) | **Dokumentiert** (Fix bei `liste-einruecken-tab`) | 6 |
| F13 | Kein eigenes Bullet-Zeichen, kein Symbolwechsel je Ebene (Verdacht 5/6) | **Dokumentiert** (Backlog Priorität 4) | 7 |
| F14 | Keine Input-Rules („- " → Liste) | **Dokumentiert** (Nice-to-have) | 7 |
| F15 | DOCX: Bild-einziger Listenpunkt „verlässt" die Liste beim Import (Neufund 1a.4) | **Dokumentiert** (Test statt Fix) | 5.1 |

---

## 3. Kernentscheidung: Ein einheitliches Muster für Toggle + aktiver Zustand + Deaktivierung

Statt drei Einzelmaßnahmen wird **ein** Muster für alle drei Listen-Buttons
verwendet, das sich strikt an bereits im Projekt vorhandene Idiome anlehnt (kein
neues Infrastruktur-Element nötig):

1. **Aktiver Zustand** (`aria-pressed`): analog zu `AlignButton`
   (`Toolbar.tsx:64-84`) und `isInTable(view.state)` (`Toolbar.tsx:231`) — reiner
   Lesezugriff auf `view.state`, pro Render neu berechnet.
2. **Deaktivierter Zustand** (`disabled`): ProseMirror-Commands unterstützen laut
   eigener Dokumentation (`wrapInList`-Docstring, `node_modules/prosemirror-schema-list/dist/index.js:65-70`:
   „If `dispatch` is null, only return a value to indicate whether this is
   possible") einen **Dry-Run**: `command(view.state, undefined)` liefert `true`/
   `false`, ohne etwas zu verändern. Dasselbe Muster wird bereits implizit von
   `isInTable` nachgeahmt. Jeder der drei Buttons berechnet so `disabled={!command(view.state)}`.
3. **Echtes Toggle statt `wrapInList`-Blindaufruf**: neue Logik in `commands.ts`
   (Abschnitt 4.2), die zuerst prüft, ob die Selektion bereits in einer Liste
   steckt, und je nach Fall `liftListItem`, `setNodeMarkup` (Typwechsel) oder
   `wrapInList` (Neuanlage) aufruft.

Damit werden **in einem Zug** behoben: F1 (echtes Toggle), F2 (aktiver Zustand),
F3 (No-Op wird als `disabled` sichtbar, nicht mehr als wirkungsloser Klick) sowie
symmetrisch — weil `Toolbar.tsx` von allen drei Listen-Slugs gemeinsam genutzt
wird — der entsprechende Zustand für „1. Liste" (`nummerierte-liste`) und
„⇧ Liste" (`liste-aufheben`).

**Bekannte Grenze dieses Musters (zu dokumentieren, nicht zu lösen):**
`liftListItem`s Dry-Run (`node_modules/prosemirror-schema-list/dist/index.js:206-219`,
Zeile 212-213: `if (!dispatch) return true;`) gibt bereits `true` zurück, sobald
`$from.blockRange($to, pred)` **irgendeinen** Bereich findet — er prüft **nicht**
zusätzlich, ob der nachfolgende `liftToOuterList`/`liftOutOfList`-Aufruf tatsächlich
erfolgreich wäre (beide können intern `false` liefern, z. B. wenn `liftTarget`
`null` ergibt). Es bleibt also ein theoretisches Restrisiko, dass „⇧ Liste" trotz
`disabled={false}` bei einem echten Klick nichts tut. Für den in dieser
Anforderung relevanten einstufigen Fall (keine Verschachtelung, da im Editor nicht
erzeugbar) tritt dieser Fall nicht auf; er wird als dokumentierte Restlücke
festgehalten und sollte bei `liste-einruecken-tab` (wo Mehrstufigkeit real
entsteht) erneut geprüft werden.

---

## 4. Dateigenauer Umsetzungsplan

### 4.1 `src/formats/shared/schema.ts` — keine Änderung

`bullet_list`/`ordered_list`/`list_item` bleiben unverändert (Zeilen 74-104). Kein
Attribut für ein eigenes Bullet-Zeichen (siehe F13, bewusst nicht umgesetzt,
Abschnitt 7). Die Content-Ausdrücke sind für Mehrstufigkeit bereits ausreichend
(bestätigt in Abschnitt 1); keine Änderung nötig, auch nicht vorgreifend für
`liste-einruecken-tab`.

### 4.2 `src/formats/shared/editor/commands.ts` — echtes Toggle

Ersetzt die aktuelle Implementierung (Zeilen 57-64):

```ts
const LIST_NODE_TYPES = [wordSchema.nodes.bullet_list, wordSchema.nodes.ordered_list]

/** Findet den nächstgelegenen umschließenden Listenknoten (bullet_list/ordered_list)
 *  der aktuellen Selektion, falls vorhanden — nutzt ProseMirrors eigene
 *  Node-Range-Suche (`blockRange` mit Prädikat), keine eigene Baum-Traversierung. */
function ancestorListRange(state: EditorState): NodeRange | null {
  const { $from, $to } = state.selection
  return $from.blockRange($to, (node) => LIST_NODE_TYPES.includes(node.type))
}

export function toggleList(ordered: boolean): Command {
  const listType = ordered ? wordSchema.nodes.ordered_list : wordSchema.nodes.bullet_list
  return (state, dispatch) => {
    const range = ancestorListRange(state)
    if (range) {
      if (range.parent.type === listType) {
        // Bereits derselbe Listentyp: echtes Toggle-Off statt No-Op/Verschachtelung
        // (löst Grenzfall 3.2, 3.3, 3.4 der Anforderung deterministisch).
        return liftListItem(wordSchema.nodes.list_item)(state, dispatch)
      }
      // Anderer Listentyp: Typ der gefundenen Liste direkt umschreiben, keine
      // Verschachtelung, kein Lift+Wrap (Anforderung 2.6).
      if (dispatch) {
        const pos = range.$from.before(range.depth)
        const attrs = ordered ? { start: 1 } : null
        dispatch(state.tr.setNodeMarkup(pos, listType, attrs))
      }
      return true
    }
    // Keine umschließende Liste: normale Neuanlage.
    return wrapInList(listType)(state, dispatch)
  }
}

export function isListActive(state: EditorState, ordered: boolean): boolean {
  const listType = ordered ? wordSchema.nodes.ordered_list : wordSchema.nodes.bullet_list
  const range = ancestorListRange(state)
  return range?.parent.type === listType
}

export function liftFromList(): Command {
  return liftListItem(wordSchema.nodes.list_item)
}
```

Wichtige Detailpunkte für die Implementierung:
- `NodeRange.parent` (`node_modules/prosemirror-model/dist/index.js:1130`) liefert
  den gefundenen Listenknoten selbst; `range.$from.before(range.depth)` liefert
  dessen **eigene** Dokumentposition (nicht die des Contents) — verifiziert anhand
  der `NodeRange`-Klassendefinition (`start`/`parent`-Getter,
  `prosemirror-model/dist/index.js:1093-1138`).
- `setNodeMarkup` erhält für `ordered_list` explizit `{ start: 1 }`, für
  `bullet_list` `null` (kein Attribut) — **nicht** `null` in beiden Fällen, um
  keine ungültigen/fehlenden Attribute zu riskieren; mit einem Unit-Test
  abzusichern (siehe 5.1).
- **Grenzfall 3.5 (Selektion über eine Überschrift hinweg):** `wrapInList` scheitert
  weiterhin strukturell für den die Überschrift enthaltenden Bereich
  (`findWrapping` liefert `null`, Bibliotheksverhalten unverändert). Der in
  Abschnitt 3 dieses Plans beschriebene `disabled`-Zustand macht diesen Fall
  **sichtbar** (Button ist deaktiviert, sobald die Selektion eine Überschrift
  einschließt und dadurch kein Wrap möglich ist) — das erfüllt die DoD-Vorgabe
  „sichtbar zurückmelden" **ohne** eine neue Toast-/Benachrichtigungs-Infrastruktur
  einzuführen (im Projekt aktuell nicht vorhanden, siehe Grep-Ergebnis: kein
  Treffer für „toast"/„snackbar"/„notification"/„aria-live" im gesamten `src`).
  **Empfehlung als optionale Verbesserung** (nicht blockierend): Selektion in
  zusammenhängende Läufe aus wrapbaren Blöcken (alles außer `heading`) aufteilen
  und pro Lauf einzeln wrappen, damit auch die Absätze in einer gemischten
  Selektion tatsächlich zur Liste werden. Das erfordert mehrere
  `ReplaceAroundStep`-Anwendungen in umgekehrter Dokumentreihenfolge (analog zu
  `doWrapInList`, `node_modules/prosemirror-schema-list/dist/index.js:112-131`) und
  wird hier bewusst **nicht** in den Blocking-Scope aufgenommen, da der
  `disabled`-Zustand die DoD-Anforderung bereits ohne dieses Mehr an Komplexität
  erfüllt.

**Cross-Cutting-Hinweis:** `toggleList`/`isListActive` werden von **beiden**
Buttons „• Liste" und „1. Liste" verwendet (`ordered` Parameter). Die
Toggle-Reparatur behebt damit automatisch denselben Verdacht für die nummerierte
Liste (kein separater Fix in einem künftigen `nummerierte-liste-code.md`
notwendig) — dort nur noch zu verifizieren/zu erwähnen, nicht erneut zu bauen.

### 4.3 `src/formats/shared/editor/Toolbar.tsx`

Änderungen an den drei Listen-Buttons (aktuell Zeilen 192-224) und – aus
Konsistenzgründen mit geringem Zusatzaufwand über den gemeinsamen `run()`-Helfer –
an **allen** Toolbar-Buttons für die Tastatur-Aktivierung (F4).

```tsx
function ListButton({
  view,
  ordered,
  label,
  title,
}: {
  view: EditorView
  ordered: boolean
  label: string
  title: string
}) {
  const active = isListActive(view.state, ordered)
  const command = toggleList(ordered)
  const canApply = command(view.state, undefined) // Dry-Run, siehe Abschnitt 3
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={!canApply}
      onMouseDown={(e) => {
        e.preventDefault()
        run(view, command)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          run(view, command)
        }
      }}
      className={/* aktiver/disabled-Zustand analog MarkButton/AlignButton, zzgl. disabled:opacity-40 disabled:cursor-not-allowed */}
    >
      {label}
    </button>
  )
}
```

- „• Liste" → `<ListButton view={view} ordered={false} label="• Liste" title="Aufzählung" />`
- „1. Liste" → `<ListButton view={view} ordered={true} label="1. Liste" title="Nummerierte Liste" />`
- „⇧ Liste" bekommt denselben `disabled`-Mechanismus (`liftFromList()(view.state, undefined)`),
  aber **keinen** `aria-pressed` (kein sinnvoller „aktiver Zustand" für eine
  Aktion, die aus der Liste heraus führt) — das behebt F3 für Grenzfall 3.10, ohne
  in den Zuständigkeitsbereich von `liste-aufheben-req.md` (mehrstufiges Lift-
  Verhalten) einzugreifen.
- **`onKeyDown`-Ergänzung wird für alle Toolbar-Buttons vorgenommen** (nicht nur
  die Listen-Gruppe), da der gemeinsame `run()`-Helfer und das
  `onMouseDown`-Muster identisch für `MarkButton`, `AlignButton`, den
  Tabellen-Button etc. gilt (`Toolbar.tsx:44-84`, `228-239`). Begründung: Ein
  fokussierter `<button>` löst bei Aktivierung per Tastatur (Enter/Leertaste) laut
  Web-Plattform-Semantik ein `click`-Ereignis aus, **kein** `mousedown` — ein
  reiner `onMouseDown`-Handler bleibt für Tastaturnutzer:innen wirkungslos. Ein
  zusätzlicher `onClick`-Handler würde bei echten Mausklicks zur **doppelten**
  Befehlsausführung führen (`mousedown` **und** nachfolgendes `click` feuern
  beide), daher gezielt `onKeyDown` für `Enter`/`' '` statt `onClick` — Mausklicks
  bleiben unverändert einmalig über `onMouseDown`. Für die Listen-Gruppe ist dies
  laut Anforderung (Abschnitt 1, Zeile 8) **explizit** mit echter Browser-Bedienung
  zu verifizieren (siehe E2E-Test in 5.2); die Ausweitung auf die übrige Toolbar
  ist ein niedrig-riskanter Mitzieheffekt, kein separates Feature.
- CSS/Tailwind-Klassen für `disabled`: neue Utility-Klasse
  `disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`
  ergänzen (Tailwind-`disabled:`-Variante, keine neue Infrastruktur nötig, da
  Tailwind bereits im Projekt verwendet wird).

### 4.4 `src/formats/shared/editor/WordEditor.tsx` — keine Änderung

Kein neuer Keymap-Eintrag (siehe Abschnitt 6 — Tab/Umschalt+Tab bewusst nicht Teil
dieses Plans). `Enter: splitListItem(...)` (Zeile 75) bleibt unverändert; wird in
5.2 mit einem echten E2E-Test abgesichert (bisher **nicht** durch einen
Browser-Test verifiziert, nur durch Bibliotheks-Vertrauen, siehe Anforderung
Abschnitt 2.3).

### 4.5 `src/formats/docx/reader.ts`

**Fix F8 (Soll, Härtung):** `parseNumberingXml` (Zeilen 77-97), Zeile 83:

```ts
// vorher:
const lvl = firstChildNS(abstractEl, OOXML_NAMESPACES.w, 'lvl')
// nachher: gezielt Ebene 0 suchen, mit Fallback auf „erstes Element" für
// Dateien, die überhaupt kein ilvl="0" definieren (defensiv, kein bekannter
// Fixture-Fall, aber schadet nicht):
const lvlCandidates = childElements(abstractEl, OOXML_NAMESPACES.w, 'lvl')
const lvl = lvlCandidates.find((l) => l.getAttributeNS(OOXML_NAMESPACES.w, 'ilvl') === '0') ?? lvlCandidates[0] ?? null
```

Kein Verhaltensunterschied für die aktuell bekannten Fixtures (siehe Neufund 1a.2),
aber schließt eine plausible Fehlerquelle für zukünftige/andere Dateien mit
unüblicher `w:lvl`-Reihenfolge. Test: neuer Unit-Test mit synthetisch
umsortiertem `numbering.xml` (Ebene 1 vor Ebene 0 deklariert), siehe 5.1.

**Kein Fix für F11/F12** (Verschachtelung/`w:ilvl`) — siehe Abschnitt 6.

### 4.6 `src/formats/docx/writer.ts` — Fix F7 (per-Liste eindeutige `numId`)

Aktuell (Zeilen 94-126): `blockToDocx` erhält `listNumId: number | null` und setzt
im `bullet_list`/`ordered_list`-Fall (Zeile 114) die **globale, feste**
`BULLET_NUM_ID`/`ORDERED_NUM_ID`. Neu: jede **JSON-Listenknoten-Instanz** (jedes
Auftreten von `bullet_list`/`ordered_list` im Dokumentbaum, ob oberste Ebene oder
als weiterer Block innerhalb eines `list_item`) bekommt eine **frische** `numId`
aus einer neuen `NumberingRegistry` (siehe 4.7), gebunden an denselben festen
`abstractNumId` (Format bleibt gemeinsam: `BULLET_ABSTRACT_ID=0`/
`ORDERED_ABSTRACT_ID=1`).

```ts
function blockToDocx(
  node: JsonNode,
  images: ImageCollector,
  rels: RelationshipRegistry,
  numbering: NumberingRegistry,     // neu
  listNumId: number | null = null,
): string {
  switch (node.type) {
    // ... paragraph/heading/table/image unverändert ...
    case 'bullet_list':
    case 'ordered_list': {
      const numId = numbering.allocate(node.type === 'ordered_list' ? 'ordered' : 'bullet')
      return (node.content ?? [])
        .flatMap((item) => (item.content ?? []).map((child) => blockToDocx(child, images, rels, numbering, numId)))
        .join('')
    }
    // ...
  }
}
```

`blocksToDocx`/`tableToDocx`/`writeDocx` erhalten `numbering` als zusätzlichen,
durchgereichten Parameter (**eine** Registry-Instanz pro `writeDocx`-Aufruf, geteilt
über Body/Header/Footer, damit `numId`-Werte dokumentweit eindeutig bleiben).
`numberingXml()` wird zu `numberingXml(numbering)` (siehe 4.7) und **nach**
Erzeugung von `bodyXml`/`headerXml`/`footerXml` aufgerufen (Reihenfolge in
`writeDocx`, Zeilen 222-264, bleibt dafür bereits korrekt — die Registry wird beim
Erzeugen der Body/Header/Footer-XML als Seiteneffekt befüllt, bevor
`numberingXmlContent = numberingXml(numbering)` aufgerufen wird).

**Wichtiger Nebeneffekt, der zu dokumentieren ist:** Diese Änderung löst **nicht**
das unter F11 dokumentierte Verschachtelungsproblem, ändert aber dessen sichtbares
Symptom leicht: Ein `list_item`, das intern (z. B. durch ODT-Import) eine
verschachtelte `bullet_list` als weiteren Block enthält, bekommt nach diesem Fix
eine **eigene** `numId` (statt der Eltern-`numId`). Beim Reimport werden Eltern-
und Kindebene dadurch als **zwei separate, benachbarte** `bullet_list`-Knoten
erkannt (nicht mehr als **eine** verschmolzene Liste). Die tatsächliche
Hierarchie (Kind gehört unter einen bestimmten Elternpunkt) bleibt weiterhin
verloren — das ist unverändert Sache von `liste-einruecken-tab` — aber der Inhalt
wird nicht mehr fälschlich in die Elternliste einsortiert. Muss mit einem
dedizierten Test dokumentiert werden (siehe 5.1, Test „nested list survives
export as two flat sibling lists, not merged").

**Kein Änderungsbedarf auf der ODT-Seite für das Äquivalent von F7:** `text:list`
ist in ODF ein eigenständiges, selbst-abgrenzendes XML-Element
(`odt/writer.ts:75-85`, `odt/reader.ts:179-187`) — zwei unmittelbar
aufeinanderfolgende `<text:list style-name="LB">`-Elemente bleiben beim Reimport
**strukturell** zwei separate Elemente und damit zwei separate `bullet_list`-
JSON-Knoten, unabhängig vom gemeinsam genutzten `style-name`. Das wurde geprüft
(Lesart von `elementToBlocks`, `odt/reader.ts:164-187`: jedes Kind von
`office:text` wird einzeln über `Array.from(bodyTextEl.children).flatMap(...)`
verarbeitet, `odt/reader.ts:234`) und ist **kein** Bug — nur mit einem
Regressionstest abzusichern (5.1), nicht zu ändern.

### 4.7 `src/formats/docx/styleDefs.ts`

Neue Klasse `NumberingRegistry`, `numberingXml()` erhält Parameter:

```ts
export const BULLET_ABSTRACT_ID = 0
export const ORDERED_ABSTRACT_ID = 1
// BULLET_NUM_ID / ORDERED_NUM_ID entfallen (nur noch von writer.ts importiert,
// grep bestätigt keine weiteren Nutzer im Projekt) — ersetzt durch dynamische
// Zuteilung über NumberingRegistry.

export class NumberingRegistry {
  private nums: Array<{ numId: number; abstractNumId: number }> = []
  private counter = 0

  allocate(kind: 'bullet' | 'ordered'): number {
    this.counter += 1
    this.nums.push({ numId: this.counter, abstractNumId: kind === 'bullet' ? BULLET_ABSTRACT_ID : ORDERED_ABSTRACT_ID })
    return this.counter
  }

  private serializeNums(): string {
    return this.nums.map((n) => `<w:num w:numId="${n.numId}"><w:abstractNumId w:val="${n.abstractNumId}"/></w:num>`).join('')
  }

  toXmlNumsFragment(): string {
    return this.serializeNums()
  }
}

export function numberingXml(registry: NumberingRegistry): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:numbering ${WORD_NAMESPACE_DECLARATIONS}>` +
    `<w:abstractNum w:abstractNumId="${BULLET_ABSTRACT_ID}"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl></w:abstractNum>` +
    `<w:abstractNum w:abstractNumId="${ORDERED_ABSTRACT_ID}"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>` +
    registry.toXmlNumsFragment() +
    `</w:numbering>`
  )
}
```

Falls in der Zwischenzeit **kein** einziger Listenblock im Dokument vorkommt,
bleibt `registry.toXmlNumsFragment()` leer — unschädlich (bestehende
`<w:abstractNum>`-Definitionen ohne referenzierende `<w:num>` sind gültiges,
funktionsloses OOXML).

### 4.8 `src/formats/odt/reader.ts`

**Fix F5 (Listenstil-Fallback):** `parseAutomaticStyles` (Zeilen 36-77) bleibt
strukturell erhalten, wird aber zusätzlich auf `office:styles` (gemeinsame
Formatvorlagen) anwendbar gemacht, und `readOdt` führt die Ergebnisse aus
**allen drei** möglichen Fundorten zusammen, bevor der Dokumentkörper geparst
wird:

```ts
// readOdt():
const stylesXmlText = await zip.file('styles.xml')?.async('text')
const stylesDoc = stylesXmlText ? parseXmlDocument(stylesXmlText) : null
const stylesCommonEl = stylesDoc?.getElementsByTagNameNS(ODF_NAMESPACES.office, 'styles')[0] ?? null
const stylesAutomaticEl = stylesDoc?.getElementsByTagNameNS(ODF_NAMESPACES.office, 'automatic-styles')[0] ?? null

const commonListKinds = parseAutomaticStyles(stylesCommonEl).listKinds       // NEU: office:styles wird jetzt auch auf text:list-style untersucht
const stylesAutoListKinds = parseAutomaticStyles(stylesAutomaticEl).listKinds
const contentStyles = parseAutomaticStyles(contentAutomaticStyles)

// Auflösungsreihenfolge: content.xml (lokalste/speziellste Definition) gewinnt,
// dann styles.xml/automatic-styles, dann styles.xml/office:styles (gemeinsame
// Vorlagen) als generischster Fallback — erst danach greift der 'bullet'-Fallback
// in elementToBlocks.
const mergedListKinds = new Map([...commonListKinds, ...stylesAutoListKinds, ...contentStyles.listKinds])
const bodyStyles: ParsedStyles = { ...contentStyles, listKinds: mergedListKinds }
const bodyBlocks = officeText ? await readOfficeTextChildren(officeText, bodyStyles, zip) : []
```

`parseAutomaticStyles` selbst braucht **keine** Signaturänderung — sie wird nur
zusätzlich mit dem `office:styles`-Element (statt nur `office:automatic-styles`)
aufgerufen; die interne Logik für `text:list-style` (Zeilen 69-74) ist bereits
elementagnostisch (iteriert `childElements(automaticStylesEl, text, 'list-style')`,
funktioniert identisch für ein `office:styles`-Element). Doku-Kommentar ergänzen,
dass die Funktion trotz ihres Namens generisch für jeden Style-Container
verwendbar ist (oder Funktion in `parseListAndTextStyles` umbenennen — Entscheidung
bei Umsetzung).

`elementToBlocks`s Fallback `|| 'bullet'` (Zeile 181) bleibt als **letzte**
Sicherheitsstufe erhalten (für Dateien, die den Stil wirklich nirgends
definieren — dann ist „bullet" weiterhin die dokumentierte, bewusste
Vereinfachung aus Anforderung Abschnitt 2.2).

**Fix F6 (`list_item` ohne führenden Absatz):** in der `text:list`-Verarbeitung
(Zeilen 179-187):

```ts
if (ns === ODF_NAMESPACES.text && local === 'list') {
  const styleName = el.getAttributeNS(ODF_NAMESPACES.style, 'style-name')
  const kind = (styleName && styles.listKinds.get(styleName)) || 'bullet'
  const items = childElements(el, ODF_NAMESPACES.text, 'list-item').map((itemEl) => {
    const content = Array.from(itemEl.children).flatMap((child) => elementToBlocks(child, styles, depth + 1))
    // Schema verlangt 'paragraph block*' — ein Listenpunkt ohne führenden
    // Absatz (reine Container-Unterliste, Grenzfall 3.7; oder ein text:p, das
    // nur ein Bild ohne Text enthält, Grenzfall 3.9) bekäme sonst eine
    // Schema-Validierungs-Exception bei nodeFromJSON. Normalisierung: leeren
    // Absatz voranstellen, kein Datenverlust (der eigentliche Inhalt bleibt
    // als nachfolgender Block erhalten).
    const normalized = content[0]?.type === 'paragraph' ? content : [{ type: 'paragraph', attrs: { align: 'left' }, content: [] }, ...content]
    return { type: 'list_item', content: normalized }
  })
  return [{ type: kind === 'ordered' ? 'ordered_list' : 'bullet_list', content: items }]
}
```

Test: gezielt mit `listLevel10.odt`/`EasyList.odt`/`EasyListForeignNamespace.odt`
(Grenzfall 3.7-Kandidaten laut Anforderung) sowie `imageWithinList.odt`
(Grenzfall 3.9) — Erwartung: Import wirft **keine** Exception, und der ursprünglich
führende Nicht-Paragraph-Inhalt bleibt als zusätzlicher Block im `list_item`
erhalten (siehe 5.1).

### 4.9 `src/formats/odt/styleRegistry.ts` — keine Änderung

`BULLET_LIST_STYLE_NAME`/`ORDERED_LIST_STYLE_NAME` (Zeilen 95-96) und
`listStyleDefs()` (Zeilen 98-102) bleiben unverändert — die Begründung aus 4.6
(ODT braucht keine Pro-Listen-Instanz-ID, weil `<text:list>` bereits
selbst-abgrenzend ist) gilt hier symmetrisch. Zusätzliche Ebenen-Definitionen
(`text:level="2"` ff.) sind Gegenstand von `liste-einruecken-tab` (Abschnitt 6),
nicht dieses Plans.

### 4.10 `src/formats/odt/writer.ts` — keine Änderung

Bestätigt in Abschnitt 1a.5/4.6: generische Rekursion in `blockToOdt` (Zeilen
75-85) schreibt bereits heute strukturell korrektes, verschachteltes
`<text:list>`-Markup, falls ein `bullet_list`/`ordered_list`-Knoten als weiterer
Block in einem `list_item.content` vorkommt (z. B. durch ODT-Reimport eines
bereits mehrstufigen Fremddokuments). Keine Änderung für dieses Feature
erforderlich; volle Ebenen-Formatierung bleibt `liste-einruecken-tab` vorbehalten.

### 4.11 `src/index.css` — keine Änderung

`.ProseMirror ul, .ProseMirror ol` (Zeilen 63-67, eine gemeinsame, ebenen-
unabhängige Regel) genügt für einstufige Listen. Ebenenabhängige Darstellung ist
Gegenstand von `liste-einruecken-tab`/`mehrstufige-liste`.

---

## 5. Tests

### 5.1 Unit-Tests (Vitest)

**`src/formats/docx/__tests__/roundtrip.test.ts`** (Ergänzungen zum bestehenden
Describe-Block „DOCX round trip: lists", Zeilen 135-171):
1. Echtes Toggle: Liste erzeugen → `toggleList(false)` erneut auf denselben
   Cursor anwenden → Ergebnis ist ein normaler Absatz, kein verschachtelter
   `bullet_list`-Knoten (deckt F1/Grenzfall 3.2 auf Command-Ebene ab, zusätzlich
   zum E2E-Test in 5.2).
2. Typwechsel ohne Verschachtelung: `ordered_list` erzeugen, `toggleList(false)`
   darauf anwenden → Ergebnis ist `bullet_list` mit identischem Text/Reihenfolge,
   **kein** `list_item`, dessen Kind wiederum eine Liste ist (deckt Anforderung
   2.6 ab).
3. **Neu, deckt F7:** „zwei unmittelbar aufeinanderfolgende Bullet-Listen ohne
   trennenden Absatz bleiben nach Reimport zwei separate Listen" — Regressionstest
   für Grenzfall 3.12; muss **vor** Fix F7 rot sein (zur Verifikation, dass der
   Test den Bug tatsächlich greift), danach grün.
4. **Neu, deckt F7-Nebeneffekt:** verschachtelter `bullet_list`-Knoten (synthetisch
   im Testdatum, wie er per ODT-Import entstehen könnte) → Export → Reimport →
   Ergebnis sind zwei **benachbarte, flache** `bullet_list`-Knoten (nicht eine
   verschmolzene Liste) — dokumentiert das in 4.6 beschriebene neue Verhalten.
5. **Neu, deckt F8:** synthetisches `numbering.xml` mit `<w:lvl>`-Elementen in
   vertauschter Reihenfolge (Ebene 1 vor Ebene 0) → `parseNumberingXml` erkennt
   trotzdem korrekt Bullet vs. Ordered anhand von Ebene 0.
6. **Neu, dokumentiert F15:** `<w:p>` mit `w:numPr` und einer Bild-Drawing-Run
   ohne Textlauf → Import wirft nicht, Bild landet außerhalb der `bullet_list`
   (heutiges, dokumentiertes Verhalten) — Test hält das aktuelle Verhalten fest,
   markiert es per Kommentar explizit als bekannte Einschränkung (kein
   TODO-Fix in diesem Plan).

**`src/formats/odt/__tests__/roundtrip.test.ts`** (Ergänzungen zum bestehenden
Describe-Block „ODT round trip: lists", Zeilen 135-160):
1. Analog zu DOCX Punkt 1/2 (echtes Toggle, Typwechsel ohne Verschachtelung).
2. **Neu, schließt die in Verdacht 10 benannte Lücke:** „zwei getrennte
   Aufzählungslisten mit trennendem Absatz bleiben getrennt" — ODT-Äquivalent zum
   bereits vorhandenen DOCX-Test (Zeile 161-170 dort).
3. **Neu:** „zwei unmittelbar aufeinanderfolgende Listen **ohne** trennenden
   Absatz bleiben ebenfalls getrennt" — bestätigt die in 4.6 dargelegte
   Begründung „kein Fix nötig" mit einem tatsächlichen Test statt nur Argumentation
   (von der Anforderung Abschnitt 4.3 ausdrücklich verlangt: „muss durch einen
   tatsächlichen Rundreise-Test … bestätigt werden, nicht nur … angenommen").
4. **Neu, deckt F5:** Konstruiertes ODT-Testdatum, bei dem `content.xml` einen
   `text:list` referenziert, dessen `text:list-style` **nur** in `styles.xml`
   (`office:styles`, nicht `office:automatic-styles`) definiert ist, mit
   `text:list-level-style-number` (also eine **nummerierte** Liste) → muss nach
   Fix **nicht** fälschlich als `bullet_list` importiert werden. Muss **vor** Fix
   F5 rot sein.
5. **Neu, deckt F6:** `text:list-item` ohne führenden `text:p`, direkt mit
   verschachteltem `text:list` als einzigem Kind → Import wirft nicht, resultierender
   `list_item.content` beginnt mit einem (ggf. leeren) `paragraph`-Knoten,
   gefolgt vom ursprünglichen `bullet_list`/`ordered_list`-Inhalt.

**`src/formats/odt/__tests__/external-fixtures.test.ts` und
`src/formats/docx/__tests__/external-fixtures.test.ts`** (F9, löst Verdacht 10):
Ergänzung um **strukturelle** Prüfungen für die in Anforderung Abschnitt 4.2
gelisteten Fixtures, nicht nur „stürzt nicht ab". Konkret pro Datei mindestens:
Anzahl gefundener `bullet_list`/`ordered_list`-Knoten > 0 (wo laut Fixture-Name zu
erwarten), Gesamtzahl der `list_item`-Textinhalte bleibt bei
Export→Reimport identisch. Priorisierte Dateien (aus Anforderung Abschnitt 4.2 und
Neufund 1a.3):
- ODT: `bulletListTest.odt`, `bullet_list.odt`, `simple_bullet_list.odt`,
  `simple_bullet_list_1_pre_OX.odt`, `feature_bullets_numbering.odt`,
  `ST_Bullets_Numbering.odt`, `ST_Bullets_Numbering2.odt` — einstufige Kernfälle.
- ODT: `EasyList.odt`, `EasyListForeignNamespace.odt`,
  `EasyListForeignNamespaceMSO15_AOO.odt`, `listLevel10.odt` — Import darf nach
  Fix F6 nicht mehr crashen (falls sie das Muster aus Grenzfall 3.7 enthalten;
  falls nicht, Test dokumentiert das Nichtvorkommen explizit statt es
  stillschweigend zu übergehen).
- ODT: `listsInTable.odt`, `simple-table-with-lists.odt` — Liste in Tabellenzelle
  bleibt bei Rundreise strukturell erhalten.
- ODT: `imageWithinList.odt` — nach Fix F6 kein Crash, Bild bleibt als Block im
  `list_item` erhalten.
- ODT: `listStyleId.odt`, `ListStyleResolution.odt` — nach Fix F5 korrekte
  Bullet/Ordered-Unterscheidung, nicht mehr pauschal „bullet".
- ODT: `brokenList.odt`, `ListOddity.odt` — weiterhin definierter Fallback statt
  Crash (bereits abgedeckt durch die generische „importiert ohne Absturz"-Prüfung;
  hier zusätzlich: falls Listenstruktur erkennbar, wird sie geprüft, sonst wird
  das Fehlen dokumentiert statt stillschweigend ignoriert — deckt den in
  Grenzfall 3.16 offen gelassenen Prüfpunkt).
- ODT: `ListRoundtrip.odt` — expliziter Rundreisetest.
- ODT restliche Basis-Fixtures (`list.odt`, `liste2.odt`, `preparedList.odt`,
  `simpleList.odt`, `simpleList3.odt`, `ListHeading.odt`, `ListHeading2.odt`,
  `simple-list_MSO14.odt`, `ListTest_AO_MSO15-where_is-blue.odt`, `indentTest.odt`)
  — mindestens Textinhalt jedes Listenpunkts bleibt bei Rundreise erhalten.
- DOCX: `Numbering.docx`, `NumberingWOverrides.docx`,
  `NumberingWithOutOfOrderId.docx` — jeweils prüfen, dass die enthaltenen
  Bullet-Ebenen (bestätigt in Neufund 1a.3) nach Rundreise weiterhin als
  `bullet_list` erkennbar sind. `ComplexNumberedLists.docx` **nicht** in die
  Bullet-Suite aufnehmen (enthält kein Bullet-Format, siehe Neufund 1a.3) —
  gehört zu `nummerierte-liste-req.md`.

### 5.2 Neu: `tests/e2e/lists.spec.ts` (löst F10/Verdacht 11 vollständig neu)

Folgt den bestehenden Konventionen aus `tests/e2e/docx.spec.ts`/`odt.spec.ts`/
`selection-regression.spec.ts` (`docxCard`/`odtCard`-Locator-Helfer lokal
dupliziert wie in den bestehenden Dateien, `page.getByTitle(...)`-Selektoren,
`page.waitForEvent('download')` + `JSZip` für Export-Prüfung). Deckt **beide**
Formate über echten Datei-Upload/-Download ab, nicht nur interne Reader/Writer-
Aufrufe. Mindestens folgende Fälle (Nummerierung folgt Anforderung Abschnitt 6):

1. Liste erstellen per Cursor ohne Selektion, und per Selektion über mehrere
   Absätze — echter Klick auf „• Liste".
2. Enter-Verhalten: nicht-leerer Punkt (neuer Punkt), leerer Punkt (beendet
   Liste), Cursor mittig im Text (Split ohne Textverlust), Umschalt+Enter
   (Zeilenumbruch, kein neuer Punkt) — erstmaliger echter Browser-Nachweis für
   `splitListItem`-Verhalten in dieser App (Anforderung 2.3 verlangt das
   ausdrücklich, „nicht nur unter Berufung auf Bibliotheksdokumentation").
3. Erneuter Klick auf „• Liste" bei bereits aktiver Liste: einmal am ersten
   Punkt, einmal an einem späteren Punkt, einmal bei Selektion der gesamten
   Liste (Ctrl+A) → jeweils Ergebnis nach Fix F1 prüfen: alle drei Fälle wandeln
   die betroffenen Punkte zu Absätzen zurück (deterministisches Toggle, siehe
   Abschnitt 3/4.2), kein stiller No-Op, keine Verschachtelung mehr.
4. Wechsel Aufzählung ↔ Nummerierung ohne Verschachtelung/Datenverlust
   (Anforderung 2.6).
5. „Liste aufheben": Text bleibt vollständig erhalten; zusätzlich `disabled`-
   Zustand prüfen, wenn Cursor **nicht** in einer Liste steht (Grenzfall 3.10).
6. **Dokumentationstest für F12 (bewusst kein Fix hier, siehe Abschnitt 6):**
   Cursor in einem Listenpunkt, `Tab` drücken → Assertion, dass sich die
   Dokumentstruktur **nicht** ändert (kein Sink passiert) — hält den heutigen
   Funktionsumfang explizit als offene Lücke fest, statt sie stillschweigend zu
   überspringen (erfüllt Anforderung Abschnitt 6, Testfall 6, wörtlich: „falls
   nicht gebaut: expliziter Test, der das aktuelle Fehlen nachweist"). Zusätzlich
   protokollieren, ob der Fokus den Editor verlässt (bekanntes,
   dokumentiertes Risiko, siehe Abschnitt 6).
7. Zusammenspiel: Zeichenformatierung (Fett/Kursiv/Farbe) in einem Listenpunkt,
   Absatzausrichtung eines einzelnen Punkts, Liste in einer Tabellenzelle
   (`insertTable` + Klick in Zelle + „• Liste"), Undo/Redo über eine gemischte
   Sequenz inkl. Toolbar-Klick + Klick-Neupositionierung (Muster aus
   `selection-regression.spec.ts` wiederverwenden/erweitern, diesmal mit
   Listen-Aktionen statt nur Fett).
8. `aria-pressed`: Cursor in eine Aufzählungsliste bewegen und wieder heraus →
   sichtbarer Zustandswechsel des „• Liste"-Buttons.
9. Tastatur-Bedienbarkeit: Button per `Tab`-Taste fokussieren (nicht klicken),
   `Enter` bzw. `Leertaste` drücken → Aktion wird ausgeführt (Nachweis für F4,
   Anforderung Abschnitt 1 Zeile 8 — bisher nicht verifiziert).
10. Grenzfall 3.5 (Selektion über eine Überschrift hinweg): Button-Zustand ist
    `disabled`, kein Klickeffekt.
11. Rundreise über echten Upload/Export für mindestens: einfache Bullet-Liste (3
    Punkte), zwei getrennte Listen (mit und ohne Trennabsatz), Liste mit
    Zeichenformatierung, Liste in Tabellenzelle, Cross-Format (Editor-Liste als
    ODT exportieren → reimportieren → als DOCX exportieren → reimportieren).
12. Import einer echten Fixture-Datei je Format (z. B. `bulletListTest.odt`,
    `ST_Bullets_Numbering.odt`, `Numbering.docx`) über echten Datei-Upload →
    unverändert exportieren → Downloaddatei mit unabhängigem `JSZip`-Parsing
    prüfen (Punktzahl/Text/Typ), analog zum bestehenden Muster in `docx.spec.ts`
    Zeilen 99-125.

### 5.3 Optionale Testinfrastruktur-Verbesserung (nicht blockierend)

`docxCard`/`odtCard`-Locator-Funktionen sind aktuell in drei Dateien
(`docx.spec.ts`, `odt.spec.ts`, `selection-regression.spec.ts`) einzeln
dupliziert. Mit `lists.spec.ts` käme eine vierte Kopie hinzu. Empfehlung:
Extraktion nach `tests/e2e/helpers.ts` bei Gelegenheit — nicht Teil dieses Plans,
da es die bestehende Konvention der anderen Dateien nicht bricht, wenn hier
zunächst ebenfalls lokal dupliziert wird.

---

## 6. Bewusste Nicht-Umsetzung: Tab/Umschalt+Tab (F11/F12) — Begründung und Übergabe

`aufzaehlungsliste-req.md` fordert in Abschnitt 1 (Zeile 5) und Abschnitt 2.4
äußerlich, dass Tab/Umschalt+Tab „ergänzt werden muss". Dieser Plan implementiert
das **bewusst nicht**, aus folgenden Gründen:

1. `specs/liste-einruecken-tab-req.md` ist eine eigenständige, bereits existierende
   Anforderungsdatei, die **exakt** dieselbe Funktion mit erheblich größerem
   Detailgrad spezifiziert: eigene Rundreise-Matrix für bis zu 9 Ebenen
   (Abschnitt 5 dort), 18 Grenzfälle, explizite Vorgaben für
   `numberingXml()`-Erweiterung um `w:lvl`-Einträge für Ebene 1-8
   (`styleDefs.ts:37-46`, dort Grenzfall 9) und ODT-Ebenen-Stildefinitionen
   (`styleRegistry.ts:95-102`, dort Grenzfall 10). Eine parallele,
   unabgestimmte Zweitimplementierung in diesem Plan würde entweder
   duplizieren oder mit der dortigen, autoritativen Spezifikation kollidieren.
2. Eine **isolierte** Tab-Tastenbindung ohne die dort geforderte DOCX-/ODT-
   Rundreise-Korrektur wäre selbst ein neuer, stiller Fehlschlag: Sie würde im
   Editor sichtbar funktionieren, aber bei jedem DOCX-Export (F11, bestätigt in
   Abschnitt 1) sofort wieder stillschweigend flachgelegt — das widerspricht dem
   in Anforderung Abschnitt 20 der Hauptspezifikation verankerten Grundsatz, den
   `aufzaehlungsliste-req.md` selbst zitiert. Es ist daher **kein** akzeptabler
   Teilschritt, dieses Plans wegen des höheren Aufwands nur die Tastenbindung
   ohne die Exportkorrektur zu liefern.
3. `aufzaehlungsliste-req.md` selbst erlaubt diesen Umgang explizit: Abschnitt 6,
   Testfall 6, wörtlich „(Funktion muss ggf. erst gebaut werden … falls nicht
   gebaut: expliziter Test, der das aktuelle Fehlen nachweist und im
   Ergebnisbericht als offene Lücke markiert, statt stillschweigend übersprungen
   zu werden)" — genau dieser Dokumentationstest ist in 5.2 Punkt 6 enthalten.

**Übergabe an `specs/liste-einruecken-tab-code.md` (noch nicht geschrieben):**
Dessen Umsetzung muss, sobald sie erfolgt, mit den Änderungen aus diesem Plan
kompatibel sein — insbesondere mit der in 4.6/4.7 eingeführten
`NumberingRegistry` (jede Listeninstanz hat bereits eine eigene `numId`; die
Ebenen-Erweiterung müsste zusätzlich pro `numId` mehrere `w:lvl`-Einträge
(0-8) im referenzierten `abstractNum` vorsehen, nicht die `NumberingRegistry`
selbst ersetzen) sowie mit der in 4.2 eingeführten Toggle-Logik (`toggleList`
muss weiterhin funktionieren, wenn `list_item`-Knoten künftig echte
Unterlisten enthalten können — die `ancestorListRange`-Suche über
`blockRange` mit Prädikat funktioniert bereits korrekt für beliebige
Verschachtelungstiefe, siehe Begründung in 4.2, kein Nacharbeiten nötig).

Ebenso **bewusst nicht Gegenstand dieses Plans:** die im Detail in
`liste-aufheben-req.md` behandelte mehrstufige Lift-Semantik des „⇧ Liste"-
Buttons (dort eigene Anforderung) — dieser Plan liefert dafür nur den unter F3
beschriebenen `disabled`-Zustand (Abschnitt 4.3), keine tiefere Semantikänderung.

---

## 7. Bewusst nicht umgesetzte Punkte (zu dokumentieren, Backlog-Status)

Folgende Punkte aus der Anforderung werden **nicht** gebaut und sollen im
Backlog (`specs/FEATURE-BACKLOG.md`) explizit als bewusste Einschränkung markiert
werden (kein stiller Fehlschlag, da schriftlich festgehalten):

- **Eigenes Aufzählungszeichen wählbar** (Backlog `eigene-aufzaehlungszeichen`,
  Priorität 4/nice-to-have laut Anforderung Abschnitt 1 Zeile 6). Kein
  Schema-Attribut, kein UI-Element.
- **Unterschiedliches Symbol je Verschachtelungsebene.** Gehört inhaltlich zu
  `mehrstufige-liste` (Priorität 2, separater Slug) bzw. `liste-einruecken-tab`.
- **Automatische Umwandlung durch Tippen** (InputRules für „- "/„* " am
  Zeilenanfang). Im gesamten Projekt existieren aktuell keine ProseMirror-
  `InputRule`s (verifiziert per Grep); Einführung dieser Infrastruktur nur für
  dieses eine Feature wäre unverhältnismäßig — als Nice-to-have dokumentiert,
  nicht gebaut.
- **Kontextmenü-Eintrag „Aufzählung".** Kein Kontextmenü im Projekt vorhanden
  (projektweite Lücke, nicht feature-spezifisch).
- **DOCX: Bild-einziger Listenpunkt wird beim Import aus der Liste
  „ausgestoßen"** (Neufund 1a.4). Dokumentiert, nicht behoben (kein
  DOCX-Fixture mit exakt diesem Muster im Korpus bekannt; ODT-Äquivalent über
  Fix F6 behoben, da dort real durch `imageWithinList.odt` belegt).

---

## 8. Phasenplan

1. **Phase A (Commands/Toolbar, kein Format-Code):** 4.2 (`commands.ts`), 4.3
   (`Toolbar.tsx`) — inkl. Unit-Tests für `toggleList`/`isListActive` (isoliert,
   ohne DOCX/ODT-Abhängigkeit testbar). Kleinster, risikoärmster Schritt zuerst,
   da er F1-F4 (die höchste-Priorität-Verdachtsmomente laut Anforderung
   Abschnitt 5 Punkt 7) unabhängig von den Format-Readern behebt.
2. **Phase B (ODT-Reader-Robustheit):** 4.8 (F5 + F6) — mit den in 5.1 genannten
   gezielten Unit-Tests, danach Struktur-Erweiterung der bestehenden
   `external-fixtures.test.ts` (5.1) für die ODT-Fixtures aus Anforderung
   Abschnitt 4.2.
3. **Phase C (DOCX-Writer/Reader-Robustheit):** 4.5 (F8), 4.6+4.7 (F7,
   `NumberingRegistry`) — mit den Roundtrip-Tests aus 5.1, insbesondere dem
   Regressionstest für Grenzfall 3.12, der vor dem Fix nachweislich rot sein
   muss.
4. **Phase D (E2E-Grundlage):** 5.2 (`tests/e2e/lists.spec.ts`), da diese Tests
   von den Ergebnissen aus Phase A-C abhängen (aktiver/`disabled`-Zustand,
   echtes Toggle, ODT/DOCX-Fixture-Rundreisen).
5. **Phase E (Dokumentation):** Backlog-Status-Anmerkungen gemäß Abschnitt 7
   dieses Plans, Übergabe-Notiz an `liste-einruecken-tab-code.md`/
   `liste-aufheben-code.md` gemäß Abschnitt 6, sobald diese existieren.

---

## 9. Offene Entscheidungen zur Freigabe vor Umsetzungsbeginn

1. Soll die in 4.2 als „Empfehlung" markierte Partial-Wrap-Logik für Grenzfall 3.5
   (Selektion über Überschrift + Absätze) bereits in Phase A mitgebaut werden,
   oder reicht der `disabled`-Zustand für die erste Abnahme? (Plan empfiehlt:
   zunächst nur `disabled`, Partial-Wrap als Folge-Ticket.)
2. Soll `parseAutomaticStyles` umbenannt werden (z. B. zu
   `parseListAndTextStyles`), da sie nach Fix F5 nicht mehr ausschließlich auf
   `office:automatic-styles`-Elemente angewendet wird? (Kosmetisch, keine
   Verhaltensänderung.)
3. Bestätigung, dass die in 4.6 beschriebene Nebenwirkung der
   `NumberingRegistry` (verschachtelte Listen werden nach Export/Reimport zu
   zwei benachbarten flachen Listen statt einer verschmolzenen Liste) als
   **Verbesserung** und nicht als neues, unerwünschtes Verhalten akzeptiert
   wird — betrifft ausschließlich den bereits als bekannte Einschränkung
   dokumentierten F11-Fall (Verschachtelung generell flachgelegt bis
   `liste-einruecken-tab` das behebt).
