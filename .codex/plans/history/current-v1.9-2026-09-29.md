# Planner 计划：八条与你 v1.9 授权后源路径运行时验证

## 0. 角色、顺序与修改纪律

- 本文件是 v1.9 唯一计划。Planner 已读取 v1.8 当前计划、v1.8 执行日志、README、PRD、源码、项目配置和最新 DevTools 日志/AX；Planner 只归档旧计划并写入本文件，不实现代码，不改业务源码、配置、资源、README，不追加执行日志，不启动 Executor。
- 父 Agent 必须独立读取本文件，确认文件存在、非空、行数/字节数/SHA-256、v1.8 原样归档和 T0→T4 顺序后，才能启动唯一 Executor。Planner 与 Executor 不得并行。
- Executor 必须先读取本文件并记录读取前 SHA，严格按 T0 → T1 → T2 → T3 → T4 串行推进；每个任务完成后立即验证，并在 .codex/plans/execution-log.md 追加“操作 → 证据 → 结果 → 状态/暂停原因”。未取得直接证据不得写 PASS。
- 保持应用版本 1.4.0、数据 schema 数值 4/名称 1.3、基础库目标 3.4.3、源项目 AppID touristappid、miniprogramRoot=miniprogram/。不得替换 AppID、改 schema/version、关闭检查、清空用户数据、引入远程依赖或伪造账号。
- 离线 smoke、静态扫描、headless wx stub、文件存在、页面路径、webview loadstop/LoadApp、hasUser、isTourist、四 Tab 文本或 isMiniAppProject=false 单独不能证明 renderer、分享、系统权限、文件、Storage、键盘或手势通过。真实 DevTools Console、Debugger、编译面板、AX/截图和对应日志才是运行时证据。
- Planner 可修改范围只有 .codex/plans/history/current-v1.8-2026-09-28.md 和 .codex/plans/current.md；不得触碰 miniprogram、scripts、project*.json、素材、README 或执行日志。

## 1. Planner 已核实的归档与当前现场

### 1.1 v1.8 原样归档

- 覆盖前 current.md 是 v1.8，123 行、20019 bytes，SHA-256 68890974b4c18093f0f78418a520cf2eef30b8b8055026ca9314018264fdc9e4。
- 已复制为 .codex/plans/history/current-v1.8-2026-09-28.md；归档与覆盖前文件 cmp 字节一致，同 SHA。不得覆盖 v1.7/v1.6 历史归档。
- v1.7 归档保持 145 行、18469 bytes、SHA c01d28c6d5ef88b0d18017263bbd3a92b722f7eb4c9e4dd9fd1c1ab8d64248d5；v1.6 保持 149 行、17076 bytes、SHA 4bfc5b77b1d151e01280c16612986ff5373de8cf2a0f57921b8124644e4da0e0。

### 1.2 v1.8 代码与离线基线

- v1.8 已把 miniprogram/components/chat-bubble/chat-bubble.wxml 的非相邻 wx:else 改为同级负条件 wx:if="{{message.senderId !== 'batiao'}}"，保留猫头像、气泡、内容、时间和用户头像顺序；当前文件 SHA 68e2ddb7d149f5e8e958b27a0fb812fabd46a9bdd3e42d4704d220e257706a3f。
- v1.8 资源、JS、JSON、页面/Service smoke、Storage 越层扫描、WXSS 通配组合器扫描和静态风险扫描均通过。不得回退既有 WXSS/WXML 修复或扩大重写。
- v1.8 旧结论是“部分完成 + 明确阻塞”；本轮必须基于授权后的新鲜源路径现场重新判断，不能直接沿用旧状态。

### 1.3 配置、源码与产品边界

- project.config.json 当前为 compileType=miniprogram、libVersion=3.4.3、appid=touristappid、projectname=batiao-love、miniprogramRoot=miniprogram/；project.private.config.json 基础库为 3.4.3。
- 当前 miniprogram 有 138 个文件，scripts 有 13 个文件；Executor T0 必须重新记录树哈希、配置 SHA、AppID、版本和 schema。
- PRD 四个 Tab 为八条、菜谱、相册、我的；v1 使用本地 Storage/文件适配器，不接真实 LLM、云同步、通知或跨设备绑定。不得把本地模拟绑定写成跨设备能力。

