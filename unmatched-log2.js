// 记录所有未匹配任何规则、最终走 FINAL 的流量（由 unmatched-shell.js 加载）
// 记录格式：{ h: 域名, t: 首次ms, lt: 最近ms, n: 次数, p: 端口 }

const KEY_HOSTS   = "Chinamax_Unmatched_Hosts_v2";
const KEY_DISABLE = "Chinamax_Unmatched_Disabled";
const DEFAULT_MAX = 4000;

// 不记录的域名：脚本/规则集下载、Surge 自身服务
const SKIP_SUFFIX = [
    "raw.githubusercontent.com", "cdn.jsdelivr.net", "github.com", "objects.githubusercontent.com",
    "adrules.top", "rule.kelee.one",
    "nssurge.com", "nssurge-inc.com", "surge-activation.com"
];

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

// 判断单个域名标签（label）是否像机器随机生成
// 返回 true = 随机，false = 像正常单词/品牌
function randomLabel(label) {
    // 1. 含连续 5 个以上辅音（4 个会误伤 mtcaptcha 这类复合词）：几乎不可能是真实单词
    if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(label)) return true;
    // 2. 无元音
    if (!/[aeiouy]/.test(label)) return true;
    // 3. 键盘横向连敲（qwerty / asdfgh / zxcvb 等）
    if (/qwer|wert|erty|rtyu|tyui|asdf|sdfg|dfgh|fghj|ghjk|hjkl|zxcv|xcvb|cvbn|vbnm/.test(label)) return true;
    // 4. 字母数字混杂的 10 位以上随机串
    if (/^[a-z0-9]{10,}$/.test(label)) {
        const digits = (label.match(/\d/g) || []).length;
        if (digits >= 2 && digits <= 8) return true;
    }
    return false;
}

// 主判断：整条主机名是否是随机域名
function isRandomHost(h) {
    const parts = h.split(".");
    if (parts.length < 2) return false;
    const tld = parts[parts.length - 1];
    const main = parts[parts.length - 2];   // 主域

    // 只看短后缀，避免误伤 .com.cn 这类
    const SHORT_TLD = ["com", "co", "net", "us", "jp", "io", "xyz", "top", "vip", "cc",
                       "org", "info", "site", "shop", "uk", "me", "tv", "biz", "pro"];
    if (SHORT_TLD.indexOf(tld) < 0) return false;

    // 主域必须是 8-13 位纯字母数字才可能是随机串
    if (!/^[a-z0-9]{8,13}$/.test(main)) return false;
    return randomLabel(main);
}

const req  = $request || {};
const host = String(req.hostname || "").trim().toLowerCase().replace(/\.$/, "");
const port = String(req.destPort || req.port || "");

if (host && !isIP(host) && !isSkipped(host) && !isRandomHost(host)
    && !$persistentStore.read(KEY_DISABLE)) {

    let list = [];
    try {
        const v = JSON.parse($persistentStore.read(KEY_HOSTS) || "[]");
        if (Array.isArray(v)) list = v;
    } catch (e) { list = []; }

    const now = Date.now();
    let hit = null;
    for (let i = 0; i < list.length; i++) {
        if (list[i] && list[i].h === host) { hit = list[i]; break; }
    }

    if (hit) {
        hit.n = (hit.n || 1) + 1;
        hit.lt = now;
    } else {
        list.push({ h: host, t: now, lt: now, n: 1, p: port });
        console.log("[unmatched] " + host);
    }

    if (list.length > DEFAULT_MAX) list = list.slice(-DEFAULT_MAX);
    $persistentStore.write(JSON.stringify(list), KEY_HOSTS);
}

// 兜底策略必须与 FINAL 一致，由规则行第二参数传入
const policy = ($argument && String($argument).trim()) || "DIRECT";
$done({ matched: true, policy: policy });
