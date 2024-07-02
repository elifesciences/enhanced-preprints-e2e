import { test } from '@playwright/test';
import axios from 'axios';
import { Client } from '@temporalio/client';
import { createS3Client } from '../utils/create-s3-client';
import { createS3StateFile } from '../utils/create-s3-state-file';
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

    await createS3StateFile(minioClient, name);
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
    await eppPage.gotoArticlePage({ version: 2 });
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.gotoArticlePage({ version: 1 });
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.assertArticleStatusText('Not revised');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.1');
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation');

    await eppPage.expandTimeline();

    await eppPage.assertTimelineDetailText(2, 'v1');
    await eppPage.assertTimelineEventThisVersion(2);

    await eppPage.navigateToVersion(2, true);
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.2');

    await eppPage.expandTimeline();

    await eppPage.assertTimelineDetailText(1, 'v2');
    await eppPage.assertTimelineEventThisVersion(1);

    await eppPage.navigateToVersion(1, true);
    await eppPage.assertDoi('https://doi.org/10.7554/000001.1');

    await eppPage.gotoArticlePage({ status: 200 });
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.2');

    await eppPage.expandTimeline();

    await eppPage.assertTimelineDetailText(1, 'v2');
    await eppPage.assertTimelineEventThisVersion(1);

    await eppPage.navigateToReviewsTab();
    await eppPage.assertPeerReviewProcess('revised');
  });
});
