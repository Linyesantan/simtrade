#!/usr/bin/env python3
"""SimTrade: server-authoritative crypto paper trading with leaderboard.
Stdlib only (Python 3.9+). Prices from OKX public REST. Static files served by nginx.
"""
import base64, gzip, urllib.parse, hashlib, hmac, json, logging, math, os, re, secrets, sqlite3, threading, time, urllib.request
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from http.cookies import SimpleCookie

DATA_DIR = os.environ.get('SIM_DATA', '/var/lib/simtrade')
WWW_DATA = os.environ.get('SIM_WWW_DATA', '/var/www/aws/data')
LISTEN = os.environ.get('SIM_LISTEN', '127.0.0.1:8300')
CAND = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE', 'ADA', 'TRX', 'TON', 'AVAX', 'LINK', 'DOT', 'LTC', 'BCH', 'SHIB',
        'NEAR', 'UNI', 'APT', 'SUI', 'ARB', 'OP', 'PEPE', 'ATOM', 'FIL', 'ETC', 'XLM', 'ICP', 'HBAR', 'AAVE', 'INJ',
        'WLD', 'TIA', 'SEI', 'ONDO', 'TRUMP', 'HYPE', 'BTW']
SYMS = list(CAND)  # narrowed to what OKX actually lists after the first fetch
QUOTE = 'USDT'
GATE_SPOT = {'BTW': 'BTW_USDT'}   # OKX 无现货、改走 Gate 现货行情的币：sym -> Gate currency_pair
GATE_FUT = {'BTW': 'BTW_USDT'}    # OKX 无永续、改走 Gate 合约行情的币：sym -> Gate contract
INIT = float(os.environ.get('INIT_CAPITAL', os.environ.get('SIM_INIT_BALANCE', 1000000.0)))
SPOT_MAKER = float(os.environ.get('SPOT_MAKER', 0.0008))    # OKX regular-user spot fees
SPOT_TAKER = float(os.environ.get('SPOT_TAKER', 0.001))
SWAP_MAKER = float(os.environ.get('SWAP_MAKER', 0.0002))   # OKX regular-user USDT-swap fees
SWAP_TAKER = float(os.environ.get('SWAP_TAKER', 0.0005))
FEE = SPOT_TAKER
TICK_INTERVAL = float(os.environ.get('TICK_INTERVAL', 1.5))
MIN_NOTIONAL = float(os.environ.get('MIN_NOTIONAL', 1.0))
MAX_OPEN = int(os.environ.get('MAX_OPEN', 20))
SESSION_DAYS = int(os.environ.get('SESSION_DAYS', 30))
LB_INTERVAL = float(os.environ.get('LB_INTERVAL', 30))
LD_CLIENT_ID = os.environ.get('LD_CLIENT_ID', '')
LD_CLIENT_SECRET = os.environ.get('LD_CLIENT_SECRET', '')
PUBLIC_URL = os.environ.get('PUBLIC_URL', 'http://127.0.0.1:8300').rstrip('/')
CK = '; HttpOnly; SameSite=Lax' + ('; Secure' if PUBLIC_URL.startswith('https') else '')
LD_MIN_TL = int(os.environ.get('LD_MIN_TL', '1'))
LD_AUTH = 'https://connect.linux.do/oauth2/authorize'
LD_TOKEN = 'https://connect.linux.do/oauth2/token'
LD_USER = 'https://connect.linux.do/api/user'
NL_CLIENT_ID = os.environ.get('NL_CLIENT_ID', '')
NL_CLIENT_SECRET = os.environ.get('NL_CLIENT_SECRET', '')
NL_MIN_TL = int(os.environ.get('NL_MIN_TL', '0'))
NL_AUTH = 'https://www.nodeloc.com/oauth-provider/authorize'
NL_TOKEN = 'https://www.nodeloc.com/oauth-provider/token'
NL_USER = 'https://www.nodeloc.com/oauth-provider/userinfo'

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('sim')
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(WWW_DATA, exist_ok=True)

_sf = os.path.join(DATA_DIR, 'secret')
if not os.path.exists(_sf):
    with open(_sf, 'wb') as f:
        f.write(secrets.token_bytes(32))
    os.chmod(_sf, 0o600)
SECRET = open(_sf, 'rb').read()

DBL = threading.RLock()
db = sqlite3.connect(os.path.join(DATA_DIR, 'sim.db'), check_same_thread=False, isolation_level=None)
db.execute('PRAGMA journal_mode=WAL')
db.execute('PRAGMA synchronous=NORMAL')
db.executescript('''
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, ld_id INTEGER UNIQUE, name TEXT, tl INTEGER, avatar TEXT, ip TEXT, created REAL, last_login REAL);
CREATE TABLE IF NOT EXISTS bal(uid INTEGER, asset TEXT, free REAL, locked REAL, PRIMARY KEY(uid, asset));
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY, uid INTEGER, sym TEXT, side TEXT, type TEXT, qty REAL, px REAL,
  status TEXT, fill_px REAL, fee REAL, created REAL, done REAL);
CREATE INDEX IF NOT EXISTS o_uid ON orders(uid, id);
CREATE INDEX IF NOT EXISTS o_open ON orders(status, type);
CREATE TABLE IF NOT EXISTS sessions(th BLOB PRIMARY KEY, uid INTEGER, exp REAL);
CREATE TABLE IF NOT EXISTS apikeys(th BLOB PRIMARY KEY, uid INTEGER UNIQUE, prefix TEXT, created REAL);
CREATE TABLE IF NOT EXISTS eqh(uid INTEGER, ts INTEGER, eq REAL);
CREATE TABLE IF NOT EXISTS positions(id INTEGER PRIMARY KEY, uid INTEGER, sym TEXT, side TEXT, lev INTEGER, qty REAL, entry REAL,
  margin REAL, tp REAL, sl REAL, opened REAL, status TEXT, close_px REAL, pnl REAL, closed REAL, fee REAL DEFAULT 0);
CREATE INDEX IF NOT EXISTS p_open ON positions(status, uid);
CREATE INDEX IF NOT EXISTS eqh_uid ON eqh(uid, ts);
CREATE TABLE IF NOT EXISTS porders(id INTEGER PRIMARY KEY, uid INTEGER, sym TEXT, side TEXT, lev INTEGER, qty REAL, px REAL,
  margin REAL, tp REAL, sl REAL, locked REAL, created REAL, status TEXT, done REAL);
CREATE INDEX IF NOT EXISTS po_open ON porders(status, uid);
CREATE TABLE IF NOT EXISTS funding(id INTEGER PRIMARY KEY, uid INTEGER, pos_id INTEGER, sym TEXT, side TEXT, rate REAL, amount REAL, ts REAL);
CREATE INDEX IF NOT EXISTS f_uid ON funding(uid, id);
CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT);
''')
try:
    db.execute('ALTER TABLE users ADD COLUMN nl_id INTEGER')
except Exception:
    pass
db.execute('CREATE UNIQUE INDEX IF NOT EXISTS users_nl ON users(nl_id)')
for _col in ('ALTER TABLE users ADD COLUMN last_seen REAL', 'ALTER TABLE orders ADD COLUMN locked REAL', 'ALTER TABLE orders ADD COLUMN liq TEXT',
             'ALTER TABLE positions ADD COLUMN funding REAL DEFAULT 0', 'ALTER TABLE positions ADD COLUMN net REAL', 'ALTER TABLE bal ADD COLUMN cost REAL NOT NULL DEFAULT 0'):
    try:
        db.execute(_col)
        if 'cost' in _col:  # one-time backfill of cost basis from fill history
            _h = {}
            for uid, sym, side, qty, fpx, fee in db.execute("SELECT uid,sym,side,qty,fill_px,fee FROM orders WHERE status='filled' ORDER BY done"):
                q, c = _h.get((uid, sym), (0.0, 0.0))
                if side == 'buy':
                    q, c = q + qty, c + qty * fpx + (fee or 0)
                elif q > 0:
                    c, q = c * max(0.0, 1 - qty / q), max(0.0, q - qty)
                _h[(uid, sym)] = (q, c)
            for (uid, sym), (q, c) in _h.items():
                db.execute('UPDATE bal SET cost=? WHERE uid=? AND asset=?', (c, uid, sym))
    except sqlite3.OperationalError:
        pass


def tx(fn):
    """Run fn() inside one locked transaction."""
    with DBL:
        db.execute('BEGIN IMMEDIATE')
        try:
            r = fn()
            db.execute('COMMIT')
            return r
        except Exception:
            db.execute('ROLLBACK')
            raise


# ---------------- prices ----------------# ---------------- rate limits / pow / auth ----------------
_buckets = {}
_bl = threading.Lock()


def allow(key, rate, burst):
    now = time.time()
    with _bl:
        tok, last = _buckets.get(key, (burst, now))
        tok = min(burst, tok + (now - last) * rate)
        if tok < 1:
            _buckets[key] = (tok, now)
            return False
        _buckets[key] = (tok - 1, now)
        if len(_buckets) > 200000:
            _buckets.clear()
        return True


class Redirect:
    def __init__(self, loc, cookies=()):
        self.loc, self.cookies = loc, list(cookies)


class Cached:
    """Public market response that nginx/clients may cache for `age` seconds."""
    def __init__(self, obj, age):
        self.obj, self.age = obj, age


class ApiError(Exception):
    def __init__(self, msg, code=400):
        super().__init__(msg)
        self.code = code


def num(v, name):
    try:
        x = float(v)
    except Exception:
        raise ApiError(name + '无效')
    if not math.isfinite(x) or x <= 0 or x > 1e12:
        raise ApiError(name + '无效')
    return x


