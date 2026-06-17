/* =====================================================================
   Árazás és ÁFA-számítás.
   ===================================================================== */
(function () {
  const P = window.SL_PRICES;

  const fam = k => window.SL_CATALOG.families[k];

  // Egy lemeztétel nettó m²-egységárának feloldása az árlistából.
  // Visszaad null-t, ha nincs listaár (ekkor a felhasználó kézzel adja meg).
  function sheetUnitPrice(family, productName, thickness, surface) {
    const f = fam(family);
    if (!f || !f.products) return null;
    const prod = f.products.find(p => p.name === productName);
    if (!prod) return null;
    const v = f.price[prod.key + '|' + thickness + '|' + surface];
    return (v != null) ? v : null;
  }

  function productWidth(family, productName) {
    const f = fam(family);
    const prod = f && f.products && f.products.find(p => p.name === productName);
    return prod ? prod.width : 0;
  }

  // Egy csatorna-elem nettó egységára (méret | felület/kivitel | tétel).
  function csatornaUnitPrice(size, finish, item) {
    const v = fam('csatorna').price[size + '|' + finish + '|' + item];
    return v != null ? v : 0;
  }

  // Szendvicspanel nettó m²-ár.
  function panelUnitPrice(type, thickness) {
    const v = fam('panel').price[type + '|' + thickness];
    return v != null ? v : null;
  }

  // Kerítéselem nettó egységár.
  function keritesElemUnitPrice(type, size) {
    const tbl = fam('kerites_elem').items[type];
    return tbl && tbl[size] != null ? tbl[size] : 0;
  }

  // Élhajlítás: teríték (cm) -> alap Ft/m a sávtáblából.
  function elhajlitasBandPrice(teritek) {
    const t = parseFloat(teritek) || 0;
    if (t <= 0) return 0;
    for (const [upTo, price] of P.elhajlitasBands) { if (t <= upTo) return price; }
    return 0; // 125 cm felett: egyedi árazás (kézi felülírás)
  }
  // Famintás +20%, egyedi méret +20%, mindkettő +30%.
  function elhajlitasFactor(famintas, egyedi) {
    if (famintas && egyedi) return 1.3;
    if (famintas || egyedi) return 1.2;
    return 1.0;
  }
  // Egy élhajlítás-tétel nettó Ft/m egységára.
  function elhajlitasUnitPrice(it) {
    if (it.unitOverride != null && it.unitOverride !== '' && +it.unitOverride > 0) return +it.unitOverride;
    return round0(elhajlitasBandPrice(it.teritek) * elhajlitasFactor(it.famintas, it.egyedi));
  }
  // Metszet-rajz forrása: feltöltött kép, vagy a profil alapértelmezett képe.
  function elhajlitasSlug(name) {
    return String(name || '').toLowerCase()
      .replace(/[áä]/g, 'a').replace(/[éë]/g, 'e').replace(/í/g, 'i')
      .replace(/[óöő]/g, 'o').replace(/[úüű]/g, 'u')
      .replace(/×/g, 'x').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  function elhajlitasImage(it) {
    if (it.img) return it.img;
    if (it.profile && it.profile !== 'Egyedi hajtás') return 'assets/elhajlitas/' + elhajlitasSlug(it.profile) + '.png';
    return '';
  }

  // Egy blokk összes nyomtatható/számolható sora a konfiguráció alapján.
  // Visszaad: [{ desc, qtyTxt, unit, net, gross }]
  function blockLines(block, customerType) {
    const fam = window.SL_CATALOG.families[block.family];
    const rev = !!(fam && fam.reverseVatEligible);
    const out = [];
    const add = (desc, qtyTxt, unit, net, img) => {
      out.push({ desc, qtyTxt, unit: round0(unit), net: round0(net),
                 gross: grossFromNet(round0(net), customerType, rev), img: img || '' });
    };
    if (fam.type === 'sheet_m2') {
      const c = block.config, w = productWidth(block.family, c.product);
      (block.items || []).forEach(it => {
        const m2 = w * (it.length || 0) * (it.qty || 0);
        if (m2 <= 0) return;
        add(`${c.product} · ${c.thickness} · ${c.surface} · RAL ${c.color} (${it.length} m × ${it.qty} db)`,
            m2.toFixed(2) + ' m²', c.unitPrice || 0, m2 * (c.unitPrice || 0));
      });
      (block.accessories || []).forEach(a => {
        const net = (a.qty || 0) * (a.unitPrice || 0);
        if (net <= 0 && !(a.qty > 0)) return;
        add(a.name, (a.qty || 0) + ' db/m', a.unitPrice || 0, net);
      });
    } else if (fam.type === 'panel') {
      const c = block.config;
      const w = (fam.meta && fam.meta[c.type] && fam.meta[c.type].width) || 1;
      (block.items || []).forEach(it => {
        const m2 = w * (it.length || 0) * (it.qty || 0);
        if (m2 <= 0) return;
        add(`${c.type} · ${c.thickness} · ${c.color} (${w}×${it.length} m × ${it.qty} db)`,
            m2.toFixed(2) + ' m²', c.unitPrice || 0, m2 * (c.unitPrice || 0));
      });
    } else if (fam.type === 'csatorna') {
      const c = block.config;
      (block.items || []).forEach(it => {
        if (!it.qty) return;
        const unit = csatornaUnitPrice(c.size, c.color, it.item);
        add(`${it.item} (${c.size}, ${c.color})`, it.qty + ' db', unit, it.qty * unit);
      });
    } else if (fam.type === 'kerites_elem') {
      const c = block.config;
      (block.items || []).forEach(it => {
        if (!it.qty) return;
        const unit = keritesElemUnitPrice(it.type, it.size);
        add(`${it.type} · ${it.size} (RAL ${c.color})`, it.qty + ' db', unit, it.qty * unit);
      });
    } else if (fam.type === 'elhajlitas') {
      const c = block.config;
      (block.items || []).forEach(it => {
        const len = (it.length || 0) * (it.qty || 0);
        const unit = elhajlitasUnitPrice(it);
        const net = unit * len;
        if (net <= 0) return;
        const nm = (it.profile === 'Egyedi hajtás' && it.customName) ? it.customName : it.profile;
        const extras = [it.famintas ? 'famintás' : '', it.egyedi ? 'egyedi méret' : ''].filter(Boolean).join(', ');
        add(`${nm} · teríték ${it.teritek} cm${extras ? ' (' + extras + ')' : ''} · RAL ${c.color} (${it.length} m × ${it.qty} db)`,
            len.toFixed(2) + ' fm', unit, net, elhajlitasImage(it));
      });
    }
    return out;
  }

  // Bruttósítás a megrendelő típusa + termék fordított-ÁFA jogosultsága alapján.
  function grossFromNet(net, customerType, reverseEligible) {
    if (customerType === 'ceg' && reverseEligible) return net;       // fordított ÁFA
    return round0(net * (1 + P.vatRate));
  }

  // Igaz, ha az adott ajánlatra alkalmazni kell a fordított ÁFA-t (cég + van jogosult tétel).
  function quoteUsesReverseVat(quote) {
    if (quote.customer.type !== 'ceg') return false;
    return quote.blocks.some(b => {
      const fam = window.SL_CATALOG.families[b.family];
      return fam && fam.reverseVatEligible;
    });
  }

  // Teljes ajánlat összegzése.
  function summarize(quote) {
    const ct = quote.customer.type;
    let net = 0, gross = 0;
    quote.blocks.forEach(block => {
      blockLines(block, ct).forEach(l => { net += l.net; gross += l.gross; });
    });
    net = round0(net); gross = round0(gross);
    const vat = round0(gross - net);
    const deposit = round0(quote.deposit || 0);
    return { net, vat, gross, deposit, balance: round0(gross - deposit) };
  }

  function round0(x) { return Math.round((x + Number.EPSILON)); }

  window.SL_PRICING = {
    sheetUnitPrice, productWidth, csatornaUnitPrice, panelUnitPrice, keritesElemUnitPrice,
    elhajlitasUnitPrice, elhajlitasBandPrice, elhajlitasFactor, elhajlitasImage, elhajlitasSlug,
    blockLines, grossFromNet, quoteUsesReverseVat, summarize, round0
  };
})();
