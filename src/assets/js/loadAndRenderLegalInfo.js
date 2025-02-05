import MarkdownParser from './MarkdownParser';

const md = new MarkdownParser();

export default async function renderLegalInfo() {
  let imprint = '';
  let privacy = '';

  try {
    const markdownFiles = import.meta.glob(['/IMPRINT.md', '/PRIVACY.md'], { import: 'default', query: '?raw' });
    if (markdownFiles['/IMPRINT.md']) imprint = await markdownFiles['/IMPRINT.md']();
    if (markdownFiles['/PRIVACY.md']) privacy = await markdownFiles['/PRIVACY.md']();
  } catch (err) {
    // do nothing, it will fall back to the default message
  }
  return { renderedImprint: md.parse(imprint), renderedPrivacyPolicy: md.parse(privacy) };
}
