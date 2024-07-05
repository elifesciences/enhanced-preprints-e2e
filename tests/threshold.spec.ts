import { test, expect } from '@playwright/test';
import axios from 'axios';
import {
  createTemporalClient,
  getWorkflowHandle,
  stopScheduledImportWorkflow,
} from '../utils/temporal';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import { setupClientAndScheduleStores, setupTemporal, trashTemporal } from '../utils/setup-temporal';

test.describe('threshold', () => {
  const {
    minioClient,
    scheduleIds,
    scheduleHandles,
    workflowIds,
  } = setupClientAndScheduleStores();

  test.describe('hit threshold and reject', () => {
    const name = 'threshold--reject';
    test.beforeEach(async () => {
      const {
        scheduleId,
        scheduleHandle,
        workflowId,
      } = await setupTemporal({
        name,
        s3Client: minioClient,
        duration: '1 minute',
        docMapThreshold: 1,
      });
      scheduleIds[name] = scheduleId;
      scheduleHandles[name] = scheduleHandle;
      workflowIds[name] = workflowId;
    });

    test.afterEach(async () => {
      await Promise.all([
        stopScheduledImportWorkflow(scheduleIds[name], await createTemporalClient()),
        deleteS3EppFolder(minioClient, `state/${name}`),
      ]);
    });

    test('docmap threshold triggers workflow pause', async () => {
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
    });
  });

  test.describe('hit threshold and approve', () => {
    const name = 'threshold--approve';
    test.beforeEach(async () => {
      const {
        scheduleId,
        scheduleHandle,
        workflowId,
      } = await setupTemporal({
        name,
        s3Client: minioClient,
        duration: '1 minute',
        docMapThreshold: 1,
      });
      scheduleIds[name] = scheduleId;
      scheduleHandles[name] = scheduleHandle;
      workflowIds[name] = workflowId;
    });

    test.afterEach(async () => {
      await trashTemporal(name, minioClient, scheduleIds[name], false);
      await Promise.all([
        deleteS3EppFolder(minioClient, `${name}-msid-2`),
        axios.delete(`${config.api_url}/preprints/${name}-msid-2v1`),
      ]);
    });

    test('import continues when approval signal true', async () => {
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
    });
  });
});