class H(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    server_version = 'sim'

    def log_message(self, *a):
        pass

    def ip(self):
        return self.headers.get('X-Real-IP') or self.client_address[0]

    def redirect(self, loc, cookies=()):
        self.send_response(302)
        self.send_header('Location', loc)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', '0')
        for c in cookies:
            self.send_header('Set-Cookie', c)
        self.end_headers()

    def send(self, obj, code=200, cookie=None, age=0):
        b = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'public, max-age=%d' % age if age else 'no-store')
        self.send_header('Content-Length', str(len(b)))
        if cookie is not None:
            self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(b)

    def body(self):
        if self._raw is None:
            raise ApiError('请求过大')
        try:
            return json.loads(self._raw or b'{}')
        except Exception:
            raise ApiError('JSON 无效')

    def uid(self, required=True):
        self.via_key = False
        auth = self.headers.get('Authorization') or ''
        if auth[:7].lower() == 'bearer ':
            key = auth[7:].strip()
            th = hashlib.sha256(key.encode()).digest()
            with DBL:
                r = db.execute('SELECT uid FROM apikeys WHERE th=?', (th,)).fetchone()
            if not r:
                raise ApiError('API Key 无效', 401)
            self.via_key = True
            return r[0]
        c = SimpleCookie(self.headers.get('Cookie') or '')
        tok = c['sid'].value if 'sid' in c else ''
        if tok:
            th = hashlib.sha256(tok.encode()).digest()
            with DBL:
                r = db.execute('SELECT uid, exp FROM sessions WHERE th=?', (th,)).fetchone()
            if r and r[1] > time.time():
                return r[0]
        if required:
            raise ApiError('请先登录', 401)
        return None

    def handle_api(self, method):
        path = self.path.split('?')[0]
        if not allow(('ip', self.ip()), 8, 30):
            raise ApiError('请求太频繁', 429)
        if path.startswith('/api/v1/'):
            path = '/api/' + path[8:]
        r = ROUTES.get((method, path))
        if not r:
            raise ApiError('not found', 404)
        return r(self)

    def do_GET(self):
        self._run('GET')

    def do_POST(self):
        self._run('POST')

    def _run(self, m):
        # always drain the body first so keep-alive connections stay in sync
        self._raw = b''
        try:
            n = int(self.headers.get('Content-Length') or 0)
        except ValueError:
            n = -1
        if n < 0 or n > 4096:
            self._raw = None
            self.close_connection = True
        elif n:
            self._raw = self.rfile.read(n)
        try:
            res = self.handle_api(m)
            if isinstance(res, Redirect):
                self.redirect(res.loc, res.cookies)
            elif isinstance(res, Cached):
                self.send(res.obj, age=res.age)
            elif isinstance(res, tuple):
                self.send(res[0], cookie=res[1])
            else:
                self.send(res)
        except ApiError as e:
            self.send({'error': str(e)}, e.code)
        except ValueError as e:
            self.send({'error': str(e)}, 400)
        except Exception as e:
            log.exception('api error')
            self.send({'error': '服务器错误'}, 500)


def make_session(uid):
    tok = secrets.token_urlsafe(32)
    th = hashlib.sha256(tok.encode()).digest()
    def run():
        db.execute('DELETE FROM sessions WHERE exp<?', (time.time(),))
        db.execute('INSERT INTO sessions(th,uid,exp) VALUES(?,?,?)', (th, uid, time.time() + SESSION_DAYS * 86400))
    tx(run)
    return ('sid=%s; Path=/; Max-Age=%d' % (tok, SESSION_DAYS * 86400)) + CK


def _http_json(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers=dict({'Accept': 'application/json', 'User-Agent': 'simtrade/1'}, **(headers or {})))
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def r_auth_login(h):
    if not LD_CLIENT_ID:
        raise ApiError('登录未配置', 503)
    state = secrets.token_urlsafe(16)
    q = urllib.parse.urlencode({'response_type': 'code', 'client_id': LD_CLIENT_ID, 'state': state,
                                'redirect_uri': PUBLIC_URL + '/api/auth/callback'})
    return Redirect(LD_AUTH + '?' + q, [('ost=%s; Path=/api/auth; Max-Age=600' % state) + CK])


