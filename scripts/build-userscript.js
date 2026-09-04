const fs = require('fs');
const path = require('path');

const corePath = path.join(__dirname, '../src/agy-enhancer.js');
const targetPath = path.join(__dirname, '../agy-read.user.js');

const header = `// ==UserScript==
// @name         Antigravity 阅读增强器 (agy-read)
// @namespace    https://antigravity.google/
// @version      1.0.0
// @description  优化 Antigravity 对话滚动体验：思考时正常滚动，思考完成输出内容时自动回滚到问题顶端，输入框上方提供向下直达底部按钮，右上角提供生效提示。
// @match        https://127.0.0.1:*/*
// @match        http://127.0.0.1:*/*
// @match        https://localhost:*/*
// @match        http://localhost:*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

`;

const core = fs.readFileSync(corePath, 'utf8');
fs.writeFileSync(targetPath, header + core, 'utf8');
console.log('User script generated successfully at: ' + targetPath);
