export default function fieldTypeToComponent(type) {
  switch (type) {
    case 'checkboxes':
      return 'CheckboxesField';
    case 'color':
      return 'ColorField';
    case 'columns':
      return 'ColumnsField';
    case 'date':
      return 'DateField';
    case 'file':
      return 'FileField';
    case 'group':
      return 'GroupField';
    case 'heading':
      return 'HeadingField';
    case 'id':
      return 'IdField';
    case 'image':
      return 'ImageField';
    case 'languages':
      return 'LanguagesField';
    case 'link':
      return 'LinkField';
    case 'list':
      return 'ListField';
    case 'number':
      return 'NumberField';
    case 'radio group':
      return 'RadioGroupField';
    case 'reference':
      return 'ReferenceField';
    case 'rich text':
      return 'RichTextField';
    case 'rows':
      return 'RowsField';
    case 'select':
      return 'SelectField';
    case 'separator':
      return 'SeparatorField';
    case 'tags':
      return 'TagsField';
    case 'text':
      return 'TextField';
    case 'toggle':
      return 'ToggleField';
    default:
      return null;
  }
}
