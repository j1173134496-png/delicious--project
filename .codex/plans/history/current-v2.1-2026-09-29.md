# Planner 计划：八条与你 v2.1 可验证本地页面与边界交接

## 0. 角色、读取顺序与修改纪律

- 本文件是 v2.1 唯一执行计划。Planner 已读取 PRD、README、v2.0 当前计划、v2.0 执行日志、全部历史计划、项目配置和关键源码；Planner 只归档 v2.0 计划并写入本文件，不实现业务代码、不修改配置/资源/脚本/README/执行日志、不启动任何 Executor。
- 父 Agent 必须先独立读取本文件，确认文件存在、非空、行数/字节数/SHA-256，确认 v2.0 原样归档和 T0→T4 顺序，再决定是否启动唯一 Executor。Planner 与 Executor 不得并行。
- Executor 的第一动作必须是完整读取本文件，并在任何命令或代码操作前记录“读取前 current.md SHA-256、行数、字节数、读取时间”；然后按 **T0 → T1 → T2 → T3 → T4** 串行执行。每项完成后先做该项验证，再在 `.codex/plans/execution-log.md` 追加“操作 → 直接证据 → 命令/退出码 → 结果 → 状态/暂停原因 → 文件 SHA”，不得跳项、并行或把后项结果倒填到前项。
- 保持 `project.config.json` 的 `compileType=miniprogram`、AppID `touristappid`、`miniprogramRoot=miniprogram/`、目标基础库 `3.4.3`；保持应用版本 `1.4.0`、数据 schema 数值 `4`/名称 `1.3`。不得注册或替换 AppID、接入网络/云开发/真实 LLM/远程反馈/推送、清空用户数据、关闭检查、伪造真实好友/真机/系统权限能力。
- 源项目运行时证据必须同时包含绝对项目 URL、AppID、工具/基础库、真实页面路径、清空后的 Console/Debugger、AX/截图和可追溯日志时间范围。文件存在、headless smoke、`hasUser`/`isTourist`、`isMiniAppProject=false`、webview loadstop/LoadApp、按钮存在或 `canIUse` 结果不能单独证明 renderer、键盘、滚动、长按、权限、文件、Storage 或分享通过。
- v2.1 默认不改业务源码。只有 T1 取得清空 Console 后、精确指向单个源码文件的 WXML/WXSS/`__route__`错误时，才允许该任务中对对应单文件做最小修复；必须记录旧/新 SHA 和离线回归。不得借机重写页面、样式、Service、数据模型或依赖。

## 1. Planner 已核实的 v2.0 归档、基线和边界

### 1.1 v2.0 原样归档已完成

- 覆盖前 `.codex/plans/current.md` 是 v2.0，**128 行、18475 bytes**，SHA-256 `b8b5586dc268a6508cc269cfb18e4b9ed91a2db11b16779ed12a882597c921b4`。
- 已先校验上述字节/哈希，再复制为 `.codex/plans/history/current-v2.0-2026-09-29.md`；`cmp`、行数、字节数和 SHA-256 均一致，归档不得覆盖或重写。
- 历史归档仍保持：v1.9 `21eb78c1a9faf96a7b9fc5302d184d378db7b15369af458a64739fdd0aac7ecf`、v1.8 `68890974b4c18093f0f78418a520cf2eef30b8b8055026ca9314018264fdc9e4`、v1.7 `c01d28c6d5ef88b0d18017263bbd3a92b722f7eb4c9e4dd9fd1c1ab8d64248d5`、v1.6 `4bfc5b77b1d151e01280c16612986ff5373de8cf2a0f57921b8124644e4da0e0`。更早的 `current-2026-09-27.md`、v1.1、v1.2、v1.3、v1.4、v1.5 历史文件均已读取并保留，不得覆盖。
- 覆盖前执行日志已保持为 **1004 行、183933 bytes**，SHA-256 `bda3e7758edb5be94fcf12f6f93b9ab7ecdecb7e87631e8c147a35065d5cbda0`；README 为 **153 行、19163 bytes**，SHA-256 `005d0b6c132e19fdcc6eb41f4d6df8922838d60e4003fbd0b7257e5fca549c4f`。Planner 不改这两份文件，Executor 只能按 T4 事实追加并记录前后 hash。
- 归档校验直接输出：`V20_ARCHIVE_OK lines=128 bytes=18475 sha256=b8b5586dc268a6508cc269cfb18e4b9ed91a2db11b16779ed12a882597c921b4`。

