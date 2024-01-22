import { expect, Locator, Page } from '@playwright/test';

export class EppPage {
  private page: Page;

  readonly title: Locator;

  readonly doi: Locator;

  readonly copyright: Locator;

  constructor(thePage: Page) {
    this.page = thePage;
    this.title = this.page.locator('h1.title');
    this.doi = this.page.locator('header .descriptors__identifier a'); // may need to change when we have more identifiers
    this.copyright = this.page.locator('.copyright');
  }

  async assertTitle(title: string): Promise<void> {
    await expect(this.title).toContainText(title);
  }

  async assertTitleVisibility(visibility: boolean = true): Promise<void> {
    if (visibility) {
      await expect(this.title)
        .toBeVisible();
    } else {
      await expect(this.title)
        .not.toBeVisible();
    }
  }

  async assertCopyright(content: string): Promise<void> {
    await expect(this.copyright).toContainText(content);
  }

  async assertDOI(doi: string): Promise<void> {
    await expect(this.doi).toHaveText(`https://doi.org/${doi}`);
  }
}
