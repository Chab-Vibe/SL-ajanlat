/* =====================================================================
   SL Árajánlat készítő – alkalmazás-logika
   ===================================================================== */
const SLApp = (function () {
  const CAT = window.SL_CATALOG;
  const PR = window.SL_PRICING;
  const STORE_KEY = 'sl_quote_v1';
  let uid = 1;

  /* ---------------- Állapot ---------------- */
  let quote = blankQuote();

  function blankQuote() {
    return {
      customer: { type: '', name: '', phone: '', address: '', taxNumber: '' },
      deposit: 0,
      blocks: []
    };
  }

  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(quote)); } catch (e) {} }
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { quote = JSON.parse(raw); return true; }
    } catch (e) {}
    return false;
  }

  /* ---------------- Segédfüggvények ---------------- */
  const fmt = new Intl.NumberFormat('hu-HU');
  function ft(x) { return fmt.format(PR.round0(x || 0)) + ' Ft'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function num(v) { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; }
  function opts(list, sel) { return list.map(v => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(v)}</option>`).join(''); }
  function $(id) { return document.getElementById(id); }
  function show(view) {
    ['view-menu', 'view-editor', 'view-print'].forEach(v => { $(v).hidden = (v !== view); });
    window.scrollTo(0, 0);
  }

  /* ---------------- Blokk létrehozás ---------------- */
  function resolveUnit(family, cfg) {
    const fam = CAT.families[family];
    if (fam.type === 'sheet_m2') return PR.sheetUnitPrice(family, cfg.product, cfg.thickness, cfg.surface);
    if (fam.type === 'panel') return PR.panelUnitPrice(cfg.type, cfg.thickness);
    return null;
  }

  // Lemez kombináció-segédek: felület a vastagságtól, szín a vastagság+felülettől függ.
  function poOf(fam, productName) {
    const p = fam.products.find(x => x.name === productName);
    return p ? fam.byProduct[p.key] : null;
  }
  function sheetSurfaces(po, th) { return Object.keys((po && po.combos && po.combos[th]) || {}); }
  function sheetColors(po, th, surf) { return (po && po.combos && po.combos[th] && po.combos[th][surf]) || []; }
  function panelDefaultColor(m) { return (m.colors.indexOf(m.defaultColor) >= 0 ? m.defaultColor : m.colors[0]) || ''; }

  function createBlock(family) {
    const fam = CAT.families[family];
    const b = { id: 'b' + (uid++), family: family };
    if (fam.type === 'sheet_m2') {
      const p = fam.products[0];
      const po = fam.byProduct[p.key];
      const th = po.thicknesses[0];
      const surface = sheetSurfaces(po, th)[0];
      const color = sheetColors(po, th, surface)[0] || '';
      b.config = { product: p.name, thickness: th, surface: surface, color: color, unitPrice: 0 };
      const u = resolveUnit(family, b.config); b.config.unitPrice = u != null ? u : 0;
      b.items = [{ length: 0, qty: 0 }];
      b.accessories = [];
    } else if (fam.type === 'panel') {
      const type = fam.panelTypes[0];
      const m = fam.meta[type];
      b.config = { type: type, thickness: fam.thicknesses[0], color: panelDefaultColor(m), unitPrice: 0 };
      const u = resolveUnit(family, b.config); b.config.unitPrice = u != null ? u : 0;
      b.items = [{ length: m.lengths[0], qty: 0 }];
      b.accessories = [];
    } else if (fam.type === 'csatorna') {
      b.config = { size: fam.sizes[fam.sizes.length - 1], color: fam.csatornaColors[0] };
      b.items = fam.items.map(i => ({ item: i, qty: 0 }));
    } else if (fam.type === 'kerites_elem') {
      const types = Object.keys(fam.items);
      const firstSize = Object.keys(fam.items[types[0]])[0];
      b.config = { color: fam.colors[0] };
      b.items = [{ type: types[0], size: firstSize, qty: 0 }];
    } else if (fam.type === 'elhajlitas') {
      b.config = { color: fam.colors[0] };
      b.items = [newElhajlitasItem(fam)];
    }
    return b;
  }

  function newElhajlitasItem(fam) {
    const p = fam.presets[0];
    return { profile: p.name, customName: '', teritek: p.teritek || 0,
             famintas: false, egyedi: false, length: 0, qty: 0, unitOverride: '', img: '' };
  }

  /* ---------------- Navigáció ---------------- */
  function goMenu() { renderMenu(); renderTopbar(); show('view-menu'); }
  function goEditor() { renderEditor(); renderTopbar(); show('view-editor'); }
  function goPrint() {
    if (!quote.blocks.length) { alert('Adj hozzá legalább egy terméket az ajánlathoz.'); return; }
    $('view-print').innerHTML = SLPrint.render(quote, { ft, esc, summarize: PR.summarize, usesReverse: PR.quoteUsesReverseVat });
    renderTopbar(); show('view-print');
  }

  function startQuote() {
    if (!quote.customer.type) { alert('Válaszd ki a megrendelő típusát (magánszemély vagy cég).'); return; }
    if (!quote.customer.name.trim()) { alert('Add meg a megrendelő nevét.'); return; }
    save(); goEditor();
  }

  function newQuote() {
    if (!confirm('Új ajánlat indítása? A jelenlegi ajánlat törlődik.')) return;
    quote = blankQuote(); save(); goMenu();
  }

  /* ---------------- Fejléc gombok ---------------- */
  function renderTopbar() {
    const inMenu = !$('view-menu').hidden;
    const inPrint = !$('view-print').hidden;
    let h = '';
    if (inPrint) {
      h = `<button class="btn btn-ghost" onclick="SLApp.goEditor()">← Vissza a szerkesztéshez</button>
           <button class="btn btn-primary" onclick="window.print()">🖶 Nyomtatás / PDF</button>`;
    } else if (!inMenu) {
      h = `<button class="btn btn-ghost" onclick="SLApp.goMenu()">Megrendelő adatai</button>
           <button class="btn btn-primary" onclick="SLApp.goPrint()">Ajánlat megtekintése →</button>`;
    } else {
      h = `<button class="btn btn-ghost" onclick="SLApp.newQuote()">Új ajánlat</button>`;
    }
    $('topbar-actions').innerHTML = h;
  }

  /* ---------------- 1) Onboarding főmenü ---------------- */
  function renderMenu() {
    const c = quote.customer;
    const sel = t => c.type === t ? ' selected' : '';
    $('view-menu').innerHTML = `
      <h1>Új árajánlat</h1>
      <p class="subtitle">Válaszd ki a megrendelő típusát, majd add meg az adatait. Cég esetén a lemeztermékekre <b>fordított ÁFA</b> érvényes.</p>
      <div class="card">
        <h2>Megrendelő típusa</h2>
        <div class="type-grid">
          <div class="type-card${sel('maganszemely')}" onclick="SLApp.setType('maganszemely')">
            <div class="ico">👤</div><h3>Magánszemély</h3><p>Bruttó ár 27% ÁFA-val</p>
          </div>
          <div class="type-card${sel('ceg')}" onclick="SLApp.setType('ceg')">
            <div class="ico">🏢</div><h3>Cég</h3><p>Lemeztermékekre fordított ÁFA</p>
          </div>
        </div>
      </div>
      <div class="card">
        <h2>Megrendelő adatai</h2>
        <div class="grid-2">
          <div class="field"><label>Név / Cégnév</label><input id="c-name" value="${esc(c.name)}" oninput="SLApp.setCust('name',this.value)" placeholder="Megrendelő neve"></div>
          <div class="field"><label>Telefonszám</label><input id="c-phone" value="${esc(c.phone)}" oninput="SLApp.setCust('phone',this.value)" placeholder="+36 ..."></div>
          <div class="field" style="grid-column:1/-1"><label>Szállítási cím</label><input id="c-addr" value="${esc(c.address)}" oninput="SLApp.setCust('address',this.value)" placeholder="Irányítószám, település, utca, házszám"></div>
          <div class="field" id="taxwrap" ${c.type === 'ceg' ? '' : 'hidden'}><label>Adószám</label><input id="c-tax" value="${esc(c.taxNumber)}" oninput="SLApp.setCust('taxNumber',this.value)" placeholder="________-_-__"></div>
        </div>
        <div class="row-actions" style="margin-top:8px">
          <button class="btn btn-primary" onclick="SLApp.startQuote()">Ajánlat indítása →</button>
        </div>
      </div>`;
  }

  function setType(t) { quote.customer.type = t; save(); renderMenu(); }
  function setTypeLive(t) { quote.customer.type = t; save(); renderEditor(); }
  function setCust(k, v) { quote.customer[k] = v; save(); }

  /* ---------------- 2) Szerkesztő ---------------- */
  function renderEditor() {
    const s = PR.summarize(quote);
    const rev = PR.quoteUsesReverseVat(quote);
    let html = `
      <div class="card">
        <div class="card-head">
          <h2>Ajánlat – ${esc(quote.customer.name || 'Megrendelő')}</h2>
          <div class="type-toggle">
            <span class="muted" style="font-size:13px">Megrendelő:</span>
            <button class="seg ${quote.customer.type === 'maganszemely' ? 'on' : ''}" onclick="SLApp.setTypeLive('maganszemely')">Magánszemély</button>
            <button class="seg ${quote.customer.type === 'ceg' ? 'on' : ''}" onclick="SLApp.setTypeLive('ceg')">Cég</button>
            ${rev ? '<span class="tag rev">fordított ÁFA</span>' : ''}
          </div>
        </div>
        <div class="grid-4">
          <div class="field"><label>Név / Cégnév</label><input value="${esc(quote.customer.name)}" oninput="SLApp.setCust('name',this.value)"></div>
          <div class="field"><label>Telefonszám</label><input value="${esc(quote.customer.phone)}" oninput="SLApp.setCust('phone',this.value)"></div>
          <div class="field"><label>Szállítási cím</label><input value="${esc(quote.customer.address)}" oninput="SLApp.setCust('address',this.value)"></div>
          <div class="field"${quote.customer.type === 'ceg' ? '' : ' hidden'}><label>Adószám</label><input value="${esc(quote.customer.taxNumber)}" oninput="SLApp.setCust('taxNumber',this.value)"></div>
        </div>
        <div class="totals" style="margin-top:6px">
          <div class="t"><span>Nettó összesen</span><b>${ft(s.net)}</b></div>
          <div class="t"><span>ÁFA (${rev ? 'fordított' : '27%'})</span><b>${ft(s.vat)}</b></div>
          <div class="t grand"><span>Bruttó végösszeg</span><b>${ft(s.gross)}</b></div>
        </div>
      </div>`;

    if (!quote.blocks.length) {
      html += `<div class="card"><p class="muted">Még nincs termék az ajánlatban. Adj hozzá lentről.</p></div>`;
    }
    quote.blocks.forEach(b => { html += renderBlock(b); });

    // Termékválasztó
    html += `<div class="card">
        <h2>+ Termék hozzáadása az ajánlathoz</h2>
        <div class="picker-grid">
          ${CAT.order.map(fk => {
            const f = CAT.families[fk];
            return `<div class="picker-card" onclick="SLApp.addBlock('${fk}')"><div class="ico">${f.icon}</div><span class="lbl">${esc(f.label)}</span></div>`;
          }).join('')}
        </div>
      </div>`;

    // Előleg + összegzés
    html += `<div class="card">
        <div class="grid-3">
          <div class="field"><label>Előleg (Ft)</label><input type="number" value="${quote.deposit || 0}" onchange="SLApp.setDeposit(this.value)"></div>
          <div class="field"><label>Fennmaradó (bruttó)</label><input value="${ft(s.balance)}" readonly></div>
          <div class="field"><label>&nbsp;</label><button class="btn btn-primary" onclick="SLApp.goPrint()">Ajánlat megtekintése / nyomtatás →</button></div>
        </div>
      </div>`;

    $('view-editor').innerHTML = html;
  }

  function renderBlock(b) {
    const fam = CAT.families[b.family];
    const head = `<div class="card-head"><h2>${fam.icon} ${esc(fam.label)}</h2>
        <button class="btn btn-danger btn-sm" onclick="SLApp.removeBlock('${b.id}')">Blokk törlése</button></div>`;
    let body = '';
    if (fam.type === 'sheet_m2') body = renderSheetBlock(b, fam);
    else if (fam.type === 'panel') body = renderPanelBlock(b, fam);
    else if (fam.type === 'csatorna') body = renderCsatornaBlock(b, fam);
    else if (fam.type === 'kerites_elem') body = renderKeritesBlock(b, fam);
    else if (fam.type === 'elhajlitas') body = renderElhajlitasBlock(b, fam);
    return `<div class="card">${head}${body}</div>`;
  }

  // --- Lemez (m²) ---
  function renderSheetBlock(b, fam) {
    const c = b.config;
    const width = PR.productWidth(b.family, c.product);
    const prod = fam.products.find(p => p.name === c.product) || fam.products[0];
    const po = fam.byProduct[prod.key] || { thicknesses: fam.thicknesses, combos: {} };
    const surfList = sheetSurfaces(po, c.thickness);
    const colorList = sheetColors(po, c.thickness, c.surface);
    let rows = b.items.map((it, i) => {
      const m2 = width * num(it.length) * num(it.qty);
      const net = m2 * num(c.unitPrice);
      const gross = PR.grossFromNet(net, quote.customer.type, fam.reverseVatEligible);
      return `<tr>
        <td>${i + 1}.</td>
        <td>${width.toFixed(2)} m</td>
        <td><input type="number" step="0.01" value="${it.length}" onchange="SLApp.setItem('${b.id}',${i},'length',this.value)"></td>
        <td><input type="number" step="1" value="${it.qty}" onchange="SLApp.setItem('${b.id}',${i},'qty',this.value)"></td>
        <td>${m2.toFixed(2)}</td>
        <td>${ft(net)}</td>
        <td>${ft(gross)}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="SLApp.removeItem('${b.id}',${i})">✕</button></td>
      </tr>`;
    }).join('');
    const cfgRow = `<div class="grid-4">
        <div class="field"><label>Lemez típus</label><select onchange="SLApp.setCfg('${b.id}','product',this.value)">${opts(fam.products.map(p => p.name), c.product)}</select></div>
        <div class="field"><label>Vastagság</label><select onchange="SLApp.setCfg('${b.id}','thickness',this.value)">${opts(po.thicknesses, c.thickness)}</select></div>
        <div class="field"><label>Felület</label><select onchange="SLApp.setCfg('${b.id}','surface',this.value)">${opts(surfList.length ? surfList : [c.surface], c.surface)}</select></div>
        <div class="field"><label>Szín${colorList.length ? '' : ' (egyedi)'}</label><select onchange="SLApp.setCfg('${b.id}','color',this.value)">${opts(colorList.length ? colorList : [c.color], c.color)}</select></div>
      </div>
      <div class="grid-4">
        <div class="field"><label>Nettó ár (Ft/m²)</label><input type="number" value="${c.unitPrice}" onchange="SLApp.setCfg('${b.id}','unitPrice',this.value)"></div>
      </div>`;
    return cfgRow + `<table class="lines">
        <thead><tr><th>#</th><th>Szélesség</th><th>Hossz (m)</th><th>Db</th><th>m²</th><th>Nettó</th><th>Bruttó</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table>
      <div class="row-actions" style="margin-top:10px"><button class="btn btn-ghost btn-sm" onclick="SLApp.addItem('${b.id}')">+ Sor</button></div>
      ${renderAccessories(b)}`;
  }

  // --- Szendvicspanel (m²) ---
  function renderPanelBlock(b, fam) {
    const c = b.config;
    const m = fam.meta[c.type] || { width: 1, lengths: [], colors: fam.colors, skin: '' };
    const w = m.width;
    const listId = 'plen-' + b.id;
    let rows = b.items.map((it, i) => {
      const m2 = w * num(it.length) * num(it.qty);
      const net = m2 * num(c.unitPrice);
      const gross = PR.grossFromNet(net, quote.customer.type, fam.reverseVatEligible);
      return `<tr>
        <td>${i + 1}.</td>
        <td>${w.toFixed(2)} m</td>
        <td><input type="number" step="0.01" list="${listId}" value="${it.length}" onchange="SLApp.setItem('${b.id}',${i},'length',this.value)"></td>
        <td><input type="number" step="1" value="${it.qty}" onchange="SLApp.setItem('${b.id}',${i},'qty',this.value)"></td>
        <td>${m2.toFixed(2)}</td>
        <td>${ft(net)}</td>
        <td>${ft(gross)}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="SLApp.removeItem('${b.id}',${i})">✕</button></td>
      </tr>`;
    }).join('');
    const lengthOpts = `<datalist id="${listId}">${(m.lengths || []).map(l => `<option value="${l}">`).join('')}</datalist>`;
    const priceWarn = (num(c.unitPrice) <= 0) ? ' <span class="muted">(egyedi ár – ajánlatkérés)</span>' : '';
    const skin = m.skin ? `<div class="field"><label>Lemezvastagság</label><input value="${esc(m.skin)}" readonly></div>` : '';
    const cfgRow = `<div class="grid-4">
        <div class="field"><label>Panel típus</label><select onchange="SLApp.setCfg('${b.id}','type',this.value)">${opts(fam.panelTypes, c.type)}</select></div>
        <div class="field"><label>Vastagság</label><select onchange="SLApp.setCfg('${b.id}','thickness',this.value)">${opts(fam.thicknesses, c.thickness)}</select></div>
        <div class="field"><label>Szín</label><select onchange="SLApp.setCfg('${b.id}','color',this.value)">${opts(m.colors, c.color)}</select></div>
        <div class="field"><label>Nettó ár (Ft/m²)${priceWarn}</label><input type="number" value="${c.unitPrice}" onchange="SLApp.setCfg('${b.id}','unitPrice',this.value)"></div>
      </div>
      <div class="grid-4">
        <div class="field"><label>Szélesség (fix)</label><input value="${w.toFixed(2)} m" readonly></div>
        ${skin}
      </div>`;
    return cfgRow + lengthOpts + `<table class="lines">
        <thead><tr><th>#</th><th>Szélesség</th><th>Hossz (m)</th><th>Db</th><th>m²</th><th>Nettó</th><th>Bruttó</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table>
      <div class="row-actions" style="margin-top:10px"><button class="btn btn-ghost btn-sm" onclick="SLApp.addItem('${b.id}')">+ Sor</button></div>`;
  }

  // --- Csatorna ---
  function renderCsatornaBlock(b, fam) {
    const c = b.config;
    let rows = b.items.map((it, i) => {
      const unit = PR.csatornaUnitPrice(c.size, c.color, it.item);
      const net = num(it.qty) * unit;
      const gross = PR.grossFromNet(net, quote.customer.type, fam.reverseVatEligible);
      return `<tr>
        <td>${esc(it.item)}</td>
        <td><input type="number" step="1" value="${it.qty}" onchange="SLApp.setItem('${b.id}',${i},'qty',this.value)"></td>
        <td>${ft(unit)}</td>
        <td>${ft(net)}</td>
        <td>${ft(gross)}</td>
      </tr>`;
    }).join('');
    const cfgRow = `<div class="grid-3">
        <div class="field"><label>Méret</label><select onchange="SLApp.setCfg('${b.id}','size',this.value)">${opts(fam.sizes, c.size)}</select></div>
        <div class="field"><label>Szín</label><select onchange="SLApp.setCfg('${b.id}','color',this.value)">${opts(fam.csatornaColors, c.color)}</select></div>
      </div>`;
    return cfgRow + `<table class="lines">
        <thead><tr><th>Megnevezés</th><th>db/m</th><th>Nettó egységár</th><th>Nettó</th><th>Bruttó</th></tr></thead>
        <tbody>${rows}</tbody></table>`;
  }

  // --- Kerítéselem ---
  function renderKeritesBlock(b, fam) {
    const c = b.config;
    const types = Object.keys(fam.items);
    let rows = b.items.map((it, i) => {
      const sizes = Object.keys(fam.items[it.type] || {});
      const unit = PR.keritesElemUnitPrice(it.type, it.size);
      const net = num(it.qty) * unit;
      const gross = PR.grossFromNet(net, quote.customer.type, fam.reverseVatEligible);
      return `<tr>
        <td><select class="txt" onchange="SLApp.setItem('${b.id}',${i},'type',this.value)">${opts(types, it.type)}</select></td>
        <td><select onchange="SLApp.setItem('${b.id}',${i},'size',this.value)">${opts(sizes, it.size)}</select></td>
        <td><input type="number" step="1" value="${it.qty}" onchange="SLApp.setItem('${b.id}',${i},'qty',this.value)"></td>
        <td>${ft(unit)}</td>
        <td>${ft(net)}</td>
        <td>${ft(gross)}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="SLApp.removeItem('${b.id}',${i})">✕</button></td>
      </tr>`;
    }).join('');
    const cfgRow = `<div class="grid-3">
        <div class="field"><label>Szín (RAL)</label><select onchange="SLApp.setCfg('${b.id}','color',this.value)">${opts(fam.colors, c.color)}</select></div>
      </div>`;
    return cfgRow + `<table class="lines">
        <thead><tr><th>Típus</th><th>Méret</th><th>Db</th><th>Nettó egységár</th><th>Nettó</th><th>Bruttó</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table>
      <div class="row-actions" style="margin-top:10px"><button class="btn btn-ghost btn-sm" onclick="SLApp.addItem('${b.id}')">+ Sor</button></div>`;
  }

  // --- Élhajlítás ---
  function renderElhajlitasBlock(b, fam) {
    const c = b.config;
    const presetNames = fam.presets.map(p => p.name).concat(['Egyedi hajtás']);
    let rows = b.items.map((it, i) => {
      const unit = PR.elhajlitasUnitPrice(it);
      const fm = num(it.length) * num(it.qty);
      const net = unit * fm;
      const gross = PR.grossFromNet(net, quote.customer.type, fam.reverseVatEligible);
      const imgSrc = PR.elhajlitasImage(it);
      const thumb = imgSrc
        ? `<img src="${esc(imgSrc)}" class="cut-thumb" onerror="this.replaceWith(SLApp._noimg())">`
        : `<span class="cut-none">nincs rajz</span>`;
      const customField = it.profile === 'Egyedi hajtás'
        ? `<input class="txt" placeholder="megnevezés" value="${esc(it.customName)}" onchange="SLApp.setItem('${b.id}',${i},'customName',this.value)">`
        : '';
      return `<tr>
        <td>
          <select class="txt" onchange="SLApp.setItem('${b.id}',${i},'profile',this.value)">${opts(presetNames, it.profile)}</select>
          ${customField}
          <div class="cut-cell">${thumb}
            <label class="btn btn-ghost btn-sm">Kép… <input type="file" accept="image/*" hidden onchange="SLApp.setItemImg('${b.id}',${i},this)"></label>
            ${it.img ? `<button class="btn btn-ghost btn-sm" onclick="SLApp.clearItemImg('${b.id}',${i})">Kép törlése</button>` : ''}
          </div>
        </td>
        <td><input type="number" step="0.1" value="${it.teritek}" onchange="SLApp.setItem('${b.id}',${i},'teritek',this.value)"></td>
        <td><input type="checkbox" ${it.famintas ? 'checked' : ''} onchange="SLApp.setItem('${b.id}',${i},'famintas',this.checked)"></td>
        <td><input type="checkbox" ${it.egyedi ? 'checked' : ''} onchange="SLApp.setItem('${b.id}',${i},'egyedi',this.checked)"></td>
        <td><input type="number" step="0.01" value="${it.length}" onchange="SLApp.setItem('${b.id}',${i},'length',this.value)"></td>
        <td><input type="number" step="1" value="${it.qty}" onchange="SLApp.setItem('${b.id}',${i},'qty',this.value)"></td>
        <td><input type="number" step="1" value="${it.unitOverride}" placeholder="${unit}" onchange="SLApp.setItem('${b.id}',${i},'unitOverride',this.value)"></td>
        <td>${ft(net)}</td>
        <td>${ft(gross)}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="SLApp.removeItem('${b.id}',${i})">✕</button></td>
      </tr>`;
    }).join('');
    const cfgRow = `<div class="grid-3">
        <div class="field"><label>Szín (RAL / famintás)</label><select onchange="SLApp.setCfg('${b.id}','color',this.value)">${opts(fam.colors, c.color)}</select></div>
      </div>
      <p class="muted" style="font-size:13px;margin:0 0 8px">Az ár a <b>teríték (cm)</b> szerinti folyóméter-ár. Famintás +20%, egyedi méret +20% (mindkettő +30%). Az egységár kézzel felülírható.</p>`;
    return cfgRow + `<table class="lines">
        <thead><tr><th>Profil / metszet</th><th>Teríték (cm)</th><th>Faminta</th><th>Egyedi</th><th>Hossz (m)</th><th>Db</th><th>Ft/m</th><th>Nettó</th><th>Bruttó</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table>
      <div class="row-actions" style="margin-top:10px"><button class="btn btn-ghost btn-sm" onclick="SLApp.addItem('${b.id}')">+ Hajtás</button></div>`;
  }

  // --- Tartozékok (lemez/panel blokkokhoz) ---
  function renderAccessories(b) {
    const fam = CAT.families[b.family];
    let rows = (b.accessories || []).map((a, i) => {
      const net = num(a.qty) * num(a.unitPrice);
      const gross = PR.grossFromNet(net, quote.customer.type, fam.reverseVatEligible);
      return `<tr>
        <td><input class="txt" value="${esc(a.name)}" onchange="SLApp.setAcc('${b.id}',${i},'name',this.value)"></td>
        <td><input type="number" step="1" value="${a.qty}" onchange="SLApp.setAcc('${b.id}',${i},'qty',this.value)"></td>
        <td><input type="number" step="1" value="${a.unitPrice}" onchange="SLApp.setAcc('${b.id}',${i},'unitPrice',this.value)"></td>
        <td>${ft(net)}</td>
        <td>${ft(gross)}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="SLApp.removeAcc('${b.id}',${i})">✕</button></td>
      </tr>`;
    }).join('');
    const accList = SL_PRICES.accessories;
    return `<h2 style="margin-top:20px;font-size:16px">Tartozékok</h2>
      <table class="lines">
        <thead><tr><th>Megnevezés</th><th>db/m</th><th>Nettó egységár</th><th>Nettó</th><th>Bruttó</th><th></th></tr></thead>
        <tbody>${rows || ''}</tbody></table>
      <div class="row-actions" style="margin-top:10px">
        <select id="accpick-${b.id}">${opts(accList, accList[0])}</select>
        <button class="btn btn-ghost btn-sm" onclick="SLApp.addAcc('${b.id}')">+ Tartozék</button>
      </div>`;
  }

  /* ---------------- Mutációk ---------------- */
  function addBlock(family) { quote.blocks.push(createBlock(family)); save(); renderEditor(); }
  function removeBlock(id) { quote.blocks = quote.blocks.filter(b => b.id !== id); save(); renderEditor(); }
  function getBlock(id) { return quote.blocks.find(b => b.id === id); }

  function setCfg(id, key, val) {
    const b = getBlock(id); if (!b) return;
    const fam = CAT.families[b.family];
    b.config[key] = (key === 'unitPrice') ? num(val) : val;

    // Lemez: kaszkádolt opció-visszaállítás (felület a vastagságtól, szín a kettőtől függ)
    if (fam.type === 'sheet_m2') {
      const po = poOf(fam, b.config.product);
      if (po) {
        if (key === 'product' && po.thicknesses.indexOf(b.config.thickness) < 0) b.config.thickness = po.thicknesses[0];
        if (key === 'product' || key === 'thickness') {
          const sl = sheetSurfaces(po, b.config.thickness);
          if (sl.indexOf(b.config.surface) < 0) b.config.surface = sl[0];
        }
        const cl = sheetColors(po, b.config.thickness, b.config.surface);
        if (cl.indexOf(b.config.color) < 0) b.config.color = cl[0] || '';
      }
    }
    // Panel: típusváltáskor a szín illesztése a típushoz (a szélesség fixen a típusból jön)
    if (fam.type === 'panel' && key === 'type') {
      const m = fam.meta[b.config.type];
      if (m.colors.indexOf(b.config.color) < 0) b.config.color = panelDefaultColor(m);
    }

    // ár újra-feloldása; ha nincs ár az adott kombinációhoz, 0 (ne maradjon téves ár)
    if (['product', 'thickness', 'surface', 'type'].includes(key)) {
      const u = resolveUnit(b.family, b.config);
      b.config.unitPrice = (u != null) ? u : 0;
    }
    save(); renderEditor();
  }
  function setItem(id, i, key, val) {
    const b = getBlock(id); if (!b) return;
    const numeric = ['length', 'qty', 'width', 'teritek'].includes(key);
    b.items[i][key] = numeric ? num(val) : val;
    // élhajlítás: profilváltáskor töltse be a profil alapértelmezett terítékét
    if (key === 'profile') {
      const fam = CAT.families[b.family];
      const preset = fam.presets && fam.presets.find(p => p.name === val);
      if (preset && preset.teritek) b.items[i].teritek = preset.teritek;
    }
    save(); renderEditor();
  }

  // Élhajlítás metszet-kép feltöltése (data URL-ként tárolva).
  function setItemImg(id, i, input) {
    const b = getBlock(id); if (!b || !input.files || !input.files[0]) return;
    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) { alert('A kép legfeljebb 2 MB lehet.'); return; }
    const reader = new FileReader();
    reader.onload = e => { b.items[i].img = e.target.result; save(); renderEditor(); };
    reader.readAsDataURL(file);
  }
  function clearItemImg(id, i) { const b = getBlock(id); if (!b) return; b.items[i].img = ''; save(); renderEditor(); }
  function _noimg() { const s = document.createElement('span'); s.className = 'cut-none'; s.textContent = 'nincs rajz'; return s; }
  function addItem(id) {
    const b = getBlock(id); if (!b) return;
    const fam = CAT.families[b.family];
    if (fam.type === 'sheet_m2') b.items.push({ length: 0, qty: 0 });
    else if (fam.type === 'panel') b.items.push({ length: (fam.meta[b.config.type].lengths[0] || 0), qty: 0 });
    else if (fam.type === 'kerites_elem') {
      const types = Object.keys(fam.items);
      b.items.push({ type: types[0], size: Object.keys(fam.items[types[0]])[0], qty: 0 });
    } else if (fam.type === 'elhajlitas') b.items.push(newElhajlitasItem(fam));
    save(); renderEditor();
  }
  function removeItem(id, i) { const b = getBlock(id); if (!b) return; b.items.splice(i, 1); save(); renderEditor(); }

  function addAcc(id) {
    const b = getBlock(id); if (!b) return;
    const pick = $('accpick-' + id);
    b.accessories = b.accessories || [];
    b.accessories.push({ name: pick ? pick.value : '', qty: 0, unitPrice: 0 });
    save(); renderEditor();
  }
  function setAcc(id, i, key, val) {
    const b = getBlock(id); if (!b) return;
    b.accessories[i][key] = (key === 'name') ? val : num(val);
    save(); renderEditor();
  }
  function removeAcc(id, i) { const b = getBlock(id); if (!b) return; b.accessories.splice(i, 1); save(); renderEditor(); }

  function setDeposit(v) { quote.deposit = num(v); save(); renderEditor(); }

  /* ---------------- Indítás ---------------- */
  function init() {
    if (load() && quote.blocks && quote.blocks.length) {
      // előző munkamenet folytatása
      uid = quote.blocks.reduce((m, b) => Math.max(m, parseInt(String(b.id).slice(1)) || 0), 0) + 1;
      goEditor();
    } else {
      goMenu();
    }
  }

  return {
    init, goMenu, goEditor, goPrint, startQuote, newQuote,
    setType, setTypeLive, setCust, setDeposit,
    addBlock, removeBlock, setCfg, setItem, addItem, removeItem,
    setItemImg, clearItemImg, _noimg,
    addAcc, setAcc, removeAcc,
    _data: () => quote
  };
})();

document.addEventListener('DOMContentLoaded', SLApp.init);
