# Planner 计划：八条与你 v1.5 本地 PRD 缺口与运行时交接

## 1. 计划元信息、权限与严格执行纪律

- **角色**：Planner Agent。本轮只读取 PRD/README/执行记录和工程源码，原样归档上一轮计划并写入本文件；不得修改 `miniprogram/` 业务源码、配置、资源或 `scripts/` 实现。Planner 允许改动只有本轮归档文件和本文件；执行阶段才由 Executor 按本计划改业务文件并追加执行日志。
- **生成日期**：2026-09-27。
- **项目根目录**：`/Users/lnp/Documents/ChatGPT/delicious- project`。
- **上一轮原样归档**：`.codex/plans/history/current-v1.4-2026-09-27.md`。
  - 归档路径此前不存在，本轮创建后不再覆盖。
  - 归档字节数：30351。
  - 归档行数：310（以换行符计）。
  - 归档 SHA-256：`80631f5015876673d890acaf4f29028b9de0ebf7bda11c66ae58dece83e037e0`。
  - 归档必须保持为写入本计划前的 `current.md` 原文；若未来需要再次归档，只能使用新的唯一文件名。
- **当前计划**：`.codex/plans/current.md`。
- **执行顺序**：Executor 必须严格按 T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7 串行执行。每一任务完成后，先执行该任务列出的全部验证命令，再把任务状态、实际修改文件、关键实际输出、未验证项和风险追加到 `.codex/plans/execution-log.md`，才能开始下一任务。不得并行、跳过、用静态匹配替代运行时证据，或把后续任务的结果倒填到前一任务。
- **暂停纪律**：任何验证失败、数据/文件回滚无法解释、兼容 API 语义改变、出现真实远程/凭据/登录依赖、发现计划外文件修改，立即暂停并在执行日志写证据；暂停后不得自行跳到下一任务。
- **离线边界**：继续使用原生微信小程序、Node/Python 标准库和现有系统工具；不安装 npm/第三方测试框架，不接入网络、真实 LLM、云开发、云存储、openId 登录、通知推送、远程图片、外部字体或第三方服务。touristappid 只保留游客/本地测试配置。
- **版本边界**：应用版本当前为 `1.4.0`，数据 schema 当前为数值 `4` / 名称 `1.3`。除非 T3 的 fixture 证明无法在现有结构表达待清理状态，否则保持 schema 4/1.3；应用版本升级和 schema 迁移必须分开记录。
- **运行时边界**：Node smoke、静态审计和 headless wx stub 只能证明离线分支。微信开发者工具导入/编译、游客登录、四 Tab renderer、分享面板、权限弹窗、基础库布局/安全区、字体/键盘输入法、swiper/滚动/长按手势、真实文件系统和真实 Storage quota/进程中断都必须写为 BLOCKED / 未验证，不能从本地结果推断通过。

## 2. 已核对的 v1.4 真实基线

### 2.1 当前源码与文档现状

本轮已完整读取 `PRD-情侣小程序「八条与你」.md`、`README.md`、`.codex/plans/current.md`、`.codex/plans/execution-log.md`，以及 `miniprogram/**` 和 `scripts/**`。当前源代码与 v1.4 执行记录一致：

- `node scripts/audit-assets.js`：四张形态 idle PNG，`ASSET_CAT_COUNT=4`、`ASSET_CAT_BYTES=1374256`、`ASSET_MINIPROGRAM_BYTES=1596908`、`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`。
- 全部 `miniprogram/**/*.js` 的 `node --check`：退出码 0。
- `node scripts/validate-miniapp.js`：`ASSET_AUDIT=PASS`、`AUDIT_FILES=118`、`ERRORS=0`、`WARNINGS=0`。
- `node scripts/smoke-storage-atomic.js`：`SMOKE_STORAGE_ATOMIC=PASS`、`ATOMIC_ASSERTIONS=12`。
- `node scripts/smoke-invariants.js`：`SMOKE_INVARIANTS=PASS`、`INVARIANT_ASSERTIONS=15`、`REPAIRED=11 DEDUPED=3 DROPPED=5 FAILED=0`。
- `node scripts/smoke-recovery.js`：`SMOKE_RECOVERY=PASS`、`RECOVERY_ASSERTIONS=9`。
- `node scripts/smoke-lifecycle.js`：`SMOKE_LIFECYCLE=PASS`、`LIFECYCLE_ASSERTIONS=9`。
- `node scripts/smoke-local.js`：`SMOKE_LOCAL=PASS`、`SCHEMA_VERSION=4`、`RECIPES=12`。
- `node scripts/smoke-pages.js`：`SMOKE_PAGES=PASS`、`ASSERTIONS=61`、`LOCAL_FEEDBACK=0`。
- `node scripts/smoke-capabilities.js`：`SMOKE_CAPABILITIES=PASS`、`CAPABILITY_ASSERTIONS=14`。
- 根目录及 `miniprogram/**/*.json` Python 解析：`ALL_JSON_OK`。
- 页面 Storage 越层扫描：`PAGE_STORAGE_LEAK=0`。

