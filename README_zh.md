# ZANKYO（残響）

[English](./README.md)

一款发生在 ray-march 分形隧道里的音游 —— 用 Three.js、GLSL shader 和 Web Audio API 写成。丢一个 MP3 进来，自动生成谱面，然后在 8 个判定扇区组成的环上跟着节奏点击；note 沿着无限延展的 Menger 海绵向你飞来。

## 玩法

1. 点 **LOAD TRACK** 选一个本地音频文件。
2. 选 **难度**（循环按钮：EASY → BASIC → ADVANCED → EXPERT → MASTER），选择会存到 `localStorage`。
3. 可选：调 **SPEED**（`[` / `]` 或 ± 按钮）控制 note 飞行速度。
4. 音乐开始播，note 在检测到的 onset 上生成，朝判定环飞来。
5. note 进入判定环时按对应的键 —— 越靠近环中心判定越好。
6. 按 **⏸** 或 **空格** 暂停；再按一次开始 3-2-1 倒计时恢复。
7. 曲子结束会弹出 **结算页**，显示达成率、Rank、Max Combo、各档判定数。

### 按键

ASDF / JKL; 主键位行左右分手 —— 左手管环的左半圈，右手管环的右半圈：

| 按键  | 扇区     |
| ----- | -------- |
| **F** | 左上     |
| **D** | 左       |
| **S** | 左下     |
| **A** | 下       |
| **J** | 上       |
| **K** | 右上     |
| **L** | 右       |
| **;** | 右下     |

也支持触屏 —— 手机上直接点对应扇区。

## 判定 & 计分

5 档判定，按 note 到判定环中心的 z 距离评定：

| 判定               | 时间窗（单位）  | 权重         |
| ------------------ | --------------- | ------------ |
| CRITICAL PERFECT   | ±0.5            | 1.00（→101%）|
| PERFECT            | ±1.0            | 100 / 101    |
| GREAT              | ±2.0            | 80 / 101     |
| GOOD               | ±3.0            | 50 / 101     |
| MISS               | 飞过判定区      | 0            |

达成率 = `score / max_possible × 101`。Rank 从高到低：SSS+ / SSS / SS+ / SS / S+ / S / AAA / AA / A / B / C / D。

## 难度

5 套数值，参照 maimai 的标准难度梯度。难度越高 → note 越密集、双押越多、反应时间越短、同扇区允许的间距越小。

|              | 生成率 | 双押  | onset 冷却 | 同扇区间隔 | 飞行时间 |
| ------------ | ------ | ----- | ---------- | ---------- | -------- |
| **EASY**     | 0.12   | 0%    | 400 ms     | 12         | 9.0 s    |
| **BASIC**    | 0.18   | 8%    | 300 ms     | 9          | 8.5 s    |
| **ADVANCED** | 0.25   | 18%   | 220 ms     | 6          | 8.0 s    |
| **EXPERT**   | 0.45   | 35%   | 135 ms     | 3          | 5.5 s    |
| **MASTER**   | 0.65   | 50%   | 100 ms     | 2          | 4.0 s    |

**判定窗口不随难度变化** —— 难度只改谱面的密度和速度，不放宽/收紧打击精度。

## 架构

```
[MP3]      ─► BeatDetector       （实时 FFT，给画面用）
           ─► BeatmapGenerator   （离线一遍跑完，整张谱前置生成）
                       │
                       ▼
                NoteSpawner（防堆叠 + 同扇区间隔）
                       │
                       ▼
                 ┌─────┴─────┐
                 ▼           ▼
            HitJudge     FractalBackground（GLSL shader）
                 │           │
                 ▼           ▼
              HUD/UI    SceneSetup（Three.js + EffectComposer/Bloom）
```

- **离线谱面生成**（`BeatmapGenerator.ts`）—— 加载音频时，整个 audio buffer 用和 `BeatDetector` 同一套多频段 onset 检测一次扫完，生成完整 timeline。结果确定性 + 暂停安全（note 时间戳是绝对值，恢复时整体偏移暂停时长即可，不需要重算）。
- **防堆叠生成** —— `NoteSpawner.canSpawn` 在同扇区已有 note 距离小于 `MIN_SAME_SECTOR_Z_GAP` 时跳过本次 spawn。双押要么两个都成立、要么都不出，避免半个对。
- **事件总线**（`core/bus.ts`）—— 类型化的 pub/sub，渲染层、音频层、DOM 层只通过事件通信（`game:hit`、`game:miss`、`ui:pause`、`ui:resume`、`ui:toggle-bg` 等）。
- **engine 与 rendering 解耦** —— `engine/` 持有游戏状态，与渲染器无关；`rendering/` 持有 Three.js + shader；UI 完全是 DOM。

## 渲染

