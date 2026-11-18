# Planner 计划：八条与你 v2.2 本地产品闭环与事务安全

## 0. 角色、范围与严格修改纪律

- 本文件是 v2.2 唯一执行计划。Planner 已读取 PRD、README、v2.1 当前计划及其执行日志、全部历史计划、项目配置、`miniprogram/**`、`scripts/**` 和资源说明；Planner 只归档 v2.1 并写入本文件，不实现业务代码，不修改 README、执行日志、配置、依赖、业务源码或资源，不启动 Executor。
- 父 Agent 必须先独立读取本文件，记录读取前行数/字节数/SHA-256，确认 v2.1 原样归档和 T0→T4 顺序，再决定是否启动唯一 Executor。Planner 与 Executor 不得并行；不得启动第二个 Executor。
- Executor 的第一动作必须是完整读取本文件，并在任何命令、页面操作或代码修改前记录 current.md 读取前 SHA-256、行数、字节数、时间和工作区根目录。每项任务完成后，先执行本任务的验证，再向 `.codex/plans/execution-log.md` 追加“操作 → 直接证据 → 命令/退出码 → 结果 → 回滚或暂停原因 → 文件 SHA”，不得跳项、并行或用后项结果倒填前项。
- 保持 `project.config.json` 的 `compileType=miniprogram`、AppID `touristappid`、`miniprogramRoot=miniprogram/`、目标基础库 `3.4.3`；保持应用版本 `1.4.0`、数据 schema 数值 `4`/名称 `1.3`。不注册或替换 AppID，不接入网络、云开发、云存储、真实 LLM、远程反馈、主动推送、openId 登录或第三方依赖，不清空用户数据来规避测试。
- v2.2 处理离线源码中已经由证据定位的缺口，不重复 v2.1 的 DevTools 页面探测。现有源路径编译证据仍可引用，但本轮不把新的运行时操作当作任务；真实微信/设备/系统能力继续按第 6 节固定 `BLOCKED / 未验证`。
- 任何修改超出本计划允许文件、需要更改 schema/version/AppID、需要真实账号/网络/系统权限、或无法给出可回滚状态时，立即在执行日志记录原因并停止，不扩大范围。

## 1. PRD → 当前实现审计结论

### 1.1 PRD 契约（只取本轮相关证据）

- PRD 3.1 要求八条有喂养/抚摸/状态栏/四级成长，状态资源目录包含 `idle/happy/eating/sleeping/sad`；当前源码由 `models/cat.js` 的 `FORM_META`、`CAT_STATES`、`getFormAsset()` 统一处理，四形态各只有 `idle.png`，其他状态明确回退 idle + CSS/Emoji。
- PRD 3.2 要求菜谱有未解锁/已解锁/甜品区，未解锁详情应显示还没吃过、占位和解锁入口；当前 `recipe-card` 有锁定语义，但 `recipe-detail.wxml` 对无照片记录统一显示“还没有照片，先把菜名收藏起来吧”，未把 `isUnlocked=false` 明确呈现为锁定态。
- PRD 3.2.3/3.2.4 要求照片上传、补图、评分、删除；当前 `recipeService.addPhotos()` 先保存文件再更新 metadata，metadata 写失败时没有清理本次新文件；`recipe-add` 新建菜品先写空记录，后续补图失败可能留下用户未确认的空菜品。
- PRD 3.3 要求相册上传/预览/删除且不误删共享文件；`albumService.removeAsync()`、媒体 presenter 和 v2.1 空态/取消证据已经覆盖安全占位与共享引用保护，本轮不重做运行时相册探测。
- PRD 3.4 要求资料、绑定、反馈和设置。绑定深链/本机提示、反馈本地保存、能力原因和开关回归已有直接源码与 smoke 证据；本轮只补发现的头像未保存文件回滚和容量提示，不重写已通过入口。

### 1.2 当前源码证据与本轮可完成缺口

