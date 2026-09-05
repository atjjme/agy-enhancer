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
window.__AGY_BRANCH_NAME__ = "starlit_nova_spins_09h29";
/**
 * Antigravity 阅读增强器 (agy-read enhancer)
 * 
 * 核心特性：
 * 1. 【纸张式翻页导航】右侧滚动条旁常驻「向上 / 向下」双按钮：
 *    - 点向上：如果在纸内，回到当前问答的【页头】（提问顶部）；如果在页头附近，翻到【上一页】（上一轮问答）；
 *    - 点向下：如果在纸内，直达当前问答的【页脚】（回答末尾）；如果在页脚附近，翻到【下一页】（下一轮问答或最新底部）；
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
  let activeNativeConvoId = null;
  let nativeMenuPointerDownHandler = null;
  let nativeMenuObserver = null;

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
    if (nativeMenuPointerDownHandler) {
      document.removeEventListener('pointerdown', nativeMenuPointerDownHandler, true);
      nativeMenuPointerDownHandler = null;
    }
    if (nativeMenuObserver) {
      nativeMenuObserver.disconnect();
      nativeMenuObserver = null;
    }

    document.getElementById('agy-read-styles')?.remove();
    document.getElementById('agy-page-nav-group')?.remove();
    document.getElementById('agy-scroll-bottom-btn')?.remove();
    document.getElementById('agy-read-toast')?.remove();
    document.getElementById('agy-archive-header-btn')?.remove();
    document.getElementById('agy-archive-panel')?.remove();
    document.getElementById('agy-project-options-dropdown')?.remove();
    document.getElementById('agy-convo-options-dropdown')?.remove();
    document.querySelectorAll('.agy-quick-archive-btn').forEach(el => el.remove());
    document.querySelectorAll('.agy-native-enhanced').forEach(el => el.remove());
  };

  // 执行一次初始状态与残留清理
  window.__AGY_ENHANCER_CLEANUP__();

  // ==================== 核心自启动守护程序 ====================
  function bootstrap() {
    if (!document || !document.head || !document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
      } else {
        setTimeout(bootstrap, 30);
      }
      return;
    }

    console.log('[agy-read] 初始化纸张式阅读翻页器...');
    initEnhancer();
  }

  function initEnhancer() {
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
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        border-radius: 9999px;
        background: rgba(24, 24, 27, 0.9);
        color: #f4f4f5;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
        border-radius: 7px;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.1);
        padding: 4px;
        min-width: 155px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        animation: agyFadeIn 0.12s ease-out;
        z-index: 9999999;
      }
      .agy-dd-divider {
        height: 1px;
        background: var(--border, rgba(125, 125, 125, 0.18));
        margin: 3px 2px;
      }
      .agy-dd-item {
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 5px;
        font-size: 12px;
        cursor: pointer;
        user-select: none;
        color: var(--foreground, #101010);
        transition: background 0.15s ease, color 0.15s ease;
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
    `;
    document.head.appendChild(styleEl);

    // ==================== 2. 创建右上角生效通知 Toast ====================
    let showNotification = (msg) => {};

    function createToast() {
      let toast = document.getElementById('agy-read-toast');
      if (toast) toast.remove();

      toast = document.createElement('div');
      toast.id = 'agy-read-toast';
      const branchTag = window.__AGY_BRANCH_TAG__ || '';
      toast.title = `Antigravity 阅读增强器已就绪${branchTag}`;
      toast.innerHTML = `
        <div class="dot"></div>
        <span class="toast-text">Antigravity 增强器生效中${branchTag}</span>
      `;

      document.body.appendChild(toast);

      requestAnimationFrame(() => {
        setTimeout(() => toast.classList.add('show'), 80);
      });

      let collapseTimer = setTimeout(() => {
        toast.classList.add('collapsed');
      }, USER_CONFIG.TOAST_EXPAND_DURATION_MS);

      toast.addEventListener('click', () => {
        clearTimeout(collapseTimer);
        toast.classList.toggle('collapsed');
      });

      showNotification = (msg) => {
        const textSpan = toast.querySelector('.toast-text');
        if (textSpan) textSpan.textContent = msg;
        toast.classList.remove('collapsed');
        toast.classList.add('show');
        clearTimeout(collapseTimer);
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
        const height = el.offsetHeight;
        // 页头：该问答开始提问的位置（预留 8px 视口呼吸边距）
        const headScrollTop = Math.max(0, top - 8);
        // 页脚：该问答回复末尾的最佳舒适视口位置
        const footScrollTop = Math.max(headScrollTop, top + height - containerHeight + 20);

        return {
          index: idx,
          element: el,
          top,
          height,
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
      downBtn.title = '向下：直达本问答页脚 / 翻到下一页';
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

      function openLocalFolder(uriOrPath) {
        if (!uriOrPath) return false;
        let uri = uriOrPath;
        if (/^[a-zA-Z]:[\\/]/.test(uri)) {
          uri = 'file:///' + uri.replace(/\\/g, '/');
        } else if (uri.startsWith('file://')) {
          try {
            uri = decodeURI(uri);
          } catch (e) {}
        }

        if (window.electronNative?.openExternal) {
          try {
            window.electronNative.openExternal(uri);
            return true;
          } catch (e) {
            console.warn('[agy-read] openExternal error:', e);
          }
        }

        if (window.electronNative?.revealInFilePicker) {
          try {
            window.electronNative.revealInFilePicker(uri);
            return true;
          } catch (e) {
            console.warn('[agy-read] revealInFilePicker error:', e);
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

        return {
          convoId,
          convoBrainUri,
          isBranch,
          branchUri,
          projectRootUri,
          targetProjectUri,
          isOutsideOfProject: pId === 'outside-of-project' || (!targetProjectUri && !isBranch)
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

            const rect = btn.getBoundingClientRect();
            dd.style.position = 'fixed';
            dd.style.top = `${rect.bottom + 4}px`;

            // 右对齐到按钮右侧边缘，宽度约 160px，并确保不超出窗口可视区
            const menuWidth = 160;
            let leftPos = rect.right - menuWidth;
            if (leftPos < 10) leftPos = 10;
            if (leftPos + menuWidth > window.innerWidth - 10) leftPos = window.innerWidth - menuWidth - 10;
            dd.style.left = `${leftPos}px`;
            dd.style.zIndex = '9999999';

            dd.innerHTML = `
              <div class="agy-dd-item copy-name">
                <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
                <span>Copy Project Name</span>
              </div>
              <div class="agy-dd-item settings">
                <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-1 13.5l103 78-110 190-119-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm40-220q42 0 71-29t29-71q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29Z"/></svg>
                <span>Project Settings</span>
              </div>
              <div class="agy-dd-divider"></div>
              <div class="agy-dd-item restore">
                <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M440-160v-327L336-383l-56-57 200-200 200 200-56 57-104-104v327h-80ZM160-600v-120q0-33 23.5-56.5T240-800h480q33 0 56.5 23.5T800-720v120h-80v-120H240v120h-80Z"/></svg>
                <span>Restore</span>
              </div>
              <div class="agy-dd-item new-chat">
                <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
                <span>New Conversation</span>
              </div>
              <div class="agy-dd-divider"></div>
              <div class="agy-dd-item delete" style="color: #ef4444;">
                <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
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

            const rect = btn.getBoundingClientRect();
            dd.style.position = 'fixed';
            dd.style.top = `${rect.bottom + 4}px`;

            const menuWidth = 195;
            let leftPos = rect.right - menuWidth;
            if (leftPos < 10) leftPos = 10;
            if (leftPos + menuWidth > window.innerWidth - 10) leftPos = window.innerWidth - menuWidth - 10;
            dd.style.left = `${leftPos}px`;
            dd.style.zIndex = '9999999';

            dd.innerHTML = `
              <div class="agy-dd-item convo-rename">
                <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                <span>Rename</span>
              </div>
              <div class="agy-dd-item convo-unread">
                <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M200-120v-680h360l16 80h224v400H520l-16-80H280v280h-80Zm300-440Zm86 160h134v-240H510l-16-80H280v240h290l16 80Z"/></svg>
                <span>${c.markedAsUnread ? 'Mark as Read' : 'Mark Unread'}</span>
              </div>
              <div class="agy-dd-item convo-delete" style="color: #ef4444;">
                <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                <span>Delete</span>
              </div>
              <div class="agy-dd-divider"></div>
              <div class="agy-dd-item copy-convo-name">
                <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
                <span>Copy Conversation Name</span>
              </div>
              <div class="agy-dd-item copy-convo-id">
                <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
                <span>Copy Conversation ID</span>
              </div>
              <div class="agy-dd-item copy-project-name">
                <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>
                <span>Copy Project Name</span>
              </div>
              <div class="agy-dd-divider"></div>
              <div class="agy-dd-item open-convo-folder">
                <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>
                <span>Open Conversation Folder</span>
              </div>
              <div class="agy-dd-item open-project-folder">
                <svg width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>
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
              showNotification(newUnread ? 'Marked as unread' : 'Marked as read');
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
                openLocalFolder(paths.convoBrainUri);
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
              if (paths?.isOutsideOfProject) {
                showNotification('Conversation is outside of any project');
                return;
              }
              if (paths?.targetProjectUri) {
                openLocalFolder(paths.targetProjectUri);
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
            <svg width="15" height="15" viewBox="0 -960 960 960" fill="currentColor" class="text-secondary-foreground shrink-0"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>
            <span>Open Conversation Folder</span>
          `;
          itemConvo.addEventListener('click', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            if (paths?.convoBrainUri) {
              openLocalFolder(paths.convoBrainUri);
              showNotification('Opened conversation folder');
            } else {
              showNotification('Failed to resolve conversation folder');
            }
          });

          const itemProject = document.createElement('div');
          itemProject.setAttribute('role', 'menuitem');
          itemProject.className = 'w-full px-2 py-1 text-left text-[13px] cursor-pointer outline-none transition-colors select-none flex items-center gap-1.5 rounded-md hover:bg-secondary hover:text-foreground text-secondary-foreground agy-native-enhanced';
          itemProject.innerHTML = `
            <svg width="15" height="15" viewBox="0 -960 960 960" fill="currentColor" class="text-secondary-foreground shrink-0"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>
            <span>Open Project Folder</span>
          `;
          itemProject.addEventListener('click', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            if (paths?.isOutsideOfProject) {
              showNotification('Conversation is outside of any project');
              return;
            }
            if (paths?.targetProjectUri) {
              openLocalFolder(paths.targetProjectUri);
              showNotification(paths.isBranch ? 'Opened branch folder' : 'Opened project folder');
            } else {
              showNotification('Failed to resolve project folder');
            }
          });

          menu.appendChild(divider);
          menu.appendChild(itemConvo);
          menu.appendChild(itemProject);
        }

        nativeMenuObserver = new MutationObserver(() => {
          checkAndEnhanceNativeMenu();
        });
        nativeMenuObserver.observe(document.body, { childList: true, subtree: true });
      }

      initNativeConvoMenuEnhancer();
    }

    initProjectArchiver();

    console.log('[agy-read] 纸张翻页器与项目折叠归档已就绪！');
  }

  bootstrap();
})();
