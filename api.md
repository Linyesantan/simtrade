# 虚拟币模拟盘 API（给 AI / 脚本用）

Base URL: `https://your-domain.com/api/v1` (或本地 `http://127.0.0.1:8300/api/v1`)
所有资金均为虚拟资金（初始 1,000,000 USDT），不能充值或提现，无真实风险。

## 认证
- 公共行情接口（`/market/*`、`/leaderboard`）无需认证。
- 账户与交易接口需要请求头：`Authorization: Bearer <API_KEY>`。
- API Key 由用户在网页「AI 接口」页登录 LINUX DO 后生成；一个账户同时只有一个 Key，重新生成后旧 Key 立即失效。
- 请求体一律 JSON：`Content-Type: application/json`。错误时返回非 2xx 和 `{"error": "原因"}`。

## 交易规则（与 OKX 一致，服务端权威，客户端无法指定成交价）
- `sym` 传 `BTC`、`BTC-USDT`、`BTCUSDT` 均可。现货列表 `symbols`，有永续合约的列表 `perp_symbols`（见 `/market/symbols`）。
- 行情：现货来自 OKX 现货，合约来自 **OKX USDT 永续合约**（价格、盘口、K 线、标记价、资金费率都是 OKX 实时数据）。服务端约每 1.5 秒刷新。
- 下单精度：数量按 OKX 的 `lot`（最小变动）向下取整，必须 ≥ `min`；限价按 `tick` 取整。合约的 `lot/min` 已换算成币的数量。详见 `/market/symbols` 的 `instruments`。
- 手续费（OKX 普通用户费率）：现货 挂单 0.08% / 吃单 0.10%；合约 挂单 0.02% / 吃单 0.05%。市价单、以及下单时就能立刻成交的限价单部分为吃单；挂在盘口等待成交的限价单为挂单。
- 市价单：用服务端在**收到请求之后**抓取的 OKX 真实盘口（100 档）逐档成交，大单有滑点；超过盘口深度会被拒绝（返回错误，请分批）。
- 限价单：能立刻成交的部分按盘口逐档以吃单成交（不劣于限价），剩余部分挂单；挂单在 卖一 ≤ 买价 或 最新价 < 买价 时（卖单反之）按限价以挂单成交。限价必须在现价 ±50% 内；最多 20 个现货挂单、20 个合约挂单。
- 合约（逐仓）：杠杆 1–400；保证金 × 杠杆 = 仓位价值；用 OKX 标记价计算未实现盈亏和强平：保证金 + 未实现盈亏 ≤ 仓位价值 × min(0.4%, 0.4/杠杆) 即强平，损失该仓位全部保证金；止盈止损按最新价触发、按买一/卖一平仓；最多 20 个持仓。
- 资金费：按 OKX 实时资金费率，在每个合约自己的结算时刻（多数每 8 小时）对当时持有的仓位收付：金额 = 数量 × 标记价 × 费率，费率为正多头付、空头收，直接计入该仓位保证金。
- 限频：每账户下单/开平仓约 1 次/秒（可连发 5 次），每 IP 约 8 次/秒；超限返回 429。

## 行情（无需认证）
| 方法 | 路径 | 参数 | 返回 |
|---|---|---|---|
| GET | /market/symbols | – | `symbols`、`perp_symbols`、`fees`、`instruments`（tick/lot/min）、`max_lev`、`kline_tf` |
| GET | /market/funding | – | 各合约当前资金费率 `rate` 与下次结算时间 `next`（毫秒） |
| GET | /market/ticker | `sym`（可选），`type`=spot/swap | `bid` `ask` `last` `chg`(24h 涨跌比例) `o` `h` `l` `v`(24h USDT 成交额) |
| GET | /market/kline | `sym`，`type`=spot/swap，`tf`=1m/5m/15m/1h/4h/1d/1w | `k`: `[[t毫秒, 开, 高, 低, 收, 成交量], ...]`，时间升序，最多 300 根 |
| GET | /market/depth | `sym`，`type`=spot/swap | `asks`/`bids`: `[[价格, 数量], ...]` 前 20 档 |
| GET | /market/trades | `sym`，`type`=spot/swap | `trades`: `[[t毫秒, 价格, 数量, "buy"/"sell"], ...]` 最近 50 笔 |
| GET | /leaderboard | – | 前 100 名：`r` 排名、`n` 用户名、`eq` 总资产、`pct` 收益率% |