整个游戏画面由一个全屏 GLSL 片元着色器完成，用 **符号距离场（SDF）** 配 **球追踪（sphere tracing / ray marching）**。

### 场景组成

三种 SDF 在每条射线上求并集，按优先级判定材质：

1. **分形隧道** —— 无限 Menger 海绵，5 次十字形空腔迭代雕刻而成。每个活跃 note 和判定环周围的空间会从分形里**挖空**，保证游戏元素永远不被墙体遮挡。
2. **Note 球** —— 在每个活跃 note 的世界坐标上放球。命中时分裂成 6 个粒子球径向爆开，随时间衰减。
3. **判定环** —— 距相机固定 z 偏移处的圆环（torus），环上放 8 个扇区点。`u_transient` uniform 跟着最近 onset 能量脉动，环会随节奏发光。

### 光照

- 分形墙面：中心差分法求法线 → 漫反射 + 高光。
- Note 球：解析法线（`normalize(p - center)`），免去额外 `sceneSDF` 调用。
- 活跃 note 对附近的分形墙面投射彩色点光（带距离衰减的循环求和）。
- 判定环：脉动发光，不算法线。
- 全局：根据 march 步数算环境光遮蔽（AO）+ 距离雾。

### Cone marching（性能优化）

两 pass 的 **cone marching** 让主 ray march 从一个安全距离开始而不是从相机原点：

1. **Prepass** —— 低分辨率缓冲区（屏幕 ÷ 10×10 tile），每个 tile 走一条代表性射线。从相机经 tile 边界形成的圆锥决定一个不断增大的"安全半径"，当 SDF 距离小于该半径时停止前进（继续走可能会跳过其他像素的细节）。结果以保守的回退距离写入 `HalfFloat` 纹理。
2. **Main pass** —— 每个像素采样 prepass 纹理，直接从那个距离开始 march，跳过最前面几十次迭代。粗段迭代成本变成约 1/100（每个 tile 一次，而不是每像素）。

### 暂停优化

暂停菜单 / 标题页 / 结算页期间，主循环在 `sceneSetup.render()` 之前直接 `return`。Canvas 冻结在最后一帧，shader 不再吃 GPU —— 风扇 1 秒内安静。恢复时重新进入正常 RAF 节奏，所有 note 的时间戳整体偏移暂停的真实时长，避免一恢复就全部判定 miss。

### 后处理

Three.js 的 `EffectComposer` → `UnrealBloomPass`，渲染目标用 `HalfFloatType`（HDR），最终走 ACES filmic tone mapping。

## 技术栈

- **Three.js** —— WebGL renderer、EffectComposer、bloom
- **GLSL** —— 全屏 SDF ray marching + cone-march prepass
- **Web Audio API** —— `AnalyserNode`（fftSize 256）给实时画面用，对解码后的 buffer 离线扫一遍生成谱面
- **TypeScript** —— strict，ES modules
- **Vite** —— dev server + bundler

## 开发

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 产出到 dist/
npm run preview    # 预览构建产物
```

`flake.nix` 提供项目工具链的 dev shell，`nix develop` 进入，或者用 direnv 自动加载。

`dist/` 是纯静态产物，部署到 Vercel / Netlify / GitHub Pages 或任何静态站托管都行。

## 项目结构

```
src/
├── main.ts                       游戏主循环 + 事件总线连线
├── core/bus.ts                   类型化的 pub/sub
├── audio/
│   ├── BeatDetector.ts           实时 FFT（画面用）
│   ├── BeatmapGenerator.ts       离线谱面生成
│   ├── HitSounds.ts              基于判定的音频反馈
│   └── bands.ts                  频段定义
├── engine/
│   ├── config.ts                 所有可调常量
│   ├── difficulty.ts             5 档难度 profile + localStorage
│   ├── flowSpeed.ts              用户可调的速度倍率
│   ├── Note.ts                   单个 note 状态 + 运动曲线
│   ├── NoteSpawner.ts            活跃 note 集合 + 防堆叠
│   └── HitJudge.ts               扇区/时机判定 + 计分
├── rendering/
│   ├── SceneSetup.ts             Three.js 场景、相机、composer、bloom
│   └── FractalBackground.ts      GLSL shader 与材质
└── ui/
    ├── Controls.ts               LOAD / PAUSE / 难度 / 速度按钮
    ├── HUD.ts                    歌曲名、combo、达成率
    ├── PauseMenu.ts              暂停遮罩 + 恢复倒计时
    ├── ResultScreen.ts           结算页
    ├── JudgementPopup.ts         CRITICAL/PERFECT/GREAT/GOOD/MISS 弹字
    ├── RingPulse.ts              命中时判定环的径向波纹
    └── SectorHints.ts            桌面端每个扇区旁的键位标签
```