这些数字是 Planner 复核时在当前工作区实际得到的离线结果；Executor 在 T0 必须重新运行并以当次输出为准。

### 2.2 可在本地完成的真实 PRD 差距

1. **猫咪互动入口不完整**：`components/cat-display/cat-display.wxml` 只有 `bindtap`，没有 PRD 要求的长按入口；页面 `onPet` 没有防止 tap/longpress 或快速重复事件导致重复写入的统一保护。
2. **经验值没有用户可见进度条**：`catService` 已维护 `cat.exp`，但聊天状态栏只展示饱食度、心情和今日喂养；个人页的 `progress.percent` 是形态解锁条件的最小百分比，不是经验值进度，无法满足 PRD “经验值进度条”的可见契约。
3. **照片上传者没有展示**：`Photo.uploadedBy` 已写入本地模型和 Service，但照片卡片与大图预览没有显示上传者标识；PRD 明确要求双方照片显示上传者。
4. **文件删除与元数据不是可重试事务**：`albumService.removeAsync`、`recipeService.removeAsync` 在 `unlink` 失败后仍可能删除记录；`userService.clearLocalData` 在 `failedFiles` 非空时仍清除 Storage 元数据，导致孤儿文件/无法从页面发起重试。当前 smoke 只证明失败被报告，没有证明记录和文件引用可恢复。
5. **情绪关怀事件写入缺少稳定事件 ID 和失败路径**：新建 care event 没有显式 `eventId`；`hasRecentCare` 的清理写失败仍继续返回查询结果；关怀消息已写入而事件记录写失败时无法提供一致的成功/重试语义，存在重复提醒或局部成功。
6. **分享能力探测过度耦合**：`runtimeCapabilities.probe('button.open-type.share', 'showShareMenu')` 把分享按钮能力和菜单接口绑定。若基础库允许 `open-type="share"` 但没有 `showShareMenu` 方法，页面会错误禁用分享；当前 capability smoke 没有覆盖该组合。
7. **状态专用猫咪 PNG 仍缺失**：四个形态当前只有 `idle.png`，`happy/eating/sad` 继续回退 idle；这是 PRD 资源表的已知未交付项，当前没有用户提供的状态图源。本轮保持可审计 fallback，不凭空宣称专用状态图已完成，也不把它作为运行时通过条件。
8. **游客运行时仍无法验证**：DevTools 的导入、renderer、权限、真实文件和 Storage 证据全部受游客令牌失效阻塞，不能由本地任务替代。

### 2.3 明确不能伪造的运行时阻塞

执行日志的最新证据为：

- 微信开发者工具 Stable 2.02.2608070 已打开项目 `batiao-love`，AppID 为 `touristappid`。
- 日志出现 `INVALID_LOGIN, access_token expired [touristappid]`，同一初始化流程出现 `isMiniAppProject=false`。
- 构建面板持续 `Loading project all files...`，模拟器路径保持空白。
- 曾临时尝试去掉 `miniprogramRoot` 尾部斜线和打开 `useStaticServer`，均无改善，配置随后恢复原值；不能把尝试当作通过证据。

因此本轮任何“运行时交接”只能准备可执行清单和证据模板；在用户于开发者工具完成微信登录并重新导入/编译前，仍然是 BLOCKED / 未验证。不能写截图、编译成功、分享面板、权限弹窗或真机文件结果。

## 3. v1.5 目标与不做事项

### 3.1 目标

- 补齐猫咪长按和经验进度的本地可见契约，保证重复手势不会重复写入。
- 在照片网格和预览中显示不泄露原始 userId 的上传者标识。
- 把受管文件删除、菜谱/照片元数据和清除本地数据变成可诊断、可重试的一致流程；不伪造清除成功。
- 让关怀事件具有稳定 ID、24 小时同类去重和可回滚/可诊断的写入语义。
- 修正分享按钮能力探测的接口边界，并扩展 headless capability fixture。
- 更新静态契约、离线 smoke、README 和执行日志，形成 v1.5 本地交付与 DevTools 登录交接包。
- 明确专用状态 PNG 因没有源素材继续处于 fallback/待素材状态。

### 3.2 不做

- 不接入真实 LLM、后端、云同步、openId、正式 AppID、通知推送或跨设备真实绑定。
- 不把“双方确认解绑”伪装成单机模拟已经具备；本地 bind/unbind 继续在文档标记模拟。
- 不把专用 `happy/eating/sleeping/sad` PNG 用临时 Emoji、截图或未经提供的素材冒充交付；若没有素材，只保留 idle fallback 并记录缺口。
- 不为通过测试而删除合法数据、静默截断超限输入、忽略 unlink/setStorage 失败或放宽资源预算。
- 不修改 schema 到 5；若清理重试确实需要持久化字段而现有 `meta` 无法安全承载，立即暂停并报告迁移设计，不自行升版。
- 不执行微信登录、导入、编译或真机操作；这些需要用户在可用 DevTools 环境中完成。

