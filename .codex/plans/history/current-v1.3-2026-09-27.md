# Planner 计划：八条与你 v1.3 release-readiness

## 1. 计划元信息与执行纪律

- 角色：Planner Agent。本阶段只检查工作区、归档旧计划并写入本计划；Planner 不修改业务源码、配置、资源或测试脚本。
- 生成日期：2026-09-27。
- 项目根目录：`/Users/lnp/Documents/ChatGPT/delicious- project`。
- 上一阶段计划已由 Planner 原样归档为：`.codex/plans/history/current-v1.2-2026-09-27.md`。
- 当前执行计划：`.codex/plans/current.md`。
- Executor 必须在修改任何业务代码前完整读取本文件和上一阶段归档；只能按 **T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7** 顺序执行，不能并行、跳过或把后一个任务的验证提前当作前一个任务的完成证据。
- Executor 每完成一个任务，必须先执行该任务列出的验证命令，再把“状态、实际修改文件、命令、实际输出、未验证项、风险”追加到 `.codex/plans/execution-log.md`，然后才能开始下一个任务。命令失败、数据迁移无法证明保留、资源预算无法达标或出现运行时专属问题时，应按暂停条件停止并报告，不得用静态结果伪造运行时通过。
- 本阶段继续使用原生微信小程序、Node/Python 标准库和当前系统已有工具；不引入 npm/第三方库、真实 LLM、网络、云开发、云存储、openId 登录、推送、远程图片、外部字体或第三方测试框架。
- `touristappid` 只代表游客/本地测试配置。所有绑定、资料、聊天、反馈和图片仍是当前设备/本地模式，不能把游客 AppID 下的本地模拟写成真实跨设备同步或正式发布能力。
- 没有微信开发者工具或真机时，只能执行离线审计和 headless smoke；导入编译、分享面板、权限、基础库布局、安全区、键盘、swiper/滚动/长按和真实文件生命周期必须明确标为 `BLOCKED / 未验证`。

## 2. 当前项目理解和现状证据

### 2.1 工程基线

- 工程是原生小程序，入口为 `miniprogram/`，四个 Tab 为八条、菜谱、相册、我的；没有 `package.json`、lockfile 或第三方运行时依赖。
- `project.config.json` 当前设置 `appid: "touristappid"`、`miniprogramRoot: "miniprogram/"`、`libVersion: "3.4.3"`；`project.private.config.json` 只有本地 DevTools 设置，不能作为正式 AppID 或云配置来源。
- `miniprogram/app.json` 已登记 13 个页面、四个 TabBar 图标、`sitemapLocation: "sitemap.json"` 和 `lazyCodeLoading: "requiredComponents"`；`miniprogram/app.js` 的本地版本仍为 `1.2.0`。
- 当前离线基线实际通过：
  - `node scripts/validate-miniapp.js` → `AUDIT_FILES=113`、`ERRORS=0`、`WARNINGS=0`。
  - `node scripts/smoke-local.js` → `SMOKE_LOCAL=PASS`、`SCHEMA_VERSION=3`、`RECIPES=12`。
  - `node scripts/smoke-pages.js` → `SMOKE_PAGES=PASS`、`ASSERTIONS=45`、`LOCAL_FEEDBACK=0`（末值是清理后的状态，不代表没有执行）。
  - `find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check` 退出码 0；根目录和 `miniprogram/**/*.json` 解析输出 `ALL_JSON_OK`；页面没有直接调用 `wx.*Storage*`。
- 当前没有微信开发者工具命令或真机环境，README 已将运行时验证列为未完成；以上命令只证明离线代码分支和静态结构，不能证明微信导入、编译或渲染通过。

### 2.2 四级八条素材的实际证据

- `miniprogram/assets/batiao/{lv1-baby,lv2-genki,lv3-jk,lv4-bride}/idle.png` 均存在，均为 8-bit RGBA PNG、带 alpha。
- 当前四张图的尺寸和体积为：Lv.1 `1145x1374 / 1,170,090 bytes`，Lv.2 `1145x1374 / 1,211,175 bytes`，Lv.3 `1145x1374 / 1,130,740 bytes`，Lv.4 `1221x1289 / 1,162,412 bytes`；四张合计 `4,674,417 bytes`，整个 `miniprogram/` 非空文件约 `4,838,057 bytes`。
- `models/cat.js:4-8` 的 `FORM_META` 已把四个 `imagePath` 指向四张图，但路径目前没有统一的根路径约定（写作 `assets/...`），需要在可验证的约定下修正并检查运行时相对路径风险。
- 当前素材只有 `idle.png`。`CAT_STATES` 只有 `idle/happy/eating/sad` 文案（`models/cat.js:11-16`），`cat-display.wxss:11-14` 用 CSS class 做动画；`cat-display.js` 和 profile 只选择单张 idle 图并在 `binderror` 后回退 Emoji。状态图不存在，不能在文档中暗示四套状态 PNG 已完成。
- 现有四张主图尺寸和体积使整个主包预估超过微信小程序常见 2 MiB 主包约束；当前审计只检查存在性，没有检查主图体积、尺寸、alpha、重复哈希、未引用大文件或加载失败分支。T1 必须先完成资源预算审计和可回退接入。

