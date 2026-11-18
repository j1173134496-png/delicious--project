# Planner 计划：八条与你 v2.0 本地交互与可解释警告验证

## 0. 角色、顺序与修改纪律

- 本文件是 v2.0 唯一计划。Planner 已读取 v1.9 当前计划、v1.9 执行日志、README、PRD、源码、项目配置，并核对 v1.9 T0→T4 收口证据；Planner 只归档 v1.9 计划并写入本文件，不实现代码、不改业务源码、配置、资源、README 或执行日志、不启动 Executor。
- 父 Agent 必须独立读取本文件，确认文件存在、非空、行数/字节数/SHA-256、v1.9 原样归档和 T0→T4 顺序后，才能启动唯一 Executor。Planner 与 Executor 不得并行。
- Executor 必须先读取本文件并记录读取前 SHA-256，严格按 T0 → T1 → T2 → T3 → T4 串行推进；每完成一个任务立即做验证，在 `.codex/plans/execution-log.md` 追加“操作 → 直接证据 → 验证 → 结果 → 状态/暂停原因”。没有直接证据不得写 PASS。
- 保持应用版本 1.4.0、数据 schema 数值 4/名称 1.3、基础库目标 3.4.3、源项目 AppID `touristappid`、`miniprogramRoot=miniprogram/`。不得注册或替换 AppID、接入网络/云服务、清空用户数据、关闭检查、绕过系统权限或伪造真实好友/真机能力。
- 本轮优先验证现有本地模式能力，默认不改业务代码。若 DevTools 新鲜证据精确指向单个源码错误，才允许在对应任务中做最小单文件修复；不得借机重写页面、样式、Service、数据结构或依赖。
- headless smoke、静态扫描、文件存在、页面路径、webview loadstop/LoadApp、按钮存在、`hasUser`/`isTourist`、四 Tab 文本或 `isMiniAppProject=false` 单独不能证明 renderer、键盘、滚动、长按、页面生命周期或系统能力通过。运行时结论必须同时有源项目 URL/AppID、AX/截图、清空后的 Console/Debugger 和对应日志范围。

## 1. Planner 已核实的 v1.9 归档、基线与目标边界

### 1.1 v1.9 原样归档

- 覆盖前 `.codex/plans/current.md` 是 v1.9，113 行、17616 bytes，SHA-256 `21eb78c1a9faf96a7b9fc5302d184d378db7b15369af458a64739fdd0aac7ecf`。
- 已按字节复制为 `.codex/plans/history/current-v1.9-2026-09-29.md`；归档与覆盖前 current 使用 `cmp` 和 SHA-256 校验一致。不得覆盖 v1.8/v1.7/v1.6 历史归档。
- v1.9 执行日志在本计划编写前为 955 行、166051 bytes，SHA-256 `e5525ed2df2be912009c0e00264ce563bd8e4afb0f4e4f7d8e1877e5c2ed0d8c`；Planner 不追加该日志。

### 1.2 v1.9 已完成事实

- v1.9 Executor 已按 T0→T4 顺序完成：源路径授权门槛 `T19_SOURCE_PERMISSION=PASS`，编译门槛 `T19_COMPILE_GATE=PASS`，无新鲜 WXML/WXSS/`__route__` 错误；离线回归 `T4_OFFLINE_BASELINE=PASS`。
- v1.9 源窗口曾取得 `projectpath=/Users/lnp/Documents/ChatGPT/delicious- project`、AppID `touristappid`、页面路径和 Debugger Errors 0；四 Tab、聊天 mock 回复、喂养/摸摸、菜谱入口、相册上传入口/取消文件选择、邀请码/应用内分享面板、资料编辑入口有直接证据。
- v1.9 已明确未验证：键盘、滚动、长按完整手势、页面隐藏/重显、设置/隐私/反馈真实入口、运行时本地失败反馈，以及真实好友分享/云绑定、系统相册/文件完整生命周期、Storage quota/进程中断、锁定菜谱详情和真机。v2.0 只推进前一组可在源项目 local/touristappid 直接验证的能力。
- v1.9 的本地资源代理 `403 ua-token-missing`、`timingData not found`、游客 `wx.operateWXData` 受限、基础库灰度/组件 wxss selector 警告均属于工具或能力边界；必须继续保留原文并解释，不得当作源码编译错误，也不得隐藏警告。