## 4. 严格串行任务

### T0：冻结 v1.4 基线并固定 v1.5 缺口快照

- **状态**：完成（本地离线验证通过；微信运行时 BLOCKED / 未验证）。
- **任务目标**：验证本计划归档完整性，复跑当前离线基线，固定上述 6 项可本地修复缺口、状态 PNG fallback 和游客登录阻塞证据。T0 不改业务代码。
- **涉及文件**：只读 `.codex/plans/history/current-v1.4-2026-09-27.md`、`PRD-情侣小程序「八条与你」.md`、`README.md`、`.codex/plans/execution-log.md`、`miniprogram/**`、`scripts/**`、`project.config.json`、`project.private.config.json`；只允许追加 `.codex/plans/execution-log.md`。
- **实现要点**：
  - 用 Python 校验归档 310 行、30351 字节和 SHA-256 `80631f5015876673d890acaf4f29028b9de0ebf7bda11c66ae58dece83e037e0`，并确认归档内容等于 Planner 写入前的 current.md 原文。
  - 按 T7 最终命令顺序重跑资产审计、JS 语法、静态审计、所有现有 smoke、JSON 解析、页面 Storage 越层和静态风险扫描；记录当次真实资源/文件/断言数字。
  - 用 `rg` 固定差距入口：`cat-display.wxml` 的 tap/longpress、`chat.wxml` 的经验栏、`photo-card.wxml`/相册预览的 uploader、`removeAsync`/clearLocalData 的失败分支、care event 写入、share capability probe、状态 PNG 目录。
  - 确认 `SCHEMA_VERSION=4` / `SCHEMA_NAME=1.3`，确认没有 package/lockfile、远程 URL、凭据和计划外源码改动。
- **验证命令**：

      python3 - <<'PY'
      import hashlib, pathlib
      p = pathlib.Path('.codex/plans/history/current-v1.4-2026-09-27.md')
      b = p.read_bytes()
      assert len(b) == 30351 and b.count(b'\n') == 310
      assert hashlib.sha256(b).hexdigest() == '80631f5015876673d890acaf4f29028b9de0ebf7bda11c66ae58dece83e037e0'
      print('V14_ARCHIVE_OK')
      PY
      node scripts/audit-assets.js
      find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
      node scripts/validate-miniapp.js
      node scripts/smoke-storage-atomic.js
      node scripts/smoke-invariants.js
      node scripts/smoke-recovery.js
      node scripts/smoke-lifecycle.js
      node scripts/smoke-local.js
      node scripts/smoke-pages.js
      node scripts/smoke-capabilities.js
      python3 - <<'PY'
      import json, pathlib
      for p in list(pathlib.Path('.').glob('*.json')) + list(pathlib.Path('miniprogram').rglob('*.json')):
          json.loads(p.read_text(encoding='utf-8'))
      print('ALL_JSON_OK')
      PY
      if rg -n 'wx\.(get|set|remove|clear)Storage(?:Sync)?' miniprogram/pages; then exit 1; else echo PAGE_STORAGE_LEAK=0; fi
      if rg -n 'https?://|api[_-]?key|secret|sk-[A-Za-z0-9]{8,}|TODO|FIXME' miniprogram README.md scripts project.config.json; then exit 1; else echo STATIC_RISK_SCAN=0; fi

- **验收标准**：归档校验输出 `V14_ARCHIVE_OK`；所有当前基线命令退出码为 0，且输出与当次实际工作区相符；T0 只追加执行日志，不出现业务/config/resource/script 实现修改。
- **风险/暂停条件**：归档 hash/字节/行数不符、任何基线失败、schema 漂移、远程/凭据命中或计划外修改时暂停；不能把 T0 的离线 PASS 记作微信运行时通过。

### T1：猫咪长按、经验进度与重复手势保护

