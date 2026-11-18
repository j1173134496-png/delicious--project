# 八条 3D 冻结规格（v1）

- 单位：Blender 米；Z 朝上，正脸朝 -Y，模型足底 Z=0；导出 glTF 时由 Blender 转成 glTF Y-up。
- 四形态共享站姿和视角：总高约 1.85 m，头身比例约 1:1.1，立体粉白圆脸、大眼、双耳、短四肢、可见分段尾巴。形态切换不更换相机 framing。
- 前/侧/背正交预览：相机距原点约 5 m，正交宽 2.5 m，背景透明；最终视觉 QA 以 256px 预览检查。
- 骨架树：`root > body > head > {ear.L, ear.R, jaw, eyelid.L, eyelid.R}`；`body > {front_leg.L, front_leg.R, hind_leg.L, hind_leg.R, tail.01 > tail.02 > tail.03}`。全形态 Rest Pose 和骨长相同。
- Clip：`idle` 48 帧呼吸/眨眼/摆尾，`happy` 36 帧跃起/抬爪，`eating` 48 帧前倾/下颌/前爪，`sleeping` 72 帧蜷卧/闭眼/慢呼吸，`sad` 60 帧垂头/耳/尾。24 FPS，首末帧同 pose，无跨 clip 累积根位移。
- 识别点：Lv.1 粉色侧蝴蝶结；Lv.2 星形发饰和胸前领结；Lv.3 蓝粉水手领和短裙；Lv.4 薄头纱冠饰与白粉礼服。整体设计为本项目新建的抽象立体猫；现有 PNG 不被采样或追踪。
- 每份 GLB 独立、无外部 URI、无位图；最多 6 个材质；三角面目标 4,000–6,000、上限 8,000；顶点最多 4 个骨骼影响。
- 白模先生成并检查轮廓和配件可读性，再执行精模、动作和导出。
