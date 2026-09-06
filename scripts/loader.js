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
const { execSync } = require('child_process');

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

function log(...args) {
  const now = new Date();
  const time = now.toLocaleDateString() + ' ' + now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
  const text = `[${time}] ` + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  console.log(text);
  try {
    fs.appendFileSync(logFile, text + '\n', 'utf8');
  } catch (e) {}
}

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
  const port = getActivePortInfo();
  if (!port) return;

  // 若端口未变且现有 WebSocket 处于打开状态，直接保持，无需重复向 CDP 端口发送 HTTP GET /json/list
  if (port === lastPort && currentWs && currentWs.readyState === WebSocket.OPEN) {
    return;
  }

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
        if (data.method === 'Page.loadEventFired') {
          log(`Page loaded (${data.method}), reinjecting...`);
          setTimeout(() => injectEnhancer(ws), 60);
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
                const brainConvoDir = path.join(homeDir, '.gemini', 'antigravity', 'brain', convoId);
                if (fs.existsSync(brainConvoDir)) {
                  try {
                    const files = fs.readdirSync(brainConvoDir);
                    const norm = title.toLowerCase().replace(/[^a-z0-9]/g, '');
                    let found = files.find(f => path.parse(f).name.toLowerCase().replace(/[^a-z0-9]/g, '') === norm);
                    if (!found) {
                      found = files.find(f => {
                        const b = path.parse(f).name.toLowerCase().replace(/[^a-z0-9]/g, '');
                        return (b.length >= 3 && norm.length >= 3 && (b.startsWith(norm) || norm.startsWith(b)));
                      });
                    }
                    if (found) {
                      cleanPath = path.join(brainConvoDir, found);
                    } else {
                      cleanPath = brainConvoDir;
                    }
                  } catch (e) {
                    cleanPath = brainConvoDir;
                  }
                } else {
                  cleanPath = path.join(homeDir, '.gemini', 'antigravity', 'brain');
                }
              }

              if (/^[a-zA-Z]:/.test(cleanPath)) {
                if (fs.existsSync(cleanPath)) {
                  if (fs.statSync(cleanPath).isDirectory()) {
                    execSync(`explorer.exe "${cleanPath}"`);
                  } else {
                    execSync(`explorer.exe /select,"${cleanPath}"`);
                  }
                } else if (fs.existsSync(path.dirname(cleanPath))) {
                  execSync(`explorer.exe "${path.dirname(cleanPath)}"`);
                } else {
                  execSync(`explorer.exe "${cleanPath}"`);
                }
              }
            } catch (e) {
              log(`Failed to reveal path: ` + e.message);
            }
          } else if (typeof text === 'string' && text.startsWith('[AGY_OPEN_EXTERNAL]')) {
            const url = text.slice('[AGY_OPEN_EXTERNAL]'.length).trim();
            log(`Opening external URL: ` + url);
            try {
              execSync(`start "" "${url}"`);
            } catch (e) {
              log(`Failed to open URL: ` + e.message);
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

function getCurrentBranchInfo() {
  let branch = '';
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 1000
    }).trim();
  } catch (e) {}

  if (!branch) {
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
    } catch (e2) {}
  }

  // 只要不是主干（master 或 main），一律视为分支并添加（分支）标签
  const isMain = branch === 'master' || branch === 'main';
  const tag = isMain ? '' : ' (branch)';
  return { branch, isMain, tag };
}

function injectEnhancer(ws) {
  const targetWs = ws || currentWs;
  if (!targetWs || targetWs.readyState !== WebSocket.OPEN) return;
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
    log(`>>> Injecting enhancer script (branch: ${branch || 'master'}, scroll memory: ${positionCount}, unread: ${unreadCount})`);
    const prefix = `window.__AGY_BRANCH_TAG__ = ${JSON.stringify(tag)};\nwindow.__AGY_BRANCH_NAME__ = ${JSON.stringify(branch)};\nwindow.__AGY_STORED_SCROLL_POSITIONS__ = ${JSON.stringify(storedPositions)};\nwindow.__AGY_STORED_UNREAD_STATES__ = ${JSON.stringify(storedUnreadStates)};\n`;
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

// 快速轮询：每 250ms 检查一次客户端与页面连接状态，每 1800ms 主动探测页面就绪状态
setInterval(connectAndAttach, 250);
setInterval(checkPageReadiness, 1800);
connectAndAttach();

// 监听源码变动：修改保存时瞬间同步到窗口
try {
  fs.watch(enhancerFile, (eventType) => {
    if (eventType === 'change' && currentWs) {
      setTimeout(() => injectEnhancer(currentWs), 80);
    }
  });
} catch (e) {}
