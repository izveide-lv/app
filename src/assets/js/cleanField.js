import { cloneDeep } from 'lodash-es';

/**
 * This function takes a fully formed Field object and strips out metadata
 * and transforms the field options into a plain object of key:value pairs
 * @param {object} field - The field config to generate the field from
 * @returns A field stripped of any unnecessary metadata ready to be used in FieldEditors
 */
export default function cleanField(field) {
  const cf = {};

  Object.entries(field).forEach(([key, value]) => {
    if (key === 'options' && value.length > 0) {
      cf.options = {};
      value.forEach((option) => {
        cf.options[option.key] = cloneDeep(option.value);
      });
    } else if (key === 'value' && value) cf.value = [];
    else cf[key] = cloneDeep(value);
  });

  delete cf.tab;
  delete cf.description; // not needed, so let’s save space
  delete cf.group; // not needed, so let’s save space

  return cf;
}
