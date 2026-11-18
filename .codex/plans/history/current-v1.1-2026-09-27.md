# Planner 计划：八条与你 MVP → 可交付 v1.1 加固

## 1. 计划元信息与执行纪律

- 角色：Planner Agent（本文件只负责分析和计划，未修改业务代码）。
- 生成日期：2026-09-27。
- 项目根目录：/Users/lnp/Documents/ChatGPT/delicious- project。
- 本计划归档自上一轮：.codex/plans/history/current-2026-09-27.md。
- Executor 必须在开始前完整读取本文件，并按 T0 → T5 的顺序执行；任务不能并行。
- 每完成一个任务，Executor 必须先执行该任务的验证命令，把“状态、涉及文件、命令、实际输出、未验证项”追加到 .codex/plans/execution-log.md，然后才进入下一任务。
- 本阶段只处理本地可完成的可靠性和可交付性问题，不接入真实 LLM、云数据库、通知服务或外部素材。
- 如果计划、源码或验证结果出现结构性阻塞，Executor 必须停止后续任务并报告，不得用假设掩盖失败。

## 2. 已检查的现状

### 2.1 已有工程

- 原生微信小程序入口已存在：miniprogram/app.js、app.json、app.wxss；四个 Tab 为 chat、recipe、album、profile。
- 页面、组件、模型、Service、轻量 Store 和主题样式均已建立，当前工程共 37 个 JavaScript 文件。
- Service 已覆盖本地 Storage、图片文件适配、用户/情侣、猫咪、聊天、菜谱和相册。
- README 已说明导入方式、本地单机限制、mock AI 和上一轮静态/Node smoke 结果。
- 上一轮执行日志 T0～T6 均标记完成，但微信开发者工具、模拟器、真机、权限和手势未验证。
- 项目没有 package.json、第三方依赖或 Git 元数据；不能假设存在 npm、云开发或 CI。
- .codex/agents/planner.toml 与 executor.toml 不存在，应使用原生 Subagent。

### 2.2 PRD 基线

- PRD-情侣小程序「八条与你」.md 是 v1.0 初稿，Phase 5 明确要求动画/交互打磨、性能、边界处理和整体测试。
- v1 明确允许本地 Storage、mock AI、单设备情侣绑定和本地图片；真实 LLM、云端同步、主动通知、真实猫咪素材属于后续范围。
- 核心规则包括：每日最多喂食 3 次；等级依赖喂养/聊天，Lv.4 还依赖纪念日 365 天；情绪关怀只传递泛化内容并可关闭、24 小时同类去重；菜谱照片和相册照片需可保存、预览、删除并处理权限失败。

## 3. 从当前 MVP 发现的高价值缺口

以下差距均来自实际源码检查，Executor 应按计划修复并验证。

1. 相册列表在 load() 中给照片附加 hasImage，但 preview() 又把未附加标记的原始照片放进 previewPhotos；预览 WXML 以 item.hasImage 判断，因此真实照片进入大图预览时会退化为占位符。涉及 miniprogram/pages/album/album.js 和 album.wxml。
2. 头像上传后保存的是本地路径，但 profile、profile-edit、album、bind 页面仍使用 text 输出 avatar；路径会被当作文字显示，不能稳定展示本地图片，也没有图片加载失败回退。
3. catService.maybeUpgrade() 只按 feed/chat 规则升级，models/cat.js 中 Lv.3 → Lv.4 的 anniversaryDays=365 没有被执行；纪念日规则未进入进度计算。
4. chatService.sendMessage() 只判断 emotionCareEnabled，没有判断 notificationsEnabled；设置页的通知开关可能无法阻止本地关怀消息。
5. userService.clearLocalData() 发起图片文件删除后立即清 Storage，没有等待删除结果；图片保存/删除也缺少统一的能力检查和明确降级。
6. 多个写操作缺少统一的异步错误和重复点击保护（绑定、资料保存、签名、照片/菜谱选择与保存、详情补图）；开发者工具权限拒绝、取消选择或临时文件失效时需要稳定回退。
7. Storage schemaVersion 固定为 1，initialize() 对损坏或类型错误的数据没有迁移/修复策略；日期工具会把无效日期静默滚动为其他日期，纪念日可被设置为未来日期。
8. WXSS 中大量使用 flex gap，且安全区表达式没有显式回退；在不同基础库/开发者工具版本上存在布局兼容风险。tabbar 图标仍是 1×1 PNG，占位时导航图标不可见。
9. 验证主要是上一轮临时命令，项目没有可重复调用的本地审计入口；README 没有本阶段的固定验证命令和已知运行时阻塞清单。