## 账户
### GET /me
返回：`porders` 合约挂单；`bal` `{资产: [可用, 冻结]}`；`cost` `{币种: 持仓总成本 USDT}`（均价 = cost / 数量）；`open` 当前挂单；`hist` 最近 30 条已完成委托；`positions` 合约持仓（含 `mark` `upnl` `roe` `liq`）；`equity` 总资产；`rank`/`total` 排名。

### GET /orders
参数：`status`=open/filled/cancelled/done/all（默认 all），`sym`，`limit`（≤200，默认 50），`before`（订单 id，用于翻页）。

### GET /equity
收益曲线 `points`: `[[unix秒, 总资产], ...]`（约每 15 分钟一个点）。

## 现货交易
### POST /order
```json
{"sym":"BTC","side":"buy","type":"market","amt":1000}     // 市价买：花 1000 USDT（含手续费）
{"sym":"BTC","side":"buy","type":"market","qty":0.01}     // 市价买：买 0.01 BTC
{"sym":"BTC","side":"sell","type":"market","qty":0.01}    // 市价卖
{"sym":"BTC","side":"buy","type":"limit","qty":0.01,"px":80000}  // 限价买
```
返回：市价 `{"status":"filled","fpx":成交价,"qty":数量}`；限价 `{"status":"open","id":订单id}`。

### POST /cancel  `{"id": 订单id}`
### POST /cancel_all  `{"sym": "BTC"}`（sym 可省略，撤全部）

## 合约交易
### POST /perp/open
```json
{"sym":"ETH","side":"long","lev":10,"margin":500,"tp":3200,"sl":2400}
{"sym":"ETH","side":"short","type":"limit","px":2700,"lev":5,"margin":300}
```
`side`=long（看涨）/short（看跌）；`type`=market（默认）/limit（需 `px`）；`margin` 为投入的保证金 USDT，仓位价值 = margin × lev；`tp`/`sl` 可选。
返回：市价 `status=filled`、`id` 持仓 id、`entry` 成交均价、`qty`、`fee`、`liq` 强平价、`slippage`；限价未成交 `status=open`、`order_id`；部分成交 `status=partial` 两者都有。

### POST /perp/cancel  `{"id": 委托id}` 或 `{"all": true}`
### GET /perp/orders  `?status=open|done` 合约限价委托
### GET /perp/funding  资金费收付记录（`amount` 正为收入）

### POST /perp/close  `{"id": 持仓id, "pct": 50}`（pct 默认 100 全平）
返回：`px` 平仓价、`pnl` 已实现盈亏（已扣手续费）。

### POST /perp/tpsl  `{"id": 持仓id, "tp": 3300, "sl": null}`（传 null 或 0 取消）

### GET /perp/positions  `?status=open|closed`

## 示例
```bash
KEY=sk-sim-xxxx
curl -s https://your-domain.com/api/v1/market/ticker?sym=BTC
curl -s -H "Authorization: Bearer $KEY" https://your-domain.com/api/v1/me
curl -s -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"sym":"SOL","side":"long","lev":5,"margin":200}' https://your-domain.com/api/v1/perp/open
```

## 给 AI 的建议
- 下单前先 `GET /me` 确认可用余额，`GET /market/ticker` 确认价格。
- 不要高频轮询：行情约 1.5 秒更新一次，账户信息 2–5 秒查一次足够。
- 高杠杆（≥100x）极易在几秒内被强平，且开仓手续费占保证金比例很高。
