<template>
  <section class="rows field">
    <div class="container" :class="{ dark, empty, error }">
      <p class="label">{{transformedLabel}}</p>
      <p v-show="empty" class="empty-state">This field is empty</p>
      <MbSortableList v-if="displayItems.length > 0" v-slot="{ activeItem, item, index }" enable-transitions :items="uniqueItemKeys" @itemclick="openDetails" @itemmove="handleItemMove">
        <div class="row-item" :class="{ active: active && indexBeingEdited === index, 'being-dragged': item === activeItem, compact: isCompact, dark, error: errorForIndex(index), 'in-split': inSplit }" tabindex="0" @[compactContextmenu].prevent="openContextMenu($event, index)" @[compactKeydown].space.prevent @[compactKeyup].space.enter="openDetails(index)">
          <template v-if="isCompact">
            <div class="drag-handle" data-drag-handle>
              <MbIcon icon="drag-handle" />
            </div>
            <div class="left">
              <p class="label" :class="{ unstyled: !displayItems[index].displayValue }">{{errorForIndex(index) || displayItems[index].label}}</p>
              <p v-if="displayItems[index].displayValue || errorForIndex(index)" class="content">{{displayItems[index].displayValue || displayItems[index].label}}</p>
            </div>
            <MbIcon v-if="isCompact" :icon="active && indexBeingEdited === index ? 'cross' : errorForIndex(index) ? 'error' : 'pencil'" />
          </template>
          <template v-else>
            <header data-drag-handle>
              <div class="drag-handle">
                <MbIcon icon="drag-handle" />
              </div>
              <p class="label">{{displayItems[index].label}}</p>
              <MbButton v-if="options.allowEditing && filteredChildren.length > 1" :dark="dark" data-ignore-drag icon="replace-round" rounded :tooltip="`Change ${options.itemLabel || 'Row'} type`" @click="indexBeingEdited = index; showTypeChangeModal = true;" />
              <MbButton v-if="options.allowEditing" :dark="dark" data-ignore-drag icon="duplicate" rounded :tooltip="`Duplicate ${options.itemLabel || 'Row'}`" @click="duplicateItem(index)" />
              <MbButton v-if="options.allowEditing" :dark="dark" data-ignore-drag icon="trash" rounded :tooltip="`Delete ${options.itemLabel || 'Row'}`" type="negative" @click="deleteItem(index)" />
            </header>
            <MbFieldsEditor
              :class="{ 'in-split': inSplit }"
              compact
              :dark="dark"
              :error="errorMapForIndex(index)"
              :fields="fieldsForIndex(index)"
              :in-split="inSplit"
              :model-value="modelValueForIndex(index)"
              :languages="languages"
              @update:error="handleFieldError($event, index)"
              @update:model-value="updateField($event, index)"
            />
          </template>
        </div>
      </MbSortableList>
      <MbButton v-if="options.allowEditing && filteredChildren.length > 0" class="add-button" :dark="dark" icon="plus" type="positive" @click="handleAddClick">Add {{options.itemLabel || 'Row'}}</MbButton>
    </div>
    <AddRepeatingFieldModal :dark="dark" :fields="filteredChildren" :item-label="options.itemLabel || 'Row'" :visible="showAddModal" @add-item="addItem" @close="showAddModal = false" />
    <RepeatingFieldDetailsModal
      :active="active"
      :allow-editing="options.allowEditing"
      :allow-type-change="options.allowEditing && filteredChildren.length > 1"
      :current-value="modelValue && indexBeingEdited !== null && modelValueForIndex(indexBeingEdited)"
      :dark="dark"
      :field-being-edited="fieldBeingEdited"
      :field-being-edited-errors="fieldBeingEditedErrors"
      :item-label="options.itemLabel || 'Row'"
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
    <RepeatingFieldChangeTypeModal :current-label="fieldBeingEdited && fieldBeingEdited.label" :current-value="modelValue && modelValue[indexBeingEdited]" :dark="dark" :fields="filteredChildren" :item-label="options.itemLabel || 'Row'" :visible="showTypeChangeModal" @change-item-type="changeItemType(indexBeingEdited, $event)" @close="showTypeChangeModal = false" />
    <MbContextMenu v-if="isCompact" :dark="dark" :options="itemContextMenu.options" :show="itemContextMenu.show" :target="itemContextMenu.target" :x="itemContextMenu.x" :y="itemContextMenu.y" @close="resetItemContextMenu" />
  </section>
</template>

<script>
import repeatingField from '../../mixins/repeatingField';

export default {
  computed: {
    compactContextmenu() {
      if (this.isCompact) return 'contextmenu';
      return null;
    },
    compactKeydown() {
      if (this.isCompact) return 'keydown';
      return null;
    },
    compactKeyup() {
      if (this.isCompact) return 'keyup';
      return null;
    },
    isCompact() {
      return this.compact && this.options.compact;
    },
  },
  mixins: [repeatingField],
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;
  @use '../../assets/styles/fields';

  .rows.field {
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
  }

  .row-item {
    margin-bottom: 1rem;

    &.being-dragged {
      opacity: 0.5;
    }

    &:not(.compact) {
      border: 0.0625rem solid color-mix(in srgb, var(--text) 12%, transparent);
      border-radius: var(--radius-m);
      padding: 1rem;
      background-color: var(--bg);
      position: relative;

      @media #{$mobile} {
        padding: 0.5rem;
      }

      &.dark {
        background-color: var(--bg-dark);
        border-color: color-mix(in srgb, var(--text-dark) 12%, transparent);

        &.in-split {
          background-color: var(--bg-secondary-dark);
        }

        .label {
          color: var(--text-secondary-dark);
        }
      }

      &.error {
        &::before {
          opacity: 1;
        }

        > header .label {
          color: var(--negative-saturated);
        }
      }

      &::before {
        content: '';
        position: absolute;
        top: -0.0625rem;
        left: -0.0625rem;
        right: -0.0625rem;
        bottom: -0.0625rem;
        border: 0.125rem solid var(--negative);
        opacity: 0;
        border-radius: inherit;
        z-index: 1;
        pointer-events: none;
        transition: opacity 200ms ease;
      }

      header {
        display: flex;
        align-items: center;

        & + .fields-editor:not(:empty)  {
          margin-top: 1rem;
        }

        .label {
          margin: 0;
          color: var(--text-secondary);
          margin-right: auto;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .button {
          margin: -1rem 0;
          margin-right: 0.25rem;
          flex-shrink: 0;

          &:last-child {
            margin-right: -0.75rem;
          }
        }
      }
    }

    .drag-handle {
      padding: 1rem;
      margin: -1rem;
      margin-right: -0.25rem;
      cursor: move;
    }
  }
</style>
