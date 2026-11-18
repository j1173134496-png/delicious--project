# Planner 计划：v2.6 微信开发者工具白屏复核与组件告警修复

## 0. 目标、依据与协作纪律

- 目标是在微信开发者工具原项目上用新鲜 AX 与 screenshot 再确认 v2.5 编译后白屏是否持续；在画面稳定可见后，修复本轮可复现的组件 WXSS 标签选择器告警、`avatar` 为 `String` 属性却收到 `null` 的告警，并仅在个人页新鲜截图证明确有问题时修正签名排版；最后普通编译、检查相关页面与 Console、完成完整离线回归和文档事实收口。
- PRD 依据：§3.1 小猫聊天/展示、§3.3.3 相册双方头像和可编辑签名、§3.4.1 个人头像/昵称/个性签名。签名是用户资料内容，不得为了截图改写或清空；视觉修复只处理显示区域。
- 现有 v2.5 计划在归档前为 186 行、26,537 bytes、SHA-256 `7213e6e40e99fa011ff55165a6068e34b596a1b928a694a68cf02a42ad42c309`。已原字节归档至 `.codex/plans/history/current-v2.5-2026-10-08.md`，归档 186 行、26,537 bytes、SHA-256 同上，`cmp` 结果 PASS。v2.5 执行日志仍保留 `V25_T1_SOURCE_COMPILE=BLOCKED`；v2.6 的新证据不得回写或抹去这一历史结论。
- v2.5 README/current/log 的起始 SHA（Planner 核验）：README `17f75d58f0d724c33928dfa233a704ab36ffac4a8afb6a8bf46a20ceb2c9d9c3`、current `7213e6e40e99fa011ff55165a6068e34b596a1b928a694a68cf02a42ad42c309`、execution-log `f150b106015574eb91e71cddb5d99085746b5b3352b340e0a48f065b4f4690bf`。
- v2.5 T1 的原始事实是：普通编译后 AX 仍报 `pages/chat/chat`、Console `0 errors / 8 warnings`，连续两张截图整窗白，按当时计划记 `BLOCKED` 并停止。其根因没有证实，不能把它改写为已解决或认定为源码/renderer 缺陷。
- 随后的主 Agent CUA 新鲜检查补充了当前现场证据：微信开发者工具 Stable `2.02.2608070`、原路径 `/Users/lnp/Documents/ChatGPT/delicious- project`、`touristappid`、基础库 `3.4.3`；chat、recipe、album、profile、settings、feedback 都取得可见页面截图且可导航，Console Errors 为 0。切换 Tab 后第一帧可能仍是旧页面，随后一帧才显示新页面。这使截图时序成为待验证解释，但不证明 v2.5 白屏原因，必须由 Executor 保存本轮新鲜证据。
- CUA 现场记录的待核告警：`components/loading/loading.wxss:2`、`components/recipe-card/recipe-card.wxss:9`、`components/photo-card/photo-card.wxss:5` 的组件 WXSS 标签选择器警告；`components/avatar/avatar` 的 `String` 属性收到 `null`，profile/album 导航可触发。其它游客 API、灰度基础库、preload、worker/timing 等 warning 保留为环境/工具信息，不扩大成源码修复目标，也不要求全局 warning 归零。
- 当前 profile 首屏观察到签名在头像与编辑按钮之间窄栏竖排。仅当 Executor 在本轮 fresh profile 截图中复现且确认是布局约束（不是实际签名内容/缩放/陈旧帧）才修；否则原样保留并记录 `NOT_REQUIRED`。
- 工作区无 `.git`。Planner 检查工作区根目录及祖先路径的 `AGENTS.md`，未发现适用文件；工作区 `.codex` 下仅有 plans，无 `agents/*.toml` / `agents.toml`。不适用的其它项目代理文件不作为本项目指令。
- 单一 Executor 严格按 T0→T6 顺序执行；每项完成后先把动作、返回状态、原始证据、截图/AX 引用、命令输出/退出码及必要 SHA 追加 `.codex/plans/execution-log.md`，再开始下一项。不得启动并行 Executor/子 Agent。Planner 本轮只创建 v2.5 归档并写本 current；不启动 Executor。
- Planner 允许的两项计划文件变更已完成。Executor 运行时每步仅追加执行日志；业务改动仅允许 §3.3 明列文件；收尾时可追加 README、current 的 v2.6 事实收口和 execution-log。不得改 PRD、项目配置、版本/schema、依赖、资源或其他源码。

