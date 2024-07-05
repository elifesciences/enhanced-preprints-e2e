import { test } from '@playwright/test';
import { EppPage } from './page-objects/epp-page';
import { setupClientAndScheduleStores, setupTemporal, trashTemporal } from '../utils/setup-temporal';

test.describe('metrics', () => {
  const name = 'metrics';
  const { minioClient, scheduleIds } = setupClientAndScheduleStores();

  test.beforeAll(async () => {
    const { scheduleId } = await setupTemporal(name, minioClient);
    scheduleIds[name] = scheduleId;
  });

  test.afterAll(async () => {
    await trashTemporal(name, minioClient, scheduleIds[name], false);
  });

  test('metrics are displayed if present', async ({ page }) => {
    const eppPage = new EppPage(page, name);
    await eppPage.gotoArticlePage();
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.assertMetrics(42, 5, 6);
  });
});
