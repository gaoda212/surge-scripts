// unmatched-export.js v2 — 导出漏网主机清单（按命中次数降序）
// 用法：Dashboard → Scripts → 运行，或 surge-cli script evaluate
// 输出：脚本日志，形如
//   ## 主机 | 次数 | 首次 | 最近 | 端口 | 协议
const KEY        = "Chinamax_Unmatched_Hosts_v2";
const KEY_KEEP   = "Chinamax_Unmatched_Keep";   // 可选：要清理保留的域名，逗号分隔

function fmt(ts) {
    if (!ts) return "-";
    const d = new Date(ts);
    const p = n => (n < 10 ? "0" + n : "" + n);
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

let list = [];
try {
    const v = JSON.parse($persistentStore.read(KEY) || "[]");
    if (Array.isArray(v)) list = v;
} catch (e) { list = []; }

if (!list.length) {
    console.log("[漏网导出] 暂无记录");
} else {
    const keep = String($persistentStore.read(KEY_KEEP) || "").split(",").map(s => s.trim()).filter(Boolean);
    let items = list.map(x => ({ h: x.h || x, n: x.n || 1, t: x.t || 0, lt: x.lt || x.t || 0, p: x.p || "", v: x.v || "" }));
    items.sort((a, b) => (b.n - a.n) || (a.h < b.h ? -1 : a.h > b.h ? 1 : 0));

    console.log("===== UNMATCHED HOSTS (" + items.length + ", sorted by hits) =====");
    items.forEach(function (it) {
        console.log(it.h + " | " + it.n + " | " + fmt(it.t) + " | " + fmt(it.lt) + " | " + (it.p || "-") + " | " + (it.v || "-"));
    });

    // 只出现一次、且最近没再出现的「噪声候选」——可考虑从库中删除
    const cutoff = Date.now() - 7 * 86400000;
    const cold = items.filter(x => x.n <= 1 && x.lt < cutoff);
    console.log("===== COLD (hits<=1, idle>7d, " + cold.length + ") =====");
    console.log(cold.length ? cold.map(x => x.h).join(",") : "(无)");

    // 高频（≥3 次）：优先加规则
    const hot = items.filter(x => x.n >= 3);
    console.log("===== HOT (hits>=3, " + hot.length + ") =====");
    console.log(hot.length ? hot.map(x => "DOMAIN-SUFFIX," + x.h).join("\n") : "(无)");

    if (keep.length) console.log("[keep] " + keep.length + " domains: " + keep.join(","));
}
$done();