### 1.3 配置与源码边界

- `project.config.json` 应保持 `compileType=miniprogram`、`appid=touristappid`、`libVersion=3.4.3`；`project.private.config.json` 基础库同为 3.4.3。
- `miniprogram/utils/appMeta.js` 应保持应用版本 1.4.0；`miniprogram/services/storageService.js` 应保持 schema 4/1.3。
- 相关现有契约：`pages/chat/chat.wxml` 有 `scroll-view`、`input`、`bindinput`、`bindconfirm`；`chat.js` 有 `onShow/onHide`、本地发送/空输入提示、`scrollIntoView` 与任务取消；`cat-display` 同时有 tap/longpress 并做重复事件抑制；相册图片长按会进入保存分支，但无有效图片或能力不可用时应显示占位/能力文案；settings/privacy/about/feedback 页面已有本地入口与失败文案。
- 本轮不得把 Node fallback、mock 记录或应用内分享面板升级为真实微信服务。真实好友分享、云端绑定、系统相册保存成功、文件系统完整生命周期、Storage 10MB quota 和进程中断、真机行为继续固定为 `BLOCKED / 未验证`。

## 2. v2.0 目标能力与直接证据定义

### 2.1 键盘输入与收起（`V20_KEYBOARD=PASS|BLOCKED`）

- 在源项目聊天页点击输入框，使用真实 DevTools 输入一段短文本，读取 AX/截图确认焦点、文字和发送控件；点击发送或触发 confirm-send 后，确认输入框清空、消息气泡出现、mock 回复/经验变化符合 v1.9 已知契约。
- 用真实 UI 点击消息区/猫卡或切换 Tab 触发键盘收起，再刷新 AX/截图确认键盘不再遮挡底部输入栏、页面没有重复发送；若工具无法直接提供键盘状态，必须记录可见的输入焦点/布局变化和 Console/日志证据，否则记为 BLOCKED。
- 不用脚本直接改 Page data 代替键盘；不把“输入框存在”或 headless bindconfirm 当作键盘 PASS。

### 2.2 滚动（`V20_SCROLL=PASS|BLOCKED`）

- 聊天页先产生足够本地消息或使用已有消息，真实拖动/滚动 `message-scroll`，记录滚动前后可见消息/AX 文本或 scroll 事件证据；隐私、关于、反馈页面再至少验证一个长 `scroll-view` 的上下移动。
- 滚动后点击输入/返回/Tab，确认输入栏和页面底部没有被遮挡、没有 WXML/WXSS/route 错误；若 AX 工具返回 `windowNotFoundAtPosition` 或不能证明视口变化，只记 BLOCKED，不把调用返回成功写成 PASS。

### 2.3 长按与保存边界（`V20_LONGPRESS=PASS|PARTIAL|BLOCKED`）

- 在聊天页对猫执行一次真实长按，读取经验/心情/爱心和日志，确认长按触发一次互动且后续 tap 没有重复增量；与 v1.9 的 token/时间抑制契约对照。
- 在相册没有有效本地图片时，对占位卡或预览占位执行长按，必须看到“占位照片暂时不能保存”或等价能力反馈，并确认没有弹出系统相册保存/文件选择器、没有调用保存成功路径。禁止为了验证而调用 `wx.saveImageToPhotosAlbum`、上传真实照片或修改系统权限。
- 若能安全进入真实图片预览，只验证长按入口与权限/能力反馈，不点击不可逆的系统保存；无法得到真实图片时，保留 `PHOTO_LONGPRESS=BLOCKED/未验证`，猫长按仍可单独 PASS。

### 2.4 页面隐藏/重显（`V20_LIFECYCLE=PASS|PARTIAL|BLOCKED`）

- 从聊天页发送一条本地消息，切换到其他 Tab 或进入设置/隐私，再返回聊天；读取页面路径、消息/猫状态、Debugger/Console，确认 `onShow` 重新载入且 `onHide` 取消任务，没有重复 timer、重复消息或旧错误。
- 在设置→隐私→反馈→返回链路重复一次，确认每页真实路径、标题和返回后状态。只记录直接 AX/截图/日志，不能用源码含有 `onShow/onHide` 代替行为 PASS。
- 不做进程杀死、Storage quota 注入或用户数据清空；这些生命周期/恢复场景仍 BLOCKED。

