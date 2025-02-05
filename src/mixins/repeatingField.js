import { cloneDeep as _cloneDeep, debounce, isEqual } from 'lodash-es';

import generateDefaultContentFromSchema from '../assets/js/generateDefaultContentFromSchema';
import richToPlainText from '../assets/js/richToPlainText';
import validateContent from '../assets/js/validateContent';

import AddRepeatingFieldModal from '../components/utility/AddRepeatingFieldModal.vue';
import RepeatingFieldChangeTypeModal from '../components/utility/RepeatingFieldChangeTypeModal.vue';
import RepeatingFieldDetailsModal from '../components/utility/RepeatingFieldDetailsModal.vue';

import field from './field';

function pseudoId() {
  return Math.random().toString(36).substring(2, 9);
}

export default {
  components: {
    AddRepeatingFieldModal,
    RepeatingFieldChangeTypeModal,
    RepeatingFieldDetailsModal,
  },
  computed: {
    displayItems() {
      if (!this.modelValue || !this.initialised) return [];
      return this.modelValue.map((item) => {
        let childField;
        if (this.filteredChildren.length === 1) [childField] = this.filteredChildren;
        else childField = this.filteredChildren.find((child) => child.key === item.___mb_type) || {};
        let value;
        let displayValue;

        function cleanFirstObjectValue(obj) {
          const firstValue = Object.values(obj).find((subvalue) => subvalue);
          if (typeof firstValue === 'string') return richToPlainText(firstValue, 200);
          if (firstValue === null || typeof firstValue === 'undefined') return '';
          if (typeof firstValue === 'object') return cleanFirstObjectValue(firstValue);
          return firstValue;
        }

        if (childField.displayField && typeof item[childField.displayField] !== 'undefined' && item[childField.displayField] !== null && item[childField.displayField] !== null !== '') value = item[childField.displayField];
        else if (item && item.___mb_type && typeof item[item.___mb_type] !== 'undefined' && item[item.___mb_type] !== null) value = item[item.___mb_type];
        else value = item;

        if (Array.isArray(value)) displayValue = value.join(', ');
        else if (value && typeof value === 'object') displayValue = cleanFirstObjectValue(value);
        else if (typeof value === 'string') displayValue = richToPlainText(value, 200); // trimming to 200 characters even though only about 70 are shown because HTML can be quite verbose
        else displayValue = value;

        return {
          displayValue,
          label: childField.label || 'Unknown Field',
        };
      });
    },
    empty() {
      return !this.modelValue || this.modelValue.length === 0;
    },
    fieldBeingEdited() {
      if (!this.modelValue || this.modelValue.length === 0 || this.indexBeingEdited === null || typeof this.modelValue[this.indexBeingEdited] === 'undefined') return null;
      let childField;
      if (this.filteredChildren.length === 1) [childField] = this.filteredChildren;
      else childField = this.filteredChildren.find((child) => child.key === this.modelValue[this.indexBeingEdited].___mb_type);
      return childField;
    },
    fieldBeingEditedErrors() {
      if (!(this.error instanceof Map) || !this.error.get(this.indexBeingEdited)) return new Map();
      const errors = this.error.get(this.indexBeingEdited);
      if (this.fieldBeingEdited.type === 'group') return errors || new Map();
      return new Map().set(this.fieldBeingEdited.key, errors);
    },
    filteredChildren() {
      return this.children.filter((child) => child.visualOnly !== true);
    },
    transformedLabel() {
      if (this.error instanceof Map && this.error.get(this.fieldKey)) return this.error.get(this.fieldKey);
      if (this.validation && this.validation.max) return `${this.label} (${(this.modelValue && this.modelValue.length) || 0}/${this.validation.max})`;
      return this.label;
    },
  },
  created() {
    // this is a bit of a HACK to allow unique keys for each element in modelValue, but it will break if modelValue gets changed from the outside after creation (which it shouldn’t, and if that ever changes a clever watcher could help)
    if (Array.isArray(this.modelValue)) this.uniqueItemKeys = this.modelValue.map(() => pseudoId());

    if (this.modelValue) {
      const cleanModel = [];
      if (this.filteredChildren.length > 1) this.modelValue.forEach((item) => cleanModel.push(this.inferItemType(item)));
      else this.modelValue.forEach((item) => cleanModel.push(this.normaliseItemType(item)));

      if (!isEqual(this.modelValue, cleanModel)) this.handleInput(cleanModel);
    }
    this.$nextTick(() => { this.initialised = true; }); // wait a tick before showing everything so the modelValue is the sanitised one
  },
  data() {
    return {
      cachedKeystrings: null,
      indexBeingEdited: null,
      initialised: false,
      itemContextMenu: {
        options: [
          {
            action: () => this.openDetails(this.itemContextMenu.item),
            label: 'Edit',
            icon: 'pencil',
          },
          {
            action: () => this.duplicateItem(this.itemContextMenu.item),
            label: 'Duplicate',
            icon: 'duplicate',
          },
          {
            action: () => { this.indexBeingEdited = this.itemContextMenu.item; this.showTypeChangeModal = true; },
            label: 'Change type',
            icon: 'replace-round',
            disabled: this.children.length < 2,
          },
          {
            action: () => this.deleteItem(this.itemContextMenu.item),
            label: 'Delete',
            icon: 'trash',
            type: 'negative',
          },
        ],
        item: null,
        show: false,
        target: null,
        x: 0,
        y: 0,
      },
      showAddModal: false,
      showDetailsModal: false,
      showTypeChangeModal: false,
      uniqueItemKeys: [],
    };
  },
  methods: {
    addItem(item) {
      if (item.visualOnly) {
        if (item.type === 'container') this.$store.commit('addToast', { message: 'Container fields are not allowed as top-level repeating fields, use a Field Group instead', type: 'negative' });
        else this.$store.commit('addToast', { message: 'Purely visual fields are not allowed as top-level repeating fields', type: 'negative' });
        return;
      }
      let contentItem;
      if (this.filteredChildren.length === 1) {
        if (item.type !== 'group') contentItem = item.default;
        else contentItem = generateDefaultContentFromSchema({ fields: item.value });
      } else if (item.type !== 'group') {
        contentItem = {
          ___mb_type: item.key,
          [item.key]: item.default,
        };
      } else contentItem = { ...generateDefaultContentFromSchema({ fields: item.value }), ___mb_type: item.key };

      this.uniqueItemKeys.push(pseudoId());
      this.handleInput((this.modelValue || []).concat([contentItem]));
      if (this.showAddModal) this.showAddModal = false;
    },
    changeItemType(index, newField) {
      if (newField.visualOnly) {
        if (newField.type === 'container') this.$store.commit('addToast', { message: 'Container fields are not allowed as top-level repeating fields, use a Field Group instead', type: 'negative' });
        else this.$store.commit('addToast', { message: 'Purely visual fields are not allowed as top-level repeating fields', type: 'negative' });
        return;
      }
      if (this.filteredChildren.length === 1) return; // there can only be one type

      const currentValue = this.modelValue[index];
      const currentType = (this.fieldBeingEdited && this.fieldBeingEdited.label) || 'Unknown Field';

      if (currentType === newField.label) { // nothing to do
        this.indexBeingEdited = null;
        this.showTypeChangeModal = false;
        return;
      }

      let newDefaults;
      if (newField.type === 'group') newDefaults = generateDefaultContentFromSchema({ fields: newField.value });
      else newDefaults = { [newField.key]: newField.default };

      const newValue = { ...newDefaults, ___mb_type: newField.key };

      Object.entries(newDefaults).forEach(([key, value]) => {
        const currentValueForKey = currentValue[key];
        if (currentValueForKey && (!value || typeof value === typeof currentValueForKey)) newValue[key] = currentValueForKey;
      });

      const modelClone = [...this.modelValue];
      modelClone.splice(index, 1, newValue);
      this.handleInput(modelClone);

      this.$nextTick(() => { // we have to wait a tick before validating so we validate with the new modelValue
        this.validateItemBeingEdited();

        // since validateItemBeingEdited requires fieldBeingEdited, we can only reset the indexBeingEdited after we validated
        this.indexBeingEdited = null;
        this.showTypeChangeModal = false;
      });

      this.$store.commit('addToast', {
        action: () => {
          const newModelClone = [...this.modelValue];
          newModelClone.splice(index, 1, currentValue);
          this.handleInput(newModelClone);
        },
        actionLabel: 'Undo',
        closeOnRouteChange: true,
        message: `Changed ${this.options.itemLabel || (this.type === 'rows' ? 'row' : 'column')} from “${currentType}” to “${newField.label}”`,
        timeout: 5000 - 200,
        type: 'warning',
      });
    },
    closeDetails() {
      if (this.splitTarget) this.$emit('update:active', false);
      else this.showDetailsModal = false;
    },
    deleteItem(index) {
      if (typeof index !== 'number') return;

      const [idBackup] = this.uniqueItemKeys.splice(index, 1);
      const backup = this.modelValue[index];

      let errorBackup;
      if (this.error instanceof Map) errorBackup = this.error.get(index);

      if (index === this.indexBeingEdited) {
        this.indexBeingEdited = null;
        this.closeDetails();
      }

      this.handleInput(this.modelValue.filter((item, i) => i !== index));

      if (this.error instanceof Map) {
        this.$nextTick(() => this.updateErrorIndices(index, -1)); // handleInput could update the error, so we need to make sure that the value is updated before we update the indices
      }

      this.$store.commit('addToast', {
        action: () => {
          const modelClone = [...(this.modelValue || [])];
          modelClone.splice(index, 0, backup);
          this.handleInput(modelClone);
          this.uniqueItemKeys.splice(index, 0, idBackup);
          if (this.error instanceof Map) this.updateErrorIndices(index, index);
          if (errorBackup) {
            this.$nextTick(() => { // we need to wait a tick so the update from updateErrorIndices() can go through
              const newError = _cloneDeep(this.error) || new Map();
              newError.set(index, errorBackup);
              this.$emit('update:error', newError);
            });
          }
        },
        actionLabel: 'Undo',
        closeOnRouteChange: true,
        message: `The ${this.options.itemLabel || (this.type === 'rows' ? 'row' : 'column')} was deleted`,
        timeout: 5000 - 200,
        type: 'warning',
      });
    },
    deleteItemBeingEdited() {
      this.deleteItem(this.indexBeingEdited);
    },
    duplicateItem(index) {
      if (typeof index !== 'number') return;

      const modelClone = _cloneDeep(this.modelValue);
      const itemClone = _cloneDeep(this.modelValue[index]);
      modelClone.splice(index + 1, 0, itemClone);
      this.uniqueItemKeys.splice(index + 1, 0, pseudoId());
      this.handleInput(modelClone);
      if (this.error instanceof Map) this.updateErrorIndices(index + 1, index + 1);
    },
    errorForIndex(index) {
      if (!(this.error instanceof Map)) return null;
      const error = this.error.get(index);
      if (error instanceof Map) {
        if (error.size === 1) return 'A subfield has errors';
        return `${error.size} subfields have errors`;
      }
      return error;
    },
    errorMapForIndex(index) {
      if (!(this.error instanceof Map) || !this.error.get(index)) return new Map();
      const errors = this.error.get(index);

      let fieldBeingEdited;
      if (this.filteredChildren.length === 1) [fieldBeingEdited] = this.filteredChildren;
      else fieldBeingEdited = this.filteredChildren.find((child) => child.key === this.modelValue[index].___mb_type);

      if (fieldBeingEdited.type === 'group') return errors || new Map();
      return new Map().set(fieldBeingEdited.key, errors);
    },
    fieldsForIndex(index) {
      if (!this.modelValue || this.modelValue.length === 0 || typeof index !== 'number') return null;

      let childField;
      if (this.filteredChildren.length === 1) [childField] = this.filteredChildren;
      else childField = this.filteredChildren.find((child) => child.key === this.modelValue[index].___mb_type);

      if (!childField) return null;
      if (childField.type === 'group') return childField.value;
      return [childField];
    },
    handleAddClick() {
      if (this.filteredChildren.length === 1) this.addItem(this.filteredChildren[0]);
      else this.showAddModal = true;
    },
    handleFieldError(err, index) {
      const newError = _cloneDeep(this.error) || new Map();
      if (err.size === 0) newError.delete(index);
      else {
        let fieldBeingEdited;
        if (this.filteredChildren.length === 1) [fieldBeingEdited] = this.filteredChildren;
        else fieldBeingEdited = this.filteredChildren.find((child) => child.key === this.modelValue[index].___mb_type);
        newError.set(index, fieldBeingEdited.type === 'group' ? err : err.get(fieldBeingEdited.key));
      }

      this.$emit('update:error', newError.size > 0 ? newError : '');
    },
    handleFieldBeingEditedError(err) {
      this.handleFieldError(err, this.indexBeingEdited);
    },
    handleInput(newVal) {
      const error = this.validate(newVal);
      const fieldError = this.error && this.error.get(this.fieldKey);

      if (error) {
        if ((fieldError && fieldError !== error) || (!fieldError && this.error)) this.$emit('update:error', _cloneDeep(this.error).set(this.fieldKey, error));
        else if (!fieldError && !this.error) this.$emit('update:error', new Map().set(this.fieldKey, error));
      } else if (fieldError && this.error) {
        const clone = _cloneDeep(this.error);
        clone.delete(this.fieldKey);
        this.$emit('update:error', clone.size > 0 ? clone : '');
      }

      this.$emit('update:modelValue', newVal);
    },
    handleItemMove({ activeItem, index, isBottomHalf }) {
      const currentIndex = this.uniqueItemKeys.indexOf(activeItem);
      const newVal = [...this.modelValue];
      let newIndex;
      if ((currentIndex < index && isBottomHalf) || (currentIndex > index && !isBottomHalf)) newIndex = index;
      else if (currentIndex < index && !isBottomHalf) newIndex = Math.max(0, index - 1);
      else if (currentIndex > index && isBottomHalf) newIndex = Math.min(index + 1, newVal.length - 1);

      if (currentIndex === this.indexBeingEdited) this.indexBeingEdited = newIndex;
      else if (currentIndex > this.indexBeingEdited && newIndex <= this.indexBeingEdited) this.indexBeingEdited += 1;
      else if (currentIndex < this.indexBeingEdited && newIndex >= this.indexBeingEdited) this.indexBeingEdited -= 1;

      if (newIndex === currentIndex) return; // there’s nothing to do

      if (this.error instanceof Map) this.updateErrorIndices(currentIndex, newIndex);

      newVal.splice(newIndex, 0, newVal.splice(currentIndex, 1)[0]);
      this.uniqueItemKeys.splice(newIndex, 0, this.uniqueItemKeys.splice(currentIndex, 1)[0]);
      this.handleInput(newVal);
    },
    inferItemType(item) {
      if (!item || typeof item !== 'object') return { ___mb_item: item }; // turn it into an object since the other methods expect being able to check ___mb_type on it
      if (item.___mb_type) return item; // it already has a type
      const itemKeyString = Object.keys(item).sort().join('&');

      if (!this.cachedKeystrings) {
        const keyStrings = this.filteredChildren.reduce((acc, childfield) => {
          if (!childfield.value) acc.set(childfield.key, childfield.key);
          else acc.set(childfield.value.map((subfield) => subfield.key).sort().join('&'), childfield.key);
          return acc;
        }, new Map());
        this.cachedKeystrings = keyStrings;
      }

      const inferredType = this.cachedKeystrings.get(itemKeyString);
      return { ...item, ___mb_type: inferredType };
    },
    modelValueForIndex(index) {
      if (!this.modelValue || this.modelValue.length === 0 || !this.modelValue[index]) return null;
      if (this.modelValue[index].___mb_type || this.filteredChildren[0].type === 'group') return this.modelValue[index];
      return { [this.filteredChildren[0].key]: this.modelValue[index] };
    },
    normaliseItemType(item) {
      if (item && typeof item === 'object' && Object.prototype.hasOwnProperty.call(item, '___mb_item')) return item.___mb_item;
      return item;
    },
    openContextMenu(e, index) {
      if (!this.options.allowEditing || (this.type === 'rows' && !this.isCompact)) return;

      this.itemContextMenu.item = index;
      this.itemContextMenu.target = e.currentTarget;
      this.itemContextMenu.x = e.clientX;
      this.itemContextMenu.y = e.clientY;
      this.itemContextMenu.show = true;
    },
    openDetails(index) {
      if (this.type === 'rows' && !this.isCompact) return;
      if (this.active && index === this.indexBeingEdited) {
        this.closeDetails();
        return;
      }

      this.indexBeingEdited = index;

      if (!this.fieldBeingEdited) {
        this.showTypeChangeModal = true;
        return;
      }

      if (!this.active && this.splitTarget) this.$emit('update:active', true);
      else if (!this.showDetailsModal && !this.splitTarget) this.showDetailsModal = true;
    },
    resetItemContextMenu() {
      this.itemContextMenu.show = false;
      this.itemContextMenu.item = null;
      this.itemContextMenu.target = null;
      this.itemContextMenu.x = 0;
      this.itemContextMenu.y = 0;
    },
    showValueTooltip(e, index) {
      if (!this.displayItems[index]?.displayValue) return;

      const tooltip = {
        message: this.displayItems[index]?.displayValue,
        target: e.currentTarget,
      };
      this.$store.commit('setTooltip', tooltip);
    },
    updateErrorIndices(changedIndex = 0, newIndex = 0) {
      if (!(this.error instanceof Map)) return;
      const newError = new Map();
      this.error.forEach((value, key) => {
        if (typeof key !== 'number') {
          newError.set(key, value); // it’s the rows/columns-field itself that has the error
          return;
        }

        if (changedIndex === newIndex && key >= changedIndex) newError.set(key + 1, value); // an item was added or a deletion undone
        else if (changedIndex === key && newIndex !== -1) newError.set(newIndex, value);
        else if (changedIndex > key && newIndex <= key && newIndex !== -1) newError.set(key + 1, value);
        else if (changedIndex < key && (newIndex >= key || newIndex === -1)) newError.set(key - 1, value);
        else if (newIndex !== -1 || key < changedIndex) newError.set(key, value); // only keep an error in the same place if nothing was removed, or we’re above whatever was removed
      });
      this.$emit('update:error', newError.size > 0 ? newError : '');
    },
    updateField: debounce(function debouncedUpdate(newVal, index) {
      const newModelValue = [...this.modelValue];
      let cleanNewVal = newVal;
      if (this.filteredChildren.length === 1 && this.filteredChildren[0].type !== 'group') cleanNewVal = newVal[this.filteredChildren[0].key];
      newModelValue.splice(index, 1, cleanNewVal);
      this.handleInput(newModelValue);
    }, 500),
    updateFieldBeingEdited(newVal) {
      this.updateField(newVal, this.indexBeingEdited);
    },
    validateItemBeingEdited() {
      if (this.indexBeingEdited === null) return;
      const fakeFields = this.fieldBeingEdited.type === 'group' ? this.fieldBeingEdited.value : [this.fieldBeingEdited];
      let content = this.modelValue[this.indexBeingEdited];
      if (!content || (!content.___mb_type && this.fieldBeingEdited.type !== 'group')) content = { [this.fieldBeingEdited.key]: content }; // we need to make sure we pass an object with a correct key if we don’t have ___mb_type
      const errors = validateContent(content, { fields: fakeFields }, this.languages);
      this.handleFieldBeingEditedError(errors);

      this.indexBeingEdited = null;
    },
  },
  mixins: [field],
  watch: {
    active(nv) {
      if (!nv) this.validateItemBeingEdited();
    },
    indexBeingEdited(nv) {
      if (nv === null && (this.showDetailsModal || this.active)) this.closeDetails();
    },
    modelValue(nv) {
      if (nv && nv.length === this.uniqueItemKeys.length) return;

      if (nv === null) this.uniqueItemKeys = [];
      else if (nv.length > this.uniqueItemKeys.length) {
        for (let count = 0; count < nv.length - this.uniqueItemKeys.length; count += 1) {
          this.uniqueItemKeys.push(pseudoId());
        }
      } else if (nv.length < this.uniqueItemKeys.length) this.uniqueItemKeys.length = nv.length;
    },
  },
};
