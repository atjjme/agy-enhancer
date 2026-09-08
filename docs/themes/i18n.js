/**
 * Antigravity Enhancer - Ultra-lightweight i18n Engine
 * Supports English (en), Simplified Chinese (zh-CN), Traditional Chinese (zh-TW)
 * Confidence Auto-detect system language with manual override support.
 */

const I18N_DICT = {
  'en': {
    // Top Bar & Meta
    'app_title': 'Antigravity Enhancer - Settings',
    'brand_title': 'Antigravity Enhancer',
    'brand_subtitle': 'Visual management for injection modules and background daemon. Switches reflect local configuration with real-time hot-reloading.',
    'brand_tag_bento': 'Vision Bento',
    'brand_tag_hud': 'Tactical Deck',
    'brand_tag_gallery': 'Collector Edition',
    'brand_tag_spatial': 'Spatial Deck',
    'brand_tag_arcade': 'Arcade Edition',
    'brand_tag_classic': 'Classic Edition',

    // Connection Status
    'conn_connecting': 'Connecting to daemon...',
    'conn_online': 'Daemon Ready (Live Sync)',
    'conn_offline': 'Daemon Offline (Run install.bat)',
    'conn_reconnected': '✨ Daemon link restored, config synced',

    // Offline Banner
    'offline_welcome': 'Welcome! Setting up Enhancer',
    'offline_notice': 'Due to browser security policies, please double-click install.bat in the root folder to start the daemon service.',
    'offline_btn_retry': 'Check Service',

    // Master Hero Switch
    'master_title': 'Global Master Switch',
    'master_active_tag': '● RUNNING ACTIVE',
    'master_active_desc': 'All background enhancements are fully active, providing millisecond-level responsiveness.',
    'master_dormant_tag': '○ SYSTEM SLEEPING',
    'master_dormant_desc': 'Master switch is OFF. No event hooks are attached to the client, 100% native pure state.',
    'master_dormant_banner': '— Master power cut off; all functions are sleeping —',

    // Section 1: System Services
    'sec_system_title': 'System & Background Services',
    'sec_system_tag': 'HOST_SYSTEM',
    'sw_autostart_title': 'Windows Silent Autostart',
    'sw_autostart_desc': 'Automatically manages silent startup shortcuts in Windows Startup directory to run upon boot.',

    // Section 2: Visual & Interaction Suite
    'sec_visual_title': 'Visual & Interaction Suite',
    'sec_visual_tag': 'CLIENT_INJECTION',
    'sw_context_menu_title': 'Global Right-Click Enhancement',
    'sw_context_menu_desc': 'Unified management for sidebar sessions, projects, message/code copying. Disabling fully restores native right-click.',
    'sw_block_quote_title': 'Block Selection Quote (Ctrl+L) Popup',
    'sw_block_quote_desc': 'Prevents official Quote floating bubble when selecting text, eliminating lag. Subordinate to Right-Click switch.',
    'sw_status_indicator_title': 'Top-Right Green Status Indicator Dot',
    'sw_status_indicator_desc': 'Displays an unobtrusive status dot and launch animation in the top-right corner of Antigravity.',
    'sw_nav_buttons_title': 'Bottom-Right Smart Double Scroll Buttons',
    'sw_nav_buttons_desc': 'Smart scroll up (↑) and down (↓) in long chats. Double-click jumps to newest message.',
    'sw_project_archiver_title': 'Left Sidebar Project Archiving Drawer',
    'sw_project_archiver_desc': 'Hover to collapse postponed projects and provides a dedicated archive drawer next to Projects.',

    // Section 3: Memory & State Tracking
    'sec_memory_title': 'Reading Progress & State Tracking',
    'sec_memory_tag': 'PERFORMANCE',
    'sw_scroll_persist_title': 'Multi-Session Reading Scroll Memory & Auto-Restore',
    'sw_scroll_persist_desc': 'Accurately restores your reading position when switching chats. Disabling stops scroll container listeners.',
    'sw_smart_unread_title': 'Smart Read/Unread State Tracking',
    'sw_smart_unread_desc': 'Long chat bottom detection and sidebar dot indicators. Disabling stops reading timers to free up CPU.',

    // Dock & Action Bar
    'dock_ready': 'Ready • Changes take effect immediately upon save',
    'dock_modified': '● Unsaved changes detected',
    'dock_synced': 'Synced with local configuration',
    'dock_saved_at': 'Saved at ',
    'btn_reset': 'Restore Defaults',
    'btn_save': 'Save Settings',

    // Toasts & Dialogs
    'toast_saved': '✅ Configuration saved and hot-reloaded successfully!',
    'toast_reset': 'Restored to recommended defaults (click Save to apply)',
    'dialog_reset_confirm': 'Are you sure you want to restore all settings to recommended defaults?',
    'save_failed': 'Save failed: ',
    'daemon_unresponsive': 'Cannot save: Background daemon is unresponsive. Please run install.bat first.',

    // Theme Switcher & Language Switcher
    'lang_auto': '🌐 Auto (System)',
    'lang_en': 'English',
    'lang_zh_cn': '简体中文',
    'lang_zh_tw': '繁體中文',
    'theme_bento': 'Aurora Bento (Default)',
    'theme_cyber': 'Cyber HUD',
    'theme_swiss': 'Swiss Gallery',
    'theme_spatial': 'Spatial 3D',
    'theme_arcade': 'Retro Arcade',
    'theme_classic': 'Classic Default'
  },

  'zh-CN': {
    'app_title': 'Antigravity 增强器 - 设置中心',
    'brand_title': 'Antigravity 增强器',
    'brand_subtitle': '可视化管理注入组件与守护服务行为。开关状态实时反映本地配置，点击保存立即热重载。',
    'brand_tag_bento': '极光便当盒',
    'brand_tag_hud': '战术指挥舱',
    'brand_tag_gallery': '钛金典藏版',
    'brand_tag_spatial': '空间浮岛',
    'brand_tag_arcade': '复古街机版',
    'brand_tag_classic': '经典沉浸版',

    'conn_connecting': '正在连接守护服务...',
    'conn_online': '守护服务就绪 (实时同步)',
    'conn_offline': '守护服务离线 (请运行 install.bat)',
    'conn_reconnected': '✨ 守护服务已恢复，配置已自动同步',

    'offline_welcome': '欢迎！正在打开设置中心',
    'offline_notice': '受浏览器安全沙箱限制，请双击运行根目录下的 install.bat 启动后台守护服务即可开启全部功能。',
    'offline_btn_retry': '检测服务',

    'master_title': '增强器全局总开关',
    'master_active_tag': '● 运行状态活跃',
    'master_active_desc': '各项增强注入已全面激活，正在全速提供增强辅助支撑，毫秒级响应。',
    'master_dormant_tag': '○ 全面休眠断电',
    'master_dormant_desc': '总闸已关闭。客户端内不挂载任何事件或拦截组件，100% 恢复官方原生纯净状态。',
    'master_dormant_banner': '— 全局总闸已断电休眠，下方全部功能已停用 —',

    'sec_system_title': 'Windows 系统与自启服务',
    'sec_system_tag': '系统守护',
    'sw_autostart_title': 'Windows 开机静默自启动',
    'sw_autostart_desc': '根据实际系统 Startup 目录自动增删静默启动快捷方式，随开机自动驻留后台。',

    'sec_visual_title': '界面视觉与辅助工具',
    'sec_visual_tag': '交互套件',
    'sw_context_menu_title': '全局右键功能增强',
    'sw_context_menu_desc': '统一接管侧边栏会话与项目管理、消息与代码块复制及媒体快捷操作。关闭后彻底不拦截原生右键。',
    'sw_block_quote_title': '屏蔽划词选中文本时的 Quote 浮窗',
    'sw_block_quote_desc': '选中文本时不再弹出官方 Quote (Ctrl+L) 气泡，彻底杜绝输入卡顿。受右键总开关约束。',
    'sw_status_indicator_title': '右上角常驻绿色运行指示点',
    'sw_status_indicator_desc': '在 Antigravity 客户端右上角显示极小状态小圆点与启动时的展开提示。',
    'sw_nav_buttons_title': '右下角常驻智能翻页双按钮',
    'sw_nav_buttons_desc': '向上（↑）/向下（↓）智能翻阅长对话，双击直达全页最新消息。',
    'sw_project_archiver_title': '左侧项目折叠与归档抽屉',
    'sw_project_archiver_desc': '鼠标悬停一键隐藏暂缓项目，并在侧栏 Projects 旁提供专属收纳抽屉。',

    'sec_memory_title': '阅读进度记忆与状态追踪',
    'sec_memory_tag': '性能关键',
    'sw_scroll_persist_title': '多会话阅读进度记忆与自动回滚',
    'sw_scroll_persist_desc': '切换多会话时精确还原离开时的浏览位置，关停后可停止滚动容器监听释放内存。',
    'sw_smart_unread_title': '智能未读/已读状态追踪',
    'sw_smart_unread_desc': '长文阅读触底判定与侧栏圆点提示。关闭后彻底停止后台阅读定时器，释放 CPU 开销。',

    'dock_ready': '修改后点击保存即可全量热重载生效',
    'dock_modified': '● 存在未保存的修改',
    'dock_synced': '已同步当前系统实际配置',
    'dock_saved_at': '最近保存于 ',
    'btn_reset': '恢复默认',
    'btn_save': '保存设置',

    'toast_saved': '✅ 配置已成功保存并即时生效！',
    'toast_reset': '已恢复为推荐默认值（点击保存生效）',
    'dialog_reset_confirm': '确定将所有设置项恢复为推荐默认值吗？',
    'save_failed': '保存失败: ',
    'daemon_unresponsive': '无法保存：后台服务未响应，请先运行 install.bat 启动服务。',

    'lang_auto': '🌐 跟随系统',
    'lang_en': 'English',
    'lang_zh_cn': '简体中文',
    'lang_zh_tw': '繁體中文',
    'theme_bento': '极光便当盒 (默认)',
    'theme_cyber': '赛博全息',
    'theme_swiss': '瑞士画廊钛金',
    'theme_spatial': '3D 空间浮岛',
    'theme_arcade': '霓虹复古像素',
    'theme_classic': '原版经典沉浸'
  },

  'zh-TW': {
    'app_title': 'Antigravity 增強器 - 設定中心',
    'brand_title': 'Antigravity 增強器',
    'brand_subtitle': '視覺化管理注入元件與背景守護行程。開關狀態即時反映本機設定，點擊儲存立即熱重載。',
    'brand_tag_bento': '極光便當盒',
    'brand_tag_hud': '戰術指揮艙',
    'brand_tag_gallery': '鈦金典藏版',
    'brand_tag_spatial': '空間浮島',
    'brand_tag_arcade': '復古街機版',
    'brand_tag_classic': '經典沉浸版',

    'conn_connecting': '正在連線至守護服務...',
    'conn_online': '守護服務就緒 (即時同步)',
    'conn_offline': '守護服務離線 (請執行 install.bat)',
    'conn_reconnected': '✨ 守護服務已恢復，設定已自動同步',

    'offline_welcome': '歡迎！正在開啟設定中心',
    'offline_notice': '受瀏覽器安全沙盒限制，請按兩下執行根目錄下的 install.bat 啟動後台服務以啟用所有功能。',
    'offline_btn_retry': '偵測服務',

    'master_title': '增強器全局總開關',
    'master_active_tag': '● 運作中 (ACTIVE)',
    'master_active_desc': '各項增強注入已全面啟動，毫秒級響應提供增強輔助支援。',
    'master_dormant_tag': '○ 全面休眠斷電',
    'master_dormant_desc': '總開關已關閉。用戶端不掛載任何事件或攔截元件，100% 恢復官方原生純淨狀態。',
    'master_dormant_banner': '— 全局總開關已斷電休眠，下方所有功能已停用 —',

    'sec_system_title': 'Windows 系統與開機自啟服務',
    'sec_system_tag': '系統守護',
    'sw_autostart_title': 'Windows 開機無感自動啟動',
    'sw_autostart_desc': '自動於系統 Startup 目錄增刪靜默捷徑，隨開機自動常駐背景。',

    'sec_visual_title': '介面視覺與輔助工具',
    'sec_visual_tag': '互動套件',
    'sw_context_menu_title': '全局右鍵功能增強',
    'sw_context_menu_desc': '統一接管側邊欄對話、專案管理、訊息與程式碼區塊複製。關閉後徹底不攔截原生右鍵。',
    'sw_block_quote_title': '阻擋選取文字時的 Quote 浮動視窗',
    'sw_block_quote_desc': '選取文字時不再彈出官方 Quote (Ctrl+L) 氣泡，徹底告別打字卡頓。受右鍵總開關聯動。',
    'sw_status_indicator_title': '右上角常駐綠色運作指示點',
    'sw_status_indicator_desc': '在 Antigravity 用戶端右上角顯示極小狀態圓點與啟動展開動畫提示。',
    'sw_nav_buttons_title': '右下角常駐智慧翻頁雙按鈕',
    'sw_nav_buttons_desc': '向上（↑）/向下（↓）智慧捲動長篇對話，按兩下直達最新訊息。',
    'sw_project_archiver_title': '左側專案摺疊與封存抽屜',
    'sw_project_archiver_desc': '滑鼠懸停一鍵隱藏暫緩專案，並於側邊欄 Projects 旁提供專屬收納抽屜。',

    'sec_memory_title': '閱讀進度記憶與狀態追蹤',
    'sec_memory_tag': '效能關鍵',
    'sw_scroll_persist_title': '多對話閱讀進度記憶與自動還原',
    'sw_scroll_persist_desc': '切換對話時精確還原離開時的瀏覽位置，關閉後完全卸載捲動監聽以釋放資源。',
    'sw_smart_unread_title': '智慧未讀/已讀狀態追蹤',
    'sw_smart_unread_desc': '長文閱讀觸底判定與側邊欄圓點提示。關閉後停止背景定時器，大幅節省 CPU 負載。',

    'dock_ready': '修改後點擊儲存即可即時熱重載生效',
    'dock_modified': '● 偵測到未儲存的變更',
    'dock_synced': '已同步目前系統實際設定',
    'dock_saved_at': '上次儲存於 ',
    'btn_reset': '還原預設值',
    'btn_save': '儲存設定',

    'toast_saved': '✅ 設定已成功儲存並即時生效！',
    'toast_reset': '已還原為建議預設值（點擊儲存生效）',
    'dialog_reset_confirm': '確定將所有設定還原為建議預設值嗎？',
    'save_failed': '儲存失敗: ',
    'daemon_unresponsive': '無法儲存：背景服務無回應，請先執行 install.bat 啟動服務。',

    'lang_auto': '🌐 跟隨系統',
    'lang_en': 'English',
    'lang_zh_cn': '简体中文',
    'lang_zh_tw': '繁體中文',
    'theme_bento': '極光便當盒 (預設)',
    'theme_cyber': '賽博全息',
    'theme_swiss': '瑞士畫廊鈦金',
    'theme_spatial': '3D 空間浮島',
    'theme_arcade': '霓虹復古街機',
    'theme_classic': '原版經典沉浸'
  }
};

