export default function flattenFields(fields) {
  return fields.reduce((acc, field) => {
    acc.push(field);
    if (Array.isArray(field.value)) acc.push(...flattenFields(field.value));
    return acc;
  }, []);
}
