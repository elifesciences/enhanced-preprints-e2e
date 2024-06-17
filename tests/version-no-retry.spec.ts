import { expect, test } from '@playwright/test';
import axios from 'axios';
import { Client, ScheduleHandle } from '@temporalio/client';
import { createS3Client } from '../utils/create-s3-client';
import { createS3StateFile } from '../utils/create-s3-state-file';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import {
  createTemporalClient,
  generateScheduleId,
  getScheduleRunningWorkflows,
  getWorkflowHandle,
  startScheduledImportWorkflow,
  stopScheduledImportWorkflow,
} from '../utils/temporal';
import { EppPage } from './page-objects/epp-page';

test.describe('version no retry', () => {
  const minioClient = createS3Client();
  let temporal: Client;
  const name = 'version-no-retry';
  let scheduleId: string;
  let scheduleHandle: ScheduleHandle;
  let workflowId: string;

  // eslint-disable-next-line no-empty-pattern
  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    scheduleId = generateScheduleId(name);

    await createS3StateFile(minioClient, name);
    scheduleHandle = await startScheduledImportWorkflow(name, scheduleId, temporal, '1 minute', 1);
    [workflowId] = await getScheduleRunningWorkflows(scheduleHandle);
  });

  test.afterAll(async () => {
    await Promise.all([
      stopScheduledImportWorkflow(scheduleId, temporal),
      deleteS3EppFolder(minioClient, `${name}-msid`),
      deleteS3EppFolder(minioClient, `state/${name}`),
      axios.delete(`${config.api_url}/preprints/${name}-msidv2`),
    ]);
  });

  test('version 2 is published, even if no retryable error triggered for version 1', async ({ page }) => {
    const workflowHandle = getWorkflowHandle(workflowId, temporal);
    await expect(async () => {
      const workflowStatus = await workflowHandle.describe().then((wf) => wf.status.name);
      expect(workflowStatus).toBe('COMPLETED');
    }).toPass();

    const eppPage = new EppPage(page, name);

    await eppPage.gotoArticlePage({ version: 2 });
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.gotoArticlePage({ version: 1 });
    await eppPage.reloadAndAssertStatus(404);
  });
});