### 1.4 用户授权后的源路径现场

- 用户已确认授予微信开发者工具访问 /Users/lnp/Documents/ChatGPT/delicious- project 的 macOS 文件夹权限。Planner 随后从项目列表重新打开源项目。
- 2026-09-28 22:01 的源窗口 AX/截图 /var/folders/j5/xrgq4_xn7jl_4_7xnzyhn7qr0000gn/T/com.openai.sky.CUAService/微信开发者工具 Screenshot 2026-09-28 at 10.01.24 PM.jpeg 显示 URL projectpath=/Users/lnp/Documents/ChatGPT/delicious- project、AppID touristappid、标题“八条与你”、路径 pages/chat/chat、四 Tab、猫/输入/发送首屏；Debugger 为 Errors: 0, Warnings: 9，未见权限模态。
- 对应最新总日志为 /Users/lnp/Library/Application Support/微信开发者工具/d1e8765721a6c23d43b14c95b1843e6b/WeappLog/logs/2026-09-28-21-55-23-453.log 的 22:01、rt:1/win:s1 段。该段记录源路径 FileUtils watcher、project ready、files=166、code files=118、webview page ready 和 WXML bridge ack；授权后的源路径段没有新的 EPERM: operation not permitted, watch '/Users/lnp/Documents/ChatGPT'，也没有“没有权限访问”文本。
- 同一源段仍有 isMiniAppProject=false、hasUser=true,isTourist=false、fetchDevelopLibInfo/fetchAppExptInfo 系统错误码 1。这些是工具/游客边界，必须原文保留，不能写成登录、云或上传能力通过。旧 21:30 源段的 EPERM 与权限阻塞作为历史证据保留。
- 当前 AX 可能聚焦到诊断副本；副本 /private/tmp/batiao-love-devtools-v18-uMFvhB 的生成 AppID wxec20aaa84bd3fa42 只能作为历史隔离证据。所有本轮源结论必须同时核对窗口 URL、路径、AppID、日志 rt:1/win:s1 和新截图。

## 2. 串行任务与验收

### T0：冻结授权后源路径基线

- 目标：冻结授权后的源路径状态，确认源码/配置未漂移并保留 v1.8 可追溯性。
- Executor 第一动作：读取本计划并记录读取前 SHA；核验 v1.8/v1.7/v1.6 归档的行数、字节和 SHA，确认 Planner 已停止且没有其他 Executor 并行。
- 只读核验 project.config.json、project.private.config.json、miniprogram/utils/appMeta.js、miniprogram/services/storageService.js、chat-bubble.wxml；记录 AppID、基础库、版本、schema、源文件 SHA，确认诊断副本配置未写回源项目。
- 按 README 既有顺序重跑资源预算、全部 JS node --check、validate-miniapp.js、storage/cat/photo/file/care/invariants/recovery/lifecycle/local/pages/capabilities smoke、JSON 解析、页面 Storage 越层、外链/凭据/未完成/旧版本扫描。不得为绿灯删数据、放宽规则或新增依赖。
- 读取最新源路径 DevTools AX/截图和绝对日志，记录窗口 URL、AppID、工具/基础库、页面路径、Debugger/Console、权限模态、EPERM、isMiniAppProject、系统错误码和游客状态。焦点在副本时必须切回源项目，没有源路径新鲜证据就暂停。
- 验证：离线命令真实退出码全为 0，输出 T19_T0_OFFLINE_BASELINE=PASS；配置未漂移；授权后源路径无权限模态和无新 EPERM 的证据写入执行日志并与旧 EPERM 分开。
- 暂停：归档不一致、配置/AppID/schema/version 漂移、源码被外部改动、离线失败或无法取得源路径新鲜 AX/日志时，不进入 T1。

### T1：源路径编译门槛——修复、验证或确认无需代码改动

