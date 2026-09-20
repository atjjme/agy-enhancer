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

function Render-AgyIcon([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $s = [double]$size / 512.0

    # 1. Base Squircle - 烈焰日冕黑底底板
    $bgPath = Create-RoundedRectPath (16.0 * $s) (16.0 * $s) (480.0 * $s) (480.0 * $s) (120.0 * $s)
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0x14, 0x0c, 0x06))
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 0x3d, 0x23, 0x11), [Math]::Max(1.0, 12.0 * $s))
    $g.FillPath($bgBrush, $bgPath)
    $g.DrawPath($borderPen, $bgPath)
    $bgBrush.Dispose(); $borderPen.Dispose(); $bgPath.Dispose()

    # 2. Upper Chevron - 跃升折角渐变 (金黄 #fbbf24 -> 烈焰橙 #f97316)
    $p1 = New-Object System.Drawing.PointF([float](96.0 * $s), [float](200.0 * $s))
    $p2 = New-Object System.Drawing.PointF([float](256.0 * $s), [float](96.0 * $s))
    $p3 = New-Object System.Drawing.PointF([float](416.0 * $s), [float](200.0 * $s))

    $upperStroke = [float][Math]::Max(2.0, 52.0 * $s)
    $gradRect = New-Object System.Drawing.RectangleF([float](96.0 * $s), [float](96.0 * $s), [float](320.0 * $s), [float](110.0 * $s))
    $cStart = [System.Drawing.Color]::FromArgb(255, 0xfb, 0xbf, 0x24)
    $cEnd = [System.Drawing.Color]::FromArgb(255, 0xf9, 0x73, 0x16)
    $gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($gradRect, $cStart, $cEnd, 45.0)
    $upperPen = New-Object System.Drawing.Pen($gradBrush, $upperStroke)
    $upperPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $upperPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $upperPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $pathUpper = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pathUpper.AddLines([System.Drawing.PointF[]]@($p1, $p2, $p3))
    $g.DrawPath($upperPen, $pathUpper)
    $pathUpper.Dispose(); $upperPen.Dispose(); $gradBrush.Dispose()

    # 3. Lower Chevron - 底座锚定折角 (#543118)
    $p4 = New-Object System.Drawing.PointF([float](96.0 * $s), [float](332.0 * $s))
    $p5 = New-Object System.Drawing.PointF([float](256.0 * $s), [float](228.0 * $s))
    $p6 = New-Object System.Drawing.PointF([float](416.0 * $s), [float](332.0 * $s))

    $lowerStroke = [float][Math]::Max(2.0, 52.0 * $s)
    $lowerColor = [System.Drawing.Color]::FromArgb(255, 0x54, 0x31, 0x18)
    $lowerPen = New-Object System.Drawing.Pen($lowerColor, $lowerStroke)
    $lowerPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $lowerPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $lowerPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $pathLower = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pathLower.AddLines([System.Drawing.PointF[]]@($p4, $p5, $p6))
    $g.DrawPath($lowerPen, $pathLower)
    $pathLower.Dispose(); $lowerPen.Dispose()

    # 4. Horizon Dot - 核心地平线原点 (#fbbf24)
    $dotR = [float][Math]::Max(1.5, 20.0 * $s)
    $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0xfb, 0xbf, 0x24))
    $g.FillEllipse($dotBrush, [float](256.0 * $s - $dotR), [float](392.0 * $s - $dotR), [float]($dotR * 2.0), [float]($dotR * 2.0))
    $dotBrush.Dispose()

    $g.Dispose()
    return $bmp
}

$rootDir = Split-Path -Parent $PSScriptRoot
$assetsDir = Join-Path $rootDir "assets"
if (-not (Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir | Out-Null }

# 1. 导出高清 PNG (512x512)
$bmp512 = Render-AgyIcon 512
$pngPath = Join-Path $assetsDir "icon.png"
$bmp512.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp512.Dispose()
Write-Host "Generated PNG: $pngPath"

# 2. 导出多分辨率 Windows ICO 图标 (包含 16, 24, 32, 48, 64, 128, 256)
$sizes = @(16, 24, 32, 48, 64, 128, 256)
$icoPath = Join-Path $assetsDir "icon.ico"
$msList = [System.Collections.Generic.List[System.IO.MemoryStream]]::new()

foreach ($sz in $sizes) {
    $b = Render-AgyIcon $sz
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
Write-Host "Generated ICO: $icoPath successfully with 7 resolutions."
