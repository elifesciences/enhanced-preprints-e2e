import { expect, test } from '@playwright/test';
import {
  createTemporalClient,
  getWorkflowHandle,
} from '../utils/temporal';
import { EppPage } from './page-objects/epp-page';
import { testSetup } from '../utils/test-setup';
import { testTearDown } from '../utils/test-tear-down';
import { testClientAndScheduleIds } from '../utils/test-client-and-schedule-ids';

test.describe('version no retry', () => {
  const name = 'version-no-retry';
  const {
    minioClient,
    scheduleIds,
    scheduleHandles,
    workflowIds,
  } = testClientAndScheduleIds();

  test.beforeEach(async () => {
    const {
      scheduleId,
      scheduleHandle,
      workflowId,
    } = await testSetup(name, minioClient, '1 minute', 1);
    scheduleIds[name] = scheduleId;
    scheduleHandles[name] = scheduleHandle;
    workflowIds[name] = workflowId;
  });

  test.afterAll(async () => {
    await testTearDown(name, minioClient, scheduleIds[name], false);
  });

  test('version 2 and 3 are published, even if no retryable error triggered for version 1', async ({ page }) => {
    const workflowHandle = getWorkflowHandle(workflowIds[name], await createTemporalClient());
    await expect(async () => {
      const workflowStatus = await workflowHandle.describe().then((wf) => wf.status.name);
      expect(workflowStatus).toBe('COMPLETED');
    }).toPass();

    const eppPage = new EppPage(page, name);

    await eppPage.gotoArticlePage({ version: 2 });
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.gotoArticlePage({ version: 3 });
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.gotoArticlePage({ version: 1 });
    await eppPage.reloadAndAssertStatus(404);
  });
});
