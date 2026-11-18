# Planner 计划：v2.4 复核 v2.3 T4 包体预算门禁

## 0. 目标、依据与交接纪律

- 本计划只处理 v2.3 T4 因精确包体字节要求而产生的 `V23_OFFLINE_REGRESSION=BLOCKED`。它以离线复核、门禁校准后的验收和事实文档收口为范围，不重做 v2.3 T1–T3 实现。
- 历史 v2.3 current 计划已逐字节归档到 `.codex/plans/history/current-v2.3-2026-09-30-blocked.md`：**274 行、26453 bytes、SHA-256 `48314004e694801f48aefe28d8a992d4a7bbd14291a169a1b024e7c35d18bc74`**。此归档只读。原执行日志中 v2.3 T0–T3 的 PASS 和 T4 的 BLOCKED 均为历史事实；本计划不会改写成先前 PASS。
- 项目没有 `.codex/agents/planner.toml`、`.codex/agents/executor.toml` 或 `AGENTS.md`。父 Agent 本轮指定单一 Planner，故本文件为唯一当前计划。后续只能由父 Agent 在单一 Executor 完成独立复核后进入执行；严格按 T0→T3 串行，不启动并行 Executor。
- Planner 本轮只允许创建上述归档并写入本文件。Planner 不改 README、执行日志、业务源码、审计/验证脚本、配置、依赖或资源，不运行 Executor；完成本计划即停止。
- Executor 每项任务开始前核对上一项结果；只有上一项 PASS 才能开始下一项。T0–T2 只可追加 `.codex/plans/execution-log.md`；T3 在全部离线验收通过后才可追加 README、本计划事实收口和执行日志。每个任务都记录命令原文、逐条退出码、关键 stdout、文件行数/bytes/SHA、内容树与资源证据以及 PASS/BLOCKED 原因。

## 1. 已确认的产品与预算事实

PRD 说明 v1 的本地存储方案和图片资源目录；README 进一步定义四张形态 idle PNG、1.6 MiB 猫图预算、2 MiB 小程序非空文件预算和离线审计命令。文案、静态契约和离线校验源码是计划内改动，审计包体应按 README 的预算上限检查。

### 1.1 v2.3 已记录的阶段总量

| 阶段 | `ASSET_MINIPROGRAM_BYTES` | 相对上一阶段增加 | 执行日志证据 |
| --- | ---: | ---: | --- |
| v2.2 T0 / v2.3 T0 | 1,623,865 | — | v2.3 T0 与 v2.2 收口记录 |
| v2.3 T1 后 | 1,626,027 | 2,162 | v2.3 Executor T1 |
| v2.3 T2 后 | 1,629,412 | 3,385 | v2.3 Executor T2 |
| v2.3 T3 / T4 后 | 1,633,052 | 3,640 / 0 | v2.3 Executor T3、T4 |

从 v2.2 T0 到 v2.3 T3 的源码包增加共 **9,187 bytes**，等于 `2,162 + 3,385 + 3,640`；T1–T3 的改动文件、允许范围、各阶段资源审计输出和修改后 SHA 已逐项记在 `.codex/plans/execution-log.md`。v2.3 T4 记录其增加来自允许的页面文案、状态可读性和离线校验源码；四张猫图和八张 Tab PNG 均无变化。

### 1.2 正确验收门槛

