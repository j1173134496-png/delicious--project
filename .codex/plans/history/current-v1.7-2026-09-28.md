# Planner 计划：八条与你 v1.7 DevTools 构建阻塞定位与运行时交接

## 0. 角色、顺序和修改纪律

- **角色**：Planner Agent。本文件是本轮唯一计划；Planner 不实现业务代码、不改配置/资源、不启动 Executor。Executor 只能在 Planner 完成并由父任务确认本文件存在后启动，且必须按 T0 → T1 → T2 → T3 → T4 串行执行。
- **生成日期**：2026-09-28。
- **项目根目录**：`/Users/lnp/Documents/ChatGPT/delicious- project`。
- **版本边界**：应用仍为 `1.4.0`，数据 schema 仍为数值 `4` / 名称 `1.3`，基础库目标仍为 `3.4.3`，AppID 仍为 `touristappid`。除非用户另行提供已注册 AppID，不得替换 AppID、伪造登录或把游客能力写成云端能力。
- **上一轮原样归档**：`.codex/plans/history/current-v1.6-2026-09-28.md`。
  - 归档行数：149；字节数：17076。
  - 归档 SHA-256：`4bfc5b77b1d151e01280c16612986ff5373de8cf2a0f57921b8124644e4da0e0`。
  - 归档应保持只读；不得覆盖已有 v1.5 及更早归档。
- **本轮 Planner 允许修改**：覆盖 `.codex/plans/current.md`，并创建上述 v1.6 计划归档；不修改 `miniprogram/`、`scripts/`、`project*.json`、素材、README 或执行日志。Executor 获得本计划授权后，才可按任务范围修改业务文件并追加执行日志。
- **证据纪律**：离线 Node smoke、静态审计、headless wx stub 只能证明离线分支；真实 DevTools 截图/控制台/日志才可证明运行时。任何旧日志、二维码回调、`hasUser=true`、`isTourist=false`、webview 创建或 appservice restart 都不能单独升级为编译/renderer/权限通过。

## 1. 当前状态和已核实证据

### 1.1 v1.6 离线成果（保留，不回退）

- `.codex/plans/current.md` 在覆盖前为149行、17076 bytes、SHA-256 `4bfc5b77b1d151e01280c16612986ff5373de8cf2a0f57921b8124644e4da0e0`；T0/T1 离线结果通过，T2 运行时未验证。
- v1.6 已收敛媒体边界：迁移的远程/data/blob/未知 URI 保留 metadata，但 presenter 占位、不交给 `<image>` 和系统相册；合法本地/微信路径保持可用。
- 已有离线基线需继续保留：资源四张 idle PNG、源包约1.61 MB低于预算、`validate-miniapp.js` 文件审计 118、JSON/页面 Storage 越层/静态风险扫描通过，既有 smoke 全部 PASS（以 Executor 本次真实输出为准）。专用 happy/eating/sleeping/sad PNG 仍是待素材，不在本轮伪造。

### 1.2 最新微信开发者工具现场证据

- 工具：微信开发者工具 Stable `2.02.2608070`；窗口项目 `batiao-love`；项目路径 `/Users/lnp/Documents/ChatGPT/delicious- project`；AppID `touristappid`；当前登录状态日志为 `hasUser=true, isTourist=false`。
- 最新日志文件：`/Users/lnp/Library/Application Support/微信开发者工具/d1e8765721a6c23d43b14c95b1843e6b/WeappLog/logs/2026-09-28-14-43-26-352.log`；同批入口日志为 `2026-09-28-14-43-27-13.log`。
- 日志已明确：
  - `project ready, projectpath=/Users/lnp/Documents/ChatGPT/delicious- project`；
  - 随后记录 `isMiniAppProject=false`；
  - `fetchDevelopLibInfo` development/beta 返回系统错误码1，`fetchAppExptInfo` 也返回系统错误码1；
  - FileUtils 读取到项目，PreCompileProject 为 164 files / 43 dirs，Resolver 识别 118 code files；
  - **关键环境错误**：`fileutils restart error: Error: EPERM: operation not permitted, watch '/Users/lnp/Documents/ChatGPT'`；
  - appservice webview 曾 `loadstop`，Simulator Native App `LoadApp`，这只证明工具开始加载，不证明首屏成功；
  - 随后出现 `webview on error Error: 编译 .wxss 文件错误，错误信息如上，可在控制台查看更详细信息`；
  - 入口日志还记录 `routeTo appLaunch timeout`。
