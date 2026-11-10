// no-rule-shell.js — 稳定外壳：逻辑从远程拉取，改动无需重装 Surge
//
// 放置：SCRIPT,no-rule-log,"<FINAL的策略名>"
// $argument = 落到 FINAL 时使用的策略名（必须与 FINAL 一致）
//
// 逻辑来源：no-rule-log.js；首次从远程拉取并缓存在本地，
// 每 30 分钟检查一次更新，失败则继续用本地缓存。

const REMOTE_URL = "https://cdn.jsdelivr.net/gh/gaoda212/surge-scripts@main/no-rule-log.js";
const K_SRC      = "Chinamax_NoRule_ShellSrc";
const K_CHECKED  = "Chinamax_NoRule_ShellChecked";
const TTL        = 30 * 60 * 1000;

const policy = ($argument && String($argument).trim()) || "DIRECT";

function runSource(src) {
    try {
        eval(src);
    } catch (err) {
        console.log("[no-rule-shell] eval error: " + err);
        $done({ matched: true, policy: policy });
    }
}

const cached = $persistentStore.read(K_SRC);
const lastCheck = parseInt($persistentStore.read(K_CHECKED) || "0", 10) || 0;
const needCheck = !cached || (Date.now() - lastCheck > TTL);

if (!needCheck) {
    runSource(cached);
} else {
    $persistentStore.write(String(Date.now()), K_CHECKED);
    $httpClient.get({ url: REMOTE_URL, timeout: 8 }, function (err, resp, data) {
        if (!err && data) {
            $persistentStore.write(data, K_SRC);
            runSource(data);
        } else if (cached) {
            runSource(cached);
        } else {
            console.log("[no-rule-shell] no source: " + err);
            $done({ matched: true, policy: policy });
        }
    });
}
