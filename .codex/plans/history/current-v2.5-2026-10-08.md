# Planner 计划：v2.5 微信开发者工具原路径模拟器验收

## 0. 目标、依据与交接纪律

- 本专项在微信开发者工具中重新编译原项目，并用实际模拟器检查 v2.3 更新过的猫咪、菜谱、相册、绑定、反馈、设置和导航页面。验收对象是当前工作区的 v2.3 源码，重点为页面真实渲染、文字可读和不提交数据的用户操作路径。
- PRD v1.0 相关范围：§3.1 猫咪状态/聊天/养成呈现；§3.2 菜谱分类、锁定详情和新增入口；§3.3 相册时间线和上传入口；§3.4 个人信息、邀请绑定和设置。v1 采用本地 mock；模拟器行为不证明云端、好友、系统文件或真机能力。
- README 的 DevTools 检查表将编译、四个 Tab、布局与交互、分享、系统权限、文件生命周期和 Storage 生命周期分开。v2.5 只推进原路径编译及页面可见/可操作性；未经实际发生的项目继续记为 BLOCKED / 未验证。
- v2.4 已有 V24_OFFLINE_REVIEW=PASS：包内非空文件 1,633,052 / 2,097,152 bytes，剩余 464,100 bytes；猫图 4 张共 1,374,256 bytes；源码与脚本内容树及配置、PNG 均匹配 v2.3 最终值。该离线 PASS 不是本轮模拟器证据。
- Planner 已原样归档旧 current：.codex/plans/history/current-v2.4-2026-10-08.md，191 行、20,241 bytes、SHA-256 b7aae754256f372eab19f82d0449e3ba97c58d41cecd1ac8bb2e7394dd92b8f0。
- 工作区及祖先路径无适用 AGENTS.md；.codex 下无 agents/*.toml。工作区无 .git。父 Agent 指定一个 Executor 严格串行推进；不得并行启动第二个 Executor。
- Planner 本轮只允许创建上述原样归档并替换 .codex/plans/current.md。Executor 的阶段结果只追加 .codex/plans/execution-log.md；最后只可追加 README、current 的 v2.5 事实收口和执行日志。除 §2.2 明列的现场源码修复外，不得改其它项目文件。本轮不启动 Executor。

## 1. 现场基线与证据边界

### 1.1 项目和预算

- 原项目绝对路径：/Users/lnp/Documents/ChatGPT/delicious- project。
- project.config.json：compileType=miniprogram、appid=touristappid、miniprogramRoot=miniprogram/、libVersion=3.4.3；project.private.config.json 的基础库也为 3.4.3。
- 应用版本 1.4.0；Storage schema 数值 4、名称 1.3。
- Planner 本轮重新运行 node scripts/audit-assets.js，退出码 0：ASSET_CAT_COUNT=4、ASSET_CAT_BYTES=1374256、ASSET_MINIPROGRAM_BYTES=1633052、ASSET_PACKAGE_BUDGET_BYTES=2097152、ASSET_MINIPROGRAM_REMAINING_BYTES=464100、ASSET_ERRORS=0、ASSET_WARNINGS=0。猫咪 idle PNG 和八张 Tab PNG 的 SHA、尺寸、alpha、引用状态均与 v2.4 日志一致。
- 当前 miniprogram 内容树 SHA-256 为 a2caa91742be8d43b1ab481d3f37cd09fb2f1305471aef498ebc95feadbd1d74；scripts 内容树 SHA 为 2d41424a1a1e2c1511f59436e292d51140e7b17d3241468ba892c97da4f88dc8。
- 配置保护 SHA：project.config.json 999c1adb4c03d85076878a88ba4a3d3a32381ad5d35805f4fd70578d0fcab47b；project.private.config.json 240345d4b88b5bd08caba18d2ba92d70b03bd8f2ed188ca5b1db23e45387b161；miniprogram/app.json e05ce5e2caa64aec9099b95f9f8259944148c25f94d8258c7ba06c94e9499e02；miniprogram/utils/appMeta.js 99ca2165f530dc4e43660a56d48e98bc6dbfe1fa3c0d6fcbb485b8672a5d49c1；miniprogram/services/storageService.js 50db6c11e9fe823eebdefaaa5c36f62dded828d62b1fa7b718c0790f67adf5c6。
- Planner 用 CUA 实际绑定微信开发者工具。cua.getApp("微信开发者工具") 名称解析失败；cua.getApp("com.github.Electron") 成功，显示 Stable 2.02.2608070、项目窗口 batiao-love、项目 URL 路径为上述原路径、AppID touristappid。当前账号面板为“未登录”，模拟器是欢迎页，页面路径为空；这只证明 CUA 可控和项目窗口已打开，不证明编译或页面渲染成功。不得要求扫码登录才能填 PASS。
- 既往运行时记录（执行日志 v1.7–v1.9）曾遇到原路径文件夹访问提示、watcher EPERM、游客 AppID 系统错误、WXSS/WXML 错误和 __route__ is not defined。v1.9 曾记录原路径四 Tab 页面和部分路径交互，但这些不是 v2.3 文案/样式变更后的新鲜证据。不得把旧截图或“已打开/已重启/已触发普通编译”当作本轮通过。

### 1.2 v2.3 本轮需核对的源码变化

- 以下路径除明确写出 miniprogram/ 外，均相对 miniprogram/ 根目录。
- 猫咪：miniprogram/models/cat.js、components/cat-display/{cat-display.js,cat-display.wxml,cat-display.wxss}、pages/chat/{chat.wxml,chat.wxss}、pages/profile/{profile.wxml,profile.wxss}。现场重点检查 idle 图/Emoji 回退说明、形态/状态提示、饱食/心情/喂养与经验标签、猫咪操作提示和聊天输入区。
- 菜谱：pages/recipe/{recipe.js,recipe.wxml,recipe.wxss}、recipe-add/{recipe-add.wxml,recipe-add.wxss}、recipe-detail/{recipe-detail.wxml,recipe-detail.wxss}、components/recipe-card/{recipe-card.js,recipe-card.wxml,recipe-card.wxss}、components/empty-state/{empty-state.wxml,empty-state.wxss}。现场重点检查分类/数量/选中态、锁定或照片占位、详情动作文字和新增入口。
- 相册：pages/album/{album.js,album.wxml,album.wxss}、album-upload/{album-upload.wxml,album-upload.wxss}、components/photo-card/{photo-card.js,photo-card.wxml,photo-card.wxss}。现场重点检查时间线/空状态、上传/删除/预览文字、上传表单和相册能力边界提示。
- 绑定、反馈、设置及导航：pages/bind/{bind.js,bind.wxml,bind.wxss}、feedback/{feedback.js,feedback.wxml,feedback.wxss}、settings/{settings.js,settings.wxml,settings.wxss}、about/{about.wxml,about.wxss}、privacy/{privacy.wxml,privacy.wxss}、miniprogram/components/nav-bar/nav-bar.wxml。现场重点检查邀请/无效码提示、本地反馈和字数说明、设置说明及开关状态、关于/隐私返回导航。
- 上述范围来自 v2.3 T1–T3 执行日志；三项页面 UX 任务均为离线 PASS，但当时没有这批变更后的新鲜 DevTools renderer 证据。

## 2. 保护范围和 Executor 权限

### 2.1 固定保护项

- 始终使用原路径、touristappid、基础库 3.4.3。不换 AppID，不改运行库，不导入临时副本或软链接，不复制项目到其它目录，不下载或安装工具，不打开系统设置，不登录或扫码登录，不上传或发布。
- 不清空/重置模拟器 Storage，不提交聊天消息、喂食、摸摸、菜品评分/点赞/删除、相册上传/删除、绑定或有效反馈，不切换或保存设置，不复制/分享邀请码，不使用用户私有照片，不接受意外的系统/文件/相机/相册权限提示。绑定页初始化会在邀请码缺失时按既有产品逻辑自动生成并保存一个本地邀请码；这项正常的页面进入副作用允许发生，不手动重新生成，日志只记录是否已有/新建并对号码脱敏。每次只走只读页面、导航、无效输入验证和可取消的文件选择器路径。
- 不改项目配置、AppID、基础库、版本、schema、依赖、Service/数据模型、资源、脚本或 v2.3 未改动的页面。图片不得增加、删除、替换、复制或重压缩。
- 非空小程序源文件预算以 node scripts/audit-assets.js 的真实 stdout 为准；必须 ASSET_MINIPROGRAM_BYTES <= 2097152 且剩余字节准确、非负。不要求等于旧包体 1,623,865 bytes。四张猫图和八张 Tab 图逐项 SHA 必须与 T0 一致。

### 2.2 唯一允许的现场源码修复范围

只有 T1–T4 复现出页面源码缺陷时，Executor 才可做最小修复，而且只可改下列 v2.3 已变更文件：

- models/cat.js；components/cat-display/{cat-display.js,cat-display.wxml,cat-display.wxss}；pages/chat/{chat.wxml,chat.wxss}；pages/profile/{profile.wxml,profile.wxss}。
- pages/recipe/{recipe.js,recipe.wxml,recipe.wxss}；pages/recipe-add/{recipe-add.wxml,recipe-add.wxss}；pages/recipe-detail/{recipe-detail.wxml,recipe-detail.wxss}；components/recipe-card/{recipe-card.js,recipe-card.wxml,recipe-card.wxss}；components/empty-state/{empty-state.wxml,empty-state.wxss}。
- pages/album/{album.js,album.wxml,album.wxss}；pages/album-upload/{album-upload.wxml,album-upload.wxss}；components/photo-card/{photo-card.js,photo-card.wxml,photo-card.wxss}。
- pages/bind/{bind.js,bind.wxml,bind.wxss}；pages/feedback/{feedback.js,feedback.wxml,feedback.wxss}；pages/settings/{settings.js,settings.wxml,settings.wxss}；pages/about/{about.wxml,about.wxss}；pages/privacy/{privacy.wxml,privacy.wxss}；components/nav-bar/nav-bar.wxml。
- 修改前记录复现步骤、截图/控制台错误、相关文件原 SHA 和最小原因；仅改导致问题的 allowlist 文件。修复后在原路径、相同 AppID/基础库重新普通编译并复测故障页面和受影响导航；随后执行 T6 离线回归。不得为截图或测试添加新页面、测试数据、脚本、依赖或临时素材。
- 若根因在 allowlist 之外、系统权限/模拟器/工具而非上述源码，记录错误并停止代码修改，标记 BLOCKED；不得顺手扩大 allowlist。

## 3. 串行执行任务

一个 Executor 按 T0→T7 依序执行。每项终结后先把原命令/动作、返回状态、直接证据和 SHA 元数据追加到执行日志，再进入下一项。页面可读性问题可记 ISSUE_RECORDED；只有模拟器仍稳定、其它路径独立且无数据写入风险时才可继续收集。全局编译/renderer 错误或无法保持原路径时立即停下所有页面操作。

### T0：计划读取前记录和冻结基线

**允许修改**：只向 .codex/plans/execution-log.md 追加 T0。

1. 在完整读取 current 前，记录 UTC 与 Asia/Shanghai 时间、工作区绝对路径、current 行数/bytes/SHA、v2.4 归档行数/bytes/SHA；之后完整读取计划。日志必须证明时间和元数据采集先于计划读取。
2. 用 wc -l -c 和 shasum -a 256 核实 v2.4 归档与声明一致：191 行、20,241 bytes、SHA-256 b7aae754256f372eab19f82d0449e3ba97c58d41cecd1ac8bb2e7394dd92b8f0。完整读取 v2.4 收口及执行日志 v2.3 T1–T4、v2.4 T0–T3，确认离线 PASS 与历史 BLOCKED 未被改写且外部未验证边界仍存在。
3. 重算 miniprogram/scripts 内容树、五个配置/核心 SHA 和 node scripts/audit-assets.js。记录全部资产审计 stdout、退出码、当次 README/current/log/归档行数、bytes、SHA。与 §1.1 对比；任何变化须逐文件定位来源，不得仅凭旧日志推定。
4. 检查 CUA app 清单和协作树，确认可绑定实际工具且只有一个 Executor。
5. 保护值、预算、归档与计划元数据全部可复核才记 V25_T0_BASELINE=PASS；否则记录直接差异，记 BLOCKED 并停止。

### T1：原路径普通编译门禁

**允许修改**：只追加执行日志 T1；若编译错误直接定位到 §2.2 allowlist 文件，可按该节做最小源码修复并立即重编。

1. 用已实测可绑定的 cua.getApp("com.github.Electron") 获取微信开发者工具；刷新 AX 和截图，记录 Stable 版本、项目窗口、实际 project path、AppID、模拟器设备/比例、基础库、账号可见状态、页面路径和错误数。
2. 必须确认项目路径严格等于 /Users/lnp/Documents/ChatGPT/delicious- project、AppID 为 touristappid、基础库为 3.4.3。若项目窗不是原路径，只能从 DevTools 已有项目列表/文件菜单打开原目录；不导入副本。可关闭“未登录”侧栏，但不扫码登录。
3. 先保存旧 Console 证据，再清空旧 Console；点击“普通编译”，等待编译面板/模拟器稳定后重新读取 AX、截图和 Console。记录新鲜编译结果、首屏路由及可见页面。
4. V25_T1_SOURCE_COMPILE=PASS 必须同时满足：原路径、正确 AppID 和有效基础库可核验；本次普通编译已完成；模拟器显示八条与你的实际页面，首路由 pages/chat/chat，而非欢迎页；本次 Console 无 WXML/WXSS 编译错误或 __route__ 渲染错误。只有“启动编译”、appservice restart、项目 URL 或页面路径都不够。
5. 若编译错误明确来自 §2.2 allowlist 中的源码，先把原错误、文件 SHA 和复现证据追加到 T1 日志，按 §2.2 修复并在原路径立即重编；只有页面加载且 Console 满足第 4 点后，T1 才记 PASS，并把该修复留给 T5 总结、T6 离线复验。工具不可绑定、目录访问/EPERM、游客系统错误、登录门槛、编译卡住、路径/AppID/库版本不符、页面仍空白，或错误来自 allowlist 外时，记 BLOCKED 并停止；不继续点击页面、不改权限、不登录、不换路径。

### T2：猫咪与菜谱真实页面

**允许修改**：只追加执行日志；如页面源码有问题，登记 ISSUE_RECORDED 并留待 T5。

每个动作后刷新 AX/截图，记录实际模拟器页面路径、可见文字/控件和新 Console 错误/警告。截图用 CUA 返回的实际画面；日志记操作顺序及可识别的截图/工具输出引用。DevTools 原生 AX 树不等于小程序无障碍树，可读性按模拟器屏幕判断，不宣称屏幕阅读器验收。

- 猫咪/聊天页 pages/chat/chat：检查标题、形态/状态、cat image/Emoji 回退说明、饱食/心情/今日喂养/经验标签、喂养和摸摸按钮、空消息提示、输入框/发送按钮。点入输入框，输入非敏感临时文字，确认键盘不遮挡输入/发送区，再清空并点非提交区域收起键盘；不触发键盘发送。不得点击喂养/摸摸或发送。
- 菜谱页 pages/recipe/recipe：依次点未解锁、已解锁、甜品区，核对分类名、数量和选中态，记录各类为空或有卡片。打开一张锁定默认菜，检查锁定/照片占位、说明和动作文字；若没有锁定卡则记录实况，不造数据。点“补充照片解锁”若打开选择器，只取消返回，不选照片、不授权。打开“新增菜品”表单，检查字段、分类、按钮后返回，不保存。
- 图像按当前屏幕检查。idle fallback 是预期设计；没有 happy/eating/sad/sleeping 专用 PNG 不记为此次故障。
- 全局 renderer/Console 错误则记 BLOCKED 并停止后续 UI。单页文案/布局问题可登记待修；其他独立页面可继续的前提是模拟器稳定。结束后追加 V25_T2_CAT_RECIPE_UX=PASS|ISSUE_RECORDED|BLOCKED。

### T3：相册真实页面

**允许修改**：只追加执行日志；故障修复留待 T5。

- 在 pages/album/album 检查顶部情侣信息/在一起天数、时间线或空状态、上传/删除/预览文字。有既有照片时只浏览，不保存、删除或长按触发系统相册动作。
- 打开 pages/album-upload/album-upload，检查日期、描述等输入项与按钮。可打开系统选择器并立即取消以验证应用内入口；不选取/读取用户照片、不提交、不接受权限提示。取消后确认正常留在上传页或返回。
- 记录页面路径、截图、可见文案、错误及返回结果。空相册是合法状态，不造图片或上传数据。
- 全局 renderer 不稳定则 BLOCKED 并停止；否则追加 V25_T3_ALBUM_UX=PASS|ISSUE_RECORDED|BLOCKED。

### T4：个人资料、绑定、反馈、设置与导航

**允许修改**：只追加执行日志；故障修复留待 T5。

- 在 pages/profile/profile 检查个人资料、情侣状态、成长统计、TabBar；进入 pages/profile-edit/profile-edit 检查字段后返回，不保存。
- 打开 pages/bind/bind 前记录个人页绑定状态；页面初始化若缺少邀请码会按现有实现生成本地邀请码，该副作用按 §2.1 记录但不抄录号码。检查邀请码区域/能力说明；清空输入后输入 5 个字符 ABCDE 并点确认，检查 6 位格式提示、无自动绑定和个人页状态未变；不点“生成新邀请码”、不复制/分享、不输入有效码。
- 打开 pages/settings/settings，检查情绪关怀开关现状/说明、菜单与能力提示；不切换开关、不触发清除数据/缓存。
- 导航到 pages/about/about、pages/privacy/privacy、pages/feedback/feedback 并使用返回按钮，记录标题、返回层级和截图。反馈页选择分类、输入 4 个非敏感字符，观察实时计数后点提交，确认出现至少 5 字的校验提示且没有成功记录；再清空离开，不提交有效反馈或上传内容。
- 若已有绑定、资料或设置，记录初值并确认无效操作后状态未变；不解绑/编辑/覆盖。
- 每个页面有实际屏幕证据和路径。只读导航/无效输入可证明 UI 操作可读；不升级分享/绑定成功、远端反馈或权限成功。追加 V25_T4_PROFILE_UX=PASS|ISSUE_RECORDED|BLOCKED。

### T5：复现问题分类与最小修复

**允许修改**：仅 §2.2 allowlist 内直接造成复现缺陷的源码及执行日志。

- 若 T1–T4 没有源码问题，记 V25_T5_SOURCE_REPAIR=NOT_REQUIRED，不改代码。若 T1 已按规则修复编译错误或 T2–T4 记录了 ISSUE_RECORDED，则本任务检查每项直接证据并按 §2.2 修复；复编和相关页面复测成功后记 V25_T5_SOURCE_REPAIR=PASS。
- 如有缺陷，为每项保存复现步骤、原始屏幕/Console、页面路径、目标文件原 SHA 和最小原因；仅修复对应 allowlist 文件。多个页面受影响时扩大复测到对应路由。
- 在原路径点击普通编译，取得故障页新鲜无编译/渲染错误截图及预期控件/反馈。复测通过后，在追加日志中保留原 ISSUE_RECORDED 并追加该页面最终 PASS；源码写入成功或离线 smoke 通过不构成 renderer 修复证据。
- 问题来自 allowlist 外文件、开发者工具、AppID、路径权限或 OS 提示时停止源码修改，记 BLOCKED 并写直接证据；不得以新增权限/账号/资源规避问题。

### T6：预算、离线复验与保护项

**允许修改**：只追加执行日志。源码未改变时记录前后相同 SHA；源码有改动时逐条执行以下命令：

~~~sh
node scripts/audit-assets.js
find miniprogram -name '*.js' -type f -print0 | xargs -0 -n1 node --check
node scripts/validate-miniapp.js
node scripts/smoke-cat-interaction.js
node scripts/smoke-photo-presenter.js
node scripts/smoke-pages.js
node scripts/smoke-capabilities.js
~~~

- 每条退出码必须为 0，并记录 stdout 关键标记/断言数。包体不超 2,097,152 bytes，余量准确非负；ASSET_ERRORS=0、ASSET_WARNINGS=0；12 张 PNG 的 SHA、尺寸、alpha、引用关系与 T0 一致。
- 配置 SHA、AppID、libVersion 3.4.3、应用版本 1.4.0、schema 4/1.3 不变。记录修复文件 SHA、miniprogram 内容树和变化文件清单。
- 任一命令失败、预算/保护值变化或出现 allowlist 外改动时记 V25_T6_OFFLINE_REGRESSION=BLOCKED；不得删文案、压资源或声称全通过。全部通过记 PASS。即使未改源码，也重跑审计、validate 和 4 个相关 smoke，建立本轮终态基线。

### T7：结果收口与未验证边界

**允许修改**：只追加 current 的 v2.5 事实收口、README 的新 v2.5 运行时记录和执行日志。先记 README/current/log 的 UTC/本地时间、行数、bytes、SHA；不覆盖历史阻塞或归档。

- 按 chat、recipe、album、profile、bind、feedback、settings、about、privacy、profile-edit 逐项列出真实路由、是否有新 renderer 截图、可读操作结果、Console/编译结果、修复文件及最终 SHA；缺项标 BLOCKED / 未验证。
- 记录工具 Stable 版本、原路径、AppID、有效基础库、模拟器设备、普通编译结果、当前包体/余量、配置和资源保护复核结果。
- 有未解决问题、T1–T6 BLOCKED 或 T2–T4 仍为 ISSUE_RECORDED 时，V25_RUNTIME_UX=BLOCKED；README/current 用逐项结果如实反映已有进展，不把尝试改写为成功。
- 只有 T1–T4 最终均 PASS、T5 为 PASS 或 NOT_REQUIRED、T6 PASS，目标页面均有新鲜截图和可读操作路径，且修复（如有）已复编复验，才可记 V25_RUNTIME_UX=PASS。
- 即使本专项 PASS，真实微信好友分享/跨设备绑定、账号/云端/openId、LLM/推送/远端反馈、系统相册和文件权限/save/unlink、Storage 真实 quota、真机多尺寸/输入法/长手势/中断恢复、未交付猫咪专用状态 PNG，仍为 BLOCKED / 未验证。

## 4. 状态定义和总停止规则

- T0、T1、T6、T7 状态为 PASS 或 BLOCKED；T2–T4 为 PASS、ISSUE_RECORDED 或 BLOCKED；T5 为 PASS、NOT_REQUIRED 或 BLOCKED。遇阻后跳过的任务记 NOT_RUN。ISSUE_RECORDED 不是通过，必须由 T5 解决并在 T6 复验。
- 每项结束并写日志后才可进入下一项。全局编译错误、空白模拟器、原路径权限问题、AppID/基础库偏离、意外写入/权限提示或状态不确定时，停止相关操作并标 BLOCKED。不得运行超出本计划的能力测试。
- 遇阻后停止所有依赖该结果的模拟器操作和源码修复。允许跳过剩余操作任务，直接执行 T7 文档收口；未执行的任务标记 NOT_RUN，保留已收集证据，整体状态仍为 BLOCKED。T7 只整理事实，不重试失败动作。
- 不向测试账号/微信好友/云端发送或上传数据；不清 Storage、不做有效绑定、不提交反馈、不保存/删除照片。若屏幕含用户私有资料，不外传，日志只记必要内容并对昵称/邀请码脱敏。
- V25_RUNTIME_UX=PASS 只表示本专项的真实模拟器页面检查完成，不代表 PRD 全部完成或外部能力通过。缺页、无新鲜截图、只有编译动作、Node/stub smoke 或页面路径都不得填 PASS。

## 5. Planner 停止点

- 原 v2.4 current 已字节级归档；新 v2.5 计划只针对真实 DevTools 模拟器呈现和只读/可取消操作。
- Planner 已核对 PRD、README、current、v2.3/v2.4 执行记录、项目配置、目标页面变化、历史运行时证据及 CUA 可用性。本轮未改业务源码、README、执行日志、配置、资源或脚本，也未编译/启动 Executor。
- 父 Agent 独立复核后可启动唯一 Executor。Executor 必须从 T0 读取证据起严格串行推进；只有现场新证据通过，才能更新运行时状态。

## v2.5 Executor 事实收口

待 Executor 完成 T0–T7 后追加；目前 v2.5 运行时项目均为 BLOCKED / 未验证。

## v2.5 Executor 事实收口（2026-10-08）

本轮按原路径执行 v2.5。T0 `V25_T0_BASELINE=PASS`：计划读取前记录时间/路径/计划元数据，current 为 163 行/22,445 bytes/SHA `d355d5e0dce7ca57b493d1ac48756fcee5b5b871290ab0fe79118b95ee6dd1b6`；v2.4 归档为 191 行/20,241 bytes/SHA `b7aae754256f372eab19f82d0449e3ba97c58d41cecd1ac8bb2e7394dd92b8f0`。记录了首次归档路径拼写错误及在读取 current 前更正后的完整时间证据。v2.3 `V23_OFFLINE_REGRESSION=BLOCKED` 历史未改写；v2.4 离线复核仍为 PASS。

T1 使用微信开发者工具 Stable `2.02.2608070`，项目路径 `/Users/lnp/Documents/ChatGPT/delicious- project`，AppID `touristappid`，基础库 `3.4.3`，模拟器 `iPhone 12/13 (Pro)`。清理旧 Console 后执行了“普通编译”。编译后 AX 仍报告首路由 `pages/chat/chat`，Console 为 `0 errors / 8 warnings`，其中有游客模式 API 模拟、灰度基础库、`components/loading/loading.wxss:2` 组件选择器及 preload 警告；没有新的 WXML/WXSS 编译错误或 `__route__` 错误。但是两张连续新鲜截图均为整窗白屏，没有可见的小程序 renderer。按计划的空白模拟器停止条件，`V25_T1_SOURCE_COMPILE=BLOCKED`，没有继续点页面、重启或改 allowlist 源码。

| 页面 | 路由 | 本轮有效 renderer 截图/操作 | Console 与结果 | 修复文件/SHA |
| --- | --- | --- | --- | --- |
| chat | `pages/chat/chat` | 编译前新鲜截图可见页面；编译后两张截图白屏，无有效新 renderer 截图或控件操作 | 普通编译后 `0 errors / 8 warnings`；全局白屏，BLOCKED | 无 |
| recipe | `pages/recipe/recipe` | 未进入；无截图/操作 | T2 `NOT_RUN`，页面级结果未验证 | 无 |
| album | `pages/album/album` | 未进入；无截图/操作 | T3 `NOT_RUN`，页面级结果未验证 | 无 |
| profile | `pages/profile/profile` | 未进入；无截图/操作 | T4 `NOT_RUN`，页面级结果未验证 | 无 |
| bind | `pages/bind/bind` | 未进入；无截图/操作 | T4 `NOT_RUN`，页面级结果未验证 | 无 |
| feedback | `pages/feedback/feedback` | 未进入；无截图/操作 | T4 `NOT_RUN`，页面级结果未验证 | 无 |
| settings | `pages/settings/settings` | 未进入；无截图/操作 | T4 `NOT_RUN`，页面级结果未验证 | 无 |
| about | `pages/about/about` | 未进入；无截图/操作 | T4 `NOT_RUN`，页面级结果未验证 | 无 |
| privacy | `pages/privacy/privacy` | 未进入；无截图/操作 | T4 `NOT_RUN`，页面级结果未验证 | 无 |
| profile-edit | `pages/profile-edit/profile-edit` | 未进入；无截图/操作 | T4 `NOT_RUN`，页面级结果未验证 | 无 |

T2–T4、T5 按 T1 阻塞及依赖关系记 `NOT_RUN`。独立离线 T6 已完成并通过：`node scripts/audit-assets.js` 显示 `ASSET_MINIPROGRAM_BYTES=1633052`、预算 `2097152`、余量 `464100`、4 张猫图 `1374256` bytes、错误/警告为 0；`validate-miniapp.js` 为 `AUDIT_FILES=118`、错误/警告为 0；猫咪交互、照片呈现、页面和能力 smoke 分别为 21、21、97、22 assertions 且全部 PASS。`miniprogram` 138 文件树 SHA `a2caa91742be8d43b1ab481d3f37cd09fb2f1305471aef498ebc95feadbd1d74`、`scripts` 13 文件树 SHA `2d41424a1a1e2c1511f59436e292d51140e7b17d3241468ba892c97da4f88dc8`；配置/核心保护值与 T0 一致。未修改业务源码、脚本、配置、依赖或资源。`V25_T6_OFFLINE_REGRESSION=PASS`，不能覆盖运行时白屏。

任务状态：`V25_T0_BASELINE=PASS`、`V25_T1_SOURCE_COMPILE=BLOCKED`、T2/T3/T4/T5 `NOT_RUN`、`V25_T6_OFFLINE_REGRESSION=PASS`、`V25_T7_FACTUAL_CLOSEOUT=PASS`、`V25_RUNTIME_UX=BLOCKED`。微信 renderer 页面操作、登录账号/云端能力、分享/绑定、系统相册与文件生命周期、Storage quota、真机布局/输入法/手势/中断恢复及未交付猫咪专用状态 PNG 仍为 `BLOCKED / 未验证`。离线回归和 AX 路由不代表运行时页面通过。逐项动作、原始命令/退出码、Console 与截图工具证据、历史阻塞保留情况见执行日志。
