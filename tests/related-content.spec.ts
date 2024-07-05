import { test } from '@playwright/test';
import { EppPage } from './page-objects/epp-page';
import { testSetup } from '../utils/test-setup';
import { testTearDown } from '../utils/test-tear-down';
import { testClientAndScheduleIds } from '../utils/test-client-and-schedule-ids';

test.describe('reviewed preprint with related content', () => {
  const name = 'related-content';
  const { minioClient, scheduleIds } = testClientAndScheduleIds();

  test.beforeEach(async () => {
    const { scheduleId } = await testSetup(name, minioClient);
    scheduleIds[name] = scheduleId;
  });

  test.afterEach(async () => {
    await testTearDown(name, minioClient, scheduleIds[name], false);
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
