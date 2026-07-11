# Umsetzungsplan: Feature „Nummerierte Liste"

Bezug: `specs/nummerierte-liste-req.md` (verbindliche Anforderung). Dieses Dokument ist
der dateigenaue Umsetzungsplan gegen den **tatsächlichen** Code-Stand (Repo `E:\docs`,
Stand dieser Prüfung). Alle „Ist-Stand"-Aussagen unten wurden durch direktes Lesen der
genannten Dateien **an den genannten Zeilen** verifiziert.

Geschwister-Dokumente mit überlappendem Code (selbe Dateien, andere Blickrichtung):
`specs/aufzaehlungsliste-req.md`, `specs/liste-aufheben-req.md`,
`specs/liste-einruecken-tab-req.md`. Der Backlog kennt zusätzlich den Slug
`nummerierung-fortsetzen-neustarten` (Status „teilweise", P3) ohne eigene
Anforderungsdatei — da `nummerierte-liste-req.md` Abschnitt 2.5 / 4.1.6 dieses Verhalten
selbst fordert, deckt dieser Plan es mit ab. Wo eine Änderung zugleich eine Anforderung
eines Geschwister-Dokuments erfüllt, ist das vermerkt; es ersetzt aber nicht deren eigene
Abnahmekriterien.

---

## 0. Zusammenfassung der Prüfung — und Korrektur der Vorfassung dieses Plans

**Wichtig:** Die vorige Fassung dieses Umsetzungsplans war gegen einen **älteren**
Code-Stand geschrieben und ist an mehreren zentralen Stellen **sachlich falsch**. Die
Anforderungsdatei (`nummerierte-liste-req.md`, insbesondere die dortige „Korrektur"-Box
Zeilen 35–52) beschreibt den heutigen Code **korrekt**; wo Vorfassungsplan und Anforderung
sich widersprachen, hat die direkte Code-Sichtung die **Anforderung** bestätigt. Konkret
richtiggestellt:

| Vorfassung dieses Plans behauptete | Tatsächlicher Code (verifiziert) |
|---|---|
| `list_item` sei `content: 'paragraph block*'`, daraus folge ein Schema-Exception-Risiko bei Item ohne führenden Absatz (Vorfassung §1.1/§1.6 Pkt 7/§2.6/§2.8/§6 Pkt 5) | `list_item.content = 'block+'` (`schema.ts:146-152`, mit ausdrücklichem Kommentar). Ein Item, dessen erstes Kind eine Unterliste oder ein Bild ist, ist **schema-gültig** — das Exception-Risiko und die dagegen geplante „führender-Absatz"-Absicherung sind **gegenstandslos** (deckt sich mit Anforderung Grenzfall 3.20). |
| DOCX-Reader lese nur `w:numId`, nicht `w:ilvl`; `groupLists` erzeuge eine **flache** Liste | `listMarkerFor` liest **beide** (`reader.ts:294-302`); `groupLists` ist eine **voll stack-basierte Verschachtelungs-Rekonstruktion** (`reader.ts:379-440`). Mehrstufiger **Import** funktioniert bereits. |
| DOCX-Writer schreibe hart `w:ilvl=0` und lege Verschachtelung flach | Writer nutzt `ListContext { numId, level }` (`writer.ts:96-99`) und schreibt je Tiefe wachsendes `w:ilvl` (`writer.ts:105-140`, `MAX_LIST_ILVL=8`). Mehrstufiger **Export** funktioniert bereits. |
| `numberingXml()` definiere nur **eine** Ebene je Typ | Es sind **9 Ebenen** je Typ definiert, mit zyklischem Format (`styleDefs.ts:43-74`). |
| `Shift-Enter` sei nirgends gebunden | `Shift-Enter` ist an `insertHardBreak()` gebunden (`WordEditor.tsx:97`). |

Sämtliche Zeilennummern der Vorfassung (Schema, Toolbar, Keymap, Tests) waren zusätzlich
um 40–120 Zeilen verschoben. Dieser Plan verwendet durchweg die **heute gültigen**
Fundstellen. **Nachtrag dieser Prüfung:** Auch die *vorige* Fassung *dieses* Plans trug
die `WordEditor.tsx`-Keymap noch mit veralteten Zeilen (Z. 77–99 statt heute Z. 85–107;
`Enter` Z. 88 statt Z. 96; `Shift-Enter` Z. 89 statt Z. 97; `keymap(baseKeymap)` Z. 100
statt Z. 108; Plugin-Liste Z. 75–106 statt Z. 83–114). Der Symbolname bleibt maßgeblich;
die Fundstellen unten sind auf den aktuellen Stand korrigiert und decken sich jetzt mit
`nummerierte-liste-req.md` (das `WordEditor.tsx:96`/`:97` korrekt nennt).

**Was nach der Prüfung tatsächlich noch offen ist** (das ist der eigentliche Arbeitsumfang
dieses Features — nicht der Bau der bereits vorhandenen Verschachtelungsmaschinerie):

1. **Kernbedienung:** `toggleList` ist kein echtes Toggle (nur `wrapInList`); erneuter
   Klick auf „1. Liste" in einer aktiven Liste ist No-Op oder erzeugt ungewollte
   Verschachtelung (Anforderung 2.7). Kein aktiver Button-Zustand, keine `isListActive`.
   Kein Tab/Shift-Tab → im Editor lässt sich **keine** mehrstufige Liste erzeugen (nur per
   Import).
2. **DOCX-Datenverlust:** Nummerierte/Aufzählungs-Liste **in einer Tabellenzelle** geht
   beim **Import** komplett verloren (`reader.ts:337-339` umgeht `listMarkerFor`/
   `groupLists`). Export funktioniert — reine Import-Asymmetrie.
3. **Startwert (`ordered_list.attrs.start`) überlebt keine Rundreise:** Writer liest ihn
   nicht, `numbering.xml` schreibt kein `w:start`/`w:startOverride`, Reader setzt ihn nie.
4. **Getrennte benachbarte Listen verschmelzen (DOCX):** feste globale `ORDERED_NUM_ID=2`
   (`styleDefs.ts:35`) → zwei ohne Trennabsatz benachbarte Listen bekommen identische
   `w:numId`/`w:ilvl` und verschmelzen beim Reimport (Grenzfall 3.5).
5. **Fortsetzen/Neustart** existiert nirgends (kein Datenmodell-Attribut, kein
   `w:startOverride`/`text:continue-numbering`).
6. **ODT-Import:** `styles.xml`-Listenstile werden für den Textkörper nie aufgelöst
   (nummerierte Liste wird zur Aufzählung degradiert, Grenzfall 3.17); `<text:list-header>`
   wird ignoriert → Textverlust (Grenzfall 3.18); Startwert/Continue werden nicht gelesen.
7. **ODT-Export:** nur Ebene 1 formal definiert (`styleRegistry.ts:98-103`); ein
   fixer Stilname je Typ; kein `text:start-value`/`text:continue-numbering`.
8. **Fehlende Formatunterscheidung je Ebene im Editor-Rendering** (CSS, `index.css:63-65`
   hat nur `padding-left`, kein ebenenabhängiges `list-style-type`).
9. **Testabdeckung:** kein Ordered-Mehrebenen-, Startwert-, Fortsetzen-, Adjazenz-ohne-
   Trenner-, Tabellenzellen-Test; die realen Fixtures aus Anforderung 4.2 werden nur auf
   „stürzt nicht ab" geprüft, nicht inhaltlich; kein Listen-E2E.

**Nachtrag dieser Prüfrunde (kritische Zweitsichtung, 2026-07-05):** Sämtliche oben und
unten zitierten Fundstellen (`schema.ts`, `commands.ts`, `Toolbar.tsx`, `WordEditor.tsx`,
`index.css`, `docx/reader.ts`, `docx/writer.ts`, `docx/styleDefs.ts`, `odt/reader.ts`,
`odt/writer.ts`, `odt/styleRegistry.ts`, beide `roundtrip.test.ts`, beide
`external-fixtures.test.ts`, `tests/e2e/roundtrip-fidelity.spec.ts`, `pagination.ts`, alle
Fixture-Pfade aus Anforderung 4.2) wurden erneut einzeln nachvollzogen — **jede** erwies
sich als weiterhin zutreffend, keine Zeilenangabe musste korrigiert werden. Zwei
inhaltliche Korrekturen ergaben sich trotzdem:

1. **`pagination.ts` ist **kein** Beleg für ein „appendTransaction-Muster".** §2.4 verwies
   für den Endlosschleifen-Guard des neuen `listNumbering`-Plugins auf „Muster wie
   `pagination.ts`". Tatsächlich ist `createPaginationPlugin()` (`pagination.ts:72-105`)
   ein reines **View-Plugin** (`view(view) { … update: () => requestAnimationFrame(recompute)
   … }`), das über `sameDecorationSet` nur *dispatcht*, wenn sich etwas geändert hat — es
   nutzt **kein** `appendTransaction`. Ein projektweiter Grep bestätigt: **kein** Plugin im
   gesamten `src/` verwendet `appendTransaction`; es gibt dafür keine Vorlage im Code. Das
   `listNumbering`-Plugin (§2.4) ist damit der **erste** `appendTransaction`-Konsument der
   Codebasis — die allgemeine Idee „nur bei tatsächlicher Änderung dispatchen" bleibt
   richtig und ist an `pagination.ts` illustriert, aber die Formulierung unten ist präzisiert,
   damit niemand `pagination.ts` als strukturelle Blaupause kopiert.
2. **Gemischt-typige Verschachtelung (Bullet-in-Ordered / Ordered-in-Bullet) — bereits
   andernorts analysiert und mit einer konkreten Empfehlung samt Testerwartung hinterlegt,
   hier aber bislang unabhängig als „zu bestätigen" formuliert, statt darauf zu verweisen.**
   §6 Punkt 2 (Vorfassung) und §2.5 unten öffnen dieses Thema, als wäre es eine für dieses
   Dokument **eigenständig** zu treffende Design-Entscheidung. Tatsächlich hat
   `liste-einruecken-tab-code.md` Abschnitt 5A dieselbe Frage bereits im Detail hergeleitet
   und **„Option B" empfohlen** (DOCX-Rundreise gemischt-typiger Ebenen verliert bewusst den
   Ebenen-Typ der Unterebene — nur Tiefe + Typ der obersten Ebene bleiben —, während ODT Typ
   **und** Tiefe bereits korrekt erhält, weil `blockToOdt` den Stilnamen je **Knotentyp**
   wählt, `odt/writer.ts:99-109`: `node.type === 'ordered_list' ? ORDERED_LIST_STYLE_NAME :
   BULLET_LIST_STYLE_NAME`, unabhängig von der Tiefe). Diese Empfehlung ist dort **noch
   nicht final** — jenes Dokument selbst listet „DOCX-Gemischt-Entscheidung mit PO/Lead
   klären" ausdrücklich als offenen Punkt vor Umsetzung (`liste-einruecken-tab-code.md`,
   Abschnitt „vor Umsetzung zu klärende Punkte", Punkt 2; die Alternative „Option A" dort
   explizit als „Lead/PO-Beschluss" markiert, also noch nicht getroffen). Da diese
   `NumberingRegistry` (§2.5) **autoritativ** für **beide** Geschwisterdokumente ist
   (`aufzaehlungsliste-code.md` referenziert sie ausdrücklich, statt sie erneut zu bauen),
   darf **dieser** Plan die Frage nicht ein drittes Mal unabhängig aufwerfen — §2.5/§6 unten
   übernehmen „Option B" als die Annahme, unter der die `NumberingRegistry` entworfen ist,
   und bündeln die **eine** noch ausstehende PO/Lead-Bestätigung (die für beide Dokumente
   gilt) an einer Stelle, statt sie zweimal unabhängig offenzuhalten. Zusätzlich wird ein
   bislang in **keinem** der drei Geschwisterdokumente benannter dritter Erzeugungsweg für
   eine gemischt-typige Kette dokumentiert (siehe §2.5): das **echte Toggle** aus §2.1
   dieses Dokuments selbst.

