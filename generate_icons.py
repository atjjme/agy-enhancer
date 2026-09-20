import os

variants = [
    {
        "id": "aurora-cyan",
        "name": "极光青蓝 (Aurora Cyan)",
        "desc": "原版升级款，科技、轻盈与反重力感",
        "dark": {
            "grad": ["#22d3ee", "#06b6d4"],
            "bg": "#090d16",
            "border": "#1e293b",
            "lower": "#334155",
            "dot": "#64748b"
        },
        "light": {
            "grad": ["#0891b2", "#0284c7"],
            "bg": "#ffffff",
            "border": "#e2e8f0",
            "lower": "#64748b",
            "dot": "#94a3b8"
        }
    },
    {
        "id": "cosmic-violet",
        "name": "星云幻紫 (Cosmic Violet)",
        "desc": "深空神秘、智慧计算与 AI 灵感",
        "dark": {
            "grad": ["#c084fc", "#818cf8"],
            "bg": "#0d0b18",
            "border": "#2a1f47",
            "lower": "#40335e",
            "dot": "#c084fc"
        },
        "light": {
            "grad": ["#9333ea", "#6366f1"],
            "bg": "#ffffff",
            "border": "#ede9fe",
            "lower": "#6b7280",
            "dot": "#a855f7"
        }
    },
    {
        "id": "matrix-emerald",
        "name": "矩阵翡翠 (Matrix Emerald)",
        "desc": "高能生命力、稳定高效与生态健康",
        "dark": {
            "grad": ["#34d399", "#059669"],
            "bg": "#06130d",
            "border": "#133824",
            "lower": "#1d4d34",
            "dot": "#34d399"
        },
        "light": {
            "grad": ["#059669", "#047857"],
            "bg": "#ffffff",
            "border": "#dcfce7",
            "lower": "#475569",
            "dot": "#10b981"
        }
    },
    {
        "id": "solar-amber",
        "name": "烈焰日冕 (Solar Amber)",
        "desc": "极致性能、飞跃突破与动力加速",
        "dark": {
            "grad": ["#fbbf24", "#f97316"],
            "bg": "#140c06",
            "border": "#3d2311",
            "lower": "#543118",
            "dot": "#fbbf24"
        },
        "light": {
            "grad": ["#d97706", "#ea580c"],
            "bg": "#ffffff",
            "border": "#ffedd5",
            "lower": "#57534e",
            "dot": "#f97316"
        }
    },
    {
        "id": "titanium-monochrome",
        "name": "钛金极简 (Titanium Monochrome)",
        "desc": "工业冷峻、纯粹高阶金属对比",
        "dark": {
            "grad": ["#f8fafc", "#94a3b8"],
            "bg": "#0b0f17",
            "border": "#1e293b",
            "lower": "#334155",
            "dot": "#64748b"
        },
        "light": {
            "grad": ["#0f172a", "#334155"],
            "bg": "#ffffff",
            "border": "#e2e8f0",
            "lower": "#94a3b8",
            "dot": "#cbd5e1"
        }
    },
    {
        "id": "neon-synthwave",
        "name": "霓虹粉潮 (Neon Synthwave)",
        "desc": "赛博潮流、强烈视觉冲击与活力",
        "dark": {
            "grad": ["#fb7185", "#ec4899"],
            "bg": "#150811",
            "border": "#3d1433",
            "lower": "#571f49",
            "dot": "#f43f5e"
        },
        "light": {
            "grad": ["#e11d48", "#db2777"],
            "bg": "#ffffff",
            "border": "#fce7f3",
            "lower": "#4b5563",
            "dot": "#f43f5e"
        }
    },
    {
        "id": "royal-sapphire",
        "name": "深海皇家蓝 (Royal Sapphire)",
        "desc": "沉稳专业、经典工程与企业级信赖",
        "dark": {
            "grad": ["#60a5fa", "#2563eb"],
            "bg": "#080e1a",
            "border": "#1d2d4c",
            "lower": "#263f6a",
            "dot": "#60a5fa"
        },
        "light": {
            "grad": ["#2563eb", "#1d4ed8"],
            "bg": "#ffffff",
            "border": "#dbeafe",
            "lower": "#64748b",
            "dot": "#3b82f6"
        }
    },
    {
        "id": "obsidian-gold",
        "name": "黑金曜斑 (Obsidian Gold)",
        "desc": "尊贵奢华、典藏旗舰质感",
        "dark": {
            "grad": ["#fde047", "#eab308"],
            "bg": "#12110a",
            "border": "#383416",
            "lower": "#4a441e",
            "dot": "#eab308"
        },
        "light": {
            "grad": ["#ca8a04", "#a16207"],
            "bg": "#ffffff",
            "border": "#fef08a",
            "lower": "#52525b",
            "dot": "#eab308"
        }
    }
]

out_dir = r"C:\Users\Juste\.gemini\antigravity\worktrees\agy-enhancer\configure_startup_service\assets\icon-variants"
os.makedirs(out_dir, exist_ok=True)

def generate_svg(var_id, mode, colors):
    grad_id = f"grad_{var_id.replace('-', '_')}_{mode}"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="{grad_id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{colors['grad'][0]}" />
      <stop offset="100%" stop-color="{colors['grad'][1]}" />
    </linearGradient>
  </defs>

  <!-- Squircle Base -->
  <rect x="32" y="32" width="448" height="448" rx="112" fill="{colors['bg']}" />
  <rect x="32" y="32" width="448" height="448" rx="112" fill="none" stroke="{colors['border']}" stroke-width="4" />

  <!-- Geometric Levitating Chevrons -->
  <g stroke-linecap="round" stroke-linejoin="round">
    <!-- Floating Upper Chevron -->
    <path d="M160 216 L256 136 L352 216" 
          fill="none" 
          stroke="url(#{grad_id})" 
          stroke-width="36" />

    <!-- Anchor Lower Chevron -->
    <path d="M160 328 L256 248 L352 328" 
          fill="none" 
          stroke="{colors['lower']}" 
          stroke-width="36" />
          
    <!-- Core Horizon Dot -->
    <circle cx="256" cy="372" r="10" fill="{colors['dot']}" />
  </g>
</svg>
"""

for item in variants:
    # dark
    dark_svg = generate_svg(item["id"], "dark", item["dark"])
    dark_path = os.path.join(out_dir, f"icon-{item['id']}-dark.svg")
    with open(dark_path, "w", encoding="utf-8") as f:
        f.write(dark_svg)
    
    # light
    light_svg = generate_svg(item["id"], "light", item["light"])
    light_path = os.path.join(out_dir, f"icon-{item['id']}-light.svg")
    with open(light_path, "w", encoding="utf-8") as f:
        f.write(light_svg)

print(f"Generated {len(variants) * 2} SVG files in {out_dir}")
