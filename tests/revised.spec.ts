import { test } from '@playwright/test';
import { EppPage } from './page-objects/epp-page';
import { setupClientAndScheduleStores, setupTemporal, trashTemporal } from '../utils/setup-temporal';

test.describe('revised preprint', () => {
  const name = 'revised';
  const { minioClient, scheduleIds } = setupClientAndScheduleStores();

  test.beforeEach(async () => {
    const { scheduleId } = await setupTemporal({ name, s3Client: minioClient });
    scheduleIds[name] = scheduleId;
  });

  test.afterEach(async () => {
    await trashTemporal(name, minioClient, scheduleIds[name], false);
  });

  test('revised preprints are available', async ({ page }) => {
    const eppPage = new EppPage(page, name);

    // For the test to succeed, we need to wait for both versions to be imported
    await eppPage.gotoArticlePage({ version: 2 });
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.gotoArticlePage({ version: 1 });
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.assertArticleStatusText('Not revised');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.1');
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation');

    await eppPage.expandTimeline();

    await eppPage.assertTimelineDetailText(2, 'v1');
    await eppPage.assertTimelineEventThisVersion(2);

    await eppPage.navigateToVersion(2, true);
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.2');

    await eppPage.expandTimeline();

    await eppPage.assertTimelineDetailText(1, 'v2');
    await eppPage.assertTimelineEventThisVersion(1);

    await eppPage.navigateToVersion(1, true);
    await eppPage.assertDoi('https://doi.org/10.7554/000001.1');

    await eppPage.gotoArticlePage({ status: 200 });
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.2');

    await eppPage.expandTimeline();

    await eppPage.assertTimelineDetailText(1, 'v2');
    await eppPage.assertTimelineEventThisVersion(1);

    await eppPage.navigateToReviewsTab();
    await eppPage.assertPeerReviewProcess('revised');
  });
});
