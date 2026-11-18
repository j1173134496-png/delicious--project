# Planner 计划：八条与你 v2.3 离线 UX、状态回退与能力边界

## 0. 角色、范围与修改纪律

- 本文件是 v2.3 的唯一执行计划。Planner 已读取 `PRD-情侣小程序「八条与你」.md`、`README.md`、v2.2 当前计划及执行日志、全部历史计划、根目录配置、`miniprogram/**`、`scripts/**`、资源和资源说明；本轮不启动 Executor、不实现代码。
- Planner 首先把 v2.2 当前计划原样归档为 `.codex/plans/history/current-v2.2-2026-09-30.md`，归档校验为 **264 行、27132 bytes、SHA-256 `84472107ed0386246ca266eb0f1d10b6e5bcd06b93188d126cfa172db41faa9a`**。归档只读，不追加、不重排、不覆盖。
- Planner 只允许修改本归档和本文件。不得修改 `README.md`、`.codex/plans/execution-log.md`、业务源码、资源、配置、依赖或脚本。完成归档和本计划后停止并向父 Agent 报告。
- 若父 Agent 以后启动 Executor，Executor 必须完整读取本文件，记录读取前行数/字节数/SHA-256/时间/工作区，然后严格按 T0→T4 串行执行。不得并行启动第二个 Executor；每项先验证再进入下一项，并把操作、直接证据、命令/退出码、结果、回滚或停止原因和文件 SHA 追加到执行日志。
- 继续保持 `project.config.json` 的 `compileType=miniprogram`、`appid=touristappid`、`miniprogramRoot=miniprogram/`、目标基础库 `3.4.3`；保持 `utils/appMeta.js` 版本 `1.4.0`、`storageService.js` schema 数值 `4`/名称 `1.3`。不注册或替换 AppID，不接入网络、云开发、云存储、openId、真实 LLM、远程反馈、主动推送、第三方依赖或伪造的系统权限。
- v2.2 已通过的菜谱照片事务/锁定详情、聊天与关怀事务、20/50 容量拒绝、头像 pending 回滚和能力原因回归不在 v2.3 重做；本计划只处理新的呈现、无障碍文案、状态素材回退和单机 UX 缺口。任何需要改动上述事务服务的请求都停在范围审查。

## 1. PRD → 实现差距审计（2026-09-30）

### 1.1 当前离线基线

- `project.config.json` 是原生小程序配置，AppID 仍为游客值 `touristappid`；`app.json` 有八条、菜谱、相册、我的四个 Tab 及其本地页面。没有 package/lockfile、云环境或网络依赖。
- v2.2 收口后的可复查输出为：`audit-assets.js` 的 `ASSET_CAT_COUNT=4`、`ASSET_CAT_BYTES=1374256`、`ASSET_MINIPROGRAM_BYTES=1623865`、`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`；`validate-miniapp.js` 的 `AUDIT_FILES=118`、`ERRORS=0`、`WARNINGS=0`；storage/cat/photo/file/care/invariants/recovery/lifecycle/local/pages/capabilities smoke 均通过，`SCHEMA_VERSION=4`。
- 四个形态各有一张 `idle.png`，四张像素尺寸均不超过 640 px、单张不超过 450 KiB；`models/cat.js` 只有 `idle/happy/eating/sad` 四个状态，`getFormAsset()` 对缺少专用状态图返回同形态 idle，并由 CSS/Emoji 表现状态。PRD 中的 `sleeping` 专用状态图当前不存在。
- `cat-display` 已绑定点击和长按，并有长按后抑制跟随 tap 的逻辑；真实设备 hold/longpress 的时序仍不能由 headless stub 证明。页面目前显示“点我摸摸”，没有把点击/长按、当前状态和图片回退说清楚。

### 1.2 差距矩阵：单机可完成与外部阻塞

