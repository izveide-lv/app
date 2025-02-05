import { Schema } from 'prosemirror-model';

export default function generateSchema(
  formats,
  options = {
    minHeading: 1, maxHeading: 6, allowQuoteFooters: true, allowNestedLists: true, allowImageCaptions: true,
  },
) {
  const { inline: inlineFormats, block: blockFormats } = formats;
  const allowBlocks = blockFormats && (Array.isArray(blockFormats) || blockFormats === true);
  const nodes = {
    doc: {
      content: allowBlocks ? 'block+' : 'inline*',
    },
    text: {
      group: 'inline',
    },
  };
  const marks = {};

  if (allowBlocks) {
    nodes.paragraph = {
      content: 'inline*',
      group: 'block',
      parseDOM: [{ tag: 'p' }],
      toDOM() {
        return ['p', 0];
      },
    };

    if (Array.isArray(blockFormats)) {
      // Blockqoutes
      if (blockFormats.indexOf('blockquote') > -1) {
        nodes.blockquote = {
          content: options.allowQuoteFooters ? 'block+ (block* | quoteFooter?)' : 'block+',
          group: 'block',
          parseDOM: [{ tag: 'blockquote' }],
          toDOM() {
            return ['blockquote', 0];
          },
        };

        if (options.allowQuoteFooters) {
          nodes.quoteFooter = {
            content: 'text*',
            defining: true,
            parseDOM: [{ tag: 'blockquote footer' }],
            toDOM() {
              return ['footer', 0];
            },
          };
        }
      }
      // Horizontal Rule
      if (blockFormats.indexOf('hr') > -1) {
        nodes.horizontalRule = {
          group: 'block',
          parseDOM: [{ tag: 'hr' }],
          toDOM() {
            return ['hr'];
          },
        };
      }
      // Headings
      if (blockFormats.indexOf('heading') > -1) {
        // Using Math.min / max in case passed values aren’t valid HTML
        for (let i = Math.max(options.minHeading, 1); i <= Math.min(options.maxHeading, 6); i += 1) {
          const parseDOM = [{ tag: `h${i}` }];

          if (i === options.minHeading && i !== 1) {
            for (let j = 1; j < options.minHeading; j += 1) parseDOM.push({ tag: `h${j}` });
          }

          if (i === options.maxHeading && i !== 6) {
            for (let j = options.maxHeading + 1; j <= 6; j += 1) parseDOM.push({ tag: `h${j}` });
          }

          nodes[`heading${i}`] = {
            content: 'inline*',
            group: 'block',
            defining: true,
            parseDOM,
            toDOM() {
              return [`h${i}`, 0];
            },
          };
        }
      }
      // Code Blocks
      if (blockFormats.indexOf('codeBlock') > -1) {
        nodes.codeBlock = {
          attrs: { lang: { default: '' } },
          code: true,
          content: 'text*',
          defining: true,
          group: 'block',
          marks: '',
          parseDOM: [{
            tag: 'pre',
            preserveWhitespace: 'full',
            getAttrs(dom) {
              const codeEl = dom.querySelector('code');
              return { lang: (codeEl && ((codeEl.getAttribute('class') && codeEl.getAttribute('class').replace(/lang(uage)?-/, '')) || codeEl.getAttribute('data-lang'))) || dom.getAttribute('data-lang') || '' };
            },
          }],
          toDOM(node) {
            return ['pre', node.attrs.lang ? { 'data-lang': node.attrs.lang } : {}, ['code', node.attrs.lang ? { class: `language-${node.attrs.lang}` } : {}, 0]];
          },
        };
      }
      // Ordered Lists
      if (blockFormats.indexOf('orderedList') > -1) {
        nodes.orderedList = {
          attrs: { order: { default: 1 } },
          content: 'listItem+',
          group: 'block',
          parseDOM: [{
            tag: 'ol',
            getAttrs(dom) {
              return { order: dom.hasAttribute('start') ? +dom.getAttribute('start') : 1 };
            },
          }],
          toDOM(node) {
            return node.attrs.order === 1 ? ['ol', 0] : ['ol', { start: node.attrs.order }, 0];
          },
        };
      }
      // Unordered Lists
      if (blockFormats.indexOf('unorderedList') > -1) {
        nodes.unorderedList = {
          content: 'listItem+',
          group: 'block',
          parseDOM: [{ tag: 'ul' }],
          toDOM() { return ['ul', 0]; },
        };
      }
      // List Item
      if (blockFormats.indexOf('orderedList') > -1 || blockFormats.indexOf('unorderedList') > -1) {
        let content;
        if (!options.allowNestedLists) content = 'paragraph';
        else if (blockFormats.indexOf('orderedList') > -1 && blockFormats.indexOf('unorderedList') === -1) content = 'paragraph (paragraph | orderedList)*';
        else if (blockFormats.indexOf('unorderedList') > -1 && blockFormats.indexOf('orderedList') === -1) content = 'paragraph (paragraph | unorderedList)*';
        else content = 'paragraph (paragraph | orderedList | unorderedList)*';

        nodes.listItem = {
          content,
          defining: true,
          parseDOM: [{ tag: 'li' }],
          toDOM() { return ['li', 0]; },
        };
      }

      // Images
      if (blockFormats.indexOf('image') > -1) {
        nodes.image = {
          attrs: {
            alt: { default: null },
            data: { default: null },
            decoding: { default: null },
            height: { default: null },
            loading: { default: null },
            src: {},
            title: { default: null },
            width: { default: null },
          },
          content: options.allowImageCaptions ? 'text*' : null,
          draggable: false,
          group: 'block',
          parseDOM: [
            {
              tag: 'figure',
              contentElement: 'figcaption',
              getAttrs(dom) {
                const img = dom.querySelector('img');

                if (!img || !img.getAttribute('src')) return false;

                const data = { ...img.dataset };
                return {
                  alt: img.getAttribute('alt'),
                  data,
                  decoding: img.getAttribute('decoding'),
                  height: img.getAttribute('height'),
                  loading: img.getAttribute('loading'),
                  src: img.getAttribute('src'),
                  title: img.getAttribute('title'),
                  width: img.getAttribute('width'),
                };
              },
            },
            {
              tag: 'img[src]',
              getAttrs(dom) {
                const data = { ...dom.dataset };
                return {
                  alt: dom.getAttribute('alt'),
                  data,
                  decoding: dom.getAttribute('decoding'),
                  height: dom.getAttribute('height'),
                  loading: dom.getAttribute('loading'),
                  src: dom.getAttribute('src'),
                  title: dom.getAttribute('title'),
                  width: dom.getAttribute('width'),
                };
              },
            },
          ],
          selectable: true,
          toDOM(node) {
            const attrs = {
              alt: node.attrs.alt,
              decoding: node.attrs.decoding,
              height: node.attrs.height,
              loading: node.attrs.loading,
              src: node.attrs.src,
              title: node.attrs.title,
              width: node.attrs.width,
            };

            if (node.attrs.data) {
              Object.entries(node.attrs.data).forEach(([key, value]) => {
                // data-attributes in HTML must be all lowercase
                // accessing them via el.dataset returns them as camelCased though, so we convert them back here
                const cleanKey = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
                if (typeof value !== 'undefined' && value !== null && value !== '') attrs[`data-${cleanKey}`] = String(value);
              });
            }
            if (options.allowImageCaptions) return ['figure', ['img', attrs], ['figcaption', 0]];
            return ['figure', ['img', attrs]];
          },
        };
      }
    }
  }

  if (Array.isArray(inlineFormats)) {
    // Breaks
    if (inlineFormats.indexOf('br') > -1) {
      nodes.br = {
        group: 'inline',
        inline: true,
        selectable: false,
        parseDOM: [{ tag: 'br' }],
        toDOM() { return ['br']; },
      };
    }
    // Marks
    // Code
    if (inlineFormats.indexOf('code') > -1) {
      marks.code = {
        parseDOM: [{ tag: 'code' }],
        toDOM() { return ['code', 0]; },
      };
    }
    // Emphasis
    if (inlineFormats.indexOf('em') > -1) {
      marks.em = {
        parseDOM: [
          { tag: 'em' },
          { tag: 'i' },
          { style: 'font-style=italic' },
        ],
        toDOM() { return ['em', 0]; },
      };
    }
    // Link
    if (inlineFormats.indexOf('link') > -1) {
      const relDefault = 'nofollow noopener noreferrer';
      const targetDefault = '_blank';
      marks.link = {
        attrs: {
          href: {},
          rel: { default: relDefault },
          target: { default: targetDefault },
          title: { default: null },
        },
        inclusive: false,
        parseDOM: [{
          tag: 'a',
          getAttrs(dom) {
            return {
              href: dom.getAttribute('href'),
              rel: dom.getAttribute('rel'),
              target: dom.getAttribute('target'),
              title: dom.getAttribute('title'),
            };
          },
        }],
        toDOM(node) {
          const {
            href, rel, target, title,
          } = node.attrs;
          return [
            'a',
            {
              href, rel, target, title,
            },
            0,
          ];
        },
      };
    }
    // Strike
    if (inlineFormats.indexOf('strike') > -1) {
      marks.strike = {
        parseDOM: [
          { tag: 's' },
          { tag: 'strike' },
          { style: 'text-decoration=line-through' },
        ],
        toDOM() { return ['s', 0]; },
      };
    }
    // Strong
    if (inlineFormats.indexOf('strong') > -1) {
      marks.strong = {
        parseDOM: [
          { tag: 'strong' },
          // Taken from Schema-Basic (works around Google Docs Bug)
          { tag: 'b', getAttrs(dom) { return dom.style.fontWeight !== 'normal' && null; } }, // && null is so we don’t get any attributes, but still match
          { style: 'font-weight', getAttrs(value) { return /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null; } }, // && null is so we don’t get any attributes, but still match
        ],
        toDOM() { return ['strong', 0]; },
      };
    }
  }

  return new Schema({ nodes, marks });
}