### 2.3 实际仍缺失的本地可完成工作

1. **素材预算和映射**：没有专门资源审计；四张主图约 4.67 MB；路径、状态到素材的映射和根路径契约没有统一测试。已有 `binderror`/Emoji 回退，但没有覆盖四个形态与四个状态的静态/离线矩阵。
2. **状态表现**：状态元数据只有 label，动画 class 分散在组件 WXSS；profile 固定 idle；没有明确“状态图片缺失时沿用 idle + CSS”的共享 API，未来补图容易让页面各自硬编码。
3. **数据完整性**：`storageService.initialize()`（`storageService.js:102-143`）只把集合修成数组，没有归一化或去重 recipes/photos/chats/careEvents/feedback；实测重复 `recipeId` 能被 `recipeService.create()` 保存两次，重复 photoId 也会在 initialize 后保留。schema 当前为数值 3/名称 `1.2`。
4. **媒体生命周期**：`recipeService.addPhotos()`、`albumService.createMany()` 会按调用次数写记录；文件名基于时间和序号，重复选择/快速重复调用可能产生重复记录或路径碰撞；删除一条记录时没有判断同一文件路径是否仍被其他记录引用。`clearLocalData()` 已等待受管文件清理，但对非本地头像/共享路径、重复引用和写入失败的结果还需要可验证边界。
5. **列表和写入边界**：聊天/关怀/反馈已有 20/50/50 的局部上限，菜谱和相册总记录没有统一上限或空间提示；相册批量写入逐条 `create()`，可能反复读取/写入 Storage；页面每次 `onShow` 全量读取列表，没有统一的本地容量/记录上限契约。
6. **游客能力降级**：代码只在少数页面检查 `wx` API 是否存在，没有统一 capability 检测；缺少 `wx.canIUse`/剪贴板/分享/图片/文件系统/Storage 能力的可见状态。游客 AppID 下必须保留复制、Emoji/内存 fallback 等替代路径，不能假设登录、云同步或分享一定可用。
7. **构建导入契约**：已有配置可读，但静态审计没有验证 AppID 类型、根目录、private 配置冲突、sitemap/页面/TabBar 一致性和包体预算；README 的导入清单仍是 v1.2，未给出 release-readiness 预检输出和游客能力边界。
8. **用户可见错误文案**：图片选择 fail 回调把取消、权限拒绝和异常都显示为“没有选择照片”；保存相册、复制、文件保存、Storage 写入失败和导航失败的提示较笼统，部分 Service 会在文件/Storage 失败时回退或吞掉异常而让页面继续显示成功。需要集中映射可恢复错误并保证 busy/finally 和数据一致性。

### 2.4 已有能力和本阶段不重做的内容

- v1.2 已完成 PRD 的四级成长规则、邀请码 query 预填和本地分享、关于/隐私/反馈页面、profile 统计、页面级 headless smoke、图片失败回退、TabBar PNG、Storage v1.2 迁移和静态路由审计。
- 本阶段不重做真实 LLM、情绪云分析、云同步、通知推送、真实跨设备绑定、后台反馈、菜谱默认内容或新的远程素材；只加固本地模式使其适合导入前 release-readiness 检查。

## 3. v1.3 目标、边界和交付物

### 3.1 目标

- 把四级主图压到可解释、可审计的本地包体预算内，并统一根路径、尺寸、alpha、引用和加载失败回退。
- 用共享形态/状态元数据把 `idle/happy/eating/sad` 映射为“有专用图就用专用图、没有就用 idle + CSS 动画 + Emoji 回退”，避免页面自行维护另一套表现。
- 让本地集合具备 schema 迁移、稳定去重、长度/容量边界、重复调用保护和引用安全的图片清理；清除数据后能证明受管记录和文件结果。
- 给游客 AppID 提供能力探测和可见降级，固定项目导入配置和预检命令；不依赖登录、网络或云服务。
- 统一用户可见的取消、权限、能力缺失、配额、失效资源和写入失败文案；增加离线错误分支 smoke。
- 更新 README、静态审计、资源审计和执行日志，形成可复制的“离线通过 / 运行时 BLOCKED”发布清单。