| 领域 | PRD/当前证据 | v2.3 可在离线单机完成 | 必须外部证据、保持 BLOCKED |
| --- | --- | --- | --- |
| 猫咪成长与状态 | 四级成长、喂养/聊天/状态栏已在 v2.2 通过；四形态仅 idle 素材 | 明确 idle 回退、状态文字、点击/长按提示和可读文本；补充静态回退契约与预算输出；不增加二进制图 | happy/eating/sleeping/sad 专用 PNG、帧动画、视觉风格验收需要用户素材和资源评审；真机手势/动画需真实设备 |
| 菜谱 | 三 Tab、锁定详情、补图/评分/点赞/删除在 v2.2 通过；卡片/Tab/星级/浮动新增使用视觉字符或颜色表达 | Tab 当前态和数量的可读文案、锁/照片占位、评分/点赞/新增动作的按钮标签；不改 Service 事务和上限 | 图片选择器、真实文件 save/unlink、布局/字体/无障碍树在微信 renderer/真机的最终表现 |
| 相册 | 月份分组、9 张批量、预览、签名、本人删除和取消/空态已有；保存系统相册由长按触发 | 关闭/签名/上传/删除/照片卡片的可读动作，显示“长按照片可尝试保存”及当前环境回退；保留本地预览/删除 | 真正 hold/longpress、`wx.saveImageToPhotosAlbum` 成功/拒绝、系统相册权限、有效图片文件生命周期需真实设备 |
| 绑定 | 邀请码生成、深链预填、复制、解绑和当前设备模拟已有；打开链接不自动绑定 | 无效邀请码内联错误、复制不可用时的手动记录提示、明确“当前设备模拟/不跨设备”的状态文案；不改变绑定 Service | AppID、登录/openId、云数据库和好友分享发送才可跨设备绑定/分享 |
| 反馈 | 分类、5–500 字、本地保存/复制及“尚未发送”已有，50 条容量拒绝已通过 | 字数计数、选中态可读文案、Storage 不可用/容量提示和提交后本地状态；不添加网络发送 | 远程反馈接口、账号关联、推送需后端和授权 |
| 设置、关于、隐私 | 开关持久化、清除重试、版本/本地模式和隐私页面已通过 | 开关状态、链接/返回、清除警告和重试的可读文案；说明本地保存和未接入能力 | 系统设置跳转、通知推送、隐私合规审查不能由本地 UI 代替 |

### 1.3 素材预算、回退和资源结论

- 当前猫图预算 `1.6 MiB = 1677721 bytes`，已用 `1374256 bytes`，余量 **303465 bytes**；小程序非空源文件预算 `2 MiB = 2097152 bytes`，已用 `1623865 bytes`，余量 **473287 bytes**。余量只作为审计事实，不构成可随意增加素材的额度。
- 在没有用户提供、风格可验收且经过压缩的原始状态素材时，不能复制 idle、生成 Emoji PNG 或放入四套 300–450 KiB 状态图来冒充交付；这种做法会破坏风格/预算，且无法覆盖 PRD 的 sleeping 视觉要求。v2.3 不添加或替换任何二进制资源。
- 保持 `FORM_META.assets.idle` 和 `getFormAsset()` 的 idle 回退；`happy/eating/sad` 继续使用 idle + CSS/Emoji，UI 以自然语言说明当前是本地轻量表现。`sleeping` 记录为“专用素材待提供，BLOCKED”，不偷偷加一个没有素材的伪状态。
- T1 可以只增强 `audit-assets.js` 的余量和状态回退输出，以及 `validate-miniapp.js` 的静态契约；若发现任何资源 SHA、数量、尺寸、总字节或包预算改变，立即停止而不是压缩到阈值边缘。

### 1.4 需要修正的无障碍和文案缺口

- 猫咪：`cat-display` 的“点我摸摸”改为同时说明点击/长按和当前状态；图片失败、Emoji 占位、形态名和状态名都要有可读文本。不得把 headless 事件当成真实长按通过。
- 菜谱：Tab 不能只靠颜色区分当前项；锁徽标、照片占位、星级、点赞和 `＋` 浮动按钮不能只依赖 Emoji/字符。补充可读动作文本和当前数量，保持锁定详情的 v2.2 文案。
- 相册：关闭符号 `×`、签名编辑、照片卡片和保存动作要有按钮/文本标签；预览层显示“长按照片可尝试保存到系统相册”，并同时保留能力不可用原因。只验证页面内提示，不合成长按事件或伪造系统相册成功。
- 绑定：邀请码复制按钮附近提供 clipboard 不可用时的手动抄写/记录提示；错误码在输入区内联显示，继续保留当前设备模拟和不自动绑定语义。
- 反馈：显示 `0/500` 到 `500/500` 的内容计数，分类选中状态有文本表达，保存后继续明确“仅本机、尚未发送”；Storage 不可用或达到容量时给出下一步。
- 设置及共用组件：switch 的开/关状态、链接、返回和清除重试要能通过原生控件名称或等效可读文本辨认；不把仅 `aria-label` 的静态命中当作真实无障碍树验收，基础库不支持时必须保留可见文本。