- **状态**：完成（本地离线验证通过；真实长按/renderer BLOCKED / 未验证）。
- **任务目标**：补齐 PRD 的点击/长按互动和经验值可见进度；同一次长按或快速重复事件最多产生一次 pet 写入，保留现有喂食每日 3 次、成长条件和状态 fallback。
- **涉及文件**：`miniprogram/components/cat-display/cat-display.wxml`、`cat-display.js`；`miniprogram/pages/chat/chat.js`、`chat.wxml`、`chat.wxss`；`miniprogram/pages/profile/profile.js`、`profile.wxml`、`profile.wxss`；必要时 `miniprogram/models/cat.js`、`services/catService.js`；新增或更新 `scripts/smoke-cat-interaction.js`，并更新 `scripts/smoke-pages.js`/ `validate-miniapp.js` 契约。
- **实现要点**：
  - 猫展示组件同时注册 `bindtap` 和 `bindlongpress`，共用一次 `onPet` 事件；事件要带来源或短时 token，避免长按同时触发点击/重复写入。页面层再以 `petting`/token guard 防快速重复提交，不改变用户可连续互动的语义。
  - 在 Service 或模型层提供派生经验进度（例如每 100 点为当前等级经验段：current、need、remaining、percent），不要把派生字段写入 schema；升级时现有 `exp - 100` 规则和 transition 保持不变，非法 exp 仍归一化为非负有限数。
  - 聊天猫卡状态栏新增经验值数字与进度条，个人页同时展示同一派生值；饱食度、心情、今日喂养和形态解锁条件不能被经验栏替换。进度文案清楚区分“经验进度”和“下一形态条件进度”。
  - headless harness 直接调用组件的 tap/longpress handlers 和页面 pet guard，断言一次手势只增加一次经验/心情写入；验证 onHide/onUnload 后回调不更新页面。
  - 不新增睡眠状态或专用 PNG；继续使用 `CAT_STATES` 与 idle/Emoji fallback，并在文档写清这项资源缺口。
- **验证命令**：

      node scripts/smoke-cat-interaction.js
      node scripts/smoke-local.js
      node scripts/smoke-pages.js
      node scripts/smoke-lifecycle.js
      node scripts/validate-miniapp.js
      find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
      rg -n 'bindtap="onPet"|bindlongpress="onPet"|exp|experience|petting|token|经验' miniprogram/components/cat-display miniprogram/pages/chat miniprogram/pages/profile scripts

- **验收标准**：tap 和 longpress 均能触发一次 pet；重复事件/快速点击不会重复写入或重复 toast；聊天和个人页显示一致的经验 current/need/percent；既有成长规则、每日喂食上限、idle fallback、schema 4/1.3 和旧 smoke 保持通过。新 smoke 失败分支必须非零退出。
- **风险/暂停条件**：无法区分微信 tap/longpress 事件顺序、重复写入、经验派生改变升级条件、页面重显后 token 失效或需新增 schema 时暂停；真实长按/动画仍标记 BLOCKED。

### T2：照片上传者标识与预览信息契约

- **状态**：完成（本地离线验证通过；微信 renderer BLOCKED / 未验证）。
- **任务目标**：让照片卡片和大图预览显示可读上传者，同时保留本地模式隐私边界、月份分组、描述/日期、长按保存和本人删除。
- **涉及文件**：`miniprogram/components/photo-card/photo-card.js`、`photo-card.wxml`、`photo-card.wxss`；`miniprogram/pages/album/album.js`、`album.wxml`、`album.wxss`；必要时 `models/photo.js`、`services/albumService.js`；新增或更新 `scripts/smoke-photo-presenter.js` 与 `scripts/smoke-pages.js`。
- **实现要点**：
  - 页面加载时依据当前用户、伴侣和 `uploadedBy` 生成 `uploaderLabel`（本人昵称、Ta 或“本机记录”等），只在 UI 显示 label，不渲染原始 userId、openId 或分享参数。
  - 网格卡片显示上传者短标签；大图 caption 同时显示日期、描述和上传者。未知/缺失上传者要有稳定占位文案，不因坏数据导致 WXML 解析或页面崩溃。
  - `withImageFlag/markImageError` 继续控制图片 fallback；长按保存只对可用真实路径触发，不改变权限/取消提示。绑定和未绑定两种状态都要有合理文案。
  - 新 smoke 构造自己、伴侣、未知上传者、Emoji/失效路径，断言 label、月份、预览切换、删除权限和隐私字符串不泄露；静态审计检查 WXML 未直接绑定 `uploadedBy`。
- **验证命令**：

      node scripts/smoke-photo-presenter.js
      node scripts/smoke-pages.js
      node scripts/validate-miniapp.js
      find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
      rg -n 'uploaderLabel|uploadedBy|本人|Ta|本机记录|preview-caption' miniprogram/components/photo-card miniprogram/pages/album scripts

- **验收标准**：每张照片在网格与预览都显示稳定上传者 label；label 不泄露原始 ID；Emoji/坏路径仍显示占位且不会调用保存相册；现有 9 张/500 张限制、删除本人规则、日期描述和页面回归全部通过。
- **风险/暂停条件**：为显示 label 而持久化或外传 openId、未知上传者引起错误绑定、破坏预览/长按或真实 renderer 差异时暂停；上传者视觉在微信 renderer 仍未验证。

### T3：文件清理、元数据一致性与可重试失败

