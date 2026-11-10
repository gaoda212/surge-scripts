// no-rule-export.js - AUTOMATED export (type=cron, every 6 hours).
//
// Runs on a schedule, no button pressing. Two outputs:
//   1. a persistent report in Chinamax_NoRule_Report (read it any time)
//   2. a notification when NEW hosts appeared since the previous run
//
// This file uses only var / function expressions and var-introduced helpers,
// but as a cron script it gets the full statement context, so regular
// function declarations and const are fine here. Keep it ASCII anyway for
// consistency with the rest of the repo.

var KEY_HOSTS  = "Chinamax_NoRule_Hosts";
var KEY_REPORT = "Chinamax_NoRule_Report";
var KEY_SEEN   = "Chinamax_NoRule_Seen";
var TOP_N      = 40;

var ago = function (ts) {
    var min = Math.floor((Date.now() - (ts || 0)) / 60000);
    if (min < 1) return "now";
    if (min < 60) return min + "m";
    if (min < 1440) return Math.floor(min / 60) + "h";
    return Math.floor(min / 1440) + "d";
};

var pad = function (s, n) {
    s = String(s);
    if (s.length > n - 1) s = s.slice(0, n - 2) + "~";
    while (s.length < n) s += " ";
    return s;
};

var main = function () {
    var list = [];
    try {
        var raw = $persistentStore.read(KEY_HOSTS);
        var v = JSON.parse(raw || "null");
        if (v && !Array.isArray(v)) {
            Object.keys(v).forEach(function (k) { list.push(v[k]); });
        } else if (Array.isArray(v)) {
            list = v;
        }
    } catch (e) {
        list = [];
    }

    var now = Date.now();
    var lines = [];
    var total = list.length;

    if (!total) {
        lines.push("NO-RULE | no unmatched hosts recorded");
        $persistentStore.write(lines.join("\n"), KEY_REPORT);
        $done({});
        return;
    }

    list.sort(function (a, b) { return (b.t || 0) - (a.t || 0); });

    var d1 = 0;
    var d7 = 0;
    for (var i = 0; i < list.length; i++) {
        var age = now - (list[i].t || 0);
        if (age < 86400000) d1++;
        if (age < 604800000) d7++;
    }

    // New hosts = anything first seen since the previous run
    var seen = {};
    try { seen = JSON.parse($persistentStore.read(KEY_SEEN) || "{}") || {}; } catch (e) { seen = {}; }
    var fresh = list.filter(function (x) { return !seen[x.h]; });
    var nextSeen = {};
    list.forEach(function (x) { nextSeen[x.h] = 1; });

    lines.push("NO-RULE " + new Date().toISOString().replace("T", " ").slice(0, 16) +
               " | TOTAL " + total + " | 24h " + d1 + " | 7d " + d7 + " | NEW " + fresh.length);
    lines.push(pad("HOST", 46) + pad("FIRST", 7) + pad("HITS", 6) + "LAST");

    list.slice(0, TOP_N).forEach(function (x) {
        var port = (x.p && Number(x.p) !== 443) ? " :" + x.p : "";
        lines.push(pad(x.h, 46) + pad(ago(x.t), 7) + pad((x.n || 1) + "x", 6) + ago(x.lt || x.t) + port);
    });
    if (total > TOP_N) {
        lines.push("... " + (total - TOP_N) + " more (full list in " + KEY_HOSTS + ")");
    }

    var report = lines.join("\n");
    $persistentStore.write(report, KEY_REPORT);
    $persistentStore.write(JSON.stringify(nextSeen), KEY_SEEN);
    console.log(report);

    // Notify only when something new turned up, and never spam more than 5 names
    if (fresh.length > 0) {
        var names = fresh.slice(0, 5).map(function (x) { return x.h; }).join(", ");
        if (fresh.length > 5) names += " +" + (fresh.length - 5);
        $notification.post("no-rule: " + fresh.length + " new host(s)",
                           "TOTAL " + total + " | 24h " + d1, names);
    }

    $done({});
};

main();