Aufbau: §1 Befunde je Codebereich (mit heutigen Fundstellen), §2 Zielentwurf, §3
dateigenauer Änderungsplan, §4 Testplan, §5 Umsetzungsreihenfolge (schwerste/Kern-Arbeit
zuerst), §6 vor Umsetzung zu bestätigende Entscheidungen.

---

## 1. Befunde je Codebereich (heutige Fundstellen)

Legende: **[OK]** = bereits vorhanden/funktioniert, nicht neu bauen; **[LÜCKE]** = echter
Handlungsbedarf.

### 1.1 Schema (`src/formats/shared/schema.ts`)

- **[OK]** `list_item` (Z. 146–152): `content: 'block+'` — bewusst nicht `paragraph
  block*` (ausführlicher Kommentar Z. 139–145). Ein Item mit Unterliste oder Bild als
  erstem Kind ist gültig; die Vorfassungs-Sorge um eine Schema-Exception entfällt. Für
  Tab/Shift-Tab ist **keine** Schemaänderung nötig.
- **[OK]** `ordered_list` (Z. 124–137): hat `attrs.start` (Default 1, Z. 127), parst
  `<ol start=…>` (Z. 128–132) und rendert es (Z. 135). `bullet_list` (Z. 115–122) ohne
  Attribute.
- **[LÜCKE]** Es gibt **kein** Attribut für Fortsetzen/Neustart. Für 2.5 wird
  `ordered_list.attrs.numberingMode` ergänzt (§2.4). Verschachtelungstiefe/Zugehörigkeit
  bleibt rein **strukturell** (keine `listId`/Ebenen-Attribute) — Ebene und
  „Nummerierungsfamilie" werden beim Schreiben aus der Baumposition abgeleitet, nicht
  gespeichert.

### 1.2 Commands (`src/formats/shared/editor/commands.ts`)

- **[LÜCKE]** `toggleList(ordered)` (Z. 57–60) gibt **ausnahmslos** `wrapInList(listType)`
  zurück — keinerlei Vorprüfung „Selektion ist bereits Liste (dieses/anderen Typs)?".
  Das ist **kein** echtes Toggle. Erneuter Klick auf „1. Liste" bei aktiver Liste ist
  laut `prosemirror-schema-list` je nach Cursor-Position stiller No-Op (Cursor im ersten
  Punkt) oder ungewollte Verschachtelung (späterer Punkt) — verhaltensseitig zu
  bestätigen (Grenzfälle 3.2–3.4), der Codebefund (immer `wrapInList`) genügt aber bereits
  als Nachweis der Lücke. Verletzt Anforderung 2.7.
- **[OK]** `liftFromList()` (Z. 62–64): Alias auf `liftListItem(list_item)`. Hebt laut
  Bibliothek **eine** Ebene je Aufruf (Word-Konvention) — entspricht Anforderung 2.6,
  **kein** Änderungsbedarf, nur Testnachweis.
- **[LÜCKE]** `sinkListItem` wird **nirgends** importiert (Import Z. 2 nur `wrapInList,
  liftListItem`; projektweiter Grep über `src/`: kein Treffer). Kein Einrück-Command.
- **[LÜCKE]** Keine `isListActive`-Funktion (Muster wäre `isAlignActive`, Z. 29–38).
- **[OK]** Referenzmuster für neue Helfer vorhanden: `setAlign` nutzt
  `doc.nodesBetween(from, to, …)` (Z. 17); `isAlignActive` läuft die `$from`-Vorfahrenkette
  ab (Z. 31–37).

### 1.3 Toolbar (`src/formats/shared/editor/Toolbar.tsx`)

- **[LÜCKE]** Button „1. Liste" (Z. 252–262): `onMouseDown` → `toggleList(true)` (Z. 257).
  **Kein** `aria-pressed`, **kein** `aria-label`, kein Aktiv-Styling — anders als
  `MarkButton` (`aria-pressed` Z. 75, `aria-label` Z. 74), `AlignButton` (`aria-pressed`
  Z. 97) und Tabelle-Button (`aria-pressed={isInTable(view.state)}` Z. 281).
- Kontext: Button „• Liste" (Z. 241–251, `toggleList(false)` Z. 246), Button „⇧ Liste"
  (Z. 263–273, `liftFromList()` Z. 268). Alle drei Listen-Buttons in einer Gruppe.
- **[LÜCKE]** Keinerlei UI für Einzug (Maus/Screenreader-Ersatz für Tab), Startwert oder
  Fortsetzen/Neustart — projektweit kein Popover/Kontextmenü/Select dafür.

### 1.4 Keymap (`src/formats/shared/editor/WordEditor.tsx`)

