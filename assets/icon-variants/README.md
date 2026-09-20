# AGY Enhancer 图标多配色变体 (Icon Variants)

基于项目中原版浮空折线几何图形（Levitating Chevrons）演化设计的 8 款主题配色，针对黑色背景（Dark）与白色背景（Light）进行了专门的对比度与视觉饱和度校准。

## 🎨 配色方案列表

| 序号 | 方案名称 | 设计意象 | 主渐变色 (Hex) | 深色版文件 | 浅色版文件 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | **极光青蓝 (Aurora Cyan)** | 原版科技升级，反重力、轻量化与前沿算力 | `#22d3ee` → `#06b6d4` | `icon-aurora-cyan-dark.svg` | `icon-aurora-cyan-light.svg` |
| **02** | **星云幻紫 (Cosmic Violet)** | 深空神秘、智慧计算与现代 AI Agent 灵感 | `#c084fc` → `#818cf8` | `icon-cosmic-violet-dark.svg` | `icon-cosmic-violet-light.svg` |
| **03** | **矩阵翡翠 (Matrix Emerald)** | 极客翠绿，系统守护、高能响应与生态健康 | `#34d399` → `#059669` | `icon-matrix-emerald-dark.svg` | `icon-matrix-emerald-light.svg` |
| **04** | **烈焰日冕 (Solar Amber)** | 耀阳炽橙，高性能爆发、极速加速与动力突破 | `#fbbf24` → `#f97316` | `icon-solar-amber-dark.svg` | `icon-solar-amber-light.svg` |
| **05** | **赛博粉潮 (Neon Synthwave)** | 赛博朋克先锋美学，潮流活力与强视觉焦点 | `#fb7185` → `#ec4899` | `icon-neon-synthwave-dark.svg` | `icon-neon-synthwave-light.svg` |
| **06** | **深海皇家蓝 (Royal Sapphire)** | 沉稳企业信赖，经典工程与专业高可靠度 | `#60a5fa` → `#2563eb` | `icon-royal-sapphire-dark.svg` | `icon-royal-sapphire-light.svg` |
| **07** | **钛金纯粹单色 (Titanium Mono)** | 极简工业冷峻质感，现代高雅金属对比 | `#f8fafc` → `#94a3b8` | `icon-titanium-monochrome-dark.svg` | `icon-titanium-monochrome-light.svg` |
| **08** | **曜黑鎏金 (Obsidian Gold)** | 曜石暗夜与鎏金耀斑，尊贵典藏旗舰质感 | `#fde047` → `#eab308` | `icon-obsidian-gold-dark.svg` | `icon-obsidian-gold-light.svg` |

---

## 🌓 黑白背景对比设计原则

1. **黑色背景 (Dark Mode / Pure Black)**：
   - 采用深空色系圆角卡片底板（如 `#090d16`、`#0d0b18`），搭配微妙的半透明边框（`#1e293b` 等）。
   - 下层底座折线（Anchor Chevron）采用沉稳低明度的暗灰蓝色调，衬托上层漂浮折线的发光高饱和度渐变。
   - 地平线核心圆点（Core Dot）提供视觉焦点锚定。

2. **白色背景 (Light Mode / Pure White)**：
   - 采用纯白底板（`#ffffff`）搭配浅冷灰柔和边框（`#e2e8f0` 等）。
   - 针对浅色背景易泛白脱色问题，调整了渐变色明度与对比度，并加深下层底座折线（`#475569` ~ `#64748b`），确保在亮色界面下图形骨架轮廓分明、不模糊。

---

## 🌟 专项定制款：烈焰日冕 (Solar Amber) 纯白底板 × 主题色粗边框

为增强纯白底板在浅色或深色环境中的轮廓独立感与视觉聚焦，专门设计了使用**日冕主题色粗线条**（14px ~ 20px）的纯白底板系列（原细边框版本完整保留）：

| 变体文件名 | 外框描边线宽 | 描边色彩类型 | 设计特色 |
| :--- | :--- | :--- | :--- |
| `icon-solar-amber-white-accent-border.svg` | **14px** | 主题色双色渐变 (`#fb923c` → `#ea580c`) | **推荐款**，外框与内浮折线色彩呼应，极具胶囊图标质感 |
| `icon-solar-amber-white-solid-border.svg` | **14px** | 高饱和纯色主题橙 (`#f97316`) | 纯色描边，边缘利落爽快 |
| `icon-solar-amber-white-heavy-border.svg` | **20px** | 主题色渐变加重描边 | 超粗线条，小尺寸与高分辨率下辨识力最强 |
| `icon-solar-amber-light.svg` | 4px | 浅橙柔和细框 (`#ffedd5`) | 原版保留款，极简通透风格 |

---

## 🚀 全场景兼顾款 (小托盘 16px + 网页Header黑白底 + 桌面图标)

针对“小托盘极小尺寸”、“网页左上角黑白背景无突兀贴纸感”、“桌面壁纸实体感”三大诉求研发的全新变体：

| 变体文件名 | 形态类别 | 关键特性 | 建议场景 |
| :--- | :--- | :--- | :--- |
| **`icon-universal-glyph.svg`** | **纯几何增强版** (No Squircle) | 线宽加粗至 44px，自带柔和暗部微投影 (feDropShadow)，在纯黑、纯白网页及小托盘下均极其清晰，无方形贴纸生硬感 | **小托盘 (16~24px)**<br>**网页左上角 Header (黑白底通用)** |
| **`icon-universal-dark-badge.svg`** | **深空微胶囊徽章** | 深空黑底座 (`#0d111a`) + 14px 日冕主题渐变框，小巧精致 | **全项目通用单一文件款 (暗调偏好)** |
| **`icon-solar-amber-white-accent-border.svg`** | **纯白粗边框胶囊** | 纯白底座 (`#ffffff`) + 14px 主题渐变框，极强实体感 | **桌面图标 (Desktop App Icon)** |
| **`icon-tray-monochrome.svg`** | **系统原生单色版** | 纯色 (currentColor)，随系统任务栏主题自动反色 | **Windows / macOS 原生规范托盘** |


