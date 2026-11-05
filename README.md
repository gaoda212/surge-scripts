# surge-scripts

Surge 脚本集合。

## unmatched — 漏网流量记录

记录**所有没有匹配到任何规则、最终会走 FINAL 的流量**，按域名聚合统计。

### 文件

| 文件 | 作用 |
|---|---|
| `unmatched-shell.js` | 稳定外壳（Surge 实际加载这个），从远程拉取下面的逻辑并按 30 分钟检查更新 |
| `unmatched-log2.js` | 真正的记录逻辑，改这里即可，无需改 Surge 配置 |
| `unmatched-export3.js` | 导出清单，手动运行 |

### 配置

`[Rule]` 段，**放在最后，紧邻 FINAL 之前**：

```
SCRIPT,unmatched-log,"United States"
FINAL,United States,dns-failed
```

第二个参数必须与 FINAL 的策略名**完全一致**。

`[Script]` 段：

```
unmatched-log = type=rule,script-path=https://raw.githubusercontent.com/gaoda212/surge-scripts/main/unmatched-shell.js,debug=true
unmatched-export = type=generic,script-path=https://raw.githubusercontent.com/gaoda212/surge-scripts/main/unmatched-export3.js,debug=true
```

### 原理

脚本返回 `matched:true` 并指定策略名，因此凡是被它命中的流量都等同于原本进 FINAL 的流量 —— 一条不漏，且出口行为不变。

`FINAL` 的命中次数会变成 0（被脚本取代），这是正常现象。

### 记录格式

存储键 `Chinamax_Unmatched_Hosts_v2`，数组元素：

```json
{ "h": "域名", "t": 首次时间ms, "lt": 最近时间ms, "n": 次数, "p": "端口", "v": "协议" }
```

容量 4000 条，超出后丢弃最早的。

自动过滤：纯 IP / IPv6、8–12 位字母数字且含数字的随机域名（如 `cokfdmgqpv1.com`）。

### 导出

运行 `unmatched-export`，输出分三组：

```
===== UNMATCHED HOSTS (n, sorted by hits) =====
域名 | 次数 | 首次 | 最近 | 端口 | 协议
===== COLD (hits<=1, idle>7d, n) =====     可清理
===== HOT (hits>=3, n) =====               优先加规则
```

### 排查

**脚本不工作，日志只显示 `Failed to load script: xxx, (null)`**

真正原因是资源 `not ready`（不是缓存问题，重启引擎、改 URL、换文件名都无效）：

```bash
surge-cli external-resource list | grep -A1 script   # 看状态
surge-cli external-resource update all               # 修复
```

**确认是否真的不漏**

```bash
surge-cli dump rule-usage | grep -E 'FINAL|unmatched'
```

`FINAL` 为 0、`SCRIPT,unmatched-log` 有计数 = 正常。

### 注意

- iOS 版 Surge 访问不到 AppGroup 沙盒，**不能用本地绝对路径**；脚本必须走 HTTP(S)。
- 脚本内 `$request` 只有 `hostname` / `destPort`，**没有** `port` / `scheme`。
- 规则脚本返回 `matched:false` 等于跳过该规则，会导致记录不全 —— 这正是本方案改为 `matched:true` 的原因。
- `raw.githubusercontent.com` 有 300 秒 CDN 缓存，推送后需等待。
