// ==UserScript==
// @name         Antigravity 阅读增强器 (agy-read)
// @namespace    https://antigravity.google/
// @version      1.0.0
// @description  优化 Antigravity 对话滚动体验：思考时正常滚动，思考完成输出内容时自动回滚到问题顶端，输入框上方提供向下直达底部按钮，右上角提供生效提示。
// @match        https://127.0.0.1:*/*
// @match        http://127.0.0.1:*/*
// @match        https://localhost:*/*
// @match        http://localhost:*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

window.__AGY_BRANCH_TAG__ = "（分支）";
window.__AGY_BRANCH_NAME__ = "double_click_scroll_bottom";
/**
 * Antigravity 阅读增强器 (agy-read enhancer)
 * 
 * 核心特性：
 * 1. 【纸张式翻页导航】右侧滚动条旁常驻「向上 / 向下」双按钮：
 *    - 点向上：如果在纸内，回到当前问答的【页头】（提问顶部）；如果在页头附近，翻到【上一页】（上一轮问答）；
 *    - 点向下：如果在纸内，直达当前问答的【页脚】（回答末尾）；如果在页脚附近，翻到【下一页】（下一轮问答或最新底部）；双击直接直达整个页面最底部；
 * 2. 【右上角状态提示】提示增强器正在守护阅读。
 */