## 2. 保护基线与执行边界

### 2.1 Executor T0 必须记录的基线

- 原样校验 v2.2 归档：264 行、27132 bytes、SHA `84472107ed0386246ca266eb0f1d10b6e5bcd06b93188d126cfa172db41faa9a`。
- 记录 `README.md`、`.codex/plans/execution-log.md` 的读取前行数/字节数/SHA，`miniprogram/**` 与 `scripts/**` 内容树摘要，四张 idle PNG 和 Tab 图标 SHA；记录配置/AppID/版本/schema。
- 记录 T1–T3 允许文件在修改前的 SHA。T0 只追加执行日志，不改业务、资源、配置、计划或文档。
- T0 使用现有离线命令确认 v2.2 基线，不重复已经通过的 DevTools 页面探测：资源审计、全量 JS 语法、`validate-miniapp.js`、全部既有 smoke、JSON、页面 Storage 越层、WXML 条件结构、WXSS 组合器和静态风险扫描。

### 2.2 全局允许与停止规则

- 每个任务只能修改该任务“允许文件”列出的路径；每次先保存这些文件的 SHA，失败时只恢复本任务的改动。不得用清空 Storage、删除旧记录或改 schema 来使断言通过。
- 任何保护哈希漂移、计划外文件、二进制资源变化、预算告警、Node 语法错误、smoke 非零、文案把 BLOCKED 能力写成成功、静态扫描命中，立即在日志写明直接证据并停止后续任务。
- 回滚后至少重跑受影响 JS 的 `node --check`、对应 smoke、`validate-miniapp.js` 和 `audit-assets.js`；回滚本身失败也停止，不用“修复回滚”掩盖证据。
- 允许使用原生 `<button>`、显式可读 `<text>`、必要时已由目标基础库支持的可访问属性；不引入第三方无障碍组件，不依赖未知的 renderer 行为。所有验证均是离线源代码/Stub 证据，不能升级为微信/真机通过。

## 3. 串行任务与验收

### T0：读取计划、冻结 v2.2 基线与差距证据

**目标**：冻结归档、配置、资源预算和内容树，证明 Executor 没有把 v2.2 事务/容量/头像工作倒带；整理 T1–T3 的本地 UX 输入。

**允许修改文件**：仅 `.codex/plans/execution-log.md` 追加 T0 记录。

**操作与验证**：

1. 完整读取本文件，记录读取前 hash/行/字节/时间；校验 v2.2 归档的三项精确值。
2. 校验 AppID、基础库、版本、schema、四形态 idle 资源、资源总量和内容树；确认没有未授权源码/资源/配置漂移。
3. 按现有 README 顺序运行 `node scripts/audit-assets.js`、全量 `node --check`、`node scripts/validate-miniapp.js`、storage/cat/photo/file/care/invariants/recovery/lifecycle/local/pages/capabilities smoke、JSON 解析、页面 Storage 越层、WXML/WXSS/静态风险检查。
4. 在日志中写出 PRD 差距表的离线项与外部阻塞项；不得启动 DevTools、网络、系统权限或真机操作。

**通过标记**：`V23_T0_OFFLINE_BASELINE=PASS`，且资源输出保持 `CAT_COUNT=4`、`CAT_BYTES=1374256`、`MINIPROGRAM_BYTES=1623865`（若工具输出格式调整，仍须给出等价字节事实）。

**停止/回滚**：归档、配置、资源或 v2.2 保护文件不符，任一命令非零，或差距证据缺失，记录 `V23_T0_OFFLINE_BASELINE=BLOCKED` 并停止 T1；T0 不做业务回滚。

