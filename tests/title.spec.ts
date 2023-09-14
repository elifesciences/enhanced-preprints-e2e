import { test, expect } from '@playwright/test';
import { Client } from '@temporalio/client';
import axios from 'axios';
import { exec } from 'child_process';
import util from 'util';

test.describe('that it displays title on the page', () => {
  const temporal = new Client();

  test.beforeEach(async () => {
    // Change state of wiremock to 'title'.
    await axios.put('http://localhost:8080/__admin/scenarios/docmap/state', {
      state: 'title',
    });

    await temporal.workflow.start('pollDocMapIndex', {
      taskQueue: 'epp',
      workflowId: 'title',
      args: ['http://wiremock:8080/docmaps', '1 minute'],
    });
  });

  test.afterEach(async () => {
    // Reset state of wiremock.
    await axios.put('http://localhost:8080/__admin/scenarios/docmap/state');

    // Terminate workflow.
    await temporal.workflow.getHandle('title').terminate('end of title test');

    // Run docker compose commands to reset for next run.
    const composeOutputs = await Promise.all(['loadbucket', 'resetdb']
      .map(async (service) => util.promisify(exec)(`docker compose run ${service}`).then(({ stdout }) => stdout)));

    // Restart temporal service.
    composeOutputs.push(await util.promisify(exec)('docker compose restart temporal').then(({ stdout }) => `Temporal restarted! ${stdout}`));

    // eslint-disable-next-line no-console
    composeOutputs.forEach((output) => console.log('Output ->', output));
  });

  test('display the title', async ({ page }) => {
    await expect(async () => {
      const response = await page.goto('http://localhost:3001/reviewed-preprints/000001v1');
      expect(response?.status()).toBe(200);
    }).toPass();
    await expect(page.locator('h1.title')).toBeVisible();
    await expect(page.locator('h1.title')).toContainText('OpenApePose: a database of annotated ape photographs for pose estimation');
  });
});
