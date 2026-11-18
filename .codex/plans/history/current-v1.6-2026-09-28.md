# Planner 计划：八条与你 v1.6 本地 PRD 完成审计与运行时交接

## 1. 范围、证据和修改纪律

- **角色**：Planner Agent。本轮完成 v1.5 本地 PRD 完成度复核，确认是否仍有不登录、不接网络、不新增依赖即可真实改进的业务缺口。复核发现一项合理的离线媒体边界缺口：迁移后 `https/data/blob` 等非本地路径仍可能被 presenter 当成可渲染图片；另有真实微信运行时和专用状态素材两类外部条件。
- **生成日期**：2026-09-27。
- **项目根目录**：`/Users/lnp/Documents/ChatGPT/delicious- project`。
- **上一轮原样归档**：`.codex/plans/history/current-v1.5-2026-09-27.md`。
  - 归档发生在写入本文件之前，并与写入前的 v1.5 `current.md` 逐字节一致。
  - 归档字节数：36150。
  - 归档行数：347（以换行符计）。
  - 归档 SHA-256：`b16bffc6a3332cab613148b1c8e2f1e22c30db79116261493bb0559a0ec35541`。
- **本轮允许修改**：只允许创建上述唯一归档文件和覆盖本 `.codex/plans/current.md`；不修改 `miniprogram/`、`scripts/`、配置、资源、README 或 `execution-log.md`，不安装依赖，不启动 Executor。
- **版本边界**：应用仍为 `1.4.0`，数据 schema 仍为数值 `4` / 名称 `1.3`。v1.6 是审计/交接计划编号，不是应用版本升级理由。
- **运行时边界**：Node smoke、静态审计和 headless wx stub 只能证明离线代码分支；微信开发者工具导入/编译、四 Tab renderer、游客登录、分享面板、权限弹窗、布局/安全区、字体/键盘、swiper/滚动/长按、真实文件系统、真实 Storage quota 和进程中断都不能从本地结果推断通过。

## 2. 严格本地 PRD 审计结论

### 2.1 当前工作区可复核的本地结果

本轮重新执行了 v1.5 最终离线命令集，结果如下；这些是本次工作区输出，不沿用旧日志数字：

- `audit-assets.js`：四张形态 `idle.png` 均 RGBA、长边不超过 640；`ASSET_CAT_COUNT=4`、`ASSET_CAT_BYTES=1374256`、`ASSET_MINIPROGRAM_BYTES=1607483`、`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`。
- `validate-miniapp.js`：`ASSET_AUDIT=PASS`、`AUDIT_FILES=118`、`ERRORS=0`、`WARNINGS=0`。
- JavaScript 语法检查：全部 `miniprogram/**/*.js` 退出码 0。
- 新增 v1.5 smoke：`SMOKE_CAT_INTERACTION=PASS`（16 条）、`SMOKE_PHOTO_PRESENTER=PASS`（12 条）、`SMOKE_FILE_CLEANUP=PASS`（12 条）、`SMOKE_CARE_ATOMIC=PASS`（9 条）。
- 既有 smoke：`SMOKE_STORAGE_ATOMIC=PASS`（13 条）、`SMOKE_INVARIANTS=PASS`（15 条，`REPAIRED=11 DEDUPED=3 DROPPED=5 FAILED=0`）、`SMOKE_RECOVERY=PASS`（9 条）、`SMOKE_LIFECYCLE=PASS`（9 条）、`SMOKE_LOCAL=PASS`（`SCHEMA_VERSION=4`、`RECIPES=12`）、`SMOKE_PAGES=PASS`（63 条，`LOCAL_FEEDBACK=0`）、`SMOKE_CAPABILITIES=PASS`（16 条）。
- JSON 解析、页面 Storage 越层、静态风险扫描：分别为 `ALL_JSON_OK`、`PAGE_STORAGE_LEAK=0`、`STATIC_RISK_SCAN=0`。`smoke-pages` 的预期 `clear incomplete` 诊断 warning 不改变 PASS，也没有被隐藏。

### 2.2 PRD 本地业务契约逐项结论

