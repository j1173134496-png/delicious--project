# Planner 计划：v2.8 全界面 Bug 审计与最小修复交接

## 0. 审计结论与边界

本轮先完成了文档/源码/离线 smoke 检查，并在微信开发者工具 `com.github.Electron`（Stable 2.02.2608070，基础库 3.4.3，项目 batiao-love，模拟器 iPhone 12/13 Pro 94%）进行只读 AX 现场检查。没有发送聊天、喂猫、绑定、分享、切换设置、上传/删除/保存照片、提交反馈、修改资料、上传发布或替换 AppID。Planner 未改业务源码、README 或 execution-log。

旧计划已原字节归档：`.codex/plans/history/current-v2.7-archived-20261011-000818.md`，SHA-256 `dcd3419d40ab6e8badf38e415b321be925748eb4f5e157c7ac09632a4eaea8b3`。本文件为新计划，写入后 SHA 由交付前命令记录。

## 1. 证据基线

- `project.config.json:36` 当前 AppID 为 `wxb029c9fda84d6cfb`；与旧文档中“必须保持 touristappid”及 `scripts/validate-miniapp.js` 的断言冲突。
- `miniprogram/app.json` 有 13 个页面、4 个 Tab：chat、recipe、album、profile；二级页 recipe-detail、recipe-add、album-upload、profile-edit、bind、settings、about、privacy、feedback。
- `node scripts/audit-assets.js` PASS：包体 1,633,568 bytes，预算余量 463,584，资源错误/警告 0。
- JS `node --check` PASS；`smoke-local/pages/capabilities/lifecycle/cat-interaction/photo-presenter/file-cleanup/care-atomic/storage-atomic/invariants/recovery` 全部 PASS；`smoke-pages` 104 assertions PASS（其中预期注入失败 fixture 会输出 error 诊断）。
- `node scripts/validate-miniapp.js` FAIL（1 error）：`project.config.json appid must remain touristappid for local guest mode`。这是当前回归阻塞，而不是业务页运行时错误。
- DevTools AX 初始 chat 可见：猫咪、喂食/摸摸、聊天输入/发送、经验进度和四 Tab 均存在；Console/Debugger 错误计数 0，Warnings 初始 5。

## 2. Bug 清单（按严重级别）

### B1（P1，回归门禁阻塞）：AppID 断言与当前配置互相矛盾

- 页面/范围：全局配置与离线验证。
- 复现：运行 `node scripts/validate-miniapp.js`。
- 期望：验证器应按当前受控 AppID/本地模式策略通过，或明确要求用户确认真实 AppID；不能把已配置的 `wxb029c9fda84d6cfb` 判为非法而要求 `touristappid`。
- 实际：退出码 1，唯一错误为 `project.config.json appid must remain touristappid for local guest mode`。
- 证据：命令 stdout/exit=1；`project.config.json:36`；`scripts/validate-miniapp.js` 的 AppID 检查（定位用 `rg -n "appid must remain|touristappid" scripts/validate-miniapp.js`）。
- 最小修复方向：Executor 先确认目标 AppID 归属与 local/real 模式策略；再只修改 validator 的策略断言、README/current 中对应事实和必要 smoke fixture，或由用户明确回退 touristappid。禁止 Planner/Executor 猜测或自行替换 AppID。

### B2（P1，现场首帧/生命周期）：首次切换相册出现空白 WebView，重新进入后才显示空态

- 页面：`pages/album/album`。
- 复现：在 chat 首次点击“相册”Tab，AX 显示 `HTML 内容 Webview: pages/album/album` 但没有页面文案；随后切到 profile 再返回/再次观察，才出现“我们的相册”、未绑定文案、0 张照片、空态和上传按钮。
- 期望：首次路由稳定后即显示相册 hero、空态和上传入口。
- 实际：首次观察到空 WebView；后续重进可见。可能是 DevTools 模拟器首帧/旧 WebView AX 时序，需在解锁后复现并取 fresh screenshot、route、Console 证据，尚不能认定已完全修复。
- 源定位：`miniprogram/pages/album/album.js:onShow/load`、`album.wxml:1-5`、`components/empty-state/*`。
- 最小修复方向：只在证据确认后修复页面激活/数据加载或首帧占位；加入一次性 fresh-route 验证，不能靠隐藏旧 WebView AX 推断 PASS。

