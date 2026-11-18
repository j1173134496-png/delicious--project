# Planner 计划：八条与你 v1.4 本地稳健性与运行时交接

## 1. 计划元信息与执行纪律

- **角色**：Planner Agent。本轮 Planner 只读取工程、归档上一轮计划并写入本文件；不修改 miniprogram/ 业务源码、配置、资源或 scripts/ 实现。允许修改的文件只有本轮归档文件、本计划和（如需）执行日志。
- **生成日期**：2026-09-27。
- **项目根目录**：/Users/lnp/Documents/ChatGPT/delicious- project。
- **上一轮计划原样归档**：.codex/plans/history/current-v1.3-2026-09-27.md。
  - 归档时存在性：yes。
  - 归档字节数：34333。
  - 归档行数：303。
  - 归档 SHA-256：cb8959094036192f945c45d37db8fe1afadcc03b18cc906c052f78e20bbedf61。
  - 归档必须保持为写入本计划前的 current.md 原文；如果未来发现同名归档已存在，只能使用唯一后缀归档，不得覆盖既有证据。
- **当前执行计划**：.codex/plans/current.md。
- **严格顺序**：Executor 必须按 T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7 串行执行。每完成一个任务，先运行该任务的全部验证命令，再把状态、实际修改文件、实际输出、未验证项和风险追加到 .codex/plans/execution-log.md，才能进入下一任务。失败、迁移结果无法解释、数据回滚不完整或发现运行时专属问题时暂停，不得跳过或以静态输出替代运行时证据。
- **离线边界**：继续使用原生微信小程序、Node/Python 标准库和当前系统工具；不安装 npm/第三方库，不接入网络、真实 LLM、云开发、云存储、openId 登录、通知推送、远程图片、外部字体或第三方测试框架。touristappid 仍只是游客/本地测试配置。
- **运行时边界**：当前只能做静态审计和 headless wx stub。微信开发者工具导入/编译、游客登录、分享面板、权限弹窗、基础库渲染、布局/安全区、键盘输入法、swiper/滚动/长按、真实文件系统和 Storage quota 必须写成 BLOCKED / 未验证，不能从 Node 结果推断通过。

## 2. v1.3 基线复核与状态

### 2.1 已复跑的离线基线（2026-09-27）

以下命令在当前工作区实际退出码均为 0；这些是 v1.3 离线证据，不是微信运行时证据。

| 命令 | 实际关键输出 |
| --- | --- |
| node scripts/audit-assets.js | ASSET_CAT_COUNT=4、ASSET_CAT_BYTES=1374256、ASSET_MINIPROGRAM_BYTES=1570887、ASSET_ERRORS=0、ASSET_WARNINGS=0 |
| node scripts/validate-miniapp.js | ASSET_AUDIT=PASS、AUDIT_FILES=116、ERRORS=0、WARNINGS=0 |
| node scripts/smoke-local.js | SMOKE_LOCAL=PASS、SCHEMA_VERSION=4、RECIPES=12 |
| node scripts/smoke-pages.js | SMOKE_PAGES=PASS、ASSERTIONS=59、LOCAL_FEEDBACK=0 |
| node scripts/smoke-capabilities.js | SMOKE_CAPABILITIES=PASS、CAPABILITY_ASSERTIONS=10 |
| find + xargs 执行全部 JS node --check | 无输出，退出码 0 |
| 根目录及 miniprogram/**/*.json Python 解析 | ALL_JSON_OK |

### 2.2 v1.3 已完成项