### 1.2 v2.0 已完成项（只按已有直接证据写 PASS）

- `V20_T0_OFFLINE_BASELINE=PASS`：v2.0 读取计划、配置/版本/schema/AppID、源代码树和离线基线无漂移。
- `V20_COMPILE_GATE=PASS`：源路径 `/Users/lnp/Documents/ChatGPT/delicious- project`、AppID `touristappid`、Stable `2.02.2608070`、基础库 `3.4.3`；清空 Console 后 `WXML_COMPILE_COUNT=0`、`WXSS_COMPILE_COUNT=0`、`ROUTE_COUNT=0`、`EPERM_COUNT=0`、`PERMISSION_MODAL_COUNT=0`，Debugger `Errors: 0`。游客/工具 warnings（`wx.operateWXData` 受限模拟、基础库灰度、组件 selector、`timingData not found`、`avatar null`、worker unsupported、preload/代理提示）已留原文并未升级为源码错误。
- `V20_KEYBOARD=PASS`：聊天页真实输入 `v20-keyboard`，点击发送后输入框清空、用户气泡和本地 mock 回复出现，输入焦点离开输入框且输入栏/tabbar无遮挡。
- `V20_SCROLL=PASS`：聊天消息区与隐私长文都有真实拖动前后截图/AX 内容位移。
- `V20_LIFECYCLE=PASS`：聊天消息在“我的→设置/隐私→反馈→返回→聊天”链路后保留，路径恢复 `pages/chat/chat`，无重复消息或新编译错误。
- `V20_LOCAL_UX=PASS`：设置、关于、隐私、反馈源路径与标题/文案可见；反馈单字提交得到“反馈内容至少写 5 个字”且未写入成功记录。
- v2.0 T4 离线回归通过：`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`、`AUDIT_FILES=118`、49 个 JavaScript 语法检查通过、全部 storage/cat/photo/file/care/invariants/recovery/lifecycle/local/pages/capabilities smoke PASS、`ALL_JSON_OK`、`PAGE_STORAGE_LEAK=0`、`WXML_CHAT_BUBBLE_STRUCTURE=PASS`、`WXSS_UNIVERSAL_COMBINATORS=0`、`STATIC_RISK_SCAN=0`。

### 1.3 v2.0 仍 BLOCKED / 未验证，v2.1 不伪造

- `V20_LONGPRESS=BLOCKED / 未验证`：`@oai/sky` 当前动作接口没有可验证的 hold/long-press，AX 也没有长按 secondary action；不能用 tap 或脚本改 Page data 冒充。
- **锁定菜谱详情**仍未取得源项目真实路径、无照片占位、详情返回和 Console/AX 证据；这是 v2.1 的首要可验证目标。
- 相册真实图片预览、照片长按保存、系统相册权限/成功或拒绝、文件 save/unlink 完整生命周期没有直接证据；没有有效本地图片时只可验证占位/安全拒绝，不得调用保存 API。
- 真实微信好友分享、跨设备绑定、云端同步、游客 `operateWXData` 之外的开放能力和远程通知/LLM 继续受 `touristappid`/无后端边界阻断；应用内分享面板的可达证据不等于好友发送或云绑定成功。
- Storage 10MB quota、写入失败的真实系统时序、进程杀死/恢复、真机安全区/字体/键盘/滚动/长按和系统文件生命周期需要真实设备/系统状态，继续 `BLOCKED / 未验证`。
- 四级专用 `happy/eating/sleeping/sad` PNG 没有用户提供素材；当前四张 `idle.png` + CSS/Emoji fallback 是已知待素材边界，不在本轮伪造。
- v2.0 现场 warning 原文（游客 API、基础库灰度、selector、代理 `403 ua-token-missing`、`timingData not found` 等）须建立“原文 → 来源/影响 → 是否阻断”矩阵；只有新 WXML/WXSS/`__route__`、权限模态或新 `EPERM` 才阻断本轮。

