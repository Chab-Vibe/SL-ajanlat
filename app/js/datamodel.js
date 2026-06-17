/* =====================================================================
   Adatmodell – a CSV-ből generált window.SL_PRICE_ROWS sorokból építi fel
   azokat a struktúrákat (termékek, opciók, ár-lookup táblák), amiket a
   katalógus és az árazás használ.  Egyetlen forrás: arak_strukturalt.csv.
   ===================================================================== */
(function () {
  const ROWS = window.SL_PRICE_ROWS || [];
  // oszlopindexek
  const G = 0, PROFIL = 1, MERET = 2, VAST = 3, FELULET = 4, SZIN = 5, AR = 6;

  const LEMEZ_GYARTO = ['Lengyel', 'Saját gyártás', 'MS'];

  // teríték-szélesség pótlás azokhoz a lemezekhez, ahol a CSV-ben nincs méret
  const WIDTH_FALLBACK = {
    'T-8 saját gyártás': 1.18, 'T-14 saját gyártás': 1.10, 'T-18 saját gyártás': 1.15, 'T-35 saját gyártás': 1.05,
    'T-8 MS': 1.18, 'T-20 MS': 1.12, 'T-38 MS': 1.10, 'T-45 MS': 1.05, 'T-50 MS': 1.08
  };

  const normVast = v => String(v || '').replace('.', ',').trim();
  const uniqPush = (arr, v) => { if (v !== '' && v != null && arr.indexOf(v) < 0) arr.push(v); };

  function parseWidth(meret, profil) {
    const m = String(meret || '').match(/([0-9]+(?:[.,][0-9]+)?)/);
    if (m) return parseFloat(m[1].replace(',', '.'));
    return WIDTH_FALLBACK[profil] != null ? WIDTH_FALLBACK[profil] : 1.0;
  }

  const isTrapez = profil => String(profil || '').trim().toUpperCase().charAt(0) === 'T';

  // ---- LEMEZ (trapéz + cserepes) ----
  // byProduct[key] = { thicknesses:[], combos:{ vastagsag: { felulet: [szin] } } }
  // A felület a vastagságtól, a szín a vastagság+felülettől függ – így csak a
  // CSV-ben ténylegesen létező kombinációkat lehet választani.
  function buildSheet(filterTrapez) {
    const products = [], prodSeen = {}, surfaces = [], thicknesses = [], colors = [], price = {}, byProduct = {};
    ROWS.forEach(r => {
      if (LEMEZ_GYARTO.indexOf(r[G]) < 0) return;
      if (isTrapez(r[PROFIL]) !== filterTrapez) return;
      const key = r[G] + '|' + r[PROFIL];
      if (!prodSeen[key]) {
        prodSeen[key] = true;
        const name = (r[G] === 'Lengyel') ? r[PROFIL] + ' (Lengyel)' : r[PROFIL];
        products.push({ name: name, key: key, width: parseWidth(r[MERET], r[PROFIL]) });
        byProduct[key] = { thicknesses: [], combos: {} };
      }
      const th = normVast(r[VAST]);
      uniqPush(thicknesses, th);
      uniqPush(surfaces, r[FELULET]);
      uniqPush(colors, r[SZIN]);
      price[key + '|' + th + '|' + r[FELULET]] = r[AR];
      const bp = byProduct[key];
      uniqPush(bp.thicknesses, th);
      (bp.combos[th] = bp.combos[th] || {});
      (bp.combos[th][r[FELULET]] = bp.combos[th][r[FELULET]] || []);
      uniqPush(bp.combos[th][r[FELULET]], r[SZIN]);
    });
    return { products, surfaces, thicknesses, colors, price, byProduct };
  }

  // ---- CSATORNA ----
  function buildCsatorna() {
    const sizes = [], finishes = [], items = [], price = {};
    ROWS.forEach(r => {
      if (r[G] !== 'Csatorna') return;
      uniqPush(sizes, r[MERET]);
      uniqPush(finishes, r[FELULET]);
      uniqPush(items, r[PROFIL]);
      price[r[MERET] + '|' + r[FELULET] + '|' + r[PROFIL]] = r[AR];
    });
    return { sizes, finishes, items, price };
  }

  // ---- KERÍTÉSELEM ----  (típus = profil [+ felulet, ha nem általános])
  const KER_GENERIC = ['', 'Famintás / RAL / MATT'];
  function buildKerites() {
    const types = [], byType = {}, price = {};
    ROWS.forEach(r => {
      if (r[G] !== 'Kerítéselem') return;
      const type = KER_GENERIC.indexOf(r[FELULET]) >= 0 ? r[PROFIL] : r[PROFIL] + ' – ' + r[FELULET];
      uniqPush(types, type);
      (byType[type] = byType[type] || []);
      uniqPush(byType[type], r[MERET]);
      price[type + '|' + r[MERET]] = r[AR];
    });
    return { types, byType, price };
  }

  // ---- SZENDVICSPANEL ----
  // A panel üzleti szabályai (fix szélesség, alap hosszak, szín-készlet, skin-jelzés)
  // típusonként, kódból. Az árak (típus|vastagság) a CSV-ből jönnek; a szín az árat
  // nem befolyásolja. RAL típusoknál a szín = az MS lemezek Fényes színkészlete.
  function buildPanel() {
    const types = [], thicknesses = [], colors = [], price = {}, felar = [], meta = {};
    // MS lemezek választható Fényes színei
    const msFenyes = [];
    ROWS.forEach(r => { if (r[G] === 'MS' && r[FELULET] === 'Fényes') uniqPush(msFenyes, r[SZIN]); });

    ROWS.forEach(r => {
      if (r[G] !== 'Szendvicspanel') return;
      if (/fel[aá]r/i.test(r[PROFIL])) { felar.push({ band: r[MERET], ar: r[AR] }); return; }
      uniqPush(types, r[PROFIL]);
      uniqPush(thicknesses, r[MERET]);
      uniqPush(colors, r[SZIN]);
      price[r[PROFIL] + '|' + r[MERET]] = r[AR];
    });

    types.forEach(t => {
      const kind = /tető/i.test(t) ? 'teto' : (/famint/i.test(t) ? 'famintas' : 'oldal');
      const base = {
        teto:     { width: 1,    lengths: [6, 7.5], defaultColor: 'Ral7016', skin: 'Ral7016: 0,4 mm / Ral9002: 0,35 mm', colors: msFenyes.slice() },
        oldal:    { width: 1,    lengths: [4, 5, 6], defaultColor: 'Ral9002', skin: '0,35 mm', colors: msFenyes.slice() },
        famintas: { width: 1.13, lengths: [4, 5, 6], defaultColor: 'Dió',     skin: '',        colors: ['Dió', 'Aranytölgy'] }
      }[kind];
      meta[t] = base;
    });
    return { types, thicknesses, colors, price, felar, meta };
  }

  window.SL_DATA = {
    trapez: buildSheet(true),
    cserepes: buildSheet(false),
    csatorna: buildCsatorna(),
    kerites: buildKerites(),
    panel: buildPanel()
  };
})();
