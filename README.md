# Antigravity Dialogue & Navigation Enhancer (`agy-enhancer`)

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

---

<a id="quick-nav"></a>
### 📌 Quick Navigation
[🚀 Prerequisites & Setup](#setup) · [✨ Core Features](#features) · [🎨 Customization](#customization) · [📜 Userscript](#userscript) · [❓ FAQ](#faq) · [📦 Download Now](https://github.com/atjjme/agy-enhancer/releases/latest)

---

### ✨ Vision

As Antigravity updates and evolves, may this project gradually fade into the background.

---

<a id="setup"></a>
### 🚀 Prerequisites & Setup

#### 1. System Requirements
- **Operating System**: Windows 10 / Windows 11
- **Software Dependencies**:
  - **Antigravity 2.0 Desktop Client** (compatible with all recent builds);
  - **[Node.js](https://nodejs.org/)** runtime (LTS version recommended, v16+; used for running the lightweight background daemon. Run `node -v` in terminal to verify installation).

#### 2. Download Package
👉 **[Click here to download the latest Release ZIP](https://github.com/atjjme/agy-enhancer/releases/latest)** and extract it to any local directory.

#### 3. One-Click Setup & Autostart (Recommended)
Double-click in the root directory:
👉 **`install.bat`** (or **`setup-autostart.bat`**)
- **`install.bat`** is the friendly installer name for general users;
- **`setup-autostart.bat`** reflects the core mechanism;
- Both execute identical logic: automatically configures Windows startup and launches the daemon silently in background (runs without popup console windows; a green status indicator dot will appear at the top-right corner of the Antigravity client upon successful injection).

#### 4. Manual Controls
- **`start-service-silent.vbs`**: Starts the daemon silently in the background (no console window).
- **`stop-service.bat`**: Stops and terminates the background daemon.
- **`start-enhancer.bat`**: Starts in debug console mode (shows terminal window for real-time connection and interaction logs).

#### 5. Uninstallation
Double-click:
👉 **`uninstall.bat`**
- Automatically removes the Windows startup shortcut and stops the background service immediately.

---

<a id="features"></a>
### ✨ Core Features & Operations

1. [Status Indicator: Top-right green dot shows active injection status](#feature-1)
2. [Quick Navigation: Up/Down floating buttons in bottom-right corner](#feature-2)
3. [Project Archive: One-click archive & restore workspace projects](#feature-3)
4. [Context Menu Overhaul: Comprehensive right-click actions across the UI](#feature-4)
5. [Conversation Reading Memory: Automatically remembers scroll position per chat](#feature-5)
6. [Smart Unread Detection: Marks as read only after genuine viewing](#feature-6)

---

#### <a id="feature-1"></a> 1. Status Indicator: Top-right green dot shows active injection status

- **Description**: Once the enhancer service launches and successfully injects into the client, a discreet green indicator dot appears in the top-right corner of Antigravity, confirming that all enhancements are active and ready.

> 📷 **Demo Screenshot / Video**:
>
> <img src="./assets/2026-09-07_10-02-10.png" width="100%" />

[↑ Back to Features](#features)

---

#### <a id="feature-2"></a> 2. Quick Navigation: Up/Down floating buttons in bottom-right corner

- **The Problem**: In native Antigravity, long AI responses automatically leave the viewport pinned at the very bottom. Navigating back up requires tedious manual scrolling and often overshoots target prompts.
- **Solution & Experience**:
  1. **Click Up (↑)**: Smoothly scrolls to the header of the current prompt. If already near the top, sequential clicks jump to previous turn headers. At the earliest turn, jumps directly to the conversation start;
  2. **Click Down (↓)**: Smoothly scrolls down to the footer of the current AI response. If already near the bottom, sequential clicks advance to the next turn;
  3. **Double Click Down (↓)**: Instantly scrolls smoothly to the very latest bottom of the conversation.

> 📷 **Demo Screenshot / Video**:
>
> <table>
>   <tr>
>     <td align="center" width="50%"><strong>Static Preview</strong><br><img src="./assets/2026-09-07_10-05-46.png" /></td>
>     <td align="center" width="50%"><strong>Interactive Demo</strong><br><img src="./assets/2026-09-07_11-27-16.gif" width="100%" /><br><a href="./assets/2026-09-07_11-27-16.mp4">▶ Watch HD Video</a></td>
>   </tr>
> </table>

[↑ Back to Features](#features)

---

#### <a id="feature-3"></a> 3. Project Archive: One-click archive & restore workspace projects

- **The Problem**: Unfinished projects clutter the left sidebar, consuming precious vertical screen space.
- **Solution & Experience**:
  1. **One-Click Archive**: Hover over any project item and click the **📥** icon to collapse and hide it immediately from the active projects list;
  2. **View & Restore**: Click the **`Archive`** button in the `Projects` header (with badge count) to open the archived drawer, then click **`Restore`** or use the context menu to bring it back;
  3. **Auto Unarchive on Activity**: Starting a new prompt or sending messages in an archived project automatically unarchives it back to the active list;
  4. **Native Theme Adaptive**: Perfectly matched with Antigravity's native Tailwind & CSS variables in both dark and light modes.

> 📷 **Demo Screenshot / Video**:
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

[↑ Back to Features](#features)

---

#### <a id="feature-4"></a> 4. Context Menu Overhaul: Comprehensive right-click actions across the UI

- **The Problem**: The native client lacks right-click context menus for common daily operations like copying, opening local folders, saving artifacts, or quoting text.
- **Enhanced Behavior**:

#### I. Left Sidebar Context Menu
- **Unarchived Chats**:
  1. Elevated "Copy" sub-options directly to primary menu level for faster access;
  2. Added "Reveal in Explorer" (highlights conversation file in Windows Explorer).
- **Project Chats**:
  1. Elevated "Copy" actions to top-level;
  2. Added "Reveal in Explorer" for conversation;
  3. Added "Open Project Directory".
- **Project Items**:
  1. Added "Open Project Directory".

#### II. Main Chat Area (Prompts & Responses) Menu Specification

Arranged in **strict order**:

| Trigger Scenario / Target Entity | Menu Item (Strict Order) | Behavior Description |
| :--- | :--- | :--- |
| **Selected Text**<br>*(Text highlighted in prompt or response)* | 1. **`Copy`**<br>2. **`Quote`**<br>*(If selected text is URL: 3. `Open Link in Browser` 4. `Copy Link Address`)*<br>*(If selected text is path: 3. `Reveal in Explorer` 4. `Copy Path`)【Identified even without selection】*<br>5. **`Search`** | • Copies selection to clipboard<br>• Formats text into a markdown quote block into the prompt input box<br>• Smart recognition: URLs can be directly opened in external browser; local paths can be revealed in Explorer<br>• Performs Google search in default browser |
| **Code Block**<br>*(No text selected)* | 1. **`Copy Code`**<br>2. **`Save As...`** | • Copies full raw code text (triggers native copy button when possible)<br>• Exports code block as a local file with smart file extension detection |
| **Hyperlink**<br>*(URL link)* | 1. **`Open Link in Browser`**<br>2. **`Copy Link Address`** | • Opens URL in default system browser (safely once)<br>• Copies URL to clipboard |
| **Local Path** | 1. **`Reveal in Explorer`**<br>2. **`Copy Path`** *(Folder only)*<br>*(Image paths additionally offer: 3. `Copy Image`)* | • Highlights and opens location in Windows Explorer<br>• Copies directory path to clipboard<br>• If path points to an image, copies bitmap to clipboard |
| **Artifact Card / Attachment** | 1. **`Reveal in Explorer`**<br>2. **`Copy Path`** *(Folder only)*<br>*(Image artifacts additionally offer: 3. `Copy Image`)* | • Reveals artifact directory in Windows Explorer<br>• Copies artifact directory path to clipboard<br>• Copies image bitmap directly if applicable |
| **Image Element** | 1. **`Copy Image`**<br>2. **`Reveal in Explorer`** *(Local images)*<br>3. **`Copy Path`** *(Folder only)*<br>4. **`Save Image As...`** | • Copies binary image bitmap directly to system clipboard<br>• Opens container directory in Explorer<br>• Copies directory path<br>• Saves image file locally |
| **Blank Message Bubble** | *(Disabled / Hidden)* | • Kept blank and clean to allow native click behaviors |

---

#### III. Right Sidebar (Artifacts / Code / Preview) Menu Specification

Arranged in **strict order**:

| Trigger Scenario / Target Entity | Menu Item (Strict Order) | Behavior Description |
| :--- | :--- | :--- |
| **Selected Text / Code Line** | 1. **`Comment`**<br>2. **`Copy`**<br>3. **`Quote`**<br>4. **`Explain`** | • Triggers inline code commenting input<br>• Copies selected text/code<br>• Formats selection into prompt quote<br>• Inserts code explanation prompt into chat input |
| **Code Editor Empty Area** | 1. **`Copy Code`**<br>2. **`Reveal in Explorer`**<br>3. **`Copy Path`** *(Folder only)*<br>4. **`Save As...`** | • Copies full code content<br>• Locates artifact/source file in Windows Explorer<br>• Copies directory path<br>• Exports as local file |
| **Image Element** | 1. **`Copy Image`**<br>2. **`Reveal in Explorer`**<br>3. **`Copy Path`** *(Folder only)*<br>4. **`Save Image As...`** | • Copies image bitmap directly to clipboard<br>• Reveals directory in Explorer<br>• Copies directory path<br>• Saves image locally |
| **Hyperlink** | 1. **`Open Link in Browser`**<br>2. **`Copy Link Address`** | • Opens in external default browser<br>• Copies link URL |
| **Local Path** | 1. **`Reveal in Explorer`**<br>2. **`Copy Path`** *(Folder only)*<br>*(Image paths support: 3. `Copy Image`)* | • Opens folder in Windows Explorer<br>• Copies folder path<br>• Copies bitmap if image |
| **Empty Inspector Area** | 1. **`Reveal in Explorer`**<br>2. **`Copy Path`** *(Folder only)*<br>*(Image artifacts support: 3. `Copy Image`)* | • Reveals active artifact directory in Windows Explorer<br>• Copies active directory path<br>• Copies image bitmap if current artifact is an image |

> 📷 **Demo Screenshot / Video**:
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

[↑ Back to Features](#features)

---

#### <a id="feature-5"></a> 5. Conversation Reading Memory: Remembers scroll position per chat

- **The Problem**: In native Antigravity, switching conversations forcibly snaps the view to the bottom, losing your reading context in lengthy dialogues or code reviews.
- **Solution & Experience**:
  1. **Automatic Position Memory**: Automatically tracks and restores reading positions across conversation switches; persists across client restarts or PC reboots;
  2. **Smart Storage Capacity**: Retains reading positions for up to 50 active chats (conversations already naturally scrolled to the bottom do not consume quota).

> 📷 **Demo Screenshot / Video**:
>
> <img src="./assets/2026-09-07_11-41-40.gif" width="100%" /><br><a href="./assets/2026-09-07_11-41-40.mp4">▶ Watch HD Video</a>

[↑ Back to Features](#features)

---

#### <a id="feature-6"></a> 6. Smart Unread Detection: Marks as read only after genuine viewing

- **The Problem**:
  1. If you switch away while a response is generating, the native client marks the conversation as read prematurely, risking overlooked outputs;
  2. Background generation completion immediately clears unread flags even if you just briefly opened the chat without reading.
- **Solution & Experience**:
  Applies an intelligent unread verification mechanism:
  1. **Long Dialogues**: Requires scrolling down to bottom twice and staying for at least 5 seconds before marking as read;
  2. **Short Dialogues**: Automatically marks as read after scrolling down twice or remaining for 10 seconds;
  3. **Manual Control**: Directly toggle "Mark as Read" or "Mark as Unread" via sidebar context menu.

> 📷 **Demo Screenshot / Video**:
>
> <img src="./assets/2026-09-07_12-03-24.png" width="100%" />

[↑ Back to Quick Navigation](#quick-nav)

---

<a id="customization"></a>
### 🎨 Customization & Hot Reload

Open [`src/agy-enhancer.js`](./src/agy-enhancer.js) with any text editor and tweak `USER_CONFIG` at the top:

- `BUTTON_OPACITY`: Idle semi-transparency (default `0.3`, or 30% opacity to prevent obscuring text);
- `BUTTON_HOVER_OPACITY`: Hover opacity (default `1.0` for crisp visibility);
- `NAV_RIGHT`: Margin from the right edge (default `20px`);
- `NAV_BOTTOM`: Margin from bottom chat input (default `170px`);
- `BUTTON_SIZE`: Diameter of the circular navigation buttons (default `38px`).

> ⚡ **Sub-Second Hot Reload**:
> Save your changes with `Ctrl + S`, and the daemon will hot-reload the UI within **0.1 seconds** without restarting the client or reloading the app!

[↑ Back to Quick Navigation](#quick-nav)

---

<a id="userscript"></a>
### 📜 Userscript (Tampermonkey) Guide

Beyond the Windows background service daemon, this repository includes a pre-packaged userscript [`agy-enhancer.user.js`](./agy-enhancer.user.js).

If you access Antigravity through modern web browsers (Chrome, Edge, Firefox, etc.) or localhost web ports:
1. Ensure the [Tampermonkey](https://www.tampermonkey.net/) extension is installed in your browser;
2. Drag and drop [`agy-enhancer.user.js`](./agy-enhancer.user.js) into your browser, or create a new script in Tampermonkey and paste the code;
3. Refresh Antigravity Web to enjoy full navigation, archive, and context menu enhancements.

[↑ Back to Quick Navigation](#quick-nav)

---

<a id="faq"></a>
### ❓ FAQ & Troubleshooting

#### Q1: No green indicator dot appeared after setup?
1. **Client Status**: Make sure Antigravity 2.0 desktop client is currently running;
2. **Verify Node.js**: Open CMD or PowerShell and execute `node -v`. If command is not found, install the LTS release from [Node.js Official Site](https://nodejs.org/);
3. **Debug Log**: Run `start-enhancer.bat` in debug console mode to inspect terminal logs and connection errors;
4. **Window Refresh**: If you used `Ctrl + R` to hard reload the window, the daemon automatically re-injects in ~0.2s.

#### Q2: How do I update to newer releases?
Simply download the latest ZIP package from [Releases](https://github.com/atjjme/agy-enhancer/releases/latest) and extract/overwrite existing files.
- The background daemon will hot reload `src/agy-enhancer.js` immediately upon file replacement;
- No need to reconfigure startup or reboot your PC.

#### Q3: Does the daemon impact performance or collect private data?
- **Zero Invasiveness**: Never modifies Antigravity binaries or core application files;
- **Minimal Footprint**: Operates via efficient event loops with negligible memory and CPU overhead;
- **100% Local & Private**: All settings, archives, and scroll records stay in your local `%APPDATA%\antigravity` folder. **Never sends or uploads** prompts, conversation logs, or paths to any external server.

#### Q4: How do I terminate or completely uninstall?
- **Temporary Stop**: Double-click `stop-service.bat` to terminate the background process;
- **Full Removal**: Double-click `uninstall.bat` to remove the startup shortcut and stop the service cleanly.

[↑ Back to Quick Navigation](#quick-nav)