- 目标：确认 v1.8 WXML 修复在授权后的源路径仍有效；只有 DevTools 新鲜且精确指向源码的错误才允许最小修复。
- 默认先不改代码。清空源项目 Console，执行一次普通编译/刷新，记录编译面板和 Debugger；检查 chat-bubble.wxml 不再有非相邻 wx:else，并确认猫/用户分支、消息内容和时间绑定。
- 若没有 WXML/WXSS 编译错误，明确记录“无需代码改动”，不得为了减少 warnings 重写 CSS/组件。若出现精确新 WXML/WXSS 错误，只允许最小修改对应单文件并记录旧/新 SHA；不得改 AppID、配置、数据结构、页面逻辑、资源或依赖。
- 验证：WXML_CHAT_BUBBLE_STRUCTURE=PASS；JSON/JS/validate/pages/local/capabilities smoke 真实通过；源项目 Debugger Errors、Console 编译错误文本和最终 diff 可复查。基础库灰度、组件选择器限制、avatar null 等 warnings 必须解释，不得隐藏。
- 暂停：需要改 JS/CSS/配置/资源、放宽编译器、改变游客 AppID、隐藏错误、接入网络或无法定位源码时暂停，不进入 T2。

### T2：重新编译并核对 Console、Debugger、日志与权限因果

- 目标：用授权后的源项目新鲜证据确认 WXML/WXSS/__route__ 是否消失，并区分 macOS 权限、watcher、游客接口错误。
- 在源路径清空 Console 后再次普通编译，等待模拟器稳定；读取 Debugger Errors/Warnings、Console 全量、编译面板、AX/截图和最新绝对日志，记录时间、窗口 URL/AppID、源路径和页面路径。
- 逐项检索并原文记录：[WXML 文件编译错误]、Bad attr wx:else、[WXSS 文件编译错误]、__route__ is not defined、routeTo appLaunch timeout、权限模态、EPERM、isMiniAppProject=false、系统错误码 1。没有出现的错误要用清空后的 Console/日志范围证明，不能用旧 AX 残留推断。
- 仅在源路径仍有权限或 watcher 异常且需归因时，创建一次性 /tmp/batiao-love-devtools-v19-时间戳 字节一致副本；排除 .codex 和 .DS_Store，记录清单及关键 SHA。副本不得交付或改源配置；工具改写副本 AppID 时必须原文记录。
- 验证：有清空 Console 后的新鲜截图/AX、Debugger 计数和日志文件；T19_SOURCE_PERMISSION=PASS 只在源路径无权限模态且授权后日志无新 EPERM 时输出；T19_COMPILE_GATE=PASS 只在源路径无 WXML/WXSS/__route__ 编译/渲染错误时输出。门槛失败逐项 BLOCKED 后进入 T4。
- 暂停：需要用户再次改系统设置、提供已注册 AppID、升级工具、改钥匙串/账号、真机或不可逆外部操作时暂停；不得用副本/headless 代替源证据。

### T3：源路径 renderer 与 PRD 能力逐项交接

- 前置门槛：只有 T2 同时得到 T19_SOURCE_PERMISSION=PASS 和 T19_COMPILE_GATE=PASS，才在源项目 touristappid 窗口继续；否则逐项 BLOCKED/未验证并进入 T4。
- 每项记录工具 Stable 2.02.2608070、基础库 3.4.3、源路径、AppID touristappid、实际页面路径、截图/AX、清空 Console 后错误计数和日志时间；只写 PASS、FAIL 或 BLOCKED/未验证。
- 四 Tab：依次点击八条、菜谱、相册、我的，确认实际路径和首屏。八条页检查气泡左右布局、输入/发送、mock 回复、喂食/抚摸，以及键盘、滚动、长按和重复点击；按钮存在不等于功能 PASS。
- 菜谱：检查未解锁/已解锁/甜品 Tab、锁定/缺图占位、详情和新增入口，不伪造真实菜品上传。
- 相册：检查月份分组、预览、上传、长按保存入口、坏 URI/头像占位和删除反馈；系统相册/文件权限只在 DevTools 直接返回成功或拒绝文案时标记。
- 绑定/我的/分享：验证邀请码生成/预填/复制、绑定/解绑、分享按钮禁用原因。分享面板、深链回填、真实双端绑定/云同步受 touristappid/本地模式限制，必须按直接证据标记。
- 生命周期/持久化：验证页面隐藏/重显、Storage 写入/清除失败提示、文件 unlink/retry、quota、返回/导航失败反馈；只用直接 DevTools 行为与日志。
- 停止：任一 WXML/WXSS/__route__/权限模态/新 EPERM 复现，或需要真实 AppID、系统设置、真机、外部网络、分享/相册不可逆操作，停止后续能力扩展，记录阻塞并进入 T4。

