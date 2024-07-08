import { test, expect } from '@playwright/test';
import axios from 'axios';
import {
  createTemporalClient,
  getWorkflowHandle,
} from '../utils/temporal';
import { config } from '../utils/config';
import { setupClientAndScheduleStores, setupTemporal, trashTemporal } from '../utils/setup-temporal';

test.describe('threshold', () => {
  const {
    minioClient,
    scheduleIds,
    scheduleHandles,
    workflowIds,
  } = setupClientAndScheduleStores();

  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    const {
      scheduleId,
      scheduleHandle,
      workflowId,
    } = await setupTemporal({
      name: testInfo.title,
      s3Client: minioClient,
      duration: '1 minute',
      docMapThreshold: 1,
    });
    scheduleIds[testInfo.title] = scheduleId;
    scheduleHandles[testInfo.title] = scheduleHandle;
    workflowIds[testInfo.title] = workflowId;
  });

  // eslint-disable-next-line no-empty-pattern
  test.afterEach(async ({}, testInfo) => {
    await Promise.all([
      trashTemporal({
        name: testInfo.title,
        s3Client: minioClient,
        scheduleId: scheduleIds[testInfo.title],
      }),
      // Because this is idempotent we can run for reject and approve.
      trashTemporal({
        name: testInfo.title,
        s3Client: minioClient,
        msid: `${testInfo.title}-msid-2`,
      }),
    ]);
  });

  [
    {
      // test docmap threshold triggers workflow pause.
      name: 'reject',
      expectation: async (name: string) => {
        const workflowHandle = getWorkflowHandle(workflowIds[name], await createTemporalClient());

        // Wait for threshold pause to commence and check output.
        await expect(async () => {
          const response = await workflowHandle.query<{ awaitingApproval: number, docMapUrls: string[] }>('awaitingApproval');
          expect(response.docMapUrls).not.toBeNull();
          expect(response.docMapUrls).toHaveLength(2);
        }).toPass();

        // Send approval signal with value of false.
        await workflowHandle.signal('approval', false);
        await expect(async () => {
          const workflowStatus = await workflowHandle.describe().then((wf) => wf.status.name);
          expect(workflowStatus).toBe('COMPLETED');
        }).toPass();

        // Confirm no longer awaiting approval.
        const response = await workflowHandle.query('awaitingApproval');
        expect(response).toBeNull();
      },
    },
    {
      // test import continues when approval signal true.
      name: 'approve',
      expectation: async (name: string) => {
        const workflowHandle = getWorkflowHandle(workflowIds[name], await createTemporalClient());

        // Wait for threshold pause to commence and check output.
        await expect(async () => {
          const response = await workflowHandle.query<{ awaitingApproval: number, docMapUrls: string[] }>('awaitingApproval');
          expect(response.docMapUrls).not.toBeNull();
          expect(response.docMapUrls).toHaveLength(2);
        }).toPass();

        // Send approval signal with value of true.
        await workflowHandle.signal('approval', true);
        await expect(async () => {
          const workflowStatus = await workflowHandle.describe().then((wf) => wf.status.name);
          expect(workflowStatus).toBe('COMPLETED');
        }).toPass();

        // Confirm no longer awaiting approval.
        const response = await getWorkflowHandle(workflowIds[name], await createTemporalClient()).query('awaitingApproval');
        expect(response).toBeNull();

        // Check previews available on server.
        expect((await axios.get(`${config.api_url}/api/preprints/${name}-msidv1?previews`).then((r) => r.status))).toBe(200);
        expect((await axios.get(`${config.api_url}/api/preprints/${name}-msid-2v1?previews`).then((r) => r.status))).toBe(200);
      },
    },
  ].forEach(({ name, expectation }) => {
    // eslint-disable-next-line no-empty-pattern
    test(`threshold--${name}`, async ({}, testInfo) => {
      await expectation(testInfo.title);
    });
  });
});
