Add-Type -AssemblyName System.Drawing

function Create-RoundedRectPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    if ($d -gt $w) { $d = $w }
    if ($d -gt $h) { $d = $h }
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

# 方案 A: 纯几何加粗通用折线 (针对托盘 16px/24px/32px 与 Web Logo，高锐度无底板)
function Render-GlyphIcon([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $s = [double]$size / 512.0

    # 1. 跃升折角 (Upper Chevron)
    $p1 = New-Object System.Drawing.PointF ([float](140.0 * $s)), ([float](216.0 * $s))
    $p2 = New-Object System.Drawing.PointF ([float](256.0 * $s)), ([float](120.0 * $s))
    $p3 = New-Object System.Drawing.PointF ([float](372.0 * $s)), ([float](216.0 * $s))

    $minStroke = if ($size -le 24) { 2.8 } elseif ($size -le 32) { 3.5 } else { 2.0 }
    $upperStroke = [float][Math]::Max($minStroke, 48.0 * $s)

    $upperBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 249, 115, 22))
    $upperPen = New-Object System.Drawing.Pen -ArgumentList $upperBrush, $upperStroke
    $upperPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $upperPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $upperPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $pathUpper = New-Object System.Drawing.Drawing2D.GraphicsPath
    [void]$pathUpper.AddLines([System.Drawing.PointF[]]@($p1, $p2, $p3))
    $g.DrawPath($upperPen, $pathUpper)
    $pathUpper.Dispose()
    $upperPen.Dispose()
    $upperBrush.Dispose()

    # 2. 底座折角 (Lower Chevron: #334155 深岩灰，黑白双向高对比)
    $p4 = New-Object System.Drawing.PointF ([float](140.0 * $s)), ([float](336.0 * $s))
    $p5 = New-Object System.Drawing.PointF ([float](256.0 * $s)), ([float](240.0 * $s))
    $p6 = New-Object System.Drawing.PointF ([float](372.0 * $s)), ([float](336.0 * $s))

    $lowerStroke = [float][Math]::Max($minStroke, 48.0 * $s)
    $lowerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 51, 65, 85))
    $lowerPen = New-Object System.Drawing.Pen -ArgumentList $lowerBrush, $lowerStroke
    $lowerPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $lowerPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $lowerPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $pathLower = New-Object System.Drawing.Drawing2D.GraphicsPath
    [void]$pathLower.AddLines([System.Drawing.PointF[]]@($p4, $p5, $p6))
    $g.DrawPath($lowerPen, $pathLower)
    $pathLower.Dispose()
    $lowerPen.Dispose()
    $lowerBrush.Dispose()

    # 3. 核心地平线原点 (#ea580c)
    $minDot = if ($size -le 24) { 1.8 } else { 1.5 }
    $dotR = [float][Math]::Max($minDot, 15.0 * $s)
    $dotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 234, 88, 12))
    $g.FillEllipse($dotBrush, [float](256.0 * $s - $dotR), [float](392.0 * $s - $dotR), [float]($dotR * 2.0), [float]($dotR * 2.0))
    $dotBrush.Dispose()

    $g.Dispose()
    return $bmp
}