### T4：全量离线回归、README/日志/计划收口

- 允许修改：若 T1 有直接证明的单文件源码修复则保留；按事实更新 README；追加执行日志；最终在 current.md 末尾写 T0–T4 收口状态。不得删除历史归档、回退既有修复、改配置/AppID/schema/version、清空用户数据或新增远程依赖。
- 重跑 README 完整命令并记录真实输出：audit-assets、全部 JS node --check、validate-miniapp.js、全部既有 smoke、JSON、PAGE_STORAGE_LEAK=0、WXSS_UNIVERSAL_COMBINATORS=0、WXML_CHAT_BUBBLE_STRUCTURE=PASS、STATIC_RISK_SCAN=0。不得新增脚本掩盖失败。
- 收口列出本轮实际修改文件及 SHA；复核 v1.8/v1.7/v1.6 归档 SHA；记录源路径最新日志/截图、权限门槛、编译门槛、四 Tab 和所有 PRD 能力项状态；README 只写实际修复与证据边界。
- 最终验收：T0–T4 每项都有“操作 → 验证 → 结果 → 状态/暂停原因”；离线全绿且计划/归档 hash 可复核；源路径 renderer/权限/游客能力按直接证据标注。分享、系统权限、相册/文件、真实 Storage 生命周期、键盘/手势或聊天 mock 回复未直接验证时，结论必须为“部分完成 + 明确阻塞”，不能写“运行时全部通过”。
- 暂停：离线失败、静态风险、文件范围越界、hash 无法解释或需新增外部服务时暂停并报告。

## 3. 外部动作与停止原则

- 用户已完成 macOS 文件夹授权；Planner/Executor 不点击系统设置或修改 OS 安全策略。授权后若新鲜源现场仍有权限模态/EPERM，原文报告并暂停。
- 继续真实云端、上传、分享能力需要注册 AppID 与账号授权；本轮保持 touristappid，不自行替换。
- 临时副本只作隔离诊断，尤其是 DevTools 自动生成的 wxec20aaa84bd3fa42 不代表源项目。headless smoke、静态 canIUse 结果和副本页面均不能写成源项目运行时通过。
- Planner 完成本文件后停止，不启动 Executor；Executor 遇暂停条件应先追加日志再停止并向父 Agent 报告。

## 4. 父 Agent 启动前独立校验

- 执行 test -s .codex/plans/current.md。
- 归档文件存在且 SHA 68890974b4c18093f0f78418a520cf2eef30b8b8055026ca9314018264fdc9e4一致。
- 用 rg 检查 T0、T1、T2、T3、T4、touristappid、T19_SOURCE_PERMISSION、T19_COMPILE_GATE、Planner 与 Executor 均存在且顺序正确。
- 记录 current.md 当前行数、字节数、SHA-256，并确认 Planner 只新增 v1.8 归档和 current.md。
- Executor 完成后不得由 Planner 代写结果；所有状态必须来自执行日志和新鲜证据。


## 5. v1.9 Executor T0–T4 收口（2026-09-29）

