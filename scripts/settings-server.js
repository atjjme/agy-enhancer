/**
 * Antigravity 增强器 - 本地极简设置微服务 (On-Demand Settings Server)
 * 
 * 特性：
 * 1. 按需启动：平时不运行、0 进程、0 端口监听。只有双击 settings.bat 时才启动。
 * 2. 独立安全：仅监听 127.0.0.1:37210，仅用于提供 settings.html 和配置 API。
 * 3. 随用随关：支持在网页中一键退出关闭，且带有 20 分钟无活动自动超时退出机制，绝不滞留后台。
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const defaultAppData = process.env.APPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Roaming') : 'C:\\ProgramData');
const configFile = path.join(defaultAppData, 'antigravity', 'agy-enhancer-config.json');
const localConfigFile = path.resolve(__dirname, 'agy-enhancer-config.json');
const fallbackConfigFile = path.resolve(__dirname, '../agy-enhancer-config.json');
const settingsHtmlFile = path.resolve(__dirname, '../settings.html');
const SETTINGS_PORT = 37210;

const DEFAULT_CONFIG = {
  ENABLE_MASTER: true,
  ENABLE_AUTOSTART: false,
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

function log(...args) {
  console.log('[SettingsServer]', ...args);
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
      log('Configured autostart shortcut at:', shortcutPath);
      return true;
    } else {
      if (fs.existsSync(shortcutPath)) {
        fs.unlinkSync(shortcutPath);
        log('Removed autostart shortcut at:', shortcutPath);
      }
      return true;
    }
  } catch (e) {
    log('Autostart Error:', e.message);
    return false;
  }
}

function isDaemonRunning() {
  try {
    const out = execSync('powershell -NoProfile -Command "$p = Get-CimInstance Win32_Process -Filter \\"Name = \'node.exe\'\\" | Where-Object { $_.CommandLine -like \'*loader.js*\' }; if ($p) { $p.ProcessId }"', {
      encoding: 'utf8',
      timeout: 2500
    }).trim();
    const pid = parseInt(out, 10);
    return isNaN(pid) ? false : pid;
  } catch (e) {
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
    } else if (fs.existsSync(fallbackConfigFile)) {
      const raw = fs.readFileSync(fallbackConfigFile, 'utf8');
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
    log('Config Save Error:', e?.message || e);
    return null;
  }
}

// 自动闲置超时机制：20 分钟内无任何请求自动退出
let idleTimer = null;
function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    log('Settings server idle timeout (20 mins), exiting gracefully...');
    process.exit(0);
  }, 20 * 60 * 1000);
}
resetIdleTimer();

const server = http.createServer((req, res) => {
  resetIdleTimer();

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
    const daemonPid = isDaemonRunning();

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      config,
      status: {
        serverPid: process.pid,
        daemonRunning: !!daemonPid,
        daemonPid: daemonPid || null
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

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          message: '配置已成功保存并同步落盘',
          config: saved
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: err?.message || 'Invalid JSON' }));
      }
    });
    return;
  }

  // 退出并关闭设置服务
  if (req.method === 'POST' && urlPath === '/api/exit') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, message: '设置服务已安全退出并释放端口' }));
    log('Exit requested by Web UI. Exiting in 500ms...');
    setTimeout(() => process.exit(0), 500);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(SETTINGS_PORT, '127.0.0.1', () => {
  log(`Settings server started at http://127.0.0.1:${SETTINGS_PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    log(`Port ${SETTINGS_PORT} is already in use.`);
  } else {
    log('Server Error:', err.message);
  }
});
