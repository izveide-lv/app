// This function is based on https://stackoverflow.com/a/42543908
export default function getScrollParent(element, includeHidden) {
  if (!element) return document.scrollingElement;

  let style = getComputedStyle(element);
  const excludeStaticParent = style.position === 'absolute';
  const overflowRegex = includeHidden ? /(auto|scroll|hidden)/ : /(auto|scroll)/;
  if (style.position === 'fixed') return document.scrollingElement;

  let parent = element;
  while (parent) {
    style = getComputedStyle(parent);
    if (excludeStaticParent && style.position === 'static') {
      parent = parent.parentElement;
      continue; // eslint-disable-line no-continue
    }

    if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX) && parent.clientHeight && parent.clientHeight < parent.scrollHeight) return parent;
    parent = parent.parentElement;
  }
  return document.scrollingElement;
}
