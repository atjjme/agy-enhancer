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

    document.getElementById('agy-read-styles')?.remove();
    document.getElementById('agy-page-nav-group')?.remove();
    document.getElementById('agy-scroll-bottom-btn')?.remove();
    document.getElementById('agy-read-toast')?.remove();
    document.getElementById('agy-archive-header-btn')?.remove();
    document.getElementById('agy-archive-panel')?.remove();
    document.querySelectorAll('.agy-quick-archive-btn').forEach(el => el.remove());
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
        align-items: center;
        justify-content: space-between;
        padding: 6px 8px;
        border-radius: 6px;
        background: transparent;
        transition: background 0.15s ease;
      }
      .agy-archive-item:hover {
        background: var(--secondary, rgba(125, 125, 125, 0.1));
      }
      .agy-archive-item-main {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
        cursor: pointer;
      }
      .agy-archive-name {
        font-size: 13px;
        color: var(--foreground, #ffffff);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .agy-restore-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        border-radius: 4px;
        border: 1px solid var(--border, rgba(125, 125, 125, 0.2));
        background: var(--secondary, rgba(125, 125, 125, 0.1));
        color: var(--muted-foreground, inherit);
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        flex-shrink: 0;
      }
      .agy-restore-btn:hover {
        background: var(--secondary, rgba(125, 125, 125, 0.2));
        color: var(--foreground, #ffffff);
        border-color: var(--border, rgba(125, 125, 125, 0.4));
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
      toast.title = 'Antigravity 阅读增强器已就绪';
      toast.innerHTML = `
        <div class="dot"></div>
        <span class="toast-text">Antigravity 增强器生效中</span>
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

      let isPanelOpen = false;

      function renderArchivePanel(pm) {
        let panel = document.getElementById('agy-archive-panel');
        if (!isPanelOpen) {
          if (panel) panel.remove();
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
          
          // 适配侧边栏实际宽度，预留边距
          const panelWidth = Math.min(264, Math.max(220, hRect.width - 12));
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
            ` : archived.map(item => `
              <div class="agy-archive-item" data-project-id="${item.project.id}">
                <div class="agy-archive-item-main" title="Click to restore and open [${item.project.name}]">
                  <svg width="15" height="15" viewBox="0 -960 960 960" fill="currentColor" style="opacity: 0.7; flex-shrink: 0;"><path d="M172.31-180Q142-180 121-201t-21-51.31V-707.69Q100-738 121-759t51.31-21H391.92l80 80H787.69Q818-700 839-679t21 51.31v375.38Q860-222 839-201t-51.31 21H172.31Zm0-60H787.69q5.39 0 8.85-3.46t3.46-8.85V-627.69q0-5.39-3.46-8.85T787.69-640H447.38l-80-80H172.31q-5.39 0-8.85 3.46T160-707.69v455.38q0 5.39 3.46 8.85t8.85 3.46ZM160-240q0 0 0-3.46t0-8.85V-707.69q0-5.39 0-8.85t0-3.46v80q0 0 0 3.46t0 8.85v375.38q0 5.39 0 8.85t0 3.46Z"/></svg>
                  <span class="agy-archive-name">${item.project.name}</span>
                </div>
                <button class="agy-restore-btn" data-restore-id="${item.project.id}" title="Restore to Projects list">
                  <svg width="12" height="12" viewBox="0 -960 960 960" fill="currentColor"><path d="M440-160v-327L336-383l-56-57 200-200 200 200-56 57-104-104v327h-80ZM160-600v-120q0-33 23.5-56.5T240-800h480q33 0 56.5 23.5T800-720v120h-80v-120H240v120h-80Z"/></svg>
                  Restore
                </button>
              </div>
            `).join('')}
          </div>
        `;

        panel.querySelector('.agy-archive-close')?.addEventListener('click', (e) => {
          e.stopPropagation();
          isPanelOpen = false;
          renderArchivePanel(pm);
        });

        // 绑定还原按钮
        panel.querySelectorAll('.agy-restore-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-restore-id');
            const p = archived.find(x => x.project.id === id);
            if (p && pm?.updateProject) {
              btn.textContent = 'Restoring...';
              await pm.updateProject({ ...p.project, archived: false });
              showNotification(`Project [${p.project.name}] restored`);
              renderArchivePanel(pm);
              updateArchiveUI();
            }
          });
        });

        // 点击项目直接还原并跳转打开
        panel.querySelectorAll('.agy-archive-item-main').forEach(itemMain => {
          itemMain.addEventListener('click', async (e) => {
            e.stopPropagation();
            const parent = itemMain.closest('.agy-archive-item');
            const id = parent?.getAttribute('data-project-id');
            const p = archived.find(x => x.project.id === id);
            if (p && pm?.updateProject) {
              await pm.updateProject({ ...p.project, archived: false });
              isPanelOpen = false;
              renderArchivePanel(pm);
              showNotification(`Restored and opened [${p.project.name}]`);
              window.location.href = `/?section=${encodeURIComponent(id)}`;
            }
          });
        });
      }

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

        // 3. 检查当前 URL 激活的项目：如果当前正在该项目，自动解归档
        const urlParams = new URLSearchParams(window.location.search);
        const currentSectionId = urlParams.get('section');
        if (currentSectionId) {
          const activeProject = archived.find(p => p.project.id === currentSectionId);
          if (activeProject) {
            pm.updateProject({ ...activeProject.project, archived: false }).then(() => {
              showNotification(`Active session detected: [${activeProject.project.name}] restored`);
              updateArchiveUI();
            });
          }
        }
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
    }

    initProjectArchiver();

    console.log('[agy-read] 纸张翻页器与项目折叠归档已就绪！');
  }

  bootstrap();
})();
