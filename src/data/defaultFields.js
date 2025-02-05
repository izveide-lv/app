/*

interface Field {
  type: String!,
  default: Any,
  description: String,
  displayField: String!
  group: String,
  icon: String,
  key: String!,
  label: String!,
  localised: Boolean,
  options: [
    {
      component: String!,
      key: String!,
      label: String,
      props: Object,
      slot: String,
      value: Any,
    },
  ],
  tab: String,
  validation: { enforceMinMax: Boolean, max: Number, min: Number, regex: String, regexError: String, required: Boolean, unit: String, isString: Boolean },
  value: Any,
  version: Number,
  visibility: { hidden: false, limitToRoles: Array, showByValue: { comparator: [String, Number], field: String, value: Any } },
  visualOnly: Boolean, // excluded from content files, serves purely visual function
},

For easy copy paste with defaults:

{
  type: String!,
  default: null,
  description: String!,
  displayField: String!
  group: String!,
  icon: String!,
  key: '',
  label: String!,
  localised: false,
  options: [],
  tab: null,
  validation: {
    enforceMinMax: false, max: null, min: null, regex: null, regexError: null, required: false,
  },
  value: null,
  version: 1,
  visibility: { hidden: false, showByValue: { field: null } },
  visualOnly: Boolean, // excluded from content files, serves purely visual function
},

*/

