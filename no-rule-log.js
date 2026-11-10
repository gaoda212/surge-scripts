// Records every request that matched no rule and fell through to FINAL.
// Loaded by no-rule-log-shell.js. Keep this file pure ASCII:
// Surge evals the raw bytes fetched by httpClient without UTF-8 decoding,
// so non-ASCII comments break the script with a syntax error.
// Rule-eval context quirks (verified on Surge 6.100.0):
// - no function declarations at all (they kill the whole script silently);
// - var only, and no const/let name shared with the shell that eval's this.
// Record format: { h: host, t: firstMs, lt: lastMs, n: hits, p: port, v: scheme }

var KEY_HOSTS   = "Chinamax_NoRule_Hosts";
var KEY_DISABLE = "Chinamax_NoRule_Disabled";
var DEFAULT_MAX = 8000;

// Only exclude things that would self-reference or carry no analysis value:
// 1. the script / rule-set download hosts themselves (recording them loops)
// 2. Surge's own services
var SKIP_SUFFIX = [
    "raw.githubusercontent.com", "cdn.jsdelivr.net", "github.com", "objects.githubusercontent.com",
    "adrules.top", "rule.kelee.one",
    "nssurge.com", "nssurge-inc.com", "surge-activation.com"
];

// A bare IP has no hostname to build a domain rule from.
var SKIP_IP = true;

var isIP = function (h) {
    if (!h) return true;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
    return h.indexOf(":") >= 0 && /^[0-9a-fA-F:.]+$/.test(h);
};

var isSkipped = function (h) {
    for (let i = 0; i < SKIP_SUFFIX.length; i++) {
        var s = SKIP_SUFFIX[i];
        if (h === s || h.slice(-(s.length + 1)) === "." + s) return true;
    }
    return false;
};

// Reading $request explicitly keeps the engine from short-circuiting this
// source when it is eval'ed inside the shell script.
var req = (typeof $request !== "undefined") ? $request : null;

var out = { matched: true, policy: policy };

if (!req) {
    $done(out);
} else if ($persistentStore.read(KEY_DISABLE) === "1") {
    $done(out);
} else {
    var host = req.hostname || "";
    if (!host || (SKIP_IP && isIP(host)) || isSkipped(host)) {
        $done(out);
    } else {
        var now = Date.now();
        var db = {};
        try {
            var raw = $persistentStore.read(KEY_HOSTS);
            if (raw) db = JSON.parse(raw) || {};
        } catch (e) {
            db = {};
        }
        var rec = db[host];
        if (rec) {
            rec.n = (rec.n || 0) + 1;
            rec.lt = now;
            if (req.port) rec.p = Number(req.port) || rec.p;
        } else {
            db[host] = { h: host, t: now, lt: now, n: 1, p: Number(req.port) || 443, v: req.scheme || "" };
        }
        var keys = Object.keys(db);
        if (keys.length > DEFAULT_MAX) {
            keys.sort(function (a, b) { return (db[a].lt || 0) - (db[b].lt || 0); });
            while (keys.length > DEFAULT_MAX) delete db[keys.shift()];
        }
        $persistentStore.write(JSON.stringify(db), KEY_HOSTS);
        $done(out);
    }
}
