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

const enhancerFile = path.resolve(__dirname, '../src/agy-enhancer.js');

let currentWs = null;
let lastPort = null;
let isConnecting = false;

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
      req.setTimeout(800, () => { req.destroy(); reject(new Error('timeout')); });
    });

    const page = pages.find(p => p.type === 'page' && p.webSocketDebuggerUrl);
    if (!page) {
      isConnecting = false;
      return;
    }

    lastPort = port;
    if (currentWs) {
      try { currentWs.close(); } catch (e) {}
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    currentWs = ws;

    ws.onopen = () => {
      isConnecting = false;
      ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      // 连上后立即注入
      setTimeout(() => injectEnhancer(ws), 100);
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.method === 'Page.loadEventFired' || data.method === 'Page.frameNavigated') {
          setTimeout(() => injectEnhancer(ws), 150);
        } else if (data.method === 'Runtime.consoleAPICalled') {
          const text = data.params?.args?.[0]?.value;
          if (typeof text === 'string' && text.startsWith('[AGY_PERSIST_SCROLL]')) {
            const jsonStr = text.slice('[AGY_PERSIST_SCROLL]'.length);
            saveStoredScrollPositions(jsonStr);
          }
        }
      } catch (e) {}
    };

    ws.onclose = () => {
      currentWs = null;
      isConnecting = false;
      // 页面刷新断开时，立即在 200ms 后尝试重连新页面
      setTimeout(connectAndAttach, 200);
    };

    ws.onerror = () => {
      isConnecting = false;
    };
  } catch (err) {
    isConnecting = false;
  }
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
    if (!fs.existsSync(enhancerFile)) return;
    const { branch, tag } = getCurrentBranchInfo();
    const storedPositions = getStoredScrollPositions();
    const prefix = `window.__AGY_BRANCH_TAG__ = ${JSON.stringify(tag)};\nwindow.__AGY_BRANCH_NAME__ = ${JSON.stringify(branch)};\nwindow.__AGY_STORED_SCROLL_POSITIONS__ = ${JSON.stringify(storedPositions)};\n`;
    const code = prefix + fs.readFileSync(enhancerFile, 'utf8');
    targetWs.send(JSON.stringify({
      id: Math.floor(Math.random() * 100000),
      method: 'Runtime.evaluate',
      params: { expression: code, returnByValue: true }
    }));
  } catch (e) {}
}

// 快速轮询：每 400ms 检查一次客户端与页面连接状态
setInterval(connectAndAttach, 400);
connectAndAttach();

// 监听源码变动：修改保存时瞬间同步到窗口
try {
  fs.watch(enhancerFile, (eventType) => {
    if (eventType === 'change' && currentWs) {
      setTimeout(() => injectEnhancer(currentWs), 80);
    }
  });
} catch (e) {}
