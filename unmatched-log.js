// unmatched-log.js — 记录未被前面任何规则命中的目标（主机名/IP）
// 用法：SCRIPT,unmatched-log,DIRECT 置于 FINAL 之前；脚本返回 matched:false，流量继续由 FINAL 处理
// iOS / Mac 通用：$persistentStore 各端独立存储，Mac 端脚本路径需写绝对路径（见 README）。
const STORE_KEY = "Chinamax_Unmatched_Hosts";
const DISABLED_KEY = "Chinamax_Unmatched_Disabled";
const MAX_HOSTS = 3000;
const host = String($request.hostname || "").trim().toLowerCase();


if (host && !$persistentStore.read(DISABLED_KEY)) {
    let hosts = [];
    try {
        hosts = JSON.parse($persistentStore.read(STORE_KEY) || "[]");
    } catch (e) {
        hosts = [];
    }
    if (!Array.isArray(hosts)) hosts = [];
    if (hosts.indexOf(host) === -1) {
        hosts.push(host);
        // 限制容量，保留最近新增的 3000 个不同主机
        if (hosts.length > MAX_HOSTS) {
            hosts = hosts.slice(-MAX_HOSTS);
        }
        const ok = $persistentStore.write(JSON.stringify(hosts), STORE_KEY);
        if (ok) {
            console.log("[漏网新增] " + host);
        } else {
            console.log("[漏网记录失败] " + host);
        }
    }
}
$done({ matched: false });
