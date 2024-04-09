import { test, expect } from '@playwright/test';
import axios from 'axios';
import { config } from '../utils/config';

test.describe('GTM', () => {
  test('GTM is enabled when environment variable is set', async () => {
    const response = await axios.get(config.client_url);
    expect(response.data).toContain('<script id="GTM">');
  });
});
