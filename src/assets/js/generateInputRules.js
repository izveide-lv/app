import { InputRule, wrappingInputRule, textblockTypeInputRule } from 'prosemirror-inputrules';

// modified from here: https://discuss.prosemirror.net/t/input-rules-for-wrapping-marks/537/10
function markInputRule(regexp, markType, getAttrs) {
  return new InputRule(regexp, (state, match, start, end) => {
    const attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs;
    const { tr } = state;
    let markEnd = end;
    if (match[1]) {
      const textStart = start + match[0].indexOf(match[1]);
      const textEnd = textStart + match[1].length;
      if (textEnd < end) tr.delete(textEnd, end);
      if (textStart > start) tr.delete(start, textStart);
      markEnd = start + match[1].length;
    }
    tr.addMark(start, markEnd, markType.create(attrs));
    tr.removeStoredMark(markType); // Do not continue with mark.
    return tr;
  });
}

export default function generateInputRules(schema, userOptions = {}) {
  const rules = [];
  const defaults = {
    autoquotes: '“”‘’',
    dashes: true,
    ellipsis: true,
    minHeading: 1,
    maxHeading: 6,
    noDoubleCaps: true,
    noDoubleSpace: true,
  };
  const options = { ...defaults, ...userOptions };

  if (typeof options.autoquotes === 'string' && options.autoquotes.length === 4) {
    const [openDouble, closeDouble, openSingle, closeSingle] = options.autoquotes;

    // opening double quotes.
    rules.push(new InputRule(/(?:^|[\s{[(<'"\u2018\u201C])(")$/, openDouble));
    // closing double quotes.
    rules.push(new InputRule(/"$/, closeDouble));
    // opening single quotes.
    rules.push(new InputRule(/(?:^|[\s{[(<'"\u2018\u201C])(')$/, openSingle));
    // closing single quotes.
    rules.push(new InputRule(/'$/, closeSingle));
  }

  if (options.dashes) {
    // en dash
    rules.push(new InputRule(/--$/, '–'));
    // em dash
    rules.push(new InputRule(/–-$/, '—'));
  }

  // ellipsis
  if (options.ellipsis) rules.push(new InputRule(/\.\.\.$/, '…'));

  // prevent double spaces
  if (options.noDoubleSpace) rules.push(new InputRule(/ {2,}$/, ' ', { undoable: false }));

  if (options.noDoubleCaps) {
    rules.push(new InputRule(/(^|\s)[A-Z]{2}[a-z]+\W$/, (state, match, start, end) => {
      const { tr } = state;
      const [matchedText, leadingWhitespace] = match;
      const trimmedMatch = matchedText.trimStart(); // needed because match might include leading whitespace
      const transformedMatch = `${leadingWhitespace}${trimmedMatch[0]}${trimmedMatch[1].toLowerCase()}${trimmedMatch.substring(2)}`;
      tr.insertText(transformedMatch, start, end);
      return tr;
    }));
  }

  let type;

  /* eslint-disable no-cond-assign */
  if (type = schema.nodes.blockquote) rules.push(wrappingInputRule(/^\s*>\s$/, type));
  if (type = schema.nodes.quoteFooter) rules.push(textblockTypeInputRule(/^[-–—]\s$/, type));
  if (type = schema.nodes.codeBlock) rules.push(textblockTypeInputRule(/^```([a-zA-Z]*)?\s$/, type, (match) => ({ lang: match[1] || '' })));
  if (type = schema.nodes.orderedList) rules.push(wrappingInputRule(/^(\d+)\.\s$/, type, (match) => ({ order: +match[1] }), (match, node) => node.childCount + node.attrs.order === +match[1]));
  if (type = schema.nodes.unorderedList) rules.push(wrappingInputRule(/^\s*([-+*])\s$/, type));

  if (options.minHeading && options.maxHeading) {
    const min = Math.max(options.minHeading, 1);
    const max = Math.min(options.maxHeading, 6);

    for (let i = min; i <= max; i += 1) {
      if (type = schema.nodes[`heading${i}`]) rules.push(textblockTypeInputRule(new RegExp(`^#{${i}}\\s$`), type));
    }
  }

  if (type = schema.marks.code) rules.push(markInputRule(/(?!^)`(\S(?:|.*?\S))`$/, type));
  // if (type = schema.marks.em) rules.push(markInputRule(/_(\S(?:|.*?\S))_$/, type)); // these work, but are inconsistent, so I’m leaving them out for now, the code one is fine because a backtick isn’t really used in normal text
  // if (type = schema.marks.strong) rules.push(markInputRule(/\*\*(\S(?:|.*?\S))\*\*$/, type));
  // if (type = schema.marks.strike) rules.push(markInputRule(/~(\S(?:|.*?\S))~$/, type));
  /* eslint-enable no-cond-assign */

  return rules;
}