1. **菜谱照片事务缺口（P0，本地可完成）**：`miniprogram/services/recipeService.js:addPhotos` 在 `saveImageChecked()` 成功后调用 `update()`；若 Storage metadata 写失败，新增文件没有回滚。`pages/recipe-add/recipe-add.js` 对新菜先 `create()` 再 `addPhotos()`，补图失败时可能保留空菜记录。现有 `smoke-file-cleanup.js` 覆盖删除/清除失败，但没有覆盖这条添加事务。
2. **锁定详情语义缺口（P0，本地可完成）**：`recipe-card.wxml` 已显示“还没吃过哦~”，而 `recipe-detail.wxml` 的 `photo-empty` 没有锁定文案/状态徽标，评分与点赞区域对锁定记录仍可见。需要在不改变默认记录和补图入口的情况下把 `isUnlocked=false` 显式呈现为“还没吃过哦~ / 补充照片解锁”，补图成功后转为已解锁。
3. **容量与聊天事务缺口（P1，本地可完成）**：README 明确“超过上限保留已有记录并提示清理，不静默截断输入”，但 `chatService.addMessage()`、`feedbackService.submit()` 和关怀集合写入使用 `slice(-limit)`，聊天在只剩一个槽位时可能先写用户消息再因机器人消息失败，关怀/猫状态失败也可能留下部分聊天。应在达到 20/50 条时拒绝新写入、给稳定错误码，并为一次聊天提交提供可回滚的消息/猫/关怀事件边界。
4. **未保存头像文件缺口（P1，本地可完成）**：`pages/profile-edit/profile-edit.js:pickAvatar` 立即保存文件，用户取消资料、重选头像或资料写失败时没有撤销本次新文件；`pageTask` 取消异步回调也没有统一清理路径。可在当前本地文件适配器上跟踪 pending avatar，在未提交/页面卸载时清理，保存成功后再解除 pending；不在本轮处理真实系统相册权限或旧头像的设备级回收。
5. **能力/反馈提示属于回归项（P1，已有大部分实现）**：`runtimeCapabilities.js` 已区分 `wx_missing`/`method_missing`/`can_i_use_denied`/策略禁用，bind/album/feedback 页面已有复制、选图、保存相册和本地反馈提示。本轮只增加 headless 断言确保这些提示在容量/取消/权限失败后仍可见且 busy 复位，不凭静态 `canIUse` 声称真实能力通过。

### 1.3 不在本轮伪造或扩大范围的缺口

- 四形态 `happy/eating/sleeping/sad` 专用 PNG、3D/帧动画：资源目录和 `assets/README.md` 明确目前只有四张 idle，现有预算为猫图 1,374,256 bytes、`miniprogram` 1,610,501 bytes；没有用户提供的新素材，本轮不复制/生成假素材、不改资源预算。
- 云端绑定/跨设备同步、真实微信好友发送、登录/openId、真实 LLM/远程反馈/主动通知：当前配置和 README 明确禁用，必须等 AppID、账号、后端和网络授权。
- 系统相册权限与保存、真实图片选择/文件 save/unlink 时序、Storage 10MB 配额/进程杀死恢复、真机安全区/字体/键盘/滚动/长按：只能由真实系统/设备证据证明；headless stub、占位图、`canIUse` 和已有 DevTools AX 不能替代。

## 2. v2.1 归档、当前基线与保护哈希

### 2.1 v2.1 原样归档（Planner 已完成）

- 覆盖前 `.codex/plans/current.md`（v2.1）已原样复制为 `.codex/plans/history/current-v2.1-2026-09-29.md`。
- 归档校验：**229 行、26815 bytes、SHA-256 `f463b1575bb00b7407cacc5e0f19e28e266d24f5991532947db23adec149a8c7`**；归档不得覆盖、重写或追加。
- v2.0 归档仍为 **128 行、18475 bytes、SHA-256 `b8b5586dc268a6508cc269cfb18e4b9ed91a2db11b16779ed12a882597c921b4`**。

### 2.2 Planner 只读基线（2026-09-29）

- 离线现状真实输出：`audit-assets.js` → `ASSET_CAT_COUNT=4`、`ASSET_CAT_BYTES=1374256`、`ASSET_MINIPROGRAM_BYTES=1610501`、`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`；`validate-miniapp.js` → `AUDIT_FILES=118`、`ERRORS=0`、`WARNINGS=0`；49 个 JS `node --check` 退出码 0；storage/cat/photo/file/care/invariants/recovery/lifecycle/local/pages/capabilities smoke 全部 `PASS`（`smoke-pages` 当前 66 assertions）；JSON 解析、`PAGE_STORAGE_LEAK=0`、`STATIC_RISK_SCAN=0` 均退出 0。
- 关键版本：`project.config.json` `compileType=miniprogram`、`appid=touristappid`、`miniprogramRoot=miniprogram/`、`libVersion=3.4.3`；`utils/appMeta.js` 为 `1.4.0`；`storageService.js` 为 schema `4`/`1.3`。
- 当前直接证据包括：v2.1 锁定菜谱详情只读进入/返回、设置开关翻转/持久化/恢复、相册空态与选择器取消；长按真实 hold、真实相册保存/删除和云/好友继续未验证。本计划不把这些旧证据升级或重复探测。

