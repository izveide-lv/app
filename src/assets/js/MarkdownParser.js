import MarkdownIt from 'markdown-it';

// Adapted from https://github.com/arve0/markdown-it-implicit-figures/blob/master/index.js
function wrapInFigurePlugin(md) {
  function replaceParagraphsWithFigures(state) {
    for (let i = 1; i < (state.tokens.length - 1); i += 1) {
      const token = state.tokens[i];

      /* eslint-disable no-continue */
      if (token.type !== 'inline') continue;
      if (!token.children || (token.children.length !== 1 && token.children.length !== 3)) continue;
      if (token.children.length === 1 && token.children[0].type !== 'image') continue;
      if (token.children.length === 3 && (token.children[0].type !== 'link_open' || token.children[1].type !== 'image' || token.children[2].type !== 'link_close')) continue;
      if (state.tokens[i - 1].type !== 'paragraph_open') continue;
      if (state.tokens[i + 1].type !== 'paragraph_close') continue;
      /* eslint-enable no-continue */

      const paragraphOpen = state.tokens[i - 1];
      const paragraphClose = state.tokens[i + 1];
      paragraphOpen.type = 'figure_open';
      paragraphOpen.tag = 'figure';
      paragraphClose.type = 'figure_close';
      paragraphClose.tag = 'figure';
    }
  }
  md.core.ruler.before('linkify', 'replace_paragraphs_with_figures', replaceParagraphsWithFigures);
}

export default class MarkdownParser {
  constructor(options = { typographer: true, quotes: '“”‘’' }) {
    this.md = new MarkdownIt({ ...options, html: false, xhtmlOut: false }).use(wrapInFigurePlugin);
    if (!options.quotes || typeof options.quotes !== 'string') this.md.disable('smartquotes');
  }

  parse(content) {
    return this.md.render(content);
  }

  parseInline(content) {
    return this.md.renderInline(content);
  }
}