## 4. 本阶段目标与明确边界

### 4.1 目标

把现有 MVP 加固成无需 API 密钥和云服务即可稳定审查、导入和演示的 v1.1：

- 修复媒体预览、头像渲染、猫咪升级、通知开关和本地文件清理的确定性问题。
- 为 Storage 和日期输入增加最小可迁移、可恢复的边界策略，保持已有合法数据。
- 统一主要写操作的 busy/error/取消反馈，防止重复写入和页面卡死。
- 消除已识别的跨基础库布局风险，提供可见的 tabbar 本地占位图标。
- 提供可重复的 Node/JSON/路径/资源静态检查和离线 Service smoke 命令，并把结果写入 README 与执行日志。

### 4.2 明确不做

- 不接真实 LLM、情绪云分析、微信云开发、云存储、跨设备同步、通知推送、登录 openId 或支付。
- 不凭空补充 PRD 未确定的默认菜谱、纪念日、角色设定或商业规则。
- 不引入第三方 UI、状态库、构建链和 npm 依赖。
- 没有微信开发者工具或真机时，不声称通过运行时/权限/手势验证。

## 5. 严格执行顺序

### T0：建立离线基线和可重复审计入口

- 执行状态：已完成

**目标**：先固定当前工程边界和后续每项任务的验证入口。

**涉及文件**

- 新增 scripts/validate-miniapp.js。
- 新增或完善 scripts/smoke-local.js。
- 读取但不改动：PRD-情侣小程序「八条与你」.md、README.md、.codex/plans/execution-log.md、miniprogram/app.json、project.config.json。

**实现要点**

- validate-miniapp.js 使用 Node 内置 fs/path，不依赖 npm；检查根/小程序 JSON 可解析、app.json 的页面四件套、usingComponents 路径、tabbar 图标路径、sitemap 路径和不存在的资源引用。
- 同一脚本扫描页面脚本，报告页面直接调用 wx.*Storage*、硬编码密钥、TODO/FIXME 和超出本阶段边界的外部 API；扫描结果必须区分 error 与 warning。
- smoke-local.js 使用现有 Node 内存 fallback，先覆盖初始化幂等、默认数据数量、Service 增删改查询和清除后的恢复；后续任务新增的规则测试放进同一入口，不创建需要微信运行时的假测试。
- T0 先运行基线命令并把现状和已知失败/警告记录到执行日志，不因为基线已有缺口而停止。

**验证命令**

- node scripts/validate-miniapp.js
- node scripts/smoke-local.js
- find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check

**完成标准**

- 两个脚本可在没有 wx 全局、没有网络、没有依赖安装的 Node 环境运行。
- 任何检查失败都有文件和原因；脚本退出码稳定，可供 T5 重跑。

### T1：修正 Service、数据迁移和业务规则

- 执行状态：已完成

**目标**：修复不依赖 UI 的确定性错误，确保历史本地数据可继续使用。

**涉及文件**

- miniprogram/services/storageService.js
- miniprogram/services/userService.js
- miniprogram/services/chatService.js
- miniprogram/services/catService.js
- miniprogram/models/cat.js
- miniprogram/utils/dateUtil.js
- miniprogram/utils/util.js（只有确有需要时修改）
- scripts/smoke-local.js

**实现要点**

- 把 Storage schemaVersion 提升为明确的 v1.1 版本，并实现幂等迁移/修复：缺失集合补默认值，错误类型恢复为空集合或合法默认对象，保留合法用户/菜谱/聊天/照片字段；迁移失败时返回可诊断结果，不静默清空全部数据。
- 对 level、feedCount、chatCount、mood、hunger、todayFeedCount 做边界归一化；等级升级必须逐级执行。Lv.3 → Lv.4 需要同时满足 PRD 的喂养/聊天条件和 anniversaryDate 至少 365 天；getProgress() 必须能展示下一形态所需条件，Lv.4 返回完成状态。
- dateUtil 增加可复用的有效日期/未来日期判断。纪念日保存拒绝无效或未来日期并保留旧值；getTogetherDays() 对合法日期保持现有“第 1 天”语义。
- chatService 生成 emotion_care 前同时尊重 emotionCareEnabled 与 notificationsEnabled；保留原始吐槽只在本地聊天记录中，发给伴侣的内容仍只能是泛化提醒；同类 24 小时去重继续生效。
- 清除本地数据时先收集菜谱/相册/头像等受管图片的删除 Promise，再清除 Storage；任何单文件失败不能阻止其他文件清理，返回明确的 ok/失败列表。保存、删除、文件系统能力缺失时统一走可解释的本地降级。
- 所有改变保持现有 Service API 兼容，页面不直接访问 Storage。