- **状态**：完成（本地离线验证通过；真实文件/Storage BLOCKED / 未验证）。
- **任务目标**：把照片/菜谱删除和设置中的清除数据改为“文件失败就可解释、可重试、不能假报成功”的流程，覆盖受管文件共享引用、Storage 写失败和文件系统缺失 fallback。
- **涉及文件**：`miniprogram/services/storageService.js`、`albumService.js`、`recipeService.js`、`userService.js`；`miniprogram/pages/album/album.js`、`recipe-detail/recipe-detail.js`、`settings/settings.js`、`utils/errorMessage.js`；新增 `scripts/smoke-file-cleanup.js`，更新 `scripts/smoke-storage-atomic.js`、`scripts/smoke-local.js`、`scripts/smoke-pages.js`、`validate-miniapp.js`。
- **实现要点**：
  - 受管文件路径、共享引用、Emoji/远程/临时路径的判定继续集中在 Storage；引用仍存在时只删除元数据、不 unlink 共享文件，并返回 `skippedFiles`。
  - `removeAsync` 先得到可诊断的文件结果，再决定元数据提交；unlink 失败时保留记录或写入明确的待清理队列，使用户能重新尝试，返回稳定 `file_remove_failed`、`failedFiles`，不返回假 `ok=true`。Storage 写失败也要保留旧 metadata。
  - `clearLocalData` 先收集唯一受管路径并处理“文件不存在可视为已清理”的情况；出现真实文件失败时不得把所有数据伪装成默认已清除，保留可重试证据（可用现有 `meta` 诊断字段，不升 schema），成功后才清理 Storage 并重新初始化默认数据。失败结果必须包含路径/稳定错误码而非 raw stack。
  - 页面在文件失败/部分清除时显示失败数量和下一步；成功才显示恢复默认数据。删除、清除、重试按钮必须有 busy/finally/token 保护，不能在隐藏页面写 UI。
  - 文件与 Storage 无 wx fallback 继续可用；真实 wx 文件系统和进程中断不由 headless 伪造。
- **验证命令**：

      node scripts/smoke-file-cleanup.js
      node scripts/smoke-storage-atomic.js
      node scripts/smoke-local.js
      node scripts/smoke-pages.js
      node scripts/smoke-lifecycle.js
      node scripts/validate-miniapp.js
      find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check

- **验收标准**：成功删除不留受管孤儿；unlink 失败保留可见失败清单和可重试路径，不能丢引用或返回成功；清除部分失败不显示“已恢复默认数据”，Storage/文件/元数据结果可解释；共享引用、Emoji、远程/临时路径不被误删；所有既有 smoke 和 schema 4/1.3 保持通过。
- **风险/暂停条件**：跨文件/Storage 操作无法回滚、为重试擅自升 schema、合法文件被误删、清除后失败路径无法再次定位时暂停；真实 unlink/权限/进程中断仍 BLOCKED。

### T4：情绪关怀事件去重与局部失败语义

- **状态**：完成（本地离线验证通过；真实伴侣通知/运行时 BLOCKED / 未验证）。
- **任务目标**：保证同类情绪 24 小时内只提醒一次，care event 具有稳定 ID，事件清理/消息写失败时不伪造关怀送达或丢失诊断；保持原始吐槽不外传。
- **涉及文件**：`miniprogram/services/chatService.js`、`models/chat.js`（必要时新增 care event model/util）、`services/storageService.js`；`utils/emotionDetector.js`、`pages/chat/chat.js`；新增 `scripts/smoke-care-atomic.js`，更新 `smoke-local.js`、`smoke-pages.js`、`validate-miniapp.js`、README。
- **实现要点**：
  - 为新 care event 生成稳定 `eventId`、tag、createdAt 和 schema 可归一化字段；去重只按规范化 tag 与 24 小时窗口判断，清理旧事件必须检查 `setChecked` 结果。
  - 先准备可回滚的事件/消息写入顺序：care event 保存失败时不返回 `careMessage` 已送达；care message 保存失败时撤销本次事件或返回 `pending/failed` 诊断。若跨 key 无法真正原子化，必须保留失败 key/eventId 并让页面显示可重试，不得吞错。
  - 继续截断输入至 500、上下文最多 20 条、开关（情绪/通知）和伴侣条件；任何关怀消息不包含用户原始吐槽、openId 或邀请码。
  - headless fixture 注入 event 清理失败、event 写失败、message 写失败、重复 tag 和跨 24 小时场景，断言稳定结果、无重复提醒和隐私边界。
- **验证命令**：

      node scripts/smoke-care-atomic.js
      node scripts/smoke-local.js
      node scripts/smoke-pages.js
      node scripts/validate-miniapp.js
      find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
      rg -n 'eventId|careEvents|24|emotion_care|原始|openId|invite' miniprogram/services/chatService.js miniprogram/models miniprogram/pages/chat scripts README.md

