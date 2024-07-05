import { test } from '@playwright/test';
import { EppPage } from './page-objects/epp-page';
import { testSetup } from '../utils/test-setup';
import { testTearDown } from '../utils/test-tear-down';
import { testClientAndScheduleIds } from '../utils/test-client-and-schedule-ids';

test.describe('versions', () => {
  const name = 'versions';
  const { minioClient, scheduleIds } = testClientAndScheduleIds();

  test.beforeEach(async () => {
    const { scheduleId } = await testSetup(name, minioClient);
    scheduleIds[name] = scheduleId;
  });

  test.afterEach(async () => {
    await testTearDown(name, minioClient, scheduleIds[name], false);
  });

  test('multiple versions of a preprint are available', async ({ page }) => {
    const eppPage = new EppPage(page, name);
    // For the test to succeed, we need to wait for all versions to be imported
    await eppPage.gotoArticlePage({ version: 4 });
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.gotoArticlePage({ version: 3 });
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.gotoArticlePage({ version: 2 });
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.gotoArticlePage({ version: 1 });
    await eppPage.reloadAndAssertStatus(200);

    await eppPage.assertArticleStatusText('Not revised');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.1');
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation');

    await eppPage.expandTimeline();

    await eppPage.assertTimelineDetailText(4, 'v1');
    await eppPage.assertTimelineEventThisVersion(4);

    await eppPage.navigateToVersion(2);
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.2');

    await eppPage.expandTimeline();

    await eppPage.assertTimelineDetailText(3, 'v2');
    await eppPage.assertTimelineEventThisVersion(3);

    await eppPage.navigateToVersion(3);
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.3');

    await eppPage.expandTimeline();

    await eppPage.assertTimelineDetailText(2, 'v3');
    await eppPage.assertTimelineEventThisVersion(2);

    await eppPage.navigateToVersion(4);
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.4');

    await eppPage.expandTimeline();

    await eppPage.assertTimelineDetailText(1, 'v4');
    await eppPage.assertTimelineEventThisVersion(1);

    await eppPage.gotoArticlePage({ status: 200 });
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation (revised)');
    await eppPage.assertArticleStatusText('Revised by authors');
    await eppPage.assertDoi('https://doi.org/10.7554/000001.4');

    await eppPage.expandTimeline();

    await eppPage.assertTimelineDetailText(1, 'v4');
    await eppPage.assertTimelineEventThisVersion(1);
  });
});