- **[OK]** Erstes `keymap({…})`-Plugin (Z. 85–107), danach `keymap(baseKeymap)` (Z. 108);
  beide innerhalb der `plugins`-Liste (Z. 83–114). `Enter: splitListItem(list_item)`
  (Z. 96); `Shift-Enter: insertHardBreak()` (Z. 97) —
  **ist gebunden**. Das in Anforderung 2.3 beschriebene Enter-Verhalten (leerer Endpunkt
  hebt aus der Liste) entsteht aus dem Zusammenspiel `splitListItem` → `false` →
  `baseKeymap`-Kette (`liftEmptyBlock`); **kein** Codeänderungsbedarf, nur Testnachweis.
- **[LÜCKE]** **Kein** `Tab`/`Shift-Tab` (Grep über `editor/` bestätigt: keine
  Tab-Bindung). Ohne diese Bindung gibt es keinen Editor-Weg, eine mehrstufige Liste zu
  erzeugen (Anforderung 2.4).
- Kreuzbezug: Umschalt+Enter-Verhalten im Listenkontext gehört zu `zeilenumbruch-manuell`,
  wird hier nicht gebaut, aber als Regressionstest gefordert (§4).

### 1.5 DOCX (`reader.ts`, `writer.ts`, `styleDefs.ts`)

- **[OK] Mehrstufiger Import ist gebaut.** `listMarkerFor` (`reader.ts:294-302`) liest
  `w:numId` (Z. 299) **und** `w:ilvl` (Z. 300), `ListMarker` (Z. 289–292).
  `groupLists` (`reader.ts:379-440`) rekonstruiert die Verschachtelung **stack-basiert**:
  Frame je offener Ebene (Z. 380–384), `openFrame`/`closeFrame`/`closeAll` (Z. 389–407),
  tieferes `ilvl` → neue Unterliste im letzten Item (Z. 421–423), flacheres `ilvl` →
  Frames poppen und einhängen (Z. 424–434), Nicht-Listen-Block → `closeAll` (Z. 410–413).
  `readBodyChildren` ruft `listMarkerFor` (Z. 474) und `groupLists` (Z. 482).
- **[OK] Mehrstufiger Export ist gebaut.** `blockToDocx` (`writer.ts:105-156`): der
  `paragraph`-Fall schreibt `<w:numPr><w:ilvl w:val="${listContext.level}"/>…` (Z. 114–116)
  mit der **tatsächlichen** Ebene; der `bullet_list`/`ordered_list`-Fall (Z. 125–140)
  berechnet `nextContext` — bei bestehendem Kontext `{ numId: gleich, level:
  min(level+1, 8) }`, sonst frische Top-Level-`numId`, `level: 0` (Z. 134–136).
  `MAX_LIST_ILVL=8` (Z. 103).
- **[OK]** `numberingXml()` (`styleDefs.ts:64-74`) definiert **9 Ebenen** je Typ:
  `bulletLevelsXml` (Z. 50–55, zyklische Glyphen `•◦▪`), `orderedLevelsXml` (Z. 57–62,
  zyklisch decimal/lowerLetter/lowerRoman).
- **[LÜCKE] Liste in Tabellenzelle geht beim Import verloren.** `parseTable`
  (`reader.ts:311-364`) baut Zelleninhalt über
  `childElements(tcEl,…, 'p').flatMap((p) => paragraphToBlocks(p,…))` (Z. 337–339) —
  **ohne** `listMarkerFor`/`groupLists`. Ein Zell-Absatz mit `w:numPr` wird als
  gewöhnlicher Absatz importiert; die gesamte Listenstruktur (Nummerierung **und**
  Aufzählung) verschwindet. Export (`writer.ts:189`, generischer `blockToDocx` je
  Zell-Kind) und der ODT-Pfad sind korrekt — reine DOCX-Import-Asymmetrie. Betrifft
  Anforderung 2.8 direkt.
- **[LÜCKE] Feste globale `numId` je Typ.** `BULLET_NUM_ID=1`, `ORDERED_NUM_ID=2`
  (`styleDefs.ts:34-35`), im Writer je Top-Level-Liste hart übernommen (Z. 136). Zwei
  ohne Trennabsatz benachbarte Listen erzeugen identische, aufeinanderfolgende
  `w:numId="2"`/`w:ilvl="0"`-Absätze → `groupLists` verschmilzt sie beim Reimport zu
  **einer** Liste (Grenzfall 3.5). Umgekehrt behandelt `groupLists` heute zwei durch
  einen Absatz **getrennte** Gruppen gleicher `numId` als zwei bei 1 **neu** startende
  Listen (`closeAll` bei Nicht-Listen-Block, Z. 411) — d. h. eine bewusst **fortgesetzte**
  Fremd-Liste würde derzeit fälschlich neu gezählt. Beide Seiten adressiert §2.5/§2.6.
- **[LÜCKE] Startwert `attrs.start` überlebt keine Rundreise.** Writer liest ihn nicht
  (`paragraph`-Fall nutzt nur `listContext`, Z. 114–116); `numbering.xml` schreibt kein
  `w:start`/`w:startOverride` (`styleDefs.ts:57-74`); `groupLists` erzeugt `ordered_list`
  **ohne** `attrs` (Z. 391) → Default 1. Schreib- **und** Leseseite defekt.
- **[LÜCKE] `parseNumberingXml` (`reader.ts:78-98`) liest je `abstractNum` nur das erste
  `<w:lvl>`** (`firstChildNS(abstractEl,…, 'lvl')`, Z. 84) und ordnet dessen `numFmt`
  **global** der `numId` zu (`kindByNumId`). Weder Ebene, `w:start`, `w:startOverride`
  noch `w:lvlOverride` werden ausgewertet (Grenzfall 3.16, Fixtures
  `NumberingWithOutOfOrderId.docx`, `NumberingWOverrides.docx`).

### 1.6 ODT (`reader.ts`, `writer.ts`, `styleRegistry.ts`)

- **[OK] Verschachtelung rundreist strukturell.** `elementToBlocks` (`reader.ts:250-324`)
  rekursiert generisch; ein verschachteltes `<text:list>` im `<text:list-item>` erzeugt
  echte verschachtelte Listen-JSON (list-Fall Z. 286–299, Rekursion Z. 290,
  Tiefenlimit `MAX_NESTING_DEPTH=25` Z. 218). `blockToOdt` (`writer.ts:99-109`) schreibt
  verschachtelte Listen korrekt zurück. `list_item`-Leerfall fällt auf `emptyParagraph`
  zurück (Z. 296) — schema-sicher.
- **[LÜCKE] Nur Ebene 1 formal definiert.** `listStyleDefs()` (`styleRegistry.ts:98-103`)
  definiert je Typ nur `text:level="1"` (num-format auf Ebene 1, Z. 101). Tiefere Ebenen
  referenzieren denselben Stil ohne eigenes Format.
- **[LÜCKE] Fixer Stilname je Typ.** `BULLET_LIST_STYLE_NAME='LB'`,
  `ORDERED_LIST_STYLE_NAME='LO'` (`styleRegistry.ts:95-96`), im Writer je Liste hart
  (`writer.ts:101`). Für ODF nicht direkt falsch (getrennte `<text:list>` bleiben
  strukturell getrennt), aber unnötig, sobald ohnehin ein Registrierungsmechanismus
  für Ebenenformate entsteht.
- **[LÜCKE] `start`-Wert wird nirgends geschrieben/gelesen.** ODF erwartet
  `text:start-value` am ersten `<text:list-item>` — weder `writer.ts` noch `reader.ts`
  kennen es.
- **[LÜCKE] Fortsetzen/Neustart nicht abgebildet** (`text:continue-numbering`/
  `text:continue-list` werden nicht geschrieben/gelesen). Fixture `ContinueListTest.odt`
  daher nicht korrekt behandelbar.
- **[LÜCKE] `styles.xml`-Automatikstile fließen nie in die Body-Auflösung ein.** `readOdt`
  (`reader.ts:357-409`) parst `content.xml`-`automatic-styles` für den Body (Z. 363–366),
  lädt `styles.xml` aber **nur** für Kopf-/Fußzeilen (`stylesForChrome`, Z. 370–388). Ein
  Listenstil, der nur in `styles.xml` liegt, wird für den Text nicht gefunden →
  `elementToBlocks` fällt auf `'bullet'` zurück (Z. 288) → nummerierte Liste wird
  fälschlich als Aufzählung importiert (Grenzfall 3.17, `listStyleId.odt`,
  `ListStyleResolution.odt`).