(function () {
  'use strict';

  // ==================== 0. 用户自定义配置区 ====================
  const USER_CONFIG = {
    // 导航按钮组距离窗口右边缘的距离（像素，建议 16~24px 贴近滚动条左侧）
    NAV_RIGHT: 20,

    // 导航按钮组距离窗口底部的高度（像素，默认 170px，可自由上下微调）
    NAV_BOTTOM: 170,

    // 按钮平时默认透明度（0~1，例如 0.3 为 30% 半透明，避免遮挡后面背景字）
    BUTTON_OPACITY: 0.3,

    // 鼠标划过悬停时的透明度（0~1，默认 1.0 恢复完全清晰）
    BUTTON_HOVER_OPACITY: 1.0,

    // 按钮直径大小（像素，默认 38px）
    BUTTON_SIZE: 38,

    // 两个按钮之间的垂直间距（像素，默认 8px）
    BUTTON_GAP: 8,

    // 判定到达页头/页脚的灵敏度阈值（像素，默认 45px）
    PAGE_EDGE_THRESHOLD: 45,

    // 是否开启居中原有的向下按钮（默认 false，全由右侧翻页按钮组接管）
    ENABLE_CENTER_BOTTOM_BUTTON: false,

    // 右上角提示收折时长（毫秒，默认 3500ms 即 3.5 秒）
    TOAST_EXPAND_DURATION_MS: 3500,

    // 是否开启多对话滚动阅读位置记忆与恢复（默认开启）
    ENABLE_SCROLL_POSITION_PERSISTENCE: true,

    // 是否开启智能已读/未读状态追踪与提醒（默认开启）
    ENABLE_SMART_UNREAD: true,

    // 短文自动已读停留时长（毫秒，默认 10000 即 10 秒）
    SHORT_TEXT_READ_DURATION_MS: 10000,

    // 长文二次触底后底部平稳停留时长（毫秒，默认 5000 即 5 秒）
    LONG_TEXT_BOTTOM_DURATION_MS: 5000,

    // 判定长短文的比例阈值（默认 0.8，末轮问答高度 < 视口 80% 为短文，反之为长文）
    LONG_TEXT_RATIO: 0.8,

    // 底部触底判定灵敏度（阈值设为 100px，在离底 100px 范围内均视作触底舒适区）
    BOTTOM_THRESHOLD: 100,

    // 离开底部判定阈值（向上翻阅超过 160px 判定离开底部，保留 60px 防抖区间）
    LEAVE_BOTTOM_THRESHOLD: 160,
  };

  // ==================== 1. 全局清理与定时器安全管理机制 ====================
  if (typeof window.__AGY_ENHANCER_CLEANUP__ === 'function') {
    try { window.__AGY_ENHANCER_CLEANUP__(); } catch (e) {}
  }

  const activeTimers = [];
  function addInterval(fn, ms) {
    const id = setInterval(fn, ms);
    activeTimers.push(id);
    return id;
  }
  function addTimeout(fn, ms) {
    const id = setTimeout(fn, ms);
    activeTimers.push(id);
    return id;
  }

  let windowPopstateHandler = null;
  let docClickHandler = null;
  let promptKeydownHandler = null;
  let promptClickHandler = null;
  let contextMenuHandler = null;
  let lastContextMenuPos = null;
  let activeNativeConvoId = null;
  let nativeMenuPointerDownHandler = null;
  let nativeMenuObserver = null;
  let originalElementScrollTo = null;
  let originalPushState = null;
  let originalReplaceState = null;
  let scrollCaptureHandler = null;
  let userInteractionHandler = null;
  let notifyNewPromptSubmitted = null;
  let notifyPromptSubmittedForUnread = null;
  let unreadScrollHandler = null;
  let unreadWheelHandler = null;

  window.__AGY_ENHANCER_CLEANUP__ = function () {
    activeTimers.forEach(id => {
      clearInterval(id);
      clearTimeout(id);
    });
    activeTimers.length = 0;

    if (windowPopstateHandler) {
      window.removeEventListener('popstate', windowPopstateHandler);
      windowPopstateHandler = null;
    }
    if (docClickHandler) {
      document.removeEventListener('click', docClickHandler);
      docClickHandler = null;
    }
    if (promptKeydownHandler) {
      document.removeEventListener('keydown', promptKeydownHandler, true);
      promptKeydownHandler = null;
    }
    if (promptClickHandler) {
      document.removeEventListener('click', promptClickHandler, true);
      promptClickHandler = null;
    }
    if (contextMenuHandler) {
      document.removeEventListener('contextmenu', contextMenuHandler, true);
      contextMenuHandler = null;
    }
    lastContextMenuPos = null;
    if (nativeMenuPointerDownHandler) {
      document.removeEventListener('pointerdown', nativeMenuPointerDownHandler, true);
      nativeMenuPointerDownHandler = null;
    }
    if (nativeMenuObserver) {
      nativeMenuObserver.disconnect();
      nativeMenuObserver = null;
    }

    if (originalElementScrollTo) {
      Element.prototype.scrollTo = originalElementScrollTo;
      originalElementScrollTo = null;
    }
    if (originalPushState) {
      history.pushState = originalPushState;
      originalPushState = null;
    }
    if (originalReplaceState) {
      history.replaceState = originalReplaceState;
      originalReplaceState = null;
    }
    if (scrollCaptureHandler) {
      window.removeEventListener('scroll', scrollCaptureHandler, true);
      scrollCaptureHandler = null;
    }
    if (unreadScrollHandler) {
      window.removeEventListener('scroll', unreadScrollHandler, true);
      unreadScrollHandler = null;
    }
    if (unreadWheelHandler) {
      window.removeEventListener('wheel', unreadWheelHandler, true);
      unreadWheelHandler = null;
    }
    if (userInteractionHandler) {
      ['wheel', 'pointerdown', 'mousedown', 'keydown', 'touchstart'].forEach(type => {
        window.removeEventListener(type, userInteractionHandler, true);
      });
      userInteractionHandler = null;
    }
    notifyNewPromptSubmitted = null;
    notifyPromptSubmittedForUnread = null;

    document.getElementById('agy-read-styles')?.remove();
    document.getElementById('agy-page-nav-group')?.remove();
    document.getElementById('agy-scroll-bottom-btn')?.remove();
    // 保留 #agy-read-toast 单例，避免清理重建时反复重置并重新展开
    // document.getElementById('agy-read-toast')?.remove();
    document.getElementById('agy-archive-header-btn')?.remove();
    document.getElementById('agy-archive-panel')?.remove();
    document.getElementById('agy-project-options-dropdown')?.remove();
    document.getElementById('agy-convo-options-dropdown')?.remove();
    document.querySelectorAll('.agy-quick-archive-btn').forEach(el => el.remove());
    document.querySelectorAll('.agy-unread-dot-badge').forEach(el => el.remove());
    document.querySelectorAll('.agy-native-enhanced').forEach(el => el.remove());
    window.__AGY_ENHANCER_LOADED__ = false;
  };

  // 执行一次初始状态与残留清理
  window.__AGY_ENHANCER_CLEANUP__();

  // ==================== 核心自启动守护程序（极速就绪） ====================
  function bootstrap() {
    if (!document || !document.head || !document.body) {
      setTimeout(bootstrap, 20);
      return;
    }

    console.log('[agy-read] 初始化纸张式阅读翻页器...');
    initEnhancer();
  }

  function initEnhancer() {
    window.__AGY_ENHANCER_LOADED__ = true;

    // ==================== 1. 注入专用样式 ====================
    const styleEl = document.createElement('style');
    styleEl.id = 'agy-read-styles';
    styleEl.textContent = `
      /* 右上角生效提示 Toast */
      #agy-read-toast {
        position: fixed;
        top: 14px;
        right: 140px;
        z-index: 999999;
        -webkit-app-region: no-drag !important;
        app-region: no-drag !important;
        pointer-events: auto !important;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        border-radius: 9999px;
        background: rgba(24, 24, 27, 0.9);
        color: #f4f4f5;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 12px;
        font-weight: 500;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        cursor: pointer;
        user-select: none;
        opacity: 0;
        transform: translateY(-8px) scale(0.95);
      }
      #agy-read-toast,
      #agy-read-toast * {
        -webkit-app-region: no-drag !important;
        app-region: no-drag !important;
        pointer-events: auto !important;
      }
      #agy-read-toast.show {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      #agy-read-toast.collapsed {
        padding: 6px 9px;
        opacity: 0.8;
        background: rgba(24, 24, 27, 0.75);
      }
      #agy-read-toast.collapsed:hover {
        opacity: 1;
        padding: 6px 14px;
        background: rgba(24, 24, 27, 0.95);
      }
      #agy-read-toast .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
        box-shadow: 0 0 10px #22c55e;
        flex-shrink: 0;
      }
      #agy-read-toast .toast-text {
        white-space: nowrap;
        transition: all 0.25s ease;
      }
      #agy-read-toast.collapsed .toast-text {
        max-width: 0;
        opacity: 0;
        margin: 0;
        overflow: hidden;
      }
      #agy-read-toast.collapsed:hover .toast-text {
        max-width: 220px;
        opacity: 1;
        margin-left: 2px;
      }

      /* 右侧滚动条旁常驻「翻页/页头页脚」按钮组 */
      #agy-page-nav-group {
        position: fixed;
        right: ${USER_CONFIG.NAV_RIGHT}px;
        bottom: ${USER_CONFIG.NAV_BOTTOM}px;
        z-index: 999990;
        display: flex;
        flex-direction: column;
        gap: ${USER_CONFIG.BUTTON_GAP}px;
        user-select: none;
        opacity: ${USER_CONFIG.BUTTON_OPACITY};
        transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #agy-page-nav-group:hover {
        opacity: ${USER_CONFIG.BUTTON_HOVER_OPACITY};
      }

      .agy-nav-btn {
        width: ${USER_CONFIG.BUTTON_SIZE}px;
        height: ${USER_CONFIG.BUTTON_SIZE}px;
        border-radius: 50%;
        background: rgba(30, 30, 38, 0.9);
        color: #f4f4f5;
        border: 1px solid rgba(255, 255, 255, 0.16);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        outline: none;
        user-select: none;
        -webkit-user-select: none;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                    background-color 0.2s ease,
                    box-shadow 0.2s ease,
                    color 0.2s ease;
      }
      .agy-nav-btn:hover {
        background: rgba(48, 48, 60, 0.98);
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        color: #ffffff;
      }
      .agy-nav-btn:active {
        transform: scale(0.94);
      }
      .agy-nav-btn svg {
        width: 18px;
        height: 18px;
        transition: transform 0.15s ease;
      }
      .agy-nav-btn.up:hover svg {
        transform: translateY(-2px);
      }
      .agy-nav-btn.down:hover svg {
        transform: translateY(2px);
      }

      /* 亮色模式自动适配 */
      @media (prefers-color-scheme: light) {
        #agy-read-toast {
          background: rgba(255, 255, 255, 0.95);
          color: #18181b;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.08);
        }
        #agy-read-toast.collapsed {
          background: rgba(255, 255, 255, 0.85);
        }
        #agy-read-toast.collapsed:hover {
          background: rgba(255, 255, 255, 0.98);
        }
        .agy-nav-btn {
          background: rgba(255, 255, 255, 0.92);
          color: #27272a;
          border: 1px solid rgba(0, 0, 0, 0.12);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
        }
        .agy-nav-btn:hover {
          background: rgba(244, 244, 245, 1);
          color: #000000;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
        }
      }

      /* 项目折叠归档管理器样式（全跟随原生主题色） */
      #agy-archive-header-btn {
        outline: none;
        user-select: none;
      }
      #agy-archive-header-btn .agy-count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 14px;
        height: 14px;
        padding: 0 4px;
        border-radius: 9999px;
        font-size: 10px;
        font-weight: 600;
        line-height: 1;
        background: var(--secondary, rgba(125, 125, 125, 0.2));
        color: var(--secondary-foreground, inherit);
        border: 1px solid var(--border, rgba(125, 125, 125, 0.25));
      }

      /* 快捷归档小按钮（外观色彩与三个点及+号一致） */
      .agy-quick-archive-btn {
        outline: none;
        cursor: pointer;
      }

      /* 已归档项目折叠面板 */
      #agy-archive-panel {
        position: fixed;
        z-index: 999995;
        box-sizing: border-box;
        width: 260px;
        max-width: calc(100vw - 20px);
        max-height: 420px;
        background: var(--sidebar, var(--background, #1e1e24));
        border: 1px solid var(--border, rgba(125, 125, 125, 0.2));
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--border, rgba(125, 125, 125, 0.1));
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: var(--foreground, #ffffff);
        animation: agyFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes agyFadeIn {
        from { opacity: 0; transform: translateY(-4px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .agy-archive-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 12px;
        border-bottom: 1px solid var(--border, rgba(125, 125, 125, 0.15));
        font-size: 12px;
        font-weight: 600;
        background: var(--secondary, rgba(125, 125, 125, 0.05));
      }
      .agy-archive-panel-title {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--foreground, #ffffff);
      }
      .agy-archive-close {
        background: transparent;
        border: none;
        color: var(--muted-foreground, rgba(125, 125, 125, 0.7));
        font-size: 14px;
        cursor: pointer;
        padding: 2px 5px;
        border-radius: 4px;
        transition: all 0.15s ease;
      }
      .agy-archive-close:hover {
        background: var(--secondary, rgba(125, 125, 125, 0.15));
        color: var(--foreground, #ffffff);
      }
      .agy-archive-panel-body {
        padding: 6px;
        overflow-y: auto;
        max-height: 340px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .agy-archive-empty {
        padding: 24px 12px;
        text-align: center;
        font-size: 12px;
        color: var(--muted-foreground, rgba(125, 125, 125, 0.7));
        line-height: 1.6;
      }
      .agy-archive-item {
        display: flex;
        flex-direction: column;
        border-radius: 6px;
        transition: background 0.15s ease;
      }
      .agy-archive-item-header {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 30px;
        padding: 0 6px;
        border-radius: 6px;
        cursor: pointer;
        user-select: none;
        color: var(--muted-foreground);
        transition: background 0.15s ease, color 0.15s ease;
      }
      .agy-archive-item-header:hover {
        background: var(--secondary, rgba(125, 125, 125, 0.12));
        color: var(--foreground);
      }
      .agy-archive-item-main {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        min-width: 0;
      }
      .agy-archive-chevron {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
        opacity: 0.55;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .agy-archive-item.expanded .agy-archive-chevron {
        transform: rotate(90deg);
      }
      .agy-archive-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--foreground, #ffffff);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding-right: 76px;
      }
      .agy-archive-actions {
        position: absolute;
        right: 4px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        gap: 2px;
        opacity: 0;
        transition: opacity 0.15s ease;
      }
      .agy-archive-item-header:hover .agy-archive-actions {
        opacity: 1;
      }
      .agy-quick-restore-btn,
      .agy-quick-options-btn,
      .agy-quick-add-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 4px;
        border: none;
        background: transparent;
        color: var(--muted-foreground);
        cursor: pointer;
        outline: none;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .agy-quick-restore-btn:hover,
      .agy-quick-options-btn:hover,
      .agy-quick-add-btn:hover {
        background: var(--secondary, rgba(125, 125, 125, 0.22));
        color: var(--foreground);
      }

      /* 项目/对话操作下拉菜单 */
      .agy-options-dropdown {
        background: var(--card, var(--sidebar, var(--background, #ffffff)));
        color: var(--foreground, #101010);
        border: 1px solid var(--border, rgba(125, 125, 125, 0.25));
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
        padding: 4px;
        min-width: 160px;
        display: flex;
        flex-direction: column;
        gap: 1px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        animation: agyFadeIn 0.12s ease-out;
        z-index: 9999999;
      }
      .agy-dd-divider {
        height: 1px;
        background: var(--border, rgba(125, 125, 125, 0.18));
        margin: 4px -4px;
      }
      .agy-dd-item {
        position: relative;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 13px;
        line-height: 19.5px;
        font-weight: 400;
        cursor: pointer;
        user-select: none;
        color: var(--secondary-foreground, var(--foreground, #101010));
        transition: background 0.12s ease, color 0.12s ease;
      }
      .agy-dd-item svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
      .agy-dd-item:hover,
      .agy-dd-item.active {
        background: var(--secondary, rgba(125, 125, 125, 0.15));
        color: var(--foreground, #101010);
      }
      .agy-dd-item .agy-dd-chevron {
        margin-left: auto;
        opacity: 0.6;
      }
      /* 子菜单 Submenu */
      .agy-dd-submenu {
        display: none;
        position: absolute;
        top: -4px;
        left: calc(100% + 4px);
        background: var(--card, var(--sidebar, var(--background, #ffffff)));
        color: var(--foreground, #101010);
        border: 1px solid var(--border, rgba(125, 125, 125, 0.25));
        border-radius: 7px;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.1);
        padding: 4px;
        min-width: 150px;
        flex-direction: column;
        gap: 2px;
        z-index: 10000000;
        animation: agyFadeIn 0.1s ease-out;
      }
      .agy-dd-submenu.flip-left {
        left: auto;
        right: calc(100% + 4px);
      }
      .agy-dd-item.has-submenu:hover > .agy-dd-submenu,
      .agy-dd-item.has-submenu.open > .agy-dd-submenu {
        display: flex;
      }

      /* 展开的对话列表 */
      .agy-archive-convo-list {
        display: none;
        flex-direction: column;
        gap: 2px;
        padding: 2px 4px 6px 16px;
      }
      .agy-archive-item.expanded .agy-archive-convo-list {
        display: flex;
      }
      .agy-convo-item {
        position: relative;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 6px;
        border-radius: 4px;
        font-size: 12px;
        color: var(--muted-foreground);
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
        text-decoration: none;
        min-height: 26px;
        box-sizing: border-box;
      }
      .agy-convo-item:hover {
        background: var(--secondary, rgba(125, 125, 125, 0.15));
        color: var(--foreground);
      }
      .agy-convo-title {
        flex: 1;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .agy-convo-item.unread .agy-convo-title {
        font-weight: 600;
        color: var(--foreground);
      }
      .agy-convo-unread-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #3b82f6;
        flex-shrink: 0;
        margin-left: -2px;
      }
      .agy-convo-options-btn {
        display: none;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 4px;
        border: none;
        background: transparent;
        color: var(--muted-foreground);
        cursor: pointer;
        flex-shrink: 0;
        margin-left: auto;
        opacity: 0.8;
        transition: background 0.15s ease, color 0.15s ease, opacity 0.15s ease;
      }
      .agy-convo-item:hover .agy-convo-options-btn,
      .agy-convo-options-btn.active {
        display: flex;
      }
      .agy-convo-options-btn:hover {
        background: var(--secondary, rgba(125, 125, 125, 0.28));
        color: var(--foreground);
        opacity: 1;
      }
      .agy-convo-rename-input {
        flex: 1;
        min-width: 0;
        height: 22px;
        padding: 0 4px;
        font-size: 12px;
        font-family: inherit;
        color: var(--foreground);
        background: var(--input, rgba(125, 125, 125, 0.18));
        border: 1px solid var(--border, rgba(125, 125, 125, 0.4));
        border-radius: 3px;
        outline: none;
      }
      .agy-convo-rename-input:focus {
        border-color: var(--primary, #3b82f6);
      }
      .agy-convo-empty {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 6px;
        font-size: 11px;
        color: var(--muted-foreground);
        opacity: 0.8;
      }
      .agy-open-project-btn {
        background: transparent;
        border: 1px solid var(--border, rgba(125, 125, 125, 0.2));
        border-radius: 4px;
        color: var(--foreground);
        font-size: 10px;
        padding: 1px 6px;
        cursor: pointer;
      }
      .agy-open-project-btn:hover {
        background: var(--secondary, rgba(125, 125, 125, 0.2));
      }

      /* 侧边栏未读状态指示徽标（专属呼吸光晕设计） */
      .agy-unread-dot-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: relative;
        width: 14px;
        height: 14px;
        margin-right: 4px;
        flex-shrink: 0;
        pointer-events: none;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 5;
      }
      .agy-unread-dot-pulse {
        position: absolute;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--primary, #10b981);
        opacity: 0.35;
        animation: agyUnreadPulse 2.2s infinite ease-in-out;
      }
      .agy-unread-dot-core {
        position: relative;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--primary, #10b981);
        box-shadow: 0 0 6px var(--primary, #10b981);
      }
      .agy-unread-fade-out {
        opacity: 0 !important;
        transform: scale(0.3) !important;
        transition: opacity 0.32s cubic-bezier(0.4, 0, 0.2, 1), transform 0.32s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      @keyframes agyUnreadPulse {
        0% { transform: scale(0.85); opacity: 0.45; }
        50% { transform: scale(1.65); opacity: 0.08; }
        100% { transform: scale(0.85); opacity: 0.45; }
      }
    `;
    document.head.appendChild(styleEl);

    // ==================== 2. 创建右上角生效通知 Toast ====================
    let showNotification = (msg) => {};

    function createToast() {
      let toast = document.getElementById('agy-read-toast');
      const branchTag = window.__AGY_BRANCH_TAG__ || '';
      let collapseTimer = null;

      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'agy-read-toast';
        toast.title = `Antigravity 阅读增强器已就绪${branchTag}`;
        toast.innerHTML = `
          <div class="dot"></div>
          <span class="toast-text">Antigravity 增强器生效中${branchTag}</span>
        `;

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
          setTimeout(() => toast.classList.add('show'), 80);
        });

        collapseTimer = setTimeout(() => {
          toast.classList.add('collapsed');
        }, USER_CONFIG.TOAST_EXPAND_DURATION_MS);

        toast.addEventListener('mouseenter', () => {
          if (collapseTimer) clearTimeout(collapseTimer);
          toast.classList.remove('collapsed');
        });

        toast.addEventListener('mouseleave', () => {
          toast.classList.add('collapsed');
        });

        toast.addEventListener('click', () => {
          if (collapseTimer) clearTimeout(collapseTimer);
          toast.classList.toggle('collapsed');
        });
      } else {
        // 已存在单例 Toast，仅更新标题，绝对不重置收折状态，绝不重新展开！
        toast.title = `Antigravity 阅读增强器已就绪${branchTag}`;
        if (!toast.classList.contains('collapsed')) {
          toast.classList.add('collapsed');
        }
      }

      showNotification = (msg) => {
        const textSpan = toast.querySelector('.toast-text');
        if (textSpan) textSpan.textContent = msg;
        toast.classList.remove('collapsed');
        toast.classList.add('show');
        if (collapseTimer) clearTimeout(collapseTimer);
        collapseTimer = setTimeout(() => {
          toast.classList.add('collapsed');
        }, 3000);
      };
    }

    createToast();

    // ==================== 3. 核心容器与纸张坐标算法 ====================

    function getChatScrollContainer() {
      const candidate = document.querySelector('.scrollbar-hide.md-table-bleed') ||
                        document.querySelector('.overflow-y-auto.md-table-bleed');
      if (candidate && candidate.clientHeight > 200) {
        return candidate;
      }

      const turnContainer = document.querySelector('.relative.flex.flex-col.gap-y-3') ||
                            document.querySelector('.flex.flex-col.gap-y-3');
      if (turnContainer) {
        let p = turnContainer.parentElement;
        while (p && p !== document.body) {
          const s = window.getComputedStyle(p);
          if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && p.clientHeight > 200) {
            return p;
          }
          p = p.parentElement;
        }
      }

      return null;
    }

    /**
     * 获取所有“纸张”（问答回合 Turn）的几何边界
     */
    function getPagesInfo() {
      const container = getChatScrollContainer();
      if (!container) return { container: null, pages: [] };

      const turnContainer = document.querySelector('.relative.flex.flex-col.gap-y-3') ||
                            document.querySelector('.flex.flex-col.gap-y-3');
      if (!turnContainer || turnContainer.children.length === 0) {
        return { container, pages: [] };
      }

      const containerHeight = container.clientHeight;
      const pages = Array.from(turnContainer.children).map((el, idx) => {
        const top = el.offsetTop;
        const isLast = (idx === turnContainer.children.length - 1);
        const inner = el.firstElementChild;
        const realContentHeight = (inner && inner.offsetHeight > 0) ? inner.offsetHeight : el.offsetHeight;
        // 如果是最后一页且带有 min-height 撑开样式，使用真实内容高度，避免滚动与长短文测量失真
        const height = (isLast && el.style.minHeight) ? realContentHeight : el.offsetHeight;
        // 页头：该问答开始提问的位置（预留 8px 视口呼吸边距）
        const headScrollTop = Math.max(0, top - 8);
        // 页脚：该问答回复末尾的最佳舒适视口位置
        const footScrollTop = Math.max(headScrollTop, top + height - containerHeight + 20);

        return {
          index: idx,
          element: el,
          top,
          height,
          contentHeight: realContentHeight,
          bottom: top + height,
          headScrollTop,
          footScrollTop
        };
      });

      return { container, pages };
    }

    /**
     * 判定当前视口处于哪一张纸上
     */
    function getCurrentPageIndex(pages, currentScroll) {
      if (!pages || pages.length === 0) return -1;

      // 从后往前查找当前视口落在哪个 Turn 的区间中
      for (let i = pages.length - 1; i >= 0; i--) {
        if (currentScroll >= pages[i].top - 50) {
          return i;
        }
      }
      return 0;
    }

    // ==================== 4. 纸张式智能导航：向上 / 向下 ====================

    /**
     * 【向上翻 / 回页头】逻辑：
     * 1. 若当前在纸张中间或页脚 -> 平滑滚回本张纸的【页头】
     * 2. 若已经在页头附近 -> 翻到【上一张纸】的页头
     */
    function navigatePageUp() {
      const { container, pages } = getPagesInfo();
      if (!container || pages.length === 0) return;

      const currentScroll = container.scrollTop;
      const curIdx = getCurrentPageIndex(pages, currentScroll);
      const curPage = pages[curIdx];

      const threshold = USER_CONFIG.PAGE_EDGE_THRESHOLD;

      // 如果当前视口距离本页页头较远（说明在纸张内向下读了一段），点一下回到本页页头
      if (currentScroll > curPage.headScrollTop + threshold) {
        console.log(`[agy-read] 回到第 ${curIdx + 1} 页页头`);
        container.scrollTo({ top: curPage.headScrollTop, behavior: 'smooth' });
      } else {
        // 已经在当前页头附近，点一下向上翻到上一页
        if (curIdx > 0) {
          const prevPage = pages[curIdx - 1];
          console.log(`[agy-read] 向上翻到第 ${curIdx} 页页头`);
          container.scrollTo({ top: prevPage.headScrollTop, behavior: 'smooth' });
        } else {
          // 已经是第 1 页，直达整个页面最顶端
          console.log('[agy-read] 直达最顶端');
          container.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }

    /**
     * 【向下翻 / 到页脚】逻辑：
     * 1. 若当前在纸张上半部分或页头 -> 直达本张纸的【页脚】（看完该回复）
     * 2. 若已经在页脚附近 -> 翻到【下一张纸】的页头（开始看下一个问答）
     */
    function navigatePageDown() {
      const { container, pages } = getPagesInfo();
      if (!container || pages.length === 0) return;

      const currentScroll = container.scrollTop;
      const curIdx = getCurrentPageIndex(pages, currentScroll);
      const curPage = pages[curIdx];

      const threshold = USER_CONFIG.PAGE_EDGE_THRESHOLD;

      // 如果当前还没到底部页脚，点一下到本页页脚
      if (currentScroll < curPage.footScrollTop - threshold) {
        console.log(`[agy-read] 直达第 ${curIdx + 1} 页页脚`);
        container.scrollTo({ top: curPage.footScrollTop, behavior: 'smooth' });
      } else {
        // 已经在页脚附近，翻到下一页的页头
        if (curIdx < pages.length - 1) {
          const nextPage = pages[curIdx + 1];
          console.log(`[agy-read] 向下翻到第 ${curIdx + 2} 页页头`);
          container.scrollTo({ top: nextPage.headScrollTop, behavior: 'smooth' });
        } else {
          // 已经是最后一页，直达最新底部
          console.log('[agy-read] 直达最新底部');
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
      }
    }

    /**
     * 【直达最底部】逻辑：
     * 双击向下按钮时，无视当前问答位置，直接平滑滚动到整个页面的最底端
     */
    function navigateToBottom() {
      const container = getChatScrollContainer();
      if (!container) return;
      console.log('[agy-read] 双击直达最底部');
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }

    // ==================== 5. 创建右侧常驻双按钮 ====================

    function createPageNavButtons() {
      let group = document.getElementById('agy-page-nav-group');
      if (group) group.remove();

      group = document.createElement('div');
      group.id = 'agy-page-nav-group';

      // 向上按钮
      const upBtn = document.createElement('button');
      upBtn.className = 'agy-nav-btn up';
      upBtn.type = 'button';
      upBtn.title = '向上：回到本问答页头 / 翻到上一页';
      upBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      `;
      upBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigatePageUp();
      });

      // 向下按钮
      const downBtn = document.createElement('button');
      downBtn.className = 'agy-nav-btn down';
      downBtn.type = 'button';
      downBtn.title = '向下：单击直达页脚/下一页，双击直达最底部';
      downBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      `;
      downBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigatePageDown();
      });
      downBtn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigateToBottom();
      });

      group.appendChild(upBtn);
      group.appendChild(downBtn);
      document.body.appendChild(group);

      return group;
    }

    createPageNavButtons();

    // ==================== 6. 项目折叠归档管理器 (Project Archiver) ====================
    function initProjectArchiver() {
      // 1. 确保系统底层归档能力开启
      try {
        const override = { enabled: true, userCohort: 'google', isDevMode: true };
        const current = localStorage.getItem('jetski.developer.featureEnvironmentOverride');
        if (!current || current !== JSON.stringify(override)) {
          localStorage.setItem('jetski.developer.featureEnvironmentOverride', JSON.stringify(override));
        }
      } catch (e) {}

      function getPM() {
        const header = document.querySelector('[data-testid="section-header"][data-title="Projects"]');
        if (!header) return null;
        const fiberKey = Object.keys(header).find(k => k.startsWith('__reactFiber$'));
        let fiber = header ? header[fiberKey] : null;
        while (fiber) {
          if (fiber.memoizedProps?.value?.projectManagementFeature) {
            return fiber.memoizedProps.value.projectManagementFeature;
          }
          fiber = fiber.return;
        }
        return null;
      }

      function getTSP() {
        const els = Array.from(document.querySelectorAll('[data-testid="section-header"]'));
        for (const el of els) {
          const k = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
          let fiber = el[k];
          while (fiber) {
            if (fiber.memoizedProps?.value?.trajectorySummariesProvider) {
              return fiber.memoizedProps.value.trajectorySummariesProvider;
            }
            fiber = fiber.return;
          }
        }
        return null;
      }

      function getProjectConversations(projectId) {
        const tsp = getTSP();
        if (!tsp) return [];
        const summaries = tsp.getState()?.summaries || {};
        const list = Object.entries(summaries).map(([key, s]) => ({
          id: key, // 使用 key 作为真实对话 ID（不能用 s.trajectoryId，否则报数据不存在且跳转首页）
          title: s.summary || s.title || 'Untitled conversation',
          projectId: s.projectId || s.trajectoryMetadata?.projectId,
          time: Number(s.lastModifiedTime?.seconds || s.createdTime?.seconds || 0),
          archived: s.annotations?.archived === true,
          markedAsUnread: s.annotations?.markedAsUnread === true
        }));
        // 仅展示归属于该项目、且未被单独归档的正常对话
        return list.filter(c => c.projectId === projectId && !c.archived).sort((a, b) => b.time - a.time);
      }

      let cachedGeminiBaseUri = null;
      function getGeminiBaseUri() {
        if (cachedGeminiBaseUri) return cachedGeminiBaseUri;
        const pm = getPM();
        const tsp = getTSP();
        const scanTargets = [
          pm?.projectsStateProvider?.getState?.(),
          tsp?.getState?.()?.summaries
        ];
        function scan(obj) {
          if (!obj || cachedGeminiBaseUri) return;
          if (typeof obj === 'string') {
            const m = obj.match(/^(file:\/\/\/.*?[\\/]\.gemini[\\/]antigravity)[\\/]/i);
            if (m) cachedGeminiBaseUri = m[1];
          } else if (typeof obj === 'object') {
            for (const k in obj) {
              try { scan(obj[k]); } catch (e) {}
              if (cachedGeminiBaseUri) return;
            }
          }
        }
        for (const t of scanTargets) {
          scan(t);
          if (cachedGeminiBaseUri) break;
        }
        return cachedGeminiBaseUri;
      }

      async function openLocalFolder(uriOrPath, type = 'folder') {
        if (!uriOrPath) return false;
        let uri = uriOrPath;
        if (/^[a-zA-Z]:[\\/]/.test(uri)) {
          uri = 'file:///' + uri.replace(/\\/g, '/');
        } else if (uri.startsWith('file://')) {
          try {
            uri = decodeURI(uri);
          } catch (e) {}
        }

        // 确保使用标准 file:/// URI 协议格式，并去除末尾斜杠
        if (!uri.startsWith('file:///')) {
          uri = 'file:///' + uri.replace(/^file:\/*/, '');
        }
        uri = uri.replace(/\/+$/, '');

        // 1. 本地文件夹在 Antigravity Electron 中必须使用 revealInFilePicker 打开
        if (window.electronNative?.revealInFilePicker) {
          // 为了直接进入文件夹内部（而非停留在父级目录高亮选中该文件夹）：
          // 优先尝试定位该文件夹内部必定存在的特征子项：
          // - 对话文件夹：.system_generated（每个 Antigravity brain 对话数据目录必有）
          // - 项目/分支文件夹：.git（每个代码工程及 worktree 必有）
          let directChildUri = null;
          if (type === 'convo') {
            directChildUri = `${uri}/.system_generated`;
          } else if (type === 'project') {
            directChildUri = `${uri}/.git`;
          }

          if (directChildUri) {
            try {
              await window.electronNative.revealInFilePicker(directChildUri);
              return true;
            } catch (err) {
              console.warn('[agy-read] direct inside reveal failed, falling back to folder uri:', err);
            }
          }

          // 降级保护：直接定位目标文件夹本身
          try {
            await window.electronNative.revealInFilePicker(uri);
            return true;
          } catch (e) {
            console.warn('[agy-read] revealInFilePicker fallback error:', e);
          }
        }

        if (window.electronNative?.openExternal) {
          try {
            await window.electronNative.openExternal(uri);
            return true;
          } catch (e) {
            console.warn('[agy-read] openExternal error:', e);
          }
        }

        try {
          window.open(uri, '_blank');
          return true;
        } catch (e) {}
        return false;
      }

      function getConvoFolderPaths(convoId, explicitProjectId) {
        const tsp = getTSP();
        const summaries = tsp?.getState()?.summaries || {};
        const s = summaries[convoId];
        const pId = explicitProjectId || s?.projectId || s?.trajectoryMetadata?.projectId;

        let projects = [];
        const pm = getPM();
        if (pm?.projectsStateProvider?.getState) {
          projects = pm.projectsStateProvider.getState();
        }
        const projItem = projects.find(p => p.project?.id === pId);

        const baseUri = getGeminiBaseUri();
        const convoBrainUri = baseUri && convoId ? `${baseUri}/brain/${convoId}` : null;

        let branchUri = null;
        let isBranch = false;
        const workspaces = s?.trajectoryMetadata?.workspaces || [];
        for (const w of workspaces) {
          if (w.workspaceFolderAbsoluteUri?.includes('/worktrees/') || w.branchName) {
            branchUri = w.workspaceFolderAbsoluteUri;
            isBranch = true;
            break;
          }
        }
        if (!isBranch && s?.trajectoryMetadata?.workspaceUris) {
          for (const u of s.trajectoryMetadata.workspaceUris) {
            if (u.includes('/worktrees/')) {
              branchUri = u;
              isBranch = true;
              break;
            }
          }
        }

        let projectRootUri = null;
        if (projItem?.project?.projectResources?.resources) {
          for (const res of projItem.project.projectResources.resources) {
            if (res.type?.value?.folderUri) {
              projectRootUri = res.type.value.folderUri;
              break;
            }
            if (res.type?.case === 'folderUri' && typeof res.type.value === 'string') {
              projectRootUri = res.type.value;
              break;
            }
          }
        }
        if (!projectRootUri && !isBranch && workspaces.length > 0) {
          projectRootUri = workspaces[0].workspaceFolderAbsoluteUri;
        }

        const targetProjectUri = isBranch && branchUri ? branchUri : projectRootUri;
        const isInsideProject = !!pId && pId !== 'outside-of-project';

        return {
          convoId,
          convoBrainUri,
          isBranch,
          branchUri,
          projectRootUri,
          targetProjectUri,
          isInsideProject
        };
      }

      function escapeHtml(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      function getAppRouter() {
        const candidates = [
          document.querySelector('a[href^="/c/"]'),
          document.querySelector('a[href]'),
          document.querySelector('[data-testid="section-header"]'),
          document.getElementById('root')
        ].filter(Boolean);

        for (const el of candidates) {
          const k = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
          let fiber = el ? el[k] : null;
          while (fiber) {
            if (fiber.memoizedProps?.value?.navigate && fiber.memoizedProps?.value?.history?.push) {
              return fiber.memoizedProps.value;
            }
            fiber = fiber.return;
          }
        }
        return null;
      }

      function navigateTo(path) {
        const router = getAppRouter();
        // 1. 优先使用 TanStack Router 原生 history.push 驱动完整路由切换
        if (router?.history?.push) {
          try {
            router.history.push(path);
            return;
          } catch (e) {
            console.warn('[agy-read] history.push error, falling back to router.navigate:', e);
          }
        }
        // 2. TanStack Router navigate 尝试
        if (router?.navigate) {
          try {
            const url = new URL(path, window.location.origin);
            const match = url.pathname.match(/\/c\/([a-f0-9-]+)/i);
            if (match) {
              const cascadeId = match[1];
              const section = url.searchParams.get('section');
              router.navigate({
                to: '/c/$cascadeId',
                params: { cascadeId },
                search: section ? { section } : undefined
              });
              return;
            }
            router.navigate({ to: path });
            return;
          } catch (e) {
            console.warn('[agy-read] router.navigate error:', e);
          }
        }
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }

      function getAgentService() {
        const candidates = [
          ...Array.from(document.querySelectorAll('[data-testid="section-header"]')),
          document.getElementById('root')
        ].filter(Boolean);
        for (const el of candidates) {
          const k = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
          let fiber = el ? el[k] : null;
          while (fiber) {
            if (fiber.memoizedProps?.value?.deleteCascadeTrajectory && fiber.memoizedProps?.value?.updateConversationAnnotations) {
              return fiber.memoizedProps.value;
            }
            fiber = fiber.return;
          }
        }
        return null;
      }

      async function refreshTrajectories() {
        const as = getAgentService();
        if (as?.getAllCascadeTrajectories) {
          try { await as.getAllCascadeTrajectories(); } catch (e) {}
        }
      }

      function openProjectSettings(projectId) {
        const router = getAppRouter();
        if (router?.navigate) {
          try {
            router.navigate({
              search: (prev) => ({
                ...(typeof prev === 'object' ? prev : {}),
                settingsOpen: 'true',
                settingsProjectId: projectId
              })
            });
            return;
          } catch (e) {
            console.warn('[agy-read] router.navigate error:', e);
          }
        }
        const u = new URL(window.location.href);
        u.searchParams.set('settingsOpen', 'true');
        u.searchParams.set('settingsProjectId', projectId);
        navigateTo(u.pathname + u.search);
      }

      let isPanelOpen = false;
      const expandedProjects = new Set();

      function renderArchivePanel(pm) {
        let panel = document.getElementById('agy-archive-panel');
        if (!isPanelOpen) {
          if (panel) panel.remove();
          document.getElementById('agy-project-options-dropdown')?.remove();
          document.getElementById('agy-convo-options-dropdown')?.remove();
          return;
        }

        if (!panel) {
          panel = document.createElement('div');
          panel.id = 'agy-archive-panel';
          document.body.appendChild(panel);
        }

        const projects = pm?.projectsStateProvider?.getState() || [];
        const archived = projects.filter(p => p.project?.archived && p.project?.id !== 'outside-of-project');

        // 智能定位：贴合 Projects 侧边栏宽度，严禁向右超出侧边栏边界
        const header = document.querySelector('[data-testid="section-header"][data-title="Projects"]');
        const headerBtn = document.getElementById('agy-archive-header-btn');
        if (header && headerBtn) {
          const hRect = header.getBoundingClientRect();
          const btnRect = headerBtn.getBoundingClientRect();
          
          // 适配侧边栏实际宽度，预留边距，容纳 3 个操作按钮
          const panelWidth = Math.min(300, Math.max(260, hRect.width - 12));
          panel.style.width = `${panelWidth}px`;
          panel.style.top = `${btnRect.bottom + 6}px`;
          
          // 确保面板右边线与 Projects 栏右边缘对齐（预留 6px），完全收纳在侧边栏内部
          const rightEdge = hRect.right - 6;
          const leftPos = Math.max(hRect.left + 6, rightEdge - panelWidth);
          panel.style.left = `${leftPos}px`;
        }

        panel.innerHTML = `
          <div class="agy-archive-panel-header">
            <div class="agy-archive-panel-title">
              <svg width="14" height="14" viewBox="0 -960 960 960" fill="currentColor"><path d="m480-256.16 146.15-146.15L584-444.46l-74 74v-178H450v178l-74-74-42.15 42.15L480-256.16ZM200-643.85v431.54q0 5.39 3.46 8.85t8.85 3.46h535.38q5.39 0 8.85-3.46t3.46-8.85v-431.54H200ZM215.39-140q-29.92 0-52.65-22.73T140-215.39v-464.38q0-12.85 4.12-24.5t12.35-21.5l56.15-67.92q9.85-12.85 24.62-19.58T268.46-820h422.3q16.46 0 31.42 6.73T747-793.69L803.54-725q8.23 9.85 12.35 21.69T820-678.61v463.22q0 29.92-22.73 52.65T744.61-140H215.39Zm.23-563.84H744l-43.62-51.92q-1.92-1.92-4.42-3.08T690.77-760H268.85q-2.69 0-5.19 1.15t-4.42 3.08l-43.62 51.92ZM480-421.92Z"/></svg>
              <span>Archived Projects (${archived.length})</span>
            </div>
            <button class="agy-archive-close" title="Close">✕</button>
          </div>
          <div class="agy-archive-panel-body">
            ${archived.length === 0 ? `
              <div class="agy-archive-empty">
                <div style="font-size: 22px; margin-bottom: 4px;">📂</div>
                No archived projects<br>
                <span style="font-size: 11px; opacity: 0.65;">Hover over a project and click 📥 to archive</span>
              </div>
            ` : archived.map(item => {
              const isExpanded = expandedProjects.has(item.project.id);
              const convos = getProjectConversations(item.project.id);
              return `
                <div class="agy-archive-item ${isExpanded ? 'expanded' : ''}" data-project-id="${item.project.id}">
                  <div class="agy-archive-item-header" data-project-id="${item.project.id}">
                    <div class="agy-archive-item-main" title="Click to ${isExpanded ? 'collapse' : 'expand'} conversations">
                      <span class="agy-archive-chevron">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="shrink-0 text-muted-foreground" style="opacity: 0.8;"><path d="M170-180q-29.15,0-49.58-20.42T100-250V-707.69q0-29.15 21.58-50.73T172.31-780H391.92l80,80H787.69q26.85,0 46.31,17.35T856.54-640H447.38l-80-80H172.31q-5.39,0-8.85,3.46T160-707.69v455.38q0,4.23 2.12,6.92t5.58,4.62L261-552.31H927.31L830.46-229.69q-6.85,22.54-25.65,36.11T763.08-180H170Zm60.54-60H770.77l75.46-252.31H306L230.54-240Zm0,0L306-492.31L230.54-240ZM160-640v-67.69q0-5.39 0-8.85t0-3.46v80Z"></path></svg>
                      <span class="agy-archive-name">${escapeHtml(item.project.name)}</span>
                    </div>
                    <div class="agy-archive-actions">
                      <!-- 1. Restore 按钮 (替代 Archive) -->
                      <button class="agy-quick-restore-btn" data-restore-id="${item.project.id}" title="Restore [${escapeHtml(item.project.name)}]">
                        <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M440-160v-327L336-383l-56-57 200-200 200 200-56 57-104-104v327h-80ZM160-600v-120q0-33 23.5-56.5T240-800h480q33 0 56.5 23.5T800-720v120h-80v-120H240v120h-80Z"/></svg>
                      </button>
                      <!-- 2. 三个点选项按钮 -->
                      <button class="agy-quick-options-btn" data-project-id="${item.project.id}" title="Project options" aria-label="Project options">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-189.23q-24.75,0-42.37-17.62T420-249.23t17.62-42.37T480-309.23t42.37,17.62T540-249.23t-17.62,42.37T480-189.23ZM480-420q-24.75,0-42.37-17.62T420-480t17.62-42.37T480-540t42.37,17.62T540-480t-17.62,42.37T480-420Zm0-230.77q-24.75,0-42.37-17.62T420-710.77t17.62-42.37T480-770.77t42.37,17.62T540-710.77t-17.62,42.37T480-650.77Z"/></svg>
                      </button>
                      <!-- 3. +号新建对话按钮 -->
                      <button class="agy-quick-add-btn" data-project-id="${item.project.id}" title="New conversation" aria-label="New conversation">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
                      </button>
                    </div>
                  </div>
                  <div class="agy-archive-convo-list">
                    ${convos.length === 0 ? `
                      <div class="agy-convo-empty">No conversations</div>
                    ` : convos.map(c => `
                      <a class="agy-convo-item ${c.markedAsUnread ? 'unread' : ''}" href="/c/${encodeURIComponent(c.id)}?section=${encodeURIComponent(item.project.id)}" data-convo-id="${c.id}" data-project-id="${item.project.id}" title="${escapeHtml(c.title)}">
                        ${c.markedAsUnread ? '<span class="agy-convo-unread-dot" title="Unread"></span>' : ''}
                        <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor" class="shrink-0" style="opacity: 0.7;"><path d="M240-400h480v-60H240v60Zm0-120h480v-60H240v60Zm0-120h480v-60H240v60ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-220H800v-480H160v535l46-55Zm-46 0v-480 480Z"/></svg>
                        <span class="agy-convo-title">${escapeHtml(c.title)}</span>
                        <button class="agy-convo-options-btn" data-convo-id="${c.id}" data-project-id="${item.project.id}" title="Conversation options" aria-label="Conversation options">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-189.23q-24.75,0-42.37-17.62T420-249.23t17.62-42.37T480-309.23t42.37,17.62T540-249.23t-17.62,42.37T480-189.23ZM480-420q-24.75,0-42.37-17.62T420-480t17.62-42.37T480-540t42.37,17.62T540-480t-17.62,42.37T480-420Zm0-230.77q-24.75,0-42.37-17.62T420-710.77t17.62-42.37T480-770.77t42.37,17.62T540-710.77t-17.62,42.37T480-650.77Z"/></svg>
                        </button>
                      </a>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;

        panel.querySelector('.agy-archive-close')?.addEventListener('click', (e) => {
          e.stopPropagation();
          isPanelOpen = false;
          renderArchivePanel(pm);
        });

        // 1. 绑定还原按钮 [📤]
        panel.querySelectorAll('.agy-quick-restore-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            const id = btn.getAttribute('data-restore-id');
            const p = archived.find(x => x.project.id === id);
            if (p && pm?.updateProject) {
              btn.style.pointerEvents = 'none';
              btn.style.opacity = '0.5';
              await pm.updateProject({ ...p.project, archived: false });
              showNotification(`Project [${p.project.name}] restored`);
              renderArchivePanel(pm);
              updateArchiveUI();
            }
          });
        });

        // 2. 绑定项目三点选项按钮 [⋮]
        panel.querySelectorAll('.agy-quick-options-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const id = btn.getAttribute('data-project-id');
            const p = archived.find(x => x.project.id === id);
            if (!p) return;

            const existingDd = document.getElementById('agy-project-options-dropdown');
            if (existingDd && existingDd.getAttribute('data-project-id') === id) {
              existingDd.remove();
              return;
            }
            existingDd?.remove();
            document.getElementById('agy-convo-options-dropdown')?.remove();

            const dd = document.createElement('div');
            dd.id = 'agy-project-options-dropdown';
            dd.className = 'agy-options-dropdown';
            dd.setAttribute('data-project-id', id);

            const menuWidth = 160;
            const menuHeight = 190;
            let leftPos, topPos;

            if (lastContextMenuPos && (Date.now() - lastContextMenuPos.time < 1200)) {
              leftPos = lastContextMenuPos.x;
              topPos = lastContextMenuPos.y;
              lastContextMenuPos = null;
            } else {
              const rect = btn.getBoundingClientRect();
              leftPos = rect.right - menuWidth;
              topPos = rect.bottom + 4;
            }

            if (leftPos < 10) leftPos = 10;
            if (leftPos + menuWidth > window.innerWidth - 10) leftPos = window.innerWidth - menuWidth - 10;
            if (topPos + menuHeight > window.innerHeight - 10) topPos = Math.max(10, window.innerHeight - menuHeight - 10);

            dd.style.position = 'fixed';
            dd.style.top = `${topPos}px`;
            dd.style.left = `${leftPos}px`;
            dd.style.zIndex = '9999999';

            dd.innerHTML = `
              <div class="agy-dd-item copy-name">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
                <span>Copy Project Name</span>
              </div>
              <div class="agy-dd-item settings">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-1 13.5l103 78-110 190-119-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm40-220q42 0 71-29t29-71q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29Z"/></svg>
                <span>Project Settings</span>
              </div>
              <div class="agy-dd-divider"></div>
              <div class="agy-dd-item restore">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M440-160v-327L336-383l-56-57 200-200 200 200-56 57-104-104v327h-80ZM160-600v-120q0-33 23.5-56.5T240-800h480q33 0 56.5 23.5T800-720v120h-80v-120H240v120h-80Z"/></svg>
                <span>Restore</span>
              </div>
              <div class="agy-dd-item new-chat">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
                <span>New Conversation</span>
              </div>
              <div class="agy-dd-divider"></div>
              <div class="agy-dd-item delete" style="color: #ef4444;">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                <span>Delete Project</span>
              </div>
            `;

            document.body.appendChild(dd);

            const closeDropdown = (evt) => {
              if (!dd.contains(evt.target) && !btn.contains(evt.target)) {
                dd.remove();
                document.removeEventListener('click', closeDropdown);
              }
            };
            setTimeout(() => document.addEventListener('click', closeDropdown), 10);

            dd.querySelector('.agy-dd-item.copy-name')?.addEventListener('click', async () => {
              dd.remove();
              await navigator.clipboard.writeText(p.project.name);
              showNotification(`Copied project name: "${p.project.name}"`);
            });

            dd.querySelector('.agy-dd-item.settings')?.addEventListener('click', () => {
              dd.remove();
              isPanelOpen = false;
              renderArchivePanel(pm);
              openProjectSettings(p.project.id);
            });

            dd.querySelector('.agy-dd-item.restore')?.addEventListener('click', async () => {
              dd.remove();
              await pm.updateProject({ ...p.project, archived: false });
              showNotification(`Project [${p.project.name}] restored`);
              renderArchivePanel(pm);
              updateArchiveUI();
            });

            dd.querySelector('.agy-dd-item.new-chat')?.addEventListener('click', () => {
              dd.remove();
              isPanelOpen = false;
              renderArchivePanel(pm);
              navigateTo(`/?section=${encodeURIComponent(p.project.id)}`);
            });

            dd.querySelector('.agy-dd-item.delete')?.addEventListener('click', async () => {
              dd.remove();
              if (confirm(`Are you sure you want to delete project [${p.project.name}]?`)) {
                if (pm.deleteProject) {
                  await pm.deleteProject(p.project.id);
                  showNotification(`Project [${p.project.name}] deleted`);
                  renderArchivePanel(pm);
                  updateArchiveUI();
                }
              }
            });
          });
        });

        // 3. 绑定对话项三点选项按钮 [⋮]
        panel.querySelectorAll('.agy-convo-options-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const convoId = btn.getAttribute('data-convo-id');
            const projectId = btn.getAttribute('data-project-id');
            const convos = getProjectConversations(projectId);
            const c = convos.find(x => x.id === convoId);
            const p = archived.find(x => x.project.id === projectId);
            if (!c || !p) return;

            const existingDd = document.getElementById('agy-convo-options-dropdown');
            if (existingDd && existingDd.getAttribute('data-convo-id') === convoId) {
              existingDd.remove();
              btn.classList.remove('active');
              return;
            }
            existingDd?.remove();
            document.getElementById('agy-project-options-dropdown')?.remove();
            document.querySelectorAll('.agy-convo-options-btn.active').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const dd = document.createElement('div');
            dd.id = 'agy-convo-options-dropdown';
            dd.className = 'agy-options-dropdown';
            dd.setAttribute('data-convo-id', convoId);
            dd.setAttribute('data-project-id', projectId);

            const menuWidth = 195;
            const menuHeight = 290;
            let leftPos, topPos;

            if (lastContextMenuPos && (Date.now() - lastContextMenuPos.time < 1200)) {
              leftPos = lastContextMenuPos.x;
              topPos = lastContextMenuPos.y;
              lastContextMenuPos = null;
            } else {
              const rect = btn.getBoundingClientRect();
              leftPos = rect.right - menuWidth;
              topPos = rect.bottom + 4;
            }

            if (leftPos < 10) leftPos = 10;
            if (leftPos + menuWidth > window.innerWidth - 10) leftPos = window.innerWidth - menuWidth - 10;
            if (topPos + menuHeight > window.innerHeight - 10) topPos = Math.max(10, window.innerHeight - menuHeight - 10);

            dd.style.position = 'fixed';
            dd.style.top = `${topPos}px`;
            dd.style.left = `${leftPos}px`;
            dd.style.zIndex = '9999999';

            dd.innerHTML = `
              <div class="agy-dd-item convo-rename">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                <span>Rename</span>
              </div>
              <div class="agy-dd-item convo-unread">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M200-120v-680h360l16 80h224v400H520l-16-80H280v280h-80Zm300-440Zm86 160h134v-240H510l-16-80H280v240h290l16 80Z"/></svg>
                <span>${c.markedAsUnread ? 'Mark as Read' : 'Mark Unread'}</span>
              </div>
              <div class="agy-dd-item convo-delete" style="color: #ef4444;">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                <span>Delete</span>
              </div>
              <div class="agy-dd-divider"></div>
              <div class="agy-dd-item copy-convo-name">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
                <span>Copy Conversation Name</span>
              </div>
              <div class="agy-dd-item copy-convo-id">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
                <span>Copy Conversation ID</span>
              </div>
              <div class="agy-dd-item copy-project-name">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
                <span>Copy Project Name</span>
              </div>
              <div class="agy-dd-divider"></div>
              <div class="agy-dd-item open-convo-folder">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>
                <span>Open Conversation Folder</span>
              </div>
              <div class="agy-dd-item open-project-folder">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>
                <span>Open Project Folder</span>
              </div>
            `;

            document.body.appendChild(dd);

            const closeConvoDd = (evt) => {
              if (!dd.contains(evt.target) && !btn.contains(evt.target)) {
                dd.remove();
                btn.classList.remove('active');
                document.removeEventListener('click', closeConvoDd);
              }
            };
            setTimeout(() => document.addEventListener('click', closeConvoDd), 10);

            // 重命名
            dd.querySelector('.convo-rename')?.addEventListener('click', (ev) => {
              ev.stopPropagation();
              dd.remove();
              btn.classList.remove('active');

              const convoLink = panel.querySelector(`.agy-convo-item[data-convo-id="${convoId}"]`);
              const titleSpan = convoLink?.querySelector('.agy-convo-title');
              if (!titleSpan) return;

              const currentTitle = c.title;
              const input = document.createElement('input');
              input.type = 'text';
              input.className = 'agy-convo-rename-input';
              input.value = currentTitle;

              input.addEventListener('click', (ie) => {
                ie.stopPropagation();
                ie.preventDefault();
              });

              let isSaved = false;
              const commitRename = async () => {
                if (isSaved) return;
                isSaved = true;
                const newTitle = input.value.trim();
                if (newTitle && newTitle !== currentTitle) {
                  const as = getAgentService();
                  if (as?.updateConversationAnnotations) {
                    try {
                      await as.updateConversationAnnotations(c.id, { title: newTitle }, true);
                    } catch (err) {
                      console.warn('[agy-read] updateConversationAnnotations title error:', err);
                    }
                  }
                  const tsp = getTSP();
                  const s = tsp?.getState()?.summaries?.[c.id];
                  if (s) {
                    s.summary = newTitle;
                    s.title = newTitle;
                  }
                  showNotification('Conversation renamed');
                }
                renderArchivePanel(pm);
              };

              input.addEventListener('keydown', (ke) => {
                ke.stopPropagation();
                if (ke.key === 'Enter') {
                  ke.preventDefault();
                  commitRename();
                } else if (ke.key === 'Escape') {
                  ke.preventDefault();
                  isSaved = true;
                  renderArchivePanel(pm);
                }
              });

              input.addEventListener('blur', () => {
                commitRename();
              });

              titleSpan.replaceWith(input);
              input.focus();
              input.select();
            });

            // 标为未读 / 标为已读
            dd.querySelector('.convo-unread')?.addEventListener('click', async (ev) => {
              ev.stopPropagation();
              dd.remove();
              btn.classList.remove('active');
              const newUnread = !c.markedAsUnread;
              const as = getAgentService();
              if (as?.updateConversationAnnotations) {
                try {
                  await as.updateConversationAnnotations(c.id, { markedAsUnread: newUnread }, true);
                } catch (err) {
                  console.warn('[agy-read] updateConversationAnnotations unread error:', err);
                }
              }
              const tsp = getTSP();
              const s = tsp?.getState()?.summaries?.[c.id];
              if (s) {
                if (!s.annotations) s.annotations = {};
                s.annotations.markedAsUnread = newUnread;
              }
              if (newUnread) {
                showNotification('Marked as unread');
              }
              renderArchivePanel(pm);
            });

            // 删除对话
            dd.querySelector('.convo-delete')?.addEventListener('click', async (ev) => {
              ev.stopPropagation();
              dd.remove();
              btn.classList.remove('active');
              if (confirm(`Delete conversation "${c.title}"?`)) {
                const as = getAgentService();
                if (as?.deleteCascadeTrajectory) {
                  try {
                    await as.deleteCascadeTrajectory(c.id);
                  } catch (err) {
                    console.warn('[agy-read] deleteCascadeTrajectory error:', err);
                  }
                }
                const tsp = getTSP();
                const state = tsp?.getState();
                if (state?.summaries?.[c.id]) {
                  delete state.summaries[c.id];
                }
                showNotification('Conversation deleted');
                renderArchivePanel(pm);
              }
            });

            // 复制: 对话名称
            dd.querySelector('.copy-convo-name')?.addEventListener('click', async (ev) => {
              ev.stopPropagation();
              dd.remove();
              btn.classList.remove('active');
              await navigator.clipboard.writeText(c.title);
              showNotification(`Copied conversation name: "${c.title}"`);
            });

            // 复制: 对话 ID
            dd.querySelector('.copy-convo-id')?.addEventListener('click', async (ev) => {
              ev.stopPropagation();
              dd.remove();
              btn.classList.remove('active');
              await navigator.clipboard.writeText(c.id);
              showNotification(`Copied conversation ID: ${c.id}`);
            });

            // 复制: 项目名称
            dd.querySelector('.copy-project-name')?.addEventListener('click', async (ev) => {
              ev.stopPropagation();
              dd.remove();
              btn.classList.remove('active');
              await navigator.clipboard.writeText(p.project.name);
              showNotification(`Copied project name: "${p.project.name}"`);
            });

            // 打开: 对话文件夹
            dd.querySelector('.open-convo-folder')?.addEventListener('click', (ev) => {
              ev.stopPropagation();
              dd.remove();
              btn.classList.remove('active');
              const paths = getConvoFolderPaths(convoId, projectId);
              if (paths?.convoBrainUri) {
                openLocalFolder(paths.convoBrainUri, 'convo');
                showNotification('Opened conversation folder');
              } else {
                showNotification('Failed to resolve conversation folder');
              }
            });

            // 打开: 项目 / 分支文件夹
            dd.querySelector('.open-project-folder')?.addEventListener('click', (ev) => {
              ev.stopPropagation();
              dd.remove();
              btn.classList.remove('active');
              const paths = getConvoFolderPaths(convoId, projectId);
              if (paths?.targetProjectUri) {
                openLocalFolder(paths.targetProjectUri, 'project');
                showNotification(paths.isBranch ? 'Opened branch folder' : 'Opened project folder');
              } else {
                showNotification('Failed to resolve project folder');
              }
            });
          });
        });

        // 4. 绑定 +号新建对话按钮 [+]
        panel.querySelectorAll('.agy-quick-add-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const id = btn.getAttribute('data-project-id');
            isPanelOpen = false;
            renderArchivePanel(pm);
            if (id) {
              navigateTo(`/?section=${encodeURIComponent(id)}`);
            }
          });
        });

        // 5. 点击项目主条目：展开/折叠对话列表
        panel.querySelectorAll('.agy-archive-item-header').forEach(itemHeader => {
          itemHeader.addEventListener('click', (e) => {
            if (e.target.closest('.agy-archive-actions')) return;
            e.stopPropagation();
            const id = itemHeader.getAttribute('data-project-id');
            if (id) {
              if (expandedProjects.has(id)) {
                expandedProjects.delete(id);
              } else {
                expandedProjects.add(id);
              }
              renderArchivePanel(pm);
            }
          });
        });

        // 6. 点击对话项：关闭面板，纯路由导航（不触发页面重载，不触发还原）
        panel.querySelectorAll('.agy-convo-item').forEach(convoLink => {
          convoLink.addEventListener('click', (e) => {
            if (e.target.closest('.agy-convo-options-btn') || e.target.closest('.agy-convo-rename-input')) {
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            const href = convoLink.getAttribute('href');
            isPanelOpen = false;
            renderArchivePanel(pm);
            if (href) {
              navigateTo(href);
            }
          });
        });
      }

      function getCurrentProjectId() {
        const urlParams = new URLSearchParams(window.location.search);
        const fromUrl = urlParams.get('section');
        if (fromUrl) return fromUrl;

        const match = window.location.pathname.match(/\/c\/([a-f0-9-]+)/i);
        if (match) {
          const convoId = match[1];
          const tsp = getTSP();
          const s = tsp?.getState()?.summaries?.[convoId];
          if (s) {
            return s.projectId || s.trajectoryMetadata?.projectId;
          }
        }
        return null;
      }

      async function tryRestoreOnNewPrompt() {
        const pm = getPM();
        if (!pm) return;
        const currentProjectId = getCurrentProjectId();
        if (!currentProjectId || currentProjectId === 'outside-of-project') return;

        const projects = pm.projectsStateProvider?.getState() || [];
        const target = projects.find(p => p.project?.id === currentProjectId && p.project?.archived);
        if (target) {
          console.log(`[agy-read] New activity detected, restoring project: ${target.project.name}`);
          await pm.updateProject({ ...target.project, archived: false });
          showNotification(`Project [${target.project.name}] restored`);
          updateArchiveUI();
          if (isPanelOpen) renderArchivePanel(pm);
        }
      }

      // 监听新提问触发还原：Enter 键提交（非 Shift+Enter）
      promptKeydownHandler = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
          const ce = e.target?.closest?.('[contenteditable="true"]') || (e.target?.tagName === 'TEXTAREA' ? e.target : null);
          if (ce) {
            const text = (ce.innerText || ce.value || '').trim();
            if (text.length > 0) {
              tryRestoreOnNewPrompt();
              notifyNewPromptSubmitted?.();
            }
          }
        }
      };
      document.addEventListener('keydown', promptKeydownHandler, true);

      // 监听新提问触发还原：点击发送/提交按钮
      promptClickHandler = (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const label = (btn.getAttribute('aria-label') || btn.title || btn.innerText || '').toLowerCase();
        const tooltip = (btn.getAttribute('data-tooltip-id') || '').toLowerCase();
        if (
          label.includes('send') ||
          label.includes('submit') ||
          tooltip.includes('send') ||
          btn.querySelector('svg path[d*="M120-160v-640l760 320"]')
        ) {
          const ce = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');
          if (ce && (ce.innerText || ce.value || '').trim().length > 0) {
            tryRestoreOnNewPrompt();
            notifyNewPromptSubmitted?.();
          }
        }
      };
      document.addEventListener('click', promptClickHandler, true);

      // 点击外部自动关闭 panel
      docClickHandler = (e) => {
        if (isPanelOpen) {
          const panel = document.getElementById('agy-archive-panel');
          const headerBtn = document.getElementById('agy-archive-header-btn');
          if (panel && !panel.contains(e.target) && headerBtn && !headerBtn.contains(e.target)) {
            isPanelOpen = false;
            const pm = getPM();
            if (pm) renderArchivePanel(pm);
          }
        }
      };
      document.addEventListener('click', docClickHandler);

      // 实时更新与挂载 UI
      function updateArchiveUI() {
        const pm = getPM();
        if (!pm) return;

        const psp = pm.projectsStateProvider;
        const projects = psp?.getState() || [];
        const archived = projects.filter(p => p.project?.archived && p.project?.id !== 'outside-of-project');
        const archivedCount = archived.length;

        // 1. Projects 标题栏归档按钮
        const actionsContainer = document.querySelector('[data-testid="section-header"][data-title="Projects"] .flex.items-center.gap-1');
        if (actionsContainer) {
          let btn = document.getElementById('agy-archive-header-btn');
          if (!btn) {
            btn = document.createElement('button');
            btn.id = 'agy-archive-header-btn';
            btn.type = 'button';
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              e.preventDefault();
              isPanelOpen = !isPanelOpen;
              renderArchivePanel(pm);
              if (isPanelOpen) {
                refreshTrajectories().then(() => {
                  if (isPanelOpen) renderArchivePanel(pm);
                });
              }
            });
            actionsContainer.insertBefore(btn, actionsContainer.firstChild);
          }

          btn.className = 'inline-flex items-center font-medium transition-colors select-none outline-none cursor-pointer justify-center disabled:opacity-50 bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:text-foreground focus-visible:bg-secondary h-5 px-1.5 gap-1 shrink-0 rounded-md hover:bg-sidebar-secondary text-xs';
          btn.title = archivedCount > 0 ? `Archived Projects (${archivedCount})` : 'Archived Projects';
          btn.innerHTML = `
            <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="m480-256.16 146.15-146.15L584-444.46l-74 74v-178H450v178l-74-74-42.15 42.15L480-256.16ZM200-643.85v431.54q0 5.39 3.46 8.85t8.85 3.46h535.38q5.39 0 8.85-3.46t3.46-8.85v-431.54H200ZM215.39-140q-29.92 0-52.65-22.73T140-215.39v-464.38q0-12.85 4.12-24.5t12.35-21.5l56.15-67.92q9.85-12.85 24.62-19.58T268.46-820h422.3q16.46 0 31.42 6.73T747-793.69L803.54-725q8.23 9.85 12.35 21.69T820-678.61v463.22q0 29.92-22.73 52.65T744.61-140H215.39Zm.23-563.84H744l-43.62-51.92q-1.92-1.92-4.42-3.08T690.77-760H268.85q-2.69 0-5.19 1.15t-4.42 3.08l-43.62 51.92ZM480-421.92Z"/></svg>
            <span>Archive</span>
            ${archivedCount > 0 ? `<span class="agy-count-badge">${archivedCount}</span>` : ''}
          `;
        }

        // 2. 为当前可见的活跃项目卡片添加快捷归档小按钮
        const projectCards = document.querySelectorAll('button[data-project-card="true"]');
        projectCards.forEach(card => {
          const headerContainer = card.parentElement?.parentElement;
          const rightActions = headerContainer?.querySelector('.absolute.right-1');
          if (!rightActions) return;

          if (!rightActions.querySelector('.agy-quick-archive-btn')) {
            const projectNameSpan = card.querySelector('.truncate');
            const projectName = projectNameSpan?.innerText?.trim();
            const projectItem = projects.find(p => p.project?.name === projectName && !p.project?.archived);

            if (projectItem) {
              const quickBtn = document.createElement('button');
              quickBtn.className = 'inline-flex items-center font-medium transition-colors select-none outline-none cursor-pointer justify-center disabled:opacity-50 bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:text-foreground focus-visible:bg-secondary h-6 w-6 shrink-0 flex items-center justify-center rounded-md hover:bg-sidebar-secondary agy-quick-archive-btn';
              quickBtn.type = 'button';
              quickBtn.title = `Archive [${projectName}]`;
              quickBtn.setAttribute('aria-label', `Archive [${projectName}]`);
              quickBtn.innerHTML = `
                <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="m480-256.16 146.15-146.15L584-444.46l-74 74v-178H450v178l-74-74-42.15 42.15L480-256.16ZM200-643.85v431.54q0 5.39 3.46 8.85t8.85 3.46h535.38q5.39 0 8.85-3.46t3.46-8.85v-431.54H200ZM215.39-140q-29.92 0-52.65-22.73T140-215.39v-464.38q0-12.85 4.12-24.5t12.35-21.5l56.15-67.92q9.85-12.85 24.62-19.58T268.46-820h422.3q16.46 0 31.42 6.73T747-793.69L803.54-725q8.23 9.85 12.35 21.69T820-678.61v463.22q0 29.92-22.73 52.65T744.61-140H215.39Zm.23-563.84H744l-43.62-51.92q-1.92-1.92-4.42-3.08T690.77-760H268.85q-2.69 0-5.19 1.15t-4.42 3.08l-43.62 51.92ZM480-421.92Z"/></svg>
              `;
              quickBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                await pm.updateProject({ ...projectItem.project, archived: true });
                showNotification(`Archived [${projectName}]`);
                updateArchiveUI();
                if (isPanelOpen) renderArchivePanel(pm);
              });
              rightActions.insertBefore(quickBtn, rightActions.firstChild);
            }
          }
        });
      }

      // 监听变更与定时保活
      addInterval(updateArchiveUI, 700);
      windowPopstateHandler = updateArchiveUI;
      window.addEventListener('popstate', windowPopstateHandler);
      addTimeout(updateArchiveUI, 200);

      const pm = getPM();
      if (pm?.projectsStateProvider?.onDidChange) {
        pm.projectsStateProvider.onDidChange(() => {
          updateArchiveUI();
          if (isPanelOpen) renderArchivePanel(pm);
        });
      }

      // ==================== 7. 原生侧边栏未归档对话菜单增强 ====================
      function initNativeConvoMenuEnhancer() {
        if (nativeMenuPointerDownHandler) {
          document.removeEventListener('pointerdown', nativeMenuPointerDownHandler, true);
        }
        if (nativeMenuObserver) {
          nativeMenuObserver.disconnect();
        }

        nativeMenuPointerDownHandler = (e) => {
          const btn = e.target?.closest?.('button[aria-label="More options"]');
          if (btn) {
            const row = btn.closest('[data-testid="conversation-row-sidebar"]');
            if (row) {
              activeNativeConvoId = row.getAttribute('data-cascade-id');
            }
          }
        };
        document.addEventListener('pointerdown', nativeMenuPointerDownHandler, true);

        function checkAndEnhanceNativeMenu() {
          const menu = document.querySelector('[role="menu"]:not([data-agy-enhanced="true"])');
          if (!menu) return;

          // 确认是否是对话操作菜单（具有原生重命名或删除项）
          const hasConvoActions = menu.querySelector('[data-testid="conversation-delete-menu-item"]') ||
                                  menu.querySelector('[data-testid="conversation-rename-menu-item"]');
          if (!hasConvoActions) return;

          menu.setAttribute('data-agy-enhanced', 'true');

          // 获取目标对话 ID
          let convoId = activeNativeConvoId;
          if (!convoId) {
            const m = window.location.pathname.match(/\/c\/([a-f0-9-]+)/i);
            if (m) convoId = m[1];
          }
          if (!convoId) {
            const selectedRow = document.querySelector('[data-testid="conversation-row-sidebar"][data-selected="true"]');
            if (selectedRow) convoId = selectedRow.getAttribute('data-cascade-id');
          }

          const paths = getConvoFolderPaths(convoId);

          const divider = document.createElement('div');
          divider.setAttribute('role', 'separator');
          divider.className = 'h-px bg-border my-1 -mx-1 agy-native-enhanced';

          const itemConvo = document.createElement('div');
          itemConvo.setAttribute('role', 'menuitem');
          itemConvo.className = 'w-full px-2 py-1 text-left text-[13px] cursor-pointer outline-none transition-colors select-none flex items-center gap-1.5 rounded-md hover:bg-secondary hover:text-foreground text-secondary-foreground agy-native-enhanced';
          itemConvo.innerHTML = `
            <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="text-secondary-foreground shrink-0"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>
            <span>Open Conversation Folder</span>
          `;
          itemConvo.addEventListener('click', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            if (paths?.convoBrainUri) {
              openLocalFolder(paths.convoBrainUri, 'convo');
              showNotification('Opened conversation folder');
            } else {
              showNotification('Failed to resolve conversation folder');
            }
          });

          menu.appendChild(divider);
          menu.appendChild(itemConvo);

          // 仅当属于项目内部的对话时才添加“打开项目文件夹”；普通对话不展示该项
          if (paths?.isInsideProject) {
            const itemProject = document.createElement('div');
            itemProject.setAttribute('role', 'menuitem');
            itemProject.className = 'w-full px-2 py-1 text-left text-[13px] cursor-pointer outline-none transition-colors select-none flex items-center gap-1.5 rounded-md hover:bg-secondary hover:text-foreground text-secondary-foreground agy-native-enhanced';
            itemProject.innerHTML = `
              <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="text-secondary-foreground shrink-0"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>
              <span>Open Project Folder</span>
            `;
            itemProject.addEventListener('click', (ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
              if (paths?.targetProjectUri) {
                openLocalFolder(paths.targetProjectUri, 'project');
                showNotification(paths.isBranch ? 'Opened branch folder' : 'Opened project folder');
              } else {
                showNotification('Failed to resolve project folder');
              }
            });

            menu.appendChild(itemProject);
          }

          // 标记已读/未读切换项
          if (convoId && typeof window.__AGY_IS_UNREAD__ === 'function') {
            const isUnread = window.__AGY_IS_UNREAD__(convoId);
            const itemToggleRead = document.createElement('div');
            itemToggleRead.setAttribute('role', 'menuitem');
            itemToggleRead.className = 'w-full px-2 py-1 text-left text-[13px] cursor-pointer outline-none transition-colors select-none flex items-center gap-1.5 rounded-md hover:bg-secondary hover:text-foreground text-secondary-foreground agy-native-enhanced';
            itemToggleRead.innerHTML = `
              <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="text-secondary-foreground shrink-0"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
              <span>${isUnread ? 'Mark as Read' : 'Mark as Unread'}</span>
            `;
            itemToggleRead.addEventListener('click', (ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
              if (isUnread) {
                if (typeof window.__AGY_MARK_READ__ === 'function') {
                  window.__AGY_MARK_READ__(convoId);
                }
              } else {
                if (typeof window.__AGY_MARK_UNREAD__ === 'function') {
                  window.__AGY_MARK_UNREAD__(convoId);
                }
              }
            });
            menu.appendChild(itemToggleRead);
          }
        }

        function checkAndPositionNativeMenu() {
          const menu = document.querySelector('[role="menu"]:not([data-agy-positioned="true"])');
          if (!menu) return;

          if (lastContextMenuPos && (Date.now() - lastContextMenuPos.time < 1200)) {
            const savedPos = { ...lastContextMenuPos };
            lastContextMenuPos = null;
            menu.setAttribute('data-agy-positioned', 'true');

            const wrapper = menu.parentElement;
            if (wrapper) {
              const applyPosition = () => {
                const menuRect = menu.getBoundingClientRect();
                const menuWidth = menuRect.width || 195;
                const menuHeight = menuRect.height || 220;
                let posX = savedPos.x;
                let posY = savedPos.y;
                if (posX + menuWidth > window.innerWidth - 10) {
                  posX = Math.max(10, window.innerWidth - menuWidth - 10);
                }
                if (posY + menuHeight > window.innerHeight - 10) {
                  posY = Math.max(10, window.innerHeight - menuHeight - 10);
                }

                wrapper.style.setProperty('position', 'fixed', 'important');
                wrapper.style.setProperty('left', `${posX}px`, 'important');
                wrapper.style.setProperty('top', `${posY}px`, 'important');
                wrapper.style.setProperty('transform', 'none', 'important');
                wrapper.style.removeProperty('visibility');
              };

              wrapper.style.setProperty('visibility', 'hidden', 'important');
              applyPosition();
              setTimeout(applyPosition, 25);
              setTimeout(applyPosition, 60);
            }
          }
        }

        nativeMenuObserver = new MutationObserver(() => {
          checkAndPositionNativeMenu();
          checkAndEnhanceNativeMenu();
        });
        nativeMenuObserver.observe(document.body, { childList: true, subtree: true });
      }

      initNativeConvoMenuEnhancer();
    }

    // ==================== 8. 全局右键上下文菜单支持 (对话与项目) ====================
    function initContextMenuSupport() {
      if (contextMenuHandler) {
        document.removeEventListener('contextmenu', contextMenuHandler, true);
      }

      contextMenuHandler = (e) => {
        // 1. 原生侧边栏对话行
        const convoRow = e.target?.closest?.('[data-testid="conversation-row-sidebar"]');
        if (convoRow) {
          const btn = convoRow.querySelector('button[aria-label="More options"]');
          if (btn) {
            e.preventDefault();
            e.stopPropagation();
            lastContextMenuPos = { x: e.clientX, y: e.clientY, time: Date.now() };
            activeNativeConvoId = convoRow.getAttribute('data-cascade-id');
            btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
            btn.click();
            return;
          }
        }

        // 2. 原生侧边栏项目卡片
        const projectCard = e.target?.closest?.('button[data-project-card="true"], .group\\/header');
        if (projectCard) {
          const container = projectCard.closest('.group\\/header') || projectCard.parentElement?.parentElement;
          const btn = container?.querySelector('button[aria-label="Project options"]');
          if (btn) {
            e.preventDefault();
            e.stopPropagation();
            lastContextMenuPos = { x: e.clientX, y: e.clientY, time: Date.now() };
            btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
            btn.click();
            return;
          }
        }

        // 3. 归档面板内的项目头部
        const archiveProject = e.target?.closest?.('.agy-archive-item-header');
        if (archiveProject) {
          const btn = archiveProject.querySelector('.agy-quick-options-btn');
          if (btn) {
            e.preventDefault();
            e.stopPropagation();
            lastContextMenuPos = { x: e.clientX, y: e.clientY, time: Date.now() };
            btn.click();
            return;
          }
        }

        // 4. 归档面板内的对话项
        const archiveConvo = e.target?.closest?.('.agy-convo-item');
        if (archiveConvo) {
          const btn = archiveConvo.querySelector('.agy-convo-options-btn');
          if (btn) {
            e.preventDefault();
            e.stopPropagation();
            lastContextMenuPos = { x: e.clientX, y: e.clientY, time: Date.now() };
            btn.click();
            return;
          }
        }
      };

      document.addEventListener('contextmenu', contextMenuHandler, true);
    }

    // ==================== 9. 对话阅读位置记忆与恢复 (Scroll Position Persistence) ====================
    function initConversationScrollPersistence() {
      if (!USER_CONFIG.ENABLE_SCROLL_POSITION_PERSISTENCE) return;

      const STORAGE_KEY = 'agy_convo_scroll_positions';
      const MAX_STORED_CONVERSATIONS = 50;
      const convoPositionsMap = new Map();

      function pruneAndLimitPositions() {
        // 1. 清除所有在底部的记录
        for (const [id, val] of convoPositionsMap.entries()) {
          if (!val || val.isBottom || typeof val.scrollTop !== 'number' || val.scrollTop <= 5) {
            convoPositionsMap.delete(id);
          }
        }
        // 2. 超出最大容量时，按时间戳从旧到新淘汰
        if (convoPositionsMap.size > MAX_STORED_CONVERSATIONS) {
          const sorted = Array.from(convoPositionsMap.entries()).sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
          const removeCount = sorted.length - MAX_STORED_CONVERSATIONS;
          for (let i = 0; i < removeCount; i++) {
            convoPositionsMap.delete(sorted[i][0]);
          }
        }
      }

      function loadPositions() {
        try {
          let data = null;
          // 1. 优先读取跨端口注入的持久化全局数据（抵御软件重启随机端口）
          if (window.__AGY_STORED_SCROLL_POSITIONS__ && typeof window.__AGY_STORED_SCROLL_POSITIONS__ === 'object') {
            data = window.__AGY_STORED_SCROLL_POSITIONS__;
          }
          // 2. 油猴脚本环境 GM_getValue
          if (!data && typeof GM_getValue === 'function') {
            const gmRaw = GM_getValue(STORAGE_KEY, null);
            if (gmRaw) {
              try { data = typeof gmRaw === 'string' ? JSON.parse(gmRaw) : gmRaw; } catch (e) {}
            }
          }
          // 3. 当前端口 localStorage / sessionStorage 兜底
          if (!data) {
            const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
            if (raw) {
              try { data = JSON.parse(raw); } catch (e) {}
            }
          }

          if (data && typeof data === 'object') {
            for (const [id, val] of Object.entries(data)) {
              if (val && !val.isBottom && typeof val.scrollTop === 'number' && val.scrollTop > 5) {
                convoPositionsMap.set(id, val);
              }
            }
          }
        } catch (e) {}
      }

      function savePositions() {
        try {
          pruneAndLimitPositions();

          const obj = {};
          for (const [id, val] of convoPositionsMap.entries()) {
            obj[id] = val;
          }
          const str = JSON.stringify(obj);

          try { localStorage.setItem(STORAGE_KEY, str); } catch (e) {}
          try { sessionStorage.setItem(STORAGE_KEY, str); } catch (e) {}

          if (typeof GM_setValue === 'function') {
            try { GM_setValue(STORAGE_KEY, str); } catch (e) {}
          }

          // 通过 CDP 控制台信号通知后台 Node.js 守护进程持久化到本地固定 JSON 文件
          console.log('[AGY_PERSIST_SCROLL]' + str);
        } catch (e) {}
      }

      loadPositions();

      function getContainerConvoId(c) {
        if (!c) return null;
        try {
          const k = Object.keys(c).find(key => key.startsWith('__reactFiber$'));
          let cur = c[k];
          while (cur) {
            if (cur.memoizedProps?.cascadeId) return cur.memoizedProps.cascadeId;
            if (cur.memoizedProps?.conversationId) return cur.memoizedProps.conversationId;
            cur = cur.return;
          }
        } catch (e) {}
        return null;
      }

      function getCurrentUrlConvoId() {
        const match = window.location.pathname.match(/\/c\/([a-f0-9-]+)/i);
        if (match) return match[1];
        const row = document.querySelector('[data-testid="conversation-row-sidebar"][data-selected="true"]');
        if (row) {
          const id = row.getAttribute('data-cascade-id');
          if (id) return id;
        }
        return null;
      }

      let activeRestoringConvoId = null;
      let activeRestoringTarget = null;
      let restorationObserver = null;
      let observedContainer = null;
      let restorationTimeoutId = null;

      function ensureObserver(container) {
        if (!container || observedContainer === container) return;
        if (restorationObserver) {
          try { restorationObserver.disconnect(); } catch (e) {}
          restorationObserver = null;
        }
        try {
          restorationObserver = new MutationObserver(() => {
            if (activeRestoringConvoId) {
              applyRestoration();
            }
          });
          restorationObserver.observe(container, { childList: true, subtree: true });
          observedContainer = container;
        } catch (e) {}
      }

      function endRestoration(reason) {
        if (activeRestoringConvoId) {
          activeRestoringConvoId = null;
          activeRestoringTarget = null;
          observedContainer = null;
          if (restorationObserver) {
            try { restorationObserver.disconnect(); } catch (e) {}
            restorationObserver = null;
          }
          if (restorationTimeoutId) {
            clearTimeout(restorationTimeoutId);
            restorationTimeoutId = null;
          }
        }
      }

      // 用户交互状态追踪：只有真实用户交互引起的滚动才被允许更新记忆位置！
      let isUserInteracting = false;
      let userInteractionTimer = null;
      function markUserInteracting() {
        isUserInteracting = true;
        if (userInteractionTimer) clearTimeout(userInteractionTimer);
        userInteractionTimer = setTimeout(() => {
          isUserInteracting = false;
        }, 500);
      }

      let lastPromptSubmitTime = 0;

      function recordConvoPosition(targetConvoId) {
        // 恢复进行中或提交新提问 2 秒内，坚决不保存位置，防止污染
        if (activeRestoringConvoId || Date.now() - lastPromptSubmitTime < 2000) {
          return;
        }

        const container = getChatScrollContainer();
        if (!container || container.clientHeight <= 0) return;

        const containerId = getContainerConvoId(container);
        const convoId = targetConvoId || containerId || getCurrentUrlConvoId();
        if (!convoId) return;

        // 若传入目标 ID，但容器所属对话与之不符（如处于路由过渡期），不写入以防数据污染
        if (targetConvoId && containerId && targetConvoId !== containerId) {
          return;
        }

        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const isBottom = (scrollHeight - scrollTop - clientHeight) <= 45;

        // 关键逻辑：如果用户当前处于底部或顶部空白，直接从存储中删除该记录！
        if (isBottom || scrollTop <= 5) {
          if (convoPositionsMap.has(convoId)) {
            convoPositionsMap.delete(convoId);
            savePositions();
          }
          return;
        }

        convoPositionsMap.set(convoId, {
          scrollTop: Math.round(scrollTop),
          scrollHeight: Math.round(scrollHeight),
          clientHeight: Math.round(clientHeight),
          isBottom: false,
          timestamp: Date.now()
        });
        savePositions();
      }

      let saveTimer = null;
      function scheduleSavePosition(convoId) {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          recordConvoPosition(convoId);
        }, 80);
      }

      function syncFiberAutoScrollDisabled(container) {
        if (!container) return;
        try {
          const k = Object.keys(container).find(key => key.startsWith('__reactFiber$'));
          let cur = container[k];
          while (cur) {
            let hook = cur.memoizedState;
            while (hook) {
              if (hook.memoizedState?.current === container) {
                // hook.next.next 是 shouldAutoScroll ref (h)
                const hRef = hook.next?.next?.memoizedState;
                if (hRef && typeof hRef.current === 'boolean') {
                  hRef.current = false;
                }
                // hook.next.next.next.next 是 lastScrollTop ref (l)
                const lRef = hook.next?.next?.next?.next?.memoizedState;
                if (lRef && typeof lRef.current === 'number') {
                  lRef.current = container.scrollTop;
                }
                return;
              }
              hook = hook.next;
            }
            cur = cur.return;
          }
        } catch (e) {}
      }

      function applyRestoration() {
        if (!activeRestoringConvoId || !activeRestoringTarget) return;

        const container = getChatScrollContainer();
        if (!container || container.clientHeight <= 0) return;

        const containerId = getContainerConvoId(container);
        if (containerId && containerId !== activeRestoringConvoId) {
          return;
        }

        ensureObserver(container);
        syncFiberAutoScrollDisabled(container);

        const desiredScrollTop = activeRestoringTarget.scrollTop;
        if (typeof desiredScrollTop !== 'number' || isNaN(desiredScrollTop)) return;

        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);

        // 如果内容高度已足够滚到目标位置
        if (maxScroll >= desiredScrollTop - 20) {
          const clampedTop = Math.max(0, Math.min(desiredScrollTop, maxScroll));
          if (Math.abs(container.scrollTop - clampedTop) > 1) {
            container.scrollTop = clampedTop;
          }
          syncFiberAutoScrollDisabled(container);
        } else {
          // 内容仍在异步加载追加中，暂时推到当前可滚动的底部，但不结束恢复
          if (maxScroll > 0 && container.scrollTop < maxScroll) {
            container.scrollTop = maxScroll;
          }
        }
      }

      function startRestoration(convoId, saved) {
        if (!saved || saved.isBottom || saved.scrollTop <= 5) {
          endRestoration('not eligible');
          return;
        }

        activeRestoringConvoId = convoId;
        activeRestoringTarget = saved;

        const container = getChatScrollContainer();
        if (container) {
          ensureObserver(container);
          syncFiberAutoScrollDisabled(container);
        }

        applyRestoration();

        const checkDelays = [15, 40, 80, 140, 220, 340, 500, 750, 1100, 1600, 2300, 3200, 4500];
        checkDelays.forEach(ms => {
          addTimeout(() => {
            if (activeRestoringConvoId === convoId) {
              applyRestoration();
            }
          }, ms);
        });

        if (restorationTimeoutId) clearTimeout(restorationTimeoutId);
        restorationTimeoutId = setTimeout(() => {
          endRestoration('max timeout (5s)');
        }, 5000);
      }

      // 拦截原生 scrollTo：阻止在恢复期间由于 ResizeObserver 强制滑到底部
      originalElementScrollTo = Element.prototype.scrollTo;
      Element.prototype.scrollTo = function (...args) {
        const container = getChatScrollContainer();
        if (this === container && activeRestoringConvoId) {
          const options = typeof args[0] === 'object' ? args[0] : { top: args[0], left: args[1] };
          if (options && typeof options.top === 'number') {
            syncFiberAutoScrollDisabled(this);
            if (activeRestoringTarget) {
              applyRestoration();
            }
            return; // 拦截阻止该次原生滚底调用
          }
        }
        return originalElementScrollTo.apply(this, args);
      };

      // 监听全局滚动捕获：关键守护——只有用户真实交互导致的滚动才记录！
      scrollCaptureHandler = (e) => {
        const container = getChatScrollContainer();
        if (e.target === container) {
          if (!isUserInteracting || activeRestoringConvoId) {
            // 系统自动滚动、重绘布局变化或处于恢复期间，绝对不保存！
            return;
          }
          const convoId = getContainerConvoId(container) || getCurrentUrlConvoId();
          if (convoId) {
            scheduleSavePosition(convoId);
          }
        }
      };
      window.addEventListener('scroll', scrollCaptureHandler, true);

      // 用户真实交互监听（精准判定：滚轮、容器拖动、方向按键、触控）
      userInteractionHandler = (e) => {
        const container = getChatScrollContainer();
        if (!container) return;

        if (e.type === 'wheel') {
          // 滚轮只有在聊天容器内滚动才算真实交互
          if (!container.contains(e.target)) return;
        } else if (e.type === 'mousedown' || e.type === 'pointerdown') {
          // 点击排除输入框、按钮、链接等，防止侧边栏点击或输入触发误判
          if (e.target.closest('textarea, input, button, a, [contenteditable="true"]')) return;
          if (!container.contains(e.target) && e.target !== container) return;
        } else if (e.type === 'keydown') {
          const navKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Space'];
          if (!navKeys.includes(e.key) && !navKeys.includes(e.code)) return;
          if (e.target.closest('textarea, input, [contenteditable="true"]')) return;
        } else if (e.type === 'touchmove') {
          if (!container.contains(e.target)) return;
        } else {
          return;
        }

        markUserInteracting();
        if (activeRestoringConvoId) {
          endRestoration('user interaction event');
        }
      };
      ['wheel', 'pointerdown', 'mousedown', 'keydown', 'touchmove'].forEach(type => {
        window.addEventListener(type, userInteractionHandler, { capture: true, passive: true });
      });

      // 路由与对话切换监测
      let currentActiveConvoId = null;

      function handleConvoSwitch() {
        const container = getChatScrollContainer();
        const containerConvoId = getContainerConvoId(container);
        const urlConvoId = getCurrentUrlConvoId();

        const effectiveConvoId = containerConvoId || urlConvoId;
        if (!effectiveConvoId) return;

        if (effectiveConvoId !== currentActiveConvoId) {
          // 仅在当前确实是用户在阅读该对话时才保存
          if (currentActiveConvoId && isUserInteracting) {
            recordConvoPosition(currentActiveConvoId);
          }
          currentActiveConvoId = effectiveConvoId;

          const saved = convoPositionsMap.get(effectiveConvoId);
          if (saved && !saved.isBottom && saved.scrollTop > 5) {
            console.log(`[agy-read] 检测到切入对话 [${effectiveConvoId}]，准备恢复阅读位置 (scrollTop: ${saved.scrollTop}px)`);
            startRestoration(effectiveConvoId, saved);
          } else {
            endRestoration('new convo or at bottom');
          }
        }
      }

      // 初始化一次
      handleConvoSwitch();

      originalPushState = history.pushState;
      history.pushState = function (...args) {
        if (currentActiveConvoId && isUserInteracting) {
          recordConvoPosition(currentActiveConvoId);
        }
        const res = originalPushState.apply(this, args);
        handleConvoSwitch();
        return res;
      };

      originalReplaceState = history.replaceState;
      history.replaceState = function (...args) {
        if (currentActiveConvoId && isUserInteracting) {
          recordConvoPosition(currentActiveConvoId);
        }
        const res = originalReplaceState.apply(this, args);
        handleConvoSwitch();
        return res;
      };

      window.addEventListener('popstate', handleConvoSwitch);
      addInterval(handleConvoSwitch, 80);

      // 新提问提交通知钩子：提交新提问代表用户在底部追问，直接删除记录
      notifyNewPromptSubmitted = () => {
        lastPromptSubmitTime = Date.now();
        const container = getChatScrollContainer();
        const convoId = getContainerConvoId(container) || getCurrentUrlConvoId();
        if (convoId) {
          if (convoPositionsMap.has(convoId)) {
            convoPositionsMap.delete(convoId);
            savePositions();
          }
          endRestoration('new prompt submitted');
          notifyPromptSubmittedForUnread?.(convoId);
        }
      };

      // 软件窗口关闭/刷新时，确保当前正在阅读的对话位置立即落盘
      const handleWindowUnload = () => {
        if (currentActiveConvoId && !activeRestoringConvoId) {
          recordConvoPosition(currentActiveConvoId);
        }
      };
      window.addEventListener('beforeunload', handleWindowUnload);
      window.addEventListener('pagehide', handleWindowUnload);
    }

    // ==================== 10. 智能已读/未读状态追踪与提醒 (Smart Unread Tracker) ====================
    function initSmartUnreadTracker() {
      if (!USER_CONFIG.ENABLE_SMART_UNREAD) return;

      const STORAGE_KEY = 'agy_convo_unread_states';
      const unreadConvosMap = new Map();

      function loadUnreadStates() {
        try {
          let data = null;
          // 1. 优先读取跨端口/守护进程注入的持久化全局数据
          if (window.__AGY_STORED_UNREAD_STATES__ && typeof window.__AGY_STORED_UNREAD_STATES__ === 'object') {
            data = window.__AGY_STORED_UNREAD_STATES__;
          }
          // 2. 油猴环境 GM_getValue
          if (!data && typeof GM_getValue === 'function') {
            const gmRaw = GM_getValue(STORAGE_KEY, null);
            if (gmRaw) {
              try { data = typeof gmRaw === 'string' ? JSON.parse(gmRaw) : gmRaw; } catch (e) {}
            }
          }
          // 3. localStorage / sessionStorage
          if (!data) {
            const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
            if (raw) {
              try { data = JSON.parse(raw); } catch (e) {}
            }
          }

          if (data && typeof data === 'object') {
            for (const [id, val] of Object.entries(data)) {
              if (val) {
                unreadConvosMap.set(id, val);
              }
            }
          }
        } catch (e) {}
      }

      function saveUnreadStates() {
        try {
          const obj = {};
          for (const [id, val] of unreadConvosMap.entries()) {
            obj[id] = val;
          }
          const str = JSON.stringify(obj);

          try { localStorage.setItem(STORAGE_KEY, str); } catch (e) {}
          try { sessionStorage.setItem(STORAGE_KEY, str); } catch (e) {}

          if (typeof GM_setValue === 'function') {
            try { GM_setValue(STORAGE_KEY, str); } catch (e) {}
          }

          // 通过 CDP 控制台信号通知后台守护进程写入固定本地 JSON 文件
          console.log('[AGY_PERSIST_UNREAD]' + str);
        } catch (e) {}
      }

      loadUnreadStates();

      function getContainerConvoId(c) {
        if (!c) return null;
        try {
          const k = Object.keys(c).find(key => key.startsWith('__reactFiber$'));
          let cur = c[k];
          while (cur) {
            if (cur.memoizedProps?.cascadeId) return cur.memoizedProps.cascadeId;
            if (cur.memoizedProps?.conversationId) return cur.memoizedProps.conversationId;
            cur = cur.return;
          }
        } catch (e) {}
        return null;
      }

      function getCurrentUrlConvoId() {
        const match = window.location.pathname.match(/\/c\/([a-f0-9-]+)/i);
        if (match) return match[1];
        const row = document.querySelector('[data-testid="conversation-row-sidebar"][data-selected="true"]');
        if (row) {
          const id = row.getAttribute('data-cascade-id');
          if (id) return id;
        }
        return null;
      }

      function getTurnRealHeight(el) {
        if (!el) return { contentHeight: 0, agentHeight: 0 };
        const inner = el.firstElementChild;
        const contentHeight = (inner && inner.offsetHeight > 0) ? inner.offsetHeight : el.offsetHeight;
        const agentArticle = el.querySelector('[role="article"][aria-label*="response"], [role="article"][aria-label*="Agent"], [role="article"]:not([aria-label*="User message"])');
        const agentHeight = agentArticle ? agentArticle.offsetHeight : contentHeight;
        return { contentHeight, agentHeight };
      }

      function checkIsLongText() {
        const container = getChatScrollContainer();
        if (!container) return false;

        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
        // 1. 如果页面总可滚动距离极小（不足 100px），绝对属于短文
        if (maxScroll <= USER_CONFIG.BOTTOM_THRESHOLD) {
          return false;
        }

        // 2. 获取最后一轮问答实际内容高度
        const turnContainer = document.querySelector('.relative.flex.flex-col.gap-y-3') ||
                              document.querySelector('.flex.flex-col.gap-y-3');
        if (turnContainer && turnContainer.children.length > 0) {
          const lastTurnEl = turnContainer.children[turnContainer.children.length - 1];
          if (lastTurnEl) {
            const { contentHeight, agentHeight } = getTurnRealHeight(lastTurnEl);
            const viewHeight = container.clientHeight;
            // 判定长文的标准：
            // 最新一轮实际问答内容高度达到视口的 80% (USER_CONFIG.LONG_TEXT_RATIO)，
            // 且 AI 自身回复高度也超过半屏 (50%)。
            // 只要 AI 自身回复短于半屏（如简短应答、两句话、问候），一律视为短文！
            return (contentHeight >= viewHeight * USER_CONFIG.LONG_TEXT_RATIO) &&
                   (agentHeight >= viewHeight * 0.5);
          }
        }

        const { pages } = getPagesInfo();
        if (!pages || pages.length === 0) {
          return maxScroll > container.clientHeight * 0.8;
        }
        const lastTurn = pages[pages.length - 1];
        if (!lastTurn || typeof lastTurn.height !== 'number') return false;
        return lastTurn.height >= (container.clientHeight * USER_CONFIG.LONG_TEXT_RATIO);
      }

      function markConvoAsUnread(convoId, reason) {
        if (!convoId) return;
        if (!unreadConvosMap.has(convoId)) {
          unreadConvosMap.set(convoId, { unread: true, timestamp: Date.now() });
          saveUnreadStates();
          console.log(`[agy-read] 对话 [${convoId}] 标记为未读 (${reason})`);
          syncSidebarIndicators();
        }
        const container = getChatScrollContainer();
        const effectiveConvoId = (container ? getContainerConvoId(container) : null) || getCurrentUrlConvoId();
        if (effectiveConvoId === convoId) {
          setupReadingSession(convoId);
        }
      }

      function markConvoAsRead(convoId, reason) {
        if (!convoId) return;
        if (unreadConvosMap.has(convoId)) {
          unreadConvosMap.delete(convoId);
          saveUnreadStates();
          console.log(`[agy-read] 对话 [${convoId}] 满足已读判定条件，已标记为已读 (${reason})`);
          cleanupReadingSession();
          syncSidebarIndicators();
        }
      }

      // 阅读物理状态机
      let currentReadingConvoId = null;
      let hasLeftBottom = false;
      let longTextBottomTimer = null;
      let shortTextStayTimer = null;
      let readingSessionType = null; // 'long' | 'short'

      function cleanupReadingSession() {
        if (longTextBottomTimer) {
          clearTimeout(longTextBottomTimer);
          longTextBottomTimer = null;
        }
        if (shortTextStayTimer) {
          clearTimeout(shortTextStayTimer);
          shortTextStayTimer = null;
        }
        currentReadingConvoId = null;
        hasLeftBottom = false;
        readingSessionType = null;
      }

      function setupReadingSession(convoId) {
        if (!convoId || !unreadConvosMap.has(convoId)) {
          cleanupReadingSession();
          return;
        }

        // 同一对话阅读期间，保留用户已离开底部的状态，切勿反复重置
        if (currentReadingConvoId === convoId) {
          return;
        }

        cleanupReadingSession();
        currentReadingConvoId = convoId;
        const container = getChatScrollContainer();
        if (!container) return;

        const isLong = checkIsLongText();
        readingSessionType = isLong ? 'long' : 'short';
        console.log(`[agy-read] 对话 [${convoId}] 处于未读状态，启动阅读状态追踪 (类型: ${isLong ? '长文' : '短文'})`);

        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
        const distFromBottom = maxScroll - container.scrollTop;
        const leaveThreshold = Math.min(USER_CONFIG.LEAVE_BOTTOM_THRESHOLD, Math.max(30, maxScroll * 0.5));
        // 如果一进来就已经在较上面（例如位置记忆恢复在顶部/中间），判定已离开底部
        hasLeftBottom = distFromBottom > leaveThreshold;

        if (!isLong) {
          // 短文条件二：停留满 10s 即已读
          shortTextStayTimer = setTimeout(() => {
            if (currentReadingConvoId === convoId && unreadConvosMap.has(convoId)) {
              markConvoAsRead(convoId, '短文停留满 10 秒');
            }
          }, USER_CONFIG.SHORT_TEXT_READ_DURATION_MS);
        }
      }

      function handleReadingScroll() {
        const container = getChatScrollContainer();
        if (!container) return;

        const effectiveConvoId = getContainerConvoId(container) || getCurrentUrlConvoId();
        if (!effectiveConvoId || !unreadConvosMap.has(effectiveConvoId)) {
          if (currentReadingConvoId) cleanupReadingSession();
          return;
        }

        if (currentReadingConvoId !== effectiveConvoId) {
          setupReadingSession(effectiveConvoId);
        }

        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
        const distFromBottom = maxScroll - container.scrollTop;
        const isAtBottom = maxScroll <= 20 || distFromBottom <= USER_CONFIG.BOTTOM_THRESHOLD;
        const leaveThreshold = Math.min(USER_CONFIG.LEAVE_BOTTOM_THRESHOLD, Math.max(30, maxScroll * 0.5));
        const hasScrolledUp = distFromBottom > leaveThreshold;

        if (hasScrolledUp) {
          // 用户向上大幅翻阅离开底部
          if (!hasLeftBottom) {
            hasLeftBottom = true;
            console.log(`[agy-read] 对话 [${effectiveConvoId}] 检测到离开底部 (距底 ${Math.round(distFromBottom)}px)，等待二次触底`);
          }
          // 用户大幅往上翻阅时才清除 5s 底部倒计时
          if (distFromBottom > leaveThreshold + 120) {
            if (longTextBottomTimer) {
              clearTimeout(longTextBottomTimer);
              longTextBottomTimer = null;
            }
          }
        } else if (isAtBottom && hasLeftBottom) {
          // 二次触底达成！
          const isLong = readingSessionType ? (readingSessionType === 'long') : checkIsLongText();
          if (!isLong) {
            // 短文：二次触底立即满足已读条件，即刻标记为已读！
            console.log(`[agy-read] 对话 [${effectiveConvoId}] 短文二次触底达成，立即标记为已读`);
            markConvoAsRead(effectiveConvoId, '短文二次触底');
          } else {
            // 长文：二次触底 + 底部平稳停留 5 秒同时满足
            if (!longTextBottomTimer) {
              console.log(`[agy-read] 对话 [${effectiveConvoId}] 长文二次触底达成，启动底部 5 秒倒计时`);
              longTextBottomTimer = setTimeout(() => {
                if (currentReadingConvoId === effectiveConvoId && unreadConvosMap.has(effectiveConvoId)) {
                  console.log(`[agy-read] 对话 [${effectiveConvoId}] 长文底部停留满 5 秒，标记为已读`);
                  markConvoAsRead(effectiveConvoId, '长文二次触底并在底部平稳停留满 5 秒');
                }
              }, USER_CONFIG.LONG_TEXT_BOTTOM_DURATION_MS);
            }
          }
        }
      }

      // 监听全局滚动捕获与鼠标滚轮事件
      unreadScrollHandler = (e) => {
        const container = getChatScrollContainer();
        if (!container) return;
        if (e.target === container || e.target === document || container.contains(e.target)) {
          handleReadingScroll();
        }
      };
      window.addEventListener('scroll', unreadScrollHandler, true);

      unreadWheelHandler = (e) => {
        const container = getChatScrollContainer();
        if (!container) return;
        if (container.contains(e.target) || e.target === container) {
          setTimeout(handleReadingScroll, 16);
        }
      };
      window.addEventListener('wheel', unreadWheelHandler, { capture: true, passive: true });

      // 周期性检测触底与停留状态（弥补平滑滚动与动态内容渲染）
      addInterval(handleReadingScroll, 200);

      // 对话切换监测
      let trackedConvoId = null;
      function checkConvoSwitchForUnread() {
        const container = getChatScrollContainer();
        const effectiveConvoId = (container ? getContainerConvoId(container) : null) || getCurrentUrlConvoId();
        if (effectiveConvoId && effectiveConvoId !== trackedConvoId) {
          trackedConvoId = effectiveConvoId;
          if (unreadConvosMap.has(effectiveConvoId)) {
            setupReadingSession(effectiveConvoId);
          } else {
            cleanupReadingSession();
          }
        }
      }
      addInterval(checkConvoSwitchForUnread, 150);

      // 精准监听各对话生成状态与完成事件（按对话 ID 独立追踪，彻底杜绝切换对话误标与双重未读）
      const activelyGeneratingConvos = new Map(); // convoId -> { startTime, lastSpinningTime, confirmedGenerated, isForeground }
      const promptSubmittedConvos = new Map(); // convoId -> timestamp

      // 接收主输入框发送事件（Enter 键或点击 Send 按钮）
      notifyPromptSubmittedForUnread = (convoId) => {
        if (!convoId) return;
        const now = Date.now();
        promptSubmittedConvos.set(convoId, now);
        if (!activelyGeneratingConvos.has(convoId)) {
          activelyGeneratingConvos.set(convoId, {
            startTime: now,
            lastSpinningTime: now,
            confirmedGenerated: false,
            isForeground: true
          });
        }
      };

      // 仅获取主聊天区/输入框内的停止按钮，绝不匹配侧边栏行内的按钮！
      function getActiveChatStopButton() {
        const btns = document.querySelectorAll('button[data-testid="stop-button"], button[aria-label*="Stop execution"], button[aria-label*="Stop Task"]');
        for (const btn of btns) {
          if (!btn.closest('[data-testid="conversation-row-sidebar"]')) {
            return btn;
          }
        }
        return null;
      }

      function checkGeneratingAndUnreadState() {
        const rows = document.querySelectorAll('[data-testid="conversation-row-sidebar"]');
        const container = getChatScrollContainer();
        const activeConvoId = (container ? getContainerConvoId(container) : null) || getCurrentUrlConvoId();
        const activeChatStopBtn = getActiveChatStopButton();
        const now = Date.now();

        // 收集本轮侧边栏中各对话的专属状态
        const rowGeneratingIds = new Set();
        const rowNativeDotIds = new Set();

        rows.forEach(row => {
          const id = row.getAttribute('data-cascade-id');
          if (!id) return;

          const hasSpinner = !!row.querySelector('[data-testid="status-loading-spinner"]');
          const hasStopBtn = !!row.querySelector('button[aria-label*="Stop execution"], button[aria-label*="Stop Task"]');
          if (hasSpinner || hasStopBtn) {
            rowGeneratingIds.add(id);
          }

          const hasNativeDot = !!row.querySelector('[data-testid="status-unread-dot"]');
          if (hasNativeDot) {
            rowNativeDotIds.add(id);
          }
        });

        // 1. 处理后台原生完成未读点：直接同步为未读（仅针对非当前正在阅读的后台对话）
        rowNativeDotIds.forEach(id => {
          if (id !== activeConvoId) {
            activelyGeneratingConvos.delete(id);
            promptSubmittedConvos.delete(id);
            if (!unreadConvosMap.has(id)) {
              markConvoAsUnread(id, '捕获到原生完成未读指示点');
            }
          }
        });

        // 2. 检查前台活动对话的生成状态
        if (activeConvoId) {
          const isActiveGenerating = rowGeneratingIds.has(activeConvoId) || !!activeChatStopBtn;
          if (isActiveGenerating) {
            promptSubmittedConvos.delete(activeConvoId);
            let record = activelyGeneratingConvos.get(activeConvoId);
            if (!record) {
              activelyGeneratingConvos.set(activeConvoId, {
                startTime: now,
                lastSpinningTime: now,
                confirmedGenerated: true,
                isForeground: true
              });
            } else {
              record.lastSpinningTime = now;
              record.confirmedGenerated = true;
              record.isForeground = true;
            }
          }
        }

        // 3. 检查侧边栏中所有处于生成中的对话（包含前台与后台）
        rowGeneratingIds.forEach(id => {
          promptSubmittedConvos.delete(id);
          let record = activelyGeneratingConvos.get(id);
          if (!record) {
            activelyGeneratingConvos.set(id, {
              startTime: now,
              lastSpinningTime: now,
              confirmedGenerated: true,
              isForeground: (id === activeConvoId)
            });
          } else {
            record.lastSpinningTime = now;
            record.confirmedGenerated = true;
          }
        });

        // 4. 清理超时的待确认提交状态（超过 5 秒无响应放弃追踪，避免死锁）
        for (const [id, submitTime] of promptSubmittedConvos.entries()) {
          if (now - submitTime > 5000) {
            promptSubmittedConvos.delete(id);
            const rec = activelyGeneratingConvos.get(id);
            if (rec && !rec.confirmedGenerated) {
              activelyGeneratingConvos.delete(id);
            }
          }
        }

        // 5. 遍历生成追踪集合，判定生成完成事件
        for (const [genId, record] of Array.from(activelyGeneratingConvos.entries())) {
          // 如果该对话处于刚提交的等待期内（未满 2.5 秒且尚未渲染出 spinner），保持等待
          const isPending = promptSubmittedConvos.has(genId) && (now - promptSubmittedConvos.get(genId) < 2500);
          if (isPending) {
            continue;
          }

          if (genId === activeConvoId) {
            // 当前在前台的对话：必须在主界面 stopBtn 消失 且 侧边栏不再有 spinner 时判定前台完成
            const isStillGenerating = !!activeChatStopBtn || rowGeneratingIds.has(genId);
            if (!isStillGenerating) {
              activelyGeneratingConvos.delete(genId);
              promptSubmittedConvos.delete(genId);
              if (record.confirmedGenerated) {
                console.log(`[agy-read] 前台对话 [${genId}] AI 回复生成完毕，标记为未读`);
                markConvoAsUnread(genId, '前台 AI 回复生成完毕');
              }
            }
          } else {
            // 当前处于后台的对话：只要侧边栏无 spinner 且无 stop 按钮，即判定后台完成
            const isStillGenerating = rowGeneratingIds.has(genId);
            if (!isStillGenerating) {
              activelyGeneratingConvos.delete(genId);
              promptSubmittedConvos.delete(genId);
              if (record.confirmedGenerated) {
                console.log(`[agy-read] 后台对话 [${genId}] AI 回复生成完毕，标记为未读`);
                markConvoAsUnread(genId, '后台 AI 回复生成完毕');
              }
            }
          }
        }
      }
      addInterval(checkGeneratingAndUnreadState, 200);

      // 同步侧边栏指示点：与系统合二为一，共用单一点位，绝不出现双点！
      function syncSidebarIndicators() {
        const rows = document.querySelectorAll('[data-testid="conversation-row-sidebar"]');
        rows.forEach(row => {
          const id = row.getAttribute('data-cascade-id');
          if (!id) return;
          const isUnread = unreadConvosMap.has(id);
          const nativeDot = row.querySelector('[data-testid="status-unread-dot"]');
          let badge = row.querySelector('.agy-unread-dot-badge');

          if (isUnread) {
            if (nativeDot) {
              // 1. 原生未读点已存在：直接复用原生点，绝不重复插入插件徽标！
              nativeDot.style.removeProperty('display');
              if (badge) badge.remove();
            } else {
              // 2. 原生点已被系统移除（如用户点开查看或增强器记录的未读）：
              // 将插件点精准挂载在原生点所在的时间右侧容器内，无缝接管单一点位！
              const timeContainer = row.querySelector('.flex.items-center.gap-1\\.5') ||
                                    row.querySelector('[data-screenshot-volatile="true"]')?.parentElement;
              if (timeContainer) {
                if (!badge) {
                  badge = document.createElement('div');
                  badge.className = 'agy-unread-dot-badge';
                  badge.title = '未读内容（满足阅读条件后自动消除）';
                  badge.innerHTML = `
                    <div class="agy-unread-dot-pulse"></div>
                    <div class="agy-unread-dot-core"></div>
                  `;
                  timeContainer.insertBefore(badge, timeContainer.firstChild);
                }
              }
            }
          } else {
            // 已读状态：彻底消除插件点，若有残留原生点也一并隐藏
            if (badge) {
              badge.remove();
            }
            if (nativeDot) {
              nativeDot.style.setProperty('display', 'none', 'important');
            }
          }
        });
      }
      addInterval(syncSidebarIndicators, 200);

      // 对外暴露辅助方法供右键菜单等模块协同调用与测试
      window.__AGY_MARK_READ__ = (id) => markConvoAsRead(id || getCurrentUrlConvoId(), 'manual API');
      window.__AGY_MARK_UNREAD__ = (id) => markConvoAsUnread(id || getCurrentUrlConvoId(), 'manual API');
      window.__AGY_IS_UNREAD__ = (id) => unreadConvosMap.has(id || getCurrentUrlConvoId());
      window.__AGY_UNREAD_MAP__ = unreadConvosMap;
      window.__AGY_GENERATING_MAP__ = activelyGeneratingConvos;
      window.__AGY_PROMPT_SUBMITTED_MAP__ = promptSubmittedConvos;
    }

    initProjectArchiver();
    initContextMenuSupport();
    initConversationScrollPersistence();
    initSmartUnreadTracker();

    console.log('[agy-read] 纸张翻页器、项目折叠归档、右键菜单、阅读位置记忆与智能已读提醒已就绪！');
  }

  bootstrap();
})();
