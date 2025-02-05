import { isValid, parseISO } from 'date-fns';
import { cloneDeep, isEqual } from 'lodash-es';
import pluralize from 'pluralize';

import defaultFields from '../../data/defaultFields';

const labelledTypes = new Map();
defaultFields.forEach((field) => !field.visualOnly && labelledTypes.set(field.type, field));

function generateTypeCandidatesArray(...types) {
  const array = types.map((type) => ({ label: labelledTypes.get(type).label, value: type }));
  array.push({ label: 'Ignore field', value: null });
  return array;
}

function generateAllTypesArray() {
  return [...Array.from(labelledTypes.entries()).map(([type, field]) => ({ label: field.label, value: type })), { label: 'Ignore field', value: null }];
}

function isLanguageCode(code) {
  return (code.length === 2 && /[a-zA-Z]{2}/.test(code)) || (code.length === 5 && /[a-zA-Z]{2}-[a-zA-Z]{2}/.test(code));
}

function identifyFieldTypeByValue(value, key) {
  const candidate = { type: null, typeCandidates: [] }; // may also contain localised and children if necessary
  const valueType = typeof value;
  if (key && key.startsWith('___mb_')) candidate.typeCandidates = [{ label: 'Ignore field', value: null }]; // internal fields should be ignored
  else if (value === null || (typeof value === 'object' && Object.keys(value).length === 0)) candidate.typeCandidates = generateAllTypesArray();
  else if (valueType !== 'object') {
    switch (valueType) {
      case 'string':
        if ((value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) && value.includes('.')) { // it’s likely a file
          candidate.type = 'file';
          candidate.typeCandidates = generateTypeCandidatesArray('file', 'text', 'rich text', 'id', 'radio group', 'select', 'link', 'image');
        } else if (((value.startsWith('http') || value.startsWith('www')) && value.includes('.')) || value.startsWith('/')) { // it’s likely some sort of url
          candidate.type = 'link';
          candidate.typeCandidates = generateTypeCandidatesArray('link', 'text', 'rich text', 'id', 'radio group', 'color', 'select', 'link', 'image');
        } else if (isValid(parseISO(value)) || (value.length >= 8 && value.length <= 11 && isValid(new Date(Number.parseInt(value, 10))))) { // it’s likely a date (we’re checking if the string is shorter than 12 characters, which should be enough to cover most reasonable dates according to https://stackoverflow.com/questions/4415631/timestamp-string-length)
          candidate.type = 'date';
          candidate.typeCandidates = generateTypeCandidatesArray('date', 'text', 'rich text', 'id', 'radio group', 'select', 'link');
        } else if ((value.startsWith('#') && (value.length === 4 || value.length === 7)) || value.startsWith('rgb') || value.startsWith('hsl')) { // it’s likely a color
          candidate.type = 'color';
          candidate.typeCandidates = generateTypeCandidatesArray('color', 'text', 'rich text', 'id', 'radio group', 'select', 'link');
        } else if (/([\n*>]|_{2,}|<\/|^#+ )/.test(value)) { // it’s likely a rich text-field (with multiple lines, markdown or html in it)
          candidate.type = 'rich text';
          candidate.typeCandidates = generateTypeCandidatesArray('rich text', 'text', 'id', 'radio group', 'file', 'select', 'link');
        } else { // it’s likely a plain text input
          candidate.type = 'text';
          candidate.typeCandidates = generateTypeCandidatesArray('text', 'rich text', 'id', 'radio group', 'color', 'select', 'link');
        }
        break;
      case 'number':
        if (value > 946684800000 && isValid(new Date(value))) { // it’s likely a date in ms format (the comparison number is Jan 1st 2000, so we don’t wrongfully classify too many (smaller) numbers as date)
          candidate.type = 'date';
          candidate.typeCandidates = generateTypeCandidatesArray('date', 'number');
        } else {
          candidate.type = 'number';
          candidate.typeCandidates = generateTypeCandidatesArray('number', 'date', 'radio group', 'select');
        }
        break;
      case 'boolean':
        candidate.type = 'toggle';
        candidate.typeCandidates = generateTypeCandidatesArray('toggle', 'radio group', 'select');
        break;
      default:
        candidate.typeCandidates = generateAllTypesArray();
    }
  } else if (Array.isArray(value)) { // that narrows it down a little
    if (value.length > 0 && value.every((subvalue) => typeof subvalue === 'string' && isLanguageCode(subvalue))) { // it’s likely a content languages field
      candidate.type = 'languages';
      candidate.typeCandidates = generateTypeCandidatesArray('languages', 'list', 'tags', 'checkboxes');
    } else if (value.every((subvalue) => typeof subvalue !== 'object')) { // it’s probably a list of sorts
      candidate.type = 'tags';
      candidate.typeCandidates = generateTypeCandidatesArray('tags', 'list', 'checkboxes', 'languages');
    } else { // it’s a repeating field group
      candidate.type = 'rows';
      candidate.typeCandidates = generateTypeCandidatesArray('rows', 'columns');
      candidate.children = value.reduce((acc, subvalue) => {
        const childCandidateDetails = identifyFieldTypeByValue(subvalue); // we have to see what type it is before we can filter, because the values might be different from each other despite technically being the same type since their details vary

        // once we know the details we can see if they already exist in the accumulator
        // if so, we don’t need to add them again
        // we can’t just do a general isEqual, because existing childCandidates have a key
        if (acc.some((existingChildCandidate) => existingChildCandidate.type === childCandidateDetails.type && isEqual(existingChildCandidate.typeCandidates, childCandidateDetails.typeCandidates) && existingChildCandidate.localised === childCandidateDetails.localised && isEqual(existingChildCandidate.children, childCandidateDetails.children))) {
          return acc;
        }

        let keyCandidate;

        if (subvalue && subvalue.___mb_type) keyCandidate = subvalue.___mb_type;
        else if (key && pluralize.isPlural(key)) keyCandidate = pluralize.singular(key);
        else keyCandidate = `${key}-element`;

        const usageAmount = acc.filter((existingChildCandidate) => existingChildCandidate.key.startsWith(keyCandidate)).length; // check how many other keys already include the key candidate

        const childCandidate = {
          key: usageAmount === 0 ? keyCandidate : `${keyCandidate}-${usageAmount}`,
          type: childCandidateDetails.type,
          typeCandidates: childCandidateDetails.typeCandidates,
        };

        if (childCandidateDetails.localised) childCandidate.localised = childCandidateDetails.localised;
        if (childCandidateDetails.children) childCandidate.children = childCandidateDetails.children;

        acc.push(childCandidate);
        return acc;
      }, []);
    }
  } else if (Object.keys(value).every((subkey) => isLanguageCode(subkey))) { // it’s a localised field
    const { type, typeCandidates } = identifyFieldTypeByValue(Object.values(value)[0]); // look at the first entry and use the type of that
    candidate.type = type;
    candidate.typeCandidates = [...typeCandidates, ...generateTypeCandidatesArray('group')];
    candidate.localised = true;
  } else if (typeof value.src === 'string' && typeof value.alt !== 'undefined') { // it’s probably an image
    candidate.type = 'image';
    candidate.typeCandidates = generateTypeCandidatesArray('image', 'group');
  } else { // it’s a group
    candidate.type = 'group';
    candidate.typeCandidates = generateTypeCandidatesArray('group');
    candidate.children = generateFieldCandidates(value); // eslint-disable-line no-use-before-define
  }
  return candidate;
}

export function generateFieldCandidates(obj) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const candidate = { key, type: null, typeCandidates: [] };
    const {
      type, typeCandidates, localised, children,
    } = identifyFieldTypeByValue(value, key);

    candidate.type = type;
    candidate.typeCandidates = typeCandidates;
    if (localised) candidate.localised = localised;
    if (children) candidate.children = children;

    acc.push(candidate);
    return acc;
  }, []);
}