- **[LÜCKE] `<text:list-header>` wird ignoriert.** Der `text:list`-Fall sammelt nur
  `childElements(el,…, 'list-item')` (Z. 289); der Textinhalt einer Listen-Kopfzeile
  verschwindet ersatzlos — **echter Textverlust** (Grenzfall 3.18, `ListHeading.odt`,
  `ListHeading2.odt`).
- **[bekannte Einschränkung] Grobe Typerkennung.** `parseAutomaticStyles` klassifiziert
  einen Listenstil als „ordered", sobald **irgendeine** Ebene ein
  `list-level-style-number` hat (`reader.ts:70-75`, `hasNumber` Z. 73) — nicht je Ebene.
  Als Einschränkung dokumentieren, sofern keine reale Fixture das Gegenteil erzwingt.

### 1.7 CSS (`src/index.css`)

- **[LÜCKE]** `.ProseMirror ul, .ProseMirror ol` (Z. 63–67): nur `padding-left: 1.4em`
  und `margin: 0 0 0.6em`, **keine** `list-style-type`-Regel. Da der Tailwind-v4-Preflight
  (`@import 'tailwindcss'`, Z. 1) global `ol, ul { list-style: none }` setzt und diese Regel
  ihn nicht zurücknimmt, erscheint im Editor nach Code-Lage **kein Nummernmarker** (und kein
  Bullet). Das ist der in Anforderung 2.2/5.13 als schwerster user-sichtbarer Verdacht
  markierte Punkt und **zuerst per Screenshot/`getComputedStyle` zu bestätigen**. Betrifft
  nur die **Editor-Darstellung**, nicht Export/Rundreise (OOXML/ODF tragen die Nummer als
  Feld) — deshalb sind alle Reader/Writer-Rundreise-Tests grün, während die Nummer für die
  Nutzerin fehlt. Behebung: ebenenabhängige `list-style-type`-Regeln (§2.9); diese decken
  zugleich die in Anforderung 2.4 geforderte optische Unterscheidbarkeit je Ebene.

### 1.8 Tests

- **[OK/LÜCKE]** `docx/__tests__/roundtrip.test.ts` „lists" (Z. 141–205): flache Bullet-
  Liste (Z. 142–157), Ordered-vs-Bullet (Z. 159–165), zwei Listen **mit** Trennabsatz
  (Z. 167–176, nur Bullet), Zwei-Ebenen-Verschachtelung (Z. 178–204, nur Bullet).
  `odt/…/roundtrip.test.ts` „lists" (Z. 143–195): analog, **ohne** den „mit Trenner"-Fall.
- **[LÜCKE]** Fehlt komplett: Ordered-Mehrebenen, Startwert, Fortsetzen/Neustart, zwei
  Listen **ohne** Trenner, Liste-in-Tabellenzelle.
- **[LÜCKE]** `external-fixtures.test.ts` (beide Formate): nur „Import stürzt nicht ab"
  über alle Fixtures; **keine** inhaltlichen Listen-Assertions, keine Rundreise. Alle in
  Anforderung 4.2 genannten Fixtures existieren auf Platte (einzeln verifiziert).
- **[LÜCKE]** Kein Unit-Test für `commands.ts`/`Toolbar.tsx` auf Listen; **kein
  *dediziertes* Listen-E2E** (`tests/e2e/` hat keine `lists.spec.ts`; „• Liste"/„1. Liste"
  werden in `clipboard*.spec.ts`/`cut.spec.ts`/`docx.spec.ts`/`odt.spec.ts` nur als **Setup**
  geklickt).
- **[OK — Regressionsschutz, nicht übersehen]** `tests/e2e/roundtrip-fidelity.spec.ts` prüft
  die **zweistufige Listen-Verschachtelung** über Upload → Export → Reimport für **DOCX und
  ODT**: `.ProseMirror li ul, .ProseMirror li ol` = 1 vor/nach (Z. 36–50 / 108–121 für DOCX,
  Z. 164–166 / 227–233 für ODT; Z. 166 referenziert diesen Plan namentlich). Diese
  Verschachtelungs-Persistenz ist damit **grün abgesichert** und darf durch keinen der
  DOCX-Writer-/Reader-Umbauten unten (insb. `NumberingRegistry`, §2.5) **gebrochen** werden —
  siehe die explizite Warnung in §2.5. Sie ist Regressionsschutz, **kein** Bauauftrag.

---

## 2. Zielentwurf / Design-Entscheidungen

### 2.1 `toggleList` — echtes Umschalten statt `wrapInList`-Rohaufruf

Ersetzt die 3-Zeilen-Implementierung (`commands.ts:57-60`) durch eine Funktion, die den
betroffenen Bereich selbst klassifiziert:

| Ausgangslage der Selektion | Aktion |
|---|---|
| Vollständig außerhalb jeder Liste | Wie heute: `wrapInList(targetType)` auf den zusammenhängenden Absatzlauf. |
| Vollständig in **einer** Liste, die **bereits** der Zieltyp ist | **Neu:** aufheben (echtes „aus") — behebt No-Op/Verschachtelung bei erneutem Klick. |
| Vollständig in **einer** Liste **anderen** Typs | **Neu:** `tr.setNodeMarkup(listPos, targetType, attrs)` direkt auf den Listenknoten — kein `wrapInList`, keine Nested-Gefahr, unabhängig von der Cursor-Position. Attribute (`start`) beim Wechsel Ordered→Bullet verwerfen, Bullet→Ordered auf Default setzen. |
| Mischung aus Liste(n) + Absätzen / mehrere Listen | Jede erfasste Liste einzeln nach obiger Regel; jeder zusammenhängende Nicht-Listen-Lauf einzeln per `wrapInList`. Überschriften im Bereich überspringen (Schema erlaubt keine Heading in `list_item`), **nicht** die ganze Aktion abbrechen. |

Neue kleine Helfer in `commands.ts` (`findTouchedListNodes`, `findConvertibleParagraphRuns`)
über `state.doc.nodesBetween(from, to, …)` (Muster wie `setAlign`, Z. 17). Rückgabe `false`,
wenn weder Liste noch konvertierbarer Absatz erfasst ist (kein stiller No-Op bei völlig
leerem Kontext — die Availability-Prüfung speist den Button-`disabled`/`aria`-Zustand,
§2.2). Deckt zugleich `aufzaehlungsliste-req.md` 2.6, ersetzt aber nicht dessen Abnahme.

### 2.2 Aktiver Button-Zustand (`isListActive`)

Neue Helfer in `commands.ts`, analog `isAlignActive` (Vorfahrenkette abgehen):

```
export function isListActive(state: EditorState, ordered: boolean): boolean {
  const type = ordered ? wordSchema.nodes.ordered_list : wordSchema.nodes.bullet_list
  const { $from } = state.selection
  for (let depth = $from.depth; depth >= 0; depth--) {
    if ($from.node(depth).type === type) return true
  }
  return false
}
```

In `Toolbar.tsx` beide Listen-Buttons (Z. 241–262) auf ein gemeinsames Muster wie
`AlignButton`/`MarkButton` umstellen: `aria-pressed={isListActive(view.state, ordered)}`,
`aria-label`, Aktiv-Styling. Ordered ist durch Anforderung 1.4 zwingend; Bullet wird im
selben Codeblock miterledigt (erfüllt `aufzaehlungsliste-req.md`-Ist-Stand mit, ersetzt
dessen Abnahme nicht).

### 2.3 Einzug (Tab/Shift-Tab)

Neue Commands in `commands.ts` (`sinkListItem` aus `prosemirror-schema-list` importieren):

```
export function indentListItem(): Command {
  return (state, dispatch, view) => {
    if (sinkListItem(wordSchema.nodes.list_item)(state, dispatch, view)) return true
    return isInsideListItem(state) // in Liste: Tab-Event schlucken (kein Fokusverlust);
                                   // außerhalb: false → Tab fällt an Browser-Default durch
  }
}
export function outdentListItem(): Command {
  return liftListItem(wordSchema.nodes.list_item)
}
```

Bindung im ersten `keymap({…})` (`WordEditor.tsx:85-107`): `Tab: indentListItem()`,
`'Shift-Tab': outdentListItem()`. `sinkListItem` erzeugt die Unterliste mit
Default-Attributen (`start: 1`) — erwünscht (jede Ebene zählt eigenständig bei 1). Erfüllt
`liste-einruecken-tab-req.md` strukturell mit (dortige eigene Abnahme bleibt).

### 2.4 Startwert / Fortsetzen / Neustart — Datenmodell, Plugin, UI

**Schema** (`schema.ts`, `ordered_list.attrs`, Z. 127 erweitern):

```
attrs: {
  start: { default: 1, validate: 'number' },
  numberingMode: { default: 'restart', validate: 'string' }, // 'restart' | 'continue'
}
```

- `restart` (Default): Liste beginnt bei `start`.
- `continue`: zählt die unmittelbar vorangehende gleichartige `ordered_list` fort; `start`
  wird vom System berechnet und gehalten.

**Neues Plugin** `src/formats/shared/editor/listNumbering.ts`: `appendTransaction`-Plugin,
das nach jeder inhaltsändernden Transaktion alle `ordered_list` mit `numberingMode ===
'continue'` findet und deren `start` = (Punktezahl der vorangehenden zusammengehörigen
Ordered-Liste) + 1 per `tr.setNodeAttribute` aktualisiert. **Kein bestehendes Plugin im
Projekt nutzt `appendTransaction`** (projektweiter Grep über `src/`: kein Treffer) — dies
ist der erste Konsument, es gibt also keine echte Codevorlage dafür. `pagination.ts`
(`createPaginationPlugin`, Z. 72–105) illustriert nur das **Prinzip** „nur dispatchen, wenn
sich tatsächlich etwas geändert hat" (dort über `sameDecorationSet` in einem `view`/`update`-Hook,
**nicht** über `appendTransaction`) — Endlosschleifen-Guard hier: `appendTransaction`
gibt `null`/`undefined` zurück (keine Transaktion), sobald keine `ordered_list` mit
`numberingMode: 'continue'` einen abweichenden `start`-Wert hat; nur bei tatsächlicher
Abweichung wird `tr.setNodeAttribute` aufgerufen und die resultierende Transaktion
zurückgegeben.

