# surge-scripts

Surge 脚本：**no-rule**（记录所有未命中规则、最终走 FINAL 的流量）。

## 文件

| 文件 | 作用 |
|---|---|
| `no-rule-shell.js` | 外壳，Surge 实际加载这个（线上名 `no-rule-shell-final.js`）。从远程拉取记录逻辑，30 分钟检查更新 |
| `no-rule-log.js` | 记录逻辑。**改这里**，无需动 Surge 配置 |
| `no-rule-export.js` | 导出清单，手动运行（type=generic） |

## 配置

`[Rule]` 末尾（FINAL 之前）：

```ini
SCRIPT,no-rule-log,"United States"
FINAL,United States,dns-failed
```

`[Script]`：

```ini
no-rule-log = type=rule,script-path=https://raw.githubusercontent.com/gaoda212/surge-scripts/main/no-rule-shell-final.js,debug=true
no-rule-export = type=generic,script-path=https://raw.githubusercontent.com/gaoda212/surge-scripts/main/no-rule-export.js,debug=true
```

**导出脚本用 `type=generic`**，`type=rule` 下很多语句（见下）会炸。

## 原理

脚本返回 `matched:true` 并指定策略名 —— 凡落到 FINAL 的流量都先过它，出口行为不变。

FINAL 命中数会变成 0（被脚本取代），这是正常的。

## 记录格式

存储键 `Chinamax_NoRule_Hosts`，**对象 map**（v2，2026-11-11 起）：

```json
{ "host": { "h": "域名", "t": 首次ms, "lt": 最近ms, "n": 次数, "p": 443, "v": "https" } }
```

容量 8000，超出按最近活跃时间淘汰。过滤：纯 IP、脚本/规则集自身域名、Surge 自身服务域名。

## 导出

```bash
# 输出：TOTAL | 24h | 7d + HOST/FIRST/HITS/LAST 表
```

## Surge 6.100.0 rule 脚本的坑（全部实测确认）

远程脚本（`type=rule`）在 Surge 里跑在受限的 eval 上下文，以下都会让**整个脚本静默抛异常**，日志只留一行 `Evaluating script encountered error: A JavaScript exception occurred (WKErrorDomain:4)`：

1. **任何 `function` 声明** —— 必须写成 `var f = function () {...};`。
2. **`const` / `let` 用数组或对象字面量初始化**（如 `const A = [..]`、`let db = {}`）—— 一律用 `var`。
3. **访问 `$argument`** —— 在 rule 脚本里 `$argument` 是抛异常而不是 undefined；只能 `typeof $argument !== "undefined"` 保护后读。
4. **非 ASCII 字节** —— 源码按原始字节 eval，不做 UTF-8 解码，中文注释即语法错误。**脚本必须纯 ASCII**。
5. **源码里出现完成调用（`$done`）的字面写法** —— Surge 会按"会被调用的脚本"处理（无 request 上下文、后续调用被丢弃）。这解释了为什么脚本能跑但什么都不写。

调 `console.log` 不会进 Surge 日志；验证脚本是否真的执行，用**写 `$persistentStore` 再读出来**的方式。

## 排查

**`Failed to load script: xxx, (null)`** = 资源 `not ready`：

```bash
surge-cli external-resource update all
```

**改脚本后不生效**：Surge 缓存远程脚本，`external-resource update all` 也不一定刷新 —— 换文件名最稳。

**`raw.githubusercontent.com` 有 300 秒 CDN 缓存**，推送后要等（用带随机 query 的 URL 探测）。

**profile 里的脚本段**：`surge-cli profile section set Script <裸 conf 文件路径>`，内容**不要** base64（那是旧用法）。

## 注意

- iOS 版 Surge 访问不到 AppGroup 沙盒，脚本必须走 HTTP(S)。
- `$request` 在 rule 脚本里是全集（hostname/port/scheme/url），但 `port` 是字符串，比较前转 Number。
- 规则脚本返回 `matched:false` 等于跳过该规则。
