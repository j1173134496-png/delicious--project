# Planner 计划：八条与你 v1.8 WXML 结构修复与 DevTools 运行时交接

## 0. 角色、顺序和修改纪律

- **角色**：本文件是 v1.8 唯一计划。Planner 只读取证据、设计方案、归档上一轮计划并写入本文件；不得实现业务代码、修改配置/资源、改 README 或启动 Executor。父 Agent 独立确认本文件存在、非空、哈希和任务顺序后，才可启动唯一 Executor。
- **Executor 顺序**：只能按 `T0 → T1 → T2 → T3 → T4` 串行执行；每个任务完成后立即执行本任务的验证，在 `.codex/plans/execution-log.md` 追加“操作 → 验证 → 结果 → 状态/阻塞”；未完成或无法复现不得写成完成。Planner 与 Executor 不并行。
- **生成日期**：2026-09-28。
- **项目根目录**：`/Users/lnp/Documents/ChatGPT/delicious- project`。
- **版本和能力边界**：应用版本保持 `1.4.0`；数据 schema 保持数值 `4` / 名称 `1.3`；基础库目标保持 `3.4.3`；`project.config.json` 的 AppID 保持 `touristappid`。不伪造微信登录、云端同步、LLM、分享面板、系统相册或跨设备能力，不用改 AppID 绕过工具错误。
- **上一轮原样归档**：本轮覆盖前的 v1.7 计划归档为 `.codex/plans/history/current-v1.7-2026-09-28.md`，不得覆盖已有 v1.6 及更早归档。归档前应验证其 `145` 行、`18469` bytes、SHA-256 `c01d28c6d5ef88b0d18017263bbd3a92b722f7eb4c9e4dd9fd1c1ab8d64248d5`；归档后只读。
- **Planner 可修改范围**：只覆盖 `.codex/plans/current.md`，并创建上述 v1.7 归档；不修改 `miniprogram/`、`scripts/`、`project*.json`、素材、README 或执行日志。Executor 获得本计划授权后才可按任务范围修改业务文件、README 和追加执行日志。
- **项目专用 Agent 配置**：已检查项目内 `.codex/agents/`，不存在 `planner.toml` 或 `executor.toml`；按用户要求采用 Codex 原生 Planner/Executor 职责，不创建配置文件。
- **证据纪律**：Node smoke、静态扫描、headless wx stub 和文件存在只能证明离线分支；只有当前 DevTools 的控制台、编译面板、AX/截图和日志才能证明 WXSS/WXML 编译、renderer、权限、分享、文件或 Storage。webview `loadstop`、`LoadApp`、页面路径、四个 Tab、`hasUser=true`、`isTourist=false` 或 appservice restart 单独都不能升级为运行时 PASS。

## 1. 当前状态与已核实证据

### 1.1 v1.7 已完成并停止

- `/root/executor_v17` 已报告并停止；其 T0–T4 均有执行日志。v1.7 结论是“离线代码/资源全绿，真实 renderer 部分完成但 BLOCKED / 未验证”，不是全量运行时通过。
- v1.7 执行日志当前为 `831` 行、`127307` bytes、SHA-256 `6d817b69fa9f734f615b313b5d1b43fd989d5aa625cf1a35eff0586e5a77d2c9`（Executor 以执行时实际值为准）。v1.7 计划当前为 `145` 行、`18469` bytes、SHA-256 `c01d28c6d5ef88b0d18017263bbd3a92b722f7eb4c9e4dd9fd1c1ab8d64248d5`，覆盖前先完整归档。
- v1.7 已修复 8 个经 DevTools 精确定位的 WXSS 通配相邻选择器；离线资源、JS、JSON、页面/Service smoke 和静态风险扫描通过。不得回退这些改动，也不得把旧的 WXSS 错误重新写成当前根因。

### 1.2 当前 WXML 与 `__route__` 证据

- 现有 `miniprogram/components/chat-bubble/chat-bubble.wxml` 为：
  ```wxml
  <view class="bubble-row {{message.senderId === 'batiao' ? 'bubble-row--cat' : 'bubble-row--user'}}">
    <view class="bubble-avatar" wx:if="{{message.senderId === 'batiao'}}">🐱</view>
    <view class="bubble {{message.type === 'emotion_care' ? 'bubble--care' : ''}}"><text class="bubble-care-label" wx:if="{{message.type === 'emotion_care'}}">八条的关怀提醒</text><text>{{message.content}}</text><text class="bubble-time">{{time}}</text></view>
    <view class="bubble-avatar bubble-avatar--user" wx:else>你</view>
  </view>
  ```