### T1：猫咪状态回退、资源门禁与可读交互文案

**目标**：在不增加状态 PNG、不改成长规则和喂养/聊天事务的情况下，明确 idle 回退、素材缺口和点击/长按/状态文案，补齐猫咪相关可读标签。

**允许修改文件（仅这些）**：

- `miniprogram/models/cat.js`
- `miniprogram/components/cat-display/cat-display.js`
- `miniprogram/components/cat-display/cat-display.wxml`
- `miniprogram/components/cat-display/cat-display.wxss`
- `miniprogram/pages/chat/chat.wxml`
- `miniprogram/pages/chat/chat.wxss`
- `miniprogram/pages/profile/profile.wxml`
- `miniprogram/pages/profile/profile.wxss`
- `scripts/audit-assets.js`
- `scripts/validate-miniapp.js`
- `scripts/smoke-cat-interaction.js`
- `scripts/smoke-pages.js`

**实现约束**：

1. 保留四张 idle PNG 的路径、尺寸、SHA、透明度和引用；不得新增/复制/重压缩二进制。`CAT_STATES` 不新增没有素材的 sleeping 专用图；对 sleeping 的缺口只写静态/文档阻塞事实。
2. `getFormAsset()` 或等价 presenter 必须可断言：idle 走 dedicated asset，happy/eating/sad 无专用图时走同形态 idle，并返回明确的 fallback 信息；状态 CSS/Emoji 只能是轻量表现，不得宣称状态 PNG 已交付。
3. 猫卡片显示形态、状态、点击/长按提示和图片失败后的占位可读文本；不改变既有 tap/longpress 去重、feed/chat 计数、成长条件或页面事件协议。
4. `audit-assets.js` 输出猫图余量 `303465`、小程序余量 `473287`（或计算等价结果），`validate-miniapp.js` 增加状态回退/专用素材缺口/无远程资源契约。若基础库不保证某个可访问属性，保留可见文案作为唯一最低要求。

**验证**：

- `node --check` 受影响 JS，退出码必须为 0。
- `node scripts/audit-assets.js`：四张猫图、总字节、包字节和所有 SHA 不变，`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`、预算余量非负。
- `node scripts/smoke-cat-interaction.js`：tap/longpress 去重、状态回退和失败占位断言；不得以 tap 代替真机 hold。
- `node scripts/smoke-pages.js`：chat/profile 的状态/形态/可读提示仍在，旧计数和 busy 断言不减少。
- `node scripts/validate-miniapp.js`：输出 `CAT_STATE_FALLBACK=PASS`、`CAT_ASSET_BUDGET=PASS` 或等价可审计标记，且静态扫描为 0。

**停止/回滚**：资源 SHA/bytes/count 改变、任何状态被写成“已拥有专用素材”、成长/手势计数变化、预算负数或测试失败时，恢复 T1 允许文件到任务入口 SHA，重跑 audit/cat/pages/validate，标记 `V23_CAT_FALLBACK_UX=BLOCKED`，不得进入 T2。

### T2：菜谱与相册单机呈现、占位和操作可读性

**目标**：补齐菜谱三 Tab、卡片/详情动作和相册预览/签名/删除/上传的可读提示；保持 v2.2 Service 事务、9 张上限、共享引用保护和真实长按/系统相册的 BLOCKED 状态。

**允许修改文件（仅这些）**：

- `miniprogram/pages/recipe/recipe.js`
- `miniprogram/pages/recipe/recipe.wxml`
- `miniprogram/pages/recipe/recipe.wxss`
- `miniprogram/pages/recipe-add/recipe-add.wxml`
- `miniprogram/pages/recipe-add/recipe-add.wxss`
- `miniprogram/pages/recipe-detail/recipe-detail.wxml`
- `miniprogram/pages/recipe-detail/recipe-detail.wxss`
- `miniprogram/components/recipe-card/recipe-card.js`
- `miniprogram/components/recipe-card/recipe-card.wxml`
- `miniprogram/components/recipe-card/recipe-card.wxss`
- `miniprogram/pages/album/album.js`
- `miniprogram/pages/album/album.wxml`
- `miniprogram/pages/album/album.wxss`
- `miniprogram/pages/album-upload/album-upload.wxml`
- `miniprogram/pages/album-upload/album-upload.wxss`
- `miniprogram/components/photo-card/photo-card.js`
- `miniprogram/components/photo-card/photo-card.wxml`
- `miniprogram/components/photo-card/photo-card.wxss`
- `miniprogram/components/empty-state/empty-state.wxml`
- `miniprogram/components/empty-state/empty-state.wxss`
- `scripts/validate-miniapp.js`
- `scripts/smoke-pages.js`
- `scripts/smoke-photo-presenter.js`

