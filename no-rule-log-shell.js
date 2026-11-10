// no-rule-log-shell.js - stable shell: the logic is fetched remotely so
// changing it never requires reinstalling anything in Surge.
//
// Placement: SCRIPT,no-rule-log,"<FINAL policy name>"
// $argument = the policy name used when traffic falls through to FINAL
//
// Logic source: no-rule-log.js, fetched on first run and cached locally;
// re-checked every 30 minutes, falls back to the cached copy on failure.
// Pure ASCII on purpose (Surge evals raw bytes, no UTF-8 decoding).
// Only var here: the logic is eval'ed into this same scope, and a repeated
// top-level const/let declaration throws a SyntaxError that Surge swallows.

var REMOTE_URL = "https://raw.githubusercontent.com/gaoda212/surge-scripts/main/no-rule-log.js";
var K_SRC      = "Chinamax_NoRule_ShellSrc";
var K_CHECKED  = "Chinamax_NoRule_ShellChecked";
var TTL        = 30 * 60 * 1000;

var policy = ($argument && String($argument).trim()) || "DIRECT";

function runSource(src) {
    try {
        eval(src);
    } catch (err) {
        console.log("[no-rule-shell] eval error: " + err);
        $done({ matched: true, policy: policy });
    }
}

var cached = $persistentStore.read(K_SRC);
var lastCheck = parseInt($persistentStore.read(K_CHECKED) || "0", 10) || 0;
var needCheck = !cached || (Date.now() - lastCheck > TTL);

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
