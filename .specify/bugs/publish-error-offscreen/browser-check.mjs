import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const dir = process.argv[2];
const catalog = JSON.parse(readFileSync(`${dir}/catalog.json`, 'utf8'));
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);

async function run(width, height, tag) {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
  const page = await browser.newPage({ viewport: { width, height } });
  let posts = 0;
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/api/auth/me') return json(200, { data: { username: 'tester' } });
    if (path === '/api/document-types') return json(200, { data: catalog });
    if (path === '/api/form-connections' && req.method() === 'POST') {
      posts += 1;
      if (posts === 1) return json(503, { error: 'Not configured', message: 'Something went wrong on our side, so nothing was saved. Contact an administrator and give them the error ID.', error_id: 'e2e-error-id-123' });
      if (posts === 2) return route.abort('connectionrefused');
      return json(201, { data: { id: 'conn-1' }, message: 'Form connection created' });
    }
    if (path === '/api/form-connections') return json(200, { data: [] });
    return json(404, { error: 'Not found', message: 'Not found' });
  });
  await page.goto('http://localhost:5173/form-connections/new');
  await page.fill('#connection-name', 'Parking permit');
  await page.fill('#connection-form-id', 'PK-1');
  await page.getByRole('button', { name: 'Continue' }).click();
  for (const key of ['pid', 'mdl']) {
    await page.click(`#document-picker-${key}`);
    await page.click(`#document-${key}-all`);
  }
  // Scroll whatever scrolls the step to its bottom
  const scrolled = await page.evaluate(() => {
    const els = [...document.querySelectorAll('main *')].filter((el) => {
      const s = getComputedStyle(el);
      return /auto|scroll/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1 && !el.closest('dialog') && el.querySelector('#document-mdl-all');
    });
    const el = els[els.length - 1];
    el.scrollTop = el.scrollHeight;
    window.__scroller = el;
    return el.scrollTop;
  });
  check(`${tag}: step is scrolled`, scrolled > 0, `scrollTop ${scrolled}`);
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm and publish' }).click();
  const alert = page.locator('dialog[open] [role="alert"]');
  await alert.waitFor();
  const info = await page.evaluate(() => {
    const a = document.querySelector('dialog[open] [role="alert"]');
    const r = a.getBoundingClientRect();
    const d = document.querySelector('dialog');
    const buttons = [...d.querySelectorAll('footer button')].map((b) => { const br = b.getBoundingClientRect(); return { text: b.textContent.trim(), inView: br.top >= 0 && br.bottom <= innerHeight && br.left >= 0 && br.right <= innerWidth }; });
    return {
      inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
      text: a.textContent,
      describedBy: d.getAttribute('aria-describedby'),
      pageAlerts: [...document.querySelectorAll('[role="alert"]')].filter((el) => !el.closest('dialog')).length,
      scrollTop: window.__scroller.scrollTop,
      buttons,
      dialogOverflowX: d.scrollWidth > d.clientWidth,
      pageOverflowX: document.documentElement.scrollWidth > innerWidth,
      focusInDialog: !!document.activeElement.closest('dialog'),
    };
  });
  check(`${tag}: 503 alert is in the open dialog and in view`, info.inView);
  check(`${tag}: 503 alert shows title, message and error ID`, /Couldn’t publish/.test(info.text) && /Something went wrong/.test(info.text) && /e2e-error-id-123/.test(info.text), info.text);
  check(`${tag}: dialog is described by the alert`, info.describedBy === 'publish-dialog-error publish-dialog-summary', info.describedBy);
  check(`${tag}: no alert on the page behind`, info.pageAlerts === 0, String(info.pageAlerts));
  check(`${tag}: scroll position kept`, info.scrollTop === scrolled, `${info.scrollTop}`);
  check(`${tag}: primary button reads "Try again"`, info.buttons.some((b) => b.text === 'Try again'), JSON.stringify(info.buttons.map((b) => b.text)));
  check(`${tag}: both buttons in view`, info.buttons.every((b) => b.inView));
  check(`${tag}: no horizontal overflow`, !info.dialogOverflowX && !info.pageOverflowX);
  check(`${tag}: focus stays in the dialog`, info.focusInDialog);
  await page.locator('dialog[open]').screenshot({ path: `${dir}/${tag}-dialog-503.png` });

  // Second attempt: network error, fallback text without an error ID
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.waitForFunction(() => /Nothing went live/.test(document.querySelector('dialog[open] [role="alert"]')?.textContent ?? ''));
  const t2 = await alert.textContent();
  check(`${tag}: network error shows the fallback without an error ID`, !/Error ID/.test(t2), t2);
  check(`${tag}: two POSTs so far`, posts === 2, String(posts));

  // "Check again" closes it and leaves nothing on the page
  await page.getByRole('button', { name: 'Check again' }).click();
  const after = await page.evaluate(() => ({
    open: document.querySelector('dialog').open,
    alerts: document.querySelectorAll('[role="alert"]').length,
    focus: document.activeElement.textContent.trim(),
  }));
  check(`${tag}: Check again closes the dialog`, !after.open);
  check(`${tag}: no alert left after closing`, after.alerts === 0, String(after.alerts));
  check(`${tag}: focus back on Publish`, after.focus === 'Publish', after.focus);

  // Reopening starts clean; Escape also clears
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  const reopened = await page.evaluate(() => ({
    alerts: document.querySelectorAll('dialog[open] [role="alert"]').length,
    label: [...document.querySelectorAll('dialog footer button')].pop().textContent.trim(),
  }));
  check(`${tag}: reopened dialog has no old error`, reopened.alerts === 0 && reopened.label === 'Confirm and publish', JSON.stringify(reopened));
  await page.getByRole('button', { name: 'Confirm and publish' }).click();
  await page.waitForURL('**/form-connections/conn-1');
  check(`${tag}: third attempt succeeds and opens the details`, true, page.url());
  await browser.close();
}

await run(1455, 900, 'desktop');
await run(390, 844, 'mobile');
console.log(results.join('\n'));