## 1. 基线和保护边界

### 1.1 项目与包体

- 原项目路径必须严格为 `/Users/lnp/Documents/ChatGPT/delicious- project`；`project.config.json` 应为 `compileType=miniprogram`、`appid=touristappid`、`miniprogramRoot=miniprogram/`、`libVersion=3.4.3`，运行窗口/模拟器显示的基础库为 `3.4.3`。不换 AppID、不换路径、不导入副本、不改基础库、不登录/扫码、不打开系统设置、不上传/发布。
- v2.5 T0/T6 基线：`ASSET_CAT_COUNT=4`、`ASSET_CAT_BYTES=1374256`、`ASSET_MINIPROGRAM_BYTES=1633052`、预算 `2097152`、余量 `464100`；这些是对照值，不是要求本轮包体精确相等。Executor 必须重跑审计，以当轮真实 stdout 判定；门槛为实际包体 `<=2097152` 且余量准确、非负。
- 应用版本 `1.4.0`、Storage schema 数值 `4` / 名称 `1.3`；配置、AppID、基础库、版本、schema 和 12 张 Tab/cat PNG 保护值不得变化。记录实际 SHA；不要依赖旧数值替代本轮读取。

### 1.2 允许的 UI 操作

- 编译前/后仅导航并读取 chat、recipe、album、profile、settings、feedback，必要时只读打开 profile-edit。切 Tab/导航后刷新 AX 与 screenshot，若第一帧仍显示旧 route，等待稳定后再取新帧，不将旧画面当新页面证据。
- 不发送聊天、不喂猫/摸猫、不改菜谱、不上传/删除照片、不编辑或保存个人资料/签名、不更改设置、不提交反馈、不生成新邀请码、不复制/分享邀请码、不选择个人照片、不接受系统权限提示。只关闭意外出现的非破坏提示；若有权限/登录门槛则停止并记录。
- 账号/好友分享、绑定跨设备、云服务、真实 LLM/推送/远端反馈、系统相册及文件权限与生命周期、真实 Storage 配额、真机尺寸/输入法/长手势/中断恢复仍为 `BLOCKED / 未验证`。模拟器截图不能替代这些证据。

## 2. Executor 串行任务

### T0：读取计划、运行前证据与冻结基线

**允许修改：**仅追加 `.codex/plans/execution-log.md` 中 T0 记录。

1. Executor 首项工作是完整读取本 v2.6 current；随后记执行时间（UTC 与 Asia/Shanghai）、路径、current 与 v2.5 归档的行数/bytes/SHA。复核归档与本计划完全一致，且 v2.5 的 `V25_T1_SOURCE_COMPILE=BLOCKED` 原文仍在旧计划/日志。
2. 读取 README 中离线命令与 DevTools 检查范围，execution-log 末尾的 v2.5 T0/T1/T6/T7，及 PRD §3.1、§3.3.3、§3.4.1。核对 `.codex/plans` 下仍没有新增 agent 配置。
3. 记录目标文件当前 SHA 和必要内容：`components/loading/{loading.wxml,loading.wxss}`、`components/recipe-card/{recipe-card.wxml,recipe-card.wxss}`、`components/photo-card/{photo-card.wxml,photo-card.wxss}`、`components/avatar/avatar.js`、`pages/profile/{profile.wxml,profile.wxss}`、`pages/album/album.wxml`、`pages/bind/bind.wxml`、`pages/profile-edit/profile-edit.wxml`、`scripts/smoke-pages.js`；检查组件声明/页面引用及现有 smoke 覆盖。记录配置/版本/schema 与 12 张 PNG SHA。
4. 在修改前顺序执行 `node scripts/audit-assets.js`、`node scripts/validate-miniapp.js`、`node scripts/smoke-pages.js`、`node scripts/smoke-photo-presenter.js`，记录每条真实 stdout/退出码；必要时记录全部 JS `node --check`。重新计算 `miniprogram`/`scripts` 文件树摘要和文件清单，作为本轮比较基线。
5. T0 全部证据可复核记 `V26_T0_BASELINE=PASS`；任一路径、配置、归档、资产、版本/schema 或初始 smoke 有未解释差异则记 `BLOCKED`，先停止并报告，不用旧日志推断当前状态。

