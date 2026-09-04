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

  // 清理旧实例
  const oldStyles = document.getElementById('agy-read-styles');
  if (oldStyles) oldStyles.remove();
  const oldNav = document.getElementById('agy-page-nav-group');
  if (oldNav) oldNav.remove();
  const oldBtn = document.getElementById('agy-scroll-bottom-btn');
  if (oldBtn) oldBtn.remove();
  const oldToast = document.getElementById('agy-read-toast');
  if (oldToast) oldToast.remove();

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
    `;
    document.head.appendChild(styleEl);

    // ==================== 2. 创建右上角生效通知 Toast ====================
    function createToast() {
      let toast = document.getElementById('agy-read-toast');
      if (toast) toast.remove();

      toast = document.createElement('div');
      toast.id = 'agy-read-toast';
      toast.title = 'Antigravity 阅读翻页器已就绪';
      toast.innerHTML = `
        <div class="dot"></div>
        <span class="toast-text">Antigravity 翻页器生效中</span>
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

    console.log('[agy-read] 纸张翻页器已在右侧就绪！');
  }

  bootstrap();
})();
