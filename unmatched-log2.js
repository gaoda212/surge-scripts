// 记录所有未匹配任何规则、最终走 FINAL 的流量（由 unmatched-shell.js 加载）
// 记录格式：{ h: 域名, t: 首次ms, lt: 最近ms, n: 次数, p: 端口, v: 协议 }

const KEY_HOSTS   = "Chinamax_Unmatched_Hosts_v2";
const KEY_DISABLE = "Chinamax_Unmatched_Disabled";
const KEY_BURST   = "Chinamax_Unmatched_Burst";
const DEFAULT_MAX = 4000;

// 不记录的域名：自身下载、规则集、Surge 自身服务（误拦会导致 Surge 失效）
const SKIP_SUFFIX = [
    "raw.githubusercontent.com", "cdn.jsdelivr.net", "github.com", "objects.githubusercontent.com",
    "adrules.top", "rule.kelee.one",
    "nssurge.com", "nssurge-inc.com", "surge-activation.com"
];

// 随机域名候选：8-12 位小写字母数字 + 短后缀
const RANDOM_RE = /^[a-z0-9]{8,12}\.(com|co|net|us|jp|io|xyz|top|vip|cc|org|info|site|shop)$/;
// 明显随机：含数字，或元音极少
function looksRandom(h) {
    if (!RANDOM_RE.test(h)) return false;
    const label = h.split(".")[0];
    if (/\d/.test(label)) return true;
    const vowels = (label.match(/[aeiou]/g) || []).length;
    return vowels / label.length < 0.25;
}

// 突发检测：同一分钟内新增超过 BURST 个陌生主机 → 判定为批量泛解析，全部丢弃
const BURST_WINDOW = 60000;
const BURST_LIMIT  = 8;

function isIP(h) {
    if (!h) return true;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
    return h.indexOf(":") >= 0 && /^[0-9a-fA-F:.]+$/.test(h);
}

function isSkipped(h) {
    for (let i = 0; i < SKIP_SUFFIX.length; i++) {
        const s = SKIP_SUFFIX[i];
        if (h === s || h.slice(-(s.length + 1)) === "." + s) return true;
    }
    return false;
}

const req  = $request || {};
const host = String(req.hostname || "").trim().toLowerCase().replace(/\.$/, "");
const port = String(req.destPort || req.port || "");
const proto = String((port === "443" ? "HTTPS" : "")).toUpperCase();

if (host && !isIP(host) && !isSkipped(host) && !$persistentStore.read(KEY_DISABLE)) {

    let list = [];
    try {
        const v = JSON.parse($persistentStore.read(KEY_HOSTS) || "[]");
        if (Array.isArray(v)) list = v;
    } catch (e) { list = []; }

    const now = Date.now();
    let hit = null;
    let newCount = 0;
    for (let i = 0; i < list.length; i++) {
        if (!list[i]) continue;
        if (list[i].h === host) { hit = list[i]; }
        if (now - (list[i].t || 0) < BURST_WINDOW) newCount++;
    }

    const random = looksRandom(host);

    // 已存在：正常计数（随机域名也计数，便于事后观察）
    if (hit) {
        hit.n = (hit.n || 1) + 1;
        hit.lt = now;
    } else {
        // 新增：过滤随机域名；若这一分钟已经涌入大量新主机，则视为突发丢弃
        if (random) {
            // 不记录
        } else if (newCount >= BURST_LIMIT) {
            $persistentStore.write(String(now), KEY_BURST);
        } else {
            list.push({ h: host, t: now, lt: now, n: 1, p: port, v: proto });
            console.log("[unmatched] " + host);
        }
    }

    if (list.length > DEFAULT_MAX) list = list.slice(-DEFAULT_MAX);
    $persistentStore.write(JSON.stringify(list), KEY_HOSTS);
}

// 兜底策略必须与 FINAL 一致，由规则行第二参数传入
const policy = ($argument && String($argument).trim()) || "DIRECT";
$done({ matched: true, policy: policy });