### T1：新鲜 DevTools renderer 白屏复核

**允许修改：**只追加执行日志 T1。

1. 用 CUA 获取已实测的 DevTools 应用并新鲜读取 AX/screenshot。记录工具 Stable 版本、项目名、窗口 URL/路径、AppID、模拟器设备/缩放、基础库、当前 route、Console Error/Warning 数。确认原路径、`touristappid`、`3.4.3` 与 §1.1 一致；不登录、不换项目。
2. 保存现有 Console 摘要；清空旧 Console 后只执行一次“普通编译”。等待 IDE 编译结束及页面稳定；记录编译反馈和 fresh AX/screenshot。AX route、Debugger 0 errors、AppService reload 或“编译已开始”都不能单独证明 renderer 可见。
3. 若首张截图为白屏、空画面或 route/画面似乎陈旧，保持只读，等待 2 秒后再 fresh 获取 AX+screenshot；必要时再间隔 2 秒取第三组。最多三组补充读取，不重启 IDE、模拟器或项目，不通过盲点页面/重复编译“恢复”。每组记录时间、AX route 和实际截图画面。
4. `V26_T1_RUNTIME_RECHECK=PASS` 必须有普通编译完成后的两张连续、时间可区分的新鲜截图呈现稳定 chat renderer，AX route 与截图相符，且路径/AppID/基础库正确。若仍持续白屏（最多三次读取仍空白）、项目路径/AppID/库版本偏离、登录/权限/系统提示阻塞，记 `BLOCKED`；根因记“未确定”，不得推断为源码或截图竞态。
5. T1 BLOCKED 时立即停止全部页面导航、源码更改和依赖 renderer 的 T2–T4；跳过项写 `NOT_RUN`。仅可继续独立离线基线复核和事实文档收口，不允许为排障扩大权限、重启、换路径或改源码。T1 PASS 后才进入 T2。

### T2：fresh 页面与 warning 复现/布局判断

**允许修改：**只追加执行日志 T2。

1. 先记录稳定 chat 页截图、AX、Console；只读切换并检查 recipe、album、profile、settings、feedback。profile→settings/feedback 若使用导航，只读进入后返回；不改开关或内容。profile-edit 仅可读打开并返回，不保存。
2. 每次切换页面后先比较 route 与画面；若 AX 或 screenshot 还是旧页面，等待后再取新鲜组。记录真实页面 route、截图引用、可见内容/布局和 Console 新增记录。不得把 AX 树当小程序自身无障碍树。
3. 对照当前 Console 原文和源码位置复核：loading `loading.wxss:2`、recipe-card `recipe-card.wxss:9`、photo-card `photo-card.wxss:5` 及同文件内其它标签名选择器；对 avatar 记录 `String` 收到 `null` 的原始告警、触发 route，并核对 `avatar.js` observer 对空值的当前处理。记录 profile 签名区域是否确实被挤成窄列，先确认 fresh profile screenshot 上头像/文案/编辑按钮真实几何关系；不得根据旧截图或文本推测。
4. 只记录本专项目标 warning 是否复现，非目标的游客、灰度库、preload、worker、timing 等告警按原文/来源归类。若页面切换出现持续白屏、全局 renderer 错误或写入/权限弹窗，立即停止相关 UI；不点击可能产生数据副作用的控件。
5. 追加 `V26_T2_WARNING_REPRO=PASS|NOT_REPRODUCED|BLOCKED` 及 `V26_PROFILE_LAYOUT=ISSUE_RECORDED|NOT_REQUIRED|BLOCKED`。PASS/ISSUE 的每项必须有本轮新证据和具体源文件定位；没有证据不允许要求修复。

