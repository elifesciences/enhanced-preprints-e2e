import { test } from '@playwright/test';
import { changeState, resetState } from '../utils/wiremock';
import { EppPage } from './page-objects/epp-page';
import { setupClientAndScheduleStores, setupTemporal, trashTemporal } from '../utils/setup-temporal';

test.describe('publish, unpublish and republish preprint', () => {
  const name = 'previous-state';
  const { minioClient, scheduleIds } = setupClientAndScheduleStores();

  test.beforeEach(async () => {
    const { scheduleId } = await setupTemporal({ name, s3Client: minioClient });
    scheduleIds[name] = scheduleId;
  });

  test.afterEach(async () => {
    await trashTemporal(name, minioClient, scheduleIds[name]);
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