### 2.3 Executor 必须保存的 T0 保护哈希

T0 先用 Python/Node 读取二进制计算 SHA-256；以下值必须保持不变，除非本计划明确允许（本计划不允许修改它们）：

| 文件 | T0 SHA-256 |
| --- | --- |
| `.codex/plans/history/current-v2.1-2026-09-29.md` | `f463b1575bb00b7407cacc5e0f19e28e266d24f5991532947db23adec149a8c7` |
| `.codex/plans/history/current-v2.0-2026-09-29.md` | `b8b5586dc268a6508cc269cfb18e4b9ed91a2db11b16779ed12a882597c921b4` |
| `project.config.json` | `999c1adb4c03d85076878a88ba4a3d3a32381ad5d35805f4fd70578d0fcab47b` |
| `project.private.config.json` | `240345d4b88b5bd08caba18d2ba92d70b03bd8f2ed188ca5b1db23e45387b161` |
| `miniprogram/utils/appMeta.js` | `99ca2165f530dc4e43660a56d48e98bc6dbfe1fa3c0d6fcbb485b8672a5d49c1` |
| `miniprogram/services/storageService.js` | `50db6c11e9fe823eebdefaaa5c36f62dded828d62b1fa7b718c0790f67adf5c6` |
| `miniprogram/components/chat-bubble/chat-bubble.wxml` | `68e2ddb7d149f5e8e958b27a0fb812fabd46a9bdd3e42d4704d220e257706a3f` |
| `miniprogram/models/cat.js` | `f99046415a73b6eb323a5402befc20e0a0eded367a9ef287b3fb3402154a085e` |

T0 还须记录 `README.md`（当前 168 行/21821 bytes/SHA `9ead57538ba1fbd08292ac38bac397220d1bfe25ab178dd3b3ff76559b5a107e`）、`execution-log.md`（当前 1140 行/209731 bytes/SHA `90fc87e6fd815feb6224ac08c41d0672f286c8be12f8bd2c6ce481b075c45c10`）、`miniprogram`/`scripts` 内容树摘要和所有资源 SHA；这些两份文档只可由 T4 按事实追加。

## 3. 串行任务与验收

### T0：读取计划、冻结 v2.1 基线与文件边界

**目标**：证明 Executor 从本计划和 v2.1 原样归档开始，现有源码/配置/资源未漂移；不重复运行时探测。

**允许修改文件**：仅 `.codex/plans/execution-log.md` 追加 T0 记录；不得改 README、current、业务源码、资源、配置、依赖或脚本。

**操作与验证（逐条记录退出码）**：

1. 完整读取 `.codex/plans/current.md`，记录读取前 hash/行/字节/时间；确认没有第二个 Executor。
2. 校验两份历史归档的行数、字节和 SHA；记录配置、版本、schema、AppID、关键保护文件和内容树摘要。
3. 按 README 顺序运行资源审计、49 个 JS `node --check`、`validate-miniapp.js`、全部现有 smoke、JSON 解析、页面 Storage 越层和静态风险扫描；每条命令单独记录退出码和关键 stdout。
4. 仅检查已有执行日志中的 v2.1 源路径/编译证据，不打开 DevTools、不点击系统权限/分享/相册、不创建临时运行时副本。

**通过条件**：归档/hash/配置未漂移，所有离线命令退出码 0，受保护文件与资源未改。输出 `V22_T0_OFFLINE_BASELINE=PASS`。

**停止与回滚**：归档不符、工作区存在计划外源码/资源变化、任一命令非 0 或当前计划读取前 hash 无法记录，追加失败原因并停止 T1；T0 无业务回滚。

### T1：菜谱照片事务回滚与锁定详情闭环

