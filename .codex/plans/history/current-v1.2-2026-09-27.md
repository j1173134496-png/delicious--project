# Planner 计划：八条与你「产品完整度 v1.2」

## 1. 计划元信息与执行纪律

- 角色：Planner Agent。本阶段只检查项目、归档旧计划并写入新计划，没有修改业务源码。
- 生成日期：2026-09-27。
- 项目根目录：/Users/lnp/Documents/ChatGPT/delicious- project。
- v1.1 计划原样归档：.codex/plans/history/current-v1.1-2026-09-27.md。
- 当前执行计划：.codex/plans/current.md。
- Executor 必须在开始任何业务修改前完整读取本文件；任务只能按 T0 → T1 → T2 → T3 → T4 → T5 → T6 顺序执行，不能并行或跳过。
- Executor 每完成一个任务，必须先执行该任务列出的验证，再把“状态、实际修改文件、命令和实际输出、未验证项”追加到 .codex/plans/execution-log.md，然后才能进入下一个任务。
- 本阶段只做原生微信小程序、离线可完成、无第三方依赖的产品完整度工作；不接入真实 LLM、云开发、云存储、通知推送、开放平台账号、远程素材或微信开发者工具专属能力。
- 本地分享只负责携带邀请码进入绑定页；由于项目仍是单设备模拟，不能把分享或邀请码深链描述成跨设备真实绑定。
- Planner 发现计划文件、现有数据迁移或工程结构无法可靠处理时，应停止并报告，不得修改业务代码来掩盖问题。

## 2. 当前项目理解与现状证据

### 2.1 工程和上一阶段基线

- 工程是原生微信小程序，入口为 miniprogram/，四个 Tab 为八条、菜谱、相册、我的；没有 package.json、第三方依赖、Git 元数据或可用微信开发者工具。
- project.config.json 将基础库目标设为 3.4.3，AppID 为游客号；项目保持本地 Storage、文件系统适配器和 mock AI。
- v1.1 已完成 Storage v1.1（数值版本 2）迁移、媒体路径/占位回退、主要写操作 busy/error 保护、WXSS 静态兼容处理、TabBar PNG、离线审计和 Service smoke。
- 当前命令的实际基线均通过：
  - node scripts/validate-miniapp.js → AUDIT_FILES=99、ERRORS=0、WARNINGS=0。
  - node scripts/smoke-local.js → SMOKE_LOCAL=PASS、SCHEMA_VERSION=2、RECIPES=12。
  - find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check → 退出码 0。
  - 根目录与 miniprogram/**/*.json 解析 → ALL_JSON_OK。
- .codex/agents/planner.toml 与 .codex/agents/executor.toml 均不存在，本轮继续使用原生 Subagent 的 Planner → Executor 顺序。

### 2.2 PRD 中本阶段相关的可交付要求

来自 PRD-情侣小程序「八条与你」.md：

- 邀请码流程包含“生成 6 位邀请码、一键复制、分享小程序卡片、输入邀请码后绑定”。
- 绑定后应展示双方信息、在一起天数和纪念日；解除绑定需置于深层设置并防误操作。
- 个人主页需要展示八条当前形态/等级、喂养次数、聊天次数和距离下一个形态的进度；个人资料包含头像、昵称、性别、生日、签名和纪念日。
- 形态规则表明确写为：Lv.1 → Lv.2 需要喂养 30 次 + 聊天 50 次；Lv.2 → Lv.3 需要喂养 100 次 + 解锁 10 道菜；Lv.3 → Lv.4 需要纪念日 365 天。
- 设置项包含情绪关怀开关、通知设置、清除缓存、关于我们、隐私协议、意见反馈。
- 相册需要月份时间线、双方头像/天数/照片总数/可编辑签名；菜谱需要未解锁/已解锁/甜品区、详情、照片、评分、点赞、编辑/删除和先建菜名后补照片。
- Phase 5 要求交互打磨、边界处理和整体测试；本阶段将其落为可重复的本地流程验证。

### 2.3 已确认的产品缺口（不重复 v1.1 加固）

