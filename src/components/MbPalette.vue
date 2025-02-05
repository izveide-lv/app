<template>
  <transition-group class="palette" tag="ul">
    <li v-for="(color, index) in colorsWithoutSoftDeleted" :class="{ dark, error: errors.has(color) }" :key="color.label">
      <MbColorPicker :dark="dark" :format="format" hide-label :model-value="color.value" @update:model-value="handleChange($event, index, 'value')" />
      <MbInput :dark="dark" :error="errors.get(color)" :model-modifiers="{ lazy: true }" :model-value="color.label" placeholder="Color name" @update:model-value="handleChange($event, index, 'label')" />
      <MbButton :dark="dark" icon="trash" type="negative" @click="deleteColor(color)" />
    </li>
    <li :class="{ dark, error: newColor.error }" key="addColorItem">
      <MbColorPicker v-model="newColor.value" :dark="dark" :format="format" hide-label />
      <MbInput v-model.lazy="newColor.label" :dark="dark" :error="newColor.error" placeholder="Color name" @keyup.enter="addColor" @update:modelValue="newColor.error = validateLabel($event)" />
      <MbButton :dark="dark" :disabled="Boolean(newColor.error)" icon="plus" type="positive" @click="addColor"/>
    </li>
  </transition-group>
</template>

<script>
export default {
  computed: {
    colorsWithoutSoftDeleted() {
      return this.modelValue.filter((color) => !this.softDeleted.has(color));
    },
  },
  data() {
    return {
      errors: new Map(),
      newColor: {
        error: '',
        label: '',
        value: 'rgba(255, 255, 255, 0)',
      },
      softDeleted: new Set(),
    };
  },
  emits: ['update:modelValue'],
  methods: {
    addColor() {
      this.newColor.error = this.validateLabel(this.newColor.label);
      if (this.newColor.error) return;

      this.$emit('update:modelValue', [...this.modelValue, { label: this.newColor.label.trim(), value: this.newColor.value }]);
      this.newColor.value = 'rgba(255, 255, 255, 0)';
      this.newColor.label = '';
    },
    deleteColor(color) {
      this.softDeleted.add(color);
      this.$store.commit('addToast', {
        action: () => {
          this.softDeleted.delete(color);
        },
        actionLabel: 'Undo',
        message: `The color “${color.label}” was deleted`,
        onClose: (undone) => {
          if (undone) return;

          this.$emit('update:modelValue', this.modelValue.filter((existingColor) => existingColor !== color));
        },
        timeout: 5000,
        type: 'warning',
      });
    },
    handleChange(newVal, index, prop) {
      const color = this.modelValue[index];
      if (prop === 'label') {
        const error = this.validateLabel(newVal);
        if (error) {
          this.errors.set(color, error);
          return;
        }
        if (this.errors.has(color)) this.errors.delete(color);
        color.label = newVal.trim();
      }

      if (prop === 'value') {
        color.value = newVal;
      }
      this.$emit('update:modelValue', this.modelValue);
    },
    validateLabel(label) {
      let error = '';
      if (!label || !label.trim()) error = 'A name is required';
      else if (this.modelValue.find((color) => color.label === label)) error = 'A color with this name exists already';
      return error;
    },
  },
  props: {
    dark: Boolean,
    format: String,
    modelValue: Array,
  },
};
</script>

<style lang="scss" scoped>
@use '../assets/styles/breakpoints' as *;

.palette {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;

  > li {
    display: flex;
    align-items: center;
    background-color: var(--bg-secondary);
    border-radius: var(--radius-m);

    &.dark {
      background-color: var(--bg-secondary-dark);

      > .input {
        border-left-color: var(--bg-dark);
        border-right-color: var(--bg-dark);
      }
    }

    &:not(:last-child) {
      margin-bottom: 1rem;
    }

    &.error {
      margin-top: 2rem;
    }

    &.v-move {
      transition: transform 200ms ease;
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
      width: 100%;
    }

    .color-picker {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }

    > .input {
      margin-top: 0;
      margin-left: 0.0625rem;
      flex-grow: 1;
      border-left-color: var(--bg);
      border-right-color: var(--bg);

      &:not(:focus-within) {
        border-radius: 0;
      }
    }

    > .button.icon {
      margin: 0.25rem;
      flex-shrink: 0;
    }
  }
}
</style>
