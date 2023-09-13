import { Client } from '@temporalio/client';
import axios from 'axios';

describe('that it displays title on the page', () => {
  const temporal = new Client();

  beforeAll(async () => {
    // Change state of wiremock to 'title'
    await axios.put('http://localhost:8080/__admin/scenarios/docmap/state', {
      state: 'title',
    });

    await temporal.workflow.start('pollDocMapIndex', {
      taskQueue: 'epp',
      workflowId: 'title',
      args: ['http://wiremock:8080/docmaps', '1 minute'],
    });
  });

  afterAll(async () => {
    // Reset state
    await axios.put('http://localhost:8080/__admin/scenarios/docmap/state');
    await temporal.workflow.getHandle('title').terminate('end of title test');
  });

  it('display the title', () => {
  });
});
