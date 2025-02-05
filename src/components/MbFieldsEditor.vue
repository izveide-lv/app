<template>
  <div class="fields-editor" :class="{ dark, 'in-split': inSplit }">
    <template v-for="field in visibleFields" :key="field.key">
      <component
        v-if="field.type !== 'container'"
        v-model="model[field.key]"
        :active="field.key === activeField"
        :children="field.value"
        :compact="compact"
        :dark="dark"
        :default="field.default"
        :display-field="field.displayField"
        :error="error.get(field.key)"
        :field-key="field.key"
        :in-split="inSplit"
        :is="componentForType(field.type)"
        :label="field.label"
        :languages="languages"
        :localised="field.localised"
        :options="field.options"
        :split-target="splitTarget"
        :type="field.type"
        :validation="field.validation"
        @update:active="$event ? activeField = field.key : activeField = null"
        @update:error="handleError(field.key, $event)"
      />
      <div v-else class="container" :class="{ bordered: field.options.bordered || field.options.collapsible, collapsible: field.options.collapsible, dark }">
        <header v-if="field.options.bordered || field.options.collapsible" @click="collapsed.set(field.key, !collapsed.get(field.key))">
          <p class="label" :class="{ collapsed: collapsed.get(field.key), dark }">{{field.label}}</p>
          <MbButton v-if="field.options.collapsible" :dark="dark" :icon="collapsed.get(field.key) ? 'chevron-down' : 'chevron-up'" rounded :tooltip="`Collapse ${field.label}`" />
        </header>
        <MbFieldsEditor
          v-show="!collapsed.get(field.key) || !field.options.collapsible"
          v-model="model"
          :class="{ row: field.options.row }"
          :compact="compact"
          :dark="dark"
          :error="error"
          :fields="field.value"
          :in-split="inSplit"
          :languages="languages"
          :parent-active-field="activeField"
          :split-target="splitTarget"
          :split-visible="splitVisible"
          @update:error="$emit('update:error', $event)"
          @update:activeField="activeField = $event"
        />
      </div>
    </template>
  </div>
</template>

<script>
import { cloneDeep as _cloneDeep, get as _get } from 'lodash-es';

import fieldTypeToComponent from '../assets/js/fieldTypeToComponent';
import userInputToRegex from '../assets/js/userInputToRegex';

const modules = import.meta.glob('./fields/*.{vue,js}', { eager: true });

const components = Object.entries(modules).reduce((acc, [filePath, module]) => {
  const componentName = filePath.split('/').pop().replace(/\.\w+$/, '');
  acc[componentName] = module.default || module;
  return acc;
}, {});

