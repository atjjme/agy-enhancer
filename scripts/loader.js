/**
 * Antigravity 阅读增强器 - 终极安全守护服务 (Safe Background Service)
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

const activePortFile = path.join(
  process.env.APPDATA || 'C:\\Users\\Juste\\AppData\\Roaming',
  'antigravity',
  'DevToolsActivePort'
);

const scrollPositionsFile = path.join(
  process.env.APPDATA || 'C:\\Users\\Juste\\AppData\\Roaming',
  'antigravity',
  'agy-scroll-positions.json'
);

const unreadStatesFile = path.join(
  process.env.APPDATA || 'C:\\Users\\Juste\\AppData\\Roaming',
  'antigravity',
  'agy-unread-states.json'
);

const logFile = path.join(
  process.env.APPDATA || 'C:\\Users\\Juste\\AppData\\Roaming',
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

log('=== Antigravity 阅读增强器后台守护服务启动 ===');

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

    log(`检测到可用客户端页面 [${page.id}] ${page.title || 'Untitled'} (${page.url})`);
    if (page === chatPage) {
      log(`优先命中主聊天窗口，立即建立连接并接管！`);
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
      log(`CDP WebSocket 连接建立成功 [端口: ${port}]，发送 Page & Runtime 开启指令`);
      ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      // 连上后立即无缝注入
      injectEnhancer(ws);
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.method === 'Page.loadEventFired' || data.method === 'Page.frameNavigated') {
          log(`收到页面导航/加载事件 (${data.method})，执行即时重注`);
          setTimeout(() => injectEnhancer(ws), 60);
        } else if (data.method === 'Runtime.consoleAPICalled') {
          const text = data.params?.args?.[0]?.value;
          if (typeof text === 'string' && text.startsWith('[AGY_PERSIST_SCROLL]')) {
            const jsonStr = text.slice('[AGY_PERSIST_SCROLL]'.length);
            log(`保存滚动记忆落地到磁盘: ` + jsonStr);
            saveStoredScrollPositions(jsonStr);
          } else if (typeof text === 'string' && text.startsWith('[AGY_PERSIST_UNREAD]')) {
            const jsonStr = text.slice('[AGY_PERSIST_UNREAD]'.length);
            log(`保存未读状态落地到磁盘: ` + jsonStr);
            saveStoredUnreadStates(jsonStr);
          }
        } else if (data.id === 77777) {
          // 心跳探测返回：如果页面当前未就绪（如用户刚登录跳转、DOM 重新挂载）
          const isLoaded = data.result?.result?.value === true;
          if (!isLoaded) {
            log(`[主动巡检] 发现当前页面插件尚未渲染就绪，触发毫秒级主动注入！`);
            lastHeartbeatInjectTime = Date.now();
            injectEnhancer(ws);
          }
        }
      } catch (e) {}
    };

    ws.onclose = () => {
      log(`CDP 连接已断开，准备自动重连...`);
      currentWs = null;
      currentPageId = null;
      isConnecting = false;
      setTimeout(connectAndAttach, 100);
    };

    ws.onerror = (err) => {
      log(`CDP 连接发生错误:`, err?.message || err);
      isConnecting = false;
    };
  } catch (err) {
    isConnecting = false;
  }
}

// 主动巡检心跳：每 300ms 探测一次页面上增强器是否在正常运行，毫秒级响应登录跳转
function checkPageReadiness() {
  if (!currentWs || currentWs.readyState !== WebSocket.OPEN) return;
  if (Date.now() - lastHeartbeatInjectTime < 800) return;

  try {
    currentWs.send(JSON.stringify({
      id: 77777,
      method: 'Runtime.evaluate',
      params: {
        expression: `Boolean(window.__AGY_ENHANCER_LOADED__ && document.getElementById('agy-read-toast'))`,
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
  const tag = isMain ? '' : '（分支）';
  return { branch, isMain, tag };
}

function injectEnhancer(ws) {
  const targetWs = ws || currentWs;
  if (!targetWs || targetWs.readyState !== WebSocket.OPEN) return;
  try {
    if (!fs.existsSync(enhancerFile)) {
      log('[错误] 增强器源码文件不存在:', enhancerFile);
      return;
    }
    const { branch, tag } = getCurrentBranchInfo();
    const storedPositions = getStoredScrollPositions();
    const storedUnreadStates = getStoredUnreadStates();
    const positionCount = Object.keys(storedPositions).length;
    const unreadCount = Object.keys(storedUnreadStates).length;
    log(`>>> 正在向客户端窗口注入阅读增强脚本 (分支: ${branch || 'master'}, 历史记忆数: ${positionCount}, 未读数: ${unreadCount})`);
    const prefix = `window.__AGY_BRANCH_TAG__ = ${JSON.stringify(tag)};\nwindow.__AGY_BRANCH_NAME__ = ${JSON.stringify(branch)};\nwindow.__AGY_STORED_SCROLL_POSITIONS__ = ${JSON.stringify(storedPositions)};\nwindow.__AGY_STORED_UNREAD_STATES__ = ${JSON.stringify(storedUnreadStates)};\n`;
    const code = prefix + fs.readFileSync(enhancerFile, 'utf8');
    targetWs.send(JSON.stringify({
      id: Math.floor(Math.random() * 100000),
      method: 'Runtime.evaluate',
      params: { expression: code, returnByValue: true }
    }));
    log(`<<< 脚本注入指令已成功发送给客户端页面！`);
  } catch (e) {
    log('[异常] injectEnhancer 发生错误:', e?.message || e);
  }
}

// 快速轮询：每 250ms 检查一次客户端与页面连接状态，每 350ms 主动探测页面就绪状态
setInterval(connectAndAttach, 250);
setInterval(checkPageReadiness, 350);
connectAndAttach();

// 监听源码变动：修改保存时瞬间同步到窗口
try {
  fs.watch(enhancerFile, (eventType) => {
    if (eventType === 'change' && currentWs) {
      setTimeout(() => injectEnhancer(currentWs), 80);
    }
  });
} catch (e) {}
