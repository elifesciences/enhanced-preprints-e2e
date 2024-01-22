import { test, expect } from '@playwright/test';
import axios from 'axios';
import { Client } from '@temporalio/client';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import {
  createTemporalClient, generateScheduleId, startScheduledImportWorkflow, stopScheduledImportWorkflow,
} from '../utils/temporal';
import { EppPage } from './page-objects/epp-page';

test.describe('versions', () => {
  const minioClient = createS3Client();
  let temporal: Client;
  const name = 'versions';
  let scheduleId: string;

  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async () => {
    temporal = await createTemporalClient();
    scheduleId = generateScheduleId(name);

    await startScheduledImportWorkflow(name, scheduleId, temporal);
  });

  test.afterEach(async () => {
    const tearDowns: Promise<any>[] = [
      stopScheduledImportWorkflow(scheduleId, temporal),
      deleteS3EppFolder(minioClient, `${name}-msid`),
      deleteS3EppFolder(minioClient, `state/${name}`),
    ];

    for (let i = 1; i <= 4; i += 1) {
      tearDowns.push(axios.delete(`${config.api_url}/preprints/${name}-msidv${i}`));
    }
    await Promise.all(tearDowns);
  });

  test('multiple versions of a preprint are available', async ({ page }) => {
    const eppPage = new EppPage(page, name);
    // For the test to succeed, we need to wait for all versions to be imported
    await eppPage.navigateToArticlePage(4)
    await expect(async () => {
      const responsev4 = await page.reload();
      expect(responsev4?.status()).toBe(200);
    }).toPass();
    await eppPage.navigateToArticlePage(3)
    await expect(async () => {
      const responsev3 = await page.reload();
      expect(responsev3?.status()).toBe(200);
    }).toPass();
    await eppPage.navigateToArticlePage(2)
    await expect(async () => {
      const responsev2 = await page.reload();
      expect(responsev2?.status()).toBe(200);
    }).toPass();
    await eppPage.navigateToArticlePage(1)
    await expect(async () => {
      const responsev1 = await page.reload();
      expect(responsev1?.status()).toBe(200);
    }).toPass();

    await eppPage.assertArticleStatus('Published from the original preprint after peer review and assessment by eLife.');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.1');
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation');

    // 7th child is 4th description details (<dd>) from the timeline definition list
    const reviewTimelinePageLocatorV1 = page.locator('.review-timeline__list>.review-timeline__event:nth-child(7)');
    await expect(reviewTimelinePageLocatorV1).toHaveText('Reviewed preprint version 1');
    await expect(reviewTimelinePageLocatorV1.locator('+.review-timeline__date .review-timeline__description')).toContainText('(this version)');

    await page.getByLabel('Reviewed preprint version 2').click();
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatus('Revised by authors after peer review.');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.2');

    // 5th child is 3rd description details (<dd>) from the timeline definition list
    const reviewTimelinePageLocatorV2 = page.locator('.review-timeline__list>.review-timeline__event:nth-child(5)');
    await expect(reviewTimelinePageLocatorV2).toHaveText('Reviewed preprint version 2');
    await expect(reviewTimelinePageLocatorV2.locator('+.review-timeline__date .review-timeline__description')).toContainText('(this version)');

    await page.getByLabel('Reviewed preprint version 3').click();
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatus('Revised by authors after peer review.');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.3');

    // 3rd child is 2nd description details (<dd>) from the timeline definition list
    const reviewTimelinePageLocatorV3 = page.locator('.review-timeline__list>.review-timeline__event:nth-child(3)');
    await expect(reviewTimelinePageLocatorV3).toHaveText('Reviewed preprint version 3');
    await expect(reviewTimelinePageLocatorV3.locator('+.review-timeline__date .review-timeline__description')).toContainText('(this version)');

    await page.getByLabel('Reviewed preprint version 4').click();
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatus('Revised by authors after peer review.');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.4');

    // 1st child is 1st description details (<dd>) from the timeline definition list
    const reviewTimelinePageLocatorV4 = page.locator('.review-timeline__list>.review-timeline__event:nth-child(1)');
    await expect(reviewTimelinePageLocatorV4).toHaveText('Reviewed preprint version 4');
    await expect(reviewTimelinePageLocatorV4.locator('+.review-timeline__date .review-timeline__description')).toContainText('(this version)');

    const responseMsid = await page.goto(`${config.client_url}/reviewed-preprints/${name}-msid`);
    expect(responseMsid?.status()).toBe(200);
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatus('Revised by authors after peer review.');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.4');

    // 1st child is 1st description details (<dd>) from the timeline definition list
    const reviewTimelinePageLocatorLatest = page.locator('.review-timeline__list>.review-timeline__event:nth-child(1)');
    await expect(reviewTimelinePageLocatorLatest).toHaveText('Reviewed preprint version 4');
    await expect(reviewTimelinePageLocatorLatest.locator('+.review-timeline__date .review-timeline__description')).toContainText('(this version)');
  });
});
