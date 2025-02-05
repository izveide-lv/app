<template>
  <div class="item-list">
    <MbSortableList v-slot="{ activeItem, item }" enable-transitions :items="modelValue" @itemmove="handleItemMove">
      <div class="item" :class="{ 'being-dragged': activeItem === item, dark }" >
        <div class="drag-handle" data-drag-handle>
          <MbIcon icon="drag-handle" />
        </div>
        <span>{{labelForItem(item)}}</span>
        <MbButton :dark="dark" icon="trash" rounded tooltip="Delete item" type="negative" @click="deleteItem(item)" />
      </div>
    </MbSortableList>
    <MbSelect :dark="dark" :disabled="filteredOptions.length === 0" :options="filteredOptions" :placeholder="placeholder" @update:modelValue="addItem" />
  </div>
</template>

<script>
export default {
  computed: {
    filteredOptions() {
      return this.options.filter((option) => {
        const valueToTest = option.value || option;
        return !this.modelValue.includes(valueToTest);
      });
    },
  },
  data() {
    return {
    };
  },
  methods: {
    addItem(item) {
      this.$emit('update:modelValue', [...this.modelValue, item]);
    },
    deleteItem(item) {
      this.$emit('update:modelValue', this.modelValue.filter((existingItem) => existingItem !== item));
    },
    handleItemMove({ activeItem, index, isBottomHalf }) {
      const modelCopy = [...this.modelValue];
      const currentIndex = modelCopy.indexOf(activeItem);
      if ((currentIndex < index && isBottomHalf) || (currentIndex > index && !isBottomHalf)) {
        modelCopy.splice(index, 0, modelCopy.splice(currentIndex, 1)[0]);
      } else if (currentIndex < index && !isBottomHalf) {
        modelCopy.splice(Math.max(0, index - 1), 0, modelCopy.splice(currentIndex, 1)[0]);
      } else if (currentIndex > index && isBottomHalf) {
        modelCopy.splice(Math.min(index + 1, modelCopy.length - 1), 0, modelCopy.splice(currentIndex, 1)[0]);
      }
      this.$emit('update:modelValue', modelCopy);
    },
    labelForItem(item) {
      const optionItem = this.options.find((option) => option.value === item);
      return (optionItem && optionItem.label) || item;
    },
  },
  props: {
    dark: Boolean,
    modelValue: Array,
    options: Array,
    placeholder: String,
  },
};
</script>

<style lang="scss" scoped>
  .item-list {
    &:deep(.select) {
      width: 100%;
    }
  }

  .item {
    display: flex;
    align-items: center;
    border-radius: var(--radius-m);
    padding-right: 1rem;
    flex-grow: 1;
    box-shadow: inset 0 0 0 0.0625rem var(--text-tertiary);
    overflow: hidden;
    background-color: var(--bg);
    margin-bottom: 0.5rem;
    padding-right: 0.25rem;

    &.dark {
      background-color: var(--bg-secondary-dark);
      box-shadow: inset 0 0 0 0.0625rem var(--bg-tertiary-dark);
    }

    &.being-dragged {
      opacity: 0.25;
    }

    .drag-handle {
      padding: 1rem;
      cursor: move;
    }

    .button {
      flex-shrink: 0;
    }

    > span {
      flex-grow: 1;
    }
  }
</style>
