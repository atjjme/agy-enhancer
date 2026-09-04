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
 * 1. 【右上角状态提示】窗口右上角提示“Antigravity 增强器生效中”，3.5秒后自动优雅收折为悬浮小徽标。
 * 2. 【智能视口控制】思考过程中正常向下滚动显示进展；思考完成输出内容时，自动平滑回滚到本轮问题的顶端，并锁定视口供安心阅读。
 * 3. 【向下直达按钮】在底部输入框上方居中悬浮“向下”按钮，离开底部时平滑浮现，点击平滑直达最新底部。
 */

(function () {
  'use strict';

// ==================== 0. 用户自定义配置区 ====================
  const USER_CONFIG = {
    // 向下按钮在输入框上方的间距（单位：像素）
    // 数值越大，按钮距离输入框越远（位置越靠上）。比如：26（默认）、45、60
    BUTTON_OFFSET_ABOVE_INPUT: 26,

    // 兜底模式下的距离底部高度（当未能检测到输入框卡片时生效）
    FALLBACK_BOTTOM_DISTANCE: 120,

    // 向上滑动多少像素后显示向下按钮（默认 60px）
    SHOW_BUTTON_SCROLL_THRESHOLD: 60,

    // 右上角提示显示时长后收缩（毫秒，默认 3500ms 即 3.5 秒）
    TOAST_EXPAND_DURATION_MS: 3500,
  };

  // 避免多实例重复注入
  if (window.__AGY_ENHANCER_INSTANCE__) {
    console.log('[agy-read] 增强器已在运行中。');
    return;
  }
  window.__AGY_ENHANCER_INSTANCE__ = true;

  console.log('[agy-read] 正在启动 Antigravity 阅读增强器...');

  // ==================== 1. 注入专用样式 ====================
  const existingStyle = document.getElementById('agy-read-styles');
  if (existingStyle) existingStyle.remove();

  const styleEl = document.createElement('style');
  styleEl.id = 'agy-read-styles';
  styleEl.textContent = `
    /* 右上角生效提示 Toast */
    #agy-read-toast {
      position: fixed;
      top: 14px;
      right: 140px; /* 避开系统右上角最小化/关闭按钮区域 */
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

    /* 输入框上方向下直达按钮 */
    #agy-scroll-bottom-btn {
      position: fixed;
      z-index: 999990;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(30, 30, 38, 0.92);
      color: #e4e4e7;
      border: 1px solid rgba(255, 255, 255, 0.18);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transform: translate(-50%, 8px) scale(0.88);
      transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                  background-color 0.2s ease,
                  box-shadow 0.2s ease;
      outline: none;
    }
    #agy-scroll-bottom-btn.visible {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, 0) scale(1);
    }
    #agy-scroll-bottom-btn:hover {
      background: rgba(48, 48, 60, 0.98);
      transform: translate(-50%, -3px) scale(1.08);
      box-shadow: 0 8px 26px rgba(0, 0, 0, 0.45);
      color: #ffffff;
    }
    #agy-scroll-bottom-btn:active {
      transform: translate(-50%, 1px) scale(0.96);
    }
    #agy-scroll-bottom-btn svg {
      width: 20px;
      height: 20px;
      transition: transform 0.2s ease;
    }
    #agy-scroll-bottom-btn:hover svg {
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
      #agy-scroll-bottom-btn {
        background: rgba(255, 255, 255, 0.94);
        color: #18181b;
        border: 1px solid rgba(0, 0, 0, 0.12);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
      }
      #agy-scroll-bottom-btn:hover {
        background: rgba(245, 245, 247, 1);
        color: #000000;
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
    toast.title = 'Antigravity 阅读增强器运行中（点击展开/折叠）';
    toast.innerHTML = `
      <div class="dot"></div>
      <span class="toast-text">Antigravity 增强器生效中</span>
    `;

    document.body.appendChild(toast);

    // 渐显入场
    requestAnimationFrame(() => {
      setTimeout(() => toast.classList.add('show'), 80);
    });

    // 3.5秒后自动收折为紧凑小圆徽章
    let collapseTimer = setTimeout(() => {
      toast.classList.add('collapsed');
    }, 3500);

    toast.addEventListener('click', () => {
      clearTimeout(collapseTimer);
      toast.classList.toggle('collapsed');
    });

    return toast;
  }

  createToast();

  // ==================== 3. 创建输入框上方“向下直达”按钮 ====================
  function createScrollBottomButton() {
    let btn = document.getElementById('agy-scroll-bottom-btn');
    if (btn) btn.remove();

    btn = document.createElement('button');
    btn.id = 'agy-scroll-bottom-btn';
    btn.type = 'button';
    btn.title = '滚动到最新底部';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;

    const handleScrollClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      scrollToBottomSmooth();
    };

    btn.addEventListener('click', handleScrollClick);
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());

    document.body.appendChild(btn);
    return btn;
  }

  const scrollBottomBtn = createScrollBottomButton();

  // ==================== 4. DOM 容器与元素探测器 ====================

  /**
   * 获取主聊天消息滚动容器
   */
  function getChatScrollContainer() {
    // 优先匹配主聊天区域带有 md-table-bleed 或 scrollbar-hide 的滚动容器
    const candidate = document.querySelector('.scrollbar-hide.md-table-bleed') ||
                      document.querySelector('.overflow-y-auto.md-table-bleed');
    if (candidate && candidate.clientHeight > 200) {
      return candidate;
    }

    // 备用方案：寻找包含最新消息回合的父滚动容器
    const turnContainer = document.querySelector('.relative.flex.flex-col.gap-y-3') ||
                          document.querySelector('.flex.flex-col.gap-y-3');
    if (turnContainer) {
      let p = turnContainer.parentElement;
      while (p && p !== document.body) {
        const style = window.getComputedStyle(p);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && p.clientHeight > 200) {
          return p;
        }
        p = p.parentElement;
      }
    }

    // 兜底方案
    const scrollables = Array.from(document.querySelectorAll('*')).filter(el => {
      if (el.clientHeight < 300) return false;
      const s = window.getComputedStyle(el);
      return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
    });

    return scrollables.find(el => el.querySelector('.flex-col.gap-y-3')) || scrollables[0] || null;
  }

  /**
   * 获取当前视口底部可见的输入框卡片，用于精确居中对齐“向下按钮”
   */
  function getInputBoxRect() {
    const windowH = window.innerHeight;
    const cards = Array.from(document.querySelectorAll('.bg-card, form, .cursor-text'));
    for (const el of cards) {
      const card = el.closest('.bg-card') || el;
      const rect = card.getBoundingClientRect();
      // 必须位于当前窗口下半部分且宽度大于 300px
      if (rect.top > windowH - 260 && rect.bottom <= windowH + 40 && rect.width > 300) {
        return rect;
      }
    }

    // 兜底：直接找 textarea 或 .cursor-text
    const textEl = document.querySelector('.cursor-text') || document.querySelector('textarea');
    if (textEl) {
      const rect = textEl.getBoundingClientRect();
      if (rect.top > windowH - 260 && rect.width > 250) {
        return rect;
      }
    }
    return null;
  }

  /**
   * 平滑直达底部
   */
  function scrollToBottomSmooth() {
    const container = getChatScrollContainer();
    if (!container) return;

    // 解除阅读视口锁定
    isReadingLocked = false;

    try {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    } catch (e) {
      container.scrollTop = container.scrollHeight;
    }

    // 双重保障：短暂延迟后确保触底并隐藏按钮
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
      updateScrollButton();
    }, 200);
  }

  // ==================== 5. 按钮位置与显隐更新 ====================

  function updateScrollButton() {
    const container = getChatScrollContainer();
    if (!container || !scrollBottomBtn) return;

    // 1. 距离底部超过阈值则浮现按钮，否则淡出隐藏
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isFarFromBottom = distanceFromBottom > USER_CONFIG.SHOW_BUTTON_SCROLL_THRESHOLD;

    if (isFarFromBottom) {
      scrollBottomBtn.classList.add('visible');
    } else {
      scrollBottomBtn.classList.remove('visible');
    }

    // 2. 精确计算居中位置：位于输入框正上方
    const inputRect = getInputBoxRect();
    if (inputRect && inputRect.width > 0 && inputRect.top > 0) {
      const centerX = inputRect.left + inputRect.width / 2;
      const targetY = inputRect.top - USER_CONFIG.BUTTON_OFFSET_ABOVE_INPUT;
      scrollBottomBtn.style.left = `${centerX}px`;
      scrollBottomBtn.style.top = `${targetY}px`;
      scrollBottomBtn.style.bottom = 'auto';
    } else {
      // 兜底居中定位
      scrollBottomBtn.style.left = '50%';
      scrollBottomBtn.style.bottom = `${USER_CONFIG.FALLBACK_BOTTOM_DISTANCE}px`;
      scrollBottomBtn.style.top = 'auto';
    }
  }

  window.addEventListener('resize', updateScrollButton, { passive: true });
  setInterval(updateScrollButton, 300);

  // ==================== 6. 思考完成自动回顶阅读逻辑 ====================

  let isReadingLocked = false;
  let turnStateMap = new WeakMap();
  let completedTurns = new WeakSet();

  function checkThinkingAndScroll() {
    const container = getChatScrollContainer();
    if (!container) return;

    // 找到所有消息回合 Turn
    const turnContainer = document.querySelector('.relative.flex.flex-col.gap-y-3') ||
                          document.querySelector('.flex.flex-col.gap-y-3');
    if (!turnContainer || turnContainer.children.length === 0) return;

    const turns = Array.from(turnContainer.children);
    const latestTurn = turns[turns.length - 1];
    if (!latestTurn) return;

    // 寻找思考按钮或状态元素
    const thinkingBtn = latestTurn.querySelector('[data-testid="thinking-collapsible-trigger"]') ||
                        latestTurn.querySelector('button[aria-label*="Thinking"], button[aria-label*="thought"]');

    if (!thinkingBtn) return;

    const btnText = (thinkingBtn.innerText || '').trim();
    // 思考中标识：文本包含 Thinking，且无耗时 "Thought for"，或具有 loading 动画
    const isThinkingActive = (btnText.toLowerCase().includes('thinking') && !btnText.toLowerCase().includes('thought for')) ||
                             btnText.includes('思考中') ||
                             !!thinkingBtn.querySelector('.animate-spin, svg.animate-spin');

    // 思考完成标识：包含 "Thought for" 或耗时秒数，且不再处于 active 动画
    const isThoughtFinished = (btnText.toLowerCase().includes('thought for') ||
                              btnText.includes('秒') ||
                              (btnText.toLowerCase().includes('thought') && /\d+s/.test(btnText))) && !isThinkingActive;

    const lastState = turnStateMap.get(latestTurn);

    // 状态变迁：从【思考中】跃迁至【思考完成】
    if (lastState === 'thinking' && isThoughtFinished) {
      if (!completedTurns.has(latestTurn)) {
        completedTurns.add(latestTurn);
        console.log('[agy-read] 思考任务完成，正在平滑回滚至问题与回答顶端...');

        setTimeout(() => {
          latestTurn.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          // 开启阅读保护，防止流式输出强拉视口
          isReadingLocked = true;
        }, 120);
      }
    }

    // 记录最新状态
    if (isThinkingActive) {
      turnStateMap.set(latestTurn, 'thinking');
      // 思考进行中：正常滚动展示进度
      isReadingLocked = false;
    } else if (isThoughtFinished) {
      turnStateMap.set(latestTurn, 'finished');
    }
  }

  // ==================== 7. 滚动与 DOM 监听绑定 ====================

  function bindScrollContainer() {
    const container = getChatScrollContainer();
    if (!container || container.__agy_enhancer_bound__) return;

    container.__agy_enhancer_bound__ = true;
    container.addEventListener('scroll', () => {
      updateScrollButton();

      // 用户若主动向下滑动到底部（< 40px），解除锁定
      const dist = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (dist < 40) {
        isReadingLocked = false;
      }
    }, { passive: true });
  }

  const observer = new MutationObserver(() => {
    bindScrollContainer();
    updateScrollButton();
    checkThinkingAndScroll();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  bindScrollContainer();
  updateScrollButton();

  console.log('[agy-read] Antigravity 阅读增强器已就绪！');
})();