### 3.2 明确不做

- 不把 `touristappid` 替换成用户正式 AppID，不申请权限，不接 `wx.login`、openId、云开发、云存储、远程 API 或真实 LLM。
- 不伪造微信开发者工具/真机结果；任何需要微信运行时的检查都写成 BLOCKED，并给用户具体操作步骤。
- 不引入 npm 构建链、图片压缩第三方二进制、远程图片或外部 URL；资源优化优先使用当前系统已有 `sips` 或 Node/Python 标准库。
- 不删除合法用户的现有数据来达成预算；迁移只去除可证明的重复/损坏条目并记录保留、丢弃和失败计数。

## 4. 严格任务顺序

### T0：冻结 v1.2 基线、归档证据和 release 缺口

- **状态：已完成。** Planner 已完成旧计划原样归档；Executor 只追加执行日志，不改业务代码。
- **目标**：确认 Executor 使用的是 v1.2 当前状态，记录资源/配置/重复数据缺口，防止把已完成工作重复计算。
- **涉及文件**：只允许追加 `.codex/plans/execution-log.md`；读取 `.codex/plans/history/current-v1.2-2026-09-27.md`、`README.md`、PRD、配置、现有脚本和源码。
- **执行要点**：
  - 完整读取本计划和归档；校验归档文件存在、字节数 `33677`、行数 `415`、SHA-256 `1279024143a27ccea606aa2a5e6a6d7ad639539143ac6aa036dfa072de904a64`。
  - 运行当前五项基线：静态审计、Service smoke、页面 headless smoke、全部 JS `node --check`、全部 JSON 解析；记录退出码和完整关键输出。
  - 记录四张主图尺寸/alpha/字节合计、`du -sh miniprogram`、配置中的 `touristappid/miniprogramRoot/libVersion`，并用临时 Node 脚本复现重复 recipeId/photoId 在当前 initialize 后仍保留的事实。
  - 用 `rg` 固定 `FORM_META`、`CAT_STATES`、asset fallback、集合初始化、图片保存/删除、wx API 和 user-facing fail 文案位置。
- **验证命令**：

      test -s .codex/plans/history/current-v1.2-2026-09-27.md
      test "$(wc -l < .codex/plans/history/current-v1.2-2026-09-27.md | tr -d ' ')" = "415"
      test "$(wc -c < .codex/plans/history/current-v1.2-2026-09-27.md | tr -d ' ')" = "33677"
      test "$(sha256sum .codex/plans/history/current-v1.2-2026-09-27.md | cut -d ' ' -f1)" = "1279024143a27ccea606aa2a5e6a6d7ad639539143ac6aa036dfa072de904a64"
      node scripts/validate-miniapp.js
      node scripts/smoke-local.js
      node scripts/smoke-pages.js
      find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
      python3 - <<'PY'
      import json, pathlib
      for p in list(pathlib.Path('.').glob('*.json')) + list(pathlib.Path('miniprogram').rglob('*.json')):
          json.load(open(p, encoding='utf-8'))
      print('ALL_JSON_OK')
      PY

- **验收标准**：所有基线命令退出码 0；日志中固定 `AUDIT_FILES=113`、`SMOKE_LOCAL=PASS`、`SMOKE_PAGES=PASS`、`ASSERTIONS=45`、`SCHEMA_VERSION=3` 和素材合计证据；运行时保持 BLOCKED。
- **风险/暂停条件**：归档 hash 不一致、基线失败、业务文件在 T0 被修改或计划涉及的路径缺失时立即暂停并报告，不进入 T1。

### T1：资源包体、尺寸、路径和失败回退审计