**目标**：让未解锁菜谱的详情语义符合 PRD，并保证“保存文件 → 写 metadata”失败时不留下成功 metadata、孤儿文件或新建空菜记录。

**允许修改文件（仅这些）**：

- `miniprogram/services/recipeService.js`
- `miniprogram/pages/recipe-add/recipe-add.js`
- `miniprogram/pages/recipe-detail/recipe-detail.js`
- `miniprogram/pages/recipe-detail/recipe-detail.wxml`
- `miniprogram/pages/recipe-detail/recipe-detail.wxss`
- `scripts/smoke-file-cleanup.js`
- `scripts/smoke-pages.js`
- `scripts/validate-miniapp.js`（只增加可复查的 v2.2 锁定/事务静态契约）

**实现约束**：

1. `recipeService.addPhotos()` 保存的路径必须记录为本次 transaction；metadata `update()` 失败时仅尝试清理本次新路径，保留原 recipe metadata，返回稳定 `file_save_failed`/`storage_write_failed` 与 `failedFiles`，不得报告解锁成功。清理失败仍须可诊断，不得删除原记录或其它 recipe/album/avatar 共享引用。
2. `recipe-add` 新建菜品补图失败时回滚本次新建的空 recipe；若回滚本身失败，返回明确 `recipe_creation_rollback_failed` 并保留可重试记录，不伪造成功。编辑已有菜品失败不得改变旧照片集合。
3. `recipe-detail` 根据 `recipe.isUnlocked` 显示锁定徽标/“还没吃过哦~”/“补充照片解锁”（等价短文案也必须保留锁定含义）；无照片占位继续不向 `<image>` 传入坏 URI。评分/点赞只在已解锁态显示或明确禁用；补图成功后重新 load，锁定语义消失并显示实拍/占位状态。
4. 保留现有 9 张上限、共享路径保护、删除确认、返回菜谱 Tab 和缺失 recipe 空态；不改 schema、默认菜谱数量、资源或真实系统选择器。

**任务验证与退出码**：

- 先运行 `node --check` 受影响 JS（退出码必须 0）。
- 运行 `node scripts/smoke-file-cleanup.js`（退出码 0；新增断言：recipe add metadata 写失败、文件 unlink 失败、重试、原照片集合和共享引用保持）。
- 运行 `node scripts/smoke-pages.js`（退出码 0；新增断言：锁定详情文案/CTA、补图成功转已解锁、补图失败 busy 复位且列表未变/新建空记录回滚）。
- 运行 `node scripts/validate-miniapp.js`（退出码 0；不得以字符串命中替代 headless 行为断言）。

**回滚/停止**：任一失败、发现孤儿 metadata/文件、旧记录被覆盖、详情把 locked 写成 unlocked，立即恢复 T1 允许文件到 T1 前 SHA 并在日志记录失败 fixture；不进入 T2。回滚验证至少重跑 `node --check`、`smoke-file-cleanup.js`、`smoke-pages.js`。

### T2：聊天/关怀/反馈容量保护与提交事务

**目标**：遵守 README“达到上限保留已有记录并提示清理”，避免 20 条聊天/50 条反馈静默丢旧记录，并让一次聊天在猫状态或关怀写入失败时可回滚或明确报告 pending。

**允许修改文件（仅这些）**：

- `miniprogram/services/chatService.js`
- `miniprogram/pages/chat/chat.js`
- `miniprogram/services/feedbackService.js`
- `scripts/smoke-care-atomic.js`
- `scripts/smoke-local.js`
- `scripts/smoke-pages.js`

**实现约束**：

1. `chatService.addMessage()` 达到 `LIMITS.CHAT_MESSAGES` 时拒绝新 message，保留原 20 条，设置稳定 `chat_limit` 错误；`sendMessage()` 在一次提交需要用户+八条回复（以及关怀消息时的第三条）前预留容量，不能先写一条再失败。页面使用服务错误/`mapError` 显示“聊天记录已达到上限，请先清理旧记录”或等价可执行提示，并在所有分支复位 `sending`。
2. `feedbackService.submit()` 达到 50 条时返回稳定 `feedback_limit`，不 `slice` 掉旧记录；页面保留现有输入、复制和“仅本地保存/尚未发送”语义。
3. 聊天事务以本次 message/cat/care event 快照或等价补偿为边界：用户消息、mock 回复、`catService.recordChat()`、关怀 event/message/finalize 任一步失败时，不得返回已送达的 careMessage；能回滚的部分必须恢复原集合/猫状态，无法回滚时返回稳定 pending/failed 清单并允许重试，不能吞掉失败。
4. 保持关怀泛化文案、同 tag 24 小时去重、设置开关和 `eventId` 结构；不把本机 partner 模拟写成跨设备通知。