- 保持四张 idle PNG 的数量、路径、字节数、尺寸、alpha、引用关系和 SHA 不变；猫图总量保持 `ASSET_CAT_BYTES=1374256`，猫图预算余量为 `303465` bytes。八张 Tab PNG 的数量、字节数和 SHA 也保持 v2.3 T0/T4 记录值。
- 小程序非空源文件总量只要求 `ASSET_MINIPROGRAM_BYTES <= ASSET_PACKAGE_BUDGET_BYTES`，其中预算为 `2097152` bytes；`ASSET_MINIPROGRAM_REMAINING_BYTES` 必须等于预算减实测值且大于或等于 0。
- 当前已观测的 `1633052` bytes 对应余量 `464100` bytes，低于 2 MiB 上限。**不要求源码包字节数等于 v2.2 T0 的 `1623865`，也不要求保留旧余量 `473287`。**旧精确字节等式是本次 BLOCKED 的错误计划门槛，不是产品或资源完整性要求。
- 预算数值必须来自 `node scripts/audit-assets.js` 的真实 stdout；不得按文档预填结果、改写审计脚本、删减有效文案/校验、伪造输出或为追求旧字节数而做无关压缩。
- 当前值须与 v2.3 T3/T4 已记录的 `1633052` 一致，且 `miniprogram`/`scripts` 内容树、T1–T3 文件 SHA、配置和二进制资源保护值没有未解释漂移。由于 v2.4 只允许文档/log 收口，任何当前源码包差值都必须能从 v2.3 已记录的阶段变化逐项追溯；无来源差值仍为 BLOCKED。
- `ASSET_ERRORS=0`、`ASSET_WARNINGS=0`。预算余量非负并不自动表示其它验收通过；全套离线回归、文档事实和保护范围仍须全部通过。

### 1.3 外部未验证边界

真实微信 renderer/无障碍树/布局与真机手势、系统相册及文件生命周期、真实分享与跨设备绑定、云服务/openId、LLM、远程反馈、推送、真实 Storage 配额、睡眠及其它专用猫图素材，仍按 v2.3 执行日志标记为 `BLOCKED / 未验证`。v2.4 的 Node、静态扫描和 stub 输出不升级这些结论。

## 2. 修改范围与保护基线

### 2.1 Planner 与 Executor 可修改文件

- Planner：仅 `.codex/plans/history/current-v2.3-2026-09-30-blocked.md`（原样归档）和 `.codex/plans/current.md`（本计划）。
- Executor T0、T1、T2：仅向 `.codex/plans/execution-log.md` 追加对应任务记录。
- Executor T3：仅向 `README.md`、`.codex/plans/current.md` 的事实收口段和 `.codex/plans/execution-log.md` 追加真实验收结果。
- Executor 全程不得更改 `miniprogram/**`、`scripts/**`、根配置、依赖、AppID、schema/version 或任何资源。不要改写或清理既有执行日志，不删改 v2.3 的 BLOCKED 原文；新证据只追加。

### 2.2 Executor T0 的冻结值

从 `.codex/plans/execution-log.md` 的 v2.3 T0、T1、T2、T3、T4 条目逐项复核下列值，并将执行时 SHA/行数/bytes 与工作区写入 T0 日志：

- v2.3 归档：274 行、26453 bytes、SHA `48314004e694801f48aefe28d8a992d4a7bbd14291a169a1b024e7c35d18bc74`。
- v2.3 最终 `miniprogram` 内容树：138 文件，SHA `a2caa91742be8d43b1ab481d3f37cd09fb2f1305471aef498ebc95feadbd1d74`；`scripts`：13 文件，SHA `2d41424a1a1e2c1511f59436e292d51140e7b17d3241468ba892c97da4f88dc8`。采用与 v2.3 日志相同的排序路径/逐文件 SHA 内容树算法，并记录复核命令；同时核对日志中 T1–T3 修改文件最终 SHA。
- 配置/核心保护 SHA：`project.config.json` `999c1adb4c03d85076878a88ba4a3d3a32381ad5d35805f4fd70578d0fcab47b`；`project.private.config.json` `240345d4b88b5bd08caba18d2ba92d70b03bd8f2ed188ca5b1db23e45387b161`；`miniprogram/utils/appMeta.js` `99ca2165f530dc4e43660a56d48e98bc6dbfe1fa3c0d6fcbb485b8672a5d49c1`；`miniprogram/services/storageService.js` `50db6c11e9fe823eebdefaaa5c36f62dded828d62b1fa7b718c0790f67adf5c6`；`miniprogram/services/recipeService.js` `e76c5642ae75b01049b91d304fac0ac1789f433dc97b311adda0c61ccc9e8247`；`miniprogram/components/chat-bubble/chat-bubble.wxml` `68e2ddb7d149f5e8e958b27a0fb812fabd46a9bdd3e42d4704d220e257706a3f`。
- 配置直接值：`compileType=miniprogram`、`appid=touristappid`、`miniprogramRoot=miniprogram/`、`libVersion=3.4.3`；应用版本 `1.4.0`；schema 数值 `4`、名称 `1.3`。
- 猫图、Tab PNG 逐项对照 v2.3 T0/T4 执行日志中的路径、size、dimension、alpha 和 SHA；四张 idle 总和必须为 `1374256` bytes。不得新增/删除/替换/复制/重压缩任何图片。
- 归档 v2.3 BLOCKED 结论必须完整保留。T0 只追加日志，不改业务、README 或本计划。

