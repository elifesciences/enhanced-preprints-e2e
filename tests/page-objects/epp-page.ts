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

  readonly metrics: Locator;

  readonly metricsAside: Locator;

  constructor(thePage: Page, name: string) {
    this.page = thePage;
    this.name = name;
    this.title = this.page.locator('h1.title');
    this.doi = this.page.locator('.content-header .descriptors__identifier');
    this.copyright = this.page.locator('.copyright');
    this.authorResponse = this.page.locator('#author-response');
    this.assessmentDoi = this.page.locator('#assessment .descriptors__identifier');
    this.articleStatus = this.page.locator('.review-timeline__link');
    this.metrics = this.page.locator('.metricsTable');
    this.metricsAside = this.page.locator('.contextual-data');
  }

  getName(): string {
    return this.name;
  }

  async gotoIndexPage(): Promise<void> {
    const response = await this.page.goto(config.client_url);
    expect(response?.status()).toBe(200);
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

  async navigateToReviewsTab(): Promise<void> {
    const peerReviewTab = this.page.locator('.tabbed-navigation__tabs').getByText('Peer review');
    await peerReviewTab.click();
    await expect(this.page.locator('.tabbed-navigation__tab-label--active')).toHaveText('Peer review');
  }

  async reload() {
    return this.page.reload();
  }

  async reloadAndAssertStatus(status: number): Promise<void> {
    await expect(async () => {
      const response = await this.reload();
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

  async assertPeerReviewProcess(type: 'reviewed' | 'revised'): Promise<void> {
    await expect(this.page.locator(`.review-process--${type}`)).toBeVisible();
    await expect(this.page.locator(`.review-process--${type} strong`)).toHaveText(type === 'reviewed' ? 'Not revised:' : 'Revised:');
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

  async assertTimelineEventDetailText(index: number, content: string): Promise<void> {
    await expect(this.page.locator(`.review-timeline__event--detail:nth-of-type(${index})`)).toContainText(content);
  }

  async assertTimelineEventTitleText(index: number, content: string): Promise<void> {
    await expect(this.page.locator(`.review-timeline__event--title:nth-of-type(${index})`)).toContainText(content);
  }

  async assertTimelineEventTitleLink(index: number, url: string): Promise<void> {
    await expect(this.page.locator(`.review-timeline__event--title:nth-of-type(${index}) a`).getAttribute('href')).resolves.toEqual(url);
  }

  async assertRelatedContent(index: number, type: string, title: string, url: string, content?: string): Promise<void> {
    const relatedContentItem = this.page.locator(`.related-content>.related-content__item:nth-child(${index})`);
    await expect(relatedContentItem.locator('.related-content__item-type')).toHaveText(type);
    await expect(relatedContentItem.locator('h4')).toHaveText(title);
    await expect(relatedContentItem.locator('a').getAttribute('href')).resolves.toEqual(url);
    if (content) {
      await expect(relatedContentItem.locator('.related-content__item-content')).toHaveText(content);
    }
  }

  async assertMetrics(views: number, downloads: number, citations: number): Promise<void> {
    const metricsElements = this.metrics.locator('.metricsTable__group');
    const metricsAsideElements = this.metricsAside.locator('li a');

    await expect(metricsElements).toHaveText([
      `views${views}`,
      `downloads${downloads}`,
      `citations${citations}`,
    ]);

    await expect(metricsAsideElements).toHaveText([
      `${views} views`,
      `${downloads} downloads`,
      `${citations} citations`,
    ]);
  }

  async assertGTMPresent(): Promise<void> {
    // @ts-ignore
    const dataLayer = await this.page.evaluate(() => window.dataLayer);

    expect(dataLayer[0].event).toStrictEqual('gtm.js');
  }
}
