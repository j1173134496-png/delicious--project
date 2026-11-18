# Planner 计划：v2.9「八条」动态状态、形态切换与可落地 2.5D 视觉优化

## 0. 本轮范围与 Planner 交付

本轮目标是把“整个项目继续优化”收敛为一条可执行的宠物体验阶段：先建立可持久、可测试的状态契约，再做跨页面动态切换，最后以 CSS/WXSS 2.5D 作为默认视觉增强，并以真实现场证据决定是否扩大素材或开启更强的 3D 试验。默认路径不依赖 WebGL、Canvas、视频或云端。

本轮 Planner 只改了 `.codex/plans/`：

- 旧计划已原字节归档到 `.codex/plans/history/current-v2.8-20261013-pre-pet-phase.md`。
- 归档前后 `cmp -s` 通过；旧 current 与归档 SHA-256 均为 `676a3e711b164715ac1eb4fb74ef783265ffdc4e2a29f20c4d239edaac728b93`，均为 `142` 行 / `11436` bytes。
- 本轮未改业务源码、资源、README、`execution-log.md`、配置、依赖或 AppID。
- 工作区未找到 `.codex/agents/planner.toml`（`.codex/agents/` 目录也不存在）；没有找到适用 `AGENTS.md`。该缺失不能用猜测补齐，记录为计划环境缺口。

## 1. 证据基线

### 1.1 PRD 与历史交付证据

- `PRD-情侣小程序「八条与你」.md:72-113` 要求四级形态、`idle/happy/eating/sleeping/sad` 状态、CSS + 帧动画（呼吸、眨眼、摇尾、跳跃），以及状态栏、喂食和抚摸反馈。
- `PRD-情侣小程序「八条与你」.md:328-338` 选型为 CSS Animation + `wx.createAnimation`；这支持轻量 2D/2.5D 试验，但没有为生产 WebGL/Canvas 提供证据。
- `PRD-情侣小程序「八条与你」.md:374-380` 与 `99-111` 预期每个形态含多种状态图；现状只有 idle，故必须保留回退策略。
- `.codex/plans/execution-log.md` 最近 v2.8 记录：B1 validator 已修复；B4 profile 图像无障碍标签已修复；B2 首帧白屏未复现但保留观察；B3 为开发工具/基础库噪声，未发现业务堆栈；离线全套 PASS，真机/真实账号/系统权限/renderer 仍未覆盖。

### 1.2 当前代码与资源证据（本轮现场读取）

- `miniprogram/models/cat.js` 的 `FORM_META` 只有 4 个 `idle.png`；`CAT_STATES` 只有 `idle/happy/eating/sad`，缺少 PRD 的 `sleeping`；`getFormAsset()` 对所有缺图状态回退同形态 idle。
- `miniprogram/services/catService.js` 保存 `mood/hunger/exp`，但猫的状态不是持久字段；`feed()`/`recordChat()`/`pet()` 只把状态写到 chat 页的短时 `catState`，没有跨页面或重进同步的状态解析器。
- `miniprogram/pages/chat/chat.js` 以 500/1500/1600ms 定时把 `eating/happy` 改回 `idle`；`onShow()` 不从 service 恢复状态。`miniprogram/pages/profile/profile.js:23-24` 永远用 `getStateMeta('idle')`，个人页显示与聊天页可能不一致。
- `miniprogram/components/cat-display/cat-display.wxss` 只有 `floaty`、`pulse-soft`、灰度/位移；全局 `miniprogram/styles/animation.wxss` 只有 `floaty/pulse-soft/heart-rise`，没有 `perspective`、`translate3d`、分层 2.5D 或状态切换过渡。
- 四个 `miniprogram/assets/batiao/lv*/` 目录各只有 `idle.png` 与说明文件；没有 `happy/eating/sleeping/sad` 状态 PNG、序列帧、Lottie、视频或 3D 模型。
- `node scripts/audit-assets.js` 本轮现场 PASS：4 张猫图，`ASSET_CAT_BYTES=1374256`，每张 533/606×640、RGBA、均 ≤450KB，`ASSET_CAT_REMAINING_BYTES=303465`；包内 `ASSET_MINIPROGRAM_BYTES=1633700`，包体余量 `463452`，`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`。预算不足以无审查地加入 12 张大状态图。
- `node scripts/smoke-cat-interaction.js` PASS，`CAT_ASSERTIONS=22`；已覆盖 tap/longpress 去重、隐藏页回调、经验边界、idle 回退、文案和 profile aria-label，但没有覆盖 sleeping、阈值解析、跨页状态一致性、状态动画可见性或 4 级切换。
- `node scripts/smoke-lifecycle.js` PASS，`LIFECYCLE_ASSERTIONS=9`；只验证 timer 在隐藏页不更新，不证明状态机在隐藏/重进后恢复。
- `node scripts/validate-miniapp.js` PASS：`CAT_STATE_FALLBACK=PASS`、`CAT_ASSET_BUDGET=PASS`、`ERRORS=0`、`WARNINGS=0`；这是静态契约，不是微信 renderer 或真机动画通过。
- `find miniprogram scripts -name '*.js' -print0 | xargs -0 -n1 node --check` PASS；Node `v26.8.2`。当前目录不是 Git 工作树，后续以文件 SHA、排序内容树和 allowlist 对账，不假设有 `git diff`。