- 当前 AX/截图比旧日志更具体：模拟器已经显示小程序标题“八条与你”、四个 Tab，页面路径为 `pages/chat/chat`；渲染区上方仍显示“编译 .wxss 文件错误”。同时有系统模态框“没有权限访问 /Users/lnp/Documents/ChatGPT/delicious- project，请确保在系统偏好设置 - 安全与隐私中授予了微信开发者工具该文件夹的访问权限”。调试器显示 2 errors、8 warnings，Console 面板尚未取得精确 WXSS 文件/行号。
- 因此本轮要修正旧结论：不能继续写“模拟器完全空白、路径为空”作为当前唯一状态；当前更强证据是**原项目目录访问权限/文件监听 EPERM + 未定位的 WXSS 编译错误**。历史日志中的 `INVALID_LOGIN, access_token expired [touristappid]` 仍保留为历史阻塞证据，但本次登录不是该错误的充分解释。

### 1.3 问题分层

| 层级 | 当前证据 | 可否离线解决 |
| --- | --- | --- |
| macOS/DevTools 目录访问 | 系统模态框明确拒绝原项目目录，日志明确 watcher EPERM | 可通过用户授予目录权限，或用无受限临时路径做隔离；不能靠业务代码修复 |
| WXSS 编译 | renderer 显示 WXSS 错误，但具体文件/行号只在控制台 | 需要先取得精确错误；确定属于源文件后可最小修复并离线回归 |
| AppID/工具接口 | `isMiniAppProject=false`、开发库/实验配置错误码1 | 需保留为工具/账号边界；不能改成虚假 PASS |
| 真实 UI/权限/文件/Storage | 尚无完整逐项证据 | 必须在可访问 DevTools 项目中逐项验证 |

## 2. 串行任务

### T0：冻结 v1.6 本地基线并更新现场判定

- **状态**：完成；离线基线通过，DevTools 现场记录了原路径权限模态、watcher EPERM、WXSS 错误和当前页面路径。
- **目标**：确认 v1.6 代码/配置没有被运行时尝试改坏；复核归档；收集当前 DevTools 的可审计证据；把“权限 EPERM”和“WXSS 未定位”写成新基线。
- **Executor 可读范围**：`PRD-情侣小程序「八条与你」.md`、`README.md`、`.codex/plans/current.md`、`.codex/plans/history/current-v1.6-2026-09-28.md`、`.codex/plans/execution-log.md`、`miniprogram/**`、`scripts/**`、`project.config.json`、`project.private.config.json`、最新绝对日志路径和当前 DevTools AX/截图。
- **操作**：
  1. 先校验 v1.6 归档的行数/字节/SHA，并记录当前工作区文件计数、AppID、基础库、应用版本/schema。
  2. 按 README 顺序重跑现有离线命令集：资源审计、JS `node --check`、`validate-miniapp.js`、全部 smoke、JSON 解析、页面 Storage 越层和静态风险扫描；不得为绿灯删数据、放宽扫描或新增依赖。
  3. 读取最新 DevTools 日志并获取当前 AX 状态；保存/记录项目路径、登录状态、`EPERM watch`、`isMiniAppProject=false`、WXSS错误、页面路径和权限模态框原文。不要把 webview loadstop 或四 Tab截图单独写成运行时通过。
  4. 不修改业务实现、配置、素材、AppID、schema、版本或 README。