- 顺序与职责：Planner 已在本文件写入计划并停止；Executor 先读取本文件，读取前 SHA-256 `19e89ba24a6c1f301326ed8299fa0c41d379b2844c82ddf6fab5be335a4bcbaf`，未启动其他 Agent，严格按 T0 → T1 → T2 → T3 → T4 串行完成。每项均在 `.codex/plans/execution-log.md` 追加操作、直接证据、结果和状态/阻塞原因。
- T0：授权后的源路径 `/Users/lnp/Documents/ChatGPT/delicious- project`、AppID `touristappid`、基础库 `3.4.3`、应用版本 `1.4.0`、schema `4/1.3`、配置与源码基线冻结；离线基线全绿，`T19_T0_OFFLINE_BASELINE=PASS`。源路径 AX/日志可读，无授权后新 watcher `EPERM`，`isMiniAppProject=false`/游客工具错误原文保留。
- T1：清空源 Console、普通编译、WXML 结构检查完成；无新鲜且精确指向源码的 WXML/WXSS 错误，`WXML_CHAT_BUBBLE_STRUCTURE=PASS`，无需代码改动。
- T2：源项目清空 Console 后复编并读取 AX、Debugger、Console、绝对日志；计数 `WXML_COMPILE_COUNT=0`、`WXSS_COMPILE_COUNT=0`、`ROUTE_COUNT=0`、`MAC_PERMISSION_COUNT=0`，Debugger Errors 0；输出 `T19_SOURCE_PERMISSION=PASS` 与 `T19_COMPILE_GATE=PASS`。本地资源代理 `403 ua-token-missing` 与计时缺失单独保留为工具边界。
- T3：仅在双门槛通过后验证源 `touristappid`：四 Tab 路径、菜谱甜品/新增入口、聊天发送及本地 mock 回复、喂养/摸摸和重复抑制、相册上传入口与文件选择器取消、邀请码生成/应用内分享面板、资料编辑入口均取得直接证据；锁定详情、真实分享/云绑定、系统相册/文件完整生命周期、Storage 真实配额/进程中断、键盘/滚动/长按/页面隐藏重显和真机行为明确记为 `BLOCKED / 未验证`。T3 结论 `T19_PRD_CORE=PARTIAL`，未点击系统设置、未接网络、未替换 AppID。
- T4：完整 README 离线验收重新通过：资源 `ASSET_ERRORS=0`/`ASSET_WARNINGS=0`、49 个 JS 语法检查通过、`AUDIT_FILES=118`/`ERRORS=0`/`WARNINGS=0`、所有 smoke PASS、`ALL_JSON_OK`、`PAGE_STORAGE_LEAK=0`、`WXML_CHAT_BUBBLE_STRUCTURE=PASS`、`WXSS_UNIVERSAL_COMBINATORS=0`、`STATIC_RISK_SCAN=0`，输出 `T4_OFFLINE_BASELINE=PASS`。按事实追加 README v1.9 现场证据，README SHA-256 `cf34b12b591b2b9350b7b860f6c55a2e7f6564defe39c8edcaa64bff38371d01`。
- 文件范围与哈希：T1 无源码修改；T4 只修改 README、执行日志和本计划。源 `project.config.json` SHA `999c1adb4c03d85076878a88ba4a3d3a32381ad5d35805f4fd70578d0fcab47b`、`project.private.config.json` SHA `240345d4b88b5bd08caba18d2ba92d70b03bd8f2ed188ca5b1db23e45387b161`、`chat-bubble.wxml` SHA `68e2ddb7d149f5e8e958b27a0fb812fabd46a9bdd3e42d4704d220e257706a3f` 均未漂移；v1.8/v1.7/v1.6 归档 SHA 仍为 `68890974b4c18093f0f78418a520cf2eef30b8b8055026ca9314018264fdc9e4` / `c01d28c6d5ef88b0d18017263bbd3a92b722f7eb4c9e4dd9fd1c1ab8d64248d5` / `4bfc5b77b1d151e01280c16612986ff5373de8cf2a0f57921b8124644e4da0e0`。
- 最终日志校验：追加本节前的 `.codex/plans/execution-log.md` 已验证 955 行、166051 bytes、SHA-256 `e5525ed2df2be912009c0e00264ce563bd8e4afb0f4e4f7d8e1877e5c2ed0d8c`；current plan 追加前 SHA 为读取前 `19e89ba24a6c1f301326ed8299fa0c41d379b2844c82ddf6fab5be335a4bcbaf`，追加后由父 Agent 复核最终 hash。没有暂停原因；整体交付结论固定为“部分完成 + 明确阻塞”，不得表述为运行时全部通过。