- **验收标准**：同类 tag 24 小时内只发一次，事件写入和消息写入的每个失败分支有稳定错误码/可重试提示；关怀消息始终泛化且不包含原文；聊天、成长计数、20 条上限和开关逻辑保持原有结果。
- **风险/暂停条件**：无法在现有 schema 4/1.3 表达失败/待重试状态、回滚造成聊天计数或消息丢失、原文泄露、时间边界不确定时暂停；不能用清空 careEvents 让 fixture 通过。

### T5：能力探测修正与游客运行时交接材料

- **状态**：完成（能力材料交付；游客 DevTools/运行时 BLOCKED / 未验证）。
- **任务目标**：把分享按钮、分享菜单、Storage/文件能力的静态探测边界写清楚，并为用户登录 DevTools 后复核准备不伪造的步骤和证据模板。
- **涉及文件**：`miniprogram/utils/runtimeCapabilities.js`、`pages/bind/bind.wxml`、`pages/profile/profile.wxml`、`pages/bind/bind.js`、`pages/profile/profile.js`；`scripts/smoke-capabilities.js`、`scripts/validate-miniapp.js`、`README.md`、`.codex/plans/execution-log.md`。
- **实现要点**：
  - 将 `button.open-type.share` 的可用性与 `showShareMenu` 菜单接口分开探测；若无菜单方法但 open-type 可用，不能错误禁用分享按钮。每项保留 boolean、reason、details，继续固定 `login/cloud/remoteSync=false`。
  - Storage 能力至少区分 get/set/remove 方法缺失；文件系统能力区分 manager/env/access/save/unlink 缺失；页面提示应给出可继续的本地操作。Headless fixture 覆盖“canIUse 允许但 showShareMenu 缺失”“方法缺失”“canIUse 拒绝”“wx 缺失”四类。
  - README 和执行日志新增运行时交接表，逐项列出需真实证据：导入/编译、四 Tab 首屏、分享面板与深链预填、权限拒绝/设置跳转、布局/安全区/字体/键盘、swiper/长按/滚动、图片保存/unlink、Storage quota 和进程中断。原有 `INVALID_LOGIN.../isMiniAppProject=false/Loading project all files...` 原文必须保留为阻塞证据。
  - 明确用户下一步：在开发者工具完成微信登录，再重新导入项目并记录版本/AppID、编译面板、模拟器路径、控制台和每项截图；仅在真实证据出现后更新对应状态。Executor 不得替用户声称完成。
- **验证命令**：

      node scripts/smoke-capabilities.js
      node scripts/validate-miniapp.js
      node scripts/smoke-pages.js
      rg -n 'button\.open-type\.share|showShareMenu|shareMenu|wx_missing|method_missing|can_i_use_denied|INVALID_LOGIN|access_token expired|isMiniAppProject|Loading project all files|BLOCKED|未验证' miniprogram scripts README.md .codex/plans

- **验收标准**：open-type 分享按钮探测不受无关菜单方法影响；原因矩阵稳定且不宣称授权成功；README/执行日志给出可执行登录后复核清单，阻塞原文和未验证边界完整；本地 smoke/静态审计通过。
- **风险/暂停条件**：将 headless `canIUse` 结果当成真实分享面板、误放开权限策略、改动 touristappid 或日志证据缺失时暂停；DevTools 登录仍未完成则 T5 只能交付材料，不能标记运行时通过。

### T6：v1.5 静态契约、PRD 缺口回归与文档收口

- **状态**：完成（静态契约与离线回归通过；微信运行时 BLOCKED / 未验证）。
- **任务目标**：把 T1–T5 的新行为加入可失败的静态审计和离线回归；同步 README/素材说明中的真实状态，明确专用状态 PNG 仍是 fallback；不隐藏失败分支。
- **涉及文件**：`scripts/validate-miniapp.js`、新增 `scripts/smoke-cat-interaction.js`、`smoke-photo-presenter.js`、`smoke-file-cleanup.js`、`smoke-care-atomic.js`；更新 `smoke-pages.js`、`smoke-local.js`、`smoke-capabilities.js`、`smoke-lifecycle.js`、`smoke-storage-atomic.js`；`README.md`、`miniprogram/assets/README.md`、四个 batiao 资源 README、必要时页面/组件 WXML/WXSS。
- **实现要点**：
  - 静态审计新增：cat tap/longpress 共用 handler、经验派生字段与两处 UI、uploader label 不泄露 ID、文件清理失败/重试契约、care eventId/失败码、share/open-type 与 menu 探测分离、无直接页面 Storage、无 raw stack/外链/凭据/TODO/旧版本。
  - 新 smoke 必须覆盖：tap/longpress 去重、经验升级前后进度、自己/伴侣/未知上传者标签、坏图 fallback、unlink/Storage 部分失败重试、24 小时 care dedupe 和隐私、share capability 四类原因。故意失败分支输出稳定 `*_FAIL` 并非零退出，不能捕获后继续 PASS。
  - README 只写当前代码和实际输出：应用 v1.4.0（若 Executor 明确决定应用版本再升为 v1.5.0，必须同时改 appMeta/审计且记录），schema 4/1.3、资源预算、文件清理重试、能力原因和状态 PNG fallback；不要把状态图、云同步或运行时验证写成已交付。
