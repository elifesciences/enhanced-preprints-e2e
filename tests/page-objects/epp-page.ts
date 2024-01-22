import { expect, Locator, Page, Response } from '@playwright/test';
import { config } from '../../utils/config';

export class EppPage {
  private page: Page;
  private name: string;

  readonly title: Locator;

  readonly doi: Locator;

  readonly copyright: Locator;

  readonly authorResponse: Locator;

  readonly assesmentDoi: Locator;

  readonly articleStatus: Locator;

  constructor(thePage: Page, name: string) {
    this.page = thePage;
    this.name = name;
    this.title = this.page.locator('h1.title');
    this.doi = this.page.locator('.content-header .descriptors__identifier');
    this.copyright = this.page.locator('.copyright');
    this.authorResponse = this.page.locator('#author-response');
    this.assesmentDoi = this.page.locator('#assessment .descriptors__identifier');
    this.articleStatus = this.page.locator('.article-status__text');
  }

  async navigateToPreviewPage(): Promise<Response | null> {
    return this.page.goto(`${config.client_url}/previews/${this.name}-msidv1`);
  }

  async navigateToArticlePage(version?: number): Promise<Response | null> {
    return this.page.goto(`${config.client_url}/reviewed-preprints/${this.name}-msid${version ? `v${version}`: ''}`);
  }

  async navigateToReviewsPage(): Promise<void> {
    await this.page.goto(`${config.client_url}/reviewed-preprints/${this.name}-msidv1/reviews`);
  }

  async assertTitleText(title: string): Promise<void> {
    await expect(this.title).toContainText(title);
  }

  async assertDoi(doi: string) {
    await expect(this.doi).toHaveText(doi);
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

  async assertAssesmentDoi(doi: string): Promise<void> {
    await expect(this.assesmentDoi).toHaveText(doi);
  }

  async assertPeerReviewContent(index: number, content: string): Promise<void> {
    await expect(this.page.locator(`#peer-review-${index}`)).toContainText(content);
  }

  async assertPeerReviewDoi(index: number, doi: string): Promise<void> {
    await expect(this.page.locator(`#peer-review-${index} .descriptors__identifier`)).toContainText(doi);
  }

  async assertAuthorResponse(content: string): Promise<void> {
    await expect(this.authorResponse).toContainText(content);
  }

  async assertAuthorResponseDoi(doi: string): Promise<void> {
    await expect(this.authorResponse.locator('.descriptors__identifier')).toContainText(doi);
  }

  async assertArticleStatus(content: string): Promise<void> {
    await expect(this.articleStatus).toContainText(content);
  }
}