- 八条：tap/longpress 共用 handler 和 page guard 去重；饱食度、心情、今日喂养与经验 `current/need/remaining/percent` 均有可见状态；形态条件进度与经验进度分开；每日喂养上限和成长规则保持不变。
- 聊天/关怀：mock 回复、最近 20 条上下文、泛化关怀、稳定 `eventId`、规范化 tag、24 小时去重、事件/消息失败码和回滚 fixture 均已通过；没有接入真实 LLM、伴侣设备、云同步或通知推送，这是 PRD v1 的本地边界。
- 菜谱：未解锁/已解锁/甜品三区、默认 12 道菜、先保存菜名再补照片、评分、点赞、轮播、编辑/删除和 9 张照片上限均有页面与 Service 契约。
- 相册：日期/描述/标签、9 张批量、月份分组、大图 swiper、上传者安全 label、长按保存、本人删除、签名和未绑定文案均有代码与 smoke；WXML 不绑定 raw `uploadedBy`。
- 个人/绑定/设置：资料、头像、性别、生日、签名、纪念日、成长统计、邀请码、分享回填、解绑、情绪/通知开关、关于/隐私/反馈、本地清除和可重试错误均已覆盖。情侣双端确认、跨设备同步和远程通知不能在单机离线模式伪造。
- Storage/文件：checked 写入/删除/清除、共享引用保护、missing-file 处理、`failedFiles`/`failedKeys`、重试和 schema `4/1.3` 保持通过；没有把失败伪装成成功。
- 媒体边界（待 T1）：迁移归一化会保留旧的合法路径 metadata，`storage` 删除逻辑不会误删远程/临时路径；但 `mediaUtil.isImagePath()` 目前接受任意 URI scheme，导致 `https://` 等路径可能进入 `<image>`，并可能被相册保存入口尝试提交给系统。离线模式下应保留 metadata 供迁移/诊断，同时统一以占位展示并阻断保存。

### 2.3 仍未交付但不能在本轮伪造的项目

1. **专用状态 PNG**：每个形态当前只有 `idle.png`；`happy`、`eating`、`sleeping`、`sad` 的专用图均缺失，互动状态继续回退同形态 idle，再叠加 CSS/Emoji。当前没有用户提供的状态图源，不能用临时截图、Emoji 或无来源素材冒充交付；此项记为“待素材”，不是可通过本地代码改动消除的缺口。
2. **真实微信运行时**：执行日志和 README 必须继续原样保留 `INVALID_LOGIN, access_token expired [touristappid]`、`isMiniAppProject=false`、`Loading project all files...` 和模拟器路径空白。游客登录、导入/编译、renderer、分享/权限、布局/输入/手势、真实文件和 Storage 生命周期全部保持 `BLOCKED / 未验证`。

### 2.4 审计决定

媒体边界缺口同时满足“属于当前离线/无远程图片边界”“不依赖微信登录/网络/新依赖”“可以用 headless fixture 真实验收”，应安排一次本地修复；除此之外没有新的本地业务缺口。专用状态素材和微信运行时仍不能伪造。因此 v1.6 的后续顺序是：**先完成媒体边界修复，再仅运行时交接待用户登录**。

## 3. 严格串行任务

### T0：冻结 v1.6 本地审计基线（Planner 只读复核）

- **状态：完成（本地离线基线通过；真实微信运行时 BLOCKED / 未验证）**

- **目标**：固定归档完整性、v1.5 离线 PASS、PRD 契约已闭合以及媒体边界缺口的可复现证据；T0 不修改业务实现。
- **文件**：只读 `PRD-情侣小程序「八条与你」.md`、`README.md`、`.codex/plans/execution-log.md`、`.codex/plans/history/current-v1.5-2026-09-27.md`、`miniprogram/**`、`scripts/**`、`project.config.json`、`project.private.config.json`；本计划文件是唯一可更新文件。
- **要点**：
  - 用字节、换行数、SHA-256 和 `cmp` 确认归档等于写入前 v1.5 `current.md`，不覆盖已有历史归档。
  - 按下列顺序重跑资源审计、JS 语法、静态审计、四个新增 smoke、既有 smoke、JSON、Storage 越层和静态风险扫描；记录当次真实输出。
  - 用 `rg` 复核 tap/longpress、experience、uploader label、文件清理失败码/重试、care eventId/24h、share/menu 分离、idle-only 资源目录和游客阻塞原文。
  - 明确单机模拟、mock LLM、无云/无 openId/无通知、待状态素材和运行时阻塞均不是本地实现任务；不改 schema、应用版本、AppID、配置或脚本。