## 3. 串行验收任务

### T0：读取本计划并冻结历史证据

**目标**：证明 Executor 读取的是本 v2.4 计划，v2.3 历史计划和 T0–T4 事实未被改写，当前源码/脚本/配置/资源仍在 v2.3 最终保护基线。

**允许修改文件**：仅 `.codex/plans/execution-log.md` 追加 T0。

**操作**：

1. 在读取本计划前记录 `.codex/plans/current.md` 的 UTC/本地时间、行数、bytes、SHA-256 和工作区绝对路径；随后完整读取计划。按原字节校验 v2.3 归档三项元数据。
2. 阅读 `.codex/plans/execution-log.md` 的 v2.3 T0–T4 段；确认 T0–T3 的 PASS 和 T4 的 `V23_OFFLINE_REGRESSION=BLOCKED` 原文完整存在，特别确认旧门禁是精确源码包字节/余量要求。
3. 按 §2.2 复核配置、版本、schema、核心保护文件、资源 SHA，以及 `miniprogram`/`scripts` 文件数和内容树 SHA。确认没有新增并行 Executor。
4. 记录 README、执行日志、v2.3 归档和当前计划在第一次追加前的行数/bytes/SHA；T0 只追加本任务事实和结果。

**通过标记**：`V24_T0_EVIDENCE=PASS`；上述归档、保护值、历史状态和计划读取证据均可复核。

**停止**：归档不符、历史日志缺失/被改写、配置/资源/源码/脚本漂移无法由 v2.3 日志解释、计划读取元数据缺失，或发现并行 Executor 时，追加直接证据并标记 `V24_T0_EVIDENCE=BLOCKED`，停止后续任务；不回滚用户文件。

### T1：重新审计包体并对账 v2.3 阶段增量

**目标**：用当前资源审计器重新量取资源和小程序源文件字节，验证真预算门槛及源码增量来源。

**允许修改文件**：仅 `.codex/plans/execution-log.md` 追加 T1。

**命令与验收**：

```bash
node scripts/audit-assets.js
```

退出码必须为 `0`；真实 stdout 必须显示 `ASSET_CAT_COUNT=4`、`ASSET_CAT_BYTES=1374256`、`ASSET_MINIPROGRAM_BYTES=1633052`、`ASSET_BUDGET_BYTES=1677721`、`ASSET_PACKAGE_BUDGET_BYTES=2097152`、`ASSET_CAT_REMAINING_BYTES=303465`、`ASSET_MINIPROGRAM_REMAINING_BYTES=464100`、`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`。审计器列出的四张 idle 和八张 Tab PNG 的 SHA、size、dimensions、alpha 与 v2.3 T0/T4 日志一致。

将 T1–T3 阶段总量和增量逐项重算：`1623865 → 1626027 (+2162) → 1629412 (+3385) → 1633052 (+3640)`；`2162 + 3385 + 3640 = 9187`。T4 相对 T3 为 `0`。对照日志中各阶段允许文件和最终 SHA、配置/资源保护值和内容树摘要，确认增量只来自 v2.3 已批准的本地呈现/文案/离线校验源码，且 v2.4 未改变包内源码。