export default {
  components,
  computed: {
    visibleFields() {
      if (!this.fields) return [];
      const currentUser = this.$store.getters.userInCurrentProject || {};

      return this.fields.filter((field) => (
        field.visibility
        && !field.visibility.hidden
        && (field.type !== 'languages' || (this.languages && this.languages.length > 0)) // showing languages fields when there are no languages or localisation is disabled doesn’t make sense
        && (!field.visibility.limitToRoles || field.visibility.limitToRoles.length === 0 || field.visibility.limitToRoles.includes(currentUser.role))
        && (!field.visibility.showByValue || !field.visibility.showByValue.field || this.fieldShouldBeVisible(field.visibility.showByValue))
      ));
    },
  },
  created() {
    this.externalChange = true;
    this.model = _cloneDeep(this.modelValue) || {};

    if (!this.fields) return;

    const collapsibles = this.fields.filter((field) => field.type === 'container' && field.options && field.options.collapsible);

    collapsibles.forEach((field) => this.collapsed.set(field.key, field.options && field.options.collapseByDefault));
  },
  data() {
    return {
      activeField: null,
      externalChange: false,
      internalChange: false,
      model: {},
      collapsed: new Map(),
    };
  },
  emits: ['update:activeField', 'update:error', 'update:modelValue', 'update:splitVisible'],
  methods: {
    componentForType(type) {
      const componentName = fieldTypeToComponent(type);

      if (componentName && this.$options.components && this.$options.components[componentName]) return componentName;
      return 'UnknownField';
    },
    fieldShouldBeVisible({ comparator, field, value }) { // field is actually a path to a field in the Schema, comparator is a number or string to compare the field value to
      const valueToCompare = _get(this.model, field);
      // value can be either null, true, false, or a string
      if (typeof value !== 'string') return valueToCompare === value;
      // if it’s a string things get a little more complex
      switch (value) {
        case 'matches':
          try {
            return userInputToRegex(comparator).test(valueToCompare);
          } catch (err) {
            return false; // if there’s an error, it’s because the supplied regex was invalid so we default to not showing the field
          }
        case 'equals':
          return valueToCompare === comparator;
        case 'smaller':
          return valueToCompare < comparator;
        case 'greater':
          return valueToCompare > comparator;
        default:
          return false;
      }
    },
    handleError(key, err) {
      const errorClone = _cloneDeep(this.error);
      if (err) errorClone.set(key, err);
      else errorClone.delete(key);
      this.$emit('update:error', errorClone);
    },
    updateModelValue() {
      this.internalChange = true;
      this.$emit('update:modelValue', _cloneDeep(this.model));
    },
  },
  name: 'MbFieldsEditor',
  props: {
    compact: Boolean,
    dark: Boolean,
    error: {
      type: Map,
      default: () => new Map(),
    },
    fields: Array,
    inSplit: Boolean,
    languages: Array,
    modelValue: Object,
    parentActiveField: String,
    splitTarget: [String, HTMLElement],
    splitVisible: Boolean,
  },
  watch: {
    activeField(nv, ov) {
      if (!ov && nv && !this.splitVisible) this.$emit('update:splitVisible', true);
      else if (ov && !nv && this.splitVisible) this.$emit('update:splitVisible', false);
      this.$emit('update:activeField', this.activeField);
    },
    model: {
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

        this.externalChange = true;
        this.model = _cloneDeep(nv) || {};
      },
    },
    parentActiveField(nv) {
      this.activeField = nv;
    },
    splitVisible(nv) {
      if (!nv) this.activeField = null;
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .fields-editor {
    .field {
      &.text:not(.localised):first-child,
      &.number:not(.localised):first-child,
      &.rich-text:not(.localised):first-child,
      &.color.error:first-child,
      &.date.error:first-child  { // so the label is still visible even when it’s floating
        margin-top: 2rem;
      }

      &:not(:last-child) {
        margin-bottom: 2rem;
      }

      &:last-child {
        margin-bottom: 0.125rem; // so we can still see the active state while :active
      }
    }

    .container {
      width: 100%;

      &.bordered {
        box-shadow: inset 0 0 0 0.0625rem color-mix(in srgb, var(--text) 12%, transparent);
        padding: 1rem;
        border-radius: var(--radius-l);
        position: relative;

        &.dark {
          box-shadow: inset 0 0 0 0.0625rem color-mix(in srgb, var(--text-dark) 12%, transparent);
        }

        &.collapsible {
          > header {
            cursor: pointer;

            > .label {
              font-size: 1rem;
              transition: color 200ms ease;

              &.collapsed {
                color: var(--text);

                &.dark {
                  color: var(--text-dark);
                }
              }
            }
          }
        }

        > header {
          display: flex;
          align-items: center;

          > .label {
            font-size: 0.75rem;
            margin: 0;
            margin-right: auto;
            color: var(--text-secondary);

            &.dark {
              color: var(--text-secondary-dark);
            }
          }

          > .button {
            padding: 0.75rem;
            margin: -0.75rem;
            margin-left: 0;
          }
        }

        > .fields-editor {
          margin-top: 1rem;

          &.row {
            margin-top: 1rem;
          }
        }
      }

      &:not(:last-child) {
        margin-bottom: 2rem;
      }

      .fields-editor {
        @media #{$larger-than-mobile} {
          &.row {
            display: flex;
            align-items: flex-start;
            margin: 0 -1rem;

            > .container {
              margin: 0 1rem;
              overflow: hidden;
              flex-basis: 100%;
            }

            > .field {
              flex-basis: 100%;
              margin: 0 1rem;

              &.rich-text,
              &.image,
              &.group {
                overflow: hidden;
              }

              &.rich-text {
                padding-top: 1rem;
                margin-top: -1rem;
              }
            }
          }
        }

        > .container.bordered {
          border-radius: var(--radius-m);
        }
      }
    }
  }
</style>
