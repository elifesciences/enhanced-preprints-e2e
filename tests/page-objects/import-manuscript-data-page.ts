import {
  expect, Locator, Page,
} from '@playwright/test';
import { config } from '../../utils/config';

class ImportManuscriptDataPage {
  private page: Page;
  
  readonly input: Locator;
  
  readonly nameSpaceSelector: Locator;
  
  readonly submit: Locator;

  constructor(thePage: Page) {
    this.page = thePage;
    this.input = this.page.locator('#manuscript-data');
    this.nameSpaceSelector = this.page.locator('#temporal_namespace');
    this.submit = this.page.locator('button[type="submit"]');
  }
  
  async gotoForm(): Promise<void> {
    const response = await this.page.goto(`${config.import_controller}/input`);
    expect(response?.status()).toBe(200);
  }
}
