import slugify from '@sindresorhus/slugify';
import { get } from 'lodash-es';
import { isValid } from 'date-fns';

/**
 * A function to assemble a Content Item Url from its fields based on a template
 * @param {string} template - The template to use, should be in a format similar to /post/:category/:slug
 * @param {object} fields - The content object to use for dynamic fields in the template
 * @param {string} [lang] - The language to use for resolving localised fields, if not provided, localised fields return 'undefined'
 * @param {boolean} [slugifyOutput] - Whether to slugify the output or not
 * @param {object} [slugifyOptions] - The options to be passed to slugify
 */
export default function assembleUrlFromTemplate(template, fields, lang, slugifyOutput, slugifyOptions) {
  const hasParameters = /\[(year|_?month|_?day)\]/;
  return template.replace(
    /:((?:\w|\.|-|_)+\[(?:year|_?month|_?day|[0-9])\]|(?:\w|\.|-|_)+)/g, // this regex matches any word, dot, hyphen, underscore, or parameter in [] between : and any other non-word character. It could probably be made more DRY, but I don’t know how
    (match, fieldKey) => { // passing replacer functions to string.replace is a powerful thing
      if (hasParameters.test(fieldKey)) { // we’re trying to get something out of a date
        const [rawKey, parameterWithBracket] = fieldKey.split('[');
        const parameter = parameterWithBracket.slice(0, -1);
        const value = get(fields, rawKey);
        const potentialDate = new Date(value); // if value is not a valid date, it’s not our problem
        if (isValid(potentialDate)) {
          if (parameter === 'day') return String(potentialDate.getDate()).padStart(2, '0');
          if (parameter === '_day') return String(potentialDate.getDate());

          if (parameter === 'month') return String(potentialDate.getMonth() + 1).padStart(2, '0'); // months are zero-based
          if (parameter === '_month') return String(potentialDate.getMonth() + 1); // months are zero-based

          if (parameter === 'year') return String(potentialDate.getFullYear());
        }
        return 'invalid-date';
      }

      const value = get(fields, fieldKey);

      if (value && typeof value === 'object' && !Array.isArray(value)) { // it might be a localised field
        if (!lang) return 'undefined';
        const localisedValue = value[lang];
        if (localisedValue) return slugifyOutput ? slugify(String(localisedValue), slugifyOptions) : localisedValue;
        return 'undefined';
      }
      if (value && Array.isArray(value)) return slugifyOutput ? value.map((item) => slugify(String(item), slugifyOptions)).join('/') : value.join('/');
      return slugifyOutput ? slugify(String(value), slugifyOptions) : value;
    },
  );
}