- **验证命令**：

      node scripts/validate-miniapp.js
      node scripts/smoke-cat-interaction.js
      node scripts/smoke-photo-presenter.js
      node scripts/smoke-file-cleanup.js
      node scripts/smoke-care-atomic.js
      node scripts/smoke-storage-atomic.js
      node scripts/smoke-invariants.js
      node scripts/smoke-recovery.js
      node scripts/smoke-lifecycle.js
      node scripts/smoke-local.js
      node scripts/smoke-pages.js
      node scripts/smoke-capabilities.js
      find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
      python3 - <<'PY'
      import json, pathlib
      for p in list(pathlib.Path('.').glob('*.json')) + list(pathlib.Path('miniprogram').rglob('*.json')):
          json.loads(p.read_text(encoding='utf-8'))
      print('ALL_JSON_OK')
      PY
      if rg -n 'wx\.(get|set|remove|clear)Storage(?:Sync)?' miniprogram/pages; then exit 1; else echo PAGE_STORAGE_LEAK=0; fi
      if rg -n 'https?://|api[_-]?key|secret|sk-[A-Za-z0-9]{8,}|TODO|FIXME|v1\.2\.0|v1\.3\.0' miniprogram README.md scripts project.config.json; then exit 1; else echo STATIC_RISK_SCAN=0; fi

- **验收标准**：静态审计和全部新旧 smoke 退出码为 0，输出包含稳定 `*_PASS`、实际断言数、`AUDIT_FILES`/资源 bytes、`SCHEMA_VERSION=4`、`ALL_JSON_OK`、`PAGE_STORAGE_LEAK=0` 和 `STATIC_RISK_SCAN=0`；README 与执行日志数字和代码一致；状态 PNG 缺口和游客 BLOCKED 原文仍可见。
- **风险/暂停条件**：契约只做字符串匹配、headless stub 与 Service 语义不一致、测试通过但仍有孤儿文件/重复写入、文档夸大能力时暂停；不得删除失败 fixture。

### T7：v1.5 最终离线验收与交付交接

- **状态**：完成（最终离线验收通过；微信运行时 BLOCKED / 未验证）。
- **任务目标**：以一次可复制命令集收口 v1.5，向后续 Executor/用户交付本地通过证据、变更清单、未验证边界和 DevTools 登录动作；不启动或假定 Executor/微信运行时已通过。
- **涉及文件**：README.md、miniprogram/assets/README.md（如需）、全部 scripts smoke/audit、.codex/plans/execution-log.md；按执行日志证据更新 .codex/plans/current.md 的任务状态。
- **实现要点**：
  - 严格顺序执行：archive check → asset audit → JS syntax → validate → cat/photo/cleanup/care/storage/invariant/recovery/lifecycle/local/page/capability smoke → JSON 解析 → page Storage scan → static risk scan；记录每条真实 stdout/退出码，不能手抄旧数字。
  - 复核工作区只含计划内文件修改，schema 4/1.3 未漂移，状态图仍只有 idle 且 fallback 文档一致；若新增图片必须重新计算 PNG/source-package 预算。
  - README/执行日志交接段保留阻塞原文：`INVALID_LOGIN, access_token expired [touristappid]`、`isMiniAppProject=false`、`Loading project all files...`、模拟器空白；写明完成微信登录后重新导入/编译和逐项截图/日志的下一步。
  - 最终报告必须区分“本地 PASS / headless PASS / 真实微信 BLOCKED”，列出 T0–T7 实际修改文件、断言和失败分支覆盖；不得宣称分享面板、renderer、权限、布局、键盘/手势、真实文件或 Storage quota 已通过。
- **验证命令**：

      python3 - <<'PY'
      import hashlib, pathlib
      p = pathlib.Path('.codex/plans/history/current-v1.4-2026-09-27.md')
      b = p.read_bytes()
      assert len(b) == 30351 and b.count(b'\n') == 310
      assert hashlib.sha256(b).hexdigest() == '80631f5015876673d890acaf4f29028b9de0ebf7bda11c66ae58dece83e037e0'
      print('V14_ARCHIVE_OK')
      PY
      node scripts/audit-assets.js
      find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
      node scripts/validate-miniapp.js
      node scripts/smoke-cat-interaction.js
      node scripts/smoke-photo-presenter.js
      node scripts/smoke-file-cleanup.js
      node scripts/smoke-care-atomic.js
      node scripts/smoke-storage-atomic.js
      node scripts/smoke-invariants.js
      node scripts/smoke-recovery.js
      node scripts/smoke-lifecycle.js
      node scripts/smoke-local.js
      node scripts/smoke-pages.js
      node scripts/smoke-capabilities.js
      python3 - <<'PY'
      import json, pathlib
      for p in list(pathlib.Path('.').glob('*.json')) + list(pathlib.Path('miniprogram').rglob('*.json')):
          json.loads(p.read_text(encoding='utf-8'))
      print('ALL_JSON_OK')
      PY
      if rg -n 'wx\.(get|set|remove|clear)Storage(?:Sync)?' miniprogram/pages; then exit 1; else echo PAGE_STORAGE_LEAK=0; fi
      if rg -n 'https?://|api[_-]?key|secret|sk-[A-Za-z0-9]{8,}|TODO|FIXME|v1\.2\.0|v1\.3\.0' miniprogram README.md scripts project.config.json; then exit 1; else echo STATIC_RISK_SCAN=0; fi