**逐项验证**

- node scripts/smoke-local.js
- node --check miniprogram/services/storageService.js
- node --check miniprogram/services/userService.js
- node --check miniprogram/services/chatService.js
- node --check miniprogram/services/catService.js
- node --check miniprogram/utils/dateUtil.js
- rg -n 'wx\\.(get|set|remove)Storage' miniprogram/pages || true

**完成标准**

- 重复初始化不覆盖合法数据；模拟损坏数据能迁移到合法结构。
- 猫咪等级、纪念日、未来日期、通知开关和 24 小时去重均有离线断言。
- 清除流程不会留下 Storage 元数据，文件删除失败会被记录而不是伪装成成功。

### T2：修复头像和照片预览的媒体生命周期

- 执行状态：已完成

**目标**：让上传后的头像、菜谱照片和相册照片在列表、详情、大图预览中表现一致，失效路径有回退。

**涉及文件**

- 新增 miniprogram/components/avatar/avatar.js、avatar.wxml、avatar.wxss、avatar.json。
- miniprogram/pages/profile/profile.{js,wxml,json}
- miniprogram/pages/profile-edit/profile-edit.{js,wxml,json}
- miniprogram/pages/album/album.{js,wxml,json}
- miniprogram/pages/bind/bind.{js,wxml,json}
- miniprogram/pages/recipe-detail/recipe-detail.js
- miniprogram/components/photo-card/photo-card.js
- miniprogram/services/albumService.js
- 必要时同步 miniprogram/pages/recipe-add/recipe-add.wxml 的临时图片错误回退。

**实现要点**

- avatar 组件根据 emoji/内置文本与本地文件路径选择 text 或 image；image error 必须回到可见的默认文本/emoji。profile-edit 的可点击区域仍由页面负责，保存后展示不应出现文件路径文字。
- album 页面统一经过同一 helper 生成带 hasImage 的 previewPhotos；preview()、onPreviewChange() 和 image error 均更新当前项和删除权限。真实本地路径可预览，emoji/空路径显示占位；删除后关闭或重置当前预览，不能引用已删除项。
- 检查 recipe-detail、recipe-card、photo-card 的失效图片回退一致；文件不存在时不得产生持续 404。
- 选择/保存图片取消、权限拒绝、临时路径失效必须给出 toast/占位并恢复按钮状态；不把临时路径写入 Storage 作为成功的唯一依据。

**逐项验证**

- node scripts/smoke-local.js
- node --check miniprogram/pages/album/album.js
- node --check miniprogram/pages/profile/profile.js
- node --check miniprogram/pages/profile-edit/profile-edit.js
- node --check miniprogram/services/albumService.js
- python3 - <<'PY'
import json, pathlib
for p in pathlib.Path('miniprogram').rglob('*.json'):
    json.load(open(p, encoding='utf-8'))
print('JSON_OK')
PY
- rg -n 'previewPhotos|hasImage|avatar' miniprogram/pages/album miniprogram/pages/profile miniprogram/pages/profile-edit miniprogram/pages/bind miniprogram/components/avatar

**完成标准**

- 离线 smoke 能构造一个真实路径和一个 emoji 路径，验证预览标记、失效回退、删除权限和重启后元数据。
- 页面不再把头像文件路径当作文字显示；相册预览真实路径不再因缺少 hasImage 而全部显示占位。

### T3：统一交互保护、错误态和页面同步

- 执行状态：已完成

**目标**：处理取消、失败、重复点击和返回页面后的状态一致性。

**涉及文件**

- miniprogram/pages/chat/chat.js
- miniprogram/pages/recipe/recipe.js
- miniprogram/pages/recipe-add/recipe-add.js
- miniprogram/pages/recipe-detail/recipe-detail.js
- miniprogram/pages/album/album.js
- miniprogram/pages/album-upload/album-upload.js
- miniprogram/pages/profile/profile-edit.js
- miniprogram/pages/bind/bind.js
- miniprogram/pages/settings/settings.js
- 需要时补充 miniprogram/components/loading、empty-state 或新增轻量 error-state 组件。

**实现要点**

