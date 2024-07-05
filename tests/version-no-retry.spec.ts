import { expect, test } from '@playwright/test';
import {
  createTemporalClient,
  getWorkflowHandle,
} from '../utils/temporal';
import { EppPage } from './page-objects/epp-page';
import { setupClientAndScheduleStores, setupTemporal, trashTemporal } from '../utils/setup-temporal';

test.describe('version no retry', () => {
  const name = 'version-no-retry';
  const {
    minioClient,
    scheduleIds,
    scheduleHandles,
    workflowIds,
  } = setupClientAndScheduleStores();

  test.beforeEach(async () => {
    const {
      scheduleId,
      scheduleHandle,
      workflowId,
    } = await setupTemporal({
      name,
      s3Client: minioClient,
      duration: '1 minute',
      docMapThreshold: 1,
    });
    scheduleIds[name] = scheduleId;
    scheduleHandles[name] = scheduleHandle;
    workflowIds[name] = workflowId;
  });

  test.afterEach(async () => {
    await trashTemporal(name, minioClient, scheduleIds[name], false);
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
