import { test } from '@playwright/test';
import { EppPage } from './page-objects/epp-page';
import { setupClientAndScheduleStores, setupTemporal, trashTemporal } from '../utils/setup-temporal';

test.describe('preview preprint', () => {
  const name = 'preview';
  const { minioClient, scheduleIds } = setupClientAndScheduleStores();

  test.beforeEach(async () => {
    const { scheduleId } = await setupTemporal({ name, s3Client: minioClient });
    scheduleIds[name] = scheduleId;
  });

  test.afterEach(async () => {
    await trashTemporal(name, minioClient, scheduleIds[name], false);
  });

  test('test previews are visible', async ({ page }) => {
    const eppPage = new EppPage(page, name);
    await eppPage.gotoPreviewPage({ version: 1 });
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.assertTitleVisibility();
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation');
    // eslint-disable-next-line max-len
    await eppPage.assertCopyrightText('This article is distributed under the terms of the Creative Commons Attribution License, which permits unrestricted use and redistribution provided that the original author and source are credited.');

    await eppPage.gotoArticlePage({ version: 1, status: 404 });
  });
});
