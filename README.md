# Krilix Talk — Supabase Phase 2

## Benne van

- valódi regisztráció és belépés
- valódi profil szerkesztés: név, avatar, státusz
- valódi üzenetek
- olvasatlan számláló a chatlistában
- `Látta` jelzés a saját üzeneteidnél
- valós reakciók adatbázisban
- valós válaszok
- valós üzenet szerkesztés
- valós kitűzés
- képek és fájlok feltöltése privát Supabase Storage bucketbe
- közös média és közös fájlok panel

## Kötelező lépés frissítés előtt

A Supabase SQL Editorban futtasd le egyszer:

```text
phase2-migration.sql
```

Ez meglévő Phase 1 adatbázisra készült, nem kell törölni semmit.

## Indítás

```powershell
cd "AZ_ÚTVONAL\krilix-talk-supabase-phase2"
npm install
npm run dev
```

## Tesztelés

1. Két külön böngészőben vagy inkognitóban jelentkezz be két külön userrel.
2. Küldj szöveget.
3. Küldj képet vagy fájlt.
4. Reagálj üzenetre.
5. Válaszolj, szerkessz, tűzz ki.
6. Nézd meg az olvasatlan számlálót és a `Látta` jelzést.


## Üzenetbetöltési javítás

Ebben a buildben az üzenetek kapcsolt adatai külön lekérésekkel töltődnek be, így nem függnek a PostgREST relációs séma-cache frissülésétől.


## Kép/fájl küldési javítás

Ha a korábbi Phase 2 verzióban `messages_body_check` hibát kaptál kép küldésekor,
futtasd le egyszer a Supabase SQL Editorban:

```text
attachment-body-fix.sql
```

Ez engedélyezi, hogy kép vagy fájl szöveg nélkül is elküldhető legyen.


## Fájlnév tördelési javítás

Ez a build javítja a hosszú fájlnevek kilógását:
- üzenetbuborékban
- válasz előnézetben
- jobb oldali közös fájlok panelen


## Phase 3 — live jelenlét és gépelésjelző

Ebben a buildben:
- a zöld pötty már valódi online jelenlétből jön
- offline felhasználónál szürke pötty látszik
- a beszélgetés fejlécében látszik, hogy a másik fél tényleg online van-e
- gépelés közben a másik fél azonnal látja a gépelésjelzőt

Ehhez nem kell új SQL migráció: Supabase Realtime Presence és Broadcast csatornákat használ.


## Gépelésjelző crash javítás

Ez a build javítja azt a hibát, amikor üzenetküldés után a fogadó oldalon fehér képernyő jelent meg.


## Phase 3.5 — PWA + értesítések

Ebben a buildben:
- telepíthető PWA lett a Krilix Talk
- saját ikonokat és web manifestet kapott
- van service worker és offline app-shell cache
- a bal felső profilblokkban megjelenik az `Értesítések` gomb
- ha az oldal nyitva van, de nincs fókuszban, új üzenetnél rendszerértesítést küld
- ha a böngésző felajánlja, megjelenik a `Telepítés` gomb

Fontos:
- a mostani értesítés még csak akkor működik, ha az app meg van nyitva a böngészőben
- teljes push értesítéshez, ami bezárt appnál is érkezik, külön Web Push előfizetés + szerver/Edge Function kell


## PWA ablak elrendezési javítás

Ez a build javítja, hogy telepített appablakban ne maradjon üres jobb oldali sáv:
- 1280 px alatt a jobb infópanel automatikusan eltűnik
- a chat kitölti a felszabaduló helyet
- keskeny appablaknál kompaktabb fejlécet használ


## Infópanel javítás

Ebben a buildben:
- a fejlécben lévő `i` gombbal nyitható és zárható az infópanel
- az infópanelen van külön bezáró gomb
- keskenyebb appablakban nem tűnik el végleg, hanem oldalsó drawer-ként nyílik meg
- 1100 px alatt a chat nem hagy üres helyet a panelnek


