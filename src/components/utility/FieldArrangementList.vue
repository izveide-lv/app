<template>
  <transition-group class="field-arrangement-list" :class="{ dark }" tag="div">
    <div v-if="fields.length === 0" class="empty-state" :class="{ 'drag-active': $store.state.application.dragActive }" data-index="0" :data-parent="parentKey" key="emptyState">
      <p>Drop a field here to add it</p>
    </div>
    <template v-for="(field, index) in fields">
      <div v-if="field.key === '___addIndicator'" class="add-indicator" data-add-indicator :key="field.key">
        <div />
      </div>
      <FieldArrangementItem
        v-else
        :active="fieldBeingEdited === field"
        :class="{ 'drag-active': $store.state.application.dragActive }"
        :custom-field="field.customField"
        :dark="dark"
        :data-index="index"
        :data-parent="parentKey"
        :errors="field.errors"
        :field-being-edited="fieldBeingEdited"
        :field-key="field.key"
        :field-versions="fieldVersions"
        :hidden="field.visibility && field.visibility.hidden"
        :icon="field.icon"
        :key="field.key"
        :label="field.label"
        :localised="field.localised"
        :nested-fields="!field.customField && Array.isArray(field.value) ? field.value : null"
        :parent-key="parentKey"
        :required="(field.validation && field.validation.required) || (field.validation && field.validation.min > 0)"
        :type="field.type"
        :version="field.version"
        :visual-only="field.visualOnly"
        @fieldclick="handleClick(parentKey, index)"
        @fieldcontextmenu="handleContextMenu(parentKey, index, $event)"
        @fieldmove="handleFieldMove(parentKey, index, $event)"
      />
    </template>
  </transition-group>
</template>

<script>
import FieldArrangementItem from './FieldArrangementItem.vue';

export default {
  components: {
    FieldArrangementItem,
  },
  data() {
    return {
    };
  },
  methods: {
    handleClick(parent, index) {
      // using a custom event here so we can have bubbling (since these can theoretically be nested infinitely deep)
      this.$el.dispatchEvent(new CustomEvent('fieldclick', { detail: { parent, index }, bubbles: true, composed: true }));
    },
    handleContextMenu(parent, index, e) {
      // using a custom event here so we can have bubbling (since these can theoretically be nested infinitely deep)
      this.$el.dispatchEvent(new CustomEvent('fieldcontextmenu', { detail: { parent, index, e }, bubbles: true, composed: true }));
    },
    handleFieldMove(parent, index, target) {
      this.$el.dispatchEvent(new CustomEvent('fieldmove', { detail: { parent, index, target }, bubbles: true, composed: true }));
    },
  },
  name: 'FieldArrangementList', // since technically it’s recursively calling itself (FieldArrangementItems might have a list)
  props: {
    dark: Boolean,
    fieldBeingEdited: Object,
    fields: Array,
    fieldVersions: Map,
    parentKey: String,
  },
};
</script>

<style lang="scss" scoped>
  .field-arrangement-list {
    position: relative;

    &.dark {
      .empty-state {
        border-color: var(--text-tertiary-dark);
        color: var(--text-secondary-dark);

        &::before {
          background-color: var(--bg-tertiary-dark);
          border-color: var(--accent-secondary);
        }
      }
    }

    .empty-state {
      padding: 1.5rem;
      border: 0.125rem dashed var(--text-tertiary);
      border-radius: var(--radius-l);
      position: relative;
      text-align: center;
      color: var(--text-secondary);

      &.v-leave-active {
        display: none;
      }

      &.drag-active {
        > * {
          pointer-events: none;
        }

        &:hover::before {
          opacity: 1;
        }
      }

      &::before {
        content: '';
        display: block;
        position: absolute;
        border: inherit;
        border-color: var(--accent);
        border-radius: inherit;
        top: -0.125rem;
        left: -0.125rem;
        width: 100%;
        height: 100%;
        opacity: 0;
        pointer-events: none;
        background-color: var(--accent-secondary);
        transition: opacity 200ms ease;
      }

      p {
        margin: 0;
      }
    }

    .add-indicator {
      padding: 1rem;

      &:first-child {
        padding-top: 0;
      }

      &.v-enter-active,
      &.v-leave-active {
        transition: opacity 200ms ease;

        &.v-enter-from,
        &.v-leave-to {
          opacity: 0;
        }
      }

      &.v-leave-active {
        position: absolute;
      }

      > div {
        height: 0.25rem;
        background-color: var(--accent);
        border-radius: 0.125rem;
        pointer-events: none;
      }
    }

    .field-arrangement-item {
      &:not(:last-child):not(.hide-outline) {
        margin-bottom: 1rem;

        & + .add-indicator {
          margin-top: -1rem;
        }
      }

      &.v-move:not(.drag-active) {
        transition: transform 200ms ease;
      }

      &.v-leave-active {
        display: none;
      }
    }
  }
</style>
