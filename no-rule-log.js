// Records every request that matched no rule and fell through to FINAL.
// Loaded by no-rule-log-shell.js. Keep this file pure ASCII:
// Surge evals the raw bytes fetched by httpClient without UTF-8 decoding,
// so non-ASCII comments break the script with a syntax error.
// Record format: { h: host, t: firstMs, lt: lastMs, n: hits, p: port, v: scheme }

const KEY_HOSTS   = "Chinamax_NoRule_Hosts";
const KEY_DISABLE = "Chinamax_NoRule_Disabled";
const DEFAULT_MAX = 8000;

// Only exclude things that would self-reference or carry no analysis value:
// 1. the script / rule-set download hosts themselves (recording them loops)
// 2. Surge's own services
const SKIP_SUFFIX = [
    "raw.githubusercontent.com", "cdn.jsdelivr.net", "github.com", "objects.githubusercontent.com",
    "adrules.top", "rule.kelee.one",
    "nssurge.com", "nssurge-inc.com", "surge-activation.com"
];

// A bare IP has no hostname to build a domain rule from.
const SKIP_IP = true;

function isIP(h) {
    if (!h) return true;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
    return h.indexOf(":") >= 0 && /^[0-9a-fA-F:.]+$/.test(h);
}

function isSkipped(h) {
    for (let i = 0; i < SKIP_SUFFIX.length; i++) {
        const s = SKIP_SUFFIX[i];
        if (h === s || h.slice(-(s.length + 1)) === "." + s) return true;
    }
    return false;
}

// Reading $request explicitly keeps the engine from short-circuiting this
// source when it is eval'ed inside the shell script.
const req = (typeof $request !== "undefined") ? $request : null;

const out = { matched: true, policy: policy };

if (!req) {
    $done(out);
} else if ($persistentStore.read(KEY_DISABLE) === "1") {
    $done(out);
} else {
    const host = req.hostname || "";
    if (!host || (SKIP_IP && isIP(host)) || isSkipped(host)) {
        $done(out);
    } else {
        const now = Date.now();
        let db = {};
        try {
            const raw = $persistentStore.read(KEY_HOSTS);
            if (raw) db = JSON.parse(raw) || {};
        } catch (e) {
            db = {};
        }
        const rec = db[host];
        if (rec) {
            rec.n = (rec.n || 0) + 1;
            rec.lt = now;
            if (req.port) rec.p = req.port;
        } else {
            db[host] = { h: host, t: now, lt: now, n: 1, p: req.port || 443, v: req.scheme || "" };
        }
        let keys = Object.keys(db);
        if (keys.length > DEFAULT_MAX) {
            keys.sort(function (a, b) { return (db[a].lt || 0) - (db[b].lt || 0); });
            while (keys.length > DEFAULT_MAX) delete db[keys.shift()];
        }
        $persistentStore.write(JSON.stringify(db), KEY_HOSTS);
        $done(out);
    }
}
