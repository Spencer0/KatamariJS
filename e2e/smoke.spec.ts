import { expect, test } from '@playwright/test';

test('game boots, shows loading progress, supports pause menu, and handles water respawn', async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`);
  });

  await page.goto('/');

  await expect(page.locator('.loading-shell')).toHaveCount(1);
  await expect(page.locator('.phase')).toContainText('Roll around the planet', { timeout: 10000 });
  await expect(page.locator('.hud')).toContainText('Score:');

  await page.keyboard.press('Escape');
  await expect(page.locator('.pause-menu')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('.pause-menu')).toBeHidden();

  await page.evaluate(() => {
    (window as unknown as { __katamariDebug: { forceWaterFall: () => void } }).__katamariDebug.forceWaterFall();
  });

  await expect(page.locator('.phase')).toContainText('Roll around the planet', { timeout: 5000 });

  const manifestErrors = consoleErrors.filter((msg) => msg.includes('Failed to load manifest'));
  const manifestFailures = failedRequests.filter((msg) => msg.includes('assets.manifest.json'));

  expect(manifestErrors, `Console errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
  expect(manifestFailures, `Failed requests: ${failedRequests.join('\n')}`).toHaveLength(0);
});