**任务验证与退出码**：

- 运行 `node --check miniprogram/services/chatService.js`、`node --check miniprogram/pages/chat/chat.js`、`node --check miniprogram/services/feedbackService.js`（均为 0）。
- 运行 `node scripts/smoke-care-atomic.js`（退出码 0；新增聊天消息/猫/关怀失败无部分提交、失败后重试、无原始吐槽泄露断言）。
- 运行 `node scripts/smoke-local.js`（退出码 0；新增 chat=20、feedback=50 满量拒绝且旧记录保持断言；既有成长/迁移/清除断言不减少）。
- 运行 `node scripts/smoke-pages.js`（退出码 0；新增容量提示、busy 复位和 settings 清除后恢复断言）。

**回滚/停止**：若任何旧聊天/反馈被静默删除、失败结果仍出现 careMessage、cat 计数与消息不一致，恢复 T2 允许文件到前置 SHA，重跑上述三项 smoke 后停止；不得通过清除 Storage 让断言“通过”。

### T3：资料头像未提交回滚与能力提示回归

**目标**：处理本地可控的 pending avatar 生命周期，并复查绑定/反馈/选图/系统相册能力提示；不声称真实文件或权限成功。

**允许修改文件（仅这些）**：

- `miniprogram/pages/profile-edit/profile-edit.js`
- `scripts/smoke-pages.js`
- `scripts/smoke-capabilities.js`
- `scripts/validate-miniapp.js`（只增加 pending avatar/能力提示静态契约）

**实现约束**：

1. 资料页选择头像后跟踪 pending 路径；重选、资料校验/Storage 写入失败、页面返回/卸载或异步回调失效时，调用已有 `storage.removeImageChecked()` 清理仅由本次选择产生的受管路径；已提交成功的头像不得被 pending 清理。清理失败必须返回可见可重试错误，不删除当前仍引用的旧头像。
2. 继续使用 `runtimeCapabilities` 和 `errorMessage`：游客/无 wx、缺接口、`canIUse` 拒绝、取消选图、剪贴板/保存相册失败均保留原因和可继续操作；绑定页仍只预填邀请码不自动绑定，反馈仍说明本地未发送。不要添加权限申请、云调用或隐式分享。

**任务验证与退出码**：

- 运行受影响 JS `node --check`（退出码 0）。
- 扩展 `node scripts/smoke-pages.js`（退出码 0；用 wx/file stub 覆盖头像重选/取消/资料写失败清理、当前头像保留、binding invalid hint、feedback/chooseImage/saveAlbum capability 文案与 busy 复位）。
- 运行 `node scripts/smoke-capabilities.js`（退出码 0；`wx_missing`、`method_missing`、`can_i_use_denied`、share 与 shareMenu 独立原因仍通过）。

**回滚/停止**：出现当前头像被删、pending 文件无法清理、页面隐藏后重复 setData/重复 toast，恢复 T3 允许文件并重跑两项 smoke；真实 wx 文件系统/权限问题只记录为 BLOCKED，不用 stub 伪造 PASS。

### T4：完整离线回归、文档与 v2.2 收口

**目标**：确认 T0→T3 的源码修改可复查、没有计划外漂移，更新文档以反映事务/容量/锁定状态，并把真实外部边界明确交接。

**允许修改文件**：`.codex/plans/execution-log.md`、`README.md`、`.codex/plans/current.md` 的实际收口段；保留 T1–T3 已允许的业务/脚本修改。不得修改配置、依赖、AppID、schema/version、资源或历史归档。

