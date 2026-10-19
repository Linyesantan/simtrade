'use strict';
/* ============ 教程：本地练习模式（不请求服务器、不影响真实账户） ============ */
const TUT = (() => {
  const KEY = 'tut_state_v1', PKEY = 'tut_progress_v2', FEE = .001, MFEE = .0008, PFEE = .0005, PMFEE = .0002, START = 10000;
  const fresh = () => ({ bal: { USDT: [START, 0] }, cost: {}, open: [], hist: [], positions: [], phist: [], porders: [], id: 1, created: Date.now() / 1000 });
  let st = LS.get(KEY, null) || fresh(); st.porders = st.porders || []; st.debt = st.debt || 0;
  const prog = LS.get(PKEY, { done: {}, cur: null, step: 0 });
  const save = () => { LS.set(KEY, st); LS.set(PKEY, prog) };
  const T = { active: false, st: () => st };
  const err = (m, code, need) => { const e = new Error(m); e.status = 400; if (code) e.code = code; if (need != null) e.need = need; throw e };
  const tk = s => { const t = S.tick[s]; if (!t) err('行情未就绪，稍等一下'); return t };
  const sk = s => { const t = (S.swap || {})[s] || S.tick[s]; if (!t) err('行情未就绪，稍等一下'); return t };
  const markOf = t => t.mark || (t.bid + t.ask) / 2;
  const bal = a => st.bal[a] || (st.bal[a] = [0, 0]);
  const add = (a, df, dl) => { const b = bal(a); if (b[0] + df < -1e-9 || b[1] + dl < -1e-9) err('余额不足', 'need_loan', Math.max(0, -(b[0] + df), -(b[1] + dl))); b[0] = Math.max(0, b[0] + df); b[1] = Math.max(0, b[1] + dl) };
  const now = () => Date.now() / 1000;
  const mmr = L => Math.min(.004, .4 / L);
  const liq = p => { const m = mmr(p.lev); return p.side === 'long' ? Math.max(0, (p.entry * p.qty - p.margin) / (p.qty * (1 - m))) : (p.entry * p.qty + p.margin) / (p.qty * (1 + m)) };
  const upnl = (p, mark) => p.side === 'long' ? (mark - p.entry) * p.qty : (p.entry - mark) * p.qty;
  const mid = t => (t.bid + t.ask) / 2;
  function closePos(p, cq, px, status) {
    const frac = cq / p.qty, mp = p.margin * frac; let pnl = upnl(p, px) * frac, fee = status === 'liquidated' ? 0 : cq * px * PFEE;
    if (status === 'liquidated') pnl = -mp;
    const back = Math.max(0, mp + pnl - fee); pnl = back - mp; if (back > 0) add('USDT', back, 0);
    st.phist.unshift({ ...p, qty: cq, margin: mp, status, close_px: px, pnl, fee, closed: now() });
    if (frac >= 1 - 1e-9) st.positions = st.positions.filter(x => x !== p); else { p.qty -= cq; p.margin -= mp }
    return pnl;
  }
  function me() {
    let eq = 0; const b = {}, cost = {};
    for (const [a, [f, l]] of Object.entries(st.bal)) { if (f + l < 1e-12 && a !== 'USDT') continue; b[a] = [f, l]; eq += a === 'USDT' ? f + l : (f + l) * (S.tick[a] ? S.tick[a].bid : 0); if (a !== 'USDT') cost[a] = st.cost[a] || 0 }
    const positions = st.positions.map(p => { const t = (S.swap || {})[p.sym] || S.tick[p.sym], mark = t ? markOf(t) : p.entry, u = upnl(p, mark); eq += Math.max(0, p.margin + u); return { ...p, mark, upnl: u, roe: u / p.margin, liq: liq(p) } });
    return { name: '教程模式', tutorial: true, init: START, fee: FEE, perp_fee: PFEE, max_lev: 400, bal: b, cost, equity: eq - (st.debt || 0), debt: st.debt || 0, ann: 999999, positions, porders: st.porders.slice().reverse(), open: st.open.slice().reverse(), hist: st.hist.slice(0, 30), rank: null, total: 0 };
  }
  function order(d) {
    const s = d.sym, t = tk(s), side = d.side;
    if (d.type === 'limit') {
      const qty = +d.qty, px = +d.px; if (!(qty > 0 && px > 0)) err('请输入价格和数量');
      if (px < mid(t) * .5 || px > mid(t) * 1.5) err('限价需在现价 ±50% 以内'); if (qty * px < 1) err('最小下单 1 USDT');
      if (side === 'buy' ? px >= t.ask : px <= t.bid) {
        const fpx = side === 'buy' ? t.ask : t.bid, c = qty * fpx, fee = c * FEE;
        if (side === 'buy') { add('USDT', -(c + fee), 0); add(s, qty, 0); st.cost[s] = (st.cost[s] || 0) + c + fee } else { const b = bal(s), tot = b[0] + b[1]; add(s, -qty, 0); if (tot > 0) st.cost[s] = (st.cost[s] || 0) * Math.max(0, 1 - qty / tot); add('USDT', c - fee, 0) }
        st.hist.unshift({ id: st.id++, sym: s, side, type: 'limit', qty, px, status: 'filled', fpx, fee, liq: 'taker', created: now(), done: now() }); save(); return { ok: true, status: 'filled', fpx, qty };
      }
      const amt = side === 'buy' ? qty * px * (1 + MFEE) : qty; add(side === 'buy' ? 'USDT' : s, -amt, amt);
      const o = { id: st.id++, sym: s, side, type: 'limit', qty, px, t: now(), created: now() }; st.open.push(o); save(); return { ok: true, id: o.id, status: 'open' };
    }
    let qty, fpx, fee;
    if (side === 'buy') { const amt = +d.amt; if (!(amt >= 1)) err('最小下单 1 USDT'); fpx = t.ask; qty = amt / (1 + FEE) / fpx; add('USDT', -amt, 0); add(s, qty, 0); st.cost[s] = (st.cost[s] || 0) + amt; fee = amt - qty * fpx }
    else { qty = +d.qty; if (!(qty > 0)) err('请输入数量'); fpx = t.bid; if (qty * fpx < 1) err('最小下单 1 USDT'); const b = bal(s), tot = b[0] + b[1]; add(s, -qty, 0); if (tot > 0) st.cost[s] = (st.cost[s] || 0) * Math.max(0, 1 - qty / tot); add('USDT', qty * fpx * (1 - FEE), 0); fee = qty * fpx * FEE }
    st.hist.unshift({ id: st.id++, sym: s, side, type: 'market', qty, px: null, status: 'filled', fpx, fee, liq: 'taker', created: now(), done: now() }); save();
    return { ok: true, status: 'filled', fpx, qty };
  }
  function cancel(o) { const amt = o.side === 'buy' ? o.qty * o.px * (1 + MFEE) : o.qty; add(o.side === 'buy' ? 'USDT' : o.sym, amt, -amt); st.open = st.open.filter(x => x !== o); st.hist.unshift({ ...o, status: 'cancelled', done: now() }) }
  function perpOpen(d) {
    const s = d.sym, t = sk(s), L = parseInt(d.lev), m = +d.margin; if (!(L >= 1 && L <= 400)) err('杠杆 1-400 倍'); if (!(m > 0)) err('请输入保证金'); if (m * L < 5) err('仓位价值至少 5 USDT');
    if (d.type === 'limit' && d.px && !(d.side === 'long' ? d.px >= t.ask : d.px <= t.bid)) {
      const lk = m + m * L * PMFEE; add('USDT', -lk, lk);
      const o = { id: st.id++, sym: s, side: d.side, lev: L, qty: m * L / d.px, px: +d.px, margin: m, tp: d.tp || null, sl: d.sl || null, locked: lk, created: now(), status: 'open' }; st.porders.push(o); save();
      return { ok: true, order_id: o.id, status: 'open' };
    }
    const px = d.side === 'long' ? t.ask : t.bid, n = m * L, fee = n * PFEE;
    if (d.tp && ((d.side === 'long' && d.tp <= px) || (d.side === 'short' && d.tp >= px))) err('止盈价方向不对：开多要高于现价，开空要低于现价');
    if (d.sl && ((d.side === 'long' && d.sl >= px) || (d.side === 'short' && d.sl <= px))) err('止损价方向不对：开多要低于现价，开空要高于现价');
    add('USDT', -(m + fee), 0);
    const p = { id: st.id++, sym: s, side: d.side, lev: L, qty: n / px, entry: px, margin: m, tp: d.tp || null, sl: d.sl || null, opened: now(), status: 'open', fee }; st.positions.unshift(p); save();
    return { ok: true, id: p.id, entry: px, qty: p.qty, fee, liq: liq(p) };
  }
  T.api = async (path, body) => {
    const p = path.split('?')[0];
    switch (p) {
      case 'me': return me();
      case 'order': return order(body);
      case 'cancel': { const o = st.open.find(x => x.id === body.id); if (!o) err('订单不存在或已成交'); cancel(o); save(); return { ok: true } }
      case 'cancel_all': { const os = st.open.filter(o => !body.sym || o.sym === body.sym); os.forEach(cancel); save(); return { ok: true, cancelled: os.length } }
      case 'orders': return { orders: st.hist.slice(0, 100) };
      case 'perp/open': return perpOpen(body);
      case 'perp/close': { const x = st.positions.find(q => q.id === body.id); if (!x) err('持仓不存在或已平仓'); const t = sk(x.sym), px = x.side === 'long' ? t.bid : t.ask, pct = +body.pct || 100; const pnl = closePos(x, pct >= 100 ? x.qty : x.qty * pct / 100, px, 'closed'); save(); return { ok: true, px, pnl } }
      case 'perp/tpsl': { const x = st.positions.find(q => q.id === body.id); if (!x) err('持仓不存在或已平仓'); x.tp = body.tp || null; x.sl = body.sl || null; save(); return { ok: true } }
      case 'perp/cancel': { const os = body.all ? st.porders.slice() : st.porders.filter(o => o.id === body.id); if (!os.length) err('委托不存在或已成交'); os.forEach(o => add('USDT', o.locked, -o.locked)); st.porders = st.porders.filter(o => !os.includes(o)); save(); return { ok: true, cancelled: os.length } }
      case 'perp/orders': return { orders: st.porders.slice().reverse() };
      case 'perp/funding': return { funding: [] };
      case 'perp/positions': return { positions: path.includes('closed') ? st.phist.slice(0, 100) : me().positions };
      case 'equity': return { init: START, points: [[Math.floor(st.created), START], [Math.floor(now()), me().equity]] };
      case 'loan': { if (!body) return { debt: st.debt || 0, items: [], rate: 0, max: 1e7 }; const amt = +body.amt; if (!(amt >= 1) || amt > 1e7) err('借款金额无效'); st.debt = (st.debt || 0) + amt; add('USDT', amt, 0); save(); return { ok: true, amt, debt: st.debt } }
      case 'loan/repay': { const amt = +body.amt; if (!(amt >= 1)) err('还款金额无效'); if (amt > (st.debt || 0) + 1e-6) err('还款金额超过欠款'); add('USDT', -amt, 0); st.debt = Math.max(0, (st.debt || 0) - amt); save(); return { ok: true, amt, debt: st.debt } }
      case 'logout': T.exit(); return { ok: true };
    }
    return null;
  };
  T.handles = path => T.active && ['me', 'order', 'cancel', 'cancel_all', 'orders', 'perp/open', 'perp/close', 'perp/tpsl', 'perp/positions', 'perp/cancel', 'perp/orders', 'perp/funding', 'loan', 'loan/repay', 'equity', 'logout'].includes(path.split('?')[0]);
  T.onTick = () => {
    if (!T.active) return; let ch = false;
    for (const o of st.open.slice()) { const t = S.tick[o.sym]; if (!t || o.t > now() - 1) continue;
      if (o.side === 'buy' && (t.ask <= o.px || t.last < o.px)) { add('USDT', 0, -o.qty * o.px * (1 + MFEE)); add(o.sym, o.qty, 0); st.cost[o.sym] = (st.cost[o.sym] || 0) + o.qty * o.px * (1 + MFEE) }
      else if (o.side === 'sell' && (t.bid >= o.px || t.last > o.px)) { const b = bal(o.sym), tot = b[0] + b[1]; if (tot > 0) st.cost[o.sym] = (st.cost[o.sym] || 0) * Math.max(0, 1 - o.qty / tot); add(o.sym, 0, -o.qty); add('USDT', o.qty * o.px * (1 - MFEE), 0) }
      else continue;
      st.open = st.open.filter(x => x !== o); st.hist.unshift({ ...o, status: 'filled', fpx: o.px, fee: o.qty * o.px * MFEE, liq: 'maker', done: now() }); ch = true; toast(`教程：限价单成交 ${o.side === 'buy' ? '买入' : '卖出'} ${fq(o.qty)} ${o.sym} @ ${fp(o.px)}`) }
    for (const o of st.porders.slice()) { const t = (S.swap || {})[o.sym]; if (!t || o.created > now() - 1) continue;
      if (o.side === 'long' ? (t.ask <= o.px || t.last < o.px) : (t.bid >= o.px || t.last > o.px)) {
        const fee = o.qty * o.px * PMFEE; add('USDT', o.locked - o.margin - fee, -o.locked);
        st.positions.unshift({ id: st.id++, sym: o.sym, side: o.side, lev: o.lev, qty: o.qty, entry: o.px, margin: o.margin, tp: o.tp, sl: o.sl, opened: now(), status: 'open', fee });
        st.porders = st.porders.filter(x => x !== o); ch = true; toast(`教程：合约限价单成交，${o.side === 'long' ? '开多' : '开空'} @ ${fps(o.px, o.sym, 'swap')}`) } }
    for (const p of st.positions.slice()) { const t = (S.swap || {})[p.sym] || S.tick[p.sym]; if (!t) continue; const mk = markOf(t);
      if (p.margin + upnl(p, mk) <= mmr(p.lev) * p.qty * mk) { closePos(p, p.qty, mk, 'liquidated'); ch = true; toast(`教程：${p.sym} ${p.lev}x 仓位被强制平仓（爆仓），保证金归零`, 'err'); continue }
      const ex = p.side === 'long' ? t.bid : t.ask, lt = t.last;
      const hit = p.tp && ((p.side === 'long' && lt >= p.tp) || (p.side === 'short' && lt <= p.tp)) ? 'tp' : p.sl && ((p.side === 'long' && lt <= p.sl) || (p.side === 'short' && lt >= p.sl)) ? 'sl' : null;
      if (hit) { const pnl = closePos(p, p.qty, ex, hit); ch = true; toast(`教程：${hit === 'tp' ? '止盈' : '止损'}触发，盈亏 ${pnl >= 0 ? '+' : ''}${fu(pnl)} USDT`, pnl >= 0 ? 'ok' : 'err') } }
    if (ch) { save(); S.hist = S.phist = null; loadMe() } else if (S.me && S.me.tutorial) { S.me = me(); renderRecords(); renderUser(); if (S.view === 'assets') renderAssets() }
  };

  /* ---------- 章节 ---------- */
  const mob = () => matchMedia('(max-width:1000px)').matches;
  const v = id => +($(id) || {}).value || 0;
  let t0 = 0, copiedAt = 0, gave = false, moreOpen = false, shownAt = 0, freeAfter = '';
  const moreHtml = () => moreOpen ? `<div class="tut-more"><span>练习资金 ${fu(me().equity)} USDT</span><button data-a="menu">章节</button><button data-a="reset">重置资金</button><button data-a="exit">退出教程</button></div>` : '';                                   // 当前步骤开始时间：只认这一步之后的新操作
  const lastHist = f => st.hist.find(o => (o.created || 0) >= t0 - 1 && f(o));
  const nb = (a, b) => b ? `${a}（${b}）` : a;
  const after = x => (x || 0) >= t0 - 1;                // 只认本步开始之后发生的
  // 切到现货指定方向/类型；已经是目标状态就不动（setSide 会清空输入）
  const spot = (side, ot = 'market') => { if (location.hash.indexOf('#/trade') !== 0) location.hash = '#/trade/BTC'; if (S.mode !== 'spot') setMode('spot'); if (S.otype !== ot) setOtype(ot); if (S.side !== side) setSide(side) };
  const CH = [
    { id: 'zero', title: '第 0 章　只有一个币，两个按钮', steps: [
      { t: '#symbar', pre: () => { location.hash = '#/trade/BTC'; setMode('spot'); setOtype('market'); setSide('buy') }, h: '我们从最简单的开始：现在只有一个币 <b>BTC（比特币）</b>，以及<b>买入</b>和<b>卖出</b>两个按钮。<br>其他按钮和面板会随着你一步步学习才出现。' },
      { t: '#sb-last', h: '这个大数字是 <b>1 个 BTC 现在值多少 USDT</b>，每秒都在变。<br>USDT 可以当成“美元现金”，1 USDT ≈ 1 美元。你有 <b>10,000</b> 练习 USDT。' },
      { t: '.side-tabs', h: '<b>买入</b>：用 USDT 换成 BTC。<br><b>卖出</b>：把 BTC 换回 USDT。<br>低价买、高价卖，中间的差价就是赚到的钱。下一章就来真的买一次。' }
    ] },
    { id: 'buy', title: '第 1 章　第一次买入', steps: [
      { t: '#s-qty', pre: () => { location.hash = '#/trade/BTC'; setMode('spot'); setOtype('market'); setSide('buy') }, h: '在框里输入 <b>1000</b>，意思是花 1000 USDT 买 BTC。', ok: () => v('#s-qty') >= 1, stable: '#s-qty', wait: '输完停一下自动继续' },
      { t: '#s-go', pre: () => spot('buy'), h: '点<b>买入 BTC</b>，马上按现在的价格成交。', ok: () => !!lastHist(o => o.side === 'buy'), wait: '买入成功后自动继续' },
      { t: '.records', u: ['records', 'rec-bal'], pre: () => setRec('bal'), h: '<i class="tu-tag">新</i>下面出现了<b>现货资产</b>面板：你持有多少 BTC、平均买入价，以及现在<b>赚了还是亏了</b>（浮动盈亏）。' }
    ] },
    { id: 'sell', title: '第 2 章　卖出', steps: [
      { t: '.side-tabs', pre: () => { location.hash = '#/trade/BTC'; gave = false; if (S.tick.BTC && !(bal('BTC')[0] * S.tick.BTC.bid >= 10)) { try { order({ sym: 'BTC', side: 'buy', type: 'market', amt: 1000 }); gave = true; loadMe() } catch (e) { } } spot('sell') }, h: () => '已经帮你切到<b>卖出</b>。卖出就是把 BTC 换回 USDT。' + (gave ? '<br>（你手上没有 BTC，已用 1000 USDT 帮你买了一点来练习。）' : '') },
      { t: '#f-spot .pct-btns', u: ['pct'], pre: () => spot('sell'), h: '<i class="tu-tag">新</i>新按钮：<b>25% / 50% / 75% / 100%</b>，按你持有的 BTC 一键填数量。点 <b>50%</b>。', ok: () => v('#s-qty') > 0, wait: '选好数量后自动继续' },
      { t: '#s-go', pre: () => spot('sell'), h: '点<b>卖出 BTC</b>，得到的 USDT 会回到可用余额。', ok: () => !!lastHist(o => o.side === 'sell'), wait: '卖出成功后自动继续' },
      { t: '#rec-tabs', u: ['rec-hist'], pre: () => setRec('hist'), h: '<i class="tu-tag">新</i>新面板：<b>历史委托</b>，记录每一笔买卖的成交价、数量和手续费。' }
    ] },
    { id: 'price', title: '第 3 章　看懂涨跌和 K 线', steps: [
      { t: '#symbar', u: ['stats'], pre: () => { location.hash = '#/trade/BTC' }, h: '<i class="tu-tag">新</i>价格旁边多了几个数字：<b>24h 涨跌</b>（<b class="up">绿色</b>涨、<b class="dn">红色</b>跌，和 A 股相反）、24 小时最高价、最低价和成交额。' },
      { t: '#sb-info', pre: () => { if (!$('#coin-info').hidden) $('#sb-info').click() }, h: '<i class="tu-tag">新</i>点<b>币种介绍</b>，可以看这个币是做什么的。', ok: () => !$('#coin-info').hidden, wait: '打开介绍后自动继续' },
      { t: '#coin-info', h: '这就是<b>币种介绍</b>：它是什么、用来做什么。看完点下一步（点“收起介绍”可以收起）。' },
      { t: '.chart-box', u: ['chart'], h: '<i class="tu-tag">新</i>这是 <b>K 线图</b>，用来看价格是怎么一路走过来的。<br>图上一根根小棍子长得像蜡烛，所以叫“<b>蜡烛</b>”。<b>一根蜡烛 = 一小段时间</b>（比如 15 分钟）：<b class="up">绿色</b>表示这段时间涨了，<b class="dn">红色</b>表示跌了。胖的部分越长，涨跌越多；上下伸出的细线，是这段时间价格最高、最低冲到过哪里。' },
      { t: '.chart-tools', u: ['tf'], h: '<i class="tu-tag">新</i>这排按钮决定<b>一根蜡烛管多长时间</b>：选“1分”，一根就是 1 分钟；选“日线”，一根就是一天。<br>“<b>分时</b>”不画蜡烛，只画一条价格线，最好懂。<b>MA 均线</b>：把最近一段时间的价格取个平均连成线，看大方向是往上还是往下。' }
    ] },
    { id: 'fee', title: '第 4 章　手续费', steps: [
      { t: '#s-qty', pre: () => { location.hash = '#/trade/BTC'; spot('buy'); $('#s-qty').value = 1000; calcSpot('qty') }, h: '我们在金额里填了 1000 USDT，先别点买入。' },
      { t: '#s-est', u: ['est', 'tips'], h: '<i class="tu-tag">新</i>这里显示<b>预计成交和手续费</b>。每次买卖交易所收 0.1%（1000 USDT 收 1 USDT），来回频繁交易，手续费会吃掉利润。<br>旁边的 ⓘ 小问号也出现了，不懂的词点开就有解释。' }
    ] },
    { id: 'limit', title: '第 5 章　限价单：等到好价格再买', steps: [
      { t: '#f-spot .otype', u: ['otype', 'total'], pre: () => { location.hash = '#/trade/BTC'; spot('buy', 'limit'); $('#s-qty').value = ''; $('#s-tot').value = ''; $('#s-pct').value = 0; S.pxTouched = true; const t = S.tick.BTC; if (t) { $('#s-px').value = (t.last * .98).toFixed(dec(t.last)); calcSpot('px') } }, h: '<i class="tu-tag">新</i>新按钮：<b>限价 / 市价</b>。<br>前面用的都是<b>市价</b>：马上成交，价格由市场定。<b>限价</b>：你自己定价格，到了才成交。' },
      { t: '#s-px-f', pre: () => spot('buy', 'limit'), h: '我们在现价下方 2% 帮你填了一个买入价，意思是“<b>跌到这个价我才买</b>”。' },
      { t: '#s-qty', pre: () => spot('buy', 'limit'), h: '数量填 <b>0.01</b>（BTC）。', ok: () => v('#s-qty') > 0, stable: '#s-qty', wait: '输完停一下自动继续' },
      { t: '#s-go', h: '点<b>买入 BTC</b>。价格没跌到之前，订单会一直挂着等。', pre: () => spot('buy', 'limit'), ok: () => st.open.some(o => after(o.created)) || !!lastHist(o => o.type === 'limit'), wait: '挂单后自动继续' },
      { t: '.records', u: ['rec-open'], pre: () => setRec('open'), h: '<i class="tu-tag">新</i>新面板：<b>现货委托</b>，挂着没成交的单都在这。挂单期间钱被冻结，点<b>撤单</b>就退回。试试撤掉它。', ok: () => st.open.length === 0, wait: '撤单（或成交）后自动继续' },
      { t: '#rec-tabs', h: '记住：限价单价格你定，但不保证成交；市价单马上成交，但价格市场定。' }
    ] },
    { id: 'coins', title: '第 6 章　换一个币，看看盘口', steps: [
      { t: () => mob() ? (document.body.classList.contains('v-markets') ? '#markets' : '#sym-btn') : '#markets', u: ['markets'], pre: () => { location.hash = '#/trade/BTC' }, h: () => '<i class="tu-tag">新</i>解锁<b>币种列表</b>：35 个主流币，后面是最新价和涨跌幅。' + (mob() ? '点<b>币名</b>打开列表，选一个 BTC 以外的币。' : '点任意一行，切换到 BTC 以外的币（点 ★ 可以加入自选）。'), ok: () => S.sym !== 'BTC' && !document.body.classList.contains('v-markets'), wait: '换好币后自动继续' },
      { t: () => mob() ? '#m-tabs' : '#book-box', u: ['book'], pre: () => { if (document.body.classList.contains('v-markets') || location.hash.indexOf('#/trade') !== 0) location.hash = '#/trade/' + S.sym; mob() && setPane('book') }, h: '<i class="tu-tag">新</i>新面板：<b>盘口</b>。<b class="dn">红色</b>是别人挂着要卖的价格，<b class="up">绿色</b>是别人挂着要买的价格。市价买入就是从最便宜的卖单开始吃。' },
      { t: () => mob() ? '#m-tabs' : '#trades-box', pre: () => mob() && setPane('trades'), h: '<i class="tu-tag">新</i><b>最新成交</b>：市场上刚刚真实发生的每一笔买卖。' }
    ] },
    { id: 'perp', title: '第 7 章　合约：开多与开空', steps: [
      { t: '.mode-tabs', u: ['modes'], pre: () => { location.hash = '#/trade/BTC'; mob() && setPane('form'); setMode('perp'); setPotype('market'); setLev(10) }, h: '<i class="tu-tag">新</i>新按钮：<b>现货 / 合约</b>，已切到合约。<br><b>现货</b>：真的把币买到手，涨了才赚。<br><b>合约</b>：手里不拿币，只是<b>押价格往哪走</b>。押对了赚差价，押错了亏差价。' },
      { t: '.go2', h: '合约有两个方向：<br><b class="up">开多</b> = 押它<b>涨</b>。比如 BTC 从 80000 涨到 80800，你就赚。<br><b class="dn">开空</b> = 押它<b>跌</b>。BTC 跌了你反而赚，这是现货做不到的。<br>平仓 = 结束这次押注，把盈亏结算到余额里。' },
      { t: '.lev-row', u: ['lev'], h: '<i class="tu-tag">新</i><b>杠杆</b> = 把你的本金放大来押。已设为 <b>10 倍</b>：<br>拿 500 USDT 当本金，就按 5000 USDT 来算盈亏。价格涨 1%，你赚 50（本金的 10%）；跌 1%，你亏 50。<br>倍数越高，赚得快，亏得也快：<b>10 倍时价格反向走约 10%，本金就会亏光</b>（叫“爆仓”）。新手建议 1–10 倍。' },
      { t: '#p-mg', u: ['ppct'], h: '<b>保证金</b>就是你投入的本金。填 <b>500</b>，配合 10 倍杠杆就控制 5000 USDT 的仓位。', ok: () => v('#p-mg') > 0, stable: '#p-mg', wait: '输完停一下自动继续' },
      { t: '#p-est', u: ['pest'], h: '<i class="tu-tag">新</i>下单前看清这里：仓位价值、手续费，以及最重要的<b>强平价</b>：价格走到那里，这笔保证金就全没了。' },
      { t: '.go2', h: '觉得 BTC 会涨就点<b>开多</b>，会跌就点<b>开空</b>。选一个吧。', ok: () => st.positions.some(p => after(p.opened)), wait: '开仓后自动继续' },
      { t: '#rec-tabs', u: ['rec-pos'], pre: () => setRec('pos'), h: '<i class="tu-tag">新</i>新面板：<b>合约持仓</b>。开仓价、强平价、未实现盈亏和收益率都会实时跳动。' },
      { t: () => $('#sb-fund') && !$('#sb-fund').hidden ? '#sb-fund' : '#symbar', u: ['fund', 'rec-fund'], h: '<i class="tu-tag">新</i><b>资金费率</b>：费率为正时，开多的人每隔几小时付一点钱给开空的人（为负反过来）。这里是 OKX 实时费率和下次结算倒计时。' }
    ] },
    { id: 'tpsl', title: '第 8 章　止盈止损与平仓', steps: [
      { t: () => $('#rec-body .pos') ? '#rec-body .pos' : '#rec-body', pre: () => { location.hash = '#/trade/BTC'; gave = false; if (!st.positions.length) { try { perpOpen({ sym: 'BTC', side: 'long', lev: 10, margin: 500, type: 'market' }); gave = true } catch (e) { } } setRec('pos'); S.tpo = new Set(st.positions.slice(0, 1).map(p => p.id)); S.hist = S.phist = null; loadMe() }, h: () => (gave ? '（你还没有合约持仓，已帮你开了一个 10 倍多单来练习。）<br>' : '') + '点持仓上的<b>止盈止损</b>：设置“涨到多少自动卖出赚钱”和“跌到多少自动认赔”。填好后保存。', ok: () => st.positions.some(p => p.tp || p.sl), wait: '保存后自动继续', skip: true },
      { t: () => $('#rec-body .pos') ? '#rec-body .pos' : '#rec-body', h: '再试试点<b>平 50%</b>：先把一半盈亏落袋。', ok: () => st.phist.some(p => p.status === 'closed' && after(p.closed)), wait: '平仓后自动继续', skip: true },
      { t: '#rec-tabs', u: ['rec-phist'], pre: () => setRec('phist'), h: '<i class="tu-tag">新</i>新面板：<b>合约历史</b>，记录每次平仓的盈亏和方式（手动、止盈、止损、强平）。' },
      { t: '.potype', u: ['tpsl', 'potype', 'rec-pord'], pre: () => { mob() && setPane('form'); setMode('perp') }, h: '<i class="tu-tag">新</i>合约也能用<b>限价 / 市价</b>了：限价单挂着等价格，挂单在“合约委托”里查看和撤销。' },
      { t: '#f-perp .chk', h: '<i class="tu-tag">新</i>勾选这里，开仓时就能直接带上<b>止盈 / 止损</b>，不用开完再设置。' }
    ] },
    { id: 'liq', title: '第 9 章　体验高杠杆爆仓（练习资金）', steps: [
      { t: '.lev-row', pre: () => { location.hash = '#/trade/BTC'; mob() && setPane('form'); setMode('perp'); setPotype('market'); setLev(400); $('#p-mg').value = 20; calcPerp() }, h: '杠杆调到了 <b>400 倍</b>，保证金 20 USDT。看看强平价：离现价只有约 <b>0.15%</b>。' },
      { t: '.go2', h: '随便点开多或开空，然后盯着持仓。很可能几分钟内就<b>爆仓</b>。这就是高杠杆的风险。', ok: () => st.positions.some(p => p.lev >= 100 && after(p.opened)) || st.phist.some(p => p.lev >= 100 && after(p.opened)), wait: '开仓后自动继续', skip: true },
      { t: '#rec-tabs', pre: () => setRec('pos'), h: '爆仓会弹出提示，并在“合约历史”里显示“强制平仓”。真实交易里请远离高倍杠杆。可以随时点“下一步”结束本章。' }
    ] },
    { id: 'loan', title: '第 10 章　借贷：没钱了怎么办', steps: [
      { t: '.tut-loan', pre: () => { location.hash = '#/trade/BTC' }, h: '钱不够下单时<b>不会再报“余额不足”</b>，而是会自动弹出借贷窗口。卡片上这个 <b>💰 借贷</b> 按钮也随时可以借钱。教程里借到的是<b>练习钱</b>。' },
      { t: '.tut-loan', h: '点开 <b>💰 借贷</b> 试试：随便借一笔（比如 5,000），<b>没有利息</b>，借多久都行。', ok: () => (st.debt || 0) > 0, wait: '借到钱后自动继续', skip: true },
      { t: '#s-av', h: '借到的钱直接进<b>可用</b>余额，和普通钱一样用。<br>但记住：<b>欠款会从总资产里扣掉</b>。借来的钱亏掉后，<b>收益率会跌破 −100%</b>——“欠债王”就是这么诞生的。' },
      { t: '.tut-loan', h: '最后记得还款：点 <b>💰 借贷</b>，窗口里有<b>还款</b>按钮，不收利息。<br>真实账户里也一样：没钱就借，亏完借的钱，收益率可以跌到 −100% 以下。本章到此结束。' }
    ] },
    { id: 'ai', title: '第 11 章　全部功能 + 让 AI 帮你交易', steps: [
      { t: () => mob() ? '#mnav' : '.dnav', u: ['nav'], h: '<i class="tu-tag">新</i>所有页面都解锁了：<b>资产</b>看总资产和收益曲线，<b>排行</b>看大家的收益排名，<b>API</b> 可以让 AI 帮你下单。' },
      { t: '#api', pre: () => { location.hash = '#/api' }, h: '在 API 页登录后可以生成 <b>API Key</b>，把它和页面上那段说明发给你的 AI，它就能替你查行情、下单（真实模拟账户）。' },
      { t: () => $('#copy-prompt') ? '#copy-prompt' : '#api', pre: () => { if (location.hash !== '#/api') location.hash = '#/api' }, h: '点<b>复制这段话</b>，再发给 AI 就行。教程到此结束，去真实模拟账户试试吧！', ok: () => copiedAt >= t0 - 1, wait: '复制后自动完成' }
    ] }
  ];

  /* ---------- 渐进解锁：没学到的按钮/面板先隐藏 ---------- */
  const R = r => `#rec-tabs [data-r=${r}]`;
  const FEAT = {
    records: '.records', 'rec-bal': R('bal'), 'rec-hist': R('hist'), 'rec-open': R('open'), 'rec-pos': R('pos'), 'rec-pord': R('pord'), 'rec-phist': R('phist'), 'rec-fund': R('fund'),
    pct: '#f-spot .pct', stats: '.sb-stats:not(#sb-fund),#sb-info,#sb-fav,#coin-info,#sb-usd', chart: '.chart-box', tf: '.chart-tools,#legend',
    est: '#s-est', tips: '.tip', otype: '#f-spot .otype,#s-px-f,#s-mkt-f', total: '#s-tot-f',
    markets: '#markets,#sym-btn>i,.only-cur', book: '#m-tabs,aside.side',
    modes: '.mode-tabs', lev: '.lev-row,#lev-r,.lev-pre', ppct: '#f-perp .pct', pest: '#p-est,#p-warn', fund: '#sb-fund',
    tpsl: '#f-perp .chk,#p-tpsl', potype: '.potype,#p-px-f', nav: '.dnav,.mnav'
  };
  const ALL = Object.keys(FEAT);
  (() => {
    let css = Object.entries(FEAT).map(([k, sel]) => sel.split(',').map(x => `body.tl:not(.u-${k}) ${x}`).join(',') + '{display:none!important}').join('\n');
    css += `\nbody.tl:not(.u-markets) #sym-btn{pointer-events:none}
@media (min-width:1001px){body.tl:not(.u-markets) #v-trade{grid-template-columns:0 minmax(0,1fr) 300px}body.tl:not(.u-book) #v-trade{grid-template-columns:260px minmax(0,1fr) 0}body.tl:not(.u-markets):not(.u-book) #v-trade{grid-template-columns:0 minmax(0,1fr) 0}body.tl:not(.u-chart) .trade-form{max-width:520px;margin:0 auto}}
@media (max-width:1000px){body.tl:not(.u-nav){padding-bottom:0}}
body.tl .tu-tag{font-style:normal;font-size:11px;font-weight:700;background:var(--y);color:#181a20;border-radius:3px;padding:0 4px;margin-right:4px;vertical-align:1px}
body.tl .tu-new{animation:tuNew 1.6s ease 2}@keyframes tuNew{0%,100%{box-shadow:none}50%{box-shadow:0 0 0 3px rgba(240,185,11,.8)}}`;
    const el = document.createElement('style'); el.textContent = css; document.head.appendChild(el);
  })();
  let shown = null;
  function unlockedSet() {
    if (!T.active) return null;
    let ci = CH.findIndex(c => c.id === prog.cur), si = prog.step;
    if (ci < 0) { if (CH.every(c => prog.done[c.id])) return null; ci = Math.max(-1, ...CH.map((c, i) => prog.done[c.id] ? i : -1)) + 1; si = -1 }
    const u = new Set();
    CH.forEach((c, i) => { if (i > ci) return; c.steps.forEach((s, k) => { if (i < ci || k <= si) (s.u || []).forEach(x => u.add(x)) }) });
    return u;
  }
  function applyUnlock() {
    const u = unlockedSet(), b = document.body;
    if (!u) { b.classList.remove('tl'); ALL.forEach(k => b.classList.remove('u-' + k)); shown = null; return }
    b.classList.add('tl');
    const fresh = shown ? [...u].filter(k => !shown.has(k)) : [];
    ALL.forEach(k => b.classList.toggle('u-' + k, u.has(k)));
    shown = u;
    fresh.forEach(k => $$(FEAT[k]).forEach(e => { e.classList.remove('tu-new'); void e.offsetWidth; e.classList.add('tu-new'); setTimeout(() => e.classList.remove('tu-new'), 3300) }));
    if (!u.has('otype') && S.otype !== 'market') setOtype('market');
    if (!u.has('modes') && S.mode === 'perp') setMode('spot');
    if (!u.has('potype') && S.potype !== 'market') setPotype('market');
    if (!u.has('book') && S.pane && S.pane !== 'form') setPane('form');
    if (u.has('records') && !u.has('rec-' + S.rec)) { const r = ['bal', 'hist', 'open', 'pos', 'pord', 'phist', 'fund'].find(r => u.has('rec-' + r)); r && setRec(r) }
  }
  T.applyUnlock = applyUnlock;
  T.chapters = CH; T.prog = prog;

  /* ---------- 引导层 ---------- */
  let ring, box, banner, timer, curEl, curStep;
  // 记录区每次行情都会重绘，高亮目标可能被替换：每次用时重新找一遍
  const live = () => { if (curEl && !curEl.isConnected && curStep) curEl = target(curStep) || curEl; return curEl };
  function ui() {
    if (ring) return;
    ring = document.createElement('div'); ring.className = 'tut-ring'; document.body.appendChild(ring);
    box = document.createElement('div'); box.className = 'tut-box';
    banner = document.createElement('div'); banner.className = 'tut-banner';
    { const hd = document.querySelector('header.top'); if (hd) { hd.after(banner); hd.after(box) } else document.body.append(box, banner) }   // 卡片和横条放进页面流里，自己占一块空间，不压在内容上
    box.onclick = e => { const btn = e.target.closest('button'), a = btn && btn.dataset.a;
      if (a === 'next') next(true); else if (a === 'prev') go(prog.cur, Math.max(0, prog.step - 1)); else if (a === 'exit') T.exit(); else if (a === 'menu') { T.pause(); location.hash = '#/guide' } else if (a === 'loan') openLoan();
      else if (a === 'reset') { if (confirm('把教程练习资金重置为 10,000 USDT？')) { st = fresh(); save(); S.hist = S.phist = null; loadMe(); toast('练习资金已重置') } }
      else if (a === 'more') { moreOpen = !moreOpen; btn.textContent = moreOpen ? '收起 ▴' : '更多 ▾'; const o = box.querySelector('.tut-more'); if (o) o.remove(); if (moreOpen) box.insertAdjacentHTML('beforeend', moreHtml()); place(); reveal(curEl) } };
    banner.onclick = e => { const a = e.target.dataset.a; if (a === 'exit') T.exit(); if (a === 'loan') openLoan(); if (a === 'reset') { if (confirm('把教程练习资金重置为 10,000 USDT？')) { st = fresh(); save(); S.hist = S.phist = null; loadMe(); toast('练习资金已重置') } } if (a === 'resume') go(prog.cur || CH[0].id, prog.step || 0); if (a === 'menu') location.hash = '#/guide' };
    window.addEventListener('resize', place); document.addEventListener('toggle', () => setTimeout(place, 30), true); document.addEventListener('focusin', () => setTimeout(place, 30)); document.addEventListener('focusout', () => setTimeout(place, 30)); window.addEventListener('scroll', place, true); setInterval(() => { if (!curEl || !curStep || !T.active) return; const nt = target(curStep); if (nt && nt !== curEl) { curEl = nt; place() } else if (!curEl.isConnected) place() }, 300);
    document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#copy-prompt')) copiedAt = now() }, true);
  }
  function renderBanner() { const card = !!(box && !box.hidden); banner.hidden = !T.active || card; document.body.classList.toggle('tut-on', T.active); document.body.classList.toggle('tut-card', T.active && card); banner.classList.toggle('tut-free', !!(freeAfter && prog.cur && !curEl)); banner.innerHTML = (freeAfter && prog.cur && !curEl ? `<b>✓ ${freeAfter} 完成</b><span>自由练习时间：随便买、随便卖，练够了再继续</span><button data-a="resume" class="btn-y tut-nextch">下一章 ▸</button>` : `<b>教程模式</b><span>本地练习资金 ${fu(me().equity)} USDT，不影响真实账户</span>${prog.cur && !curEl ? '<button data-a="resume">继续教程</button>' : ''}`) + `<button data-a="loan">💰 借贷</button><button data-a="menu">章节</button><button data-a="reset">重置资金</button><button data-a="exit">退出教程</button>` }
  function target(s) { const sel = typeof s.t === 'function' ? s.t() : s.t; return $(sel) }
  // 引导卡片固定停在屏幕底部（手机在底部导航上方），不跟着目标跳；靠滚动页面把目标放进卡片上方的空白区
  const dock = () => { const m = mob(), W = innerWidth, bw = m ? W - 20 : Math.min(560, W - 40); return { m, bw, left: m ? 10 : Math.round((W - bw) / 2), bottom: m ? 70 : 16, top: m ? 84 : 96 } };
  function place() {   // 卡片固定在屏幕最上方（顶替标题栏），只移动高亮框
    if (!box || box.hidden) return; document.documentElement.style.setProperty('--tuth', box.offsetHeight + 'px');
    if (!live() || !T.active) return; const r0 = curEl.getBoundingClientRect(), r = { top: r0.top, bottom: r0.bottom, left: r0.left, right: r0.right };
    curEl.querySelectorAll('details.tip[open] > div').forEach(c => { const k = c.getBoundingClientRect(); if (k.width) { r.top = Math.min(r.top, k.top); r.bottom = Math.max(r.bottom, k.bottom); r.left = Math.min(r.left, k.left); r.right = Math.max(r.right, k.right) } });
    Object.assign(ring.style, { left: r.left - 4 + 'px', top: r.top - 4 + 'px', width: r.right - r.left + 8 + 'px', height: r.bottom - r.top + 8 + 'px', display: 'block' });
  }
  function flash() {   // 新步骤：卡片发光 + 一圈粒子，让人第一眼看到
    box.classList.remove('tut-pop'); void box.offsetWidth; box.classList.add('tut-pop');
    setTimeout(() => { const b = box.getBoundingClientRect(); if (!b.width) return;
      for (let k = 0; k < 18; k++) { const p = document.createElement('i'); p.className = 'tut-pt'; const a = k / 18 * Math.PI * 2, ex = b.left + b.width / 2 + Math.cos(a) * b.width / 2, ey = b.top + b.height / 2 + Math.sin(a) * b.height / 2;
        p.style.left = ex + 'px'; p.style.top = ey + 'px'; p.style.setProperty('--dx', Math.cos(a) * (26 + Math.random() * 26) + 'px'); p.style.setProperty('--dy', Math.sin(a) * (26 + Math.random() * 26) + 'px');
        document.body.appendChild(p); setTimeout(() => p.remove(), 900) } }, 380);
  }
  function reveal(el) {   // 把目标滚到卡片下方、底部导航上方
    if (!el) return; try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }) } catch (e) { }
    const lo = box.getBoundingClientRect().bottom + 10, hi = innerHeight - (mob() ? 66 : 10), r = el.getBoundingClientRect();
    let dy = 0; if (r.height > hi - lo || r.top < lo) dy = r.top - lo; else if (r.bottom > hi) dy = r.bottom - hi;
    if (Math.abs(dy) > 2) window.scrollBy({ top: dy, behavior: 'instant' }); place();
  }

  function show() {
    clearInterval(timer); const ch = CH.find(c => c.id === prog.cur); if (!ch) return;
    const s = ch.steps[prog.step]; if (!s) { prog.done[ch.id] = 1; const i = CH.indexOf(ch); toast(`${ch.title.replace(/　/, ' ')} 完成！`); if (CH[i + 1]) { prog.cur = CH[i + 1].id; prog.step = 0; save(); if (ch.id === 'sell' || ch.id === 'liq') { freeAfter = ch.id === 'sell' ? '买入和卖出' : '第 9 章 高杠杆爆仓'; T.pause(); applyUnlock(); return } show(); return } prog.cur = null; prog.step = 0; save(); T.pause(); applyUnlock(); location.hash = '#/guide'; toast('全部教程完成！功能已全部解锁'); return }
    t0 = now(); applyUnlock();
    if (s.pre) try { s.pre() } catch (e) { }
    setTimeout(() => {
      const h = typeof s.h === 'function' ? s.h() : s.h, needs = !!s.ok;
      box.innerHTML = `<div class="tut-h">${ch.title}<span>${prog.step + 1}/${ch.steps.length}</span></div><p>${h}</p>${needs ? `<p class="tut-w">👉 ${s.wait || '完成操作后自动继续'}</p>` : ''}<div class="tut-a">${prog.step ? '<button data-a="prev">上一步</button>' : ''}<button data-a="more" class="tut-mb">${moreOpen ? '收起 ▴' : '更多 ▾'}</button><button data-a="loan" class="tut-loan">💰 借贷</button><span class="sp"></span>${needs ? '' : '<button class="btn-y" data-a="next">下一步</button>'}</div>${moreHtml()}`; if (typeof glossify === 'function') glossify(box.querySelector('p'));
      curStep = s; curEl = target(s) || $('#app');   // 卡片渲染后再取目标（目标可能是卡片里的按钮，如 💰 借贷）
      box.hidden = false; freeAfter = ''; shownAt = performance.now(); renderBanner(); place(); reveal(curEl); setTimeout(() => { if (curEl) reveal(curEl) }, 300); flash();
      if (needs) { let last = null, n = 0; timer = setInterval(() => {
        if (!s.ok()) { n = 0; return }
        if (s.stable) { const el = $(s.stable), val = el ? el.value : ''; if (val !== last) { last = val; n = 0; return } if (++n < 3) return }   // 数值 1.5 秒不变才算输完
        next() }, 500) }
    }, 250);
  }
  function next() { prog.step++; save(); show() }
  function go(id, step = 0) { T.start(); prog.cur = id; prog.step = step; save(); show() }
  T.go = go;
  const guard = e => {
    if (!e.isTrusted || !T.active || !box || box.hidden) return;
    const x = e.target; if (!(x instanceof Element)) return;
    if (box.contains(x) || banner.contains(x) || x.closest('#toast') || x.closest('.modal')) return;
    if (live() && curEl.contains(x)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (e.type === 'click' && ring && curEl) { ring.classList.remove('tut-shake'); void ring.offsetWidth; ring.classList.add('tut-shake') }
  };
  ['click', 'mousedown', 'pointerdown', 'dblclick', 'contextmenu'].forEach(t => document.addEventListener(t, guard, { capture: true, passive: false }));
  document.addEventListener('focusin', e => { if (!T.active || !box || box.hidden) return; const x = e.target; if (box.contains(x) || banner.contains(x) || x.closest('.modal') || (live() && curEl.contains(x))) return; x.blur && x.blur() }, true);
  T.start = () => { ui(); if (!T.active) { T.active = true; S.loggedOut = false; S.hist = S.phist = null; loadMe() } renderBanner(); applyUnlock() };
  T.pause = () => { clearInterval(timer); curEl = null; if (ring) { ring.style.display = 'none'; box.hidden = true } renderBanner() };
  T.exit = () => { T.pause(); T.active = false; if (banner) banner.hidden = true; document.body.classList.remove('tut-on'); applyUnlock(); S.me = null; S.loggedOut = false; S.hist = S.phist = null; save(); loadMe(); toast('已退出教程，回到你的真实模拟账户') };
  T.resetProgress = () => { prog.done = {}; prog.cur = null; prog.step = 0; save(); applyUnlock() };
  return T;
})();