/**
 * 语言管理单例
 */
const I18N = {
  detectSystemLanguage() {
    const raw = (typeof navigator !== 'undefined' && navigator.languages && navigator.languages.length > 0)
      ? navigator.languages[0]
      : (typeof navigator !== 'undefined' ? (navigator.language || navigator.userLanguage || 'en') : 'en');
    const lang = String(raw).toLowerCase();

    // 繁体中文判定 (台湾、香港、澳门、繁体代码)
    if (lang.includes('tw') || lang.includes('hk') || lang.includes('mo') || lang.includes('hant')) {
      return 'zh-TW';
    }
    // 简体中文判定
    if (lang.startsWith('zh')) {
      return 'zh-CN';
    }
    // 其他非中文系统一律置信默认呈现英语
    return 'en';
  },

  getCurrentLanguage() {
    const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('agy_lang') : null;
    if (saved && I18N_DICT[saved]) {
      return saved;
    }
    return this.detectSystemLanguage();
  },

  setLanguage(targetLang) {
    if (typeof localStorage !== 'undefined') {
      if (targetLang === 'auto') {
        localStorage.removeItem('agy_lang');
      } else if (I18N_DICT[targetLang]) {
        localStorage.setItem('agy_lang', targetLang);
      }
    }
    this.applyAll();
  },

  t(key) {
    const lang = this.getCurrentLanguage();
    const dict = I18N_DICT[lang] || I18N_DICT['en'];
    return dict[key] || I18N_DICT['en'][key] || key;
  },

  applyAll() {
    const lang = this.getCurrentLanguage();
    const dict = I18N_DICT[lang] || I18N_DICT['en'];

    // 1. 设置 html lang 属性
    document.documentElement.lang = lang;

    // 2. 更新网页 title
    if (dict['app_title']) {
      document.title = dict['app_title'];
    }

    // 3. 遍历带有 data-i18n 属性的所有 DOM 节点
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    // 4. 更新语言选择下拉菜单的选中状态
    const langSelect = document.getElementById('agyLangSelect');
    if (langSelect) {
      const saved = localStorage.getItem('agy_lang');
      langSelect.value = saved || 'auto';
    }

    // 5. 触发自定义事件，通知主题自身重新渲染动态文本
    window.dispatchEvent(new CustomEvent('agy-lang-changed', { detail: { lang } }));
  }
};

// 页面加载完成后自动应用语言
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => I18N.applyAll());
  } else {
    I18N.applyAll();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { I18N, I18N_DICT };
}
