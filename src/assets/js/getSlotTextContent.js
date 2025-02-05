// Takes a Slot and returns all its content as plain text
export default function getSlotTextContent(children) {
  return children
    .map((node) => {
      if (typeof node.children === 'string') return node.children;
      if (Array.isArray(node.children)) return getSlotTextContent(node.children);
      return '';
    })
    .join('');
}