### 1.3 已确认的关键缺口

1. 状态定义与 PRD 不完整（无 sleeping），状态只在 chat 页内存定时器中存在；跨 Tab、profile、冷启动没有统一真相。
2. 形态切换只有 `currentForm` 与一张 idle 图的瞬时替换，没有可观察的过渡、公告、失败回退或防抖。
3. “动态”目前是单层图片的 scale/translate，尚无真实 3D；若直接引入 WebGL/Canvas 会增加包体、兼容性和真机验证风险。
4. 资源审计器要求四个 idle 引用，新增状态资源的计数/预算/重复校验还没有契约；素材版权、透明边缘、尺寸和命名也没有验收表。
5. 无 reduced-motion/动画开关或低端设备降级约定；状态文案已有 aria-label，但没有统一的状态变化播报和错误回退验收。

## 2. 目标、非目标与设计决策

### 2.1 目标

- 建立可纯函数测试的状态解析与状态迁移：`idle`、`happy`、`eating`、`sad`、`sleeping`，明确优先级、持续时间、时间来源和阈值。
- 使 chat、profile、组件和 store 从同一 service/model 读取 `stateKey/stateText/animationClass/assetFallback`；动作、隐藏、重进、升级都不产生幽灵 timer 或重复写入。
- 在四级形态切换时提供可观察的 2.5D 过渡（淡入/缩放/轻微 `translate3d`/分层阴影/高光），并保留 idle 图和 Emoji 占位；不把“3D”宣传成真实模型渲染。
- 让素材扩展可审计：每个可选状态资源有路径、尺寸、alpha、SHA、引用关系和预算；缺图按状态→idle→Emoji 顺序降级。
- 通过离线 smoke、开发工具只读现场、至少一台真实设备的手动复验，才决定是否把更重的状态素材纳入生产。

### 2.2 非目标

- 本阶段不接云同步、LLM、推送、真实情侣绑定、音频、WebGL、Three.js、视频、Canvas 帧合成或发布上传。
- 不擅自更换 `project.config.json` 的 AppID，不升级 schema/version，不把游客/本地模式伪装成真实账号。
- 不在缺少用户提供/批准素材时生成或提交新的生产图；不能以 AI 生成图替代版权、透明边缘和真机验收。

## 3. 修改白名单与保护文件

### 3.1 Planner 本轮已用白名单

- `.codex/plans/current.md`（本文件）
- `.codex/plans/history/current-v2.8-20261013-pre-pet-phase.md`（旧 current 原字节归档）

禁止触碰：业务源码、`miniprogram/assets/**`、README、`.codex/plans/execution-log.md`、配置、依赖、AppID。

### 3.2 后续 Executor 的最小白名单（按阶段）

