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

  const map = async (left: { x: number; y: number }, right: { x: number; y: number }) => (
    page.evaluate(([l, r]) => (
      (window as unknown as {
        __katamariDebug: {
          evaluateMapping: (
            leftInput: { x: number; y: number },
            rightInput: { x: number; y: number },
          ) => { forward: number; right: number; magnitude: number };
        };
      }).__katamariDebug.evaluateMapping(l, r)
    ), [left, right] as const)
  );

  const wMap = await map({ x: 0, y: 1 }, { x: 0, y: 0 });
  expect(wMap.forward).toBeGreaterThan(0);
  expect(wMap.right).toBeGreaterThan(0);
  const upMap = await map({ x: 0, y: 0 }, { x: 0, y: 1 });
  expect(upMap.forward).toBeGreaterThan(0);
  expect(upMap.right).toBeLessThan(0);
  const bothForwardMap = await map({ x: 0, y: 1 }, { x: 0, y: 1 });
  expect(Math.abs(bothForwardMap.right)).toBeLessThan(Math.abs(wMap.right));

  const sampleDrive = async (keys: string[]) => {
    for (const key of keys) {
      await page.keyboard.down(key);
    }
    await page.waitForTimeout(350);
    const sample = await page.evaluate(() => (
      (window as unknown as {
        __katamariDebug: {
          driveVector: () => {
            forward: number;
            right: number;
            intentForward: number;
            intentRight: number;
            leftActive: boolean;
            rightActive: boolean;
          };
        };
      }).__katamariDebug.driveVector()
    ));
    for (const key of keys) {
      await page.keyboard.up(key);
    }
    await page.waitForTimeout(140);
    return sample;
  };

  const wOnly = await sampleDrive(['w']);
  expect(wOnly.leftActive).toBeTruthy();
  expect(wOnly.rightActive).toBeFalsy();

  await page.keyboard.down('w');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(1200);
  const forwardRun = await page.evaluate(() => (
    (window as unknown as {
      __katamariDebug: {
        driveVector: () => {
          forward: number;
          right: number;
          intentForward: number;
          intentRight: number;
          leftActive: boolean;
          rightActive: boolean;
        };
      };
    }).__katamariDebug.driveVector()
  ));
  await page.keyboard.up('w');
  await page.keyboard.up('ArrowUp');
  expect(forwardRun.forward).toBeGreaterThan(2.5);

  const manifestErrors = consoleErrors.filter((msg) => msg.includes('Failed to load manifest'));
  const manifestFailures = failedRequests.filter((msg) => msg.includes('assets.manifest.json'));

  expect(manifestErrors, `Console errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
  expect(manifestFailures, `Failed requests: ${failedRequests.join('\n')}`).toHaveLength(0);
});
