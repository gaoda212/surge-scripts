// unmatched-log.js v2 — 记录所有"没有匹配到任何规则、最终会走 FINAL"的目标
//
// 原理：放在规则列表最后（FINAL 之前），脚本返回 matched:true + policy=FINAL 的策略，
// 因此凡是走到这里的流量都等同于原本要进 FINAL 的流量 —— 一个不漏，且行为与 FINAL 一致。
//
// 放置：SCRIPT,unmatched-log,<FINAL的策略名>
// 例：  SCRIPT,unmatched-log,United States
//       FINAL,United States,dns-failed
//
// 过滤：随机生成的短域名（如 cokfdmgqpv1.com）不记录，避免挤占容量
// 记录：{ h: host, t: 首次时间(ms), n: 次数, p: 端口, v: 协议 }

const KEY_HOSTS   = "Chinamax_Unmatched_Hosts_v2";
const KEY_DISABLE = "Chinamax_Unmatched_Disabled";
const KEY_MAX     = "Chinamax_Unmatched_Max";     // 可选：自定义容量，默认 4000
const DEFAULT_MAX = 4000;

// ---- 过滤规则 ----
// 1. 纯 IP / IPv6 / 内网
function isIP(h) {
    if (!h) return true;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
    if (h.indexOf(":") >= 0 && /^[0-9a-fA-F:.]+$/.test(h)) return true;
    return false;
}
// 2. 随机域名：8-12 位字母数字主域 + 短后缀，且含数字
const RANDOM_RE = /^[a-z0-9]{8,12}\.(com|co|net|us|jp|io|xyz|top|vip|cc|org|info|site|shop)$/;
function isRandom(h) {
    if (!RANDOM_RE.test(h)) return false;
    return /\d/.test(h.split(".")[0]);
}

// ---- 读取 ----
function readList() {
    const raw = $persistentStore.read(KEY_HOSTS);
    if (!raw) return [];
    try {
        const v = JSON.parse(raw);
        return Array.isArray(v) ? v : [];
    } catch (e) {
        return [];
    }
}

const req = $request || {};
let host = String(req.hostname || "").trim().toLowerCase().replace(/\.$/, "");
let port = req.port || "";
const proto = String(req.scheme || req.protocol || "").toUpperCase();

// 自我保护：脚本自身、导出脚本的下载域名绝不能落到本脚本（否则首次加载时死循环）
const SELF_HOSTS = ["raw.githubusercontent.com", "cdn.jsdelivr.net", "github.com", "objects.githubusercontent.com"];

// ---- 记录 ----
if (host && !$persistentStore.read(KEY_DISABLE) && SELF_HOSTS.indexOf(host) < 0 && !isIP(host) && !isRandom(host)) {
    let list = readList();
    const now = Date.now();
    let idx = -1;
    for (let i = 0; i < list.length; i++) {
        if (list[i] && list[i].h === host) { idx = i; break; }
    }
    if (idx >= 0) {
        list[idx].n = (list[idx].n || 1) + 1;
        list[idx].lt = now;
        if (port && !list[idx].p) list[idx].p = port;
        if (proto && !list[idx].v) list[idx].v = proto;
    } else {
        list.push({ h: host, t: now, lt: now, n: 1, p: port || "", v: proto || "" });
        console.log("[漏网新增] " + host);
    }
    let cap = parseInt($persistentStore.read(KEY_MAX) || "", 10);
    if (!cap || cap < 100) cap = DEFAULT_MAX;
    if (list.length > cap) list = list.slice(-cap);
    const ok = $persistentStore.write(JSON.stringify(list), KEY_HOSTS);
    if (!ok) console.log("[漏网记录失败] " + host);
}

// ---- 兜底：匹配并交给 FINAL 的策略 ----
const policy = (typeof $argument !== "undefined" && $argument && String($argument).trim()) ? String($argument).trim() : "DIRECT";
$done({ matched: true, policy: policy });
