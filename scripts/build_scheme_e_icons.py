import os
import math
from PIL import Image, ImageDraw

def render_chevron_icon(size, is_small_opt=False):
    """
    高质量渲染 Scheme E 图标为指定尺寸的 RGBA PIL Image
    方案 E 规范:
      viewBox: 512x512
      Upper Chevron: M72 204 L256 64 L440 204, stroke 56, 渐变 #f59e0b -> #ea580c
      Lower Chevron: M72 356 L256 216 L440 356, stroke 56, 颜色 #334155
      Core Dot: cx=256, cy=428, r=46 (直径 92px), 颜色 #ea580c
    """
    # 使用 4x 超采样以获得极其平滑的高精度抗锯齿
    ss = 4
    canvas_size = size * ss
    scale = canvas_size / 512.0
    
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 针对 16px/24px 极小尺寸进行微观光学对齐增强 (确保小图标根根清晰，绝不发虚)
    if is_small_opt:
        stroke_w = max(2.2 * ss, 58.0 * scale)
        dot_r = max(2.8 * ss, 50.0 * scale)
    else:
        stroke_w = 56.0 * scale
        dot_r = 46.0 * scale

    # 1. 下折角 (Lower Chevron - #334155 深岩灰)
    p4 = (72.0 * scale, 356.0 * scale)
    p5 = (256.0 * scale, 216.0 * scale)
    p6 = (440.0 * scale, 356.0 * scale)
    draw.line([p4, p5, p6], fill=(51, 65, 85, 255), width=int(round(stroke_w)), joint="round")
    # 补圆头端点
    half_w = stroke_w / 2.0
    draw.ellipse([p4[0]-half_w, p4[1]-half_w, p4[0]+half_w, p4[1]+half_w], fill=(51, 65, 85, 255))
    draw.ellipse([p6[0]-half_w, p6[1]-half_w, p6[0]+half_w, p6[1]+half_w], fill=(51, 65, 85, 255))

    # 2. 上折角 (Upper Chevron - #f59e0b 渐变到 #ea580c)
    # 在超采样图层上绘制渐变折角
    p1 = (72.0 * scale, 204.0 * scale)
    p2 = (256.0 * scale, 64.0 * scale)
    p3 = (440.0 * scale, 204.0 * scale)
    
    # 创建折角蒙版
    mask_upper = Image.new("L", (canvas_size, canvas_size), 0)
    draw_m = ImageDraw.Draw(mask_upper)
    draw_m.line([p1, p2, p3], fill=255, width=int(round(stroke_w)), joint="round")
    draw_m.ellipse([p1[0]-half_w, p1[1]-half_w, p1[0]+half_w, p1[1]+half_w], fill=255)
    draw_m.ellipse([p3[0]-half_w, p3[1]-half_w, p3[0]+half_w, p3[1]+half_w], fill=255)
    
    # 制作平滑垂直渐变图层: y: 36 -> 232 (对称自然，消除右下角折切变色)
    grad_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    y_start = int(round(36.0 * scale))
    y_end = int(round(232.0 * scale))
    h_span = max(1, y_end - y_start)
    
    # #f59e0b -> #ea580c
    c1 = (245, 158, 11)
    c2 = (234, 88, 12)
    
    grad_pixels = grad_img.load()
    for y in range(canvas_size):
        if y <= y_start:
            r, g, b = c1
        elif y >= y_end:
            r, g, b = c2
        else:
            t = (y - y_start) / float(h_span)
            r = int(round(c1[0] + (c2[0] - c1[0]) * t))
            g = int(round(c1[1] + (c2[1] - c1[1]) * t))
            b = int(round(c1[2] + (c2[2] - c1[2]) * t))
        for x in range(canvas_size):
            grad_pixels[x, y] = (r, g, b, 255)
            
    # 将渐变按蒙版复合到主图
    img.paste(grad_img, (0, 0), mask_upper)

    # 3. 方案 E 核心圆点 (cx=256, cy=428, r=46)
    dot_cx = 256.0 * scale
    dot_cy = 428.0 * scale
    draw.ellipse([dot_cx - dot_r, dot_cy - dot_r, dot_cx + dot_r, dot_cy + dot_r], fill=(234, 88, 12, 255))

    # 超采样平滑降采样为最终尺寸
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    assets_dir = os.path.join(root, "assets")
    os.makedirs(assets_dir, exist_ok=True)

    # 1. 导出 512x512 高清 PNG
    png512 = render_chevron_icon(512, is_small_opt=False)
    png_path = os.path.join(assets_dir, "icon.png")
    png512.save(png_path, "PNG")
    print(f"Saved PNG: {png_path} (512x512)")

    # 2. 导出全分辨率 Windows ICO (包含 16, 20, 24, 32, 48, 64, 128, 256)
    sizes = [16, 20, 24, 32, 48, 64, 128, 256]
    images = []
    for s in sizes:
        is_small = (s <= 24)
        im = render_chevron_icon(s, is_small_opt=is_small)
        images.append(im)
    
    ico_path = os.path.join(assets_dir, "icon.ico")
    # Pillow save ICO with all sizes
    images[-1].save(ico_path, format="ICO", sizes=[(s, s) for s in sizes])
    print(f"Saved ICO: {ico_path} with sizes: {sizes}")

if __name__ == "__main__":
    main()