### T3：allowlist 内最小修复与定向离线 smoke

**允许修改：**仅本节列出的复现源码问题，以及为其补充回归断言的 `scripts/smoke-pages.js`；只追加执行日志。

**源码 allowlist：**

- `miniprogram/components/loading/loading.wxml`、`loading.wxss`。
- `miniprogram/components/recipe-card/recipe-card.wxml`、`recipe-card.wxss`。
- `miniprogram/components/photo-card/photo-card.wxml`、`photo-card.wxss`。
- `miniprogram/components/avatar/avatar.js`。
- 只有当 `avatar.js` 的可空属性类型被本轮 runtime 证据证实不兼容，才可改实际传值的 `miniprogram/pages/profile/profile.wxml`、`pages/album/album.wxml`、`pages/bind/bind.wxml`、`pages/profile-edit/profile-edit.wxml`，在这些组件调用边界将 null 显式归一为空字符串；此 fallback 必须逐条说明原因和实际触发路径。
- 若 fresh profile 证实签名布局问题：`miniprogram/pages/profile/profile.wxss`；仅在确有必要时可改对应 `profile.wxml`。
- `scripts/smoke-pages.js`：仅增加本问题的有效回归覆盖。

1. T2 没有重现任何源码目标，且 profile 布局无问题时，记 `V26_T3_SOURCE_FIX=NOT_REQUIRED`，不动源码，进入 T4 复编验证旧 warning 状态。
2. 对组件 WXSS 告警，只给确需呈现的节点补专属 class 并将 tag selector 改成等价 class selector，覆盖组件中所有实际存在的标签名选择器（包括 image/text、相邻/伪类形式），保持占位图、标签间距、字体和视觉语义不变；不改全局样式、不扩展到无告警组件。
3. 对 avatar null 告警，保持 `avatar` 值在组件 observer 中规范化、图片路径校验和 fallback 行为；优先用组件支持的可空属性类型消除 `String`-`null` 冲突。只有本轮 runtime 证据证实该类型方案不兼容时，才使用本节列出的实际调用边界 WXML 将 null 归一为空字符串。不要放宽 `isImagePath`，不要让 null/未知 URI 进入 `<image>`。
4. 仅若 T2 fresh 截图确认 profile 签名窄列由 flex 子项收缩造成，使用局部 `min-width`/flex 防收缩和单行省略等最小样式修复；保留昵称、完整原始签名与资料数据，不重排其它卡片或改用户数据。
5. 每项修复前把复现步骤、截图/AX/Console 原文、目标 SHA、行/选择器和原因追加到日志；完成后记录 diff、改动文件及新 SHA。不得改 allowlist 外文件。更新 `scripts/smoke-pages.js` 为 null avatar 归一化加组件选择器/布局所需的有效回归检查（只覆盖本次缺陷），然后运行 `node scripts/smoke-pages.js` 与 `node scripts/smoke-photo-presenter.js`，逐条记录 stdout/退出码。源码修复或相关 smoke 失败则记 `V26_T3_SOURCE_FIX=BLOCKED`，停止进一步代码更改并进入事实收口。

### T4：原路径普通编译与目标页复测

**允许修改：**只追加执行日志 T4；必要源码修复仅按 T3 allowlist 且返回 T3 记录后重进本项。

