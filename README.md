# VFRMate

Offlinefähige Progressive Web App für den deutschen Flugdurchführungsplan
VFR — Planung am Schreibtisch, Nutzung im Cockpit. Kein Backend, keine
Anmeldung, keine Cloud: alle Daten bleiben lokal auf dem Gerät.

**Live:** https://akki320.github.io/VFRMate/ (Deployment über GitHub
Pages + Actions, siehe `.github/workflows/deploy-pages.yml`; muss einmalig
unter Settings → Pages → Source auf "GitHub Actions" gestellt werden,
danach deployt jeder Push nach `main` automatisch). Auf einem Tablet/Smartphone
öffnen und über den Browser "Zum Startbildschirm hinzufügen" installieren.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Zustand (State)
- IndexedDB via `idb` (Persistenz)
- `vite-plugin-pwa` (Service Worker, App-Shell-Precaching, Web-App-Manifest)
- Vitest (Unit-Tests der Domain-Schicht)

## Struktur

```
src/
  domain/   reine Berechnungslogik, framework-frei (keine React-Imports)
  store/    Zustand-Stores + IndexedDB-Persistenz (via idb)
  ui/       React-Komponenten/Screens
```

Die Domain-Schicht (`src/domain/`) ist bewusst von React entkoppelt und
vollständig unit-getestet:

- `types.ts` — Domänenmodell (Aircraft, Flight, Leg, FuelPlan,
  MassBalance, RunwayCalc, Frequencies, WeatherInfo, ...). Zeiten werden
  ausschließlich als UTC-Minuten seit Mitternacht gespeichert, nie als
  `Date`.
- `navigation.ts` — Winddreieck (WCA/GS), Kurskette (TC→TH→MH→MC),
  Zeiten-/ETO-Kette, Re-Estimate nach ATO.
- `fuel.ts` — Mindestbedarf, sichere Flugzeit, Warnung bei knappem Vorrat.
- `massBalance.ts` — Momentbildung, Schwerpunktlage, Point-in-Polygon-Prüfung
  gegen das CG-Envelope.
- `runway.ts` — Start-/Landestrecke: Tabelleninterpolation plus Zuschläge
  für Höhe, Temperatur, Wind, Neigung, Gras, Oberflächenzustand.
- `rounding.ts` / `format.ts` — einheitliche Rundungs- und
  Zeitformatierungskonventionen (Kurse: ganze Grad, Zeiten: ganze Minuten,
  Distanzen: eine Nachkommastelle, Massen: ganze Kilogramm; Anzeige immer
  `HH:MM`).

### Store & Persistenz (`src/store/`)

- `db.ts` — dünner IndexedDB-Wrapper (via `idb`) mit zwei Object Stores
  (`aircraft`, `flights`). Keine Berechnungslogik, nur CRUD.
- `aircraftStore.ts` — Zustand-Store für Flugzeugmuster: anlegen,
  bearbeiten, duplizieren, löschen. Muster sind unabhängig vom Flug
  gespeichert.
- `flightStore.ts` — Zustand-Store für die Flugliste + den aktuell
  geöffneten Flug. Jede Mutation (Leg ändern, ATO erfassen, ...) läuft über
  `patchCurrentFlight` und schreibt **sofort** nach IndexedDB — kein
  Debounce, kein separater Speichern-Schritt, damit ein Absturz oder
  Reload im Flug keine ATOs verliert.
- Getestet mit `fake-indexeddb` unter Vitest (Node-Umgebung), inklusive
  Crash-/Reload-Sicherheit von ATO-Einträgen.

### Bildschirm 1: Flugdurchführung (`src/ui/flight-execution/`)

Die Kernansicht, die im Flug offen ist — eine Zeile pro Kontrollpunkt mit
genau den Spalten, die im Flug gebraucht werden: Kontrollpunkt,
Sicherh.-Höhe, MH, Zeit (Abschnitt/Rest), ETO, ATO.

- `useFlightExecutionViewModel.ts` — verknüpft den aktuellen Flug mit
  `computeFlightLegs`/`reEstimateLegs`/`checkFuelPlan` und leitet die
  aktive Zeile, die Re-Estimate-Deltas und die Warnschwellen ab. Nichts
  davon wird gespeichert.
