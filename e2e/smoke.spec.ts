import { expect, test } from '@playwright/test';

test('game boots without manifest 404 and exits loading state', async ({ page }) => {
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

  await expect(page.locator('.phase')).toContainText('Roll and absorb', { timeout: 10000 });
  await expect(page.locator('.hud')).toContainText('Score:');

  const manifestErrors = consoleErrors.filter((msg) => msg.includes('Failed to load manifest'));
  const manifestFailures = failedRequests.filter((msg) => msg.includes('assets.manifest.json'));

  expect(manifestErrors, `Console errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
  expect(manifestFailures, `Failed requests: ${failedRequests.join('\n')}`).toHaveLength(0);
});