### 1.4 v2.1 目标与可验证边界

本轮优先使用当前源项目和已有 DevTools 环境验证无需真实账号、云端、系统相册或真机的能力：

1. 只读打开一个默认“未解锁”菜谱，确认真实 `pages/recipe-detail/recipe-detail` 路径、锁定/无照片占位文案、返回菜谱列表和错误计数。
2. 从设置页逐项切换“情绪关怀提醒”和“通知提醒”，离开再返回确认值持久化；测试前保存原值，结束必须恢复原值，不执行清除数据，不发送外部通知。
3. 在现有工具接口允许时尝试一次真实猫长按；没有 hold 接口则记录 `V21_LONGPRESS=BLOCKED / 未验证` 并停止该动作，不用 tap 代替。
4. 对相册空状态/上传取消和无有效图片的占位分支做安全检查；只有在直接看到有效本地图片且不需要系统权限时才可记录 presenter 证据，系统相册保存/权限/真实文件仍 BLOCKED。
5. 每项运行时结论都必须绑定源项目 URL/AppID/页面路径、AX/截图、Console/Debugger 和日志时间；工具 warning 保留原文。

## 2. v2.1 直接证据定义和状态标记

- `V21_SOURCE_GATE=PASS|BLOCKED`：清空 Console 后源项目普通编译；无新 WXML/WXSS/`__route__`、权限模态或 watcher `EPERM`，Debugger Errors=0，且 URL/AppID/路径清晰。只有此门槛 PASS 才进入交互。
- `V21_RECIPE_LOCKED_DETAIL=PASS|FAIL|BLOCKED`：从源项目菜谱 Tab 点击默认未解锁卡片，取得详情路径、截图/AX 显示菜名与“还没吃过哦~”或无照片占位，返回后菜谱列表仍显示原条目；清空 Console 后没有新业务错误。缺少任一直接证据记 BLOCKED。
- `V21_SETTINGS_TOGGLE=PASS|PARTIAL|BLOCKED`：记录进入设置前两个 switch 的原值；分别翻转并在返回/再次进入后看到对应值，再逐项恢复原值并复核。恢复失败、写入错误或数据状态不明时停止并标 PARTIAL/BLOCKED，不能清除数据掩盖。
- `V21_LONGPRESS=PASS|BLOCKED`：仅在工具提供真实 hold/long-press 操作时，对猫执行一次并取得心情/经验变化、一次性增量和日志；没有 hold API、AX 无长按动作或只能用 tap 时固定 BLOCKED。
- `V21_ALBUM_BOUNDARY=PASS|PARTIAL|BLOCKED`：空相册/上传页真实路径和“上传第一张/当前环境不能选图”文案可见；选择器取消后回到源页面且无新错误。有效图片预览、系统相册保存、权限拒绝/成功、文件删除仍单独 BLOCKED。
- `V21_WARNING_MATRIX=PASS|BLOCKED`：每条 warning 记录原文、来源、影响和阻断判断；新 WXML/WXSS/`__route__`、权限模态或 EPERM 不能被归为普通 warning。

## 3. 串行任务与验收

### T0：读取 v2.1 计划、冻结归档/离线/源路径基线

**目标**：确认 Executor 使用的是本计划和 v2.0 完整归档，证明代码/config 未漂移，并记录当前 DevTools 源项目现场。

**Executor 首先做**：完整读取 `.codex/plans/current.md`，记录读取前 SHA、行数、bytes、UTC/本地时间；确认没有其他 Executor 并行。

