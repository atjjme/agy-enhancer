/**
 * Antigravity 阅读增强插件安装程序 (Installer)
 * 
 * 解决方案：
 * 由于 Antigravity 开启了 Electron 沙箱环境（sandbox: true），Preload 脚本内被禁用了 Node.js fs 模块。
 * 本安装程序直接将 src/agy-enhancer.js 的源码编译内联至 preload.js，
 * 并通过官方沙箱受支持的 webFrame.executeJavaScript 直接在主世界注入，彻底规避沙箱限制。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const defaultInstallDir = path.join(
  process.env.LOCALAPPDATA || 'C:\\Users\\Juste\\AppData\\Local',
  'Programs',
  'antigravity',
  'resources'
);

const asarPath = path.join(defaultInstallDir, 'app.asar');
const backupAsarPath = path.join(defaultInstallDir, 'app.asar.original');
const enhancerSourceFile = path.resolve(__dirname, '../src/agy-enhancer.js');

console.log('====================================================');
console.log('    Antigravity 阅读增强器一键安装脚本 (agy-read)   ');
console.log('====================================================\n');

console.log('[1/4] 检测 Antigravity 路径: ' + defaultInstallDir);

if (!fs.existsSync(asarPath) && !fs.existsSync(backupAsarPath)) {
  console.error('❌ 未找到 app.asar，请确认已安装 Antigravity 客户端。');
  process.exit(1);
}

// 1. 备份原版 app.asar
if (!fs.existsSync(backupAsarPath)) {
  console.log('[2/4] 备份原版 app.asar -> app.asar.original ...');
  fs.copyFileSync(asarPath, backupAsarPath);
} else {
  console.log('[2/4] 检测到已存在原版备份 app.asar.original，基于原版制作补丁。');
}

// 2. 读取 enhancer 源码
if (!fs.existsSync(enhancerSourceFile)) {
  console.error('❌ 未找到增强器源码: ' + enhancerSourceFile);
  process.exit(1);
}
const enhancerCode = fs.readFileSync(enhancerSourceFile, 'utf8');

// 3. 读取基准 asar 并提取原版 preload.js
console.log('[3/4] 正在内联编译并注入增强器至 app.asar...');
const baseAsarBuf = fs.readFileSync(backupAsarPath);
const origHeaderSize = baseAsarBuf.readUInt32LE(12);
const origHeader = JSON.parse(baseAsarBuf.subarray(16, 16 + origHeaderSize).toString('utf8'));
const origPayload = baseAsarBuf.subarray(16 + origHeaderSize);

const origPreloadEntry = origHeader.files.dist.files['preload.js'];
const origPreloadOffset = parseInt(origPreloadEntry.offset, 10);
const origPreloadContent = origPayload.subarray(origPreloadOffset, origPreloadOffset + origPreloadEntry.size).toString('utf8');

// 构造沙箱兼容的注入挂载点（0 依赖、免 fs、webFrame 注入）
const injectionCode = `
// ==================== [agy-read] 智能阅读增强插件挂载点 ====================
try {
  const agyCode = ${JSON.stringify(enhancerCode)};
  function runAgyEnhancer() {
    try {
      if (typeof electron_1 !== 'undefined' && electron_1.webFrame) {
        electron_1.webFrame.executeJavaScript(agyCode);
      }
    } catch (e) {
      console.error('[agy-read preload] 注入执行异常:', e);
    }
  }

  // 沙箱环境立即执行，由代码内部安全守卫 DOM 就绪
  runAgyEnhancer();
} catch (outerErr) {
  console.error('[agy-read preload] 初始化异常:', outerErr);
}
// =========================================================================
`;

const newPreloadContent = origPreloadContent + '\n' + injectionCode;
const newPreloadBuf = Buffer.from(newPreloadContent, 'utf8');
const newPreloadSize = newPreloadBuf.length;
const newPreloadOffset = origPayload.length;
const sha256 = crypto.createHash('sha256').update(newPreloadBuf).digest('hex');

// 更新 header
origHeader.files.dist.files['preload.js'] = {
  size: newPreloadSize,
  offset: String(newPreloadOffset),
  integrity: {
    algorithm: 'SHA256',
    hash: sha256,
    blockSize: 4194304,
    blocks: [sha256]
  }
};

const newHeaderJson = JSON.stringify(origHeader);
let newHeaderBuf = Buffer.from(newHeaderJson, 'utf8');

// 4 字节对齐
const remainder = newHeaderBuf.length % 4;
if (remainder !== 0) {
  newHeaderBuf = Buffer.concat([newHeaderBuf, Buffer.alloc(4 - remainder, 0)]);
}

const newHeaderSize = newHeaderBuf.length;
const headerPrefix = Buffer.alloc(16);
headerPrefix.writeUInt32LE(4, 0);
headerPrefix.writeUInt32LE(newHeaderSize + 8, 4);
headerPrefix.writeUInt32LE(newHeaderSize + 4, 8);
headerPrefix.writeUInt32LE(newHeaderSize, 12);

const finalAsarBuf = Buffer.concat([
  headerPrefix,
  newHeaderBuf,
  origPayload,
  newPreloadBuf
]);

fs.writeFileSync(asarPath, finalAsarBuf);
console.log('  -> 补丁成功编译并注入至 app.asar！');

console.log('\n[4/4] 🎉 安装成功！');
console.log('----------------------------------------------------');
console.log('由于 Antigravity 运行在沙箱环境，源码已直接内联编译至 preload。');
console.log('以后您在记事本修改 src/agy-enhancer.js 后，只需双击 install.bat（耗时仅0.5秒），');
console.log('然后在客户端按下 Ctrl + R，即可永远稳定生效！');
console.log('----------------------------------------------------');