- **验证**：
  - 归档输出 `V16_ARCHIVE_OK`；
  - 所有离线命令退出码为0，输出范围与 v1.6 记录一致；
  - 日志/AX证据包含本节关键现场字符串，且明确区分“当前登录成功”与“运行时未闭合”。
- **验收**：T0 只追加执行证据；若任何本地基线失败、归档不符、配置漂移或无法读取当前日志，立即暂停，不进入 T1。
- **风险/暂停**：发现业务文件在 DevTools 尝试中被外部修改、出现未授权远程请求/凭据、静态风险命中、schema/version/AppID漂移时暂停并报告。

### T1：目录访问权限与无空格临时路径隔离

- **状态**：完成（结论 C）；源/临时副本 156 文件逐字节一致，但临时副本导入因 `touristappid` 工具系统错误码 1 阻断，原目录仍需用户授予 macOS 文件夹访问权限。
- **目标**：先区分 macOS 文件夹权限/监听失败与项目源码问题。原项目目录权限是外部条件，不能通过改业务代码掩盖。
- **文件范围**：源项目只读；允许创建一次临时诊断副本（例如 `/tmp/batiao-love-devtools-<run>`），不把临时副本当作产品交付，不提交、不改 AppID/schema/version；不修改 `project.config.json` 或 `project.private.config.json`。
- **操作顺序**：
  1. 先在当前 DevTools 中记录权限模态框和当前窗口状态；关闭模态框只为读取控制台，不得点击“打开安全与隐私设置”修改系统权限。
  2. 用终端创建临时副本，排除 `.codex`、`.DS_Store` 和 DevTools 缓存；保持 `project.config.json`、`project.private.config.json`、`miniprogramRoot` 和全部业务源码/资源逐字节相同。记录副本清单及源/副本关键 hash。
  3. 在 DevTools 导入临时副本并普通编译，重新读取 AX/截图/日志；比较是否仍出现权限模态框、`EPERM watch '/Users/lnp/Documents/ChatGPT'`、`Loading project all files...`、页面路径和 WXSS 错误。
  4. 若副本正常而原目录仍拒绝，暂停原目录运行时声明，向用户明确说明需要在系统设置中给微信开发者工具授予该具体文件夹访问权；用户执行该 OS 安全设置后再继续。不得代替用户点击安全设置，也不得声称副本证据等于原目录权限已修复。
- **验证**：
  - 记录原目录和临时副本的项目路径、watcher 状态、编译面板状态、页面路径和模态框；
  - 临时副本不得出现源文件缺失或配置漂移；源项目工作区无业务修改；
  - 若副本仍失败，保留完整日志并进入 T2 的 WXSS 定位；不得重复无证据重启。
- **验收**：至少得到一个可复现结论：A) 原目录权限已由用户修复且 watcher 正常；B) 无空格临时副本能运行、原目录仍受 OS 权限阻塞；或 C) 两者都失败且已精确记录下一错误。A/B/C 都必须写入执行日志。
- **暂停条件**：需要系统设置、钥匙串、账号或 AppID 变更时暂停等待用户外部动作；临时副本无法保持字节/配置一致时暂停，不以副本继续冒充源项目。

### T2：WXSS 编译错误精确定位与最小修复