## Full Pack 1

Új funkciók:
- beszélgetés keresése
- üzenet keresése és találatkiemelés
- kedvencek
- archiválás
- némítás
- beszélgetés törlése nálad
- saját üzenet törlése
- profilkép feltöltése
- némított beszélgetés nem küld böngészőértesítést

Kötelező migráció:
```text
fullpack1-migration.sql
```


## Full Pack 2

Új funkciók:
- valódi csoportos chat backenddel
- új csoport létrehozása több taggal
- tag hozzáadása
- tag eltávolítása
- owner / admin / tag szerepkörök
- tulajdonosi adminná emelés és visszavétel
- csoportnév és csoportkép szerkesztése
- saját Krilix törlő modálok a böngészős felugrók helyett
- diszkrétebb egyedi scrollbarok
- fix port: `npm run dev` és `npm run preview` is `5173`-on fut

Kötelező migráció:
```text
fullpack2-migration.sql
```


## Full Pack 3

Új funkciók:
- valódi hangüzenet mikrofonról
- drag and drop fájlküldés
- képgaléria / lightbox
- üzenet továbbítása másik beszélgetésbe
- emoji picker
- GIF picker
- matrica picker
- link előnézet alapból domain-kártyával
- opcionális gazdag link preview Supabase Edge Functionnel

Kötelező migráció:
```text
fullpack3-migration.sql
```

### Gazdag link preview
A kliens működik Edge Function nélkül is, ilyenkor a linkekből egy alap domain-kártya készül.
Ha teljes Open Graph előnézetet szeretnél képpel, címmel és leírással, deployold ezt a függvényt:

```text
supabase/functions/link-preview/index.ts
```

A kliens már automatikusan meghívja a `link-preview` függvényt, ha létezik.


## Full Pack 4

Új funkciók:
- jelszó-visszaállítás
- beállítások panel
- sötét / világos mód
- utoljára aktív jelzés
- jobb mobilos chatnézet vissza gombbal
- kijelentkezés ezen az eszközön / minden más eszközről / minden eszközről
- felhasználó tiltása és tiltás feloldása
- bezárt appnál is működő Web Push rendszer előkészítve
- gazdag link preview Edge Function továbbra is benne van

Kötelező migráció:
```text
fullpack4-migration.sql
```

### Jelszó-visszaállítás

Supabase-ben az Auth redirect URL-ekhez add hozzá:
```text
http://localhost:5173/?reset=1
```

### Valódi push értesítés bezárt appnál is

A kód kész, de kell hozzá egyszeri Supabase-konfiguráció:

1. Generálj VAPID kulcsokat:
```powershell
npm run vapid
```

2. A kapott `Public Key` értéket írd be a projekt `.env` fájljába:
```text
VITE_VAPID_PUBLIC_KEY=...
```

