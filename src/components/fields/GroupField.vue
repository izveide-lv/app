<template>
  <section class="group field" :class="{ dark, expanded: !compact }">
    <div class="display-wrapper" :class="{ active, dark, error: cleanError, 'in-split': inSplit, 'no-display-value': !localisedDisplayValue }" :tabindex="compact ? 0 : null" @click="openGroup" @keyup.enter.space="openGroup" @keydown.space.prevent>
      <div class="left">
        <p class="label" :class="{ unstyled: !localisedDisplayValue }">{{cleanError || label}}</p>
        <p v-if="localisedDisplayValue || cleanError" class="content">{{localisedDisplayValue || label}}</p>
      </div>
      <MbIcon v-if="compact" :icon="active ? 'cross' : cleanError ? 'error' : 'pencil'" />
    </div>
    <MbFieldsEditor v-if="!compact" compact :dark="dark" :error="error" :fields="children" :in-split="Boolean(teleportTarget)" :model-value="modelValue" :languages="languages" @update:error="handleError" @update:model-value="update" />
    <MbModal class="group-content" :dark="dark" :title="label" :visible="showModal" @after-close="validateContent" @close="closeGroup" @keyup.ctrl.enter="closeGroup">
      <teleport v-if="!teleportTarget || active" :disabled="!teleportTarget" :to="teleportTarget">
        <h2 v-if="teleportTarget" class="h3 split-title">{{label}}</h2>
        <p v-if="!children.length" class="group-empty-state" :class="{ centered: !teleportTarget, dark }">This {{label}} does not contain editable fields</p>
        <MbFieldsEditor compact :dark="dark" :error="error" :fields="children" :in-split="Boolean(teleportTarget)" :model-value="modelValue" :languages="languages" @update:error="handleError" @update:model-value="update" />
      </teleport>
      <template #actions>
        <MbButton :dark="dark" type="primary" @click="closeGroup">Done</MbButton>
      </template>
    </MbModal>
  </section>
</template>

<script>
import { get as _get } from 'lodash-es';

import richToPlainText from '../../assets/js/richToPlainText';
import validateContent from '../../assets/js/validateContent';

import field from '../../mixins/field';

export default {
  computed: {
    cleanError() {
      if (!this.error) return '';
      return this.error.size === 1 ? 'A subfield has errors' : `${this.error.size} subfields have errors`;
    },
    localisedDisplayValue() {
      if (!this.modelValue) return null;

      let displayValue;
      if (!this.displayField) { // we’ll try to get a default one
        const firstValue = Object.values(this.modelValue).find((value) => value && ['object', 'string', 'number'].includes(typeof value) && value !== '___mb_type');
        if (firstValue) displayValue = firstValue;
        else return null;
      } else displayValue = _get(this.modelValue, this.displayField);

      if (Array.isArray(displayValue)) return displayValue.join(', ');
      if (displayValue !== null && typeof displayValue === 'object') {
        const firstValue = Object.values(displayValue).find((value) => value);
        if (typeof firstValue === 'string') return richToPlainText(firstValue, 200);
        if (firstValue === null || typeof firstValue === 'undefined') return '';
        return firstValue;
      }
      if (typeof displayValue === 'string') return richToPlainText(displayValue, 200); // trimming to 200 characters even though only about 70 are shown because HTML can be quite verbose
      return displayValue;
    },
  },
  data() {
    return {
      showModal: false,
    };
  },
  methods: {
    closeGroup() {
      if (this.splitTarget) this.$emit('update:active', false);
      else this.showModal = false;
    },
    handleError(err) {
      if (!err || err.size === 0) this.$emit('update:error', '');
      else this.$emit('update:error', err);
    },
    openGroup() {
      if (!this.compact) return;
      if (this.active) {
        this.closeGroup();
        return;
      }
      if (this.splitTarget) this.$emit('update:active', true);
      else this.showModal = true;
    },
    update(v) {
      this.$emit('update:modelValue', v);
    },
    validateContent() {
      const errors = validateContent(this.modelValue || {}, { fields: this.children }, this.languages);
      this.$emit('update:error', errors.size > 0 ? errors : '');
    },
  },
  mixins: [field],
  watch: {
    active(nv) {
      if (!nv) this.validateContent();
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/fields';

  .group.field {
    &.expanded {
      border: 0.0625rem solid color-mix(in srgb, var(--text) 12%, transparent);
      border-radius: var(--radius-l);
      padding: 1rem;

      &.dark {
        border-color: color-mix(in srgb, var(--text-dark) 12%, transparent);
      }

      > .display-wrapper {
        background-color: transparent;
        pointer-events: none;
        padding: 0;
        color: var(--text-secondary);
        margin-bottom: 1rem;

        &.dark {
          color: var(--text-secondary-dark);
        }

        &.error::before {
          opacity: 0;
        }

        &.no-display-value {
          padding: 0;
        }
      }
    }

    .display-wrapper {
      &.no-display-value  {
        padding-top: 1.0625rem;
        padding-bottom: 1.0625rem;
      }
    }
  }

  .group-empty-state {
    color: var(--text-tertiary);

    &.dark {
      color: var(--text-tertiary-dark);
    }

    &.centered {
      text-align: center;
    }
  }
</style>
