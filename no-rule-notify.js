// no-rule-notify.js - runs as an event script after the cron report.
// Notifies only when the report says NEW > 0, so a quiet night stays quiet.
var KEY_REPORT = "Chinamax_NoRule_Report";
var r = $persistentStore.read(KEY_REPORT) || "";
var m = r.match(/NEW (\d+)/);
var n = m ? parseInt(m[1], 10) : 0;
if (n > 0) {
    var head = r.split("\n")[0];
    var names = r.split("\n").slice(2, 5).map(function (l) { return l.slice(0, 40).trim(); }).join(", ");
    $notification.post("no-rule: " + n + " new host(s)", head, names);
}
$done({});
