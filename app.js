'use strict';
/* ================= 小白说明 ================= */
const HELP = {
  kline: ['K 线图怎么看？', '图上一根根小棍子长得像蜡烛，所以叫<b>“蜡烛”</b>。<b>一根蜡烛 = 一小段时间</b>，多长由上面的按钮决定：选“1分”一根就是 1 分钟，选“日线”一根就是一天。<br><b>颜色</b>：绿色 = 这段时间涨了，红色 = 跌了。<br><b>胖的部分</b>：从这段时间刚开始的价格，到结束时的价格。越长说明涨跌越多。<br><b>上下的细线</b>：这段时间价格最高冲到过哪、最低跌到过哪。<br><b>分时</b>：不画蜡烛，只有一条价格线，新手看这个最省事。<br><b>MA 均线</b>：把最近 7 根、25 根、99 根蜡烛的价格各取个平均，连成三条线。价格在线上面，一般说明最近偏强；在下面偏弱。<br><b>成交量</b>：底下的小柱子，越高说明这段时间买卖的人越多。<br>手指按住图可以看每根蜡烛的具体价格，两指可以放大缩小。'],
  otype: ['限价和市价有什么区别？', '<b>市价单</b>：不挑价格，马上按当前市场上最好的价格成交（买入按卖一价，卖出按买一价）。优点是立刻成交，缺点是价格不由你定。<br><b>限价单</b>：你自己定一个价格，比如“BTC 跌到 80000 我再买”。行情到了你的价格才会成交，没到就一直挂着（在“当前委托”里），随时可以撤单。挂单期间对应的资金会被冻结。'],
  fee: ['手续费怎么收？挂单和吃单是什么？', '和 OKX 普通用户一样：<br><b>吃单（Taker）</b>：你的单子一下单就立刻和别人已经挂着的单成交，比如市价单、或者价格直接够得着的限价单。现货收 <b>0.1%</b>，合约收 <b>0.05%</b>。<br><b>挂单（Maker）</b>：你的限价单先挂在盘口上等别人来成交，给市场“提供了流动性”，所以更便宜：现货 <b>0.08%</b>，合约 <b>0.02%</b>。<br>历史委托里的“角色”一栏会显示每笔是挂单还是吃单。'],
  slip: ['什么是滑点？', '市价单会按盘口从最好的价格开始一档一档往下吃。如果你买得很多，第一档的数量不够，就会接着用第二档、第三档更贵的价格成交，最后的<b>成交均价</b>会比你看到的价格差一点，这个差就叫<b>滑点</b>。本站用 OKX 的真实盘口逐档计算，和真实交易一样：小单几乎没有滑点，大单、冷门币滑点更明显。超过盘口深度的单子会被拒绝，需要分批下。'],
  funding: ['资金费率是什么？', '永续合约没有到期日，为了让合约价格贴近现货价格，交易所每隔一段时间（OKX 大多每 8 小时，北京时间 0 点、8 点、16 点）在多空之间互相转一笔钱，这就是<b>资金费</b>。<br>费率为<b>正</b>：开多的人付给开空的人；费率为<b>负</b>：开空的人付给开多的人。金额 = 仓位价值 × 费率，例如 1 万 USDT 的多仓、费率 0.01%，每次付 1 USDT。<br>本站直接使用 OKX 的实时费率，在结算时刻从持仓的保证金里扣除或增加；只有在结算时刻还持有仓位才会收付。'],
  mark: ['标记价是什么？', '<b>标记价</b>是交易所根据多个现货交易所价格算出的“公允价格”，用来计算未实现盈亏和判断爆仓，防止有人瞬间砸盘造成不公平的强平。本站直接使用 OKX 永续合约的标记价。而止盈止损用的是<b>最新成交价</b>触发。'],
  spot: ['什么是现货交易？', '现货就是“真的买币”：用 USDT 买入 BTC，你就持有了这些 BTC，币价涨了你赚，跌了你亏，但<b>最多亏光你买币的钱，不会倒欠</b>，也不会被强制平仓。<br>手续费和 OKX 一样：市价单（吃单）<b>0.1%</b>，挂着等成交的限价单（挂单）<b>0.08%</b>。例如市价买 10000 USDT 的币，手续费 10 USDT。<br>本站所有资金都是<b>虚拟的</b>，不能充值、提现，和真钱没有任何关系，放心练手。'],
  perp: ['什么是合约（永续合约）？', '合约不是真的买币，而是和平台“赌”价格方向：<br><b>开多</b> = 看涨，价格涨了赚钱；<b>开空</b> = 看跌，价格跌了赚钱。所以跌的时候也能赚。<br>你只需要拿出一部分钱当<b>保证金</b>，再乘以<b>杠杆倍数</b>，就能控制更大金额的仓位。<br>举例：保证金 100 USDT、10 倍杠杆，相当于买了 1000 USDT 的币。币价涨 1%，你赚 10 USDT（保证金的 10%）；跌 1%，你亏 10 USDT。<br>合约的价格、K 线、盘口全部来自 <b>OKX 永续合约</b>真实市场。开仓和平仓各收仓位价值 <b>0.05%</b>（吃单）或 <b>0.02%</b>（挂单）手续费，注意是按放大后的仓位算。持仓还要按 OKX 实时费率收付<b>资金费</b>。'],
  lev: ['杠杆倍数是什么意思？', '杠杆就是把你的本金“放大”。<b>10 倍</b>杠杆：涨跌 1% → 你的保证金盈亏 10%。<b>100 倍</b>：涨跌 1% → 盈亏 100%，也就是反向波动 1% 左右就会亏光。<b>400 倍</b>：价格反向波动约 0.15% 就会被强平（几秒钟的正常波动就可能发生），而且开仓手续费就要吃掉保证金的约 20%。<br>新手建议从 <b>1–5 倍</b>开始。倍数越高，赚得快亏得更快。'],
  liq: ['什么是强制平仓（爆仓）？', '合约亏损时，亏的是你的保证金。当亏损接近保证金用完（剩余保证金低于“维持保证金”）时，系统会<b>自动帮你平仓</b>，这叫强平或爆仓，这笔仓位的保证金就没了。<br>下单前表单里会显示<b>预估强平价</b>：开多时价格跌到这个价就爆仓，开空时涨到这个价就爆仓。<br>本站采用<b>逐仓</b>模式：每个仓位只会亏掉它自己的保证金，不会牵连账户里其他的钱。'],
  tpsl: ['止盈止损是什么？', '提前设好“到价自动平仓”：<br><b>止盈价</b>：涨（开多）或跌（开空）到这个价格，自动平仓把利润落袋。<br><b>止损价</b>：行情往不利方向走到这个价格，自动平仓，避免亏更多。<br>都可以不填，开仓后也能在持仓里修改。触发后按当时的市场价成交，剧烈波动时可能和设定价略有差别。'],
  book: ['盘口是什么？', '盘口（订单簿）显示此刻市场上别人挂着的买单和卖单。<br><b>红色</b>是卖单（有人想按这个价卖），<b>绿色</b>是买单（有人想按这个价买）。中间是最新成交价。<br>卖单里最低的价格叫“卖一”，你市价买入就按它成交；买单里最高的叫“买一”，市价卖出按它成交。<br>点击某一行可以把价格填进限价单。数据来自 OKX 真实市场。'],
  trades: ['最新成交是什么？', '市场上刚刚发生的每一笔真实交易：成交价、数量、时间。绿色是主动买入成交，红色是主动卖出成交。连续大量绿色说明买盘积极。'],
  equity: ['收益曲线怎么看？', '每 15 分钟记录一次你的总资产（现货按当前价折算 + 合约保证金和浮动盈亏）。曲线往上就是在赚钱。'],
  cost: ['持仓均价和盈亏怎么算？', '<b>持仓均价</b>：你买这些币平均花了多少钱一个（已包含手续费）。卖出一部分时均价不变。<br><b>浮动盈亏</b> =（现在的买一价 − 均价）× 持有数量。还没卖出之前都只是“账面”盈亏。'],
  rank: ['排行榜怎么排？', '按总资产从高到低排名，每 30 秒更新一次。总资产 = USDT 余额 + 持有币种按当前价折算 + 合约保证金和未实现盈亏 − 欠款（净资产，可以为负）。每个 LINUX DO 账号只有一个模拟账户，初始 100 万 USDT。'],
  loan: ['借贷是什么？欠款怎么算？', '钱不够下单时<b>不会再说“余额不足”</b>，而是直接弹出<b>借贷</b>窗口；顶部也有一个<b>借贷</b>按钮，随时可以借钱。<br><b>没有利息</b>：借多久都不收利息，随时可以还（借贷窗口里可以还款）。<br><b>欠款会从总资产里扣掉</b>：排行榜和收益曲线都按“净资产 = 总资产 − 欠款”计算。所以借来的钱亏掉后，<b>收益率会跌破 −100%</b>（比如本金 100 万又净欠 100 万，就是 −200%），排行榜上会显示负的总资产。<br>所有资金都是虚拟的，放心借。']
};
const GUIDE = [
  ['这个网站是什么？', '一个<b>虚拟币模拟交易</b>网站。每个 LINUX DO 账号登录后送 <b>1,000,000 虚拟 USDT</b>，用真实的市场行情（来自 OKX）练习买卖加密货币，比拼收益排名。<br>所有资金都是虚拟的：<b>不能充值、不能提现、不能兑换任何东西</b>，亏光了也没有真实损失。'],
  ['USDT 是什么？', 'USDT 是一种“稳定币”，1 USDT 约等于 1 美元。在币圈里大家用它来给其他币标价、买卖，相当于这里的“钱”。'],
  ['我该怎么开始？', '1. 右上角用 LINUX DO 登录。<br>2. 左侧（手机点“行情”）选一个币，比如 BTC。<br>3. 下单区选“现货 → 买入 → 市价”，输入想花多少 USDT，点买入。<br>4. 在下方“现货资产”或“资产”页看持仓和盈亏，觉得涨够了就卖出。<br>熟悉之后再试试限价单、合约和止盈止损。'],
  ['现货和合约选哪个？', '新手先玩<b>现货</b>：买了就持有，最多亏掉本金，不会爆仓。<br><b>合约</b>可以做空、可以加杠杆，赚得快亏得也快，高倍数下很容易爆仓。']
].concat(Object.values(HELP).map(h => h));