1. 邀请分享没有绑定深链。pages/profile/profile.js:20 和 pages/chat/chat.js:52 的 onShareAppMessage 都指向聊天页；pages/bind/bind.js 没有 onLoad(options) 或 onShareAppMessage，绑定页只有复制按钮，PRD 要求的“分享小程序卡片 + 打开后输入邀请码”没有入口。
2. 关于/隐私/反馈是弹窗占位。pages/settings/settings.js:9-15 统一调用 showModal；settings.wxml 的三个入口没有独立内容页，意见反馈不能填写、保存或手动带走反馈。
3. 成长规则与 PRD 表不一致。models/cat.js:5-9 仍把 Lv.2 → Lv.3 写成喂养 100 + 聊天 120，把 Lv.3 → Lv.4 写成喂养 100 + 聊天 200 + 纪念日 365；没有解锁菜品 10 道条件，且 Lv.4 额外要求喂养/聊天。此前 v1.1 的 smoke（scripts/smoke-local.js:88-90）也按旧规则断言。该差距应按 PRD 表修正，并保留已有合法等级、不做降级。
4. 成长进度信息过于粗。catService.getProgress() 只返回当前/下一级、百分比和旧的 feed/chat/纪念日字段；不能告诉用户下一级形态名称、解锁菜品进度或各条件剩余量。profile.wxml:24-31 只显示三个统计数字，缺少饱食度、今日喂养、纪念日日期和下一形态条件明细。
5. 形态元数据重复且可能漂移。cat-display.js、profile.js 和 models/cat.js 各自维护形态名称/Emoji；JK 形态在不同位置显示不同 Emoji，状态名称没有统一的共享元数据。
6. 设置、绑定和导航的可见反馈不完整。绑定页没有分享按钮或分享后预填；资料保存按钮没有把 saving 显示为 loading/disabled；多个 navigateTo 没有 fail 回调。绑定、解除、资料编辑、签名编辑、菜谱详情返回虽然有局部处理，但缺少端到端可重复验证。
7. 相册签名是 modal-only。album.js:32 只能依赖 wx.showModal({ editable: true })，不支持时无法编辑；相册未绑定时仍展示“在一起的第 1 天”，容易让用户误解为已建立情侣关系。
8. 菜谱/相册空状态与返回路径缺少统一审查。主要列表有 empty-state，但菜谱详情找不到记录没有返回动作；新增/编辑、补图、删除后页面返回依赖运行时回调，当前 smoke 只覆盖 Service，不覆盖页面方法和返回后刷新。
9. 验证和文档缺少页面级流程。当前 smoke-local.js 只覆盖 Service；validate-miniapp.js 不检查分享钩子、设置链接和新增页面；README 仍写 v1.1 且没有本地反馈、邀请深链和形态规则的说明。

### 2.4 已有能力和本阶段不再重做的内容

- Storage 的损坏修复、v1.1 schema 迁移、日期有效性、Lv.4 旧规则实现、媒体 hasImage 回退、文件清理等待、主要 busy/error/finally、TabBar 图标和 flex 布局审计均已有实现和离线证据。
- 本阶段不重新设计聊天 mock、相册真实文件系统、菜谱默认 12 道、情绪关怀去重或 v1.1 兼容样式，除非新功能的集成验证发现直接回归。

## 3. v1.2 目标和边界

### 3.1 目标

把当前 MVP 从“功能可用”推进到“产品入口和反馈完整”：

- 通过绑定页分享按钮和邀请码 query 完成可演示的分享 → 打开 → 预填 → 校验绑定链路。
- 将关于、隐私说明变成可滚动的本地内容页，将意见反馈变成可填写、可本地保存、可复制带走的流程，并纳入清除数据。
- 使八条形态规则和成长进度与 PRD 表一致，显示用户下一步要完成的条件，并在升级时给出可见反馈。
- 让个人主页展示完整的资料/纪念日/养成统计，统一形态名称、Emoji 和状态标签。
- 补齐绑定、解绑、资料编辑、相册签名、菜谱/相册新增与返回、缺失数据和空列表的可恢复交互。
- 增加无微信运行时也能执行的页面级 headless smoke、静态路由审计和 v1.2 文档。

### 3.2 明确不做

- 不接真实 LLM、情绪云分析、微信云开发、云存储、openId 登录、通知推送、支付、真实跨设备情侣同步或后台反馈接口。
- 分享路径只携带 6 位邀请码和必要的来源标记，不携带昵称、聊天、照片或原始情绪内容；页面必须明确“当前设备模拟”边界。
- 反馈记录只写入本地 Storage，可复制为文本供用户自行发送；不得伪装成已经发送给产品方。
- 不引入 Vant、MobX、npm 构建链、外部字体、远程图片/URL 或第三方测试库。
- 不替换真实猫咪/菜谱素材；继续使用 CSS/Emoji 占位，统一元数据和用户反馈即可。
- 不修改 PRD 原文来掩盖实现差距；README 只记录实现边界和验证结果。
- 没有微信开发者工具/真机时，不声称通过导入、布局、权限、分享面板、键盘、手势或文件系统运行时验证。