**只读范围与允许修改**：读取 PRD、README、全部历史计划、`.codex/plans/execution-log.md`、`project.config.json`、`project.private.config.json`、`miniprogram/**`、`scripts/**`；T0 只允许追加 `.codex/plans/execution-log.md`，不得改业务源码、配置、资源、README、依赖、AppID、schema、版本或当前计划。

**验证方法**：

```bash
python3 - <<'PY'
import hashlib, pathlib
p = pathlib.Path('.codex/plans/history/current-v2.0-2026-09-29.md')
b = p.read_bytes()
assert len(b) == 18475 and b.count(b'\n') == 128
assert hashlib.sha256(b).hexdigest() == 'b8b5586dc268a6508cc269cfb18e4b9ed91a2db11b16779ed12a882597c921b4'
print('V20_ARCHIVE_OK')
PY
node scripts/audit-assets.js
find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
node scripts/validate-miniapp.js
node scripts/smoke-storage-atomic.js
node scripts/smoke-cat-interaction.js
node scripts/smoke-photo-presenter.js
node scripts/smoke-file-cleanup.js
node scripts/smoke-care-atomic.js
node scripts/smoke-invariants.js
node scripts/smoke-recovery.js
node scripts/smoke-lifecycle.js
node scripts/smoke-local.js
node scripts/smoke-pages.js
node scripts/smoke-capabilities.js
python3 - <<'PY'
import json, pathlib
for p in list(pathlib.Path('.').glob('*.json')) + list(pathlib.Path('miniprogram').rglob('*.json')):
    json.loads(p.read_text(encoding='utf-8'))
print('ALL_JSON_OK')
PY
if rg -n 'wx\.(get|set|remove|clear)Storage(?:Sync)?' miniprogram/pages; then exit 1; else echo PAGE_STORAGE_LEAK=0; fi
if rg -n 'https?://|api[_-]?key|secret|sk-[A-Za-z0-9]{8,}|TODO|FIXME|v1\.2\.0|v1\.3\.0' miniprogram README.md scripts project.config.json; then exit 1; else echo STATIC_RISK_SCAN=0; fi
```

同时记录：`project.config.json`/private config SHA、`appMeta.js`/`storageService.js`/`chat-bubble.wxml` SHA、`miniprogram`/`scripts` 内容树 SHA、源项目 URL/AppID/基础库/工具版本、当前页面路径、Debugger/Console、权限模态/EPERM、日志绝对路径和时间范围。应复现 `ASSET_CAT_COUNT=4`、`ASSET_CAT_BYTES=1374256`、`ASSET_MINIPROGRAM_BYTES=1610501`、`AUDIT_FILES=118`、全部 `SMOKE_* = PASS`、`SCHEMA_VERSION=4`、`ALL_JSON_OK`、`PAGE_STORAGE_LEAK=0`、`STATIC_RISK_SCAN=0`。

**停止条件**：归档不符、current 读取前哈希无法记录、任何离线命令失败、配置/AppID/schema/version/源码树漂移、源项目 URL/AppID 无法确认、出现新权限模态/EPERM/WXML/WXSS/`__route__`错误或发现并行 Executor，立即在日志写明原因并停止，不进入 T1。

**日志要求**：追加一节 `## v2.1 Executor T0...`；写真实退出码/完整关键输出，不写“通过”概括；追加前后 execution-log 行数、bytes、SHA。

### T1：源项目编译门槛与 warning 因果矩阵

**目标**：在任何页面交互前取得当前源项目新鲜编译证据，确认 v2.0 WXML 修复和 WXSS 兼容修复仍有效。

**允许修改范围**：默认无源码修改。只有清空 Console 后的新鲜错误精确指向单个 `*.wxml`/`*.wxss`/`__route__` 源文件时，才可改该单文件的最小结构/语法；允许更新 `.codex/plans/execution-log.md`，T4 才可按事实更新 README/current。不得改配置、AppID、schema/version、资源、脚本、依赖或重写页面。

