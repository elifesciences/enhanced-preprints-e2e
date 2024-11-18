import { test } from '@playwright/test';
import { ImportManuscriptDataPage } from './page-objects/import-manuscript-data-page';
import { EppPage } from './page-objects/epp-page';
import { setupClientAndScheduleStores, trashTemporal } from '../utils/setup-temporal';

const prepareManuscriptData = (name: string, optional?: true) => {
  const id = `${name}-msid`;
  const requiredPreprint = {
    id,
    doi: '10.1101/654321',
  };

  const optionalPreprint = {
    ...requiredPreprint,
    publishedDate: '2023-01-02',
    url: 'www.google.com',
    content: ['s3://meca/dummy-1.meca'],
    license: 'Creative Commons',
    corrections: [{
      content: ['Corrections Content'],
      correctedDate: '2023-02-03',
    }],
  };

  const requiredVersion = {
    versionIdentifier: '42',
    id,
    doi: '10.1101/123456',
    preprint: requiredPreprint,
  };

  const optionalEvaluation = {
    date: '2023-01-02',
    doi: '12.3456/123456',
    reviewType: 'review-article',
    contentUrls: ['http://wiremock:8080/evaluations/hypothesis:author-1/content'],
    participants: [{
      name: 'Joe Bloggs',
      role: 'Dungeon Master',
      institution: {
        name: 'Dungeons Inc.',
        location: 'Fey Wilds',
      },
    }],
  };

  const optionalVersion = {
    ...requiredVersion,
    preprint: optionalPreprint,
    publishedDate: '2023-03-04',
    sentForReviewDate: '2023-03-05',
    peerReview: {
      evaluationSummary: optionalEvaluation,
      reviews: [optionalEvaluation],
      authorResponse: optionalEvaluation,
    },
    reviewedDate: '2023-03-06',
    authorResponseDate: '2023-03-07',
    license: 'Creative Commons',
    corrections: [{
      content: ['Corrections Content'],
      correctedDate: '2023-02-03',
    }],
    content: ['This is some more content'],
  };

  const optionalManuscript = {
    doi: `10.${id}`,
    volume: '11',
    eLocationId: 'cyberspace',
    publishedDate: '2023-01-02',
    subjects: ['Alchemy', 'Mad Science'],
    relatedContent: [{
      type: 'book',
      title: 'Monster Manual',
      url: 'www.google.com',
      description: 'its a book',
      thumbnail: 'www.google.com',
    }],
  };

  return JSON.stringify({
    id,
    versions: [optionalVersion],
    ...(optional ? {
      manuscript: optionalManuscript,
    } : {}),
  });
};

test.describe('Import Manuscript Data', () => {
  const name = 'import-manuscript-data';

  const { minioClient } = setupClientAndScheduleStores();

  test.afterEach(async () => {
    await trashTemporal({
      name,
      s3Client: minioClient,
    });
  });

  test('publish content via import manuscript data form', async ({ page }) => {
    const importManuscriptDataPage = new ImportManuscriptDataPage(page);
    await importManuscriptDataPage.gotoForm();
    await importManuscriptDataPage.fillAndSubmitForm(prepareManuscriptData(name, true));

    const eppPage = new EppPage(page, name);
    await eppPage.gotoArticlePage({ version: 42 });
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation');
  });
});
