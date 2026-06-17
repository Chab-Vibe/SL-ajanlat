/* =====================================================================
   Termékkatalógus – a SL_DATA (CSV-ből épített) struktúrákból állítja össze
   a termékcsaládokat. Minden család hordozza a saját ár-lookup tábláját is.
   ===================================================================== */
(function () {
  const P = window.SL_PRICES;
  const D = window.SL_DATA;

  // kerítéselem: {típus: {méret: ár}} alak az árazáshoz / renderhez
  function keritesItems() {
    const out = {};
    D.kerites.types.forEach(t => {
      out[t] = {};
      (D.kerites.byType[t] || []).forEach(sz => { out[t][sz] = D.kerites.price[t + '|' + sz]; });
    });
    return out;
  }

  window.SL_CATALOG = {
    order: ['trapez', 'cserepes', 'elhajlitas', 'kerites_trapez', 'kerites_elem', 'csatorna', 'panel'],

    families: {
      trapez: {
        label: 'Trapézlemez', icon: '▤', type: 'sheet_m2', reverseVatEligible: true,
        products: D.trapez.products, surfaces: D.trapez.surfaces, thicknesses: D.trapez.thicknesses,
        colors: D.trapez.colors, price: D.trapez.price, byProduct: D.trapez.byProduct
      },
      cserepes: {
        label: 'Cserepes / korcolt lemez', icon: '▥', type: 'sheet_m2', reverseVatEligible: true,
        products: D.cserepes.products, surfaces: D.cserepes.surfaces, thicknesses: D.cserepes.thicknesses,
        colors: D.cserepes.colors, price: D.cserepes.price, byProduct: D.cserepes.byProduct
      },
      elhajlitas: {
        label: 'Élhajlítás', icon: '⌐', type: 'elhajlitas', reverseVatEligible: true,
        presets: P.elhajlitasPresets, bands: P.elhajlitasBands, colors: D.trapez.colors
      },
      kerites_trapez: {
        label: 'Kerítés trapézlemez', icon: '▦', type: 'sheet_m2', reverseVatEligible: false,
        products: D.trapez.products, surfaces: D.trapez.surfaces, thicknesses: D.trapez.thicknesses,
        colors: D.trapez.colors, price: D.trapez.price, byProduct: D.trapez.byProduct
      },
      kerites_elem: {
        label: 'Kerítéselem', icon: '▤', type: 'kerites_elem', reverseVatEligible: false,
        items: keritesItems(), colors: D.trapez.colors
      },
      csatorna: {
        label: 'Csatornarendszer', icon: '◣', type: 'csatorna', reverseVatEligible: false,
        sizes: D.csatorna.sizes, csatornaColors: D.csatorna.finishes, items: D.csatorna.items,
        price: D.csatorna.price
      },
      panel: {
        label: 'Szendvicspanel', icon: '▦', type: 'panel', reverseVatEligible: false,
        panelTypes: D.panel.types, thicknesses: D.panel.thicknesses, colors: D.panel.colors,
        price: D.panel.price, felar: D.panel.felar, meta: D.panel.meta
      }
    }
  };
})();