**验证顺序（每条命令记录真实退出码；任一非 0 即停止）**：

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
```

追加一次 WXML 条件结构检查（必须输出 `WXML_CHAT_BUBBLE_STRUCTURE=PASS`）、WXSS 通配相邻组合器检查（`WXSS_UNIVERSAL_COMBINATORS=0`），并运行外链/凭据/TODO/FIXME/旧版本扫描（`STATIC_RISK_SCAN=0`）。重新校验 v2.0/v2.1 归档 hash、所有第 2.3 保护 hash、schema 4/1.3、version 1.4.0、AppID touristappid；记录 T1–T3 实际修改文件前后 SHA、current/README/execution-log 最终行数/字节/SHA。

**README 收口要求**：只按直接代码/离线输出追加 v2.2 事务回滚、锁定详情、容量拒绝、pending avatar 回滚和新增断言；不得把任何 headless smoke 写成微信 renderer、系统权限、好友分享、真机或云端通过。保留现有 v2.1 现场证据与 warning 原文。

**回滚/停止**：任一离线命令非 0、资源预算变化、保护 hash 漂移、旧数据丢失、静态风险命中、文档与 stdout 不一致或产生计划外文件，追加失败证据并停止，不宣称 v2.2 完成。T4 文档追加前先保存文档 hash，追加失败不得覆盖原日志。

## 4. 任务状态与交付标记（Executor 按事实填写）

- T0：`V22_T0_OFFLINE_BASELINE=PASS|BLOCKED`。
- T1：`V22_RECIPE_TRANSACTION=PASS|FAIL|BLOCKED`；`V22_RECIPE_LOCKED_DETAIL=PASS|FAIL|BLOCKED`。
- T2：`V22_CHAT_TRANSACTION=PASS|FAIL|BLOCKED`；`V22_CAPACITY_GUARD=PASS|FAIL|BLOCKED`。
- T3：`V22_AVATAR_ROLLBACK=PASS|PARTIAL|BLOCKED`；`V22_CAPABILITY_UX=PASS|PARTIAL|BLOCKED`。
- T4：`V22_OFFLINE_BASELINE=PASS|BLOCKED`。最终必须分开写“本地离线/源代码直接证据”和“真实微信/设备/云端仍阻塞”，不能用一个总 PASS 覆盖外部缺口。

## 5. 全局风险、回滚与安全边界

| 风险 | 直接检查 | 处理 |
| --- | --- | --- |
| recipe 文件先写后 metadata 失败 | stub 让 `setChecked`/`update` 失败，检查文件清理、旧 photos 和 recipe 数量 | 保留旧 metadata，清理本次路径；失败清单可重试；停在 T1 |
| chat/care 多 key 半提交 | stub 分别让 chat/cat/care 写失败，检查快照与 careMessage | 回滚可回滚 key，返回 pending/failed；停在 T2 |
| 达上限静默丢数据 | 填满 20/50 条后提交新值并比对首条/末条 | 拒绝新写入并提示清理；停在 T2 |
| pending avatar 误删 | stub 追踪 pending/当前头像路径，模拟重选、取消、写失败 | 只清 pending；当前引用保留；停在 T3 |
| 迁移/资源/配置漂移 | 归档、保护 hash、schema、asset audit | 立即停止，不改配置或删除数据 |
| 文档夸大能力 | README/日志逐条对照命令和直接证据 | 只写事实；真实外部项固定 BLOCKED |

## 6. 明确 BLOCKED / 未验证清单（v2.2 不伪造）

- 真实微信好友分享发送、跨设备邀请码绑定、云数据库/云存储/登录/openId、真实 LLM、远程反馈和主动推送：需要注册 AppID、账号、网络和后端。
- 系统相册权限授予/拒绝、`wx.saveImageToPhotosAlbum` 成功、真实选图与文件 save/unlink 生命周期、Storage 10MB 配额、进程中断/恢复：需要真实微信环境和设备；headless stub 只验证失败分支与回滚。
- 真机安全区、字体、键盘、滚动、swiper、长按/点击事件顺序和布局：需要真实设备；本轮不重复 DevTools 探测。
- `happy/eating/sleeping/sad` 专用猫咪 PNG、3D/帧动画和视觉验收：没有用户素材，当前 idle + CSS/Emoji fallback 是唯一诚实状态。
- 已有 v2.1 的游客/基础库/组件 selector/代理/计时 warning 保留原文；它们不能被静态 PASS 或本轮改码消除，新的 WXML/WXSS/`__route__`/权限模态/EPERM 若出现则按暂停条件处理。

## 7. 父 Agent 启动前独立校验与 Planner 停止点

父 Agent 在启动 Executor 前必须独立执行：

```bash
test -s .codex/plans/current.md
python3 - <<'PY'
from pathlib import Path
import hashlib
for name, lines, size, sha in [
  ('.codex/plans/history/current-v2.1-2026-09-29.md', 229, 26815, 'f463b1575bb00b7407cacc5e0f19e28e266d24f5991532947db23adec149a8c7'),
  ('.codex/plans/history/current-v2.0-2026-09-29.md', 128, 18475, 'b8b5586dc268a6508cc269cfb18e4b9ed91a2db11b16779ed12a882597c921b4')]:
    data = Path(name).read_bytes()
    assert data.count(b'\n') == lines and len(data) == size and hashlib.sha256(data).hexdigest() == sha
