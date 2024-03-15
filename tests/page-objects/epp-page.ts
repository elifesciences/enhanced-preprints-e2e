import {
  expect, Locator, Page,
} from '@playwright/test';
import { config } from '../../utils/config';

type GotoProps = { version?: number, status?: number };
export class EppPage {
  private page: Page;

  private name: string;

  readonly title: Locator;

  readonly doi: Locator;

  readonly copyright: Locator;

  readonly authorResponse: Locator;

  readonly assessmentDoi: Locator;

  readonly articleStatus: Locator;

  constructor(thePage: Page, name: string) {
    this.page = thePage;
    this.name = name;
    this.title = this.page.locator('h1.title');
    this.doi = this.page.locator('.content-header .descriptors__identifier');
    this.copyright = this.page.locator('.copyright');
    this.authorResponse = this.page.locator('#author-response');
    this.assessmentDoi = this.page.locator('#assessment .descriptors__identifier');
    this.articleStatus = this.page.locator('.article-status__text');
  }

  async gotoPreviewPage({ version, status }: GotoProps = {}): Promise<void> {
    const response = await this.page.goto(`${config.client_url}/previews/${this.name}-msid${version ? `v${version}` : ''}`);
    if (status) {
      expect(response?.status()).toBe(status);
    }
  }

  async gotoArticlePage({ version, status }: GotoProps = {}): Promise<void> {
    const response = await this.page.goto(`${config.client_url}/reviewed-preprints/${this.name}-msid${version ? `v${version}` : ''}`);
    if (status) {
      expect(response?.status()).toBe(status);
    }
  }

  async gotoReviewsPage(): Promise<void> {
    await this.page.goto(`${config.client_url}/reviewed-preprints/${this.name}-msidv1/reviews`);
  }

  async navigateToVersion(version: number, wait: boolean = false): Promise<void> {
    await this.page.getByLabel(`Reviewed preprint version ${version}`).click();
    if (wait) {
      await this.page.waitForURL(`${config.client_url}/reviewed-preprints/${this.name}-msidv${version}`);
    }
  }

  async reloadAndAssertStatus(status: number): Promise<void> {
    await expect(async () => {
      const response = await this.page.reload();
      expect(response?.status()).toBe(status);
    }).toPass();
  }

  async assertTitleText(title: string): Promise<void> {
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

  async assertDoi(doi: string) {
    await expect(this.doi).toHaveText(doi);
  }

  async assertCopyrightText(content: string): Promise<void> {
    await expect(this.copyright).toContainText(content);
  }

  async assertAssessmentDoi(doi: string): Promise<void> {
    await expect(this.assessmentDoi).toHaveText(doi);
  }

  async assertPeerReviewText(index: number, content: string): Promise<void> {
    await expect(this.page.locator(`#peer-review-${index}`)).toContainText(content);
  }

  async assertPeerReviewDoi(index: number, doi: string): Promise<void> {
    await expect(this.page.locator(`#peer-review-${index} .descriptors__identifier`)).toContainText(doi);
  }

  async assertAuthorResponseText(content: string): Promise<void> {
    await expect(this.authorResponse).toContainText(content);
  }

  async assertAuthorResponseDoi(doi: string): Promise<void> {
    await expect(this.authorResponse.locator('.descriptors__identifier')).toContainText(doi);
  }

  async assertArticleStatusText(content: string): Promise<void> {
    await expect(this.articleStatus).toContainText(content);
  }

  async assertTimelineEventText(index: number, content: string): Promise<void> {
    await expect(this.page.locator(`.review-timeline__list>.review-timeline__event:nth-child(${index})`)).toContainText(content);
  }

  async assertTimelineEventThisVersion(index: number): Promise<void> {
    const event = this.page.locator(`.review-timeline__list>.review-timeline__event:nth-child(${index})`);
    await expect(event.locator('+.review-timeline__date .review-timeline__description')).toContainText('(this version)');
  }

  async assertRelatedContent(index: number, content: string): Promise<void> {
    await expect(this.page.locator(`.related-content>.related-content__item:nth-child(${index})`)).toContainText(content);
  }
}
