# Planner 计划：v3.0「八条」原创真 3D 资产包与 XR-Frame 试点

## 0. Planner 交付与范围

本阶段把“能否自己制作真正的 3D 宠物”落成一个可审阅的资产包和一个有现场门禁的接入试点。先原创建模、验收独立 GLB 资产；只有本机微信 renderer、当前基础库、现有页面和包体门禁都提供新鲜证据后，才把试点接到猫展示组件。真机或包体条件未通过时，可交付独立资产包并明确标为 partial，继续保留现有 PNG/Emoji 路径。

- Planner 仅写 .codex/plans/current.md 与旧计划归档；本轮不改业务代码、资源、配置、测试、依赖或日志。
- 旧 current 已原字节归档为 .codex/plans/history/current-v2.9-20261013-pre-true-3d-assets.md；归档前后 cmp -s 通过，原文件与归档均为 313 行、25,925 bytes，SHA-256 b066cc325f184e714c229b0520d22230c36263d2f88ded56da1f8c1392ca5822。
- .codex/agents/planner.toml 不存在；当前项目内未发现 AGENTS.md。目录不是 Git 工作树，后续用文件路径白名单、SHA 和内容树核对，不假设 git diff 可用。
- 本文件是 Planner 阶段方案，不声称已生成模型、已通过微信 renderer 或已在真机运行。

## 1. 证据基线

### 1.1 PRD 与技术参考

