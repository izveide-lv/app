/**
 * @typedef {object} FieldData
 * @property {array} keypath - the path of the field in the Schema
 * @property {array} contentpath - the path of the fields value in content
 * @property {object} field - the instance of field in the Schema
 */

/**
 * A function to get an array of key paths to fields within a Schema based a predicate function
 * for example to quickly find all fields of a certain type
 * @param {object} schema - the Schema to perform the search on
 * @param {function} predicate - the predicate function to determine inclusion, will be passed the field and has to return true or false
 * @returns {array} of {@link FieldData} for the fields matching predicate
 */
export default function getFieldsByPredicate(schema, predicate) {
  const { fields, tabs } = schema;
  const keypath = [];
  const contentpath = [];
  const results = [];

  function search(subfields, toplevel) {
    for (let index = 0; index < subfields.length; index += 1) {
      const currentField = subfields[index];
      keypath.push(currentField.key);

      if (toplevel && currentField.tab && tabs) {
        contentpath.length = 0; // clear the content path, we are at the top level and can safely get rid of any previous tab groupAs values
        const fieldTab = schema.tabs.find((tab) => tab.label === currentField.tab);
        if (fieldTab && fieldTab.groupAs) contentpath.push(fieldTab.groupAs);
      }
      if (!currentField.visualOnly) contentpath.push(currentField.key);

      if (predicate(currentField)) {
        results.push({
          keypath: [...keypath], // cloning since these will keep changing as the loop progresses
          contentpath: [...contentpath], // cloning since these will keep changing as the loop progresses
          field: currentField,
        });
      }
      if (Array.isArray(currentField.value)) {
        search(currentField.value);
      }
      keypath.pop();
      if (!currentField.visualOnly) contentpath.pop();
    }
  }

  search(fields, true);
  return results;
}
