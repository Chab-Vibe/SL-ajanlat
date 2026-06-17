# SL Lemezkereskedés – Árajánlat készítő

Egyetlen, telepítés nélküli webes alkalmazás az árajánlatok egységes készítéséhez.

## Indítás
Nyisd meg az **`app/index.html`** fájlt egy böngészőben (Chrome / Edge) – dupla kattintás elég,
nem kell internet és nem kell telepíteni semmit.

## Használat
1. **Megrendelő típusa**: Magánszemély vagy Cég. Cég esetén a lemeztermékekre **fordított ÁFA**
   érvényes (a 27% nem kerül felszámításra, a bruttó = nettó), és az ajánlaton megjelenik a megfelelő
   jogszabályi megjegyzés.
2. Add meg a megrendelő nevét, telefonszámát, szállítási címét (cégnél adószámát) → **Ajánlat indítása**.
3. **Termék hozzáadása**: válassz termékcsaládot (trapéz, cserepes, kerítés trapéz, kerítéselem,
   csatorna, szendvicspanel). Egy ajánlathoz **több termék** is felvehető – pl. ha trapézt indítottál,
   de csatorna is kell, csak add hozzá; a meglévő tételek megmaradnak.
4. Töltsd ki a mezőket (méretek, db). Az egységár az árlistából töltődik, de **kézzel felülírható**.
   Lemeztételekhez **tartozékok** (csavar, szegő, fólia, kiszállítás stb.) is adhatók.
5. **Ajánlat megtekintése / nyomtatás** → tiszta A4-es ajánlat. A „Nyomtatás / PDF mentés" gombbal
   nyomtathatod vagy PDF-be mentheted (a böngésző nyomtatás ablakában „Mentés PDF-ként").

A megrendelő típusa **menet közben is váltható** a szerkesztőben (a felső kártya
„Magánszemély / Cég" kapcsolójával) – az árak azonnal újraszámolódnak.

A folyamatban lévő ajánlat automatikusan mentődik a böngészőben (oldalfrissítés után visszatölthető).
Új ajánlathoz használd a fejléc **Új ajánlat** gombját.

## Fordított ÁFA (cég esetén)
Fordított ÁFA-s (cégnél 0% felszámított ÁFA, bruttó = nettó): **trapézlemez, cserepes/korcolt
lemez, élhajlítás**. Minden más (kerítés, kerítéselem, csatorna, szendvicspanel) **27%**.
Ez családonként a [js/catalog.js](js/catalog.js) `reverseVatEligible` kapcsolójával módosítható.

## Élhajlítás
Az ár a **teríték (kiterített szélesség, cm)** szerinti folyóméter-ár (sávtábla a
[data/prices.js](data/prices.js) `elhajlitasBands` részében). Famintás +20%, egyedi méret +20%
(mindkettő +30%). Választható kész profil (oromszegő, kúpos 14×14, 19,3×19,3 stb.) vagy
**Egyedi hajtás** saját megnevezéssel; az egységár kézzel is felülírható.

**Metszet-rajz:** minden hajtásnál feltölthető kép („Kép…" gomb) – ez kerül az ajánlatra is.
Ha a visszatérő profilokhoz fix metszet-rajzot szeretnél, tedd a képet ide:
`app/assets/elhajlitas/<azonosító>.png` (pl. `oromszego-standard.png`, `kupos-14x14.png`),
és a program automatikusan megjeleníti.

## Árak frissítése  (EGY forrás: a CSV)
Az összes ár a fő mappában lévő **`arak_strukturalt.csv`** fájlban van (megnyitható
Excelben / LibreOffice-ban). Oszlopok: `gyarto;profil;meret;vastagsag;felulet;szin;ar_ft_per_m2`.
Minden ár **nettó** forint. Az ár oszlop: lemez és panel → Ft/m², csatorna és kerítéselem → Ft/db.

Frissítés menete:
1. Írd át az árakat a **`arak_strukturalt.csv`**-ben, mentsd.
2. A fő mappában futtasd: **`python build_prices.py`** – ez újragenerálja az `app/data/prices.js`-t.
3. A böngészőben frissíts (F5).

> Az `app/data/prices.js` GENERÁLT fájl – ne szerkeszd kézzel, mindig a CSV-t módosítsd.
> A nem CSV-alapú adatok (élhajlítás díjsávok és profilok, tartozékok, ÁFA-kulcs) a
> `build_prices.py` tetején állíthatók.

A fordított ÁFA jogosultság családonként a [js/catalog.js](js/catalog.js) `reverseVatEligible`
kapcsolójával állítható (alap: trapéz, cserepes/korcolt, élhajlítás → fordított; a többi 27%).
