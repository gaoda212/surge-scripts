// 记录所有未匹配任何规则、最终走 FINAL 的流量（由 no-rule-shell.js 加载）
// 原则：宁多勿缺 —— 只排除"记录本身无意义"的项，其余全部记录，交由后续分析
// 记录格式：{ h: 域名, t: 首次ms, lt: 最近ms, n: 次数, p: 端口 }

const KEY_HOSTS   = "Chinamax_NoRule_Hosts";
const KEY_DISABLE = "Chinamax_NoRule_Disabled";
const DEFAULT_MAX = 8000;

// 唯一排除项：会造成自引用或纯噪声
//   1. 脚本/规则集自身的下载地址（记录会造成循环）
//   2. Surge 自身服务（记录无分析价值）
const SKIP_SUFFIX = [
    "raw.githubusercontent.com", "cdn.jsdelivr.net", "github.com", "objects.githubusercontent.com",
    "adrules.top", "rule.kelee.one",
    "nssurge.com", "nssurge-inc.com", "surge-activation.com"
];

// 纯 IP 无域名信息，无法用于域名规则分析
const SKIP_IP = true;

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

const skipThis = !host
    || isSkipped(host)
    || (SKIP_IP && isIP(host))
    || $persistentStore.read(KEY_DISABLE);

if (!skipThis) {
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
        list.push({ h: host, t: now, lt: now, n: 1, p: port });
        console.log("[no-rule] " + host);
    }

    if (list.length > DEFAULT_MAX) list = list.slice(-DEFAULT_MAX);
    $persistentStore.write(JSON.stringify(list), KEY_HOSTS);
}

// 兜底策略必须与 FINAL 一致，由规则行第二参数传入
const policy = ($argument && String($argument).trim()) || "DIRECT";
$done({ matched: true, policy: policy });