- v1.3 T0–T7 已在 .codex/plans/execution-log.md 记录完成：资源预算/透明 PNG、四级形态和状态 idle fallback、schema 4/1.3 迁移去重、媒体引用安全、记录和 Storage 边界、游客能力探测、错误文案/失败回滚、离线 release-readiness 汇总。
- miniprogram/assets/batiao/{lv1-baby,lv2-genki,lv3-jk,lv4-bride}/idle.png 四张形态图均存在、RGBA、长边不超过 640 px，资产审计引用完整。状态专用 PNG 仍不存在，happy/eating/sad 使用 idle + CSS + Emoji fallback。
- miniprogram/utils/runtimeCapabilities.js 固定无 wx 的 node-local fallback 和 wx 游客模式；代码没有启用 wx.login、云请求或远程同步。
- 页面、Service 和脚本均保持本地 Storage/文件系统抽象；反馈明确标记仅保存在本设备，分享只预填邀请码，不能描述为跨设备同步。

### 2.3 已核对的 v1.4 缺口（可在当前环境本地完成）

1. miniprogram/pages/about/about.wxml 仍显示 v1.2.0，而 app.js、设置页和 README 已为 v1.3；现有静态审计没有检查用户可见版本的一致性。
2. storageService.writeRaw() 先改内存再调用 wx.setStorageSync()，原生写失败时内存可能已改变；deleteRaw() 忽略原生删除失败；多个 Service 仍调用兼容的 storage.set()，页面无法区分真正保存与失败。需要 checked 原子写入、删除和清除结果，但不能破坏旧 API。
3. app.js 只把初始化异常写入 globalData.initializationError，没有首屏可见的恢复提示和可重试入口；初始化各阶段也没有可诊断状态。
4. 聊天和上传/编辑页使用未登记的 setTimeout 延迟状态或导航，页面隐藏/卸载后没有统一清理或 token 防护；现有 headless smoke 没有覆盖页面生命周期和过期异步回调。
5. capability snapshot 目前只有布尔值，不能区分 wx 缺失、canIUse 拒绝和方法缺失；页面降级文案虽存在，但没有一份可审计的能力原因矩阵。
6. validate-miniapp.js 没有检查旧版本字符串、Service 是否吞掉 checked 写失败、清除失败清单、模型输入不变量或启动恢复契约；当前 smoke 也没有覆盖原生 Storage 写/删失败后的回滚。

### 2.4 明确 BLOCKED 的运行时证据

- 执行日志已记录微信开发者工具 Stable 2.02.2608070 使用 touristappid 打开项目后，编译面板持续 Loading project all files...，模拟器路径保持空白。
- 开发者工具日志给出 INVALID_LOGIN, access_token expired [touristappid]，同一初始化流程有 isMiniAppProject=false。临时切换 miniprogramRoot 和 useStaticServer 后已恢复原配置，未形成运行时通过证据。
- 因游客登录令牌失效，v1.4 仍必须把导入/编译、四 Tab 渲染、分享面板、权限、布局/安全区、键盘/手势、真实文件和 Storage 生命周期写为 BLOCKED / 未验证；只有用户在开发者工具登录并重新编译后，才能追加真实截图/日志。

## 3. v1.4 目标、边界与交付物

### 3.1 目标

- 统一用户可见的 v1.4 版本和本地游客模式文案，静态审计能阻止旧版本/冲突版本回归。
- 让原生 wx Storage 写入、删除和清除具备原子结果与可诊断错误；Service 和页面不把失败写入显示成成功。
- 加强现有 v1.3 数据模型的输入不变量、迁移幂等和错误计数，保持合法旧数据与 schema 4/1.3 兼容。
- 提供启动失败的可见提示、阶段信息和可重试路径；能力快照同时保留布尔结果与失败原因。
- 统一页面异步生命周期和延迟任务清理，证明隐藏/卸载后不会更新页面或重复写入。
- 扩展离线契约、headless smoke 和文档，形成 v1.4 可复制的“本地通过 / 微信运行时 BLOCKED”交接包。

### 3.2 不做