1. 保持原路径、`touristappid`、基础库 `3.4.3`，清理旧 Console 后执行普通编译；等待编译完成，记录编译输出和 fresh AX/screenshot。若本轮有源码改动，必须重新编译，不以热更新/静态 smoke 代替。
2. chat、recipe、album、profile 按序导航并分别保存 fresh AX/screenshot；对每次切换至少等一帧确认 route 和截图同步。loading/recipe-card/photo-card/avatar 所属页面须覆盖到；空相册未实例化 photo-card 时，记录它没有页面实例证据，使用对应组件运行/编译 Console 证据和 smoke 补足，绝不造照片数据。profile 签名问题若被修复，必须有修复后 fresh profile screenshot。
3. Console 单独核对本专项 WXSS selector 与 avatar null 告警是否消失；精确记录残留告警、来源和计数。游客模式、灰度基础库和工具 warning 可继续存在，不要求总 warning=0。目标页面必须稳定可见，且本专项不新增 WXML/WXSS renderer error / `__route__` 错误。
4. `V26_T4_RUNTIME_RETEST=PASS` 需要上述 fresh 页面证据和目标告警复测结果满足预期；若重新编译后白屏持续、项目环境偏离或出现全局 renderer 错误，立即停止 UI 并记 `BLOCKED`，不猜测根因。

### T5：完整离线回归、预算与保护项

**允许修改：**只追加执行日志 T5。

按序运行并逐条保存 stdout、真实退出码和关键断言：

~~~sh
node scripts/audit-assets.js
find miniprogram -name '*.js' -type f -print0 | xargs -0 -n1 node --check
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
~~~

另按 README 的现有方式验证所有 JSON、页面不越层读写 Storage、WXML 条件结构、WXSS universal combinators 与 `STATIC_RISK_SCAN=0`。不添加临时业务数据、文件或依赖。

- `ASSET_MINIPROGRAM_BYTES <= 2097152`，剩余 bytes 为预算减包体且非负；`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`。不要求回到 1,633,052 bytes 或 464,100 bytes。四张猫 PNG 和八张 Tab PNG 路径、逐项 SHA、尺寸、alpha、引用关系须与 T0 一致。
- `project.config.json`、`project.private.config.json`、`miniprogram/app.json`、`appMeta.js`、storage/schema 定义的保护 SHA/字段应与 T0 一致；应用版本 1.4.0、schema 4/1.3、AppID/基础库不变。`miniprogram` 内容树差异仅能来自 T3 allowlist；`scripts` 差异仅允许 `scripts/smoke-pages.js`。逐文件列明改动和 before/after SHA。
- 任一命令失败、预算越界、资源/保护配置漂移或 allowlist 外改动均记 `V26_T5_OFFLINE_REGRESSION=BLOCKED`，不能删功能/压资源掩盖差异。全部达标记 PASS。即使 T1 因白屏阻塞，仍可独立完成此离线核验，但不得借此升级 renderer 状态。

### T6：文档事实收口

**允许修改：**仅追加 `.codex/plans/execution-log.md`、README 的 v2.6 记录和 current 的 v2.6 事实收口。

