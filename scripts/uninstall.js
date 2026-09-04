/**
 * Antigravity 阅读增强插件卸载还原程序 (Uninstaller)
 * 
 * 功能：
 * 将 app.asar.original 恢复覆盖回 app.asar，使客户端彻底恢复为未被任何修改的官方原厂版本。
 */

const fs = require('fs');
const path = require('path');

const defaultInstallDir = path.join(
  process.env.LOCALAPPDATA || 'C:\\Users\\Juste\\AppData\\Local',
  'Programs',
  'antigravity',
  'resources'
);

const asarPath = path.join(defaultInstallDir, 'app.asar');
const backupAsarPath = path.join(defaultInstallDir, 'app.asar.original');
const appDir = path.join(defaultInstallDir, 'app');

console.log('====================================================');
console.log('    Antigravity 阅读增强器一键卸载脚本 (agy-read)   ');
console.log('====================================================\n');

// 1. 清理 app 目录（如果存在）
if (fs.existsSync(appDir)) {
  try {
    fs.rmSync(appDir, { recursive: true, force: true });
    console.log('  -> 已清理临时解包目录');
  } catch (e) {}
}

// 2. 还原原始 app.asar
if (fs.existsSync(backupAsarPath)) {
  console.log('正在还原官方原版 app.asar ...');
  try {
    fs.copyFileSync(backupAsarPath, asarPath);
    fs.unlinkSync(backupAsarPath);
    console.log('🎉 卸载成功！客户端已完全恢复至原厂状态。');
  } catch (err) {
    console.error('❌ 还原失败，请确认客户端完全退出后重试:', err.message);
  }
} else {
  console.log('提示: 未发现备份文件 app.asar.original，当前客户端已是原版状态。');
}
