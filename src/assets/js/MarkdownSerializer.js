import TurndownService from 'turndown/lib/turndown.browser.es';

export default class MarkdownSerializer {
  constructor() {
    this.service = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
    });

    this.service.addRule('strikethrough', {
      filter: ['del', 's', 'strike'],
      replacement: (content) => `~~${content}~~`,
    });
  }

  serialize(content) {
    return this.service.turndown(content);
  }
}