## 4. 严格执行顺序

### T0：固定 v1.2 离线基线和缺口证据

- 执行状态：已完成

目标：让 Executor 在修改前记录当前状态，并确认没有把 v1.1 工作重复算入本阶段。

允许修改：

- 仅追加 .codex/plans/execution-log.md 的 v1.2 T0 记录；不改业务代码。

实现/检查要点：

- 先完整读取本计划和 .codex/plans/history/current-v1.1-2026-09-27.md；Planner 已在覆盖旧 current.md 前用 cmp 验证归档，归档应保持 349 行、21321 字节、SHA-256 为 5ff0165f213223f4f53cce7f4311de5b05dfee665f5c539acc9006def91607f9。
- 运行当前基线命令，记录实际输出和退出码：node scripts/validate-miniapp.js、node scripts/smoke-local.js、全部 JS node --check、全部 JSON 解析。
- 用 rg 固定当前缺口的源码证据（onShareAppMessage、showModal、LEVEL_RULES、getProgress、设置入口、空状态和导航调用）。
- 检查计划涉及的页面、组件和 Service 都存在；如果基线命令失败且不是本阶段新增变更造成，先报告，不进入 T1。

验证命令：

    test -s .codex/plans/history/current-v1.1-2026-09-27.md
    test "$(wc -c < .codex/plans/history/current-v1.1-2026-09-27.md | tr -d ' ')" = "21321"
    test "$(sha256sum .codex/plans/history/current-v1.1-2026-09-27.md | cut -d ' ' -f1)" = "5ff0165f213223f4f53cce7f4311de5b05dfee665f5c539acc9006def91607f9"
    node scripts/validate-miniapp.js
    node scripts/smoke-local.js
    find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
    python3 - <<'PY'
    import json, pathlib
    for p in list(pathlib.Path('.').glob('*.json')) + list(pathlib.Path('miniprogram').rglob('*.json')):
        json.load(open(p, encoding='utf-8'))
    print('ALL_JSON_OK')
    PY

完成标准：

- 归档比对通过；基线输出与本节现状证据一致；T0 日志明确写出运行时未验证而不是把静态通过当作运行时通过。

### T1：按 PRD 校准八条规则、形态元数据和成长反馈

- 执行状态：已完成

目标：修复成长条件的产品差异，让页面能够解释“为什么还没有升级”。

涉及文件：

- miniprogram/models/cat.js
- miniprogram/services/catService.js
- miniprogram/services/recipeService.js（只在需要提供已解锁数量查询时修改）
- miniprogram/components/cat-display/cat-display.js
- miniprogram/pages/chat/chat.js、chat.wxml、必要的 chat.wxss
- scripts/smoke-local.js

实现要点：

- 将规则按 PRD 表解释为：
  - 当前 Lv.1 → Lv.2：feed >= 30 且 chat >= 50。
  - 当前 Lv.2 → Lv.3：feed >= 100 且已解锁菜品数 >= 10；不再额外要求聊天 120 次。
  - 当前 Lv.3 → Lv.4：在一起天数 >= 365；不再额外要求喂养 100/聊天 200。
- 已有 level 不降级。旧数据在保存/读取时保持当前合法等级；只有下一次升级按新规则判断。规则变更不能清空 feed/chat/菜谱数据。
- 以共享的形态元数据（可放在 models/cat.js 导出）提供 form key、中文名、Emoji/占位表现和可展示的状态文案；cat-display、profile 和 progress 不再各自硬编码另一份名称/Emoji。继续明确真实图片素材未接入。
- catService.maybeUpgrade 计算已解锁菜谱数时通过 Service 查询，不直接读页面 Storage；避免为读取进度产生重复默认数据或循环依赖。
- 扩展 getProgress() 返回可直接渲染的结构：当前/下一等级和形态名、percent、feed/chat 当前值与 need/remaining、已解锁菜谱数与 need/remaining、纪念日天数与 need/remaining/ready、complete。缺少某一条件时按 100% 取最小条件进度，Lv.4 返回 next: null 和完成状态。
- feed/recordChat 在发生升级时返回可识别的 transition（from、to、form、formName）；同步更新 chatService 和聊天页，保留已有调用方语义，不能让 chat 结果的 cat 变成未归一化对象。页面以 toast/banner/状态条之一提示“已升级为 XXX”，重复 onShow 不重复提示。
- 保持每日喂养 3 次、心情/饱食度和最近 20 条聊天规则不变。

