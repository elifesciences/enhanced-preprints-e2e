import { Client } from "@temporalio/client";

describe('that it displays title on the page', () => {
  const temporal = new Client();

  beforeAll(async () => {
    await temporal.workflow.start('pollDocMapIndex', {
      taskQueue: 'epp',
      workflowId: 'title',
      args: ['http://wiremock:8080/docmaps', '1 minute'],
    });
  });

  afterAll(async () => {
    await temporal.workflow.getHandle('title').terminate('end of title test');
  });

  it('display the title', () => {
  });
});
