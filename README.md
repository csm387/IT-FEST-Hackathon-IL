# ⚡ GridPulse — Every Watt Matters

### Energia ta solară, sub control.

**GridPulse** este o platformă web pentru monitorizarea, organizarea și optimizarea instalațiilor fotovoltaice. Reunește informațiile despre producția și consumul de energie, baterii, costuri, mentenanță, asigurări și suport într-un singur loc.

Proiectul a fost realizat de echipa noastră în cadrul **ITFest 2026**, ca răspuns la o problemă reală: informațiile importante despre o instalație solară sunt adesea distribuite între mai multe aplicații, documente și furnizori.

🌐 **[Încearcă GridPulse](https://gridpulse1.lovable.app/)** · 🏆 **[ITFest](https://itfest.sisc.ro/)**

---

## 📑 Cuprins

- [Despre participarea la ITFest](#-despre-participarea-la-itfest)
- [Problema pe care o rezolvăm](#-problema-pe-care-o-rezolvăm)
- [Soluția GridPulse](#-soluția-gridpulse)
- [Funcționalități](#-funcționalități)
- [Cum funcționează](#-cum-funcționează)
- [Tehnologii și dezvoltare](#-tehnologii-și-dezvoltare)
- [Instalare locală](#-instalare-locală)
- [Demo și deployment](#-demo-și-deployment)
- [Limitări și direcții viitoare](#-limitări-și-direcții-viitoare)
- [Echipa și resurse](#-echipa-și-resurse)

## 🏆 Despre participarea la ITFest

Am participat la **ITFest**, eveniment dedicat dezvoltării competențelor tehnice, colaborării și transformării ideilor în proiecte practice. În cadrul participării noastre, am ales să dezvoltăm **GridPulse**, o soluție digitală pentru o gestionare mai simplă a energiei solare.

Obiectivul nostru a fost să propunem o experiență coerentă atât pentru persoanele care dețin o instalație fotovoltaică, cât și pentru firmele care gestionează mai multe instalații. Proiectul reflectă munca noastră de echipă, de la definirea problemei și conturarea funcționalităților până la construirea unei aplicații web care poate fi prezentată și explorată.

**Context:** ITFest 2026 · **Proiect:** GridPulse · **Tip:** Aplicație web / prototip dezvoltat în context de hackathon

## 🎯 Problema pe care o rezolvăm

Deținerea sau administrarea unei instalații fotovoltaice implică mai mult decât verificarea producției de energie. Utilizatorii trebuie să urmărească, deseori separat:

- câtă energie produc, consumă, stochează sau livrează în rețea;
- starea bateriei și oportunitățile de economisire;
- prețurile energiei, tarifele și estimările de cost;
- reviziile, documentele, asigurările și solicitările de suport;
- situația mai multor instalații și intervențiile necesare, în cazul firmelor.

**Ideea GridPulse:** un punct central din care utilizatorii să poată înțelege mai ușor datele și să ia decizii informate privind energia solară.

## 💡 Soluția GridPulse

GridPulse propune **două experiențe adaptate tipului de utilizator**:

| Individual — proprietari și prosumatori | Business — instalatori și firme O&M |
| --- | --- |
| Monitorizarea producției, consumului și energiei schimbate cu rețeaua | Vizualizarea unui portofoliu de instalații |
| Urmărirea bateriei și a informațiilor meteo | Hartă și perspectivă centralizată asupra clienților |
| Planificarea energiei în funcție de tarife | Alerte și organizarea intervențiilor |
| Mentenanță, asigurări și suport într-un singur loc | Istoric de service, costuri și documente relevante |

> **O&M** = *Operations & Maintenance* — operarea și mentenanța instalațiilor.

## ✨ Funcționalități

Funcționalitățile de mai jos descriu modulele și experiența prezentate de platforma GridPulse. Disponibilitatea efectivă a fiecărui modul în demo poate depinde de autentificare, de datele adăugate și de serviciile externe conectate.

### ⚡ 1. Monitorizarea energiei

O imagine de ansamblu asupra fluxului energetic dintre **panourile fotovoltaice, baterie, locuință și rețeaua electrică**. Interfața pune accent pe indicatori precum energia produsă, autoconsumul și evoluția energiei în timp.

### 🔋 2. Gestionarea bateriei

Informații despre **starea de încărcare**, ciclurile de utilizare și planificarea încărcării. Scopul este o înțelegere mai bună a modului în care energia stocată poate fi utilizată eficient.

### 📊 3. Energie, prețuri și asistență AI

Platforma prezintă funcții de analiză energetică și planificare bazate pe **prețurile OPCOM**, tariful utilizatorului și informațiile disponibile despre instalație. Componenta AI este gândită pentru recomandări și explicații ușor de înțeles, nu pentru a înlocui verificarea contractelor sau deciziile tehnice ale utilizatorului.

### 🛠️ 4. Mentenanță

Un loc dedicat istoricului reviziilor, următoarelor programări și informațiilor de la producători, astfel încât activitățile de întreținere să fie mai ușor de urmărit.

### 🛡️ 5. Asigurări și documente

Organizarea polițelor, documentelor și informațiilor despre daune, împreună cu evidența termenelor importante și a expirărilor.

### 💬 6. Suport și comunicare

Gestionarea tichetelor și a contactelor pentru instalatori sau producători, inclusiv o experiență de comunicare care prezintă posibilitatea traducerii automate a mesajelor.

### 🏢 7. Administrarea mai multor instalații

Pentru conturile Business, GridPulse propune o vedere de ansamblu asupra portofoliului, cu informații despre instalații, alerte și organizarea activităților de service.

## 🚀 Cum funcționează

Fluxul de utilizare prezentat în aplicație este simplu:

1. **Creezi un cont** și alegi tipul de utilizator: **Individual** sau **Business**.
2. **Adaugi instalația** și detaliile echipamentelor relevante: panouri, invertor, baterie și contor.
3. **Conectezi sau introduci datele echipamentelor**, în funcție de producător și de opțiunile disponibile.
4. **Explorezi datele și modulele** pentru producție, consum, costuri, mentenanță și suport.

### Conectarea echipamentelor

În prezentarea platformei sunt menționate următoarele variante:

| Producător / categorie | Mod de integrare prezentat |
| --- | --- |
| **SolarEdge** | Conectare prin API, folosind o cheie API |
| **Huawei** | Integrare condiționată de aprobarea partenerului |
| **Alți producători** | Înregistrare manuală |

Aceste informații descriu opțiunile comunicate în interfața publică; funcționarea integrărilor depinde de configurare, permisiuni și disponibilitatea serviciilor furnizorilor.

## 🧰 Tehnologii și dezvoltare

Proiectul a fost realizat folosind **[Lovable](https://lovable.dev/)** pentru dezvoltarea aplicației web și este pregătit pentru un flux de lucru cu **GitHub**, **Node.js** și **npm**.

- **Lovable:** dezvoltarea și iterarea rapidă asupra aplicației.
- **Git / GitHub:** versionarea și colaborarea asupra codului.
- **Node.js și npm:** instalarea dependențelor și pornirea mediului local.
- **Integrări avute în vedere în produs:** date energetice, API-uri de producători, prețuri OPCOM și funcții AI.

**Notă pentru dezvoltatori:** lista exactă a framework-urilor, bibliotecilor și serviciilor utilizate de această versiune se verifică în fișierele proiectului (în special `package.json` și configurațiile pentru servicii). Nu toate integrările descrise la nivel de produs sunt neapărat active într-o instalare locală nouă.

## 💻 Instalare locală

### Cerințe

- [Node.js](https://nodejs.org/) și npm;
- Git;
- acces la acest repository.

### Pași

```bash
# 1. Clonează repository-ul
git clone https://github.com/csm387/IT-FEST-Hackathon-IL.git

# 2. Intră în directorul proiectului
cd IT-FEST-Hackathon-IL

# 3. Instalează dependențele
npm install

# 4. Pornește aplicația în modul development
npm run dev
```

Deschide apoi adresa locală afișată în terminal.

Dacă proiectul folosește variabile de mediu sau servicii externe, acestea trebuie configurate conform fișierelor și instrucțiunilor din repository. Nu publica niciodată chei API sau alte secrete în GitHub.

## 🌍 Demo și deployment

**Aplicația este disponibilă online:**

### 👉 [gridpulse1.lovable.app](https://gridpulse1.lovable.app/)

Poți accesa pagina de prezentare, consulta funcționalitățile produsului și explora fluxurile disponibile în aplicație. Pentru anumite secțiuni poate fi necesară autentificarea.


## 🔒 Siguranță și limitele platformei

GridPulse este un instrument de **monitorizare, informare și sprijin în luarea deciziilor**. Conform termenilor publicați în aplicație:

- platforma **nu controlează direct echipamentele** și **nu efectuează tranzacții de energie**;
- calculele, prognozele și recomandările AI sunt **orientative**;
- datele și integrarea cu terți pot depinde de disponibilitatea serviciilor și de accesul utilizatorului;
- deciziile financiare și tehnice trebuie verificate folosind documentele contractuale și datele oficiale.

## 🔮 Limitări și direcții viitoare

GridPulse poate fi extins treptat. Printre direcțiile de dezvoltare pe care le considerăm interesante se numără:

- integrarea cu mai mulți producători de invertoare și baterii;
- vizualizări și prognoze energetice mai detaliate;
- notificări proactive pentru mentenanță și situații neobișnuite;
- recomandări de optimizare a autoconsumului și stocării;
- funcții suplimentare pentru echipele care administrează portofolii mari de instalații;
- testare și validare cu date reale și feedback de la utilizatori.

*Acestea sunt direcții posibile de dezvoltare, nu promisiuni că toate sunt deja implementate.*

## 👥 Echipa și resurse

Acest repository documentează proiectul nostru **GridPulse**, realizat în contextul participării la **ITFest 2026**. Mulțumim organizatorilor pentru oportunitatea de a lucra împreună la o idee cu aplicabilitate practică.

**Membrii echipei:** 
- **[csm387](https://github.com/csm387)**
- **[calin87-KLN](https://github.com/calin87-KLN)**
- **[laura222](https://github.com/lauramaria16082007-prog)**
- **[MischieIoan](https://github.com/MischieIoan)**

### Linkuri utile

- **Demo GridPulse:** https://gridpulse1.lovable.app/
- **ITFest — site oficial:** https://itfest.sisc.ro/

---

<p align="center"><strong>⚡ GridPulse — Every Watt Matters.</strong><br />Un proiect dezvoltat în cadrul ITFest 2026.</p>
