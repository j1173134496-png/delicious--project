# 八条与你 · 原生微信小程序 v1.4

这是一个离线优先的原生微信小程序 MVP，项目代号 `batiao-love`。入口目录是 `miniprogram/`，根目录配置是 `project.config.json`，目标基础库为 `3.4.3`。

## 导入与本地运行

1. 打开微信开发者工具，选择“导入项目”。
2. 选择本项目根目录，确认使用根目录的 `project.config.json`；其中 `miniprogramRoot` 已指向 `miniprogram/`。
3. AppID 使用 `touristappid`，它只用于本地游客模式和离线检查，不代表已配置真实账号、登录或云环境。
4. 以目标基础库 `3.4.3` 编译，依次检查八条、菜谱、相册、我的四个 Tab。
5. 导入后按文末的运行时检查表逐项记录；Node 验收通过不等于微信 renderer 已通过。

## v1.4 产品闭环

- **八条**：四级透明 PNG 形态素材（缺图时回退 Emoji）、每日最多喂养 3 次、点击/长按抚摸反馈（同一手势只记一次）、经验值进度、mock 聊天和泛化情绪关怀。
- **成长规则**：Lv.1→Lv.2 需要喂养 30 次和聊天 50 次；Lv.2→Lv.3 需要喂养 100 次和解锁 10 道菜；Lv.3→Lv.4 需要在一起 365 天。合法旧等级不会降级，个人主页展示当前值、目标值和剩余量。
- **菜谱图鉴**：湘菜/甜品默认数据，未解锁/已解锁/甜品区，新增、补图、评分、点赞、删除和缺失页返回。
- **相册**：按 `YYYY-MM` 分组，最多 9 张批量上传、描述/标签、大图浏览、长按保存、本人删除和页面内签名编辑；未绑定时不会显示“在一起的第 1 天”。
- **我的与绑定**：资料、性别、生日、签名、纪念日、成长统计、绑定状态和设置。邀请码支持生成、复制、分享按钮和 `code`/`inviteCode` 深链预填；打开链接只预填，不自动绑定。
- **设置内容**：关于和隐私是可滚动的本地页面；意见反馈支持类别、5–500 字内容、可选联系方式、本地记录和复制。反馈状态明确为“仅保存在本设备，尚未发送到服务器”。

## 本地数据、迁移与边界

文字数据通过 `miniprogram/services/storageService.js` 访问本地 Storage，业务页不直接调用 `wx.*Storage*`。应用版本为 `1.4.0`，数据 schema 仍为 `1.3`（数值版本 `4`）；应用升级不等于 schema 5。首次初始化会把旧集合归一化并保留合法用户内容：缺少 ID 的记录生成稳定 ID；同一 ID 的重复项保留字段更完整、时间更新的一项；明显损坏项才会丢弃。初始化结果提供 `repaired`、`deduped`、`dropped`、`failed` 计数，第二次初始化应保持幂等。

图片由同一 Service 的文件系统适配器保存和删除。删除前会检查 recipe、photo、avatar 的共享引用，仍被引用的受管文件不会被 unlink；远程、data/blob、未知 URI、Emoji、临时和不可管理路径不会被当作本地文件清除。迁移会保留这些路径的 metadata 供诊断和删除，但 presenter 会统一显示占位，且不会把它们交给 `<image>` 或系统相册。Storage 或文件失败会返回可诊断错误，页面展示下一步而不留下成功 metadata。

情绪关怀事件写入带有稳定 `eventId`、规范化 tag 和写入时间，同一 tag 在 24 小时内只提醒一次。事件先以待发送状态记录，消息保存失败会回滚事件并返回 `care_message_write_failed`；事件清理/写入失败会返回 `care_event_cleanup_failed` 或 `care_event_write_failed`，页面不会显示已送达。关怀文案只使用泛化模板，不包含用户原始吐槽、openId 或邀请码。

Storage 写入先尝试原生 `wx.setStorageSync`，成功后才提交内存镜像；失败返回 `storage_write_failed` 或 `storage_quota`，旧值保持可读。`removeChecked`/`clearChecked` 对删除失败返回 `storage_remove_failed` 和 `failedKeys`；本地数据清除同时报告 `failedFiles`，只有 Storage 与文件都完成才会报告成功，方便用户重试。

本地模式上限为：聊天 20 条、关怀事件 50 条、反馈 50 条、单批/单菜谱照片 9 张、相册 500 张、菜谱 200 条。超过上限时保留已有记录并提示清理，不静默截断输入。

当前不接入真实 LLM、云开发、云存储、openId 登录、远程反馈接口、通知推送或第三方依赖。情侣绑定和邀请分享是单设备模拟；分享路径只携带 6 位邀请码和页面来源，不能描述为跨设备同步。反馈记录只写入本地，复制后由用户自行发送，不会伪装成已提交给产品方。

## 素材预算与状态回退