**UI** `src/formats/shared/editor/ListNumberingMenu.tsx` (neu): kleines Dropdown-Popover an
einem neuen „▾"-Button neben „1. Liste" in `Toolbar.tsx`. Optionen: „Bei 1 beginnen"
(`restart`, `start:1`); „Beginnen bei N" (`restart`, `start:N`); „Vorherige Liste
fortsetzen" (`continue`, ausgegraut+Tooltip, wenn rückwärts keine Ordered-Liste gefunden
wird — kein stiller Fehlschlag). Neuer Command `setListNumbering(mode, start)` +
`findEnclosingOrderedListPos(state)` in `commands.ts`.

### 2.5 DOCX-Export: `numId` je Nummerierungsfamilie, `start`/Fortsetzen

Die Ebenen-/`ilvl`-Mechanik ist **vorhanden** (§1.5) und bleibt. Neu ist die **Vergabe
einer eigenen `numId` je Top-Level-Liste** und das Einbetten von Startwert/Fortsetzung.

Neue Datei `src/formats/docx/numberingRegistry.ts` (Muster wie `RelationshipRegistry`):

```
export class NumberingRegistry {
  // Frische numId je Top-Level-Liste. 'continue'-Listen bekommen die numId der zuletzt
  // gesehenen Top-Level-Liste GLEICHEN Typs (geteilte Zählkette). restart+start!==1
  // erzeugt einen <w:num>-Eintrag mit <w:lvlOverride><w:startOverride w:val="start"/>.
  allocate(kind: 'bullet'|'ordered', start: number, mode: 'restart'|'continue'): number
  serializeNumEntries(): string  // alle dynamischen <w:num>-Einträge für numbering.xml
}
```

`writer.ts`-Umbau: `blockToDocx`/`blocksToDocx`/`tableToDocx` reichen eine `NumberingRegistry`-
Instanz durch (eine je `writeDocx`-Aufruf). Geändert wird **ausschließlich** der
Top-Level-Zweig des Listenfalls (`blockToDocx`, Z. 134–136): die feste
`node.type === 'ordered_list' ? ORDERED_NUM_ID : BULLET_NUM_ID`-Zuweisung im
`listContext === null`-Fall wird zu
`registry.allocate(kind, node.attrs.start ?? 1, node.attrs.numberingMode ?? 'restart')`,
`level: 0`. Der **verschachtelte** Zweig (`listContext !== null`,
`{ numId: listContext.numId, level: Math.min(listContext.level + 1, MAX_LIST_ILVL) }`)
bleibt **unangetastet** (erbt die numId des Elternteils, erhöht nur `level`).

> **Kritisch — NICHT je Listenknoten eine frische `numId` vergeben.** Würde man (wie es die
> jeweilige Vorfassung von `nummerierte-liste-code.md` **und** `aufzaehlungsliste-code.md`
> tat) `ListContext`/`level` verwerfen und **jedem** Listenknoten inkl. verschachtelter eine
> eigene `numId` geben, bekäme eine Unterliste eine **andere** `numId` als ihr Elternteil.
> `groupLists` (`reader.ts:379-440`) rekonstruiert Verschachtelung aber nur **innerhalb
> derselben `numId` über `w:ilvl`** → die Unterliste würde beim Reimport zur gleichrangigen
> **Schwesterliste flachgelegt**. Das bricht die grünen Tests „preserves a nested list two
> levels deep" (`docx/__tests__/roundtrip.test.ts:178`, `odt/__tests__/roundtrip.test.ts:169`)
> **und** die E2E-Assertion `roundtrip-fidelity.spec.ts:120`/`:233` → **DoD-Verletzung**. Der
> Fix darf **nur** den Top-Level-Zweig betreffen. Vor/nach dem Umbau ist der Nested-Test
> explizit als grün-bleibend nachzuweisen (Regressionswächter, §4).

> **Zweite Randbedingung — `NumberingRegistry.allocate` NICHT bei einem Typwechsel auf
> bereits verschachtelter Ebene aufrufen (gemischt-typige Ketten, z. B. Ordered außen /
> Bullet innen).** `liste-einruecken-tab-code.md` Abschnitt 5A hat dafür bereits eine
> Analyse samt konkreter **Empfehlung** vorgelegt („Option B", dort noch **nicht final** —
> „mit PO/Lead abzustimmen" laut jenem Dokument selbst): Eine verschachtelte Liste teilt
> zwangsläufig die `numId` (und damit den Typ) ihrer Elternliste, weil `groupLists`
> (`docx/reader.ts:379-440`) Verschachtelung ausschließlich über gemeinsame `numId` +
> wachsendes `w:ilvl` rekonstruiert — jede `numId` verweist über ihren `abstractNum` fest
> auf **einen** Typ (Bullet **oder** Ordered, nie beides). Eine gemischt-typige Kette
> verliert dadurch bei der DOCX-Rundreise den Typ der Unterebene (Tiefe bleibt, Typ
> kollabiert auf den der Elternliste); **ODT ist davon nicht betroffen**, weil
> `blockToOdt` den Listenstil-Namen je **Knotentyp** wählt (`odt/writer.ts:99-109`:
> `node.type === 'ordered_list' ? ORDERED_LIST_STYLE_NAME : BULLET_LIST_STYLE_NAME`),
> unabhängig von der Verschachtelungstiefe. Die Alternative „Option A" (eigene `numId`/
> eigener Stilname ab der wechselnden Ebene) wäre erheblich aufwendiger (dokumentabhängiger
> `numbering.xml`-Neubau) und ist laut jenem Dokument als „Lead/PO-Beschluss" markiert, also
> ebenfalls noch offen. Diese `NumberingRegistry` (autoritativ auch für
> `aufzaehlungsliste-code.md`, siehe dortige Abschnitte 4.6/4.7) wird **unter der Annahme
> „Option B" entworfen**: `registry.allocate(...)` wird **ausschließlich** im
> `listContext === null`-Zweig (echte Top-Level-Liste) aufgerufen; im verschachtelten Zweig
> bleibt es bei `{ numId: listContext.numId, level: … }` **ohne** Rücksicht auf `node.type`.
> Sollte PO/Lead stattdessen „Option A" beschließen, betrifft das **beide** Geschwisterpläne
> gemeinsam und muss **vor** Umsetzung dieses Abschnitts (nicht erst danach) mit
> `liste-einruecken-tab-code.md` abgeglichen werden — die **eine** ausstehende Bestätigung
> deckt beide Dokumente ab, sie ist hier nicht erneut unabhängig zu klären. Zu Testzwecken
> genügt bis dahin ein Verweis auf `liste-einruecken-tab-code.md` Abschnitt 5A/6.1 statt
> eines eigenen Tests hier.
>
> **Neuer, bislang in keinem der drei Geschwisterdokumente benannter Erzeugungsweg:** Bisher
> wurde eine gemischt-typige Kette nur über Tab/Sink (`liste-einruecken-tab-req.md`) oder
> Fremddatei-Import diskutiert. Das **echte Toggle** aus §2.1 **dieses** Dokuments öffnet
> einen dritten, rein editorinternen Weg dorthin: Cursor in einer bereits verschachtelten
> Unterliste (durch Tab/Sink entstanden, §2.3) + Klick auf den jeweils anderen Listen-Button
> → `tr.setNodeMarkup(listPos, targetType, attrs)` ändert **nur** den Typ dieses
> verschachtelten Listenknotens, ohne seine Position/Tiefe zu verändern — die Liste bleibt
> verschachtelt, wird aber typwechselnd. Das erzeugt exakt die oben beschriebene
> gemischt-typige Kette **ohne jeden Dateiimport**, rein durch zwei Toolbar-Klicks. Verhält
> sich nach obiger Randbedingung identisch (DOCX-Typkollaps, ODT korrekt) — **kein
> zusätzlicher Fix nötig**, aber als E2E-Testfall in `tests/e2e/lists.spec.ts` (§3/§4)
> aufzunehmen, da dies der einzige der drei Erzeugungswege ist, der ohne Fremddatei
> reproduzierbar ist.