- 第 4 行的 `wx:else` 与第 2 行的 `wx:if` 之间隔着一个同级聊天气泡节点；微信 WXML 要求 `wx:else` 紧跟同级 `wx:if`，所以这是可由源码直接证明的结构错误。它不是由游客 AppID、样式或数据造成的。
- v1.7 DevTools Stable `2.02.2608070` / 基础库 `3.4.3` 的直接错误为：`[ WXML 文件编译错误] ./components/chat-bubble/chat-bubble.wxml`、`Bad attr wx:else with message: wx:if not found`；随后出现 `[渲染层错误] ReferenceError: SystemError (webviewScriptError) __route__ is not defined`。计划把后者视为 appservice/WXML bridge 在编译失败或工具初始化失败后的连锁证据，不把它误判为独立业务变量缺失；修复 WXML 后必须以新鲜 DevTools 日志判断它是否消失，不能只靠推断。
- 其他 WXML 中已检查到的 `wx:if`/`wx:else` 均需保持同级相邻；本轮不可顺手重写无错误页面。

### 1.3 DevTools、目录权限和 AppID 边界

- 项目路径为 `/Users/lnp/Documents/ChatGPT/delicious- project`，窗口项目 `batiao-love`，AppID `touristappid`，登录界面曾显示“热心人士”并有 `isTourist=false`，但 AppID 仍是游客标识，不能当注册小程序能力或云端身份。
- 日志/AX 曾同时给出：标题“八条与你”、四个 Tab、页面路径 `pages/chat/chat`；WXSS 修复后 WXML 错误和 `__route__` 错误；系统模态“没有权限访问 /Users/lnp/Documents/ChatGPT/delicious- project，请确保在系统偏好设置 - 安全与隐私中授予了微信开发者工具该文件夹的访问权限”；日志 `EPERM: operation not permitted, watch '/Users/lnp/Documents/ChatGPT'`；`isMiniAppProject=false`；开发/测试库接口系统错误码 `1`；`routeTo appLaunch/switchTab timeout`。
- 临时诊断副本 `/tmp/batiao-love-devtools-20260928-150135` 与源项目 `156` 文件逐字节一致，但因 `touristappid` 导入系统错误码 `1` 未能编译；副本证据不等于原路径权限已修复。旧的 `INVALID_LOGIN, access_token expired [touristappid]` 仅作历史阻塞保留。
- 这些外部错误不能通过修改业务 WXML、关闭检查、改 schema/version 或替换 AppID 消除。真实能力（四 Tab 首屏、分享/邀请码、相册/文件权限、布局/输入/手势、Storage/lifecycle）仍必须逐项取得直接证据。

### 1.4 PRD 与当前交付边界

- PRD 要求聊天气泡显示八条/用户两侧、普通 mock 聊天和隐私边界；四个 Tab 为八条、菜谱、相册、我的；v1 使用本地 Storage/文件适配器，不接真实 LLM、云同步、通知或跨设备绑定。
- PRD 的专用状态 PNG、真实双端同步、真机权限和系统生命周期不在本轮伪造。WXML 修复只能恢复应有的聊天 DOM 分支，不能扩大成重做 UI 或引入依赖。

## 2. 串行任务与验收

### T0：冻结 v1.7 基线并复核当前现场

- **目标**：证明 v1.7 结束状态没有漂移，为 WXML 修复保留可回溯证据。
- **Executor 可读范围**：`PRD-情侣小程序「八条与你」.md`、`README.md`、当前计划及 v1.7/v1.6 归档、`execution-log.md`、`miniprogram/**`、`scripts/**`、`project.config.json`、`project.private.config.json`、最新绝对 DevTools 日志和当前 AX/截图。
- **操作顺序**：
  1. Executor 必须先读取本文件，并记录读取前 SHA；校验 v1.7 归档与 v1.6 归档行数/字节/SHA；确认 `/root/executor_v17` 已停止且未与本轮并行。
  2. 记录 `miniprogram`/`scripts` 文件计数、AppID、基础库、`miniprogramRoot`、应用 `1.4.0`、schema `4/1.3` 和 `project*.json` SHA；确认 `touristappid` 未漂移。
  3. 按 README 既有顺序重跑离线基线：`node scripts/audit-assets.js`；全部 `miniprogram/**/*.js node --check`；`node scripts/validate-miniapp.js`；既有 storage/cat/photo/file/care/invariants/recovery/lifecycle/local/pages/capabilities smoke；根目录与 `miniprogram/**/*.json` 解析；页面 Storage 越层扫描；外链/凭据/未完成标记/旧版本扫描。不得为绿灯删数据、放宽扫描或新增依赖。
  4. 读取最新 DevTools 日志/AX；记录原路径、工具版本、页面路径、权限模态、`EPERM watch`、`isMiniAppProject=false`、WXML/`__route__`/WXSS 当前文本和登录/AppID状态。若工具已关闭，记录“当前无新现场”，不得用旧截图冒充新 PASS。
  5. T0 只追加执行日志，不改业务源码、配置、资源、README、AppID、schema 或版本。