- **验证命令**：

      python3 - <<'PY'
      import hashlib, pathlib
      p = pathlib.Path('.codex/plans/history/current-v1.5-2026-09-27.md')
      b = p.read_bytes()
      assert len(b) == 36150 and b.count(b'\n') == 347
      assert hashlib.sha256(b).hexdigest() == 'b16bffc6a3332cab613148b1c8e2f1e22c30db79116261493bb0559a0ec35541'
      print('V15_ARCHIVE_OK')
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

- **验收**：归档校验输出 `V15_ARCHIVE_OK`；所有本地命令退出码为 0，且输出保持本节 2.1 所列实际范围；schema `4/1.3`、应用 `1.4.0`、tourist AppID、四张 idle 素材和源包预算未漂移；T0 只固定媒体边界缺口，不修改业务实现。不得写成微信运行时通过。
- **风险/暂停**：归档不符、任一 smoke/静态审计失败、远程/凭据/TODO 命中、schema 或版本漂移、状态素材突然变化、计划外文件修改时立即暂停；不得为恢复 PASS 删除数据、放宽检查或新增依赖。T0 未通过不得进入 T1。

### T1：迁移媒体路径边界与离线保存阻断

- **状态：完成（离线/headless PASS；真实微信 renderer、相册权限和文件生命周期 BLOCKED / 未验证）**

- **目标**：修复一个可在本地真实验收的边界：保留迁移得到的 `https://`、`data:`、`blob:` 和其他非本地 URI metadata 供诊断/清理引用，但不把它们交给 `<image>` 渲染，也不尝试保存到系统相册；合法本地/微信文件和当前临时选图流程保持不变。
- **文件**：`miniprogram/utils/mediaUtil.js`；使用该工具的 `miniprogram/components/avatar/avatar.js`、`components/photo-card/photo-card.js`、`components/recipe-card/recipe-card.js`、`pages/album/album.js`、`pages/recipe-detail/recipe-detail.js`、`pages/recipe-add/recipe-add.js`/`.wxml`；必要时只调整对应 WXML 的 `hasImage` 条件。新增/更新 `scripts/smoke-photo-presenter.js`、`scripts/smoke-local.js`、`scripts/smoke-pages.js` 和 `scripts/validate-miniapp.js` 的离线契约；同步 README/执行日志仅在 Executor 获授权后进行，本轮不改。
- **要点**：
  - 将 `isImagePath` 的允许集合收敛到本地/微信可管理路径（如 `local:`, `wxfile:`, `file:`, `/` 和明确的临时本地路径）；明确拒绝 `http:`, `https:`, `data:`, `blob:` 及任意未知 URI scheme，避免动态 metadata 触发网络加载。
  - `withImageFlag`/presenter 对非本地路径返回 `hasImage=false`，沿用现有占位和 uploader/日期/描述 metadata；recipe-add 编辑页也必须对已有照片先派生 `hasImage` 再渲染，不能保留裸 `src="{{item}}"`；不要把原始路径写进 WXML，也不要为通过测试清空或改写迁移记录。
  - `album.saveToAlbum` 及其他图片保存入口同时检查 `hasImage` 和可渲染/可保存路径；远程、data/blob、Emoji、失效路径均不调用 `wx.saveImageToPhotosAlbum`，并显示现有可重试/占位提示。Recipe card/detail 与 avatar 保持同一 fallback 语义。
  - fixture 必须包含 `https://example.invalid/x.png`、`data:image/...`、`blob:...`、未知 scheme、Emoji 和合法 `local://`；断言非本地路径不加载、不保存，metadata 仍可列出/删除而不 unlink；合法本地路径回归通过。
  - 测试中的远程样例不得引入可加载的外链或破坏现有静态风险门；如需表达 URL，使用不可请求的 fixture/拼接字符串并保持 `STATIC_RISK_SCAN=0`，不能放宽外链扫描。
- **验证命令**：

      node scripts/smoke-photo-presenter.js
      node scripts/smoke-local.js
      node scripts/smoke-pages.js
      node scripts/validate-miniapp.js
      find miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
      rg -n 'isImagePath|withImageFlag|hasImage|saveImageToPhotosAlbum|https|data:|blob:|unsupported_path' miniprogram scripts

