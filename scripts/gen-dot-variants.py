import os

base_svg_template = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="univ_solar_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
    <filter id="subtle_halo" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <g stroke-linecap="round" stroke-linejoin="round" filter="url(#subtle_halo)">
    <!-- Floating Upper Chevron -->
    <path d="M72 204 L256 64 L440 204" 
          fill="none" 
          stroke="url(#univ_solar_grad)" 
          stroke-width="56" />

    <!-- Anchor Lower Chevron (Dark Slate Base) -->
    <path d="M72 356 L256 216 L440 356" 
          fill="none" 
          stroke="#334155" 
          stroke-width="56" />
          
    <!-- Core Horizon Dot (Radius: {r}) -->
    <circle cx="256" cy="428" r="{r}" fill="#ea580c" />
  </g>
</svg>
"""

variants = [
    ("dot-r22-original", 22, "方案 A (原版 r=22) - 直径 44px (占比 8.6%)"),
    ("dot-r28-stroke-match", 28, "方案 B (等粗款 r=28) - 直径 56px (与 56px 折线等粗)"),
    ("dot-r34-balanced", 34, "方案 C (均衡款 r=34) - 直径 68px (微超折线，适度增强)"),
    ("dot-r40-clear", 40, "方案 D (清晰款 r=40) - 直径 80px (小图极度清晰，推荐)"),
    ("dot-r46-bold", 46, "方案 E (强力款 r=46) - 直径 92px (视觉焦点极为强壮)")
]

out_dir = r"assets\dot-variants"
os.makedirs(out_dir, exist_ok=True)

for fname, r, desc in variants:
    content = base_svg_template.replace("{r}", str(r))
    fpath = os.path.join(out_dir, f"{fname}.svg")
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Generated: {fpath} ({desc})")

print("All SVG variants generated.")
