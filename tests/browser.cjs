'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.AIRA_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const results = [], errors = [];
const server = http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/Lucent-Next(?=\/)/, '');
    let file = path.resolve(dist, '.' + pathname);
    if (file !== dist && !file.startsWith(dist + path.sep)) return res.writeHead(403).end();
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.m4a': 'audio/mp4', '.webm': 'audio/webm' })[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
async function check(name, task) { await task(); results.push({ name, passed: true }); console.log('PASS', name); }
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.AIRA_BROWSER_CHANNEL ? { channel: process.env.AIRA_BROWSER_CHANNEL } : {}), ...(process.env.AIRA_BROWSER_PATH ? { executablePath: process.env.AIRA_BROWSER_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 1560, height: 1040 }, colorScheme: 'light' });
  // The flows below act as a visitor who has already left full screen once; immersive mode has its own check.
  await context.addInitScript(() => { try { sessionStorage.setItem('lucent:immersive:declined', '1'); } catch (_) {} });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', e => errors.push(e.message));
  const external = [];
  await context.route('**/*', async route => {
    if (route.request().url().startsWith(base)) return route.continue();
    external.push(route.request().url());
    await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Navigation target</title><p>Search routing test</p>' });
  });
  const home = async () => { await page.goto(base); await page.waitForFunction(() => document.querySelectorAll('#engineChips .chip').length === 4); };
  const bridge = (method, ...args) => page.evaluate(({ method, args }) => window.AiraBrowserBridge[method](...args), { method, args });
  const panel = async title => page.waitForFunction(title => document.querySelector('#ab-title')?.textContent === title, title);
  const close = async () => { if (await page.locator('.ab-overlay').count()) await page.keyboard.press('Escape'); };
  try {
    await home();
    await check('Reference profile, four engines, three shortcuts, Google default and blue action', async () => {
      assert.equal(await page.title(), 'Lucent · 灵感台');
      assert.equal(await page.locator('#profileName').textContent(), 'hydeclanspi');
      assert.equal(await page.locator('#profileSign').textContent(), '我真的是活着玩的。都别压力我。');
      assert.equal((await bridge('getSearchEngineState')).selectedEngineId, 'google');
      assert.deepEqual((await bridge('getShortcuts')).map(x => x.title), ['书签', 'Moodle', 'Claude Code']);
      assert.equal(await page.locator('#btnSystemSearch').evaluate(n => getComputedStyle(n).backgroundColor), 'rgb(10, 89, 247)');
      assert.equal(external.length, 0, 'Initial load must not contact remote sites');
    });
    await check('History opens a labeled modal, traps focus, and restores the trigger', async () => {
      await page.locator('#btnHistory').click(); await panel('历史记录');
      assert.match(await page.locator('.ab-dialog').innerText(), /样例不代表/);
      assert.equal(await page.locator('.page').evaluate(n => n.inert), true);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => !!document.activeElement.closest('.ab-dialog')), true);
      await close();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'btnHistory');
      assert.equal(await page.locator('.page').evaluate(n => n.inert), false);
    });
    await check('Settings theme changes persist across reload', async () => {
      await page.locator('#btnSettings').click(); await panel('设置');
      await page.locator('.ab-dialog').getByRole('button', { name: '深色', exact: true }).click();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      await page.reload(); await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      await page.locator('#btnSettings').click(); await panel('设置');
      await page.locator('.ab-dialog').getByRole('button', { name: '浅色', exact: true }).click(); await close();
    });
    await check('Add shortcut through the UI, persist it, reorder and delete', async () => {
      await page.locator('#shortcutGrid').getByText('添加', { exact: true }).click(); await panel('快捷方式');
      await page.locator('.ab-dialog').getByRole('button', { name: '添加网页', exact: true }).click(); await panel('添加快捷方式');
      await page.getByLabel('名称', { exact: true }).fill('Example <note>');
      await page.getByLabel('网址', { exact: true }).fill('https://example.com/');
      await page.locator('.ab-dialog').getByRole('button', { name: '保存', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#shortcutGrid').textContent.includes('Example <note>'));
      await page.reload(); await page.waitForFunction(() => document.querySelector('#shortcutGrid').textContent.includes('Example <note>'));
      assert.equal(await page.locator('#shortcutGrid note').count(), 0);
      const items = await bridge('getShortcuts'), added = items.find(x => x.title === 'Example <note>');
      await bridge('moveShortcutToTop', added.id); assert.equal((await bridge('getShortcuts'))[0].id, added.id);
      await assert.rejects(() => bridge('reorderShortcuts', ['missing']), /列表不完整/);
      await bridge('removeShortcut', added.id); assert.equal((await bridge('getShortcuts')).length, 3);
    });
    await check('Blank and IME composition submissions never navigate', async () => {
      const before = external.length;
      await page.locator('#searchInput').fill('   '); await page.locator('#searchInput').press('Enter');
      await page.locator('#searchInput').fill('输入中');
      await page.locator('#searchInput').evaluate(input => { input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); input.form.requestSubmit(); input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); });
      assert.equal(external.length, before); assert.equal(await page.locator('#searchInput').inputValue(), '输入中');
    });
    await check('Lightline plays before direct, encoded Google navigation; back restores a clean input', async () => {
      await page.locator('#searchInput').fill('  鸿蒙 lightline & + # 🙂  ');
      const started = Date.now();
      await page.locator('#btnSystemSearch').click();
      await page.waitForURL('https://www.google.com/search?*');
      assert.ok(Date.now() - started >= 250, 'Transition should precede navigation');
      assert.equal(new URL(page.url()).searchParams.get('q'), '鸿蒙 lightline & + # 🙂');
      assert.equal(external.filter(url => url.startsWith('https://www.google.com/search')).length, 1);
      await page.goBack(); await page.waitForFunction(() => !!window.AiraBrowserBridge);
      assert.equal(await page.locator('#searchInput').inputValue(), '');
      assert.equal(await page.locator('#searchInput').evaluate(n => n.defaultValue), '');
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lucent:browser:v1:history')));
      assert.equal(stored.length, 1); assert.match(stored[0].url, /google\.com\/search/);
    });
    await check('Bing selection, real URL routing and reduced-motion navigation', async () => {
      await bridge('setSearchEngine', 'bing'); await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('#searchInput').fill('lucent'); await page.locator('#searchInput').press('Enter');
      await page.waitForURL('https://www.bing.com/search?*'); assert.equal(new URL(page.url()).searchParams.get('q'), 'lucent');
      await home(); await bridge('setSearchEngine', 'google');
      await page.locator('#searchInput').fill('https://example.com/path?q=1#top'); await page.locator('#searchInput').press('Enter');
      await page.waitForURL('https://example.com/path?q=1#top'); await home();
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    });
    await check('Non-HTTP addresses cannot execute script', async () => {
      await bridge('search', 'javascript:window.__unsafe=true'); await panel('无法打开这个地址');
      assert.equal(await page.evaluate(() => window.__unsafe), undefined); assert.ok(page.url().startsWith(base)); await close();
    });
    await check('Privacy mode explains its boundary and pauses local navigation history', async () => {
      const before = await page.evaluate(() => JSON.parse(localStorage.getItem('lucent:browser:v1:history')).length);
      await page.locator('#btnPrivacy').click(); await panel('进入演示隐私模式');
      assert.match(await page.locator('.ab-dialog').innerText(), /不会开启浏览器无痕/);
      await page.locator('.ab-dialog').getByRole('button', { name: '进入演示隐私', exact: true }).click();
      assert.equal(await page.locator('html').getAttribute('data-privacy'), 'private');
      await bridge('search', 'private query'); await page.waitForURL('https://www.google.com/search?*'); await home();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('lucent:browser:v1:history')).length), before);
    });
    await check('Custom engine can be configured and used for real search routing', async () => {
      await bridge('setSearchEngine', 'hydeclanspi'); await panel('hydeclanspi');
      await page.getByLabel('搜索 URL 模板').fill('https://www.google.com/search?q={query}&udm=14');
      await page.locator('.ab-dialog').getByRole('button', { name: '保存并选用', exact: true }).click(); await panel('搜索设置'); await close();
      await bridge('search', 'custom & query'); await page.waitForURL('https://www.google.com/search?*');
      assert.equal(new URL(page.url()).searchParams.get('q'), 'custom & query'); assert.equal(new URL(page.url()).searchParams.get('udm'), '14');
      await home(); await bridge('setSearchEngine', 'google');
    });
    await check('Every host entry has a usable panel', async () => {
      for (const [method, title] of [['openTabs', '全部标签'], ['openBookmarks', '书签'], ['openDownloads', '下载管理'], ['openSavedPages', '我的网页'], ['scanQr', '扫一扫'], ['openUserScripts', '用户脚本']]) {
        await bridge(method); await panel(title); await close();
      }
    });
    await check('Profile edits and search-motion selection persist', async () => {
      await page.locator('#btnEditProfile').click(); await page.waitForSelector('.edit-root:not([hidden])');
      await page.locator('.edit-panel').first().getByPlaceholder('显示在名片上的名字').fill('hydeclanspi test');
      await page.locator('.edit-panel').first().getByRole('button', { name: '保存', exact: true }).click();
      await page.reload(); await page.waitForFunction(() => document.querySelector('#profileName').textContent === 'hydeclanspi test');
      await page.locator('#btnEditProfile').click(); await page.waitForSelector('.edit-root:not([hidden])');
      await page.locator('.edit-panel').first().getByRole('button', { name: '恢复默认', exact: true }).click();
      await page.keyboard.press('Escape');
      await page.locator('#btnSearchMotion').click(); await page.waitForSelector('.search-motion-sheet');
      assert.match(await page.locator('#sheet').innerText(), /一线入光/);
      assert.match(await page.locator('#sheet').innerText(), /近轨/);
      await page.locator('.sm-choice').filter({ has: page.locator('input[value="prism"]') }).click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('aira-profile-card:searchMotion')).variant === 'prism');
      await page.reload(); await page.locator('#btnSearchMotion').click();
      assert.equal(await page.locator('.sm-radio[value="prism"]').isChecked(), true);
      await page.locator('.sm-choice').filter({ has: page.locator('input[value="beam"]') }).click();
      await page.keyboard.press('Escape');
    });
    await check('Web assets work under a repository subpath', async () => {
      await page.goto(base + '/Lucent-Next/'); await page.waitForFunction(() => document.querySelectorAll('#engineChips .chip').length === 4);
      assert.equal(await page.title(), 'Lucent · 灵感台');
    });
    await check('Desktop, tablet and mobile stay within viewport; screenshots captured', async () => {
      // Review captures only; the documentation media are produced separately (see docs/MAINTAINING.md).
      const images = path.join(root, 'verification/screenshots');
      fs.mkdirSync(images, { recursive: true });
      // Capture clean defaults, not the interaction test session's records.
      await page.goto(base); await page.evaluate(() => localStorage.clear()); await home();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(images, 'home-light.jpg'), type: 'jpeg', quality: 88 });
      await page.locator('#btnHistory').click(); await panel('历史记录'); await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(images, 'history.jpg'), type: 'jpeg', quality: 88 }); await close();
      await bridge('openSettings'); await panel('设置'); await page.locator('.ab-dialog').getByRole('button', { name: '深色', exact: true }).click(); await close();
      await page.screenshot({ path: path.join(images, 'home-dark.jpg'), type: 'jpeg', quality: 88 });
      for (const size of [{ width: 1024, height: 768 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(size); await page.waitForTimeout(250);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        if (size.width < 900) {
          const tags = await page.locator('#tags').boundingBox(), history = await page.locator('#btnHistory').boundingBox();
          assert.ok(history.y >= tags.y + tags.height, 'Mobile history must not overlap profile tags');
        }
        await bridge('openHistory'); await panel('历史记录');
        const box = await page.locator('.ab-dialog').boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= size.width + 1 && box.y >= 0 && box.y + box.height <= size.height + 1);
        await close();
      }
      await page.locator('#searchInput').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(images, 'mobile.jpg'), type: 'jpeg', quality: 85 });
    });
    await check('Short landscape screens keep the history tag clear of the top bar', async () => {
      const gap = async size => {
        await page.setViewportSize(size); await home(); await page.waitForTimeout(700);
        return page.evaluate(() => ({ gap: document.getElementById('btnHistory').getBoundingClientRect().top - document.querySelector('.topbar-actions').getBoundingClientRect().bottom, card: Math.round(document.querySelector('.page > .card').getBoundingClientRect().top) }));
      };
      for (const size of [{ width: 1429, height: 763 }, { width: 1280, height: 720 }, { width: 1366, height: 768 }]) {
        assert.ok((await gap(size)).gap >= 12, `history tag must clear the top bar at ${size.width}×${size.height}`);
      }
      assert.equal((await gap({ width: 1560, height: 1040 })).card, 303, 'the tablet layout is untouched');
    });
    await check('Large screens go full screen on the first click; leaving is respected; F toggles', async () => {
      const fresh = await browser.newContext({ viewport: { width: 1560, height: 1040 } });
      await fresh.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
      const tab = await fresh.newPage();
      tab.on('pageerror', e => errors.push(e.message));
      await tab.goto(base); await tab.waitForFunction(() => document.querySelectorAll('#engineChips .chip').length === 4);
      await tab.waitForSelector('.lx-immersive-hint.is-visible');
      await tab.mouse.click(300, 900);
      await tab.waitForFunction(() => !!document.fullscreenElement);
      await tab.evaluate(() => document.exitFullscreen());
      await tab.waitForFunction(() => !document.fullscreenElement);
      await tab.mouse.click(300, 900); await tab.waitForTimeout(300);
      assert.equal(await tab.evaluate(() => !!document.fullscreenElement), false, 'after leaving, a click must not force full screen again');
      await tab.keyboard.press('f');
      await tab.waitForFunction(() => !!document.fullscreenElement);
      await tab.locator('#searchInput').click(); await tab.keyboard.press('f');
      assert.equal(await tab.locator('#searchInput').inputValue(), 'f', 'F types normally in the search field');
      assert.equal(await tab.evaluate(() => !!document.fullscreenElement), true);
      await fresh.close();
    });
    await check('The concept film renders any moment of its single timeline; Home is the button, the place is Lucent', async () => {
      const tab = await context.newPage();
      tab.on('pageerror', e => errors.push(e.message));
      await tab.setViewportSize({ width: 1920, height: 1080 });
      await tab.goto(base + '/film/?capture');
      await tab.waitForFunction(() => window.__film);
      await tab.evaluate(() => window.__film.ready);
      const film = (t) => tab.evaluate(t => { window.__film.seek(t); return {
        captions: [...document.querySelectorAll('.cap')].filter(n => n.style.visibility === 'visible' && Number(n.style.opacity) > 0.5).map(n => n.querySelector('.t').textContent),
        name: Number(document.getElementById('hmName').style.opacity), icon: Number(document.getElementById('hmIcon').getAttribute('opacity')),
        ring: Number(document.getElementById('ring').getAttribute('width')),
        beyond: document.getElementById('light').getContext('2d').getImageData(120, 120, 1, 1).data[3],
        lockup: Number(document.getElementById('lkLing').style.opacity), end: Number(document.getElementById('endmark').style.opacity)
      }; }, t);
      const { duration, marks } = await tab.evaluate(() => ({ duration: window.__film.duration, marks: window.__film.marks }));
      assert.ok(duration > 60 && duration < 120, 'about a minute and a half');
      const named = await film(marks.home + 1.6);
      assert.ok(named.name > 0.95, 'the button is named as the Home button');
      assert.ok(named.icon > 0.95, 'the Home button as everyone knew it stands inside the arc');
      assert.ok(named.ring > 1800, 'so close to the button that it is only an arc');
      assert.deepEqual((await film(13.5)).captions, ['今天，我们把这个承诺，做成了一个地方。']);
      const world = await film(marks.jump + 1.5);
      assert.deepEqual(world.captions, ['去往整个世界。']);
      assert.equal(world.beyond, 255, 'beyond the slit, the tunnel of windows fills the frame');
      assert.deepEqual(await tab.evaluate(() => [...document.querySelectorAll('.pillar b')].map(n => n.textContent)), ['工作台', '发射台', '控制台', '舞台'], 'the four places end on the stage');
      assert.ok((await film(marks.lock + 2.6)).lockup > 0.95, 'the place is named Lucent · 灵感台');
      assert.ok((await film(duration)).end > 0.99, 'the film ends on the mark');
      assert.equal(await tab.evaluate(() => document.body.textContent.includes('明白了吗')), false, 'the film never quizzes its audience');
      assert.deepEqual(await tab.evaluate(() => [...document.querySelectorAll('#score source')].map(n => n.getAttribute('src'))), ['./score.webm', './score.m4a'], 'the score, in Opus and in AAC');
      await tab.close();
    });
    await check('No uncaught browser exceptions during the tested flows', async () => assert.deepEqual(errors, []));
  } finally {
    fs.mkdirSync(path.join(root, 'verification'), { recursive: true });
    fs.writeFileSync(path.join(root, 'verification/browser-results.json'), JSON.stringify({ date: new Date().toISOString(), browser: 'Chromium', results, errors, boundary: 'External result pages are stubbed; verifies outgoing URL and animation ordering, not search-provider availability. No HarmonyOS acceptance.' }, null, 2) + '\n');
    await browser.close(); server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
