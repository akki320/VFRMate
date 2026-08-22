# VFRMate

Offlinefähige Progressive Web App für den deutschen Flugdurchführungsplan
VFR — Planung am Schreibtisch, Nutzung im Cockpit. Kein Backend, keine
Anmeldung, keine Cloud: alle Daten bleiben lokal auf dem Gerät.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Zustand (State) — folgt in einer späteren Phase
- IndexedDB via `idb` (Persistenz) — folgt in einer späteren Phase
- `vite-plugin-pwa` (Service Worker, App-Shell-Precaching, Web-App-Manifest)
- Vitest (Unit-Tests der Domain-Schicht)

## Struktur

```
src/
  domain/   reine Berechnungslogik, framework-frei (keine React-Imports)
  store/    Zustand-Stores + IndexedDB-Persistenz (via idb)
  ui/       React-Komponenten/Screens (folgt)
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

Die UI-Bildschirme (Flugdurchführung, Streckenplanung, Masse & Schwerpunkt,
Start-/Landestrecke, Kraftstoff, Frequenzen/Wetter) sowie PWA-Feinschliff,
Export/Import und Druckansicht folgen in den nächsten Phasen.