print('V22_ARCHIVES_IMMUTABLE=PASS')
PY
rg -n 'T0：|T1：|T2：|T3：|T4：|V22_RECIPE_TRANSACTION|V22_RECIPE_LOCKED_DETAIL|V22_CHAT_TRANSACTION|V22_CAPACITY_GUARD|V22_AVATAR_ROLLBACK|V22_CAPABILITY_UX|V22_OFFLINE_BASELINE|touristappid|BLOCKED / 未验证' .codex/plans/current.md
```

Planner 完成归档和本文件后停止；不追加执行日志、不改 README、不运行 Executor、不修改源码/资源/配置/依赖。Executor 完成后不得由 Planner 代写实际状态；所有 PASS/FAIL/BLOCKED 必须来自其逐项日志与可复查输出。

## v2.2 Executor 实际收口（2026-09-30）

- T0：`V22_T0_OFFLINE_BASELINE=PASS`。归档、保护哈希、配置、版本/schema、资源审计、49 个 JS 语法检查、validate、既有 smoke、JSON、页面 Storage 和静态风险扫描均通过；无计划外源码/配置/资源/依赖漂移。
- T1：`V22_RECIPE_TRANSACTION=PASS`；`V22_RECIPE_LOCKED_DETAIL=PASS`。照片新增事务、metadata 失败补偿、新建空记录回滚、锁定详情 CTA/评分点赞门控和补图解锁均由 headless smoke/静态契约直接覆盖。
- T2：`V22_CHAT_TRANSACTION=PASS`；`V22_CAPACITY_GUARD=PASS`。聊天/关怀事务快照补偿、20/50 容量拒绝、旧记录保留、页面容量提示和 busy 复位均由 smoke 直接覆盖。
- T3：`V22_AVATAR_ROLLBACK=PASS`；`V22_CAPABILITY_UX=PASS`。pending avatar 受管路径清理/current avatar 保护、失败可见提示、能力原因回归均由 smoke 直接覆盖。
- T4：`V22_OFFLINE_BASELINE=PASS`。T4 全部离线命令退出 0；最终 `ASSET_CAT_BYTES=1374256`、`ASSET_MINIPROGRAM_BYTES=1623865`、`AUDIT_FILES=118`、JSON/WXML/WXSS/Storage/static scans 均通过。T4 仅追加本收口段和 README/log 文档；业务修改文件限于计划列出的 T1–T3 文件。
- 实际修改文件：`miniprogram/services/recipeService.js`、`miniprogram/pages/recipe-add/recipe-add.js`、`miniprogram/pages/recipe-detail/recipe-detail.js`、`miniprogram/pages/recipe-detail/recipe-detail.wxml`、`miniprogram/pages/recipe-detail/recipe-detail.wxss`、`scripts/smoke-file-cleanup.js`、`scripts/smoke-pages.js`、`scripts/validate-miniapp.js`、`miniprogram/services/chatService.js`、`miniprogram/pages/chat/chat.js`、`miniprogram/services/feedbackService.js`、`scripts/smoke-care-atomic.js`、`scripts/smoke-local.js`、`miniprogram/pages/profile-edit/profile-edit.js`、`scripts/smoke-capabilities.js`，以及本文件、`README.md`、`.codex/plans/execution-log.md` 的追加。
- 外部边界仍固定 `BLOCKED / 未验证`：真实微信/设备系统相册权限、save/unlink、Storage 配额/进程恢复、好友/云绑定、真实 LLM/网络/推送、真机布局与手势、专用状态 PNG。不得用本地 smoke 或静态输出升级这些状态。
