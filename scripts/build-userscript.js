const fs = require('fs');
const path = require('path');

const corePath = path.join(__dirname, '../src/agy-enhancer.js');
const targetPath = path.join(__dirname, 'agy-enhancer.user.js');

const header = `// ==UserScript==
// @name         Antigravity Enhancer (agy-enhancer)
// @namespace    https://antigravity.google/
// @version      1.0.0
// @description  Optimize scrolling experience for Antigravity: turn-based navigation, scroll memory, and unread tracking.
// @match        https://127.0.0.1:*/*
// @match        http://127.0.0.1:*/*
// @match        https://localhost:*/*
// @match        http://localhost:*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

`;

const { execSync } = require('child_process');

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

  const isMain = branch === 'master' || branch === 'main';
  const tag = isMain ? '' : ' (branch)';
  return { branch, isMain, tag };
}

const { branch, tag } = getCurrentBranchInfo();
const branchInjection = tag ? `window.__AGY_BRANCH_TAG__ = ${JSON.stringify(tag)};\nwindow.__AGY_BRANCH_NAME__ = ${JSON.stringify(branch)};\n` : '';

const core = fs.readFileSync(corePath, 'utf8');
fs.writeFileSync(targetPath, header + branchInjection + core, 'utf8');
console.log(`User script generated successfully [branch: ${branch || 'default'}, tag: ${tag || 'none'}] at: ${targetPath}`);