function createFieldFromCandidate(candidate, tab) {
  const {
    key, type, localised, children,
  } = candidate;

  const cleanField = {};
  Object.entries(labelledTypes.get(type)).forEach(([prop, value]) => {
    if (prop === 'options' && value.length > 0) {
      cleanField.options = {};
      value.forEach((option) => {
        cleanField.options[option.key] = cloneDeep(option.value);
      });
    } else if (prop === 'value' && value) cleanField.value = [];
    else cleanField[prop] = cloneDeep(value);
  });

  delete cleanField.description; // not needed, so let’s save space
  delete cleanField.group; // not needed, so let’s save space

  cleanField.label = `${key[0].toUpperCase()}${key.substring(1)}`;
  cleanField.key = key;
  if (localised) cleanField.localised = localised;
  if (tab) cleanField.tab = tab;
  if (children && children.length > 0) cleanField.value = children.filter((child) => child.type !== null).map((child) => createFieldFromCandidate(child, tab));
  return cleanField;
}

export function generateSchemaFromCandidates(fieldCandidates, createTabs) {
  const defaultTab = 'ungrouped';
  const tabs = [{ label: defaultTab, groupAs: null }];
  const fields = [];
  fieldCandidates.forEach((candidate) => {
    if (!candidate.type) return;
    if (createTabs && candidate.type === 'group') {
      tabs.push({ label: candidate.key, groupAs: candidate.key });
      fields.push(...candidate.children.filter((child) => child.type !== null).map((child) => createFieldFromCandidate(child, candidate.key)));
    } else fields.push(createFieldFromCandidate(candidate, defaultTab));
  });
  return { fields, tabs };
}
