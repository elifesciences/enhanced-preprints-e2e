import { test, expect } from '@playwright/test';
import axios from 'axios';
import { Client } from '@temporalio/client';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import {
  createTemporalClient, generateWorkflowId, startWorkflow, stopWorkflow,
} from '../utils/temporal';

test.describe('revised preprint', () => {
  const minioClient = createS3Client();
  let temporal: Client;
  const name = 'revised';
  let workflowId: string;

  // eslint-disable-next-line no-empty-pattern
  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    workflowId = generateWorkflowId(name);

    await startWorkflow(name, workflowId, temporal);
  });

  test.afterAll(async () => {
    await Promise.all([
      stopWorkflow(workflowId, temporal),
      deleteS3EppFolder(minioClient, `${name}-msid`),
      axios.delete(`${config.api_url}/preprints/${name}-msidv1`),
      axios.delete(`${config.api_url}/preprints/${name}-msidv2`),
    ]);
  });

  test('revised preprints are available', async ({ page }) => {
    // For the test to succeed, we need to wait for both versions to be imported
    await expect(async () => {
      const responsev2 = await page.goto(`${config.client_url}/reviewed-preprints/${name}-msidv2`);
      expect(responsev2?.status()).toBe(200);
    }).toPass();
    await expect(async () => {
      const responsev1 = await page.goto(`${config.client_url}/reviewed-preprints/${name}-msidv1`);
      expect(responsev1?.status()).toBe(200);
    }).toPass();

    await expect(page.locator('.article-status__text')).toHaveText('Published from the original preprint after peer review and assessment by eLife.');
    await expect(page.locator('.descriptors__identifier')).toHaveText(`https://doi.org/10.7554/eLife.${name}-msid.1`);
    await expect(page.locator('h1.title')).toHaveText('OpenApePose: a database of annotated ape photographs for pose estimation');

    // 3rd child is 2nd description details (<dd>) from the timeline definition list
    const reviewTimelinePageLocatorV1 = page.locator('.review-timeline__list>.review-timeline__event:nth-child(3)');
    await expect(reviewTimelinePageLocatorV1).toHaveText('Reviewed preprint version 1');
    await expect(reviewTimelinePageLocatorV1.locator('+.review-timeline__date .review-timeline__description')).toContainText('(this version)');

    await page.getByLabel('Reviewed preprint version 2').click();
    await page.waitForURL(`${config.client_url}/reviewed-preprints/${name}-msidv2`);
    await expect(page.locator('h1.title')).toHaveText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await expect(page.locator('.article-status__text')).toHaveText('Revised by authors after peer review.');
    await expect(page.locator('.descriptors__identifier')).toHaveText(`https://doi.org/10.7554/eLife.${name}-msid.2`);

    // 1st child is 1st description details (<dd>) from the timeline definition list
    const reviewTimelinePageLocatorV2 = page.locator('.review-timeline__list>.review-timeline__event:nth-child(1)');
    await expect(reviewTimelinePageLocatorV2).toHaveText('Reviewed preprint version 2');
    await expect(reviewTimelinePageLocatorV2.locator('+.review-timeline__date .review-timeline__description')).toContainText('(this version)');

    await page.getByLabel('Reviewed preprint version 1').click();
    await page.waitForURL(`${config.client_url}/reviewed-preprints/${name}-msidv1`);
    await expect(page.locator('.descriptors__identifier')).toHaveText(`https://doi.org/10.7554/eLife.${name}-msid.1`);

    const responseMsid = await page.goto(`${config.client_url}/reviewed-preprints/${name}-msid`);
    expect(responseMsid?.status()).toBe(200);
    await expect(page.locator('h1.title')).toHaveText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await expect(page.locator('.article-status__text')).toHaveText('Revised by authors after peer review.');
    await expect(page.locator('.descriptors__identifier')).toHaveText(`https://doi.org/10.7554/eLife.${name}-msid.2`);

    // 1st child is 1st description details (<dd>) from the timeline definition list
    const reviewTimelinePageLocatorLatest = page.locator('.review-timeline__list>.review-timeline__event:nth-child(1)');
    await expect(reviewTimelinePageLocatorLatest).toHaveText('Reviewed preprint version 2');
    await expect(reviewTimelinePageLocatorLatest.locator('+.review-timeline__date .review-timeline__description')).toContainText('(this version)');
  });
});