- **状态**：完成（WXSS 源错误已最小修复并在 DevTools 复编确认消失）；随后暴露 `chat-bubble.wxml` 的 `wx:else` 编译错误，真实 renderer 继续 BLOCKED / 未验证。
- **目标**：从 DevTools Console 取得具体 WXSS 文件、行号和解析错误，判断是源码兼容问题还是工具/权限连锁错误；只修复已证实的源问题。
- **文件范围**：优先只读 `miniprogram/app.wxss`、`miniprogram/styles/*.wxss`、页面/组件 `*.wxss` 及其引用关系；若证据指向源文件，Executor 只改对应 WXSS 与必要的离线验证脚本/README/执行日志。不得大面积重写样式、删除动画/安全区、关闭 WXSS 编译、改为静态截图或将错误吞掉。
- **定位步骤**：
  1. 关闭权限模态框后打开 DevTools 的 Console/构建面板，复制精确错误文本、文件和行号；若控制台仍无行号，使用临时副本对 `app.wxss` 的 `@import` 和页面样式做最小二分隔离，逐步缩小到单个规则。
  2. 对命中的文件检查括号/引号、`@import` 路径、CSS变量/函数、`env(safe-area-inset-bottom)`、选择器和基础库3.4.3兼容性；用离线脚本验证，不引入网络 parser。
  3. 仅对确认不被 DevTools 2.02.2608070/基础库3.4.3接受的规则做等价最小改动；保持视觉布局、safe-area、动画、组件样式和语义。
  4. 若精确错误只来自 DevTools/权限/网络接口而不是源文件，不改业务样式，记录为工具阻塞并回到 T1/T3。
- **验证**：
  - DevTools Console 不再报告 WXSS 编译错误，构建面板不再停在该错误状态，页面路径保持有效；
  - `find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check`、JSON 解析、`validate-miniapp.js`、`smoke-pages.js` 和与页面/样式相关的离线 smoke 通过；
  - 静态风险扫描保持 `STATIC_RISK_SCAN=0`，不新增外链/凭据/TODO/旧版本标记；
  - 记录实际修改文件及 SHA；未经 DevTools 精确错误证据不得标记 T2 完成。
- **验收**：确定的源 WXSS 错误被最小修复并在 DevTools 和离线两侧复核；若错误不属于源文件，T2 状态应为“工具/权限 BLOCKED / 未验证”，不可写成修复成功。
- **风险/暂停**：需要升级工具、安装插件、改系统权限、接入网络或改 AppID 时暂停等待用户；任何“关闭检查”“删除样式”才能通过的方案均暂停。

### T3：真实 DevTools renderer 与能力交接

- **状态**：部分完成；四个 Tab 均取得页面路径和截图入口，但 WXML/`__route__` 错误、权限模态和游客能力限制使能力项保持 BLOCKED / 未验证。
- **目标**：在可访问且无 WXSS 错误的项目中取得真实证据；保留 tourist AppID、未接云和本地模式边界。
- **文件/证据范围**：不新增业务文件；保存工具版本、AppID、基础库、项目路径、编译面板、控制台、模拟器截图和必要的执行日志。临时副本证据必须标明“副本路径”，原目录证据必须标明原路径。
- **顺序**：
  1. 普通编译后确认页面路径 `pages/chat/chat`，再依次点击四 Tab：八条、菜谱、相册、我的；记录首屏截图/控制台。
  2. 测试菜谱新增/缺图占位、相册预览/长按保存入口、头像和迁移坏 URI 的占位；远程/data/blob/未知 URI 不得进入 `<image>` 或系统相册调用。权限拒绝、取消选图、保存失败要记录实际文案与重试入口。
  3. 测试绑定页邀请码预填、分享按钮/右上角菜单的可用性和禁用原因；不把 headless `canIUse` 当分享面板证据。
  4. 检查安全区、字体、键盘、滚动、swiper、长按和重复点击；检查页面隐藏/重显、Storage 写入/清除失败反馈和文件生命周期。不能在游客/模拟器环境得到的项目标记为未验证。
  5. 对 `isMiniAppProject=false`、开发库/实验配置错误码1和旧 `INVALID_LOGIN` 日志保留原文，并说明它们不等于源码编译失败或成功。
- **验证/验收**：
  - 真实 renderer 至少得到四 Tab 页面路径和首屏截图；控制台无未解释的业务异常；
  - 每个能力项按 README 表格标记 PASS、FAIL 或 BLOCKED/未验证，附直接截图/日志，不用推断填充；
  - 原目录若仍被 OS 权限拒绝，T3 只能交付临时副本结果并保持“原目录 BLOCKED”。