**验证方法**：

1. 切回源项目窗口，核对 URL `projectpath=/Users/lnp/Documents/ChatGPT/delicious- project`、AppID `touristappid`、工具 Stable `2.02.2608070`、基础库 `3.4.3`；清空 Console，执行一次普通编译/刷新。
2. 读取编译面板、Debugger/Console、AX/截图和最新绝对日志。逐项计数并保存原文：WXML/WXSS/`__route__`、权限模态、watcher `EPERM`、`routeTo timeout`、`isMiniAppProject=false`、游客 `operateWXData`、基础库灰度、selector、代理 `403 ua-token-missing`、`timingData not found`。
3. 只有 `WXML_COMPILE_COUNT=0`、`WXSS_COMPILE_COUNT=0`、`ROUTE_COUNT=0`、权限/EPERM=0、Debugger Errors=0 且 URL/AppID/页面路径可追溯，才输出 `V21_SOURCE_GATE=PASS`；工具/游客 warning 要进入矩阵，不得隐藏。
4. 若需最小修复，记录修改前后 SHA、精确错误行和原因；修复后重新清空 Console/普通编译，再验证 T1 门槛和离线语法/JSON。

**停止条件**：清空 Console 后出现无法精确归因的错误、需要用户系统设置/真实 AppID/网络/真机/不可逆系统权限、出现新权限模态或 EPERM、源码修复超出单文件最小范围、Debugger Errors>0，立即记录并停止 T1；不进入 T2。

**日志要求**：追加 `## v2.1 Executor T1...`，保存清空 Console 前后计数、源 URL/AppID/路径、截图/AX/日志绝对路径及时间；若无代码改动必须明确写“无需代码改动”。

### T2：锁定菜谱详情与可逆设置开关验证

**前置门槛**：仅当 `V21_SOURCE_GATE=PASS` 且 T1 日志/证据已写入，才能进入；否则逐项 `BLOCKED / 未验证` 并跳转 T4。

**目标**：优先完成不需要系统权限、云端或真实好友的两个源项目能力；所有设置变化必须恢复原值。

**允许修改范围**：默认不改源码、配置、资源、Storage 原始数据或脚本。若交互再次发现精确的单文件 WXML/WXSS错误，只能回到 T1 的最小修复规则；不得为了点击测试清除全部本地数据或手写 Page data。

**验证顺序与方法**：

1. **锁定菜谱只读链路**：切到“菜谱”Tab，记录源路径 `pages/recipe/recipe` 和 AX/截图；点击一个默认未解锁的湘菜卡片，记录 `pages/recipe-detail/recipe-detail?id=...` 实际 URL/路径，确认菜名、锁定语义（“还没吃过哦~”或等价文案）、无照片占位/补充照片入口；不点击选图、不调用系统相册。点击返回导航/菜谱 Tab，确认列表条目、Tab 统计和页面无重复错误。
2. **设置开关可逆链路**：从“我的”进入 `pages/settings/settings`，在 AX/截图中记录 `emotionCareEnabled`、`notificationsEnabled` 的原始开关位置/文案；分别翻转一次，离开到聊天或我的，再返回设置确认值持久化；逐项翻回原值并再次进入确认恢复。任何写入失败、值不一致、页面路径不可确认或恢复失败，立即停止后续交互并标 `V21_SETTINGS_TOGGLE=PARTIAL/BLOCKED`，不得通过清除数据修复。
3. 每一步清空/读取 Console 和 Debugger，记录源 URL/AppID、页面路径、截图/AX、日志时间；若出现新 WXML/WXSS/`__route__`/权限/EPERM，立即停止 T2 并进入 T4。

**验收标记**：两条链路各有直接证据才可 `V21_RECIPE_LOCKED_DETAIL=PASS`、`V21_SETTINGS_TOGGLE=PASS`；只完成一项则另一项 `BLOCKED`，整体写 `PARTIAL`，不得把列表按钮存在当详情 PASS。

