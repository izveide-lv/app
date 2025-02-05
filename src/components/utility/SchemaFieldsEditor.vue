<template>
  <TabContent class="schema-fields-editor" :dark="dark" ref="tabContent" :show-split="showSplit" @split-close="showSplit = false" @split-closed="handleSplitClosed">
    <slot name="beforeFields" />
    <transition mode="out-in">
      <div v-if="loading || !activated" class="" key="loading">
        <!-- This is here so we don’t see an empty state while the component is initialising -->
      </div>
      <div v-else-if="!showSplit && fields && fields.length === 0" class="empty-state" :class="{ dark }">
        <h2>There’s nothing here yet</h2>
        <p>This schema currently has no fields. You can start adding some with the button below{{ showGenerateButton ? ', or have Mattrbld automatically generate a set of fields for you based on a piece of content' : '' }}.</p>
        <footer>
          <MbButton v-if="showGenerateButton" :dark="dark" icon="document" @click="$emit('generate-click')">Generate from content</MbButton>
          <MbButton :dark="dark" icon="plus" type="positive" @click="handleAddField">Add field</MbButton>
        </footer>
      </div>
      <div v-else-if="currentOperation !== 'add-field' && fieldsForTab.length === 0" class="empty-state" :class="{ dark }">
        <h2>There’s nothing here yet</h2>
        <footer>
          <MbButton :dark="dark" icon="plus" type="positive" @click="handleAddField">Add field</MbButton>
        </footer>
      </div>
      <div v-else class="added-fields-list">
        <transition mode="out-in">
          <FieldArrangementList :dark="dark" :field-being-edited="fieldBeingEdited" :fields="fieldsForTab" :field-versions="fieldVersions" parent-key="___toplevel" :key="activeTab" @fieldclick="handleFieldClick" @fieldcontextmenu="openContextMenu" @fieldmove="handleFieldMove" />
        </transition>
        <transition>
          <MbButton v-show="currentOperation !== 'add-field'" :dark="dark" icon="plus" type="positive" @click="handleAddField">Add field</MbButton>
        </transition>
      </div>
    </transition>
    <slot name="afterFields" />

    <template #right="{ isModal }">
      <div v-if="currentOperation === 'add-field'" class="add-field" :class="{ dark }">
        <header>
          <h2 :class="{ h3: isMobile }">Add a field</h2>
          <MbInput v-model="fieldFilter" clearable :dark="dark" icon="search" placeholder="Search field…" type="search" />
        </header>
        <transition mode="out-in">
          <div v-if="fieldsLoading" class="loader-wrapper">
            <MbLoader />
            <p>Loading available fields…</p>
          </div>
          <div v-else class="fields-list">
            <div v-for="key in filteredFields.keys()" class="field-group" :key="key">
              <h3>{{key}}</h3>
              <FieldThumbnail v-for="(field, index) in filteredFields.get(key)" :dark="dark" :description="field.description" :icon="field.icon" :key="index" :name="field.label" @add-field="addFieldToSchema(field)" @field-over="handleFieldOver" />
            </div>
          </div>
        </transition>
      </div>
      <div v-else-if="currentOperation === 'edit-field'" class="edit-field" :class="{ dark, 'in-modal': isModal }">
        <header>
          <h2 :class="{ h3: isMobile }">{{fieldBeingEdited.label}}<span v-if="!fieldBeingEdited.label">Untitled Field</span></h2>
          <span>{{fieldBeingEdited.type}} field</span>
        </header>
        <transition>
          <section v-if="!fieldBeingEdited.version || fieldBeingEdited.version < fieldVersions.get(fieldBeingEdited.customField || fieldBeingEdited.type)">
            <MbHighlightBox color="warning" :dark="dark" label="Outdated Field Version">
              <p>There are new options and values for this field. You need to upgrade it to the newest version to use these in content items based on this Schema.</p>
              <MbButton :dark="dark" icon="upgrade" :icon-first="false" type="positive" @click="updateFieldVersion(fieldBeingEdited)">Upgrade</MbButton>
            </MbHighlightBox>
          </section>
        </transition>
        <section>
          <h3>General Settings</h3>
          <div class="input-row">
            <MbInput v-model.lazy.trim="fieldBeingEdited.label" :dark="dark" :error="fieldErrors.label" icon="tag" label="Label" @update:model-value="validateField('label')" />
            <MbInput v-if="!fieldBeingEdited.visualOnly" v-model.lazy.trim="fieldBeingEdited.key" :dark="dark" :error="fieldErrors.key" icon="key" label="Content key" @focus="validateField('key')" @update:model-value="validateField('key')" />
          </div>
          <div v-if="fieldBeingEditedToplevel && tabs && tabs.length > 0" class="select-wrapper">
            <span>Tab:</span>
            <MbSelect :dark="dark" :model-value="fieldBeingEdited.tab" :options="tabsForSelect" @update:model-value="moveFieldToTab(fieldBeingEdited, $event)" />
          </div>
          <div v-if="typeof fieldBeingEdited.displayField !== 'undefined'" class="select-wrapper">
            <span>Field value to display in compact mode:</span>
            <MbSelect v-model="fieldBeingEdited.displayField" :dark="dark" :options="childFieldKeys" placeholder="Select a field…" />
          </div>
          <MbToggle v-if="localisationEnabled && typeof fieldBeingEdited.localised !== 'undefined'" v-model="fieldBeingEdited.localised" :dark="dark">Enable localisation for this field</MbToggle>
          <div v-if="typeof fieldBeingEdited.default !== 'undefined'" class="field-wrapper">
            <component
              v-model="fieldBeingEdited.default"
              :children="fieldBeingEdited.value"
              compact
              :dark="dark"
              :display-field="fieldBeingEdited.displayField"
              :error="fieldErrors.default"
              :field-key="fieldBeingEdited.key"
              in-split
              :is="componentForType(fieldBeingEdited.type)"
              label="Default value"
              :languages="$store.state.currentProject.languages"
              :localised="fieldBeingEdited.localised"
              :options="{ ...fieldBeingEdited.options, allowEditing: true }"
              :type="fieldBeingEdited.type"
              :validation="fieldBeingEdited.validation"
              @update:error="handleDefaultValueError"
            />
            <MbButton class="clear-button" :dark="dark" :disabled="fieldBeingEdited.default === null" icon="clear" rounded tooltip="Clear default value" @click="clearDefaultValue" />
          </div>
        </section>
        <section v-if="!fieldBeingEdited.customField && availableFieldOptions.has(fieldBeingEdited.type)">
          <h3>Field Configuration</h3>
          <section v-for="option in availableFieldOptions.get(fieldBeingEdited.type)" class="config-option" :class="[option.component]" :key="option.key">
            <span v-if="option.label">{{option.label}}</span>
            <MbEditableList v-if="option.component === 'MbEditableList'" v-model="fieldBeingEdited.options[option.key]" :dark="dark" relative-to-root :root-path="`/projects/${$route.params.id}`" />
            <MbFilePicker v-else-if="option.component === 'MbFilePicker'" v-bind="option.props" v-model="fieldBeingEdited.options[option.key]" :dark="dark" relative-to-root :root="`/projects/${$route.params.id}`" />
            <MbItemList v-else-if="option.component === 'MbItemList' && option.key === 'collections'" v-bind="option.props" v-model="fieldBeingEdited.options[option.key]" :dark="dark" :options="availableCollections" />
            <component v-else v-bind="option.props" v-model="fieldBeingEdited.options[option.key]" :dark="dark" :is="option.component">{{option.slot}}</component>
          </section>
        </section>
        <section v-if="fieldBeingEdited.validation">
          <h3>Validation</h3>
          <MbToggle v-if="typeof fieldBeingEdited.validation.required !== 'undefined'" v-model="fieldBeingEdited.validation.required" :dark="dark">Make this field required</MbToggle>
          <div v-if="typeof fieldBeingEdited.validation.min !== 'undefined' || typeof fieldBeingEdited.validation.max !== 'undefined'" class="input-row">
            <MbDatePicker v-if="typeof fieldBeingEdited.validation.min !== 'undefined' && fieldBeingEdited.validation.unit === 'date'" v-model="fieldBeingEdited.validation.min" :dark="dark" format="iso" label="Minimum date (optional)" :max="fieldBeingEdited.validation.max" removable />
            <MbInput v-else-if="typeof fieldBeingEdited.validation.min !== 'undefined'" v-model="fieldBeingEdited.validation.min" :dark="dark" :label="`Minimum ${ fieldBeingEdited.validation.unit || ''} (optional)`" :model-modifiers="{ lazy: true, number: !fieldBeingEdited.validation.isString }" :type="fieldBeingEdited.validation.isString ? 'text' : 'number'" />
            <MbDatePicker v-if="typeof fieldBeingEdited.validation.max !== 'undefined' && fieldBeingEdited.validation.unit === 'date'" v-model="fieldBeingEdited.validation.max" :dark="dark" format="iso" label="Maximum date (optional)" :min="fieldBeingEdited.validation.min" removable />
            <MbInput v-else-if="typeof fieldBeingEdited.validation.max !== 'undefined'" v-model="fieldBeingEdited.validation.max" :dark="dark" :label="`Maximum ${ fieldBeingEdited.validation.unit || ''} (optional)`" :model-modifiers="{ lazy: true, number: !fieldBeingEdited.validation.isString }" :type="fieldBeingEdited.validation.isString ? 'text' : 'number'" />
          </div>
          <MbToggle v-if="typeof fieldBeingEdited.validation.enforceMinMax !== 'undefined' && (fieldBeingEdited.validation.min || fieldBeingEdited.validation.max)" v-model="fieldBeingEdited.validation.enforceMinMax" :dark="dark">Enforce minimum / maximum {{fieldBeingEdited.validation.unit}}</MbToggle>
          <div v-if="fieldBeingEdited.validation && typeof fieldBeingEdited.validation.regex !== 'undefined'" class="input-row">
            <MbInput v-model.lazy="fieldBeingEdited.validation.regex" :dark="dark" :error="fieldErrors.regex" label="Regular expression (optional)" @update:model-value="validateField('regex')" />
            <MbInput v-show="fieldBeingEdited.validation.regex" v-model.lazy="fieldBeingEdited.validation.regexError" :dark="dark" label="Error message (optional)" />
          </div>
        </section>
        <section v-if="fieldBeingEdited.visibility">
          <h3>Visibility</h3>
          <MbToggle v-if="typeof fieldBeingEdited.visibility.hidden !== 'undefined'" v-model="fieldBeingEdited.visibility.hidden" :dark="dark">Hide this field</MbToggle>
          <MbTagInput v-if="!fieldBeingEdited.visibility.hidden" v-model="fieldBeingEdited.visibility.limitToRoles" :autocomplete-model="projectRoles" autocomplete-property="label" :dark="dark" label="Limit visibility to (optional)" placeholder="Role(s)" value-property="value" />
          <div v-if="flattenedFieldKeys.length > 1 && !fieldBeingEdited.visibility.hidden && fieldBeingEdited.visibility.showByValue" class="conditional-wrapper">
            <span>Show if</span>
            <MbSelect v-model="fieldBeingEdited.visibility.showByValue.field" :dark="dark" :options="flattenedFieldKeys" placeholder="Field…" />
            <MbSelect v-model="fieldBeingEdited.visibility.showByValue.value" allow-null class="operator" :dark="dark" :options="showByValueOptions" placeholder="Condition…" @update:model-value="validateField('comparatorRegex')" />
            <MbInput v-if="fieldBeingEdited.visibility.showByValue.value === 'matches'" v-model.lazy="fieldBeingEdited.visibility.showByValue.comparator" :error="fieldErrors.comparatorRegex" :dark="dark" placeholder="Regular expression" @update:model-value="validateField('comparatorRegex')" />
            <MbInput v-else-if="['equals', 'greater', 'smaller'].includes(fieldBeingEdited.visibility.showByValue.value)" v-model.lazy.number="fieldBeingEdited.visibility.showByValue.comparator" :dark="dark" placeholder="Number" type="number" />
          </div>
        </section>
        <section>
          <MbHighlightBox color="warning" :dark="dark" label="Change type">
            <p>Changing the type of a field only retains options compatible with both fields, so you might have to reconfigure certain options after changing the type.</p>
            <MbButton :dark="dark" icon="replace-round" @click="fieldToTypeChange = fieldBeingEdited; showTypeChangeModal = true">Change type</MbButton>
          </MbHighlightBox>
          <MbHighlightBox color="negative" :dark="dark" label="Field removal">
            <p>Deleting a field from a Schema <strong>does not</strong> delete that field in content items. It only makes it so that field can no longer be edited through Mattrbld.</p>
            <MbButton :dark="dark" icon="trash" type="negative" @click="deleteField(fieldBeingEdited)">Delete field</MbButton>
          </MbHighlightBox>
        </section>
      </div>
    </template>

    <MbContextMenu :dark="dark" :options="fieldContextMenu.options" :show="fieldContextMenu.show" :target="fieldContextMenu.target" :x="fieldContextMenu.x" :y="fieldContextMenu.y" @close="fieldContextMenu.show = false; resetFieldContextMenu()" />
    <MbModal class="custom-field-modal" :dark="dark" slim title="Save as Custom Field" :visible="showCustomFieldModal" @after-close="resetCustomField" @close="showCustomFieldModal = false">
      <MbInput v-model.lazy="customField.name" :dark="dark" :error="errors.customFieldName" icon="document" label="Name" @blur="validateCustomField" />
      <MbInput v-model.lazy="customField.group" :dark="dark" icon="folder" label="Category (optional)" />
      <MbEditor v-model="customField.description" :allow-new-lines="false" :dark="dark" label="Description (optional)" />
      <div class="icon-picker-wrapper">
        <span>Custom Field icon:</span>
        <MbIconPicker v-model="customField.icon" :dark="dark" />
      </div>
      <div class="file-picker-wrapper">
        <span>Folder (optional):</span>
        <MbFilePicker v-if="!fieldsLoading" v-model="customField.path" :dark="dark" placeholder="/.mattrbld/custom-fields/" pretty-filenames relative-to-root :root="customFieldsPath" />
      </div>
      <template #actions>
        <MbButton :dark="dark" @click="showCustomFieldModal = false">Cancel</MbButton>
        <MbButton :dark="dark" :disabled="Boolean(errors.customFieldName)" type="primary" @click="saveCustomField">Save</MbButton>
      </template>
    </MbModal>
    <MbModal class="field-type-modal" :dark="dark" title="Change field type…" :visible="showTypeChangeModal" @after-close="fieldToTypeChange = null" @close="showTypeChangeModal = false">
      <MbInput v-model="fieldFilter" clearable :dark="dark" icon="search" placeholder="Search field…" type="search" />
      <div class="fields-list">
        <div v-for="key in filteredFields.keys()" class="field-group" :key="key">
          <h3>{{key}}</h3>
          <MbButton v-for="field in filteredFields.get(key)" :dark="dark" :icon="field.icon" :key="field.customField || field.type" :type="fieldToTypeChange && ((field.customField && fieldToTypeChange.customField && field.customField === fieldToTypeChange.customField) || (!field.customField && !fieldToTypeChange.customField && field.type === fieldToTypeChange.type)) ? 'primary' : null" @click="changeFieldType(field.customField || field.type)">{{field.label}}</MbButton>
        </div>
      </div>
      <template #actions>
        <MbButton :dark="dark" @click="showTypeChangeModal = false">Cancel</MbButton>
      </template>
    </MbModal>
  </TabContent>
