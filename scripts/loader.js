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

const localConfigFile = path.resolve(__dirname, '../agy-enhancer-config.json');
const settingsHtmlFile = path.resolve(__dirname, '../settings.html');
const SETTINGS_PORT = 37210;

const DEFAULT_CONFIG = {
  ENABLE_MASTER: true,
  ENABLE_AUTOSTART: true,
  ENABLE_STATUS_INDICATOR: true,
  ENABLE_CONTEXT_MENU: true,
  ENABLE_CONTEXT_MENU_SIDEBAR: true,
  ENABLE_CONTEXT_MENU_MESSAGES: true,
  ENABLE_CONTEXT_MENU_MEDIA: true,
  ENABLE_NAV_BUTTONS: true,
  ENABLE_CENTER_BOTTOM_BUTTON: false,
  ENABLE_PROJECT_ARCHIVER: true,
  ENABLE_BLOCK_QUOTE_POPUP: true,
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
      const vbsPath = path.resolve(__dirname, '../start-service-silent.vbs');
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
  let config = Object.assign({}, DEFAULT_CONFIG);
  try {
    if (fs.existsSync(configFile)) {
      const raw = fs.readFileSync(configFile, 'utf8');
      Object.assign(config, JSON.parse(raw));
    } else if (fs.existsSync(localConfigFile)) {
      const raw = fs.readFileSync(localConfigFile, 'utf8');
      Object.assign(config, JSON.parse(raw));
    }
  } catch (e) {}
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

function startSettingsServer() {
  const server = http.createServer((req, res) => {
    // 跨域支持，支持从任意本地路径或浏览器直接访问
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
      const autostart = isAutostartEnabled();
      config.ENABLE_AUTOSTART = autostart;
      const { branch } = getCurrentBranchInfo();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        config,
        status: {
          pid: process.pid,
          clientPort: lastPort,
          connected: !!(currentWs && currentWs.readyState === 1),
          branch
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
          saveStoredConfig(newConfig);

          // 立即热重载注入客户端
          if (currentWs) {
            log('[Settings] New configuration applied from Web UI, reinjecting enhancer...');
            injectEnhancer(currentWs);
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            message: '配置已成功保存并即时生效',
            config: getStoredConfig()
          }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: err?.message || 'Invalid JSON' }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  });

  server.listen(SETTINGS_PORT, '127.0.0.1', () => {
    log(`[Settings Dashboard] Local settings server ready at http://127.0.0.1:${SETTINGS_PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log(`[Settings Dashboard] Port ${SETTINGS_PORT} is already in use, assuming another daemon instance is serving settings.`);
    } else {
      log(`[Settings Dashboard Error]`, err?.message || err);
    }
  });
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

    ws.onopen = () => {
      isConnecting = false;
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
            const rawPath = text.slice('[AGY_REVEAL_PATH]'.length).trim();
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
            const rawPath = text.slice('[AGY_COPY_IMAGE]'.length).trim();
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
              log('Failed to copy image: ' + e.message);
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
    const prefix = `window.__AGY_BRANCH_TAG__ = ${JSON.stringify(tag)};\nwindow.__AGY_BRANCH_NAME__ = ${JSON.stringify(branch)};\nwindow.__AGY_CONFIG__ = ${JSON.stringify(config)};\nwindow.__AGY_STORED_SCROLL_POSITIONS__ = ${JSON.stringify(storedPositions)};\nwindow.__AGY_STORED_UNREAD_STATES__ = ${JSON.stringify(storedUnreadStates)};\n`;
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

// 启动本地配置管理微服务
startSettingsServer();

// 平衡轮询：未连接时每 1200ms 检测一次连接状态，每 1800ms 主动探测页面就绪状态
setInterval(connectAndAttach, 1200);
setInterval(checkPageReadiness, 1800);
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
