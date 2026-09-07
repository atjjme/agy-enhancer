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

专为 **Antigravity 2.0 桌面客户端** 定制的功能及操作增强套件。

### 🚀 使用指南

#### 直接下载：下载 ZIP 压缩包并解压至任意文件夹

#### 1. 一键安装与开机自启（推荐）
双击运行根目录下的：
👉 **`install.bat`**（或 **`setup-autostart.bat`**）
- **`install.bat`** 是普通用户熟悉的安装名称；
- **`setup-autostart.bat`** 是核心机制的表现名称；
- 两者功能完全一致：自动配置 Windows 开机自启并在后台静默启动守护服务（无弹窗提示；注入成功后 Antigravity 界面右上角会有绿色状态圆点指示）。

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

1. [脚本生效：在 Antigravity 2.0 界面右上角显示绿点指示](#zh-feature-1)
2. [快速定位：界面右下角显示“向上”“向下”按钮](#zh-feature-2)
3. [项目归档：未完成暂时不处理的项目可以一键归档](#zh-feature-3)
4. [右键菜单：操作界面全面添加右键功能](#zh-feature-4)
5. [会话阅读记忆：记住每个会话阅读的进度](#zh-feature-5)
6. [智能未读判定：真实阅读完输出信息后再标记为已读](#zh-feature-6)

---

#### <a id="zh-feature-1"></a> 1. 脚本生效：在 Antigravity 2.0 界面右上角显示绿点指示

- **说明**：脚本成功启动并注入后，Antigravity 客户端右上角会出现一个绿色圆点指示器，直观标识增强功能已就绪生效。

> 📷 **功能演示视频 / 图片**：
>
> <img src="./assets/2026-09-07_10-02-10.png" width="100%" />

[↑ 返回功能列表](#zh-features)

---

#### <a id="zh-feature-2"></a> 2. 快速定位：界面右下角显示“向上”“向下”按钮

- **原因**：原生客户端在 AI 输出完成长篇回答后，页面会停留在最底部。用户若想从头阅读，需要频繁手动向上滑动翻阅，极易滑过目标内容，既耗费时间且难以精准定位。
- **效果**：
  1. **点击【向上 (↑)】**：平滑滚动到当前提示词（Prompt）的顶端；若已在顶端，可连续点击切换到上一轮提示词。在首个提问处点击则直达对话顶部；
  2. **点击【向下 (↓)】**：平滑滚动到当前回答（Response）的尾部；若已在尾部，连续点击可跳至下一轮回答尾部；
  3. **双击【向下 (↓)】**：直接平滑滚至整个对话的最底部。

> 📷 **功能演示视频 / 图片**：
>
> <table>
>   <tr>
>     <td align="center" width="50%"><strong>静态预览</strong><br><img src="./assets/2026-09-07_10-05-46.png" /></td>
>     <td align="center" width="50%"><strong>操作演示</strong><br><video src="./assets/2026-09-07_11-27-16.mp4" controls width="100%"></video></td>
>   </tr>
> </table>

[↑ 返回功能列表](#zh-features)

---

#### <a id="zh-feature-3"></a> 3. 项目归档：未完成暂时不处理的项目可以一键归档

- **原因**：部分暂时未完成但又不愿删除的项目，长期留在侧栏会占用大量垂直空间；归档后既能保持界面整洁，原项目与会话数据依然完整保存。
- **效果**：
  1. **一键快速归档**：鼠标悬停在左侧任意项目上，点击右侧 **📥** 图标即可将该项目归档折叠，立刻从主项目列表中隐藏，腾出垂直空间；
  2. **查看与还原**：在 `Projects` 标题栏右侧点击 **`Archive`** 按钮（有归档项目时附带数字徽标），展开折叠面板，点击 **`Restore`** 按钮或使用右键菜单，即可随时恢复到主列表；
  3. **交互自动解除归档**：在已归档项目中发起新对话或在历史会话中继续提问时，系统会自动解除归档并恢复显示在主列表中；
  4. **完美契合原生主题**：深度适配 Antigravity 原生 Tailwind 与 CSS 变量，深色/浅色模式无缝自适应。

> 📷 **功能演示视频 / 图片**：
>
> <table>
>   <tr>
>     <td align="center" width="50%"><img src="./assets/2026-09-07_10-09-17.png" /></td>
>     <td align="center" width="50%"><img src="./assets/2026-09-07_10-10-58.png" /></td>
>   </tr>
>   <tr>
>     <td align="center" width="50%"><img src="./assets/2026-09-07_10-12-14.png" /></td>
>     <td align="center" width="50%"><img src="./assets/2026-09-07_10-13-02.png" /></td>
>   </tr>
> </table>

[↑ 返回功能列表](#zh-features)

---

#### <a id="zh-feature-4"></a> 4. 右键菜单：操作界面全面添加右键功能

- **原因**：
  1. 原生客户端暂未提供右键快捷菜单，很多高频操作层级较深或无法直接触发；
  2. 通过右键上下文菜单可集中提供复制、路径定位、文件管理、引用提问等操作，显著提升交互效率。
- **效果**：

##### 一、左侧栏右键快捷操作
- **未归档会话**：
  1. 将“Copy”二级子菜单直接提升为一级菜单，减少点击层级；
  2. 新增“打开会话所在目录”（在本地文件资源管理器中高亮定位）。
- **项目会话**：
  1. 将“Copy”二级子菜单提升为一级菜单；
  2. 新增“打开会话所在目录”；
  3. 新增“打开所在项目目录”。
- **项目列表项**：
  1. 新增“打开所在项目目录”。

##### 二、聊天主区域（提问区 & 回复区）右键菜单规范

**严格顺序**排列：

| 触发场景 / 目标实体 | 英文菜单项 (严格按此顺序) | 功能行为说明 |
| :--- | :--- | :--- |
| **选中文本**<br>*(提问或回复中划选文字)* | 1. **`Copy`**<br>2. **`Quote`**<br>*(划选网址额外提供: 3. `Open Link in Browser` 4. `Copy Link Address`)*<br>*(划选路径额外提供: 3. `Reveal in Explorer` 4. `Copy Path`)【不划选也可识别】*<br>5. **`Search`** | • 复制所选文字到剪贴板<br>• 将文本以引用格式填入下方提问输入框<br>• 智能识别划选内容：划选网址可直接在浏览器打开或复制网址；划选本地路径可直接打开目录或复制所在目录【不划选也可识别】<br>• 调用默认搜索引擎（Google）在外部浏览器中搜索所选内容 |
| **代码块**<br>*(未划选文字)* | 1. **`Copy Code`**<br>2. **`Save As...`** | • 复制当前代码块全部纯文本（优先触发原生复制按钮）<br>• 另存/导出该代码块为本地文件（智能识别语言后缀） |
| **超链接**<br>*(Hyperlink / URL)* | 1. **`Open Link in Browser`**<br>2. **`Copy Link Address`** | • 在系统默认外部浏览器中打开链接（仅打开一次）<br>• 复制完整超链接地址到剪贴板 |
| **本地路径**<br>*(Local Path)* | 1. **`Reveal in Explorer`**<br>2. **`Copy Path`** *(仅所在目录)*<br>*(图片路径额外支持: 3. `Copy Image`)* | • 在本地 Windows 资源管理器中打开定位该路径<br>• 复制所在目录的绝对路径（不带文件名）<br>• 若指向图片文件，支持直接复制图片位图 |
| **实体文件 / 制品卡片**<br>*(Artifact Card / 附件)* | 1. **`Reveal in Explorer`**<br>2. **`Copy Path`** *(仅所在目录)*<br>*(图片文件额外支持: 3. `Copy Image`)* | • 在本地资源管理器中打开并定位文件所在目录<br>• 复制该文件所在目录的绝对路径（不带文件名）<br>• 若卡片指向图片文件，支持直接复制图片位图 |
| **图片**<br>*(Image)* | 1. **`Copy Image`**<br>2. **`Reveal in Explorer`** *(本地/落盘图片)*<br>3. **`Copy Path`** *(仅所在目录)*<br>4. **`Save Image As...`** | • 复制图片二进制位图到系统剪贴板（免去中间地址，可直接粘贴使用）<br>• 在资源管理器中打开其所在文件夹<br>• 复制图片所在目录的绝对路径（不带文件名）<br>• 另存为本地图片文件（免去手动输入文件名） |
| **消息气泡空白处**<br>*(回复区 / 提问区空白处)* | *(暂不启用 / 不弹出)* | • 已全部去掉，保持界面纯净及放行潜在原生交互 |

---

##### 三、右侧栏（制品 / 代码 / 预览）右键菜单规范

**严格顺序**排列：

| 触发场景 / 目标实体 | 英文菜单项 (严格按此顺序) | 功能行为说明 |
| :--- | :--- | :--- |
| **选中文本 / 代码行**<br>*(Text / Code Selection)* | 1. **`Comment`**<br>2. **`Copy`**<br>3. **`Quote`**<br>4. **`Explain`** | • 屏蔽原生悬浮窗，点击呼出原生行间批注/评论框<br>• 复制所选文本或代码到剪贴板<br>• 屏蔽原生悬浮窗，点击将所选内容以引用格式填入提问框<br>• 提问框自动填入预设解释 Prompt 并带上该代码 |
| **代码块 / 编辑器空白处**<br>*(未划选文字)* | 1. **`Copy Code`**<br>2. **`Reveal in Explorer`** *(制品/本地代码文件)*<br>3. **`Copy Path`** *(仅所在目录)*<br>4. **`Save As...`** | • 复制当前代码全文（优先触发原生复制代码按钮）<br>• 在本地 Windows 资源管理器中高亮定位当前代码文件<br>• 复制当前代码文件所在的目录路径（不带文件名）<br>• 导出/另存为本地文件 |
| **图片**<br>*(Image)* | 1. **`Copy Image`**<br>2. **`Reveal in Explorer`** *(本地/落盘图片)*<br>3. **`Copy Path`** *(仅所在目录)*<br>4. **`Save Image As...`** | • 复制图片二进制位图到系统剪贴板（可直接粘贴为图像）<br>• 在文件资源管理器中打开图片所在的目录<br>• 复制图片所在目录的绝对路径（不带文件名）<br>• 另存为本地图片文件（免去手动命名） |
| **超链接**<br>*(Hyperlink / URL)* | 1. **`Open Link in Browser`**<br>2. **`Copy Link Address`** | • 在系统默认外部浏览器中打开该网址（仅打开一次）<br>• 复制该链接完整 URL 到剪贴板 |
| **本地路径**<br>*(Local Path)* | 1. **`Reveal in Explorer`**<br>2. **`Copy Path`** *(仅所在目录)*<br>*(图片路径额外支持: 3. `Copy Image`)* | • 在本地资源管理器中直接打开定位该路径<br>• 复制所在目录的绝对路径（不带文件名）<br>• 若为图片文件，支持直接复制图片位图 |
| **右侧栏空白处**<br>*(未划选文字)* | 1. **`Reveal in Explorer`**<br>2. **`Copy Path`** *(仅所在目录)*<br>*(图片制品额外支持: 3. `Copy Image`)* | • 在资源管理器中打开当前活动制品/文件所在的目录<br>• 复制当前制品所在目录的绝对路径（不带文件名）<br>• 若当前为图片制品，支持直接复制图片位图 |

> 📷 **功能演示视频 / 图片**：
>
> <table>
>   <tr>
>     <td align="center" width="50%"><img src="./assets/2026-09-07_11-15-21.png" /></td>
>     <td align="center" width="50%"><img src="./assets/2026-09-07_11-14-44.png" /></td>
>   </tr>
>   <tr>
>     <td align="center" width="50%"><img src="./assets/2026-09-07_11-17-04.png" /></td>
>     <td align="center" width="50%"><img src="./assets/2026-09-07_11-18-42.png" /></td>
>   </tr>
> </table>

[↑ 返回功能列表](#zh-features)

---

#### <a id="zh-feature-5"></a> 5. 会话阅读记忆：记住每个会话阅读的进度

- **原因**：原生客户端在每次切换会话时，都会将页面强制重置滚动到底部。阅读长篇对话或代码时极为不便，需要反复重新滑找此前阅读的位置。
- **效果**：
  1. **自动记忆阅读位置**：切换会话时自动保存并恢复浏览进度，即使重启客户端或电脑依然生效；
  2. **智能容量管理**：预设记录最近 50 条会话的阅读进度（若会话已自然处于最底部则不占用记录额度）。

> 📷 **功能演示视频 / 图片**：
>
> <video src="./assets/2026-09-07_11-41-40.mp4" controls width="100%"></video>

[↑ 返回功能列表](#zh-features)

---

#### <a id="zh-feature-6"></a> 6. 智能未读判定：让用户真实看完输出信息然后标记为已读

- **原因**：
  1. 在当前会话生成内容时，若用户中途切换到其他会话，该会话会被原生客户端错误地提前标记为“已读”，导致用户遗漏后续输出；
  2. 会话在后台执行任务并生成完毕后，用户只要点击进入但即便未实际浏览内容，系统也会直接标记为“已读”。
- **效果**：
  引入智能未读判定机制，确保用户真实浏览后再更新状态，避免误判漏读：
  1. **长文信息**：需二次滚动到底部且停留满 5 秒后，才标记为已读；
  2. **短文信息**：二次滚动到底部或停留满 10 秒后，自动标记为已读；
  3. **手动控制**：支持在左侧栏右键菜单中手动标记为“已读”或“未读”。

> 📷 **功能演示视频 / 图片**：
>
> <img src="./assets/2026-09-07_12-03-24.png" width="100%" />

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