</template>

<script>
import { cloneDeep } from 'lodash-es';
import slugify from '@sindresorhus/slugify';

import fs, { exists, readdirDeep, joinPath } from '../../fs';
import fieldTypeToComponent from '../../assets/js/fieldTypeToComponent';
import prettifyEntityName from '../../assets/js/prettifyEntityName';

import availableRoles from '../../data/availableRoles';
import defaultFields from '../../data/defaultFields';

import FieldArrangementList from './FieldArrangementList.vue';
import FieldThumbnail from './FieldThumbnail.vue';
import TabContent from './TabContent.vue';

const modules = import.meta.glob('../fields/*.{vue,js}', { eager: true });

const fieldComponents = Object.entries(modules).reduce((acc, [filePath, module]) => {
  const componentName = filePath.split('/').pop().replace(/\.\w+$/, '');
  acc[componentName] = module.default || module;
  return acc;
}, {});

export default {
  components: {
    FieldArrangementList,
    FieldThumbnail,
    TabContent,
    ...fieldComponents,
  },
  computed: {
    childFieldKeys() {
      if (!this.fields || this.fields.length === 0 || !this.fieldBeingEdited || !Array.isArray(this.fieldBeingEdited.value)) return [];
      return this.extractFieldKeys(this.fieldBeingEdited.value).concat([{ label: 'None', value: null }]);
    },
    customFieldsPath() {
      return joinPath('/projects', this.projectId, '.mattrbld', 'custom-fields');
    },
    fieldsForTab() {
      if (!this.fields) return [];
      if (this.activeTab === 0) return this.fields.filter((field) => field.tab === this.tabs[0] || !field.tab); // first tab shows all fields without tab, too
      return this.fields.filter((field) => field.tab === this.tabs[this.activeTab] || field.key === '___addIndicator');
    },
    filteredFields() {
      if (!this.availableFields) return new Map();
      if (!this.fieldFilter && !this.noSubfields) return this.availableFields;
      return Array.from(this.availableFields).reduce((newMap, [group, fields]) => {
        const lowercaseFieldFilter = this.fieldFilter.toLowerCase();
        let filteredFields;
        if (group.includes(lowercaseFieldFilter)) filteredFields = fields.filter((field) => !this.noSubfields || !field.value || field.visualOnly); // fields allowing for subfields have an empty array as a value
        else filteredFields = fields.filter((field) => (!this.noSubfields || field.value === null || field.visualOnly) && (field.label.toLowerCase().includes(lowercaseFieldFilter) || field.type.includes(lowercaseFieldFilter)));

        if (filteredFields.length > 0) newMap.set(group, filteredFields);
        return newMap;
      }, new Map());
    },
    flattenedFieldKeys() {
      if (!this.fields || this.fields.length === 0) return [];
      return this.extractFieldKeys(this.fields, null, true).concat([{ label: 'Unset', value: null }]);
    },
    isMobile() {
      return this.$store.state.application.mobile;
    },
    isTablet() {
      return this.$store.state.application.tablet;
    },
    localisationEnabled() {
      return this.$store.state.currentProject.languages && this.$store.state.currentProject.languages.length > 0;
    },
    projectRoles() {
      return [
        ...availableRoles,
        ...this.$store.state.currentProject.customRoles,
      ];
    },
    tabsForSelect() {
      return this.tabs.map((tab) => ({ value: tab }));
    },
  },
  async created() {
    this.externalChange = true;
    this.fields = cloneDeep(this.modelValue) || [];

    let customFieldsData = [];
    const availableFieldOptions = new Map();
    const fieldVersions = new Map();
    const fieldsByType = new Map();

    try {
      const customFieldFiles = (await readdirDeep(this.customFieldsPath)).filter((path) => path.endsWith('.json')); // returns full paths to the files, so we don’t need to join them with customFieldsPath
      if (this.$route.name === 'Edit Custom Field') {
        const idIndex = customFieldFiles.indexOf(this.$route.params.path);
        if (idIndex > -1) customFieldFiles.splice(idIndex, 1);
      }
      customFieldsData = (await Promise.all(customFieldFiles.map((file) => fs.readFile(file, 'utf8')))).map((field, index) => ({ ...JSON.parse(field), customField: customFieldFiles[index].replace(`${this.customFieldsPath}/`, '') })); // setting the customField to the field path in the custom fields directory so they are identifyable
    } catch (err) {
      if (err.code !== 'ENOENT') this.$store.commit('addToast', { message: `Something went wrong while loading the custom fields: ${err.message}. There might be an invalid file.`, type: 'error' });
      else await fs.mkdir(this.customFieldsPath); // directory didn’t exist yet, so there are no custom fields, but we’re creating it so we can save fields as custom fields
    }

    const unsortedMap = [...defaultFields, ...customFieldsData].reduce((map, field) => {
      const { customField, options, type } = field;
      let { group } = field;
      if (!group) group = 'miscellaneous';

      // doing this here so we don’t have to loop over it multiple times
      if (!customField && type && options) availableFieldOptions.set(type, options);
      fieldVersions.set(customField || type, field.version); // customFields have a customField property, default fields don’t
      fieldsByType.set(customField || type, field);

      if (map.has(group)) map.get(group).push(field);
      else map.set(group, [field]);

      return map;
    }, new Map());

    this.availableFields = new Map([...unsortedMap].sort((a, b) => a[0].localeCompare(b[0])));
    this.availableFieldOptions = availableFieldOptions;
    this.fieldVersions = fieldVersions;
    this.fieldsByType = fieldsByType;

    this.fetchAvailableCollections();
    this.loading = false;
    this.fieldsLoading = false;
  },
  data() {
    return {
      availableCollections: null,
      availableFields: null,
      availableFieldOptions: new Map(),
      currentAddIndicatorId: null,
      currentAddIndicatorParent: null,
      currentOperation: null,
      customField: {
        description: '',
        group: '',
        icon: '',
        name: '',
        originalField: null,
        path: '',
      },
      errors: {
        customFieldName: '',
        fieldBeingEditedLabel: '',
        fieldBeingEditedKey: '',
      },
      externalChange: false,
      fields: null,
      fieldAddIndex: null,
      fieldAddParent: null,
      fieldBeingEdited: null,
      fieldBeingEditedSiblings: null,
      fieldBeingEditedToplevel: true,
      fieldContextMenu: {
        detail: null,
        field: null,
        options: [
          {
            action: this.handleAddFieldAtIndex,
            label: 'Add new field below',
            icon: 'plus',
            type: 'positive',
          },
          {
            action: this.handleContextMenuEdit,
            label: 'Edit',
            icon: 'pencil',
          },
          {
            action: this.handleContextMenuDuplicate,
            label: 'Duplicate',
            icon: 'duplicate',
          },
          {
            action: this.handleContextMenuChangeType,
            label: 'Change type',
            icon: 'replace-round',
          },
          {
            action: this.handleContextMenuCustomFieldSave,
            label: 'Save as Custom Field',
            icon: 'open-new-window',
          },
          {
            action: this.handleContextMenuDelete,
            label: 'Delete',
            icon: 'trash',
            type: 'negative',
          },
        ],
        show: false,
        target: null,
        x: 0,
        y: 0,
      },
      fieldErrors: null,
      fieldFilter: '',
      fieldToTransfer: null,
      fieldToTypeChange: null,
      fieldsByType: null,
      fieldsLoading: true,
      fieldVersions: null,
      internalChange: false,
      loading: true,
      showByValueOptions: [
        { label: 'is true', value: true },
        { label: 'is false', value: false },
        { label: 'is null', value: null },
        { label: 'matches', value: 'matches' },
        { label: 'equals', value: 'equals' },
        { label: 'is smaller than', value: 'smaller' },
        { label: 'is greater than', value: 'greater' },
      ],
      showCustomFieldModal: false,
      showSplit: false,
      showTypeChangeModal: false,
    };
  },
  emits: ['generate-click', 'update:activeTab', 'update:modelValue'],
  methods: {
    addFieldToSchema(field) {
      const cleanField = {};

      Object.entries(field).forEach(([key, value]) => {
        if (key === 'options' && value.length > 0) {
          cleanField.options = {};
          value.forEach((option) => {
            cleanField.options[option.key] = cloneDeep(option.value);
          });
        } else if (key === 'value' && value) {
          if (field.customField) cleanField.value = cloneDeep(value);
          else cleanField.value = [];
        } else cleanField[key] = cloneDeep(value);
      });

      this.moveFieldToTab(cleanField, this.tabs[this.activeTab], true); // moveFieldToTab mutates the passed field and all subfields
      delete cleanField.description; // not needed, so let’s save space
      delete cleanField.group; // not needed, so let’s save space

      if (this.fieldAddIndex !== null && this.fieldAddParent) {
        const parentFieldFields = this.fieldAddParent === '___toplevel' ? this.fields : this.getField(this.fieldAddParent).value;

        this.removeCurrentAddIndicator();

        if (parentFieldFields.length === 0) {
          cleanField.key = (field.key && field.key.replace(/ /g, '-')) || (field.type && field.type.replace(/ /g, '-')) || 'unknown';
          parentFieldFields.push(cleanField);
        } else {
          cleanField.key = this.generateUniqueFieldKey(parentFieldFields, (field.key && field.key.replace(/ /g, '-')) || field.type.replace(/ /g, '-'));
          parentFieldFields.splice(this.fieldAddIndex, 0, cleanField);
        }
      } else {
        cleanField.key = this.generateUniqueFieldKey(this.fields, (field.key && field.key.replace(/ /g, '-')) || cleanField.type.replace(/ /g, '-'));
        this.fields.push(cleanField);
      }
      this.fieldAddIndex = null;
      this.fieldAddParent = null;

      if (this.isMobile && this.showSplit) this.showSplit = false;
    },
    changeFieldType(newType) {
      if ((this.fieldToTypeChange.customField && this.fieldToTypeChange.customField === newType) || this.fieldToTypeChange.type === newType) return;

      const path = this.getFieldPath(this.fieldToTypeChange, this.fields);
      const backup = cloneDeep(this.fieldToTypeChange);
      const newData = this.fieldsByType.get(newType);

      this.fieldToTypeChange.type = newData.type;
      this.fieldToTypeChange.icon = newData.icon;
      this.fieldToTypeChange.version = newData.version;

      if (this.fieldToTypeChange.value && !newData.value) this.fieldToTypeChange.value = null;
      else if (!this.fieldToTypeChange.value && newData.value) this.fieldToTypeChange.value = newData.value;

      if (typeof this.fieldToTypeChange.default === 'object' || typeof this.fieldToTypeChange.default !== typeof newData.default) this.fieldToTypeChange.default = newData.default;

      if (newData.customField) {
        this.fieldToTypeChange.customField = newData.customField;
        this.fieldToTypeChange.options = newData.options;
      } else {
        delete this.fieldToTypeChange.customField;
        if (newData.options && newData.options.length > 0) {
          const newOptions = newData.options.reduce((acc, { key, value }) => {
            if (this.fieldToTypeChange.options && typeof this.fieldToTypeChange.options[key] === typeof value) acc[key] = this.fieldToTypeChange.options[key];
            else acc[key] = cloneDeep(value);
            return acc;
          }, {});
          this.fieldToTypeChange.options = newOptions;
        }
      }

      if (typeof newData.displayField === 'undefined') delete this.fieldToTypeChange.displayField;
      else if (typeof this.fieldToTypeChange.displayField === 'undefined' && typeof newData.displayField !== 'undefined') this.fieldToTypeChange.displayField = newData.displayField;

      if (typeof newData.localised === 'undefined') delete this.fieldToTypeChange.localised;
      else if (typeof this.fieldToTypeChange.localised === 'undefined' && typeof newData.localised !== 'undefined') this.fieldToTypeChange.localised = newData.localised;

      if (typeof newData.visualOnly === 'undefined') delete this.fieldToTypeChange.visualOnly;
      else if (typeof this.fieldToTypeChange.visualOnly === 'undefined' && typeof newData.visualOnly !== 'undefined') this.fieldToTypeChange.visualOnly = newData.visualOnly;

      if (newData.visualOnly && newData.key) {
        const parentField = this.getField(path.substring(0, Math.max(0, path.lastIndexOf('.')) || Infinity));
        const parentFieldFields = path === parentField.key ? this.fields : parentField.value;
        this.fieldToTypeChange.key = this.generateUniqueFieldKey(parentFieldFields, newData.key);
      }

      if (typeof newData.validation === 'undefined') delete this.fieldToTypeChange.validation;
      else {
        this.fieldToTypeChange.validation = Object.entries(newData.validation).reduce((acc, [key, value]) => {
          if (key !== 'unit' && this.fieldToTypeChange.validation && typeof this.fieldToTypeChange.validation[key] !== 'undefined') acc[key] = this.fieldToTypeChange.validation[key];
          else acc[key] = value;
          return acc;
        }, {});
      }

      if (typeof newData.visibility === 'undefined') delete this.fieldToTypeChange.visibility;
      else {
        this.fieldToTypeChange.visibility = Object.entries(newData.visibility).reduce((acc, [key, value]) => {
          if (typeof this.fieldToTypeChange.visibility[key] !== 'undefined') acc[key] = this.fieldToTypeChange.visibility[key];
          else acc[key] = value;
          return acc;
        }, {});
      }

      this.showTypeChangeModal = false;
      this.$store.commit('addToast', {
        action: () => {
          const field = this.getField(path); // needed because this.fieldToTypeChange is null after the modal closed
          Object.keys(field).forEach((key) => {
            if (typeof backup[key] === 'undefined') delete field[key];
          });
          Object.entries(backup).forEach(([key, value]) => {
            field[key] = value;
          });
        },
        actionLabel: 'Undo',
        message: `“${backup.label}” was changed to a “${newData.label}” field`,
        type: 'warning',
      });
    },
    clearDefaultValue() {
      this.fieldBeingEdited.default = null;
      if (this.fieldErrors.default) {
        this.fieldErrors.default = '';
        this.setFieldBeingEditedError('default', '');
      }
    },
    componentForType(type) {
      const componentName = fieldTypeToComponent(type);

      if (componentName && this.$options.components && this.$options.components[componentName]) return componentName;
      return 'UnknownField';
    },
    deleteField(field) {
      if (!field) return;
      const fieldPath = this.getFieldPath(field, this.fields);

      if (!fieldPath) return; // the field is not valid / doesn’t exist

      const parentField = this.getField(fieldPath.substring(0, Math.max(0, fieldPath.lastIndexOf('.')) || Infinity));

      const parentFieldFields = fieldPath === parentField.key ? this.fields : parentField.value;
      const index = parentFieldFields.indexOf(field);
      const [backup] = parentFieldFields.splice(index, 1);
      const { wasChanged } = this;
      if (field === this.fieldBeingEdited) this.showSplit = false;

      // delete it from the displayField of the direct parent (TODO: also delete it if it’s on any higher parent)
      let parentFieldChanged = false;
      if (parentField.displayField === field.key) {
        parentField.displayField = null;
        parentFieldChanged = true;
      }

      this.$store.commit('addToast', {
        action: () => {
          parentFieldFields.splice(index, 0, backup);
          if (parentFieldChanged) parentField.displayField = field.key;
          if (!wasChanged) this.wasChanged = false;
        },
        actionLabel: 'Undo',
        closeOnRouteChange: true,
        message: `The field “${backup.label}” was deleted`,
        timeout: 5000 - 200,
        type: 'warning',
      });
    },
    duplicateField(field) {
      if (!field) return;
      const fieldPath = this.getFieldPath(field, this.fields);

      if (!fieldPath) return; // the field is not valid / doesn’t exist

      const parentField = this.getField(fieldPath.substring(0, Math.max(0, fieldPath.lastIndexOf('.')) || Infinity));

      const parentFieldFields = fieldPath === parentField.key ? this.fields : parentField.value;
      const index = parentFieldFields.indexOf(field);
      const duplicate = cloneDeep(parentFieldFields[index]);
      duplicate.key = this.generateUniqueFieldKey(parentFieldFields, duplicate.key);
      parentFieldFields.splice(index + 1, 0, duplicate);
    },
    extractFieldKeys(fields, parent, hideRepeating) {
      return fields.reduce((acc, field) => {
        if (hideRepeating && this.isInRepeatingField(field)) return acc;
        if (Array.isArray(field.value)) acc.push(...this.extractFieldKeys(field.value, parent ? `${parent}.${field.key}` : field.key, hideRepeating));
        else if (field === this.fieldBeingEdited || field.visualOnly) return acc;
        else acc.push({ label: field.label, value: parent ? `${parent}.${field.key}` : field.key });
        return acc;
      }, []);
    },
    async fetchAvailableCollections() {
      if (this.availableCollections !== null) return;
      try {
        const collections = (await fs.readdir(joinPath('/projects', this.$route.params.id, '.mattrbld/collections'))).filter((path) => path.endsWith('.json'));
        this.availableCollections = collections.map((collection) => ({ label: prettifyEntityName(collection), value: joinPath('/.mattrbld/collections/', collection) }));
      } catch (err) {
        // it’s fine if the collections dir doesn’t exist
        if (err.code !== 'ENOENT') this.$store.commit('addToast', { message: `Something went wrong while fetching available Collections: ${err.message}`, type: 'error' });
        this.availableCollections = [];
      }
    },
    fieldHasErrorsDeep(field) {
      if (field.errors) return true;
      if (Array.isArray(field.value)) return field.value.map((subfield) => this.fieldHasErrorsDeep(subfield)).some((hasError) => hasError);
      return false;
    },
    generateUniqueFieldKey(otherFields, potentialKey = 'unknown') {
      if (!otherFields.find((existingField) => existingField.key === potentialKey)) return potentialKey;
      let counter = 1;
      // NOTE: this loop actually works as intended, despite the warning by eslint – and I wouldn’t really know how to write it otherwise
      while (otherFields.find((existingField) => existingField.key === `${potentialKey}-${counter}`)) { // eslint-disable-line no-loop-func
        counter += 1;
      }
      return `${potentialKey}-${counter}`;
    },
    getField(path) {
      const segments = Array.isArray(path) ? path : path.split('.');
      let next = this.fields.find((field) => field.key === segments[0]);
      if (segments.length === 1) return next;
      for (let index = 1; index < segments.length; index += 1) {
        const segment = segments[index];
        if (next) next = next.value.find((field) => field.key === segment);
        else break;
      }
      return next;
    },
    getFieldPath(field, fields) {
      const path = [];
      let found = false;

      function search(subfields) { // we need an inner function here because otherwise the variables in the outer scope would constantly be overwritten
        for (let index = 0; index < subfields.length; index += 1) {
          const currentField = subfields[index];
          path.push(currentField.key);
          if (currentField === field) {
            found = true;
            break;
          }
          if (Array.isArray(currentField.value)) {
            search(currentField.value);
            if (found) break;
          }
          path.pop();
        }
      }

      search(fields);
      return path.join('.');
    },
    handleAddField() {
      this.currentOperation = 'add-field';
      this.showSplit = true;
    },
    handleAddFieldAtIndex() {
      this.fieldAddIndex = this.fieldContextMenu.detail.index + 1;
      this.fieldAddParent = this.fieldContextMenu.detail.parent;
      this.handleAddField();
      this.fieldContextMenu.show = false;
    },
    handleContextMenuChangeType() {
      this.fieldToTypeChange = this.fieldContextMenu.field;
      this.showTypeChangeModal = true;
      this.fieldContextMenu.show = false;
    },
    handleContextMenuDelete() {
      this.deleteField(this.fieldContextMenu.field);
      this.fieldContextMenu.show = false;
    },
    handleContextMenuDuplicate() {
      this.duplicateField(this.fieldContextMenu.field);
      this.fieldContextMenu.show = false;
    },
    handleContextMenuEdit() {
      this.handleFieldClick({ detail: this.fieldContextMenu.detail });
      this.fieldContextMenu.show = false;
    },
    handleContextMenuCustomFieldSave() {
      const { parent, index } = this.fieldContextMenu.detail;
      const parentFieldFields = parent === '___toplevel' ? this.fieldsForTab : this.getField(parent).value;
      const field = parentFieldFields[index];

      if (field.customField) this.$store.commit('addToast', { message: 'This field is already a custom field', type: 'warning' });
      else if (this.fieldHasErrorsDeep(field)) this.$store.commit('addToast', { message: 'This field or at least one of its subfields have errors. Fix them before saving it as a custom field', type: 'warning' });
      else {
        this.customField.name = field.label;
        this.customField.icon = field.icon;
        this.customField.originalField = field;
        this.showCustomFieldModal = true;
      }
      this.fieldContextMenu.show = false;
    },
    handleDefaultValueError(error) {
      if (this.fieldBeingEdited.default === null) return; // if there’s no default, no need to handle errors
      this.fieldErrors.default = error;
      this.setFieldBeingEditedError('default', error);
    },
    handleFieldOver({ parent, index, dropzone, isBottomHalf }) { // eslint-disable-line object-curly-newline
      let realIndex = parent === '___toplevel' ? this.fields.indexOf(this.fieldsForTab[index]) : index;
      if (realIndex === -1) realIndex = this.fields.length; // happens when hovering a dropzone when toplevel is empty
      else if (isBottomHalf) realIndex += 1;
      if (parent && index !== null && !dropzone) {
        const parentFieldFields = parent === '___toplevel' ? this.fields : this.getField(parent).value;

        if (parentFieldFields.length > 0) {
          const id = Math.random().toString(36).slice(2, 9);
          parentFieldFields.splice(realIndex, 0, { id, key: '___addIndicator' });
          this.removeCurrentAddIndicator();
          this.currentAddIndicatorParent = parent;
          this.currentAddIndicatorId = id;
        }
      } else this.removeCurrentAddIndicator();

      this.fieldAddParent = parent;
      this.fieldAddIndex = realIndex;
    },
    handleFieldClick({ detail }) {
      const { parent, index } = detail;
      const parentFieldFields = parent === '___toplevel' ? this.fieldsForTab : this.getField(parent).value;
      const field = parentFieldFields[index];
      if (field === this.fieldBeingEdited) {
        this.showSplit = false;
        return;
      }
      this.fieldBeingEdited = field;
      this.fieldBeingEditedSiblings = parentFieldFields;
      this.fieldBeingEditedToplevel = parent === '___toplevel';
      this.currentOperation = 'edit-field';
      if (this.fieldBeingEdited.errors) this.fieldBeingEdited.errors.forEach((value, key) => { this.fieldErrors[key] = value; });
      else {
        this.fieldErrors = {
          key: '',
          label: '',
          regex: '',
          comparatorRegex: '',
          default: '',
        };
      }
      if (!this.showSplit) this.showSplit = true;
    },
    handleFieldMove({ detail }) {
      const { parent, index, target } = detail;

      if (target.parent === '___mb_tab') {
        window.removeEventListener('pointerup', this.transferField, { once: true, capture: true });
        this.removeCurrentAddIndicator();
        const realIndex = parent === '___toplevel' ? this.fields.indexOf(this.fieldsForTab[index]) : index;
        this.fieldToTransfer = { parent, index: realIndex };
        this.fieldAddIndex = target.index;
        window.addEventListener('pointerup', this.transferFieldToTab, { once: true, capture: true });
      } else {
        window.removeEventListener('pointerup', this.transferFieldToTab, { once: true, capture: true });
        const parentFieldFields = parent === '___toplevel' ? this.fields : this.getField(parent).value;
        const targetFieldFields = target.parent === '___toplevel' ? this.fields : this.getField(target.parent).value;
        const realIndex = parent === '___toplevel' ? this.fields.indexOf(this.fieldsForTab[index]) : index;
        const realTargetIndex = target.parent === '___toplevel' ? this.fields.indexOf(this.fieldsForTab[target.index]) : target.index;
        let lastAddIndicatorIndex;
        if (this.currentAddIndicatorParent === target.parent) {
          lastAddIndicatorIndex = targetFieldFields.findIndex((field) => field.key === '___addIndicator' && field.id === this.currentAddIndicatorId);
        }
        this.removeCurrentAddIndicator();
        if (parent === target.parent) {
          if ((realIndex < realTargetIndex && target.isBottomHalf) || (realIndex > realTargetIndex && !target.isBottomHalf)) {
            const [field] = parentFieldFields.splice(realIndex, 1);
            targetFieldFields.splice(realTargetIndex, 0, field);
          } else if (realIndex < realTargetIndex && !target.isBottomHalf) {
            const [field] = parentFieldFields.splice(realIndex, 1);
            targetFieldFields.splice(Math.max(0, realTargetIndex - 1), 0, field);
          } else if (realIndex > realTargetIndex && target.isBottomHalf) {
            const [field] = parentFieldFields.splice(realIndex, 1);
            targetFieldFields.splice(Math.min(realTargetIndex + 1, targetFieldFields.length - 1), 0, field);
          }
          window.removeEventListener('pointerup', this.transferField, { once: true, capture: true });
          this.fieldAddIndex = null;
          this.fieldAddParent = null;
          this.fieldToTransfer = null;
        } else {
          let targetIndex;
          if (target.dropzone) targetIndex = realTargetIndex;
          else if (typeof lastAddIndicatorIndex !== 'undefined') {
            if ((lastAddIndicatorIndex < realTargetIndex && target.isBottomHalf) || (lastAddIndicatorIndex > realTargetIndex && !target.isBottomHalf)) {
              targetIndex = realTargetIndex;
            } else if (lastAddIndicatorIndex < realTargetIndex && !target.isBottomHalf) targetIndex = Math.max(0, realTargetIndex - 1);
            else if (lastAddIndicatorIndex > realTargetIndex && target.isBottomHalf) targetIndex = Math.min(realTargetIndex + 1, targetFieldFields.length - 1);
          } else targetIndex = realTargetIndex;

          this.fieldToTransfer = { parent, index: realIndex };
          this.fieldAddParent = target.parent;
          this.fieldAddIndex = targetIndex;

          if (!target.dropzone) {
            const id = Math.random().toString(36).slice(2, 9);
            targetFieldFields.splice(targetIndex, 0, { id, key: '___addIndicator' });
            this.currentAddIndicatorParent = target.parent;
            this.currentAddIndicatorId = id;
          }

          window.addEventListener('pointerup', this.transferField, { once: true, capture: true });
        }
      }
    },
    handleSplitClosed() {
      if (this.fieldBeingEdited) {
        this.fieldBeingEdited = null;
        this.fieldBeingEditedSiblings = null;
      }
      this.currentOperation = null;
    },
    isInRepeatingField(field) {
      const path = this.getFieldPath(field, this.fields).split('.');
      if (path.length === 1) return false; // top level fields cannot be in repeating fields
      for (let i = 1; i < path.length + 1; i += 1) {
        const fieldToCheck = this.getField(path.slice(0, i));
        if (['columns', 'rows'].includes(fieldToCheck.type)) return true;
      }
      return false;
    },
    moveFieldToTab(field, tab, recursiveCall) {
      field.tab = tab; // eslint-disable-line no-param-reassign
      if (Array.isArray(field.value)) field.value.forEach((childField) => this.moveFieldToTab(childField, tab, true));
      if (!recursiveCall) {
        this.$emit('update:activeTab', this.tabs.indexOf(tab));
      }
    },
    openContextMenu({ detail }) {
      const { parent, index, e } = detail;
      const parentFieldFields = parent === '___toplevel' ? this.fieldsForTab : this.getField(parent).value;
      this.fieldContextMenu.field = parentFieldFields[index];
      this.fieldContextMenu.detail = { parent, index };
      this.fieldContextMenu.target = e.currentTarget;
      this.fieldContextMenu.x = e.clientX;
      this.fieldContextMenu.y = e.clientY;
      this.fieldContextMenu.show = true;
    },
    removeCurrentAddIndicator() {
      if (!this.currentAddIndicatorParent) return;
      const parentFieldFields = this.currentAddIndicatorParent === '___toplevel' ? this.fields : this.getField(this.currentAddIndicatorParent).value;
      parentFieldFields.splice(parentFieldFields.findIndex((field) => field.key === '___addIndicator' && field.id === this.currentAddIndicatorId), 1);
      this.currentAddIndicatorParent = null;
      this.currentAddIndicatorId = null;
    },
    resetCustomField() {
      this.customField.description = '';
      this.customField.icon = '';
      this.customField.name = '';
      this.customField.originalField = null;
      this.errors.customFieldName = '';
    },
    resetFieldContextMenu() {
      this.fieldContextMenu.detail = null;
      this.fieldContextMenu.field = null;
      this.fieldContextMenu.target = null;
      this.fieldContextMenu.x = 0;
      this.fieldContextMenu.y = 0;
    },
    async saveCustomField() {
      this.validateCustomField();
      if (this.errors.customFieldName) return;

      const slugifiedName = slugify(this.customField.name, this.$store.state.currentProject.slugifyOptions || { lowercase: false, decamelize: false, preserveLeadingUnderscore: true });
      const id = this.customField.path ? joinPath(this.customField.path.replace('/', ''), `${slugifiedName}.json`) : `${slugifiedName}.json`; // we don’t want a leading slash if customField.path is falsey
      const path = joinPath(this.customFieldsPath, id);
      const alreadyExists = await exists(path);

      if (alreadyExists) {
        this.errors.customFieldName = 'A Custom Field with this name already exists';
        return;
      }

      try {
        const newField = cloneDeep(this.customField.originalField);
        this.moveFieldToTab(newField, null, true); // moveFieldToTab mutates the passed field and all subfields
        newField.version = 1;
        newField.label = this.customField.name;
        newField.description = this.customField.description;
        newField.group = this.customField.group;
        newField.icon = this.customField.icon;

        await fs.writeFile(path, JSON.stringify(newField, null, 2), 'utf8');

        // convert the existing field into the newly created custom field
        this.customField.originalField.version = newField.version;
        this.customField.originalField.icon = newField.icon;
        this.customField.originalField.label = newField.label;
        this.customField.originalField.customField = id;

        // add the newly created custom field to the availableFields
        const unsortedMap = new Map([...this.availableFields]);
        const group = newField.group || 'miscellaneous';
        if (unsortedMap.has(group)) unsortedMap.get(group).push({ ...newField, customField: id });
        else unsortedMap.set(group, [{ ...newField, customField: id }]);
        this.availableFields = new Map([...unsortedMap].sort((a, b) => a[0].localeCompare(b[0])));

        this.fieldsByType.set(id, newField);
        this.fieldVersions.set(id, newField.version);

        this.$store.commit('addLocallyChangedFile', path);
        this.$store.dispatch('saveAppData');
        this.$store.commit('addToast', { message: `“${this.customField.name}” was saved successfully`, type: 'positive' });
        this.showCustomFieldModal = false;
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while saving the custom field: ${err.message}`, type: 'error' });
      }
    },
    setFieldBeingEditedError(property, error) {
      if (error && !this.fieldBeingEdited.errors) this.fieldBeingEdited.errors = new Map([[property, error]]);
      else if (error) this.fieldBeingEdited.errors.set(property, error);
      else if (this.fieldBeingEdited.errors) {
        this.fieldBeingEdited.errors.delete(property);
        if (this.fieldBeingEdited.errors.size === 0) delete this.fieldBeingEdited.errors;
      }
    },
    transferField() {
      if (this.fieldAddParent && this.fieldToTransfer) {
        this.$store.commit('setAppProperty', { key: 'dragActive', value: false });
        const { parent, index } = this.fieldToTransfer;
        const parentFieldFields = parent === '___toplevel' ? this.fields : this.getField(parent).value;
        const targetFieldFields = this.fieldAddParent === '___toplevel' ? this.fields : this.getField(this.fieldAddParent).value;
        const [field] = parentFieldFields.splice(index, 1);

        field.key = this.generateUniqueFieldKey(targetFieldFields, field.key);

        this.removeCurrentAddIndicator();
        targetFieldFields.splice(this.fieldAddIndex, 0, field);
        this.fieldAddIndex = null;
        this.fieldAddParent = null;
        this.fieldToTransfer = null;
      }
    },
    transferFieldToTab() {
      if (!this.fieldToTransfer || this.fieldAddIndex === null) return;
      this.$store.commit('setAppProperty', { key: 'dragActive', value: false });
      const { parent, index } = this.fieldToTransfer;

      if (parent !== '___toplevel') {
        this.$store.commit('addToast', { message: 'Subfields cannot be moved to a different tab', type: 'warning' });
        return;
      }

      const parentFieldFields = parent === '___toplevel' ? this.fields : this.getField(parent).value;
      const field = parentFieldFields[index];
      const tab = this.tabs[this.fieldAddIndex];

      if (field.tab !== tab) this.moveFieldToTab(field, tab);
      this.fieldToTransfer = null;
    },
    updateModelValue() {
      this.internalChange = true;
      this.$emit('update:modelValue', cloneDeep(this.fields)); // creating a deep clone here so we don’t pass any references
    },
    updateFieldVersion(field) {
      const newVersion = this.fieldsByType.get(field.customField || field.type);

      Object.entries(newVersion).forEach(([key, value]) => {
        if (key === 'group' || key === 'description') return;
        if (key === 'version') field[key] = value; // eslint-disable-line no-param-reassign
        if (key === 'options') {
          // Custom fields always inherit the options of the prototype, so we can simply override
          if (field.customField) field.options = cloneDeep(value); // eslint-disable-line no-param-reassign
          else if (value.length > 0) {
            if (!field.options) field.options = {}; // eslint-disable-line no-param-reassign
            value.forEach((option) => {
              if (typeof field.options[option.key] === 'undefined') field.options[option.key] = cloneDeep(option.value); // eslint-disable-line no-param-reassign
            });
          }
        } else if (key === 'value' && value) {
          // nesting this here so existing values stay untouched
          if (field.customField) field.value = cloneDeep(value); // eslint-disable-line no-param-reassign
          else if (!field[key]) field.value = []; // eslint-disable-line no-param-reassign
        } else if (key === 'icon') field.icon = value; // eslint-disable-line no-param-reassign
        else if (value && typeof value === 'object') field[key] = { ...cloneDeep(value), ...field[key] }; // eslint-disable-line no-param-reassign
        else if (typeof field[key] === 'undefined') field[key] = cloneDeep(value); // eslint-disable-line no-param-reassign
      });

      Object.keys(field).forEach((key) => {
        if (key === 'options' && !field.customField) {
          Object.keys(field.options).forEach((optionKey) => {
            if (!newVersion.options.find((option) => option.key === optionKey)) delete field.options[optionKey]; // eslint-disable-line no-param-reassign
          });
        } else if (key !== 'value' && key !== 'default' && field[key] && typeof field[key] === 'object') {
          Object.keys(field[key]).forEach((subkey) => {
            if (typeof newVersion[key][subkey] === 'undefined') delete field[key][subkey]; // eslint-disable-line no-param-reassign
          });
        } else if (typeof newVersion[key] === 'undefined') delete field[key]; // eslint-disable-line no-param-reassign
      });
    },
    validateCustomField() {
      if (!this.customField.name || !this.customField.name.trim()) this.errors.customFieldName = 'A name is required';
      else this.errors.customFieldName = '';
    },
    validateField(property) {
      if (property) {
        let error = '';

        switch (property) {
          case 'key':
            if (!this.fieldBeingEdited.key || !this.fieldBeingEdited.key.trim()) error = 'A key is required';
            else if (['___toplevel', '___addIndicator'].includes(this.fieldBeingEdited.key) || this.fieldBeingEdited.key.startsWith('___mb_')) error = 'This is a reserved key';
            else if (this.fieldBeingEdited.key.includes('.')) error = 'Keys cannot contain a . (period) character';
            else if (this.fieldBeingEditedSiblings.filter((existingField) => existingField.key === this.fieldBeingEdited.key).length > 1) error = 'A field with this key already exists';
            break;
          case 'label':
            if (!this.fieldBeingEdited.label || !this.fieldBeingEdited.label.trim()) error = 'A label is required';
            break;
          case 'regex':
            if (this.fieldBeingEdited.validation && this.fieldBeingEdited.validation.regex) {
              try {
                new RegExp(this.fieldBeingEdited.validation.regex); // eslint-disable-line no-new
              } catch (err) {
                error = 'Invalid regular expression';
              }
            }
            break;
          case 'comparatorRegex':
            if (this.fieldBeingEdited.visibility && this.fieldBeingEdited.visibility.showByValue && this.fieldBeingEdited.visibility.showByValue.value === 'matches' && this.fieldBeingEdited.visibility.showByValue.comparator) {
              try {
                new RegExp(this.fieldBeingEdited.visibility.showByValue.comparator); // eslint-disable-line no-new
              } catch (err) {
                error = 'Invalid regular expression';
              }
            }
            break;
          default:
            // no op
        }

        this.fieldErrors[property] = error;
        this.setFieldBeingEditedError(property, error);
      }
    },
  },
  props: {
    activated: {
      type: Boolean,
      default: true,
    },
    activeTab: Number,
    dark: Boolean,
    modelValue: Array,
    noSubfields: Boolean,
    projectId: String,
    showGenerateButton: Boolean,
    tabs: Array,
  },
  watch: {
    currentOperation(nv, ov) {
      if (nv && ov === 'edit-field') this.fieldBeingEdited = null;
    },
    fieldBeingEdited() {
      this.$nextTick(() => this.$refs.tabContent.scrollSplit());
    },
    fields: {
      deep: true,
      handler() {
        if (this.externalChange) {
          this.externalChange = false;
          return;
        }
        this.updateModelValue();
      },
    },
    modelValue: {
      deep: true,
      handler(nv) {
        if (this.internalChange) {
          this.internalChange = false;
          return;
        }
        this.externalChange = true; // we need to set this here to avoid immediately calling updateModelValue() since fields changed
        this.fields = cloneDeep(nv);
      },
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .schema-fields-editor {
    height: calc(100% - rem(86 + 56)); // header + tabs

    @media #{$mobile} {
      height: auto;
    }

    .empty-state,
    .added-fields-list {
      max-width: 40rem;
      margin-top: 8rem;
      margin-left: auto;
      margin-right: auto;

      &.v-enter-active,
      &.v-leave-active {
        transition: opacity 100ms ease;

        &.v-enter-from,
        &.v-leave-to {
          opacity: 0;
        }
      }
    }

    .empty-state {
      @media #{$mobile} {
        margin-top: 0;
      }

      &.dark {
        h2, p {
          color: var(--text-secondary-dark);
        }
      }

      h2,
      p {
        text-align: center;
        color: var(--text-secondary);
      }

      p {
        max-width: 32rem;
        margin-left: auto;
        margin-right: auto;

        @media #{$mobile} {
          text-align: left;
        }
      }

      footer {
        margin: -0.5rem;
        margin-top: 1.5rem;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;

        .button {
          margin: 0.5rem;

          @media #{$mobile} {
            flex-grow: 1;
          }
        }
      }
    }

    .added-fields-list {
      @media #{$tablet} {
        margin-top: 4rem;
      }

      @media #{$mobile} {
        margin-top: 2rem;
      }

      .field-arrangement-list {
        margin-bottom: 0;

        &.v-enter-active,
        &.v-leave-active {
          transition: opacity 200ms ease;

          &.v-enter-from,
          &.v-leave-to {
            opacity: 0;
          }
        }

        &:deep(> .field-arrangement-item:last-child:not(.dragging)) {
          padding-bottom: 2rem;
        }

        &:deep(> .field-arrangement-item:last-child.dragging) {
          margin-bottom: 2rem;
        }
      }

      .button {
        display: flex;
        margin-left: auto;
        // margin-right: auto

        @media #{$mobile} {
          width: 100%;
        }

        &.v-leave-active {
          display: none;
        }

        &.v-enter-active {
          transition: opacity 200ms ease;

          &.v-enter-from {
            opacity: 0;
          }
        }
      }
    }
  }

  .add-field { // needs to be toplevel since modal teleports
    &.dark {
      header .input {
        background-color: var(--bg-tertiary-dark);
      }

      .fields-list .field-group h3 {
        color: var(--text-secondary-dark);
      }
    }

    header {
      margin-top: 8rem;
      max-width: 40rem;
      margin-left: auto;
      margin-right: auto;

      @media #{$tablet} {
        margin-top: 4rem;
      }

      @media #{$mobile} {
        margin-top: 0;
        text-align: center;
      }

      h2 {
        margin-top: 0;
      }

      .input {
        display: flex;
        width: 100%;
      }
    }

    .loader-wrapper,
    .fields-list {
      &.v-enter-active,
      &.v-leave-active {
        transition: opacity 200ms ease;

        &.v-enter-from,
        &.v-leave-to {
          opacity: 0;
        }
      }
    }

    .loader-wrapper {
      margin: 4rem 0;
      text-align: center;

      p {
        opacity: 0.5;
      }
    }

    .fields-list {
      max-width: 40rem;
      margin-left: auto;
      margin-right: auto;
      margin-bottom: 4rem;

      @media #{$mobile} {
        margin-bottom: 0;
      }

      .field-group {
        margin-top: 4rem;

        @media #{$tablet} {
          margin-top: 2rem;
        }

        h3 {
          text-transform: capitalize;
          color: var(--text-secondary);
        }
      }
    }
  }

  .edit-field { // toplevel because of teleport
    &.dark {
      header span,
      section h3 {
        color: var(--text-secondary-dark);
      }

      section {
        .input,
        .tag-input,
        .icon-picker,
        .date-picker {
          background-color: var(--bg-tertiary-dark);
        }

        .editor {
          &:deep(.content-wrapper) {
            background-color: var(--bg-tertiary-dark);

            &:not(:focus-within) {
              box-shadow: inset 0 0.0625rem 0 0 var(--bg-tertiary-dark-lightened-10);
            }
          }
        }

        .highlight-box {
          background-color: var(--bg-secondary-dark);
        }
      }

      &.in-modal {
        section {
          .highlight-box {
            background-color: var(--bg-dark);
          }

          .input,
          .tag-input,
          .icon-picker {
            background-color: var(--bg-secondary-dark);
          }
        }
      }
    }

    header {
      margin-top: 8rem;
      max-width: 40rem;
      margin-left: auto;
      margin-right: auto;

      @media #{$tablet} {
        margin-top: 4rem;
      }

      @media #{$mobile} {
        margin-top: 0;
        text-align: center;
      }

      h2 {
        margin: 0;
      }

      span {
        text-transform: capitalize;
        color: var(--text-secondary);
      }

      & + section {
        .highlight-box {
          margin-top: 3rem;
        }
      }
    }

    > section {
      max-width: 40rem;
      margin-left: auto;
      margin-right: auto;

      &:not(:last-child) {
        margin-bottom: 4rem;

        @media #{$mobile} {
          margin-bottom: 3rem;
        }
      }

      &.v-enter-active,
      &.v-leave-active {
        transition: opacity 200ms ease;

        &.v-enter-from,
        &.v-leave-to {
          opacity: 0;
        }
      }

      h3 {
        color: var(--text-secondary);
      }

      > .toggle {
        margin-bottom: 2rem;

        & + .input-row .input {
          margin-top: 0;
        }
      }

      .input-row {
        margin-left: -0.5rem;
        margin-right: -0.5rem;
        display: flex;
        flex-wrap: wrap;

        &:not(:last-child) {
          margin-bottom: 2rem;
        }

        & + .input-row .input {
          margin-top: 0;
        }

        .input,
        .date-picker {
          flex-grow: 1;
          width: calc(50% - 1rem);
          margin-left: 0.5rem;
          margin-right: 0.5rem;

          @media #{$tablet} {
            width: 100%;

            &:not(:first-child) {
              margin-top: 2rem;
            }
          }
        }
      }

      .field-wrapper {
        display: flex;
        align-items: center;

        > .field {
          width: calc(100% - (rem(50) + 0.5rem));
        }

        > .clear-button {
          flex-shrink: 0;
          margin-left: 0.5rem;
        }
      }

      .select-wrapper,
      .conditional-wrapper {
        display: flex;
        align-items: center;
        margin-bottom: 2rem;

        > span {
          margin-right: auto;
        }
      }

      .conditional-wrapper {
        > span {
          margin-right: 1rem;
          flex-shrink: 0;
        }

        .input {
          margin-top: 0;
          flex-grow: 1;
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
          border-color: var(--accent);
        }

        &:deep(.select) {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
          height: rem(58);
          border-right-width: 0;

          &.operator {
            border-radius: 0;
            flex-shrink: 0;
            min-width: rem(183);

            &:last-child {
              border-top-right-radius: var(--radius-m);
              border-bottom-right-radius: var(--radius-m);
              border-right-width: 0.0625rem;
            }
          }
        }

        @media #{$mobile} {
          flex-wrap: wrap;

          > span {
            margin-bottom: 0.5rem;
            width: 100%;
          }

          &:deep(.select) {
            width: 100%;
            margin-right: 0;
            border-right-width: 0.0625rem;
            border-bottom-width: 0;
            border-top-right-radius: var(--radius-m);
            border-bottom-left-radius: 0;

            &.operator:last-child {
              border-top-right-radius: 0;
              border-bottom-left-radius: var(--radius-m);
              border-bottom-width: 0.0625rem;
            }
          }

          .input {
            margin-top: 0;
            border-top-right-radius: 0;
            border-bottom-left-radius: var(--radius-m);
          }
        }
      }

      .tag-input {
        margin-bottom: 2rem;
        margin-top: 3rem;
      }

      .highlight-box {
        &:not(:last-child) {
          margin-bottom: 2rem;
        }

        .button {
          display: flex;
          margin-left: auto;

          @media #{$mobile} {
            width: 100%;
          }
        }
      }

      .config-option {
        display: flex;
        align-items: center;
        justify-content: space-between;

        &.MbCheckboxGroup,
        &.MbPalette,
        &.MbEditableList,
        &.MbItemList,
        &.MbTagInput {
          align-items: flex-start;

          > span {
            margin-right: 1rem;
          }

          > .checkbox-group {
            width: 100%;
            max-width: rem(192);
          }

          > .editable-list:not(:only-child) {
            width: 100%;
            max-width: rem(400);
          }
        }

        &.MbPalette {
          .palette {
            &:deep(li.dark) {
              background-color: var(--bg-tertiary-dark);

              .input,
              .color-picker {
                background-color: var(--bg-tertiary-dark);
              }

              .input {
                border-left-color: var(--bg-secondary-dark);
                border-right-color: var(--bg-secondary-dark);
              }
            }
          }

          > span {
            margin-top: 1rem;

            @media #{$mobile} {
              margin-top: 0;
            }
          }

          > .palette {
            width: 100%;
            max-width: rem(355);
          }
        }

        &.MbRadioGroup {
          .radio-group.dark:deep(label .fake-radio::after) {
            background-color: var(--bg-secondary-dark);
          }
        }

        &.MbEditableList {
          > span {
            margin-top: 0.75rem;

            @media #{$mobile} {
              margin-top: 0;
            }
          }

          .editable-list {
            &:deep(.segmented-selector.dark) {
              background-color: var(--bg-tertiary-dark);
              box-shadow: 0 0 0 0.125rem var(--bg-tertiary-dark);
            }

            &:deep(.item.dark) {
              background-color: var(--bg-tertiary-dark);

              .input {
                background-color: var(--bg-tertiary-dark);
                border-left-color: var(--bg-secondary-dark);
                border-right-color: var(--bg-secondary-dark);
              }
            }

            &:deep(.file-picker.dark) {
              background-color: var(--bg-tertiary-dark);

              &:hover {
                background-color: var(--bg-tertiary-dark-lightened-5);
              }
            }
          }
        }

        &.MbTagInput {
          > span {
            margin-top: 1rem;

            @media #{$mobile} {
              margin-top: 0;
            }
          }

          .tag-input {
            margin-top: 0.5rem;
            margin-bottom: 0;

            &:not(:only-child) {
              margin-top: 0;
              width: 100%;
              max-width: rem(320);
            }
          }
        }

        &.MbFilePicker {
          .file-picker {
            &:not(:only-child) {
              width: 100%;
              max-width: rem(320);
            }

            &.dark {
              background-color: var(--bg-tertiary-dark);

              &:hover {
                background-color: var(--bg-tertiary-dark-lightened-5);
              }
            }
          }
        }

        &.MbItemList {
          > span {
            margin-top: rem(14);

            @media #{$mobile} {
              margin-top: 0;
            }
          }

          .item-list {
            &:deep(.item.dark) {
              background-color: var(--bg-tertiary-dark);
              box-shadow: inset 0 0 0 0.0625rem var(--bg-tertiary-dark-lightened-5);
            }
          }
        }

        @media #{$mobile} {
          flex-wrap: wrap;

          > span {
            margin-bottom: 0.5rem;

            & + .input {
              width: 100%;
            }
          }

          &:deep(> .select),
          > .radio-group.inline:deep(label),
          > .editable-list,
          > .icon-picker {
            width: 100%;
          }
        }

        &:not(:last-child) {
          margin-bottom: 1rem;

          @media #{$mobile} {
            margin-bottom: 2rem;
          }

          &.MbCheckboxGroup {
            margin-bottom: 2rem;
          }
        }

        > *:only-child {
          width: 100%;
        }

        > span + .input {
          margin-top: 0;
        }
      }
    }
  }

  .custom-field-modal {
    .input {
      width: 100%;
      margin-bottom: 1rem;

      &.v-enter-active,
      &.v-leave-active {
        transition: opacity 200ms ease;

        &.v-enter-from,
        &.v-leave-to {
          opacity: 0;
        }
      }
    }

    .icon-picker-wrapper,
    .file-picker-wrapper {
      display: flex;
      align-items: center;
      margin-top: 2rem;

      &:last-child {
        margin-bottom: 0.125rem;
      }

      > span {
        margin-right: 1rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      > .icon-picker,
      > .file-picker {
        margin-left: auto;
      }
    }

    .file-picker-wrapper > span {
      flex-shrink: 0;
    }
  }

  .field-type-modal {
    &.dark {
      .fields-list .field-group h3 {
        color: var(--text-secondary-dark);
      }
    }

    .input {
      margin-top: 0;
      width: 100%;
    }

    .fields-list {
      .field-group {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        grid-gap: 1rem;

        @media #{$mobile} {
          display: block;
        }

        h3 {
          grid-column: span 2;
          text-transform: capitalize;
          color: var(--text-secondary);
        }

        .button {
          width: 100%;

          @media #{$mobile} {
            margin-bottom: 0.5rem;
          }
        }
      }
    }
  }
</style>
