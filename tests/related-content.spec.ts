import { test } from '@playwright/test';
import { EppPage } from './page-objects/epp-page';
import { setupClientAndScheduleStores, setupTemporal, trashTemporal } from '../utils/setup-temporal';

test.describe('reviewed preprint with related content', () => {
  const name = 'related-content';
  const { minioClient, scheduleIds } = setupClientAndScheduleStores();

  test.beforeEach(async () => {
    const { scheduleId } = await setupTemporal({ name, s3Client: minioClient });
    scheduleIds[name] = scheduleId;
  });

  test.afterEach(async () => {
    await trashTemporal({
      name,
      s3Client: minioClient,
      scheduleId: scheduleIds[name],
    });
  });

  test('related content is coming through', async ({ page }) => {
    const eppPage = new EppPage(page, name);
    await eppPage.gotoReviewsPage();
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.assertRelatedContent(
      1,
      'Related Insight',
      'Hearing: Letting the calcium flow',
      'https://doi.org/10.7554/eLife.96139',
      'Régis Nouvian',
    );
  });
});