**Wichtig:** `tableToDocx` (Z. 158–201) muss die Registry an die Zell-Rekursion (Z. 189)
durchreichen, damit Zell-Listen ebenfalls eine eigene numId erhalten. Die statischen
`BULLET_NUM_ID`/`ORDERED_NUM_ID` (`styleDefs.ts:34-35`, per Grep bestätigt nur von
`writer.ts` importiert) entfallen als globale Konstante zugunsten registrierter Werte;
`abstractNum`-Verweis bleibt fix (`BULLET_ABSTRACT_ID=0`/`ORDERED_ABSTRACT_ID=1`,
`styleDefs.ts:32-33`), nur die `<w:num>→abstractNum`-Zuordnung wird dynamisch.
`numberingXml()` (`styleDefs.ts:64-74`) bekommt einen Parameter für die von der Registry
gelieferten `<w:num>`-Einträge (ersetzt die heute festen zwei `<w:num>`, Z. 70–71); die
beiden `<w:abstractNum>` mit ihren 9 Ebenen (`bulletLevelsXml`/`orderedLevelsXml`,
Z. 50–62) bleiben **unverändert**. **Aufrufreihenfolge in `writeDocx` passt bereits:**
die `numId`-Werte werden beim Bau von Body/Header/Footer-XML (Z. 256/265/270) vergeben,
`numberingXml(registry)` wird erst danach aufgerufen (Z. 282) — die Registry ist zu diesem
Zeitpunkt vollständig befüllt.

### 2.6 DOCX-Import: `start` lesen, Tabellenzellen einbeziehen, Fortsetzen erkennen

Die Stack-Rekonstruktion (`groupLists`, `reader.ts:379-440`) bleibt. Ergänzungen:

- **`parseNumberingXml` (Z. 78–98) erweitern** von `Map<numId, 'bullet'|'ordered'>` zu
  `Map<numId, Map<ilvl, { kind; start }>>`: alle `<w:lvl>`-Kinder je `abstractNum` lesen
  (heute liest Z. 84 via `firstChildNS` nur das **XML-erste** `<w:lvl>` und ordnet dessen
  `numFmt` global der `numId` zu), `w:start` je Ebene, zusätzlich je `<w:num>` dessen
  `<w:lvlOverride>/<w:startOverride>`. **Ripple der Rückgabetyp-Änderung:** `kindByNumId`
  wird heute durch `readBodyChildren` (Z. 464–485) an `groupLists` (Z. 482) durchgereicht
  und zusätzlich in den Header-/Footer-Zweigen von `readDocx` (Z. 520, 529) verwendet — alle
  diese Signaturen und `groupLists`/`openFrame` sind auf den neuen Map-Typ anzupassen (bzw.
  eine schlanke Zugriffshilfe `kindOf(numId)`/`startOf(numId, ilvl)` einführen, um die
  vorhandenen `kindByNumId.get(numId)`-Aufrufe minimal zu halten). **Koordination mit dem
  Geschwister-Plan:** `aufzaehlungsliste-code.md` §4.5 (Befund F8) schlägt für dieselbe
  Stelle den *kleineren* Fix vor, gezielt die Ebene `ilvl=0` statt „erstes `<w:lvl>`" zu
  wählen. Dieser reichere Umbau **subsumiert** F8 (Ebene 0 ist Teil der Map); der F8-Fix ist
  dann nicht mehr separat nötig, sein Testfall (synthetisch umsortiertes `numbering.xml`)
  wird hier übernommen.
- **`groupLists`/`openFrame` (Z. 389–392)** setzt beim Erzeugen eines `ordered_list` die
  `attrs.start` aus der aufgelösten Ebeneninfo (heute attrslos, Z. 391: `{ type:
  'ordered_list', content: [] }`). Für `bullet_list` bleibt es attrslos.
- **Fortsetzen-Erkennung:** pro `numId` die auf Ebene 0 bereits emittierten `list_item`
  mitzählen; taucht dieselbe `numId` nach einem `closeAll` (Nicht-Listen-Block) erneut
  auf, `numberingMode: 'continue'` + `start = bisherige Anzahl + 1` setzen — **außer** ein
  `w:startOverride` erzwingt `restart` mit Override-Wert. Nach dem Export-Fix §2.5 bekommt
  jede *bewusst neue* Liste eine eigene numId, sodass benachbarte getrennte Listen getrennt
  bleiben; nur eine *bewusst fortgesetzte* teilt sich eine numId (bekannte Grenze bei
  Fremddateien, §6).
- **Tabellenzellen-Fix:** gemeinsame Hilfsfunktion `readParagraphsAndTables(children,
  headingInfo, imageRels, numberingInfo, depth)`, die Absatz-/Tabellen-Kinder einliest,
  `listMarkerFor` erfasst und `groupLists` aufruft. `readBodyChildren` (Z. 464–485) **und**
  `parseTable` (Zellinhalt Z. 337–339) rufen diese Funktion — behebt den Komplettverlust
  von Zell-Listen (§1.5). Kein Baumumbau nötig, nur Umleitung des Zellpfads auf den
  bestehenden Gruppierungscode.

### 2.7 ODT-Export: Stilname je Top-Level-Liste, 9 Ebenen, `start`/Fortsetzen

`styleRegistry.ts`:
- `listStyleDefs()` (Z. 98–103) parametrisiert: erzeugt für einen gegebenen Stilnamen
  einen vollständigen **9-Ebenen**-Satz (Formatkette wie DOCX: decimal/lowerLetter/
  lowerRoman bzw. •/◦/▪, wachsendes `text:space-before` je Ebene).
- Neue Klasse `ListStyleRegistry` (analog `TextStyleRegistry`, Z. 22–44): frischer Name
  je **Top-Level**-Liste, akkumuliert dessen Ebenen-Definition; verschachtelte Listen
  derselben Familie referenzieren denselben Namen (Ebene ergibt sich ODF-nativ aus der
  `<text:list>`-Tiefe).

`writer.ts` (`blockToOdt` Listenfall Z. 99–109): statt fixem `LB`/`LO` (Z. 101) ein Name
aus der `ListStyleRegistry`; bei `numberingMode==='restart'` und `start!==1` erhält das
**erste** `<text:list-item>` `text:start-value="{start}"`; bei `numberingMode==='continue'`
erhält das `<text:list>` `text:continue-numbering="true"`. Registry-Instanz je
`writeOdt`-Aufruf, an `blocksToOdt`/`blockToOdt`/Zell-Rekursion durchreichen; Defs in
`buildContentXml` (Z. 206–214, Einbettung Z. 210) statt statischem `listStyleDefs()`
serialisieren.

### 2.8 ODT-Import: `styles.xml` mergen, `start`/Fortsetzen/`list-header` lesen

`reader.ts`:
- **`readOdt` (Z. 357–409):** `styles.xml` **vor** dem Body-Parsen laden und dessen
  `automatic-styles` **und** `office:styles` (benannte Stile) in dieselben `ParsedStyles`-
  Maps mergen, die für den Body genutzt werden (Präzedenz: `content.xml` gewinnt bei
  Kollision). Behebt §1.6-Stilauflösung.
