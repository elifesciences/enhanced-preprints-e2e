import {
  expect, Locator, Page,
} from '@playwright/test';
import { config } from '../../utils/config';

export class ImportManuscriptDataPage {
  private page: Page;
  
  readonly input: Locator;
  
  readonly namespaceSelector: Locator;
  
  readonly submit: Locator;
  
  readonly workflowLink: Locator;

  constructor(thePage: Page) {
    this.page = thePage;
    this.input = this.page.locator('#manuscript-data');
    this.namespaceSelector = this.page.locator('#temporal_namespace');
    this.submit = this.page.locator('button[type="submit"]');
    this.workflowLink = this.page.locator('body a');
  }
  
  async gotoForm(): Promise<void> {
    const response = await this.page.goto(`${config.import_controller_url}/input`);
    expect(response?.status()).toBe(200);
  }

  async fillAndSubmitForm(text: string): Promise<void> {
    await this.input.fill(text);
    await this.namespaceSelector.selectOption('default');

    const [submitResponse] = await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle' }),
      this.submit.click(),
    ]);

    expect(submitResponse?.status()).toBe(200);

    await expect(this.page.locator('body')).toContainText('Import started');

    const [importLinkResponse] = await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'load' }),
      this.workflowLink.click(),
    ]);

    expect(importLinkResponse?.status()).toBe(200);
  }
}
