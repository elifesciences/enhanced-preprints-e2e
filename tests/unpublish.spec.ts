import { test } from '@playwright/test';
import { changeState } from '../utils/wiremock';
import { EppPage } from './page-objects/epp-page';
import { testSetup } from '../utils/test-setup';
import { testTearDown } from '../utils/test-tear-down';
import { testClientAndScheduleIds } from '../utils/test-client-and-schedule-ids';

test.describe('unpublished preprint', () => {
  const name = 'unpublish';
  const { minioClient, scheduleIds } = testClientAndScheduleIds();

  test.beforeEach(async () => {
    const { scheduleId } = await testSetup(name, minioClient);
    scheduleIds[name] = scheduleId;
  });

  test.afterEach(async () => {
    await testTearDown(name, minioClient, scheduleIds[name]);
  });

  test('preprints can be unpublished', async ({ page }) => {
    const eppPage = new EppPage(page, name);
    await eppPage.gotoArticlePage({ version: 1 });
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.assertTitleVisibility();
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation');
    await eppPage.assertAssessmentDoi('https://doi.org/10.7554/eLife.000001.1.sa3');

    await changeState(name, 'unpublished');

    // Wait for unpublished article to become unavailable
    await eppPage.gotoArticlePage({ version: 1 });
    await eppPage.reloadAndAssertStatus(404);
    await eppPage.gotoArticlePage({ status: 404 });
    await eppPage.gotoPreviewPage({ version: 1, status: 200 });
  });
});