- 对绑定、资料保存、菜谱保存/删除/补图、相册保存/删除、签名编辑、聊天发送分别设置 busy 标志；请求中禁用按钮，成功/失败/取消都在 finally 或等价路径恢复。
- 所有 wx.chooseImage、wx.saveImageToPhotosAlbum、setClipboardData、showModal、navigateBack 失败都不得抛到页面未处理；显示短提示并保留用户表单，不覆盖已有数据。
- 页面 onShow/onLoad 只在必要时刷新 Service 数据，不重复追加欢迎消息或重置输入；聊天进入后按现有隐私语义标记可见提醒已读，并保持最近 20 条限制。
- 补齐空列表、无照片、失效照片、无绑定、非法邀请码、重复绑定、超长文本、非法评分/分类、未来纪念日的可见反馈。
- 清除数据改为等待 T1 的清理结果，再刷新全局/页面状态；失败项在日志或提示中可识别。

**逐项验证**

- node scripts/smoke-local.js
- find miniprogram/pages -name '*.js' -print0 | xargs -0 -n1 node --check
- rg -n 'saving|sending|feeding|busy|finally|fail:' miniprogram/pages
- rg -n 'wx\\.(get|set|remove)Storage' miniprogram/pages || true
- python3 - <<'PY'
import json, pathlib
for p in pathlib.Path('miniprogram').rglob('*.json'):
    json.load(open(p, encoding='utf-8'))
print('JSON_OK')
PY

**完成标准**

- 同一按钮快速点击不会产生重复记录或重复导航。
- 取消/权限失败后页面仍可继续编辑和重试；返回列表后数据只出现一次。
- 页面没有直接 Storage 访问，所有文字和图片元数据继续走 Service。

### T4：运行时兼容性静态审计、布局和导航资源

- 执行状态：已完成

**目标**：减少不同基础库下的静态兼容风险，使工程导入后有可见导航图标。

**涉及文件**

