import { test, expect } from '@playwright/test';
import axios from 'axios';
import { Client } from '@temporalio/client';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import {
  createTemporalClient, generateScheduleId, startScheduledImportWorkflow, stopScheduledImportWorkflow,
} from '../utils/temporal';
import { changeState, resetState } from '../utils/wiremock';
import { EppPage } from './page-objects/epp-page';

test.describe('publish, unpublish and republish preprint', () => {
  let temporal: Client;
  const name = 'previous-state';
  const scheduleId = generateScheduleId(name);
  const minioClient = createS3Client();

  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    await startScheduledImportWorkflow(name, scheduleId, temporal);
  });

  test.afterAll(async () => {
    await Promise.all([
      stopScheduledImportWorkflow(scheduleId, temporal),
      axios.delete(`${config.api_url}/preprints/${name}-msidv1`),
      deleteS3EppFolder(minioClient, `${name}-msid`),
      deleteS3EppFolder(minioClient, `state/${name}`),
      resetState(name),
    ]);
  });

  test('preprints can be unpublished and then republished', async ({ page }) => {
    const eppPage = new EppPage(page);
    await page.goto(`${config.client_url}/reviewed-preprints/${name}-msidv1`);
    await expect(async () => {
      const response1 = await page.reload();
      expect(response1?.status()).toBe(200);
    }).toPass();

    await eppPage.assertTitleVisibility();
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation');
    await eppPage.assertAssesmentDoi('https://doi.org/10.7554/eLife.000001.1.sa3');

    await changeState(name, 'unpublished');

    // Wait for unpublished article to become unavailable
    await page.goto(`${config.client_url}/reviewed-preprints/${name}-msidv1`);
    await expect(async () => {
      const response2 = await page.reload();
      expect(response2?.status()).toBe(404);
    }).toPass();
    const response3 = await page.goto(`${config.client_url}/reviewed-preprints/${name}-msid`);
    expect(response3?.status()).toBe(404);
    const response4 = await page.goto(`${config.client_url}/previews/${name}-msidv1`);
    expect(response4?.status()).toBe(200);

    await resetState(name);

    await page.goto(`${config.client_url}/reviewed-preprints/${name}-msidv1`);
    await expect(async () => {
      const response5 = await page.reload();
      expect(response5?.status()).toBe(200);
    }).toPass();
  });
});
