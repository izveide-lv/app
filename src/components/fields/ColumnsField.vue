<template>
  <section class="columns field">
    <div class="container" :class="{ dark, empty, error }">
      <p class="label">{{transformedLabel}}</p>
      <p v-show="empty" class="empty-state">This field is empty</p>
      <MbSortableList v-if="displayItems.length > 0" v-slot="{ activeItem, item, index }" class="columns" :class="[columns]" direction="horizontal" enable-transitions :items="uniqueItemKeys" @itemclick="openDetails" @itemmove="handleItemMove">
        <div class="column-item compact" :class="{ active: active && indexBeingEdited === index, 'being-dragged': item === activeItem, dark, error: errorForIndex(index), 'in-split': inSplit }" tabindex="0" @contextmenu.prevent="openContextMenu($event, index)" @keydown.space.prevent @keyup.space.enter="openDetails(index)" @mouseenter="showValueTooltip($event, index)">
          <div class="drag-handle" data-drag-handle>
            <MbIcon icon="drag-handle" />
          </div>
          <div class="left">
            <p class="label" :class="{ unstyled: !displayItems[index].displayValue }">{{errorForIndex(index) || displayItems[index].label}}</p>
            <p v-if="displayItems[index].displayValue || errorForIndex(index)" class="content">{{displayItems[index].displayValue || displayItems[index].label}}</p>
          </div>
          <MbIcon :icon="active && indexBeingEdited === index ? 'cross' : errorForIndex(index) ? 'error' : 'pencil'" />
        </div>
      </MbSortableList>
      <MbButton v-if="options.allowEditing && filteredChildren.length > 0" class="add-button" :dark="dark" icon="plus" type="positive" @click="handleAddClick">Add {{options.itemLabel || 'Column'}}</MbButton>
    </div>
    <AddRepeatingFieldModal :dark="dark" :fields="filteredChildren" :item-label="options.itemLabel || 'Column'" :visible="showAddModal" @add-item="addItem" @close="showAddModal = false" />
    <RepeatingFieldDetailsModal
      :active="active"
      :allow-editing="options.allowEditing"
      :allow-type-change="options.allowEditing && filteredChildren.length > 1"
      :current-value="modelValue && indexBeingEdited !== null && modelValueForIndex(indexBeingEdited)"
      :dark="dark"
      :field-being-edited="fieldBeingEdited"
      :field-being-edited-errors="fieldBeingEditedErrors"
      :item-label="options.itemLabel || 'Column'"
      :languages="languages"
      :teleport-target="teleportTarget"
      :title="fieldBeingEdited && fieldBeingEdited.label"
      :visible="showDetailsModal"
      @after-close="validateItemBeingEdited"
      @close="closeDetails"
      @delete-item-being-edited="deleteItemBeingEdited"
      @field-being-edited-change-type="showTypeChangeModal = true"
      @field-being-edited-error="handleFieldBeingEditedError"
      @field-being-edited-update="updateFieldBeingEdited"
    />
    <RepeatingFieldChangeTypeModal :current-label="fieldBeingEdited && fieldBeingEdited.label" :current-value="modelValue && modelValue[indexBeingEdited]" :dark="dark" :fields="filteredChildren" :item-label="options.itemLabel || 'Column'" :visible="showTypeChangeModal" @change-item-type="changeItemType(indexBeingEdited, $event)" @close="showTypeChangeModal = false" />
    <MbContextMenu :dark="dark" :options="itemContextMenu.options" :show="itemContextMenu.show" :target="itemContextMenu.target" :x="itemContextMenu.x" :y="itemContextMenu.y" @close="resetItemContextMenu" />
  </section>
</template>

<script>
import repeatingField from '../../mixins/repeatingField';

export default {
  computed: {
    columns() {
      if (this.uniqueItemKeys.length === 1) return 'single-column';
      if (this.uniqueItemKeys.length === 2) return 'two-columns';
      return 'three-columns';
    },
  },
  mixins: [repeatingField],
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;
  @use '../../assets/styles/fields';

  .columns.field {
    .container {
      @media #{$mobile} {
        padding: 0.5rem;
      }

      &.empty {
        .add-button {
          margin-right: auto;
        }
      }

      .add-button {
        display: flex;
        margin-left: auto;

        @media #{$mobile} {
          width: 100%;
        }
      }
    }

    .columns {
      display: flex;
      flex-wrap: wrap;
      margin: -0.25rem;
      margin-bottom: 0.75rem;

      &.single-column:deep(.drag-item) {
        max-width: 100%;
      }

      &.two-columns:deep(.drag-item) {
        max-width: 50%;
      }

      &.three-columns:deep(.drag-item) {
        max-width: 33.33%;
      }

      &:deep(.drag-item) {
        flex: 1 1 33.33%;
      }
    }
  }

  .column-item {
    margin: 0.25rem;

    &.being-dragged {
      opacity: 0.5;
    }

    .drag-handle {
      padding: 1rem;
      margin: -1rem;
      margin-right: -0.25rem;
      cursor: move;
    }
  }
</style>
