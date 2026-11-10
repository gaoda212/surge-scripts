// 记录所有未匹配任何规则、最终走 FINAL 的流量（由 no-rule-log-shell.js 加载）
// 原则：宁多勿缺 —— 只排除"记录本身无意义"的项，其余全部记录，交由后续分析
// 记录格式：{ h: 域名, t: 首次ms, lt: 最近ms, n: 次数, p: 端口, v: 协议 }

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

function run() {
    const out = { matched: true, policy: policy };

    // ---- 调试开始 ----
    console.log("[no-rule][DBG] enter host=" + ($request && $request.hostname) + " url=" + ($request && $request.url));
    if (typeof $request === "undefined") {
        console.log("[no-rule][DBG] NO $request");
        $done(out);
        return;
    }
    if ($persistentStore.read(KEY_DISABLE) === "1") {
        console.log("[no-rule][DBG] disabled");
        $done(out);
        return;
    }
    const host = $request.hostname || "";
    if (!host) {
        console.log("[no-rule][DBG] empty host");
        $done(out);
        return;
    }
    if (SKIP_IP && isIP(host)) {
        console.log("[no-rule][DBG] skip ip " + host);
        $done(out);
        return;
    }
    if (isSkipped(host)) {
        console.log("[no-rule][DBG] skip suffix " + host);
        $done(out);
        return;
    }
    const now = Date.now();
    let db = {};
    try {
        const raw = $persistentStore.read(KEY_HOSTS);
        if (raw) db = JSON.parse(raw) || {};
    } catch (e) {
        console.log("[no-rule][DBG] parse error " + e);
        db = {};
    }
    const rec = db[host];
    if (rec) {
        rec.n = (rec.n || 0) + 1;
        rec.lt = now;
        if ($request.port && rec.p !== $request.port) rec.p = $request.port;
    } else {
        db[host] = { h: host, t: now, lt: now, n: 1, p: $request.port || 443, v: $request.scheme || "" };
    }
    let keys = Object.keys(db);
    if (keys.length > DEFAULT_MAX) {
        keys.sort(function (a, b) { return (db[a].lt || 0) - (db[b].lt || 0); });
        while (keys.length > DEFAULT_MAX) delete db[keys.shift()];
    }
    const ok = $persistentStore.write(JSON.stringify(db), KEY_HOSTS);
    console.log("[no-rule][DBG] saved " + host + " n=" + (db[host] ? db[host].n : "?") + " total=" + Object.keys(db).length + " ok=" + ok);
    // ---- 调试结束 ----

    $done(out);
}

run();