**停止条件**：详情打不开、返回状态不明、设置值无法恢复、出现系统选择器/权限模态/新业务错误、用户数据非预期变化或需要外部账号/系统设置，立即记录并停止 T2。

**日志要求**：追加 `## v2.1 Executor T2...`；逐步保存页面路径、AX/截图、Console/Debugger 计数、设置原值/翻转值/恢复值和异常原文。不得记录任何真实好友/云端成功声称。

### T3：长按与相册安全边界探测（只做可逆、只做一次）

**前置门槛**：仅当 T1 `V21_SOURCE_GATE=PASS`；T2 若因一条链路阻塞，不重复危险动作，直接记录对应 `BLOCKED` 后进入 T4。

**目标**：诚实探测 v2.0 尚未闭合的长按/照片边界，同时把系统权限、真实文件和游客能力固定为阻塞，不通过不可逆动作“制造”证据。

**允许修改范围**：不改业务源码、配置、资源、Storage、脚本或 AppID；只追加执行日志。任何真实图片、系统相册保存、权限设置、文件删除、清除本地数据、进程终止均禁止。

**验证顺序与方法**：

1. 在工具动作列表中检查是否提供真实 hold/long-press；若提供，猫卡只执行一次 hold，取得 AX/截图前后心情/经验和清空 Console/日志；若未提供或动作返回 `windowNotFoundAtPosition`/无 secondary hold，立即写 `V21_LONGPRESS=BLOCKED / 未验证`，不以 tap 替代，不重试多次。
2. 在相册 Tab 记录空状态/上传入口实际路径和文案；如安全，可进入上传页打开选择器并走一次 Cancel，确认回到源项目、按钮 busy 复位、无 WXML/WXSS/权限新错误。若无有效图片，必须保留 `V21_ALBUM_BOUNDARY=PARTIAL/BLOCKED`，不调用 `wx.saveImageToPhotosAlbum`；若出现有效图片，停止在预览/占位层，不点击系统保存或权限按钮，真实保存/删除仍 BLOCKED。
3. 对任何 warning 重新按 T1 矩阵归类；只要出现新 WXML/WXSS/`__route__`、权限模态、EPERM 或系统文件选择器无法安全取消，立即停止 T3。

**验收标记**：长按有真实 hold 才能 PASS；无接口固定 BLOCKED。相册空态/取消有源路径与 AX/截图且无新错误才可 `V21_ALBUM_BOUNDARY=PASS`，否则 PARTIAL/BLOCKED。系统相册、权限、有效图片预览/保存/删除、Storage quota、进程中断和真机全部继续 BLOCKED。

**日志要求**：追加 `## v2.1 Executor T3...`；记录工具是否提供 hold、动作返回值、页面路径、AX/截图、取消前后状态、API/权限原文和 warning 矩阵。一次性动作未取得证据也必须记录 BLOCKED，不能循环尝试。

### T4：完整离线回归、README/计划/日志收口

**目标**：把 T0→T3 的真实结果和边界收口，复核 v2.0 归档及保护文件哈希，确保不存在未授权业务变化。

**允许修改范围**：默认只允许 `.codex/plans/execution-log.md`、按实际证据追加 `README.md`、本 `.codex/plans/current.md` 的收口段。若 T1 已证明单文件编译错误，保留该单文件最小修复并记录前后 SHA；不得改其它业务源码、配置、资源、脚本、依赖、AppID、schema 或版本。

**验证方法**：按 README 完整顺序重新执行资源审计、49 个 JS `node --check`、`validate-miniapp.js`、storage/cat/photo/file-cleanup/care/invariants/recovery/lifecycle/local/pages/capabilities smoke、JSON、页面 Storage 越层、WXML 条件结构、WXSS 通配组合器和静态风险扫描；记录真实退出码/关键输出和预期 settings clear 诊断。再次校验：