**通过标记**：`V24_T1_BUDGET_RECONCILIATION=PASS`；包体不超过 2 MiB、余量准确且非负、猫图资源未漂移、v2.3 阶段差额可复算，且没有超出范围的源码变化。必须明确写明本门禁不要求回到 `1623865`。

**停止**：任何真实资源 SHA/bytes/count/尺寸漂移、审计错误/警告、包体大于 `2097152`、余量负数、当前包体或内容树与 v2.3 T3/T4 不同且无法定位到日志中获准变更、阶段增量算不平，或审计脚本变化时，追加 stdout/哈希和原因，标记 `V24_T1_BUDGET_RECONCILIATION=BLOCKED`，停止 T2；不压缩/修改业务源码来掩盖差异。

### T2：全量离线回归和保护复核

**目标**：在新门禁下重跑 README 所列整套离线验收，复核 v2.3 页面呈现和 v2.2 事务保护没有退化。所有命令逐条串行执行；每条记录原命令、退出码、关键 stdout，不得用汇总 PASS 覆盖失败项。

**允许修改文件**：仅 `.codex/plans/execution-log.md` 追加 T2。

**命令顺序**：

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
```

每条命令退出码为 `0`；JS 检查应覆盖 49 个文件；validate 应报告 `AUDIT_FILES=118`、`ERRORS=0`、`WARNINGS=0` 和 v2.3 已建立的各项猫图回退、预算、可读文案、recipe/album、bind/feedback/settings 契约 PASS。smoke 必须分别保留其实际 PASS 标记和断言数量；`smoke-local` 仍显示 `SCHEMA_VERSION=4`。页面 smoke 中由注入失败产生的预期诊断可保留，但命令必须以 `SMOKE_PAGES=PASS` 和退出码 `0` 结束。

然后逐条运行：

```bash
python3 - <<'PY'
import json
import pathlib
for path in list(pathlib.Path('.').glob('*.json')) + list(pathlib.Path('miniprogram').rglob('*.json')):
    json.loads(path.read_text(encoding='utf-8'))
