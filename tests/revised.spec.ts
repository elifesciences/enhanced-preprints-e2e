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

test.describe('revised preprint', () => {
  const minioClient = createS3Client();
  let temporal: Client;
  const name = 'revised';
  let scheduleId: string;

  // eslint-disable-next-line no-empty-pattern
  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    scheduleId = generateScheduleId(name);

    await startScheduledImportWorkflow(name, scheduleId, temporal);
  });

  test.afterAll(async () => {
    await Promise.all([
      stopScheduledImportWorkflow(scheduleId, temporal),
      deleteS3EppFolder(minioClient, `${name}-msid`),
      deleteS3EppFolder(minioClient, `state/${name}`),
      axios.delete(`${config.api_url}/preprints/${name}-msidv1`),
      axios.delete(`${config.api_url}/preprints/${name}-msidv2`),
    ]);
  });

  test('revised preprints are available', async ({ page }) => {
    const eppPage = new EppPage(page, name);

    // For the test to succeed, we need to wait for both versions to be imported
    await eppPage.gotoArticlePage(2);
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.gotoArticlePage(1);
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.assertArticleStatusText('Published from the original preprint after peer review and assessment by eLife.');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.1');
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation');

    // 3rd child is 2nd description details (<dd>) from the timeline definition list
    const reviewTimelinePageLocatorV1 = page.locator('.review-timeline__list>.review-timeline__event:nth-child(3)');
    await expect(reviewTimelinePageLocatorV1).toHaveText('Reviewed preprint version 1');
    await expect(reviewTimelinePageLocatorV1.locator('+.review-timeline__date .review-timeline__description')).toContainText('(this version)');

    await eppPage.navigateToVersion(2);
    await page.waitForURL(`${config.client_url}/reviewed-preprints/${name}-msidv2`);
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors after peer review.');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.2');

    // 1st child is 1st description details (<dd>) from the timeline definition list
    const reviewTimelinePageLocatorV2 = page.locator('.review-timeline__list>.review-timeline__event:nth-child(1)');
    await expect(reviewTimelinePageLocatorV2).toHaveText('Reviewed preprint version 2');
    await expect(reviewTimelinePageLocatorV2.locator('+.review-timeline__date .review-timeline__description')).toContainText('(this version)');

    await eppPage.navigateToVersion(1);
    await page.waitForURL(`${config.client_url}/reviewed-preprints/${name}-msidv1`);
    await eppPage.assertDoi('https://doi.org/10.7554/000001.1');

    await eppPage.gotoArticlePage(undefined, 200);
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors after peer review.');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.2');

    // 1st child is 1st description details (<dd>) from the timeline definition list
    const reviewTimelinePageLocatorLatest = page.locator('.review-timeline__list>.review-timeline__event:nth-child(1)');
    await expect(reviewTimelinePageLocatorLatest).toHaveText('Reviewed preprint version 2');
    await expect(reviewTimelinePageLocatorLatest.locator('+.review-timeline__date .review-timeline__description')).toContainText('(this version)');
  });
});
