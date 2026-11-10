// no-rule-log-shell.js - stable shell: the logic is fetched remotely so
// changing it never requires reinstalling anything in Surge.
//
// Placement: SCRIPT,no-rule-log,"<FINAL policy name>"
// $argument = the policy name used when traffic falls through to FINAL
//
// Logic source: no-rule-log.js, fetched on first run and cached locally;
// re-checked every 30 minutes, falls back to the cached copy on failure.
// Pure ASCII on purpose (Surge evals raw bytes, no UTF-8 decoding).

const REMOTE_URL = "https://raw.githubusercontent.com/gaoda212/surge-scripts/main/no-rule-log.js";
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