- `.codex/plans/history/current-v2.0-2026-09-29.md` 必须仍为 128 行、18475 bytes、SHA `b8b5586dc268a6508cc269cfb18e4b9ed91a2db11b16779ed12a882597c921b4`。
- `project.config.json` SHA `999c1adb4c03d85076878a88ba4a3d3a32381ad5d35805f4fd70578d0fcab47b`、`project.private.config.json` SHA `240345d4b88b5bd08caba18d2ba92d70b03bd8f2ed188ca5b1db23e45387b161`、`miniprogram/utils/appMeta.js` SHA `99ca2165f530dc4e43660a56d48e98bc6dbfe1fa3c0d6fcbb485b8672a5d49c1`、`miniprogram/services/storageService.js` SHA `50db6c11e9fe823eebdefaaa5c36f62dded828d62b1fa7b718c0790f67adf5c6`、`miniprogram/components/chat-bubble/chat-bubble.wxml` SHA `68e2ddb7d149f5e8e958b27a0fb812fabd46a9bdd3e42d4704d220e257706a3f` 必须未漂移，除非 T1 直接错误指向且计划明确记录单文件前后 SHA。
- 追加前后记录 current.md、README.md、execution-log.md 行数/bytes/SHA；记录最终文件清单和 `miniprogram`/`scripts` 内容树 SHA。不得把 v2.0 旧 hash 当作 v2.1 current hash。

**停止条件**：任何离线命令失败、静态风险命中、文件范围越界、归档哈希改变、保护文件无法解释、文档与直接证据不一致或仍需外部账号/系统设置，先写日志再停止；不得用删除数据、跳过命令或改配置收口。

**验收/日志要求**：追加 `## v2.1 Executor T4...`，每个 `V21_*` 明确 `PASS`、`PARTIAL`、`FAIL` 或 `BLOCKED / 未验证`，列出所有实际修改文件和前后 SHA；完整结论必须分开写“本地离线/源项目直接证据”与“真实微信/设备/云端仍阻塞”。

## 4. 外部能力、告警与固定 BLOCKED 清单

- 真实微信好友分享、云端绑定/跨设备同步、游客 `operateWXData` 之外的登录能力、真实 LLM/远程反馈/通知推送需要注册 AppID、账号、网络或后端，本轮固定 `BLOCKED / 未验证`。
- 系统相册保存、权限拒绝/设置跳转、真实图片预览/删除、文件 save/unlink、Storage quota/进程中断和真机安全区/键盘/滚动/长按必须有真实设备/系统证据；DevTools 面板、headless smoke、占位图或能力 snapshot 不能替代。
- 专用状态 PNG、真实 3D/帧动画和素材视觉验收需要用户提供素材或真实设备，本轮保留 idle fallback/待素材。
- 工具/游客 warning (`wx.operateWXData` 受限、灰度基础库、组件 selector、`timingData not found`、本地代理 `403 ua-token-missing`、worker unsupported、preload、avatar null) 原文保留，按来源和影响归类；只有新鲜 WXML/WXSS/`__route__`、权限模态或 EPERM 阻断 T1/T2/T3。
- 不得点击系统安全设置、修改钥匙串、安装工具/插件/依赖、替换 AppID、接入网络或启动第二个 Executor。Planner 完成父 Agent 独立校验后停止。

## 5. 父 Agent 启动前独立校验与 Planner 收口

父 Agent 在启动 Executor 前必须独立执行：

```bash
test -s .codex/plans/current.md
python3 - <<'PY'
import hashlib, pathlib
p = pathlib.Path('.codex/plans/history/current-v2.0-2026-09-29.md')
b = p.read_bytes()
assert len(b) == 18475 and b.count(b'\n') == 128
assert hashlib.sha256(b).hexdigest() == 'b8b5586dc268a6508cc269cfb18e4b9ed91a2db11b16779ed12a882597c921b4'
print('V20_ARCHIVE_IMMUTABLE=PASS')
PY
rg -n 'T0：|T1：|T2：|T3：|T4：|V21_SOURCE_GATE|V21_RECIPE_LOCKED_DETAIL|V21_SETTINGS_TOGGLE|V21_LONGPRESS|V21_ALBUM_BOUNDARY|V21_WARNING_MATRIX|touristappid|BLOCKED / 未验证|Executor 必须.*读取' .codex/plans/current.md
sha256sum .codex/plans/current.md .codex/plans/history/current-v2.0-2026-09-29.md
sha256sum project.config.json project.private.config.json miniprogram/utils/appMeta.js miniprogram/services/storageService.js miniprogram/components/chat-bubble/chat-bubble.wxml
```

