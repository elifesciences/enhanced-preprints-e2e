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
import { changeState, resetState } from '../utils/wiremock';
import { EppPage } from './page-objects/epp-page';

test.describe('publish, unpublish and republish preprint', () => {
  let temporal: Client;
  const name = 'previous-state';
  const scheduleId = generateScheduleId(name);
  const minioClient = createS3Client();

  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    await createS3StateFile(minioClient, name);
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
    const eppPage = new EppPage(page, name);
    await eppPage.gotoArticlePage();
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.assertTitleVisibility();
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation');
    await eppPage.assertAssessmentDoi('https://doi.org/10.7554/eLife.000001.1.sa3');

    await changeState(name, 'unpublished');

    // Wait for unpublished article to become unavailable
    await eppPage.gotoArticlePage();
    await eppPage.reloadAndAssertStatus(404);
    await eppPage.gotoArticlePage({ status: 404 });
    await eppPage.gotoPreviewPage({ version: 1, status: 200 });

    await resetState(name);

    await eppPage.gotoArticlePage({ version: 1 });
    await eppPage.reloadAndAssertStatus(200);
  });
});