- **状态：已完成。**
- **目标**：把四级主图纳入可重复的 asset budget，修正根路径契约并保留透明 PNG/可见 fallback，使大图不会把游客测试包推过主包预算。
- **涉及文件**：新增 `scripts/audit-assets.js`；`miniprogram/assets/batiao/**/idle.png`；`miniprogram/assets/README.md`；必要时 `miniprogram/models/cat.js`、`miniprogram/components/cat-display/cat-display.{js,wxml,wxss}`、`miniprogram/pages/profile/profile.{js,wxml}`、`scripts/validate-miniapp.js`、`README.md`。
- **实现要点**：
  - 先用 `FORM_META` 作为唯一形态资产清单；统一使用明确的 miniprogram 根路径（推荐 `/assets/...`，若选相对路径必须在审计和 README 中固定其解析规则），禁止页面再写另一份路径。
  - 使用当前系统 `sips` 或标准库将四张 idle 图保持 alpha 并缩放到适合展示的尺寸（目标长边不超过 `640px`）；将每张控制在 `450 KiB` 内、四张主图合计不超过 `1.6 MiB`，整个 `miniprogram/` 非空文件预检不超过 `2 MiB`。这些是导入前源包预算，不得冒充 DevTools 的压缩后报告。
  - `audit-assets.js` 只用 Node 内置模块解析 PNG 签名/IHDR/颜色类型，输出每个文件的路径、bytes、dimensions、alpha、SHA-256 和引用状态，并对缺失、非 RGBA、超过预算、重复 hash、未引用的大图报错；TabBar 小图也继续检查。
  - 对 cat-display 和 profile 保留 `binderror` 后显示 Emoji/占位的分支；资源不存在、加载失败和空路径不能造成页面异常。更新资产 README，明确目前只有 idle 图，状态图由 T2 的 CSS fallback 表达。
- **验证命令**：

      node scripts/audit-assets.js
      node scripts/validate-miniapp.js
      python3 - <<'PY'
      import pathlib, struct
      for p in sorted(pathlib.Path('miniprogram/assets/batiao').glob('*/idle.png')):
          b = p.read_bytes(); assert b[:8] == b'\\x89PNG\\r\\n\\x1a\\n'
          w, h = struct.unpack('>II', b[16:24]); assert w and h
          print(p, len(b), f'{w}x{h}', 'color_type=', b[25])
      PY
      rg -n 'binderror|wx:else|imagePath|getFormMeta' miniprogram/models/cat.js miniprogram/components/cat-display miniprogram/pages/profile

- **验收标准**：资源审计输出 `ASSET_ERRORS=0`；四张主图实际存在、带 alpha、尺寸和预算达标、全部被 `FORM_META` 引用；cat-display/profile 都能在静态审计中证明失败回退；没有把图片压缩工具或临时文件加入工程。
- **风险/暂停条件**：当前系统没有可用无损/透明压缩方法、缩放后素材视觉严重损坏、源包仍超过硬预算或路径语义无法证明时暂停并报告；不能删除素材来掩盖预算问题。

### T2：共享状态动画与素材映射

- **状态：已完成。** 依赖 T1 的路径和预算已通过。
- **目标**：让四个形态与四个状态的视觉行为使用同一套元数据；专用状态图缺失时明确回退到 idle 图、CSS 动画和 Emoji，不把不存在的 PNG 当作已交付。
- **涉及文件**：`miniprogram/models/cat.js`、`miniprogram/components/cat-display/cat-display.{js,wxml,wxss}`、`miniprogram/pages/chat/chat.{js,wxml,wxss}`、`miniprogram/pages/profile/profile.{js,wxml,wxss}`、`miniprogram/styles/animation.wxss`、`scripts/smoke-local.js` 或新增轻量状态断言脚本。
- **实现要点**：
  - 扩展共享 `FORM_META`/`CAT_STATES`：每个 state 至少有 label、稳定 key、animation class 和 `assetKey`/fallback 标记；提供 `getFormAsset(form, state)`。当前四种状态都应安全地解析到 `idle.png`，未来存在 `happy/eating/sad.png` 时才使用专用图。
  - cat-display observer 同时根据形态和 state 取元数据，状态切换不清掉 cat 名称/形态名；未知形态/state 回退到 baby/idle；图片 error 只影响当前组件实例并切换到 Emoji，不循环加载同一坏路径。
  - chat 的发送、喂食、抚摸继续使用已有 happy/eating/idle/sad CSS 表现和 busy/finally；profile 与 cat-display 显示相同名称/Emoji/状态标签，不能再次硬编码。
  - 不新增远程或伪造状态图片；README/资产说明明确“只有 idle PNG，互动状态由 CSS 表达”。