- **`parseAutomaticStyles`/`listKinds` (Z. 70–75):** je Ebene den Startwert/das Format
  auslösbar machen; für den tatsächlichen Listenstart zusätzlich `text:start-value` am
  ersten `<text:list-item>` lesen und als `attrs.start` setzen.
- **`elementToBlocks` `text:list` (Z. 286–299):** zusätzlich
  `childElements(el, text, 'list-header')` sammeln; deren Inhalt als **eigener
  Absatz-Block VOR** der Liste einfügen (nicht als Listenpunkt — unser Schema kennt keinen
  unnummerierten Punkt; bewusste, zu dokumentierende Vereinfachung, verhindert aber den
  heutigen Textverlust). `text:continue-numbering="true"` → `numberingMode: 'continue'`.
- **Keine** defensive „führender Absatz"-Absicherung nötig (Schema ist `block+`, §1.1;
  `list_item`-Leerfall ist bereits durch `emptyParagraph`-Fallback Z. 296 abgedeckt).

### 2.9 CSS (`src/index.css`)

Ebenenabhängige Regeln ergänzen (bestehende `padding-left`-Regel Z. 63–65 bleibt):

```css
.ProseMirror ol { list-style-type: decimal; }
.ProseMirror ol ol { list-style-type: lower-alpha; }
.ProseMirror ol ol ol { list-style-type: lower-roman; }
.ProseMirror ol ol ol ol { list-style-type: decimal; }
.ProseMirror ul { list-style-type: disc; }
.ProseMirror ul ul { list-style-type: circle; }
.ProseMirror ul ul ul { list-style-type: square; }
.ProseMirror ul ul ul ul { list-style-type: disc; }
```

Zyklus alle 3 Ebenen, deckungsgleich mit der DOCX/ODT-Formatkette (§2.5/§2.7), erfüllt
Anforderung 2.4/Grenzfall 3.6.

---

## 3. Dateigenauer Änderungsplan

| Datei | Art der Änderung |
|---|---|
| `src/formats/shared/schema.ts` | `ordered_list.attrs` um `numberingMode` erweitern (Z. 127, §2.4). Sonst kein Schema-Eingriff (`list_item` bleibt `block+`). |
| `src/formats/shared/editor/commands.ts` | `toggleList` neu (§2.1); `isListActive` neu (§2.2); `indentListItem`/`outdentListItem` + Import `sinkListItem` (§2.3); `setListNumbering` + `findEnclosingOrderedListPos` (§2.4); Helfer `findTouchedListNodes`, `findConvertibleParagraphRuns`, `isInsideListItem`. |
| `src/formats/shared/editor/Toolbar.tsx` | „1. Liste" (Z. 252–262) und „• Liste" (Z. 241–251) auf `aria-pressed`/`aria-label`/Aktiv-Styling via `isListActive` umstellen; neuer „▾"-Button neben „1. Liste" öffnet `ListNumberingMenu`. |
| `src/formats/shared/editor/ListNumberingMenu.tsx` (neu) | Popover für Startwert/Fortsetzen/Neustart (§2.4). |
| `src/formats/shared/editor/listNumbering.ts` (neu) | `appendTransaction`-Plugin, `start` für `continue`-Listen neu berechnen (§2.4). |
| `src/formats/shared/editor/WordEditor.tsx` | `Tab`/`Shift-Tab` in `keymap({…})` (Z. 85–107); neues `listNumbering`-Plugin in die `plugins`-Liste (Z. 83–114). |
| `src/index.css` | Ebenenabhängige `list-style-type`-Regeln ergänzen (nach Z. 63–65, §2.9). |
| `src/formats/docx/reader.ts` | `parseNumberingXml` (Z. 78–98) → `numId→ilvl→{kind,start}` inkl. `w:start`/`w:startOverride`/`w:lvlOverride`; `groupLists`/`openFrame` (Z. 389–392) setzt `attrs.start` + Fortsetzen-Erkennung; neue `readParagraphsAndTables`, genutzt von `readBodyChildren` (Z. 464–485) **und** `parseTable`-Zellinhalt (Z. 337–339) → Tabellenzellen-Fix (§2.6). |
| `src/formats/docx/writer.ts` | `NumberingRegistry` je `writeDocx` anlegen und durch `blocksToDocx`/`blockToDocx`/`tableToDocx` (Z. 189) durchreichen; Listenfall (Z. 134–136) vergibt numId je Top-Level-Liste; `attrs.start`/`numberingMode` einbeziehen (§2.5). |
| `src/formats/docx/numberingRegistry.ts` (neu) | `NumberingRegistry`-Klasse (§2.5). |
| `src/formats/docx/styleDefs.ts` | `numberingXml()` (Z. 64–74) um Parameter für dynamische `<w:num>`-Einträge (aus Registry) erweitern; `BULLET_NUM_ID`/`ORDERED_NUM_ID` (Z. 34–35) nur noch als Startwert der Registry, nicht mehr global hart im Writer. 9-Ebenen-`abstractNum` bleiben. |
| `src/formats/odt/reader.ts` | `styles.xml`-Merge in `readOdt` (Z. 357–409); `listKinds`/Start je Ebene + `text:start-value` (Z. 70–75, 286–299); `text:list-header` als vorangestellter Absatz; `text:continue-numbering` lesen (§2.8). |
| `src/formats/odt/writer.ts` | Listenfall (Z. 99–109) auf `ListStyleRegistry`-Name + `text:start-value`/`text:continue-numbering`; Registry durch `blocksToOdt` durchreichen; `buildContentXml` (Z. 210) serialisiert Registry-Defs (§2.7). |
| `src/formats/odt/styleRegistry.ts` | `listStyleDefs()` (Z. 98–103) parametrisiert, 9 Ebenen; neue `ListStyleRegistry`-Klasse (§2.7). |
| `src/formats/docx/__tests__/roundtrip.test.ts` | Neue `describe`: Ordered-Mehrebenen, Startwert, Fortsetzen, zwei Listen **ohne** Trenner (Grenzfall 3.5), Liste in Tabellenzelle. |
| `src/formats/odt/__tests__/roundtrip.test.ts` | Analog; zusätzlich „zwei Listen mit Trenner" (fehlt bislang, nur DOCX hat es). |
| `src/formats/docx/__tests__/external-fixtures.test.ts` | Fixture-spezifische Blöcke (nicht nur Crash): `ComplexNumberedLists.docx` (Ebenen ≥3), `Numbering.docx`, `NumberingWithOutOfOrderId.docx`, `NumberingWOverrides.docx` (Start/Override) inkl. Rundreise. |
| `src/formats/odt/__tests__/external-fixtures.test.ts` | Fixture-spezifische Blöcke: `ContinueListTest.odt`, `listLevel10.odt`, `listsInTable.odt`, `simple-table-with-lists.odt`, `ListRoundtrip.odt`, `brokenList.odt`/`ListOddity.odt` (definiertes Fallback), `listStyleId.odt`/`ListStyleResolution.odt` (Stilauflösung), `ListHeading.odt`/`ListHeading2.odt` (Kopfzeilentext bleibt), `imageWithinList.odt` (Block im Punkt). |
| `src/formats/shared/editor/__tests__/list-commands.test.ts` (neu) | Unit-Tests für `toggleList`, `isListActive`, `indentListItem`/`outdentListItem`, `setListNumbering` auf `EditorState`-Ebene (Muster wie `pagination.test.ts`, kein DOM). |
| `tests/e2e/lists.spec.ts` (neu) | Browser-Bedienung: Liste erzeugen (Cursor/Selektion), Enter-Fälle, Tab/Shift-Tab inkl. Fokus, Toggle Bullet↔Ordered ohne Verschachtelung, Startwert-UI + Downloadprüfung, Fortsetzen-UI, `aria-pressed`, Liste in Tabellenzelle, Undo/Redo, Selection-Sync-Regressionsmuster. |

---

## 4. Testplan

