import { Client } from "@temporalio/client";

describe('that it displays title on the page', () => {
  beforeAll(async () => {
    const temporal = new Client();
    await temporal.workflow.start('pollDocMapIndex', {
      taskQueue: 'epp',
      workflowId: 'title',
      args: ['http://wiremock:8080/docmaps', '1 minute'],
    });
  });

  it('display the title', () => {
  });
});