- **验证**：归档输出 `V17_ARCHIVE_OK`；离线命令全部退出码为 0，结果与实际本次输出一致；当前 WXML 中的非相邻 `wx:else` 和历史 DevTools 错误均被明确记录。
- **验收/暂停**：若归档不一致、配置漂移、源码被外部改动、离线基线失败、出现新凭据/外链或无法读取必要日志，立即暂停，不进入 T1。

### T1：修复 chat-bubble WXML 的最小条件结构

- **目标**：消除已被 DevTools 精确指向的 `wx:else` 非相邻结构，保持猫侧/用户侧 DOM 顺序、CSS 类、消息内容和时间显示不变。
- **允许修改的精确文件范围**：首选只改 `miniprogram/components/chat-bubble/chat-bubble.wxml`；允许追加 `.codex/plans/execution-log.md` 和在最终收口时更新 README/计划状态。不得改 `chat-bubble.js/json/wxss`、任何页面 JS/WXML、配置、资源或服务层。
- **最小修复策略**：将最后一个用户头像节点从非法 `wx:else` 改为与其语义等价的同级负条件，例如 `wx:if="{{message.senderId !== 'batiao'}}"`；保留第一个猫头像 `wx:if`、中间 bubble 节点及其原顺序和 class。这样猫消息仍为“猫头像 → 气泡”，用户消息仍为“气泡 → 用户头像”，不会复制气泡模板或改变样式。若基础库对严格不等式给出新的精确解析错误，才可采用同级 `<block wx:if>`/`<block wx:else>` 的最小分支重排，且必须保持上述 DOM 顺序并记录原因；不得借机重写组件。
- **离线验证**：用一次性 Node/Python 检查确认 `chat-bubble.wxml` 不再有非相邻 `wx:else`，两个 sender 分支均存在且消息内容/时间绑定保留；运行 JSON 解析、全部 JS `node --check`、`validate-miniapp.js`、`smoke-pages.js`、`smoke-local.js`、`smoke-capabilities.js`、`smoke-cat-interaction.js` 与静态风险扫描。不得新增测试脚本来掩盖错误。
- **验收**：T1 只有在文件 diff 限于上述范围、离线结果全部真实通过且执行日志记录文件 SHA 后才标记完成。离线通过不能写成 DevTools renderer 已通过。
- **暂停**：如果需要改 JS/CSS、放宽编译器、隐藏错误、引入网络/依赖、改变数据结构或 AppID，立即暂停并报告。

### T2：复编、权限隔离与 WXML/`__route__` 因果验证

- **目标**：在 T1 后取得新鲜 DevTools 证据，分离源码 WXML 错误、`__route__` 连锁错误、原路径 macOS 权限/EPERM 和 `touristappid` 工具接口错误。
- **允许修改/生成范围**：源项目只允许 T1 的 WXML 修复；可创建一次性 `/tmp/batiao-love-devtools-v18-<timestamp>` 字节一致诊断副本（不交付、不提交、不改配置），追加执行日志；不得修改系统安全设置、`project.config.json`、`project.private.config.json`、AppID、schema/version。
- **操作顺序**：
  1. 在原路径先普通编译/刷新，读取 Console、编译面板、AX 和最新日志；复制 `[WXML 文件编译错误]`、`__route__`、WXSS、`routeTo timeout` 的精确文本。权限模态只允许点“确定”以读取证据，不点击“打开系统设置”。
  2. 判断修复后的 WXML 错误是否消失：`chat-bubble.wxml` 不再报 `Bad attr wx:else`；若 `__route__` 同时消失，记录因果得到支持；若 `__route__` 仍在，按工具/权限/初始化阻塞记录，不擅自改业务代码。
  3. 创建 post-T1 临时副本，排除 `.codex`/`.DS_Store`，记录源/副本文件清单、关键 SHA、`TEMP_MISSING/EXTRA/CHANGED`；在 DevTools 导入副本并普通编译，比较权限模态、watcher `EPERM`、导入错误码、WXML/WXSS/`__route__` 和页面路径。
  4. 将结果归入 A（原路径权限已由用户修复且无同类 EPERM）、B（副本可运行而原路径受权限阻塞）、C（两者都被 `touristappid`/工具或其他错误阻断）；无论 A/B/C 都要附原文和路径。不得把副本或页面路径单独写成原项目通过。