1. **Unit `list-commands.test.ts`:** alle Fallunterscheidungen von `toggleList` (§2.1),
   `isListActive`, `indentListItem`/`outdentListItem` (inkl. „erster Punkt → kein Sink,
   aber `return true` ohne `docChanged`"), `setListNumbering`.
2. **Unit `roundtrip.test.ts` (beide Formate):** je Zeile aus §3, insbesondere die beiden
   fehlenden „ohne Trenner"-Fälle (Grenzfall 3.5) und Liste-in-Tabellenzelle. Startwert-
   und Fortsetzen-Tests werden **jetzt** geschrieben und dokumentieren bis zur Behebung die
   Lücke (Anforderung 4). **Regressionswächter (Pflicht):** Die bereits grünen Tests
   „preserves a nested list two levels deep" (`docx/__tests__/roundtrip.test.ts:178`,
   `odt/__tests__/roundtrip.test.ts:169`) und die Nested-Assertions in
   `tests/e2e/roundtrip-fidelity.spec.ts` (Z. 50/120 DOCX, Z. 166/233 ODT) müssen nach dem
   `NumberingRegistry`-Umbau (§2.5) **grün bleiben** — sie sind der konkrete Nachweis, dass
   der Fix nur den Top-Level-Zweig trifft und Verschachtelung nicht flachlegt.
3. **Unit `external-fixtures.test.ts` (beide Formate):** inhaltliche Assertions je Fixture
   aus Anforderung 4.2 (Listenstruktur, Ebenen, Text je Punkt), nicht nur „stürzt nicht ab".
4. **E2E `tests/e2e/lists.spec.ts`:** alle Punkte aus Anforderung Abschnitt 6 über echten
   Upload/Download und echte Tastatur-/Maus-Events; inkl. Selection-Sync-Regressionsmuster
   (Toolbar-Klick + Cursor-Neupositionierung, Hauptspez. Abschnitt 2).
5. **Unabhängige Validierung (Anforderung 6.12):** exportierte DOCX gegen die OOXML-Struktur
   (`w:ilvl`/`w:numId`/`w:startOverride`) prüfen, exportierte ODT gegen verschachtelte
   `text:list` + `text:start-value`/`text:continue-numbering` — als separater/CI-Schritt,
   nicht in der Vitest-Suite (kein Python-Zwang im Regellauf).

---

## 5. Empfohlene Umsetzungsreihenfolge (schwerste/Kern-Arbeit zuerst)

Reihenfolge bewusst **hardest-first**: die Punkte mit dem größten Risiko/Datenverlust und
der zentralen Bedienung zuerst, kosmetische/risikoarme Ergänzungen zuletzt. Nach **jedem**
abgeschlossenen Schritt committen/pushen und den GitHub-Actions-Lauf selbst auf grün prüfen,
bevor der nächste Schritt beginnt.

1. **DOCX-Import: Liste-in-Tabellenzelle** (`readParagraphsAndTables`, §2.6) — schwerster,
   datenverlustkritischster Befund (Anforderung 5, Punkt 3; DoD-Pflicht). Direkt gegen die
   Fixtures `listsInTable`-Äquivalent + neuen Roundtrip-Test verifizierbar.
2. **DOCX numId-je-Liste + Startwert + Fortsetzen** (`NumberingRegistry`, `writer.ts`,
   `parseNumberingXml`, `groupLists`, §2.5/§2.6) — Export **vor** Reader-Startlese, damit
   die Rundreise gegen selbst erzeugte Dateien testbar wird. Behebt Grenzfall 3.5 und
   Startwert-Verlust (DoD-Pflicht Punkte 5).
3. **`toggleList` echtes Toggle + `isListActive`** (§2.1/§2.2) — Kernbedienung/Anforderung
   2.7 (DoD-Pflicht Punkt 9), unabhängig vom Import/Export testbar.
4. **ODT-Import: `styles.xml`-Merge + `list-header` + `start`/Fortsetzen** (§2.8) —
   Datenverlust/Fehlklassifikation (DoD-Pflicht Punkte 7, 8).
5. **ODT-Export: `ListStyleRegistry` + 9 Ebenen + `start`/Fortsetzen** (§2.7) — schließt die
   ODT-Rundreise (Startwert/Fortsetzen/Ebenenformat).
6. **Tab/Shift-Tab-Einzug** (`indentListItem`/`outdentListItem`, §2.3) — erst jetzt sinnvoll,
   da Import/Export für Mehrstufigkeit dann verifiziert ist.
7. **Schema-Attribut `numberingMode`** + **Startwert-/Fortsetzen-UI** (`ListNumberingMenu`,
   `listNumbering.ts`-Plugin, §2.4) — setzt auf dem bereits rundreisefähigen `start`/
   `numberingMode`-Pfad auf.
8. **CSS-Ebenenregeln** (§2.9) — risikoarm, rein visuell.
9. **Test-Vervollständigung**: Unit-Roundtrips, Fixture-Inhalts-Assertions,
   `list-commands.test.ts`, `tests/e2e/lists.spec.ts` durchgängig grün.

(Abweichung vom risikoarm-zuerst-Ansatz der Vorfassung ist beabsichtigt: die
datenverlustkritischen DOCX/ODT-Import-Fixes und die Kernbedienung stehen bewusst vorn.)

---

## 6. Vor Umsetzung zu bestätigende Entscheidungen (dürfen laut DoD nicht offen bleiben)

1. **Tiefenbegrenzung der Ebenenformate:** Ab Ebene 9 (`ilvl` 8) wiederholt sich das Format
   von Ebene 8 (bereits so im DOCX-`abstractNum`, `styleDefs.ts:57-62`; für ODT
   nachzuziehen). Als bewusste Produktentscheidung bestätigen (Grenzfall 3.6 verlangt nur
   „sinnvolle visuelle Grenze").
2. **Bullet↔Ordered-Typwechsel auf tieferer Ebene — eine einzige, geteilte Entscheidung mit
   `liste-einruecken-tab-code.md`, nicht zweimal unabhängig zu treffen:** Jenes Dokument
   (Abschnitt 5A) empfiehlt „Option B" (DOCX-Rundreise gemischt-typiger Ketten verliert
   bewusst den Ebenen-Typ der Unterebene, behält nur Tiefe + Typ der obersten Ebene; ODT
   bleibt korrekt) gegenüber „Option A" (eigene `numId`/eigener ODT-Stilname ab der
   wechselnden Ebene — teurer, da ein dokumentabhängiger `numbering.xml`-Neubau je
   Verschachtelungspfad nötig wäre) — markiert diese Wahl dort aber selbst ausdrücklich als
   **noch nicht** von PO/Lead bestätigt (siehe §2.5 oben). Zu bestätigen vor Umsetzung dieses
   Plans: **(a)** PO/Lead entscheidet **einmal** für beide Geschwisterpläne (nicht separat
   für dieses Dokument), **(b)** bei „Option B" baut dieser Plan seine `NumberingRegistry`
   wie in §2.5 beschrieben (kein `allocate`-Aufruf im verschachtelten Zweig); bei „Option A"
   ist §2.5 vor Umsetzung entsprechend zu überarbeiten (zusätzlicher Aufwand, der dann mit
   `liste-einruecken-tab-code.md`/`mehrstufige-liste` zu koordinieren ist).
3. **„Liste aufheben" bleibt unverändert** (`liftListItem`, eine Ebene je Klick, §1.2) —
   nur bestätigen; falls Produkt „ein Klick = komplett raus" verlangt, ist das eine bewusste
   Abweichung vom Bibliotheksverhalten (siehe `liste-aufheben-req.md`).
4. **Kein Toast/Statussystem für No-Op-Aktionen** — projektweit keine
   Benachrichtigungskomponente. „Kein stiller Fehlschlag" wird ausschließlich über
   sichtbaren Button-Zustand (`aria-pressed`/`aria-disabled`) und echtes Toggle (§2.1/2.2)
   erfüllt; bestätigen, dass das für die Abnahme reicht.
5. **`text:list-header`-Fallback als vorangestellter Normalabsatz** (§2.8) statt eines
   eigenen unnummerierten Schema-Konzepts — bestätigen als ausreichend gegen „Datenverlust",
   auch wenn die Sonderrolle (keine Nummer) beim Reimport nicht wiederhergestellt wird (rein
   additiv gegenüber dem heutigen Komplettverlust).
6. **Fortsetzen-Erkennung beim DOCX-Import allein über geteilte `numId` nach Unterbrechung**
   (§2.6) — korrekt für alle nach diesem Plan selbst exportierten Dateien; bei **fremden**
   Dateien nur so gut wie deren `numId`-Vergabe (ein Erzeuger, der dieselbe `numId` für
   eigentlich unabhängige Listen wiederverwendet, würde fälschlich als „Fortsetzen" erkannt).
   Als bekannte Grenze dokumentieren.
