# Două spații separate: Persoane fizice și Firme

## Ce se schimbă
La intrarea în aplicație alegi tipul de cont: **Individual** (prosumator cu o singură instalație) sau **Firmă** (companie O&M / instalator cu o flotă). Fiecare are propriul meniu, propriul dashboard și doar paginile de care are nevoie. Un comutator în bara de sus permite schimbarea între cele două (cât timp nu există conturi reale).

## Spațiul Individual
Meniu: Dashboard personal, Flux energie, Baterie, Prognoză, Recomandări, Finanțe, Mentenanța mea, Reglementări, Notificări.
- Dashboard simplificat pentru o singură casă: producție acum, consum, baterie, economii, recomandarea zilei, următoarea revizie.
- Fără hartă de flotă și fără liste de instalații.

## Spațiul Firmă
Meniu: Dashboard flotă, **Dispecerat**, Instalații, Centru O&M, Actualizări & mentenanță, Finanțe portofoliu, Notificări.
- **Dashboard flotă**: total kWp, instalații pe status, pierderi estimate, alerte deschise, top instalații slabe.
- **Dispecerat (nou)**: hartă pe tot ecranul cu instalațiile și echipele de tehnicieni (simulate), coadă de intervenții (Nouă / Alocată / Pe drum / Rezolvată), alocare tehnician dintr-un clic, filtru pe prioritate și regiune, click pe hartă deschide intervenția.
- Pagina actuală „Fleet map” este înlocuită de Dispecerat.

## Pagina de început
Două butoane clare: „Pentru casa ta” și „Pentru firme”, fiecare duce în spațiul potrivit.

## Detalii tehnice
- Două layout-uri separate: `_console` devine `/app` (individual) și `/business` (firmă), fiecare cu sidebar propriu; paginile existente sunt mutate/reutilizate.
- Tehnicieni și intervenții simulate adăugate în `src/lib/fleet.ts`; reguli de alocare (status intervenție) ca funcții pure cu teste.
- Harta Dispecerat reutilizează componenta Leaflet existentă, extinsă cu markere pentru echipe.
- Linkurile vechi (/dashboard, /map etc.) redirecționează spre noile adrese.
- Actualizare AGENTS.md cu noua structură.