- **验证**：新鲜日志文件名/时间、编译面板状态、AX/截图路径和源/副本 hashes 都写入日志；确认 T1 的 WXML 源错误状态与 `__route__` 状态分别记录。WXSS 已修复的历史证据不重复写成当前新修复。
- **暂停条件**：需要用户授予 macOS 文件夹访问权、输入真实注册 AppID、修改钥匙串/账号、升级工具、接入网络或真机操作时暂停并报告；权限模态与 EPERM 不得靠业务代码绕过。

### T3：真实 renderer 与 PRD 能力交接

- **前置门槛**：仅在 T2 获得无 WXML/WXSS 编译错误且 `__route__` 不再阻塞的直接证据后，才尝试把下列能力逐项验证；若任一门槛失败，按项记录 BLOCKED/未验证并进入 T4，不伪造截图。
- **顺序和证据**：普通编译后确认 `pages/chat/chat`，依次点击八条、菜谱、相册、我的四个 Tab；每项记录工具版本、AppID、基础库、实际路径、截图/AX 和 Console。控制台不能有未解释的业务错误。
- **按 PRD 检查**：聊天气泡左右布局、输入/发送、mock 回复和喂食/抚摸；菜谱未解锁/缺图占位、详情/新增；相册月份分组、预览/长按保存入口、头像/迁移坏 URI 占位和删除；绑定邀请码预填、复制/分享按钮及禁用原因；安全区、字体、键盘、滚动、swiper、长按和重复点击；页面隐藏/重显、Storage 写入/清除失败反馈和文件生命周期。每项只标 `PASS`、`FAIL` 或 `BLOCKED/未验证`，附直接证据。
- **能力边界**：`touristappid`、游客 `operateWXData`、`isMiniAppProject=false`、开发/实验接口错误码、旧 `INVALID_LOGIN` 必须原文保留；分享面板、系统相册、真实权限、跨设备/云同步不能用 headless `canIUse` 或本地 smoke 代替。原路径有 OS 权限问题时，临时副本结果必须显式标明副本路径。
- **暂停**：WXML/WXSS/`__route__` 任一错误复现、权限模态持续、需要真实 AppID/真机或出现不可逆外部动作时停止能力扩展，记录阻塞并进入 T4。

### T4：最终离线复核、文档收口与交付报告

- **允许修改的文件范围**：已证实的 `miniprogram/components/chat-bubble/chat-bubble.wxml`；按事实更新 `README.md`；追加 `.codex/plans/execution-log.md`；更新 `.codex/plans/current.md` 的 T0–T4 状态。不得删除历史归档、回退 v1.7 WXSS、改配置/AppID/schema/version、清空用户数据或新增远程依赖。
- **操作与验证**：
  1. 按 README 完整重跑资源预算、全部 JS `node --check`、`validate-miniapp.js`、全部既有 smoke、JSON 解析、页面 Storage 越层扫描、外链/凭据/未完成/旧版本扫描；增加一次性 WXML 条件相邻性检查，输出 `WXML_CHAT_BUBBLE_STRUCTURE=PASS` 或真实失败。
  2. 复核 v1.7 归档和 v1.6 归档 SHA；列出本轮实际修改文件及 SHA、源/副本差异、DevTools 最新日志/截图和每个能力项状态。
  3. 对每个 T0–T4 在执行日志保留“操作 → 验证 → 结果 → 状态/暂停原因”；若 T2/T3 仍受权限、工具接口、游客 AppID 或 `__route__` 阻塞，最终结论必须是“部分完成 + 明确阻塞”，不得写“项目运行时全部通过”。
  4. README 只补充实际发生的 WXML 修复及当前运行时证据边界；不把 WXML 源修复等同于真实分享、权限、Storage、真机或跨设备能力。