| 阶段 | 允许新增/修改文件 | 明确禁止 |
|---|---|---|
| T0 基线 | 不改项目文件；如需证据脚本只能在临时目录 | 所有业务源码、资源、README、execution-log、配置 |
| T1 状态契约 | `miniprogram/models/cat.js`、`miniprogram/services/catService.js`、`miniprogram/store/catStore.js`、必要时 `miniprogram/services/storageService.js`；新增 `scripts/smoke-cat-state.js`；补充 `scripts/smoke-cat-interaction.js`、`scripts/smoke-lifecycle.js` | `project.config.json`、`project.private.config.json`、`app.json`、AppID、非猫模块 |
| T2 页面/组件同步 | `miniprogram/components/cat-display/cat-display.{js,wxml,wxss}`、`miniprogram/pages/chat/chat.{js,wxml,wxss}`、`miniprogram/pages/profile/profile.{js,wxml,wxss}`、`miniprogram/styles/animation.wxss`；必要的猫页 JSON 仅在注册组件时修改 | 菜谱、相册、绑定、反馈业务；全局导航和存储 key 重命名 |
| T3 素材与审计 | 经用户批准才可写 `miniprogram/assets/batiao/**`；`scripts/audit-assets.js`；必要时 `miniprogram/models/cat.js` 的 manifest | 未批准素材、无许可证来源、超过预算的批量图片、删除 idle/Emoji 回退 |
| T4 无障碍/低动效与现场修正 | 上述猫相关 WXML/WXSS/JS；若确需设置开关，仅允许 `miniprogram/pages/settings/settings.{js,wxml,wxss}`、`miniprogram/services/storageService.js`、对应 smoke | 其他页面重构、无证据的全局 CSS 替换 |
| T5 回归 | `scripts/smoke-cat-state.js`、`scripts/smoke-cat-interaction.js`、`scripts/smoke-lifecycle.js`、必要的 `scripts/smoke-pages.js`/`scripts/validate-miniapp.js`/`scripts/audit-assets.js` | 修改测试使失败消失而不修契约；任何配置/资源越界 |

若 T1 发现已有 schema 迁移会丢弃新字段，才允许在 `storageService.js` 增加向后兼容归一化；除非实际迁移需要，不升 `SCHEMA_VERSION`。

## 4. 串行执行计划（T0 → T8）

### T0 保护、读取和可复现基线

**动作**

1. 读取本文件与归档；记录 UTC/Asia-Shanghai 时间、行数、bytes、SHA；确认归档 `cmp` 仍通过。
2. 检查 `.codex/agents/planner.toml`、适用 `AGENTS.md`、设备工具锁屏状态；不得用缺失文件推断规则。
3. 对保护文件和 allowlist 做排序 SHA；运行 `audit-assets`、JS syntax、validator、现有 smoke；记录 stdout/退出码。
4. 备份本地 storage fixture（若现场要做动作测试），将任何后续测试限制在 disposable local profile；不触发分享、相册、绑定、云写入或发布。

**验证命令/现场验证**

```sh
env LC_ALL=C shasum -a 256 .codex/plans/current.md .codex/plans/history/current-v2.8-20261013-pre-pet-phase.md
env LC_ALL=C shasum -a 256 project.config.json project.private.config.json miniprogram/app.json
node scripts/audit-assets.js
find miniprogram scripts -name '*.js' -print0 | xargs -0 -n1 node --check
node scripts/validate-miniapp.js
node scripts/smoke-cat-interaction.js
node scripts/smoke-lifecycle.js
```

开发工具中只做 fresh 编译、chat→四 Tab→profile 的 route/截图/AX 采集；先确认未锁屏、错误数为 0，再开始后续阶段。

**风险与停止条件**

- 计划/归档 SHA 不匹配、保护文件漂移、出现未授权改动：停止并记录 BLOCKED。
- Mac 锁屏、目标开发工具/账号/AppID 未确认、出现白屏/崩溃/系统权限弹窗：停止现场动作，只保留离线基线。
- 任一离线基线失败：不进入 T1；不能把历史 PASS 当作本轮 PASS。

### T1 建立状态模型与迁移契约

**实现意图（仅允许 T1 白名单）**