/* ================= 工具 ================= */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const LS = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch (e) { return d } }, set: (k, v) => localStorage.setItem(k, JSON.stringify(v)) };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function dec(p) { p = Math.abs(+p || 0); if (p >= 1000) return 2; if (p >= 10) return 3; if (p >= 1) return 4; if (p >= .1) return 5; if (p >= .001) return 6; if (p === 0) return 2; return Math.min(12, Math.max(6, -Math.floor(Math.log10(p)) + 3)); }
const nf = (x, d) => (+x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fp = (p, ref) => p == null || isNaN(p) ? '--' : nf(p, dec(ref ?? p));
const fu = x => x == null || isNaN(x) ? '--' : nf(x, 2);
const fq = q => { q = +q; if (!q) return '0'; const a = Math.abs(q); return nf(q, a >= 1000 ? 2 : a >= 1 ? 4 : a >= .001 ? 6 : 8) };
const fv = v => v >= 1e8 ? (v / 1e8).toFixed(2) + '亿' : v >= 1e4 ? (v / 1e4).toFixed(2) + '万' : nf(v, 2);
const fpct = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(2) + '%';
const cls = x => x > 0 ? 'up' : x < 0 ? 'dn' : '';
const ftime = (t, full) => { const d = new Date(t); const p = n => String(n).padStart(2, '0'); const hm = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); return full ? (d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + hm : hm };
function toast(msg, type = 'ok') { const d = document.createElement('div'); d.className = type; d.textContent = msg; $('#toast').appendChild(d); setTimeout(() => d.remove(), type === 'err' ? 4000 : 2600) }
async function api(path, body) {
  if (typeof TUT !== 'undefined' && TUT.handles(path)) return TUT.api(path, body);
  const r = await fetch('/api/' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  let j = {}; try { j = await r.json() } catch (e) { }
  if (!r.ok) { const e = new Error(j.error || ('请求失败 ' + r.status)); e.status = r.status; e.code = j.code; e.need = j.need; throw e }
  return j;
}
const cn = s => (window.COINS[s] || [s])[0];
const KIND = () => S.mode === 'perp' ? 'swap' : 'spot';
const MT = () => (S.mode === 'perp' && S.swap && Object.keys(S.swap).length) ? S.swap : S.tick;
function tdec(s, k) { const i = S.inst && S.inst[k || KIND()] && S.inst[k || KIND()][s]; if (!i || !i.tick) return null; const t = String(i.tick).includes('e') ? (+i.tick).toFixed(12).replace(/0+$/, '') : String(i.tick); return t.includes('.') ? t.split('.')[1].length : 0 }
const fps = (p, s, k) => p == null || isNaN(p) ? '--' : nf(p, tdec(s || S.sym, k) ?? dec(p));
const instOf = (s, k) => (S.inst && S.inst[k] && S.inst[k][s]) || { tick: 0, lot: 0, min: 0 };
const roundLot = (q, lot) => lot ? Math.floor(q / lot + 1e-9) * lot : q;
const fcount = ms => { if (ms <= 0) return '00:00:00'; const t = Math.floor(ms / 1000), p = n => String(n).padStart(2, '0'); return p(Math.floor(t / 3600)) + ':' + p(Math.floor(t % 3600 / 60)) + ':' + p(t % 60) };

/* ================= 状态 ================= */
const S = {
  sym: LS.get('sym', 'BTC'), tf: LS.get('tf', '15m'), view: 'trade', tick: {}, swap: {}, syms: [], psyms: [], inst: null, potype: 'market', me: null, loggedOut: false,
  fav: new Set(LS.get('fav', ['BTC', 'ETH', 'SOL'])), mkFilter: 'all', mkSort: LS.get('mksort', null),
  mode: LS.get('mode', 'spot'), side: 'buy', otype: 'limit', rec: 'pos', pane: 'form', lb: null, hist: null, phist: null
};

/* ================= 名词小词典：专业词点一下就有大白话解释 ================= */
const GLOSS = {
  'USDT': '一种和美元 1:1 挂钩的币，1 USDT ≈ 1 美元。这里把它当“钱”用，所有币的价格都用它来标。',
  '借贷': '向平台借钱：没有利息、随借随还。欠款会从总资产里扣掉，借来的钱亏掉后收益率会跌破 −100%。',
  '欠款': '借贷还没还的部分。计算总资产（净资产）和收益率时会把它扣掉。',
  '还款': '把欠款还上：借贷窗口里可以直接还款，不收利息。',
  '永续合约': '一种没有到期日的合约，想拿多久都行。为了让它的价格不偏离真实币价，多空双方会定期互相付“资金费”。',
  '现货': '真的把币买到手。涨了赚、跌了亏，最多亏光买币的钱，不会爆仓。',
  '合约': '手里不拿币，只押价格往哪走。押对赚差价，押错亏差价，还能加杠杆放大。',
  '开多': '押价格会涨。涨了赚钱，跌了亏钱。',
  '开空': '押价格会跌。跌了赚钱，涨了亏钱。现货做不到这一点。',
  '平仓': '结束这次合约押注，把赚的或亏的钱结算进余额。',
  '开仓': '开始一次合约押注，也就是开多或开空。',
  '仓位价值': '这次押注实际按多少钱算盈亏 = 保证金 × 杠杆。比如 500 × 10 倍 = 5000 USDT。',
  '仓位': '你现在手里还没结束的那笔押注（或持有的币）。',
  '持仓': '你现在手里拿着的币，或还没平掉的合约。',
  '保证金': '你为这笔合约真正掏出来的本金。亏损先从它里面扣，扣完就爆仓。',
  '杠杆': '把本金放大来算盈亏。10 倍：价格动 1%，你的本金赚或亏 10%。',
  '强平价': '价格走到这里，你的保证金基本亏光，系统会自动帮你平仓（爆仓）。',
  '强平': '亏到保证金快没了，系统强制帮你平仓，也叫爆仓。',
  '爆仓': '亏到保证金快没了，系统强制帮你平仓，这笔保证金就没了。',
  '维持保证金': '仓位最少要留着的那点保证金。亏到只剩这么多，就会被强平。',
  '逐仓': '每笔仓位只用它自己的保证金，爆仓也只亏这一笔，不会拖累账户里别的钱。',
  '未实现盈亏': '还没平仓时的“账面”盈亏，会随价格一直变，平仓后才真正到手。',
  '浮动盈亏': '还没卖出时的“账面”盈亏，会随价格一直变，卖出后才算数。',
  '收益率': '赚了或亏了本金的百分之多少。合约里按保证金算，所以会被杠杆放大。',
  '资金费率': '永续合约每隔几小时，多空之间互相付的一点钱的比例。为正：开多的付给开空的；为负：反过来。',
  '资金费': '永续合约每隔几小时，多空之间互相付的一笔小钱。金额 = 仓位价值 × 资金费率。',
  '标记价': '交易所综合多家交易所算出的“公平价格”，用来算盈亏、判断爆仓，防止有人瞬间砸盘害你被强平。',
  '最新价': '市场上最后一笔成交的价格。',
  '市价单': '不挑价格，马上按现在市场上最好的价格成交。',
  '限价单': '自己定一个价格，行情走到这个价才成交，没到就一直挂着等。',
  '市价': '不挑价格，马上按现在市场上最好的价格成交。',
  '限价': '自己定一个价格，行情走到这个价才成交，没到就一直挂着等。',
  '委托': '你下的、还没完全成交的单子，挂在那里等成交，可以随时撤掉。',
  '撤单': '把还没成交的挂单取消，冻结的钱会退回。',
  '冻结': '挂单期间，这笔钱先被锁住，防止你重复花掉。成交或撤单后解锁。',
  '成交额': '这笔交易一共花了（或收到）多少 USDT = 价格 × 数量。',
  '成交均价': '一笔单子分好几个价格成交时，平均下来每个币的价格。',
  '持仓均价': '你买这些币平均每个花了多少钱，已包含手续费。',
  '均价': '平均每个币花了多少钱。',
  '手续费': '每次成交交易所收的一点钱，按成交金额的百分比算。',
  '吃单': '一下单就立刻和别人挂着的单成交（比如市价单），手续费稍贵。',
  '挂单': '你的限价单先挂着，等别人来和你成交，手续费更便宜。',
  '滑点': '大单会把好价格的单子吃完、接着吃更差的价格，最后成交价比看到的差一点，这个差就叫滑点。',
  '盘口': '此刻所有人挂着的买单和卖单的列表。红色是想卖的，绿色是想买的。',
  '订单簿': '此刻所有人挂着的买单和卖单的列表，也叫盘口。',
  '买一': '此刻愿意出的最高买价。你市价卖出就按它成交。',
  '卖一': '此刻愿意卖的最低价格。你市价买入就按它成交。',
  '深度': '盘口里各个价格上挂了多少数量。深度越大，大单越不容易滑点。',
  '流动性': '买卖的人多不多、好不好成交。流动性好，下单马上成交、价格也稳。',
  '止盈': '提前设好赚到多少就自动平仓，把利润落袋。',
  '止损': '提前设好亏到多少就自动平仓，防止越亏越多。',
  '盈亏比': '计划赚的和计划亏的比例。1:2 的意思是：最多亏 1 份，目标赚 2 份。',
  'K 线': '用一根根“蜡烛”画出价格变化的图。一根蜡烛代表一段时间，绿涨红跌。',
  '蜡烛': 'K 线图里的一根小柱子，代表一段时间：粗的部分是开始和结束的价格，细线是最高、最低价。',
  '均线': '把最近若干根蜡烛的价格取平均连成的线，用来看大方向。',
  'MA': '均线（Moving Average）：把最近若干根蜡烛的价格取平均连成的线。',
  '成交量': '一段时间里成交了多少数量。越大说明买卖越活跃。',
  '分时': '不画蜡烛，只用一条线连起每分钟的价格，最直观。',
  '涨跌幅': '和 24 小时前相比，价格涨了或跌了百分之多少。',
  '总资产': 'USDT 余额 + 持有的币按现价折算 + 合约保证金和未实现盈亏，全部加起来。',
  'API Key': '一串密钥，让你自己写的程序代替你下单。别发给别人。',
};
const GLOSS_RE = new RegExp('(' + Object.keys(GLOSS).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g');
function glossify(root) {
  if (!root) return; const seen = new Set(), w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('.gl,summary,button,input,textarea,select,a,.tut-h,script,style') ? 2 : 1 }), list = [];
  while (w.nextNode()) list.push(w.currentNode);
  list.forEach(n => {
    const t = n.nodeValue; GLOSS_RE.lastIndex = 0; if (!GLOSS_RE.test(t)) return;
    const f = document.createDocumentFragment(); let last = 0; GLOSS_RE.lastIndex = 0; let m;
    while ((m = GLOSS_RE.exec(t))) { if (seen.has(m[1])) continue; seen.add(m[1]); f.append(t.slice(last, m.index)); const s = document.createElement('span'); s.className = 'gl'; s.textContent = m[1]; s.dataset.k = m[1]; f.append(s); last = m.index + m[1].length }
    if (!last) return; f.append(t.slice(last)); n.replaceWith(f);
  });
}
const glPop = Object.assign(document.createElement('div'), { id: 'gl-pop', hidden: true }); document.body.append(glPop);
window.addEventListener('click', e => {
  const g = e.target.closest && e.target.closest('.gl');
  if (g) { e.preventDefault(); e.stopImmediatePropagation(); const r = g.getBoundingClientRect(); glPop.innerHTML = `<b>${g.dataset.k}</b>${GLOSS[g.dataset.k]}`; glPop.hidden = false; const W = Math.min(300, innerWidth - 16); glPop.style.width = W + 'px'; glPop.style.left = Math.max(8, Math.min(innerWidth - W - 8, r.left + r.width / 2 - W / 2)) + 'px'; const ph = glPop.offsetHeight; glPop.style.top = (r.bottom + 8 + ph < innerHeight ? r.bottom + 8 : Math.max(8, r.top - ph - 8)) + 'px'; return }
  if (!glPop.hidden) { glPop.hidden = true; if (!glPop.contains(e.target)) { e.preventDefault(); e.stopImmediatePropagation() } }
}, true);
window.addEventListener('scroll', () => { glPop.hidden = true }, { passive: true, capture: true });

/* ================= 帮助框 ================= */
function initTips(root = document) {
  root.querySelectorAll('details.tip[data-help]').forEach(d => {
    const h = HELP[d.dataset.help]; if (!h || d.dataset.done) return; d.dataset.done = 1;
    d.innerHTML = `<summary>${d.classList.contains('inline') ? '?' : 'ⓘ ' + h[0]}</summary><div>${d.classList.contains('inline') ? '<b>' + h[0] + '</b><br>' : ''}${h[1]}</div>`;
    glossify(d.querySelector('div'));
  });
}
document.addEventListener('click', e => { $$('details.tip.inline[open]').forEach(d => { if (!d.contains(e.target)) d.open = false }) });

/* ================= 视图切换 ================= */
function setView(v) {
  if (v === 'markets') { document.body.classList.add('v-markets'); v = 'trade' } else document.body.classList.remove('v-markets');
  S.view = v;
  $$('.view').forEach(s => s.hidden = s.id !== 'v-' + v);
  $$('.dnav a,.mnav a').forEach(a => a.classList.toggle('on', a.dataset.v === (document.body.classList.contains('v-markets') ? 'markets' : v)));
  if (v === 'assets') renderAssets(true);
  if (v === 'rank') loadRank();
  if (v === 'api') renderApi();
  if (v === 'guide') renderGuide();
  if (v === 'trade') { setTimeout(() => chart && chart.timeScale && 0, 0) }
  window.scrollTo(0, 0);
}
function route() { const h = location.hash.replace(/^#\/?/, '').split('/'); const v = h[0] || 'trade'; if (h[1] && h[1] !== S.sym) setSym(h[1].toUpperCase(), true); setView(['trade', 'assets', 'rank', 'guide', 'api', 'markets'].includes(v) ? v : 'trade') }
window.addEventListener('hashchange', route);
$$('.dnav a,.mnav a').forEach(a => a.onclick = e => { e.preventDefault(); location.hash = '#/' + a.dataset.v });

/* ================= 用户 ================= */
function isGeniusUser(uid, name) {
  return uid === 68 || name === 'linine';
}
function userBadges(uid, name) {
  if (isGeniusUser(uid, name)) {
    return `<span class="badge-genius" title="天才交易员 · 68秒20倍ETH一战封神">⚡ 天才交易员</span>`;
  }
  return '';
}

function renderUser() {
  const u = $('#user');
  if (S.me && S.me.tutorial) u.innerHTML = `<button class="btn-g" id="loan-btn">借贷</button><span class="mut num">练习资金 ${fu(S.me.equity)} U</span>`;
  else if (S.me) {
    const isG = isGeniusUser(S.me.uid, S.me.name);
    u.innerHTML = `<a class="btn-g" href="#/guide">教程</a><button class="btn-g" id="loan-btn" title="无息借贷">借贷</button><span class="mut num eqtop" title="总资产（净资产，已扣除欠款）">${fu(S.me.equity)} U</span><span class="uname ${isG ? 'uname-genius' : ''}">${S.me.avatar ? `<img class="av ${isG ? 'av-genius' : ''}" src="${esc(S.me.avatar)}" alt="" referrerpolicy="no-referrer">` : ''}${esc(S.me.name)}</span>${userBadges(S.me.uid, S.me.name)}<button class="btn-g" id="logout">退出</button>`;
  }
  else u.innerHTML = `<a class="btn-y" href="/api/auth/login">LINUX DO</a> <a class="btn-y btn-nl" href="/api/auth/nodeloc/login">NodeLoc</a>`;
  document.body.classList.toggle('guest', !S.me && S.loggedOut && !(typeof TUT !== 'undefined' && TUT.active));
  const te = $('#tut-exit'); if (te) te.onclick = () => TUT.exit();
  const lo = $('#logout'); if (lo) lo.onclick = async () => { await api('logout', {}); S.me = null; S.loggedOut = true; renderAll() };
  const ln = $('#loan-btn'); if (ln) ln.onclick = () => openLoan();
}
async function loadMe() {
  const tut = typeof TUT !== 'undefined' && TUT.active;
  if (S.loggedOut && !S.me && !tut) return;
  try {
    const m = await api('me'); if (!!(m && m.tutorial) !== (typeof TUT !== 'undefined' && TUT.active)) return;
    if (!m.tutorial && m.acct && LS.get('acct', null) !== m.acct) { ['tut_state_v1', 'tut_progress_v2', 'tut_seen'].forEach(k => localStorage.removeItem(k)); LS.set('acct', m.acct); location.reload(); return }
    S.me = m; if (!m.tutorial) { showWelcome(); showAnn() }
  } catch (e) { if (e.status === 401) { if (typeof TUT !== 'undefined' && TUT.active) return; S.me = null; S.loggedOut = true } }
  renderUser(); renderForm(); renderRecords(); if (S.view === 'assets') renderAssets(!S.eqLoaded);
}
const q0 = new URLSearchParams(location.search);
if (q0.get('login')) {
  const m = { state: '登录状态过期，请重新登录', fail: 'LINUX DO 授权失败，请重试', tl: '需要 LINUX DO 信任等级 1 级及以上，且账号正常' }[q0.get('login')];
  if (m) setTimeout(() => toast(m, 'err'), 300); history.replaceState(null, '', location.pathname + location.hash);
}

/* ================= 行情列表 ================= */
function renderMarkets() {
  const q = $('#mk-q').value.trim().toLowerCase();
  const M = MT(); let list = (S.mode === 'perp' ? S.psyms : S.syms).filter(s => M[s]);
  if (S.mkFilter === 'fav') list = list.filter(s => S.fav.has(s));
  if (q) list = list.filter(s => s.toLowerCase().includes(q) || cn(s).toLowerCase().includes(q));
  if (S.mkSort) { const [k, dir] = S.mkSort; list.sort((a, b) => { const x = k === 'sym' ? a.localeCompare(b) : M[a][k] - M[b][k]; return dir * x }) }
  $('#mk-list').innerHTML = list.map(s => { const t = M[s]; return `<div class="mk-row ${s === S.sym ? 'on' : ''}" data-s="${s}"><div class="s"><span class="st ${S.fav.has(s) ? 'on' : ''}" data-fav="${s}">★</span><b>${s}</b><span class="mut">${S.mode === 'perp' ? 'USDT 永续' : '/USDT'}</span><small>${esc(cn(s))}</small></div><div class="num">${fps(t.last, s)}</div><div><span class="chgb ${t.chg >= 0 ? 'up' : 'dn'}">${fpct(t.chg)}</span></div></div>` }).join('') || '<div class="empty">没有匹配的币种</div>';
}
$('#mk-list').onclick = e => {
  const f = e.target.closest('[data-fav]'); if (f) { toggleFav(f.dataset.fav); return }
  const r = e.target.closest('.mk-row'); if (r) { setSym(r.dataset.s); if (document.body.classList.contains('v-markets')) location.hash = '#/trade/' + r.dataset.s }
};
$('#mk-q').oninput = renderMarkets;
$$('.mk-tabs button').forEach(b => b.onclick = () => { S.mkFilter = b.dataset.f; $$('.mk-tabs button').forEach(x => x.classList.toggle('on', x === b)); renderMarkets() });
$$('.mk-sort span').forEach(sp => sp.onclick = () => { const k = sp.dataset.s; S.mkSort = S.mkSort && S.mkSort[0] === k ? (S.mkSort[1] === -1 ? [k, 1] : null) : [k, -1]; LS.set('mksort', S.mkSort); renderMarkets() });
function toggleFav(s) { S.fav.has(s) ? S.fav.delete(s) : S.fav.add(s); LS.set('fav', [...S.fav]); renderMarkets(); renderSymbar() }
$('#sb-fav').onclick = () => toggleFav(S.sym);
$('#sym-btn').onclick = () => { if (matchMedia('(max-width:1000px)').matches) location.hash = '#/markets' };

/* ================= 币种信息 ================= */
function renderSymbar() {
  const t = MT()[S.sym]; const c = window.COINS[S.sym] || [S.sym, '', '', ''];
  const perp = S.mode === 'perp';
  $('#sb-name').textContent = S.sym + (perp ? 'USDT 永续' : '/USDT'); $('#sb-cn').textContent = c[0];
  $('#sb-fav').textContent = S.fav.has(S.sym) ? '★' : '☆'; $('#sb-fav').classList.toggle('on', S.fav.has(S.sym));
  document.title = (t ? fp(t.last) + ' ' : '') + S.sym + '/USDT · 虚拟币模拟盘';
  if (!t) return;
  const last = $('#sb-last'); last.textContent = fps(t.last); last.className = cls(t.chg);
  $('#sb-usd').textContent = perp ? '标记价 ' + fps(t.mark) : '≈ $' + fps(t.last);
  $('#sb-chg').textContent = fpct(t.chg); $('#sb-chg').className = cls(t.chg);
  $('#sb-h').textContent = fps(t.h); $('#sb-l').textContent = fps(t.l); $('#sb-v').textContent = fv(t.v);
  $('#sb-fund').hidden = !perp;
  if (perp && t.fr != null) { $('#sb-fr').innerHTML = `<span class="${t.fr > 0 ? 'dn' : 'up'}">${(t.fr * 100).toFixed(4)}%</span> / ${fcount(t.nft - Date.now())}` } else if (perp) $('#sb-fr').textContent = '--';
}
function renderCoinInfo() {
  const c = window.COINS[S.sym] || [S.sym, '加密货币', '', '暂无介绍'];
  $('#coin-info').innerHTML = `<h4>${esc(c[0])}（${S.sym}）<span class="tag">${esc(c[1])}</span></h4><p><b>一句话：</b>${esc(c[2])}</p><p>${esc(c[3])}</p><p class="mut" style="font-size:12px">以上为科普介绍，不构成任何投资建议。</p>`;
}
$('#sb-info').onclick = () => { const el = $('#coin-info'); el.hidden = !el.hidden; $('#sb-info').textContent = el.hidden ? '币种介绍' : '收起介绍'; renderCoinInfo() };

function setSym(s, noHash) {
  if (!S.syms.includes(s) && S.syms.length) return;
  if (S.mode === 'perp' && S.psyms.length && !S.psyms.includes(s)) { toast(s + ' 暂无永续合约，已切回现货', 'err'); setMode('spot') }
  S.sym = s; LS.set('sym', s); S.lastBook = null;
  renderMarkets(); renderSymbar(); renderCoinInfo(); renderForm(); renderRecords();
  $('#bk-asks').innerHTML = $('#bk-bids').innerHTML = $('#tr-list').innerHTML = '';
  $('#s-px').value = ''; S.pxTouched = false;
  loadKline(); loadBook(); loadTrades();
  if (!noHash && location.hash.startsWith('#/trade')) history.replaceState(null, '', '#/trade/' + s);
}

/* ================= 图表 ================= */
let chart, cSeries, lSeries, vSeries, maS = [], bars = [];
const TZ = -new Date().getTimezoneOffset() * 60;
const TFSEC = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400, '1w': 604800 };
function initChart() {
  const el = $('#chart');
  chart = LightweightCharts.createChart(el, {
    autoSize: true,
    layout: { background: { color: '#161a1e' }, textColor: '#848e9c', fontSize: 11 },
    grid: { vertLines: { color: '#1f242b' }, horzLines: { color: '#1f242b' } },
    rightPriceScale: { borderColor: '#2b3139', scaleMargins: { top: .08, bottom: .22 } },
    timeScale: { borderColor: '#2b3139', timeVisible: true, secondsVisible: false, rightOffset: 2, fixLeftEdge: true, fixRightEdge: true, lockVisibleTimeRangeOnResize: true },
    // 只能左右拖时间；上下滑交给整个页面滚动，价格轴不能被拖到没有价格的地方
    handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
    handleScale: { axisPressedMouseMove: { time: true, price: false }, axisDoubleClickReset: true, mouseWheel: true, pinch: true },
    crosshair: { mode: 0 }, localization: { locale: 'zh-CN' }
  });
  cSeries = chart.addCandlestickSeries({ upColor: '#0ecb81', downColor: '#f6465d', borderVisible: false, wickUpColor: '#0ecb81', wickDownColor: '#f6465d' });
  lSeries = chart.addAreaSeries({ lineColor: '#f0b90b', topColor: 'rgba(240,185,11,.25)', bottomColor: 'rgba(240,185,11,0)', lineWidth: 2, visible: false });
  vSeries = chart.addHistogramSeries({ priceScaleId: 'vol', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false });
  chart.priceScale('vol').applyOptions({ scaleMargins: { top: .82, bottom: 0 } });
  maS = [['#f0b90b', 7], ['#e377c2', 25], ['#5a8dee', 99]].map(([c, n]) => ({ n, s: chart.addLineSeries({ color: c, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }) }));
  chart.subscribeCrosshairMove(p => legend(p && p.time ? p.time : null));
}
function ma(n) { const out = []; let sum = 0; for (let i = 0; i < bars.length; i++) { sum += bars[i].close; if (i >= n) sum -= bars[i - n].close; if (i >= n - 1) out.push({ time: bars[i].time, value: sum / n }) } return out }
function applyBars() {
  const line = S.tf === 'line';
  const d = tdec(S.sym) ?? dec(bars.length ? bars[bars.length - 1].close : 1);
  const pf = { type: 'price', precision: d, minMove: Math.pow(10, -d) };
  cSeries.applyOptions({ visible: !line, priceFormat: pf }); lSeries.applyOptions({ visible: line, priceFormat: pf });
  cSeries.setData(line ? [] : bars); lSeries.setData(line ? bars.map(b => ({ time: b.time, value: b.close })) : []);
  const showVol = $('#ind-vol').checked, showMa = $('#ind-ma').checked && !line;
  vSeries.setData(showVol ? bars.map(b => ({ time: b.time, value: b.vol, color: b.close >= b.open ? 'rgba(14,203,129,.45)' : 'rgba(246,70,93,.45)' })) : []);
  maS.forEach(m => m.s.setData(showMa ? ma(m.n) : []));
  legend(null);
}
function legend(time) {
  const b = time ? bars.find(x => x.time === time) : bars[bars.length - 1]; if (!b) { $('#legend').innerHTML = ''; return }
  const ch = (b.close - b.open) / b.open, c = ch >= 0 ? 'up' : 'dn';
  let h = `<span>开 <b class="${c}">${fp(b.open)}</b></span><span>高 <b class="${c}">${fp(b.high, b.open)}</b></span><span>低 <b class="${c}">${fp(b.low, b.open)}</b></span><span>收 <b class="${c}">${fp(b.close, b.open)}</b></span><span class="${c}">${fpct(ch)}</span>`;
  if ($('#ind-ma').checked && S.tf !== 'line') { const i = bars.indexOf(b); [[7, '#f0b90b'], [25, '#e377c2'], [99, '#5a8dee']].forEach(([n, col]) => { if (i >= n - 1) { let s = 0; for (let k = i - n + 1; k <= i; k++)s += bars[k].close; h += `<span style="color:${col}">MA${n} ${fp(s / n, b.close)}</span>` } }) }
  $('#legend').innerHTML = h;
}
let klSeq = 0;
async function loadKline(keepView) {
  const seq = ++klSeq, tf = S.tf === 'line' ? '1m' : S.tf;
  try {
    const r = await fetch(`/api/market/kline?sym=${S.sym}&tf=${tf}&type=${KIND()}`); const j = await r.json(); if (seq !== klSeq || !j.k) return;
    bars = j.k.map(k => ({ time: k[0] / 1000 + TZ, open: k[1], high: k[2], low: k[3], close: k[4], vol: k[5] }));
    applyBars(); if (!keepView) chart.timeScale().fitContent();
  } catch (e) { }
}
function liveBar() {
  const t = MT()[S.sym]; if (!t || !bars.length) return;
  const tf = S.tf === 'line' ? '1m' : S.tf, sec = TFSEC[tf], now = Date.now() / 1000;
  let b = bars[bars.length - 1];
  const start = sec >= 86400 && tf === '1w' ? null : Math.floor(now / sec) * sec + TZ;
  if (start && start > b.time) { b = { time: start, open: b.close, high: b.close, low: b.close, close: b.close, vol: 0 }; bars.push(b) }
  b.close = t.last; b.high = Math.max(b.high, t.last); b.low = Math.min(b.low, t.last);
  if (S.tf === 'line') lSeries.update({ time: b.time, value: b.close }); else cSeries.update(b);
  if ($('#ind-ma').checked && S.tf !== 'line') maS.forEach(m => { const a = ma(m.n); if (a.length) m.s.update(a[a.length - 1]) });
  legend(null);
}
$('#tfs').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.tf = b.dataset.tf; LS.set('tf', S.tf); $$('#tfs button').forEach(x => x.classList.toggle('on', x === b)); loadKline() };
$('#ind-ma').onchange = $('#ind-vol').onchange = applyBars;

/* ================= 盘口 / 成交 ================= */
async function loadBook() {
  if (S.view !== 'trade' || document.hidden) return;
  try {
    const k = KIND(); const j = await (await fetch(`/api/market/depth?sym=${S.sym}&type=${k}`)).json(); if (j.sym !== S.sym || j.type !== KIND()) return;
    const n = matchMedia('(max-width:1000px)').matches ? 10 : 12;
    const asks = j.asks.slice(0, n), bids = j.bids.slice(0, n);
    let ca = 0, cb = 0; const ac = asks.map(a => ca += a[1]), bc = bids.map(b => cb += b[1]); const mx = Math.max(ca, cb) || 1;
    const ref = undefined;
    $('#bk-asks').innerHTML = asks.map((a, i) => [a, ac[i]]).reverse().map(([a, c]) => `<div class="bk-row" data-px="${a[0]}"><i style="width:${c / mx * 100}%"></i><span class="p">${fps(a[0])}</span><span>${fq(a[1])}</span><span>${fq(c)}</span></div>`).join('');
    $('#bk-bids').innerHTML = bids.map((b, i) => `<div class="bk-row" data-px="${b[0]}"><i style="width:${bc[i] / mx * 100}%"></i><span class="p">${fps(b[0])}</span><span>${fq(b[1])}</span><span>${fq(bc[i])}</span></div>`).join('');
    const t = MT()[S.sym]; if (t) $('#bk-mid').innerHTML = `<span class="${cls(t.chg)}">${fps(t.last)}</span> <small class="mut">${S.mode === 'perp' ? '标记 ' + fps(t.mark) : '≈ $' + fps(t.last)}</small>`;
    const bp = cb / (ca + cb || 1) * 100;
    $('#bk-ratio').innerHTML = `<div style="width:${bp}%;background:var(--up)">买 ${bp.toFixed(0)}%</div><div style="width:${100 - bp}%;background:var(--dn);justify-content:flex-end">${(100 - bp).toFixed(0)}% 卖</div>`;
  } catch (e) { }
}
document.querySelector('.book').onclick = e => { const r = e.target.closest('.bk-row'); if (!r || !r.dataset.px) return; if (S.mode === 'perp') { setPotype('limit'); $('#p-px').value = r.dataset.px; S.ppxTouched = true; calcPerp() } else { setOtype('limit'); $('#s-px').value = r.dataset.px; S.pxTouched = true; calcSpot('px') } if (matchMedia('(max-width:1000px)').matches) setPane('form') };
async function loadTrades() {
  if (S.view !== 'trade' || document.hidden) return;
  try {
    const j = await (await fetch(`/api/market/trades?sym=${S.sym}&type=${KIND()}`)).json(); if (j.sym !== S.sym || j.type !== KIND()) return;
    const n = matchMedia('(max-width:1000px)').matches ? 30 : 40;
    $('#tr-list').innerHTML = j.trades.slice(0, n).map(t => `<div class="bk-row"><span class="${t[3] === 'buy' ? 'up' : 'dn'}">${fps(t[1])}</span><span>${fq(t[2])}</span><span class="mut">${ftime(t[0])}</span></div>`).join('');
  } catch (e) { }
}
function setPane(p) { S.pane = p; $('#v-trade').dataset.pane = p; $$('#m-tabs button').forEach(b => b.classList.toggle('on', b.dataset.p === p)); if (p === 'book') loadBook(); if (p === 'trades') loadTrades() }
$('#m-tabs').onclick = e => { const b = e.target.closest('button'); if (b) setPane(b.dataset.p) };

/* ================= 下单表单 ================= */
const avail = a => S.me && S.me.bal[a] ? S.me.bal[a][0] : 0;
function setMode(m) {
  const changed = S.mode !== m; S.mode = m; LS.set('mode', m); $$('.mode-tabs button').forEach(b => b.classList.toggle('on', b.dataset.m === m)); $('#f-spot').hidden = m !== 'spot'; $('#f-perp').hidden = m !== 'perp';
  if (m === 'perp' && S.psyms.length && !S.psyms.includes(S.sym)) { S.sym = 'BTC'; LS.set('sym', 'BTC') }
  renderForm();
  if (changed && chart) { S.ppxTouched = false; renderMarkets(); renderSymbar(); $('#bk-asks').innerHTML = $('#bk-bids').innerHTML = $('#tr-list').innerHTML = ''; loadKline(); loadBook(); loadTrades() }
}
function setPotype(o) { S.potype = o; $$('.potype>button').forEach(b => b.classList.toggle('on', b.dataset.pt === o)); $('#p-px-f').hidden = o !== 'limit'; calcPerp() }
function setSide(s) { S.side = s; $$('.side-tabs button').forEach(b => b.classList.toggle('on', b.dataset.side === s)); $('#s-pct').value = 0; $('#s-qty').value = ''; $('#s-tot').value = ''; renderForm() }
function setOtype(o) { S.otype = o; $$('#f-spot .otype>button').forEach(b => b.classList.toggle('on', b.dataset.ot === o)); renderForm() }
$$('.mode-tabs button').forEach(b => b.onclick = () => setMode(b.dataset.m));
$$('.side-tabs button').forEach(b => b.onclick = () => setSide(b.dataset.side));
$$('.otype>button').forEach(b => b.onclick = () => setOtype(b.dataset.ot));

function renderForm() {
  const s = S.sym, t = S.tick[s], buy = S.side === 'buy', mkt = S.otype === 'market';
  $('#s-av').textContent = S.me ? (buy ? fu(avail('USDT')) + ' USDT' : fq(avail(s)) + ' ' + s) : '--';
  $('#p-av').textContent = S.me ? fu(avail('USDT')) + ' USDT' : '--';
  $('#s-px-f').hidden = mkt; $('#s-mkt-f').hidden = !mkt;
  $('#s-tot-f').hidden = mkt;
  if (mkt && buy) { $('#s-qty-l').textContent = '金额'; $('#s-qty-u').textContent = 'USDT'; $('#s-qty').placeholder = '想花多少 USDT' }
  else { $('#s-qty-l').textContent = '数量'; $('#s-qty-u').textContent = s; $('#s-qty').placeholder = '' }
  if (!S.pxTouched && t && !mkt) $('#s-px').value = (+t.last).toFixed(dec(t.last));
  const go = $('#s-go'); go.className = 'go ' + (buy ? 'buy' : 'sell');
  go.textContent = S.me ? (buy ? '买入 ' : '卖出 ') + s : '登录后交易';
  ['#p-long', '#p-short'].forEach((id, i) => { $(id).innerHTML = S.me ? (i ? '开空 ↓<small>看跌</small>' : '开多 ↑<small>看涨</small>') : '登录后交易' });
  calcSpot(); calcPerp();
}
function calcSpot(src) {
  const t = S.tick[S.sym]; if (!t) return;
  const buy = S.side === 'buy', mkt = S.otype === 'market';
  const px = mkt ? (buy ? t.ask : t.bid) : +$('#s-px').value || 0;
  const cross = !mkt && px && (buy ? px >= t.ask : px <= t.bid);
  const fee = mkt || cross ? .001 : .0008, fl = mkt || cross ? '吃单 0.1%' : '挂单 0.08%';
  let qty = +$('#s-qty').value || 0;
  if (src === 'tot' && px) { qty = (+$('#s-tot').value || 0) / px; $('#s-qty').value = qty ? +qty.toFixed(8) : '' }
  else if (!mkt) $('#s-tot').value = qty && px ? +(qty * px).toFixed(2) : '';
  let e = '';
  if (mkt && buy) { const amt = qty; e = `<span>预计买到</span><b>≈ ${fq(amt / (1 + fee) / (px || 1))} ${S.sym}</b><span>手续费 (${fl})</span><b>≈ ${fu(amt - amt / (1 + fee))} USDT</b><span>参考价（卖一）</span><b>${fp(px)}</b>` }
  else if (mkt) e = `<span>预计得到</span><b>≈ ${fu(qty * px * (1 - fee))} USDT</b><span>手续费 (${fl})</span><b>≈ ${fu(qty * px * fee)} USDT</b><span>参考价（买一）</span><b>${fp(px)}</b>`;
  else if (qty && px) e = buy ? `<span>冻结资金</span><b>${fu(qty * px * (1 + fee))} USDT</b><span>手续费 (${fl})</span><b>${fu(qty * px * fee)} USDT</b>` : `<span>成交后得到</span><b>${fu(qty * px * (1 - fee))} USDT</b><span>手续费 (${fl})</span><b>${fu(qty * px * fee)} USDT</b>`;
  if (!mkt && px && t) { const d = (px - t.last) / t.last; if (Math.abs(d) > .001) e += `<span>与现价相差</span><b class="${cls(d)}">${fpct(d)}${buy ? (d > 0 ? '（高于现价，会立即成交）' : '（跌到这个价才买）') : (d < 0 ? '（低于现价，会立即成交）' : '（涨到这个价才卖）')}</b>` }
  const ins = instOf(S.sym, 'spot'); if (ins.min) e += `<span>最小下单量</span><b>${ins.min} ${S.sym}</b>`;
  if (mkt) e += `<span>说明</span><b class="mut">按实时盘口逐档成交，大单会有滑点</b>`;
  $('#s-est').innerHTML = e;
}
function spotPct(p) {
  if (!S.me) return; const t = S.tick[S.sym]; const buy = S.side === 'buy', mkt = S.otype === 'market', fee = S.me.fee;
  if (buy) { const u = avail('USDT') * p / 100; if (mkt) $('#s-qty').value = u ? Math.floor(u * 100) / 100 : ''; else { const px = +$('#s-px').value || t.last; $('#s-qty').value = u ? +(u / (1 + fee) / px).toFixed(8) : '' } }
  else { const q = avail(S.sym) * p / 100; $('#s-qty').value = q ? +(Math.floor(q * 1e8) / 1e8).toFixed(8) : '' }
  $('#s-pct').value = p; calcSpot();
}
$('#s-pct').oninput = e => spotPct(+e.target.value);
$$('#f-spot .pct-btns button').forEach(b => b.onclick = () => spotPct(+b.dataset.p));
$('#s-px').oninput = () => { S.pxTouched = true; calcSpot('px') };
/* 价格可按百分比填：相对最新价 ±x% */
function pxBase(id) { const t = id === 's-px' ? S.tick[S.sym] : ((S.swap || {})[S.sym] || S.tick[S.sym]); return t ? +t.last : 0 }
function pxFmt(id, v) { return id === 's-px' ? (+v).toFixed(dec(v)) : (+v).toFixed(tdec(S.sym, 'swap') ?? dec(v)) }
function initPctPx() {
  [['s-px', [-5, -2, -1, 0, 1, 2, 5]], ['p-px', [-5, -2, -1, 0, 1, 2, 5]], ['p-tp', [-10, -5, -2, 2, 5, 10]], ['p-sl', [-5, -2, -1, 1, 2, 5]]].forEach(([id, ps]) => {
    const inp = $('#' + id); if (!inp) return; const f = inp.closest('.field'); if (!f || f.nextElementSibling?.classList.contains('pxp')) return;
    const row = document.createElement('div'); row.className = 'pxp'; row.dataset.for = id;
    row.innerHTML = ps.map(p => `<button type="button" data-p="${p}">${p === 0 ? '现价' : (p > 0 ? '+' : '') + p + '%'}</button>`).join('') + `<label class="pxp-c"><input inputmode="decimal" placeholder="±%" aria-label="自定义百分比">%</label><span class="pxp-h"></span>`;
    f.after(row);
    const set = p => { const b = pxBase(id); if (!b) return; inp.value = pxFmt(id, b * (1 + p / 100)); inp.dispatchEvent(new Event('input', { bubbles: true })); hint() };
    const hint = () => { const b = pxBase(id), v = +inp.value; row.querySelector('.pxp-h').textContent = b && v ? `比现价 ${v >= b ? '+' : ''}${((v / b - 1) * 100).toFixed(2)}%` : '' };
    row.onclick = e => { const b = e.target.closest('button[data-p]'); if (b) set(+b.dataset.p) };
    const c = row.querySelector('.pxp-c input'); c.oninput = () => { const v = parseFloat(c.value.replace('＋', '+').replace('－', '-')); if (!isNaN(v)) set(v) };
    inp.addEventListener('input', hint); setInterval(hint, 2000);
  });
}
initPctPx();
$('#s-qty').oninput = () => calcSpot('qty'); $('#s-tot').oninput = () => calcSpot('tot');
$('#s-go').onclick = async () => {
  if (!S.me) { location.href = '/api/auth/login'; return }
  const buy = S.side === 'buy', mkt = S.otype === 'market', v = +$('#s-qty').value;
  if (!v) { toast(mkt && buy ? '请输入金额' : '请输入数量', 'err'); return }
  const body = { sym: S.sym, side: S.side, type: S.otype };
  if (mkt) { if (buy) body.amt = v; else body.qty = v } else { body.qty = v; body.px = +$('#s-px').value }
  const go = $('#s-go'); go.disabled = true;
  try {
    const r = await api('order', body);
    toast(r.status === 'filled' ? `成交：${buy ? '买入' : '卖出'} ${fq(r.qty)} ${S.sym}，均价 ${fps(r.fpx, S.sym, 'spot')}${r.slippage && Math.abs(r.slippage) > 1e-5 ? '，滑点 ' + (r.slippage * 100).toFixed(3) + '%' : ''}` : r.status === 'partial' ? `部分立即成交 ${fq(r.filled_qty)}，剩余 ${fq(r.open_qty)} 已挂单` : '限价单已挂出，可在“当前委托”查看');
    $('#s-qty').value = ''; $('#s-tot').value = ''; $('#s-pct').value = 0; S.hist = null; await loadMe(); if (r.status !== 'filled') setRec('open');
  } catch (e) { if (e.code === 'need_loan') openLoanModal(e.need); else toast(e.message, 'err') } finally { go.disabled = false }
};

/* ---- 合约 ---- */
const lev = () => Math.max(1, Math.min(400, parseInt($('#lev').value) || 1));
function setLev(v) { v = Math.max(1, Math.min(400, Math.round(v) || 1)); $('#lev').value = v; $('#lev-r').value = v; $$('.lev-pre button').forEach(b => b.classList.toggle('on', +b.textContent === v)); calcPerp() }
$('#lev-r').oninput = e => setLev(+e.target.value); $('#lev').onchange = () => setLev(+$('#lev').value);
$('#lev-m').onclick = () => setLev(lev() - 1); $('#lev-p').onclick = () => setLev(lev() + 1);
$$('.lev-pre button').forEach(b => b.onclick = () => setLev(+b.textContent));
$('#p-mg').oninput = calcPerp; $('#p-tp').oninput = $('#p-sl').oninput = calcPerp;
$('#p-tpsl-on').onchange = e => { $('#p-tpsl').hidden = !e.target.checked; if (!e.target.checked) { $('#p-tp').value = $('#p-sl').value = '' } };
function perpPct(p) { if (!S.me) return; const fee = .0005, L = lev(); const m = avail('USDT') * p / 100 / (1 + L * fee); $('#p-mg').value = m ? Math.floor(m * 100) / 100 : ''; $('#p-pct').value = p; calcPerp() }
$('#p-pct').oninput = e => perpPct(+e.target.value);
$$('#f-perp .pct-btns button').forEach(b => b.onclick = () => perpPct(+b.dataset.p));
function mmr(L) { return Math.min(.004, .4 / L) }
function liqPx(side, entry, qty, margin, L) { const m = mmr(L); return side === 'long' ? Math.max(0, (entry * qty - margin) / (qty * (1 - m))) : (entry * qty + margin) / (qty * (1 + m)) }
function calcPerp() {
  const t = (S.swap || {})[S.sym] || S.tick[S.sym]; if (!t) return;
  const L = lev(), m = +$('#p-mg').value || 0, lim = S.potype === 'limit', lp = +$('#p-px').value || 0, n = m * L;
  if (lim && !S.ppxTouched) $('#p-px').value = (+t.last).toFixed(tdec(S.sym, 'swap') ?? dec(t.last));
  const ins = instOf(S.sym, 'swap');
  let e = '';
  if (m) {
    const pl = lim && lp ? lp : t.ask, ps = lim && lp ? lp : t.bid;
    const ql = roundLot(n / pl, ins.lot), qs = roundLot(n / ps, ins.lot);
    const fr = lim ? '挂单 0.02%（若立即成交按吃单 0.05%）' : '吃单 0.05%', fee = lim ? .0002 : .0005;
    e = `<span>仓位价值</span><b>${fu(n)} USDT</b><span>开仓数量</span><b>${fq(ql)} ${S.sym}${ins.min && ql < ins.min ? '（低于最小 ' + ins.min + '）' : ''}</b><span>开仓手续费</span><b>${fu(n * fee)} USDT · ${fr}</b>` +
      `<span>开多强平价</span><b class="dn">${fps(liqPx('long', pl, ql || 1, m, L), S.sym, 'swap')}（跌 ${((1 - liqPx('long', pl, ql || 1, m, L) / pl) * 100).toFixed(2)}%）</b>` +
      `<span>开空强平价</span><b class="dn">${fps(liqPx('short', ps, qs || 1, m, L), S.sym, 'swap')}（涨 ${((liqPx('short', ps, qs || 1, m, L) / ps - 1) * 100).toFixed(2)}%）</b>` +
      `<span>价格每变动 1%</span><b>盈亏约 ${fu(n * .01)} USDT（保证金的 ${L}%）</b>`;
  } else e = `<span>最新价 / 标记价</span><b>${fps(t.last, S.sym, 'swap')} / ${fps(t.mark, S.sym, 'swap')}</b>`;
  if (t.fr != null) e += `<span>资金费率</span><b><span class="${t.fr > 0 ? 'dn' : 'up'}">${(t.fr * 100).toFixed(4)}%</span>，${fcount(t.nft - Date.now())} 后结算（${t.fr > 0 ? '多头付给空头' : '空头付给多头'}）</b>`;
  if (ins.min) e += `<span>最小仓位</span><b>${ins.min} ${S.sym}</b>`;
  $('#p-est').innerHTML = e;
  // 止盈止损建议：止损设在离强平一半的位置（最多 3%），止盈按 1:2 盈亏比
  const sg = $('#p-sug');
  if (sg) {
    const ref = lim && lp ? lp : +t.last, liqD = Math.max(.001, 1 / L * (1 - mmr(L) * L)), sd = Math.min(.03, liqD * .5), td = sd * 2, f = x => fps(x, S.sym, 'swap'), r = x => (x * L * 100).toFixed(0);
    const lt = ref * (1 + td), ls = ref * (1 - sd), st_ = ref * (1 - td), ss = ref * (1 + sd);
    sg.innerHTML = `<p>建议价格（止损离强平价留足距离，止盈是止损的 2 倍，点一下自动填入）：</p>` +
      `<button type="button" data-tp="${lt}" data-sl="${ls}"><b class="up">开多</b> 止盈 ${f(lt)}（+${r(td)}%）· 止损 ${f(ls)}（−${r(sd)}%）</button>` +
      `<button type="button" data-tp="${st_}" data-sl="${ss}"><b class="dn">开空</b> 止盈 ${f(st_)}（+${r(td)}%）· 止损 ${f(ss)}（−${r(sd)}%）</button>` +
      `<small>括号里是按 ${L} 倍杠杆算的保证金收益率。</small>`;
    sg.querySelectorAll('button').forEach(b => b.onclick = () => { const d = tdec(S.sym, 'swap') ?? dec(+b.dataset.tp); $('#p-tp').value = (+b.dataset.tp).toFixed(d); $('#p-sl').value = (+b.dataset.sl).toFixed(d); });
  }
  const w = $('#p-warn');
  if (L >= 100) { w.hidden = false; w.innerHTML = `⚠ ${L} 倍是极高风险：价格反向波动约 ${(100 / L * (1 - mmr(L) * L)).toFixed(2)}% 就会爆仓，开仓手续费约占保证金的 ${(L * .0005 * 100).toFixed(0)}%。仅建议用小额体验。` }
  else if (L >= 20) { w.hidden = false; w.innerHTML = `注意：${L} 倍杠杆下，价格反向波动约 ${(100 / L).toFixed(1)}% 就会接近爆仓。` }
  else w.hidden = true;
}
async function perpOpen(side) {
  if (!S.me) { location.href = '/api/auth/login'; return }
  const m = +$('#p-mg').value; if (!m) { toast('请输入保证金', 'err'); return }
  const L = lev(); if (L >= 100 && !confirm(`确定以 ${L} 倍杠杆${side === 'long' ? '开多' : '开空'}？\n价格小幅反向波动就会爆仓（虚拟资金）。`)) return;
  const body = { sym: S.sym, side, lev: L, margin: m, type: S.potype }; if (S.potype === 'limit') { body.px = +$('#p-px').value; if (!body.px) { toast('请输入限价', 'err'); return } } const tp = +$('#p-tp').value, sl = +$('#p-sl').value; if (tp) body.tp = tp; if (sl) body.sl = sl;
  const btns = [$('#p-long'), $('#p-short')]; btns.forEach(b => b.disabled = true);
  try {
    const r = await api('perp/open', body);
    if (r.status === 'open') toast('合约限价单已挂出，价格到了才会开仓，可在“合约委托”查看');
    else toast(`${side === 'long' ? '开多' : '开空'}成功，均价 ${fps(r.entry, S.sym, 'swap')}，强平价 ${fps(r.liq, S.sym, 'swap')}${r.status === 'partial' ? '（部分成交，剩余已挂单）' : ''}`);
    $('#p-mg').value = ''; $('#p-pct').value = 0; await loadMe(); setRec(r.status === 'open' ? 'pord' : 'pos');
  } catch (e) { if (e.code === 'need_loan') openLoanModal(e.need); else toast(e.message, 'err') } finally { btns.forEach(b => b.disabled = false) }
}
$$('.potype>button').forEach(b => b.onclick = () => setPotype(b.dataset.pt));
$('#p-px').oninput = () => { S.ppxTouched = true; calcPerp() };
$('#p-long').onclick = () => perpOpen('long'); $('#p-short').onclick = () => perpOpen('short');

/* ================= 记录区 ================= */
function setRec(r) { S.rec = r; if (r === 'fund') S.fund = null; $$('#rec-tabs button').forEach(b => b.classList.toggle('on', b.dataset.r === r)); if (r === 'hist') S.hist = null; if (r === 'phist') S.phist = null; renderRecords() }
$('#rec-tabs').onclick = e => { const b = e.target.closest('button'); if (b) setRec(b.dataset.r) };
$('#only-cur').onchange = renderRecords;
/* 持仓止盈止损：按收益率（%）快捷填价 + 推荐价 */
function tpslPx(p, kind, roe) { const mv = roe / 100 / p.lev, up = (kind === 'tp') === (p.side === 'long'); return p.entry * (up ? 1 + mv : 1 - mv) }
function tpslRec(p) { const liqD = p.liq ? Math.abs(p.liq / p.entry - 1) : 1 / p.lev, sd = Math.min(.03, liqD * .5); return { sl: sd * p.lev * 100, tp: sd * 2 * p.lev * 100 } }
function tpslRows(p) {
  const v = (S.tpv || {})[p.id] || {}, rec = tpslRec(p), f = x => fps(x, p.sym, 'swap');
  const row = (k, lab, list) => `<div class="tp-row"><label>${lab}</label><input data-${k} placeholder="${lab}" value="${v[k] ?? (p[k] || '')}" inputmode="decimal"><span class="tp-h" data-h="${k}">${tpslHint(p, k, v[k] ?? p[k])}</span></div>
    <div class="pxp tp-chips" data-k="${k}"><button type="button" class="rec" data-r="${k === 'tp' ? rec.tp : -rec.sl}">推荐 ${f(tpslPx(p, k, k === 'tp' ? rec.tp : rec.sl))}</button>${list.map(r => `<button type="button" data-r="${r}">${r > 0 ? '+' : ''}${r}%</button>`).join('')}<label class="pxp-c"><input data-cr="${k}" inputmode="decimal" placeholder="${k === 'tp' ? '+' : '−'}%">%</label></div>`;
  return row('tp', '止盈价', [10, 25, 50, 100]) + row('sl', '止损价', [-10, -25, -50]) + `<p class="tp-note">百分比是按 ${p.lev} 倍杠杆算的<b>收益率</b>（赚/亏保证金的百分之多少）。推荐：止损离强平价留足距离，止盈是止损的 2 倍。</p>`;
}
function tpslHint(p, k, px) { px = +px; if (!px) return ''; const mv = (px / p.entry - 1) * (p.side === 'long' ? 1 : -1), r = mv * p.lev * 100; const e = (px / p.entry - 1) * 100; return `比开仓价 ${e >= 0 ? '+' : ''}${e.toFixed(2)}% · 收益率 ${r >= 0 ? '+' : ''}${r.toFixed(1)}%` }
function tpslSet(card, p, k, roe) { const px = tpslPx(p, k, Math.abs(roe)), inp = card.querySelector(`[data-${k}]`); inp.value = (+px).toFixed(tdec(p.sym, 'swap') ?? dec(px)); S.tpv = S.tpv || {}; (S.tpv[p.id] = S.tpv[p.id] || {})[k] = inp.value; card.querySelector(`[data-h="${k}"]`).textContent = tpslHint(p, k, inp.value) }
function posOf(id) { return ((S.me && S.me.positions) || []).find(q => q.id === id) }
const onTpInput = e => { const card = e.target.closest('.pos'); if (!card) return; const id = +card.dataset.id, p = posOf(id); if (!p) return;
  for (const k of ['tp', 'sl']) { if (e.target.matches(`[data-${k}]`)) { S.tpv = S.tpv || {}; (S.tpv[id] = S.tpv[id] || {})[k] = e.target.value; card.querySelector(`[data-h="${k}"]`).textContent = tpslHint(p, k, e.target.value) } if (e.target.matches(`[data-cr="${k}"]`)) { const r = parseFloat(e.target.value.replace('−', '-')); if (!isNaN(r)) tpslSet(card, p, k, r) } } };
['#rec-body', '#a-pos'].forEach(q => $(q) && $(q).addEventListener('input', onTpInput));
function vsE(p, x) { if (!x || !p.entry) return ''; const e = (x / p.entry - 1) * 100; return `<small class="vse">${e >= 0 ? '+' : ''}${e.toFixed(2)}%</small>` }
function posCard(p, actions = true) {
  const pnl = p.upnl || 0, roe = p.roe || 0;
  return `<div class="pos" data-id="${p.id}"><div class="pos-h"><b>${p.sym}USDT 永续</b><span class="badge ${p.side}">${p.side === 'long' ? '多' : '空'}</span><span class="badge lev">${p.lev}x 逐仓</span>
  <div class="pnl ${cls(pnl)}">${pnl >= 0 ? '+' : ''}${fu(pnl)} USDT<small>收益率 ${fpct(roe)}</small>${p.net != null ? `<small class="net ${cls(p.net)}">扣手续费后净 ${p.net >= 0 ? '+' : ''}${fu(p.net)}（${fpct(p.net_roe || 0)}）</small>` : ''}</div></div>
  <div class="pos-g"><div><label>数量 (${p.sym})</label>${fq(p.qty)}</div><div><label>保证金</label>${fu(p.margin)}</div><div><label>开仓均价</label>${fps(p.entry, p.sym, 'swap')}</div><div><label>标记价</label>${fps(p.mark, p.sym, 'swap')}${vsE(p, p.mark)}</div>
  <div><label>预估强平价</label><span class="dn">${fps(p.liq, p.sym, 'swap')}</span>${vsE(p, p.liq)}</div><div><label>累计资金费</label><span class="${cls(p.funding || 0)}">${(p.funding || 0) >= 0 ? '+' : ''}${fu(p.funding || 0)}</span></div><div><label>仓位价值</label>${fu(p.qty * (p.mark || p.entry))}</div><div><label>止盈</label>${p.tp ? fp(p.tp, p.entry) + vsE(p, p.tp) : '--'}</div><div><label>止损</label>${p.sl ? fp(p.sl, p.entry) + vsE(p, p.sl) : '--'}</div></div>
  ${actions ? `<div class="pos-a"><button data-close="25">平 25%</button><button data-close="50">平 50%</button><button data-close="100">全部平仓</button><button data-tpsl>止盈止损</button></div>
  <div class="pos-tpsl" ${S.tpo && S.tpo.has(p.id) ? '' : 'hidden'}>${tpslRows(p)}<button class="btn-g" data-save>保存</button><span class="mut">留空表示取消</span></div>` : ''}</div>`;
}
async function onPosClick(e) {
  const card = e.target.closest('.pos'); if (!card) return; const id = +card.dataset.id;
  const c = e.target.closest('[data-close]');
  if (c) { const pct = +c.dataset.close; c.disabled = true; try { const r = await api('perp/close', { id, pct }); toast(`已平仓 ${pct}% @ ${fp(r.px)}，盈亏 ${r.pnl >= 0 ? '+' : ''}${fu(r.pnl)} USDT`, r.pnl >= 0 ? 'ok' : 'err'); S.phist = null; await loadMe() } catch (er) { toast(er.message, 'err') } c.disabled = false; return }
  const ch = e.target.closest('.tp-chips button[data-r]'); if (ch) { const p = posOf(id); if (p) tpslSet(card, p, ch.closest('.tp-chips').dataset.k, +ch.dataset.r); return }
  if (e.target.closest('[data-tpsl]')) { const b = card.querySelector('.pos-tpsl'); b.hidden = !b.hidden; S.tpo = S.tpo || new Set(); b.hidden ? S.tpo.delete(id) : S.tpo.add(id); return }
  if (e.target.closest('[data-save]')) { try { await api('perp/tpsl', { id, tp: +card.querySelector('[data-tp]').value || null, sl: +card.querySelector('[data-sl]').value || null }); toast('止盈止损已更新'); if (S.tpv) delete S.tpv[id]; await loadMe() } catch (er) { toast(er.message, 'err') } }
}
$('#rec-body').onclick = async e => {
  const pc = e.target.closest('[data-pcancel]');
  if (pc) { try { const all = pc.dataset.pcancel === 'all'; const r = await api('perp/cancel', all ? { all: 1 } : { id: +pc.dataset.pcancel }); toast(`已撤销 ${r.cancelled} 个合约委托`); await loadMe() } catch (er) { toast(er.message, 'err') } return }
  const c = e.target.closest('[data-cancel]');
  if (c) { try { await api('cancel', { id: +c.dataset.cancel }); toast('已撤单'); await loadMe() } catch (er) { toast(er.message, 'err') } return }
  if (e.target.closest('[data-cancelall]')) { try { const r = await api('cancel_all', { sym: $('#only-cur').checked ? S.sym : undefined }); toast(`已撤销 ${r.cancelled} 个委托`); await loadMe() } catch (er) { toast(er.message, 'err') } return }
  const g = e.target.closest('[data-goto]'); if (g) { setSym(g.dataset.goto); window.scrollTo(0, 0); return }
  onPosClick(e);
};
$('#a-pos').onclick = onPosClick;
const typeCn = t => t === 'market' ? '市价' : '限价', stCn = { open: '挂单中', filled: '已成交', cancelled: '已撤销', closed: '手动平仓', liquidated: '强制平仓', tp: '止盈平仓', sl: '止损平仓' };
function renderRecords() {
  const body = $('#rec-body'), only = $('#only-cur').checked, me = S.me;
  $('#n-pord').textContent = me && me.porders && me.porders.length ? `(${me.porders.length})` : '';
  $('#n-pos').textContent = me && me.positions.length ? `(${me.positions.length})` : ''; $('#n-open').textContent = me && me.open.length ? `(${me.open.length})` : '';
  if (!me) { body.innerHTML = '<div class="empty"><a href="/api/auth/login">登录</a>后查看你的持仓和委托</div>'; return }
  const f = a => only ? a.filter(x => x.sym === S.sym) : a;
  if (S.rec === 'pos') {
    if (document.activeElement && body.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
    const ps = f(me.positions); body.innerHTML = ps.length ? ps.map(p => posCard(p)).join('') : '<div class="empty">暂无合约持仓</div>';
  } else if (S.rec === 'open') {
    const os = f(me.open);
    body.innerHTML = os.length ? `<table><tr><th>时间</th><th>币种</th><th>方向</th><th>类型</th><th>委托价</th><th>数量</th><th>委托额</th><th><span class="lnk" data-cancelall>全部撤销</span></th></tr>${os.map(o => `<tr><td>${ftime(o.t * 1000, 1)}</td><td>${o.sym}/USDT</td><td class="${o.side === 'buy' ? 'up' : 'dn'}">${o.side === 'buy' ? '买入' : '卖出'}</td><td>${typeCn(o.type)}</td><td>${fp(o.px)}</td><td>${fq(o.qty)}</td><td>${fu(o.qty * o.px)}</td><td><span class="lnk" data-cancel="${o.id}">撤单</span></td></tr>`).join('')}</table>` : '<div class="empty">暂无挂单</div>';
  } else if (S.rec === 'hist') {
    if (!S.hist) { body.innerHTML = '<div class="empty">加载中…</div>'; api('orders?status=done&limit=100').then(j => { S.hist = j.orders; renderRecords() }).catch(() => { }); return }
    const os = f(S.hist);
    body.innerHTML = os.length ? `<table><tr><th>时间</th><th>币种</th><th>方向</th><th>类型</th><th>委托价</th><th>成交价</th><th>数量</th><th>成交额</th><th>手续费</th><th>角色</th><th>状态</th></tr>${os.map(o => `<tr><td>${ftime((o.done || o.created) * 1000, 1)}</td><td>${o.sym}/USDT</td><td class="${o.side === 'buy' ? 'up' : 'dn'}">${o.side === 'buy' ? '买入' : '卖出'}</td><td>${typeCn(o.type)}</td><td>${o.px ? fp(o.px) : '市价'}</td><td>${o.fpx ? fp(o.fpx) : '--'}</td><td>${fq(o.qty)}</td><td>${o.fpx ? fu(o.qty * o.fpx) : '--'}</td><td>${o.fee ? fu(o.fee) : '--'}</td><td>${o.liq === 'maker' ? '挂单' : o.liq === 'taker' ? '吃单' : '--'}</td><td>${stCn[o.status] || o.status}</td></tr>`).join('')}</table>` : '<div class="empty">暂无历史委托</div>';
  } else if (S.rec === 'phist') {
    if (!S.phist) { body.innerHTML = '<div class="empty">加载中…</div>'; api('perp/positions?status=closed').then(j => { S.phist = j.positions; renderRecords() }).catch(() => { }); return }
    const ps = f(S.phist);
    body.innerHTML = ps.length ? `<table><tr><th>平仓时间</th><th>币种</th><th>方向</th><th>杠杆</th><th>开仓价</th><th>平仓价</th><th>数量</th><th>保证金</th><th>已实现盈亏</th><th>手续费</th><th>净盈亏</th><th>方式</th></tr>${ps.map(p => `<tr><td>${ftime(p.closed * 1000, 1)}</td><td>${p.sym}</td><td class="${p.side === 'long' ? 'up' : 'dn'}">${p.side === 'long' ? '多' : '空'}</td><td>${p.lev}x</td><td>${fp(p.entry)}</td><td>${fp(p.close_px, p.entry)}</td><td>${fq(p.qty)}</td><td>${fu(p.margin)}</td><td class="${cls(p.pnl)}">${p.pnl >= 0 ? '+' : ''}${fu(p.pnl)}</td><td>${fu(p.fee || 0)}</td><td class="${cls(p.net ?? p.pnl)}"><b>${(p.net ?? p.pnl) >= 0 ? '+' : ''}${fu(p.net ?? p.pnl)}</b></td><td>${stCn[p.status] || p.status}</td></tr>`).join('')}</table>` : '<div class="empty">暂无合约历史</div>';
  } else if (S.rec === 'pord') {
    const os = f(me.porders || []);
    body.innerHTML = os.length ? `<table><tr><th>时间</th><th>合约</th><th>方向</th><th>杠杆</th><th>委托价</th><th>数量</th><th>保证金</th><th>止盈/止损</th><th><span class="lnk" data-pcancel="all">全部撤销</span></th></tr>${os.map(o => `<tr><td>${ftime(o.created * 1000, 1)}</td><td>${o.sym}USDT 永续</td><td class="${o.side === 'long' ? 'up' : 'dn'}">${o.side === 'long' ? '开多' : '开空'}</td><td>${o.lev}x</td><td>${fps(o.px, o.sym, 'swap')}</td><td>${fq(o.qty)}</td><td>${fu(o.margin)}</td><td>${o.tp ? fps(o.tp, o.sym, 'swap') : '--'} / ${o.sl ? fps(o.sl, o.sym, 'swap') : '--'}</td><td><span class="lnk" data-pcancel="${o.id}">撤单</span></td></tr>`).join('')}</table>` : '<div class="empty">暂无合约限价委托</div>';
  } else if (S.rec === 'fund') {
    if (!S.fund) { body.innerHTML = '<div class="empty">加载中…</div>'; api('perp/funding').then(j => { S.fund = j.funding; renderRecords() }).catch(() => { }); return }
    const fs = f(S.fund);
    body.innerHTML = fs.length ? `<table><tr><th>结算时间</th><th>合约</th><th>方向</th><th>资金费率</th><th>金额 (USDT)</th></tr>${fs.map(x => `<tr><td>${ftime(x.ts * 1000, 1)}</td><td>${x.sym}USDT 永续</td><td class="${x.side === 'long' ? 'up' : 'dn'}">${x.side === 'long' ? '多' : '空'}</td><td>${(x.rate * 100).toFixed(4)}%</td><td class="${cls(x.amount)}">${x.amount >= 0 ? '+' : ''}${fu(x.amount)}</td></tr>`).join('')}</table>` : '<div class="empty">还没有资金费记录。持有合约跨过结算时间点（OKX 每 8 小时或更短）才会产生。</div>';
  } else if (S.rec === 'bal') body.innerHTML = holdTable(only);
}
function holdTable(only) {
  const me = S.me; if (!me) return '';
  const rows = Object.entries(me.bal).filter(([a]) => a !== 'USDT' && (!only || a === S.sym));
  const u = me.bal.USDT || [0, 0];
  let h = `<table><tr><th>币种</th><th>数量</th><th>可用</th><th>冻结</th><th>持仓均价</th><th>当前价</th><th>市值 (USDT)</th><th>浮动盈亏</th><th></th></tr>`;
  if (!only) h += `<tr><td><b>USDT</b></td><td>${fu(u[0] + u[1])}</td><td>${fu(u[0])}</td><td>${fu(u[1])}</td><td>--</td><td>1</td><td>${fu(u[0] + u[1])}</td><td>--</td><td></td></tr>`;
  for (const [a, [fr, lk]] of rows) {
    const q = fr + lk, t = S.tick[a], px = t ? t.bid : 0, val = q * px, cost = (me.cost || {})[a] || 0, avg = q ? cost / q : 0, pnl = val - cost, net = val * (1 - ((me.fees && me.fees.spot && me.fees.spot[1]) || .001)) - cost;
    h += `<tr><td><b>${a}</b> <span class="mut">${esc(cn(a))}</span></td><td>${fq(q)}</td><td>${fq(fr)}</td><td>${fq(lk)}</td><td>${avg ? fp(avg) : '--'}</td><td>${fp(px)}${avg && px ? `<small class="vse ${cls(px - avg)}">比均价 ${px >= avg ? '+' : ''}${((px / avg - 1) * 100).toFixed(2)}%</small>` : ''}</td><td>${fu(val)}</td><td class="${cls(pnl)}">${cost ? (pnl >= 0 ? '+' : '') + fu(pnl) + ' (' + fpct(pnl / cost) + ')' + `<small class="vse ${cls(net)}">扣手续费后净 ${net >= 0 ? '+' : ''}${fu(net)} (${fpct(net / cost)})</small>` : '--'}</td><td><span class="lnk" data-goto="${a}">交易</span></td></tr>`;
  }
  return rows.length || !only ? h + '</table>' : '<div class="empty">没有持有该币种</div>';
}

/* ================= 资产页 ================= */
let eqChart, eqSeries;
async function renderAssets(loadCurve) {
  const me = S.me;
  if (!me) { $('#a-eq').textContent = '--'; $('#a-pnl').innerHTML = '<a href="/api/auth/login">登录</a>后查看'; $('#a-hold').innerHTML = $('#a-pos').innerHTML = $('#a-split').innerHTML = ''; return }
  const eq = me.equity || 0, pnl = eq - me.init;
  $('#a-eq').textContent = fu(eq); $('#a-pnl').innerHTML = `<span class="${cls(pnl)}">总盈亏 ${pnl >= 0 ? '+' : ''}${fu(pnl)} USDT（${fpct(pnl / me.init)}）</span>`;
  $('#a-rank').textContent = me.rank ? `#${me.rank} / ${me.total}` : '统计中';
  const de = $('#a-debt'); if (de) { de.textContent = (me.debt || 0) > 0 ? fu(me.debt) : '0'; de.classList.toggle('dn', (me.debt || 0) > 0) }
  const al = $('#a-loan'); if (al) al.onclick = () => openLoanModal(0);
  const u = me.bal.USDT || [0, 0]; let spot = 0; for (const [a, [f, l]] of Object.entries(me.bal)) if (a !== 'USDT' && S.tick[a]) spot += (f + l) * S.tick[a].bid;
  let pm = 0, pu = 0, pn = 0; me.positions.forEach(p => { pm += p.margin; pu += p.upnl || 0; pn += p.net ?? p.upnl ?? 0 });
  $('#a-split').innerHTML = `<div>USDT 可用<b>${fu(u[0])}</b></div><div>挂单冻结<b>${fu(u[1])}</b></div><div>现货持仓市值<b>${fu(spot)}</b></div><div>合约保证金<b>${fu(pm)}</b></div><div>合约未实现盈亏<b class="${cls(pu)}">${pu >= 0 ? '+' : ''}${fu(pu)}</b><small class="vse ${cls(pn)}">净 ${pn >= 0 ? '+' : ''}${fu(pn)}</small></div>`;
  $('#a-hold').innerHTML = holdTable(false);
  if (!$('#a-pos').contains(document.activeElement) || document.activeElement.tagName !== 'INPUT') $('#a-pos').innerHTML = me.positions.length ? me.positions.map(p => posCard(p)).join('') : '<div class="empty">暂无合约持仓</div>';
  if (loadCurve) {
    if (!eqChart) {
      eqChart = LightweightCharts.createChart($('#eq-chart'), { autoSize: true, handleScroll: { vertTouchDrag: false, mouseWheel: false }, handleScale: { axisPressedMouseMove: { time: true, price: false } }, layout: { background: { color: '#161a1e' }, textColor: '#848e9c', fontSize: 11 }, grid: { vertLines: { visible: false }, horzLines: { color: '#1f242b' } }, rightPriceScale: { borderColor: '#2b3139' }, timeScale: { borderColor: '#2b3139', timeVisible: true }, localization: { locale: 'zh-CN' } });
      eqSeries = eqChart.addBaselineSeries({ baseValue: { type: 'price', price: 1000000 }, topLineColor: '#0ecb81', bottomLineColor: '#f6465d', topFillColor1: 'rgba(14,203,129,.25)', topFillColor2: 'rgba(14,203,129,0)', bottomFillColor1: 'rgba(246,70,93,0)', bottomFillColor2: 'rgba(246,70,93,.25)', lineWidth: 2, priceFormat: { type: 'price', precision: 2, minMove: .01 } });
    }
    S.eqLoaded = true;
    try { const j = await api('equity'); const seen = new Set(); eqSeries.setData(j.points.map(p => ({ time: p[0] + TZ, value: p[1] })).filter(p => !seen.has(p.time) && seen.add(p.time))); eqChart.timeScale().fitContent() } catch (e) { }
  }
}

/* ================= 排行榜 ================= */
$('#r-tabs').onclick = e => { const b = e.target.closest('button[data-b]'); if (!b) return; S.rb = b.dataset.b; $$('#r-tabs button').forEach(x => x.classList.toggle('on', x === b)); loadRank() };
async function loadRank() {
  try { S.lb = await (await fetch('/data/leaderboard.json', { cache: 'no-store' })).json() } catch (e) { return }
  const lb = S.lb, myName = S.me && S.me.name, myId = S.me && S.me.uid;
  $('#r-ts').textContent = `共 ${lb.total} 人 · 更新于 ${ftime(lb.ts)}`;
  $('#r-me').innerHTML = S.me ? `<p>我的排名：<b class="medal">${S.me.rank ? '#' + S.me.rank : '统计中'}</b>　总资产 ${fu(S.me.equity)} USDT</p>` : '<p><a href="/api/auth/login">登录</a>后参与排名</p>';
  $('#r-list').innerHTML = `<table><tr><th>排名</th><th>用户</th><th class="th-asset">总资产 <small class="mut">(USDT)</small></th><th>收益率</th></tr>${(S.rb === 'loss' ? (lb.loss || []) : lb.top).map((u, i) => { const r = u.r || i + 1, p = u.pct != null ? u.pct / 100 : u.eq / lb.init - 1, isMe = (u.u != null && myId != null ? u.u === myId : u.n === myName), isG = isGeniusUser(u.u, u.n); return `<tr class="rank-row ${isMe ? 'me' : ''} ${isG ? 'row-genius' : ''}"><td class="${r <= 3 ? 'medal' : ''}">${r <= 3 ? (S.rb === 'loss' ? ['💀', '😭', '😵'] : ['🥇', '🥈', '🥉'])[r - 1] : r}</td><td class="uname"><div class="uname-cell"><span class="uname-name ${isG ? 'uname-genius' : ''}">${u.a ? `<img class="av ${isG ? 'av-genius' : ''}" src="${esc(u.a)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}${esc(u.n)}</span>${userBadges(u.u, u.n)}</div></td><td>${fu(u.eq)}</td><td class="${cls(p)}">${fpct(p)}</td></tr>` }).join('')}</table>`;
  if (S.rb === 'loss' && !(lb.loss || []).length) $('#r-list').innerHTML = '<div class="empty">目前还没有人亏损 🎉</div>';
  $('#r-title').textContent = S.rb === 'loss' ? '亏损排行榜' : '收益排行榜';
}

/* ================= 新手指南 ================= */
function renderGuide() {
  const g = $('#guide'); g.classList.add('guide');
  const P = TUT.prog, done = TUT.chapters.filter(c => P.done[c.id]).length;
  g.innerHTML = `<h2>互动教程</h2><p class="mut">跟着提示一步步操作。教程使用<b>本地练习资金 10,000 USDT</b>，只在你的浏览器里运行，不影响真实账户和排行榜。每章都可以单独进入，随时退出，下次从断点继续。</p>
  <div class="tut-prog"><div style="width:${done / TUT.chapters.length * 100}%"></div></div><p class="mut">已完成 ${done} / ${TUT.chapters.length} 章</p>
  <div class="tut-list">${TUT.chapters.map(c => `<div class="tut-ch ${P.done[c.id] ? 'done' : ''}"><span>${P.done[c.id] ? '✓' : '○'}</span><b>${c.title}</b><small>${c.steps.length} 步</small><button class="${P.cur === c.id ? 'btn-y' : 'btn-g'}" data-ch="${c.id}">${P.cur === c.id && P.step ? '继续' : P.done[c.id] ? '重学' : '开始'}</button></div>`).join('')}</div>
  <div class="tut-ctl">${TUT.active ? '<button class="btn-g" data-tx="exit">退出教程模式</button>' : ''}<button class="btn-g" data-tx="reset">清空教程进度</button></div>
  <h2 style="margin-top:24px">新手指南</h2><p class="mut">点开每一条看说明。这里的钱都是虚拟的，大胆试。</p>` + GUIDE.map((x, i) => `<details ${i < 1 ? 'open' : ''}><summary>${x[0]}</summary><div>${x[1]}</div></details>`).join('');
  g.querySelectorAll('details > div').forEach(d => glossify(d));
  g.onclick = e => { const c = e.target.closest('[data-ch]'); if (c) { const id = c.dataset.ch; TUT.go(id, TUT.prog.cur === id ? TUT.prog.step : 0); return } const x = e.target.closest('[data-tx]'); if (x) { if (x.dataset.tx === 'exit') TUT.exit(); else { TUT.resetProgress(); toast('教程进度已清空') } renderGuide() } };
}

/* ================= API 页 ================= */
async function renderApi() {
  const el = $('#api'); const host = location.origin;
  let keyHtml = '<p><a href="/api/auth/login">登录</a>后可以生成你的 API Key。</p>';
  if (S.me) {
    let k = null; try { k = (await api('apikey')).key } catch (e) { }
    keyHtml = k ? `<div class="keybox">当前 Key：<code>${esc(k.prefix)}••••••••</code><span class="mut">创建于 ${ftime(k.created * 1000, 1)}</span><button class="btn-g" id="k-new">重新生成</button><button class="btn-g" id="k-del">删除</button></div>`
      : `<div class="keybox"><button class="btn-y" id="k-new">生成 API Key</button></div>`;
  }
  el.innerHTML = `<h2 style="margin-top:0">AI 接口（API）</h2>
  <p>把 API Key 交给你的 AI（ChatGPT、Claude、各类 Agent 或你自己写的脚本），它就能<b>用你的模拟账户</b>查行情、看持仓、下单、开合约。规则和网页完全一样，成交价由服务端决定。</p>
  <details class="tip"><summary>ⓘ API Key 是什么？安全吗？</summary><div>API Key 相当于一把“只能操作模拟盘”的钥匙，拿到它的人（或 AI）可以替你在本站下单。它<b>不能</b>用来登录 LINUX DO，也碰不到任何真实资金。不想用了随时删除或重新生成，旧 Key 立刻失效。不要公开发到网上。</div></details>
  ${keyHtml}<div id="k-show"></div>
  <h3>给 AI 的使用说明</h3>
  <p>最省事的做法：把下面这段话连同 Key 一起发给你的 AI。</p>
  <pre id="ai-prompt">你可以通过 HTTP API 操作我在「虚拟币模拟盘」的模拟账户（虚拟资金，无真实风险）。
完整文档：${host}/api.md （请先阅读）
认证：请求头 Authorization: Bearer &lt;我的 API Key&gt;
常用：GET ${host}/api/v1/me 查看账户；GET ${host}/api/v1/market/ticker 查看所有币价；
POST ${host}/api/v1/order 现货下单；POST ${host}/api/v1/perp/open 开合约。
POST ${host}/api/v1/loan 无息借贷 {amt}；POST ${host}/api/v1/loan/repay 还款 {amt}。</pre>
  <button class="btn-g" id="copy-prompt">复制这段话</button>
  <h3>接口一览</h3>
  <table class="api-ep"><tr><th>接口</th><th>说明</th></tr>
  <tr><td>GET /api/v1/market/symbols</td><td>支持的币种、手续费、最大杠杆（无需 Key）</td></tr>
  <tr><td>GET /api/v1/market/ticker?sym=BTC</td><td>最新价、买一卖一、24h 涨跌（无需 Key）</td></tr>
  <tr><td>GET /api/v1/market/kline?sym=BTC&amp;tf=1h</td><td>K 线，tf：1m 5m 15m 1h 4h 1d 1w（无需 Key）</td></tr>
  <tr><td>GET /api/v1/market/depth?sym=BTC</td><td>盘口前 20 档（无需 Key）</td></tr>
  <tr><td>GET /api/v1/market/trades?sym=BTC</td><td>最近 50 笔成交（无需 Key）</td></tr>
  <tr><td>GET /api/v1/me</td><td>余额、持仓均价、挂单、合约持仓、总资产、排名</td></tr>
  <tr><td>POST /api/v1/order</td><td>现货下单 {sym, side:buy|sell, type:market|limit, amt|qty, px}</td></tr>
  <tr><td>POST /api/v1/cancel · /cancel_all</td><td>撤单 {id} · 全部撤单 {sym?}</td></tr>
  <tr><td>GET /api/v1/orders?status=done</td><td>历史委托，支持 sym / limit / before 分页</td></tr>
  <tr><td>POST /api/v1/perp/open</td><td>开合约 {sym, side:long|short, lev:1-400, margin, tp?, sl?}</td></tr>
  <tr><td>POST /api/v1/perp/close</td><td>平仓 {id, pct?}，pct 默认 100</td></tr>
  <tr><td>POST /api/v1/perp/tpsl</td><td>修改止盈止损 {id, tp, sl}</td></tr>
  <tr><td>GET /api/v1/perp/positions?status=open|closed</td><td>合约持仓 / 历史</td></tr>
  <tr><td>GET /api/v1/equity · /leaderboard</td><td>收益曲线 · 排行榜</td></tr>
  <tr><td>GET /api/v1/loan</td><td>当前欠款与借贷记录（无利息）</td></tr>
  <tr><td>POST /api/v1/loan · /loan/repay</td><td>借款 {amt}（≤1000 万/笔）· 还款 {amt}</td></tr></table>
  <h3>示例</h3>
  <pre># 查看账户
curl -H "Authorization: Bearer $KEY" ${host}/api/v1/me

# 市价花 1000 USDT 买 BTC
curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\
  -d '{"sym":"BTC","side":"buy","type":"market","amt":1000}' ${host}/api/v1/order

# 10 倍杠杆用 500 USDT 保证金开空 ETH，止损 3000
curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\
  -d '{"sym":"ETH","side":"short","lev":10,"margin":500,"sl":3000}' ${host}/api/v1/perp/open</pre>
  <p class="mut">限频：每个账户下单约 1 次/秒（可短时连发 5 次），每个 IP 约 8 次/秒。市价单按服务端收到请求后的下一笔行情成交。完整说明见 <a href="/api.md" target="_blank">/api.md</a>。</p>`;
  const kn = $('#k-new'); if (kn) kn.onclick = async () => { if (kn.textContent === '重新生成' && !confirm('重新生成后旧 Key 立即失效，确定？')) return; try { const r = await api('apikey', {}); await renderApi(); $('#k-show').innerHTML = `<div class="warn" style="background:rgba(240,185,11,.1);color:var(--y)">新 Key 只显示这一次，请马上复制保存：<div class="keybox"><code id="k-val">${esc(r.key)}</code><button class="btn-g" id="k-copy">复制</button></div></div>`; $('#k-copy').onclick = () => copy(r.key) } catch (e) { toast(e.message, 'err') } };
  const kd = $('#k-del'); if (kd) kd.onclick = async () => { if (!confirm('删除后使用这个 Key 的 AI 将无法再操作，确定？')) return; await api('apikey/revoke', {}); toast('已删除'); renderApi() };
  $('#copy-prompt').onclick = () => copy($('#ai-prompt').textContent);
}
function copy(t) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('已复制')).catch(() => { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); toast('已复制') }) }

/* ================= 轮询 ================= */
let tickBusy = false;
async function loadTick() {
  if (tickBusy || document.hidden) return; tickBusy = true;
  try {
    const j = await (await fetch('/data/ticker.json', { cache: 'no-store' })).json();
    S.tick = j.p; S.swap = j.swap || {}; S.psyms = j.psyms || []; const first = !S.syms.length; S.syms = j.syms || Object.keys(j.p);
    if (!S.inst) { S.inst = {}; fetch('/data/instruments.json', { cache: 'no-store' }).then(r => r.json()).then(x => { S.inst = x; renderMarkets(); renderSymbar(); applyBars() }).catch(() => { S.inst = null }) }
    if (first && !S.syms.includes(S.sym)) S.sym = 'BTC';
    if (typeof TUT !== 'undefined') TUT.onTick();
    if (first) { setSym(S.sym, true) } else { renderMarkets(); renderSymbar(); liveBar(); if (S.view === 'trade') { calcSpot(); calcPerp(); if (!S.pxTouched) renderForm() } }
  } catch (e) { } finally { tickBusy = false }
}
/* ================= 借贷（无利息） ================= */
function openLoan() {
  if (document.body.classList.contains('guest')) return;
  openLoanModal(0);
}
function openLoanModal(need) {
  if (document.querySelector('.loan-modal')) return;
  api('loan').then(d => {
    const box = document.createElement('div'); box.className = 'modal loan-modal';
    box.innerHTML = `<div class="modal-c"><h3>💰 借贷（无利息）</h3>
      <p class="mut">当前欠款 <b class="num ${d.debt > 0 ? 'dn' : ''}">${fu(d.debt)}</b> USDT。<b>借多久都不收利息</b>，随时可还。欠款从总资产里扣除，借来的钱亏掉会让<b>收益率跌破 −100%</b>。</p>
      <div class="field"><label>借多少</label><input id="ln-amt" inputmode="decimal" value="${Math.max(1, Math.round(need || 0))}"><span>USDT</span></div>
      <div class="pct-btns ln-quick"><button data-a="10000">1万</button><button data-a="100000">10万</button><button data-a="1000000">100万</button><button data-a="5000000">500万</button></div>
      <button class="btn-y" id="ln-go" style="width:100%;padding:10px">确认借贷</button>
      ${d.debt > 0 ? `<button class="btn-g" id="ln-repay" style="width:100%;margin-top:8px;padding:8px">还款 ${fu(d.debt)} USDT（全部还清）</button>` : ''}
      ${d.items && d.items.length ? `<div class="ln-hist"><b>最近借贷记录</b>${d.items.slice(0, 6).map(x => `<div><span class="mut">${ftime(x.ts * 1000, 1)}</span><span class="num ${x.amt >= 0 ? 'up' : 'dn'}">${x.amt >= 0 ? '+' : ''}${fu(x.amt)}</span></div>`).join('')}</div>` : ''}
      <button class="btn-g" id="ln-close" style="width:100%;margin-top:8px;padding:8px">关闭</button></div>`;
    document.body.appendChild(box);
    const amtEl = box.querySelector('#ln-amt');
    box.querySelectorAll('.ln-quick [data-a]').forEach(b => b.onclick = () => { amtEl.value = b.dataset.a; amtEl.focus() });
    box.querySelector('#ln-close').onclick = () => box.remove();
    box.querySelector('#ln-go').onclick = async () => {
      const amt = +amtEl.value; if (!(amt >= 1)) { toast('请输入借款金额', 'err'); return }
      try { await api('loan', { amt }); toast(`已借入 ${fu(amt)} USDT（无利息）`); box.remove(); S.hist = S.phist = null; loadMe() } catch (e) { toast(e.message, 'err') }
    };
    const rp = box.querySelector('#ln-repay');
    if (rp) rp.onclick = async () => {
      try { const r = await api('loan/repay', { amt: d.debt }); toast(`已还清 ${fu(r.amt)} USDT`); box.remove(); S.hist = S.phist = null; loadMe() }
      catch (e) { if (e.code === 'need_loan') toast('可用余额不够还款', 'err'); else toast(e.message, 'err') }
    };
  }).catch(e => toast(e.message, 'err'));
}

/* ================= 更新公告：所有登录用户显示，点“确认”后同账号不再显示 ================= */
const ANN_VER = 1;
const ANN_ITEMS = [
  '<b>借贷功能上线</b>：钱不够下单不再报“余额不足”，会直接弹出借贷窗口；顶部新增<b>借贷</b>按钮，随借随还，<b>没有利息</b>。',
  '<b>欠款计入收益</b>：借来的钱亏掉后欠款会一直记着，<b>收益率会跌破 −100%</b>；排行榜按净资产（总资产 − 欠款）排名，允许“倒欠”。',
  '<b>互动教程新增第 10 章《借贷：没钱了怎么办》</b>，新手指南同步补充借贷与欠款说明。',
  '<b>AI 接口</b>新增 <code>/api/v1/loan</code> 系列接口（借款/还款/记录），把 Key 交给 AI 也能借钱。'
];
function showAnn() {
  if (!S.me || S.me.tutorial || (S.me.ann || 0) >= ANN_VER || document.querySelector('.modal')) return;
  const d = document.createElement('div'); d.className = 'modal';
  d.innerHTML = `<div class="modal-c"><h3>📣 本次更新</h3><ul class="ann-list">${ANN_ITEMS.map(x => `<li>${x}</li>`).join('')}</ul><button class="btn-y ann-ok">确认</button></div>`;
  document.body.appendChild(d);
  const ok = d.querySelector('.ann-ok');
  ok.onclick = async () => {
    ok.disabled = true;
    try { await api('ann', { v: ANN_VER }); S.me.ann = ANN_VER; d.remove() }
    catch (e) { ok.disabled = false; toast('保存失败，请稍后重试：' + e.message, 'err') }
  };
}
function showWelcome() {
  if (LS.get('tut_seen', false) || document.querySelector('.modal')) return;
  LS.set('tut_seen', true); const d = document.createElement('div'); d.className = 'modal';
  d.innerHTML = `<div class="modal-c"><h3>第一次来？想怎么开始？</h3><div class="m-opts">
    <button class="btn-y" data-m="go"><b>从零开始学</b><small>互动教程，从一个币、两个按钮开始，用本地练习资金，不影响账户</small></button>
    <button class="btn-g" data-m="api"><b>我不想学炒币，只要 API 接口</b><small>直接去生成 API Key，看接口文档，交给 AI 或程序调用</small></button>
    <button class="btn-g" data-m="no"><b>我会，直接用</b><small>以后可以在“新手指南”里打开教程</small></button></div></div>`;
  document.body.appendChild(d); d.onclick = e => { const b = e.target.closest('[data-m]'), m = b && b.dataset.m; if (m || e.target === d) { d.remove(); if (m === 'go') TUT.go('zero', 0); if (m === 'api') location.hash = '#/api' } };
}
function renderAll() { renderUser(); renderForm(); renderRecords(); renderAssets() }

window.addEventListener('DOMContentLoaded', () => {
initTips(); initChart();
$$('#tfs button').forEach(b => b.classList.toggle('on', b.dataset.tf === S.tf));
setMode(S.mode); setLev(LS.get('lev', 20)); $('#lev').addEventListener('change', () => LS.set('lev', lev())); $('#lev-r').addEventListener('change', () => LS.set('lev', lev()));
$('#v-trade').dataset.pane = 'form';
route(); loadTick().then(loadMe);

setInterval(loadTick, 1500);
setInterval(loadBook, 2000);
setInterval(loadTrades, 3000);
setInterval(() => { if (S.me) loadMe() }, 4000);
setInterval(() => { if (S.view === 'trade') loadKline(true) }, 60000);
setInterval(() => { if (S.view === 'rank') loadRank() }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { loadTick(); loadMe(); loadKline(true) } });
});

