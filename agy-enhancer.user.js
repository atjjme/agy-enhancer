// ==UserScript==
// @name         Antigravity Enhancer (agy-enhancer)
// @namespace    https://antigravity.google/
// @version      1.0.0
// @description  Optimize scrolling experience for Antigravity: turn-based navigation, scroll memory, and unread tracking.
// @match        https://127.0.0.1:*/*
// @match        http://127.0.0.1:*/*
// @match        https://localhost:*/*
// @match        http://localhost:*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/**
 * Antigravity 增强器 (agy-enhancer enhancer)
 * 
 * 核心特性：
 * 1. 【纸张式翻页导航】右侧滚动条旁常驻「向上 / 向下」双按钮：
 *    - 点向上：如果在纸内，回到当前问答的【页头】（提问顶部）；如果在页头附近，翻到【上一页】（上一轮问答）；
 *    - 点向下：如果在纸内，直达当前问答的【页脚】（回答末尾）；如果在页脚附近，翻到【下一页】（下一轮问答或最新底部）；双击直接直达整个页面最底部；
 * 2. 【右上角状态提示】提示增强器正在守护运行。
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

    // 是否开启多对话滚动位置记忆与恢复（默认开启）
    ENABLE_SCROLL_POSITION_PERSISTENCE: true,

    // 是否开启智能已读/未读状态追踪与提醒（默认开启）
    ENABLE_SMART_UNREAD: true,

    // 短文自动已读停留时长（毫秒，默认 10000 即 10 秒）
    SHORT_TEXT_VIEW_DURATION_MS: 10000,

    // 长文二次触底后底部平稳停留时长（毫秒，默认 5000 即 5 秒）
    LONG_TEXT_BOTTOM_DURATION_MS: 5000,

    // 判定长短文的比例阈值（默认 0.8，末轮问答高度 < 视口 80% 为短文，反之为长文）
    LONG_TEXT_RATIO: 0.8,

    // 底部触底判定灵敏度（阈值设为 100px，在离底 100px 范围内均视作触底舒适区）
    BOTTOM_THRESHOLD: 100,

    // 离开底部判定阈值（向上翻阅超过 160px 判定离开底部，保留 60px 防抖区间）
    LEAVE_BOTTOM_THRESHOLD: 160,

    // 是否屏蔽划词选中文本时弹出的 "Quote (Ctrl+L)" 引用浮窗（放行右侧栏评论浮窗）
    ENABLE_BLOCK_QUOTE_POPUP: true,
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
  let activeNativeProjectObj = null;
  let activeNativeProjectId = null;
  let lastProjectActionTime = 0;
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
  let windowUnloadHandler = null;
  let interruptRestoration = null;
  let isInternalEnhancerScroll = false;
  let quoteObserver = null;

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
    activeNativeConvoId = null;
    activeNativeProjectObj = null;
    activeNativeProjectId = null;
    lastProjectActionTime = 0;
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
      ['wheel', 'pointerdown', 'mousedown', 'keydown', 'touchmove'].forEach(type => {
        window.removeEventListener(type, userInteractionHandler, true);
      });
      userInteractionHandler = null;
    }
    if (windowUnloadHandler) {
      window.removeEventListener('beforeunload', windowUnloadHandler);
      window.removeEventListener('pagehide', windowUnloadHandler);
      windowUnloadHandler = null;
    }
    interruptRestoration = null;
    isInternalEnhancerScroll = false;
    notifyNewPromptSubmitted = null;
    notifyPromptSubmittedForUnread = null;

    if (quoteObserver) {
      quoteObserver.disconnect();
      quoteObserver = null;
    }

    document.getElementById('agy-quote-interceptor-styles')?.remove();
    document.querySelectorAll('[data-agy-block-quote="true"]').forEach(el => {
      el.removeAttribute('data-agy-block-quote');
      el.style.removeProperty('display');
      el.style.removeProperty('opacity');
      el.style.removeProperty('pointer-events');
      el.style.removeProperty('visibility');
    });
    document.querySelectorAll('.agy-hide-quote-item').forEach(el => {
      el.classList.remove('agy-hide-quote-item');
      el.style.removeProperty('display');
    });

    document.getElementById('agy-universal-context-menu')?.remove();
    document.getElementById('agy-context-menu-styles')?.remove();
    document.getElementById('agy-enhancer-styles')?.remove();
    document.getElementById('agy-page-nav-group')?.remove();
    document.getElementById('agy-scroll-bottom-btn')?.remove();
    // 保留 #agy-enhancer-toast 单例，避免清理重建时反复重置并重新展开
    // document.getElementById('agy-enhancer-toast')?.remove();
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

    console.log('[agy-enhancer] Initializing page navigator...');
    initEnhancer();
  }

  function initEnhancer() {
    window.__AGY_ENHANCER_LOADED__ = true;

    // ==================== 1. 注入专用样式 ====================
    const styleEl = document.createElement('style');
    styleEl.id = 'agy-enhancer-styles';
    styleEl.textContent = `
      /* 右上角生效提示 Toast */
      #agy-enhancer-toast {
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
      #agy-enhancer-toast,
      #agy-enhancer-toast * {
        -webkit-app-region: no-drag !important;
        app-region: no-drag !important;
        pointer-events: auto !important;
      }
      #agy-enhancer-toast.show {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      #agy-enhancer-toast.collapsed {
        padding: 6px 9px;
        opacity: 0.8;
        background: rgba(24, 24, 27, 0.75);
      }
      #agy-enhancer-toast.collapsed:hover {
        opacity: 1;
        padding: 6px 14px;
        background: rgba(24, 24, 27, 0.95);
      }
      #agy-enhancer-toast .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
        box-shadow: 0 0 10px #22c55e;
        flex-shrink: 0;
      }
      #agy-enhancer-toast .toast-text {
        white-space: nowrap;
        transition: all 0.25s ease;
      }
      #agy-enhancer-toast.collapsed .toast-text {
        max-width: 0;
        opacity: 0;
        margin: 0;
        overflow: hidden;
      }
      #agy-enhancer-toast.collapsed:hover .toast-text {
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
        #agy-enhancer-toast {
          background: rgba(255, 255, 255, 0.95);
          color: #18181b;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.08);
        }
        #agy-enhancer-toast.collapsed {
          background: rgba(255, 255, 255, 0.85);
        }
        #agy-enhancer-toast.collapsed:hover {
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

      /* 修复未归档项目展开或激活后操作图标常驻/在子对话上仍显现的问题：仅在鼠标直接悬停于项目卡片或呼出菜单时才显现 */
      .group\\/header:has(button[data-project-card="true"]) .absolute.right-1 {
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.15s ease;
      }
      .group\\/header:has(button[data-project-card="true"]):hover .absolute.right-1,
      .group\\/header:has(button[data-project-card="true"]):has(button[aria-label="Project options"][aria-expanded="true"]) .absolute.right-1 {
        opacity: 1 !important;
        pointer-events: auto !important;
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
      let toast = document.getElementById('agy-enhancer-toast');
      const branchTag = window.__AGY_BRANCH_TAG__ || '';
      let collapseTimer = null;

      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'agy-enhancer-toast';
        toast.title = `Antigravity Enhancer ready${branchTag}`;
        toast.innerHTML = `
          <div class="dot"></div>
          <span class="toast-text">Antigravity Enhancer active${branchTag}</span>
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
        toast.title = `Antigravity Enhancer ready${branchTag}`;
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
        let sumChildHeight = 0;
        if (el.children.length > 0) {
          for (let i = 0; i < el.children.length; i++) {
            sumChildHeight += el.children[i].offsetHeight;
          }
        }
        const realContentHeight = Math.max(sumChildHeight, el.scrollHeight, el.offsetHeight);
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

    function performEnhancerScroll(container, scrollOptions) {
      if (!container) return;
      if (typeof interruptRestoration === 'function') {
        interruptRestoration('nav button scroll');
      }
      isInternalEnhancerScroll = true;
      try {
        if (originalElementScrollTo) {
          originalElementScrollTo.call(container, scrollOptions);
        } else {
          container.scrollTo(scrollOptions);
        }
      } finally {
        setTimeout(() => {
          isInternalEnhancerScroll = false;
        }, 80);
      }
    }

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
        console.log(`[agy-enhancer] Back to turn ${curIdx + 1} top`);
        performEnhancerScroll(container, { top: curPage.headScrollTop, behavior: 'smooth' });
      } else {
        // 已经在当前页头附近，点一下向上翻到上一页
        if (curIdx > 0) {
          const prevPage = pages[curIdx - 1];
          console.log(`[agy-enhancer] Up to turn ${curIdx} top`);
          performEnhancerScroll(container, { top: prevPage.headScrollTop, behavior: 'smooth' });
        } else {
          // 已经是第 1 页，直达整个页面最顶端
          console.log('[agy-enhancer] Reached top');
          performEnhancerScroll(container, { top: 0, behavior: 'smooth' });
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
        console.log(`[agy-enhancer] Down to turn ${curIdx + 1} bottom`);
        performEnhancerScroll(container, { top: curPage.footScrollTop, behavior: 'smooth' });
      } else {
        // 已经在页脚附近，翻到下一页的页头
        if (curIdx < pages.length - 1) {
          const nextPage = pages[curIdx + 1];
          console.log(`[agy-enhancer] Down to turn ${curIdx + 2} top`);
          performEnhancerScroll(container, { top: nextPage.headScrollTop, behavior: 'smooth' });
        } else {
          // 已经是最后一页，直达最新底部
          console.log('[agy-enhancer] Reached bottom');
          performEnhancerScroll(container, { top: container.scrollHeight, behavior: 'smooth' });
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
      console.log('[agy-enhancer] Double click: Scrolled to bottom');
      performEnhancerScroll(container, { top: container.scrollHeight, behavior: 'smooth' });
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
      upBtn.title = 'Up: Question top / Previous turn';
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
      downBtn.title = 'Down: Answer bottom / Next turn (Double click: Bottom)';
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

    // ==================== 项目与对话底层数据及文件夹工具 (Core Helpers) ====================
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
            console.warn('[agy-enhancer] direct inside reveal failed, falling back to folder uri:', err);
          }
        }

        // 降级保护：直接定位目标文件夹本身
        try {
          await window.electronNative.revealInFilePicker(uri);
          return true;
        } catch (e) {
          console.warn('[agy-enhancer] revealInFilePicker fallback error:', e);
        }
      }

      if (window.electronNative?.openExternal) {
        try {
          await window.electronNative.openExternal(uri);
          return true;
        } catch (e) {
          console.warn('[agy-enhancer] openExternal error:', e);
        }
      }

      try {
        window.open(uri, '_blank');
        return true;
      } catch (e) {}
      return false;
    }

    function getProjectFolderUri(projectOrId) {
      if (!projectOrId) return null;
      let project = null;
      const pm = getPM();
      const projects = pm?.projectsStateProvider?.getState?.() || [];

      if (typeof projectOrId === 'string') {
        const pItem = projects.find(p => p.project?.id === projectOrId || p.project?.name === projectOrId);
        project = pItem?.project || null;
      } else if (typeof projectOrId === 'object') {
        project = projectOrId.project || projectOrId;
      }

      if (!project) return null;

      // 1. 从 projectResources 提取标准 folderUri
      if (project.projectResources?.resources) {
        for (const res of project.projectResources.resources) {
          if (res.type?.value?.folderUri) return res.type.value.folderUri;
          if (res.type?.case === 'folderUri' && typeof res.type.value === 'string') return res.type.value;
          if (typeof res.folderUri === 'string') return res.folderUri;
          if (typeof res.uri === 'string' && (res.uri.startsWith('file:') || /^[a-zA-Z]:[\\/]/.test(res.uri))) return res.uri;
        }
      }

      // 2. 检查常见直接字段
      if (typeof project.rootUri === 'string') return project.rootUri;
      if (typeof project.folderUri === 'string') return project.folderUri;
      if (typeof project.projectUri === 'string') return project.projectUri;
      if (typeof project.workspaceUri === 'string') return project.workspaceUri;

      // 3. 从该项目关联的对话记录中提取非 worktree 的工作区路径作为兜底
      const pId = project.id;
      if (pId) {
        const tsp = getTSP();
        const summaries = tsp?.getState?.()?.summaries || {};
        for (const cid in summaries) {
          const s = summaries[cid];
          const spId = s?.projectId || s?.trajectoryMetadata?.projectId;
          if (spId === pId) {
            const workspaces = s?.trajectoryMetadata?.workspaces || [];
            for (const w of workspaces) {
              if (w.workspaceFolderAbsoluteUri && !w.workspaceFolderAbsoluteUri.includes('/worktrees/')) {
                return w.workspaceFolderAbsoluteUri;
              }
            }
            if (s?.trajectoryMetadata?.workspaceUris) {
              for (const u of s.trajectoryMetadata.workspaceUris) {
                if (!u.includes('/worktrees/')) return u;
              }
            }
          }
        }
      }

      return null;
    }

    function resolveProjectFromElement(el) {
      if (!el) return null;
      const pm = getPM();
      const projects = pm?.projectsStateProvider?.getState?.() || [];

      // 1. 尝试从 React Fiber 获取精确的 project 或 projectId
      let curr = el;
      while (curr && curr !== document.body) {
        const k = Object.keys(curr).find(key => key.startsWith('__reactFiber$'));
        if (k && curr[k]) {
          let fiber = curr[k];
          let depth = 0;
          while (fiber && depth < 25) {
            const props = fiber.memoizedProps;
            if (props?.project?.id) return props.project;
            if (props?.projectItem?.project?.id) return props.projectItem.project;
            if (props?.projectId) {
              const found = projects.find(p => p.project?.id === props.projectId);
              if (found?.project) return found.project;
            }
            fiber = fiber.return;
            depth++;
          }
        }
        curr = curr.parentElement;
      }

      // 2. 尝试从 DOM 项目名称匹配
      const card = el.closest('button[data-project-card="true"]') ||
                   el.closest('.group\\/header')?.querySelector('button[data-project-card="true"]') ||
                   el.parentElement?.querySelector?.('button[data-project-card="true"]');
      if (card) {
        const nameEl = card.querySelector('.truncate') || card.querySelector('span');
        const name = nameEl?.innerText?.trim();
        if (name) {
          const found = projects.find(p => p.project?.name === name && !p.project?.archived) ||
                        projects.find(p => p.project?.name === name);
          if (found?.project) return found.project;
        }
      }

      // 3. 尝试从整个项目的容器或祖先中找任何带名字的文本
      const header = el.closest('.group\\/header') || el.closest('[data-testid="section-header"]');
      if (header) {
        const nameEl = header.querySelector('.truncate');
        const name = nameEl?.innerText?.trim();
        if (name) {
          const found = projects.find(p => p.project?.name === name && !p.project?.archived) ||
                        projects.find(p => p.project?.name === name);
          if (found?.project) return found.project;
        }
      }

      return null;
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

      let projectRootUri = getProjectFolderUri(projItem?.project || pId);
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
            console.warn('[agy-enhancer] history.push error, falling back to router.navigate:', e);
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
            console.warn('[agy-enhancer] router.navigate error:', e);
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
            console.warn('[agy-enhancer] router.navigate error:', e);
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
            const menuHeight = 225;
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
              <div class="agy-dd-item open-project-folder">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>
                <span>Open Project Folder</span>
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

            dd.querySelector('.agy-dd-item.open-project-folder')?.addEventListener('click', () => {
              dd.remove();
              const uri = getProjectFolderUri(p);
              if (uri) {
                openLocalFolder(uri, 'project');
                showNotification('Opened project folder');
              } else {
                showNotification('Failed to resolve project folder');
              }
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

            const archiveSummaries = tsp?.getState()?.summaries || {};
            const archiveConvoSummary = archiveSummaries[c.id];
            let archiveWorkspaceName = '';
            const archiveWorkspaces = archiveConvoSummary?.workspaces || archiveConvoSummary?.trajectoryMetadata?.workspaces || [];
            for (const w of archiveWorkspaces) {
              if (w.branchName) {
                archiveWorkspaceName = w.branchName;
                break;
              }
              if (w.workspaceFolderAbsoluteUri?.includes('/worktrees/')) {
                archiveWorkspaceName = w.workspaceFolderAbsoluteUri.split('/').filter(Boolean).pop();
                break;
              }
            }
            if (!archiveWorkspaceName && archiveConvoSummary?.trajectoryMetadata?.workspaceUris) {
              for (const u of archiveConvoSummary.trajectoryMetadata.workspaceUris) {
                if (u.includes('/worktrees/')) {
                  archiveWorkspaceName = u.split('/').filter(Boolean).pop();
                  break;
                }
              }
            }

            dd.innerHTML = `
              <div class="agy-dd-item convo-rename">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                <span>Rename</span>
              </div>
              <div class="agy-dd-item convo-unread">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M200-120v-680h360l16 80h224v400H520l-16-80H280v280h-80Zm300-440Zm86 160h134v-240H510l-16-80H280v240h290l16 80Z"/></svg>
                <span>${c.markedAsUnread ? 'Mark as Seen' : 'Mark Unread'}</span>
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
              ${archiveWorkspaceName ? `
              <div class="agy-dd-item copy-workspace-name">
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
                <span>Copy Workspace Name</span>
              </div>` : ''}
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
                      console.warn('[agy-enhancer] updateConversationAnnotations title error:', err);
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
                  console.warn('[agy-enhancer] updateConversationAnnotations unread error:', err);
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
                    console.warn('[agy-enhancer] deleteCascadeTrajectory error:', err);
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

            // 复制: 工作区/分支名称
            if (archiveWorkspaceName) {
              dd.querySelector('.copy-workspace-name')?.addEventListener('click', async (ev) => {
                ev.stopPropagation();
                dd.remove();
                btn.classList.remove('active');
                await navigator.clipboard.writeText(archiveWorkspaceName);
                showNotification(`Copied workspace name: "${archiveWorkspaceName}"`);
              });
            }

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
          console.log(`[agy-enhancer] New activity detected, restoring project: ${target.project.name}`);
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
          const projBtn = e.target?.closest?.('button[aria-label="Project options"]');
          if (btn) {
            const row = btn.closest('[data-testid="conversation-row-sidebar"]');
            if (row) {
              activeNativeConvoId = row.getAttribute('data-cascade-id');
              activeNativeProjectObj = null;
              activeNativeProjectId = null;
              lastProjectActionTime = 0;
            }
          } else if (projBtn) {
            activeNativeProjectObj = resolveProjectFromElement(projBtn);
            activeNativeProjectId = activeNativeProjectObj?.id || null;
            activeNativeConvoId = null;
            lastProjectActionTime = Date.now();
          } else {
            // 点击侧边栏筛选按钮、新建按钮或其他任意非对话/项目选项区域，立即清空活跃状态，防止状态残留污染其他菜单
            activeNativeConvoId = null;
            activeNativeProjectObj = null;
            activeNativeProjectId = null;
            lastProjectActionTime = 0;
          }
        };
        document.addEventListener('pointerdown', nativeMenuPointerDownHandler, true);

        function checkAndEnhanceNativeMenu() {
          const menu = document.querySelector('[role="menu"]:not([data-agy-enhanced="true"])');
          if (!menu) return;

          // 0. 明确过滤并排除筛选与排序菜单 (Filter / Group By / Sort)
          // 侧边栏顶部的筛选排序菜单绝对不属于对话或项目操作菜单，坚决不作任何增强
          const isFilterOrSortMenu = menu.textContent.includes('Group By') ||
                                     menu.textContent.includes('Sort Conversations') ||
                                     menu.textContent.includes('Subtitles') ||
                                     menu.querySelector('[data-testid*="filter"]') ||
                                     menu.querySelector('[data-testid*="sort"]') ||
                                     menu.querySelector('[data-testid*="group-by"]');
          if (isFilterOrSortMenu) {
            menu.setAttribute('data-agy-enhanced', 'true');
            return;
          }

          // 1. 确认是否是对话操作菜单（具有原生重命名或删除项）
          const hasConvoActions = menu.querySelector('[data-testid="conversation-delete-menu-item"]') ||
                                  menu.querySelector('[data-testid="conversation-rename-menu-item"]');
          if (hasConvoActions) {
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

            const tsp = getTSP();
            const summaries = tsp?.getState()?.summaries || {};
            const s = convoId ? summaries[convoId] : null;

            // 获取对话名称
            let convoTitle = s?.summary || s?.title || '';
            if (!convoTitle && convoId) {
              const row = document.querySelector(`[data-testid="conversation-row-sidebar"][data-cascade-id="${convoId}"]`);
              convoTitle = row?.querySelector('.truncate')?.innerText?.trim() || '';
            }

            // 获取所属项目名称
            const pId = s?.projectId || s?.trajectoryMetadata?.projectId;
            let projects = [];
            const pm = getPM();
            if (pm?.projectsStateProvider?.getState) {
              projects = pm.projectsStateProvider.getState();
            }
            const projItem = projects.find(p => p.project?.id === pId);
            let projectName = projItem?.project?.name || '';
            if (!projectName && convoId) {
              const row = document.querySelector(`[data-testid="conversation-row-sidebar"][data-cascade-id="${convoId}"]`);
              if (row) {
                const projObj = resolveProjectFromElement(row);
                if (projObj?.name) projectName = projObj.name;
              }
            }

            // 获取工作区/分支名称 (Workspace Name)
            let workspaceName = '';
            const workspaces = s?.workspaces || s?.trajectoryMetadata?.workspaces || [];
            for (const w of workspaces) {
              if (w.branchName) {
                workspaceName = w.branchName;
                break;
              }
              if (w.workspaceFolderAbsoluteUri?.includes('/worktrees/')) {
                workspaceName = w.workspaceFolderAbsoluteUri.split('/').filter(Boolean).pop();
                break;
              }
            }
            if (!workspaceName && s?.trajectoryMetadata?.workspaceUris) {
              for (const u of s.trajectoryMetadata.workspaceUris) {
                if (u.includes('/worktrees/')) {
                  workspaceName = u.split('/').filter(Boolean).pop();
                  break;
                }
              }
            }

            const copyToClipboard = async (text, successMsg) => {
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(text);
                } else {
                  const ta = document.createElement('textarea');
                  ta.value = text;
                  ta.style.position = 'fixed';
                  ta.style.opacity = '0';
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand('copy');
                  ta.remove();
                }
                showNotification(successMsg);
              } catch (err) {
                showNotification(`Copy failed: ${err?.message || err}`);
              }
            };

            // 移除原生多级 Copy 菜单项
            const nativeCopyItem = Array.from(menu.children).find(c =>
              c.getAttribute('role') === 'menuitem' &&
              c.innerText.trim().startsWith('Copy') &&
              !c.classList.contains('agy-native-enhanced')
            );
            if (nativeCopyItem) {
              nativeCopyItem.remove();
            }

            // 1. 原生项与复制项之间的分隔线（若原生菜单末尾已有分隔线则复用，避免出现双分隔线）
            const lastChild = menu.lastElementChild;
            const hasSeparatorBefore = lastChild && lastChild.getAttribute('role') === 'separator';
            if (!hasSeparatorBefore) {
              const dividerCopy = document.createElement('div');
              dividerCopy.setAttribute('role', 'separator');
              dividerCopy.className = 'h-px bg-border my-1 -mx-1 agy-native-enhanced';
              menu.appendChild(dividerCopy);
            }

            // 2. 复制对话名称
            const itemCopyName = document.createElement('div');
            itemCopyName.setAttribute('role', 'menuitem');
            itemCopyName.className = 'w-full px-2 py-1 text-left text-[13px] cursor-pointer outline-none transition-colors select-none flex items-center gap-1.5 rounded-md hover:bg-secondary hover:text-foreground text-secondary-foreground agy-native-enhanced';
            itemCopyName.innerHTML = `
              <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="text-secondary-foreground shrink-0"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
              <span>Copy Conversation Name</span>
            `;
            itemCopyName.addEventListener('click', async (ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
              await copyToClipboard(convoTitle, `Copied conversation name: "${convoTitle}"`);
            });
            menu.appendChild(itemCopyName);

            // 3. 复制对话 ID
            const itemCopyId = document.createElement('div');
            itemCopyId.setAttribute('role', 'menuitem');
            itemCopyId.className = 'w-full px-2 py-1 text-left text-[13px] cursor-pointer outline-none transition-colors select-none flex items-center gap-1.5 rounded-md hover:bg-secondary hover:text-foreground text-secondary-foreground agy-native-enhanced';
            itemCopyId.innerHTML = `
              <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="text-secondary-foreground shrink-0"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
              <span>Copy Conversation ID</span>
            `;
            itemCopyId.addEventListener('click', async (ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
              await copyToClipboard(convoId, `Copied conversation ID: ${convoId}`);
            });
            menu.appendChild(itemCopyId);

            // 4. 复制工作区/分支名称 (存在工作区时展示)
            if (workspaceName) {
              const itemCopyWorkspace = document.createElement('div');
              itemCopyWorkspace.setAttribute('role', 'menuitem');
              itemCopyWorkspace.className = 'w-full px-2 py-1 text-left text-[13px] cursor-pointer outline-none transition-colors select-none flex items-center gap-1.5 rounded-md hover:bg-secondary hover:text-foreground text-secondary-foreground agy-native-enhanced';
              itemCopyWorkspace.innerHTML = `
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="text-secondary-foreground shrink-0"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
                <span>Copy Workspace Name</span>
              `;
              itemCopyWorkspace.addEventListener('click', async (ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                await copyToClipboard(workspaceName, `Copied workspace name: "${workspaceName}"`);
              });
              menu.appendChild(itemCopyWorkspace);
            }

            // 5. 复制项目名称 (属于项目时展示)
            if (paths?.isInsideProject || projectName) {
              const itemCopyProject = document.createElement('div');
              itemCopyProject.setAttribute('role', 'menuitem');
              itemCopyProject.className = 'w-full px-2 py-1 text-left text-[13px] cursor-pointer outline-none transition-colors select-none flex items-center gap-1.5 rounded-md hover:bg-secondary hover:text-foreground text-secondary-foreground agy-native-enhanced';
              itemCopyProject.innerHTML = `
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="text-secondary-foreground shrink-0"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
                <span>Copy Project Name</span>
              `;
              itemCopyProject.addEventListener('click', async (ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                await copyToClipboard(projectName, `Copied project name: "${projectName}"`);
              });
              menu.appendChild(itemCopyProject);
            }

            // 5. 复制项与文件夹操作之间的分隔线
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
              const itemToggleUnread = document.createElement('div');
              itemToggleUnread.setAttribute('role', 'menuitem');
              itemToggleUnread.className = 'w-full px-2 py-1 text-left text-[13px] cursor-pointer outline-none transition-colors select-none flex items-center gap-1.5 rounded-md hover:bg-secondary hover:text-foreground text-secondary-foreground agy-native-enhanced';
              itemToggleUnread.innerHTML = `
                <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="text-secondary-foreground shrink-0"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
                <span>${isUnread ? 'Mark as Seen' : 'Mark as Unread'}</span>
              `;
              itemToggleUnread.addEventListener('click', (ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                if (isUnread) {
                  if (typeof window.__AGY_MARK_SEEN__ === 'function') {
                    window.__AGY_MARK_SEEN__(convoId);
                  }
                } else {
                  if (typeof window.__AGY_MARK_UNREAD__ === 'function') {
                    window.__AGY_MARK_UNREAD__(convoId);
                  }
                }
              });
              menu.appendChild(itemToggleUnread);
            }

            activeNativeConvoId = null;
            return;
          }

          // 2. 确认是否是项目操作菜单
          // 仅在明确通过点击项目选项按钮或右键项目卡片时生效（时效1.5秒内），坚决杜绝宽泛匹配其他无关菜单
          const isRecentProjectAction = (Date.now() - lastProjectActionTime < 1500);
          let targetProject = isRecentProjectAction ? activeNativeProjectObj : null;
          if (!targetProject && isRecentProjectAction && activeNativeProjectId) {
            const pm = getPM();
            const projects = pm?.projectsStateProvider?.getState?.() || [];
            targetProject = projects.find(p => p.project?.id === activeNativeProjectId)?.project || null;
          }

          const hasProjectActions = menu.querySelector('[data-testid="project-delete-menu-item"]') ||
                                    menu.querySelector('[data-testid="project-rename-menu-item"]') ||
                                    menu.querySelector('[data-testid="project-settings-menu-item"]');

          const isProjectMenu = (isRecentProjectAction && !!targetProject) || !!hasProjectActions;

          if (isProjectMenu) {
            if (!menu.children.length) return;

            menu.setAttribute('data-agy-enhanced', 'true');
            activeNativeProjectObj = null;
            activeNativeProjectId = null;
            lastProjectActionTime = 0;

            const targetUri = getProjectFolderUri(targetProject);
            if (!targetUri) return;

            const divider = document.createElement('div');
            divider.setAttribute('role', 'separator');
            divider.className = 'h-px bg-border my-1 -mx-1 agy-native-enhanced';

            const itemProjectFolder = document.createElement('div');
            itemProjectFolder.setAttribute('role', 'menuitem');
            itemProjectFolder.className = 'w-full px-2 py-1 text-left text-[13px] cursor-pointer outline-none transition-colors select-none flex items-center gap-1.5 rounded-md hover:bg-secondary hover:text-foreground text-secondary-foreground agy-native-enhanced';
            itemProjectFolder.innerHTML = `
              <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="text-secondary-foreground shrink-0"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>
              <span>Open Project Folder</span>
            `;
            itemProjectFolder.addEventListener('click', (ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
              openLocalFolder(targetUri, 'project');
              showNotification('Opened project folder');
            });

            menu.appendChild(divider);
            menu.appendChild(itemProjectFolder);
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

        nativeMenuObserver = new MutationObserver((mutations) => {
          let hasMenuRelevantNode = false;
          for (let m = 0; m < mutations.length; m++) {
            const mut = mutations[m];
            if (mut.addedNodes && mut.addedNodes.length > 0) {
              for (let n = 0; n < mut.addedNodes.length; n++) {
                const node = mut.addedNodes[n];
                if (node.nodeType === 1) {
                  if (node.getAttribute?.('role') === 'menu' ||
                      node.hasAttribute?.('data-radix-popper-content-wrapper') ||
                      node.classList?.contains?.('agy-options-dropdown') ||
                      node.querySelector?.('[role="menu"]') ||
                      node.querySelector?.('[data-radix-popper-content-wrapper]')) {
                    hasMenuRelevantNode = true;
                    break;
                  }
                }
              }
            }
            if (hasMenuRelevantNode) break;
          }
          if (!hasMenuRelevantNode) return;

          checkAndPositionNativeMenu();
          checkAndEnhanceNativeMenu();
        });
        nativeMenuObserver.observe(document.body, { childList: true, subtree: true });
      }

      initNativeConvoMenuEnhancer();
    }

    // ==================== 8. 全局右键上下文菜单系统 (Universal Context Menu) ====================
    function initContextMenuSupport() {
      if (contextMenuHandler) {
        document.removeEventListener('contextmenu', contextMenuHandler, true);
      }

      // 1. 单色极简矢量轮廓图标库 (14x14 Monochrome Outline SVG)
      const MENU_ICONS = {
        comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
        copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
        quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2 0 4-1 6-1 8zm14 0c3 0 7-1 7-8V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2 0 4-1 6-1 8z"></path></svg>',
        explain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
        code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
        save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>',
        folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
        image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
        external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>',
        link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
        file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>',
        regenerate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>',
        fork: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><circle cx="18" cy="6" r="3"></circle><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"></path><path d="M12 12v3"></path></svg>',
        edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>'
      };

      // 2. 注入菜单专属沉浸样式 (自适应深浅色，毛玻璃与微边框)
      function ensureContextMenuStyles() {
        const styleId = 'agy-context-menu-styles';
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          #agy-universal-context-menu {
            position: fixed;
            z-index: 999999;
            min-width: 175px;
            max-width: 280px;
            background: rgba(30, 30, 30, 0.88);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 8px;
            box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.05);
            padding: 4px;
            color: #ececec;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 13px;
            line-height: 1.4;
            user-select: none;
            animation: agy-menu-fade-in 0.1s ease-out;
          }
          @media (prefers-color-scheme: light) {
            #agy-universal-context-menu {
              background: rgba(255, 255, 255, 0.94);
              border: 1px solid rgba(0, 0, 0, 0.1);
              box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05);
              color: #1a1a1a;
            }
            .agy-context-menu-item:hover {
              background: rgba(0, 0, 0, 0.06) !important;
            }
            .agy-context-menu-sep {
              background: rgba(0, 0, 0, 0.08) !important;
            }
          }
          .dark #agy-universal-context-menu, [data-theme="dark"] #agy-universal-context-menu {
            background: rgba(30, 30, 30, 0.88);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #ececec;
          }
          @keyframes agy-menu-fade-in {
            from { opacity: 0; transform: scale(0.97); }
            to { opacity: 1; transform: scale(1); }
          }
          .agy-context-menu-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.12s ease;
            white-space: nowrap;
          }
          .agy-context-menu-item:hover {
            background: rgba(255, 255, 255, 0.1);
          }
          .agy-context-menu-icon {
            width: 14px;
            height: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            opacity: 0.82;
          }
          .agy-context-menu-item:hover .agy-context-menu-icon {
            opacity: 1;
          }
          .agy-context-menu-icon svg {
            width: 14px;
            height: 14px;
            stroke: currentColor;
          }
          .agy-context-menu-label {
            flex: 1;
            font-weight: 450;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .agy-context-menu-sep {
            height: 1px;
            margin: 3px 6px;
            background: rgba(255, 255, 255, 0.08);
          }
        `;
        document.head.appendChild(style);
      }

      // 3. 关闭现有菜单
      function dismissUniversalContextMenu() {
        const menu = document.getElementById('agy-universal-context-menu');
        if (menu) menu.remove();
      }

      // 4. 底层动作执行辅助函数
      function triggerNativeButton(btn) {
        if (!btn) return false;
        try {
          btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
          btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
          btn.click();
          return true;
        } catch (e) {
          try { btn.click(); return true; } catch (e2) { return false; }
        }
      }

      function copyText(text) {
        if (!text) return;
        navigator.clipboard.writeText(text).catch(() => {});
      }

      function isImageFilePath(pathOrName) {
        if (!pathOrName) return false;
        return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(pathOrName.trim());
      }

      function copyImageFile(filePath) {
        if (!filePath) return;
        // 1. 发送给后台守护进程直接将真实图片写入系统原生剪贴板
        console.log('[AGY_COPY_IMAGE]' + filePath);

        // 2. 如果当前页面存在该图片的 img 节点，同时尝试通过浏览器写入剪贴板
        try {
          const fn = filePath.split(/[\\/]/).pop();
          if (fn) {
            const img = document.querySelector(`img[src*="${fn}"], img[alt*="${fn}"]`);
            if (img) copyImageBlob(img);
          }
        } catch (e) {}
      }

      function revealPath(pathStr) {
        if (!pathStr) return;
        console.log('[AGY_REVEAL_PATH]' + pathStr);
      }

      function openExternalUrl(url) {
        if (!url) return;
        console.log('[AGY_OPEN_EXTERNAL]' + url);
        try { window.open(url, '_blank'); } catch (e) {}
      }

      function saveFileLocally(content, filename = 'code_snippet.txt') {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          a.remove();
          URL.revokeObjectURL(url);
        }, 100);
      }

      async function copyImageBlob(imgEl) {
        if (!imgEl) return;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = imgEl.naturalWidth || imgEl.width || 300;
          canvas.height = imgEl.naturalHeight || imgEl.height || 300;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(imgEl, 0, 0);
          canvas.toBlob(async (blob) => {
            if (blob) {
              try {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                return;
              } catch (e) {}
            }
            copyText(imgEl.src);
          }, 'image/png');
        } catch (e) {
          copyText(imgEl.src);
        }
      }

      function resolveImageSaveFilename(imgEl) {
        if (!imgEl) return `media_${Date.now()}.png`;

        // 0. 如果在 Artifact Viewer 中，且当前工件有明确的本地文件名，优先使用该工件真实文件名
        const inArtifactViewer = imgEl.closest('[aria-label="Artifact Viewer"], [role="region"][aria-label="Artifact Viewer"], [aria-label="Artifact Viewer header"], #artifact-container, .artifact-view, [data-testid="artifact-view"]');
        if (inArtifactViewer) {
          const activePath = getActiveArtifactPath(imgEl);
          if (activePath && !activePath.startsWith('ARTIFACT:')) {
            const fn = activePath.split('\\').pop() || activePath.split('/').pop();
            if (fn && /\.[a-zA-Z0-9]+$/.test(fn)) {
              return fn;
            }
          }
        }

        // 1. 尝试从 alt、title、src 或父级提取已有的 media_xxxx.png 命名
        const contextStr = (imgEl.getAttribute('alt') || '') + ' ' +
                           (imgEl.getAttribute('title') || '') + ' ' +
                           (imgEl.src || '');
        const mediaMatch = contextStr.match(/(media_\d+\.[a-zA-Z0-9]+)/i);
        if (mediaMatch) {
          return mediaMatch[1];
        }

        // 2. 判定文件扩展名
        let ext = 'png';
        const src = imgEl.src || imgEl.getAttribute('src') || '';
        if (src.includes('image/svg') || src.endsWith('.svg')) {
          ext = 'svg';
        } else if (src.includes('image/jpeg') || src.endsWith('.jpg') || src.endsWith('.jpeg')) {
          ext = 'jpg';
        } else if (src.includes('image/webp') || src.endsWith('.webp')) {
          ext = 'webp';
        } else if (src.includes('image/gif') || src.endsWith('.gif')) {
          ext = 'gif';
        }

        // 3. 自动生成统一格式: media_时间戳.png
        return `media_${Date.now()}.${ext}`;
      }

      function saveImageLocally(imgEl) {
        if (!imgEl) return;
        const filename = resolveImageSaveFilename(imgEl);
        const src = imgEl.src || imgEl.getAttribute('src');
        if (!src) return;

        if (src.startsWith('data:') || src.startsWith('blob:')) {
          const a = document.createElement('a');
          a.href = src;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => a.remove(), 100);
        } else {
          fetch(src)
            .then(res => res.blob())
            .then(blob => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              setTimeout(() => {
                a.remove();
                URL.revokeObjectURL(url);
              }, 100);
            })
            .catch(() => {
              const a = document.createElement('a');
              a.href = src;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              setTimeout(() => a.remove(), 100);
            });
        }
      }

      function parseArtifactUri(rawUri) {
        if (!rawUri) return null;
        let decoded = decodeURIComponent(rawUri);
        if (decoded.includes('%')) {
          decoded = decodeURIComponent(decoded);
        }
        decoded = decoded.replace(/^file:\/\/\/?/i, '');
        decoded = decoded.replace(/^\/([a-zA-Z]:)/, '$1');
        if (/^[a-zA-Z]:[/\\]/.test(decoded) || decoded.startsWith('/')) {
          return decoded.replace(/\//g, '\\');
        }
        return decoded;
      }

      function getDirectoryPath(rawPath) {
        if (!rawPath) return '';
        let p = rawPath.trim();
        const homeDir = 'C:\\Users\\Juste';

        if (p.startsWith('MEDIA_DIR:')) {
          const convoId = p.slice('MEDIA_DIR:'.length).trim();
          return `${homeDir}\\.gemini\\antigravity\\brain\\${convoId}\\.user_uploaded`;
        }
        if (p.startsWith('MEDIA:')) {
          const parts = p.split(':');
          const convoId = parts[1];
          return `${homeDir}\\.gemini\\antigravity\\brain\\${convoId}\\.user_uploaded`;
        }
        if (p.startsWith('ARTIFACT:')) {
          const parts = p.split(':');
          const convoId = parts[1];
          return `${homeDir}\\.gemini\\antigravity\\brain\\${convoId}`;
        }

        p = p.replace(/^file:\/\/\/?/i, '').replace(/\//g, '\\');
        p = p.replace(/^\/([a-zA-Z]:)/, '$1');
        p = p.replace(/\\+$/, '');

        const lastSlash = p.lastIndexOf('\\');
        if (lastSlash > 0) {
          const lastSegment = p.slice(lastSlash + 1);
          // 如果末尾带有文件扩展名（如 .md, .png, .js, .json, .py 等），去除文件名保留纯目录
          if (/\.[a-zA-Z0-9_-]+$/i.test(lastSegment)) {
            return p.slice(0, lastSlash);
          }
        }
        return p;
      }

      function getActiveArtifactPath(target) {
        // 0. 如果点击的是特定的 tab 按钮，优先从该 tab 按钮提取
        const tabBtn = target?.closest?.('button[data-tab-id], [role="tab"], [class*="tab-"]');
        if (tabBtn) {
          const tabId = tabBtn.getAttribute('data-tab-id');
          if (tabId && tabId.startsWith('artifact__')) {
            return parseArtifactUri(tabId.slice('artifact__'.length));
          }
          const tabTitle = tabBtn.getAttribute('title') || tabBtn.innerText?.trim();
          if (tabTitle) {
            const convoMatch = window.location.pathname.match(/\/c\/([a-f0-9-]+)/i);
            const convoId = convoMatch ? convoMatch[1] : '';
            if (tabTitle.startsWith('Media')) {
              return convoId ? `MEDIA_DIR:${convoId}` : null;
            }
            return convoId ? `ARTIFACT:${convoId}:${tabTitle}` : tabTitle;
          }
        }

        // 1. 从辅助面板 (Auxiliary Pane) 的当前活跃 Tab 状态中嗅探（纯 DOM 解析，彻底规避 SPA 遗留 URL 参数污染）
        const auxPane = document.querySelector('[data-aux-pane-open="true"], [role="region"][aria-label*="Artifact" i], .artifact-view, #artifact-container');
        if (auxPane) {
          // 1a. 检查当前活跃 Tab 容器的 data-active-tab-id 属性
          const activeTabContainer = auxPane.querySelector('[data-active-tab-id]');
          const activeTabId = activeTabContainer?.getAttribute('data-active-tab-id');
          if (activeTabId && activeTabId.startsWith('artifact__')) {
            return parseArtifactUri(activeTabId.slice('artifact__'.length));
          }

          // 1b. 检查具有高亮状态的 Tab 按钮 (bg-secondary 且 text-foreground)
          const activeTabBtn = Array.from(auxPane.querySelectorAll('button')).find(b => {
            return b.classList.contains('bg-secondary') && (b.classList.contains('text-foreground') || !b.classList.contains('bg-transparent'));
          });
          if (activeTabBtn) {
            const tabId = activeTabBtn.getAttribute('data-tab-id');
            if (tabId && tabId.startsWith('artifact__')) {
              return parseArtifactUri(tabId.slice('artifact__'.length));
            }
            const title = activeTabBtn.getAttribute('title') || activeTabBtn.innerText?.trim();
            if (title) {
              const convoMatch = window.location.pathname.match(/\/c\/([a-f0-9-]+)/i);
              const convoId = convoMatch ? convoMatch[1] : '';
              if (title.startsWith('Media')) {
                return convoId ? `MEDIA_DIR:${convoId}` : null;
              }
              return convoId ? `ARTIFACT:${convoId}:${title}` : title;
            }
          }

          // 1c. 检查右侧栏中的图片元素
          const rightImg = auxPane.querySelector('img');
          if (rightImg) {
            const imgSrc = rightImg.getAttribute('src') || rightImg.src || '';
            if (imgSrc.startsWith('file:///')) {
              return parseArtifactUri(imgSrc);
            }
            const mediaMatch = (imgSrc + ' ' + (rightImg.getAttribute('alt') || '')).match(/(media_\d+\.[a-zA-Z0-9]+)/i);
            const convoMatch = window.location.pathname.match(/\/c\/([a-f0-9-]+)/i);
            const convoId = convoMatch ? convoMatch[1] : '';
            if (mediaMatch && convoId) {
              return `MEDIA:${convoId}:${mediaMatch[1]}`;
            }
            if (convoId) {
              return `MEDIA_DIR:${convoId}`;
            }
          }

          // 1d. 检查 Artifact Viewer Header 中的标题
          const header = auxPane.querySelector('[aria-label="Artifact Viewer header"], [data-testid="artifact-viewer-header"]');
          const titleEl = header?.querySelector('.text-sm.truncate, [class*="truncate"]');
          const headerTitle = (titleEl?.innerText || header?.innerText || '').split('\n')[0].trim();
          if (headerTitle && !headerTitle.startsWith('Artifacts') && !headerTitle.startsWith('Terminal') && !headerTitle.startsWith('Overview')) {
            const convoMatch = window.location.pathname.match(/\/c\/([a-f0-9-]+)/i);
            const convoId = convoMatch ? convoMatch[1] : '';
            if (convoId) {
              return `ARTIFACT:${convoId}:${headerTitle}`;
            }
          }
        }

        return null;
      }

      function resolveImageDiskPath(imgEl) {
        if (!imgEl) return null;
        const src = imgEl.getAttribute('src') || imgEl.src || '';

        // 1. 本地物理路径 file:///
        if (src.startsWith('file:///')) {
          return decodeURIComponent(src.replace(/^file:\/\/\/?/i, '')).replace(/\//g, '\\');
        }

        // 2. DOM 节点属性 (data-path, data-file-path)
        const candidate = imgEl.getAttribute('data-path') ||
                          imgEl.getAttribute('data-file-path') ||
                          imgEl.closest('[data-path], [data-file-path]')?.getAttribute('data-path') ||
                          imgEl.closest('[data-path], [data-file-path]')?.getAttribute('data-file-path');
        if (candidate && /^[a-zA-Z]:[/\\]/.test(candidate)) {
          return candidate.replace(/\//g, '\\');
        }

        // 3. 在工件查看器 (Artifact Viewer) 中打开的图片
        const inArtifactViewer = imgEl.closest('[aria-label="Artifact Viewer"], [role="region"][aria-label="Artifact Viewer"], [aria-label="Artifact Viewer header"], #artifact-container, .artifact-view, [data-testid="artifact-view"], [data-aux-pane-open="true"]');
        if (inArtifactViewer) {
          const activeArtifactPath = getActiveArtifactPath(imgEl);
          if (activeArtifactPath) {
            return activeArtifactPath;
          }
        }

        // 4. 用户在提问气泡中上传的图片（无论是未放大的缩略图还是点开放大的图片）
        const alt = imgEl.getAttribute('alt') || '';
        const inUserTurn = !!imgEl.closest('.group\\/user-input-step, [class*="user-input-step"]');
        const isUploadBtn = !!imgEl.closest('button[data-tooltip-id*="-img-"], button[aria-label*="image."]');
        const isUserUpload = inUserTurn || isUploadBtn || alt.includes('User uploaded media');

        const convoMatch = window.location.pathname.match(/\/c\/([a-f0-9-]+)/i);
        const convoId = convoMatch ? convoMatch[1] : '';

        // 尝试匹配已有的 media_时间戳 标识
        const fullContext = alt + ' ' + (imgEl.getAttribute('title') || '') + ' ' + src + ' ' +
                            (imgEl.closest('[class*="media"], [data-media-id], [class*="user-input"]')?.innerText || '');
        const mediaMatch = fullContext.match(/(media_\d+\.[a-zA-Z0-9]+)/i) || src.match(/(media_\d+\.[a-zA-Z0-9]+)/i);
        if (mediaMatch && convoId) {
          return `MEDIA:${convoId}:${mediaMatch[1]}`;
        }

        // 哪怕缩略图没有具体文件名，只要是用户上传图片且在会话中，直接定位该会话的 .user_uploaded 目录
        if (isUserUpload && convoId) {
          return `MEDIA_DIR:${convoId}`;
        }

        return null;
      }

      function appendQuoteToPrompt(text) {
        if (!text) return;
        const input = document.querySelector('textarea, [contenteditable="true"]');
        if (!input) return;
        const formatted = `> ${text.trim().split('\n').join('\n> ')}\n\n`;
        if (input.tagName === 'TEXTAREA') {
          const start = input.selectionStart || input.value.length;
          input.value = input.value.slice(0, start) + formatted + input.value.slice(start);
          input.selectionStart = input.selectionEnd = start + formatted.length;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          input.focus();
          document.execCommand('insertText', false, formatted);
        }
        input.focus();
      }

      function appendExplainToPrompt(text) {
        if (!text) return;
        const input = document.querySelector('textarea, [contenteditable="true"]');
        if (!input) return;
        const promptText = `Please explain this code snippet:\n\`\`\`\n${text.trim()}\n\`\`\`\n`;
        if (input.tagName === 'TEXTAREA') {
          input.value = promptText;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          input.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, promptText);
        }
        input.focus();
      }

      function triggerNativeQuote(selectedText) {
        // 1. 尝试寻找原生浮层中的 Quote 按钮 (虽然被样式隐藏，但在 DOM 中依然存在且可点击)
        let quoteBtn = document.querySelector('[data-testid="selection-quote-button"], [data-testid*="quote" i], button[aria-label*="Quote" i], button[title*="Quote" i]');
        if (!quoteBtn) {
          const blockedNodes = document.querySelectorAll('[data-agy-block-quote="true"], .agy-hide-quote-item, .selection-popup');
          for (const node of blockedNodes) {
            const btn = node.matches('button, [role="button"]') ? node : node.querySelector('button, [role="button"]');
            if (btn) {
              const text = (btn.textContent || '').trim();
              const aria = (btn.getAttribute('aria-label') || '').trim();
              if (/Quote|引用/i.test(text) || /Quote|引用/i.test(aria)) {
                quoteBtn = btn;
                break;
              }
            }
          }
        }

        if (quoteBtn) {
          quoteBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
          quoteBtn.click();
          return;
        }

        // 2. 尝试派发原生快捷键 Ctrl+L (Mac 下 Cmd+L)
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const targetEl = document.activeElement || document.body;
        const keyEvt = new KeyboardEvent('keydown', {
          key: 'l',
          code: 'KeyL',
          keyCode: 76,
          which: 76,
          ctrlKey: !isMac,
          metaKey: isMac,
          bubbles: true,
          cancelable: true
        });
        targetEl.dispatchEvent(keyEvt);
        document.dispatchEvent(keyEvt);

        // 3. 优雅降级兜底方案：直接以 Markdown 引用格式填入提问框
        setTimeout(() => {
          const input = document.querySelector('textarea, [contenteditable="true"]');
          const currVal = input?.value || input?.innerText || '';
          if (!currVal.includes(selectedText.slice(0, 15))) {
            appendQuoteToPrompt(selectedText);
          }
        }, 120);
      }

      function triggerNativeComment(selectedText) {
        // 1. 尝试寻找原生浮层或右侧栏中的 Comment 按钮 (虽然被样式隐藏，但在 DOM 中依然存在且可点击)
        let commentBtn = document.querySelector('[data-testid*="comment" i], button[aria-label*="Comment" i], button[title*="Comment" i], .comment-button');
        if (!commentBtn) {
          const blockedNodes = document.querySelectorAll('[data-agy-block-quote="true"], .agy-hide-quote-item, .selection-popup');
          for (const node of blockedNodes) {
            const btn = node.matches('button, [role="button"]') ? node : node.querySelector('button, [role="button"]');
            if (btn) {
              const text = (btn.textContent || '').trim();
              const aria = (btn.getAttribute('aria-label') || '').trim();
              if (/Comment|评论/i.test(text) || /Comment|评论/i.test(aria)) {
                commentBtn = btn;
                break;
              }
            }
          }
        }

        if (commentBtn) {
          commentBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
          commentBtn.click();
          return;
        }

        // 2. 尝试派发原生评论快捷键 Ctrl+Alt+M (Mac 下 Cmd+Option+M)
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const targetEl = document.activeElement || document.body;
        const keyEvt = new KeyboardEvent('keydown', {
          key: 'm',
          code: 'KeyM',
          keyCode: 77,
          which: 77,
          ctrlKey: !isMac,
          metaKey: isMac,
          altKey: true,
          bubbles: true,
          cancelable: true
        });
        targetEl.dispatchEvent(keyEvt);
        document.dispatchEvent(keyEvt);

        // 3. 优雅降级兜底：若系统未响应，将选中文本引用填入提问框
        setTimeout(() => {
          const input = document.querySelector('textarea, [contenteditable="true"]');
          const currVal = input?.value || input?.innerText || '';
          if (!currVal.includes(selectedText.slice(0, 15))) {
            appendQuoteToPrompt(selectedText);
          }
        }, 120);
      }

      // 5. 区域判定与上下文嗅探
      function isRightSidebar(target) {
        if (!target) return false;
        if (target.closest('.monaco-editor, #artifact-container, [data-panel-id*="artifact" i], [data-panel-id*="right" i], [data-testid*="artifact" i], .artifact-view')) {
          return true;
        }
        const chatContainer = getChatScrollContainer();
        if (chatContainer && chatContainer.contains(target)) return false;
        try {
          const rect = target.getBoundingClientRect();
          if (rect.left >= window.innerWidth * 0.45) return true;
        } catch (e) {}
        return false;
      }

      function resolveLocalPathString(target, selectedText) {
        const a = target.closest('a[href]');
        if (a && a.href && a.href.startsWith('file:///')) {
          return decodeURIComponent(a.href.replace(/^file:\/\/\/?/i, '')).replace(/\//g, '\\');
        }
        const pathAttrEl = target.closest('[data-path], [data-file-path], [data-filepath]');
        if (pathAttrEl) {
          const p = pathAttrEl.getAttribute('data-path') || pathAttrEl.getAttribute('data-file-path') || pathAttrEl.getAttribute('data-filepath');
          if (p) return p;
        }
        const candidate = selectedText || (target.textContent || '').trim();
        if (/^[a-zA-Z]:[/\\](?:[^/:*?"<>|\r\n]+[/\\])*[^/:*?"<>|\r\n]*$/.test(candidate) || /^\/(?:[^\/\0]+\/)*[^\/\0]*$/.test(candidate)) {
          if (candidate.length >= 4 && (candidate.includes('\\') || candidate.includes('/'))) {
            return candidate;
          }
        }
        return null;
      }

      function resolveFileCard(target) {
        if (!target) return null;

        // 0. 优先检测当前点击节点及其父级是否为文件超链接 (如 markdown 中的 [thumbnail_4_4k.jpg](file://...))
        const fileLink = target.closest('a[href^="file:"], a[href*="file:"], [data-uri^="file:"], [data-uri*="file:"]');
        if (fileLink) {
          const rawUri = fileLink.getAttribute('data-uri') || fileLink.getAttribute('href') || fileLink.href || '';
          if (rawUri.startsWith('file:///')) {
            let clean = decodeURIComponent(rawUri.replace(/^file:\/\/\/?/i, '')).replace(/\//g, '\\');
            clean = clean.replace(/^\/([a-zA-Z]:)/, '$1');
            const filename = fileLink.innerText?.trim() || clean.split('\\').pop() || 'file';
            return { card: fileLink, filename, filePath: clean };
          }
        }

        // 1. 原有的显式属性卡片选择器 (带有明确文件特征属性)
        const card = target.closest('[data-testid*="file" i], [data-filename], .artifact-file, [data-artifact-id], [data-uri*="artifact"]');
        if (card) {
          const uri = card.getAttribute('data-uri');
          if (uri && uri.startsWith('file:///')) {
            let clean = decodeURIComponent(uri.replace(/^file:\/\/\/?/i, '')).replace(/\//g, '\\');
            clean = clean.replace(/^\/([a-zA-Z]:)/, '$1');
            const filename = card.getAttribute('data-filename') || card.getAttribute('title') || clean.split('\\').pop() || 'file';
            return { card, filename, filePath: clean };
          }
          const filename = card.getAttribute('data-filename') || card.getAttribute('title') || card.innerText?.split('\n')[0] || 'file';
          const filePath = card.getAttribute('data-path') || card.getAttribute('data-file-path') || filename;
          if (filePath && (filePath.includes('\\') || filePath.includes('/') || filePath.includes('.'))) {
            return { card, filename, filePath };
          }
        }

        // 2. 检查是否位于侧边栏 Artifacts 抽屉列表项内部 (如果在主聊天区则跳过此项，防止将气泡或空白误判为工件)
        const chatContainer = getChatScrollContainer();
        const isInChat = chatContainer && chatContainer.contains(target);
        if (!isInChat) {
          const artifactsDrawer = target.closest('#artifacts-sidebar, .artifacts-drawer, [aria-label*="Artifacts" i], [data-testid*="artifacts-list" i]');
          if (artifactsDrawer) {
            const row = target.closest('a, button, li, [role="button"], div.cursor-pointer');
            if (row && artifactsDrawer.contains(row)) {
              const innerFileLink = row.querySelector('a[href^="file:"], a[href*="file:"], [data-uri^="file:"]');
              if (innerFileLink) {
                const rawUri = innerFileLink.getAttribute('data-uri') || innerFileLink.getAttribute('href') || innerFileLink.href || '';
                if (rawUri.startsWith('file:///')) {
                  let clean = decodeURIComponent(rawUri.replace(/^file:\/\/\/?/i, '')).replace(/\//g, '\\');
                  clean = clean.replace(/^\/([a-zA-Z]:)/, '$1');
                  const filename = innerFileLink.innerText?.trim() || clean.split('\\').pop() || 'file';
                  return { card: row, filename, filePath: clean };
                }
              }
              let title = (row.innerText || target.innerText || '').split('\n')[0].trim();
              const fnMatch = title.match(/([a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+)/);
              const cleanTitle = fnMatch ? fnMatch[1] : title;
              if (cleanTitle && !cleanTitle.startsWith('Artifacts') && !cleanTitle.startsWith('See all') && !cleanTitle.startsWith('Uploads')) {
                const convoMatch = window.location.pathname.match(/\/c\/([a-f0-9-]+)/i);
                const convoId = convoMatch ? convoMatch[1] : '';
                return {
                  card: row,
                  filename: cleanTitle,
                  filePath: convoId ? `ARTIFACT:${convoId}:${cleanTitle}` : cleanTitle
                };
              }
            }
          }
        }

        // 3. 检查是否在已打开的 Artifact Viewer 头部 (Header/Tab) 或内部空白/容器区域 (非代码块)
        const artifactHeader = target.closest('[aria-label="Artifact Viewer header"], [data-testid="artifact-viewer-header"]');
        const inArtifactViewer = target.closest('[aria-label="Artifact Viewer"], [role="region"][aria-label="Artifact Viewer"], #artifact-container, .artifact-view, [data-testid="artifact-view"]');
        const isCodeElement = !!target.closest('pre, code, .monaco-editor');

        if (artifactHeader || (inArtifactViewer && !isCodeElement)) {
          const activePath = getActiveArtifactPath(target);
          if (activePath) {
            const header = document.querySelector('[aria-label="Artifact Viewer header"], [data-testid="artifact-viewer-header"]');
            const titleEl = header?.querySelector('.text-sm.truncate, [class*="truncate"]');
            const title = (titleEl?.innerText || header?.innerText || '').split('\n')[0].trim() || 'artifact';
            return {
              card: artifactHeader || inArtifactViewer,
              filename: title,
              filePath: activePath,
              isArtifactViewer: true
            };
          }
        }

        return null;
      }

      function resolveCodeInfo(target) {
        const pre = target.closest('pre, code, .monaco-editor, .code-block');
        if (pre) {
          let codeText = '';
          if (pre.classList.contains('monaco-editor')) {
            const lines = pre.querySelectorAll('.view-line');
            if (lines.length > 0) {
              codeText = Array.from(lines).map(l => l.textContent).join('\n');
            } else {
              codeText = pre.textContent;
            }
          } else {
            const codeEl = pre.tagName === 'CODE' ? pre : (pre.querySelector('code') || pre);
            codeText = codeEl.innerText || codeEl.textContent;
          }
          let ext = 'txt';
          const classStr = (pre.className || '') + ' ' + (pre.parentElement?.className || '');
          const m = classStr.match(/(?:lang|language)-([a-zA-Z0-9_-]+)/);
          if (m) {
            const lang = m[1].toLowerCase();
            const extMap = { javascript: 'js', typescript: 'ts', python: 'py', html: 'html', css: 'css', json: 'json', markdown: 'md' };
            ext = extMap[lang] || lang;
          }
          return { codeText: codeText.trim(), filename: `snippet.${ext}` };
        }
        return null;
      }

      function resolveTurnElements(target) {
        const chatContainer = getChatScrollContainer();
        if (!chatContainer || !chatContainer.contains(target)) return null;

        // 1. 用户提问气泡判定与按钮检索
        const userStep = target.closest('.group\\/user-input-step, [class*="user-input-step"]');
        if (userStep) {
          const copyBtn = userStep.querySelector('button[data-tooltip-id*="copy-user-message"], button[aria-label="Copy"], .user-input-buttons-container button:first-of-type');
          const editBtn = userStep.querySelector('button[data-testid="revert-button"], button[aria-label*="Undo" i], button[aria-label*="Edit" i], button[title*="Edit" i], .user-input-buttons-container button:last-of-type');
          const bubbleEl = userStep.querySelector('[class*="rounded-[calc"]') || userStep;
          const promptText = (bubbleEl.innerText || userStep.innerText || '').replace(/\s*\d{1,2}:\d{2}\s*(?:AM|PM)?\s*$/i, '').trim();

          return {
            isUserTurn: true,
            turnEl: userStep,
            copyBtn,
            editBtn,
            promptText
          };
        }

        // 2. AI 回复气泡判定与按钮检索
        const turnContainer = document.querySelector('.relative.flex.flex-col.gap-y-3') ||
                              document.querySelector('.flex.flex-col.gap-y-3');
        let aiTurnEl = null;
        if (turnContainer) {
          let curr = target;
          while (curr && curr !== turnContainer) {
            if (curr.parentElement === turnContainer) {
              aiTurnEl = curr;
              break;
            }
            curr = curr.parentElement;
          }
        }
        if (!aiTurnEl) {
          aiTurnEl = target.closest('[data-testid*="turn" i], .turn-container, .group.w-full') || target;
        }

        const aiCopyBtn = aiTurnEl.querySelector?.('button[aria-label="Copy"]:not(.user-input-buttons-container button), button[data-tooltip-id*="copy-"]:not([data-tooltip-id*="copy-user-message"]):not([data-tooltip-id*="copy-code"])');

        // 检索上一提问步骤对应的原生回退/重新提问按钮 (revert-button)
        let prev = aiTurnEl ? aiTurnEl.previousElementSibling : null;
        let prevUserTurn = null;
        while (prev) {
          if (prev.matches?.('.group\\/user-input-step, [class*="user-input-step"]')) {
            prevUserTurn = prev;
            break;
          }
          prev = prev.previousElementSibling;
        }
        if (!prevUserTurn && chatContainer) {
          const userTurns = Array.from(chatContainer.querySelectorAll('.group\\/user-input-step, [class*="user-input-step"]'));
          prevUserTurn = userTurns[userTurns.length - 1];
        }
        const revertBtn = prevUserTurn?.querySelector?.('button[data-testid="revert-button"], button[aria-label*="Undo" i]');

        const responseMarkdown = aiTurnEl.innerText || aiTurnEl.textContent || '';

        return {
          isUserTurn: false,
          turnEl: aiTurnEl,
          aiCopyBtn,
          revertBtn,
          responseMarkdown
        };
      }

      // 6. 渲染菜单 DOM
      function renderMenu(items, clientX, clientY) {
        dismissUniversalContextMenu();
        if (!items || items.length === 0) return;

        ensureContextMenuStyles();
        const menu = document.createElement('div');
        menu.id = 'agy-universal-context-menu';

        items.forEach(item => {
          if (item.separator) {
            const sep = document.createElement('div');
            sep.className = 'agy-context-menu-sep';
            menu.appendChild(sep);
            return;
          }
          const row = document.createElement('div');
          row.className = 'agy-context-menu-item';
          row.innerHTML = `
            <div class="agy-context-menu-icon">${MENU_ICONS[item.icon] || ''}</div>
            <div class="agy-context-menu-label">${item.label}</div>
          `;
          row.addEventListener('click', (ev) => {
            ev.stopPropagation();
            try { item.action(); } catch (err) {}
            dismissUniversalContextMenu();
          });
          menu.appendChild(row);
        });

        // 视口定位与自适应防溢出
        menu.style.visibility = 'hidden';
        menu.style.top = `${clientY}px`;
        menu.style.left = `${clientX}px`;
        document.body.appendChild(menu);

        const rect = menu.getBoundingClientRect();
        let finalLeft = clientX;
        let finalTop = clientY;

        if (finalLeft + rect.width > window.innerWidth - 10) {
          finalLeft = Math.max(10, finalLeft - rect.width);
        }
        if (finalTop + rect.height > window.innerHeight - 10) {
          finalTop = Math.max(10, finalTop - rect.height);
        }

        menu.style.left = `${finalLeft}px`;
        menu.style.top = `${finalTop}px`;
        menu.style.visibility = 'visible';
      }

      // 7. 全局点击与失焦自动关闭监听
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#agy-universal-context-menu')) {
          dismissUniversalContextMenu();
        }
      }, true);

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          dismissUniversalContextMenu();
        }
      }, true);

      // 8. 核心 contextmenu 事件总线
      contextMenuHandler = (e) => {
        // 放行机制：按住 Shift 键时放行 Chromium 原生右键菜单
        if (e.shiftKey) {
          dismissUniversalContextMenu();
          return;
        }

        // ------------------ 原有侧边栏会话与项目右键（高优先级保留） ------------------
        const convoRow = e.target?.closest?.('[data-testid="conversation-row-sidebar"]');
        if (convoRow) {
          const btn = convoRow.querySelector('button[aria-label="More options"]');
          if (btn) {
            e.preventDefault();
            e.stopPropagation();
            dismissUniversalContextMenu();
            lastContextMenuPos = { x: e.clientX, y: e.clientY, time: Date.now() };
            activeNativeConvoId = convoRow.getAttribute('data-cascade-id');
            activeNativeProjectObj = null;
            activeNativeProjectId = null;
            lastProjectActionTime = 0;
            btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
            btn.click();
            return;
          }
        }

        const projectCard = e.target?.closest?.('button[data-project-card="true"], .group\\/header');
        if (projectCard) {
          const container = projectCard.closest('.group\\/header') || projectCard.parentElement?.parentElement;
          const btn = container?.querySelector('button[aria-label="Project options"]');
          if (btn) {
            e.preventDefault();
            e.stopPropagation();
            dismissUniversalContextMenu();
            lastContextMenuPos = { x: e.clientX, y: e.clientY, time: Date.now() };
            activeNativeProjectObj = resolveProjectFromElement(projectCard) || resolveProjectFromElement(btn);
            activeNativeProjectId = activeNativeProjectObj?.id || null;
            activeNativeConvoId = null;
            lastProjectActionTime = Date.now();
            btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
            btn.click();
            return;
          }
        }

        const archiveProject = e.target?.closest?.('.agy-archive-item-header');
        if (archiveProject) {
          const btn = archiveProject.querySelector('.agy-quick-options-btn');
          if (btn) {
            e.preventDefault();
            e.stopPropagation();
            dismissUniversalContextMenu();
            lastContextMenuPos = { x: e.clientX, y: e.clientY, time: Date.now() };
            btn.click();
            return;
          }
        }

        const archiveConvo = e.target?.closest?.('.agy-convo-item');
        if (archiveConvo) {
          const btn = archiveConvo.querySelector('.agy-convo-options-btn');
          if (btn) {
            e.preventDefault();
            e.stopPropagation();
            dismissUniversalContextMenu();
            lastContextMenuPos = { x: e.clientX, y: e.clientY, time: Date.now() };
            btn.click();
            return;
          }
        }

        // ------------------ 通用上下文菜单实体嗅探 (Universal Context Sniffer) ------------------
        const target = e.target;
        if (!target) return;

        const selection = window.getSelection();
        const selectedText = selection ? selection.toString().trim() : '';
        const inSidebar = isRightSidebar(target) || !!target.closest('[data-aux-pane-open="true"]');

        // 目标 1: 图片 (Image)
        const imgEl = target.closest('img');
        if (imgEl && !selectedText) {
          e.preventDefault();
          e.stopPropagation();
          const imgDiskPath = resolveImageDiskPath(imgEl);
          const items = [
            { label: 'Copy Image', icon: 'image', action: () => copyImageBlob(imgEl) }
          ];

          // 仅当图片在本地磁盘上存在（已落盘/已上传/本地文件）时才提供“打开所在目录”与“复制路径”
          if (imgDiskPath) {
            items.push({ label: 'Reveal in Explorer', icon: 'folder', action: () => revealPath(imgDiskPath) });
            items.push({ label: 'Copy Path', icon: 'copy', action: () => {
              copyText(getDirectoryPath(imgDiskPath));
              showNotification?.('已复制所在目录');
            }});
          }

          // 另存为：自动生成或沿用 media_时间戳.png 命名，免去手动输入
          items.push({ label: 'Save Image As...', icon: 'save', action: () => saveImageLocally(imgEl) });

          renderMenu(items, e.clientX, e.clientY);
          return;
        }

        // 目标 2: 超链接 (Hyperlink / URL) - 若未划选其他文字
        const linkEl = target.closest('a[href]');
        if (linkEl && !selectedText) {
          const href = linkEl.href;
          if (!href.startsWith('file:///')) {
            e.preventDefault();
            e.stopPropagation();
            const items = [
              { label: 'Open Link in Browser', icon: 'external', action: () => openExternalUrl(href) },
              { label: 'Copy Link Address', icon: 'link', action: () => copyText(href) }
            ];
            renderMenu(items, e.clientX, e.clientY);
            return;
          }
        }

        // 目标 3: 本地路径 (Local Path)
        const localPath = resolveLocalPathString(target, selectedText);
        if (localPath && !selectedText) {
          e.preventDefault();
          e.stopPropagation();
          const isImg = isImageFilePath(localPath);
          const items = [
            { label: 'Reveal in Explorer', icon: 'folder', action: () => revealPath(localPath) },
            { label: 'Copy Path', icon: 'copy', action: () => {
              copyText(getDirectoryPath(localPath));
              showNotification?.('已复制所在目录');
            }}
          ];
          if (isImg) {
            items.push({ label: 'Copy Image', icon: 'image', action: () => copyImageFile(localPath) });
          }
          renderMenu(items, e.clientX, e.clientY);
          return;
        }

        // 目标 4: 文件实体 (AI 回复中的 Artifact 链接卡片 / 附件 / 标签项)
        const fileEntity = resolveFileCard(target);
        if (fileEntity && !selectedText) {
          e.preventDefault();
          e.stopPropagation();
          const isImg = isImageFilePath(fileEntity.filePath) || isImageFilePath(fileEntity.filename);
          const items = [
            { label: 'Reveal in Explorer', icon: 'folder', action: () => revealPath(fileEntity.filePath) },
            { label: 'Copy Path', icon: 'copy', action: () => {
              copyText(getDirectoryPath(fileEntity.filePath));
              showNotification?.('已复制所在目录');
            }}
          ];
          if (isImg) {
            items.push({ label: 'Copy Image', icon: 'image', action: () => copyImageFile(fileEntity.filePath) });
          }
          renderMenu(items, e.clientX, e.clientY);
          return;
        }

        // 目标 5: 选中文本 / 代码行 (Selected Text / Code Line)
        if (selectedText) {
          e.preventDefault();
          e.stopPropagation();
          let items = [];
          if (inSidebar) {
            // 右侧栏选中文本: Comment, Copy, Quote, Explain
            items = [
              { label: 'Comment', icon: 'comment', action: () => triggerNativeComment(selectedText) },
              { label: 'Copy', icon: 'copy', action: () => copyText(selectedText) },
              { label: 'Quote', icon: 'quote', action: () => triggerNativeQuote(selectedText) },
              { label: 'Explain', icon: 'explain', action: () => appendExplainToPrompt(selectedText) }
            ];
          } else {
            // 聊天区选中文本: Copy, Quote, Search
            items = [
              { label: 'Copy', icon: 'copy', action: () => copyText(selectedText) },
              { label: 'Quote', icon: 'quote', action: () => triggerNativeQuote(selectedText) },
              { label: 'Search', icon: 'search', action: () => {
                  window.open('https://www.google.com/search?q=' + encodeURIComponent(selectedText), '_blank');
                }
              }
            ];
          }
          renderMenu(items, e.clientX, e.clientY);
          return;
        }

        // 目标 6: 代码块 (未划选文字)
        const codeInfo = resolveCodeInfo(target);
        if (codeInfo) {
          e.preventDefault();
          e.stopPropagation();
          const nativeCopyCodeBtn = target.closest('pre, code, .code-block, .monaco-editor')?.querySelector?.('button[aria-label="Copy code"]');
          const items = [
            { label: 'Copy Code', icon: 'code', action: () => {
                if (nativeCopyCodeBtn) {
                  nativeCopyCodeBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                  nativeCopyCodeBtn.click();
                } else {
                  copyText(codeInfo.codeText);
                }
              }
            }
          ];
          // 如果该代码块位于已打开的 Artifact Viewer 或右侧栏中，补充 Reveal in Explorer 与纯所在目录 Copy Path
          const inArtifactViewer = target.closest('[aria-label="Artifact Viewer"], [role="region"][aria-label="Artifact Viewer"], #artifact-container, .artifact-view, [data-aux-pane-open="true"]') || isRightSidebar(target);
          if (inArtifactViewer) {
            const activePath = getActiveArtifactPath(target);
            if (activePath) {
              items.push({ label: 'Reveal in Explorer', icon: 'folder', action: () => revealPath(activePath) });
              items.push({ label: 'Copy Path', icon: 'copy', action: () => {
                copyText(getDirectoryPath(activePath));
                showNotification?.('已复制所在目录');
              }});
            }
          }
          items.push({ label: 'Save As...', icon: 'save', action: () => saveFileLocally(codeInfo.codeText, codeInfo.filename) });
          renderMenu(items, e.clientX, e.clientY);
          return;
        }

        // 目标 7: 右侧栏空白处 (Right Sidebar Blank Area - 打开所在目录 / 复制所在目录路径)
        if (inSidebar && !selectedText) {
          const activePath = getActiveArtifactPath(target);
          if (activePath) {
            e.preventDefault();
            e.stopPropagation();
            const isImg = isImageFilePath(activePath);
            const items = [
              { label: 'Reveal in Explorer', icon: 'folder', action: () => revealPath(activePath) },
              { label: 'Copy Path', icon: 'copy', action: () => {
                copyText(getDirectoryPath(activePath));
                showNotification?.('已复制所在目录');
              }}
            ];
            if (isImg) {
              items.push({ label: 'Copy Image', icon: 'image', action: () => copyImageFile(activePath) });
            }
            renderMenu(items, e.clientX, e.clientY);
            return;
          }
        }

      };

      document.addEventListener('contextmenu', contextMenuHandler, true);
    }

    // ==================== 9. 对话滚动位置记忆与恢复 (Scroll Position Persistence) ====================
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

      interruptRestoration = (reason) => {
        markUserInteracting();
        if (activeRestoringConvoId) {
          endRestoration(reason || 'interrupted by enhancer action');
        }
      };

      // 拦截原生 scrollTo：阻止在恢复期间由于 ResizeObserver 强制滑到底部
      originalElementScrollTo = Element.prototype.scrollTo;
      Element.prototype.scrollTo = function (...args) {
        // 关键防护：如果是增强器自身发起的平滑翻页滚动，绝对不予拦截！
        if (isInternalEnhancerScroll) {
          return originalElementScrollTo.apply(this, args);
        }
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
          // 关键防护：若用户点击的是增强器悬浮翻页按钮组，立即判定为合法用户交互并解除恢复
          if (e.target.closest('#agy-page-nav-group, .agy-nav-btn')) {
            markUserInteracting();
            if (activeRestoringConvoId) {
              endRestoration('nav button clicked');
            }
            return;
          }
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
          // 仅在当前确实是用户在查看该对话时才保存
          if (currentActiveConvoId && isUserInteracting) {
            recordConvoPosition(currentActiveConvoId);
          }
          currentActiveConvoId = effectiveConvoId;

          const saved = convoPositionsMap.get(effectiveConvoId);
          if (saved && !saved.isBottom && saved.scrollTop > 5) {
            console.log(`[agy-enhancer] Switched to convo [${effectiveConvoId}], restoring position (scrollTop: ${saved.scrollTop}px)`);
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
      addInterval(handleConvoSwitch, 350);

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

      // 软件窗口关闭/刷新时，确保当前激活的对话位置立即落盘
      windowUnloadHandler = () => {
        if (currentActiveConvoId && !activeRestoringConvoId) {
          recordConvoPosition(currentActiveConvoId);
        }
      };
      window.addEventListener('beforeunload', windowUnloadHandler);
      window.addEventListener('pagehide', windowUnloadHandler);
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
        let sumChildHeight = 0;
        if (el.children.length > 0) {
          for (let i = 0; i < el.children.length; i++) {
            sumChildHeight += el.children[i].offsetHeight;
          }
        }
        const contentHeight = Math.max(sumChildHeight, el.scrollHeight, el.offsetHeight);
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
          console.log(`[agy-enhancer] Convo [${convoId}] marked as unread (${reason})`);
          syncSidebarIndicators();
        }
        const container = getChatScrollContainer();
        const effectiveConvoId = (container ? getContainerConvoId(container) : null) || getCurrentUrlConvoId();
        if (effectiveConvoId === convoId) {
          setupViewingSession(convoId);
        }
      }

      function markConvoAsSeen(convoId, reason) {
        if (!convoId) return;
        if (unreadConvosMap.has(convoId)) {
          unreadConvosMap.delete(convoId);
          saveUnreadStates();
          console.log(`[agy-enhancer] Convo [${convoId}] marked as seen (${reason})`);
          cleanupViewingSession();
          syncSidebarIndicators();
        }
      }

      // 浏览状态机
      let currentViewingConvoId = null;
      let hasLeftBottom = false;
      let longTextBottomTimer = null;
      let shortTextStayTimer = null;
      let viewingSessionType = null; // 'long' | 'short'

      function cleanupViewingSession() {
        if (longTextBottomTimer) {
          clearTimeout(longTextBottomTimer);
          longTextBottomTimer = null;
        }
        if (shortTextStayTimer) {
          clearTimeout(shortTextStayTimer);
          shortTextStayTimer = null;
        }
        currentViewingConvoId = null;
        hasLeftBottom = false;
        viewingSessionType = null;
      }

      function setupViewingSession(convoId) {
        if (!convoId || !unreadConvosMap.has(convoId)) {
          cleanupViewingSession();
          return;
        }

        // 同一对话查看期间，保留用户已离开底部的状态，切勿反复重置
        if (currentViewingConvoId === convoId) {
          return;
        }

        cleanupViewingSession();
        currentViewingConvoId = convoId;
        const container = getChatScrollContainer();
        if (!container) return;

        const isLong = checkIsLongText();
        viewingSessionType = isLong ? 'long' : 'short';
        console.log(`[agy-enhancer] Convo [${convoId}] is unread, tracking view (type: ${isLong ? 'long' : 'short'})`);

        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
        const distFromBottom = maxScroll - container.scrollTop;
        const leaveThreshold = Math.min(USER_CONFIG.LEAVE_BOTTOM_THRESHOLD, Math.max(30, maxScroll * 0.5));
        // 如果一进来就已经在较上面（例如位置记忆恢复在顶部/中间），判定已离开底部
        hasLeftBottom = distFromBottom > leaveThreshold;

        if (!isLong) {
          // 短文条件二：停留满 10s 即已读
          shortTextStayTimer = setTimeout(() => {
            if (currentViewingConvoId === convoId && unreadConvosMap.has(convoId)) {
              markConvoAsSeen(convoId, 'Short text stayed for 10s');
            }
          }, USER_CONFIG.SHORT_TEXT_VIEW_DURATION_MS);
        }
      }

      function handleViewingScroll() {
        const container = getChatScrollContainer();
        if (!container) return;

        const effectiveConvoId = getContainerConvoId(container) || getCurrentUrlConvoId();
        if (!effectiveConvoId || !unreadConvosMap.has(effectiveConvoId)) {
          if (currentViewingConvoId) cleanupViewingSession();
          return;
        }

        if (currentViewingConvoId !== effectiveConvoId) {
          setupViewingSession(effectiveConvoId);
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
            console.log(`[agy-enhancer] Convo [${effectiveConvoId}] left bottom (${Math.round(distFromBottom)}px), waiting for re-bottoming`);
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
          const isLong = viewingSessionType ? (viewingSessionType === 'long') : checkIsLongText();
          if (!isLong) {
            // 短文：二次触底立即满足已读条件，即刻标记为已读！
            console.log(`[agy-enhancer] Convo [${effectiveConvoId}] short text re-bottomed, marking as seen`);
            markConvoAsSeen(effectiveConvoId, 'Short text re-bottomed');
          } else {
            // 长文：二次触底 + 底部平稳停留 5 秒同时满足
            if (!longTextBottomTimer) {
              console.log(`[agy-enhancer] Convo [${effectiveConvoId}] long text re-bottomed, starting 5s countdown`);
              longTextBottomTimer = setTimeout(() => {
                if (currentViewingConvoId === effectiveConvoId && unreadConvosMap.has(effectiveConvoId)) {
                  console.log(`[agy-enhancer] Convo [${effectiveConvoId}] long text stayed for 5s, marking as seen`);
                  markConvoAsSeen(effectiveConvoId, 'Long text re-bottomed and stayed for 5s');
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
          handleViewingScroll();
        }
      };
      window.addEventListener('scroll', unreadScrollHandler, true);

      unreadWheelHandler = (e) => {
        const container = getChatScrollContainer();
        if (!container) return;
        if (container.contains(e.target) || e.target === container) {
          setTimeout(handleViewingScroll, 16);
        }
      };
      window.addEventListener('wheel', unreadWheelHandler, { capture: true, passive: true });

      // 周期性检测触底与停留状态（弥补平滑滚动与动态内容渲染）
      addInterval(handleViewingScroll, 400);

      // 对话切换监测
      let trackedConvoId = null;
      function checkConvoSwitchForUnread() {
        const container = getChatScrollContainer();
        const effectiveConvoId = (container ? getContainerConvoId(container) : null) || getCurrentUrlConvoId();
        if (effectiveConvoId && effectiveConvoId !== trackedConvoId) {
          trackedConvoId = effectiveConvoId;
          if (unreadConvosMap.has(effectiveConvoId)) {
            setupViewingSession(effectiveConvoId);
          } else {
            cleanupViewingSession();
          }
        }
      }
      addInterval(checkConvoSwitchForUnread, 400);

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

        // 1. 处理后台原生完成未读点：直接同步为未读（仅针对非当前激活的后台对话）
        rowNativeDotIds.forEach(id => {
          if (id !== activeConvoId) {
            activelyGeneratingConvos.delete(id);
            promptSubmittedConvos.delete(id);
            if (!unreadConvosMap.has(id)) {
              markConvoAsUnread(id, 'Captured native completion dot');
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
                console.log(`[agy-enhancer] Foreground convo [${genId}] AI response completed, marking unread`);
                markConvoAsUnread(genId, 'Foreground AI response completed');
              }
            }
          } else {
            // 当前处于后台的对话：只要侧边栏无 spinner 且无 stop 按钮，即判定后台完成
            const isStillGenerating = rowGeneratingIds.has(genId);
            if (!isStillGenerating) {
              activelyGeneratingConvos.delete(genId);
              promptSubmittedConvos.delete(genId);
              if (record.confirmedGenerated) {
                console.log(`[agy-enhancer] Background convo [${genId}] AI response completed, marking unread`);
                markConvoAsUnread(genId, 'Background AI response completed');
              }
            }
          }
        }
      }
      addInterval(checkGeneratingAndUnreadState, 400);

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
                  badge.title = 'Unread (auto-clears after viewing)';
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
      addInterval(syncSidebarIndicators, 400);

      // 对外暴露辅助方法供右键菜单等模块协同调用与测试
      window.__AGY_MARK_SEEN__ = (id) => markConvoAsSeen(id || getCurrentUrlConvoId(), 'manual API');
      window.__AGY_MARK_UNREAD__ = (id) => markConvoAsUnread(id || getCurrentUrlConvoId(), 'manual API');
      window.__AGY_IS_UNREAD__ = (id) => unreadConvosMap.has(id || getCurrentUrlConvoId());
      window.__AGY_UNREAD_MAP__ = unreadConvosMap;
      window.__AGY_GENERATING_MAP__ = activelyGeneratingConvos;
      window.__AGY_PROMPT_SUBMITTED_MAP__ = promptSubmittedConvos;
    }

    // ==================== 11. 划词原生浮窗拦截 (Block Quote & Comment Popups) ====================
    function initQuotePopupInterceptor() {
      if (!USER_CONFIG.ENABLE_BLOCK_QUOTE_POPUP) return;

      const styleId = 'agy-quote-interceptor-styles';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `
          /* 纯 Quote / Comment 独立悬浮气泡彻底隐藏 */
          [data-agy-block-quote="true"] {
            display: none !important;
            pointer-events: none !important;
          }
          /* 工具栏中子项隐藏 */
          .agy-hide-quote-item {
            display: none !important;
            pointer-events: none !important;
          }
        `;
        document.head.appendChild(styleEl);
      }

      // 严格排除编辑器内部与输入框，绝对不介入编辑器 DOM
      function isIgnoredContainer(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable) return true;
        if (el.closest?.('.monaco-editor, .view-line, .view-lines, .monaco-workbench, [contenteditable="true"], textarea, input')) {
          return true;
        }
        return false;
      }

      // 准确判断是否为 Quote 或 Comment 浮窗按钮或气泡
      function isBlockedPopupTarget(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
        if (isIgnoredContainer(el)) return false;

        const ariaLabel = (el.getAttribute?.('aria-label') || '').trim();
        const title = (el.getAttribute?.('title') || '').trim();

        // 1. 匹配 Quote / 引用 (如 Quote Ctrl+L)
        const isQuote = /^(Quote|引用)(\s*\(?(Ctrl|⌘|\^)\+?L\)?)?$/i.test(ariaLabel) ||
                        /^(Quote|引用)(\s*\(?(Ctrl|⌘|\^)\+?L\)?)?$/i.test(title);

        // 2. 匹配 Comment / 评论 (如 Comment Ctrl+Alt+M)
        const isComment = /^(Comment|评论)(\s*\(?(Ctrl|⌘|\^)\+?(Alt\+)?M\)?)?$/i.test(ariaLabel) ||
                          /^(Comment|评论)(\s*\(?(Ctrl|⌘|\^)\+?(Alt\+)?M\)?)?$/i.test(title);

        if (isQuote || isComment) return true;

        // 3. 匹配按钮纯文本短词
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
        if (/^(Quote|引用)(\s*(Ctrl|⌘|\^)\+?L)?$/i.test(text)) return true;
        if (/^(Comment|评论)(\s*(Ctrl|⌘|\^)\+?(Alt\+)?M)?$/i.test(text)) return true;

        return false;
      }

      function handleBlockedElement(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
        if (el.closest?.('.agy-page-nav-group, #agy-archive-panel, #agy-enhancer-toast, #agy-universal-context-menu')) return;
        if (el.hasAttribute('data-agy-block-quote') || el.classList.contains('agy-hide-quote-item')) return;

        // 往上寻找悬浮容器（最多向上 3 层，严禁使用 getComputedStyle）
        let container = null;
        let curr = el;
        for (let i = 0; i < 3; i++) {
          if (!curr || curr === document.body || curr === document.documentElement) break;
          const role = curr.getAttribute?.('role');
          if (role === 'tooltip' || role === 'toolbar' || role === 'menu' || curr.hasAttribute?.('data-radix-popper-content-wrapper')) {
            container = curr;
            break;
          }
          curr = curr.parentElement;
        }

        const btn = el.closest('button, [role="button"]') || el;

        if (container) {
          container.setAttribute('data-agy-block-quote', 'true');
        } else {
          btn.classList.add('agy-hide-quote-item');
        }
      }

      function inspectNode(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
        if (isIgnoredContainer(node)) return;

        if (isBlockedPopupTarget(node)) {
          handleBlockedElement(node);
          return;
        }

        // 仅在新增节点的直接子节点中查找候选按钮
        const buttons = node.querySelectorAll?.('button, [role="button"], [role="tooltip"]');
        if (buttons && buttons.length > 0) {
          for (const btn of buttons) {
            if (isBlockedPopupTarget(btn)) {
              handleBlockedElement(btn);
            }
          }
        }
      }

      // 仅监听 DOM 新增节点（严禁监听 attributes，彻底杜绝死循环和主线程卡死）
      quoteObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const added of m.addedNodes) {
            if (added.nodeType === Node.ELEMENT_NODE) {
              inspectNode(added);
            }
          }
        }
      });

      quoteObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
      });
    }

    initProjectArchiver();
    initContextMenuSupport();
    initConversationScrollPersistence();
    initSmartUnreadTracker();
    initQuotePopupInterceptor();

    console.log('[agy-enhancer] Page navigator, project archiver, context menu, scroll memory, unread tracker, and quote interceptor ready!');
  }

  bootstrap();
})();