1. 在 `models/cat.js` 补齐 `sleeping` 元数据，并加入状态优先级、可读文案、动画 token、专用资源 key；所有未知状态归一化到 idle。
2. 增加纯函数（名称可按现有风格确定）解析 `resolveCatState(cat, context)`：
   - `context.now` 可注入，默认设备本地时间；动作覆盖优先于衍生状态。
   - `eating` 为喂食短态，`happy` 为聊天/抚摸/升级反馈短态；短态到期后才解析衍生状态。
   - `sad` 仅在 `mood` 或 `hunger` 低于经产品确认的阈值时出现；低值、NaN、未来时间必须安全归一化。
   - `sleeping` 只在设备本地夜间窗口、没有动作覆盖且没有错误态时出现；窗口必须是常量并可注入测试，不能硬编码服务器时区。
   - 其余为 `idle`。返回 `stateKey/stateText/animationClass/assetKey/stateUntil`，不泄露可变引用。
3. 在 `createDefaultCat`/`storageService.normalizeCatValue` 保留向后兼容字段；若采用 `stateKey/stateSince/stateUntil`，旧记录缺失时默认 idle，写入失败仍返回旧 cat 和可行动错误。
4. `catService.feed/pet/recordChat/getCat/getProgress` 统一通过解析器输出状态；动作结果带 `previousState/nextState` 或等价 transition，重复调用不可重复扣减/升级。

**验证命令/现场验证**

- 新增 `node scripts/smoke-cat-state.js`：覆盖所有状态、阈值边界、夜间/白天注入时间、未知状态、NaN/负数、短态过期、存储迁移幂等和状态优先级；所有断言输出计数和退出码。
- 扩充 `smoke-cat-interaction`：tap/longpress 去重仍为一次写入；feed→eating→happy→idle；pet/chat 后 state transition 有且只有一次；升级到 Lv.2/3/4 返回 form transition。
- 扩充 `smoke-lifecycle`：onHide 后延迟 callback 不更新 state；onShow 从 service 恢复；重复 onShow 不叠加 timer。
- 运行 T0 全套命令；`SCHEMA_VERSION` 只有在真实迁移需求时才变化，并须有旧 fixture 前后快照相等证据。
- 现场：在 disposable fixture 下让 chat/profile 读同一 cat，记录 `stateKey/stateText/currentForm`；观察白天/夜间 fixture 和低 mood/hunger 页面文案。

**风险与停止条件**

- 阈值/夜间窗口与产品未确认：先保留常量和 NOT_RUN，不自行改变养成难度。
- 存储写失败、字段被迁移丢弃、计数重复、隐藏页仍 setData：立即停止 T2，回滚 T1 变更。
- 若真机/基础库不支持所需时间/状态 API，改用纯 JS Date 和现有定时器，不引入新运行时依赖。

### T2 页面、动态切换和 2.5D 默认表现

**实现意图（仅允许 T2 白名单）**

1. `cat-display` 接收 service 输出的 state view model，状态类与文案来自同一对象；image error 后保持当前状态文本，按状态→idle→Emoji 回退。
2. chat 不再把 `catState` 作为唯一真相：动作只请求 service transition，定时器由 pageTask 统一注册/取消；onShow/loadData 重新解析当前 state，onHide/onUnload 无 stale setData。
3. profile 不再硬编码 idle；显示当前 `stateText`、form、fallback，并对形态升级加一次性可读提示；状态图片/Emoji aria-label 和状态变化区域不重排布局。
4. 形态切换使用 300–500ms 的可配置过渡：旧/新状态只允许一个可见主图，先 opacity/scale，再轻微 `translate3d`；切换失败保持旧图并显示 fallback，不闪白、不依赖图片预加载 API。
5. 默认“2.5D”只用现有 idle PNG + WXML 分层（主体、阴影、高光、sparkle/心形）与 WXSS `perspective`、`translate3d`、`rotateX/Y`、`scale`；动画关闭或不支持时退回单层 floaty/pulse。不得在此阶段引入 WebGL/Canvas/视频。
6. 对长按后的合成 tap 保持现有 token/time guard；状态切换不改变写入去重行为。

**验证命令/现场验证**

