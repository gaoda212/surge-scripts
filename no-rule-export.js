// no-rule-export.js — 导出未命中规则的主机清单
// 运行：Dashboard → Scripts → no-rule-export
// 输出按首次发现时间倒序，一行一个域名

const KEY = "Chinamax_NoRule_Hosts";

// type=generic keeps the full statement support (functions, const), unlike
// type=rule scripts, so this file may stay in the readable style.

function ago(ts) {
    const min = Math.floor((Date.now() - (ts || 0)) / 60000);
    if (min < 1) return "now";
    if (min < 60) return min + "m";
    if (min < 1440) return Math.floor(min / 60) + "h";
    return Math.floor(min / 1440) + "d";
}

function pad(s, n) {
    s = String(s);
    if (s.length > n - 1) s = s.slice(0, n - 2) + "~";
    while (s.length < n) s += " ";
    return s;
}

let list = [];
try {
    const v = JSON.parse($persistentStore.read(KEY) || "null");
    if (v && !Array.isArray(v)) {
        // v2 format: { host: {h,t,lt,n,p,v} }
        Object.keys(v).forEach(k => list.push(v[k]));
    } else if (Array.isArray(v)) {
        list = v;
    }
} catch (e) { list = []; }

if (!list.length) {
    console.log("NO-RULE: empty");
    $done({});
} else {
    list.sort((a, b) => (b.t || 0) - (a.t || 0));

    const d1 = list.filter(x => Date.now() - (x.t || 0) < 86400000).length;
    const d7 = list.filter(x => Date.now() - (x.t || 0) < 604800000).length;

    console.log("NO-RULE TOTAL " + list.length + " | 24h " + d1 + " | 7d " + d7);
    console.log(pad("HOST", 46) + pad("FIRST", 7) + pad("HITS", 7) + "LAST");

    list.forEach(x => {
        const n = x.n || 1;
        const port = (x.p && x.p !== "443") ? " :" + x.p : "";
        console.log(pad(x.h, 46) + pad(ago(x.t), 7) + pad(n + "x", 7) + ago(x.lt || x.t) + port);
    });
    $done({});
}