print('ALL_JSON_OK')
PY
if rg -n 'wx\.(get|set|remove|clear)Storage(?:Sync)?' miniprogram/pages; then exit 1; else echo PAGE_STORAGE_LEAK=0; fi
```

还须重跑 v2.3 T4 使用并已更正的 WXML chat-bubble 条件结构检查、WXSS 通配相邻组合器检查，以及 README/执行日志定义的外链、凭据、未完成标记和旧版本静态风险检查。逐条保留可复现命令与退出码，结果分别为 `WXML_CHAT_BUBBLE_STRUCTURE=PASS`、`WXSS_UNIVERSAL_COMBINATORS=0`、`STATIC_RISK_SCAN=0`。最后重新复核 §2.2 的配置、资源和内容树保护值、v2.3 归档三项元数据，记录 SHA；只在结束时追加 T2 记录。

**通过标记**：`V24_T2_OFFLINE_REGRESSION=PASS`；资源/包体仍满足 T1 的预算条件，完整 smoke、结构扫描、JSON 和保护值全部通过。

**停止**：任一命令退出码非零、断言缺失、预算/资源/保护值漂移、静态扫描命中、文件范围变化、文档或执行 stdout 相互矛盾时，保留失败直接证据，追加 `V24_T2_OFFLINE_REGRESSION=BLOCKED` 并停止 T3。此专项不改源码，不做回滚或“修复失败”。

### T3：事实文档收口与状态标记

**前置**：T0、T1、T2 均已有 `PASS`，且有唯一 Executor 依序完成。否则不得写总 PASS 或执行 T3。

**允许修改文件**：仅 `README.md`、本 `.codex/plans/current.md` 的 v2.4 事实收口段、`.codex/plans/execution-log.md`；仅追加。先记录每个文件的行数、bytes、SHA-256 与时间，再写入。

**文档事实**：

- 保留 v2.3 历史 `V23_OFFLINE_REGRESSION=BLOCKED`，说明其直接原因是旧计划误要求源码包回到 v2.2 的精确字节数；旧 v2.3 结果不改写成 PASS。
- 只在 T2 的新鲜 stdout 全部通过后，记录 v2.4 包体 `1633052/2097152`、余量 `464100`、猫图 `4 / 1374256 bytes`、PNG SHA 未变、阶段差额 `+9187` 可追踪、完整离线检查退出码和保护哈希。
- 说明调整后的门槛是包体不超 2 MiB、剩余字节非负、资源及源码增量可追踪。没有新增或重压缩资源，也没有改源码、脚本、配置、AppID、依赖、版本或 schema。
- 真实微信/云端/系统相册/真机和未交付状态素材仍为 `BLOCKED / 未验证`；离线 PASS 不表示这些能力通过。
- README 和本计划用词必须与最新 stdout 对齐。追加完成后再次记录 README/current/log 行数、bytes、SHA；人工逐句核对新增事实，并按 T2 原范围重跑 `miniprogram` 静态风险扫描，确保 `STATIC_RISK_SCAN=0`。不把历史状态标记或文档中用于说明边界的版本号纳入源码扫描范围。

**通过标记**：`V24_FACTUAL_CLOSEOUT=PASS`；README、current 和执行日志相互一致，原 v2.3 BLOCKED 事实保留，所有新结论都有命令/退出码/哈希支持。

**停止**：T2 未通过、文档追加失败、审计事实无法对应 stdout、旧状态被改写、静态扫描命中或文档 SHA 记录不全时，保留原文，追加可追加的失败事实并标记 `V24_FACTUAL_CLOSEOUT=BLOCKED`；不得用总 PASS 覆盖。

## 4. 状态和总停止规则

Executor 只可按实际证据填写以下状态；未执行或缺少任一命令不得填 PASS：

- `V24_T0_EVIDENCE=PASS|BLOCKED`
- `V24_T1_BUDGET_RECONCILIATION=PASS|BLOCKED`
- `V24_T2_OFFLINE_REGRESSION=PASS|BLOCKED`
- `V24_FACTUAL_CLOSEOUT=PASS|BLOCKED`
- 只有以上四项均 PASS，才可给出 `V24_OFFLINE_REVIEW=PASS`；任何实际包体超限、负余量、资源漂移、来源不明的增量或其它退化都必须为 `V24_OFFLINE_REVIEW=BLOCKED`。

发生预算超限时不删除合法文案、不改资源、不压缩源码、不降低或跳过回归。任何任务遇到不满足条件，应记录 stdout、命令退出码、相关路径 SHA 和当前文档元数据后立即停止后续任务。T0–T2 没有业务文件可回滚。

本计划的全部证据仅覆盖本地源文件审计、Node 语法检查、静态校验和 stub smoke。真实账号、AppID 认证、微信 renderer、云服务、网络、系统权限、系统相册、真实分享、真机文件生命周期、真实配额、布局、无障碍树、手势时序及未交付 PNG 未在本计划执行，仍为 `BLOCKED / 未验证`。

## 5. Planner 停止点

- 原 v2.3 计划已按字节归档；本文件已写入 v2.4 专项复核计划。本轮 Planner 不追加 README/执行日志、不跑审计或 smoke、不调用 Executor。
- 父 Agent 独立读取并核验本计划后，可以启动唯一 Executor。Executor 必须完整执行 T0→T3，先验证再进入下一项；未完成或 BLOCKED 时停止并如实交接。

## v2.4 Executor 事实收口（2026-10-08）

本次 v2.4 复核完成。v2.3 T4 的 `V23_OFFLINE_REGRESSION=BLOCKED` 仍是有效历史结论，其原因是旧计划错误要求源码包精确回到 v2.2 T0 的 `1623865` bytes/余量 `473287`；前次 v2.4 T0 因首次读计划前漏记时间而 BLOCKED 的日志也保留。本次重试先记录了 UTC `2026-10-08 06:28:19` / Asia/Shanghai `2026-10-08 14:28:19`，再读取计划，T0 重试按事实通过。

T1 `node scripts/audit-assets.js` 新鲜 stdout 为 `ASSET_CAT_COUNT=4`、`ASSET_CAT_BYTES=1374256`、`ASSET_MINIPROGRAM_BYTES=1633052`、`ASSET_PACKAGE_BUDGET_BYTES=2097152`、`ASSET_MINIPROGRAM_REMAINING_BYTES=464100`、`ASSET_ERRORS=0`、`ASSET_WARNINGS=0`；预算余量准确且非负。新的门槛为包体不超 2 MiB、剩余字节非负、PNG 保护值不变且源码增量可追踪，不要求恢复旧精确包体字节数。四张猫咪 idle 与八张 Tab PNG 的路径、size、dimensions、alpha、SHA 和引用关系符合 v2.3 T0/T4 保护记录；猫图为 4 张、共 `1374256` bytes，没有新增或重压缩资源。

各阶段实测总量为 `1623865 → 1626027 (+2162) → 1629412 (+3385) → 1633052 (+3640)`，T1–T3 共 `+9187` bytes，T4 `+0`。排序路径内容树和 T1–T3 记录的 49 个最终文件 SHA 均与 v2.3 证据一致；没有未解释的 v2.4 源码变化。T2 全量离线验收命令均退出 `0`：资源审计、49 个 JS `node --check`、validate（118 文件、0 errors/warnings、全部 v2.3 静态契约 PASS）、11 个 storage/cat/photo/file/care/invariants/recovery/lifecycle/local/pages/capabilities smoke、JSON、页面 Storage 越层、WXML 结构、WXSS 通配相邻组合器和风险扫描。Smoke 断言数及每条命令的 stdout/退出码详见执行日志。WXML 检查器和静态扫描的首次表达式问题、具体命中及修正后的完整覆盖也已如实记录。

最终保护哈希：`project.config.json` `999c1adb4c03d85076878a88ba4a3d3a32381ad5d35805f4fd70578d0fcab47b`；`project.private.config.json` `240345d4b88b5bd08caba18d2ba92d70b03bd8f2ed188ca5b1db23e45387b161`；`miniprogram/utils/appMeta.js` `99ca2165f530dc4e43660a56d48e98bc6dbfe1fa3c0d6fcbb485b8672a5d49c1`；`miniprogram/services/storageService.js` `50db6c11e9fe823eebdefaaa5c36f62dded828d62b1fa7b718c0790f67adf5c6`；`miniprogram/services/recipeService.js` `e76c5642ae75b01049b91d304fac0ac1789f433dc97b311adda0c61ccc9e8247`；`miniprogram/components/chat-bubble/chat-bubble.wxml` `68e2ddb7d149f5e8e958b27a0fb812fabd46a9bdd3e42d4704d220e257706a3f`。`miniprogram` 138-file tree SHA `a2caa91742be8d43b1ab481d3f37cd09fb2f1305471aef498ebc95feadbd1d74`; `scripts` 13-file tree SHA `2d41424a1a1e2c1511f59436e292d51140e7b17d3241468ba892c97da4f88dc8`。v2.3 归档仍为 274 行/26453 bytes/SHA `48314004e694801f48aefe28d8a992d4a7bbd14291a169a1b024e7c35d18bc74`。

v2.4 没有修改业务源码、审计/验证脚本、配置、AppID、依赖、版本、schema 或资源；仅追加 README、本计划事实收口和执行日志。`V24_T0_EVIDENCE=PASS`（成功重试）、`V24_T1_BUDGET_RECONCILIATION=PASS`、`V24_T2_OFFLINE_REGRESSION=PASS`、`V24_FACTUAL_CLOSEOUT=PASS`、`V24_OFFLINE_REVIEW=PASS`。真实微信 renderer、真实账号/API、云服务、网络、系统相册、真机文件生命周期、真实配额、布局/无障碍/手势和未交付状态素材仍为 `BLOCKED / 未验证`；本地 Node、静态和 stub 结果不覆盖这些边界。
