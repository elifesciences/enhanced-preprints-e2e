import { test, expect } from '@playwright/test';
import axios from 'axios';
import { config } from '../utils/config';
import { EppPage } from './page-objects/epp-page';

test.describe('GTM', () => {
  test('GTM is enabled when environment variable is set', async () => {
    const response = await axios.get(config.client_url);
    expect(response.data).toContain('<script id="GTM">');
  });

  test('GTM is in the window datalayer', async ({ page }) => {
    const eppPage = new EppPage(page, 'GTM');
    await eppPage.gotoIndexPage();
    await eppPage.assertGTMPresent();
  });
});