- **验证命令**：

      node scripts/smoke-local.js
      node scripts/smoke-pages.js
      node --check miniprogram/models/cat.js
      node --check miniprogram/components/cat-display/cat-display.js
      node --check miniprogram/pages/chat/chat.js
      node --check miniprogram/pages/profile/profile.js
      rg -n 'getFormAsset|CAT_STATES|animationClass|cat-display--(idle|happy|eating|sad)|binderror|wx:else' miniprogram/models/cat.js miniprogram/components/cat-display miniprogram/pages/chat miniprogram/pages/profile

- **验收标准**：离线断言覆盖 4×4 形态/状态矩阵、未知值回退、专用图不存在时 idle fallback、图片错误后的 Emoji fallback；三种交互状态对应可复查 CSS class；所有页面使用共享元数据，不能出现第二份形态名称/图片路径表。
- **风险/暂停条件**：状态切换破坏既有 cat/chat 返回结构、图片 error 造成递归或 profile/chat 形态不一致时暂停修复；不能把未生成的状态素材作为通过条件。

### T3：schema 1.3、重复数据、迁移和媒体引用安全

- **状态：已完成。** 依赖 T0，且必须在 T4 性能/容量规则前完成数据结构。
- **目标**：把 v1.2 的本地集合升级为可重复迁移、稳定去重、可诊断清除的 v1.3 数据层，不丢失合法用户内容。
- **涉及文件**：`miniprogram/services/storageService.js`、`miniprogram/models/{chat,photo,recipe,feedback}.js`、`miniprogram/services/{chat,recipe,album,feedback,user}.js`、`miniprogram/utils/mediaUtil.js`、`scripts/smoke-local.js`。
- **实现要点**：
  - schema 升为数值 4/名称 `1.3`（若 Executor 发现已有更高合法版本，必须保留版本兼容并先报告）；迁移 v3 → v4 必须幂等。用户、伴侣、猫咪、设置、邀请码和现有合法记录保留；迁移结果可返回 `repaired/deduped/dropped/failed` 计数。
  - 为 chats、careEvents、recipes、photos、feedback 增加稳定 ID 归一化和去重：相同 ID 保留最新/字段最完整的确定性记录，缺失或明显损坏项才丢弃；保持聊天 20、关怀 50、反馈 50 的既有上限。迁移多次运行不改变合法记录或时间戳。
  - `recipeService.create/update/addPhotos` 和 `albumService.create/createMany/saveImages` 做服务层去重和重复调用保护：同一 recipeId/photoId 或同一受管图片路径不能静默追加重复记录；批量保存尽量一次写入并在部分文件失败时返回明确失败，不留下孤儿元数据。
  - 受管图片采用唯一文件名；删除 recipe/photo 前检查该路径是否仍被其他 recipe/photo/avatar 引用，只在最后一个引用移除时调用 unlink。对 emoji、远程/临时非受管路径不误删；清除数据收集去重后的受管路径，等待所有结果，再清空 key 并重新初始化默认结构。
  - `storage.set`/`saveImage` 的写入/文件失败不能无声地让页面宣称成功；保留兼容 API，增加可检查的结果/诊断字段供页面 T6 使用。
- **验证命令**：

      node scripts/smoke-local.js
      node --check miniprogram/services/storageService.js
      node --check miniprogram/services/recipeService.js
      node --check miniprogram/services/albumService.js
      node --check miniprogram/services/chatService.js
      node --check miniprogram/services/userService.js
      node - <<'NODE'
      const storage = require('./miniprogram/services/storageService')
      storage.clear(); storage.initialize()
      storage.set(storage.KEYS.RECIPES, [{ recipeId: 'same', name: '旧', createdAt: 1 }, { recipeId: 'same', name: '新', createdAt: 2 }])
      storage.set(storage.KEYS.PHOTOS, [{ photoId: 'p', imagePath: 'emoji:🌷', createdAt: 1 }, { photoId: 'p', imagePath: 'emoji:🌷', createdAt: 2 }])
      const first = storage.initialize(); const second = storage.initialize()
      if (storage.list(storage.KEYS.RECIPES).length !== 1 || storage.list(storage.KEYS.PHOTOS).length !== 1 || !first.migrated || second.migrated) process.exit(1)
      console.log('DEDUP_MIGRATION_OK')
      NODE

- **验收标准**：`SCHEMA_VERSION=4`/`SCHEMA_NAME=1.3`；v3 fixture 迁移后合法用户和记录仍在，重复 ID 只保留一条、重复 initialize 幂等；重复提交/共享图片路径不会产生重复或误删；clearLocalData 后所有受管集合为空并恢复默认对象，失败文件逐项可见。
- **风险/暂停条件**：无法证明合法记录保留、引用计数会误删文件、兼容调用方被破坏、Storage/文件写失败仍被吞掉或迁移出现不可逆丢失时立即暂停；不要通过清空 Storage 规避迁移测试。