`miniprogram/assets/batiao/` 当前交付四张形态 `idle.png`。每张主图限制为不超过 450 KiB、长边不超过 640 px、RGBA；四张合计预算为 1.6 MiB，小程序源文件非空总量预算为 2 MiB。`scripts/audit-assets.js` 会列出每张 PNG 的尺寸、透明度、SHA-256、引用关系和预算结果，并以非零退出码阻止超限交付。

形态和状态统一由 `miniprogram/models/cat.js` 的 `FORM_META`、`CAT_STATES`、`getFormAsset()` 提供。当前只有 idle 素材；happy、eating、sad 在缺少专用图时回退到同形态 idle 图，再叠加状态 CSS 和 Emoji。`cat-display` 与个人主页均监听图片失败并替换占位，不能在文档中把缺失的专用状态图写成已交付。

## 能力降级与用户反馈

`runtimeCapabilities.js` 在无 wx 或能力被拒绝时返回可复查的能力快照。游客模式保留文字、Emoji、邀请码手动抄写和小程序内预览；分享、选图、系统相册、剪贴板等能力不可用时显示原因和可继续的操作。取消选择显示“已取消选择”，权限拒绝提示到设置页处理，空间不足提示清理旧记录，文件或记录失败提示保存状态和重试路径。所有 busy 标志在成功、失败、抛错和 finally 后复位，重复点击不会重复写入。

快照保留每项能力的布尔值，并在 `details`/`reasons` 中区分 `wx_missing`、`method_missing`、`can_i_use_denied` 和固定策略禁用。应用初始化按 Storage、用户、猫、菜谱、聊天、相册阶段运行；失败首屏显示阶段和可重试按钮，重试不会清空已有合法数据。页面定时器和异步回调由 `pageTask` 在隐藏/卸载时取消或失效，服务层文件/Storage 回滚仍会完成。

分享按钮的 `button.open-type.share` 与 `showShareMenu` 是两项独立能力：前者可用时按钮不会因后者缺失而被禁用，快照分别记录 `share`/`shareMenu` 的布尔值、`reason` 和 `details`。游客模式只在真实工具允许时展示原生分享，不能把 headless `canIUse` 结果写成分享面板或权限成功。

`miniprogram/utils/appMeta.js` 是用户可见版本和本机游客模式的单一来源；关于页、设置页、App 全局状态和本 README 均显示应用 `1.4.0`。真实 LLM、云同步、远程反馈和主动推送继续明确为未接入。

## 可重复的离线验收

在项目根目录执行以下命令，不需要 npm、网络、API 密钥或微信运行时：

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
import json, pathlib
for p in list(pathlib.Path('.').glob('*.json')) + list(pathlib.Path('miniprogram').rglob('*.json')):
    json.load(open(p, encoding='utf-8'))