export default [
  {
    type: 'id',
    description: 'Adds a unique ID to the content',
    group: 'helpers',
    icon: 'hash',
    key: '',
    label: 'Unique ID',
    options: [
      {
        component: 'MbSelect',
        key: 'type',
        label: 'Default id:',
        props: { options: [{ label: 'Filepath', value: 'filepath' }, { label: 'Generated UUID', value: 'uuid' }, { label: 'Template', value: 'template' }] },
        value: 'uuid',
      },
      {
        component: 'MbInput',
        key: 'idTemplate',
        label: 'Template to generate the ID from:',
        props: { placeholder: 'e.g. post/:title' },
        value: '',
      },
      {
        component: 'MbToggle',
        key: 'editable',
        slot: 'Make editable',
        value: false,
      },
    ],
    tab: null,
    validation: { required: true },
    value: null,
    version: 3,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'languages',
    default: null,
    description: 'Allows selecting which languages the content will be available in',
    group: 'helpers',
    icon: 'language',
    key: '',
    label: 'Content Languages',
    tab: null,
    validation: { min: 1, unit: 'languages' },
    value: null,
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'text',
    default: null,
    description: 'Basic text input field with support for wrapping and multiple lines',
    group: 'content',
    icon: 'text-input',
    key: '',
    label: 'Unformatted Text',
    localised: false,
    options: [
      {
        component: 'MbToggle',
        key: 'wrapping',
        slot: 'Wrap the text if its wider than the input field',
        value: true,
      },
      {
        component: 'MbToggle',
        key: 'multiline',
        slot: 'Allow line breaks',
        value: false,
      },
    ],
    tab: null,
    validation: { enforceMinMax: true, max: null, min: null, regex: null, regexError: null, required: false, unit: 'length' }, // eslint-disable-line object-curly-newline
    value: null,
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'number',
    default: null,
    description: 'Basic number input field',
    group: 'content',
    icon: 'number',
    key: '',
    label: 'Number',
    localised: false,
    tab: null,
    validation: { max: null, min: null, required: false }, // eslint-disable-line object-curly-newline
    value: null,
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'rich text',
    default: null,
    description: 'Configurable rich text editor field',
    group: 'content',
    icon: 'text',
    key: '',
    label: 'Rich Text',
    localised: false,
    options: [
      {
        component: 'MbRadioGroup',
        key: 'outputFormat',
        label: 'Output format:',
        props: { inline: true, options: [{ label: 'HTML', value: 'html' }, { label: 'Markdown', value: 'markdown' }] },
        value: 'html',
      },
      {
        component: 'MbCheckboxGroup',
        key: 'blockFormats',
        label: 'Allowed block formats:',
        props: {
          checkboxes: [
            { label: 'Blockqoutes', value: 'blockquote' },
            { label: 'Code blocks', value: 'codeBlock' },
            { label: 'Headings', value: 'heading' },
            { label: 'Separators', value: 'hr' },
            { label: 'Numbered lists', value: 'orderedList' },
            { label: 'Bullet lists', value: 'unorderedList' },
            { label: 'Images', value: 'image' },
          ],
        },
        value: ['blockquote', 'heading', 'hr', 'orderedList', 'unorderedList', 'image'],
      },
      {
        component: 'MbCheckboxGroup',
        key: 'inlineFormats',
        label: 'Allowed inline formats:',
        props: {
          checkboxes: [
            { label: 'Hard line breaks', value: 'br' },
            { label: 'Inline code', value: 'code' },
            { label: 'Italics', value: 'em' },
            { label: 'Links', value: 'link' },
            { label: 'Strikethrough', value: 'strike' },
            { label: 'Bold', value: 'strong' },
          ],
        },
        value: ['em', 'strong', 'link'],
      },
      {
        component: 'MbCheckboxGroup',
        key: 'formatOptions',
        label: 'Format options:',
        props: {
          checkboxes: [{ label: 'Footers in quotes', value: 'allowQuoteFooters' }, { label: 'Nested lists', value: 'allowNestedLists' }, { label: 'Image captions', value: 'allowImageCaptions' }],
        },
        value: ['allowQuoteFooters', 'allowNestedLists', 'allowImageCaptions'],
      },
      {
        component: 'MbCheckboxGroup',
        key: 'inputRuleOptions',
        label: 'Automatic replacements:',
        props: {
          checkboxes: [
            { label: 'Smart quotes', value: 'autoquotes' },
            { label: 'Dashes', value: 'dashes' },
            { label: 'Ellipsis', value: 'ellipsis' },
            { label: 'Prevent double capitals', value: 'noDoubleCaps' },
            { label: 'Prevent double spaces', value: 'noDoubleSpace' },
          ],
        },
        value: ['autoquotes', 'dashes', 'ellipsis', 'noDoubleCaps', 'noDoubleSpace'],
      },
      {
        component: 'MbSelect',
        key: 'minHeading',
        label: 'Minimum heading level:',
        props: {
          options: [
            { label: 'H1', value: 1 },
            { label: 'H2', value: 2 },
            { label: 'H3', value: 3 },
            { label: 'H4', value: 4 },
            { label: 'H5', value: 5 },
            { label: 'H6', value: 6 },
          ],
        },
        value: 2,
      },
      {
        component: 'MbSelect',
        key: 'maxHeading',
        label: 'Maximum heading level:',
        props: {
          options: [
            { label: 'H1', value: 1 },
            { label: 'H2', value: 2 },
            { label: 'H3', value: 3 },
            { label: 'H4', value: 4 },
            { label: 'H5', value: 5 },
            { label: 'H6', value: 6 },
          ],
        },
        value: 4,
      },
      {
        component: 'MbTagInput',
        key: 'codeLangs',
        label: 'Languages for code blocks:',
        props: { allowUnsuggested: true, placeholder: 'New language…' },
        value: ['html', 'css', 'javascript', 'markdown'],
      },
      {
        component: 'MbToggle',
        key: 'allowRaw',
        slot: 'Allow editing the raw source-code',
        value: false,
      },
      {
        component: 'MbInput',
        key: 'urlTemplate',
        label: 'Custom URL Template for internal links:',
        props: { placeholder: 'e.g. /blog/:category/:title\\.html' },
        value: '',
      },
      {
        component: 'MbInput',
        key: 'urlSuffix',
        label: 'Suffix for internal links (when using file path):',
        props: { placeholder: 'e.g. .html' },
        value: '',
      },
      {
        component: 'MbCheckboxGroup',
        key: 'linkOptions',
        label: 'Linking options:',
        props: {
          checkboxes: [
            { label: 'Force opening in a new window', value: 'forceBlankTarget' },
            { label: 'Force nofollow hints', value: 'forceNofollow' },
            { label: 'Use file path as URL', value: 'useFilePath' },
            { label: 'Allow external links', value: 'allowExternal' },
            { label: 'Allow internal links', value: 'allowInternal' },
          ],
        },
        value: ['forceBlankTarget', 'allowExternal', 'allowInternal'],
      },
    ],
    tab: null,
    validation: { enforceMinMax: true, max: null, min: null, regex: null, regexError: null, required: false, unit: 'length' }, // eslint-disable-line object-curly-newline
    value: null,
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'group',
    description: 'Groups multiple fields under a common key, ideal for objects',
    displayField: null,
    group: 'structure',
    icon: 'group',
    key: '',
    label: 'Field Group',
    tab: null,
    value: [],
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'heading',
    description: 'Show a heading and / or description between sibling fields',
    group: 'visual',
    icon: 'heading-spaced',
    key: '___mb_visual_heading',
    label: 'Heading and Description',
    options: [
      {
        component: 'MbInput',
        key: 'heading',
        props: { icon: 'heading-alt', label: 'Heading' },
        value: '',
      },
      {
        component: 'MbEditor',
        key: 'description',
        props: {
          formats: { block: false, inline: ['code', 'em', 'strong', 'link'] }, label: 'Description', linkOptions: { forceBlankTarget: true, forceNofollow: true, only: 'external' }, outputFormat: 'html',
        },
        value: '',
      },
    ],
    tab: null,
    version: 2,
    visibility: { showByValue: { field: null } },
    visualOnly: true,
  },
  {
    type: 'separator',
    description: 'Adds a line and whitespace between the two sibling fields',
    group: 'visual',
    icon: 'add-separator',
    key: '___mb_visual_separator',
    label: 'Separator',
    tab: null,
    version: 2,
    visibility: { showByValue: { field: null } },
    visualOnly: true,
  },
  {
    type: 'date',
    default: null,
    description: 'A date picker with an optional time selector',
    group: 'content',
    icon: 'calendar',
    key: '',
    label: 'Date and Time',
    options: [
      {
        component: 'MbRadioGroup',
        key: 'outputFormat',
        label: 'Output format:',
        props: { inline: true, options: [{ label: 'Milliseconds', value: 'ms' }, { label: 'ISO Format', value: 'iso' }] },
        value: 'iso',
      },
      {
        component: 'MbToggle',
        key: 'removable',
        slot: 'Allow the date to be removed once set',
        value: false,
      },
      {
        component: 'MbToggle',
        key: 'showTime',
        slot: 'Show a time selector as well',
        value: true,
      },
      {
        component: 'MbToggle',
        key: 'defaultToNow',
        slot: 'Default to the current date when no value is set',
        value: true,
      },
      {
        component: 'MbToggle',
        key: 'useAsUpdatedAt',
        slot: 'Always set to current date after content was edited',
        value: false,
      },
      {
        component: 'MbSelect',
        key: 'only',
        label: 'Only allow dates in the…',
        props: {
          options: ['past', 'future', { label: 'Unset', value: null }],
        },
        value: null,
      },
    ],
    tab: null,
    validation: {
      max: null, min: null, required: false, unit: 'date', isString: true,
    },
    value: null,
    version: 2,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'columns',
    default: null,
    description: 'Allows adding sub-fields as columns, ideal for arrays of objects',
    group: 'structure',
    icon: 'columns',
    key: '',
    label: 'Columns',
    options: [
      {
        component: 'MbToggle',
        key: 'allowEditing',
        slot: 'Allow adding and deleting columns',
        value: true,
      },
      {
        component: 'MbInput',
        key: 'itemLabel',
        label: 'Item label:',
        props: { icon: 'tag' },
        value: 'Column',
      },
    ],
    tab: null,
    validation: { max: null, min: null, unit: 'columns' },
    value: [],
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'rows',
    default: null,
    description: 'Allows adding sub-fields as rows, ideal for arrays of objects',
    group: 'structure',
    icon: 'rows',
    key: '',
    label: 'Rows',
    options: [
      {
        component: 'MbToggle',
        key: 'compact',
        slot: 'Compact rows',
        value: true,
      },
      {
        component: 'MbToggle',
        key: 'allowEditing',
        slot: 'Allow adding and deleting rows',
        value: true,
      },
      {
        component: 'MbInput',
        key: 'itemLabel',
        label: 'Item label:',
        props: { icon: 'tag' },
        value: 'Row',
      },
    ],
    tab: null,
    validation: { max: null, min: null, unit: 'rows' },
    value: [],
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'image',
    default: null,
    description: 'An image picker with (optional) resolution hints and size limits',
    group: 'content',
    icon: 'image',
    key: '',
    label: 'Image',
    options: [
      {
        component: 'MbInput',
        key: 'resolutionHint',
        label: 'Ideal resolution:',
        props: { icon: 'resolution', placeholder: '640x360' },
        value: '',
      },
      {
        component: 'MbToggle',
        key: 'removable',
        slot: 'Allow the image to be removed once set',
        value: true,
      },
      {
        component: 'MbToggle',
        key: 'simple',
        slot: 'Deactivate the advanced media library for this image',
        value: false,
      },
    ],
    tab: null,
    validation: { max: null, required: false, unit: 'filesize (MB)' },
    value: null,
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'toggle',
    default: null,
    description: 'A simple toggle that can output true or false',
    group: 'helpers',
    icon: 'toggle-on',
    key: '',
    label: 'Toggle',
    options: [
      {
        component: 'MbIconPicker',
        key: 'iconLeft',
        label: 'Icon for the ‘false’ value:',
        props: { removable: true },
        value: null,
      },
      {
        component: 'MbIconPicker',
        key: 'iconRight',
        label: 'Icon for the ‘true’ value:',
        props: { removable: true },
        value: null,
      },
    ],
    tab: null,
    value: null,
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'color',
    default: null,
    description: 'A colour picker with support for pre-defined palettes',
    group: 'helpers',
    icon: 'color',
    key: '',
    label: 'Color',
    options: [
      {
        component: 'MbRadioGroup',
        key: 'format',
        label: 'Output format:',
        props: { inline: true, options: [{ label: 'HEX', value: 'hex' }, { label: 'RGB', value: 'rgb' }, { label: 'RGBA', value: 'rgba' }] },
        value: 'hex',
      },
      {
        component: 'MbToggle',
        key: 'removable',
        slot: 'Allow the color to be removed once set',
        value: false,
      },
      {
        component: 'MbToggle',
        key: 'useBrandPalette',
        slot: 'Enable brand colours',
        value: true,
      },
      {
        component: 'MbToggle',
        key: 'paletteOnly',
        slot: 'Only allow selecting a color from the provided palette',
        value: false,
      },
      {
        component: 'MbPalette',
        key: 'palette',
        label: 'Custom palette:',
        props: { format: 'rgba' },
        value: [],
      },
    ],
    tab: null,
    validation: { required: false },
    value: null,
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'tags',
    default: null,
    description: 'An input field for a sortable list of items',
    group: 'content',
    icon: 'tags',
    key: '',
    label: 'Tags',
    localised: false,
    options: [
      {
        component: 'MbToggle',
        key: 'allowUnsuggested',
        slot: 'Allow values not defined in the model below',
        value: true,
      },
      {
        component: 'MbEditableList',
        key: 'autocompleteModel',
        value: [],
      },
    ],
    tab: null,
    validation: {
      max: null, min: null, unit: 'tags',
    },
    value: null,
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'list',
    default: null,
    description: 'A sortable list of custom values',
    group: 'content',
    icon: 'bullet-list',
    key: '',
    label: 'Sortable list',
    localised: false,
    options: [
      {
        component: 'MbToggle',
        key: 'limitToModel',
        slot: 'Only allow values defined in the model below',
        value: false,
      },
      {
        component: 'MbEditableList',
        key: 'model',
        value: [],
      },
    ],
    tab: null,
    validation: {
      enforceMinMax: false, max: null, min: null, unit: 'list items',
    },
    value: null,
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'select',
    default: null,
    description: 'A dropdown field to select a single value',
    group: 'helpers',
    icon: 'dropdown',
    key: '',
    label: 'Dropdown',
    options: [
      {
        component: 'MbToggle',
        key: 'filterable',
        slot: 'Make the dropdown searchable',
        value: false,
      },
      {
        component: 'MbToggle',
        key: 'removable',
        slot: 'Allow the value to be removed once set',
        value: false,
      },
      {
        component: 'MbInput',
        key: 'placeholder',
        label: 'Placeholder text when empty:',
        props: { icon: 'placeholder', modelModifiers: { trim: true, lazy: true } },
        value: 'Select a value…',
      },
      {
        component: 'MbEditableList',
        key: 'options',
        label: 'Options:',
        value: [],
      },
    ],
    tab: null,
    validation: {
      required: false,
    },
    value: null,
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'file',
    default: null,
    description: 'A file picker to pick certain types of files',
    group: 'content',
    icon: 'attachment',
    key: '',
    label: 'File',
    localised: false,
    options: [
      {
        component: 'MbToggle',
        key: 'removable',
        slot: 'Allow the file to be removed once set',
        value: false,
      },
      {
        component: 'MbToggle',
        key: 'allowUpload',
        slot: 'Allow uploading new files',
        value: false,
      },
      {
        component: 'MbFilePicker',
        key: 'root',
        label: 'Only allow picking files from this folder:',
        props: { removable: true },
        value: null,
      },
      {
        component: 'MbTagInput',
        key: 'filetypes',
        props: { allowUnsuggested: true, label: 'Allowed file extensions (no dot)', placeholder: 'New extension…' },
        value: ['pdf', 'zip'],
      },
    ],
    tab: null,
    validation: {
      max: null, required: false, unit: 'filesize (MB)',
    },
    value: null,
    version: 2,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'checkboxes',
    default: null,
    description: 'A custom list of boxes to be checked',
    group: 'helpers',
    icon: 'checkbox-list',
    key: '',
    label: 'Checkboxes',
    options: [
      {
        component: 'MbSelect',
        key: 'type',
        label: 'Display type:',
        props: {
          options: [
            { label: 'Inline', value: 'inline' },
            { label: 'List', value: 'list' },
          ],
        },
        value: 'inline',
      },
      {
        component: 'MbEditableList',
        key: 'checkboxes',
        label: 'Checkboxes:',
        value: [],
      },
    ],
    tab: null,
    validation: {
      enforceMinMax: false, max: null, min: null, unit: 'selected',
    },
    value: null,
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'radio group',
    default: null,
    description: 'A list of values of which only one may be selected',
    group: 'helpers',
    icon: 'radio-group-list',
    key: '',
    label: 'Radio Group',
    options: [
      {
        component: 'MbSelect',
        key: 'type',
        label: 'Display type:',
        props: {
          options: [
            { label: 'Inline', value: 'inline' },
            { label: 'Wide', value: 'wide' },
            { label: 'Segmented', value: 'segmented' },
          ],
        },
        value: 'inline',
      },
      {
        component: 'MbEditableList',
        key: 'options',
        label: 'Options:',
        value: [],
      },
    ],
    tab: null,
    validation: {
      required: false,
    },
    value: null,
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'link',
    default: null,
    description: 'A field for linking to an external or internal document',
    group: 'helpers',
    icon: 'link',
    key: '',
    label: 'Link',
    localised: false,
    options: [
      {
        component: 'MbRadioGroup',
        key: 'type',
        label: 'Type:',
        props: { inline: true, options: [{ label: 'Internal', value: 'internal' }, { label: 'External', value: 'external' }, { label: 'Both', value: 'both' }] },
        value: 'both',
      },
      {
        component: 'MbToggle',
        key: 'byFilePath',
        slot: 'Use file path for internal links',
        value: false,
      },
      {
        component: 'MbInput',
        key: 'urlSuffix',
        label: 'URL suffix (when file path is used):',
        props: { modelModifiers: { trim: true, lazy: true }, placeholder: 'e.g. .html' },
        value: '/',
      },
      {
        component: 'MbInput',
        key: 'urlTemplate',
        label: 'Internal URL template:',
        props: { modelModifiers: { trim: true, lazy: true }, placeholder: 'e.g. /:date/:title\\.html' },
        value: '',
      },
    ],
    tab: null,
    validation: {
      required: false,
    },
    value: null,
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'reference',
    default: null,
    description: 'Reference a value from another content item',
    group: 'helpers',
    icon: 'document-link',
    key: '',
    label: 'Content Reference',
    localised: false,
    options: [
      {
        component: 'MbItemList',
        key: 'collections',
        label: 'Limit to these Collections:',
        props: { placeholder: 'Select a Collection…' },
        value: [],
      },
      {
        component: 'MbInput',
        key: 'field',
        label: 'Field to reference:',
        props: { modelModifiers: { trim: true, lazy: true }, placeholder: 'e.g. id or group.other-key' },
        value: '',
      },
      {
        component: 'MbToggle',
        key: 'removable',
        slot: 'Allow the reference to be removed once set',
        value: false,
      },
    ],
    tab: null,
    validation: {
      required: false,
    },
    value: null,
    version: 2,
    visibility: { hidden: false, showByValue: { field: null } },
  },
  {
    type: 'container',
    description: 'A container for grouping fields purely on a visual level',
    group: 'visual',
    icon: 'placeholder',
    key: '___mb_visual_container',
    label: 'Container',
    options: [
      {
        component: 'MbToggle',
        key: 'collapsible',
        slot: 'Allow the container to be collapsed',
        value: false,
      },
      {
        component: 'MbToggle',
        key: 'collapseByDefault',
        slot: 'Collapse the container by default',
        value: false,
      },
      {
        component: 'MbToggle',
        key: 'row',
        slot: 'Display contained fields in a horizontal row',
        value: false,
      },
      {
        component: 'MbToggle',
        key: 'bordered',
        slot: 'Show a faint border around the grouped fields',
        value: false,
      },
    ],
    tab: null,
    value: [],
    version: 1,
    visibility: { hidden: false, showByValue: { field: null } },
    visualOnly: true,
  },
];
