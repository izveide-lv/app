import Store from '../../store';

import userInputToRegex from './userInputToRegex';
import expandVisualOnlyFields from './expandVisualOnlyFields';

export function validateField(value, type, rules, label) {
  if (!rules) return '';

  let error = '';
  let valueToCheck = value;

  switch (type) {
    case 'checkboxes':
      valueToCheck = value || [];
      if (rules.enforceMinMax && (rules.min || rules.max)) {
        if (rules.min && valueToCheck.length < rules.min) {
          if (rules.min === 1) error = 'At least one box needs to be selected';
          else error = `At least ${rules.min} boxes need to be selected`;
        } else if (rules.max && valueToCheck.length > rules.max) {
          if (rules.max === 1) error = 'At most one box may to be selected';
          else error = `At most ${rules.max} boxes may be selected`;
        }
      }
      break;
    case 'image':
      if (rules.required) {
        if (typeof valueToCheck === 'string' && !valueToCheck) error = 'An image is required';
        else if (typeof valueToCheck === 'object') { // it must be an advanced media library object
          valueToCheck = value || {};
          if (!valueToCheck.src) error = 'An image is required';
        }
      }
      break;
    case 'languages':
      valueToCheck = value || [];
      if (rules.min && valueToCheck.length < rules.min) {
        if (rules.min === 1) error = 'At least one language is required';
        else error = `At least ${rules.min} languages are required`;
      }
      break;
    case 'link':
      valueToCheck = value || '';
      if (rules.required && !valueToCheck) error = `${label ? 'A' : 'This'} ${label || 'field'} is required`;
      else if (
        valueToCheck
        && !valueToCheck.startsWith('/')
        && !valueToCheck.startsWith('#')
        && !/^tel:\+{0,1}[-0-9]+$/.test(valueToCheck)
        && !/^(?:https?:\/\/|mailto:)(?:www\.)?(?:[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}|localhost:[0-9]+|[.0-9]+:[0-9]+)\b([-a-zA-Z0-9@:%_+.~#?&//=]*$)/.test(valueToCheck)
      ) error = 'This is not a valid URL'; // Regex source: https://graphcms.com/user-guides/working-with/field-validations, adjusted to work for mailto and localhost / IP addresses by me. Still breaks on invalid TLDs if there’s a path attached, but should still be fine for most usecases
      break;
    case 'list':
      valueToCheck = value || [];
      if (rules.min && valueToCheck.length < rules.min) {
        if (rules.min === 1) error = 'At least one item is required';
        else error = `At least ${rules.min} items are required`;
      }
      if (rules.max && valueToCheck.length > rules.max) {
        if (rules.max === 1) error = 'Only one item is allowed';
        else error = `Only up to ${rules.max} items are allowed`;
      }
      break;
    case 'number':
      valueToCheck = typeof value !== 'number' ? '' : value;
      if (rules.required && valueToCheck === '') error = `${label ? 'A' : 'This'} ${label || 'field'} is required`;
      else if (typeof rules.min === 'number' && valueToCheck < rules.min) error = `The value is too small (min ${rules.min})`;
      else if (typeof rules.max === 'number' && valueToCheck > rules.max) error = `The value is too large (max ${rules.max})`;
      break;
    case 'rich text':
    case 'text':
      valueToCheck = value || '';
      if (rules.required && !valueToCheck) error = `${label ? 'A' : 'This'} ${label || 'field'} is required`;
      else if (rules.enforceMinMax && (rules.min || rules.max)) {
        if (rules.min && valueToCheck.length < rules.min) error = 'The value is too short';
        if (rules.max && valueToCheck.length > rules.max) error = 'The value is too long';
      } else if (rules.regex) {
        try {
          if (!userInputToRegex(rules.regex).test(valueToCheck)) error = rules.regexError || 'Invalid value';
        } catch (err) {
          // do nothing, if we end up here it’s because the user-input regex was invalid
        }
      }
      break;
    case 'columns':
    case 'rows':
      valueToCheck = value || [];
      if (rules.min && valueToCheck.length < rules.min) {
        if (rules.min === 1) error = 'At least one item is required';
        else error = `At least ${rules.min} items are required`;
      }
      if (rules.max && valueToCheck.length > rules.max) {
        if (rules.max === 1) error = 'Only one item is allowed';
        else error = `Only up to ${rules.max} items are allowed`;
      }
      break;
    case 'tags':
      valueToCheck = value || [];
      if (rules.min && valueToCheck.length < rules.min) {
        if (rules.min === 1) error = 'At least one tag is required';
        else error = `At least ${rules.min} tags are required`;
      }
      if (rules.max && valueToCheck.length > rules.max) {
        if (rules.max === 1) error = 'Only one tag is allowed';
        else error = `Only up to ${rules.max} tags are allowed`;
      }
      break;
    default:
      if (rules.required && !valueToCheck) error = `${label ? 'A' : 'This'} ${label || 'field'} is required`;
  }
  return error;
}

function validate(field, parent, languages, groupAsKey, index) { // TODO: index can probably go
  const {
    key, value: childFields, label, localised, options, type, validation,
  } = field;
  let value;
  let errors;
  let subfields = childFields;

  if (groupAsKey) {
    if (!parent[groupAsKey]) value = null; // need to fall back to null here in case the groupAs-field doesn’t exist in the parent
    else value = parent[groupAsKey][key];
  } else if (index) value = parent[index];
  else value = parent[key];

  if (type === 'image' && !options.simple && Store.state.currentProject && Store.state.currentProject.media.advanced && Store.state.currentProject.media.customFields) {
    if (value && value.src) subfields = Store.state.currentProject.media.customFields;
  }

  // validate subfields, if any
  if (subfields) {
    if (type === 'rows' || type === 'columns') { // rows, columns, etc. (anything  that is an array of object basically)
      const valueToCheck = value || [];
      valueToCheck.forEach((subvalue, i) => {
        let fieldType;
        if (subfields.length === 1) [fieldType] = subfields;
        else fieldType = subfields.find((subfield) => subfield.key === subvalue.___mb_type);
        if (!fieldType) return; // if we couldn’t find a matching field, it’s an unknown field and will be skipped. This can happen if the field’s key got changed or ___mb_type is missing (e.g. in pre-existing content)
        let error;
        if (fieldType.type === 'group' || subfields.length === 1) error = validate(fieldType, { [fieldType.key]: subvalue }, languages); // if it’s a group or from a row/column with only a single child, we have to fake the parent for it to be validated correctly, since the subvalue is technically the group
        else error = validate(fieldType, subvalue, languages); // otherwise the value lives as a key in the subvalue, so the subvalue can be the parent
        if (error) {
          if (!errors) errors = new Map();
          errors.set(i, error);
        }
      });
    } else { // field groups (so objects (but not localised fields))
      subfields.forEach((subfield) => {
        const error = validate(subfield, value || {}, languages);
        if (error) {
          if (!errors) errors = new Map();
          errors.set(subfield.key, error);
        }
      });
    }
  }

  // validate the field itself
  if (validation) {
    if (localised) { // localised field with localised values
      languages.forEach((lang) => {
        const error = validateField(value ? value[lang] : null, type, validation, label);
        if (error) {
          if (!errors) errors = new Map();
          errors.set(lang, error);
        }
      });
    } else {
      const error = validateField(value, type, validation, label);
      if (error && errors) errors.set(key, error); // this might happen in columns and rows when subfields have errors and the field itself has an error
      else if (error && (type === 'image' || type === 'rows' || type === 'columns')) errors = new Map().set(key, error); // in these fields the error is expected to be a Map with the error under the field’s key
      else if (error) errors = error;
    }
  }

  return errors;
}

export default function validateContent(content, schema, languages) {
  if (typeof content !== 'object') throw new TypeError('content has to be an object');
  if (typeof schema !== 'object') throw new TypeError('schema has to be an object');

  const { fields: rawFields, tabs } = schema;
  const fields = expandVisualOnlyFields(rawFields);
  const errors = new Map();

  if (!tabs || tabs.length === 0) {
    fields.forEach((field) => {
      const error = validate(field, content, languages);
      if (error) errors.set(field.key, error);
    });
  } else {
    tabs.forEach((tab, index) => {
      fields
        .filter((field) => field.tab === tab.label || (index === 0 && !field.tab))
        .forEach((field) => {
          const error = validate(field, content, languages, tab.groupAs);
          if (error) errors.set(field.key, error);
        });
    });
  }

  return errors;
}
