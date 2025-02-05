export default function prettifyEntityName(name) {
  const dotindex = name.indexOf('.', 1); // ignoring leading dots of hidden files
  if (dotindex !== -1) return name.replace(/-/g, ' ').substring(0, name.indexOf('.', 1));
  return name.replace(/-/g, ' ');
}
