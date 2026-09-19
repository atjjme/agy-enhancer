/**
 * Antigravity 增强器 - 终极安全守护服务 (Safe Background Service)
 * 
 * 特性：
 * 1. 0 侵入，0 破坏风险，绝不修改客户端原生文件
 * 2. 毫秒级极速响应：页面按 Ctrl+R 刷新后 0.2 秒内自动重新载入
 * 3. 实时文件监控：修改 src/agy-enhancer.js 保存瞬间，自动热同步到窗口
 * 4. 支持完全静默运行（无任何黑框窗口）
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const { execSync, exec } = require('child_process');

const defaultAppData = process.env.APPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Roaming') : 'C:\\ProgramData');

const activePortFile = path.join(
  defaultAppData,
  'antigravity',
  'DevToolsActivePort'
);

const scrollPositionsFile = path.join(
  defaultAppData,
  'antigravity',
  'agy-scroll-positions.json'
);

const unreadStatesFile = path.join(
  defaultAppData,
  'antigravity',
  'agy-unread-states.json'
);

const logFile = path.join(
  defaultAppData,
  'antigravity',
  'agy-loader.log'
);

const configFile = path.join(
  defaultAppData,
  'antigravity',
  'agy-enhancer-config.json'
);

const localConfigFile = path.resolve(__dirname, 'agy-enhancer-config.json');
const fallbackConfigFile = path.resolve(__dirname, '../agy-enhancer-config.json');
const settingsHtmlFile = path.resolve(__dirname, '../settings.html');
const SETTINGS_PORT = 37210;

const DEFAULT_CONFIG = {
  ENABLE_MASTER: true,
  ENABLE_AUTOSTART: true,
  ENABLE_STATUS_INDICATOR: true,
  ENABLE_CONTEXT_MENU: true,
  ENABLE_BLOCK_QUOTE_POPUP: true,
  ENABLE_FORK_CONVERSATION: true,
  ENABLE_NAV_BUTTONS: true,
  ENABLE_BLOCK_CHAT_BOTTOM_BUTTON: true,
  ENABLE_PROJECT_ARCHIVER: true,
  ENABLE_SCROLL_PERSISTENCE: true,
  ENABLE_SMART_UNREAD: true,
};

const MAX_LOG_SIZE = 3 * 1024 * 1024; // 3MB 日志上限

function log(...args) {
  const now = new Date();
  const time = now.toLocaleDateString() + ' ' + now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
  const text = `[${time}] ` + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  console.log(text);
  try {
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      if (stats.size > MAX_LOG_SIZE) {
        const oldLog = logFile + '.old';
        if (fs.existsSync(oldLog)) {
          try { fs.unlinkSync(oldLog); } catch (e) {}
        }
        try { fs.renameSync(logFile, oldLog); } catch (e) {}
      }
    }
    fs.appendFileSync(logFile, text + '\n', 'utf8');
  } catch (e) {}
}

process.on('uncaughtException', (err) => {
  log('[UncaughtException]', err?.stack || err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  log('[UnhandledRejection]', reason?.stack || reason?.message || reason);
});

log('=== Antigravity Enhancer daemon started ===');

const enhancerFile = path.resolve(__dirname, '../src/agy-enhancer.js');

let currentWs = null;
let lastPort = null;
let currentPageId = null;
let isConnecting = false;
let lastHeartbeatInjectTime = 0;

function getStoredScrollPositions() {
  try {
    if (fs.existsSync(scrollPositionsFile)) {
      const raw = fs.readFileSync(scrollPositionsFile, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {}
  return {};
}

function saveStoredScrollPositions(jsonStr) {
  try {
    fs.writeFileSync(scrollPositionsFile, jsonStr, 'utf8');
  } catch (e) {}
}

function getStoredUnreadStates() {
  try {
    if (fs.existsSync(unreadStatesFile)) {
      const raw = fs.readFileSync(unreadStatesFile, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {}
  return {};
}

function saveStoredUnreadStates(jsonStr) {
  try {
    fs.writeFileSync(unreadStatesFile, jsonStr, 'utf8');
  } catch (e) {}
}

function getStartupShortcutInfo() {
  const startupDir = path.join(
    process.env.APPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Roaming') : 'C:\\ProgramData'),
    'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup'
  );
  return {
    startupDir,
    shortcutPath: path.join(startupDir, 'AntigravityEnhancer.lnk'),
    legacyShortcutPath: path.join(startupDir, 'AntigravityReaderEnhancer.lnk')
  };
}

function isAutostartEnabled() {
  try {
    const { shortcutPath } = getStartupShortcutInfo();
    return fs.existsSync(shortcutPath);
  } catch (e) {
    return false;
  }
}

function setAutostart(enable) {
  try {
    const { shortcutPath, legacyShortcutPath } = getStartupShortcutInfo();
    if (fs.existsSync(legacyShortcutPath)) {
      try { fs.unlinkSync(legacyShortcutPath); } catch (e) {}
    }

    if (enable) {
      const vbsPath = path.resolve(__dirname, 'start-service-silent.vbs');
      const rootDir = path.resolve(__dirname, '..');
      const psCmd = `$ws = New-Object -ComObject WScript.Shell; ` +
        `$shortcut = $ws.CreateShortcut('${shortcutPath.replace(/'/g, "''")}'); ` +
        `$shortcut.TargetPath = '${vbsPath.replace(/'/g, "''")}'; ` +
        `$shortcut.WorkingDirectory = '${rootDir.replace(/'/g, "''")}'; ` +
        `$shortcut.Description = 'Antigravity Enhancer Silent Service'; ` +
        `$shortcut.Save();`;
      execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCmd}"`, { timeout: 3500 });
      log('[Autostart] Configured autostart shortcut at: ' + shortcutPath);
      return true;
    } else {
      if (fs.existsSync(shortcutPath)) {
        fs.unlinkSync(shortcutPath);
        log('[Autostart] Removed autostart shortcut at: ' + shortcutPath);
      }
      return true;
    }
  } catch (e) {
    log('[Autostart Error]', e.message);
    return false;
  }
}

function getStoredConfig() {
  let rawConfig = {};
  try {
    if (fs.existsSync(configFile)) {
      rawConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } else if (fs.existsSync(localConfigFile)) {
      rawConfig = JSON.parse(fs.readFileSync(localConfigFile, 'utf8'));
    } else if (fs.existsSync(fallbackConfigFile)) {
      rawConfig = JSON.parse(fs.readFileSync(fallbackConfigFile, 'utf8'));
    }
  } catch (e) {}

  const config = {};
  for (const key of Object.keys(DEFAULT_CONFIG)) {
    config[key] = typeof rawConfig[key] === 'boolean' ? rawConfig[key] : DEFAULT_CONFIG[key];
  }
  config.ENABLE_AUTOSTART = isAutostartEnabled();
  return config;
}

function saveStoredConfig(newConfig) {
  try {
    const current = getStoredConfig();
    const merged = Object.assign({}, current, newConfig);
    const jsonStr = JSON.stringify(merged, null, 2);
    try {
      const dir = path.dirname(configFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(configFile, jsonStr, 'utf8');
    } catch (e) {}
    try {
      fs.writeFileSync(localConfigFile, jsonStr, 'utf8');
    } catch (e) {}
    return merged;
  } catch (e) {
    log('[Config Save Error]', e?.message || e);
    return null;
  }
}

function resolveArtifactOnDisk(convoId, title) {
  const homeDir = os.homedir();
  const brainConvoDir = path.join(homeDir, '.gemini', 'antigravity', 'brain', convoId);
  if (!fs.existsSync(brainConvoDir)) {
    return path.join(homeDir, '.gemini', 'antigravity', 'brain');
  }
  try {
    const files = fs.readdirSync(brainConvoDir).filter(f => !f.endsWith('.metadata.json'));
    // 1. 如果 title 本身包含完整文件名 (例如 "封面 4K 超清版： thumbnail_4_4k.jpg")，优先正则提取其中的文件名直接查找
    const fnMatch = title.match(/([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)/);
    if (fnMatch) {
      const direct = files.find(f => f.toLowerCase() === fnMatch[1].toLowerCase());
      if (direct) return path.join(brainConvoDir, direct);
    }
    // 2. 规范化去除非字母数字字符精确匹配
    const norm = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    let found = files.find(f => path.parse(f).name.toLowerCase().replace(/[^a-z0-9]/g, '') === norm);
    if (!found) {
      found = files.find(f => {
        const b = path.parse(f).name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (b.length >= 3 && norm.length >= 3 && (b.startsWith(norm) || norm.startsWith(b) || norm.includes(b) || b.includes(norm)));
      });
    }
    if (found) return path.join(brainConvoDir, found);
  } catch (e) {}
  return brainConvoDir;
}

function getActivePortInfo() {
  if (!fs.existsSync(activePortFile)) return null;
  try {
    const lines = fs.readFileSync(activePortFile, 'utf8').trim().split('\n');
    const port = parseInt(lines[0].trim(), 10);
    return isNaN(port) ? null : port;
  } catch (e) {
    return null;
  }
}

async function connectAndAttach() {
  if (isConnecting) return;
  // 若现有 WebSocket 连接保持畅通，直接复用，完全免去读取磁盘文件和 HTTP 请求
  const wsOpenState = (typeof WebSocket !== 'undefined' && WebSocket.OPEN) ? WebSocket.OPEN : 1;
  if (currentWs && currentWs.readyState === wsOpenState) {
    return;
  }

  const port = getActivePortInfo();
  if (!port) return;

  isConnecting = true;
  try {
    const pages = await new Promise((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${port}/json/list`, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.setTimeout(600, () => { req.destroy(); reject(new Error('timeout')); });
    });

    // 优先选择主聊天页（包含 /c/ 或 section=），跳过临时验证或登录窗口
    const chatPage = pages.find(p => p.type === 'page' && p.webSocketDebuggerUrl && (p.url.includes('/c/') || p.url.includes('section=')));
    const page = chatPage || pages.find(p => p.type === 'page' && p.webSocketDebuggerUrl);
    if (!page) {
      isConnecting = false;
      return;
    }

    // 若端口和当前页面目标均未变化且连接正常，则保持现有连接
    if (port === lastPort && page.id === currentPageId && currentWs && currentWs.readyState === WebSocket.OPEN) {
      isConnecting = false;
      return;
    }

    log(`Detected client page [${page.id}] ${page.title || 'Untitled'} (${page.url})`);
    if (page === chatPage) {
      log(`Matched main chat window, attaching now.`);
    }

    lastPort = port;
    currentPageId = page.id;
    if (currentWs) {
      try { currentWs.close(); } catch (e) {}
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    currentWs = ws;

    let connectionEstablishedTime = 0;
    const handledConsoleTokens = new Set();

    ws.onopen = () => {
      isConnecting = false;
      connectionEstablishedTime = Date.now();
      log(`CDP connected [port: ${port}], enabling Page & Runtime`);
      ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      // 连上后立即无缝注入
      injectEnhancer(ws);
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.method === 'Page.loadEventFired' || data.method === 'Runtime.executionContextsCleared' || data.method === 'Page.frameNavigated') {
          log(`Page reload / navigation detected (${data.method}), reinjecting...`);
          setTimeout(() => injectEnhancer(ws), 80);
        } else if (data.method === 'Runtime.consoleAPICalled') {
          const text = data.params?.args?.[0]?.value;
          if (typeof text === 'string' && text.startsWith('[AGY_PERSIST_SCROLL]')) {
            const jsonStr = text.slice('[AGY_PERSIST_SCROLL]'.length);
            log(`Persisting scroll positions to disk: ` + jsonStr);
            saveStoredScrollPositions(jsonStr);
          } else if (typeof text === 'string' && text.startsWith('[AGY_PERSIST_UNREAD]')) {
            const jsonStr = text.slice('[AGY_PERSIST_UNREAD]'.length);
            log(`Persisting unread states to disk: ` + jsonStr);
            saveStoredUnreadStates(jsonStr);
          } else if (typeof text === 'string' && text.startsWith('[AGY_REVEAL_PATH]')) {
            let rawPath = text.slice('[AGY_REVEAL_PATH]'.length).trim();
            // 防重放拦截 1：必须携带合法 actionToken [timestamp_random]，历史无 Token 旧日志一律彻底丢弃
            const tokenMatch = rawPath.match(/^\[([0-9]+)_([a-zA-Z0-9]+)\](.*)/);
            if (!tokenMatch) {
              log(`[Legacy/Untokened Ignored] Ignored untokened revealPath: ` + rawPath);
              return;
            }
            const tokenTime = parseInt(tokenMatch[1], 10);
            const token = tokenMatch[1] + '_' + tokenMatch[2];
            rawPath = tokenMatch[3].trim();

            // 防重放拦截 2：时间戳校验。早于当前连接建立时间，或距今超过 5 秒，视为历史缓存重放
            if (tokenTime < connectionEstablishedTime - 500 || (Date.now() - tokenTime) > 5000) {
              log(`[Stale Token Ignored] Ignored stale revealPath token: ` + token);
              return;
            }

            // 防重放拦截 3：校验唯一 actionToken 去重
            if (handledConsoleTokens.has(token)) {
              log(`[Duplicate Ignored] Ignored duplicate revealPath token: ` + token);
              return;
            }
            handledConsoleTokens.add(token);
            if (handledConsoleTokens.size > 500) {
              const first = handledConsoleTokens.values().next().value;
              handledConsoleTokens.delete(first);
            }

            log(`Revealing path in Explorer: ` + rawPath);
            try {
              let cleanPath = rawPath.replace(/^file:\/\/\/?/i, '').replace(/\//g, '\\');
              const homeDir = process.env.USERPROFILE || process.env.HOME || 'C:\\Users\\Juste';

              if (cleanPath.startsWith('MEDIA_DIR:')) {
                const convoId = cleanPath.slice('MEDIA_DIR:'.length).trim();
                const userUploadedDir = path.join(homeDir, '.gemini', 'antigravity', 'brain', convoId, '.user_uploaded');
                if (fs.existsSync(userUploadedDir)) {
                  try {
                    const files = fs.readdirSync(userUploadedDir)
                      .filter(f => f.startsWith('media_'))
                      .map(f => ({ name: f, time: fs.statSync(path.join(userUploadedDir, f)).mtimeMs }))
                      .sort((a, b) => b.time - a.time);
                    if (files.length > 0) {
                      cleanPath = path.join(userUploadedDir, files[0].name);
                    } else {
                      cleanPath = userUploadedDir;
                    }
                  } catch (e) {
                    cleanPath = userUploadedDir;
                  }
                } else {
                  cleanPath = path.join(homeDir, '.gemini', 'antigravity', 'brain', convoId);
                }
              } else if (cleanPath.startsWith('MEDIA:')) {
                const parts = cleanPath.split(':');
                const convoId = parts[1];
                const filename = parts[2];
                const mediaPath = path.join(homeDir, '.gemini', 'antigravity', 'brain', convoId, '.user_uploaded', filename);
                if (fs.existsSync(mediaPath)) {
                  cleanPath = mediaPath;
                } else {
                  cleanPath = path.join(homeDir, '.gemini', 'antigravity', 'brain', convoId, '.user_uploaded');
                }
              } else if (cleanPath.startsWith('ARTIFACT:')) {
                const parts = cleanPath.split(':');
                const convoId = parts[1];
                const title = parts.slice(2).join(':').trim();
                cleanPath = resolveArtifactOnDisk(convoId, title);
              }

              if (/^[a-zA-Z]:/.test(cleanPath)) {
                if (fs.existsSync(cleanPath)) {
                  if (fs.statSync(cleanPath).isDirectory()) {
                    exec(`explorer.exe "${cleanPath}"`);
                  } else {
                    exec(`explorer.exe /select,"${cleanPath}"`);
                  }
                } else if (fs.existsSync(path.dirname(cleanPath))) {
                  exec(`explorer.exe "${path.dirname(cleanPath)}"`);
                } else {
                  exec(`explorer.exe "${cleanPath}"`);
                }
              }
            } catch (e) {
              log(`Failed to reveal path: ` + e.message);
            }
          } else if (typeof text === 'string' && text.startsWith('[AGY_COPY_IMAGE]')) {
            let rawPath = text.slice('[AGY_COPY_IMAGE]'.length).trim();
            // 防重放拦截 1：必须携带合法 actionToken [timestamp_random]，历史无 Token 旧日志一律彻底丢弃
            const tokenMatch = rawPath.match(/^\[([0-9]+)_([a-zA-Z0-9]+)\](.*)/);
            if (!tokenMatch) {
              log(`[Legacy/Untokened Ignored] Ignored untokened copyImage: ` + rawPath);
              return;
            }
            const tokenTime = parseInt(tokenMatch[1], 10);
            const token = tokenMatch[1] + '_' + tokenMatch[2];
            rawPath = tokenMatch[3].trim();

            // 防重放拦截 2：时间戳校验
            if (tokenTime < connectionEstablishedTime - 500 || (Date.now() - tokenTime) > 5000) {
              log(`[Stale Token Ignored] Ignored stale copyImage token: ` + token);
              return;
            }

            // 防重放拦截 3：校验唯一 actionToken 去重
            if (handledConsoleTokens.has(token)) {
              log(`[Duplicate Ignored] Ignored duplicate copyImage token: ` + token);
              return;
            }
            handledConsoleTokens.add(token);
            if (handledConsoleTokens.size > 500) {
              const first = handledConsoleTokens.values().next().value;
              handledConsoleTokens.delete(first);
            }

            log(`Requested copy image: ` + rawPath);
            try {
              let cleanPath = rawPath;
              if (cleanPath.startsWith('ARTIFACT:')) {
                const parts = cleanPath.split(':');
                const convoId = parts[1];
                const title = parts.slice(2).join(':').trim();
                cleanPath = resolveArtifactOnDisk(convoId, title);
              } else if (cleanPath.startsWith('MEDIA:')) {
                const parts = cleanPath.split(':');
                const convoId = parts[1];
                const filename = parts[2];
                cleanPath = path.join(homeDir, '.gemini', 'antigravity', 'brain', convoId, '.user_uploaded', filename);
              }
              if (fs.existsSync(cleanPath) && !fs.statSync(cleanPath).isDirectory()) {
                const escaped = cleanPath.replace(/'/g, "''");
                const psCmd = `& { Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; [System.Windows.Forms.Clipboard]::SetImage([System.Drawing.Image]::FromFile('${escaped}')) }`;
                exec(`powershell -Sta -NoProfile -Command "${psCmd}"`, (err) => {
                  if (err) log('Failed to copy image to clipboard: ' + err.message);
                  else log('Image copied to clipboard successfully: ' + cleanPath);
                });
              }
            } catch (e) {
              log(`Failed to copy image: ` + e.message);
            }
          } else if (typeof text === 'string' && text.startsWith('[AGY_OPEN_SETTINGS]')) {
            let rawMsg = text.slice('[AGY_OPEN_SETTINGS]'.length).trim();
            const tokenMatch = rawMsg.match(/^\[([0-9]+)_([a-zA-Z0-9]+)\](.*)/);
            let shouldOpen = false;
            if (tokenMatch) {
              const tokenTime = parseInt(tokenMatch[1], 10);
              const token = tokenMatch[1] + '_' + tokenMatch[2];
              if (tokenTime >= connectionEstablishedTime - 3000 && Math.abs(Date.now() - tokenTime) <= 15000) {
                if (!handledConsoleTokens.has(token)) {
                  handledConsoleTokens.add(token);
                  if (handledConsoleTokens.size > 500) {
                    const first = handledConsoleTokens.values().next().value;
                    handledConsoleTokens.delete(first);
                  }
                  shouldOpen = true;
                }
              }
            } else {
              shouldOpen = true;
            }
            if (shouldOpen) {
              log(`[Open Settings] Launching settings dashboard: ${settingsHtmlFile}`);
              exec(`start "" "${settingsHtmlFile}"`);
            }
          }
        } else if (data.id === 77777) {
          // 心跳探测返回：如果探测出错或异常，切勿当成未就绪而乱注
          if (data.error || data.result?.exceptionDetails) return;
          const isLoaded = data.result?.result?.value === true;
          if (!isLoaded) {
            log(`[Health Check] Enhancer not ready, injecting now`);
            lastHeartbeatInjectTime = Date.now();
            injectEnhancer(ws);
          }
        }
      } catch (e) {}
    };

    ws.onclose = () => {
      log(`CDP disconnected, reconnecting...`);
      currentWs = null;
      currentPageId = null;
      isConnecting = false;
      setTimeout(connectAndAttach, 100);
    };

    ws.onerror = (err) => {
      log(`CDP connection error:`, err?.message || err);
      isConnecting = false;
    };
  } catch (err) {
    isConnecting = false;
  }
}

// 主动巡检心跳：毫秒级响应初次加载与登录跳转，已加载状态下保持静默
function checkPageReadiness() {
  if (!currentWs || currentWs.readyState !== WebSocket.OPEN) return;
  if (Date.now() - lastHeartbeatInjectTime < 4000) return;

  try {
    currentWs.send(JSON.stringify({
      id: 77777,
      method: 'Runtime.evaluate',
      params: {
        expression: `Boolean(window.__AGY_ENHANCER_LOADED__)`,
        returnByValue: true
      }
    }));
  } catch (e) {}
}

let cachedBranchInfo = null;
let lastBranchInfoCheck = 0;

function getCurrentBranchInfo() {
  const now = Date.now();
  if (cachedBranchInfo && (now - lastBranchInfoCheck < 15000)) {
    return cachedBranchInfo;
  }
  lastBranchInfoCheck = now;

  let branch = '';
  // 1. 优先通过轻量级文件直接读取，避免高频拉起同步阻塞的 git.exe 子进程
  try {
    let gitDir = path.resolve(__dirname, '../.git');
    if (fs.existsSync(gitDir) && fs.statSync(gitDir).isFile()) {
      const content = fs.readFileSync(gitDir, 'utf8').trim();
      const match = content.match(/gitdir:\s*(.*)/);
      if (match) gitDir = match[1].trim();
    }
    const headFile = path.join(gitDir, 'HEAD');
    if (fs.existsSync(headFile)) {
      const headContent = fs.readFileSync(headFile, 'utf8').trim();
      const refMatch = headContent.match(/ref:\s*refs\/heads\/(.*)/);
      if (refMatch) branch = refMatch[1].trim();
    }
  } catch (e) {}

  // 2. 文件读取失败时才降级使用 git 命令
  if (!branch) {
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: __dirname,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 600
      }).trim();
    } catch (e2) {}
  }

  // 只要不是主干（master 或 main），一律视为分支并添加（分支）标签
  const isMain = branch === 'master' || branch === 'main';
  const tag = isMain ? '' : ' (branch)';
  cachedBranchInfo = { branch, isMain, tag };
  return cachedBranchInfo;
}

function injectEnhancer(ws) {
  const targetWs = ws || currentWs;
  const wsOpen = (typeof WebSocket !== 'undefined' && WebSocket.OPEN) ? WebSocket.OPEN : 1;
  if (!targetWs || targetWs.readyState !== wsOpen) return;
  try {
    if (!fs.existsSync(enhancerFile)) {
      log('[Error] Enhancer source file not found:', enhancerFile);
      return;
    }
    const { branch, tag } = getCurrentBranchInfo();
    const storedPositions = getStoredScrollPositions();
    const storedUnreadStates = getStoredUnreadStates();
    const positionCount = Object.keys(storedPositions).length;
    const unreadCount = Object.keys(storedUnreadStates).length;
    const config = getStoredConfig();
    log(`>>> Injecting enhancer script (branch: ${branch || 'master'}, scroll memory: ${positionCount}, unread: ${unreadCount}, master: ${config.ENABLE_MASTER !== false})`);
    const prefix = `window.__AGY_BRANCH_TAG__ = ${JSON.stringify(tag)};\nwindow.__AGY_BRANCH_NAME__ = ${JSON.stringify(branch)};\nwindow.__AGY_CONFIG__ = ${JSON.stringify(config)};\nwindow.__AGY_STORED_SCROLL_POSITIONS__ = ${JSON.stringify(storedPositions)};\nwindow.__AGY_STORED_UNREAD_STATES__ = ${JSON.stringify(storedUnreadStates)};\nwindow.__AGY_SETTINGS_FILE__ = ${JSON.stringify(settingsHtmlFile)};\n`;
    const code = prefix + fs.readFileSync(enhancerFile, 'utf8');
    targetWs.send(JSON.stringify({
      id: Math.floor(Math.random() * 100000),
      method: 'Runtime.evaluate',
      params: { expression: code, returnByValue: true }
    }));
    log(`<<< Enhancer script injected successfully!`);
  } catch (e) {
    log('[Exception] injectEnhancer error:', e?.message || e);
  }
}

// 平衡轮询：未连接时每 1200ms 检测一次连接状态，每 3500ms 主动探测页面就绪状态
setInterval(connectAndAttach, 1200);
setInterval(checkPageReadiness, 3500);
connectAndAttach();

// 监听源码变动：修改保存时防抖同步到窗口
let watchDebounceTimer = null;
try {
  fs.watch(enhancerFile, (eventType) => {
    if (eventType === 'change' && currentWs) {
      if (watchDebounceTimer) clearTimeout(watchDebounceTimer);
      watchDebounceTimer = setTimeout(() => {
        injectEnhancer(currentWs);
      }, 100);
    }
  });
} catch (e) {}

// 监听配置文件变动：用户保存设置后，自动热重载最新配置到窗口
let configDebounceTimer = null;
function setupConfigFileWatcher(targetFile) {
  try {
    if (fs.existsSync(targetFile)) {
      fs.watch(targetFile, () => {
        if (currentWs) {
          if (configDebounceTimer) clearTimeout(configDebounceTimer);
          configDebounceTimer = setTimeout(() => {
            log('[Config Watcher] Configuration updated on disk, reinjecting enhancer...');
            injectEnhancer(currentWs);
          }, 120);
        }
      });
    }
  } catch (e) {}
}
setupConfigFileWatcher(configFile);
setupConfigFileWatcher(localConfigFile);

// ==================== 工作树与分支管理底层服务 (Worktree & Branch Management) ====================

function uriToLocalPath(uri) {
  if (!uri) return '';
  let clean = String(uri).trim();
  clean = clean.replace(/^file:\/\/\/?/i, '');
  try {
    clean = decodeURIComponent(clean);
  } catch (e) {}
  clean = clean.replace(/\//g, '\\');
  // 兼容 /e:/... 或 e:/... 或 \e:\... 格式
  clean = clean.replace(/^[\\\/]+([a-zA-Z]:)/, '$1');
  return path.normalize(clean);
}

function findProjectConfigFiles(projectId, projectName) {
  const homeDir = os.homedir();
  const projectsDir = path.join(homeDir, '.gemini', 'config', 'projects');
  const matched = [];
  if (!fs.existsSync(projectsDir)) return matched;

  try {
    const files = fs.readdirSync(projectsDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const fullPath = path.join(projectsDir, f);
      try {
        const raw = fs.readFileSync(fullPath, 'utf8');
        const data = JSON.parse(raw);
        if (projectId && (data.id === projectId || f.startsWith(projectId))) {
          matched.push({ file: fullPath, data });
        } else if (projectName && (data.name === projectName || data.id === projectName)) {
          matched.push({ file: fullPath, data });
        } else if (!projectId && !projectName) {
          matched.push({ file: fullPath, data });
        }
      } catch (e) {}
    }
  } catch (e) {}
  return matched;
}

function executePurgeWorktree(options) {
  const { projectId, projectName, branchName, folderUri, projectRootPath, force } = options || {};
  log(`[Worktree Purge] Initiating purge: branch="${branchName}", folder="${folderUri}", project="${projectName || projectId}"`);

  // 1. 安全防呆校验：严禁删除 main / master / default 等主干分支
  const safeBranch = String(branchName || '').trim();
  const lowerBranch = safeBranch.toLowerCase();
  if (lowerBranch === 'main' || lowerBranch === 'master' || lowerBranch === 'trunk' || lowerBranch === 'default') {
    return {
      success: false,
      error: `安全防护：禁止删除主干分支 "${safeBranch}"`
    };
  }

  // 2. 检查是否为当前正在使用活跃分支
  const currentBranch = getCurrentBranchInfo()?.branch || '';
  if (!force && safeBranch && currentBranch && safeBranch === currentBranch) {
    return {
      success: false,
      error: `当前分支 "${safeBranch}" 正在活动使用中，请先切换到其他分支后再删除`
    };
  }

  const details = {
    diskCleaned: false,
    diskPath: null,
    gitPruned: false,
    branchDeleted: false,
    registryUpdated: false,
    cleanedProjects: []
  };

  // 3. 解析目标工作树的具体物理路径
  let targetPath = '';
  if (folderUri) {
    targetPath = uriToLocalPath(folderUri);
  }

  // 4. 定位项目根目录 (Git Main Repo Path)
  let resolvedProjectRoot = projectRootPath ? uriToLocalPath(projectRootPath) : '';
  const projectConfigs = findProjectConfigFiles(projectId, projectName);

  if (!resolvedProjectRoot && projectConfigs.length > 0) {
    for (const { data } of projectConfigs) {
      if (data.projectResources?.resources) {
        for (const res of data.projectResources.resources) {
          if (res.gitFolder?.folderUri) {
            resolvedProjectRoot = uriToLocalPath(res.gitFolder.folderUri);
            break;
          }
        }
      }
      if (!resolvedProjectRoot && Array.isArray(data.workspaces) && data.workspaces.length > 0) {
        resolvedProjectRoot = uriToLocalPath(data.workspaces[0]);
      }
      if (resolvedProjectRoot) break;
    }
  }

  if (!targetPath && safeBranch) {
    // 尝试在 projectConfigs 的 environments 中查找
    for (const { data } of projectConfigs) {
      const envs = data.environments?.environments || [];
      const env = envs.find(e => e.name === safeBranch || e.id === safeBranch);
      if (env?.resources?.resources) {
        for (const r of env.resources.resources) {
          if (r.folderUri) {
            targetPath = uriToLocalPath(r.folderUri);
            break;
          }
        }
      }
      if (targetPath) break;
    }

    // 默认工作树路径兜底
    if (!targetPath && projectName) {
      const defaultWtPath = path.join(os.homedir(), '.gemini', 'antigravity', 'worktrees', projectName, safeBranch);
      if (fs.existsSync(defaultWtPath)) {
        targetPath = defaultWtPath;
      }
    }
  }

  // 5. 执行物理磁盘删除 (Disk Cleanup)
  if (targetPath && fs.existsSync(targetPath)) {
    details.diskPath = targetPath;
    // 严格安全检查：确保不是根目录或项目主仓库目录
    const normTarget = path.resolve(targetPath).toLowerCase();
    const isRoot = normTarget === path.resolve('C:\\').toLowerCase() || normTarget.length <= 3;
    const isMainRepo = resolvedProjectRoot && normTarget === path.resolve(resolvedProjectRoot).toLowerCase();

    if (isRoot || isMainRepo) {
      return {
        success: false,
        error: `安全防护：目标路径 "${targetPath}" 为项目根目录或磁盘根目录，拒绝删除！`
      };
    }

    try {
      log(`[Worktree Purge] Removing physical directory: ${targetPath}`);
      fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      details.diskCleaned = !fs.existsSync(targetPath);
    } catch (diskErr) {
      log(`[Worktree Purge] fs.rmSync failed, attempting powershell fallback:`, diskErr.message);
      try {
        const psEscaped = targetPath.replace(/'/g, "''");
        execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "Remove-Item -LiteralPath '${psEscaped}' -Recurse -Force"`, { timeout: 8000 });
        details.diskCleaned = !fs.existsSync(targetPath);
      } catch (psErr) {
        log(`[Worktree Purge] PowerShell remove failed:`, psErr.message);
      }
    }
  } else {
    details.diskCleaned = true; // 本身不存在视同已清理
  }

  // 6. 执行 Git 工作树与分支彻底清理 (Git Cleanup)
  if (resolvedProjectRoot && fs.existsSync(resolvedProjectRoot)) {
    // 6.1 git worktree remove & prune
    if (targetPath) {
      try {
        const targetEscaped = targetPath.replace(/\\/g, '/');
        execSync(`git worktree remove --force "${targetEscaped}"`, {
          cwd: resolvedProjectRoot,
          stdio: ['pipe', 'pipe', 'ignore'],
          timeout: 5000
        });
      } catch (e) {}
    }
    try {
      execSync('git worktree prune', {
        cwd: resolvedProjectRoot,
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 5000
      });
      details.gitPruned = true;
    } catch (e) {
      log(`[Worktree Purge] git worktree prune error:`, e.message);
    }

    // 6.2 git branch -D <branch_name>
    if (safeBranch && safeBranch !== 'main' && safeBranch !== 'master') {
      try {
        // 检查分支是否存在
        execSync(`git rev-parse --verify "refs/heads/${safeBranch}"`, {
          cwd: resolvedProjectRoot,
          stdio: ['pipe', 'pipe', 'ignore'],
          timeout: 2000
        });
        // 强制删除本地分支
        execSync(`git branch -D "${safeBranch}"`, {
          cwd: resolvedProjectRoot,
          stdio: ['pipe', 'pipe', 'ignore'],
          timeout: 5000
        });
        details.branchDeleted = true;
        log(`[Worktree Purge] Deleted git branch: ${safeBranch}`);
      } catch (e) {
        // 分支可能已经不存在或被删除
      }
    }
  }

  // 7. 软件缓存与项目注册表清理 (Registry & Cache Cleanup)
  if (projectConfigs.length > 0) {
    for (const { file, data } of projectConfigs) {
      let modified = false;
      if (data.environments && Array.isArray(data.environments.environments)) {
        const initialLen = data.environments.environments.length;
        data.environments.environments = data.environments.environments.filter(env => {
          if (safeBranch && (env.name === safeBranch || env.id === safeBranch)) return false;
          if (targetPath && env.resources?.resources) {
            const hasTarget = env.resources.resources.some(r => r.folderUri && uriToLocalPath(r.folderUri).toLowerCase() === targetPath.toLowerCase());
            if (hasTarget) return false;
          }
          return true;
        });
        if (data.environments.environments.length !== initialLen) {
          modified = true;
        }
      }

      if (Array.isArray(data.workspaces)) {
        const initialLen = data.workspaces.length;
        data.workspaces = data.workspaces.filter(wsUri => {
          if (targetPath && uriToLocalPath(wsUri).toLowerCase() === targetPath.toLowerCase()) return false;
          if (folderUri && wsUri === folderUri) return false;
          return true;
        });
        if (data.workspaces.length !== initialLen) {
          modified = true;
        }
      }

      if (modified) {
        try {
          fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
          details.cleanedProjects.push(file);
          details.registryUpdated = true;
          log(`[Worktree Purge] Cleaned project registry file: ${file}`);
        } catch (e) {
          log(`[Worktree Purge] Failed to save project registry file:`, e.message);
        }
      }
    }
  }

  return {
    success: true,
    message: `工作树与分支 "${safeBranch || targetPath}" 已彻底无死角清理完毕`,
    details
  };
}

function executePruneInvalidWorktrees(options) {
  const { projectId, projectName } = options || {};
  log(`[Prune Invalid] Scanning for ghost worktree records (project: ${projectName || projectId || 'ALL'})...`);

  const projectConfigs = findProjectConfigFiles(projectId, projectName);
  let totalPruned = 0;
  const prunedList = [];

  for (const { file, data } of projectConfigs) {
    let modified = false;
    let projectRoot = '';
    if (data.projectResources?.resources) {
      for (const res of data.projectResources.resources) {
        if (res.gitFolder?.folderUri) {
          projectRoot = uriToLocalPath(res.gitFolder.folderUri);
          break;
        }
      }
    }

    if (data.environments && Array.isArray(data.environments.environments)) {
      const validEnvironments = [];
      for (const env of data.environments.environments) {
        let exists = false;
        let envPath = '';
        if (env.resources?.resources) {
          for (const r of env.resources.resources) {
            if (r.folderUri) {
              envPath = uriToLocalPath(r.folderUri);
              if (envPath && fs.existsSync(envPath)) {
                exists = true;
                break;
              }
            }
          }
        }
        if (exists) {
          validEnvironments.push(env);
        } else {
          totalPruned++;
          prunedList.push({
            name: env.name || env.id,
            path: envPath,
            project: data.name || data.id
          });
          modified = true;
          log(`[Prune Invalid] Pruned ghost environment: "${env.name}" (path missing: ${envPath})`);
        }
      }
      data.environments.environments = validEnvironments;
    }

    if (modified) {
      try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
        log(`[Prune Invalid] Updated project registry: ${file}`);
      } catch (e) {}
    }

    if (projectRoot && fs.existsSync(projectRoot)) {
      try {
        execSync('git worktree prune', {
          cwd: projectRoot,
          stdio: ['pipe', 'pipe', 'ignore'],
          timeout: 4000
        });
      } catch (e) {}
    }
  }

  return {
    success: true,
    prunedCount: totalPruned,
    prunedList,
    message: totalPruned > 0 ? `已成功清理 ${totalPruned} 个失效幽灵工作树记录` : `未检测到失效工作树，所有记录均有效`
  };
}

// ==================== 内置轻量设置微服务 (Embedded Settings Server) ====================
function startEmbeddedSettingsServer() {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const urlPath = req.url.split('?')[0];

    if (req.method === 'GET' && (urlPath === '/' || urlPath === '/settings.html')) {
      if (fs.existsSync(settingsHtmlFile)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(settingsHtmlFile).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('settings.html not found in project directory');
      }
      return;
    }

    if (req.method === 'GET' && urlPath === '/api/config') {
      const config = getStoredConfig();
      config.ENABLE_AUTOSTART = isAutostartEnabled();

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        config,
        status: {
          serverPid: process.pid,
          daemonRunning: true,
          daemonPid: process.pid
        }
      }));
      return;
    }

    if (req.method === 'POST' && urlPath === '/api/config') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 1e6) req.destroy();
      });
      req.on('end', () => {
        try {
          const newConfig = JSON.parse(body);
          if (typeof newConfig.ENABLE_AUTOSTART === 'boolean') {
            setAutostart(newConfig.ENABLE_AUTOSTART);
          }
          const saved = saveStoredConfig(newConfig);

          // 核心优势：配置保存瞬间，直接内存热重载注入客户端！
          if (currentWs) {
            log('[Settings API] Instant hot-reload triggered by user config save');
            injectEnhancer(currentWs);
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            message: '配置已成功保存并同步落盘与热重载',
            config: saved
          }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: err?.message || 'Invalid JSON' }));
        }
      });
      return;
    }

    // ==================== 工作树管理 API 接口 ====================
    if (req.method === 'POST' && urlPath === '/api/worktree/purge') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 1e6) req.destroy();
      });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const result = executePurgeWorktree(payload);
          res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: err?.message || 'Internal error' }));
        }
      });
      return;
    }

    if (req.method === 'POST' && urlPath === '/api/worktree/prune-invalid') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 1e6) req.destroy();
      });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const result = executePruneInvalidWorktrees(payload);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: err?.message || 'Internal error' }));
        }
      });
      return;
    }

    if (req.method === 'POST' && urlPath === '/api/open-folder') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 1e6) req.destroy();
      });
      req.on('end', () => {
        try {
          const { path: rawPath, folderUri } = JSON.parse(body || '{}');
          const target = uriToLocalPath(folderUri || rawPath);
          if (target && fs.existsSync(target)) {
            if (fs.statSync(target).isDirectory()) {
              exec(`explorer.exe "${target}"`);
            } else {
              exec(`explorer.exe /select,"${target}"`);
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, target }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: '目录不存在', target }));
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: err?.message || 'Internal error' }));
        }
      });
      return;
    }

    if (req.method === 'POST' && urlPath === '/api/open-terminal') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 1e6) req.destroy();
      });
      req.on('end', () => {
        try {
          const { path: rawPath, folderUri } = JSON.parse(body || '{}');
          let target = uriToLocalPath(folderUri || rawPath);
          if (target && fs.existsSync(target)) {
            if (!fs.statSync(target).isDirectory()) {
              target = path.dirname(target);
            }
            exec(`wt.exe -d "${target}"`, (err) => {
              if (err) {
                const escaped = target.replace(/'/g, "''");
                exec(`start powershell.exe -NoExit -Command "Set-Location -LiteralPath '${escaped}'"`);
              }
            });
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, target }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: '目标路径不存在', target }));
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: err?.message || 'Internal error' }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log(`[Settings Server] Port ${SETTINGS_PORT} is in use, attempting graceful takeover...`);
      const probeReq = http.get(`http://127.0.0.1:${SETTINGS_PORT}/api/config`, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const oldPid = json?.status?.daemonPid || json?.status?.serverPid;
            if (oldPid && oldPid !== process.pid) {
              log(`[Settings Server] Terminating previous daemon PID: ${oldPid}`);
              try { process.kill(oldPid, 'SIGKILL'); } catch (_) {}
              try { execSync(`taskkill /F /PID ${oldPid}`, { stdio: 'ignore' }); } catch (_) {}
              setTimeout(() => {
                server.listen(SETTINGS_PORT, '127.0.0.1', () => {
                  log(`[Settings Server] Embedded settings server listening at http://127.0.0.1:${SETTINGS_PORT}`);
                });
              }, 400);
            }
          } catch (e) {
            log('[Settings Server] Failed to parse takeover response:', e.message);
          }
        });
      });
      probeReq.on('error', (e) => {
        log('[Settings Server] Probe error during takeover:', e.message);
      });
    } else {
      log('[Settings Server Error]:', err.message);
    }
  });

  server.listen(SETTINGS_PORT, '127.0.0.1', () => {
    log(`[Settings Server] Embedded settings server listening at http://127.0.0.1:${SETTINGS_PORT}`);
  });
}
startEmbeddedSettingsServer();