**实现约束**：

1. Tab 当前项、数量和甜品筛选规则保留现有逻辑；把锁定/已解锁、照片等待/占位、评分星级、点赞、编辑/删除和新增动作提供为可读文本或原生按钮名，不只依赖颜色和 Emoji。锁定详情必须继续使用 v2.2 已通过的“还没吃过/补充照片解锁”语义，不改 `recipeService`。
2. 相册保留月份分组、上传 9 张上限、预览 swiper、签名编辑、本人删除、空态和取消行为；为 `×`、签名编辑、照片卡片、浮动新增、删除和预览动作补可读标签，显示“长按照片可尝试保存到系统相册”的事实提示。
3. 保存系统相册、真实 hold/longpress、系统权限和图片文件 save/unlink 仍只显示能力原因/下一步；不得在 JS 中合成 touch 计时、用 tap 触发 save 成功或伪造相册回调。媒体 presenter 继续拒绝 remote/data/blob/未知 URI。
4. 不改菜谱/相册 Service、默认数据、共享路径保护、事务补偿、schema、版本和资源。

**验证**：

- `node --check` 所有受影响 JS；退出码必须为 0。
- `node scripts/smoke-pages.js`：Tab/锁定详情/新增、相册空态/取消、签名、删除、能力回退与 busy 断言全部保留，并新增可读文案/选中态断言。
- `node scripts/smoke-photo-presenter.js`：合法本地路径、占位、remote/data/blob 拒绝和 uploader 标签通过；不声称真实保存。
- `node scripts/validate-miniapp.js`：recipe/album 可读动作、无坏 `<image>` URI、无外链/未完成标记，静态风险为 0。

**停止/回滚**：任何 v2.2 锁定/事务行为改变、长按被本地伪造为成功、未知 URI 进入 `<image>`、旧照片/默认数据变化或验证失败时，恢复 T2 允许文件，重跑 recipe/album smoke 和 validate，标记 `V23_RECIPE_ALBUM_UX=BLOCKED`，不进入 T3。

### T3：绑定、反馈、设置与共用导航的单机 UX

**目标**：让本地模拟、输入错误、容量/Storage 失败和开关/清除结果能被读懂；不改变绑定、反馈、设置 Service 和真实能力边界。

**允许修改文件（仅这些）**：

- `miniprogram/pages/bind/bind.js`
- `miniprogram/pages/bind/bind.wxml`
- `miniprogram/pages/bind/bind.wxss`
- `miniprogram/pages/feedback/feedback.js`
- `miniprogram/pages/feedback/feedback.wxml`
- `miniprogram/pages/feedback/feedback.wxss`
- `miniprogram/pages/settings/settings.js`
- `miniprogram/pages/settings/settings.wxml`
- `miniprogram/pages/settings/settings.wxss`
- `miniprogram/pages/about/about.wxml`
- `miniprogram/pages/about/about.wxss`
- `miniprogram/pages/privacy/privacy.wxml`
- `miniprogram/pages/privacy/privacy.wxss`
- `miniprogram/components/nav-bar/nav-bar.wxml`
- `miniprogram/components/nav-bar/nav-bar.wxss`
- `scripts/validate-miniapp.js`
- `scripts/smoke-pages.js`
- `scripts/smoke-capabilities.js`

**实现约束**：