print('ALL_JSON_OK')
PY
if rg -n 'wx\.(get|set|remove|clear)Storage(?:Sync)?' miniprogram/pages; then exit 1; else echo PAGE_STORAGE_LEAK=0; fi
# The release log also runs the external-resource, credential-marker and unfinished-marker scan.
```

成功结果应包含 `ASSET_ERRORS=0`、`ASSET_WARNINGS=0`、`AUDIT_FILES=...`、`ERRORS=0`、`WARNINGS=0`、`SMOKE_CAT_INTERACTION=PASS`、`SMOKE_PHOTO_PRESENTER=PASS`、`SMOKE_FILE_CLEANUP=PASS`、`SMOKE_CARE_ATOMIC=PASS`、`SMOKE_STORAGE_ATOMIC=PASS`、`SMOKE_INVARIANTS=PASS`、`SMOKE_RECOVERY=PASS`、`SMOKE_LIFECYCLE=PASS`、`SMOKE_LOCAL=PASS`、`SMOKE_PAGES=PASS`、`SMOKE_CAPABILITIES=PASS`、`ALL_JSON_OK`、`PAGE_STORAGE_LEAK=0` 和 `STATIC_RISK_SCAN=0`。验证日志保存在 `.codex/plans/execution-log.md`，文件数、资源 bytes 和断言数以本次命令真实输出为准。

`validate-miniapp.js` 汇总根目录导入配置、页面/组件四件套、TabBar PNG、资源预算、四形态/四状态映射、图片 fallback、应用版本/数据 schema、Service checked 写入/清除、启动 retry、能力原因、生命周期和页面 Storage 越层检查。`smoke-storage-atomic.js` 覆盖原生写/删/清除失败与旧值回滚；`smoke-invariants.js` 覆盖坏输入、迁移诊断、重复 ID 和幂等；`smoke-recovery.js` 覆盖分阶段失败/重试；`smoke-lifecycle.js` 覆盖隐藏/卸载后 timer、异步文件操作、导航和 busy；`smoke-local.js` 覆盖迁移、成长、上限、关怀、菜谱、相册、反馈和清除；`smoke-pages.js` 用内存 wx stub 覆盖应用版本/模式文案、分享预填、绑定/解绑、设置路由、反馈保存/复制、失败文案、busy 复位、profile 统计、升级提示、资料保存、签名、菜谱缺失页和相册上传回滚。

## 微信开发者工具与真机检查表

### 登录后的运行时交接表

用户完成微信登录后，重新导入项目并按表格逐项保存截图与控制台日志；每项都要标记工具版本、AppID、基础库和实际路径。当前所有项目均为 **BLOCKED / 未验证**，本地 smoke 不替代这些证据。

| 项目 | 需要记录的真实证据 |
| --- | --- |
| 导入/编译与四 Tab 首屏 | 项目设置、编译面板、`pages/chat/chat`、菜谱、相册、我的首屏截图 |
| 分享能力 | 绑定页/个人页按钮、分享面板、邀请码深链回填和取消/禁用提示 |
| 权限与文件 | 选图、保存到相册、权限拒绝与设置跳转、图片加载失败、unlink 重试 |
| 布局与输入 | 不同机型安全区、字体、键盘/输入法、滚动、swiper、长按和重复点击 |
| Storage 与生命周期 | quota、进程中断、页面隐藏/重显、文件和 metadata 最终状态 |

v1.7 已再次使用微信开发者工具 Stable 2.02.2608070 打开项目 `batiao-love`（AppID `touristappid`）。开发者工具账号界面显示“热心人士”，但 `touristappid` 仍按游客能力和工具限制处理；以下项目保持 **BLOCKED / 未验证**：

- 当前原路径 `/Users/lnp/Documents/ChatGPT/delicious- project` 的模拟器可以显示标题“八条与你”和四个 Tab，页面路径依次取得 `pages/chat/chat`、`pages/recipe/recipe`、`pages/album/album`、`pages/profile/profile`。Console 的 WXSS 通配相邻选择器错误已按基础库 3.4.3 的精确错误做显式选择器修复。
- 修复后首个业务编译错误为 `components/chat-bubble/chat-bubble.wxml` 的 `wx:else` 缺少同级 `wx:if`，并伴随 `__route__ is not defined`；这会覆盖模拟器内容，不能写成 renderer 通过。
- 工具仍弹出“没有权限访问 /Users/lnp/Documents/ChatGPT/delicious- project，请确保在系统偏好设置 - 安全与隐私中授予了微信开发者工具该文件夹的访问权限”，日志记录 `EPERM: operation not permitted, watch '/Users/lnp/Documents/ChatGPT'`。用户需在 macOS 系统设置中授予该文件夹访问权限后，才能继续验证原路径。
- 无空格临时副本 `/tmp/batiao-love-devtools-20260928-150135` 与源项目 156 个文件逐字节一致，但导入页因 `touristappid` 返回“系统错误，错误码：1”而未能启动；副本结果不等于原路径权限已修复。
- 早期游客令牌失效日志 `INVALID_LOGIN, access_token expired [touristappid]`、`isMiniAppProject=false`、`Loading project all files...` 仍作为历史证据保留。它们与当前 WXSS/WXML、权限和工具接口问题均不能单独证明编译或 renderer 成功。

v1.8 已完成 `miniprogram/components/chat-bubble/chat-bubble.wxml` 的最小条件修复：用户头像改为与猫头像同级的负条件 `wx:if`，保留聊天气泡、内容、时间和 CSS 类顺序。修复后清空 Console 并重新编译，原路径新鲜截图/Debugger 未再出现 WXML、WXSS 或 `__route__` 错误；原路径的 macOS 文件夹权限、`EPERM` watcher、`isMiniAppProject=false` 和 `touristappid` 工具边界仍需外部处理。

本轮使用 `/private/tmp/batiao-love-devtools-v18-uMFvhB` 做字节一致诊断副本。开发者工具创建副本时把副本 AppID 改为生成值 `wxec20aaa84bd3fa42`，因此副本四 Tab 的无错误首屏只作为隔离证据，不能代表原路径或 `touristappid` 的分享、权限、文件、Storage、键盘和手势已通过。完整离线验收仍以 `README` 中的命令和 `.codex/plans/execution-log.md` 为准。

- 根目录导入、编译、基础库兼容和四个 Tab 首屏；
- 分享面板、右上角菜单、游客 AppID 的能力提示和邀请码回填；
- 不同机型的布局、安全区、字体、键盘/输入法和滚动；
- swiper、长按删除、返回/导航失败和重复点击；
- 系统相册/文件权限、图片加载失败、文件保存、unlink 和进程中断后的真实生命周期；
- 透明 PNG 缩放、CSS 状态动画和真实 Storage quota。

Node smoke、静态审计和 headless wx stub 只证明离线代码分支可复查，不能写成微信 renderer、分享、权限、布局或真机文件生命周期已经通过。

## 可替换接口

- mock LLM：`miniprogram/utils/aiChat.js`
- mock 情绪检测：`miniprogram/utils/emotionDetector.js`
- 猫咪形态/状态元数据：`miniprogram/models/cat.js`
- 反馈模型与 Service：`miniprogram/models/feedback.js`、`miniprogram/services/feedbackService.js`
- 猫咪素材目录：`miniprogram/assets/batiao/`
- 默认菜谱数据：`miniprogram/models/recipe.js`

各 Service 保留 `coupleId`、`uploadedBy` 等字段，后续可以替换实现，但本版本不会假设云端身份或后台服务存在。

## v2.3 Executor 离线交接（2026-09-30）

本轮按 `.codex/plans/current.md` 串行完成 T0→T3，并执行 T4 完整离线回归。T0 基线、猫咪 idle 回退/Emoji 占位与资源门禁、菜谱/相册占位和操作文案、绑定/反馈/设置/导航单机 UX 均已记录为 PASS；改动只涉及允许的本地页面文案、可读状态和离线校验脚本。四张猫咪素材继续使用 idle 图，happy/eating/sad 缺少专用图时回退到同形态 idle；`sleeping` 专用素材、真实长按、系统相册保存、真实分享、跨设备绑定、云同步、LLM、远程反馈、推送、renderer 和真机均为 **BLOCKED / 未验证**。

- `V23_T0_OFFLINE_BASELINE=PASS`、`V23_CAT_FALLBACK_UX=PASS`、`V23_RECIPE_ALBUM_UX=PASS`、`V23_BIND_FEEDBACK_SETTINGS_UX=PASS`。
- T3 后资源审计真实输出：`ASSET_CAT_COUNT=4`、`ASSET_CAT_BYTES=1374256`、`ASSET_MINIPROGRAM_BYTES=1633052`、`ASSET_CAT_REMAINING_BYTES=303465`、`ASSET_MINIPROGRAM_REMAINING_BYTES=464100`、`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`；PNG 数量与 SHA-256 未漂移。源码包字节增加来自本轮允许的本地文案/校验源码，未新增、复制、压缩或替换二进制资源。
- T4 顺序命令全部退出 `0`：49 个 JavaScript `node --check`；`validate-miniapp.js` 输出 `CAT_STATE_FALLBACK=PASS`、`CAT_ASSET_BUDGET=PASS`、`UX_ACCESSIBILITY_COPY=PASS`、`RECIPE_ALBUM_UX_COPY=PASS`、`BIND_FEEDBACK_SETTINGS_UX=PASS`、`AUDIT_FILES=118`、`ERRORS=0`、`WARNINGS=0`；storage/cat/photo/file/care/invariants/recovery/lifecycle/local/pages/capabilities smoke 全部 PASS（pages `97`、capabilities `22`）；`ALL_JSON_OK`、`PAGE_STORAGE_LEAK=0`、`WXML_CHAT_BUBBLE_STRUCTURE=PASS`、`WXSS_UNIVERSAL_COMBINATORS=0`、`STATIC_RISK_SCAN=0`。
- `V23_OFFLINE_REGRESSION=BLOCKED`：计划 T4 的精确门禁要求 `ASSET_MINIPROGRAM_BYTES=1623865` 且余量至少 `473287` bytes；实际为 `1633052`/`464100`。该差异已按事实记录，不能以总 PASS 覆盖。

配置、AppID `touristappid`、基础库目标、schema/version、Service 事务、v2.2 历史归档和所有外部能力边界保持不变；完整命令、逐文件 SHA 与阻塞证据见 `.codex/plans/execution-log.md`。

## v1.9 源路径现场复核（2026-09-29）

已在用户授权后的源路径 `/Users/lnp/Documents/ChatGPT/delicious- project` 使用微信开发者工具 Stable `2.02.2608070`、基础库 `3.4.3`、AppID `touristappid` 完成 T0→T4 顺序复核。清空 Console 后普通编译的源项目门槛通过：`T19_SOURCE_PERMISSION=PASS`、`T19_COMPILE_GATE=PASS`；新鲜 AX/日志未出现 WXML/WXSS/`__route__` 编译错误或授权后的 watcher `EPERM`。工具的 `isMiniAppProject=false`、游客 API/系统错误码、`/__getprojectoriginfile__` `403 ua-token-missing` 与 `timingData not found` 仍按工具边界保留，不能解释为云端或原生能力已通过。

源项目现场已直接验证四 Tab 路径、菜谱甜品筛选与新增入口、八条聊天发送和本地 mock 回复、喂养/摸摸及重复手势抑制、相册上传入口和文件选择器打开后取消、邀请码生成与应用内分享面板、个人资料编辑入口。锁定菜谱详情、真实微信好友分享/云端绑定、系统相册/文件成功拒绝与保存/删除生命周期、照片长按/预览、Storage 真实配额/失败清除、键盘/滚动/长按完整手势、页面隐藏重显和真机行为继续标记 `BLOCKED / 未验证`；未点击系统设置、未接网络、未替换 AppID、未伪造 PASS。完整现场证据、截图路径、日志路径与逐项结果见 `.codex/plans/execution-log.md`。

本轮离线回归全部通过：资源审计 `ASSET_CAT_COUNT=4`、`ASSET_CAT_BYTES=1374256`、`ASSET_MINIPROGRAM_BYTES=1610501`、`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`；`node --check` 49 个 JavaScript 文件通过；`validate-miniapp.js` 为 `ASSET_AUDIT=PASS`、`AUDIT_FILES=118`、`ERRORS=0`、`WARNINGS=0`；全部 storage/cat/photo/file/care/invariants/recovery/lifecycle/local/pages/capabilities smoke 通过；`ALL_JSON_OK`、`PAGE_STORAGE_LEAK=0`、`WXML_CHAT_BUBBLE_STRUCTURE=PASS`、`WXSS_UNIVERSAL_COMBINATORS=0`、`STATIC_RISK_SCAN=0`。

## v2.0 本地交互现场复核（2026-09-29）

Executor 按 Planner v2.0 的 T0→T4 顺序在源项目 `/Users/lnp/Documents/ChatGPT/delicious- project` 使用微信开发者工具 Stable `2.02.2608070`、基础库 `3.4.3`、AppID `touristappid` 完成复核。T0 离线基线、T1 清空 Console 后普通编译门槛均通过；源路径 AX/日志保持可追溯，未出现新的 WXML/WXSS/`__route__`、权限模态或 watcher `EPERM`。游客 `wx.operateWXData` 模拟返回、灰度基础库、组件 selector、avatar null、worker unsupported、preload/timing 警告仍保留为工具边界。

本轮有直接源项目证据的本地交互：

- 键盘：聊天输入框真实输入 `v20-keyboard`，发送后输入框清空、用户气泡和 mock 回复出现，焦点回到 webview，输入栏和底部导航无遮挡（`V20_KEYBOARD=PASS`）。
- 滚动：聊天消息区拖动前后可见消息发生位移；隐私说明长文滚动前后内容和滚动条发生位移（`V20_SCROLL=PASS`）。
- 生命周期：聊天消息在“我的→设置/隐私→反馈→返回→聊天”链路后保留，路径恢复 `pages/chat/chat`，未出现重复消息或编译错误（`V20_LIFECYCLE=PASS`）。
- 设置与隐私：真实打开 `pages/settings/settings`、`pages/about/about`、`pages/privacy/privacy`、`pages/feedback/feedback`；关于页显示 v1.4.0 本机游客模式，隐私页说明本地 Storage/文件和未接入云服务，反馈页说明只保存在本设备。
- 失败反馈：反馈页输入单字并保存，显示“反馈内容至少写 5 个字”，未写入成功记录（`V20_LOCAL_UX=PASS`）。

猫长按没有可用的真实 hold/long-press UI 操作接口，未用 tap 冒充长按，也未调用系统相册保存，故 `V20_LONGPRESS=BLOCKED / 未验证`。真实好友分享/云绑定、系统相册/文件完整生命周期、Storage quota/进程中断、锁定菜谱详情、真机行为继续 `BLOCKED / 未验证`。现场截图、AX、日志时间范围和警告原文见 `.codex/plans/execution-log.md`。

T4 离线回归再次全部通过：资源 `ASSET_CAT_COUNT=4`、`ASSET_CAT_BYTES=1374256`、`ASSET_MINIPROGRAM_BYTES=1610501`、`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`；49 个 JavaScript `node --check` 通过；`validate-miniapp.js` 为 `ASSET_AUDIT=PASS`、`AUDIT_FILES=118`、`ERRORS=0`、`WARNINGS=0`；全部既有 smoke 通过；`ALL_JSON_OK`、`PAGE_STORAGE_LEAK=0`、`WXML_CHAT_BUBBLE_STRUCTURE=PASS`、`WXSS_UNIVERSAL_COMBINATORS=0`、`STATIC_RISK_SCAN=0`。本轮未修改业务源码、配置、资源、脚本、依赖、AppID、schema 或版本；只追加本 README、计划收口和执行日志。


## v2.1 Executor T0–T4 收口（2026-09-29）

本轮按 `.codex/plans/current.md` v2.1 在源项目 `/Users/lnp/Documents/ChatGPT/delicious- project` 串行完成 T0→T4；微信开发者工具 Stable `2.02.2608070`、AppID `touristappid`、基础库 `3.4.3`。没有修改业务源码、配置、资源、脚本、依赖、AppID、schema 或版本；仅追加本 README、`.codex/plans/current.md` 和 `.codex/plans/execution-log.md`。

- `V21_T0_OFFLINE_BASELINE=PASS`：v2.0 归档仍为 128 行/18475 bytes，SHA `b8b5586dc268a6508cc269cfb18e4b9ed91a2db11b16779ed12a882597c921b4`；保护文件和内容树未漂移。
- `V21_SOURCE_GATE=PASS`：清空 Console 后普通编译，源 URL/AppID/工具版本/页面路径可追溯，Debugger Errors `0`；新鲜段无 WXML/WXSS/`__route__`、权限模态或 watcher EPERM。已知游客、灰度基础库、组件 selector、avatar null、worker/preload/timing/插件 warning 按来源保留。
- `V21_RECIPE_LOCKED_DETAIL=PASS`：`pages/recipe/recipe` 的未解锁湘菜卡片只读进入 `pages/recipe-detail/recipe-detail`，菜名/湘菜分类/无照片占位/补充照片入口可见，返回后列表未变。
- `V21_SETTINGS_TOGGLE=PASS`：`pages/settings/settings` 的情绪关怀和通知开关分别翻转、离开后重进仍保持关闭，再逐项恢复为原始开启状态；未清除数据。
- `V21_LONGPRESS=BLOCKED / 未验证`：Computer Use 没有真实 hold/long-press 动作，未用 tap 冒充。
- `V21_ALBUM_BOUNDARY=PASS`（空态与取消边界）：`pages/album/album` 显示 0 张照片与“还没有你们的照片”；进入 `pages/album-upload/album-upload` 后真实打开系统选择器并只点一次“取消”，回到上传页仍为 `0 / 9`，未选图、未保存。真实系统相册保存/权限、有效图片预览/删除仍未验证。
- `V21_OFFLINE_BASELINE=PASS`：资源审计、49 个 JS 语法检查、validate、全部 storage/cat/photo/file/care/invariants/recovery/lifecycle/local/pages/capabilities smoke、JSON、页面 Storage、WXML 条件、WXSS 组合器和静态风险扫描最终均退出 `0`；关键输出与每条命令退出码见执行日志。首次 WXML one-liner 仅因外层引号语法错误退出 `1`，随后使用等价 here-doc 检查得到 `WXML_CHAT_BUBBLE_STRUCTURE=PASS`，未涉及源码。

真实好友/云绑定/云端分享、游客之外的登录、系统相册和权限设置、有效图片文件保存/删除、Storage quota/进程中断、真机布局与完整键盘/滚动/长按、专用状态素材、真实网络后端继续 `BLOCKED / 未验证`；未点击系统安全设置或执行不可逆操作。

## v2.2 本地事务安全收口（2026-09-30）

本轮 Executor 按 `.codex/plans/current.md` v2.2 串行完成 T0→T4；没有修改 `project.config.json`、`project.private.config.json`、AppID、基础库目标、schema/version、资源或依赖。新增源码与 headless smoke 只覆盖本地可复查的失败补偿和容量边界，不代表微信 renderer、系统权限、好友分享、云端或真机通过。

- `V22_T0_OFFLINE_BASELINE=PASS`：v2.1/v2.0 归档和保护哈希保持不变；资源猫图仍 `ASSET_CAT_COUNT=4`、`ASSET_CAT_BYTES=1374256`，最终源码修改后的 `ASSET_MINIPROGRAM_BYTES=1623865`，`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`；49 个 JavaScript `node --check` 通过；`validate-miniapp.js` 输出 `AUDIT_FILES=118`、`ERRORS=0`、`WARNINGS=0`。
- `V22_RECIPE_TRANSACTION=PASS`、`V22_RECIPE_LOCKED_DETAIL=PASS`：菜谱照片保存记录本次路径，metadata 写失败会清理新增文件并保留旧照片；新建菜品补图失败会回滚空记录，回滚失败保留可重试记录；详情明确显示“还没吃过哦~ / 补充照片解锁”，锁定时不显示评分/点赞，补图成功后重新载入为已解锁。`smoke-file-cleanup.js` 为 `PASS`/17 assertions，`smoke-pages.js` 覆盖锁定、成功/失败补图与新建回滚。
- `V22_CHAT_TRANSACTION=PASS`、`V22_CAPACITY_GUARD=PASS`：聊天达到 20 条、反馈达到 50 条时拒绝新写入并提示先清理，旧记录不静默截断；聊天预留用户/回复/关怀消息容量，猫状态或关怀写入失败会恢复快照或返回 pending/failed 清单，不返回已送达的关怀消息。`smoke-care-atomic.js` 为 `PASS`/14 assertions，`smoke-local.js` 为 `PASS`，`smoke-pages.js` 覆盖容量提示和 busy 复位。
- `V22_AVATAR_ROLLBACK=PASS`、`V22_CAPABILITY_UX=PASS`：资料页跟踪 pending avatar，重选、校验/资料写入失败、隐藏/卸载时只清理本次受管路径并保留当前头像；选图、剪贴板、保存相册、分享/绑定失败继续显示能力原因和可操作提示。`smoke-pages.js` 为 `PASS`/86 assertions，`smoke-capabilities.js` 为 `PASS`/18 assertions。
- T4 离线回归：`smoke-storage-atomic`/13、`smoke-cat-interaction`/16、`smoke-photo-presenter`/19、`smoke-file-cleanup`/17、`smoke-care-atomic`/14、`smoke-invariants`/15、`smoke-recovery`/9、`smoke-lifecycle`/9、`smoke-local`/`SCHEMA_VERSION=4`、`smoke-pages`/86、`smoke-capabilities`/18 全部 `PASS`；JSON 输出 `ALL_JSON_OK`，页面 Storage 越层 `PAGE_STORAGE_LEAK=0`，WXML 条件结构 `WXML_CHAT_BUBBLE_STRUCTURE=PASS`，WXSS 通配相邻组合器 `WXSS_UNIVERSAL_COMBINATORS=0`，外链/凭据/未完成标记/旧版本扫描 `STATIC_RISK_SCAN=0`。

真实微信好友发送、跨设备/云端绑定、云存储/登录/openId、真实 LLM/远程反馈/主动推送、系统相册权限和保存、真实图片文件 save/unlink、Storage 10MB 配额/进程中断、真机布局/键盘/滚动/长按、专用 happy/eating/sleeping/sad 素材仍为 `BLOCKED / 未验证`；headless stub 和离线静态检查不替代这些外部证据。

## v2.4 Executor 复核与事实收口（2026-10-08）

v2.3 T4 的 `V23_OFFLINE_REGRESSION=BLOCKED` 是保留的历史结论：当时旧计划误要求源码包回到 v2.2 T0 的精确 `1623865` bytes。该结论和前次 v2.4 T0 因缺少计划读取前时间记录而产生的 `BLOCKED` 日志均未改写。本次重试按新门槛完成离线复核；v2.3 的原记录仍可在 `.codex/plans/execution-log.md` 查阅。

本轮 `node scripts/audit-assets.js` 真实输出为 `ASSET_CAT_COUNT=4`、`ASSET_CAT_BYTES=1374256`、`ASSET_MINIPROGRAM_BYTES=1633052`、`ASSET_PACKAGE_BUDGET_BYTES=2097152`、`ASSET_MINIPROGRAM_REMAINING_BYTES=464100`、`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`。包体低于 2 MiB，剩余字节非负且与预算相减一致；门槛不要求回到 `1623865` bytes 或旧余量 `473287`。四张猫咪 idle PNG 和八张 Tab PNG 的路径、bytes、尺寸、alpha、SHA 与 v2.3 T0/T4 保护记录一致，审计均报告 `referenced=yes`；猫图仍为 4 张、合计 `1374256` bytes，没有新增、复制、替换或重压缩资源。

源码包阶段总量为 `1623865 → 1626027 (+2162) → 1629412 (+3385) → 1633052 (+3640)`；T1–T3 增量合计 `+9187` bytes，T4 增量 `0`。排序内容树和 T1–T3 变更文件最终 SHA 与 v2.3 记录一致，增量可追溯到已批准的本地呈现、文案和离线校验源码。v2.4 未更改源码、脚本、配置、AppID、依赖、资源、版本或 schema。

T2 离线回归全部按序退出 `0`：资源审计；49 个 JavaScript `node --check`；`validate-miniapp.js`（`AUDIT_FILES=118`、错误/警告均为 0，各项猫图回退、预算、可读文案、recipe/album、bind/feedback/settings 契约 PASS）；storage/cat/photo/file/care/invariants/recovery/lifecycle/local/pages/capabilities smoke 全部 PASS（断言数分别为 `13/21/21/17/14/15/9/9`，local `SCHEMA_VERSION=4`、`RECIPES=12`，pages `97`、capabilities `22`）；`ALL_JSON_OK`、`PAGE_STORAGE_LEAK=0`、`WXML_CHAT_BUBBLE_STRUCTURE=PASS`、`WXSS_UNIVERSAL_COMBINATORS=0`、`STATIC_RISK_SCAN=0`。完整命令、stdout、保护 SHA 和两条检查器初始误报及修正理由见执行日志。

关键保护 SHA 保持：`project.config.json` `999c1adb4c03d85076878a88ba4a3d3a32381ad5d35805f4fd70578d0fcab47b`；`project.private.config.json` `240345d4b88b5bd08caba18d2ba92d70b03bd8f2ed188ca5b1db23e45387b161`；`appMeta.js` `99ca2165f530dc4e43660a56d48e98bc6dbfe1fa3c0d6fcbb485b8672a5d49c1`；`storageService.js` `50db6c11e9fe823eebdefaaa5c36f62dded828d62b1fa7b718c0790f67adf5c6`；`recipeService.js` `e76c5642ae75b01049b91d304fac0ac1789f433dc97b311adda0c61ccc9e8247`；`chat-bubble.wxml` `68e2ddb7d149f5e8e958b27a0fb812fabd46a9bdd3e42d4704d220e257706a3f`。`miniprogram` 138 文件内容树 SHA 为 `a2caa91742be8d43b1ab481d3f37cd09fb2f1305471aef498ebc95feadbd1d74`；`scripts` 13 文件内容树 SHA 为 `2d41424a1a1e2c1511f59436e292d51140e7b17d3241468ba892c97da4f88dc8`。

`V24_T0_EVIDENCE=PASS`（读取时间门槛修正后的重试）、`V24_T1_BUDGET_RECONCILIATION=PASS`、`V24_T2_OFFLINE_REGRESSION=PASS`、`V24_FACTUAL_CLOSEOUT=PASS`、`V24_OFFLINE_REVIEW=PASS`。这些状态仅覆盖本地资源审计、Node 语法检查、静态校验和 stub smoke。真实微信 renderer、真实账号/AppID 认证、云服务、网络、系统相册、真机文件生命周期、真实 Storage 配额、布局、无障碍树、手势时序和未交付的专用状态 PNG 仍为 `BLOCKED / 未验证`；离线 PASS 不表示这些能力通过。

## v2.5 微信开发者工具运行时记录（2026-10-08）

本轮在原项目路径 `/Users/lnp/Documents/ChatGPT/delicious- project`、微信开发者工具 Stable `2.02.2608070`、AppID `touristappid`、基础库 `3.4.3` 和 iPhone 12/13 (Pro) 模拟器执行。T0 计划/资源/配置基线通过。T1 清空旧 Console 后触发“普通编译”；编译后 AX 仍指向 `pages/chat/chat` 且 Console 为 `0 errors / 8 warnings`，但连续两张新鲜 CUA 截图都是整窗白屏，因此 `V25_T1_SOURCE_COMPILE=BLOCKED`。白屏后立即停止依赖模拟器的页面验收和源码修复；recipe、album、profile、bind、feedback、settings、about、privacy、profile-edit 均未进入、没有新鲜页面截图和操作结果，详见执行日志。普通编译后未取得有效 renderer 截图，不能把 AX 路由或无错误计数记作页面通过。

T2–T5 因 T1 全局白屏按计划记 `NOT_RUN`。离线 T6 独立完成：`ASSET_MINIPROGRAM_BYTES=1633052 / 2097152`、余量 `464100`、猫图 `4 / 1374256 bytes`、`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`；静态校验及猫咪交互、照片呈现、页面、能力 smoke 均通过，资源、源码树和保护配置 SHA 与 T0 相同。`V25_T6_OFFLINE_REGRESSION=PASS`，但它不代表真实模拟器运行时通过。无业务源码、脚本、配置、依赖或资源改动。

本专项最终状态 `V25_RUNTIME_UX=BLOCKED`。微信账号/好友分享、跨设备绑定、云服务/远端反馈/LLM/推送、系统相册和文件权限/保存/删除、Storage 真实配额、真机尺寸/输入法/长手势/中断恢复及未交付猫咪专用状态图仍为 `BLOCKED / 未验证`。本轮各任务的命令、直接 Console/截图证据、页面覆盖表及保护 SHA 见 `.codex/plans/execution-log.md`。

## v2.6 DevTools 运行时修复与事实收口（2026-10-08）

本轮按 `.codex/plans/current.md` v2.6 串行完成 T0→T6。v2.5 的 `V25_T1_SOURCE_COMPILE=BLOCKED` 仍保留原结论：当时新鲜截图持续白屏。本轮 v2.6 两次普通编译后的新鲜画面均在复观测时显示稳定 chat；T4 的 chat、recipe、album、profile 页面也均有 route 与 screenshot 同步的可见证据。这只确认当前 v2.6 模拟器状态，不证明 v2.5 白屏根因，也不把首帧变化归因于截图时序。

T2 在原路径复现 loading、recipe-card、photo-card 组件 WXSS 标签选择器告警和 avatar 属性 `String` 收到 null 告警；个人页原签名在窄列折成三行。T3 将三个组件的 image/text 选择器换成专属节点 class，保留原间距和视觉样式；avatar 属性使用可空类型并保留 observer 的空值归一、路径校验与 fallback；profile hero 限制头像/编辑入口收缩、允许 copy 缩小并将签名单行省略。未修改昵称、签名值、设置、照片或其他用户数据。T4 普通编译后，目标 selector 与 avatar null 告警未再出现，签名截图为单行省略，AX 仍提供完整原签名。

- `V26_T0_BASELINE=PASS`、`V26_T1_RUNTIME_RECHECK=PASS`、`V26_T2_WARNING_REPRO=PASS`、`V26_PROFILE_LAYOUT=ISSUE_RECORDED`。
- `V26_T3_SOURCE_FIX=PASS`、`V26_T4_RUNTIME_RETEST=PASS`、`V26_T5_OFFLINE_REGRESSION=PASS`、`V26_T6_FACTUAL_CLOSEOUT=PASS`、`V26_RUNTIME_UX=PASS`（范围仅为本轮本地 DevTools 复核）。
- T4 Console 为 `0 errors / 10 warnings`；剩余提示来自游客模式 API 模拟、3.4.3 灰度基础库、preload、自动热重载及 lazy loading，不是本轮目标告警。总 warning 不要求为零。
- 离线包体 `1,633,568 / 2,097,152 bytes`，余量 `463,584`；12 张 PNG 路径、SHA、尺寸、alpha 和引用状态与 T0 一致；配置、AppID、基础库、应用版本和 schema 保护值均未漂移。所有计划离线命令和 README 静态检查 exit `0`。

本轮改动只涉及 T3 allowlist 的九个现有 `miniprogram` 文件和 `scripts/smoke-pages.js`；逐文件前后 SHA、六页面路由/截图/Console 记录、离线命令 stdout、资源与保护项复核见 `.codex/plans/execution-log.md`。touristappid 仅用于本地游客模式；真实账号/好友分享、云端、真实网络、系统相册与权限、真实文件/Storage 配额、真机及外部服务继续 **BLOCKED / 未验证**。Node smoke 与本地 DevTools 证据不替代这些验证。
