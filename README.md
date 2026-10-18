# SimTrade 虚拟币模拟交易平台

一个专为极客与量化社区打造的轻量级虚拟币模拟交易与排行榜系统。支持现货交易、OKX 永续合约逐仓、杠杆爆仓清算、止盈止损、每 8 小时资金费率结算与实时财富排行榜。

基于服务端权威撮合逻辑与 OKX 实时深度盘口，杜绝本地报假价与延迟套利。

---

## ✨ 核心特性

- **权威真实撮合**：
  - 行情直连 OKX 公开接口，支持现货与 USDT 永续合约；
  - 市价单使用接收订单后抓取的 OKX 实时订单簿（100 档盘口）逐档吃单撮合，超深度自动拒单；
  - 强制防抢跑：市价与限价委托严格基于到达服务端之后的最新行情（Next-Tick）撮合，杜绝提前抓取过期货值套利。
- **完善的衍生品交易**：
  - 支持 1x - 100x 逐仓永续合约；
  - 标记价格强平清算系统；
  - 止盈（TP）与止损（SL）条件单支持，支持移动止损（Trailing Stop）锁盈；
  - 真实跟随 OKX 资金费率周期（每 8 小时）对持仓保证金自动结算。
- **极简极轻架构**：
  - 后端为单文件 Python（仅依赖 Python 3 标准库，无重型框架依赖，启动毫秒级，内存仅占用 ~150MB）；
  - 存储使用轻量级 SQLite WAL 高性能并发模式；
  - 前端原生 JavaScript + CSS，集成 TradingView Lightweight Charts (4.2.3) 本地化图表。
- **社区生态集成**：
  - 原生支持 **LINUX DO Connect** OAuth 授权登录（支持校验用户信任等级 TL）；
  - 支持 **NodeLoc** 论坛 OAuth 登录；
  - 支持生成 API Key（Bearer Token），方便接入 AI Agent 或量化交易脚本。
- **零基础互动教程**：
  - 内置纯前端练习沙盒引擎，零基础用户可在独立本地沙盒资金中体验现货买卖、杠杆爆仓与止盈止损。

---

## 🛠️ 项目结构

```text
.
├── server.py             # 核心后端：撮合引擎、OKX 代理抓取、OAuth、API 接口与数据库
├── index.html            # 单页应用（SPA）前端结构
├── app.js                # 前端交互与交易业务逻辑
├── app.css               # 紧凑暗黑科技风终端样式
├── coins.js              # 币种与衍生品定义
├── tutorial.js           # 互动教学模式沙盒逻辑
├── lib/lwc.js            # TradingView Lightweight Charts 图表库
├── api.md                # 完整的 RESTful API 文档
├── llms.txt              # 适合 AI Agent 读取的系统接口摘要
├── nginx.conf            # Nginx 生产环境反向代理与缓存配置
├── simtrade.service      # Linux Systemd 服务单元文件
├── .env.example          # 环境变量配置模板
└── README.md
```

---

## 🚀 快速启动

### 1. 环境准备
- Linux / macOS / Windows
- Python 3.10+
- （生产环境推荐）Nginx 反向代理与 SQLite3

### 2. 配置环境变量
复制 `.env.example` 并按需自定义配置：
```bash
cp .env.example .env
```
常见配置项说明（**全部支持环境变量自定义，不写死任何参数**）：

| 变量名 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `8300` | 后端服务监听端口 |
| `PUBLIC_URL` | `http://127.0.0.1:8300` | 外部可访问的完整 URL，生产环境如 `https://your-domain.com` |
| `INIT_CAPITAL` | `1000000.0` | **初始虚拟资金 (USDT)**：新注册用户发放的虚拟资金额度 |
| `MAX_LEV` | `400` | **永续合约最大杠杆倍数**（如设定为 `20`、`50`、`100` 等） |
| `MAX_POS` | `20` | 单用户最大持仓数量上限 |
| `MAX_OPEN` | `20` | 单用户最大未成交挂单数量上限 |
| `SPOT_MAKER` / `SPOT_TAKER` | `0.0008` / `0.001` | 现货挂单 / 吃单手续费率（小数，`0.001` 即 0.1%） |
| `SWAP_MAKER` / `SWAP_TAKER` | `0.0002` / `0.0005` | 合约挂单 / 吃单手续费率 |
| `MIN_NOTIONAL` | `1.0` | 单笔交易最小货值金额 (USDT) |
| `TICK_INTERVAL` | `1.5` | 行情轮询抓取间隔（秒） |
| `LB_INTERVAL` | `30` | 排行榜估值重新计算周期（秒） |
| `LD_CLIENT_ID` / `LD_CLIENT_SECRET` | 空 | LINUX DO Connect OAuth 应用凭据（[connect.linux.do](https://connect.linux.do/) 申请，回调填 `/api/auth/callback`） |
| `LD_MIN_TL` | `1` | 允许参与交易的最低 LINUX DO 信任等级（Trust Level，防小号刷榜） |
| `NL_CLIENT_ID` / `NL_CLIENT_SECRET` | 空 | NodeLoc 论坛 OAuth 应用凭据（可选，回调填 `/api/auth/nodeloc/callback`） |

### 3. 运行服务
可以直接启动后端服务：
```bash
python3 server.py
```
默认会在本地 `127.0.0.1:8300` 启动服务，并在当前目录创建 SQLite 数据库。

---

## 🌐 生产部署建议 (Nginx + Systemd)

1. **配置 Systemd 服务**：
   修改 `simtrade.service` 中的路径与环境变量文件指向，复制到 `/etc/systemd/system/simtrade.service`：
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now simtrade
   ```

2. **Nginx 反代配置**：
   参考 `nginx.conf`，将静态前端文件交由 Nginx 托管，API 接口反代到 `http://127.0.0.1:8300`。

---

## 🤖 API & 量化调用

每个登录用户可在个人面板中生成 `sk-sim-...` API 密钥，并通过 HTTP Bearer 认证执行自动化交易。详细接口规范可查阅 [`api.md`](./api.md) 或面向 LLM 的 [`llms.txt`](./llms.txt)。

---

## 📄 开源许可

本项目基于 [MIT License](./LICENSE) 协议开源。
