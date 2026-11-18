# Planner 计划：v2.7 真实 AppID 与真机验收交付

## 0. 目标、依据与硬边界

本轮目标是把现有“本地游客模式 + DevTools 模拟器”证据交接为可复核的真实 AppID、真实微信账号和真实手机验收计划。验收范围以 PRD §3.1（猫咪聊天/养成）、§3.2（菜谱）、§3.3（相册）、§3.4（资料/绑定/设置）和 README §“微信开发者工具与真机检查表”为依据。

- `touristappid` 只能用于本地游客模式、离线检查和工具内受限路径，不能替代真实 AppID；不能把游客模式的分享、绑定、云服务、权限或 renderer 结果写成真实能力通过。
- 真实 AppID 必须由用户提供并确认属于目标小程序；不得猜测、生成、从历史日志复制或用任意 `wx...` 字符串冒充。
- 本轮不上传、不开发版本发布、不提交审核、不切生产、不创建云环境、不改后端、不发送真实好友消息；预览/真机调试仅用于用户授权的验收。
- Planner 只改本计划与旧 current 的归档。Executor 只能按 T0→Tn 串行执行，每项先追加原始证据再进入下一项；不启动并行 Executor。
- 计划缺少任一前置条件时，Executor 必须停止、记录 `BLOCKED` 和缺失项并报告；不得用游客 AppID、模拟器、stub、截图推测或离线 smoke 补齐真实证据。

## 1. 当前基线与角色分工

当前项目根目录：`/Users/lnp/Documents/ChatGPT/delicious- project`。现有配置事实：`project.config.json` 为 `compileType=miniprogram`、`appid=touristappid`、`miniprogramRoot=miniprogram/`、`libVersion=3.4.3`；private config 基础库为 `3.4.3`；应用版本 `1.4.0`；Storage schema `4/1.3`。README 已明确游客边界，历史 v2.5 白屏阻塞与 v2.6 本地 DevTools PASS 均不得改写。

### 1.1 本地可执行项（无需真实账号/手机）

- 读取 PRD、README、current、execution-log、项目配置和本计划。
- 运行 README 规定的资源审计、JS 语法检查、validate 与全部离线 smoke；核对 JSON、Storage 越层、WXML/WXSS 和静态风险。
- 记录项目树、保护文件、12 张 PNG、包体预算和当前游客配置 SHA；只读检查微信开发者工具是否安装、版本、原项目路径是否可打开。
- 设计证据表、风险矩阵和停止规则；保存命令 stdout、退出码、时间、SHA。

### 1.2 必须由用户提供/确认的前置条件

- 目标小程序真实 AppID（形如 `wx...`，以微信公众平台/开发者工具显示为准）及其归属确认；不能提供密钥、AppSecret 或个人隐私给 Planner。
- 拥有该 AppID 的开发者/管理员权限，且微信开发者工具已登录对应账号；必要时由用户完成扫码、权限确认、项目导入授权。
- 真机：用户自己的微信账号、已安装微信的实体手机、可扫码的 DevTools 预览二维码或“真机调试”连接；手机与电脑网络/USB/Wi-Fi 条件由用户确认。
- 若要验证云同步、好友绑定、真实反馈或 LLM，必须另行提供已配置且获授权的测试环境/测试账号；没有后端和测试数据时这些项保持 `BLOCKED`。
- macOS 文件夹访问权限、微信开发者工具登录和手机系统相册/通知权限如出现系统提示，只能由用户在系统设置或手机上完成。

### 1.3 不在本轮交付

上传、发布、审核、生产配置、真实支付、批量真实用户数据、后端/云函数实现、购买或申请主体资质、绕过权限、改用临时副本、以模拟器代替真机、以 AX/Node stub 代替手机证据。

## 2. 状态与证据规则

每项状态使用 `PASS`、`BLOCKED`、`NOT_RUN`；外部能力还可使用 `NOT_AVAILABLE`。PASS 必须有当轮时间、工具/手机型号、真实 AppID、基础库、实际路径、操作步骤、原始 Console/日志和截图/录屏引用。离线 PASS 只能证明本地代码契约。

出现登录/权限/扫码门槛、真实 AppID 不明、路径偏离、手机未连接、二维码过期、全局 renderer/WXML/WXSS/`__route__` 错误、意外写入用户数据、系统权限弹窗无法由用户处理时，立即停止当前及依赖项，追加日志后报告。不得重试到改变证据含义，不得删除或覆盖失败记录。

## 3. Executor 串行阶段

### T0：计划读取、前置条件闸门与冻结基线（本地）

