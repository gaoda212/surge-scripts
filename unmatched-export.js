// unmatched-export.js
// 手动运行（Dashboard → Scripts → unmatched-export，或 surge-cli script evaluate）
// 结果输出到脚本日志：~/Library/Logs/Surge/Scripts/unmatched-export-YYYY-MM-DD.log
const STORE_KEY = "Chinamax_Unmatched_Hosts";
let hosts = [];
try {
    hosts = JSON.parse($persistentStore.read(STORE_KEY) || "[]");
} catch (e) {
    hosts = [];
}
if (!Array.isArray(hosts) || hosts.length === 0) {
    console.log("[漏网导出] 暂无记录");
} else {
    hosts.sort();
    console.log("===== Chinamax 漏网主机列表 =====");
    hosts.forEach(function (host) {
        console.log(host);
    });
    console.log("===== 共 " + hosts.length + " 条 =====");
}
$done();
