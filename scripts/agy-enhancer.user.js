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

window.__AGY_BRANCH_TAG__ = " (branch)";
window.__AGY_BRANCH_NAME__ = "edit_scheduled_task_setting";
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
  const INJECTED_CONFIG = (typeof window.__AGY_CONFIG__ === 'object' && window.__AGY_CONFIG__) ? window.__AGY_CONFIG__ : {};

  const USER_CONFIG = Object.assign({
    // 【总控开关】增强器全局总开关
    ENABLE_MASTER: true,

    // 【状态指示】右上角状态指示小圆点与启动 Toast
    ENABLE_STATUS_INDICATOR: true,

    // 【右键增强】全局右键菜单总开关
    ENABLE_CONTEXT_MENU: true,

    // 【选词弹窗】是否屏蔽划词选中文本时弹出的 Quote (Ctrl+L) 浮窗（依附于右键总开关）
    ENABLE_BLOCK_QUOTE_POPUP: true,

    // 【文件浏览】是否屏蔽项目右键菜单中的原生 Show in File Explorer（依附于右键总开关）
    ENABLE_BLOCK_FILE_EXPLORER: true,

    // 【原生复制】是否屏蔽左侧栏会话与项目右键菜单中的原生 Copy 菜单项（依附于右键总开关）
    ENABLE_BLOCK_SIDEBAR_COPY: true,

    // 【会话分叉】是否开启会话切片分叉与分支创建功能（独立开关，并在右键菜单中提供入口）
    ENABLE_FORK_CONVERSATION: true,

    // 【定时任务编辑】是否开启 Scheduled Tasks 定时任务快捷编辑与重新修改（在列表项菜单中添加 Edit 选项）
    ENABLE_EDIT_SCHEDULED_TASKS: true,

    // 【历史会话折叠】是否在打开 Conversation History 页面时默认折叠所有项目列表
    ENABLE_COLLAPSE_HISTORY_PROJECTS: true,

    // 【工作树管理】是否开启分支与工作树快捷管理、悬停删除与右键菜单（受全局右键与独立开关控制）
    ENABLE_WORKTREE_MANAGEMENT: true,

    // 【环境与缓存同步】是否在开辟新工作树分支时自动同步 .env 与配置共享编译缓存
    ENABLE_WORKTREE_AUTO_SYNC: true,

    // 【总结钉选】是否开启 AI 回复消息钉选与画中画悬浮速览面板
    ENABLE_PINNED_SUMMARY: true,

    // 【翻页导航】右侧常驻智能翻页双按钮
    ENABLE_NAV_BUTTONS: true,

    // 【向下图标】是否屏蔽聊天框上方官方原生的居中向下滚动圆钮
    ENABLE_BLOCK_CHAT_BOTTOM_BUTTON: true,

    // 【项目归档】左侧项目折叠与归档抽屉
    ENABLE_PROJECT_ARCHIVER: true,

    // 【阅读记忆】是否开启多对话滚动位置记忆与恢复
    ENABLE_SCROLL_POSITION_PERSISTENCE: true,

    // 【智能未读】是否开启智能已读/未读状态追踪与提醒
    ENABLE_SMART_UNREAD: true,

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

    // 右上角提示收折时长（毫秒，默认 3500ms 即 3.5 秒）
    TOAST_EXPAND_DURATION_MS: 3500,

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
  }, INJECTED_CONFIG);

  // 兼容参数别名
  if (typeof INJECTED_CONFIG.ENABLE_SCROLL_PERSISTENCE === 'boolean') {
    USER_CONFIG.ENABLE_SCROLL_POSITION_PERSISTENCE = INJECTED_CONFIG.ENABLE_SCROLL_PERSISTENCE;
  }

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
  let activeNativeConvoTitle = '';
  let lastNativeConvoId = null;
  let lastNativeConvoTitle = '';
  let activeNativeProjectObj = null;
  let activeNativeProjectId = null;
  let lastProjectActionTime = 0;
  let activeSidecarRow = null;
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
  let unreadScrollRafId = null;
  let windowUnloadHandler = null;
  let interruptRestoration = null;
  let isInternalEnhancerScroll = false;
  let quoteObserver = null;
  let quoteSelectionHandler = null;
  let contextMenuDocClickHandler = null;
  let contextMenuDocKeydownHandler = null;
  let convoSwitchPopstateHandler = null;
  let typingKeydownHandler = null;
  let worktreeObserver = null;
  let worktreeContextMenuHandler = null;
  let onHeartbeatProjectArchiver = null;
  let onHeartbeatScrollPersistence = null;
  let onHeartbeatSmartUnread = null;
  let onHeartbeatWorktreeManagement = null;
  let onHeartbeatPinnedSummary = null;
  let onHeartbeatHistoryProjectsCollapser = null;
  let historyLinkClickHandler = null;
  let historyPopstateHandler = null;
  let isAiTurnPinned = null;
  let toggleAiTurnPin = null;
  let pinAiTurnFromSelection = null;
  let pinClickSwitchHandler = null;
  let pinPopstateHandler = null;

  // 精准全局用户按键打字感知：仅在用户真实按键输入的 350ms 内抑制后台轮询，光标常驻聚焦不影响功能
  let lastTypingTime = 0;
  function markUserTyping() {
    lastTypingTime = Date.now();
  }

  function isUserTyping() {
    return (Date.now() - lastTypingTime) < 350;
  }

  typingKeydownHandler = (e) => {
    const target = e.target;
    if (!target) return;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable || target.closest?.('input, textarea, [contenteditable="true"], .monaco-editor')) {
      lastTypingTime = Date.now();
    }
  };
  window.addEventListener('keydown', typingKeydownHandler, { capture: true, passive: true });
  window.addEventListener('compositionstart', markUserTyping, { capture: true, passive: true });
  window.addEventListener('compositionupdate', markUserTyping, { capture: true, passive: true });

  window.__AGY_ENHANCER_CLEANUP__ = function () {
    activeTimers.forEach(id => {
      clearInterval(id);
      clearTimeout(id);
    });
    activeTimers.length = 0;

    if (typingKeydownHandler) {
      window.removeEventListener('keydown', typingKeydownHandler, true);
      typingKeydownHandler = null;
    }
    window.removeEventListener('compositionstart', markUserTyping, true);
    window.removeEventListener('compositionupdate', markUserTyping, true);

    onHeartbeatProjectArchiver = null;
    onHeartbeatScrollPersistence = null;
    onHeartbeatSmartUnread = null;
    onHeartbeatWorktreeManagement = null;
    onHeartbeatPinnedSummary = null;
    onHeartbeatHistoryProjectsCollapser = null;
    isAiTurnPinned = null;
    toggleAiTurnPin = null;
    pinAiTurnFromSelection = null;

    if (windowPopstateHandler) {
      window.removeEventListener('popstate', windowPopstateHandler);
      windowPopstateHandler = null;
    }
    if (convoSwitchPopstateHandler) {
      window.removeEventListener('popstate', convoSwitchPopstateHandler);
      convoSwitchPopstateHandler = null;
    }
    if (pinClickSwitchHandler) {
      document.removeEventListener('click', pinClickSwitchHandler, true);
      pinClickSwitchHandler = null;
    }
    if (pinPopstateHandler) {
      window.removeEventListener('popstate', pinPopstateHandler, true);
      pinPopstateHandler = null;
    }
    if (historyLinkClickHandler) {
      document.removeEventListener('click', historyLinkClickHandler, true);
      historyLinkClickHandler = null;
    }
    if (historyPopstateHandler) {
      window.removeEventListener('popstate', historyPopstateHandler, true);
      historyPopstateHandler = null;
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
    if (worktreeContextMenuHandler) {
      document.removeEventListener('contextmenu', worktreeContextMenuHandler, true);
      worktreeContextMenuHandler = null;
    }
    if (contextMenuDocClickHandler) {
      document.removeEventListener('click', contextMenuDocClickHandler, true);
      contextMenuDocClickHandler = null;
    }
    if (contextMenuDocKeydownHandler) {
      document.removeEventListener('keydown', contextMenuDocKeydownHandler, true);
      contextMenuDocKeydownHandler = null;
    }
    lastContextMenuPos = null;
    activeNativeConvoId = null;
    activeNativeProjectObj = null;
    activeNativeProjectId = null;
    lastProjectActionTime = 0;
    activeSidecarRow = null;
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
    if (unreadScrollRafId) {
      cancelAnimationFrame(unreadScrollRafId);
      unreadScrollRafId = null;
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
    if (quoteSelectionHandler) {
      ['pointerup', 'mouseup', 'selectionchange'].forEach(type => {
        document.removeEventListener(type, quoteSelectionHandler, true);
      });
      quoteSelectionHandler = null;
    }

    document.getElementById('agy-quote-interceptor-styles')?.remove();
    document.getElementById('agy-block-bottom-btn-styles')?.remove();
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

    if (worktreeObserver) {
      worktreeObserver.disconnect();
      worktreeObserver = null;
    }
    onHeartbeatWorktreeManagement = null;

    document.getElementById('agy-confirm-modal-overlay')?.remove();
    document.querySelectorAll('.agy-wt-hover-trash').forEach(el => el.remove());
    document.querySelectorAll('[data-agy-worktree-item="true"]').forEach(el => el.removeAttribute('data-agy-worktree-item'));
    document.querySelectorAll('[data-agy-branch-item="true"]').forEach(el => el.removeAttribute('data-agy-branch-item'));

    document.getElementById('agy-universal-context-menu')?.remove();
    document.getElementById('agy-context-menu-styles')?.remove();
    document.getElementById('agy-enhancer-styles')?.remove();
    if (window.__AGY_PANE_TRACKER_CLEANUP__) {
      try { window.__AGY_PANE_TRACKER_CLEANUP__(); } catch (e) {}
      window.__AGY_PANE_TRACKER_CLEANUP__ = null;
    }
    document.getElementById('agy-page-nav-group')?.remove();
    document.getElementById('agy-scroll-bottom-btn')?.remove();
    document.getElementById('agy-enhancer-toast')?.remove();
    document.getElementById('agy-archive-header-btn')?.remove();
    document.getElementById('agy-archive-panel')?.remove();
    document.getElementById('agy-project-options-dropdown')?.remove();
    document.getElementById('agy-convo-options-dropdown')?.remove();
    document.querySelectorAll('.agy-quick-archive-btn').forEach(el => el.remove());
    document.querySelectorAll('.agy-unread-dot-badge').forEach(el => el.remove());
    document.getElementById('agy-pinned-bar')?.remove();
    document.getElementById('agy-pinned-nav-indicator')?.remove();
    document.getElementById('agy-pip-modal')?.remove();
    document.getElementById('agy-pip-dock')?.remove();
    document.getElementById('agy-pinned-styles')?.remove();
    document.querySelectorAll('.agy-pin-btn').forEach(el => el.remove());
    document.querySelectorAll('.agy-user-pin-btn').forEach(el => el.remove());
    document.querySelectorAll('.agy-ai-pin-btn').forEach(el => el.remove());
    document.querySelectorAll('.agy-pulse-highlight, .agy-pulse-highlight-red').forEach(el => el.classList.remove('agy-pulse-highlight', 'agy-pulse-highlight-red'));
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
    if (USER_CONFIG.ENABLE_MASTER === false) {
      console.log('[agy-enhancer] Master switch is OFF, enhancer is completely dormant.');
      document.getElementById('agy-enhancer-toast')?.remove();
      window.__AGY_ENHANCER_LOADED__ = false;
      return;
    }

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
        position: fixed !important;
        right: ${USER_CONFIG.NAV_RIGHT}px !important;
        bottom: ${USER_CONFIG.NAV_BOTTOM}px !important;
        left: auto !important;
        top: auto !important;
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
        background: var(--popover, var(--card, var(--sidebar, var(--background, #ffffff))));
        color: var(--popover-foreground, var(--foreground, #101010));
        border: 1px solid var(--border, rgba(125, 125, 125, 0.25));
        border-radius: var(--radius, 8px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
        padding: 4px;
        min-width: 160px;
        display: flex;
        flex-direction: column;
        gap: 1px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 13px;
        line-height: 19.5px;
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
        background: var(--popover, var(--card, var(--sidebar, var(--background, #ffffff))));
        color: var(--popover-foreground, var(--foreground, #101010));
        border: 1px solid var(--border, rgba(125, 125, 125, 0.25));
        border-radius: var(--radius, 8px);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.1);
        padding: 4px;
        min-width: 150px;
        flex-direction: column;
        gap: 2px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 13px;
        line-height: 19.5px;
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
        justify-content: space-between;
        padding: 5px 8px;
        border-radius: 6px;
        color: var(--muted-foreground);
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
        text-decoration: none;
        box-sizing: border-box;
      }
      .agy-convo-item:hover {
        background: var(--secondary, rgba(125, 125, 125, 0.15));
        color: var(--foreground);
      }
      .agy-convo-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        flex: 1;
      }
      .agy-convo-top-row {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        width: 100%;
      }
      .agy-convo-title {
        flex: 1;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 13px;
        line-height: 1.3;
        color: var(--foreground);
      }
      .agy-convo-time {
        font-size: 11px;
        color: var(--muted-foreground);
        opacity: 0.65;
        flex-shrink: 0;
        margin-left: 4px;
        user-select: none;
      }
      .agy-convo-item:hover .agy-convo-time,
      .agy-convo-item:has(.agy-convo-options-btn.active) .agy-convo-time {
        display: none;
      }
      .agy-convo-subtext {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        width: 100%;
        font-size: 11px;
        color: var(--muted-foreground);
        opacity: 0.75;
        user-select: none;
      }
      .agy-convo-subtext svg {
        opacity: 0.7;
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

      /* 工作树/分支列表项悬停删除图标 */
      .agy-wt-hover-trash {
        position: absolute !important;
        right: 6px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 24px !important;
        height: 24px !important;
        border-radius: 4px !important;
        border: none !important;
        background: transparent !important;
        color: var(--muted-foreground, rgba(125, 125, 125, 0.7)) !important;
        opacity: 0 !important;
        cursor: pointer !important;
        outline: none !important;
        margin: 0 !important;
        padding: 0 !important;
        flex-shrink: 0 !important;
        transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease, transform 0.15s ease !important;
        pointer-events: auto !important;
        z-index: 25 !important;
      }
      *:hover > .agy-wt-hover-trash,
      [data-agy-worktree-item="true"]:hover > .agy-wt-hover-trash,
      [data-agy-branch-item="true"]:hover > .agy-wt-hover-trash,
      [data-testid="branch-option"]:hover .agy-wt-hover-trash,
      [role="option"]:hover .agy-wt-hover-trash,
      [role="menuitem"]:hover .agy-wt-hover-trash,
      button:hover > .agy-wt-hover-trash,
      div:hover > .agy-wt-hover-trash {
        opacity: 0.75 !important;
      }
      .agy-wt-hover-trash:hover {
        opacity: 1 !important;
        color: var(--destructive, #ef4444) !important;
        background: rgba(239, 68, 68, 0.16) !important;
        transform: translateY(-50%) scale(1.1) !important;
      }

      /* 列表项强制相对定位与右侧留白，防止垃圾桶遮挡标题与换行变形 */
      [data-agy-worktree-item="true"],
      [data-agy-branch-item="true"] {
        position: relative !important;
        padding-right: 34px !important;
        box-sizing: border-box !important;
      }

      /* 二次确认模态框 */
      .agy-confirm-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000000;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        animation: agyFadeIn 0.14s ease-out;
      }
      .agy-confirm-overlay.fade-out {
        opacity: 0;
        transition: opacity 0.16s ease-out;
      }
      .agy-confirm-card {
        box-sizing: border-box;
        width: 380px;
        max-width: calc(100vw - 32px);
        background: var(--popover, var(--card, var(--sidebar, #1e1e24)));
        color: var(--foreground, #ffffff);
        border: 1px solid var(--border, rgba(125, 125, 125, 0.25));
        border-radius: var(--radius, 10px);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), 0 2px 10px rgba(0, 0, 0, 0.2);
        padding: 18px 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        animation: agyCardPop 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes agyCardPop {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .agy-confirm-title {
        font-size: 15px;
        font-weight: 600;
        line-height: 1.3;
      }
      .agy-confirm-title.danger {
        color: var(--destructive, #ef4444);
      }
      .agy-confirm-body {
        font-size: 13px;
        line-height: 1.6;
        color: var(--muted-foreground, rgba(255, 255, 255, 0.75));
      }
      .agy-confirm-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 6px;
      }
      .agy-confirm-btn {
        padding: 6px 15px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        outline: none;
        border: 1px solid transparent;
        transition: all 0.15s ease;
      }
      .agy-confirm-cancel {
        background: transparent;
        border-color: var(--border, rgba(125, 125, 125, 0.25));
        color: var(--foreground, #ffffff);
      }
      .agy-confirm-cancel:hover {
        background: var(--secondary, rgba(125, 125, 125, 0.15));
      }
      .agy-confirm-danger {
        background: var(--destructive, #ef4444);
        color: #ffffff;
      }
      .agy-confirm-danger:hover {
        background: #dc2626;
      }
    `;
    document.head.appendChild(styleEl);

    // ==================== 2. 创建右上角生效通知 Toast ====================
    let showNotification = (msg) => {};

    function openSettingsDashboard() {
      const localFile = window.__AGY_SETTINGS_FILE__;
      const url = localFile ? ('file:///' + localFile.replace(/\\/g, '/')) : 'http://127.0.0.1:37210/';

      // 1. 发送专用 DevTools 信标，由后台守护服务在宿主系统中通过默认浏览器直接唤起 settings.html
      const actionToken = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      console.log(`[AGY_OPEN_SETTINGS][${actionToken}]` + (localFile || url));

      // 2. 如果环境具备 Electron 原生 openExternal 支持，一并调用以确保万无一失
      if (window.electronNative?.openExternal) {
        try {
          window.electronNative.openExternal(url);
        } catch (e) {
          console.warn('[agy-enhancer] openExternal error:', e);
        }
      }
    }

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

        toast.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          openSettingsDashboard();
        });
      } else {
        // 已存在单例 Toast，更新标题并重新绑定点击处理
        toast.title = `Antigravity Enhancer ready${branchTag}`;
        if (!toast.classList.contains('collapsed')) {
          toast.classList.add('collapsed');
        }
        toast.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          openSettingsDashboard();
        };
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

    if (USER_CONFIG.ENABLE_STATUS_INDICATOR !== false) {
      createToast();
    } else {
      document.getElementById('agy-enhancer-toast')?.remove();
    }

    // ==================== 3. 核心容器与纸张坐标算法（支持分屏与多会话） ====================

    let lastInteractedPane = null;

    /**
     * 获取当前处于激活/聚焦状态的分屏窗格 (Active Split Pane)
     */
    function getActivePane() {
      // 1. 如果当前获得焦点的元素处于某个分屏内
      if (document.activeElement && document.activeElement !== document.body) {
        const paneFromActive = document.activeElement.closest?.('.group\\/pane[data-pane-id], [data-pane-id]');
        if (paneFromActive && paneFromActive.isConnected) {
          return paneFromActive.classList?.contains('group/pane') ? paneFromActive : (paneFromActive.querySelector?.('.group\\/pane') || paneFromActive);
        }
      }

      // 2. 查找官方 Antigravity 标记为激活状态的分屏：
      // 在多会话分屏布局中，官方聚焦的窗格没有 data-pane-unfocused 属性，失焦窗格带有 data-pane-unfocused=""
      const activePanes = Array.from(document.querySelectorAll('.group\\/pane[data-pane-id]:not([data-pane-unfocused])'));
      if (activePanes.length > 0) {
        if (lastInteractedPane && lastInteractedPane.isConnected && activePanes.includes(lastInteractedPane)) {
          return lastInteractedPane;
        }
        const validWithChat = activePanes.find(p => p.querySelector?.('.scrollbar-hide.md-table-bleed, .overflow-y-auto.md-table-bleed, .relative.flex.flex-col.gap-y-3, .flex.flex-col.gap-y-3'));
        if (validWithChat) return validWithChat;
        return activePanes[0];
      }

      // 3. 用户最近一次交互或鼠标悬停的分屏
      if (lastInteractedPane && lastInteractedPane.isConnected) {
        return lastInteractedPane;
      }

      // 4. 通用降级：查找任何带有 [data-pane-id] 且未失焦的分屏
      const fallbackActive = document.querySelector('[data-pane-id]:not([data-pane-unfocused])');
      if (fallbackActive) {
        return fallbackActive.querySelector?.('.group\\/pane') || fallbackActive;
      }

      return null;
    }

    /**
     * 全局捕获用户在不同分屏内的交互动作，实时更新激活分屏记忆
     */
    function setupPaneInteractionTracker() {
      if (window.__AGY_PANE_TRACKER_CLEANUP__) {
        try { window.__AGY_PANE_TRACKER_CLEANUP__(); } catch (e) {}
        window.__AGY_PANE_TRACKER_CLEANUP__ = null;
      }

      const handlePaneInteraction = (e) => {
        const pane = e.target?.closest?.('.group\\/pane[data-pane-id], [data-pane-id]');
        if (pane) {
          const inner = pane.classList?.contains('group/pane') ? pane : (pane.querySelector?.('.group\\/pane') || pane);
          if (inner && inner !== lastInteractedPane) {
            lastInteractedPane = inner;
          }
        }
      };

      const handleHover = (e) => {
        // 忽略悬停在浮动导航按钮本身的动作，避免遮挡或改变当前正在阅读的分屏目标
        if (e.target?.closest?.('#agy-page-nav-group, .agy-nav-btn')) return;
        handlePaneInteraction(e);
      };

      window.addEventListener('pointerdown', handlePaneInteraction, { capture: true, passive: true });
      window.addEventListener('focusin', handlePaneInteraction, { capture: true, passive: true });
      window.addEventListener('wheel', handlePaneInteraction, { capture: true, passive: true });
      window.addEventListener('pointerover', handleHover, { capture: true, passive: true });

      window.__AGY_PANE_TRACKER_CLEANUP__ = () => {
        window.removeEventListener('pointerdown', handlePaneInteraction, { capture: true });
        window.removeEventListener('focusin', handlePaneInteraction, { capture: true });
        window.removeEventListener('wheel', handlePaneInteraction, { capture: true });
        window.removeEventListener('pointerover', handleHover, { capture: true });
      };
    }
    setupPaneInteractionTracker();

    /**
     * 获取聊天主滚动容器（优先在激活的分屏窗格中查找）
     */
    function getChatScrollContainer(targetPane = null) {
      const root = targetPane || getActivePane() || document;

      // 1. 优先在指定/激活分屏范围内查找官方特征类
      const candidate = root.querySelector?.('.scrollbar-hide.md-table-bleed') ||
                        root.querySelector?.('.overflow-y-auto.md-table-bleed');
      if (candidate && candidate.clientHeight > 200) {
        return candidate;
      }

      // 2. 根据回合列表向上追溯可滚动容器
      const turnContainer = root.querySelector?.('.relative.flex.flex-col.gap-y-3, .flex.flex-col.gap-y-3');
      if (turnContainer) {
        let p = turnContainer.parentElement;
        const boundary = (root !== document && root.parentElement) ? root.parentElement : document.body;
        while (p && p !== boundary && p !== document.body) {
          const s = window.getComputedStyle(p);
          if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && p.clientHeight > 200) {
            return p;
          }
          p = p.parentElement;
        }
      }

      // 3. 在当前分屏内部寻找任意高度 > 200 的可滚动区域
      if (root !== document && root.querySelector) {
        const anyScrollable = root.querySelector('.overflow-y-auto');
        if (anyScrollable && anyScrollable.clientHeight > 200) {
          return anyScrollable;
        }
      }

      // 4. 全局降级兜底
      if (root !== document) {
        const fallback = document.querySelector('.scrollbar-hide.md-table-bleed') ||
                         document.querySelector('.overflow-y-auto.md-table-bleed');
        if (fallback && fallback.clientHeight > 200) return fallback;
      }

      return null;
    }

    /**
     * 获取所有“纸张”（问答回合 Turn）的几何边界
     */
    function getPagesInfo() {
      const activePane = getActivePane();
      const container = getChatScrollContainer(activePane);
      if (!container) return { container: null, pages: [] };

      // 关键修复：优先且严格在当前滚动容器或激活分屏内查找问答列表，坚决避免全局查找误锁死在最左侧分屏
      const turnContainer = container.querySelector?.('.relative.flex.flex-col.gap-y-3, .flex.flex-col.gap-y-3') ||
                            activePane?.querySelector?.('.relative.flex.flex-col.gap-y-3, .flex.flex-col.gap-y-3') ||
                            document.querySelector('.relative.flex.flex-col.gap-y-3, .flex.flex-col.gap-y-3');
      if (!turnContainer || turnContainer.children.length === 0) {
        return { container, pages: [] };
      }

      const containerRect = container.getBoundingClientRect();
      const containerHeight = container.clientHeight;

      const pages = Array.from(turnContainer.children).map((el, idx) => {
        const elRect = el.getBoundingClientRect();
        // 使用相对视口计算 + 当前滚动偏移，彻底免疫 offsetParent 层级差异与分屏 CSS 定位影响
        const top = (containerRect.height > 0 && elRect.height > 0)
          ? Math.round(elRect.top - containerRect.top + container.scrollTop)
          : el.offsetTop;

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
        const headScrollTop = Math.max(0, Math.round(top - 8));
        // 页脚：该问答回复末尾的最佳舒适视口位置
        const footScrollTop = Math.max(headScrollTop, Math.round(top + height - containerHeight + 20));

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
        console.log(`[agy-enhancer] Back to turn ${curIdx + 1} top (pane)`);
        performEnhancerScroll(container, { top: curPage.headScrollTop, behavior: 'smooth' });
      } else {
        // 已经在当前页头附近，点一下向上翻到上一页
        if (curIdx > 0) {
          const prevPage = pages[curIdx - 1];
          console.log(`[agy-enhancer] Up to turn ${curIdx} top (pane)`);
          performEnhancerScroll(container, { top: prevPage.headScrollTop, behavior: 'smooth' });
        } else {
          // 已经是第 1 页，直达整个页面最顶端
          console.log('[agy-enhancer] Reached top (pane)');
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
        console.log(`[agy-enhancer] Down to turn ${curIdx + 1} bottom (pane)`);
        performEnhancerScroll(container, { top: curPage.footScrollTop, behavior: 'smooth' });
      } else {
        // 已经在页脚附近，翻到下一页的页头
        if (curIdx < pages.length - 1) {
          const nextPage = pages[curIdx + 1];
          console.log(`[agy-enhancer] Down to turn ${curIdx + 2} top (pane)`);
          performEnhancerScroll(container, { top: nextPage.headScrollTop, behavior: 'smooth' });
        } else {
          // 已经是最后一页，直达最新底部
          console.log('[agy-enhancer] Reached bottom (pane)');
          performEnhancerScroll(container, { top: container.scrollHeight, behavior: 'smooth' });
        }
      }
    }

    /**
     * 【直达最底部】逻辑：
     * 双击向下按钮时，无视当前问答位置，直接平滑滚动到激活分屏的最底端
     */
    function navigateToBottom() {
      const container = getChatScrollContainer(getActivePane());
      if (!container) return;
      console.log('[agy-enhancer] Double click: Scrolled to bottom of active pane');
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
      group.removeAttribute('style');
      document.body.appendChild(group);

      return group;
    }

    if (USER_CONFIG.ENABLE_NAV_BUTTONS !== false) {
      createPageNavButtons();
    } else {
      document.getElementById('agy-page-nav-group')?.remove();
    }

    // ==================== 项目与对话底层数据及文件夹工具 (Core Helpers) ====================
    function getPM() {
      const header = document.querySelector('[data-testid="section-header"][data-title="Workspaces"], [data-testid="section-header"][data-title="Projects"]');
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

    function getExtensibilityService() {
      const root = document.getElementById('root');
      if (!root) return null;
      const k = Object.keys(root).find(key => key.startsWith('__reactFiber$') || key.startsWith('__reactContainer$'));
      let fiber = root[k];
      while (fiber) {
        if (fiber.memoizedProps?.value?.get) {
          try {
            const ext = fiber.memoizedProps.value.get('extensibility');
            if (ext) return ext;
          } catch (_) {}
        }
        fiber = fiber.child || fiber.sibling;
      }
      return null;
    }

    function getSidecarFromRow(row) {
      if (!row) return null;
      const k = Object.keys(row).find(key => key.startsWith('__reactFiber$'));
      let curr = row[k];
      while (curr) {
        if (curr.memoizedProps?.sidecar) {
          return curr.memoizedProps.sidecar;
        }
        curr = curr.return;
      }
      return null;
    }

    function formatHour12(h) {
      if (h === 0) return '12:00 AM';
      if (h < 12) return `${h}:00 AM`;
      if (h === 12) return '12:00 PM';
      return `${h - 12}:00 PM`;
    }

    function cronToSchedule(cron) {
      if (!cron || typeof cron !== 'string') {
        return { frequency: 'daily', dayOfWeek: 'Monday', hour: '9:00 AM', minute: '00' };
      }
      const trimmed = cron.trim();
      if (trimmed === '0 * * * *') {
        return { frequency: 'hourly', dayOfWeek: 'Monday', hour: '9:00 AM', minute: '00' };
      }
      const dailyMatch = trimmed.match(/^0\s+(\d{1,2})\s+\*\s+\*\s+\*$/);
      if (dailyMatch) {
        const h = parseInt(dailyMatch[1], 10);
        return { frequency: 'daily', dayOfWeek: 'Monday', hour: formatHour12(h), minute: '00' };
      }
      const weeklyMatch = trimmed.match(/^0\s+(\d{1,2})\s+\*\s+\*\s+(\d+)$/);
      if (weeklyMatch) {
        const h = parseInt(weeklyMatch[1], 10);
        const d = parseInt(weeklyMatch[2], 10);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return { frequency: 'weekly', dayOfWeek: days[d % 7] || 'Monday', hour: formatHour12(h), minute: '00' };
      }
      return { frequency: 'custom', customCron: trimmed, dayOfWeek: 'Monday', hour: '9:00 AM', minute: '00' };
    }

    function scheduleToCron(schedule) {
      if (!schedule) return '0 9 * * *';
      const freq = schedule.frequency;
      if (freq === 'hourly') return '0 * * * *';
      if (freq === 'custom') return schedule.customCron?.trim() || '0 9 * * *';

      let h24 = 9;
      if (schedule.hour) {
        const m = String(schedule.hour).match(/^(\d{1,2}):\d{2}\s*(AM|PM)$/i);
        if (m) {
          const val = parseInt(m[1], 10);
          const ampm = m[2].toUpperCase();
          if (ampm === 'AM') {
            h24 = (val === 12) ? 0 : val;
          } else {
            h24 = (val === 12) ? 12 : val + 12;
          }
        }
      }

      if (freq === 'daily') {
        return `0 ${h24} * * *`;
      }
      if (freq === 'weekly') {
        const days = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
        const dow = days[schedule.dayOfWeek] ?? 1;
        return `0 ${h24} * * ${dow}`;
      }
      return '0 9 * * *';
    }

    function getCurrentUrlConvoId() {
      const match = window.location.pathname.match(/\/c\/([a-f0-9-]+)/i);
      return match ? match[1] : null;
    }

    let pendingForkBranchRename = null;

    function getWorkspaceDirName(uri) {
      if (!uri) return '';
      let clean = decodeURIComponent(uri.replace(/^file:\/\/\/?/i, '')).replace(/[\/\\]+$/, '');
      return clean.split(/[\/\\]/).pop() || '';
    }

    // 极致轻量：纯 O(1) 字典查找当前会话关联项目目录是否含空格，无任何 DOM/Fiber 遍历
    function checkWorkspaceGitBranchSafety(convoId) {
      const targetId = convoId || getCurrentUrlConvoId();
      if (!targetId) return { safe: true, dirName: '' };
      let wsUri = '';
      try {
        const s = getTSP()?.getState()?.summaries?.[targetId];
        wsUri = s?.workspaces?.[0]?.workspaceFolderAbsoluteUri ||
                s?.workspaces?.[0]?.gitRootAbsoluteUri ||
                s?.workspaceUris?.[0] ||
                s?.trajectoryMetadata?.workspaces?.[0]?.workspaceFolderAbsoluteUri ||
                s?.trajectoryMetadata?.workspaceUris?.[0] || '';
      } catch (e) {}

      if (!wsUri) return { safe: true, dirName: '' };
      const dirName = getWorkspaceDirName(wsUri);
      const hasSpaceOrInvalid = /[\s~^:?*\[\\@{]/.test(dirName);
      return {
        safe: !hasSpaceOrInvalid,
        dirName,
        reason: hasSpaceOrInvalid ? `项目目录 "${dirName}" 包含空格，Git 分支名不支持空格，请使用 Create fork in current workspace` : ''
      };
    }

    // 极致轻量：纯 O(1) 字典查找判断当前会话是否具备关联代码工作区，耗时 < 0.001ms
    function canForkInSharedWorkspace(convoId) {
      const targetId = convoId || getCurrentUrlConvoId();
      if (!targetId) return false;
      try {
        const s = getTSP()?.getState()?.summaries?.[targetId];
        if (s) {
          if (Array.isArray(s.workspaces) && s.workspaces.length > 0) return true;
          if (Array.isArray(s.workspaceUris) && s.workspaceUris.length > 0) return true;
          const meta = s.trajectoryMetadata;
          if (meta) {
            if (Array.isArray(meta.workspaces) && meta.workspaces.length > 0) return true;
            if (Array.isArray(meta.workspaceUris) && meta.workspaceUris.length > 0) return true;
          }
        }
      } catch (e) {}
      return false;
    }

    // 纯被动事件响应：由会话切换事件触发重命名，最多轻试 8 次，无常驻后台轮询
    function applyPendingForkRename(newConvoId) {
      if (USER_CONFIG.ENABLE_FORK_CONVERSATION === false) return;
      if (!pendingForkBranchRename || !newConvoId) return;
      if (pendingForkBranchRename.sourceConvoId && pendingForkBranchRename.sourceConvoId === newConvoId) return;
      if (Date.now() - pendingForkBranchRename.timestamp > 30000) {
        pendingForkBranchRename = null;
        return;
      }
      const { newTitle } = pendingForkBranchRename;
      pendingForkBranchRename = null;

      let attempts = 0;
      const updateTitle = async () => {
        let backendUpdated = false;
        let tspUpdated = false;
        const tsp = getTSP();
        const s = tsp?.getState()?.summaries?.[newConvoId];
        if (s) {
          s.summary = newTitle;
          s.title = newTitle;
          tspUpdated = true;
        }
        const as = getAgentService();
        if (as?.updateConversationAnnotations) {
          try {
            await as.updateConversationAnnotations(newConvoId, { title: newTitle }, true);
            backendUpdated = true;
          } catch (err) {}
        }
        if (getCurrentUrlConvoId() === newConvoId) {
          document.title = `${newTitle} - Antigravity`;
        }
        if ((!backendUpdated || !tspUpdated) && ++attempts < 8) {
          setTimeout(updateTitle, 200);
        }
      };
      setTimeout(updateTitle, 100);
    }
    window.__AGY_APPLY_FORK_RENAME__ = applyPendingForkRename;

    let cachedGeminiBaseUri = null;
    function getGeminiBaseUri() {
      if (cachedGeminiBaseUri) return cachedGeminiBaseUri;
      const pm = getPM();
      const tsp = getTSP();
      const scanTargets = [
        pm?.projectsStateProvider?.getState?.(),
        tsp?.getState?.()?.summaries
      ];
      const visited = new WeakSet();
      function scan(obj, depth = 0) {
        if (!obj || cachedGeminiBaseUri || depth > 6) return;
        if (typeof obj === 'string') {
          const m = obj.match(/^(file:\/\/\/.*?[\\/]\.gemini[\\/]antigravity)[\\/]/i);
          if (m) cachedGeminiBaseUri = m[1];
        } else if (typeof obj === 'object') {
          if (visited.has(obj)) return;
          visited.add(obj);
          for (const k in obj) {
            try { scan(obj[k], depth + 1); } catch (e) {}
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

      function formatRelativeTime(seconds) {
        if (!seconds) return '';
        const nowSec = Math.floor(Date.now() / 1000);
        const diff = Math.max(0, nowSec - seconds);
        if (diff < 60) return 'now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d`;
        if (diff < 86400 * 365) return `${Math.floor(diff / (86400 * 30))}mo`;
        return `${Math.floor(diff / (86400 * 365))}y`;
      }

      function getProjectConversations(projectId) {
        const tsp = getTSP();
        if (!tsp) return [];
        const summaries = tsp.getState()?.summaries || {};
        const list = Object.entries(summaries).map(([key, s]) => {
          const pId = s.projectId || s.trajectoryMetadata?.projectId;
          if (pId !== projectId) return null;

          // 排除子 Agent 与内部子任务会话 (如 **Task**: ok /boost, <original_task> 等)
          const parentId = s.parentConversationId || s.trajectoryMetadata?.parentConversationId;
          const isSubagent = !!parentId ||
            (s.nestingDepth && Number(s.nestingDepth) > 0) ||
            (s.trajectoryMetadata?.nestingDepth && Number(s.trajectoryMetadata?.nestingDepth) > 0) ||
            !!s.subagentSpec ||
            !!s.trajectoryMetadata?.subagentSpec;
          if (isSubagent) return null;

          // 仅展示未被单独归档的正常会话
          if (s.annotations?.archived === true) return null;

          // 获取工作区/分支名称 (Workspace / Branch Name)
          let workspaceName = '';
          const workspaces = s.workspaces || s.trajectoryMetadata?.workspaces || [];
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
          if (!workspaceName && s.trajectoryMetadata?.workspaceUris) {
            for (const u of s.trajectoryMetadata.workspaceUris) {
              if (u.includes('/worktrees/')) {
                workspaceName = u.split('/').filter(Boolean).pop();
                break;
              }
            }
          }

          const timeSec = Number(s.lastModifiedTime?.seconds || s.createdTime?.seconds || 0);

          return {
            id: key, // 使用 key 作为真实对话 ID（不能用 s.trajectoryId，否则报数据不存在且跳转首页）
            title: s.summary || s.title || 'Untitled conversation',
            projectId: pId,
            time: timeSec,
            timeText: formatRelativeTime(timeSec),
            workspaceName,
            markedAsUnread: s.annotations?.markedAsUnread === true
          };
        }).filter(Boolean);

        return list.sort((a, b) => b.time - a.time);
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

        // 智能定位：贴合 Workspaces / Projects 侧边栏宽度，严禁向右超出侧边栏边界
        const header = document.querySelector('[data-testid="section-header"][data-title="Workspaces"], [data-testid="section-header"][data-title="Projects"]');
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
                        <div class="agy-convo-content">
                          <div class="agy-convo-top-row">
                            ${c.markedAsUnread ? '<span class="agy-convo-unread-dot" title="Unread"></span>' : ''}
                            <span class="agy-convo-title">${escapeHtml(c.title)}</span>
                            ${c.timeText ? `<span class="agy-convo-time">${escapeHtml(c.timeText)}</span>` : ''}
                          </div>
                          ${c.workspaceName ? `
                            <div class="agy-convo-subtext" title="${escapeHtml(c.workspaceName)}">
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 -960 960 960" fill="currentColor" class="shrink-0"><path d="M450-180V-467.85l-210-210V-560H180V-780H400v60H282.15L510-492.15V-180H450ZM580.15-536.77l-43.38-43.38L677.85-720H560v-60H780v220H720V-677.85L580.15-536.77Z"/></svg>
                              <span class="min-w-0 truncate">${escapeHtml(c.workspaceName)}</span>
                            </div>
                          ` : ''}
                        </div>
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
              if (!evt || (!dd.contains(evt.target) && !btn.contains(evt.target))) {
                dd.remove();
                document.removeEventListener('click', closeDropdown);
              }
            };
            setTimeout(() => document.addEventListener('click', closeDropdown), 10);

            dd.querySelector('.agy-dd-item.copy-name')?.addEventListener('click', async () => {
              closeDropdown();
              await navigator.clipboard.writeText(p.project.name);
              showNotification(`Copied project name: "${p.project.name}"`);
            });

            dd.querySelector('.agy-dd-item.settings')?.addEventListener('click', () => {
              closeDropdown();
              isPanelOpen = false;
              renderArchivePanel(pm);
              openProjectSettings(p.project.id);
            });

            dd.querySelector('.agy-dd-item.open-project-folder')?.addEventListener('click', () => {
              closeDropdown();
              const uri = getProjectFolderUri(p);
              if (uri) {
                openLocalFolder(uri, 'project');
                showNotification('Opened project folder');
              } else {
                showNotification('Failed to resolve project folder');
              }
            });

            dd.querySelector('.agy-dd-item.restore')?.addEventListener('click', async () => {
              closeDropdown();
              await pm.updateProject({ ...p.project, archived: false });
              showNotification(`Project [${p.project.name}] restored`);
              renderArchivePanel(pm);
              updateArchiveUI();
            });

            dd.querySelector('.agy-dd-item.new-chat')?.addEventListener('click', () => {
              closeDropdown();
              isPanelOpen = false;
              renderArchivePanel(pm);
              navigateTo(`/?section=${encodeURIComponent(p.project.id)}`);
            });

            dd.querySelector('.agy-dd-item.delete')?.addEventListener('click', async () => {
              closeDropdown();
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
            const tsp = getTSP();
            let c = convos.find(x => x.id === convoId);
            if (!c && tsp) {
              const s = tsp.getState()?.summaries?.[convoId];
              if (s) {
                c = {
                  id: convoId,
                  title: s.summary || s.title || 'Untitled conversation',
                  projectId: s.projectId || s.trajectoryMetadata?.projectId || projectId,
                  markedAsUnread: s.annotations?.markedAsUnread === true
                };
              }
            }
            let p = archived.find(x => x.project.id === projectId);
            if (!p && pm) {
              const allProjects = pm.projectsStateProvider?.getState() || [];
              p = allProjects.find(x => x.project?.id === projectId);
            }
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

            let archiveWorkspaceName = c.workspaceName || '';
            if (!archiveWorkspaceName && tsp) {
              const archiveSummaries = tsp.getState()?.summaries || {};
              const archiveConvoSummary = archiveSummaries[c.id];
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
              if (!evt || (!dd.contains(evt.target) && !btn.contains(evt.target))) {
                dd.remove();
                btn.classList.remove('active');
                document.removeEventListener('click', closeConvoDd);
              }
            };
            setTimeout(() => document.addEventListener('click', closeConvoDd), 10);

            // 重命名
            dd.querySelector('.convo-rename')?.addEventListener('click', (ev) => {
              ev.stopPropagation();
              closeConvoDd();

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
              closeConvoDd();
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
              closeConvoDd();
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
              closeConvoDd();
              await navigator.clipboard.writeText(c.title);
              showNotification(`Copied conversation name: "${c.title}"`);
            });

            // 复制: 对话 ID
            dd.querySelector('.copy-convo-id')?.addEventListener('click', async (ev) => {
              ev.stopPropagation();
              closeConvoDd();
              await navigator.clipboard.writeText(c.id);
              showNotification(`Copied conversation ID: ${c.id}`);
            });

            // 复制: 工作区/分支名称
            if (archiveWorkspaceName) {
              dd.querySelector('.copy-workspace-name')?.addEventListener('click', async (ev) => {
                ev.stopPropagation();
                closeConvoDd();
                await navigator.clipboard.writeText(archiveWorkspaceName);
                showNotification(`Copied workspace name: "${archiveWorkspaceName}"`);
              });
            }

            // 复制: 项目名称
            dd.querySelector('.copy-project-name')?.addEventListener('click', async (ev) => {
              ev.stopPropagation();
              closeConvoDd();
              await navigator.clipboard.writeText(p.project.name);
              showNotification(`Copied project name: "${p.project.name}"`);
            });

            // 打开: 对话文件夹
            dd.querySelector('.open-convo-folder')?.addEventListener('click', (ev) => {
              ev.stopPropagation();
              closeConvoDd();
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
              closeConvoDd();
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
        if (isUserTyping()) return;
        const pm = getPM();
        if (!pm) return;

        const psp = pm.projectsStateProvider;
        const projects = psp?.getState() || [];
        const archived = projects.filter(p => p.project?.archived && p.project?.id !== 'outside-of-project');
        const archivedCount = archived.length;

        // 1. Workspaces / Projects 标题栏归档按钮
        const header = document.querySelector('[data-testid="section-header"][data-title="Workspaces"], [data-testid="section-header"][data-title="Projects"]');
        const actionsContainer = header?.querySelector('.flex.items-center.gap-1') || header?.querySelector('.flex.items-center:last-child');
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

      // 监听变更与初始挂载（保活由全局心跳调度器统一负责，数据变动已有 onDidChange 实时驱动）
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

      onHeartbeatProjectArchiver = updateArchiveUI;

      // ==================== 7. 原生侧边栏未归档对话菜单增强 ====================
      function initNativeConvoMenuEnhancer() {
        if (USER_CONFIG.ENABLE_CONTEXT_MENU === false) return;

        if (nativeMenuPointerDownHandler) {
          document.removeEventListener('pointerdown', nativeMenuPointerDownHandler, true);
        }
        if (nativeMenuObserver) {
          nativeMenuObserver.disconnect();
        }

        nativeMenuPointerDownHandler = (e) => {
          const btn = e.target?.closest?.('button[aria-label="More options"]');
          const projBtn = e.target?.closest?.('button[aria-label="Project options"]');
          const sidecarKebab = e.target?.closest?.('[data-testid="sidecar-kebab"]');
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
          } else if (sidecarKebab) {
            activeSidecarRow = sidecarKebab.closest('[data-testid="sidecar-row"]');
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

          const cleanConsecutiveSeparators = (m) => {
            if (!m) return;
            let prevWasSep = false;
            const children = Array.from(m.children);
            for (let i = 0; i < children.length; i++) {
              const child = children[i];
              const isSep = child.getAttribute('role') === 'separator';
              if (isSep) {
                if (prevWasSep || i === 0 || i === children.length - 1) {
                  child.remove();
                } else {
                  prevWasSep = true;
                }
              } else {
                prevWasSep = false;
              }
            }
          };

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

          // 0.1 识别并屏蔽单项孤立的 "Copy" 菜单（如项目总栏目右键弹出的无意义 Copy 浮层）
          if (USER_CONFIG.ENABLE_BLOCK_SIDEBAR_COPY !== false) {
            const rawText = (menu.textContent || '').trim().toLowerCase();
            const items = Array.from(menu.querySelectorAll('[role="menuitem"], button, div')).filter(el => {
              const t = (el.textContent || '').trim();
              return (el.getAttribute('role') === 'menuitem' || el.tagName === 'BUTTON') && t.length > 0;
            });
            const isSingleCopy = (items.length <= 1 && (rawText === 'copy' || rawText === '复制')) ||
                                 (items.length > 0 && items.every(it => {
                                   const t = (it.textContent || '').trim().toLowerCase();
                                   return t === 'copy' || t === '复制';
                                 }));
            if (isSingleCopy) {
              menu.setAttribute('data-agy-enhanced', 'true');
              const popper = menu.closest('[data-radix-popper-content-wrapper]') || menu.parentElement || menu;
              popper.style.setProperty('display', 'none', 'important');
              popper.remove();
              return;
            }
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

            // 屏蔽官方原生多级 Copy 菜单项
            if (USER_CONFIG.ENABLE_BLOCK_SIDEBAR_COPY !== false) {
              const removeNativeCopy = () => {
                const items = Array.from(menu.querySelectorAll('[role="menuitem"], div'));
                for (const item of items) {
                  if (item.classList?.contains('agy-native-enhanced')) continue;
                  const testid = (item.getAttribute?.('data-testid') || '').toLowerCase();
                  const text = (item.textContent || '').trim().toLowerCase();
                  if (
                    testid.includes('copy') ||
                    text === 'copy' ||
                    text.startsWith('copy') ||
                    text === '复制' ||
                    text.startsWith('复制')
                  ) {
                    const targetItem = item.closest('[role="menuitem"]') || item;
                    targetItem.remove();
                    return true;
                  }
                }
                return false;
              };
              if (!removeNativeCopy()) {
                requestAnimationFrame(removeNativeCopy);
              }
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

            // 识别当前会话是否关联特定分支或工作区路径
            let convoBranchName = '';
            if (paths?.isBranch && paths.branchUri) {
              convoBranchName = paths.branchUri.split(/[\\/]/).filter(Boolean).pop() || '';
            }
            if (!convoBranchName && workspaceName) {
              convoBranchName = workspaceName;
            }
            if (!convoBranchName && convoId) {
              const rowEl = document.querySelector(`[data-testid="conversation-row-sidebar"][data-cascade-id="${convoId}"]`);
              const sub = rowEl?.getAttribute('data-subtext')?.trim();
              if (sub && !/^(\d+[smhdwy]|\w{3}\s+\d+|now)$/i.test(sub)) {
                convoBranchName = sub;
              }
            }

            // 严禁将主分支判定为可删除分支
            const isMainBranch = ['main', 'master', 'trunk', 'default'].includes((convoBranchName || '').toLowerCase());
            if (convoBranchName && !isMainBranch) {
              const divBranchActions = document.createElement('div');
              divBranchActions.setAttribute('role', 'separator');
              divBranchActions.className = 'h-px bg-border my-1 -mx-1 agy-native-enhanced';
              menu.appendChild(divBranchActions);

              // 1. Delete Current Branch
              const itemDelCurrent = document.createElement('div');
              itemDelCurrent.setAttribute('role', 'menuitem');
              itemDelCurrent.className = 'w-full px-2 py-1 text-left text-[13px] cursor-pointer outline-none transition-colors select-none flex items-center gap-1.5 rounded-md hover:bg-destructive/15 text-destructive font-medium agy-native-enhanced';
              itemDelCurrent.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                <span>Delete Current Branch</span>
              `;
              itemDelCurrent.addEventListener('click', (ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                handleWorktreeDeleteAction?.({
                  actionType: 'current',
                  branchName: convoBranchName,
                  projectId: pId,
                  projectName,
                  folderUri: paths?.targetProjectUri || paths?.branchUri,
                  projectRootPath: paths?.projectRootUri
                });
              });
              menu.appendChild(itemDelCurrent);

              // 2. Delete Other Branches (Except Current Branch)
              const itemDelOthers = document.createElement('div');
              itemDelOthers.setAttribute('role', 'menuitem');
              itemDelOthers.className = 'w-full px-2 py-1 text-left text-[13px] cursor-pointer outline-none transition-colors select-none flex items-center gap-1.5 rounded-md hover:bg-destructive/15 text-destructive font-medium agy-native-enhanced';
              itemDelOthers.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                <span>Delete Other Branches</span>
              `;
              itemDelOthers.addEventListener('click', (ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                handleWorktreeDeleteAction?.({
                  actionType: 'others',
                  branchName: convoBranchName,
                  projectId: pId,
                  projectName,
                  folderUri: paths?.targetProjectUri || paths?.branchUri,
                  projectRootPath: paths?.projectRootUri
                });
              });
              menu.appendChild(itemDelOthers);
            }

            // 将会话操作菜单中的原生 Delete 置于最底部并赋予红色字体（适用于项目对话与非项目对话）
            const nativeConvoDelete = menu.querySelector('[data-testid="conversation-delete-menu-item"]') ||
              Array.from(menu.querySelectorAll('[role="menuitem"]')).find(el => {
                if (el.classList?.contains('agy-native-enhanced')) return false;
                const txt = el.textContent?.trim()?.toLowerCase();
                return txt === 'delete' || txt === '删除';
              });

            if (nativeConvoDelete) {
              const lastEl = menu.lastElementChild;
              if (lastEl && lastEl !== nativeConvoDelete && lastEl.getAttribute('role') !== 'separator') {
                const sep = document.createElement('div');
                sep.setAttribute('role', 'separator');
                sep.className = 'h-px bg-border my-1 -mx-1 agy-native-enhanced';
                menu.appendChild(sep);
              }
              menu.appendChild(nativeConvoDelete);
              nativeConvoDelete.classList.add('text-destructive', 'font-medium');
              nativeConvoDelete.style.color = '#ef4444';
              const svg = nativeConvoDelete.querySelector('svg');
              if (svg) svg.style.color = '#ef4444';
            }
            cleanConsecutiveSeparators(menu);

            lastNativeConvoId = convoId;
            lastNativeConvoTitle = convoTitle;
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

          const menuText = menu.textContent || '';
          const hasProjectActions = menu.querySelector('[data-testid="project-delete-menu-item"]') ||
                                    menu.querySelector('[data-testid="project-rename-menu-item"]') ||
                                    menu.querySelector('[data-testid="project-settings-menu-item"]') ||
                                    menuText.includes('Workspace Settings') ||
                                    menuText.includes('Archive Workspace') ||
                                    menuText.includes('Delete Workspace') ||
                                    menuText.includes('Delete Project');

          const isProjectMenu = (isRecentProjectAction && !!targetProject) || !!hasProjectActions;

          if (isProjectMenu) {
            if (!menu.children.length) return;

            menu.setAttribute('data-agy-enhanced', 'true');

            // 0. 置顶添加“复制项目名称” (Copy Project Name)
            let projectName = targetProject?.name || '';
            if (!projectName && activeNativeProjectId) {
              const pm = getPM();
              const projects = pm?.projectsStateProvider?.getState?.() || [];
              projectName = projects.find(p => p.project?.id === activeNativeProjectId)?.project?.name || '';
            }
            if (!projectName) {
              const activeProjCard = document.querySelector(
                'button[data-project-card="true"][data-selected="true"], ' +
                'button[data-project-card="true"]:has(button[aria-label="Project options"][aria-expanded="true"]), ' +
                '.group\\/header:has(button[aria-label="Project options"][aria-expanded="true"]) button[data-project-card="true"]'
              );
              if (activeProjCard) {
                const projObj = resolveProjectFromElement(activeProjCard);
                projectName = projObj?.name || activeProjCard.querySelector('.truncate')?.innerText?.trim() || '';
                if (!targetProject && projObj) targetProject = projObj;
              }
            }

            activeNativeProjectObj = null;
            activeNativeProjectId = null;
            lastProjectActionTime = 0;

            if (projectName && !menu.querySelector('.agy-copy-project-name')) {
              const itemCopyProject = document.createElement('div');
              itemCopyProject.setAttribute('role', 'menuitem');
              itemCopyProject.className = 'w-full px-2 py-1 text-left text-[13px] cursor-pointer outline-none transition-colors select-none flex items-center gap-1.5 rounded-md hover:bg-secondary hover:text-foreground text-secondary-foreground agy-native-enhanced agy-copy-project-name';
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

              const dividerTop = document.createElement('div');
              dividerTop.setAttribute('role', 'separator');
              dividerTop.className = 'h-px bg-border my-1 -mx-1 agy-native-enhanced';

              if (menu.firstChild) {
                menu.insertBefore(dividerTop, menu.firstChild);
                menu.insertBefore(itemCopyProject, dividerTop);
              } else {
                menu.appendChild(itemCopyProject);
                menu.appendChild(dividerTop);
              }
            }

            // 屏蔽官方原生 "Show in File Explorer" 菜单项
            if (USER_CONFIG.ENABLE_BLOCK_FILE_EXPLORER !== false) {
              const removeExplorerItem = () => {
                const items = Array.from(menu.querySelectorAll('[role="menuitem"], div'));
                for (const item of items) {
                  if (item.classList?.contains('agy-native-enhanced') || item.closest('.agy-native-enhanced')) continue;
                  const testid = (item.getAttribute?.('data-testid') || '').toLowerCase();
                  const text = (item.textContent || '').trim().toLowerCase();
                  if (
                    testid.includes('file-explorer') ||
                    testid.includes('show-in-explorer') ||
                    text === 'show in file explorer' ||
                    text.includes('show in file explorer') ||
                    text.includes('show in explorer') ||
                    text.includes('show in finder') ||
                    text.includes('在文件资源管理器中显示') ||
                    text.includes('在资源管理器中显示') ||
                    text.includes('在访达中显示')
                  ) {
                    const targetItem = item.closest('[role="menuitem"]') || item;
                    if (targetItem.classList?.contains('agy-native-enhanced') || targetItem.closest('.agy-native-enhanced')) continue;
                    targetItem.remove();
                    return true;
                  }
                }
                return false;
              };
              if (!removeExplorerItem()) {
                requestAnimationFrame(removeExplorerItem);
              }
            }

            // 屏蔽官方原生 "Copy" / "Copy Project Name" 菜单项
            if (USER_CONFIG.ENABLE_BLOCK_SIDEBAR_COPY !== false) {
              const removeProjCopy = () => {
                const items = Array.from(menu.querySelectorAll('[role="menuitem"], div'));
                for (const item of items) {
                  if (item.classList?.contains('agy-native-enhanced') || item.closest('.agy-native-enhanced')) continue;
                  const testid = (item.getAttribute?.('data-testid') || '').toLowerCase();
                  const text = (item.textContent || '').trim().toLowerCase();
                  if (
                    testid.includes('copy') ||
                    text === 'copy' ||
                    text.startsWith('copy') ||
                    text === '复制' ||
                    text.startsWith('复制')
                  ) {
                    const targetItem = item.closest('[role="menuitem"]') || item;
                    if (targetItem.classList?.contains('agy-native-enhanced') || targetItem.closest('.agy-native-enhanced')) continue;
                    targetItem.remove();
                    return true;
                  }
                }
                return false;
              };
              if (!removeProjCopy()) {
                requestAnimationFrame(removeProjCopy);
              }
            }

            const targetUri = getProjectFolderUri(targetProject);
            if (targetUri) {
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

              // Separator and Delete All Branches (protect main branch)
              const divProjDelete = document.createElement('div');
              divProjDelete.setAttribute('role', 'separator');
              divProjDelete.className = 'h-px bg-border my-1 -mx-1 agy-native-enhanced';
              menu.appendChild(divProjDelete);

              const itemDelAll = document.createElement('div');
              itemDelAll.setAttribute('role', 'menuitem');
              itemDelAll.className = 'w-full px-2 py-1 text-left text-[13px] cursor-pointer outline-none transition-colors select-none flex items-center gap-1.5 rounded-md hover:bg-destructive/15 text-destructive font-medium agy-native-enhanced';
              itemDelAll.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                <span>Delete All Branches</span>
              `;
              itemDelAll.addEventListener('click', (ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                handleWorktreeDeleteAction?.({
                  actionType: 'all',
                  projectId: targetProject?.id,
                  projectName: targetProject?.name,
                  projectRootPath: targetUri
                });
              });
              menu.appendChild(itemDelAll);
            }

            // 将原生项目/工作区 Delete Workspace / Delete Project 项置于最底部并赋予红色字体
            const nativeProjDelete = menu.querySelector('[data-testid="project-delete-menu-item"]') ||
              Array.from(menu.querySelectorAll('[role="menuitem"]')).find(el => {
                if (el.classList?.contains('agy-native-enhanced')) return false;
                const txt = el.textContent?.trim()?.toLowerCase();
                return txt.includes('delete workspace') || txt.includes('delete project') || txt.includes('删除工作区') || txt.includes('删除项目') || (txt.startsWith('delete') && !txt.includes('branch'));
              });

            if (nativeProjDelete) {
              const lastEl = menu.lastElementChild;
              if (lastEl && lastEl !== nativeProjDelete && lastEl.getAttribute('role') !== 'separator') {
                const sep = document.createElement('div');
                sep.setAttribute('role', 'separator');
                sep.className = 'h-px bg-border my-1 -mx-1 agy-native-enhanced';
                menu.appendChild(sep);
              }
              menu.appendChild(nativeProjDelete);
              nativeProjDelete.classList.add('text-destructive', 'font-medium');
              nativeProjDelete.style.color = '#ef4444';
              const svg = nativeProjDelete.querySelector('svg');
              if (svg) svg.style.color = '#ef4444';
            }
            cleanConsecutiveSeparators(menu);
          }

          // 3. 确认是否是 Scheduled Tasks 定时任务操作菜单
          const isScheduledTaskMenu = menu.querySelector('[data-testid="sidecar-action-restart"]') ||
                                      menu.querySelector('[data-testid="sidecar-action-delete"]');
          if (isScheduledTaskMenu) {
            menu.setAttribute('data-agy-enhanced', 'true');
            if (USER_CONFIG.ENABLE_EDIT_SCHEDULED_TASKS !== false) {
              enhanceScheduledTaskMenu(menu);
            }
          }
        }

        function enhanceScheduledTaskMenu(menu) {
          if (!menu || menu.querySelector('[data-testid="sidecar-action-edit"]')) return;

          // 确定目标定时任务行元素
          let row = null;
          const triggerId = menu.getAttribute('aria-labelledby');
          if (triggerId) {
            const triggerEl = document.getElementById(triggerId);
            if (triggerEl) row = triggerEl.closest('[data-testid="sidecar-row"]');
          }
          if (!row && activeSidecarRow) {
            row = activeSidecarRow;
          }
          if (!row) {
            row = document.querySelector('[data-testid="sidecar-row"]');
          }
          if (!row) return;

          const itemEdit = document.createElement('div');
          itemEdit.setAttribute('role', 'menuitem');
          itemEdit.setAttribute('data-testid', 'sidecar-action-edit');
          itemEdit.tabIndex = -1;
          itemEdit.className = 'w-full pr-2 pl-2 [&:has(>svg:first-child)]:pl-1.5 [&:has(>[data-icon]:first-child)]:pl-1.5 text-left text-[13px] cursor-pointer outline-none no-focus-ring transition-colors select-none flex items-center rounded-md py-1 gap-1.5 focus:bg-secondary focus:text-foreground text-secondary-foreground agy-native-enhanced';
          itemEdit.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="shrink-0 text-secondary-foreground"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
            <span>Edit</span>
          `;
          itemEdit.addEventListener('mouseenter', () => {
            itemEdit.setAttribute('data-highlighted', '');
            itemEdit.classList.add('bg-secondary', 'text-foreground');
          });
          itemEdit.addEventListener('mouseleave', () => {
            itemEdit.removeAttribute('data-highlighted');
            itemEdit.classList.remove('bg-secondary', 'text-foreground');
          });

          itemEdit.addEventListener('click', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            openScheduledTaskEditor(row);
          });

          const restartItem = menu.querySelector('[data-testid="sidecar-action-restart"]');
          if (restartItem) {
            restartItem.parentElement.insertBefore(itemEdit, restartItem);
          } else {
            menu.prepend(itemEdit);
          }
        }

        function openScheduledTaskEditor(row) {
          if (!row) return;
          const sidecar = getSidecarFromRow(row);
          const sidecarId = sidecar?.sidecarId || row.getAttribute('data-sidecar-id');
          if (!sidecar && !sidecarId) {
            showNotification('Unable to retrieve task information');
            return;
          }

          const displayName = sidecar?.config?.displayName || sidecarId;
          const prompt = sidecar?.config?.args?.[3] || '';
          const cron = sidecar?.config?.args?.[0] || '0 9 * * *';
          const projectId = sidecar?.userConfig?.projectScope?.value || '';

          const editingTask = {
            oldSidecarId: sidecarId,
            displayName,
            prompt,
            cron,
            projectId,
            scheduleObj: cronToSchedule(cron)
          };

          const newBtn = document.querySelector('[data-testid="sidecar-new-button"]');
          if (!newBtn) {
            showNotification('Unable to find Add Scheduled Task button');
            return;
          }
          newBtn.click();

          let attempts = 0;
          const checkInterval = setInterval(() => {
            attempts++;
            const modal = document.querySelector('[data-testid="new-sidecar-modal"]');
            if (modal) {
              clearInterval(checkInterval);
              setupEditModal(modal, editingTask);
            } else if (attempts > 40) {
              clearInterval(checkInterval);
            }
          }, 40);
        }

        function setupEditModal(modal, editingTask) {
          if (!modal) return;
          modal.setAttribute('data-agy-editing-task', editingTask.oldSidecarId);
          modal.classList.add('agy-edit-modal');

          // Inject styles once: hide red error about existing sidecarId and style custom save button
          if (!document.getElementById('agy-edit-task-style')) {
            const st = document.createElement('style');
            st.id = 'agy-edit-task-style';
            st.textContent = `
              .agy-edit-modal .text-red-500 { display: none !important; }
              .agy-save-task-btn:disabled { opacity: 0.5 !important; cursor: not-allowed !important; pointer-events: none !important; }
            `;
            document.head.appendChild(st);
          }

          const dialog = modal.closest('[role="dialog"]') || modal.closest('.fixed');
          const titleEl = dialog?.querySelector('h1, h2');
          if (titleEl) {
            titleEl.textContent = 'Edit Scheduled Task';
          }

          const child = modal.firstElementChild;
          const cKey = Object.keys(child || {}).find(k => k.startsWith('__reactFiber$'));
          let curr = child ? child[cKey] : null;
          let formProps = null;
          while (curr) {
            if (curr.memoizedProps?.onNameChange && curr.memoizedProps?.onPromptChange) {
              formProps = curr.memoizedProps;
              break;
            }
            curr = curr.return;
          }

          if (formProps) {
            try { formProps.onNameChange(editingTask.displayName); } catch (_) {}
            try { formProps.onPromptChange(editingTask.prompt); } catch (_) {}
            if (editingTask.projectId) {
              try { formProps.onProjectChange(editingTask.projectId); } catch (_) {}
            }
            if (editingTask.scheduleObj) {
              try { formProps.onScheduleChange(editingTask.scheduleObj); } catch (_) {}
            }
          }

          const setNativeVal = (el, val) => {
            if (!el) return;
            try {
              const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
              const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
              setter?.call(el, val);
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (_) {}
          };

          const nameInput = modal.querySelector('[data-testid="new-sidecar-name"]');
          const promptInput = modal.querySelector('[data-testid="new-sidecar-prompt"]');
          if (nameInput) setNativeVal(nameInput, editingTask.displayName);
          if (promptInput) setNativeVal(promptInput, editingTask.prompt);

          // Hide native submit button completely to prevent conflicting React validations
          const nativeSubmit = modal.querySelector('[data-testid="new-sidecar-submit"]');
          if (nativeSubmit) {
            nativeSubmit.style.setProperty('display', 'none', 'important');
          }

          // Create clean custom Save button
          let saveBtn = modal.querySelector('.agy-save-task-btn');
          if (!saveBtn && nativeSubmit?.parentElement) {
            saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'agy-save-task-btn inline-flex items-center font-medium transition-colors select-none outline-none cursor-pointer justify-center bg-primary text-primary-foreground hover:opacity-90 shadow-sm border-none h-8 text-sm rounded-lg gap-1.5 px-3';
            saveBtn.textContent = 'Save Changes';
            nativeSubmit.parentElement.appendChild(saveBtn);
          }

          const updateSaveBtnState = () => {
            if (!saveBtn) return;
            const hasName = !!(nameInput ? nameInput.value.trim() : editingTask.displayName);
            const hasPrompt = !!(promptInput ? promptInput.value.trim() : editingTask.prompt);
            if (hasName && hasPrompt) {
              saveBtn.removeAttribute('disabled');
            } else {
              saveBtn.setAttribute('disabled', 'true');
            }
          };

          updateSaveBtnState();
          nameInput?.addEventListener('input', updateSaveBtnState);
          promptInput?.addEventListener('input', updateSaveBtnState);

          if (saveBtn) {
            saveBtn.addEventListener('click', async (ev) => {
              ev.stopPropagation();
              ev.preventDefault();

              const newName = nameInput ? nameInput.value.trim() : editingTask.displayName;
              const newPrompt = promptInput ? promptInput.value.trim() : editingTask.prompt;
              if (!newName) {
                showNotification('Task name cannot be empty');
                return;
              }
              if (!newPrompt) {
                showNotification('Prompt cannot be empty');
                return;
              }

              const projHidden = modal.querySelector('input[id*="hidden-input"]');
              const newProjectId = projHidden?.value || formProps?.project || editingTask.projectId || '';
              const currentSched = formProps?.schedule || editingTask.scheduleObj;
              const cronStr = scheduleToCron(currentSched);

              const newSidecarId = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || newName;

              saveBtn.textContent = 'Saving...';
              saveBtn.setAttribute('disabled', 'true');

              const ext = getExtensibilityService();
              if (!ext) {
                showNotification('Extensibility service not available');
                saveBtn.textContent = 'Save Changes';
                updateSaveBtnState();
                return;
              }

              const newConfig = {
                mode: { case: 'builtin', value: 'schedule' },
                args: [cronStr, 'agentapi', 'new-conversation', newPrompt],
                description: '',
                displayName: newName
              };

              try {
                if (newSidecarId === editingTask.oldSidecarId) {
                  await ext.updateSidecar(editingTask.oldSidecarId, newConfig);
                  if (newProjectId) {
                    try { await ext.setSidecarProject(editingTask.oldSidecarId, newProjectId); } catch (_) {}
                  }
                } else {
                  await ext.deleteSidecar(editingTask.oldSidecarId);
                  await ext.createSidecar(newSidecarId, newConfig, newProjectId);
                }

                showNotification(`Scheduled task "${newName}" updated successfully`);
                const closeBtn = dialog?.querySelector('button[aria-label="Close"]') || modal.querySelector('button[aria-label="Close"]');
                if (closeBtn) {
                  closeBtn.click();
                } else {
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
                }
              } catch (err) {
                console.error('[agy-enhancer] update scheduled task error:', err);
                showNotification(`Failed to save task: ${err?.message || err}`);
                saveBtn.textContent = 'Save Changes';
                updateSaveBtnState();
              }
            });
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
                  // 性能关键短路：若变动发生在深层富文本聊天流容器或代码编辑器内部，绝对不属于顶层弹出菜单，直接跳过
                  if (node.parentElement !== document.body && node.closest?.('.scrollbar-hide.md-table-bleed, .overflow-y-auto.md-table-bleed, .monaco-editor, .relative.flex.flex-col.gap-y-3')) {
                    continue;
                  }
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
    let MENU_ICONS = {
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
      edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
      trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
      terminal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>',
      clean: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 3l3 3-9 9H9v-3l9-9z"></path><path d="M2.5 21.5l3.5-3.5"></path><path d="M6 18l3 3"></path><path d="M8 16l3 3"></path></svg>',
      branch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>',
      pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>',
      unpin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2" x2="22" y2="22"></line><path d="M12 17v5"></path><path d="M9 9V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v2"></path><path d="M5 17h12"></path><path d="M17 11.5a2 2 0 0 0-.89-1.66l-1.11-.56"></path></svg>',
      open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>'
    };

    let ensureContextMenuStyles = function () {
      const styleId = 'agy-context-menu-styles';
      if (document.getElementById(styleId)) return;
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        #agy-universal-context-menu {
          position: fixed !important;
          z-index: 2147483647 !important;
          min-width: 175px;
          max-width: 280px;
          background: var(--popover, var(--card, var(--sidebar, var(--background, #ffffff))));
          border: 1px solid var(--border, rgba(125, 125, 125, 0.25));
          border-radius: var(--radius, 8px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
          padding: 4px;
          color: var(--popover-foreground, var(--foreground, #101010));
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 13px;
          line-height: 19.5px;
          user-select: none;
          animation: agy-menu-fade-in 0.1s ease-out;
        }
        @keyframes agy-menu-fade-in {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .agy-context-menu-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.12s ease, color 0.12s ease;
          white-space: nowrap;
          color: var(--secondary-foreground, var(--foreground, #101010));
          font-size: 13px;
          line-height: 19.5px;
          font-weight: 400;
        }
        .agy-context-menu-item:hover {
          background: var(--secondary, rgba(125, 125, 125, 0.15));
          color: var(--foreground, #101010);
        }
        .agy-context-menu-item.danger {
          color: var(--destructive, #ef4444) !important;
        }
        .agy-context-menu-item.danger .agy-context-menu-icon {
          color: var(--destructive, #ef4444) !important;
        }
        .agy-context-menu-item.danger:hover {
          background: rgba(239, 68, 68, 0.14) !important;
          color: var(--destructive, #ef4444) !important;
        }
        .agy-context-menu-icon {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--secondary-foreground, var(--foreground, #101010));
          opacity: 0.85;
        }
        .agy-context-menu-item:hover .agy-context-menu-icon {
          opacity: 1;
          color: var(--foreground, #101010);
        }
        .agy-context-menu-icon svg {
          width: 16px;
          height: 16px;
          stroke: currentColor;
        }
        .agy-context-menu-label {
          flex: 1;
          font-weight: 400;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .agy-context-menu-sep {
          height: 1px;
          margin: 4px -4px;
          background: var(--border, rgba(125, 125, 125, 0.18));
        }
      `;
      document.head.appendChild(style);
    };

    let dismissUniversalContextMenu = function () {
      const menu = document.getElementById('agy-universal-context-menu');
      if (menu) menu.remove();
    };

    let copyText = function (text) {
      if (!text) return;
      navigator.clipboard.writeText(text).catch(() => {});
    };

    let renderMenu = function (items, clientX, clientY) {
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
        row.className = 'agy-context-menu-item' + (item.danger ? ' danger' : '');
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
    };

    let showWorktreeConfirmModal = null;
    let getCurrentProjectInfo = null;
    let extractWorktreeInfo = null;
    let executePurge = null;
    let renderWorktreeContextMenu = null;
    let resolveWorktreeOrBranchTarget = null;
    let handleWorktreeDeleteAction = null;

    function initContextMenuSupport() {
      if (USER_CONFIG.ENABLE_CONTEXT_MENU === false) return;

      if (contextMenuHandler) {
        document.removeEventListener('contextmenu', contextMenuHandler, true);
      }

      ensureContextMenuStyles();

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
        const actionToken = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        // 1. 发送给后台守护进程直接将真实图片写入系统原生剪贴板
        console.log(`[AGY_COPY_IMAGE][${actionToken}]` + filePath);

        // 2. 如果当前页面存在该图片的 img 节点，同时尝试通过浏览器写入剪贴板
        try {
          const fn = filePath.split(/[\\/]/).pop();
          if (fn) {
            const img = document.querySelector(`img[src*="${fn}"], img[alt*="${fn}"]`);
            if (img) copyImageBlob(img);
          }
        } catch (e) {}
      }

      function openPath(pathStr) {
        if (!pathStr) return;
        const actionToken = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        console.log(`[AGY_OPEN_PATH][${actionToken}]` + pathStr);
      }

      function revealPath(pathStr) {
        if (!pathStr) return;
        const actionToken = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        console.log(`[AGY_REVEAL_PATH][${actionToken}]` + pathStr);
      }

      function openExternalUrl(url) {
        if (!url) return;
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

        if (p.startsWith('MEDIA_DIR:') || p.startsWith('MEDIA_INDEX:')) {
          const convoId = p.split(':')[1];
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
          // 如果末尾带有非点开头的正规文件名扩展名（如 .md, .png, .js 等，排除 .gemini 等隐藏目录），去除文件名保留纯目录
          if (/^[^.]+\.[a-zA-Z0-9_-]+$/i.test(lastSegment)) {
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

        // 1. 本地物理路径 file:/// 协议或原生绝对路径
        if (src.startsWith('file:///')) {
          let clean = decodeURIComponent(src.replace(/^file:\/\/\/?/i, '')).replace(/\//g, '\\');
          return clean.replace(/^\/([a-zA-Z]:)/, '$1');
        }
        if (/^[a-zA-Z]:[/\\]/.test(src)) {
          return src.replace(/\//g, '\\');
        }

        // 2. DOM 节点直接属性 (data-path, data-file-path)
        const pathAttr = imgEl.getAttribute('data-path') ||
                         imgEl.getAttribute('data-file-path') ||
                         imgEl.getAttribute('data-filepath') ||
                         imgEl.closest('[data-path], [data-file-path], [data-filepath]')?.getAttribute('data-path') ||
                         imgEl.closest('[data-path], [data-file-path], [data-filepath]')?.getAttribute('data-file-path');
        if (pathAttr) {
          if (pathAttr.startsWith('file:///')) {
            let clean = decodeURIComponent(pathAttr.replace(/^file:\/\/\/?/i, '')).replace(/\//g, '\\');
            return clean.replace(/^\/([a-zA-Z]:)/, '$1');
          }
          if (/^[a-zA-Z]:[/\\]/.test(pathAttr)) {
            return pathAttr.replace(/\//g, '\\');
          }
        }

        // 3. 计算在当前气泡或容器中的图片索引 (用于在多图 media 数组中精准定位具体图片)
        let targetIndex = 0;
        const btn = imgEl.closest('button');
        const tooltipId = btn?.getAttribute('data-tooltip-id') || '';
        const idxMatch = tooltipId.match(/-img-(\d+)$/);
        if (idxMatch) {
          targetIndex = parseInt(idxMatch[1], 10);
        } else {
          const altMatch = (imgEl.getAttribute('alt') || '').match(/media\s*(\d+)/i);
          if (altMatch) {
            targetIndex = Math.max(0, parseInt(altMatch[1], 10) - 1);
          } else {
            const pContainer = imgEl.closest('.flex-wrap, [class*="gap-2"]') || imgEl.parentElement;
            if (pContainer) {
              const allImgs = Array.from(pContainer.querySelectorAll('img')).filter(im => !im.closest('button[data-tooltip-id*="avatar"], .avatar'));
              const pos = allImgs.indexOf(imgEl);
              if (pos !== -1) targetIndex = pos;
            }
          }
        }

        // 4. 深度穿透探测 React Fiber（获取原生 media[targetIndex].uri、fileUri 或 file.path）
        try {
          let curr = imgEl;
          let depth = 0;
          while (curr && depth < 6) {
            const fiberKey = Object.keys(curr).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
            if (fiberKey) {
              let f = curr[fiberKey];
              let fDepth = 0;
              while (f && fDepth < 30) {
                const props = f.memoizedProps;
                if (props) {
                  // 4a. 核心：原生用户上传 media 数组（exa.codeium_common_pb.Media，自带 uri 字段）
                  if (Array.isArray(props.media) && props.media.length > 0) {
                    const item = props.media[targetIndex] || props.media[0];
                    const rawUri = item?.uri || item?.filePath || item?.path;
                    if (typeof rawUri === 'string' && (/^[a-zA-Z]:[/\\]/.test(rawUri) || rawUri.startsWith('file:///'))) {
                      let clean = decodeURIComponent(rawUri.replace(/^file:\/\/\/?/i, '')).replace(/\//g, '\\');
                      return clean.replace(/^\/([a-zA-Z]:)/, '$1');
                    }
                  } else if (props.media && typeof props.media === 'object') {
                    const rawUri = props.media.uri || props.media.filePath || props.media.path;
                    if (typeof rawUri === 'string' && (/^[a-zA-Z]:[/\\]/.test(rawUri) || rawUri.startsWith('file:///'))) {
                      let clean = decodeURIComponent(rawUri.replace(/^file:\/\/\/?/i, '')).replace(/\//g, '\\');
                      return clean.replace(/^\/([a-zA-Z]:)/, '$1');
                    }
                  }

                  // 4b. 单项或附件中的 file/upload 对象
                  const fileObj = props.file || props.attachment?.file || props.item?.file || props.upload?.file;
                  if (fileObj && typeof fileObj.path === 'string' && /^[a-zA-Z]:[/\\]/.test(fileObj.path)) {
                    return fileObj.path.replace(/\//g, '\\');
                  }

                  // 4c. 针对常见直接字符串属性 (包含 uri, fileUri, path 等)
                  for (const key of ['uri', 'fileUri', 'filePath', 'path', 'nativePath', 'originalPath', 'localPath']) {
                    const val = props[key] || props.attachment?.[key] || props.item?.[key];
                    if (typeof val === 'string') {
                      if (/^[a-zA-Z]:[/\\]/.test(val)) return val.replace(/\//g, '\\');
                      if (val.startsWith('file:///')) {
                        let clean = decodeURIComponent(val.replace(/^file:\/\/\/?/i, '')).replace(/\//g, '\\');
                        return clean.replace(/^\/([a-zA-Z]:)/, '$1');
                      }
                    }
                  }
                }
                f = f.return;
                fDepth++;
              }
            }
            curr = curr.parentElement;
            depth++;
          }
        } catch (err) {}

        // 5. 在工件查看器 (Artifact Viewer) 中打开的图片
        const inArtifactViewer = imgEl.closest('[aria-label="Artifact Viewer"], [role="region"][aria-label="Artifact Viewer"], [aria-label="Artifact Viewer header"], #artifact-container, .artifact-view, [data-testid="artifact-view"], [data-aux-pane-open="true"]');
        if (inArtifactViewer) {
          const activeArtifactPath = getActiveArtifactPath(imgEl);
          if (activeArtifactPath) {
            return activeArtifactPath;
          }
        }

        // 6. 用户在提示词/提问历史中上传的图片（兜底匹配）
        const userTurn = imgEl.closest('.group\\/user-input-step, [class*="user-input-step"]');
        const inPromptInput = !userTurn && !!imgEl.closest('form, [data-testid*="prompt" i], [data-testid*="input" i], [class*="prompt" i], [class*="input" i]');
        const alt = imgEl.getAttribute('alt') || '';
        const title = imgEl.getAttribute('title') || '';
        const convoId = (typeof getCurrentUrlConvoId === 'function' ? getCurrentUrlConvoId() : null) ||
                        (window.location.pathname.match(/\/c\/([a-f0-9-]+)/i)?.[1]) || '';

        // 6a. 如果直接在 alt / title / src 或其最近容器中包含具体的 media_xxxx.png 命名
        const fullContext = alt + ' ' + title + ' ' + src + ' ' +
                            (imgEl.closest('[class*="media"], [data-media-id], [class*="user-input"]')?.innerText || '');
        const mediaMatch = fullContext.match(/(media_\d+\.[a-zA-Z0-9]+)/i) || src.match(/(media_\d+\.[a-zA-Z0-9]+)/i);
        if (mediaMatch && convoId) {
          return `MEDIA:${convoId}:${mediaMatch[1]}`;
        }

        // 6b. 如果在已发送的用户提问气泡中，从该气泡的 Fiber 数据源（包含完整 ADDITIONAL_METADATA）中精准提取具体落盘图片文件名
        if (userTurn && convoId) {
          try {
            const fiberKey = Object.keys(userTurn).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
            let f = userTurn[fiberKey];
            let fDepth = 0;
            while (f && fDepth < 30) {
              const p = f.memoizedProps;
              if (p) {
                // 检查 step 中的 media 数组
                const stepMedia = p.step?.media || p.userStep?.step?.media;
                if (Array.isArray(stepMedia) && stepMedia.length > 0) {
                  const mItem = stepMedia[targetIndex] || stepMedia[0];
                  if (mItem?.uri && typeof mItem.uri === 'string') {
                    let clean = decodeURIComponent(mItem.uri.replace(/^file:\/\/\/?/i, '')).replace(/\//g, '\\');
                    return clean.replace(/^\/([a-zA-Z]:)/, '$1');
                  }
                }

                const msg = p.message || p.userMessage || p.step?.userMessage || p.step?.text || p.step?.content || p.step?.value?.userMessage || p.step?.value?.content;
                if (typeof msg === 'string' && msg.includes('.user_uploaded')) {
                  const matches = Array.from(msg.matchAll(/(?:[a-zA-Z]:[\\\/]|\/)[^\r\n"']*?\.user_uploaded[\\\/](media_\d+\.[a-zA-Z0-9]+)/gi));
                  if (matches.length > 0) {
                    const targetMatch = matches[targetIndex] || matches[0];
                    if (targetMatch && targetMatch[1]) {
                      const matchedConvoMatch = targetMatch[0].match(/brain[\\\/]([a-f0-9-]+)[\\\/]\.user_uploaded/i);
                      const targetConvoId = matchedConvoMatch ? matchedConvoMatch[1] : convoId;
                      return `MEDIA:${targetConvoId}:${targetMatch[1]}`;
                    }
                  }
                }
              }
              f = f.return;
              fDepth++;
            }
          } catch (e) {}

          // 6c. 若 Fiber 内未直接找到明文，但确认是已落盘历史气泡，采用次序索引定位具体文件
          try {
            const allUserTurns = Array.from(document.querySelectorAll('.group\\/user-input-step, [class*="user-input-step"]'));
            let foundIndex = -1;
            let count = 0;
            for (const ut of allUserTurns) {
              const imgs = Array.from(ut.querySelectorAll('img')).filter(im => !im.closest('button[data-tooltip-id*="avatar"], .avatar, [class*="avatar"]'));
              for (const im of imgs) {
                if (im === imgEl) {
                  foundIndex = count;
                  break;
                }
                count++;
              }
              if (foundIndex !== -1) break;
            }
            if (foundIndex !== -1) {
              return `MEDIA_INDEX:${convoId}:${foundIndex}`;
            }
          } catch (e2) {}

          return `MEDIA_DIR:${convoId}`;
        }

        // 6d. 如果图片在提示词输入框中（尚未发送，纯内存 blob/dataURL 预览，且无本地物理路径）
        // 绝不伪造返回锁死的空目录，应返回 null，让右键菜单仅展示复制图片和另存为
        if (inPromptInput) {
          return null;
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
        let quoteBtn = document.querySelector('[data-testid="selection-quote-button"], [data-testid="selection-popup-quote-button"], [data-testid*="quote" i], button[aria-label*="Quote" i], button[title*="Quote" i]');
        if (!quoteBtn) {
          const blockedNodes = document.querySelectorAll('[data-agy-block-quote="true"], .agy-hide-quote-item, .selection-popup, .selection-quote-popup');
          for (const node of blockedNodes) {
            const btn = node.matches('button, [role="button"]') ? node : node.querySelector('button, [role="button"]');
            if (btn) {
              const text = (btn.textContent || '').trim();
              const aria = (btn.getAttribute('aria-label') || '').trim();
              const testid = (btn.getAttribute('data-testid') || '').trim();
              if (/Quote|引用/i.test(text) || /Quote|引用/i.test(aria) || /quote/i.test(testid)) {
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
        let commentBtn = document.querySelector('[data-testid="selection-comment-button"], [data-testid*="comment" i], button[aria-label*="Comment" i], button[title*="Comment" i], .comment-button');
        if (!commentBtn) {
          const blockedNodes = document.querySelectorAll('[data-agy-block-quote="true"], .agy-hide-quote-item, .selection-popup, .selection-quote-popup');
          for (const node of blockedNodes) {
            const btn = node.matches('button, [role="button"]') ? node : node.querySelector('button, [role="button"]');
            if (btn) {
              const text = (btn.textContent || '').trim();
              const aria = (btn.getAttribute('aria-label') || '').trim();
              const testid = (btn.getAttribute('data-testid') || '').trim();
              if (/Comment|评论/i.test(text) || /Comment|评论/i.test(aria) || /comment/i.test(testid)) {
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

      function extractPathFromText(text) {
        if (!text) return null;
        let str = text.trim();

        // 如果文本本身是网络 URL 或以协议开头，直接排除（严防网址被误识别为本地路径）
        if (/^https?:\/\//i.test(str) || /^www\./i.test(str) || /^ftp:\/\//i.test(str)) {
          return null;
        }

        // 匹配 Windows 盘符绝对路径:
        // 1. 盘符前必须为字符串开始或非字母数字字符（严防 https: 中的 s: 被误判为驱动器）
        // 2. 盘符冒号后必须为单个斜杠，不能紧随第二个斜杠（排除 scheme:// 协议语法）
        const winMatch = str.match(/(?:^|[^a-zA-Z0-9_])([a-zA-Z]:[\\/](?![\\/])[^:*?"<>|\r\n\s\t`'"]*)/);
        if (winMatch) {
          let p = winMatch[1].replace(/[.,;:，。；)\]>]+$/, '');
          // 确保长度且包含至少一个有效路径分隔符
          if (p.length >= 3 && (p.includes('\\') || p.includes('/'))) {
            return p.replace(/\//g, '\\');
          }
        }

        // 匹配 Unix 绝对路径 (如 /Users/... 或 /home/... 或 /c/Users/...)
        const unixMatch = str.match(/(?:^|[^a-zA-Z0-9_])(\/(?:Users|home|root|var|etc|opt|tmp|mnt|c|d|e|projects)[\\/][^:*?"<>|\r\n\s\t`'"]*)/i);
        if (unixMatch) {
          let p = unixMatch[1].replace(/[.,;:，。；)\]>]+$/, '');
          if (p.length >= 4) {
            // 如果是 /c/Users/... 形式，转为 Windows 驱动器 C:\Users\...
            const driveMatch = p.match(/^\/([a-zA-Z])\/(.*)/);
            if (driveMatch) {
              return `${driveMatch[1].toUpperCase()}:\\${driveMatch[2].replace(/\//g, '\\')}`;
            }
            return p;
          }
        }

        return null;
      }

      function resolveLocalPathString(target, selectedText) {
        if (!target && !selectedText) return null;

        // 1. 优先检测带有 file:/// 协议的超链接或属性节点
        const a = target?.closest?.('a[href]');
        if (a && a.href && a.href.startsWith('file:///')) {
          let clean = decodeURIComponent(a.href.replace(/^file:\/\/\/?/i, '')).replace(/\//g, '\\');
          return clean.replace(/^\/([a-zA-Z]:)/, '$1');
        }
        const pathAttrEl = target?.closest?.('[data-path], [data-file-path], [data-filepath]');
        if (pathAttrEl) {
          const p = pathAttrEl.getAttribute('data-path') || pathAttrEl.getAttribute('data-file-path') || pathAttrEl.getAttribute('data-filepath');
          if (p) return p.replace(/\//g, '\\');
        }

        // 2. 划选文本检测
        if (selectedText) {
          const match = extractPathFromText(selectedText);
          if (match) return match;
        }

        // 3. 检查当前节点或父级 code 标签（行内代码 <code>C:\...</code>）
        const codeEl = target?.closest?.('code');
        if (codeEl) {
          const match = extractPathFromText(codeEl.innerText || codeEl.textContent || '');
          if (match) return match;
        }

        // 4. 当前点击的节点文本 (短文本行内提取)
        const text = (target?.innerText || target?.textContent || '').trim();
        if (text && text.length < 500) {
          const match = extractPathFromText(text);
          if (match) return match;
        }

        return null;
      }

      function resolveHyperlinkUrl(target, selectedText) {
        if (!target && !selectedText) return null;

        // 1. 优先检测真实超链接 <a>
        const a = target?.closest?.('a[href]');
        if (a && a.href && !a.href.startsWith('file:///')) {
          return a.href;
        }

        // 2. 检测划选文本中的 URL
        const selCandidate = selectedText ? selectedText.trim() : '';
        if (selCandidate) {
          const m = selCandidate.match(/(https?:\/\/[^\s"'<>]+|www\.[^\s"'<>]+)/i);
          if (m) {
            let url = m[1].replace(/[.,;:)"'}>]+$/, '');
            if (url.startsWith('www.')) url = 'https://' + url;
            return url;
          }
        }

        // 3. 检测 target 元素文本或最近的 code 标签文本 (行内代码 / 纯文本网址)
        const codeEl = target?.closest?.('code');
        const textToScan = codeEl ? (codeEl.innerText || codeEl.textContent || '') : (target?.textContent || '');
        if (textToScan && textToScan.length < 500) {
          const m = textToScan.match(/(https?:\/\/[^\s"'<>]+|www\.[^\s"'<>]+)/i);
          if (m) {
            let url = m[1].replace(/[.,;:)"'}>]+$/, '');
            if (url.startsWith('www.')) url = 'https://' + url;
            return url;
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

      function enableSystemForkingFeature() {
        try {
          const root = document.getElementById('root');
          if (!root) return false;
          const fiberKey = Object.keys(root).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$'));
          if (!fiberKey) return false;
          let f = root[fiberKey];
          let registry = null;
          function walk(node, d) {
            if (!node || d > 35 || registry) return;
            if (node.memoizedProps?.value && typeof node.memoizedProps.value.get === 'function') {
              try {
                if (node.memoizedProps.value.get('conversationView')) {
                  registry = node.memoizedProps.value;
                  return;
                }
              } catch (e) {}
            }
            if (node.child) walk(node.child, d + 1);
            if (!registry && node.sibling) walk(node.sibling, d);
          }
          walk(f, 0);
          if (registry) {
            const cv = registry.get('conversationView');
            if (cv) {
              let updated = false;
              if (!cv.conversationForkingEnabled) {
                cv.conversationForkingEnabled = true;
                updated = true;
              }
              if (!cv.conversationForkingHistoricalStep) {
                cv.conversationForkingHistoricalStep = true;
                updated = true;
              }
              if (!cv.conversationForkingNewWorktree) {
                cv.conversationForkingNewWorktree = true;
                updated = true;
              }
              return true;
            }
          }
        } catch (err) {}
        return false;
      }

      function triggerForkAction(forkBtn) {
        if (!forkBtn) return;
        try {
          const fiberKey = Object.keys(forkBtn).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
          const fiber = forkBtn[fiberKey];
          const props = fiber?.memoizedProps;
          if (props?.onPointerDown) {
            props.onPointerDown({
              preventDefault: () => {},
              stopPropagation: () => {},
              nativeEvent: new MouseEvent('pointerdown', { bubbles: true, cancelable: true }),
              currentTarget: forkBtn,
              target: forkBtn,
              isDefaultPrevented: () => false,
              pointerType: 'mouse',
              button: 0,
              isPrimary: true
            });
          }
          if (props?.onClick) {
            props.onClick({
              preventDefault: () => {},
              stopPropagation: () => {},
              nativeEvent: new MouseEvent('click', { bubbles: true, cancelable: true }),
              currentTarget: forkBtn,
              target: forkBtn,
              isDefaultPrevented: () => false
            });
          }
          forkBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }));
          forkBtn.click();
        } catch (e) {
          forkBtn.click();
        }
      }

      function executeForkAction(forkBtn, targetType = 1, sourceTitle = '') {
        if (!forkBtn) return;
        const currentConvoId = getCurrentUrlConvoId() || '';
        if (targetType === 2) {
          const safety = checkWorkspaceGitBranchSafety(currentConvoId);
          if (!safety.safe) {
            showNotification?.(safety.reason || '项目目录包含空格，Git 无法创建分支');
            return;
          }
        }

        const baseTitle = (sourceTitle || getCurrentConversationTitle() || '对话').replace(/^(?:分支[：:]\s*)+/g, '').trim();
        pendingForkBranchRename = {
          sourceConvoId: currentConvoId,
          newTitle: `分支：${baseTitle || '新会话'}`,
          timestamp: Date.now()
        };

        triggerForkAction(forkBtn);

        // 轮询检测到选项后自动触发对应类型 (1: 纯切片对话; 2: shared workspace / worktree)
        let attempts = 0;
        const poll = () => {
          const opts = Array.from(document.querySelectorAll('[data-testid="fork-target-option"]'));
          if (opts.length > 0) {
            if (targetType === 1) {
              opts[0].click();
            } else if (targetType === 2 && opts.length > 1) {
              opts[1].click();
            } else {
              opts[0].click();
            }
            return;
          }
          if (++attempts < 25) {
            setTimeout(poll, 25);
          }
        };
        setTimeout(poll, 15);
      }

      function getCurrentConversationTitle() {
        const titleFromDoc = (document.title || '').split(' - ')[0]?.trim();
        if (titleFromDoc && titleFromDoc !== 'Antigravity') return titleFromDoc;
        const selectedRow = document.querySelector('[data-testid="conversation-row-sidebar"][data-selected="true"]');
        if (selectedRow) {
          const text = (selectedRow.innerText || '').split('\n')[0]?.trim();
          if (text) return text;
        }
        return 'response';
      }

      function resolveAiResponseTurn(target) {
        if (!target) return null;
        // 排除输入框、右侧栏抽屉、侧边栏
        if (target.closest('form, [contenteditable="true"], textarea, .no-focus-agent-input, #artifacts-sidebar, [aria-label="Artifact Viewer"], [role="region"][aria-label="Artifact Viewer"], [data-testid="conversation-row-sidebar"]')) {
          return null;
        }
        // 排除用户提问气泡
        if (target.closest('.group\\/user-input-step, [class*="user-input-step"]')) {
          return null;
        }
        // 必须在对话区域内
        const convoView = target.closest('[data-testid="conversation-view"], [data-testid="autoscroll-viewport"], .md-table-bleed, main, [role="main"]');
        if (!convoView) return null;

        // 寻找包含当前 target 的 AI 步骤块
        let turnEl = target.closest('.group.w-full, [class*="scroll-mt-4"], .flex.items-start');
        let toolbar = turnEl?.querySelector?.('[data-testid="cascade-system-message-toolbar"]');

        if (!toolbar) {
          // 向上逐层寻找包含 toolbar 的容器
          let curr = target;
          while (curr && curr !== convoView && !toolbar) {
            toolbar = curr.querySelector?.('[data-testid="cascade-system-message-toolbar"]');
            if (toolbar) {
              turnEl = curr;
              break;
            }
            curr = curr.parentElement;
          }
        }

        if (!toolbar && !turnEl) return null;

        const copyBtn = toolbar?.querySelector('button[aria-label="Copy"], button[aria-label="Copied"], button[data-tooltip-id*="copy-"]:not([data-tooltip-id*="copy-user-message"]):not([data-tooltip-id*="copy-code"])');
        const forkBtn = toolbar?.querySelector('button[aria-label="Fork Conversation"], button[data-tooltip-id*="fork-"]');

        let markdownText = '';
        try {
          const fiberKey = Object.keys(toolbar || turnEl || {}).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
          let f = (toolbar || turnEl)[fiberKey];
          while (f) {
            if (f.memoizedProps?.steps) {
              const steps = f.memoizedProps.steps;
              for (const s of steps) {
                const stepObj = s.step?.value || s.step;
                if (stepObj?.response || stepObj?.modifiedResponse) {
                  markdownText = stepObj.modifiedResponse || stepObj.response || '';
                  break;
                }
              }
              if (markdownText) break;
            }
            f = f.return;
          }
        } catch (e) {}

        if (!markdownText && turnEl) {
          const clone = turnEl.cloneNode(true);
          clone.querySelector('[data-testid="cascade-system-message-toolbar"]')?.remove();
          markdownText = clone.innerText?.trim() || '';
        }

        return {
          turnEl,
          toolbar,
          copyBtn,
          forkBtn,
          markdownText
        };
      }

      // 5.1 触发系统自带的对话重命名功能
      function triggerSystemConversationRename() {
        const convoId = getCurrentUrlConvoId();
        let targetRow = (convoId ? document.querySelector(`[data-testid="conversation-row-sidebar"][data-cascade-id="${convoId}"]`) : null) ||
                        document.querySelector('[data-testid="conversation-row-sidebar"][data-selected="true"]');

        if (!targetRow && convoId) {
          const allRows = document.querySelectorAll('[data-testid="conversation-row-sidebar"]');
          for (const r of allRows) {
            if (r.getAttribute('data-cascade-id') === convoId || r.getAttribute('data-selected') === 'true') {
              targetRow = r;
              break;
            }
          }
        }

        if (targetRow) {
          try { targetRow.scrollIntoView({ block: 'nearest', behavior: 'instant' }); } catch (e) {}
          const moreBtn = targetRow.querySelector('button[aria-label="More options"]');
          if (moreBtn) {
            moreBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
            moreBtn.click();

            let attempts = 0;
            const pollForRenameItem = () => {
              const renameItem = document.querySelector('[data-testid="conversation-rename-menu-item"]');
              if (renameItem) {
                renameItem.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                renameItem.click();
                return;
              }
              if (++attempts < 20) {
                setTimeout(pollForRenameItem, 20);
              } else {
                fallbackDirectRename(convoId);
              }
            };
            setTimeout(pollForRenameItem, 20);
            return;
          }
        }

        fallbackDirectRename(convoId);
      }

      async function fallbackDirectRename(convoId) {
        const targetId = convoId || getCurrentUrlConvoId();
        const currentTitle = getCurrentConversationTitle();
        const newTitle = window.prompt('Rename conversation:', currentTitle);
        if (newTitle && newTitle.trim() && newTitle.trim() !== currentTitle) {
          const trimmed = newTitle.trim();
          const as = getAgentService();
          if (as?.updateConversationAnnotations && targetId) {
            try {
              await as.updateConversationAnnotations(targetId, { title: trimmed }, true);
            } catch (err) {}
          }
          const tsp = getTSP();
          const s = targetId ? tsp?.getState()?.summaries?.[targetId] : null;
          if (s) {
            s.summary = trimmed;
            s.title = trimmed;
          }
          document.title = `${trimmed} - Antigravity`;
          showNotification?.('Conversation renamed');
        }
      }

      function getAiTurnMenuItems(aiTurn) {
        if (!aiTurn) return [];
        const hasWorktreeSupport = canForkInSharedWorkspace();
        const items = [];

        items.push(
          {
            label: 'Copy Response',
            icon: 'copy',
            action: () => {
              if (aiTurn.copyBtn) {
                aiTurn.copyBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                aiTurn.copyBtn.click();
              } else if (aiTurn.markdownText) {
                copyText(aiTurn.markdownText);
                showNotification?.('已复制回复内容');
              }
            }
          },
          {
            label: 'Export as Markdown',
            icon: 'save',
            action: () => {
              const md = aiTurn.markdownText;
              if (!md) {
                showNotification?.('未获取到回复内容');
                return;
              }
              const safeTitle = getCurrentConversationTitle().replace(/[\\/:*?"<>|]/g, '_').slice(0, 30).trim();
              const d = new Date();
              const pad = (n) => String(n).padStart(2, '0');
              const timeStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
              const filename = `${safeTitle || 'response'}_${timeStr}.md`;
              saveFileLocally(md, filename);
              showNotification?.('已导出 Markdown 文档');
            }
          },
          {
            label: 'Rename',
            icon: 'edit',
            action: () => {
              triggerSystemConversationRename();
            }
          }
        );

        if (USER_CONFIG.ENABLE_FORK_CONVERSATION !== false) {
          items.push({
            label: 'Create fork in current workspace',
            icon: 'fork',
            action: () => {
              enableSystemForkingFeature();
              let btn = aiTurn.forkBtn;
              if (!btn && aiTurn.toolbar) {
                btn = aiTurn.toolbar.querySelector('button[aria-label="Fork Conversation"], button[data-tooltip-id*="fork-"]');
              }
              if (!btn && aiTurn.turnEl) {
                btn = aiTurn.turnEl.querySelector('button[aria-label="Fork Conversation"], button[data-tooltip-id*="fork-"]');
              }
              if (btn) {
                executeForkAction(btn, 1, getCurrentConversationTitle());
              } else {
                setTimeout(() => {
                  const retryBtn = (aiTurn.toolbar || aiTurn.turnEl || document).querySelector('button[aria-label="Fork Conversation"], button[data-tooltip-id*="fork-"]');
                  if (retryBtn) {
                    executeForkAction(retryBtn, 1, getCurrentConversationTitle());
                  } else {
                    showNotification?.('已激活分叉功能，请重试');
                  }
                }, 100);
              }
            }
          });

          if (hasWorktreeSupport) {
            items.push({
              label: 'Create fork in shared workspace',
              icon: 'folder',
              action: () => {
                enableSystemForkingFeature();
                let btn = aiTurn.forkBtn;
                if (!btn && aiTurn.toolbar) {
                  btn = aiTurn.toolbar.querySelector('button[aria-label="Fork Conversation"], button[data-tooltip-id*="fork-"]');
                }
                if (!btn && aiTurn.turnEl) {
                  btn = aiTurn.turnEl.querySelector('button[aria-label="Fork Conversation"], button[data-tooltip-id*="fork-"]');
                }
                if (btn) {
                  executeForkAction(btn, 2, getCurrentConversationTitle());
                } else {
                  setTimeout(() => {
                    const retryBtn = (aiTurn.toolbar || aiTurn.turnEl || document).querySelector('button[aria-label="Fork Conversation"], button[data-tooltip-id*="fork-"]');
                    if (retryBtn) {
                      executeForkAction(retryBtn, 2, getCurrentConversationTitle());
                    } else {
                      showNotification?.('已激活分叉功能，请重试');
                    }
                  }, 100);
                }
              }
            });
          }
        }

        if (USER_CONFIG.ENABLE_PINNED_SUMMARY !== false && typeof isAiTurnPinned === 'function') {
          const isPinned = isAiTurnPinned(aiTurn);
          items.push({ separator: true });
          items.push({
            label: isPinned ? 'Unpin AI response' : 'Pin AI response',
            icon: isPinned ? 'unpin' : 'pin',
            action: () => {
              if (typeof toggleAiTurnPin === 'function') {
                toggleAiTurnPin(aiTurn);
              }
            }
          });
        }

        return items;
      }

      // 6.1 HTML 转 Markdown 转换器（保留标题、粗体、斜体、代码、列表、引用、表格、公式）
      function htmlToMarkdown(node) {
        if (!node) return '';
        if (node.nodeType === Node.TEXT_NODE) {
          return node.nodeValue || '';
        }
        if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
          return '';
        }

        // DocumentFragment 处理
        if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
          let res = '';
          for (let i = 0; i < node.childNodes.length; i++) {
            res += htmlToMarkdown(node.childNodes[i]);
          }
          return res;
        }

        // KaTeX 数学公式支持
        if (node.classList?.contains('katex') || node.classList?.contains('katex-display')) {
          const texEl = node.querySelector?.('annotation[encoding*="tex"]');
          if (texEl?.textContent) {
            const isDisplay = node.classList.contains('katex-display') || !!node.closest?.('.katex-display');
            return isDisplay ? `\n\n$$${texEl.textContent.trim()}$$\n\n` : `$${texEl.textContent.trim()}$`;
          }
        }

        const tag = (node.tagName || '').toLowerCase();
        if (['style', 'script', 'noscript', 'svg'].includes(tag)) {
          return '';
        }

        let children = '';
        for (let i = 0; i < node.childNodes.length; i++) {
          children += htmlToMarkdown(node.childNodes[i]);
        }

        switch (tag) {
          case 'h1': return `\n\n# ${children.trim()}\n\n`;
          case 'h2': return `\n\n## ${children.trim()}\n\n`;
          case 'h3': return `\n\n### ${children.trim()}\n\n`;
          case 'h4': return `\n\n#### ${children.trim()}\n\n`;
          case 'h5': return `\n\n##### ${children.trim()}\n\n`;
          case 'h6': return `\n\n###### ${children.trim()}\n\n`;
          case 'p': return `\n\n${children.trim()}\n\n`;
          case 'br': return '\n';
          case 'hr': return '\n\n---\n\n';
          case 'strong':
          case 'b':
            return children.trim() ? `**${children.trim()}**` : '';
          case 'em':
          case 'i':
            return children.trim() ? `*${children.trim()}*` : '';
          case 'del':
          case 's':
          case 'strike':
            return children.trim() ? `~~${children.trim()}~~` : '';
          case 'code': {
            if (node.parentElement && (node.parentElement.tagName || '').toLowerCase() === 'pre') {
              return children;
            }
            return children.trim() ? `\`${children.trim()}\`` : '';
          }
          case 'pre': {
            let lang = '';
            const codeChild = node.querySelector?.('code');
            const classStr = (codeChild?.className || '') + ' ' + (node.className || '');
            const m = classStr.match(/(?:lang|language)-([a-zA-Z0-9_-]+)/);
            if (m) lang = m[1];
            const codeText = (codeChild ? codeChild.textContent : node.textContent) || '';
            return `\n\n\`\`\`${lang}\n${codeText.replace(/\n+$/, '')}\n\`\`\`\n\n`;
          }
          case 'blockquote': {
            const lines = children.trim().split('\n');
            return '\n\n' + lines.map(l => `> ${l}`).join('\n') + '\n\n';
          }
          case 'ul': {
            let res = '\n\n';
            for (let i = 0; i < node.children.length; i++) {
              const li = node.children[i];
              if ((li.tagName || '').toLowerCase() === 'li') {
                res += `- ${htmlToMarkdown(li).trim()}\n`;
              }
            }
            return res + '\n';
          }
          case 'ol': {
            let res = '\n\n';
            let idx = 1;
            for (let i = 0; i < node.children.length; i++) {
              const li = node.children[i];
              if ((li.tagName || '').toLowerCase() === 'li') {
                res += `${idx++}. ${htmlToMarkdown(li).trim()}\n`;
              }
            }
            return res + '\n';
          }
          case 'li':
            return children;
          case 'a': {
            const href = node.getAttribute?.('href');
            const text = children.trim();
            if (href && text && href !== text) {
              return `[${text}](${href})`;
            }
            return text || href || '';
          }
          case 'table': {
            const rows = Array.from(node.querySelectorAll?.('tr') || []);
            if (rows.length === 0) return children;
            let mdTable = '\n\n';
            let colCount = 0;
            rows.forEach((tr, rowIdx) => {
              const cells = Array.from(tr.querySelectorAll('th, td'));
              if (rowIdx === 0) colCount = cells.length;
              const rowStr = '| ' + cells.map(c => htmlToMarkdown(c).trim().replace(/\n/g, ' ')).join(' | ') + ' |\n';
              mdTable += rowStr;
              if (rowIdx === 0) {
                mdTable += '| ' + Array(colCount || cells.length).fill('---').join(' | ') + ' |\n';
              }
            });
            return mdTable + '\n\n';
          }
          case 'th':
          case 'td':
            return children;
          default:
            return children;
        }
      }

      // 6.2 提取选中文本对应的 Markdown 格式内容
      function extractSelectedMarkdown(selection, target, fallbackText) {
        if (!fallbackText && selection) {
          fallbackText = selection.toString().trim();
        }
        if (!fallbackText) return '';

        // 1. 如果选区位于代码块内部
        const codeBlockEl = target?.closest?.('pre, code, .monaco-editor, .code-block');
        if (codeBlockEl) {
          const classStr = (codeBlockEl.className || '') + ' ' + (codeBlockEl.parentElement?.className || '');
          const m = classStr.match(/(?:lang|language)-([a-zA-Z0-9_-]+)/);
          const lang = m ? m[1].toLowerCase() : '';
          const isMd = lang === 'md' || lang === 'markdown';
          if (isMd) {
            return fallbackText;
          }
          if (lang) {
            return `\`\`\`${lang}\n${fallbackText}\n\`\`\``;
          }
          return `\`\`\`\n${fallbackText}\n\`\`\``;
        }

        // 2. 如果选区位于 AI 回复中，优先尝试对齐提取底层原始 Markdown 切片（保留公式、完整 Markdown 格式）
        try {
          const aiTurn = resolveAiResponseTurn(target);
          const rawMd = aiTurn?.markdownText;
          if (rawMd) {
            if (rawMd.includes(fallbackText)) {
              return fallbackText;
            }
            const trimmed = fallbackText.trim();
            if (trimmed.length >= 10) {
              const headLen = Math.min(25, Math.floor(trimmed.length / 2));
              const tailLen = Math.min(25, Math.floor(trimmed.length / 2));
              const head = trimmed.slice(0, headLen);
              const tail = trimmed.slice(-tailLen);
              const startIdx = rawMd.indexOf(head);
              if (startIdx !== -1) {
                const endIdx = rawMd.indexOf(tail, startIdx);
                if (endIdx !== -1) {
                  const slice = rawMd.slice(startIdx, endIdx + tail.length).trim();
                  if (slice) return slice;
                }
              }
            }
          }
        } catch (e) {}

        // 3. 尝试从 DOM Selection Range 精确转为 Markdown
        try {
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const frag = range.cloneContents();
            if (frag && frag.childNodes.length > 0) {
              const converted = htmlToMarkdown(frag).replace(/\n{3,}/g, '\n\n').trim();
              if (converted) return converted;
            }
          }
        } catch (e) {}

        // 4. 兜底返回普通选中文本
        return fallbackText;
      }

      // 6.3 统一 Markdown 文件保存方法
      function saveMarkdownLocally(content, defaultPrefix = 'selection') {
        if (!content || !content.trim()) {
          showNotification?.('No content to export');
          return;
        }
        const safeTitle = getCurrentConversationTitle().replace(/[\\/:*?"<>|]/g, '_').slice(0, 30).trim();
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timeStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
        const filename = `${safeTitle || defaultPrefix}_${timeStr}.md`;
        saveFileLocally(content.trim(), filename);
        showNotification?.('Exported selected Markdown');
      }

      // 7. 全局点击与失焦自动关闭监听
      contextMenuDocClickHandler = (e) => {
        if (!e.target.closest('#agy-universal-context-menu')) {
          dismissUniversalContextMenu();
        }
      };
      document.addEventListener('click', contextMenuDocClickHandler, true);

      contextMenuDocKeydownHandler = (e) => {
        if (e.key === 'Escape') {
          dismissUniversalContextMenu();
        }
      };
      document.addEventListener('keydown', contextMenuDocKeydownHandler, true);

      // 8. 核心 contextmenu 事件总线
      contextMenuHandler = (e) => {
        // 放行机制：按住 Shift 键时放行 Chromium 原生右键菜单
        if (e.shiftKey) {
          dismissUniversalContextMenu();
          return;
        }

        // ------------------ 工作树 / 分支右键（最高优先级） ------------------
        const worktreeOrBranchItem = resolveWorktreeOrBranchTarget?.(e.target);
        if (worktreeOrBranchItem) {
          e.preventDefault();
          e.stopPropagation();
          dismissUniversalContextMenu();
          const info = extractWorktreeInfo?.(worktreeOrBranchItem);
          if (info) {
            renderWorktreeContextMenu?.(e, info, worktreeOrBranchItem);
            return;
          }
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
            const titleEl = convoRow.querySelector('.truncate, [class*="truncate"]');
            activeNativeConvoTitle = titleEl?.innerText?.trim() || convoRow.innerText?.split('\n')[0]?.trim() || '';
            lastNativeConvoId = activeNativeConvoId;
            lastNativeConvoTitle = activeNativeConvoTitle;
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

        // ------------------ 屏蔽左侧栏非卡片区域 / 总栏目头部无意义的原生 Copy 右键 ------------------
        if (USER_CONFIG.ENABLE_BLOCK_SIDEBAR_COPY !== false) {
          const isSidebarHeader = !!e.target?.closest?.(
            '[data-testid="section-header"], [data-title="Workspaces"], [data-title="Projects"], [data-title="Conversations"], button[aria-label="Display Options"], button[aria-label*="project" i], button[aria-label*="workspace" i], button[aria-label*="folder" i]'
          );
          const hasProjectOptions = !!(projectCard?.closest('.group\\/header') || projectCard?.parentElement?.parentElement)?.querySelector('button[aria-label="Project options"]');
          const isRealProjectCard = projectCard && hasProjectOptions;
          const inLeftSidebar = isSidebarHeader || (
            !isRightSidebar(e.target) &&
            !e.target.closest?.('main, [role="main"], [data-testid="conversation-view"], #artifacts-sidebar, [aria-label="Artifact Viewer"], input, textarea, [contenteditable="true"]') &&
            e.clientX < Math.min(450, window.innerWidth * 0.4)
          );

          if (isSidebarHeader || (inLeftSidebar && !convoRow && !isRealProjectCard && !archiveProject && !archiveConvo)) {
            e.preventDefault();
            e.stopPropagation();
            dismissUniversalContextMenu();
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
          const items = [];

          // 仅当图片在本地磁盘上存在（已落盘/已上传/本地文件）时才提供“打开”、“打开所在目录”与“复制路径”
          if (imgDiskPath) {
            items.push({ label: 'Open', icon: 'open', action: () => openPath(imgDiskPath) });
            items.push({ label: 'Reveal in Explorer', icon: 'folder', action: () => revealPath(imgDiskPath) });
            items.push({ label: 'Copy Path', icon: 'copy', action: () => {
              copyText(getDirectoryPath(imgDiskPath));
              showNotification?.('已复制所在目录');
            }});
          }

          items.push({ label: 'Copy Image', icon: 'image', action: () => copyImageBlob(imgEl) });
          // 另存为：自动生成或沿用 media_时间戳.png 命名，免去手动输入
          items.push({ label: 'Save Image As...', icon: 'save', action: () => saveImageLocally(imgEl) });

          renderMenu(items, e.clientX, e.clientY);
          return;
        }

        // 目标 2: 超链接 (Hyperlink / URL - a标签、行内代码或纯文本网址)
        const linkUrl = resolveHyperlinkUrl(target, selectedText);
        if (linkUrl && !selectedText) {
          e.preventDefault();
          e.stopPropagation();
          const items = [
            { label: 'Open Link in Browser', icon: 'external', action: () => openExternalUrl(linkUrl) },
            { label: 'Copy Link Address', icon: 'link', action: () => {
              copyText(linkUrl);
              showNotification?.('已复制链接地址');
            }}
          ];
          const aiTurn = resolveAiResponseTurn(target);
          if (aiTurn) {
            items.push({ separator: true }, ...getAiTurnMenuItems(aiTurn));
          }
          renderMenu(items, e.clientX, e.clientY);
          return;
        }

        // 目标 3: 本地路径 (Local Path)
        const localPath = resolveLocalPathString(target, selectedText);
        if (localPath && !selectedText) {
          e.preventDefault();
          e.stopPropagation();
          const isImg = isImageFilePath(localPath);
          const items = [
            { label: 'Open', icon: 'open', action: () => openPath(localPath) },
            { label: 'Reveal in Explorer', icon: 'folder', action: () => revealPath(localPath) },
            { label: 'Copy Path', icon: 'copy', action: () => {
              copyText(getDirectoryPath(localPath));
              showNotification?.('已复制所在目录');
            }}
          ];
          if (isImg) {
            items.push({ label: 'Copy Image', icon: 'image', action: () => copyImageFile(localPath) });
          }
          const aiTurn = resolveAiResponseTurn(target);
          if (aiTurn) {
            items.push({ separator: true }, ...getAiTurnMenuItems(aiTurn));
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
            { label: 'Open', icon: 'open', action: () => openPath(fileEntity.filePath) },
            { label: 'Reveal in Explorer', icon: 'folder', action: () => revealPath(fileEntity.filePath) },
            { label: 'Copy Path', icon: 'copy', action: () => {
              copyText(getDirectoryPath(fileEntity.filePath));
              showNotification?.('已复制所在目录');
            }}
          ];
          if (isImg) {
            items.push({ label: 'Copy Image', icon: 'image', action: () => copyImageFile(fileEntity.filePath) });
          }
          const aiTurn = resolveAiResponseTurn(target);
          if (aiTurn) {
            items.push({ separator: true }, ...getAiTurnMenuItems(aiTurn));
          }
          renderMenu(items, e.clientX, e.clientY);
          return;
        }

        // 目标 5: 选中文本 / 代码行 (Selected Text / Code Line)
        if (selectedText) {
          e.preventDefault();
          e.stopPropagation();
          const capturedMarkdown = extractSelectedMarkdown(selection, target, selectedText);
          let items = [];
          if (inSidebar) {
            // 右侧栏选中文本: Comment, Copy, Quote, Search, Export as Markdown, Explain
            items = [
              { label: 'Comment', icon: 'comment', action: () => triggerNativeComment(selectedText) },
              { label: 'Copy', icon: 'copy', action: () => copyText(selectedText) },
              { label: 'Quote', icon: 'quote', action: () => triggerNativeQuote(selectedText) },
              {
                label: 'Search', icon: 'search', action: () => {
                  window.open('https://www.google.com/search?q=' + encodeURIComponent(selectedText), '_blank');
                }
              },
              { label: 'Export as Markdown', icon: 'save', action: () => saveMarkdownLocally(capturedMarkdown, 'selection') },
              { label: 'Explain', icon: 'explain', action: () => appendExplainToPrompt(selectedText) }
            ];
          } else {
            // 聊天区选中文本: 若选中文本包含 URL 或 本地路径，智能附加相应直达快捷动作且置于首位
            const selUrl = resolveHyperlinkUrl(null, selectedText);
            const selPath = selUrl ? null : resolveLocalPathString(null, selectedText);
            items = [];
            if (selPath) {
              items.push({ label: 'Open', icon: 'open', action: () => openPath(selPath) });
              items.push({ label: 'Reveal in Explorer', icon: 'folder', action: () => revealPath(selPath) });
              items.push({ label: 'Copy Path', icon: 'copy', action: () => {
                copyText(getDirectoryPath(selPath));
                showNotification?.('已复制所在目录');
              }});
            } else if (selUrl) {
              items.push({ label: 'Open Link in Browser', icon: 'external', action: () => openExternalUrl(selUrl) });
              items.push({ label: 'Copy Link Address', icon: 'link', action: () => {
                copyText(selUrl);
                showNotification?.('已复制链接地址');
              }});
            }
            items.push(
              { label: 'Copy', icon: 'copy', action: () => copyText(selectedText) },
              { label: 'Quote', icon: 'quote', action: () => triggerNativeQuote(selectedText) },
              {
                label: 'Search', icon: 'search', action: () => {
                  window.open('https://www.google.com/search?q=' + encodeURIComponent(selectedText), '_blank');
                }
              },
              { label: 'Export as Markdown', icon: 'save', action: () => saveMarkdownLocally(capturedMarkdown, 'selection') }
            );
            if (USER_CONFIG.ENABLE_PINNED_SUMMARY !== false && typeof pinAiTurnFromSelection === 'function') {
              const aiTurn = resolveAiResponseTurn(target);
              if (aiTurn) {
                // 在右键菜单打开时立即提取选区到末尾的内容，彻底避免后续点击导致 selection Range 丢失
                let capturedTailMarkdown = '';
                try {
                  if (selection && selection.rangeCount > 0 && aiTurn.turnEl) {
                    const range = selection.getRangeAt(0);
                    const cloned = range.cloneRange();
                    const lastChild = aiTurn.turnEl.lastChild || aiTurn.turnEl;
                    cloned.setEndAfter(lastChild);
                    const frag = cloned.cloneContents();
                    if (frag) {
                      // 移除可能混入的代码审查栏、工具条与 diff 状态
                      frag.querySelectorAll?.('[data-testid*="review"], [data-testid*="diff"], [data-testid="cascade-system-message-toolbar"]')?.forEach(el => el.remove());
                      frag.querySelectorAll?.('*')?.forEach(el => {
                        const txt = el.innerText || '';
                        if (/\d+\s*files?\s*changed/i.test(txt) && /review/i.test(txt)) el.remove();
                      });
                      capturedTailMarkdown = htmlToMarkdown(frag).replace(/\n{3,}/g, '\n\n').trim();
                    }
                  }
                } catch (err) {}

                items.push({ separator: true });
                items.push({
                  label: 'Pin from Selection',
                  icon: 'pin',
                  action: () => {
                    pinAiTurnFromSelection(aiTurn, selectedText, capturedTailMarkdown);
                  }
                });
              }
            }
          }
          renderMenu(items, e.clientX, e.clientY);
          return;
        }

        // 目标 6: 代码块 (未划选文字)
        const codeInfo = resolveCodeInfo(target);
        if (codeInfo) {
          e.preventDefault();
          e.stopPropagation();
          const items = [];
          // 如果该代码块位于已打开的 Artifact Viewer 或右侧栏中，优先补充 Open, Reveal in Explorer 与纯所在目录 Copy Path
          const inArtifactViewer = target.closest('[aria-label="Artifact Viewer"], [role="region"][aria-label="Artifact Viewer"], #artifact-container, .artifact-view, [data-aux-pane-open="true"]') || isRightSidebar(target);
          if (inArtifactViewer) {
            const activePath = getActiveArtifactPath(target);
            if (activePath) {
              items.push({ label: 'Open', icon: 'open', action: () => openPath(activePath) });
              items.push({ label: 'Reveal in Explorer', icon: 'folder', action: () => revealPath(activePath) });
              items.push({ label: 'Copy Path', icon: 'copy', action: () => {
                copyText(getDirectoryPath(activePath));
                showNotification?.('已复制所在目录');
              }});
            }
          }
          const nativeCopyCodeBtn = target.closest('pre, code, .code-block, .monaco-editor')?.querySelector?.('button[aria-label="Copy code"]');
          items.push({
            label: 'Copy Code', icon: 'code', action: () => {
              if (nativeCopyCodeBtn) {
                nativeCopyCodeBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                nativeCopyCodeBtn.click();
              } else {
                copyText(codeInfo.codeText);
              }
            }
          });
          items.push({ label: 'Save As...', icon: 'save', action: () => saveFileLocally(codeInfo.codeText, codeInfo.filename) });
          renderMenu(items, e.clientX, e.clientY);
          return;
        }

        // 目标 7: 右侧栏空白处 (Right Sidebar Blank Area - 打开 / 打开所在目录 / 复制所在目录路径)
        if (inSidebar && !selectedText) {
          const activePath = getActiveArtifactPath(target);
          if (activePath) {
            e.preventDefault();
            e.stopPropagation();
            const isImg = isImageFilePath(activePath);
            const items = [
              { label: 'Open', icon: 'open', action: () => openPath(activePath) },
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

        // 目标 8: AI 回复气泡/正文 (AI Assistant Response - 未划选文字)
        if (!selectedText) {
          const aiTurn = resolveAiResponseTurn(target);
          if (aiTurn) {
            e.preventDefault();
            e.stopPropagation();
            renderMenu(getAiTurnMenuItems(aiTurn), e.clientX, e.clientY);
            return;
          }

          // 目标 9: 主聊天区空白区域 (未命中具体回复块时提供 Rename)
          const convoView = target.closest?.('[data-testid="conversation-view"], [data-testid="autoscroll-viewport"], .md-table-bleed, main, [role="main"]');
          if (convoView && !target.closest('form, [contenteditable="true"], textarea, .no-focus-agent-input, #artifacts-sidebar, [aria-label="Artifact Viewer"], [data-testid="conversation-row-sidebar"]')) {
            e.preventDefault();
            e.stopPropagation();
            const items = [
              {
                label: 'Rename',
                icon: 'edit',
                action: () => triggerSystemConversationRename()
              }
            ];
            renderMenu(items, e.clientX, e.clientY);
            return;
          }
        }

      };

      document.addEventListener('contextmenu', contextMenuHandler, true);

      // 初始化激活系统原生分叉特性并挂载定时巡检
      enableSystemForkingFeature();
      addInterval(enableSystemForkingFeature, 3000);
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
                // 安全校验 hook.next.next 是否确实是包含 boolean current 的 RefObject (shouldAutoScroll)
                const hRef = hook.next?.next?.memoizedState;
                if (hRef && typeof hRef === 'object' && Object.prototype.hasOwnProperty.call(hRef, 'current') && typeof hRef.current === 'boolean') {
                  hRef.current = false;
                }
                // 安全校验 hook.next.next.next.next 是否确实是包含 number current 的 RefObject (lastScrollTop)
                const lRef = hook.next?.next?.next?.next?.memoizedState;
                if (lRef && typeof lRef === 'object' && Object.prototype.hasOwnProperty.call(lRef, 'current') && typeof lRef.current === 'number') {
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

        const effectiveConvoId = containerConvoId || urlConvoId || null;

        if (effectiveConvoId !== currentActiveConvoId) {
          // 仅在当前确实是用户在查看该对话时才保存
          if (currentActiveConvoId && isUserInteracting) {
            recordConvoPosition(currentActiveConvoId);
          }
          currentActiveConvoId = effectiveConvoId;

          if (effectiveConvoId) {
            const saved = convoPositionsMap.get(effectiveConvoId);
            if (saved && !saved.isBottom && saved.scrollTop > 5) {
              console.log(`[agy-enhancer] Switched to convo [${effectiveConvoId}], restoring position (scrollTop: ${saved.scrollTop}px)`);
              startRestoration(effectiveConvoId, saved);
            } else {
              endRestoration('new convo or at bottom');
            }
          } else {
            endRestoration('new chat or no convo');
          }
          try { window.__AGY_ON_CONVO_SWITCH__?.(effectiveConvoId); } catch (e) {}
          try { if (effectiveConvoId) window.__AGY_APPLY_FORK_RENAME__?.(effectiveConvoId); } catch (e) {}
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
        try { const cid = getCurrentUrlConvoId(); if (cid) window.__AGY_APPLY_FORK_RENAME__?.(cid); } catch (e) {}
        if (USER_CONFIG.ENABLE_COLLAPSE_HISTORY_PROJECTS) {
          try { onHeartbeatHistoryProjectsCollapser?.(); } catch (e) {}
        }
        return res;
      };

      originalReplaceState = history.replaceState;
      history.replaceState = function (...args) {
        if (currentActiveConvoId && isUserInteracting) {
          recordConvoPosition(currentActiveConvoId);
        }
        const res = originalReplaceState.apply(this, args);
        handleConvoSwitch();
        try { const cid = getCurrentUrlConvoId(); if (cid) window.__AGY_APPLY_FORK_RENAME__?.(cid); } catch (e) {}
        if (USER_CONFIG.ENABLE_COLLAPSE_HISTORY_PROJECTS) {
          try { onHeartbeatHistoryProjectsCollapser?.(); } catch (e) {}
        }
        return res;
      };

      convoSwitchPopstateHandler = handleConvoSwitch;
      window.addEventListener('popstate', convoSwitchPopstateHandler);
      onHeartbeatScrollPersistence = handleConvoSwitch;

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
        const activePane = getActivePane();
        const container = getChatScrollContainer(activePane);
        if (!container) return false;

        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
        // 1. 如果页面总可滚动距离极小（不足 100px），绝对属于短文
        if (maxScroll <= USER_CONFIG.BOTTOM_THRESHOLD) {
          return false;
        }

        // 2. 获取最后一轮问答实际内容高度
        const turnContainer = container.querySelector?.('.relative.flex.flex-col.gap-y-3, .flex.flex-col.gap-y-3') ||
                              activePane?.querySelector?.('.relative.flex.flex-col.gap-y-3, .flex.flex-col.gap-y-3') ||
                              document.querySelector('.relative.flex.flex-col.gap-y-3') ||
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
        if (unreadScrollRafId) {
          cancelAnimationFrame(unreadScrollRafId);
          unreadScrollRafId = null;
        }
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
        if (unreadConvosMap.size === 0) {
          if (currentViewingConvoId) cleanupViewingSession();
          return;
        }

        const container = getChatScrollContainer();
        if (!container) return;

        const effectiveConvoId = (container ? getContainerConvoId(container) : null) || getCurrentUrlConvoId();
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

      // 监听全局滚动捕获与鼠标滚轮事件（使用 requestAnimationFrame 平滑调度，杜绝频繁回流）
      unreadScrollHandler = (e) => {
        if (unreadConvosMap.size === 0) return;
        const container = getChatScrollContainer();
        if (!container) return;
        if (e.target === container || e.target === document || container.contains(e.target)) {
          if (unreadScrollRafId) return;
          unreadScrollRafId = requestAnimationFrame(() => {
            unreadScrollRafId = null;
            handleViewingScroll();
          });
        }
      };
      window.addEventListener('scroll', unreadScrollHandler, true);

      unreadWheelHandler = (e) => {
        if (unreadConvosMap.size === 0) return;
        const container = getChatScrollContainer();
        if (!container) return;
        if (container.contains(e.target) || e.target === container) {
          if (unreadScrollRafId) return;
          unreadScrollRafId = requestAnimationFrame(() => {
            unreadScrollRafId = null;
            handleViewingScroll();
          });
        }
      };
      window.addEventListener('wheel', unreadWheelHandler, { capture: true, passive: true });

      // 对话切换监测（与会话切换事件联动，免除独立高频轮询）
      let trackedConvoId = null;
      function checkConvoSwitchForUnread(forceConvoId) {
        const container = getChatScrollContainer();
        const effectiveConvoId = forceConvoId || (container ? getContainerConvoId(container) : null) || getCurrentUrlConvoId();
        if (effectiveConvoId && effectiveConvoId !== trackedConvoId) {
          trackedConvoId = effectiveConvoId;
          if (unreadConvosMap.has(effectiveConvoId)) {
            setupViewingSession(effectiveConvoId);
          } else {
            cleanupViewingSession();
          }
        }
      }
      window.__AGY_ON_CONVO_SWITCH__ = checkConvoSwitchForUnread;

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

      // 统合侧边栏扫描：单次遍历合并状态检查与红点同步，大幅削减 DOM 重复查询与主线程开销
      function checkAndSyncSidebar() {
        if (isUserTyping()) return;
        const rows = document.querySelectorAll('[data-testid="conversation-row-sidebar"]');
        if (!rows.length) return;

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

          // 1. 生成中状态检测 (spinner 或 stopBtn)
          const hasSpinner = !!row.querySelector('[data-testid="status-loading-spinner"]');
          const hasStopBtn = !!row.querySelector('button[aria-label*="Stop execution"], button[aria-label*="Stop Task"]');
          if (hasSpinner || hasStopBtn) {
            rowGeneratingIds.add(id);
          }

          // 2. 原生未读点检测与红点指示器无缝同步
          const nativeDot = row.querySelector('[data-testid="status-unread-dot"]');
          if (nativeDot) {
            rowNativeDotIds.add(id);
          }

          const isUnread = unreadConvosMap.has(id);
          let badge = row.querySelector('.agy-unread-dot-badge');

          if (isUnread) {
            if (nativeDot) {
              // 1. 原生未读点已存在：直接复用原生点，绝不重复插入插件徽标！
              nativeDot.style.removeProperty('display');
              if (badge) badge.remove();
            } else {
              // 2. 原生点已被系统移除：无缝接管单一点位
              const timeContainer = row.querySelector('.flex.items-center.gap-1\\.5') ||
                                    row.querySelector('[data-screenshot-volatile="true"]')?.parentElement;
              if (timeContainer && !badge) {
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
          } else {
            // 已读状态：彻底消除插件点，若有残留原生点也一并隐藏
            if (badge) badge.remove();
            if (nativeDot) nativeDot.style.setProperty('display', 'none', 'important');
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
          const isPending = promptSubmittedConvos.has(genId) && (now - promptSubmittedConvos.get(genId) < 2500);
          if (isPending) continue;

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

      const syncSidebarIndicators = checkAndSyncSidebar;

      onHeartbeatSmartUnread = () => {
        handleViewingScroll();
        checkAndSyncSidebar();
      };

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
      // 依附于右键总开关：若右键总开关关闭，则屏蔽划词功能一并关闭
      if (!USER_CONFIG.ENABLE_CONTEXT_MENU || !USER_CONFIG.ENABLE_BLOCK_QUOTE_POPUP) return;

      const styleId = 'agy-quote-interceptor-styles';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `
          /* 核心选择器：彻底隐藏官方主聊天区与右侧栏选中文本时弹出的 Quote 和 Comment 浮窗 */
          .selection-popup,
          .selection-quote-popup,
          [data-testid="selection-quote-button"],
          [data-testid="selection-popup-quote-button"],
          [data-testid="selection-comment-button"],
          [data-agy-block-quote="true"] {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
            visibility: hidden !important;
          }
          /* 工具栏中子项隐藏 */
          .agy-hide-quote-item {
            display: none !important;
            pointer-events: none !important;
          }
        `;
        document.head.appendChild(styleEl);
      }

      // 严格排除真实输入控件与文本内容行，绝不破坏代码输入与文字编辑（注意：严禁包含 monaco-workbench 或 monaco-editor，否则整个客户端或右侧栏都将被误忽略）
      function isIgnoredContainer(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable) return true;
        if (el.closest?.('.view-line, .view-lines, [contenteditable="true"], textarea, input')) {
          return true;
        }
        return false;
      }

      // 准确判断是否为 Quote 或 Comment 浮窗容器、按钮或气泡
      function isBlockedPopupTarget(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
        if (isIgnoredContainer(el)) return false;

        // 1. 匹配官方原生浮窗类名
        if (el.classList?.contains('selection-popup') || el.classList?.contains('selection-quote-popup')) {
          return true;
        }

        // 2. 匹配官方 testid
        const testid = (el.getAttribute?.('data-testid') || '').trim();
        if (testid === 'selection-quote-button' || testid === 'selection-popup-quote-button' || testid === 'selection-comment-button' || /selection.*(quote|comment)/i.test(testid)) {
          return true;
        }

        // 3. 匹配 aria-label 或 title 属性
        const ariaLabel = (el.getAttribute?.('aria-label') || '').trim();
        const title = (el.getAttribute?.('title') || '').trim();
        if (/^(Quote|引用)(\b|\s|$)/i.test(ariaLabel) || /^(Quote|引用)(\b|\s|$)/i.test(title)) return true;
        if (/^(Comment|评论)(\b|\s|$)/i.test(ariaLabel) || /^(Comment|评论)(\b|\s|$)/i.test(title)) return true;

        // 4. 匹配纯文本短词（兼容包含快捷键文本，长度 <= 30）
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
        if (text.length > 0 && text.length <= 30) {
          if (/^(Quote|引用)(\b|\s|$)/i.test(text)) return true;
          if (/^(Comment|评论)(\b|\s|$)/i.test(text)) return true;
        }

        return false;
      }

      function handleBlockedElement(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
        if (el.closest?.('.agy-page-nav-group, #agy-archive-panel, #agy-enhancer-toast, #agy-universal-context-menu')) return;
        if (el.hasAttribute('data-agy-block-quote') || el.classList.contains('agy-hide-quote-item')) return;

        // 如果本身就是浮窗容器
        if (el.classList?.contains('selection-popup') || el.classList?.contains('selection-quote-popup')) {
          el.setAttribute('data-agy-block-quote', 'true');
          return;
        }

        // 往上寻找悬浮容器（最多向上 4 层，排除编辑器根容器与工件根容器）
        let container = null;
        let curr = el;
        for (let i = 0; i < 4; i++) {
          if (!curr || curr === document.body || curr === document.documentElement) break;
          if (curr.classList?.contains('monaco-editor') || curr.id === 'artifact-container') break;

          const role = curr.getAttribute?.('role');
          if (curr.classList?.contains('selection-popup') ||
              curr.classList?.contains('selection-quote-popup') ||
              role === 'tooltip' || role === 'toolbar' || role === 'menu' ||
              curr.hasAttribute?.('data-radix-popper-content-wrapper')) {
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

        const candidates = node.querySelectorAll?.('.selection-popup, .selection-quote-popup, button, [role="button"], [role="tooltip"], [data-radix-popper-content-wrapper]');
        if (candidates && candidates.length > 0) {
          for (const cand of candidates) {
            if (isBlockedPopupTarget(cand)) {
              handleBlockedElement(cand);
            }
          }
        }
      }

      function scanAndBlockAllCandidates() {
        const candidates = document.querySelectorAll?.('.selection-popup, .selection-quote-popup, [data-testid="selection-quote-button"], [data-testid="selection-popup-quote-button"], [data-testid="selection-comment-button"], button, [role="button"], [role="tooltip"], [data-radix-popper-content-wrapper]');
        if (candidates && candidates.length > 0) {
          for (const cand of candidates) {
            if (isBlockedPopupTarget(cand)) {
              handleBlockedElement(cand);
            }
          }
        }
      }

      // 1. 初始化时全量扫描一次，立即隐藏常驻单例
      scanAndBlockAllCandidates();

      // 2. 注册划词松手与选区变动主动扫描兜底（彻底攻克单例复用与选区时序竞争）
      quoteSelectionHandler = () => {
        setTimeout(() => {
          scanAndBlockAllCandidates();
        }, 16);
      };
      document.addEventListener('pointerup', quoteSelectionHandler, { capture: true, passive: true });
      document.addEventListener('mouseup', quoteSelectionHandler, { capture: true, passive: true });
      document.addEventListener('selectionchange', quoteSelectionHandler, { capture: true, passive: true });

      // 3. 仅监听 DOM 新增节点（严禁监听 attributes，彻底杜绝死循环和主线程卡死）
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

    // ==================== 12. 屏蔽聊天框上方原生向下滚动图标 (Block Native Scroll-to-Bottom Button) ====================
    function initBlockChatBottomButton() {
      if (USER_CONFIG.ENABLE_MASTER === false || USER_CONFIG.ENABLE_BLOCK_CHAT_BOTTOM_BUTTON === false) return;

      const styleId = 'agy-block-bottom-btn-styles';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `
          /* 彻底屏蔽官方聊天框上方居中向下滚动圆钮 */
          button[aria-label="Scroll to Bottom"],
          .relative.h-full.w-full > button.bottom-4.left-1\\/2.rounded-full,
          button.bottom-4.left-1\\/2.rounded-full:has(svg),
          [data-agy-block-bottom-btn="true"] {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
            visibility: hidden !important;
          }
        `;
        document.head.appendChild(styleEl);
      }
    }

    // ==================== 13. 分支与工作树快捷管理与一键彻底清理系统 (Worktree & Branch Management) ====================
    function initWorktreeManagement() {
      if (USER_CONFIG.ENABLE_MASTER === false || USER_CONFIG.ENABLE_WORKTREE_MANAGEMENT === false) return;

      // 1. 二次确认模态框
      showWorktreeConfirmModal = function (options) {
        const { title, message, htmlContent, danger = true, confirmText = 'Delete', cancelText = 'Cancel', onConfirm } = options || {};
        document.getElementById('agy-confirm-modal-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'agy-confirm-modal-overlay';
        overlay.className = 'agy-confirm-overlay';
        overlay.innerHTML = `
          <div class="agy-confirm-card" style="max-width: 520px; width: 92%;">
            <div class="agy-confirm-header">
              <div class="agy-confirm-title ${danger ? 'danger' : ''}">${title}</div>
            </div>
            <div class="agy-confirm-body" style="max-height: 70vh; overflow-y: auto;">
              ${htmlContent ? htmlContent : `<p class="agy-confirm-message">${(message || '').replace(/\n/g, '<br/>')}</p>`}
            </div>
            <div class="agy-confirm-footer">
              <button type="button" class="agy-confirm-btn agy-confirm-cancel">${cancelText}</button>
              <button type="button" class="agy-confirm-btn ${danger ? 'agy-confirm-danger' : 'agy-confirm-primary'}">${confirmText}</button>
            </div>
          </div>
        `;

        document.body.appendChild(overlay);

        const cancelBtn = overlay.querySelector('.agy-confirm-cancel');
        const confirmBtn = overlay.querySelector(danger ? '.agy-confirm-danger' : '.agy-confirm-primary');

        const close = () => {
          overlay.classList.add('fade-out');
          setTimeout(() => overlay.remove(), 160);
        };

        cancelBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          close();
        });

        confirmBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          e.preventDefault();
          confirmBtn.disabled = true;
          confirmBtn.textContent = 'Deleting...';
          try {
            await onConfirm?.();
          } finally {
            close();
          }
        });

        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) close();
        });

        const onKeydown = (e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            window.removeEventListener('keydown', onKeydown, true);
            close();
          } else if (e.key === 'Enter') {
            e.stopPropagation();
            window.removeEventListener('keydown', onKeydown, true);
            confirmBtn.click();
          }
        };
        window.addEventListener('keydown', onKeydown, true);
      };

      // 暴露通知方法供后台守护服务通过 CDP 随时触发
      window.__AGY_SHOW_NOTIFICATION__ = showNotification;

      // 1.1 Worktree & branch deletion with uncommitted / unmerged state awareness
      handleWorktreeDeleteAction = async function (options) {
        const { actionType, branchName, projectId, projectName, folderUri, projectRootPath } = options || {};

        if (actionType === 'current' && !branchName) {
          showNotification?.('Unable to identify the branch name for this conversation');
          return;
        }

        showNotification?.('Checking branch status and Git changes...');

        try {
          const checkRes = await fetch('http://127.0.0.1:37210/api/worktree/check-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scope: actionType,
              branchName,
              projectId,
              projectName,
              folderUri,
              projectRootPath
            })
          }).then(r => r.json()).catch(err => ({ success: false, error: err?.message || err }));

          if (!checkRes?.success) {
            showNotification?.(`Failed to check branch: ${checkRes?.error || 'Unable to connect to daemon service'}`);
            return;
          }

          const branches = checkRes.branches || [];
          if (branches.length === 0) {
            if (actionType === 'current') {
              showNotification?.(`Branch "${branchName}" is protected or does not exist`);
            } else if (actionType === 'others') {
              showNotification?.('No other deletable branches found (main branch is protected)');
            } else {
              showNotification?.('No deletable branches found (main branch is protected)');
            }
            return;
          }

          const activeBranch = window.__AGY_BRANCH_NAME__ || '';
          if (actionType === 'current' && activeBranch && branchName.toLowerCase() === activeBranch.toLowerCase()) {
            showNotification?.(`Cannot delete currently active branch "${branchName}". Please switch branches first.`);
            return;
          }

          let modalTitle = 'Delete Worktrees & Branches';
          let baseMsg = '';
          const mainBranch = checkRes.mainBranch || 'main';

          if (actionType === 'current') {
            modalTitle = `Delete Branch: ${branchName}`;
            baseMsg = `Are you sure you want to permanently delete worktree branch "${branchName}"?\nThis will remove the physical directory, Git branch, and environment configs.`;
          } else if (actionType === 'others') {
            modalTitle = `Delete Other Branches (${branches.length})`;
            baseMsg = `Are you sure you want to delete ${branches.length} other branches?\nMain branch (${mainBranch}) and current branch (${branchName || 'current'}) will be kept.`;
          } else if (actionType === 'all') {
            modalTitle = `Delete All Branches (${branches.length})`;
            baseMsg = `Are you sure you want to delete all ${branches.length} worktree branches in project [${projectName || 'current'}]?\nMain branch (${mainBranch}) is strictly protected.`;
          }

          let htmlContent = '';
          const dirtyOrUnmerged = branches.filter(b => b.hasUncommitted || b.hasUnmerged);

          if (dirtyOrUnmerged.length > 0) {
            htmlContent = `
              <div style="margin-bottom: 12px; font-size: 13px; line-height: 1.5; color: var(--foreground, #e5e7eb);">
                ${baseMsg.replace(/\n/g, '<br/>')}
              </div>
              <div style="margin: 10px 0; padding: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.35); border-left: 4px solid #ef4444; border-radius: 6px; font-size: 12px; line-height: 1.5;">
                <div style="font-weight: 600; color: #ef4444; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                  <span>⚠️ Warning: Uncommitted changes or unmerged commits detected!</span>
                </div>
                <div style="max-height: 180px; overflow-y: auto; padding-right: 4px;">
                  ${dirtyOrUnmerged.map(b => {
                    const details = [];
                    if (b.hasUncommitted) details.push(`<span style="color: #f59e0b; font-weight: 500;">${b.uncommittedCount} uncommitted change(s)</span>`);
                    if (b.hasUnmerged) details.push(`<span style="color: #ef4444; font-weight: 500;">${b.unmergedCount} unmerged commit(s)</span>`);
                    let fileList = '';
                    if (b.uncommittedFiles?.length > 0) {
                      fileList = `<div style="margin-top: 2px; padding-left: 10px; font-family: monospace; font-size: 11px; opacity: 0.85; color: var(--muted-foreground, #9ca3af);">${b.uncommittedFiles.slice(0, 4).join('<br/>')}</div>`;
                    }
                    let commitList = '';
                    if (b.unmergedCommits?.length > 0) {
                      commitList = `<div style="margin-top: 2px; padding-left: 10px; font-family: monospace; font-size: 11px; opacity: 0.85; color: #f87171;">${b.unmergedCommits.slice(0, 3).join('<br/>')}</div>`;
                    }
                    return `<div style="margin-bottom: 8px; border-bottom: 1px dashed rgba(255,255,255,0.08); padding-bottom: 6px;">
                      <div style="font-weight: 600; color: var(--foreground, #fff); margin-bottom: 2px;">• Branch: <span style="color:#60a5fa;">${b.branchName}</span> (${details.join(', ')})</div>
                      ${fileList}
                      ${commitList}
                    </div>`;
                  }).join('')}
                </div>
                <div style="margin-top: 8px; color: #ef4444; font-weight: 600;">
                  Once deleted, the uncommitted or unmerged work above will be permanently lost!
                </div>
              </div>
            `;
          } else {
            htmlContent = `
              <div style="margin-bottom: 12px; font-size: 13px; line-height: 1.5; color: var(--foreground, #e5e7eb);">
                ${baseMsg.replace(/\n/g, '<br/>')}
              </div>
              <div style="padding: 8px 12px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 6px; font-size: 12px; color: #22c55e;">
                ✓ All target branch commits are merged and the working tree is clean.
              </div>
            `;
          }

          showWorktreeConfirmModal({
            title: modalTitle,
            message: baseMsg,
            htmlContent,
            danger: true,
            confirmText: dirtyOrUnmerged.length > 0 ? 'Force Delete Permanently' : 'Delete Permanently',
            cancelText: 'Cancel',
            onConfirm: async () => {
              const branchNamesToDelete = branches.map(b => b.branchName);
              try {
                const res = await fetch('http://127.0.0.1:37210/api/worktree/purge', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    branchNames: branchNamesToDelete,
                    branchName: branchNamesToDelete.length === 1 ? branchNamesToDelete[0] : undefined,
                    projectId,
                    projectName,
                    folderUri,
                    projectRootPath
                  })
                }).then(r => r.json());

                if (res.success) {
                  showNotification?.(res.message || `Successfully purged ${branchNamesToDelete.length} branch worktrees`);
                } else {
                  showNotification?.(`Purge failed: ${res.error || 'Unknown error'}`);
                }
              } catch (err) {
                showNotification?.(`Failed to communicate with service: ${err?.message || err}`);
              }
            }
          });

        } catch (err) {
          showNotification?.(`Failed to check branch: ${err?.message || err}`);
        }
      };

      // 2. 当前活跃项目信息解析
      getCurrentProjectInfo = function () {
        const pm = getPM();
        const tsp = getTSP();
        const projects = pm?.projectsStateProvider?.getState?.() || [];
        let projectId = null;
        let projectName = null;
        let projectRootPath = null;

        // 2.1 优先从顶部工程选择器按钮嗅探（在新建会话或切换工程后，页面上方有如 📁 SonixType ˅ 按钮）
        if (projects.length > 0) {
          const topCandidates = Array.from(document.querySelectorAll('button, div[role="button"], [data-radix-collection-item]'));
          for (const btn of topCandidates) {
            const txt = (btn.innerText || '').trim();
            if (!txt) continue;
            const matchProj = projects.find(p => p.project?.name && p.project.name === txt);
            if (matchProj?.project) {
              projectId = matchProj.project.id;
              projectName = matchProj.project.name;
              projectRootPath = getProjectFolderUri(matchProj.project);
              break;
            }
          }
        }

        // 2.2 从当前会话 Summary 嗅探
        if (!projectId) {
          const convoId = getCurrentUrlConvoId();
          if (convoId && tsp) {
            const s = tsp.getState()?.summaries?.[convoId];
            if (s?.projectId && s.projectId !== 'outside-of-project') {
              projectId = s.projectId;
            }
          }
        }

        // 2.3 从 URL 参数嗅探
        if (!projectId) {
          const match = window.location.search.match(/[?&]section=([a-f0-9-]+)/i);
          if (match) {
            projectId = match[1];
          }
        }

        if (projectId && (!projectName || !projectRootPath)) {
          const pItem = projects.find(p => p.project?.id === projectId);
          if (pItem?.project) {
            projectName = pItem.project.name;
            projectRootPath = getProjectFolderUri(pItem.project);
          }
        } else if (!projectId && projects.length > 0) {
          const first = projects.find(p => !p.project?.archived) || projects[0];
          if (first?.project) {
            projectId = first.project.id;
            projectName = first.project.name;
            projectRootPath = getProjectFolderUri(first.project);
          }
        }

        return { projectId, projectName, projectRootPath };
      };

      // 3. 解析工作树/分支项信息
      extractWorktreeInfo = function (itemEl) {
        if (!itemEl) return null;
        let branchName = itemEl.getAttribute('data-agy-branch-name') || '';
        let folderUri = itemEl.getAttribute('data-agy-folder-uri') || '';
        let isBranchOption = itemEl.getAttribute('data-testid') === 'branch-option' || itemEl.hasAttribute('data-agy-branch-item');

        // 3.1 从 React Fiber 提取属性
        try {
          const fiberKey = Object.keys(itemEl).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
          let f = itemEl[fiberKey];
          let depth = 0;
          while (f && depth < 20) {
            const props = f.memoizedProps;
            if (props) {
              if (!branchName && typeof props.title === 'string' && props.title) branchName = props.title.trim();
              if (!branchName && typeof props.value === 'string' && props.value) branchName = props.value.trim();
              if (!branchName && typeof props.branchName === 'string' && props.branchName) branchName = props.branchName.trim();
              if (!branchName && typeof props.branch === 'string' && props.branch) branchName = props.branch.trim();
              if (!branchName && typeof props.name === 'string' && props.name) branchName = props.name.trim();
              if (!branchName && typeof props.item?.name === 'string') branchName = props.item.name.trim();
              if (!branchName && typeof props.item?.branchName === 'string') branchName = props.item.branchName.trim();
              if (!folderUri && typeof props.worktreeUri === 'string' && props.worktreeUri) folderUri = props.worktreeUri;
              if (!folderUri && typeof props.folderUri === 'string' && props.folderUri) folderUri = props.folderUri;
              if (!folderUri && typeof f.key === 'string' && f.key.startsWith('file:')) folderUri = f.key;
            }
            f = f.return;
            depth++;
          }
        } catch (e) {}

        // 3.2 从 DOM 提取文本
        if (!branchName) {
          const val = itemEl.getAttribute('data-value') || itemEl.getAttribute('value');
          if (val) {
            branchName = val.trim();
          } else {
            const textSpans = Array.from(itemEl.querySelectorAll('span, div, p')).filter(s => {
              if (s.closest('.agy-wt-hover-trash')) return false;
              if (s.children.length > 0) return false;
              const t = (s.innerText || '').trim();
              if (!t || /^\d+[smhdwy]$/i.test(t) || /active|current/i.test(t)) return false;
              return true;
            });
            if (textSpans.length > 0) {
              branchName = textSpans[0].innerText.trim();
            } else {
              const clone = itemEl.cloneNode(true);
              clone.querySelectorAll('.agy-wt-hover-trash, svg').forEach(el => el.remove());
              branchName = (clone.innerText || '').split('\n')[0].trim();
            }
          }
        }

        let { projectId, projectName, projectRootPath } = getCurrentProjectInfo();

        // 3.3 如果 folderUri 能直接匹配某个已知 Project，精准修正 project 信息
        const projects = getPM()?.projectsStateProvider?.getState?.() || [];
        if (folderUri && projects.length > 0) {
          const cleanUri = folderUri.toLowerCase();
          for (const p of projects) {
            const pName = (p.project?.name || '').toLowerCase();
            const pUri = (getProjectFolderUri(p.project) || '').toLowerCase();
            if ((pName && (cleanUri.includes('/' + pName + '/') || cleanUri.includes('\\' + pName + '\\'))) || (pUri && cleanUri.startsWith(pUri))) {
              projectId = p.project.id;
              projectName = p.project.name;
              projectRootPath = getProjectFolderUri(p.project);
              break;
            }
          }
        }

        return {
          branchName,
          folderUri,
          projectId,
          projectName,
          projectRootPath,
          isBranchOption
        };
      };

      // 4. 执行一键彻底删除
      executePurge = function (info, itemEl) {
        const { branchName, folderUri, projectId, projectName, projectRootPath } = info || {};
        if (!branchName && !folderUri) return;

        const lower = (branchName || '').toLowerCase();
        if (lower === 'main' || lower === 'master' || lower === 'trunk' || lower === 'default') {
          showNotification?.(`Protected: Cannot delete default branch "${branchName}"`);
          return;
        }

        const currentBranch = window.__AGY_BRANCH_NAME__ || '';
        if (branchName && currentBranch && branchName === currentBranch) {
          showNotification?.(`Cannot delete active branch "${branchName}". Please switch branches first.`);
          return;
        }

        showWorktreeConfirmModal({
          title: 'Delete Worktree & Branch',
          message: `Are you sure you want to completely delete worktree/branch "${branchName}"?\n\nThis will permanently clean up:\n1. Local physical worktree directory\n2. Git branch and worktree indices\n3. Antigravity project registry entries\n\nThis action cannot be undone.`,
          danger: true,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          onConfirm: async () => {
            try {
              const res = await fetch('http://127.0.0.1:37210/api/worktree/purge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  branchName,
                  folderUri,
                  projectId,
                  projectName,
                  projectRootPath
                })
              }).then(r => r.json());

              if (res.success) {
                showNotification?.(`Worktree and branch "${branchName}" completely deleted`);
                if (itemEl && itemEl.isConnected) {
                  itemEl.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
                  itemEl.style.opacity = '0';
                  itemEl.style.maxHeight = '0';
                  itemEl.style.height = '0';
                  itemEl.style.minHeight = '0';
                  itemEl.style.padding = '0';
                  itemEl.style.margin = '0';
                  itemEl.style.overflow = 'hidden';
                  itemEl.style.pointerEvents = 'none';
                }
                // 优雅触发全局关闭下拉框，避免 Radix UI 焦点异常与 React DOM removeChild 崩溃
                setTimeout(() => {
                  try {
                    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
                    document.body.click();
                  } catch (e) {}
                }, 120);
              } else {
                showNotification?.(`Failed to delete worktree: ${res.error || 'Unknown error'}`);
              }
            } catch (err) {
              showNotification?.(`Request failed: ${err?.message || err}`);
            }
          }
        });
      };

      // 5. 弹出工作树/分支右键上下文菜单（与左侧栏完全一致）
      renderWorktreeContextMenu = function (e, info, itemEl) {
        const { branchName, folderUri, projectId, projectName } = info || {};
        const isMainBranch = ['main', 'master', 'trunk', 'default'].includes((branchName || '').toLowerCase());

        const items = [
          {
            label: 'Copy Branch Name',
            icon: 'branch',
            action: () => {
              if (branchName) {
                copyText(branchName);
                showNotification?.(`Copied branch name: ${branchName}`);
              }
            }
          },
          {
            label: 'Open Project Folder',
            icon: 'folder',
            action: async () => {
              try {
                const res = await fetch('http://127.0.0.1:37210/api/open-folder', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ folderUri, branchName, projectName, projectId })
                }).then(r => r.json());
                if (res.success) {
                  showNotification?.('Opened project folder in Explorer');
                } else {
                  showNotification?.('Project folder does not exist');
                }
              } catch (e) {
                showNotification?.('Project folder does not exist');
              }
            }
          },
          {
            label: 'Open in Terminal',
            icon: 'terminal',
            action: async () => {
              try {
                const res = await fetch('http://127.0.0.1:37210/api/open-terminal', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ folderUri, branchName, projectName, projectId })
                }).then(r => r.json());
                if (res.success) {
                  showNotification?.('Opened terminal');
                } else {
                  showNotification?.('Target path does not exist');
                }
              } catch (e) {
                showNotification?.('Cannot open terminal for this path');
              }
            }
          },
          {
            label: 'Copy Path',
            icon: 'copy',
            action: () => {
              let cleanPath = '';
              if (folderUri) {
                cleanPath = decodeURIComponent(folderUri.replace(/^file:\/\/\/?/i, '')).replace(/\//g, '\\');
                cleanPath = cleanPath.replace(/^[\\\/]+([a-zA-Z]:)/, '$1');
              } else if (projectName && branchName) {
                cleanPath = `C:\\Users\\Juste\\.gemini\\antigravity\\worktrees\\${projectName}\\${branchName}`;
              }
              if (cleanPath) {
                copyText(cleanPath);
                showNotification?.(`Copied path: ${cleanPath}`);
              } else {
                showNotification?.('No local path available for this branch');
              }
            }
          },
          {
            label: 'Prune Invalid Worktrees',
            icon: 'clean',
            action: async () => {
              try {
                const res = await fetch('http://127.0.0.1:37210/api/worktree/prune-invalid', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ projectId, projectName })
                }).then(r => r.json());
                showNotification?.(res.message || 'Prune completed');
              } catch (e) {
                showNotification?.(`Failed to prune invalid worktrees: ${e.message}`);
              }
            }
          },
          { separator: true },
          {
            label: 'Delete Worktree & Branch',
            icon: 'trash',
            danger: true,
            action: () => {
              if (isMainBranch) {
                showNotification?.(`Protected: Cannot delete default branch "${branchName}"`);
                return;
              }
              executePurge(info, itemEl);
            }
          }
        ];

        renderMenu(items, e.clientX, e.clientY);
      };

      // 6. 动态嗅探工作树/分支右键目标
      resolveWorktreeOrBranchTarget = function (target) {
        if (!target || target.nodeType !== Node.ELEMENT_NODE) return null;
        // 6.1 已被标记的元素
        const marked = target.closest('[data-agy-worktree-item="true"], [data-agy-branch-item="true"], [data-testid="branch-option"]');
        if (marked) return marked;

        // 6.2 检查是否在 Previous Worktrees / Search past worktrees / Workspaces 等弹窗列表中
        const popover = target.closest('[data-radix-popper-content-wrapper], [role="menu"], [data-radix-menu-content], [role="listbox"], [role="dialog"], [cmdk-root], div.w-80');
        if (popover) {
          const item = target.closest('[cmdk-item], button, [role="option"], [role="menuitem"], div.cursor-pointer, .flex.flex-col');
          if (item && popover.contains(item)) {
            const isWorktreePopover = !!popover.querySelector('[data-agy-worktree-item], [data-agy-branch-item], input[placeholder*="worktree"], input[placeholder*="Search past"]') ||
              /Previous Worktrees|Past Worktrees|Workspaces|Select branch|Branches|Search past worktrees/i.test(popover.innerText || '');
            if (isWorktreePopover && !item.classList.contains('border-t') && !/No previous worktrees|Loading|No environments|Create new branch/i.test(item.innerText || '')) {
              return item;
            }
          }
        }

        // 6.3 页面顶部或输入框上方的新版分支栏按钮
        const topBranchBtn = target.closest('button[data-testid*="branch"], button[data-testid*="worktree"], [data-testid="current-branch-badge"]');
        if (topBranchBtn) return topBranchBtn;

        return null;
      };

      // 7. DOM 扫描与悬停垃圾桶图标注入
      function scanAndEnhanceWorktreeDropdowns() {
        const popovers = Array.from(document.querySelectorAll('[data-radix-popper-content-wrapper], [role="menu"], [data-radix-menu-content], [role="listbox"], [role="dialog"], [cmdk-root], div.w-80'));
        
        for (const popover of popovers) {
          const popoverText = popover.innerText || '';
          const hasSearchInput = !!popover.querySelector('input[placeholder*="Search past worktrees"], input[placeholder*="worktree"], [cmdk-input]');
          const isWorktreeContainer = hasSearchInput || /Previous Worktrees|Past Worktrees|Workspaces|Select branch|Branches|Search past worktrees/i.test(popoverText);

          if (!isWorktreeContainer) continue;

          // 7.1 位置 1：经典 Previous Worktrees / Workspaces 列表项
          const headers = Array.from(popover.querySelectorAll('*')).filter(el => {
            const t = (el.innerText || '').trim();
            return (t === 'Previous Worktrees' || t === 'Past Worktrees' || t === 'Workspaces') && el.children.length === 0;
          });

          for (const header of headers) {
            let parent = header.parentElement;
            if (!parent) continue;
            const siblings = Array.from(parent.children);
            const headerIdx = siblings.indexOf(header);
            if (headerIdx === -1) continue;

            const worktreeItems = siblings.slice(headerIdx + 1);
            for (const item of worktreeItems) {
              if (item.classList.contains('border-t') || item.innerText?.includes('No previous worktrees') || item.innerText?.includes('Loading worktrees') || item.innerText?.includes('No environments')) {
                continue;
              }

              item.setAttribute('data-agy-worktree-item', 'true');
              item.style.setProperty('position', 'relative', 'important');
              item.style.setProperty('padding-right', '34px', 'important');

              if (!item.querySelector('.agy-wt-hover-trash')) {
                const info = extractWorktreeInfo(item);
                if (info?.branchName) {
                  item.setAttribute('data-agy-branch-name', info.branchName);
                }
                if (info?.folderUri) {
                  item.setAttribute('data-agy-folder-uri', info.folderUri);
                }

                const trashBtn = document.createElement('button');
                trashBtn.className = 'agy-wt-hover-trash';
                trashBtn.type = 'button';
                trashBtn.title = 'Delete Worktree & Branch';
                trashBtn.innerHTML = `
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                `;

                trashBtn.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation?.();
                  const latestInfo = extractWorktreeInfo(item);
                  executePurge(latestInfo, item);
                });

                item.appendChild(trashBtn);
              }
            }
          }

          // 7.2 位置 2：新版带 "Search past worktrees..." 的搜索弹窗/命令面板列表项 ([cmdk-item], [role="option"])
          if (hasSearchInput || popover.querySelector('[cmdk-item], [cmdk-list]')) {
            const cmdkItems = Array.from(popover.querySelectorAll('[cmdk-item], [role="option"], [data-radix-collection-item], button.w-full, div.cursor-pointer'));
            for (const item of cmdkItems) {
              if (item.classList.contains('agy-wt-hover-trash') || item.closest('.agy-wt-hover-trash')) continue;
              if (item.tagName === 'INPUT' || item.querySelector('input')) continue;

              const itemText = (item.innerText || '').trim();
              if (/Create new branch|No previous worktrees|Loading|No environments|Search past worktrees/i.test(itemText)) {
                continue;
              }

              const info = extractWorktreeInfo(item);
              if (!info || !info.branchName) continue;

              item.setAttribute('data-agy-worktree-item', 'true');
              item.setAttribute('data-agy-branch-name', info.branchName);
              if (info.folderUri) item.setAttribute('data-agy-folder-uri', info.folderUri);

              item.style.setProperty('position', 'relative', 'important');
              item.style.setProperty('padding-right', '34px', 'important');

              if (!item.querySelector('.agy-wt-hover-trash')) {
                const trashBtn = document.createElement('button');
                trashBtn.className = 'agy-wt-hover-trash';
                trashBtn.type = 'button';
                trashBtn.title = `Delete worktree and branch: ${info.branchName}`;
                trashBtn.innerHTML = `
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                `;

                trashBtn.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation?.();
                  const latestInfo = extractWorktreeInfo(item);
                  executePurge(latestInfo, item);
                });

                item.appendChild(trashBtn);
              }
            }
          }
        }

        // 7.3 位置 3：Select branch 分支下拉框列表项
        const branchOptions = Array.from(document.querySelectorAll('[data-testid="branch-option"], [role="option"][data-radix-collection-item]'));
        for (const opt of branchOptions) {
          opt.setAttribute('data-agy-branch-item', 'true');
          opt.style.setProperty('position', 'relative', 'important');
          opt.style.setProperty('padding-right', '34px', 'important');

          if (!opt.querySelector('.agy-wt-hover-trash')) {
            const info = extractWorktreeInfo(opt);
            if (info?.branchName) {
              opt.setAttribute('data-agy-branch-name', info.branchName);
            }

            const trashBtn = document.createElement('button');
            trashBtn.className = 'agy-wt-hover-trash';
            trashBtn.type = 'button';
            trashBtn.title = 'Delete Worktree & Branch';
            trashBtn.innerHTML = `
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            `;

            trashBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation?.();
              const latestInfo = extractWorktreeInfo(opt);
              executePurge(latestInfo, opt);
            });

            opt.appendChild(trashBtn);
          }
        }
      }

      // 8. 绑定全局右键委托 (兜底独立监听器)
      if (worktreeContextMenuHandler) {
        document.removeEventListener('contextmenu', worktreeContextMenuHandler, true);
      }
      worktreeContextMenuHandler = (e) => {
        if (e.shiftKey || USER_CONFIG.ENABLE_CONTEXT_MENU === false || USER_CONFIG.ENABLE_WORKTREE_MANAGEMENT === false) return;
        const item = resolveWorktreeOrBranchTarget(e.target);
        if (item) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          dismissUniversalContextMenu();
          const info = extractWorktreeInfo(item);
          if (info) {
            renderWorktreeContextMenu(e, info, item);
          }
        }
      };

      document.addEventListener('contextmenu', worktreeContextMenuHandler, true);

      // 9. 绑定 MutationObserver 监听动态弹出层
      if (worktreeObserver) {
        worktreeObserver.disconnect();
      }
      worktreeObserver = new MutationObserver((mutations) => {
        let shouldScan = false;
        for (const m of mutations) {
          if (m.addedNodes.length > 0) {
            shouldScan = true;
            break;
          }
        }
        if (shouldScan) {
          scanAndEnhanceWorktreeDropdowns();
        }
      });

      worktreeObserver.observe(document.body, { childList: true, subtree: true });

      onHeartbeatWorktreeManagement = scanAndEnhanceWorktreeDropdowns;
      scanAndEnhanceWorktreeDropdowns();
    }

    // ==================== 13.5. 重点总结钉选与画中画悬浮速览系统 (Pinned Summary & PiP V2) ====================
    function initPinnedSummarySystem() {
      const PIN_KEY_PREFIX = 'agy_pins_';
      const PIN_LRU_KEY = 'agy_pins_lru_index';
      const MAX_ACTIVE_CONVOS = 50;
      const MAX_PINS_PER_CONVO = 25;
      const MAX_TEXT_LENGTH_PER_PIN = 16000;

      let currentActiveIndex = 0;
      let lastConvoIdForPins = null;
      let isPipMinimized = false;
      let drawerCloseTimeout = null;

      // 1. 样式注入
      function ensurePinnedSummaryStyles() {
        const styleId = 'agy-pinned-styles';
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          /* 右侧向上向下按钮上方的半透明绿点指示器容器 */
          #agy-pinned-nav-indicator {
            position: relative;
            width: ${USER_CONFIG.BUTTON_SIZE}px;
            height: 24px;
            display: none;
            align-items: center;
            justify-content: center;
            margin-bottom: 2px;
            z-index: 999992;
          }
          /* 半透明呼吸绿点 */
          .agy-pin-dot {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #10b981;
            opacity: 0.45;
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.45);
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
          }
          #agy-pinned-nav-indicator:hover .agy-pin-dot,
          #agy-pinned-nav-indicator.hovering .agy-pin-dot {
            opacity: 1;
            transform: scale(1.25);
            box-shadow: 0 0 16px rgba(16, 185, 129, 0.8), 0 0 0 2px rgba(16, 185, 129, 0.3);
          }

          /* 鼠标悬停展开的长条列表抽屉 (向左展开，整齐垂直罗列) */
          .agy-pin-flyout-drawer {
            position: absolute;
            right: calc(100% + 12px);
            bottom: -6px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: flex-end;
            opacity: 0;
            pointer-events: none;
            transform: translateX(12px) scale(0.96);
            transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 2147483600;
            max-height: 68vh;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 8px 12px 8px 0;
          }
          /* 隐形连接通道防止鼠标滑向抽屉时中断 hover */
          .agy-pin-flyout-drawer::after {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            right: -16px;
            width: 20px;
          }
          #agy-pinned-nav-indicator:hover .agy-pin-flyout-drawer,
          #agy-pinned-nav-indicator.hovering .agy-pin-flyout-drawer,
          .agy-pin-flyout-drawer:hover {
            opacity: 1;
            pointer-events: auto;
            transform: translateX(0) scale(1);
          }

          /* 单个长条卡片 (精致圆角胶囊，零位移无抖动) */
          .agy-pinned-card {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(22, 26, 38, 0.94);
            border: 1px solid rgba(255, 255, 255, 0.13);
            border-radius: 9999px;
            padding: 4px 6px 4px 12px;
            color: #f1f5f9;
            font-size: 13px;
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
            white-space: nowrap;
            user-select: none;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }
          .agy-pinned-card:hover {
            border-color: rgba(255, 255, 255, 0.28);
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.6);
          }
          .agy-card-pin-icon {
            font-size: 13px;
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          .agy-card-pin-icon.type-prompt {
            color: #ef4444; /* 红色图钉代表提示词 */
          }
          .agy-card-pin-icon.type-ai {
            color: #10b981; /* 绿色图钉代表 AI 回复 */
          }
          .agy-card-title {
            font-weight: 500;
            max-width: 210px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: #f8fafc;
            cursor: pointer;
            user-select: none;
            transition: color 0.15s ease;
          }
          .agy-card-title:hover {
            color: #60a5fa;
          }
          .agy-card-rename-input {
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid #3b82f6;
            border-radius: 4px;
            color: #f8fafc;
            font-size: 12px;
            padding: 2px 7px;
            outline: none;
            width: 190px;
            max-width: 250px;
            font-family: inherit;
            box-shadow: 0 0 8px rgba(59, 130, 246, 0.35);
          }
          .agy-card-actions {
            display: flex;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
          }
          .agy-card-btn {
            background: rgba(255, 255, 255, 0.08);
            border: none;
            border-radius: 9999px;
            width: 26px;
            height: 26px;
            padding: 0;
            color: #cbd5e1;
            font-size: 12px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
          }
          .agy-card-btn:hover {
            background: rgba(255, 255, 255, 0.22);
            color: #fff;
          }
          .agy-card-btn.danger:hover {
            background: rgba(239, 68, 68, 0.28);
            color: #fca5a5;
          }

          /* 用户提问 Prompt 气泡右下角图钉按钮 (红色高亮) */
          .agy-user-pin-btn,
          .agy-ai-pin-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border-radius: 6px;
            background: transparent;
            border: none;
            color: var(--muted-foreground, #94a3b8);
            cursor: pointer;
            transition: all 0.18s ease;
            margin-right: 3px;
          }
          .agy-user-pin-btn:hover,
          .agy-ai-pin-btn:hover {
            background: var(--secondary, rgba(255, 255, 255, 0.1));
            color: var(--foreground, #fff);
          }
          .agy-user-pin-btn.active {
            color: #ef4444 !important;
          }
          .agy-user-pin-btn.active:hover {
            background: rgba(239, 68, 68, 0.16) !important;
            color: #f87171 !important;
          }
          .agy-ai-pin-btn.active {
            color: #10b981 !important;
          }
          .agy-ai-pin-btn.active:hover {
            background: rgba(16, 185, 129, 0.16) !important;
            color: #34d399 !important;
          }

          /* 原消息/段落高亮呼吸动效 (绿色用于 AI 回复，红色用于提示词) */
          @keyframes agy-pin-pulse {
            0% {
              box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.85);
              outline: 2px solid #10b981;
              background-color: rgba(16, 185, 129, 0.12);
            }
            40% {
              box-shadow: 0 0 24px 6px rgba(16, 185, 129, 0.45);
              outline: 2px solid #34d399;
              background-color: rgba(16, 185, 129, 0.08);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
              outline: 2px solid transparent;
              background-color: transparent;
            }
          }
          @keyframes agy-pin-pulse-red {
            0% {
              box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.85);
              outline: 2px solid #ef4444;
              background-color: rgba(239, 68, 68, 0.12);
            }
            40% {
              box-shadow: 0 0 24px 6px rgba(239, 68, 68, 0.45);
              outline: 2px solid #f87171;
              background-color: rgba(239, 68, 68, 0.08);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
              outline: 2px solid transparent;
              background-color: transparent;
            }
          }
          .agy-pulse-highlight {
            animation: agy-pin-pulse 2.2s cubic-bezier(0.25, 1, 0.5, 1) !important;
            border-radius: 6px !important;
            scroll-margin-top: 70px;
            scroll-margin-bottom: 70px;
          }
          .agy-pulse-highlight-red {
            animation: agy-pin-pulse-red 2.2s cubic-bezier(0.25, 1, 0.5, 1) !important;
            border-radius: 6px !important;
            scroll-margin-top: 70px;
            scroll-margin-bottom: 70px;
          }

          /* 画中画悬浮速览面板 (PiP Modal) */
          #agy-pip-modal {
            position: fixed;
            top: 75px;
            right: 28px;
            width: 450px;
            height: 500px;
            max-width: calc(100vw - 40px);
            max-height: calc(100vh - 100px);
            z-index: 2147483500;
            background: rgba(16, 19, 29, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 14px;
            box-shadow: 0 20px 48px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.06);
            backdrop-filter: blur(28px);
            -webkit-backdrop-filter: blur(28px);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            resize: both;
            min-width: 320px;
            min-height: 220px;
            color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            animation: agy-pip-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes agy-pip-in {
            from { opacity: 0; transform: scale(0.94) translateY(12px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .agy-pip-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 9px 14px;
            background: rgba(255, 255, 255, 0.04);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            cursor: move;
            user-select: none;
            flex-shrink: 0;
          }
          .agy-pip-title-wrap {
            display: flex;
            align-items: center;
            gap: 7px;
            min-width: 0;
          }
          .agy-pip-title {
            font-size: 13px;
            font-weight: 600;
            color: #f8fafc;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 240px;
          }
          .agy-pip-rename-input {
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid #3b82f6;
            border-radius: 4px;
            color: #f8fafc;
            font-size: 12.5px;
            padding: 2px 7px;
            outline: none;
            width: 200px;
            max-width: 260px;
            font-family: inherit;
            box-shadow: 0 0 8px rgba(59, 130, 246, 0.35);
          }
          .agy-pip-header-btns {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
          }
          .agy-pip-icon-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            padding: 4px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
          }
          .agy-pip-icon-btn:hover {
            background: rgba(255, 255, 255, 0.12);
            color: #fff;
          }
          .agy-pip-body {
            flex: 1;
            overflow-y: auto;
            padding: 14px 18px;
            font-size: 13.5px;
            line-height: 1.65;
            color: #cbd5e1;
            user-select: text;
          }
          .agy-pip-body::-webkit-scrollbar {
            width: 6px;
          }
          .agy-pip-body::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 3px;
          }
          .agy-pip-body h1, .agy-pip-body h2, .agy-pip-body h3 {
            color: #f8fafc;
            margin: 12px 0 6px 0;
            font-weight: 600;
          }
          .agy-pip-body h1 { font-size: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; }
          .agy-pip-body h2 { font-size: 14.5px; }
          .agy-pip-body h3 { font-size: 13.5px; }
          .agy-pip-body p { margin: 6px 0; }
          .agy-pip-body code {
            font-family: Consolas, "Fira Code", monospace;
            background: rgba(255, 255, 255, 0.1);
            padding: 2px 5px;
            border-radius: 4px;
            font-size: 12px;
            color: #e2e8f0;
          }
          .agy-pip-body pre {
            background: rgba(8, 10, 15, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            padding: 10px 12px;
            overflow-x: auto;
            margin: 8px 0;
          }
          .agy-pip-body pre code {
            background: transparent;
            padding: 0;
            font-size: 12px;
          }
          .agy-pip-body blockquote {
            border-left: 3px solid #10b981;
            padding-left: 10px;
            margin: 8px 0;
            color: #94a3b8;
            font-style: italic;
          }
          .agy-pip-body ul, .agy-pip-body ol {
            padding-left: 20px;
            margin: 6px 0;
          }
          .agy-pip-body li { margin: 3px 0; }
          .agy-pip-body strong { color: #fff; font-weight: 600; }
          .agy-pip-body hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 12px 0; }

          /* 最小化吸附在右侧边缘的小浮标 */
          #agy-pip-dock {
            position: fixed;
            top: 100px;
            right: 0;
            z-index: 2147483400;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: #fff;
            padding: 6px 12px 6px 14px;
            border-radius: 20px 0 0 20px;
            cursor: pointer;
            font-size: 12.5px;
            font-weight: 600;
            box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            animation: agy-dock-in 0.2s ease-out;
          }
          @keyframes agy-dock-in {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          #agy-pip-dock:hover {
            padding-right: 16px;
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
            transform: scale(1.03);
          }
        `;
        document.head.appendChild(style);
      }

      // 2. 存储与数据操作 (按会话独立分 Key + LRU 自动垃圾回收机制)
      function getPinCurrentConvoId() {
        const container = getChatScrollContainer();
        if (container) {
          try {
            const k = Object.keys(container).find(key => key.startsWith('__reactFiber$'));
            let cur = container[k];
            while (cur) {
              if (cur.memoizedProps?.cascadeId) return cur.memoizedProps.cascadeId;
              if (cur.memoizedProps?.conversationId) return cur.memoizedProps.conversationId;
              cur = cur.return;
            }
          } catch (e) {}
        }
        const selectedRow = document.querySelector('[data-testid="conversation-row-sidebar"][data-selected="true"]');
        if (selectedRow) {
          const rowId = selectedRow.getAttribute('data-cascade-id');
          if (rowId) return rowId;
        }
        const match = window.location.pathname.match(/\/c\/([a-f0-9-]+)/i);
        if (match) return match[1];
        return null;
      }

      function getConvoStorageKey(convoId = null) {
        const id = convoId || getPinCurrentConvoId();
        return id ? PIN_KEY_PREFIX + `c_${id}` : null;
      }

      function migrateLegacyStorageIfPresent() {
        try {
          const oldRaw = localStorage.getItem('agy_pinned_summaries_v1');
          if (oldRaw) {
            const oldStore = JSON.parse(oldRaw);
            if (typeof oldStore === 'object' && oldStore) {
              for (const k of Object.keys(oldStore)) {
                if (Array.isArray(oldStore[k]) && oldStore[k].length > 0) {
                  localStorage.setItem(PIN_KEY_PREFIX + k, JSON.stringify(oldStore[k]));
                }
              }
            }
            localStorage.removeItem('agy_pinned_summaries_v1');
          }
        } catch (e) {}
      }

      function updateLruIndex(activeKey) {
        try {
          let lru = [];
          const raw = localStorage.getItem(PIN_LRU_KEY);
          if (raw) lru = JSON.parse(raw);
          if (!Array.isArray(lru)) lru = [];
          // 移到最前
          lru = lru.filter(k => k !== activeKey);
          lru.unshift(activeKey);
          // 超过上限淘汰最老会话的整个 Key
          while (lru.length > MAX_ACTIVE_CONVOS) {
            const evictedKey = lru.pop();
            if (evictedKey && evictedKey !== activeKey) {
              localStorage.removeItem(evictedKey);
            }
          }
          localStorage.setItem(PIN_LRU_KEY, JSON.stringify(lru));
        } catch (e) {}
      }

      function getPinnedList(convoId = null) {
        migrateLegacyStorageIfPresent();
        // 彻底清除历史误存的 c_global 脏数据，绝不影响新建会话或跨会话污染
        try { localStorage.removeItem(PIN_KEY_PREFIX + 'c_global'); } catch (e) {}

        try {
          const targetId = convoId || getPinCurrentConvoId();
          // 无具体会话 ID（如新建对话页面、启动过渡期），坚决返回空列表，0 像素占用，绝对不显示绿点
          if (!targetId) return [];

          const key = getConvoStorageKey(targetId);
          if (!key) return [];
          const raw = localStorage.getItem(key);
          if (!raw) return [];
          const list = JSON.parse(raw);
          return Array.isArray(list) ? list : [];
        } catch (e) {
          return [];
        }
      }

      function savePinnedList(list, convoId = null) {
        try {
          const key = getConvoStorageKey(convoId);
          if (!key) return;
          if (!Array.isArray(list) || list.length === 0) {
            localStorage.removeItem(key);
            try {
              const raw = localStorage.getItem(PIN_LRU_KEY);
              if (raw) {
                let lru = JSON.parse(raw);
                if (Array.isArray(lru)) {
                  lru = lru.filter(k => k !== key);
                  localStorage.setItem(PIN_LRU_KEY, JSON.stringify(lru));
                }
              }
            } catch (e) {}
            return;
          }

          // 单会话最多保留 25 条，单条超长自动安全截断
          const safeList = list.slice(0, MAX_PINS_PER_CONVO).map(item => {
            if (item.text && item.text.length > MAX_TEXT_LENGTH_PER_PIN) {
              return Object.assign({}, item, {
                text: item.text.slice(0, MAX_TEXT_LENGTH_PER_PIN) + '\n\n*(Content truncated for storage safety)*'
              });
            }
            return item;
          });

          localStorage.setItem(key, JSON.stringify(safeList));
          updateLruIndex(key);
        } catch (e) {}
      }

      function computeHash(text) {
        if (!text) return '';
        let str = text.trim();
        let hash = 0;
        for (let i = 0; i < Math.min(str.length, 300); i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i);
          hash |= 0;
        }
        return 'h_' + Math.abs(hash);
      }

      function isNoiseLine(line) {
        if (!line) return true;
        const clean = line.trim();
        if (!clean) return true;
        if (/^(worked|thought)\s+for/i.test(clean)) return true;
        if (/^thinking(\.\.\.)?/i.test(clean)) return true;
        if (/\d+\s*files?\s*changed/i.test(clean)) return true;
        if (/[+\-]\d+.*Review/i.test(clean)) return true;
        if (/Review\s*\d+:\d+/i.test(clean)) return true;
        if (/files?\s*changed/i.test(clean)) return true;
        return false;
      }

      function cleanSystemAndReviewNoise(text) {
        if (!text) return '';
        return text
          // 移除耗时与思考过程标记
          .replace(/^(worked|thought)\s+for\s+[\d\w\s\.\>\-]+\n*/gim, '')
          // 移除如 "1 file changed+85-13Review6:39 PM" 或带空格形式的代码审查状态栏
          .replace(/(?:^|\n)\s*\d+\s*files?\s*changed[^\n]*(?:Review|[\+\-]\d+)[^\n]*/gi, '')
          .replace(/(?:^|\n)\s*[+\-]\d+\s+[+\-]\d+\s+Review[^\n]*/gi, '')
          .replace(/(?:^|\n)\s*Review\s+\d+:\d+\s*(?:AM|PM)?[^\n]*/gi, '')
          .replace(/(?:^|\n)\s*\d+\s*files?\s*changed[^\n]*/gi, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }

      function extractSummaryTitle(text, defaultTitle = 'Summary') {
        if (!text) return defaultTitle;
        const cleanedText = cleanSystemAndReviewNoise(text);
        const lines = cleanedText.trim().split('\n');
        // 1. 优先提取 Markdown 标题行 (# 标题)
        for (let line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('#')) {
            const clean = trimmed.replace(/^#+\s*/, '').trim();
            if (clean && !isNoiseLine(clean)) {
              return clean.slice(0, 36);
            }
          }
        }
        // 2. 查找首个有实际内容的自然文本行（过滤 Worked for 34s、Thought for Xs、Review 等系统与工具标记）
        for (let line of lines) {
          let clean = line.trim().replace(/^[>\-\*\d\.\s#]+/, '').trim();
          if (!clean || isNoiseLine(clean)) continue;
          return clean.slice(0, 36) + (clean.length > 36 ? '...' : '');
        }
        return defaultTitle;
      }

      function escapeHtml(str) {
        return (str || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      function renderMarkdownSafe(text) {
        if (!text) return '<p style="color: #64748b;">No content</p>';
        let html = escapeHtml(text);

        // 代码块
        html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
          return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
        });

        // 行内代码
        html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

        // 粗体与斜体
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // 标题
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // 引用块
        html = html.replace(/^\&gt;\s?(.*$)/gim, '<blockquote>$1</blockquote>');

        // 列表
        html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // 段落换行
        html = html.replace(/\n\n+/g, '</p><p>');
        html = html.replace(/\n/g, '<br/>');

        return `<p>${html}</p>`;
      }

      // 3. 定位原消息并闪烁呼吸动效
      function scrollToOriginalTurn(summary) {
        if (!summary) return;
        const chatContainer = getChatScrollContainer();
        if (!chatContainer) return;

        let targetEl = null;
        if (summary.hash) {
          targetEl = chatContainer.querySelector(`[data-agy-summary-hash="${summary.hash}"]`);
        }

        if (!targetEl) {
          if (summary.type === 'prompt') {
            const userTurns = chatContainer.querySelectorAll('.group\\/user-input-step, [class*="user-input-step"]');
            const snippet = summary.text ? summary.text.slice(0, 50).trim() : '';
            for (const turn of userTurns) {
              if (snippet && (turn.innerText || '').includes(snippet)) {
                targetEl = turn;
                if (summary.hash) turn.setAttribute('data-agy-summary-hash', summary.hash);
                break;
              }
            }
          } else {
            const candidateTurns = chatContainer.querySelectorAll('.group.w-full, [class*="scroll-mt-4"], .flex.items-start');
            const snippet = summary.text ? summary.text.slice(0, 50).trim() : '';
            for (const turn of candidateTurns) {
              if (turn.closest('.group\\/user-input-step, [class*="user-input-step"]')) continue;
              if (snippet && (turn.innerText || '').includes(snippet)) {
                targetEl = turn;
                if (summary.hash) turn.setAttribute('data-agy-summary-hash', summary.hash);
                break;
              }
            }
          }
        }

        if (targetEl) {
          try {
            let focusEl = targetEl;

            // 局部选区精准定位：若存在选区特征指纹，在 targetEl 内部精确定位到具体段落/代码块
            if (summary.anchorSnippet) {
              const snippet = summary.anchorSnippet.trim();
              if (snippet) {
                const candidates = targetEl.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, tr, td, code, div');
                let bestMatch = null;
                let minLength = Infinity;
                for (const el of candidates) {
                  if (el.closest('[data-testid="cascade-system-message-toolbar"]')) continue;
                  const text = (el.innerText || '').replace(/\s+/g, ' ');
                  if (text.includes(snippet)) {
                    if (text.length < minLength) {
                      minLength = text.length;
                      bestMatch = el;
                    }
                  }
                }
                // 容错降级：前 15 字符轻量匹配
                if (!bestMatch && snippet.length > 15) {
                  const shortSnippet = snippet.slice(0, 15);
                  for (const el of candidates) {
                    if (el.closest('[data-testid="cascade-system-message-toolbar"]')) continue;
                    const text = (el.innerText || '').replace(/\s+/g, ' ');
                    if (text.includes(shortSnippet)) {
                      if (text.length < minLength) {
                        minLength = text.length;
                        bestMatch = el;
                      }
                    }
                  }
                }
                if (bestMatch) {
                  focusEl = bestMatch;
                }
              }
            }

            focusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const pulseClass = summary.type === 'prompt' ? 'agy-pulse-highlight-red' : 'agy-pulse-highlight';
            focusEl.classList.remove('agy-pulse-highlight', 'agy-pulse-highlight-red');
            void focusEl.offsetWidth;
            focusEl.classList.add(pulseClass);
            setTimeout(() => focusEl.classList.remove('agy-pulse-highlight', 'agy-pulse-highlight-red'), 2300);
            showNotification?.('Scrolled to original message');
          } catch (e) {}
        } else {
          // 原消息已被客户端深度归档/卸载：0 毫秒无缝自动拉起画中画 (PiP 浮窗)
          const list = getPinnedList();
          const targetIdx = list.findIndex(p => p.id === summary.id || p.hash === summary.hash);
          if (targetIdx !== -1) currentActiveIndex = targetIdx;
          isPipMinimized = false;
          renderPipModal(summary);
          showNotification?.('Message archived by client, opened preview instead');
        }
      }

      // 4. 画中画悬浮速览面板
      function makeDraggable(el) {
        let isDragging = false;
        let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

        const handle = el.querySelector('#agy-pip-drag-handle') || el;
        handle.addEventListener('pointerdown', (e) => {
          if (e.target.closest('button')) return;
          isDragging = true;
          handle.setPointerCapture(e.pointerId);
          startX = e.clientX;
          startY = e.clientY;
          const rect = el.getBoundingClientRect();
          initialLeft = rect.left;
          initialTop = rect.top;
          el.style.right = 'auto';
          el.style.left = `${initialLeft}px`;
          el.style.top = `${initialTop}px`;
          el.style.transition = 'none';
        });

        handle.addEventListener('pointermove', (e) => {
          if (!isDragging) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          let newLeft = Math.max(10, Math.min(window.innerWidth - el.offsetWidth - 10, initialLeft + dx));
          let newTop = Math.max(10, Math.min(window.innerHeight - el.offsetHeight - 10, initialTop + dy));
          el.style.left = `${newLeft}px`;
          el.style.top = `${newTop}px`;
        });

        const stopDrag = (e) => {
          if (!isDragging) return;
          isDragging = false;
          try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
          el.style.transition = '';
        };

        handle.addEventListener('pointerup', stopDrag);
        handle.addEventListener('pointercancel', stopDrag);
      }

      function renderPipModal(summary) {
        if (!summary) {
          document.getElementById('agy-pip-modal')?.remove();
          document.getElementById('agy-pip-dock')?.remove();
          return;
        }

        document.getElementById('agy-pip-dock')?.remove();

        let modal = document.getElementById('agy-pip-modal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'agy-pip-modal';
          document.body.appendChild(modal);
          makeDraggable(modal);
        }

        const list = getPinnedList();
        const total = list.length;
        const currentIdx = currentActiveIndex >= 0 && currentActiveIndex < total ? currentActiveIndex : 0;
        const item = list[currentIdx] || summary;
        const isPrompt = item.type === 'prompt';

        modal.innerHTML = `
          <div class="agy-pip-header" id="agy-pip-drag-handle">
            <div class="agy-pip-title-wrap">
              <span style="color: ${isPrompt ? '#ef4444' : '#34d399'}; font-size: 14px;">📌</span>
              <span class="agy-pip-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</span>
              ${isPrompt 
                ? `<span style="font-size: 11px; background: rgba(239,68,68,0.18); color: #f87171; padding: 1px 6px; border-radius: 999px;">Prompt</span>`
                : `<span style="font-size: 11px; background: rgba(16,185,129,0.18); color: #34d399; padding: 1px 6px; border-radius: 999px;">AI</span>`}
              ${total > 1 ? `<span style="font-size: 11px; background: rgba(255,255,255,0.08); color: #94a3b8; padding: 1px 6px; border-radius: 999px;">${currentIdx + 1}/${total}</span>` : ''}
            </div>
            <div class="agy-pip-header-btns">
              <button class="agy-pip-icon-btn" id="agy-pip-rename-btn" title="Rename">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="agy-pip-icon-btn" id="agy-pip-jump-btn" title="Locate original message">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
              <button class="agy-pip-icon-btn" id="agy-pip-copy-btn" title="Copy full content">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              <button class="agy-pip-icon-btn" id="agy-pip-close-btn" title="Close preview">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
          <div class="agy-pip-body" id="agy-pip-content">
            ${renderMarkdownSafe(item.text)}
          </div>
        `;

        modal.querySelector('#agy-pip-rename-btn')?.addEventListener('click', () => {
          const titleWrap = modal.querySelector('.agy-pip-title-wrap');
          const titleSpan = modal.querySelector('.agy-pip-title');
          if (!titleWrap || !titleSpan || titleWrap.querySelector('input')) return;

          const currentTitle = item.title || '';
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'agy-pip-rename-input';
          input.value = currentTitle;

          titleSpan.style.display = 'none';
          titleSpan.parentNode.insertBefore(input, titleSpan);
          input.focus();
          input.select();

          let finished = false;
          const finishRename = (save) => {
            if (finished) return;
            finished = true;
            const val = input.value.trim();
            if (save && val && val !== item.title) {
              item.title = val;
              savePinnedList(list);
              showNotification?.('Renamed');
              renderPinnedIndicator(true);
            }
            titleSpan.textContent = item.title;
            titleSpan.title = item.title;
            titleSpan.style.display = '';
            input.remove();
          };

          input.addEventListener('keydown', (ev) => {
            ev.stopPropagation();
            if (ev.key === 'Enter') finishRename(true);
            else if (ev.key === 'Escape') finishRename(false);
          });
          input.addEventListener('blur', () => finishRename(true));
        });

        modal.querySelector('#agy-pip-jump-btn')?.addEventListener('click', () => scrollToOriginalTurn(item));
        modal.querySelector('#agy-pip-copy-btn')?.addEventListener('click', () => {
          copyText(item.text || '');
          showNotification?.('Content copied');
        });
        modal.querySelector('#agy-pip-close-btn')?.addEventListener('click', () => {
          modal.remove();
          isPipMinimized = false;
        });
      }

      function renderPipDock() {
        const list = getPinnedList();
        if (list.length === 0) {
          document.getElementById('agy-pip-dock')?.remove();
          return;
        }
        let dock = document.getElementById('agy-pip-dock');
        if (!dock) {
          dock = document.createElement('div');
          dock.id = 'agy-pip-dock';
          document.body.appendChild(dock);
        }
        const item = list[currentActiveIndex] || list[0];
        dock.innerHTML = `<span>📌</span> <span>${escapeHtml(item.title.slice(0, 10))}</span>`;
        dock.onclick = () => {
          isPipMinimized = false;
          dock.remove();
          renderPipModal(item);
        };
      }

      // 5. 右侧翻页按钮上方的指示器容器与悬停卡片抽屉 (Hover Drawer)
      let lastRenderedPinSignature = '';

      function renderPinnedIndicator(force = false) {
        const navGroup = document.getElementById('agy-page-nav-group');
        if (!navGroup) return;

        let indicatorWrap = document.getElementById('agy-pinned-nav-indicator');
        if (!indicatorWrap) {
          indicatorWrap = document.createElement('div');
          indicatorWrap.id = 'agy-pinned-nav-indicator';
          navGroup.insertBefore(indicatorWrap, navGroup.firstChild);

          // 绑定平滑防抖悬停
          indicatorWrap.addEventListener('mouseenter', () => {
            if (drawerCloseTimeout) {
              clearTimeout(drawerCloseTimeout);
              drawerCloseTimeout = null;
            }
            indicatorWrap.classList.add('hovering');
          });

          indicatorWrap.addEventListener('mouseleave', () => {
            drawerCloseTimeout = setTimeout(() => {
              if (!indicatorWrap.querySelector('.agy-card-rename-input')) {
                indicatorWrap.classList.remove('hovering');
              }
            }, 250);
          });
        }

        const list = getPinnedList();
        // 如果没有钉选，彻底不显示绿点，0 像素占用
        if (list.length === 0) {
          indicatorWrap.style.display = 'none';
          document.getElementById('agy-pip-modal')?.remove();
          document.getElementById('agy-pip-dock')?.remove();
          lastRenderedPinSignature = '';
          return;
        }

        indicatorWrap.style.display = 'flex';

        // 核心防抖与状态保护：用户鼠标正在悬停或正在编辑标题时，心跳绝对不重写 innerHTML，彻底消除半秒抖动
        const isHovering = indicatorWrap.classList.contains('hovering') || indicatorWrap.matches(':hover');
        const isEditing = indicatorWrap.classList.contains('editing') || !!indicatorWrap.querySelector('.agy-card-rename-input');
        const currentSignature = list.map(p => `${p.id}_${p.title}_${p.type || 'ai'}`).join('|');

        if (!force && (isHovering || isEditing)) {
          return;
        }

        if (!force && lastRenderedPinSignature === currentSignature && indicatorWrap.querySelector('#agy-pin-drawer')) {
          return;
        }

        lastRenderedPinSignature = currentSignature;

        // 渲染长条卡片列表 (纯图标优雅排版，红绿图钉区分提示词与AI回复)
        let cardsHtml = '';
        list.forEach((item, idx) => {
          const isPrompt = item.type === 'prompt';
          cardsHtml += `
            <div class="agy-pinned-card" data-pin-id="${escapeHtml(item.id)}">
              <span class="agy-card-pin-icon ${isPrompt ? 'type-prompt' : 'type-ai'}" title="${isPrompt ? 'Prompt' : 'AI Response'}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="17" x2="12" y2="22"></line>
                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" fill="currentColor"></path>
                </svg>
              </span>
              <span class="agy-card-title" title="${escapeHtml(item.title)} (Double-click to preview)">${escapeHtml(item.title)}</span>
              <div class="agy-card-actions">
                <button class="agy-card-btn agy-card-rename" data-idx="${idx}" title="Rename">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="agy-card-btn agy-card-jump" data-idx="${idx}" title="Locate">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
                <button class="agy-card-btn agy-card-pip" data-idx="${idx}" title="Preview">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="11" y="11" width="8" height="8" rx="1"></rect></svg>
                </button>
                <button class="agy-card-btn danger agy-card-unpin" data-pin-id="${escapeHtml(item.id)}" title="Remove">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>
          `;
        });

        indicatorWrap.innerHTML = `
          <div class="agy-pin-dot" title="${list.length} pinned ${list.length === 1 ? 'summary' : 'summaries'} (hover to view)"></div>
          <div class="agy-pin-flyout-drawer" id="agy-pin-drawer">
            ${cardsHtml}
          </div>
        `;

        const drawer = indicatorWrap.querySelector('#agy-pin-drawer');
        drawer?.addEventListener('mouseenter', () => {
          if (drawerCloseTimeout) {
            clearTimeout(drawerCloseTimeout);
            drawerCloseTimeout = null;
          }
          indicatorWrap.classList.add('hovering');
        });

        drawer?.addEventListener('mouseleave', () => {
          drawerCloseTimeout = setTimeout(() => {
            if (!indicatorWrap.querySelector('.agy-card-rename-input')) {
              indicatorWrap.classList.remove('hovering');
            }
          }, 250);
        });

        // 绑定卡片交互：Rename (原地输入编辑，舒适交互)
        indicatorWrap.querySelectorAll('.agy-card-rename').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-idx') || '0', 10);
            const targetItem = list[idx];
            if (!targetItem) return;

            const cardEl = btn.closest('.agy-pinned-card');
            const titleEl = cardEl?.querySelector('.agy-card-title');
            if (!cardEl || !titleEl || cardEl.querySelector('.agy-card-rename-input')) return;

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'agy-card-rename-input';
            input.value = targetItem.title || '';

            indicatorWrap.classList.add('editing');
            titleEl.style.display = 'none';
            titleEl.parentNode.insertBefore(input, titleEl);
            input.focus();
            input.select();

            let finished = false;
            const finishRename = (save) => {
              if (finished) return;
              finished = true;
              indicatorWrap.classList.remove('editing');
              const val = input.value.trim();
              if (save && val && val !== targetItem.title) {
                targetItem.title = val;
                savePinnedList(list);
                showNotification?.('Renamed');
                const modalTitle = document.querySelector('#agy-pip-modal .agy-pip-title');
                if (modalTitle && currentActiveIndex === idx) {
                  modalTitle.textContent = val;
                  modalTitle.title = val;
                }
              }
              titleEl.textContent = targetItem.title;
              titleEl.title = `${targetItem.title} (Double-click to preview)`;
              titleEl.style.display = '';
              input.remove();
              lastRenderedPinSignature = '';
            };

            input.addEventListener('keydown', (ev) => {
              ev.stopPropagation();
              if (ev.key === 'Enter') {
                finishRename(true);
              } else if (ev.key === 'Escape') {
                finishRename(false);
              }
            });
            input.addEventListener('blur', () => {
              finishRename(true);
            });
          });
        });

        // 绑定卡片交互：Locate
        indicatorWrap.querySelectorAll('.agy-card-jump').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-idx') || '0', 10);
            const targetItem = list[idx];
            if (targetItem) scrollToOriginalTurn(targetItem);
          });
        });

        // 绑定卡片交互：Preview
        indicatorWrap.querySelectorAll('.agy-card-pip').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-idx') || '0', 10);
            currentActiveIndex = idx;
            const targetItem = list[idx];
            if (targetItem) {
              isPipMinimized = false;
              renderPipModal(targetItem);
            }
          });
        });

        // 绑定卡片交互：双击标题或卡片主体直接打开画中画预览 (Preview)
        indicatorWrap.querySelectorAll('.agy-pinned-card').forEach(cardEl => {
          cardEl.addEventListener('dblclick', (e) => {
            if (e.target.closest('.agy-card-actions') || e.target.closest('input')) return;
            e.stopPropagation();
            e.preventDefault();
            const pinId = cardEl.getAttribute('data-pin-id');
            const curList = getPinnedList();
            const targetIdx = curList.findIndex(p => p.id === pinId);
            if (targetIdx !== -1) {
              currentActiveIndex = targetIdx;
              isPipMinimized = false;
              renderPipModal(curList[targetIdx]);
            }
          });
        });

        // 绑定卡片交互：Remove
        indicatorWrap.querySelectorAll('.agy-card-unpin').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const pinId = btn.getAttribute('data-pin-id');
            if (pinId) removePinItem(pinId);
          });
        });
      }

      // 6. 辅助定位与对话位置排序（多维层级排序体系，彻底解决虚拟滚动及倒序问题）
      function extractStepMeta(el) {
        let stepIndex = null;
        let messageTimestamp = null;
        if (!el) return { stepIndex, messageTimestamp };

        try {
          const fiberKey = Object.keys(el || {}).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
          let f = el[fiberKey];
          let depth = 0;
          while (f && depth < 30) {
            depth++;
            const p = f.memoizedProps;
            if (p) {
              // 1. 直接检查 props 中的 step 信息
              if (typeof p.stepIndex === 'number') {
                stepIndex = p.stepIndex;
              } else if (p.step) {
                const sObj = p.step.value || p.step;
                if (typeof sObj.step_index === 'number') stepIndex = sObj.step_index;
                else if (typeof sObj.stepIndex === 'number') stepIndex = sObj.stepIndex;
                else if (typeof sObj.index === 'number') stepIndex = sObj.index;

                if (!messageTimestamp) {
                  const ts = sObj.created_at || sObj.createdAt || sObj.timestamp;
                  if (ts) messageTimestamp = typeof ts === 'number' ? ts : Date.parse(ts);
                }
              }

              // 2. 检查 props.steps 数组
              if (stepIndex === null && Array.isArray(p.steps) && p.steps.length > 0) {
                for (const s of p.steps) {
                  const sObj = s?.step?.value || s?.step || s;
                  if (typeof sObj?.step_index === 'number') stepIndex = sObj.step_index;
                  else if (typeof sObj?.stepIndex === 'number') stepIndex = sObj.stepIndex;
                  else if (typeof sObj?.index === 'number') stepIndex = sObj.index;

                  if (!messageTimestamp && sObj) {
                    const ts = sObj.created_at || sObj.createdAt || sObj.timestamp;
                    if (ts) messageTimestamp = typeof ts === 'number' ? ts : Date.parse(ts);
                  }
                  if (stepIndex !== null) break;
                }
              }

              // 3. 检查 userMessage 或 timestamp
              if (!messageTimestamp && p.timestamp) {
                messageTimestamp = typeof p.timestamp === 'number' ? p.timestamp : Date.parse(p.timestamp);
              }
            }
            if (stepIndex !== null && messageTimestamp) break;
            f = f.return;
          }
        } catch (e) {}

        return { stepIndex, messageTimestamp };
      }

      function getElementTurnIndex(el) {
        if (!el) return -1;
        const activePane = (typeof getActivePane === 'function') ? getActivePane() : null;
        const container = getChatScrollContainer(activePane);
        const turnContainer = container?.querySelector?.('.relative.flex.flex-col.gap-y-3, .flex.flex-col.gap-y-3') ||
                              activePane?.querySelector?.('.relative.flex.flex-col.gap-y-3, .flex.flex-col.gap-y-3') ||
                              document.querySelector('.relative.flex.flex-col.gap-y-3, .flex.flex-col.gap-y-3');
        if (!turnContainer || !turnContainer.children || turnContainer.children.length === 0) {
          return -1;
        }
        const children = turnContainer.children;
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (child === el || child.contains(el) || el.contains(child)) {
            return i;
          }
        }
        return -1;
      }

      function getPinTurnElement(item) {
        if (!item) return null;
        const chatContainer = getChatScrollContainer();
        if (!chatContainer) return null;

        // 1. 精确哈希匹配
        if (item.hash) {
          const el = chatContainer.querySelector(`[data-agy-summary-hash="${item.hash}"]`);
          if (el) return el;
        }

        // 2. 锚点特征短句匹配 (针对选区钉选最精准)
        const anchor = (item.anchorSnippet || '').trim();
        const snippet = (item.text || '').slice(0, 40).trim();
        const title = (item.title || '').trim();
        const searchTerms = [anchor, snippet, title].filter(t => t && t.length >= 4);

        if (searchTerms.length === 0) return null;

        if (item.type === 'prompt') {
          const userTurns = chatContainer.querySelectorAll('.group\\/user-input-step, [class*="user-input-step"]');
          for (const term of searchTerms) {
            for (const turn of userTurns) {
              if ((turn.innerText || '').includes(term)) {
                if (item.hash) turn.setAttribute('data-agy-summary-hash', item.hash);
                return turn;
              }
            }
          }
        } else {
          const candidateTurns = chatContainer.querySelectorAll('.group.w-full, [class*="scroll-mt-4"], .flex.items-start');
          for (const term of searchTerms) {
            for (const turn of candidateTurns) {
              if (turn.closest('.group\\/user-input-step, [class*="user-input-step"]')) continue;
              if ((turn.innerText || '').includes(term)) {
                if (item.hash) turn.setAttribute('data-agy-summary-hash', item.hash);
                return turn;
              }
            }
          }
        }
        return null;
      }

      function sortPinsByConversationOrder(list, currentTurnEl = null, currentItem = null) {
        if (!Array.isArray(list) || list.length <= 1) return list;
        const chatContainer = getChatScrollContainer();

        const elMap = new Map();
        if (currentItem && currentTurnEl) {
          elMap.set(currentItem.id || currentItem.hash, currentTurnEl);
        }

        // 预查所有元素的 DOM 节点，并为老数据自愈补齐 stepIndex 和元数据
        for (const item of list) {
          const key = item.id || item.hash;
          let el = elMap.get(key);
          if (!el) {
            el = getPinTurnElement(item);
            if (el) elMap.set(key, el);
          }
          if (el) {
            if (typeof item.stepIndex !== 'number' || !item.messageTimestamp) {
              const meta = extractStepMeta(el);
              if (typeof meta.stepIndex === 'number') item.stepIndex = meta.stepIndex;
              if (meta.messageTimestamp) item.messageTimestamp = meta.messageTimestamp;
            }
            if (typeof item.turnIndex !== 'number') {
              const tIdx = getElementTurnIndex(el);
              if (tIdx !== -1) item.turnIndex = tIdx;
            }
          }
        }

        const sorted = list.slice().sort((a, b) => {
          const elA = elMap.get(a.id || a.hash);
          const elB = elMap.get(b.id || b.hash);

          // 1. 第一优先级：当前 DOM 中均活跃可见的真实节点比较（最高保真）
          if (elA && elB) {
            if (elA === elB) {
              if (a.type !== b.type) {
                return a.type === 'prompt' ? -1 : 1;
              }
              const offA = typeof a.textOffset === 'number' ? a.textOffset : 0;
              const offB = typeof b.textOffset === 'number' ? b.textOffset : 0;
              if (offA !== offB) return offA - offB;
            } else {
              const tIdxA = getElementTurnIndex(elA);
              const tIdxB = getElementTurnIndex(elB);
              if (tIdxA !== -1 && tIdxB !== -1 && tIdxA !== tIdxB) {
                return tIdxA - tIdxB;
              }
              if (tIdxA !== -1 && tIdxA === tIdxB) {
                if (a.type !== b.type) {
                  return a.type === 'prompt' ? -1 : 1;
                }
              }
              const comp = elA.compareDocumentPosition(elB);
              if (comp & Node.DOCUMENT_POSITION_FOLLOWING) {
                return -1; // elA 在 elB 上方（较早对话）
              } else if (comp & Node.DOCUMENT_POSITION_PRECEDING) {
                return 1;  // elA 在 elB 下方（较晚对话）
              }
            }
          }

          // 2. 第二优先级：记录的回合索引 turnIndex（单调递增）
          const tIdxA = (typeof a.turnIndex === 'number' && a.turnIndex >= 0) ? a.turnIndex : null;
          const tIdxB = (typeof b.turnIndex === 'number' && b.turnIndex >= 0) ? b.turnIndex : null;
          if (tIdxA !== null && tIdxB !== null && tIdxA !== tIdxB) {
            return tIdxA - tIdxB;
          }

          // 3. 第三优先级：React Fiber 全局单调递增步骤序列号 stepIndex
          if (typeof a.stepIndex === 'number' && typeof b.stepIndex === 'number') {
            if (a.stepIndex !== b.stepIndex) {
              return a.stepIndex - b.stepIndex;
            }
          }

          // 4. 同一回合或步骤内部细分（用户提问在前，AI 回复在后；选区偏移在前在后）
          if ((tIdxA !== null && tIdxA === tIdxB) || (typeof a.stepIndex === 'number' && a.stepIndex === b.stepIndex)) {
            if (a.type !== b.type) {
              return a.type === 'prompt' ? -1 : 1;
            }
            const offA = typeof a.textOffset === 'number' ? a.textOffset : 0;
            const offB = typeof b.textOffset === 'number' ? b.textOffset : 0;
            if (offA !== offB) return offA - offB;
          }

          // 5. 第四优先级：消息生成的时间戳 messageTimestamp
          if (a.messageTimestamp && b.messageTimestamp) {
            const tA = typeof a.messageTimestamp === 'number' ? a.messageTimestamp : Date.parse(a.messageTimestamp);
            const tB = typeof b.messageTimestamp === 'number' ? b.messageTimestamp : Date.parse(b.messageTimestamp);
            if (!isNaN(tA) && !isNaN(tB) && tA !== tB) {
              return tA - tB;
            }
          }

          // 6. 保底优先级：历史分配索引或创建时刻时间戳，绝不倒错
          if (typeof a.orderIndex === 'number' && typeof b.orderIndex === 'number') {
            if (a.orderIndex !== b.orderIndex) {
              return a.orderIndex - b.orderIndex;
            }
          }

          return (a.timestamp || 0) - (b.timestamp || 0);
        });

        // 重新分配连续递增的 orderIndex
        sorted.forEach((item, idx) => {
          item.orderIndex = idx;
        });

        return sorted;
      }

      // 添加与移除操作（按对话中出现的位置从上到下排序）
      function addPinItem(item, targetEl = null) {
        let list = getPinnedList();
        const existingIdx = list.findIndex(p => p.hash === item.hash || p.id === item.id);
        if (existingIdx !== -1) {
          list.splice(existingIdx, 1);
        }

        if (targetEl && item.hash) {
          try { targetEl.setAttribute('data-agy-summary-hash', item.hash); } catch (e) {}
        }

        list.push(item);
        list = sortPinsByConversationOrder(list, targetEl, item);
        savePinnedList(list);

        const newIdx = list.findIndex(p => p.id === item.id || p.hash === item.hash);
        currentActiveIndex = newIdx !== -1 ? newIdx : 0;

        showNotification?.(item.type === 'prompt' ? '📌 Prompt pinned' : '📌 AI response pinned');
        lastRenderedPinSignature = '';
        renderPinnedIndicator(true);
        syncAllPinButtons();
      }

      function removePinItem(idOrHash) {
        let list = getPinnedList();
        list = list.filter(p => p.id !== idOrHash && p.hash !== idOrHash);
        list.forEach((item, idx) => {
          item.orderIndex = idx;
        });
        savePinnedList(list);
        if (currentActiveIndex >= list.length) currentActiveIndex = Math.max(0, list.length - 1);
        showNotification?.('Unpinned');
        lastRenderedPinSignature = '';
        renderPinnedIndicator(true);
        if (list.length === 0) {
          document.getElementById('agy-pip-modal')?.remove();
          document.getElementById('agy-pip-dock')?.remove();
        } else if (document.getElementById('agy-pip-modal')) {
          renderPipModal(list[currentActiveIndex]);
        }
        syncAllPinButtons();
      }

      // 7. 提取用户提示词数据 (User Prompt Data)
      function extractUserPromptData(uTurn) {
        let markdownText = '';
        let stepIndex = null;
        let messageTimestamp = null;

        try {
          const fiberKey = Object.keys(uTurn || {}).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
          let f = uTurn[fiberKey];
          let depth = 0;
          while (f && depth < 25) {
            depth++;
            if (f.memoizedProps) {
              const p = f.memoizedProps;
              const msg = p.message || p.userMessage || p.step?.userMessage || p.step?.text || p.step?.content || p.step?.value?.userMessage;
              if (typeof msg === 'string' && msg.trim() && !markdownText) {
                markdownText = msg.trim();
              }
              if (stepIndex === null) {
                const sObj = p.step?.value || p.step;
                if (typeof p.stepIndex === 'number') stepIndex = p.stepIndex;
                else if (typeof sObj?.step_index === 'number') stepIndex = sObj.step_index;
                else if (typeof sObj?.stepIndex === 'number') stepIndex = sObj.stepIndex;
                else if (typeof sObj?.index === 'number') stepIndex = sObj.index;
              }
              if (!messageTimestamp) {
                const ts = p.timestamp || p.step?.timestamp || p.step?.created_at || p.step?.createdAt;
                if (ts) messageTimestamp = typeof ts === 'number' ? ts : Date.parse(ts);
              }
            }
            if (markdownText && stepIndex !== null && messageTimestamp) break;
            f = f.return;
          }
        } catch (e) {}

        if (!markdownText && uTurn) {
          const clone = uTurn.cloneNode(true);
          clone.querySelectorAll('button, svg, [role="toolbar"], .agy-user-pin-btn, [class*="user-input-step-buttons"]').forEach(el => el.remove());
          markdownText = clone.innerText?.trim() || '';
        }

        markdownText = cleanSystemAndReviewNoise(markdownText);
        const hash = computeHash('prompt:' + markdownText);
        const title = extractSummaryTitle(markdownText, 'User Prompt');
        const turnIndex = getElementTurnIndex(uTurn);
        return { markdownText, hash, title, stepIndex, messageTimestamp, turnIndex };
      }

      function extractAiTurnData(turnEl, toolbar = null) {
        let markdownText = '';
        let stepIndex = null;
        let messageTimestamp = null;
        const effectiveToolbar = toolbar || turnEl?.querySelector?.('[data-testid="cascade-system-message-toolbar"]');

        try {
          const searchRoots = [effectiveToolbar, turnEl?.querySelector?.('.prose, [class*="markdown"]'), turnEl].filter(Boolean);
          for (const root of searchRoots) {
            const fiberKey = Object.keys(root).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
            let f = root[fiberKey];
            let depth = 0;
            while (f && depth < 25) {
              depth++;
              if (f.memoizedProps?.steps) {
                const steps = f.memoizedProps.steps;
                for (const s of steps) {
                  const stepObj = s.step?.value || s.step;
                  if (stepObj?.response || stepObj?.modifiedResponse) {
                    if (!markdownText) markdownText = stepObj.modifiedResponse || stepObj.response || '';
                  }
                  if (stepIndex === null) {
                    if (typeof s.stepIndex === 'number') stepIndex = s.stepIndex;
                    else if (typeof s.index === 'number') stepIndex = s.index;
                    else if (typeof stepObj?.step_index === 'number') stepIndex = stepObj.step_index;
                    else if (typeof stepObj?.stepIndex === 'number') stepIndex = stepObj.stepIndex;
                    else if (typeof stepObj?.index === 'number') stepIndex = stepObj.index;
                  }
                  if (!messageTimestamp && stepObj) {
                    const ts = stepObj.created_at || stepObj.createdAt || stepObj.timestamp;
                    if (ts) messageTimestamp = typeof ts === 'number' ? ts : Date.parse(ts);
                  }
                }
                if (markdownText && stepIndex !== null) break;
              }
              f = f.return;
            }
            if (markdownText && stepIndex !== null) break;
          }
        } catch (e) {}

        if (!markdownText && turnEl) {
          const clone = turnEl.cloneNode(true);
          clone.querySelectorAll('[data-testid="cascade-system-message-toolbar"]')?.forEach(el => el.remove());
          clone.querySelectorAll('[data-testid*="review"], [data-testid*="diff"]')?.forEach(el => el.remove());
          // 移除耗时、思考过程折叠头 (如 Worked for 34s, Thought for 10s) 与代码审查栏
          clone.querySelectorAll('button, div, span, [data-testid*="thought"], [class*="thought"]').forEach(el => {
            const t = el.innerText?.trim() || '';
            if (/^(worked|thought)\s+for\s+\d+/i.test(t) && t.length < 60) {
              el.remove();
            } else if (/\d+\s*files?\s*changed/i.test(t) && /review/i.test(t)) {
              el.remove();
            }
          });
          markdownText = clone.innerText?.trim() || '';
        }

        // 统一彻底清理审查栏和系统噪音
        markdownText = cleanSystemAndReviewNoise(markdownText);

        const hash = computeHash(markdownText);
        const title = extractSummaryTitle(markdownText, 'AI Summary');
        const turnIndex = getElementTurnIndex(turnEl || effectiveToolbar);
        return { markdownText, hash, title, stepIndex, messageTimestamp, turnIndex };
      }

      // 8. 巡检并同步钉选按钮 (用户提问右下角 + AI 回复右下角复制前)
      function syncAllPinButtons() {
        // 清理任何历史可能遗留的旧式图钉
        document.querySelectorAll('.agy-pin-btn').forEach(el => el.remove());

        const list = getPinnedList();
        const pinnedHashes = new Set(list.map(p => p.hash));

        // A. 用户发出后的提示词右下角：放置在复制和 Undo 前面，提取【提示词】
        const userTurns = document.querySelectorAll('.group\\/user-input-step, [class*="user-input-step"]');
        for (const uTurn of userTurns) {
          const copyBtn = uTurn.querySelector('button[data-tooltip-id*="copy-user-message"], button[aria-label*="Copy prompt" i], button[aria-label*="Copy" i]');
          if (!copyBtn) continue;
          const btnRow = copyBtn.parentElement;
          if (!btnRow) continue;

          let uPinBtn = btnRow.querySelector('.agy-user-pin-btn');
          if (!uPinBtn) {
            uPinBtn = document.createElement('button');
            uPinBtn.className = 'agy-user-pin-btn';
            uPinBtn.type = 'button';
            uPinBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>`;

            uPinBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              const { markdownText, hash, title, stepIndex, messageTimestamp, turnIndex } = extractUserPromptData(uTurn);
              if (!markdownText) return;
              uTurn.setAttribute('data-agy-summary-hash', hash);
              const isPinned = list.some(p => p.hash === hash);
              if (isPinned) {
                removePinItem(hash);
              } else {
                addPinItem({
                  id: 'pin_' + Date.now(),
                  hash,
                  title,
                  text: markdownText,
                  type: 'prompt',
                  stepIndex: typeof stepIndex === 'number' ? stepIndex : null,
                  messageTimestamp: messageTimestamp || null,
                  turnIndex: typeof turnIndex === 'number' ? turnIndex : null,
                  timestamp: Date.now()
                }, uTurn);
              }
            });

            btnRow.insertBefore(uPinBtn, copyBtn);
          }

          // 同步用户提示词图钉的激活态 (红色)
          const promptHash = uTurn.getAttribute('data-agy-summary-hash') || computeHash('prompt:' + (uTurn.innerText || '').trim());
          if (promptHash && pinnedHashes.has(promptHash)) {
            uPinBtn.classList.add('active');
            uPinBtn.title = 'Prompt pinned (Click to unpin)';
          } else {
            let matched = false;
            for (const item of list) {
              if (item.type === 'prompt' && item.hash && pinnedHashes.has(item.hash)) {
                const snippet = (item.text || '').slice(0, 30).trim();
                if (snippet && (uTurn.innerText || '').includes(snippet)) {
                  uTurn.setAttribute('data-agy-summary-hash', item.hash);
                  uPinBtn.classList.add('active');
                  uPinBtn.title = 'Prompt pinned (Click to unpin)';
                  matched = true;
                  break;
                }
              }
            }
            if (!matched) {
              uPinBtn.classList.remove('active');
              uPinBtn.title = 'Pin prompt';
            }
          }
        }

        // B. AI 回复气泡：在右下角复制按钮前提供专属钉选入口，提取【AI 回复】
        const toolbars = document.querySelectorAll('[data-testid="cascade-system-message-toolbar"]');
        for (const toolbar of toolbars) {
          const turnEl = toolbar.closest('.group.w-full, [class*="scroll-mt-4"], .flex.items-start') || toolbar.parentElement;
          if (!turnEl) continue;

          const copyBtn = toolbar.querySelector('button[aria-label="Copy"], button[aria-label="Copied"], button[data-tooltip-id*="copy-"]:not([data-tooltip-id*="copy-user-message"]):not([data-tooltip-id*="copy-code"])') || toolbar.querySelector('button[aria-label*="Copy" i]');
          if (!copyBtn) continue;

          let aiPinBtn = toolbar.querySelector('.agy-ai-pin-btn');
          if (!aiPinBtn) {
            aiPinBtn = document.createElement('button');
            aiPinBtn.className = 'agy-ai-pin-btn';
            aiPinBtn.type = 'button';
            aiPinBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>`;

            aiPinBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              const { markdownText, hash, title, stepIndex, messageTimestamp, turnIndex } = extractAiTurnData(turnEl, toolbar);
              if (!markdownText) return;
              turnEl.setAttribute('data-agy-summary-hash', hash);
              const isPinned = list.some(p => p.hash === hash);
              if (isPinned) {
                removePinItem(hash);
              } else {
                addPinItem({
                  id: 'pin_' + Date.now(),
                  hash,
                  title,
                  text: markdownText,
                  type: 'ai',
                  stepIndex: typeof stepIndex === 'number' ? stepIndex : null,
                  messageTimestamp: messageTimestamp || null,
                  turnIndex: typeof turnIndex === 'number' ? turnIndex : null,
                  timestamp: Date.now()
                }, turnEl);
              }
            });

            copyBtn.parentElement.insertBefore(aiPinBtn, copyBtn);
          }

          // 同步 AI 回复图钉的激活态 (绿色)
          const aiHash = turnEl.getAttribute('data-agy-summary-hash') || computeHash(turnEl.innerText || '');
          if (aiHash && pinnedHashes.has(aiHash)) {
            aiPinBtn.classList.add('active');
            aiPinBtn.title = 'AI response pinned (Click to unpin)';
          } else {
            let matched = false;
            for (const item of list) {
              if (item.type !== 'prompt' && item.hash && pinnedHashes.has(item.hash)) {
                const snippet = (item.text || '').slice(0, 30).trim();
                if (snippet && (turnEl.innerText || '').includes(snippet)) {
                  turnEl.setAttribute('data-agy-summary-hash', item.hash);
                  aiPinBtn.classList.add('active');
                  aiPinBtn.title = 'AI response pinned (Click to unpin)';
                  matched = true;
                  break;
                }
              }
            }
            if (!matched) {
              aiPinBtn.classList.remove('active');
              aiPinBtn.title = 'Pin AI response';
            }
          }
        }
      }

      // 9. 导出供全局右键菜单调用的公共方法
      isAiTurnPinned = function (aiTurn) {
        if (!aiTurn) return false;
        const list = getPinnedList();
        const hash = computeHash(aiTurn.markdownText || aiTurn.turnEl?.innerText || '');
        return list.some(p => p.hash === hash);
      };

      toggleAiTurnPin = function (aiTurn) {
        if (!aiTurn) return;
        const text = aiTurn.markdownText || aiTurn.turnEl?.innerText || '';
        if (!text) return;
        const hash = computeHash(text);
        const title = extractSummaryTitle(text, 'AI Summary');
        if (aiTurn.turnEl) aiTurn.turnEl.setAttribute('data-agy-summary-hash', hash);

        const list = getPinnedList();
        const isPinned = list.some(p => p.hash === hash);
        if (isPinned) {
          removePinItem(hash);
        } else {
          const { stepIndex, messageTimestamp } = extractStepMeta(aiTurn.turnEl || aiTurn.toolbar);
          const domTurnIndex = getDomTurnIndex(aiTurn.turnEl || aiTurn.toolbar);
          addPinItem({
            id: 'pin_' + Date.now(),
            hash,
            title,
            text,
            type: 'ai',
            stepIndex: typeof stepIndex === 'number' ? stepIndex : null,
            messageTimestamp: messageTimestamp || null,
            domTurnIndex: domTurnIndex !== -1 ? domTurnIndex : null,
            timestamp: Date.now()
          }, aiTurn.turnEl);
        }
      };

      // 10. 选中文本时：从当前选中位置向后截取提取至消息末尾并钉选
      function extractFromSelectionToEnd(aiTurn, selectedText, tailMarkdown = null) {
        const fullMarkdown = cleanSystemAndReviewNoise(aiTurn.markdownText || aiTurn.turnEl?.innerText || '');
        const selTrim = (selectedText || '').trim();

        // 1. 若外部已通过 DOM Range 向后克隆到末尾成功提取了 tailMarkdown，优先清洗后使用
        if (tailMarkdown && tailMarkdown.trim()) {
          const cleanedTail = cleanSystemAndReviewNoise(tailMarkdown);
          if (cleanedTail.length >= selTrim.length) {
            return cleanedTail;
          }
        }

        if (fullMarkdown && selTrim) {
          // 2. 完全精确查找
          let idx = fullMarkdown.indexOf(selTrim);
          if (idx !== -1) {
            return cleanSystemAndReviewNoise(fullMarkdown.slice(idx));
          }

          // 3. 忽略空白符差异模糊定位
          const coreSnippet = selTrim.slice(0, Math.min(25, selTrim.length)).replace(/\s+/g, '');
          if (coreSnippet.length >= 4) {
            for (let i = 0; i < fullMarkdown.length - coreSnippet.length; i++) {
              const windowSub = fullMarkdown.slice(i, i + coreSnippet.length + 12).replace(/\s+/g, '');
              if (windowSub.startsWith(coreSnippet)) {
                const lineStart = fullMarkdown.lastIndexOf('\n', i);
                const cutIdx = lineStart !== -1 ? lineStart + 1 : i;
                return cleanSystemAndReviewNoise(fullMarkdown.slice(cutIdx));
              }
            }
          }

          // 4. 纯汉字/字母前缀定位 (过滤掉所有标点符号)
          const pureWords = selTrim.replace(/[\s\r\n`*#_~>|\-\[\]\(\):：。，、！？"']/g, '').slice(0, 10);
          if (pureWords.length >= 3) {
            for (let i = 0; i < fullMarkdown.length - pureWords.length; i++) {
              const windowSub = fullMarkdown.slice(i, i + 30).replace(/[\s\r\n`*#_~>|\-\[\]\(\):：。，、！？"']/g, '');
              if (windowSub.startsWith(pureWords)) {
                const lineStart = fullMarkdown.lastIndexOf('\n', i);
                const cutIdx = lineStart !== -1 ? lineStart + 1 : i;
                return cleanSystemAndReviewNoise(fullMarkdown.slice(cutIdx));
              }
            }
          }
        }

        // 5. 若有 tailMarkdown 则使用
        if (tailMarkdown && tailMarkdown.trim()) {
          return cleanSystemAndReviewNoise(tailMarkdown);
        }

        // 6. 从 DOM innerText 从选中位置截取到末尾，绝不只留下几个字
        if (aiTurn.turnEl?.innerText && selTrim) {
          const domText = cleanSystemAndReviewNoise(aiTurn.turnEl.innerText);
          const pos = domText.indexOf(selTrim.slice(0, 20));
          if (pos !== -1) {
            return cleanSystemAndReviewNoise(domText.slice(pos));
          }
        }

        // 7. 终极保底：返回整段完整回复，坚决杜绝只保留选中的几个字
        return fullMarkdown ? fullMarkdown : selTrim;
      }

      pinAiTurnFromSelection = function (aiTurn, selectedText, tailMarkdown = null) {
        if (!aiTurn || (!selectedText && !tailMarkdown)) return;

        // 从选中位置一直向后截取至整条回复末尾，彻底消除只截取选中几个字的 bug
        const extracted = cleanSystemAndReviewNoise(extractFromSelectionToEnd(aiTurn, selectedText, tailMarkdown));
        if (!extracted) return;

        const hash = computeHash(extracted);
        const title = extractSummaryTitle(extracted, 'AI Snippet');
        const anchorSnippet = (selectedText || extracted).trim().slice(0, 45).replace(/\s+/g, ' ');

        // 提取该选区在完整文本中的字符起始偏移位置，用于同一消息内部多个选区的精确先后排序
        const fullMarkdown = aiTurn.markdownText || aiTurn.turnEl?.innerText || '';
        let textOffset = 0;
        if (fullMarkdown && anchorSnippet) {
          const rawIdx = fullMarkdown.indexOf(anchorSnippet.slice(0, 20));
          if (rawIdx !== -1) textOffset = rawIdx;
        }

        // 提取消息所属步骤的绝对元数据（stepIndex / messageTimestamp / turnIndex）
        const { stepIndex, messageTimestamp } = extractStepMeta(aiTurn.turnEl || aiTurn.toolbar);
        const turnIndex = getElementTurnIndex(aiTurn.turnEl || aiTurn.toolbar);

        if (aiTurn.turnEl) aiTurn.turnEl.setAttribute('data-agy-summary-hash', hash);

        addPinItem({
          id: 'pin_' + Date.now(),
          hash,
          title,
          text: extracted,
          type: 'ai',
          anchorSnippet,
          turnIndex: turnIndex !== -1 ? turnIndex : null,
          stepIndex: typeof stepIndex === 'number' ? stepIndex : null,
          messageTimestamp: messageTimestamp || null,
          textOffset,
          timestamp: Date.now()
        }, aiTurn.turnEl);
        showNotification?.('📌 Pinned from selection');
      };

      // 11. 会话切换感知与零冗余心跳（0 毫秒即时响应）
      function handlePinConvoSwitch(forceConvoId = undefined) {
        const currentConvoId = forceConvoId !== undefined ? forceConvoId : getPinCurrentConvoId();
        if (currentConvoId !== lastConvoIdForPins) {
          lastConvoIdForPins = currentConvoId;
          currentActiveIndex = 0;
          lastRenderedPinSignature = '';

          const list = currentConvoId ? getPinnedList(currentConvoId) : [];
          renderPinnedIndicator(true);
          if (list.length === 0) {
            document.getElementById('agy-pip-modal')?.remove();
            document.getElementById('agy-pip-dock')?.remove();
          } else if (document.getElementById('agy-pip-modal')) {
            renderPipModal(list[0]);
          }
        }
      }

      onHeartbeatPinnedSummary = function () {
        const currentConvoId = getPinCurrentConvoId();
        if (currentConvoId !== lastConvoIdForPins) {
          handlePinConvoSwitch(currentConvoId);
        }
        // 平稳期绝不重复读写 localStorage 或轮询重绘，仅做轻量按钮同步
        syncAllPinButtons();
      };

      // 接入全局会话切换事件，实现 0ms 即时响应
      const prevConvoSwitchForPins = window.__AGY_ON_CONVO_SWITCH__;
      window.__AGY_ON_CONVO_SWITCH__ = function (switchedConvoId) {
        try { prevConvoSwitchForPins?.(switchedConvoId); } catch (e) {}
        try { handlePinConvoSwitch(switchedConvoId); } catch (e) {}
      };

      // 极速拦截侧边栏会话切换与新建对话点击（0ms 瞬间清空隐藏，消除 1-2 秒延迟）
      pinClickSwitchHandler = (e) => {
        const convoRow = e.target.closest('[data-testid="conversation-row-sidebar"]');
        const newChatBtn = e.target.closest('[data-testid="create-new-chat-button"], button[aria-label*="New chat" i], button[aria-label*="New" i], a[href="/"], a[href="/c/new"]');
        if (convoRow || newChatBtn) {
          const nextId = convoRow ? convoRow.getAttribute('data-cascade-id') : null;
          handlePinConvoSwitch(nextId);
          setTimeout(() => handlePinConvoSwitch(), 50);
          setTimeout(() => handlePinConvoSwitch(), 150);
        }
      };
      document.addEventListener('click', pinClickSwitchHandler, true);

      pinPopstateHandler = () => handlePinConvoSwitch();
      window.addEventListener('popstate', pinPopstateHandler, true);

      // 12. 初始化装载
      ensurePinnedSummaryStyles();
      lastConvoIdForPins = getPinCurrentConvoId();
      renderPinnedIndicator(true);
      syncAllPinButtons();
    }

    // ==================== 13. 历史会话默认折叠项目列表 (Conversation History Default Collapse) ====================
    function initHistoryProjectsCollapser() {
      if (!USER_CONFIG.ENABLE_COLLAPSE_HISTORY_PROJECTS) return null;

      let hasAutoCollapsedHistory = false;

      function isHistoryPage() {
        return window.location.pathname === '/history' || window.location.pathname.startsWith('/history/');
      }

      function checkAndCollapseHistoryProjects() {
        if (!USER_CONFIG.ENABLE_COLLAPSE_HISTORY_PROJECTS) return;

        if (!isHistoryPage()) {
          hasAutoCollapsedHistory = false;
          return;
        }

        if (hasAutoCollapsedHistory) return;

        // 仅定位 Conversation History 页面主列表容器，绝不触碰左侧边栏 Workspaces
        const list = document.querySelector('[data-testid="conversation-list-history"]');
        if (!list) return; // 历史会话列表尚未挂载到 DOM

        // 优先通过 React Fiber Props 进行全量极速折叠（兼容虚拟滚动未渲染在 DOM 中的项）
        const fKey = Object.keys(list).find(k => k.startsWith('__reactFiber$'));
        let fiber = list[fKey];
        while (fiber) {
          if (fiber.memoizedProps?.onToggleCollapseSection && fiber.memoizedProps?.items?.some(it => it.type === 'header')) {
            break;
          }
          fiber = fiber.return;
        }

        if (fiber?.memoizedProps?.onToggleCollapseSection) {
          const props = fiber.memoizedProps;
          const headers = props.items.filter(it => it.type === 'header');
          if (headers.length === 0) return; // 列表数据仍在加载中，等待下一次心跳或路由回调

          const uncollapsed = headers.filter(it => !it.isCollapsed);
          if (uncollapsed.length > 0) {
            uncollapsed.forEach(h => {
              try {
                const sectionId = h.id.startsWith('header-') ? h.id.slice(7) : h.id;
                props.onToggleCollapseSection(sectionId);
              } catch (_) {}
            });
          }
          hasAutoCollapsedHistory = true;
          return;
        }

        // DOM 兜底：点击 conversation-list-history 内部所有展开的文件夹头部
        const openHeaders = Array.from(list.querySelectorAll('.cursor-pointer')).filter(el => {
          const svgPath = el.querySelector('svg path')?.getAttribute('d') || '';
          return svgPath.includes('552') || svgPath.includes('536'); // 打开状态的文件夹图标
        });

        if (openHeaders.length > 0) {
          openHeaders.forEach(h => {
            try { h.click(); } catch (_) {}
          });
          hasAutoCollapsedHistory = true;
        }
      }

      // 监听侧边栏/导航链接点击，当用户重新点击进入 Conversation History 时重置标志
      historyLinkClickHandler = (e) => {
        if (!USER_CONFIG.ENABLE_COLLAPSE_HISTORY_PROJECTS) return;
        const link = e.target.closest?.('a[href="/history"], a[href^="/history/"], button[data-testid="conversation-history-btn"]');
        if (link) {
          hasAutoCollapsedHistory = false;
          setTimeout(checkAndCollapseHistoryProjects, 100);
          setTimeout(checkAndCollapseHistoryProjects, 350);
          setTimeout(checkAndCollapseHistoryProjects, 700);
        }
      };
      document.addEventListener('click', historyLinkClickHandler, true);

      historyPopstateHandler = () => {
        if (!USER_CONFIG.ENABLE_COLLAPSE_HISTORY_PROJECTS) return;
        if (!isHistoryPage()) {
          hasAutoCollapsedHistory = false;
        } else {
          setTimeout(checkAndCollapseHistoryProjects, 100);
          setTimeout(checkAndCollapseHistoryProjects, 350);
          setTimeout(checkAndCollapseHistoryProjects, 700);
        }
      };
      window.addEventListener('popstate', historyPopstateHandler, true);

      // 初次挂载检查
      checkAndCollapseHistoryProjects();

      return checkAndCollapseHistoryProjects;
    }

    if (USER_CONFIG.ENABLE_PROJECT_ARCHIVER !== false) initProjectArchiver();
    if (USER_CONFIG.ENABLE_CONTEXT_MENU !== false) initContextMenuSupport();
    if (USER_CONFIG.ENABLE_SCROLL_POSITION_PERSISTENCE !== false) initConversationScrollPersistence();
    if (USER_CONFIG.ENABLE_SMART_UNREAD !== false) initSmartUnreadTracker();
    if (USER_CONFIG.ENABLE_CONTEXT_MENU !== false && USER_CONFIG.ENABLE_BLOCK_QUOTE_POPUP !== false) initQuotePopupInterceptor();
    if (USER_CONFIG.ENABLE_BLOCK_CHAT_BOTTOM_BUTTON !== false) initBlockChatBottomButton();
    if (USER_CONFIG.ENABLE_WORKTREE_MANAGEMENT !== false) initWorktreeManagement();
    if (USER_CONFIG.ENABLE_PINNED_SUMMARY !== false) initPinnedSummarySystem();
    if (USER_CONFIG.ENABLE_COLLAPSE_HISTORY_PROJECTS) {
      onHeartbeatHistoryProjectsCollapser = initHistoryProjectsCollapser();
    }

    // ==================== 14. 全局统一后台心跳调度器 (Unified Heartbeat Dispatcher) ====================
    let heartbeatTickCount = 0;
    function heartbeatDispatcher() {
      // 1. 全局打字休眠保护：用户按键输入文字的 350ms 内，整轮后台轮询全部静默避让
      if (isUserTyping()) return;

      heartbeatTickCount++;

      // 2. 模块独立调度（完全由用户配置开关独立控制，便于随时动态启闭与解耦）
      // 模块 1：会话滚动位置切换与恢复兜底（每 1000ms）
      if (USER_CONFIG.ENABLE_SCROLL_POSITION_PERSISTENCE && onHeartbeatScrollPersistence) {
        onHeartbeatScrollPersistence();
      }

      // 模块 2：智能已读/未读状态追踪与侧边栏红点同步（每 1000ms）
      if (USER_CONFIG.ENABLE_SMART_UNREAD && onHeartbeatSmartUnread) {
        onHeartbeatSmartUnread();
      }

      // 模块 3：项目折叠归档面板与快捷按钮保活（每 2000ms 即每 2 次心跳）
      if (heartbeatTickCount % 2 === 0 && onHeartbeatProjectArchiver) {
        onHeartbeatProjectArchiver();
      }

      // 模块 4：工作树与分支下拉框增强保活（每 1000ms）
      if (onHeartbeatWorktreeManagement) {
        onHeartbeatWorktreeManagement();
      }

      // 模块 5：AI 总结钉选与画中画悬浮窗巡检（每 1000ms）
      if (USER_CONFIG.ENABLE_PINNED_SUMMARY && onHeartbeatPinnedSummary) {
        onHeartbeatPinnedSummary();
      }

      // 模块 6：历史会话默认折叠项目列表（每 1000ms）
      if (USER_CONFIG.ENABLE_COLLAPSE_HISTORY_PROJECTS && onHeartbeatHistoryProjectsCollapser) {
        onHeartbeatHistoryProjectsCollapser();
      }
    }

    addInterval(heartbeatDispatcher, 1000);

    console.log('[agy-enhancer] Page navigator, project archiver, context menu, scroll memory, unread tracker, quote interceptor, history collapser, and worktree manager ready!');
  }

  bootstrap();
})();