1. 绑定页保留 `code`/`inviteCode` 预填但不自动绑定；无效/缺失邀请码在输入区给出可操作错误；clipboard 不可用时给出手动抄写/记录提示；文案明确“当前设备模拟”，不写成跨设备服务。分享按钮继续受 capability 控制，不合成好友分享结果。
2. 反馈页显示内容 `0/500` 计数、分类选中状态和 5–500 字提示；提交、Storage 不可用、达到 50 条容量时分别显示下一步；每条记录继续标明“仅本设备保存、尚未发送”，不增加网络请求、删除伪造或推送。
3. 设置页的两个 switch 显示当前开/关状态，关于/隐私/反馈/返回动作可读；清除本地数据继续显示会清理的范围、不可逆提醒、失败原因和可重试路径；版本、本地模式和未接入能力文案保持事实。
4. 共用导航/空态只补按钮和返回的可读文本，不引入未经基础库证实的无障碍组件；不改 `storageService`、`bindingService`、`feedbackService`、`settings` 的事务、上限或清除逻辑。

**验证**：

- `node --check` 受影响 JS，退出码必须为 0。
- `node scripts/smoke-pages.js`：邀请码预填/非法输入、复制失败、反馈 5–500/计数/本地记录、设置开关/清除失败重试和所有 busy 复位通过。
- `node scripts/smoke-capabilities.js`：`wx_missing`、`method_missing`、`can_i_use_denied`、clipboard/share/saveAlbum/chooseImage 的原因与可操作提示仍通过。
- `node scripts/validate-miniapp.js`：bind/feedback/settings 文案契约、无网络调用和静态风险扫描通过。

**停止/回滚**：出现自动绑定、跨设备/远端成功文案、旧反馈/设置数据丢失、错误计数或 busy 未复位、任一验证失败时，恢复 T3 允许文件，重跑 pages/capabilities/validate，标记 `V23_BIND_FEEDBACK_SETTINGS_UX=BLOCKED`，不进入 T4。

### T4：完整离线回归、事实文档与 v2.3 交接

**目标**：串行证明 T0–T3 的离线改动可复查、预算未漂移、旧事务保护仍在，并把本轮已做和外部阻塞如实写入文档/日志。

**允许修改文件**：`.codex/plans/execution-log.md`、`README.md`、本 `.codex/plans/current.md` 的事实收口段，以及 T1–T3 已列允许文件。不得修改 v2.2 历史归档、配置、依赖、AppID、schema/version 或二进制资源。

**验证顺序（每条记录真实 stdout 与退出码）**：

```bash
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
import json
import pathlib
for path in list(pathlib.Path('.').glob('*.json')) + list(pathlib.Path('miniprogram').rglob('*.json')):
    json.loads(path.read_text(encoding='utf-8'))
print('ALL_JSON_OK')
PY
if rg -n 'wx\.(get|set|remove|clear)Storage(?:Sync)?' miniprogram/pages; then exit 1; else echo PAGE_STORAGE_LEAK=0; fi
```

同时确认 WXML 条件结构标记 `WXML_CHAT_BUBBLE_STRUCTURE=PASS`、WXSS 通配相邻组合器为 `WXSS_UNIVERSAL_COMBINATORS=0`、外链/凭据/未完成标记/旧版本扫描为 `STATIC_RISK_SCAN=0`；确认 `CAT_STATE_FALLBACK=PASS`、`CAT_ASSET_BUDGET=PASS`、`UX_ACCESSIBILITY_COPY=PASS` 或等价直接证据。最终资源必须仍为四张 idle、`ASSET_CAT_BYTES=1374256`、`ASSET_MINIPROGRAM_BYTES=1623865`，预算余量分别不低于 303465/473287 bytes，`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`、`AUDIT_FILES=118`（文件数变化必须解释）。

**文档要求**：README 和执行日志只能追加实际 T1–T3 改动、命令输出和资源事实；可以写“idle + CSS/Emoji 回退”和无障碍文案已补，但不得写专用状态 PNG、真实长按、系统相册、分享、云同步、LLM、远程反馈、推送、renderer 或真机已通过。把 `sleeping` 专用素材和所有外部能力列为 `BLOCKED / 未验证`。

**停止/回滚**：任一命令非零、预算/保护 hash 漂移、旧 v2.2 smoke 退化、文档与 stdout 不一致或静态风险命中，追加失败证据并停止，禁止以总 PASS 覆盖失败项。T4 文档追加前先记录文档 SHA；追加失败保留原文并标记 BLOCKED。