### T4：页面性能、容量边界和原子写入

- **状态：已完成。** 依赖 T3 的 v1.3 数据契约。
- **目标**：给本地模式设置可解释的数据边界，避免全量集合和重复写入拖慢页面或打满游客设备 Storage，同时保持 PRD 的 9 张批量照片、20 条聊天等行为。
- **涉及文件**：可新增 `miniprogram/utils/limits.js`；`miniprogram/services/storageService.js`、`recipeService.js`、`albumService.js`、`chatService.js`、`feedbackService.js`；相关页面 `chat/recipe/recipe-detail/recipe-add/album/album-upload/feedback/settings`；`scripts/smoke-local.js`、`scripts/smoke-pages.js`、`scripts/validate-miniapp.js`。
- **实现要点**：
  - 集中定义并导出本地上限：聊天 20、关怀 50、反馈 50、单次相册/菜谱照片 9、单个菜谱照片 9；为 album/recipe 元数据定义有文档依据的总量上限（建议 album 500、recipe 200），超限要返回可见 code/message，不能静默截断新内容。
  - Storage 可用时读取 `wx.getStorageInfoSync()`，在高占用或写入失败时返回可诊断的“本地空间不足，请先清理旧记录”；无 wx/游客 Node fallback 继续使用内存但标出 local-session 能力，不调用不存在的 API。
  - 将相册 `createMany`、反馈/菜谱批量保存改为 bounded O(n) 处理，避免每条记录重复 initialize/list/write；页面 onShow 只读取已受上限保护的集合，保持列表排序和月份分组稳定。
  - 所有用户输入继续在 Service 再校验：昵称/签名/备注/反馈/标签长度、日期、评分、照片数和 ID；空列表、坏对象、负数/NaN 计数都归一化为安全值。
  - 为超限、Storage quota、重复提交、部分图片失败设计保持页面可重试的状态：不清空用户已保存记录，不显示假成功。
- **验证命令**：

      node scripts/smoke-local.js
      node scripts/smoke-pages.js
      find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
      rg -n 'MAX_|LIMIT|quota|too_many|storage|slice\(-20\)|slice\(-50\)|slice\(0, 9\)|saving|sending|choosing' miniprogram scripts
      python3 - <<'PY'
      import json, pathlib
      for p in list(pathlib.Path('.').glob('*.json')) + list(pathlib.Path('miniprogram').rglob('*.json')):
          json.load(open(p, encoding='utf-8'))
      print('ALL_JSON_OK')
      PY

- **验收标准**：headless smoke 能重复提交并证明集合不超过上限、批量写入只产生预期记录、超限和配额失败返回可见结果；全部页面 busy/finally 状态仍能恢复；没有引入循环 `onShow`、无限列表或页面直读 Storage。
- **风险/暂停条件**：为达成性能而改变 PRD 上限、静默丢数据、引入不可测的定时/缓存状态或 Node smoke 与真实 Service 语义不一致时暂停；性能结果不能用一次偶然时间数字替代边界证据。

### T5：游客 AppID 能力降级与导入/构建配置预检

- **状态：已完成。** 依赖 T1/T3/T4 的资源和数据契约。
- **目标**：在 `touristappid`、无登录/无云能力、部分 wx API 缺失时仍有可见且可重试的本地 MVP；把根目录导入配置变成可自动审计的契约。
- **涉及文件**：可新增 `miniprogram/utils/runtimeCapabilities.js` 或同等轻量模块；`miniprogram/app.js`；`pages/bind/profile/album/album-upload/recipe-add/recipe-detail/profile-edit/feedback/settings` 的 JS/WXML；`project.config.json`、`project.private.config.json`、`miniprogram/app.json`、根/小程序 sitemap；`scripts/validate-miniapp.js`、可新增 `scripts/smoke-capabilities.js`、`README.md`。
- **实现要点**：
  - 统一探测 `wx.canIUse`、Storage、FileSystem、chooseImage/chooseMedia、saveImageToPhotosAlbum、setClipboardData、navigate、share 的可用性；Node 无 `wx` 时返回确定的 local fallback，不在模块加载阶段抛异常。
  - 页面用能力 flags 控制按钮可用性/说明：分享不可用时仍显示邀请码和复制；选图不可用时保留菜名/文字记录入口；保存相册不可用时给出权限/能力提示；图片文件系统不可用时只展示占位或临时路径状态，不把临时路径当成永久文件；游客模式不触发登录/云请求。
  - `app.js` 在 globalData 记录版本、`localGuestMode` 和 capability snapshot；能力缺失不阻止四个 Tab 初始化，初始化失败必须有可复查日志和用户可见恢复路径。
  - 增加配置预检：根 `project.config.json` 必须是 `compileType=miniprogram`、`appid=touristappid`、`miniprogramRoot` 存在、基础库版本有值；private config 不得覆盖 AppID/入口；app pages、TabBar、sitemap、图标和页面四件套必须一致；禁止 package/lockfile/远程 URL/第三方依赖。