- `LegTable.tsx`/`LegRow.tsx` — die aktive Zeile (nächster
  anzufliegender Kontrollpunkt) ist hervorgehoben und bleibt beim Scrollen
  zusammen mit der Kopfzeile oben fixiert (`position: sticky`). Tap auf den
  Kontrollpunktnamen klappt die Detailwerte auf (TC, WCA, MC, rwK, Wind,
  VAR, TAS, GS, Distanz Abschnitt/gesamt, Flughöhe, Bemerkungen).
- `AtoCell.tsx` — ein Tap auf "Überflug" trägt die aktuelle UTC-Zeit als
  ATO ein und schaltet zur nächsten Zeile weiter; ein bereits erfasstes
  ATO lässt sich per Long-Press manuell korrigieren.
- `RemainingHud.tsx` — Restzeit, Restdistanz und die laufende UTC-Uhr,
  fest am unteren Bildschirmrand, unabhängig vom Scrollstand.
- `ui/panels/` (geteilt mit Bildschirm 2) — Frequenzen, Wetter/Freigaben,
  Kraftstoff, Masse & Schwerpunkt, Start-/Landestrecke, AIP-Notizen. In
  Bildschirm 1 stecken sie hinter zugeklappten Accordions, damit sie im
  Flug nicht mit der Kerntabelle konkurrieren; in Bildschirm 2 sind es
  offene Formularabschnitte — dieselben Komponenten, nur anders gerahmt.
- Warnhinweise (rot, nur als Signal) erscheinen, wenn die geschätzte
  Restflugzeit die sichere Flugzeit überschreitet oder die geschätzte
  Ankunft nach Sonnenuntergang liegt.

Gestaltung: Nachtmodus (dunkel) ist Standard, ein Tagmodus mit sehr hohem
Kontrast lässt sich umschalten (`ui/theme/`). Alle Zahlenwerte stehen in
einer tabellarischen Monospace-Schrift. Im Flug bediente Elemente (Tabelle,
Überflug-Button) haben mindestens 56 px Touchziel; Formularfelder in den
Accordions sind bewusst klein und zurückhaltend, weil sie nur am Boden
gebraucht werden.

### Bildschirm 2: Planung (`src/ui/planning/`)

Am Schreibtisch: alle Formularabschnitte offen statt hinter Accordions —
hier wird geplant, nicht im Flug bedient.

- `FlightMetaForm.tsx` — Bezeichnung, Datum, Flugplätze, Muster, ETD/ATD,
  Übergangshöhe/-level, Sonnenuntergang, optionale Koordinaten des
  Startflugplatzes (Basispunkt für die Großkreisrechnung des ersten Legs).
- `GlobalDefaultsForm.tsx` — TAS/Wind/VAR einmal global setzen.
- `LegList.tsx`/`LegEditorRow.tsx` — Legs anlegen, umbenennen, löschen,
  umsortieren (Drag-and-Drop **und** Auf/Ab-Buttons, weil natives
  HTML5-Drag-and-Drop für sich genommen nicht tastaturbedienbar ist). Pro
  Leg optional Koordinaten; ein Button leitet TC/Distanz per
  `domain/greatCircle.ts` (Haversine + Anfangspeilung) aus der Koordinate
  dieses Punkts und der des vorherigen Punkts ab. TAS/Wind/VAR sind pro
  Leg über Checkboxen überschreibbar — deaktiviert, erbt der Leg wieder
  den globalen Wert; aktiv weichende Legs sind als "(weicht ab)"
  gekennzeichnet.
- `AircraftManager.tsx`/`AircraftForm.tsx` — Flugzeugmuster anlegen,
  bearbeiten, duplizieren, löschen; unabhängig vom einzelnen Flug
  gespeichert (auch ohne offenen Flug erreichbar, z.B. von der Flugliste
  aus). Dynamische Listeneditoren für CG-Envelope-Punkte und
  Start-/Landestreckentabellen.