# 方案 A: 纯白底板 + 14px 粗橙边框实体胶囊徽章 (针对桌面 48px/64px/128px/256px/512px)
function Render-BadgeIcon([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $s = [double]$size / 512.0

    # 1. 纯白底板 + 橙金主题外框
    $bgPath = Create-RoundedRectPath (32.0 * $s) (32.0 * $s) (448.0 * $s) (448.0 * $s) (112.0 * $s)
    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    
    $borderColor = [System.Drawing.Color]::FromArgb(255, 249, 115, 22)
    $borderWidth = [float][Math]::Max(1.5, 14.0 * $s)
    $borderPen = New-Object System.Drawing.Pen -ArgumentList $borderColor, $borderWidth

    $g.FillPath($bgBrush, $bgPath)
    $g.DrawPath($borderPen, $bgPath)
    $bgBrush.Dispose()
    $borderPen.Dispose()
    $bgPath.Dispose()

    # 2. 内部跃升折角
    $p1 = New-Object System.Drawing.PointF ([float](160.0 * $s)), ([float](216.0 * $s))
    $p2 = New-Object System.Drawing.PointF ([float](256.0 * $s)), ([float](136.0 * $s))
    $p3 = New-Object System.Drawing.PointF ([float](352.0 * $s)), ([float](216.0 * $s))

    $upperStroke = [float][Math]::Max(2.0, 36.0 * $s)
    $upperBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 249, 115, 22))
    $upperPen = New-Object System.Drawing.Pen -ArgumentList $upperBrush, $upperStroke
    $upperPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $upperPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $upperPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $pathUpper = New-Object System.Drawing.Drawing2D.GraphicsPath
    [void]$pathUpper.AddLines([System.Drawing.PointF[]]@($p1, $p2, $p3))
    $g.DrawPath($upperPen, $pathUpper)
    $pathUpper.Dispose()
    $upperPen.Dispose()
    $upperBrush.Dispose()

    # 3. 内部底座折角 (#57534e)
    $p4 = New-Object System.Drawing.PointF ([float](160.0 * $s)), ([float](328.0 * $s))
    $p5 = New-Object System.Drawing.PointF ([float](256.0 * $s)), ([float](248.0 * $s))
    $p6 = New-Object System.Drawing.PointF ([float](352.0 * $s)), ([float](328.0 * $s))

    $lowerStroke = [float][Math]::Max(2.0, 36.0 * $s)
    $lowerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 87, 83, 78))
    $lowerPen = New-Object System.Drawing.Pen -ArgumentList $lowerBrush, $lowerStroke
    $lowerPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $lowerPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $lowerPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $pathLower = New-Object System.Drawing.Drawing2D.GraphicsPath
    [void]$pathLower.AddLines([System.Drawing.PointF[]]@($p4, $p5, $p6))
    $g.DrawPath($lowerPen, $pathLower)
    $pathLower.Dispose()
    $lowerPen.Dispose()
    $lowerBrush.Dispose()

    # 4. 内部原点 (#f97316)
    $dotR = [float][Math]::Max(1.5, 11.0 * $s)
    $dotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 249, 115, 22))
    $g.FillEllipse($dotBrush, [float](256.0 * $s - $dotR), [float](372.0 * $s - $dotR), [float]($dotR * 2.0), [float]($dotR * 2.0))
    $dotBrush.Dispose()

    $g.Dispose()
    return $bmp
}

$rootDir = Split-Path -Parent $PSScriptRoot
$assetsDir = Join-Path $rootDir "assets"
if (-not (Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir | Out-Null }

# 1. 导出高清 PNG (512x512) 实体胶囊徽章
$bmp512 = Render-BadgeIcon 512
$pngPath = Join-Path $assetsDir "icon.png"
$bmp512.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp512.Dispose()
Write-Host "Generated PNG: $pngPath"

# 2. 导出多分辨率 Windows ICO 图标 (16, 24, 32 为方案A纯几何折角; 48, 64, 128, 256 为方案A实体胶囊)
$sizes = @(16, 24, 32, 48, 64, 128, 256)
$icoPath = Join-Path $assetsDir "icon.ico"
$msList = [System.Collections.Generic.List[System.IO.MemoryStream]]::new()

foreach ($sz in $sizes) {
    if ($sz -le 32) {
        $b = Render-GlyphIcon $sz
    } else {
        $b = Render-BadgeIcon $sz
    }
    $ms = New-Object System.IO.MemoryStream
    $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $b.Dispose()
    $msList.Add($ms)
}

$fs = [System.IO.File]::Create($icoPath)
$bw = [System.IO.BinaryWriter]::new($fs)

# ICONDIR 头部
$bw.Write([uint16]0) # Reserved
$bw.Write([uint16]1) # Type: 1 = ICO
$bw.Write([uint16]$sizes.Count) # 图像数量

$offset = 6 + (16 * $sizes.Count)

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $sz = $sizes[$i]
    $len = $msList[$i].Length

    $bWidth = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $bHeight = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }

    $bw.Write($bWidth)
    $bw.Write($bHeight)
    $bw.Write([byte]0) # Color count
    $bw.Write([byte]0) # Reserved
    $bw.Write([uint16]1) # Color planes
    $bw.Write([uint16]32) # Bits per pixel
    $bw.Write([uint32]$len) # 资源数据长度
    $bw.Write([uint32]$offset) # 偏移量

    $offset += $len
}

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $bytes = $msList[$i].ToArray()
    $bw.Write($bytes)
    $msList[$i].Dispose()
}

$bw.Flush()
$bw.Close()
$fs.Close()
Write-Host "Generated Scheme A Adaptive ICO: $icoPath successfully with 7 resolutions."
