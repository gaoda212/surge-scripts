// 记录所有未匹配任何规则、最终走 FINAL 的流量（由 unmatched-shell.js 加载）
// 记录格式：{ h: 域名, t: 首次ms, lt: 最近ms, n: 次数, p: 端口, v: 协议 }

const KEY_HOSTS   = "Chinamax_Unmatched_Hosts_v2";
const KEY_DISABLE = "Chinamax_Unmatched_Disabled";
const KEY_MAX     = "Chinamax_Unmatched_Max";
const DEFAULT_MAX = 4000;

// 脚本自身下载域名，记录会造成自引用
const SELF_HOSTS = ["raw.githubusercontent.com", "cdn.jsdelivr.net", "github.com", "objects.githubusercontent.com"];

// 8-12 位字母数字且含数字 → 一次性随机域名
const RANDOM_RE = /^[a-z0-9]{8,12}\.(com|co|net|us|jp|io|xyz|top|vip|cc|org|info|site|shop)$/;

function isIP(h) {
    if (!h) return true;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
    return h.indexOf(":") >= 0 && /^[0-9a-fA-F:.]+$/.test(h);
}

const req  = $request || {};
const host = String(req.hostname || "").trim().toLowerCase().replace(/\.$/, "");
const port = String(req.destPort || req.port || "");
const proto = String((port === "443" ? "HTTPS" : "")).toUpperCase();

if (host && !isIP(host) && SELF_HOSTS.indexOf(host) < 0
    && !(RANDOM_RE.test(host) && /\d/.test(host.split(".")[0]))
    && !$persistentStore.read(KEY_DISABLE)) {

    let list = [];
    try {
        const v = JSON.parse($persistentStore.read(KEY_HOSTS) || "[]");
        if (Array.isArray(v)) list = v;
    } catch (e) { list = []; }

    const now = Date.now();
    let hit = null;
    for (let i = 0; i < list.length; i++) {
        if (list[i] && list[i].h === host) { hit = list[i]; break; }
    }

    if (hit) {
        hit.n = (hit.n || 1) + 1;
        hit.lt = now;
    } else {
        list.push({ h: host, t: now, lt: now, n: 1, p: port, v: proto });
        console.log("[unmatched] " + host);
    }

    let cap = parseInt($persistentStore.read(KEY_MAX) || "", 10);
    if (!cap || cap < 100) cap = DEFAULT_MAX;
    if (list.length > cap) list = list.slice(-cap);

    if (!$persistentStore.write(JSON.stringify(list), KEY_HOSTS)) {
        console.log("[unmatched] write failed: " + host);
    }
}

// 兜底策略必须与 FINAL 一致，由规则行第二参数传入
const policy = ($argument && String($argument).trim()) || "DIRECT";
$done({ matched: true, policy: policy });
