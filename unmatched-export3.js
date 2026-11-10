// 漏网主机清单（全量）。运行：Dashboard → Scripts → unmatched-export
// 输出按首次发现时间倒序，一行一个域名
//   HOST  首见时间  次数  最近活跃  端口(非443才显示)

const KEY = "Chinamax_Unmatched_Hosts_v2";

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
    const v = JSON.parse($persistentStore.read(KEY) || "[]");
    if (Array.isArray(v)) list = v;
} catch (e) { list = []; }

if (!list.length) {
    console.log("empty");
    $done({});
} else {
    list.sort((a, b) => (b.t || 0) - (a.t || 0));

    const d1 = list.filter(x => Date.now() - (x.t || 0) < 86400000).length;
    const d7 = list.filter(x => Date.now() - (x.t || 0) < 604800000).length;

    console.log("TOTAL " + list.length + " | 24h " + d1 + " | 7d " + d7);
    console.log(pad("HOST", 46) + pad("FIRST", 7) + pad("HITS", 7) + "LAST");

    list.forEach(x => {
        const n = x.n || 1;
        const port = (x.p && x.p !== "443") ? " :" + x.p : "";
        console.log(pad(x.h, 46) + pad(ago(x.t), 7) + pad(n + "x", 7) + ago(x.lt || x.t) + port);
    });
    $done({});
}
