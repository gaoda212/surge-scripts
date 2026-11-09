// 漏网主机清单（全量备查）。运行：Dashboard → Scripts → unmatched-export
// 输出：按首次出现时间倒序，标注次数与最近活跃时间

const KEY = "Chinamax_Unmatched_Hosts_v2";

function ago(ts) {
    const min = Math.floor((Date.now() - (ts || 0)) / 60000);
    if (min < 1) return "now";
    if (min < 60) return min + "m";
    if (min < 1440) return Math.floor(min / 60) + "h";
    return Math.floor(min / 1440) + "d";
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
    // 按首次出现时间倒序（新发现的在前）
    list.sort((a, b) => (b.t || 0) - (a.t || 0));

    console.log("共 " + list.length + " 个 | 最近 24h 新增 " +
        list.filter(x => Date.now() - (x.t || 0) < 86400000).length + " 个");
    console.log("--------------------------------------------");

    list.forEach(x => {
        const n = x.n || 1;
        console.log(x.h + "\n    " + ago(x.t) + " 起 | " + n + " 次 | 最近 " + ago(x.lt || x.t) + " | " + (x.p || "-"));
    });
    $done({});
}
