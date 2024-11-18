import { test } from '@playwright/test';
import { ImportManuscriptDataPage } from './page-objects/import-manuscript-data-page';
import { EppPage } from './page-objects/epp-page';

const prepareManuscriptData = (id: string, optional?: true) => {
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
    versionIdentifier: 'v42',
    id: `${id}.1`,
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

  return JSON.stringify(optional ? {
    id,
    versions: [optionalVersion],
    manuscript: optionalManuscript,
  } : {
    id,
    versions: [requiredVersion],
  });
};

test.describe('Import Manuscript Data', () => {
  const name = 'import-manuscript-data';

  test.fail('publish content via import manuscript data form', async ({ page }) => {
    const importManuscriptDataPage = new ImportManuscriptDataPage(page);
    await importManuscriptDataPage.gotoForm();
    await importManuscriptDataPage.fillAndSubmitForm(prepareManuscriptData('1234', true));

    const eppPage = new EppPage(page, name);
    await eppPage.gotoArticlePage();
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation');
  });
});