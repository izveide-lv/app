import { cloneDeep } from 'lodash-es';

/**
 * A function to recursively expand any fields with visualOnly === true and a value
 * @param {array} fields - the array of fields to process
 */
export default function expandVisualOnlyFields(fields) {
  return fields.reduce((acc, field) => {
    if (field.visualOnly && Array.isArray(field.value) && field.value.length > 0) return acc.concat(expandVisualOnlyFields(field.value));
    if (field.value && Array.isArray(field.value) && field.value.length > 0) {
      const clone = cloneDeep(field);
      clone.value = expandVisualOnlyFields(field.value);
      acc.push(clone);
      return acc;
    }
    acc.push(field);
    return acc;
  }, []);
}