- PRD 第 2.2 节把猫展示写成“3D/动态小猫”；第 3.1 节随后描述图片素材、CSS 与帧动画，并未定义必须采用的 3D runtime、模型格式或设备支持矩阵。因此本阶段将真 3D 作为受控试点，不推断 PRD 已确认生产 renderer。
- 微信官方 wechat-miniprogram/miniprogram-demo 当前包含 packageXRFrame、glTF animation、morph 与纹理压缩示例。这说明官方示例仓库中存在 XR-Frame/glTF 示例，不证明本项目的 app.json、当前页面 renderer、当前基础库或目标设备兼容。[官方小程序 Demo](https://github.com/wechat-miniprogram/miniprogram-demo/blob/master/miniprogram/app.json)
- 旧 xr-frame-cli 已废弃，本方案不使用；模型预处理采用推荐的社区 dtysky/xr-frame-toolkit。它只作离线工具，不是应用运行时依赖；使用前须记录版本、许可证、实际处理选项，并对优化输出重新验证。[XR-Frame Toolkit](https://github.com/dtysky/xr-frame-toolkit) · [旧 xr-frame-cli](https://github.com/wechat-miniprogram/xr-frame-cli)
- 官方示例或工具 README 不构成真机兼容性结论。兼容结论必须由本项目、当前基础库的 fresh build、fresh route 和设备证据支持。

### 1.2 本地现场基线

- project.config.json 当前 libVersion=3.4.3；miniprogram/app.json 没有 XR-Frame 页面或子包配置。不可由此推断 XR-Frame 已启用，也不默认切换页面或全局 renderer。
- 当前 cat-display 通过 image 显示静态 PNG，缺图/加载失败回退到 Emoji，状态视觉使用 WXSS；没有模型加载器或真实 3D 场景。
- 四张 idle.png 是二维透明插画：浅粉白绒毛、圆眼、蝴蝶结；Lv.2 为挥爪姿势，Lv.3 为 JK 水手服，Lv.4 为婚纱/头纱。它们可作高层视觉方向参考，不能当作现成网格、纹理或许可证明；新模型不逐像素描摹或由 PNG 自动反推网格。
- 本次已知包体 1,639,685 bytes / 2,097,152 bytes，剩余 457,467 bytes。已有四张 idle PNG 合计 1,374,256 bytes；旧 audit-assets.js 只审 PNG/四个 idle 引用，不能单独作为 glTF/GLB 门禁。
- v2.9 日志结论是离线回归通过、renderer 与真机未验证；此前 DevTools fresh route 曾出现无法归因的 WXSS 编译错误页。Executor 必须先复现并建立可用的当前页面基线，不能把该错误页或旧截图记为成功。
- 本机没有 blender、bpy 或 trimesh；Homebrew 可用。需要先明确取得可运行 Blender 的来源和版本；不能假设本机已有建模/验证环境。

## 2. 一次性交付目标与模型决策

### 2.1 一次性交付目标

交付一个可脱离小程序包单独审阅的原创资产目录 artifacts/batiao-3d/，含：

1. Blender 主工程 source/batiao_master.blend 与可复现导出脚本/说明。
2. 四个二进制 glTF 2.0 文件：lv1-baby.glb、lv2-genki.glb、lv3-jk.glb、lv4-bride.glb。每个文件可独立加载，不引用外部 URI、网络文件或临时路径。
3. 四形态共用同一套骨骼名称、父子层级、Rest Pose 约定和动画命名；每个 GLB 都含 idle、happy、eating、sleeping、sad 五个 clip。不是 20 个分散的状态模型，也不在每个状态复制一份静态网格。
4. manifest.json：模型路径、SHA-256、字节数、GLB 版本、三角面数、材质/贴图统计、骨架/动作名、导出/优化工具与版本、来源/许可记录。
5. previews/：四形态正/侧/背面静帧、四形态 × 五状态的联系表或短预览、构建后 GLB 的 Blender 重导入截图，以及 renderer 通过时的真实页面截图和设备信息。
6. README.md 与 PROVENANCE.md：打开预览、重建和校验步骤，原创范围、创作工具版本、第三方工具许可证、任何实际引入的外部内容及其许可。没有外部模型/贴图时明确记录“未引入”。

### 2.2 角色与动画

- 造型以原创、可读的软萌立体猫为目标：保留粉白配色、大眼、猫耳、尾巴与四形态识别元素；用低面数分块和少量立体毛簇表现绒感，不使用粒子毛发或大量透明面片。
- 四形态各有独立网格和服饰/配件，保持相同角色比例与构图。Lv.1 蝴蝶结，Lv.2 星形发饰/领结，Lv.3 水手服元素，Lv.4 头纱/礼服元素作为识别点；此列表是新模型的设计要求，不是对现有 PNG 细节的重描。
- 四份 GLB 使用完全一致的骨骼层级与同名骨骼，至少涵盖 root/body/head、耳、四肢、jaw/eye-lid、分段 tail。动作通过骨骼和标准节点 TRS 动画实现；首轮不依赖 morph target、运行时材质脚本或未证实的私有 glTF 扩展。
- 五个 clip 的最低表现：
  - idle：循环呼吸、眨眼、尾巴轻摆。
  - happy：短跃/抬爪、耳朵和尾巴上扬。
  - eating：身体前倾、头/下颌和前爪有节奏动作。
  - sleeping：蜷卧、慢呼吸、闭眼。
  - sad：头和耳朵轻垂、尾巴降低，动作幅度小。
- 所有形态的五个 clip 时长、事件边界和根位移约定一致，便于按 cat.stateKey 切换；每次只加载当前形态 GLB，状态缺少/加载失败回到 idle，模型或 renderer 初始化失败继续显示当前 PNG/Emoji。
- 资产可原创建模，不需要 Blender 已安装于 Planner 环境。执行阶段若无法获得 Blender，不改用版权/来源不明的网格包；停止建模并如实报告工具链阻塞。

## 3. 原创、压缩、质量与包体门禁

### 3.1 来源和许可证门禁

- 网格、骨架、动作、材质与导出脚本均由本项目新建。现有 PNG 仅用于辨认整体粉白、软萌和四形态的抽象差异，不进行描图、像素取样生成纹理或自动网格重建。
- 禁止下载 Sketchfab、商城、搜索引擎或来源不清的模型/贴图后改名交付。若未来必须引入第三方组件，逐项写明原始 URL、作者、许可证、文件 SHA、修改方式和分发要求；许可不能确认就不进入资产包。
- PROVENANCE.md 记录 Blender/Toolkit/校验器版本和各自软件许可；工具许可证不等同于模型资产许可证。

### 3.2 模型与文件门禁

- 每形态目标 4,000–6,000 三角面，硬上限 8,000；每模型最多 6 个材质，骨架统一且每个顶点影响数不超过 4。
- 首选无位图贴图，用基础 PBR 颜色和几何细节；确需贴图时，单张不超过 256×256，总贴图压缩后不超过 40 KB，且所有贴图须内嵌。首轮不依赖 KTX2、WX_compress_textures 或其他扩展；若实际优化器生成扩展，必须用目标 runtime 重新验证。
- 每个 GLB 必须经 Blender 导入/重导入及 Khronos glTF Validator 检查；需校验 GLB header/version/长度、无外部 URI、四文件骨架层级相同、动画名完全齐全、材质/贴图统计、非空可见网格、包围盒方向/尺度一致。错误为 0；每个 warning 都要归因，未归因 warning 阻止接入。
- 优化顺序：先保留原生 Blender glTF 2.0 导出作为可回退产物；再将副本交给 XR-Frame Toolkit 候选预处理；逐文件比较 SHA、字节、网格/动作/贴图统计；优化结果必须能重导入并通过目标 runtime，否则使用已验证的原生 GLB。
- 必须提交所有五类动作的预览，不得只凭 Blender 静帧声称动画通过。

### 3.3 包体门禁

- 保留既有四张 idle PNG 和当前 Emoji fallback。重新计算小程序实际打包文件总和，不以 GLB 单文件压缩率或未打包目录大小代替。
- 当前已知小程序包体为 1,639,685 bytes，绝对上限 2,097,152 bytes；生产接入目标是整包不超过 1,900,000 bytes，至少保留 197,152 bytes 余量。
- 计划新增内容（四个压缩 GLB、运行时组件与必须配置）合计最多 260,315 bytes；四个 GLB 合计目标不超过 220,000 bytes，运行时/配置增量最多 40,315 bytes。所有值由实际输出测量，不按估算放行。
- 任一硬上限被超过，或整包大于 1,900,000 bytes，停止生产接入，不删减旧 PNG、不压糊模型、不改包体统计口径；完整原创资产保存在 artifacts/batiao-3d/，结论为 PARTIAL_ASSET_ONLY。绝对上限 2,097,152 bytes 从不豁免。
- 新建独立 scripts/audit-pet3d.js 检查四个 GLB 名单、格式、clip、SHA、逐项字节/总字节、模型统计和小程序包体；保留原 audit-assets.js 的四张 PNG 门禁，不让 GLB 掩盖 PNG 回退资产。

## 4. 串行执行计划（T0 → T10）

任何阶段均在上一阶段有记录且通过后才开始；失败即按阶段停止。资产制作与 renderer 接入可分开报告：T0–T4 可以交付独立资产包，T5–T9 才能形成小程序 3D 体验。

### T0 保护现场与可复现基线

**动作**

1. 读取 current 与 archive，重算 SHA/行数/bytes；检查 planner.toml、项目内 AGENTS.md、project.config.json、app.json、cat-display、models/cat.js、审计脚本。
2. 记录保护文件 SHA、完整 miniprogram 包内文件清单与总字节；确认现有 4 PNG、2D fallback、猫状态映射和基线 libVersion 3.4.3。
3. fresh DevTools 编译当前未加 XRFrame 的页面，采集基础库、工具版本、首页 route、首帧截图、AX 和 console。若现有 WXSS 编译错误页仍出现，记录完整证据并停止 renderer 接入阶段；不得把已有离线 smoke 当成 renderer 成功。
4. 运行原 node scripts/audit-assets.js 记录资产基线；不在 Planner 阶段运行代码或更改配置。

**T0 门禁**

- 保护文件与资源无漂移、现有审计退出码为 0，或每个已有失败均有明确定位。
- 若无稳定 fresh route，后续可独立制作资产，但 T5–T9 均为 NOT_VERIFIED，不得改现有主视图来猜测修复。

### T1 建立原创建模环境与规格冻结

**动作**

1. 查找 blender 可执行文件；本机当前未安装。若缺失，由 Executor 通过 Blender 官方发行版或 Homebrew cask 准备本机工具，记录来源、版本、架构和许可证；不得在小程序运行依赖里引入 Blender。
2. 确认可用的 glTF Validator。需要下载时使用 Khronos 官方发布渠道，并在 artifacts/batiao-3d/PROVENANCE.md 记录版本。
3. 定义统一单位、坐标、相机 framing、骨骼命名、动作命名、四形态识别点和三角面预算。用文本规格冻结并生成四形态白模 turntable 草图；白模未审阅通过不进入精模/动画。
4. 确认现有四张 PNG 的来源信息若可查只作项目内部风格参考；未知的既有素材许可不延伸到新网格来源。

**停止条件**

- Blender/校验工具无法取得或不能运行，停止 T2–T4 生成并报告工具链阻塞；不通过外部素材网站替代。
- 产品未确认导致四形态配件无法冻结时，保留目前抽象形态规则，并把产品细节标为待确认，不擅自加新角色设定。

### T2 原创主工程、共用骨架与动画

**允许写入**

- artifacts/batiao-3d/source/**
- artifacts/batiao-3d/previews/**（白模与主工程审图输出）

**动作与验收**

1. 建立一个 Blender 主工程，含四个独立形态 mesh/服饰组，共享完全相同的骨架命名和五个 action。
2. 用原创基础几何、手工编辑网格、顶点色/简单材质完成角色；主工程中不得链接外部网格、贴图、字体或动作。
3. 制作五个状态动作，分别检查起始/结束 pose 接续、循环无跳帧、地面接触和骨骼不穿模。全部四形态在 Blender 内以同一骨架播放动作。
4. 输出每个形态正/侧/背静帧和 20 个状态预览的联系表；检查 128–256px 等效显示尺寸下脸、耳、尾和识别配件仍清楚，四形态尺度不跳变。

**门禁**

- 视觉 QA 通过且源工程可重新打开；任何形态无法共用骨架或状态动画变形严重，留在 T2 修正，不进入 GLB。
- Blender 视口/render 结果只证明原始工程观感，不证明 glTF 导出或 XRFrame runtime。

### T3 导出四个 GLB 与压缩候选

**允许写入**

- artifacts/batiao-3d/glb/**
- artifacts/batiao-3d/manifest.json
- artifacts/batiao-3d/PROVENANCE.md
- artifacts/batiao-3d/previews/**

**动作与验收**

1. 从同一主工程分别导出四个独立 GLB。每份只含当前形态 mesh、共用命名骨架和相同五个动作，GLB 内无其他三个形态的隐藏网格。
2. 原生 GLB 先通过 T4 格式门禁；再对副本运行 XR-Frame Toolkit；对比优化前后大小与动画完整性。工具或格式不兼容时保留原生、已验证 GLB。
3. 生成 manifest 和 SHA；预览至少包括原生/优化版网格比较与五类动画关键 pose。每份产物能离线拷贝至另一目录后再打开，不依赖 Blender 临时路径。

### T4 离线结构、动画、许可证与尺寸审查

**允许写入**

- scripts/audit-pet3d.js
- scripts/smoke-pet3d-assets.js
- artifacts/batiao-3d/**

**验证**

- Khronos Validator：四份 GLB 的 error 数为 0；未归因 warning 数为 0。
- 离线 audit：每形态唯一 GLB，四份 rig 节点树同构，五个动画名称/时长/循环约定正确，无外部 URI，SHA/大小与 manifest 相等。
- 主工程重导入原生与优化版；至少抽查每份 GLB 的 idle/happy/eating/sleeping/sad 动画，无空模型、轴向反转、偏移、蒙皮破洞、跳帧或关键配件丢失。
- 确认 PROVENANCE.md 覆盖全部资产和工具来源，资产包不含不明授权文件。
- 输出每份和总 GLB 字节数。超出目标时可继续优化，但每次优化后完整重验；不能通过删除 sleeping/sad、丢形态或降低预览要求规避门禁。

**T4 结论**

- T4 全 PASS：得到可独立交付的 ASSET_PACKAGE_PASS。
- 质量、授权或结构门禁未过：停止接入；保留失败原因和可审阅的 partial 输出，不宣称可用于生产。

### T5 当前小程序中的最小 XR-Frame renderer 探针

**前置条件**

- T0 fresh DevTools 基线可运行；T4 asset package PASS；不改 project.config.json/project.private.config.json、AppID、全局基础库版本或相机/权限配置。
- 依照官方 Demo 的当前示例与官方开发文档核对实际组件、页面 renderer 要求和基础库支持范围；官方示例只用于形成探针，不代替本地通过。

**动作**

1. 用最小临时 route 和单个 idle GLB 建 XR-Frame 探针；必要时仅临时新增/移除 app.json 页面项，保护 appid/原页面顺序/配置字段，并记录前后 SHA。
2. 在当前项目当前基础库 3.4.3 做普通 fresh compile、fresh route；记录工具版本、route、console、GLB 加载完成证据、可见 canvas/model 截图。
3. 手动触发一个 idle→happy→sleeping→sad 序列，确认 clip 名、模型方向/尺度/透明背景、父视图尺寸和点击交互。
4. 将官方 toolkit 优化的输出也加载一次；优化输出失败时使用通过的原生 GLB，不宣称压缩版兼容。

**通过门禁**

- 当前页面能在 3.4.3 加载并渲染真实 GLB，五个 clip 中至少探针状态实际播放且无业务错误；连续重进两次仍成功；截图和原始 console 证据对应同一 fresh route。
- 若 XR-Frame 要求切换整个项目到另一 renderer、要求升级基础库、修改受保护配置或引入未预算的大型运行时，停止接入并交付 ASSET_PACKAGE_PASS / RENDERER_NOT_VERIFIED；不迁移全项目 renderer。
- 探针结束后删掉临时 route；若需要留作诊断页，必须计入最终 allowlist 和包体。

### T6 猫展示组件可选 3D 路径

**仅在 T5 PASS 后执行**

- 新增 miniprogram/components/cat-3d/**，并按最小差异改 cat-display 的 JS/WXML/WXSS、必要的组件 JSON 和 models/cat.js manifest。不得顺手重构其他页面。
- 保留 cat-display 当前 PNG→Emoji 代码路径；初始化未成功、GLB 超时/报错、页面隐藏、renderer 不支持或 reduced-motion 时可立即回退到当前 PNG/Emoji，并保留状态文案和 aria-label。
- 显示当前 form 的 GLB；仅按 cat.stateKey 播放对应五个 clip。未知动画回到 idle；切换形态时只释放旧模型再载入新模型，避免同时驻留四个模型。
- 先保持 3D feature flag 默认关闭。只有 T7 包体、T8 DevTools 和 T9 真机门禁全部通过后，才可在本地试点中启用；该变更不代表上传/发布。

### T7 包体、性能与离线回归门禁

**允许文件**

- miniprogram/assets/batiao-3d/*.glb（仅已审 GLB）
- T6 允许的猫组件文件
- scripts/audit-pet3d.js、scripts/smoke-pet3d-assets.js 与必要猫状态 smoke
- .codex/plans/execution-log.md 仅追加事实记录

**验收**

- 原 node scripts/audit-assets.js 仍通过，四张 PNG/hash/alpha/回退不变。
- node scripts/audit-pet3d.js 显示四形态/five clips/来源/sha/尺寸全通过；miniprogram 全部非空文件总和 ≤ 1,900,000 bytes，绝对不超过 2,097,152。
- JS 语法、miniapp validator、猫状态/交互/lifecycle smoke 全 PASS；配置 protected SHA 无变化；新增故障回退 smoke 证明 3D 初始化失败会恢复 PNG/Emoji。
- 现场测 3D 场景打开耗时、首帧、状态切换延迟和连续 5 分钟运行是否有明显掉帧/内存增长；无设备证据时这些指标标 NOT_VERIFIED，不得用估算填写 PASS。

**停止条件**

- 包体超过目标、状态错配、白屏、主线程卡顿、重复加载、错误日志或回退失败，立即关闭 flag/撤出运行时 GLB 集成；保留 artifacts/batiao-3d/ 资产包作 partial，不删现有 idle。
- 原 2D fallback 本身基线失败，停止，不把 fallback 测试失败归因于新 3D。

### T8 DevTools fresh route 与视觉 QA

**验收清单**

1. 从冷启动进入 chat；fresh screenshot 显示真实三维模型而不是 PNG，模型没有透明背景白块、被裁切或遮挡聊天输入。
2. 逐一切换四形态和五状态；四形态识别点/尺度一致，动画名称/状态文案同步，加载失败时回退文案和 PNG/Emoji 可读。
3. tap、longpress、feed、chat、chat→profile→chat、hide/show、reduced motion 路径；每次只触发预期动作，没有长按后重复点击、幽灵 timer、隐藏页继续渲染或 setData。
4. 开发工具 Console 记录新增错误为 0；截图和 AX 来自同一 fresh route，记录设备模拟器、工具版本、基础库和构建时间。
5. DevTools pass 只说明模拟器/工具现场证据，不替代真机证据。

**停止条件**

- 出现此前 WXSS 错误页、不可归因 renderer 错误、空模型、错误页面、AX 消失或布局裁切：标 NOT_VERIFIED，关闭 flag，保留旧 2D；不以旧截图替代。

### T9 真机门禁

- 至少一台实际 iOS 或 Android 手机上，用用户可用的小程序开发预览/真机调试执行首次 chat、四形态、idle/happy/eating/sleeping/sad、抚摸/喂食、隐藏/恢复与 fallback。
- 记录设备型号/系统、微信版本、基础库、工具版本、画面录屏或关键截图、状态序列、renderer console；高低端/另一操作系统只有实际覆盖后才标 PASS。
- 观察模型首帧、动画帧率/卡顿、点击区域与屏幕裁切；不能通过此设备时关闭 3D feature flag。
- 无可用真机、扫码或连接时本阶段为 NOT_VERIFIED，整体不能标 renderer/device PASS；保留独立资产包并完成 PARTIAL_ASSET_ONLY 或 PARTIAL_DEVTOOLS_ONLY 交付。

### T10 交付审查、回滚和结论

**交付必须包含**

- artifacts/batiao-3d/ 原创源工程、4 个 GLB、manifest、预览、校验输出、来源/许可记录。
- 精确变更文件清单与 SHA、每阶段退出码、包体总数/预算、DevTools/真机 route 截图/日志、未验证边界。
- 如集成通过，说明 feature flag、active-form loader 和 PNG/Emoji fallback；如未通过，明确当前 chat 仍用 PNG/Emoji，并给出独立资产包路径。
- 不上传、不发布、不绑定真实账号、不改 AppID 或用户数据。

**回滚点**

- renderer 或性能失败：关闭 3D flag，移除 cat-display 3D 分支与小程序内 GLB，保留原创 artifacts/batiao-3d/、四张旧 idle 与现有 fallback。
- 预算失败：撤出全部新增 miniprogram/assets/batiao-3d/*.glb，交付独立包及 PARTIAL_ASSET_ONLY；不通过拆包规则假设来绕过 chat 主包限制。
- 原创性/许可/质量失败：不集成有疑义文件；保留来源日志，暂停资产交付。
- 配置、AppID 或原四张图 SHA 漂移：停止，先查明并恢复保护基线。

## 5. Executor 文件白名单与保护

### 5.1 Planner 本轮已用白名单

- .codex/plans/current.md
- .codex/plans/history/current-v2.9-20261013-pre-true-3d-assets.md

本轮不改其他文件。

### 5.2 未来 Executor 分阶段白名单

| 阶段 | 允许路径 | 明确禁止/说明 |
|---|---|---|
| T0 | 无项目文件写入；临时日志放系统临时目录 | 不修复现有 WXSS/页面，不改 execution-log.md |
| T1–T3 | artifacts/batiao-3d/** | 只原创；不写 miniprogram/；不引入来源不清素材 |
| T4 | 上述资产包；scripts/audit-pet3d.js、scripts/smoke-pet3d-assets.js | 不安装到小程序运行时依赖；外部校验器限离线/临时环境 |
| T5 | 临时 miniprogram/pages/cat-3d-probe/**、miniprogram/app.json 的一个临时页面项 | 测完清理并核对 app.json 前后；绝不改 appid、project.config.json、project.private.config.json 或全局基础库 |
| T6–T9 | miniprogram/components/cat-3d/**；必要的 cat-display、models/cat.js、miniprogram/assets/batiao-3d/*.glb、app.json 最小页面/组件注册；猫状态 smoke/audit | 不改其他产品页、设置、TabBar、AppID、全局 renderer、包配置、schema、依赖或已有四张 idle |
| 各阶段证据 | .codex/plans/execution-log.md 仅追加事实；.codex/plans/current.md 仅修订计划门禁 | 不覆盖既有日志，不把估计写成现场事实 |

保护 SHA 应在未来 T0 现场重新测量并记录，不沿用 v2.9 数值代替当前基线。

## 6. 最小复核矩阵

| 验收项 | 通过证据 |
|---|---|
| 原创且可复现 | Blender 主工程可开、脚本可重建、PROVENANCE.md 完整、无外部 mesh/texture URI |
| 四形态一致 | 4 个 GLB 各自独立加载、四形态识别点明确、相机/尺度一致 |
| 同骨架五动画 | 四份 skeleton 层级和 bone 名一致；每份 5 个 clip；五类预览/Validator/Blender 重导入记录 |
| 模型可视质量 | 正侧背 render、128–256px 视读、无穿模/缺件/透明白底，offline renders 与 GLB 回看一致 |
| 预算 | manifest 实测，四 GLB ≤220KB，集成增量 ≤260,315 bytes，整包 ≤1,900,000 bytes，绝对 ≤2,097,152 |
| 微信 renderer | 当前项目 libVersion=3.4.3 fresh compile/route 加载 GLB 和播放动画，日志与截图同次采集 |
| 降级 | XRFrame/API/GLB/动画失败可回 PNG→Emoji，状态文字/aria 保持，Reduced motion 可用 |
| 真机 | 至少一台实机完整关键路径；无设备时明确 NOT_VERIFIED/PARTIAL |

## 7. 阶段结论规则与当前阻塞

- PASS：T0–T9 所有必须门禁通过，原创四形态 4×5 动画可审、实际集成整包 ≤1,900,000 bytes，DevTools fresh route 与至少一台真机通过。
- PARTIAL_ASSET_ONLY：原创模型包完成且通过结构/视觉/来源审查，但预算或当前 renderer/真机门禁不允许接入；现有页面仍回退 PNG/Emoji。
- PARTIAL_DEVTOOLS_ONLY：资产、包体与 DevTools 通过，但无真实设备证据；不宣称真机兼容。
- BLOCKED：无法取得 Blender/校验工具、当前基础页面无可用 fresh route，或出现来源许可/结构等阻塞导致无法形成可审阅资产。
- 当前可确认的阻塞/待办是 Blender 与 bpy/trimesh 未安装、XR-Frame 不在 app 配置、现有 renderer 未验证以及上一轮 DevTools WXSS 错误页；这些不阻止本 Planner 写计划，但都阻止提前宣称可集成。
- 首个 Executor 动作是 T0 基线；若 Blender 准备就绪，可在 T0 通过后开始 T1–T4 的独立原创资产制作。T5 失败不否定独立模型包，但必须停止小程序集成。
