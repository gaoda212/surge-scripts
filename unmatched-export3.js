// 漏网主机导出。运行：Dashboard → Scripts → unmatched-export
// 输出：一行摘要 + 域名列表（★ = 重复 3 次以上，建议加规则）

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
    console.log("漏网: empty");
    $done({});
} else {
    list.sort((a, b) => (b.n || 1) - (a.n || 1));
    const hot = list.filter(x => (x.n || 1) >= 3);

    console.log("TOTAL " + list.length + " | HOT " + hot.length);
    list.forEach(x => {
        const n = x.n || 1;
        console.log((n >= 3 ? "★ " : "  ") + x.h + "  x" + n + "  " + ago(x.lt || x.t));
    });

    if (hot.length) {
        console.log("--- add rules ---");
        hot.forEach(x => console.log("DOMAIN-SUFFIX," + x.h + ",REJECT"));
    }
    $done({});
}
