export default function richToPlainText(text, characters) {
  if (!characters) return `${text.replace(/(?:[#*_~`]+|!?\[|\]\(.+?\))/g, '').replace(/<[^>]*>/g, ' ')}`;
  const candidate = text.substring(0, characters).replace(/(?:[#*_~`]+|!?\[|\]\(.+?\))/g, '').replace(/<[^>]*>/g, ' ');

  if (text.length > characters) return `${candidate}…`;
  return candidate;
}