- **验收标准**：归档校验通过，所有本地命令退出码为 0，日志中包含实际资源/文件/断言数字和 v1.5 缺口修复结果；应用/schema/资源预算状态与文档一致；真实微信导入/编译/renderer/分享/权限/布局/输入/手势/文件/Storage 仍显式 BLOCKED，下一步交接可复现。
- **风险/暂停条件**：任一本地命令失败、归档 hash 改变、工作区出现计划外修改、文档与 stdout 不一致、孤儿/重复数据未解决或 runtime block 被写成 PASS 时暂停并报告具体证据。

## 5. 全局风险、暂停与证据规则

| 风险 | 识别证据 | 处理方式 |
| --- | --- | --- |
| 误判长按导致重复 pet | 同一 fixture 生成两次猫咪经验/心情写入 | T1 暂停，先修共享 handler/token，再进入 UI。 |
| 经验与成长条件混淆 | 个人页经验百分比与形态条件百分比不同或升级结果变化 | 保留两个字段/文案，补 fixture；不能把任一进度冒充另一项。 |
| 上传者隐私泄露 | WXML 显示 raw userId/openId/inviteCode 或 URL | T2 停止，改为本地 label 并扩展扫描。 |
| 文件/Storage 半成功 | unlink 失败后记录被删、clear 返回 ok=true、失败后无法重试 | T3 暂停，保留失败 fixture、路径和元数据；不清空掩盖。 |
| Care 局部失败/重复提醒 | event 写失败仍显示送达、同 tag 24h 重复、原始吐槽出现在 careMessage | T4 暂停，先建立可回滚顺序和稳定错误码。 |
| 分享能力误判 | open-type 可用但按钮被 disabled，或 canIUse 拒绝被写成可用 | T5 暂停并保持 reason/detail；等待真实 DevTools 复核。 |
| 资源缺口被冒充完成 | 没有专用状态 PNG 却文档写成已交付 | 保持 idle fallback 和待素材标记；不伪造文件/hash。 |
| 运行时登录阻塞 | `INVALID_LOGIN`、`isMiniAppProject=false`、持续 Loading 或模拟器空白 | 只更新交接材料和下一步；用户登录前保持 BLOCKED，不改 AppID/不伪造截图。 |
| schema/迁移风险 | 清理队列需要新字段、合法数据数/时间戳变化无法解释 | 停止并报告迁移设计，不自行升 schema。 |
| 远程依赖/凭据/计划外改动 | URL、api key、package/lockfile、非计划文件变化 | 立即停止并在执行日志记录完整路径和命令输出。 |

## 6. 最终报告要求

Executor 完成后必须向上游报告：

1. `current-v1.4-2026-09-27.md` 原样归档路径、30351 字节、310 行、SHA-256，以及新 `current.md` 的最终字节数、行数和 SHA-256。
2. T0–T7 各自状态、实际修改文件、每条验证命令退出码和关键实际输出；新 smoke 断言数、失败分支和回滚/重试证据。
3. 猫咪 tap/longpress 去重、经验派生和形态条件是否清楚分离；照片上传者 label 是否不泄露 ID；状态 PNG 是否仍为 idle fallback。
4. 文件 unlink/Storage 失败的 `failedFiles`/`failedKeys`、重试结果、共享引用保护和 schema 4/1.3 保持证据；关怀 eventId/24h 去重/局部失败结果。
5. 能力矩阵中 share/open-type/menu 的原因字段，以及游客运行时未验证项目。
6. 必须原样保留游客阻塞证据：`INVALID_LOGIN, access_token expired [touristappid]`、`isMiniAppProject=false`、`Loading project all files...`、模拟器空白；只能写成 BLOCKED / 未验证，并给出用户登录开发者工具后重试的操作步骤。
7. 不能把离线 PASS、headless wx stub、静态审计或 smoke 输出写成微信 renderer、分享面板、权限、布局、安全区、键盘/手势、真实文件系统或真实 Storage 生命周期已经通过。