- **最终验收**：离线命令退出码全为 0，`WXML_CHAT_BUBBLE_STRUCTURE=PASS`，计划/日志/归档 hashes 可复核，未产生未授权业务文件；DevTools 证据按项真实标注，所有剩余 BLOCKED/未验证项和外部动作可追溯。
- **暂停**：任一离线回归失败、出现静态风险、文件范围超出授权、计划/日志 hash 无法解释或需要新增外部服务时暂停，不宣称交付完成。

## 3. 用户需要的外部动作

1. 若要验证原项目路径，用户需在 macOS“系统设置 → 隐私与安全性 → 文件与文件夹/完全磁盘访问权限”中给微信开发者工具授予 `/Users/lnp/Documents/ChatGPT/delicious- project` 的访问权，并完成后通知 Executor。Planner/Executor 不代替用户点击或修改 OS 安全设置。
2. 若临时副本也被 `touristappid` 导入系统错误码 `1` 阻断，继续真实账号/上传/云能力需要用户提供已注册 AppID 与相应账号授权；本轮不得自行替换 `touristappid`。
3. 若用户只允许离线推进，可交付 WXML 源修复和完整离线证据，同时保留原路径 renderer、权限、分享、文件和 Storage 为 BLOCKED/未验证。

## 4. 总体风险与停止原则

- `chat-bubble.wxml` 的非相邻 `wx:else` 是本轮唯一已由源码与 DevTools 同时证明的业务编译根因；最小修复必须保持视觉结构，禁止大面积重写。
- `__route__ is not defined` 可能是 WXML 编译失败、WXML bridge/权限或工具初始化链路的次生错误；只有新鲜 Console/日志显示其消失才可记录为消失，不能凭页面路径或截图推断。
- macOS 目录权限、`EPERM` watcher、DevTools 开发库接口和 `touristappid` 游客边界属于外部状态；它们不能通过业务代码伪造，且重复出现时仍应记录为 BLOCKED，而不是无限重启。
- Planner 完成本文件后停止，不得启动 Executor；Executor 若遇到暂停条件，在日志记录后停止并向父 Agent 汇报原因。

## 5. v1.8 Executor 收口状态（2026-09-28）

- **T0：完成**。读取前计划 SHA `093299c97848bfa3333330b42cfecf0e784abaf3c9b7a72e3701226b80446b27`；v1.7/v1.6 归档校验通过；AppID `touristappid`、基础库 `3.4.3`、应用 `1.4.0`、schema `4/1.3` 未漂移；离线基线全绿；原路径 WXML、`__route__`、EPERM、`isMiniAppProject=false` 和游客边界均留有新鲜现场/历史证据。
- **T1：完成**。仅修改 `miniprogram/components/chat-bubble/chat-bubble.wxml`，将非相邻 `wx:else` 改成 `message.senderId !== 'batiao'` 的同级 `wx:if`；结构检查 `WXML_CHAT_BUBBLE_STRUCTURE=PASS`，离线验证全绿，文件 SHA `68e2ddb7d149f5e8e958b27a0fb812fabd46a9bdd3e42d4704d220e257706a3f`。
- **T2：完成（外部边界保留）**。原路径清空 Console 后复编的 Debugger 为 `Errors: 0, Warnings: 0`，新鲜截图/日志不再出现 WXML/WXSS/`__route__`；临时副本 `/private/tmp/batiao-love-devtools-v18-uMFvhB` 预拷贝逐字节一致，但 DevTools 创建副本时把 AppID 改成 `wxec20aaa84bd3fa42`，副本运行证据不能代表原路径 `touristappid`；结论按计划记为 B，原路径 macOS 目录权限/EPERM 仍需用户动作。
- **T3：部分完成 + BLOCKED / 未验证**。临时副本四 Tab 取得 `pages/chat/chat`、`pages/recipe/recipe`、`pages/album/album`、`pages/profile/profile` 的截图/AX，均 `Errors: 0`；分享、权限、系统相册/文件、Storage/lifecycle、键盘/手势和聊天发送/mock 回复没有满足原路径与游客 AppID 边界的直接证据，未宣称通过。
- **T4：完成（部分交付）**。完整离线回归退出码全为 0，`WXML_CHAT_BUBBLE_STRUCTURE=PASS`、`WXSS_UNIVERSAL_COMBINATORS=0`、`STATIC_RISK_SCAN=0`；README 已补充实际 WXML 修复和副本/运行时证据边界；执行日志保留每个任务的操作、验证、结果和阻塞。最终结论为“离线代码与 WXML 修复完成 + 原路径 renderer/权限/游客能力部分完成并明确阻塞”，不是运行时全部通过。
