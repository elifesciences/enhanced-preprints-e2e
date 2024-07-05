import { test } from '@playwright/test';
import { EppPage } from './page-objects/epp-page';
import { setupClientAndScheduleStores, setupTemporal, trashTemporal } from '../utils/setup-temporal';

test.describe('reviewed preprint with future published date', () => {
  const name = 'future-publish';
  const { minioClient, scheduleIds } = setupClientAndScheduleStores();

  test.beforeEach(async () => {
    const { scheduleId } = await setupTemporal({ name, s3Client: minioClient, duration: '10  minutes' });
    scheduleIds[name] = scheduleId;
  });

  test.afterEach(async () => {
    await trashTemporal({
      name,
      s3Client: minioClient,
      scheduleId: scheduleIds[name],
    });
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