- 不把游客 AppID 变成正式 AppID，不启用登录、openId、云同步、真实情侣跨设备绑定、推送或真实 LLM。
- 不新增远程资源或第三方依赖，不用删除合法记录、清空 Storage 或降低上限来掩盖失败。
- 不伪造开发者工具/真机结果；任何必须由微信 renderer、系统权限或真实文件系统证明的项目都只能记录为 BLOCKED。
- 除非 T3 的 fixture 证明必须迁移，否则不升高 SCHEMA_VERSION=4/SCHEMA_NAME=1.3；应用版本 v1.4 与数据 schema 版本保持明确分离。

## 4. 严格串行任务

### T0：冻结 v1.3 基线、归档校验与缺口快照

- **状态**：完成。
- **目标**：确认 Executor 从本轮归档的 v1.3 计划和当前代码开始，复现离线基线并把本节列出的缺口固定为 v1.4 起点。
- **涉及文件**：只读 .codex/plans/history/current-v1.3-2026-09-27.md、PRD-情侣小程序「八条与你」.md、README.md、.codex/plans/execution-log.md、miniprogram/**、scripts/**、project.config.json、project.private.config.json；只允许追加 .codex/plans/execution-log.md。
- **实现要点**：
  - 用 Python hashlib 校验归档存在、303 行、34333 字节和 SHA-256 cb8959094036192f945c45d37db8fe1afadcc03b18cc906c052f78e20bbedf61，确认归档字节与写入本计划前的 current.md 一致。
  - 按顺序运行资源审计、JS 语法、静态审计、Service/page/capability smoke、JSON 解析、页面 Storage 越层和静态风险扫描；记录真实文件数、资源 bytes、schema、断言数。
  - 用 rg 固定 v1.2.0、storage.set(、initializationError、裸 setTimeout、onHide/onUnload 等后续任务的审计入口；不得在 T0 修业务代码。
- **验证命令**：

      python3 - <<'PY'
      import hashlib, pathlib
      p = pathlib.Path('.codex/plans/history/current-v1.3-2026-09-27.md')
      b = p.read_bytes()
      assert len(b) == 34333 and b.count(b'\n') == 303
      assert hashlib.sha256(b).hexdigest() == 'cb8959094036192f945c45d37db8fe1afadcc03b18cc906c052f78e20bbedf61'
      print('V13_ARCHIVE_OK')
      PY
      node scripts/audit-assets.js
      find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
      node scripts/validate-miniapp.js
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

- **验收标准**：归档校验输出 V13_ARCHIVE_OK；上述命令全部退出码 0，并取得 v1.3 基线关键输出；日志保留游客登录失效造成的 BLOCKED 证据；T0 不出现业务文件修改。
- **风险/暂停条件**：归档 hash/字节/行数不符、任一基线失败、发现计划外业务修改、出现登录/远程依赖命中时暂停并报告，不能进入 T1。

### T1：v1.4 版本与游客模式单一事实来源

- **状态**：完成。
- **目标**：修复关于页 v1.2.0 过期文案，把应用、设置、关于、README 和静态审计统一到 v1.4.0，同时继续明确本机游客模式和未接入的云/LLM 边界。
- **涉及文件**：新增 miniprogram/utils/appMeta.js；更新 miniprogram/app.js、miniprogram/pages/about/about.js、miniprogram/pages/about/about.wxml、miniprogram/pages/settings/settings.js、miniprogram/pages/settings/settings.wxml、README.md、scripts/validate-miniapp.js、scripts/smoke-pages.js；必要时更新对应 WXSS。
- **实现要点**：
  - 在 appMeta.js 集中导出 APP_VERSION='1.4.0'、本地模式名称和不可用能力说明；app.js 的 globalData.version 与页面 data 从此来源读取，不在 WXML/JS 复制旧版本字面量。
  - 关于页与设置页通过页面 data 展示版本和“当前设备本地保存、分享只预填邀请码、真实 LLM/云同步/远程反馈未接入”文案；保留可滚动内容和反馈入口。
  - validate-miniapp.js 检查版本来源、四处用户可见文案一致、禁止 v1.2.0/与 APP_VERSION 冲突的 v1.x；README 的命令和运行时检查表改为 v1.4，不能把运行时 BLOCKED 改写为通过。
  - headless 页面加载时断言关于/设置的 data 使用 v1.4.0；不依赖微信 API 才能读取版本。
- **验证命令**：

      rg -n 'v1\.2\.0|v1\.3\.0|APP_VERSION|globalData|本机游客|真实 LLM|云同步' miniprogram README.md scripts
      node --check miniprogram/utils/appMeta.js
      node --check miniprogram/app.js
      node --check miniprogram/pages/about/about.js
      node --check miniprogram/pages/settings/settings.js
      node scripts/validate-miniapp.js
      node scripts/smoke-pages.js
      node scripts/smoke-capabilities.js

- **验收标准**：v1.2.0 和孤立的 v1.3.0 不再出现在用户可见页面；应用、设置、关于和 README 均显示 v1.4.0；静态审计能在版本冲突时非零退出；游客/本机/未接入边界仍可见，现有离线 smoke 全通过。
- **风险/暂停条件**：版本字符串仍有多份不可解释来源、页面首次加载没有 data、动态绑定破坏 WXML 或 README 误称云/运行时已通过时暂停；不在 T1 修改数据 schema。

### T2：Storage 原子写入、删除与清除结果

- **状态**：完成。
- **目标**：修正 v1.3 checked Storage 的失败语义，使 wx 原生写/删失败不会污染内存或页面成功状态，并让清除操作报告每个失败 key/文件。
- **涉及文件**：miniprogram/services/storageService.js、userService.js、catService.js、chatService.js、recipeService.js、albumService.js、feedbackService.js、miniprogram/utils/errorMessage.js；相关页面 chat、profile-edit、album-upload、recipe-add、recipe-detail、feedback、settings；新增 scripts/smoke-storage-atomic.js，必要时扩展 scripts/smoke-pages.js 和 scripts/validate-miniapp.js。
- **实现要点**：
  - writeRaw/setChecked 先 clone 并尝试原生 wx.setStorageSync，成功后才提交内存镜像；失败时保留旧值，返回稳定的 storage_write_failed/storage_quota 结果并累计 diagnostics。无 wx 的内存 fallback 保持可用且标明 mode=memory。
  - 增加 checked 的单 key 删除/全量清除结果（例如 removeChecked、clearChecked），原生删除失败不得静默丢掉诊断；兼容的 set/remove/clear API 继续存在，但 Service 内部不能用它们吞掉需要呈现的失败。
  - user/cat/chat/recipe/album/feedback 的关键写入统一走 checked 结果，保持旧调用方返回形状或提供兼容包装；clearLocalData() 汇总 failedFiles 与 failedKeys，只有文件和 Storage 都完成才报告 ok=true，失败时仍可重试并恢复默认结构。
  - 文件批量保存/删除的现有回滚和引用安全规则必须保留；不能因为 Storage 失败而留下成功 metadata 或孤儿文件。
- **验证命令**：

      node scripts/smoke-storage-atomic.js
      node scripts/smoke-local.js
      node scripts/smoke-pages.js
      find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
      rg -n 'setChecked|removeChecked|clearChecked|storage_write_failed|storage_quota|failedKeys|failedFiles' miniprogram scripts
      if rg -n 'storage\.set\(|storage\.remove\(|storage\.clear\(' miniprogram/services; then echo SERVICE_UNCHECKED_WRITE=1; exit 1; else echo SERVICE_UNCHECKED_WRITE=0; fi

- **验收标准**：headless wx stub 的写失败、删失败、quota 和部分清除均能复现；失败前的 Storage 值保持不变，页面 busy/finally 复位，用户得到可重试文案；清除结果包含失败清单且不伪造 ok=true；无 wx 的本地 smoke 与 v1.3 语义保持通过。
- **风险/暂停条件**：无法证明失败不污染内存、兼容 API 被破坏、清除误删合法文件、批量回滚留下 metadata/文件孤儿时暂停；真实微信 Storage 单位、进程中断和系统文件时序仍标记 BLOCKED。

### T3：模型不变量、迁移幂等与 Service 输入边界

- **状态**：完成。
- **目标**：在不升高 schema 4/1.3 的前提下，补齐恶意/损坏/边界输入的确定性归一化，确保初始化重复执行不改变合法数据，并把丢弃原因写入诊断。
- **涉及文件**：miniprogram/models/user.js、cat.js、chat.js、recipe.js、photo.js、feedback.js；miniprogram/services/storageService.js、recipeService.js、albumService.js、chatService.js、feedbackService.js、userService.js；miniprogram/utils/dateUtil.js（仅必要时）；新增 scripts/smoke-invariants.js；更新 scripts/validate-miniapp.js、scripts/smoke-local.js。
- **实现要点**：
  - 固定昵称/签名/备注/反馈/标签长度、评分 0–5、菜谱分类白名单、照片日期和 month 一致性、聊天/关怀/反馈上限、布尔开关和非负计数；对 NaN、未来日期、空 ID、坏路径、未知类型给出安全 fallback 或可解释 dropped 计数。
  - 迁移 fixture 覆盖缺失 ID、重复 ID、同 ID 字段完整度/时间冲突、重复图片路径、非法集合、过长文本和旧 schema；保留合法字段，稳定生成 ID，第二次 initialize 的值、时间戳和计数保持不变。
  - Service 层继续拒绝重复 recipeId/photoId 和受管图片路径；输入数组必须在上限前拒绝或完整处理，不能用静默 slice 丢掉用户刚提交的内容。
  - 若 fixture 证明必须新增字段，先停止并报告迁移设计；默认保持 SCHEMA_VERSION=4/SCHEMA_NAME=1.3，并在 README 明确“应用 v1.4 不等于数据 schema 5”。
- **验证命令**：

      node scripts/smoke-invariants.js
      node scripts/smoke-local.js
      node --check miniprogram/services/storageService.js
      node --check miniprogram/models/recipe.js
      node --check miniprogram/models/photo.js
      node scripts/validate-miniapp.js
      python3 - <<'PY'
      import json, pathlib
      for p in list(pathlib.Path('.').glob('*.json')) + list(pathlib.Path('miniprogram').rglob('*.json')):
          json.loads(p.read_text(encoding='utf-8'))
      print('ALL_JSON_OK')
      PY

- **验收标准**：fixture 输出明确的 repaired/deduped/dropped/failed，只丢弃可证明损坏项；合法 v1.3 资料、菜谱、照片、聊天和设置保留；重复 initialize 幂等；模型/Service 边界失败可诊断；schema 仍为 4/1.3，全部本地 smoke 通过。
- **风险/暂停条件**：字段丢失无法解释、重复记录选择不确定、日期/图片路径归一化改变合法用户内容、需要未经设计的 schema 升级时暂停；不得用 storage.clear() 让 fixture 通过。

### T4：应用启动状态、失败恢复与能力原因矩阵

- **状态**：完成。
- **目标**：把本地初始化失败从仅有日志升级为首屏可见、可重试、不会清空数据的恢复路径，并让 capability snapshot 说明“缺 wx / canIUse 拒绝 / 方法不存在”的原因。
- **涉及文件**：miniprogram/app.js、miniprogram/utils/runtimeCapabilities.js、miniprogram/utils/appMeta.js；首屏 miniprogram/pages/chat/chat.js、chat.wxml、chat.wxss；必要时 settings 页面；新增 scripts/smoke-recovery.js；更新 scripts/smoke-capabilities.js、scripts/smoke-pages.js、scripts/validate-miniapp.js、README.md。
- **实现要点**：
  - 将初始化拆为可诊断阶段（Storage、用户/猫、默认菜谱、欢迎消息、相册），在 globalData 保留 initialized、阶段、错误 code、retryable 和 capabilities；保留当前默认数据和版本语义。
  - 提供 retryInitialization() 或等价接口，失败后不清空已有合法数据；成功重试刷新 globalData 并让当前页重新加载，重复点击不会并发初始化。
  - 聊天首屏显示简短的本地初始化失败/能力提示和“重试”入口；成功或无错误时不遮挡正常聊天。能力详情可在设置/关于页查看，但不暴露原始 stack。
  - runtimeCapabilities 返回每项能力的 boolean 与原因，同时继续固定 login=false/cloud=false/remoteSync=false；覆盖 chooseImage/chooseMedia/clipboard/saveImage/navigate/share/storage/fileSystem，无 wx 不在模块加载时抛异常。
- **验证命令**：

      node scripts/smoke-recovery.js
      node scripts/smoke-capabilities.js
      node scripts/smoke-pages.js
      node scripts/validate-miniapp.js
      node --check miniprogram/app.js
      node --check miniprogram/utils/runtimeCapabilities.js
      rg -n 'retryInitialization|initializationError|initializationStage|reason|login|cloud|remoteSync' miniprogram scripts README.md

- **验收标准**：headless stub 注入各初始化阶段失败时页面不崩溃、错误可见且可重试；恢复后数据和首屏状态正确；能力拒绝矩阵输出确定原因；没有登录/云请求/外部 URL；无 wx fallback 和 v1.3 smoke 全通过。
- **风险/暂停条件**：重试清空数据、初始化并发重复写、首屏在失败时不可操作、能力原因被误当作真实授权成功时暂停；真实游客登录/编译和权限弹窗仍为 BLOCKED。

### T5：页面生命周期、延迟任务与异步回调安全

- **状态**：完成。
- **目标**：统一清理聊天状态动画、延迟返回和异步文件写入，证明页面隐藏/卸载后不会更新已失效页面、重复 toast 或重复写入。
- **涉及文件**：可新增 miniprogram/utils/pageTask.js（或等价的轻量任务注册器）；miniprogram/pages/chat/chat.js、album/album.js、album-upload/album-upload.js、recipe-add/recipe-add.js、recipe-detail/recipe-detail.js、profile-edit/profile-edit.js、bind/bind.js、feedback/feedback.js；必要时相关 WXML；新增 scripts/smoke-lifecycle.js；更新 scripts/validate-miniapp.js、scripts/smoke-pages.js。
- **实现要点**：
  - 页面级任务注册、取消和 token guard：onHide/onUnload 清理可取消 timer；异步结果在页面 inactive 或 token 过期时不再 setData/toast，但文件/Storage 回滚仍完成。
  - 发送、喂食、抚摸、延迟导航、选图/保存/删除/签名等 busy 标志在 success/fail/throw/finally 复位；重复点击只产生一次 Service 写入；页面重新 onShow 从 Service 重新加载。
  - 不改变 PRD 的动画时长、照片 9 张上限、聊天/反馈边界或本地模式；不要用全局定时器、无限重试或缓存掩盖生命周期问题。
- **验证命令**：

      node scripts/smoke-lifecycle.js
      node scripts/smoke-pages.js
      find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
      rg -n 'onHide|onUnload|clearTimeout|pageTask|token|finally|saving|sending|choosing|deleting' miniprogram/pages miniprogram/utils scripts

- **验收标准**：headless 生命周期 harness 在隐藏/卸载后 flush timers 不产生 setData、toast 或重复写；取消/权限/文件失败和重复点击都复位 busy；重新显示页面能从本地 Service 恢复；所有 JS 语法和既有 smoke 通过。
- **风险/暂停条件**：异步文件写入被错误取消造成孤儿文件、页面再次显示状态丢失、任务清理依赖微信专属行为而无法在 Node 证明时暂停；renderer 事件顺序、真实键盘/手势继续 BLOCKED。

### T6：v1.4 页面契约、错误可见性与离线回归扩展

- **状态**：完成。
- **目标**：把 T1–T5 的约束纳入一个可失败的静态契约和 headless 回归，覆盖当前未验证的本地边界，同时修正 README/关于/隐私/设置中的过期描述。
- **涉及文件**：scripts/validate-miniapp.js、scripts/smoke-pages.js、scripts/smoke-local.js、scripts/smoke-capabilities.js、scripts/smoke-storage-atomic.js、scripts/smoke-invariants.js、scripts/smoke-recovery.js、scripts/smoke-lifecycle.js；README.md、miniprogram/pages/about/about.wxml、privacy/privacy.wxml、settings/settings.wxml；必要时页面/组件 JS/WXML。
- **实现要点**：
  - 静态审计新增：版本单一来源与旧版本扫描、Service checked 写入/清除契约、启动 retry hook、能力原因字段、页面生命周期 hook、四件套/TabBar/sitemap/asset/fallback、无直接页面 Storage、无 raw stack/外链/凭据/TODO。
  - Headless 回归新增：初始化失败重试、Storage 写/删/清除失败、模型坏输入/迁移幂等、图片错误占位、预览越界、分享/复制/选图/保存相册降级、关怀设置/去重、busy 和生命周期 token。
  - 失败脚本必须输出稳定的 *_FAIL 和非零退出，不捕获后继续打印 PASS；测试故意失败分支时静默内部 stack，但保留可检查的 code/message。
- **验证命令**：

      node scripts/validate-miniapp.js
      node scripts/smoke-storage-atomic.js
      node scripts/smoke-invariants.js
      node scripts/smoke-recovery.js
      node scripts/smoke-lifecycle.js
      node scripts/smoke-local.js
      node scripts/smoke-pages.js
      node scripts/smoke-capabilities.js
      if rg -n 'wx\.(get|set|remove|clear)Storage(?:Sync)?' miniprogram/pages; then exit 1; else echo PAGE_STORAGE_LEAK=0; fi
      if rg -n 'https?://|api[_-]?key|secret|sk-[A-Za-z0-9]{8,}|TODO|FIXME|v1\.2\.0' miniprogram README.md scripts project.config.json; then exit 1; else echo STATIC_RISK_SCAN=0; fi

- **验收标准**：静态审计和全部新旧 smoke 全部退出码 0；失败分支有稳定断言；页面没有直接 Storage 或 raw stack；版本/游客/离线边界与 README 一致；没有因测试引入 npm、远程 URL 或凭据。
- **风险/暂停条件**：契约只用字符串匹配而漏掉真实失败、headless stub 与 Service 语义不一致、测试通过但数据回滚不完整时暂停修复；不能把此任务的 PASS 描述成微信 renderer PASS。

### T7：v1.4 最终离线验收、文档与运行时交接清单

- **状态**：完成。
- **目标**：以一次可复制命令集收口 v1.4，并把离线通过、已知限制和游客登录阻塞证据交付给后续需要在开发者工具/真机复核的人。
- **涉及文件**：README.md、miniprogram/assets/README.md（如需补充版本/资源边界）、scripts/validate-miniapp.js 及全部 smoke/asset 脚本、.codex/plans/execution-log.md；只按证据更新 .codex/plans/current.md 的任务状态。
- **实现要点**：
  - 顺序执行：asset audit → JS check → validate → storage/invariant/recovery/lifecycle/local/page/capability smoke → JSON 解析 → 页面 Storage 越层 → static risk scan；记录真实输出、资源 bytes、文件数、schema、版本和断言数。
  - README 更新 v1.4 导入说明、版本单一来源、原子 Storage/清除诊断、启动重试、生命周期保护、能力原因、数据 schema 4/1.3 兼容和新增脚本；保留四张 idle 素材与状态 fallback 说明。
  - 运行时交接段原样列出：INVALID_LOGIN, access_token expired [touristappid]、isMiniAppProject=false、持续 Loading project all files...、模拟器空白；明确需要用户登录开发者工具后重新导入/编译并逐项截图/日志，当前结论仍是 BLOCKED / 未验证。
  - 最终扫描不能隐藏失败；执行日志逐任务记录实际修改文件、验证命令、关键输出、未验证项和风险。
- **验证命令**：

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
      if rg -n 'https?://|api[_-]?key|secret|sk-[A-Za-z0-9]{8,}|TODO|FIXME|v1\.2\.0' miniprogram README.md scripts project.config.json; then exit 1; else echo STATIC_RISK_SCAN=0; fi

- **验收标准**：所有本地命令退出码 0，输出包含 ASSET_ERRORS=0、ASSET_WARNINGS=0、AUDIT_FILES=...、ERRORS=0、WARNINGS=0、各 SMOKE_* =PASS、ALL_JSON_OK、PAGE_STORAGE_LEAK=0、STATIC_RISK_SCAN=0；README/执行日志与实际数字一致；v1.3 归档 hash 不变；运行时导入/编译/权限/渲染/真实文件仍显式 BLOCKED，不能写成 release 已在微信通过。
- **风险/暂停条件**：任一本地命令失败、文档与代码/输出不一致、包体/资源超限、归档改变或 runtime block 被误报为通过时暂停并报告具体证据；不得为了收口删除数据、跳过 smoke 或伪造截图。

## 5. 全局风险、暂停与证据规则

| 风险 | 识别证据 | 处理方式 |
| --- | --- | --- |
| 原生 Storage 写失败污染内存 | wx stub 中 setStorageSync 抛错但旧值改变 | 立即暂停 Service 写入，先修正提交顺序和 checked 结果；保留失败 fixture |
| 删除/清除半成功 | remove/unlink 失败后返回 ok=true 或无失败清单 | 停止后续任务，报告 failed keys/files 和可重试路径；不清空合法数据 |
| 迁移丢合法记录 | fixture 数量、字段、ID、时间戳变化无法解释 | 保留 fixture/日志，回滚实现后重新验证；不升 schema 规避问题 |
| 页面生命周期竞态 | hidden/unload 后 setData、重复 toast、孤儿文件 | 暂停页面改动，先修 token/清理和异步回滚；不能用更长延时掩盖 |
| 游客能力/登录阻塞 | DevTools INVALID_LOGIN、isMiniAppProject=false 或权限弹窗无法出现 | 记录 BLOCKED / 未验证 和用户操作步骤；不把 Node/headless 结果提升为运行时结论 |
| 依赖/远程资源/敏感信息意外引入 | package/lockfile、HTTP URL、外部图片、密钥扫描命中 | 停止并移除或报告；本轮不接受第三方依赖 |
| 资源或源包预算回归 | audit-assets.js 非零或总 bytes 超限 | 暂停并报告实际 bytes/尺寸；不能删除素材掩盖超限，也不能冒充 DevTools 压缩结果 |

## 6. 最终交付报告要求

Executor 完成后必须报告：

1. 上一轮原样归档路径、字节数、行数和 SHA-256；本轮计划路径及其存在性/校验信息。
2. T0–T7 各自状态、实际修改文件、验证命令和关键实际输出；新 smoke 脚本的断言数和失败分支覆盖。
3. schema 4/1.3 是否保持、合法旧数据保留和清除失败清单证据；版本/游客模式文案是否一致。
4. 仍然 BLOCKED / 未验证 的微信开发者工具/真机项目，必须包含游客 access_token expired 证据和下一步真实验证步骤。
5. 不得把离线 PASS、headless wx stub 或静态审计写成微信 renderer、分享面板、权限、布局、键盘、手势、Storage/file 生命周期已通过。