- **暂停条件**：用户未完成系统权限授予、DevTools 无法访问项目、需要真实注册 AppID/真机或发生任何不可逆外部操作时暂停并报告；不得伪造 renderer、权限、文件或 Storage 结果。

### T4：最终离线复核、文档收口和交付报告

- **状态**：完成；完整离线回归和文档收口通过，交付结论为“部分完成 + 明确运行时阻塞”，未宣称真实 renderer、权限、分享、文件或 Storage 通过。
- **实际收口**：README 已记录 v1.7 的 WXSS 修复、WXML/权限/游客 AppID 阻塞和临时副本导入错误；`.codex/plans/execution-log.md` 已追加 T0–T4 的操作、验证、文件 hash、截图/日志证据与外部动作要求。最终离线命令全部退出码 0：资源预算、JS 语法、`validate-miniapp.js`、全部 smoke、JSON、页面 Storage 扫描、静态风险扫描和 WXSS 通配组合器扫描。
- **目标**：把可复现的源码修复、环境根因和未验证边界固定下来，不扩大范围。
- **文件范围**：Executor 可更新实际改过的源码/脚本；按需更新 `README.md` 的导入/权限/运行时说明；追加 `.codex/plans/execution-log.md`；更新本计划任务状态。不得删除历史归档、清空用户数据或改 schema/version/AppID 来绕过错误。
- **验证**：
  - 重跑完整离线命令集：资源预算、JS语法、validate、全部 smoke、JSON、页面 Storage 扫描、静态风险扫描；
  - 复核当前计划和 v1.6 归档的字节/行数/SHA；列出实际修改文件及 SHA；
  - 复查 DevTools 最新日志没有被旧日志覆盖，明确记录当前路径、权限、WXSS、renderer 和 AppID 状态；
  - 每个任务都要有“操作 → 验证 → 结果”日志，失败不能写成成功。
- **验收**：代码/脚本离线证据全绿；DevTools 证据按项真实标记；所有剩余 BLOCKED/未验证项、用户外部动作和风险在计划与执行日志中可追溯。若 T1/T2/T3有任何硬阻塞，T4只能收口为“部分完成 + 明确阻塞”，不得宣称项目全部运行时通过。
- **暂停条件**：任一全套离线回归失败、计划/日志 hash 不一致、产生未授权业务文件、出现静态风险命中或需要新增外部服务时暂停。

## 3. 用户需要的外部动作

1. 当前开发者工具明确提示无权访问 `/Users/lnp/Documents/ChatGPT/delicious- project`。若要验证原路径，用户需在 macOS“系统设置 → 隐私与安全性 → 文件与文件夹/完全磁盘访问权限”中给微信开发者工具授予该具体文件夹访问权，并完成后告知 Executor；Planner/Executor 不代替用户修改 OS 安全设置。
2. 若只需继续本地模拟器验证，可先允许 Executor 使用字节一致的临时副本隔离路径权限；这不等于原路径权限已修复。
3. 若后续需要上传、云开发、真实情侣双端或真机能力，用户需提供已注册的小程序 AppID/相应账号和明确授权；本轮不得自行替换 `touristappid`。

## 4. 总体风险和停止原则

- macOS 文件访问权限、DevTools 2.02.2608070 的开发库/实验配置接口、`touristappid` 游客边界属于外部状态，不能通过改业务代码伪造。
- WXSS 修复必须由 DevTools 的精确错误驱动；不能因为页面偶尔显示四 Tab就忽略编译错误，也不能因为构建面板长期显示 `Loading project all files...` 就断言源码无问题。
- 专用状态素材缺失、真实云同步/通知/双端、真实相册权限/真机生命周期继续保持原 PRD 边界；本轮只处理可证实的 DevTools 访问与 WXSS 构建阻塞。
- Planner 完成后停止；不得启动 Executor。Executor 若遇到同一外部阻塞，在日志记录后暂停并向父任务报告原因。
