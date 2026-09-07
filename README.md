# Antigravity Dialogue & Navigation Enhancer (`agy-enhancer`)

[English](#english) | [简体中文](#简体中文) | [繁體中文](#繁體中文)

---

<a id="english"></a>
## English

A paper-style dialogue navigation and browsing enhancement suite tailored for the **Antigravity 2.0 Desktop Client**.

### 🚀 Getting Started

#### Direct Download: Download ZIP & Extract anywhere

#### 1. One-Click Setup & Autostart (Recommended)
Double-click in the root directory:
👉 **`install.bat`** (or **`setup-autostart.bat`**)
- **`install.bat`** is the familiar installer name for general users;
- **`setup-autostart.bat`** reflects the core mechanism;
- Both execute identical logic: automatically configures Windows startup and launches the daemon in background (runs silently without popup windows; a green status indicator will appear at the top-right corner of the Antigravity client).

#### 2. Manual Controls
- **`start-service-silent.vbs`**: Starts the daemon silently in the background (no console window).
- **`stop-service.bat`**: Stops and terminates the background daemon.
- **`start-enhancer.bat`**: Starts in debug console mode (shows terminal window for real-time logs).

#### 3. Uninstallation
Double-click:
👉 **`uninstall.bat`**
- Automatically removes the startup shortcut and terminates the daemon.

---

<a id="en-features"></a>
### ✨ Core Features & Overview

1. [📖 "Paper-style" Dialogue Navigation (One Q&A = One Page)](#en-feature-1)
2. [📦 Project Workspace Archive](#en-feature-2)
3. [🎨 Button Customization & Instant Hot Reload](#en-feature-3)

---

#### <a id="en-feature-1"></a> 1. 📖 "Paper-style" Dialogue Navigation
Treats every Q&A turn (your prompt + AI response) as an independent "page":
- **Click Up (↑)**: Smoothly jumps back to the **Header** (start of the prompt). If already near the header, turns to the previous Q&A page header. At the first page, goes straight to the conversation top.
- **Click Down (↓)**: Smoothly scrolls down to the **Footer** (end of the response). If already near the footer, turns to the next Q&A page header. At the last page, goes straight to the latest bottom.
- **Double Click Down (↓)**: Instantly and smoothly navigates straight to the very bottom of the conversation.

> 📷 **Screenshot / GIF Demo**:
> ![Navigation Demo Placeholder](./assets/demo_navigation_placeholder.png)
> *(Placeholder: Insert dialogue navigation demo GIF / video here)*

[↑ Back to Features](#en-features)

---

#### <a id="en-feature-2"></a> 2. 📦 Project Workspace Archive
- **One-Click Archive**: Hover over any project in the left sidebar and click the **📥** archive icon to collapse and hide it from the main list.
- **View & Restore**: Click the **`Archive`** button next to the `Projects` header to expand the archive panel and click **`Restore`** or the project title to bring it back.
- **Auto Unarchive on Activation**: Interacting with or opening an archived project automatically unarchives and restores it to the main list.
- **Theme Adaptive**: Seamlessly styled with native Antigravity Tailwind & CSS variables in dark and light modes.

> 📷 **Screenshot / GIF Demo**:
> ![Project Archive Demo Placeholder](./assets/demo_archive_placeholder.png)
> *(Placeholder: Insert project archive demo GIF / video here)*

[↑ Back to Features](#en-features)

---

#### <a id="en-feature-3"></a> 3. 🎨 Button Customization & Instant Hot Reload
Open [`src/agy-enhancer.js`](./src/agy-enhancer.js) with any text editor to adjust `USER_CONFIG`:
- `BUTTON_OPACITY`: Default idle opacity (default `0.3` / 30% to avoid blocking text).
- `BUTTON_HOVER_OPACITY`: Opacity on hover (default `1.0`).
- `NAV_RIGHT`: Distance from right edge (default `20px`).
- `NAV_BOTTOM`: Distance from bottom edge (default `170px`).
- `BUTTON_SIZE`: Button diameter (default `38px`).

> **Hot Reload**: Press `Ctrl + S` to save, and changes take effect within 0.1s in the live client without reloading the application!

> 📷 **Screenshot / GIF Demo**:
> ![Customization Demo Placeholder](./assets/demo_config_placeholder.png)
> *(Placeholder: Insert customization demo GIF / video here)*

[↑ Back to Features](#en-features)

---

<a id="简体中文"></a>
## 简体中文

专为 **Antigravity 2.0 桌面客户端** 定制的“纸张式”对话导航与浏览体验套件。

### 🚀 使用指南

#### 直接下载zip压缩包，解压存放任意文件夹

#### 1. 一键安装与开机自启（推荐）
双击运行根目录下的：
👉 **`install.bat`**（或 **`setup-autostart.bat`**）
- **`install.bat`** 是普通用户熟悉的安装名称；
- **`setup-autostart.bat`** 是核心功能的表现名称；
- 两者功能完全一样，即自动添加开机自启并启动脚本（静默运行，无反应提示。Antigravity 界面右上角会有绿点显示）；

#### 2. 手动启动与停止
- **`start-service-silent.vbs`**：后台静默启动守护服务（无黑框）。
- **`stop-service.bat`**：停止并退出后台守护服务。
- **`start-enhancer.bat`**：控制台调试模式（显示终端窗口，便于查看实时日志）。

#### 3. 卸载
双击运行：
👉 **`uninstall.bat`**
- 自动清理开机自启项并停止后台服务。

---

<a id="zh-features"></a>
### ✨ 核心功能与操作

1. [📖 “一问一答，皆为一纸”纸张式导航](#zh-feature-1)
2. [📦 项目列表折叠归档 (Project Archive)](#zh-feature-2)
3. [🎨 按钮位置大小微调与热更新](#zh-feature-3)

---

#### <a id="zh-feature-1"></a> 1. 📖 “一问一答，皆为一纸”纸张式导航
把每一次问答（提问 + AI回答）视为一张独立规整的纸张：
- **点击【向上 (↑)】**：若在纸张中间或页脚，平滑回到本轮对话【页头】（提问起始处）；若已在页头附近，翻到【上一张纸】（上一轮问答）页头；处于首轮时直达顶部。
- **点击【向下 (↓)】**：若在纸张上半部分或页头，平滑直达本轮对话【页脚】（回答末尾处）；若已在页脚附近，翻到【下一张纸】（下一轮问答）页头；处于末轮时直达最新底部。
- **双击【向下 (↓)】**：直接平滑滚至整个对话页面的最底部。

> 📷 **功能演示视频 / 图片占位**：
> ![纸张式导航演示占位图](./assets/demo_navigation_placeholder.png)
> *(占位符：可在此插入功能演示动图 GIF 或视频链接)*

[↑ 返回功能列表](#zh-features)

---

#### <a id="zh-feature-2"></a> 2. 📦 项目列表折叠归档 (Project Archive)
- **一键快速归档**：鼠标悬停在左侧任意项目上，点击右侧 **📥** 图标即可将该项目归档折叠，立刻从主项目列表中隐藏，腾出垂直空间。
- **查看与还原**：在 `Projects` 标题栏右侧点击 **`Archive`** 按钮（有归档项目时附带数字徽标），展开折叠面板，点击 **`Restore`** 或直接点击项目名，即可随时恢复回主列表。
- **激活自动出归档**：在归档项目中激活新对话或通过链接进入时，自动解除归档并恢复显示在主列表。
- **完美契合主题**：采用 Antigravity 原生 Tailwind 与 CSS 变量，深色/浅色模式自适应。

> 📷 **功能演示视频 / 图片占位**：
> ![项目归档演示占位图](./assets/demo_archive_placeholder.png)
> *(占位符：可在此插入功能演示动图 GIF 或视频链接)*

[↑ 返回功能列表](#zh-features)

---

#### <a id="zh-feature-3"></a> 3. 🎨 按钮位置大小微调与热更新
使用文本编辑器打开 [`src/agy-enhancer.js`](./src/agy-enhancer.js)，在顶部的 `USER_CONFIG` 中可按需修改：
- `BUTTON_OPACITY`：平时默认透明度（默认 `0.3`，即 30% 半透明，避免遮挡内容）；
- `BUTTON_HOVER_OPACITY`：鼠标悬停时的透明度（默认 `1.0` 完全清晰）；
- `NAV_RIGHT`：距离右侧边缘间距（默认 `20px`）；
- `NAV_BOTTOM`：距离底部高度（默认 `170px`）；
- `BUTTON_SIZE`：按钮直径大小（默认 `38px`）。

> **热更新**：保存文件后（`Ctrl + S`），客户端将在 0.1 秒内自动生效，无需重启客户端！

> 📷 **功能演示视频 / 图片占位**：
> ![参数自定义演示占位图](./assets/demo_config_placeholder.png)
> *(占位符：可在此插入功能演示动图 GIF 或视频链接)*

[↑ 返回功能列表](#zh-features)

---

<a id="繁體中文"></a>
## 繁體中文

專為 **Antigravity 2.0 桌面用戶端** 定制的「紙張式」對話導航與瀏覽體驗套件。

### 🚀 使用指南

#### 直接下載 zip 壓縮包，解壓存放任意資料夾

#### 1. 一鍵安裝與開機自啟（推薦）
按兩下執行根目錄下的：
👉 **`install.bat`**（或 **`setup-autostart.bat`**）
- **`install.bat`** 是普通用戶熟悉的安裝名稱；
- **`setup-autostart.bat`** 是核心功能的表現名稱；
- 兩者功能完全一樣，即自動新增開機自啟並啟動指令碼（靜默執行，無反應提示。Antigravity 介面右上角會有綠點顯示）；

#### 2. 手動啟動與停止
- **`start-service-silent.vbs`**：後台靜默啟動守護服務（無黑框）。
- **`stop-service.bat`**：停止並結束後台守護服務。
- **`start-enhancer.bat`**：主控台除錯模式（顯示終端視窗，便於查看即時日誌）。

#### 3. 解除安裝
按兩下執行：
👉 **`uninstall.bat`**
- 自動清理開機自啟項目並停止後台服務。

---

<a id="tc-features"></a>
### ✨ 核心功能與操作

1. [📖 「一問一答，皆為一紙」紙張式導航](#tc-feature-1)
2. [📦 專案列表折疊封存 (Project Archive)](#tc-feature-2)
3. [🎨 按鈕位置大小微調與熱更新](#tc-feature-3)

---

#### <a id="tc-feature-1"></a> 1. 📖 「一問一答，皆為一紙」紙張式導航
把每一次問答（提問 + AI回答）視為一張獨立規整的紙張：
- **點擊【向上 (↑)】**：若在紙張中間或頁尾，平滑回到本輪對話【頁首】（提問起始處）；若已在頁首附近，翻到【上一張紙】（上一輪問答）頁首；處於首輪時直達頂部。
- **點擊【向下 (↓)】**：若在紙張上半部分或頁首，平滑直達本輪對話【頁尾】（回答末尾處）；若已在頁尾附近，翻到【下一張紙】（下一輪問答）頁首；處於末輪時直達最新底部。
- **按兩下【向下 (↓)】**：直接平滑捲動至整個對話頁面的最底部。

> 📷 **功能示範影片 / 圖片佔位**：
> ![紙張式導航示範佔位圖](./assets/demo_navigation_placeholder.png)
> *(佔位符：可在此插入功能示範動圖 GIF 或影片連結)*

[↑ 返回功能列表](#tc-features)

---

#### <a id="tc-feature-2"></a> 2. 📦 專案列表折疊封存 (Project Archive)
- **一鍵快速封存**：滑鼠懸停在左側任意專案上，點擊右側 **📥** 圖示即可將該專案封存折疊，立刻從主專案列表中隱藏，騰出垂直空間。
- **查看與還原**：在 `Projects` 標題列右側點擊 **`Archive`** 按鈕（有封存專案時附帶數字徽標），展開折疊面板，點擊 **`Restore`** 或直接點擊專案名稱，即可隨時恢復回主列表。
- **啟用自動解除封存**：在封存專案中啟用新對話或透過連結進入時，自動解除封存並恢復顯示在主列表。
- **完美契合主題**：採用 Antigravity 原生 Tailwind 與 CSS 變數，深色/淺色模式自適應。

> 📷 **功能示範影片 / 圖片佔位**：
> ![專案封存示範佔位圖](./assets/demo_archive_placeholder.png)
> *(佔位符：可在此插入功能示範動圖 GIF 或影片連結)*

[↑ 返回功能列表](#tc-features)

---

#### <a id="tc-feature-3"></a> 3. 🎨 按鈕位置大小微調與熱更新
使用文字編輯器打開 [`src/agy-enhancer.js`](./src/agy-enhancer.js)，在頂部的 `USER_CONFIG` 中可按需修改：
- `BUTTON_OPACITY`：平時預設透明度（預設 `0.3`，即 30% 半透明，避免遮擋內容）；
- `BUTTON_HOVER_OPACITY`：滑鼠懸停時的透明度（預設 `1.0` 完全清晰）；
- `NAV_RIGHT`：距離右側邊緣間距（預設 `20px`）；
- `NAV_BOTTOM`：距離底部高度（預設 `170px`）；
- `BUTTON_SIZE`：按鈕直徑大小（預設 `38px`）。

> **熱更新**：儲存檔案後（`Ctrl + S`），用戶端將在 0.1 秒內自動生效，無需重啟用戶端！

> 📷 **功能示範影片 / 圖片佔位**：
> ![參數自訂示範佔位圖](./assets/demo_config_placeholder.png)
> *(佔位符：可在此插入功能示範動圖 GIF 或影片連結)*

[↑ 返回功能列表](#tc-features)