- `node scripts/smoke-cat-state.js`、`node scripts/smoke-cat-interaction.js`、`node scripts/smoke-lifecycle.js`、`node scripts/smoke-pages.js` 全部 PASS；每个失败保留原始 stdout。
- `node scripts/audit-assets.js`、JS `--check`、`node scripts/validate-miniapp.js` PASS；`CAT_STATE_FALLBACK=PASS` 必须仍成立。
- 静态检查 WXML 中状态 label/aria、无 `wx:else` 结构回归；检查 `animation.wxss` 新 token 有 reduced/static fallback。
- 开发工具 fresh route：chat 首帧、点击/长按、喂食、发送、切换到 profile 再回 chat、等级 fixture 切换；每次取 screenshot + AX + Console 增量。验收：状态文本与视觉类同步、无双重写入、无白屏、Errors=0、业务 warning 不新增。
- 现场不得使用隐藏旧 WebView AX 节点作为当前页证据；以当前 route + fresh screenshot 为准。

**风险与停止条件**

- `perspective/translate3d` 在基础库或设备上失效、出现白屏/裁切/明显掉帧：立即关闭 2.5D flag，保留单层 CSS fallback；不以模拟器 PASS 推断真机 PASS。
- 形态切换显示旧图残影、状态文案错配或 timer 在隐藏页写入：停止交付，回到 T1/T2 修正。
- 任何页面出现 console 业务错误、图片路径异常、AX 标签丢失：停止，不扩大到 T3 素材。

### T3 素材 manifest、轻量状态资源与预算门禁

**默认策略**

- 没有用户批准的状态图时，不新增资源；使用 T2 2.5D + idle/Emoji 回退即可交付视觉试验。
- 若提供素材，优先少量关键帧/overlay，而不是每个形态 4 张大 PNG。每个文件需有来源/许可、用途、形态、状态、像素尺寸、alpha、SHA、大小；禁止把远程 URL、base64、不可审计 blob 写进 WXML/JS。
- 在当前猫资源余量 `303465` bytes 与包余量 `463452` bytes 内评估；单文件仍 ≤450KB、长边 ≤640、RGBA、无重复 hash。任何预算超限直接停止，不压缩到破坏透明边缘。

**允许文件**

- `miniprogram/assets/batiao/lv*/` 下经批准的新资源；保留 4 张 idle。
- `models/cat.js` 的资源 manifest/回退逻辑；`scripts/audit-assets.js` 的可选状态引用、尺寸、重复和预算检查。
- 不允许同时添加 4 形态 × 4 状态的未经审查图片矩阵。

**验证命令/现场验证**

```sh
node scripts/audit-assets.js
node scripts/smoke-cat-state.js
node scripts/smoke-cat-interaction.js
```

检查 stdout 中每个状态资源的尺寸、alpha、SHA、`referenced=yes`、总预算；现场逐形态观察 idle、可选状态、图片加载失败和 Emoji 占位。缺任何一张都必须读到明确回退文案，不得显示空白。

**风险与停止条件**

- 无许可证/来源、透明边缘毛刺、色彩不一致、资源超过预算、audit 无法区分 idle 与状态图：停止并退回 CSS/idle 方案。
- 真机上首帧变慢、内存/包体超限、低端机掉帧：删除可选资源或关闭状态资源 flag；不能删除保底 idle。

### T4 无障碍、性能和全项目关键细节回归

**实现意图**

- 为状态图、Emoji、形态切换容器保留可读 `aria-label`/状态短文案；状态变化不只靠颜色、动画或图标。
- 增加可测试的 `animationMode`（若产品允许则在 settings 提供“完整/轻量动效”；否则默认检测失败时自动轻量）并保证 reduced/static 分支与 2.5D 分支文案一致。
- 检查 chat/profile 的 safe-area、fixed input/heart-layer、状态卡和首次 Tab 切换没有因 3D overflow/transform 产生裁切或点击层遮挡。
- 保持 B2 相册首帧、B3 工具 warning、B4 profile AX 的既有结论；猫阶段不得修改相册/菜谱逻辑来“顺带修复”。

**验证命令/现场验证**