3. Supabase-ben állítsd be az Edge Function secretjeit:
```text
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

4. Deployold az Edge Functiont:
```text
supabase/functions/send-push/index.ts
```

5. A link preview teljes bekötéséhez deployold ezt is:
```text
supabase/functions/link-preview/index.ts
```

A `send-push` funkciót az app minden új üzenet után meghívja. Ha a funkció nincs még deployolva, a chat továbbra is működik, csak a bezárt appos push nem.


## Full Pack 5

Új funkciók:
- valódi privát hanghívás WebRTC-vel
- valódi privát videóhívás WebRTC-vel
- képernyőmegosztás videóhívás közben
- bejövő hívás modál
- hívás overlay
- némítás / kamera ki-be / hívás bontása
- jobb desktopra előkészített vizuális réteg

Kötelező migráció:
```text
fullpack5-migration.sql
```

### Hívások
A hívások jelenleg privát beszélgetésekben működnek.  
A jelzés Supabase Realtime broadcaston megy, a média WebRTC-n.

### Fontos
Lokális tesztnél és sok otthoni hálózaton a beépített STUN szerver elég lehet.
Éles használathoz később TURN szervert is érdemes bekötni, hogy szigorúbb NAT-ok mögött is stabil legyen a kapcsolat.


## Desktop Pack 1 + Mobile Rebuild

Új funkciók:
- Electron desktop shell alap
- desktop fejlesztői indítás
- Windows telepítő build script
- tálcaikon alap és ablak elrejtése bezáráskor
- a drag & drop fájlküldés megmaradt
- teljes mobil responsive újrarakás:
  - chatlista telefonon teljes képernyőn
  - chat megnyitva telefonon teljes képernyőn
  - nincs több fél üres oldalsáv
  - javított mobil fejléc
  - javított üzenetbuborék-szélesség
  - javított alsó composer
  - infópanel telefonon külön overlayként nyílik
  - dinamikus mobil viewport magasság és safe-area támogatás

### Desktop app indítás fejlesztői módban

```powershell
npm install
npm run desktop:dev
```

### Windows telepítő készítése

```powershell
npm install
npm run desktop:dist
```

A kész telepítő a `release` mappába kerül.

### Megjegyzés

A desktop csomagolás ugyanazt a Supabase production backendet használja, mint a webes verzió.  
A Windows telepítő készítése Windows gépen a legegyszerűbb.


## Desktop Pack 2

Új funkciók és javítások:
- státusz szinkron javítás: Elérhető / Elfoglalt / Távol most már a másik oldalon is megjelenik
- offline esetben utoljára aktív jelzés marad
- státusz megjelenés egységesítve: chatlista, fejléc, infópanel
- Electron alapmenü eltüntetése
- saját Krilix ikon alap az ablakhoz / trayhez / installerhez
- szebb tray menü: Megnyitás, Elrejtés, Újraindítás, Kilépés
- ablakméret és ablakpozíció megjegyzése
- natív desktop értesítés előkészítve és bekötve
- beállításokban Desktop app szekció:
  - induljon Windowszal
  - bezáráskor tálcára menjen
  - natív értesítések
  - app újraindítása
  - kilépés teljesen
- auto-update előkészítéshez bekerült az electron-updater dependency és publish váz
- SETUP-ENV.txt bekerült, .env nem kerül a ZIP-be

Fontos:
A Desktop Pack 2-t még kézzel telepíteni kell, mert ebben van az updater-alap.
A későbbi desktop csomagoknál már lehet appon belüli frissítést használni, ha GitHub Releases vagy más update endpoint be van kötve.


## Desktop Pack 2.1 — status hotfix

Javítások:
- a régi `Online most` szöveg teljesen kikerült a kódból
- online állapotnál most a profil státusza jelenik meg:
  - Elérhető
  - Elfoglalt
  - Távol
- offline állapotnál marad az utoljára aktív jelzés
- Electron production módban mindig a Netlify appot nyitja, cache-busting paraméterrel
- Electron induláskor törli a régi service worker / cache adatokat, hogy ne ragadjon be régi Netlify build
- verzió: 1.1.1

Fontos:
Ezt a javítást Netlifyra is fel kell tölteni, és a Windows appot is újra kell telepíteni.


## Desktop Pack 3 — Auto-update Pack

Új funkciók:
- GitHub Releases alapú desktop auto-update
- `electron-updater` runtime bekötés
- frissítés keresése induláskor kapcsolóval
- Beállítások → Desktop app:
  - frissítés keresése
  - frissítés letöltése
  - újraindítás és telepítés
  - frissítési státusz
- Tray menüben frissítés keresése
- GitHub Actions workflow:
  - tag push-ra Windows telepítő és release generálás
- `DESKTOP-UPDATE.md` részletes használati útmutató
- verzió: 1.2.0

Fontos:
A Desktop Pack 3-at még egyszer kézzel telepíteni kell.
A későbbi desktop verziók már az appon belüli frissítővel frissíthetők, ha a GitHub Release elkészült.