再确认父 Agent 看到的 current.md 是 v2.1 而归档 hash 不变；按计划未启动任何 Executor。Planner 本节完成后停止，不执行 Executor，不追加执行日志，不修改业务源码/配置/资源/README。

## 6. v2.1 预期收口格式（Executor 必须按实际证据填写）

- T0：`V21_T0_OFFLINE_BASELINE=PASS|BLOCKED`，写明 v2.0 归档、配置/源码 hash、源项目 URL/AppID/现场。
- T1：`V21_SOURCE_GATE=PASS|BLOCKED`，写明清空 Console 后计数、warning 矩阵、是否有最小单文件修复。
- T2：`V21_RECIPE_LOCKED_DETAIL=PASS|FAIL|BLOCKED`、`V21_SETTINGS_TOGGLE=PASS|PARTIAL|BLOCKED`。
- T3：`V21_LONGPRESS=PASS|BLOCKED`、`V21_ALBUM_BOUNDARY=PASS|PARTIAL|BLOCKED`。
- T4：`V21_OFFLINE_BASELINE=PASS|BLOCKED`；最终清楚列出真实好友/云绑定、系统权限/文件、Storage quota/进程中断、真机、专用状态素材等 `BLOCKED / 未验证`，不声称全量运行时通过。


## 7. v2.1 Executor T0–T4 实际收口（2026-09-29）

- `V21_T0_OFFLINE_BASELINE=PASS`；`V21_SOURCE_GATE=PASS`。源项目 URL `/Users/lnp/Documents/ChatGPT/delicious- project`、AppID `touristappid`、工具 `2.02.2608070`、基础库 `3.4.3` 可由 AX/日志追溯；T1 清空 Console 后 Debugger Errors `0`，无新 WXML/WXSS/`__route__`、权限模态或 watcher EPERM。
- `V21_RECIPE_LOCKED_DETAIL=PASS`：详情只读进入/返回链路保留。
- `V21_SETTINGS_TOGGLE=PASS`：两个设置开关翻转后跨页面持久化，并恢复 `1/1` 原值；没有清除本地数据。
- `V21_LONGPRESS=BLOCKED / 未验证`：无真实 hold 接口，未以 tap 代替。
- `V21_ALBUM_BOUNDARY=PASS`：空相册 AX/截图显示 0 张与空态；上传页一次真实选择器 Cancel 后仍 `0 / 9`，未上传/保存。真实系统相册/权限/文件保存与删除继续 BLOCKED。
- `V21_OFFLINE_BASELINE=PASS`：T4 逐项离线命令最终均退出 `0`，输出 `ASSET_ERRORS=0`、`ASSET_WARNINGS=0`、49 JS check、全部 smoke PASS、`SCHEMA_VERSION=4`、`ALL_JSON_OK`、`PAGE_STORAGE_LEAK=0`、`WXML_CHAT_BUBBLE_STRUCTURE=PASS`、`WXSS_UNIVERSAL_COMBINATORS=0`、`STATIC_RISK_SCAN=0`。一次外层引号错误的 WXML 检查已用同等 here-doc 重跑并通过。
- T4 允许范围内实际修改文件仅为 `.codex/plans/execution-log.md`、`README.md`、`.codex/plans/current.md`；业务源码/config/resource/script/dependency/AppID/schema/version 均未改。真实好友/云、系统权限/文件、Storage quota/进程中断、真机与专用素材保持 `BLOCKED / 未验证`。