1. 先记录 README/current/log 收尾前时间、行数、bytes、SHA；按 chat、recipe、album、profile、settings、feedback 列明本轮路由、fresh screenshot/AX、操作结果、Console 错误/告警、修复文件及 SHA。每项只写实际证据。
2. 明确保留 `V25_T1_SOURCE_COMPILE=BLOCKED` 原结论；解释 v2.6 新一轮截图如何验证现时状态，不重写历史或将 CUA 时序观察当成已证实的 v2.5 根因。
3. 记录工具 Stable 版本、原路径、AppID、基础库、模拟器、普通编译结果、目标 warning 前后差异、包体/余量、资源 PNG 与 config/version/schema 保护复核、离线命令及退出码。
4. 记录 v2.6 状态：`V26_T0_BASELINE`、`V26_T1_RUNTIME_RECHECK`、`V26_T2_WARNING_REPRO`、`V26_PROFILE_LAYOUT`、`V26_T3_SOURCE_FIX`、`V26_T4_RUNTIME_RETEST`、`V26_T5_OFFLINE_REGRESSION`、`V26_T6_FACTUAL_CLOSEOUT`、`V26_RUNTIME_UX`。T1/T4 BLOCKED 时剩余 renderer 步骤为 `NOT_RUN`；如果只完成 source/离线修复，整体不得写 PASS。
5. `V26_RUNTIME_UX=PASS` 只在 T1/T4 的目标页面均有本轮稳定可见截图、已确认旧白屏当前是否持续、目标可复现 warning 已修复且 Console 复查符合预期、需要的 profile 布局已截图复验、T5 PASS 时成立。否则如实 BLOCKED/ISSUE_RECORDED/NOT_RUN。README/current 文末保持真实外部能力 `BLOCKED / 未验证`。

## 3. 停止条件与状态定义

- T0/T1/T4/T5/T6 状态为 `PASS` 或 `BLOCKED`；T2 `PASS|NOT_REPRODUCED|BLOCKED`，布局 `ISSUE_RECORDED|NOT_REQUIRED|BLOCKED`；T3 `PASS|NOT_REQUIRED|BLOCKED`；被前置阻塞跳过的任务为 `NOT_RUN`。
- 新鲜 UI 截图持续空白、无法确认原路径/AppID/基础库、权限或登录门槛、全局 renderer/WXML/WXSS/`__route__` 错误、意外数据写入或系统权限弹窗时，停止依赖 UI 的工作并先写日志。白屏原因保持“未确定”。
- 发现缺陷超出 §2 T3 allowlist，停止源码修改并报告直接证据；不得扩大允许文件列表、改权限、换账号/路径/工具或通过 mock 添加渲染。
- 旧 `V25_T1_SOURCE_COMPILE=BLOCKED` 必须逐字保留。仅当 v2.6 取得普通编译后的新鲜 AX+截图证据后，才可对 v2.6 当前运行状态给出 PASS；历史状态和当前状态是不同轮次。
- 新 warning 若来自游客 API、灰度基础库、preload、worker/timing 或 IDE 插件，不伪装成业务源码问题，不以压制 Console 或要求所有 warning 为零作为通过条件。

## 4. Planner 停止点

- v2.5 current 已原样归档并验证 SHA；本文件已改为 v2.6 串行计划。Planner 检查了 PRD、README、v2.5 current 与近端执行日志、目标 WXML/WXSS/JS、avatar 引用、profile 样式、现有 page smoke、项目配置和适用的 AGENTS/agents 配置。
- 本轮仅改动 `.codex/plans/history/current-v2.5-2026-10-08.md`（逐字节归档）和 `.codex/plans/current.md`；未改 README、执行日志、业务源码、脚本、配置、依赖或资源；未执行 DevTools 编译、未操作用户数据、未启动 Executor。
- 父 Agent 复核后可启动唯一 Executor。Executor 必须遵循 T0→T6；白屏若仍持续则按停止规则保留未知根因。

## v2.6 Executor 事实收口

待唯一 Executor 按 T0→T6 完成后追加本轮事实；不得改写 v2.5 的历史 `BLOCKED`。

### v2.6 Executor 本轮实际事实（2026-10-08）

