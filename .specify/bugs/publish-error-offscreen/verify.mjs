// Independent verification for bug publish-error-offscreen.
// Usage: node verify.mjs <base-url> <dir-with-catalog.json> <label>
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const [base, dir, label] = process.argv.slice(2);
const catalog = JSON.parse(readFileSync(`${dir}/catalog.json`, 'utf8'));
const out = [];
const log = (name, value) => out.push(`${label} | ${name} | ${JSON.stringify(value)}`);

const ERR_503 = {
  error: 'Not configured',
  message:
    'Something went wrong on our side, so nothing was saved. Contact an administrator and give them the error ID.',
  error_id: 'verify-503-id',
};
const ERR_400 = { error: 'Validation error', message: "Select at least one field for 'Personal ID'." };

async function setup(width, height, answers, { delayMs = 0 } = {}) {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
  const page = await browser.newPage({ viewport: { width, height } });
  const state = { posts: 0 };
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    const json = (status, body) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/api/auth/me') return json(200, { data: { username: 'tester' } });
    if (path === '/api/document-types') return json(200, { data: catalog });
    if (path === '/api/form-connections' && req.method() === 'POST') {
      const answer = answers[state.posts++] ?? [201, { data: { id: 'conn-1' } }];
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      if (answer === 'network') return route.abort('connectionrefused');
      return json(answer[0], answer[1]);
    }
    if (path === '/api/form-connections') return json(200, { data: [] });
    return json(404, { error: 'Not found', message: 'Not found' });
  });
  await page.goto(`${base}/form-connections/new`);
  await page.fill('#connection-name', 'Parking permit');
  await page.fill('#connection-form-id', 'PK-1');
  await page.getByRole('button', { name: 'Continue' }).click();
  for (const key of ['pid', 'mdl']) {
    await page.click(`#document-picker-${key}`);
    await page.click(`#document-${key}-all`);
  }
  // Scroll the step's scroller (body below split:, step body from split:) to its bottom
  const scrollTop = await page.evaluate(() => {
    const cands = [document.scrollingElement, ...document.querySelectorAll('main *')].filter(
      (el) =>
        el &&
        el.scrollHeight > el.clientHeight + 1 &&
        (el === document.scrollingElement || /auto|scroll/.test(getComputedStyle(el).overflowY)) &&
        !el.closest('dialog')
    );
    const el = cands[cands.length - 1];
    el.scrollTop = el.scrollHeight;
    window.__scroller = el;
    return el.scrollTop;
  });
  return { browser, page, state, scrollTop };
}

// Where the "Couldn’t publish" alert is, and whether a sighted user can see it
async function alertState(page) {
  return page.evaluate(() => {
    const alerts = [...document.querySelectorAll('[role="alert"]')].filter((a) =>
      /Couldn’t publish/.test(a.textContent)
    );
    const dialog = document.querySelector('dialog');
    const a = alerts[0];
    let visible = false;
    if (a) {
      const r = a.getBoundingClientRect();
      const cx = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
      const cy = Math.min(Math.max(r.top + 10, 0), innerHeight - 1);
      const inView = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
      const hit = document.elementFromPoint(cx, cy);
      visible = inView && !!hit && a.contains(hit);
    }
    const ae = document.activeElement;
    return {
      dialogOpen: !!dialog?.open,
      alertCount: alerts.length,
      alertInDialog: !!a && !!a.closest('dialog'),
      alertVisible: visible,
      alertText: a?.textContent ?? null,
      primaryLabel: dialog
        ? [...dialog.querySelectorAll('footer button')].pop().textContent.trim()
        : null,
      focus: ae ? `${ae.tagName}:${ae.textContent.trim().slice(0, 30)}` : null,
      focusInDialog: !!ae?.closest('dialog'),
      scrollTop: window.__scroller.scrollTop,
    };
  });
}

