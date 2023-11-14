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

  test('response from continuum api after import of reviewed preprint', async ({ request }) => {
    await expect(async () => {
      const item = await request.get(`${config.client_url}/api/reviewed-preprints/${name}-msid`, {
        headers: {
          Accept: 'application/vnd.elife.reviewed-preprint+json; version=1',
        },
      });
      expect(item.ok()).toBeTruthy();
    }).toPass();

    const listResponse = await request.get(`${config.client_url}/api/reviewed-preprints`, {
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

    expect(listResponse.ok()).toBeTruthy();
    const list = await listResponse.json();
    // this isn't isolated enough to work
    // expect(list).toStrictEqual({ total: 1, items: [expectSnippet] });
    expect(list.items).toContainEqual(expectSnippet);

    const listHeaders = listResponse.headers();
    expect(listHeaders['content-type']).toBe('application/vnd.elife.reviewed-preprint-list+json; version=1');
    expect(listHeaders['cache-control']).toBe('max-age=300, public, stale-if-error=86400, stale-while-revalidate=300');

    const listHeaderVary = listHeaders.vary.split(', ');
    expect(listHeaderVary).toContain('Accept');
    expect(listHeaderVary).toContain('Authorization');

    const item = await request.get(`${config.client_url}/api/reviewed-preprints/${name}-msid`, {
      headers: {
        Accept: 'application/vnd.elife.reviewed-preprint+json; version=1',
      },
    });

    const itemJson = await item.json();
    expect(itemJson).toStrictEqual({ ...expectSnippet, indexContent: expect.any(String) });
    expect(itemJson.indexContent).toContain('Nisarg Desai, Praneet Bala, Rebecca Richardson, Jessica Raper, Jan Zimmermann, Benjamin Hayden');
    expect(itemJson.indexContent).toContain('Such systems allow data collected from digital video cameras to be used to infer the positions of body landmarks such as head, hands, and feet, without the use of specialized markers.');
    // eslint-disable-next-line max-len
    expect(itemJson.indexContent).toContain('We thank Estelle Reballand from Chimpanzee Conservation Center, Fred Rubio from Project Chimps, Adam Thompson from Zoo Atlanta, Reba Collins from Chimp Haven, and Amanda Epping and Jared Taglialatela from Ape Initiative for permissions to take photographs from these sanctuaries as well as contributing images for the dataset.');

    const itemHeaders = item.headers();
    expect(itemHeaders['content-type']).toBe('application/vnd.elife.reviewed-preprint+json; version=1');
    expect(itemHeaders['cache-control']).toBe('max-age=300, public, stale-if-error=86400, stale-while-revalidate=300');

    const itemHeaderVary = itemHeaders.vary.split(', ');
    expect(itemHeaderVary).toContain('Accept');
    expect(itemHeaderVary).toContain('Authorization');
  });
});
