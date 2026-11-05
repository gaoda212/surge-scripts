# surge-scripts

Surge 脚本。目前只有一组：**unmatched**（漏网流量记录）。

## 文件

| 文件 | 作用 |
|---|---|
| `unmatched-shell.js` | 外壳，Surge 实际加载这个。从远程拉取下面两个逻辑，30 分钟检查更新 |
| `unmatched-log2.js` | 记录逻辑。**改这里**，无需动 Surge 配置 |
| `unmatched-export3.js` | 导出清单，手动运行 |

## 配置

`[Rule]` 末尾：

```ini
SCRIPT,unmatched-log,"United States"
FINAL,United States,dns-failed
```

第二个参数必须与 FINAL 的策略名**完全一致**。

`[Script]`：

```ini
unmatched-log = type=rule,script-path=https://raw.githubusercontent.com/gaoda212/surge-scripts/main/unmatched-shell.js,debug=true
unmatched-export = type=generic,script-path=https://raw.githubusercontent.com/gaoda212/surge-scripts/main/unmatched-export3.js,debug=true
```

## 原理

脚本返回 `matched:true` 并指定策略名，凡被它命中的流量都等同于原本进 FINAL 的流量 —— 不漏一条，出口行为不变。

**`FINAL` 命中数会变成 0**（被脚本取代），这是正常的。用这个确认没有漏记：

```bash
surge-cli dump rule-usage | grep -E 'FINAL|unmatched'
```

## 记录

存储键 `Chinamax_Unmatched_Hosts_v2`：

```json
{ "h": "域名", "t": 首次ms, "lt": 最近ms, "n": 次数, "p": "端口", "v": "协议" }
```

容量 4000，超出丢最早的。

**过滤**：纯 IP/IPv6、8–12 位字母数字且含数字的随机域名、脚本与规则集自身的下载域名（`raw.githubusercontent.com`、`cdn.jsdelivr.net`、`adrules.top`、`rule.kelee.one`）。

随机域名一定要过滤 —— 历史数据显示 2675 条漏网里 **82.8% 是这种一次性域名**，它们能用但不可复现，永远无法用域名规则拦截。

## 导出

运行 `unmatched-export`，输出三组：全量（按次数降序）、HOT（≥3 次，直接给出规则行）、COLD（仅 1 次且 7 天未出现，可清理）。

## 排查

**日志只显示 `Failed to load script: xxx, (null)`**

真正原因是资源 `not ready`，不是缓存问题 —— 重启引擎、改 URL 参数、换文件名都无效：

```bash
surge-cli external-resource list | grep -A1 script   # 看状态
surge-cli external-resource update all               # 修复
```

新加任何远程脚本或规则集后，第一件事就是跑 `update all`。

## 注意

- iOS 版 Surge 访问不到 AppGroup 沙盒，**不能用本地绝对路径**，脚本必须走 HTTP(S)。
- 脚本内 `$request` 只有 `hostname` / `destPort`，**没有** `port` / `scheme`。
- 规则脚本返回 `matched:false` 等于跳过该规则（旧方案记录不全的根因）。
- `raw.githubusercontent.com` 有 300 秒 CDN 缓存，推送后需等待。
