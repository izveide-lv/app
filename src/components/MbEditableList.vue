<template>
  <div class="editable-list">
    <MbSegmentedSelector v-if="!forceMode" v-model="mode" :dark="dark" :options="[{ label: 'Simple', value: 'simple' }, { label: 'Labelled', value: 'advanced' }, { label: 'From File', value: 'file' }]" />
    <transition mode="out-in">
      <div v-if="mode !== 'file'" class="mode" :key="mode">
        <MbSortableList v-slot="{ activeItem, item, index }" :items="itemsWithoutSoftDeleted" key-name="value" @itemmove="handleItemMove">
          <div class="item" :class="[mode, { 'being-dragged': activeItem === item, dark, error: errors.get(item) }]" :data-error="errors.get(item)">
            <div class="drag-handle" data-drag-handle>
              <MbIcon icon="drag-handle" />
            </div>
            <MbInput v-if="mode === 'advanced'" :dark="dark" :model-modifiers="{ lazy: true, trim: true }" :model-value="item.label" placeholder="Label" @update:model-value="handleItemUpdate($event, index, 'label')" />
            <MbInput :dark="dark" :model-modifiers="{ lazy: true, trim: true }" :model-value="item.value" placeholder="Value" @update:model-value="handleItemUpdate($event, index, 'value')" />
            <MbButton :dark="dark" icon="trash" tooltip="Delete item" type="negative" @click="deleteItem(item)" />
          </div>
        </MbSortableList>
        <div class="item" :class="[mode, { dark, error: newItem.error }]" :data-error="newItem.error">
          <div class="item-icon">
            <MbIcon :icon="newItem.error ? 'error' : 'document-add'" />
          </div>
          <MbInput v-if="mode === 'advanced'" v-model.lazy.trim="newItem.label" :dark="dark" placeholder="Label" ref="labelInput" @update:model-value="validate('label', $event)" />
          <MbInput v-model.lazy.trim="newItem.value" :dark="dark" placeholder="Value" @keyup.enter="addItem" @update:model-value="validate('value', $event)" />
          <MbButton :dark="dark" :disabled="Boolean(newItem.error)" icon="plus" tooltip="Add item" type="positive" @click="addItem" />
        </div>
      </div>
      <div v-else class="mode file" key="fileMode">
        <MbFilePicker :dark="dark" :filetypes="['json']" mode="file" :model-value="model.file.path" placeholder="Pick a JSON-file…" :relative-to-root="relativeToRoot" removable :root="rootPath" @update:model-value="handleFilePick" />
        <MbSelect :dark="dark" :disabled="fileKeys.length === 0" :loading="keysLoading" :model-value="model.file.key" :options="fileKeys" placeholder="Select a key…" @update:model-value="handleKeySelect" />
      </div>
    </transition>
  </div>
</template>

<script>
import fs, { joinPath } from '../fs';