- Der Pflichthinweis ("Hilfsmittel für die Planung, ersetzt keine
  amtlichen Unterlagen") steht als Fußzeile am Ende der Ansicht.

Ein neu angelegter Flug öffnet zuerst die Planung; sobald er Legs hat,
öffnet er beim nächsten Mal direkt in der Flugdurchführung. Beide
Bildschirme lassen sich jederzeit über die Kopfzeile wechseln.

### Export/Import und Druckansicht

- `store/exportImport.ts` — reine Serialisierung/Validierung (kein DOM):
  `serializeAircraft`/`serializeFlight` bauen ein JSON mit
  `{kind, version, data}`; `parseAircraftImport`/`parseFlightImport`
  akzeptieren sowohl dieses Format als auch ein "nacktes" Objekt, prüfen
  die Pflichtfelder und werfen `ImportValidationError` mit einer
  verständlichen Fehlerliste, sonst. Die `id` wird beim Import immer
  verworfen und neu vergeben — ein Import überschreibt nie ein
  bestehendes Muster/Flug.
- `ui/lib/fileIO.ts` — DOM-Gegenstück: Datei herunterladen
  (`downloadJsonFile`) bzw. eine ausgewählte Datei einlesen
  (`readFileAsText`). "Exportieren"/"…importieren" gibt es in der
  Flugzeugmuster-Verwaltung und in der Planungsansicht.
- `ui/print/PrintView.tsx` — eine eigenständige, immer im Hintergrund
  gerenderte A4-Seite (`.print-only`/`.no-print` in `index.css`), die nur
  bei `window.print()` sichtbar wird. Bewusst in festen
  Schwarz-auf-Weiß-Farben statt der Theme-Variablen, damit der Ausdruck
  unabhängig vom Nacht-/Tagmodus lesbar bleibt. Zeigt alle
  Leg-Detailspalten (TC, MH, Wind, VAR, TAS, GS, Distanz, Zeit, ETO, ATO,
  Flughöhe, Bemerkungen) plus Kraftstoff-/Massen-/Streckenzusammenfassung
  und Frequenzen — der Pflichthinweis steht auch hier noch einmal in der
  Fußzeile.

**PWA-Offlinefähigkeit verifiziert:** Mit Playwright (`context.setOffline(true)`,
also vollständig gekapptes Netzwerk) neu geladen, lädt die App
ausschließlich aus dem Service-Worker-Cache und ein kompletter
Anlegen-Flow (Muster + Flug + Legs über IndexedDB) läuft ohne jeden
Netzzugriff durch.

## Entwicklung

```bash
npm install
npm run dev       # Dev-Server
npm run build     # Produktionsbuild inkl. Service Worker
npm run lint      # oxlint
npx vitest run    # Unit-Tests
```

## Status

- **Phase 1 (abgeschlossen):** Projektgerüst (Vite/React/TS/Tailwind/PWA)
  und vollständige Domain-Schicht mit Tests.
- **Phase 2 (abgeschlossen):** Zustand-Stores + IndexedDB-Persistenz
  (Aircraft- und Flight-CRUD, sofortiges Autosave, Re-Estimate-taugliches
  Leg-Override-Modell mit globalen Flugstandardwerten).
- **Phase 3 (abgeschlossen):** Bildschirm 1 (Flugdurchführung) inklusive
  ATO-Erfassung, Re-Estimate-Anzeige, Warnhinweisen, Nacht-/Tagmodus und
  den Accordion-Formularabschnitten.
- **Phase 4 (abgeschlossen):** Bildschirm 2 (Planung) mit Leg-Verwaltung
  (anlegen/umbenennen/umsortieren/löschen, Großkreisrechnung aus
  Koordinaten), globalen Standardwerten mit Override-Kennzeichnung pro
  Leg, und vollständiger Flugzeugmuster-Verwaltung.
- **Phase 5 (abgeschlossen):** PWA-Verifikation (per Playwright mit
  vollständig gekapptem Netzwerk bestätigt: App lädt aus dem
  Service-Worker-Cache und IndexedDB-Schreibzugriffe funktionieren ohne
  jede Verbindung), Export/Import einzelner Flüge und Flugzeugmuster als
  JSON-Datei, Druckansicht als eigenständige A4-Seite im
  Papierformular-Layout.

Die App ist damit funktional vollständig gemäß Auftrag.
