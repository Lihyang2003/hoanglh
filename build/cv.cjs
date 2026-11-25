// node build/cv.cjs  ->  site/cv/Le-Huy-Hoang-CV.pdf (needs Chrome and playwright)
const { chromium } = require('C:/Users/Admin/AppData/Roaming/npm/node_modules/@playwright/test');
const fs = require('fs'), path = require('path');
(async () => {
  const out = path.join(__dirname, '../site/cv'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ channel: 'chrome' }), p = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  await p.goto('file:///' + path.join(__dirname, 'cv.html').replace(/\\/g, '/')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  console.log('content bottom', await p.evaluate(() => Math.round(document.body.lastElementChild.getBoundingClientRect().bottom)), 'of 1123');
  if (process.argv[2]) await p.screenshot({ path: process.argv[2] });
  await p.pdf({ path: path.join(out, 'Le-Huy-Hoang-CV.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true, tagged: true }); await b.close();
})();
