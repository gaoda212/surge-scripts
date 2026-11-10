// no-rule-log-shell.js - stable shell: the logic is fetched remotely so
// changing it never requires reinstalling anything in Surge.
//
// Placement: SCRIPT,no-rule-log,"<FINAL policy name>"
// $argument = the policy name used when traffic falls through to FINAL
//
// Logic source: no-rule-log.js, fetched on first run and cached locally;
// re-checked every 30 minutes, falls back to the cached copy on failure.
//
// Three engine quirks of Surge's rule-eval context, all verified on 6.100.0:
//   1. Pure ASCII only - the source is eval'ed as raw bytes, no UTF-8 decoding.
//   2. No `function` declarations - any one of them makes the whole script
//      throw, and Surge swallows the error (only "WKErrorDomain:4" in the log).
//      Use function expressions or arrow functions assigned to a var.
//   3. No top-level const/let sharing a name with the eval'ed logic; use var.

var REMOTE_URL = "https://raw.githubusercontent.com/gaoda212/surge-scripts/main/no-rule-log.js";
var K_SRC      = "Chinamax_NoRule_ShellSrc";
var K_CHECKED  = "Chinamax_NoRule_ShellChecked";
var TTL        = 30 * 60 * 1000;

var policy = ($argument && String($argument).trim()) || "DIRECT";

var runSource = function (src) {
    try {
        eval(src);
    } catch (err) {
        console.log("[no-rule-shell] eval error: " + err);
        $done({ matched: true, policy: policy });
    }
};

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
