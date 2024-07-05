import { test } from '@playwright/test';
import { EppPage } from './page-objects/epp-page';
import { setupClientAndScheduleStores, setupTemporal, trashTemporal } from '../utils/setup-temporal';

test.describe('reviewed preprint', () => {
  const name = 'reviews';
  const { minioClient, scheduleIds } = setupClientAndScheduleStores();

  test.beforeEach(async () => {
    const { scheduleId } = await setupTemporal(name, minioClient);
    scheduleIds[name] = scheduleId;
  });

  test.afterEach(async () => {
    await trashTemporal(name, minioClient, scheduleIds[name], false);
  });

  test('test reviews and DOIs are visible on reviewed-preprint', async ({ page }) => {
    const eppPage = new EppPage(page, name);
    await eppPage.gotoReviewsPage();
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.assertTitleVisibility();
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation');
    await eppPage.assertPeerReviewProcess('reviewed');
    await eppPage.assertPeerReviewText(0, 'evaluation 2');
    await eppPage.assertPeerReviewText(1, 'evaluation 1');
    await eppPage.assertAuthorResponseText('author response');

    await eppPage.assertPeerReviewDoi(0, 'https://doi.org/10.7554/eLife.000001.1.sa2');
    await eppPage.assertPeerReviewDoi(1, 'https://doi.org/10.7554/eLife.000001.1.sa1');
    await eppPage.assertAuthorResponseDoi('https://doi.org/10.7554/eLife.000001.1.sa0');
  });
});