### 2.5 设置、隐私、反馈入口与本地失败反馈（`V20_LOCAL_UX=PASS|PARTIAL|BLOCKED`）

- 从“我的”进入“设置与隐私”，分别打开“关于八条与你”“隐私说明”“意见反馈”；确认源路径、标题、长文案、返回/反馈 CTA 和 local-only 限制可见。设置开关只在可恢复且不破坏用户数据的范围内切换并记录页面结果；不伪造通知送达。
- 在反馈页验证无写入的短文本校验，必须显示“反馈内容至少写 5 个字”或等价错误；可验证的本地成功路径只在用户数据可安全隔离/清理时执行，成功文案必须明确“已记录在本设备，尚未发送到服务器”。不能把 headless smoke 的本地记录当运行时 PASS。
- 验证至少一个不调用外部系统的失败反馈：取消文件选择、占位照片长按、能力不可用提示、导航失败文案或短反馈校验。记录 Toast/页面错误文本、Console/日志和触发动作；不主动制造系统权限、Storage quota 或网络错误。
- 现有警告要建立“原文 → 来源/影响 → 是否阻断”矩阵：游客 `wx.operateWXData`、基础库灰度、组件 selector 限制、本地 `__getprojectoriginfile__ 403 ua-token-missing`、`timingData not found` 等；仅 WXML/WXSS/`__route__`、权限模态或新 EPERM 才阻断本轮交互。

## 3. 串行任务与验收

### T0：读取 v2.0 计划并冻结本地基线

- Executor 第一动作是读取本文件并记录读取前 SHA-256、行数、字节数；核验 v1.9 归档与 v1.8/v1.7/v1.6 归档存在且 hash 不变，确认 Planner 已停止且没有其他 Executor 并行。
- 只读核验配置、版本、schema、AppID、源项目 URL；核对 `miniprogram`/scripts 文件树与关键源码 SHA，确认无外部漂移。
- 按 README 顺序运行资源审计、全部 JS `node --check`、`validate-miniapp.js`、已有 storage/cat/photo/file/care/invariants/recovery/lifecycle/local/pages/capabilities smoke、JSON、页面 Storage 越层、WXSS/WXML 结构和静态风险扫描；记录真实退出码/输出。
- 读取源项目新鲜 AX、清空 Console 后的 Debugger 和绝对 DevTools 日志；若窗口不是源路径/AppID 或无法取得新鲜证据，暂停，不进入 T1。
- 验证标记：`V20_T0_OFFLINE_BASELINE=PASS`、配置未漂移、源路径证据可追溯。暂停条件：归档/哈希不一致、离线失败、源码外部改动、源窗口不可确认。

### T1：源路径编译门槛与警告基线

- 在源项目清空 Console，执行一次普通编译/刷新；记录 Debugger Errors/Warnings、Console 全量、编译面板、AX/截图和日志时间范围。
- 只有新鲜且精确指向源码的 WXML/WXSS/`__route__` 错误才允许对应单文件最小修复；若无错误记录“无需代码改动”。不得为了消除 warnings 重写 CSS、改配置或升级工具。
- 建立警告解释矩阵并确认它们未阻断页面渲染；若出现权限模态、新 `EPERM`、route/WXML/WXSS 错误，立即追加日志并暂停后续交互。
- 验证：`V20_COMPILE_GATE=PASS` 仅在清空后的源 Console 无编译/渲染错误、Debugger Errors=0 且源 URL/AppID 清晰时输出；否则标记 BLOCKED 进入 T4。

### T2：聊天键盘、滚动、猫长按与重复抑制

- 仅在 T1 门槛通过后，按 2.1→2.3 顺序完成真实 UI 操作，每项完成后立即读取新鲜 AX/截图、错误计数和日志并追加执行记录。
- 键盘输入/confirm、发送后清空与 mock 回复；滚动前后可见内容变化；猫 tap/longpress 各一次且重复事件只产生一次增量；不得以源码扫描替代。
- 相册占位长按仅验证安全拒绝文案与没有系统保存调用；若触发文件选择器或系统保存窗口，立即取消并记为边界。
- 验证：分别输出 `V20_KEYBOARD`、`V20_SCROLL`、`V20_LONGPRESS`；任何新编译/权限/EPERM 错误立即停止 T2 剩余交互并进入 T4。缺少直接 AX/日志证据则 BLOCKED。