- miniprogram/pages/**/*.wxss
- miniprogram/components/**/*.wxss
- miniprogram/app.wxss
- miniprogram/app.json
- miniprogram/assets/tabbar/*.png（替换现有 1×1 占位图为本地可见、体积合适的简单图标）
- scripts/validate-miniapp.js
- README.md（记录目标基础库和兼容边界）

**实现要点**

- 对当前扫描到的 flex gap 做静态审计；为需要兼容旧基础库的布局改用相邻子项 margin，不能改变页面结构和主题间距。对 safe-area-inset-bottom 提供固定 padding fallback，再叠加 env() 计算。
- 保留 CSS 变量/动画/组件选择器时，先在静态检查中登记支持假设；不要引入 grid、外部字体、远程 URL 或需要构建的 CSS。
- 生成四组普通/选中 tabbar 图标（本地 PNG，尺寸和文件大小符合微信要求），避免继续使用 1×1 不可见图标；不依赖网络或图标包。
- validate-miniapp.js 检查所有 tabbar 图片存在、PNG 尺寸/大小合理、页面和组件路径完整，并把兼容性警告按文件列出。

**逐项验证**

- node scripts/validate-miniapp.js
- file miniprogram/assets/tabbar/*.png
- rg -n 'gap:|display:[[:space:]]*grid|url\\(https?://|position:[[:space:]]*sticky' miniprogram --glob '*.{wxss,wxml,js,json}' || true
- rg -n 'safe-area-inset-bottom' miniprogram --glob '*.wxss'
- python3 - <<'PY'
from pathlib import Path
for p in Path('miniprogram/assets/tabbar').glob('*.png'):
    b=p.read_bytes()
    assert b[:8] == b'\\x89PNG\\r\\n\\x1a\\n', p
    assert int.from_bytes(b[16:20], 'big') <= 96 and int.from_bytes(b[20:24], 'big') <= 96, p
print('TABBAR_PNG_OK')
PY

**完成标准**

- 所有预期页面和组件可由配置解析；没有缺图标、缺页面或远程资源。
- 兼容性扫描没有未处理的 error；warning 只剩 README 明确说明的基础库/运行时限制。

### T5：集成验证、文档和交付记录

- 执行状态：已完成

**目标**：形成一次可复查的离线验收结果，并明确尚未验证的外部条件。

**涉及文件**

- README.md
- .codex/plans/execution-log.md
- scripts/validate-miniapp.js
- scripts/smoke-local.js
- 必要时调整前述源码以修复验证发现的问题。

**实现要点**

- README 增加固定验证命令、脚本用途、v1.1 修复点、单设备/mock 边界、图片文件生命周期、目标基础库和微信开发者工具缺失时的限制。
- Executor 为 T0～T5 各写一节实际结果；每节说明命令、退出码/关键计数、未验证项和后续阻塞。不得只写“通过”。
- 运行完整离线检查：JS 语法、JSON、配置页面/组件路径、tabbar PNG、Service smoke、页面 Storage 泄漏、敏感密钥/TODO 和外部 URL 扫描。
- 如果环境中出现微信开发者工具，额外做一次导入/编译/关键路径 smoke；否则在日志标记运行时为 BLOCKED，不能把静态结果写成真机通过。

**逐项验证**

- find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
- node scripts/validate-miniapp.js
- node scripts/smoke-local.js
- python3 - <<'PY'
import json, pathlib
for p in list(pathlib.Path('.').glob('*.json')) + list(pathlib.Path('miniprogram').rglob('*.json')):
    json.load(open(p, encoding='utf-8'))
print('ALL_JSON_OK')
PY
- rg -n 'wx\\.(get|set|remove)Storage' miniprogram/pages || true
- rg -n 'api[_-]?key|secret|sk-[A-Za-z0-9]|TODO|FIXME|https?://' miniprogram README.md scripts || true
- git status --short 2>/dev/null || true

**完成标准**

- 所有离线命令退出码为 0，或执行日志明确列出已知环境阻塞及对应文件。
- README、执行日志和计划中的范围一致；没有新增真实 API/云服务依赖。
- T0～T5 均有可复查证据，Executor 才可向主 Agent 汇报完成。

## 6. 最终验收标准

1. 工程配置、页面和组件路径完整，Node/JSON 静态检查可重复运行。
2. 合法旧数据初始化幂等；损坏集合能按 v1.1 规则修复；清除本地数据等待受管图片清理并恢复默认状态。
3. 猫咪每日喂食上限、逐级升级、Lv.4 纪念日条件和进度显示符合 PRD。
4. 情绪关怀同时尊重两个开关，仍只向伴侣传递泛化内容，24 小时同类去重有效。
5. 头像路径显示为图片并有回退；相册真实图片可在列表和大图预览，失效路径显示占位；本人删除权限保持有效。
6. 取消、权限拒绝、失败、重复点击、空状态、非法表单和返回刷新都可恢复。
7. TabBar 图标可见且本地存在；WXSS 兼容性风险经过扫描并有回退/文档说明。
8. 没有敏感密钥、远程资源、页面直接 Storage 访问或未经授权的云/API 行为。

## 7. 风险与暂停条件

### 风险

- **无微信开发者工具/真机**：只能完成 Node、JSON、路径和代码级验证；运行时布局、系统权限、键盘、swiper 手势、相册保存必须在日志中标记未验证。
- **基础库差异**：如果静态审计无法确认某 WXSS/API 在当前目标基础库可用，优先使用现有原生替代或降级；不要为了验证安装未知工具。
- **本地文件生命周期**：wx 文件系统的实际保存/删除仍依赖运行时；Service 必须返回明确成功/失败，不能把内存 fallback 当作真机证明。
- **PRD 仍是初稿**：默认菜谱、真实头像/猫咪素材、纪念日提醒和云端同步留待用户决策，不在本阶段擅自扩大。

### 必须暂停并报告

- .codex/plans/current.md 无法读取、与实际代码结构明显不符，或上一轮归档文件缺失。
- 需要真实 API 密钥、云环境、微信 AppID/开放能力、远程素材或不可逆外部操作才能完成某项验收。
- Storage 迁移无法在保留合法数据的前提下确定，或发现现有数据会被不可逆覆盖。
- 发现会阻止后续任务的编译/解析错误，Executor 在当前工作区无法修复。
- 需要改变 PRD 核心行为、解除单机/mock 边界或新增第三方依赖。

## 8. Planner 交付检查

- [x] 已检查 PRD、README、执行日志、app/project 配置、所有 Service/模型/页面/组件和资源目录。
- [x] 已将上一轮计划原样归档到 .codex/plans/history/current-2026-09-27.md，并用 cmp 确认字节一致。
- [x] 已识别相册预览、头像渲染、Lv.4 纪念日、通知开关、文件清理、迁移、交互保护、兼容性和验证入口缺口。
- [x] 已按 T0～T5 给出严格顺序、涉及文件、实现要点、逐项验证命令、验收标准、风险和暂停条件。
- [x] 新计划写入本文件；Planner 未修改业务源码。