逐项验证：

- node scripts/smoke-local.js（新增 Lv.1→2、Lv.2 缺菜品/满 10 道、Lv.3 缺纪念日/满 365 天、旧等级不降级、progress remaining 和 transition 断言）。
- node --check miniprogram/models/cat.js
- node --check miniprogram/services/catService.js
- node --check miniprogram/services/chatService.js
- node --check miniprogram/pages/chat/chat.js
- rg -n '30|50|100|120|200|365|unlocked|nextForm|transition' miniprogram/models/cat.js miniprogram/services/catService.js miniprogram/pages/chat miniprogram/components/cat-display

完成标准：

- 离线 smoke 能证明三段规则与 PRD 一致；不会因菜谱不足或纪念日不足错误升级。
- profile/chat/cat-display 显示同一套形态名和状态；升级动作产生一次可见、可复查的用户反馈。
- v1.1 合法数据和既有未升级用户仍可继续使用。

### T2：补齐邀请码分享入口和绑定深链

- 执行状态：已完成

目标：完成 PRD 的生成 → 分享 → 打开 → 预填 → 绑定演示链路，同时保留单设备限制说明。

涉及文件：

- miniprogram/pages/bind/bind.js、bind.wxml、bind.wxss
- miniprogram/pages/profile/profile.js、profile.wxml（必要时将未绑定时分享目标改为绑定页）
- miniprogram/services/userService.js（只在需要集中构造/归一化 share payload 时修改）
- scripts/smoke-local.js 或 T6 的 scripts/smoke-pages.js

实现要点：

- 绑定页实现 onLoad(options)：读取 options.code（兼容 inviteCode 别名），只接受当前 6 位邀请码格式，合法值自动填入输入框；非法值显示可恢复提示并允许手动输入。不要自动提交。
- 绑定页实现 onShareAppMessage，使用当前 getInviteCode() 返回标题和 /pages/bind/bind?code=<encoded-code> 路径；路径只含邀请码，不含用户资料或聊天内容。
- 在邀请码卡片增加原生 <button open-type="share">“分享给 Ta”入口，保留复制和重新生成；按钮文案和说明明确当前是本机模拟绑定。
- profile 的分享回调在未绑定时返回绑定页邀请码深链；已绑定时可继续分享聊天页。无论从右上角菜单还是按钮分享，都不能把邀请人信息写进 query。
- 绑定成功后保持在绑定页并刷新伴侣/天数/按钮状态，让用户可返回 profile；解除绑定继续二次确认，返回后 profile/album 的 onShow 能刷新为未绑定空状态。
- 分享 API 缺失或回调失败时，页面仍可复制邀请码；不把“分享成功”写入 Storage。

逐项验证：

- node --check miniprogram/pages/bind/bind.js
- node --check miniprogram/pages/profile/profile.js
- rg -n 'onShareAppMessage|open-type="share"|pages/bind/bind\\?code|inviteCode|onLoad' miniprogram/pages/bind miniprogram/pages/profile
- T6 的 headless page smoke：生成码 → share payload → onLoad 预填 → 非法/自绑定/已绑定 → 本地模拟绑定 → unbind → profile onShow。

完成标准：

- 绑定页和未绑定 profile 都有可触发的分享入口；分享路径携带 6 位 code，打开后只预填、不自动绑定。
- 所有失败/取消都可重试，复制仍是无分享能力环境的备用入口。
- 文档不会把本地模拟描述为跨设备同步。

### T3：把设置占位替换为本地内容页和可用反馈流程

- 执行状态：已完成

目标：完成 PRD 的关于、隐私和意见反馈，而不依赖网络或后台。

涉及文件：

- miniprogram/services/storageService.js（新增 feedback collection key；必要时将 schema 升至 v1.2/数值 3，保留 v1.1 数据）
- 新增 miniprogram/models/feedback.js
- 新增 miniprogram/services/feedbackService.js
- 新增 miniprogram/pages/about/about.{js,json,wxml,wxss}
- 新增 miniprogram/pages/privacy/privacy.{js,json,wxml,wxss}
- 新增 miniprogram/pages/feedback/feedback.{js,json,wxml,wxss}
- miniprogram/pages/settings/settings.js、settings.wxml、settings.wxss
- miniprogram/pages/profile/profile.js（关于入口改为本地页面）
- 根 sitemap.json、miniprogram/sitemap.json、miniprogram/app.json
- scripts/smoke-local.js