### T3：页面生命周期、设置/隐私/反馈与失败反馈

- 按 2.4→2.5 顺序执行；每次切换前核对源项目 URL、AppID 和页面路径，切换后刷新 AX/截图并读取 Console/日志。
- 验证聊天 onHide/onShow 状态恢复、设置三入口、隐私/关于长文滚动、反馈短文本错误、取消文件选择/能力文案；所有成功/失败文本照录。
- 只执行可逆交互。不得点击清除全部本地数据、不得注册 AppID、不得真实发送好友分享、不得调用系统相册保存、不得注入 quota/kill 进程。
- 验证：输出 `V20_LIFECYCLE`、`V20_LOCAL_UX` 以及警告矩阵；设置/隐私/反馈路径和至少一个失败反馈必须有直接证据。入口打不开、状态不恢复或出现新错误则逐项 BLOCKED/FAIL，追加日志后进入 T4。

### T4：完整离线回归、README/日志/计划收口

- 允许修改范围：默认只追加 `.codex/plans/execution-log.md`、按事实更新 `README.md`、在 current.md 末尾追加 T0–T4 收口；若 T1 取得精确源码错误，保留对应最小单文件修复并记录前后 SHA。不得改配置、AppID、schema/version、资源、依赖或新增网络服务。
- 重跑 README 完整命令并记录真实输出：资源审计、全部 JS `node --check`、`validate-miniapp.js`、全部既有 smoke、JSON、`PAGE_STORAGE_LEAK=0`、`WXSS_UNIVERSAL_COMBINATORS=0`、`WXML_CHAT_BUBBLE_STRUCTURE=PASS`、`STATIC_RISK_SCAN=0`。
- 复核 v1.9/v1.8/v1.7/v1.6 归档 SHA、current/log/README 最终字节和 SHA，列出所有实际修改文件；对每个 V20 标记写明 PASS、PARTIAL、FAIL 或 BLOCKED 及直接证据。
- 收口结论必须区分“本地交互能力已验证”和“真实微信能力未验证”。真实好友分享/云绑定、系统相册/文件完整生命周期、Storage quota/进程中断、真机、锁定菜谱详情继续写 `BLOCKED / 未验证`，不得声称全量运行时通过。
- 暂停：离线回归失败、静态风险命中、文件范围越界、哈希无法解释、需系统设置/AppID/外部网络/不可逆操作时，先写日志再停止。

## 4. 外部动作、警告与停止原则

- 用户已授权微信开发者工具访问源目录；Planner/Executor 不点击系统安全设置。若新鲜源窗口再次出现无权限模态或 `EPERM`，记录原文并暂停。
- `touristappid` 保持不变；真实分享、云绑定、系统相册保存、跨设备同步和真机验证需要外部账号/设备，不能由本轮替代。
- 所有警告必须保留原文、来源和影响；游客 API 限制、基础库灰度、组件 selector、代理 403、计时缺失不应被静默，也不应无依据升级为 FAIL。
- 临时副本只用于权限/工具诊断，必须字节清单和关键 SHA；副本 AppID 若被工具改写不得代表源项目。不得以副本、headless 或截图编辑代替源项目证据。

## 5. 父 Agent 启动前独立校验

- 执行 `test -s .codex/plans/current.md`，并用 `cmp`/SHA-256 确认 `.codex/plans/history/current-v1.9-2026-09-29.md` 与覆盖前 v1.9 完全一致：113 行、17616 bytes、SHA-256 `21eb78c1a9faf96a7b9fc5302d184d378db7b15369af458a64739fdd0aac7ecf`。
- 用 `rg` 检查 T0、T1、T2、T3、T4、`touristappid`、`V20_KEYBOARD`、`V20_SCROLL`、`V20_LONGPRESS`、`V20_LIFECYCLE`、`V20_LOCAL_UX`、`V20_COMPILE_GATE`、`BLOCKED / 未验证`、Planner 与 Executor 均存在且顺序正确。
- 记录 current.md 当前行数、字节数、SHA-256；确认 Planner 只新增 v1.9 归档和 current.md，未改变 README、execution-log、业务源码、配置、资源或依赖。
- Planner 在完成这些校验后停止，不启动 Executor。Executor 完成后不得由 Planner 代写 T0–T4 结果。

