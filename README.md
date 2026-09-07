# Antigravity Dialogue & Navigation Enhancer (`agy-enhancer`)

[English](#english) | [简体中文](#简体中文) | [繁體中文](#繁體中文)

---

<a id="english"></a>
## English

A paper-style dialogue navigation and browsing enhancement suite tailored for the **Antigravity 2.0 Desktop Client**.

### ✨ Highlights & Usage

1. **"Paper-style" Dialogue Navigation (One Q&A = One Page)**
   - **Click Up (↑)**: Smoothly jumps back to the **Header** (beginning of the prompt). If already at the header, jumps to the previous Q&A turn. At the first page, goes straight to the conversation top.
   - **Click Down (↓)**: Smoothly scrolls to the **Footer** (end of the AI response). If already at the footer, moves to the next Q&A turn. At the last page, goes to the conversation bottom.
   - **Double Click Down (↓)**: Instantly and smoothly navigates straight to the very bottom of the conversation.

2. **Project Workspace Archive**
   - **One-Click Archive**: Hover over any project in the left sidebar and click the **📥** archive icon to collapse and hide it from the main list.
   - **View & Restore**: Click the **`Archive`** button next to the `Projects` header to expand the archive panel and click **`Restore`** or the project title to bring it back.

---

### 🚀 Getting Started

#### 1. One-Click Setup & Autostart (Recommended)
Double-click to run:
👉 **`install.bat`** (or **`setup-autostart.bat`**)
- Installs the background daemon to Windows Startup.
- Automatically launches silently in the background (**no black terminal window**, zero screen clutter).
- Works across application restarts or whenever you refresh via `Ctrl + R` in Antigravity.

#### 2. Manual Controls
- **`start-service-silent.vbs`**: Starts the daemon silently in the background.
- **`stop-service.bat`**: Stops the running background daemon.
- **`start-enhancer.bat`**: Starts in debug console mode (useful for viewing real-time logs).

#### 3. Customizing Position, Size & Opacity
Open [`src/agy-enhancer.js`](./src/agy-enhancer.js) with any text editor. You can tweak the `USER_CONFIG` block at the top:
- `BUTTON_OPACITY`: Default idle opacity (default `0.3` / 30% to avoid blocking text).
- `BUTTON_HOVER_OPACITY`: Opacity on mouse hover (default `1.0`).
- `NAV_RIGHT`: Distance from right edge (default `20px`).
- `NAV_BOTTOM`: Distance from bottom edge (default `170px`).
- `BUTTON_SIZE`: Button diameter (default `38px`).

> **Hot Reload**: Press `Ctrl + S` to save your changes in the file, and the client updates automatically within 0.1s without restarting!

#### 4. Uninstallation
Double-click:
👉 **`uninstall.bat`**
- Removes the Windows startup shortcut and stops the daemon process.

---

<a id="简体中文"></a>
## 简体中文

专为 **Antigravity 2.0 桌面客户端** 定制的“纸张式”对话导航与浏览体验套件。

### ✨ 核心功能与操作

1. **“一问一答，皆为一纸”纸张式导航**
   - **点击【向上 (↑)】**：若在纸张中间或页脚，平滑回到本轮对话【页头】（提问起始处）；若已在页头附近，翻到【上一张纸】（上一轮问答）页头；处于首轮时直达顶部。
   - **点击【向下 (↓)】**：若在纸张上半部分或页头，平滑直达本轮对话【页脚】（回答末尾处）；若已在页脚附近，翻到【下一张纸】（下一轮问答）页头；处于末轮时直达最新底部。
   - **双击【向下 (↓)】**：直接平滑滚至整个对话页面的最底部。

2. **项目列表折叠归档 (Project Archive)**
   - **一键归档**：鼠标悬停在左侧任意项目上，点击右侧 **📥** 图标即可快速隐藏折叠该项目。
   - **查看与还原**：在 `Projects` 标题栏右侧点击 **`Archive`** 按钮展开面板，点击 **`Restore`** 或项目名即可恢复回主列表。

---

### 🚀 使用指南

#### 1. 一键安装与开机自启（推荐）
双击运行根目录下的：
👉 **`install.bat`**（或 **`setup-autostart.bat`**）
- 自动添加开机自启快捷方式；
- **后台完全隐形静默运行**（无黑框、不占桌面）；
- 无论打开、重启还是在客户端中按 `Ctrl + R` 刷新，功能均自动就绪。

#### 2. 手动启动与停止
- **`start-service-silent.vbs`**：后台静默启动守护服务（无黑框）。
- **`stop-service.bat`**：停止并退出后台守护服务。
- **`start-enhancer.bat`**：控制台调试模式（显示终端窗口，便于查看实时日志）。

#### 3. 个性化位置、大小与透明度微调
使用文本编辑器打开 [`src/agy-enhancer.js`](./src/agy-enhancer.js)，在顶部的 `USER_CONFIG` 中可按需修改：
- `BUTTON_OPACITY`：平时默认透明度（默认 `0.3`，即 30% 半透明，避免遮挡内容）；
- `BUTTON_HOVER_OPACITY`：鼠标悬停时的透明度（默认 `1.0` 完全清晰）；
- `NAV_RIGHT`：距离右侧边缘间距（默认 `20px`）；
- `NAV_BOTTOM`：距离底部高度（默认 `170px`）；
- `BUTTON_SIZE`：按钮直径大小（默认 `38px`）。

> **热更新**：保存文件后（`Ctrl + S`），客户端将在 0.1 秒内自动生效，无需重启客户端！

#### 4. 卸载
双击运行：
👉 **`uninstall.bat`**
- 自动清理开机自启项并停止后台服务。

---

<a id="繁體中文"></a>
## 繁體中文

專為 **Antigravity 2.0 桌面用戶端** 定制的「紙張式」對話導航與瀏覽體驗套件。

### ✨ 核心功能與操作

1. **「一問一答，皆為一紙」紙張式導航**
   - **點擊【向上 (↑)】**：若在紙張中間或頁尾，平滑回到本輪對話【頁首】（提問起始處）；若已在頁首附近，翻到【上一張紙】（上一輪問答）頁首；處於首輪時直達頂部。
   - **點擊【向下 (↓)】**：若在紙張上半部分或頁首，平滑直達本輪對話【頁尾】（回答末尾處）；若已在頁尾附近，翻到【下一張紙】（下一輪問答）頁首；處於末輪時直達最新底部。
   - **按兩下【向下 (↓)】**：直接平滑捲動至整個對話頁面的最底部。

2. **專案列表折疊封存 (Project Archive)**
   - **一鍵封存**：滑鼠懸停在左側任意專案上，點擊右側 **📥** 圖示即可快速隱藏折疊該專案。
   - **查看與還原**：在 `Projects` 標題列右側點擊 **`Archive`** 按鈕展開面板，點擊 **`Restore`** 或專案名稱即可恢復回主列表。

---

### 🚀 使用指南

#### 1. 一鍵安裝與開機自啟（推薦）
按兩下執行根目錄下的：
👉 **`install.bat`**（或 **`setup-autostart.bat`**）
- 自動新增開機自啟捷徑；
- **後台完全隱形靜默執行**（無黑框、不佔桌面）；
- 無論開啟、重啟還是在用戶端中按 `Ctrl + R` 重新整理，功能皆自動就緒。

#### 2. 手動啟動與停止
- **`start-service-silent.vbs`**：後台靜默啟動守護服務（無黑框）。
- **`stop-service.bat`**：停止並結束後台守護服務。
- **`start-enhancer.bat`**：主控台除錯模式（顯示終端視窗，便於查看即時日誌）。

#### 3. 個性化位置、大小與透明度微調
使用文字編輯器打開 [`src/agy-enhancer.js`](./src/agy-enhancer.js)，在頂部的 `USER_CONFIG` 中可按需修改：
- `BUTTON_OPACITY`：平時預設透明度（預設 `0.3`，即 30% 半透明，避免遮擋內容）；
- `BUTTON_HOVER_OPACITY`：滑鼠懸停時的透明度（預設 `1.0` 完全清晰）；
- `NAV_RIGHT`：距離右側邊緣間距（預設 `20px`）；
- `NAV_BOTTOM`：距離底部高度（預設 `170px`）；
- `BUTTON_SIZE`：按鈕直徑大小（預設 `38px`）。

> **熱更新**：儲存檔案後（`Ctrl + S`），用戶端將在 0.1 秒內自動生效，無需重啟用戶端！

#### 4. 解除安裝
按兩下執行：
👉 **`uninstall.bat`**
- 自動清理開機自啟項目並停止後台服務。