async function settle(page) {
  // Wait for the POST to resolve: either an alert appears or the button label leaves "Publishing…"
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll('dialog footer button')].some((b) =>
        /Publishing/.test(b.textContent)
      ) && [...document.querySelectorAll('[role="alert"]')].some((a) => /Couldn’t publish/.test(a.textContent)),
    null,
    { timeout: 10000 }
  );
  await page.waitForTimeout(150);
}

// 1. Reproduction: scrolled step, failed publish (503)
for (const [w, h, tag] of [
  [1455, 900, 'desktop'],
  [1024, 640, 'split'],
  [390, 844, 'mobile'],
]) {
  const { browser, page, scrollTop } = await setup(w, h, [[503, ERR_503]]);
  log(`${tag} repro: scrollTop before publish`, scrollTop);
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm and publish' }).click();
  await settle(page);
  const s = await alertState(page);
  log(`${tag} repro: after failed publish`, s);
  log(
    `${tag} repro: BUG REPRODUCES`,
    !(s.alertVisible && /verify-503-id/.test(s.alertText ?? ''))
  );
  await page.screenshot({ path: `${dir}/${label}-${tag}-after-503.png` });

  // 2. Escape after a failure (only meaningful when the dialog stayed open)
  if (s.dialogOpen) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    log(`${tag} escape: after Escape`, await alertState(page));
  }
  await browser.close();
}

// 3. A 400 from the API is shown in the dialog
{
  const { browser, page } = await setup(1024, 640, [[400, ERR_400]]);
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm and publish' }).click();
  await settle(page);
  const s = await alertState(page);
  log('400: after failed publish', { ...s, hasMessage: /Select at least one field/.test(s.alertText ?? ''), hasErrorId: /Error ID/.test(s.alertText ?? '') });
  await browser.close();
}

// 4. While the retry is in flight: "Publishing…", no stale alert, Escape doesn't close
{
  const { browser, page, state } = await setup(1455, 900, [[503, ERR_503]], { delayMs: 800 });
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm and publish' }).click();
  await settle(page);
  const before = await alertState(page);
  if (before.dialogOpen) {
    await page.getByRole('button', { name: 'Try again' }).click();
    await page.waitForTimeout(150);
    const inflight = await alertState(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    const afterEsc = await alertState(page);
    log('in-flight retry', { label: inflight.primaryLabel, alerts: inflight.alertCount, openAfterEscape: afterEsc.dialogOpen });
    await page.waitForURL('**/form-connections/conn-1', { timeout: 10000 });
    log('in-flight retry: success navigates', { url: page.url(), posts: state.posts });
  } else {
    log('in-flight retry', 'skipped: dialog closed after failure');
  }
  await browser.close();
}

// 5. Short windows: the taller dialog keeps its buttons reachable
for (const [w, h, tag] of [
  [1024, 480, 'short-desktop'],
  [360, 560, 'short-mobile'],
]) {
  const { browser, page } = await setup(w, h, [[503, ERR_503]]);
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm and publish' }).click();
  await settle(page);
  const m = await page.evaluate(() => {
    const d = document.querySelector('dialog');
    const dr = d.getBoundingClientRect();
    const btns = [...d.querySelectorAll('footer button')];
    // Scroll the dialog to its end, as a user would, then measure the buttons
    d.scrollTop = d.scrollHeight;
    const inView = btns.every((b) => {
      const r = b.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight + 0.5 && r.left >= 0 && r.right <= innerWidth + 0.5;
    });
    return {
      open: d.open,
      dialogHeight: Math.round(dr.height),
      viewport: innerHeight,
      dialogScrolls: d.scrollHeight > d.clientHeight,
      overflowY: getComputedStyle(d).overflowY,
      buttonsReachable: inView,
      pageOverflowX: document.documentElement.scrollWidth > innerWidth,
    };
  });
  log(`${tag}: dialog fit`, m);
  await page.screenshot({ path: `${dir}/${label}-${tag}.png` });
  await browser.close();
}

console.log(out.join('\n'));
