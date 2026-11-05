// 导出漏网主机清单，按命中次数降序。运行方式：Dashboard → Scripts → unmatched-export
// 输出到脚本日志：域名 | 次数 | 首次 | 最近 | 端口 | 协议

const KEY = "Chinamax_Unmatched_Hosts_v2";

function fmt(ts) {
    if (!ts) return "-";
    const d = new Date(ts);
    const p = n => (n < 10 ? "0" + n : "" + n);
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate())
        + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

let items = [];
try {
    const v = JSON.parse($persistentStore.read(KEY) || "[]");
    if (Array.isArray(v)) items = v;
} catch (e) { items = []; }

if (!items.length) {
    console.log("[export] empty");
} else {
    items.sort((a, b) => (b.n || 1) - (a.n || 1) || (a.h < b.h ? -1 : a.h > b.h ? 1 : 0));

    console.log("===== UNMATCHED (" + items.length + ", by hits) =====");
    items.forEach(it => {
        console.log([it.h, it.n || 1, fmt(it.t), fmt(it.lt), it.p || "-", it.v || "-"].join(" | "));
    });

    const hot = items.filter(x => (x.n || 1) >= 3);
    console.log("===== HOT (>=3 hits, " + hot.length + ") =====");
    console.log(hot.length ? hot.map(x => "DOMAIN-SUFFIX," + x.h + ",REJECT").join("\n") : "(none)");

    const idle = Date.now() - 7 * 86400000;
    const cold = items.filter(x => (x.n || 1) <= 1 && (x.lt || x.t || 0) < idle);
    console.log("===== COLD (1 hit, idle>7d, " + cold.length + ") =====");
    console.log(cold.length ? cold.map(x => x.h).join(",") : "(none)");
}
$done();
