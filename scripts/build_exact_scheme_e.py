import os
import subprocess
import struct
import io
from PIL import Image

def generate_icons_with_chrome():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    assets_dir = os.path.join(root, "assets")
    scripts_dir = os.path.join(root, "scripts")
    
    # 1. 确保 assets/icon.svg 包含完美的 Scheme E 矢量定义与防溢出渐变
    svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="univ_solar_grad" gradientUnits="userSpaceOnUse" x1="60" y1="50" x2="470" y2="235" spreadMethod="pad">
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

    <!-- Anchor Lower Chevron (Dark Slate Base: #334155) -->
    <path d="M72 356 L256 216 L440 356" 
          fill="none" 
          stroke="#334155" 
          stroke-width="56" />
          
    <!-- Core Horizon Dot (Scheme E: r=46) -->
    <circle cx="256" cy="428" r="46" fill="#ea580c" />
  </g>
</svg>
"""
    svg_path = os.path.join(assets_dir, "icon.svg")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print("Saved assets/icon.svg (Scheme E with exact bounded gradient)")

    # 2. 制作用于无损渲染的本地 HTML 页面
    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  html, body {{ width: 100%; height: 100%; background: transparent; overflow: hidden; }}
  svg {{ width: 100%; height: 100%; display: block; }}
</style>
</head>
<body>
{svg_content}
</body>
</html>
"""
    render_html = os.path.join(scripts_dir, "render_chrome.html")
    with open(render_html, "w", encoding="utf-8") as f:
        f.write(html_content)

    # 3. 调用 Chrome 无头模式生成 512x512 高保真透明 PNG
    chrome_exe = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    png512_path = os.path.join(assets_dir, "icon.png")
    
    cmd = [
        chrome_exe,
        "--headless=new",
        "--disable-gpu",
        "--default-background-color=00000000",
        f"--screenshot={png512_path}",
        "--window-size=512,512",
        f"file:///{render_html.replace(os.sep, '/')}"
    ]
    subprocess.run(cmd, cwd=root, check=True)
    print(f"Generated pixel-perfect PNG via Chrome: {png512_path}")

    # 4. 基于 Chrome 渲染出的完美母版，使用 Lanczos 高保真下采样生成多尺寸 ICO
    im512 = Image.open(png512_path).convert("RGBA")
    
    sizes = [16, 20, 24, 32, 48, 64, 128, 256]
    ico_images = []
    for s in sizes:
        im_s = im512.resize((s, s), Image.Resampling.LANCZOS)
        ico_images.append(im_s)

    ico_path = os.path.join(assets_dir, "icon.ico")
    ico_images[-1].save(ico_path, format="ICO", sizes=[(s, s) for s in sizes])
    print(f"Generated multi-res ICO via Chrome master: {ico_path} with sizes: {sizes}")

if __name__ == "__main__":
    generate_icons_with_chrome()