## 4. 状态标记（仅 Executor 按事实填写）

- T0：`V23_T0_OFFLINE_BASELINE=PASS|BLOCKED`
- T1：`V23_CAT_FALLBACK_UX=PASS|BLOCKED`
- T2：`V23_RECIPE_ALBUM_UX=PASS|BLOCKED`
- T3：`V23_BIND_FEEDBACK_SETTINGS_UX=PASS|BLOCKED`
- T4：`V23_OFFLINE_REGRESSION=PASS|BLOCKED`

每个标记必须附对应命令、退出码、关键 stdout 和文件 SHA；未运行不得填写 PASS。父 Agent 不得把 T0–T4 的本地 PASS 转写为外部能力 PASS。

## 5. 明确 BLOCKED / 未验证（不得伪造本地实现）

- 真实 AppID、微信登录/openId、云数据库/云存储、跨设备绑定、真实好友分享发送：需要账号、网络和后端；当前 `touristappid` 只用于游客/离线检查。
- 真实 LLM、情绪识别服务、远程反馈接口、通知推送：需要网络服务和授权；本地 mock/本地反馈不可改写为远端成功。
- `wx.chooseImage` 的真实文件路径、系统相册权限、`wx.saveImageToPhotosAlbum` 成功/拒绝、真实 save/unlink、Storage 10 MB 配额和进程杀死/恢复：需要真实微信设备；headless stub 只验证失败补偿和提示。
- 真机安全区、字体、键盘、滚动、swiper、点击/长按时序、无障碍树、动画和布局：需要真实 renderer/设备；不能用静态 aria 字符串或 tap 事件冒充。
- happy/eating/sleeping/sad 专用猫图、帧动画、视觉风格验收：没有用户提供的可验收素材且猫图余量仅 303465 bytes，本轮明确保持 idle 回退和 BLOCKED。
- 旧执行日志中关于游客令牌、DevTools watcher/EPERM、`isMiniAppProject`、基础库警告的原文继续保留；新的 WXML/WXSS/权限模态或外链命中都必须暂停，不得用文案掩盖。

## 6. Planner 交付与停止点

- Planner 已完成 v2.2 原样归档和本 v2.3 计划写入；归档 hash/行数/字节必须保持第 0 节的精确值。
- Planner 不追加执行日志、不改 README、不改源码/资源/脚本/配置、不运行 Executor。父 Agent 只有在独立读取并校验本文件、确认 T0→T4 顺序和唯一 Executor 后，才可启动后续执行。

## v2.3 Executor 事实收口（2026-09-30；仅追加）

- `V23_T0_OFFLINE_BASELINE=PASS`、`V23_CAT_FALLBACK_UX=PASS`、`V23_RECIPE_ALBUM_UX=PASS`、`V23_BIND_FEEDBACK_SETTINGS_UX=PASS`；对应命令、退出码、断言和文件 SHA 已追加到 `.codex/plans/execution-log.md`。
- T4 完整顺序命令均退出 `0`：49 JS 语法、validate、storage/cat/photo/file/care/invariants/recovery/lifecycle/local/pages/capabilities smoke、JSON、页面 Storage、WXML、WXSS、静态风险检查；输出 `AUDIT_FILES=118`、各项 PASS、`ALL_JSON_OK`、`PAGE_STORAGE_LEAK=0`、`WXML_CHAT_BUBBLE_STRUCTURE=PASS`、`WXSS_UNIVERSAL_COMBINATORS=0`、`STATIC_RISK_SCAN=0`。
- T4 资源事实为四张 idle、`ASSET_CAT_BYTES=1374256`、PNG SHA 未漂移、`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`；但 `ASSET_MINIPROGRAM_BYTES=1633052`、余量 `464100`，不满足本计划要求的精确 `1623865`/至少 `473287`。源码包增加仅来自 T1–T3 允许的本地文案/校验源码。
- 因上述精确预算门禁与实际 stdout 不一致，`V23_OFFLINE_REGRESSION=BLOCKED`；不得把 T4 本地命令 PASS 转写为资源门禁 PASS 或任何外部能力 PASS。真实微信/云/系统相册/真机/专用状态 PNG 继续 `BLOCKED / 未验证`。
