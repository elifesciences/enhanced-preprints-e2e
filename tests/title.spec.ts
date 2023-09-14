import { test, expect } from '@playwright/test';
import { Client } from '@temporalio/client';
import axios from 'axios';
import Dockerode from 'dockerode';
import DockerodeCompose from '@rkesters/dockerode-compose';

test.describe('that it displays title on the page', () => {
  const temporal = new Client();
  const dockerode = new Dockerode();
  const serviceResetbucket = new DockerodeCompose(dockerode, './docker-compose.reset.yaml', 'resetbucket');
  const serviceResetdb = new DockerodeCompose(dockerode, './docker-compose.reset.yaml', 'resetdb');

  test.beforeAll(async () => {
    // Change state of wiremock to 'title'
    await axios.put('http://localhost:8080/__admin/scenarios/docmap/state', {
      state: 'title',
    });

    await temporal.workflow.start('pollDocMapIndex', {
      taskQueue: 'epp',
      workflowId: 'title',
      args: ['http://wiremock:8080/docmaps', '1 minute'],
    });
  });

  test.afterAll(async () => {
    // Reset state
    await axios.put('http://localhost:8080/__admin/scenarios/docmap/state');

    await serviceResetbucket.up();
    await serviceResetdb.up();

    await temporal.workflow.getHandle('title').terminate('end of title test');
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