## v2.0 Executor T4 收口（2026-09-29）

- T0：完整读取本计划，读取前 SHA-256 `0f7c7ff489582ce18dbc3d3af976d8e19d668a92f04986d300afcfdde87bcb37`；归档、配置、AppID、版本/schema、源码树无漂移；离线基线与源项目 AX/日志证据通过，`V20_T0_OFFLINE_BASELINE=PASS`。
- T1：源项目清空 Console 后普通编译，源 URL/AppID 清晰，Debugger `Errors: 0`；WXML/WXSS/`__route__`/权限/EPERM 新鲜计数均为 0，工具/游客 warnings 已解释，`V20_COMPILE_GATE=PASS`，无需代码修复。
- T2：聊天真实输入/发送/清空与 mock 回复通过，消息区和隐私长文前后滚动截图通过；猫真实 hold/long-press 无可用 UI 接口，严格记 `V20_KEYBOARD=PASS`、`V20_SCROLL=PASS`、`V20_LONGPRESS=BLOCKED / 未验证`。
- T3：聊天消息在设置/隐私/反馈链路隐藏重显后保留，真实打开设置、关于、隐私、反馈入口；反馈单字提交显示“反馈内容至少写 5 个字”，`V20_LIFECYCLE=PASS`、`V20_LOCAL_UX=PASS`。未点击清除本地数据、未调用系统相册保存、未真实分享/云绑定、未注入 quota 或终止进程。
- T4 离线回归：资源审计 `ASSET_CAT_COUNT=4`、`ASSET_CAT_BYTES=1374256`、`ASSET_MINIPROGRAM_BYTES=1610501`、`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`；49 个 JS `node --check` 通过；`validate-miniapp.js` 为 `ASSET_AUDIT=PASS`、`AUDIT_FILES=118`、`ERRORS=0`、`WARNINGS=0`；storage/cat/photo/file-cleanup/care/invariants/recovery/lifecycle/local/pages/capabilities smoke 全部 PASS；`ALL_JSON_OK`、`PAGE_STORAGE_LEAK=0`、`WXML_CHAT_BUBBLE_STRUCTURE=PASS`、`WXSS_UNIVERSAL_COMBINATORS=0`、`STATIC_RISK_SCAN=0`。
- 文档与文件范围：仅追加 `README.md`、`.codex/plans/current.md`、`.codex/plans/execution-log.md`；未修改业务源码、配置、资源、脚本、依赖、AppID、schema 或版本。T4 结束时必须由父 Agent 读取并报告三份文档的最终字节/SHA；关键受保护文件哈希仍为 `project.config.json=999c1adb4c03d85076878a88ba4a3d3a32381ad5d35805f4fd70578d0fcab47b`、`project.private.config.json=240345d4b88b5bd08caba18d2ba92d70b03bd8f2ed188ca5b1db23e45387b161`、`appMeta.js=99ca2165f530dc4e43660a56d48e98bc6dbfe1fa3c0d6fcbb485b8672a5d49c1`、`storageService.js=50db6c11e9fe823eebdefaaa5c36f62dded828d62b1fa7b718c0790f67adf5c6`、`chat-bubble.wxml=68e2ddb7d149f5e8e958b27a0fb812fabd46a9bdd3e42d4704d220e257706a3f`。
- 未验证边界：真实好友分享/云端绑定、系统相册/文件完整生命周期、照片真实长按保存、Storage 10MB quota/进程中断、锁定菜谱详情、真机和 Mac 锁定详情继续 `BLOCKED / 未验证`；游客 API、基础库灰度、组件 selector、本地代理 403、`timingData not found` 仅为工具/能力边界，不升级为源码错误。
- 收口状态：T0→T4 顺序完成；本地交互能力有直接证据，真实微信能力保持明确阻塞或未验证，不宣称全量运行时通过。
