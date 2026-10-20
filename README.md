# Chinamax 漏网采样（Surge iOS ↔ Mac 共用一套记录）

## 结论先说

- **能**做到：iOS 与 Mac 共享同一份"漏网主机"记录，导出时直接在 **Surge 脚本日志**里列出全部主机，复制即可。
- **别试图写自动文件**：Surge Mac 的脚本在自定义沙箱里，写文件不可靠；让脚本日志承载输出，已经从 Mac 脚本日志目录（`~/Library/Logs/Surge/`）验证是纯文本，随时可复制。
- Mac 上的特别之处已经做成"**自动收敛**"：漏网稳定后自己停掉采样，不需要你手动关。

## 两个脚本

| 文件 | 类型 | 作用 |
|---|---|---|
| `unmatched-log.js` | rule | 记录 `$request.hostname`（去重、最多 3000 个），返回 `{matched:false}` 不改路由 |
| `unmatched-export.js` | generic | 手动运行 → 全部主机输出到脚本日志，复制即可 |

## Mac 上的实测结论（2026-10-20，Surge 6.11.0）

1. **本机没有全局脚本目录**：`[Script]` 里写 `script-path=unmatched-log.js`（相对路径）会报
   `Failed to load script: unmatched-log.js, 未能打开文件…因为它不存在`。
   **必须写绝对路径**。现在的做法是把两个 .js 放在 profile 同目录：
   `/Users/abinlin/Library/Application Support/Surge/Profiles/`。
2. **`evals=` 更新表达式在本机不生效**：试过普通表达式、脚本型表达式（用 `/tmp/x.js` 做脚本更新表达式）、
   以及"种子值变化 → 条件为真"三种写法，reload 后都没有任何写入或执行）。
   所以"靠 evals 刷新缓存 + 自动收敛"这条路在 Mac 上走不通，**已移除**，现在是纯采样模式。
3. 依赖 `$script.startTime` 自动计时的逻辑一律不做；需要停采样时把 `Chinamax_Unmatched_Disabled`
   写成任意非空字符串（记录脚本会跳过写入），或直接把 `SCRIPT,unmatched-log,DIRECT` 注释掉。
4. 脚本日志位置（纯文本，随时可复制）：
   `~/Library/Logs/Surge/Scripts/unmatched-log-YYYY-MM-DD.log`
   `~/Library/Logs/Surge/Scripts/unmatched-export-YYYY-MM-DD.log`

## Mac 配置（已由 deploy-mac.py 写入）

```
[Script]
# ==== unmatched 漏网采样（Minis 添加，可整段删除；规则见 [Rule] 末尾）====
unmatched-log = type=rule,script-path=/Users/abinlin/Library/Application Support/Surge/Profiles/unmatched-log.js,debug=true
unmatched-export = type=generic,script-path=/Users/abinlin/Library/Application Support/Surge/Profiles/unmatched-export.js,debug=true
# ==== unmatched 漏网采样 end ====

[Rule]
...
SCRIPT,unmatched-log,DIRECT
FINAL,Proxy,dns-failed
```

## 怎么用

```sh
python3 deploy-mac.py export    # 立刻导出（等价于 Dashboard 里手动跑 unmatched-export）
python3 deploy-mac.py check     # 看当前 profile 和已记录的键
python3 deploy-mac.py revert    # 还原最近一次备份
```

导出结果长这样（实测）：

```
[DB618F67] ===== Chinamax 漏网主机列表 =====
[DB618F67] github.com
[DB618F67] test-only.example.invalid
[DB618F67] www.google.com
[DB618F67] ===== 共 3 条 =====
```

## iOS 版（已就绪）

iOS 的 Surge 在沙箱里，Minis 看不到也写不了它的 profile；Controller 只提供只读的 `dump profile`，
没有"改配置"的接口。所以 **iOS 的配置只能你在 Surge 里贴**，但脚本本身已经放好并验证过。

脚本已单独放在独立仓库（不和你那些规则混在一起）：
`https://github.com/gaoda212/surge-scripts`（public，脚本走 `raw.githubusercontent.com`，国内拿不到可用
`https://cdn.jsdelivr.net/gh/gaoda212/surge-scripts@main/unmatched-log.js` —— raw 地址在国内网络下需要能通）。

```
[Script]
# ==== unmatched 漏网采样（Minis 添加；可整段删除）====
unmatched-log = type=rule,script-path=https://raw.githubusercontent.com/gaoda212/surge-scripts/main/unmatched-log.js,debug=true
unmatched-export = type=generic,script-path=https://raw.githubusercontent.com/gaoda212/surge-scripts/main/unmatched-export.js,debug=true
# ==== unmatched 漏网采样 end ====

[Rule]
# ……原有规则不动……
# 放在最后一条 FINAL 之前（你这里是 FINAL,🇺🇸MEGABOX_PRO_V6,dns-failed）：
SCRIPT,unmatched-log,DIRECT
FINAL,🇺🇸MEGABOX_PRO_V6,dns-failed
```

贴完在 Surge 里重载配置，随便刷点网页，然后：

```sh
cd /var/minis/workspace/surge-unmatched
python3 deploy-ios.py export   # 立刻在终端看到 iOS 端的漏网清单
```

**iOS 与 Mac 的 `$persistentStore` 各存各的**，导出时连的是哪台设备，看到的就是哪台设备的记录。

## 验证

- 真机验证：Mac 上发出 4 个请求（github/google/apple/一个不存在的测试域），导出得到 3 条
  （`www.apple.com` 命中了已有的 Apple 规则集，所以不算漏网 —— 说明记录位置正确）。
- `verify-logic.py`：把 JS 逻辑逐行翻译成 Python 跑完整流程（去重、容量上限），全部通过。
- iSH 装不了 node（与已装的 nodejs-22 依赖冲突），所以 JS 没有在 iSH 里本地执行；Mac 端已用真实引擎跑通。