1. 完整读取本 current、其归档 `.codex/plans/history/current-v2.7-2026-10-09.md`、README 相关章节、PRD §3.1/§3.2/§3.3/§3.4 和 execution-log 最近 v2.5/v2.6 段；记录 UTC 与 Asia/Shanghai 时间。
2. 验证归档逐字节一致；记录 current/归档行数、bytes、SHA。检查根目录及祖先路径 `AGENTS.md`，检查 `.codex/agents/*.toml`；没有适用指令时明确记为 none。
3. 运行离线基线：`node scripts/audit-assets.js`、全部 JS `node --check`、`node scripts/validate-miniapp.js`、README 中所有 smoke/静态检查；逐条保存 stdout 和退出码。
4. 读取并保存 `project.config.json`、`project.private.config.json`、`miniprogram/app.json`、`miniprogram/utils/appMeta.js`、`miniprogram/services/storageService.js` 的字段与 SHA；核对 `touristappid` 当前事实和 1.4.0/4/1.3/3.4.3。
5. 询问/核验前置条件清单：真实 AppID、开发者权限、已登录工具、测试手机、用户可扫码或连接。任何一项缺失记 `V27_T0_PREREQUISITES=BLOCKED`，停止 T1 及后续真实验收，仅可完成独立离线基线并报告。不能把 touristappid 记为替代条件。
6. 条件齐全且离线基线通过才记 `V27_T0_PREREQUISITES=PASS`；未改变业务源码、配置、资源、依赖或 AppID。

### T1：真实 AppID 项目接管与工具环境核验（用户协作）

1. 由用户在微信公众平台/开发者工具确认真实 AppID 和项目成员权限；Executor 只记录脱敏后的 AppID、账号角色和确认时间，不记录 AppSecret/令牌。
2. 在原项目目录打开项目设置，核对真实 AppID、`miniprogramRoot=miniprogram/`、目标基础库 `3.4.3`、工具 Stable 版本、项目路径和包体设置。若工具仍显示 `touristappid`、权限不足、导入其他路径或基础库不符，停止并记 `V27_T1_REAL_APPID=BLOCKED`；不得自行替换或保存配置。
3. 只有用户明确授权并提供真实 AppID 后，才允许把项目配置中的 AppID 更新为该值；更新前后记录完整文件 SHA 和 diff，禁止改其它配置。若用户不授权修改配置，保持现状并记 `BLOCKED`。
4. 清空 Console 后只执行一次普通编译；记录编译反馈、Debugger error/warning、AX route 与 fresh screenshot。首帧空白、AX 单独正确或 warning=0 均不能单独 PASS；需连续两组 route 与画面匹配的稳定截图。
5. `V27_T1_REAL_APPID` PASS 仅表示真实 AppID 项目能在 DevTools 编译并稳定显示；失败则停止依赖模拟器的后续阶段。不得上传、预览或发布。

### T2：真实账号登录与模拟器只读回归（本地工具 + 用户授权）

1. 使用真实 AppID 会话只读检查 chat、recipe、album、profile、settings、feedback、bind、profile-edit；不发送消息、不喂猫/摸猫、不保存资料、不切设置、不提交反馈、不上传/删除照片、不生成或分享邀请码。
2. 记录每页 route、截图、设备/缩放、基础库、Console 新增错误/告警；首帧与 route 不符时等待稳定后再取 fresh 证据，不能把缓存画面算通过。
3. 仅复核游客到真实 AppID 后的 renderer、布局和输入控件是否可见。真实好友、云端、系统相册、推送、LLM 等能力不因模拟器可见而 PASS。
4. 发现真实账号授权弹窗、云环境选择、数据写入或全局 renderer 错误时立即停在该项。记 `V27_T2_SIMULATOR_REVIEW=PASS|BLOCKED`。

### T3：生成真机验收通道（必须用户扫码/连接）

1. 用户在 DevTools 选择“预览”或“真机调试”，由用户用已登录目标微信扫描二维码/确认连接；Executor 不代替用户扫码，不复制二维码到外部服务。
2. 记录手机品牌/型号、系统版本、微信版本、连接方式、真实 AppID、基础库、工具版本、二维码/连接时间。二维码失效、手机未连接、账号无权限或页面仍为游客模式则记 `V27_T3_DEVICE_CHANNEL=BLOCKED`，停止 T4。
3. 真机调试产生的日志、截图/录屏、网络状态和 Console 只保存到项目执行日志引用；不得上传日志、通讯录、照片或凭据。预览/真机调试不等于发布。

### T4：真机只读核心路径验收（手机证据）