- **验证命令**：

      node scripts/validate-miniapp.js
      node scripts/smoke-capabilities.js
      node --check miniprogram/app.js
      node --check miniprogram/utils/runtimeCapabilities.js
      python3 - <<'PY'
      import json
      root=json.load(open('project.config.json', encoding='utf-8'))
      app=json.load(open('miniprogram/app.json', encoding='utf-8'))
      assert root['appid'] == 'touristappid' and root['miniprogramRoot'].rstrip('/') == 'miniprogram'
      assert root['compileType'] == 'miniprogram' and app['pages'] and len(app['tabBar']['list']) == 4
      print('IMPORT_CONFIG_OK')
      PY
      rg -n 'wx\.login|openId|cloud|https?://|api[_-]?key|secret|touristappid|localGuestMode|canIUse' miniprogram project.config.json README.md

- **验收标准**：无 wx、缺 share/clipboard/chooseImage/saveImage/FileSystem 和 API fail 的 headless 分支均可运行并保留替代路径；静态配置审计输出 `IMPORT_CONFIG_OK`，游客边界在 UI/README 中可见；不把 capability snapshot 当成真实运行时授权结果。
- **风险/暂停条件**：发现代码尝试登录/云请求、private config 覆盖正式入口、能力缺失导致主页面崩溃或无法复制/保留文字数据时暂停；不能为游客 AppID 硬编码不存在的权限成功。

### T6：用户可见错误文案、失败分支和页面恢复

- **状态：已完成。** 依赖 T5 的能力探测。
- **目标**：让取消、权限拒绝、API 不可用、资源失效、Storage/文件失败、导航失败和重复点击都有准确、简短、可恢复的用户反馈。
- **涉及文件**：可新增 `miniprogram/utils/errorMessage.js` 或 `wxError.js`；`pages/chat/bind/profile-edit/recipe/recipe-add/recipe-detail/album/album-upload/feedback/settings/about/privacy`；`services/storageService.js`、`recipeService.js`、`albumService.js`、`userService.js`；`scripts/smoke-pages.js`、`scripts/smoke-local.js`。
- **实现要点**：
  - 集中把 `errMsg`/reason 映射为取消、权限、空间、能力缺失、资源失效、未找到、重复绑定、只读/无权删除等文案；例如图片选择取消显示“已取消选择”，权限拒绝提示“请在设置中允许相册权限”，复制失败仍保留可手动抄写的代码，照片/菜谱文件失败不能留下成功元数据。
  - 所有 busy 标志在 success/fail/complete/throw/promise finally 都复位；重复点击不重复写、不重复 toast；导航 fail 有当前页面可继续的 fallback；`showToast` 本身不可用时不能抛异常。
  - 图片 onerror 只替换当前项为占位并保留删除/返回能力；Storage quota/文件 unlink 失败要告诉用户“记录是否已保存”和下一步，不能暴露原始异常堆栈或把本地反馈说成已发送。
  - 将错误分支加入 headless wx stub：chooseImage cancel/permission、clipboard fail、save album auth、navigate fail、file save/unlink fail、storage write fail、缺失 recipe/photo、重复 bind、clear partial failure。
- **验证命令**：

      node scripts/smoke-pages.js
      node scripts/smoke-local.js
      find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
      rg -n 'fail:|complete:|finally|showToast\(|saving|sending|binding|deleting|choosing|unsupported|权限|取消|空间|失效' miniprogram/pages miniprogram/services miniprogram/utils
      rg -n 'console\.error\(|errMsg|stack' miniprogram/pages miniprogram/services

