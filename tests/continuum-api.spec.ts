import { test, expect } from '@playwright/test';
import axios from 'axios';
import { Client } from '@temporalio/client';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import {
  createTemporalClient, generateWorkflowId, startWorkflow, stopWorkflow,
} from '../utils/temporal';

test.describe('continuum api', () => {
  let temporal: Client;
  const name = 'continuum-api';
  const workflowId = generateWorkflowId(name);
  const minioClient = createS3Client();

  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    await startWorkflow(name, workflowId, temporal);
  });

  test.afterAll(async () => {
    await Promise.all([
      stopWorkflow(workflowId, temporal),
      axios.delete(`${config.api_url}/preprints/${name}-msidv1`),
      deleteS3EppFolder(minioClient, `${name}-msid`),
    ]);
  });

  test('test data on continuum api', async ({ request }) => {
    await expect(async () => {
      const item = await request.get(`${config.client_url}/api/reviewed-preprints/${name}-msid`, {
        headers: {
          Accept: 'application/vnd.elife.reviewed-preprint-item+json; version=1',
        },
      });
      expect(item.ok()).toBeTruthy();
    }).toPass();

    const list = await request.get(`${config.client_url}/api/reviewed-preprints`, {
      headers: {
        Accept: 'application/vnd.elife.reviewed-preprint-list+json; version=1',
      },
    });

    const expectSnippet = {
      title: 'OpenApePose: a database of annotated ape photographs for pose estimation',
      id: `${name}-msid`,
      doi: '10.1101/000001',
      authorLine: 'Nisarg Desai, Praneet Bala ... Benjamin Hayden',
      published: '2023-05-07T09:03:08.000Z',
      reviewedDate: '2023-05-07T09:03:08.000Z',
      statusDate: '2023-05-07T09:03:08.000Z',
      versionDate: '2023-05-07T09:03:08.000Z',
      stage: 'published',
      status: 'reviewed',
      subjects: [
        {
          id: 'cell-biology',
          name: 'Cell Biology',
        },
        {
          id: 'structural-biology-molecular-biophysics',
          name: 'Structural Biology and Molecular Biophysics',
        },
      ],
    };

    expect(list.ok()).toBeTruthy();
    expect(await list.json()).toStrictEqual({ total: 1, items: [expectSnippet] });

    const item = await request.get(`${config.client_url}/api/reviewed-preprints/${name}-msid`, {
      headers: {
        Accept: 'application/vnd.elife.reviewed-preprint-item+json; version=1',
      },
    });
    const itemJson = await item.json();
    expect(itemJson).toStrictEqual({ ...expectSnippet, indexContent: expect.any(String) });
    expect(itemJson.indexContent).toContainText('Nisarg Desai, Praneet Bala, Rebecca Richardson, Jessica Raper, Jan Zimmermann, Benjamin Hayden');
  });
});