- **收尾前基线**：UTC `2026-10-08 11:42:35` / CST `19:42:35`；README `213` 行 / `32494` bytes / SHA-256 `17f75d58f0d724c33928dfa233a704ab36ffac4a8afb6a8bf46a20ceb2c9d9c3`；current `147` 行 / `20660` bytes / SHA-256 `7d7fc550c1ebd0909d4c1732756c1199f64ee6f986ee6a083f56837e78ed5e94`；execution-log `1775` 行 / `360346` bytes / SHA-256 `ce8243e3f9777089265416d12c8fe83b92895934b0c5985fd34d95ac4689dd86`。v2.5 归档 SHA 仍为 `7213e6e40e99fa011ff55165a6068e34b596a1b928a694a68cf02a42ad42c309`。
- **环境与编译**：微信开发者工具 Stable `2.02.2608070`；原路径 `/Users/lnp/Documents/ChatGPT/delicious- project`；`touristappid`；模拟器 iPhone 12/13 (Pro)；基础库 `3.4.3`。T1、T4 均先清空 Console，再各执行一次普通编译。首帧内容暂空；按计划复观测后 route/screenshot 显示 chat 并稳定，T4 AppService session `1791459240693`。不推断 v2.5 白屏根因。
- **六页现场记录**：截图均为本轮 CUA fresh 回包；页面切换首帧与 route 不一致时，等待 2 秒复观测并只采纳后续匹配结果。Console 计数是同一会话累计，不当作各页独立 warning 数。

| 页面 | route 与 fresh evidence | 操作、Console 与结果 |
|---|---|---|
| Chat | `pages/chat/chat`；T1 与 T4 复观测截图显示八条卡片、消息、输入区和四个 Tab，AX route 匹配。 | T1 `0 errors / 8 warnings`，含 loading selector 告警；T4 普通编译复测为 `0 / 7`，loading 告警消失。未发送消息或触碰猫咪。 |
| Recipe | `pages/recipe/recipe`；T2、T4 route 与菜谱截图同步，当前显示九张未解锁卡片。 | T2 定位 recipe-card WXSS selector warning（原 `.lock-badge text`，`recipe-card.wxss:9:13`）；T4 `0 / 8`，该告警消失。 |
| Album | `pages/album/album`；T2、T4 显示空相册、绑定提示和上传入口，route 匹配。 | T2 定位 photo-card selector warning（原 `.photo-placeholder text + text`，`photo-card.wxss:5:20`）；当前无照片，因此无 photo-card 实例截图。T4 `0 / 9`，selector/avatar null 均未见；未创建或上传照片。 |
| Profile | `pages/profile/profile`；T2 原截图签名窄列三行；T4 fresh 截图签名单行省略，AX 保留完整签名“和八条一起记录每个心动瞬间”。 | T2 累计三条 avatar `String` 收到 null warning；T4 `0 / 10`，avatar null 未再出现。T3 改 profile hero flex 和头像宿主 class；未编辑资料。 |
| Settings | `pages/settings/settings`；T2 fresh AX/screenshot route 匹配；两项开关原为开启且未操作。 | 只读打开并返回；T2 累计 `0 errors / 17 warnings`，包含此前页面 warning，不代表本页独立来源。T4 未重新导航 settings。 |
| Feedback | `pages/feedback/feedback`；T2 fresh AX/screenshot route 匹配。 | 只读查看、未输入或提交；T2 累计 `0 errors / 18 warnings`，包含此前页面 warning，不代表本页独立来源。T4 未重新导航 feedback。 |