- **验收标准**：headless smoke 输出 `SMOKE_PAGES=PASS` 且断言每类失败的文案和状态复位；没有 raw error/stack 展示、原始情绪吐槽泄露、伪造“已发送/已同步”或孤儿元数据；离线成功路径与 T0/T3/T4 语义保持一致。
- **风险/暂停条件**：错误文案改变已有可验证产品语义、失败后数据状态不确定、忙状态卡死或需要微信权限才能证明的分支被误报通过时暂停并报告 BLOCKED。

### T7：最终离线验收、文档和 release-readiness 清单

- **状态：已完成。** T0-T6 已逐项记录完成，最终离线验收全部通过。
- **目标**：将 v1.3 的资源、数据、能力、错误和配置检查汇总为一次可复制交付，文档准确区分离线通过与运行时阻塞。
- **涉及文件**：`README.md`、`miniprogram/assets/README.md`、`scripts/validate-miniapp.js`、`scripts/audit-assets.js`、`scripts/smoke-local.js`、`scripts/smoke-pages.js`、`scripts/smoke-capabilities.js`（若新增）、`.codex/plans/execution-log.md`；必要时只更新计划中的 T 状态。
- **实现要点**：
  - README 更新到 v1.3，写明根目录导入、`touristappid`、基础库目标、无登录/云/LLM 边界、素材预算输出解释、schema 1.3、清除/迁移/去重规则、四个离线命令、错误与能力降级行为和用户在 DevTools/真机需执行的 BLOCKED 检查表。
  - `validate-miniapp.js` 汇总配置、页面/组件路径、TabBar PNG、asset budget、四形态/四状态映射、fallback hooks、schema/version、服务边界、无外链/敏感凭据/TODO/页面 Storage 越层；审计失败必须非零退出。
  - 顺序执行所有脚本并把真实输出写入 execution-log：资源审计、JS 语法、静态审计、Service smoke、page smoke、capability smoke、JSON 解析、页面 Storage/URL/依赖扫描。记录文件数/资源 bytes/版本/断言数。
  - 最终 README 必须明确：Node smoke 不代表微信 renderer、分享面板、权限、布局、键盘、手势、真实文件生命周期已通过；给出用户拿到 `touristappid` 后的具体导入和检查步骤。
- **验证命令**：

      node scripts/audit-assets.js
      find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
      node scripts/validate-miniapp.js
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
      if rg -n 'https?://|api[_-]?key|secret|sk-[A-Za-z0-9]{8,}|TODO|FIXME' miniprogram README.md scripts project.config.json; then exit 1; else echo STATIC_RISK_SCAN=0; fi

- **验收标准**：所有本地命令退出码 0；资源、配置、schema、重复数据、容量、错误分支和游客降级均有日志证据；README 与实际输出一致；git/文件清单只包含计划内文件；运行时检查单独标为 BLOCKED，不能写成“release 已在微信通过”。
- **风险/暂停条件**：任一前置任务没有日志证据、脚本失败、README 与代码不一致、包体预算超限或运行时状态被误报时不能宣称 v1.3 完成，应停在 T7 并报告具体证据。

## 5. 全局风险、暂停和交付规则

| 风险 | 识别证据 | 处理方式 |
| --- | --- | --- |
| 微信主包/资源预算仍超限 | `audit-assets.js` 或 `du` 超过硬预算 | 先暂停，报告实际 bytes/尺寸和可用本地工具；不能删素材或声称 DevTools 通过 |
| migration 丢合法数据 | v3 fixture 字段、数量或图片引用变化无法解释 | 停止后续任务，保留 fixture 和失败日志，修复迁移后再继续 |
| wx API/游客能力缺失 | headless stub 或配置显示无 API | 保留复制/文字/Emoji/内存 fallback，UI 显示可恢复提示；不能调用登录/云服务 |
| 文件路径共享/清理错误 | 相同 path 仍被其他记录引用却被 unlink，或 clear 失败无清单 | 立即暂停媒体删除逻辑，先修复引用计数和结果报告 |
| 只能运行时验证的现象 | DevTools/真机不可用 | 记录 `BLOCKED / 未验证` 和用户步骤；不把 Node/静态结果升级为运行时证据 |
| 依赖/远程资源意外引入 | package/lockfile、HTTP URL、外链图片或秘钥扫描命中 | 停止并移除/报告；本阶段不接受任何第三方或远程依赖 |

Executor 最终必须报告：Planner 归档路径、新计划路径、T0-T7 各自状态、每个任务的实际修改文件、验证命令与输出、仍然 BLOCKED 的微信运行时项目，以及是否满足 v1.3 release-readiness 的离线验收标准。