实现要点：

- Storage 新增 FEEDBACK collection，并进行幂等初始化/迁移；如果改为 schema 3/1.2，必须保留全部已有用户、猫咪、聊天、菜谱、照片、设置和邀请码字段，旧数据不能被清空。清除本地数据应同时清除反馈记录。
- feedbackService 只通过 storage service 读写，提供 list、submit、clear/清除所需接口；记录至少包含 id、category、content、contact（可选）、createdAt、status=saved_local。输入使用 safeText，内容长度和类别白名单在 Service 再校验一次。
- about 页面以滚动本地文本说明产品定位、四个模块、mock/本地模式、当前版本和限制，并提供返回设置/反馈入口。
- privacy 页面完整说明：文字数据存本地 Storage，图片路径在本地文件系统，情绪关怀只发泛化内容，关闭开关不生成，当前没有 LLM/云同步/主动推送，清除数据会清理受管记录/文件；不要写成法律上已审核的承诺。
- feedback 页面提供类别选择、内容（建议 5-500 字）和可选联系方式/备注，提交后显示“已记录在本设备，尚未发送到服务器”；显示最近本地记录或成功卡片，允许复制一条可手动发送的纯文本。复制/原生 API 不可用时仍保留已保存记录并给出提示。
- settings 三个入口改为 navigateTo 独立页；清除按钮 loading/disabled 与 v1.1 行为保持一致；版本文案更新到 v1.2。
- 追加页面路径时同步 app.json、两份 sitemap 和 usingComponents；页面返回使用现有 nav-bar，内容页不越过 Service 读 Storage。

逐项验证：

- node scripts/smoke-local.js（新增 feedback 提交、非法输入拒绝、清除后记录为空、schema 迁移保留旧数据断言）。
- node --check miniprogram/services/storageService.js
- node --check miniprogram/models/feedback.js
- node --check miniprogram/services/feedbackService.js
- node --check miniprogram/pages/settings/settings.js
- node --check miniprogram/pages/about/about.js
- node --check miniprogram/pages/privacy/privacy.js
- node --check miniprogram/pages/feedback/feedback.js
- python3 解析根目录、miniprogram 下全部 JSON 并检查新增页面四件套。
- rg -n 'showModal|feedback|privacy|about|FEEDBACK|saved_local' miniprogram/pages/settings miniprogram/pages/about miniprogram/pages/privacy miniprogram/pages/feedback miniprogram/services miniprogram/models

完成标准：

- 关于/隐私可从设置和 profile 进入、可返回，内容不是弹窗占位。
- 反馈可填写、验证、保存、回看和复制；用户知道它没有发送到服务器。
- 清除本地数据后反馈、用户、聊天、菜谱和照片元数据均恢复默认；旧 v1.1 数据保持有效。

### T4：补全个人主页、形态/状态和成长数据反馈

- 执行状态：已完成

目标：让 profile 页面完整表达 PRD 的资料、纪念日和养成总览，并与 T1 共享数据结构。

涉及文件：

- miniprogram/pages/profile/profile.js、profile.wxml、profile.wxss
- miniprogram/models/user.js（只在需要显示/归一化资料字段时修改）
- miniprogram/services/userService.js
- miniprogram/components/cat-display/cat-display.*（若 T1 未完全统一）
- 可能新增轻量 components/progress-detail，只在现有 WXML 难以保持清晰时才允许
- scripts/smoke-pages.js 或 scripts/smoke-local.js

实现要点：

- profile 读取 Service 的 user/couple/cat/progress，一次性设置页面数据；显示头像、昵称、性别/生日（未设置时给明确占位）、个性签名、纪念日日期和绑定/未绑定状态。未绑定时不要把默认“今天”渲染成已经在一起的第 1 天，给出“先绑定/设置纪念日”的动作提示。
- 成长卡显示当前 Lv、共享形态名称/Emoji、累计喂养、累计聊天、心情、饱食度、今日喂养进度；显示下一形态名称和每个条件的当前/目标/剩余量，包括解锁菜品和纪念日条件。
- 进度百分比和文字必须来自 catService.getProgress()，WXML 不自行重算；Lv.4 显示“已完成全部形态”，没有负数剩余。
- currentForm、状态（idle/happy/eating/sad）和用户反馈文案统一来自共享元数据/Service；猫咪继续使用 CSS/Emoji 占位，不宣称有真实 3D/图片素材。
- profile 的关于入口进入 T3 about 页；绑定、设置、编辑入口保留，onShow 从 Service 刷新，避免返回后显示旧用户/伴侣/猫咪数据。
- 对形态变化、绑定状态和纪念日非法输入提供短 toast/状态文案；不重复弹出同一升级提示。