def r_auth_callback(h):
    if not allow(('login', h.ip()), 0.2, 10):
        raise ApiError('登录尝试太频繁，稍后再试', 429)
    q = urllib.parse.parse_qs(urllib.parse.urlsplit(h.path).query)
    code, state = (q.get('code') or [''])[0], (q.get('state') or [''])[0]
    c = SimpleCookie(h.headers.get('Cookie') or '')
    clear = 'ost=; Path=/api/auth; Max-Age=0' + CK
    if not code or not state or 'ost' not in c or not hmac.compare_digest(c['ost'].value, state):
        return Redirect('/?login=state', [clear])
    try:
        basic = base64.b64encode(('%s:%s' % (LD_CLIENT_ID, LD_CLIENT_SECRET)).encode()).decode()
        tok = _http_json(LD_TOKEN, urllib.parse.urlencode({'grant_type': 'authorization_code', 'code': code,
                                                          'redirect_uri': PUBLIC_URL + '/api/auth/callback'}).encode(),
                         {'Authorization': 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded'})
        u = _http_json(LD_USER, headers={'Authorization': 'Bearer ' + tok['access_token']})
    except Exception as e:
        log.warning('oauth failed: %s', e)
        return Redirect('/?login=fail', [clear])
    ld_id = int(u['id'])
    tl = int(u.get('trust_level') or 0)
    if not u.get('active', True) or u.get('silenced') or tl < LD_MIN_TL:
        return Redirect('/?login=tl', [clear])
    name = str(u.get('username') or ('ld%d' % ld_id))[:32]
    avatar = str(u.get('avatar_template') or '')[:300]
    ip = h.ip()

    def run():
        r = db.execute('SELECT id FROM users WHERE ld_id=?', (ld_id,)).fetchone()
        now = time.time()
        if r:
            db.execute('UPDATE users SET name=?, tl=?, avatar=?, last_login=? WHERE id=?', (name, tl, avatar, now, r[0]))
            return r[0]
        cur = db.execute('INSERT INTO users(ld_id,name,tl,avatar,ip,created,last_login) VALUES(?,?,?,?,?,?,?)',
                         (ld_id, name, tl, avatar, ip, now, now))
        bal_add(cur.lastrowid, QUOTE, INIT, 0)
        return cur.lastrowid
    uid = tx(run)
    return Redirect('/', [clear, make_session(uid)])


def r_nl_login(h):
    if not NL_CLIENT_ID:
        raise ApiError('NodeLoc 登录未配置', 503)
    state = secrets.token_urlsafe(16)
    q = urllib.parse.urlencode({'response_type': 'code', 'client_id': NL_CLIENT_ID, 'state': state, 'scope': 'openid profile',
                                'redirect_uri': PUBLIC_URL + '/api/auth/nodeloc/callback'})
    return Redirect(NL_AUTH + '?' + q, [('ost=%s; Path=/api/auth; Max-Age=600' % state) + CK])


def r_nl_callback(h):
    if not allow(('login', h.ip()), 0.2, 10):
        raise ApiError('登录尝试太频繁，稍后再试', 429)
    q = urllib.parse.parse_qs(urllib.parse.urlsplit(h.path).query)
    code, state = (q.get('code') or [''])[0], (q.get('state') or [''])[0]
    c = SimpleCookie(h.headers.get('Cookie') or '')
    clear = 'ost=; Path=/api/auth; Max-Age=0' + CK
    if not code or not state or 'ost' not in c or not hmac.compare_digest(c['ost'].value, state):
        return Redirect('/?login=state', [clear])
    try:
        tok = _http_json(NL_TOKEN, urllib.parse.urlencode({'grant_type': 'authorization_code', 'code': code,
                                                          'redirect_uri': PUBLIC_URL + '/api/auth/nodeloc/callback',
                                                          'client_id': NL_CLIENT_ID, 'client_secret': NL_CLIENT_SECRET}).encode(),
                         {'Content-Type': 'application/x-www-form-urlencoded'})
        u = _http_json(NL_USER, headers={'Authorization': 'Bearer ' + tok['access_token']})
    except Exception as e:
        log.warning('nodeloc oauth failed: %s', e)
        return Redirect('/?login=fail', [clear])
    nl_id = int(u.get('id') or u.get('sub'))
    tl = int(u.get('trust_level') or 0)
    if tl < NL_MIN_TL:
        return Redirect('/?login=tl', [clear])
    name = str(u.get('username') or u.get('preferred_username') or ('nl%d' % nl_id))[:32]
    avatar = str(u.get('avatar_url') or u.get('picture') or '')[:300]
    ip = h.ip()

    def run():
        r = db.execute('SELECT id FROM users WHERE nl_id=?', (nl_id,)).fetchone()
        now = time.time()
        if r:
            db.execute('UPDATE users SET name=?, tl=?, avatar=?, last_login=? WHERE id=?', (name, tl, avatar, now, r[0]))
            return r[0]
        cur = db.execute('INSERT INTO users(nl_id,name,tl,avatar,ip,created,last_login) VALUES(?,?,?,?,?,?,?)',
                         (nl_id, name, tl, avatar, ip, now, now))
        bal_add(cur.lastrowid, QUOTE, INIT, 0)
        return cur.lastrowid
    uid = tx(run)
    return Redirect('/', [clear, make_session(uid)])


def r_logout(h):
    c = SimpleCookie(h.headers.get('Cookie') or '')
    if 'sid' in c:
        th = hashlib.sha256(c['sid'].value.encode()).digest()
        tx(lambda: db.execute('DELETE FROM sessions WHERE th=?', (th,)))
    return {'ok': True}, 'sid=; Path=/; Max-Age=0' + CK


_seen = {}

# ---------------- OKX access ----------------
def okx_get(path, timeout=5):
    req = urllib.request.Request('https://www.okx.com' + path, headers={'Accept-Encoding': 'gzip', 'User-Agent': 'simtrade/1'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        b = r.read()
        if r.headers.get('Content-Encoding') == 'gzip':
            b = gzip.decompress(b)
    j = json.loads(b)
    if str(j.get('code')) != '0':
        raise RuntimeError('okx %s %s' % (j.get('code'), j.get('msg')))
    return j['data']


def gate_get(path, timeout=5):
    req = urllib.request.Request('https://api.gateio.ws' + path, headers={'Accept-Encoding': 'gzip', 'User-Agent': 'simtrade/1'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        b = r.read()
        if r.headers.get('Content-Encoding') == 'gzip':
            b = gzip.decompress(b)
    j = json.loads(b)
    if isinstance(j, dict) and j.get('label'):
        raise RuntimeError('gate %s %s' % (j.get('label'), j.get('message')))
    return j


def write_json(name, obj):
    p = os.path.join(WWW_DATA, name)
    tmp = p + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(obj, f, separators=(',', ':'))
    os.replace(tmp, p)


def fnum(x, d=0.0):
    try:
        return float(x)
    except (TypeError, ValueError):
        return d


# ---------------- instruments (lot / tick / contract size) ----------------
INST = {'spot': {}, 'swap': {}}
PSYMS = []   # symbols that also have a USDT perpetual on OKX


def load_instruments():
    spot, swap = {}, {}
    for x in okx_get('/api/v5/public/instruments?instType=SPOT', 10):
        b, q = x['instId'].split('-')[0], x.get('quoteCcy')
        if q == QUOTE and b in CAND and x.get('state') == 'live':
            spot[b] = {'tick': fnum(x['tickSz']), 'lot': fnum(x['lotSz']), 'min': fnum(x['minSz'])}
    for x in okx_get('/api/v5/public/instruments?instType=SWAP', 10):
        iid = x['instId']
        if not iid.endswith('-USDT-SWAP') or x.get('ctType') != 'linear' or x.get('state') != 'live':
            continue
        b = iid.split('-')[0]
        if b in CAND and x.get('ctValCcy') == b:
            ct = fnum(x['ctVal'])
            swap[b] = {'tick': fnum(x['tickSz']), 'ct': ct, 'lot': fnum(x['lotSz']) * ct, 'min': fnum(x['minSz']) * ct,
                       'okx_lev': int(fnum(x.get('lever'), 0))}
    for s, pair in GATE_SPOT.items():
        try:
            gi = gate_get('/api/v4/spot/currency_pairs/' + pair)
            if str(gi.get('trade_status')) == 'tradable':
                lot = 10 ** -int(gi.get('amount_precision') or 0)
                spot[s] = {'tick': 10 ** -int(gi.get('precision') or 0), 'lot': lot,
                           'min': fnum(gi.get('min_base_amount')) or lot}
        except Exception as e:
            log.warning('gate instruments %s failed: %s', pair, e)
    for s, contract in GATE_FUT.items():
        try:
            gc = gate_get('/api/v4/futures/usdt/contracts/' + contract)
            if str(gc.get('status')) == 'trading':
                ct = fnum(gc.get('quanto_multiplier'), 1.0)
                swap[s] = {'tick': fnum(gc.get('order_price_round')), 'ct': ct,
                           'lot': (fnum(gc.get('order_size_round')) or 1.0) * ct,
                           'min': fnum(gc.get('order_size_min'), 1.0) * ct,
                           'okx_lev': int(fnum(gc.get('leverage_max'), 0))}
        except Exception as e:
            log.warning('gate fut instruments %s failed: %s', contract, e)
    if spot:
        INST['spot'] = spot
    if swap:
        INST['swap'] = swap
    write_json('instruments.json', {'spot': INST['spot'], 'swap': INST['swap'],
                                    'fees': {'spot': [SPOT_MAKER, SPOT_TAKER], 'swap': [SWAP_MAKER, SWAP_TAKER]}, 'max_lev': MAX_LEV})


def dec_of(step):
    s = ('%.12f' % step).rstrip('0')
    return len(s.split('.')[1]) if '.' in s else 0


def round_step(x, step, mode='down'):
    if not step:
        return x
    n = x / step
    n = math.floor(n + 1e-9) if mode == 'down' else round(n)
    return round(n * step, dec_of(step))


def spec(kind, sym):
    return INST[kind].get(sym) or {'tick': 0, 'lot': 0, 'min': 0, 'ct': 1}


# ---------------- prices ----------------
class PX:
    cond = threading.Condition()
    data = {}     # spot tickers
    swap = {}     # perpetual tickers (+ mark price, funding)
    start = 0.0   # fetch start time of current tick
    ts = 0.0      # time tick became available


FUND = {}         # sym -> {'rate': current-period rate, 'time': settlement ts (s)}


def _tickers(inst_type, suffix):
    out = {}
    for x in okx_get('/api/v5/market/tickers?instType=' + inst_type):
        iid = x.get('instId', '')
        if not iid.endswith(suffix):
            continue
        s = iid[:-len(suffix)]
        if s not in CAND:
            continue
        bid, ask, last, o = fnum(x['bidPx']), fnum(x['askPx']), fnum(x['last']), fnum(x['open24h'])
        if bid > 0 and ask >= bid and last > 0:
            out[s] = {'bid': bid, 'ask': ask, 'last': last, 'chg': (last / o - 1) if o > 0 else 0.0,
                      'o': o, 'h': fnum(x.get('high24h')), 'l': fnum(x.get('low24h')),
                      'v': fnum(x.get('volCcy24h')) if inst_type == 'SPOT' else fnum(x.get('volCcy24h')) * last}
    return out


def fetch_okx():
    spot = _tickers('SPOT', '-' + QUOTE)
    for s, pair in GATE_SPOT.items():
        try:
            t = gate_get('/api/v4/spot/tickers?currency_pair=' + pair)
            t = t[0] if isinstance(t, list) and t else (t or {})
            last, bid, ask = fnum(t.get('last')), fnum(t.get('highest_bid')), fnum(t.get('lowest_ask'))
            if bid > 0 and ask >= bid and last > 0:
                chg = fnum(t.get('change_percentage')) / 100.0
                spot[s] = {'bid': bid, 'ask': ask, 'last': last, 'chg': chg,
                           'o': last / (1 + chg) if chg > -1 else last,
                           'h': fnum(t.get('high_24h')), 'l': fnum(t.get('low_24h')), 'v': fnum(t.get('quote_volume'))}
        except Exception as e:
            log.warning('gate ticker %s failed: %s', pair, e)
    swap = {}
    try:
        swap = _tickers('SWAP', '-USDT-SWAP')
        marks = {x['instId'][:-10]: fnum(x['markPx']) for x in okx_get('/api/v5/public/mark-price?instType=SWAP')
                 if x['instId'].endswith('-USDT-SWAP')}
        for s, v in swap.items():
            v['mark'] = marks.get(s) or (v['bid'] + v['ask']) / 2
            f = FUND.get(s)
            if f:
                v['fr'], v['nft'] = f['rate'], int(f['time'] * 1000)
    except Exception as e:
        log.warning('swap tickers failed: %s', e)
    for s, contract in GATE_FUT.items():
        try:
            t = gate_get('/api/v4/futures/usdt/tickers?contract=' + contract)
            t = t[0] if isinstance(t, list) and t else (t or {})
            last, bid, ask = fnum(t.get('last')), fnum(t.get('highest_bid')), fnum(t.get('lowest_ask'))
            if bid > 0 and ask >= bid and last > 0:
                chg = fnum(t.get('change_percentage')) / 100.0
                swap[s] = {'bid': bid, 'ask': ask, 'last': last, 'chg': chg,
                           'o': last / (1 + chg) if chg > -1 else last,
                           'h': fnum(t.get('high_24h')), 'l': fnum(t.get('low_24h')), 'v': fnum(t.get('volume_24h_quote')),
                           'mark': fnum(t.get('mark_price')) or (bid + ask) / 2}
        except Exception as e:
            log.warning('gate fut ticker %s failed: %s', contract, e)
    return spot, swap


def _merge(prev, new, tag):
    merged = dict(prev)
    for s, v in new.items():
        old = prev.get(s)
        if old and abs(v['last'] / old['last'] - 1) > 0.3:
            log.warning('reject %s jump %s %s -> %s', tag, s, old['last'], v['last'])
            continue
        merged[s] = v
    return merged


def price_loop():
    while True:
        t0 = time.time()
        try:
            spot, swap = fetch_okx()
            if spot and (not PX.data or any(s in spot and s not in SYMS for s in CAND)):
                SYMS[:] = [s for s in CAND if s in spot]
                log.info('active symbols (%d): %s', len(SYMS), ' '.join(SYMS))
            if swap and not PSYMS:
                PSYMS[:] = [s for s in SYMS if s in swap and s in INST['swap']]
                log.info('perp symbols (%d)', len(PSYMS))
            ms, mw = _merge(PX.data, spot, 'spot'), _merge(PX.swap, swap, 'swap')
            if ms:
                with PX.cond:
                    PX.data, PX.swap, PX.start, PX.ts = ms, mw, t0, time.time()
                    PX.cond.notify_all()
                match_limits(ms, t0)
                match_porders(mw, t0)
                match_perps(mw, t0)
                write_json('ticker.json', {'ts': int(PX.ts * 1000), 'syms': SYMS, 'psyms': PSYMS, 'p': ms, 'swap': mw})
        except Exception as e:
            log.warning('price fetch failed: %s', e)
        time.sleep(max(0.2, TICK_INTERVAL - (time.time() - t0)))


def next_tick(after, timeout=6.0):
    """Block until a tick whose fetch STARTED after `after`; prevents trading on stale prices."""
    end = time.time() + timeout
    with PX.cond:
        while PX.start <= after:
            rem = end - time.time()
            if rem <= 0:
                return None, None
            PX.cond.wait(rem)
        return dict(PX.data), dict(PX.swap)


def cur_px():
    with PX.cond:
        if time.time() - PX.ts > 10:
            return None
        return dict(PX.data)


def cur_swap():
    with PX.cond:
        if time.time() - PX.ts > 10:
            return {}
        return dict(PX.swap)


# ---------------- shared upstream cache ----------------
class MC:
    lock = threading.Lock()
    cache = {}
    inflight = {}


def cached(key, ttl, fn):
    """One upstream fetch per key per ttl, shared by all concurrent callers; serves stale on upstream errors."""
    with MC.lock:
        v = MC.cache.get(key)
        if v and time.time() - v[0] < ttl:
            return v[1]
        ev = MC.inflight.get(key)
        owner = ev is None
        if owner:
            ev = MC.inflight[key] = threading.Event()
    if not owner:
        ev.wait(8)
        with MC.lock:
            v = MC.cache.get(key)
        if v and time.time() - v[0] < max(ttl, 30):
            return v[1]
        raise ApiError('行情暂不可用', 503)
    try:
        if not allow(('okx-out',), 15, 30):
            raise RuntimeError('local upstream budget exhausted')
        data = fn()
        with MC.lock:
            MC.cache[key] = (time.time(), data)
            if len(MC.cache) > 3000:
                for k, _ in sorted(MC.cache.items(), key=lambda kv: kv[1][0])[:1000]:
                    MC.cache.pop(k, None)
        return data
    except ApiError:
        raise
    except Exception as e:
        log.warning('market fetch %s failed: %s', key, e)
        if v and time.time() - v[0] < 30:
            return v[1]
        raise ApiError('行情暂不可用', 503)
    finally:
        with MC.lock:
            MC.inflight.pop(key, None)
        ev.set()


def inst_id(kind, sym):
    return '%s-USDT-SWAP' % sym if kind == 'swap' else '%s-USDT' % sym


def book(kind, sym, after=None):
    """Order book (100 levels, sizes in coins). With `after`, the snapshot is guaranteed to be fetched after that time."""
    ct = spec(kind, sym).get('ct', 1) if kind == 'swap' else 1
    ttl = 1.5 if after is None else max(0.0, min(1.5, time.time() - after))

    def fetch():
        if kind == 'spot' and sym in GATE_SPOT:
            d = gate_get('/api/v4/spot/order_book?currency_pair=%s&limit=100' % GATE_SPOT[sym])
            conv = lambda L: [[float(p), float(z)] for p, z in L]
            return {'ts': int(d.get('current') or time.time() * 1000), 'asks': conv(d['asks']), 'bids': conv(d['bids'])}
        if kind == 'swap' and sym in GATE_FUT:
            d = gate_get('/api/v4/futures/usdt/order_book?contract=%s&limit=100' % GATE_FUT[sym])
            conv = lambda L: [[float(x['p']), float(x['s']) * ct] for x in L]
            return {'ts': int(float(d.get('current') or time.time()) * 1000), 'asks': conv(d['asks']), 'bids': conv(d['bids'])}
        d = okx_get('/api/v5/market/books?instId=%s&sz=100' % inst_id(kind, sym))[0]
        return {'ts': int(d['ts']), 'asks': [[float(a[0]), float(a[1]) * ct] for a in d['asks']],
                'bids': [[float(b[0]), float(b[1]) * ct] for b in d['bids']]}
    return cached(('book', kind, sym), ttl, fetch)


def walk(levels, qty=None, quote=None, limit=None, side='buy'):
    """Fill against book levels (best first). Returns (filled_qty, cost_in_quote)."""
    filled = cost = 0.0
    for px, sz in levels:
        if limit is not None and ((side == 'buy' and px > limit) or (side == 'sell' and px < limit)):
            break
        take = sz
        if qty is not None:
            take = min(take, qty - filled)
        if quote is not None:
            take = min(take, (quote - cost) / px)
        if take <= 0:
            break
        filled += take
        cost += take * px
        if (qty is not None and filled >= qty - 1e-12) or (quote is not None and cost >= quote - 1e-9):
            break
    return filled, cost


# ---------------- balances ----------------
def bal_get(uid, asset):
    r = db.execute('SELECT free, locked FROM bal WHERE uid=? AND asset=?', (uid, asset)).fetchone()
    return (r[0], r[1]) if r else (0.0, 0.0)


def bal_add(uid, asset, dfree=0.0, dlocked=0.0):
    f, l = bal_get(uid, asset)
    f, l = f + dfree, l + dlocked
    if f < -1e-7 or l < -1e-7:
        raise ApiError('余额不足')
    f, l = max(f, 0.0), max(l, 0.0)
    db.execute('INSERT INTO bal(uid,asset,free,locked) VALUES(?,?,?,?) ON CONFLICT(uid,asset) DO UPDATE SET free=excluded.free, locked=excluded.locked',
               (uid, asset, f, l))


def cost_buy(uid, sym, paid):
    db.execute('UPDATE bal SET cost=cost+? WHERE uid=? AND asset=?', (paid, uid, sym))


def cost_sell(uid, sym, qty):
    f, l = bal_get(uid, sym)
    if f + l > 0:
        db.execute('UPDATE bal SET cost=cost*? WHERE uid=? AND asset=?', (max(0.0, 1 - qty / (f + l)), uid, sym))


def spot_lock(side, qty, px):
    return qty * px * (1 + SPOT_MAKER) if side == 'buy' else qty


def spot_fill(uid, sym, side, qty, cost, fee, from_locked=0.0):
    """Apply a spot fill. cost = qty*avg_px in USDT. from_locked = amount previously locked for this order."""
    if side == 'buy':
        pay = cost + fee
        if from_locked:
            bal_add(uid, QUOTE, from_locked - pay, -from_locked)
        else:
            bal_add(uid, QUOTE, -pay, 0)
        bal_add(uid, sym, qty, 0)
        cost_buy(uid, sym, pay)
    else:
        cost_sell(uid, sym, qty)
        if from_locked:
            bal_add(uid, sym, 0, -from_locked)
        else:
            bal_add(uid, sym, -qty, 0)
        bal_add(uid, QUOTE, cost - fee, 0)


def match_limits(data, t0):
    """Resting spot limit orders fill as maker when the market trades through or the opposite best reaches them."""
    def run():
        rows = db.execute("SELECT id,uid,sym,side,qty,px,locked FROM orders WHERE status='open' AND type='limit' AND created<?", (t0,)).fetchall()
        for oid, uid, sym, side, qty, px, locked in rows:
            p = data.get(sym)
            if not p:
                continue
            if side == 'buy' and (p['ask'] <= px or p['last'] < px):
                pass
            elif side == 'sell' and (p['bid'] >= px or p['last'] > px):
                pass
            else:
                continue
            fee = qty * px * SPOT_MAKER
            spot_fill(uid, sym, side, qty, qty * px, fee, locked if locked is not None else spot_lock(side, qty, px))
            db.execute("UPDATE orders SET status='filled', fill_px=?, fee=?, liq='maker', done=? WHERE id=?", (px, fee, time.time(), oid))
    try:
        tx(run)
    except Exception as e:
        log.exception('match failed: %s', e)


# ---------------- spot trading ----------------
def norm_sym(v):
    return str(v or '').upper().replace('-USDT-SWAP', '').replace('-USDT', '').replace('USDT', '')


def r_order(h):
    uid = h.uid()
    if not allow(('order', uid), 1, 5):
        raise ApiError('下单太频繁', 429)
    recv = time.time()
    d = h.body()
    sym, side, typ = norm_sym(d.get('sym')), d.get('side'), d.get('type')
    if sym not in SYMS or side not in ('buy', 'sell') or typ not in ('market', 'limit'):
        raise ApiError('参数无效')
    sp = spec('spot', sym)
    p, _ = next_tick(recv)
    if not p or sym not in p:
        raise ApiError('行情暂不可用，请稍后', 503)
    q = p[sym]
    try:
        bk = book('spot', sym, after=recv)
        lv = bk['asks'] if side == 'buy' else bk['bids']
    except ApiError:
        lv = [[q['ask'] if side == 'buy' else q['bid'], 1e18]]

    if typ == 'limit':
        qty = round_step(num(d.get('qty'), '数量'), sp['lot'])
        px = round_step(num(d.get('px'), '价格'), sp['tick'], 'near')
        mid = (q['bid'] + q['ask']) / 2
        if not 0.5 * mid <= px <= 1.5 * mid:
            raise ApiError('限价需在现价 ±50% 以内')
        if qty < max(sp['min'], 1e-12):
            raise ApiError('数量低于最小下单量 %s %s' % (sp['min'], sym))
        if qty * px < MIN_NOTIONAL:
            raise ApiError('最小下单 %s USDT' % MIN_NOTIONAL)
        # the part that crosses the book fills immediately as taker, the rest rests as maker
        f0, c0 = walk(lv, qty=qty, limit=px, side=side)
        f = round_step(f0, sp['lot'])
        c = c0 * f / f0 if f0 > 0 and f > 0 else 0.0
        rest = round_step(qty - f, sp['lot'])

        def run():
            res = {'ok': True}
            now = time.time()
            if f > 0:
                fee = c * SPOT_TAKER
                spot_fill(uid, sym, side, f, c, fee)
                cur = db.execute("INSERT INTO orders(uid,sym,side,type,qty,px,status,fill_px,fee,created,done,liq) VALUES(?,?,?,?,?,?,'filled',?,?,?,?,'taker')",
                                 (uid, sym, side, 'limit', f, px, c / f, fee, recv, now))
                res.update(filled_id=cur.lastrowid, filled_qty=f, fpx=c / f)
            if rest >= max(sp['min'], 1e-12) and rest * px >= MIN_NOTIONAL:
                n = db.execute("SELECT COUNT(*) FROM orders WHERE uid=? AND status='open'", (uid,)).fetchone()[0]
                if n >= MAX_OPEN:
                    raise ApiError('挂单最多 %d 个' % MAX_OPEN)
                amt = spot_lock(side, rest, px)
                bal_add(uid, QUOTE if side == 'buy' else sym, -amt, amt)
                cur = db.execute("INSERT INTO orders(uid,sym,side,type,qty,px,status,created,locked) VALUES(?,?,?,?,?,?,'open',?,?)",
                                 (uid, sym, side, 'limit', rest, px, now, amt))
                res.update(id=cur.lastrowid, open_qty=rest)
            res['status'] = 'filled' if f > 0 and 'id' not in res else ('partial' if f > 0 else 'open')
            if 'id' not in res and 'filled_id' in res:
                res['id'] = res['filled_id']
                res['qty'] = f
            return res
        return tx(run)

    # market: walk the real order book snapshot taken after the order arrived
    if side == 'buy' and d.get('amt') is None and d.get('qty') is not None:
        want = round_step(num(d.get('qty'), '数量'), sp['lot'])
        f, c = walk(lv, qty=want, side='buy')
    elif side == 'buy':
        amt = num(d.get('amt'), '金额')
        if amt < MIN_NOTIONAL:
            raise ApiError('最小下单 %s USDT' % MIN_NOTIONAL)
        want = None
        f, c = walk(lv, quote=amt / (1 + SPOT_TAKER), side='buy')
    else:
        want = round_step(num(d.get('qty'), '数量'), sp['lot'])
        f, c = walk(lv, qty=want, side='sell')
    if want is not None and f < want - 1e-12:
        raise ApiError('数量超过当前盘口可成交深度（约 %s %s），请分批下单' % (round(f, 6), sym))
    fr = round_step(f, sp['lot'])
    if fr <= 0 or fr < sp['min']:
        raise ApiError('数量低于最小下单量 %s %s' % (sp['min'], sym))
    c = c * fr / f
    if c < MIN_NOTIONAL:
        raise ApiError('最小下单 %s USDT' % MIN_NOTIONAL)
    fee = c * SPOT_TAKER

    def run():
        spot_fill(uid, sym, side, fr, c, fee)
        cur = db.execute("INSERT INTO orders(uid,sym,side,type,qty,px,status,fill_px,fee,created,done,liq) VALUES(?,?,?,?,?,?,'filled',?,?,?,?,'taker')",
                         (uid, sym, side, 'market', fr, None, c / fr, fee, recv, time.time()))
        return cur.lastrowid
    oid = tx(run)
    return {'ok': True, 'id': oid, 'status': 'filled', 'fpx': c / fr, 'qty': fr, 'fee': fee,
            'slippage': (c / fr) / (q['ask'] if side == 'buy' else q['bid']) - 1}


def _cancel_spot(uid, oid):
    r = db.execute("SELECT sym,side,qty,px,locked FROM orders WHERE id=? AND uid=? AND status='open'", (oid, uid)).fetchone()
    if not r:
        return False
    sym, side, qty, px, locked = r
    amt = locked if locked is not None else qty * px * (1 + 0.001) if side == 'buy' else qty
    bal_add(uid, QUOTE if side == 'buy' else sym, amt, -amt)
    db.execute("UPDATE orders SET status='cancelled', done=? WHERE id=?", (time.time(), oid))
    return True


def r_cancel(h):
    uid = h.uid()
    oid = h.body().get('id')

    def run():
        if not _cancel_spot(uid, oid):
            raise ApiError('订单不存在或已成交')
    tx(run)
    return {'ok': True}


def r_cancel_all(h):
    uid = h.uid()
    sym = h.body().get('sym')

    def run():
        q = "SELECT id FROM orders WHERE uid=? AND status='open'"
        args = [uid]
        if sym:
            q += ' AND sym=?'
            args.append(norm_sym(sym))
        ids = [r[0] for r in db.execute(q, args).fetchall()]
        for oid in ids:
            _cancel_spot(uid, oid)
        return len(ids)
    return {'ok': True, 'cancelled': tx(run)}


def _q(h):
    return {k: v[0] for k, v in urllib.parse.parse_qs(urllib.parse.urlsplit(h.path).query).items()}


def r_orders(h):
    """Order history. ?status=open|filled|cancelled|done|all &sym= &limit<=200 &before=<id>"""
    uid = h.uid()
    q = _q(h)
    st = q.get('status', 'all')
    sql = 'SELECT id,sym,side,type,qty,px,status,fill_px,fee,created,done,liq FROM orders WHERE uid=?'
    args = [uid]
    if st == 'done':
        sql += " AND status!='open'"
    elif st in ('open', 'filled', 'cancelled'):
        sql += ' AND status=?'
        args.append(st)
    if q.get('sym'):
        sql += ' AND sym=?'
        args.append(norm_sym(q['sym']))
    try:
        before = int(q.get('before') or 0)
        limit = max(1, min(200, int(q.get('limit') or 50)))
    except ValueError:
        raise ApiError('参数无效')
    if before:
        sql += ' AND id<?'
        args.append(before)
    sql += ' ORDER BY id DESC LIMIT %d' % limit
    with DBL:
        rows = db.execute(sql, args).fetchall()
    keys = ('id', 'sym', 'side', 'type', 'qty', 'px', 'status', 'fpx', 'fee', 'created', 'done', 'liq')
    return {'orders': [dict(zip(keys, r)) for r in rows]}


# ---------------- perpetual contracts (USDT-margined, isolated, priced on OKX swaps) ----------------
MAX_LEV = int(os.environ.get('MAX_LEV', 400))
MAX_POS = int(os.environ.get('MAX_POS', 20))
POS_COLS = ('id', 'sym', 'side', 'lev', 'qty', 'entry', 'margin', 'tp', 'sl', 'opened', 'status', 'close_px', 'pnl', 'closed', 'fee', 'funding', 'net')
PORD_COLS = ('id', 'sym', 'side', 'lev', 'qty', 'px', 'margin', 'tp', 'sl', 'created', 'status', 'done')


def mmr(lev):
    """Maintenance margin rate: 0.4% of notional, lowered for very high leverage so 400x still opens."""
    return min(0.004, 0.4 / lev)


def liq_price(side, entry, qty, margin, lev):
    m = mmr(lev)
    if side == 'long':
        return max(0.0, (entry * qty - margin) / (qty * (1 - m)))
    return (entry * qty + margin) / (qty * (1 + m))


def upnl(side, entry, qty, mark):
    return (mark - entry) * qty if side == 'long' else (entry - mark) * qty


def mark_of(sw, sym):
    q = sw.get(sym)
    return (q.get('mark') or (q['bid'] + q['ask']) / 2) if q else None


def pos_row(r, sw=None):
    d = dict(zip(POS_COLS, r))
    d['funding'] = d.get('funding') or 0.0
    d['liq'] = liq_price(d['side'], d['entry'], d['qty'], d['margin'], d['lev'])
    if sw and d['status'] == 'open' and d['sym'] in sw:
        mark = mark_of(sw, d['sym'])
        d['mark'] = mark
        d['last'] = sw[d['sym']]['last']
        d['upnl'] = upnl(d['side'], d['entry'], d['qty'], mark)
        d['roe'] = d['upnl'] / d['margin'] if d['margin'] else 0
        # net = what you'd pocket if closed now: after open fee, est. taker close fee and funding
        d['net'] = d['upnl'] + d['funding'] - (d['fee'] or 0) - d['qty'] * mark * SWAP_TAKER
        d['net_roe'] = d['net'] / d['margin'] if d['margin'] else 0
    elif d['status'] != 'open' and d.get('net') is None and d.get('pnl') is not None:
        # legacy rows closed before net was stored: estimate the open fee
        cf = 0.0 if d['status'] == 'liquidated' else d['qty'] * (d['close_px'] or 0) * SWAP_TAKER
        of = (d['fee'] or 0) - cf
        if of < 1e-9:
            of = d['qty'] * d['entry'] * SWAP_TAKER
        d['net'] = d['pnl'] + d['funding'] - of
    return d


def _close_pos(pid, uid, side, entry, qty, margin, close_qty, px, status, now, fee_rate=SWAP_TAKER):
    """Close close_qty of a position at px; returns realised pnl. Loss is capped at the margin released."""
    frac = min(1.0, close_qty / qty)
    m_part = margin * frac
    pnl = upnl(side, entry, close_qty, px)
    fee = close_qty * px * fee_rate if status != 'liquidated' else 0.0
    if status == 'liquidated':
        pnl = -m_part
    back = max(0.0, m_part + pnl - fee)
    pnl = back - m_part
    if back > 0:
        bal_add(uid, QUOTE, back, 0)
    pf, pfund = db.execute('SELECT COALESCE(fee,0), COALESCE(funding,0) FROM positions WHERE id=?', (pid,)).fetchone()
    if frac >= 1 - 1e-9:
        net = pnl + pfund - pf
        db.execute('UPDATE positions SET status=?, close_px=?, pnl=COALESCE(pnl,0)+?, fee=fee+?, closed=?, qty=?, net=? WHERE id=?',
                   (status, px, pnl, fee, now, qty, net, pid))
    else:
        of, fu = pf * frac, pfund * frac   # move this slice's share of open fee and funding to the closed row
        net = pnl + fu - of
        db.execute('UPDATE positions SET qty=?, margin=?, fee=fee-?, funding=funding-? WHERE id=?', (qty - close_qty, margin - m_part, of, fu, pid))
        db.execute("INSERT INTO positions(uid,sym,side,lev,qty,entry,margin,opened,status,close_px,pnl,closed,fee,funding,net) "
                   "SELECT uid,sym,side,lev,?,entry,?,opened,?,?,?,?,?,?,? FROM positions WHERE id=?",
                   (close_qty, m_part, status, px, pnl, now, fee + of, fu, net, pid))
    return pnl


def match_perps(sw, t0):
    """Liquidation on OKX mark price; TP/SL trigger on last price and fill at the touch."""
    def run():
        rows = db.execute("SELECT id,uid,sym,side,lev,qty,entry,margin,tp,sl FROM positions WHERE status='open' AND opened<?", (t0,)).fetchall()
        now = time.time()
        for pid, uid, sym, side, lev, qty, entry, margin, tp, sl in rows:
            q = sw.get(sym)
            if not q:
                continue
            mark = mark_of(sw, sym)
            if margin + upnl(side, entry, qty, mark) <= mmr(lev) * qty * mark:
                lp = liq_price(side, entry, qty, margin, lev)
                _close_pos(pid, uid, side, entry, qty, margin, qty, lp, 'liquidated', now)
                continue
            last = q['last']
            hit = None
            if tp and ((side == 'long' and last >= tp) or (side == 'short' and last <= tp)):
                hit = 'tp'
            elif sl and ((side == 'long' and last <= sl) or (side == 'short' and last >= sl)):
                hit = 'sl'
            if hit:
                _close_pos(pid, uid, side, entry, qty, margin, qty, q['bid'] if side == 'long' else q['ask'], hit, now)
    try:
        tx(run)
    except Exception as e:
        log.exception('perp match failed: %s', e)


def _new_pos(uid, sym, side, lev, qty, entry, margin, tp, sl, fee):
    n = db.execute("SELECT COUNT(*) FROM positions WHERE uid=? AND status='open'", (uid,)).fetchone()[0]
    if n >= MAX_POS:
        raise ApiError('持仓最多 %d 个' % MAX_POS)
    cur = db.execute("INSERT INTO positions(uid,sym,side,lev,qty,entry,margin,tp,sl,opened,status,fee,funding) VALUES(?,?,?,?,?,?,?,?,?,?,'open',?,0)",
                     (uid, sym, side, lev, qty, entry, margin, tp, sl, time.time(), fee))
    return cur.lastrowid


def match_porders(sw, t0):
    """Resting perp limit orders open positions as maker."""
    def run():
        rows = db.execute("SELECT id,uid,sym,side,lev,qty,px,margin,tp,sl,locked FROM porders WHERE status='open' AND created<?", (t0,)).fetchall()
        for oid, uid, sym, side, lev, qty, px, margin, tp, sl, locked in rows:
            q = sw.get(sym)
            if not q:
                continue
            if side == 'long' and not (q['ask'] <= px or q['last'] < px):
                continue
            if side == 'short' and not (q['bid'] >= px or q['last'] > px):
                continue
            fee = qty * px * SWAP_MAKER
            bal_add(uid, QUOTE, locked - margin - fee, -locked)
            try:
                _new_pos(uid, sym, side, lev, qty, px, margin, tp, sl, fee)
            except ApiError:
                bal_add(uid, QUOTE, margin + fee, 0)
                db.execute("UPDATE porders SET status='cancelled', done=? WHERE id=?", (time.time(), oid))
                continue
            db.execute("UPDATE porders SET status='filled', done=? WHERE id=?", (time.time(), oid))
    try:
        tx(run)
    except Exception as e:
        log.exception('porder match failed: %s', e)


def _opt_px(v, name):
    if v in (None, '', 0, '0'):
        return None
    return num(v, name)


def r_perp_open(h):
    uid = h.uid()
    if not allow(('order', uid), 1, 5):
        raise ApiError('下单太频繁', 429)
    recv = time.time()
    d = h.body()
    sym = norm_sym(d.get('sym'))
    side = d.get('side')
    typ = d.get('type') or 'market'
    if sym not in PSYMS or side not in ('long', 'short') or typ not in ('market', 'limit'):
        raise ApiError('参数无效或该币种没有永续合约')
    try:
        lev = int(d.get('lev'))
    except Exception:
        raise ApiError('杠杆无效')
    if not 1 <= lev <= MAX_LEV:
        raise ApiError('杠杆 1-%d 倍' % MAX_LEV)
    sp = spec('swap', sym)
    margin_in = num(d.get('margin'), '保证金')
    tp, sl = _opt_px(d.get('tp'), '止盈价'), _opt_px(d.get('sl'), '止损价')
    _, sw = next_tick(recv)
    if not sw or sym not in sw:
        raise ApiError('合约行情暂不可用，请稍后', 503)
    q = sw[sym]
    ref = q['ask'] if side == 'long' else q['bid']
    px = round_step(num(d.get('px'), '价格'), sp['tick'], 'near') if typ == 'limit' else None
    if px is not None:
        mid = (q['bid'] + q['ask']) / 2
        if not 0.5 * mid <= px <= 1.5 * mid:
            raise ApiError('限价需在现价 ±50% 以内')
    qty = round_step(margin_in * lev / (px or ref), sp['lot'])
    if qty < sp['min'] or qty <= 0:
        raise ApiError('仓位太小：最少 %s %s（约 %.2f USDT 仓位价值）' % (sp['min'], sym, sp['min'] * ref))
    for v, nm, up in ((tp, '止盈价', True), (sl, '止损价', False)):
        if v and ((side == 'long') == up) != (v > (px or ref)):
            raise ApiError('%s方向不对：开多止盈要高于开仓价、止损要低于；开空相反' % nm)
    try:
        lv = book('swap', sym, after=recv)['asks' if side == 'long' else 'bids']
    except ApiError:
        lv = [[ref, 1e18]]
    bside = 'buy' if side == 'long' else 'sell'
    f0, c0 = walk(lv, qty=qty, limit=px, side=bside)
    f = round_step(f0, sp['lot'])
    if typ == 'market' and f < qty - 1e-12:
        raise ApiError('仓位超过当前盘口可成交深度，请减小保证金或杠杆')
    c = c0 * f / f0 if f0 > 0 and f > 0 else 0.0
    rest = round_step(qty - f, sp['lot']) if typ == 'limit' else 0.0

    def run():
        res = {'ok': True}
        if f > 0:
            entry = c / f
            margin = f * entry / lev
            fee = f * entry * SWAP_TAKER
            bal_add(uid, QUOTE, -(margin + fee), 0)
            pid = _new_pos(uid, sym, side, lev, f, entry, margin, tp, sl, fee)
            res.update(id=pid, entry=entry, qty=f, fee=fee, margin=margin, liq=liq_price(side, entry, f, margin, lev), status='filled',
                       slippage=entry / ref - 1)
        if rest >= sp['min'] and rest > 0:
            n = db.execute("SELECT COUNT(*) FROM porders WHERE uid=? AND status='open'", (uid,)).fetchone()[0]
            if n >= MAX_OPEN:
                raise ApiError('合约委托最多 %d 个' % MAX_OPEN)
            margin = rest * px / lev
            locked = margin + rest * px * SWAP_MAKER
            bal_add(uid, QUOTE, -locked, locked)
            cur = db.execute("INSERT INTO porders(uid,sym,side,lev,qty,px,margin,tp,sl,locked,created,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,'open')",
                             (uid, sym, side, lev, rest, px, margin, tp, sl, locked, time.time()))
            res.update(order_id=cur.lastrowid, open_qty=rest, status='partial' if f > 0 else 'open')
        return res
    return tx(run)


def r_perp_close(h):
    uid = h.uid()
    if not allow(('order', uid), 1, 5):
        raise ApiError('下单太频繁', 429)
    recv = time.time()
    d = h.body()
    pid = d.get('id')
    pct = fnum(d.get('pct') or 100)
    if not 0 < pct <= 100:
        raise ApiError('比例 0-100')
    with DBL:
        r = db.execute("SELECT sym,side FROM positions WHERE id=? AND uid=? AND status='open'", (pid, uid)).fetchone()
    if not r:
        raise ApiError('持仓不存在或已平仓')
    sym, side = r
    _, sw = next_tick(recv)
    if not sw or sym not in sw:
        raise ApiError('合约行情暂不可用', 503)
    try:
        lv = book('swap', sym, after=recv)['bids' if side == 'long' else 'asks']
    except ApiError:
        lv = [[sw[sym]['bid'] if side == 'long' else sw[sym]['ask'], 1e18]]
    sp = spec('swap', sym)

    def run():
        r = db.execute("SELECT qty,entry,margin FROM positions WHERE id=? AND uid=? AND status='open'", (pid, uid)).fetchone()
        if not r:
            raise ApiError('持仓不存在或已平仓')
        qty, entry, margin = r
        cq = qty if pct >= 100 else round_step(qty * pct / 100, sp['lot'])
        if cq <= 0:
            raise ApiError('平仓数量太小')
        f, c = walk(lv, qty=cq, side='sell' if side == 'long' else 'buy')
        if f < cq - 1e-12:
            raise ApiError('平仓数量超过当前盘口深度，请分批平仓')
        px = c / f
        return px, _close_pos(pid, uid, side, entry, qty, margin, cq, px, 'closed', time.time())
    px, pnl = tx(run)
    return {'ok': True, 'px': px, 'pnl': pnl}


def r_perp_tpsl(h):
    uid = h.uid()
    d = h.body()
    tp, sl = _opt_px(d.get('tp'), '止盈价'), _opt_px(d.get('sl'), '止损价')

    def run():
        c = db.execute("UPDATE positions SET tp=?, sl=? WHERE id=? AND uid=? AND status='open'", (tp, sl, d.get('id'), uid))
        if not c.rowcount:
            raise ApiError('持仓不存在或已平仓')
    tx(run)
    return {'ok': True}


def _cancel_porder(uid, oid):
    r = db.execute("SELECT locked FROM porders WHERE id=? AND uid=? AND status='open'", (oid, uid)).fetchone()
    if not r:
        return False
    bal_add(uid, QUOTE, r[0], -r[0])
    db.execute("UPDATE porders SET status='cancelled', done=? WHERE id=?", (time.time(), oid))
    return True


def r_perp_cancel(h):
    uid = h.uid()
    d = h.body()

    def run():
        if d.get('all'):
            ids = [r[0] for r in db.execute("SELECT id FROM porders WHERE uid=? AND status='open'", (uid,))]
            for i in ids:
                _cancel_porder(uid, i)
            return len(ids)
        if not _cancel_porder(uid, d.get('id')):
            raise ApiError('委托不存在或已成交')
        return 1
    return {'ok': True, 'cancelled': tx(run)}


def r_perp_orders(h):
    uid = h.uid()
    st = _q(h).get('status', 'open')
    sql = 'SELECT %s FROM porders WHERE uid=?' % ','.join(PORD_COLS)
    sql += " AND status='open' ORDER BY id DESC" if st == 'open' else " AND status!='open' ORDER BY id DESC LIMIT 100"
    with DBL:
        return {'orders': [dict(zip(PORD_COLS, r)) for r in db.execute(sql, (uid,))]}


def r_perp_positions(h):
    uid = h.uid()
    st = _q(h).get('status', 'open')
    sql = 'SELECT %s FROM positions WHERE uid=?' % ','.join(POS_COLS)
    sql += " AND status='open' ORDER BY id DESC" if st == 'open' else " AND status!='open' ORDER BY closed DESC LIMIT 100"
    sw = cur_swap()
    with DBL:
        return {'positions': [pos_row(r, sw) for r in db.execute(sql, (uid,))]}


def r_perp_funding(h):
    uid = h.uid()
    with DBL:
        rows = db.execute('SELECT id,pos_id,sym,side,rate,amount,ts FROM funding WHERE uid=? ORDER BY id DESC LIMIT 100', (uid,)).fetchall()
    return {'funding': [dict(zip(('id', 'pos_id', 'sym', 'side', 'rate', 'amount', 'ts'), r)) for r in rows]}


# ---------------- funding (OKX real rates, settled at each instrument's funding time) ----------------
def kv_get(k, d=None):
    r = db.execute('SELECT v FROM kv WHERE k=?', (k,)).fetchone()
    return r[0] if r else d


def kv_set(k, v):
    db.execute('INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v', (k, str(v)))


def refresh_funding():
    data = okx_get('/api/v5/public/funding-rate?instId=ANY', 10)
    for x in data:
        iid = x.get('instId', '')
        if iid.endswith('-USDT-SWAP'):
            s = iid[:-10]
            if s in CAND:
                FUND[s] = {'rate': fnum(x.get('fundingRate')), 'time': fnum(x.get('fundingTime')) / 1000}


def settle_funding(sym, rate, ft):
    sw = cur_swap()
    mark = mark_of(sw, sym) if sw else None
    if not mark:
        return False

    def run():
        key = 'fund:' + sym
        if float(kv_get(key, 0)) >= ft:
            return 0
        rows = db.execute("SELECT id,uid,side,qty FROM positions WHERE status='open' AND sym=? AND opened<?", (sym, ft)).fetchall()
        for pid, uid, side, qty in rows:
            pay = qty * mark * rate            # >0: longs pay shorts
            amt = -pay if side == 'long' else pay
            db.execute('UPDATE positions SET margin=MAX(0, margin+?), funding=COALESCE(funding,0)+? WHERE id=?', (amt, amt, pid))
            db.execute('INSERT INTO funding(uid,pos_id,sym,side,rate,amount,ts) VALUES(?,?,?,?,?,?,?)', (uid, pid, sym, side, rate, amt, ft))
        kv_set(key, ft)
        return len(rows)
    n = tx(run)
    if n:
        log.info('funding %s rate=%.6f positions=%d', sym, rate, n)
    return True


def funding_loop():
    last_refresh = 0
    while True:
        try:
            now = time.time()
            due = [s for s, f in FUND.items() if f['time'] and f['time'] <= now]
            for s in due:
                settle_funding(s, FUND[s]['rate'], FUND[s]['time'])
            if due or now - last_refresh > 300:
                refresh_funding()
                last_refresh = now
        except Exception as e:
            log.warning('funding loop: %s', e)
        time.sleep(15)


def inst_loop():
    while True:
        try:
            load_instruments()
        except Exception as e:
            log.warning('instruments load failed: %s', e)
            time.sleep(30)
            continue
        time.sleep(3600)


# ---------------- leaderboard / equity ----------------
RANK = {}
LB = {}
EQH_EVERY = 900      # seconds between equity snapshots
EQH_KEEP = 30 * 86400


def equity_of(rows, px, uid=None, sw=None):
    e = 0.0
    for asset, f, l in rows:
        e += (f + l) if asset == QUOTE else (f + l) * (px[asset]['bid'] if asset in px else 0)
    if uid is not None:
        sw = sw if sw is not None else cur_swap()
        for sym, side, qty, entry, margin in db.execute("SELECT sym,side,qty,entry,margin FROM positions WHERE uid=? AND status='open'", (uid,)):
            m = mark_of(sw, sym)
            e += max(0.0, margin + upnl(side, entry, qty, m)) if m else margin
    return e


def lb_loop():
    global RANK, LB
    last_snap = 0.0
    while True:
        try:
            px, sw = cur_px(), cur_swap()
            if px:
                with DBL:
                    names = dict(db.execute('SELECT id, name FROM users').fetchall())
                    avs = dict(db.execute('SELECT id, avatar FROM users').fetchall())
                    eq = {uid: 0.0 for uid in names}
                    for uid, asset, f, l in db.execute('SELECT uid, asset, free, locked FROM bal'):
                        if uid in eq:
                            amt = f + l
                            eq[uid] += amt if asset == QUOTE else amt * (px[asset]['bid'] if asset in px else 0)
                    for uid, sym, side, qty, entry, margin in db.execute("SELECT uid,sym,side,qty,entry,margin FROM positions WHERE status='open'"):
                        if uid in eq:
                            m = mark_of(sw, sym)
                            eq[uid] += max(0.0, margin + upnl(side, entry, qty, m)) if m else margin
                order = sorted(eq.items(), key=lambda kv: -kv[1])
                RANK = {uid: (i + 1, e) for i, (uid, e) in enumerate(order)}
                LB = {'ts': int(time.time() * 1000), 'total': len(order), 'init': INIT,
                      'top': [{'r': i + 1, 'u': u, 'n': names[u], 'a': avs.get(u) or '', 'eq': round(e, 2), 'pct': round((e / INIT - 1) * 100, 3)}
                              for i, (u, e) in enumerate(order[:100])],
                      'loss': [{'r': i + 1, 'u': u, 'n': names[u], 'a': avs.get(u) or '', 'eq': round(e, 2), 'pct': round((e / INIT - 1) * 100, 3)}
                               for i, (u, e) in enumerate([x for x in reversed(order) if x[1] < INIT][:100])]}
                write_json('leaderboard.json', LB)
                now = time.time()
                if now - last_snap >= EQH_EVERY:
                    last_snap = now
                    active = {r[0] for r in db.execute('SELECT id FROM users WHERE COALESCE(last_seen,last_login) > ?', (now - 14 * 86400,))}
                    rows = [(u, int(now), round(e, 2)) for u, e in eq.items() if u in active]

                    def snap():
                        db.executemany('INSERT INTO eqh(uid,ts,eq) VALUES(?,?,?)', rows)
                        db.execute('DELETE FROM eqh WHERE ts<?', (int(now - EQH_KEEP),))
                    tx(snap)
        except Exception as e:
            log.exception('leaderboard failed: %s', e)
        time.sleep(LB_INTERVAL)


# ---------------- API keys ----------------
def r_key_get(h):
    uid = h.uid()
    with DBL:
        r = db.execute('SELECT prefix, created FROM apikeys WHERE uid=?', (uid,)).fetchone()
    return {'key': {'prefix': r[0], 'created': r[1]} if r else None}


def r_key_new(h):
    uid = h.uid()
    if h.via_key:
        raise ApiError('请在网页登录后生成 Key', 403)
    if not allow(('key', uid), 0.05, 3):
        raise ApiError('操作太频繁', 429)
    key = 'sk-sim-' + secrets.token_urlsafe(24)
    th = hashlib.sha256(key.encode()).digest()

    def run():
        db.execute('DELETE FROM apikeys WHERE uid=?', (uid,))
        db.execute('INSERT INTO apikeys(th,uid,prefix,created) VALUES(?,?,?,?)', (th, uid, key[:11], time.time()))
    tx(run)
    return {'ok': True, 'key': key}


def r_key_revoke(h):
    uid = h.uid()
    if h.via_key:
        raise ApiError('请在网页操作', 403)
    tx(lambda: db.execute('DELETE FROM apikeys WHERE uid=?', (uid,)))
    return {'ok': True}


# ---------------- perpetual contracts (USDT-margined, isolated) ----------------
PERP_FEE = 0.0005


def touch(uid):
    now = time.time()
    if now - _seen.get(uid, 0) > 300:
        _seen[uid] = now
        tx(lambda: db.execute('UPDATE users SET last_seen=? WHERE id=?', (now, uid)))


def r_me(h):
    uid = h.uid()
    touch(uid)
    p, sw = cur_px() or {}, cur_swap()
    with DBL:
        name, created, avatar = db.execute('SELECT name, created, avatar FROM users WHERE id=?', (uid,)).fetchone()
        rows = db.execute('SELECT asset, free, locked, cost FROM bal WHERE uid=?', (uid,)).fetchall()
        bal = {a: [f, l] for a, f, l, c in rows if f + l > 1e-12 or a == QUOTE}
        cost = {a: c for a, f, l, c in rows if a != QUOTE and f + l > 1e-12}
        opn = db.execute("SELECT id,sym,side,type,qty,px,created FROM orders WHERE uid=? AND status='open' ORDER BY id DESC", (uid,)).fetchall()
        hist = db.execute("SELECT id,sym,side,type,qty,px,status,fill_px,fee,done,liq FROM orders WHERE uid=? AND status!='open' ORDER BY id DESC LIMIT 30", (uid,)).fetchall()
        eq = equity_of([(a, f, l) for a, (f, l) in bal.items()], p, uid, sw) if p else None
        pos = [pos_row(r, sw) for r in db.execute("SELECT %s FROM positions WHERE uid=? AND status='open' ORDER BY id DESC" % ','.join(POS_COLS), (uid,))]
        pord = [dict(zip(PORD_COLS, r)) for r in db.execute("SELECT %s FROM porders WHERE uid=? AND status='open' ORDER BY id DESC" % ','.join(PORD_COLS), (uid,))]
    rk = RANK.get(uid)
    return {'name': name, 'avatar': avatar or '', 'acct': '%d:%d' % (uid, int(created or 0)), 'init': INIT, 'fee': SPOT_TAKER, 'fees': {'spot': [SPOT_MAKER, SPOT_TAKER], 'swap': [SWAP_MAKER, SWAP_TAKER]},
            'perp_fee': SWAP_TAKER, 'max_lev': MAX_LEV, 'bal': bal, 'cost': cost, 'equity': eq, 'positions': pos, 'porders': pord,
            'open': [dict(zip(('id', 'sym', 'side', 'type', 'qty', 'px', 't'), x)) for x in opn],
            'hist': [dict(zip(('id', 'sym', 'side', 'type', 'qty', 'px', 'status', 'fpx', 'fee', 't', 'liq'), x)) for x in hist],
            'uid': uid, 'rank': rk[0] if rk else None, 'total': len(RANK)}


def r_equity(h):
    uid = h.uid()
    with DBL:
        rows = db.execute('SELECT ts, eq FROM eqh WHERE uid=? ORDER BY ts', (uid,)).fetchall()
        bal = db.execute('SELECT asset, free, locked FROM bal WHERE uid=?', (uid,)).fetchall()
        created = db.execute('SELECT created FROM users WHERE id=?', (uid,)).fetchone()[0]
        p = cur_px()
        pts = [[int(created), INIT]] + [list(r) for r in rows]
        if p:
            pts.append([int(time.time()), round(equity_of(bal, p, uid), 2)])
    return {'init': INIT, 'points': pts}


# ---------------- public market data endpoints ----------------
def _sym(q, kind='spot'):
    s = norm_sym(q.get('sym'))
    if s not in (PSYMS if kind == 'swap' else SYMS):
        raise ApiError('不支持的币种' + ('（无永续合约）' if kind == 'swap' else ''))
    return s


def _kind(q):
    k = str(q.get('type') or 'spot').lower()
    if k in ('perp', 'swap', 'futures', 'contract'):
        return 'swap'
    if k != 'spot':
        raise ApiError('type 只能是 spot 或 swap')
    return 'spot'


TF = {'1m': ('1m', 4), '5m': ('5m', 10), '15m': ('15m', 15), '1h': ('1H', 30), '4h': ('4H', 60),
      '1d': ('1Dutc', 120), '1w': ('1Wutc', 300)}
GATE_TF = {'1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d', '1w': '7d'}


def r_kline(h):
    q = _q(h)
    kind = _kind(q)
    s = _sym(q, kind)
    tf = str(q.get('tf') or '15m').lower()
    if tf not in TF:
        raise ApiError('周期无效，可选 ' + ','.join(TF))
    bar, ttl = TF[tf]
    ct = spec('swap', s).get('ct', 1) if kind == 'swap' else 1

    def fetch():
        if kind == 'spot' and s in GATE_SPOT:
            rows = gate_get('/api/v4/spot/candlesticks?currency_pair=%s&interval=%s&limit=300' % (GATE_SPOT[s], GATE_TF[tf]))
            return [[int(r[0]) * 1000, float(r[5]), float(r[3]), float(r[4]), float(r[2]), float(r[6])] for r in rows]
        if kind == 'swap' and s in GATE_FUT:
            rows = gate_get('/api/v4/futures/usdt/candlesticks?contract=%s&interval=%s&limit=300' % (GATE_FUT[s], GATE_TF[tf]))
            return [[int(r['t']) * 1000, float(r['o']), float(r['h']), float(r['l']), float(r['c']), float(r['v']) * ct] for r in rows]
        rows = okx_get('/api/v5/market/candles?instId=%s&bar=%s&limit=300' % (inst_id(kind, s), bar))
        return [[int(r[0]), float(r[1]), float(r[2]), float(r[3]), float(r[4]), float(r[5]) * ct] for r in reversed(rows)]
    return Cached({'sym': s, 'type': kind, 'tf': tf, 'cols': ['t', 'o', 'h', 'l', 'c', 'v'], 'k': cached(('k', kind, s, tf), ttl, fetch)}, min(ttl, 5))


def r_depth(h):
    q = _q(h)
    kind = _kind(q)
    s = _sym(q, kind)
    b = book(kind, s)
    return Cached({'sym': s, 'type': kind, 'ts': b['ts'], 'asks': b['asks'][:20], 'bids': b['bids'][:20]}, 1)


def r_trades(h):
    q = _q(h)
    kind = _kind(q)
    s = _sym(q, kind)
    ct = spec('swap', s).get('ct', 1) if kind == 'swap' else 1

    def fetch():
        if kind == 'spot' and s in GATE_SPOT:
            return [[int(t['create_time']) * 1000, float(t['price']), float(t['amount']), t['side']]
                    for t in gate_get('/api/v4/spot/trades?currency_pair=%s&limit=50' % GATE_SPOT[s])]
        if kind == 'swap' and s in GATE_FUT:
            return [[int(float(t['create_time']) * 1000), float(t['price']), abs(float(t['size'])) * ct,
                     'buy' if float(t['size']) > 0 else 'sell']
                    for t in gate_get('/api/v4/futures/usdt/trades?contract=%s&limit=50' % GATE_FUT[s])]
        return [[int(t['ts']), float(t['px']), float(t['sz']) * ct, t['side']]
                for t in okx_get('/api/v5/market/trades?instId=%s&limit=50' % inst_id(kind, s))]
    return Cached({'sym': s, 'type': kind, 'cols': ['t', 'px', 'sz', 'side'], 'trades': cached(('t', kind, s), 2, fetch)}, 1)


def r_ticker(h):
    p = cur_px()
    if not p:
        raise ApiError('行情暂不可用', 503)
    q = _q(h)
    kind = _kind(q)
    src = cur_swap() if kind == 'swap' else p
    if q.get('sym'):
        s = _sym(q, kind)
        return Cached({'ts': int(PX.ts * 1000), 'sym': s, 'type': kind, **src[s]}, 1)
    return Cached({'ts': int(PX.ts * 1000), 'type': kind, 'p': src}, 1)


def r_symbols(h):
    return Cached({'quote': QUOTE, 'fees': {'spot': {'maker': SPOT_MAKER, 'taker': SPOT_TAKER}, 'swap': {'maker': SWAP_MAKER, 'taker': SWAP_TAKER}},
                   'max_lev': MAX_LEV, 'min_notional': MIN_NOTIONAL, 'symbols': SYMS, 'perp_symbols': PSYMS,
                   'instruments': INST, 'kline_tf': list(TF)}, 30)


def r_funding_rates(h):
    return Cached({'rates': {s: {'rate': f['rate'], 'next': int(f['time'] * 1000)} for s, f in FUND.items() if s in PSYMS}}, 10)


def r_leaderboard(h):
    return Cached(LB or {'top': [], 'total': 0}, 10)


ROUTES = {
    ('GET', '/api/auth/login'): r_auth_login,
    ('GET', '/api/auth/callback'): r_auth_callback,
    ('GET', '/api/auth/nodeloc/login'): r_nl_login,
    ('GET', '/api/auth/nodeloc/callback'): r_nl_callback,
    ('POST', '/api/logout'): r_logout,
    ('GET', '/api/me'): r_me,
    ('POST', '/api/order'): r_order,
    ('POST', '/api/cancel'): r_cancel,
    ('POST', '/api/cancel_all'): r_cancel_all,
    ('GET', '/api/orders'): r_orders,
    ('GET', '/api/equity'): r_equity,
    ('GET', '/api/apikey'): r_key_get,
    ('POST', '/api/apikey'): r_key_new,
    ('POST', '/api/apikey/revoke'): r_key_revoke,
    ('GET', '/api/market/symbols'): r_symbols,
    ('GET', '/api/market/ticker'): r_ticker,
    ('GET', '/api/market/kline'): r_kline,
    ('GET', '/api/market/depth'): r_depth,
    ('GET', '/api/market/trades'): r_trades,
    ('GET', '/api/market/funding'): r_funding_rates,
    ('GET', '/api/leaderboard'): r_leaderboard,
    ('POST', '/api/perp/open'): r_perp_open,
    ('POST', '/api/perp/close'): r_perp_close,
    ('POST', '/api/perp/tpsl'): r_perp_tpsl,
    ('POST', '/api/perp/cancel'): r_perp_cancel,
    ('GET', '/api/perp/orders'): r_perp_orders,
    ('GET', '/api/perp/positions'): r_perp_positions,
    ('GET', '/api/perp/funding'): r_perp_funding,
}

if __name__ == '__main__':
    try:
        load_instruments()
    except Exception as e:
        log.warning('initial instruments load failed: %s', e)
    for fn in (price_loop, lb_loop, funding_loop, inst_loop):
        threading.Thread(target=fn, daemon=True).start()
    host, port = LISTEN.rsplit(':', 1)
    srv = ThreadingHTTPServer((host, int(port)), H)
    srv.daemon_threads = True
    log.info('listening on %s', LISTEN)
    srv.serve_forever()
