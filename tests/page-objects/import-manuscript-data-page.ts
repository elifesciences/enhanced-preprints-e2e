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
    this.workflowLink = this.page.locator(`xpath=//a[starts-with(@href, '${config.temporal_ui_url}')]`);
  }

  async gotoForm() {
    const response = await this.page.goto(`${config.import_controller_url}/input`);
    expect(response?.status()).toBe(200);
  }

  async fillAndSubmitForm(text: string) {
    await this.input.fill(text);
    await this.namespaceSelector.selectOption('default');
    await Promise.all([
      this.submit.click(),
      expect(this.workflowLink).toBeVisible(),
    ]);
    await Promise.all([
      this.workflowLink.click(),
      expect(this.page.locator("xpath=//*[text()='Completed']")).toBeVisible(),
    ]);
  }
}
