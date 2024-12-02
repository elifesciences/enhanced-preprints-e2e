import { test } from '@playwright/test';
import { EppPage } from './page-objects/epp-page';
import { setupClientAndScheduleStores, setupTemporal, trashTemporal } from '../utils/setup-temporal';

test.describe('versions', () => {
  const name = 'versions';
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

  test('multiple versions of a preprint are available', async ({ page }) => {
    const eppPage = new EppPage(page, name);
    // For the test to succeed, we need to wait for all versions to be imported
    await eppPage.gotoArticlePage({ version: 4 });
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.4');

    await eppPage.gotoArticlePage({ version: 3 });
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.3');

    await eppPage.gotoArticlePage({ version: 2 });

    await eppPage.reloadAndAssertStatus(200);
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.2');

    await eppPage.gotoArticlePage({ version: 1 });
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.assertArticleStatusText('Not revised');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.1');
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation');

    await eppPage.gotoArticlePage({ status: 200 });
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.4');
  });
});