- 运行完整回归（按 T5 命令清单）并记录 `smoke-pages`、`smoke-capabilities`、`smoke-local`、`smoke-invariants`、`smoke-recovery`、`smoke-storage-atomic`、`smoke-photo-presenter`、`smoke-file-cleanup`、`smoke-care-atomic`、`smoke-lifecycle`、`smoke-cat-interaction`、`smoke-cat-state` 全部退出码。
- 开发工具 AX：读出形态、状态、回退原因；键盘/读屏无法操作时标 NOT_RUN，不伪造 PASS。截图检查 4 Tab 首帧、chat/profile 状态卡、状态切换后布局。
- 现场只做 disposable local fixture 的 tap/longpress/feed/chat；不执行真实分享、绑定、上传、删除、保存到系统相册、清除用户数据。

**风险与停止条件**

- reduced/static 分支失效或 AX 只读到“图像”、3D transform 遮住按钮、safe-area 溢出：停止 T5，回滚最近的 CSS/WXML 变化。
- 发现 B2/B3 重新出现且无法归因：保留 PARTIAL，暂停猫视觉扩展，先修首帧/告警证据。

### T5 全量离线回归与保护复核

严格串行运行：

```sh
node scripts/audit-assets.js
find miniprogram scripts -name '*.js' -print0 | xargs -0 -n1 node --check
node scripts/validate-miniapp.js
node scripts/smoke-local.js
node scripts/smoke-pages.js
node scripts/smoke-capabilities.js
node scripts/smoke-lifecycle.js
node scripts/smoke-cat-interaction.js
node scripts/smoke-cat-state.js
node scripts/smoke-photo-presenter.js
node scripts/smoke-file-cleanup.js
node scripts/smoke-care-atomic.js
node scripts/smoke-storage-atomic.js
node scripts/smoke-invariants.js
node scripts/smoke-recovery.js
```

保护复核：

- `project.config.json` / private config / `app.json` / AppID / schema/version 未授权不得变化。
- 资源审计 `ASSET_ERRORS=0`、`ASSET_WARNINGS=0`；包体 ≤2,097,152 bytes；猫资源 ≤1.6MiB；每张图 ≤450KB、长边 ≤640、alpha=yes、referenced=yes、无重复 SHA。
- 运行排序路径 SHA 内容树，确认只出现阶段白名单文件；不得以“更新测试快照”掩盖业务漂移。

**停止条件**：任一命令非 0、预算超限、protected SHA 漂移、状态 smoke 不确定、storage 迁移非幂等，立即停止 T6；不发布、不上传。

### T6 解锁现场与真机/模拟器矩阵

**开发工具现场**

1. 解锁 Mac，导入当前项目；先 clear Console、普通编译，记录基础库、工具版本、模拟器型号、route。
2. fresh chat 首帧截图/AX；tap、longpress、feed、send 各执行一次，记录 state transition、toast、progress、storage 变化。
3. 切换 recipe/album/profile 再回 chat；profile 读到相同 state/form；等级 fixture 逐级观察 300–500ms 过渡和回退。
4. 重复长按导致的 tap、快速双击、页面 onHide/onShow、图片 error、动画关闭分支；记录 Console 增量与截图。

**真机现场**

- 至少一台用户提供的 iOS 或 Android 真机（记录机型、系统、微信版本、基础库、屏幕比例），扫码/预览/真机调试由用户完成；优先覆盖一台低端/旧设备。
- 真机才可判定 `perspective/translate3d` 是否稳定、长按/tap 事件是否真实、safe-area/掉帧/首帧是否可接受。没有扫码/连接证据时，阶段结论只能是 `SIMULATOR_ONLY` 或 `BLOCKED`。
- 不执行真实情侣绑定、云同步、分享、系统相册、发布；若需照片/权限，仅以用户批准的 disposable fixture 做取消/拒绝路径。

**风险与停止条件**

- 设备未连接、扫码门槛、权限弹窗、出现白屏/崩溃/业务 warning：停止现场动作，保留已采集证据。
- 真机性能不足：关闭 2.5D/可选状态资源，保留可读静态/2D 方案；不能强行扩大动画。

### T7 交付审查与回滚点

**交付前必须具备**

