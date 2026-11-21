// Token Radar dashboard: renders window.RADAR (compact) into a sortable,
// filterable board with a detail view per protocol and a live-token view.
// No network, no framework: the data ships in ../data.js. Farm plans are
// generated here from the same rules as board.json: capital from TVL tier,
// hold days from age, the core action from the protocol's category.

(function () {
  'use strict';
  var D = window.RADAR;
  if (!D) { document.getElementById('rows').innerHTML = '<tr><td colspan="9">No radar data loaded.</td></tr>'; return; }
  var M = D.m;

  function money(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) { return n === null || n === undefined ? '—' : (n > 0 ? '+' : '') + n.toFixed(1) + '%'; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

  // Decode compact rows: [rank, slug, name, cat, chain, tvl, chg, age, implied, odds, cm, gm, mm, watchlist]
  var rows = D.r.map(function (a) {
    return { rank: a[0], slug: a[1], name: a[2], cat: a[3] === null ? null : D.cats[a[3]], chain: a[4] === null ? null : D.chs[a[4]],
      tvl: a[5], chg: a[6], age: a[7], implied: a[8], odds: a[9], cm: a[10], gm: a[11], mm: a[12], wl: a[13] === 1 };
  });
  var watch = new Set();
  rows.forEach(function (r) { if (r.wl) watch.add(r.slug); });
  var live = D.l.map(function (a) {
    return { slug: a[0], name: a[1], cat: a[2] === null ? null : D.cats[a[2]], chain: a[3] === null ? null : D.chs[a[3]], tvl: a[4], mcap: a[5], chg: a[6] };
  });

  // ---- header stats ----
  var wlRows = rows.filter(function (r) { return watch.has(r.slug); });
  document.getElementById('stats').innerHTML = [
    ['<b>' + rows.length + '</b> <span>ranked</span>', ''],
    ['<b>' + M.wl + '</b> <span>watchlist</span>', ''],
    ['<b>' + M.es + '</b> <span>early finds</span>', ''],
    ['<b>' + M.ls + '</b> <span>live tokens shown</span>', ''],
    ['<span>Snapshot </span><b>' + esc(M.as) + '</b>', ''],
    ['<span>Top implied </span><b>' + money(rows[0].implied) + '</b>', '']
  ].map(function (x) { return '<div class="stat">' + x[0] + '</div>'; }).join('');

  // ---- category multiples ----
  document.getElementById('mults').innerHTML =
    D.mult.slice(0, 12).map(function (m) {
      return '<div><span>' + esc(D.cats[m[0]]) + '</span><b>' + m[1].toFixed(3) + '× · ' + m[2] + ' comps</b></div>';
    }).join('');

  // ---- filter selects ----
  var cats = [...new Set(rows.map(function (r) { return r.cat; }).filter(Boolean))].sort();
  var chs = [...new Set(rows.map(function (r) { return r.chain; }).filter(Boolean))].sort();
  var catSel = document.getElementById('cat'), chSel = document.getElementById('chain');
  cats.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o); });
  chs.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; chSel.appendChild(o); });

  var q = document.getElementById('q'), scope = document.getElementById('scope'), sort = document.getElementById('sort');
  var tbody = document.getElementById('rows'), countEl = document.getElementById('count'), noteEl = document.getElementById('board-note');
  var state = { view: 'board' };

  function capitalFor(tvl) { return tvl >= 5e9 ? 250 : tvl >= 1e9 ? 150 : tvl >= 1e8 ? 100 : 50; }
  function holdFor(age) { return age === null ? 30 : age < 180 ? 60 : age < 365 ? 45 : 30; }
  function actionFor(r, capital) {
    var c = (r.cat || '').toLowerCase(), n = r.name, ch = r.chain || 'its main chain', v = hash(r.slug) % 2;
    if (/lend|cdp|collateral/.test(c)) return v ? 'Lend $' + capital + ' of USDC on ' + n + ' (' + ch + ') and leave the deposit earning instead of withdrawing it.' : 'Supply $' + capital + ' of USDC to ' + n + ' on ' + ch + ' and keep the loan-to-value under half so the position survives a dip.';
    if (/dex|leveraged farm/.test(c)) return v ? 'Add $' + capital + ' to a ' + n + ' pool on ' + ch + ', take the LP receipt, and do not pull it out early.' : 'Provide $' + capital + ' of liquidity to ' + n + '\'s deepest pool on ' + ch + ' and keep the position in range.';
    if (/bridge|cross chain/.test(c)) return v ? 'Move $' + capital + ' across with ' + n + ' to ' + ch + ' and use the destination side of the protocol once.' : 'Bridge $' + capital + ' of USDC to ' + ch + ' through ' + n + ' and put the bridged funds to work in its app.';
    if (/staking|restak/.test(c)) return v ? 'Restake $' + capital + ' through ' + n + ' on ' + ch + ' and hold the receipt instead of selling it.' : 'Stake $' + capital + ' of the chain\'s staking asset through ' + n + ' and keep the receipt token in your wallet.';
    if (/perpetual|derivative/.test(c)) return v ? 'Fund a $' + capital + ' margin account on ' + n + ' (' + ch + ') and place a single small position.' : 'Deposit $' + capital + ' of USDC as margin on ' + n + ' and open one small hedged trade, then close it the same week.';
    if (/prediction/.test(c)) return v ? 'Put $' + capital + ' behind one prediction on ' + n + ' and hold it until the market resolves.' : 'Fund $' + capital + ' and place one market position on ' + n + ', then leave the market to settle.';
    if (/curator|allocator|risk/.test(c)) return v ? 'Allocate $' + capital + ' to a ' + n + ' strategy vault on ' + ch + ' and leave the shares untouched.' : 'Deposit $' + capital + ' into a ' + n + ' vault on ' + ch + ' and keep the vault shares for the full season.';
    if (/stable/.test(c)) return v ? 'Hold $' + capital + ' of ' + n + '\'s stable asset on ' + ch + ' instead of swapping it away.' : 'Mint or deposit $' + capital + ' of the stable asset through ' + n + ' on ' + ch + ' and hold it.';
    if (/rwa/.test(c)) return v ? 'Buy $' + capital + ' of ' + n + '\'s tokenised yield asset on ' + ch + ' and keep it in the farming wallet.' : 'Mint $' + capital + ' of the protocol\'s yield-bearing asset on ' + ch + ' and hold it through one distribution.';
    if (/insurance/.test(c)) return v ? 'Take $' + capital + ' of cover on ' + n + ' (' + ch + ') and hold the policy to its end date.' : 'Buy $' + capital + ' of cover from ' + n + ' on ' + ch + ' and keep the policy active for the season.';
    if (/yield/.test(c)) return v ? 'Put $' + capital + ' in the highest-TVL ' + n + ' vault on ' + ch + ' and keep it staked.' : 'Deposit $' + capital + ' into ' + n + '\'s main yield vault on ' + ch + ' and let the yield compound.';
    return v ? 'Open a $' + capital + ' position on ' + n + ' (' + ch + ') and leave it working for the season.' : 'Deposit $' + capital + ' of USDC into ' + n + ' on ' + ch + ' and keep the position open.';
  }
  function farmPlan(r) {
    var capital = capitalFor(r.tvl), hold = holdFor(r.age), gas = capital >= 150 ? 8 : 4;
    return [
      { t: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', c: 'under $3 of gas for the first transaction', w: '5 minutes' },
      { t: actionFor(r, capital), c: '$' + capital + ' of capital and about $' + gas + ' of gas', w: '15 minutes to set up' },
      { t: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.', c: 'about $2 of gas a week', w: '10 minutes a week' },
      { t: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', c: 'the $' + capital + ' stays in the position', w: hold + ' days' },
      { t: 'Before you withdraw, open the protocol\u2019s own points or rewards page and claim only from the link it publishes.', c: 'no fee to check, and never pay to claim', w: '10 minutes' },
      { t: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', c: 'nothing but the log', w: '5 minutes' }
    ];
  }

  // ---- board render ----
  function filtered() {
    var needle = q.value.trim().toLowerCase(), cat = catSel.value, ch = chSel.value, sc = scope.value;
    var list = rows.filter(function (r) {
      if (sc === 'watchlist' && !watch.has(r.slug)) return false;
      if (sc === 'early' && watch.has(r.slug)) return false;
      if (cat && r.cat !== cat) return false;
      if (ch && r.chain !== ch) return false;
      if (needle && r.name.toLowerCase().indexOf(needle) < 0 && r.slug.indexOf(needle) < 0) return false;
      return true;
    });
    var k = sort.value;
    var key = { rank: 'implied', tvl: 'tvl', growth: 'chg', age: 'age', odds: 'odds' }[k];
    list.sort(function (a, b) { return (b[key] === null ? -1e18 : b[key]) - (a[key] === null ? -1e18 : a[key]) || a.rank - b.rank; });
    return list;
  }
  function render() {
    var list = filtered();
    countEl.textContent = 'Showing ' + list.length + ' of ' + rows.length + ' ranked protocols · ' + wlRows.length + ' on the watchlist · values as of ' + M.as;
    tbody.innerHTML = list.map(function (r) {
      var cls = r.chg === null ? '' : r.chg >= 0 ? 'up' : 'down';
      return '<tr data-slug="' + esc(r.slug) + '"><td>' + r.rank + '</td>' +
        '<td class="name"><b>' + esc(r.name) + (watch.has(r.slug) ? '<span class="badge">WATCHLIST</span>' : '') + '</b><span>' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.cat || '—') + '</td><td>' + esc(r.chain || '—') + '</td>' +
        '<td class="num">' + money(r.tvl) + '</td><td class="num ' + cls + '">' + pct(r.chg) + '</td>' +
        '<td class="num">' + (r.age === null ? '—' : r.age + 'd') + '</td>' +
        '<td class="num"><b>' + money(r.implied) + '</b></td><td class="num">' + Math.round(r.odds * 100) + '%</td></tr>';
    }).join('');
    noteEl.textContent = 'Implied value is this entry\u2019s own claim from the snapshot\u2019s TVL, growth and age — never a prediction a token will be issued.';
  }
  tbody.addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (tr) openDetail(tr.getAttribute('data-slug'));
  });

  // ---- detail drawer ----
  var detail = document.getElementById('detail');
  function openDetail(slug) {
    var r = rows.find(function (x) { return x.slug === slug; });
    if (!r) return;
    var plan = farmPlan(r);
    var base = r.tvl * r.cm;
    detail.innerHTML = '<button class="close" id="d-close">Close ✕</button>' +
      '<h2>' + esc(r.name) + (watch.has(r.slug) ? '<span class="badge">WATCHLIST</span>' : '') + '</h2>' +
      '<p class="sub">#' + r.rank + ' · ' + esc(r.slug) + ' · ' + esc(r.cat || 'uncategorised') + ' · ' + esc(r.chain || '—') + ' · records no token</p>' +
      '<div class="kv">' +
      '<div><span>Implied value</span><b>' + money(r.implied) + '</b></div>' +
      '<div><span>Launch odds</span><b>' + Math.round(r.odds * 100) + '%</b></div>' +
      '<div><span>TVL</span><b>' + money(r.tvl) + '</b></div>' +
      '<div><span>7-day change</span><b>' + pct(r.chg) + '</b></div>' +
      '<div><span>Age</span><b>' + (r.age === null ? 'unknown' : r.age + ' days') + '</b></div>' +
      '<div><span>Category multiple</span><b>' + r.cm.toFixed(3) + '×</b></div></div>' +
      '<div class="math">TVL ' + money(r.tvl) + ' × ' + r.cm.toFixed(3) + ' (category multiple)\n' +
      '× ' + r.gm.toFixed(4) + ' (growth) × ' + r.mm.toFixed(4) + ' (maturity)\n= ' + money(r.implied) + ' implied value</div>' +
      '<h2>Farm plan</h2><ol class="farm">' +
      plan.map(function (s) { return '<li>' + esc(s.t) + '<span class="ct">Cost: ' + esc(s.c) + ' · Time: ' + esc(s.w) + '</span></li>'; }).join('') +
      '</ol><p class="note">“Records no token” means DefiLlama records no token — it is not proof the protocol has none. Check the protocol\u2019s own pages before you move funds.</p>';
    detail.hidden = false;
    document.getElementById('d-close').addEventListener('click', closeDetail);
    tbody.querySelectorAll('tr.sel').forEach(function (t) { t.classList.remove('sel'); });
    var tr = tbody.querySelector('tr[data-slug="' + slug + '"]');
    if (tr) tr.classList.add('sel');
    window.__radar.selected = slug;
  }
  function closeDetail() { detail.hidden = true; window.__radar.selected = null; }
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDetail(); });

  // ---- live view ----
  function renderLive() {
    document.getElementById('live-rows').innerHTML = live.map(function (p) {
      var mult = p.tvl > 0 && p.mcap ? (p.mcap / p.tvl).toFixed(2) + '×' : '—';
      return '<tr><td class="name"><b>' + esc(p.name) + '</b><span>' + esc(p.slug) + '</span></td>' +
        '<td>' + esc(p.cat || '—') + '</td><td>' + esc(p.chain || '—') + '</td>' +
        '<td class="num">' + money(p.tvl) + '</td><td class="num">' + money(p.mcap) + '</td>' +
        '<td class="num">' + mult + '</td><td class="num">' + pct(p.chg) + '</td></tr>';
    }).join('');
  }
  function setView(v) {
    state.view = v;
    document.getElementById('tab-board').setAttribute('aria-selected', v === 'board' ? 'true' : 'false');
    document.getElementById('tab-live').setAttribute('aria-selected', v === 'live' ? 'true' : 'false');
    document.getElementById('board').hidden = v !== 'board';
    document.getElementById('live').hidden = v !== 'live';
    if (v === 'live') renderLive();
  }
  document.getElementById('tab-board').addEventListener('click', function () { setView('board'); });
  document.getElementById('tab-live').addEventListener('click', function () { setView('live'); });

  // ---- hash routing for screenshots / deep links: #detail=<slug> #f=<category> #scope=<scope> ----
  function applyHash() {
    var h = new URLSearchParams(location.hash.slice(1));
    if (h.get('f')) { catSel.value = h.get('f'); }
    if (h.get('scope')) { scope.value = h.get('scope'); }
    if (h.get('sort')) { sort.value = h.get('sort'); }
    render();
    if (h.get('detail')) openDetail(h.get('detail')); else closeDetail();
  }
  [q, catSel, chSel, scope, sort].forEach(function (el) { el.addEventListener('input', render); });
  window.addEventListener('hashchange', applyHash);
  document.querySelectorAll('#board thead th').forEach(function (th) {
    th.addEventListener('click', function () {
      var k = th.getAttribute('data-k');
      sort.value = { rank: 'rank', name: 'rank', cat: 'rank', chain: 'rank', tvl: 'tvl', chg: 'growth', age: 'age', val: 'rank', odds: 'odds' }[k] || 'rank';
      render();
    });
  });
  document.getElementById('foot-meta').textContent = 'Model ' + M.mv + ' · snapshot ' + M.as + ' · ' + M.bs + ' rows · source: ' + M.src;

  window.__radar = { rows: rows, live: live, state: state, openDetail: openDetail, selected: null };
  applyHash();
})();
