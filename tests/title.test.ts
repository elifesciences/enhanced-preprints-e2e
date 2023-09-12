import { IWireMockRequest, IWireMockResponse, WireMock } from 'wiremock-captain';

describe('that it displays title on the page', () => {
  const wireMock = new WireMock('http://localhost:8080');
  beforeAll(async () => {
    const request: IWireMockRequest = { method: 'GET', endpoint: '/docmaps' };
    const response: IWireMockResponse = { status: 200, body: [] };
    wireMock.register(request, response);
  });
  it('display the title', () => {

  });
});
