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

test.describe('versions', () => {
  const minioClient = createS3Client();
  let temporal: Client;
  const name = 'versions';
  let scheduleId: string;

  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async () => {
    temporal = await createTemporalClient();
    scheduleId = generateScheduleId(name);

    await createS3StateFile(minioClient, name);
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
    await eppPage.gotoArticlePage({ version: 4 });
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.gotoArticlePage({ version: 3 });
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.gotoArticlePage({ version: 2 });
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.gotoArticlePage({ version: 1 });
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.assertArticleStatusText('Not revised');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.1');
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation');

    await eppPage.expandTimeline();

    await eppPage.assertTimelineDetailText(4, 'v1');
    await eppPage.assertTimelineEventThisVersion(4);

    await eppPage.navigateToVersion(2);
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.2');

    await eppPage.expandTimeline();

    await eppPage.assertTimelineDetailText(3, 'v2');
    await eppPage.assertTimelineEventThisVersion(3);

    await eppPage.navigateToVersion(3);
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.3');

    await eppPage.expandTimeline();

    await eppPage.assertTimelineDetailText(2, 'v3');
    await eppPage.assertTimelineEventThisVersion(2);

    await eppPage.navigateToVersion(4);
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.4');

    await eppPage.expandTimeline();

    await eppPage.assertTimelineDetailText(1, 'v4');
    await eppPage.assertTimelineEventThisVersion(1);

    await eppPage.gotoArticlePage({ status: 200 });
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.4');

    await eppPage.expandTimeline();

    await eppPage.assertTimelineDetailText(1, 'v4');
    await eppPage.assertTimelineEventThisVersion(1);
  });
});