- **本轮源码与回归**：T3 仅改以下 allowlist 文件；最终 SHA 与逐项 before SHA 已在 execution-log T3 记录：`loading.wxml` `e5e1a2db58490aed21f88d694d2e4fae7e98c26ed54d95480da5ec46c527a2d9`、`loading.wxss` `335aec4c743b00914f19364fd2dffe5b7049b49688caf8b81b0284db521e6dfa`、`recipe-card.wxml` `db4a23ddc7d38f2ba9dd7bcd56d0f393628e65e4dc352068155d4358007bd456`、`recipe-card.wxss` `dd1d927ed240e08559b4d0638528e03b211320ff864f0311e112e001e8ddec02`、`photo-card.wxml` `33035a2a052ec21d5116522d6e22bcaf5c2255938732478832b72a7bd2aa6d92`、`photo-card.wxss` `d0c4ebdc767affd4253bf9452e1ba017ce1d57fada92b0c4ea557216ed040458`、`avatar.js` `50e55ad113a278ce0cc89b2c8456a15cac8464906842dc9742510595fc47d618`、`profile.wxml` `b408d1f4a927a1f527004fda8cb1249164d9c53068e7be9b646f35754afdee5a`、`profile.wxss` `a3bdc0e2866ded80ba131d3accbc9358b075e68550480f6396a28e96942614ed`、`scripts/smoke-pages.js` `b9ed0d3a54abdcde1f0ef8ac0b809cd2b62ac0a5dd62b54a7dfd39e5c9c4ef18`。
- **预算与保护**：T5 `ASSET_MINIPROGRAM_BYTES=1633568`、limit `2097152`、remaining `463584`、`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`；四张猫 PNG 与八张 Tab PNG 的 SHA/size/dimensions/alpha/reference 均匹配 T0。保护 SHA 匹配 T0：project.config `999c1adb4c03d85076878a88ba4a3d3a32381ad5d35805f4fd70578d0fcab47b`、private config `240345d4b88b5bd08caba18d2ba92d70b03bd8f2ed188ca5b1db23e45387b161`、app.json `e05ce5e2caa64aec9099b95f9f8259944148c25f94d8258c7ba06c94e9499e02`、appMeta `99ca2165f530dc4e43660a56d48e98bc6dbfe1fa3c0d6fcbb485b8672a5d49c1`、storage/schema service `50db6c11e9fe823eebdefaaa5c36f62dded828d62b1fa7b718c0790f67adf5c6`；字段为 touristappid、lib 3.4.3、app 1.4.0、schema 4/1.3。miniprogram 138 与 scripts 13 条路径均与 T0 清单相同，逐文件 SHA 摘要变化仅来自上述九个源码文件和 smoke-pages。
- **离线回归**：T5 按计划 14 项命令以及 README JSON、页面 Storage、WXML 条件、WXSS universal combinators、`STATIC_RISK_SCAN` 检查全部真实 exit `0`；关键结果 `AUDIT_FILES=118`、`SMOKE_PAGES=PASS / ASSERTIONS=104`、`SMOKE_PHOTO_PRESENTER=PASS / PHOTO_ASSERTIONS=21`、`ALL_JSON_OK`、`PAGE_STORAGE_LEAK=0`、`WXML_CHAT_BUBBLE_STRUCTURE=PASS`、`WXSS_UNIVERSAL_COMBINATORS=0`、`STATIC_RISK_SCAN=0`。逐条 stdout/exit 见 execution-log T5。
- **最终状态**：`V26_T0_BASELINE=PASS`；`V26_T1_RUNTIME_RECHECK=PASS`；`V26_T2_WARNING_REPRO=PASS`；`V26_PROFILE_LAYOUT=ISSUE_RECORDED`（已由 T3 修复并经 T4 截图复验）；`V26_T3_SOURCE_FIX=PASS`；`V26_T4_RUNTIME_RETEST=PASS`；`V26_T5_OFFLINE_REGRESSION=PASS`；`V26_T6_FACTUAL_CLOSEOUT=PASS`；`V26_RUNTIME_UX=PASS`（仅指本轮本地 DevTools 目标页面与已复现告警）。v2.5 `V25_T1_SOURCE_COMPILE=BLOCKED` 原文及归档未改写；白屏根因仍未确定。真实账号、云/网络、好友分享、系统相册/权限、真实文件与 Storage 配额、真机和外部服务保持 `BLOCKED / 未验证`。

- **Console 累计计数**：T2 按 route 顺序 chat `0 errors / 8 warnings`、recipe `0 / 10`、album `0 / 13`、profile `0 / 16`、settings `0 / 17`、feedback `0 / 18`；这些是同一 Console 的累计值，不是各页独立告警数。T4 fresh 目标页 chat `0 / 7`、recipe `0 / 8`、album `0 / 9`、profile `0 / 10`，目标 warning 均未再出现。
