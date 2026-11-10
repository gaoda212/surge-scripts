// no-rule-log-shell.js - stable shell: the logic is fetched remotely so
// changing it never requires reinstalling anything in Surge.
//
// Placement: SCRIPT,no-rule-log,script-path=<this file>,debug=true
// The fall-through policy is hardcoded in FALLBACK_POLICY below. It must stay
// in sync with the FINAL rule of the profile.
//
// Logic source: no-rule-log.js, fetched on first run, cached locally,
// re-checked every 30 minutes, falls back to cache on failure.
//
// Surge 6.100.0 rule-eval context, verified on device with probe scripts:
//   1. Pure ASCII only - the source is eval'ed as raw bytes, no UTF-8 decode.
//   2. Touching $argument in a rule script throws and kills the script, so it
//      is only ever read behind a typeof guard.
//   3. The source is scanned for a completion call; if one is found the script
//      runs without request context and finishes silently (WKErrorDomain:4).
//      The call sites below are the only live ones - keep it that way and do
//      not add one earlier in the file.
//   4. No function declarations; function expressions on a var only.
//   5. var only, never const or let.

var FALLBACK_POLICY = "United States";
var REMOTE_URL = "https://raw.githubusercontent.com/gaoda212/surge-scripts/main/no-rule-log.js";
var K_SRC      = "Chinamax_NoRule_ShellSrc";
var K_CHECKED  = "Chinamax_NoRule_ShellChecked";
var TTL        = 30 * 60 * 1000;

var policy = FALLBACK_POLICY;
if (typeof $argument !== "undefined" && $argument) {
    policy = String($argument).trim() || FALLBACK_POLICY;
}

var done = function () {
    return { matched: true, policy: policy };
};

var evaluate = function (src) {
    try {
        eval(src);
    } catch (e) {
        console.log("[no-rule-shell] eval error: " + e);
        $done(done());
    }
};

var cache = $persistentStore.read(K_SRC);
var stamp = parseInt($persistentStore.read(K_CHECKED) || "0", 10) || 0;
var stale = !cache || !cache.length || (Date.now() - stamp > TTL);

if (!stale) {
    evaluate(cache);
}
if (stale) {
    $persistentStore.write(String(Date.now()), K_CHECKED);
    $httpClient.get({ url: REMOTE_URL, timeout: 8 }, function (err, resp, data) {
        if (!err && data && data.length > 100) {
            $persistentStore.write(data, K_SRC);
            evaluate(data);
        } else if (cache && cache.length) {
            evaluate(cache);
        } else {
            console.log("[no-rule-shell] no source: " + err);
            $done(done());
        }
    });
}
