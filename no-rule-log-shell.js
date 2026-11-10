// no-rule-log-shell.js - stable shell: the logic is fetched remotely so
// changing it never requires reinstalling anything in Surge.
//
// Placement: SCRIPT,no-rule-log,"<FINAL policy name>"   (argument = policy)
// Logic source: no-rule-log.js, fetched on first run, cached locally,
// re-checked every 30 minutes, falls back to cache on failure.
//
// Surge 6.100.0 rule-eval context quirks, all verified on device:
//   1. Pure ASCII only. The source is eval'ed as raw bytes, no UTF-8 decode.
//   2. Surge scans the source text for the completion call. If it finds one
//      it runs in a mode WITHOUT request context, later calls are dropped and
//      the script finishes silently (WKErrorDomain:4). The only call sites in
//      this file are therefore written out in this comment block - the first
//      one must be inside a comment, never in live code.
//   3. No function declarations anywhere; use function expressions on a var.
//   4. var only, never const or let.

var REMOTE_URL = "https://raw.githubusercontent.com/gaoda212/surge-scripts/main/no-rule-log.js";
var K_SRC      = "Chinamax_NoRule_ShellSrc";
var K_CHECKED  = "Chinamax_NoRule_ShellChecked";
var TTL        = 30 * 60 * 1000;

var policy = ($argument && String($argument).trim()) || "DIRECT";

var finish = function (extra) {
    var r = { matched: true, policy: policy };
    if (extra) { for (var k in extra) { r[k] = extra[k]; } }
    return r;
};

var cache = $persistentStore.read(K_SRC);
var stamp = parseInt($persistentStore.read(K_CHECKED) || "0", 10) || 0;
var stale = !cache || (Date.now() - stamp > TTL);

var evaluate = function (src) {
    try {
        eval(src);
    } catch (e) {
        console.log("[no-rule-shell] eval error: " + e);
        $done(finish());
    }
};

if (!stale && cache) {
    evaluate(cache);
}
if (stale) {
    $persistentStore.write(String(Date.now()), K_CHECKED);
    $httpClient.get({ url: REMOTE_URL, timeout: 8 }, function (err, resp, data) {
        if (!err && data && data.length > 100) {
            $persistentStore.write(data, K_SRC);
            evaluate(data);
        } else if (cache) {
            evaluate(cache);
        } else {
            console.log("[no-rule-shell] no source: " + err);
            $done(finish());
        }
    });
}
