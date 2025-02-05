import { get } from 'lodash-es';
import getFieldsByPredicate from './getFieldsByPredicate';

/**
 * A function to return either the default languages or the languages defined
 * for a particular piece of content based on the first Content Languages field
 * in the Schema
 *
 * @param {Object} content - the content data object
 * @param {Object} schema - the schema of the content
 * @param {array} defaultLanguages - the defaultLanguages to return if not overwritten
 *
 * @returns {array} of languages
 */
export default function getContentLanguages(content = {}, schema, defaultLanguages) { // eslint-disable-line default-param-last
  if (!schema.fields) return defaultLanguages;
  const [languagesField] = getFieldsByPredicate(schema, (field) => field.type === 'languages');
  let languages;

  if (languagesField) languages = get(content, languagesField.contentpath);

  if (!languages || languages.length === 0) return defaultLanguages;
  return languages;
}
