import { test } from '@playwright/test';
import { EppPage } from './page-objects/epp-page';
import { testTearDown } from '../utils/test-tear-down';
import { testClientAndScheduleIds } from '../utils/test-client-and-schedule-ids';
import { testSetup } from '../utils/test-setup';

test.describe('reviewed preprint with future published date', () => {
  const name = 'future-publish';
  const { minioClient, scheduleIds } = testClientAndScheduleIds();

  test.beforeAll(async () => {
    const { scheduleId } = await testSetup(name, minioClient, '10  minutes');
    scheduleIds[name] = scheduleId;
  });

  test.afterAll(async () => {
    await testTearDown(name, minioClient, scheduleIds[name], false);
  });

  test('test reviewed-preprint with future published date is not available until published time has passed', async ({ page }) => {
    const eppPage = new EppPage(page, name);
    // first wait for the preview to be published
    await eppPage.gotoPreviewPage({ version: 1 });
    await eppPage.reloadAndAssertStatus(200);

    // ensure the preprint isn't published
    await eppPage.gotoArticlePage({ version: 1, status: 404 });

    // then, wait for the reviewed preprint to be published (with the passage of time)
    await eppPage.gotoArticlePage({ version: 1 });
    await eppPage.reloadAndAssertStatus(200);
  });
});