### B3（P1，未归因运行时告警）：调试器 warnings 随页面导航递增

- 范围：chat→recipe→album→profile→profile-edit/bind 导航期间，Debugger Errors=0，但 Warnings 从 5 增至 9。
- 复现：清空 Console，普通编译，逐一切换四 Tab 与二级页，记录 warning 文本；当前只看到计数，因 Mac 锁屏未能展开 Debugger 读取原文。
- 期望：无新增未解释 warning，或每条有明确可接受原因。
- 实际：计数增加；无法判定是 WXML/ARIA、图片、生命周期还是工具噪声。
- 证据：现场 AX 树：`调试器 - Errors: 0, Warnings: 5/6/7/8/9`；错误始终 0；Mac 锁屏导致 Console 原文未验证。
- 最小修复方向：解锁后一次性采集 warning 原文和页面 route，按重复根因修复；若为工具噪声则在计划/日志中保留可复核解释，不改业务逻辑。

### B4（P2，辅助功能）：profile 猫咪状态图片无可读标签

- 页面：`pages/profile/profile`。
- 复现：打开我的页，AX 将成长区图片报告为“图像”，未包含当前形态/状态替代文本。
- 证据：`profile.wxml:34` `<image ...>` 无 `aria-label`/替代文本；AX 行 173 仅为“图像”。
- 最小修复方向：为状态图片提供与 emoji fallback 一致的短 `aria-label`，并在 AX smoke 增加断言；验证不改变视觉布局。

## 3. 已验证页面矩阵

| 页面 | 只读现场结果 | 证据/限制 |
|---|---|---|
| chat Tab | PASS（首帧可见） | AX 有猫咪、状态、喂食/摸摸、输入、发送、经验进度；未发送消息 |
| recipe Tab | PASS（首帧可见） | AX 有分类、9 个未解锁卡、`新增菜品`；未进入写入路径 |
| album Tab | PARTIAL/P1 B2 | 首次空 WebView，重新进入后空态 PASS；需解锁复测 |
| profile Tab | PASS | AX 有资料、绑定入口、成长统计、设置/关于入口 |
| profile-edit | PASS（只读） | AX 有昵称/性别/生日/纪念日/签名/保存；未输入/保存 |
| recipe-detail | NOT_VERIFIED | 代码和 smoke 覆盖锁定详情；需现场点击未解锁卡后复测返回/错误态 |
| recipe-add | NOT_VERIFIED | 需点击新增才能到达，输入/保存会写本地数据，未执行 |
| album-upload | NOT_VERIFIED | 需点击上传，选图会触发系统相册/相机能力，按边界未执行 |
| bind | NOT_VERIFIED | 需进入并可能复制/输入/绑定；未操作邀请码/分享 |
| settings | NOT_VERIFIED | 需从 profile 进入；开关/清除均为写操作，Mac 锁屏前未取 AX |
| about | NOT_VERIFIED | 需导航；Mac 锁屏前未取 AX |
| privacy | NOT_VERIFIED | 需导航；Mac 锁屏前未取 AX |
| feedback | NOT_VERIFIED | 文本输入/提交会写本地反馈，未输入或提交 |
| 返回/空态/错误态 | PARTIAL | chat/recipe/album 空态可见；二级页返回、系统权限/选图取消、保存失败需后续只读或注入 fixture 验证 |

AX 中切换后仍保留旧页面 WebView 节点，属于 DevTools 容器观察限制；不能把隐藏节点当作当前页渲染证据。

## 4. Executor 串行修复计划（T0→Tn）

### T0 保护与复现冻结

1. 读取本计划及归档，记录 current/归档 bytes、SHA；检查 `AGENTS.md`（当前无适用文件）。
2. 保存当前配置、页面/组件/validator/smoke SHA；不得改 README、execution-log 以外文件，除 allowlist。
3. 解锁 DevTools 后清空 Console，普通编译；依次取四 Tab fresh 截图+AX+route，确认 B2/B3 是否重现。若出现白屏、崩溃、误写或系统权限弹窗，立即停止并记 BLOCKED。

### T1 AppID/验证策略修复（仅在用户确认后）

