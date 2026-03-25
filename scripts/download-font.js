#!/usr/bin/env node
/**
 * 下載 Noto Sans CJK 字體
 * 用於 PDF 支持日文/中文
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 使用 Google Fonts 的 CDN
const fontUrl = 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.0/files/noto-sans-jp-latin-400-normal.woff';
const fontPath = path.join(__dirname, 'NotoSansJP-Regular.ttf');

console.log('正在下載 Noto Sans JP 字體...');

// 改用另一個來源
const alternativeUrl = 'https://raw.githubusercontent.com/google/fonts/main/apache/notosansjp/NotoSansJP-Regular.ttf';

https.get(alternativeUrl, (response) => {
  if (response.statusCode !== 200 && response.statusCode !== 302) {
    console.error(`下載失敗：${response.statusCode}`);
    console.log('請手動下載字體文件並放到 lib/fonts/ 目錄');
    console.log('下載連結：https://github.com/google/fonts/tree/main/apache/notosansjp');
    process.exit(1);
  }

  const file = fs.createWriteStream(fontPath);
  response.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log('✅ 字體下載完成！');
    console.log(`📁 字體位置：${fontPath}`);
    console.log('');
    console.log('⚠️ 注意：如果字體文件太大，建議使用以下方法：');
    console.log('1. 手動下載 NotoSansJP-Regular.ttf');
    console.log('2. 放到 lib/fonts/ 目錄');
    console.log('3. 確保文件大小 < 25MB（Vercel Serverless Function 限制）');
  });
}).on('error', (err) => {
  fs.unlink(fontPath, () => {});
  console.error('❌ 下載錯誤:', err.message);
  console.log('');
  console.log('請手動下載字體文件：');
  console.log('1. 前往 https://github.com/google/fonts/tree/main/apache/notosansjp');
  console.log('2. 下載 NotoSansJP-Regular.ttf');
  console.log('3. 放到 lib/fonts/ 目錄');
  process.exit(1);
});