- 一份 T1–T6 的原始命令 stdout/退出码、截图/AX/route、状态 fixture、资源 manifest 和未验证边界。
- 明确列出每个变更文件、旧/新 SHA、是否涉及素材、是否只在本地模式验证。
- 任何“真实 3D”“全设备流畅”“真机无障碍”“云端同步”没有对应证据时，必须写 `NOT_VERIFIED`，不使用 PASS。

**回滚顺序**

1. 先关掉可选状态资源/2.5D flag，回到现有 idle + CSS 2D；
2. 保留 T1 状态纯函数和 smoke，若其稳定则独立交付；
3. 若状态契约破坏存储或动作去重，回滚 T1/T2，不保留半迁移字段；
4. 素材只可整批移除，不能删除四张原 idle 或 Emoji fallback。

### T8 阶段结论

- `PASS`：离线全套 + 开发工具 fresh route/AX/screenshot + 至少一台真机关键路径均满足验收。
- `PARTIAL`：状态契约/离线 smoke 通过，但真机或某些 renderer/素材分支未覆盖；交付必须标出边界。
- `BLOCKED`：缺少计划/设备/AppID/素材授权，或出现白屏、崩溃、预算/保护文件漂移、无法归因的业务错误。BLOCKED 时停止后续工作，等待外部条件，不猜测修复。

## 5. 现场验收清单（最小可复核证据）

| 场景 | 期望可见结果 | 证据 |
|---|---|---|
| 首次 chat | 猫图/Emoji、形态、状态、操作按钮同屏，无空白 | fresh screenshot + route + AX |
| tap / longpress | 只写一次，happy/heart 出现，后续回到解析状态 | event token、storage 前后快照、截图 |
| feed | eating→happy→解析状态；每日上限不重复写 | transition 序列、toast、smoke |
| chat | happy/关怀提示，消息与 cat 状态一次提交 | page/service 返回值、截图 |
| 夜间/低 mood | sleeping/sad 文案与动效，非颜色唯一表达 | 注入 now fixture + AX |
| 等级切换 | 形态名、图片/回退、过渡和一次公告一致 | Lv.1→4 fixture 截图 + AX |
| 状态图缺失/加载失败 | idle → Emoji，解释短文案，无空白 | `getFormAsset` + image-error smoke |
| tab/profile 往返 | 两页展示同一 state/form，隐藏页不写入 | route + setData/lifecycle smoke |
| reduced/static | 仍可读、可点、无布局跳动 | 设置/fixture 截图 + AX |

## 6. 真机、素材与能力边界

- 当前只证明本地 Node/静态契约和历史开发工具只读证据；没有证明微信 renderer、GPU、掉帧、真实长按合成事件或设备 safe-area。
- 真实 AppID、扫码、账号权限、手机型号/系统/微信版本、系统相册和分享能力由用户提供并执行；Planner/Executor 不代替。
- 现有四张 idle PNG 是唯一已审计生产素材。任何 happy/eating/sleeping/sad 图、overlay、序列帧或 3D 模型需用户批准来源/许可、透明边缘、尺寸、压缩和包体预算；没有这些就保持 CSS/idle/Emoji。
- 默认方案称为“2.5D 视觉增强”，不是实际 3D 模型。真实 3D/WebGL/Canvas 若未来需要，必须单独立项、单独预算、单独真机矩阵和用户明确授权。
- 本文件和归档是 Planner 的全部写入；本轮不追加 `execution-log.md`，不改 README、资源、配置或业务源码。

## 7. 当前阶段结论

- 规划状态：`READY_FOR_T0`。
- 已发现阻塞：`.codex/agents/planner.toml` 缺失是规则环境缺口；真机/素材授权/真实 AppID 尚未提供，是 T3/T6 的预期门禁，不是 Planner 读取阻塞。
- 计划顺序：`T0 基线 → T1 状态契约 → T2 页面/2.5D → T3 素材审计 → T4 无障碍/性能 → T5 离线回归 → T6 现场/真机 → T7 交付审查 → T8 结论`。
- 任何门禁失败均按本计划停止，不用离线 smoke、隐藏 WebView AX 或模拟器截图填补真机/素材证据。
