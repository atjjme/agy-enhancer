import os

out_dir = r"C:\Users\Juste\.gemini\antigravity\worktrees\agy-enhancer\configure_startup_service\assets\icon-variants"
os.makedirs(out_dir, exist_ok=True)

# 1. icon-universal-glyph.svg: 纯几何高对比通用增强版 (适合托盘16px~32px、网页Header无论黑白底)
# 特点：去除方形大底板，主体线条加粗到 44px，自带极柔和暗部衬底微滤镜，在纯黑、纯白、彩色背景下均清晰醒目
glyph_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="univ_solar_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
    <filter id="subtle_halo" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Pure Glyph with Enhanced Stroke for Tray & Web Nav -->
  <g stroke-linecap="round" stroke-linejoin="round" filter="url(#subtle_halo)">
    <!-- Floating Upper Chevron (Escaping Gravity) -->
    <path d="M140 216 L256 120 L372 216" 
          fill="none" 
          stroke="url(#univ_solar_grad)" 
          stroke-width="44" />

    <!-- Anchor Lower Chevron (Dark Slate Base - high contrast on both white & black) -->
    <path d="M140 336 L256 240 L372 336" 
          fill="none" 
          stroke="#334155" 
          stroke-width="44" />
          
    <!-- Core Horizon Dot -->
    <circle cx="256" cy="392" r="14" fill="#ea580c" />
  </g>
</svg>
"""

# 2. icon-universal-dark-badge.svg: 全场景深空胶囊徽章版 (桌面/托盘/网页通吃)
# 特点：紧凑 Squircle 底板，外框带有 12px 亮橙渐变边框，底座深空色，黑底白底壁纸均呈独立立体徽章
badge_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="univ_badge_border" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fb923c" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
    <linearGradient id="univ_badge_chev" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f97316" />
    </linearGradient>
  </defs>

  <!-- Dark Capsule Base -->
  <rect x="36" y="36" width="440" height="440" rx="116" fill="#0d111a" />
  <rect x="36" y="36" width="440" height="440" rx="116" fill="none" stroke="url(#univ_badge_border)" stroke-width="14" />

  <!-- Chevrons -->
  <g stroke-linecap="round" stroke-linejoin="round">
    <path d="M160 216 L256 136 L352 216" fill="none" stroke="url(#univ_badge_chev)" stroke-width="38" />
    <path d="M160 328 L256 248 L352 328" fill="none" stroke="#475569" stroke-width="38" />
    <circle cx="256" cy="372" r="11" fill="#f97316" />
  </g>
</svg>
"""

# 3. icon-tray-monochrome.svg: 极简纯单色托盘专用版 (100% 遵循操作系统原生托盘规范)
# 当用户需要 Windows 任务栏 / macOS 菜单栏那种极致统一的白/灰单色托盘图标
tray_mono_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <g stroke-linecap="round" stroke-linejoin="round">
    <!-- Upper Chevron -->
    <path d="M140 216 L256 120 L372 216" fill="none" stroke="currentColor" stroke-width="48" />
    <!-- Lower Chevron -->
    <path d="M140 336 L256 240 L372 336" fill="none" stroke="currentColor" stroke-width="48" opacity="0.65" />
    <!-- Dot -->
    <circle cx="256" cy="392" r="16" fill="currentColor" />
  </g>
</svg>
"""

with open(os.path.join(out_dir, "icon-universal-glyph.svg"), "w", encoding="utf-8") as f:
    f.write(glyph_svg)

with open(os.path.join(out_dir, "icon-universal-dark-badge.svg"), "w", encoding="utf-8") as f:
    f.write(badge_svg)

with open(os.path.join(out_dir, "icon-tray-monochrome.svg"), "w", encoding="utf-8") as f:
    f.write(tray_mono_svg)

print("Created universal candidate icons successfully!")
