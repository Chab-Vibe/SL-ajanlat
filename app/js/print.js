/* =====================================================================
   Nyomtatható ajánlat összeállítása (A4).
   A záró feltétel-szövegek itt szabadon szerkeszthetők.
   ===================================================================== */
const SLPrint = (function () {
  const CAT = window.SL_CATALOG;
  const PR = window.SL_PRICING;

  function render(quote, H) {
    const { ft, esc } = H;
    const ct = quote.customer.type;
    const rev = PR.quoteUsesReverseVat(quote);
    const s = PR.summarize(quote);
    const today = new Date().toLocaleDateString('hu-HU');

    let blocksHtml = '';
    quote.blocks.forEach(b => {
      const fam = CAT.families[b.family];
      const lines = PR.blockLines(b, ct);
      if (!lines.length) return;
      blocksHtml += `<table class="ptable">
        <caption>${esc(fam.label)}</caption>
        <thead><tr><th>Megnevezés</th><th>Mennyiség</th><th>Nettó egységár</th><th>Nettó</th><th>Bruttó</th></tr></thead>
        <tbody>${lines.map(l => `<tr>
          <td>${esc(l.desc)}${l.img ? `<br><img class="cut-img" src="${esc(l.img)}" onerror="this.style.display='none'">` : ''}</td>
          <td>${esc(l.qtyTxt)}</td><td>${ft(l.unit)}</td><td>${ft(l.net)}</td><td>${ft(l.gross)}</td>
        </tr>`).join('')}</tbody></table>`;
    });

    const vatRow = rev
      ? `<tr><td>ÁFA</td><td class="right">Fordított adózás (0 Ft)</td></tr>`
      : `<tr><td>ÁFA (27%)</td><td class="right">${ft(s.vat)}</td></tr>`;
    const revNote = rev
      ? `<p class="note" style="margin:10px 0">A számla a fordított adózás szabályai szerint, ÁFA felszámítása nélkül kerül kiállításra (Áfa tv. 142. §). Az adót a megrendelő (vevő) fizeti meg.</p>`
      : '';

    return `
    <div class="print-doc">
      <div class="prevbar no-print">
        <button class="btn btn-ghost" onclick="SLApp.goEditor()">← Vissza a szerkesztéshez</button>
        <button class="btn btn-primary" onclick="window.print()">🖶 Nyomtatás / PDF mentés</button>
      </div>

      <div class="print-head">
        <div class="logo-wrap">
          <img class="logo-img" src="assets/SL-logo.png" alt="SL Lemezkereskedés" />
          <div class="logo">SL Lemezkereskedés<small>www.sl-lemezkereskedes.hu</small></div>
        </div>
        <div class="print-meta">
          <div class="doc-title">ÁRAJÁNLAT</div>
          <div>Kelt: ${esc(today)}</div>
          <div>Megrendelő típusa: ${ct === 'ceg' ? 'Cég' : 'Magánszemély'}</div>
        </div>
      </div>

      <div class="print-cust">
        <div><b>Megrendelő:</b> ${esc(quote.customer.name)}</div>
        <div><b>Telefon:</b> ${esc(quote.customer.phone)}</div>
        <div style="grid-column:1/-1"><b>Szállítási cím:</b> ${esc(quote.customer.address)}</div>
        ${ct === 'ceg' && quote.customer.taxNumber ? `<div><b>Adószám:</b> ${esc(quote.customer.taxNumber)}</div>` : ''}
      </div>

      ${blocksHtml || '<p>Az ajánlat nem tartalmaz tételt.</p>'}
      ${revNote}

      <table class="psum">
        <tr><td>Nettó összesen</td><td class="right">${ft(s.net)}</td></tr>
        ${vatRow}
        <tr class="grand"><td>Bruttó végösszeg</td><td class="right">${ft(s.gross)}</td></tr>
        ${s.deposit ? `<tr><td>Előleg</td><td class="right">${ft(s.deposit)}</td></tr>
        <tr><td>Fennmaradó összeg</td><td class="right">${ft(s.balance)}</td></tr>` : ''}
      </table>

      <div class="pnotes">
        <div class="n"><b>Méretbeli módosításra</b> a megrendeléstől számított 2 napon belül van lehetőség! Ezután a méreteket elfogadottnak tekintjük, így méretek tekintetében reklamációt nem fogadunk el!</div>
        <div class="n"><b>Gyártási idő:</b> Kerítéselemek (dobozos, lamellás, c-profil) gyártási ideje: 4–5 hét!</div>
        <div class="n">Kiszállításnál sofőrünk egyedül megy, ezért a lepakoláshoz segítség szükséges!</div>
        <div class="n"><b>Árukiadás:</b> Hétfő – Péntek 7:30 – 16:00 &nbsp;·&nbsp; Szombat 7:30 – 12:00</div>
        <div class="n">Figyelem! Az útmutatótól eltérő TÁROLÁSBÓL vagy anyagmozgatásból eredő károkért a ReCOPY Kft. (Simai úti lemezkereskedés) nem vállal felelősséget! A részletes tárolási útmutató az ajánlat következő oldalán olvasható.</div>
      </div>

      ${SLPrint.STORAGE_GUIDE}
    </div>`;
  }

  // Teljes Szállítási és Tárolási útmutató (a Megrendelő lap szövege alapján).
  // Külön oldalon nyomtatódik. Szabadon szerkeszthető.
  const STORAGE_GUIDE = `
    <div class="pterms page-break">
      <h3>Szállítási és Tárolási útmutató</h3>

      <h4>1. Megrendelt tételek átvétele</h4>
      <p>A Megrendelő és a Szállító együttesen köteles az áru átadásakor a minőségi és mennyiségi ellenőrzését elvégezni.</p>
      <p><b>1.1.</b> Az árut a Szállító telephelyén a Megrendelő vagy annak meghatalmazottja veszi át az árukiadótól: a megrendelt tételeket a Megrendelő a Szállító árukiadójával együtt köteles a Szállító telephelyén ellenőrizni az átadott áruk minőségét és mennyiségét. Amennyiben eltérést tapasztal, a Megrendelő köteles haladéktalanul írásban jelezni a minőségi vagy mennyiségi kifogást a Szállító felé.</p>
      <p><b>1.2.</b> Az árut a Megrendelő vagy az általa meghatalmazottja az előre megjelölt helyen veszi át a Szállító alkalmazottjától: a megrendelt tételeket a Megrendelő a Szállító alkalmazottjával együtt köteles az áru átvételének helyén ellenőrizni az átadott áruk minőségét és mennyiségét. Amennyiben eltérést tapasztal, a Megrendelő köteles haladéktalanul írásban jelezni a minőségi vagy mennyiségi kifogást a Szállító felé.</p>
      <p><b>1.3.</b> Az árut egy harmadik fél (pl.: szállítmányozó) veszi át a Szállító telephelyén az árukiadótól: a Megrendelő köteles a harmadik fél által leszállított áruk minőségét és mennyiségét a harmadik féltől való átvétel pillanatában ellenőrizni. Amennyiben eltérést tapasztal, a Megrendelő köteles haladéktalanul írásban jelezni a minőségi vagy mennyiségi kifogást a Szállító felé.</p>
      <p>Az írásban tett mennyiségi kifogást a Szállító kivizsgálja, és jogos mennyiségi kifogás esetén a Szállító köteles a hiányt a jogosság megállapításától számított 30 napon belül pótolni. Az írásban tett minőségi kifogást a Szállító kivizsgálja, és jogos minőségi kifogás esetén köteles a kifogásolt minőségi eltérést a jogosság megállapításától számított 30 napon belül kompenzálni vagy visszavásárolni.</p>

      <h4>2. Szállítás</h4>
      <p>A Szállító által gyártott trapézlemez, cserepeslemez, szendvicspanel, szelemen és síklemez termékek szállítására egyedi szabályok vonatkoznak. A termék szállításának tervezésekor, illetve a szállítás megkezdése előtt figyelembe kell venni a szállítási útmutatóban leírt szabályokat. A közzétett szabályoktól való eltérés következtében felmerülő károkért és minőségromlásért a Szállító nem vállal felelősséget.</p>

      <h4>3. Védőfólia eltávolítása</h4>
      <p>Amennyiben az áru felületét védő fólia védi, akkor a felületén lévő védőfóliát a tárolás megkezdésétől számított négy héten belül, vagy a beépítéstől számított egy héten belül el kell távolítani.</p>

      <h4>4. Tárolás</h4>
      <p>Az áru kötegeket a helyszínre történő szállítás után nagy körültekintéssel és az alábbi szabályok betartásával lehet úgy tárolni a felszerelésig, hogy az áru minősége ne romoljon. A következő szabályoktól való eltérés esetén a tárolásból eredő minőségromlásért és kárért a ReCOPY Kft. (Simai úti lemezkereskedés) nem vállal felelősséget.</p>
      <p><b>4.1.</b> A kötegeket védeni kell a csapadéktól, a páralecsapódásból eredő nedvesedéstől és általában a nedvességtől.</p>
      <p><b>4.2.</b> A kötegeket enyhén megdöntve kell tárolni, hogy a véletlenül a panel kötegek közé kerülő víz el tudjon folyni a panel felületéről.</p>
      <p><b>4.3.</b> A kötegek egymásra rakhatók, de arra figyelni kell, hogy a kötegeket elválasztó támaszok pontosan egymás felett helyezkedjenek el. Figyelem! A támaszok megnyomhatják az áru felületét.</p>
      <p><b>4.4.</b> A szabad téren tárolt kötegeket vízálló ponyvával kell letakarni úgy, hogy sem a kötegek tetején, sem a kötegek alatt ne gyűlhessen össze a csapadékvíz.</p>
      <p><b>4.5.</b> A kötegek számára biztosítani kell az átszellőzést, így kivédhetők a páralecsapódásból eredő nedvesedés okozta károk.</p>

      <h4>5. Javaslatok a helyszínen történő szereléshez</h4>
      <p>A Metál-Sheet Kft. csupán a megrendelt áruk gyártására vállalkozik, nem vesz részt a szerelésben. A szerelésről mindenképpen a vevőnek kell gondoskodni akár saját kivitelezésben, akár szerelésben jártas vállalkozó igénybevételével. A Metál-Sheet Kft. az alábbi szabályok betartására hívja fel a figyelmet a szerelés során:</p>
      <p><b>5.1.</b> A kivitelezőnek az összeszerelést meg kell terveznie és a biztonságért felelős személyt ki kell jelölnie. A biztonságos szereléshez szükséges eszközöket, berendezéseket biztosítania kell a helyszínen.</p>
      <p><b>5.2.</b> Amennyiben az árut a helyszínen vágni kell, tilos sarokköszörűt alkalmazni és kerülni kell a vágókorongok alkalmazását is. Javasoljuk a lemezvágó ollót, szalagfűrészt vagy lengő fűrészt.</p>
      <p><b>5.3.</b> Az áru felületéről minden vágásból, fúrásból eredő törmeléket el kell távolítani, hogy a felülete ne sérüljön.</p>

      <p style="margin-top:10px">Aláírásommal igazolom, hogy a fentieket elolvastam, tudomásul vettem és elfogadom az azokban leírtakat.</p>
      <div class="psign">
        <div class="line">Kelt</div>
        <div class="line">Megrendelő aláírása</div>
      </div>
    </div>`;

  return { render, STORAGE_GUIDE };
})();