逐项验证：

- node --check miniprogram/pages/profile/profile.js
- rg -n 'feedCount|chatCount|mood|hunger|todayFeedCount|anniversary|nextForm|recipe|形态|进度' miniprogram/pages/profile miniprogram/components/cat-display
- T6 headless page smoke：profile loadData 的 setData 结果包含绑定状态、纪念日、当前/下一形态及统计；旧/新等级样本渲染数据没有 undefined/负数。
- node scripts/smoke-local.js

完成标准：

- 不绑定、已绑定、Lv.1、Lv.2、Lv.3、Lv.4 样本都能显示可理解的状态和下一步；数据回到 profile 后刷新。
- PRD 要求的个人资料、纪念日和养成统计在同一页面可见；形态文案不会在组件/页面之间漂移。

### T5：补齐页面返回、签名编辑、空状态和失败反馈

- 执行状态：已完成

目标：把主要用户流程串成可恢复的页面级闭环，减少“保存成功但列表未刷新”或“空页无出口”。

涉及文件：

- miniprogram/pages/profile-edit/profile-edit.js、profile-edit.wxml
- miniprogram/pages/bind/bind.js、bind.wxml
- miniprogram/pages/album/album.js、album.wxml、album.wxss
- miniprogram/pages/album-upload/album-upload.js、album-upload.wxml
- miniprogram/pages/recipe/recipe.js、recipe.wxml
- miniprogram/pages/recipe-detail/recipe-detail.js、recipe-detail.wxml
- miniprogram/pages/recipe-add/recipe-add.js、recipe-add.wxml
- miniprogram/components/empty-state/*、components/nav-bar/*（必要时）
- 相关 WXSS
- scripts/smoke-pages.js

实现要点：

- 资料编辑：保存按钮绑定 saving 的 loading/disabled；无效日期/空昵称时保留用户输入、保持页面可继续编辑；保存成功后返回，profile onShow 重新读取 Service。
- 绑定/解绑：T2 的 query 预填、分享和状态刷新保持；成功/失败/取消均恢复按钮状态；返回 profile 后头像、昵称、天数和“邀请/管理绑定”文案同步。
- 相册签名：将 modal-only 改为页面内可用的编辑状态（draft + 保存/取消），或在保留 modal 快捷入口时提供同等的输入回退；保存后相册标题立即更新、返回/再次 onShow 不丢失。未绑定空相册显示邀请/上传路径，不误导“第 1 天”。
- 相册上传/预览：无照片、取消选择、日期/描述非法、保存部分失败均有可见提示；成功返回后列表、月份分组、总数和签名只出现一次；预览关闭/删除后不引用旧照片。
- 菜谱：未解锁/已解锁/甜品区空状态均有正确文案和添加动作；详情找不到记录提供返回/回到图鉴动作；新增、编辑、补图、评分、点赞、删除后返回路径和列表 onShow 明确；保存/删除/补图按钮显示 busy 并可重试。
- 页面 navigateTo、navigateBack、剪贴板、Modal、图片选择/保存的 fail/异常路径都给出短提示；不在失败时清空表单或伪造成功。
- 不重新引入 flex gap、grid、远程资源或页面直接 Storage 访问。

逐项验证：

- find miniprogram/pages miniprogram/components -name '*.js' -print0 | xargs -0 -n1 node --check
- rg -n 'loading=|disabled=|fail:|finally|empty-state|navigateBack|navigateTo|editingSignature|draft' miniprogram/pages miniprogram/components
- rg -n 'wx\\.(get|set|remove)Storage' miniprogram/pages || true
- node scripts/smoke-local.js
- T6 headless page smoke：资料保存/返回、绑定成功/解绑、签名保存、菜谱缺失页、相册空状态和保存后刷新。

完成标准：

- 主要表单和写操作不会因快速点击、取消或原生能力缺失而卡住；失败后可以重试。
- 每个新增/编辑/删除流程都有可回到上级页的出口；空数据页有正确动作或返回路径。
- 页面数据只通过 Service 刷新，绑定/资料/签名/菜谱/相册返回后不会重复或丢失。

### T6：页面级 headless smoke、静态审计、文档和最终验收

- 执行状态：已完成

目标：建立无需微信运行时即可反复复查的 UI/业务流程证据，并交付一致文档。

涉及文件：

- 新增 scripts/smoke-pages.js
- scripts/smoke-local.js
- scripts/validate-miniapp.js
- README.md
- .codex/plans/execution-log.md
- 必要时仅修复前述任务中由验证发现的直接问题，不扩大产品范围

实现要点：

- smoke-pages.js 只使用 Node 内置 assert、vm/require 和内存 wx stub，不依赖微信 SDK、网络或 npm。为 Page、setData、wx.navigateTo/navigateBack/setClipboardData/showModal/showToast/chooseImage/saveImageToPhotosAlbum 提供可控记录器，按页面实例调用方法。
- 至少覆盖以下流程：
  1. profile 未绑定分享 → payload 路径包含 6 位 code 和 bind 页；bind onLoad({ code }) 预填；非法 code 不自动提交；合法 code 可调用 bind；unbind 后 profile/album 状态刷新。
  2. settings 三个入口记录到 about/privacy/feedback 页面；about/privacy 有返回配置；feedback 空内容/过短内容被拒绝，合法内容保存到 Service 并可复制，clearLocalData 后记录为空。
  3. profile loadData 的统计/形态/纪念日字段完整；Lv.2 缺 10 道菜、Lv.3 缺 365 天时 progress 仍可解释；升级 transition 只提示一次。
  4. profile-edit、album signature、recipe add/detail、album upload 的成功/取消/失败路径不重复写入，返回后重新 load 的数据与 Service 一致；缺失 recipe/空 album 提供动作或返回记录。
- validate-miniapp.js 增加静态检查：app/sitemap 的所有页面四件套、新增 usingComponents、设置链接目标、绑定页 onShareAppMessage/share button、分享路径不含外部 URL、feedback key/Service 存在；保留 v1.1 的路径、PNG、Storage 越层、凭据/TODO/远程资源和 WXSS 审计。
- smoke-local.js 保持 Service smoke 单独可运行，补充 v1.2 schema/feedback、成长规则、升级 transition、邀请码深链所需的纯函数断言；不把页面 stub 结果混入 Service smoke。
- README 更新 v1.2 功能、规则和本地边界，说明分享只携带邀请码、反馈只在本地保存/可复制、schema 版本、页面级 smoke 命令和微信运行时仍未验证。
- 执行完整命令并把每项实际输出追加到 execution-log；日志必须列出环境阻塞（缺少微信开发者工具/真机）而不是写“运行时通过”。

逐项验证：

    find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
    node scripts/validate-miniapp.js
    node scripts/smoke-local.js
    node scripts/smoke-pages.js
    python3 - <<'PY'
    import json, pathlib
    for p in list(pathlib.Path('.').glob('*.json')) + list(pathlib.Path('miniprogram').rglob('*.json')):
        json.load(open(p, encoding='utf-8'))
    print('ALL_JSON_OK')
    PY
    rg -n 'wx\\.(get|set|remove)Storage' miniprogram/pages || true
    rg -n 'api[_-]?key|secret|sk-[A-Za-z0-9]|TODO|FIXME|https?://' miniprogram README.md scripts || true
    test -s .codex/plans/history/current-v1.1-2026-09-27.md
    sha256sum .codex/plans/history/current-v1.1-2026-09-27.md

完成标准：

- smoke-local.js、smoke-pages.js、静态审计、JS/JSON 检查均可在无 wx、无网络、无 npm 的环境退出码 0。
- 设置、反馈、分享、形态规则、profile 统计、返回/空状态都有可定位断言；所有失败项有明确文件/原因。
- README、current.md、execution-log.md 的版本和范围一致；没有把 headless 或离线结果描述为微信运行时通过。

## 5. v1.2 最终验收标准

1. 计划与执行纪律：v1.1 旧计划与归档字节一致；T0～T6 每项有实际验证和日志记录；未并行执行。
2. 分享/绑定：绑定页有“分享给 Ta”按钮和 onShareAppMessage；路径包含 6 位 code；打开绑定页能预填且不自动绑定；非法、自绑、已绑定和解绑都有可见、可重试反馈；本机模拟限制清楚。
3. 设置内容：关于、隐私为独立可返回本地页面，内容说明真实本地/隐私边界；意见反馈可填写、校验、本地保存、查看/复制，明确尚未发送服务器；清除数据清理反馈。
4. 成长规则：Lv.1→2、Lv.2→3（喂养 100 + 解锁 10 道菜）、Lv.3→4（纪念日 365 天）与 PRD 一致；旧合法等级不降级；形态名称/Emoji/状态共享；升级有一次可见反馈。
5. 个人主页：资料、绑定/纪念日、当前形态/等级、喂养/聊天/心情/饱食度/今日喂养、下一形态各条件进度均可见；未绑定不会显示误导性的“在一起第 1 天”；返回后数据刷新。
6. 流程与空状态：资料编辑、绑定/解绑、相册签名、相册上传/预览、菜谱新增/编辑/补图/删除、设置内容页均有成功/失败/取消和返回出口；缺失记录/空列表有动作或返回。
7. 验证与边界：页面级 headless smoke 和 Service smoke 可重复；静态审计无 error/warning（若新增明确兼容警告，必须写入 README 和日志）；无页面 Storage 越层、敏感凭据、远程资源或未经授权 API。
8. 运行时声明：没有微信开发者工具/真机时，README 与日志明确标记导入、分享面板、布局、权限、键盘、手势、文件系统为未验证，不把离线结果冒充运行时通过。

## 6. 风险、决策和暂停条件

### 风险与应对

- PRD 形态规则与 v1.1 现状冲突：本计划以 PRD 形态表为 v1.2 目标；保留已有 level，不做降级。如果产品方要求继续使用 v1.1 的额外聊天/喂养条件，应在 T1 开始前明确修改计划，不能隐式混用。
- 本机分享的能力边界：没有云端或真实多设备身份时，分享只能演示 query 预填；不能验证另一设备真的绑定。页面和 README 必须把限制说清。
- Storage schema 变更：新增 feedback collection 若升为 schema 3，迁移必须保留旧数据；迁移断言失败立即停止，不得清空。
- 微信原生 API 缺失/权限拒绝：页面提供复制/Modal/文件选择的降级和重试；headless smoke 只能证明业务分支，不证明系统权限。
- WXML/基础库差异：继续使用原生 flex、现有安全区回退和组件写法；发现新布局语法无法静态确认时，优先降级到已有兼容表达式。
- 本地反馈隐私：反馈可能包含用户主动输入的个人信息，清除流程必须包含 feedback collection，Privacy 页面不能承诺后端删除或发送。

### 必须暂停并报告

- 当前计划或 v1.1 归档无法读取，或归档 cmp 失败。
- T0 基线出现与已知 v1.1 结果不一致的结构性错误，且不能确定由本轮前置状态造成。
- 形态规则是否按 PRD 表执行出现未授权的核心产品决策冲突。
- Storage schema 迁移无法在保留合法用户、猫咪、菜谱、照片、聊天和设置数据的前提下完成。
- 需要真实微信分享、AppID、云开发、外部反馈 API、远程素材或第三方依赖才能满足某个验收项。
- 页面级 headless smoke 需要把微信运行时对象当作真实行为、或无法在 Node 内稳定断言成功/失败路径。
- 任一任务发现会阻止后续页面/Service 解析的 JS/JSON/WXML 错误，且当前工作区无法修复。

## 7. Planner 交付检查

- [x] 已读取 PRD、README、v1.1 current.md、v1.1 execution-log、app/project/sitemap 配置、全部相关 Service/模型/页面/组件和脚本。
- [x] 已运行当前离线基线并记录真实输出：AUDIT_FILES=99、ERRORS=0、WARNINGS=0、SMOKE_LOCAL=PASS、SCHEMA_VERSION=2、RECIPES=12、ALL_JSON_OK。
- [x] 已将旧 current.md 原样复制到 .codex/plans/history/current-v1.1-2026-09-27.md，并使用 cmp 确认字节一致（349 行、21321 字节）。
- [x] 已识别分享深链、设置占位、成长规则、profile 数据、形态元数据、页面返回/空状态和页面级 smoke 缺口。
- [x] 已按 T0→T6 给出严格顺序、涉及文件、逐项验证、完成标准、风险和暂停条件。
- [x] 新计划写入 .codex/plans/current.md；Planner 未修改业务源码。
