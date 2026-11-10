// 漏网主机清单（全量备查）。运行：Dashboard → Scripts → unmatched-export
// 输出：一行一个域名，按首次发现时间倒序
//   域名                 首见   次数  最近     端口(仅非443显示)

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
    const day = list.filter(x => Date.now() - (x.t || 0) < 86400000).length;

    console.log("TOTAL " + list.length + " | new in 24h " + day);
    console.log(pad("HOST", 44) + pad("FIRST", 7) + pad("HITS", 7) + "LAST");

    list.forEach(x => {
        const n = x.n || 1;
        const port = (x.p && x.p !== "443") ? " :" + x.p : "";
        console.log(pad(x.h, 44) + pad(ago(x.t), 6) + pad(n + "x", 7) + ago(x.lt || x.t) + port);
    });
    $done({});
}