- Allowlist：`scripts/validate-miniapp.js`、与策略事实直接相关的测试 fixture；若确需文档事实，交由父 Agent 审批后改 README/current。禁止改 `project.config.json` AppID，除非用户明确提供并授权。
- 验证：真实 AppID 归属/账号权限由用户确认；validator 对该模式返回 0；tourist/local 模式边界仍有显式检查；配置 diff 仅允许授权字段。
- 停止条件：AppID 未确认、要求猜测/替换、出现权限/扫码门槛，立即 BLOCKED。

### T2 首帧与告警修复

- Allowlist：仅 B2 所涉 `miniprogram/pages/album/album.js/.wxml/.wxss`、必要共用组件；仅 B3 根因对应文件。
- 验证：普通编译后首次点击 album 即有 hero/空态/上传按钮；重复进入/Tab 返回保持稳定；Debugger Errors=0，Warnings 不新增或每条有日志解释；无旧 WebView 误判。
- 停止条件：无法在 fresh 截图+AX+route 中复现/归因，先保留 PARTIAL，不做猜测性重构。

### T3 辅助功能修复

- Allowlist：`miniprogram/pages/profile/profile.wxml` 与相关 smoke（如需要）。
- 验证：AX 能读出猫形态/状态标签；视觉截图和 `smoke-cat-interaction`/`smoke-pages` 保持 PASS。

### T4 只读页面回归

按 recipe-detail→recipe-add（只观察表单，不保存）→album-upload（只观察表单，不选图）→profile-edit（只观察，不保存）→bind（只观察，不复制/分享/绑定）→settings→about→privacy→feedback（只观察，不输入/提交）顺序执行。每页 fresh screenshot、AX、route、Console 增量；输入/权限/写入门控路径记 NOT_RUN，不伪造 PASS。返回按钮只在不写入情况下验证。

### T5 离线回归与保护项

运行：

```sh
node scripts/audit-assets.js
find miniprogram scripts -name '*.js' -print0 | xargs -0 -n1 node --check
node scripts/validate-miniapp.js
node scripts/smoke-local.js
node scripts/smoke-pages.js
node scripts/smoke-capabilities.js
node scripts/smoke-lifecycle.js
node scripts/smoke-cat-interaction.js
node scripts/smoke-photo-presenter.js
node scripts/smoke-file-cleanup.js
node scripts/smoke-care-atomic.js
node scripts/smoke-storage-atomic.js
node scripts/smoke-invariants.js
node scripts/smoke-recovery.js
```

包体必须 ≤2,097,152 bytes、资源 errors/warnings=0；未授权配置/资源/业务源码漂移即停止。

### T6 交付与手动复验

追加原始命令 stdout/退出码、现场截图/AX/Console 引用和未验证边界；回报 Bug 数/级别、修复文件 allowlist、回归结果、真机/系统权限未覆盖项。仅把可现场复核的项目标 PASS，要求用户手动复验四 Tab、返回、错误/空态与所有未验证二级页；不上传发布。

## 5. 停止条件与真机边界

- 当前现场是 DevTools 模拟器，不是真机；没有微信扫码/真机调试、系统相册、真实好友/云同步/远程反馈/LLM/推送证据。
- 任何真实账号权限、扫码、系统权限、照片、绑定、分享、清除数据、保存/提交操作由用户完成；Executor 不代替。
- Mac 锁屏、输入才可观察、权限弹窗、Console 原文缺失均保持 NOT_VERIFIED/BLOCKED；不得用离线 smoke 或 AX 隐藏节点补齐。

## 6. 当前状态

- 归档：PASS（原字节；SHA `dcd3419d40ab6e8badf38e415b321be925748eb4f5e157c7ac09632a4eaea8b3`）。
- Bug 总数：4（P1×3，P2×1）；B2/B3 需解锁后复现/归因，B1 已稳定复现，B4 已有源定位。
- 阻塞：是。`validate-miniapp` 当前失败；DevTools Mac 锁屏导致设置等页面和 warning 原文未验证；真机/真实账号能力未覆盖。
- Planner 改动：仅归档旧 current 与写入本计划；未改业务源码、README、execution-log、配置、资源、依赖或 AppID。