export default {
  computed: {
    isMobile() {
      return this.$store.state.application.mobile;
    },
    itemsWithoutSoftDeleted() {
      return this.model.items.filter((item) => !this.softDeleted.has(item));
    },
  },
  created() {
    if (this.forceMode) this.mode = this.forceMode;
    else if (Array.isArray(this.modelValue)) {
      if (typeof this.modelValue[0] === 'object') this.mode = 'advanced';
      else this.mode = 'simple';
    } else this.mode = 'file';

    if (this.mode === 'file') this.model = { items: [], file: this.modelValue };
    else if (this.mode === 'simple') this.model = { items: this.modelValue.map((item) => ({ label: '', value: item })), file: {} };
    else this.model = { items: this.modelValue, file: {} };
  },
  data() {
    return {
      errors: new Map(),
      fileKeys: [],
      internalChange: false,
      keysLoading: false,
      mode: null,
      model: null,
      newItem: {
        error: '',
        label: '',
        value: '',
      },
      softDeleted: new Set(),
    };
  },
  emits: ['update:modelValue'],
  methods: {
    addItem() {
      if (this.mode === 'advanced') this.validate('label', this.newItem.label);
      this.validate('value', this.newItem.value);
      if (this.newItem.error) return;
      if (this.mode === 'simple') this.model.items.push({ label: '', value: this.newItem.value });
      else if (this.mode === 'advanced') this.model.items.push({ label: this.newItem.label, value: this.newItem.value });
      this.updateModelValue();
      this.newItem.label = '';
      this.newItem.value = '';
      if (this.mode === 'advanced') this.$refs.labelInput.focus();
    },
    deleteItem(item) {
      this.softDeleted.add(item);
      this.$store.commit('addToast', {
        action: () => {
          this.softDeleted.delete(item);
        },
        actionLabel: 'Undo',
        message: `“${item.label || item.value || item}” was deleted`,
        onClose: (undone) => {
          if (undone) return;

          this.model.items = this.model.items.filter((existingItem) => existingItem !== item);
          this.updateModelValue();
        },
        timeout: 5000,
        type: 'warning',
      });
    },
    async handleFilePick(path) {
      if (path === null) {
        this.model.file = { path: null };
        this.fileKeys = [];
      } else {
        try {
          this.keysLoading = true;
          const fileContent = JSON.parse(await fs.readFile(this.relativeToRoot ? joinPath(this.rootPath, path) : path, 'utf8'));
          this.fileKeys = Object.entries(fileContent).reduce((acc, [key, value]) => {
            if (Array.isArray(value)
              && value.every((element) => typeof element !== 'object' || (typeof element.label === 'string' && typeof element.value !== 'object' && typeof element.value !== 'undefined'))
            ) acc.push(key);
            return acc;
          }, []);
          if (this.fileKeys.length === 0) this.$store.commit('addToast', { message: 'The file you selected doesn’t seem to have any eligible keys. Please select a different one', type: 'warning' });
        } catch (err) {
          if (err.name === 'SyntaxError') {
            this.$store.commit('addToast', { message: 'The file you selected is not a valid JSON file', type: 'error' });
            this.keysLoading = false;
            return;
          }
          this.$store.commit('addToast', { message: `Something went wrong while reading the selected file: ${err.message}`, type: 'error' });
        }
        this.keysLoading = false;
        this.model.file.path = path;
      }
      this.updateModelValue();
    },
    handleItemMove({ activeItem, index, isBottomHalf }) {
      const currentIndex = this.model.items.indexOf(activeItem);
      if ((currentIndex < index && isBottomHalf) || (currentIndex > index && !isBottomHalf)) {
        this.model.items.splice(index, 0, this.model.items.splice(currentIndex, 1)[0]);
      } else if (currentIndex < index && !isBottomHalf) {
        this.model.items.splice(Math.max(0, index - 1), 0, this.model.items.splice(currentIndex, 1)[0]);
      } else if (currentIndex > index && isBottomHalf) {
        this.model.items.splice(Math.min(index + 1, this.model.items.length - 1), 0, this.model.items.splice(currentIndex, 1)[0]);
      }
      this.updateModelValue();
    },
    handleItemUpdate(newVal, index, type) {
      this.validate(type, newVal, this.model.items[index]);
      if (this.errors.size > 0) return;
      this.model.items[index][type] = newVal;
      this.updateModelValue();
    },
    handleKeySelect(key) {
      this.model.file.key = key;
      this.updateModelValue();
    },
    updateModelValue() {
      this.internalChange = true;
      if (this.mode === 'file') this.$emit('update:modelValue', { ...this.model.file });
      else if (this.mode === 'simple') this.$emit('update:modelValue', this.model.items.map((item) => item.value));
      else this.$emit('update:modelValue', [...this.model.items]);
    },
    validate(field, value, item) {
      let error = '';

      if (!value || !value.trim()) error = `A ${field} is required`;
      else if (field === 'value' && this.model.items.find((existingItem) => existingItem.value === value) && (!item || item.value !== value)) error = 'This value already exists';

      if (!item) this.newItem.error = error;
      else if (error) this.errors.set(item, error);
      else this.errors.delete(item);
    },
  },
  props: {
    dark: Boolean,
    forceMode: {
      type: String,
      validator: (v) => ['simple', 'advanced', 'file'].includes(v),
    },
    modelValue: [Array, Object],
    relativeToRoot: Boolean,
    rootPath: {
      type: String,
      default: '/',
    },
  },
  watch: {
    mode(nv, ov) {
      if (!ov) return; // initial change

      this.updateModelValue();
    },
    modelValue(nv) {
      if (this.internalChange) {
        this.internalChange = false;
        return;
      }

      if (this.mode === 'file') {
        this.model.file = nv;
        this.fileKeys = [];
      } else if (this.mode === 'simple') this.model.items = nv.map((value) => ({ label: '', value }));
      else this.model.items = nv;
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .editable-list {
    .segmented-selector {
      margin-bottom: 1rem;
    }

    .mode {
      &.v-enter-active,
      &.v-leave-active {
        transition: opacity 200ms ease;

        &.v-enter-from,
        &.v-leave-to {
          opacity: 0;
        }
      }

      &.file {
        display: flex;

        @media #{$mobile} {
          display: block;

          > .file-picker {
            margin-right: 0;
            margin-bottom: 1rem;
          }

          &:deep(> .select) {
            width: 100%;
          }
        }

        > .file-picker {
          width: 100%;
          margin-right: 1rem;
        }
      }

      .sortable-list {
        position: relative;

        &:deep(.drag-item) {
          margin-bottom: 0.5rem;

          &.v-enter-active,
          &.v-leave-active {
            transition: opacity 500ms ease; // needs to be higher for the initial enter to look good

            &.v-enter-from,
            &.v-leave-to {
              opacity: 0;
            }
          }

          &.v-leave-active {
            position: absolute;
            width: 100%;
          }
        }
      }
    }
  }

  .item {
    display: flex;
    align-items: center;
    background-color: var(--bg-secondary);
    border-radius: var(--radius-m);
    padding-right: 0.25rem;
    position: relative;
    transition: box-shadow 200ms ease, color 200ms ease;

    &.dark {
      background-color: var(--bg-secondary-dark);

      .input {
        border-color: var(--bg-dark);
      }
    }

    &.being-dragged {
      opacity: 0.25;
    }

    &.advanced {
      .drag-handle + .input,
      .item-icon + .input {
        margin-right: 0;
        border-right: none;
      }
    }

    &.error {
      margin-top: 1.5rem;

      &:not(:focus-within) {
        box-shadow: 0 0 0 0.125rem var(--negative);
        color: var(--negative-saturated);
      }
    }

    &::before {
      content: attr(data-error);
      color: var(--negative-saturated);
      position: absolute;
      top: -1.5rem;
      left: var(--radius-m);
      font-size: 0.875rem;
    }

    .drag-handle,
    .item-icon {
      padding: 1rem;
    }

    .drag-handle {
      cursor: move;
    }

    .input {
      margin-top: 0;
      flex-grow: 1;
      border-radius: 0;
      margin-right: 0.25rem;
      border-left: 0.0625rem solid var(--bg);
      border-right: 0.0625rem solid var(--bg);
      border-top: none;
      border-bottom: none;

      &:focus-within {
        border-radius: var(--radius-m);
      }

      &:first-child {
        margin-left: 3.5rem;
      }
    }

    .button {
      flex-shrink: 0;
    }
  }
</style>