- **验收**：所有非本地 URI 在相册、菜谱、头像 presenter 中统一占位，WXML 不向 `<image>` 提供这些路径；`hasImage=false` 的坏图/失效图也不能调用系统相册保存，保存系统相册调用次数为 0；metadata 仍可迁移、展示诊断和按现有规则删除记录且不会 unlink 非受管文件。合法 local/wxfile/file/temp 路径、坏图 fallback、上传者 label、原有容量/schema 和所有既有 smoke 保持通过；新 smoke 的失败 fixture 必须非零退出。
- **风险/暂停**：误拒绝目标基础库的合法本地临时路径、误删迁移 metadata、把 `blob:` 等本地运行时对象当成本地受管文件、或真实微信 renderer 行为不明时暂停；不通过静态字符串替代 fixture，不接网络，不添加依赖，不宣称真机保存/渲染已验证。

### T2：微信开发者工具运行时交接（仅待用户登录，不改代码）

- **状态：待用户登录 / BLOCKED / 未验证**

- **目标**：在用户于微信开发者工具完成登录后，取得真实导入、编译、renderer、权限、手势、文件和 Storage 证据；T2 不由 Planner/Executor 代替登录，也不把离线结果升级为运行时结果。
- **文件**：以 `project.config.json`、`project.private.config.json`、`miniprogram/app.json` 和当前 `miniprogram/**` 作为只读输入；对照 `README.md` 与 `.codex/plans/execution-log.md` 的运行时交接表和阻塞原文。无源码、脚本、配置、资源或日志写入要求。
- **要点**：
  - 用户先在 DevTools 完成微信登录，再重新导入项目；确认 AppID、工具版本、基础库和项目路径，并记录编译面板、控制台和模拟器路径。
  - 依次真实检查八条、菜谱、相册、我的四个 Tab 首屏，分享按钮/分享面板/邀请码深链，选图/保存相册/权限拒绝与设置跳转，安全区/字体/键盘/滚动/swiper/长按/重复点击，以及页面隐藏/重显、Storage quota、文件 save/unlink 和进程中断后的状态。
  - 只有截图和控制台/工具日志能证明对应项目；`SMOKE_*`, `validate-miniapp.js`, headless wx stub 和 capability snapshot 不能替代这些证据。
  - 若登录后仍出现 `INVALID_LOGIN`、`isMiniAppProject=false`、持续 `Loading project all files...` 或空白模拟器，继续记为 `BLOCKED / 未验证`，只报告证据和下一步，不改 AppID 或配置碰运气。
- **验证命令/步骤**：

      # 用户登录并重新导入/编译后，在项目根目录确认代码未被运行时尝试改写
      node scripts/audit-assets.js
      node scripts/validate-miniapp.js
      node scripts/smoke-pages.js
      node scripts/smoke-capabilities.js

  同时保存 DevTools 项目设置、编译成功面板、四 Tab 首屏、分享/权限/布局/输入/手势/文件/Storage 各项截图和对应日志；截图缺失的项目保持 `BLOCKED / 未验证`。
- **验收**：在用户提供真实证据前，T2 状态只能是“待用户登录 / BLOCKED”；不得在执行日志、README 或计划中填写伪造截图、编译成功、分享面板、权限、renderer、真机文件或 Storage 生命周期。取得证据后逐项更新状态，并继续标记没有专用状态 PNG 的 fallback；未取得证据时只完成交接说明。
- **风险/暂停**：游客令牌、工具版本、基础库、权限和真实文件生命周期都可能独立失败；任何本地 PASS 与运行时现象不一致时停止归因，保留原始日志。状态 PNG、云同步、真实 LLM、openId、通知推送和跨设备绑定需要素材/产品授权/后端条件，不能在 T2 临时补做。

## 4. v1.6 完成规则

- 本计划只有 T0 → T1 → T2 三个串行阶段；当前只完成 Planner 审计和归档，不启动 Executor。T1 是唯一安排的离线业务修复，不能被跳过或改成运行时假证据。
- T0 固定本地 PRD 契约和媒体边界证据；T1 完成非本地 URI 占位/保存阻断并回归全部离线 smoke；T2 仅在用户登录 DevTools 后接收真实运行时证据。没有登录和证据时，最终结论固定为“本地 PASS；真实微信 BLOCKED / 未验证；仅运行时交接待用户登录”。
- 后续若用户提供专用状态 PNG，另开素材审计任务并重新计算 hash/尺寸/预算；若用户授权网络/后端/账号集成，另开产品范围任务。本 v1.6 不以假素材、假截图、网络请求或依赖安装填补这些条件。