按顺序逐项取 fresh 截图/录屏与真机日志：启动/重载→chat→recipe 未解锁详情→album 空态→profile→settings/privacy→feedback 失败校验→返回/隐藏/重显。验证 Tab 切换、返回、滚动、键盘出现/收起、文本溢出、加载和错误文案。

- 不输入真实个人资料或敏感内容；聊天只可使用用户批准的最小测试词，默认不发送。
- 不点击会写入/上传/删除/分享/绑定的按钮；若产品路径必须写入才能验证，先记录为需用户明确授权的单独项，未获授权则 `NOT_RUN`。
- 手机布局、刘海/安全区、字体、横竖屏、触摸/长按（设备支持时）、中断后恢复必须以手机证据记录；DevTools AX 不替代这些证据。
- 任一页面白屏、崩溃、卡死、误写数据或权限弹窗无法处理，停止该路径及依赖路径。阶段记 `V27_T4_DEVICE_CORE=PASS|BLOCKED`，逐页面记录结果。

### T5：真机能力与失败边界验收（按授权拆分）

只有用户提供测试账号/对象并明确授权时才执行；否则逐项 `NOT_AVAILABLE`，不伪造 PASS。

- **分享/绑定**：两台真实微信账号、真实好友或第二测试账号；验证邀请码生成/输入、绑定成功/失败、解绑和分享回流。不得向非测试对象发送。
- **相册/文件**：用户选择测试照片，验证选图取消/拒绝、预览、描述保存、删除、保存到系统相册和文件清理；照片和路径只用测试数据。权限拒绝/设置跳转由用户操作。
- **云/远程**：仅当真实云环境、接口和测试数据已配置，验证登录/openId、跨设备同步、远程反馈、LLM/关怀/推送；否则保留产品当前“未接入”事实。
- **Storage/中断**：在可恢复测试数据和用户授权下验证容量提示、进程中断、重试、文件与记录一致性；不能破坏用户真实数据。
- 每项保存前后截图、手机/账号标识（脱敏）、日志和清理结果；失败或未授权状态不得升级为整体 PASS。记 `V27_T5_EXTERNAL_CAPABILITIES=PASS|PARTIAL|NOT_AVAILABLE|BLOCKED`。

### T6：回归与保护项复核（本地，可与真机失败独立完成）

1. 按 T0 顺序重跑 README 全部离线命令，逐条保存 stdout/exit code；包体必须 `<=2097152` 且余量非负，资源 errors/warnings 为 0。
2. 核对真实 AppID 变更仅限用户授权的 `project.config.json`（如发生），`project.private.config.json`、app.json、版本/schema、12 张 PNG、源码/脚本树及依赖无未授权漂移。若 AppID 仍 touristappid，则真实验收状态不能为 PASS。
3. 不因真实 AppID 接管而修改业务源码、资源、后端或上传设置；任何超出授权范围的 diff 记 BLOCKED。

### T7：事实收口、证据索引与交付（仅文档）

1. 追加 execution-log：各阶段时间、真实 AppID（可部分脱敏但需可核对）、工具/手机信息、路径、截图/录屏/Console/日志引用、命令 stdout/退出码、配置和 SHA。
2. 更新 README 只记录真实发生的结果；明确 touristappid 不能替代真实 AppID，模拟器/离线 smoke 不能替代真机，预览/真机调试不等于上传发布。
3. current 末尾追加状态矩阵：`V27_T0_PREREQUISITES`、`V27_T1_REAL_APPID`、`V27_T2_SIMULATOR_REVIEW`、`V27_T3_DEVICE_CHANNEL`、`V27_T4_DEVICE_CORE`、`V27_T5_EXTERNAL_CAPABILITIES`、`V27_T6_OFFLINE_REGRESSION`、`V27_T7_FACTUAL_CLOSEOUT`、`V27_DELIVERY`。
4. `V27_DELIVERY=PASS` 仅当真实 AppID、用户权限、扫码/连接、真机核心路径和离线回归均有完整证据；外部能力可按授权范围 PARTIAL，但未验证项必须逐项列出。任何前置缺失、真机未连接或上传/发布边界被触碰均为 BLOCKED/NOT_AVAILABLE。
5. 交付前再次记录 current 行数、bytes、SHA；不改写历史 v2.5/v2.6 结论，不删除失败证据，不启动发布。

## 4. Planner 停止点

本轮已将原 current 原字节归档为 `.codex/plans/history/current-v2.7-2026-10-09.md`，并以本 v2.7 计划替换 current。Planner 未改业务源码、README、execution-log、配置、资源、依赖或 AppID；未启动微信开发者工具编译、未请求扫码、未启动 Executor、未上传或发布。父 Agent 复核本计划和前置条件后，才可启动唯一 Executor。

